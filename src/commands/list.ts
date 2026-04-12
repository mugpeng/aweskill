import { listBundles } from "../lib/bundles.js";
import { listSkills } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export async function runListSkills(context: RuntimeContext) {
  const skills = await listSkills(context.homeDir);

  if (skills.length === 0) {
    context.write("No skills found in central repo.");
    return skills;
  }

  const lines = ["Skills in central repo:"];
  for (const skill of skills) {
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
