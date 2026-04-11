import { mkdir, readFile, writeFile } from "node:fs/promises";

import { parse, stringify } from "yaml";

import type {
  ActivationBase,
  AgentId,
  GlobalActivation,
  GlobalConfig,
  ProjectActivation,
  ProjectConfig,
  ProjectRule,
} from "../types.js";
import { getAweskillPaths, getProjectConfigPath, sanitizeName, uniqueSorted } from "./path.js";

export function emptyGlobalConfig(): GlobalConfig {
  return {
    version: 1,
    activations: [],
    projects: [],
  };
}

export function emptyProjectConfig(): ProjectConfig {
  return {
    version: 1,
    activations: [],
  };
}

function normalizeAgents(rawAgents: unknown): AgentId[] {
  return uniqueSorted((Array.isArray(rawAgents) ? rawAgents : []).map((agent) => String(agent) as AgentId));
}

function normalizeProjectActivation(raw: unknown): ProjectActivation {
  const data = (raw ?? {}) as Partial<ProjectActivation>;
  return {
    type: data.type === "bundle" ? "bundle" : "skill",
    name: sanitizeName(String(data.name ?? "")),
    agents: normalizeAgents(data.agents),
  };
}

function normalizeGlobalActivation(raw: unknown): GlobalActivation {
  const data = (raw ?? {}) as Partial<GlobalActivation>;
  return {
    type: data.type === "bundle" ? "bundle" : "skill",
    name: sanitizeName(String(data.name ?? "")),
    agents: normalizeAgents(data.agents),
    scope: "global",
  };
}

function normalizeProjectRule(raw: unknown): ProjectRule {
  const data = (raw ?? {}) as Partial<ProjectRule>;
  const match = data.match === "exact" || data.match === "prefix" || data.match === "glob" ? data.match : "exact";
  return {
    path: String(data.path ?? ""),
    match,
    activations: (data.activations ?? []).map((activation) => normalizeProjectActivation(activation)).filter((activation) => activation.name),
  };
}

export async function readGlobalConfig(homeDir: string): Promise<GlobalConfig> {
  const filePath = getAweskillPaths(homeDir).globalConfigPath;

  try {
    const content = await readFile(filePath, "utf8");
    const raw = (parse(content) ?? {}) as Partial<GlobalConfig>;
    return {
      version: 1,
      activations: (raw.activations ?? []).map((activation) => normalizeGlobalActivation(activation)).filter((activation) => activation.name),
      projects: (raw.projects ?? []).map((rule) => normalizeProjectRule(rule)).filter((rule) => rule.path),
    };
  } catch {
    return emptyGlobalConfig();
  }
}

export async function writeGlobalConfig(homeDir: string, config: GlobalConfig): Promise<void> {
  const filePath = getAweskillPaths(homeDir).globalConfigPath;
  await mkdir(getAweskillPaths(homeDir).rootDir, { recursive: true });
  await writeFile(filePath, stringify(config), "utf8");
}

export async function readProjectConfig(projectDir: string): Promise<ProjectConfig> {
  const filePath = getProjectConfigPath(projectDir);

  try {
    const content = await readFile(filePath, "utf8");
    const raw = (parse(content) ?? {}) as Partial<ProjectConfig>;
    return {
      version: 1,
      activations: (raw.activations ?? []).map((activation) => normalizeProjectActivation(activation)).filter((activation) => activation.name),
    };
  } catch {
    return emptyProjectConfig();
  }
}

export async function writeProjectConfig(projectDir: string, config: ProjectConfig): Promise<void> {
  const filePath = getProjectConfigPath(projectDir);
  await mkdir(projectDir, { recursive: true });
  await writeFile(filePath, stringify(config), "utf8");
}

function mergeActivation(activations: ActivationBase[], nextActivation: ActivationBase): ActivationBase[] {
  const normalizedName = sanitizeName(nextActivation.name);
  const existing = activations.find(
    (activation) => activation.type === nextActivation.type && activation.name === normalizedName,
  );

  if (existing) {
    existing.agents = uniqueSorted([...existing.agents, ...nextActivation.agents]);
    return activations;
  }

  activations.push({
    type: nextActivation.type,
    name: normalizedName,
    agents: uniqueSorted(nextActivation.agents),
  });
  return activations;
}

function subtractActivation(activations: ActivationBase[], targetActivation: ActivationBase): ActivationBase[] {
  const normalizedName = sanitizeName(targetActivation.name);
  const next = activations
    .map((activation) => ({ ...activation, agents: [...activation.agents] }))
    .filter((activation) => activation.name);

  for (const activation of next) {
    if (activation.type !== targetActivation.type || activation.name !== normalizedName) {
      continue;
    }

    activation.agents = activation.agents.filter((agent) => !targetActivation.agents.includes(agent));
  }

  return next.filter((activation) => activation.agents.length > 0);
}

export async function enableGlobalActivation(
  homeDir: string,
  activation: Omit<GlobalActivation, "scope">,
): Promise<GlobalConfig> {
  const config = await readGlobalConfig(homeDir);
  const activations = config.activations.map((item) => ({ ...item }));
  mergeActivation(activations, activation);
  config.activations = activations.map((item) => ({ ...item, scope: "global" }));
  await writeGlobalConfig(homeDir, config);
  return config;
}

export async function disableGlobalActivation(
  homeDir: string,
  activation: Omit<GlobalActivation, "scope">,
): Promise<GlobalConfig> {
  const config = await readGlobalConfig(homeDir);
  config.activations = subtractActivation(config.activations, activation).map((item) => ({ ...item, scope: "global" }));
  await writeGlobalConfig(homeDir, config);
  return config;
}

export async function enableProjectActivation(projectDir: string, activation: ProjectActivation): Promise<ProjectConfig> {
  const config = await readProjectConfig(projectDir);
  const activations = config.activations.map((item) => ({ ...item }));
  mergeActivation(activations, activation);
  config.activations = activations;
  await writeProjectConfig(projectDir, config);
  return config;
}

export async function disableProjectActivation(projectDir: string, activation: ProjectActivation): Promise<ProjectConfig> {
  const config = await readProjectConfig(projectDir);
  config.activations = subtractActivation(config.activations, activation);
  await writeProjectConfig(projectDir, config);
  return config;
}

export async function ensureGlobalConfig(homeDir: string): Promise<void> {
  const config = await readGlobalConfig(homeDir);
  await writeGlobalConfig(homeDir, config);
}
