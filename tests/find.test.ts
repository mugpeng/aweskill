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
    expect(output).toContain("Found 3 skills");
    expect(output).toContain("1. protein-search");
    expect(output).toContain("   skills-sh · 8.8K installs");
    expect(output).toContain("   source: owner/repo");
    expect(output).toContain("3. lifesciences-proteomics");
    expect(output).toContain("   sciskill");
    expect(output).toContain("   source: sciskill:open-source/research/lifesciences-proteomics");
    expect(output).not.toContain("duplicate");
    expect(output).toContain("Run: aweskill store download <source>");
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

  it("falls back to a parseable id when skills.sh returns an unsupported source value", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: "smithery/ai/scientific-writing",
            name: "scientific-writing",
            installs: 10,
            source: "smithery.ai",
          },
        ],
      }),
    })));

    await runFind(context, "scientific-writing", { provider: "skills-sh" });

    const output = lines.join("\n");
    expect(output).toContain("source: smithery/ai/scientific-writing");
    expect(output).not.toContain("source: smithery.ai");
  });

  it("marks skills.sh entries as unsupported when neither source nor id is parseable", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: "not a valid source",
            name: "scientific-writing",
            installs: 10,
            source: "smithery.ai",
          },
        ],
      }),
    })));

    await runFind(context, "scientific-writing", { provider: "skills-sh" });

    const output = lines.join("\n");
    expect(output).toContain("source: unsupported by aweskill download");
  });
});
