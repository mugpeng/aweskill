import { homedir } from "node:os";
import path from "node:path";

import type { AweskillPaths } from "../types.js";

export function sanitizeName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 80);
}

export function stripVersionSuffix(input: string): string {
  return input.replace(/-\d+(?:\.\d+)*$/, "");
}

export function getDuplicateMatchKey(input: string): string {
  return stripVersionSuffix(sanitizeName(input)).replace(/[^a-z0-9]+/g, "");
}

export function expandHomePath(targetPath: string, homeDir = homedir()): string {
  if (targetPath === "~") {
    return homeDir;
  }

  if (targetPath.startsWith("~/")) {
    return path.join(homeDir, targetPath.slice(2));
  }

  return targetPath;
}

export function getAweskillPaths(homeDir: string): AweskillPaths {
  const rootDir = path.join(homeDir, ".aweskill");
  return {
    homeDir,
    rootDir,
    skillsDir: path.join(rootDir, "skills"),
    dupSkillsDir: path.join(rootDir, "dup_skills"),
    backupDir: path.join(rootDir, "backup"),
    bundlesDir: path.join(rootDir, "bundles"),
  };
}

export function getProjectConfigPath(projectDir: string): string {
  return path.join(projectDir, ".aweskill.yaml");
}

export function isPathSafe(baseDir: string, targetPath: string): boolean {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);

  if (base === target) {
    return true;
  }

  const relativePath = path.relative(base, target);
  return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

export function assertPathSafe(baseDir: string, targetPath: string): void {
  if (!isPathSafe(baseDir, targetPath)) {
    throw new Error(`Path escapes base directory: ${targetPath}`);
  }
}

export function uniqueSorted<T>(items: T[]): T[] {
  return [...new Set(items)].sort() as T[];
}

export function splitCommaValues(input: string): string[] {
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function splitNameTokens(input: string | string[]): string[] {
  const values = Array.isArray(input) ? input : [input];
  return values.flatMap((value) => splitCommaValues(value));
}

export function normalizeNameList(input: string | string[]): string[] {
  return uniqueSorted(splitNameTokens(input).map((value) => sanitizeName(value)));
}
