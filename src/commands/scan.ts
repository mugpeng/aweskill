import { importScannedSkills } from "../lib/import.js";
import { scanSkills } from "../lib/scanner.js";
import type { ImportMode, RuntimeContext, ScanCandidate } from "../types.js";

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
  options: { add?: boolean; mode?: ImportMode; override?: boolean; verbose?: boolean },
) {
  const candidates = await scanSkills({
    homeDir: context.homeDir,
    projectDirs: [context.cwd],
  });

  context.write(formatScanSummary(candidates, options.verbose));

  if (options.add) {
    const result = await importScannedSkills({
      homeDir: context.homeDir,
      candidates,
      mode: options.mode ?? "cp",
      override: options.override,
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
    return { candidates, ...result };
  }
  return candidates;
}
