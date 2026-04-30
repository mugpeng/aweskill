import {
  type DownloadableSkill,
  DuplicateSkillNameError,
  findDownloadableSkillForLockEntry,
  formatDuplicateSkillNameConflict,
} from "../lib/download.js";
import { pathExists } from "../lib/fs.js";
import { fetchGitHubRepoTree, getGitHubTreeShaForSubpath } from "../lib/github-tree.js";
import { computeDirectoryHash } from "../lib/hash.js";
import { importPath } from "../lib/import.js";
import { readSkillLock, type SkillLockEntry, upsertSkillLockEntry } from "../lib/lock.js";
import { getSkillPath } from "../lib/skills.js";
import { parseDownloadSource } from "../lib/source-parser.js";
import { formatNoTrackedUpdatesMessage, formatUpdateStatusLines } from "../lib/update.js";
import type { RuntimeContext } from "../types.js";
import { resolveSourceRoot } from "./download.js";

export interface UpdateOptions {
  check?: boolean;
  dryRun?: boolean;
  override?: boolean;
  source?: string;
  skills?: string[];
}

interface SelectedSkillEntry {
  name: string;
  entry: SkillLockEntry;
}

interface UpdateSourceGroup {
  key: string;
  entries: SelectedSkillEntry[];
}

interface PreparedUpdateGroup {
  entries: SelectedSkillEntry[];
  skipped: string[];
  remoteTreeShas: Map<string, string>;
}

function entryMatchesSource(entry: SkillLockEntry, source?: string): boolean {
  return !source || entry.source === source || entry.sourceUrl === source;
}

export async function resolveUpdateRoot(context: RuntimeContext, entry: SkillLockEntry) {
  const parsed = parseDownloadSource(entry.sourceType === "local" ? entry.source : entry.sourceUrl, context.cwd);
  parsed.ref = entry.ref;
  return resolveSourceRoot(parsed);
}

export function groupEntriesBySource(entries: SelectedSkillEntry[]): UpdateSourceGroup[] {
  const groups = new Map<string, UpdateSourceGroup>();

  for (const item of entries) {
    const key = JSON.stringify({
      sourceType: item.entry.sourceType,
      source: item.entry.source,
      sourceUrl: item.entry.sourceUrl,
      ref: item.entry.ref ?? null,
    });
    const existing = groups.get(key);
    if (existing) {
      existing.entries.push(item);
      continue;
    }
    groups.set(key, { key, entries: [item] });
  }

  return [...groups.values()];
}

async function prepareUpdateGroup(
  context: RuntimeContext,
  group: UpdateSourceGroup,
  options: UpdateOptions,
): Promise<PreparedUpdateGroup> {
  const firstEntry = group.entries[0]?.entry;
  if (!firstEntry || firstEntry.sourceType !== "github") {
    return { entries: group.entries, skipped: [], remoteTreeShas: new Map() };
  }

  const remoteTree = await fetchGitHubRepoTree(firstEntry.source, firstEntry.ref);
  if (!remoteTree) {
    return { entries: group.entries, skipped: [], remoteTreeShas: new Map() };
  }

  const remoteTreeShas = new Map<string, string>();
  const entriesToClone: SelectedSkillEntry[] = [];
  const skipped: string[] = [];

  for (const item of group.entries) {
    const remoteTreeSha = item.entry.subpath ? getGitHubTreeShaForSubpath(remoteTree, item.entry.subpath) : undefined;
    if (remoteTreeSha) {
      remoteTreeShas.set(item.name, remoteTreeSha);
    }

    if (!remoteTreeSha || !item.entry.remoteTreeSha || remoteTreeSha !== item.entry.remoteTreeSha) {
      entriesToClone.push(item);
      continue;
    }

    const destination = getSkillPath(context.homeDir, item.name);
    if (!(await pathExists(destination))) {
      if (!options.override) {
        for (const line of formatUpdateStatusLines(item.name, "missing-local-skill")) {
          context.write(line);
        }
        skipped.push(item.name);
        continue;
      }
      entriesToClone.push(item);
      continue;
    }

    const currentHash = await computeDirectoryHash(destination);
    if (currentHash === item.entry.computedHash) {
      for (const line of formatUpdateStatusLines(item.name, "up-to-date")) {
        context.write(line);
      }
      continue;
    }

    if (!options.override) {
      for (const line of formatUpdateStatusLines(item.name, "local-changes-detected")) {
        context.write(line);
      }
      skipped.push(item.name);
      continue;
    }

    entriesToClone.push(item);
  }

  return { entries: entriesToClone, skipped, remoteTreeShas };
}

