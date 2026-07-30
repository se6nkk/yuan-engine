# 交付报告：变更单-61

**Commit**：`4614c4b`

## 变更内容

**Bug 1：选择器修复**（行 1300）
`.reader-page .module-radial` → `.reader-page .module-content.module-radial`，避免同时选中外层容器和内部 div 导致嵌套。

**Bug 2：标签字号增大**（行 365）
`.radial-label`：`12px` → `13px`，加 `font-weight: 500`。

**Bug 3：中心副标题字号**（行 2165）
`font-size="11"` → `font-size="12"`。

## 验收
1. 第四层"核心概念索引"放射图显示完整词条卫星节点
2. 第三层如有放射图，appendRemainingLayers 刷新后正常显示
3. 词条标签字号清晰可读
