import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathExists } from "./fs.js";

export async function getTemplateBundlesDir(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(moduleDir, "..", "..", "resources", "bundle_templates"),
    path.resolve(moduleDir, "..", "resources", "bundle_templates"),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Template bundles directory not found. Checked: ${candidates.join(", ")}`);
}
