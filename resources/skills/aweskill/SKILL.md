---
name: aweskill
description: "Use when managing aweskill store, bundle, and agent workflows that are not repair-first: routine commands, bundle template work, multi-agent or multi-scope projection planning, recover flows, skill migration, install/remove/configure tasks. 中文触发词：技能管理、导入技能、投影技能、启用/禁用技能、安装/移除技能、bundle、agent、aweskill、高级技能管理、recover、技能迁移。"
---

# Aweskill

Use `aweskill` CLI directly. Do not add wrapper scripts unless the CLI is missing a needed capability.

## Intent Router

Match the user's intent to a task domain, then follow the workflow below.

| User intent | Domain | First command |
|---|---|---|
| "Find a skill for X", "search skills", "install from GitHub" | Source Lifecycle | `aweskill find <query>` |
| "Import my local skills", "what's in the store", "remove a skill from the store" | Store Work | `aweskill store list --verbose` |
| "Create a bundle", "add skills to a bundle", "show bundle contents" | Bundle Work | `aweskill bundle list --verbose` |
| "Give Codex skill X", "project a bundle to Cursor", "remove a projection" | Projection Work | `aweskill agent list --verbose` |
| "Update aweskill itself", "upgrade the CLI" | Self-Update | `aweskill self-update --check` |
| "Something is broken", "skill not showing up", "duplicate skills" | Escalate | Hand off to `$aweskill-doctor` |

## First-Time Setup

If `aweskill` is not installed or the store is not initialized, run the full bootstrap:

1. Install the CLI: `npm install -g aweskill`
2. Initialize the central store: `aweskill store init`
3. Confirm the store location: `aweskill store where --verbose`
4. Project built-in skills to the current agent: `aweskill agent add skill aweskill,aweskill-doctor --global --agent <current-agent-id>`
5. Verify: `aweskill agent list --global --agent <current-agent-id>` — both skills should show as `linked`
6. Tell the user to restart the agent so the new skills become available.

If `aweskill` is already installed but the store is not initialized, start from step 2.
If the store is initialized but skills are not projected, start from step 4.

## Core Rules

Inspect before mutating:

1. Run a read-only inspection command first.
2. Confirm scope: `--global` or `--project [dir]`.
3. Confirm target agent with `--agent` when the command touches projections.
4. Run the mutating command only after the current state is clear.
5. Re-run inspection after mutation to verify the result.

For complex changes, also decide:

- Whether the source of truth should remain the central store, a bundle, or an existing agent root.
- Whether the task is single-scope or truly needs both `--global` and `--project`.
- Whether the task is single-agent or should be applied agent-by-agent with explicit `--agent`.

## Workflows

### Source Lifecycle

Use when the task is about searching upstream sources, installing tracked skills, or refreshing them.

```bash
# Search upstream providers
aweskill find <query>

# Search the local central store only
aweskill find <query> --local

# Install from GitHub, local path, or sciskill ID
aweskill install <source>

# Install one skill from a multi-skill source
aweskill install <source> --skill <name>

# Check tracked skills for updates
aweskill update --check

# Refresh tracked skills
aweskill update [skill...]
```

Decision order:

1. `find` when the source is not yet known.
2. `install` when the source is known and the skill should enter the central store.
3. `update --check` when the user wants visibility before change.
4. `update` when the skill is already tracked and should be refreshed.

### Store Work

Use when the task is about existing local skills that need to be brought into or managed inside the central store.

```bash
# See what's in the central store
aweskill store list --verbose

# Inspect one managed skill
aweskill store show <skill>

# Import a standalone skill or skills root
aweskill store import <path>

# Import scanned agent roots
aweskill store import --scan

# Remove a skill from the central store
aweskill store remove <skill>
```

Use `--link-source` only when source should become an aweskill-managed projection.
Use `--keep-source` when original source must stay untouched.

### Self-Update

Use when the task is about updating the aweskill CLI tool itself.

```bash
# Check current vs latest npm version
aweskill self-update --check

# Update from npm registry (stable)
aweskill self-update

# Check latest dev branch commit
aweskill self-update --dev --check

# Build and install from GitHub dev branch
aweskill self-update --dev
```

### Bundle Work

Use when the task is about organizing reusable skill sets before projecting them into agents.

```bash
# See bundles
aweskill bundle list --verbose

# Create a bundle
aweskill bundle create <name>

# Add or remove skills
aweskill bundle add <bundle> <skills>
aweskill bundle remove <bundle> <skills>

# Inspect a bundle
aweskill bundle show <name>

# Import a built-in bundle template
aweskill bundle template import <name>
```

### Projection Work

Use when the task is about applying central-store skills or bundles into agent roots.

```bash
# See supported agents
aweskill agent supported

# Inspect projected agent state
aweskill agent list [--global|--project [dir]] [--agent <id>] --verbose

# Project a skill or bundle
aweskill agent add skill <name> --global --agent <id>
aweskill agent add bundle <name> --project [dir] --agent <id>

# Remove a managed projection
aweskill agent remove skill <name> --global --agent <id>

# Recover one agent root into copied directories
aweskill agent recover --global --agent <id>
```

For scope-sensitive or multi-agent projection:

1. Decide whether target should be `--global` or `--project [dir]`.
2. Run `aweskill agent supported` if agent IDs are uncertain.
3. Use `aweskill agent list` before projecting.
4. Apply changes one scope at a time unless the user explicitly wants multi-scope rollout.
5. Re-run `aweskill agent list --verbose` to verify the result.

## Escalation to Doctor

Hand off to `$aweskill-doctor` when:

- `aweskill agent list` shows `broken`, `duplicate`, `matched`, `new`, or `suspicious`
- The user asks to repair, clean, deduplicate, or sync aweskill state
- Projection state does not match the central store and the task is diagnosis-first

## References

- `references/common-flows.md` — common day-to-day command sequences
- `references/command-map.md` — fast route from user intent to CLI command
