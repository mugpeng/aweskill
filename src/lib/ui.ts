import * as p from "@clack/prompts";
import pc from "picocolors";

function emitMessage(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return;
  }

  if (trimmed.startsWith("Warning: ")) {
    p.log.warn(trimmed.slice("Warning: ".length));
    return;
  }

  if (trimmed.startsWith("Error: ")) {
    p.log.error(trimmed.slice("Error: ".length));
    return;
  }

  if (
    trimmed.startsWith("Created ")
    || trimmed.startsWith("Backed up ")
    || trimmed.startsWith("Imported ")
    || trimmed.startsWith("Enabled ")
    || trimmed.startsWith("Disabled ")
    || trimmed.startsWith("Initialized ")
    || trimmed.startsWith("Deleted ")
    || trimmed.startsWith("Removed ")
    || trimmed.startsWith("Recovered ")
    || trimmed.startsWith("Sync applied ")
  ) {
    p.log.success(trimmed);
    return;
  }

  if (
    trimmed.startsWith("Skills in central repo:")
    || trimmed === "Scanned skills:"
    || trimmed === "Duplicate skill groups in central repo:"
    || trimmed === "Bundles:"
    || trimmed.startsWith("Global skills for ")
    || trimmed.startsWith("Project skills for ")
  ) {
    console.log(pc.bold(trimmed));
    return;
  }

  if (trimmed.startsWith("linked:") || trimmed.startsWith("duplicate:") || trimmed.startsWith("new:") || trimmed.startsWith("suspicious:")) {
    console.log(pc.dim(trimmed));
    return;
  }

  if (trimmed.startsWith("No duplicate skills found")) {
    console.log(pc.dim(trimmed));
    return;
  }

  if (line.startsWith("  Global scanned skills for ") || line.startsWith("  Project scanned skills for ")) {
    console.log(pc.dim(line.trim()));
    return;
  }

  if (line.startsWith("    keep: ") || line.startsWith("    drop: ")) {
    const [label, ...rest] = line.trim().split(" ");
    const marker = label === "keep:" ? pc.green("keep:") : pc.yellow("drop:");
    console.log(`    ${marker} ${rest.join(" ")}`);
    return;
  }

  if (line.startsWith("  ✓ ")) {
    const rest = line.slice(4);
    const firstSpace = rest.indexOf(" ");
    if (firstSpace === -1) {
      console.log(`  ${pc.green("✓")} ${pc.cyan(rest)}`);
      return;
    }

    const name = rest.slice(0, firstSpace);
    const location = rest.slice(firstSpace + 1);
    console.log(`  ${pc.green("✓")} ${pc.cyan(name)} ${pc.dim(location)}`);
    return;
  }

  if (line.startsWith("  ! ")) {
    const rest = line.slice(4);
    const firstSpace = rest.indexOf(" ");
    if (firstSpace === -1) {
      console.log(`  ${pc.yellow("!")} ${pc.cyan(rest)}`);
      return;
    }

    const name = rest.slice(0, firstSpace);
    const location = rest.slice(firstSpace + 1);
    console.log(`  ${pc.yellow("!")} ${pc.cyan(name)} ${pc.dim(location)}`);
    return;
  }

  if (line.startsWith("    ✓ ") || line.startsWith("    ! ") || line.startsWith("    + ") || line.startsWith("    ? ")) {
    const marker = line.slice(4, 5);
    const rest = line.slice(6);
    const firstSpace = rest.indexOf(" ");
    const name = firstSpace === -1 ? rest : rest.slice(0, firstSpace);
    const location = firstSpace === -1 ? "" : rest.slice(firstSpace + 1);
    const coloredMarker = marker === "✓" ? pc.green("✓") : marker === "!" ? pc.yellow("!") : marker === "?" ? pc.red("?") : pc.cyan("+");
    console.log(`    ${coloredMarker} ${pc.cyan(name)}${location ? ` ${pc.dim(location)}` : ""}`);
    return;
  }

  if (
    trimmed.startsWith("No skills found ")
    || trimmed === "No bundles found."
    || trimmed.startsWith("Showing first ")
    || trimmed.startsWith("... and ")
  ) {
    console.log(pc.dim(trimmed));
    return;
  }

  p.log.message(trimmed, { symbol: pc.cyan("•") });
}

export function commandTitle(title: string): string {
  return pc.bgCyan(pc.black(` ${title} `));
}

export function writeCliMessage(message: string) {
  for (const line of message.split("\n")) {
    emitMessage(line);
  }
}

export function writeCliError(message: string) {
  for (const line of message.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    p.log.error(line.replace(/^Error:\s*/, ""));
  }
}

export function introCommand(title: string) {
  p.intro(commandTitle(title));
}

export function outroCommand(message = pc.green("Done.")) {
  p.outro(message);
}
