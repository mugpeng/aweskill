import { cp, lstat, mkdir, readdir, readFile, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { isSameOrDescendantPath } from "./path.js";

const COPY_MARKER = ".aweskill-projection.json";

interface CopyMarker {
  managedBy: "aweskill";
  sourcePath: string;
}

export type ProjectionTargetStatus =
  | { kind: "missing" }
  | { kind: "managed_symlink"; sourcePath: string; matchesSource: boolean }
  | { kind: "managed_copy"; sourcePath: string; matchesSource: boolean }
  | { kind: "foreign_symlink"; sourcePath: string }
  | { kind: "directory" }
  | { kind: "file" };

export interface ProjectionResult {
  status: "created" | "skipped";
  mode: "symlink" | "copy";
}

type DirectoryLinkCreator = (sourcePath: string, targetPath: string) => Promise<void>;

async function tryLstat(targetPath: string) {
  try {
    return await lstat(targetPath);
  } catch {
    return null;
  }
}

async function readCopyMarker(targetPath: string): Promise<CopyMarker | null> {
  try {
    const content = await readFile(path.join(targetPath, COPY_MARKER), "utf8");
    const parsed = JSON.parse(content) as CopyMarker;
    return parsed.managedBy === "aweskill" ? parsed : null;
  } catch {
    return null;
  }
}

export function getDirectoryLinkTypeForPlatform(platform = process.platform): "dir" | "junction" {
  return platform === "win32" ? "junction" : "dir";
}

async function defaultDirectoryLinkCreator(sourcePath: string, targetPath: string): Promise<void> {
  const linkTarget = path.relative(path.dirname(targetPath), sourcePath) || ".";
  await symlink(linkTarget, targetPath, getDirectoryLinkTypeForPlatform());
}

let directoryLinkCreator: DirectoryLinkCreator = defaultDirectoryLinkCreator;

export function setDirectoryLinkCreatorForTesting(creator?: DirectoryLinkCreator): void {
  directoryLinkCreator = creator ?? defaultDirectoryLinkCreator;
}

function shouldFallbackToCopy(error: unknown, platform = process.platform): boolean {
  if (platform !== "win32") {
    return false;
  }

  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  return code === "EPERM" || code === "EACCES" || code === "EINVAL" || code === "UNKNOWN";
}

export async function inspectProjectionTarget(
  targetPath: string,
  options: { centralSkillsDir?: string; sourcePath?: string } = {},
): Promise<ProjectionTargetStatus> {
  const existing = await tryLstat(targetPath);
  if (!existing) {
    return { kind: "missing" };
  }

  const centralRoot = options.centralSkillsDir ? path.resolve(options.centralSkillsDir) : undefined;
  const expectedSource = options.sourcePath ? path.resolve(options.sourcePath) : undefined;

  if (existing.isSymbolicLink()) {
    const currentTarget = await readlink(targetPath);
    const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
    if (centralRoot && isSameOrDescendantPath(centralRoot, resolvedCurrent)) {
      return {
        kind: "managed_symlink",
        sourcePath: resolvedCurrent,
        matchesSource: expectedSource ? resolvedCurrent === expectedSource : true,
      };
    }
    return { kind: "foreign_symlink", sourcePath: resolvedCurrent };
  }

  if (existing.isDirectory()) {
    const marker = await readCopyMarker(targetPath);
    if (marker) {
      return {
        kind: "managed_copy",
        sourcePath: marker.sourcePath,
        matchesSource: expectedSource ? marker.sourcePath === expectedSource : true,
      };
    }
    return { kind: "directory" };
  }

  return { kind: "file" };
}

export async function assertProjectionTargetSafe(
  mode: "symlink" | "copy",
  sourcePath: string,
  targetPath: string,
  options: { allowReplaceExisting?: boolean } = {},
): Promise<void> {
  const status = await inspectProjectionTarget(targetPath, { sourcePath });
  if (status.kind === "missing") {
    return;
  }

  if (mode === "symlink") {
    if ((status.kind === "managed_symlink" || status.kind === "managed_copy") && status.matchesSource) {
      return;
    }
    if (options.allowReplaceExisting) {
      return;
    }
    throw new Error(`Refusing to overwrite non-symlink target: ${targetPath}`);
  }

  if (status.kind === "managed_symlink" || status.kind === "managed_copy") {
    return;
  }

  if (options.allowReplaceExisting) {
    return;
  }
  throw new Error(`Refusing to overwrite unmanaged directory: ${targetPath}`);
}

export async function createSkillSymlink(
  sourcePath: string,
  targetPath: string,
  options: { allowReplaceExisting?: boolean } = {},
): Promise<ProjectionResult> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const existing = await tryLstat(targetPath);

  if (existing?.isSymbolicLink()) {
    const currentTarget = await readlink(targetPath);
    const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
    if (resolvedCurrent === path.resolve(sourcePath)) {
      return { status: "skipped", mode: "symlink" };
    }
    await unlink(targetPath);
  } else if (existing) {
    if (existing.isDirectory()) {
      const marker = await readCopyMarker(targetPath);
      if (marker?.sourcePath === path.resolve(sourcePath)) {
        return { status: "skipped", mode: "copy" };
      }
    }

    if (!options.allowReplaceExisting) {
      throw new Error(`Refusing to overwrite non-symlink target: ${targetPath}`);
    }
    await rm(targetPath, { force: true, recursive: true });
  }

  try {
    await directoryLinkCreator(sourcePath, targetPath);
    return { status: "created", mode: "symlink" };
  } catch (error) {
    if (!shouldFallbackToCopy(error)) {
      throw error;
    }
    return createSkillCopy(sourcePath, targetPath, options);
  }
}

