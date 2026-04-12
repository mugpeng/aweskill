import { findSkillReferences, removeSkillWithReferences } from "../lib/references.js";
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
  const referenceCount = references.bundles.length + references.agentProjections.length;

  if (referenceCount > 0 && !options.force) {
    throw new Error(
      `Skill ${options.skillName} is still referenced: ${[
        ...references.bundles,
        ...references.agentProjections,
      ].join(", ")}`,
    );
  }

  await removeSkillWithReferences({
    homeDir: context.homeDir,
    skillName: options.skillName,
    projectDir,
  });
  context.write(`Removed ${options.skillName}`);
  return references;
}
