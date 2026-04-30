#!/usr/bin/env node

import { createProgram } from "./cli/commands.js";
import { formatCliErrorMessage } from "./cli/errors.js";
import {
  assertLegacySkillCommandRemoved,
  assertStoreInitialized,
  createRuntimeContext,
  normalizeVersionAlias,
  shouldDeferToCommandParsing,
} from "./cli/helpers.js";
import { isDirectCliEntry } from "./lib/runtime.js";

export { createProgram } from "./cli/commands.js";

export async function main(argv = process.argv) {
  const program = createProgram();
  const normalizedArgv = normalizeVersionAlias(argv);
  const commandArgs = normalizedArgv.slice(2);
  try {
    const context = createRuntimeContext();
    assertLegacySkillCommandRemoved(commandArgs);
    if (!shouldDeferToCommandParsing(commandArgs)) {
      await assertStoreInitialized(context.homeDir, commandArgs);
    }
    await program.parseAsync(normalizedArgv);
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "commander.version" || code === "commander.helpDisplayed") {
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    if (message === "(outputHelp)" || message === "outputHelp") {
      return;
    }

    console.error(`Error: ${formatCliErrorMessage(message, commandArgs)}`);
    process.exitCode = 1;
  }
}

if (isDirectCliEntry(import.meta.url, process.argv[1])) {
  void main();
}
