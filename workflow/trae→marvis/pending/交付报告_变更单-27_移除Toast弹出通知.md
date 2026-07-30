# 交付报告：变更单-27 移除底部 Toast 弹出通知

## 状态
已完成，git commit `bd95137`

## 变更清单

### A：CSS — 删除 `.toast` 规则
- **文件**：`index.html` 原 L359-368
- **删除**：`.toast` 和 `.toast.show` 共 10 行 CSS

### B：HTML — 删除 toast 元素
- **文件**：`index.html` 原 L472
- **删除**：`<div class="toast" id="toast"></div>`

### C：JS — 删除 showToast 函数
- **文件**：`index.html` 原 L689-696
- **删除**：`showToast(msg, duration)` 函数定义（7行）

### D：JS — 删除全部 16 处 showToast 调用

| 位置 | 原调用 | 处理方式 |
|------|--------|----------|
| saveSettings | `showToast('设置已保存')` | 删除整行 |
| startGenerate | `showToast('请输入概念')` | 从 if 中移除 |
| startGenerate | `showToast('请先在设置中填写 API Key')` | 从 if 中移除 |
| startGenerate | `showToast('正在生成框架...', 1500)` | 删除整行 |
| startGenerate | `showToast('已命中缓存，秒开')` | 删除整行 |
| startGenerate | `showToast('生成完成')` | 删除整行 |
| startGenerate catch | `showToast('错误: ' + err.message)` | 删除整行，保留 console.error |
| generateSub | `showToast('请先在设置中填写 API Key')` | 从 if 中移除 |
| generateSub | `showToast(\`正在生成「${term}」的子框架...\`)` | 删除整行 |
| generateSub catch | `showToast('错误: ' + err.message)` | 替换为 console.error |
| exportOne | `showToast('未找到该框架')` | 从 if 中移除 |
| exportOne | `showToast(\`已下载 1 个框架 + ${glossary.length} 个词条\`)` | 删除整行 |
| exportAll | `showToast('缓存为空')` | 从 if 中移除 |
| exportAll | `showToast(\`已导出 ${all.length} 个框架\`)` | 删除整行 |
| clearCache | `showToast('缓存已清空')` | 删除整行 |
| clearHistory | `showToast('历史记录已清空')` | 删除整行 |

## 验收步骤
1. 打开应用，生成框架 — 无底部弹出通知
2. 保存设置 — 无弹出
3. 导出缓存/清空缓存/清空历史 — 无弹出
4. 浏览器控制台无 `showToast is not defined` 报错
5. 错误场景（如 API Key 缺失）— 无弹出，控制台有 console.error

## 技术说明
- `grep showToast` 确认零残留
- generateSub 的空 catch 补充了 `console.error` 便于调试
- 所有 if 条件中的 showToast 移除后，控制流（return）保持不变
