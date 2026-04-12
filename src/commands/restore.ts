import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { createSkillsBackupArchive, extractSkillsArchive } from "../lib/backup.js";
import { getAweskillPaths } from "../lib/path.js";
import { listSkillEntriesInDirectory } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export async function runRestore(
  context: RuntimeContext,
  options: {
    archivePath: string;
    override?: boolean;
  },
) {
  const { tempDir, extractedSkillsDir } = await extractSkillsArchive(options.archivePath);

  try {
    const extracted = await listSkillEntriesInDirectory(extractedSkillsDir);
    if (extracted.length === 0) {
      throw new Error(`Archive does not contain a skills/ directory: ${options.archivePath}`);
    }

    const { skillsDir } = getAweskillPaths(context.homeDir);
    const current = await listSkillEntriesInDirectory(skillsDir);
    const currentNames = new Set(current.map((entry) => entry.name));
    const conflicts = extracted.map((entry) => entry.name).filter((name) => currentNames.has(name));

    if (conflicts.length > 0 && !options.override) {
      throw new Error(`Restore would overwrite existing skills: ${conflicts.join(", ")}. Use --override to replace them.`);
    }

    const backupArchivePath = await createSkillsBackupArchive(context.homeDir);

    if (options.override) {
      await rm(skillsDir, { recursive: true, force: true });
      await mkdir(path.dirname(skillsDir), { recursive: true });
      await cp(extractedSkillsDir, skillsDir, { recursive: true });
    } else {
      await mkdir(skillsDir, { recursive: true });
      for (const entry of extracted) {
        await cp(entry.path, path.join(skillsDir, entry.name), { recursive: true });
      }
    }

    context.write(`Restored ${extracted.length} skills from ${options.archivePath}`);
    context.write(`Backed up current skills to ${backupArchivePath}`);
    return { restored: extracted.map((entry) => entry.name), backupArchivePath };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