export async function createSkillCopy(
  sourcePath: string,
  targetPath: string,
  options: { allowReplaceExisting?: boolean } = {},
): Promise<ProjectionResult> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const existing = await tryLstat(targetPath);

  if (existing?.isSymbolicLink()) {
    await unlink(targetPath);
  } else if (existing) {
    const marker = await readCopyMarker(targetPath);
    if (marker?.sourcePath === path.resolve(sourcePath)) {
      return { status: "skipped", mode: "copy" };
    }
    if (!marker && !options.allowReplaceExisting) {
      throw new Error(`Refusing to overwrite unmanaged directory: ${targetPath}`);
    }
    await rm(targetPath, { force: true, recursive: true });
  }

  await cp(sourcePath, targetPath, { recursive: true });
  const marker: CopyMarker = { managedBy: "aweskill", sourcePath: path.resolve(sourcePath) };
  await writeFile(path.join(targetPath, COPY_MARKER), JSON.stringify(marker, null, 2), "utf8");
  return { status: "created", mode: "copy" };
}

export async function removeManagedProjection(targetPath: string): Promise<boolean> {
  const existing = await tryLstat(targetPath);
  if (!existing) {
    return false;
  }

  if (existing.isSymbolicLink()) {
    await unlink(targetPath);
    return true;
  }

  if (existing.isDirectory()) {
    const marker = await readCopyMarker(targetPath);
    if (marker) {
      await rm(targetPath, { force: true, recursive: true });
      return true;
    }
  }

  return false;
}

export async function removeProjectionTarget(
  targetPath: string,
  options: { force?: boolean; centralSkillsDir?: string } = {},
): Promise<boolean> {
  const status = await inspectProjectionTarget(targetPath, { centralSkillsDir: options.centralSkillsDir });
  if (status.kind === "missing") {
    return false;
  }

  if (status.kind === "managed_symlink") {
    await unlink(targetPath);
    return true;
  }

  if (status.kind === "managed_copy" || status.kind === "directory") {
    if (status.kind === "directory" && !options.force) {
      return false;
    }
    await rm(targetPath, { force: true, recursive: true });
    return true;
  }

  if (status.kind === "foreign_symlink") {
    if (!options.force) {
      return false;
    }
    await unlink(targetPath);
    return true;
  }

  if (status.kind === "file") {
    if (!options.force) {
      return false;
    }
    await rm(targetPath, { force: true });
    return true;
  }

  return false;
}

export async function listManagedSkillNames(
  skillsDir: string,
  centralSkillsDir: string,
): Promise<Map<string, "symlink" | "copy">> {
  const result = new Map<string, "symlink" | "copy">();

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(skillsDir, entry.name);
      const stats = await tryLstat(targetPath);
      if (stats?.isSymbolicLink()) {
        try {
          const currentTarget = await readlink(targetPath);
          const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
          if (isSameOrDescendantPath(centralSkillsDir, resolvedCurrent)) {
            result.set(entry.name, "symlink");
          }
        } catch {
          result.set(entry.name, "symlink");
        }
        continue;
      }

      if (stats?.isDirectory()) {
        const marker = await readCopyMarker(targetPath);
        if (marker) {
          result.set(entry.name, "copy");
        }
      }
    }
  } catch {
    return result;
  }

  return result;
}

export async function listBrokenSymlinkNames(skillsDir: string): Promise<Set<string>> {
  const result = new Set<string>();

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      const targetPath = path.join(skillsDir, entry.name);
      const stats = await tryLstat(targetPath);
      if (!stats?.isSymbolicLink()) {
        continue;
      }

      try {
        const currentTarget = await readlink(targetPath);
        const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
        if (!(await tryLstat(resolvedCurrent))) {
          result.add(entry.name);
        }
      } catch {
        result.add(entry.name);
      }
    }
  } catch {
    return result;
  }

  return result;
}
