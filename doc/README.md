# PJ1 Phase 1 —— CLI 版 SVG 编辑器：项目文档

> 需求编号（`R-*`）与决策编号（`D-*`）见 [`../docs/plan.md`](../docs/plan.md)（需求矩阵 19 条命令 / 23 条错误契约、决策记录 D1–D22、修订记录）。
> 本文件按课程要求分四节：**架构方案**、**过程记录**、**一致性自查**、**质量保证手段**——四节均已完成。
>
> 一句话：`npm run cli` 打开 REPL，19 条命令实现规格 §3 的全部能力；197 个测试（行覆盖 94.91%）+
> 类型检查 + 依赖方向检查 + spec §6/§6.1 会话黄金回放，全部通过。

---

## 架构方案

### 0. 一句话概括

**分层 + 端口适配器 + Command 模式**：领域模型（元素树）完全不认识文件、XML 和命令行；
每一条用户命令都是一个对象；"按名字分派"只存在两处，并且被显式圈出来当作待重构点。

### 1. 模块划分

#### 1.1 组件图

![模块与依赖方向](architecture.svg)

> PlantUML 源：[`../docs/architecture.puml`](../docs/architecture.puml)；重新渲染：`npm run diagram`
> （开发机没有 Java，脚本通过 PlantUML 官方服务渲染并保存为 `doc/architecture.svg`；
> 用本地 `plantuml.jar` 也能得到同样结果）。

#### 1.2 每个模块的职责

| 目录 | 层 | 职责 | 关键类型 | 允许依赖 |
|---|---|---|---|---|
| `src/errors/` | 跨层 | 用户可见错误：规格 §4.2 的 11 条 + 补充的 12 条全部收敛为工厂方法，文案只有一处定义 | `EditorError` | 无 |
| `src/ports/` | 跨层 | 应用层依赖的**接口**（端口）：往哪打印、怎么存取文档 | `OutputSink`、`DocumentStore`、`LoadedDocument` | `model`（仅类型引用） |
| `src/model/` | 领域 | 元素树与图形：`Element`/`Shape`/5 个叶子/`Container`/`Group`/`ForeignElement`/`Document`，外加数值格式与样式属性表。**纯内存，无 IO、无 CLI** | `Element`、`Rect`…、`Document` | `model`、`errors` |
| `src/io/` | 基础设施 | SVG 序列化与解析、文件读写。**唯一**接触 XML 库（`fast-xml-parser`）与 `node:fs` 的地方 | `SvgWriter`、`SvgReader`、`XmlParser`、`FileStore`、`SvgDocumentStore` | `io`、`model`、`errors`、`ports`、`factory` |
| `src/commands/` | 应用 | 命令层：一条命令一个类（Command 模式）、命令目录（help 的数据源）、会话（当前文档 / 按 id 查找）、命令输出格式（`TreeFormatter`/`ShowFormatter`） | `Command`、`CommandCatalog`、`EditorSession`、`*Command` | `commands`、`model`、`errors`、`ports`、`factory` |
| `src/history/` | 应用 | 撤销/重做栈、撤销单元（`Edit`）、io 锁与 redo 失效规则 | `History`、`Edit`、`CommandEdit` | `history`、`errors` |
| `src/registry/` | 应用 | **第一处按名分派**：命令名 → 实现 | `CommandRegistry` | `registry`、`commands`、`model`、`errors` |
| `src/factory/` | 应用 | **第二处按名分派**：类型名/标签名 → 类（`create` 与读文件共用） | `ShapeFactory` | `factory`、`model`、`errors` |
| `src/cli/` | 接口 | 进程边界：REPL、分词、终端适配器、组合根 `Application`。不知道图形语义，只负责"读一行 → 执行 → 打印" | `Repl`、`Tokenizer`、`Application` | 全部 |

> 前端（`cli`）→ 应用（`commands`/`history`/`registry`/`factory`）→ 领域（`model`）是"向内收缩"的三层，
> `io` 是挂在旁边的适配器，`ports` 与 `errors` 是两个被各方共用的窄接口。
>
> `factory/` 单独成模块（S4 从 `registry/` 拆出）：`create` 命令与读文件都要用它，
> 而 `registry/` 依赖 `commands/`（它保存命令实例），若把工厂留在 `registry/`，
> 命令层引用工厂就会形成 `commands ↔ registry` 的环。拆成只依赖 `model`/`errors` 的独立模块后，依赖图仍然无环。

