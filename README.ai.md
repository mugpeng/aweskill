# aweskill Bootstrap Protocol

This document is for AI coding agents. Follow the steps below to install aweskill and make its built-in management skills available to the current agent.

## Goal

After completing this protocol:

1. `aweskill` CLI is installed globally via npm
2. The aweskill central store is initialized at `~/.aweskill/skills/`
3. The built-in skills `aweskill` and `aweskill-doctor` are projected into the current agent's skill directory
4. After the user restarts this agent, it can use aweskill commands from natural-language requests

## Language Behavior

- Reply in the user's language when possible.
- If the user asks in Chinese, continue in Chinese.
- If the user asks in English, continue in English.
- If the user explicitly asks for another language, follow that request.

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

Run this command to see which agents are installed on this machine:

```bash
aweskill agent supported
```

Look for lines marked with `✓` — these are detected agent roots. Pick the one that matches your runtime. Common agent ids:

- `claude-code` — Claude Code (CLI or IDE extension)
- `cursor` — Cursor
- `codex` — OpenAI Codex CLI
- `gemini-cli` — Gemini CLI
- `windsurf` — Windsurf
- `opencode` — OpenCode
- `qwen-code` — Qwen Code

If you cannot determine your agent id from the output, ask the user.

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

> aweskill is installed. Please restart this agent to activate the aweskill and aweskill-doctor skills. After restart, you can ask me things like:
>
> - "Find a useful Python data-analysis skill and install it into aweskill."
> - "What can I do with aweskill?"

If the user is speaking Chinese, use this version instead:

> aweskill 已安装。请重启当前 agent，以激活 aweskill 和 aweskill-doctor 这两个 skills。重启后，你可以继续问我，例如：
>
> - “帮我找一个好用的 Python 数据分析 skill，并安装到 aweskill。”
> - “我能用 aweskill 做什么？”

## Safety Rules

- If you cannot determine the agent id, ask the user before proceeding.
- Do not project skills to all agents by default. Only project to the current agent unless the user explicitly requests otherwise.
- If any command fails, report the exact command and error message to the user. Do not silently retry.
- Do not modify the user's existing agent projections or bundles unless asked.
