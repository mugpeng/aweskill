import {
  applySkillDocFixes,
  formatSkillDocFixReport,
  hasActionableSkillDocFix,
  scanSkillDocFixes,
} from "../lib/fix-skills.js";
import type { RuntimeContext } from "../types.js";

export async function runFixSkills(
  context: RuntimeContext,
  options: { apply?: boolean; backup?: boolean; includeInfo?: boolean; verbose?: boolean; skills?: string[] } = {},
) {
  const results = await scanSkillDocFixes(context.homeDir, {
    includeInfo: options.includeInfo,
    skills: options.skills,
  });
  if (results.length === 0) {
    context.write("No skill docs needed fixes.");
    return { results, rewritten: [] as string[] };
  }

  if (!options.apply) {
    context.write(formatSkillDocFixReport(results, { apply: false, verbose: options.verbose }));
    return { results, rewritten: [] as string[] };
  }

  const rewritable = results.filter((result) => hasActionableSkillDocFix(result));
  await applySkillDocFixes(context.homeDir, rewritable, { backup: options.backup });
  context.write(
    formatSkillDocFixReport(results, {
      apply: true,
      rewrittenCount: rewritable.length,
      verbose: options.verbose,
    }),
  );
  return { results, rewritten: rewritable.map((result) => result.relativePath) };
}
