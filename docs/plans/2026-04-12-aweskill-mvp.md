# aweskill MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local TypeScript CLI for central skill management, bundle activation, and reconcile-based projection into agent skill directories.

**Architecture:** The CLI writes file-based state into `~/.aweskill`, loads global and project activations, expands bundles into skills, then reconciles expected projections into agent-specific directories. Command handlers remain thin and call focused library modules for config, bundles, reconcile, and import logic.

**Tech Stack:** Node.js, TypeScript, Commander.js, YAML, Vitest, tsup, tsx

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `src/index.ts`

**Step 1: Write the failing test**

Write a smoke test that imports the CLI module and verifies command registration is available.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because the project scaffold does not exist yet.

**Step 3: Write minimal implementation**

Create the package, TypeScript config, build config, and CLI entry with a Commander program.

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS for the smoke test.

**Step 5: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts vitest.config.ts src/index.ts
git commit -m "feat: scaffold aweskill cli"
```

### Task 2: Core Types and Path Utilities

**Files:**
- Create: `src/types.ts`
- Create: `src/lib/path.ts`
- Test: `tests/path.test.ts`

**Step 1: Write the failing test**

Add tests for `sanitizeName`, base-path safety checks, and helper expansion behavior.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/path.test.ts`
Expected: FAIL because helpers do not exist.

**Step 3: Write minimal implementation**

Implement shared types and path-safe helpers used by import and reconcile code.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/path.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/types.ts src/lib/path.ts tests/path.test.ts
git commit -m "feat: add path utilities"
```

### Task 3: Agent Registry

**Files:**
- Create: `src/lib/agents.ts`
- Test: `tests/agents.test.ts`

**Step 1: Write the failing test**

Add tests for known agent definitions, detection, and location resolution.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/agents.test.ts`
Expected: FAIL because the registry is missing.

**Step 3: Write minimal implementation**

Implement `claude-code`, `codex`, and `cursor` definitions with home and project directory resolution.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/agents.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/agents.ts tests/agents.test.ts
git commit -m "feat: add agent registry"
```

### Task 4: Skills, Bundles, and Config Persistence

**Files:**
- Create: `src/lib/skills.ts`
- Create: `src/lib/bundles.ts`
- Create: `src/lib/config.ts`
- Create: `src/lib/matcher.ts`
- Test: `tests/storage.test.ts`

**Step 1: Write the failing test**

Add tests for empty initialization, bundle mutation, config validation, and `exact/prefix/glob` matching.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/storage.test.ts`
Expected: FAIL because persistence and matching modules are missing.

**Step 3: Write minimal implementation**

Implement repository listing, bundle CRUD helpers, YAML config read/write, activation mutation, and matcher evaluation.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/storage.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/skills.ts src/lib/bundles.ts src/lib/config.ts src/lib/matcher.ts tests/storage.test.ts
git commit -m "feat: add storage and matching modules"
```

### Task 5: Reconcile Engine

**Files:**
- Create: `src/lib/symlink.ts`
- Create: `src/lib/reconcile.ts`
- Test: `tests/reconcile.test.ts`

**Step 1: Write the failing test**

Add tests for bundle expansion, global versus project projection, stale projection cleanup, and idempotent sync.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/reconcile.test.ts`
Expected: FAIL because reconcile code is missing.

**Step 3: Write minimal implementation**

Implement expected-state calculation plus apply logic for symlink and copy projections.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/reconcile.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/symlink.ts src/lib/reconcile.ts tests/reconcile.test.ts
git commit -m "feat: add reconcile engine"
```

### Task 6: Command Handlers

**Files:**
- Create: `src/commands/init.ts`
- Create: `src/commands/bundle.ts`
- Create: `src/commands/enable.ts`
- Create: `src/commands/disable.ts`
- Create: `src/commands/list.ts`
- Create: `src/commands/sync.ts`
- Create: `src/commands/scan.ts`
- Create: `src/commands/add.ts`
- Create: `src/commands/remove.ts`
- Create: `src/lib/scanner.ts`
- Create: `src/lib/import.ts`
- Create: `src/lib/references.ts`
- Test: `tests/commands.test.ts`

**Step 1: Write the failing test**

Add command-level tests for `init`, bundle operations, enable/disable, list status, and sync.

**Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/commands.test.ts`
Expected: FAIL because command handlers do not exist.

**Step 3: Write minimal implementation**

Implement command handlers and hook them into the CLI. Keep scan/add/remove practical but lean for MVP.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run tests/commands.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/commands src/lib/scanner.ts src/lib/import.ts src/lib/references.ts tests/commands.test.ts
git commit -m "feat: add aweskill commands"
```

### Task 7: Full Verification

**Files:**
- Modify: any files required by defects found during testing

**Step 1: Run focused tests**

Run:

```bash
npm test -- --run tests/path.test.ts
npm test -- --run tests/storage.test.ts
npm test -- --run tests/reconcile.test.ts
npm test -- --run tests/commands.test.ts
```

Expected: PASS.

**Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS.

**Step 3: Build the CLI**

Run: `npm run build`
Expected: successful build output in `dist/`.

**Step 4: Fix any failures and rerun**

Repeat until tests and build both pass.

**Step 5: Commit**

```bash
git add .
git commit -m "test: verify aweskill mvp"
```
