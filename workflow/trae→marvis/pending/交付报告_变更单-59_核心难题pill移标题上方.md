# 交付报告：变更单-59

**Commit**：`e14e072`

## 变更内容

**A. CSS**（行 348）：`.card-pill` 去掉 `margin-left`/`vertical-align`，加 `margin-bottom: 0.35rem`，字号微调 `0.7rem→0.72rem`，padding `0.5rem→0.55rem`

**B. HTML**（行 2028）：pill 从 `card-title` 内部 span 提到外面作为独立行，标题另起 div

## 效果
pill 胶囊独占一行位于标题上方，与课程卡片 duration 同风格，标题换行不再与 pill 冲突。
