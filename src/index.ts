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

function formatCliErrorMessage(message: string): string {
  const match = message.match(/missing required argument '([^']+)'/i);
  if (!match) {
    const optionMatch = message.match(/option '([^']+)' argument missing/i);
    if (optionMatch?.[1] === "--agent <agent>") {
      return "Option --agent <agent> argument missing. Use one or more supported agent ids, for example \"codex\" or \"codex,cursor\". Run \"aweskill agent supported\" to see the supported agent list.";
    }
    const normalizedMessage = message.replace(/^error:\s*/i, "");
    const bundleFileMatch = normalizedMessage.match(/ENOENT: no such file or directory, open '([^']+\/bundles\/([^/'"]+)\.ya?ml)'/i);
    if (bundleFileMatch) {
      const bundleName = bundleFileMatch[2]!;
      if (bundleFileMatch[1]?.includes("/template/bundles/")) {
        return `Bundle template not found: ${bundleName}. Run "aweskill bundle template list" to see available bundle templates.`;
      }
      return `Bundle not found: ${bundleName}. Run "aweskill bundle list" to see available bundles.`;
    }
    const unknownSkillMatch = normalizedMessage.match(/^Unknown skill: (.+)$/);
    if (unknownSkillMatch) {
      return `Unknown skill: ${unknownSkillMatch[1]}. Run "aweskill skill list" to see available skills.`;
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

function writeSupportedAgents(context: RuntimeContext): void {
  const lines = [
    "Supported agents:",
    "amp (Amp)",
    "claude-code (Claude Code)",
    "cline (Cline)",
    "codex (Codex)",
    "cursor (Cursor)",
    "gemini-cli (Gemini CLI)",
    "goose (Goose)",
    "opencode (OpenCode)",
    "roo (Roo Code)",
    "windsurf (Windsurf)",
  ];
  for (const line of lines) {
    context.write(line);
  }
}

function configureCommandTree(command: Command): void {
  command.showHelpAfterError();
  command.exitOverride((error) => {
    throw new Error(formatCliErrorMessage(error.message));
  });

  for (const child of command.commands) {
    configureCommandTree(child);
  }
}


export function createProgram(overrides: Partial<RuntimeContext> = {}) {
  const context = createRuntimeContext(overrides);
  const program = new Command();

  program
    .name("aweskill")
    .description("Local skill orchestration CLI for AI agents")
    .version("0.1.5")
    .helpOption("-h, --help", "Display help");

  const skill = program.command("skill").description("Manage skills in the central store");
  skill
    .command("list")
    .description("List skills in the central store")
    .option("--verbose", "show all skills instead of a short preview", false)
    .action(async (options) => {
      await runListSkills(context, { verbose: options.verbose });
    });
  skill
    .command("scan")
    .description("Scan supported agent skill directories")
    .option("--verbose", "show scanned skill details instead of per-agent totals", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill skill scan ", async () =>
        runScan(context, {
          verbose: options.verbose,
        }),
      );
    });
  skill
    .command("import")
    .argument("[path]")
    .description("Import one skill or a skills root directory")
    .option("--scan", "import scanned skills", false)
    .option("--mode <mode>", "import mode: cp (default) or mv", getMode, "cp")
    .option("--override", "overwrite existing files when importing", false)
    .action(async (sourcePath, options) => {
      await runFramedCommand(" aweskill skill import ", async () =>
        runImport(context, {
          sourcePath,
          scan: options.scan,
          mode: options.mode,
          override: options.override,
        }),
      );
    });
  skill
    .command("remove")
    .argument("<skill>")
    .description("Remove a skill from the central store")
    .option("--force", "remove and clean references", false)
    .option("--project <dir>", "project config to inspect")
    .action(async (skillName, options) => {
      await runFramedCommand(" aweskill skill remove ", async () =>
        runRemove(context, {
          skillName,
          force: options.force,
          projectDir: options.project,
        }),
      );
    });

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
    writeSupportedAgents(context);
  });
  agent
    .command("list")
    .description("Inspect agent skill directories and optionally normalize them")
    .option("--global", "check global scope (default when no scope flag given)")
    .option("--project [dir]", "check project scope; uses cwd when dir is omitted")
    .option("--agent <agent>", 'repeat or use comma list; defaults to all; run "aweskill agent supported" to see supported ids', collectAgents)
    .option("--update", "import missing skills into the central store and relink duplicates/new skills", false)
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
          update: options.update,
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
      "with skill: remove projection even when this skill is in a bundle that still has other members enabled here",
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
    .command("sync")
    .description("Remove stale managed projections whose source skill no longer exists")
    .option("--project <dir>", "also check this project directory")
    .action(async (options) => {
      await runFramedCommand(" aweskill agent sync ", async () => runSync(context, { projectDir: options.project }));
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
    .command("backup")
    .description("Create a timestamped archive of the central skills repository")
    .action(async () => {
      await runFramedCommand(" aweskill store backup ", async () => runBackup(context));
    });
  store
    .command("restore")
    .argument("<archive>")
    .description("Restore skills from a backup archive and auto-back up the current skills first")
    .option("--override", "replace existing skills with the archive contents", false)
    .action(async (archivePath, options) => {
      await runFramedCommand(" aweskill store restore ", async () =>
        runRestore(context, {
          archivePath,
          override: options.override,
        }),
      );
    });

  const doctor = program.command("doctor").description("Diagnose and repair repository issues");
  doctor
    .command("dedupe")
    .description("Find or remove duplicate central-store skills with numeric/version suffixes")
    .option("--fix", "move duplicate skills into dup_skills (or delete them with --delete)", false)
    .option("--delete", "when used with --fix, permanently delete duplicates instead of moving them", false)
    .action(async (options) => {
      await runFramedCommand(" aweskill doctor dedupe ", async () =>
        runRmdup(context, {
          remove: options.fix,
          delete: options.delete,
        }),
      );
    });

  configureCommandTree(program);
  return program;
}

export async function main(argv = process.argv) {
  const program = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
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
