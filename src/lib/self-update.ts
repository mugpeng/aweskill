import { execFile } from "node:child_process";

function runCommand(command: string, args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: 120_000, cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function getNpmLatestVersion(): Promise<string> {
  const output = await runCommand("npm", ["view", "aweskill", "version"]);
  return output;
}

export interface GitHubDevCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
}

export async function getGitHubDevCommit(): Promise<GitHubDevCommit> {
  const response = await fetch(
    "https://api.github.com/repos/mugpeng/aweskill/commits?sha=dev&per_page=1",
    { headers: { Accept: "application/vnd.github+json" } },
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const commits = (await response.json()) as Array<{
    sha: string;
    commit: { message: string; committer: { date: string } };
  }>;

  if (commits.length === 0) {
    throw new Error("No commits found on dev branch");
  }

  const commit = commits[0]!;
  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    message: commit.commit.message.split("\n")[0]!,
    date: commit.commit.committer.date.slice(0, 10),
  };
}

export async function npmInstallGlobal(): Promise<string> {
  return runCommand("npm", ["install", "-g", "aweskill"]);
}

export async function gitCloneDev(tmpDir: string): Promise<void> {
  await runCommand("git", [
    "clone",
    "--branch",
    "dev",
    "--depth",
    "1",
    "https://github.com/mugpeng/aweskill.git",
    tmpDir,
  ]);
}

export async function npmBuildAndInstall(repoDir: string): Promise<string> {
  await runCommand("npm", ["install"], repoDir);
  await runCommand("npm", ["run", "build"], repoDir);
  return runCommand("npm", ["install", "-g", "."], repoDir);
}
