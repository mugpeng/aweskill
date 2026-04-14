# Common Flows

## Bootstrap a fresh store

```bash
aweskill store init
aweskill store where --verbose
aweskill store scan
aweskill store import --scan
```

Use when central store is not initialized and agent skill directories already exist.

## Import one standalone skill

```bash
aweskill store import /path/to/skill
```

Add `--link-source` only when source path should be replaced by an aweskill-managed projection.

## Import a whole skills root

```bash
aweskill store import /path/to/skills-root
aweskill store list --verbose
```

Use when source directory contains multiple skills.

## Create and inspect a bundle

```bash
aweskill bundle create backend
aweskill bundle add backend api-design,db-schema
aweskill bundle show backend
```

## Project a skill into one agent

```bash
aweskill agent add skill pr-review --global --agent codex
aweskill agent list --global --agent codex --verbose
```

## Project a bundle into one project-scoped agent root

```bash
aweskill agent add bundle backend --project /path/to/repo --agent cursor
aweskill agent list --project /path/to/repo --agent cursor --verbose
```

## Remove one skill from the central store

```bash
aweskill store list --verbose
aweskill store remove my-skill
```

Use `--force` only when task explicitly requires cleaning references during removal.
