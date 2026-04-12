import { access } from "node:fs/promises";
import path from "node:path";

import type {
  ActivationBase,
  ProjectionSpec,
  ReconcileResult,
  Scope,
  StatusSnapshot,
} from "../types.js";
import { getProjectionMode, listSupportedAgents, resolveAgentSkillsDir } from "./agents.js";
import { listBundles, readBundle } from "./bundles.js";
import { readGlobalConfig, readProjectConfig } from "./config.js";
import { getMatchingProjectRules } from "./matcher.js";
import { getAweskillPaths, getProjectConfigPath, sanitizeName, uniqueSorted } from "./path.js";
import { canTakeOverDiscoveredSkill, collectKnownProjectDirs, updateRegistryForStatus } from "./registry.js";
import { getSkillPath } from "./skills.js";
import { createSkillCopy, createSkillSymlink, listManagedSkillNames, removeManagedProjection } from "./symlink.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function expandActivationsToSkills(homeDir: string, activations: ActivationBase[]): Promise<{
  expanded: ActivationBase[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const bundleCache = new Map<string, string[]>();
  const expanded: ActivationBase[] = [];

  for (const activation of activations) {
    if (activation.type === "skill") {
      expanded.push({
        type: "skill",
        name: sanitizeName(activation.name),
        agents: uniqueSorted(activation.agents),
      });
      continue;
    }

    if (!bundleCache.has(activation.name)) {
      try {
        const bundle = await readBundle(homeDir, activation.name);
        bundleCache.set(activation.name, bundle.skills);
      } catch {
        warnings.push(`Missing bundle: ${activation.name}`);
        bundleCache.set(activation.name, []);
      }
    }

    for (const skillName of bundleCache.get(activation.name) ?? []) {
      expanded.push({
        type: "skill",
        name: skillName,
        agents: uniqueSorted(activation.agents),
      });
    }
  }

  const merged = new Map<string, ActivationBase>();
  for (const activation of expanded) {
    const key = `${activation.type}:${activation.name}`;
    const existing = merged.get(key);
    if (existing) {
      existing.agents = uniqueSorted([...existing.agents, ...activation.agents]);
    } else {
      merged.set(key, { ...activation, agents: [...activation.agents] });
    }
  }

  return { expanded: [...merged.values()], warnings };
}

async function buildProjections(options: {
  homeDir: string;
  scope: Scope;
  activations: ActivationBase[];
  locationBaseDir: string;
}): Promise<{
  projections: ProjectionSpec[];
  warnings: string[];
}> {
  const { homeDir, scope, activations, locationBaseDir } = options;
  const warnings: string[] = [];
  const { expanded, warnings: expansionWarnings } = await expandActivationsToSkills(homeDir, activations);
  warnings.push(...expansionWarnings);

  const projections: ProjectionSpec[] = [];
  for (const activation of expanded) {
    const sourcePath = getSkillPath(homeDir, activation.name);
    if (!(await pathExists(sourcePath))) {
      warnings.push(`Missing skill: ${activation.name}`);
      continue;
    }

    for (const agentId of activation.agents) {
      const locationDir = resolveAgentSkillsDir(agentId, scope, locationBaseDir);
      projections.push({
        agentId,
        skillName: activation.name,
        sourcePath,
        targetPath: path.join(locationDir, activation.name),
        scope,
        projectDir: scope === "project" ? locationBaseDir : undefined,
        mode: getProjectionMode(agentId),
        locationDir,
      });
    }
  }

  return {
    projections: projections.sort((left, right) => left.targetPath.localeCompare(right.targetPath)),
    warnings: uniqueSorted(warnings),
  };
}

export async function computeGlobalStatus(homeDir: string): Promise<StatusSnapshot> {
  const config = await readGlobalConfig(homeDir);
  const status = await buildProjections({
    homeDir,
    scope: "global",
    activations: config.activations,
    locationBaseDir: homeDir,
  });

  return {
    scope: "global",
    projections: status.projections,
    warnings: status.warnings,
  };
}

export async function computeProjectStatus(homeDir: string, projectDir: string): Promise<StatusSnapshot> {
  const globalConfig = await readGlobalConfig(homeDir);
  const projectConfig = await readProjectConfig(projectDir);
  const matchedActivations = getMatchingProjectRules(globalConfig, projectDir).flatMap((rule) => rule.activations);
  const status = await buildProjections({
    homeDir,
    scope: "project",
    activations: [...matchedActivations, ...projectConfig.activations],
    locationBaseDir: projectDir,
  });

  return {
    scope: "project",
    projectDir,
    projections: status.projections,
    warnings: status.warnings,
  };
}

