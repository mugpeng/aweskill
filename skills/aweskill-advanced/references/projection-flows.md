# Projection Flows

## Choose scope first

- Use `--global` when task targets shared agent roots under the home directory.
- Use `--project [dir]` when task targets one repository-local agent root.
- Do not mix both in one command.

## Inspect before projecting

```bash
aweskill agent supported
aweskill agent list --global --agent codex --verbose
```

Use project scope variant when task is repo-local:

```bash
aweskill agent list --project /path/to/repo --agent cursor --verbose
```

## Project one bundle to many agents

```bash
aweskill agent add bundle backend --global --agent codex,cursor
aweskill agent list --global --agent codex,cursor --verbose
```

Use when one bundle should fan out to a controlled agent set.

## Remove a bundle projection from one scope

```bash
aweskill agent remove bundle backend --project /path/to/repo --agent cursor
```

## Convert managed links into copied directories

```bash
aweskill agent recover --global --agent codex
```

Run this only when task explicitly needs full local directories instead of managed projections.
