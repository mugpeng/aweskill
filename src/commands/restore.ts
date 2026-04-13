import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { createSkillsBackupArchive, extractSkillsArchive, formatBackupLabel } from "../lib/backup.js";
import { listBundlesInDirectory } from "../lib/bundles.js";
import { getAweskillPaths } from "../lib/path.js";
import { listSkillEntriesInDirectory } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export async function runRestore(
  context: RuntimeContext,
  options: {
    archivePath: string;
    override?: boolean;
    includeBundles?: boolean;
  },
) {
  const includeBundles = options.includeBundles ?? false;
  const { tempDir, extractedSkillsDir, extractedBundlesDir } = await extractSkillsArchive(options.archivePath);

  try {
    const extracted = await listSkillEntriesInDirectory(extractedSkillsDir);
    if (extracted.length === 0) {
      throw new Error(`Archive does not contain a skills/ directory: ${options.archivePath}`);
    }

    const { skillsDir, bundlesDir } = getAweskillPaths(context.homeDir);
    const current = await listSkillEntriesInDirectory(skillsDir);
    const currentNames = new Set(current.map((entry) => entry.name));
    const conflicts = extracted.map((entry) => entry.name).filter((name) => currentNames.has(name));
    const extractedBundles = includeBundles ? await listBundlesInDirectory(extractedBundlesDir) : [];
    const currentBundles = includeBundles ? await listBundlesInDirectory(bundlesDir) : [];
    const currentBundleNames = new Set(currentBundles.map((bundle) => bundle.name));
    const bundleConflicts = extractedBundles.map((bundle) => bundle.name).filter((name) => currentBundleNames.has(name));

    if ((conflicts.length > 0 || bundleConflicts.length > 0) && !options.override) {
      const conflictMessages: string[] = [];
      if (conflicts.length > 0) {
        conflictMessages.push(`skills: ${conflicts.join(", ")}`);
      }
      if (bundleConflicts.length > 0) {
        conflictMessages.push(`bundles: ${bundleConflicts.join(", ")}`);
      }
      throw new Error(`Restore would overwrite existing ${conflictMessages.join("; ")}. Use --override to replace them.`);
    }

    const backupArchivePath = await createSkillsBackupArchive(context.homeDir, { includeBundles });

    if (options.override) {
      await rm(skillsDir, { recursive: true, force: true });
      await mkdir(path.dirname(skillsDir), { recursive: true });
      await cp(extractedSkillsDir, skillsDir, { recursive: true });
      if (includeBundles) {
        await rm(bundlesDir, { recursive: true, force: true });
        await mkdir(path.dirname(bundlesDir), { recursive: true });
        await cp(extractedBundlesDir, bundlesDir, { recursive: true });
      }
    } else {
      await mkdir(skillsDir, { recursive: true });
      for (const entry of extracted) {
        await cp(entry.path, path.join(skillsDir, entry.name), { recursive: true });
      }
      if (includeBundles) {
        await mkdir(bundlesDir, { recursive: true });
        for (const bundle of extractedBundles) {
          await cp(path.join(extractedBundlesDir, `${bundle.name}.yaml`), path.join(bundlesDir, `${bundle.name}.yaml`), { recursive: true });
        }
      }
    }

    const restoredLabel = includeBundles
      ? `Restored ${extracted.length} skills and ${extractedBundles.length} bundles from ${options.archivePath}`
      : `Restored ${extracted.length} skills from ${options.archivePath}`;
    context.write(restoredLabel);
    context.write(`Backed up current ${formatBackupLabel(includeBundles)} to ${backupArchivePath}`);
    return { restored: extracted.map((entry) => entry.name), backupArchivePath };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
