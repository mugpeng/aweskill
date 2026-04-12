# aweskill

面向 AI 编码代理的本地 Skill 编排命令行工具。

[English README](./README.md)

## 项目定位

`aweskill` 用一个统一的中央仓库 `~/.aweskill` 管理 Skills，通过 YAML 配置定义 bundle 和 activation，再把技能以 `symlink` 或 `copy` 的方式投影到不同 agent 的技能目录里。

当前 CLI 仍然保留现有的 `runXxx + RuntimeContext` 分层结构，但终端 UX 已尽量向 `aweskill_cc` 靠拢，使用了 `@clack/prompts` 和 `picocolors`。

当前实现尽量遵从 `aweskill-cli-design-v3.1.md` 的 MVP 范围：

- 中央仓库：`~/.aweskill/skills/`
- bundle 定义：`~/.aweskill/bundles/*.yaml`
- 全局配置：`~/.aweskill/config.yaml`
- 项目配置：`<project>/.aweskill.yaml`
- 当前支持 agent：`amp`、`claude-code`、`cline`、`codex`、`cursor`、`gemini-cli`、`goose`、`opencode`、`roo`、`windsurf`

## 安装

### 直接从当前仓库安装

```bash
npm install
npm run build
npm install -g .
```

安装后验证：

```bash
aweskill --help
```

### 本地开发模式

```bash
npm install
npm link
aweskill --help
```

### 用打包产物安装

```bash
npm install
npm pack
npm install -g ./aweskill-0.1.0.tgz
```

## 快速开始

```bash
# 1. 初始化 aweskill 家目录
aweskill init

# 2. 导入一个本地 skill 到中央仓库
aweskill add /path/to/my-skill --mode cp

# 3. 创建 bundle
aweskill bundle create frontend
aweskill bundle add-skill frontend my-skill

# 4. 为 Claude Code 全局启用这个 bundle
aweskill enable bundle frontend --global --agent claude-code

# 5. 检查中央仓库和当前全局 agent 技能目录
aweskill check
```

## 命令概览

| 命令 | 说明 |
| --- | --- |
| `aweskill init [--scan]` | 初始化 `~/.aweskill` 目录，必要时顺带扫描 |
| `aweskill scan [--add] [--mode symlink|mv|cp] [--override]` | 扫描已支持 agent 的 skill 目录，并可选直接导入 |
| `aweskill add <path> --mode symlink|mv|cp [--override]` | 导入单个 skill 目录或整个 skills 根目录到中央仓库 |
| `aweskill add --scan --mode symlink|mv|cp [--override]` | 批量导入扫描结果 |
| `aweskill remove <skill> [--force]` | 删除 skill，默认先做引用检查 |
| `aweskill bundle create <name>` | 创建 bundle |
| `aweskill bundle show <name>` | 查看 bundle 内容 |
| `aweskill bundle add-skill <bundle> <skill>` | 给 bundle 增加一个中央仓库中已存在的 skill |
| `aweskill bundle remove-skill <bundle> <skill>` | 从 bundle 删除 skill |
| `aweskill bundle delete <name>` | 删除 bundle |
| `aweskill list skills` | 列出中央仓库中的 skills |
| `aweskill list bundles` | 列出 bundles |
| `aweskill check [--global] [--project [dir]] [--agent <agent>]` | 查看中央仓库和选定 agent 目录下当前实际存在的 skills |
| `aweskill enable bundle|skill ...` | 写入 activation 并自动 reconcile；默认等价于 `--global --agent all` |
| `aweskill disable bundle|skill ...` | 删除 activation 并自动 reconcile；默认等价于 `--global --agent all` |
| `aweskill sync [--project <dir>]` | 重算全局范围和已知项目，并修复派生投影 |

## 使用示例

```bash
# 复制导入一个 skill
aweskill add ~/Downloads/pr-review --mode cp

# 一次性导入整个 skills 根目录
aweskill add ~/.agents/skills

# 扫描当前项目和全局 agent 目录
aweskill scan

# 扫描并一步导入
aweskill scan --add

# 覆盖已有文件，而不是只补缺失文件
aweskill scan --add --override

# 创建 backend bundle
aweskill bundle create backend
aweskill bundle add-skill backend api-design
aweskill bundle add-skill backend db-schema

# 在项目范围内启用单个 skill
aweskill enable skill pr-review --project /path/to/repo --agent cursor

# 在全局和当前项目范围内为所有 agent 启用 skill
aweskill enable skill biopython

# 在全局范围内为所有已检测到的 agent 启用 bundle
aweskill enable bundle backend --global --agent all

# 检查某个全局 agent 目录
aweskill check --agent codex

# 检查某个项目范围的 agent 目录
aweskill check --project /path/to/repo --agent cursor

# 禁用项目级 activation
aweskill disable skill pr-review --project /path/to/repo --agent cursor

# 修复投影
aweskill sync --project /path/to/repo
```

