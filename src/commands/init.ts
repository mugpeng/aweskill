import { scanSkills } from "../lib/scanner.js";
import { importPath } from "../lib/import.js";
import { getBuiltinSkillsDir } from "../lib/resources.js";
import { ensureHomeLayout } from "../lib/skills.js";
import { formatScanSummary } from "./scan.js";
import type { RuntimeContext } from "../types.js";

export async function runInit(context: RuntimeContext, options: { scan?: boolean; verbose?: boolean }) {
  await ensureHomeLayout(context.homeDir);
  const builtInSkillsDir = await getBuiltinSkillsDir();
  const builtInSkills = await importPath({
    homeDir: context.homeDir,
    sourcePath: builtInSkillsDir,
  });

  context.write(`Initialized ${context.homeDir}/.aweskill`);
  if (builtInSkills.kind === "batch") {
    if (builtInSkills.imported.length > 0) {
      context.write(`Installed built-in skills: ${builtInSkills.imported.join(", ")}`);
    }
    if (builtInSkills.skipped.length > 0) {
      context.write(`Built-in skills already installed: ${builtInSkills.skipped.join(", ")}`);
    }
  }

  if (options.scan) {
    const candidates = await scanSkills({ homeDir: context.homeDir, scope: "global" });
    context.write(formatScanSummary(candidates, options.verbose));
    return candidates;
  }

  return [];
}
