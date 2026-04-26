export type UpdateStatusReason =
  | "source-missing-skill"
  | "missing-local-skill"
  | "up-to-date"
  | "local-changes-detected"
  | "update-available"
  | "updated";

export function formatNoTrackedUpdatesMessage(): string {
  return "No tracked skills to update.";
}

export function formatUpdateStatusLines(name: string, reason: UpdateStatusReason): string[] {
  switch (reason) {
    case "source-missing-skill":
      return [`Failed to check ${name}: source no longer contains this skill.`];
    case "missing-local-skill":
      return [`Missing local skill: ${name}. Use --override to reinstall it from source.`];
    case "up-to-date":
      return [`Up to date: ${name}.`];
    case "local-changes-detected":
      return [`Skipped ${name}: local changes detected. Use --override to discard local changes.`];
    case "update-available":
      return [`Update available: ${name}.`];
    case "updated":
      return [`Updated ${name}`];
  }
}
