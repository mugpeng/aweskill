import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { pathExists } from "../src/lib/fs.js";
import { createTempWorkspace } from "./helpers.js";

describe("fs helpers", () => {
  it("reports whether a path exists", async () => {
    const workspace = await createTempWorkspace();
    const existingPath = path.join(workspace.rootDir, "present.txt");
    const missingPath = path.join(workspace.rootDir, "missing.txt");

    await writeFile(existingPath, "ok\n", "utf8");

    await expect(pathExists(existingPath)).resolves.toBe(true);
    await expect(pathExists(missingPath)).resolves.toBe(false);
    await expect(access(existingPath)).resolves.toBeUndefined();
  });
});
