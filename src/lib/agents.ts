import path from "node:path";

import type { AgentDefinition, AgentId, ProjectionMode, Scope } from "../types.js";
import { pathExists } from "./fs.js";
import { uniqueSorted } from "./path.js";

function defineAgent(
  id: AgentId,
  displayName: string,
  options: {
    defaultProjectionMode?: ProjectionMode;
    rootDir: (homeDir: string) => string;
    globalSkillsDir?: (homeDir: string) => string;
    projectSkillsDir?: (projectDir: string) => string;
  },
): AgentDefinition {
  return {
    id,
    displayName,
    defaultProjectionMode: options.defaultProjectionMode ?? "symlink",
    supportsGlobal: Boolean(options.globalSkillsDir),
    supportsProject: Boolean(options.projectSkillsDir),
    rootDir: options.rootDir,
    globalSkillsDir: options.globalSkillsDir,
    projectSkillsDir: options.projectSkillsDir,
  };
}

const AGENTS: Record<AgentId, AgentDefinition> = {
  adal: defineAgent("adal", "AdaL", {
    rootDir: (homeDir) => path.join(homeDir, ".adal"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".adal", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".adal", "skills"),
  }),
  amp: defineAgent("amp", "Amp", {
    rootDir: (homeDir) => path.join(homeDir, ".agents"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".agents", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".agents", "skills"),
  }),
  antigravity: defineAgent("antigravity", "Antigravity", {
    rootDir: (homeDir) => path.join(homeDir, ".gemini", "antigravity"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".gemini", "antigravity", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".gemini", "antigravity", "skills"),
  }),
  augment: defineAgent("augment", "Augment", {
    rootDir: (homeDir) => path.join(homeDir, ".augment"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".augment", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".augment", "skills"),
  }),
  bob: defineAgent("bob", "IBM Bob", {
    rootDir: (homeDir) => path.join(homeDir, ".bob"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".bob", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".bob", "skills"),
  }),
  "claude-code": defineAgent("claude-code", "Claude Code", {
    rootDir: (homeDir) => path.join(homeDir, ".claude"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".claude", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".claude", "skills"),
  }),
  cline: defineAgent("cline", "Cline", {
    rootDir: (homeDir) => path.join(homeDir, ".cline"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".cline", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cline", "skills"),
  }),
  codebuddy: defineAgent("codebuddy", "CodeBuddy", {
    rootDir: (homeDir) => path.join(homeDir, ".codebuddy"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".codebuddy", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".codebuddy", "skills"),
  }),
  "command-code": defineAgent("command-code", "Command Code", {
    rootDir: (homeDir) => path.join(homeDir, ".commandcode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".commandcode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".commandcode", "skills"),
  }),
  continue: defineAgent("continue", "Continue", {
    rootDir: (homeDir) => path.join(homeDir, ".continue"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".continue", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".continue", "skills"),
  }),
  codex: defineAgent("codex", "Codex", {
    rootDir: (homeDir) => path.join(homeDir, ".codex"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".codex", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".codex", "skills"),
  }),
  copilot: defineAgent("copilot", "GitHub Copilot", {
    rootDir: (homeDir) => path.join(homeDir, ".copilot"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".copilot", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".copilot", "skills"),
  }),
  cortex: defineAgent("cortex", "Cortex Code", {
    rootDir: (homeDir) => path.join(homeDir, ".snowflake", "cortex"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".snowflake", "cortex", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cortex", "skills"),
  }),
  crush: defineAgent("crush", "Crush", {
    rootDir: (homeDir) => path.join(homeDir, ".config", "crush"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".config", "crush", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".config", "crush", "skills"),
  }),
  cursor: defineAgent("cursor", "Cursor", {
    rootDir: (homeDir) => path.join(homeDir, ".cursor"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".cursor", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cursor", "skills"),
  }),
  deepagents: defineAgent("deepagents", "Deep Agents", {
    rootDir: (homeDir) => path.join(homeDir, ".deepagents"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".deepagents", "agent", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".deepagents", "agent", "skills"),
  }),
  droid: defineAgent("droid", "Droid", {
    rootDir: (homeDir) => path.join(homeDir, ".factory"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".factory", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".factory", "skills"),
  }),
  firebender: defineAgent("firebender", "Firebender", {
    rootDir: (homeDir) => path.join(homeDir, ".firebender"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".firebender", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".firebender", "skills"),
  }),
  "gemini-cli": defineAgent("gemini-cli", "Gemini CLI", {
    rootDir: (homeDir) => path.join(homeDir, ".gemini"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".gemini", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".gemini", "skills"),
  }),
  "github-copilot": defineAgent("github-copilot", "GitHub Copilot", {
    rootDir: (homeDir) => path.join(homeDir, ".copilot"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".copilot", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".copilot", "skills"),
  }),
  goose: defineAgent("goose", "Goose", {
    rootDir: (homeDir) => path.join(homeDir, ".goose"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".goose", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".goose", "skills"),
  }),
  "iflow-cli": defineAgent("iflow-cli", "iFlow CLI", {
    rootDir: (homeDir) => path.join(homeDir, ".iflow"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".iflow", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".iflow", "skills"),
  }),
  junie: defineAgent("junie", "Junie", {
    rootDir: (homeDir) => path.join(homeDir, ".junie"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".junie", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".junie", "skills"),
  }),
  kilo: defineAgent("kilo", "Kilo Code", {
    rootDir: (homeDir) => path.join(homeDir, ".kilocode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".kilocode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".kilocode", "skills"),
  }),
  "kiro-cli": defineAgent("kiro-cli", "Kiro CLI", {
    rootDir: (homeDir) => path.join(homeDir, ".kiro"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".kiro", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".kiro", "skills"),
  }),
  "kilo-code": defineAgent("kilo-code", "Kilo Code", {
    rootDir: (homeDir) => path.join(homeDir, ".kilocode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".kilocode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".kilocode", "skills"),
  }),
  "kimi-cli": defineAgent("kimi-cli", "Kimi Code CLI", {
    rootDir: (homeDir) => path.join(homeDir, ".kimi"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".kimi", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".kimi", "skills"),
  }),
  kode: defineAgent("kode", "Kode", {
    rootDir: (homeDir) => path.join(homeDir, ".kode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".kode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".kode", "skills"),
  }),
  mcpjam: defineAgent("mcpjam", "MCPJam", {
    rootDir: (homeDir) => path.join(homeDir, ".mcpjam"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".mcpjam", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".mcpjam", "skills"),
  }),
  "mistral-vibe": defineAgent("mistral-vibe", "Mistral Vibe", {
    rootDir: (homeDir) => path.join(homeDir, ".vibe"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".vibe", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".vibe", "skills"),
  }),
  mux: defineAgent("mux", "Mux", {
    rootDir: (homeDir) => path.join(homeDir, ".mux"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".mux", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".mux", "skills"),
  }),
  neovate: defineAgent("neovate", "Neovate", {
    rootDir: (homeDir) => path.join(homeDir, ".neovate"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".neovate", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".neovate", "skills"),
  }),
  openclaw: defineAgent("openclaw", "OpenClaw", {
    rootDir: (homeDir) => path.join(homeDir, ".openclaw"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".openclaw", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".openclaw", "skills"),
  }),
  "openclaude-ide": defineAgent("openclaude-ide", "OpenClaude IDE", {
    rootDir: (homeDir) => path.join(homeDir, ".openclaude"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".openclaude", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".openclaude", "skills"),
  }),
  openhands: defineAgent("openhands", "OpenHands", {
    rootDir: (homeDir) => path.join(homeDir, ".openhands"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".openhands", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".openhands", "skills"),
  }),
  opencode: defineAgent("opencode", "OpenCode", {
    rootDir: (homeDir) => path.join(homeDir, ".opencode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".opencode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".opencode", "skills"),
  }),
  pi: defineAgent("pi", "Pi", {
    rootDir: (homeDir) => path.join(homeDir, ".pi", "agent"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".pi", "agent", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".pi", "agent", "skills"),
  }),
  pochi: defineAgent("pochi", "Pochi", {
    rootDir: (homeDir) => path.join(homeDir, ".pochi"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".pochi", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".pochi", "skills"),
  }),
  qoder: defineAgent("qoder", "Qoder", {
    rootDir: (homeDir) => path.join(homeDir, ".qoder"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".qoder", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".qoder", "skills"),
  }),
  "qwen-code": defineAgent("qwen-code", "Qwen Code", {
    rootDir: (homeDir) => path.join(homeDir, ".qwen"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".qwen", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".qwen", "skills"),
  }),
  replit: defineAgent("replit", "Replit", {
    rootDir: (homeDir) => path.join(homeDir, ".config", "replit"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".agent", "skills"),
  }),
  roo: defineAgent("roo", "Roo Code", {
    rootDir: (homeDir) => path.join(homeDir, ".roo"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".roo", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".roo", "skills"),
  }),
  trae: defineAgent("trae", "Trae", {
    rootDir: (homeDir) => path.join(homeDir, ".trae"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".trae", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".trae", "skills"),
  }),
  "trae-cn": defineAgent("trae-cn", "Trae CN", {
    rootDir: (homeDir) => path.join(homeDir, ".trae-cn"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".trae-cn", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".trae-cn", "skills"),
  }),
  warp: defineAgent("warp", "Warp", {
    rootDir: (homeDir) => path.join(homeDir, ".warp"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".warp", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".warp", "skills"),
  }),
  windsurf: defineAgent("windsurf", "Windsurf", {
    rootDir: (homeDir) => path.join(homeDir, ".codeium", "windsurf"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".codeium", "windsurf", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".codeium", "windsurf", "skills"),
  }),
  zencoder: defineAgent("zencoder", "Zencoder", {
    rootDir: (homeDir) => path.join(homeDir, ".zencoder"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".zencoder", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".zencoder", "skills"),
  }),
};

export function listSupportedAgents(): AgentDefinition[] {
  return Object.values(AGENTS).sort((left, right) => left.id.localeCompare(right.id));
}

export function listSupportedAgentIds(): AgentId[] {
  return listSupportedAgents().map((agent) => agent.id);
}

export function formatDetectedAgentsForScope(scope: Scope, agents: AgentId[], projectDir?: string): string {
  const countLabel = `${agents.length} agent${agents.length === 1 ? "" : "s"}`;
  if (scope === "global") {
    return `Detected ${countLabel} for global scope: ${agents.join(", ")}`;
  }
  return `Detected ${countLabel} for project scope at ${projectDir}: ${agents.join(", ")}`;
}

export function supportsScope(agentId: AgentId, scope: Scope): boolean {
  const definition = getAgentDefinition(agentId);
  return scope === "global" ? definition.supportsGlobal : definition.supportsProject;
}

export function isAgentId(value: string): value is AgentId {
  return value in AGENTS;
}

export function getAgentDefinition(agentId: AgentId): AgentDefinition {
  return AGENTS[agentId];
}

export function resolveAgentSkillsDir(agentId: AgentId, scope: Scope, baseDir: string): string {
  const definition = getAgentDefinition(agentId);
  const resolver = scope === "global" ? definition.globalSkillsDir : definition.projectSkillsDir;
  if (!resolver) {
    throw new Error(`Agent ${agentId} does not support ${scope} scope.`);
  }
  return resolver(baseDir);
}

export function getProjectionMode(agentId: AgentId): ProjectionMode {
  return getAgentDefinition(agentId).defaultProjectionMode;
}

export async function detectInstalledAgents(options: {
  homeDir: string;
  projectDir?: string;
}): Promise<AgentId[]> {
  const installed: AgentId[] = [];

  for (const agent of listSupportedAgents()) {
    const globalRootPath = agent.supportsGlobal ? agent.rootDir(options.homeDir) : null;
    const projectPath = agent.supportsProject && options.projectDir
      ? resolveAgentSkillsDir(agent.id, "project", options.projectDir)
      : null;

    if (globalRootPath && (await pathExists(globalRootPath))) {
      installed.push(agent.id);
      continue;
    }

    if (projectPath && (await pathExists(projectPath))) {
      installed.push(agent.id);
    }
  }

  return installed;
}

export async function listSupportedAgentsWithGlobalStatus(homeDir: string): Promise<Array<{
  id: AgentId;
  displayName: string;
  installed: boolean;
  skillsDir?: string;
}>> {
  const results: Array<{
    id: AgentId;
    displayName: string;
    installed: boolean;
    skillsDir?: string;
  }> = [];

  for (const agent of listSupportedAgents()) {
    if (!agent.supportsGlobal || !agent.globalSkillsDir) {
      results.push({
        id: agent.id,
        displayName: agent.displayName,
        installed: false,
      });
      continue;
    }

    const skillsDir = agent.globalSkillsDir(homeDir);
    results.push({
      id: agent.id,
      displayName: agent.displayName,
      installed: await pathExists(agent.rootDir(homeDir)),
      skillsDir,
    });
  }

  return results;
}

/** Agents to scan for `agent list` / `doctor sync` when the user does not name specific agents. */
export async function detectAgentsForListingScope(
  homeDir: string,
  scope: Scope,
  projectDir?: string,
): Promise<AgentId[]> {
  const installed: AgentId[] = [];

  for (const agent of listSupportedAgents()) {
    if (scope === "global") {
      if (!agent.supportsGlobal) {
        continue;
      }
      const rootPath = agent.rootDir(homeDir);
      if (await pathExists(rootPath)) {
        installed.push(agent.id);
      }
    } else {
      if (!agent.supportsProject || !projectDir) {
        continue;
      }
      const skillsPath = resolveAgentSkillsDir(agent.id, "project", projectDir);
      if (await pathExists(skillsPath)) {
        installed.push(agent.id);
      }
    }
  }

  return installed;
}

export async function resolveAgentsForListingOrSync(options: {
  requestedAgents: string[];
  scope: Scope;
  homeDir: string;
  projectDir?: string;
}): Promise<{ agents: AgentId[]; explicit: boolean }> {
  const wantsAll = options.requestedAgents.length === 0 || options.requestedAgents.includes("all");

  if (!wantsAll) {
    const agents = uniqueSorted(
      options.requestedAgents.map((agent) => {
        if (!isAgentId(agent)) {
          throw new Error(`Unsupported agent: ${agent}`);
        }
        if (!supportsScope(agent, options.scope)) {
          throw new Error(`Agent ${agent} does not support ${options.scope} scope.`);
        }
        return agent;
      }),
    );
    return { agents, explicit: true };
  }

  const agents = await detectAgentsForListingScope(options.homeDir, options.scope, options.projectDir);
  return { agents, explicit: false };
}

export async function resolveAgentsForMutation(options: {
  requestedAgents: string[];
  scope: Scope;
  homeDir: string;
  projectDir?: string;
}): Promise<AgentId[]> {
  const wantsDetected = options.requestedAgents.length === 0;
  if (wantsDetected) {
    const detected = await detectAgentsForListingScope(options.homeDir, options.scope, options.projectDir);
    if (detected.length === 0) {
      throw new Error(formatNoInstalledAgentsForMutation(options.scope, options.projectDir));
    }
    return detected;
  }

  const wantsAll = options.requestedAgents.includes("all");
  if (wantsAll) {
    return listSupportedAgentIds().filter((agentId) => supportsScope(agentId, options.scope));
  }

  return uniqueSorted(
    options.requestedAgents.map((agent) => {
      if (!isAgentId(agent)) {
        throw new Error(`Unsupported agent: ${agent}`);
      }
      if (!supportsScope(agent, options.scope)) {
        throw new Error(`Agent ${agent} does not support ${options.scope} scope.`);
      }
      return agent;
    }),
  );
}

export function formatNoAgentsDetectedForScope(scope: Scope, projectDir: string | undefined): string {
  if (scope === "global") {
    return "No agents detected for global scope (no supported agent installation directories were found). Install an agent or pass --agent <id> to inspect a specific agent.";
  }
  return `No agents detected for project scope at ${projectDir}. Add project-local agent skill directories or pass --agent <id> to inspect a specific agent.`;
}

export function formatNoInstalledAgentsForMutation(scope: Scope, projectDir: string | undefined): string {
  if (scope === "global") {
    return 'No installed agents detected for global scope. Install an agent or pass --agent <id> or --agent all explicitly.';
  }
  return `No installed agents detected for project scope at ${projectDir}. Add a project-local agent skill directory or pass --agent <id> or --agent all explicitly.`;
}
