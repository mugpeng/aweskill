import { isAgentId } from "../lib/agents.js";
import { filterRegistrySkills, readRegistry } from "../lib/registry.js";
import type { RuntimeContext, Scope } from "../types.js";

function getScope(value: string): Scope {
  if (value === "global" || value === "project") {
    return value;
  }
  throw new Error(`Unsupported scope: ${value}`);
}

export { getScope as getRegistryScope };

export async function runRegistryShow(
  context: RuntimeContext,
  options: {
    agentId: string;
    scope?: Scope;
    projectDir?: string;
  },
) {
  if (!isAgentId(options.agentId)) {
    throw new Error(`Unsupported agent: ${options.agentId}`);
  }

  const registry = await readRegistry(context.homeDir, options.agentId);
  if (!registry) {
    throw new Error(`Missing registry for agent: ${options.agentId}`);
  }

  const filtered = filterRegistrySkills(registry, {
    scope: options.scope,
    projectDir: options.projectDir,
  });
  const output = {
    ...registry,
    skills: filtered,
  };

  context.write(JSON.stringify(output, null, 2));
  return output;
}
