import { access, cp, lstat, mkdir, readlink, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import type { ImportMode, ImportResult, ScanCandidate } from "../types.js";
import { sanitizeName } from "./path.js";
import { assertSkillSource, getSkillPath, skillExists } from "./skills.js";

class MissingSymlinkSourceError extends Error {
  sourcePath: string;
  resolvedSourcePath: string;

  constructor(sourcePath: string, resolvedSourcePath: string) {
    super(`Missing symlink source: ${resolvedSourcePath}`);
    this.name = "MissingSymlinkSourceError";
    this.sourcePath = sourcePath;
    this.resolvedSourcePath = resolvedSourcePath;
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveImportSource(sourcePath: string): Promise<{
  effectiveSourcePath: string;
  isSymlinkSource: boolean;
}> {
  const statResult = await lstat(sourcePath);
  if (!statResult.isSymbolicLink()) {
    return {
      effectiveSourcePath: sourcePath,
      isSymlinkSource: false,
    };
  }

  const linkTarget = await readlink(sourcePath);
  const resolvedSourcePath = path.resolve(path.dirname(sourcePath), linkTarget);
  if (!(await pathExists(resolvedSourcePath))) {
    throw new MissingSymlinkSourceError(sourcePath, resolvedSourcePath);
  }

  return {
    effectiveSourcePath: resolvedSourcePath,
    isSymlinkSource: true,
  };
}

async function mergeMissingEntries(sourcePath: string, destinationPath: string): Promise<void> {
  const sourceStat = await stat(sourcePath);

  if (sourceStat.isDirectory()) {
    await mkdir(destinationPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      await mergeMissingEntries(path.join(sourcePath, entry.name), path.join(destinationPath, entry.name));
    }
    return;
  }

  if (await pathExists(destinationPath)) {
    return;
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { recursive: false, errorOnExist: true, force: false });
}

async function copyIntoDestination(sourcePath: string, destination: string, override: boolean): Promise<void> {
  if (!override && (await pathExists(destination))) {
    await mergeMissingEntries(sourcePath, destination);
    return;
  }

  await cp(sourcePath, destination, { recursive: true, errorOnExist: false, force: override });
}

async function moveIntoDestination(sourcePath: string, destination: string, override: boolean): Promise<void> {
  if (!(await pathExists(destination))) {
    await rename(sourcePath, destination);
    return;
  }

  if (override) {
    await cp(sourcePath, destination, { recursive: true, errorOnExist: false, force: true });
    await rm(sourcePath, { recursive: true, force: true });
    return;
  }

  await mergeMissingEntries(sourcePath, destination);
}

interface BatchImportSource {
  name: string;
  path: string;
}

async function importBatchSources(options: {
  homeDir: string;
  sources: BatchImportSource[];
  mode: ImportMode;
  override?: boolean;
}): Promise<{ imported: string[]; skipped: string[]; overwritten: string[]; warnings: string[]; errors: string[]; missingSources: number }> {
  const seen = new Set<string>();
  const imported: string[] = [];
  const skipped: string[] = [];
  const overwritten: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let missingSources = 0;

  for (const source of options.sources) {
    if (seen.has(source.name)) {
      skipped.push(source.name);
      continue;
    }
    seen.add(source.name);

    const alreadyExists = await skillExists(options.homeDir, source.name);
    if (alreadyExists && !options.override) {
      skipped.push(source.name);
      continue;
    }

    try {
      const result = await importSkill({
        homeDir: options.homeDir,
        sourcePath: source.path,
        mode: options.mode,
        override: options.override,
      });
      warnings.push(...result.warnings);
      if (alreadyExists) {
        overwritten.push(source.name);
      } else {
        imported.push(source.name);
      }
    } catch (error) {
      if (error instanceof MissingSymlinkSourceError) {
        missingSources += 1;
        errors.push(`Broken symlink for ${source.name}: ${source.path}; source not found: ${error.resolvedSourcePath}`);
        continue;
      }

      if (error instanceof Error && error.message.startsWith("Skill source must contain SKILL.md:")) {
        skipped.push(source.name);
        continue;
      }

      throw error;
    }
  }

  return { imported, skipped, overwritten, warnings, errors, missingSources };
}

async function listImportableChildren(sourceRoot: string): Promise<BatchImportSource[]> {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const sources: BatchImportSource[] = [];

  for (const entry of entries) {
    if (!(entry.isDirectory() || entry.isSymbolicLink())) {
      continue;
    }

    const childPath = path.join(sourceRoot, entry.name);
    if (await pathExists(path.join(childPath, "SKILL.md"))) {
      sources.push({
        name: sanitizeName(entry.name),
        path: childPath,
      });
      continue;
    }

    if (entry.isSymbolicLink()) {
      sources.push({
        name: sanitizeName(entry.name),
        path: childPath,
      });
    }
  }

  return sources.sort((left, right) => left.name.localeCompare(right.name));
}

export async function importSkill(options: {
  homeDir: string;
  sourcePath: string;
  mode: ImportMode;
  override?: boolean;
}): Promise<ImportResult> {
  const { effectiveSourcePath, isSymlinkSource } = await resolveImportSource(options.sourcePath);
  await assertSkillSource(effectiveSourcePath);

  const skillName = sanitizeName(path.basename(options.sourcePath));
  if (!skillName) {
    throw new Error(`Unable to infer skill name from path: ${options.sourcePath}`);
  }

  const destination = getSkillPath(options.homeDir, skillName);
  await mkdir(path.dirname(destination), { recursive: true });

  const warnings: string[] = [];
  if (isSymlinkSource) {
    warnings.push(`Source ${options.sourcePath} is a symlink; copied from ${effectiveSourcePath} to ${destination}`);
  }

  if (options.mode === "mv" && !isSymlinkSource) {
    await moveIntoDestination(effectiveSourcePath, destination, options.override ?? false);
  } else {
    await copyIntoDestination(effectiveSourcePath, destination, options.override ?? false);
  }

  return { name: skillName, destination, warnings };
}

export async function importScannedSkills(options: {
  homeDir: string;
  candidates: ScanCandidate[];
  mode: ImportMode;
  override?: boolean;
}): Promise<{ imported: string[]; skipped: string[]; overwritten: string[]; warnings: string[]; errors: string[]; missingSources: number }> {
  return importBatchSources({
    homeDir: options.homeDir,
    sources: options.candidates.map((candidate) => ({
      name: candidate.name,
      path: candidate.path,
    })),
    mode: options.mode,
    override: options.override,
  });
}

export async function importPath(options: {
  homeDir: string;
  sourcePath: string;
  mode: ImportMode;
  override?: boolean;
}): Promise<
  | ({ kind: "single"; alreadyExisted: boolean } & ImportResult)
  | {
      kind: "batch";
      imported: string[];
      skipped: string[];
      overwritten: string[];
      warnings: string[];
      errors: string[];
      missingSources: number;
    }
> {
  if (await pathExists(path.join(options.sourcePath, "SKILL.md"))) {
    const skillName = sanitizeName(path.basename(options.sourcePath));
    const alreadyExisted = skillName ? await skillExists(options.homeDir, skillName) : false;

    if (alreadyExisted && !options.override) {
      return {
        kind: "single",
        alreadyExisted: true,
        name: skillName,
        destination: getSkillPath(options.homeDir, skillName),
        warnings: [],
      };
    }

    const result = await importSkill(options);
    return { kind: "single", alreadyExisted, ...result };
  }

  const sources = await listImportableChildren(options.sourcePath);
  if (sources.length === 0) {
    throw new Error(`Path is neither a skill directory nor a skills directory: ${options.sourcePath}`);
  }

  const batchResult = await importBatchSources({
    homeDir: options.homeDir,
    sources,
    mode: options.mode,
    override: options.override,
  });
  return { kind: "batch", ...batchResult };
}
