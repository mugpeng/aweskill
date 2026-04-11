import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export function isDirectCliEntry(importMetaUrl: string, argv1?: string): boolean {
  if (!argv1) {
    return false;
  }

  try {
    const executedPath = realpathSync(argv1);
    const modulePath = realpathSync(fileURLToPath(importMetaUrl));
    return pathToFileURL(modulePath).href === pathToFileURL(executedPath).href;
  } catch {
    return importMetaUrl === pathToFileURL(argv1).href;
  }
}
