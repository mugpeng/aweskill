import { runCheck } from "./check.js";
import type { RuntimeContext, Scope } from "../types.js";

export async function runSync(
  context: RuntimeContext,
  options: {
    scope: Scope;
    agents: string[];
    projectDir?: string;
    apply?: boolean;
    removeSuspicious?: boolean;
    verbose?: boolean;
  },
) {
  return runCheck(context, {
    scope: options.scope,
    agents: options.agents,
    projectDir: options.projectDir,
    sync: options.apply,
    removeSuspicious: options.removeSuspicious,
    verbose: options.verbose,
  });
}
