# 协作过程工作日志（原始素材）

本文件随开发**实时**记录与 AI 协作过程中的关键讨论、发现与纠正，作为 `doc/README.md`
"过程记录"一节的原始素材。原则：**如实记录**，只写真实发生的事（真实的环境报错、真实的测试失败、
真实的代码审查结论），不事后编写叙事。

记录格式：`日期 · 阶段 · 类型` + 做了什么 / 发现什么 / 如何处置 / 证据。

---

## 2026-10-14 · S0 · 环境核查

- **做了什么**：开工前核查本机工具链与沙箱限制，避免中途踩坑。
- **发现（全部为实测）**：
  1. `git` 已安装（2.56.0）但**不在 PATH**，需用 `C:\Program Files\Git\cmd\git.exe` 调用；全局身份已配置为
     `christina <24300180076@m.fudan.edu.cn>`，提交可直接归属到本人。
  2. PowerShell 中 `npm` 被执行策略拦截（`npm.ps1` 不允许运行），必须走 `npm.cmd`。
  3. npm 默认缓存目录在工作区之外，写入被沙箱拒绝（`EPERM ... npm-cache\_cacache`）；改用
     `--cache C:\工作区\.npm-cache` 后 `npm view` 正常返回（typescript 5.9.3）。
  4. 本机**未安装 Java**，PlantUML 渲染需另想办法（S7 处理）；已安装 Edge，可用于 SVG 渲染核对。
  5. 沙箱允许 Node 子进程的**文件重定向**，但禁止**管道 stdio**（EPERM）→ 端到端测试方案确定为
     "CLI 内核流注入 + 脚本文件重定向回放"，而不是 `spawn` 管道。
- **处置**：把上述 5 条分别写入工程约定（npm 命令固定 `npm.cmd` + 工作区缓存；测试方案定型）。
- **影响**：`docs/plan.md` 决策 D6/D7；测试策略见质量保证手段一节。

## 2026-10-14 · S0 · 规格核对（发现 spec 样例自身不一致）

- **做了什么**：为确定 `tree` 输出的列对齐规则，对 spec §5.1 与 §6.1 的样例逐字符测量（把空格替换为可见字符后比对）。
- **发现**：样例并未严格对齐——§5.1 顶层标签列宽为 15、嵌套层为 11；§6.1 同一父节点下
  `rect#process` 后补 5 个空格、而 `text#process-label` 后补 1 个空格（列宽 17 与 19 并存）。
  也就是说 **spec 的样例输出是手工书写的，不能作为字节级对齐基准**。
- **处置**：决策 D4 —— 自定义确定性对齐规则（同级最长标签 + 2 空格），黄金测试以**语义断言**为主；
  该结论写入 `docs/plan.md`，避免后续为了迁就样例而写出不可解释的格式化代码。

## 2026-10-14 · S0 · 决策

- **做了什么**：就 10 个规格未定义或有歧义的点形成决策（D1–D10），全部记入 `docs/plan.md` 第 6 节。
- **其中 3 条来自"规格空白"而非偏好**：
  - D5：`init` 之后直接 `save`（无路径）spec 未定义 → 补充错误 `error: no file path. use 'save <file.svg>'`。
  - D8：`read` 遇到 `<path>`/`<defs>` 等非 6 类元素 spec 未定义 → 作为 `ForeignElement` 原样保留，
    不丢内容、可整树回写，但不进入本阶段编辑语义。
  - D10：text 内容中的引号转义 spec 未定义 → 明确"不支持转义、未闭合引号报 usage 错误"。
- **理由**：未定义行为若不在开工前钉死，会在实现后期以"随机选择"的形式固化，且无法写进一致性自查。

## 2026-10-14 · S0 · 修正：安装与运行方式（真实踩坑 → 决策改向）

