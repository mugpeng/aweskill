import { afterEach, describe, expect, it, vi } from "vitest";

import { runFind } from "../src/commands/find.js";
import { createRuntime, createTempWorkspace } from "./helpers.js";

describe("find command", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("aggregates both providers, dedupes by name, and keeps skills.sh first", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://skills.sh/api/search")) {
        return {
          ok: true,
          json: async () => ({
            skills: [
              { id: "owner/repo", name: "protein-search", installs: 8800, source: "owner/repo" },
              { id: "other/repo", name: "signal-flow", installs: 1200, source: "other/repo" },
            ],
          }),
        };
      }
      if (url === "https://sciskillhub.org/api/v1/skills/search") {
        expect(init?.method).toBe("POST");
        expect(init?.body).toContain('"query":"protein"');
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: "open-source/research/protein-search", name: "protein-search", description: "duplicate", similarity_score: 90 },
              { id: "open-source/research/lifesciences-proteomics", name: "lifesciences-proteomics", description: "Queries proteins", similarity_score: 80 },
            ],
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await runFind(context, "protein");

    const output = lines.join("\n");
    expect(output).toContain("Found 3 skills:");
    expect(output).toContain("protein-search  8.8K installs  skills-sh");
    expect(output).toContain("Download: aweskill store download owner/repo");
    expect(output).toContain("lifesciences-proteomics  --  sciskill");
    expect(output).toContain("Download: aweskill store download sciskill:open-source/research/lifesciences-proteomics");
    expect(output).not.toContain("duplicate");
  });

  it("warns when sciskill-only filters are used against skills-sh", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ skills: [{ id: "owner/repo", name: "protein-search", installs: 10, source: "owner/repo" }] }),
    })));

    await runFind(context, "protein", { provider: "skills-sh", domain: "Life Sciences" });

    expect(lines[0]).toBe("Warning: --domain and --stage only apply to sciskill.");
  });
});