#### 1.3 为什么没有 `src/geometry/` 模块

原计划里有一个 `src/geometry/` 专门放坐标运算。S2 实现时取消了，理由是：
`move`/`scale` 的算术**天然属于每个图形自己**（`rect` 改 `x/y/w/h`，`circle` 改 `cx/cy/r`，`line` 改四个端点）。
把它抽成独立模块，要么变成一堆 `switch (类型)`、要么变成一堆只做转发的方法——
前者正是 spec §2.1 明令禁止的写法，后者只是多一层间接。
运算集中在 `Shape.shift/multiply` 里，子类只声明"我有哪些几何属性"。已记入 [`../docs/plan.md`](../docs/plan.md) 第 8 节修订记录。

### 2. 设计模式的选择

#### 2.1 Command 模式（规格强制，本项目的骨架）

- **接口**：`Command.execute(args, context): void`，一条命令一个类、一个文件（`src/commands/CreateCommand.ts`）。
- **落地方式**：`CommandRegistry` 保存"命令名 → 实例"，REPL 只做 `lookup(name)` 然后调用；
  **`Repl.ts` 里没有任何一行 `switch` 或 `if (name === 'create')`**。
- **为什么值得**（不只是为了合规）：
  1. **可逆性有了落脚点**：一条命令就是一个原子编辑单元，S5 的撤销栈只需要把命令对象压栈，
     `group g1 r1 c1 t1` 这种复合操作天然是一个单元；
  2. **扩展点固定**：新增命令 = 新增一个类 + 注册，REPL、`help`、撤销栈都不用改；
  3. **`help` 与实现共用一份数据**：`CommandCatalog`（19 条）同时驱动 `help` 输出与用法错误提示，
     不会出现"help 说有、实际没有"的漂移。
- **现状**：S3 结束时已落地 5 条（`help`/`init`/`canvas`/`read`/`save`），S4 补齐编辑类。

#### 2.2 Composite（规格强制：容器与叶子统一操作）

`Element` 声明 `translate`/`scaleBy`/`setAttribute`，`Container` 用**递归**实现，
于是 `move node2 0 100` 对 `<g>` 和对 `<rect>` 是同一句话——组里的矩形与文字自动跟随。
证据：`tests/model/Container.test.ts`（移动/缩放容器后子节点数值随之改变）。

#### 2.3 Factory（图形工厂 = 规格允许的第二处分派）

`ShapeFactory`（`src/factory/`）是"类型名 → 类"的唯一映射，它同时服务两条路：
读文件时的**标签名 → 类**（`<rect>` → `Rect`，未知标签 → `ForeignElement`），
`create` 命令时的**类型名 → 类**（`create rect …`，含每种类型的参数校验）。
新增一种图形只需要动这一个文件，`switch` 的影响面被锁死在一处。

它有自己的模块（S4 从 `registry/` 拆出）而不是塞进命令层或读取器，原因见 §1.2 末尾的说明：
它是被 `commands` 与 `io` **双向共用**的窄组件，独立成模块才能让依赖图保持无环。

#### 2.4 端口与适配器（六边形）

`ports/` 只放接口，`cli/`、`io/` 提供实现，`Application` 是组合根。

不是为了"看起来高级"：S1 时命令层需要打印结果，如果直接引用 `cli/OutputSink`，
依赖方向就会变成 `commands → cli`，而 `cli/main` 又必须 `import commands`，形成双向依赖。
把接口搬到 `ports/` 之后方向固定为 `cli → commands → ports`，`commands → cli` 这条边被**消灭**而不是被允许
（详见 [`ai-log.md`](ai-log.md)）。

#### 2.5 Memento（S5 规划）

撤销记录"改之前的值"（旧坐标、旧属性、被删除子树及其父节点与位置），而不是记录"反向命令"。
对 `group`（多个元素跨父节点移动）、`delete`（整棵子树）这类操作，存值比写反向逻辑简单得多，也更容易验证。

#### 2.6 Template Method

`Shape.setAttribute`/`detailLines` 定义了"校验白名单 → 写值"的骨架，
子类只声明 `geometryNames(): readonly string[]`。删除重复代码的同时，
让"给 rect 设 width、给 circle 设 r"这类差异只出现在数据里。

#### 2.7 刻意**没有**用的模式

