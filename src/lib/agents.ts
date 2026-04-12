import { access } from "node:fs/promises";
import path from "node:path";

import type { AgentDefinition, AgentId, ProjectionMode, Scope } from "../types.js";

const AGENTS: Record<AgentId, AgentDefinition> = {
  amp: {
    id: "amp",
    displayName: "Amp",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".amp"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".amp", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".amp", "skills"),
  },
  "claude-code": {
    id: "claude-code",
    displayName: "Claude Code",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".claude"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".claude", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".claude", "skills"),
  },
  cline: {
    id: "cline",
    displayName: "Cline",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".cline"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".cline", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cline", "skills"),
  },
  codex: {
    id: "codex",
    displayName: "Codex",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".codex"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".codex", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".codex", "skills"),
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    defaultProjectionMode: "copy",
    rootDir: (homeDir) => path.join(homeDir, ".cursor"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".cursor", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cursor", "skills"),
  },
  "gemini-cli": {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".gemini"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".gemini", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".gemini", "skills"),
  },
  goose: {
    id: "goose",
    displayName: "Goose",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".goose"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".goose", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".goose", "skills"),
  },
  opencode: {
    id: "opencode",
    displayName: "OpenCode",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".opencode"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".opencode", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".opencode", "skills"),
  },
  roo: {
    id: "roo",
    displayName: "Roo Code",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".roo"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".roo", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".roo", "skills"),
  },
  windsurf: {
    id: "windsurf",
    displayName: "Windsurf",
    defaultProjectionMode: "symlink",
    rootDir: (homeDir) => path.join(homeDir, ".windsurf"),
    globalSkillsDir: (homeDir) => path.join(homeDir, ".windsurf", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".windsurf", "skills"),
  },
};

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function listSupportedAgents(): AgentDefinition[] {
  return Object.values(AGENTS);
}

export function listSupportedAgentIds(): AgentId[] {
  return listSupportedAgents().map((agent) => agent.id).sort();
}

export function isAgentId(value: string): value is AgentId {
  return value in AGENTS;
}

export function getAgentDefinition(agentId: AgentId): AgentDefinition {
  return AGENTS[agentId];
}

export function resolveAgentSkillsDir(agentId: AgentId, scope: Scope, baseDir: string): string {
  const definition = getAgentDefinition(agentId);
  return scope === "global"
    ? definition.globalSkillsDir(baseDir)
    : definition.projectSkillsDir(baseDir);
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
    const globalRootPath = agent.rootDir(options.homeDir);
    const projectPath = options.projectDir ? agent.projectSkillsDir(options.projectDir) : null;

    if (await pathExists(globalRootPath)) {
      installed.push(agent.id);
      continue;
    }

    if (projectPath && (await pathExists(projectPath))) {
      installed.push(agent.id);
    }
  }

  return installed.sort();
}
