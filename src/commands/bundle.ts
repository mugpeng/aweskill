import { addSkillToBundle, createBundle, deleteBundle, readBundle, readBundleFromDirectory, removeSkillFromBundle, writeBundle } from "../lib/bundles.js";
import { getTemplateBundlesDir } from "../lib/templates.js";
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

export async function runBundleDelete(context: RuntimeContext, bundleName: string) {
  const deleted = await deleteBundle(context.homeDir, bundleName);
  if (!deleted) {
    throw new Error(`Bundle not found: ${bundleName}`);
  }

  context.write(`Deleted bundle ${bundleName}`);
  return deleted;
}

export async function runBundleAddTemplate(context: RuntimeContext, bundleName: string) {
  const templateBundlesDir = await getTemplateBundlesDir();
  const templateBundle = await readBundleFromDirectory(templateBundlesDir, bundleName);

  try {
    await readBundle(context.homeDir, templateBundle.name);
    throw new Error(`Bundle already exists: ${templateBundle.name}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
      if (error instanceof Error && error.message.startsWith("Bundle already exists:")) {
        throw error;
      }
      throw error;
    }
  }

  const bundle = await writeBundle(context.homeDir, templateBundle);
  context.write(`Added bundle ${bundle.name} from template`);
  return bundle;
}
