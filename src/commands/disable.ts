import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { listBundles, readBundle } from "../lib/bundles.js";
import { getAweskillPaths, sanitizeName, splitCommaValues, uniqueSorted } from "../lib/path.js";
import { skillExists } from "../lib/skills.js";
import { inspectProjectionTarget, listManagedSkillNames, removeProjectionTarget } from "../lib/symlink.js";
import type { ActivationType, AgentId, RuntimeContext, Scope } from "../types.js";
import path from "node:path";

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
    const candidates = detected.length > 0 ? detected : listSupportedAgentIds();
    return candidates.filter((agentId) => supportsScope(agentId, scope));
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

async function resolveSkillNames(context: RuntimeContext, type: ActivationType, names: string): Promise<string[]> {
  const normalizedNames = uniqueSorted(splitCommaValues(names).map((name) => sanitizeName(name)));

  if (normalizedNames.includes("all")) {
    if (type === "bundle") {
      const bundles = await listBundles(context.homeDir);
      return uniqueSorted(bundles.flatMap((bundle) => bundle.skills));
    }

    const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);
    const detected = await detectInstalledAgents({
      homeDir: context.homeDir,
    });
    const globalManaged = await Promise.all(
      detected.filter((agentId) => supportsScope(agentId, "global")).map(async (agentId) => {
        const agentSkillsDir = resolveAgentSkillsDir(agentId, "global", context.homeDir);
        return listManagedSkillNames(agentSkillsDir, centralSkillsDir);
      }),
    );
    const managedSkillNames = uniqueSorted(
      globalManaged.flatMap((managed) => [...managed.keys()]),
    );

    return managedSkillNames;
  }

  if (type === "bundle") {
    const bundles = await Promise.all(normalizedNames.map((bundleName) => readBundle(context.homeDir, bundleName)));
    return uniqueSorted(bundles.flatMap((bundle) => bundle.skills));
  }

  // For disable we don't require the skill to still exist in central repo
  const resolvedNames: string[] = [];
  for (const normalizedName of normalizedNames) {
    if (!(await skillExists(context.homeDir, normalizedName))) {
      resolvedNames.push(normalizedName);
      continue;
    }
    resolvedNames.push(normalizedName);
  }
  return uniqueSorted(resolvedNames);
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
  const baseDir = options.scope === "global" ? context.homeDir : (projectDir ?? context.cwd);
  const skillNames = await resolveSkillNames(context, options.type, options.name);
  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);

  if (splitCommaValues(options.name).map((name) => sanitizeName(name)).includes("all") && options.type === "skill") {
    const scopedManaged = await Promise.all(
      agents.map(async (agentId) => {
        const agentSkillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
        return listManagedSkillNames(agentSkillsDir, centralSkillsDir);
      }),
    );
    const managedSkillNames = uniqueSorted(
      scopedManaged.flatMap((managed) => [...managed.keys()]),
    );
    skillNames.splice(0, skillNames.length, ...managedSkillNames);
  }

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
          `Use --force to remove only this skill's projection, or run "aweskill agent remove bundle <name>" to drop the whole bundle.`,
      );
    }
  }

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    for (const skillName of skillNames) {
      const targetPath = path.join(skillsDir, skillName);
      const status = await inspectProjectionTarget(targetPath, { centralSkillsDir });
      if (status.kind === "missing" || status.kind === "managed_symlink" || status.kind === "managed_copy") {
        continue;
      }
      if (status.kind === "foreign_symlink" && !options.force) {
        throw new Error(
          `Target path is a symlink that is not managed by aweskill: ${targetPath}. ` +
            `Re-run with --force to remove it.`,
        );
      }
      if (status.kind === "directory" && !options.force) {
        throw new Error(`Target path already exists as a directory: ${targetPath}. Re-run with --force to remove it.`);
      }
      if (status.kind === "file" && !options.force) {
        throw new Error(`Target path already exists as a file: ${targetPath}. Re-run with --force to remove it.`);
      }
    }
  }

  const removed: string[] = [];
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    for (const skillName of skillNames) {
      const targetPath = path.join(skillsDir, skillName);
      const wasRemoved = await removeProjectionTarget(targetPath, {
        force: options.force,
        centralSkillsDir,
      });
      if (wasRemoved) {
        removed.push(`${agentId}:${skillName}`);
      }
    }
  }

  const scopeLabel = options.scope === "global" ? "global scope" : (projectDir ?? context.cwd);
  const targetLabel = uniqueSorted(splitCommaValues(options.name).map((name) => sanitizeName(name))).join(", ");
  context.write(`Disabled ${options.type} ${targetLabel} for ${agents.join(", ")} in ${scopeLabel}${removed.length > 0 ? ` (${removed.length} removed)` : ""}`);
  return { agents, skillNames, removed };
}
