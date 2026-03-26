# Dashboard 架构演进规则

本文件用于约束 `Dashboard` 及 `src/features/dashboard` 相关功能的后续新增、修改和重构方式。

适用对象：

- 人工开发
- Codex / 其他 AI 代码代理
- 后续协作同事

目标不是“为了好看而拆目录”，而是持续降低以下成本：

- 入口文件上下文成本
- 局部功能理解成本
- 高频区域改动成本
- 多人和 AI 协作冲突成本

## 1. 总原则

- 不推倒重来，只允许在现有结构上持续演进。
- 默认保持业务逻辑、交互结果、接口契约和样式表现不变。
- 优先做小步重构，每轮只处理一个主题，保证可验证、可回滚、可继续。
- 不允许因为“想更优雅”就把简单问题复杂化。

## 2. Dashboard 入口文件规则

`src/components/Dashboard.tsx` 是页面入口，不再作为新功能主落点。

允许保留：

- 页面顶层布局
- 顶层状态协调
- 调用顶层 hooks
- feature node / shell 装配
- 跨 feature 的少量页面级桥接

禁止继续堆积：

- 大段业务计算
- 大量表格列定义
- 大量模块设置细节
- 复杂拖拽 / resize 实现
- 重复的局部 helper
- 直接内联的大块 modal / workbench / inspector JSX

新增功能如果继续往 `Dashboard.tsx` 堆实现，默认视为结构回退。

## 3. 功能域优先

Dashboard 相关代码优先按功能域组织，而不是全局平铺。

推荐职责边界：

- `src/features/dashboard/designer`
  - 设计器预览、运行时样式、设计器交互
- `src/features/dashboard/module-settings`
  - 模块设置、inspector、detail board、document/bill/tree workbench、config wizard
- `src/features/dashboard/resize`
  - 尺寸拖拽、宽高预览、resize state
- `src/features/dashboard/table-builder`
  - 列结构、表构建、table builder runtime 和 bridge
- `src/features/dashboard/hooks`
  - 顶层页面协调 hook
- `src/features/dashboard/utils`
  - 纯函数工具
- `src/features/dashboard/types`
  - 顶层共享类型
- `src/features/dashboard/constants`
  - 枚举、默认值、固定映射

## 4. 新功能落点规则

以后新增 Dashboard 相关功能，默认按下面规则落位：

1. 先判断是否是已有 feature 的增量。
2. 如果属于现有 feature，优先继续落在该 feature 目录，不要回堆到 `Dashboard.tsx`。
3. 如果是新的明确业务块，先创建新的 feature 边界，再接入页面入口。
4. 只有“纯页面级协调”才允许直接留在 `Dashboard.tsx`。

常见例子：

- 新增 inspector 面板：放 `module-settings`
- 新增 detail board 能力：放 `module-settings/detail-board` 相邻边界
- 新增表格构建器能力：放 `table-builder`
- 新增运行时 resize：放 `resize` 或对应 feature hook
- 新增预览 renderer：优先放 `designer`

## 4.1 表格详情布局统一规则

以后凡是“表格详情配置 / 详情布局编辑 / 主表分组布局 / 明细详情布局”相关需求，默认必须复用统一详情布局设计器能力，不允许各入口继续各写各的编辑器。

统一落点：

- `src/features/dashboard/detail-layout-designer`
  - 统一承载详情布局设计器骨架、交互、registry、基础 hooks、通用 utils
- `src/features/dashboard/module-settings`
  - 业务侧只负责 adapter、bridge、modal shell、运行态预览接线

统一模式：

1. 字段型详情布局场景优先复用 `FieldBackedDetailLayoutDesigner`
2. 每个业务入口只允许新增自己的 `adapter`
   - 负责 `旧 schema -> designer layout`
   - 负责 `designer layout -> 旧 schema`
3. 每个业务入口只允许新增自己的 `shell / bridge`
   - 负责业务按钮
   - 负责外层 modal
   - 负责受控 document 接线
4. 不允许重新实现第二套 palette / canvas / property panel / drag-resize 机制

