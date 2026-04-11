# aweskill

面向 AI 编码代理的本地 Skill 编排命令行工具。

[English README](./README.md)

## 项目定位

`aweskill` 用一个统一的中央仓库 `~/.aweskill` 管理 Skills，通过 YAML 配置定义 bundle 和 activation，再把技能以 `symlink` 或 `copy` 的方式投影到不同 agent 的技能目录里。

当前实现尽量遵从 `aweskill-cli-design-v3.1.md` 的 MVP 范围：

- 中央仓库：`~/.aweskill/skills/`
- bundle 定义：`~/.aweskill/bundles/*.yaml`
- 全局配置：`~/.aweskill/config.yaml`
- 项目配置：`<project>/.aweskill.yaml`
- 当前支持 agent：`claude-code`、`codex`、`cursor`

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
aweskill enable bundle frontend --scope global --agent claude-code

# 5. 查看当前投影状态
aweskill list status
```

## 命令概览

| 命令 | 说明 |
| --- | --- |
| `aweskill init [--scan]` | 初始化 `~/.aweskill` 目录，必要时顺带扫描 |
| `aweskill scan` | 扫描已支持 agent 的 skill 目录 |
| `aweskill add <path> --mode symlink|mv|cp` | 导入单个 skill 到中央仓库 |
| `aweskill add --scan --mode symlink|mv|cp` | 批量导入扫描结果 |
| `aweskill remove <skill> [--force]` | 删除 skill，默认先做引用检查 |
| `aweskill bundle create <name>` | 创建 bundle |
| `aweskill bundle show <name>` | 查看 bundle 内容 |
| `aweskill bundle add-skill <bundle> <skill>` | 给 bundle 增加 skill |
| `aweskill bundle remove-skill <bundle> <skill>` | 从 bundle 删除 skill |
| `aweskill list skills` | 列出中央仓库中的 skills |
| `aweskill list bundles` | 列出 bundles |
| `aweskill list status [--project <dir>]` | 查看计算后的投影状态 |
| `aweskill enable bundle|skill ...` | 写入 activation 并自动 reconcile |
| `aweskill disable bundle|skill ...` | 删除 activation 并自动 reconcile |
| `aweskill sync [--project <dir>]` | 按当前配置重算并修复投影 |

## 使用示例

```bash
# 复制导入一个 skill
aweskill add ~/Downloads/pr-review --mode cp

# 扫描当前项目和全局 agent 目录
aweskill scan

# 创建 backend bundle
aweskill bundle create backend
aweskill bundle add-skill backend api-design
aweskill bundle add-skill backend db-schema

# 在项目范围内启用单个 skill
aweskill enable skill pr-review --scope project --project /path/to/repo --agent cursor

# 在全局范围内为所有已检测到的 agent 启用 bundle
aweskill enable bundle backend --scope global --agent all

# 禁用项目级 activation
aweskill disable skill pr-review --scope project --project /path/to/repo --agent cursor

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

## 当前支持的 Agent

| Agent | 全局路径 | 项目路径 | 投影方式 |
| --- | --- | --- | --- |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` | `symlink` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` | `symlink` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` | `copy` |

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

当前已知的 MVP 边界：

- `sync` 目前能稳定处理全局范围，以及“当前项目”或“显式指定项目”的重算；但还不会自动遍历全局配置里声明过的所有历史项目并全部修复。

## 开发

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## 许可证

MIT
