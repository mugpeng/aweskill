# change log

## v0.2.8

`v0.2.8` expands the store inspection and hygiene workflow around three areas: local central-store discovery, direct skill inspection, and `SKILL.md` frontmatter repair. Since `v0.2.7`, `find` can now search the local `~/.aweskill/skills/` repository through a `local` provider, `store show` can print a summary, the raw `SKILL.md`, or just the file path for one managed skill, and `doctor fix-skills` can inspect or normalize malformed frontmatter with both actionable and informational categories.

### Local search provider and `store show`

`aweskill find <query> --local` and `aweskill store find <query> --local` now search the local central store instead of the remote registries. The same behavior is also available through `--provider local`. Local results are ranked by matches in the skill name, description, and body text from `SKILL.md`, and they print the skill path plus an `aweskill store show <skill>` hint instead of a remote install command.

`aweskill store show <skill>` is a new inspection command for managed local skills. It prints a short summary by default, supports `--raw` to print the full `SKILL.md`, and supports `--path` to print only the resolved `SKILL.md` path. Both READMEs now document the new search mode and inspection workflow.

### `doctor fix-skills` and frontmatter normalization

`aweskill doctor fix-skills` is a new dry-run-by-default hygiene command for malformed `SKILL.md` frontmatter. It can report and optionally rewrite missing closing delimiters, invalid YAML, missing frontmatter blocks, unusable names, and unusable descriptions. With `--include-info`, it also reports non-rewritten informational categories such as normalizable permissions, preserved unknown fields, and removable empty fields. With `--backup`, it copies original files into `~/.aweskill/backup/fix_skills/` before rewriting. The new `docs/fix-skills-categories.md` document explains each category with before/after examples.

### `find` filter validation tightened

`aweskill find` now validates `--domain` and `--stage` before sending a sciskill request. Invalid enum values fail fast and list the allowed values. The `skills-sh` provider also rejects `--domain` and `--stage` directly instead of silently falling back to partial remote results.

### Highlights

- Added a `local` search provider for `aweskill find` / `aweskill store find`, plus the `--local` shortcut.
- Added `aweskill store show <skill>` with summary, raw, and path output modes.
- Added `aweskill doctor fix-skills` with actionable fixes, optional informational checks, and pre-rewrite backups.
- Added `docs/fix-skills-categories.md` with per-category behavior and before/after examples.
- Tightened `find` validation so invalid sciskill filters and `skills-sh`-only misuse fail fast.
- Updated `README.md` and `README.zh-CN.md` to document local central-store search and direct skill inspection.

## v0.2.7

`v0.2.7` is the release where `aweskill` fully repositions itself as a CLI-first skill package manager. Since `v0.2.6`, the CLI renamed `store download` to `store install`, refreshed its top-level aliases and help text around the install/update lifecycle, reworked both READMEs into a FAQ-first and comparison-driven format, and rewrote the built-in `aweskill` meta-skill around task-routing workflow sections. The underlying install and update semantics stay the same, but the command surface, documentation, and built-in agent guidance are more explicit and more consistent.

### `store download` is now `store install`

`aweskill store download` was renamed to `aweskill store install`. The top-level alias `aweskill download` was renamed to `aweskill install` as part of the same cleanup. The CLI help text, README examples, and related tests were updated to use the install-oriented naming consistently, while the actual source resolution and tracked update behavior remained unchanged.

### README restructured with FAQ and comparison table

Both `README.md` and `README.zh-CN.md` were restructured around a more product-level overview:

- The old "Why aweskill" and "Find -> Download -> Update" sections were replaced with an FAQ section covering who aweskill is for, where skills are stored, supported agent types, the local-first model, built-in agent-callable skills, and the find/install/update lifecycle.
- A new comparison table was added to position `aweskill` against `cc-switch`, `sciskill`, `skillfish`, and `skills` across several capability dimensions.
- The project headline and tagline were updated to frame aweskill as a CLI-first skill package manager for AI agents.