async function applyStatus(status: StatusSnapshot, homeDir: string): Promise<ReconcileResult> {
  const paths = getAweskillPaths(homeDir);
  const changes: ReconcileResult["changes"] = [];

  const byLocation = new Map<string, ProjectionSpec[]>();
  for (const projection of status.projections) {
    const list = byLocation.get(projection.locationDir) ?? [];
    list.push(projection);
    byLocation.set(projection.locationDir, list);
  }

  const knownLocations = new Set<string>();
  for (const agent of listSupportedAgents()) {
    const baseDir = status.scope === "global" ? homeDir : status.projectDir;
    if (!baseDir) {
      continue;
    }
    knownLocations.add(resolveAgentSkillsDir(agent.id, status.scope, baseDir));
  }

  for (const locationDir of byLocation.keys()) {
    knownLocations.add(locationDir);
  }

  for (const locationDir of knownLocations) {
    const projections = byLocation.get(locationDir) ?? [];
    const managed = await listManagedSkillNames(locationDir, paths.skillsDir);
    const expectedNames = new Set(projections.map((projection) => projection.skillName));

    for (const [skillName] of managed) {
      if (expectedNames.has(skillName)) {
        continue;
      }

      const removed = await removeManagedProjection(path.join(locationDir, skillName));
      if (removed) {
        changes.push({
          action: "remove",
          path: path.join(locationDir, skillName),
          detail: "removed stale projection",
        });
      }
    }

    for (const projection of projections) {
      const allowReplaceExisting = await canTakeOverDiscoveredSkill({
        homeDir,
        agentId: projection.agentId,
        scope: projection.scope,
        projectDir: projection.projectDir,
        skillName: projection.skillName,
        targetPath: projection.targetPath,
      });

      if (projection.mode === "symlink") {
        const result = await createSkillSymlink(projection.sourcePath, projection.targetPath, { allowReplaceExisting });
        changes.push({
          action: result === "created" ? "create" : "skip",
          path: projection.targetPath,
          detail: result === "created" ? "created symlink" : "symlink already correct",
        });
        continue;
      }

      const result = await createSkillCopy(projection.sourcePath, projection.targetPath, { allowReplaceExisting });
      changes.push({
        action: result === "created" ? "create" : "skip",
        path: projection.targetPath,
        detail: result === "created" ? "created copy" : "copy already correct",
      });
    }
  }

  await updateRegistryForStatus(homeDir, status);
  return { changes, warnings: status.warnings };
}

export async function reconcileGlobal(homeDir: string): Promise<ReconcileResult> {
  const status = await computeGlobalStatus(homeDir);
  return applyStatus(status, homeDir);
}

export async function reconcileProject(homeDir: string, projectDir: string): Promise<ReconcileResult> {
  const status = await computeProjectStatus(homeDir, projectDir);
  return applyStatus(status, homeDir);
}

export async function syncWorkspace(options: {
  homeDir: string;
  cwd: string;
  projectDir?: string;
}): Promise<ReconcileResult[]> {
  const results: ReconcileResult[] = [];
  results.push(await reconcileGlobal(options.homeDir));

  const globalConfig = await readGlobalConfig(options.homeDir);
  const candidateProjects = new Set<string>();
  if (options.projectDir) {
    candidateProjects.add(options.projectDir);
  }
  if (await pathExists(getProjectConfigPath(options.cwd))) {
    candidateProjects.add(options.cwd);
  }
  for (const projectRule of globalConfig.projects) {
    if (projectRule.match === "exact") {
      candidateProjects.add(projectRule.path);
    }
  }
  for (const projectDir of await collectKnownProjectDirs(options.homeDir)) {
    candidateProjects.add(projectDir);
  }

  for (const projectDir of candidateProjects) {
    if (!(await pathExists(projectDir))) {
      results.push({
        changes: [],
        warnings: [`Skipped missing project during sync: ${projectDir}`],
      });
      continue;
    }
    results.push(await reconcileProject(options.homeDir, projectDir));
  }

  return results;
}

export async function listKnownBundles(homeDir: string): Promise<string[]> {
  const bundles = await listBundles(homeDir);
  return bundles.map((bundle) => bundle.name);
}
