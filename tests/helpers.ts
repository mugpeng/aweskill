import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { RuntimeContext } from "../src/types.js";

export async function createTempWorkspace() {
  const rootDir = await mkdtemp(path.join(tmpdir(), "aweskill-"));
  const homeDir = path.join(rootDir, "home");
  const projectDir = path.join(rootDir, "project");
  await mkdir(homeDir, { recursive: true });
  await mkdir(projectDir, { recursive: true });
  return { rootDir, homeDir, projectDir };
}

export function createRuntime(homeDir: string, cwd: string) {
  const lines: string[] = [];
  const errors: string[] = [];
  const context: RuntimeContext = {
    homeDir,
    cwd,
    write: (message) => {
      lines.push(message);
    },
    error: (message) => {
      errors.push(message);
    },
  };
  return { context, lines, errors };
}

export async function writeSkill(skillDir: string, title = "Example Skill") {
  await mkdir(skillDir, { recursive: true });
  await writeFile(path.join(skillDir, "SKILL.md"), `# ${title}\n`, "utf8");
}
