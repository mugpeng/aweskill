import path from "node:path";
import { rm } from "node:fs/promises";

import { isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { pathExists } from "../lib/fs.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { resolveCanonicalSkillName } from "../lib/rmdup.js";
import { listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import { createSkillSymlink, listBrokenSymlinkNames, listManagedSkillNames, removeManagedProjection } from "../lib/symlink.js";
import { buildCentralCanonicalSkills, classifyCheckedSkill } from "./check.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

type SyncCategory = "stale" | "broken" | "duplicate" | "suspicious" | "new";

interface SyncGroup {
  title: string;
  marker: string;
  items: string[];
}

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

async function resolveAgentsForScope(
  requestedAgents: string[],
  scope: Scope,
): Promise<AgentId[]> {
  if (requestedAgents.length === 0 || requestedAgents.includes("all")) {
    return listSupportedAgentIds().filter((agentId) => supportsScope(agentId, scope));
  }

  return uniqueSorted(
    requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      if (!supportsScope(agent, scope)) {
        throw new Error(`Agent ${agent} does not support ${scope} scope.`);
      }
      return agent;
    }),
  );
}

function formatSyncGroup(group: SyncGroup, verbose?: boolean): string[] {
  const lines = [`  ${group.title}: ${group.items.length}`];
  const preview = verbose ? group.items : group.items.slice(0, DEFAULT_PREVIEW_COUNT);
  for (const item of preview) {
    lines.push(`    ${group.marker} ${item}`);
  }
  if (!verbose && group.items.length > preview.length) {
    lines.push(`    ... and ${group.items.length - preview.length} more (use --verbose to show all)`);
  }
  return lines;
}

function formatAgentSyncBlock(
  title: string,
  groups: Record<SyncCategory, string[]>,
  options: { verbose?: boolean },
): string[] {
  const orderedGroups: SyncGroup[] = [
    { title: "stale", marker: "-", items: groups.stale },
    { title: "broken", marker: "!", items: groups.broken },
    { title: "duplicate", marker: "~", items: groups.duplicate },
    { title: "suspicious", marker: "?", items: groups.suspicious },
    { title: "new", marker: "+", items: groups.new },
  ];

  const lines = [title];
  for (const group of orderedGroups) {
    lines.push(...formatSyncGroup(group, options.verbose));
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
  const agents = await resolveAgentsForScope(options.agents, options.scope);
  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);
  const centralSkillEntries = await listSkills(context.homeDir);
  const canonicalSkillNames = buildCentralCanonicalSkills(context.homeDir, centralSkillEntries);
  const baseDir = options.scope === "global" ? context.homeDir : projectDir!;

  const lines = ["Agent sync findings:"];
  const relinked: string[] = [];
  const repairedBroken: string[] = [];
  const removedBroken: string[] = [];
  const removedStale: string[] = [];
  const removedSuspicious: string[] = [];
  const newEntries: string[] = [];

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, centralSkillsDir);
    const brokenSymlinks = await listBrokenSymlinkNames(skillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => classifyCheckedSkill(skill, managed, canonicalSkillNames));

    const groups: Record<SyncCategory, string[]> = {
      stale: [],
      broken: [],
      duplicate: [],
      suspicious: [],
      new: [],
    };

    for (const skillName of Array.from(brokenSymlinks).sort((left, right) => left.localeCompare(right))) {
      groups.broken.push(skillName);
      if (!options.apply) {
        continue;
      }

      const targetPath = path.join(skillsDir, skillName);
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

    for (const skill of checked) {
      if (brokenSymlinks.has(skill.name)) {
        continue;
      }

      if (skill.category === "duplicate" || skill.category === "matched") {
        groups.duplicate.push(skill.name);
        if (options.apply) {
          await createSkillSymlink(getSkillPath(context.homeDir, skill.canonicalName ?? skill.name), skill.path, {
            allowReplaceExisting: true,
          });
          relinked.push(`${agentId}:${skill.name}`);
        }
        continue;
      }

      if (skill.category === "suspicious") {
        groups.suspicious.push(skill.name);
        if (options.apply && options.removeSuspicious) {
          await rm(skill.path, { recursive: true, force: true });
          removedSuspicious.push(`${agentId}:${skill.name}`);
        }
        continue;
      }

      if (skill.category === "new") {
        groups.new.push(skill.name);
        newEntries.push(`${agentId}:${skill.name}`);
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

      groups.stale.push(skillName);
      if (!options.apply) {
        continue;
      }

      const wasRemoved = await removeManagedProjection(path.join(skillsDir, skillName));
      if (wasRemoved) {
        removedStale.push(`${agentId}:${skillName}`);
      }
    }

    groups.stale.sort((left, right) => left.localeCompare(right));
    groups.broken.sort((left, right) => left.localeCompare(right));
    groups.duplicate.sort((left, right) => left.localeCompare(right));
    groups.suspicious.sort((left, right) => left.localeCompare(right));
    groups.new.sort((left, right) => left.localeCompare(right));

    const title = options.scope === "global"
      ? `Global agent skills for ${agentId}:`
      : `Project agent skills for ${agentId} (${projectDir}):`;
    lines.push("");
    lines.push(...formatAgentSyncBlock(title, groups, { verbose: options.verbose }));
  }

  lines.push("");
  if (!options.apply) {
    lines.push("Dry run only. Use --apply to repair stale, broken, and duplicate agent skill entries.");
  } else {
    lines.push(`Removed ${removedStale.length} stale projection(s).`);
    lines.push(`Repaired ${repairedBroken.length} broken symlink projection${repairedBroken.length === 1 ? "" : "s"}.`);
    lines.push(`Removed ${removedBroken.length} broken symlink projection${removedBroken.length === 1 ? "" : "s"}.`);
    lines.push(`Relinked ${relinked.length} duplicate agent skill entr${relinked.length === 1 ? "y" : "ies"}.`);
    if (options.removeSuspicious) {
      lines.push(`Removed ${removedSuspicious.length} suspicious agent skill entr${removedSuspicious.length === 1 ? "y" : "ies"}.`);
    } else {
      lines.push("Suspicious agent skill entries were reported only. Re-run with --apply --remove-suspicious to remove them.");
    }
  }

  if (newEntries.length > 0) {
    lines.push("New agent skill entries were found. Use aweskill store import --scan with the same scope and agent filters to import them.");
  }

  context.write(lines.join("\n"));
  return {
    relinked,
    repairedBroken,
    removedBroken,
    removedStale,
    removedSuspicious,
    newEntries,
  };
}
