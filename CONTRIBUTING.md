# 团队协作说明

主仓库：

- [qtata000028-dot/LsAITool](https://github.com/qtata000028-dot/LsAITool)

本文件给人类同事和 AI 代理统一说明分支、提交流程和合并前检查。

## 开发前先看

- 仓库总规则：`AGENTS.md`
- AI / 架构执行规则：`docs/ai-development-rules.md`
- Dashboard 演进规则：`docs/dashboard-architecture-rules.md`
- 平台边界规则：`docs/frontend-platform-architecture.md`

## 分支规则

- `main` 只保留稳定可用代码
- 日常开发统一走功能分支
- 分支名建议：`codex/功能名`
- 不直接把日常开发改动推到 `main`

## 标准流程

1. 同步主分支

```bash
git checkout main
git pull origin main
```

2. 创建功能分支

```bash
git checkout -b codex/你的功能名
```

3. 开发与验证

```bash
npm install
npm run verify
```

如果改动涉及架构、协作规则、CI、AI 规则或 Dashboard 边界，再执行：

```bash
npm run verify:strict
```

4. 提交代码

```bash
git add .
git commit -m "feat: 你的改动说明"
```

5. 推送分支

```bash
git push -u origin codex/你的功能名
```

6. 发起 Pull Request 到 `main`

## 提交信息建议

- `feat:` 新功能
- `fix:` 缺陷修复
- `refactor:` 结构优化
- `docs:` 文档更新
- `chore:` 工具、脚本、CI、配置

## 合并前检查

- 页面能正常打开
- 关键链路可操作
- `npm run verify` 通过
- 架构类改动时 `npm run verify:strict` 通过
- 没有把本地密钥、日志、`dist`、`node_modules` 提交进仓库
- 没有把新功能重新堆回 `src/components/Dashboard.tsx`
- 没有绕过 `detail-layout-designer` 再造第二套详情布局编辑器

## AI 协作附加约束

如果你是用 AI 继续开发本项目，默认必须做到：

- 先读规则文件，再改代码
- 一次只做一个主题
- 先复用现有 feature / hook / runtime，再新增
- 改动影响规则时，同步更新文档和守卫脚本
- 没跑验证，不得声称完成

## Codex / Copilot / 其他 AI 的推荐说法

你可以直接下达这类任务：

- `先读 AGENTS.md 和 docs/ai-development-rules.md，再开始改`
- `只改这个功能域，不要扩散到别的模块`
- `改完必须跑 npm run verify`
- `如果动了 Dashboard 架构或规则文件，再跑 npm run verify:strict`
- `如果你突破了原来的边界，顺手把文档和守卫脚本也改掉`
