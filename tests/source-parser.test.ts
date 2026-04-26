import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseDownloadSource } from "../src/lib/source-parser.js";

describe("download source parser", () => {
  it("parses GitHub shorthand", () => {
    expect(parseDownloadSource("owner/repo")).toEqual({
      type: "github",
      source: "owner/repo",
      sourceUrl: "https://github.com/owner/repo.git",
    });
  });

  it("parses GitHub tree URLs with ref and subpath", () => {
    expect(parseDownloadSource("https://github.com/owner/repo/tree/main/skills/caveman")).toEqual({
      type: "github",
      source: "owner/repo",
      sourceUrl: "https://github.com/owner/repo.git",
      ref: "main",
      subpath: "skills/caveman",
    });
  });

  it("parses local paths relative to cwd", () => {
    expect(parseDownloadSource("./skills/caveman", "/tmp/project")).toEqual({
      type: "local",
      source: path.resolve("/tmp/project", "skills/caveman"),
      sourceUrl: `file://${path.resolve("/tmp/project", "skills/caveman")}`,
      localPath: path.resolve("/tmp/project", "skills/caveman"),
    });
  });

  it("rejects path traversal in GitHub subpaths", () => {
    expect(() => parseDownloadSource("owner/repo/../secret")).toThrow("Unsafe subpath");
  });
});
