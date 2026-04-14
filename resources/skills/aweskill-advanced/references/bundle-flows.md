# Bundle Flows

## Inspect template inventory

```bash
aweskill bundle template list --verbose
```

Use before importing built-in templates.

## Import a built-in template

```bash
aweskill bundle template import caveman
aweskill bundle show caveman
```

## Create a custom bundle from scratch

```bash
aweskill bundle create research
aweskill bundle add research literature-search,pdf,docx
aweskill bundle show research
```

## Refine an imported template

```bash
aweskill bundle remove caveman some-skill
aweskill bundle add caveman another-skill
aweskill bundle show caveman
```

## Validate before projection

Before `agent add bundle ...`, confirm:

- bundle exists
- bundle membership matches user intent
- central store already contains every referenced skill
