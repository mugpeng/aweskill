import { scanSkills } from "../lib/scanner.js";
import { ensureHomeLayout } from "../lib/skills.js";
import { formatScanSummary } from "./scan.js";
import type { RuntimeContext } from "../types.js";

export async function runInit(context: RuntimeContext, options: { scan?: boolean; verbose?: boolean }) {
  await ensureHomeLayout(context.homeDir);
  context.write(`Initialized ${context.homeDir}/.aweskill`);

  if (options.scan) {
    const candidates = await scanSkills({ homeDir: context.homeDir, projectDirs: [context.cwd] });
    context.write(formatScanSummary(candidates, options.verbose));
    return candidates;
  }

  return [];
}
