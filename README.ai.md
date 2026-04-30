# aweskill Bootstrap Protocol

This document is for AI coding agents. Follow the steps below to install aweskill and make its built-in management skills available to the current agent.

## Goal

After completing this protocol:

1. `aweskill` CLI is installed globally via npm
2. The aweskill central store is initialized at `~/.aweskill/skills/`
3. The built-in skills `aweskill` and `aweskill-doctor` are projected into the current agent's skill directory
4. After the user restarts this agent, it can use aweskill commands from natural-language requests

## Prerequisites

- Node.js >= 20 (`node --version`)
- npm available (`npm --version`)

If Node.js is missing, tell the user to install it from https://nodejs.org/ before continuing.

## Steps

### 1. Install aweskill

```bash
npm install -g aweskill
```

### 2. Initialize the central store

```bash
aweskill store init
```

### 3. Confirm store location

```bash
aweskill store where --verbose
```

### 4. Identify the current agent

Determine which agent you are running as. Common agent ids:

- `claude-code` — Claude Code (CLI or IDE extension)
- `cursor` — Cursor
- `codex` — OpenAI Codex CLI
- `gemini-cli` — Gemini CLI
- `windsurf` — Windsurf
- `opencode` — OpenCode
- `qwen-code` — Qwen Code

If you are unsure, run `aweskill agent supported` to see the full list, or ask the user.

### 5. Project built-in skills to this agent

Replace `<agent-id>` with the id from step 4:

```bash
aweskill agent add skill aweskill,aweskill-doctor --global --agent <agent-id>
```

### 6. Verify

```bash
aweskill agent list --global --agent <agent-id>
```

Expected output should show `aweskill` and `aweskill-doctor` as `linked`.

### 7. Tell the user to restart

After projection, the agent needs to be restarted to pick up the new skills. Tell the user:

> aweskill is installed. Please restart this agent to activate the aweskill and aweskill-doctor skills. After restart, you can ask me to manage skills, install from sources, create bundles, and more.

## Safety Rules

- If you cannot determine the agent id, ask the user before proceeding.
- Do not project skills to all agents by default. Only project to the current agent unless the user explicitly requests otherwise.
- If any command fails, report the exact command and error message to the user. Do not silently retry.
- Do not modify the user's existing agent projections or bundles unless asked.