### Built-in `aweskill` meta-skill restructured around task routing

The built-in `aweskill` skill under `resources/skills/aweskill/` was rewritten from a flat command reference into a task-router model:

- A new Task Router section classifies requests into Store Work, Source Lifecycle, Bundle Work, and Projection Work.
- Workflow guidance now follows those task domains and emphasizes inspection before mutation.
- Source Lifecycle became a first-class section covering `find`, `install`, and `update` with an explicit decision order.
- The references under `command-map.md` and `common-flows.md` were reorganized to match the same task-domain structure.

### Supporting documentation and package metadata refresh

`docs/CONTRIBUTING.md`, `docs/DESIGN.md`, and `package.json` were refreshed to match the new CLI-first positioning and updated command names. The version badges and install snippets in both READMEs were also bumped for the `0.2.7` release.

### Highlights

- Renamed `store download` → `store install` and `aweskill download` → `aweskill install`.
- Updated CLI help text, implementation, and tests to use the new install terminology consistently.
- Reworked both READMEs into FAQ-first docs with a new comparison table and refreshed positioning.
- Restructured the built-in `aweskill` meta-skill around a four-domain task router.
- Reorganized built-in reference docs to match the new task-domain workflow model.
- Refreshed related docs and package metadata for the `0.2.7` release.

## v0.2.6

`v0.2.6` tightens a few core behaviors without changing the overall command model. Since `v0.2.5`, mutating agent commands now default to the detected installed agent set instead of silently falling back to every supported agent, central-store symlink ownership checks now use real path-boundary logic instead of string-prefix matching, and store backups now carry a lightweight manifest for future format evolution while staying compatible with older archives.

### Safer default target selection for mutating agent commands

`agent add`, `agent remove`, `agent recover`, and `doctor relink` now treat omitted `--agent` as "use the installed agents detected in this scope" and fail fast when none are found. Users who really want to target every supported agent for a scope must now say so explicitly with `--agent all`. This keeps the default path smaller and more predictable, and avoids creating projection directories for agents that are not actually installed.

### More honest managed-symlink detection

Symlink ownership checks now use path-boundary containment rules instead of `startsWith` string matching. A symlink into a sibling path such as `~/.aweskill/skills2/...` is no longer misclassified as an aweskill-managed projection for `~/.aweskill/skills/...`. This makes projection inspection and cleanup match the real filesystem model more closely.

### Backup manifest for forward-compatible archives

`store backup` now writes a `backup.json` manifest into the archive root. The manifest records the backup format, version, creation time, and whether bundles were included. `store restore` reads the manifest when present, but still accepts older manifest-free archives and unpacked backup directories. This adds a migration hook for future backup-format changes without breaking existing backups.

### CLI UI cleanup

The CLI message formatter was refactored into smaller rule groups and helper functions. Output behavior stays the same, but the dispatch logic is now easier to read and extend.

### Highlights

- Changed mutating agent commands to default to detected installed agents only; `--agent all` is now the explicit full-scope path.
- Fixed managed-symlink classification to use real path boundaries instead of string prefixes.
- Added `backup.json` manifest metadata to new backup archives.
- Kept restore compatibility with older archives and unpacked backup directories that do not contain a manifest.
- Refactored CLI message formatting logic in `src/lib/ui.ts`.

## v0.2.5

`v0.2.5` is the release where `aweskill` gains a skill search command, support for the sciskill registry, and smarter update checks that skip unchanged GitHub sources. Since `v0.2.4`, the CLI added `store find` to search across skills.sh and sciskill in one query, taught `store install` to pull skills directly from sciskill, made `store update` compare remote tree SHAs to avoid unnecessary clones, and added top-level aliases for the three most-used store commands.

### Skill search with `store find`

`aweskill store find <query>` searches both skills.sh and the sciskill registry, merges results by name, and prints either a directly downloadable source or a discover-only result with a details URL. Results are numbered and indented, and a configurable timeout keeps the search responsive. The `--provider`, `--limit`, `--domain`, and `--stage` flags let users narrow the search scope.

