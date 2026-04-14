#!/usr/bin/env node

import { Command } from "commander";
import { homedir } from "node:os";

import { runBackup } from "./commands/backup.js";
import {
  runBundleAddTemplate,
  runBundleAddSkill,
  runBundleCreate,
  runBundleDelete,
  runBundleRemoveSkill,
  runBundleShow,
} from "./commands/bundle.js";
import { runImport } from "./commands/import.js";
import { runCheck } from "./commands/check.js";
import { runDisable } from "./commands/disable.js";
import { runEnable } from "./commands/enable.js";
import { runInit } from "./commands/init.js";
import { runListBundles, runListSkills, runListTemplateBundles } from "./commands/list.js";
import { runRecover } from "./commands/recover.js";
import { runRemove } from "./commands/remove.js";
import { runRestore } from "./commands/restore.js";
import { runRmdup } from "./commands/rmdup.js";
import { runScan } from "./commands/scan.js";
import { runSync } from "./commands/sync.js";
import { runClean } from "./commands/clean.js";
import { runStoreWhere } from "./commands/where.js";
import { AWESKILL_VERSION } from "./lib/version.js";
import { listSupportedAgentsWithGlobalStatus } from "./lib/agents.js";
import { pathExists } from "./lib/fs.js";
import { getAweskillPaths } from "./lib/path.js";
import { isDirectCliEntry } from "./lib/runtime.js";
import { introCommand, outroCommand, writeCliError, writeCliMessage } from "./lib/ui.js";
import type { ActivationType, RuntimeContext, Scope } from "./types.js";

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

function getActivationType(value: string): ActivationType {
  if (value === "bundle" || value === "skill") {
    return value;
  }
  throw new Error(`Unsupported activation type: ${value}`);
}

function formatCliErrorMessage(message: string): string {
  const match = message.match(/missing required argument '([^']+)'/i);
  if (!match) {
    const optionMatch = message.match(/option '([^']+)' argument missing/i);
    if (optionMatch?.[1] === "--agent <agent>") {
      return "Option --agent <agent> argument missing. Use one or more supported agent ids, for example \"codex\" or \"codex,cursor\". Run \"aweskill agent supported\" to see the supported agent list.";
    }
    const normalizedMessage = message.replace(/^error:\s*/i, "");
    const bundleFileMatch = normalizedMessage.match(/ENOENT: no such file or directory, open '([^']+\/(bundles|resources\/bundle_templates)\/([^/'"]+)\.ya?ml)'/i);
    if (bundleFileMatch) {
      const bundleName = bundleFileMatch[3]!;
      if (bundleFileMatch[2] === "resources/bundle_templates") {
        return `Bundle template not found: ${bundleName}. Run "aweskill bundle template list" to see available bundle templates.`;
      }
      return `Bundle not found: ${bundleName}. Run "aweskill bundle list" to see available bundles.`;
    }
    const unknownSkillMatch = normalizedMessage.match(/^Unknown skill: (.+)$/);
    if (unknownSkillMatch) {
      return `Unknown skill: ${unknownSkillMatch[1]}. Run "aweskill store list" to see available skills.`;
    }
    const bundleNotFoundMatch = normalizedMessage.match(/^Bundle not found: (.+)$/);
    if (bundleNotFoundMatch) {
      return `Bundle not found: ${bundleNotFoundMatch[1]}. Run "aweskill bundle list" to see available bundles.`;
    }
    return normalizedMessage;
  }

  const argName = match[1]!;
  const hints: Record<string, string> = {
    archive: 'Use a backup archive path, for example "skills-2026-04-12T19-20-00Z.tar.gz".',
    bundle: "Use a bundle name.",
    name: 'Use a bundle or skill name, for example "my-bundle", "biopython", or "all".',
    skill: "Use a skill name.",
    type: 'Use "bundle" or "skill".',
  };
  const hint = hints[argName];
  return `Missing required argument <${argName}>.${hint ? ` ${hint}` : ""}`;
}

