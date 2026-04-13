# change log

## v0.1.7

`v0.1.7` is the release where `aweskill` starts feeling more like a maintained toolkit than a loose pile of commands. Since `v0.1.6`, the project got a cleaner resource layout, a more defensible internal foundation, and a much more practical store backup story. The shape of the repo is clearer, the CLI is less fragile, and the workflows around templates, archives, and bundle state finally line up with how people actually use the tool.

### This is the release where aweskill gets a proper home for shared resources.

The repository now has a clearer split between runtime state and in-repo assets. Built-in bundle templates moved into `resources/bundle_templates/`, `docs/CONTRIBUTING.md` now lives where contributors expect to find it, and `resources/skill_archives/` was reserved for shareable repository-level archives. That cleanup is small on paper, but it matters: templates, docs, and distributable resources now have stable, documented locations instead of feeling incidental. `aweskill` is easier to package, easier to document, and easier to extend without guessing where things belong.

### This is the release where the CLI stopped hardcoding what the package already knows.

`aweskill` now reads its version from `package.json` through a dedicated `AWESKILL_VERSION` module, rather than relying on a string buried in the CLI entrypoint. Along the way, repeated filesystem checks were centralized into `src/lib/fs.ts`, and the codebase picked up a stronger test surface for fs helpers, imports, symlink behavior, command flows, and version consistency. This is mostly invisible when everything works, which is the point. `v0.1.7` reduces duplication, makes the package metadata the source of truth, and gives future changes a better chance of staying correct after build and release.

### This is the release where store backup finally understands the whole store.

The biggest user-facing change in `v0.1.7` is that `aweskill store backup` and `aweskill store restore` now handle more realistic backup workflows. You can pass `--both` to include bundle definitions alongside skills, restore them together, and make sure the automatic pre-restore backup captures the same scope. `store backup` also accepts an optional archive destination, including a target directory that will receive a timestamped archive using the default naming scheme. The README examples were updated to reflect that new flow. In practice, this means backing up `aweskill` is no longer just about preserving `skills/`; it can now preserve the bundle structure that makes those skills usable.

### Highlights

- Moved built-in bundle templates into `resources/bundle_templates/` and documented repo-level archives under `resources/skill_archives/`.
- Centralized `pathExists` and introduced `src/lib/version.ts` so the CLI version comes from `package.json`.
- Added coverage for fs utilities, import behavior, symlink handling, version resolution, and new backup/restore command paths.
- Added `aweskill store backup [archive] [--both]`.
- Added `aweskill store restore <archive> [--override] [--both]`.
- Enabled directory targets for `store backup`, which now emit a default timestamped `skills-*.tar.gz` archive into the chosen folder.
