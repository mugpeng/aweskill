import { describe, expect, it } from "vitest";

import { detectInstalledAgents, getAgentDefinition, listSupportedAgentIds, resolveAgentSkillsDir } from "../src/lib/agents.js";
import { createTempWorkspace } from "./helpers.js";
import { mkdir } from "node:fs/promises";
import path from "node:path";

describe("agents", () => {
  it("defines the full supported agent list", () => {
    expect(listSupportedAgentIds()).toEqual([
      "adal",
      "amp",
      "antigravity",
      "augment",
      "claude-code",
      "cline",
      "codebuddy",
      "codex",
      "command-code",
      "copilot",
      "crush",
      "cursor",
      "droid",
      "gemini-cli",
      "goose",
      "kilo-code",
      "kiro-cli",
      "kode",
      "mistral-vibe",
      "mux",
      "neovate",
      "openclaude-ide",
      "openclaw",
      "opencode",
      "openhands",
      "qoder",
      "qwen-code",
      "replit",
      "roo",
      "trae",
      "trae-cn",
      "windsurf",
    ]);
  });

  it("resolves well known agent directories", () => {
    expect(resolveAgentSkillsDir("claude-code", "global", "/tmp/home")).toContain(".claude/skills");
    expect(resolveAgentSkillsDir("gemini-cli", "global", "/tmp/home")).toContain(".gemini/skills");
    expect(getAgentDefinition("cursor").defaultProjectionMode).toBe("symlink");
    expect(getAgentDefinition("opencode").rootDir("/tmp/home")).toContain(".opencode");
    expect(resolveAgentSkillsDir("augment", "global", "/tmp/home")).toContain(".augment/rules");
    expect(resolveAgentSkillsDir("replit", "project", "/tmp/project")).toContain(".agent/skills");
    expect(resolveAgentSkillsDir("windsurf", "global", "/tmp/home")).toContain(".codeium/windsurf/skills");
  });

  it("detects installed agents from root directories", async () => {
    const workspace = await createTempWorkspace();
    await mkdir(path.join(workspace.homeDir, ".codex"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".gemini"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".augment"), { recursive: true });
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });
    await mkdir(resolveAgentSkillsDir("replit", "project", workspace.projectDir), { recursive: true });

    const installed = await detectInstalledAgents({
      homeDir: workspace.homeDir,
      projectDir: workspace.projectDir,
    });

    expect(installed).toEqual(["augment", "codex", "cursor", "gemini-cli", "replit"]);
  });
});
