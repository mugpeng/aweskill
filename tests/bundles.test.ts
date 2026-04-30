import { describe, expect, it } from "vitest";

import {
  addSkillToBundle,
  createBundle,
  deleteBundle,
  listBundles,
  readBundle,
  removeSkillFromBundle,
} from "../src/lib/bundles.js";
import { getSkillPath } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("bundles", () => {
  it("creates, reads, lists, mutates, and deletes bundles", async () => {
    const workspace = await createTempWorkspace();
    await writeSkill(getSkillPath(workspace.homeDir, "shell"), "Shell");
    await writeSkill(getSkillPath(workspace.homeDir, "python"), "Python");

    await createBundle(workspace.homeDir, "backend");
    await addSkillToBundle(workspace.homeDir, "backend", "shell");
    await addSkillToBundle(workspace.homeDir, "backend", "python");

    await expect(readBundle(workspace.homeDir, "backend")).resolves.toEqual({
      name: "backend",
      skills: ["python", "shell"],
    });
    await expect(listBundles(workspace.homeDir)).resolves.toEqual([{ name: "backend", skills: ["python", "shell"] }]);

    await removeSkillFromBundle(workspace.homeDir, "backend", "shell");
    await expect(readBundle(workspace.homeDir, "backend")).resolves.toEqual({
      name: "backend",
      skills: ["python"],
    });

    await expect(deleteBundle(workspace.homeDir, "backend")).resolves.toBe(true);
    await expect(listBundles(workspace.homeDir)).resolves.toEqual([]);
  });

  it("rejects adding unknown skills to a bundle", async () => {
    const workspace = await createTempWorkspace();
    await createBundle(workspace.homeDir, "backend");

    await expect(addSkillToBundle(workspace.homeDir, "backend", "missing-skill")).rejects.toThrow(
      "Unknown skill: missing-skill",
    );
  });
});
