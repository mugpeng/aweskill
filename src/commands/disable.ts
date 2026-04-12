import { detectInstalledAgents, isAgentId, listSupportedAgentIds } from "../lib/agents.js";
import { disableGlobalActivation, disableProjectActivation } from "../lib/config.js";
import { sanitizeName, uniqueSorted } from "../lib/path.js";
import { reconcileGlobal, reconcileProject } from "../lib/reconcile.js";
import type { ActivationType, AgentId, RuntimeContext, Scope } from "../types.js";

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

async function disableInScope(options: {
  context: RuntimeContext;
  type: ActivationType;
  name: string;
  agents: AgentId[];
  scope: Scope;
  projectDir?: string;
}) {
  const normalizedName = sanitizeName(options.name);

  if (options.scope === "global") {
    await disableGlobalActivation(options.context.homeDir, {
      type: options.type,
      name: normalizedName,
      agents: options.agents,
    });
    const result = await reconcileGlobal(options.context.homeDir);
    options.context.write(`Disabled ${options.type} ${normalizedName} for ${options.agents.join(", ")} in global scope`);
    return result;
  }

  const projectDir = getProjectDir(options.context, options.projectDir);
  await disableProjectActivation(projectDir, {
    type: options.type,
    name: normalizedName,
    agents: options.agents,
  });
  const result = await reconcileProject(options.context.homeDir, projectDir);
  options.context.write(`Disabled ${options.type} ${normalizedName} for ${options.agents.join(", ")} in ${projectDir}`);
  return result;
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
  const projectDir = options.scope === "project" ? getProjectDir(context, options.projectDir) : undefined;
  const agents = await resolveAgentsForScope(context, options.agents, options.scope, projectDir);
  return disableInScope({
    context,
    type: options.type,
    name: options.name,
    scope: options.scope,
    agents,
    projectDir,
  });
}
