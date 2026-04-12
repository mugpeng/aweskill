import { mkdir } from "node:fs/promises";

import { detectInstalledAgents, getProjectionMode, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { listBundles, readBundle } from "../lib/bundles.js";
import { getSkillPath, listSkills, skillExists } from "../lib/skills.js";
import { assertProjectionTargetSafe, createSkillCopy, createSkillSymlink } from "../lib/symlink.js";
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

  if (normalizedName === "all") {
    if (type === "bundle") {
      const bundles = await listBundles(context.homeDir);
      const skillNames = uniqueSorted(bundles.flatMap((bundle) => bundle.skills));
      for (const skillName of skillNames) {
        if (!(await skillExists(context.homeDir, skillName))) {
          throw new Error(`A bundle in "all" references unknown skill: ${skillName}`);
        }
      }
      return skillNames;
    }

    const skills = await listSkills(context.homeDir);
    return skills.map((skill) => skill.name);
  }

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
  const skillNames = await resolveSkillNames(context, options.type, options.name);
  const baseDir = options.scope === "global" ? context.homeDir : (projectDir ?? context.cwd);

  // Preflight: check all targets are safe before touching any
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    await mkdir(skillsDir, { recursive: true });
    for (const skillName of skillNames) {
      const sourcePath = getSkillPath(context.homeDir, skillName);
      const targetPath = `${skillsDir}/${skillName}`;
      await assertProjectionTargetSafe(getProjectionMode(agentId), sourcePath, targetPath);
    }
  }

  // Apply projections directly
  const created: string[] = [];
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const mode = getProjectionMode(agentId);
    for (const skillName of skillNames) {
      const sourcePath = getSkillPath(context.homeDir, skillName);
      const targetPath = `${skillsDir}/${skillName}`;
      const result = mode === "symlink"
        ? await createSkillSymlink(sourcePath, targetPath)
        : await createSkillCopy(sourcePath, targetPath);
      if (result === "created") {
        created.push(`${agentId}:${skillName}`);
      }
    }
  }

  const scopeLabel = options.scope === "global" ? "global scope" : (projectDir ?? context.cwd);
  context.write(`Enabled ${options.type} ${sanitizeName(options.name)} for ${agents.join(", ")} in ${scopeLabel}${created.length > 0 ? ` (${created.length} created)` : ""}`);
  return { agents, skillNames, created };
}