### Sciskill registry support

`store install` now accepts `sciskill:<skill-id>` as a source type. The CLI downloads and extracts the archive from the sciskill API, wraps flat archives that place `SKILL.md` at the root into a properly named subdirectory, and records the skill in the lock file for future updates. Source parsing and lock entries were extended to represent the new source type.

### Faster updates with remote tree SHA comparison

`store update` now fetches the GitHub repository tree for tracked GitHub sources and compares the remote tree SHA against the locked SHA before cloning. Skills whose remote SHA matches the locked SHA are skipped entirely, reducing unnecessary network traffic and clone time. The tree SHA is recorded during download and update, and a new `fetchGitHubRepoTree` utility handles the API interaction.

### Top-level store aliases

`aweskill import`, `aweskill install`, and `aweskill update` are now available as top-level aliases for their `store` equivalents, making the most common operations shorter to type.

### Duplicate-skill conflict reporting

When a download or update encounters a duplicate skill name, the conflict message now includes the source path, source URL, ref, and the command name, making it easier to understand and resolve the collision without re-running anything.

### Highlights

- Added `aweskill store find <query>` with skills.sh and sciskill provider support, merged results, and numbered output.
- Added `sciskill:<skill-id>` source type for `store install` with flat-archive wrapping.
- Added `fetchGitHubRepoTree` and remote tree SHA comparison in `store update` to skip unchanged sources.
- Added `aweskill import`, `aweskill install`, `aweskill update` top-level aliases.
- Improved duplicate-skill conflict messages with source context.
- Added `droma-metaai` bundle template.
- Updated README, README.zh-CN, and docs/CONTRIBUTING.md with find/install/update docs and streamlined layout.

## v0.2.4

`v0.2.4` is the release where `aweskill` grows from a central-store projector into a source-aware skill manager. Since `v0.2.3`, the CLI learned how to download skills from local paths or GitHub sources, track them in `skills-lock.json`, refresh them with `store update`, install built-in skills during `store init`, and let explicit local imports opt into that same tracked update flow. The central store remains the protected local state, while upstream sources become comparison points for later updates.

### Download and update mode

`store install` and `store update` are now first-class central-store workflows. Users can install one or more skills from a local path or GitHub repository, optionally rename single-skill installs, and later ask `store update` to check or refresh tracked skills from their recorded source. This release also adds the underlying machinery for source parsing, temporary clone resolution, downloadable skill discovery, deterministic directory hashing, conflict classification, and source-batched update checks.

### Skill lock and tracked local imports

The new `skills-lock.json` file records tracked source metadata alongside the current central-store hash for each managed skill. `store import` now accepts `--track-source` for explicit local paths, which lets a copied local skill join future `store update` runs without changing the default import behavior. The tracked entry still treats `~/.aweskill/skills/<name>/` as the installed copy, so edits inside the central store continue to block updates unless the user explicitly overrides them.

### Link-compatible tracked imports and lock cleanup

Tracked imports can now be combined with `--link-source`. This lets a user import a local skill, replace the original path with an aweskill-managed projection, and still keep the upstream local source relationship needed for later comparisons. Scan-based imports remain untracked for now; only explicit local import paths can opt in.

`store remove` now removes the corresponding `skills-lock.json` entry when a tracked skill is deleted from the central store. This closes the lifecycle loop for tracked local skills and prevents `store update` from continuing to report a removed skill as reinstallable from source.

### Built-in skill installation during init

`store init` now installs the built-in `aweskill` and `aweskill-doctor` meta-skills into the central store without overwriting an existing user-managed copy. This makes a fresh aweskill home immediately usable for agent-side projection workflows while preserving local customizations if those built-ins were already imported.

### Highlights

