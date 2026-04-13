import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { importPath, importSkill } from "../src/lib/import.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("import helpers", () => {
  it("imports through a symlink source and records a warning", async () => {
    const workspace = await createTempWorkspace();
    const realDir = path.join(workspace.rootDir, "real-skill");
    const linkedDir = path.join(workspace.rootDir, "linked-skill");

    await writeSkill(realDir, "Linked Skill");
    await symlink(realDir, linkedDir);

    const result = await importSkill({
      homeDir: workspace.homeDir,
      sourcePath: linkedDir,
      mode: "cp",
    });

    expect(result.warnings[0]).toContain(`Source ${linkedDir} is a symlink; copied from ${realDir}`);
    await expect(readFile(path.join(getSkillPath(workspace.homeDir, "linked-skill"), "SKILL.md"), "utf8")).resolves.toContain("Linked Skill");
  });

  it("returns an existing single-skill destination without overriding it", async () => {
    const workspace = await createTempWorkspace();
    const sourceDir = path.join(workspace.rootDir, "merge-me");
    const destinationDir = getSkillPath(workspace.homeDir, "merge-me");

    await writeSkill(sourceDir, "Merge Me");
    await writeSkill(destinationDir, "Original");
    await mkdir(path.join(destinationDir, "scripts"), { recursive: true });
    await writeFile(path.join(destinationDir, "scripts", "keep.sh"), "echo keep\n", "utf8");

    const result = await importPath({
      homeDir: workspace.homeDir,
      sourcePath: sourceDir,
      mode: "cp",
      override: false,
    });

    expect(result.kind).toBe("single");
    expect(result.alreadyExisted).toBe(true);
    await expect(readFile(path.join(destinationDir, "SKILL.md"), "utf8")).resolves.toContain("Original");
    await expect(readFile(path.join(destinationDir, "scripts", "keep.sh"), "utf8")).resolves.toContain("keep");
    await expect(readFile(path.join(destinationDir, "scripts", "new.sh"), "utf8")).rejects.toThrow();
  });
});
