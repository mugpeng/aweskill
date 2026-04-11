import { listBundles } from "../lib/bundles.js";
import { computeGlobalStatus, computeProjectStatus } from "../lib/reconcile.js";
import { listSkills } from "../lib/skills.js";
import type { RuntimeContext } from "../types.js";

export async function runListSkills(context: RuntimeContext) {
  const skills = await listSkills(context.homeDir);
  context.write(skills.join("\n") || "(no skills)");
  return skills;
}

export async function runListBundles(context: RuntimeContext) {
  const bundles = await listBundles(context.homeDir);
  const lines = bundles.map((bundle) => `${bundle.name}: ${bundle.skills.join(", ") || "(empty)"}`);
  context.write(lines.join("\n") || "(no bundles)");
  return bundles;
}

export async function runListStatus(context: RuntimeContext, options: { projectDir?: string }) {
  const globalStatus = await computeGlobalStatus(context.homeDir);
  const sections = ["GLOBAL"];
  for (const projection of globalStatus.projections) {
    sections.push(`${projection.agentId}: ${projection.skillName}`);
  }

  const projectDir = options.projectDir;
  if (projectDir) {
    const projectStatus = await computeProjectStatus(context.homeDir, projectDir);
    sections.push(`PROJECT ${projectDir}`);
    for (const projection of projectStatus.projections) {
      sections.push(`${projection.agentId}: ${projection.skillName}`);
    }
  }

  context.write(sections.join("\n"));
  return sections;
}
