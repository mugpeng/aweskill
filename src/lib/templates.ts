import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function getTemplateBundlesDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "..", "..", "template", "bundles"),
    path.resolve(moduleDir, "..", "template", "bundles"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Template bundles directory not found. Checked: ${candidates.join(", ")}`);
}
