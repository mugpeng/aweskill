import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

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
    for (const name of ["aweskill", "aweskill-doctor"]) {
      expect(existsSync(path.join(base, name, "SKILL.md"))).toBe(true);
    }
  });

  it("keeps built-in skill front matter YAML-parseable with required metadata", () => {
    const repoRoot = path.resolve(import.meta.dirname, "..");
    const base = path.join(repoRoot, "resources", "skills");

    for (const name of readdirSync(base)) {
      const skillPath = path.join(base, name, "SKILL.md");
      if (!existsSync(skillPath)) {
        continue;
      }

      const content = readFileSync(skillPath, "utf8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      expect(match, `${skillPath} should contain YAML front matter`).not.toBeNull();

      const metadata = parse(match![1]) as { description?: unknown; name?: unknown } | null;
      expect(metadata?.name, `${skillPath} should define front matter name`).toBeTypeOf("string");
      expect(metadata?.description, `${skillPath} should define front matter description`).toBeTypeOf("string");
    }
  });
});
