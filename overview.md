# 内容到卡片管线 v3 升级摘要

> ⚠️ **文件错位标注（2026-08-14）**：本文档内容属于 **自媒体内容生产系统**（内容到卡片管线），不属于元引擎 App 本体。
> 正确位置应为 `/Users/sean/Documents/自媒体内容生产系统/`，请勿依据本文档理解元引擎功能。

## 完成事项
1. **清除管线文档中的「元引擎」硬编码**：除文件路径与历史决策日志外，`内容到卡片_pipeline.md` 全部泛化为「本项目/本账号/主赛道/知识框架」，文档标题改为《内容到卡片 生产管线（Content-First Pipeline）》。
2. **内容页差距诊断落地**：在 §7.8 以 `01_坑1_叶酸.png` vs 参考手账内容页做 8 维度对比，根因锁定为「S4 被锚定为扁平插画，而非手账剪贴簿」。
3. **S4 升级为 Scrapbook Journal**：kraft paper #F5EFE0 + washi tape + rubber stamp seals + 浮层卡片软阴影 + 手绘涂鸦/铅笔质感。
4. **新增 A-cover-radial 封面版式**：中心主题圆 + 环绕 4–6 张编号信息卡，写进 §7.7.0 版式原型库，作为 S4 默认封面。
5. **人物常量加入手绘体积感**：`hand-drawn linework, rosy cheeks, detailed grouped hair, soft fabric folds, subtle matte shading`，并写入 §0.3 硬标准。
6. **全 8 套模板 STYLE ANCHOR 升级**：S1–S8 全部加入「多层浮层 + 软阴影 + 8–15 道具 + 纸纹/胶带/印章」的高密度要求。
7. **写 prompt v3**：`/Users/sean/Documents/元引擎/output/03-推广/PROMPTS_备孕避坑_出图_v3.md`——去元引擎落版、S4 手账风、A-cover-radial 封面、单坑卡 scrapbook 拼贴高密度、附 S1–S8 全模板升级摘要。

## 关键决策
- **元引擎 ≠ 管线品牌**：元引擎只是项目名；管线必须项目无关，非本项目/主赛道选题不贴项目标。
- **信息密度硬标准**：单坑卡 ≥8 个物理道具、封面 ≥8 个道具+编号卡、背景必须有纸纹/胶带/印章、人物必须有手绘体积感。
- **封面改用 A-cover-radial**：S4（备孕/情感）封面从底部卡片排布改为中心辐射，信息密度更高。

## 待确认/下一步
1. prompt v3 方向是否正确？确认后再充 AI-HIVE 出图验证。
2. S4 主底色是否需要调整（当前 kraft #F5EFE0，淡粉/浅蓝作变体）？
3. 是否需要同步更新 DEMO JSON 的 `visualProps` 与 `propWrong/propRight` 清单以匹配高密度要求？

## 改动文件
- `/Users/sean/Documents/元引擎/output/03-推广/内容到卡片_pipeline.md`
- `/Users/sean/Documents/元引擎/output/03-推广/PROMPTS_备孕避坑_出图_v3.md`
- `/Users/sean/Documents/元引擎/.workbuddy/memory/2026-08-11.md`
- `/Users/sean/Documents/元引擎/.workbuddy/memory/MEMORY.md`
