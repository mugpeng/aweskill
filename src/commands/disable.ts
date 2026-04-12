import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { listBundles, readBundle } from "../lib/bundles.js";
import { getAweskillPaths, sanitizeName, uniqueSorted } from "../lib/path.js";
import { skillExists } from "../lib/skills.js";
import { listManagedSkillNames, removeManagedProjection } from "../lib/symlink.js";
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
    return bundle.skills;
  }

  // For disable we don't require the skill to still exist in central repo
  if (!(await skillExists(context.homeDir, normalizedName))) {
    return [normalizedName];
  }

  return [normalizedName];
}

/**
 * True when `skillName` appears in a bundle and at least one other skill from that bundle
 * still has an aweskill-managed projection under the same scope/agents — typical after
 * `enable bundle` while the user tries `disable skill` for one member only.
 */
async function bundlesWithCoEnabledSiblings(options: {
  homeDir: string;
  skillName: string;
  agents: AgentId[];
  scope: Scope;
  baseDir: string;
}): Promise<string[]> {
  const { skillsDir: centralSkillsDir } = getAweskillPaths(options.homeDir);
  const bundles = await listBundles(options.homeDir);
  const normalized = sanitizeName(options.skillName);
  const hit = new Set<string>();

  for (const bundle of bundles) {
    if (!bundle.skills.includes(normalized)) {
      continue;
    }
    const siblings = bundle.skills.filter((s) => s !== normalized);
    if (siblings.length === 0) {
      continue;
    }

    for (const agentId of options.agents) {
      const agentSkillsDir = resolveAgentSkillsDir(agentId, options.scope, options.baseDir);
      const managed = await listManagedSkillNames(agentSkillsDir, centralSkillsDir);
      if (siblings.some((s) => managed.has(s))) {
        hit.add(bundle.name);
        break;
      }
    }
  }

  return [...hit].sort();
}

export async function runDisable(
  context: RuntimeContext,
  options: {
    type: ActivationType;
    name: string;
    scope: Scope;
    agents: string[];
    projectDir?: string;
    force?: boolean;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  const skillNames = await resolveSkillNames(context, options.type, options.name);
  const baseDir = options.scope === "global" ? context.homeDir : (projectDir ?? context.cwd);

  if (options.type === "skill" && skillNames.length === 1 && !options.force) {
    const bundleNames = await bundlesWithCoEnabledSiblings({
      homeDir: context.homeDir,
      skillName: skillNames[0]!,
      agents,
      scope: options.scope,
      baseDir,
    });
    if (bundleNames.length > 0) {
      throw new Error(
        `Skill "${skillNames[0]}" is listed in bundle(s): ${bundleNames.join(", ")}. ` +
          `Other skills from those bundle(s) are still enabled in this scope. ` +
          `Use --force to remove only this skill's projection, or run "aweskill disable bundle <name>" to drop the whole bundle.`,
      );
    }
  }

  const removed: string[] = [];
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    for (const skillName of skillNames) {
      const targetPath = `${skillsDir}/${skillName}`;
      const wasRemoved = await removeManagedProjection(targetPath);
      if (wasRemoved) {
        removed.push(`${agentId}:${skillName}`);
      }
    }
  }

  const scopeLabel = options.scope === "global" ? "global scope" : (projectDir ?? context.cwd);
  context.write(`Disabled ${options.type} ${sanitizeName(options.name)} for ${agents.join(", ")} in ${scopeLabel}${removed.length > 0 ? ` (${removed.length} removed)` : ""}`);
  return { agents, skillNames, removed };
}
