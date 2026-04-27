# aweskill Design Notes

This document describes the stable design constraints behind `aweskill`.

It is not a user quickstart and not a contributor workflow guide. Use:

- `README.md` for installation and command usage
- `docs/CONTRIBUTING.md` for development workflow, testing, and PR expectations

## Project Direction

`aweskill` is intentionally centered on a small set of responsibilities:

- keep one canonical skill store
- define reusable bundles
- project skills into multiple agent runtimes
- provide boring, safe maintenance operations around that workflow

New features should make that workflow clearer, safer, or easier to use. They should not turn the tool into a general package manager, remote registry, or configuration platform unless there is a strong reason.

## Command Model

`aweskill` uses a five-part command model:

- `bundle`
- `agent`
- `store`
- `doctor`
- direct top-level convenience commands only where they reduce friction without creating overlap

Current top-level convenience commands:

- `aweskill find`
- `aweskill download`
- `aweskill update`

Store-only commands stay under `store`, including:

- `store init`
- `store where`
- `store import`
- `store scan`
- `store backup`
- `store restore`
- `store list`
- `store remove`

New concepts should be rare. Prefer making existing areas clearer before adding more CLI surface.

## Projection Model

`aweskill` keeps its projection model deliberately simple:

1. Skill content has one canonical home: `~/.aweskill/skills/<skill-name>/`
2. `agent add` projects selected skills into agent-specific directories
3. On Unix-like systems, that projection is normally a symlink
4. On Windows, that projection prefers a directory junction and may fall back to a managed copy
5. `agent remove` only deletes projections that `aweskill` can identify as managed
6. `agent list` is the primary read-only inspection command
7. `doctor sync` is the primary repair command and defaults to dry run

There is no separate global activation registry. The projected filesystem state is the activation model.

### No Global Activation File

`aweskill` treats projected filesystem state as the truth. This avoids a second layer of activation metadata drifting out of sync with what users can see on disk.

### Bundles Are Expansion Sets

`agent add bundle <name>` expands the bundle into skill names and projects those skills. There is no separate long-lived bundle activation object after projection.

### Explicit Full-Scope Mutation

Mutating agent commands should default to the detected installed agent set for the chosen scope. If no installed agents are detected, they should fail with an actionable message instead of silently creating directories for every supported agent. Users who want a broad rollout should opt into it explicitly with `--agent all`.

### Managed-Only Removal

`aweskill` removes only entries it can identify as its own managed projections. It does not blindly delete arbitrary directories in user-owned skill roots.

## Store and Import Semantics

### Import Behavior

- `store scan --import` defaults to relinking scanned paths unless `--keep-source` is passed
- `store scan --import` and `store import --scan` accept the same `--global|--project [dir]` and `--agent <agent>` filters used by agent-side commands
- `store import <path>` defaults to keeping the source path in place
- `--link-source` replaces the source path with an aweskill-managed projection after importing
- `--keep-source` leaves the source path in place after importing
- `--keep-source` and `--link-source` are mutually exclusive and should error when both are passed
- when a source path is a symlink, `aweskill` copies from the resolved real path and may emit a warning
- broken symlinks during batch import are reported while other items continue

### Backup and Restore

- `restore` creates a fresh backup of the current store before applying the archive
- `restore` accepts either a backup archive or an unpacked directory containing `skills/`
- `restore` skips existing skills and bundles by default and only overwrites with `--override`
- `backup` and `restore` include both `skills/` and `bundles/` by default; use `--skills-only` for a reduced flow
- new backup archives should include a lightweight root manifest with format and version metadata
- `restore` should accept older backup archives and unpacked backup directories that do not include that manifest

## Find, Download, and Update

`find` searches across two skill providers:

- `skills.sh` — community skill directory with downloadable GitHub sources
- `sciskill` — scientific and technical skill registry with `sciskill:<skill-id>` identifiers

