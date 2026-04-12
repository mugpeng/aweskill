# aweskill

Local skill orchestration CLI for AI coding agents.

[中文说明](./README.zh-CN.md)

## What It Does

`aweskill` manages a single central skill repository at `~/.aweskill`, stores bundle and activation config in YAML, and projects skills into agent directories with `symlink` or `copy`.

The current CLI keeps the existing `runXxx + RuntimeContext` application structure, but the terminal UX now follows the `aweskill_cc` style more closely with `@clack/prompts` and `picocolors`.

The current implementation follows `aweskill-cli-design-v3.1.md` as closely as possible for the MVP:

- Central repository: `~/.aweskill/skills/`
- Bundle definitions: `~/.aweskill/bundles/*.yaml`
- Global config: `~/.aweskill/config.yaml`
- Project config: `<project>/.aweskill.yaml`
- Supported agents: `amp`, `claude-code`, `cline`, `codex`, `cursor`, `gemini-cli`, `goose`, `opencode`, `roo`, `windsurf`

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
npm install -g ./aweskill-0.1.0.tgz
```

## Quick Start

```bash
# 1. Initialize the aweskill home
aweskill init

# 2. Add a local skill into the central repository
aweskill add /path/to/my-skill --mode cp

# 3. Create a bundle
aweskill bundle create frontend
aweskill bundle add-skill frontend my-skill

# 4. Enable it globally for Claude Code
aweskill enable bundle frontend --global --agent claude-code

# 5. Check current global agent skills
aweskill check
```

## Command Overview

| Command | Description |
| --- | --- |
| `aweskill init [--scan]` | Create `~/.aweskill` layout and optional scan |
| `aweskill scan [--add] [--mode cp|mv] [--override]` | Scan supported agent skill directories and optionally import them |
| `aweskill add <path> [--mode cp|mv] [--override]` | Import one skill directory or one skills root directory into the central repo |
| `aweskill add --scan [--mode cp|mv] [--override]` | Import scanned skills in batch |
| `aweskill remove <skill> [--force]` | Remove a skill, with reference checks by default |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle show <name>` | Show bundle contents |
| `aweskill bundle add-skill <bundle> <skill>` | Add an existing central-repo skill to a bundle |
| `aweskill bundle remove-skill <bundle> <skill>` | Remove a skill from a bundle |
| `aweskill bundle delete <name>` | Delete a bundle |
| `aweskill list skills [--verbose]` | List central skills with totals; defaults to a short preview |
| `aweskill list bundles` | List bundles |
| `aweskill check [--global] [--project [dir]] [--agent <agent>] [--update] [--verbose]` | Inspect selected agent skill directories with per-category totals and optionally normalize them against the central repo |
| `aweskill enable bundle|skill ...` | Add an activation and reconcile; defaults to `--global --agent all` |
| `aweskill disable bundle|skill ...` | Remove an activation and reconcile; defaults to `--global --agent all` |
| `aweskill sync [--project <dir>]` | Recompute global scope plus known projects and repair derived projections |

## Examples

```bash
# Import a skill by copying it into the central repo
aweskill add ~/Downloads/pr-review --mode cp

# Import all skills from a skills root directory
aweskill add ~/.agents/skills

# Scan current project and global agent directories
aweskill scan

# Scan and import in one step
aweskill scan --add

# Overwrite existing files instead of only merging missing ones
aweskill scan --add --override

# Create a backend bundle
aweskill bundle create backend
aweskill bundle add-skill backend api-design
aweskill bundle add-skill backend db-schema

# Enable a single skill in project scope
aweskill enable skill pr-review --project /path/to/repo --agent cursor

# Enable a skill everywhere for all agents
aweskill enable skill biopython

# Enable a bundle globally for all detected agents
aweskill enable bundle backend --global --agent all

# Check one global agent directory
aweskill check --agent codex

# Show all entries instead of the default short preview
aweskill check --agent codex --verbose

# Check and normalize one project-scoped agent directory
aweskill check --project /path/to/repo --agent cursor --update

# Check one project-scoped agent directory without changing anything
aweskill check --project /path/to/repo --agent cursor

# Disable project-scoped activation
aweskill disable skill pr-review --project /path/to/repo --agent cursor

# Repair projections
aweskill sync --project /path/to/repo
```

## Configuration

### Global config

```yaml
version: 1

activations:
  - type: bundle
    name: backend
    agents: [claude-code, codex]
    scope: global

projects:
  - path: /Users/peng/work/frontend-app
    match: exact
    activations:
      - type: bundle
        name: frontend
        agents: [claude-code, cursor]
```

### Project config

```yaml
version: 1

activations:
  - type: skill
    name: pr-review
    agents: [cursor]
```

### Bundle file

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## Projection Model

`aweskill` treats agent directories as derived state.

1. Load global activations
2. Load matching project rules from `config.yaml`
3. Load project `.aweskill.yaml`
4. Expand bundles into skills
5. Compute `(skill × agent × target-dir)`
6. Create or remove `symlink` / `copy`

This is why `enable`, `disable`, and `sync` all reconcile instead of mutating agent directories directly.

Import behavior:

- default `scan --add` and `add --scan` merge only missing files when the central skill already exists
- `--override` overwrites existing files
- when the source is a symlink, aweskill copies from the resolved real source and prints a warning with both paths
- if a scanned symlink is broken, batch import reports an error for that skill, continues importing others, and prints a final missing-source count

Display behavior:

- `list skills` shows the total number of central skills and, by default, only a short preview of the first few entries
- `check` shows per-category totals for `linked`, `duplicate`, and `new`, and also defaults to a short preview of each category
- use `--verbose` on `list skills` or `check` to show every entry
- `check --update` ends with a summary of updated and skipped entries

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

## Status Against v3.1

The current repo satisfies the core MVP path from the design doc:

- central skill repository
- bundle CRUD
- global and project activation config
- exact/prefix/glob project matching
- reconcile-driven projection
- scan/import/remove flows
- installable CLI package with `aweskill` binary
- automated tests for storage, reconcile, and command flows

Current sync behavior:

- always reconciles global scope
- reconciles the explicit `--project` if provided
- reconciles the current working directory if it has `.aweskill.yaml`
- reconciles `exact` project rules declared in global config when those project directories exist
- does not attempt to enumerate every possible `prefix` or `glob` match automatically

## Development

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## License

MIT
