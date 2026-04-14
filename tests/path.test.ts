import path from "node:path";

import { describe, expect, it } from "vitest";

import { expandHomePath, getAweskillPaths, getDuplicateMatchKey, isPathSafe, sanitizeName, stripVersionSuffix } from "../src/lib/path.js";

describe("path helpers", () => {
  it("sanitizes skill names", () => {
    expect(sanitizeName(" Frontend Design! ")).toBe("frontend-design");
  });

  it("strips version suffixes from normalized names", () => {
    expect(stripVersionSuffix("ffmpeg-video-editor-1.0.0")).toBe("ffmpeg-video-editor");
  });

  it("builds duplicate match keys for human-readable and versioned names", () => {
    expect(getDuplicateMatchKey("FFmpeg Video Editor")).toBe("ffmpeg-video-editor");
    expect(getDuplicateMatchKey("ffmpeg-video-editor-1.0.0")).toBe("ffmpeg-video-editor");
    expect(getDuplicateMatchKey("SEO (Site Audit + Content Writer + Competitor Analysis)")).toBe("seo");
    expect(getDuplicateMatchKey("seo-1.0.3")).toBe("seo");
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
    expect(paths.skillsDir).toBe(path.join("/tmp/home", ".aweskill", "skills"));
  });
});
