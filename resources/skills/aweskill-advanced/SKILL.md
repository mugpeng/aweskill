---
name: aweskill-advanced
description: Handle low-frequency but important aweskill maintenance workflows that still use the native CLI directly. Use when tasks involve bundle templates, cross-agent projection strategy, global versus project scope choices, recover flows, or multi-command store and agent maintenance that goes beyond routine daily operations.
---

# Aweskill Advanced

Use this skill for complex but non-diagnostic aweskill work. Keep using native `aweskill` commands. Do not add wrapper scripts unless the CLI cannot express the workflow.

## Core Boundary

Use this skill when routine commands are not enough because task needs planning across:

- `store import --scan` with scope and agent filters
- `bundle template list`
- `bundle template import`
- `agent add` or `agent remove` across multiple agents or scopes
- `agent recover`
- migration between direct skill projection and bundle-driven projection

Do not use this skill for hygiene cleanup or repair-first work. Escalate those to `$aweskill-doctor`.

## Working Rules

Inspect before mutating:

1. Identify canonical source of truth in central store.
2. Inspect current agent-side state with `agent list`.
3. Choose one scope at a time unless user explicitly wants multi-scope changes.
4. Prefer reversible operations before destructive ones.

Prefer command composition over improvisation. Use small sequences of existing CLI commands instead of inventing new abstractions.

## Typical Advanced Flows

For bundle template workflows:

1. Run `aweskill bundle template list --verbose`.
2. Import template with `aweskill bundle template import <name>`.
3. Inspect result with `aweskill bundle show <name>`.
4. Adjust membership with `bundle add` or `bundle remove` if needed.

For projection strategy work:

1. Decide whether target should be `--global` or `--project [dir]`.
2. Run `aweskill agent supported` if agent ids are uncertain.
3. Use `aweskill agent list` before projecting.
4. Use `aweskill agent add` or `aweskill agent remove` with explicit `--agent`.
5. Re-run `aweskill agent list --verbose` to verify result.

For recover flows:

1. Confirm task really needs copied directories instead of managed links.
2. Run `aweskill agent recover --global|--project [dir] --agent <id>`.
3. Re-run `aweskill agent list --verbose` to confirm final state.

## References

Read `references/projection-flows.md` for multi-agent and scope-sensitive projection work.

Read `references/bundle-flows.md` for bundle template and bundle-maintenance flows.
