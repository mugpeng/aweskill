<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill：为所有编码代理准备的一套 Skill 中央仓库</h1>
  <p><strong>面向 AI 编码代理的本地 Skill 编排命令行工具。</strong></p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.2.5-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="./README.md"><img src="https://img.shields.io/badge/README-English-64748B?style=flat-square" alt="English README"></a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/status-beta-c96a3d?style=flat-square" alt="Status">
    <img src="https://img.shields.io/badge/agents-47_supported-0ea5a4?style=flat-square" alt="Supported agents">
    <img src="https://img.shields.io/badge/projection-symlink-1f2328?style=flat-square" alt="Projection mode">
    <img src="https://img.shields.io/badge/OS-windows%20%26%20macOS-0078D4?style=flat-square" alt="Windows and macOS">
    <img src="https://img.shields.io/npm/dt/aweskill?style=flat-square" alt="npm downloads">
    <img src="https://img.shields.io/github/stars/mugpeng/aweskill?style=flat-square" alt="GitHub stars">
    <img src="https://img.shields.io/badge/platform-local%20CLI-334155?style=flat-square" alt="Local CLI">
  </p>
</div>


`aweskill` 是一个本地 CLI，用来在多个 AI 编码代理之间管理、组织和投影技能。

你不需要再把同一套 skill 文件夹手动复制到每个工具里。`aweskill` 会把 `~/.aweskill/skills/` 作为唯一事实来源，再按目标 agent 的要求，把 skill 以 `symlink` 或 `copy` 的形式投影到对应目录。

## 为什么用 aweskill

- **一个中央仓库**：所有本地 skill 只维护一份
- **bundle 组织方式**：把可复用的 skill 集合定义清楚
- **多 agent 投影**：同时服务 Codex、Claude Code、Cursor、Gemini CLI 等工具
- **find / download / update 闭环**：可跨 provider 找 skill、导入中央仓库，并在后续按来源追踪更新
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
npm install -g aweskill@0.2.5
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
npm install -g ./aweskill-<version>.tgz
```

## 快速开始

```bash
# 1. 初始化 aweskill 家目录
aweskill store init

# 2. 查看 aweskill store 在哪里
aweskill store where --verbose

# 3. 扫描已有 agent 的 skill 目录
aweskill store scan

# 4. 把扫描到的 agent skill 导入中央仓库
aweskill store import --scan

# 5. 导入一个 skills 根目录或单个 skill
aweskill store import ~/.agents/skills
# aweskill store import /path/to/my-skill --link-source

# 6. 创建 bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 7. 为一个 agent 启用这个 bundle
aweskill agent add bundle frontend --global --agent claude-code

