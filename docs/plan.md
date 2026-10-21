# PJ1 Phase 1 需求矩阵与决策记录

来源：课程提供的 `phase_cli_1.md`（下称 **spec**）。本文件是需求基线：
后续实现与测试都必须引用这里的编号，`doc/README.md` 的"一致性自查"一节按本表逐条打勾。

---

## 1. 通用约定（R-C）

| 编号 | 约定 | spec 出处 |
|---|---|---|
| R-C1 | 提示符 `svg> `，REPL 逐行读入；**行首**（可含前导空白）为 `#` 的行是注释（便于把命令序列存脚本回放）；**行内的 `#` 是普通字符**，如 `create rect bg 0 0 800 600 #ffffff` | §2 |
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
| R-ERR15 | （补充，D10）未闭合的双引号 | `error: unterminated quote in command line` |
| R-ERR16 | （补充）未知命令 | `error: unknown command: foo. type 'help' for commands` |
| R-ERR17 | （补充，D15）几何属性给了非数字 | `error: invalid number: <value>` |
| R-ERR18 | （补充，D12）`addto` 把容器移进自己的后代 | `error: cannot move a container into its own descendant: <id>` |
| R-ERR19 | （补充，D16）`undo` 时没有可撤销的操作 | `error: nothing to undo` |
| R-ERR20 | （补充，D16）`redo` 时没有可重做的操作 | `error: nothing to redo` |
| R-ERR21 | （补充，D12）对 foreign 元素直接做几何操作 | `error: unsupported element: <id>` |
| R-ERR22 | （补充，D18）`init`/`canvas` 给出的画布尺寸非正 | `error: canvas size must be positive` |
| R-ERR23 | （补充，D19）文件存在但不是可用的 SVG | `error: invalid svg file: <path>` |

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
| D8 | `read` 遇到非 6 类元素（`<path>`、`<polygon>`、`<defs>` 等） | 作为 **ForeignElement 原样保留**（tag/属性/子树都不丢，能整树回写）；**同样参与自动补 id**（缺 id 时按 `标签名+序号` 分配并警告），因此可被 `tree`/`delete`/`group`/`front` 寻址；`tree` 中标注 `(foreign)`；几何语义见 D12 | 未定义行为取"最小惊讶"：读入外部 SVG 不得丢内容；id 规则统一适用于所有元素，省掉"哪些元素算图形"这种无法穷举的分类（S2 修订，见第 8 节） | `src/io/`、`src/model/` |
| D9 | `set` 作用于容器 `<g>` | 允许 `fill`/`stroke`/`stroke-width`（SVG 继承语义，作用于子孙）；几何属性报 R-ERR13 | 白名单对 `g` 无几何属性定义；颜色类属性在 SVG 中可继承，语义自洽 | `src/commands/` |
| D10 | 文本内容中的引号 | 本阶段不支持转义，`"` 需成对出现；未闭合引号报 `error: unterminated quote in command line`（R-ERR15，S1 实现时从"报 usage"细化为专用文案，见修订记录） | spec 未定义转义规则，明确边界优于猜测 | `src/cli/Tokenizer.ts` |
| D12 | foreign 元素上的几何命令 | 直接对它执行 `move`/`scale`/`set` → `error: unsupported element: <id>`（R-ERR21）；祖先容器的 `move`/`scale` **跳过** foreign 子树（不报错） | 编辑器不解释未知元素的几何，但不能因为文件里有一个 `<path>` 就让整组移动失败 | `src/model/ForeignElement.ts`、`src/commands/` |
| D13 | `tree` / `show` 的字段规则 | `tree` 严格按 spec 样例：rect 用 `x/y/w/h`+fill、circle/ellipse 用 `cx/cy/rx/ry`+fill、line 用 `(x1,y1) -> (x2,y2)`、text 用 `(x,y) "内容"`、容器不显示属性；`show` 用**完整属性名**并逐行列出 | spec 只给了样例，必须固化成规则才能写黄金测试与一致性自查 | `src/model/*.ts` |
| D14 | id 唯一性 | 由**树遍历**回答（`Document.find` / `hasId` / `nextFreeId`），不维护第二份可变注册表 | 树与注册表一旦不同步，就会出现"id 存在但元素找不到"的幽灵 bug；本阶段文档规模小，遍历代价可忽略 | `src/model/Document.ts` |
| D15 | 数值格式 | 几何属性统一按 **6 位小数**归一后写出（`NumberFormat`），非法数字报 R-ERR17 | 避免 `1.1` 缩放后写出 `110.00000000000001`，也让 undo/redo 的数值比较稳定 | `src/model/NumberFormat.ts` |
| D16 | 空栈时的 undo/redo | `error: nothing to undo` / `error: nothing to redo`（R-ERR19/20） | spec 未定义；必须有明确反馈，而不是静默无操作让用户以为命令失效 | `src/history/` |
| D17 | viewBox 保留 | 读入文件若带 `viewBox` 则**原样保留**；`canvas <w> <h>` 改尺寸时重新生成为 `0 0 w h` | round-trip 安全优先；尺寸改了还沿用旧 viewBox 会让坐标系与画布不一致 | `src/model/Document.ts`、`src/io/` |
| D18 | 画布尺寸校验 | `init` / `canvas` 的宽高必须 > 0，否则 R-ERR22 | spec 未定义；0 或负的画布没有意义，与 scale 的正数要求保持一致的风格 | `src/commands/InitCommand.ts`、`CanvasCommand.ts` |
| D19 | 文件不是 SVG | 根元素不是 `<svg>`、或 XML 无法解析 → R-ERR23 `invalid svg file: <path>`（与 R-ERR10 的"读不到文件"区分开） | 两类失败原因不同，用户需要知道是文件不存在还是文件内容不对 | `src/io/XmlParser.ts`、`SvgReader.ts` |
| D20 | 已知叶子带子元素 | 如 `<text>a<tspan>b</tspan></text>` 无法用本阶段的模型表达 → **降级为 ForeignElement** 原样保留（不报错、不丢内容） | 与本阶段"读入不丢内容"的原则一致；强行只取 `#text` 会静默丢失 tspan | `src/registry/ShapeFactory.ts` |
| D21 | 文件内 id 重复 | 后出现的元素改名（`nextFreeId`）并告警：`warning: id r1 already exists, assigned rect1 to <rect>` | 模型必须始终保证 id 唯一（R-C2）；直接报错会让一个可修复的文件完全打不开 | `src/io/SvgReader.ts` |
| D22 | 文件的 `width`/`height` | 数值解析规则：纯数字或 `px` 后缀取数值，其余（`100%`、`10em`…）取默认值 800×600；**但原字符串始终原样回写**，只有 `canvas` 改尺寸后才换成数字 | `width="100%"` 是合法 SVG，写成 `width="100"` 会静默改变文件语义（与 D17 同一考虑） | `src/model/Document.ts`、`src/io/` |

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

