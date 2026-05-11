- 增加git 或者其他同步的方式

- doctor status 聚合现有doctor 诊断, doctor xx 聚合现有搜索安装投影部分
```
新增一个薄的 doctor status，只做 readiness 聚合
  这个是我唯一建议新增的聚合 CLI 能力。

  它不是“智能修复”，也不是“安装流程编排”，只回答：

  当前 store + agent projection 是否 ready？

  命令形态：

  aweskill doctor status --global --agent codex
  aweskill doctor status --project . --agent codex
  aweskill doctor status --global --agent codex --json

  人类输出：

  Aweskill readiness: codex/global

  [OK] store initialized
  [OK] central skills dir exists
  [OK] built-in aweskill skill installed
  [OK] built-in aweskill-doctor skill installed
  [OK] Codex skill root exists
  [OK] managed projections: 12
  [WARN] new untracked skills: 2
  [FAIL] broken projections: 1

  Next:
    aweskill doctor sync --global --agent codex --apply

  JSON 输出：

  {
    "ready": false,
    "scope": "global",
    "agent": "codex",
    "store": { "initialized": true },
    "builtins": { "aweskill": true, "aweskill-doctor": true },
    "projection": {
      "managed": 12,
      "broken": 1,
      "new": 2,
      "suspicious": 0
    },
    "suggestedNextCommands": [
      "aweskill doctor sync --global --agent codex --apply"
    ]
  }

  具体操作：

  - 复用现有 agent list / doctor sync 的分类逻辑，不重新发明检查逻辑。
  - 复用 doctor clean 的 store hygiene 逻辑，只汇总数量。
  - 默认只读，不提供 --apply。
  - --json 作为 agent/CI 的稳定接口。
  - 文档里定位为 readiness probe，不是 repair command。
```

- 增加mcp 管理的功能

- 增加可视化，用户可以在enable 页面里，去选定某些skills；
```
 Trigger

 When aweskill enable is called without <type> and <name>, enter interactive mode. When called with args, behave exactly as
 before.

 Interactive Flow

 $ aweskill enable

 ? Select agents
   ◉ claude-code
   ◉ codex
   ◯ cursor

 ? Toggle skills
   ◉ skill-a    (enabled)
   ◯ skill-b
   ◉ skill-c    (enabled)
   ◯ skill-d
```

# Finish
- 下载与更新功能（类似skills 同步）

- skill store 两个命令是不是有重合

- backup 增加bundle 打包，以及增加路径

- 增加skills 备份

- 增加更多agent 支持

- 暂时删除 registry 操作；
enable 如果有重名独立的skills，会提示用户是否要先update 一下；

- aweskill rmdup 去重操作；

- enable 和 disable 增加一键操作；

- 进行合并skills 的操作；

- 增加更多的agent 支持，参考skill manager

- 修复glm 提出的建议

- 让重名判断逻辑再丰满些

- 增加skills，让agent 来通过aweskill 管理skills；