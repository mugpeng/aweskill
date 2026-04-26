import { describe, expect, it } from "vitest";

import {
  formatNoTrackedUpdatesMessage,
  formatUpdateStatusLines,
  type UpdateStatusReason,
} from "../src/lib/update.js";

describe("update helpers", () => {
  const cases: Array<{ reason: UpdateStatusReason; expected: string[] }> = [
    {
      reason: "source-missing-skill",
      expected: ["Failed to check caveman: source no longer contains this skill."],
    },
    {
      reason: "missing-local-skill",
      expected: ["Missing local skill: caveman. Use --override to reinstall it from source."],
    },
    {
      reason: "up-to-date",
      expected: ["Up to date: caveman."],
    },
    {
      reason: "local-changes-detected",
      expected: ["Skipped caveman: local changes detected. Use --override to discard local changes."],
    },
    {
      reason: "update-available",
      expected: ["Update available: caveman."],
    },
    {
      reason: "updated",
      expected: ["Updated caveman"],
    },
  ];

  for (const { reason, expected } of cases) {
    it(`formats ${reason} messages`, () => {
      expect(formatUpdateStatusLines("caveman", reason)).toEqual(expected);
    });
  }

  it("formats the no-tracked-skills message", () => {
    expect(formatNoTrackedUpdatesMessage()).toBe("No tracked skills to update.");
  });
});
