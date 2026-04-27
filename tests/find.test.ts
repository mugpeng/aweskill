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
              { id: "other/repo", name: "Signal Flow", installs: 1200, source: "other/repo" },
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
    expect(output).toContain("   install: aweskill store install owner/repo --skill protein-search");
    expect(output).toContain("   install: aweskill store install other/repo --skill signal-flow");
    expect(output).toContain("3. lifesciences-proteomics");
    expect(output).toContain("   sciskill");
    expect(output).toContain("   source: sciskill:open-source/research/lifesciences-proteomics");
    expect(output).toContain("   install: aweskill store install sciskill:open-source/research/lifesciences-proteomics");
    expect(output).not.toContain("duplicate");
    expect(output).not.toContain("Run: aweskill store install <source>");
  });

  it("continues with available providers when one search request times out", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn((input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://skills.sh/api/search")) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      }
      if (url === "https://sciskillhub.org/api/v1/skills/search") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            results: [
              { id: "open-source/research/scientific-writing", name: "scientific-writing", similarity_score: 90 },
            ],
          }),
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    await runFind(context, "sci", { timeoutMs: 1 });

    const output = lines.join("\n");
    expect(output).toContain("Warning: skills.sh search timed out after 1ms");
    expect(output).toContain("Found 1 skill");
    expect(output).toContain("scientific-writing");
  });

  it("treats limit as per-provider when searching both providers by default", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.startsWith("https://skills.sh/api/search")) {
        expect(url).toContain("limit=1");
        return {
          ok: true,
          json: async () => ({
            skills: [
              { id: "owner/repo-a", name: "protein-search", installs: 8800, source: "owner/repo-a" },
            ],
          }),
        };
      }
      if (url === "https://sciskillhub.org/api/v1/skills/search") {
        return {
          ok: true,
          json: async () => ({
            results: [
              { id: "open-source/research/lifesciences-proteomics", name: "lifesciences-proteomics", similarity_score: 80 },
            ],
          }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }));

    const result = await runFind(context, "protein", { limit: 1 });

    expect(result.results).toHaveLength(2);
    expect(result.results.map((entry) => entry.name)).toEqual(["protein-search", "lifesciences-proteomics"]);
    expect(lines.join("\n")).toContain("Found 2 skills");
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

  it("keeps unsupported skills.sh sources visible and tells users to visit the skills.sh page", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: "smithery.ai/davila7-scientific-writing",
            skillId: "davila7-scientific-writing",
            name: "davila7-scientific-writing",
            installs: 10,
            source: "smithery.ai",
          },
        ],
      }),
    })));

    await runFind(context, "scientific-writing", { provider: "skills-sh" });

    const output = lines.join("\n");
    expect(output).toContain("source: smithery.ai");
    expect(output).toContain("aweskill store install does not support this source");
    expect(output).toContain("visit skills.sh page: https://skills.sh/smithery/ai/davila7-scientific-writing");
  });

  it("keeps supporting the legacy three-segment skills.sh detail ids", async () => {
    const workspace = await createTempWorkspace();
    const { context, lines } = createRuntime(workspace.homeDir, workspace.projectDir);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        skills: [
          {
            id: "smithery/ai/scientific-writing",
            skillId: "scientific-writing",
            name: "scientific-writing",
            installs: 10,
            source: "smithery.ai",
          },
        ],
      }),
    })));

    await runFind(context, "scientific-writing", { provider: "skills-sh" });

    const output = lines.join("\n");
    expect(output).toContain("visit skills.sh page: https://skills.sh/smithery/ai/scientific-writing");
  });

  it("keeps the original unsupported source when no detail page can be formed", async () => {
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
    expect(output).toContain("source: smithery.ai");
    expect(output).toContain("aweskill store install does not support this source");
    expect(output).not.toContain("https://skills.sh/");
  });
});
