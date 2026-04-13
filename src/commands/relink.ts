import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir, supportsScope } from "../lib/agents.js";
import { classifyCheckedSkill } from "./check.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { createSkillSymlink, listManagedSkillNames } from "../lib/symlink.js";
import { listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import type { AgentId, RuntimeContext, Scope } from "../types.js";

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

export async function runRelink(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
    apply?: boolean;
  },
) {
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  const centralSkillEntries = await listSkills(context.homeDir);
  const centralSkills = new Set(centralSkillEntries.map((skill) => skill.name));
  const centralSkillsDir = getAweskillPaths(context.homeDir).skillsDir;
  const baseDir = options.scope === "global" ? context.homeDir : projectDir!;

  const duplicates: string[] = [];
  const relinked: string[] = [];

  for (const agentId of agents) {
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, centralSkillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => classifyCheckedSkill(skill, managed, centralSkills));

    for (const skill of checked) {
      if (skill.category !== "duplicate") {
        continue;
      }

      duplicates.push(`${agentId}:${skill.name} ${skill.path}`);
      if (!options.apply) {
        continue;
      }

      await createSkillSymlink(getSkillPath(context.homeDir, skill.name), skill.path, {
        allowReplaceExisting: true,
      });
      relinked.push(`${agentId}:${skill.name}`);
    }
  }

  if (duplicates.length === 0) {
    context.write("No duplicate agent skill entries found.");
    return { duplicates, relinked };
  }

  const lines = ["Duplicate agent skill entries:"];
  for (const entry of duplicates) {
    lines.push(`  - ${entry}`);
  }

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
