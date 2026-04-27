import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { pathExists } from "./fs.js";
import { getAweskillPaths } from "./path.js";
import type { DownloadSourceType } from "./source-parser.js";

const LOCK_VERSION = 1;

export interface SkillLockEntry {
  source: string;
  sourceType: DownloadSourceType;
  sourceUrl: string;
  ref?: string;
  subpath?: string;
  computedHash: string;
  remoteTreeSha?: string;
  installedAt: string;
  updatedAt: string;
}

export interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
}

export type NewSkillLockEntry = Omit<SkillLockEntry, "installedAt" | "updatedAt">;

export function getSkillLockPath(homeDir: string): string {
  return path.join(getAweskillPaths(homeDir).rootDir, "skills-lock.json");
}

function emptyLock(): SkillLockFile {
  return { version: LOCK_VERSION, skills: {} };
}

export async function readSkillLock(homeDir: string): Promise<SkillLockFile> {
  const lockPath = getSkillLockPath(homeDir);
  if (!(await pathExists(lockPath))) {
    return emptyLock();
  }

  try {
    const parsed = JSON.parse(await readFile(lockPath, "utf8")) as SkillLockFile;
    if (parsed.version !== LOCK_VERSION || !parsed.skills) {
      return emptyLock();
    }
    return parsed;
  } catch {
    return emptyLock();
  }
}

export async function writeSkillLock(homeDir: string, lock: SkillLockFile): Promise<void> {
  const sortedSkills: Record<string, SkillLockEntry> = {};
  for (const name of Object.keys(lock.skills).sort()) {
    sortedSkills[name] = lock.skills[name]!;
  }
  const lockPath = getSkillLockPath(homeDir);
  await mkdir(path.dirname(lockPath), { recursive: true });
  await writeFile(lockPath, `${JSON.stringify({ version: LOCK_VERSION, skills: sortedSkills }, null, 2)}\n`, "utf8");
}

export async function upsertSkillLockEntry(homeDir: string, skillName: string, entry: NewSkillLockEntry): Promise<void> {
  const lock = await readSkillLock(homeDir);
  const now = new Date().toISOString();
  lock.skills[skillName] = {
    ...entry,
    installedAt: lock.skills[skillName]?.installedAt ?? now,
    updatedAt: now,
  };
  await writeSkillLock(homeDir, lock);
}

export async function removeSkillLockEntry(homeDir: string, skillName: string): Promise<void> {
  const lock = await readSkillLock(homeDir);
  if (!(skillName in lock.skills)) {
    return;
  }

  delete lock.skills[skillName];
  await writeSkillLock(homeDir, lock);
}
