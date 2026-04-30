import path from "node:path";

import { createSkillsBackupArchive, formatBackupLabel } from "../lib/backup.js";
import { scanStoreHygiene } from "../lib/hygiene.js";
import { expandHomePath, getAweskillPaths } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

export async function runBackup(
  context: RuntimeContext,
  options: {
    archivePath?: string;
    includeBundles?: boolean;
  } = {},
) {
  const includeBundles = options.includeBundles ?? true;
  const { rootDir, skillsDir, bundlesDir } = getAweskillPaths(context.homeDir);
  const { findings } = await scanStoreHygiene({ rootDir, skillsDir, bundlesDir, includeBundles });
  const archivePath = await createSkillsBackupArchive(context.homeDir, {
    archivePath: options.archivePath
      ? path.resolve(context.cwd, expandHomePath(options.archivePath, context.homeDir))
      : undefined,
    includeBundles,
  });
  context.write(`Backed up ${formatBackupLabel(includeBundles)} to ${archivePath}`);
  if (findings.length > 0) {
    context.write(
      `Skipped suspicious store entries during backup: ${findings.map((finding) => finding.relativePath).join(", ")}`,
    );
  }
  return { archivePath };
}
