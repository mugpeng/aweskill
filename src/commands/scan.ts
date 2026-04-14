import { importScannedSkills } from "../lib/import.js";
import { scanSkills } from "../lib/scanner.js";
import type { RuntimeContext, ScanCandidate, Scope } from "../types.js";

function groupLabel(candidate: ScanCandidate): string {
  return candidate.scope === "global"
    ? `Global scanned skills for ${candidate.agentId}:`
    : `Project scanned skills for ${candidate.agentId} (${candidate.projectDir}):`;
}

export function formatScanSummary(candidates: ScanCandidate[], verbose = false): string {
  if (candidates.length === 0) {
    return "(no scanned skills)";
  }

  const groups = new Map<string, ScanCandidate[]>();
  for (const candidate of candidates) {
    const key = `${candidate.scope}:${candidate.agentId}:${candidate.projectDir ?? ""}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(candidate);
    groups.set(key, bucket);
  }

  const lines = ["Scanned skills:"];
  for (const [, groupedCandidates] of [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const sorted = [...groupedCandidates].sort((left, right) => left.name.localeCompare(right.name));
    lines.push(`  ${groupLabel(sorted[0])} ${sorted.length}`);
    if (verbose) {
      for (const candidate of sorted) {
        lines.push(`    ✓ ${candidate.name} ${candidate.path}`);
      }
    }
  }

  return lines.join("\n");
}

export async function runScan(
  context: RuntimeContext,
  options: {
    import?: boolean;
    override?: boolean;
    verbose?: boolean;
    keepSource?: boolean;
    linkSource?: boolean;
    scope: Scope;
    agents?: string[];
    projectDir?: string;
  },
) {
  if (options.keepSource && options.linkSource) {
    throw new Error("Choose either --keep-source or --link-source, not both.");
  }

  const candidates = await scanSkills({
    homeDir: context.homeDir,
    scope: options.scope,
    agents: options.agents,
    projectDir: options.scope === "project" ? (options.projectDir ?? context.cwd) : undefined,
  });

  context.write(formatScanSummary(candidates, options.verbose));

  if (options.import) {
    const linkSource = !options.keepSource;
    const result = await importScannedSkills({
      homeDir: context.homeDir,
      candidates,
      override: options.override,
      linkSource,
    });
    for (const warning of result.warnings) {
      context.write(`Warning: ${warning}`);
    }
    for (const error of result.errors) {
      context.error(`Error: ${error}`);
    }
    context.write(`Imported ${result.imported.length} skills`);
    if (result.overwritten.length > 0) {
      context.write(`Overwritten ${result.overwritten.length} existing skills: ${result.overwritten.join(", ")}`);
    }
    if (result.skipped.length > 0) {
      context.write(`Skipped ${result.skipped.length} existing skills (use --override to overwrite): ${result.skipped.join(", ")}`);
    }
    if (result.missingSources > 0) {
      context.write(`Missing source files: ${result.missingSources}`);
    }
    if (linkSource) {
      context.write(`Replaced ${result.linkedSources.length} scanned source paths with aweskill-managed projections.`);
    } else {
      context.write("Source paths were kept in place. Re-run without --keep-source to replace scanned agent skills with aweskill-managed projections.");
    }
    return { candidates, ...result };
  }
  return candidates;
}
