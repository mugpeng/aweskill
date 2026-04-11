# aweskill CLI Design

## Summary

`aweskill` is a local skill orchestration CLI. It manages a central skill repository, bundle definitions, and activation config, then projects skills into AI agent directories with `symlink` or `copy`.

The design follows `/Users/peng/Desktop/Project/SkillsCli/design3/aweskill-cli-design-v3.1.md` as closely as possible for the first implementation.

## Scope

### In Scope

- Local central repository at `~/.aweskill/skills/`
- Bundle definitions at `~/.aweskill/bundles/*.yaml`
- Global config at `~/.aweskill/config.yaml`
- Project config at `<project>/.aweskill.yaml`
- Activation of bundles and skills by agent and scope
- Reconcile-driven projection into agent skill directories
- `symlink` as the default projection mode, with `copy` where needed
- Scan and import flows for existing skill directories

### Out of Scope

- Remote registry or marketplace
- GUI or TUI beyond normal CLI output
- Background watcher
- Database-backed state
- Regex project matching

## Architecture

### Source of Truth

Three layers are authoritative:

1. `~/.aweskill/skills/`
2. `~/.aweskill/bundles/*.yaml`
3. `~/.aweskill/config.yaml` plus project `.aweskill.yaml`

Projected agent directories are derived state only. They are always repaired through reconcile instead of edited directly.

### Configuration Model

Global config:

```yaml
version: 1

activations:
  - type: bundle
    name: backend
    agents: [claude-code, codex]
    scope: global

projects:
  - path: /abs/project
    match: exact
    activations:
      - type: skill
        name: pr-review
        agents: [claude-code]
```

Project config:

```yaml
version: 1

activations:
  - type: bundle
    name: frontend
    agents: [claude-code, cursor]
```

Rules:

- `type` is `bundle` or `skill`
- `agents` is a list of target agent ids
- top-level global activations require `scope: global`
- project-scoped activations must not carry `scope`

### Bundle Model

Each bundle is stored as one YAML file:

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

Bundles only declare skill membership. They do not store activation state.

### Project Matching

Supported matchers:

- `exact`
- `prefix`
- `glob`

Display priority is `exact > glob > prefix`, but actual evaluation uses the union of all matched project rules.

### Reconcile Flow

Reconcile is the core engine:

1. Load global activations
2. Load matching project rules from global config
3. Load project `.aweskill.yaml` when a project path is in scope
4. Expand bundle activations into skill activations
5. Compute expected `(agent, location, skill)` projection set
6. Diff current filesystem state against expected state
7. Create or remove projected skill directories

Global and project locations are reconciled independently. A global activation does not justify leaving a stale project projection in place, and vice versa.

## Commands

### Repository Management

- `aweskill init`
- `aweskill init --scan`
- `aweskill scan`
- `aweskill add <path> --mode symlink|mv|cp`
- `aweskill add --scan --mode symlink|mv|cp`
- `aweskill remove <skill> [--force]`
- `aweskill list skills`

### Bundle Management

- `aweskill bundle create <name>`
- `aweskill bundle show <name>`
- `aweskill bundle add-skill <bundle> <skill>`
- `aweskill bundle remove-skill <bundle> <skill>`
- `aweskill list bundles`

### Activation Management

- `aweskill enable bundle <name> --scope global --agent <agent>`
- `aweskill enable bundle <name> --scope project --project <dir> --agent <agent>`
- `aweskill enable skill <name> --scope global --agent <agent>`
- `aweskill enable skill <name> --scope project --project <dir> --agent <agent>`
- `aweskill disable ...` with the same shape

Enable and disable mutate config and immediately trigger reconcile.

### Status and Repair

- `aweskill list status`
- `aweskill list status --project <dir>`
- `aweskill sync`

`sync` is a repair path that fully recomputes projections from config.

## Agent Support

The initial implementation supports:

- `claude-code`
- `codex`
- `cursor`

The agent registry remains extensible, but MVP behavior is limited to these agents because they are the main targets in the reference design and reference projects.

`--agent all` means all detected agents, not all known agent definitions.

## Files and Modules

```text
src/
  index.ts
  commands/
    init.ts
    scan.ts
    add.ts
    remove.ts
    bundle.ts
    enable.ts
    disable.ts
    list.ts
    sync.ts
  lib/
    agents.ts
    scanner.ts
    symlink.ts
    path.ts
    skills.ts
    bundles.ts
    config.ts
    matcher.ts
    reconcile.ts
    import.ts
    references.ts
  types.ts
```

Command modules handle CLI parsing and call library functions. Library modules hold filesystem, parsing, matching, reconcile, and import logic.

## Safety and Error Handling

- Skill names are sanitized before filesystem writes
- All projection paths are validated against the intended base directory
- Existing non-symlink targets are treated as conflicts instead of being deleted silently
- Broken symlinks are removed and recreated during reconcile
- `remove` refuses to delete referenced skills unless `--force` is used

## Testing Strategy

The first test suite should cover:

- config load and save
- project matcher behavior
- bundle load and mutation
- reconcile expansion and projection diffing
- enable and disable behavior
- `remove` reference checks

Filesystem-heavy tests should use temporary directories and explicit fake home/project roots.

## Self-Review

Checked for placeholders, ambiguity, and contradictions. This spec is intentionally limited to a single MVP implementation cycle and excludes registry, watcher, and GUI work.
