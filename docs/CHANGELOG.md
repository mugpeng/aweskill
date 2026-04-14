# change log

## v0.2.2

`v0.2.2` fixes the command reference table order in both READMEs. Since `v0.2.1`, `doctor sync` was listed before `agent recover` in the table, which placed it out of the intended alphabetical grouping. The row order has been corrected so `agent recover` appears before `doctor sync`.

### Highlights

- Fixed command reference table row order in `README.md` and `README.zh-CN.md`.

## v0.2.1

`v0.2.1` is the release where `aweskill` gets its own built-in meta-skills and a cleaner documentation split. Since `v0.2.0`, the CLI renamed its top-level command group from `skill` to `store`, unified agent-side inspection and repair under `doctor sync`, and added three meta-skills that teach AI coding agents how to operate the CLI directly.

### This is the release where aweskill teaches agents to use itself.

Three meta-skills now live under `skills/` in the repository: `aweskill` (day-to-day operations), `aweskill-advanced` (low-frequency maintenance and projection strategy), and `aweskill-doctor` (diagnostics and repair). Each skill contains a `SKILL.md` with triggers and rules, a `references/` directory with flow examples and decision trees, and an `agents/openai.yaml` for Codex-compatible runtimes. Users can import them with `aweskill store import skills/<name>` and project them to any supported agent.

### This is the release where the command surface gets renamed.

The old top-level `skill` command group was replaced with a unified `store` group (`store init`, `store where`, `store scan`, `store import`, `store list`, `store remove`). All existing behavior is preserved under the new names.

### This is the release where agent list becomes read-only and doctor sync handles repair.

`agent list` is now a pure inspection command that classifies entries as `linked`, `broken`, `duplicate`, `matched`, `new`, or `suspicious` without mutating anything. All repair logic moved to `doctor sync`, which is dry-run by default and requires `--apply` to make changes. `doctor sync` also gained `--global`/`--project` scope and `--agent` filters, matching the same filter model used by `store scan` and `store import --scan`.

### This is the release where documentation gets a clearer split.

Complex developer-facing details (backup/restore behavior semantics, hygiene check integration, doctor dry-run mechanics) moved from the README to `docs/CONTRIBUTING.md`. The built-in skill structure and design principles are also documented there. Both English and Chinese READMEs were updated in parallel.

### Highlights

- Added three built-in meta-skills: `aweskill`, `aweskill-advanced`, `aweskill-doctor`.
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

### This is the release where `doctor sync` becomes the main repair entrypoint.

`doctor sync` now bundles the logic for finding and repairing agent-side issues into one command path. It is designed to inspect local agent skill directories, classify the problems it finds, and apply safe repairs where the CLI can do so deterministically.

### This is the release where duplicate detection gets more precise.

Duplicate handling now distinguishes canonical duplicates, rule-matched duplicates, and safer projections more carefully. The matching flow also uses alphanumeric-only keys for duplicate comparison, which makes the classification less sensitive to formatting noise in path names.

### Highlights

- Added unified `aweskill doctor sync` for finding and repairing agent issues.
- Improved duplicate classification and display for canonical and rule-matched duplicates.
- Tightened duplicate matching with alphanumeric-only comparison keys.
- Made projection and cleanup behavior more consistent across the agent command set.

## v0.1.9

`v0.1.9` is the release where `aweskill` gets stricter about agent-side hygiene and adds a direct repair path for duplicate agent entries. Since `v0.1.8`, the CLI learned to classify suspicious agent skills before trying to import or relink them, and it now exposes a dedicated `doctor relink` command to turn duplicate agent directories back into managed projections.

### This is the release where suspicious agent entries stop pretending to be valid skills.

Agent-side checks now treat missing `SKILL.md` files and reserved names such as `.system` as `suspicious` instead of mixing them into normal duplicate or new-skill flows. That classification is shared across the core checking logic, `agent list`, and `agent list --update`, so the CLI skips unsafe entries consistently and emits clearer warnings about why they were ignored.

### This is the release where duplicate agent directories get a dedicated repair command.

`aweskill doctor relink` now finds duplicate skill directories that already exist in the central store and can replace them with managed symlinks when run with `--apply`. The new command is deliberately narrow: it only acts on `duplicate` entries, leaves suspicious directories untouched, and gives users a dry-run view before making changes.

### Highlights

