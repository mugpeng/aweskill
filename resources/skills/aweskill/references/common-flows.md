# Common Flows

## Store Bootstrap

```bash
aweskill store init
aweskill store where --verbose
aweskill store scan
aweskill store import --scan
```

Use when central store is not initialized and agent skill directories already exist.

## Source Discovery and Install

```bash
aweskill find pr-review
aweskill install owner/repo
aweskill store list --verbose
```

Use when skill source is upstream and should be tracked for later updates.

## Source Update Check and Refresh

```bash
aweskill update --check
aweskill update pr-review
```

Use `--override` only when local central-store edits should be replaced.

## Import One Standalone Skill

```bash
aweskill store import /path/to/skill
```

Add `--link-source` only when source path should be replaced by an aweskill-managed projection.

## Import a Whole Skills Root

```bash
aweskill store import /path/to/skills-root
aweskill store list --verbose
```

Use when source directory contains multiple skills.

## Create and Inspect a Bundle

```bash
aweskill bundle create backend
aweskill bundle add backend api-design,db-schema
aweskill bundle show backend
```

## Project a Skill into One Agent

```bash
aweskill agent add skill pr-review --global --agent codex
aweskill agent list --global --agent codex --verbose
```

## Project a Bundle into One Project-Scoped Agent Root

```bash
aweskill agent add bundle backend --project /path/to/repo --agent cursor
aweskill agent list --project /path/to/repo --agent cursor --verbose
```

## Recover One Agent Root

```bash
aweskill agent recover --global --agent codex
aweskill agent list --global --agent codex --verbose
```

Use when a copied agent root is needed from managed projections instead of symlinks or junctions.

## Remove One Skill from the Central Store

```bash
aweskill store list --verbose
aweskill store remove my-skill
```

Use `--force` only when task explicitly requires cleaning references during removal.
