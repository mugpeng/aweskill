# aweskill

面向 AI 编码代理的本地 Skill 编排命令行工具。

[English README](./README.md)

## 项目定位

`aweskill` 在 **`~/.aweskill/skills/`** 维护统一的技能内容，在 **`~/.aweskill/bundles/*.yaml`** 中可选地定义 **bundle**，再按各 agent 的规则把技能 **投影**到对应 `skills` 目录：**多为 symlink，Cursor 等为 copy**。

**没有全局 activation 配置文件**：是否启用 =目标路径上是否存在 **由 aweskill 创建的** symlink 或带标记的 copy；`disable` 只删除这类托管投影。

CLI 使用 `commander`、`@clack/prompts`、`picocolors`。

目录约定：

- 中央仓库：`~/.aweskill/skills/`
- 重复项暂存目录：`~/.aweskill/dup_skills/`
- 备份目录：`~/.aweskill/backup/`
- Bundle：`~/.aweskill/bundles/*.yaml`
- 支持的 agent：`amp`、`claude-code`、`cline`、`codex`、`cursor`、`gemini-cli`、`goose`、`opencode`、`roo`、`windsurf`

`init` 只创建 `skills/`、`dup_skills/`、`bundles/` 等布局，**不会**生成或依赖 `~/.aweskill/config.yaml`。

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
npm install -g ./aweskill-0.1.2.tgz
```

（若 `package.json` 里版本号不同，请以实际打出来的 `.tgz` 文件名为准。）

## 快速开始

```bash
# 1. 初始化 aweskill 家目录
aweskill init

# 2. 扫描已有 agent 的 skill 目录
aweskill scan

# 3. 一次性导入整个 skills 根目录
aweskill import ~/.agents/skills

# 4. 导入一个本地 skill 到中央仓库
aweskill import /path/to/my-skill --mode cp

# 5. 创建 bundle
aweskill bundle create frontend
aweskill bundle add-skill frontend my-skill

# 6. 为 Claude Code 全局启用这个 bundle
aweskill enable bundle frontend --global --agent claude-code

# 7. 检查当前全局 agent 技能目录
aweskill check
```

## 命令概览

| 命令 | 说明 |
| --- | --- |
| `aweskill init [--scan] [--verbose]` | 初始化 `~/.aweskill`（`skills/`、`dup_skills/`、`backup/`、`bundles/` 等），并可选输出扫描摘要 |
| `aweskill scan [--add] [--mode cp/mv] [--override] [--verbose]` | 扫描已支持 agent 的 skill 目录，并可选导入中央仓库 |
| `aweskill backup` | 将 `skills/` 打包为带时间戳的备份文件，放到 `~/.aweskill/backup/` |
| `aweskill restore <archive> [--override]` | 从备份归档恢复 `skills/`，恢复前会自动再备份当前状态 |
| `aweskill import <path> [--mode cp/mv] [--override]` | 导入单个 skill 或整个 skills 根目录 |
| `aweskill import --scan [--mode cp/mv] [--override]` | 批量导入扫描结果 |
| `aweskill remove <skill> [--force]` | 从中央仓库删除 skill（默认检查 bundle 与托管投影，可用 `--force`） |
| `aweskill bundle create <name>` | 创建 bundle |
| `aweskill bundle show <name>` | 查看 bundle 内容 |
| `aweskill bundle add-template <name>` | 将内置模板 bundle 复制到 `~/.aweskill/bundles/` |
| `aweskill bundle add-skill <bundle> <skill>` | 向 bundle 增加已存在于中央仓库的 skill |
| `aweskill bundle remove-skill <bundle> <skill>` | 从 bundle 移除 skill |
| `aweskill bundle delete <name>` | 删除 bundle |
| `aweskill list skills [--verbose]` | 列出中央仓库中的 skills 及总数；默认简短预览 |
| `aweskill list bundles [--verbose]` | 列出中央仓库 bundle 及总数；默认简短预览 |
| `aweskill list bundles-template [--verbose]` | 列出 `template/bundles/` 下自带的 bundle 模板 |
| `aweskill check [--global] [--project [dir]] [--agent <agent>] [--update] [--verbose]` | 检查 agent 技能目录（`linked` / `duplicate` / `new`），`--update` 可按需归一化 |
| `aweskill rmdup [--remove] [--delete]` | 检查中央仓库中带数字/版本后缀的重复 skills；可选移动到 `dup_skills/` 或直接删除 |
| `aweskill recover [--global] [--project [dir]] [--agent <agent>]` | 将 aweskill 托管的 symlink 投影恢复成完整目录 |
| `aweskill enable bundle/skill …` | 在 agent 目录下创建 symlink 或 copy；默认全局 + 所有已检测到的 agent；支持 `all` |
| `aweskill disable bundle/skill … [--force]` | 删除 **托管** 投影；支持 `all`；单独 `disable skill` 见下文 |
| `aweskill sync [--project <dir>]` | 中央仓库里 skill 已不存在时，清理仍指向它的托管投影 |

## 命令示例

### `init`

```bash
# 创建 ~/.aweskill 基础布局
aweskill init

