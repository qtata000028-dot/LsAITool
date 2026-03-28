# 任务教训

## 2026-03-28 AI Batch Actions Should Reuse The Real Page Save Instead Of Inventing Narrow Follow-Up Saves
- When the user says an AI-assisted batch action like “一键翻译” should “save this page”, wire that action into the existing page-level save orchestration instead of inventing a special-case save that only persists one field such as the table name.
- In this single-table module-settings flow, the authoritative save entry is `saveSingleTableModuleSettingsPage`; any follow-up save from the grid inspector should call that shared page save so master config, columns, conditions, menus, and related state stay consistent.
- Treat translation and save as two distinct outcomes. If translation succeeds but page save fails, surface that partial-success state explicitly instead of showing a generic full-success toast.
- Do not short-circuit the page save just because the AI translation step found zero acceptable replacements. If the product says “clicking the button should also save this page”, the save path still needs to run for “no translatable fields” and “all results filtered out” branches, or the user will see no save request at all.

## 2026-03-28 Follow-Up Saves After AI Create Must Respect The Exact Persistence Scope
- When the user narrows a follow-up save rule from “save the generated config” to “save only the table name”, do not keep posting the broader payload through a shared adapter by accident. Re-check both the caller payload and the adapter’s fallback rules.
- In this single-table flow, AI one-click table creation may still update local `mainSql`, but its follow-up module-config save should omit SQL entirely when the requirement is “only persist the table name”.
- If the user still sees the generated SQL after the follow-up save payload is already narrowed, inspect local state writes next. In this screen, `updateGridConfig({ mainSql: response.result.mainSql })` was enough to make the UI and the later normal save path keep treating the AI result as persisted SQL.

## 2026-03-28 Single-Table Main Config Screens Must Load And Save The Master Config Row Explicitly
- If a module-settings screen shows main-table metadata like table name or main SQL, do not assume loading the field list, conditions, menus, and colors is enough. The master row still lives in `p_systemdlltab`, and the screen must explicitly fetch/save that row as part of its own lifecycle.
- For this single-table flow, normalize the legacy `p_systemdlltab` field names at the adapter boundary, not in scattered UI code: `DllCoid -> dllCoId`, `ToolsName -> moduleName`, `SQL -> querySql/mainSql`, `SQLDT1 -> mainTable/tableName`, and `condKey -> conditionKey`.
- Do not invent mappings for UI fields that have no confirmed backend column. `defaultQuery`, `sqlPrompt`, and `tableType` should stay on their real contracts instead of being force-fit onto unrelated legacy fields like `condKey`.

## 2026-03-28 Server-Side Create Flows Must Persist Their Authoritative Module Config In The Same Success Path
- If a button creates backend resources that define the canonical module config, like AI one-click table creation producing the final `tableName` and `mainSql`, do not stop at updating local React state. Persist the matching module-config row in the same success branch or the next reload will drift back to stale backend values.
- Keep the follow-up save aligned with the existing read contract. In this single-table module flow, the authoritative config keys are `mainTable` and `querySql`, so the post-create save should write those exact keys instead of inventing UI-only names such as `tableName`.

## 2026-03-23 Document Split, Resize Smoothness And Archive Group Layout
- 文档工作台里主表和明细如果都是高频操作区，就不要继续保留可拖分隔条；默认应按稳定比例甚至等分高度展示，避免用户一点击下半区就感觉布局在缩动。
- 对高频拖宽控件，不能一处用直接 setState 每帧刷新、另一处再单独实现临时预览；应统一成同一套 live preview + rAF 提交链路，否则体感会明显不一致。
- 当用户明确需要“拖宽时有对齐刻度”时，不要只显示当前像素 HUD，要把可吸附宽度和刻度反馈一起给出来，帮助微调。
- 基础档案主表详情布局如果已经有“分组”语义，就不要再停留在大块分组卡堆叠；应升级为主从工作台，让用户先选分组，再配置该分组内部行数和字段排布。

## 2026-03-23 明细类型入口与表格式明细能力
- 明细类型切换必须内聚到明细页签右侧，不要再保留底部独立类型栏。页签负责定义当前明细的内部视图类型，工作面只按这个类型渲染。
- 表格式明细整表能力必须和主表保持同级，至少要保留整表、布局、右键、颜色这类高频入口，不能因为是明细就降成裁剪版检查器。
- 验证这类改动时不能只看右侧表单有没有出现，还要真实切一次类型，确认中间工作面同步切换，且旧的底部类型切换条已经消失。

## 会话启动前检查
- 开始本项目的复杂任务前，先阅读本文件。
- 如果用户刚给出修正意见，先更新本文件，再继续执行。

## 当前沉淀规则

### 规划与执行
- 非简单任务必须先规划，规划需要覆盖实现与验证，而不是只列功能步骤。
- 执行中如果发现方案偏离、上下文变化或验证不成立，先停下并重规划。
- 需求规格要提前写细，避免靠实现过程临时猜测。

### 上下文与并行
- 调研、探索、并行分析类工作要尽量与主实现解耦，保持主上下文干净。
- 单个分析单元只处理一个问题，避免混杂多个目标。

### 质量与验证
- 未证明可运行前，不能声称完成。
- 必须以测试、构建、日志、浏览器验证或行为对比证明结论。
- 若存在未验证项，必须明确记录风险，不能省略。

### 自我优化
- 用户的每一次修正都应转化为明确规则，写入本文件，防止重复犯错。
- 对已有教训要持续迭代，而不是一次性记录后失效。

### 实现风格
- 先追求根因修复，再考虑最小侵入实现。
- 对非简单改动，优先寻找更统一、更优雅的方案，避免临时拼补。

## 更新记录

### 2026-03-22 明细页签与内部视图分层
- 明细页签和明细内部视图不能重复承载同一批配置。页签只负责页签级定义，表格/图表/网页等内部视图要通过点击对应画布对象进入各自详情，否则用户会在两套右侧表单里来回找同一个配置。
- 当用户明确指出“图表应该点击视图预留区展示配置”时，不要只靠底部类型切换推断当前配置对象；必须让画布对象本身成为详情入口，做到点击对象即切换到对应检查器。
- 图表类高频配置如果字段多，不能简单平铺成密集的小格子；应按“基础信息 / 轴字段 / 颜色 / 开关”分组，优先保证扫描和填写顺手。

### 2026-03-22 明细检查器布局
- 当用户明确指出“右侧详情排版太乱”时，不要继续在现有结构上叠加小卡片、小统计块和多层入口；应退回到更少容器、更清晰分组的表单骨架。
- 对同一工作面里的“明细模块定义”和“明细表格配置”，即使语义不同，也要共享统一的视觉节奏；不能一边是碎摘要卡，一边是密集嵌套入口，否则用户会直接感知成杂乱。
- 高频配置面板里，低价值的计数卡、表名卡、说明文案和技术映射提示应优先删减或并入标题/次级信息，不能让它们抢占填写区的主层级。

### 2026-03-22 明细图表配置口径
- 当用户明确指向某张历史配置表，如 `p_systemdlltabchart`，不能只在右侧放一个“落点映射卡”或表名提示；必须按这张表的字段口径把真正可编辑的配置分支补出来，否则用户看到的仍然只是半成品。
- 对这类“旧 WinForm 表格配置 -> 新工作台检查器”的迁移，优先保留字段语义和高频填写顺序，再做 shadcn/workbench 化，不要先做一层好看的摘要卡就停下。

### 2026-03-22 明细配置职责边界
- 当用户说“刚才的明细弄错了，拿这些配置去改”时，优先回查自己是不是把“明细模块定义”和“明细整表配置”拆成了两套并行模型；这类高频配置必须收口成一套主模型，不能让用户在两个右侧详情里来回找。
- 基础档案下的明细表格如果要“和主表一样，只是来源不同”，正确做法是复用主表整表配置语法，再把“模块编号继承主表配置 / SQL 自动构列”作为来源增强规则，而不是再造一套明细专属表单。
- 当用户给了明确的历史 WinForm 截图时，应优先按截图里字段口径和操作节奏对照实现，而不是继续沿用上一轮自己推断出的表结构分支。

