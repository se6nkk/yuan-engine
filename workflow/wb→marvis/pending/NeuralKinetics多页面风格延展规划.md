# NeuralKinetics 多页面风格延展规划

> 配套文档：`NeuralKinetics界面风格提炼.md`（单页风格拆解）
> 规划日期：2026-07-28
> 目标：把落地页（Home）的「有机极简 / Blob Aesthetics」风格，系统性延展到全站后续页面，建立**一套可复用的设计系统**，保证跨页一致、可维护、可交给小T 直接落地。

---

## 〇、核心原则（延展的"宪法"）

1. **一个活着的有机体**：全站共享**同一个常驻流体球背景**（fixed 层 + 同一套动画），让所有页面像同一团生命体的不同切面，而非各自为政。
2. **留白即设计**：每页内容占比控制在 40%~55%，其余是呼吸空间。
3. **字重讲故事**：用 Light/Bold 双字重对比承载语义，而非靠颜色或边框。
4. **圆角即分割**：能用圆角/pill 区分就不用 border；内容多时用「soft panel」（见 §2.4），不回退到硬卡片。
5. **零硬装饰**：无投影、无重边框、无渐变描边按钮；强调靠色块填充与字重。

---

## 〇.5 重要约束：本规划须贴合「元框架引擎」内容型页面（不得硬套落地页）

> 详细定位与收敛清单见 **`NeuralKinetics设计系统_贴合内容型页面定位说明.md`**（2026-07-29）。
> 本节为强制前置约束，小马写派工单、小T 实现时**优先于下面 §一~§四 的落地页式描述**。

**核心纠正**：上面的 §〇~§四 最初是**纯按 NeuralKinetics 落地页**写的延展规划。但元框架引擎是**内容密集的阅读器**（五层渐进认知框架、长文 + 结构化模块），与落地页（极少文字、超大留白、单一 Hero）气质完全不同。**禁止把落地页骨架整页套用到阅读器上。**

**收敛要点（执行时以此为准）**：
1. **流体球降级为氛围背景**：透明度降到 .30~.40、位置固定、不再做 Home/Features 那种页面变体强调；阅读区加极淡 `--bg` 遮罩保可读性。
2. **字号正文优先**：正文基准沿用 reader 现有 `0.9rem`(≈14.4px)，Display 大标题仅在页面级标题克制使用，禁止在五层模块内滥用；双色字重副标题只用于页面级 Lead。
3. **留白反转、密度提高**：用 soft panel 承载长文，不照搬落地页巨幅留白。
4. **只取通用件**：双主题令牌、pill、soft panel、nav、footer、动效/无障碍规范直接复用；**不引入** Features/Pricing/About/Contact 等落地页骨架，**不照搬** `neuralkinetics-demo.html` 的布局。
5. **保留并强化 reader**：五层分页、长文渲染、脑图/时间轴/误区对照等已有结构化模块是主体，仅让配色改引用双主题令牌实现亮/暗翻转。

> ⚠️ 小T 实现时：**不要整页替换 `index.html` 的 reader**，把 `neuralkinetics.css` 当「视觉皮肤层」叠加（并入令牌 + 氛围背景 + 统一通用件 + 已有模块配色改走变量），保留五层框架与可视化模块。

---

## 一、设计系统（可复用令牌）

### 1.1 颜色令牌（CSS 变量 · 双主题）

> **主题策略**：默认亮调写在 `:root`；暗调用 `@media (prefers-color-scheme: dark)` 覆盖同一组变量，**跟随系统设置自动切换**，无需 JS。所有颜色都走变量，组件层不写死颜色，才能一键翻转。

