import { mkdir, readdir, rename, rm } from "node:fs/promises";
import path from "node:path";

import type { SkillEntry } from "../types.js";
import { getAweskillPaths, getDuplicateMatchKey, sanitizeName, stripVersionSuffix } from "./path.js";
import { listSkills } from "./skills.js";

interface ParsedSkillName {
  baseName: string;
  matchKey: string;
  numericKey?: number[];
  hasNumericSuffix: boolean;
}

export interface DuplicateGroup {
  baseName: string;
  kept: SkillEntry;
  removed: SkillEntry[];
}

const NUMERIC_SUFFIX_PATTERN = /^(.*?)-(\d+(?:\.\d+)*)$/;

export function parseSkillName(name: string): ParsedSkillName {
  const normalizedName = sanitizeName(name);
  const match = normalizedName.match(NUMERIC_SUFFIX_PATTERN);
  if (!match) {
    return {
      baseName: stripVersionSuffix(normalizedName),
      matchKey: getDuplicateMatchKey(name),
      hasNumericSuffix: false,
    };
  }

  return {
    baseName: stripVersionSuffix(normalizedName),
    matchKey: getDuplicateMatchKey(name),
    hasNumericSuffix: true,
    numericKey: match[2].split(".").map((part) => Number.parseInt(part, 10)),
  };
}

function compareNumericKeys(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
}

export function choosePreferredSkill(entries: SkillEntry[]): SkillEntry {
  return [...entries].sort((left, right) => {
    const leftParsed = parseSkillName(left.name);
    const rightParsed = parseSkillName(right.name);

    if (leftParsed.hasNumericSuffix && !rightParsed.hasNumericSuffix) {
      return -1;
    }
    if (!leftParsed.hasNumericSuffix && rightParsed.hasNumericSuffix) {
      return 1;
    }

    if (leftParsed.numericKey && rightParsed.numericKey) {
      const comparison = compareNumericKeys(rightParsed.numericKey, leftParsed.numericKey);
      if (comparison !== 0) {
        return comparison;
      }
    }

    return left.name.localeCompare(right.name);
  })[0]!;
}

export function buildCanonicalSkillIndex(entries: SkillEntry[]): Map<string, SkillEntry> {
  const grouped = new Map<string, SkillEntry[]>();

  for (const entry of entries) {
    const parsed = parseSkillName(entry.name);
    const bucket = grouped.get(parsed.matchKey) ?? [];
    bucket.push(entry);
    grouped.set(parsed.matchKey, bucket);
  }

  const canonical = new Map<string, SkillEntry>();
  for (const [baseName, group] of grouped) {
    canonical.set(baseName, choosePreferredSkill(group));
  }

  return canonical;
}

export function resolveCanonicalSkillName(
  skillName: string,
  canonicalSkills: Map<string, Pick<SkillEntry, "name">>,
): string | undefined {
  if (canonicalSkills.has(skillName)) {
    return canonicalSkills.get(skillName)!.name;
  }

  const parsed = parseSkillName(skillName);
  return canonicalSkills.get(parsed.matchKey)?.name;
}

export async function findDuplicateSkills(homeDir: string): Promise<DuplicateGroup[]> {
  const skills = await listSkills(homeDir);
  const grouped = new Map<string, SkillEntry[]>();

  for (const skill of skills) {
    const parsed = parseSkillName(skill.name);
    const bucket = grouped.get(parsed.matchKey) ?? [];
    bucket.push(skill);
    grouped.set(parsed.matchKey, bucket);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [baseName, entries] of grouped) {
    if (entries.length < 2) {
      continue;
    }

    const kept = choosePreferredSkill(entries);
    const removed = entries
      .filter((entry) => entry.path !== kept.path)
      .sort((left, right) => left.name.localeCompare(right.name));

    if (removed.length > 0) {
      duplicates.push({ baseName: parseSkillName(kept.name).baseName, kept, removed });
    }
  }

  return duplicates.sort((left, right) => left.baseName.localeCompare(right.baseName));
}

export async function removeDuplicateSkills(
  homeDir: string,
  duplicates: DuplicateGroup[],
  options: { delete?: boolean } = {},
): Promise<{ moved: string[]; deleted: string[] }> {
  const paths = getAweskillPaths(homeDir);
  await mkdir(paths.dupSkillsDir, { recursive: true });

  const moved: string[] = [];
  const deleted: string[] = [];

  for (const group of duplicates) {
    for (const skill of group.removed) {
      if (options.delete) {
        await rm(skill.path, { recursive: true, force: true });
        deleted.push(skill.name);
        continue;
      }

      const targetPath = await nextAvailableDupPath(paths.dupSkillsDir, skill.name);
      await rename(skill.path, targetPath);
      moved.push(`${skill.name} -> ${targetPath}`);
    }
  }

  return { moved, deleted };
}

async function nextAvailableDupPath(dupSkillsDir: string, skillName: string): Promise<string> {
  const entries = new Set(await readdir(dupSkillsDir).catch(() => []));
  if (!entries.has(skillName)) {
    return path.join(dupSkillsDir, skillName);
  }

  let index = 1;
  while (entries.has(`${skillName}-${index}`)) {
    index += 1;
  }
  return path.join(dupSkillsDir, `${skillName}-${index}`);
}
