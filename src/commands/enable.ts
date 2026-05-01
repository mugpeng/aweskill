import path from "node:path";

import { getProjectionMode, resolveAgentSkillsDir, resolveAgentsForMutation } from "../lib/agents.js";
import { listBundles, readBundle } from "../lib/bundles.js";
import { getAweskillPaths, normalizeNameList, uniqueSorted } from "../lib/path.js";
import { getSkillPath, listSkills, skillExists } from "../lib/skills.js";
import { createSkillCopy, createSkillSymlink, inspectProjectionTarget } from "../lib/symlink.js";
import type { ActivationType, RuntimeContext, Scope } from "../types.js";

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

async function resolveSkillNames(
  context: RuntimeContext,
  type: ActivationType,
  names: string | string[],
): Promise<string[]> {
  const normalizedNames = normalizeNameList(names);

  if (normalizedNames.includes("all")) {
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
    const bundles = await Promise.all(normalizedNames.map((bundleName) => readBundle(context.homeDir, bundleName)));
    const skillNames = uniqueSorted(bundles.flatMap((bundle) => bundle.skills));
    for (const skillName of skillNames) {
      if (!(await skillExists(context.homeDir, skillName))) {
        const bundle = bundles.find((candidate) => candidate.skills.includes(skillName));
        throw new Error(`Bundle ${bundle?.name ?? "(unknown)"} references unknown skill: ${skillName}`);
      }
    }
    return skillNames;
  }

  for (const normalizedName of normalizedNames) {
    if (!(await skillExists(context.homeDir, normalizedName))) {
      throw new Error(`Unknown skill: ${normalizedName}`);
    }
  }

  return normalizedNames;
}

export async function runEnable(
  context: RuntimeContext,
  options: {
    type: ActivationType;
    name: string | string[];
    scope: Scope;
    agents: string[];
    projectDir?: string;
    force?: boolean;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForMutation({
    requestedAgents: options.agents,
    scope: options.scope,
    homeDir: context.homeDir,
    projectDir,
  });
  const skillNames = await resolveSkillNames(context, options.type, options.name);
  const baseDir = options.scope === "global" ? context.homeDir : (projectDir ?? context.cwd);
  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);

  // Preflight: check all targets are safe before touching any
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    for (const skillName of skillNames) {
      const sourcePath = getSkillPath(context.homeDir, skillName);
      const targetPath = path.join(skillsDir, skillName);
      const status = await inspectProjectionTarget(targetPath, { centralSkillsDir, sourcePath });
      if (status.kind === "missing") {
        continue;
      }
      if (status.kind === "managed_symlink" || status.kind === "managed_copy") {
        if (status.matchesSource && !options.force) {
          throw new Error(
            `Target path is already an aweskill-managed projection for ${skillName}: ${targetPath}. ` +
              `Re-run with --force to recreate it.`,
          );
        }
        continue;
      }
      if (status.kind === "foreign_symlink" && !options.force) {
        throw new Error(
          `Target path is a symlink that is not managed by aweskill: ${targetPath}. ` +
            `Re-run with --force to replace it with an aweskill-managed projection.`,
        );
      }
      if (status.kind === "directory" && !options.force) {
        throw new Error(
          `Target path already exists as a directory: ${targetPath}. ` +
            `Re-run with --force to replace it with an aweskill-managed projection.`,
        );
      }
      if (status.kind === "file" && !options.force) {
        throw new Error(
          `Target path already exists as a file: ${targetPath}. ` +
            `Re-run with --force to replace it with an aweskill-managed projection.`,
        );
      }
    }
  }

  // Apply projections directly
  const created: string[] = [];
  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const mode = getProjectionMode(agentId);
    for (const skillName of skillNames) {
      const sourcePath = getSkillPath(context.homeDir, skillName);
      const targetPath = path.join(skillsDir, skillName);
      const result =
        mode === "symlink"
          ? await createSkillSymlink(sourcePath, targetPath, { allowReplaceExisting: options.force })
          : await createSkillCopy(sourcePath, targetPath, { allowReplaceExisting: options.force });
      if (result.status === "created") {
        created.push(`${agentId}:${skillName}`);
      }
    }
  }

  const scopeLabel = options.scope === "global" ? "global scope" : (projectDir ?? context.cwd);
  const targetLabel = normalizeNameList(options.name).join(", ");
  context.write(
    `Enabled ${options.type} ${targetLabel} for ${agents.join(", ")} in ${scopeLabel}${created.length > 0 ? ` (${created.length} created)` : ""}`,
  );
  return { agents, skillNames, created };
}
