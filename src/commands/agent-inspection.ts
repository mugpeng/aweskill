import { buildCanonicalSkillIndex, parseSkillName, resolveCanonicalSkillName } from "../lib/rmdup.js";
import { getSkillSuspicionReason, type listSkills } from "../lib/skills.js";

export type CheckCategory = "linked" | "broken" | "duplicate" | "matched" | "new" | "suspicious";

export interface CheckedSkill {
  name: string;
  path: string;
  category: CheckCategory;
  hasSKILLMd: boolean;
  suspicionReason?: string;
  duplicateKind?: "exact" | "family";
  canonicalName?: string;
}

export function classifyCheckedSkill(
  skill: { name: string; path: string; hasSKILLMd: boolean },
  managed: Map<string, "symlink" | "copy">,
  canonicalSkillNames: Map<string, { name: string }>,
): CheckedSkill {
  const suspicionReason = getSkillSuspicionReason(skill);
  if (suspicionReason) {
    return {
      name: skill.name,
      path: skill.path,
      category: "suspicious",
      hasSKILLMd: skill.hasSKILLMd,
      suspicionReason,
    };
  }

  let category: CheckCategory = "new";
  let duplicateKind: CheckedSkill["duplicateKind"];
  let canonicalName: string | undefined;
  if (managed.has(skill.name)) {
    category = "linked";
  } else {
    canonicalName = resolveCanonicalSkillName(skill.name, canonicalSkillNames);
    if (canonicalName) {
      category = canonicalName === skill.name ? "duplicate" : "matched";
      duplicateKind = canonicalName === skill.name ? "exact" : "family";
    }
  }

  if (category === "linked") {
    const parsed = parseSkillName(skill.name);
    canonicalName = canonicalSkillNames.get(parsed.baseName)?.name;
  }

  return {
    name: skill.name,
    path: skill.path,
    category,
    hasSKILLMd: skill.hasSKILLMd,
    duplicateKind,
    canonicalName,
  };
}

export function buildCentralCanonicalSkills(
  centralSkillEntries: Awaited<ReturnType<typeof listSkills>>,
): Map<string, { name: string }> {
  return buildCanonicalSkillIndex(centralSkillEntries);
}
