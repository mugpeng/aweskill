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
    if (result.overwritten.length > 0) {
      context.write(`Overwritten ${result.overwritten.length} existing skills: ${result.overwritten.join(", ")}`);
    }
    if (result.skipped.length > 0) {
      context.write(`Skipped ${result.skipped.length} existing skills (use --override to overwrite): ${result.skipped.join(", ")}`);
    }
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
    if (result.alreadyExisted && !options.override) {
      context.write(`Skipped ${result.name} (already exists; use --override to overwrite)`);
    } else if (result.alreadyExisted) {
      context.write(`Overwritten ${result.name}`);
    } else {
      context.write(`Imported ${result.name}`);
    }
    return result;
  }

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
  return result;
}