# 创建布局后立即输出扫描摘要
aweskill init --scan
```

### `scan`

```bash
# 扫描当前项目和全局 agent 目录
aweskill scan

# 展示所有扫描到的 skill，而不只是每个 agent 的数量
aweskill scan --verbose

# 扫描并一步导入中央仓库
aweskill scan --add
```

### `import`

```bash
# 复制导入一个 skill
aweskill import ~/Downloads/pr-review --mode cp

# 一次性导入整个 skills 根目录
aweskill import ~/.agents/skills

# 覆盖已有 skill，而不是只补缺失项
aweskill import ~/.agents/skills --override
```

### `bundle`

```bash
# 创建并查看 bundle
aweskill bundle create backend
aweskill bundle show backend

# 向 bundle 增加多个已存在 skill
aweskill bundle add-skill backend api-design,db-schema

# 从内置模板生成 bundle
aweskill bundle add-template K-Dense-AI-scientific-skills
```

### `list`

```bash
# 查看中央仓库 skills 和 bundles
aweskill list skills
aweskill list bundles

# 展示完整列表
aweskill list skills --verbose
aweskill list bundles --verbose

# 查看内置 bundle 模板
aweskill list bundles-template
```

### `enable`

```bash
# 全局启用一个 skill
aweskill enable skill biopython

# 一次性启用多个 skill
aweskill enable skill biopython,scanpy --global --agent codex

# 全局启用一个 bundle
aweskill enable bundle backend --global --agent all
```

### `disable`

```bash
# 在项目范围禁用一个 skill
aweskill disable skill pr-review --project /path/to/repo --agent cursor

# 即使同 bundle 还有其他成员启用，也强制删除这一项
aweskill disable skill my-skill --global --agent codex --force

# 删除某个 scope/agent 下全部托管投影
aweskill disable skill all --global --agent codex
```

### `check`

```bash
# 检查一个全局 agent 目录
aweskill check --agent codex

# 展示完整分类条目
aweskill check --agent codex --verbose

# 检查并归一化项目范围目录
aweskill check --project /path/to/repo --agent cursor --update
```

### `backup` 和 `restore`

```bash
# 创建 skills 备份
aweskill backup

# 从归档恢复，并自动先备份当前状态
aweskill restore ~/.aweskill/backup/skills-2026-04-12T19-20-00Z.tar.gz --override
```

### `rmdup`、`recover`、`sync`

```bash
# 检查或移除中央仓库重复 skill
aweskill rmdup
aweskill rmdup --remove

# 将托管 symlink 恢复成完整目录
aweskill recover

