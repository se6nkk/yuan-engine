# 元引擎 · Yuan Engine

> **输入一个词，搭起一座认知大厦。**
>
> *Enter a word, build a cognitive framework.*

元引擎是一款基于 AI 的知识管理工具，帮助你为任何概念自动生成结构化的 12 模块认知框架。

**核心卖点：透明可追溯。** 每条认知标注参考链接，不确定的明确标注，杜绝凭空编造。

---

## 两种使用方式

| | 🌐 在线版 | 💻 桌面版 |
|---|---|---|
| **怎么用** | 浏览器打开，即开即用 | 下载 .app，双击使用 |
| **OB 同步** | 不支持（可下载 .md） | ✅ 自动写入 Obsidian vault |
| **API Key** | 存浏览器 localStorage | 存浏览器 localStorage |
| **数据** | 100% 本地处理 | 100% 本地处理 |
| **架构** | — | arm64 + x86_64 双版本 |
| **地址** | [se6nkk.github.io/yuan-engine](https://se6nkk.github.io/yuan-engine) | [GitHub Releases](https://github.com/se6nkk/yuan-engine/releases) |

> **在线版也能用。** 生成完点「导出」下载 .md 文件，手动拖入 Obsidian 即可。核心功能（搜索、验证、生成）两个版本完全一样。

---

## 为什么需要元引擎？

AI 很擅长"编造"——当它不知道答案时，它会虚构研究机构、伪造数据、捏造人物。这在你构建知识库时是致命的。

元引擎通过 **DeepSeek 联网搜索 + 来源校验** 双重机制：
- 每条认知框架附带可点击的参考链接
- 生成前校验搜索结果概念是否存在（L1 级别验证）
- 素材不足时明确标注，绝不凭空编造

> ⚠️ 当前校验为 L1 级（概念存在性检测），尚不能逐条比对人物/年份/数据的事实准确性。更深入的事实级校验在路线图中。

---

## 功能

- **智能搜索** — DeepSeek 联网搜索，实时获取最新资料
- **来源校验** — 展示搜索返回的参考链接（含域名），标注未覆盖内容
- **12 模块认知框架** — 定义、领域分类、发展脉络、关键人物、底层原理、最新前沿、应用场景、常见误区、现实映射、学习方法、跨学科连接、批判思考
- **生成防编造** — 深度事实型模块素材不足时跳过或标注，不凭空编造
- **Obsidian 同步** — 桌面版自动将生成的 .md 文件写入 Obsidian vault
- **中英双语** — 界面支持中英文切换，输入语言不限
- **高级导出** — 支持 PNG 长图 / PDF / Markdown 导出
- **100% 本地** — 所有数据存于本地，API Key 仅存浏览器 localStorage

---

## 安装

### 在线版（推荐先用这个体验）

直接打开 [在线版](https://se6nkk.github.io/yuan-engine)，无需安装。

### 桌面版（需要 Obsidian 同步）

从 [Releases](https://github.com/se6nkk/yuan-engine/releases) 下载最新 `元引擎.app`。

> macOS 10.15+，支持 Apple Silicon（M 系列）和 Intel Mac。应用未签名，首次打开会被系统拦截，请右键点击 →「打开」即可。

---

## 快速开始

1. **设置 API Key** — 首次打开会弹出引导页，填入 DeepSeek API Key 即可
2. **输入概念** — 在首页输入框输入任意概念，如「博弈论」「熵增定律」「CRISPR」
3. **点击生成** — 等待搜索 → 验证 → 生成 → 阅读五层框架
4. **同步 OB** — 桌面版：设置 Obsidian vault 路径，到最后一层自动后台同步

> DeepSeek API Key 获取：https://platform.deepseek.com/api_keys — 注册后创建，新用户送 500 万 token 免费额度。

---

## 技术栈

- **前端** — Vanilla JS + Vite
- **桌面** — Tauri v2（macOS arm64 + x86_64 双版本）
- **搜索** — DeepSeek API（联网搜索）
- **生成** — DeepSeek API（deepseek-chat 模型）
- **存储** — IndexedDB（缓存）+ localStorage（设置）+ 本地文件（Obsidian vault）

---

## 打赏支持

元引擎完全免费开源。如果你觉得它对你有帮助，欢迎在 App 内打赏面板扫码支持（微信 / 支付宝）。

---

## 路线图

- [x] DeepSeek 联网搜索 + 来源校验
- [x] 生成防编造
- [x] Obsidian vault 自动同步
- [x] 中英双语 UI
- [x] 高级导出（PNG / PDF / Markdown）
- [x] macOS 通用二进制（arm64 + x86_64）
- [ ] Windows 版本（macOS 上无法交叉编译 .exe，代码已适配）
- [ ] 建议模块：基于用户知识库的多维度决策辅助
- [ ] 批量生成（多个概念一键跑）
- [ ] 知识图谱可视化
- [ ] L2 事实级校验

---

## License

MIT
