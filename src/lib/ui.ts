import * as p from "@clack/prompts";
import pc from "picocolors";

const SUCCESS_PREFIXES = [
  "Created ",
  "Backed up ",
  "Imported ",
  "Enabled ",
  "Disabled ",
  "Initialized ",
  "Deleted ",
  "Removed ",
  "Recovered ",
  "Sync applied ",
] as const;

const HEADING_PREFIXES = ["Skills in central repo:", "Global skills for ", "Project skills for "] as const;

const HEADING_EXACT = new Set([
  "Scanned skills:",
  "Duplicate skill groups in central repo:",
  "Bundles:",
  "Supported agents:",
]);

const DIM_PREFIXES = [
  "linked:",
  "duplicate:",
  "matched:",
  "new:",
  "suspicious:",
  "No skills found ",
  "Showing first ",
  "... and ",
  "No duplicate skills found",
] as const;

function hasAnyPrefix(value: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function splitNameAndLocation(value: string): { name: string; location: string } {
  const firstSpace = value.indexOf(" ");
  if (firstSpace === -1) {
    return { name: value, location: "" };
  }
  return {
    name: value.slice(0, firstSpace),
    location: value.slice(firstSpace + 1),
  };
}

function renderNameAndLocation(
  indent: string,
  marker: string,
  colorizeMarker: (value: string) => string,
  value: string,
): void {
  const { name, location } = splitNameAndLocation(value);
  console.log(`${indent}${colorizeMarker(marker)} ${pc.cyan(name)}${location ? ` ${pc.dim(location)}` : ""}`);
}

function renderIndentedMarkerLine(line: string): boolean {
  if (!line.startsWith("    ")) {
    return false;
  }

  const marker = line.slice(4, 5);
  const markerColors: Record<string, (value: string) => string> = {
    "✓": pc.green,
    "!": pc.yellow,
    "~": pc.blue,
    "+": pc.cyan,
    "?": pc.red,
  };
  const colorizeMarker = markerColors[marker];
  if (!colorizeMarker || line.slice(5, 6) !== " ") {
    return false;
  }

  renderNameAndLocation("    ", marker, colorizeMarker, line.slice(6));
  return true;
}

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

  if (hasAnyPrefix(trimmed, SUCCESS_PREFIXES)) {
    p.log.success(trimmed);
    return;
  }

  if (HEADING_EXACT.has(trimmed) || hasAnyPrefix(trimmed, HEADING_PREFIXES)) {
    console.log(pc.bold(trimmed));
    return;
  }

  if (hasAnyPrefix(trimmed, DIM_PREFIXES)) {
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
    renderNameAndLocation("  ", "✓", pc.green, line.slice(4));
    return;
  }

  if (line.startsWith("✓ ")) {
    renderNameAndLocation("", "✓", pc.green, line.slice(2));
    return;
  }

  if (line.startsWith("x ")) {
    const rest = line.slice(2);
    console.log(`${pc.red("x")} ${pc.cyan(rest)}`);
    return;
  }

  if (line.startsWith("  ! ")) {
    renderNameAndLocation("  ", "!", pc.yellow, line.slice(4));
    return;
  }

  if (renderIndentedMarkerLine(line)) {
    return;
  }

  if (trimmed === "No bundles found.") {
    console.log(pc.dim(trimmed));
    return;
  }

  if (/^\d+\.\s/.test(trimmed)) {
    console.log(pc.bold(trimmed));
    return;
  }

  if (line.startsWith("   ")) {
    if (trimmed.startsWith("source: ")) {
      console.log(`   ${pc.dim(trimmed)}`);
      return;
    }

    console.log(`   ${trimmed}`);
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

export function writeCliRaw(message: string) {
  process.stdout.write(message);
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
