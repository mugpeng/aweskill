<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill：为所有编码代理准备的一套 Skill 中央仓库</h1>
  <p><strong>面向 AI 编码代理的本地 Skill 编排命令行工具。</strong></p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.1.6-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="./README.md"><img src="https://img.shields.io/badge/README-English-64748B?style=flat-square" alt="English README"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-beta-c96a3d?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/agents-10_supported-0ea5a4?style=flat-square" alt="Supported agents">
    <img src="https://img.shields.io/badge/projection-symlink%20%7C%20copy-1f2328?style=flat-square" alt="Projection modes">
    <img src="https://img.shields.io/badge/platform-local%20CLI-334155?style=flat-square" alt="Local CLI">
  </p>
</div>

`aweskill` 是一个本地 CLI，用来在多个 AI 编码代理之间管理、组织和投影技能。

你不需要再把同一套 skill 文件夹手动复制到每个工具里。`aweskill` 会把 `~/.aweskill/skills/` 作为唯一事实来源，再按目标 agent 的要求，把 skill 以 `symlink` 或 `copy` 的形式投影到对应目录。

## 为什么用 aweskill

- **一个中央仓库**：所有本地 skill 只维护一份
- **bundle 组织方式**：把可复用的 skill 集合定义清楚
- **多 agent 投影**：同时服务 Codex、Claude Code、Cursor、Gemini CLI 等工具
- **托管启用/停用模型**：不依赖额外的全局 activation 文件
- **自带维护能力**：备份、恢复、查重、recover、sync 都在 CLI 内部

## 安装

### 从 npm 安装（推荐）