```css
:root{
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;

  /* ===== 亮调（默认 / Light） ===== */
  --bg:         #F7F8FA;
  --ink:        #111111;          /* 主文字 / 强调词 */
  --muted:      #8A8A8A;          /* 次要文字 / 弱化词 */
  --hairline:   #E6E6E6;          /* 极淡分隔（仅 footer/导航用） */
  --solid:      #1A1A1A;          /* 实心 pill / 主 CTA 底色（亮调下深） */
  --solid-ink:  #FFFFFF;          /* 实心 pill 上的文字 */
  --panel:      rgba(255,255,255,.62);
  --panel-line: rgba(0,0,0,.04);
  --nav-bg:     rgba(247,248,250,.72);
  --blob-pink:  rgba(255,180,160,.45);
  --blob-blue:  rgba(160,200,255,.45);
  --blob-green: rgba(160,235,210,.45);
  --blob-blend: multiply;         /* 亮底：正片叠底，球沉进背景 */
  --blob-opacity:.55;
}

@media (prefers-color-scheme: dark){
  :root{
    /* ===== 暗调（Dark · 跟随系统） ===== */
    --bg:         #0E0F13;        /* 近黑底，留一点呼吸，不纯黑 */
    --ink:        #F2F3F5;        /* 主文字转亮 */
    --muted:      #9AA0A8;        /* 次要文字提亮保对比 */
    --hairline:   #26282E;
    --solid:      #F2F3F5;        /* 实心 pill 反转成亮底 */
    --solid-ink:  #0E0F13;        /* 其上文字转深 */
    --panel:      rgba(255,255,255,.06);
    --panel-line: rgba(255,255,255,.07);
    --nav-bg:     rgba(14,15,19,.66);
    --blob-pink:  rgba(255,150,130,.55);
    --blob-blue:  rgba(120,170,255,.55);
    --blob-green: rgba(120,230,190,.55);
    --blob-blend: screen;         /* 暗底：改用滤色，球才显形（multiply 会消失） */
    --blob-opacity:.50;
  }
}
```

**暗调关键差异（易踩坑点）**
- 流体球混合模式必须 **`multiply` → `screen`**：亮底用正片叠底让球"沉进去"，暗底若仍用 multiply 球会整个黑掉看不见，必须改滤色（screen/lighten）。
- 球的颜色在暗调下**略提亮 + 提透明度**，避免在近黑底上发闷。
- 实心 pill **反转**（深底→亮底），文字同步反转（`--solid-ink`）。
- soft panel 在暗调下改为 `rgba(255,255,255,.06)` 的"暗玻璃"，不是白片。

### 1.2 字体比例（Type Scale）

| 层级 | 字号 | 字重 | 用法 |
|------|------|------|------|
| Display | clamp(40px, 6vw, 64px) | 700 | 首页主标题、页面 H1 |
| H1 | clamp(34px, 4.5vw, 52px) | 700 | 内页大标题 |
| H2 | clamp(22px, 2.6vw, 30px) | 700 | 区块标题 |
| Lead | clamp(18px, 2.2vw, 24px) | **300+700 混排** | 副标题（双色字重） |
| Body | 15px | 400 | 正文 |
| Small | 13px | 400 | 说明、标签、footnote |
| Eyebrow | 12px | 500 | 区块小标（大写字母 + 字距） |

> **双色字重副标题**约定：`Lead` 中前半段用 `--muted` + 300，后半段用 `--ink` + 700，之间用空格分隔（如 `cybernetics` `made organic`）。

### 1.3 流体球系统（全局常驻组件）

```html
<div class="blob-wrap" aria-hidden="true">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
</div>
```

- **常驻**：`<div class="blob-wrap">` 放在每个页面的 `<body>` 最前，`position:fixed; inset:0; z-index:0; filter:blur(70px); opacity:var(--blob-opacity); mix-blend-mode:var(--blob-blend)`，动画只跑一份，全站连续。**混合模式与透明度走变量**，暗调下自动从 `multiply` 翻成 `screen`（见 §1.1）。
- **页面变体（仅调位置/强调色，不动动画机制）**：
  - Home：三色均衡，偏中上
  - Features：球左移，偏蓝绿（突出"能力"冷静感）
  - Pricing：球居中下沉，偏粉（温暖、决策感）
  - About：球右上，偏绿（生长、生命）
  - Contact：球居中放大，三色全开（收束情绪）
