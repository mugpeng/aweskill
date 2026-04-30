import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "yaml";

import { listSkills } from "./skills.js";

const KNOWN_FIELD_ORDER = ["name", "description", "required_permissions"] as const;
const DEFAULT_PREVIEW_COUNT = 5;

export type SkillDocFixKind =
  | "missing-closing-delimiter"
  | "invalid-yaml"
  | "added-frontmatter"
  | "normalized-name"
  | "normalized-description"
  | "normalized-required-permissions"
  | "preserved-unknown-fields"
  | "removed-empty-fields";

export interface SkillDocFixResult {
  skillName: string;
  skillFile: string;
  relativePath: string;
  fixes: SkillDocFixKind[];
  originalContent: string;
  nextContent: string;
}

interface ExtractedSkillDoc {
  frontmatterText: string;
  body: string;
  fixes: SkillDocFixKind[];
}

function looksLikeFrontmatterLine(line: string): boolean {
  if (!line.trim()) {
    return true;
  }

  if (/^[A-Za-z0-9_-]+:\s*(.*)$/.test(line)) {
    return true;
  }

  return /^\s+.*$/.test(line);
}

function extractFrontmatterAndBody(content: string): ExtractedSkillDoc {
  const normalizedContent = content.replace(/\r\n/g, "\n");
  const lines = normalizedContent.split("\n");
  if (lines[0] !== "---") {
    return {
      frontmatterText: "",
      body: normalizedContent,
      fixes: ["added-frontmatter"],
    };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex !== -1) {
    return {
      frontmatterText: lines.slice(1, closingIndex).join("\n"),
      body: lines.slice(closingIndex + 1).join("\n"),
      fixes: [],
    };
  }

  let bodyStartIndex = lines.length;
  for (let index = 1; index < lines.length; index += 1) {
    if (!looksLikeFrontmatterLine(lines[index] ?? "")) {
      bodyStartIndex = index;
      break;
    }
  }

  return {
    frontmatterText: lines.slice(1, bodyStartIndex).join("\n"),
    body: lines.slice(bodyStartIndex).join("\n"),
    fixes: ["missing-closing-delimiter"],
  };
}

function salvageFrontmatter(frontmatterText: string): Record<string, unknown> {
  const lines = frontmatterText.split("\n");
  const result: Record<string, unknown> = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1]!;
    const rest = match[2] ?? "";
    const block: string[] = [];
    if (rest) {
      block.push(`${key}: ${rest}`);
    } else {
      block.push(`${key}:`);
      while (index + 1 < lines.length && /^\s+.*$/.test(lines[index + 1] ?? "")) {
        index += 1;
        block.push(lines[index]!);
      }
    }

    try {
      const parsed = parse(block.join("\n"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && key in parsed) {
        result[key] = (parsed as Record<string, unknown>)[key];
      }
    } catch {
      continue;
    }
  }

  return result;
}

function parseFrontmatter(frontmatterText: string): { data: Record<string, unknown>; invalidYaml: boolean } {
  if (!frontmatterText.trim()) {
    return { data: {}, invalidYaml: false };
  }

  try {
    const parsed = parse(frontmatterText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { data: parsed as Record<string, unknown>, invalidYaml: false };
    }
    return { data: {}, invalidYaml: true };
  } catch {
    return { data: salvageFrontmatter(frontmatterText), invalidYaml: true };
  }
}

function firstDescriptionLine(body: string): string | undefined {
  return body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length === 0;
  }

  return false;
}

