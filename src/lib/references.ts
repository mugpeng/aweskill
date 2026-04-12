import { rm } from "node:fs/promises";
import path from "node:path";

import { listSupportedAgents, resolveAgentSkillsDir } from "./agents.js";
import { listBundles, writeBundle } from "./bundles.js";
import { getAweskillPaths, sanitizeName } from "./path.js";
import { getSkillPath } from "./skills.js";
import { listManagedSkillNames, removeManagedProjection } from "./symlink.js";

export interface SkillReferences {
  bundles: string[];
  agentProjections: string[];
}

/**
 * Find all places a skill is referenced:
 *  - bundle definitions that list it
 *  - active managed projections (symlinks/copies) in agent skill directories
 */
export async function findSkillReferences(options: {
  homeDir: string;
  skillName: string;
  projectDir?: string;
}): Promise<SkillReferences> {
  const normalizedSkill = sanitizeName(options.skillName);
  const { skillsDir } = getAweskillPaths(options.homeDir);

  const bundles = (await listBundles(options.homeDir))
    .filter((bundle) => bundle.skills.includes(normalizedSkill))
    .map((bundle) => bundle.name);

  const agentProjections: string[] = [];
  const baseDirs: Array<{ scope: "global" | "project"; dir: string }> = [
    { scope: "global", dir: options.homeDir },
  ];
  if (options.projectDir) {
    baseDirs.push({ scope: "project", dir: options.projectDir });
  }

  for (const { scope, dir } of baseDirs) {
    for (const agent of listSupportedAgents()) {
      const agentSkillsDir = resolveAgentSkillsDir(agent.id, scope, dir);
      const managed = await listManagedSkillNames(agentSkillsDir, skillsDir);
      if (managed.has(normalizedSkill)) {
        agentProjections.push(`${agent.id}(${scope}):${normalizedSkill}`);
      }
    }
  }

  return { bundles, agentProjections };
}

/**
 * Remove the skill from bundles, delete all managed projections pointing to it,
 * then delete the skill from the central repository.
 */
export async function removeSkillWithReferences(options: {
  homeDir: string;
  skillName: string;
  projectDir?: string;
}): Promise<void> {
  const normalizedSkill = sanitizeName(options.skillName);
  const { skillsDir } = getAweskillPaths(options.homeDir);

  // Strip from bundle definitions
  const bundles = await listBundles(options.homeDir);
  for (const bundle of bundles) {
    if (!bundle.skills.includes(normalizedSkill)) {
      continue;
    }
    bundle.skills = bundle.skills.filter((skill) => skill !== normalizedSkill);
    await writeBundle(options.homeDir, bundle);
  }

  // Remove managed projections across all known agent dirs
  const baseDirs: Array<{ scope: "global" | "project"; dir: string }> = [
    { scope: "global", dir: options.homeDir },
  ];
  if (options.projectDir) {
    baseDirs.push({ scope: "project", dir: options.projectDir });
  }

  for (const { scope, dir } of baseDirs) {
    for (const agent of listSupportedAgents()) {
      const agentSkillsDir = resolveAgentSkillsDir(agent.id, scope, dir);
      const managed = await listManagedSkillNames(agentSkillsDir, skillsDir);
      if (managed.has(normalizedSkill)) {
        await removeManagedProjection(path.join(agentSkillsDir, normalizedSkill));
      }
    }
  }

  // Delete from central repo
  await rm(getSkillPath(options.homeDir, normalizedSkill), { force: true, recursive: true });
}
