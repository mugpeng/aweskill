<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill：为所有编码代理准备的一套 Skill 中央仓库</h1>
  <p><strong>面向 AI 编码代理的本地 Skill 编排命令行工具。</strong></p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.1.7-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="./README.md"><img src="https://img.shields.io/badge/README-English-64748B?style=flat-square" alt="English README"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-beta-c96a3d?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/agents-32_supported-0ea5a4?style=flat-square" alt="Supported agents">
    <img src="https://img.shields.io/badge/projection-symlink-1f2328?style=flat-square" alt="Projection mode">
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
npm install -g aweskill@0.1.7
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
npm install -g ./aweskill-0.1.7.tgz
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

- 有托管的 symlink，就表示启用
- 没有，就表示停用
- 不存在额外的全局 activation 注册表

## 支持范围

当前支持的 agent：

`adal`、`amp`、`antigravity`、`augment`、`claude-code`、`cline`、`codebuddy`、`command-code`、`codex`、`copilot`、`crush`、`cursor`、`droid`、`gemini-cli`、`goose`、`kiro-cli`、`kilo-code`、`kode`、`mistral-vibe`、`mux`、`neovate`、`openclaw`、`openclaude-ide`、`openhands`、`opencode`、`qoder`、`qwen-code`、`replit`、`roo`、`trae`、`trae-cn`、`windsurf`

关键目录：

- 中央仓库：`~/.aweskill/skills/`
- 重复项暂存区：`~/.aweskill/dup_skills/`
- 备份目录：`~/.aweskill/backup/`
- Bundle 文件：`~/.aweskill/bundles/*.yaml`
- 仓库资源目录：`resources/bundle_templates/` 和 `resources/skill_archives/`

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
aweskill store backup --both
aweskill agent sync
aweskill agent recover --global --agent codex
aweskill doctor dedupe --fix
```

默认情况下，`store backup` 和 `store restore` 只处理 `skills/`。加上 `--both` 会同时处理 `bundles/`；如果想导出到指定位置，也可以给 `store backup` 传一个可选的 archive 路径。

## 命令面

| 命令 | 说明 |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | 初始化 `~/.aweskill` 布局 |
| `aweskill store backup [archive] [--both]` | 归档中央 skill 仓库，也可导出到指定路径 |
| `aweskill store restore <archive> [--override] [--both]` | 从备份恢复 |
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

`aweskill` 只删除它能够明确识别为自己创建的托管 symlink，不会盲删任意 skill 目录。

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
2. **`agent add`** 会在指定 agent 和支持的 scope 下创建一个指向中央仓库的 **symlink**
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

## 模板与归档

内置 bundle 模板现在位于 [resources/bundle_templates/K-Dense-AI-scientific-skills.yaml](/Users/peng/Desktop/Project/aweskills/resources/bundle_templates/K-Dense-AI-scientific-skills.yaml)。运行时 bundle 仍然位于 `~/.aweskill/bundles/`。

`resources/skill_archives/` 预留给你手动维护的整仓库 `tar.gz` 归档，用于随仓库分发给其他用户。`aweskill` 不会自动生成或恢复这些归档。

如果你希望使用一个独立于本仓库、可直接分享给其他用户的技能归档集合，可以参考 [oh-my-skills](https://github.com/mugpeng/oh-my-skills)。它是一个单独维护的备份仓库，用来存放可分发的 bundle 和整库快照归档。

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
| `adal` | `~/.adal/skills/` | `<project>/.adal/skills/` | `symlink` |
| `amp` | `~/.agents/skills/` | `<project>/.agents/skills/` | `symlink` |
| `antigravity` | `~/.gemini/antigravity/skills/` | `<project>/.gemini/antigravity/skills/` | `symlink` |
| `augment` | `~/.augment/rules/` | `<project>/.augment/rules/` | `symlink` |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` | `symlink` |
| `cline` | `~/.cline/skills/` | `<project>/.cline/skills/` | `symlink` |
| `codebuddy` | `~/.codebuddy/skills/` | `<project>/.codebuddy/skills/` | `symlink` |
| `command-code` | `~/.commandcode/skills/` | `<project>/.commandcode/skills/` | `symlink` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` | `symlink` |
| `copilot` | `~/.github/skills/` | `<project>/.github/skills/` | `symlink` |
| `crush` | `~/.config/crush/skills/` | `<project>/.config/crush/skills/` | `symlink` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` | `symlink` |
| `droid` | `~/.factory/skills/` | `<project>/.factory/skills/` | `symlink` |
| `gemini-cli` | `~/.gemini/skills/` | `<project>/.gemini/skills/` | `symlink` |
| `goose` | `~/.goose/skills/` | `<project>/.goose/skills/` | `symlink` |
| `kiro-cli` | `~/.kiro/skills/` | `<project>/.kiro/skills/` | `symlink` |
| `kilo-code` | `~/.kilocode/skills/` | `<project>/.kilocode/skills/` | `symlink` |
| `kode` | `~/.kode/skills/` | `<project>/.kode/skills/` | `symlink` |
| `mistral-vibe` | `~/.vibe/skills/` | `<project>/.vibe/skills/` | `symlink` |
| `mux` | `~/.mux/skills/` | `<project>/.mux/skills/` | `symlink` |
| `neovate` | `~/.neovate/skills/` | `<project>/.neovate/skills/` | `symlink` |
| `openclaw` | `~/.openclaw/skills/` | `<project>/.openclaw/skills/` | `symlink` |
| `openclaude-ide` | `~/.openclaude/skills/` | `<project>/.openclaude/skills/` | `symlink` |
| `openhands` | `~/.openhands/skills/` | `<project>/.openhands/skills/` | `symlink` |
| `opencode` | `~/.opencode/skills/` | `<project>/.opencode/skills/` | `symlink` |
| `qoder` | `~/.qoder/skills/` | `<project>/.qoder/skills/` | `symlink` |
| `qwen-code` | `~/.qwen/skills/` | `<project>/.qwen/skills/` | `symlink` |
| `replit` | `-` | `<project>/.agent/skills/` | `symlink` |
| `roo` | `~/.roo/skills/` | `<project>/.roo/skills/` | `symlink` |
| `trae` | `~/.trae/skills/` | `<project>/.trae/skills/` | `symlink` |
| `trae-cn` | `~/.trae-cn/skills/` | `<project>/.trae-cn/skills/` | `symlink` |
| `windsurf` | `~/.codeium/windsurf/skills/` | `<project>/.codeium/windsurf/skills/` | `symlink` |

## 开发

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## 许可证

本项目使用 [MPL-2.0](./LICENSE)。
