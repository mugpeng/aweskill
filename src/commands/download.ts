import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  classifyDownloadConflict,
  discoverDownloadableSkills,
  discoverDownloadableSkillsByName,
  DuplicateSkillNameError,
  formatDownloadConflictLines,
  formatDuplicateSkillNameConflict,
  throwDownloadConflict,
  type DownloadableSkill,
} from "../lib/download.js";
import { computeDirectoryHash } from "../lib/hash.js";
import { fetchGitHubRepoTree, getGitHubTreeShaForSubpath, type GitHubRepoTree } from "../lib/github-tree.js";
import { pathExists } from "../lib/fs.js";
import { importPath } from "../lib/import.js";
import { upsertSkillLockEntry } from "../lib/lock.js";
import { normalizeNameList, sanitizeName } from "../lib/path.js";
import { parseDownloadSource, type DownloadSource } from "../lib/source-parser.js";
import type { RuntimeContext } from "../types.js";

const execFileAsync = promisify(execFile);
const SCISKILL_API_BASE = process.env.SCISKILL_API_URL || "https://sciskillhub.org";

export interface DownloadOptions {
  list?: boolean;
  skill?: string[];
  all?: boolean;
  ref?: string;
  override?: boolean;
  as?: string;
}

function getSciskillLeafName(skillId: string): string {
  const leaf = skillId.split("/").filter(Boolean).at(-1) ?? "downloaded-skill";
  return sanitizeName(leaf) || "downloaded-skill";
}

async function wrapFlatSciskillArchive(extractRoot: string, skillId: string): Promise<void> {
  const rootSkillFile = path.join(extractRoot, "SKILL.md");
  if (!(await pathExists(rootSkillFile))) {
    return;
  }

  const targetDir = path.join(extractRoot, getSciskillLeafName(skillId));
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(extractRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === path.basename(targetDir)) {
      continue;
    }
    await rename(path.join(extractRoot, entry.name), path.join(targetDir, entry.name));
  }
}

