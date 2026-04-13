import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createSkillsBackupArchive, extractSkillsArchive } from "../src/lib/backup.js";
import { getAweskillPaths } from "../src/lib/path.js";
import { createTempWorkspace } from "./helpers.js";

describe("backup helpers", () => {
  it("creates and extracts a portable tar.gz backup without shelling out", async () => {
    const workspace = await createTempWorkspace();
    const { skillsDir } = getAweskillPaths(workspace.homeDir);
    const nestedDir = path.join(skillsDir, "demo-skill", "scripts");

    await mkdir(nestedDir, { recursive: true });
    await writeFile(path.join(skillsDir, "demo-skill", "SKILL.md"), "# Demo Skill\n", "utf8");
    await writeFile(path.join(nestedDir, "run.ts"), "export const ok = true;\n", "utf8");

    const archivePath = await createSkillsBackupArchive(workspace.homeDir);
    expect(archivePath).toMatch(/\.tar\.gz$/);
    await expect(access(archivePath)).resolves.toBeUndefined();

    const extracted = await extractSkillsArchive(archivePath);
    await expect(readFile(path.join(extracted.extractedSkillsDir, "demo-skill", "SKILL.md"), "utf8")).resolves.toContain("Demo Skill");
    await expect(readFile(path.join(extracted.extractedSkillsDir, "demo-skill", "scripts", "run.ts"), "utf8")).resolves.toContain("ok = true");
  });
});
