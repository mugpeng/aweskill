import { rm } from "node:fs/promises";

import { scanStoreHygiene } from "../lib/hygiene.js";
import { getAweskillPaths } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

function formatFindingGroups(
  relativePaths: string[],
  options: { verbose?: boolean; includeSkills: boolean; includeBundles: boolean },
): string[] {
  const groups = [
    options.includeSkills
      ? {
          label: "skills",
          entries: relativePaths.filter((entry) => entry.startsWith("skills/")),
        }
      : undefined,
    options.includeBundles
      ? {
          label: "bundles",
          entries: relativePaths.filter((entry) => entry.startsWith("bundles/")),
        }
      : undefined,
  ].filter((group): group is { label: string; entries: string[] } => Boolean(group));

  const lines: string[] = [];
  for (const group of groups) {
    if (group.entries.length === 0) {
      continue;
    }
    lines.push(`${group.label}: ${group.entries.length}`);
    const preview = options.verbose ? group.entries : group.entries.slice(0, DEFAULT_PREVIEW_COUNT);
    if (!options.verbose && group.entries.length > preview.length) {
      lines.push(`Showing first ${preview.length} suspicious entries in ${group.label} (use --verbose to show all)`);
    }
    for (const entry of preview) {
      lines.push(`  - ${entry}`);
    }
    if (!options.verbose && group.entries.length > preview.length) {
      lines.push(`... and ${group.entries.length - preview.length} more (use --verbose to show all)`);
    }
  }

  return lines;
}

export async function runClean(
  context: RuntimeContext,
  options: { apply?: boolean; skillsOnly?: boolean; bundlesOnly?: boolean; verbose?: boolean } = {},
) {
  const { rootDir, skillsDir, bundlesDir } = getAweskillPaths(context.homeDir);
  const includeSkills = !options.bundlesOnly;
  const includeBundles = !options.skillsOnly;
  const { findings } = await scanStoreHygiene({ rootDir, skillsDir, bundlesDir, includeSkills, includeBundles });

  if (findings.length === 0) {
    context.write("No suspicious store entries found.");
    return { findings, removed: [] as string[] };
  }

  const lines = [
    "Suspicious store entries:",
    ...formatFindingGroups(
      findings.map((finding) => finding.relativePath),
      { verbose: options.verbose, includeSkills, includeBundles },
    ),
  ];

  if (!options.apply) {
    lines.push("");
    lines.push("Dry run only. Use --apply to remove suspicious entries.");
    context.write(lines.join("\n"));
    return { findings, removed: [] as string[] };
  }

  const removed: string[] = [];
  for (const finding of findings) {
    await rm(finding.path, { recursive: true, force: true });
    removed.push(finding.relativePath);
  }

  lines.push("");
  lines.push(`Removed ${removed.length} suspicious store entries`);
  context.write(lines.join("\n"));
  return { findings, removed };
}
