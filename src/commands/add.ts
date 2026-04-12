import { importPath, importScannedSkills } from "../lib/import.js";
import { updateRegistryFromScan } from "../lib/registry.js";
import { scanSkills } from "../lib/scanner.js";
import type { ImportMode, RuntimeContext } from "../types.js";

export async function runAdd(
  context: RuntimeContext,
  options: {
    sourcePath?: string;
    scan?: boolean;
    mode: ImportMode;
    override?: boolean;
  },
) {
  if (options.scan) {
    const candidates = await scanSkills({
      homeDir: context.homeDir,
      projectDirs: [context.cwd],
    });
    await updateRegistryFromScan(context.homeDir, candidates);
    const result = await importScannedSkills({
      homeDir: context.homeDir,
      candidates,
      mode: options.mode,
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
    return result;
  }

  if (!options.sourcePath) {
    throw new Error("add requires a source path or --scan");
  }

  const result = await importPath({
    homeDir: context.homeDir,
    sourcePath: options.sourcePath,
    mode: options.mode,
    override: options.override,
  });

  if (result.kind === "single") {
    for (const warning of result.warnings) {
      context.write(`Warning: ${warning}`);
    }
    context.write(`Imported ${result.name}`);
    return result;
  }

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
  return result;
}
