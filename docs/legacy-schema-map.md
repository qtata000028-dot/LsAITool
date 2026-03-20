# 朗速详细设计平台 V2 表结构映射

源文档：
`E:\日常程序\微信\wechat File\xwechat_files\wxid_9htys9sllfcy22_4c66\msg\file\2026-03\朗速详细设计平台V2-表结构设计文档.docx`

提取时间：
2026-03-20

用途：
- 作为当前前端配置器补入口、补占位、补数据库联动时的旧系统表结构索引
- 后续用户按“模块”描述需求时，优先从这里定位相关表，再决定前端配置区、AI SQL、后端代理和真实数据接入位置

## 总览

文档当前可稳定抽出的模块分为 4 类：
- 登录与账套
- 功能树与模块菜单
- 单表模块
- 单据模块

文档中没有看到独立完整的“报表模块表结构”章节，当前先以前三类为主。

## 登录与账套

### `LS_AccountTab`
- 作用：客户配置账套 / 登录时选择账套
- 备注：文档标注“放到 CRM 服务器”
- 已确认字段样例：
  - `accId`: ID
  - `accName`: 账套名称

## 功能树与模块菜单

### `p_systemtab`
- 作用：账套级项目 / 客户根节点
- 备注：`clientname` 作为功能树根节点

### `p_subsystemtab`
- 作用：子系统节点
- 说明：作为功能树二级节点，可启停，修改后回写本表

### `p_formmenuconfigtab`
- 作用：功能菜单 / 模块菜单
- 说明：作为三级、四级节点，可启停，修改后回写本表
- 文档关键信息：
  - 关联 `p_subsystemtab.subsysid`
  - `modtype`：1=单表，2=单据，3=报表
  - `dllfilename`：模板 dll 名

## 单表模块

### 核心主表

### `p_systemdlltab`
- 作用：单表模块主配置
- 关键字段：
  - `DllID`: 主键
  - `DllCoid`: 模块编号
  - `ToolsName`: 模块中文名
  - `SQL`: 主表 SQL
  - `SQLDT1`: 主表名
  - `dllType`: 1=左树右表，2=左表右表，3=单表
  - `formKey`: 模块配置关联值
  - `condKey`: 模块条件关联值
  - `printSQL` / `printSQL1` / `printSQL2`
  - `basePrintSQL` / `basePrintSQL1` / `basePrintSQL2`
  - `newWFVer`: 新流程标记
  - `auditDetail`: 明细审核
  - `refreshDetail`: 明细刷新
  - `selectLeaf`: 选择末级树结构
  - `TreeTableExpand`
  - `MainModuleCodeField`: 主模块编号对应字段名
  - `detailPageAlign`: 明细页签停靠

### 表单 / 字段

### `p_systemwordbooktab`
- 作用：单表表单字段配置
- 说明：
  - 所属模块编码
  - 关联 `p_systemdlltab.dllcoid`
  - 关联 `p_systemdlltab.formkey`

### `p_systemwordbookgrid`
- 作用：左侧表格字段配置
- 说明：
  - 关联 `p_systemwordbooktab.id`
  - 关联 `p_systemwordbooktab.fieldkey`

### 条件 / 颜色 / 右键 / 图表

### `p_systembillsourcecond`
- 作用：单表条件配置
- 说明：
  - 关联 `p_systemdlltab.dllid`
  - 关联 `p_systemdlltab.condkey`
- 复用场景：
  - 左边条件
  - 步骤条件

### `p_systempopupmenu`
- 作用：单表右键与辅助功能
- 说明：
  - 关联 `p_systemdlltab.dllcoid`
  - 右键类型 / 权限菜单 / 分组等也放在这里
- 复用场景：
  - 左边右键
  - 明细右键
  - 单据辅助功能
  - 来源右键
  - 流程步骤右键

### `p_systemwordbookcolor`
- 作用：颜色配置
- 复用场景：
  - 单表颜色
  - 左边颜色
  - 明细颜色
  - 来源颜色

### `p_systemdlltabchart`
- 作用：图表配置
- 复用场景：
  - 单表图表
  - 明细图表

### 卡片 / 明细 / 附加 / 流程

### `p_systemcardtab`
- 作用：主卡片设置

### `p_systemcarddetailtab`
- 作用：卡片详情设置

