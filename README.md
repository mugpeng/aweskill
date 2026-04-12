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

`store init` only creates the directory layout (`skills/`, `dup_skills/`, `bundles/`). It does **not** create or require `~/.aweskill/config.yaml`.

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
aweskill store init

# 2. Scan existing agent skill directories
aweskill skill scan

# 3. Import every skill from an existing skills root directory
aweskill skill import ~/.agents/skills

# aweskill skill import --scan

# 4. Import one local skill into the central store
aweskill skill import /path/to/my-skill --mode cp

# 5. Create a bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 6. Enable it globally for Claude Code
aweskill agent add bundle frontend --global --agent claude-code

# 7. Check current global agent skills
aweskill agent list
```

## Command Overview

| Command | Description |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | Create `~/.aweskill` layout (`skills/`, `dup_skills/`, `backup/`, `bundles/`) and optional scan summary |
| `aweskill store backup` | Create a timestamped `skills/` archive under `~/.aweskill/backup/` |
| `aweskill store restore <archive> [--override]` | Restore `skills/` from an archive after auto-backing up the current state |
| `aweskill skill list [--verbose]` | List central skills with totals; defaults to a short preview |
| `aweskill skill scan [--verbose]` | Scan supported agent skill directories and show discovered skills |
| `aweskill skill import <path> [--mode cp\|mv] [--override]` | Import one skill directory or one skills root directory into the central store |
| `aweskill skill import --scan [--mode cp\|mv] [--override]` | Import the current scan results in batch |
| `aweskill skill remove <skill> [--force]` | Remove a skill from the central store (checks bundles + managed projections unless `--force`) |
| `aweskill bundle list [--verbose]` | List central bundles with totals; defaults to a short preview |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle show <name>` | Show bundle contents |
| `aweskill bundle add <bundle> <skill>` | Add an existing central-store skill to a bundle |
| `aweskill bundle remove <bundle> <skill>` | Remove a skill from a bundle |
| `aweskill bundle delete <name>` | Delete a bundle |
| `aweskill bundle template list [--verbose]` | List built-in bundle templates under `template/bundles/` |
| `aweskill bundle template import <name>` | Copy a built-in template bundle into `~/.aweskill/bundles/` |
| `aweskill agent supported` | List supported agent ids and display names |
| `aweskill agent list [--global] [--project [dir]] [--agent <agent>] [--update] [--verbose]` | Inspect agent skill directories (`linked` / `duplicate` / `new`) and optionally normalize with `--update` |
| `aweskill agent add bundle\|skill …` | Create projections (symlink or copy) under agent skills dirs; defaults to global scope and all detected agents; supports `all` |
| `aweskill agent remove bundle\|skill … [--force]` | Remove **aweskill-managed** projections only; supports `all`; see **Agent remove and bundles** below |
| `aweskill agent sync [--project <dir>]` | Remove stale managed projections whose central skill directory no longer exists |
| `aweskill agent recover [--global] [--project [dir]] [--agent <agent>]` | Replace aweskill-managed symlink projections with full copied directories |
| `aweskill doctor dedupe [--fix] [--delete]` | Find duplicate central skills by numeric/version suffix; optionally move duplicates into `dup_skills/` or delete them |

## Command Examples

### `store`

```bash
# Create ~/.aweskill layout
aweskill store init

# Create layout and immediately show a scan summary
aweskill store init --scan

# Create a timestamped backup of ~/.aweskill/skills
aweskill store backup

# Restore from an archive after automatically backing up the current skills
aweskill store restore ~/.aweskill/backup/skills-2026-04-12T19-20-00Z.tar.gz --override
```

### `skill`

```bash
# Scan current project and global agent directories
aweskill skill scan

# Show every discovered skill instead of only per-agent totals
aweskill skill scan --verbose

# Import one skill by copying it into the central repo
aweskill skill import ~/Downloads/pr-review --mode cp

# Import all skills from a skills root directory
aweskill skill import ~/.agents/skills

# Import the current scan results
aweskill skill import --scan

# List central skills
aweskill skill list --verbose
```

### `bundle`

```bash
# Create and inspect a bundle
aweskill bundle create backend
aweskill bundle show backend

# Add existing skills into a bundle
aweskill bundle add backend api-design,db-schema

# Copy a built-in template bundle into ~/.aweskill/bundles
aweskill bundle template import K-Dense-AI-scientific-skills

# List bundles and built-in templates
aweskill bundle list --verbose
aweskill bundle template list
```