| 模式 | 为什么不用 |
|---|---|
| Visitor | `tree`/`show` 的格式化已经由元素自己的 `summary()`/`detailLines()` 多态承担；只有将来要同时支持 JSON/HTML 等多种输出格式时，引入 Visitor 才划算 |
| State | "io 命令后禁止 undo"只是一个布尔状态，用状态机会把 3 行代码变成 3 个类 |
| Singleton | 全部依赖注入，没有全局实例；测试可以直接 `new Application()` 得到一个干净会话 |
| 抽象工厂 / DI 容器 | 只有 9 个模块、依赖关系是一棵浅树，手写组合根（`Application`）比引入容器更可读 |

### 3. 依赖方向规则

#### 3.1 规则表

| 模块 | 允许依赖 | 理由 |
|---|---|---|
| `errors` | — | 只是错误类型，谁都可以用，它不能反过来用别人 |
| `ports` | `model`（仅类型） | 端口签名要用到 `Document`，但不能用 `io` 的实现 |
| `model` | `model`、`errors` | 领域模型必须能被单独理解：不许 import 命令、CLI、XML、文件系统 |
| `factory` | `factory`、`model`、`errors` | 只负责"名字 → 类"，不碰 IO 也不碰命令；正因为够窄，才能被两边共用 |
| `io` | `io`、`model`、`errors`、`ports`、`factory` | 读写要把 XML 变成模型对象，所以要用图形工厂；但**反过来不允许**：`factory` 不依赖 `io` |
| `commands` | `commands`、`model`、`errors`、`ports`、`factory`、`history` | 命令用模型做修改、用端口输出与存盘、用工厂造新元素、把撤销单元交给撤销栈；**不许** import `cli`（外层）、**不许** import `io`（细节被端口挡住） |
| `history` | `history`、`errors` | 撤销单元（`Edit`）只有两个返回字符串的动作，这一层不需要认识命令或图形，因此也没有环 |
| `registry` | `registry`、`commands`、`model`、`errors` | 注册表要持有命令实例；它依赖命令，所以命令层不能反过来依赖它 |
| `cli` | 全部 | 它是组合根，只在这里把实现装配起来 |

一句话原则：**依赖只能指向更内层或更稳定的那一侧；内层不知道外层存在。**

#### 3.2 执行手段（不是靠自觉）

`tools/ArchitectureChecker.ts` 扫描 `src/**/*.ts` 的全部相对导入，
按上表判定；违反即输出违规清单并以非零码退出：

```
$ npm run arch:check
dependency rules (module -> may import)
  errors    -> (nothing)
  ports     -> model
  model     -> model, errors
  factory   -> factory, model, errors
  commands  -> commands, model, errors, ports, factory
  …
scanned 46 files under src/
no dependency violations
```

它被串进 `npm run check`（= 类型检查 + 测试 + 架构检查），和测试一样是**会失败的**。
另外脚本本身也被测过：`tests/tools/ArchitectureChecker.test.ts` 用一份**故意违规**的 fixture
（`model` 里 import 了 `cli`）断言它确实能抓到问题——否则"永远输出 ok"的检查脚本毫无价值。
**模块表里没有出现的模块会被直接报错**，这样新增模块必须显式声明依赖（并同步写进本文件）。

当前状态：**46 个源文件、0 违规**。

### 4. 变化点假设

按"最可能发生变化"的顺序排列，并说明我**为它留了什么**，或者**为什么决定不留**。

