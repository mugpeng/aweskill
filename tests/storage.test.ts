import { describe, expect, it } from "vitest";

import { addSkillToBundle, createBundle, listBundles, readBundle, removeSkillFromBundle } from "../src/lib/bundles.js";
import { ensureHomeLayout } from "../src/lib/skills.js";
import { createTempWorkspace, writeSkill } from "./helpers.ts";

describe("storage modules", () => {
  it("creates and mutates bundles", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await createBundle(workspace.homeDir, "frontend");
    await writeSkill(`${workspace.homeDir}/.aweskill/skills/pr-review`);
    await writeSkill(`${workspace.homeDir}/.aweskill/skills/frontend-design`);
    await addSkillToBundle(workspace.homeDir, "frontend", "pr-review");
    await addSkillToBundle(workspace.homeDir, "frontend", "frontend-design");

    expect((await readBundle(workspace.homeDir, "frontend")).skills).toEqual(["frontend-design", "pr-review"]);

    await removeSkillFromBundle(workspace.homeDir, "frontend", "frontend-design");
    expect((await listBundles(workspace.homeDir))[0].skills).toEqual(["pr-review"]);
  });

  it("rejects bundle skills that do not exist in the central repository", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await createBundle(workspace.homeDir, "frontend");

    await expect(addSkillToBundle(workspace.homeDir, "frontend", "missing-skill")).rejects.toThrow(
      "Unknown skill: missing-skill",
    );
  });
});
