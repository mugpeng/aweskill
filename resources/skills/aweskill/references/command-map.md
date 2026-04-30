# Command Map

## Store Work

- Find aweskill home and core directories -> `aweskill store where --verbose`
- See what is already in central store -> `aweskill store list --verbose`
- Inspect one managed local skill -> `aweskill store show <skill>`
- Discover agent-side skills before import -> `aweskill store scan [--global|--project [dir]] [--agent <id>] --verbose`
- Import scanned agent skills -> `aweskill store import --scan [--global|--project [dir]] [--agent <id>]`
- Import external skill folder -> `aweskill store import <path>`
- Remove one central-store skill -> `aweskill store remove <skill>`

## Source Lifecycle

- Search upstream skill sources -> `aweskill find <query>`
- Search only the local central store -> `aweskill find <query> --local` or `aweskill find <query> --provider local`
- Install a discovered skill into the central store -> `aweskill install <source>` or `aweskill store install <source>`
- Install one skill from a multi-skill source -> `aweskill store install <source> --skill <name>`
- Install every skill from a multi-skill source -> `aweskill store install <source> --all`
- Check tracked skills for updates -> `aweskill update --check`
- Refresh one or more tracked skills -> `aweskill update [skill...]`
- Use `--domain` or `--stage` filters only with sciskill -> `aweskill find <query> --provider sciskill --domain "<value>" --stage "<value>"`

## Bundle Work

- See bundles -> `aweskill bundle list --verbose`
- Create bundle -> `aweskill bundle create <name>`
- Edit bundle membership -> `aweskill bundle add <bundle> <skill>` or `aweskill bundle remove <bundle> <skill>`
- Inspect bundle -> `aweskill bundle show <name>`
- Import built-in bundle template -> `aweskill bundle template import <name>`

## Projection Work

- See supported agents -> `aweskill agent supported`
- Inspect projected agent state -> `aweskill agent list [--global|--project [dir]] [--agent <id>] --verbose`
- Project one skill or bundle -> `aweskill agent add skill|bundle ...`
- Remove one managed projection -> `aweskill agent remove skill|bundle ...`
- Recover one agent root into copied directories -> `aweskill agent recover [--global|--project [dir]] --agent <id>`

## Escalation

- Need cross-scope planning, recover, or template-driven maintenance -> use `$aweskill`
- Need to clean suspicious entries, deduplicate, or repair broken projections -> use `$aweskill-doctor`
