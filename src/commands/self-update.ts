import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";

import {
  getGitHubDevCommit,
  getNpmLatestVersion,
  gitCloneDev,
  npmBuildAndInstall,
  npmInstallGlobal,
} from "../lib/self-update.js";
import { AWESKILL_VERSION } from "../lib/version.js";
import type { RuntimeContext } from "../types.js";

export interface SelfUpdateOptions {
  dev?: boolean;
  check?: boolean;
}

export async function runSelfUpdate(context: RuntimeContext, options: SelfUpdateOptions = {}) {
  const currentVersion = AWESKILL_VERSION;

  if (options.dev) {
    await runDevUpdate(context, currentVersion, options.check);
  } else {
    await runNpmUpdate(context, currentVersion, options.check);
  }
}

async function runNpmUpdate(context: RuntimeContext, currentVersion: string, checkOnly?: boolean) {
  let latestVersion: string;
  try {
    latestVersion = await getNpmLatestVersion();
  } catch {
    throw new Error("Failed to check npm registry. Is npm installed and network available?");
  }

  context.write(`Current version: ${pc.cyan(currentVersion)}`);
  context.write(`Latest version:  ${pc.cyan(latestVersion)}`);

  if (currentVersion === latestVersion) {
    context.write("Already up to date.");
    return;
  }

  if (checkOnly) {
    return;
  }

  const confirmed = await p.confirm({
    message: `Update aweskill from ${currentVersion} to ${latestVersion}?`,
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    context.write("Update cancelled.");
    return;
  }

  const s = p.spinner();
  s.start("Updating aweskill via npm...");
  try {
    await npmInstallGlobal();
    s.stop(`Updated to ${latestVersion}`);
  } catch (error) {
    s.stop("Update failed.");
    throw error;
  }
}

async function runDevUpdate(context: RuntimeContext, currentVersion: string, checkOnly?: boolean) {
  let commit: Awaited<ReturnType<typeof getGitHubDevCommit>>;
  try {
    commit = await getGitHubDevCommit();
  } catch {
    throw new Error("Failed to fetch dev branch info from GitHub. Is the network available?");
  }

  context.write(`Current version:  ${pc.cyan(currentVersion)}`);
  context.write(`Latest commit:    ${pc.cyan(commit.shortSha)} — ${commit.message} (${commit.date})`);

  if (checkOnly) {
    return;
  }

  const confirmed = await p.confirm({
    message: `Update aweskill from dev branch (${commit.shortSha})?`,
    initialValue: true,
  });

  if (p.isCancel(confirmed) || !confirmed) {
    context.write("Update cancelled.");
    return;
  }

  let tmpDir: string;
  const s = p.spinner();
  s.start("Cloning dev branch...");
  try {
    tmpDir = await mkdtemp(path.join(tmpdir(), "aweskill-update-"));
    await gitCloneDev(tmpDir);
    s.stop("Clone complete.");

    s.start("Building and installing...");
    await npmBuildAndInstall(tmpDir);
    s.stop(`Updated from dev branch (${commit.shortSha})`);
  } catch (error) {
    s.stop("Update failed.");
    throw error;
  } finally {
    if (tmpDir!) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
