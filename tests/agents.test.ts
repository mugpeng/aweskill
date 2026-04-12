import { describe, expect, it } from "vitest";

import { detectInstalledAgents, getAgentDefinition, listSupportedAgentIds, resolveAgentSkillsDir } from "../src/lib/agents.js";
import { createTempWorkspace } from "./helpers.js";
import { mkdir } from "node:fs/promises";
import path from "node:path";

describe("agents", () => {
  it("defines the full supported agent list", () => {
    expect(listSupportedAgentIds()).toEqual([
      "amp",
      "claude-code",
      "cline",
      "codex",
      "cursor",
      "gemini-cli",
      "goose",
      "opencode",
      "roo",
      "windsurf",
    ]);
  });

  it("resolves well known agent directories", () => {
    expect(resolveAgentSkillsDir("claude-code", "global", "/tmp/home")).toContain(".claude/skills");
    expect(resolveAgentSkillsDir("gemini-cli", "global", "/tmp/home")).toContain(".gemini/skills");
    expect(getAgentDefinition("cursor").defaultProjectionMode).toBe("copy");
    expect(getAgentDefinition("opencode").rootDir("/tmp/home")).toContain(".opencode");
  });

  it("detects installed agents from root directories", async () => {
    const workspace = await createTempWorkspace();
    await mkdir(path.join(workspace.homeDir, ".codex"), { recursive: true });
    await mkdir(path.join(workspace.homeDir, ".gemini"), { recursive: true });
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });

    const installed = await detectInstalledAgents({
      homeDir: workspace.homeDir,
      projectDir: workspace.projectDir,
    });

    expect(installed).toEqual(["codex", "cursor", "gemini-cli"]);
  });
});
