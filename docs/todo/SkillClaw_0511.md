# SkillClaw-inspired follow-ups - 0511

Context: [SkillClaw](https://github.com/AMAP-ML/SkillClaw) positions itself as a collective skill evolution system. It is not only a skill package manager. It runs a local proxy, records real agent sessions, syncs skill bundles through local or object storage, and can run an optional evolve server that turns session data into improved or new skills.

`aweskill` should not copy that whole shape. Its durable advantage is still CLI-first local skill orchestration: one central store, source-aware install and update, bundles, projection into many agents, and doctor workflows for repair. The useful lesson from SkillClaw is the lifecycle around skills after installation: quality metadata, staged review, manifest sync, readable reports, and optional evolution.

## Product boundary

- Keep `aweskill` as a local skill package manager, not a background agent platform.
- Treat `~/.aweskill/skills/` as the canonical store and projected filesystem state as activation.
- Add lifecycle commands that agents and CI can call through the CLI.
- Prefer explicit local metadata over hidden telemetry.
- Put generated or evolved skills into staged review before they can affect the managed store.
- Make any server, proxy, or LLM-powered evolution feature optional and layered on top of stable CLI behavior.

## What SkillClaw teaches

SkillClaw has several ideas worth learning from:

- Session capture: a proxy can observe real agent usage and convert repeated experience into skill improvements.
- Skill quality data: skills can have usage counts, feedback signals, effectiveness scores, and version history.
- Shared skill hub: a manifest with hashes, versions, authorship, and storage keys makes team sync safer than copying folders.
- Validation: candidate skills should be checked before becoming shared official skills.
- Dashboard: once skills have state, users need a visual way to inspect local skills, shared skills, validation jobs, versions, and session traces.
- Evolution loop: generation and improvement are useful only after there is enough execution history and evaluation signal.

The direct aweskill translation is:

```text
install/import -> validate -> staged review -> approve -> project -> run/eval/history -> score/report -> optional improve
```

## Priority 0 - skill quality metadata

- [ ] Add a local quality metadata model.
  - Why: `aweskill` knows where skills live, but not whether a skill is reviewed, risky, stale, useful, or failing.
  - Candidate path:
    - `~/.aweskill/metadata/skills/<skill>.json`
  - Suggested fields:
    - `skill`
    - `lastReviewedAt`
    - `reviewedBy`
    - `rating`
    - `notes`
    - `knownIssues`
    - `lastValidatedAt`
    - `validationStatus`
    - `tags`
    - `source`
  - Initial commands:
    - `aweskill store quality list`
    - `aweskill store quality show <skill>`
    - `aweskill store quality set <skill> --rating 4 --note "..."`
    - `aweskill store quality unset <skill> --field rating`
  - Rules:
    - Keep quality metadata out of `SKILL.md`.
    - Do not record user prompts or secrets in quality metadata.
    - Make `--json` available from the beginning.

## Priority 1 - explicit validation

- [ ] Add `aweskill store validate`.
  - Why: SkillClaw validates candidates in its broader workflow. `aweskill` can start with deterministic local validation before any LLM-powered judging.
  - Shape:
    - `aweskill store validate`
    - `aweskill store validate <skill>`
    - `aweskill store validate <skill> --json`
  - Checks:
    - `SKILL.md` exists.
    - YAML frontmatter parses.
    - `name` and `description` are present.
    - directory name and frontmatter name are compatible.
    - referenced `scripts/`, `references/`, `assets/`, and templates exist.
    - skill body is not empty.
    - description contains concrete trigger conditions.
    - dangerous instructions are reported, not automatically fixed.
  - Output:
    - `error` for invalid package shape.
    - `warning` for maintainability or safety risks.
    - `info` for optional improvements.
  - Do not:
    - rewrite files by default.
    - merge this into `doctor fix-skills`; validation and repair should stay separate.

## Priority 2 - staged candidate skills

- [ ] Add a staging area for imported, generated, or evolved skills.
  - Why: SkillClaw's validation flow suggests that new skills should not immediately become active store entries.
  - Candidate path:
    - `~/.aweskill/staged/<skill>/`
  - Candidate metadata:
    - `~/.aweskill/staged/<skill>/_review.json`
  - Commands:
    - `aweskill store import <path> --staged`
    - `aweskill staged list`
    - `aweskill staged show <skill>`
    - `aweskill staged validate <skill>`
    - `aweskill staged approve <skill>`
    - `aweskill staged reject <skill>`
  - Behavior:
    - staged skills are never projected.
    - approval moves or copies a candidate into `~/.aweskill/skills/`.
    - approval must detect conflicts with existing store skills.
    - rejection should keep an optional review record before deletion or archive.
  - Do not:
    - silently overwrite central-store skills.
    - let bundles reference staged skills unless explicitly designed later.

## Priority 3 - manifest-based sync

- [ ] Add local manifest export and dry-run sync.
  - Why: SkillClaw's shared hub uses manifests, hashes, versions, and backup-safe pull behavior. `aweskill` can borrow the safety model without requiring OSS or S3 first.
  - Shape:
    - `aweskill store export ./team-skills`
    - `aweskill store sync ./team-skills --dry-run`
    - `aweskill store sync ./team-skills --apply`
    - `aweskill store sync ./team-skills --json`
  - Manifest fields:
    - `name`
    - `description`
    - `version`
    - `treeSha256`
    - `files`
    - `source`
    - `updatedAt`
    - `status`
  - Rules:
    - hash the whole skill bundle, not only `SKILL.md`.
    - default to dry-run.
    - report added, updated, unchanged, conflicted, and missing skills.
    - create a backup before apply.
    - never mirror-delete local skills unless a separate explicit flag is designed.
  - Later:
    - Git remote sync.
    - S3 or OSS adapters.
    - team policy files.

## Priority 4 - readable report first, dashboard later

- [ ] Add a static report before building an interactive dashboard.
  - Why: SkillClaw's dashboard is useful because the system has many state dimensions. `aweskill` can start with a static local report that is easier to maintain.
  - Shape:
    - `aweskill doctor report --html`
    - `aweskill doctor report --json`
  - Sections:
    - store summary
    - bundles summary
    - supported and detected agents
    - linked, broken, duplicate, matched, new, suspicious projection counts
    - validation warnings
    - staged candidates
    - tracked source update status
    - duplicate skill groups
    - recommended next commands
  - Rules:
    - report command is read-only.
    - HTML should be self-contained.
    - JSON should be stable enough for agents and CI.

## Priority 5 - optional run, history, and eval

- [ ] Consider `aweskill run <skill>` only after the package lifecycle is clearer.
  - Why: SkillClaw gets quality signal from real usage. A local `run` command could give `aweskill` a smaller explicit path to usage history.
  - Shape:
    - `aweskill run <skill> --input "..."`
    - `aweskill run <skill> --stdin`
    - `aweskill run <skill> --json`
  - Requirements:
    - provider config must be explicit.
    - secrets must not appear in logs.
    - users need `--no-log`.

- [ ] Add execution history only after logging policy is clear.
  - Candidate path:
    - `~/.aweskill/logs/execution.ndjson`
  - Fields:
    - `id`
    - `skill`
    - `input`
    - `output`
    - `model`
    - `durationMs`
    - `createdAt`
    - `success`
    - `error`
  - Safety:
    - logs can contain sensitive input.
    - retention and opt-out need to be designed before default-on logging.

- [ ] Add `aweskill eval <skill>` after validation and staged review exist.
  - Test convention:
    - `SKILL.tests.yaml`
  - Judge types:
    - `grep`
    - `command`
    - `llm` only when configured
  - Output:
    - per-case result
    - per-dimension score
    - short reason
    - JSON for CI

## Priority 6 - optional improve/evolve plugin

- [ ] Keep automatic improvement out of the core path at first.
  - Why: SkillClaw's evolution loop is powerful, but it brings model calls, privacy questions, conflict resolution, generated content quality, and background services.
  - Safer shape:
    - `aweskill improve <skill> --from-eval latest --out <dir>`
    - `aweskill improve <skill> --from-history --out <dir>`
    - `aweskill evolve from-log ./session.md --staged`
  - Rules:
    - generated skills go to staged review.
    - never overwrite managed store entries by default.
    - output a diff-friendly candidate directory.
    - include a rationale file.

## Not now

- [ ] Do not add a local proxy to core `aweskill`.
  - Reason: proxying agent requests changes the product from package manager to runtime platform.

- [ ] Do not add hidden telemetry.
  - Reason: local-first trust matters more than automatic scoring.

- [ ] Do not add OSS/S3 sharing before local manifest sync is solid.
  - Reason: remote storage multiplies conflict, credential, and rollback complexity.

- [ ] Do not build a full dashboard before a static report exists.
  - Reason: reports clarify the data model first.

- [ ] Do not let generated skills skip review.
  - Reason: generated instructions are executable behavior for agents and should be inspectable before activation.

## Suggested implementation order

1. `store quality` metadata commands
2. `store validate`
3. `staged` import, list, show, validate, approve, reject
4. `store export` and local manifest `store sync --dry-run`
5. `doctor report --json` and `doctor report --html`
6. optional `run <skill>`
7. execution history and `eval`
8. optional `improve` or `evolve` plugin

## Reading list

- SkillClaw README: https://github.com/AMAP-ML/SkillClaw/blob/main/README.md
- SkillClaw CLI: https://github.com/AMAP-ML/SkillClaw/blob/main/skillclaw/cli.py
- SkillClaw skill manager: https://github.com/AMAP-ML/SkillClaw/blob/main/skillclaw/skill_manager.py
- SkillClaw skill hub: https://github.com/AMAP-ML/SkillClaw/blob/main/skillclaw/skill_hub.py
- aweskill design notes: `docs/DESIGN.md`
