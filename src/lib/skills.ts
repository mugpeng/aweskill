import { access, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

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
  await mkdir(paths.bundlesDir, { recursive: true });
}

export function getSkillPath(homeDir: string, skillName: string): string {
  return path.join(getAweskillPaths(homeDir).skillsDir, sanitizeName(skillName));
}

export async function listSkills(homeDir: string): Promise<string[]> {
  const skillsDir = getAweskillPaths(homeDir).skillsDir;

  if (!(await pathExists(skillsDir))) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory() || entry.isSymbolicLink()).map((entry) => entry.name).sort();
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
