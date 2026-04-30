import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import { AWESKILL_VERSION, resolveVersionForModuleUrl } from "../src/lib/version.js";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("version", () => {
  it("uses package.json as the single version source", () => {
    expect(AWESKILL_VERSION).toBe(packageJson.version);
  });

  it("resolves version when the module lives under src/lib", () => {
    const moduleUrl = pathToFileURL(path.join(repoRoot, "src/lib/version.js")).href;
    expect(resolveVersionForModuleUrl(moduleUrl)).toBe(packageJson.version);
  });

  it("resolves version when the bundled module lives under dist", () => {
    const moduleUrl = pathToFileURL(path.join(repoRoot, "dist/index.js")).href;
    expect(resolveVersionForModuleUrl(moduleUrl)).toBe(packageJson.version);
  });
});