### 2026-03-21
- 用户要求将规划、验证、教训沉淀和优雅实现正式落到项目文档中，后续必须严格执行。
- 当用户描述“放下面”这类布局诉求时，必须先区分是同一步内的视觉分区，还是新增一个后置步骤，不能直接按页面排版理解。
- 做界面可视高度判断时，不能只依赖本地放大后的视口或截图缩略图，必须按用户真实常见窗口高度验证是否完整可见。
- 对后台配置工作台，先设计滚动归属和高度分配，再决定字段压缩方式；否则容易误把容器层级问题当成字段太多。
- 当用户明确表示“这个区域可以不用表格”时，不要继续执着保留表格隐喻，应回到任务本质，选更适合的主从卡片、列表或工作台结构。
- 当用户继续指出“留白太多、重度配置不顺手”时，不要只靠缩小输入框高度修补；应直接重构成卡片式主从工作台，让摘要查验和详情编辑分层清晰。
- 当字段只是只读查验信息而不是可编辑配置时，不要放进右侧配置表单；应优先放到左侧卡片或摘要区展示。
- 当某些页签只是模型映射或只读查验入口，而不是限制措施的核心配置时，不要继续留在第 6 步里占空间；应直接从限制措施页签中移除。
- 当限制措施里保留多个业务页签时，右侧布局不能一页一套风格；应统一为同一类摘要条 + 配置卡工作台，避免某些页签继续沿用老式双栏空面板。
- 当用户反馈“结构可以但看起来乱”时，问题通常不在字段多少，而在同一信息被重复放置、说明文字过多、卡片层级不一致；优先统一骨架并删除重复信息，而不是继续叠样式。
# 2026-03-21 高频配置补充教训
- 对高频配置界面，用户说“切换不丝滑”时，要优先检查是否有人为引入 `deferred`、多次无效 setState 或重复渲染，而不是只盯视觉样式。
- 对工作台式界面，出现大量留白时，先检查容器高度策略和 `flex-1 / h-full / min-h-*` 的叠加关系，再决定是否要缩控件。
- 明细工作区的模式切换控件应尽量并入主工具条，避免再额外占一条底栏，把有效高度浪费在“说明式工具栏”上。
- fullscreen 工作区不能只看内部面板是否紧凑，还要量外层 stage 到底部操作栏的真实 gap；否则容易把空白从面板里挪到面板外。

### 2026-03-21 明细双模式数据源
- 当用户描述两种互斥的数据源策略时，不要把一半配置放在页签行为、一半放在表格属性里；必须统一到一个“数据源”入口，否则后续员工配置时会失去全局理解。

### 2026-03-21 模块设置舞台留白
- 当用户指出第 5 步模块设置底部大片留白时，要优先检查外层 `stage` 是否用了固定高度、上下 pane 默认比例是否失衡，而不是继续压右侧卡片或局部控件。
- 如果明细区使用紧凑表格画布，不能只给 `min-height`；要同时给父容器 `h-full / flex-1`，并把骨架行沿整个画布分布，否则视觉上会像内容缩在顶部、下半区整块发空。
### 2026-03-22 明细配置体验
- 如果用户明确指出“不要多出几排光影/骨架”，就不能再拿装饰性的 skeleton 充当表体密度；应回到干净表格面或真实占位行，而不是继续堆视觉效果。
- 对高频配置场景，数据源入口必须收敛到一处；“页签行为里一套、整表属性里再一套”的设计会直接制造理解成本。
- 当用户反馈“还是有一点延迟”时，不要默认继续用 transition/deferred；要优先回查是否把高频选中链路放进了低优先级更新。
- 明细页签本身如果只是对象切换入口，就不该默认把右侧带到“页签行为”而不是“当前明细整表配置”；默认落点必须是用户当下最常改的数据源和整表属性。
### 2026-03-22 明细类型入口位置
- 对高频配置入口，用户已经形成稳定心智后，不要为了“视觉统一”把入口从原有位置挪走；尤其像明细类型这种模式切换，优先保留右下角这类历史位置，减少重新理解成本。
### 2026-03-22 模块条件条收敛
- 当主表条件和左表条件属于同一工作面里的高频配置时，不要把它们拆在左右各自工具条里；应统一收敛到模块顶部，通过轻量切换按钮管理当前作用域，避免视线来回跳。
- “默认进入状态”不能只改一个初始 `useState`；还要排查后续 `useEffect`、打开向导入口和步骤切换里是否有强制覆盖状态的逻辑。
### 2026-03-22 模块设置交互与非全屏布局
- 列宽拖拽这类设计器能力，不能把最小宽度绑死在标题文案宽度上；如果用户明确需要拖到接近 `0px`，应把标题显示和列物理宽度解耦，用截断、悬浮提示或选中态处理可读性。
- 当用户反馈“点击条件或左表后下方出现大片留白”时，不要只看单个面板高度，必须回查点击后整个上下 pane 分配、空态容器 `min-height`、以及不同 scope 下的 fallback 画布是否重新占满。
- 非全屏模式下右侧检查器不能沿用全屏收窄逻辑；应让宽度按可用空间自适应到足够展示页签文案，避免通过换行牺牲可读性。
### 2026-03-22 明细类型切换入口
- 当用户已经接受“明细类型切换放在下方”的心智后，不要再把它做成贴在画布里的孤立悬浮控件；应收成独立底部 panel，让它成为工作台的一部分，而不是漂在内容上层。
- 引入 `shadcn/ui` 风格时，不一定要先整库迁移；可以先把高频入口做成更克制的 segmented/panel 语法，先落在局部工作面上验证质感和顺手度。
### 2026-03-22 条件工作台与底部类型 Panel
- 当用户明确要求固定条件控件总宽度时，不要继续保留旧的按名字长度动态撑宽和拖拽调宽；应直接把名字展示与控件物理宽度解耦，收成统一宽度工作台。
- 顶部条件区不能只支持“逐个字段配置”，还要支持“面板级总览配置”；像行数、分栏数、批量粘贴构建这类布局级能力，应该在右侧单独建一个总览分支，而不是塞进单个条件表单。
- 当用户认可新的结构但不认可选中色和左侧介绍时，不要回退整体结构；应保留结构，只收掉信号层：颜色、摘要文案、信息密度。
### 2026-03-22 条件条与布局稳定
- 当用户先接受 `175px` 默认宽度、随后又明确要求恢复拖宽时，正确规则不是“继续把宽度写死”，而是“默认宽度固定、实际宽度可拖可改”。默认值和可调能力要解耦。
- 顶部条件区属于高频排布区域，不要再做成明显卡片块；越像卡片，用户越难判断真实间距。应优先使用扁平行式 workbench 语法。
- 上下工作区分隔条的位置不能依赖当前选中对象动态抬高，否则用户会直接感知成“点击时界面在抖”。pane 高度策略要尽量稳定，选中态只改内容，不改大框架。
- 条件标签和控件的距离要先服务于读取与间距判断，说明性装饰和额外留白应后置。
### 2026-03-22 条件工作台直接操作优先
- 当用户已经明确要“拖入每一个控件行数中”时，不要继续保留“每行分栏”这类抽象数字配置；应回到直接操控模型，用真实行容器承接拖放。
- 对高频排布区，布局模型只能保留一套。不能一边让用户按行拖放，一边又让 grid 分栏数继续主导布局，否则会制造理解冲突。
- 条件宽度拖拽的“卡”通常不是视觉问题，而是每帧全量更新数组导致的；要优先优化更新链路和重渲染范围，而不是只改拖拽手柄样式。
### 2026-03-22 右侧详情去冗余
- 当用户明确要求“右侧详情整体优化”时，不要继续局部修一个分支；应优先收敛公共骨架、输入控件和 tabs 语法，让主表、列、条件、明细等检查器共用同一套视觉节奏。
- 高频办公填写面板里，低价值说明文案会直接制造噪音。像“这里统一维护…”、“先从上面选择…”这类提示，若不承担关键决策信息，就应该删掉或压缩成最短状态文案。
- shadcn/ui 风格迁移不等于必须整库安装；当项目还处在重构期时，先把现有壳层和表单控件收成 shadcn 的后台语法，往往比引入整套依赖更稳。
- 当用户要求“右侧详情整体优化”时，不能只改输入框样式；必须一起收口 panel、tabs、badge、说明文案和技术映射呈现方式，否则看起来仍然像旧系统换了一层皮。
- 对高频配置面板，技术表名和映射关系不该再用一串标签堆在最上面；更适合改成短卡片或计数入口，把注意力留给真正可填写的字段。
- shadcn 化优先级应是：先统一公共基础语法，再迁高频分支；如果先逐个分支随手改 class，最终还是会回到“一页一种风格”。
### 2026-03-22 顶部条件拖拽区
- 顶部条件这种高频拖拽工作区，不要再额外放行序号、角标这类装饰信息；它们会直接干扰用户判断真实间距和拖拽落点。优先保留纯控件行。
### 2026-03-22 单据主表与条件区统一
- 当用户已经认可顶部条件区的新 workbench 语法后，单据主表这类同样是高频拖拽排布区的控件也要尽快收敛到同一套语言；不要让条件、主表、明细各自维持一套不同的视觉和交互规则。
- 点击单据主表或明细对象后如果下半区会缩短或留白，优先检查上下 pane 的高度分配和容器 `flex/min-h/h-full` 关系，而不是继续往空白里塞占位块。
### 2026-03-22 单据主表流式布局
- 当用户明确要求单据主表“不再自由拖动、改成和条件区一样的流式布局”时，不能继续在自由坐标系统上修补；应直接把布局模型改成按行、按顺序、可插入的工作面。
- 对流式工作台，拖到另一个控件前方的预期不是交换位置，也不是只改坐标；应该实现插入重排，让目标控件和其后续控件自动顺延。
### 2026-03-22 单据主表行工作台补充
- 单据主表这类高频排布区，一旦用户要求“和条件区一样的流式布局”，就不要再保留旧的自由坐标拖拽入口；布局模型和交互模型必须一起切换。
- 流式排布里的拖放预期是“插入”而不是“覆盖”或“交换”，拖到某个控件前面时，目标及后续控件都要主动后移一位。
- 流式工作台里若保留横向溢出能力，默认可见滚动条会被用户误判成多余灰线；应保留滚动能力，但隐藏滚动条本身。
### 2026-03-22 基础档案条件插入式拖放
- 当用户已经确认单据主表使用“拖到前面即插入、目标自动后移”的语义后，基础档案顶部条件区必须同步成同一套拖放规则，不能一个区域是插入式，另一个区域还是按行追加。
- 条件区这类按行 workbench 的拖放状态，不能只记录“当前行”；要同时记录“当前行 + 前插目标控件”，否则落点只能到行尾，做不出真正的前插重排。
### 2026-03-22 条件区拖放语义对齐
- 只要用户已经确认某个高频排布区使用“前插即后移”的拖放语义，其它同类型 workbench 也要同步对齐，不能让基础档案条件区和单据主表出现两套不同的排序规则。
### 2026-03-22 基础档案明细模块右侧详情
- 当用户明确要求“基础档案点击明细模块，右侧详情参照某张历史表结构”时，不能继续沿用当前最小化配置分支；要回到历史数据模型，把右侧检查器按目标表的字段口径重建。
- 对“明细模块”这种频繁填写的右侧详情，不要保留大段解释、视觉说明或概念性排版；优先保证字段直给、结构清楚、填写顺手。
- shadcn 化不等于继续叠加说明卡片；这种场景更适合用共享的 shadcn inspector 骨架，直接组织输入项和开关。
- 新增右侧检查器分支时，必须在浏览器里验证“真实点击入口”已经切到该分支；如果入口还落在旧分支，再完整的表单也等于不可用。
### 2026-03-22 明细页签与内部视图职责分流
- 当用户说“明细页签可以配一部分，里面控件也可以配一部分”时，优先检查是不是把“页签对象”和“内部视图对象”共用了同一个选中态；这类问题的根因通常不是单个表单太乱，而是选中模型没有拆层。
- 底部类型切换属于“视图切换”，不应该默认等于“右侧详情切换”。只有用户真正点击到表格区域、图表预留区这类内部视图对象时，右侧才应该切到对应详情。
- 图表视图的右侧配置不要重复承载数据来源、表格摘要、颜色/右键入口等整表级信息；图表面板只保留 `p_systemdlltabchart` 本身需要的字段，其余信息留在明细表配置里。
## 2026-03-23 Document Split And Group Workbench
- If both upper and lower panes are high-frequency work areas, do not keep a draggable divider by default; use a stable equal split so clicks in the lower area do not feel like the layout is collapsing.
- Width resizing in high-frequency workbenches must share one implementation path: live preview, requestAnimationFrame throttling, and snap/tick feedback. Mixed resize patterns are immediately noticeable to users.
- When a user asks for alignment guidance while resizing, a pixel HUD alone is not enough; expose snap tick cues so micro-adjustment feels intentional.
- If archive main-table layout already has a grouping concept, do not keep it as one oversized detail form. Promote it to a master-detail workbench where users choose a group, then edit row count and grouped fields inside that group.
- Right-side inspectors inside narrow panels should prefer vertical flow over wide two-column grids; breakpoint-driven desktop grids break down quickly in non-fullscreen configuration screens.

