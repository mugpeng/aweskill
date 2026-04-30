import { readFile } from "node:fs/promises";
import path from "node:path";

import type { RuntimeContext } from "../types.js";
import { sanitizeName } from "../lib/path.js";
import { parseDownloadSource } from "../lib/source-parser.js";
import { getSkillDescription } from "../lib/skill-doc.js";
import { listSkills } from "../lib/skills.js";

const SKILLS_SH_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";
const SCISKILL_API_BASE = process.env.SCISKILL_API_URL || "https://sciskillhub.org";
const SCISKILL_DOMAINS = [
  "Agricultural Sciences",
  "Chemical Sciences",
  "Computational Sciences",
  "General Research",
  "Life Sciences",
  "Mathematical and Statistical Sciences",
  "Medical and Health Sciences",
  "Physical Sciences",
] as const;
const SCISKILL_STAGES = [
  "Study Design",
  "Data / Sample Acquisition",
  "Data Processing",
  "Data Analysis and Modeling",
  "Validation and Interpretation",
  "Visualization and Presentation",
  "Writing and Publication",
] as const;

type FindProvider = "skills-sh" | "sciskill" | "local";

interface SkillsShResult {
  id: string;
  skillId?: string;
  name: string;
  installs?: number;
  source?: string;
  description?: string;
}

interface SciskillResult {
  id: string;
  name: string;
  description?: string | null;
  similarity_score?: number | null;
}

interface FindResult {
  name: string;
  provider: FindProvider;
  downloadSource?: string;
  installCommand?: string;
  installs?: number;
  description?: string;
  similarityScore?: number;
  localScore?: number;
  downloadable: boolean;
  detailUrl?: string;
  localPath?: string;
  readCommand?: string;
}

export interface FindOptions {
  provider?: FindProvider;
  limit?: number;
  domain?: string;
  stage?: string;
  timeoutMs?: number;
}

function formatAllowedValues(values: readonly string[]): string {
  return values.map((value) => `"${value}"`).join(", ");
}

function validateFindOptions(options: FindOptions): void {
  if (options.provider === "skills-sh" && (options.domain || options.stage)) {
    throw new Error("--domain and --stage are only supported with the sciskill provider.");
  }

  if (options.domain && !SCISKILL_DOMAINS.includes(options.domain as typeof SCISKILL_DOMAINS[number])) {
    throw new Error(`Invalid --domain value: "${options.domain}". Allowed values: ${formatAllowedValues(SCISKILL_DOMAINS)}.`);
  }

  if (options.stage && !SCISKILL_STAGES.includes(options.stage as typeof SCISKILL_STAGES[number])) {
    throw new Error(`Invalid --stage value: "${options.stage}". Allowed values: ${formatAllowedValues(SCISKILL_STAGES)}.`);
  }
}

function getFindTimeoutMs(options: FindOptions): number {
  const timeoutMs = Number(options.timeoutMs ?? process.env.AWESKILL_FIND_TIMEOUT_MS ?? 5_000);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5_000;
}

function formatProviderName(provider: FindProvider): string {
  if (provider === "local") {
    return provider;
  }
  return provider === "skills-sh" ? "skills.sh" : provider;
}

async function fetchWithTimeout(provider: FindProvider, input: string | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`${formatProviderName(provider)} search timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function formatInstalls(count?: number): string {
  if (!count || count <= 0) {
    return "--";
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M installs`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K installs`;
  }
  return `${count} install${count === 1 ? "" : "s"}`;
}

function formatMetaLine(result: FindResult): string {
  const parts = [result.provider];
  if (result.installs && result.installs > 0) {
    parts.push(formatInstalls(result.installs));
  }
  return parts.join(" · ");
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function toSkillsShDetailUrl(result: Pick<SkillsShResult, "id" | "skillId" | "source">): string | undefined {
  const id = result.id?.trim();
  if (id && /^[^/\s]+\/[^/\s]+\/[^/\s]+$/.test(id)) {
    return `https://skills.sh/${id}`;
  }

  const source = result.source?.trim();
  const skillId = result.skillId?.trim();
  if (source === "smithery.ai" && skillId) {
    return `https://skills.sh/smithery/ai/${skillId}`;
  }

  if (!id) {
    return undefined;
  }
  const smitheryIdMatch = id.match(/^smithery\.ai\/([^/\s]+)$/);
  if (smitheryIdMatch?.[1]) {
    return `https://skills.sh/smithery/ai/${smitheryIdMatch[1]}`;
  }

  return undefined;
}

function pickDownloadSource(source?: string): { source: string; downloadable: boolean } {
  const value = source?.trim();
  if (!value) {
    return { source: "unsupported by aweskill install", downloadable: false };
  }
  try {
    parseDownloadSource(value);
    return { source: value, downloadable: true };
  } catch {
    return { source: value, downloadable: false };
  }
}

function buildInstallCommand(result: { provider: FindProvider; name: string; downloadSource: string; downloadable: boolean }): string | undefined {
  if (!result.downloadable) {
    return undefined;
  }
  if (result.provider === "skills-sh") {
    return `aweskill store install ${result.downloadSource} --skill ${sanitizeName(result.name)}`;
  }
  return `aweskill store install ${result.downloadSource}`;
}

function scoreLocalSkill(query: string, skill: { name: string; description?: string; body: string }): number {
  const normalizedQuery = query.trim().toLowerCase();
  const name = skill.name.toLowerCase();
  const description = (skill.description ?? "").toLowerCase();
  const body = skill.body.toLowerCase();

  let score = 0;
  if (name.includes(normalizedQuery)) {
    score += 100;
  }
  if (description.includes(normalizedQuery)) {
    score += 50;
  }
  if (body.includes(normalizedQuery)) {
    score += 10;
  }
  return score;
}

