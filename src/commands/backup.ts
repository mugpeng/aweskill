import { createSkillsBackupArchive } from "../lib/backup.js";
import type { RuntimeContext } from "../types.js";

export async function runBackup(context: RuntimeContext) {
  const archivePath = await createSkillsBackupArchive(context.homeDir);
  context.write(`Backed up skills to ${archivePath}`);
  return { archivePath };
}
