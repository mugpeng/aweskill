import { cp, lstat, mkdir, readFile, readdir, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const COPY_MARKER = ".aweskill-projection.json";

interface CopyMarker {
  managedBy: "aweskill";
  sourcePath: string;
}

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

export async function assertProjectionTargetSafe(
  mode: "symlink" | "copy",
  sourcePath: string,
  targetPath: string,
  options: { allowReplaceExisting?: boolean } = {},
): Promise<void> {
  const existing = await tryLstat(targetPath);
  if (!existing) {
    return;
  }

  if (mode === "symlink") {
    if (!existing.isSymbolicLink()) {
      if (existing.isDirectory()) {
        const marker = await readCopyMarker(targetPath);
        if (marker && marker.sourcePath === path.resolve(sourcePath)) {
          return;
        }
      }
      if (options.allowReplaceExisting) {
        return;
      }
      throw new Error(`Refusing to overwrite non-symlink target: ${targetPath}`);
    }

    const currentTarget = await readlink(targetPath);
    const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
    if (resolvedCurrent === path.resolve(sourcePath)) {
      return;
    }
    return;
  }

  if (existing.isSymbolicLink()) {
    return;
  }

  const marker = await readCopyMarker(targetPath);
  if (!marker) {
    if (options.allowReplaceExisting) {
      return;
    }
    throw new Error(`Refusing to overwrite unmanaged directory: ${targetPath}`);
  }
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
          if (resolvedCurrent.startsWith(path.resolve(centralSkillsDir))) {
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
