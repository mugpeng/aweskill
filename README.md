<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill: One Skill Store for All Your Coding Agents</h1>
  <p><strong>Local skill orchestration CLI for AI coding agents.</strong></p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.1.8-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-64748B?style=flat-square" alt="Chinese README"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-beta-c96a3d?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/agents-47_supported-0ea5a4?style=flat-square" alt="Supported agents">
    <img src="https://img.shields.io/badge/projection-symlink-1f2328?style=flat-square" alt="Projection mode">
    <img src="https://img.shields.io/badge/platform-local%20CLI-334155?style=flat-square" alt="Local CLI">
  </p>
</div>

`aweskill` is a local CLI for managing, bundling, and projecting skills across AI coding agents.

Instead of copying the same skill folders into every tool by hand, `aweskill` keeps a single source of truth in `~/.aweskill/skills/` and projects those skills into agent-specific directories with `symlink` or `copy`, depending on the target agent.

## Why aweskill

- **One central store** for all your local skills
- **Bundle-based organization** for reusable skill sets
- **Multi-agent projection** across Codex, Claude Code, Cursor, Gemini CLI, and more
- **Managed enable/disable model** without a separate global activation file
- **Backup, restore, dedupe, and recovery** built into the CLI

## Install

### Install from npm (recommended)

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
npm install -g aweskill
aweskill --help
```

To pin a specific release:

```bash
npm install -g aweskill@0.1.8
```

Package page: [npmjs.com/package/aweskill](https://www.npmjs.com/package/aweskill)

### Install from this repository

```bash
npm install
npm run build
npm install -g .
```

### Local development link

```bash
npm install
npm link
aweskill --help
```

### Install from packed tarball

```bash
npm install
npm pack
npm install -g ./aweskill-0.1.8.tgz
```

## Quick Start

```bash
# 1. Initialize the aweskill home
aweskill store init

# 2. Scan existing agent skill directories
aweskill skill scan

# 3. Import a skills root or a single skill
aweskill skill import ~/.agents/skills
# aweskill skill import /path/to/my-skill --mode cp

# 4. Create a bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 5. Enable the bundle for one agent
aweskill agent add bundle frontend --global --agent claude-code

