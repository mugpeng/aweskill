import { access, lstat, readdir, readlink } from "node:fs/promises";
import path from "node:path";

import type { ScanCandidate } from "../types.js";
import { listSupportedAgents } from "./agents.js";
import { sanitizeName } from "./path.js";

async function hasSkillReadme(skillDir: string): Promise<boolean> {
  try {
    await access(path.join(skillDir, "SKILL.md"));
    return true;
  } catch {
    return false;
  }
}

async function isSymlinkPath(targetPath: string): Promise<boolean> {
  try {
    return (await lstat(targetPath)).isSymbolicLink();
  } catch {
    return false;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveSymlinkSource(targetPath: string): Promise<{ sourcePath?: string; isBroken: boolean }> {
  try {
    const linkTarget = await readlink(targetPath);
    const sourcePath = path.resolve(path.dirname(targetPath), linkTarget);
    return {
      sourcePath,
      isBroken: !(await pathExists(sourcePath)),
    };
  } catch {
    return {
      isBroken: true,
    };
  }
}

async function scanDirectory(baseDir: string, agentId: ScanCandidate["agentId"], scope: ScanCandidate["scope"], projectDir?: string) {
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const candidates: ScanCandidate[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) {
        continue;
      }
      const fullPath = path.join(baseDir, entry.name);
      const isSymlink = await isSymlinkPath(fullPath);
      const symlinkInfo = isSymlink ? await resolveSymlinkSource(fullPath) : { isBroken: false };

      if (!(await hasSkillReadme(fullPath)) && !symlinkInfo.isBroken) {
        continue;
      }
      candidates.push({
        agentId,
        name: sanitizeName(entry.name),
        path: fullPath,
        scope,
        projectDir,
        isSymlink,
        symlinkSourcePath: symlinkInfo.sourcePath,
        isBrokenSymlink: symlinkInfo.isBroken,
      });
    }
    return candidates;
  } catch {
    return [];
  }
}

export async function scanSkills(options: {
  homeDir: string;
  projectDirs?: string[];
}): Promise<ScanCandidate[]> {
  const results: ScanCandidate[] = [];

  for (const agent of listSupportedAgents()) {
    results.push(...(await scanDirectory(agent.globalSkillsDir(options.homeDir), agent.id, "global")));
    for (const projectDir of options.projectDirs ?? []) {
      results.push(...(await scanDirectory(agent.projectSkillsDir(projectDir), agent.id, "project", projectDir)));
    }
  }

  return results.sort((left, right) => left.path.localeCompare(right.path));
}
