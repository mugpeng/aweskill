# Contributing to aweskill

Thank you for being here.

`aweskill` is built around a simple idea: local tooling should reduce mess, not create new mess.
We care about useful features, but we care just as much about preserving a model that stays small,
clear, and reliable over time.

This guide is not only about opening a PR. It is also about how we want to evolve `aweskill`:
with explicit tradeoffs, readable code, and respect for the user's filesystem.

## Project Direction

`aweskill` is not trying to become a giant platform.

The project is intentionally centered on a small set of responsibilities:

- keep one canonical skill store
- define reusable bundles
- project skills into multiple agent runtimes
- provide boring, safe maintenance operations around that workflow

When contributing, please preserve that focus. New features should make the main workflow clearer,
safer, or easier to use. They should not turn the tool into a general package manager, remote registry,
or configuration platform unless there is a very strong reason.

## Development Setup

Keep setup simple and reproducible:

```bash
# Clone the repository
git clone https://github.com/mugpeng/aweskill.git
cd aweskill

# Install dependencies
npm install

# Run tests
npm test

# Build the CLI
npm run build

# Local CLI usage during development
npm link
aweskill --help
```

## Windows Development Notes

`aweskill` supports Windows as a native platform.

When developing or reviewing Windows-related changes:

- use Node.js 20 or later
- prefer PowerShell for local command examples
- remember that agent projections may be created as junctions on Windows
- if link creation is unavailable, managed copy fallback is acceptable behavior
- backup and restore should not depend on external Unix tools such as `tar`

## Branches

The repository uses two long-lived branches:

- **`main`** — stable line; what users and downstream tooling should treat as the current release.
- **`dev`** — integration branch where day-to-day development happens.

**Workflow:** do most development on **`dev`**. When a feature is implemented and ready to ship, merge **`dev`** into **`main`**. Prefer opening PRs against **`dev`** unless you are told otherwise.

## Code Style

We want the codebase to stay calm and legible.

When contributing, aim for code that feels:

- Simple: prefer the smallest change that solves the real problem
- Clear: optimize for the next reader, not for cleverness
- Honest: keep the filesystem model explicit and avoid hidden state
- Focused: preserve boundaries between `skill`, `bundle`, `agent`, `store`, and `doctor`
- Durable: choose behavior that is easy to test and reason about

In practice:

- Runtime language: TypeScript on Node.js 20+
- CLI framework: `commander`
- Tests: `vitest`
- Bundles are plain YAML
- Prefer small, well-bounded functions over large command handlers
- Prefer improving existing command behavior over adding new top-level concepts

## Bundle File Format

Bundles are plain YAML stored under `~/.aweskill/bundles/<name>.yaml`:

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

Keep the format intentionally small. If a proposal adds state that cannot be understood by opening the YAML file directly, that proposal should face a high bar.

## Contribution Guidelines

### Keep the mental model coherent

`aweskill` now uses a five-part command model:

- `skill`
- `bundle`
- `agent`
- `store`
- `doctor`

If a contribution adds or changes CLI behavior, first ask which of those areas it truly belongs to.
Avoid introducing overlapping commands or synonyms that increase the command surface without adding real capability.

### Protect user state

This tool operates on local directories that users care about.

That means contributions should be conservative about:

- deleting files
- replacing unmanaged directories
- introducing hidden activation state
- automatically rewriting user-owned content without clear boundaries

If a feature changes files, the user should be able to understand what changed and why.

### Prefer explicit over magical

`aweskill` works because its model is inspectable:

- the canonical store is on disk
- bundles are plain YAML
- projected skills are visible in agent directories

Please avoid features that hide core state behind unnecessary abstraction.

## Projection Model

`aweskill` keeps its projection model deliberately simple:

1. Skill content has one canonical home: `~/.aweskill/skills/<skill-name>/`
2. `agent add` projects selected skills into agent-specific directories
3. On Unix-like systems, that projection is normally a symlink
4. On Windows, that projection prefers a directory junction and may fall back to a managed copy
5. `agent remove` only deletes projections that `aweskill` can identify as managed
6. `agent sync` removes managed projections whose central source no longer exists

There is no separate global activation registry. The projected filesystem state is the activation model.

### Import behavior

- Default `skill import --scan` and batch `skill import` merge only missing files when the central skill already exists
- `--override` overwrites existing central content
- If the import source is a symlink, `aweskill` copies from the resolved real path and may emit a warning
- Broken symlinks during batch import are reported while other items continue
- `restore` creates a fresh backup of the current store before applying the archive
- `restore` accepts either a backup archive or an unpacked directory containing `skills/`
- `restore` skips existing skills and bundles by default and only overwrites with `--override`
- `backup` and `restore` include both `skills/` and `bundles/` by default; use `--skills-only` for a reduced flow

