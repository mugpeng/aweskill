import { describe, expect, it } from "vitest";

import { detectInstalledAgents, getAgentDefinition, resolveAgentSkillsDir } from "../src/lib/agents.js";
import { createTempWorkspace } from "./helpers.js";
import { mkdir } from "node:fs/promises";

describe("agents", () => {
  it("resolves well known agent directories", () => {
    expect(resolveAgentSkillsDir("claude-code", "global", "/tmp/home")).toContain(".claude/skills");
    expect(getAgentDefinition("cursor").defaultProjectionMode).toBe("copy");
  });

  it("detects installed agents from directories", async () => {
    const workspace = await createTempWorkspace();
    await mkdir(resolveAgentSkillsDir("codex", "global", workspace.homeDir), { recursive: true });
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });

    const installed = await detectInstalledAgents({
      homeDir: workspace.homeDir,
      projectDir: workspace.projectDir,
    });

    expect(installed).toEqual(["codex", "cursor"]);
  });
});
