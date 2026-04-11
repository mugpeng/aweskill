import { cp, mkdir, rename, symlink } from "node:fs/promises";
import path from "node:path";

import type { ImportMode, ScanCandidate } from "../types.js";
import { assertSkillSource, getSkillPath } from "./skills.js";
import { sanitizeName } from "./path.js";

export async function importSkill(options: {
  homeDir: string;
  sourcePath: string;
  mode: ImportMode;
}): Promise<{ name: string; destination: string }> {
  await assertSkillSource(options.sourcePath);

  const skillName = sanitizeName(path.basename(options.sourcePath));
  if (!skillName) {
    throw new Error(`Unable to infer skill name from path: ${options.sourcePath}`);
  }

  const destination = getSkillPath(options.homeDir, skillName);
  await mkdir(path.dirname(destination), { recursive: true });

  if (options.mode === "mv") {
    await rename(options.sourcePath, destination);
  } else if (options.mode === "cp") {
    await cp(options.sourcePath, destination, { recursive: true, errorOnExist: true, force: false });
  } else {
    const linkTarget = path.relative(path.dirname(destination), options.sourcePath) || ".";
    await symlink(linkTarget, destination, "dir");
  }

  return { name: skillName, destination };
}

export async function importScannedSkills(options: {
  homeDir: string;
  candidates: ScanCandidate[];
  mode: ImportMode;
}): Promise<{ imported: string[]; skipped: string[] }> {
  const seen = new Set<string>();
  const imported: string[] = [];
  const skipped: string[] = [];

  for (const candidate of options.candidates) {
    if (seen.has(candidate.name)) {
      skipped.push(candidate.name);
      continue;
    }
    seen.add(candidate.name);
    await importSkill({
      homeDir: options.homeDir,
      sourcePath: candidate.path,
      mode: options.mode,
    });
    imported.push(candidate.name);
  }

  return { imported, skipped };
}