## 2026-03-23 Detail Tab Unified Inspector
- If the user says all detail configuration should be handled inside the tab, do not keep a separate detail-tab form and detail-grid form in parallel. Use one inspector model and pull tab-level fields into it.
- For archive detail tabs, selecting the tab itself should already enter the same configuration path as the current detail view; bottom view clicks should refine the current view, not switch users into a different conceptual object.
- When a table detail is described as basically inheriting main-table behavior, preserve the same table-grade tabs and capabilities instead of inventing a reduced detail-specific inspector.

## 2026-03-23 Settings Inspector Density Refresh
- When users complain that the settings UI feels empty or bloated on 1080p screens, do not keep optimizing one inspector branch at a time. Flatten the shared shell first: panel radius, shadow, padding, tab density, input height, and card nesting.
- Perceived whitespace in workbench-style screens often comes from repeated rounded wrapper layers, not only from literal empty gaps. Removing low-value cloud cards and summary chips usually improves clarity more than shrinking individual fields.
- Dense admin/workbench screens should move technical mapping hints and counts into compact badge rows or header metadata instead of dedicated mini cards, so the editable form fields remain the visual focus.
- Central canvas surfaces and right-side inspectors must be tightened together. If only the right inspector becomes dense while the center still uses large cloudy shells, the whole screen still reads as loose and inconsistent.

## 2026-03-27 Single Table Table Edge Tightening
- 表格区域“看起来还有一圈窄边距”时，不能只盯外层容器 padding；还要检查表格本体自己的宽度策略、壳层边框和圆角。哪怕外层贴边了，如果表格仍按内容宽度渲染或保留 wrapper border，视觉上还是会像留了一圈边距。

## 2026-03-23 Archive Main Layout Popup Workbench
- If the user says the right inspector should only show summary information, do not leave the real layout editor embedded in that narrow side panel. Move dense layout editing into a dedicated popup workbench and keep the inspector read-oriented.
- For archive main-table grouping, the draggable source must be the real main-table columns. Do not invent a second synthetic field source, or the user loses trust in what is actually being laid out.
- Group layout editing should follow the same interaction language as other high-frequency workbenches: group list on one side, selected-group rows in the middle, draggable field palette on the other side, with direct row assignment and insert-style drag/drop.

## 2026-03-23 Archive Layout Canvas Workbench
- If the user says the popup still feels too much like master-detail form editing, treat that as a structural correction, not a styling nit. Replace the “select one group, edit one group” flow with an all-groups canvas workbench.
- Layout editors must account for tall controls such as remarks/textareas. Do not assume every field is a single-line chip; field cards should be able to visually occupy more height so spacing and grouping still make sense.
- For dense 1080p workbenches, shadcn-style polish should reduce ceremony, not add it. Fewer side lists and fewer redundant wrappers usually improve layout editing more than adding more summary panels.
## 2026-03-23 Archive Layout Canvas Polish
- Archive layout canvases are not summary cards. If the user is judging spacing and dragging placement, field items must look like real controls, not mini info cards with badges and extra chrome.
- High-frequency width dragging must render from live drag state first and persist second. If the canvas only reflects committed width, users will read the interaction as sticky even when the math is correct.
- Row numbering or leading sequence labels inside layout editors and previews create false spacing cues. When users are arranging fields visually, prefer clean separators or no row label at all.
- Archive layout rows also cannot be oversized containers. In form-layout workbenches, rows should read as light flow lanes; only tall controls should grow, not the entire row shell.
## 2026-03-23 Archive Layout Lane Density
- In layout editors, do not use large bordered row cards as the default visual container. Users judge spacing and drag placement by the row lane itself, so oversized wrappers immediately make the editor feel empty and clumsy.
- Tall controls such as remarks/textareas must grow independently. A tall control should not force every sibling in the same row to stretch to the same height.
- The preview modal must mirror the editor density. If the editor is compact but the preview still uses big grouped cards, users will still perceive the layout system as bloated.

## 2026-03-23 Archive Layout Resize Feedback
- In layout editors, a top-of-screen resize HUD is the wrong feedback for width tuning. Users compare current control edges with nearby controls, so resize guidance should live inside the lane where alignment is being judged.
- For row-based form canvases, width drag guides should prefer previous-row boundary references over abstract tick rulers. That makes alignment decisions match how people visually compare labels and controls.
- Flat control shells are more useful than translucent rounded wrappers when spacing judgment matters. Extra wrapper chrome makes gaps look larger and hides whether controls are truly aligned.

## 2026-03-23 Archive Layout Delete And Alignment Guides
- In layout editors, per-control close buttons should not be mixed into every field shell when bulk selection/delete is the intended editing model. Extra close affordances add noise and make drag targets harder to judge.
- Previous-row alignment feedback must be obvious enough to use while dragging. Subtle tick marks are not sufficient; prefer full-height lane guides plus a stronger active edge guide for the dragged control.

