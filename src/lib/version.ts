import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readVersionFromPackageJson(packageJsonPath: string) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: string };

  if (!packageJson.version) {
    throw new Error(`Missing version in ${packageJsonPath}`);
  }

  return packageJson.version;
}

export function resolveVersionForModuleUrl(moduleUrl: string) {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));

  for (const relativePath of ["../package.json", "../../package.json"]) {
    const packageJsonPath = path.resolve(moduleDir, relativePath);

    if (existsSync(packageJsonPath)) {
      return readVersionFromPackageJson(packageJsonPath);
    }
  }

  throw new Error(`Cannot find package.json for module ${moduleUrl}`);
}

export const AWESKILL_VERSION = resolveVersionForModuleUrl(import.meta.url);
