import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse, stringify } from "yaml";

import type { BundleDefinition } from "../types.js";
import { pathExists } from "./fs.js";
import { getAweskillPaths, sanitizeName, uniqueSorted } from "./path.js";
import { skillExists } from "./skills.js";

function bundleFilePath(homeDir: string, bundleName: string): string {
  return path.join(getAweskillPaths(homeDir).bundlesDir, `${sanitizeName(bundleName)}.yaml`);
}

function bundleFilePathInDirectory(bundlesDir: string, bundleName: string): string {
  return path.join(bundlesDir, `${sanitizeName(bundleName)}.yaml`);
}

function normalizeBundle(raw: unknown, fallbackName: string): BundleDefinition {
  const data = (raw ?? {}) as Partial<BundleDefinition>;
  return {
    name: sanitizeName(data.name ?? fallbackName),
    skills: uniqueSorted((data.skills ?? []).map((skill) => sanitizeName(String(skill))).filter(Boolean)),
  };
}

export async function listBundles(homeDir: string): Promise<BundleDefinition[]> {
  const bundlesDir = getAweskillPaths(homeDir).bundlesDir;
  return listBundlesInDirectory(bundlesDir);
}

export async function listBundlesInDirectory(bundlesDir: string): Promise<BundleDefinition[]> {
  await mkdir(bundlesDir, { recursive: true });
  const entries = await readdir(bundlesDir, { withFileTypes: true });

  const bundles = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
      .map(async (entry) => readBundleFromDirectory(bundlesDir, entry.name.replace(/\.yaml$/, ""))),
  );

  return bundles.sort((left, right) => left.name.localeCompare(right.name));
}

export async function readBundle(homeDir: string, bundleName: string): Promise<BundleDefinition> {
  const filePath = bundleFilePath(homeDir, bundleName);
  const content = await readFile(filePath, "utf8");
  return normalizeBundle(parse(content), bundleName);
}

export async function readBundleFromDirectory(bundlesDir: string, bundleName: string): Promise<BundleDefinition> {
  const filePath = bundleFilePathInDirectory(bundlesDir, bundleName);
  const content = await readFile(filePath, "utf8");
  return normalizeBundle(parse(content), bundleName);
}

export async function writeBundle(homeDir: string, bundle: BundleDefinition): Promise<BundleDefinition> {
  const normalized = normalizeBundle(bundle, bundle.name);
  const filePath = bundleFilePath(homeDir, normalized.name);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stringify(normalized), "utf8");
  return normalized;
}

export async function createBundle(homeDir: string, bundleName: string): Promise<BundleDefinition> {
  const normalizedName = sanitizeName(bundleName);
  return writeBundle(homeDir, { name: normalizedName, skills: [] });
}

export async function addSkillToBundle(homeDir: string, bundleName: string, skillName: string): Promise<BundleDefinition> {
  const normalizedSkill = sanitizeName(skillName);
  if (!(await skillExists(homeDir, normalizedSkill))) {
    throw new Error(`Unknown skill: ${normalizedSkill}`);
  }

  const bundle = await readBundle(homeDir, bundleName);
  bundle.skills = uniqueSorted([...bundle.skills, normalizedSkill].filter(Boolean));
  return writeBundle(homeDir, bundle);
}

export async function removeSkillFromBundle(homeDir: string, bundleName: string, skillName: string): Promise<BundleDefinition> {
  const bundle = await readBundle(homeDir, bundleName);
  const normalizedSkill = sanitizeName(skillName);
  bundle.skills = bundle.skills.filter((skill) => skill !== normalizedSkill);
  return writeBundle(homeDir, bundle);
}

export async function deleteBundle(homeDir: string, bundleName: string): Promise<boolean> {
  const filePath = bundleFilePath(homeDir, bundleName);
  if (!(await pathExists(filePath))) {
    return false;
  }

  await rm(filePath, { force: true });
  return true;
}
