import { findSkillReferences, removeSkillWithReferences } from "../lib/references.js";
import { reconcileProject, reconcileGlobal } from "../lib/reconcile.js";
import type { RuntimeContext } from "../types.js";

export async function runRemove(
  context: RuntimeContext,
  options: {
    skillName: string;
    force?: boolean;
    projectDir?: string;
  },
) {
  const projectDir = options.projectDir ?? context.cwd;
  const references = await findSkillReferences({
    homeDir: context.homeDir,
    skillName: options.skillName,
    projectDir,
  });
  const referenceCount =
    references.bundles.length +
    references.globalActivations.length +
    references.projectRuleActivations.length +
    references.projectActivations.length;

  if (referenceCount > 0 && !options.force) {
    throw new Error(
      `Skill ${options.skillName} is still referenced by bundles/config: ${[
        ...references.bundles,
        ...references.globalActivations,
        ...references.projectRuleActivations,
        ...references.projectActivations,
      ].join(", ")}`,
    );
  }

  await removeSkillWithReferences({
    homeDir: context.homeDir,
    skillName: options.skillName,
    projectDir,
  });
  await reconcileGlobal(context.homeDir);
  await reconcileProject(context.homeDir, projectDir);
  context.write(`Removed ${options.skillName}`);
  return references;
}
