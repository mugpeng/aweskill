# aweskill

Local skill orchestration CLI for AI coding agents.

[中文说明](./README.zh-CN.md)

## What It Does

`aweskill` keeps a **single central skill store** under `~/.aweskill/skills/`, optional **bundle** definitions under `~/.aweskill/bundles/*.yaml`, and **projects skills into each agent’s skills directory** using `symlink` or `copy` (per agent). There is **no global activation file**: **enabled** means a managed symlink or copy exists at the expected path; **disabled** means it does not.

The CLI uses `commander`, `@clack/prompts`, and `picocolors` for terminal UX.

Layout:

- Central repository: `~/.aweskill/skills/`
- Duplicate holding area: `~/.aweskill/dup_skills/`
- Backup archive directory: `~/.aweskill/backup/`
- Bundle definitions: `~/.aweskill/bundles/*.yaml`
- Supported agents: `amp`, `claude-code`, `cline`, `codex`, `cursor`, `gemini-cli`, `goose`, `opencode`, `roo`, `windsurf`

`init` only creates the directory layout (`skills/`, `dup_skills/`, `bundles/`). It does **not** create or require `~/.aweskill/config.yaml`.

## Install

### Local install from this repository

```bash
npm install
npm run build
npm install -g .
```

Then verify:

```bash
aweskill --help
```

### Local development link

```bash
npm install
npm link
aweskill --help
```

### Packed tarball install

```bash
npm install
npm pack
npm install -g ./aweskill-0.1.2.tgz
```

(Replace the version in the filename with the one from `package.json` if it differs.)

## Quick Start

```bash
# 1. Initialize the aweskill home
aweskill init

# 2. Scan existing agent skill directories
aweskill scan

# 3. Import every skill from an existing skills root directory
aweskill import ~/.agents/skills

# 4. Import one local skill into the central repository
aweskill import /path/to/my-skill --mode cp

# 5. Create a bundle
aweskill bundle create frontend
aweskill bundle add-skill frontend my-skill

# 6. Enable it globally for Claude Code
aweskill enable bundle frontend --global --agent claude-code

# 7. Check current global agent skills
aweskill check
```

## Command Overview

| Command | Description |
| --- | --- |
| `aweskill init [--scan] [--verbose]` | Create `~/.aweskill` layout (`skills/`, `dup_skills/`, `bundles/`) and optional scan summary |
| `aweskill scan [--add] [--mode cp\|mv] [--override] [--verbose]` | Scan supported agent skill directories and optionally import them |
| `aweskill backup` | Create a timestamped `skills/` archive under `~/.aweskill/backup/` |
| `aweskill restore <archive> [--override]` | Restore `skills/` from an archive after auto-backing up the current state |
| `aweskill import <path> [--mode cp\|mv] [--override]` | Import one skill directory or one skills root directory into the central repo |
| `aweskill import --scan [--mode cp\|mv] [--override]` | Import scanned skills in batch |
| `aweskill remove <skill> [--force]` | Remove a skill from the central repo (checks bundles + managed projections unless `--force`) |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle show <name>` | Show bundle contents |
| `aweskill bundle add-template <name>` | Copy a built-in template bundle into `~/.aweskill/bundles/` |
| `aweskill bundle add-skill <bundle> <skill>` | Add an existing central-repo skill to a bundle |
| `aweskill bundle remove-skill <bundle> <skill>` | Remove a skill from a bundle |
| `aweskill bundle delete <name>` | Delete a bundle |
| `aweskill list skills [--verbose]` | List central skills with totals; defaults to a short preview |
| `aweskill list bundles [--verbose]` | List central bundles with totals; defaults to a short preview |
| `aweskill list bundles-template [--verbose]` | List built-in bundle templates under `template/bundles/` |
| `aweskill check [--global] [--project [dir]] [--agent <agent>] [--update] [--verbose]` | Inspect agent skill directories (`linked` / `duplicate` / `new`) and optionally normalize with `--update` |
| `aweskill rmdup [--remove] [--delete]` | Find duplicate central skills by numeric/version suffix; optionally move duplicates into `dup_skills/` or delete them |
| `aweskill recover [--global] [--project [dir]] [--agent <agent>]` | Replace aweskill-managed symlink projections with full copied directories |
| `aweskill enable bundle\|skill …` | Create projections (symlink or copy) under agent skills dirs; defaults to global scope and all detected agents; supports `all` |
| `aweskill disable bundle\|skill … [--force]` | Remove **aweskill-managed** projections only; supports `all`; see **Disable skill and bundles** below |
| `aweskill sync [--project <dir>]` | Remove stale managed projections whose central skill directory no longer exists |

## Command Examples

### `init`

```bash
# Create ~/.aweskill layout
aweskill init

