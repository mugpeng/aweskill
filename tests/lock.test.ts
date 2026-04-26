import { describe, expect, it } from "vitest";

import { readSkillLock, upsertSkillLockEntry } from "../src/lib/lock.js";
import { createTempWorkspace } from "./helpers.js";

describe("skill lock", () => {
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
});
