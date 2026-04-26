import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
  classifyDownloadConflict,
  discoverDownloadableSkills,
  DuplicateSkillNameError,
  formatDownloadConflictLines,
  formatDuplicateSkillNameConflict,
  throwDownloadConflict,
  type DownloadableSkill,
} from "../lib/download.js";
import { computeDirectoryHash } from "../lib/hash.js";
import { importPath } from "../lib/import.js";
import { upsertSkillLockEntry } from "../lib/lock.js";
import { normalizeNameList, sanitizeName } from "../lib/path.js";
import { parseDownloadSource, type DownloadSource } from "../lib/source-parser.js";
import type { RuntimeContext } from "../types.js";

const execFileAsync = promisify(execFile);

export interface DownloadOptions {
  list?: boolean;
  skill?: string[];
  all?: boolean;
  ref?: string;
  override?: boolean;
  as?: string;
}

export async function resolveSourceRoot(source: DownloadSource): Promise<{ root: string; cleanup?: () => Promise<void> }> {
  if (source.type === "local") {
    return { root: source.localPath! };
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), "aweskill-download-"));
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
      discovered = await discoverDownloadableSkills(sourceRoot.root, source.subpath);
    } catch (error) {
      if (options.list && error instanceof DuplicateSkillNameError) {
        for (const line of formatDuplicateSkillNameConflict(error)) {
          context.write(line);
        }
        return { downloaded: [], listed: [] };
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

    const downloaded: string[] = [];
    for (const skill of selected) {
      const targetName = sanitizeName(options.as ?? skill.name);
      const computedHash = await computeDirectoryHash(skill.path);
      const lockEntry = {
        source: source.source,
        sourceType: source.type,
        sourceUrl: source.sourceUrl,
        ref: source.ref,
        subpath: skill.subpath,
        computedHash,
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