# Create layout and immediately show a scan summary
aweskill init --scan
```

### `scan`

```bash
# Scan current project and global agent directories
aweskill scan

# Show every discovered skill instead of only per-agent totals
aweskill scan --verbose

# Scan and import in one step
aweskill scan --add
```

### `import`

```bash
# Import one skill by copying it into the central repo
aweskill import ~/Downloads/pr-review --mode cp

# Import all skills from a skills root directory
aweskill import ~/.agents/skills

# Overwrite existing central skills instead of only filling missing ones
aweskill import ~/.agents/skills --override
```

### `bundle`

```bash
# Create and inspect a bundle
aweskill bundle create backend
aweskill bundle show backend

# Add existing skills into a bundle
aweskill bundle add-skill backend api-design,db-schema

# Copy a built-in template bundle into ~/.aweskill/bundles
aweskill bundle add-template K-Dense-AI-scientific-skills
```

### `list`

```bash
# List central skills and bundles
aweskill list skills
aweskill list bundles

# Show all entries instead of the default preview
aweskill list skills --verbose
aweskill list bundles --verbose

# List built-in bundle templates
aweskill list bundles-template
```

### `enable`

```bash
# Enable one skill globally for all detected agents
aweskill enable skill biopython

# Enable multiple skills at once
aweskill enable skill biopython,scanpy --global --agent codex

# Enable a bundle globally for all detected agents
aweskill enable bundle backend --global --agent all
```

### `disable`

```bash
# Disable one skill in project scope
aweskill disable skill pr-review --project /path/to/repo --agent cursor

# Force-remove one skill even when bundle siblings are still enabled
aweskill disable skill my-skill --global --agent codex --force

# Remove all managed projections in one scope/agent selection
aweskill disable skill all --global --agent codex
```

### `check`

```bash
# Check one global agent directory
aweskill check --agent codex

# Show all entries instead of the default short preview
aweskill check --agent codex --verbose

# Check and normalize one project-scoped agent directory
aweskill check --project /path/to/repo --agent cursor --update
```

### `backup` and `restore`

```bash
# Create a timestamped backup of ~/.aweskill/skills
aweskill backup

# Restore from an archive after automatically backing up the current skills
aweskill restore ~/.aweskill/backup/skills-2026-04-12T19-20-00Z.tar.gz --override
```

### `rmdup`, `recover`, `sync`

```bash
# Find or remove duplicate central skills
aweskill rmdup
aweskill rmdup --remove

# Convert managed symlinks into full directories
aweskill recover

