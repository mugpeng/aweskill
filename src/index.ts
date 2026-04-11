#!/usr/bin/env node

import { Command } from "commander";
import { homedir } from "node:os";

import { runAdd } from "./commands/add.js";
import {
  runBundleAddSkill,
  runBundleCreate,
  runBundleRemoveSkill,
  runBundleShow,
} from "./commands/bundle.js";
import { runDisable } from "./commands/disable.js";
import { runEnable } from "./commands/enable.js";
import { runInit } from "./commands/init.js";
import { runListBundles, runListSkills, runListStatus } from "./commands/list.js";
import { runRemove } from "./commands/remove.js";
import { runScan } from "./commands/scan.js";
import { runSync } from "./commands/sync.js";
import { isDirectCliEntry } from "./lib/runtime.js";
import type { ActivationType, ImportMode, RuntimeContext, Scope } from "./types.js";

function createRuntimeContext(overrides: Partial<RuntimeContext> = {}): RuntimeContext {
  return {
    cwd: overrides.cwd ?? process.cwd(),
    homeDir: overrides.homeDir ?? process.env.AWESKILL_HOME ?? homedir(),
    write: overrides.write ?? ((message) => console.log(message)),
    error: overrides.error ?? ((message) => console.error(message)),
  };
}

function collectAgents(value: string, previous: string[] = []): string[] {
  return [...previous, ...value.split(",").map((entry) => entry.trim()).filter(Boolean)];
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

export function createProgram(overrides: Partial<RuntimeContext> = {}) {
  const context = createRuntimeContext(overrides);
  const program = new Command();

  program.name("aweskill").description("Local skill orchestration CLI");

  program
    .command("init")
    .option("--scan", "scan existing agent directories after init", false)
    .action(async (options) => {
      await runInit(context, options);
    });

  program
    .command("scan")
    .option("--project <dir>", "scan an explicit project dir", collectAgents, [])
    .action(async (options) => {
      await runScan(context, {
        projectDirs: options.project.length > 0 ? options.project : undefined,
      });
    });

  program
    .command("add")
    .argument("[path]")
    .option("--scan", "import scanned skills", false)
    .option("--mode <mode>", "import mode", getMode, "cp")
    .option("--project <dir>", "scan an explicit project dir", collectAgents, [])
    .action(async (sourcePath, options) => {
      await runAdd(context, {
        sourcePath,
        scan: options.scan,
        mode: options.mode,
        projectDirs: options.project.length > 0 ? options.project : undefined,
      });
    });

  program
    .command("remove")
    .argument("<skill>")
    .option("--force", "remove and clean references", false)
    .option("--project <dir>", "project config to inspect")
    .action(async (skillName, options) => {
      await runRemove(context, {
        skillName,
        force: options.force,
        projectDir: options.project,
      });
    });

  const bundle = program.command("bundle");
  bundle.command("create").argument("<name>").action(async (name) => {
    await runBundleCreate(context, name);
  });
  bundle.command("show").argument("<name>").action(async (name) => {
    await runBundleShow(context, name);
  });
  bundle
    .command("add-skill")
    .argument("<bundle>")
    .argument("<skill>")
    .action(async (bundleName, skillName) => {
      await runBundleAddSkill(context, bundleName, skillName);
    });
  bundle
    .command("remove-skill")
    .argument("<bundle>")
    .argument("<skill>")
    .action(async (bundleName, skillName) => {
      await runBundleRemoveSkill(context, bundleName, skillName);
    });

  const list = program.command("list");
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

  const registerActivationCommand = (name: "enable" | "disable") => {
    program
      .command(name)
      .argument("<type>", "bundle or skill", getActivationType)
      .argument("<name>")
      .requiredOption("--scope <scope>", "global or project", getScope)
      .requiredOption("--agent <agent>", "repeat or use comma list; use all for detected agents", collectAgents, [])
      .option("--project <dir>", "project dir for project scope")
      .action(async (type, targetName, options) => {
        const payload = {
          type,
          name: targetName,
          scope: options.scope,
          agents: options.agent,
          projectDir: options.project,
        };
        if (name === "enable") {
          await runEnable(context, payload);
          return;
        }
        await runDisable(context, payload);
      });
  };

  registerActivationCommand("enable");
  registerActivationCommand("disable");

  program
    .command("sync")
    .option("--project <dir>", "project dir to reconcile")
    .action(async (options) => {
      await runSync(context, { projectDir: options.project });
    });

  program.showHelpAfterError();
  return program;
}

export async function main(argv = process.argv) {
  const program = createProgram();
  await program.parseAsync(argv);
}

if (isDirectCliEntry(import.meta.url, process.argv[1])) {
  void main();
}
