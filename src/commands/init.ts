import { ensureGlobalConfig } from "../lib/config.js";
import { scanSkills } from "../lib/scanner.js";
import { ensureHomeLayout } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export async function runInit(context: RuntimeContext, options: { scan?: boolean }) {
  await ensureHomeLayout(context.homeDir);
  await ensureGlobalConfig(context.homeDir);
  context.write(`Initialized ${context.homeDir}/.aweskill`);

  if (options.scan) {
    const candidates = await scanSkills({ homeDir: context.homeDir, projectDirs: [context.cwd] });
    context.write(`Scanned ${candidates.length} skill candidates`);
    return candidates;
  }

  return [];
}
