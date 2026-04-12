import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram, main } from "../src/index.js";
import { resolveAgentSkillsDir } from "../src/lib/agents.js";
import { readGlobalConfig, readProjectConfig, writeGlobalConfig } from "../src/lib/config.js";
import { readRegistry } from "../src/lib/registry.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("commands", () => {
  afterEach(() => {
    process.exitCode = 0;
    vi.restoreAllMocks();
  });

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
    expect(lines.join("\n")).toContain("REGISTRY");
  });

  it("supports bundle delete", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "create", "frontend"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "delete", "frontend"], { from: "node" });

    await expect(program.parseAsync(["node", "aweskill", "bundle", "show", "frontend"], { from: "node" })).rejects.toThrow();
  });

  it("lists skills with aweskill_cc-style summary lines", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "one-password"), "1Password");
    await program.parseAsync(["node", "aweskill", "list", "skills"], { from: "node" });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Skills in central repo:");
    expect(lines[0]).toContain(`  ✓ one-password ${getSkillPath(workspace.homeDir, "one-password")}`);
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
    const registry = await readRegistry(workspace.homeDir, "cursor");
    expect(registry?.skills.find((entry) => entry.name === "frontend-design" && entry.scope === "project")).toBeUndefined();
  });

  it("defaults enable to all scopes and all agents", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await program.parseAsync(["node", "aweskill", "enable", "skill", "biopython"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("cursor", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "project", workspace.projectDir), "biopython", "SKILL.md"), "utf8"),
    ).rejects.toThrow();

    expect((await readGlobalConfig(workspace.homeDir)).activations).toHaveLength(1);
    expect((await readProjectConfig(workspace.projectDir)).activations).toHaveLength(0);
  });

  it("fails before writing config when a target path is unmanaged", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));

    const conflictedTarget = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "biopython");
    await mkdir(conflictedTarget, { recursive: true });
    await writeFile(path.join(conflictedTarget, "SKILL.md"), "# Foreign Skill\n", "utf8");

    await expect(
      program.parseAsync(
        ["node", "aweskill", "enable", "skill", "biopython", "--scope", "global", "--agent", "claude-code"],
        { from: "node" },
      ),
    ).rejects.toThrow(`Refusing to overwrite non-symlink target: ${conflictedTarget}`);

    expect((await readGlobalConfig(workspace.homeDir)).activations).toHaveLength(0);
  });

  it("prints friendly cli errors instead of a stack trace", async () => {
    const workspace = await createTempWorkspace();
    const previousCwd = process.cwd();
    const previousHome = process.env.AWESKILL_HOME;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    process.env.AWESKILL_HOME = workspace.homeDir;
    process.chdir(workspace.projectDir);

    try {
      await main(["node", "aweskill", "enable", "skill", "missing-skill"]);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) {
        delete process.env.AWESKILL_HOME;
      } else {
        process.env.AWESKILL_HOME = previousHome;
      }
    }

    expect(errorSpy).toHaveBeenCalledWith("Error: Unknown skill: missing-skill");
  });

  it("shows registry snapshots for an agent", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await program.parseAsync(["node", "aweskill", "enable", "skill", "biopython", "--scope", "global", "--agent", "codex"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "registry", "show", "codex"], { from: "node" });

    const registry = JSON.parse(lines.at(-1) ?? "{}") as { agentId?: string; skills?: Array<{ name: string }> };
    expect(registry.agentId).toBe("codex");
    expect(registry.skills?.map((entry) => entry.name)).toEqual(["biopython"]);
  });

  it("scan writes discovered entries into registry", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    const discoveredDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(discoveredDir, { recursive: true });
    await writeFile(path.join(discoveredDir, "SKILL.md"), "# AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "scan"], { from: "node" });

    const registry = await readRegistry(workspace.homeDir, "codex");
    expect(registry?.skills).toContainEqual(
      expect.objectContaining({
        name: "aeon",
        scope: "global",
        sourcePath: discoveredDir,
        managedByAweskill: false,
      }),
    );
  });

  it("scan --add warns when copying a symlink source", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const realDir = path.join(workspace.rootDir, "external", "aeon");
    const linkedDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(realDir, { recursive: true });
    await mkdir(path.dirname(linkedDir), { recursive: true });
    await writeFile(path.join(realDir, "SKILL.md"), "# AEON\n", "utf8");
    await symlink(realDir, linkedDir);

    await program.parseAsync(["node", "aweskill", "scan", "--add"], { from: "node" });

    expect(lines.join("\n")).toContain(`Warning: Source ${linkedDir} is a symlink; copied from ${realDir} to ${getSkillPath(workspace.homeDir, "aeon")}`);
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "aeon"), "SKILL.md"), "utf8")).resolves.toContain("AEON");
  });

  it("scan --add skips existing skills by default and reports them", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const existingSkillDir = getSkillPath(workspace.homeDir, "aeon");
    const scannedDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(existingSkillDir, { recursive: true });
    await mkdir(scannedDir, { recursive: true });
    await writeFile(path.join(existingSkillDir, "SKILL.md"), "# Existing AEON\n", "utf8");
    await writeFile(path.join(scannedDir, "SKILL.md"), "# New AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "scan", "--add"], { from: "node" });

    // existing skill is untouched
    await expect(readFile(path.join(existingSkillDir, "SKILL.md"), "utf8")).resolves.toContain("Existing AEON");
    // user is informed of the skip
    expect(lines.join("\n")).toContain("Skipped 1 existing skills");
    expect(lines.join("\n")).toContain("aeon");
  });

  it("scan --add --override overwrites existing files", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    const existingSkillDir = getSkillPath(workspace.homeDir, "aeon");
    const scannedDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(existingSkillDir, { recursive: true });
    await mkdir(scannedDir, { recursive: true });
    await writeFile(path.join(existingSkillDir, "SKILL.md"), "# Existing AEON\n", "utf8");
    await writeFile(path.join(scannedDir, "SKILL.md"), "# Replacement AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "scan", "--add", "--override"], { from: "node" });

    await expect(readFile(path.join(existingSkillDir, "SKILL.md"), "utf8")).resolves.toContain("Replacement AEON");
  });

  it("single add copies from symlink source for cp and preserves the real source for mv", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const realDir = path.join(workspace.rootDir, "external", "aeon");
    const symlinkDir = path.join(workspace.rootDir, "linked-aeon");
    await mkdir(realDir, { recursive: true });
    await writeFile(path.join(realDir, "SKILL.md"), "# AEON\n", "utf8");
    await symlink(realDir, symlinkDir);

    await program.parseAsync(["node", "aweskill", "add", symlinkDir, "--mode", "cp"], { from: "node" });
    expect(lines.join("\n")).toContain(`Warning: Source ${symlinkDir} is a symlink; copied from ${realDir}`);
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "linked-aeon"), "SKILL.md"), "utf8")).resolves.toContain("AEON");

    const mvProgram = createProgram({
      cwd: workspace.projectDir,
      homeDir: path.join(workspace.rootDir, "other-home"),
      write: () => undefined,
      error: () => undefined,
    });
    await mkdir(path.join(workspace.rootDir, "other-home"), { recursive: true });
    await mvProgram.parseAsync(["node", "aweskill", "add", symlinkDir, "--mode", "mv"], { from: "node" });
    await expect(readFile(path.join(realDir, "SKILL.md"), "utf8")).resolves.toContain("AEON");
    await expect(readFile(path.join(workspace.rootDir, "other-home", ".aweskill", "skills", "linked-aeon", "SKILL.md"), "utf8")).resolves.toContain("AEON");
  });

  it("add imports all skills from a skills root directory", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const skillsRoot = path.join(workspace.rootDir, "external-skills");
    await writeSkill(path.join(skillsRoot, "shell"), "Shell Skill");
    await writeSkill(path.join(skillsRoot, "python"), "Python Skill");

    await program.parseAsync(["node", "aweskill", "add", skillsRoot], { from: "node" });

    expect(lines.join("\n")).toContain("Imported 2 skills");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "shell"), "SKILL.md"), "utf8")).resolves.toContain("Shell Skill");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "python"), "SKILL.md"), "utf8")).resolves.toContain("Python Skill");
  });

  it("add from a skills root reports broken symlinks and continues", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const errors: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: (message) => errors.push(message),
    });

    const skillsRoot = path.join(workspace.rootDir, "external-skills");
    const validDir = path.join(workspace.rootDir, "valid-shell");
    const validLink = path.join(skillsRoot, "shell");
    const brokenLink = path.join(skillsRoot, "broken-skill");
    await mkdir(skillsRoot, { recursive: true });
    await writeSkill(validDir, "Shell Skill");
    await symlink(validDir, validLink);
    await symlink(path.join(workspace.rootDir, "missing", "broken-skill"), brokenLink);

    await program.parseAsync(["node", "aweskill", "add", skillsRoot], { from: "node" });

    expect(lines.join("\n")).toContain("Imported 1 skills");
    expect(lines.join("\n")).toContain("Missing source files: 1");
    expect(errors.join("\n")).toContain(`Error: Broken symlink for broken-skill: ${brokenLink}; source not found: ${path.join(workspace.rootDir, "missing", "broken-skill")}`);
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "shell"), "SKILL.md"), "utf8")).resolves.toContain("Shell Skill");
  });

  it("scan --add reports broken symlink sources and finishes with a missing count", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const errors: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: (message) => errors.push(message),
    });

    const validDir = path.join(workspace.rootDir, "external", "aeon");
    const validLink = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    const brokenLink = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "broken-skill");
    await mkdir(validDir, { recursive: true });
    await mkdir(path.dirname(validLink), { recursive: true });
    await writeFile(path.join(validDir, "SKILL.md"), "# AEON\n", "utf8");
    await symlink(validDir, validLink);
    await symlink(path.join(workspace.rootDir, "missing", "broken-skill"), brokenLink);

    await program.parseAsync(["node", "aweskill", "scan", "--add"], { from: "node" });

    expect(errors.join("\n")).toContain(`Error: Broken symlink for broken-skill: ${brokenLink}; source not found: ${path.join(workspace.rootDir, "missing", "broken-skill")}`);
    expect(lines.join("\n")).toContain("Imported 1 skills");
    expect(lines.join("\n")).toContain("Missing source files: 1");
  });

  it("enable takes over a discovered skill and rewrites registry to central source", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    const discoveredDir = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "aeon");
    await mkdir(discoveredDir, { recursive: true });
    await writeFile(path.join(discoveredDir, "SKILL.md"), "# Agent AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "scan"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "aeon"), "Central AEON");
    await program.parseAsync(["node", "aweskill", "enable", "skill", "aeon", "--scope", "global", "--agent", "claude-code"], { from: "node" });

    await expect(readFile(path.join(discoveredDir, "SKILL.md"), "utf8")).resolves.toContain("Central AEON");
    const registry = await readRegistry(workspace.homeDir, "claude-code");
    expect(registry?.skills).toContainEqual(
      expect.objectContaining({
        name: "aeon",
        scope: "global",
        sourcePath: getSkillPath(workspace.homeDir, "aeon"),
        managedByAweskill: true,
      }),
    );
  });

  it("syncs exact global-config projects and known registry projects", async () => {
    const workspace = await createTempWorkspace();
    const otherProjectDir = path.join(workspace.rootDir, "other-project");
    const knownProjectDir = path.join(workspace.rootDir, "known-project");
    await mkdir(otherProjectDir, { recursive: true });
    await mkdir(knownProjectDir, { recursive: true });

    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "shared-skill"));
    await writeGlobalConfig(workspace.homeDir, {
      version: 1,
      activations: [],
      projects: [
        {
          path: otherProjectDir,
          match: "exact",
          activations: [
            {
              type: "skill",
              name: "shared-skill",
              agents: ["codex"],
            },
          ],
        },
      ],
    });

    await program.parseAsync(["node", "aweskill", "enable", "skill", "shared-skill", "--scope", "project", "--agent", "cursor"], { from: "node" });
    await program.parseAsync(
      ["node", "aweskill", "enable", "skill", "shared-skill", "--scope", "project", "--agent", "codex", "--project", knownProjectDir],
      { from: "node" },
    );
    await rm(path.join(resolveAgentSkillsDir("codex", "project", knownProjectDir), "shared-skill"), {
      recursive: true,
      force: true,
    });
    await program.parseAsync(["node", "aweskill", "sync"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "project", otherProjectDir), "shared-skill", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "project", knownProjectDir), "shared-skill", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");

    const cursorRegistry = await readRegistry(workspace.homeDir, "cursor");
    expect(cursorRegistry?.skills).toContainEqual(
      expect.objectContaining({
        name: "shared-skill",
        scope: "project",
        projectDir: workspace.projectDir,
        managedByAweskill: true,
      }),
    );
  });
});
