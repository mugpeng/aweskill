import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { computeDirectoryHash } from "../src/lib/hash.js";
import {
  classifyDownloadConflict,
  discoverDownloadableSkills,
  DuplicateSkillNameError,
  formatDownloadConflictLines,
  formatDuplicateSkillNameConflict,
  throwDownloadConflict,
} from "../src/lib/download.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("download helpers", () => {
  it("discovers skill directories and reports their relative subpaths", async () => {
    const workspace = await createTempWorkspace();
    await writeSkill(path.join(workspace.projectDir, "skills", "caveman"), "Caveman");
    await writeSkill(path.join(workspace.projectDir, ".codex", "skills", "review"), "Review");

    const skills = await discoverDownloadableSkills(workspace.projectDir);

    expect(skills.map((skill) => `${skill.name}:${skill.subpath}`)).toEqual([
      "caveman:skills/caveman",
      "review:.codex/skills/review",
    ]);
  });

  it("computes deterministic directory hashes from file paths and contents", async () => {
    const workspace = await createTempWorkspace();
    const first = path.join(workspace.projectDir, "first");
    const second = path.join(workspace.projectDir, "second");
    await mkdir(path.join(first, "scripts"), { recursive: true });
    await mkdir(path.join(second, "scripts"), { recursive: true });
    await writeFile(path.join(first, "SKILL.md"), "# Hash Me\n", "utf8");
    await writeFile(path.join(first, "scripts", "run.sh"), "echo ok\n", "utf8");
    await writeFile(path.join(second, "scripts", "run.sh"), "echo ok\n", "utf8");
    await writeFile(path.join(second, "SKILL.md"), "# Hash Me\n", "utf8");

    await expect(computeDirectoryHash(first)).resolves.toBe(await computeDirectoryHash(second));
  });

  it("classifies same-name conflicts by content and source records", async () => {
    const workspace = await createTempWorkspace();
    const existing = getSkillPath(workspace.homeDir, "caveman");
    const incoming = path.join(workspace.projectDir, "incoming");
    await writeSkill(existing, "Original");
    await writeSkill(incoming, "Changed");

    const currentHash = await computeDirectoryHash(existing);
    const incomingHash = await computeDirectoryHash(incoming);

    expect(
      await classifyDownloadConflict({
        homeDir: workspace.homeDir,
        name: "caveman",
        incomingHash: currentHash,
        incomingSource: { source: "owner/repo", sourceType: "github", sourceUrl: "https://github.com/owner/repo.git" },
      }),
    ).toEqual({ reason: "identical" });

    expect(
      await classifyDownloadConflict({
        homeDir: workspace.homeDir,
        name: "caveman",
        incomingHash,
        incomingSource: { source: "owner/repo", sourceType: "github", sourceUrl: "https://github.com/owner/repo.git" },
      }),
    ).toEqual({ reason: "unmanaged" });

    await readFile(path.join(existing, "SKILL.md"), "utf8");
  });

  it("throws when the source contains duplicate skill names in different paths", async () => {
    const workspace = await createTempWorkspace();
    await writeSkill(path.join(workspace.projectDir, "skills", "caveman"), "First");
    await writeSkill(path.join(workspace.projectDir, ".codex", "skills", "caveman"), "Second");

    await expect(discoverDownloadableSkills(workspace.projectDir)).rejects.toThrow(
      'Duplicate skill name "caveman" found in source:',
    );
  });

  it("formats duplicate skill-name conflicts into user-facing lines with source URLs", () => {
    const lines = formatDuplicateSkillNameConflict(
      new DuplicateSkillNameError(
        "caveman",
        { path: "/tmp/a", subpath: "skills/caveman" },
        { path: "/tmp/b", subpath: ".codex/skills/caveman" },
      ),
      {
        sourceUrl: "https://github.com/owner/repo.git",
        ref: "main",
        commandName: "aweskill download",
      },
    );

    expect(lines).toEqual([
      "Duplicate skill names found in source:",
      "  - caveman: https://github.com/owner/repo/tree/main/skills/caveman",
      "  - caveman: https://github.com/owner/repo/tree/main/.codex/skills/caveman",
      "Please check the candidate source paths above and confirm which one you want to use.",
      "Example command below: replace the URL with the confirmed source path before running it.",
      "  aweskill download https://github.com/owner/repo/tree/main/skills/caveman --override",
    ]);
  });

  it("formats structured download conflict messages into user-facing lines", () => {
    expect(formatDownloadConflictLines("caveman", "identical")).toEqual([
      "Skipped caveman: identical content is already installed.",
    ]);

    expect(formatDownloadConflictLines("caveman", "same-source-different-content")).toEqual([
      "Update available for caveman: installed content differs from the same source.",
      "Use --override to replace it, or --as <name> to install a separate copy.",
    ]);

    expect(formatDownloadConflictLines("caveman", "different-source")).toEqual([
      "Name conflict for caveman: another skill with this name is installed from a different source.",
      "Use --override to replace it, or --as <name> to install under a new name.",
    ]);

    expect(formatDownloadConflictLines("caveman", "unmanaged")).toEqual([
      "Unmanaged conflict for caveman: a skill with this name exists but has no source record.",
      "Use --override to replace it, or --as <name> to install under a new name.",
    ]);

    expect(formatDownloadConflictLines("caveman", "hash-unavailable")).toEqual([
      "Cannot compare caveman: existing or downloaded content hash is unavailable.",
      "Use --override to replace it, or --as <name> to install under a new name.",
    ]);
  });

  it("throws structured download conflicts as a single error message", () => {
    expect(() => throwDownloadConflict("caveman", "different-source")).toThrow(
      "Name conflict for caveman: another skill with this name is installed from a different source. Use --override to replace it, or --as <name> to install under a new name.",
    );
  });
});
