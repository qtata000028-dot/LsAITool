# 团队协作说明

本项目当前使用 GitHub 进行协作开发，主仓库地址：

- https://github.com/qtata000028-dot/LsAITool

## 基本规则

- `main` 仅保留稳定可用代码，不直接堆叠多人日常开发改动。
- 每个需求或每位同事都使用独立分支开发，分支名建议使用 `codex/功能名`。
- 改动完成后通过 Pull Request 合并到 `main`。
- 合并前至少自行检查一遍受影响页面和基础构建。

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

## 当前建议分工方式

- `codex/登录页优化`
- `codex/模块配置优化`
- `codex/明细页签优化`

如果多人同时开发同一模块，建议继续拆更细的分支名称，避免在同一文件同一区块频繁冲突。
