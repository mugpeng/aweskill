import { lstat, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createSkillCopy, createSkillSymlink, listManagedSkillNames, removeManagedProjection } from "../src/lib/symlink.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("symlink helpers", () => {
  it("creates managed copies and tracks them as copy projections", async () => {
    const workspace = await createTempWorkspace();
    const sourcePath = getSkillPath(workspace.homeDir, "copy-me");
    const targetDir = path.join(workspace.rootDir, "agent", "skills");
    const targetPath = path.join(targetDir, "copy-me");

    await writeSkill(sourcePath, "Copy Me");
    await mkdir(targetDir, { recursive: true });

    await expect(createSkillCopy(sourcePath, targetPath)).resolves.toBe("created");
    await expect(readFile(path.join(targetPath, "SKILL.md"), "utf8")).resolves.toContain("Copy Me");

    const managed = await listManagedSkillNames(targetDir, path.join(workspace.homeDir, ".aweskill", "skills"));
    expect(managed.get("copy-me")).toBe("copy");
  });

  it("creates removable symlink projections", async () => {
    const workspace = await createTempWorkspace();
    const sourcePath = getSkillPath(workspace.homeDir, "link-me");
    const targetDir = path.join(workspace.rootDir, "agent", "skills");
    const targetPath = path.join(targetDir, "link-me");

    await writeSkill(sourcePath, "Link Me");
    await mkdir(targetDir, { recursive: true });

    await expect(createSkillSymlink(sourcePath, targetPath)).resolves.toBe("created");
    expect((await lstat(targetPath)).isSymbolicLink()).toBe(true);
    await expect(removeManagedProjection(targetPath)).resolves.toBe(true);
  });
});
