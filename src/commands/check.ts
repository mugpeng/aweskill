import { detectInstalledAgents, isAgentId, listSupportedAgentIds, resolveAgentSkillsDir } from "../lib/agents.js";
import { listSkillEntriesInDirectory, listSkills } from "../lib/skills.js";
import { uniqueSorted } from "../lib/path.js";
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

function formatSkillBlock(title: string, skills: Awaited<ReturnType<typeof listSkills>>): string[] {
  if (skills.length === 0) {
    return [`No skills found in ${title.toLowerCase()}.`];
  }

  const lines = [`${title}:`];
  for (const skill of skills) {
    const marker = skill.hasSKILLMd ? "✓" : "!";
    lines.push(`  ${marker} ${skill.name} ${skill.path}`);
  }
  return lines;
}

export async function runCheck(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
  },
) {
  const lines: string[] = [];
  const centralSkills = await listSkills(context.homeDir);
  lines.push(...formatSkillBlock("Skills in central repo", centralSkills));

  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);

  for (const agentId of agents) {
    const baseDir = options.scope === "global" ? context.homeDir : projectDir!;
    const skillsDir = resolveAgentSkillsDir(agentId, options.scope, baseDir);
    const skills = await listSkillEntriesInDirectory(skillsDir);
    const title = options.scope === "global"
      ? `Global skills for ${agentId}`
      : `Project skills for ${agentId} (${projectDir})`;
    lines.push("");
    lines.push(...formatSkillBlock(title, skills));
  }

  context.write(lines.join("\n").trim());
  return { centralSkills, agents };
}
