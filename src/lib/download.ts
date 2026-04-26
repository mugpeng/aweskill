import { readdir } from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./fs.js";
import { computeDirectoryHash } from "./hash.js";
import { readSkillLock, type NewSkillLockEntry } from "./lock.js";
import { assertPathSafe, sanitizeName } from "./path.js";
import { getSkillPath, skillExists } from "./skills.js";

const PRIORITY_SKILL_DIRS = ["", "skills", ".agents/skills", ".claude/skills", ".codex/skills"];
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "__pycache__"]);

export interface DownloadableSkill {
  name: string;
  path: string;
  subpath: string;
}

interface RecordedSkillLocation {
  path: string;
  subpath: string;
}

export class DuplicateSkillNameError extends Error {
  skillName: string;
  existing: RecordedSkillLocation;
  duplicate: RecordedSkillLocation;

  constructor(skillName: string, existing: RecordedSkillLocation, duplicate: RecordedSkillLocation) {
    super(`Duplicate skill name "${skillName}" found in source: ${existing.subpath} and ${duplicate.subpath}. Use a unique folder name before downloading.`);
    this.name = "DuplicateSkillNameError";
    this.skillName = skillName;
    this.existing = existing;
    this.duplicate = duplicate;
  }
}

export function formatDuplicateSkillNameConflict(error: DuplicateSkillNameError): string[] {
  return [
    "Duplicate skill names found in source:",
    `  - ${error.skillName}: ${error.existing.subpath}`,
    `  - ${error.skillName}: ${error.duplicate.subpath}`,
    "Rename one of the source folders before downloading.",
  ];
}

export function formatDownloadConflictLines(name: string, reason: DownloadConflictReason): string[] {
  switch (reason) {
    case "identical":
      return [`Skipped ${name}: identical content is already installed.`];
    case "same-source-different-content":
      return [
        `Update available for ${name}: installed content differs from the same source.`,
        "Use --override to replace it, or --as <name> to install a separate copy.",
      ];
    case "different-source":
      return [
        `Name conflict for ${name}: another skill with this name is installed from a different source.`,
        "Use --override to replace it, or --as <name> to install under a new name.",
      ];
    case "unmanaged":
      return [
        `Unmanaged conflict for ${name}: a skill with this name exists but has no source record.`,
        "Use --override to replace it, or --as <name> to install under a new name.",
      ];
    case "hash-unavailable":
      return [
        `Cannot compare ${name}: existing or downloaded content hash is unavailable.`,
        "Use --override to replace it, or --as <name> to install under a new name.",
      ];
    case "none":
      return [];
  }
}

export type DownloadConflictReason =
  | "none"
  | "identical"
  | "same-source-different-content"
  | "different-source"
  | "unmanaged"
  | "hash-unavailable";

export interface DownloadConflictResult {
  reason: DownloadConflictReason;
}

async function hasSkillMd(directoryPath: string): Promise<boolean> {
  return pathExists(path.join(directoryPath, "SKILL.md"));
}

function registerDiscoveredSkill(
  seen: Map<string, RecordedSkillLocation>,
  results: DownloadableSkill[],
  skill: DownloadableSkill,
): void {
  const existing = seen.get(skill.name);
  if (existing) {
    throw new DuplicateSkillNameError(skill.name, existing, { path: skill.path, subpath: skill.subpath });
  }

  seen.set(skill.name, { path: skill.path, subpath: skill.subpath });
  results.push(skill);
}

async function discoverRecursive(
  baseDir: string,
  currentDir: string,
  seen: Map<string, RecordedSkillLocation>,
  results: DownloadableSkill[],
  depth = 0,
): Promise<void> {
  if (depth > 5) {
    return;
  }

  let entries;
  try {
    entries = await readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  if (await hasSkillMd(currentDir)) {
    const name = sanitizeName(path.basename(currentDir));
    if (name) {
      registerDiscoveredSkill(seen, results, {
        name,
        path: currentDir,
        subpath: path.relative(baseDir, currentDir).split(path.sep).join("/") || ".",
      });
    }
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) {
      continue;
    }
    await discoverRecursive(baseDir, path.join(currentDir, entry.name), seen, results, depth + 1);
  }
}

export async function discoverDownloadableSkills(baseDir: string, subpath?: string): Promise<DownloadableSkill[]> {
  const searchRoot = subpath ? path.join(baseDir, subpath) : baseDir;
  assertPathSafe(baseDir, searchRoot);

  const seen = new Map<string, RecordedSkillLocation>();
  const results: DownloadableSkill[] = [];

  if (await hasSkillMd(searchRoot)) {
    const name = sanitizeName(path.basename(searchRoot));
    return name ? [{ name, path: searchRoot, subpath: path.relative(baseDir, searchRoot).split(path.sep).join("/") || "." }] : [];
  }

  for (const relativeDir of PRIORITY_SKILL_DIRS) {
    const directoryPath = relativeDir ? path.join(searchRoot, relativeDir) : searchRoot;
    let entries;
    try {
      entries = await readdir(directoryPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const skillPath = path.join(directoryPath, entry.name);
      if (!(await hasSkillMd(skillPath))) {
        continue;
      }
      const name = sanitizeName(entry.name);
      if (!name) {
        continue;
      }
      registerDiscoveredSkill(seen, results, {
        name,
        path: skillPath,
        subpath: path.relative(baseDir, skillPath).split(path.sep).join("/"),
      });
    }
  }

  if (results.length === 0) {
    await discoverRecursive(baseDir, searchRoot, seen, results);
  }

  return results.sort((left, right) => left.name.localeCompare(right.name));
}

function sameSource(left: NewSkillLockEntry, right: NewSkillLockEntry): boolean {
  return left.source === right.source && left.sourceType === right.sourceType && left.sourceUrl === right.sourceUrl && left.ref === right.ref && left.subpath === right.subpath;
}

export async function classifyDownloadConflict(options: {
  homeDir: string;
  name: string;
  incomingHash?: string;
  incomingSource: NewSkillLockEntry;
}): Promise<DownloadConflictResult> {
  if (!(await skillExists(options.homeDir, options.name))) {
    return { reason: "none" };
  }

  if (!options.incomingHash) {
    return { reason: "hash-unavailable" };
  }

  let existingHash: string;
  try {
    existingHash = await computeDirectoryHash(getSkillPath(options.homeDir, options.name));
  } catch {
    return { reason: "hash-unavailable" };
  }

  if (existingHash === options.incomingHash) {
    return { reason: "identical" };
  }

  const lock = await readSkillLock(options.homeDir);
  const existingEntry = lock.skills[options.name];
  if (!existingEntry) {
    return { reason: "unmanaged" };
  }

  if (sameSource(existingEntry, options.incomingSource)) {
    return { reason: "same-source-different-content" };
  }

  return { reason: "different-source" };
}

export function formatDownloadConflict(name: string, reason: DownloadConflictReason): string {
  return formatDownloadConflictLines(name, reason).join(" ");
}

export function throwDownloadConflict(name: string, reason: Exclude<DownloadConflictReason, "none">): never {
  throw new Error(formatDownloadConflict(name, reason));
}
