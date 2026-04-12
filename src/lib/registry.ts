import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AgentId,
  ProjectionSpec,
  RegistryData,
  RegistrySkillEntry,
  ScanCandidate,
  Scope,
  StatusSnapshot,
} from "../types.js";
import { listSupportedAgentIds, resolveAgentSkillsDir } from "./agents.js";
import { getAweskillPaths } from "./path.js";

function getRegistryPath(homeDir: string, agentId: AgentId): string {
  return path.join(getAweskillPaths(homeDir).registryDir, `${agentId}.json`);
}

function buildKey(entry: Pick<RegistrySkillEntry, "name" | "scope" | "projectDir">): string {
  return [entry.scope, entry.projectDir ?? "", entry.name].join("\u0000");
}

function compareEntries(left: RegistrySkillEntry, right: RegistrySkillEntry): number {
  return buildKey(left).localeCompare(buildKey(right));
}

function normalizeScope(value: unknown): Scope | null {
  return value === "global" || value === "project" ? value : null;
}

function normalizeRegistrySkillEntryV2(raw: unknown): RegistrySkillEntry | null {
  const data = (raw ?? {}) as Partial<RegistrySkillEntry>;
  const scope = normalizeScope(data.scope);
  if (!data.name || !scope || !data.sourcePath) {
    return null;
  }

  return {
    name: String(data.name),
    scope,
    projectDir: scope === "project" ? String(data.projectDir ?? "") || undefined : undefined,
    sourcePath: String(data.sourcePath),
    managedByAweskill: Boolean(data.managedByAweskill),
  };
}

function normalizeRegistrySkillEntryV1(raw: unknown): RegistrySkillEntry | null {
  const data = (raw ?? {}) as Partial<{
    name: string;
    scope: Scope;
    projectDir?: string;
    sourcePath?: string;
    source?: string;
  }>;
  const scope = normalizeScope(data.scope);
  const sourcePath = String(data.sourcePath ?? data.source ?? "");
  if (!data.name || !scope || !sourcePath) {
    return null;
  }

  return {
    name: String(data.name),
    scope,
    projectDir: scope === "project" ? String(data.projectDir ?? "") || undefined : undefined,
    sourcePath,
    managedByAweskill: true,
  };
}

function normalizeRegistryData(agentId: AgentId, raw: unknown): RegistryData | null {
  const data = raw as Partial<RegistryData> & {
    managedBy?: string;
    updatedAt?: string;
    managedSkills?: unknown[];
    skills?: unknown[];
  };

  if (data.version === 2 && data.agentId === agentId && Array.isArray(data.skills)) {
    return {
      version: 2,
      agentId,
      lastSynced: String(data.lastSynced ?? ""),
      skills: data.skills.map(normalizeRegistrySkillEntryV2).filter((entry): entry is RegistrySkillEntry => entry !== null).sort(compareEntries),
    };
  }

  const legacyEntries = Array.isArray(data.managedSkills)
    ? data.managedSkills.map(normalizeRegistrySkillEntryV1).filter((entry): entry is RegistrySkillEntry => entry !== null)
    : Array.isArray(data.skills) && data.managedBy === "aweskill"
      ? data.skills.map(normalizeRegistrySkillEntryV1).filter((entry): entry is RegistrySkillEntry => entry !== null)
      : [];

  if (legacyEntries.length > 0) {
    return {
      version: 2,
      agentId,
      lastSynced: String(data.lastSynced ?? data.updatedAt ?? ""),
      skills: legacyEntries.sort(compareEntries),
    };
  }

  return null;
}

function mergeEntries(existing: RegistrySkillEntry[], incoming: RegistrySkillEntry[]): RegistrySkillEntry[] {
  const merged = new Map<string, RegistrySkillEntry>();

  for (const entry of existing) {
    merged.set(buildKey(entry), entry);
  }

  for (const entry of incoming) {
    const key = buildKey(entry);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, entry);
      continue;
    }

    if (current.managedByAweskill && !entry.managedByAweskill) {
      continue;
    }

    merged.set(key, entry);
  }

  return [...merged.values()].sort(compareEntries);
}

function projectionToManagedEntry(projection: ProjectionSpec): RegistrySkillEntry {
  return {
    name: projection.skillName,
    scope: projection.scope,
    projectDir: projection.projectDir,
    sourcePath: projection.sourcePath,
    managedByAweskill: true,
  };
}

function scanCandidateToDiscoveredEntry(candidate: ScanCandidate): RegistrySkillEntry {
  return {
    name: candidate.name,
    scope: candidate.scope,
    projectDir: candidate.projectDir,
    sourcePath: candidate.path,
    managedByAweskill: false,
  };
}

function isEntryCoveredByStatus(entry: RegistrySkillEntry, status: StatusSnapshot): boolean {
  if (entry.scope !== status.scope) {
    return false;
  }

  if (status.scope === "global") {
    return true;
  }

  return entry.projectDir === status.projectDir;
}

