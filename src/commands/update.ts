import { resolveSourceRoot } from "./download.js";
import {
  discoverDownloadableSkills,
  DuplicateSkillNameError,
  formatDuplicateSkillNameConflict,
  type DownloadableSkill,
} from "../lib/download.js";
import { computeDirectoryHash } from "../lib/hash.js";
import { importPath } from "../lib/import.js";
import { readSkillLock, upsertSkillLockEntry, type SkillLockEntry } from "../lib/lock.js";
import { getSkillPath } from "../lib/skills.js";
import { parseDownloadSource } from "../lib/source-parser.js";
import { formatNoTrackedUpdatesMessage, formatUpdateStatusLines } from "../lib/update.js";
import { pathExists } from "../lib/fs.js";
import type { RuntimeContext } from "../types.js";

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

function entryMatchesSource(entry: SkillLockEntry, source?: string): boolean {
  return !source || entry.source === source || entry.sourceUrl === source;
}

async function findRemoteSkill(sourceRoot: string, name: string, entry: SkillLockEntry): Promise<DownloadableSkill | undefined> {
  if (entry.subpath) {
    const skillsAtLockedPath = await discoverDownloadableSkills(sourceRoot, entry.subpath);
    const matchedAtLockedPath = skillsAtLockedPath.find((skill) => skill.name === name || skill.subpath === entry.subpath);
    if (matchedAtLockedPath) {
      return matchedAtLockedPath;
    }
  }

  const skills = await discoverDownloadableSkills(sourceRoot);
  return skills.find((skill) => skill.name === name || skill.subpath === entry.subpath);
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
    const sourceRoot = await resolveUpdateRoot(context, group.entries[0]!.entry);
    try {
      for (const { name, entry } of group.entries) {
        let remoteSkill: DownloadableSkill | undefined;
        try {
          remoteSkill = await findRemoteSkill(sourceRoot.root, name, entry);
        } catch (error) {
          if (error instanceof DuplicateSkillNameError) {
            for (const line of formatDuplicateSkillNameConflict(error, {
              source: entry.sourceType === "local" ? entry.source : undefined,
              sourceUrl: entry.sourceUrl,
              ref: entry.ref,
              commandName: "aweskill download",
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
