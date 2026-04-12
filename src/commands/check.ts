import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { importSkill } from "../lib/import.js";
import { getAweskillPaths, uniqueSorted } from "../lib/path.js";
import { listSkillEntriesInDirectory, listSkills, getSkillPath } from "../lib/skills.js";
import { listManagedSkillNames, createSkillSymlink } from "../lib/symlink.js";
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
    return detected.length > 0 ? detected : listSupportedAgentIds();
  }

  return uniqueSorted(
    requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      return agent;
    }),
  );
}

type CheckCategory = "linked" | "duplicate" | "new";

interface CheckedSkill {
  name: string;
  path: string;
  category: CheckCategory;
  hasSKILLMd: boolean;
}

function formatSkillBlock(title: string, skills: CheckedSkill[]): string[] {
  if (skills.length === 0) {
    return [`No skills found for ${title.replace(/:$/, "").toLowerCase()}.`];
  }

  const lines = [title];
  const categories: Array<{ title: string; marker: string; key: CheckCategory }> = [
    { title: "  linked:", marker: "✓", key: "linked" },
    { title: "  duplicate:", marker: "!", key: "duplicate" },
    { title: "  new:", marker: "+", key: "new" },
  ];

  for (const category of categories) {
    const entries = skills.filter((skill) => skill.category === category.key);
    if (entries.length === 0) {
      continue;
    }

    lines.push(category.title);
    for (const skill of entries) {
      lines.push(`    ${category.marker} ${skill.name} ${skill.path}`);
    }
  }

  return lines;
}

export async function runCheck(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
    update?: boolean;
  },
) {
  const lines: string[] = [];
  const centralSkillEntries = await listSkills(context.homeDir);
  const centralSkills = new Set(centralSkillEntries.map((skill) => skill.name));

  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  const updated: string[] = [];
  let importedCount = 0;

  for (const agentId of agents) {
    const baseDir = options.scope === "global" ? context.homeDir : projectDir!;
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const managed = await listManagedSkillNames(skillsDir, getAweskillPaths(context.homeDir).skillsDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const checked = skills.map((skill) => {
      let category: CheckCategory = "new";
      if (managed.has(skill.name)) {
        category = "linked";
      } else if (centralSkills.has(skill.name)) {
        category = "duplicate";
      }

      return {
        name: skill.name,
        path: skill.path,
        category,
        hasSKILLMd: skill.hasSKILLMd,
      } satisfies CheckedSkill;
    });

    if (options.update) {
      for (const skill of checked) {
        if (skill.category === "linked") {
          continue;
        }

        if (!skill.hasSKILLMd) {
          context.write(`Warning: Skipping ${agentId}:${skill.name}; missing SKILL.md in ${skill.path}`);
          continue;
        }

        if (skill.category === "new") {
          await importSkill({
            homeDir: context.homeDir,
            sourcePath: skill.path,
            mode: "mv",
          });
          centralSkills.add(skill.name);
          importedCount += 1;
        }

        await createSkillSymlink(getSkillPath(context.homeDir, skill.name), skill.path, {
          allowReplaceExisting: true,
        });
        updated.push(`${agentId}:${skill.name}`);
      }
    }

    const title = options.scope === "global"
      ? `Global skills for ${agentId}:`
      : `Project skills for ${agentId} (${projectDir}):`;
    lines.push("");
    lines.push(...formatSkillBlock(title, checked));
  }

  if (options.update) {
    lines.push("");
    lines.push(`Updated ${updated.length} skills`);
    if (importedCount > 0) {
      lines.push(`Imported ${importedCount} new skills into the central repo`);
    }
  }

  context.write(lines.join("\n").trim());
  return { agents, updated, importedCount };
}
