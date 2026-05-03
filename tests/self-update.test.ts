import { describe, expect, it, vi, beforeEach } from "vitest";

import { createRuntime } from "./helpers.ts";

vi.mock("../src/lib/self-update.js", () => ({
  getNpmLatestVersion: vi.fn(),
  getGitHubDevCommit: vi.fn(),
  npmInstallGlobal: vi.fn(),
  gitCloneDev: vi.fn(),
  npmBuildAndInstall: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  isCancel: vi.fn(() => false),
}));

const selfUpdateModule = await import("../src/lib/self-update.js");
const clackPrompts = await import("@clack/prompts");
const { runSelfUpdate } = await import("../src/commands/self-update.js");

describe("self-update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("npm mode", () => {
    it("shows up-to-date message when versions match", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getNpmLatestVersion).mockResolvedValue("0.3.1");

      await runSelfUpdate(context, {});

      expect(lines.join("\n")).toContain("Already up to date.");
    });

    it("shows version comparison in check mode", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getNpmLatestVersion).mockResolvedValue("0.4.0");

      await runSelfUpdate(context, { check: true });

      const output = lines.join("\n");
      expect(output).toContain("Current version:");
      expect(output).toContain("Latest version:");
      expect(vi.mocked(clackPrompts.confirm)).not.toHaveBeenCalled();
      expect(vi.mocked(selfUpdateModule.npmInstallGlobal)).not.toHaveBeenCalled();
    });

    it("installs update after confirmation", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getNpmLatestVersion).mockResolvedValue("0.4.0");
      vi.mocked(clackPrompts.confirm).mockResolvedValue(true as never);
      vi.mocked(selfUpdateModule.npmInstallGlobal).mockResolvedValue("");

      await runSelfUpdate(context, {});

      expect(vi.mocked(selfUpdateModule.npmInstallGlobal)).toHaveBeenCalled();
    });

    it("cancels update when user declines", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getNpmLatestVersion).mockResolvedValue("0.4.0");
      vi.mocked(clackPrompts.confirm).mockResolvedValue(false as never);

      await runSelfUpdate(context, {});

      expect(lines.join("\n")).toContain("Update cancelled.");
      expect(vi.mocked(selfUpdateModule.npmInstallGlobal)).not.toHaveBeenCalled();
    });

    it("throws when npm registry check fails", async () => {
      const { context } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getNpmLatestVersion).mockRejectedValue(new Error("network error"));

      await expect(runSelfUpdate(context, {})).rejects.toThrow("Failed to check npm registry");
    });
  });

  describe("dev mode", () => {
    it("shows commit info in check mode", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getGitHubDevCommit).mockResolvedValue({
        sha: "abc1234567890",
        shortSha: "abc1234",
        message: "fix: something",
        date: "2026-04-30",
      });

      await runSelfUpdate(context, { dev: true, check: true });

      const output = lines.join("\n");
      expect(output).toContain("abc1234");
      expect(output).toContain("fix: something");
      expect(output).toContain("2026-04-30");
      expect(vi.mocked(clackPrompts.confirm)).not.toHaveBeenCalled();
    });

    it("clones, builds and installs after confirmation", async () => {
      const { context } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getGitHubDevCommit).mockResolvedValue({
        sha: "abc1234567890",
        shortSha: "abc1234",
        message: "feat: new thing",
        date: "2026-04-30",
      });
      vi.mocked(clackPrompts.confirm).mockResolvedValue(true as never);
      vi.mocked(selfUpdateModule.gitCloneDev).mockResolvedValue(undefined);
      vi.mocked(selfUpdateModule.npmBuildAndInstall).mockResolvedValue("");

      await runSelfUpdate(context, { dev: true });

      expect(vi.mocked(selfUpdateModule.gitCloneDev)).toHaveBeenCalled();
      expect(vi.mocked(selfUpdateModule.npmBuildAndInstall)).toHaveBeenCalled();
    });

    it("cancels dev update when user declines", async () => {
      const { context, lines } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getGitHubDevCommit).mockResolvedValue({
        sha: "abc1234567890",
        shortSha: "abc1234",
        message: "feat: new thing",
        date: "2026-04-30",
      });
      vi.mocked(clackPrompts.confirm).mockResolvedValue(false as never);

      await runSelfUpdate(context, { dev: true });

      expect(lines.join("\n")).toContain("Update cancelled.");
      expect(vi.mocked(selfUpdateModule.gitCloneDev)).not.toHaveBeenCalled();
    });

    it("throws when GitHub API fails", async () => {
      const { context } = createRuntime("/tmp/home", "/tmp/cwd");
      vi.mocked(selfUpdateModule.getGitHubDevCommit).mockRejectedValue(new Error("API error"));

      await expect(runSelfUpdate(context, { dev: true })).rejects.toThrow(
        "Failed to fetch dev branch info from GitHub",
      );
    });
  });
});
