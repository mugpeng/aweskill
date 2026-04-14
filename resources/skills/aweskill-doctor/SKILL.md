---
name: aweskill-doctor
description: Diagnose and fix skill store problems — broken projections, duplicates, stale entries, sync issues. Use when skills report suspicious, broken, duplicate, matched, or new entries, or when agent list shows anything outside linked. Handles doctor clean, dedup, sync, and agent-side repair. Trigger when skill installation or projection produces errors, warnings, or unexpected state.
---

# Aweskill Doctor

Use this skill for diagnosis and repair. Start read-only, then mutate only after issue type is clear.

## Core Boundary

Use this skill for:

- `aweskill doctor clean`
- `aweskill doctor dedup`
- `aweskill doctor sync`
- interpreting `linked`, `broken`, `duplicate`, `matched`, `new`, and `suspicious`

Do not use this skill for normal imports, bundle edits, or routine projection. Use `$aweskill` for those.

## Default Triage Order

1. Inspect current state first.
2. Classify issue as store-side or agent-side.
3. Choose read-only doctor command.
4. Decide whether mutation is required.
5. Re-run inspection after mutation.

Prefer these inspection commands:

- `aweskill store list --verbose`
- `aweskill bundle list --verbose`
- `aweskill agent list --verbose`
- `aweskill doctor clean --verbose`
- `aweskill doctor dedup`
- `aweskill doctor sync --verbose --global|--project [dir] --agent <id>`

## Mutation Rules

Use `doctor clean --apply` only after suspicious entries are understood.

Use `doctor dedup --apply` only after duplicate family intent is clear. Add `--delete` only when permanent removal is explicitly required.

Use `doctor sync --apply` only after confirming correct scope and agent target.

Use `--remove-suspicious` only when suspicious agent entries should actually be removed instead of reported.

## References

Read `references/triage.md` for the diagnosis decision tree.

Read `references/failure-patterns.md` for symptom-to-command mapping.
