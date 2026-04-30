# Failure Patterns

## `suspicious`

Meaning:

- entry missing `SKILL.md`
- reserved or malformed name
- non-store junk inside `skills/` or `bundles/`

Check:

```bash
aweskill doctor clean --verbose
aweskill agent list --verbose
```

Fix:

- store-side -> `aweskill doctor clean --apply`
- agent-side -> `aweskill doctor sync --apply --remove-suspicious ...` only when removal is intended

## `duplicate`

Meaning:

- multiple central-store skills collapse to one duplicate family
- multiple agent-side entries map to one canonical skill

Check:

```bash
aweskill doctor dedup
aweskill agent list --verbose
```

Fix:

- central store -> `aweskill doctor dedup --apply`
- agent side -> `aweskill doctor sync --apply ...`

## `matched`

Meaning:

- agent-side entry is name-matched to a canonical central skill and can be relinked

Fix:

```bash
aweskill doctor sync --global --agent codex
```

## `broken`

Meaning:

- managed projection target is stale or link target no longer resolves

Fix:

```bash
aweskill doctor sync --apply --global --agent codex
```

## `new`

Meaning:

- agent-side skill exists but central store does not manage it yet

Fix:

```bash
aweskill store import --scan --global --agent codex
```

## malformed `SKILL.md` frontmatter

Meaning:

- missing closing `---`
- invalid YAML in frontmatter
- file starts with body content and needs minimal frontmatter
- `name` or `description` is missing or unusable

Check:

```bash
aweskill doctor fix-skills --include-info --verbose
```

Fix:

- inspect first with `aweskill doctor fix-skills --include-info --verbose`
- rewrite with `aweskill doctor fix-skills --apply`
- add `--backup` when original files should be copied into `backup/fix_skills/` first