## 2026-03-23 Table Canvas Panel Centering
- When a table workbench includes an internal “click canvas to configure table” panel, do not bind that panel to the summed column widths. Column width feedback belongs to the header row and horizontal scroll area, not to the canvas card itself.
- If both main-table and detail-table builders expose the same canvas interaction, keep them on one shared centered-panel presentation. Fixing only one branch will leave the product feeling visually inconsistent.

## 2026-03-23 Workspace Scrollbar Styling
- If the codebase already uses helper names like `custom-scrollbar`, verify the CSS definition actually exists. An undefined scrollbar helper silently falls back to the browser default and makes the UI look unfinished.
- For workbench-heavy screens, visible scrollbar styling should be unified globally, while `scrollbar-none` stays the explicit opt-out. Styling one panel at a time is fragile and still leaves inconsistent native scrollbars in other high-frequency areas.

## 2026-03-23 Table Header Compactness
- When users complain that narrow columns still look empty, inspect header padding and selection chrome before touching minimum width constants. The wasted space is often inside the header button, not in the width data itself.
- Column selection in dense table builders should use compact emphasis, such as a light inset border plus a small label chip. Large padded selection backgrounds force unnecessary whitespace into 70px-class narrow columns.

## 2026-03-23 Condition Control Preview Minimalism
- Condition bars should not reuse text-heavy field preview rendering by default. If the field name is already shown outside the control, putting placeholder or sample text inside the control makes the UI look duplicated and noisy.
- When only condition previews need to change, add a condition-specific render mode instead of weakening every `filter` preview globally. That keeps layout previews informative while letting condition controls stay visually clean.

## 2026-03-23 Archive Layout Blue Alignment Markers
- Previous-row width guides in layout editors should not stay neutral gray once users are actively using them for alignment. When the guides carry alignment meaning, use the same clear blue accent language as the active edge so the relationship reads immediately.
- If a guide is meant to show top/bottom correspondence, plain dashed lines are too weak. Add distinct endpoints or caps so the guide reads like a full alignment reference, not a leftover separator.
## 2026-03-23 项目切换与残留进程排查
- 当用户说“已经换了项目，但 VSCode / 运行结果看起来还是旧项目”时，不要只检查当前工作目录；还要同时检查旧仓库的 dev 进程是否仍占用默认端口。
- 对 Vite + 本地 API 这类双进程项目，切换仓库后必须同时核对三件事：当前会话路径、VSCode 打开的工作区、3000/3001 等常用端口实际归属的进程命令行。
- 如果当前仓库首次启动报 `vite` / `tsx` 不存在，优先确认 `node_modules` 是否缺失，而不是误判为脚本配置错误。
- 清理旧项目残留进程后，要重新启动当前仓库并直接验证前端首页和健康检查接口，避免只看“进程存在”就误判为切换完成。

## 2026-03-23 Java 后端联调与 AI 代理分流
- 当前端同时依赖 Java 业务后端和本地 AI 代理时，不要把所有 `/api/*` 一股脑代理到同一个目标；应先用 Swagger 核对接口归属，再按 `/api/ai/*` 和其他业务接口分流。
- 如果业务接口已迁到本地 Java 后端，默认 `VITE_API_BASE_URL`、`.env.example` 和 README 也要一起更新；只改 Vite 代理而保留旧默认地址，下一次重启仍会连回旧环境。
- 联调验证不能只看首页能打开。至少要同时验证一个无鉴权业务接口和一个 AI 健康检查接口，确认两条代理链路都实际生效。
- 如果公司列表已通但员工列表接口仍超时或报错，应明确标记为后端环境阻塞，而不是在前端继续堆兜底逻辑掩盖接口问题。
## 2026-03-23 Resize Preview Commit Split
- In hot workbench resizing, the key optimization is not changing drag libraries; it is separating live preview from committed business state. If drag math is correct but every mousemove still rewrites the full column array, users will still read the interaction as sticky.
- Verification for resize smoothness should compare two signals at once: the canvas/header width must change during drag, while the inspector width input should stay on the old committed value until mouseup. That proves preview and commit are actually decoupled.
- When starting to modularize a giant dashboard file, split the hottest interaction path first into a feature module. Pulling resize state and preview scheduling out of the monolith is a safer first enterprise-style refactor than trying to explode the whole screen in one pass.

## 2026-03-23 Shadcn UI Baseline First
- When users explicitly require shadcn/ui and Tailwind consistency, do not keep patching old glass or material-icon branches in place. Establish the base primitives first: `cn()`, minimal shadcn UI components, and shared designer class helpers.
- In a mixed legacy screen, unify the exact branches the user can currently see before expanding scope. For this workbench, the visible condition bar and detail workspace mattered more than untouched legacy modals.
- For detail tab workspaces, keep the tab strip, empty state, and canvas shell on the same visual language. If only one of those three is migrated, the screen still reads as inconsistent.

## 2026-03-23 Compact SaaS Condition Bar
- When users say the previous overall style was fine and only the draggable controls needed work, do not keep pushing a full shell redesign. Narrow the scope back to the drag controls and their immediate container.
- High-frequency condition bars should default to SaaS-style compactness: minimal outer framing, almost no explanatory copy, and controls that read as filters first, cards second.
- If a design pass introduces bigger borders, extra titles, and explanatory paragraphs into a query bar, that is usually the wrong direction for admin/workbench UI. In dense business screens, the right move is often subtraction rather than more polish.

## 2026-03-23 Tab Restore And No Shell Border
- When a user asks for tabs to go back to the previous style, do not interpret that as “make them smaller.” In workbench screens, “previous style” often means stronger active-state recognition and clearer hierarchy, not less UI.
- Any dark or primary-filled tab/background must default to white text. Relying on inherited foreground colors is too fragile once tab styles are adjusted repeatedly.
- For drag-heavy workspaces, the outer region should not look like a card if the user wants to “directly drag layout.” Keep the control items themselves styled, but remove the surrounding shell border/background chrome first.

## 2026-03-23 Final UI Corrections Need Literal Reading
- When users enumerate UI issues line by line, do not keep inferring “style direction.” Apply the literal corrections first: remove the exact extra elements they named.
- Resize HUDs and tick rulers are easy to over-justify, but if users want a plain workbench they should disappear from the visible UI even if the resize math stays intact.
- If a tab is already color-filled, any non-white active text is a readability bug. Treat that as a correctness issue, not a design preference.
- In drag-first workbenches, visible handle glyphs are optional. If the whole control is draggable and users say the dots are noisy, remove them.

## 2026-03-23 Condition Bar Action Contrast And Density
- In dense workbench toolbars, every primary-filled control must explicitly enforce white text. Relying on shared button variants is too fragile once local styling changes start layering on top.
- Empty condition controls should not fake sophistication with gray placeholder bars. If users want a high-end enterprise feel, the better choice is a clean empty shell with only the minimum iconography needed.
- Horizontal spacing in condition rows must be tuned against the real data-entry canvas, not left at default gaps. Even a `gap-3` row can read as wasteful once controls are already compact.

## 2026-03-23 Condition Control Whitespace Is Mostly Label And Resize Reserve
- When a condition control still looks loose after border and gap cleanup, inspect fixed label width and text alignment before touching outer width. A right-aligned 42px-plus label slot creates obvious dead air in front of short field names.
- Large `pr-*` values combined with a wide absolute resize handle make the control tail look empty even when the resize affordance is visually subtle. Keep the resize hot zone small enough that it does not read like reserved blank layout.
- Top filter bars and row workbench controls must share the same density rules. Tightening only one branch leaves the screen feeling inconsistent and users will continue to perceive the overall control system as too loose.

## 2026-03-23 Top Filter Density Needs Width Rebalancing, Not Just Padding Cuts
- If a top filter label starts truncating after whitespace reductions, do not simply widen the label slot in isolation. Rebalance total control width and label width together so the label can finish while the control body still shortens.
- In compact filter bars, width formulas are product decisions. A `+24` style buffer may look harmless in code but becomes obvious tail slack when the control preview itself is intentionally empty.
- When users complain about the second control looking too far away, treat it as a total-width issue first. Internal preview emptiness and inter-item gap both matter, but overshooting control width is usually the dominant reason the row reads stretched.

## 2026-03-23 Top Filter Needs Content-Driven Labels
- If users still say “no change” after numeric density tweaks, the top filter label should stop depending on a tiny fixed-width slot. Let short and medium field names size to content up to a sane cap.
- For empty-shell condition previews, shrinking the preview body is more effective than endlessly trimming label padding. The tail of the control is what visually pushes the next control too far away.
- When only the top filter row is wrong, isolate it. Reusing the same width formula as the lower workbench can keep reintroducing the same stretched feel in the visible header strip.

