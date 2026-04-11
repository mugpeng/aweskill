import { detectInstalledAgents, isAgentId } from "../lib/agents.js";
import { disableGlobalActivation, disableProjectActivation } from "../lib/config.js";
import { reconcileGlobal, reconcileProject } from "../lib/reconcile.js";
import type { ActivationType, AgentId, RuntimeContext, Scope } from "../types.js";

async function resolveAgents(context: RuntimeContext, agents: string[], scope: Scope, projectDir?: string): Promise<AgentId[]> {
  if (agents.length === 1 && agents[0] === "all") {
    const detected = await detectInstalledAgents({
      homeDir: context.homeDir,
      projectDir: scope === "project" ? projectDir : undefined,
    });
    if (detected.length === 0) {
      throw new Error("No installed agents detected for --agent all");
    }
    return detected;
  }

  return agents.map((agent) => {
    if (!isAgentId(agent)) {
      throw new Error(`Unsupported agent: ${agent}`);
    }
    return agent;
  });
}

export async function runDisable(
  context: RuntimeContext,
  options: {
    type: ActivationType;
    name: string;
    scope: Scope;
    agents: string[];
    projectDir?: string;
  },
) {
  const agents = await resolveAgents(context, options.agents, options.scope, options.projectDir);

  if (options.scope === "global") {
    await disableGlobalActivation(context.homeDir, {
      type: options.type,
      name: options.name,
      agents,
    });
    const result = await reconcileGlobal(context.homeDir);
    context.write(`Disabled ${options.type} ${options.name} for ${agents.join(", ")} in global scope`);
    return result;
  }

  const projectDir = options.projectDir ?? context.cwd;
  await disableProjectActivation(projectDir, {
    type: options.type,
    name: options.name,
    agents,
  });
  const result = await reconcileProject(context.homeDir, projectDir);
  context.write(`Disabled ${options.type} ${options.name} for ${agents.join(", ")} in ${projectDir}`);
  return result;
}
