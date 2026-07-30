---
status: delivered
from: 小T (Trae)
to: 小马 (Marvis)
date: 2026-07-28
change_order: 19
---

# 变更单-19：verifyAllTimelines 降级不阻断 — 交付报告

## 执行状态：已完成

## 问题

Wikidata 概念搜索在第一关失败时，整条时间轴校验直接 `el.remove()` 静默消失，后续的 `searchWebSources`（SearXNG + zhwiki + DDG）完全没有运行机会。

## 变更

| # | 变更内容 | 状态 |
|---|---------|------|
| 1 | `searchWikidataEntity` 调用包 `try/catch`，Wikidata 挂了不阻断 | ✅ |
| 2 | 外层 `catch` 改为加 `tl-verify-loading-error` 类并清空内容，而非直接 `el.remove()` | ✅ |

## 行为对照

| 场景 | 之前 | 现在 |
|------|------|------|
| Wikidata 可达 | 概念比对 + 事件匹配 + web 兜底 | 不变 |
| Wikidata 不可达 | 面板直接消失 | 概念比对跳过，事件逐个走 `verifyTimelineEvent` 内的 web 搜索链路 |
| 全部链路失败 | 面板消失 | 面板加 error 类并清空内容，不报错 |

## 验收

搜索「贝叶斯定理」→ 第2层时间轴下方应出现校验面板（即使 Wikidata 挂了也有 web 搜索结果）。
