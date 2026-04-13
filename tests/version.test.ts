import { describe, expect, it } from "vitest";

import { AWESKILL_VERSION, resolveVersionForModuleUrl } from "../src/lib/version.js";
import packageJson from "../package.json" with { type: "json" };

describe("version", () => {
  it("uses package.json as the single version source", () => {
    expect(AWESKILL_VERSION).toBe(packageJson.version);
  });

  it("resolves version when the module lives under src/lib", () => {
    expect(
      resolveVersionForModuleUrl("file:///Users/peng/Desktop/Project/aweskills/src/lib/version.js"),
    ).toBe(packageJson.version);
  });

  it("resolves version when the bundled module lives under dist", () => {
    expect(
      resolveVersionForModuleUrl("file:///Users/peng/Desktop/Project/aweskills/dist/index.js"),
    ).toBe(packageJson.version);
  });
});