async function writeSupportedAgents(context: RuntimeContext): Promise<void> {
  const lines = ["Supported agents:"];
  const agents = await listSupportedAgentsWithGlobalStatus(context.homeDir);
  const installedAgents = agents.filter((agent) => agent.installed).map((agent) => agent.id);
  lines.push(
    `Detected ${installedAgents.length} installed global agent${installedAgents.length === 1 ? "" : "s"}: ${
      installedAgents.length > 0 ? installedAgents.join(", ") : "none"
    }`,
  );
  for (const agent of agents) {
    lines.push(agent.installed ? `✓ ${agent.id} (${agent.displayName}) ${agent.skillsDir}` : `x ${agent.id} (${agent.displayName})`);
  }
  for (const line of lines) {
    context.write(line);
  }
}

function configureCommandTree(command: Command): void {
  command.showHelpAfterError();
  command.exitOverride((error) => {
    error.message = formatCliErrorMessage(error.message);
    throw error;
  });

  for (const child of command.commands) {
    configureCommandTree(child);
  }
}

function normalizeVersionAlias(argv: string[]): string[] {
  return argv.map((arg, index) => {
    if (index >= 2 && arg === "-V") {
      return "-v";
    }
    return arg;
  });
}

function isInitializationExempt(args: string[]): boolean {
  if (args.length === 0) {
    return true;
  }

  if (args.includes("-h") || args.includes("--help") || args.includes("-v") || args.includes("-V") || args.includes("--version")) {
    return true;
  }

  return args[0] === "store" && args[1] === "init";
}

async function assertStoreInitialized(homeDir: string, args: string[]): Promise<void> {
  if (isInitializationExempt(args)) {
    return;
  }

  const { rootDir } = getAweskillPaths(homeDir);
  if (await pathExists(rootDir)) {
    return;
  }

  throw new Error(`aweskill store is not initialized at ${rootDir}. Run "aweskill store init" first.`);
}


