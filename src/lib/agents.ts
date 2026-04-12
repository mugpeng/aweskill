import { access } from "node:fs/promises";
import path from "node:path";

import type { AgentDefinition, AgentId, ProjectionMode, Scope } from "../types.js";

const AGENTS: Record<AgentId, AgentDefinition> = {
  "claude-code": {
    id: "claude-code",
    displayName: "Claude Code",
    defaultProjectionMode: "symlink",
    globalSkillsDir: (homeDir) => path.join(homeDir, ".claude", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".claude", "skills"),
  },
  codex: {
    id: "codex",
    displayName: "Codex",
    defaultProjectionMode: "symlink",
    globalSkillsDir: (homeDir) => path.join(homeDir, ".codex", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".codex", "skills"),
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    defaultProjectionMode: "copy",
    globalSkillsDir: (homeDir) => path.join(homeDir, ".cursor", "skills"),
    projectSkillsDir: (projectDir) => path.join(projectDir, ".cursor", "skills"),
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
    const globalPath = agent.globalSkillsDir(options.homeDir);
    const projectPath = options.projectDir ? agent.projectSkillsDir(options.projectDir) : null;

    if (await pathExists(globalPath)) {
      installed.push(agent.id);
      continue;
    }

    if (projectPath && (await pathExists(projectPath))) {
      installed.push(agent.id);
    }
  }

  return installed.sort();
}
