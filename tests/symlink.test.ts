import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSkillCopy,
  createSkillSymlink,
  getDirectoryLinkTypeForPlatform,
  listManagedSkillNames,
  removeManagedProjection,
  setDirectoryLinkCreatorForTesting,
} from "../src/lib/symlink.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("symlink helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setDirectoryLinkCreatorForTesting();
  });

  it("creates managed copies and tracks them as copy projections", async () => {
    const workspace = await createTempWorkspace();
    const sourcePath = getSkillPath(workspace.homeDir, "copy-me");
    const targetDir = path.join(workspace.rootDir, "agent", "skills");
    const targetPath = path.join(targetDir, "copy-me");

    await writeSkill(sourcePath, "Copy Me");
    await mkdir(targetDir, { recursive: true });

    await expect(createSkillCopy(sourcePath, targetPath)).resolves.toEqual({ status: "created", mode: "copy" });
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

    await expect(createSkillSymlink(sourcePath, targetPath)).resolves.toEqual({ status: "created", mode: "symlink" });
    expect((await lstat(targetPath)).isSymbolicLink()).toBe(true);
    await expect(removeManagedProjection(targetPath)).resolves.toBe(true);
  });

  it("uses junction semantics on Windows and falls back to managed copy when link creation is denied", async () => {
    const workspace = await createTempWorkspace();
    const sourcePath = getSkillPath(workspace.homeDir, "fallback-me");
    const targetDir = path.join(workspace.rootDir, "agent", "skills");
    const targetPath = path.join(targetDir, "fallback-me");

    await writeSkill(sourcePath, "Fallback Me");
    await mkdir(targetDir, { recursive: true });

    expect(getDirectoryLinkTypeForPlatform("win32")).toBe("junction");
    vi.spyOn(process, "platform", "get").mockReturnValue("win32");
    setDirectoryLinkCreatorForTesting(async () => {
      throw Object.assign(new Error("denied"), { code: "EPERM" });
    });

    await expect(createSkillSymlink(sourcePath, targetPath)).resolves.toEqual({ status: "created", mode: "copy" });
    expect((await lstat(targetPath)).isDirectory()).toBe(true);
    await expect(readFile(path.join(targetPath, "SKILL.md"), "utf8")).resolves.toContain("Fallback Me");
    await expect(readFile(path.join(targetPath, ".aweskill-projection.json"), "utf8")).resolves.toContain("\"managedBy\": \"aweskill\"");
  });

  it("skips recreating an existing managed copy for the same source", async () => {
    const workspace = await createTempWorkspace();
    const sourcePath = getSkillPath(workspace.homeDir, "copy-skip");
    const targetDir = path.join(workspace.rootDir, "agent", "skills");
    const targetPath = path.join(targetDir, "copy-skip");

    await writeSkill(sourcePath, "Copy Skip");
    await mkdir(targetDir, { recursive: true });
    await mkdir(targetPath, { recursive: true });
    await writeFile(
      path.join(targetPath, ".aweskill-projection.json"),
      JSON.stringify({ managedBy: "aweskill", sourcePath: path.resolve(sourcePath) }, null, 2),
      "utf8",
    );

    await expect(createSkillSymlink(sourcePath, targetPath)).resolves.toEqual({ status: "skipped", mode: "copy" });
  });
});
