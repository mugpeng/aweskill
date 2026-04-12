import { describe, expect, it } from "vitest";

import { getMatchingProjectRules, matchesProjectRule } from "../src/lib/matcher.js";
import type { GlobalConfig, ProjectRule } from "../src/types.js";

function makeRule(path: string, match: ProjectRule["match"]): ProjectRule {
  return {
    path,
    match,
    activations: [],
  };
}

describe("matcher", () => {
  describe("matchesProjectRule", () => {
    it("supports exact matching", () => {
      expect(matchesProjectRule(makeRule("/tmp/app", "exact"), "/tmp/app")).toBe(true);
      expect(matchesProjectRule(makeRule("/tmp/app", "exact"), "/tmp/app/subdir")).toBe(false);
    });

    it("supports prefix matching", () => {
      expect(matchesProjectRule(makeRule("/tmp/app", "prefix"), "/tmp/app")).toBe(true);
      expect(matchesProjectRule(makeRule("/tmp/app", "prefix"), "/tmp/app/subdir")).toBe(true);
      expect(matchesProjectRule(makeRule("/tmp/app", "prefix"), "/tmp/application")).toBe(false);
    });

    it("supports glob matching", () => {
      expect(matchesProjectRule(makeRule("/tmp/*-app", "glob"), "/tmp/demo-app")).toBe(true);
      expect(matchesProjectRule(makeRule("/tmp/*-app", "glob"), "/tmp/demo-tool")).toBe(false);
    });
  });

  it("returns all matching project rules", () => {
    const config: GlobalConfig = {
      version: 1,
      activations: [],
      projects: [
        makeRule("/tmp/workspace", "exact"),
        makeRule("/tmp/workspace", "prefix"),
        makeRule("/tmp/*space", "glob"),
      ],
    };

    const matches = getMatchingProjectRules(config, "/tmp/workspace");
    expect(matches).toHaveLength(3);
    expect(matches.map((rule) => rule.match).sort()).toEqual(["exact", "glob", "prefix"]);
  });
});
