import path from "node:path";

import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { pathExists } from "../lib/fs.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { createSkillSymlink, listBrokenSymlinkNames, listManagedSkillNames, removeManagedProjection } from "../lib/symlink.js";
import { buildCentralCanonicalSkills, classifyCheckedSkill } from "./check.js";
import { resolveCanonicalSkillName } from "../lib/rmdup.js";
import { listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

async function resolveAgentsForScope(
  context: RuntimeContext,
  requestedAgents: string[],
  scope: Scope,
  projectDir?: string,
): Promise<AgentId[]> {
  if (requestedAgents.length === 0 || requestedAgents.includes("all")) {
    const detected = await detectInstalledAgents({
      homeDir: context.homeDir,
      projectDir: scope === "project" ? projectDir : undefined,
    });
    const candidates = detected.length > 0 ? detected : listSupportedAgentIds();
    return candidates.filter((agentId) => supportsScope(agentId, scope));
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

function formatGroupedEntries(
  title: string,
  groups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[],
  options: { verbose?: boolean; noun: string },
): string[] {
  if (groups.length === 0) {
    return [];
  }

  const lines = [title];
  for (const group of groups) {
    lines.push(`${group.agentId} ${group.skillsDir}: ${group.skillNames.length}`);
    const preview = options.verbose ? group.skillNames : group.skillNames.slice(0, DEFAULT_PREVIEW_COUNT);
    if (!options.verbose && group.skillNames.length > preview.length) {
      lines.push(`Showing first ${preview.length} ${options.noun} in ${group.agentId} (use --verbose to show all)`);
    }
    for (const skillName of preview) {
      lines.push(`  - ${skillName}`);
    }
    if (!options.verbose && group.skillNames.length > preview.length) {
      lines.push(`... and ${group.skillNames.length - preview.length} more (use --verbose to show all)`);
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
    verbose?: boolean;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  const { skillsDir: centralSkillsDir } = getAweskillPaths(context.homeDir);
  const centralSkillEntries = await listSkills(context.homeDir);
  const centralSkillNames = new Set(centralSkillEntries.map((skill) => skill.name));
  const canonicalSkillNames = buildCentralCanonicalSkills(context.homeDir, centralSkillEntries);
  const baseDir = options.scope === "global" ? context.homeDir : projectDir!;

  const exactDuplicateGroups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[] = [];
  const familyDuplicateGroups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[] = [];
  const brokenGroups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[] = [];
  const staleGroups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[] = [];
  const relinked: string[] = [];
  const repairedBroken: string[] = [];
  const removedBroken: string[] = [];
  const removed: string[] = [];

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, centralSkillsDir);
    const brokenSymlinks = await listBrokenSymlinkNames(skillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => classifyCheckedSkill(skill, managed, canonicalSkillNames));

    const exactDuplicateNames: string[] = [];
    const familyDuplicateNames: string[] = [];
    const brokenNames = Array.from(brokenSymlinks).sort((left, right) => left.localeCompare(right));
    const staleNames: string[] = [];

    for (const skillName of brokenNames) {
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

      if (skill.category !== "duplicate" && skill.category !== "matched") {
        continue;
      }

      if (skill.duplicateKind === "family") {
        familyDuplicateNames.push(skill.name);
      } else {
        exactDuplicateNames.push(skill.name);
      }
      if (!options.apply) {
        continue;
      }

      await createSkillSymlink(getSkillPath(context.homeDir, skill.canonicalName ?? skill.name), skill.path, {
        allowReplaceExisting: true,
      });
      relinked.push(`${agentId}:${skill.name}`);
    }

    for (const [skillName] of managed) {
      if (brokenSymlinks.has(skillName)) {
        continue;
      }

      const sourcePath = path.join(centralSkillsDir, skillName);
      if (await pathExists(sourcePath)) {
        continue;
      }
      staleNames.push(skillName);
      if (!options.apply) {
        continue;
      }

      const wasRemoved = await removeManagedProjection(path.join(skillsDir, skillName));
      if (wasRemoved) {
        removed.push(`${agentId}:${skillName}`);
      }
    }

    if (exactDuplicateNames.length > 0) {
      exactDuplicateGroups.push({ agentId, skillsDir, skillNames: exactDuplicateNames });
    }
    if (familyDuplicateNames.length > 0) {
      familyDuplicateGroups.push({ agentId, skillsDir, skillNames: familyDuplicateNames });
    }
    if (brokenNames.length > 0) {
      brokenGroups.push({ agentId, skillsDir, skillNames: brokenNames });
    }
    if (staleNames.length > 0) {
      staleGroups.push({ agentId, skillsDir, skillNames: staleNames });
    }
  }

  const lines = ["Agent sync findings:"];
  const staleLines = formatGroupedEntries("Stale managed projections:", staleGroups, {
    verbose: options.verbose,
    noun: "stale managed projections",
  });
  if (staleLines.length === 0) {
    lines.push("Stale managed projections:");
    lines.push("(none)");
  } else {
    lines.push(...staleLines);
  }

  lines.push("");

  const brokenLines = formatGroupedEntries("Broken symlink projections:", brokenGroups, {
    verbose: options.verbose,
    noun: "broken symlink projections",
  });
  if (brokenLines.length === 0) {
    lines.push("Broken symlink projections:");
    lines.push("(none)");
  } else {
    lines.push(...brokenLines);
  }

  lines.push("");

  const exactDuplicateLines = formatGroupedEntries("Exact-name duplicates:", exactDuplicateGroups, {
    verbose: options.verbose,
    noun: "exact-name duplicates",
  });
  const familyDuplicateLines = formatGroupedEntries("Rule-matched duplicates:", familyDuplicateGroups, {
    verbose: options.verbose,
    noun: "rule-matched duplicates",
  });
  if (exactDuplicateLines.length === 0 && familyDuplicateLines.length === 0) {
    lines.push("Duplicate agent skill entries:");
    lines.push("(none)");
  } else {
    lines.push("Duplicate agent skill entries:");
    if (exactDuplicateLines.length === 0) {
      lines.push("Exact-name duplicates:");
      lines.push("(none)");
    } else {
      lines.push(...exactDuplicateLines);
    }
    if (familyDuplicateLines.length === 0) {
      lines.push("Rule-matched duplicates:");
      lines.push("(none)");
    } else {
      lines.push(...familyDuplicateLines);
    }
  }

  lines.push("");

  if (!options.apply) {
    lines.push("Dry run only. Use --apply to repair broken and duplicate agent skill entries and remove stale managed projections.");
    context.write(lines.join("\n"));
    return {
      staleGroups,
      brokenGroups,
      exactDuplicateGroups,
      familyDuplicateGroups,
      removed,
      removedBroken,
      repairedBroken,
      relinked,
    };
  }

  lines.push(`Removed ${removed.length} stale projection(s).`);
  lines.push(`Repaired ${repairedBroken.length} broken symlink projection${repairedBroken.length === 1 ? "" : "s"}.`);
  lines.push(`Removed ${removedBroken.length} broken symlink projection${removedBroken.length === 1 ? "" : "s"}.`);
  lines.push(`Relinked ${relinked.length} duplicate agent skill entr${relinked.length === 1 ? "y" : "ies"}.`);
  context.write(lines.join("\n"));
  return {
    staleGroups,
    brokenGroups,
    exactDuplicateGroups,
    familyDuplicateGroups,
    removed,
    removedBroken,
    repairedBroken,
    relinked,
  };
}
