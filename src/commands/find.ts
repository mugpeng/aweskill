import type { RuntimeContext } from "../types.js";
import { parseDownloadSource } from "../lib/source-parser.js";

const SKILLS_SH_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";
const SCISKILL_API_BASE = process.env.SCISKILL_API_URL || "https://sciskillhub.org";

type FindProvider = "skills-sh" | "sciskill";

interface SkillsShResult {
  id: string;
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
  downloadSource: string;
  installs?: number;
  description?: string;
  similarityScore?: number;
  downloadable: boolean;
}

export interface FindOptions {
  provider?: FindProvider;
  limit?: number;
  domain?: string;
  stage?: string;
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

function pickDownloadSource(candidates: Array<string | undefined>): { source: string; downloadable: boolean } {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) {
      continue;
    }
    try {
      parseDownloadSource(value);
      return { source: value, downloadable: true };
    } catch {
      continue;
    }
  }

  return { source: "unsupported by aweskill download", downloadable: false };
}

async function searchSkillsSh(query: string, limit: number): Promise<FindResult[]> {
  const url = `${SKILLS_SH_API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`skills.sh search failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as { skills?: SkillsShResult[] };
  return (payload.skills ?? [])
    .map((result) => {
      const resolved = pickDownloadSource([result.source, result.id]);
      return {
        name: result.name,
        provider: "skills-sh" as const,
        downloadSource: resolved.source,
        downloadable: resolved.downloadable,
        installs: result.installs ?? 0,
        description: result.description,
      };
    })
    .sort((left, right) => (right.installs ?? 0) - (left.installs ?? 0));
}

async function searchSciskill(query: string, options: FindOptions): Promise<FindResult[]> {
  const response = await fetch(`${SCISKILL_API_BASE}/api/v1/skills/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit: options.limit ?? 10,
      ...(options.domain ? { domain: options.domain } : {}),
      ...(options.stage ? { stage: options.stage } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`sciskill search failed: HTTP ${response.status}`);
  }

  const payload = await response.json() as { results?: SciskillResult[] };
  return (payload.results ?? [])
    .map((result) => ({
      name: result.name,
      provider: "sciskill" as const,
      downloadSource: `sciskill:${result.id}`,
      downloadable: true,
      description: result.description ?? undefined,
      similarityScore: result.similarity_score ?? 0,
    }))
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
  const sourceLine = result.downloadable
    ? `   source: ${result.downloadSource}`
    : `   source: ${result.downloadSource}`;
  return [
    `${index + 1}. ${result.name}`,
    `   ${formatMetaLine(result)}`,
    `   ${result.description || "(no description)"}`,
    sourceLine,
  ].join("\n");
}

export async function runFind(context: RuntimeContext, query: string, options: FindOptions = {}) {
  const limit = Number(options.limit ?? 10);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Limit must be a positive integer.");
  }

  const requestedProviders: FindProvider[] = options.provider ? [options.provider] : ["skills-sh", "sciskill"];
  const resultsByProvider = new Map<FindProvider, FindResult[]>();
  const errors: string[] = [];

  for (const provider of requestedProviders) {
    try {
      const results = provider === "skills-sh"
        ? await searchSkillsSh(query, limit)
        : await searchSciskill(query, { ...options, limit });
      resultsByProvider.set(provider, results);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
    }
  }

  if (errors.length === requestedProviders.length) {
    throw new Error(errors.join("\n"));
  }

  if (options.provider === "skills-sh" && (options.domain || options.stage)) {
    context.write("Warning: --domain and --stage only apply to sciskill.");
  }

  for (const error of errors) {
    context.write(`Warning: ${error}`);
  }

  const merged = dedupeFindResults([
    ...(resultsByProvider.get("skills-sh") ?? []),
    ...(resultsByProvider.get("sciskill") ?? []),
  ]).slice(0, limit);

  if (merged.length === 0) {
    context.write(`No skills found for "${query}".`);
    return { results: [] };
  }

  context.write(`Found ${merged.length} skill${merged.length === 1 ? "" : "s"}`);
  context.write(`${merged.map((result, index) => formatFindResult(result, index)).join("\n\n")}\n\nRun: aweskill store download <source>`);
  return { results: merged };
}
