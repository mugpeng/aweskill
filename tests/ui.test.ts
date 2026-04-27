import { afterEach, describe, expect, it, vi } from "vitest";

import { writeCliMessage } from "../src/lib/ui.js";

describe("cli ui formatting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves layered indentation for numbered find results", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    writeCliMessage([
      "1. scientific-writing",
      "   skills-sh · 984 installs",
      "   (no description)",
      "   source: owner/repo",
    ].join("\n"));

    const output = logSpy.mock.calls.map((call) => String(call[0]));
    expect(output.some((line) => line.includes("1. scientific-writing"))).toBe(true);
    expect(output.some((line) => line.includes("   skills-sh · 984 installs"))).toBe(true);
    expect(output.some((line) => line.includes("   (no description)"))).toBe(true);
    expect(output.some((line) => line.includes("   source: owner/repo"))).toBe(true);
  });
});
