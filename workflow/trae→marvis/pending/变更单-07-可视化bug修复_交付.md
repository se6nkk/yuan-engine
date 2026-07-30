---
status: delivered
task: 变更单-07-可视化bug修复.md
from: 小T (Trae)
to: 小马 (Marvis)
date: 2026-07-27
---

# 变更单交付：可视化模块 Bug 修复

## 执行内容

### 变更 A：CSS 选择器修复 — 发展脉络

| 位置 | 改动 |
|------|------|
| `.module-timeline .module-content p` | 选择器追加 `, .module-timeline .module-content li` |
| `.module-timeline .module-content p::before` | 选择器追加 `, .module-timeline .module-content li::before` |

修复：LLM 输出列表时 marked.js 渲染为 `<li>`，原 CSS 仅匹配 `<p>` 导致时间轴样式不生效。

### 变更 B：CSS 重构 — 领域分类树状图

| 位置 | 改动 |
|------|------|
| `.module-tree .module-content ul` | 选择器改为 `.module-tree .module-content p, .module-tree .module-content ul`，新增 `margin-bottom: 0.4rem` |
| `.module-tree .module-content li::before` | 选择器改为 `.module-tree .module-content p::before, .module-tree .module-content li::before` |

修复：LLM 输出段落时 marked.js 渲染为 `<p>`，原 CSS 仅匹配 `<ul>` 导致树状引导线不显示。

### 变更 C：JS 渲染逻辑重写 — 三模块各自渲染

**策略变更**：从「先 marked.parse → 再 DOM 解析」改为「按模块类型各自渲染」。

| 模块 | 旧逻辑 | 新逻辑 |
|------|--------|--------|
| 领域分类 | marked.parse 后加 class | 按行分割原始 markdown，去 `**` 后用 `marked.parseInline` 逐行生成 `<p>` |
| 发展脉络 | marked.parse 后加 class | marked.parse 正常渲染（CSS 已支持 li） |
| 常见误区 | marked.parse → DOM 解析 → textContent 匹配 | 直接解析原始 markdown 文本，用正则提取 ❌/✅/💡 三段，`marked.parseInline` 渲染 |
| 默认/其他 | marked.parse | marked.parse（不变） |
| 核心概念索引(mod.id='8') | marked.parse → glossary 替换 | 同左（不变） |

**误区模块关键改进**：
- 旧：在 marked 渲染后的 HTML DOM 上用 `textContent` 匹配 emoji，`<strong>` 等嵌套标签导致匹配失败
- 新：直接在原始 markdown 文本上用正则 `split(/(?=❌\s*错误认知)/m)` 分段，再分别提取三段内容
- 兜底：正则未匹配时退回 `marked.parse(raw)` 确保不白屏

## 涉及文件

- `index.html`（CSS 选择器扩展 + JS 渲染逻辑重写约 60 行）

## 验收条件对照

- [x] 领域分类：树状引导线支持 `<p>` 和 `<ul/li>` 两种输出
- [x] 发展脉络：时间轴竖线+圆点支持 `<p>` 和 `<li>` 两种输出
- [x] 常见误区：从原始 markdown 正则解析，不再依赖 marked 后 DOM 解析，左右分栏正常
- [x] 兜底：误区正则未匹配时退回 marked 渲染，不会白屏
