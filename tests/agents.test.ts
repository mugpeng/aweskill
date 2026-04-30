import { mkdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectInstalledAgents,
  getAgentDefinition,
  listSupportedAgentIds,
  resolveAgentSkillsDir,
} from "../src/lib/agents.js";
import { createTempWorkspace } from "./helpers.js";

describe("agents", () => {
  it("defines the full supported agent list", () => {
    const ids = listSupportedAgentIds();
    expect(ids.length).toBeGreaterThanOrEqual(47);
    expect(ids).toContain("claude-code");
    expect(ids).toContain("cursor");
    expect(ids).toContain("zencoder");
    expect(ids).toEqual([...ids].sort());
  });

  it("resolves well known agent directories", () => {
    expect(resolveAgentSkillsDir("claude-code", "global", "/tmp/home")).toContain(".claude/skills");
    expect(resolveAgentSkillsDir("gemini-cli", "global", "/tmp/home")).toContain(".gemini/skills");
    expect(getAgentDefinition("cursor").defaultProjectionMode).toBe("symlink");
    expect(getAgentDefinition("opencode").rootDir("/tmp/home")).toContain(".opencode");
    expect(resolveAgentSkillsDir("augment", "global", "/tmp/home")).toContain(".augment/skills");
    expect(resolveAgentSkillsDir("github-copilot", "global", "/tmp/home")).toContain(".copilot/skills");
    expect(resolveAgentSkillsDir("deepagents", "global", "/tmp/home")).toContain(".deepagents/agent/skills");
    expect(resolveAgentSkillsDir("replit", "project", "/tmp/project")).toContain(".agent/skills");
    expect(resolveAgentSkillsDir("windsurf", "global", "/tmp/home")).toContain(".codeium/windsurf/skills");
  });

  it("detects installed agents from root directories", async () => {
    const workspace = await createTempWorkspace();
    await mkdir(path.join(workspace.homeDir, ".codex"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".gemini"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".augment"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".bob"), { recursive: true });
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });
    await mkdir(resolveAgentSkillsDir("replit", "project", workspace.projectDir), { recursive: true });

    const installed = await detectInstalledAgents({
      homeDir: workspace.homeDir,
      projectDir: workspace.projectDir,
    });

    expect(installed).toEqual(["augment", "bob", "codex", "cursor", "gemini-cli", "replit"]);
  });
});
