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
aweskill doctor clean --skills-only --verbose    # scan only skills/
aweskill doctor clean --bundles-only --verbose   # scan only bundles/

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

# 2. Apply dedup (keeps canonical, moves duplicates to dup_skills/)
aweskill doctor dedup --apply

# 3. Backup before dedup (copies to backup/dedup first)
aweskill doctor dedup --apply --backup

# 4. If permanent removal is explicitly required
aweskill doctor dedup --apply --delete

# 5. For agent-side duplicates
aweskill doctor sync --global --agent <id> --apply
```

### SKILL.md Frontmatter is Malformed

`doctor fix-skills` reports missing closing `---`, invalid YAML, missing `name` or `description`, or files that start with body content.

```bash
# 1. Inspect with details
aweskill doctor fix-skills --include-info --verbose

# 2. Limit to specific skills
aweskill doctor fix-skills --skill <name1>,<name2> --verbose

# 3. Normalize frontmatter
aweskill doctor fix-skills --apply

# 4. If original files should be preserved first
aweskill doctor fix-skills --apply --backup
```

### Installed CLI Behaves Differently from Repo Code

Escalate to `$aweskill` — this is a Self-Update issue, not a doctor issue. The `$aweskill` skill handles CLI version mismatches via `aweskill self-update`.

## Quick Reference

### Inspection Commands (read-only)

- `aweskill store list --verbose` — central store contents
- `aweskill bundle list --verbose` — bundle overview
- `aweskill agent list [--scope] [--agent] --verbose` — projection state
- `aweskill doctor clean --verbose` — suspicious store entries (`--skills-only` / `--bundles-only` to narrow scope)
- `aweskill doctor dedup` — duplicate families
- `aweskill doctor fix-skills --include-info --verbose` — frontmatter issues (`--skill <name>` to limit scope)
- `aweskill doctor sync [--scope] [--agent] --verbose` — sync dry-run

### Mutation Commands (require --apply)

- `aweskill doctor clean --apply` — remove suspicious store entries
- `aweskill doctor dedup --apply` — resolve duplicates (add `--backup` to preserve first, `--delete` for permanent removal)
- `aweskill doctor fix-skills --apply` — normalize frontmatter (add `--backup` to preserve originals)
- `aweskill doctor sync --apply` — repair projections (add `--remove-suspicious` to remove unmanaged entries)

## References

- `references/triage.md` — diagnosis decision tree
- `references/failure-patterns.md` — symptom-to-command mapping
