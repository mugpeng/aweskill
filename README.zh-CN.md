<div align="center">
  <img src="./logo.png" alt="aweskill" width="760">
  <h1>aweskill：面向 AI Agent 的 Skill 包管理器</h1>
  <p><strong>以 CLI 为核心的 Skill 包管理器，AI Agent 也能直接调用和维护。</strong></p>
  <p>在 Codex、Claude Code、Cursor、Gemini CLI、Qwen Code、Windsurf 等工具之间安装、更新、组织并投影 Skills。</p>
  <p>
    <a href="./README.md">English</a> ·
    <strong>简体中文</strong> ·
    <a href="https://aweskill.webioinfo.top/">官网</a>
  </p>
  <p>
    <a href="https://github.com/mugpeng/aweskill/releases"><img src="https://img.shields.io/badge/version-0.3.2-7C3AED?style=flat-square" alt="Version"></a>
    <a href="https://github.com/mugpeng/aweskill"><img src="https://img.shields.io/badge/node-%E2%89%A520-0EA5E9?style=flat-square" alt="Node"></a>
    <a href="https://github.com/mugpeng/aweskill/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-22C55E?style=flat-square" alt="License"></a>
    <a href="https://aweskill.webioinfo.top/"><img src="https://img.shields.io/badge/website-aweskill.webioinfo.top-7C3AED?style=flat-square" alt="Website"></a>
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


> 像 npm 管理软件包一样管理本地 AI Agent Skills：一次安装，多 Agent 复用。

`aweskill` 是一个本地 Skill 包管理器，用来在 Codex、Claude Code、Cursor、Gemini CLI、Qwen Code、Windsurf、OpenCode 等 AI Agent 之间安装、更新、组织和复用 Skills。

它帮助开发者查找、安装、更新、分组、去重、备份并复用 Skills。

你不需要再把同一套 `SKILL.md` 文件夹手动复制到每个工具里。`aweskill` 会把 `~/.aweskill/skills/` 作为统一的中央仓库，再通过 `symlink`、junction 或受管 `copy`，把选中的 Skill 投影到每个 Agent 需要的目录。