- **做了什么**：执行 `npm install` 装 TypeScript + vitest + tsx。
- **发现（两次真实失败）**：
  1. `npm install` 报 `EPERM ... syscall: 'spawn'`（堆栈落在 `arborist/rebuild.js → runScriptPkg`）：
     npm 在 postinstall 阶段用**管道 stdio** 启动子进程，而本机沙箱禁止程序打开命名管道。
     处置：改用 `npm install --ignore-scripts` —— 成功（`added 61 packages in 3s`），
     且经实测 `tsc --version` = 5.9.3、`tsx --version` 均正常，说明跳过的只是 postinstall 校验，二进制可用。
  2. 接着 `npm run cli`（当时脚本为 `tsx src/cli/main.ts`）报 `Error: spawn EPERM`：
     **tsx 的工作原理就是再 spawn 一个 node 子进程**，在沙箱内不可用（而 `tsx --version` 不 spawn，所以能过）。
- **处置（决策改向）**：放弃 `tsx`，改为 **Node 24 原生类型剥离**直接运行 `.ts`
  （实测 `node src/cli/main.ts` 正常输出 banner，exit 0）。配套约束：
  `erasableSyntaxOnly`（禁用 enum/namespace/参数属性等不可剥离语法）、
  相对导入写 `.ts` 后缀 + `allowImportingTsExtensions`，构建时用 `rewriteRelativeImportExtensions`
  改写成 `.js` 输出到 `dist/`。
- **意义**：这条决定了 D6 的最终形态，也顺带减少了 1 个开发依赖；
  同时给代码立了一条硬约束——**只用可擦除的 TS 语法**，反而避免了参数属性滥用。
- **证据**：上述报错与实测输出均为本机真实执行结果。

## 2026-10-14 · S0 · 修正（第二次）：测试框架从 vitest 换成 node:test

- **做了什么**：`npm test` 试跑 vitest 5.0.4。
- **发现**：启动即失败 —— `failed to load config from vitest.config.ts` ← `Build failed with 1 error: [plugin externalize-deps] Error: spawn EPERM`
  ← `Object.execFile / exec` ← `optimizeSafeRealPathSync` ← `vite/dist/node/chunks/node.js:2481`。
  **读源码定位**（不是猜的）：`node_modules/vite/dist/node/chunks/node.js` 的 `optimizeSafeRealPathSync()` 在
  `fs.realpathSync.native(process.cwd())` 未抛 EISDIR 时会执行 `exec("net use")` 来建立网络驱动器映射表
  （为 Windows 上的 safe realpath），而 `exec` 走管道 stdio → 沙箱拒绝。该函数**没有环境变量开关**（已 grep 确认）。
- **评估过的三条路**：①降级/绕过 vite —— 该函数在 config 打包阶段就执行，无法用配置绕过；
  ②monkeypatch `child_process.exec` —— ESM 命名导入是只读绑定，补丁打不上；③换测试框架。
- **处置（决策 D11）**：改用 **Node 内置 `node:test`**。实测：
  - `node --test tests/`（默认进程隔离）→ 同样 `spawn EPERM`（每条测试文件一个子进程）；
  - `node --test --test-isolation=none "tests/**/*.test.ts"` → **通过**（1 passed，exit 0）；
  - `--experimental-test-coverage` → 正常输出行/分支/函数覆盖率表。
  于是 `npm test` = `node --test --test-isolation=none "tests/**/*.test.ts"`，删掉 `vitest` 与 `@vitest/coverage-v8`
  （一次 `uninstall` 移除 47 个包）。
- **副作用（正面的）**：项目依赖只剩 `fast-xml-parser` + `typescript` + `@types/node`，`engines` 提升为 `node >= 24`
  （因为依赖原生 TS 执行与 `--test-isolation=none`）。测试断言从 `expect()` 换成 `node:assert/strict`。
- **可复核性**：这条决策的每一步都有本机真实命令输出作证据；如果换到没有沙箱限制的机器上，
  vitest 本可用，但 `node:test` 同样可用且更少依赖，故不回退。

