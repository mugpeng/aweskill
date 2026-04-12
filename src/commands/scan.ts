import { importScannedSkills } from "../lib/import.js";
import { updateRegistryFromScan } from "../lib/registry.js";
import { scanSkills } from "../lib/scanner.js";
import type { ImportMode, RuntimeContext } from "../types.js";

export async function runScan(
  context: RuntimeContext,
  options: { add?: boolean; mode?: ImportMode; override?: boolean },
) {
  const candidates = await scanSkills({
    homeDir: context.homeDir,
    projectDirs: [context.cwd],
  });
  await updateRegistryFromScan(context.homeDir, candidates);

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
    if (result.missingSources > 0) {
      context.write(`Missing source files: ${result.missingSources}`);
    }
    return { candidates, ...result };
  }

  const lines = candidates.map((candidate) => `${candidate.agentId}\t${candidate.scope}\t${candidate.name}\t${candidate.path}`);
  context.write(lines.join("\n") || "(no scanned skills)");
  return candidates;
}