async function searchLocalStore(context: RuntimeContext, query: string): Promise<FindResult[]> {
  const skills = await listSkills(context.homeDir);
  const results: FindResult[] = [];

  for (const skill of skills.filter((entry) => entry.hasSKILLMd)) {
    const skillFile = path.join(skill.path, "SKILL.md");
    const content = await readFile(skillFile, "utf8");
    const description = getSkillDescription(content);
    const score = scoreLocalSkill(query, { name: skill.name, description, body: content });
    if (score <= 0) {
      continue;
    }

    results.push({
      name: skill.name,
      provider: "local",
      downloadable: false,
      description,
      localScore: score,
      localPath: skill.path,
      readCommand: `aweskill store show ${skill.name}`,
    });
  }

  return results.sort((left, right) => (right.localScore ?? 0) - (left.localScore ?? 0) || left.name.localeCompare(right.name));
}

async function searchSkillsSh(query: string, limit: number, timeoutMs: number): Promise<FindResult[]> {
  const url = `${SKILLS_SH_API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
  const response = await fetchWithTimeout("skills-sh", url, {}, timeoutMs);
  if (!response.ok) {
    throw new Error(`skills.sh search failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as { skills?: SkillsShResult[] };
  return (payload.skills ?? [])
    .map((result) => {
      const resolved = pickDownloadSource(result.source ?? result.id);
      const findResult = {
        name: result.name,
        provider: "skills-sh" as const,
        downloadSource: resolved.downloadable ? resolved.source : (result.source?.trim() || "unsupported by aweskill install"),
        downloadable: resolved.downloadable,
        installs: result.installs ?? 0,
        description: result.description,
        detailUrl: resolved.downloadable ? undefined : toSkillsShDetailUrl(result),
      };
      return {
        ...findResult,
        installCommand: buildInstallCommand(findResult),
      };
    })
    .sort((left, right) => (right.installs ?? 0) - (left.installs ?? 0));
}

async function searchSciskill(query: string, options: FindOptions): Promise<FindResult[]> {
  const response = await fetchWithTimeout("sciskill", `${SCISKILL_API_BASE}/api/v1/skills/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: options.limit ?? 10,
      ...(options.domain ? { domain: options.domain } : {}),
      ...(options.stage ? { stage: options.stage } : {}),
    }),
  }, getFindTimeoutMs(options));
  if (!response.ok) {
    throw new Error(`sciskill search failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as { results?: SciskillResult[] };
  return (payload.results ?? [])
    .map((result) => {
      const findResult = {
        name: result.name,
        provider: "sciskill" as const,
        downloadSource: `sciskill:${result.id}`,
        downloadable: true,
        description: result.description ?? undefined,
        similarityScore: result.similarity_score ?? 0,
      };
      return {
        ...findResult,
        installCommand: buildInstallCommand(findResult),
      };
    })
    .sort((left, right) => (right.similarityScore ?? 0) - (left.similarityScore ?? 0));
}

function dedupeFindResults(results: FindResult[]): FindResult[] {
  const seen = new Set<string>();
  const deduped: FindResult[] = [];
  for (const result of results) {
    const key = normalizeName(result.name);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(result);
  }
  return deduped;
}

function formatFindResult(result: FindResult, index: number): string {
  const lines = [
    `${index + 1}. ${result.name}`,
    `   ${formatMetaLine(result)}`,
    `   ${result.description || "(no description)"}`,
  ];
  if (result.provider === "local") {
    lines.push(`   path: ${result.localPath}`);
    if (result.readCommand) {
      lines.push(`   read: ${result.readCommand}`);
    }
    return lines.join("\n");
  }

  lines.push(`   source: ${result.downloadSource}`);
  if (result.installCommand) {
    lines.push(`   install: ${result.installCommand}`);
  }
  if (!result.downloadable) {
    lines.push("   aweskill store install does not support this source");
    if (result.detailUrl) {
      lines.push(`   visit skills.sh page: ${result.detailUrl}`);
    }
  }
  return lines.join("\n");
}

export async function runFind(context: RuntimeContext, query: string, options: FindOptions = {}) {
  const limit = Number(options.limit ?? 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Limit must be a positive integer.");
  }

  validateFindOptions(options);

  const requestedProviders: FindProvider[] = options.provider ? [options.provider] : ["skills-sh", "sciskill"];
  const resultsByProvider = new Map<FindProvider, FindResult[]>();
  const errors: string[] = [];
  const timeoutMs = getFindTimeoutMs(options);

  for (const provider of requestedProviders) {
    try {
      const results = provider === "skills-sh"
        ? await searchSkillsSh(query, limit, timeoutMs)
        : provider === "sciskill"
          ? await searchSciskill(query, { ...options, limit })
          : await searchLocalStore(context, query);
      resultsByProvider.set(provider, results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  if (errors.length === requestedProviders.length) {
    throw new Error(errors.join("\n"));
  }

  for (const error of errors) {
    context.write(`Warning: ${error}`);
  }

  const merged = dedupeFindResults([
    ...(resultsByProvider.get("skills-sh") ?? []),
    ...(resultsByProvider.get("sciskill") ?? []),
    ...(resultsByProvider.get("local") ?? []),
  ]);
  const visibleResults = options.provider ? merged.slice(0, limit) : merged;

  if (visibleResults.length === 0) {
    context.write(`No skills found for "${query}".`);
    return { results: [] };
  }

  context.write(`Found ${visibleResults.length} skill${visibleResults.length === 1 ? "" : "s"}`);
  context.write(visibleResults.map((result, index) => formatFindResult(result, index)).join("\n\n"));
  return { results: visibleResults };
}