## 2026-10-14 · S4 · 实现 14 条编辑/显示命令（4 个小提交）

- **做了什么**：`create`（6 类型 + `in` 子句）、`tree`/`show`、`move`/`scale`/`set`/`delete`、
  `group`/`ungroup`/`addto`/`front`/`back`。加上 S3 的 4 条文档类命令与 `help`，
  **19 条命令中已实现 17 条**（剩下 `undo`/`redo` 属 S5）。
- **验证**：`npm run check` 全绿（163 个测试）；真实 CLI 回放 spec §6 的会话，输出与文档逐行一致
  （列对齐按 D4 的规则），存出的 `demo.svg` 结构正确。

### 本步的三个真实设计冲突（都在写代码时撞上，不是事后编的）

1. **工厂放哪儿**：`create` 命令需要"类型名 → 类"，而读取器已有一份"标签名 → 类"。
   若命令直接 import `registry/ShapeFactory`，就会与 `registry → commands` 形成**环**。
   → 把工厂拆成只依赖 `model`/`errors` 的独立模块 `src/factory/`，`io` 与 `commands` 都依赖它，环消失。
   同步改了依赖规则表、文档 §1.2/§2.3/§3.1 和组件图（重新渲染）。
2. **格式化类放哪儿（差点违反自己定的规则）**：`TreeFormatter`/`ShowFormatter` 最初写在 `src/cli/`，
   `TreeCommand` 一 import 就成了 `commands → cli` —— 正是 S1 时费力消灭的那条边。
   `tsc` 不报错，是**架构守护脚本**会报。发现后立即把两个类移进 `src/commands/`：
   输出格式属于命令，`cli/` 只负责把字符串写出去。
3. **`removeChild` 不在 `Element` 上**：`ungroup` 里对 `Element` 调 `removeChild` 编译失败（TS2339）。
   反射式地加 `as Container` 很丑，且会散落到多个命令里 →
   在 `EditorSession` 加 `requireContainer()`，把"查找 + 判断 + 一次转型"收进一处，命令只拿到 `Container`。

### 另外两个小教训

- `tsc` 又抓到一个**未使用的 import**（`GroupCommand` 里的 `Container`）——严格配置在持续生效。
- 测试里**又一次**因为"输出行数算错"失败（`read` 只占一行，我按两行算，断言取到了 `undefined`）。
  这已经是同类问题第三次出现 → 结论写进 S3 的日志：**黄金断言一律整块比较（`slice` + `deepEqual`），
  不要逐个下标**。S4 的显示类测试已按此写法。

## 2026-10-14 · S3 · 实现 SVG 读写与文档类命令（拆成 5 个小提交）

- **做了什么**：`SvgWriter`（模型→SVG 文本）、`XmlParser`（唯一接触 fast-xml-parser 的地方）、
  `ShapeFactory`（标签名→类，spec 允许的第二处按名分派）、`SvgReader`（SVG→模型，含自动补 id 与告警）、
  `DocumentStore` 端口 + `SvgDocumentStore` 适配器，以及 `init`/`canvas`/`read`/`save` 四条文档类命令。
- **验证**：`npm run check` 全绿（110 个测试 + 类型检查 + 架构检查）；真实 CLI 端到端跑
  `read examples/other.svg → canvas → save .tmp/cli-out.svg`，产出文件与 spec §6 的示例结构一致。
- **本步新增的架构决策**：
  - **端口 `ports/DocumentStore`**：命令层要用"读文件/存文件"，但它绝不该知道 XML 库和文件系统。
    于是命令只依赖端口，`io/SvgDocumentStore` 提供实现，组合根 `Application` 负责装配。
    这条同时也把"命令层 → io 层"的依赖**消灭**了，而不是简单地允许它。
  - **依赖规则随之更新**：`ports → model`、`io → registry`（读取器要用图形工厂）。
    规则表不是一开始就完美，而是被真实需要推着走——但环是不允许的：`io → registry`，而 `registry` 不依赖 `io`。

