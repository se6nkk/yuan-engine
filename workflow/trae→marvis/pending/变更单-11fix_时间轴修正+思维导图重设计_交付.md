---
status: delivered
from: 小T (Trae)
to: 小马 (Marvis)
date: 2026-07-28
change_order: 11fix
---

# 变更单-11fix 交付报告：时间轴修正 + 思维导图重设计

## 执行摘要

全部 3 项变更（A1/A2/B）已执行完毕。时间轴从交替布局改为左日期/右事件布局；思维导图完全重写，修正连接点坐标和对比度问题。

## 执行内容

### 变更A1：CSS — 时间轴左日期/右事件 ✅

- 竖线从 `left: 50%` 改为固定 `left: 120px`，删除 `transform: translateX(-50%)`
- 删除 `.tl-item.left` / `.tl-item.right` / `.tl-item.left::after` / `.tl-item.right::after`（交替布局相关）
- 新增 `.tl-item` 使用 `display: flex` 布局
- `.tl-date`：固定宽度 100px，右对齐，圆点通过 `::after` 定位于右边缘 -7px 处
- `.tl-event`：`padding-left: 1.4rem`，`flex: 1`

### 变更A2：JS — generateTimelineHTML 去除交替逻辑 ✅

- 删除 `i % 2 === 0 ? 'left' : 'right'` 交替分配
- 每行统一生成 `<div class="tl-item"><div class="tl-date">...<div class="tl-event">...`
- 无法解析的行输出空日期 + 纯事件文本
- 变更单中的 `esc()` 统一为项目已有的 `escXml()`

### 变更B：generateMindmapSVG 完全重写 ✅

- 修正根节点 Y 坐标：预计算 `totalH` 后取 `rootY = totalH/2 - rootH/2`，根节点精确垂直居中
- 修正连接线起点：从根节点右边缘中心 `rootX + rootW, rootCY` 发出，贝塞尔控制点对称 `cpX = rootX + rootW + l1Gap/2`
- 子节点文字颜色从 `#555` 改为 `#333`（高对比度），字号从 12px 提升到 13px
- 子节点前新增 4px 彩色圆点标记（`<circle>`）
- 二级连接线从贝塞尔曲线改为直线（`<line>`，更清晰）
- 一级分类字号从 13px 提升到 15px，字重从 600 提升到 700
- 根节点从 100×40 放大到 110×48，圆角从 20 改为 24

## 残留验证

| 检查项 | 状态 |
|----------|------|
| `.tl-item.left` / `.tl-item.right` | 无残留 |
| `catY * 0.3` 错误坐标 | 无残留 |
| `fill="#555"` 低对比度颜色 | 无残留 |

## 验收条件对照

| 条件 | 状态 |
|------|------|
| 竖线在左侧 120px 位置 | ✅ |
| 年份全在竖线左侧（右对齐），事件全在右侧 | ✅ |
| 圆点精确落在竖线上（`::after` right: -7px） | ✅ |
| 无交替布局 | ✅ |
| 根节点垂直居中，连接线从右边缘中心发出 | ✅ |
| 一级标题与连接线末端精确对齐 | ✅ |
| 子节点文字 `#333`，13px，4px 彩色圆点 | ✅ |
