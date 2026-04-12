#!/usr/bin/env node

import { Command } from "commander";
import { homedir } from "node:os";

import { runAdd } from "./commands/add.js";
import {
  runBundleAddSkill,
  runBundleCreate,
  runBundleDelete,
  runBundleRemoveSkill,
  runBundleShow,
} from "./commands/bundle.js";
import { runDisable } from "./commands/disable.js";
import { runEnable } from "./commands/enable.js";
import { runInit } from "./commands/init.js";
import { runListBundles, runListSkills, runListStatus } from "./commands/list.js";
import { getRegistryScope, runRegistryShow } from "./commands/registry.js";
import { runRemove } from "./commands/remove.js";
import { runScan } from "./commands/scan.js";
import { runSync } from "./commands/sync.js";
import { isDirectCliEntry } from "./lib/runtime.js";
import { introCommand, outroCommand, writeCliError, writeCliMessage } from "./lib/ui.js";
import type { ActivationType, CommandScope, ImportMode, RuntimeContext, Scope } from "./types.js";

function createRuntimeContext(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  return {
    cwd: overrides.cwd ?? process.cwd(),
    homeDir: overrides.homeDir ?? process.env.AWESKILL_HOME ?? homedir(),
    write: overrides.write ?? writeCliMessage,
    error: overrides.error ?? writeCliError,
  };
}

async function runFramedCommand<T>(title: string, action: () => Promise<T>): Promise<T> {
  introCommand(title);
  const result = await action();
  outroCommand();
  return result;
}

function collectAgents(value: string, previous?: string[]): string[] {
  return [...(previous ?? []), ...value.split(",").map((entry) => entry.trim()).filter(Boolean)];
}

function getMode(value: string): ImportMode {
  if (value === "symlink" || value === "mv" || value === "cp") {
    return value;
  }
  throw new Error(`Unsupported import mode: ${value}`);
}

function getActivationType(value: string): ActivationType {
  if (value === "bundle" || value === "skill") {
    return value;
  }
  throw new Error(`Unsupported activation type: ${value}`);
}

function getScope(value: string): Scope {
  if (value === "global" || value === "project") {
    return value;
  }
  throw new Error(`Unsupported scope: ${value}`);
}

function getCommandScope(value: string): CommandScope {
  if (value === "all" || value === "global" || value === "project") {
    return value;
  }
  throw new Error(`Unsupported scope: ${value}`);
}

export function createProgram(overrides: Partial<RuntimeContext> = {}) {
  const context = createRuntimeContext(overrides);
  const program = new Command();

  program
    .name("aweskill")
    .description("Local skill orchestration CLI for AI agents")
    .version("0.1.0")
    .helpOption("-h, --help", "Display help");

  program
    .command("init")
    .description("Create ~/.aweskill layout")
    .option("--scan", "scan existing agent directories after init", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill init ", async () => runInit(context, options));
    });

  program
    .command("scan")
    .description("Scan supported agent skill directories")
    .option("--add", "import scanned skills into the central repository", false)
    .option("--mode <mode>", "import mode when used with --add", getMode, "cp")
    .option("--override", "overwrite existing files when importing", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill scan ", async () =>
        runScan(context, {
          add: options.add,
          mode: options.mode,
          override: options.override,
        }),
      );
    });

  program
    .command("add")
    .argument("[path]")
    .description("Import one skill or a skills root directory")
    .option("--scan", "import scanned skills", false)
    .option("--mode <mode>", "import mode", getMode, "cp")
    .option("--override", "overwrite existing files when importing", false)
    .action(async (sourcePath, options) => {
      await runFramedCommand(" aweskill add ", async () =>
        runAdd(context, {
          sourcePath,
          scan: options.scan,
          mode: options.mode,
          override: options.override,
        }),
      );
    });

  program
    .command("remove")
    .argument("<skill>")
    .description("Remove a skill from the central repo")
    .option("--force", "remove and clean references", false)
    .option("--project <dir>", "project config to inspect")
    .action(async (skillName, options) => {
      await runFramedCommand(" aweskill remove ", async () =>
        runRemove(context, {
          skillName,
          force: options.force,
          projectDir: options.project,
        }),
      );
    });

  const bundle = program.command("bundle").description("Manage skill bundles");
  bundle.command("create").argument("<name>").action(async (name) => {
    await runFramedCommand(" aweskill bundle create ", async () => runBundleCreate(context, name));
  });
  bundle.command("show").argument("<name>").action(async (name) => {
    await runBundleShow(context, name);
  });
  bundle
    .command("add-skill")
    .argument("<bundle>")
    .argument("<skill>")
    .action(async (bundleName, skillName) => {
      await runFramedCommand(" aweskill bundle add-skill ", async () => runBundleAddSkill(context, bundleName, skillName));
    });
  bundle
    .command("remove-skill")
    .argument("<bundle>")
    .argument("<skill>")
    .action(async (bundleName, skillName) => {
      await runFramedCommand(" aweskill bundle remove-skill ", async () => runBundleRemoveSkill(context, bundleName, skillName));
    });
  bundle.command("delete").argument("<name>").action(async (name) => {
    await runFramedCommand(" aweskill bundle delete ", async () => runBundleDelete(context, name));
  });

  const list = program.command("list").description("List skills, bundles, or status");
  list.command("skills").action(async () => {
    await runListSkills(context);
  });
  list.command("bundles").action(async () => {
    await runListBundles(context);
  });
  list
    .command("status")
    .option("--project <dir>", "project to compute status for")
    .action(async (options) => {
      await runListStatus(context, { projectDir: options.project });
    });

  const registry = program.command("registry").description("Inspect derived registry snapshots");
  registry
    .command("show")
    .argument("<agent>")
    .option("--scope <scope>", "global or project", getRegistryScope)
    .option("--project <dir>", "filter project-scoped entries to one project dir")
    .action(async (agentId, options) => {
      await runRegistryShow(context, {
        agentId,
        scope: options.scope,
        projectDir: options.project,
      });
    });

  const registerActivationCommand = (name: "enable" | "disable") => {
    const defaultScope = name === "enable" ? "global" : "all";
    const scopeDescription = name === "enable" ? "global, project, or all" : "global, project, or all";
    program
      .command(name)
      .description(`${name === "enable" ? "Add" : "Remove"} an activation and reconcile`)
      .argument("<type>", "bundle or skill", getActivationType)
      .argument("<name>")
      .option("--scope <scope>", scopeDescription, getCommandScope, defaultScope)
      .option("--agent <agent>", "repeat or use comma list; defaults to all", collectAgents)
      .option("--project <dir>", "project dir for project scope")
      .action(async (type, targetName, options) => {
        const payload = {
          type,
          name: targetName,
          scope: options.scope,
          agents: options.agent ?? [],
          projectDir: options.project,
        };
        if (name === "enable") {
          await runFramedCommand(" aweskill enable ", async () => runEnable(context, payload));
          return;
        }
        await runFramedCommand(" aweskill disable ", async () => runDisable(context, payload));
      });
  };

  registerActivationCommand("enable");
  registerActivationCommand("disable");

  program
    .command("sync")
    .description("Recompute global scope plus known projects")
    .option("--project <dir>", "project dir to reconcile")
    .action(async (options) => {
      await runFramedCommand(" aweskill sync ", async () => runSync(context, { projectDir: options.project }));
    });

  program.showHelpAfterError();
  return program;
}

export async function main(argv = process.argv) {
  const program = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

if (isDirectCliEntry(import.meta.url, process.argv[1])) {
  void main();
}
