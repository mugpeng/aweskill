<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill: One Skill Store for All Your Coding Agents</h1>
  <p><strong>Skill orchestration for finding, downloading, updating, and projecting skills across AI coding agents.</strong></p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.2.5-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="./README.zh-CN.md"><img src="https://img.shields.io/badge/README-%E4%B8%AD%E6%96%87-64748B?style=flat-square" alt="Chinese README"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-beta-c96a3d?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/agents-47_supported-0ea5a4?style=flat-square" alt="Supported agents">
    <img src="https://img.shields.io/badge/projection-symlink-1f2328?style=flat-square" alt="Projection mode">
		<img src="https://img.shields.io/badge/OS-windows%20%26%20macOS-0078D4?style=flat-square" alt="Windows and macOS">
    <img src="https://img.shields.io/npm/dt/aweskill?style=flat-square" alt="npm downloads">
    <img src="https://img.shields.io/github/stars/mugpeng/aweskill?style=flat-square" alt="GitHub stars">
    <img src="https://img.shields.io/badge/platform-local%20CLI-334155?style=flat-square" alt="Local CLI">
  </p>
</div>


`aweskill` is a local skill orchestration CLI for finding, downloading, updating, bundling, and projecting skills across AI coding agents.

Instead of copying the same skill folders into every tool by hand, `aweskill` keeps a single source of truth in `~/.aweskill/skills/` and projects those skills into agent-specific directories with `symlink` or `copy`, depending on the target agent.

## Find -> Download -> Update

`aweskill` now combines local orchestration with the full source-aware skill lifecycle:

- **Find** skills across [skills.sh](https://skills.sh/) and [sciskillhub.org](https://sciskillhub.org/) with one command
- **Download** skills from GitHub-style sources, local paths, or `sciskill:<skill-id>` identifiers into the central store
- **Update** tracked installs from their recorded sources while protecting local central-store edits
- **Project** the same managed skills into Codex, Claude Code, Cursor, Gemini CLI, and other agents

## Why aweskill

- **One central store** for all your local skills
- **Bundle-based organization** for reusable skill sets
- **Multi-agent projection** across Codex, Claude Code, Cursor, Gemini CLI, and more
- **Find, download, and update loop** for discovering skills across providers, importing them into the store, and refreshing tracked installs later
- **Managed enable/disable model** without a separate global activation file
- **Backup, restore, dedup, and recovery** built into the CLI

## Install

### Install from npm (recommended)

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
npm install -g aweskill
aweskill --help
```

To pin a specific release:

```bash
npm install -g aweskill@0.2.5
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
npm install -g ./aweskill-<version>.tgz
```

## Quick Start

```bash
# 1. Initialize the aweskill home
aweskill store init

# 2. Show where the aweskill store lives
aweskill store where --verbose

# 3. Find a skill across supported providers
aweskill find protein

# 4. Download a discovered skill into the central store
aweskill download sciskill:open-source/research/lifesciences-proteomics

# 5. Check tracked installs for source updates
aweskill update --check

# 6. Scan existing agent skill directories
aweskill store scan

# 7. Scan and import discovered agent skills into the central store
aweskill store scan --import

# 8. Import a skills root or a single skill
aweskill store import ~/.agents/skills
# aweskill store import /path/to/my-skill --link-source

# 9. Create a bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 10. Enable the bundle for one agent
aweskill agent add bundle frontend --global --agent claude-code

# 11. Inspect current projected skills
aweskill agent list
```

## Windows

`aweskill` now supports Windows as a native platform.

- Requires Node.js 20 or later
- PowerShell is recommended for the examples below
- On Windows, agent projections prefer directory junctions and fall back to managed copies when links are unavailable
- `store backup` and `store restore` no longer require a system `tar` binary

Example:

```powershell
aweskill store init
aweskill store scan
aweskill agent add bundle frontend --global --agent codex
```

If you run into Windows-specific path or projection issues, please open an issue with your shell, Node version, and target agent.

## Core Model

`aweskill` keeps one central skill store in `~/.aweskill/skills/`, groups reusable skills through bundles, and projects selected skills into each agent's own skill directory. That projected filesystem state is the activation model.

## What It Supports

Supported agents currently include:

`adal`, `amp`, `antigravity`, `augment`, `bob`, `claude-code`, `cline`, `codebuddy`, `command-code`, `continue`, `codex`, `copilot`, `cortex`, `crush`, `cursor`, `deepagents`, `droid`, `firebender`, `gemini-cli`, `github-copilot`, `goose`, `iflow-cli`, `junie`, `kilo`, `kilo-code`, `kimi-cli`, `kiro-cli`, `kode`, `mcpjam`, `mistral-vibe`, `mux`, `neovate`, `openclaw`, `openclaude-ide`, `openhands`, `opencode`, `pi`, `pochi`, `qoder`, `qwen-code`, `replit`, `roo`, `trae`, `trae-cn`, `warp`, `windsurf`, `zencoder`

Key directories:

- Central store: `~/.aweskill/skills/`
- Duplicate holding area: `~/.aweskill/dup_skills/`
- Backup archive: `~/.aweskill/backup/`
- Bundles: `~/.aweskill/bundles/*.yaml`
- Built-in skills: `resources/skills/aweskill/`, `resources/skills/aweskill-doctor/`

Discovery and download sources:

- [skills.sh](https://skills.sh/) is used as a community discovery source and may return directly downloadable GitHub-style sources or discover-only entries that point you to the upstream skills.sh page
- [sciskillhub.org](https://sciskillhub.org/) is used as a scientific and technical skill registry and provides downloadable `sciskill:<skill-id>` sources
- `aweskill find` searches both by default, merges results by normalized name, and lets `--limit` apply per provider before merge and dedupe
- `aweskill store download` currently accepts local paths, GitHub sources, and `sciskill:<skill-id>` identifiers

## Common Workflows

### Import skills into the central store

```bash
# Import skills from an existing agent-managed skills directory
aweskill store import ~/.agents/skills

# Import a standalone skill folder and keep the original directory unchanged
aweskill store import ~/Downloads/pr-review

# Import a standalone skill folder and replace the source with an aweskill-managed projection
aweskill store import ~/Downloads/pr-review --link-source

# Import a standalone skill folder and track it for future store update runs
aweskill store import ~/Downloads/pr-review --track-source

# Import scanned agent skills and relink their source paths by default
aweskill store scan --import

# Import scanned agent skills but keep the original agent directories unchanged
aweskill store scan --import --keep-source
```

### Find, download, and update tracked skills

```bash
# Search both skills.sh and sciskillhub.org
aweskill find protein

# Search one provider only
aweskill find protein --provider sciskill

# Download a skill from a GitHub-style source discovered via skills.sh
aweskill store download owner/repo

# Download a scientific skill from sciskillhub.org
aweskill store download sciskill:open-source/research/lifesciences-proteomics

# Check tracked installs for updates without changing files
aweskill store update --check

# Refresh one tracked skill from its recorded source
aweskill store update lifesciences-proteomics
```

### Build reusable bundles

```bash
# Create a reusable bundle
aweskill bundle create backend

# Add multiple skills into the bundle
aweskill bundle add backend api-design,db-schema

# Inspect what the bundle contains
aweskill bundle show backend
```

### Project skills into agents

```bash
# Project one skill into detected global agent directories
aweskill agent add skill biopython

# Project multiple skills into one specific global agent directory
aweskill agent add skill biopython,scanpy --global --agent codex

# Project a whole bundle into every detected global agent directory
aweskill agent add bundle backend --global --agent all

# Turn managed symlinks back into full directories
aweskill agent recover --global --agent codex
```

### Keep the store clean

```bash
# Inspect the central store layout and entry counts
aweskill store where --verbose

# Create a backup archive of the current store
aweskill store backup

# Restore a backup archive into the current store
aweskill store restore ~/Downloads/aweskill-backup.tar.gz

# Inspect agent entries and categories
aweskill agent list

# Remove suspicious entries from the central store
aweskill doctor clean

# Move duplicate central-store skills into dup_skills
aweskill doctor dedup --apply

# Inspect repair actions for one agent
aweskill doctor sync --global --agent codex

# Repair broken / duplicate / matched agent entries for one agent
aweskill doctor sync --global --agent codex --apply

# Remove suspicious agent entries only when explicitly requested
aweskill doctor sync --global --agent codex --apply --remove-suspicious
```

All `doctor` commands default to dry-run. Add `--apply` to make real changes.

## Command Surface

Core commands: `store init`, `store where`, `store import`, `bundle create`, `agent add`, `doctor clean`

Top-level convenience commands are available for high-frequency search and tracked-source flows: `aweskill find`, `aweskill download`, and `aweskill update`.

<details>
<summary>All commands</summary>

| Command | Description |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | Create the `~/.aweskill` layout |
| `aweskill store where [--verbose]` | Show the `~/.aweskill` location and summarize core store directories |
| `aweskill store backup [archive] [--skills-only]` | Archive the central store; by default includes both skills and bundles |
| `aweskill store restore <archive> [--override] [--skills-only]` | Restore from a backup archive or unpacked backup directory |
| `aweskill store scan [--global\|--project [dir]] [--agent <agent>] [--import] [--keep-source] [--override] [--verbose]` | Scan supported agent skill directories for a chosen scope and agent set; add `--import` to immediately import scan results into the central store |
| `aweskill store import <path> [--keep-source\|--link-source] [--track-source] [--override]` | Import a skill or an entire skills root; external paths keep their source by default, and `--track-source` records explicit local imports for future `store update` runs |
| `aweskill store import --scan [--global\|--project [dir]] [--agent <agent>] [--keep-source\|--link-source] [--override]` | Import the current scan results for a chosen scope and agent set; scanned agent paths link back to aweskill by default |
| `aweskill store find <query> [--provider <skills-sh\|sciskill>] [--limit <n>] [--domain <domain>] [--stage <stage>]` | Search skills across `skills.sh` and `sciskill`, merge results by name, and print either a directly downloadable `source` or a discover-only result with an explanatory note and details URL |
| `aweskill store download <source> [--list] [--skill <name>] [--all] [--ref <ref>] [--as <name>] [--override]` | Download skills from a local path, GitHub source, or `sciskill:<skill-id>` into the central store and record them for future `store update` runs |
| `aweskill store update [skill...] [--check] [--dry-run] [--source <source>] [--override]` | Check or refresh tracked skills from their recorded source while treating the central store copy as the protected local state |
| `aweskill store list [--verbose]` | List skills in the central store |
| `aweskill store remove <skill> [--force]` | Remove one skill from the central store and clean any tracked lock entry for that skill |
| `aweskill bundle list [--verbose]` | List central bundles |
| `aweskill bundle create <name>` | Create a bundle |
| `aweskill bundle add <bundle> <skill>` | Add one or more skills to a bundle |
| `aweskill bundle remove <bundle> <skill>` | Remove one or more skills from a bundle |
| `aweskill bundle show <name>` | Inspect bundle contents |
| `aweskill bundle template list [--verbose]` | List built-in bundle templates |
| `aweskill bundle template import <name>` | Copy a built-in template bundle into the store |
| `aweskill agent supported` | List all supported agent ids, mark global install status with `✓` / `x`, and show detected global skills paths |
| `aweskill agent add bundle\|skill ...` | Project managed skills into agent directories |
| `aweskill agent remove bundle\|skill ... [--force]` | Remove managed projections |
| `aweskill agent list [--global\|--project [dir]] [--agent <agent>] [--verbose]` | Read-only dry-run view of `doctor sync`: inspect `linked`, `broken`, `duplicate`, `matched`, `new`, and `suspicious` entries; when `--agent` is omitted, print the detected agent set for that scope before the grouped results |
| `aweskill agent recover` | Convert managed symlinks into full directories |
| `aweskill doctor sync [--apply] [--remove-suspicious] [--global\|--project [dir]] [--agent <agent>] [--verbose]` | Dry-run by default; add `--apply` to repair broken entries and relink duplicate / matched ones, and `--apply --remove-suspicious` to also remove suspicious ones; when `--agent` is omitted, print the detected agent set for that scope first |
| `aweskill doctor clean [--apply] [--skills-only] [--bundles-only] [--verbose]` | Find suspicious non-store entries, grouped by `skills` and `bundles`, and optionally remove them |
| `aweskill doctor dedup [--apply] [--delete]` | Find duplicate skills and optionally move or delete them |

</details>

`aweskill find` prefers to print `source` values that `aweskill store download` can use directly. When a provider returns a discover-only source such as `smithery.ai`, the result still appears, but `aweskill` marks it as unsupported for direct download and tells you to visit the matching `skills.sh` page so you can inspect the upstream installation instructions there. When searching both providers at once, `--limit` applies per provider before merge and dedupe.

## Built-in Skills

`aweskill` ships two meta-skills that teach AI agents how to run aweskill commands directly.

```bash
aweskill store import resources/skills/aweskill
aweskill store import resources/skills/aweskill-doctor
```

See [docs/DESIGN.md](docs/DESIGN.md) for skill directory structure and design principles.

## Contributing

If you want to contribute, see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

For command-model and filesystem design constraints, see [docs/DESIGN.md](docs/DESIGN.md).

That file now covers:

- development workflow and testing expectations

`docs/DESIGN.md` covers:

- design tradeoffs
- bundle file format
- projection model
- built-in skill structure and design principles

Documentation, tests, and small focused improvements are all welcome.

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

- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager): a desktop application for managing skills across multiple AI coding assistants, with synchronization and GUI-driven organization.
- [skillfish](https://github.com/knoxgraeme/skillfish): a CLI-first skill manager focused on installing, updating, and syncing skills across agents.
- [vercel-labs/skills](https://github.com/vercel-labs/skills): a widely adopted open agent-skills CLI and ecosystem entry point built around reusable `SKILL.md` packages.
- [cc-switch](https://github.com/farion1231/cc-switch): a desktop all-in-one manager for Claude Code, Codex, Gemini CLI, OpenCode, and related local AI tooling.

## Development

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for setup, testing, and code style. See [docs/DESIGN.md](docs/DESIGN.md) for design principles and command semantics.

## License

This project is licensed under [MPL-2.0](./LICENSE).
