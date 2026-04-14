import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("config layout", () => {
  it("keeps tool configs under config/", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..");
    const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(existsSync(path.join(repoRoot, "config", "tsup.config.ts"))).toBe(true);
    expect(existsSync(path.join(repoRoot, "config", "vitest.config.ts"))).toBe(true);
    expect(packageJson.scripts.build).toContain("config/tsup.config.ts");
    expect(packageJson.scripts.test).toContain("config/vitest.config.ts");
  });

  it("keeps built-in meta-skills under resources/skills/", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..");
    const base = path.join(repoRoot, "resources", "skills");
    for (const name of ["aweskill", "aweskill-advanced", "aweskill-doctor"]) {
      expect(existsSync(path.join(base, name, "SKILL.md"))).toBe(true);
    }
  });
});
