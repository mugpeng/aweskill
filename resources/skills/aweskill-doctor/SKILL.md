---
name: aweskill-doctor
description: "Use when aweskill state is abnormal or repair-first: broken projections, duplicates, stale entries, suspicious or new matches, sync problems, malformed SKILL.md frontmatter, warnings, or unexpected post-install/projection state. 中文触发词：技能诊断、技能修复、损坏投影、重复技能、同步问题、异常条目、doctor clean、doctor dedup、doctor sync、doctor fix-skills。"
---

# Aweskill Doctor

Use this skill for diagnosis and repair. Start read-only, then mutate only after issue type is clear.

## Core Boundary

Use this skill for:

- `aweskill doctor clean`
- `aweskill doctor dedup`
- `aweskill doctor fix-skills`
- `aweskill doctor sync`
- interpreting `linked`, `broken`, `duplicate`, `matched`, `new`, and `suspicious`

Do not use this skill for normal imports, bundle edits, projection planning, bundle template workflows, recover flows, or routine projection. Use `$aweskill` for those.

## Default Triage Order

1. Inspect current state first.
2. Classify issue as store-side, frontmatter-side, or agent-side.
3. Choose read-only doctor command.
4. Decide whether mutation is required.
5. Re-run inspection after mutation.

Prefer these inspection commands:

- `aweskill store list --verbose`
- `aweskill bundle list --verbose`
- `aweskill agent list --verbose`
- `aweskill doctor clean --verbose`
- `aweskill doctor dedup`
- `aweskill doctor fix-skills --include-info --verbose`
- `aweskill doctor sync --verbose --global|--project [dir] --agent <id>`

## Mutation Rules

Use `doctor clean --apply` only after suspicious entries are understood.

Use `doctor dedup --apply` only after duplicate family intent is clear. Add `--delete` only when permanent removal is explicitly required.

Use `doctor fix-skills --apply` only after confirming the reported frontmatter categories are the ones you want normalized. Add `--backup` when the original `SKILL.md` files should be copied into `backup/fix_skills/` before rewrite.

Use `doctor sync --apply` only after confirming correct scope and agent target.

Use `--remove-suspicious` only when suspicious agent entries should actually be removed instead of reported.

## References

Read `references/triage.md` for the diagnosis decision tree.

Read `references/failure-patterns.md` for symptom-to-command mapping.
