# 交付报告：变更单-42 / 43 / 44

**交付人**：小T (Trae)
**交付时间**：2026-07-29
**分支**：feature/layout-pagination

---

## 变更单-42：后三层可视化升级 — prompt 格式模板 + CardGrid + 放射图

### 完成项

| Part | 内容 | 状态 |
|------|------|------|
| Part 1 | 模块7/9/12/13 prompt 添加格式模板 + CACHE_VERSION v6→v7 | ✅ |
| Part 2 | 新增 `generateCardGridHTML(raw, variant)` 支持 issue/scenario/lesson/tool 四种 variant | ✅ |
| Part 3 | 新增 `generateRadialDOM(concept, terms)` 放射图（模块10核心概念索引） | ✅ |
| Part 4 | `renderResult` 分发逻辑增加 5 个新分支（模块7/9/10/12/13） | ✅ |
| Part 5 | CSS 新增卡片网格 + 放射图 + 窄屏降级 + 流式预览样式 | ✅ |

### 关键实现细节

- **prompt 格式模板**：模块7/9/12/13 各自添加了格式要求和示例，确保 LLM 输出可被正则解析
- **CardGrid**：四种 variant 分别使用不同正则匹配，兜底返回 `marked.parse(raw)`
- **lesson variant**：支持 localStorage 勾选记忆（key: `lesson_{concept}_{index}`）
- **放射图**：中心概念圆 + 8 个外围节点均匀分布 + SVG 连线 + 窄屏降级为列表
- **glossary 包裹**：模块10改为放射图后，glossary 替换逻辑仅在非放射图模式下生效

---

## 变更单-43：生成流程优化 — 并行搜索 + 流式预览

### 完成项

| Part | 内容 | 状态 |
|------|------|------|
| Part 1 | `searchWebSources` 从串行改为 `Promise.allSettled` 并行 | ✅ |
| Part 1 | `trySearXNG` 超时 10s→5s | ✅ |
| Part 2 | 新增 `callLLMStream(concept, searchResults, onChunk)` 流式调用 | ✅ |
| Part 2 | `startGenerate` 接入流式预览 DOM | ✅ |
| Part 3 | 进度条文本：`正在搜索相关资源...` → `并行搜索资源中...` | ✅ |

### 关键实现细节

- **并行搜索**：一次性发出所有实例×引擎组合的请求，`Promise.allSettled` 等全部返回
- **流式预览**：使用 ReadableStream reader + TextDecoder 解析 SSE 格式，实时更新 DOM
- **流式预览容器**：`#streamPreview` 在进度条下方，流结束后自动隐藏

---

## 变更单-44：Reader 页顶标题显示词条名称

### 完成项

| 内容 | 状态 |
|------|------|
| `<h2>` 从层级名称改为词条名称（`data.concept`） | ✅ |
| 新增 `<div class="layer-subtitle">` 显示层级名称 | ✅ |
| CSS 新增 `.layer-subtitle` 样式 | ✅ |

---

## 验收检查

- [x] JS 语法检查通过（`new Function(allJs)` 无异常）
- [x] git commit 已提交（2 次：42+43 合并提交，44 单独提交）
- [x] 变更单已归档至 `archived/`
- [x] pending 目录已清空

---

## 备注

- CACHE_VERSION 已从 v6 升至 v7，旧缓存将自动失效重新生成
- `callLLM` 原函数保留未删除，子概念生成（L1300 附近）仍使用非流式调用
- 模块10 放射图需要 glossary 数据，如果 LLM 未输出术语则放射图为空（仅显示中心圆）
