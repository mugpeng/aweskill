# SkillNexus-inspired follow-ups - 0511

Context: SkillNexus positions itself as a full-lifecycle AI Skill Studio: manage -> generate -> testcase -> eval -> evolve -> trending. `aweskill` should not copy that product shape directly. Its durable advantage is still CLI-first local skill orchestration across many agents.

The useful direction is to borrow the quality loop, not the whole desktop studio:

- keep `aweskill` focused on local store, source lifecycle, bundle, projection, and repair
- add small commands that make skills runnable, measurable, and maintainable
- prefer JSON-capable CLI surfaces that agents and CI can call
- avoid hidden activation state, broad automatic rewrites, or Electron-only workflows

## Priority 0 - readiness first

- [ ] Add `doctor status` as a read-only readiness probe.
  - Why: before evaluating or evolving skills, agents need a stable way to know whether the store and projection state are usable.
  - Shape:
    - `aweskill doctor status --global --agent codex`
    - `aweskill doctor status --project . --agent codex`
    - `aweskill doctor status --global --agent codex --json`
  - Reuse:
    - existing store initialization checks
    - existing `agent list` classification logic
    - existing `doctor clean` hygiene logic
  - Do not:
    - add `--apply`
    - run repairs
    - invent a second diagnostic model
  - Output should include readiness, counts, and suggested next commands.

## Priority 1 - run skills directly

- [ ] Add a minimal `aweskill run <skill>` command.
  - Why: SkillNexus has a Quick Run path; `aweskill` needs the CLI equivalent before eval/history/evolution can be useful.
  - Shape:
    - `aweskill run <skill> --input "..."`
    - `aweskill run <skill> --stdin`
    - `aweskill run <skill> --json`
  - Resolution:
    - prefer central-store skill names
    - optionally accept explicit local skill paths later
  - Behavior:
    - read `SKILL.md`
    - execute by sending the skill instructions plus input to the configured model/provider
    - print plain output by default
    - print structured metadata with `--json`
  - Open design question:
    - whether provider configuration belongs in `~/.aweskill/config.json`, environment variables only, or a small provider subcommand.

- [ ] Keep `run` file-system first and optional-provider aware.
  - Do not require SQLite, Electron, or a background service.
  - Fail clearly when no provider/API key is configured.
  - Keep provider secrets out of normal command output and JSON logs.

## Priority 2 - execution history

- [ ] Add append-only execution logs.
  - Why: SkillNexus issue planning points at MCP/skill execution history as the real production signal. `aweskill` can capture the same value locally.
  - Candidate path:
    - `~/.aweskill/logs/execution.ndjson`
  - Suggested fields:
    - `id`
    - `skill`
    - `input`
    - `output`
    - `model`
    - `durationMs`
    - `caller`
    - `createdAt`
    - `success`
    - `error`
  - Commands:
    - `aweskill history <skill>`
    - `aweskill history <skill> --json`
    - `aweskill history clear <skill>` only after an explicit design decision
  - Safety:
    - document that logs may contain sensitive user input
    - consider `--no-log` on `run`
    - consider global config for log retention

- [ ] Make execution history reusable as test cases.
  - Shape:
    - `aweskill testcase from-history <skill>`
    - `aweskill testcase from-history <skill> --out SKILL.tests.yaml`
  - Keep this conservative:
    - generate candidate test cases
    - do not automatically accept all history as ground truth
    - include fields that let users edit expected outputs or judge rules

## Priority 3 - lightweight eval

- [ ] Add `aweskill eval <skill>` with companion test files.
  - Why: the most important SkillNexus idea is making skills measurable.
  - Shape:
    - `aweskill eval <skill>`
    - `aweskill eval <skill> --case SKILL.tests.yaml`
    - `aweskill eval <skill> --json`
  - Test file convention:
    - `SKILL.tests.yaml` beside a skill directory or in a predictable store location
  - Judge types:
    - `grep` for expected text
    - `command` for deterministic local checks
    - `llm` for subjective quality only when configured
  - Initial dimensions:
    - correctness
    - instruction following
    - safety
    - completeness
    - robustness
    - executability
    - cost awareness
    - maintainability
  - Keep scoring explainable:
    - per-case result
    - per-dimension score
    - short reason
    - raw JSON for agents/CI

- [ ] Store eval results as local artifacts.
  - Candidate path:
    - `~/.aweskill/evals/<skill>/<timestamp>.json`
  - Later commands:
    - `aweskill eval history <skill>`
    - `aweskill eval show <run-id>`

## Priority 4 - improve without overwriting

- [ ] Add a conservative `aweskill improve <skill>` command.
  - Why: SkillNexus evolution is useful, but automatic rewriting is risky in a local package manager.
  - Shape:
    - `aweskill improve <skill> --from-eval latest --out <dir>`
    - `aweskill improve <skill> --from-history --out <dir>`
    - `aweskill improve <skill> --json`
  - Behavior:
    - generate candidate improved skill directories
    - include a summary of changes and rationale
    - never overwrite the managed store by default
    - require explicit `--apply` if applying is ever added
  - Inputs:
    - latest eval failures
    - repeated history failures
    - existing `SKILL.md`
  - Guardrails:
    - preserve frontmatter unless changes are justified
    - preserve linked references/scripts unless explicitly changed
    - output a diff-friendly directory

## Priority 5 - local score and trending view

- [ ] Add local score commands.
  - Why: SkillNexus Trending is useful as an asset map. `aweskill` can expose the same idea in CLI form.
  - Shape:
    - `aweskill score list`
    - `aweskill score list --json`
    - `aweskill score top --by maintainability`
    - `aweskill score stale`
  - Inputs:
    - eval history
    - execution history
    - source/update metadata
  - Useful signals:
    - latest total score
    - failing dimensions
    - last evaluated
    - last used
    - source update available
    - recommended maintenance action

## Priority 6 - MCP/API only after CLI shape is stable

- [ ] Consider an MCP or JSON-RPC server after `run`, `history`, and `eval` stabilize.
  - Why: SkillNexus exposes JSON-RPC transports, but `aweskill` should avoid adding a service layer before command semantics are solid.
  - Candidate methods:
    - `skill.run`
    - `skill.eval`
    - `skill.history`
    - `store.list`
    - `agent.status`
  - Rule:
    - MCP/API should wrap existing CLI/library behavior, not create parallel semantics.

## Not now

- [ ] Do not build an Electron desktop studio.
  - Reason: it shifts `aweskill` away from its CLI-first, agent-callable package-manager role.

- [ ] Do not add a complex multi-engine evolution framework first.
  - Reason: `run`, history, and eval are prerequisites for useful evolution.

- [ ] Do not add a hidden global activation registry.
  - Reason: projected filesystem state should remain the activation model.

- [ ] Do not make generated/evolved skills overwrite managed store entries by default.
  - Reason: local skills are user state; destructive replacement should be explicit and reviewable.

## Suggested implementation order

1. `doctor status --json`
2. `run <skill>`
3. execution log + `history`
4. `SKILL.tests.yaml` convention + `eval`
5. `testcase from-history`
6. `improve --out`
7. `score list/top/stale`
8. MCP/JSON-RPC wrapper