### Store Hygiene

`aweskill` now treats store hygiene as a first-class maintenance concern.

The canonical store should only contain:

- skill directories or managed links under `~/.aweskill/skills/`, each with a `SKILL.md`
- bundle YAML files under `~/.aweskill/bundles/`

Contributors should preserve the shared hygiene rules used across:

- `doctor clean`
- `skill list`
- `bundle list`
- `store backup`
- `store restore`

Examples of suspicious entries:

- files such as `._global` inside `skills/` or `bundles/`
- skill directories missing `SKILL.md`
- non-YAML files in `bundles/`
- malformed bundle YAML files

The intended command model is:

- `doctor clean` is the user-facing hygiene scanner
- `doctor clean` defaults to dry run
- `doctor clean --apply` removes suspicious entries
- `doctor dedupe` also defaults to dry run
- `doctor dedupe --apply` is required before mutating state

If you change hygiene rules, update all consumers together. Backup, restore, and list flows should not silently drift away from `doctor clean`.

### Display behavior

- `skill list` shows totals and a short preview unless `--verbose`
- `skill scan` shows per-agent totals by default and concrete entries with `--verbose`
- `agent list` categorizes entries as `linked`, `duplicate`, and `new`
- `skill list` and `bundle list` summarize suspicious store entries and suggest `doctor clean`
- `doctor dedupe` treats `name`, `name-2`, and `name-1.2.3` as one duplicate family and only mutates files when `--apply` is passed
- `backup` and `restore` report suspicious entries they skipped

### Projection examples

```bash
# Global projection for one agent
aweskill agent add skill biopython --global --agent codex

# Project-scoped projection for one agent
aweskill agent add skill pr-review --project /path/to/repo --agent cursor

# Bundle expansion writes individual managed projections
aweskill agent add bundle backend --global --agent codex
aweskill agent remove bundle backend --global --agent codex

# Convert linked projections into copied directories
aweskill agent recover --global --agent codex
```

## Design Tradeoffs

### No global activation file

`aweskill` treats projected filesystem state as the truth. This avoids a second layer of activation metadata drifting out of sync with what users can see on disk.

### Bundles are expansion sets

`agent add bundle <name>` expands the bundle into skill names and projects those skills. There is no separate long-lived bundle activation object after projection.

### Managed-only removal

`aweskill` removes only entries it can identify as its own managed projections. It does not blindly delete arbitrary directories in user-owned skill roots.

### Small command surface

New concepts should be rare. Prefer making `skill`, `bundle`, `agent`, `store`, and `doctor` clearer before adding more top-level CLI surface.

## Repository Resources

- Runtime bundles live under `~/.aweskill/bundles/`
- In-repo template bundles live under `resources/bundle_templates/`
- `resources/skill_archives/` is reserved for repository-level backup archives you intentionally keep in-tree for sharing or reference

## Documentation

Documentation changes are welcome and important.

If you change:

- command names
- command semantics
- bundle format
- projection behavior
- supported agents

please update the relevant docs in the same change:

- `README.md`
- `README.zh-CN.md`
- tests that define the CLI surface

## Testing

Before opening a PR, run:

```bash
npm test
npm run build
```

If you changed command behavior, add or update command-level tests in `tests/commands.test.ts`.

If you changed low-level behavior, prefer focused tests near the affected modules rather than only relying on broad end-to-end coverage.

## Design Principles

These principles matter more than adding surface area quickly:

### One source of truth

Skills should have a canonical home in `~/.aweskill/skills/`.

### Managed projections only

`aweskill` should clearly distinguish between files it manages and files it does not.

### Minimal surprise

The user should be able to predict what `add`, `remove`, `sync`, `recover`, and `dedupe` will do without reading implementation code.

### Small command surface

Reducing cognitive load is a feature. Avoid adding commands that should really be options, subcommands, or documentation improvements.

## Related Projects

`aweskill` references and learns from several adjacent tools:

- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager)
- [skillfish](https://github.com/knoxgraeme/skillfish)
- [vercel-labs/skills](https://github.com/vercel-labs/skills)
- [cc-switch](https://github.com/farion1231/cc-switch)

These projects helped shape different parts of the design space, from skill packaging conventions to cross-tool management and local developer workflows.

## Questions

If you are unsure whether a change fits the project, open an issue first or start with a small documentation or test PR.

Focused contributions are preferred over broad rewrites.