- Added `aweskill store install` and `aweskill store update` plus `skills-lock.json` tracking.
- Added source parsing, clone/discovery helpers, deterministic hashing, and update batching by source.
- Added `aweskill store import <path> --track-source` for explicit local import tracking.
- Kept tracked update state anchored to the central store copy instead of the external source directory.
- Allowed `--track-source` and `--link-source` to work together for explicit local imports.
- Made `aweskill store remove` clean the tracked lock entry for removed skills.
- Made `aweskill store init` install built-in meta-skills into the central store.

## v0.2.3

`v0.2.3` is the release where `aweskill` simplifies its built-in meta-skill set and makes multi-target bundle and agent operations easier to use. Since `v0.2.2`, the repository dropped the separate `aweskill-advanced` skill, folded its non-diagnostic guidance into `aweskill`, expanded bundle templates, and let several CLI commands accept space-separated target names in addition to comma-separated lists.

### Built-in skill consolidation

The standalone `aweskill-advanced` skill was removed. Its projection-planning, bundle-template, recover, and migration guidance now lives in the main `aweskill` skill, while `aweskill-doctor` stays focused on repair-first flows. The READMEs, contributing guide, built-in bundle template, and skill descriptions were updated to match the new two-skill model.

### Easier multi-target CLI commands

`bundle add`, `bundle remove`, `agent add`, and `agent remove` now accept space-separated names as well as comma-separated input. Internally, the CLI now normalizes mixed name lists consistently, and `agent remove` reports missing skills or bundles without aborting the whole operation when valid targets are present.

### Template and layout updates

The built-in meta-skills tree now lives under `resources/skills/`, the Nature Paper bundle template was expanded and normalized, and the aweskill bundle template now tracks the two-skill built-in set. Update local built-in imports to `aweskill store import resources/skills/<name>` where needed.

### Highlights

- Removed the standalone `aweskill-advanced` built-in skill and folded its non-diagnostic guidance into `aweskill`.
- Updated `README.md`, `README.zh-CN.md`, and `docs/CONTRIBUTING.md` to document the two-skill built-in model.
- Added space-separated target support for `bundle add`, `bundle remove`, `agent add`, and `agent remove`.
- Added clearer `agent remove` handling for mixed valid and missing targets.
- Expanded and normalized the `Nature-Paper-Skills` bundle template.
- Updated the built-in skill bundle template and repository layout notes under `resources/skills/`.

## v0.2.2

`v0.2.2` fixes the command reference table order in both READMEs. Since `v0.2.1`, `doctor sync` was listed before `agent recover` in the table, which placed it out of the intended alphabetical grouping. The row order has been corrected so `agent recover` appears before `doctor sync`.

### Highlights

- Fixed command reference table row order in `README.md` and `README.zh-CN.md`.

## v0.2.1

`v0.2.1` is the release where `aweskill` gets its own built-in meta-skills and a cleaner documentation split. Since `v0.2.0`, the CLI renamed its top-level command group from `skill` to `store`, unified agent-side inspection and repair under `doctor sync`, and added built-in meta-skills that teach AI coding agents how to operate the CLI directly.

### Built-in meta-skills

Two meta-skills now live under `skills/` in the repository: `aweskill` (day-to-day operations plus non-diagnostic projection strategy) and `aweskill-doctor` (diagnostics and repair). Each skill contains a `SKILL.md` with triggers and rules, a `references/` directory with flow examples and decision trees, and an `agents/openai.yaml` for Codex-compatible runtimes. Users can import them with `aweskill store import skills/<name>` and project them to any supported agent.

### Command surface rename

The old top-level `skill` command group was replaced with a unified `store` group (`store init`, `store where`, `store scan`, `store import`, `store list`, `store remove`). All existing behavior is preserved under the new names.

### Read-only inspection and sync-based repair

`agent list` is now a pure inspection command that classifies entries as `linked`, `broken`, `duplicate`, `matched`, `new`, or `suspicious` without mutating anything. All repair logic moved to `doctor sync`, which is dry-run by default and requires `--apply` to make changes. `doctor sync` also gained `--global`/`--project` scope and `--agent` filters, matching the same filter model used by `store scan` and `store import --scan`.

