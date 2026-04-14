import { access, lstat, readdir, readlink } from "node:fs/promises";
import path from "node:path";

import type { AgentId, ScanCandidate, Scope } from "../types.js";
import { isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "./agents.js";
import { pathExists } from "./fs.js";
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

function uniqueSorted<T extends string>(items: T[]): T[] {
  return [...new Set(items)].sort((left, right) => left.localeCompare(right));
}

export function resolveRequestedAgents(requestedAgents: string[], scope: Scope): AgentId[] {
  if (requestedAgents.length === 0 || requestedAgents.includes("all")) {
    return listSupportedAgentIds().filter((agentId) => supportsScope(agentId, scope));
  }

  return uniqueSorted(
    requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      if (!supportsScope(agent, scope)) {
        throw new Error(`Agent ${agent} does not support ${scope} scope.`);
      }
      return agent;
    }),
  );
}

export async function scanSkills(options: {
  homeDir: string;
  scope: Scope;
  agents?: string[];
  projectDir?: string;
}): Promise<ScanCandidate[]> {
  const results: ScanCandidate[] = [];
  const agents = resolveRequestedAgents(options.agents ?? [], options.scope);

  for (const agentId of agents) {
    const baseDir = options.scope === "global" ? options.homeDir : options.projectDir!;
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    results.push(...(await scanDirectory(skillsDir, agentId, options.scope, options.projectDir)));
  }

  return results.sort((left, right) => left.path.localeCompare(right.path));
}
