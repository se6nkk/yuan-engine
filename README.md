# 元引擎 · Yuan Engine

> **输入一个词，搭起一座认知大厦。**
>
> *Enter a word, build a cognitive framework.*

元引擎是一款基于 AI 的知识管理工具，帮助你为任何概念自动生成结构化的 12 模块认知框架。

**核心卖点：告别 AI 幻觉。** 每条认知都有出处，不确定的明确标注。

---

## 两种使用方式

| | 🌐 在线版 | 💻 桌面版 |
|---|---|---|
| **怎么用** | 浏览器打开，即开即用 | 下载 DMG，双击安装 |
| **OB 同步** | 不支持（可下载 .md） | ✅ 自动写入 Obsidian vault |
| **API Key** | 存浏览器 localStorage | 存浏览器 localStorage |
| **数据** | 100% 本地处理 | 100% 本地处理 |
| **地址** | [se6nkk.github.io/yuan-engine](https://se6nkk.github.io/yuan-engine) | [GitHub Releases](https://github.com/se6nkk/yuan-engine/releases) |

> **在线版也能用。** 生成完点「导出」下载 .md 文件，手动拖入 Obsidian 即可。核心功能（搜索、验证、生成）两个版本完全一样。

---

## 为什么需要元引擎？

AI 很擅长"编造"——当它不知道答案时，它会虚构研究机构、伪造数据、捏造人物。这在你构建知识库时是致命的。

元引擎通过 **DeepSeek 联网搜索 + 交叉验证** 双重机制，确保：
- 每条关键论断都有可追溯的来源
- 搜索结果先经 AI 事实核查再用于生成
- 素材不足时明确标注，绝不编造

[50 词压力测试](/docs/benchmark.md) 显示：学术词 rich 率 88%，随机网络热词 68% medium，零虚假编造。

---

## 功能

- **智能搜索** — DeepSeek 联网搜索，实时获取最新资料
- **交叉验证** — 搜索结果先经 AI 事实核查，用可信度分数淘汰面包搜索结果
- **12 模块认知框架** — 定义、核心概念、发展脉络、关键人物、底层原理、最新前沿、应用场景、常见误区、现实映射、学习方法、跨学科连接、批判思考
- **P0 防编造** — 发展脉络、底层原理、最新前沿、现实映射 4 个模块绝对禁止 AI 编造
- **Obsidian 同步** — 一键将生成的 .md 文件写入 Obsidian vault
- **中英双语** — 界面支持中英文切换，输入语言不限
- **100% 本地** — 所有数据存于本地，API Key 仅存浏览器 localStorage

---

## 安装

### 在线版（推荐先用这个体验）

直接打开 [在线版](https://se6nkk.github.io/yuan-engine)，无需安装。

> 需要 Chrome / Edge 浏览器以获得最佳体验。Safari / Firefox 也可用，但部分功能（目录选择）受限。

### 桌面版（需要 Obsidian 同步）

从 [Releases](https://github.com/se6nkk/yuan-engine/releases) 下载最新 `.dmg`，双击安装即可。

> macOS 10.15+。首次打开需右键 → 打开（未签名应用）。

---

## 快速开始

1. **设置 API Key** — 打开设置面板，填入 DeepSeek API Key（用于联网搜索）和 LLM API Key（用于生成框架）
2. **输入概念** — 在首页输入框输入任意概念，如「博弈论」「熵增定律」「CRISPR」
3. **点击生成** — 等待搜索 → 验证 → 生成完成
4. **同步 OB** — 设置 Obsidian vault 路径，框架自动写入 vault

> DeepSeek API Key 获取：https://platform.deepseek.com — 搜索成本约 ¥0.001/次，¥10 可用约 2000 次。

---

## 技术栈

- **前端** — Vanilla JS + Vite
- **桌面** — Tauri v2（macOS）
- **搜索** — DeepSeek API（联网搜索 + 交叉验证）
- **生成** — 智谱 GLM-4-Plus / 兼容 OpenAI 格式的任意 LLM
- **存储** — IndexedDB（缓存）+ localStorage（设置）+ 本地文件（Obsidian vault）

---

## 打赏支持

元引擎完全免费开源。如果你觉得它对你有帮助，欢迎在 App 内打赏面板扫码支持（微信 / 支付宝）。

---

## 路线图

- [x] DeepSeek 联网搜索 + 交叉验证
- [x] P0/P1/P2 防编造分级
- [x] Obsidian vault 自动同步
- [x] 中英双语 UI
- [ ] Windows 版本
- [ ] 批量生成（多个概念一键跑）
- [x] 高级导出（PNG / PDF / Markdown）
- [ ] 知识图谱可视化

---

## License

MIT