Results are merged by normalized name. When a provider returns a discover-only source, the result still appears but is marked as unsupported for direct download.

`download <source>` accepts local paths, GitHub sources, and `sciskill:<skill-id>` identifiers. Downloaded skills are recorded in the lock file for future `store update` runs.

`update [skill...]` checks or refreshes tracked skills from their recorded source.

### Limit Behavior

- when `--provider` is specified, `--limit` applies to that provider's visible result count
- when `--provider` is omitted, `--limit` applies per provider before merge and dedupe

## Hygiene Rules

The canonical store should only contain:

- skill directories or managed links under `~/.aweskill/skills/`, each with a `SKILL.md`
- bundle YAML files under `~/.aweskill/bundles/`

Examples of suspicious entries:

- files such as `._global` inside `skills/` or `bundles/`
- skill directories missing `SKILL.md`
- non-YAML files in `bundles/`
- malformed bundle YAML files

If hygiene rules change, update all consumers together. Backup, restore, and list flows should not silently drift away from `doctor clean`.

## Agent-Side Classification

When reading agent skill directories, contributors should use the same notion of validity across all consumers:

- entries missing `SKILL.md` are suspicious
- reserved or hidden skill names such as `.system` are suspicious
- suspicious entries should not be imported, relinked, or counted as new skills
- suspicious agent entries may be removed only when the user passes both `--apply` and `--remove-suspicious` through `doctor sync`
- warning text should explain why the entry was skipped

This rule should stay consistent across `agent list`, `doctor sync`, and any future agent-side maintenance flow.

## Display Behavior

- `store list` shows totals and a short preview unless `--verbose`
- `store scan` shows per-agent totals by default and concrete entries with `--verbose`
- `store scan` defaults to `global` scope unless `--project` is selected explicitly
- `agent list` categorizes entries as `linked`, `broken`, `duplicate`, `matched`, `new`, and `suspicious`
- `store list` and `bundle list` summarize suspicious store entries and suggest `doctor clean`
- `agent list` is the read-only dry-run view of `doctor sync`
- `agent list` should stay read-only and point users to `doctor sync`, `doctor sync --apply`, and `doctor sync --apply --remove-suspicious` when relevant
- `doctor sync --apply` should relink duplicate and matched entries, repair broken symlinks when the central store has a same-name skill, remove broken projections otherwise, and report suspicious entries unless `--apply --remove-suspicious` is set
- `agent list` should report `new` entries and suggest `aweskill store scan --import` with matching scope and agent filters
- `backup` and `restore` report suspicious entries they skipped

## Repository Resources

- runtime bundles live under `~/.aweskill/bundles/`
- in-repo template bundles live under `resources/bundle_templates/`
- `resources/skill_archives/` is reserved for repository-level backup archives you intentionally keep in-tree for sharing or reference
- built-in meta-skills live under `resources/skills/`

## Built-in Skills

`aweskill` ships two meta-skills that teach AI agents how to operate the CLI:

- `resources/skills/aweskill/` — core operations
- `resources/skills/aweskill-doctor/` — diagnostics and repair

Each skill follows this structure:

```text
resources/skills/<name>/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    └── *.md
```

Design principles:

- facts live in one place
- rules go in `SKILL.md`
- examples go in `references/`
- no wrapper scripts; the aweskill CLI is the interface

When changing CLI behavior, update the corresponding skill files in the same PR.

## Core Principles

These principles matter more than adding surface area quickly:

### One Source of Truth

Skills should have a canonical home in `~/.aweskill/skills/`.

### Managed Projections Only

`aweskill` should clearly distinguish between files it manages and files it does not.

### Minimal Surprise

The user should be able to predict what `add`, `remove`, `sync`, `recover`, and `dedup` will do without reading implementation code.

### Respect User State

This tool operates on local directories that users care about. Be conservative about deleting files, replacing unmanaged directories, or introducing hidden state.