## 2026-03-23 Verify The Actual Visible Branch Before Tuning Widths
- In this screen there are multiple condition-like rows with similar markup. Before changing width formulas, confirm whether the user is looking at `document-filter-*` or `condition-item-*`; otherwise a visually correct patch can land on the wrong branch and appear to have no effect.
- Accessibility snapshots and DOM class names are the fastest way to disambiguate duplicated UI patterns. If the rendered node class is `condition-item-label-*`, keep all spacing work inside the condition workbench branch instead of the top filter helper.

## 2026-03-23 Native HTML Drag Is The Wrong Fit For Visible Sortable Controls
- If users need the control to visibly follow the cursor during reordering, native HTML5 `draggable` is the wrong baseline. Its ghost image and browser-managed behavior make the UI feel detached and sticky.
- For a dense sortable workbench, drag feedback belongs inside the page: mirror element, insertion cue, and stable spacing. If those matter, isolate that branch and move it to a page-level drag system instead of stacking more fixes on top of `onDragStart/onDrop`.
- Resize handles on compact controls should sit on the border edge, not inside the content box. Internal resize affordances read as wasted padding before they read as interaction.
## 2026-03-23 Fix The Exact Business Branch Before Polishing
- When the user explicitly says “重点看看基础档案的条件”, stop broad visual tuning and isolate that exact branch first. Improvements on similar-looking rows elsewhere still count as a miss if the visible business area does not change.
- In dense workbenches, “间距太大” usually means the combined result of item gap, trailing resize reserve, and drag affordance padding. Treat those three as one density problem instead of tuning only a single class.
## 2026-03-23 Resize Can Be Broken Even After Sort Drag Is Fixed
- Fixing reorder drag with `dnd-kit` does not mean width resize is solved. For workbench controls, verify resize separately with a real mousemove check; drag sorting and border resize are two different interaction chains.
- If a resize handle sits inside a draggable item, explicitly exclude that handle from drag activation. Otherwise users will grab the border expecting width changes and instead trigger item dragging.
- Never cap the rendered control width far below the configured resize max. A hidden visual cap makes resize feel dead even when the state math is still running underneath.

## 2026-03-23 Condition Resize Must Stretch The Inner Preview Too
- When users say the resize feels abrupt even after the outer shell follows the cursor, inspect the inner preview width classes before touching drag math again. A fixed preview slot can make a correct resize still look broken.
- In compact condition controls, the rendered width is the combination of label slot and preview slot. If only the container width grows while the preview remains fixed, users will read the extra area as wasted blank space.
- For `condition` mode previews, prefer letting the preview shell consume the remaining width derived from the active resize state. Rebuilding the preview component is usually unnecessary if its internal root already uses `w-full`.

## 2026-03-23 Drag Overlay Can Be Visually Wrong Even If Sorting Works
- If users say the dragged control floats to one side of the cursor, do not keep tuning spacing or activation distance first. Measure the actual pointer position against the rendered drag mirror and verify whether the overlay anchor is wrong.
- In dense horizontal workbenches, a `DragOverlay` with fixed positioning can still feel detached inside complex shells. If the mirror anchor is off, prefer moving the dragged item itself with `dnd-kit` transform so the cursor and control stay visually attached.
- When the user asks “是不是用的 dnd-kit”, answer concretely from the code and package state. For this branch, that means checking `@dnd-kit/core` plus the actual `DndContext/useDraggable` path, not guessing from behavior.
## 2026-03-24 Cross-Row Drag Can Accidentally Apply Scale
- In `dnd-kit` workbenches, do not assume the drag transform is only translation. When the active drop target is a full-width row lane, `scaleX/scaleY` can appear in the transform and make the dragged control suddenly balloon.
- If a dragged item becomes huge or seems to vanish only when crossing rows, inspect the live transform matrix first. A row-sized scale factor can create both symptoms at once.
- For compact business controls, the safer default is to render drag movement with translate-only styling unless scaling is intentionally designed. That keeps cross-row movement stable and avoids giant row-width drag mirrors.
## 2026-03-24 Cross-Row Visibility Is A Separate Problem From Scale
- Fixing cross-row scaling does not guarantee the dragged control stays visible. If users still say “dragging downward disappears,” inspect ancestor overflow clipping after the transform has already been corrected.
- In row workbenches, `overflow-x-auto` is risky for drag interactions because it can effectively clip vertical overflow while the item is being translated into another row. Keep drag lanes visually scrollable only if the dragged element itself is no longer clipped by that lane.
- When users ask to make main-table and detail configuration “use the same style and effect as conditions,” treat that as a system-consistency request, not a local styling nit. Confirm whether those branches are still using native HTML5 drag before claiming the interaction language is unified.

## 2026-03-24 Drag Hit Area, Main Form Parity And Detail UI Subtraction
- When a user says a condition control can only be dragged from the leading text, treat that as a hit-area bug, not a styling preference. The whole control body should be draggable, and only the explicit resize strip should keep width-drag ownership.
- If the user says the bill head controls must be “exactly the same” as the archive condition controls, do not settle for visual similarity. Reuse the same compact workbench language and interaction pattern instead of maintaining a second near-match branch.
- For archive detail configuration screens, “too ugly / too flashy / too many unnecessary elements” means the fix is subtraction first: remove redundant badges, summary cards, decorative rails, and explanatory chrome before adding any new styling.
## 2026-03-24 Memo Hoisting Can Break Runtime Before Type Check Notices
- In a giant function component, moving a `useMemo` earlier can trigger Temporal Dead Zone failures if the memoized code calls helpers backed by later `const` declarations. `tsc` and `vite build` can still pass while the page crashes at runtime.
- For shared numeric helpers such as `clampValue`, prefer module-level function declarations before introducing early memoized derivations. That removes initialization-order risk and keeps later refactors safer.
- After any performance refactor that reorders derivations, verify the real page in a browser. Static build success is not enough for this file.
## 2026-03-27 Lazy Module 500 Often Means Source Or Dependency Breakage
- 如果 Vite 在浏览器里报 `Failed to fetch dynamically imported module`，不要先把它当成路由或后端问题。先直接检查对应懒加载 TSX 文件本身能否被解析，再核对它引用的第三方包是否真的装在 `node_modules` 里。
- 懒加载分支的源码断裂和缺失依赖可以叠加出现：先修语法，再补依赖，再同时验证 `lint/build` 与 dev 模块 URL 是否返回 `200`，这样才能确认整条动态导入链恢复。

## 2026-03-25 Login Route Must Not Eagerly Import Dashboard
- When the login route and the dashboard route share one entry component, avoid statically importing the entire dashboard module at the top of `App.tsx`. A runtime failure anywhere in the dashboard dependency chain can blank the login page before it even gets a chance to render.
- Protected or heavyweight workbench branches should be lazy-loaded and wrapped with a local error boundary. That keeps public entry screens recoverable even when downstream module-setting code is unstable.
- A passing `vite build` does not prove the safe route is isolated. Real startup verification should include the unauthenticated path, not just the dashboard path.

## 2026-03-25 Backend Envelope Mismatch Can Crash The Login Route
- Before trusting a backend list endpoint as `T[]`, check the real payload shape. This backend returns `{ code, message, data }`, so treating the whole response as an array will blow up immediately on calls like `.find()` and `.map()`.
- Fix response-shape mismatches at the request layer first. Central envelope unwrapping in `http.ts` is safer and less repetitive than patching each screen one by one.
- Public entry screens should still keep lightweight `Array.isArray` guards around remote lists. Even with a normalized request layer, malformed or partially migrated endpoints should not be able to blank the whole page.

## 2026-03-25 Field Type Dropdown Must Follow Backend Options, Not Local Labels
- If the backend already exposes `fieldsqltag-options`, the inspector dropdown should display those option rows directly. Keeping a separate local `文本/数字/下拉框` list for one branch creates immediate inconsistency.
- For condition configuration, current type recovery must read `controltype/controlType` in addition to `fieldsqltag/fieldSqlTag`; otherwise the dropdown cannot correctly show the persisted selection.
- When both backend `showname` and local fallback labels exist, prefer the backend label first. Fallbacks should only cover missing or malformed option rows, not override valid server metadata.

## 2026-03-25 Detail Columns Can Already Be Loaded But Still Disappear At Render Time
- When a user says 明细列接口已经有值但界面没全显示, do not stop at the fetch branch. For this workbench, detail columns were already loaded from `single-table/modules/{dllCoId}/fields`; the loss happened later in the table-builder render filter.
- `MemoTableBuilder` falls back to `helpers.isRenderableColumn(column)` unless a branch explicitly passes `renderableColumns`. That generic rule currently hides `visible=false` and `width<=0`, which is correct for the main table but wrong for detail screens that must expose all backend fields.
- For branches that need to show every returned field, prefer passing explicit `renderableColumns` instead of weakening the shared global visibility rule. That keeps the fix scoped and avoids regressing the main table.

