import { mkdir } from "node:fs/promises";

import { detectInstalledAgents, getProjectionMode, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { readBundle } from "../lib/bundles.js";
import { enableGlobalActivation, enableProjectActivation } from "../lib/config.js";
import { reconcileGlobal, reconcileProject } from "../lib/reconcile.js";
import { getSkillPath, skillExists } from "../lib/skills.js";
import { assertProjectionTargetSafe } from "../lib/symlink.js";
import { sanitizeName, uniqueSorted } from "../lib/path.js";
import type { ActivationType, AgentId, RuntimeContext, Scope } from "../types.js";

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

async function resolveSkillNames(context: RuntimeContext, type: ActivationType, name: string): Promise<string[]> {
  const normalizedName = sanitizeName(name);

  if (type === "bundle") {
    const bundle = await readBundle(context.homeDir, normalizedName);
    for (const skillName of bundle.skills) {
      if (!(await skillExists(context.homeDir, skillName))) {
        throw new Error(`Bundle ${bundle.name} references unknown skill: ${skillName}`);
      }
    }
    return bundle.skills;
  }

  if (!(await skillExists(context.homeDir, normalizedName))) {
    throw new Error(`Unknown skill: ${normalizedName}`);
  }

  return [normalizedName];
}

async function preflightEnable(options: {
  context: RuntimeContext;
  type: ActivationType;
  name: string;
  agents: AgentId[];
  scope: Scope;
  projectDir?: string;
}): Promise<string[]> {
  const skillNames = await resolveSkillNames(options.context, options.type, options.name);
  const baseDir = options.scope === "global" ? options.context.homeDir : getProjectDir(options.context, options.projectDir);

  for (const agentId of options.agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    await mkdir(skillsDir, { recursive: true });

    for (const skillName of skillNames) {
      const sourcePath = getSkillPath(options.context.homeDir, skillName);
      const targetPath = `${skillsDir}/${skillName}`;
      await assertProjectionTargetSafe(getProjectionMode(agentId), sourcePath, targetPath);
    }
  }

  return skillNames;
}

async function enableInScope(options: {
  context: RuntimeContext;
  type: ActivationType;
  name: string;
  agents: AgentId[];
  scope: Scope;
  projectDir?: string;
}) {
  await preflightEnable(options);
  const normalizedName = sanitizeName(options.name);

  if (options.scope === "global") {
    await enableGlobalActivation(options.context.homeDir, {
      type: options.type,
      name: normalizedName,
      agents: options.agents,
    });
    const result = await reconcileGlobal(options.context.homeDir);
    options.context.write(`Enabled ${options.type} ${normalizedName} for ${options.agents.join(", ")} in global scope`);
    return result;
  }

  const projectDir = getProjectDir(options.context, options.projectDir);
  await enableProjectActivation(projectDir, {
    type: options.type,
    name: normalizedName,
    agents: options.agents,
  });
  const result = await reconcileProject(options.context.homeDir, projectDir);
  options.context.write(`Enabled ${options.type} ${normalizedName} for ${options.agents.join(", ")} in ${projectDir}`);
  return result;
}

export async function runEnable(
  context: RuntimeContext,
  options: {
    type: ActivationType;
    name: string;
    scope: Scope;
    agents: string[];
    projectDir?: string;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  return enableInScope({
    context,
    type: options.type,
    name: options.name,
    scope: options.scope,
    agents,
    projectDir,
  });
}