- Added `aweskill doctor relink [--apply] [--global|--project [dir]] [--agent <agent>]`.
- Added `suspicious` as an explicit agent-skill category for reserved names and entries missing `SKILL.md`.
- Updated `agent list --update` to skip suspicious entries with clearer warnings.
- Documented the new import defaults and agent-side hygiene rules in the README and contributing guide.

## v0.1.8

`v0.1.8` is the release where `aweskill` nearly doubles its agent coverage. Since `v0.1.7`, the supported agent list grew from 32 to 47, the README got a more readable collapsible agent table, and a few existing agent paths were corrected to match upstream conventions.

### This is the release where aweskill supports 47 agents.

15 new agents were added: `bob`, `continue`, `cortex`, `deepagents`, `firebender`, `github-copilot`, `iflow-cli`, `junie`, `kilo`, `kimi-cli`, `mcpjam`, `pi`, `pochi`, `warp`, and `zencoder`. Each new agent follows the same `defineAgent` pattern with consistent global and project skill directory resolution. The `AgentName` type, agent registry, and test expectations were all updated in lockstep.

### This is the release where agent paths were corrected.

- `augment` now uses `.augment/skills/` instead of `.augment/rules/`, aligning with the standard skills directory convention.
- `copilot` now uses `.copilot/` instead of `.github/`, and a new `github-copilot` agent was added pointing to `.copilot/skills/` to match the upstream CLI's actual directory layout.

### Highlights

- Added 15 new agents (bob, continue, cortex, deepagents, firebender, github-copilot, iflow-cli, junie, kilo, kimi-cli, mcpjam, pi, pochi, warp, zencoder).
- Fixed `augment` path from `.augment/rules` to `.augment/skills`.
- Fixed `copilot` path from `.github` to `.copilot` and added `github-copilot` alias.
- Updated README and README.zh-CN with collapsible agent table, removed the "Mode" column, and featured popular agents in the summary.

## v0.1.7

`v0.1.7` is the release where `aweskill` starts feeling more like a maintained toolkit than a loose pile of commands. Since `v0.1.6`, the project got a cleaner resource layout, a more defensible internal foundation, and a much more practical store backup story. The shape of the repo is clearer, the CLI is less fragile, and the workflows around templates, archives, and bundle state finally line up with how people actually use the tool.

### This is the release where aweskill gets a proper home for shared resources.

The repository now has a clearer split between runtime state and in-repo assets. Built-in bundle templates moved into `resources/bundle_templates/`, `docs/CONTRIBUTING.md` now lives where contributors expect to find it, and `resources/skill_archives/` was reserved for shareable repository-level archives. That cleanup is small on paper, but it matters: templates, docs, and distributable resources now have stable, documented locations instead of feeling incidental. `aweskill` is easier to package, easier to document, and easier to extend without guessing where things belong.

### This is the release where the CLI stopped hardcoding what the package already knows.

`aweskill` now reads its version from `package.json` through a dedicated `AWESKILL_VERSION` module, rather than relying on a string buried in the CLI entrypoint. Along the way, repeated filesystem checks were centralized into `src/lib/fs.ts`, and the codebase picked up a stronger test surface for fs helpers, imports, symlink behavior, command flows, and version consistency. This is mostly invisible when everything works, which is the point. `v0.1.7` reduces duplication, makes the package metadata the source of truth, and gives future changes a better chance of staying correct after build and release.

### This is the release where store backup finally understands the whole store.

The biggest user-facing change in `v0.1.7` is that `aweskill store backup` and `aweskill store restore` now handle more realistic backup workflows. You can pass `--both` to include bundle definitions alongside skills, restore them together, and make sure the automatic pre-restore backup captures the same scope. `store backup` also accepts an optional archive destination, including a target directory that will receive a timestamped archive using the default naming scheme. The README examples were updated to reflect that new flow. In practice, this means backing up `aweskill` is no longer just about preserving `skills/`; it can now preserve the bundle structure that makes those skills usable.

### Highlights

- Moved built-in bundle templates into `resources/bundle_templates/` and documented repo-level archives under `resources/skill_archives/`.
- Centralized `pathExists` and introduced `src/lib/version.ts` so the CLI version comes from `package.json`.
- Added coverage for fs utilities, import behavior, symlink handling, version resolution, and new backup/restore command paths.
- Added `aweskill store backup [archive] [--both]`.
- Added `aweskill store restore <archive> [--override] [--both]`.
- Enabled directory targets for `store backup`, which now emit a default timestamped `skills-*.tar.gz` archive into the chosen folder.