## 2026-03-25 Archive Layout Editor Needs Its Own Field Source
- If the user points at the archive layout editor's right-side field list, do not assume it should keep reusing `mainTableColumns`. That workbench has a dedicated backend source: `single-table/modules/{dllCoId}/designer-controls`.
- For layout-only field pools, keep the fetch and mapping inside `src/features/dashboard/module-settings` instead of pushing another special-case branch into `Dashboard.tsx`. The main page should only pass module-level coordination inputs such as `currentModuleCode` and toast handlers.
- When replacing the layout editor field source, prefer merging designer-control rows with existing main-table field metadata. That preserves preview/type behavior while still switching the source of truth for layout width, height, and palette membership.

## 2026-03-25 Archive Layout Groups Must Follow Designer Groups Too
- Once the layout editor field pool switches to `designer-controls`, do not leave the group canvas on the old front-end-only `currentDetailBoard.groups` assumption. The backend already exposes the matching group source through `single-table/modules/{dllCoId}/designer-groups`.
- `designer-groups` and `designer-controls` should be mapped with the same field identity strategy; otherwise the right-side palette and the group canvas will talk about different field IDs and drag assignment will drift.
- For this editor, the safest pattern is to load both sources together inside the module-settings feature and hydrate the editor state once on open. That keeps the modal internally consistent without turning the whole dashboard state tree into a special-case designer mode.

## 2026-03-25 Designer Group Fields Are Not Always The Real Membership Source
- When the user explicitly says “控件属于哪个分组是通过位置计算的”, stop trusting `designer-groups.fields` as the authoritative membership list. That service-level nesting may be a convenience view, but the real source of truth for layout editors can still be the separate `designer-layout` coordinate table.
- For Delphi-style layout data pulled via `select *`, treat group rectangles and control rectangles as separate datasets. Use `designer-groups` for the group boxes, `designer-layout` for placed controls, and derive membership from rectangle containment instead of assuming backend-attached children are correct.
- When a backend table is exposed as raw records, build field-name readers that tolerate historical casing and synonyms (`left/top/width/height`, `controlLeft/controlTop`, etc.). Otherwise the logic can look correct in code but silently produce empty groups at runtime.

## 2026-03-26 Single-Table Module Settings Must Be Gated By Menu Persistence
- In this wizard, “菜单信息已建好” is stronger than “当前在第 2 步点过保存”. The safe gate is whether a real menu node already exists and has a stable `menuId + purviewId/moduleCode`; otherwise users can jump from steps 3/4 into module settings with no durable module identity.
- If the single-table parent record may not exist yet, do not let every child loader (`fields/conditions/details/menus/colors`) race ahead and fail independently. Add one module-level ensure step first, then start the child-resource effects only after that record is ready.
- When a hook performs backend bootstrapping, avoid depending on unstable inline callbacks like a freshly recreated `showToast`. Either memoize the callback or keep it out of the effect dependency loop, or the bootstrap request can repeat unexpectedly.

## 2026-03-26 Single-Table Save Contract Is POST-Upsert Plus DELETE
- For this backend, do not keep assuming a REST-style split of `POST=create` and `PUT=update`. The real write contract is resource-level `POST` upsert: no `id` means create, with `id` means save/update, and deletion stays on `DELETE`.
- Once the user provides the real write contract, stop extrapolating missing interfaces from old controller reads or earlier assumptions. Save-plan analysis should immediately pivot to the user-confirmed contract, even if it differs from previous code reading.
- Under this contract, the front-end save orchestrator's main job is to classify each record into `create / update / delete`, not to choose among many HTTP verbs. Build the diff logic around record identity first, then map creates/updates to `POST(with/without id)` uniformly.

## 2026-03-26 Detail Save Target Depends On UnionModule
- For single-table detail resources, do not treat all detail columns/colors/menus as local detail data by default. The exact split must follow the user's latest interface mapping, not an earlier paraphrase.
- In the latest confirmed rule, detail columns, detail colors, and detail menus all move to the related module root when `UnionModule` is present, using the main-module `fields/colors/menus` endpoints with `dllCoId = UnionModule`.
- For branches the user re-explains with concrete endpoint lists, trust the explicit endpoint mapping over the earlier natural-language summary. Restating a rule loosely can easily drift from the real API contract.
- Chart config is a separate branch from detail columns/colors/menus. Even when a detail has `UnionModule`, chart save still belongs to the current detail unless the user explicitly redefines that rule.
- When the user says “先不管布局编辑器里的保存”, remove designer-layout from the current save scope instead of leaving it half-included in the plan. Partial inclusion is worse than explicit exclusion for a multi-resource save workflow.
## 2026-03-26 Merge Platform Entry Must Not Replace The Existing App Shell By Default
- If the active branch is still a single-entry login/workbench product, do not let a merge silently replace `src/App.tsx` with a multi-platform router. Preserve the current product entry unless the user explicitly asks to migrate routes.
- When a user reports the main page suddenly looks broken right after a merge, inspect the app entry and current browser path before touching component styles. A redirect from `/` to `/design` can look like a layout failure while the real issue is simply the wrong shell.
- Before treating post-merge `/api` 404s as a backend regression, clear duplicate local `vite` and `tsx watch` processes. Stale dev servers can keep serving old route behavior and make proxied API paths fall back to `index.html`, which masquerades as a code bug.

## 2026-03-26 Default Object Props Can Trigger Infinite Dashboard Effects
- In `Dashboard`, do not use an object literal like `routeContext = {}` as a function-parameter default when downstream effects depend on that value. A new object is created on every render, so any effect keyed by `[routeContext]` will rerun forever.
- If a page-level prop is optional but used as an effect dependency, default it to a module-level stable constant or normalize it with memoization before wiring effects to it.
- When the browser network panel shows the same menu endpoints looping with no user interaction, inspect top-level optional object props first. An unstable default prop can look like a state-flow bug even when the effect bodies themselves are correct.

## 2026-03-26 Module-Settings Effects Must Not Reload From Their Own Hydration State

## 2026-03-27 Persisted Detail Resources Must Diff By Identity Before Body Fingerprints
- If a detail color/menu row already has a real backend `id`, do not rely only on whole-collection body fingerprints to decide whether the resource changed. Object-shape drift between baseline and current state can still make the collection look different even when each persisted row is logically identical.
- For persisted collections, prefer matching rows by stable identity first and then comparing the actual backend save body. Body-fingerprint equality should stay as a fallback for rows that genuinely do not have stable keys yet.
- Apply the same identity-first rule both inside the per-row save helper and in the outer `changed` gate. If the outer gate still uses a weaker comparison, unchanged detail menus/colors can continue to enter the save branch and spam `POST` calls even though row-level bodies match.
- In the module-settings step, avoid wiring resource-loading effects to collection objects that the same effect hydrates, such as `detailTableConfigs` or `detailTableColumns`. If an effect fetches menus/colors and then immediately writes those collections back, using them as dependencies will create a fetch loop.
- When a loader only needs the latest helper callback or latest column snapshot during merge/capture, keep that value in a ref and read `ref.current` inside the effect. Do not let callback identity churn or large mutable collections decide whether the network request should run again.
- For related-module detail hydration, separate "when should we refetch" from "what helper logic do we use during this fetch". A callback like `resolveDetailModuleSnapshotByCode` can legitimately depend on many states, but those dependency changes should not automatically retrigger the parent detail-loading effect unless the fetch inputs themselves changed.

## 2026-03-26 UI Editors Must Follow The Backend Table Shape When The User Gives It Explicitly
- If the user provides the exact table structure for an editor page, stop preserving older front-end abstractions like `field/operator/value` just because they still "sort of work". The form should be realigned to the backend field model, not wrapped in a second invented rules vocabulary.
- For color rules, the authoritative editing model is the single-table color table fields (`condition`, `forcecolor`, `backcolor`, `useflag`, `dfcolor`, `dbcolor`, style flags, `fontsize`). Any extra UI-only fields such as `label`, `disabled`, `textColor`, or `backgroundColor` should be treated as compatibility/preview helpers, not the primary schema.
- When fixing schema drift in an editor, update all three layers together: default object builder, API-to-state mapper, and the editor component itself. Fixing only the form labels leaves newly created rows and loaded rows speaking different field dialects.

## 2026-03-26 Save Bodies Must Not Spread The Entire UI Edit Object
- When a save mapper starts with `...cloneValue(record)`, treat that as a red flag for schema drift. It almost guarantees UI-only fields (`name`, `type`, `width`, flags, helper IDs) will leak into backend POST bodies sooner or later.
- For pages where the user already gave the database structure, save mappers should be explicit allow-lists, not merge-based transforms. Build the POST body field by field from the backend schema and map UI aliases onto it deliberately.
- Be careful with precedence when the UI renames a field. In the condition editor, the editable label lived in `name`, but the persisted field was `controlLabel`; preferring the old backend field over the edited UI value silently discarded the user's change.

