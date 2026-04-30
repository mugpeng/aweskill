import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import type { BundleDefinition, SkillEntry } from "../types.js";
import { pathExists } from "./fs.js";

export type HygieneFindingKind =
  | "unexpected-skill-entry"
  | "missing-skill-md"
  | "unexpected-bundle-entry"
  | "invalid-bundle-yaml";

export interface HygieneFinding {
  kind: HygieneFindingKind;
  path: string;
  relativePath: string;
}

export interface HygieneScanResult {
  validSkills: SkillEntry[];
  validBundles: BundleDefinition[];
  findings: HygieneFinding[];
}

function relativeLabel(rootDir: string, targetPath: string): string {
  return path.relative(rootDir, targetPath).split(path.sep).join("/");
}

export async function scanStoreHygiene(options: {
  rootDir: string;
  skillsDir: string;
  bundlesDir: string;
  includeSkills?: boolean;
  includeBundles?: boolean;
}): Promise<HygieneScanResult> {
  const includeSkills = options.includeSkills ?? true;
  const includeBundles = options.includeBundles ?? true;
  const findings: HygieneFinding[] = [];
  const validSkills: SkillEntry[] = [];
  const validBundles: BundleDefinition[] = [];

  if (includeSkills && (await pathExists(options.skillsDir))) {
    const entries = await readdir(options.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(options.skillsDir, entry.name);
      const stats = await lstat(entryPath);

      if (stats.isDirectory() || stats.isSymbolicLink()) {
        const hasSKILLMd = await pathExists(path.join(entryPath, "SKILL.md"));
        if (hasSKILLMd) {
          validSkills.push({ name: entry.name, path: entryPath, hasSKILLMd: true });
        } else {
          findings.push({
            kind: "missing-skill-md",
            path: entryPath,
            relativePath: relativeLabel(options.rootDir, entryPath),
          });
        }
        continue;
      }

      findings.push({
        kind: "unexpected-skill-entry",
        path: entryPath,
        relativePath: relativeLabel(options.rootDir, entryPath),
      });
    }
  }

  if (includeBundles && (await pathExists(options.bundlesDir))) {
    const entries = await readdir(options.bundlesDir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(options.bundlesDir, entry.name);
      if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
        findings.push({
          kind: "unexpected-bundle-entry",
          path: entryPath,
          relativePath: relativeLabel(options.rootDir, entryPath),
        });
        continue;
      }

      try {
        const parsed = parse(await readFile(entryPath, "utf8")) as Partial<BundleDefinition> | null;
        validBundles.push({
          name: String(parsed?.name ?? entry.name.replace(/\.yaml$/, ""))
            .trim()
            .toLowerCase(),
          skills: Array.isArray(parsed?.skills)
            ? parsed.skills
                .map((skill) => String(skill).trim().toLowerCase())
                .filter(Boolean)
                .sort()
            : [],
        });
      } catch {
        findings.push({
          kind: "invalid-bundle-yaml",
          path: entryPath,
          relativePath: relativeLabel(options.rootDir, entryPath),
        });
      }
    }
  }

  validSkills.sort((left, right) => left.name.localeCompare(right.name));
  validBundles.sort((left, right) => left.name.localeCompare(right.name));
  findings.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return { validSkills, validBundles, findings };
}

export function formatHygieneHint(findings: HygieneFinding[]): string[] {
  if (findings.length === 0) {
    return [];
  }

  return [
    `Suspicious store entries detected: ${findings.length}`,
    `Run "aweskill doctor clean" to inspect them, or "aweskill doctor clean --apply" to remove them.`,
  ];
}