function isEntryCoveredByScan(entry: RegistrySkillEntry, candidate: ScanCandidate): boolean {
  return entry.scope === candidate.scope
    && entry.projectDir === candidate.projectDir
    && entry.name === candidate.name;
}

async function writeRegistry(homeDir: string, data: RegistryData): Promise<void> {
  const registryPath = getRegistryPath(homeDir, data.agentId);
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify(data, null, 2), "utf8");
}

export async function readRegistry(homeDir: string, agentId: AgentId): Promise<RegistryData | null> {
  try {
    const content = await readFile(getRegistryPath(homeDir, agentId), "utf8");
    return normalizeRegistryData(agentId, JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listRegistries(homeDir: string): Promise<RegistryData[]> {
  const registries = await Promise.all(listSupportedAgentIds().map((agentId) => readRegistry(homeDir, agentId)));
  return registries.filter((registry): registry is RegistryData => registry !== null);
}

export async function updateRegistryForStatus(homeDir: string, status: StatusSnapshot): Promise<void> {
  const byAgent = new Map<AgentId, ProjectionSpec[]>();
  for (const projection of status.projections) {
    const list = byAgent.get(projection.agentId) ?? [];
    list.push(projection);
    byAgent.set(projection.agentId, list);
  }

  for (const agentId of listSupportedAgentIds()) {
    const existing = await readRegistry(homeDir, agentId);
    const nextEntries = (byAgent.get(agentId) ?? []).map(projectionToManagedEntry);
    const nextKeys = new Set(nextEntries.map((entry) => buildKey(entry)));
    const preserved = (existing?.skills ?? []).filter((entry) => {
      if (!isEntryCoveredByStatus(entry, status)) {
        return true;
      }

      if (!entry.managedByAweskill && !nextKeys.has(buildKey(entry))) {
        return true;
      }

      return false;
    });

    await writeRegistry(homeDir, {
      version: 2,
      agentId,
      lastSynced: new Date().toISOString(),
      skills: mergeEntries(preserved, nextEntries),
    });
  }
}

export async function updateRegistryFromScan(homeDir: string, candidates: ScanCandidate[]): Promise<void> {
  const byAgent = new Map<AgentId, ScanCandidate[]>();
  for (const candidate of candidates) {
    const list = byAgent.get(candidate.agentId) ?? [];
    list.push(candidate);
    byAgent.set(candidate.agentId, list);
  }

  for (const agentId of listSupportedAgentIds()) {
    const existing = await readRegistry(homeDir, agentId);
    const scanned = byAgent.get(agentId) ?? [];
    const nextEntries = scanned.map(scanCandidateToDiscoveredEntry);
    const preserved = (existing?.skills ?? []).filter((entry) => {
      if (entry.managedByAweskill) {
        return true;
      }

      return !scanned.some((candidate) => isEntryCoveredByScan(entry, candidate));
    });

    await writeRegistry(homeDir, {
      version: 2,
      agentId,
      lastSynced: new Date().toISOString(),
      skills: mergeEntries(preserved, nextEntries),
    });
  }
}

export function filterRegistrySkills(
  registry: RegistryData,
  options: {
    scope?: Scope;
    projectDir?: string;
    managedByAweskill?: boolean;
  } = {},
): RegistrySkillEntry[] {
  return registry.skills.filter((entry) => {
    if (options.scope && entry.scope !== options.scope) {
      return false;
    }

    if (options.managedByAweskill !== undefined && entry.managedByAweskill !== options.managedByAweskill) {
      return false;
    }

    if (options.projectDir === undefined) {
      return true;
    }

    if (entry.scope === "global") {
      return true;
    }

    return entry.projectDir === options.projectDir;
  });
}

export async function collectKnownProjectDirs(homeDir: string): Promise<string[]> {
  const projectDirs = new Set<string>();

  for (const registry of await listRegistries(homeDir)) {
    for (const entry of registry.skills) {
      if (entry.scope === "project" && entry.projectDir) {
        projectDirs.add(entry.projectDir);
      }
    }
  }

  return [...projectDirs].sort();
}

export async function canTakeOverDiscoveredSkill(options: {
  homeDir: string;
  agentId: AgentId;
  scope: Scope;
  projectDir?: string;
  skillName: string;
  targetPath: string;
}): Promise<boolean> {
  const registry = await readRegistry(options.homeDir, options.agentId);
  if (!registry) {
    return false;
  }

  const match = registry.skills.find((entry) =>
    entry.name === options.skillName
    && entry.scope === options.scope
    && entry.projectDir === options.projectDir
    && entry.sourcePath === options.targetPath
    && entry.managedByAweskill === false,
  );

  return Boolean(match);
}

export function deriveTargetPath(options: {
  homeDir: string;
  agentId: AgentId;
  scope: Scope;
  projectDir?: string;
  skillName: string;
}): string {
  const baseDir = options.scope === "global" ? options.homeDir : options.projectDir;
  if (!baseDir) {
    throw new Error(`Missing project dir for project-scoped registry entry: ${options.skillName}`);
  }
  return path.join(resolveAgentSkillsDir(options.agentId, options.scope, baseDir), options.skillName);
}
