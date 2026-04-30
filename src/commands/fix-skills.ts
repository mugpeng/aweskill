import { applySkillDocFixes, formatSkillDocFixReport, scanSkillDocFixes } from "../lib/fix-skills.js";
import type { RuntimeContext } from "../types.js";

export async function runFixSkills(
  context: RuntimeContext,
  options: { apply?: boolean; verbose?: boolean; skills?: string[] } = {},
) {
  const results = await scanSkillDocFixes(context.homeDir, { skills: options.skills });
  if (results.length === 0) {
    context.write("No skill docs needed fixes.");
    return { results, rewritten: [] as string[] };
  }

  if (!options.apply) {
    context.write(formatSkillDocFixReport(results, { apply: false, verbose: options.verbose }));
    return { results, rewritten: [] as string[] };
  }

  await applySkillDocFixes(results);
  context.write(formatSkillDocFixReport(results, { apply: true, verbose: options.verbose }));
  return { results, rewritten: results.map((result) => result.relativePath) };
}