| # | 变化点 | 我留了什么 | 或者为什么决定不留 |
|---|---|---|---|
| 1 | **新增图形类型**（下一阶段的 `box` 插件、`path`/`polygon` 等） | `ShapeFactory` 是唯一的"类型 → 类"映射，加类型 = 加一个类 + 一处注册；未知标签已经能作为 `ForeignElement` 无损保留，所以"先支持读取、再支持编辑"这条路是通的 | 没有做插件加载器：本阶段规格明确不要求（R-SCOPE1），提前做会把 20 行的工厂变成一套不成熟的注册框架 |
| 2 | **命令集合扩张**（`copy`/`align`/`rotate`…） | `Command` 接口 + `CommandRegistry` + `CommandCatalog`；新命令不改 REPL、不改 `help` 逻辑、不改撤销栈 | 没有做统一的参数 schema 校验框架：参数校验留在各命令内部，错误文案才能贴着规格写（`error: scale factor must be positive` 这类文案没有通用化的必要） |
| 3 | **定位方式变化**（id → `/canvas/g1/rect[2]` 式路径选择器，规格 §2 提到过这个备选） | 寻址只有两个入口：`EditorSession.requireDocument()` 与 `Document.find(id)`；换选择器只需换这两个实现，命令层不受影响 | 没有现在就抽出 `AddressResolver` 接口：只有一个实现时，抽象会变成空壳（YAGNI）；等真的出现第二种寻址方式再抽 |
| 4 | **序列化细节变化**（缩进、属性顺序、是否保留注释、命名空间） | `SvgWriter` 单点；XML 库被 `XmlParser` 隔离（D1），换库只改一个文件；未知属性/未知元素原样保留（D8），所以"读出再写回"已经是安全的 | 没有保留 XML 注释：`fast-xml-parser` 的注释处理会显著复杂化读取器，而本阶段没有任何要求依赖注释 |
| 5 | **变换语义变化**（改用 `transform` 属性、支持旋转与斜切） | `move`/`scale` 目前是坐标改写，运算集中在 `Shape.shift/multiply`；要换成矩阵变换，只需替换这两个方法，调用方不变 | 没有预留旋转/斜切、也没有做矩阵类：规格只要求等比缩放，提前抽象矩阵会引入大量未被验证的代码 |
| 6 | **撤销策略变化**（命令反向 vs 整文档快照） | `history` 模块独立于命令，接口是"push/pop 单元"；S5 用 Memento 记旧值，将来换快照只改这一层 | 没有做整文档快照：当前文档规模小，但快照会掩盖命令层设计问题，也不利于"一条命令一个单元"的语义 |
| 7 | **承载形式变化**（从 CLI 到 TUI/GUI） | 输出通过 `ports/OutputSink` 端口，`Application` 已封装装配；核心不依赖终端 | 没有为 GUI 预留视图模型（VM/绑定）：本阶段目标就是 CLI，那层抽象现在只会是空壳 |
| 8 | **数值与精度策略**（是否需要保留原始字符串、支持单位） | `NumberFormat` 单点控制精度（6 位小数，D15）；文档的 `width`/`height`/`viewBox` 已能原样回写（D17/D22） | 没有做完整的单位系统（`px`/`em`/`%` 的换算）：没有视口信息时无法正确换算，宁可原样保留字符串 |

---

## 过程记录

> 原始素材见 [`ai-log.md`](ai-log.md)（随开发**实时**记录的日志，每条都对应一次真实的报错或失败）。
> 下面是从中提炼的 7 条，按发生顺序排列。**协作方式如实说明**：代码由 AI 结对生成，
> 本人负责需求确认、执行验收、判定问题并决定取舍；每条"发现的问题"都有真实命令输出作证据。

### 1. 工具链整体改向：`tsx` 与 `vitest` 在这台机器上都跑不起来（S0）

`npm install` 报 `EPERM syscall:'spawn'`（npm 的 postinstall 用管道启动子进程）；
改用 `--ignore-scripts` 后，`npm run cli` 又报 `spawn EPERM`——因为 `tsx` 的原理就是再 spawn 一个 node。
`vitest` 则死在 `vite` 的 `optimizeSafeRealPathSync()`：它执行 `exec("net use")`（管道）来建立网络驱动器表。

**处理**：放弃 `tsx` 与 `vitest`，改用 **Node 24 原生类型剥离**运行 `.ts` + **内置 `node:test`**。
**代价**：`engines` 提升到 node ≥ 24。**收益**：运行时依赖从 5 个降到 3 个。
**教训**：报错堆栈里出现 `spawn`/管道时，先怀疑"这个工具是不是靠子进程工作"，而不是怀疑代码。

### 2. 主动发现的反向依赖：命令层差点 import CLI（S1）

命令要打印结果。`OutputSink` 最初放在 `src/cli/`，若命令直接引用它，依赖方向就成了 `commands → cli`，
而 `cli/main` 又必须 import commands —— 双向依赖。
**处理**：新增 `src/ports/` 只放接口，实现留在 `cli/`/`io/`，方向固定为 `cli → commands → ports`。
**教训**：这条边不是编译器发现的，是"画依赖图时发现箭头指回去了"。后来它被写成规则表，交给脚本守。

### 3. 一个永远说"没问题"的检查脚本等于没有（S2）

