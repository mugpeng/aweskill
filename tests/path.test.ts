import path from "node:path";

import { describe, expect, it } from "vitest";

import { expandHomePath, getAweskillPaths, isPathSafe, sanitizeName } from "../src/lib/path.js";

describe("path helpers", () => {
  it("sanitizes skill names", () => {
    expect(sanitizeName(" Frontend Design! ")).toBe("frontend-design");
  });

  it("expands home prefixes", () => {
    expect(expandHomePath("~/work", "/tmp/home")).toBe(path.join("/tmp/home", "work"));
  });

  it("checks path safety", () => {
    expect(isPathSafe("/tmp/base", "/tmp/base/child")).toBe(true);
    expect(isPathSafe("/tmp/base", "/tmp/outside")).toBe(false);
  });

  it("builds aweskill paths", () => {
    const paths = getAweskillPaths("/tmp/home");
    expect(paths.skillsDir).toBe("/tmp/home/.aweskill/skills");
  });
});