function pruneEmpty(value: unknown): { value: unknown; removedEmpty: boolean } {
  if (Array.isArray(value)) {
    let removedEmpty = false;
    const nextItems: unknown[] = [];
    for (const item of value) {
      const pruned = pruneEmpty(item);
      removedEmpty ||= pruned.removedEmpty;
      if (isEmptyValue(pruned.value)) {
        removedEmpty = true;
        continue;
      }
      nextItems.push(pruned.value);
    }
    return { value: nextItems, removedEmpty };
  }

  if (value && typeof value === "object") {
    let removedEmpty = false;
    const nextRecord: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const pruned = pruneEmpty(child);
      removedEmpty ||= pruned.removedEmpty;
      if (isEmptyValue(pruned.value)) {
        removedEmpty = true;
        continue;
      }
      nextRecord[key] = pruned.value;
    }
    return { value: nextRecord, removedEmpty };
  }

  return { value, removedEmpty: false };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function normalizeName(raw: unknown, fallbackName: string): { value: string; changed: boolean } {
  if (typeof raw === "string" && raw.trim()) {
    return { value: raw.trim(), changed: false };
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return { value: String(raw), changed: true };
  }

  return { value: fallbackName, changed: true };
}

function normalizeDescription(raw: unknown, body: string): { value: string; changed: boolean } {
  if (typeof raw === "string" && raw.trim()) {
    return { value: raw.trim(), changed: false };
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return { value: String(raw), changed: true };
  }

  return { value: firstDescriptionLine(body) ?? "", changed: true };
}

function normalizeRequiredPermissions(raw: unknown): { value?: string[]; changed: boolean } {
  if (raw === undefined) {
    return { value: undefined, changed: false };
  }

  if (Array.isArray(raw)) {
    const normalized = uniqueStrings(raw.map((item) => String(item).trim()).filter(Boolean));
    return { value: normalized.length > 0 ? normalized : undefined, changed: true };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return { value: trimmed ? [trimmed] : undefined, changed: true };
  }

  if (typeof raw === "number" || typeof raw === "boolean") {
    return { value: [String(raw)], changed: true };
  }

  return { value: undefined, changed: true };
}

