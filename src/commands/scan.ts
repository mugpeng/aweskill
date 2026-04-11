import { scanSkills } from "../lib/scanner.js";
import type { RuntimeContext } from "../types.js";

export async function runScan(context: RuntimeContext, options: { projectDirs?: string[] }) {
  const candidates = await scanSkills({
    homeDir: context.homeDir,
    projectDirs: options.projectDirs ?? [context.cwd],
  });
  const lines = candidates.map((candidate) => `${candidate.agentId}\t${candidate.scope}\t${candidate.name}\t${candidate.path}`);
  context.write(lines.join("\n") || "(no scanned skills)");
  return candidates;
}
