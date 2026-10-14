# PJ1 Phase 1 需求矩阵与决策记录

来源：课程提供的 `phase_cli_1.md`（下称 **spec**）。本文件是需求基线：
后续实现与测试都必须引用这里的编号，`doc/README.md` 的"一致性自查"一节按本表逐条打勾。

---

## 1. 通用约定（R-C）

| 编号 | 约定 | spec 出处 |
|---|---|---|
| R-C1 | 提示符 `svg> `，REPL 逐行读入；`#` **开头**的行为注释（便于把命令序列存脚本回放） | §2 |
| R-C2 | 一律以 **id** 定位图形；每个图形元素（含 `<g>`）都有唯一、**大小写敏感**的 id | §2 |
| R-C3 | `create` / `group` 的 id 为**必填**参数（用户显式命名） | §2 |
| R-C4 | 读入外部 SVG 缺 id 时按 `标签名+序号` 自动分配并打印 `warning: assigned id rect1 to unnamed <rect>` | §2 |
| R-C5 | 坐标系与 SVG 一致：原点左上、x 向右、y 向下、单位 px，浮点合法 | §2 |
| R-C6 | 带空格的参数用双引号包裹（主要是 text 内容） | §2 |
| R-C7 | 错误统一前缀 `error:`，一行一条，**命令失败不改变任何状态** | §2 |
| R-C8 | 编辑类命令回显结果摘要，显示类命令直接输出内容 | §2 |
| R-C9 | 实现范式：TypeScript + 面向对象（类层次/多态/封装/一类一文件）；禁止贫血模型、过程式自由函数、到处 `switch(tag)` | §2.1 |
| R-C10 | 按名字分派**只允许两处**：命令分发、图形工厂，且须在架构方案中标注为待重构 | §2.1 |
| R-C11 | 容器与叶子统一操作（Composite）：`move`/`scale`/`set`/`delete` 对 `<g>` 与叶子一视同仁 | §2.1 |
| R-C12 | 内核内置 6 种类型：rect / circle / ellipse / line / text / g | §3, §4.1 |

## 2. 命令矩阵（19 条）

| 编号 | 命令 | 语法 | 入 undo 栈 | 关键实现点 / 易错点 |
|---|---|---|---|---|
| R-D1 | `init` | `init [w] [h]` | ❌ | 默认 800×600；新建空画布作为当前文档 |
| R-D2 | `read` | `read <file.svg>` | ❌ | 读入为当前文档；缺 id 自动补 + 警告（R-C4） |
| R-D3 | `save` | `save [file.svg]` | ❌ | 无参数时保存到读入路径；`init` 后无路径的处理见决策 D5 |
| R-D4 | `canvas` | `canvas [w] [h]` | ❌ | 无参数=显示尺寸（纯显示，**不锁 undo**）；带参数=改尺寸（锁 undo） |
| R-E1 | `create` | `create <type> <id> [params…] [in <containerId>]` | ✅ | 6 类型参数表见 spec §4.1；`in` 必须已存在且为 `g` |
| R-E2 | `delete` | `delete <id>` | ✅ | 容器连同全部子孙；一个 undo 单元 |
| R-E3 | `move` | `move <id> <dx> <dy>` | ✅ | 增量平移；作用于容器时整体平移 |
| R-E4 | `scale` | `scale <id> <factor>` | ✅ | 等比缩放，factor 同乘到**全部几何属性**（位置与尺寸）；容器递归到每个子孙；factor ≤ 0 报错 |
| R-E5 | `set` | `set <id> <attr> <value>` | ✅ | 白名单：`fill`/`stroke`/`stroke-width` + 各类型几何属性 + text 的 `text`；白名单外报错 |
| R-E6 | `group` | `group <newGid> <id1> <id2>…` | ✅ | 从各自原父容器摘出、**保持相对顺序**；容器不能收进自己的后代 |
| R-E7 | `ungroup` | `ungroup <gid>` | ✅ | 子图形提升到原容器的父级、**占据原容器的位置**；根级容器拒绝 |
| R-E8 | `addto` | `addto <gid> <id>` | ✅ | 把已有图形移入容器，作为**最后一个**子节点 |
| R-E9 | `front` | `front <id>` | ✅ | 同级最前 |
| R-E10 | `back` | `back <id>` | ✅ | 同级最后 |
| R-V1 | `tree` | `tree [id]` | ❌ | 默认全文档；带 id 只显示该子树；**属性内联**（spec §5.1） |
| R-V2 | `show` | `show <id>` | ❌ | 属性明细 + `parent=` 行（spec §5.2） |
| R-V3 | `help` | `help` | ❌ | 显示全部命令与语法 |
| R-U1 | `undo` | `undo` | — | 撤销上一次编辑命令；一条编辑命令=一个 undo 单元（`group g1 r1 c1 t1` 整体一次） |
| R-U2 | `redo` | `redo` | — | 重做；undo 后**若有新编辑，redo 栈清空** |
| R-U3 | （io 锁） | — | — | 文档类命令（init/read/save + canvas 改尺寸）执行后 undo/redo 禁止：`error: undo not allowed after io command`，直到下一次编辑命令解禁 |
| R-U4 | （跳过显示类） | — | — | tree/show/help 不进入 undo 栈 |

