import { listBundles, listBundlesInDirectory } from "../lib/bundles.js";
import { listSkills } from "../lib/skills.js";
import { getTemplateBundlesDir } from "../lib/templates.js";
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

function formatBundleLines(title: string, bundles: { name: string; skills: string[] }[], verbose?: boolean): string[] {
  if (bundles.length === 0) {
    return [title, "(none)"];
  }

  const preview = verbose ? bundles : bundles.slice(0, DEFAULT_PREVIEW_COUNT);
  const lines = [`${title}: ${bundles.length} total`];
  if (!verbose && bundles.length > preview.length) {
    lines.push(`Showing first ${preview.length} bundles (use --verbose to show all)`);
  }
  for (const bundle of preview) {
    const skillsPreview = verbose ? bundle.skills : bundle.skills.slice(0, DEFAULT_PREVIEW_COUNT);
    const suffix = !verbose && bundle.skills.length > skillsPreview.length
      ? `, ... (+${bundle.skills.length - skillsPreview.length} more)`
      : "";
    lines.push(`  - ${bundle.name}: ${bundle.skills.length} skills${skillsPreview.length > 0 ? ` -> ${skillsPreview.join(", ")}${suffix}` : " -> (empty)"}`);
  }
  return lines;
}

export async function runListBundles(context: RuntimeContext, options: { verbose?: boolean } = {}) {
  const bundles = await listBundles(context.homeDir);
  context.write(formatBundleLines("Bundles in central repo", bundles, options.verbose).join("\n"));
  return bundles;
}

export async function runListTemplateBundles(context: RuntimeContext, options: { verbose?: boolean } = {}) {
  const templateBundlesDir = await getTemplateBundlesDir();
  const bundles = await listBundlesInDirectory(templateBundlesDir);
  context.write(formatBundleLines("Bundle templates", bundles, options.verbose).join("\n"));
  return bundles;
}