### 本步发现的真实问题（4 条）

1. **空 `<g>` 到底写成 `<g/>` 还是 `<g></g>`？** 我先按直觉写了测试期望 `<g id="scene"></g>`，测试失败。
   回头查 spec §4.1：`create g <id>` 给出的片段就是 **`<g id="scene"/>`（自闭合）**。
   → 结论：**代码是对的，我的测试期望是错的**。改测试而不是改实现。
   这条也说明"测试失败"不等于"代码有 bug"，先回规格确认。
2. **`width="100%"` 被我"宽松解析"成了 100**。测试直接把这个错误暴露出来。
   如果照原样写出 `width="100"`，同一个文件从"随窗口缩放"变成"固定 100px"——**静默改变文件语义**。
   → 决策 D22：数值规则明确化（纯数字或 `px` 取数值，其余取默认），**但原字符串始终原样回写**，
   与 D17（viewBox 保留）同一考虑。
3. **真实 CLI 脚本第一行命令报 `unknown command`**。原因是 PowerShell 5.1 的 `Set-Content -Encoding UTF8`
   会写 UTF-8 BOM（文件头 `EF BB BF`），首行被读成 `\uFEFFinit`。
   → 修 `Tokenizer` 忽略行首 BOM 并把 BOM 视为空白；已在真实 CLI 上验证 BOM 脚本能正常跑。
   这类问题**只有真的把 CLI 当程序跑一遍才会遇到**，进程内测试永远发现不了。
4. **测试里硬编码输出行号，连续两次断言错位**（先是忘记 id 告警占了一行，再是 `read` 顺序）。
   → 教训：黄金输出比对应当**整块对比**（`assert.deepEqual(lines.slice(1), [...])`），
   而不是逐条下标取值；S6 的黄金回放测试按整块对比来写。

## 2026-10-14 · S2 · 实现领域模型（拆成 6 个小提交）

- **做了什么**：`Element`（抽象基类）→ `Shape` + 5 个叶子类 → `Container`/`Group` → `ForeignElement` → `Document` →
  `NumberFormat`/`StyleAttributes`，外加架构守护脚本 `tools/ArchitectureChecker.ts`。
- **本步的关键设计取舍（都写进了 `docs/plan.md` 的决策记录）**：
  1. **D14：不建 id 注册表**。最初的计划里有一个可变的 `IdRegistry`，写的时候意识到：树和注册表是两份状态，
     一旦某条路径忘了同步（删除、reparent、undo 恢复）就会出现"id 明明在表里、元素却找不到"的幽灵 bug。
     改为让 `Document.find/hasId/nextFreeId` 直接走树遍历——只有一份真相，不可能不同步。
  2. **错误类型必须搬家**：模型层要抛 `no such shape: r9` 这类规格错误，而错误类原本在 `src/cli/`，
     会让 `model → cli` 反向依赖。于是独立出 `src/errors/EditorError.ts`，并把 21 条错误文案集中成工厂方法，
     规格 §4.2 与我们的补充项一眼可查、可被测试逐个断言。
  3. **D13：tree 的字段规则按 spec 样例固化**（rect 显示 `w/h` 缩写、line 显示两点、text 带引号内容），
     否则 S6 的黄金测试无从比对。
- **遇到的真实问题**：
  1. `npm run typecheck` 报 `TS6133: 'value' is declared but its value is never read`（`Container.setAttribute` 只用到 name）。
     → 参数改名 `_value`。**注意测试此时是全绿的**：`node --test` 只做类型剥离、不做类型检查，
     这正是"typecheck 与 test 两道闸门都要有"的直接证据。
  2. 第一版 `Rect.ts` 我多写了一个 `walk()` 覆写和一个多余的 `NumberFormat` 再导出——属于把基类已有能力重复实现。
     在提交前删掉了（保持"子类只声明自己特有的东西"）。