需要 [Node.js](https://nodejs.org/) 20 及以上。

```bash
npm install -g aweskill
aweskill --help
```

固定到某一版本：

```bash
npm install -g aweskill@0.1.6
```

包主页：[npmjs.com/package/aweskill](https://www.npmjs.com/package/aweskill)

### 直接从当前仓库安装

```bash
npm install
npm run build
npm install -g .
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
npm install -g ./aweskill-0.1.6.tgz
```

## 快速开始

```bash
# 1. 初始化 aweskill 家目录
aweskill store init

# 2. 扫描已有 agent 的 skill 目录
aweskill skill scan

# 3. 导入一个 skills 根目录或单个 skill
aweskill skill import ~/.agents/skills
# aweskill skill import /path/to/my-skill --mode cp

# 4. 创建 bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 5. 为一个 agent 启用这个 bundle
aweskill agent add bundle frontend --global --agent claude-code

# 6. 查看当前投影状态
aweskill agent list
```

## 核心模型

`aweskill` 的模型很简单：

1. Skill 统一保存在 `~/.aweskill/skills/<skill-name>/`
2. Bundle 是 `~/.aweskill/bundles/<bundle>.yaml` 下的普通 YAML 文件
3. `agent add` 会把选定的 skill 投影到各 agent 自己的 skills 目录

投影状态就是启用状态：

- 有托管的 symlink 或 copy，就表示启用
- 没有，就表示停用
- 不存在额外的全局 activation 注册表

## 支持范围

当前支持的 agent：

`amp`、`claude-code`、`cline`、`codex`、`cursor`、`gemini-cli`、`goose`、`opencode`、`roo`、`windsurf`

关键目录：

- 中央仓库：`~/.aweskill/skills/`
- 重复项暂存区：`~/.aweskill/dup_skills/`
- 备份目录：`~/.aweskill/backup/`
- Bundle 文件：`~/.aweskill/bundles/*.yaml`

## 常见工作流

### 把现有 skill 导入中央仓库

```bash
aweskill skill import ~/.agents/skills
aweskill skill import ~/Downloads/pr-review --mode cp
aweskill skill import --scan
```

### 构建可复用 bundle

```bash
aweskill bundle create backend
aweskill bundle add backend api-design,db-schema
aweskill bundle show backend
```

### 把 skill 投影到多个 agent

```bash
aweskill agent add skill biopython
aweskill agent add skill biopython,scanpy --global --agent codex
aweskill agent add bundle backend --global --agent all
```

### 维护本地仓库

```bash
aweskill store backup
aweskill agent sync
aweskill agent recover --global --agent codex
aweskill doctor dedupe --fix
```

## 命令面

| 命令 | 说明 |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | 初始化 `~/.aweskill` 布局 |
| `aweskill store backup` | 归档中央 skill 仓库 |
| `aweskill store restore <archive> [--override]` | 从备份恢复 |
| `aweskill skill scan [--verbose]` | 扫描支持的 agent skill 目录 |
| `aweskill skill import <path> [--mode cp\|mv] [--override]` | 导入单个 skill 或整个 skills 根目录 |
| `aweskill skill import --scan [--mode cp\|mv] [--override]` | 导入当前扫描结果 |
| `aweskill skill list [--verbose]` | 列出中央仓库中的 skill |
| `aweskill skill remove <skill> [--force]` | 从中央仓库删除一个 skill |
| `aweskill bundle list [--verbose]` | 列出 bundle |
| `aweskill bundle create <name>` | 创建 bundle |
| `aweskill bundle add <bundle> <skill>` | 向 bundle 增加一个或多个 skill |
| `aweskill bundle remove <bundle> <skill>` | 从 bundle 移除一个或多个 skill |
| `aweskill bundle show <name>` | 查看 bundle 内容 |
| `aweskill bundle template list [--verbose]` | 列出内置 bundle 模板 |
| `aweskill bundle template import <name>` | 把内置模板复制到本地仓库 |
| `aweskill agent supported` | 列出支持的 agent id 和显示名 |
| `aweskill agent add bundle\|skill ...` | 把托管 skill 投影到 agent 目录 |
| `aweskill agent remove bundle\|skill ... [--force]` | 删除托管投影 |
| `aweskill agent list [...]` | 检查 `linked`、`duplicate`、`new` 状态 |
| `aweskill agent sync` | 删除失效托管投影 |
| `aweskill agent recover` | 把托管 symlink 恢复为完整目录 |
| `aweskill doctor dedupe [--fix] [--delete]` | 查找并清理重复 skill |

## 设计取舍

### 没有全局 activation 文件

`aweskill` 直接把投影后的文件系统状态当作事实来源。这样模型更简单，也避免额外的一层 activation 元数据和实际目录状态漂移。

### Bundle 是展开集合

`agent add bundle <name>` 会把 bundle 展开为多个 skill 名，再逐个投影。投影完成后，不存在一个额外长期保存的“bundle 激活对象”。

### 只删除托管项

`aweskill` 只删除它能够明确识别为自己创建的 symlink 或托管 copy，不会盲删任意 skill 目录。

## Bundle 文件格式

Bundle 是 `~/.aweskill/bundles/<name>.yaml` 下的普通 YAML 文件：

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## 投影模型

1. **Skill 内容的唯一事实来源**：`~/.aweskill/skills/<skill-name>/`
2. **`agent add`** 会在指定 agent 和 scope 下创建：
   - 指向中央仓库的 **symlink**
   - 或带标记的 **递归 copy**（例如 Cursor）
3. **`agent remove`** 只会删除能识别为 `aweskill` 托管的条目
4. **`agent sync`** 会移除中央 skill 已不存在时留下的失效托管投影

**不会**基于某个全局 YAML activation 列表做 reconcile。

导入行为：

- 默认 `skill import --scan` 和批量 `skill import` 只补缺失文件；`--override` 才会覆盖
- 如果导入源是 symlink，aweskill 会从真实路径复制，并在需要时给出 warning
- 批量导入遇到坏掉的 symlink 会继续处理其他项
- `restore` 在恢复前会自动备份当前 `skills/`

显示行为：

- `skill list` 默认显示预览，`--verbose` 才显示全部
- `skill scan` 默认显示每个 agent 的统计，`--verbose` 才列出具体 skill
- `agent list` 会把条目分成 `linked`、`duplicate`、`new`
- `doctor dedupe` 会把 `name`、`name-2`、`name-1.2.3` 视为同一重复族，只有传 `--fix` 才真正改文件

投影示例：

```bash
# 全局范围为一个 agent 建立投影
aweskill agent add skill biopython --global --agent codex

# 项目范围为一个 agent 建立投影
aweskill agent add skill pr-review --project /path/to/repo --agent cursor

# bundle 的启用/禁用本质上都是展开成 skill 投影
aweskill agent add bundle backend --global --agent codex
aweskill agent remove bundle backend --global --agent codex

# 把 symlink 投影恢复成完整目录
aweskill agent recover --global --agent codex
```

## 相关工具

如果你在关注更广的 skills 生态，下面这些项目都值得使用和研究：

- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager)：桌面化的多 AI 编码助手技能管理器，适合可视化组织、同步和分享 skill。
- [skillfish](https://github.com/knoxgraeme/skillfish)：偏 CLI 的 skill 管理工具，强调安装、更新和跨 agent 同步。
- [vercel-labs/skills](https://github.com/vercel-labs/skills)：开放的 agent skills CLI 和生态入口，对 `SKILL.md` 包约定影响很大。
- [cc-switch](https://github.com/farion1231/cc-switch)：面向 Claude Code、Codex、Gemini CLI、OpenCode 等工具的一站式桌面管理器。

`aweskill` 参考并借鉴了这四个项目的工作。它们分别帮助我们理解了：

- 桌面优先的多工具管理
- CLI 优先的 skill 安装与同步
- 开放 skill 生态的约定方式
- 跨 agent 的本地开发工作流工具

## 支持的 Agent

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

## 开发

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## 许可证

本项目使用 [MPL-2.0](./LICENSE)。
