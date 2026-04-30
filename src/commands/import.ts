import { computeDirectoryHash } from "../lib/hash.js";
import { importPath, importScannedSkills, listImportableChildren } from "../lib/import.js";
import { upsertSkillLockEntry } from "../lib/lock.js";
import { scanSkills } from "../lib/scanner.js";
import { getSkillPath } from "../lib/skills.js";
import { parseDownloadSource } from "../lib/source-parser.js";
import type { RuntimeContext, Scope } from "../types.js";

async function trackImportedLocalSources(
  context: RuntimeContext,
  sourcePath: string,
  result: Awaited<ReturnType<typeof importPath>> | Awaited<ReturnType<typeof importScannedSkills>>,
  override = false,
): Promise<string[]> {
  const source = parseDownloadSource(sourcePath, context.cwd);
  if (source.type !== "local") {
    throw new Error("--track-source only supports explicit local import paths.");
  }

  if ("kind" in result && result.kind === "single") {
    if (result.alreadyExisted && !override) {
      return [];
    }

    await upsertSkillLockEntry(context.homeDir, result.name, {
      source: source.localPath!,
      sourceType: source.type,
      sourceUrl: source.sourceUrl,
      computedHash: await computeDirectoryHash(getSkillPath(context.homeDir, result.name)),
    });
    return [result.name];
  }

  const childSources = await listImportableChildren(source.localPath!);
  const sourceByName = new Map(childSources.map((child) => [child.name, child.path]));
  const trackedNames = [...result.imported, ...result.overwritten];

  for (const name of trackedNames) {
    const childPath = sourceByName.get(name);
    if (!childPath) {
      continue;
    }

    await upsertSkillLockEntry(context.homeDir, name, {
      source: childPath,
      sourceType: source.type,
      sourceUrl: `file://${childPath}`,
      computedHash: await computeDirectoryHash(getSkillPath(context.homeDir, name)),
    });
  }

  return trackedNames;
}

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
    trackSource?: boolean;
  },
) {
  if (options.keepSource && options.linkSource) {
    throw new Error("Choose either --keep-source or --link-source, not both.");
  }
  if (options.trackSource && options.scan) {
    throw new Error("--track-source is only supported for explicit local import paths, not with --scan.");
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
      context.write(
        `Skipped ${result.skipped.length} existing skills (use --override to overwrite): ${result.skipped.join(", ")}`,
      );
    }
    if (result.missingSources > 0) {
      context.write(`Missing source files: ${result.missingSources}`);
    }
    if (linkSource) {
      context.write(`Replaced ${result.linkedSources.length} scanned source paths with aweskill-managed projections.`);
    } else {
      context.write(
        "Source paths were kept in place. Re-run without --keep-source to replace scanned agent skills with aweskill-managed projections.",
      );
    }
    return result;
  }

  if (!options.sourcePath) {
    throw new Error("import requires a source path or --scan");
  }

  const result = await importPath({
    homeDir: context.homeDir,
    sourcePath: options.sourcePath,
    override: options.override,
    linkSource,
  });
  const trackedNames = options.trackSource
    ? await trackImportedLocalSources(context, options.sourcePath, result, options.override)
    : [];

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
      context.write(
        "Source was kept in place. Re-run with --link-source to replace it with an aweskill-managed projection.",
      );
    }
    if (trackedNames.length > 0) {
      context.write(`Tracked ${trackedNames.join(", ")} for future store update runs.`);
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
    context.write(
      `Skipped ${result.skipped.length} existing skills (use --override to overwrite): ${result.skipped.join(", ")}`,
    );
  }
  if (result.missingSources > 0) {
    context.write(`Missing source files: ${result.missingSources}`);
  }
  if (linkSource) {
    context.write(`Replaced ${result.linkedSources.length} source paths with aweskill-managed projections.`);
  } else {
    context.write(
      "Source paths were kept in place. Re-run with --link-source to replace them with aweskill-managed projections.",
    );
  }
  if (trackedNames.length > 0) {
    context.write(`Tracked ${trackedNames.length} imported skills for future store update runs.`);
  }
  return result;
}