### Clearer documentation split

Complex developer-facing details (backup/restore behavior semantics, hygiene check integration, doctor dry-run mechanics) moved from the README to `docs/CONTRIBUTING.md`. The built-in skill structure and design principles are also documented there. Both English and Chinese READMEs were updated in parallel.

### Highlights

- Added built-in meta-skills: `aweskill`, `aweskill-doctor`.
- Renamed `skill` top-level commands to `store` (`store init`, `store where`, `store scan`, `store import`, `store list`, `store remove`).
- Made `agent list` read-only; all repair now goes through `doctor sync`.
- Added scope and agent filters to `store scan`, `store import --scan`, and `doctor sync`.
- Added `broken` category for stale managed projections.
- Unified agent detection in `agent list` and `doctor sync`: both now auto-detect installed agents by scope instead of scanning all supported agents blindly.
- `agent supported` now shows `✓`/`x` install status per agent and lists detected global skills paths.
- `agent list` and `doctor sync` print the detected agent set before grouped results when `--agent` is omitted.
- `agent list` now reuses `doctor sync` dry-run logic directly, so stale managed projections and other dry-run classifications stay consistent.
- Added empty-result guard with actionable message when no agents are detected for the target scope.
- Moved developer documentation from README to `docs/CONTRIBUTING.md`.
- Updated `README.md` and `README.zh-CN.md` with built-in skill section and trimmed doctor details.

## v0.2.0

`v0.2.0` is the release where `aweskill` turns its agent-side maintenance path into a more unified repair flow. Since `v0.1.9`, the CLI gained `doctor sync`, tightened duplicate classification, and made projection and cleanup behavior more consistent across the agent commands that inspect or repair local skill directories.

### `doctor sync` as the main repair entrypoint

`doctor sync` now bundles the logic for finding and repairing agent-side issues into one command path. It is designed to inspect local agent skill directories, classify the problems it finds, and apply safe repairs where the CLI can do so deterministically.

### More precise duplicate detection

Duplicate handling now distinguishes canonical duplicates, rule-matched duplicates, and safer projections more carefully. The matching flow also uses alphanumeric-only keys for duplicate comparison, which makes the classification less sensitive to formatting noise in path names.

### Highlights

- Added unified `aweskill doctor sync` for finding and repairing agent issues.
- Improved duplicate classification and display for canonical and rule-matched duplicates.
- Tightened duplicate matching with alphanumeric-only comparison keys.
- Made projection and cleanup behavior more consistent across the agent command set.

## v0.1.9

`v0.1.9` is the release where `aweskill` gets stricter about agent-side hygiene and adds a direct repair path for duplicate agent entries. Since `v0.1.8`, the CLI learned to classify suspicious agent skills before trying to import or relink them, and it now exposes a dedicated `doctor relink` command to turn duplicate agent directories back into managed projections.

### Suspicious agent entries handled explicitly

Agent-side checks now treat missing `SKILL.md` files and reserved names such as `.system` as `suspicious` instead of mixing them into normal duplicate or new-skill flows. That classification is shared across the core checking logic, `agent list`, and `agent list --update`, so the CLI skips unsafe entries consistently and emits clearer warnings about why they were ignored.

### Dedicated repair for duplicate agent directories

`aweskill doctor relink` now finds duplicate skill directories that already exist in the central store and can replace them with managed symlinks when run with `--apply`. The new command is deliberately narrow: it only acts on `duplicate` entries, leaves suspicious directories untouched, and gives users a dry-run view before making changes.

### Highlights

- Added `aweskill doctor relink [--apply] [--global|--project [dir]] [--agent <agent>]`.
- Added `suspicious` as an explicit agent-skill category for reserved names and entries missing `SKILL.md`.
- Updated `agent list --update` to skip suspicious entries with clearer warnings.
- Documented the new import defaults and agent-side hygiene rules in the README and contributing guide.

## v0.1.8