## 2026-03-26 For normalizePersistedValues Endpoints, Let Backend Defaults Own Relationship Keys
- If a backend save endpoint simply feeds the request through `normalizePersistedValues(tableName, body, columnLookup)`, the front end should send only the raw database columns it truly wants to persist. Do not also spread the whole editor object "just in case".
- For tables that generate relationship keys server-side, avoid synthesizing those keys from front-end temp IDs. In the single-table detail editor, sending a guessed `tabkey` from a temporary tab/form ID was more dangerous than omitting it and letting the backend apply its default module form key.
- The same rule applies to generated field identifiers. If `fieldkey` is missing for a newly added field, do not fall back to unrelated UI state like `formKey`; leave it blank and let the backend create the canonical key.

## 2026-03-26 React Vendor Chunk Matching Must Be Exact
- In `vite.config.ts`, never classify the React runtime chunk with a broad rule like `id.includes('react')`. That will accidentally catch packages such as `react-rnd` or `lucide-react`, and Rollup can split them into a `react-vendor` chunk that later depends back on `vendor`.
- When a production bundle throws `Cannot read properties of undefined (reading 'memo')` from a vendor chunk, inspect the built chunk import graph before touching app code. A `vendor <-> react-vendor` cycle can leave React exports uninitialized even though `vite build` succeeds.
- For manual chunking, match only the real runtime packages (`react`, `react-dom`, `scheduler`) using normalized `node_modules` paths. Everything else in the React ecosystem should stay in its own explicit bucket or fall back to `vendor`.

## 2026-03-26 Save Orchestrators Should Not Upsert Baseline-Identical Rows
- A save orchestrator that blindly `POST`s every current row is only half-finished, even if the backend supports upsert. Users will immediately notice unchanged resources still hitting write endpoints, and that noise makes later save debugging much harder.
- For resources that already keep an entry baseline, compare the normalized POST body against the baseline body before writing. If they are identical, reuse the baseline row locally and skip the network request.
- When building diff-by-body logic, define a stable identity key first (`id`, then durable business key like `fieldKey`). Without a stable match key, a harmless reorder or remap can look like a delete-and-recreate of every row.
- Do not stop after fixing just one resource branch if the save orchestrator still uses the same unconditional-upsert pattern elsewhere. Once a user reports “nothing changed but save still posts”, audit the whole save path in the current page and convert the repeated resource loops together.
## 2026-03-26 Existing AI Endpoints Must Follow The Same Auth Contract
- Once the backend confirms `/api/ai/*` uses the existing login system, do not patch only the single button the user just reported. Audit every currently wired AI request in the shared client and bring them onto the same auth-aware request layer together.
- In this project, the safest default is to route AI calls through `apiRequest(..., { auth: true })`, so `Authorization: Bearer <accessToken>` stays consistent with the rest of the app and the proxy/response unwrapping behavior does not diverge.
- When the user provides explicit curl samples for health, survey, SQL draft, translate, and create-table, treat that as the canonical contract. Any remaining raw `fetch('/api/ai/...')` calls are debt to remove, not harmless variation.

## 2026-03-26 AI Contract Changes Must Update Proxy Configuration Too
- When the user confirms that `/api/ai/*` has moved onto the main Java backend, do not stop after updating frontend request headers. Audit the dev proxy and IIS reverse-proxy rules too, or the browser can still hit a stale sidecar target and mask the real fix.
- A direct `curl` to `9093` succeeding while the browser path `3000/api/ai/*` returns `500` is a strong sign of stale proxy routing, not necessarily an application bug. Check `vite.config.ts`, `public/web.config`, and recent proxy error logs before touching request payloads.
- In this repo, `ECONNREFUSED 127.0.0.1:3001` inside `.codex-dev.log` is a concrete signature that `/api/ai/*` is still being sent to the deprecated local AI server. Treat that as a routing bug first.

## 2026-03-26 Main-Field Save Mappers Must Prefer The Current UI Alias Over Stale Backend Mirrors
- When a field row simultaneously carries UI-editable aliases (`name`, `sourceField`, `placeholder`, `defaultValue`) and hydrated backend mirrors (`displayName`, `fieldName`, `promptText`, `defaultDate`), save mappers must prefer the current UI alias first. Otherwise users can edit the form and still post the old hydrated value back.
- This class of bug is subtle because the save request still succeeds; the signal is "I changed the column property but it didn't save" even though a `POST /fields` happened.
- For the single-table main-field table, the safe precedence is to map `name -> username1`, `sourceField -> fieldname/sysname`, `placeholder -> prompttext`, and `defaultValue -> defaultdate` before falling back to older backend aliases.

## 2026-03-26 Shared UnionModule Save Diff Needs One Consistent Representative Baseline
- When multiple detail tabs point at the same `UnionModule`, do not let one tab provide the current rows while another tab provides the baseline rows. That mismatch makes unchanged shared menus/colors look like a full rewrite on save.
- Aggregate one representative snapshot per related module and keep its current rows and baseline rows together. A practical rule is "prefer the active detail tab; otherwise prefer the snapshot with the richest field/menu/color data".
- If a save bug shows many `menus` writes after editing an unrelated column, inspect the shared-module aggregation first. The body mapper may be fine while the representative baseline selection is wrong.

## 2026-03-26 Main Field Save Must Follow p_systemwordbooktab Raw Columns
- For single-table main fields, do not keep diffing and saving against invented aliases like `isvisible`, `isreadonly`, `isquery`, `prompttext`, or `helptext` once the user has given the real table structure. The persisted contract belongs to `p_systemwordbooktab`, so the save body should use raw columns such as `vislble`, `edit`, `tagid`, `ifSearch`, `bak`, `fieldsql`, `InputHintText`, and `dataAlign`.
- Fix the read side and write side together. If the loader reads one alias family but the saver writes another, users will see either false "unchanged" comparisons or successful requests that still do not reflect the edited value after reload.
- When a user says "the column property did not save" and no `fields` request fires, first check whether that property actually maps to a legacy DB column name instead of assuming the diff logic itself is wrong.

## 2026-03-26 Popup Menu Diff Needs Stable Persisted IDs Before Weak Business Keys
- For right-click menus, always preserve the backend `id`/`backendId` when normalizing fetched rows. If a persisted row falls back to a temporary front-end ID, unchanged rows can be mistaken for creates during save.
- A fallback identity built only from `tab + menuName + dllName` is too weak for legacy menu rows. Include additional stable fields like `menuid`, `action`, and `actiontype` before trusting the comparison.
- When a save path unexpectedly writes many `menus` rows after an unrelated field edit, inspect menu normalization first. The actual issue may be lost persisted IDs rather than the save loop itself.

## 2026-03-27 Resource Collections Need A Whole-Collection Equality Gate Before Row-Level Upsert
- For legacy editors with shared resources (`UnionModule` colors/menus, detail decorations, main-table menus), row-level identity matching is not enough on its own. If the whole collection's backend-field bodies are unchanged, short-circuit the entire save branch before attempting per-row upsert.
- This collection-level equality gate is especially valuable when rows are normalized through UI-specific adapters. Even if some temporary IDs or derived display fields drift, unchanged backend payloads should not trigger a write.
- Color rule save mappers must stay on an explicit backend-field allow-list. Reintroducing `...cloneValue(record)` into a color body will make collection equality noisy again and can resurrect false `colors` writes after unrelated edits.

## 2026-03-27 Detail Resource Saves Need A Branch-Level No-Op Gate Before Shared Aggregation
- When a user reports that saving a main-field change still writes many detail `menus/colors`, do not stop at the generic diff helper. Check whether unchanged detail tabs are still entering the shared/local save branch before diffing even starts.
- For detail resources, add the no-op check at the detail-branch level: compare the baseline and current collections using the exact backend save body for that branch, and skip aggregation entirely when nothing changed.
- This is especially important for `UnionModule` details. If unchanged detail tabs are still aggregated into the shared-module map, later collection-level diffing may still execute repeated writes or deletes because the branch itself should never have been entered.

## 2026-03-27 Detail Save Branches Must Diff Columns, Colors, And Menus Independently
- After a branch-level gate is in place, do not assume that entering the branch means every resource inside it should be saved. A user can change only a column while colors and menus remain untouched.
- For single-table detail saves, compute `columnsChanged`, `colorsChanged`, and `menusChanged` separately for both local-detail resources and `UnionModule` shared resources. Then call only the corresponding write and delete APIs for the resources that actually changed.
- This prevents a still-dirty column collection from dragging unrelated `colors/menus` into `POST` calls, even if those subordinate resources compare cleanly.

