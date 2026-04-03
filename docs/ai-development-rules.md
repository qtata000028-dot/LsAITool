# AI 开发规则与后续演进逻辑

本文件是本仓库给 AI 代码代理的明确开发合同。
目标不是限制效率，而是保证后续任何 AI 接手时，都不会在“没有规则”的情况下乱改。

## 1. 目标

本仓库当前的核心目标有三个：

1. 继续稳定交付现有设计平台能力
2. 按平台边界推进前端架构演进
3. 在多人和多 AI 协作下，保持代码可继续拆、可验证、可维护

## 2. 规则真相源

AI 开始工作前，必须按下面顺序建立上下文：

1. `AGENTS.md`
2. `docs/ai-development-rules.md`
3. `docs/dashboard-architecture-rules.md`
4. `docs/frontend-platform-architecture.md`
5. `CONTRIBUTING.md`

如果改动只涉及局部页面，不需要读完整仓库文档，但至少要读与当前改动直接相关的专项文档。

## 3. 当前架构逻辑

### 3.1 平台层

当前前端正在往“平台工作区”演进，而不是继续把所有页面混成一个后台壳子。

- `design`：设计工作台、固定页面、重交互
- `runtime`：运行时动态菜单、动态页面、权限与 schema 驱动
- `mes`：业务平台壳子

因此以后新增功能时默认先判断：

- 是设计平台能力
- 是运行时平台能力
- 是跨平台共享能力

而不是先往 `App.tsx` 或 `Dashboard.tsx` 塞。

### 3.2 Dashboard 层

`src/components/Dashboard.tsx` 现在的角色是：

- 页面级状态协调
- 顶层 runtime hook 接线
- feature 节点组装

它不再是新功能的默认主落点。

禁止继续向 `Dashboard.tsx` 回填：

- 资源加载细节
- 详情装饰缓存逻辑
- inspector 组装细节
- 大块 modal / workbench JSX
- 低层 builder / mapper / resize 逻辑

### 3.3 功能域层

以后 Dashboard 相关改动默认按职责落到：

- `src/features/dashboard/module-settings`
- `src/features/dashboard/table-builder`
- `src/features/dashboard/designer`
- `src/features/dashboard/resize`
- `src/features/dashboard/detail-layout-designer`
- `src/features/dashboard/hooks`
- `src/features/dashboard/utils`

只有“页面协调层”才允许留在 `Dashboard.tsx`。

### 3.4 共享层

当某段逻辑同时被两个以上平台或业务域复用时，再考虑提升到共享层：

- `src/shared`
- `src/app/contracts`
- `src/app/registry`
- `src/app/router`

不要过早抽象，也不要已经复用两处了还继续复制。

## 4. 新需求落点决策

AI 实现新需求前，默认按下面顺序判断：

1. 这是页面协调，还是 feature 内实现？
2. 如果是 feature 内实现，当前仓库是否已经有对应目录？
3. 如果已有 feature，优先继续沿该边界扩展
4. 如果没有，再新增 feature 边界
5. 如果会影响平台契约、路由、菜单、登录、权限，再同步平台文档

## 5. 代码编写规则

### 5.1 组件

- 组件负责展示和少量界面交互
- props 必须清晰
- 不要在组件体内继续堆数百行业务处理

### 5.2 Hook

- hook 负责状态、副作用、动作封装、局部编排
- 一个 hook 只承接一个清晰主题
- hook 继续膨胀后，要再次拆分，而不是变成第二个页面组件

### 5.3 Builder / Runtime

- builder 负责把分散输入整理成结构化配置
- runtime hook 负责把多个低层 hook、builder、node 组合成页面可消费边界
- 如果低层 builder 已经不再被入口文件直接使用，应及时删除，不保留死中间层

### 5.4 Service / Utils

- service 负责请求与数据加载边界
- utils 只放纯函数
- 不允许把副作用塞进 utils

## 6. 详情布局统一规则

凡是“表格详情配置 / 详情布局编辑 / 分组布局编辑”相关需求，必须优先复用：

- `src/features/dashboard/detail-layout-designer`
- `FieldBackedDetailLayoutDesigner`
- 现有 adapter / bridge / shell 模式

禁止：

- 再造第二套独立布局编辑器
- 在业务组件里复制新的 palette / canvas / drag-resize 机制

## 7. AI 实施流程

AI 默认按下面流程执行：

1. 明确目标、影响范围、验证方式
2. 只读取相关目录和直接依赖
3. 优先复用现有 runtime / hook / builder / service
4. 用最小可验证改动实现
5. 跑验证
6. 若变更影响规则或边界，同步更新文档和守卫

## 8. 必跑验证

普通前端改动：

```bash
npm run verify
```

架构、规则、CI、脚本、平台边界类改动：

```bash
npm run verify:strict
```

`verify:strict` 额外包含：

- `npm run guard:architecture`

## 9. 守卫脚本约束

仓库已经内置 `scripts/check-architecture-guards.mjs`，当前主要守：

- 规则文件存在性
- 规则文档里不能出现本地绝对路径
- `Dashboard.tsx` 不能再次膨胀过界
- `Dashboard.tsx` 不能重新依赖已禁止的低层实现
- CI 必须执行架构守卫和基础验证

以后如果架构真的升级，可以改守卫，但必须和代码同步改。

## 10. AI 完成定义

AI 只有在以下条件全部满足时，才能说“完成”：

- 代码已落在正确边界
- 没有明显结构回退
- 必跑验证通过
- 如果动了规则，文档和守卫也同步更新
- 对仍然存在的风险有明确说明
