import { access } from "node:fs/promises";
import path from "node:path";

import { listSupportedAgents, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { getAweskillPaths } from "../lib/path.js";
import { listManagedSkillNames, removeManagedProjection } from "../lib/symlink.js";
import type { RuntimeContext } from "../types.js";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan all known agent skill directories and remove any managed projections
 * (symlinks or aweskill-copies) whose source no longer exists in the central repo.
 */
export async function runSync(context: RuntimeContext, options: { projectDir?: string }) {
  const { skillsDir } = getAweskillPaths(context.homeDir);
  const baseDirs = new Set<{ scope: "global" | "project"; dir: string }>();

  baseDirs.add({ scope: "global", dir: context.homeDir });
  if (options.projectDir) {
    baseDirs.add({ scope: "project", dir: options.projectDir });
  }
  if (await pathExists(path.join(context.cwd, ".aweskill.yaml"))) {
    baseDirs.add({ scope: "project", dir: context.cwd });
  }

  let removed = 0;
  const warnings: string[] = [];

  for (const { scope, dir } of baseDirs) {
    for (const agent of listSupportedAgents()) {
      if (!supportsScope(agent.id, scope)) {
        continue;
      }
      const skillsDir2 = resolveAgentSkillsDir(agent.id, scope, dir);
      const managed = await listManagedSkillNames(skillsDir2, skillsDir);
      for (const [skillName] of managed) {
        const sourcePath = path.join(skillsDir, skillName);
        if (!(await pathExists(sourcePath))) {
          const wasRemoved = await removeManagedProjection(path.join(skillsDir2, skillName));
          if (wasRemoved) {
            removed += 1;
            warnings.push(`Removed stale projection: ${agent.id}:${skillName} (source missing)`);
          }
        }
      }
    }
  }

  context.write(`Sync complete. Removed ${removed} stale projection(s).`);
  if (warnings.length > 0) {
    context.write(warnings.join("\n"));
  }
  return { removed, warnings };
}