- 变体通过给 `blob-wrap` 加 modifier class（如 `blob--features`）改变子球 `left/top` 即可，**动画 curve 不变**，保证全站"同一团东西在动"。

### 1.4 组件库

| 组件 | 形态 | 规范 |
|------|------|------|
| **Pill（实心）** | `border-radius:999px` 高 34px | 背景 `var(--solid)`，文字 `var(--solid-ink)`，可作主操作 / Menu（亮暗调自动反色） |
| **Pill（描边）** | 同尺寸 | 透明底 + `1px solid --hairline`，文字 `--ink`，次操作 / 标签 |
| **Eyebrow** | 小标 | 12px/500，大写 + `letter-spacing:.12em`，色 `--muted` |
| **Section header** | 标题组 | Eyebrow + H2 + Lead（双色字重），左对齐，下方留 48px |
| **Soft panel** | 内容容器 | `background:var(--panel); backdrop-filter:blur(12px); border-radius:24px;` **无边框无阴影**，仅极淡 `box-shadow:0 1px 0 var(--panel-line)` 用于桌面端分层 |
| **Organic icon** | 线性图标 | 1.5px 描边、圆角端点、单色 `--ink`，避免实心填充图标（保持轻盈） |
| **Nav bar** | 顶栏 | `position:sticky; top:0`，半透明 `var(--nav-bg)` + `backdrop-filter:blur(14px)`，底部一条 `--hairline` |
| **Footer** | 页脚 | 极简：左 logo + 版权，右少量链接，顶部 `--hairline` 分隔 |

> **关于"零卡片"的例外**：落地页内容极简无需容器；但 Features / Pricing / About 内容密集，**引入 soft panel 作为唯一允许的容器形态**——它本质是"被模糊磨圆的玻璃片"，不破坏有机极简，只是把内容轻轻托住。这是全站唯一的、必要的"让步"。

### 1.5 动效规范

- **全局**：流体球 `drift` 动画常驻（18~22s 缓动循环），`mix-blend-mode:multiply`。
- **入场**：区块进入视口时 `opacity 0→1` + `translateY(16px→0)`，300ms ease，错峰 80ms。
- **交互**：pill 按钮 hover 仅做 `opacity:.85` + 1px 位移，不加阴影/变色放大。
- **无障碍**：`@media (prefers-reduced-motion: reduce)` 时，球动画停在第一帧、入场动画改为即时显示。
- **性能**：球动画只用 `transform`/`opacity`（GPU 友好），不触发布局。

### 1.6 响应式 & 无障碍

- 断点：≥1024 桌面 / 640~1023 平板 / <640 手机。
- 移动端：blob 缩小 60%、内容单列、nav 收为「Menu」pill 抽屉。
- 对比度：正文 `--ink`/`--muted` 在 `--bg` 上满足 WCAG AA。
- 语义：每个页面 `h1` 唯一，区块用 `section` + `aria-labelledby`。

---

## 二、逐页规划

> 共 6 个核心页 + 2 个可选页。Home 已完成，列为基线。

### 2.0 Home / 落地页（基线，已完成）
- 结构：Sticky Nav → 居中 Hero（双色字重副标题）→ 不对称 Footer（左描述 / 右标签 pills）
- 流体球：均衡偏中上

