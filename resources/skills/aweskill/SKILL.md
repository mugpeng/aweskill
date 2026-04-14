---
name: aweskill
description: Operate the core aweskill CLI for routine store, bundle, and agent work inside the aweskill repository. Use when handling day-to-day tasks such as store init, where, scan, import, list, remove, bundle create or edit, bundle template import, basic agent projection, or normal inspection before any repair flow.
---

# Aweskill

Use `aweskill` CLI directly. Do not add wrapper scripts unless the CLI is missing a needed capability.

If `aweskill` is not installed, install it first:

```bash
npm install -g aweskill
```

## Core Boundary

Use this skill for routine commands:

- `store init`
- `store where`
- `store scan`
- `store import`
- `store list`
- `store remove`
- `bundle list`
- `bundle create`
- `bundle add`
- `bundle remove`
- `bundle show`
- `bundle template list`
- `bundle template import`
- `agent supported`
- `agent add`
- `agent remove`
- `agent list`

Escalate to `$aweskill-advanced` for low-frequency maintenance flows that need multi-command planning.

Escalate to `$aweskill-doctor` for diagnosis, hygiene cleanup, dedup, or sync repair.

## Default Workflow

Start by identifying whether task is about `store`, `bundle`, or `agent`.

Inspect before mutating:

1. Run read-only inspection command first.
2. Confirm scope: `--global` or `--project [dir]`.
3. Confirm target agent set with `--agent` when the command touches projections.
4. Run mutating command only after the current state is clear.

Prefer these inspection commands:

- `aweskill store where --verbose`
- `aweskill store list --verbose`
- `aweskill store scan --verbose`
- `aweskill bundle list --verbose`
- `aweskill bundle show <name>`
- `aweskill agent supported`
- `aweskill agent list --verbose`

## Routine Patterns

For importing existing skills into the central store:

1. Run `aweskill store scan` when source is agent-managed.
2. Run `aweskill store import --scan` for scanned agent roots.
3. Run `aweskill store import <path>` for a standalone skill or skills root.
4. Use `--link-source` only when source should become an aweskill-managed projection.
5. Use `--keep-source` when original source must stay untouched.

For bundle work:

1. Create bundle with `aweskill bundle create <name>`.
2. Add or remove skills with `aweskill bundle add` or `aweskill bundle remove`.
3. Inspect with `aweskill bundle show <name>` before projecting it.

For normal agent projection:

1. Use `aweskill agent add skill <name>` or `aweskill agent add bundle <name>`.
2. Use `--global` for global agent roots.
3. Use `--project [dir]` for repo-local roots.
4. Use `--agent <id>` to limit scope when task is not “all agents”.

For agent-side inspection:

1. Run `aweskill agent list`.
2. If output includes anything outside `linked`, switch to `$aweskill-doctor`.

## References

Read `references/common-flows.md` for common day-to-day command sequences.

Read `references/command-map.md` when you need a fast route from user intent to CLI command.
