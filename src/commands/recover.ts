import { cp, mkdir, readlink, unlink } from "node:fs/promises";
import path from "node:path";

import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { listManagedSkillNames } from "../lib/symlink.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

async function resolveAgentsForScope(
  context: RuntimeContext,
  requestedAgents: string[],
  scope: Scope,
  projectDir?: string,
): Promise<AgentId[]> {
  if (requestedAgents.length === 0 || requestedAgents.includes("all")) {
    const detected = await detectInstalledAgents({
      homeDir: context.homeDir,
      projectDir: scope === "project" ? projectDir : undefined,
    });
    return detected.length > 0 ? detected : listSupportedAgentIds();
  }

  return uniqueSorted(
    requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      return agent;
    }),
  );
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
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
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
