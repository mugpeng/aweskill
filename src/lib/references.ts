import { rm } from "node:fs/promises";

import type { GlobalConfig, ProjectConfig } from "../types.js";
import { listBundles, writeBundle } from "./bundles.js";
import { readGlobalConfig, readProjectConfig, writeGlobalConfig, writeProjectConfig } from "./config.js";
import { sanitizeName } from "./path.js";
import { getSkillPath } from "./skills.js";

export interface SkillReferences {
  bundles: string[];
  globalActivations: string[];
  projectRuleActivations: string[];
  projectActivations: string[];
}

export async function findSkillReferences(options: {
  homeDir: string;
  skillName: string;
  projectDir?: string;
}): Promise<SkillReferences> {
  const normalizedSkill = sanitizeName(options.skillName);
  const bundles = (await listBundles(options.homeDir))
    .filter((bundle) => bundle.skills.includes(normalizedSkill))
    .map((bundle) => bundle.name);

  const globalConfig = await readGlobalConfig(options.homeDir);
  const globalActivations = globalConfig.activations
    .filter((activation) => activation.type === "skill" && activation.name === normalizedSkill)
    .map((activation) => `${activation.type}:${activation.name}`);

  const projectRuleActivations = globalConfig.projects.flatMap((rule) =>
    rule.activations
      .filter((activation) => activation.type === "skill" && activation.name === normalizedSkill)
      .map((activation) => `${rule.path}:${activation.type}:${activation.name}`),
  );

  const projectActivations =
    options.projectDir === undefined
      ? []
      : (await readProjectConfig(options.projectDir)).activations
          .filter((activation) => activation.type === "skill" && activation.name === normalizedSkill)
          .map((activation) => `${activation.type}:${activation.name}`);

  return {
    bundles,
    globalActivations,
    projectRuleActivations,
    projectActivations,
  };
}

function stripSkillFromConfig(config: GlobalConfig, skillName: string): GlobalConfig {
  return {
    ...config,
    activations: config.activations.filter((activation) => !(activation.type === "skill" && activation.name === skillName)),
    projects: config.projects.map((rule) => ({
      ...rule,
      activations: rule.activations.filter((activation) => !(activation.type === "skill" && activation.name === skillName)),
    })),
  };
}

function stripSkillFromProjectConfig(config: ProjectConfig, skillName: string): ProjectConfig {
  return {
    ...config,
    activations: config.activations.filter((activation) => !(activation.type === "skill" && activation.name === skillName)),
  };
}

export async function removeSkillWithReferences(options: {
  homeDir: string;
  skillName: string;
  projectDir?: string;
}): Promise<void> {
  const normalizedSkill = sanitizeName(options.skillName);
  const bundles = await listBundles(options.homeDir);
  for (const bundle of bundles) {
    if (!bundle.skills.includes(normalizedSkill)) {
      continue;
    }
    bundle.skills = bundle.skills.filter((skill) => skill !== normalizedSkill);
    await writeBundle(options.homeDir, bundle);
  }

  const globalConfig = await readGlobalConfig(options.homeDir);
  await writeGlobalConfig(options.homeDir, stripSkillFromConfig(globalConfig, normalizedSkill));

  if (options.projectDir) {
    const projectConfig = await readProjectConfig(options.projectDir);
    await writeProjectConfig(options.projectDir, stripSkillFromProjectConfig(projectConfig, normalizedSkill));
  }

  await rm(getSkillPath(options.homeDir, normalizedSkill), { force: true, recursive: true });
}
