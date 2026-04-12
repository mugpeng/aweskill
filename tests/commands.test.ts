import { access, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram, main } from "../src/index.js";
import { resolveAgentSkillsDir } from "../src/lib/agents.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.ts";

describe("commands", () => {
  afterEach(() => {
    process.exitCode = 0;
    vi.restoreAllMocks();
  });

  it("runs init, bundle, enable, check and sync", async () => {
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
      ["node", "aweskill", "enable", "bundle", "frontend", "--global", "--agent", "claude-code"],
      { from: "node" },
    );

    const targetPath = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "pr-review", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");

    await program.parseAsync(["node", "aweskill", "check"], { from: "node" });
    expect(lines.join("\n")).toContain("Global skills for claude-code:");

    await program.parseAsync(["node", "aweskill", "sync"], { from: "node" });
    expect(lines.join("\n")).toContain("Sync complete");
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
    await writeSkill(getSkillPath(workspace.homeDir, "shell"), "Shell");
    await writeSkill(getSkillPath(workspace.homeDir, "python"), "Python");
    await writeSkill(getSkillPath(workspace.homeDir, "git"), "Git");
    await writeSkill(getSkillPath(workspace.homeDir, "docker"), "Docker");
    await writeSkill(getSkillPath(workspace.homeDir, "k8s"), "Kubernetes");
    await program.parseAsync(["node", "aweskill", "list", "skills"], { from: "node" });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Skills in central repo: 6 total");
    expect(lines[0]).toContain("Showing first 5 skills");
    expect(lines[0]).toContain(`  ✓ one-password ${getSkillPath(workspace.homeDir, "one-password")}`);
  });

  it("list skills --verbose shows all skills without preview truncation", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "one-password"), "1Password");
    await writeSkill(getSkillPath(workspace.homeDir, "shell"), "Shell");
    await program.parseAsync(["node", "aweskill", "list", "skills", "--verbose"], { from: "node" });

    expect(lines[0]).toContain("Skills in central repo: 2 total");
    expect(lines[0]).not.toContain("Showing first");
    expect(lines[0]).toContain(`  ✓ one-password ${getSkillPath(workspace.homeDir, "one-password")}`);
    expect(lines[0]).toContain(`  ✓ shell ${getSkillPath(workspace.homeDir, "shell")}`);
  });

  it("disable skill requires --force when another member of the same bundle is still enabled", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "skill-a"));
    await writeSkill(getSkillPath(workspace.homeDir, "skill-b"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "pair"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add-skill", "pair", "skill-a"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add-skill", "pair", "skill-b"], { from: "node" });
    await mkdir(resolveAgentSkillsDir("codex", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(["node", "aweskill", "enable", "bundle", "pair", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      program.parseAsync(["node", "aweskill", "disable", "skill", "skill-a", "--global", "--agent", "codex"], { from: "node" }),
    ).rejects.toThrow("bundle(s): pair");

    await program.parseAsync(
      ["node", "aweskill", "disable", "skill", "skill-a", "--global", "--agent", "codex", "--force"],
      { from: "node" },
    );

    const aPath = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "skill-a", "SKILL.md");
    const bPath = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "skill-b", "SKILL.md");
    await expect(readFile(aPath, "utf8")).rejects.toThrow();
    await expect(readFile(bPath, "utf8")).resolves.toContain("Example Skill");
  });

  it("disable skill allows without --force when no bundle sibling is projected", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "solo"));
    await writeSkill(getSkillPath(workspace.homeDir, "unused-sibling"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "pair"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add-skill", "pair", "solo"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add-skill", "pair", "unused-sibling"], { from: "node" });
    await mkdir(resolveAgentSkillsDir("codex", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(["node", "aweskill", "enable", "skill", "solo", "--global", "--agent", "codex"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "disable", "skill", "solo", "--global", "--agent", "codex"], { from: "node" });
    const soloPath = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "solo", "SKILL.md");
    await expect(readFile(soloPath, "utf8")).rejects.toThrow();
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
      ["node", "aweskill", "enable", "skill", "frontend-design", "--project", workspace.projectDir, "--agent", "cursor"],
      { from: "node" },
    );
    const targetPath = path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");

    await program.parseAsync(
      ["node", "aweskill", "disable", "skill", "frontend-design", "--project", workspace.projectDir, "--agent", "cursor"],
      { from: "node" },
    );
    await expect(readFile(targetPath, "utf8")).rejects.toThrow();
  });

  it("defaults enable to global scope and all detected agents", async () => {
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
    // project scope should NOT be touched by global enable
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "project", workspace.projectDir), "biopython", "SKILL.md"), "utf8"),
    ).rejects.toThrow();
  });

  it("fails before creating any projection when a target path is unmanaged", async () => {
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
        ["node", "aweskill", "enable", "skill", "biopython", "--global", "--agent", "claude-code"],
        { from: "node" },
      ),
    ).rejects.toThrow(`Refusing to overwrite non-symlink target: ${conflictedTarget}`);
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

  it("checks global agent skills and categorizes linked, duplicate, and new entries", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "linked-skill"), "Linked Skill");
    await writeSkill(getSkillPath(workspace.homeDir, "duplicate-skill"), "Duplicate Skill");
    await program.parseAsync(["node", "aweskill", "enable", "skill", "linked-skill", "--global", "--agent", "codex"], { from: "node" });
    const duplicateDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "duplicate-skill");
    const newDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "new-skill");
    await mkdir(duplicateDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    await writeFile(path.join(duplicateDir, "SKILL.md"), "# Duplicate Skill\n", "utf8");
    await writeFile(path.join(newDir, "SKILL.md"), "# New Skill\n", "utf8");
    await program.parseAsync(["node", "aweskill", "check", "--agent", "codex"], { from: "node" });

    expect(lines.join("\n")).toContain("Global skills for codex:");
    expect(lines.join("\n")).toContain("  linked: 1");
    expect(lines.join("\n")).toContain("  duplicate: 1");
    expect(lines.join("\n")).toContain("  new: 1");
    expect(lines.join("\n")).toContain(`    ✓ linked-skill`);
    expect(lines.join("\n")).toContain(`    ! duplicate-skill`);
    expect(lines.join("\n")).toContain(`    + new-skill`);
  });

  it("checks project agent skills for the current project by default", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await program.parseAsync(["node", "aweskill", "enable", "skill", "frontend-design", "--project", "--agent", "cursor"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "check", "--project", "--agent", "cursor"], { from: "node" });

    expect(lines.join("\n")).toContain(`Project skills for cursor (${workspace.projectDir}):`);
    expect(lines.join("\n")).toContain("    ✓ frontend-design");
  });

  it("check --update imports new skills and relinks duplicate and new entries to the central repo", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "duplicate-skill"), "Central Duplicate");

    const skillsDir = resolveAgentSkillsDir("codex", "global", workspace.homeDir);
    const duplicateDir = path.join(skillsDir, "duplicate-skill");
    const newDir = path.join(skillsDir, "new-skill");
    await mkdir(duplicateDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    await writeFile(path.join(duplicateDir, "SKILL.md"), "# Agent Duplicate\n", "utf8");
    await writeFile(path.join(newDir, "SKILL.md"), "# Brand New\n", "utf8");

    await program.parseAsync(["node", "aweskill", "check", "--agent", "codex", "--update"], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "new-skill"), "SKILL.md"), "utf8")).resolves.toContain("Brand New");
    await expect(readFile(path.join(duplicateDir, "SKILL.md"), "utf8")).resolves.toContain("Central Duplicate");
    await expect(readFile(path.join(newDir, "SKILL.md"), "utf8")).resolves.toContain("Brand New");
    expect(lines.join("\n")).toContain("Updated 2 skills");
    expect(lines.join("\n")).toContain("Imported 1 new skills into the central repo");
  });

  it("check defaults to category summaries and truncates long categories unless verbose is used", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    for (const name of ["a", "b", "c", "d", "e", "f"]) {
      const dir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), name);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "SKILL.md"), `# ${name}\n`, "utf8");
    }

    await program.parseAsync(["node", "aweskill", "check", "--agent", "codex"], { from: "node" });

    expect(lines.join("\n")).toContain("  new: 6");
    expect(lines.join("\n")).toContain("... and 1 more (use --verbose to show all)");
  });

  it("check --update warns and skips entries without SKILL.md instead of aborting", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    const systemDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), ".system");
    await mkdir(systemDir, { recursive: true });

    await expect(program.parseAsync(["node", "aweskill", "check", "--agent", "codex", "--update"], { from: "node" })).resolves.toBeDefined();

    expect(lines.join("\n")).toContain(`Warning: Skipping codex:.system; missing SKILL.md in ${systemDir}`);
    expect(lines.join("\n")).toContain("Skipped 1 entries: codex:.system");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, ".system"), "SKILL.md"), "utf8")).rejects.toThrow();
  });

  it("scan lists discovered entries from agent directories", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const discoveredDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(discoveredDir, { recursive: true });
    await writeFile(path.join(discoveredDir, "SKILL.md"), "# AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "scan"], { from: "node" });

    expect(lines.join("\n")).toContain("Scanned skills:");
    expect(lines.join("\n")).toContain("Global scanned skills for codex: 1");
    expect(lines.join("\n")).not.toContain(`    ✓ aeon ${discoveredDir}`);
  });

  it("scan defaults to per-agent totals and only shows entries with --verbose", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const verboseLines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });
    const verboseProgram = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => verboseLines.push(message),
      error: () => undefined,
    });

    for (const name of ["aeon", "biopython"]) {
      const discoveredDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), name);
      await mkdir(discoveredDir, { recursive: true });
      await writeFile(path.join(discoveredDir, "SKILL.md"), `# ${name}\n`, "utf8");
    }

    await program.parseAsync(["node", "aweskill", "scan"], { from: "node" });
    await verboseProgram.parseAsync(["node", "aweskill", "scan", "--verbose"], { from: "node" });

    expect(lines.join("\n")).toContain("Global scanned skills for codex: 2");
    expect(lines.join("\n")).not.toContain("    ✓ aeon ");
    expect(verboseLines.join("\n")).toContain("Global scanned skills for codex: 2");
    expect(verboseLines.join("\n")).toContain("    ✓ aeon ");
    expect(verboseLines.join("\n")).toContain("    ✓ biopython ");
  });

  it("init --scan uses the same summary output as scan", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const discoveredDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "aeon");
    await mkdir(discoveredDir, { recursive: true });
    await writeFile(path.join(discoveredDir, "SKILL.md"), "# AEON\n", "utf8");

    await program.parseAsync(["node", "aweskill", "init", "--scan"], { from: "node" });

    expect(lines.join("\n")).toContain(`Initialized ${workspace.homeDir}/.aweskill`);
    expect(lines.join("\n")).toContain("Scanned skills:");
    expect(lines.join("\n")).toContain("Global scanned skills for codex: 1");
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

    await expect(readFile(path.join(existingSkillDir, "SKILL.md"), "utf8")).resolves.toContain("Existing AEON");
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
    expect(errors.join("\n")).toContain(`Error: Broken symlink for broken-skill`);
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

    expect(errors.join("\n")).toContain(`Error: Broken symlink for broken-skill`);
    expect(lines.join("\n")).toContain("Imported 1 skills");
    expect(lines.join("\n")).toContain("Missing source files: 1");
  });

  it("rmdup reports duplicate groups without changing files by default", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer"), "Base");
    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "Versioned");

    await program.parseAsync(["node", "aweskill", "rmdup"], { from: "node" });

    expect(lines.join("\n")).toContain("Duplicate skill groups in central repo:");
    expect(lines.join("\n")).toContain("  architecture-designer: 2 entries");
    expect(lines.join("\n")).toContain("keep: architecture-designer-0.1.0");
    expect(lines.join("\n")).toContain("drop: architecture-designer ");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "architecture-designer"), "SKILL.md"), "utf8")).resolves.toContain("Base");
  });

  it("rmdup --remove moves duplicates into dup_skills by default", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer"), "Base");
    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "Versioned");

    await program.parseAsync(["node", "aweskill", "rmdup", "--remove"], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "SKILL.md"), "utf8")).resolves.toContain("Versioned");
    await expect(readFile(path.join(workspace.homeDir, ".aweskill", "dup_skills", "architecture-designer", "SKILL.md"), "utf8")).resolves.toContain("Base");
    await expect(access(path.join(getSkillPath(workspace.homeDir, "architecture-designer"), "SKILL.md"))).rejects.toThrow();
  });

  it("rmdup --remove --delete permanently deletes duplicates", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer"), "Base");
    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "Versioned");
    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer-2.0.0"), "Newest");

    await program.parseAsync(["node", "aweskill", "rmdup", "--remove", "--delete"], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "architecture-designer-2.0.0"), "SKILL.md"), "utf8")).resolves.toContain("Newest");
    await expect(access(path.join(getSkillPath(workspace.homeDir, "architecture-designer"), "SKILL.md"))).rejects.toThrow();
    await expect(access(path.join(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "SKILL.md"))).rejects.toThrow();
    await expect(readdir(path.join(workspace.homeDir, ".aweskill", "dup_skills"))).resolves.toEqual([]);
  });

  it("enable refuses to overwrite an existing unmanaged skill directory", async () => {
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

    await writeSkill(getSkillPath(workspace.homeDir, "aeon"), "Central AEON");
    await expect(
      program.parseAsync(["node", "aweskill", "enable", "skill", "aeon", "--global", "--agent", "claude-code"], { from: "node" }),
    ).rejects.toThrow(`Refusing to overwrite non-symlink target: ${discoveredDir}`);
  });

  it("sync removes stale projections after skill is deleted from central repo", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "ephemeral-skill"));
    await program.parseAsync(["node", "aweskill", "enable", "skill", "ephemeral-skill", "--global", "--agent", "codex"], { from: "node" });

    const projPath = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "ephemeral-skill");
    await expect(readFile(path.join(projPath, "SKILL.md"), "utf8")).resolves.toContain("Example Skill");

    // Delete the central skill manually, then sync
    await rm(getSkillPath(workspace.homeDir, "ephemeral-skill"), { recursive: true, force: true });
    await program.parseAsync(["node", "aweskill", "sync"], { from: "node" });

    expect(lines.join("\n")).toContain("Removed 1 stale projection(s)");
    await expect(readFile(path.join(projPath, "SKILL.md"), "utf8")).rejects.toThrow();
  });
});