当前已接入统一机制的入口：

- detail board 布局编辑入口
- archive layout 画布入口

后续新增同类入口时，默认沿用这条路径，而不是再造一个新的“字段拖拽编辑器”。

禁止行为：

- 新增新的 row-based 详情布局编辑器
- 在 `module-settings` 内复制一套新的设计器组件树
- 为单一业务入口重新实现 `dnd-kit + react-rnd` 交互
- 直接在业务组件里手写字段 palette、字段 options 和字段 preview 映射

设计态 / 运行态要求：

- 设计态统一由 `detail-layout-designer` 承担
- 运行态优先读取 `designerLayout`
- 旧 schema 仅作为兼容层存在，不能再作为新功能主数据模型继续扩展

GroupBox 规则：

- GroupBox 是统一容器控件，不允许每个入口重新定义自己的“分组框”数据结构
- 业务分组语义如果需要兼容旧数据，必须通过 adapter 映射，而不是修改设计器核心类型

## 5. 组件 / Hook / Service / Utils 规则

### 组件

- 组件负责展示，不负责持有复杂业务编排。
- 优先拆有明确视觉边界的大区块，不拆碎按钮碎标签。
- props 必须有明确类型。

### Hook

- hook 负责状态持有、副作用、事件封装、业务逻辑编排。
- hook 返回对象，不返回难理解的长数组。
- 一个 hook 如果继续膨胀成几百行，必须再次按职责拆分。

### Service

- 接口请求逐步收口到 service 层。
- 相同请求不能在多个组件里重复写。
- service 不处理组件 UI 状态。

### Utils

- 只放纯函数。
- 不允许把副作用逻辑塞进 utils。
- 不允许把 utils 演化成“什么都往里塞”的黑洞。

## 6. 依赖方向

保持单向依赖，避免 feature 互相穿透：

- `Dashboard.tsx` -> feature builder / shell / hook
- feature 外层组件 -> 本 feature 的 hooks / utils / services / types
- feature -> 公共 `ui` / `lib`

禁止：

- feature 之间直接深层引用内部实现
- 为了省事跨目录拿内部私有 helper
- 新增循环依赖

## 7. 变更方式

后续继续演进时默认采用下面节奏：

1. 先分析目标区块职责和边界
2. 只改当前主题相关文件
3. 优先移动展示层
4. 再移动状态 / bridge / helper
5. 最后做 lint / build 验证

不要做的事情：

- 一次性重写整个 Dashboard
- 顺手改无关模块
- 顺手改接口契约
- 顺手重做样式
- 为了减少行数而制造更多难懂 builder 套层

## 8. 后续 AI 开发强约束

以后 AI 代理在本仓库处理 Dashboard 相关需求时，默认必须遵守：

- 先分析，再改动
- 每次只处理一个主题
- 不全项目扫描，优先只看目标目录和直接依赖
- 不把新逻辑继续堆回 `Dashboard.tsx`
- 优先复用现有 feature 边界
- 如果需求涉及“表格详情配置 / 详情布局编辑”，默认先检查并复用：
  - `src/features/dashboard/detail-layout-designer`
  - `FieldBackedDetailLayoutDesigner`
  - 现有业务 adapter / bridge
- 不得新造第二套详情布局设计器
- 改完至少执行：
  - `npm run lint`
  - `npm run build`
- 如果没有验证成功，不得声称完成

## 9. 合并前检查

涉及 Dashboard / `src/features/dashboard` 的改动，合并前至少确认：

- 页面入口没有新增明显的大块实现
- 新逻辑落在对应 feature 目录
- 没有新增跨 feature 深层依赖
- `npm run lint` 通过
- `npm run build` 通过

## 10. 当前阶段结论

目前项目已经完成一轮较大规模的 `Dashboard` 演进，后续策略应从“持续硬拆”切换为“按需拆分”：

- 高频变化区继续按 feature 演进
- 入口文件只保留顶层协调
- 如果某块再次膨胀，再针对该块继续收口

不要为了继续降 `Dashboard.tsx` 行数而机械拆分。