### 2.1 Features / 产品能力
```
┌──────────────────────────────────────────────┐
│ [Nav]                                          │
│                                                │
│  EYEBROW: CAPABILITIES                         │
│  What NeuralKinetics does   做得到的事          │
│                                                │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ ~icon~        │  │ ~icon~        │  ← soft panel ×2 一行 │
│  │ 标题          │  │ 标题          │            │
│  │ 描述文字...   │  │ 描述文字...   │            │
│  └──────────────┘  └──────────────┘            │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ ...          │  │ ...          │            │
│  └──────────────┘  └──────────────┘            │
│                                                │
│ [Footer]                                       │
└──────────────────────────────────────────────┘
```
- 布局：Section header 左对齐 → 2 列 soft panel 网格（桌面）/ 单列（手机）
- 每块：organic icon + H2 标题 + Body 描述；panel 内不加压 border
- 流体球变体：`blob--features`（左移、偏蓝绿）
- 数量建议：4~6 个能力块

### 2.2 Technology / How it works（原理 / 流程）
```
┌──────────────────────────────────────────────┐
│ [Nav]                                          │
│  EYEBROW: THE SYSTEM                          │
│  How it thinks   它如何思考                    │
│                                                │
│  01 ────── 02 ────── 03 ────── 04             │  ← 步骤流，球作连接底色
│  Sense     Model     Adapt     Act            │
│  描述      描述      描述      描述            │
│                                                │
│  [一段 Lead 双色字重收束语]                     │
│ [Footer]                                       │
└──────────────────────────────────────────────┘
```
- 布局：横向 4 步流程（桌面）/ 纵向堆叠（手机），步骤号用大号 Light 字重、步骤名 Bold
- 连接线：极淡 `--hairline` 横线，下方流体球作"生命感"底色，不画硬箭头
- 流体球变体：`blob--tech`（居中、三色均衡）

### 2.3 Pricing / 定价
```
┌──────────────────────────────────────────────┐
│ [Nav]                                          │
│  EYEBROW: PLANS                               │
│  Choose your scale   选你的尺度                │
│                                                │
│  ┌──────────┐  ┌══════════┐  ┌──────────┐     │
│  │ Starter  │  │ Growth ▲ │  │ Enterprise│    │  ← 中间档 soft panel 略放大+粉描边光晕
│  │ ¥ /mo    │  │ ¥ /mo    │  │ 定制      │     │
│  │ - 功能   │  │ - 功能   │  │ - 功能    │     │
│  │ [Pill描边]│  │ [Pill实心]│  │ [Pill描边]│     │
│  └──────────┘  └══════════┘  └──────────┘     │
│ [Footer]                                       │
└──────────────────────────────────────────────┘
```
- 布局：3 档 soft panel 并排；中间档（推荐）用 `transform:scale(1.04)` + 极淡粉色光晕（`box-shadow:0 0 0 1px var(--blob-pink)`），不用重阴影
- CTA：每档底部 pill（描边/实心对应主次）
- 流体球变体：`blob--pricing`（居中下沉、偏粉）

### 2.4 About / 团队与理念
```
┌──────────────────────────────────────────────┐
│ [Nav]                                          │
│  EYEBROW: WHO WE ARE                          │
│  Organic by design   为有机而生                │
│                                                │
│  左：一段叙事正文（Body，最大宽度 60ch）        │
│  右：3~4 个成员，头像用圆形 + 有机渐变环        │
│       （环 = 复用 blob 三色 radial-gradient）   │
│                                                │
│  [价值观三栏：soft panel ×3]                   │
│ [Footer]                                       │
└──────────────────────────────────────────────┘
```
- 布局：左叙事 + 右成员环（圆形头像外裹一层 `radial-gradient` 光环，呼应球语言）
- 价值观：3 个 soft panel 横排
- 流体球变体：`blob--about`（右上、偏绿）

### 2.5 Contact / CTA（收束页）
```
┌──────────────────────────────────────────────┐
│ [Nav]                                          │
│                                                │
│          Let's build           我们来造         │
│          something organic     点有机的东西      │  ← 大号双色字重，居中
│                                                │
│          [ 邮箱输入 (soft panel 内) ] [Pill实心 发送] │
│                                                │
│ [Footer]                                       │
└──────────────────────────────────────────────┘
```
- 布局：居中大 statement + 一行式表单（输入框嵌在 soft panel 里，右侧接实心 pill）
- 流体球变体：`blob--contact`（居中放大、三色全开，情绪收束）
- 仅此页允许表单控件，输入框 `border-radius:999px` 保持 pill 语言

