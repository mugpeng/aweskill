# Triage

## Step 1: Identify side

- Store-side symptom: central `skills/` or `bundles/` looks wrong, suspicious files appear, duplicates exist, backup or list warns.
- Frontmatter-side symptom: one or more managed `SKILL.md` files have malformed frontmatter, invalid YAML, missing required fields, or normalization warnings.
- Agent-side symptom: projected skill is broken, duplicated, stale, foreign-looking, or missing after projection.

## Step 2: Start read-only

Store-side:

```bash
aweskill store list --verbose
aweskill bundle list --verbose
aweskill doctor clean --verbose
aweskill doctor dedup
```

Frontmatter-side:

```bash
aweskill doctor fix-skills --include-info --verbose
```

Agent-side:

```bash
aweskill agent list --global --agent codex --verbose
```

Or:

```bash
aweskill agent list --project /path/to/repo --agent cursor --verbose
```

## Step 3: Pick action

- Suspicious store entries -> `aweskill doctor clean --apply`
- Duplicate central-store skills -> `aweskill doctor dedup --apply`
- Malformed or incomplete `SKILL.md` frontmatter -> `aweskill doctor fix-skills --apply` and add `--backup` when original files should be preserved first
- Broken, duplicate, or matched agent projections -> `aweskill doctor sync ...` first, then `aweskill doctor sync --apply ...`
- Need removal of suspicious agent entries -> `aweskill doctor sync --apply --remove-suspicious ...`

## Step 4: Verify

Always rerun the same inspection command after mutation.
