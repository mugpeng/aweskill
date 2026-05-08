import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getSkillLockPath, readSkillLock, upsertSkillLockEntry } from "../src/lib/lock.js";
import { createTempWorkspace } from "./helpers.js";

describe("skill lock", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes sorted lock entries under the aweskill store", async () => {
    const workspace = await createTempWorkspace();

    await upsertSkillLockEntry(workspace.homeDir, "beta", {
      source: "owner/repo",
      sourceType: "github",
      sourceUrl: "https://github.com/owner/repo.git",
      computedHash: "bbb",
    });
    await upsertSkillLockEntry(workspace.homeDir, "alpha", {
      source: "owner/repo",
      sourceType: "github",
      sourceUrl: "https://github.com/owner/repo.git",
      computedHash: "aaa",
    });

    const lock = await readSkillLock(workspace.homeDir);
    expect(lock.version).toBe(1);
    expect(Object.keys(lock.skills)).toEqual(["alpha", "beta"]);
    expect(lock.skills.alpha?.installedAt).toBe(lock.skills.alpha?.updatedAt);
  });

  it("warns when the lock file has an unsupported shape", async () => {
    const workspace = await createTempWorkspace();
    const lockPath = getSkillLockPath(workspace.homeDir);
    await mkdir(path.dirname(lockPath), { recursive: true });
    await writeFile(lockPath, '{"version":999,"skills":{}}\n', "utf8");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const lock = await readSkillLock(workspace.homeDir);

    expect(lock).toEqual({ version: 1, skills: {} });
    expect(error).toHaveBeenCalledWith(`Warning: corrupt ${lockPath}, starting with empty lock`);
  });
});
