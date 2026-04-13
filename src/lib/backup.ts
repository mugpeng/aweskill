import { mkdtemp, mkdir } from "node:fs/promises";
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

export async function createSkillsBackupArchive(homeDir: string): Promise<string> {
  const { rootDir, skillsDir, backupDir } = getAweskillPaths(homeDir);
  await mkdir(backupDir, { recursive: true });

  const archivePath = await nextBackupArchivePath(backupDir);

  await runTar(["-czf", archivePath, "-C", rootDir, path.relative(rootDir, skillsDir)]);
  return archivePath;
}

export async function extractSkillsArchive(archivePath: string): Promise<{ tempDir: string; extractedSkillsDir: string }> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "aweskill-restore-"));
  await runTar(["-xzf", archivePath, "-C", tempDir]);
  return {
    tempDir,
    extractedSkillsDir: path.join(tempDir, "skills"),
  };
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
