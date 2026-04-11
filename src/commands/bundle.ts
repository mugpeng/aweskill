import { addSkillToBundle, createBundle, readBundle, removeSkillFromBundle } from "../lib/bundles.js";
import type { RuntimeContext } from "../types.js";

export async function runBundleCreate(context: RuntimeContext, bundleName: string) {
  const bundle = await createBundle(context.homeDir, bundleName);
  context.write(`Created bundle ${bundle.name}`);
  return bundle;
}

export async function runBundleShow(context: RuntimeContext, bundleName: string) {
  const bundle = await readBundle(context.homeDir, bundleName);
  context.write(`${bundle.name}: ${bundle.skills.join(", ") || "(empty)"}`);
  return bundle;
}

export async function runBundleAddSkill(context: RuntimeContext, bundleName: string, skillName: string) {
  const bundle = await addSkillToBundle(context.homeDir, bundleName, skillName);
  context.write(`Bundle ${bundle.name}: ${bundle.skills.join(", ") || "(empty)"}`);
  return bundle;
}

export async function runBundleRemoveSkill(context: RuntimeContext, bundleName: string, skillName: string) {
  const bundle = await removeSkillFromBundle(context.homeDir, bundleName, skillName);
  context.write(`Bundle ${bundle.name}: ${bundle.skills.join(", ") || "(empty)"}`);
  return bundle;
}
