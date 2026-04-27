import path from "node:path";

export type DownloadSourceType = "github" | "local" | "sciskill";

export interface DownloadSource {
  type: DownloadSourceType;
  source: string;
  sourceUrl: string;
  ref?: string;
  subpath?: string;
  localPath?: string;
}

function isLocalPath(input: string): boolean {
  return path.isAbsolute(input) || input === "." || input === ".." || input.startsWith("./") || input.startsWith("../");
}

function sanitizeSubpath(subpath: string): string {
  const normalized = subpath.replace(/\\/g, "/");
  if (normalized.split("/").some((segment) => segment === "..")) {
    throw new Error(`Unsafe subpath: ${subpath}`);
  }
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function parseDownloadSource(input: string, cwd = process.cwd()): DownloadSource {
  if (isLocalPath(input)) {
    const localPath = path.resolve(cwd, input);
    return {
      type: "local",
      source: localPath,
      sourceUrl: `file://${localPath}`,
      localPath,
    };
  }

  const sciskill = input.match(/^sciskill:(.+)$/);
  if (sciskill) {
    const skillId = sciskill[1]!.trim();
    if (!skillId) {
      throw new Error(`Unsupported download source: ${input}`);
    }
    return {
      type: "sciskill",
      source: `sciskill:${skillId}`,
      sourceUrl: `https://sciskillhub.org/api/v1/download/${encodeURIComponent(skillId)}`,
    };
  }

  const sciskillUrl = input.match(/^https:\/\/[^/]+\/api(?:\/v1)?\/download\/(.+)$/);
  if (sciskillUrl) {
    const skillId = decodeURIComponent(sciskillUrl[1]!.replace(/\/+$/, ""));
    return {
      type: "sciskill",
      source: `sciskill:${skillId}`,
      sourceUrl: input.replace(/\/+$/, ""),
    };
  }

  const githubTreeWithPath = input.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/);
  if (githubTreeWithPath) {
    const [, owner, repo, ref, subpath] = githubTreeWithPath;
    const cleanRepo = repo!.replace(/\.git$/, "");
    return {
      type: "github",
      source: `${owner}/${cleanRepo}`,
      sourceUrl: `https://github.com/${owner}/${cleanRepo}.git`,
      ref,
      subpath: sanitizeSubpath(subpath!),
    };
  }

  const githubTree = input.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/?$/);
  if (githubTree) {
    const [, owner, repo, ref] = githubTree;
    const cleanRepo = repo!.replace(/\.git$/, "");
    return {
      type: "github",
      source: `${owner}/${cleanRepo}`,
      sourceUrl: `https://github.com/${owner}/${cleanRepo}.git`,
      ref,
    };
  }

  const githubUrl = input.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  if (githubUrl) {
    const [, owner, repo] = githubUrl;
    const cleanRepo = repo!.replace(/\.git$/, "");
    return {
      type: "github",
      source: `${owner}/${cleanRepo}`,
      sourceUrl: `https://github.com/${owner}/${cleanRepo}.git`,
    };
  }

  const shorthand = input.match(/^([^/:]+)\/([^/]+)(?:\/(.+))?$/);
  if (shorthand) {
    const [, owner, repo, subpath] = shorthand;
    const cleanRepo = repo!.replace(/\.git$/, "");
    return {
      type: "github",
      source: `${owner}/${cleanRepo}`,
      sourceUrl: `https://github.com/${owner}/${cleanRepo}.git`,
      ...(subpath ? { subpath: sanitizeSubpath(subpath) } : {}),
    };
  }

  throw new Error(`Unsupported download source: ${input}`);
}
