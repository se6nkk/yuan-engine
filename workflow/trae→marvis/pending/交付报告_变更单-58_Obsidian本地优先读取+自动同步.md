# 交付报告：变更单-58

**Commit**：`750d0a5`

## 变更内容

### A. 同步服务新增 GET 读接口
`workflow/obsidian_sync_server.py`：
- CORS Methods 改为 `GET, POST, OPTIONS`
- 新增 `do_GET` 方法，路径 `/concept?q=概念名`，读取 vault 中 `概念名-认知框架.md`

### B. 前端新增 Obsidian 读写逻辑
`index.html`：
- `syncToObsidian(concept, markdown)`：POST 到 `http://127.0.0.1:8765/save`
- `readFromObsidian(concept)`：GET `/concept?q=概念名`，返回 markdown 或 null

### C. startGenerate() 集成
- 缓存检查之后、搜索之前插入 Obsidian 检查：命中则直接渲染，跳过搜索+LLM
- 完整版缓存更新后调用 `syncToObsidian`（earlyRendered 路径 + 兜底路径）

## 验收
1. 启动同步服务：`python3 workflow/obsidian_sync_server.py &`
2. 首次搜索生成后，vault 目录出现 `概念名-认知框架.md`
3. 刷新重新搜索同一概念，直接渲染，跳过搜索+LLM
4. 服务未启动时正常走 web+LLM，不报错