# Remove stale managed projections
aweskill sync
aweskill sync --project /path/to/repo
```

## Disable `skill` vs bundle

- **`disable bundle <name>`** expands the bundle to skill names and removes managed projections for each (same scope/agents as you pass).
- **`disable skill <name>`** removes only that skill’s projection. If that skill appears in a bundle and **another member of the same bundle is still projected** in the same scope and agent set, the command **fails** with a hint unless you pass **`--force`**. Use `--force` to drop only that skill, or use `disable bundle …` to remove the whole set.
- `enable skill all` enables every skill in `~/.aweskill/skills/`; `enable bundle all` enables the union of all bundle members.
- `aweskill enable <type> <name>` accepts `all` as `<name>`; the help text and missing-argument hint now mention it explicitly.
- `disable skill all` removes all managed skill projections in the selected scope/agents; `disable bundle all` removes the union of all bundle members.
- Batch-oriented commands also accept comma-separated names and treat them as a union, for example `enable skill biopython,scanpy` or `bundle add-template foo,bar`.

`enable bundle` is a one-time expansion: there is no stored “bundle activation” to edit later beyond what’s on disk.

## Bundle file format

Bundles are plain YAML under `~/.aweskill/bundles/<name>.yaml`:

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## Projection model

1. **Central source of truth for skill content**: `~/.aweskill/skills/<skill-name>/`.
2. **`enable`** creates, for each selected agent and scope:
   - a **symlink** to that directory (most agents), or
   - a **recursive copy** with a small marker file (e.g. Cursor).
3. **`disable`** removes only entries that are **managed by aweskill** (symlink pointing into the central repo, or copy directory with the aweskill marker). It will not delete arbitrary unmanaged directories without `--force` flows elsewhere (`check --update` has its own rules).
4. **`sync`** walks global home, optional `--project`, and the current working directory **if** `<cwd>/.aweskill.yaml` exists (marker file only—content is not read for activations), and removes managed projections whose central skill path is missing.

There is **no** reconcile pass driven by a global YAML activation list.

Import behavior:

- Default `scan --add` and batch `import` merge only missing files when the central skill already exists; `--override` overwrites.
- When the source is a symlink, aweskill copies from the resolved real path and may print a warning.
- Broken symlinks during batch import are reported; other items continue.
- `restore` automatically creates a fresh backup of the current `skills/` tree before applying the archive. By default it refuses to overwrite existing skill names; use `--override` to replace the current tree with the archive contents.

Display behavior:

- `list skills` shows totals and a short preview unless `--verbose`.
- `scan` shows per-agent totals by default; `--verbose` lists concrete scanned skills.
- `check` categorizes `linked` (managed), `duplicate` (central exists but not managed here), `new` (not in central); `--verbose` lists all; `--update` imports/links per its implementation and prints a summary.
- `rmdup` treats `name`, `name-2`, and `name-1.2.3` as one duplicate family, keeps the numerically largest versioned entry by default, and only modifies files when `--remove` is passed.

Projection examples:

```bash
# Global projection for one agent
aweskill enable skill biopython --global --agent codex

# Project-scoped projection for one agent
aweskill enable skill pr-review --project /path/to/repo --agent cursor

# Bundle expansion writes individual managed projections
aweskill enable bundle backend --global --agent codex
aweskill disable bundle backend --global --agent codex

# Convert symlink projections into copied directories
aweskill recover --global --agent codex
```

## Templates

Reference bundle templates live in [template/bundles/K-Dense-AI-scientific-skills.yaml](/Users/peng/Desktop/Project/aweskills/template/bundles/K-Dense-AI-scientific-skills.yaml). Runtime bundles still live under `~/.aweskill/bundles/`.

## Supported Agents

| Agent | Global Path | Project Path | Mode |
| --- | --- | --- | --- |
| `amp` | `~/.amp/skills/` | `<project>/.amp/skills/` | `symlink` |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` | `symlink` |
| `cline` | `~/.cline/skills/` | `<project>/.cline/skills/` | `symlink` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` | `symlink` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` | `copy` |
| `gemini-cli` | `~/.gemini/skills/` | `<project>/.gemini/skills/` | `symlink` |
| `goose` | `~/.goose/skills/` | `<project>/.goose/skills/` | `symlink` |
| `opencode` | `~/.opencode/skills/` | `<project>/.opencode/skills/` | `symlink` |
| `roo` | `~/.roo/skills/` | `<project>/.roo/skills/` | `symlink` |
| `windsurf` | `~/.windsurf/skills/` | `<project>/.windsurf/skills/` | `symlink` |

## Development

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## License

Mozilla Public License Version 2.0
