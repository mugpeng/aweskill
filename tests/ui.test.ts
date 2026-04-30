import { afterEach, describe, expect, it, vi } from "vitest";

import { writeCliMessage } from "../src/lib/ui.js";

describe("cli ui formatting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves layered indentation for numbered find results", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    writeCliMessage(
      ["1. scientific-writing", "   skills-sh · 984 installs", "   (no description)", "   source: owner/repo"].join(
        "\n",
      ),
    );

    const output = logSpy.mock.calls.map((call) => String(call[0]));
    expect(output.some((line) => line.includes("1. scientific-writing"))).toBe(true);
    expect(output.some((line) => line.includes("skills-sh · 984 installs"))).toBe(true);
    expect(output.some((line) => line.includes("(no description)"))).toBe(true);
    expect(output.some((line) => line.includes("source: owner/repo"))).toBe(true);
  });

  it("formats indented sync markers without changing their line shape", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    writeCliMessage(
      [
        "    ✓ linked-skill /tmp/linked-skill",
        "    ! duplicate-skill /tmp/duplicate-skill",
        "    ~ matched-skill /tmp/matched-skill",
        "    + new-skill /tmp/new-skill",
        "    ? suspicious-skill /tmp/suspicious-skill",
      ].join("\n"),
    );

    const output = logSpy.mock.calls.map((call) => String(call[0]));
    expect(output).toHaveLength(5);
    expect(output.every((line) => line.startsWith("    "))).toBe(true);
    expect(output.some((line) => line.includes("linked-skill"))).toBe(true);
    expect(output.some((line) => line.includes("duplicate-skill"))).toBe(true);
    expect(output.some((line) => line.includes("matched-skill"))).toBe(true);
    expect(output.some((line) => line.includes("new-skill"))).toBe(true);
    expect(output.some((line) => line.includes("suspicious-skill"))).toBe(true);
  });
});
