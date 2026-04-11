import { syncWorkspace } from "../lib/reconcile.js";
import type { RuntimeContext } from "../types.js";

export async function runSync(context: RuntimeContext, options: { projectDir?: string }) {
  const results = await syncWorkspace({
    homeDir: context.homeDir,
    cwd: context.cwd,
    projectDir: options.projectDir,
  });
  const changeCount = results.reduce((count, result) => count + result.changes.length, 0);
  context.write(`Sync applied ${changeCount} changes`);
  return results;
}
