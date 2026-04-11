import { mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { isDirectCliEntry } from "../src/lib/runtime.js";
import { createTempWorkspace } from "./helpers.js";

describe("runtime entry detection", () => {
  it("matches direct file execution", async () => {
    const workspace = await createTempWorkspace();
    const entryPath = path.join(workspace.rootDir, "index.js");
    const importMetaUrl = `file://${entryPath}`;
    expect(isDirectCliEntry(importMetaUrl, entryPath)).toBe(true);
  });

  it("matches symlinked executable entry", async () => {
    const workspace = await createTempWorkspace();
    const realPath = path.join(workspace.rootDir, "dist", "index.js");
    const binPath = path.join(workspace.rootDir, ".bin", "aweskill");

    await mkdir(path.dirname(realPath), { recursive: true });
    await mkdir(path.dirname(binPath), { recursive: true });
    await writeFile(realPath, "#!/usr/bin/env node\n", "utf8");
    await symlink(realPath, binPath);
    const importMetaUrl = `file://${realPath}`;

    expect(isDirectCliEntry(importMetaUrl, binPath)).toBe(true);
  });
});
