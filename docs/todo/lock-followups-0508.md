# Lock follow-ups - 0508

Context: the 0508 minimal fix made `skills-lock.json` writes use a temp file plus rename, made unsupported lock shapes visible with a warning, and added `tsc --noEmit` to the lint gate. The remaining items below are intentionally not part of that small fix because they change behavior or require a broader design decision.

## TODO

- [ ] Make corrupt lock reads fail closed.
  - Current behavior: `readSkillLock` warns and returns an empty lock when the file is corrupt or has an unsupported shape.
  - Risk: a later write can replace the old lock with an empty or partial history.
  - Preferred direction: distinguish missing lock from corrupt/incompatible lock. Missing lock can return empty; corrupt or incompatible lock should throw and let the CLI layer decide how to report and recover.
  - Verification: corrupt JSON and unsupported-version JSON should stop the command instead of silently continuing.

- [ ] Move lock warnings out of the lib layer.
  - Current behavior: `src/lib/lock.ts` calls `console.error` directly.
  - Risk: library code bypasses the CLI output layer and is harder to test or reuse.
  - Preferred direction: either throw from `readSkillLock` or route warnings through `RuntimeContext` at command boundaries.
  - Verification: user-visible warnings still appear through the normal CLI output path, with focused tests around one or two representative commands.

- [ ] Design real lock write concurrency.
  - Current behavior: temp-file rename protects the target file from partial writes, but `upsertSkillLockEntry` still does read-modify-write without cross-process coordination.
  - Risk: two concurrent aweskill processes can overwrite each other's lock updates.
  - Preferred direction: choose a file lock, journal, or retry/merge strategy before implementation.
  - Verification: a concurrency test should prove two independent updates are both preserved.

- [ ] Consider splitting Biome lint from the CI lint gate.
  - Current behavior: `npm run lint` runs Biome and `npm run typecheck`.
  - Benefit: CI catches type errors before tests.
  - Tradeoff: local lint is heavier than a pure formatter/linter pass.
  - Preferred direction: keep `lint` as the CI gate, and add `lint:biome` only if developers need a fast Biome-only command.
  - Verification: CI still runs type checking before tests.