export async function runUpdate(context: RuntimeContext, options: UpdateOptions = {}) {
  const lock = await readSkillLock(context.homeDir);
  const selectedNames = new Set(options.skills ?? []);
  const entries = Object.entries(lock.skills).filter(([name, entry]) => {
    if (selectedNames.size > 0 && !selectedNames.has(name)) {
      return false;
    }
    return entryMatchesSource(entry, options.source);
  });

  if (entries.length === 0) {
    context.write(formatNoTrackedUpdatesMessage());
    return { updated: [], skipped: [] };
  }

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const group of groupEntriesBySource(entries.map(([name, entry]) => ({ name, entry })))) {
    const preparedGroup = await prepareUpdateGroup(context, group, options);
    skipped.push(...preparedGroup.skipped);
    if (preparedGroup.entries.length === 0) {
      continue;
    }

    const sourceRoot = await resolveUpdateRoot(context, preparedGroup.entries[0]!.entry);
    try {
      for (const { name, entry } of preparedGroup.entries) {
        let remoteSkill: DownloadableSkill | undefined;
        try {
          remoteSkill = await findDownloadableSkillForLockEntry(sourceRoot.root, name, entry);
        } catch (error) {
          if (error instanceof DuplicateSkillNameError) {
            for (const line of formatDuplicateSkillNameConflict(error, {
              source: entry.sourceType === "local" ? entry.source : undefined,
              sourceUrl: entry.sourceUrl,
              ref: entry.ref,
              commandName: "aweskill store install",
            })) {
              context.write(line);
            }
            skipped.push(name);
            continue;
          }
          throw error;
        }
        if (!remoteSkill) {
          for (const line of formatUpdateStatusLines(name, "source-missing-skill")) {
            context.write(line);
          }
          skipped.push(name);
          continue;
        }

        const remoteHash = await computeDirectoryHash(remoteSkill.path);
        const destination = getSkillPath(context.homeDir, name);
        if (!(await pathExists(destination))) {
          if (!options.override) {
            for (const line of formatUpdateStatusLines(name, "missing-local-skill")) {
              context.write(line);
            }
            skipped.push(name);
            continue;
          }
        } else {
          const currentHash = await computeDirectoryHash(destination);
          if (currentHash === remoteHash) {
            for (const line of formatUpdateStatusLines(name, "up-to-date")) {
              context.write(line);
            }
            continue;
          }
          if (currentHash !== entry.computedHash && !options.override) {
            for (const line of formatUpdateStatusLines(name, "local-changes-detected")) {
              context.write(line);
            }
            skipped.push(name);
            continue;
          }
        }

        if (options.check || options.dryRun) {
          for (const line of formatUpdateStatusLines(name, "update-available")) {
            context.write(line);
          }
          continue;
        }

        await importPath({
          homeDir: context.homeDir,
          sourcePath: remoteSkill.path,
          skillName: name,
          override: true,
        });
        await upsertSkillLockEntry(context.homeDir, name, {
          source: entry.source,
          sourceType: entry.sourceType,
          sourceUrl: entry.sourceUrl,
          ref: entry.ref,
          subpath: remoteSkill.subpath,
          computedHash: remoteHash,
          remoteTreeSha: preparedGroup.remoteTreeShas.get(name),
        });
        updated.push(name);
        for (const line of formatUpdateStatusLines(name, "updated")) {
          context.write(line);
        }
      }
    } finally {
      await sourceRoot.cleanup?.();
    }
  }

  return { updated, skipped };
}
