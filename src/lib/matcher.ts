import path from "node:path";

import type { GlobalConfig, ProjectRule } from "../types.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToRegExp(pattern: string): RegExp {
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

export function matchesProjectRule(rule: ProjectRule, projectDir: string): boolean {
  const candidate = path.resolve(projectDir);
  const expected = path.resolve(rule.path);

  if (rule.match === "exact") {
    return candidate === expected;
  }

  if (rule.match === "prefix") {
    return candidate === expected || candidate.startsWith(`${expected}${path.sep}`);
  }

  return globToRegExp(expected).test(candidate);
}

export function getMatchingProjectRules(config: GlobalConfig, projectDir: string): ProjectRule[] {
  return config.projects.filter((rule) => matchesProjectRule(rule, projectDir));
}