## 3. 错误契约（R-ERR，spec §4.2 逐条）

| 编号 | 场景 | 期望输出 |
|---|---|---|
| R-ERR1 | id 已存在 | `error: id already exists: r1` |
| R-ERR2 | id 不存在 | `error: no such shape: r9` |
| R-ERR3 | `in` 目标不存在 | `error: no such container: node9` |
| R-ERR4 | `in` 目标不是容器 | `error: not a container: start` |
| R-ERR5 | 未注册的图形类型 | `error: unknown shape type: hexagon (is the plugin loaded?)` |
| R-ERR6 | ungroup 复合图形 | `error: cannot ungroup composite shape: n1` |
| R-ERR7 | group 目标同时含某容器与其子孙 | `error: cannot group a container into its own descendant: g1` |
| R-ERR8 | ungroup 根级容器 | `error: cannot ungroup top-level container: scene` |
| R-ERR9 | scale 非正数 | `error: scale factor must be positive` |
| R-ERR10 | 文件不存在 / 不可写 | `error: cannot read file: a.svg` / `error: cannot write file: a.svg` |
| R-ERR11 | 未 read/init 就执行其他命令 | `error: no document. use 'init' or 'read' first` |
| R-ERR12 | （补充，决策 D5）`init` 后 `save` 无参数 | `error: no file path. use 'save <file.svg>'` |
| R-ERR13 | （补充）未知属性 | `error: unknown attribute: <attr>`（spec §4.1） |
| R-ERR14 | （补充）命令语法/参数个数错误 | `error: usage: <命令语法>` |

> R-ERR6 在本阶段不会被触发（`box` 插件类型不实现，见 R-SCOPE1），但错误通道与文案要实现并测试，
> 以便插件化阶段零改动接入。

## 4. 阶段边界

| 编号 | 内容 |
|---|---|
| R-SCOPE1 | `box` 复合图形类型**本阶段不实现**：`create box` 报 `error: unknown shape type: box (is the plugin loaded?)`；其语义（ShapeProvider 插件、`data-kind` 序列化、fill/label 传播）仅作为变化点在架构方案中说明 |

## 5. 交付要求

| 编号 | 内容 |
|---|---|
| R-GIT1 | 全程 git 管理并推送到远程仓库（GitHub/Gitee） |
| R-GIT2 | 提交历史须体现开发过程（分步推进，**禁止 one-shot 大提交**） |
| R-GIT3 | 最终提交处打 tag `final`，且须在截止时间（10/25 23:59）之前完成 |
| R-DOC1 | 文档放 `doc/README.md`，Markdown |
| R-DOC2 | 架构方案：模块划分+职责（含 PlantUML 组件图/包图）、设计模式落地（必须 Command）、依赖方向规则、变化点假设 |
| R-DOC3 | 过程记录：关键、有代表性的讨论与迭代（从 AI 的建议/文档/代码中发现了什么问题、如何确认并纠正） |
| R-DOC4 | 一致性自查：实际目录 vs 方案；依赖方向规则是否被违反（抽样检查） |
| R-DOC5 | 质量保证手段：如何确认功能完整、对质量有信心的依据 |

---

## 6. 决策记录（Decision Log）