---

## 8. 修订记录（方案 vs 实现的差异）

> 课程要求"实现完成后对照方案如实回答：实际目录与方案是否一致？不一致之处是否已记入修订记录？"——本节即该修订记录，边做边记。

| 日期 | 阶段 | 修订 | 原因 |
|---|---|---|---|
| 2026-10-14 | S0 | `engines` 定为 `node >= 24`；测试框架由 vitest 改为 Node 内置 `node:test`（决策 D11） | vitest→vite→rolldown 在本机沙箱会 `exec("net use")` 触发 EPERM（详见 ai-log） |
| 2026-10-14 | S0 | D6 由"tsx 运行"改为"Node 原生类型剥离运行 `.ts`" | tsx 需要 spawn 子进程，本机沙箱 EPERM |
| 2026-10-14 | S1 | **新增模块 `src/ports/`**：`OutputSink` 由 `src/cli/` 迁入 | 命令层需要输出能力，若直接依赖 `cli/` 会形成 `commands → cli` 的反向依赖 |
| 2026-10-14 | S1 | `CommandCatalog`（命令目录）放在 `src/commands/` 而非 `src/registry/` | 目录描述的是命令本身；注册表只负责"名字→实现"的分派，避免 commands 与 registry 互相依赖 |
| 2026-10-14 | S1 | 新增 R-ERR15 / R-ERR16 两条错误契约；D10 的文案细化 | 规格未定义未闭合引号与未知命令的行为，实现时必须钉死 |
| 2026-10-14 | S2 | `CliError` 更名为 `EditorError` 并移入 `src/errors/` | 模型层/命令层也要抛规格里的错误，错误类留在 `cli/` 会造成反向依赖 |
| 2026-10-14 | S2 | D8 修订：foreign 元素**也参与自动补 id**、可寻址 | 避免"哪些元素算图形"的分类难题；id 规则对全部元素统一 |
| 2026-10-14 | S2 | 新增决策 D12–D17、错误契约 R-ERR17–R-ERR21 | 规格未定义的行为（foreign 的几何命令、空 undo 栈、数值精度、viewBox）在 S2 实现时被碰到，必须当下钉死 |
| 2026-10-14 | S2 | 新增模块 `src/errors/`；依赖规则表加入 `errors`（不依赖任何模块） | 见上一条；守护脚本要求新模块显式登记规则 |
| 2026-10-14 | S3 | 新增端口 `ports/DocumentStore`（+`LoadedDocument`），实现放 `io/SvgDocumentStore` | 命令层若直接依赖 `io/`，就把 XML 库与文件系统拖进了应用层；端口让两侧可独立替换与测试 |
| 2026-10-14 | S3 | 依赖规则更新：`ports → model`（`DocumentStore` 的参数类型是 Document）、`io → registry`（读取器要用图形工厂） | 规则表随真实需要演进，但不允许出现环：`io` 依赖 `registry`，而 `registry` 不依赖 `io` |
| 2026-10-14 | S3 | `Repl` 改为注入 `services` 集合（`Omit<CommandContext,'out'>`） | 避免每加一个服务就改一次 Repl 的构造参数 |
| 2026-10-14 | S3 | 新增决策 D18–D22 与错误契约 R-ERR22/23 | 规格未定义但实现中一定会碰到的情形（画布尺寸、非 SVG 文件、text 带子元素、重复 id、百分比尺寸） |
| 2026-10-14 | S3 | `Tokenizer` 忽略行首 UTF-8 BOM | 真实 CLI 端到端回放时发现：Windows 编辑器存出的脚本首行命令会被读成 `\uFEFFinit` |
| 2026-10-14 | S3 | **取消 `src/geometry/` 模块**；依赖规则表与根 README 的目录清单同步移除 | 坐标运算是每个图形自己的多态职责（`Shape.shift/multiply`），独立模块只会变成 `switch(类型)`（spec §2.1 明令禁止）或纯转发。详见 `doc/README.md` §1.3 |
| 2026-10-14 | S3 | 新增 `tools/PlantumlEncoder.ts` + `tools/render-diagram.ts`（`npm run diagram`）；架构图源文件为 `docs/architecture.puml`，渲染产物 `doc/architecture.svg` | 本机无 Java，无法本地跑 plantuml.jar；用官方服务渲染并把 SVG 入库，源文件仍可被本地工具复现 |
| 2026-10-14 | S3 | `doc/README.md` 的**架构方案**一节完成（模块职责表、组件图、设计模式、依赖规则、8 条变化点） | 规格要求该节在交付物中；架构已稳定（S4/S5 只增加命令与撤销栈，不改分层），提前写完可以减少收尾压力 |
| 2026-10-14 | S4 | **`ShapeFactory` 从 `src/registry/` 移到新模块 `src/factory/`**；依赖规则表、组件图与文档 §1.2/§2.3/§3.1 同步更新 | `create` 命令也要用工厂，而 `registry` 依赖 `commands`（存放命令实例），若工厂留在 `registry` 会形成 `commands ↔ registry` 的环；独立成只依赖 `model`/`errors` 的模块后依赖图仍无环 |
| 2026-10-14 | S4 | `Element` 增加 `isContainer` 多态谓词 | 命令需要判断"目标能不能装子元素"（R-ERR4 `not a container`），用 `instanceof` 会在命令层引入类型判断 |
| 2026-10-14 | S4 | `Element` 增加 `anchor()`（默认 null，`Shape` 返回 `x/y`，`circle`/`ellipse` 返回 `cx/cy`，`line` 返回 `x1/y1`） | `move` 的回显要分两种：叶子报新锚点、容器报位移（spec §6 vs §6.1）；用多态取值避免命令里判断类型 |
| 2026-10-14 | S4 | `tree`/`show` 的格式化类放在 `src/commands/`（而非 `cli/`） | 输出格式属于命令，`cli/` 只负责"写出去"；放到 `cli/` 会让 `commands → cli` 反向依赖 |
| 2026-10-14 | S4 | `EditorSession` 增加 `requireElement` / `requireContainer` | R-ERR2/R-ERR4 的查找与判定收敛到一处，19 条命令不再各写一遍 |
| 2026-10-14 | S5 | 新增模块 `src/history/`（`Edit`/`CommandEdit`/`History`）；`commands → history` 依赖成立，`history` 只依赖 `errors` | 撤销单元必须由命令自己构造（只有它知道"撤销"是什么），但 `History` 不需要认识任何图形或命令，所以依赖不成环 |
| 2026-10-14 | S5 | 几何类编辑的撤销改为**属性快照回填**，而不是"反向运算" | `scale` 按 `1/f` 反算会因 6 位小数归一产生漂移；`restoreAttributes` 回填原始字符串才能保证 `undo` 后与原来逐字符一致 |
| 2026-10-14 | S5 | `init`/`read` 清空历史，`save`/`canvas` 只加锁不清空 | `init`/`read` 换掉了文档对象，旧撤销单元会指向已消失的元素；`save`/`canvas` 改的仍是同一份文档，规格也只要求"禁止撤销直到下一次编辑" |

