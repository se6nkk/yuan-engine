# 交付报告：变更单-25 重建 SearXNG 多引擎搜索

## 状态
已完成，git commit `e92f961`

## 变更清单

### 1. SearXNG 实例池更新
- **文件**：`index.html` ~L1595
- **变更**：替换为变更单指定的 5 个实例
  - `https://searx.be`
  - `https://search.sapti.me`
  - `https://searx.space`
  - `https://northboot.xyz`
  - `https://search.rhscz.eu`
- **localStorage key** 从 `searxng_instances` 改为 `searxng_instances_v2`，避免旧实例缓存干扰

### 2. trySearXNG 函数升级
- **文件**：`index.html` ~L1608
- **变更**：
  - 新增第三参数 `engine`，通过 `&engines=xxx` 指定搜索引擎
  - 超时从 4s → 10s（符合变更单要求）
  - 失败冷却保持 60s

### 3. searchWebSources 重建
- **文件**：`index.html` ~L1625
- **变更**：
  - 引擎配置从 `site:` 过滤改为 SearXNG 原生 `engines` 参数
  - 四引擎：`wikipedia`(中文源) / `baidu`(中文源) / `bing`(Web源) / `google`(Web源)
  - 返回 `{ zhref, web, snippets }`：zhref=中文源有结果，web=Web源有结果
  - 收集前 2 条摘要（每条截取 200 字符）注入 AI 上下文
  - 实例失败自动跳过，不阻断主流程

### 4. buildSystemPrompt 搜索上下文注入
- **文件**：`index.html` ~L481
- **变更**：
  - 函数签名 `buildSystemPrompt(concept)` → `buildSystemPrompt(concept, searchResults)`
  - 若 searchResults 含 snippets，在 system prompt 末尾追加参考信息
  - 格式：`[1] 摘要1\n[2] 摘要2...`，提示 AI「结合参考但不要直接复制」

### 5. callLLM 透传搜索结果
- **文件**：`index.html` ~L745
- **变更**：
  - 函数签名 `callLLM(concept)` → `callLLM(concept, searchResults)`
  - 将 searchResults 透传至 `buildSystemPrompt(concept, searchResults)`
  - `generateSub` 中的 `callLLM(term)` 调用无需修改（searchResults 为 undefined 时自动跳过）

### 6. startGenerate 集成搜索步骤
- **文件**：`index.html` ~L813
- **变更**：
  - 在缓存检查后、LLM 调用前插入 `searchWebSources(concept)`
  - 进度条：20%「正在搜索相关资源...」→ 30%「AI 正在生成认知框架...」
  - 搜索结果不写入 IndexedDB 缓存（符合变更单要求）

## 验收步骤
1. 打开应用，输入一个概念（如「量子计算」）
2. 观察进度条显示「正在搜索相关资源...」
3. 确认不因 SearXNG 实例不可用而阻断生成流程
4. 生成的框架内容应包含搜索参考的信息（非直接复制）
5. 缓存命中时不触发搜索（直接秒开）

## 技术说明
- 搜索全流程异步，所有 catch 不阻断主流程
- SearXNG 实例不可用时 60s 冷却，避免频繁重试
- 搜索结果仅作为 AI 生成的参考上下文，不持久化存储
- `generateSub` 子框架生成不触发搜索（避免不必要的网络请求）
