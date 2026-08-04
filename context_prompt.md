# 元引擎 项目上下文

## 项目概述
元引擎（yuanqidong）是一个基于 Tauri v2 + Vite 构建的 macOS 桌面应用，位于 `/Users/sean/Documents/元引擎/`。核心功能：输入概念 → 管线检索 → LLM 生成五层认知框架（一瞥/全景地图/发展脉络/深层结构/前瞻推演）。

## 技术栈
- 前端：Vite + Vanilla JS，单文件构建到 `dist/index.html`（~782KB）
- 后端：Tauri v2（Rust），withGlobalTauri: true
- LLM：智谱 GLM-4-Plus（open.bigmodel.cn）
- API 调用路径：`window.__TAURI__.core.invoke`

## 管线架构（v25 — DeepSeek 搜索引擎）

四层降级管线（v24.1）已废弃。当前采用 **DeepSeek 搜索引擎** 作为主要数据源，方案如下：

```
输入概念
  ↓
DeepSeek 搜索 → 联网检索获取事实来源
  ↓ 有结果
LLM 基于搜索摘要生成五层认知框架
  ↓ 无可靠结果
语义拆解 → 仅输出核心定义，不杜撰
```

### 关键函数（当前有效）
- `callLLMStream(prompt, onChunk, onDone, systemPromptOverride)` — 流式调用智谱 GLM-4-Plus
- 防幻觉核心原则：系统可不知道，但严禁瞎编；允许在正确内容上做衍生（总结、类比、通俗解说），禁止杜撰来源中不存在的人名/年份/数据/事件

## DeepSeek 搜索引擎接入

- DeepSeek 提供联网搜索能力，由 LLM 发起检索并返回事实摘要
- 替代了原 v24.1 的四层降级管线（维基 → 搜索 → 语义拆解）
- v24.1 关键函数（`runV24PreGenerate`、`fetchZhWikiExact`、`proxyFetch` 等）已废弃

## 数据源可用性

| 数据源 | 状态 |
|--------|------|
| DeepSeek 搜索引擎 | ✅ 当前主数据源 |
| 中文维基 | ❌ GFW 拦截，已放弃直连 |
| 英文维基 | ❌ 同上 |
| CF Worker（yuan-wiki） | ❌ workers.dev 子域名本地被 GFW 拦截 |
| 百度百科 | ❌ 反爬验证码 |
| SearXNG 公网实例 | ❌ 全部离线 |
| DuckDuckGo | ❌ 中文质量差 |
| 快懂百科 / 360百科 | 未接入（管线已切换到 DeepSeek） |

## 构建命令

```bash
# 前端构建
cd /Users/sean/Documents/元引擎 && npm run build

# Rust 构建
cd /Users/sean/Documents/元引擎/src-tauri && cargo build

# 完整打包（.app）
cd /Users/sean/Documents/元引擎 && npx tauri build
# 产物：src-tauri/target/release/bundle/macos/元引擎.app

# 替换 app 二进制
cp src-tauri/target/release/yuanqidong 元引擎.app/Contents/MacOS/yuanqidong
```

## 当前阻塞

1. **自动化输入失败**：osascript/pyautogui 无法向 Tauri WKWebView 注入键盘输入，只能手动测试
2. **DeepSeek 搜索质量待评估**：需验证中文概念覆盖率与事实准确性，尤其是冷门/小众领域

## 待办

- [ ] 系统性评测 DeepSeek 搜索在不同类型概念下的生成质量（热门/冷门/作品/人物/理论等）
- [ ] 恢复自动化测试能力（解决 WKWebView 输入注入问题）
- [ ] 设计交叉验证置信度模型（多数据源一致性打分，如 DeepSeek 未来接入多源搜索时可用）