export function createProgram(overrides: Partial<RuntimeContext> = {}) {
  const context = createRuntimeContext(overrides);
  const program = new Command();

  program
    .name("aweskill")
    .description("Local skill orchestration CLI for AI agents")
    .version(AWESKILL_VERSION, "-v, --version", "output the version number")
    .helpOption("-h, --help", "Display help");

  const bundle = program.command("bundle").description("Manage skill bundles");
  bundle
    .command("list")
    .description("List bundles in the central store")
    .option("--verbose", "show all bundles instead of a short preview", false)
    .action(async (options) => {
      await runListBundles(context, { verbose: options.verbose });
    });
  bundle.command("create").argument("<name>").description("Create a bundle").action(async (name) => {
    await runFramedCommand(" aweskill bundle create ", async () => runBundleCreate(context, name));
  });
  bundle.command("show").argument("<name>").description("Show bundle contents").action(async (name) => {
    await runBundleShow(context, name);
  });
  bundle
    .command("add")
    .argument("<bundle>")
    .argument("<skill>")
    .description("Add skill entries to one or more bundles")
    .action(async (bundleName, skillName) => {
      await runFramedCommand(" aweskill bundle add ", async () => runBundleAddSkill(context, bundleName, skillName));
    });
  bundle
    .command("remove")
    .argument("<bundle>")
    .argument("<skill>")
    .description("Remove skill entries from one or more bundles")
    .action(async (bundleName, skillName) => {
      await runFramedCommand(" aweskill bundle remove ", async () => runBundleRemoveSkill(context, bundleName, skillName));
    });
  bundle.command("delete").argument("<name>").description("Delete a bundle").action(async (name) => {
    await runFramedCommand(" aweskill bundle delete ", async () => runBundleDelete(context, name));
  });
  const bundleTemplate = bundle.command("template").description("Manage built-in bundle templates");
  bundleTemplate
    .command("list")
    .description("List available built-in bundle templates")
    .option("--verbose", "show all bundle templates instead of a short preview", false)
    .action(async (options) => {
      await runListTemplateBundles(context, { verbose: options.verbose });
    });
  bundleTemplate.command("import").argument("<name>").description("Copy built-in templates into the central store").action(async (name) => {
    await runFramedCommand(" aweskill bundle template import ", async () => runBundleAddTemplate(context, name));
  });

  const agent = program.command("agent").description("Manage skills used by agents");
  agent.command("supported").description("List supported agent ids and display names").action(async () => {
    await writeSupportedAgents(context);
  });
  agent
    .command("list")
    .description("Inspect agent skill directories")
    .option("--global", "check global scope (default when no scope flag given)")
    .option("--project [dir]", "check project scope; uses cwd when dir is omitted")
    .option(
      "--agent <agent>",
      'repeat or use comma list; defaults to all agents detected at this scope; run "aweskill agent supported" to see supported ids',
      collectAgents,
    )
    .option("--verbose", "show all skills in each category instead of a short preview", false)
    .action(async (options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill agent list ", async () =>
        runCheck(context, {
          scope,
          agents: options.agent ?? [],
          projectDir,
          verbose: options.verbose,
        }),
      );
    });
  agent
    .command("add")
    .description("Create skill projections in agent directories")
    .argument("<type>", "bundle or skill", getActivationType)
    .argument("<name>", 'bundle or skill name(s), comma-separated, or "all"')
    .option("--global", "apply to global scope (default when no scope flag given)")
    .option("--project [dir]", "apply to project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .option("--force", "replace existing duplicate, foreign, or unmanaged targets in agent directories", false)
    .action(async (type, targetName, options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill agent add ", async () =>
        runEnable(context, {
          type,
          name: targetName,
          scope,
          agents: options.agent ?? [],
          projectDir,
          force: options.force,
        }),
      );
    });
  agent
    .command("remove")
    .description("Remove skill projections in agent directories")
    .argument("<type>", "bundle or skill", getActivationType)
    .argument("<name>", 'bundle or skill name(s), comma-separated, or "all"')
    .option("--global", "apply to global scope (default when no scope flag given)")
    .option("--project [dir]", "apply to project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .option(
      "--force",
      "with skill: remove a single bundle member or delete duplicate, foreign, or unmanaged targets in agent directories",
      false,
    )
    .action(async (type, targetName, options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill agent remove ", async () =>
        runDisable(context, {
          type,
          name: targetName,
          scope,
          agents: options.agent ?? [],
          projectDir,
          force: options.force,
        }),
      );
    });
  agent
    .command("recover")
    .description("Convert aweskill-managed symlink projections into full skill directories")
    .option("--global", "recover global scope (default when no scope flag given)")
    .option("--project [dir]", "recover project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .action(async (options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill agent recover ", async () =>
        runRecover(context, {
          scope,
          agents: options.agent ?? [],
          projectDir,
        }),
      );
    });

  const store = program.command("store").description("Manage the aweskill local store");
  store
    .command("init")
    .description("Create ~/.aweskill layout")
    .option("--scan", "scan existing agent directories after init", false)
    .option("--verbose", "show scanned skill details instead of per-agent totals", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill store init ", async () => runInit(context, options));
    });
  store
    .command("list")
    .description("List skills in the central store")
    .option("--verbose", "show all skills instead of a short preview", false)
    .action(async (options) => {
      await runListSkills(context, { verbose: options.verbose });
    });
  store
    .command("scan")
    .description("Scan supported agent skill directories")
    .option("--global", "scan global scope (default when no scope flag given)")
    .option("--project [dir]", "scan project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .option("--verbose", "show scanned skill details instead of per-agent totals", false)
    .action(async (options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill store scan ", async () =>
        runScan(context, {
          scope,
          agents: options.agent ?? [],
          projectDir,
          verbose: options.verbose,
        }),
      );
    });
  store
    .command("import")
    .argument("[path]")
    .description("Import one skill or a skills root directory")
    .option("--scan", "import scanned skills", false)
    .option("--global", "scan global scope when used with --scan (default when no scope flag given)")
    .option("--project [dir]", "scan project scope when used with --scan; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .option("--keep-source", "keep the source path in place after importing", false)
    .option("--link-source", "replace the source path with an aweskill-managed projection after importing", false)
    .option("--override", "overwrite existing files when importing", false)
    .action(async (sourcePath, options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill store import ", async () =>
        runImport(context, {
          sourcePath,
          scan: options.scan,
          scope,
          agents: options.agent ?? [],
          projectDir,
          override: options.override,
          keepSource: options.keepSource,
          linkSource: options.linkSource,
        }),
      );
    });
  store
    .command("remove")
    .argument("<skill>")
    .description("Remove a skill from the central store")
    .option("--force", "remove and clean references", false)
    .option("--project <dir>", "project config to inspect")
    .action(async (skillName, options) => {
      await runFramedCommand(" aweskill store remove ", async () =>
        runRemove(context, {
          skillName,
          force: options.force,
          projectDir: options.project,
        }),
      );
    });
  store
    .command("backup")
    .argument("[archive]")
    .description("Create a timestamped archive of the central skills repository")
    .option("--both", "include bundle definitions in the backup archive (default behavior)", true)
    .option("--skills-only", "back up only skills/ without bundles/", false)
    .action(async (archivePath, options) => {
      await runFramedCommand(" aweskill store backup ", async () =>
        runBackup(context, {
          archivePath,
          includeBundles: options.skillsOnly ? false : options.both,
        }),
      );
    });
  store
    .command("restore")
    .argument("<archive>")
    .description("Restore skills from a backup archive or unpacked backup directory and auto-back up the current store first")
    .option("--override", "replace existing skills with the archive contents", false)
    .option("--both", "restore bundle definitions and include them in the pre-restore backup (default behavior)", true)
    .option("--skills-only", "restore only skills/ without bundles/", false)
    .action(async (archivePath, options) => {
      await runFramedCommand(" aweskill store restore ", async () =>
        runRestore(context, {
          archivePath,
          override: options.override,
          includeBundles: options.skillsOnly ? false : options.both,
        }),
      );
    });
  store
    .command("where")
    .description("Show the aweskill store location and optionally summarize its contents")
    .option("--verbose", "show core store directories and entry counts", false)
    .action(async (options) => {
      await runStoreWhere(context, { verbose: options.verbose });
    });

  const doctor = program.command("doctor").description("Diagnose and repair repository issues");
  doctor
    .command("clean")
    .description("Find and optionally remove suspicious non-store entries in skills/ and bundles/")
    .option("--apply", "remove suspicious entries instead of reporting only", false)
    .option("--skills-only", "scan only skills/", false)
    .option("--bundles-only", "scan only bundles/", false)
    .option("--verbose", "show all suspicious entries instead of a short preview", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill doctor clean ", async () =>
        runClean(context, {
          apply: options.apply,
          skillsOnly: options.skillsOnly,
          bundlesOnly: options.bundlesOnly,
          verbose: options.verbose,
        }),
      );
    });
  doctor
    .command("dedup")
    .description("Find or remove duplicate central-store skills with numeric/version suffixes")
    .option("--apply", "move duplicate skills into dup_skills (or delete them with --delete)", false)
    .option("--delete", "when used with --apply, permanently delete duplicates instead of moving them", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill doctor dedup ", async () =>
        runRmdup(context, {
          apply: options.apply,
          delete: options.delete,
        }),
      );
    });
  doctor
    .command("sync")
    .description("Inspect and optionally repair agent-side projections; dry-run by default")
    .option("--apply", "repair broken projections and relink duplicate and matched entries", false)
    .option("--remove-suspicious", "when used with --apply, remove suspicious agent entries instead of only reporting them", false)
    .option("--global", "check global scope (default when no scope flag given)")
    .option("--project [dir]", "check project scope; uses cwd when dir is omitted")
    .option(
      "--agent <agent>",
      'repeat or use comma list; defaults to all agents detected at this scope; run "aweskill agent supported" to see supported ids',
      collectAgents,
    )
    .option("--verbose", "show all agent skill entries instead of a short preview", false)
    .action(async (options) => {
      const isProject = options.project !== undefined;
      const scope: Scope = isProject ? "project" : "global";
      const projectDir = isProject && typeof options.project === "string" ? options.project : undefined;
      await runFramedCommand(" aweskill doctor sync ", async () =>
        runSync(context, {
          apply: options.apply,
          removeSuspicious: options.removeSuspicious,
          scope,
          agents: options.agent ?? [],
          projectDir,
          verbose: options.verbose,
        }),
      );
    });

  configureCommandTree(program);
  return program;
}

export async function main(argv = process.argv) {
  const program = createProgram();
  try {
    const normalizedArgv = normalizeVersionAlias(argv);
    const context = createRuntimeContext();
    await assertStoreInitialized(context.homeDir, normalizedArgv.slice(2));
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

    console.error(`Error: ${formatCliErrorMessage(message)}`);
    process.exitCode = 1;
  }
}

if (isDirectCliEntry(import.meta.url, process.argv[1])) {
  void main();
}
