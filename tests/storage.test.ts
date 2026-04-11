import { mkdir } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { addSkillToBundle, createBundle, listBundles, readBundle, removeSkillFromBundle } from "../src/lib/bundles.js";
import {
  disableGlobalActivation,
  enableGlobalActivation,
  enableProjectActivation,
  readGlobalConfig,
  readProjectConfig,
} from "../src/lib/config.js";
import { matchesProjectRule } from "../src/lib/matcher.js";
import { ensureGlobalConfig } from "../src/lib/config.js";
import { ensureHomeLayout } from "../src/lib/skills.js";
import { createTempWorkspace } from "./helpers.js";

describe("storage modules", () => {
  it("creates and mutates bundles", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await createBundle(workspace.homeDir, "frontend");
    await addSkillToBundle(workspace.homeDir, "frontend", "pr-review");
    await addSkillToBundle(workspace.homeDir, "frontend", "frontend-design");

    expect((await readBundle(workspace.homeDir, "frontend")).skills).toEqual([
      "frontend-design",
      "pr-review",
    ]);

    await removeSkillFromBundle(workspace.homeDir, "frontend", "frontend-design");
    expect((await listBundles(workspace.homeDir))[0].skills).toEqual(["pr-review"]);
  });

  it("persists global and project activations", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await ensureGlobalConfig(workspace.homeDir);
    await enableGlobalActivation(workspace.homeDir, {
      type: "bundle",
      name: "backend",
      agents: ["claude-code", "codex"],
    });
    await enableProjectActivation(workspace.projectDir, {
      type: "skill",
      name: "pr-review",
      agents: ["cursor"],
    });

    expect((await readGlobalConfig(workspace.homeDir)).activations).toHaveLength(1);
    expect((await readProjectConfig(workspace.projectDir)).activations).toHaveLength(1);

    await disableGlobalActivation(workspace.homeDir, {
      type: "bundle",
      name: "backend",
      agents: ["codex"],
    });
    expect((await readGlobalConfig(workspace.homeDir)).activations[0]?.agents).toEqual(["claude-code"]);
  });

  it("matches exact, prefix, and glob project rules", async () => {
    const workspace = await createTempWorkspace();
    await mkdir(workspace.projectDir, { recursive: true });

    expect(
      matchesProjectRule(
        { path: workspace.projectDir, match: "exact", activations: [] },
        workspace.projectDir,
      ),
    ).toBe(true);
    expect(
      matchesProjectRule(
        { path: workspace.projectDir, match: "prefix", activations: [] },
        `${workspace.projectDir}/subdir`,
      ),
    ).toBe(true);
    expect(
      matchesProjectRule(
        { path: `${workspace.rootDir}/pro*`, match: "glob", activations: [] },
        workspace.projectDir,
      ),
    ).toBe(true);
  });
});
