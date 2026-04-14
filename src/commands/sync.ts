import path from "node:path";
import { rm } from "node:fs/promises";

import { formatNoAgentsDetectedForScope, resolveAgentsForListingOrSync, resolveAgentSkillsDir } from "../lib/agents.js";
import { pathExists } from "../lib/fs.js";
import { getAweskillPaths } from "../lib/path.js";
import { resolveCanonicalSkillName } from "../lib/rmdup.js";
import { listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import { createSkillSymlink, listBrokenSymlinkNames, listManagedSkillNames, removeManagedProjection } from "../lib/symlink.js";
import { buildCentralCanonicalSkills, classifyCheckedSkill } from "./check.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

type SyncCategory = "broken" | "duplicate" | "matched" | "new" | "suspicious" | "linked";

interface SyncEntry {
  name: string;
  path: string;
  category: SyncCategory;
}

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

function formatSkillBlockWithSummary(title: string, skills: SyncEntry[], verbose = false): string[] {
  if (skills.length === 0) {
    return [`No skills found for ${title.replace(/:$/, "").toLowerCase()}.`];
  }

  const lines = [title];
  const categories: Array<{ title: string; marker: string; key: SyncCategory }> = [
    { title: "  linked", marker: "✓", key: "linked" },
    { title: "  broken", marker: "!", key: "broken" },
    { title: "  duplicate", marker: "!", key: "duplicate" },
    { title: "  matched", marker: "~", key: "matched" },
    { title: "  new", marker: "+", key: "new" },
    { title: "  suspicious", marker: "?", key: "suspicious" },
  ];

  for (const category of categories) {
    const entries = skills.filter((skill) => skill.category === category.key);
    lines.push(`${category.title}: ${entries.length}`);
    const preview = verbose ? entries : entries.slice(0, DEFAULT_PREVIEW_COUNT);
    for (const skill of preview) {
      lines.push(`    ${category.marker} ${skill.name} ${skill.path}`);
    }
    if (!verbose && entries.length > preview.length) {
      lines.push(`    ... and ${entries.length - preview.length} more (use --verbose to show all)`);
    }
  }

  return lines;
}

export async function runSync(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
    apply?: boolean;
    removeSuspicious?: boolean;
    verbose?: boolean;
  },
) {
  if (options.removeSuspicious && !options.apply) {
    throw new Error("--remove-suspicious requires --apply.");
  }

  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const { agents } = await resolveAgentsForListingOrSync({
    requestedAgents: options.agents,
    scope: options.scope,
    homeDir: context.homeDir,
    projectDir,
  });

  if (agents.length === 0) {
    context.write(formatNoAgentsDetectedForScope(options.scope, projectDir));
    return { relinked: [], repairedBroken: [], removedBroken: [], removedSuspicious: [], newEntries: [] };
  }

  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);
  const centralSkillEntries = await listSkills(context.homeDir);
  const canonicalSkillNames = buildCentralCanonicalSkills(context.homeDir, centralSkillEntries);
  const baseDir = options.scope === "global" ? context.homeDir : projectDir!;

  const lines: string[] = [];
  const relinked: string[] = [];
  const repairedBroken: string[] = [];
  const removedBroken: string[] = [];
  const removedSuspicious: string[] = [];
  const newEntries: string[] = [];
  let suspiciousCount = 0;
  let repairableCount = 0;

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, centralSkillsDir);
    const brokenSymlinks = await listBrokenSymlinkNames(skillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const entries: SyncEntry[] = [];

    for (const skillName of Array.from(brokenSymlinks).sort((left, right) => left.localeCompare(right))) {
      const targetPath = path.join(skillsDir, skillName);
      entries.push({ name: skillName, path: targetPath, category: "broken" });
      repairableCount += 1;

      if (!options.apply) {
        continue;
      }

      const canonicalName = resolveCanonicalSkillName(skillName, canonicalSkillNames);
      if (canonicalName) {
        await createSkillSymlink(getSkillPath(context.homeDir, canonicalName), targetPath, {
          allowReplaceExisting: true,
        });
        repairedBroken.push(`${agentId}:${skillName}`);
        continue;
      }

      const wasRemoved = await removeManagedProjection(targetPath);
      if (wasRemoved) {
        removedBroken.push(`${agentId}:${skillName}`);
      }
    }

    for (const skill of skills) {
      if (brokenSymlinks.has(skill.name)) {
        continue;
      }

      const checkedSkill = classifyCheckedSkill(skill, managed, canonicalSkillNames);
      entries.push({ name: checkedSkill.name, path: checkedSkill.path, category: checkedSkill.category });

      if (checkedSkill.category === "duplicate" || checkedSkill.category === "matched") {
        repairableCount += 1;
      }
      if (checkedSkill.category === "suspicious") {
        suspiciousCount += 1;
      }
      if (checkedSkill.category === "new") {
        newEntries.push(`${agentId}:${checkedSkill.name}`);
      }

      if (!options.apply) {
        continue;
      }

      if (checkedSkill.category === "duplicate" || checkedSkill.category === "matched") {
        await createSkillSymlink(getSkillPath(context.homeDir, checkedSkill.canonicalName ?? checkedSkill.name), checkedSkill.path, {
          allowReplaceExisting: true,
        });
        relinked.push(`${agentId}:${checkedSkill.name}`);
        continue;
      }

      if (checkedSkill.category === "suspicious" && options.removeSuspicious) {
        await rm(checkedSkill.path, { recursive: true, force: true });
        removedSuspicious.push(`${agentId}:${checkedSkill.name}`);
      }
    }

    for (const [skillName] of managed) {
      if (brokenSymlinks.has(skillName)) {
        continue;
      }
      const sourcePath = path.join(centralSkillsDir, skillName);
      if (await pathExists(sourcePath)) {
        continue;
      }

      const targetPath = path.join(skillsDir, skillName);
      entries.push({ name: skillName, path: targetPath, category: "broken" });
      repairableCount += 1;

      if (!options.apply) {
        continue;
      }

      const wasRemoved = await removeManagedProjection(targetPath);
      if (wasRemoved) {
        removedBroken.push(`${agentId}:${skillName}`);
      }
    }

    const title = options.scope === "global"
      ? `Global skills for ${agentId}:`
      : `Project skills for ${agentId} (${projectDir}):`;
    lines.push("");
    lines.push(...formatSkillBlockWithSummary(title, entries, options.verbose));
  }

  lines.push("");
  if (!options.apply) {
    if (repairableCount > 0) {
      lines.push("Re-run with aweskill doctor sync --apply to repair broken projections and relink duplicate/matched entries.");
    }
    if (suspiciousCount > 0) {
      lines.push("Suspicious agent skill entries were reported only. Re-run with aweskill doctor sync --apply --remove-suspicious to remove them.");
    }
    if (newEntries.length > 0) {
      lines.push("New agent skill entries found. Use aweskill store import --scan with same scope and agent filters to import them.");
    }
  } else {
    lines.push(`Repaired ${repairedBroken.length} broken symlink projection${repairedBroken.length === 1 ? "" : "s"}.`);
    lines.push(`Removed ${removedBroken.length} broken projection${removedBroken.length === 1 ? "" : "s"}.`);
    lines.push(`Relinked ${relinked.length} duplicate or matched agent skill entr${relinked.length === 1 ? "y" : "ies"}.`);
    if (options.removeSuspicious) {
      lines.push(`Removed ${removedSuspicious.length} suspicious agent skill entr${removedSuspicious.length === 1 ? "y" : "ies"}.`);
    } else if (suspiciousCount > 0) {
      lines.push("Suspicious agent skill entries were reported only. Re-run with --apply --remove-suspicious to remove them.");
    }
    if (newEntries.length > 0) {
      lines.push("New agent skill entries were found. Use aweskill store import --scan with same scope and agent filters to import them.");
    }
  }

  context.write(lines.join("\n").trim());
  return { relinked, repairedBroken, removedBroken, removedSuspicious, newEntries };
}
