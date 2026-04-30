import { parse } from "yaml";

export interface ParsedSkillDoc {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseSkillDoc(content: string): ParsedSkillDoc {
  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }

  const endIndex = content.indexOf("\n---", 4);
  if (endIndex === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = content.slice(4, endIndex);
  const bodyStart = content.indexOf("\n", endIndex + 4);
  const body = bodyStart === -1 ? "" : content.slice(bodyStart + 1);
  let parsed: unknown;
  try {
    parsed = parse(frontmatterText);
  } catch {
    return { frontmatter: {}, body };
  }
  const frontmatter = parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {};

  return { frontmatter, body };
}

export function getSkillDescription(content: string): string | undefined {
  const { frontmatter, body } = parseSkillDoc(content);
  const description = frontmatter.description;
  if (typeof description === "string" && description.trim()) {
    return description.trim();
  }

  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));
}