| # | 决策 | 选择 | 理由 | 影响面 |
|---|---|---|---|---|
| D1 | XML 解析 | 使用 `fast-xml-parser`，并在 `io/` 内封装为适配层 | 外部 SVG 的健壮性（自闭合、实体、CDATA、注释）优于自研；库被隔离为单点，便于替换 | `src/io/` |
| D2 | move/scale 实现方式 | **坐标改写**（递归改写几何属性），不产生 `transform` 属性 | spec §3/§4.1 明确"factor 同乘到图形的全部几何属性""递归到每个子孙"；坐标改写对 move 与 scale 语义统一 | `src/geometry/`、`src/commands/` |
| D3 | 外部 SVG 中已存在的 `transform` | 本阶段不解释其语义，但**原样保留**并回写（round-trip 安全），列为变化点 | 本阶段实现不生成 transform，若解析语义会引入未定义行为；保留属性可保证读写不损坏文件 | `src/io/` |
| D4 | `tree` 列对齐规则 | 自定义确定性规则：同级标签列宽 = 同级最长标签长度 + 2；黄金测试以**语义断言**为主，不做字节级对齐比对 | 实测 spec 样例本身并未严格对齐（§5.1 顶层列宽 15、嵌套 11；§6.1 同一父节点下 `rect#process` 补 5 空格而 `text#process-label` 补 1 空格，列宽 17/19 并存），无法作为对齐基准 | `src/cli/format` |
| D5 | `init` 后直接 `save`（无参数、无来源路径） | 报 `error: no file path. use 'save <file.svg>'`（补充为 R-ERR12） | spec 未定义该情形，必须明确且可测试 | `src/commands/` |
| D6 | TS / 运行方式 | 固定 TypeScript **5.9.3**（不用最新 7.x）；**直接由 Node 24 原生类型剥离运行 `.ts`**（`npm run cli` = `node src/cli/main.ts`），`tsc` 负责类型检查与 `dist/` 构建；ESM + NodeNext，相对导入写 **`.ts` 后缀**（构建时由 `rewriteRelativeImportExtensions` 改写为 `.js`）；开启 `erasableSyntaxOnly` 保证语法可剥离 | 7.x 与测试生态兼容性未知；`tsx` 在本机沙箱下会 `spawn EPERM`（见 ai-log），原生剥离零依赖、零子进程，且 `tsc` 仍能全量类型检查 | 全局 |
| D11 | 测试框架 | 使用 **Node 内置 `node:test`**（`node --test --test-isolation=none "tests/**/*.test.ts"`），断言用 `node:assert/strict`；覆盖率用 `--experimental-test-coverage` | `vitest → vite → rolldown` 在 Windows 上会调用 `exec("net use")`（管道 stdio），在本机沙箱触发 `EPERM`（已定位到 vite 源码 `optimizeSafeRealPathSync`）；`node:test` 零依赖、零子进程，且能直接运行 `.ts` | `tests/`、`package.json` |
| D7 | 编码 | 全链路显式 UTF-8（文件读写 + 标准输出），并单列中文/引号往返测试 | 会话样例含中文 text 内容（`"开始"`、`"处理数据"`） | `src/io/`、`src/cli/` |
| D8 | `read` 遇到非 6 类元素（`<path>`、`<polygon>`、`<defs>` 等） | 作为 **ForeignElement 原样保留**（属性与子树都不丢，能整树回写），不需要 id、不参与 id 补全与地址解析；`tree` 中以 `(foreign)` 标注 | 未定义行为取"最小惊讶"：读入外部 SVG 不得丢内容；本阶段不为它们实现编辑语义 | `src/io/`、`src/model/` |
| D9 | `set` 作用于容器 `<g>` | 允许 `fill`/`stroke`/`stroke-width`（SVG 继承语义，作用于子孙）；几何属性报 R-ERR13 | 白名单对 `g` 无几何属性定义；颜色类属性在 SVG 中可继承，语义自洽 | `src/commands/` |
| D10 | 文本内容中的引号 | 本阶段不支持转义，`"` 需成对出现；未闭合引号报 R-ERR14 | spec 未定义转义规则，明确边界优于猜测 | `src/cli/parser` |

## 7. 里程碑（细则见会话中确认的步骤表）

| 阶段 | 内容 | 关键提交 |
|---|---|---|
| S0 | 立项与准备（工程骨架、需求矩阵、决策记录、文档骨架） | `chore: bootstrap …` |
| S1 | CLI 外壳（tokenizer、流注入、注册表、help、格式化、脚本回放） | `feat(cli): …` |
| S2 | 领域模型（Element/叶子/容器/文档/id 注册表 + 依赖守护） | `feat(model): …` |
| S3 | SVG 读写（writer/reader/round-trip/文档类命令） | `feat(io): …` |
| S4 | 编辑命令（create/move/scale/set/结构类/tree/show） | `feat(commands): …` |
| S5 | 撤销重做（栈、复合单元、io 锁、redo 失效） | `feat(history): …` |
| S6 | 质量保证（单测、黄金回放、渲染核对、边界矩阵、覆盖率） | `test: …` |
| S7 | 文档（架构/过程记录/自查/质量保证 + PlantUML 图 + 示例） | `docs: …` |
| S8 | 收尾（历史梳理、tag `final`、干净 clone 验收） | `chore(release): …` |
