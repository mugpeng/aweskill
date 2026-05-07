---
name: aweskill-doctor
description: "Use when aweskill state is abnormal or repair-first: broken projections, duplicates, stale entries, suspicious or new matches, sync problems, malformed SKILL.md frontmatter, warnings, or unexpected post-install/projection state. 中文触发词：技能诊断、技能修复、损坏投影、重复技能、同步问题、异常条目、doctor clean、doctor dedup、doctor sync、doctor fix-skills。"
---

# Aweskill Doctor

Diagnose first. Mutate only with `--apply`. Verify after every mutation.

## Symptom Workflows

### Agent Cannot See a Skill

The user says a skill should be available but the agent doesn't show it.

```bash
# 1. Check what's projected
aweskill agent list --global --agent <id> --verbose

# 2. If the skill is missing from projections, sync it
aweskill doctor sync --global --agent <id>

# 3. Apply if dry-run reports repairable entries
aweskill doctor sync --global --agent <id> --apply

# 4. Verify
aweskill agent list --global --agent <id> --verbose
```

If the skill doesn't exist in the central store either, escalate to `$aweskill` for `find` / `install`.

### Projection is Broken

`agent list` shows `broken` — a managed symlink or copy target no longer resolves.

```bash
# 1. Inspect
aweskill agent list --global --agent <id> --verbose

# 2. Dry-run sync to see what would be repaired
aweskill doctor sync --global --agent <id>

# 3. Apply repair
aweskill doctor sync --global --agent <id> --apply

# 4. Verify
aweskill agent list --global --agent <id> --verbose
```

### Store Has Suspicious Files

`store list` or `doctor clean` reports suspicious entries — missing SKILL.md, reserved names, or junk files.

```bash
# 1. Inspect
aweskill doctor clean --verbose

# 2. Apply cleanup
aweskill doctor clean --apply

# 3. Verify
aweskill store list --verbose
```

Use `--remove-suspicious` on `doctor sync` only when suspicious agent entries should actually be removed instead of reported.

### Duplicate Skills Exist

Multiple central-store skills collapse to one duplicate family, or multiple agent-side entries map to one canonical skill.

```bash
# 1. Inspect
aweskill doctor dedup

# 2. Apply dedup (keeps canonical, removes duplicates)
aweskill doctor dedup --apply

# 3. If permanent removal is explicitly required
aweskill doctor dedup --apply --delete

# 4. For agent-side duplicates
aweskill doctor sync --global --agent <id> --apply
```

### SKILL.md Frontmatter is Malformed

`doctor fix-skills` reports missing closing `---`, invalid YAML, missing `name` or `description`, or files that start with body content.

```bash
# 1. Inspect with details
aweskill doctor fix-skills --include-info --verbose

# 2. Normalize frontmatter
aweskill doctor fix-skills --apply

# 3. If original files should be preserved first
aweskill doctor fix-skills --apply --backup
```

### Installed CLI Behaves Differently from Repo Code

The user reports that the installed `aweskill` doesn't match what they expect from the repository.

```bash
# 1. Check which binary is active
which aweskill

# 2. Check installed version vs npm latest
aweskill self-update --check

# 3. If dev branch is needed
aweskill self-update --dev --check
aweskill self-update --dev
```

If the issue persists, inspect the installed `dist/index.js` or global package target to confirm which code is actually running.

## Quick Reference

### Inspection Commands (read-only)

- `aweskill store list --verbose` — central store contents
- `aweskill bundle list --verbose` — bundle overview
- `aweskill agent list [--scope] [--agent] --verbose` — projection state
- `aweskill doctor clean --verbose` — suspicious store entries
- `aweskill doctor dedup` — duplicate families
- `aweskill doctor fix-skills --include-info --verbose` — frontmatter issues
- `aweskill doctor sync [--scope] [--agent] --verbose` — sync dry-run

### Mutation Commands (require --apply)

- `aweskill doctor clean --apply` — remove suspicious store entries
- `aweskill doctor dedup --apply` — resolve duplicates (add `--delete` for permanent removal)
- `aweskill doctor fix-skills --apply` — normalize frontmatter (add `--backup` to preserve originals)
- `aweskill doctor sync --apply` — repair projections (add `--remove-suspicious` to remove unmanaged entries)

## References

- `references/triage.md` — diagnosis decision tree
- `references/failure-patterns.md` — symptom-to-command mapping