`v0.1.8` is the release where `aweskill` nearly doubles its agent coverage. Since `v0.1.7`, the supported agent list grew from 32 to 47, the README got a more readable collapsible agent table, and a few existing agent paths were corrected to match upstream conventions.

### Support for 47 agents

15 new agents were added: `bob`, `continue`, `cortex`, `deepagents`, `firebender`, `github-copilot`, `iflow-cli`, `junie`, `kilo`, `kimi-cli`, `mcpjam`, `pi`, `pochi`, `warp`, and `zencoder`. Each new agent follows the same `defineAgent` pattern with consistent global and project skill directory resolution. The `AgentName` type, agent registry, and test expectations were all updated in lockstep.

### Agent path corrections

- `augment` now uses `.augment/skills/` instead of `.augment/rules/`, aligning with the standard skills directory convention.
- `copilot` now uses `.copilot/` instead of `.github/`, and a new `github-copilot` agent was added pointing to `.copilot/skills/` to match the upstream CLI's actual directory layout.

### Highlights

- Added 15 new agents (bob, continue, cortex, deepagents, firebender, github-copilot, iflow-cli, junie, kilo, kimi-cli, mcpjam, pi, pochi, warp, zencoder).
- Fixed `augment` path from `.augment/rules` to `.augment/skills`.
- Fixed `copilot` path from `.github` to `.copilot` and added `github-copilot` alias.
- Updated README and README.zh-CN with collapsible agent table, removed the "Mode" column, and featured popular agents in the summary.

## v0.1.7

`v0.1.7` is the release where `aweskill` starts feeling more like a maintained toolkit than a loose pile of commands. Since `v0.1.6`, the project got a cleaner resource layout, a more defensible internal foundation, and a much more practical store backup story. The shape of the repo is clearer, the CLI is less fragile, and the workflows around templates, archives, and bundle state finally line up with how people actually use the tool.

### A proper home for shared resources

The repository now has a clearer split between runtime state and in-repo assets. Built-in bundle templates moved into `resources/bundle_templates/`, `docs/CONTRIBUTING.md` now lives where contributors expect to find it, and `resources/skill_archives/` was reserved for shareable repository-level archives. That cleanup is small on paper, but it matters: templates, docs, and distributable resources now have stable, documented locations instead of feeling incidental. `aweskill` is easier to package, easier to document, and easier to extend without guessing where things belong.

### Version and filesystem cleanup

`aweskill` now reads its version from `package.json` through a dedicated `AWESKILL_VERSION` module, rather than relying on a string buried in the CLI entrypoint. Along the way, repeated filesystem checks were centralized into `src/lib/fs.ts`, and the codebase picked up a stronger test surface for fs helpers, imports, symlink behavior, command flows, and version consistency. This is mostly invisible when everything works, which is the point. `v0.1.7` reduces duplication, makes the package metadata the source of truth, and gives future changes a better chance of staying correct after build and release.

### Whole-store backup support

The biggest user-facing change in `v0.1.7` is that `aweskill store backup` and `aweskill store restore` now handle more realistic backup workflows. You can pass `--both` to include bundle definitions alongside skills, restore them together, and make sure the automatic pre-restore backup captures the same scope. `store backup` also accepts an optional archive destination, including a target directory that will receive a timestamped archive using the default naming scheme. The README examples were updated to reflect that new flow. In practice, this means backing up `aweskill` is no longer just about preserving `skills/`; it can now preserve the bundle structure that makes those skills usable.

### Highlights

- Moved built-in bundle templates into `resources/bundle_templates/` and documented repo-level archives under `resources/skill_archives/`.
- Centralized `pathExists` and introduced `src/lib/version.ts` so the CLI version comes from `package.json`.
- Added coverage for fs utilities, import behavior, symlink handling, version resolution, and new backup/restore command paths.
- Added `aweskill store backup [archive] [--both]`.
- Added `aweskill store restore <archive> [--override] [--both]`.
- Enabled directory targets for `store backup`, which now emit a default timestamped `skills-*.tar.gz` archive into the chosen folder.
