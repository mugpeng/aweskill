# Vibe-Skills-inspired follow-ups - 0511

Context: Vibe-Skills positions itself as a governed super-skill harness: one public entry, staged execution, selected specialist skills, evidence-backed delivery, and workspace continuity. `aweskill` should not copy that runtime. Its durable role is still the local-first system manager for skills, bundles, projections, updates, and repair.

The useful lesson is concrete:

- do not only distribute individual skills
- distribute callable workflow entries
- make those workflow entries easy to install, project, check, and explain
- treat "ready for this agent" as the user-facing success state, not just "linked"

## Product thesis

`aweskill` should become the best local manager for workflow-capable AI agents.

Current framing:

```text
aweskill manages local AI agent skills across tools.
```

Better framing:

```text
aweskill turns scattered skills into installable, reusable, checkable workflow systems for local AI agents.
```

This keeps `aweskill` inside its existing boundary:

- central store remains the source of truth
- projection remains filesystem-based
- doctor remains the repair path
- bundles remain expansion sets
- no hidden runtime authority
- no global activation registry

## Priority 0 - profile vocabulary

- [ ] Introduce `profile` as a user-facing alias over curated bundle templates.
  - Why: users do not want to choose ten skills manually; they want a ready workflow capability.
  - Shape:
    - `aweskill profile list`
    - `aweskill profile show coding`
    - `aweskill profile install coding --global --agent codex`
    - `aweskill profile remove coding --global --agent codex`
  - Implementation rule:
    - a profile expands to a bundle plus optional entry skill and usage text
    - do not create a second activation model
    - internally reuse existing bundle install/projection logic
  - Initial profiles:
    - `coding`
    - `research`
    - `publishing`
    - `frontend`
    - `agent-maintenance`

- [ ] Keep existing `bundle` commands stable.
  - `profile` should be a higher-level UX path.
  - `bundle` should remain the precise lower-level object.

## Priority 1 - workflow entry skills

- [ ] Add one entry skill per curated profile.
  - Why: Vibe-Skills has one memorable entry (`vibe`). A profile should not be just a pile of supporting skills.
  - Suggested entries:
    - `coding-workflow`
    - `research-workflow`
    - `publishing-workflow`
    - `frontend-workflow`
    - `agent-maintenance-workflow`
  - Each entry skill should define:
    - when the workflow should be used
    - which supporting skills are selected at each phase
    - which skills are optional
    - expected completion evidence
    - non-goals
  - Do not:
    - add a runtime state machine
    - call sub-skills automatically from the CLI
    - create a second router outside the agent's skill system

- [ ] Start with `coding-workflow`.
  - Supporting skills:
    - `brainstorming`
    - `systematic-debugging`
    - `test-driven-development`
    - `verification-before-completion`
    - `requesting-code-review`
    - `subagent-driven-development`
  - User-facing result:
    - "Codex now has a callable coding workflow."

## Priority 2 - install-and-check flow

- [ ] Add `aweskill profile check <name>`.
  - Why: Vibe-Skills sells verified readiness. `aweskill` should make readiness visible without becoming the runtime.
  - Shape:
    - `aweskill profile check coding --global --agent codex`
    - `aweskill profile check coding --project . --agent codex`
    - `aweskill profile check coding --global --agent codex --json`
  - Checks:
    - profile exists
    - entry skill exists in central store
    - required skills exist in central store
    - entry skill is projected to target agent
    - required skills are projected to target agent
    - no broken projections
    - no duplicates for profile skills
    - no suspicious entry blocks the profile path
  - Output language:
    - `ready`
    - `partially ready`
    - `not ready`
  - Suggested next command should be printed when not ready.

- [ ] Print a usage card after profile installation.
  - Example:

```text
Coding profile is ready in Codex.

Entry skill:
- coding-workflow

Supporting skills:
- brainstorming
- systematic-debugging
- test-driven-development
- verification-before-completion
- requesting-code-review

Try:
- "Use coding-workflow to implement this feature."
- "Use coding-workflow to debug this failing test."
- "Review this change with requesting-code-review."
```

## Priority 3 - quickstart command