export async function resolveSourceRoot(source: DownloadSource): Promise<{ root: string; cleanup?: () => Promise<void> }> {
  if (source.type === "local") {
    return { root: source.localPath! };
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "aweskill-download-"));
  if (source.type === "sciskill") {
    const archivePath = path.join(tempDir, "skill.zip");
    const extractRoot = path.join(tempDir, "extracted");
    const skillId = source.source.replace(/^sciskill:/, "");
    const downloadUrl = `${SCISKILL_API_BASE}/api/v1/download/${skillId}`;

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${downloadUrl}`);
      }

      const archive = Buffer.from(await response.arrayBuffer());
      await writeFile(archivePath, archive);
      await mkdir(extractRoot, { recursive: true });
      try {
        await execFileAsync("unzip", ["-q", archivePath, "-d", extractRoot]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`archive extraction failed: ${message}`);
      }
      await wrapFlatSciskillArchive(extractRoot, skillId);
      return { root: extractRoot, cleanup: async () => rm(tempDir, { recursive: true, force: true }) };
    } catch (error) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to download sciskill source ${source.source}: ${message}`);
    }
  }

  const args = ["clone", "--depth", "1"];
  if (source.ref) {
    args.push("--branch", source.ref);
  }
  args.push(source.sourceUrl, tempDir);

  try {
    await execFileAsync("git", args, {
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_LFS_SKIP_SMUDGE: "1",
      },
    });
    return { root: tempDir, cleanup: async () => rm(tempDir, { recursive: true, force: true }) };
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone ${source.source}: ${message}`);
  }
}

function selectSkills(skills: DownloadableSkill[], options: DownloadOptions): DownloadableSkill[] {
  if (options.skill && options.skill.length > 0) {
    const requested = new Set(normalizeNameList(options.skill));
    const selected = skills.filter((skill) => requested.has(skill.name));
    const missing = [...requested].filter((name) => !skills.some((skill) => skill.name === name));
    if (missing.length > 0) {
      throw new Error(`Skill not found in source: ${missing.join(", ")}`);
    }
    return selected;
  }

  if (options.all || skills.length <= 1) {
    return skills;
  }

  throw new Error("Multiple skills found. Use --skill <name> or --all.");
}

async function discoverRequestedSkills(sourceRoot: string, sourceSubpath: string | undefined, options: DownloadOptions): Promise<DownloadableSkill[]> {
  const requested = normalizeNameList(options.skill ?? []);
  if (requested.length === 0) {
    return discoverDownloadableSkills(sourceRoot, sourceSubpath);
  }

  const selected: DownloadableSkill[] = [];
  const missing: string[] = [];
  for (const name of requested) {
    const matches = await discoverDownloadableSkillsByName(sourceRoot, name, sourceSubpath);
    if (matches.length === 0) {
      missing.push(name);
      continue;
    }
    if (matches.length > 1) {
      throw new DuplicateSkillNameError(name, { path: matches[0]!.path, subpath: matches[0]!.subpath }, { path: matches[1]!.path, subpath: matches[1]!.subpath });
    }
    selected.push(matches[0]!);
  }

  if (missing.length > 0) {
    throw new Error(`Skill not found in source: ${missing.join(", ")}`);
  }
  return selected;
}

function getRemoteTreeSha(tree: GitHubRepoTree | undefined, subpath: string): string | undefined {
  return tree ? getGitHubTreeShaForSubpath(tree, subpath) : undefined;
}

export async function runDownload(context: RuntimeContext, input: string, options: DownloadOptions = {}) {
  if (options.as && (options.all || (options.skill && normalizeNameList(options.skill).length > 1))) {
    throw new Error("--as can only be used when downloading a single skill.");
  }

  const source = parseDownloadSource(input, context.cwd);
  if (options.ref) {
    source.ref = options.ref;
  }

  const sourceRoot = await resolveSourceRoot(source);
  try {
    let discovered: DownloadableSkill[];
    try {
      discovered = await discoverRequestedSkills(sourceRoot.root, source.subpath, options);
    } catch (error) {
      if (error instanceof DuplicateSkillNameError) {
        const lines = formatDuplicateSkillNameConflict(error, {
          source: source.type === "local" ? source.localPath : source.source,
          sourceUrl: source.sourceUrl,
          ref: source.ref,
          commandName: "aweskill store download",
        });
        if (options.list) {
          for (const line of lines) {
            context.write(line);
          }
          return { downloaded: [], listed: [] };
        }
        throw new Error(lines.join("\n"));
      }
      throw error;
    }
    if (discovered.length === 0) {
      throw new Error("No skills found in source.");
    }

    if (options.list) {
      context.write(`Downloadable skills: ${discovered.length}`);
      for (const skill of discovered) {
        context.write(`  - ${skill.name} ${skill.subpath}`);
      }
      return { downloaded: [], listed: discovered };
    }

    const selected = selectSkills(discovered, options);
    if (options.as && selected.length !== 1) {
      throw new Error("--as can only be used when downloading a single skill.");
    }

    const remoteTree = source.type === "github" ? await fetchGitHubRepoTree(source.source, source.ref) : undefined;
    const downloaded: string[] = [];
    for (const skill of selected) {
      const targetName = sanitizeName(options.as ?? skill.name);
      const computedHash = await computeDirectoryHash(skill.path);
      const remoteTreeSha = getRemoteTreeSha(remoteTree, skill.subpath);
      const lockEntry = {
        source: source.source,
        sourceType: source.type,
        sourceUrl: source.sourceUrl,
        ref: source.ref,
        subpath: skill.subpath,
        computedHash,
        remoteTreeSha,
      };
      const conflict = await classifyDownloadConflict({
        homeDir: context.homeDir,
        name: targetName,
        incomingHash: computedHash,
        incomingSource: lockEntry,
      });

      if (conflict.reason === "identical" && !options.override) {
        for (const line of formatDownloadConflictLines(targetName, conflict.reason)) {
          context.write(line);
        }
        continue;
      }
      if (conflict.reason !== "none" && !options.override) {
        throwDownloadConflict(targetName, conflict.reason);
      }

      await importPath({
        homeDir: context.homeDir,
        sourcePath: skill.path,
        skillName: targetName,
        override: options.override,
      });
      await upsertSkillLockEntry(context.homeDir, targetName, lockEntry);
      downloaded.push(targetName);
      context.write(`${options.override && conflict.reason !== "none" ? "Overwrote" : "Downloaded"} ${targetName}`);
    }

    return { downloaded, listed: discovered };
  } finally {
    await sourceRoot.cleanup?.();
  }
}
