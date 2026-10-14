# pj1-svg-editor

PJ1 Phase 1 —— **CLI 版 SVG 编辑器**（TypeScript / 面向对象 / Command 模式）。

需求来源：课程提供的 `phase_cli_1.md`。需求分解与决策记录见 [`docs/plan.md`](docs/plan.md)，
架构方案与过程记录见 [`doc/README.md`](doc/README.md)。

## 快速开始

环境要求：**Node.js ≥ 24**（直接运行 `.ts` 依赖 Node 原生类型剥离）。

```bash
npm install
npm run cli          # 启动交互式 REPL
npm run typecheck    # 类型检查
npm run build        # 编译到 dist/
npm run cli:dist     # 运行编译产物
npm test             # 运行测试（Node 内置 test runner）
npm run coverage     # 覆盖率报告
npm run check        # 类型检查 + 测试
```

命令序列可以存成脚本回放（`#` 开头为注释）：

```bash
npm run cli --silent < examples/flowchart.script
```

## 目录结构

```
src/
  cli/        命令行外壳（REPL、解析、格式化输出）
  commands/   命令层（Command 模式，一条命令一个类）
  model/      领域模型（元素树、图形类、文档、id 注册表）
  geometry/   几何与坐标运算
  io/         SVG 读写（序列化 / 解析）
  history/    撤销重做栈
  registry/   命令注册表与图形工厂（允许按名字分派的两处）
doc/          课程要求的项目文档
docs/         需求矩阵、决策记录、协作日志
tests/        单元测试与黄金回放测试
tools/        架构守护脚本
examples/     示例 SVG 与命令脚本
```

## 状态

按 `docs/plan.md` 的阶段计划推进，提交历史对应各阶段步骤。