架构守护脚本第一版跑出 `no dependency violations`——但无法证明它**会**报错。
**处理**：加一份**故意违规**的 fixture（`model` 里 import `cli`），断言脚本确实抓到它；
再把"本项目自身 0 违规"也做成一条测试。
**教训**：任何"检查型"工具都必须先被证伪一次，否则它的绿灯没有意义。

### 4. 测试红了不等于代码错：两次都是我的期望写错了（S3、S5）

- 空 `<g>` 我期望 `<g></g>`，测试失败；回查 spec §4.1，`create g` 给的片段是 **`<g id="scene"/>`（自闭合）**——代码是对的。
- `init` 之后 `undo`，我期望 `nothing to undo`，实测报 `undo not allowed after io command`；
  回查 spec §4.3，**规格明确要求后者**——又是代码对、期望错。

**处理**：两次都改测试，并把"先回规格确认再改代码"写进流程；第二次还补了用例固定 R-U3 优先于 D16。
**教训**：红了的测试先问"凭什么我认为该是这样"，别急着改实现。

### 5. 只有把 CLI 当程序跑才会暴露的问题：UTF-8 BOM（S3）

进程内测试全绿，但用 PowerShell 存出的脚本回放时，首行命令被读成 `\uFEFFinit` → `unknown command`。
**处理**：`Tokenizer` 忽略行首 BOM 并把 BOM 视为空白；用真实 CLI 复跑 `EF BB BF` 开头的脚本确认修复。

### 6. 架构判断在编码中途被推翻：图形工厂搬家（S4）

`create` 命令要用"类型名 → 类"，而读取器已有"标签名 → 类"。若命令直接 import `registry/ShapeFactory`，
就会与 `registry → commands` 形成**环**。
**处理**：把工厂拆成只依赖 `model`/`errors` 的独立模块 `src/factory/`，`io` 与 `commands` 都依赖它。
同步改了依赖规则表、文档模块表与组件图（重新渲染）。
**教训**：模块归属不是一次性决定；"谁依赖谁"要在每次新增依赖时重算一次。

### 7. 交付说明与实际使用方式脱节（收尾阶段）

`README` 里写的是 `npm run cli`（照抄 spec 的写法），但本机 PowerShell 的执行策略禁止运行 `npm.ps1`，
用户敲下去直接是 `因为在此系统上禁止运行脚本`。而我的所有端到端验证都在 `cmd /c` 里跑——**那里 `npm run cli` 是好的**，
所以测试全绿、用户却用不了。
**处理**：README 补三种绕法，新增 `cli.cmd`（双击即用），`.gitattributes` 为 `*.cmd` 固定 CRLF
（首版写成 LF，cmd.exe 直接把注释行当命令，实测才发现）。
**教训**：验证必须在**用户会用的那个 shell** 里做；"我知道"和"我写进交付说明"是两件事。

## 一致性自查

### 1. 模块划分：方案 vs 实际目录

`src/` 下的 9 个模块与本文 §1.2 的表**逐条对应**（`errors`、`ports`、`model`、`factory`、`io`、`commands`、`history`、`registry`、`cli`）。

与初版方案的差异，全部已记入 [`../docs/plan.md`](../docs/plan.md) 第 8 节修订记录：

| 差异 | 记录 | 说明 |
|---|---|---|
| 新增 `src/errors/` | S2 | 错误类原在 `cli/`，模型层要用就会反向依赖 |
| 新增 `src/ports/` | S1 | 同上，输出与存取文档的接口必须先于实现存在 |
| 新增 `src/factory/` | S4 | 工厂从 `registry/` 拆出，否则 `commands ↔ registry` 成环 |
| **取消** `src/geometry/` | S3 | 坐标运算是各图形的多态职责，独立模块只会退化成 `switch` 或纯转发（§1.3） |
| `CommandCatalog` 落在 `commands/` 而非 `registry/` | S1 | 目录描述命令本身；注册表只管分派 |

### 2. 依赖方向：规则 vs 代码

自动化检查的当前输出（`npm run arch:check`）：

```
dependency rules (module -> may import)
  errors    -> (nothing)
  ports     -> model
  model     -> model, errors
  factory   -> factory, model, errors
  io        -> io, model, errors, ports, factory
  commands  -> commands, model, errors, ports, factory, history
  history   -> history, model, errors
  registry  -> registry, commands, model, errors
  cli       -> cli, commands, registry, history, io, model, errors, ports, factory

scanned 64 files under src/
no dependency violations
```

