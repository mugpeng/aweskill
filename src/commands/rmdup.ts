import { findDuplicateSkills, removeDuplicateSkills } from "../lib/rmdup.js";
import type { RuntimeContext } from "../types.js";

export async function runRmdup(
  context: RuntimeContext,
  options: { apply?: boolean; backup?: boolean; delete?: boolean },
) {
  if (options.delete && !options.apply) {
    throw new Error("--delete requires --apply");
  }

  const duplicates = await findDuplicateSkills(context.homeDir);

  if (duplicates.length === 0) {
    context.write("No duplicate skills found in the central repo.");
    return { duplicates, moved: [], deleted: [] };
  }

  const lines = ["Duplicate skill groups in central repo:"];
  for (const group of duplicates) {
    lines.push(`  ${group.baseName}: ${group.removed.length + 1} entries`);
    lines.push(`    keep: ${group.kept.name} ${group.kept.path}`);
    for (const skill of group.removed) {
      lines.push(`    drop: ${skill.name} ${skill.path}`);
    }
  }

  let moved: string[] = [];
  let deleted: string[] = [];
  if (options.apply) {
    const result = await removeDuplicateSkills(context.homeDir, duplicates, {
      backup: options.backup,
      delete: options.delete,
    });
    moved = result.moved;
    deleted = result.deleted;
    lines.push("");
    if (options.delete) {
      lines.push(`Deleted ${deleted.length} duplicate skills`);
    } else {
      lines.push(`Moved ${moved.length} duplicate skills to ${context.homeDir}/.aweskill/dup_skills`);
    }
    if (options.backup) {
      lines.push(`Backed up duplicate skills to ${context.homeDir}/.aweskill/backup/dedup`);
    }
  } else {
    lines.push("");
    lines.push("Dry run only. Use --apply to move duplicates into dup_skills, or --apply --delete to delete them.");
  }

  context.write(lines.join("\n"));
  return { duplicates, moved, deleted };
}