---

## 9. 命令回显文案表

> spec 只对部分命令给了回显样例（§6 会话），其余必须由实现定义。
> 本表是**唯一**依据：S6 的黄金回放测试与 S7 的一致性自查都对照它。

| 命令 | 成功回显 | 出处 |
|---|---|---|
| `init` | `canvas 800x600 created` | spec §6 |
| `read` | `read other.svg (7 elements)`（告警行在前） | spec §6 |
| `save` | `saved to demo.svg (5 elements)` | spec §6 |
| `canvas`（查询） | `canvas 800x600` | 本实现（spec 未给样例） |
| `canvas`（改尺寸） | `canvas resized to 800x600` | 本实现 |
| `create`（无 `in`） | `rect#bg created` | spec §6 |
| `create`（有 `in`） | `rect#start created in g#node1` | spec §4.1 |
| `delete` | `rect#box deleted` | spec §6 |
| `move`（叶子） | `circle#c1 moved to (130,100)` | spec §6 |
| `move`（容器） | `g#node2 moved by (0,100)` | spec §6.1 |
| `scale` | `circle#c1 scaled by 2` | 本实现 |
| `set`（普通属性） | `rect#bg updated: fill=red` | 本实现（按 §6 的 text 形式类推） |
| `set`（text 内容） | `text#title updated: text="My Diagram v2"` | spec §6 |
| `group` | `g#markers created with 2 children` | spec §6 |
| `ungroup` | `g#inner ungrouped (2 children promoted)` | 本实现 |
| `addto` | `rect#b added to g#g1` | 本实现 |
| `front` / `back` | `rect#a moved to front` / `rect#a moved to back` | 本实现 |
| `tree` / `show` / `help` | 直接输出内容（格式见 spec §5） | spec §5 |
| `undo`（move 叶子） | `circle#c1 moved back to (100,100)` | spec §6 |
| `undo`（move 容器） | `g#node2 moved back by (0,-100)` | spec §6.1 类推 |
| `undo`（set） | `text#title updated: text="My Diagram"` | spec §6 |
| `undo`（delete） | `rect#box restored into g#markers` | spec §6 |
| `undo`（create） | `rect#bg removed` | 本实现 |
| `undo`（scale） | `circle#c1 scaled back by 2` | 本实现 |
| `undo`（group） | `g#markers dissolved (2 children restored)` | 本实现 |
| `undo`（ungroup） | `g#inner regrouped (2 children)` | 本实现 |
| `undo`（addto） | `rect#b moved back to svg` | 本实现 |
| `undo`（front / back） | `rect#a moved back` | 本实现 |
| `redo` | 与该命令第一次执行时的回显完全相同 | spec §6（`redo` 复现 `moved to`） |

> 单复数：成员数为 1 时输出 `1 child`（`child/children`），不写 `1 children`。
> 一致性保障：`tests/commands/CommandSurface.test.ts` 断言"命令注册表 ⊆ 命令目录"且
> 每条命令的 `usage` 常量与 `help` 里显示的语法**逐字符相等**——help 与行为不会漂移。
