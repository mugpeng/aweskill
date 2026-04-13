import { readdir } from "node:fs/promises";

import { pathExists } from "../lib/fs.js";
import { getAweskillPaths } from "../lib/path.js";
import type { RuntimeContext } from "../types.js";

interface StoreLocationEntry {
  label: string;
  path: string;
  entryCount: number;
}

async function countEntries(targetPath: string): Promise<number> {
  if (!(await pathExists(targetPath))) {
    return 0;
  }

  return (await readdir(targetPath)).length;
}

function formatEntryCount(count: number): string {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

export async function runStoreWhere(context: RuntimeContext, options: { verbose?: boolean } = {}) {
  const paths = getAweskillPaths(context.homeDir);

  if (!options.verbose) {
    context.write(`aweskill store: ${paths.rootDir}`);
    return paths.rootDir;
  }

  const entries: StoreLocationEntry[] = [
    { label: "skills", path: paths.skillsDir, entryCount: await countEntries(paths.skillsDir) },
    { label: "dup_skills", path: paths.dupSkillsDir, entryCount: await countEntries(paths.dupSkillsDir) },
    { label: "backup", path: paths.backupDir, entryCount: await countEntries(paths.backupDir) },
    { label: "bundles", path: paths.bundlesDir, entryCount: await countEntries(paths.bundlesDir) },
  ];

  const lines = [`aweskill store: ${paths.rootDir}`];
  for (const entry of entries) {
    lines.push(`  - ${entry.label}: ${formatEntryCount(entry.entryCount)} -> ${entry.path}`);
  }

  context.write(lines.join("\n"));
  return {
    rootDir: paths.rootDir,
    entries,
  };
}