## 2026-03-27 Detail Color And Menu Diff Must Canonicalize Through The Same Mapper First
- Legacy detail editors often hold the same backend row in multiple front-end shapes: freshly fetched DTO shape, normalized inspector shape, and in-memory edited shape. Comparing those raw objects directly is noisy even if the persisted fields are unchanged.
- Before diffing detail `colors/menus` or `UnionModule` shared `colors/menus`, run both baseline and current arrays back through the same normalization mapper (`mapColorRule`, `mapContextMenuItem`) and only then build the backend save body.
- If a user can paste a request payload that matches the backend row by eye but the app still posts it, that is a strong sign the compare step is being fed mismatched UI object shapes rather than real business-field changes.

## 2026-03-27 UnionModule Relation Changes Must Not Imply Shared Resource Writes
- In the single-table detail flow, changing or normalizing the `UnionModule` relation is part of saving the detail record itself. It is not evidence that the related module's fields, colors, or menus were edited.
- Do not include `unionModuleChanged` as a reason to enter the shared-resource save branch. Otherwise a harmless relation normalization can still trigger unrelated `POST /colors` and `POST /menus` for the referenced module.
- Shared resource writes should be driven only by shared resource body differences, not by the mere fact that a detail points at that module.

## 2026-03-27 Shared UnionModule Resources Need The Same Authoritative Baseline Fallback As Local Detail Resources
- Fixing local detail `colors/menus` diff is not enough when the same data can also be saved through the `UnionModule` shared-resource branch. If only the local branch uses an authoritative backend re-read, unchanged shared menus/colors can still be posted from stale in-memory baselines.
- For shared module resources with persisted rows, re-read the authoritative module `colors/menus` before writing whenever the normalized compare says they changed. If the freshly fetched backend rows are equivalent to the current UI state, treat the branch as unchanged and skip `POST`.
- When a user keeps pasting the exact same `menus/colors` payload with a real `id`, assume the remaining bug is "shared baseline drift" before inventing more compare heuristics.

## 2026-03-27 Save-Time Verification Should Reuse Already-Loaded Detail Decoration Snapshots Before Hitting The Network
- Once the editor has already loaded a detail tab's `menus/colors` or a related module's shared `menus/colors`, saving should reuse that in-memory snapshot as the first authoritative baseline. A save button that always re-fetches the same decoration data feels broken to users even if no write occurs.
- Keep two small caches: one keyed by `moduleCode` for shared `UnionModule` decorations, and one keyed by `moduleCode:detailId` for local detail decorations. Save-time diff verification can read these caches before deciding whether a network `GET` is needed.
- Only fall back to live `fetchSingleTableDetailMenus/Colors` or `fetchSingleTableModuleMenus/Colors` when the cache is absent. That preserves correctness without showing needless post-save reads in normal flows.

## 2026-03-27 Survey Main First-Load Query Should Not Overfit Assumed Filters
- When the user corrects the survey first-load query rule multiple times, do not keep layering new filters (`departmentId`, then entry `id`) onto the list request. Step back and align to the actual current contract.
- In this module, the current requirement is simpler: `GET /api/survey/mains` with no query parameters, then take the first row. `departmentId` still belongs to create/save defaults, but not to the initial list query.
- If a feature prop is introduced only to satisfy a guessed query filter and the user later removes that filter, delete the prop chain instead of leaving dead context threaded through the workbench.

## 2026-03-28 Survey Main Schema Changes Must Update Read And Save Mappers Together
- When the backend adds canonical main-table fields for research records, such as `title` or `project`, do not patch only the query side or only the save side. The main DTO, load mapper, save mapper, and save-success rehydration must be updated together.
- For this workbench, backend `title/project` should be wired directly into the existing overview fields that users edit, rather than leaving the UI on old defaults and silently dropping the new values on save.

## 2026-03-28 Loaded Survey Records Must Preserve Persisted IDs Across List And Detail Reads
- If the page first discovers a survey record from `GET /api/survey/mains` and then fetches the full row from `GET /api/survey/mains/{id}`, do not assume the second payload always repeats the same `id` field. Preserve the persisted id from the list row as a fallback, or the editor can display existing data but still save as a create.
- Apply the same rule to detail ids and to mixed `number/string` legacy ids. Diff, hydrate, and delete logic should compare ids by normalized identity, not by a narrow numeric-only filter.
- When a legacy API may serialize the primary key as `ID` or `Id`, normalize that casing at the API adapter boundary instead of hoping each page remembers to read all variants. Otherwise the same persisted row can look like “loaded but no id” in one screen and “has id” in another.

## 2026-03-28 Explicitly Added Child Rows Must Not Be Dropped Just Because They Are Still Blank
- In editors where users can manually add child rows, do not reuse a pure “has meaningful content” filter as the only save gate. A user-added blank row is still an intentional row and should usually be persisted, or at minimum preserved through save.
- Keep a small explicit-persist flag on newly added rows when the product expects “新增明细” to create real child records under the parent, even before the user fills every field.

## 2026-03-28 After Batch-Saving Child Rows, Reload The Whole Child Collection
- When a parent page can save multiple child rows in one action, do not stop at stitching together the per-row save responses. The authoritative post-save state is the full child list under that parent, so reload it and rehydrate from the collection endpoint.
- This is especially important when the backend may assign defaults, reorder rows, merge payloads, or return partial DTOs from save endpoints. A collection re-read after save is more reliable than guessing from local optimistic state.

## 2026-03-28 Legacy Detail DTOs Need Full Field-Name Normalization, Not Just ID Normalization
- When a legacy detail API returns database-style column names like `billno`, `mid`, `modulename`, `moduleid`, `Position1`, or `Working_rate1`, normalizing only the primary key is not enough. The adapter must map the whole row into the front-end field vocabulary or the form will save successfully but re-render blank.
- Put that mapping in the shared API adapter layer so list read, single-row read, and save-response hydration all agree on the same canonical detail shape.

## 2026-03-28 Legacy Main DTOs Need The Same Full Field-Name Normalization And Semantic Mapping
- For research-record main rows, do not stop after wiring `title/project`. Legacy responses can still use column names like `departid`, `surveydate`, `Address`, `ordernum`, `empnames`, `Positionsbak`, `operatedate`, and `operatorname`.
- Normalize those names in the shared survey adapter, and keep the UI-to-backend semantic mapping explicit: `surveyUsers` belongs to the “调研工程师” field, while `operatorName/operateDate` belong to the output-confirmation signer/date fields.

## 2026-03-28 Survey Main Form Fields Must Follow Backend Semantics, Not Convenient Fallbacks
- When a main form shows both “调研工程师” and “输出确认签字人”, do not fill both from the same `surveyUsers` source just because it makes old records look less empty. That creates silent write-back drift.
- In this workbench, `surveyUsers` should own the overview engineer field, while `operatorName/operateDate` should own the output-confirmation signer/date. Any fallback between them must stay clearly secondary and only for backward compatibility during read.

## 2026-03-28 Department Pickers Must Persist Backend IDs, Not Just Display Names
- If the backend contract says a department field stores `Departmentid`, do not keep the UI on a plain text box that only edits `departmentName`. A page that displays the right label but drops the foreign key will drift on save and reload.
- For this research-record workbench, treat the department search result as a pair: show `departmentname`, persist `Departmentid`, and when the main row reloads with only `departid`, resolve the label from the department source before rendering.

## 2026-03-28 Search-Backed Department Fields Must Not Sneak In Login Defaults
- Once a department field is changed to a real search picker, do not keep preselecting the login department id or the current menu name as a silent default. That makes the screen look filled even when the user never chose a department.
- In this research-record workbench, a new record should leave “调研部门” empty until the user selects one, while existing records may still hydrate from the saved `departid`.

## 2026-03-27 Preview And Export Should Share One Research Word Template Source
- When the user asks for Word export to match the right-side preview “一比一”, do not keep two separately maintained template trees and try to visually sync them by hand. That always drifts.
- In the research-record module, the durable fix is to extract one shared page builder and one shared CSS source, then let both the browser preview and the `.doc` export consume that same template.
- This does not guarantee Microsoft Word’s rendering engine matches the browser pixel-for-pixel, but it removes the self-inflicted drift where preview and export already disagree before Word gets involved.

## 2026-03-27 Export Fidelity Must Not Regress The Existing Preview
- If the user says the right-side preview was changed by an export-fidelity refactor, stop optimizing the export path first and restore the preview. The visible in-app preview is the product surface; it must not regress just to make export plumbing cleaner.
- In this research-record module, “shared template” is only acceptable if it preserves the original preview layout exactly. Once the user notices style drift, the safer approach is to restore the preview component and make the export template follow it.
- For Word exports, border visibility is a separate compatibility problem. Solve it with Word-friendly table attributes/inline border styles instead of changing the preview DOM/CSS just to satisfy Office rendering quirks.
