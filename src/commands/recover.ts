import { cp, mkdir, readlink, unlink } from "node:fs/promises";
import path from "node:path";

import { resolveAgentsForMutation, resolveAgentSkillsDir } from "../lib/agents.js";
import { getAweskillPaths } from "../lib/path.js";
import { listManagedSkillNames } from "../lib/symlink.js";
import type { RuntimeContext, Scope } from "../types.js";

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

export async function runRecover(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForMutation({
    requestedAgents: options.agents,
    scope: options.scope,
    homeDir: context.homeDir,
    projectDir,
  });
  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);
  const baseDir = options.scope === "global" ? context.homeDir : (projectDir ?? context.cwd);

  const recovered: string[] = [];

  for (const agentId of agents) {
    const agentSkillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(agentSkillsDir, centralSkillsDir);

    for (const [skillName, mode] of managed) {
      if (mode !== "symlink") {
        continue;
      }

      const targetPath = path.join(agentSkillsDir, skillName);
      const sourcePath = path.join(centralSkillsDir, skillName);
      const currentTarget = await readlink(targetPath);
      const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
      if (resolvedCurrent !== path.resolve(sourcePath)) {
        continue;
      }

      await unlink(targetPath);
      await mkdir(path.dirname(targetPath), { recursive: true });
      await cp(sourcePath, targetPath, { recursive: true });
      recovered.push(`${agentId}:${skillName}`);
    }
  }

  const scopeLabel = options.scope === "global" ? "global scope" : (projectDir ?? context.cwd);
  context.write(`Recovered ${recovered.length} skill projection(s) in ${scopeLabel}${recovered.length > 0 ? `: ${recovered.join(", ")}` : ""}`);
  return { agents, recovered };
}
