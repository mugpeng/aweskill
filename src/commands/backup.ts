import path from "node:path";

import { createSkillsBackupArchive, formatBackupLabel } from "../lib/backup.js";
import { expandHomePath } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

export async function runBackup(
  context: RuntimeContext,
  options: {
    archivePath?: string;
    includeBundles?: boolean;
  } = {},
) {
  const archivePath = await createSkillsBackupArchive(context.homeDir, {
    archivePath: options.archivePath ? path.resolve(context.cwd, expandHomePath(options.archivePath, context.homeDir)) : undefined,
    includeBundles: options.includeBundles,
  });
  context.write(`Backed up ${formatBackupLabel(options.includeBundles ?? false)} to ${archivePath}`);
  return { archivePath };
}
