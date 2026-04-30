export interface GitHubTreeEntry {
  path: string;
  type: "blob" | "tree";
  sha: string;
}

export interface GitHubRepoTree {
  sha: string;
  ref: string;
  tree: GitHubTreeEntry[];
}

const GITHUB_TREE_TIMEOUT_MS = 10_000;

function getGitHubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}

export function getGitHubTreeShaForSubpath(tree: GitHubRepoTree, subpath: string): string | undefined {
  const normalized = subpath.replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized || normalized === ".") {
    return tree.sha;
  }
  return tree.tree.find((entry) => entry.type === "tree" && entry.path === normalized)?.sha;
}

export async function fetchGitHubRepoTree(ownerRepo: string, ref?: string): Promise<GitHubRepoTree | undefined> {
  const refs = ref ? [ref] : ["HEAD", "main", "master"];
  const token = getGitHubToken();

  for (const candidateRef of refs) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${ownerRepo}/git/trees/${encodeURIComponent(candidateRef)}?recursive=1`,
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "aweskill",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(GITHUB_TREE_TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as { sha?: string; tree?: GitHubTreeEntry[] };
      if (!data.sha || !Array.isArray(data.tree)) {
        continue;
      }
      return { sha: data.sha, ref: candidateRef, tree: data.tree };
    } catch {}
  }

  return undefined;
}
