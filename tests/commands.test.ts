import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createProgram } from "../src/index.js";
import { resolveAgentSkillsDir } from "../src/lib/agents.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("commands", () => {
  it("runs init, bundle, enable, list and sync", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: (message) => lines.push(`ERR:${message}`),
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "pr-review"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "frontend"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add-skill", "frontend", "pr-review"], { from: "node" });

    await mkdir(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(
      [
        "node",
        "aweskill",
        "enable",
        "bundle",
        "frontend",
        "--scope",
        "global",
        "--agent",
        "claude-code",
      ],
      { from: "node" },
    );
    await program.parseAsync(["node", "aweskill", "list", "status"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "sync"], { from: "node" });

    const targetPath = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "pr-review", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");
    expect(lines.join("\n")).toContain("GLOBAL");
  });

  it("supports project enable and disable flows", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });

    await program.parseAsync(
      [
        "node",
        "aweskill",
        "enable",
        "skill",
        "frontend-design",
        "--scope",
        "project",
        "--agent",
        "cursor",
        "--project",
        workspace.projectDir,
      ],
      { from: "node" },
    );
    const targetPath = path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");

    await program.parseAsync(
      [
        "node",
        "aweskill",
        "disable",
        "skill",
        "frontend-design",
        "--scope",
        "project",
        "--agent",
        "cursor",
        "--project",
        workspace.projectDir,
      ],
      { from: "node" },
    );
    await expect(readFile(targetPath, "utf8")).rejects.toThrow();
  });
});