# 清理失效投影
aweskill sync
aweskill sync --project /path/to/repo
```

## `disable skill` 与 bundle

- **`disable bundle <name>`**：把 bundle 展开成多个 skill，对当前命令中的 scope/agent 逐个删除托管投影。
- **`disable skill <name>`**：只删这一项。若该 skill 出现在某个 bundle 里，且在**同一 scope、同一批 agent** 下 **同一 bundle 里还有其他 skill 仍处于托管投影状态**，命令会 **报错** 并提示使用 **`--force`**，或改用 `disable bundle …` 整包卸载。
- `enable skill all`：启用 `~/.aweskill/skills/` 下全部 skill；`enable bundle all`：启用所有 bundle 展开后的 skill 并集。
- `aweskill enable <type> <name>` 的 `<name>` 现在明确支持 `all`，帮助信息和缺失参数提示都已同步。
- `disable skill all`：删除所选 scope/agent 下全部托管 skill 投影；`disable bundle all`：删除所有 bundle 展开后的 skill 并集。
- 这类批量命令也支持逗号分隔，并按“并集”处理，例如 `enable skill biopython,scanpy`、`bundle add-template foo,bar`。

`enable bundle` 只是一次性展开写入磁盘，**没有**单独的「bundle 激活记录」可编辑。

## Bundle 文件格式

`~/.aweskill/bundles/<name>.yaml` 示例：

```yaml
name: frontend
skills:
  - pr-review
  - frontend-design
```

## 投影模型

1. **技能内容**以 `~/.aweskill/skills/<skill-name>/` 为准。
2. **`enable`** 在指定 scope（全局家目录或项目根）与 agent 下创建 symlink 或 copy。
3. **`disable`** 只删除 **aweskill 托管** 项（指向中央仓库的 symlink，或带标记的 copy 目录）。
4. **`sync`** 会检查：全局家目录、传入的 `--project`、以及 **当前工作目录若存在 `.aweskill.yaml` 则把 cwd 当作项目根一并检查**（该文件仅作「此目录参与 sync」的标记，**不会**从中读取 activation 列表）。若中央仓库中对应 skill 目录已不存在，则删除相关托管投影。

**不再**根据某个全局 YAML 里的 activation 列表做 reconcile。

补充说明：

- 默认 `scan --add` 和批量 `import` 只补缺失文件；`--override` 才覆盖。
- 如果导入源是 symlink，aweskill 会从其真实路径复制，并在需要时给出 warning。
- 批量导入遇到坏掉的 symlink 会继续处理其他项，并在最后汇总缺失数量。
- `restore` 在恢复前会自动备份当前 `skills/`；默认拒绝覆盖同名 skill，需显式传 `--override`。
- `list skills` / `list bundles` 默认只显示预览；`--verbose` 展示全部条目。
- `scan` 默认显示每个 agent 的统计；`--verbose` 才列出具体扫描到的 skill。
- `check` 会把条目分成 `linked`、`duplicate`、`new` 三类；`--update` 会按既有规则导入和重建投影。
- `rmdup` 会把 `name`、`name-2`、`name-1.2.3` 视为同一族；只有传 `--remove` 才会真正改文件。

投影示例：

```bash
# 全局范围为一个 agent 建立投影
aweskill enable skill biopython --global --agent codex

# 项目范围为一个 agent 建立投影
aweskill enable skill pr-review --project /path/to/repo --agent cursor

# bundle 启用/禁用本质上都是展开成多个 skill 投影
aweskill enable bundle backend --global --agent codex
aweskill disable bundle backend --global --agent codex

# 把 symlink 投影恢复成完整目录
aweskill recover --global --agent codex
```

## 模板

参考 bundle 模板放在 [template/bundles/K-Dense-AI-scientific-skills.yaml](/Users/peng/Desktop/Project/aweskills/template/bundles/K-Dense-AI-scientific-skills.yaml)。运行时实际使用的 bundle 仍然在 `~/.aweskill/bundles/`。

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

## 开发

```bash
npm install
npm test
npm run build
node dist/index.js --help
```

## 许可证

Mozilla Public License Version 2.0
