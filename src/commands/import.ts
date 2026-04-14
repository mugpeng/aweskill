import { importPath, importScannedSkills } from "../lib/import.js";
import { scanSkills } from "../lib/scanner.js";
import type { RuntimeContext, Scope } from "../types.js";

export async function runImport(
  context: RuntimeContext,
  options: {
    sourcePath?: string;
    scan?: boolean;
    override?: boolean;
    linkSource?: boolean;
    keepSource?: boolean;
    scope?: Scope;
    agents?: string[];
    projectDir?: string;
  },
) {
  if (options.keepSource && options.linkSource) {
    throw new Error("Choose either --keep-source or --link-source, not both.");
  }

  const linkSource = options.scan ? !options.keepSource : Boolean(options.linkSource);

  if (options.scan) {
    const candidates = await scanSkills({
      homeDir: context.homeDir,
      scope: options.scope ?? "global",
      agents: options.agents,
      projectDir: (options.scope ?? "global") === "project" ? (options.projectDir ?? context.cwd) : undefined,
    });
    const result = await importScannedSkills({
      homeDir: context.homeDir,
      candidates,
      override: options.override,
      linkSource,
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
    if (linkSource) {
      context.write(`Replaced ${result.linkedSources.length} scanned source paths with aweskill-managed projections.`);
    } else {
      context.write("Source paths were kept in place. Re-run without --keep-source to replace scanned agent skills with aweskill-managed projections.");
    }
    return result;
  }

  if (!options.sourcePath) {
    throw new Error('import requires a source path or --scan');
  }

  const result = await importPath({
    homeDir: context.homeDir,
    sourcePath: options.sourcePath,
    override: options.override,
    linkSource,
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
    if (result.linkedSourcePath) {
      context.write(`Replaced source path with an aweskill-managed projection: ${result.linkedSourcePath}`);
    } else {
      context.write("Source was kept in place. Re-run with --link-source to replace it with an aweskill-managed projection.");
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
  if (linkSource) {
    context.write(`Replaced ${result.linkedSources.length} source paths with aweskill-managed projections.`);
  } else {
    context.write("Source paths were kept in place. Re-run with --link-source to replace them with aweskill-managed projections.");
  }
  return result;
}