- **工具的可信度问题（主动加的一步）**：架构守护脚本第一版跑出来是 "no dependency violations"——
  但一个永远说"没问题"的脚本毫无价值。于是补了 `tests/fixtures/arch/model/Bad.ts` 这个**故意违规**的样本，
  断言脚本确实能抓到 `model must not depend on cli`，并把"项目自身无违规"也做成一个测试。
  现在 `npm run check` = 类型检查 + 测试 + 架构检查三合一。

## 2026-10-14 · S1 · 新增 `src/ports/`（架构调整，主动发现的反向依赖）

- **做了什么**：实现命令层时，命令对象需要"把结果打印出来"的能力。
- **发现**：`OutputSink` 接口最初放在 `src/cli/`（因为终端适配器在那里实现它）。但命令层若 `import type { OutputSink } from '../cli/OutputSink.ts'`，
  依赖方向就变成 **commands → cli**，而 `cli/main.ts` 又必须依赖 commands 才能注册命令 —— 形成模块级双向依赖，
  正是架构方案里"违反规则的依赖即为待处理项"要抓的东西。
- **处置**：新增 `src/ports/` 只放**接口**（端口），`OutputSink` 迁入其中；
  `cli/` 与 `io/` 提供实现（适配器）。依赖方向固定为 `cli → commands → ports`，`cli → ports`。
  同时把"命令目录 `CommandCatalog`"放进 `src/commands/`（它描述命令本身），
  `src/registry/` 只保留"名字 → 实现"的分派（避免 commands 与 registry 互相依赖）。
- **意义**：这是**在没有报错的情况下**由依赖规则审查发现的架构问题，比等测试失败更早；
  已记入 `docs/plan.md` 第 8 节修订记录，供一致性自查引用。

## 2026-10-14 · S1 · 实现 CLI 外壳

- **做了什么**：Tokenizer（引号 / 行首 `#` 注释）、可注入的 `LineSource` / `OutputSink`、
  `ScriptLineSource`（回放）、`Repl`（读一行→执行一条→打印）、`CommandCatalog`（19 条命令的语法与摘要）、
  `CommandRegistry`、`HelpCommand`、`CliError`。
- **验证**：
  - `npm run typecheck` / `npm run build` 均 exit 0；
  - `npm test` 18 passed；
  - 端到端回放 `cmd /c "npm run cli < examples\hello.script"` 与 `node dist\cli\main.js < examples\hello.script`
    都输出完整 help 并在遇到未知命令时报错后继续运行（exit 0）。
- **两个真实的小问题（都是被工具链抓到的，不是凭空写的）**：
  1. `tests/support/BufferSink.ts` 的 import 路径写错（`../ports/…` 应为 `../../src/ports/…`）→ **`npm run typecheck` 直接报错**。
     说明"类型检查 + 测试"两道闸门确实在拦错误。
  2. 测试"非交互模式不打印提示符"**假失败**：断言用真实提示符 `svg> ` 去匹配输出，
     而 help 里 `read <file.svg>` 这一行的**列填充空格**恰好拼出了 `svg> ` 子串。
     → 修正为测试专用提示符 `test> `（并在测试里注释了原因）。
     这条提醒：**断言必须避开与输出内容可能碰撞的字符串**，否则会得到"看起来通过、其实没测到"的假象。

## 2026-10-14 · S0 · 工作环境约定

- **背景**：本机 git 仓库由本人建在 `C:\pj1-svg-editor`（尚无提交），但 AI 的写入沙箱只覆盖 `C:\工作区`。
- **处置**：工程与 git 仓库建在 `C:\工作区\pj1-svg-editor`，**提交历史完整保留在仓库内**；
  最终由本人从该目录添加远程并推送 GitHub（推送位置不影响远程仓库内容）。
- **说明**：这一步是环境限制导致的路径选择，不改变交付物本身。
