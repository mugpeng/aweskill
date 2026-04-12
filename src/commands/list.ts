import { listBundles } from "../lib/bundles.js";
import { listSkills } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

const DEFAULT_PREVIEW_COUNT = 5;

export async function runListSkills(context: RuntimeContext, options: { verbose?: boolean } = {}) {
  const skills = await listSkills(context.homeDir);

  if (skills.length === 0) {
    context.write("No skills found in central repo.");
    return skills;
  }

  const preview = options.verbose ? skills : skills.slice(0, DEFAULT_PREVIEW_COUNT);
  const lines = [`Skills in central repo: ${skills.length} total`];
  if (!options.verbose && skills.length > preview.length) {
    lines.push(`Showing first ${preview.length} skills (use --verbose to show all)`);
  }
  for (const skill of preview) {
    const marker = skill.hasSKILLMd ? "✓" : "!";
    lines.push(`  ${marker} ${skill.name} ${skill.path}`);
  }
  context.write(lines.join("\n"));
  return skills;
}

export async function runListBundles(context: RuntimeContext) {
  const bundles = await listBundles(context.homeDir);
  const lines = bundles.map((bundle) => `${bundle.name}: ${bundle.skills.join(", ") || "(empty)"}`);
  context.write(lines.join("\n") || "(no bundles)");
  return bundles;
}
