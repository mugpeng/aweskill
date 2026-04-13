import { mkdtemp, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { pathExists } from "./fs.js";
import { getAweskillPaths } from "./path.js";

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

async function runTar(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("tar", args, { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`tar exited with code ${code ?? "unknown"}`));
    });
  });
}

function formatBackupLabel(includeBundles: boolean): string {
  return includeBundles ? "skills and bundles" : "skills";
}

function archiveEntries(homeDir: string, includeBundles: boolean) {
  const { rootDir, skillsDir, bundlesDir } = getAweskillPaths(homeDir);
  return includeBundles
    ? [path.relative(rootDir, skillsDir), path.relative(rootDir, bundlesDir)]
    : [path.relative(rootDir, skillsDir)];
}

export async function createSkillsBackupArchive(
  homeDir: string,
  options: {
    archivePath?: string;
    includeBundles?: boolean;
  } = {},
): Promise<string> {
  const { rootDir, backupDir } = getAweskillPaths(homeDir);
  const includeBundles = options.includeBundles ?? false;
  const archivePath = await resolveBackupArchivePath(backupDir, options.archivePath);

  await mkdir(path.dirname(archivePath), { recursive: true });

  await runTar(["-czf", archivePath, "-C", rootDir, ...archiveEntries(homeDir, includeBundles)]);
  return archivePath;
}

export async function extractSkillsArchive(archivePath: string): Promise<{
  tempDir: string;
  extractedSkillsDir: string;
  extractedBundlesDir: string;
}> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "aweskill-restore-"));
  await runTar(["-xzf", archivePath, "-C", tempDir]);
  return {
    tempDir,
    extractedSkillsDir: path.join(tempDir, "skills"),
    extractedBundlesDir: path.join(tempDir, "bundles"),
  };
}

export { formatBackupLabel };

async function resolveBackupArchivePath(backupDir: string, requestedPath?: string): Promise<string> {
  if (!requestedPath) {
    return nextBackupArchivePath(backupDir);
  }

  try {
    const requestedStats = await stat(requestedPath);
    if (requestedStats.isDirectory()) {
      return nextBackupArchivePath(requestedPath);
    }
  } catch {
    // Treat missing paths as explicit archive filenames and let tar surface other filesystem errors.
  }

  return requestedPath;
}

async function nextBackupArchivePath(backupDir: string): Promise<string> {
  const base = `skills-${formatTimestamp(new Date())}`;
  const primary = path.join(backupDir, `${base}.tar.gz`);
  if (!(await pathExists(primary))) {
    return primary;
  }

  let index = 1;
  while (true) {
    const candidate = path.join(backupDir, `${base}-${index}.tar.gz`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    index += 1;
  }
}
