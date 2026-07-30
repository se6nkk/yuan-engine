---
status: delivered
from: 小T (Trae)
to: 小马 (Marvis)
date: 2026-07-28
change_order: 14
---

# 变更单-14 交付报告：思维导图从 SVG 改为 CSS Flexbox

## 执行摘要

全部 3 项变更（1/2/3）已执行完毕。思维导图从 SVG 坐标计算改为纯 CSS Flexbox 布局，彻底消除跨浏览器对齐问题。

## 执行内容

### 变更1：CSS — 替换脑图样式 ✅

- 删除 `.module-mindmap .module-content svg` 样式
- 新增 54 行 Flexbox 样式：
  - `.mm-wrap`：外层 flex 容器
  - `.mm-root`：左侧紫色渐变根节点（100px 宽，圆角 14px）
  - `.mm-branches`：右侧分支区，`border-left: 2px` 灰色竖线
  - `.mm-branch`：每个分类行，`::before` 伪元素画 16px 横线连接到竖线
  - `.mm-cat`：分类标签（彩色背景 12% 透明度，圆角 6px）
  - `.mm-tag`：子项标签（彩色背景 6% 透明度 + 彩色边框 30% 透明度，圆角 12px）

### 变更2：JS — 替换 `generateMindmapSVG` → `generateMindmapHTML` ✅

- 删除 ~54 行 SVG 坐标计算代码（根节点居中、贝塞尔曲线、树形分支线等）
- 新增 `generateMindmapHTML` 函数（~25 行）：
  - `rgba()` 辅助函数：hex 转 rgba
  - 循环生成 `<div class="mm-branch">` + `<span class="mm-cat">` + `<span class="mm-tag">`
  - HTML 文本天然对齐，无坐标运算
  - 复用已有的 `escXml()` 函数（变更单中的 `esc()` 已统一为 `escXml()`）
- `escXml` 保留（`generateTimelineHTML` 仍依赖）

### 变更3：调用处替换 ✅

- `generateMindmapSVG` → `generateMindmapHTML`

## 残留验证

| 检查项 | 状态 |
|----------|------|
| `generateMindmapSVG` | 无残留 |
| `rootGrad`（SVG 渐变定义） | 无残留 |
| `viewBox`（SVG 属性） | 无残留 |

## 验收条件对照

| 条件 | 状态 |
|------|------|
| 左侧紫色根节点 | ✅ `.mm-root` 渐变背景 |
| 分类通过灰色横线连接到竖线 | ✅ `::before` 伪元素 |
| 分类标签有对应颜色 | ✅ 内联 style 动态颜色 |
| 子项圆角标签流式排列 | ✅ `flex-wrap: wrap` |
| 缩窄时自动换行无溢出 | ✅ `overflow-x: auto` |