### `agent`

```bash
# List supported agents
aweskill agent supported

# Enable one skill globally for all detected agents
aweskill agent add skill biopython

# Enable multiple skills at once
aweskill agent add skill biopython,scanpy --global --agent codex

# Enable a bundle globally for all detected agents
aweskill agent add bundle backend --global --agent all

# Force-remove one skill even when bundle siblings are still enabled
aweskill agent remove skill my-skill --global --agent codex --force

# Remove all managed projections in one scope/agent selection
aweskill agent remove skill all --global --agent codex

# Show all entries instead of the default short preview
aweskill agent list --agent codex --verbose

# Check and normalize one project-scoped agent directory
aweskill agent list --project /path/to/repo --agent cursor --update

# Remove stale managed projections or recover symlinks into copies
aweskill agent sync
aweskill agent recover --global --agent codex
```

### `doctor`

```bash
# Find or remove duplicate central skills
aweskill doctor dedupe
aweskill doctor dedupe --fix
aweskill doctor dedupe --fix --delete
```

## `agent remove skill` vs bundle

- **`agent remove bundle <name>`** expands the bundle to skill names and removes managed projections for each (same scope/agents as you pass).
- **`agent remove skill <name>`** removes only that skill’s projection. If that skill appears in a bundle and **another member of the same bundle is still projected** in the same scope and agent set, the command **fails** with a hint unless you pass **`--force`**. Use `--force` to drop only that skill, or use `agent remove bundle …` to remove the whole set.
- `agent add skill all` enables every skill in `~/.aweskill/skills/`; `agent add bundle all` enables the union of all bundle members.
- `aweskill agent add <type> <name>` accepts `all` as `<name>`; the help text and missing-argument hint mention it explicitly.
- `agent remove skill all` removes all managed skill projections in the selected scope/agents; `agent remove bundle all` removes the union of all bundle members.
- Batch-oriented commands also accept comma-separated names and treat them as a union, for example `agent add skill biopython,scanpy` or `bundle template import foo,bar`.

`agent add bundle` is a one-time expansion: there is no stored “bundle activation” to edit later beyond what’s on disk.

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
2. **`agent add`** creates, for each selected agent and scope:
   - a **symlink** to that directory (most agents), or
   - a **recursive copy** with a small marker file (e.g. Cursor).
3. **`agent remove`** removes only entries that are **managed by aweskill** (symlink pointing into the central repo, or copy directory with the aweskill marker). It will not delete arbitrary unmanaged directories without `--force` flows elsewhere (`agent list --update` has its own rules).
4. **`agent sync`** walks global home, optional `--project`, and the current working directory **if** `<cwd>/.aweskill.yaml` exists (marker file only—content is not read for activations), and removes managed projections whose central skill path is missing.

There is **no** reconcile pass driven by a global YAML activation list.

Import behavior:

- Default `skill import --scan` and batch `skill import` merge only missing files when the central skill already exists; `--override` overwrites.
- When the source is a symlink, aweskill copies from the resolved real path and may print a warning.
- Broken symlinks during batch import are reported; other items continue.
- `restore` automatically creates a fresh backup of the current `skills/` tree before applying the archive. By default it refuses to overwrite existing skill names; use `--override` to replace the current tree with the archive contents.

Display behavior:

- `skill list` shows totals and a short preview unless `--verbose`.
- `skill scan` shows per-agent totals by default; `--verbose` lists concrete scanned skills.
- `agent list` categorizes `linked` (managed), `duplicate` (central exists but not managed here), `new` (not in central); `--verbose` lists all; `--update` imports/links per its implementation and prints a summary.
- `doctor dedupe` treats `name`, `name-2`, and `name-1.2.3` as one duplicate family, keeps the numerically largest versioned entry by default, and only modifies files when `--fix` is passed.

Projection examples:

```bash
# Global projection for one agent
aweskill agent add skill biopython --global --agent codex

# Project-scoped projection for one agent
aweskill agent add skill pr-review --project /path/to/repo --agent cursor

# Bundle expansion writes individual managed projections
aweskill agent add bundle backend --global --agent codex
aweskill agent remove bundle backend --global --agent codex

# Convert symlink projections into copied directories
aweskill agent recover --global --agent codex
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
