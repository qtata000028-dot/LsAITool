# 团队协作说明

本项目当前使用 GitHub 进行协作开发，主仓库地址：

- https://github.com/qtata000028-dot/LsAITool

## 基本规则

- `main` 仅保留稳定可用代码，不直接堆叠多人日常开发改动。
- 每个需求或每位同事都使用独立分支开发，分支名建议使用 `codex/功能名`。
- 改动完成后通过 Pull Request 合并到 `main`。
- 合并前至少自行检查一遍受影响页面和基础构建。
- 如果改动涉及 `src/components/Dashboard.tsx` 或 `src/features/dashboard/**`，提交前必须先阅读并遵守：
  - [docs/dashboard-architecture-rules.md](/Users/apple/Desktop/未命名文件夹/LsSmartTool/LsAITool/docs/dashboard-architecture-rules.md)

## 标准流程

1. 切到主分支并同步最新代码

```powershell
git checkout main
git pull origin main
```

2. 创建自己的开发分支

```powershell
git checkout -b codex/你的功能名
```

3. 本地开发并自测

```powershell
npm install
npm run dev
npm run lint
npm run build
```

4. 提交代码

```powershell
git add .
git commit -m "feat: 你的改动说明"
```

5. 首次推送分支

```powershell
git push -u origin codex/你的功能名
```

6. 在 GitHub 发起 Pull Request，目标分支选择 `main`

## 提交信息建议

- `feat:` 新功能
- `fix:` 修复问题
- `refactor:` 重构
- `style:` 样式调整
- `docs:` 文档更新
- `chore:` 工具或配置变更

示例：

- `feat: 优化模块配置全屏布局`
- `fix: 修复登录页机构下拉框圆角样式`
- `docs: 增加团队协作说明`

## 冲突处理

如果你的分支开发时间较长，在提交前先同步主分支：

```powershell
git checkout main
git pull origin main
git checkout codex/你的功能名
git rebase main
```

如果出现冲突，先手动处理冲突文件，再继续：

```powershell
git add .
git rebase --continue
```

## 合并前检查

- 页面能正常打开
- 关键操作链路可用
- 中文文案无乱码
- `npm run lint` 通过
- `npm run build` 通过
- 未把 `node_modules`、`dist`、日志或本地密钥提交进仓库
- Dashboard 相关改动没有把新功能重新堆回入口文件，符合 [docs/dashboard-architecture-rules.md](/Users/apple/Desktop/未命名文件夹/LsSmartTool/LsAITool/docs/dashboard-architecture-rules.md)

## 当前建议分工方式

- `codex/登录页优化`
- `codex/模块配置优化`
- `codex/明细页签优化`

如果多人同时开发同一模块，建议继续拆更细的分支名称，避免在同一文件同一区块频繁冲突。

## 在 Codex 里怎么操作

Codex 更适合你直接下达明确任务，让它在当前仓库里改代码、运行命令、提交变更。

常见操作方式如下：

### 1. 让 Codex 直接改功能

你可以直接说：

- `把登录页按钮改成蓝绿色渐变，并保持中文不变`
- `修复模块配置全屏后底部错位的问题，并提交到当前分支`
- `检查 Dashboard.tsx 有没有乱码并修掉`

### 2. 让 Codex 帮你走 Git 流程

你可以直接说：

- `基于 main 创建分支 codex/登录页优化`
- `把我当前改动提交一下，提交信息写 feat: 优化登录页样式`
- `推送当前分支到 GitHub`
- `同步 main 到我当前分支`

### 3. 推荐的 Codex 协作节奏

1. 先告诉 Codex 要改什么
2. 改完后让 Codex 运行 `lint` 和 `build`
3. 确认页面效果
4. 让 Codex 提交并推送分支
5. 去 GitHub 发 Pull Request

### 4. 你对 Codex 最常用的几句话

- `先拉最新 main，再建一个新分支开始改`
- `只改这个页面，不要动别的模块`
- `改完跑一下 lint 和 build`
- `把这次改动提交并推送`
- `先帮我看看这个问题出在哪，不要急着改`

### 5. 什么时候不要直接让 Codex 推 main

以下情况建议先走分支再发 PR：

- 有同事也在同时开发
- 改动超过一个页面
- 涉及布局、表单、模块配置等核心区域
- 你还没最终确认效果

如果只是非常小的文案修正或文档修正，可以按团队习惯决定是否直接进 `main`。