# 8. 查看当前投影状态
aweskill agent list
```

## Windows

`aweskill` 现在已经支持 Windows 原生使用。

- 需要 Node.js 20 及以上
- 推荐使用 PowerShell 执行命令
- 在 Windows 上，agent 投影会优先使用目录 junction；如果系统不允许创建链接，会回退到受管 copy
- `store backup` 和 `store restore` 不再依赖系统自带 `tar`

示例：

```powershell
aweskill store init
aweskill store scan
aweskill agent add bundle frontend --global --agent codex
```

如果你在 Windows 上遇到路径、权限或投影问题，建议带上 shell、Node 版本和目标 agent 信息来提 issue。

## 核心模型

`aweskill` 会把 `~/.aweskill/skills/` 作为唯一技能中央仓库，用 bundle 组织可复用 skill 集合，再把选中的 skill 投影到各个 agent 的技能目录。投影后的文件系统状态本身就是启用状态。

## 支持范围

当前支持的 agent：

`adal`、`amp`、`antigravity`、`augment`、`bob`、`claude-code`、`cline`、`codebuddy`、`command-code`、`continue`、`codex`、`copilot`、`cortex`、`crush`、`cursor`、`deepagents`、`droid`、`firebender`、`gemini-cli`、`github-copilot`、`goose`、`iflow-cli`、`junie`、`kilo`、`kilo-code`、`kimi-cli`、`kiro-cli`、`kode`、`mcpjam`、`mistral-vibe`、`mux`、`neovate`、`openclaw`、`openclaude-ide`、`openhands`、`opencode`、`pi`、`pochi`、`qoder`、`qwen-code`、`replit`、`roo`、`trae`、`trae-cn`、`warp`、`windsurf`、`zencoder`

关键目录：

- 中央仓库：`~/.aweskill/skills/`
- 重复项暂存区：`~/.aweskill/dup_skills/`
- 备份目录：`~/.aweskill/backup/`
- Bundle 文件：`~/.aweskill/bundles/*.yaml`
- 内置 skill：`resources/skills/aweskill/`、`resources/skills/aweskill-doctor/`

发现与下载来源：

- [skills.sh](https://skills.sh/) 现在作为社区 skill 发现源使用，可能返回可直接下载的 GitHub 风格 source，也可能返回只能跳转查看上游安装说明的 discover-only 条目
- [sciskillhub.org](https://sciskillhub.org/) 现在作为科研和技术类 skill registry 使用，提供可下载的 `sciskill:<skill-id>` source
- `aweskill find` 默认会同时搜索这两边，按规范化后的名字合并结果；`--limit` 会先按 provider 分别生效，再做合并去重
- `aweskill store download` 当前支持本地路径、GitHub source 和 `sciskill:<skill-id>` 标识

## 常见工作流

### 把现有 skill 导入中央仓库

```bash
# 从现有 agent skill 目录导入
aweskill store import ~/.agents/skills

# 导入外部 skill 目录，并保留原目录不变
aweskill store import ~/Downloads/pr-review

# 导入外部 skill 目录，并把原目录替换成 aweskill 托管投影
aweskill store import ~/Downloads/pr-review --link-source

# 导入外部 skill 目录，并为后续 store update 建立本地来源追踪
aweskill store import ~/Downloads/pr-review --track-source

# 导入扫描到的 agent skill，默认回写成 aweskill 托管投影
aweskill store scan --import

# 导入扫描到的 agent skill，但保留原 agent 目录不变
aweskill store scan --import --keep-source
```

### 查找、下载并更新已追踪 skill

```bash
# 同时搜索 skills.sh 和 sciskillhub.org
aweskill find protein

# 只搜索一个 provider
aweskill find protein --provider sciskill

# 下载一个从 skills.sh 发现到的 GitHub 风格 source
aweskill store download owner/repo

# 从 sciskillhub.org 下载一个科研 skill
aweskill store download sciskill:open-source/research/lifesciences-proteomics

# 只检查已追踪安装是否有更新，不改文件
aweskill store update --check

# 按已记录来源刷新一个已追踪 skill
aweskill store update lifesciences-proteomics
```

### 构建可复用 bundle

```bash
# 创建一个可复用 bundle
aweskill bundle create backend

# 给 bundle 添加多个 skill
aweskill bundle add backend api-design,db-schema

# 查看 bundle 内容
aweskill bundle show backend
```

### 把 skill 投影到多个 agent

```bash
# 把一个 skill 投影到检测到的全局 agent 目录
aweskill agent add skill biopython

# 把多个 skill 投影到指定 agent 的全局目录
aweskill agent add skill biopython,scanpy --global --agent codex

# 把整个 bundle 投影到所有检测到的全局 agent
aweskill agent add bundle backend --global --agent all

# 把托管 symlink 恢复为完整目录
aweskill agent recover --global --agent codex
```

### 维护本地仓库

```bash
# 查看中央仓库位置和目录统计
aweskill store where --verbose

# 备份当前 store
aweskill store backup

# 恢复备份归档
aweskill store restore ~/Downloads/aweskill-backup.tar.gz

# 查看 agent 条目分类
aweskill agent list

# 清理中央仓库里的可疑条目
aweskill doctor clean

# 把中央仓库里的重复 skill 移到 dup_skills
aweskill doctor dedup --apply

# 先看某个 agent 下有哪些可修项
aweskill doctor sync --global --agent codex

# 修复某个 agent 下的 broken / duplicate / matched 条目
aweskill doctor sync --global --agent codex --apply

# 只有显式指定时才删除 suspicious agent 条目
aweskill doctor sync --global --agent codex --apply --remove-suspicious
```

所有 `doctor` 命令默认为 dry run，加上 `--apply` 才会真正修改。

## 命令面

核心命令：`store init`、`store where`、`store import`、`bundle create`、`agent add`、`doctor clean`

高频搜索和 tracked-source 流程也提供顶层命令：`aweskill find`、`aweskill download`、`aweskill update`。

<details>
<summary>全部命令</summary>

| 命令 | 说明 |
| --- | --- |
| `aweskill store init [--scan] [--verbose]` | 初始化 `~/.aweskill` 布局 |
| `aweskill store where [--verbose]` | 显示 `~/.aweskill` 位置，并汇总核心 store 目录 |
| `aweskill store backup [archive] [--skills-only]` | 归档中央仓库；默认同时包含 skills 和 bundles |
| `aweskill store restore <archive> [--override] [--skills-only]` | 从备份归档或已解包目录恢复 |
| `aweskill store scan [--global\|--project [dir]] [--agent <agent>] [--import] [--keep-source] [--override] [--verbose]` | 按指定 scope 和 agent 集合扫描支持的 agent skill 目录；加上 `--import` 会立即把扫描结果导入中央仓库 |
| `aweskill store import <path> [--keep-source\|--link-source] [--track-source] [--override]` | 导入单个 skill 或整个 skills 根目录；外部路径默认保留原目录，`--track-source` 可为显式本地导入建立后续 `store update` 追踪 |
| `aweskill store import --scan [--global\|--project [dir]] [--agent <agent>] [--keep-source\|--link-source] [--override]` | 按指定 scope 和 agent 集合导入当前扫描结果；扫描到的 agent 路径默认会回写为 aweskill 托管投影 |
| `aweskill store find <query> [--provider <skills-sh\|sciskill>] [--limit <n>] [--domain <domain>] [--stage <stage>]` | 与上面相同的搜索命令，只是保留在 `store` 命名空间下 |
| `aweskill store download <source> [--list] [--skill <name>] [--all] [--ref <ref>] [--as <name>] [--override]` | 从本地路径、GitHub source 或 `sciskill:<skill-id>` 下载 skill 到中央仓库，并为后续 `store update` 建立追踪记录 |
| `aweskill store update [skill...] [--check] [--dry-run] [--source <source>] [--override]` | 从已记录的 source 检查或刷新 tracked skill，并把中央仓库中的副本当作受保护的本地状态 |
| `aweskill store list [--verbose]` | 列出中央仓库中的 skill |
| `aweskill store remove <skill> [--force]` | 从中央仓库删除一个 skill，并同步清理该 skill 的 tracked lock 记录 |
| `aweskill bundle list [--verbose]` | 列出 bundle |
| `aweskill bundle create <name>` | 创建 bundle |
| `aweskill bundle add <bundle> <skill>` | 向 bundle 增加一个或多个 skill |
| `aweskill bundle remove <bundle> <skill>` | 从 bundle 移除一个或多个 skill |
| `aweskill bundle show <name>` | 查看 bundle 内容 |
| `aweskill bundle template list [--verbose]` | 列出内置 bundle 模板 |
| `aweskill bundle template import <name>` | 把内置模板复制到本地仓库 |
| `aweskill agent supported` | 列出全部支持的 agent id，用 `✓` / `x` 标记 global 安装状态，并显示已检测到的 global skills 路径 |
| `aweskill agent add bundle\|skill ...` | 把托管 skill 投影到 agent 目录 |
| `aweskill agent remove bundle\|skill ... [--force]` | 删除托管投影 |
| `aweskill agent list [--global\|--project [dir]] [--agent <agent>] [--verbose]` | `doctor sync` 的只读 dry-run 视图：检查 `linked`、`broken`、`duplicate`、`matched`、`new`、`suspicious` 状态；省略 `--agent` 时，先输出当前 scope 检测到的 agent 集合，再输出分组结果 |
| `aweskill agent recover` | 把托管 symlink 恢复为完整目录 |
| `aweskill doctor sync [--apply] [--remove-suspicious] [--global\|--project [dir]] [--agent <agent>] [--verbose]` | 默认 dry run；加上 `--apply` 修复 broken 并重连 duplicate / matched，`--apply --remove-suspicious` 额外删除 suspicious；省略 `--agent` 时，先输出当前 scope 检测到的 agent 集合 |
| `aweskill doctor clean [--apply] [--skills-only] [--bundles-only] [--verbose]` | 按 `skills` / `bundles` 分组查找不规范的 store 条目，并可选清理 |
| `aweskill doctor dedup [--apply] [--delete]` | 查找重复 skill，并可选移动或删除 |

</details>

`aweskill find` 会优先输出 `aweskill store download` 能直接使用的 `source`。如果 provider 返回的是 `smithery.ai` 这类仅供发现的 source，结果仍会显示，但 `aweskill` 会明确标注它不支持直接下载，并提示你去对应的 `skills.sh` 页面查看上游安装说明。默认同时搜索两个 provider 时，`--limit` 按 provider 分别生效，再做合并去重。

## 内置 Skill

`aweskill` 内置了两个 meta-skill，用来教 AI agent 直接运行 aweskill 命令。

```bash
aweskill store import resources/skills/aweskill
aweskill store import resources/skills/aweskill-doctor
```

skill 目录结构与设计原则见 [docs/DESIGN.md](docs/DESIGN.md)。

## 贡献

如果你想参与开发，请看 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。

如果你想了解命令模型和文件系统设计约束，请看 [docs/DESIGN.md](docs/DESIGN.md)。

那里现在集中说明了：

- 开发流程与测试要求

`docs/DESIGN.md` 集中说明了：

- 设计取舍
- bundle 文件格式
- 投影模型
- 内置 skill 结构与设计原则

欢迎提交文档改进、测试补充和小而聚焦的功能改进。

如果你希望使用一个独立于本仓库、可直接分享给其他用户的技能归档集合，可以参考 [oh-my-skills](https://github.com/mugpeng/oh-my-skills)。它是一个单独维护的备份仓库，用来存放可分发的 bundle 和整库快照归档。

## 相关工具

如果你在关注更广的 skills 生态，下面这些项目都值得使用和研究：

- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager)：桌面化的多 AI 编码助手技能管理器，适合可视化组织、同步和分享 skill。
- [skillfish](https://github.com/knoxgraeme/skillfish)：偏 CLI 的 skill 管理工具，强调安装、更新和跨 agent 同步。
- [vercel-labs/skills](https://github.com/vercel-labs/skills)：开放的 agent skills CLI 和生态入口，对 `SKILL.md` 包约定影响很大。
- [cc-switch](https://github.com/farion1231/cc-switch)：面向 Claude Code、Codex、Gemini CLI、OpenCode 等工具的一站式桌面管理器。

## 支持的 Agent

支持 47 个 agent，包括：

**Claude Code** · **Cursor** · **Windsurf** · **Codex** · **GitHub Copilot** · **Gemini CLI** · **OpenCode** · **Goose** · **Amp** · **Roo Code** · **Kiro CLI** · **Kilo Code** · **Trae** · **Cline** · **Antigravity** · **Droid** · **Augment** · **OpenClaw** · **CodeBuddy** · **Command Code** · **Crush** · **Kode** · **Mistral Vibe** · **Mux** · **OpenClaude IDE** · **OpenHands** · **Qoder** · **Qwen Code** · **Replit** · **Trae CN** · **Neovate** · **AdaL**

<details>
<summary>所有支持的 agent</summary>

| Agent | 全局路径 | 项目路径 |
| --- | --- | --- |
| `adal` | `~/.adal/skills/` | `<project>/.adal/skills/` |
| `amp` | `~/.agents/skills/` | `<project>/.agents/skills/` |
| `antigravity` | `~/.gemini/antigravity/skills/` | `<project>/.gemini/antigravity/skills/` |
| `augment` | `~/.augment/skills/` | `<project>/.augment/skills/` |
| `bob` | `~/.bob/skills/` | `<project>/.bob/skills/` |
| `claude-code` | `~/.claude/skills/` | `<project>/.claude/skills/` |
| `cline` | `~/.cline/skills/` | `<project>/.cline/skills/` |
| `codebuddy` | `~/.codebuddy/skills/` | `<project>/.codebuddy/skills/` |
| `command-code` | `~/.commandcode/skills/` | `<project>/.commandcode/skills/` |
| `continue` | `~/.continue/skills/` | `<project>/.continue/skills/` |
| `codex` | `~/.codex/skills/` | `<project>/.codex/skills/` |
| `copilot` | `~/.copilot/skills/` | `<project>/.copilot/skills/` |
| `cortex` | `~/.snowflake/cortex/skills/` | `<project>/.cortex/skills/` |
| `crush` | `~/.config/crush/skills/` | `<project>/.config/crush/skills/` |
| `cursor` | `~/.cursor/skills/` | `<project>/.cursor/skills/` |
| `deepagents` | `~/.deepagents/agent/skills/` | `<project>/.deepagents/agent/skills/` |
| `droid` | `~/.factory/skills/` | `<project>/.factory/skills/` |
| `firebender` | `~/.firebender/skills/` | `<project>/.firebender/skills/` |
| `gemini-cli` | `~/.gemini/skills/` | `<project>/.gemini/skills/` |
| `github-copilot` | `~/.copilot/skills/` | `<project>/.copilot/skills/` |
| `goose` | `~/.goose/skills/` | `<project>/.goose/skills/` |
| `iflow-cli` | `~/.iflow/skills/` | `<project>/.iflow/skills/` |
| `junie` | `~/.junie/skills/` | `<project>/.junie/skills/` |
| `kilo` | `~/.kilocode/skills/` | `<project>/.kilocode/skills/` |
| `kiro-cli` | `~/.kiro/skills/` | `<project>/.kiro/skills/` |
| `kilo-code` | `~/.kilocode/skills/` | `<project>/.kilocode/skills/` |
| `kimi-cli` | `~/.kimi/skills/` | `<project>/.kimi/skills/` |
| `kode` | `~/.kode/skills/` | `<project>/.kode/skills/` |
| `mcpjam` | `~/.mcpjam/skills/` | `<project>/.mcpjam/skills/` |
| `mistral-vibe` | `~/.vibe/skills/` | `<project>/.vibe/skills/` |
| `mux` | `~/.mux/skills/` | `<project>/.mux/skills/` |
| `neovate` | `~/.neovate/skills/` | `<project>/.neovate/skills/` |
| `openclaw` | `~/.openclaw/skills/` | `<project>/.openclaw/skills/` |
| `openclaude-ide` | `~/.openclaude/skills/` | `<project>/.openclaude/skills/` |
| `openhands` | `~/.openhands/skills/` | `<project>/.openhands/skills/` |
| `opencode` | `~/.opencode/skills/` | `<project>/.opencode/skills/` |
| `pi` | `~/.pi/agent/skills/` | `<project>/.pi/agent/skills/` |
| `pochi` | `~/.pochi/skills/` | `<project>/.pochi/skills/` |
| `qoder` | `~/.qoder/skills/` | `<project>/.qoder/skills/` |
| `qwen-code` | `~/.qwen/skills/` | `<project>/.qwen/skills/` |
| `replit` | `-` | `<project>/.agent/skills/` |
| `roo` | `~/.roo/skills/` | `<project>/.roo/skills/` |
| `trae` | `~/.trae/skills/` | `<project>/.trae/skills/` |
| `trae-cn` | `~/.trae-cn/skills/` | `<project>/.trae-cn/skills/` |
| `warp` | `~/.warp/skills/` | `<project>/.warp/skills/` |
| `windsurf` | `~/.codeium/windsurf/skills/` | `<project>/.codeium/windsurf/skills/` |
| `zencoder` | `~/.zencoder/skills/` | `<project>/.zencoder/skills/` |

</details>

## 开发

环境搭建、测试、代码风格请参考 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。设计原则和命令语义请参考 [docs/DESIGN.md](docs/DESIGN.md)。

## 许可证

本项目使用 [MPL-2.0](./LICENSE)。
