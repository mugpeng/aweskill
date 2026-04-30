export function formatTooManyArgumentsMessage(message: string, commandArgs: string[]): string | undefined {
  const match = message.match(/too many arguments(?: for '([^']+)')?\. Expected \d+ arguments? but got (\d+)\./i);
  if (!match) {
    return undefined;
  }

  const commandName = match[1];
  const commandIndex = commandName ? commandArgs.lastIndexOf(commandName) : -1;
  const fullCommand =
    commandIndex >= 0 ? `aweskill ${commandArgs.slice(0, commandIndex + 1).join(" ")}` : "This command";
  const extraArgs = (commandIndex >= 0 ? commandArgs.slice(commandIndex + 1) : commandArgs).filter(
    (arg) => !arg.startsWith("-"),
  );
  const label = extraArgs.length <= 1 ? "argument" : "arguments";
  const lines = [
    `Unexpected ${label}: ${extraArgs.length > 0 ? extraArgs.join(", ") : "input"}`,
    "",
    `\`${fullCommand}\` does not accept positional arguments.`,
  ];

  const helpLikeArgs = new Set(["h", "help"]);
  if (extraArgs.length === 1 && helpLikeArgs.has(extraArgs[0]!.toLowerCase())) {
    lines.push(`For help, use: ${fullCommand} -h`);
    return lines.join("\n");
  }

  if (commandName === "fix-skills" && extraArgs.length === 1) {
    lines.push(`To limit the check to one skill, use: ${fullCommand} --skill ${extraArgs[0]}`);
  }

  lines.push(`For help, use: ${fullCommand} -h`);
  return lines.join("\n");
}

export function formatCliErrorMessage(message: string, commandArgs: string[] = []): string {
  const excessMessage = formatTooManyArgumentsMessage(message, commandArgs);
  if (excessMessage) {
    return excessMessage;
  }

  const match = message.match(/missing required argument '([^']+)'/i);
  if (!match) {
    const optionMatch = message.match(/option '([^']+)' argument missing/i);
    if (optionMatch?.[1] === "--agent <agent>") {
      return 'Option --agent <agent> argument missing. Use one or more supported agent ids, for example "codex" or "codex,cursor". Run "aweskill agent supported" to see the supported agent list.';
    }
    const normalizedMessage = message.replace(/^error:\s*/i, "");
    const unknownCommandMatch = normalizedMessage.match(/^unknown command '([^']+)'$/i);
    if (unknownCommandMatch) {
      return `unknown command '${unknownCommandMatch[1]}'. Run "aweskill -h" for help.`;
    }
    const bundleFileMatch = normalizedMessage.match(
      /ENOENT: no such file or directory, open '([^']+\/(bundles|resources\/bundle_templates)\/([^/'"]+)\.ya?ml)'/i,
    );
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
