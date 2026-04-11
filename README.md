# aweskill

Local skill orchestration CLI for AI coding agents.

[中文说明](./README.zh-CN.md)

## What It Does

`aweskill` manages a single central skill repository at `~/.aweskill`, stores bundle and activation config in YAML, and projects skills into agent directories with `symlink` or `copy`.

The current implementation follows `aweskill-cli-design-v3.1.md` as closely as possible for the MVP:

- Central repository: `~/.aweskill/skills/`
- Bundle definitions: `~/.aweskill/bundles/*.yaml`
- Global config: `~/.aweskill/config.yaml`
- Project config: `<project>/.aweskill.yaml`
- Supported agents: `claude-code`, `codex`, `cursor`

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
aweskill enable bundle frontend --scope global --agent claude-code

# 5. Inspect projected status
aweskill list status
```

## Command Overview

| Command | Description |
| --- | --- |
| `aweskill init [--scan]` | Create `~/.aweskill` layout and optional scan |
| `aweskill scan` | Scan supported agent skill directories |
| `aweskill add <path> --mode symlink|mv|cp` | Import a single skill into the central repo |
| `aweskill add --scan --mode symlink|mv|cp` | Import scanned skills in batch |
| `aweskill remove <skill> [--force]` | Remove a skill, with reference checks by default |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle show <name>` | Show bundle contents |
| `aweskill bundle add-skill <bundle> <skill>` | Add a skill to a bundle |
| `aweskill bundle remove-skill <bundle> <skill>` | Remove a skill from a bundle |
| `aweskill list skills` | List skills in the central repo |
| `aweskill list bundles` | List bundles |
| `aweskill list status [--project <dir>]` | Show computed projection status |
| `aweskill enable bundle|skill ...` | Add an activation and reconcile |
| `aweskill disable bundle|skill ...` | Remove an activation and reconcile |
| `aweskill sync [--project <dir>]` | Recompute and repair derived projections |

## Examples

```bash
# Import a skill by copying it into the central repo
aweskill add ~/Downloads/pr-review --mode cp

# Scan current project and global agent directories
aweskill scan

# Create a backend bundle
aweskill bundle create backend
aweskill bundle add-skill backend api-design
aweskill bundle add-skill backend db-schema

# Enable a single skill in project scope
aweskill enable skill pr-review --scope project --project /path/to/repo --agent cursor

# Enable a bundle globally for all detected agents
aweskill enable bundle backend --scope global --agent all

# Disable project-scoped activation
aweskill disable skill pr-review --scope project --project /path/to/repo --agent cursor

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

## Supported Agents

| Agent | Global Path | Project Path | Mode |
| --- | --- | --- | --- |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` | `symlink` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` | `symlink` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` | `copy` |

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

Known MVP limitation:

- `sync` reliably reconciles global scope plus the current or explicitly provided project, but it does not yet walk every historical project path declared in global config and repair them all in one pass.

## Development

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## License

MIT