function serializeScalar(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  const text = String(value ?? "");
  if (!text) {
    return "''";
  }

  if (
    !/^\s|\s$/.test(text)
    && !/:\s|[\[\]{}#,|>*&!%@`]/.test(text)
    && !/^(true|false|null|~|-?\d+(\.\d+)?)$/i.test(text)
  ) {
    return text;
  }

  return `'${text.replace(/'/g, "''")}'`;
}

function stringifyValue(value: unknown, indent = ""): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${indent}[]`];
    }
    return value.flatMap((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const childLines = stringifyValue(item, `${indent}  `);
        const [first, ...rest] = childLines;
        return [`${indent}- ${first.trimStart()}`, ...rest];
      }
      return [`${indent}- ${serializeScalar(item)}`];
    });
  }

  if (value && typeof value === "object") {
    const lines: string[] = [];
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(child) || (child && typeof child === "object")) {
        lines.push(`${indent}${key}:`);
        lines.push(...stringifyValue(child, `${indent}  `));
      } else {
        lines.push(`${indent}${key}: ${serializeScalar(child)}`);
      }
    }
    return lines;
  }

  return [`${indent}${serializeScalar(value)}`];
}

function renderSkillDoc(frontmatter: Record<string, unknown>, body: string): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value) || (value && typeof value === "object")) {
      lines.push(`${key}:`);
      lines.push(...stringifyValue(value, "  "));
    } else {
      lines.push(`${key}: ${serializeScalar(value)}`);
    }
  }
  lines.push("---");
  lines.push("");

  const normalizedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  if (normalizedBody) {
    lines.push(normalizedBody);
  }

  return `${lines.join("\n")}\n`;
}

export function normalizeSkillDoc(content: string, skillName: string): SkillDocFixResult | null {
  const extracted = extractFrontmatterAndBody(content);
  const fixes = [...extracted.fixes];
  const parsed = parseFrontmatter(extracted.frontmatterText);
  if (parsed.invalidYaml) {
    fixes.push("invalid-yaml");
  }

  const pruned = pruneEmpty(parsed.data);
  const prunedData = (pruned.value && typeof pruned.value === "object" && !Array.isArray(pruned.value))
    ? pruned.value as Record<string, unknown>
    : {};
  if (pruned.removedEmpty) {
    fixes.push("removed-empty-fields");
  }

  const frontmatter: Record<string, unknown> = {};

  const normalizedName = normalizeName(prunedData.name, skillName);
  frontmatter.name = normalizedName.value;
  if (normalizedName.changed) {
    fixes.push("normalized-name");
  }

  const normalizedDescription = normalizeDescription(prunedData.description, extracted.body);
  if (normalizedDescription.value) {
    frontmatter.description = normalizedDescription.value;
  }
  if (normalizedDescription.changed) {
    fixes.push("normalized-description");
  }

  const normalizedPermissions = normalizeRequiredPermissions(prunedData.required_permissions);
  if (normalizedPermissions.value) {
    frontmatter.required_permissions = normalizedPermissions.value;
  }
  if (normalizedPermissions.changed) {
    fixes.push("normalized-required-permissions");
  }

  const unknownEntries = Object.entries(prunedData)
    .filter(([key]) => !KNOWN_FIELD_ORDER.includes(key as typeof KNOWN_FIELD_ORDER[number]));
  if (unknownEntries.length > 0) {
    fixes.push("preserved-unknown-fields");
  }
  for (const [key, value] of unknownEntries.sort((left, right) => left[0].localeCompare(right[0]))) {
    frontmatter[key] = value;
  }

  const normalizedContent = renderSkillDoc(frontmatter, extracted.body);
  const uniqueFixes = uniqueStrings(fixes);
  if (uniqueFixes.length === 0) {
    return null;
  }

  return {
    skillName,
    skillFile: "",
    relativePath: "",
    fixes: uniqueFixes as SkillDocFixKind[],
    originalContent: content,
    nextContent: normalizedContent,
  };
}

function formatResultLines(results: SkillDocFixResult[], verbose?: boolean): string[] {
  const lines = [`Skill docs needing fixes: ${results.length}`];
  const preview = verbose ? results : results.slice(0, DEFAULT_PREVIEW_COUNT);
  if (!verbose && results.length > preview.length) {
    lines.push(`Showing first ${preview.length} skill docs (use --verbose to show all)`);
  }
  for (const result of preview) {
    lines.push(`  - ${result.skillName}: ${result.fixes.join(", ")}`);
  }
  if (!verbose && results.length > preview.length) {
    lines.push(`... and ${results.length - preview.length} more (use --verbose to show all)`);
  }
  return lines;
}

export async function scanSkillDocFixes(homeDir: string, options: { skills?: string[] } = {}): Promise<SkillDocFixResult[]> {
  const skills = await listSkills(homeDir);
  const selectedSkills = options.skills && options.skills.length > 0
    ? new Set(options.skills)
    : undefined;
  const availableSkills = new Set(skills.map((skill) => skill.name));
  if (selectedSkills) {
    for (const skillName of selectedSkills) {
      if (!availableSkills.has(skillName)) {
        throw new Error(`Unknown skill: ${skillName}`);
      }
    }
  }
  const results: SkillDocFixResult[] = [];
  for (const skill of skills) {
    if (selectedSkills && !selectedSkills.has(skill.name)) {
      continue;
    }
    if (!skill.hasSKILLMd) {
      continue;
    }

    const skillFile = path.join(skill.path, "SKILL.md");
    const content = await readFile(skillFile, "utf8");
    const normalized = normalizeSkillDoc(content, skill.name);
    if (!normalized) {
      continue;
    }

    normalized.skillFile = skillFile;
    normalized.relativePath = path.relative(homeDir, skillFile).split(path.sep).join("/");
    results.push(normalized);
  }

  return results.sort((left, right) => left.skillName.localeCompare(right.skillName));
}

export async function applySkillDocFixes(results: SkillDocFixResult[]): Promise<void> {
  for (const result of results) {
    await writeFile(result.skillFile, result.nextContent, "utf8");
  }
}

export function formatSkillDocFixReport(results: SkillDocFixResult[], options: { apply?: boolean; verbose?: boolean } = {}): string {
  const lines = formatResultLines(results, options.verbose);
  lines.push("");
  if (options.apply) {
    lines.push(`Rewrote ${results.length} skill doc${results.length === 1 ? "" : "s"}.`);
  } else {
    lines.push("Dry run only. Use --apply to rewrite skill docs.");
  }
  return lines.join("\n");
}