### 2.6（可选）Insights / 博客 ＆ Docs / 文档
- Insights：文章列表 = 左 Eyebrow + 标题 + 摘要的纵向 soft panel 序列，hover 仅位移
- Docs：左侧 sticky 目录 + 右侧内容，内容区沿用 Body/Lead 规范，代码块用更深一档 `--panel` 托底

---

## 三、一致性检查清单（交付前逐页核对）

- [ ] 每个页面 `<body>` 首行都有常驻 `blob-wrap`（同一份动画）
- [ ] 颜色只使用 §1.1 令牌，无硬编码新色（除 soft panel 透明度）
- [ ] **双主题自测**：在系统「亮/暗」间切换，全站自动翻转；暗调下流体球改用 `screen` 混合、仍清晰可见；实心 pill 反色正确；无硬编码颜色漏网
- [ ] 副标题一律双色字重（Light灰 + Bold黑）
- [ ] 按钮全是 pill（实心=主、描边=次），无直角按钮
- [ ] 容器只允许 soft panel，无硬边框卡片、无投影（中间档定价光晕除外）
- [ ] Nav 全站 sticky + 半透明模糊，Footer 全站一致
- [ ] 入场动画统一（opacity+translateY），且 `prefers-reduced-motion` 已处理
- [ ] 移动端单列、blob 缩小、nav 收抽屉

---

## 四、执行路线（分阶段，走小T 工单）

> 依 `AGENTS.md`：代码改动须走工单 `workflow/marvis→trae/pending/`，由小T 执行、验收后 commit。

**阶段 0 — 设计系统落地（一次性）**
1. 抽成 `design-system.css`（令牌 + blob 组件 + 组件类）
2. 抽成 `blobs.js`（或纯 CSS，若无需 JS 控制动画则省略）
3. 出 `components.html` 组件展示页（pill / panel / section header 实物）

**阶段 1 — 内容页（按依赖顺序）**
- Features → Technology → Pricing（信息架构主干）
- About → Contact（品牌/转化收尾）

**阶段 2 — 打磨**
- 响应式三断点核对
- 动效 + 无障碍（reduced-motion）pass
- 性能（blob 仅 transform/opacity）

**阶段 3 — 可选**
- Insights / Docs

> 每阶段产出一份变更单（含布局草图 + 用到的令牌/组件 + 验收点），丢 `marvis→trae/pending/`；小T 交付后我验收并 `git commit`。

---

## 五、待确认事项

1. **页面范围**：上面的 6 核心页是否就是你要的"后续页面"？还是要补/删（如 Terms、Login、Dashboard）？
2. **soft panel 让步**：内容页引入半透明玻璃面板（非硬卡片），是否接受？还是坚持纯无容器、用纯间距分隔？
3. **执行方式**：本规划定稿后，是否要我**直接生成阶段 0 的 `design-system.css` + 组件页**并走小T 工单？还是先只把规划交付小T 评审？
4. **真实文案/资产**：Features/Pricing 的具体条目、价格、成员，是否已有内容，还是先用占位？
5. **双主题范围**：已默认「跟随系统（`prefers-color-scheme`）」。是否还要在界面上加一个**手动亮/暗切换开关**（需少量 JS 记录用户选择、覆盖系统值）？还是仅跟随系统即可？
6. **流体球在阅读器中的强度**：§〇.5 默认把球透明度降到 .30~.40、固定安静位置、阅读区加遮罩。是否接受此默认？还是希望球更隐形（更低透明度/更小），或保留稍强氛围感？