### `p_systemdlltabdetail`
- 作用：明细模块列表
- 关键说明：
  - 所属模块编号
  - 关联模块 `formkey`
  - 明细 SQL
  - 明细类别
  - 明细模块关键值
  - 关联模块号
  - 关联明细模块字段
  - 关联主模块字段

### `p_systemDlltabDetailGrid`
- 作用：明细模块字段
- 说明：
  - 关联 `p_systemdlltabdetail.id`
  - 关联 `p_systemdlltabdetail.formkey`

### `p_SystemdllTabAttach`
- 作用：附加模块
- 说明：
  - 关联 `p_systemdlltab.dllcoid`
  - 关联 `p_systemdlltab.formkey`

### `p_systemdlltabflow`
- 作用：流转步骤主配置

### `p_systemdlltabflowstepgrid`
- 作用：步骤信息

### `p_systemdlltabflowtype`
- 作用：流程小类 / 小类步骤

### `p_systembillauditAttach`
- 作用：流转附加

### `p_SystemDlltabDetailFlowTab`
- 作用：明细附加

## 单据模块

### 核心主表

### `p_systembilltype`
- 作用：单据模块主信息
- 关键字段：
  - `typecode` 类似模块编码
  - 模块名称 / 模块说明
  - 模块主表 / 模块明细表
  - 明细表 SQL
  - `billWidth` / `billHeight`
  - 单据修改条件
  - 模块配置关联字段
  - 打印主 SQL / 明细 SQL
  - 新流程标记
  - 来源明细复选 / 明细复选

### `p_systembillinfo`
- 作用：单据主信息

### `p_systembilldetail`
- 作用：单据明细信息

### 来源相关

### `p_systembillsource`
- 作用：来源定义

### `p_systembillsourcegrid`
- 作用：来源主信息

### `p_systembillsourcecond`
- 作用：来源条件

### `p_sytembillsourcedetail`
- 作用：来源明细
- 备注：文档里表名存在拼写为 `sytem`

### `p_systembillsourcedetail`
- 作用：来源子明细

### 流程相关

### `p_systembillflow`
- 作用：流转步骤

### `p_systembillstepgrid`
- 作用：步骤信息

### `p_systembillflowtype`
- 作用：小类设置

### `p_systembillflowtypestep`
- 作用：小类流转步骤

## 共享复用表

以下表在多个模块里重复出现，后续应优先抽成通用后端接口或统一前端配置器：

- `p_systempopupmenu`
  - 右键菜单 / 辅助功能 / 步骤右键 / 来源右键 / 明细右键
- `p_systembillsourcecond`
  - 单表条件 / 左侧条件 / 来源条件 / 步骤条件
- `p_systemwordbookcolor`
  - 单表颜色 / 左树颜色 / 明细颜色 / 来源颜色
- `p_systemdlltabchart`
  - 主模块图表 / 明细图表

## 当前前端改造建议

按你现在的配置向导方向，后面接数据库和真实接口时建议这样落：

1. 表格级配置
- 主 SQL
- 默认查询
- 表格类型
- 右键配置
- 图表配置入口

2. 列级配置
- `p_systemwordbooktab` / `p_systemDlltabDetailGrid` / `p_systembilldetail` 等字段映射
- 字段标识、中文名、类型、宽度、默认值、显示格式、联动 SQL

3. 条件级配置
- 统一以 `p_systembillsourcecond` 为抽象模型
- 后续再按单表 / 单据来源 / 流程步骤区分 `sourceId` 与 `tabKey`

4. 明细页签级配置
- 优先对应 `p_systemdlltabdetail`
- 再挂颜色、右键、图表、附加、流程

5. 单据模式
- 先以 `p_systembilltype + p_systembillinfo + p_systembilldetail` 为主骨架
- 来源、流程、右键、颜色全部作为附属区块挂载

## 后续使用方式

后面你直接给我这种描述即可：
- “改基础档案主表配置，参考单表模块”
- “补单据来源配置，按来源定义和来源主信息做”
- “把明细页签接到老表结构”
- “开始接真实数据库，先查 `p_systemdlltab` 和 `p_systemwordbooktab`”

我会优先按这份映射定位，再决定：
- 前端补哪个配置面板
- 后端先写哪个代理接口
- 数据库先查哪些表和字段
