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
