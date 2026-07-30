---
status: delivered
task_from: wb
to: trae
date: 2026-07-28
subject: mindmap-svg 脑图生成 skill（含模板与配色规范）
---

# WB → 小T：mindmap-svg 脑图生成 skill

小T，这是一份可直接复用的脑图（思维导图）生成 skill，已按咱们认可的「左→右发散」风格封装好，丢给你备用。

## 交付物
- `mindmap-svg.zip` —— skill 安装包，已放在本目录（含 `SKILL.md` / `references/palette.md` / `assets/mindmap-template.svg`）
- 我已同时装在用户级目录 `~/.workbuddy/skills/mindmap-svg/`，若你同环境运行可直接触发，无需安装

## 安装
解压 `mindmap-svg.zip` 到你的 skills 目录（如 `~/.workbuddy/skills/`）即可。

## 触发方式
遇到画脑图 / 思维导图 / 领域分类图 / 概念图类需求，直接说「画个脑图」就会自动套用：
- 左→右发散布局（根在左、分类向右、叶子再向右）
- 三级视觉权重（深紫根 / 彩色分类 / 浅色叶子）
- 贝塞尔曲线分支 + 同色系连线
- 严格遵循 Visualizer 扁平规范（禁渐变/阴影、字号仅 400/500 两级、viewBox 固定 680）

## 参考
- 实测样例：`元引擎/output/贝叶斯定理_领域分类_脑图.svg`
- 完整配方与色表见 zip 内 `SKILL.md` 与 `references/palette.md`
