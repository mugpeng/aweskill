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
import { runCheck } from "./commands/check.js";
import { runDisable } from "./commands/disable.js";
import { runEnable } from "./commands/enable.js";
import { runInit } from "./commands/init.js";
import { runListBundles, runListSkills } from "./commands/list.js";
import { runRemove } from "./commands/remove.js";
import { runScan } from "./commands/scan.js";
import { runSync } from "./commands/sync.js";
import { isDirectCliEntry } from "./lib/runtime.js";
import { introCommand, outroCommand, writeCliError, writeCliMessage } from "./lib/ui.js";
import type { ActivationType, ImportMode, RuntimeContext, Scope } from "./types.js";

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
  if (value === "mv" || value === "cp") {
    return value;
  }
  throw new Error(`Unsupported import mode: ${value}. Use "cp" or "mv".`);
}

function getActivationType(value: string): ActivationType {
  if (value === "bundle" || value === "skill") {
    return value;
  }
  throw new Error(`Unsupported activation type: ${value}`);
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
    .option("--mode <mode>", "import mode when used with --add: cp (default) or mv", getMode, "cp")
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
    .option("--mode <mode>", "import mode: cp (default) or mv", getMode, "cp")
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

  const list = program.command("list").description("List central skills or bundles");
  list.command("skills").action(async () => {
    await runListSkills(context);
  });
  list.command("bundles").action(async () => {
    await runListBundles(context);
  });

  program
    .command("check")
    .description("Check central skills alongside agent skill directories")
    .option("--global", "check global scope (default when no scope flag given)")
    .option("--project [dir]", "check project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", "repeat or use comma list; defaults to all", collectAgents)
    .option("--update", "import missing skills into the central repo and relink duplicates/new skills", false)
    .action(async (options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill check ", async () =>
        runCheck(context, {
          scope,
          agents: options.agent ?? [],
          projectDir,
          update: options.update,
        }),
      );
    });

  const registerActivationCommand = (name: "enable" | "disable") => {
    program
      .command(name)
      .description(`${name === "enable" ? "Add" : "Remove"} an activation and reconcile`)
      .argument("<type>", "bundle or skill", getActivationType)
      .argument("<name>")
      .option("--global", "apply to global scope (default when no scope flag given)")
      .option("--project [dir]", "apply to project scope; uses cwd when dir is omitted")
      .option("--agent <agent>", "repeat or use comma list; defaults to all", collectAgents)
      .action(async (type, targetName, options) => {
        const isProject = options.project !== undefined;
        const scope: Scope = isProject ? "project" : "global";
        const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
        const payload = {
          type,
          name: targetName,
          scope,
          agents: options.agent ?? [],
          projectDir,
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
