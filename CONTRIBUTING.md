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
