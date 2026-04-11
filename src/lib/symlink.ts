import { cp, lstat, mkdir, readFile, readdir, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const COPY_MARKER = ".aweskill-projection.json";

interface CopyMarker {
  managedBy: "aweskill";
  sourcePath: string;
}

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

export async function createSkillSymlink(sourcePath: string, targetPath: string): Promise<"created" | "skipped"> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const existing = await tryLstat(targetPath);

  if (existing?.isSymbolicLink()) {
    const currentTarget = await readlink(targetPath);
    const resolvedCurrent = path.resolve(path.dirname(targetPath), currentTarget);
    if (resolvedCurrent === path.resolve(sourcePath)) {
      return "skipped";
    }
    await unlink(targetPath);
  } else if (existing) {
    throw new Error(`Refusing to overwrite non-symlink target: ${targetPath}`);
  }

  const linkTarget = path.relative(path.dirname(targetPath), sourcePath) || ".";
  await symlink(linkTarget, targetPath, "dir");
  return "created";
}

export async function createSkillCopy(sourcePath: string, targetPath: string): Promise<"created" | "skipped"> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const existing = await tryLstat(targetPath);

  if (existing?.isSymbolicLink()) {
    await unlink(targetPath);
  } else if (existing) {
    const marker = await readCopyMarker(targetPath);
    if (!marker) {
      throw new Error(`Refusing to overwrite unmanaged directory: ${targetPath}`);
    }
    if (path.resolve(marker.sourcePath) === path.resolve(sourcePath)) {
      await rm(targetPath, { force: true, recursive: true });
    } else {
      await rm(targetPath, { force: true, recursive: true });
    }
  }

  await cp(sourcePath, targetPath, { recursive: true });
  const marker: CopyMarker = { managedBy: "aweskill", sourcePath: path.resolve(sourcePath) };
  await writeFile(path.join(targetPath, COPY_MARKER), JSON.stringify(marker, null, 2), "utf8");
  return "created";
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
      if (entry.isSymbolicLink()) {
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

      if (entry.isDirectory()) {
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
