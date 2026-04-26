import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function collectFiles(baseDir: string, currentDir: string, files: Array<{ relativePath: string; content: Buffer }>): Promise<void> {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(baseDir, fullPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push({
        relativePath: path.relative(baseDir, fullPath).split(path.sep).join("/"),
        content: await readFile(fullPath),
      });
    }
  }
}

export async function computeDirectoryHash(directoryPath: string): Promise<string> {
  const files: Array<{ relativePath: string; content: Buffer }> = [];
  await collectFiles(directoryPath, directoryPath, files);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest("hex");
}
