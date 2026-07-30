# 交付报告：变更单-57

**Commit**：`1583ecd`

## 变更内容

行 1371，`${total}` → `${readerState.totalLayers}`。局部 `total` 在分段渲染时为 3，`readerState.totalLayers` 在变更单-54 中已固定为 5。

## 验收
前 3 层导航页 readerLabel 显示"概念名 · 第 x/5 层"。
