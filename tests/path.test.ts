import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  expandHomePath,
  getAweskillPaths,
  getDuplicateMatchKey,
  isPathSafe,
  sanitizeName,
  stripVersionSuffix,
} from "../src/lib/path.js";

describe("path helpers", () => {
  it("sanitizes skill names", () => {
    expect(sanitizeName(" Frontend Design! ")).toBe("frontend-design");
  });

  it("strips version suffixes from normalized names", () => {
    expect(stripVersionSuffix("ffmpeg-video-editor-1.0.0")).toBe("ffmpeg-video-editor");
  });

  it("builds duplicate match keys by comparing text after removing symbols", () => {
    expect(getDuplicateMatchKey("FFmpeg Video Editor")).toBe("ffmpegvideoeditor");
    expect(getDuplicateMatchKey("ffmpeg-video-editor-1.0.0")).toBe("ffmpegvideoeditor");
    expect(getDuplicateMatchKey("Self-Improving Agent (With Self-Reflection)")).toBe(
      "selfimprovingagentwithselfreflection",
    );
    expect(getDuplicateMatchKey("self-improving-agent-with-self-reflection")).toBe(
      "selfimprovingagentwithselfreflection",
    );
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
    expect(paths.backupDir).toBe(path.join("/tmp/home", ".aweskill", "backup"));
    expect(paths.dedupBackupDir).toBe(path.join("/tmp/home", ".aweskill", "backup", "dedup"));
    expect(paths.fixSkillsBackupDir).toBe(path.join("/tmp/home", ".aweskill", "backup", "fix_skills"));
  });
});
