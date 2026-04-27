import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchGitHubRepoTree, getGitHubTreeShaForSubpath } from "../src/lib/github-tree.js";

describe("github tree helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts a tree sha for a skill subpath", () => {
    expect(
      getGitHubTreeShaForSubpath(
        {
          sha: "root",
          ref: "main",
          tree: [
            { path: "skills/caveman/SKILL.md", type: "blob", sha: "blob" },
            { path: "skills/caveman", type: "tree", sha: "skill-tree" },
          ],
        },
        "skills/caveman",
      ),
    ).toBe("skill-tree");
  });

  it("fetches a recursive repo tree from GitHub", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ sha: "root", tree: [{ path: "skills/caveman", type: "tree", sha: "skill-tree" }] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchGitHubRepoTree("owner/repo", "main")).resolves.toEqual({
      sha: "root",
      ref: "main",
      tree: [{ path: "skills/caveman", type: "tree", sha: "skill-tree" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/git/trees/main?recursive=1",
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": "aweskill" }) }),
    );
  });
});
