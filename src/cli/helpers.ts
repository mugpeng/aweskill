import { homedir } from "node:os";
import type { Command } from "commander";

import { listSupportedAgentsWithGlobalStatus } from "../lib/agents.js";
import { pathExists } from "../lib/fs.js";
import { getAweskillPaths } from "../lib/path.js";
import { introCommand, outroCommand, writeCliError, writeCliMessage, writeCliRaw } from "../lib/ui.js";
import type { ActivationType, RuntimeContext } from "../types.js";

export function createRuntimeContext(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  return {
    cwd: overrides.cwd ?? process.cwd(),
    homeDir: overrides.homeDir ?? process.env.AWESKILL_HOME ?? homedir(),
    write: overrides.write ?? writeCliMessage,
    writeRaw: overrides.writeRaw ?? writeCliRaw,
    error: overrides.error ?? writeCliError,
  };
}

export async function runFramedCommand<T>(title: string, action: () => Promise<T>): Promise<T> {
  introCommand(title);
  const result = await action();
  outroCommand();
  return result;
}

export function collectAgents(value: string, previous?: string[]): string[] {
  return [
    ...(previous ?? []),
    ...value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ];
}

export function getActivationType(value: string): ActivationType {
  if (value === "bundle" || value === "skill") {
    return value;
  }
  throw new Error(`Unsupported activation type: ${value}`);
}

export async function writeSupportedAgents(context: RuntimeContext): Promise<void> {
  const lines = ["Supported agents:"];
  const agents = await listSupportedAgentsWithGlobalStatus(context.homeDir);
  const installedAgents = agents.filter((agent) => agent.installed).map((agent) => agent.id);
  lines.push(
    `Detected ${installedAgents.length} installed global agent${installedAgents.length === 1 ? "" : "s"}: ${
      installedAgents.length > 0 ? installedAgents.join(", ") : "none"
    }`,
  );
  for (const agent of agents) {
    lines.push(
      agent.installed
        ? `✓ ${agent.id} (${agent.displayName}) ${agent.skillsDir}`
        : `x ${agent.id} (${agent.displayName})`,
    );
  }
  for (const line of lines) {
    context.write(line);
  }
}

export function configureCommandTree(command: Command): void {
  command.configureOutput({
    outputError: () => undefined,
  });
  command.exitOverride((error) => {
    throw error;
  });

  for (const child of command.commands) {
    configureCommandTree(child);
  }
}

export function normalizeVersionAlias(argv: string[]): string[] {
  return argv.map((arg, index) => {
    if (index >= 2 && arg === "-V") {
      return "-v";
    }
    return arg;
  });
}

export function isInitializationExempt(args: string[]): boolean {
  if (args.length === 0) {
    return true;
  }

  if (
    args.includes("-h") ||
    args.includes("--help") ||
    args.includes("-v") ||
    args.includes("-V") ||
    args.includes("--version")
  ) {
    return true;
  }

  return args[0] === "find" || (args[0] === "store" && (args[1] === "init" || args[1] === "find"));
}

export function isKnownTopLevelCommand(arg?: string): boolean {
  if (!arg) {
    return false;
  }

  return new Set(["install", "find", "update", "bundle", "agent", "store", "doctor", "help"]).has(arg);
}

export function shouldDeferToCommandParsing(args: string[]): boolean {
  const [firstArg] = args;
  if (!firstArg || firstArg.startsWith("-")) {
    return false;
  }

  return !isKnownTopLevelCommand(firstArg);
}

export function assertLegacySkillCommandRemoved(args: string[]): void {
  if (args[0] === "skill") {
    throw new Error('Top-level command "skill" was removed. Use "aweskill store ..." instead.');
  }
  if (args[0] === "import") {
    throw new Error('Top-level command "import" was removed. Use "aweskill store import ..." instead.');
  }
}

export async function assertStoreInitialized(homeDir: string, args: string[]): Promise<void> {
  if (isInitializationExempt(args)) {
    return;
  }

  const { rootDir } = getAweskillPaths(homeDir);
  if (await pathExists(rootDir)) {
    return;
  }

  throw new Error(`aweskill store is not initialized at ${rootDir}. Run "aweskill store init" first.`);
}
