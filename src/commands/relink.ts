import type { AgentId } from "../lib/agents.js";
import { resolveAgentSkillsDir, resolveAgentsForMutation } from "../lib/agents.js";
import { getAweskillPaths } from "../lib/path.js";
import { getSkillPath, listSkillEntriesInDirectory, listSkills } from "../lib/skills.js";
import { createSkillSymlink, listManagedSkillNames } from "../lib/symlink.js";
import type { RuntimeContext, Scope } from "../types.js";
import { classifyCheckedSkill } from "./agent-inspection.js";

const DEFAULT_PREVIEW_COUNT = 5;

function getProjectDir(context: RuntimeContext, explicitProjectDir?: string): string {
  return explicitProjectDir ?? context.cwd;
}

function formatDuplicateGroups(
  groups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[],
  verbose = false,
): string[] {
  const lines: string[] = ["Duplicate agent skill entries:"];

  for (const group of groups) {
    lines.push(`${group.agentId} ${group.skillsDir}: ${group.skillNames.length}`);
    const preview = verbose ? group.skillNames : group.skillNames.slice(0, DEFAULT_PREVIEW_COUNT);
    if (!verbose && group.skillNames.length > preview.length) {
      lines.push(
        `Showing first ${preview.length} duplicate agent skill entries in ${group.agentId} (use --verbose to show all)`,
      );
    }
    for (const skillName of preview) {
      lines.push(`  - ${skillName}`);
    }
    if (!verbose && group.skillNames.length > preview.length) {
      lines.push(`... and ${group.skillNames.length - preview.length} more (use --verbose to show all)`);
    }
  }

  return lines;
}

export async function runRelink(
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
  const agents = await resolveAgentsForMutation({
    requestedAgents: options.agents,
    scope: options.scope,
    homeDir: context.homeDir,
    projectDir,
  });
  const centralSkillEntries = await listSkills(context.homeDir);
  const centralSkills = new Set(centralSkillEntries.map((skill) => skill.name));
  const centralSkillsDir = getAweskillPaths(context.homeDir).skillsDir;
  const baseDir = options.scope === "global" ? context.homeDir : projectDir!;

  const duplicates: string[] = [];
  const relinked: string[] = [];
  const duplicateGroups: { agentId: AgentId; skillsDir: string; skillNames: string[] }[] = [];

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, centralSkillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => classifyCheckedSkill(skill, managed, centralSkills));

    const groupSkillNames: string[] = [];
    for (const skill of checked) {
      if (skill.category !== "duplicate") {
        continue;
      }

      duplicates.push(`${agentId}:${skill.name} ${skill.path}`);
      groupSkillNames.push(skill.name);
      if (!options.apply) {
        continue;
      }

      await createSkillSymlink(getSkillPath(context.homeDir, skill.name), skill.path, {
        allowReplaceExisting: true,
      });
      relinked.push(`${agentId}:${skill.name}`);
    }

    if (groupSkillNames.length > 0) {
      duplicateGroups.push({
        agentId,
        skillsDir,
        skillNames: groupSkillNames,
      });
    }
  }

  if (duplicates.length === 0) {
    context.write("No duplicate agent skill entries found.");
    return { duplicates, relinked };
  }

  const lines = formatDuplicateGroups(duplicateGroups, options.verbose);

  if (!options.apply) {
    lines.push("");
    lines.push("Dry run only. Use --apply to relink duplicate agent skill entries.");
    context.write(lines.join("\n"));
    return { duplicates, relinked };
  }

  lines.push("");
  lines.push(`Relinked ${relinked.length} duplicate agent skill entr${relinked.length === 1 ? "y" : "ies"}.`);
  context.write(lines.join("\n"));
  return { duplicates, relinked };
}
