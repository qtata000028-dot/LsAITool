## [ERR-20260320-001] docx-extraction-tooling

**Logged**: 2026-03-20T00:00:00+08:00
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
本机没有可直接用于 DOCX 提取的 `python`、`py` 或 `pandoc`，导致按常规文档处理链路读取 `.docx` 失败。

### Error
```text
python --version -> exit code 1
py --version -> command not found
pandoc --version -> command not found
```

### Context
- 任务：读取旧系统表结构 Word 文档并整理表映射
- 输入：`朗速详细设计平台V2-表结构设计文档.docx`
- 环境：Windows PowerShell

### Suggested Fix
优先使用系统自带 `tar` 解包 DOCX，再用 PowerShell `XmlReader` 流式读取 `word/document.xml`。这个方案不依赖 Python 或 Pandoc，适合当前机器。

### Metadata
- Reproducible: yes
- Related Files: docs/legacy-schema-map.md

---
