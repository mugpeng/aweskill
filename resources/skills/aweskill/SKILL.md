---
name: aweskill
description: "Use when managing aweskill store, bundle, and agent workflows that are not repair-first: routine commands, bundle template work, multi-agent or multi-scope projection planning, recover flows, skill migration, install/remove/configure tasks. 中文触发词：技能管理、导入技能、投影技能、启用/禁用技能、安装/移除技能、bundle、agent、aweskill、高级技能管理、recover、技能迁移。"
---

# Aweskill

Use `aweskill` CLI directly. Do not add wrapper scripts unless the CLI is missing a needed capability.

If `aweskill` is not installed, install it first:

```bash
npm install -g aweskill
```

## Core Boundary

Use this skill for normal and strategy-oriented aweskill commands that are not repair-first. This is the default entry point for routine aweskill work across the central store, source-aware installs, bundles, and agent projection.

Use this skill for:

- `store init`
- `store where`
- `store show`
- `find`
- `install`
- `update`
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
- `agent recover`

Do not use this skill for broken projection repair, dedup cleanup, suspicious entry cleanup, or sync diagnosis. Escalate those to `$aweskill-doctor`.

## Task Router

Classify the task before choosing commands:

- `Store Work`: initialize the central store, inspect it, scan agent roots, import local skills, list contents, or remove managed skills.
- `Source Lifecycle`: search upstream providers, install from GitHub-style sources or local paths, inspect tracked update availability, or refresh tracked skills.
- `Bundle Work`: create bundles, edit membership, inspect bundles, or import bundle templates.
- `Projection Work`: project skills or bundles into agent roots, remove projections, inspect agent state, or recover copied agent roots.

Use these routing hints:

- User mentions `find`, `search`, `discover`, `skills.sh`, `sciskill`, GitHub source, install from source, or update from source -> `Source Lifecycle`
- User mentions `bundle` or `template` -> `Bundle Work`
- User mentions `agent`, `codex`, `cursor`, `claude-code`, `gemini-cli`, `--global`, `--project`, add/remove skill projections, or recover agent roots -> `Projection Work`
- User mentions `scan`, `import`, local skill folders, central store contents, or removing managed skills from the store -> `Store Work`

## Global Execution Rules

Start by identifying the task domain first, then inspect before mutating.

Inspect before mutating:

1. Run read-only inspection command first.
2. Confirm scope: `--global` or `--project [dir]`.
3. Confirm target agent set with `--agent` when the command touches projections.
4. Run mutating command only after the current state is clear.

For complex changes, also decide:

1. Whether the source of truth should remain the central store, a bundle, or an existing agent root.
2. Whether the task is single-scope or truly needs both `--global` and `--project`.
3. Whether the task is single-agent or should be applied agent-by-agent with explicit `--agent`.
4. Whether a reversible managed link is preferable to copied recovery output.

Prefer these inspection commands:

- `aweskill store where --verbose`
- `aweskill store show <skill>`
- `aweskill find <query>`
- `aweskill store list --verbose`
- `aweskill store scan --verbose`
- `aweskill bundle list --verbose`
- `aweskill bundle show <name>`
- `aweskill agent supported`
- `aweskill agent list --verbose`

Re-run inspection after mutating when the task changes store contents, bundle membership, or agent projections.

## Workflow Sections

### Store Work

Use this path when the task is about existing local skills that need to be brought into or managed inside the central store.

For importing existing skills into the central store:

1. Run `aweskill store scan` when source is agent-managed.
2. Run `aweskill store import --scan` for scanned agent roots.
3. Run `aweskill store import <path>` for a standalone skill or skills root.
4. Use `--link-source` only when source should become an aweskill-managed projection.
5. Use `--keep-source` when original source must stay untouched.
6. If import planning depends on agent filters or cross-scope deployment, inspect with `agent list --verbose` first and then apply one scope at a time.

For general store management:

1. Run `aweskill store where --verbose` to confirm central-store paths.
2. Run `aweskill store show <skill>` when the task is about one managed skill's summary, raw `SKILL.md`, or resolved path.
3. Run `aweskill store list --verbose` before removing or reorganizing managed skills.
4. Use `aweskill store remove <skill>` only after confirming the skill is no longer needed in the central store.

### Source Lifecycle

Use this path when the task is about searching upstream skill sources, installing tracked skills, or refreshing them later from their recorded sources.

For source-aware skill discovery and tracked updates:

1. Run `aweskill find <query>` to search supported providers.
2. Use `aweskill find <query> --local` or `--provider local` when the task is to inspect the local central store instead of remote providers.
3. Remember `--domain` and `--stage` are sciskill-only filters. They must exactly match the published enum values, and `--provider skills-sh` rejects them directly.
4. Prefer `aweskill install <source>` or `aweskill store install <source>` for skills discovered from GitHub-style sources, local paths, or `sciskill:<skill-id>`.
5. Use `--skill <name>` or `--all` when a source contains multiple skills.
6. Run `aweskill update --check` before mutating when the task is “see what can be refreshed”.
7. Run `aweskill update [skill...]` only for skills already tracked in the central store.
8. Use `--override` only when replacing local central-store edits is intended.

Prefer this decision order:

1. `find` when the source is not yet known.
2. `install` when the source is known and the skill should enter the central store.
3. `update --check` when the user wants visibility before change.
4. `update` when the skill is already tracked and should be refreshed.

### Bundle Work

Use this path when the task is about organizing reusable skill sets before projecting them into agents.

For bundle work:

1. Create bundle with `aweskill bundle create <name>`.
2. Add or remove skills with `aweskill bundle add` or `aweskill bundle remove`.
3. Inspect with `aweskill bundle show <name>` before projecting it.

For bundle template workflows:

1. Run `aweskill bundle template list --verbose`.
2. Import template with `aweskill bundle template import <name>`.
3. Inspect result with `aweskill bundle show <name>`.
4. Adjust membership with `bundle add` or `bundle remove` if needed.

### Projection Work

Use this path when the task is about applying central-store skills or bundles into one or more agent roots.

For normal agent projection:

1. Use `aweskill agent add skill <name>` or `aweskill agent add bundle <name>`.
2. Use `--global` for global agent roots.
3. Use `--project [dir]` for repo-local roots.
4. Use `--agent <id>` to limit scope when task is not “all agents”.

For scope-sensitive or multi-agent projection:

1. Decide whether target should be `--global` or `--project [dir]`.
2. Run `aweskill agent supported` if agent ids are uncertain.
3. Use `aweskill agent list` before projecting.
4. Apply changes one scope at a time unless the user explicitly wants multi-scope rollout.
5. Use `aweskill agent add` or `aweskill agent remove` with explicit `--agent`.
6. Re-run `aweskill agent list --verbose` to verify result.

For recover flows:

1. Confirm task really needs copied directories instead of managed links.
2. Run `aweskill agent recover --global|--project [dir] --agent <id>`.
3. Re-run `aweskill agent list --verbose` to confirm final state.

For migration between direct projection and bundle-driven projection:

1. Identify the canonical source of truth in the central store.
2. Inspect the current bundle and agent state before changing anything.
3. Prefer reversible operations and avoid mixing direct skill links with bundle rollout unless the user wants both.
4. Verify final state with `bundle show` and `agent list --verbose`.

For agent-side inspection:

1. Run `aweskill agent list`.
2. If output includes anything outside `linked`, switch to `$aweskill-doctor`.

## Escalation to Doctor

Escalate to `$aweskill-doctor` when:

- `aweskill agent list` shows `broken`, `duplicate`, `matched`, `new`, or `suspicious`
- the user asks to repair, clean, deduplicate, or sync aweskill state
- projection state does not match the central store and the task is diagnosis-first
- the task is about abnormal post-install or post-projection state instead of routine lifecycle management

## References

Read `references/common-flows.md` for common day-to-day command sequences.

Read `references/command-map.md` when you need a fast route from user intent to CLI command.
