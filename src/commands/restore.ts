import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

import { createSkillsBackupArchive, extractSkillsArchive, formatBackupLabel } from "../lib/backup.js";
import { pathExists } from "../lib/fs.js";
import { scanStoreHygiene } from "../lib/hygiene.js";
import { getAweskillPaths } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

export async function runRestore(
  context: RuntimeContext,
  options: {
    archivePath: string;
    override?: boolean;
    includeBundles?: boolean;
  },
) {
  const includeBundles = options.includeBundles ?? true;
  const { tempDir, extractedSkillsDir, extractedBundlesDir } = await extractSkillsArchive(options.archivePath);

  try {
    const extractedScan = await scanStoreHygiene({
      rootDir: tempDir,
      skillsDir: extractedSkillsDir,
      bundlesDir: extractedBundlesDir,
      includeBundles,
    });
    const extracted = extractedScan.validSkills;
    if (extracted.length === 0) {
      throw new Error(`Archive does not contain a skills/ directory: ${options.archivePath}`);
    }

    const { skillsDir, bundlesDir } = getAweskillPaths(context.homeDir);
    const currentScan = await scanStoreHygiene({
      rootDir: getAweskillPaths(context.homeDir).rootDir,
      skillsDir,
      bundlesDir,
      includeBundles,
    });
    const current = currentScan.validSkills;
    const currentNames = new Set(current.map((entry) => entry.name));
    const conflicts = extracted.map((entry) => entry.name).filter((name) => currentNames.has(name));
    const extractedBundles = includeBundles ? extractedScan.validBundles : [];
    const currentBundles = includeBundles ? currentScan.validBundles : [];
    const currentBundleNames = new Set(currentBundles.map((bundle) => bundle.name));
    const bundleConflicts = extractedBundles.map((bundle) => bundle.name).filter((name) => currentBundleNames.has(name));

    const backupArchivePath = await createSkillsBackupArchive(context.homeDir, { includeBundles });
    const skippedSkills = new Set(options.override ? [] : conflicts);
    const skippedBundles = new Set(options.override ? [] : bundleConflicts);

    if (options.override) {
      await rm(skillsDir, { recursive: true, force: true });
      await mkdir(path.dirname(skillsDir), { recursive: true });
      await cp(extractedSkillsDir, skillsDir, { recursive: true });
      if (includeBundles) {
        await rm(bundlesDir, { recursive: true, force: true });
        if (await pathExists(extractedBundlesDir)) {
          await mkdir(path.dirname(bundlesDir), { recursive: true });
          await cp(extractedBundlesDir, bundlesDir, { recursive: true });
        }
      }
    } else {
      await mkdir(skillsDir, { recursive: true });
      for (const entry of extracted) {
        if (skippedSkills.has(entry.name)) {
          continue;
        }
        await cp(entry.path, path.join(skillsDir, entry.name), { recursive: true });
      }
      if (includeBundles) {
        await mkdir(bundlesDir, { recursive: true });
        for (const bundle of extractedBundles) {
          if (skippedBundles.has(bundle.name)) {
            continue;
          }
          await cp(path.join(extractedBundlesDir, `${bundle.name}.yaml`), path.join(bundlesDir, `${bundle.name}.yaml`), { recursive: true });
        }
      }
    }

    const restoredSkillCount = options.override ? extracted.length : extracted.length - skippedSkills.size;
    const restoredBundleCount = includeBundles
      ? (options.override ? extractedBundles.length : extractedBundles.length - skippedBundles.size)
      : 0;
    const restoredLabel = includeBundles
      ? `Restored ${restoredSkillCount} skills and ${restoredBundleCount} bundles from ${options.archivePath}`
      : `Restored ${restoredSkillCount} skills from ${options.archivePath}`;
    context.write(restoredLabel);
    if (skippedSkills.size > 0) {
      context.write(`Skipped existing skills: ${[...skippedSkills].sort().join(", ")}`);
    }
    if (skippedBundles.size > 0) {
      context.write(`Skipped existing bundles: ${[...skippedBundles].sort().join(", ")}`);
    }
    if (extractedScan.findings.length > 0) {
      context.write(`Skipped suspicious restore source entries: ${extractedScan.findings.map((finding) => finding.relativePath).join(", ")}`);
    }
    context.write(`Backed up current ${formatBackupLabel(includeBundles)} to ${backupArchivePath}`);
    return {
      restored: extracted.map((entry) => entry.name).filter((name) => !skippedSkills.has(name)),
      skipped: [...skippedSkills],
      backupArchivePath,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
