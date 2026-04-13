import { access, lstat, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram, main } from "../src/index.js";
import { resolveAgentSkillsDir } from "../src/lib/agents.js";
import { getSkillPath } from "../src/lib/skills.js";
import { getTemplateBundlesDir } from "../src/lib/templates.js";
import { createTempWorkspace, writeSkill } from "./helpers.ts";

describe("commands", () => {
  afterEach(() => {
    process.exitCode = 0;
    vi.restoreAllMocks();
  });

  it("runs store init, bundle, agent add, agent list and agent sync", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: (message) => lines.push(`ERR:${message}`),
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "pr-review"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "frontend"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "frontend", "pr-review"], { from: "node" });

    await mkdir(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(
      ["node", "aweskill", "agent", "add", "bundle", "frontend", "--global", "--agent", "claude-code"],
      { from: "node" },
    );

    const targetPath = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "pr-review", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");

    await program.parseAsync(["node", "aweskill", "agent", "list"], { from: "node" });
    expect(lines.join("\n")).toContain("Global skills for claude-code:");

    await program.parseAsync(["node", "aweskill", "agent", "sync"], { from: "node" });
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "create", "frontend"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "delete", "frontend"], { from: "node" });

    await expect(program.parseAsync(["node", "aweskill", "bundle", "show", "frontend"], { from: "node" })).rejects.toThrow();
  });

  it("prints version for -V and -v without writing an error", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await main(["node", "aweskill", "-V"]);
    expect(stdout).toHaveBeenCalledWith("0.1.8\n");
    expect(stderr).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);

    stdout.mockClear();
    stderr.mockClear();
    process.exitCode = 0;

    await main(["node", "aweskill", "-v"]);
    expect(stdout).toHaveBeenCalledWith("0.1.8\n");
    expect(stderr).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it("requires store init before running other commands", async () => {
    const workspace = await createTempWorkspace();
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const previousHome = process.env.AWESKILL_HOME;

    process.env.AWESKILL_HOME = workspace.homeDir;

    try {
      await main(["node", "aweskill", "skill", "list"]);
      expect(stderr).toHaveBeenCalledWith(
        `Error: aweskill store is not initialized at ${path.join(workspace.homeDir, ".aweskill")}. Run "aweskill store init" first.`,
      );
      expect(process.exitCode).toBe(1);

      stderr.mockClear();
      stdout.mockClear();
      process.exitCode = 0;

      await main(["node", "aweskill", "store", "init"]);
      expect(stderr).not.toHaveBeenCalled();
      expect(stdout).not.toHaveBeenCalledWith(
        expect.stringContaining(`Error: aweskill store is not initialized at ${path.join(workspace.homeDir, ".aweskill")}`),
      );
    } finally {
      if (previousHome === undefined) {
        delete process.env.AWESKILL_HOME;
      } else {
        process.env.AWESKILL_HOME = previousHome;
      }
    }
  });

  it("creates a timestamped backup archive under ~/.aweskill/backup", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "backup-skill"), "Backup Skill");
    await program.parseAsync(["node", "aweskill", "store", "backup"], { from: "node" });

    const backupDir = path.join(workspace.homeDir, ".aweskill", "backup");
    const entries = await readdir(backupDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^skills-.*\.tar\.gz$/);
    expect(lines.join("\n")).toContain(path.join(backupDir, entries[0]!));
  });

  it("shows the aweskill store root with store where", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });

    lines.length = 0;
    await program.parseAsync(["node", "aweskill", "store", "where"], { from: "node" });

    expect(lines).toEqual([`aweskill store: ${path.join(workspace.homeDir, ".aweskill")}`]);
  });

  it("shows store directories and entry counts with store where --verbose", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "alpha"), "Alpha");
    await writeSkill(getSkillPath(workspace.homeDir, "beta"), "Beta");
    await program.parseAsync(["node", "aweskill", "bundle", "create", "research"], { from: "node" });

    lines.length = 0;
    await program.parseAsync(["node", "aweskill", "store", "where", "--verbose"], { from: "node" });

    const output = lines.join("\n");
    expect(output).toContain(`aweskill store: ${path.join(workspace.homeDir, ".aweskill")}`);
    expect(output).toContain(`  - skills: 2 entries -> ${path.join(workspace.homeDir, ".aweskill", "skills")}`);
    expect(output).toContain(`  - dup_skills: 0 entries -> ${path.join(workspace.homeDir, ".aweskill", "dup_skills")}`);
    expect(output).toContain(`  - backup: 0 entries -> ${path.join(workspace.homeDir, ".aweskill", "backup")}`);
    expect(output).toContain(`  - bundles: 1 entry -> ${path.join(workspace.homeDir, ".aweskill", "bundles")}`);
  });

  it("backs up skills and bundles to a user-provided archive path by default", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const archivePath = path.join(workspace.projectDir, "exports", "store-backup.tar.gz");
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "backup-skill"), "Backup Skill");
    await program.parseAsync(["node", "aweskill", "bundle", "create", "research"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "research", "backup-skill"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "store", "backup", archivePath], { from: "node" });

    await expect(access(archivePath)).resolves.toBeUndefined();
    expect(lines.join("\n")).toContain(`Backed up skills and bundles to ${archivePath}`);
  });

  it("writes a timestamped archive into a user-provided directory", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const exportDir = path.join(workspace.projectDir, "exports");
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await mkdir(exportDir, { recursive: true });
    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "backup-skill"), "Backup Skill");

    await program.parseAsync(["node", "aweskill", "store", "backup", exportDir], { from: "node" });

    const entries = await readdir(exportDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^skills-.*\.tar\.gz$/);
    expect(lines.join("\n")).toContain(path.join(exportDir, entries[0]!));
  });

  it("restore skips conflicting skills by default and reports them", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "restore-me"), "Original");
    await program.parseAsync(["node", "aweskill", "bundle", "create", "research"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "research", "restore-me"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "store", "backup"], { from: "node" });

    const backupDir = path.join(workspace.homeDir, ".aweskill", "backup");
    const [archive] = await readdir(backupDir);
    await writeFile(path.join(getSkillPath(workspace.homeDir, "restore-me"), "SKILL.md"), "# Changed\n", "utf8");
    await writeFile(path.join(workspace.homeDir, ".aweskill", "bundles", "research.yaml"), "name: research\nskills:\n  - changed\n", "utf8");

    await program.parseAsync(["node", "aweskill", "store", "restore", path.join(backupDir, archive!)], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "restore-me"), "SKILL.md"), "utf8")).resolves.toContain("Changed");
    await expect(readFile(path.join(workspace.homeDir, ".aweskill", "bundles", "research.yaml"), "utf8")).resolves.toContain("changed");
    expect(lines.join("\n")).toContain("Restored 0 skills and 0 bundles");
    expect(lines.join("\n")).toContain("Skipped existing skills: restore-me");
    expect(lines.join("\n")).toContain("Skipped existing bundles: research");
  });

  it("restore --override replaces current skills and creates a fresh backup first", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "restore-me"), "Original");
    await program.parseAsync(["node", "aweskill", "store", "backup"], { from: "node" });

    const backupDir = path.join(workspace.homeDir, ".aweskill", "backup");
    const [archive] = await readdir(backupDir);

    await writeFile(path.join(getSkillPath(workspace.homeDir, "restore-me"), "SKILL.md"), "# Changed\n", "utf8");
    await writeSkill(getSkillPath(workspace.homeDir, "new-current-skill"), "Current Only");

    await program.parseAsync(["node", "aweskill", "store", "restore", path.join(backupDir, archive!), "--override"], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "restore-me"), "SKILL.md"), "utf8")).resolves.toContain("Original");
    await expect(access(path.join(getSkillPath(workspace.homeDir, "new-current-skill"), "SKILL.md"))).rejects.toThrow();

    const updatedArchives = await readdir(backupDir);
    expect(updatedArchives.length).toBeGreaterThanOrEqual(2);
    expect(lines.join("\n")).toContain("Restored 1 skills");
    expect(lines.join("\n")).toContain("Backed up current skills and bundles to");
  });

  it("restore restores bundles and backs up bundles too by default", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "restore-me"), "Original");
    await program.parseAsync(["node", "aweskill", "bundle", "create", "research"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "research", "restore-me"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "store", "backup"], { from: "node" });

    const backupDir = path.join(workspace.homeDir, ".aweskill", "backup");
    const [archive] = await readdir(backupDir);

    await rm(path.join(workspace.homeDir, ".aweskill", "bundles", "research.yaml"), { force: true });
    await writeSkill(getSkillPath(workspace.homeDir, "current-only"), "Current Only");

    await program.parseAsync(["node", "aweskill", "store", "restore", path.join(backupDir, archive!), "--override"], { from: "node" });

    await expect(readFile(path.join(workspace.homeDir, ".aweskill", "bundles", "research.yaml"), "utf8")).resolves.toContain("restore-me");
    expect(lines.join("\n")).toContain("Restored 1 skills and 1 bundles");
    expect(lines.join("\n")).toContain("Backed up current skills and bundles to");
  });

  it("restore accepts an unpacked backup directory", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });
    const restoreDir = path.join(workspace.projectDir, "restore-source");

    await mkdir(path.join(restoreDir, "skills", "demo-skill"), { recursive: true });
    await mkdir(path.join(restoreDir, "bundles"), { recursive: true });
    await writeFile(path.join(restoreDir, "skills", "demo-skill", "SKILL.md"), "# Demo Skill\n", "utf8");
    await writeFile(path.join(restoreDir, "bundles", "demo.yaml"), "name: demo\nskills:\n  - demo-skill\n", "utf8");

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "store", "restore", restoreDir], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "demo-skill"), "SKILL.md"), "utf8")).resolves.toContain("Demo Skill");
    await expect(readFile(path.join(workspace.homeDir, ".aweskill", "bundles", "demo.yaml"), "utf8")).resolves.toContain("demo-skill");
  });

  it("restore skips suspicious files from an unpacked backup directory", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });
    const restoreDir = path.join(workspace.projectDir, "restore-source");

    await mkdir(path.join(restoreDir, "skills", "demo-skill"), { recursive: true });
    await mkdir(path.join(restoreDir, "skills", "broken-skill"), { recursive: true });
    await mkdir(path.join(restoreDir, "bundles"), { recursive: true });
    await writeFile(path.join(restoreDir, "skills", "demo-skill", "SKILL.md"), "# Demo Skill\n", "utf8");
    await writeFile(path.join(restoreDir, "skills", "._global"), "junk\n", "utf8");
    await writeFile(path.join(restoreDir, "bundles", "demo.yaml"), "name: demo\nskills:\n  - demo-skill\n", "utf8");
    await writeFile(path.join(restoreDir, "bundles", "._global"), "junk\n", "utf8");

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "store", "restore", restoreDir], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "demo-skill"), "SKILL.md"), "utf8")).resolves.toContain("Demo Skill");
    await expect(access(path.join(getSkillPath(workspace.homeDir, "broken-skill")))).rejects.toThrow();
    expect(lines.join("\n")).toContain("Skipped suspicious restore source entries:");
    expect(lines.join("\n")).toContain("skills/._global");
    expect(lines.join("\n")).toContain("bundles/._global");
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
    await program.parseAsync(["node", "aweskill", "skill", "list"], { from: "node" });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Skills in central repo: 6 total");
    expect(lines[0]).toContain("Showing first 5 skills");
    expect(lines[0]).toContain(`  ✓ one-password ${getSkillPath(workspace.homeDir, "one-password")}`);
  });

  it("list commands summarize suspicious store entries and suggest doctor clean", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "one-password"), "1Password");
    await mkdir(getSkillPath(workspace.homeDir, "broken-skill"), { recursive: true });
    await writeFile(path.join(workspace.homeDir, ".aweskill", "bundles", "._global"), "junk\n", "utf8");

    await program.parseAsync(["node", "aweskill", "skill", "list"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "list"], { from: "node" });

    expect(lines.join("\n")).toContain("Suspicious store entries detected:");
    expect(lines.join("\n")).toContain("Run \"aweskill doctor clean\"");
  });

  it("lists bundles with preview by default and full details with --verbose", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));
    await writeSkill(getSkillPath(workspace.homeDir, "pymc"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "science"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science", "biopython"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science", "scanpy"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science", "pymc"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "bundle", "list"], { from: "node" });
    expect(lines.join("\n")).toContain("Bundles in central repo: 1 total");
    expect(lines.join("\n")).toContain("science: 3 skills -> biopython, pymc, scanpy");

    lines.length = 0;
    await program.parseAsync(["node", "aweskill", "bundle", "list", "--verbose"], { from: "node" });
    expect(lines.join("\n")).toContain("Bundles in central repo: 1 total");
    expect(lines.join("\n")).toContain("science: 3 skills -> biopython, pymc, scanpy");
  });

  it("lists built-in bundle templates", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "bundle", "template", "list"], { from: "node" });
    expect(lines.join("\n")).toContain("Bundle templates:");
    expect(lines.join("\n")).toContain("k-dense-ai-scientific-skills");
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
    await program.parseAsync(["node", "aweskill", "skill", "list", "--verbose"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "skill-a"));
    await writeSkill(getSkillPath(workspace.homeDir, "skill-b"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "pair"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "pair", "skill-a"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "pair", "skill-b"], { from: "node" });
    await mkdir(resolveAgentSkillsDir("codex", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(["node", "aweskill", "agent", "add", "bundle", "pair", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      program.parseAsync(["node", "aweskill", "agent", "remove", "skill", "skill-a", "--global", "--agent", "codex"], { from: "node" }),
    ).rejects.toThrow("bundle(s): pair");

    await program.parseAsync(
      ["node", "aweskill", "agent", "remove", "skill", "skill-a", "--global", "--agent", "codex", "--force"],
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "solo"));
    await writeSkill(getSkillPath(workspace.homeDir, "unused-sibling"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "pair"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "pair", "solo"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "pair", "unused-sibling"], { from: "node" });
    await mkdir(resolveAgentSkillsDir("codex", "global", workspace.homeDir), { recursive: true });
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "solo", "--global", "--agent", "codex"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "agent", "remove", "skill", "solo", "--global", "--agent", "codex"], { from: "node" });
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await mkdir(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), { recursive: true });

    await program.parseAsync(
      ["node", "aweskill", "agent", "add", "skill", "frontend-design", "--project", workspace.projectDir, "--agent", "cursor"],
      { from: "node" },
    );
    await expect(lstat(path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design"))).resolves.toMatchObject({
      isSymbolicLink: expect.any(Function),
    });
    expect((await lstat(path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design"))).isSymbolicLink()).toBe(true);
    const targetPath = path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design", "SKILL.md");
    await expect(readFile(targetPath, "utf8")).resolves.toContain("Example Skill");

    await program.parseAsync(
      ["node", "aweskill", "agent", "remove", "skill", "frontend-design", "--project", workspace.projectDir, "--agent", "cursor"],
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "biopython"], { from: "node" });

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

  it("prints friendly missing-argument hints across commands", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await expect(program.parseAsync(["node", "aweskill", "agent", "remove"], { from: "node" })).rejects.toThrow(
      'Missing required argument <type>. Use "bundle" or "skill".',
    );
    await expect(program.parseAsync(["node", "aweskill", "store", "restore"], { from: "node" })).rejects.toThrow(
      'Missing required argument <archive>. Use a backup archive path, for example "skills-2026-04-12T19-20-00Z.tar.gz".',
    );
    await expect(program.parseAsync(["node", "aweskill", "bundle", "add", "research"], { from: "node" })).rejects.toThrow(
      "Missing required argument <skill>. Use a skill name.",
    );
    await expect(program.parseAsync(["node", "aweskill", "agent", "add", "skill"], { from: "node" })).rejects.toThrow(
      'Missing required argument <name>. Use a bundle or skill name, for example "my-bundle", "biopython", or "all".',
    );
    await expect(program.parseAsync(["node", "aweskill", "agent", "list", "--agent"], { from: "node" })).rejects.toThrow(
      'Option --agent <agent> argument missing. Use one or more supported agent ids, for example "codex" or "codex,cursor". Run "aweskill agent supported" to see the supported agent list.',
    );
  });

  it("lists supported agents", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "agent", "supported"], { from: "node" });

    expect(lines[0]).toBe("Supported agents:");
    expect(lines).toContain("augment (Augment)");
    expect(lines).toContain("codex (Codex)");
    expect(lines).toContain("cursor (Cursor)");
    expect(lines).toContain("replit (Replit)");
  });

  it("rejects global-only operations for project-only agents", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));

    await expect(
      program.parseAsync(["node", "aweskill", "agent", "add", "skill", "frontend-design", "--global", "--agent", "replit"], { from: "node" }),
    ).rejects.toThrow("Agent replit does not support global scope.");
  });

  it("supports enable bundle all as the union of all bundle skills", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));
    await writeSkill(getSkillPath(workspace.homeDir, "pymc"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "science-a"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science-a", "biopython"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science-a", "scanpy"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "create", "science-b"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science-b", "scanpy"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science-b", "pymc"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "agent", "add", "bundle", "all", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "scanpy", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "pymc", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
  });

  it("supports comma-separated skill names for enable", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));

    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "biopython,scanpy", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "scanpy", "SKILL.md"), "utf8"),
    ).resolves.toContain("Example Skill");
  });

  it("supports disable skill all and only removes managed projections in scope", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "all", "--global", "--agent", "codex"], { from: "node" });

    const unmanagedDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "foreign-skill");
    await mkdir(unmanagedDir, { recursive: true });
    await writeFile(path.join(unmanagedDir, "SKILL.md"), "# Foreign Skill\n", "utf8");

    await program.parseAsync(["node", "aweskill", "agent", "remove", "skill", "all", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "scanpy", "SKILL.md"), "utf8"),
    ).rejects.toThrow();
    await expect(readFile(path.join(unmanagedDir, "SKILL.md"), "utf8")).resolves.toContain("Foreign Skill");
  });

  it("supports disable bundle all after bundle-based enable", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "science"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science", "biopython"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science", "scanpy"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "agent", "add", "bundle", "all", "--global", "--agent", "codex"], { from: "node" });

    await program.parseAsync(["node", "aweskill", "agent", "remove", "bundle", "all", "--global", "--agent", "codex"], { from: "node" });

    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "biopython", "SKILL.md"), "utf8"),
    ).rejects.toThrow();
    await expect(
      readFile(path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "scanpy", "SKILL.md"), "utf8"),
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));

    const conflictedTarget = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "biopython");
    await mkdir(conflictedTarget, { recursive: true });
    await writeFile(path.join(conflictedTarget, "SKILL.md"), "# Foreign Skill\n", "utf8");

    await expect(
      program.parseAsync(
        ["node", "aweskill", "agent", "add", "skill", "biopython", "--global", "--agent", "claude-code"],
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
      await main(["node", "aweskill", "store", "init"]);
      await main(["node", "aweskill", "agent", "add", "skill", "missing-skill"]);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) {
        delete process.env.AWESKILL_HOME;
      } else {
        process.env.AWESKILL_HOME = previousHome;
      }
    }

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Unknown skill: missing-skill. Run "aweskill skill list" to see available skills.',
    );
  });

  it("prints help without an error suffix", async () => {
    const workspace = await createTempWorkspace();
    const previousCwd = process.cwd();
    const previousHome = process.env.AWESKILL_HOME;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    process.env.AWESKILL_HOME = workspace.homeDir;
    process.chdir(workspace.projectDir);

    try {
      await main(["node", "aweskill", "-h"]);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) {
        delete process.env.AWESKILL_HOME;
      } else {
        process.env.AWESKILL_HOME = previousHome;
      }
    }

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("prints bundle lookup hints for missing bundles and templates", async () => {
    const workspace = await createTempWorkspace();
    const previousCwd = process.cwd();
    const previousHome = process.env.AWESKILL_HOME;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    process.env.AWESKILL_HOME = workspace.homeDir;
    process.chdir(workspace.projectDir);

    try {
      await main(["node", "aweskill", "store", "init"]);
      await main(["node", "aweskill", "agent", "add", "bundle", "super"]);
      await main(["node", "aweskill", "bundle", "template", "import", "missing-template"]);
    } finally {
      process.chdir(previousCwd);
      if (previousHome === undefined) {
        delete process.env.AWESKILL_HOME;
      } else {
        process.env.AWESKILL_HOME = previousHome;
      }
    }

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Bundle not found: super. Run "aweskill bundle list" to see available bundles.',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Bundle template not found: missing-template. Run "aweskill bundle template list" to see available bundle templates.',
    );
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "linked-skill"), "Linked Skill");
    await writeSkill(getSkillPath(workspace.homeDir, "duplicate-skill"), "Duplicate Skill");
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "linked-skill", "--global", "--agent", "codex"], { from: "node" });
    const duplicateDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "duplicate-skill");
    const newDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "new-skill");
    await mkdir(duplicateDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    await writeFile(path.join(duplicateDir, "SKILL.md"), "# Duplicate Skill\n", "utf8");
    await writeFile(path.join(newDir, "SKILL.md"), "# New Skill\n", "utf8");
    await program.parseAsync(["node", "aweskill", "agent", "list", "--agent", "codex"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "frontend-design", "--project", "--agent", "cursor"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "agent", "list", "--project", "--agent", "cursor"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "duplicate-skill"), "Central Duplicate");

    const skillsDir = resolveAgentSkillsDir("codex", "global", workspace.homeDir);
    const duplicateDir = path.join(skillsDir, "duplicate-skill");
    const newDir = path.join(skillsDir, "new-skill");
    await mkdir(duplicateDir, { recursive: true });
    await mkdir(newDir, { recursive: true });
    await writeFile(path.join(duplicateDir, "SKILL.md"), "# Agent Duplicate\n", "utf8");
    await writeFile(path.join(newDir, "SKILL.md"), "# Brand New\n", "utf8");

    await program.parseAsync(["node", "aweskill", "agent", "list", "--agent", "codex", "--update"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    for (const name of ["a", "b", "c", "d", "e", "f"]) {
      const dir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), name);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "SKILL.md"), `# ${name}\n`, "utf8");
    }

    await program.parseAsync(["node", "aweskill", "agent", "list", "--agent", "codex"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    const systemDir = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), ".system");
    await mkdir(systemDir, { recursive: true });

    await expect(program.parseAsync(["node", "aweskill", "agent", "list", "--agent", "codex", "--update"], { from: "node" })).resolves.toBeDefined();

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

    await program.parseAsync(["node", "aweskill", "skill", "scan"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "skill", "scan"], { from: "node" });
    await verboseProgram.parseAsync(["node", "aweskill", "skill", "scan", "--verbose"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "store", "init", "--scan"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "skill", "import", "--scan"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "skill", "import", "--scan"], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "skill", "import", "--scan", "--override"], { from: "node" });

    await expect(readFile(path.join(existingSkillDir, "SKILL.md"), "utf8")).resolves.toContain("Replacement AEON");
  });

  it("single import copies from symlink source for cp and preserves the real source for mv", async () => {
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

    await program.parseAsync(["node", "aweskill", "skill", "import", symlinkDir, "--mode", "cp"], { from: "node" });
    expect(lines.join("\n")).toContain(`Warning: Source ${symlinkDir} is a symlink; copied from ${realDir}`);
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "linked-aeon"), "SKILL.md"), "utf8")).resolves.toContain("AEON");

    const mvProgram = createProgram({
      cwd: workspace.projectDir,
      homeDir: path.join(workspace.rootDir, "other-home"),
      write: () => undefined,
      error: () => undefined,
    });
    await mkdir(path.join(workspace.rootDir, "other-home"), { recursive: true });
    await mvProgram.parseAsync(["node", "aweskill", "skill", "import", symlinkDir, "--mode", "mv"], { from: "node" });
    await expect(readFile(path.join(realDir, "SKILL.md"), "utf8")).resolves.toContain("AEON");
    await expect(readFile(path.join(workspace.rootDir, "other-home", ".aweskill", "skills", "linked-aeon", "SKILL.md"), "utf8")).resolves.toContain("AEON");
  });

  it("import imports all skills from a skills root directory", async () => {
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

    await program.parseAsync(["node", "aweskill", "skill", "import", skillsRoot], { from: "node" });

    expect(lines.join("\n")).toContain("Imported 2 skills");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "shell"), "SKILL.md"), "utf8")).resolves.toContain("Shell Skill");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "python"), "SKILL.md"), "utf8")).resolves.toContain("Python Skill");
  });

  it("import from a skills root reports broken symlinks and continues", async () => {
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

    await program.parseAsync(["node", "aweskill", "skill", "import", skillsRoot], { from: "node" });

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

    await program.parseAsync(["node", "aweskill", "skill", "import", "--scan"], { from: "node" });

    expect(errors.join("\n")).toContain(`Error: Broken symlink for broken-skill`);
    expect(lines.join("\n")).toContain("Imported 1 skills");
    expect(lines.join("\n")).toContain("Missing source files: 1");
  });

  it("bundle add-template copies a built-in template into the central bundles directory", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "bundle", "template", "import", "K-Dense-AI-scientific-skills"], { from: "node" });

    const bundlePath = path.join(workspace.homeDir, ".aweskill", "bundles", "k-dense-ai-scientific-skills.yaml");
    await expect(readFile(bundlePath, "utf8")).resolves.toContain("name: k-dense-ai-scientific-skills");
    expect(lines.join("\n")).toContain("Added bundle k-dense-ai-scientific-skills from template");
  });

  it("bundle add-template supports comma-separated template names", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    const templateBundlesDir = await getTemplateBundlesDir();
    const temporaryTemplatePath = path.join(templateBundlesDir, "temporary-science.yaml");
    await writeFile(temporaryTemplatePath, "name: temporary-science\nskills:\n  - example-skill\n", "utf8");

    try {
      await program.parseAsync(
        ["node", "aweskill", "bundle", "template", "import", "K-Dense-AI-scientific-skills,temporary-science"],
        { from: "node" },
      );

      expect(lines.join("\n")).toContain("Added bundle k-dense-ai-scientific-skills from template");
      expect(lines.join("\n")).toContain("Added bundle temporary-science from template");
    } finally {
      await rm(temporaryTemplatePath, { force: true });
    }
  });

  it("bundle add-skill supports comma-separated bundles and skills", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "biopython"));
    await writeSkill(getSkillPath(workspace.homeDir, "scanpy"));
    await program.parseAsync(["node", "aweskill", "bundle", "create", "science-a,science-b"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "bundle", "add", "science-a,science-b", "biopython,scanpy"], { from: "node" });

    await expect(
      readFile(path.join(workspace.homeDir, ".aweskill", "bundles", "science-a.yaml"), "utf8"),
    ).resolves.toContain("biopython");
    await expect(
      readFile(path.join(workspace.homeDir, ".aweskill", "bundles", "science-b.yaml"), "utf8"),
    ).resolves.toContain("scanpy");
    expect(lines.join("\n")).toContain("Bundle science-a:");
    expect(lines.join("\n")).toContain("Bundle science-b:");
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

    await program.parseAsync(["node", "aweskill", "doctor", "dedupe"], { from: "node" });

    expect(lines.join("\n")).toContain("Duplicate skill groups in central repo:");
    expect(lines.join("\n")).toContain("  architecture-designer: 2 entries");
    expect(lines.join("\n")).toContain("keep: architecture-designer-0.1.0");
    expect(lines.join("\n")).toContain("drop: architecture-designer ");
    expect(lines.join("\n")).toContain("Dry run only. Use --apply to move duplicates into dup_skills, or --apply --delete to delete them.");
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "architecture-designer"), "SKILL.md"), "utf8")).resolves.toContain("Base");
  });

  it("doctor clean reports and removes suspicious files with --apply", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await mkdir(getSkillPath(workspace.homeDir, "broken-skill"), { recursive: true });
    await writeFile(path.join(workspace.homeDir, ".aweskill", "skills", "._global"), "junk\n", "utf8");
    await writeFile(path.join(workspace.homeDir, ".aweskill", "bundles", "._global"), "junk\n", "utf8");

    await program.parseAsync(["node", "aweskill", "doctor", "clean"], { from: "node" });
    expect(lines.join("\n")).toContain("Suspicious store entries:");
    expect(lines.join("\n")).toContain("Dry run only. Use --apply to remove suspicious entries.");
    await expect(access(path.join(workspace.homeDir, ".aweskill", "skills", "._global"))).resolves.toBeUndefined();

    lines.length = 0;
    await program.parseAsync(["node", "aweskill", "doctor", "clean", "--apply"], { from: "node" });
    expect(lines.join("\n")).toContain("Removed 3 suspicious store entries");
    await expect(access(path.join(workspace.homeDir, ".aweskill", "skills", "._global"))).rejects.toThrow();
    await expect(access(path.join(workspace.homeDir, ".aweskill", "bundles", "._global"))).rejects.toThrow();
    await expect(access(getSkillPath(workspace.homeDir, "broken-skill"))).rejects.toThrow();
  });

  it("rmdup --apply moves duplicates into dup_skills", async () => {
    const workspace = await createTempWorkspace();
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: () => undefined,
      error: () => undefined,
    });

    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer"), "Base");
    await writeSkill(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "Versioned");

    await program.parseAsync(["node", "aweskill", "doctor", "dedupe", "--apply"], { from: "node" });

    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "architecture-designer-0.1.0"), "SKILL.md"), "utf8")).resolves.toContain("Versioned");
    await expect(readFile(path.join(workspace.homeDir, ".aweskill", "dup_skills", "architecture-designer", "SKILL.md"), "utf8")).resolves.toContain("Base");
    await expect(access(path.join(getSkillPath(workspace.homeDir, "architecture-designer"), "SKILL.md"))).rejects.toThrow();
  });

  it("rmdup --apply --delete permanently deletes duplicates", async () => {
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

    await program.parseAsync(["node", "aweskill", "doctor", "dedupe", "--apply", "--delete"], { from: "node" });

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
      program.parseAsync(["node", "aweskill", "agent", "add", "skill", "aeon", "--global", "--agent", "claude-code"], { from: "node" }),
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

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "ephemeral-skill"));
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "ephemeral-skill", "--global", "--agent", "codex"], { from: "node" });

    const projPath = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "ephemeral-skill");
    await expect(readFile(path.join(projPath, "SKILL.md"), "utf8")).resolves.toContain("Example Skill");

    // Delete the central skill manually, then sync
    await rm(getSkillPath(workspace.homeDir, "ephemeral-skill"), { recursive: true, force: true });
    await program.parseAsync(["node", "aweskill", "agent", "sync"], { from: "node" });

    expect(lines.join("\n")).toContain("Removed 1 stale projection(s)");
    await expect(readFile(path.join(projPath, "SKILL.md"), "utf8")).rejects.toThrow();
  });

  it("recover converts managed symlinks into full directories", async () => {
    const workspace = await createTempWorkspace();
    const lines: string[] = [];
    const program = createProgram({
      cwd: workspace.projectDir,
      homeDir: workspace.homeDir,
      write: (message) => lines.push(message),
      error: () => undefined,
    });

    await program.parseAsync(["node", "aweskill", "store", "init"], { from: "node" });
    await writeSkill(getSkillPath(workspace.homeDir, "recover-me"), "Recover Me");
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "recover-me", "--global", "--agent", "codex"], { from: "node" });
    await program.parseAsync(["node", "aweskill", "agent", "add", "skill", "recover-me", "--global", "--agent", "cursor"], { from: "node" });

    const codexTarget = path.join(resolveAgentSkillsDir("codex", "global", workspace.homeDir), "recover-me");
    const cursorTarget = path.join(resolveAgentSkillsDir("cursor", "global", workspace.homeDir), "recover-me");

    expect((await lstat(codexTarget)).isSymbolicLink()).toBe(true);
    expect((await lstat(cursorTarget)).isSymbolicLink()).toBe(true);

    await program.parseAsync(["node", "aweskill", "agent", "recover", "--global", "--agent", "codex,cursor"], { from: "node" });

    expect((await lstat(codexTarget)).isDirectory()).toBe(true);
    expect((await lstat(cursorTarget)).isDirectory()).toBe(true);
    await expect(readFile(path.join(codexTarget, "SKILL.md"), "utf8")).resolves.toContain("Recover Me");
    await expect(readFile(path.join(cursorTarget, "SKILL.md"), "utf8")).resolves.toContain("Recover Me");
    expect(lines.join("\n")).toContain("Recovered 2 skill projection(s)");
    expect(lines.join("\n")).toContain("codex:recover-me");
    expect(lines.join("\n")).toContain("cursor:recover-me");
  });
});
