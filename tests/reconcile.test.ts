import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createBundle, addSkillToBundle } from "../src/lib/bundles.js";
import { enableGlobalActivation, enableProjectActivation } from "../src/lib/config.js";
import { reconcileGlobal, reconcileProject } from "../src/lib/reconcile.js";
import { ensureHomeLayout } from "../src/lib/skills.js";
import { getSkillPath } from "../src/lib/skills.js";
import { resolveAgentSkillsDir } from "../src/lib/agents.js";
import { createTempWorkspace, writeSkill } from "./helpers.js";

describe("reconcile", () => {
  it("projects bundle and project activations into agent directories", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await writeSkill(getSkillPath(workspace.homeDir, "pr-review"));
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await createBundle(workspace.homeDir, "frontend");
    await addSkillToBundle(workspace.homeDir, "frontend", "pr-review");
    await addSkillToBundle(workspace.homeDir, "frontend", "frontend-design");
    await enableGlobalActivation(workspace.homeDir, {
      type: "skill",
      name: "pr-review",
      agents: ["claude-code"],
    });
    await enableProjectActivation(workspace.projectDir, {
      type: "bundle",
      name: "frontend",
      agents: ["cursor"],
    });

    await reconcileGlobal(workspace.homeDir);
    await reconcileProject(workspace.homeDir, workspace.projectDir);

    const globalTarget = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "pr-review");
    const copiedTarget = path.join(resolveAgentSkillsDir("cursor", "project", workspace.projectDir), "frontend-design");

    expect(await readFile(path.join(copiedTarget, "SKILL.md"), "utf8")).toContain("Example Skill");
    expect((await readFile(path.join(copiedTarget, ".aweskill-projection.json"), "utf8"))).toContain("\"managedBy\"");
    await expect(readFile(path.join(globalTarget, "SKILL.md"), "utf8")).resolves.toContain("Example Skill");
  });

  it("removes stale managed projections", async () => {
    const workspace = await createTempWorkspace();
    await ensureHomeLayout(workspace.homeDir);
    await mkdir(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), { recursive: true });
    await writeSkill(getSkillPath(workspace.homeDir, "pr-review"));
    await enableGlobalActivation(workspace.homeDir, {
      type: "skill",
      name: "pr-review",
      agents: ["claude-code"],
    });
    await reconcileGlobal(workspace.homeDir);
    await enableGlobalActivation(workspace.homeDir, {
      type: "skill",
      name: "frontend-design",
      agents: ["claude-code"],
    });
    await writeSkill(getSkillPath(workspace.homeDir, "frontend-design"));
    await reconcileGlobal(workspace.homeDir);

    const staleTarget = path.join(resolveAgentSkillsDir("claude-code", "global", workspace.homeDir), "frontend-design");
    await expect(readFile(path.join(staleTarget, "SKILL.md"), "utf8")).resolves.toContain("Example Skill");
  });
});
