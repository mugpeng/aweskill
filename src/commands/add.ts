import { importScannedSkills, importSkill } from "../lib/import.js";
import { scanSkills } from "../lib/scanner.js";
import type { ImportMode, RuntimeContext } from "../types.js";

export async function runAdd(
  context: RuntimeContext,
  options: {
    sourcePath?: string;
    scan?: boolean;
    mode: ImportMode;
    projectDirs?: string[];
  },
) {
  if (options.scan) {
    const candidates = await scanSkills({
      homeDir: context.homeDir,
      projectDirs: options.projectDirs ?? [context.cwd],
    });
    const result = await importScannedSkills({
      homeDir: context.homeDir,
      candidates,
      mode: options.mode,
    });
    context.write(`Imported ${result.imported.length} skills`);
    return result;
  }

  if (!options.sourcePath) {
    throw new Error("add requires a source path or --scan");
  }

  const result = await importSkill({
    homeDir: context.homeDir,
    sourcePath: options.sourcePath,
    mode: options.mode,
  });
  context.write(`Imported ${result.name}`);
  return result;
}