> **项目网站：** [aweskill.webioinfo.top](https://aweskill.webioinfo.top/) — 包含安装指南和 Agent 兼容性概览。

## 安装

你可以自己安装 `aweskill`，也可以让 AI 编码 Agent 帮你安装。

### 让 AI Agent 安装 aweskill

如果你正在 Codex、Claude Code、Cursor、Gemini CLI 或其他编码 Agent 里工作，可以直接告诉它：

```text
读取 https://github.com/mugpeng/aweskill/blob/main/README.ai.md 并按照说明为当前 Agent 安装 aweskill。
```

Agent 会自动完成 CLI 安装、store 初始化和内置 Skills 投影。重启 Agent 后，就可以通过自然语言使用 aweskill。

### 从 npm 安装（推荐）

需要 [Node.js](https://nodejs.org/) 20 及以上。

```bash
npm install -g aweskill
aweskill --help
```

固定到某一版本：

```bash
npm install -g aweskill@0.3.2
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

## FAQ

### 为什么用 aweskill，它适合谁？

`aweskill` 适合这些开发者和团队：同时使用多个 AI Agent，维护可复用的 `SKILL.md`、Agent 指令或工作流，并希望用一个本地唯一事实来源来管理 Skills，而不是把同一批目录反复复制到各个工具里。它尤其适合一种很现实的场景：问题不只是“怎么分发”，还包括长期使用后积累的损坏投影、重复 Skills、可疑条目、失效链接，以及损坏的 `SKILL.md` frontmatter 该如何诊断和修复。

- **一个中央仓库**：所有本地 Skills 统一放在 `~/.aweskill/skills/`
- **发现、安装、更新闭环**：可以从 [skills.sh](https://skills.sh/)、[sciskillhub.org](https://sciskillhub.org/)、GitHub 风格来源和本地路径发现、安装并追踪更新 Skills
- **多 Agent 投影**：同时服务 Codex、Claude Code、Cursor、Gemini CLI、Qwen Code、Windsurf、OpenCode 等工具
- **面向真实本地混乱状态的 Doctor 工作流**：处理损坏投影、重复条目、可疑文件、frontmatter 异常，以及 Agent 目录和中央仓库之间的漂移
- **Bundle 组织方式**：按项目、团队、工作流或 Agent 组织可复用的 Skill 集合
- **受管启用/停用模型**：通过按需投影实现插拔，而不是手动把目录复制到每个工具里
- **可被 Agent 调用的管理与修复 Skills**：让 AI Agent 能根据自然语言请求运行 `aweskill` 和 `aweskill-doctor` 工作流
- **本地维护与恢复能力**：备份、恢复、去重、清理、同步修复都在同一个本地 CLI 流程里完成

<details>
<summary>更多 FAQ</summary>

### aweskill 把 Skills 存在哪里？

`aweskill` 会把托管的 Skills 存放在 `~/.aweskill/skills/`。

### aweskill 能在 Claude Code 和 Codex 之间共享 Skills 吗？

可以。`aweskill` 会维护一份中央 Skill 副本，再把它投影到每个 Agent 需要的 Skill 目录。

### aweskill 支持 Cursor 和 Gemini CLI 吗？

支持。`aweskill` 支持 Cursor、Gemini CLI 以及许多其他 AI Agent 的 Skill 投影。

### aweskill 是 local-first 吗？

是。`aweskill` 在你的本机管理 Skills，不需要托管服务。

### AI Agent 能直接调用 aweskill 吗？

可以。`aweskill` 内置了 `aweskill` 和 `aweskill-doctor` 两个管理 Skills；安装或投影它们之后，AI Agent 就可以根据自然语言请求，通过运行 aweskill 命令来搜索、安装、更新、分组、修复、去重、清理、同步或投影 Skills。

### 当本地 Skill 状态变乱时，aweskill 的差异点是什么？

`aweskill` 不只负责安装和投影，也提供本地状态漂移后的修复路径：

- **`doctor sync`**：检查或修复 `broken`、`duplicate`、`matched`、`new`、`suspicious` 等 Agent 条目
- **`doctor clean`**：在受管区域里找出不规范的非 store 文件，避免越积越多
- **`doctor dedup`**：帮助处理重复 Skill，不要求你直接盲删
- **`doctor fix-skills`**：修复损坏的 `SKILL.md` frontmatter，并可先备份原文件
- **`agent list` 作为预览视图**：先看修复状态，再决定是否应用修改

### aweskill 怎么处理 find、install 和 update？

`aweskill` 把本地编排和带来源追踪的 Skill 生命周期放在一起：

- **Find**：用一条命令同时搜索 [skills.sh](https://skills.sh/)、[sciskillhub.org](https://sciskillhub.org/) 或本地中央仓库
- **Install**：从 GitHub 风格来源、本地路径或 `sciskill:<skill-id>` 标识安装到中央仓库
- **Update**：按记录的来源刷新已追踪安装，同时保护中央仓库里的本地修改
- **Project**：把同一批托管 Skill 投影到 Codex、Claude Code、Cursor、Gemini CLI 等 Agent

</details>

## 对比

| 能力维度 | [`cc-switch`](https://github.com/farion1231/cc-switch) | [`sciskill`](https://github.com/sciskillhub/sciskill) | [`Skills Manager`](https://github.com/jiweiyeah/Skills-Manager) | [`skillfish`](https://github.com/knoxgraeme/skillfish) | [`vercel-labs/skills`](https://github.com/vercel-labs/skills) | [`skills-manage`](https://github.com/iamzhihuix/skills-manage) | aweskill 如何实现 |
|---|---|---|---|---|---|---|---|
| 单一中央本地 Skill 仓库 | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | 把所有托管 Skills 放在 `~/.aweskill/skills/`，作为唯一事实来源 |
| registry / catalog 发现能力 | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | 用 `aweskill find` 搜索 [skills.sh](https://skills.sh/)、[sciskillhub.org](https://sciskillhub.org/) 或本地中央仓库 |
| GitHub 风格仓库导入/安装 | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | 从 GitHub 风格来源和 `sciskill:<skill-id>` 导入到中央仓库 |
| 本地路径导入/安装 | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | 从本地路径导入到中央仓库 |
| 按记录来源追踪更新 | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | 记录来源元数据，再用 `aweskill update` 刷新，同时保护中央仓库里的本地修改 |
| 多 Agent 按需插拔投影 | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | 通过 `symlink`、junction 或受管 `copy`，把中央仓库里的 Skills 投影到各 Agent 目录 |
| bundle / manifest / collection 分组 | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | 用 Bundle 按项目、团队、工作流或 Agent 组织可复用的 Skill 集合 |
| 可被 Agent 直接调用的管理 Skills | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 内置 `aweskill` 和 `aweskill-doctor` Skills，让 AI Agent 可根据自然语言请求运行 aweskill 工作流 |
| 本地维护与恢复能力 | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | CLI 内置 backup、restore、dedup、clean、sync、fix-skills 和 recover 工作流 |

这里的 `sciskill` 指的是 `sciskillhub` 下的公开 registry 元数据仓库，不是本地 Skill 管理 CLI。

当你的核心问题不只是“装一个 Skill”，而是“长期维护一套可复用、可更新、可恢复、可跨 Agent 复用，而且出问题后还能诊断和修复的本地 Skills 资产”时，`aweskill` 更合适。

## 内置 Agent Skills

`aweskill` 最适合的用法，是先让你的编码 Agent 能直接操作它。

建议先把内置的 `aweskill` 和 `aweskill-doctor` Skills 投影给当前 Agent：

- `aweskill` 负责日常操作，例如 `find`、`install`、`update`、`bundle` 和 `agent add`
- `aweskill-doctor` 负责修复优先的工作流，例如 `doctor sync`、`doctor clean`、`doctor dedup`、`doctor fix-skills` 和 `agent recover`
- 如果不先投影这两个 Skill，Agent 当然也能直接跑 shell 命令，但它不会自带这些面向 aweskill 的操作指引，也就不容易稳定地从自然语言请求进入合适的工作流

## 快速开始

`aweskill` 的推荐路径很简单：CLI 只安装一次，先把内置管理 Skills 装给 Agent，之后就让 Agent 用自然语言来日常操作 aweskill。

### 1. 一次性完成 aweskill 引导

```bash
# 安装 aweskill 并初始化中央仓库
npm install -g aweskill
aweskill store init

# 看一下 aweskill store 在哪里
aweskill store where --verbose
```

### 2. 给 Agent 装上管理能力

```bash
# 查看支持的 Agent id
aweskill agent supported

# 把内置管理 Skills 投影给当前 Agent
aweskill agent add skill aweskill,aweskill-doctor --global --agent codex

# 确认当前投影状态
aweskill agent list --global --agent codex
```

把 `codex` 换成你正在使用的 Agent id。

### 3. 开始用自然语言驱动 aweskill

投影好 `aweskill` 和 `aweskill-doctor` 之后，你就可以直接对编码 Agent 说：

```text
帮我找一个适合 Python 数据分析的 Skill，并安装到 aweskill central store。

把 frontend Bundle 投影到 Codex 和 Cursor。

扫描我现有的 Agent Skill 目录，把未托管的 Skills 导入 aweskill。

检查已安装的 Skill 是否有来源更新。

先检查 Codex 下有没有 broken 或 duplicate Skill，不要立即修改。

修复 Codex 下 broken 和 duplicate 的投影，必要时先备份。
```

### 4. 常见手动 CLI 流程

```bash
# 跨支持的 provider 查找 Skill
aweskill find protein

# 只搜索本地中央仓库
aweskill find review --local

# 把发现到的 Skill 安装到中央仓库
aweskill install sciskill:open-source/research/lifesciences-proteomics

# 检查已追踪安装是否有来源更新
aweskill update --check

# 更新 aweskill 自身（npm 稳定版）
aweskill self-update

# 从 GitHub dev 分支更新 aweskill
aweskill self-update --dev

# 扫描已有 Agent 的 Skill 目录
aweskill store scan

# 把扫描到的 Agent Skill 导入中央仓库
aweskill store scan --import

# 导入一个 Skills 根目录或单个 Skill
aweskill store import ~/.agents/skills
# aweskill store import /path/to/my-skill --link-source

# 创建 Bundle
aweskill bundle create frontend
aweskill bundle add frontend my-skill

# 为一个 Agent 启用这个 Bundle
aweskill agent add bundle frontend --global --agent claude-code

# 查看当前投影状态
aweskill agent list
```

## Windows

`aweskill` 现在已经支持 Windows 原生使用。

- 需要 Node.js 20 及以上
- 推荐使用 PowerShell 执行命令
- 在 Windows 上，Agent 投影会优先使用目录 junction；如果系统不允许创建链接，会回退到受管 copy
- `store backup` 和 `store restore` 不再依赖系统自带 `tar`

示例：

```powershell
aweskill store init
aweskill store scan
aweskill agent add bundle frontend --global --agent codex
```

如果你在 Windows 上遇到路径、权限或投影问题，建议带上 shell、Node 版本和目标 Agent 信息来提 issue。

## 核心模型

`aweskill` 会把 `~/.aweskill/skills/` 作为唯一的 Skill 中央仓库，用 Bundle 组织可复用的 Skill 集合，再把选中的 Skill 投影到各个 Agent 的技能目录。投影后的文件系统状态本身就是启用状态。

## 支持范围

当前支持的 Agent：

`adal`、`amp`、`antigravity`、`augment`、`bob`、`claude-code`、`cline`、`codebuddy`、`command-code`、`continue`、`codex`、`copilot`、`cortex`、`crush`、`cursor`、`deepagents`、`droid`、`firebender`、`gemini-cli`、`github-copilot`、`goose`、`iflow-cli`、`junie`、`kilo`、`kilo-code`、`kimi-cli`、`kiro-cli`、`kode`、`mcpjam`、`mistral-vibe`、`mux`、`neovate`、`openclaw`、`openclaude-ide`、`openhands`、`opencode`、`pi`、`pochi`、`qoder`、`qwen-code`、`replit`、`roo`、`trae`、`trae-cn`、`warp`、`windsurf`、`zencoder`

关键目录：

- 中央仓库：`~/.aweskill/skills/`
- 重复项暂存区：`~/.aweskill/dup_skills/`
- 备份根目录：`~/.aweskill/backup/`
- dedup 备份目录：`~/.aweskill/backup/dedup/`
- fix-skills 备份目录：`~/.aweskill/backup/fix_skills/`
- Bundle 文件：`~/.aweskill/bundles/*.yaml`
- 内置 Skill：`resources/skills/aweskill/`、`resources/skills/aweskill-doctor/`

发现与安装来源：

- [skills.sh](https://skills.sh/) 现在作为社区 Skill 发现源使用，可能返回可直接安装的 GitHub 风格来源，也可能返回只能跳转查看上游安装说明的 discover-only 条目
- [sciskillhub.org](https://sciskillhub.org/) 现在作为科研和技术类 Skill registry 使用，提供可安装的 `sciskill:<skill-id>` 来源
- 本地中央仓库也可以作为 `local` provider 搜索，读取 `~/.aweskill/skills/*/SKILL.md`
- `aweskill find` 默认同时搜索 `skills.sh` 和 `sciskill`，按规范化后的名称合并结果；`--limit` 会先按 provider 分别生效，再做合并去重；用 `--local` 或 `--provider local` 可只搜索本地中央仓库
- `aweskill store install` 当前支持本地路径、GitHub 来源和 `sciskill:<skill-id>` 标识

## 常见工作流

### 把现有 Skill 导入中央仓库

```bash
# 从现有 Agent Skill 目录导入
aweskill store import ~/.agents/skills

# 导入外部 Skill 目录，并保留原目录不变
aweskill store import ~/Downloads/pr-review

# 导入外部 Skill 目录，并把原目录替换成 aweskill 托管投影
aweskill store import ~/Downloads/pr-review --link-source

# 导入外部 Skill 目录，并为后续 store update 建立本地来源追踪
aweskill store import ~/Downloads/pr-review --track-source

# 导入扫描到的 Agent Skill，默认回写成 aweskill 托管投影
aweskill store scan --import

# 导入扫描到的 Agent Skill，但保留原 Agent 目录不变
aweskill store scan --import --keep-source
```

### 查找、安装并更新已追踪 Skill

```bash
# 同时搜索 skills.sh 和 sciskillhub.org
aweskill find protein

# 只搜索一个 provider
aweskill find protein --provider sciskill

# 搜索本地中央仓库并查看命中的 Skill 路径
aweskill find review --local

# 查看一个本地 Skill 的摘要
aweskill store show paper-review

# 输出完整 markdown 或只输出路径
aweskill store show paper-review --raw
aweskill store show paper-review --path

# 安装一个从 skills.sh 发现到的 GitHub 风格来源
aweskill store install owner/repo

# 从 sciskillhub.org 安装一个科研 Skill
aweskill store install sciskill:open-source/research/lifesciences-proteomics

# 只检查已追踪安装是否有更新，不改文件
aweskill store update --check

# 按已记录来源刷新一个已追踪 Skill
aweskill store update lifesciences-proteomics
```

### 构建可复用 Bundle

```bash
# 创建一个可复用 Bundle
aweskill bundle create backend

# 给 Bundle 添加多个 Skill
aweskill bundle add backend api-design,db-schema

# 查看 Bundle 内容
aweskill bundle show backend
```

### 把 Skill 投影到多个 Agent

```bash
# 把一个 Skill 投影到检测到的全局 Agent 目录
aweskill agent add skill biopython

# 把多个 Skill 投影到指定 Agent 的全局目录
aweskill agent add skill biopython,scanpy --global --agent codex

# 把整个 Bundle 投影到所有检测到的全局 Agent
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

# 查看 Agent 条目分类
aweskill agent list

# 清理中央仓库里的可疑条目
aweskill doctor clean

# 把中央仓库里的重复 Skill 移到 dup_skills
aweskill doctor dedup --apply

# 在移动到 dup_skills 前先备份重复 Skill
aweskill doctor dedup --apply --backup

# 在改写前先备份异常的 SKILL.md
aweskill doctor fix-skills --apply --backup

# 先看某个 Agent 下有哪些可修项
aweskill doctor sync --global --agent codex

# 修复某个 Agent 下的 broken / duplicate / matched 条目
aweskill doctor sync --global --agent codex --apply

# 只有显式指定时才删除 suspicious Agent 条目
aweskill doctor sync --global --agent codex --apply --remove-suspicious
```

所有 `doctor` 命令默认为 dry run，加上 `--apply` 才会真正修改。

`aweskill doctor fix-skills` 会报告两类结果：

- 真修复项：`missing-closing-delimiter` 补上 frontmatter 缺失的结束分隔线，`invalid-yaml` 用可恢复字段和正文重建损坏 frontmatter，`added-frontmatter` 在文件直接从正文开始时补最小 frontmatter，`normalized-name` 恢复可用的规范 Skill 名称，`normalized-description` 用正文第一句恢复可用描述。
- 信息项：`normalized-required-permissions` 报告可规范化为标准列表形式的权限，`preserved-unknown-fields` 报告核心字段之外的 frontmatter 字段，`removed-empty-fields` 报告可删除的空数组、空对象或空标量值。

详细说明与修复前后示例见 [docs/fix-skills-categories.md](docs/fix-skills-categories.md)。

## 命令面

核心命令：`store init`、`store where`、`store import`、`bundle create`、`agent add`、`doctor clean`

高频搜索和来源追踪流程也提供顶层命令：`aweskill find`、`aweskill install`、`aweskill update`。

<details>
<summary>全部命令</summary>

| 命令 | 说明 |
| --- | --- |
| `aweskill self-update [--dev] [--check]` | 更新 aweskill CLI 本身；默认从 npm 更新，`--dev` 从 GitHub dev 分支构建，`--check` 仅显示版本不更新 |
| `aweskill store init [--scan] [--verbose]` | 初始化 `~/.aweskill` 布局 |
| `aweskill store where [--verbose]` | 显示 `~/.aweskill` 位置，并汇总核心 store 目录 |
| `aweskill store backup [archive] [--skills-only]` | 归档中央仓库；默认同时包含 Skills 和 Bundles |
| `aweskill store restore <archive> [--override] [--skills-only]` | 从备份归档或已解包目录恢复 |
| `aweskill store scan [--global\|--project [dir]] [--agent <agent>] [--import] [--keep-source] [--override] [--verbose]` | 按指定 scope 和 Agent 集合扫描支持的 Agent Skill 目录；加上 `--import` 会立即把扫描结果导入中央仓库 |
| `aweskill store import <path> [--keep-source\|--link-source] [--track-source] [--override]` | 导入单个 Skill 或整个 Skills 根目录；外部路径默认保留原目录，`--track-source` 可为显式本地导入建立后续 `store update` 追踪 |
| `aweskill store import --scan [--global\|--project [dir]] [--agent <agent>] [--keep-source\|--link-source] [--override]` | 按指定 scope 和 Agent 集合导入当前扫描结果；扫描到的 Agent 路径默认会回写为 aweskill 托管投影 |
| `aweskill store find <query> [--provider <skills-sh\|sciskill\|local>] [--local] [--limit <n>] [--domain <domain>] [--stage <stage>]` | 默认搜索 `skills.sh` 和 `sciskill`，也可用 `--local` / `--provider local` 只搜索本地中央仓库；远程结果输出可安装 `source` 或 discover-only 提示，本地结果输出 Skill 路径和 `store show` 提示 |
| `aweskill store install <source> [--list] [--skill <name>] [--all] [--ref <ref>] [--as <name>] [--override]` | 从本地路径、GitHub 来源或 `sciskill:<skill-id>` 安装 Skill 到中央仓库，并为后续 `store update` 建立追踪记录 |
| `aweskill store update [skill...] [--check] [--dry-run] [--source <source>] [--override]` | 从已记录的来源检查或刷新已追踪 Skill，并把中央仓库中的副本当作受保护的本地状态 |
| `aweskill store list [--verbose]` | 列出中央仓库中的 Skill |
| `aweskill store show <skill> [--summary\|--raw\|--path]` | 默认输出中央仓库 Skill 的摘要，也可以输出完整 `SKILL.md` 或只输出 `SKILL.md` 路径 |
| `aweskill store remove <skill> [--force]` | 从中央仓库删除一个 Skill，并同步清理该 Skill 的 tracked lock 记录 |
| `aweskill bundle list [--verbose]` | 列出 Bundle |
| `aweskill bundle create <name>` | 创建 Bundle |
| `aweskill bundle add <bundle> <skill>` | 向 Bundle 增加一个或多个 Skill |
| `aweskill bundle remove <bundle> <skill>` | 从 Bundle 移除一个或多个 Skill |
| `aweskill bundle show <name>` | 查看 Bundle 内容 |
| `aweskill bundle template list [--verbose]` | 列出内置 Bundle 模板 |
| `aweskill bundle template import <name>` | 把内置模板复制到本地仓库 |
| `aweskill agent supported` | 列出全部支持的 Agent id，用 `✓` / `x` 标记 global 安装状态，并显示已检测到的 global Skills 路径 |
| `aweskill agent add bundle\|skill ...` | 把托管 Skill 投影到 Agent 目录 |
| `aweskill agent remove bundle\|skill ... [--force]` | 删除托管投影 |
| `aweskill agent list [--global\|--project [dir]] [--agent <agent>] [--verbose]` | `doctor sync` 的只读预览视图：检查 `linked`、`broken`、`duplicate`、`matched`、`new`、`suspicious` 状态；省略 `--agent` 时，先输出当前 scope 检测到的 Agent 集合，再输出分组结果 |
| `aweskill agent recover` | 把托管 symlink 恢复为完整目录 |
| `aweskill doctor sync [--apply] [--remove-suspicious] [--global\|--project [dir]] [--agent <agent>] [--verbose]` | 默认只预览；加上 `--apply` 修复 broken 并重连 duplicate / matched，`--apply --remove-suspicious` 额外删除 suspicious；省略 `--agent` 时，先输出当前 scope 检测到的 Agent 集合 |
| `aweskill doctor clean [--apply] [--skills-only] [--bundles-only] [--verbose]` | 按 `skills` / `bundles` 分组查找不规范的 store 条目，并可选清理 |
| `aweskill doctor dedup [--apply] [--backup] [--delete]` | 查找重复 Skill，并可选移动或删除；`--backup` 会先复制到 `~/.aweskill/backup/dedup/` |
| `aweskill doctor fix-skills [--apply] [--backup] [--include-info] [--skill <skill>] [--verbose]` | 检查 `SKILL.md` frontmatter 异常；真修复项包括补结束分隔线、重建无效 YAML、补 frontmatter、规范 name 和 description；`--backup` 会在改写前先复制原文件到 `~/.aweskill/backup/fix_skills/`，`--include-info` 会附带不改写的信息项，`--apply` 只会改写真修复项 |

</details>

`aweskill find` 会优先输出 `aweskill store install` 能直接使用的 `source`。如果 provider 返回的是 `smithery.ai` 这类仅供发现的来源，结果仍会显示，但 `aweskill` 会明确标注它不支持直接安装，并提示你去对应的 `skills.sh` 页面查看上游安装说明。本地搜索结果不会输出安装命令，而是输出 Skill 路径和 `aweskill store show <skill>` 提示。默认同时搜索两个远程 provider 时，`--limit` 按 provider 分别生效，再做合并去重。

`--domain` 和 `--stage` 只适用于 sciskill。若和 `--provider skills-sh` 一起传入，`aweskill` 现在会直接报错，而不是忽略过滤条件。对 sciskill 使用这两个参数时，传入值必须与对应枚举完全一致，包括空格和大小写；非法值同样会直接报错，并列出允许值。

### `--domain` 可用值

| 值 | 含义 |
| --- | --- |
| `Agricultural Sciences` | 农业科学 |
| `Chemical Sciences` | 化学科学 |
| `Computational Sciences` | 计算科学 |
| `General Research` | 通用研究 |
| `Life Sciences` | 生命科学 |
| `Mathematical and Statistical Sciences` | 数理统计 |
| `Medical and Health Sciences` | 医学健康 |
| `Physical Sciences` | 物理科学 |

### `--stage` 可用值

| 值 | 含义 |
| --- | --- |
| `Study Design` | 研究设计 |
| `Data / Sample Acquisition` | 数据/样本采集 |
| `Data Processing` | 数据处理 |
| `Data Analysis and Modeling` | 分析建模 |
| `Validation and Interpretation` | 验证与解释 |
| `Visualization and Presentation` | 可视化展示 |
| `Writing and Publication` | 写作发表 |

## 内置 Skill

`aweskill` 内置了两个 meta-skill，用来教 AI Agent 直接运行 aweskill 命令。

- `aweskill`：常规管理，覆盖 `find`、`install`、`update`、中央仓库流程、Bundle 和 Agent 投影
- `aweskill-doctor`：异常诊断和修复，覆盖损坏投影、重复 Skills、可疑条目和同步清理

```bash
aweskill store import resources/skills/aweskill
aweskill store import resources/skills/aweskill-doctor
```

Skill 目录结构与设计原则见 [docs/DESIGN.md](docs/DESIGN.md)。

## 贡献

如果你想参与开发，请看 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。

如果你想了解命令模型和文件系统设计约束，请看 [docs/DESIGN.md](docs/DESIGN.md)。

那里现在集中说明了：

- 开发流程与测试要求

`docs/DESIGN.md` 集中说明了：

- 设计取舍
- Bundle 文件格式
- 投影模型
- 内置 Skill 结构与设计原则

欢迎提交文档改进、测试补充和小而聚焦的功能改进。

如果你希望使用一个独立于本仓库、可直接分享给其他用户的技能归档集合，可以参考 [oh-my-skills](https://github.com/mugpeng/oh-my-skills)。它是一个单独维护的备份仓库，用来存放可分发的 Bundle 和整库快照归档。

## 相关工具

如果你在关注更广的 Skills 生态，下面这些项目都值得使用和研究：

- [sciskill](https://github.com/sciskillhub/sciskill)：公开的 registry 元数据仓库，用来收集带合法 `SKILL.md` 的 GitHub Skills，并发布可供发现的索引。
- [Skills Manager](https://github.com/jiweiyeah/Skills-Manager)：桌面化的多 AI 编码助手技能管理器，适合可视化组织、同步和分享 Skills。
- [skillfish](https://github.com/knoxgraeme/skillfish)：偏 CLI 的 Skill 管理工具，强调安装、更新和跨 Agent 同步。
- [Vibe-Skills](https://github.com/foryourhealth111-pixel/Vibe-Skills)：一体化的 AI Skills 套件与工作流 harness，强调为通用 Agent 编排专家 Skills、验证流程和持久化上下文。
- [vercel-labs/skills](https://github.com/vercel-labs/skills)：开放的 Agent Skills CLI 和生态入口，对 `SKILL.md` 包约定影响很大。
- [cc-switch](https://github.com/farion1231/cc-switch)：面向 Claude Code、Codex、Gemini CLI、OpenCode 等工具的一站式桌面管理器。
- [skills-manage](https://github.com/iamzhihuix/skills-manage)：Tauri 桌面技能管理器，提供中央技能库、marketplace 浏览、GitHub 导入、collections 和按平台安装能力。

## 支持的 Agent

支持 47 个 Agent，包括：

**Claude Code** · **Cursor** · **Windsurf** · **Codex** · **GitHub Copilot** · **Gemini CLI** · **OpenCode** · **Goose** · **Amp** · **Roo Code** · **Kiro CLI** · **Kilo Code** · **Trae** · **Cline** · **Antigravity** · **Droid** · **Augment** · **OpenClaw** · **CodeBuddy** · **Command Code** · **Crush** · **Kode** · **Mistral Vibe** · **Mux** · **OpenClaude IDE** · **OpenHands** · **Qoder** · **Qwen Code** · **Replit** · **Trae CN** · **Neovate** · **AdaL**

<details>
<summary>所有支持的 Agent</summary>

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