- [ ] Add `aweskill quickstart`.
  - Why: Vibe-Skills reduces the first-run path to one memorable entry. `aweskill` needs the equivalent for setup.
  - Shape:
    - `aweskill quickstart`
    - `aweskill quickstart coding`
    - `aweskill quickstart coding --global --agent codex`
    - `aweskill quickstart --project . --agent cursor`
  - Behavior:
    - detect installed agents when possible
    - recommend a profile when none is passed
    - install/import missing profile skills
    - project to the selected target
    - run `profile check`
    - print usage card
  - Guardrails:
    - inspect before mutating
    - ask only when target scope or agent is ambiguous
    - do not broadly project to all agents unless explicit

## Priority 4 - profile template layout

- [ ] Add a profile template resource layout.
  - Candidate path:

```text
resources/profile_templates/coding/
├── profile.yaml
├── README.md
├── usage.md
└── skills/
    └── coding-workflow/
        └── SKILL.md
```

  - `profile.yaml` fields:
    - `name`
    - `title`
    - `description`
    - `entry`
    - `requires`
    - `optional`
    - `tags`
    - `agents`
    - `usage`
    - `checks`
  - Store behavior:
    - built-in entry skills can be imported into the central store during profile install
    - supporting skills must resolve through existing store/bundle mechanisms

- [ ] Keep profile templates separate from runtime bundles until the model stabilizes.
  - Reason: this makes the UX experiment reversible.

## Priority 5 - super-skill install detection

- [ ] Detect workflow/super-skill repositories during `install`.
  - Why: Vibe-Skills is a super-skill package. `aweskill` should be good at managing packages like it.
  - Signals:
    - root `SKILL.md`
    - install/check scripts
    - bundled skills directory
    - profile/minimal/full docs
    - runtime/protocol docs
  - Output:

```text
Detected workflow-style skill package.

Entry:
- vibe

Install options:
- aweskill install <source> --skill vibe
- aweskill install <source> --all

Note:
This package may include its own runtime installer. aweskill can manage projection,
but it will not replace the package's runtime setup unless explicitly supported.
```

- [ ] Do not execute third-party install scripts automatically.
  - Reason: `aweskill` should remain conservative with user state.
  - If scripts are found, show them and require explicit user action.

## Priority 6 - README repositioning

- [ ] Rewrite the README first screen around three concrete outcomes.
  - Outcome 1: give one agent a workflow profile.
  - Outcome 2: reuse the same profile across agents.
  - Outcome 3: repair local skill state.
  - Candidate first commands:

```bash
aweskill quickstart coding --global --agent codex
aweskill profile install research --global --agent claude-code
aweskill doctor sync --global --agent cursor
```

- [ ] Move low-level central-store explanation lower in the README.
  - The central store is still the architecture.
  - It should not be the first user-facing promise.

## Priority 7 - JSON surfaces for agents and CI

- [ ] Add JSON output to profile commands.
  - Required:
    - `profile list --json`
    - `profile show <name> --json`
    - `profile check <name> --json`
  - Suggested fields:
    - `profile`
    - `entry`
    - `requiredSkills`
    - `optionalSkills`
    - `target`
    - `status`
    - `issues`
    - `suggestedCommands`

## Not now

- [ ] Do not implement a Vibe-like runtime state machine.
  - Reason: that belongs inside a workflow skill, not inside `aweskill`.

- [ ] Do not add workspace memory to `aweskill`.
  - Reason: memory is runtime/user-workspace behavior; `aweskill` manages skill assets and projections.

- [ ] Do not add automatic specialist routing inside the CLI.
  - Reason: routing is host/runtime behavior. `aweskill` can install the routing skill, not become the router.

- [ ] Do not make profile activation hidden.
  - Reason: projected filesystem state should remain the activation model.

## Suggested MVP

1. Create `resources/profile_templates/coding/`.
2. Add `coding-workflow` entry skill.
3. Add `aweskill profile list`.
4. Add `aweskill profile install coding --global --agent codex`.
5. Add `aweskill profile check coding --global --agent codex`.
6. Print the post-install usage card.
7. Update README with the workflow-profile story.

## Success criteria

The first MVP is successful when a user can run:

```bash
aweskill profile install coding --global --agent codex
aweskill profile check coding --global --agent codex
```

and get:

```text
profile: coding
entry: coding-workflow
target: codex global
status: ready
```

The user should understand what to ask the agent next without reading the bundle internals.
