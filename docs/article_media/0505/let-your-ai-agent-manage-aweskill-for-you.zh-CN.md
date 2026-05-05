# 让 AI Agent 自己管理 aweskill

大多数开发者工具，默认还是把“人”当成唯一操作者。

你读文档，装 CLI，判断文件应该放哪里，从 README 里复制命令，粘到终端里，检查输出，修路径，然后再把最后的状态告诉你的 AI 编码 Agent。

在工具只面向人的时代，这很正常。

但现在的 AI 编码 Agent 已经能运行命令、检查文件、遵循项目约定、修复本地状态。既然一个工具是给 Agent 用的，更好的问题就不再是：

> 人应该怎么用这个 CLI？

而是：

> Agent 能不能自己操作这个 CLI？

这正是 `aweskill` 里一个不张扬但很关键的设计点：它是一个以 CLI 为核心、AI Agent 也能自主操作的 Skill 包管理器。

官网：[aweskill.webioinfo.top](https://aweskill.webioinfo.top/)

## 旧流程：你在管理 Agent 的工具

当一个新的 AI Agent 需要某个 Skill，常见流程通常是这样：

1. 你先找到这个 Skill。
2. 你下载或复制它。
3. 你找到当前 agent 的 Skill 目录。
4. 你把 `SKILL.md` 放进正确文件夹。
5. 你重启 agent。
6. 然后祈祷下一个 agent 也是类似布局。

做一次还好。

一旦你同时使用 Codex、Claude Code、Cursor、Gemini CLI、Windsurf、Qwen Code、OpenCode，或者其他 AI 编码 Agent，这件事很快就会变乱。每个工具都有自己的目录结构和约定，最后人反而变成了包管理器。

这其实是反过来的。

如果 Agent 已经能改你的代码、跑测试、诊断失败，那它也应该能管理自己的 Skills。

## aweskill 的方式：给 Agent 一个协议

`aweskill` 提供了一份专门写给 AI 编码 Agent 的引导文档：

```text
Read https://github.com/mugpeng/aweskill/blob/main/README.ai.md and follow it to install aweskill for this agent.
```

对一个有能力的 coding agent 来说，这一句就足够完成初始化。

这份协议会告诉 Agent：

- 检查 Node.js 和 npm 是否可用
- 全局安装 `aweskill`
- 初始化位于 `~/.aweskill/skills/` 的中央 Skill 仓库
- 识别当前运行的 agent
- 把内置的 `aweskill` 和 `aweskill-doctor` 两个 Skills 投影到当前 agent
- 验证投影结果
- 提醒你重启，让新 Skills 正式生效

![AI coding agent 按照 README.ai.md 安装 aweskill 并启用内置管理 Skills 的示例截图。](aweskill-agent-install-demo.png)

重启之后，你就不必记住每一条命令了。直接用自然语言问 Agent 就行。

## 引导完成后，Agent 能做什么？

`aweskill` 自带两个内置元 Skills：

- `aweskill`：处理日常 Skill 管理，包括搜索、安装、更新、Bundle 和 agent 投影
- `aweskill-doctor`：处理修复优先的工作流，包括同步检查、清理、去重、修复格式异常的 `SKILL.md` 和恢复

只要把它们投影到当前 agent，这个 Agent 就能把你的自然语言请求转换成 `aweskill` 命令。

你不必手动输入：

```bash
aweskill find review
aweskill install owner/repo
aweskill agent add skill pr-review --global --agent codex
```

而是可以直接说：

```text
Find a good code-review Skill, install it into aweskill, and enable it for this agent.
```

Agent 可以自己搜索、检查结果、选择可安装来源、执行安装、投影 Skill，并验证结果。

这就是“Agent 能调用的 CLI”和“必须由人看着用的 CLI”之间的差别。

## 使用案例 1：初始化一个全新的 Agent

你换了一台新机器，打开一个新终端，或者刚装好一个新的 coding agent。与其手工配置它的 Skill 目录，不如直接给它一句话：

```text
Read README.ai.md from the aweskill repo and install aweskill for this agent.
```

Agent 会按照引导协议执行：

```bash
npm install -g aweskill
aweskill store init
aweskill store where --verbose
aweskill agent supported
aweskill agent add skill aweskill,aweskill-doctor --global --agent <agent-id>
aweskill agent list --global --agent <agent-id>
```

关键在于，这个协议是保守的。如果 Agent 无法判断正确的 `agent-id`，它应该先问你，而不是自己猜。它也不应该默认把 Skills 投影到所有已安装的 agent。

这让引导流程既适合 Agent 自动执行，又不会变得鲁莽。

## 使用案例 2：让 Agent 找一个 Skill 并安装

假设你正在做一个 Python 数据项目，需要一个好用的数据分析 Skill。

你不必自己去翻 registry，可以直接说：

```text
Find a useful Python data-analysis Skill and install the best match into aweskill.
```

Agent 可以运行：

```bash
aweskill find python data analysis
```

然后它会检查搜索结果，避开只用于发现、不能直接安装的条目，选择最合适的可安装来源，并告诉你它做了什么：

```bash
aweskill install <source>
```

如果这个 Skill 还需要在当前 agent 中启用，Agent 可以继续投影：

```bash
aweskill agent add skill <skill-name> --global --agent <agent-id>
```

人保留判断权，Agent 处理机械工作。

## 使用案例 3：用对话创建项目 Bundle

Bundle 是 Agent 自主管理 Skills 开始变得自然的地方。

你不需要记住一个前端项目到底该配哪些 Skills，可以直接说：

```text
Create a frontend bundle with the Skills we need for UI design, accessibility review, test-driven development, and release checks. Enable it for this agent.
```

Agent 可以把它变成一组命令：

```bash
aweskill bundle create frontend
aweskill bundle add frontend frontend-design,accessibility-review,test-driven-development,release-checklist
aweskill agent add bundle frontend --global --agent <agent-id>
aweskill agent list --global --agent <agent-id>
```

真正的价值不是少打几行字，而是 Agent 可以结合项目上下文，选择相关的 Skills，把它们组织成可复用的 Bundle，并验证当前 Agent 确实能用。

以后你把同一个项目切到另一个 coding tool，这个 Bundle 仍然在。

## 使用案例 4：让 Agent 检查更新

Skills 和其他依赖一样会变旧。说明会更新，上游作者会修 bug，registry 元数据会改进，本地副本也可能漂移。

你不必逐个检查，可以直接问：

```text
Check whether any installed Skills have source updates, but do not change files yet.
```

Agent 可以先运行：

```bash
aweskill update --check
```

然后总结结果，并在真正改动前询问你。

如果你确认，它再做定向更新：

```bash
aweskill update <skill-name>
```

当你同时在 Codex、Claude Code、Cursor 和 Gemini CLI 之间共享同一个 Skill 时，这一点尤其有用。已投影的 agent 指向中央仓库，所以中央仓库更新一次，所有投影到它的 agent 都能获得新版本。

## 使用案例 5：让 Agent 修复 Skill 状态

本地 Skill 目录不是静止的。Agent 会升级，路径会变化，symlink 会断，有人可能手工复制了一个文件夹到托管目录里，某个 Skill 的 frontmatter 也可能格式不对。

这就是 `aweskill-doctor` 的价值。

你可以问：

```text
Check whether this agent's Skills are broken, duplicated, or suspicious. Show me the report first.
```

Agent 可以先做只读检查：

```bash
aweskill agent list --global --agent <agent-id>
aweskill doctor sync --global --agent <agent-id>
aweskill doctor clean
aweskill doctor dedup
aweskill doctor fix-skills
```

修复类命令默认是 dry-run。Agent 可以先读报告、解释风险，只有在你明确同意后才真正应用变更：

```bash
aweskill doctor sync --global --agent <agent-id> --apply
aweskill doctor dedup --apply --backup
aweskill doctor fix-skills --apply --backup
```

这才是更合理的分工：Agent 负责诊断和准备修复，人负责批准破坏性或会改变状态的操作。

## 使用案例 6：把一套可用配置迁移到另一个 Agent

假设你在 Codex 里已经有一套顺手的配置，现在想在 Claude Code 里也启用类似环境。

你可以说：

```text
Look at the Skills and bundles available in aweskill, then project the daily coding setup into Claude Code.
```

Agent 可以检查中央仓库和 Bundle，然后运行：

```bash
aweskill agent supported
aweskill agent add bundle daily-coding --global --agent claude-code
aweskill agent list --global --agent claude-code
```

不用手工复制，不用猜 Claude Code 把 Skills 放在哪里，也不会产生一个过几天就过期的文件夹副本。

一个中央仓库，一个 Bundle，另一个 Agent 就绪。

## 使用案例 7：在高风险修改前先备份

在做大规模清理或迁移之前，你可以说：

```text
Back up my aweskill store before making any Skill changes.
```

Agent 可以运行：

```bash
aweskill store backup
```

然后再继续处理后续任务。万一出问题，可以恢复中央仓库，而不是凭记忆重建。

这是一个很小的细节，但会改变你对维护工作的心理预期。因为状态是可恢复的，所以你更敢让 Agent 参与进来。

## 为什么这件事重要？

Agent 可操作的工具，会改变开发者工作流的形状。

真正适合 AI 编码 Agent 的工具，应该具备这些特点：

- 同时为人和 Agent 写文档
- 通过稳定 CLI 被脚本化调用
- 对破坏性操作保持保守
- 在应用变更前可以检查
- 每一步操作后都容易验证
- 本地状态漂移后可以恢复

`aweskill` 正是围绕这个模型设计的。

它当然也可以作为普通 CLI 由人手动使用。每一条命令你都可以自己跑。但更有意思的工作流，是给 Agent 足够清晰的结构，让它安全地替你操作这个工具。

这就是为什么 `README.ai.md` 存在。

这就是为什么 `aweskill` 和 `aweskill-doctor` 会作为内置 Skills 提供。

这也是为什么 Skill 管理不应该继续困在手工文件夹操作里。

## 试试看

最快的方式，是直接对当前 coding agent 说：

```text
Read https://github.com/mugpeng/aweskill/blob/main/README.ai.md and follow it to install aweskill for this agent.
```

重启后，再试试：

```text
Find a useful testing Skill and install it into aweskill.
```

然后继续问：

```text
Check whether this agent's Skill projection is healthy.
```

如果这三个请求都能顺利完成，你的 Agent 就不只是“使用 Skills”了。它已经开始帮你管理 Skills。

---

**官网**：[aweskill.webioinfo.top](https://aweskill.webioinfo.top/)

**安装**：`npm install -g aweskill`

**Agent 引导文档**：[README.ai.md](https://github.com/mugpeng/aweskill/blob/main/README.ai.md)

**GitHub**：[github.com/mugpeng/aweskill](https://github.com/mugpeng/aweskill)