## 配置示例

### 全局配置

```yaml
version: 1

activations:
  - type: bundle
    name: backend
    agents: [claude-code, codex]
    scope: global

projects:
  - path: /Users/peng/work/frontend-app
    match: exact
    activations:
      - type: bundle
        name: frontend
        agents: [claude-code, cursor]
```

### 项目配置

```yaml
version: 1

activations:
  - type: skill
    name: pr-review
    agents: [cursor]
```

### bundle 文件

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## 投影模型

`aweskill` 把 agent 技能目录视为派生状态。

1. 读取全局 activation
2. 读取 `config.yaml` 中命中的项目规则
3. 读取项目 `.aweskill.yaml`
4. 将 bundle 展开为 skills
5. 计算 `(skill × agent × target-dir)`
6. 创建或删除 `symlink` / `copy`

所以 `enable`、`disable`、`sync` 的本质都是“改配置后 reconcile”，而不是直接对 agent 目录做手工修改。

## 内部 Registry

`aweskill` 仍然会在 `~/.aweskill/registry/` 下为每个 agent 写一个内部派生索引，例如 `~/.aweskill/registry/codex.json`。

这个 registry 不再作为面向用户的命令入口，也不是真相源。真实状态仍然来自 config、bundle、中央 skill 仓库以及 agent 目录本身。

```json
{
  "version": 2,
  "agentId": "codex",
  "lastSynced": "2026-04-12T03:00:00.000Z",
  "skills": [
    {
      "name": "my-skill",
      "scope": "global",
      "sourcePath": "/Users/peng/.codex/skills/my-skill",
      "managedByAweskill": false
    },
    {
      "name": "project-skill",
      "scope": "project",
      "projectDir": "/path/to/project",
      "sourcePath": "/Users/peng/.aweskill/skills/project-skill",
      "managedByAweskill": true
    }
  ]
}
```

Registry 的生命周期规则：

- `scan` 会把 agent 目录里的技能写成 `discovered`
- `scan --add` 和 `add --scan` 可以把这些 discovered skills 导入中央仓库
- `enable` 会在 reconcile 接管目标目录后，把匹配条目标记为 `managedByAweskill: true`
- `disable` 会删除 managed 投影和对应的 managed registry 条目
- `disable` 不会恢复 enable 之前被替换掉的 agent 本地副本

导入行为：

- 默认的 `scan --add` 和 `add --scan` 在中央仓库已存在同名 skill 时，只补缺失文件，不覆盖已有文件
- `--override` 会覆盖已有文件
- 当 `mode=cp|mv` 且源是 symlink 时，aweskill 会解析到真实源目录进行复制，并在 warning 中打印两条路径
- 如果扫描到的 symlink 已损坏，批量导入会对该 skill 打印 error，继续处理其他项，并在最后输出缺失源数量

## 当前支持的 Agent

| Agent | 全局路径 | 项目路径 | 投影方式 |
| --- | --- | --- | --- |
| `amp` | `~/.amp/skills/` | `<project>/.amp/skills/` | `symlink` |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` | `symlink` |
| `cline` | `~/.cline/skills/` | `<project>/.cline/skills/` | `symlink` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` | `symlink` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` | `copy` |
| `gemini-cli` | `~/.gemini/skills/` | `<project>/.gemini/skills/` | `symlink` |
| `goose` | `~/.goose/skills/` | `<project>/.goose/skills/` | `symlink` |
| `opencode` | `~/.opencode/skills/` | `<project>/.opencode/skills/` | `symlink` |
| `roo` | `~/.roo/skills/` | `<project>/.roo/skills/` | `symlink` |
| `windsurf` | `~/.windsurf/skills/` | `<project>/.windsurf/skills/` | `symlink` |

## 与 v3.1 设计稿的符合度

当前仓库已经覆盖设计稿中的核心 MVP 主路径：

- 中央 skill 仓库
- bundle 增删改查
- 全局与项目 activation 配置
- `exact / prefix / glob` 项目匹配
- reconcile 驱动的派生投影
- scan / import / remove 流程
- 可安装的 CLI 包和 `aweskill` 命令
- 针对存储、reconcile、命令流程的自动化测试

当前 `sync` 的行为：

- 总是重算全局范围
- 如果传了 `--project`，会重算该项目
- 如果当前工作目录存在 `.aweskill.yaml`，会重算当前项目
- 会重算全局配置中声明的 `exact` 项目规则，前提是这些项目目录当前存在
- 会重算内部 registry 快照里已经记录过的项目目录
- 不会自动枚举所有可能命中的 `prefix` 或 `glob` 项目

## 开发

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## 许可证

MIT
