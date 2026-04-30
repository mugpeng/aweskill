import { readFile } from "node:fs/promises";
import path from "node:path";

import { pathExists } from "../lib/fs.js";
import { sanitizeName } from "../lib/path.js";
import { getSkillDescription } from "../lib/skill-doc.js";
import { getSkillPath } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export interface ShowOptions {
  raw?: boolean;
  path?: boolean;
  summary?: boolean;
}

export async function runShow(context: RuntimeContext, skillName: string, options: ShowOptions = {}) {
  const explicitModes = [options.raw, options.path, options.summary].filter(Boolean).length;
  if (explicitModes > 1) {
    throw new Error("Use only one of --summary, --raw, or --path.");
  }

  const normalizedName = sanitizeName(skillName);
  const skillDir = getSkillPath(context.homeDir, normalizedName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!(await pathExists(skillFile))) {
    throw new Error(`Unknown skill: ${normalizedName}`);
  }

  if (options.path) {
    context.write(skillFile);
    return { path: skillFile };
  }

  const content = await readFile(skillFile, "utf8");
  if (options.raw) {
    (context.writeRaw ?? context.write)(content);
    return { path: skillFile, content };
  }

  const description = getSkillDescription(content);
  context.write([normalizedName, `description: ${description || "(no description)"}`, `path: ${skillFile}`].join("\n"));
  return { path: skillFile, description };
}
