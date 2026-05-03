# 别再把 Skills 复制到每个 AI Agent 里了——aweskill 如何解决多 Agent 技能管理的混乱

你同时用好几个 AI 编码工具。Claude Code 做深度重构，Cursor 做快速编辑，Codex 跑自主任务，Gemini CLI 做多模态工作，可能还有 Windsurf 或 Qwen Code。

每个工具有自己的 skill 目录，每个工具期望 `SKILL.md` 放在不同的地方。每发现一个有用的 skill，你就复制一次。然后再复制一次。再复制一次。

一个月后：一份过期了，一份坏了，一份有没人记得改过的本地编辑，没人知道哪份是真正的源。

这就是 `aweskill` 要解决的问题。

官网：[aweskill.webioinfo.top](https://aweskill.webioinfo.top/)

## 真正的问题不是第一天——是第三十天

往一个 agent 装一次 skill 很简单，大多数工具都能做到。

难的是之后：

- **哪份是真的？** 同一个 `pr-review` skill 存在于 `~/.claude/skills/`、`~/.cursor/skills/`、`~/.codex/skills/`。你改哪个？
- **怎么更新？** 上游作者修了个 bug，你得找到每一份副本，逐个替换。
- **怎么组织？** 你有 15 个 skill，有些是后端的，有些是前端的，有些只想在 Codex 里用，有些要全局启用。
- **怎么恢复？** 一个 symlink 断了，一个 agent 更新把你的 skill 目录清空了。怎么办？
- **怎么避免复制螺旋？** 每加一个新 agent，就再来一轮手工复制。

`aweskill` 把 skill 当成长期本地资产来管理，不是一次性安装目标。

## aweskill 是什么？

`aweskill` 是面向 AI Agent 的本地 Skill 包管理器。可以把它想象成 `SKILL.md` 文件的 `npm`。

它在 `~/.aweskill/skills/` 维护一份中央 skill 仓库，然后通过 symlink（Windows 上用 junction 或受管 copy）把选中的 skill 投影到各个 agent 需要的目录。

### 核心卖点

| # | 特性 | 意义 |
|---|------|------|
| 1 | **中央仓库** | 每个 skill 只有一份，放在 `~/.aweskill/skills/`。不再有散落各处的重复副本。 |
| 2 | **多 Agent 投影** | 同一个 skill，四个 agent，一条命令。支持 47 个 agent，包括 Claude Code、Cursor、Codex、Gemini CLI、Windsurf 等。 |
| 3 | **Bundle 打包** | 按工作流（"backend"、"frontend"、"daily-coding"）分组 skill，一次性投影整组。 |
| 4 | **来源追踪更新** | `aweskill` 记录每个 skill 来自哪里。`aweskill update` 拉取上游更新，同时保护本地修改。 |
| 5 | **内置 Agent 管理技能** | 自带 `aweskill` 和 `aweskill-doctor` 元技能——AI agent 能通过自然语言管理 skill。 |
| 6 | **本地维护能力** | 备份、恢复、查重、清理、同步、修复——全部集成在一个 CLI 里。 |
| 7 | **官网与文档入口** | [aweskill.webioinfo.top](https://aweskill.webioinfo.top/) 提供安装说明、定位说明和 agent 兼容性总览。 |

## 对比：aweskill vs 其他工具

| 能力 | [cc-switch](https://github.com/farion1231/cc-switch) | [sciskill](https://github.com/sciskillhub/sciskill) | [Skills Manager](https://github.com/jiweiyeah/Skills-Manager) | [skillfish](https://github.com/knoxgraeme/skillfish) | [vercel-labs/skills](https://github.com/vercel-labs/skills) | [skills-manage](https://github.com/iamzhihuix/skills-manage) | **aweskill** |
|---|---|---|---|---|---|---|---|
| 中央本地 skill 仓库 | 否 | 否 | 是 | 否 | 否 | 是 | **是** — `~/.aweskill/skills/` |
| registry / catalog 发现能力 | 否 | 是 | 否 | 是 | 是 | 是 | **是** — skills.sh + sciskillhub + 本地仓库 |
| GitHub 风格仓库导入/安装 | 是 | 否 | 否 | 是 | 是 | 是 | **是** |
| 本地路径导入/安装 | 否 | 否 | 否 | 否 | 是 | 否 | **是** |
| 按来源追踪更新 | 否 | 否 | 否 | 是 | 是 | 否 | **是** — 保护本地修改 |
| 多 agent 即插即用投影 | 是 | 否 | 是 | 是 | 是 | 是 | **是** — symlink/junction/copy |
| bundle / manifest / collection 分组 | 否 | 否 | 否 | 是 | 否 | 是 | **是** |
| 可被 agent 调用的管理技能 | 否 | 否 | 否 | 否 | 否 | 否 | **是** — 内置元技能 |
| 本地维护与恢复 | 否 | 否 | 否 | 否 | 否 | 否 | **是** — backup、dedup、clean、recover |

**结论**：其他工具能安装 skill。`aweskill` 管理整个生命周期——发现、安装、组织、更新、维护、恢复——覆盖你使用的每一个 agent。

## 实际案例

### 案例 1：独立开发者中途切换 Agent

你在 Claude Code 里开始写一个功能，做了一半切到 Cursor 写 UI，然后用 Codex 生成测试用例。三个 agent 都需要同样的 `pr-review` 和 `bug-triage` skill。

**没有 aweskill：**
- 复制 `pr-review/SKILL.md` 到 `~/.claude/skills/pr-review/`
- 再复制到 `~/.cursor/skills/pr-review/`
- 再复制到 `~/.codex/skills/pr-review/`
- 对 `bug-triage` 重复以上操作
- 祈祷它们保持同步

**用 aweskill：**

```bash
aweskill agent add skill pr-review,bug-triage --global --agent claude-code
aweskill agent add skill pr-review,bug-triage --global --agent cursor
aweskill agent add skill pr-review,bug-triage --global --agent codex
```

一个源头，三个投影，零复制。

### 案例 2：团队负责人构建标准 Skill 集

团队同时使用 Claude Code 和 Cursor。你希望每个成员都有相同的核心 skill：代码审查、测试指南、API 设计规范、发布清单。

**没有 aweskill：** 分享一个 Google Doc，列出需要手动安装哪些 skill。没人做得一致。

**用 aweskill：**

```bash
aweskill bundle create team-standard
aweskill bundle add team-standard pr-review,test-guidelines,api-design,release-checklist
aweskill agent add bundle team-standard --global --agent claude-code
aweskill agent add bundle team-standard --global --agent cursor
```

每个团队成员跑同样的两条 `agent add` 命令，就能拿到完全一致的 skill 集。Bundle 定义是一个简单的 YAML 文件，可以直接提交到共享仓库。

### 案例 3：Skill 作者发布了更新

你从 `skills.sh` 下载了一个 `security-review` skill。作者刚发布了改进版，覆盖了 OWASP 2025。

**没有 aweskill：** 翻遍四个 agent 目录，下载新版本，手动替换每一份副本，祈祷没遗漏。

**用 aweskill：**

```bash
aweskill update --check           # 查看哪些有更新
aweskill update security-review   # 拉取更新到中央仓库
```

所有已投影的 agent 自动获取更新——它们指向同一个中央副本。

### 案例 4：科研人员使用科研类 Skill

你在 `sciskillhub.org` 发现了一个蛋白质组学分析 skill，想同时在 Gemini CLI 和 Claude Code 里使用。

```bash
aweskill find proteomics
aweskill install sciskill:open-source/research/lifesciences-proteomics
aweskill agent add skill lifesciences-proteomics --global --agent gemini-cli
aweskill agent add skill lifesciences-proteomics --global --agent claude-code
```

一次安装，多个 agent，来源已追踪。

### 案例 5：灾难恢复

一次 agent 更新清空了你的 `~/.cursor/skills/` 目录。你精心整理的所有 skill 全没了。

**没有 aweskill：** 从头开始，重新下载所有内容，凭记忆重建整个配置。

**用 aweskill：**

```bash
aweskill store backup                          # 你上周跑过这个
aweskill store restore ~/Downloads/aweskill-backup.tar.gz
aweskill agent add bundle daily-coding --global --agent cursor
```

中央仓库恢复，Bundle 重新投影，继续工作。

## 快速开始

安装：

```bash
npm install -g aweskill
aweskill store init
```

查找并安装 skill：

```bash
aweskill find pr-review
aweskill install owner/repo
```

投影到所有 agent：

```bash
aweskill agent add skill pr-review --global --agent claude-code
aweskill agent add skill pr-review --global --agent codex
aweskill agent add skill pr-review --global --agent cursor
aweskill agent add skill pr-review --global --agent gemini-cli
```

或用 bundle 一次投影整组：

```bash
aweskill bundle create daily-coding
aweskill bundle add daily-coding pr-review,bug-triage,release-checklist
aweskill agent add bundle daily-coding --global --agent claude-code
aweskill agent add bundle daily-coding --global --agent cursor
```

## 也值得推荐的几个工具

如果你的核心诉求是“跨多个 agent 维护一套可修复、可恢复、可持续演进的本地 skills 资产”，`aweskill` 更合适。但这个生态里还有几类相邻工具，也值得顺手推荐：

- [skills-manage](https://github.com/iamzhihuix/skills-manage)：适合偏可视化管理的用户。它更强调桌面 UI、中央技能库、marketplace 浏览、GitHub 导入、collections 和按平台安装。
- [cc-switch](https://github.com/farion1231/cc-switch)：如果你的主要痛点是切换不同 API 配置、模型入口和本地 AI 工具配置，而不是长期维护 skills，本工具更对症。
- [sciskill](https://github.com/sciskillhub/sciskill)：如果你主要想下载科研、生信方向的 skills，这个 registry 元数据仓库更有针对性。
- [vercel-labs/skills](https://github.com/vercel-labs/skills)：如果你想从更流行、更开放的 skills 生态里挑选 skill，并借助 `skills.sh` 一类入口按热度和生态接受度来筛选，它是很好的起点。

## 让 AI Agent 自主管理 Skill

`aweskill` 自带两个内置元技能。先把它们投影到当前 agent：

```bash
aweskill agent supported
aweskill agent add skill aweskill,aweskill-doctor --global --agent codex
aweskill agent list --global --agent codex
```

把 `codex` 替换成你的 agent id。

你的 AI agent 可以响应这样的请求：

- "帮我给所有 agent 安装最新的 pr-review skill"
- "检查一下有没有 skill 需要更新"
- "清理仓库里的重复 skill"
- "备份我的 skill 仓库"

Agent 会代替你运行 `aweskill` 命令。这让 `aweskill` 从"你管理的工具"变成了"agent 可以自管理的工具"。

## 47 个 Agent，还在增加

`aweskill` 目前支持 **47 个 AI 编码 agent**：

Claude Code、Cursor、Windsurf、Codex、GitHub Copilot、Gemini CLI、OpenCode、Goose、Amp、Roo Code、Kiro CLI、Kilo Code、Trae、Cline、Antigravity、Droid、Augment、OpenClaw、CodeBuddy、Crush、Kode、Mistral Vibe、Mux、OpenClaude IDE、OpenHands、Qoder、Qwen Code、Replit、Neovate、AdaL 等等。

完整列表见 [README](https://github.com/mugpeng/aweskill#supported-agents)。

## 什么时候该用 aweskill

**适合你的情况：**
- 同时使用多个 AI 编码 agent
- 希望有一个本地唯一的 skill 来源
- 需要在 Claude Code、Cursor、Codex、Gemini CLI 等之间共享 skill
- 想用 bundle 代替手工复制
- 在乎来源追踪更新和可恢复的本地状态
- 希望 AI agent 能通过自然语言管理 skill

**可能不需要的情况：**
- 只用一个 agent，且不打算切换
- 安装一次 skill 后再也不动

## 总结

安装一个 skill 不是难题。保持它更新、有组织、跨 agent 一致、出问题时可恢复——这才是难题。

`aweskill` 解决的是第三十天的问题。中央仓库、多 agent 投影、来源追踪更新、Bundle 组织、内置维护、Agent 可调用管理。

如果你同时在多个 AI agent 之间工作，`aweskill` 能把散落的 skill 文件夹变成真正可管理的东西。

---

**官网**：[aweskill.webioinfo.top](https://aweskill.webioinfo.top/)

**立即安装**：`npm install -g aweskill`

**GitHub**：[github.com/mugpeng/aweskill](https://github.com/mugpeng/aweskill)

**npm**：[npmjs.com/package/aweskill](https://www.npmjs.com/package/aweskill)
