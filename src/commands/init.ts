import { computeDirectoryHash } from "../lib/hash.js";
import { importPath, listImportableChildren } from "../lib/import.js";
import { upsertSkillLockEntry } from "../lib/lock.js";
import { getBuiltinSkillsDir } from "../lib/resources.js";
import { scanSkills } from "../lib/scanner.js";
import { ensureHomeLayout, getSkillPath } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";
import { formatScanSummary } from "./scan.js";

const BUILTIN_SKILLS_SOURCE = "mugpeng/aweskill";
const BUILTIN_SKILLS_SOURCE_URL = "https://github.com/mugpeng/aweskill.git";
const BUILTIN_SKILLS_REF = "main";
const BUILTIN_SKILLS_SUBPATH = "resources/skills";

async function trackBuiltInSkills(homeDir: string, builtInSkillsDir: string): Promise<void> {
  const sources = await listImportableChildren(builtInSkillsDir);

  for (const source of sources) {
    const destination = getSkillPath(homeDir, source.name);
    const sourceHash = await computeDirectoryHash(source.path);
    const destinationHash = await computeDirectoryHash(destination);
    if (sourceHash !== destinationHash) {
      continue;
    }

    await upsertSkillLockEntry(homeDir, source.name, {
      source: BUILTIN_SKILLS_SOURCE,
      sourceType: "github",
      sourceUrl: BUILTIN_SKILLS_SOURCE_URL,
      ref: BUILTIN_SKILLS_REF,
      subpath: `${BUILTIN_SKILLS_SUBPATH}/${source.name}`,
      computedHash: destinationHash,
    });
  }
}

export async function runInit(context: RuntimeContext, options: { scan?: boolean; verbose?: boolean }) {
  await ensureHomeLayout(context.homeDir);
  const builtInSkillsDir = await getBuiltinSkillsDir();
  const builtInSkills = await importPath({
    homeDir: context.homeDir,
    sourcePath: builtInSkillsDir,
  });
  await trackBuiltInSkills(context.homeDir, builtInSkillsDir);

  context.write(`Initialized ${context.homeDir}/.aweskill`);
  if (builtInSkills.kind === "batch") {
    if (builtInSkills.imported.length > 0) {
      context.write(`Installed built-in skills: ${builtInSkills.imported.join(", ")}`);
    }
    if (builtInSkills.skipped.length > 0) {
      context.write(`Built-in skills already installed: ${builtInSkills.skipped.join(", ")}`);
    }
  }

  if (options.scan) {
    const candidates = await scanSkills({ homeDir: context.homeDir, scope: "global" });
    context.write(formatScanSummary(candidates, options.verbose));
    return candidates;
  }

  return [];
}
