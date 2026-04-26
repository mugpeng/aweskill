import path from "node:path";
import { fileURLToPath } from "node:url";

import { pathExists } from "./fs.js";

async function resolveResourceDir(resourcePath: string): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "..", "..", "resources", resourcePath),
    path.resolve(moduleDir, "..", "resources", resourcePath),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Resource directory not found for ${resourcePath}. Checked: ${candidates.join(", ")}`);
}

export async function getTemplateBundlesDir(): Promise<string> {
  return resolveResourceDir("bundle_templates");
}

export async function getBuiltinSkillsDir(): Promise<string> {
  return resolveResourceDir("skills");
}
