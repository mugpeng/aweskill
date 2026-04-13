import { rm } from "node:fs/promises";

import { scanStoreHygiene } from "../lib/hygiene.js";
import { getAweskillPaths } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

export async function runClean(
  context: RuntimeContext,
  options: { apply?: boolean; skillsOnly?: boolean; bundlesOnly?: boolean } = {},
) {
  const { rootDir, skillsDir, bundlesDir } = getAweskillPaths(context.homeDir);
  const includeSkills = !options.bundlesOnly;
  const includeBundles = !options.skillsOnly;
  const { findings } = await scanStoreHygiene({ rootDir, skillsDir, bundlesDir, includeSkills, includeBundles });

  if (findings.length === 0) {
    context.write("No suspicious store entries found.");
    return { findings, removed: [] as string[] };
  }

  const lines = ["Suspicious store entries:"];
  for (const finding of findings) {
    lines.push(`  - ${finding.relativePath}`);
  }

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
