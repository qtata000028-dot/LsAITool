# 仓库协作与 AI 开发规范

本文件是本仓库的人类开发者与 AI 代码代理的统一协作约束。
凡是在本仓库内改代码、改脚本、改文档、改 CI，都默认先遵守这里。

## 1. 必读顺序

开始任何非简单改动前，按下面顺序建立上下文：

1. `AGENTS.md`
2. `docs/ai-development-rules.md`
3. 如果改动 `Dashboard` 或 `src/features/dashboard/**`，继续读 `docs/dashboard-architecture-rules.md`
4. 如果改动应用入口、路由、平台边界、登录流、共享壳子，继续读 `docs/frontend-platform-architecture.md`
5. 提交和协作流程看 `CONTRIBUTING.md`

## 2. 不可绕过的规则

- 先判断边界，再写代码；不要一上来就堆实现。
- 默认做最小可验证增量，不做“大而全”重写。
- 不允许通过关闭 lint、放宽类型、跳过构建来掩盖问题。
- 任何人或 AI 都不能把新逻辑无脑堆回 `src/components/Dashboard.tsx`。
- 如果你打算突破当前架构约束，必须同时更新文档和守卫脚本，不允许只改代码不改规则。

## 3. 当前前端开发主线

本仓库已经不是“单一后台页面”，而是在往平台化前端演进。

- `design` 平台：设计工作台、重交互页面、Dashboard 仍然是核心入口
- `runtime` 平台：运行时动态菜单、动态页面、权限与 schema 驱动
- `mes` 平台：独立业务入口壳子
- `src/shared` / `src/app/contracts` / `src/app/registry`：逐步承接跨平台共用能力

后续开发默认遵守：

- 设计器能力优先留在 `src/features/dashboard/**`
- 运行时菜单和动态页面优先留在 `src/platforms/runtime/**`
- 共享契约、共享 presenter、共享基础设施优先沉到 `src/shared/**` 或 `src/app/**`
- 只有当两个以上平台同时复用时，才把能力提升为共享层

## 4. Dashboard 专项规则

只要改动以下任一目录，就默认必须遵守 Dashboard 规则：

- `src/components/Dashboard.tsx`
- `src/features/dashboard/**`

对应文档：

- `docs/dashboard-architecture-rules.md`

额外强约束：

- `Dashboard.tsx` 只负责页面级协调、顶层状态编排、runtime hook 接线
- 大块业务逻辑、资源加载、inspector 组装、screen router 组装都应该继续外提
- 不允许重新引入已经拆走的低层 builder / loader / decoration / inspector 直连模式
- 如果需求涉及“表格详情配置 / 详情布局编辑”，必须优先复用统一的 `detail-layout-designer` 体系

## 5. AI 执行流程

AI 在本仓库做事时，默认按这个顺序执行：

1. 明确目标、影响范围、不做什么
2. 只读取相关目录和直接依赖，不做无边界全仓扫描
3. 先复用现有 feature、hook、builder、runtime，再考虑新增
4. 改动完成后，按变更范围执行验证
5. 如果改动影响架构规则、目录职责、协作方式，同步更新文档和守卫脚本

## 6. 强制验证规则

前端代码改动默认至少执行：

- `npm run verify`

如果改动涉及以下任一内容：

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/**`
- `.github/**`
- `package.json`
- `scripts/check-architecture-guards.mjs`
- `Dashboard.tsx` 的架构边界

则必须执行：

- `npm run verify:strict`

未验证通过，不得宣称完成。

## 7. 架构守卫

仓库已经内置自动守卫：

- `npm run guard:architecture`

当前会检查：

- 关键规则文件是否存在
- 规则文档是否包含本地绝对路径
- `Dashboard.tsx` 是否超出约定体量
- `Dashboard.tsx` 是否重新依赖已禁止的低层实现
- CI 是否执行了架构守卫和标准验证

如果架构确实需要演进，可以调整守卫，但必须和代码改动同一轮提交。

## 8. 文档真相源

后续开发规则以这些文件为准：

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/ai-development-rules.md`
- `docs/dashboard-architecture-rules.md`
- `docs/frontend-platform-architecture.md`
- `.github/copilot-instructions.md`

如果这些文件之间有冲突，优先级如下：

1. `AGENTS.md`
2. 专项架构文档
3. `CONTRIBUTING.md`
4. README 说明
