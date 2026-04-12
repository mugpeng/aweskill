import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

import type { SkillEntry } from "../types.js";
import { getAweskillPaths, sanitizeName } from "./path.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureHomeLayout(homeDir: string): Promise<void> {
  const paths = getAweskillPaths(homeDir);
  await mkdir(paths.rootDir, { recursive: true });
  await mkdir(paths.skillsDir, { recursive: true });
  await mkdir(paths.dupSkillsDir, { recursive: true });
  await mkdir(paths.backupDir, { recursive: true });
  await mkdir(paths.bundlesDir, { recursive: true });
}

export function getSkillPath(homeDir: string, skillName: string): string {
  return path.join(getAweskillPaths(homeDir).skillsDir, sanitizeName(skillName));
}

export async function listSkills(homeDir: string): Promise<SkillEntry[]> {
  const skillsDir = getAweskillPaths(homeDir).skillsDir;
  return listSkillEntriesInDirectory(skillsDir);
}

export async function listSkillEntriesInDirectory(skillsDir: string): Promise<SkillEntry[]> {
  if (!(await pathExists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map(async (entry) => {
        const skillPath = path.join(skillsDir, entry.name);
        return {
          name: entry.name,
          path: skillPath,
          hasSKILLMd: await pathExists(path.join(skillPath, "SKILL.md")),
        } satisfies SkillEntry;
      }),
  );

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

export async function assertSkillSource(sourcePath: string): Promise<void> {
  const skillReadme = path.join(sourcePath, "SKILL.md");
  if (!(await pathExists(skillReadme))) {
    throw new Error(`Skill source must contain SKILL.md: ${sourcePath}`);
  }
}

export async function skillExists(homeDir: string, skillName: string): Promise<boolean> {
  return pathExists(getSkillPath(homeDir, skillName));
}