# 6. Inspect current projected skills
aweskill agent list
```

## Core Model

`aweskill` follows a simple projection model:

1. Skills live in one central repository: `~/.aweskill/skills/<skill-name>/`
2. Bundles are plain YAML files in `~/.aweskill/bundles/<bundle>.yaml`
3. `agent add` projects selected skills into each agent's skills directory

That projection is the activation model.

- If a managed symlink exists, the skill is enabled
- If it does not exist, the skill is disabled
- There is no separate global activation registry to reconcile

## What It Supports

Supported agents currently include:

`adal`, `amp`, `antigravity`, `augment`, `bob`, `claude-code`, `cline`, `codebuddy`, `command-code`, `continue`, `codex`, `copilot`, `cortex`, `crush`, `cursor`, `deepagents`, `droid`, `firebender`, `gemini-cli`, `github-copilot`, `goose`, `iflow-cli`, `junie`, `kilo`, `kilo-code`, `kimi-cli`, `kiro-cli`, `kode`, `mcpjam`, `mistral-vibe`, `mux`, `neovate`, `openclaw`, `openclaude-ide`, `openhands`, `opencode`, `pi`, `pochi`, `qoder`, `qwen-code`, `replit`, `roo`, `trae`, `trae-cn`, `warp`, `windsurf`, `zencoder`

Key directories:

- Central store: `~/.aweskill/skills/`
- Duplicate holding area: `~/.aweskill/dup_skills/`
- Backup archive: `~/.aweskill/backup/`
- Bundles: `~/.aweskill/bundles/*.yaml`
- Repo resources: `resources/bundle_templates/` and `resources/skill_archives/`

## Common Workflows

### Import skills into the central store

```bash
aweskill skill import ~/.agents/skills
aweskill skill import ~/Downloads/pr-review --mode cp
aweskill skill import --scan
```

### Build reusable bundles

```bash
aweskill bundle create backend
aweskill bundle add backend api-design,db-schema
aweskill bundle show backend
```

### Project skills into agents

```bash
aweskill agent add skill biopython
aweskill agent add skill biopython,scanpy --global --agent codex
aweskill agent add bundle backend --global --agent all
```

### Keep the store clean

```bash
aweskill store backup --both
aweskill agent sync
aweskill agent recover --global --agent codex
aweskill doctor dedupe --fix
```

By default, `store backup` and `store restore` only operate on `skills/`. Add `--both` to include `bundles/`, and pass an optional archive path to `store backup` if you want to export to a specific location.

## Command Surface

| Command | Description |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | Create the `~/.aweskill` layout |
| `aweskill store backup [archive] [--both]` | Archive the central skill store, optionally to a specific path |
| `aweskill store restore <archive> [--override] [--both]` | Restore a previous backup |
| `aweskill skill scan [--verbose]` | Scan supported agent skill directories |
| `aweskill skill import <path> [--mode cp\|mv] [--override]` | Import a skill or an entire skills root |
| `aweskill skill import --scan [--mode cp\|mv] [--override]` | Import the current scan results |
| `aweskill skill list [--verbose]` | List skills in the central store |
| `aweskill skill remove <skill> [--force]` | Remove one skill from the central store |
| `aweskill bundle list [--verbose]` | List central bundles |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle add <bundle> <skill>` | Add one or more skills to a bundle |
| `aweskill bundle remove <bundle> <skill>` | Remove one or more skills from a bundle |
| `aweskill bundle show <name>` | Inspect bundle contents |
| `aweskill bundle template list [--verbose]` | List built-in bundle templates |
| `aweskill bundle template import <name>` | Copy a built-in template bundle into the store |
| `aweskill agent supported` | List supported agent ids and display names |
| `aweskill agent add bundle\|skill ...` | Project managed skills into agent directories |
| `aweskill agent remove bundle\|skill ... [--force]` | Remove managed projections |
| `aweskill agent list [...]` | Inspect linked, duplicate, and new entries |
| `aweskill agent sync` | Remove stale managed projections |
| `aweskill agent recover` | Convert managed symlinks into full directories |
| `aweskill doctor dedupe [--fix] [--delete]` | Find and optionally clean duplicate skills |

## Design Choices

### No global activation file

`aweskill` treats the projected filesystem state as the truth. This keeps the model simple and avoids a second layer of activation metadata drifting out of sync.

### Bundles are expansion sets

`agent add bundle <name>` expands the bundle into skill names and projects those skills. There is no separate long-lived "bundle activation" object after projection.

### Managed-only removal

`aweskill` removes only entries it can identify as its own managed symlinks. It does not blindly delete arbitrary skill directories.

## Bundle File Format

Bundles are plain YAML under `~/.aweskill/bundles/<name>.yaml`:

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## Projection Model

1. **Central source of truth for skill content**: `~/.aweskill/skills/<skill-name>/`.
2. **`agent add`** creates, for each selected agent and supported scope, a **symlink** to that directory.
3. **`agent remove`** removes only entries that are **managed by aweskill**.
4. **`agent sync`** removes managed projections whose central skill path is missing.

There is **no** reconcile pass driven by a global YAML activation list.

Import behavior:

- Default `skill import --scan` and batch `skill import` merge only missing files when the central skill already exists; `--override` overwrites.
- When the source is a symlink, aweskill copies from the resolved real path and may print a warning.
- Broken symlinks during batch import are reported; other items continue.
- `restore` automatically creates a fresh backup of the current `skills/` tree before applying the archive.

Display behavior:

- `skill list` shows totals and a short preview unless `--verbose`.
- `skill scan` shows per-agent totals by default; `--verbose` lists concrete scanned skills.
- `agent list` categorizes `linked`, `duplicate`, and `new`; `--update` imports and relinks where needed.
- `doctor dedupe` treats `name`, `name-2`, and `name-1.2.3` as one duplicate family and only modifies files when `--fix` is passed.

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

## Templates And Archives

Reference bundle templates now live in [resources/bundle_templates/K-Dense-AI-scientific-skills.yaml](/Users/peng/Desktop/Project/aweskills/resources/bundle_templates/K-Dense-AI-scientific-skills.yaml). Runtime bundles still live under `~/.aweskill/bundles/`.

`resources/skill_archives/` is reserved for repository-level `tar.gz` backups that you want to keep in-tree and share with other users. `aweskill` does not generate or restore these archives automatically.

For a shareable archive collection maintained outside this repository, see [oh-my-skills](https://github.com/mugpeng/oh-my-skills), a separate backup repository for skill bundles and full-snapshot archives.

## Supported Agents

Works with 47 agents including:

**Claude Code** · **Cursor** · **Windsurf** · **Codex** · **GitHub Copilot** · **Gemini CLI** · **OpenCode** · **Goose** · **Amp** · **Roo Code** · **Kiro CLI** · **Kilo Code** · **Trae** · **Cline** · **Antigravity** · **Droid** · **Augment** · **OpenClaw** · **CodeBuddy** · **Command Code** · **Crush** · **Kode** · **Mistral Vibe** · **Mux** · **OpenClaude IDE** · **OpenHands** · **Qoder** · **Qwen Code** · **Replit** · **Trae CN** · **Neovate** · **AdaL**

<details>
<summary>All supported agents</summary>

| Agent | Global Path | Project Path |
| --- | --- | --- |
| `adal` | `~/.adal/skills/` | `<project>/.adal/skills/` |
| `amp` | `~/.agents/skills/` | `<project>/.agents/skills/` |
| `antigravity` | `~/.gemini/antigravity/skills/` | `<project>/.gemini/antigravity/skills/` |
| `augment` | `~/.augment/skills/` | `<project>/.augment/skills/` |
| `bob` | `~/.bob/skills/` | `<project>/.bob/skills/` |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` |
| `cline` | `~/.cline/skills/` | `<project>/.cline/skills/` |
| `codebuddy` | `~/.codebuddy/skills/` | `<project>/.codebuddy/skills/` |
| `command-code` | `~/.commandcode/skills/` | `<project>/.commandcode/skills/` |
| `continue` | `~/.continue/skills/` | `<project>/.continue/skills/` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` |
| `copilot` | `~/.copilot/skills/` | `<project>/.copilot/skills/` |
| `cortex` | `~/.snowflake/cortex/skills/` | `<project>/.cortex/skills/` |
| `crush` | `~/.config/crush/skills/` | `<project>/.config/crush/skills/` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` |
| `deepagents` | `~/.deepagents/agent/skills/` | `<project>/.deepagents/agent/skills/` |
| `droid` | `~/.factory/skills/` | `<project>/.factory/skills/` |
| `firebender` | `~/.firebender/skills/` | `<project>/.firebender/skills/` |
| `gemini-cli` | `~/.gemini/skills/` | `<project>/.gemini/skills/` |
| `github-copilot` | `~/.copilot/skills/` | `<project>/.copilot/skills/` |
| `goose` | `~/.goose/skills/` | `<project>/.goose/skills/` |
| `iflow-cli` | `~/.iflow/skills/` | `<project>/.iflow/skills/` |
| `junie` | `~/.junie/skills/` | `<project>/.junie/skills/` |
| `kilo` | `~/.kilocode/skills/` | `<project>/.kilocode/skills/` |
| `kiro-cli` | `~/.kiro/skills/` | `<project>/.kiro/skills/` |
| `kilo-code` | `~/.kilocode/skills/` | `<project>/.kilocode/skills/` |
| `kimi-cli` | `~/.kimi/skills/` | `<project>/.kimi/skills/` |
| `kode` | `~/.kode/skills/` | `<project>/.kode/skills/` |
| `mcpjam` | `~/.mcpjam/skills/` | `<project>/.mcpjam/skills/` |
| `mistral-vibe` | `~/.vibe/skills/` | `<project>/.vibe/skills/` |
| `mux` | `~/.mux/skills/` | `<project>/.mux/skills/` |
| `neovate` | `~/.neovate/skills/` | `<project>/.neovate/skills/` |
| `openclaw` | `~/.openclaw/skills/` | `<project>/.openclaw/skills/` |
| `openclaude-ide` | `~/.openclaude/skills/` | `<project>/.openclaude/skills/` |
| `openhands` | `~/.openhands/skills/` | `<project>/.openhands/skills/` |
| `opencode` | `~/.opencode/skills/` | `<project>/.opencode/skills/` |
| `pi` | `~/.pi/agent/skills/` | `<project>/.pi/agent/skills/` |
| `pochi` | `~/.pochi/skills/` | `<project>/.pochi/skills/` |
| `qoder` | `~/.qoder/skills/` | `<project>/.qoder/skills/` |
| `qwen-code` | `~/.qwen/skills/` | `<project>/.qwen/skills/` |
| `replit` | `-` | `<project>/.agent/skills/` |
| `roo` | `~/.roo/skills/` | `<project>/.roo/skills/` |
| `trae` | `~/.trae/skills/` | `<project>/.trae/skills/` |
| `trae-cn` | `~/.trae-cn/skills/` | `<project>/.trae-cn/skills/` |
| `warp` | `~/.warp/skills/` | `<project>/.warp/skills/` |
| `windsurf` | `~/.codeium/windsurf/skills/` | `<project>/.codeium/windsurf/skills/` |
| `zencoder` | `~/.zencoder/skills/` | `<project>/.zencoder/skills/` |

</details>

## Related Tools

If you are exploring the broader skills ecosystem, these projects are worth using and studying:

- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager): a desktop application for managing skills across multiple AI coding assistants, with synchronization and GUI-driven organization.
- [skillfish](https://github.com/knoxgraeme/skillfish): a CLI-first skill manager focused on installing, updating, and syncing skills across agents.
- [vercel-labs/skills](https://github.com/vercel-labs/skills): a widely adopted open agent-skills CLI and ecosystem entry point built around reusable `SKILL.md` packages.
- [cc-switch](https://github.com/farion1231/cc-switch): a desktop all-in-one manager for Claude Code, Codex, Gemini CLI, OpenCode, and related local AI tooling.

`aweskill` references and learns from all four of these projects. They helped clarify different parts of the design space:

- desktop-first multi-tool management
- CLI-first skill installation and synchronization
- open skill ecosystem conventions
- cross-agent local developer workflow tooling

## Development

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## License

This project is licensed under [MPL-2.0](./LICENSE).