抽样核对（规则里最关键的两条）：

| 抽查项 | 结果 | 证据 |
|---|---|---|
| `commands` 是否 import 了 `cli` 或 `io`？ | **否**。命令只用 `ports`（`OutputSink`/`DocumentStore`）、`model`、`factory`、`history` | `grep -r "from '../cli/" src/commands` 为空；`grep -r "from '../io/" src/commands` 为空 |
| `model` 是否 import 了外层？ | **否**。只 import `./…`（同模块）与 `../errors/` | 同上，`src/model` 下的 import 全部是相对同层或 errors |

历史上确实**两次**出现过这类偏差，都在提交前被拦下：
S1 的 `OutputSink`（用 `ports/` 消除）、S4 的 `TreeFormatter`/`ShowFormatter`
（最初写在 `cli/`，被规则判断为 `commands → cli` 后移入 `commands/`）。
这两次也说明：**规则不是装饰，它真的改变过代码结构**。

### 3. 其它"方案 vs 实现"的偏差

| 项 | 方案 | 实现 | 记录 |
|---|---|---|---|
| `tree` 的列对齐 | 照 spec 样例 | spec 样例本身不自洽（实测同一父节点下补 5 与 1 个空格），改为"同级最长标签 + 2" | D4 |
| 画布 `width`/`height` | 数值化 | `100%` 这类保留原字符串回写，只在 `canvas` 改尺寸后数字化 | D22 |
| undo 空栈 | 未定义 | `nothing to undo` / `nothing to redo`，且 io 锁优先 | D16 / R-U3 |

## 质量保证手段

### 1. 功能完整性怎么确认

**需求矩阵逐条对照**：[`../docs/plan.md`](../docs/plan.md) §2 列出的 19 条命令（R-D1…R-U2）与 23 条错误契约
（R-ERR1…R-ERR23）逐条都有对应实现与用例；`tests/commands/CommandSurface.test.ts` 还断言
"命令注册表 ⊆ 命令目录"且每条命令的 `usage` 与 `help` 中显示的语法**逐字符相等**——help 与行为不会漂移。

**Spec 会话黄金回放**：`examples/spec6.script` 与 `examples/spec61.script` 是规格 §6 / §6.1 的完整会话，
期望输出以 `.expected` 文件入库，测试**整块比对**（不是逐行取下标）。任何排版、文案、数值的漂移都会立刻失败。

### 2. 对质量有信心的依据

| 手段 | 现状 |
|---|---|
| 单元 + 集成测试 | **197 个用例**，全部通过（`npm test`） |
| 覆盖率 | 行 **94.91%** / 分支 **89.17%** / 函数 **89.30%**（`npm run coverage`） |
| 类型检查 | `tsc --noEmit`，`strict` + `noUncheckedIndexedAccess` + `erasableSyntaxOnly`，0 错误 |
| 架构检查 | `npm run arch:check`，64 个源文件、0 违规；脚本自身有"故意违规"的回归测试 |
| 输出合法性 | 写出的 SVG 用 `XMLValidator` 校验为**合法 XML**（浏览器渲染的前提） |
| 读写往返 | 读入→写出→再读入，结构与文本逐字符一致（含中文、`&`/`<`/`>`、未知元素、未知属性） |
| 边界矩阵 | 20 层嵌套、跨层递归缩放、空画布往返、非 SVG 文件、未知命令后继续、整棵子树删除后恢复、容器塞进自己后代、负缩放 |

### 3. 已知限制（如实说明）

1. **浏览器渲染没有自动核对**：开发沙箱禁止浏览器启动（Edge 需要 IPC 命名管道，报 `platform_check failed 拒绝访问`），
   因此用"XML 合法性 + 读写往返"替代。人工验证方式：双击 `doc/architecture.svg` 或任意 `save` 出的 SVG 用浏览器打开。
2. **`transform` 属性只保留不解释**（D3）：带 `transform` 的外部文件能无损读写，但 `move`/`scale` 不会考虑它。
3. **`box` 复合图形未实现**（R-SCOPE1）：`create box` 报 `unknown shape type`，按规格属下一阶段。
4. **`tree` 的列宽**与 spec 样例不是逐字节一致（D4，样例本身不自洽）。
5. **未做撤销栈深度上限**：规格未要求，文档规模小，未加限制。
