import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { AgentId, ProjectionSpec, RegistryData } from "../types.js";
import { getAweskillPaths } from "./path.js";

export function getRegistryPath(homeDir: string, agentId: AgentId): string {
  const paths = getAweskillPaths(homeDir);
  return path.join(paths.registryDir, `${agentId}.json`);
}

export async function readRegistry(homeDir: string, agentId: AgentId): Promise<RegistryData | null> {
  const registryPath = getRegistryPath(homeDir, agentId);
  try {
    const content = await readFile(registryPath, "utf8");
    const data = JSON.parse(content) as RegistryData;
    if (data.managedBy === "aweskill") {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeRegistry(
  homeDir: string,
  agentId: AgentId,
  projections: ProjectionSpec[]
): Promise<void> {
  const registryPath = getRegistryPath(homeDir, agentId);
  const data: RegistryData = {
    managedBy: "aweskill",
    updatedAt: new Date().toISOString(),
    skills: projections.map(p => ({
      name: p.skillName,
      mode: p.mode,
      scope: p.scope,
      source: p.sourcePath
    }))
  };

  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify(data, null, 2), "utf8");
}
