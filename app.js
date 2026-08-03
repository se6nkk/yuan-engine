// ===== 启动期诊断（App/WebView 内可见，便于排查按钮失效）=====
window.__bootErrors = [];
function bootDiagEl() { return document.getElementById('bootDiag'); }
function bootStep(t) { var d = bootDiagEl(); if (d) d.textContent = (d.textContent ? d.textContent + '\n' : '') + t; if (window.__TAURI__ && window.__TAURI__.core) { try { window.__TAURI__.core.invoke('frontend_log', { msg: t }); } catch (e) {} } }
function showBootError(t) { bootStep('[错误] ' + t); }
window.addEventListener('error', function (ev) {
  var msg = (ev && ev.message) || (ev && ev.error && ev.error.message) || String(ev);
  window.__bootErrors.push(msg);
  showBootError(msg + (ev && ev.filename ? (' @' + ev.filename + ':' + ev.lineno) : ''));
});
window.addEventListener('unhandledrejection', function (ev) {
  var r = ev && ev.reason; var msg = (r && r.message) || String(r);
  window.__bootErrors.push(msg);
  showBootError('[Promise错误] ' + msg);
});
bootStep('脚本已开始执行 ✓');
function checkOnclickFns() {
  var missing = [], total = 0;
  document.querySelectorAll('[onclick]').forEach(function (el) {
    var m = el.getAttribute('onclick').match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
    if (m) { total++; var fn = m[1]; if (typeof window[fn] !== 'function') missing.push(fn); }
  });
  if (missing.length) bootStep('[警告] 静态 DOM 中 ' + missing.length + ' 个 onclick 函数未定义：' + missing.slice(0, 14).join(', ') + (missing.length > 14 ? ' …' : ''));
  else bootStep('✓ 静态 DOM 中 ' + total + ' 个 onclick 函数均已就绪');
}
// 扫描页面上所有内联事件处理器属性（onclick/onchange/oninput/onsubmit…），统一转成 addEventListener，
// 彻底绕开 Tauri WebView 可能拦截 inline handler 的情况（含运行时动态渲染的按钮）。
window.__bootErrors = window.__bootErrors || [];
var HANDLER_EVENTS = ['click','change','input','submit','reset','dblclick','keydown','keyup','keypress','mousedown','mouseup','mouseover','mouseout','focus','blur','contextmenu'];
function handlerSelector() { return HANDLER_EVENTS.map(function (t) { return '[on' + t + ']'; }).join(','); }
// 内联处理器调用：支持任意语句（含多语句、方法调用如 event.stopPropagation()）。
// 项目已 csp:null，故用 new Function 在受控上下文执行；处理器代码均来自本应用自身生成的 HTML。
function callHandler(code, event, el) {
  try {
    var runner = new Function('event', 'el', String(code));
    return runner.call(el || null, event, el);
  } catch (e) {
    bootStep('[处理器错误] ' + (e && e.message));
  }
}
function splitTopLevel(s) {
  var res = [], depth = 0, cur = '', ch;
  for (var i = 0; i < s.length; i++) {
    ch = s[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { res.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur) res.push(cur);
  return res;
}
function resolveArg(a, event, el) {
  if (a === 'event') return event;
  if (a === 'this') return el;
  if ((a[0] === "'" && a[a.length - 1] === "'") || (a[0] === '"' && a[a.length - 1] === '"')) return a.slice(1, -1);
  if (/^-?\d+(\.\d+)?$/.test(a)) return Number(a);
  if (/^[A-Za-z_$][\w$]*\s*\(/.test(a)) return callHandler(a, event, el);
  if (typeof window[a] !== 'undefined') return window[a];
  return undefined;
}
function bindEl(el) {
  if (!el || !el.getAttribute || el.__bound) return;
  var did = false;
  HANDLER_EVENTS.forEach(function (type) {
    var attr = 'on' + type;
    var code = el.getAttribute(attr);
    if (!code) return;
    el.removeAttribute(attr);
    el.addEventListener(type, function (ev) {
      try { callHandler(code, ev, el); }
      catch (e) { bootStep('[兜底' + type + '错误] ' + (e && e.message)); }
    });
    did = true;
  });
  if (did) el.__bound = true;
}
/** 把当前 DOM 中所有内联 on* 处理器转成监听器（含动态渲染的按钮） */
function bindAllHandlers() {
  document.querySelectorAll(handlerSelector()).forEach(bindEl);
}
/** 监听 DOM 变化，自动把后续动态插入的 on* 处理器也转成监听器（覆盖 reader 底部导航等运行时渲染的按钮） */
function watchOnclickMutations() {
  if (!('MutationObserver' in window)) { bindAllHandlers(); return; }
  try {
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.hasAttribute && n.hasAttribute('onclick')) bindEl(n);
          if (n.querySelectorAll) n.querySelectorAll(handlerSelector()).forEach(bindEl);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) { bindAllHandlers(); }
}
// ===== Config =====
const DB_NAME = 'MetaEngineDB', DB_VER = 1;
const SETTINGS_KEY = 'metaengine_settings';
const CACHE_VERSION = 'v24.1'; // v24.1=收紧白名单(剔除UGC)+web reliable模块3强制溯源

// ===== I18N (zh / en) =====
const I18N = {
  zh: {
    hero_sub: '输入一个词，搭起一座认知大厦',
    input_placeholder: '输入概念，如博弈论、贝叶斯定理...',
    gen_btn: '生成框架',
    clear_history: '清除历史',
    progress_preparing: '准备生成...',
    progress_searching: '正在搜索资料...',
    progress_verifying: '正在交叉验证...',
    progress_generating: '正在生成认知框架...',
    progress_done: '生成完成',
    settings_title: '设置',
    settings_theme: '外观主题',
    settings_theme_system: '跟随系统',
    settings_theme_light: '浅色',
    settings_theme_dark: '暗色',
    settings_language: '界面语言',
    settings_lang_zh: '中文',
    settings_lang_en: 'English',
    settings_llm_key: 'LLM API Key（生成用��',
    settings_llm_key_hint: '🔒 仅存本地浏览器，不发往任何第三方服务器',
    settings_key_title: 'API Key',
    settings_key_desc: '一个 Key 搞定一切：内容生成 + 联网搜索 + 交叉验证。推荐使用 DeepSeek（注册即送额度，约 1 分钱/次搜索）。',
    settings_key_save: '保存并关闭',
    settings_key_howto: '如何获取 Key？→ <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com</a> 注册后创建，新用户送 500 万 token 免费额度。',
    settings_more: '更多设置',
    settings_api_base: 'API Base URL',
    settings_ds_key: 'DeepSeek API Key（搜索用）',
    settings_ds_key_hint: '用于联网搜索和交叉验证。留空则自动复用上面的 LLM API Key。',
    settings_model: '模型名称',
    settings_gen_mode: '生成策略',
    settings_gen_cache: '默认模式 — 已有框架直接返回，不消耗 API',
    settings_gen_regen: '每次重新生成 — 跳过缓存，重新调 AI',
    settings_sync_dir: '同步目录（本地文件输出）',
    settings_sync_none: '未选择',
    settings_sync_browse: '选择目录…',
    settings_sync_clear: '清除',
    settings_sync_hint: '自动同步：Chrome / Edge（需用 http/localhost 打开本页）。Safari / Firefox 不支持自动写入，请点阅读器右下角「同步 OB」或右上角「导出」把 .md 存入 Obsidian vault。',
    settings_save: '保存设置',
    settings_clear_cache: '清空缓存',
    settings_export: '导出全部框架实例',
    settings_donate: '赞助支持',
    settings_donate_desc: '如果你觉得元引擎有用，欢迎请我喝杯咖啡 ☕',
    settings_version: '元引擎',
    confirm_title: '确认操作',
    confirm_cancel: '取消',
    confirm_ok: '确认',
    confirm_skip: '跳过',
    donate_title: '支持元引擎',
    donate_desc: '元引擎完全免费开源。如果你觉得它对你的知识管理有帮助，欢迎打赏支持。',
    donate_hint_wx: '微信扫码赞赏',
    donate_hint_zfb: '支付宝扫码',
    theme_toggle_label: '切换明暗主题',
    donate_btn: '☕ 支持元引擎',
    empty_history: '还没有生成记录，试试输入一个概念吧',
    quick_start_label: '快速体验',
    search_empty: '没有找到相关结果',
    search_error: '搜索出错，请稍后重试',
    source_verified: '来源已验证',
    source_suspicious: '来源存疑',
    source_no_data: '暂无可靠来源',
    module_skipped: '素材不足，已跳过此模块',
    reader_back: '返回',
    reader_sources: '来源',
    reader_search: '搜索',
    reader_regenerate: '重置',
    reader_export: '导出',
    reader_theme_light: '浅色',
    reader_theme_dark: '暗色',
  },
  en: {
    hero_sub: 'Enter a word, build a cognitive framework',
    input_placeholder: 'Enter a concept, e.g. Game Theory, CRISPR...',
    gen_btn: 'Generate',
    clear_history: 'Clear History',
    progress_preparing: 'Preparing...',
    progress_searching: 'Searching for sources...',
    progress_verifying: 'Cross-verifying facts...',
    progress_generating: 'Generating cognitive framework...',
    progress_done: 'Generation complete',
    settings_title: 'Settings',
    settings_theme_system: 'Follow System',
    settings_theme_light: 'Light',
    settings_theme_dark: 'Dark',
    settings_language: 'Language',
    settings_lang_zh: '中文',
    settings_lang_en: 'English',
    settings_llm_key: 'LLM API Key (for generation)',
    settings_llm_key_hint: '🔒 Stored locally, never sent to third parties',
    settings_key_title: 'API Key',
    settings_key_desc: 'One key for everything: generation + web search + cross-verification. We recommend DeepSeek (free credits on signup, ~$0.001/search).',
    settings_key_save: 'Save & Close',
    settings_key_howto: 'How to get a key? → <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">platform.deepseek.com</a> Sign up and create one. New users get 5M free tokens.',
    settings_more: 'More Settings',
    settings_api_base: 'API Base URL',
    settings_ds_key: 'DeepSeek API Key (for search)',
    settings_ds_key_hint: 'For web search & cross-verification. Falls back to LLM API Key if empty.',
    settings_model: 'Model Name',
    settings_gen_mode: 'Generation Strategy',
    settings_gen_cache: 'Default — return cached framework, no API cost',
    settings_gen_regen: 'Regenerate — skip cache, call AI every time',
    settings_sync_dir: 'Sync Directory (local output)',
    settings_sync_none: 'Not selected',
    settings_sync_browse: 'Browse...',
    settings_sync_clear: 'Clear',
    settings_sync_hint: 'Auto sync: Chrome/Edge (open via http/localhost). Safari/Firefox do not support auto-write; use "Sync OB" or "Export" in reader to save .md to Obsidian vault.',
    settings_save: 'Save Settings',
    settings_clear_cache: 'Clear Cache',
    settings_export: 'Export All Frameworks',
    settings_donate: 'Support',
    settings_donate_desc: 'If you find Yuan Engine useful, buy me a coffee ☕',
    settings_version: 'Yuan Engine',
    confirm_title: 'Confirm',
    confirm_cancel: 'Cancel',
    confirm_ok: 'OK',
    confirm_skip: 'Skip',
    donate_title: 'Support Yuan Engine',
    donate_desc: 'Yuan Engine is completely free and open-source. If it helps with your knowledge management, feel free to support.',
    donate_hint_wx: 'Scan with WeChat',
    donate_hint_zfb: 'Scan with Alipay',
    theme_toggle_label: 'Toggle light/dark theme',
    donate_btn: '☕ Support',
    empty_history: 'No history yet. Try entering a concept!',
    quick_start_label: 'Quick Start',
    search_empty: 'No results found',
    search_error: 'Search error, please try again later',
    source_verified: 'Source verified',
    source_suspicious: 'Source may be unreliable',
    source_no_data: 'No reliable source available',
    module_skipped: 'Insufficient material, module skipped',
    reader_back: 'Back',
    reader_sources: 'Sources',
    reader_search: 'Search',
    reader_regenerate: 'Reset',
    reader_export: 'Export',
    reader_theme_light: 'Light',
    reader_theme_dark: 'Dark',
  }
};

let currentLang = 'zh';
function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.zh[key] || key);
}
function setLang(lang) {
  currentLang = lang;
  // Update all [data-i18n] elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.placeholder = t(k);
    } else if (el.tagName === 'INPUT' && el.getAttribute('aria-label') !== null) {
      el.setAttribute('aria-label', t(k));
    } else {
      el.textContent = t(k);
    }
  });
  // Update [data-i18n-html] elements
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  // Persist
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  s.lang = lang;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  // Sync settings radio
  const radio = document.querySelector('input[name="langMode"][value="' + lang + '"]');
  if (radio) radio.checked = true;
}
function applySavedLang() {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  const lang = s.lang || 'zh';
  currentLang = lang;
  setLang(lang);
}

// ===== System Prompt (v25：DeepSeek优先搜索 + 素材评分 + 自适应模块) =====
function buildSystemPrompt(concept, wikiData) {
  // 构建来源上下文
  let sourceCtx = '';
  let module3Rule = ''; // 模块3动态规则（如未填充则空）
  if (wikiData) {
    if (wikiData.source === 'zh_wiki' || wikiData.source === 'en_wiki') {
      const lang = wikiData.source === 'zh_wiki' ? '中文维基百科' : '英文维基百科';
      sourceCtx = `

---
以下是你本次生成**唯一的事实来源**——${lang}词条「${wikiData.title || concept}」：
来源：${wikiData.url || ''}
分类：${(wikiData.categories || []).join(' / ') || '无'}

正文节选：
${wikiData.extract || '(无正文)'}

你可以基于以上内容进行总结、类比和通俗化解说，也可以补充你已知的通用知识辅助理解。
但**严禁杜撰以上来源中不存在的人名、年份、具体数据或事件**。如果某个模块来源中确实没有对应信息，
请输出「暂无可靠来源」而不要编造。`;
    } else if (wikiData.source === 'web') {
      const isLowQuality = wikiData.webQuality === 'low_quality';
      sourceCtx = `

---
以下是网络搜索结果，作为你本次生成的主要参考。${isLowQuality ? `

**警告：这些搜索结果未包含任何来自维基百科、百度百科、权威媒体或官方网站的链接。**
**搜索结果可能包含自媒体、内容农场或 AI 生成的不可靠信息。你必须极度保守：**

- 模块3（发展脉络）：如果搜索结果中没有明确提到带具体年份的事件，直接输出「暂无可靠时间线来源。」——禁止基于碎片拼凑时间线。
- 所有模块：仅使用搜索结果中**明确、具体**的信息。模糊的暗示、类比、关联词不算证据。
- 如果搜索结果之间存在矛盾，说明该概念的真实性存疑，优先指出不确定性而非编造。
- 当无法确认某个事实时，写「暂无可靠来源」而非猜测。` : ''}

${(wikiData.webSnippets || []).map((s, i) => `[${i + 1}] ${typeof s === 'string' ? s : s.text} | 来源:${s.engine || 'web'} | ${s.url || ''}`).join('\n')}

${isLowQuality ? `
重申：上述搜索结果可能不可靠。**发展脉络如果没有带年份的明确事件→直接写「暂无可靠时间线来源」，严禁编造。**` : `

**模块3（发展脉络）硬性规则**：仅基于上方搜索片段中明确列出的、带具体年份的事件编写时间线。每个事件必须在描述末尾标注引用来源编号，格式为「（来源[N]）」。若某年的事件无法精确追溯到某个搜索片段，则**禁止**写入。如果搜索片段中没有任何带年份的事件，输出「暂无可靠来源验证该概念的发展脉络。」`}`;
    } else if (wikiData.source === 'semantic_decompose') {
      const s = wikiData.semanticInfo || {};
      sourceCtx = `

---
「${concept}」在维基百科和搜索引擎中均未找到精确匹配。
经判断，这是一个有效的汉语词汇。请基于**拆字释义**进行简要解释：
${s.decomposition || ''}

注意：
- 只生成一个精简版框架（核心定义 + 拆字解析 + 常见用法），不需要完整的 12 模块
- 明确告知用户这是基于字面拆解，非权威定义
- 格式：仅模块1（核心定义）和模块2（拆字详解），最后注明「以上内容为字面拆解，非权威来源。」`;
    } else if (wikiData.source === 'deepseek_search') {
      const mc = wikiData.moduleConfig || {};
      const urls = (wikiData.urlCandidates || []).length > 0
        ? '\n\n检索到的参考链接：\n' + wikiData.urlCandidates.map((u, i) => `[${i + 1}] ${u}`).join('\n')
        : '';

      // 按素材质量 × 模块防编造等级，构建差异化约束
      const fabricLevels = mc.noFabricateConfig || {};
      const quality = wikiData.quality || 'medium';
      let moduleRules = '';

      if (quality === 'rich') {
        moduleRules = `
5. 【P0 模块：模块3/5/6/9】每个事实断言末尾标注来源编号（如「来源[1]」）。若来源中无对应信息→写「暂无可靠来源」。
6. 【P1 模块：模块1/2/4/7/12】优先使用来源信息，推演部分标注「（推演）」。不确定处标注「（有待验证）」。
7. 【P2 模块：其余】可结合已知知识，但不可编造具体数据。`;
      } else if (quality === 'medium') {
        moduleRules = `
5. 【P0 模块：3/5/6/9 — 极度保守】每条信息必须能追溯到来源片段。即使你"知道"某个事实（如"贝叶斯定理发表于1763年"），只要来源中没写→禁止写进该模块，标注「暂无可靠来源」。现实应用中只写来源明确提到的数量个，不可自行补充。
6. 【P1 模块：1/2/4/7/12】核心内容用来源，篇幅缩减到正常 1/2。推演标注「（推演）」，不确定标注「（有待验证）」。
7. 【P2 模块：8/10/11】照常生成，但不可编造引用和数据。`;
      } else {
        moduleRules = `
5. 【P0 模块：3/5/6/9 — 全部跳过】标注「> ⚠️ 搜索结果深度不足，该模块需要更丰富的参考资料。」
6. 【P1 模块：仅模块1/4】模块1 只写核心定义（80-150字），标注「以上定义基于有限搜索结果」。模块4 最多2条误区，标注「（基于有限来源）」。其余 P1/P2 模块全部跳过。
7. 关键：即使你知道某个事实，来源中没有就不能写。宁可少写不可编造。`;
      }

      // 交叉验证结果：标记可疑内容
      const v = wikiData.verification;
      let verifyNote = '';
      if (v && v.confidence !== undefined) {
        const pct = Math.round(v.confidence * 100);
        verifyNote = `
🔍 交叉验证：搜索结果整体可信度 ${pct}%（确认${v.verified || 0}条 / 合理${v.plausible || 0}条 / 无法验证${v.unverifiable || 0}条 / 可疑${v.suspicious || 0}条）
${v.summary ? '⚠️ 需要警惕：' + v.summary : ''}`;
      }

      sourceCtx = `

---
以下是通过 DeepSeek 联网搜索获取的资料——这是你本次生成的**唯一事实来源**：
${verifyNote}
来源质量：${wikiData.quality || 'unknown'}
${mc.instruction || ''}

搜索结果：
${wikiData.searchContent || '(无搜索结果)'}
${urls}

**硬性规则（违反则生成作废）：**
1. ${mc.requireSource || '标注信息来源。'}
2. 严禁编造搜索结果中不存在的人名、年份、具体数据或事件。即使你"知道"某个事实，只要来源中没有，就不允许写进 P0 模块。
3. 如果来源中没有某个模块需要的信息，必须标注「暂无可靠来源」——不要编造、不要猜测、不要模糊处理、不要从训练记忆中"补全"。
4. 概念类型判定优先看搜索结果：若搜索结果显示这是一个具体作品→必须按作品分析，严禁做字面拆解。
${moduleRules}`;
    }
  }
  return `你是一位顶尖的认知科学专家与知识工程师。你的任务是为用户输入的概念「${concept}」生成一个完整的五层渐进认知框架。

**重要：概念类型判定。** 若输入是一个**具体作品名**（动画、电影、电视剧、综艺、小说、游戏、漫画等），你必须分析该作品本身（故事设定、世界观、主题思想、创作背景等），**严禁**将其名称拆字做字面哲学解读。例如：输入"灵笼"应分析国产动画《灵笼》的世界观与设定，而非解读"灵魂的笼子"这一抽象概念。**特别注意：某些名称本身具有字面含义（如「一饭封神」字面可理解为"一顿饭让人封神"），但若下方网络搜索信息中显示该名称是一个具体的综艺/影视/文学等作品，则绝对禁止按字面含义解读，必须作为该作品进行分析。强制流程：①先读下方网络搜索信息；②判断搜索是否明确指向某作品（出现书名号《》、或综艺/节目/电影/电视剧/小说/动漫等类型词）；③若任何一条搜索结果确认为作品→必须按作品分析；④若全部搜索结果均不指向作品→才可按抽象概念处理。严禁跳过搜索自行臆断。

输出格式要求：
使用 Markdown 格式，严格按照以下 12 个模块的结构输出。各模块有独立字数范围，请严格遵守，不可为凑总字数而稀释重头模块、也不可为省字而跳过低字数模块。

# ${concept} · 认知框架

---

## 第一层：一瞥（≤30秒阅读）

### 1. 核心定义
用一句话给出精确的核心定义（80-150字），再加一个贴切的生活类比（1-2句话，帮助零基础读者瞬间理解）。
格式要求：
- 定义句必须包含该概念最本质的特征，不可写成泛泛的介绍
- 类比必须与定义有清晰的映射关系，不可牵强附会
- 类比段落必须与定义段落用空行隔开，另起一段，不可拼在定义句的同一段内

---

## 第二层：全景地图（≤2分钟阅读）

### 2. 领域分类
列出该概念所属的主要领域、子领域和交叉领域。
格式要求：
- 每个领域用 **加粗标题** 独占一行
- 标题下方用列表项（- 子领域：一句注释）列出该领域的具体子领域，每个子领域后必须跟中文冒号和一句 15 字以内的注释，说明该子领域研究什么
- 至少列出 3 个领域，每个领域至少 2 个子项
- 若领域标题是书籍/作品名，必须将完整书名（含副标题）放入《》内，如 **《家庭仪式的力量：共餐如何塑造我们的关系》**，禁止将副标题拆出作为列表项
- 示例：
  **数学基础**
  - 概率论：研究随机现象量化规律的数学分支
  - 统计学：从数据中提取信息与推断的科学方法
  - 线性代数：研究向量空间与线性变换的数学工具

  **计算机科学**
  - 机器学习：让计算机从数据中自动学习模式
  - 自然语言处理：使机器理解与生成人类语言的技术

### 3. 发展脉络
用时间线方式简述该概念的历史演进（关键人物、里程碑事件）。日期无法确定时给出大概区间并标注「未证实」，严禁杜撰。
格式要求：
- 每个事件独占一行
- 格式：年份年：事件描述（年份后必须加"年"，如"1987年"而非"1987"）
- 按时间正序排列
- 不要使用 markdown 列表标记（- 或 *）
- ${module3Rule}

### 4. 常见误区
列出 3-5 个最常见的理解误区，每个用 ❌ 错误认知 → ✅ 正确理解 → 💡 深层洞察 三段式呈现。
格式要求：
- 每个误区必须占据连续三行
- 第一行以 ❌ 开头，写错误认知
- 第二行以 ✅ 开头，写正确理解
- 第三行以 💡 开头，写深层洞察
- 误区之间用空行分隔
- 每个误区三段合计 100-200 字，洞察要揭示被忽视的本质，不可写成常识复读

---

## 第三层：深层逻辑（5-8分钟阅读，整个框架的核心价值所在）

### 5. 底层原理
深入解释该概念的核心机制、数学基础或逻辑结构。格式要求：
- 至少展开 3 个不同维度的机制分析，每个维度独立成段
- 维度示例：核心公式/定律、运作流程、关键假设与边界、与相似概念的本质区别
- 总字数 800-1200 字，宁可超出不可不足
- **每个维度严格按以下格式输出：\`维度X：一句话摘要。正文段落。\`**（标题后必须跟冒号，摘要以句号收尾，摘要后紧跟正文，不可将摘要与正文拆成多行）
- 示例（以贝叶斯推理为例）：
  维度一：贝叶斯公式的直观含义。先从条件概率的"反转"讲起——P(A|B) → P(B|A) 的本质是"用结果反推原因"，这与人类日常推理方向相反……（展开至完整段落）
  维度二：先验分布的选取。……
  维度三：似然函数如何编码观测模型。……

### 6. 最新前沿
介绍该概念在学术界或产业界的最新进展（近 3-5 年）。格式要求：
- 至少列出 3 个进展，每个包含：时间（年份）、机构/研究者、核心突破点
- 每个进展独立一段，2-4 句话展开，不可只写标题
- 总字数 600-1000 字
- 示例：
  2023 年，Google DeepMind 发布了 GNoME，利用图神经网络在材料科学中预测了 220 万种新晶体结构，将传统试错法的发现速度提升了数个数量级，核心突破在于将等价变体嵌入引入晶体图表示。

### 7. 核心难题
列出该领域尚未解决的重大开放问题。
格式要求：
- 每个难题独占一行，至少列出 3 个
- 格式：**难题名** [状态]：一句简述
- 状态取「未解决」「研究中」「已突破」三者之一
- 示例：
  **P vs NP 问题** [未解决]：理论计算机科学中最重要的问题，涉及计算复杂度类的本质关系
  **蛋白质折叠预测** [研究中]：从氨基酸序列预测三维结构，AlphaFold 已有重大突破但不完整

---

## 第四层：拓展应用（3-5分钟阅读）

### 8. 跨领域连接
说明该概念如何与其他学科产生联系和应用。格式要求：
- 至少列出 3 个跨领域连接，每个独立一段
- 每个连接必须以 **加粗小标题** 开头，格式：**概念名 × 领域名**
- 小标题后换行展开该连接的具体机制：该概念在目标领域中充当什么角色、解决了什么问题
- 不可写成"XX与YY有关"这种空洞陈述
- 总字数 300-500 字
- 示例：
  **贝叶斯推理 × 神经科学**
  大脑在感知和决策过程中本质上是一个贝叶斯推理引擎。神经编码中的概率表征——神经元群体活动编码的不确定性分布——为贝叶斯大脑假说提供了计算层面的证据。该理论解释了多感官整合、运动控制中的最优估计等现象。

  **贝叶斯推理 × 人工智能**
  从朴素贝叶斯分类器到贝叶斯神经网络，贝叶斯方法为机器学习提供了不确定性量化的统一框架。在深度学习中，贝叶斯推断被用于模型选择、超参数优化和防止过拟合，是概率编程和因果推断的基础。

### 9. 现实映射
给出 3-5 个该概念在现实世界中的具体应用场景。
格式要求：
- 每个场景独占一行
- 格式：场景名：一句话描述该概念在此场景中的应用方式
- 示例：
  医疗诊断：贝叶斯网络用于症状→疾病的概率推理，辅助医生决策
  垃圾邮件过滤：朴素贝叶斯分类器通过词频概率判断邮件类别

### 10. 核心概念索引
列出 8 个与该概念紧密相关的核心术语，每个术语用 1-2 句话解释。格式：
- **术语名**：简要解释

---

## 第五层：渐进学习（不限）

### 11. 推荐学习路径
给出从入门到精通的四阶段学习路径。每个阶段包含学习内容、阶段目标和自检问题。
格式要求：
- 四个阶段分别为：入门、进阶、专业（重点阶段）、研究
- 每个阶段使用 **加粗阶段名** [建议时长] 独占一行
- 阶段名下方用缩进列表列出 3 个子项：学习内容、阶段目标、自检问题
- 示例：
  **入门阶段** [2-3周]
  - 学习内容：掌握核心定义、基本公式和生活类比，能向外行解释清楚
  - 阶段目标：理解「是什么」和「为什么重要」，建立直觉层面的认知
  - 自检问题：能否用一句话让完全不懂的人听懂这个概念？

  **进阶阶段** [4-6周]
  - 学习内容：深入核心机制与推导过程，完成 3-5 个标准场景的计算练习
  - 阶段目标：能从原理层面解释运作机制，独立完成标准问题的求解
  - 自检问题：能否不看参考资料从头推导核心流程？

  **专业阶段** [8-12周]
  - 学习内容：掌握前沿变体与跨领域应用，阅读近年关键论文 3-5 篇，完成 1 个综合项目
  - 阶段目标：能针对实际问题选择合适方法，理解各变体的适用场景与局限
  - 自检问题：给定一个新场景，能否判断该用哪种方法体系？

  **研究阶段** [持续]
  - 学习内容：追踪最新论文与预印本，识别开放问题，参与学术讨论或开源项目
  - 阶段目标：能提出有价值的研究问题，具备独立探索前沿的能力
  - 自检问题：该领域目前最关键的未解决问题是什么？你打算从哪里切入？

### 12. 工具箱
推荐学习该概念相关的工具、软件、数据集或实验平台。
格式要求：
- 按类型分组，每组用 **加粗类型名** 独占一行
- 每个工具独占一行，格式：- 工具名：一句话说明
- 示例：
  **软件与库**
  - scikit-learn：Python 主流机器学习库，内置多种贝叶斯模型
  - PyMC：概率编程库，支持马尔可夫链蒙特卡洛采样
  **数据集**
  - UCI Adult Dataset：经典收入预测数据集，常用于贝叶斯分类演示

---

注意事项：
- 所有内容使用中文
- 重头模块（5 底层原理、6 最新前沿）必须充分展开，这是整个框架的核心价值
- 轻量模块（1 核心定义、11 推荐学习路径、12 工具箱）追求精准而非堆字数
- 模块 10 中的术语要准确，方便后续生成独立词条
- 禁止在任何模块中使用空洞套话（如"具有重要意义""值得深入研究""发挥着关键作用"等无信息量的表述）
- 每个模块的输出质量优先于字数要求，如果概念本身高度专业，允许超出上限${sourceCtx}`;
}

// ===== IndexedDB =====
let db = null;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('frameworks')) {
        d.createObjectStore('frameworks', { keyPath: 'concept' });
      }
      if (!d.objectStoreNames.contains('glossary')) {
        d.createObjectStore('glossary', { keyPath: 'term' });
      }
      if (!d.objectStoreNames.contains('conceptCheck')) {
        d.createObjectStore('conceptCheck', { keyPath: 'concept' });
      }
    };
  });
}

function dbPut(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function dbClear(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ===== Settings =====
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    document.getElementById('apiKey').value = s.apiKey || '';
    document.getElementById('apiBase').value = s.apiBase || 'https://api.deepseek.com';
    document.getElementById('modelName').value = s.modelName || 'deepseek-chat';
    document.querySelector(`input[name="genMode"][value="${s.genMode || 'cache'}"]`).checked = true;
    // Theme mode: system / light / dark
    const themeMode = s.themeMode || 'system';
    const modeRadio = document.querySelector(`input[name="themeMode"][value="${themeMode}"]`);
    if (modeRadio) modeRadio.checked = true;
    applyThemeMode(themeMode);
    // Language: zh / en
    const lang = s.lang || 'zh';
    const langRadio = document.querySelector(`input[name="langMode"][value="${lang}"]`);
    if (langRadio) langRadio.checked = true;
    // 同步目录显示名（兜底用设置里存的名称；真正句柄异步从 IndexedDB 读）
    const dirEl = document.getElementById('obsidianDirName');
    if (dirEl) dirEl.textContent = s.obsidianPath ? s.obsidianPath : t('settings_sync_none');
    getObsidianHandle().then(h => {
      const el = document.getElementById('obsidianDirName');
      if (el) el.textContent = h ? h.name : t('settings_sync_none');
    });
  } catch(e) {}
}

function saveSettings() {
  const s = {
    apiKey: document.getElementById('apiKey').value.trim(),
    apiBase: document.getElementById('apiBase').value.trim(),
    modelName: document.getElementById('modelName').value.trim(),
    genMode: document.querySelector('input[name="genMode"]:checked').value,
    themeMode: document.querySelector('input[name="themeMode"]:checked').value,
    lang: currentLang,
    obsidianPath: getSettings().obsidianPath || ''
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  closeSettings();
}

/** Apply theme mode: 'system' | 'light' | 'dark' */
function applyThemeMode(mode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }
  // Sync topbar toggle visual to effective dark state
  const effectiveDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  syncThemeSwitch(effectiveDark);
  // Save mode
  const s = getSettings(); s.themeMode = mode;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** Handle theme mode radio change in settings panel */
document.addEventListener('DOMContentLoaded', () => {
  // Delegate radio change for themeMode
  document.addEventListener('change', (e) => {
    if (e.target.name === 'themeMode') {
      applyThemeMode(e.target.value);
    }
  });
  // Listen for OS scheme changes when in "system" mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const s = getSettings();
    if ((s.themeMode || 'system') === 'system') {
      syncThemeSwitch(e.matches);
    }
  });
  // 设置面板：如实显示当前浏览器是否支持目录直写
  refreshFsAccessStatus();
  // 不支持直写浏览器：webkitdirectory 选中后记录顶层目录名（仅作记忆，无法自动写入）
  const dirInput = document.getElementById('obsidianDirInput');
  if (dirInput) {
    dirInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length) {
        const rel = files[0].webkitRelativePath || '';
        const name = rel.split('/')[0] || files[0].name;
        const el = document.getElementById('obsidianDirName');
        if (el) el.textContent = name;
        try { const s = getSettings(); s.obsidianPath = name; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) {}
        showToast('已记录目录「' + name + '」（此浏览器无法自动写入，请用右下角「同步 OB」或右上角「导出」）', 'info');
      }
    });
  }
});

// ===== 同步目录：File System Access API（浏览器直接写本地文件，无需后端服务）=====
const OBS_HANDLE_DB = 'MetaEngineObsidianHandle';
async function _openHandleDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(OBS_HANDLE_DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('handles')) r.result.createObjectStore('handles'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function getObsidianHandle() {
  try {
    const db = await _openHandleDb();
    return await new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readonly');
      const g = tx.objectStore('handles').get('dir');
      g.onsuccess = () => res(g.result || null);
      g.onerror = () => rej(g.error);
    });
  } catch (e) { return null; }
}
async function setObsidianHandle(handle) {
  const db = await _openHandleDb();
  return new Promise((res, rej) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, 'dir');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
/** 当前浏览器是否实现了目录直写所需的 File System Access API（showDirectoryPicker） */
function fsDirectWriteSupported() {
  return typeof window.showDirectoryPicker === 'function';
}
/** 在设置面板里如实显示当前浏览器的直写能力（自纠正：Safari 27 若真实现了会直接显示「支持」） */
function refreshFsAccessStatus() {
  const el = document.getElementById('fsAccessStatus');
  if (!el) return;
  if (isTauriEnv()) {
    el.style.color = 'var(--ok, #2e9e5b)';
    el.textContent = '✓ App 模式：已获得原生文件系统权限，搜索/生成后可一键写入 Obsidian 目录。';
    return;
  }
  if (fsDirectWriteSupported()) {
    const secure = (typeof self !== 'undefined' && self.isSecureContext);
    el.style.color = 'var(--ok, #2e9e5b)';
    el.textContent = secure
      ? '✓ 此浏览器支持目录直写：选择目录后生成可自动写入。'
      : '⚠ 此浏览器支持目录直写，但当前页面不在安全上下文（file://），API 已被禁用。请用本地服务（http://localhost:端口）打开本页后再选目录。';
  } else {
    el.style.color = 'var(--accent2)';
    el.textContent = '⚠ Safari / Firefox 不支持自动写入：导出或同步后文件将下载到「下载」文件夹，请手动移入 Obsidian vault。';
  }
}

/** 在设置里选择同步目录：拿到 DirectoryHandle 并持久化到 IndexedDB */
async function selectSyncDir() {
  // App 模式：直接调原生目录选择器（Rust 命令），能力完整
  if (isTauriEnv()) {
    try {
      const dir = await window.__TAURI__.core.invoke('select_sync_dir');
      const el = document.getElementById('obsidianDirName');
      if (el) el.textContent = dir || t('settings_sync_none');
      if (dir) showToast('已选择同步目录：' + dir, 'ok');
      else showToast('已取消选择', 'info');
    } catch (e) {
      showToast('选择目录失败：' + (e && e.message ? e.message : e), 'warn');
    }
    return;
  }
  // 支持直写：原生目录选择器，拿到可写句柄
  if (fsDirectWriteSupported()) {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await setObsidianHandle(handle);
      const el = document.getElementById('obsidianDirName');
      if (el) el.textContent = handle.name;
      try { const s = getSettings(); s.obsidianPath = handle.name; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
      showToast('已选择同步目录：' + handle.name, 'ok');
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return; // 用户取消，静默
      // 其余错误（如 file:// 下的 SecurityError）：降级到 webkitdirectory 兜底，而不是卡死
      console.warn('[selectSyncDir] showDirectoryPicker 失败，降级到 webkitdirectory 兜底:', e);
    }
  }
  // 不支持直写 / 直写失败：用 webkitdirectory 兜底，至少让按钮能打开选择器并记录目录名（无法自动写入）
  const inp = document.getElementById('obsidianDirInput');
  if (inp) { inp.value = ''; inp.click(); }
  else showToast('当前浏览器不支持选择目录', 'warn');
}
/** 清除已选同步目录（仅删本地句柄记录，不删磁盘文件） */
async function clearSyncDir() {
  try {
    const db = await _openHandleDb();
    await new Promise((res, rej) => {
      const tx = db.transaction('handles', 'readwrite');
      tx.objectStore('handles').delete('dir');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) {}
  const el = document.getElementById('obsidianDirName');
  if (el) el.textContent = t('settings_sync_none');
  try { const s = getSettings(); s.obsidianPath = ''; localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  showToast('已清除同步目录', 'ok');
}
/** 把内容写入目录下的文件（File System Access API） */
async function writeFileToDir(handle, filename, content) {
  const fh = await handle.getFileHandle(filename, { create: true });
  const w = await fh.createWritable();
  await w.write(content);
  await w.close();
}

// ===== Tauri App 桥：运行在桌面 App 内时，用原生 Rust 命令读写文件 =====
// 检测是否在 Tauri 运行时（withGlobalTauri=true 会注入 window.__TAURI__）
function isTauriEnv() {
  return typeof window !== 'undefined' &&
    (typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined');
}
// 把当前概念的「框架 + 各词条」拼成 {name, content} 列表（复用导出清洗逻辑），供原生写盘
async function buildObsidianFiles(concept) {
  const data = await dbGet('frameworks', concept);
  if (!data) return [];
  const files = [];
  files.push({
    name: `${concept}-认知框架.md`,
    content: cleanMarkdownForExport(data.markdown || '') + OBSIDIAN_SOURCE_MARK,
  });
  const glossary = data.glossary || [];
  for (const g of glossary) {
    if (g && g.term && g.content) {
      const fullContent = extractTermFullContent(g.term, data.markdown || '') || g.content;
      files.push({
        name: `${g.term}-词条.md`,
        content: `# ${g.term}\n\n${fullContent}\n${OBSIDIAN_SOURCE_MARK}`,
      });
    }
  }
  return files;
}
// 走 Rust 命令写盘：必要时自动弹出原生目录选择器
async function tauriWriteObsidian(files) {
  const T = window.__TAURI__;
  // 兼容 v2 全局 API（window.__TAURI__.core.invoke）与各种形态
  const invoke = (T && T.core && typeof T.core.invoke === 'function')
    ? T.core.invoke.bind(T.core)
    : (T && typeof T.invoke === 'function' ? T.invoke.bind(T) : null);
  if (!invoke) throw new Error('Tauri invoke 不可用（window.__TAURI__ 未注入）');
  let dir = await invoke('get_sync_dir');
  if (!dir) {
    dir = await invoke('select_sync_dir');
    if (!dir) throw new Error('未选择同步目录');
  }
  const res = await invoke('write_obsidian_files', { files });
  if (typeof res === 'string' && res.startsWith('OK:')) {
    // 新格式：OK:<n>|dir:<path>
    const m = res.match(/^OK:(\d+)\|dir:(.*)$/);
    if (m) return { n: parseInt(m[1], 10), dir: m[2] };
    return { n: parseInt(res.slice(3), 10), dir: dir };
  }
  throw new Error(typeof res === 'string' ? res : '写入失败');
}

// ===== 事实标注 tooltip（fixed 定位，绕开 .layer-body 的 overflow:hidden 裁剪）=====
(function setupFuTooltip() {
  const TIP_TEXT = 'AI 生成，未找到权威出处，仅供参考';
  const tip = document.createElement('div');
  tip.className = 'fu-tooltip';
  tip.style.display = 'none';
  tip.textContent = TIP_TEXT;
  document.body.appendChild(tip);

  let activeEl = null;
  function show(el) {
    activeEl = el;
    const r = el.getBoundingClientRect();
    tip.style.display = 'block';
    // 先显示以测量宽度，再定位（居中于元素上方）
    const tw = tip.offsetWidth;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.top - tip.offsetHeight - 6;
    if (top < 8) top = r.bottom + 6; // 上方空间不足则显示在下方
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide() {
    activeEl = null;
    tip.style.display = 'none';
  }
  document.addEventListener('mouseover', (e) => {
    const fu = e.target.closest && e.target.closest('.fu');
    if (fu && fu !== activeEl) show(fu);
  });
  document.addEventListener('mouseout', (e) => {
    const fu = e.target.closest && e.target.closest('.fu');
    if (fu) hide();
  });
  window.addEventListener('scroll', hide, true);
})();

function getSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      apiBase: raw.apiBase || 'https://api.deepseek.com',
      modelName: raw.modelName || 'deepseek-v4-flash',
      genMode: raw.genMode || 'cache',
      lang: raw.lang || 'zh',
      themeMode: raw.themeMode || 'system',
      apiKey: raw.apiKey || '',
      deepseekApiKey: raw.deepseekApiKey || '',
      obsidianPath: raw.obsidianPath || '',
      ...raw
    };
  } catch(e) { return { apiBase: 'https://api.deepseek.com', modelName: 'deepseek-chat', genMode: 'cache', lang: 'zh', themeMode: 'system', apiKey: '', deepseekApiKey: '', obsidianPath: '' }; }
}

// ===== Theme (3-state: system / light / dark) =====
function toggleTheme() {
  const s = getSettings();
  const currentMode = s.themeMode || 'system';
  const currentAttr = document.documentElement.getAttribute('data-theme');
  const isDark = currentAttr === 'dark' || (!currentAttr && window.matchMedia('(prefers-color-scheme: dark)').matches);
  // If in system mode, clicking toggles to manual; otherwise flip light↔dark
  let newMode;
  if (currentMode === 'system') {
    newMode = isDark ? 'light' : 'dark';
  } else {
    newMode = isDark ? 'light' : 'dark';
  }
  applyThemeMode(newMode);
  // Sync settings panel radio
  const radio = document.querySelector(`input[name="themeMode"][value="${newMode}"]`);
  if (radio) radio.checked = true;
}
/** 同步滑动开关 UI 状态（checked=暗色），同时处理首页与阅读器内的开关 */
function syncThemeSwitch(isDark) {
  document.querySelectorAll('.theme-switch input').forEach(input => { input.checked = isDark; });
  document.querySelectorAll('.theme-switch-wrap').forEach(wrap => {
    const labels = wrap.querySelectorAll('.theme-label');
    labels.forEach((el, i) => el.classList.toggle('active-label', i === (isDark ? 1 : 0)));
  });
}

// ===== Settings Panel =====
function openSettings() { document.getElementById('settingsPanel').classList.add('open'); document.getElementById('settingsOverlay').classList.add('open'); }
function closeSettings() { document.getElementById('settingsPanel').classList.remove('open'); document.getElementById('settingsOverlay').classList.remove('open'); }

// ===== Markdown Parse =====
function parseMarkdown(md) {
  const layers = [];
  const parts = md.split(/\n---\s*\n/);
  let currentLayer = null;

  for (const part of parts) {
    const layerMatch = part.match(/##\s*第[一二三四五]层[：:·\-—\s]*\s*(.+)/);
    if (layerMatch) {
      const layerNames = { '一瞥': '一瞥', '全景地图': '全景地图', '深层逻辑': '深层逻辑', '拓展应用': '拓展应用', '渐进学习': '渐进学习' };
      const rawName = layerMatch[1].trim().replace(/[（(].*?[)）]/, '');
      const timeMap = { '一瞥': '≤30秒', '全景地图': '≤2分钟', '深层逻辑': '5-8分钟', '拓展应用': '3-5分钟', '渐进学习': '不限' };
      currentLayer = { name: rawName, estimatedTime: timeMap[rawName] || '', modules: [] };
      layers.push(currentLayer);
    }

    const modMatches = part.matchAll(/###\s*(\d+\w?)\.\s*(.+?)\n([\s\S]*?)(?=###\s*\d+|$)/g);
    for (const m of modMatches) {
      if (currentLayer) {
        currentLayer.modules.push({ id: m[1].trim(), title: m[2].trim(), content: m[3].trim() });
      }
    }
  }

  // Fallback: if no layers parsed, treat whole thing as single module
  if (layers.length === 0) {
    layers.push({ name: '全部内容', estimatedTime: '不限', modules: [{ id: '1', title: '内容', content: md }] });
  }

  return { layers };
}

function extractGlossary(md) {
  const glossary = [];
  // Find module 10 content (核心概念索引)
  const m10 = md.match(/###\s*10[.\s、]\s*核心概念[^\n]*\n([\s\S]*?)(?=###\s*\d|$)/);
  if (m10) {
    const lines = m10[1].split('\n');
    for (const line of lines) {
      let match = line.match(/(?:[-*]|\d+\.)\s*\*\*(.+?)\*\*[：:]\s*(.+)/);
      if (!match) match = line.match(/(?:[-*]|\d+\.)\s*\*\*(.+?)\*\*\s*[-—]\s*(.+)/);
      if (match) glossary.push({ term: match[1].trim(), content: match[2].trim() });
    }
  }
  return glossary;
}

function extractGlossaryFromContent(content) {
  const glossary = [];
  const lines = content.split('\n');
  for (const line of lines) {
    // 格式1: - **术语**：解释 或 1. **术语**: 解释
    let match = line.match(/(?:[-*]|\d+\.)\s*\*\*(.+?)\*\*[：:]\s*(.+)/);
    // 格式2: - **术语** - 解释
    if (!match) match = line.match(/(?:[-*]|\d+\.)\s*\*\*(.+?)\*\*\s*[-—]\s*(.+)/);
    // 格式3: **术语**：解释（无前导列表标记）
    if (!match) match = line.match(/^\s*\*\*(.+?)\*\*[：:]\s*(.+)/);
    // 格式4: **术语** - 解释（无前导列表标记）
    if (!match) match = line.match(/^\s*\*\*(.+?)\*\*\s*[-—]\s*(.+)/);
    if (match) glossary.push({ term: match[1].trim(), content: match[2].trim() });
  }
  return glossary;
}

/** 词条导出：直接使用完整框架 markdown，确保内容不缺失 */
function extractTermFullContent(termName, fullMarkdown) {
  return fullMarkdown || null;
}

// ===== LLM Call =====
async function callLLM(concept, searchResults) {
  const s = getSettings();
  if (!s.apiKey) throw new Error('请先设置 API Key');

  const resp = await fetch(`${s.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s.apiKey}`
    },
    body: JSON.stringify({
      model: s.modelName || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: buildSystemPrompt(concept, searchResults) },
        { role: 'user', content: '请开始生成。' }
      ],
      temperature: 0.7,
      max_tokens: 16000
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content;
}

// ===== 结构化 JSON LLM 调用（事实核对用） =====
// systemContent / userContent 直接传文本；返回解析后的对象，失败抛错
// opts: { temperature, max_tokens } —— v20 概念勘定传 {temperature:0.05, max_tokens:2048}
async function callLLMJson(systemContent, userContent, opts) {
  const s = getSettings();
  if (!s.apiKey) throw new Error('请先设置 API Key');
  const temperature = (opts && typeof opts.temperature === 'number') ? opts.temperature : 0.2;
  const max_tokens = (opts && typeof opts.max_tokens === 'number') ? opts.max_tokens : 4000;
  const resp = await fetch(`${s.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s.apiKey}`
    },
    body: JSON.stringify({
      model: s.modelName || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent }
      ],
      temperature: temperature,
      max_tokens: max_tokens
    })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  let text = data.choices[0].message.content || '';
  // 去掉可能的 ```json 代码围栏
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  const objStart = text.indexOf('{');
  const objEnd = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && start < (objStart === -1 ? Infinity : objStart)) {
    return JSON.parse(text.substring(start, end + 1));
  }
  if (objStart !== -1 && objEnd !== -1) {
    return JSON.parse(text.substring(objStart, objEnd + 1));
  }
  throw new Error('LLM 未返回可解析的 JSON');
}

// ===== 流式 LLM 调用（变更单-43） =====
// systemPromptOverride: v20 直接传入已注入事实的 system prompt；缺省则按传统方式构建
async function callLLMStream(concept, searchResults, onChunk, systemPromptOverride) {
  const s = getSettings();
  if (!s.apiKey) throw new Error('请先设置 API Key');

  const systemContent = (typeof systemPromptOverride === 'string' && systemPromptOverride)
    ? systemPromptOverride
    : buildSystemPrompt(concept, searchResults);

  const resp = await fetch(`${s.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${s.apiKey}`
    },
    body: JSON.stringify({
      model: s.modelName || 'deepseek-v4-flash',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: '请开始生成。' }
      ],
      temperature: 0.7,
      max_tokens: 16000,
      stream: true
    })
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API 错误 ${resp.status}: ${err}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const dataStr = line.slice(6).trim();
      if (dataStr === '[DONE]') break;
      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          if (onChunk) onChunk(delta, fullContent);
        }
      } catch (_) {}
    }
  }

  return fullContent;
}

// ===================================================================
// ===== v25 DeepSeek 搜索管道（替换死掉的四级降级） =====

const DEEPSEEK_API_BASE = 'https://api.deepseek.com';

/**
 * 用 DeepSeek 联网搜索获取概念资料。
 * 返回 { content: 搜索结果文本, urlCandidates: 来源URL列表, totalTokens: token用量 } 或 null
 */
async function searchWithDeepSeek(concept) {
  const s = getSettings();
  const dsKey = s.deepseekApiKey || s.apiKey;
  if (!dsKey) return null;

  const searchPrompt = `请通过联网搜索全面检索以下概念的资料，用中文回复。

概念：「${concept}」

要求：
1. 先判断这是什么：学术概念/技术术语/财经知识/娱乐作品/流行文化/其他
2. 如果是具体作品（影视/综艺/小说/游戏等），请检索该作品的：创作背景、主要内容、核心设定、社会影响
3. 如果是学术/技术概念，请检索：核心定义、历史发展（带年份）、关键人物、最新进展
4. 如果是财经知识，请检索：定义、计算公式、应用场景、注意事项
5. 每条信息尽量标注来源 URL
6. 如果确实搜不到任何相关资料，注明「未找到可靠来源」
7. 回复控制在 2000 字以内，用 markdown 格式组织`;

  try {
    const resp = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dsKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个严谨的研究助手。只基于联网搜索的实际结果回答，不确定就诚实说明。' },
          { role: 'user', content: searchPrompt }
        ],
        enable_search: true,
        max_tokens: 3000,
        temperature: 0.3
      })
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.warn('DeepSeek search error:', resp.status, err);
      // 401 认证失败：抛出明确错误，不让它静默降级到 wiki 管道
      if (resp.status === 401) {
        var authErr = new Error('DEEPSEEK_AUTH_FAILED (401): ' + err);
        authErr.isAuthError = true;
        throw authErr;
      }
      return null;
    }

    const data = await resp.json();
    const content = data.choices[0].message.content || '';
    
    // 提取 URL
    const urlRegex = /https?:\/\/[^\s\)\]>]+/g;
    const urls = [...new Set(content.match(urlRegex) || [])].slice(0, 5);

    return {
      content,
      urlCandidates: urls,
      totalTokens: (data.usage || {}).total_tokens || 0
    };
  } catch (e) {
    console.warn('searchWithDeepSeek error:', e.message);
    return null;
  }
}

/**
 * 交叉验证：对 DeepSeek 搜索结果进行事实核查
 * 不依赖搜索功能，只用模型知识交叉比对搜索结果中的事实断言
 * @returns {{ confidence: number, summary: string, verified: number, plausible: number, unverifiable: number, suspicious: number }}
 */
async function crossVerify(searchContent, concept) {
  const s = getSettings();
  const dsKey = s.deepseekApiKey || s.apiKey;
  if (!dsKey) return { confidence: 0.5, summary: 'API未配置，跳过验证' };

  const verifyPrompt = `请对以下关于「${concept}」的搜索结果进行事实核查。

搜索结果：
${searchContent.slice(0, 2500)}

请输出一个 JSON 对象（只输出 JSON，不要 markdown）：
{
  "totalFacts": 搜索结果中可识别的事实断言数,
  "confirmed": 能交叉验证确认真实的断言数,
  "plausible": 合理但无法确认的断言数,
  "unverifiable": 完全无法验证的断言数,
  "suspicious": 明显有误或高度可疑的断言数,
  "confidence": 0.0到1.0之间的总体可信度,
  "keyIssues": ["2-3个需要警惕的可疑之处"]
}`;

  try {
    const resp = await fetch(`${DEEPSEEK_API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${dsKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是事实核查员。只输出纯净 JSON，不要解释。' },
          { role: 'user', content: verifyPrompt }
        ],
        max_tokens: 600,
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    if (!resp.ok) return { confidence: 0.5, summary: '验证服务暂不可用' };

    const data = await resp.json();
    const raw = data.choices[0].message.content || '{}';
    const result = JSON.parse(raw);
    const confidence = typeof result.confidence === 'number' ? result.confidence
      : (result.confirmed || 0) / Math.max((result.totalFacts || 1), 1);

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      summary: Array.isArray(result.keyIssues) ? result.keyIssues.join('；') : (result.keyIssues || ''),
      verified: result.confirmed || 0,
      plausible: result.plausible || 0,
      unverifiable: result.unverifiable || 0,
      suspicious: result.suspicious || 0
    };
  } catch (e) {
    console.warn('crossVerify error:', e.message);
    return { confidence: 0.5, summary: '验证异常: ' + e.message };
  }
}

/**
 * 素材质量评估：优先用交叉验证确认率，回退到旧版启发式算法
 * @param {object} dsResult - DeepSeek 搜索结果
 * @param {object} verification - crossVerify() 返回结果（可选）
 * @returns {string} 'rich' | 'medium' | 'poor' | 'barren'
 */
function assessMaterialQuality(dsResult, verification) {
  if (!dsResult || !dsResult.content) return 'barren';

  const text = dsResult.content;
  const noSource = /未找到.*来源|暂无.*资料|无.*相关.*信息|没有.*搜索.*结果/.test(text);
  if (noSource) return 'barren';

  // 优先使用交叉验证确认率
  const confidence = (verification && typeof verification.confidence === 'number')
    ? verification.confidence
    : null;

  if (confidence !== null) {
    if (confidence >= 0.8)  return 'rich';
    if (confidence >= 0.5)  return 'medium';
    if (confidence >= 0.2)  return 'poor';
    return 'barren';
  }

  // 回退：旧版启发式评分
  const len = text.length;
  const hasUrls = (dsResult.urlCandidates || []).length >= 1;
  const hasYears = /\d{4}\s*年/.test(text) || /\b(19|20)\d{2}\b/.test(text);
  const hasNames = /[A-Z][a-z]+ [A-Z][a-z]+/.test(text) || /[\u4e00-\u9fff]{2,4}(博士|教授|提出|发明|创立|发现)/.test(text);

  let score = 0;
  score += Math.min(len / 200, 5);
  score += hasUrls ? 2 : 0;
  score += hasYears ? 2 : 0;
  score += hasNames ? 1 : 0;

  if (score >= 7) return 'rich';
  if (score >= 4) return 'medium';
  return 'poor';
}

/**
 * 模块防编造等级
 * P0 = 绝对禁止编造（来源不足直接跳过）
 * P1 = 可以推演但要限制篇幅（没有来源时缩减，不展开）
 * P2 = 可以自由生成（出错危害最小）
 */
const MODULE_FABRICATE_LEVEL = {
  1:  'P1',  // 核心定义
  2:  'P1',  // 领域分类
  3:  'P0',  // 发展脉络 — 需要真实年份/事件
  4:  'P1',  // 常见误区
  5:  'P0',  // 底层原理 — 科学类错了就是知识污染
  6:  'P0',  // 最新前沿 — 最严重幻觉区
  7:  'P1',  // 核心难题
  8:  'P2',  // 跨领域连接
  9:  'P0',  // 现实映射 — 需要真实公司/产品/场景
  10: 'P2',  // 核心概念索引
  11: 'P2',  // 推荐学习路径
  12: 'P1'   // 工具箱 — 工具名不能编
};

/**
 * 根据素材质量等级生成模块选择指令和防编造约束（注入 system prompt）
 */
function getModuleConfig(quality) {
  // 构建 P0/P1/P2 模块清单
  const p0Modules = Object.entries(MODULE_FABRICATE_LEVEL)
    .filter(([_, lv]) => lv === 'P0').map(([n]) => parseInt(n));
  const p1Modules = Object.entries(MODULE_FABRICATE_LEVEL)
    .filter(([_, lv]) => lv === 'P1').map(([n]) => parseInt(n));
  const p2Modules = Object.entries(MODULE_FABRICATE_LEVEL)
    .filter(([_, lv]) => lv === 'P2').map(([n]) => parseInt(n));

  const p0Names = p0Modules.map(n => `模块${n}`).join('、');
  const p1Names = p1Modules.map(n => `模块${n}`).join('、');

  const commonRules = `
【模块防编造等级 — 全局约束】
P0 模块（${p0Names}）：只能使用搜索结果中的真实信息。如果来源中没有对应内容，**必须**标注「⚠️ 暂无可靠来源」——严禁编造人名、年份、数据、事件、公司名。
P1 模块（${p1Names}）：优先使用搜索结果。不确定的内容标注「有待验证」。素材贫乏时缩减到 1/3 篇幅。
P2 模块（其余）：可结合已知知识生成，但不可编造具体数据或引用。`;

  switch (quality) {
    case 'rich':
      return {
        modules: 'full',
        instruction: '素材充足，请按标准 12 模块完整生成。' + commonRules,
        requireSource: '每个带具体事实的模块末尾标注信息来源。P0 模块中每个事实断言必须可以追溯到来源。',
        noFabricateConfig: MODULE_FABRICATE_LEVEL
      };
    case 'medium':
      return {
        modules: 'core',
        instruction: `素材中等。只生成以下模块：
  P0 模块（缩减模式）：模块3（发展脉络）、模块5（底层原理）、模块6（最新前沿）、模块9（现实映射）
    → 只写来源中明确有的内容，没有就写「⚠️ 暂无可��来源」，每个事实标注来源编号
  P1 模块（缩减模式）：模块1（核心定义）、模块2（领域分类）、模块4（常见误区）、模块7（核心难题）、模块12（工具箱）
    → 正常生成但篇幅减��，不确定处标注「有待验证」
  P2 模块：模块8（跨领域连接）、模块10（核心概念索引）、模块11（推荐学习路径）
    → 照常生成
  其余模块标注「> ⚠️ 现有资料不足以支撑该模块。\n」
  格式仍需保留完整的五层结构和模块编号，不可跳过层级标题。` + commonRules,
        requireSource: 'P0 模块每个事实断言末尾标注来源编号。P1 模块关键断言标注来源。',
        noFabricateConfig: MODULE_FABRICATE_LEVEL
      };
    case 'poor':
      return {
        modules: 'basic',
        instruction: `素材贫乏。只生成以下基础模块：
  P0 模块：全部跳过 → 标注「> ⚠️ 搜索结果深度不足，该模块需要更多参考资料。\n」
  P1 模块（仅限）：模块1（核心定义，80-150字）、模块4（常见误区，最多2条，标注「基于有限来源」）
  P2 模块：跳过（来源不足时这些模块意义不大）
  格式仍需保留完整的五层结构和模块编号。` + commonRules,
        requireSource: '明确标注搜索来源。如不确定请诚实说明。',
        noFabricateConfig: MODULE_FABRICATE_LEVEL
      };
    default: // barren
      return null;
  }
}

// ===== 第〇层：输入前置过滤（纯工程，零 LLM 消耗） =====
function validateInput(concept) {
  const trimmed = (concept || '').trim();
  if (!trimmed) return { pass: false, reason: '输入不能为空。' };
  const stripped = trimmed.replace(/\s/g, '');
  if (stripped.length < 1) return { pass: false, reason: '输入不能为空。' };
  if (stripped.length > 120) return { pass: false, reason: '输入过长，请精简到 120 字以内。' };
  // 纯符号/纯标点/纯空白（不含任何字母或数字）才视为无效；中文等 Unicode 字母属有效概念
  if (!/[\p{L}\p{N}]/u.test(stripped)) return { pass: false, reason: '请输入有意义的中文或英文概念。' };
  // 单英文字母拒绝
  if (/^[a-zA-Z]$/.test(stripped)) return { pass: false, reason: '请输入更具体的概念名称。' };
  // 提示词注入防护：连续 3+ 个 \n 或包含 prompt/system/instruction 等注入关键词
  if (trimmed.includes('\n\n\n') || /\b(?:ignore|disregard|bypass|override|pretend|system.?prompt|reset.?instruction)\b/i.test(trimmed)) {
    return { pass: false, reason: '输入含无效内容，请重新输入。' };
  }
  return { pass: true };
}

// ===== v24.1：Rust 代理 fetch（绕过 WebView CORS 和网络墙） =====
async function proxyFetch(url) {
  try {
    const T = window.__TAURI__;
    const invoke = (T && T.core && typeof T.core.invoke === 'function')
      ? T.core.invoke.bind(T.core)
      : null;
    if (!invoke) throw new Error('Tauri invoke 不可用');
    const result = await invoke('proxy_fetch', { url });
    if (result.error) return null;
    if (result.status >= 400) return null;
    // 如果返回 JSON 则解析，否则返回原始文本
    const ct = (result.content_type || '').toLowerCase();
    if (ct.includes('application/json') || ct.includes('+json')) {
      try {
        return JSON.parse(result.body);
      } catch {
        return result.body;
      }
    }
    return result.body;
  } catch (e) {
    console.warn('proxyFetch error:', e.message);
    return null;
  }
}

// ===== v24.1：中文维基百科精确匹配（直连 + 代理兜底） =====
async function fetchZhWikiExact(concept) {
  try {
    const url = `https://zh.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(concept)}&cllimit=10`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.query?.pages) return null;
    const pages = data.query.pages;
    // pageid < 0 表示页面不存在
    const pageId = Object.keys(pages)[0];
    if (pageId < 0) return null;
    const page = pages[pageId];
    if (!page || !page.extract || page.extract.length < 20) return null;
    // 排除消歧义页面
    if (page.extract.startsWith('维基百科消歧义页') || page.extract.includes('可能指') && page.extract.length < 200) return null;
    const cats = (page.categories || []).map(c => c.title.replace('Category:', '').replace('分类:', ''));
    return {
      source: 'zh_wiki',
      title: page.title,
      extract: page.extract,
      categories: cats,
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
    };
  } catch (e) {
    console.warn('fetchZhWikiExact error:', e.message);
    // 直连失败（被墙），尝试 Rust 代理
    return await fetchZhWikiExactViaProxy(concept);
  }
}

// ===== v24.1：中文维基代理兜底 =====
async function fetchZhWikiExactViaProxy(concept) {
  try {
    const url = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(concept)}&cllimit=10`;
    const data = await proxyFetch(url);
    if (!data || !data.query?.pages) return null;
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    if (pageId < 0) return null;
    const page = pages[pageId];
    if (!page || !page.extract || page.extract.length < 20) return null;
    if (page.extract.startsWith('维基百科消歧义页') || page.extract.includes('可能指') && page.extract.length < 200) return null;
    const cats = (page.categories || []).map(c => c.title.replace('Category:', '').replace('分类:', ''));
    return {
      source: 'zh_wiki',
      title: page.title,
      extract: page.extract,
      categories: cats,
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
    };
  } catch (e) {
    console.warn('fetchZhWikiExactViaProxy error:', e.message);
    return null;
  }
}

// ===== v24.1：英文维基百科精确匹配（直连 + 代理兜底） =====
// 先用中文概念搜英文维基，不行则基于中文拆词构建英文搜索词
async function fetchEnWikiExact(concept) {
  try {
    // 直接尝试用中文概念搜索英文维基（Wikipedia 支持跨语言重定向）
    let url = `https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(concept)}&cllimit=10`;
    let resp = await fetch(url);
    if (!resp.ok) return null;
    let data = await resp.json();
    if (!data.query?.pages) return null;
    let pageId = Object.keys(data.query.pages)[0];
    
    // 如果中文直接匹配失败，尝试用拼音/翻译搜索
    if (pageId < 0) {
      // 用中文概念搜索英文维基的 search API 获取匹配标题
      const searchUrl = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(concept)}&srlimit=1&format=json`;
      const sr = await fetch(searchUrl);
      if (!sr.ok) return null;
      const srData = await sr.json();
      if (!srData.query?.search?.length) return null;
      const title = srData.query.search[0].title;
      url = `https://en.wikipedia.org/w/api.php?origin=*&action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(title)}&cllimit=10`;
      resp = await fetch(url);
      if (!resp.ok) return null;
      data = await resp.json();
      if (!data.query?.pages) return null;
      pageId = Object.keys(data.query.pages)[0];
    }
    
    if (pageId < 0) return null;
    const page = data.query.pages[pageId];
    if (!page || !page.extract || page.extract.length < 20) return null;
    const cats = (page.categories || []).map(c => c.title.replace('Category:', ''));
    return {
      source: 'en_wiki',
      title: page.title,
      extract: page.extract,
      categories: cats,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
    };
  } catch (e) {
    console.warn('fetchEnWikiExact error:', e.message);
    return await fetchEnWikiExactViaProxy(concept);
  }
}

// ===== v24.1：英文维基代理兜底 =====
async function fetchEnWikiExactViaProxy(concept) {
  try {
    let url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(concept)}&cllimit=10`;
    let data = await proxyFetch(url);
    if (!data || !data.query?.pages) return null;
    let pageId = Object.keys(data.query.pages)[0];

    if (pageId < 0) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(concept)}&srlimit=1&format=json`;
      const srData = await proxyFetch(searchUrl);
      if (!srData || !srData.query?.search?.length) return null;
      const title = srData.query.search[0].title;
      url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|categories&exintro&explaintext&format=json&titles=${encodeURIComponent(title)}&cllimit=10`;
      data = await proxyFetch(url);
      if (!data || !data.query?.pages) return null;
      pageId = Object.keys(data.query.pages)[0];
    }

    if (pageId < 0) return null;
    const page = data.query.pages[pageId];
    if (!page || !page.extract || page.extract.length < 20) return null;
    const cats = (page.categories || []).map(c => c.title.replace('Category:', ''));
    return {
      source: 'en_wiki',
      title: page.title,
      extract: page.extract,
      categories: cats,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
    };
  } catch (e) {
    console.warn('fetchEnWikiExactViaProxy error:', e.message);
    return null;
  }
}

// ===== v24：DuckDuckGo Instant Answer API =====
async function searchDDG(concept) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(concept)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url);
    if (!resp.ok) return { snippets: [] };
    const data = await resp.json();
    const snippets = [];
    // Abstract (primary result)
    if (data.AbstractText && data.AbstractText.length > 20) {
      snippets.push({ text: data.AbstractText, engine: 'duckduckgo', url: data.AbstractURL || '' });
    }
    // Related topics (up to 5)
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics.slice(0, 5)) {
        if (t.Text && t.Text.length > 20) {
          snippets.push({ text: t.Text.split(' - ')[0], engine: 'duckduckgo', url: t.FirstURL || '' });
        }
      }
    }
    return { snippets };
  } catch (e) {
    console.warn('searchDDG error:', e.message);
    return { snippets: [] };
  }
}

// ===== v24：语义有效性判断 =====
function checkSemanticValidity(concept) {
  // 纯中文：至少包含一个汉字
  const hasHanzi = /[一-鿿]/.test(concept);
  // 纯英文/数字/混合：至少 2 个字母
  const isAlphaNum = /^[a-zA-Z0-9\s\-_]+$/.test(concept) && concept.replace(/\s/g, '').length >= 2;
  // 中英混合
  const isMixed = /[一-鿿]/.test(concept) && /[a-zA-Z]/.test(concept);
  
  if (hasHanzi || isAlphaNum || isMixed) {
    // 有效词：提供拆字/拆词解析
    const chars = concept.split('').filter(c => /[一-鿿]/.test(c) || /[a-zA-Z0-9]/.test(c));
    const decomposition = chars.length > 0
      ? `「${concept}」可拆解为：${chars.map((c, i) => {
          if (/[一-鿿]/.test(c)) return `"${c}"（${i + 1}）`;
          return c;
        }).join('、')}。这是一个有效的词汇/术语，但权威百科和主流搜索引擎中暂无专题条目。`
      : `「${concept}」是一个有效的术语，但权威百科和主流搜索引擎中暂无专题条目。`;
    return { valid: true, decomposition };
  }
  
  return { valid: false };
}

// ===== v24：来源质量判定（检查搜索结果中是否有权威来源） =====
function assessWebQuality(snippets) {
  if (!snippets || snippets.length === 0) return 'none';
  
  // 权威域名白名单：仅包含有编辑审核机制的来源
  const authoritativeDomains = [
    'wikipedia.org', 'wikimedia.org', 'wikiwand.com',
    'baike.baidu.com', 'baike.so.com', 'www.baike.com',
    '.gov.cn', '.gov', '.edu.cn', '.edu', '.ac.cn', '.ac.uk',
    'people.com.cn', 'xinhuanet.com', 'gmw.cn', 'cctv.com',
    'thepaper.cn', 'caixin.com', 'jiemian.com',
    'github.com', 'arxiv.org', 'stackoverflow.com'
  ];
  
  for (const s of snippets) {
    const url = (typeof s === 'string' ? '' : s.url) || '';
    for (const domain of authoritativeDomains) {
      if (url.includes(domain)) return 'reliable';
    }
  }
  
  return 'low_quality';
}

// ===== v25 预生成管道（DeepSeek 优先 + 旧管道兜底） =====
async function runV25PreGenerate(concept) {
  // 第〇层
  const v = validateInput(concept);
  if (!v.pass) return { abort: true, state: 'REJECT', message: v.reason };

  const prog = document.getElementById('progressText');

  // ===== 优先：DeepSeek 联网搜索 =====
  if (prog) prog.textContent = 'DeepSeek 联网检索中...';
  const dsResult = await searchWithDeepSeek(concept);
  
  if (dsResult && dsResult.content) {
    // 交叉验证：不要只看搜索结果有多少，要看有多可信
    if (prog) prog.textContent = '事实核查中...';
    const verification = await crossVerify(dsResult.content, concept);

    const quality = assessMaterialQuality(dsResult, verification);
    const modConfig = getModuleConfig(quality);

    if (modConfig) {
      // 素材够用，构建 DeepSeek 来源的 system prompt
      const wikiData = {
        source: 'deepseek_search',
        concept,
        searchContent: dsResult.content,
        urlCandidates: dsResult.urlCandidates || [],
        quality,
        moduleConfig: modConfig,
        verification  // 交叉验证结果，供 system prompt 标注可疑内容
      };
      return { abort: false, systemPrompt: buildSystemPrompt(concept, wikiData), urlCandidates: dsResult.urlCandidates || [] };
    }
    // barren: 素材枯竭也要诚实返回，不降级到会编造的旧管道
    if (quality === 'barren') {
      return {
        abort: true,
        state: 'NO_SOURCE',
        message: `关于「${concept}」，DeepSeek 搜索未找到可靠来源。\n\n请尝试：\n1. 使用更标准/通用的名称\n2. 如果是新词/小众概念，请提供参考链接\n3. 在 Obsidian 中已有该词条的可直接查看`
      };
    }
  }

  // ===== DeepSeek 搜索无结果或失败：不再降级到 wiki 管道 =====
  return {
    abort: true,
    state: 'NO_SOURCE',
    message: `关于「${concept}」，暂时无法获取可靠来源。\n\n请尝试：\n1. 检查 API Key 是否有效\n2. 使用更标准/通用的名称\n3. 如果是新词/小众概念，请稍后再试`
  };
}


// ===== 友好错误翻译（绝不让用户看到原始错误信息） =====
function friendlyError(err) {
  var msg = (err && err.message) ? err.message : String(err);
  // 提取 HTTP 状态码（兼容 `API 错误 401: ...` 与 `DEEPSEEK_AUTH_FAILED (401): ...`）
  var m = msg.match(/(\b\d{3}\b)/);
  var status = m ? m[1] : null;

  // API 认证失败（只匹配真正的 Key/认证类错误，不用万能 "invalid"）：
  // DeepSeek/Zhipu 典型认证错误关键词：invalid_api_key / authentication_error / InvalidAPIKey / Unauthorized / Incorrect API key
  if (status === '401' || status === '403' ||
      /invalid.?api.?key|authentication_error|unauthorized|incorrect\s+api\s+key/i.test(msg) ||
      msg.indexOf('请填写正确的api key') !== -1) {
    return { text: 'API Key 无效，请检查设置', action: 'openSettings', color: '#e67e22' };
  }
  // 余额 / 配额不足
  if (status === '402' || msg.indexOf('balance') !== -1 || msg.indexOf('quota') !== -1 || msg.indexOf('insufficient') !== -1) {
    return { text: 'DeepSeek 余额不足，请到平台充值后重试', action: 'openSettings', color: '#e67e22' };
  }
  // 无权限
  if (status === '403' || msg.indexOf('permission') !== -1 || msg.indexOf('forbidden') !== -1) {
    return { text: 'API Key 无权限（403），请检查 Key 状态', action: 'openSettings', color: '#e67e22' };
  }
  // 接口地址错误 / 模型名错误（DeepSeek 经常更新支持列表）
  if (status === '404' || msg.indexOf('not found') !== -1) {
    return { text: 'API 地址错误（404），请检查设置中的接口地址', action: null, color: '#e67e22' };
  }
  // 模型名不在支持列表中（DeepSeek 经常更新：deepseek-v4-pro / deepseek-v3 等）
  if (status === '400' && /supported API model names/i.test(msg)) {
    var modelsMatch = msg.match(/are\s+(.+?)(?:[。."]|$)/);
    var modelsHint = modelsMatch ? '当前支持：' + modelsMatch[1] : '请检查设置中的模型名称';
    return { text: '模型名不支持。' + modelsHint + '（请到设置里改成新模型名）', action: 'openSettings', color: '#e67e22' };
  }
  // API 限流 / 配额
  if (status === '429' || msg.indexOf('rate_limit') !== -1 || msg.indexOf('too many') !== -1) {
    return { text: 'API 调用太频繁，稍后再试', action: null, color: '#e67e22' };
  }
  // 服务端错误
  if (status && status.charAt(0) === '5') {
    return { text: 'DeepSeek 服务暂时不可用（' + status + '），请稍后重试', action: null, color: '#e67e22' };
  }
  // 网络问题
  if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('网络') !== -1) {
    return { text: '网络连接失败，请检查网络', action: null, color: '#e67e22' };
  }
  // 超时
  if (msg.indexOf('timeout') !== -1 || msg.indexOf('AbortError') !== -1 || msg.indexOf('超时') !== -1) {
    return { text: '请求超时，请重试', action: null, color: '#e67e22' };
  }
  // TypeError（通常是 wiki/CORS 等旧管道残留问题）
  if (msg.indexOf('TypeError') !== -1) {
    return { text: '生成过程遇到异常，请重试', action: null, color: '#b00020' };
  }
  // 兜底：带上状态码（若有），绝不让用户只看到一句莫名其妙的"生成失败"
  var suffix = status ? '（HTTP ' + status + '）' : '';
  return { text: '生成失败，请检查 API Key 与网络后重试' + suffix, action: null, color: '#b00020' };
}

// ===== Generate Flow =====
let currentConcept = '';
let readerState = { currentLayer: 0, totalLayers: 0 };
// 渐进管道状态（生成一层即并行核对下一层，逐层揭示）
let pipeline = null;

async function startGenerate() {
  const input = document.getElementById('conceptInput');
  const concept = input.value.trim();
  if (!concept) { input.focus(); return; }

  const s = getSettings();
  if (!s.apiKey) { openSettings(); return; }
  bootStep('[生成] 开始：' + concept + ' | Key=***' + (s.apiKey||'').slice(-4));

  currentConcept = concept;
  const btn = document.getElementById('genBtn');
  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');

  btn.disabled = true;
  bar.classList.add('active');

  try {
    // Check cache — TC-05: 缓存命中跳过进度条 active
    if ((s.genMode || 'cache') === 'cache') {
      text.textContent = '检查缓存...';
      fill.style.width = '10%';
      const cached = await dbGet('frameworks', concept);
      if (cached) {
        if (cached._cacheVersion !== CACHE_VERSION) {
          // 版本不匹配，旧缓存失效，继续走生成流程
        } else {
          bar.classList.remove('active');
          fill.style.width = '0%';
          renderResult(cached);
          saveHistory(concept);
          return;
        }
      }
    }

    // Check Obsidian vault（本地优先）
    if ((s.genMode || 'cache') === 'cache') {
      text.textContent = '检查本地知识库...';
      fill.style.width = '15%';
      const obsMd = await readFromObsidian(concept);
      if (obsMd) {
        const structure = parseMarkdown(obsMd);
        const glossary = extractGlossary(obsMd);
        bar.classList.remove('active');
        fill.style.width = '0%';
        renderResult({ concept, markdown: obsMd, structure, glossary });
        saveHistory(concept);
        return;
      }
    }

    // ===== v24 防幻觉管道：四级降级 =====
    const pre = await runV25PreGenerate(concept);
    bootStep('[生成] preGenerate 完成：abort=' + pre.abort + ' state=' + pre.state);
    if (pre.abort) {
      fill.style.width = '100%';
      // NO_SOURCE 也用更温和的颜色（橙色），NOT_FOUND 用红色
      text.style.color = (pre.state === 'NOT_FOUND') ? '#b00020' : '#b8860b';
      text.textContent = pre.message;
      text.style.whiteSpace = 'pre-line';
      bar.classList.remove('active');
      btn.disabled = false;
      return;
    }
    text.style.whiteSpace = '';
    const systemPrompt = pre.systemPrompt;
    fill.style.width = '15%';
    text.style.color = '';
    text.textContent = 'AI 正在生成...';

    const pipe = {
      concept: currentConcept,
      urlCandidates: pre.urlCandidates || [],
      rawLayers: [],
      genDone: [],
      verifiedMd: [],
      verDone: [],
      verPromises: [],
      structure: { layers: [] },
      glossary: [],
      streamDone: false,
      readerOpen: false,
      revealedUpTo: -1,
      totalLayers: 5,
      _progTarget: 15,
      _progTimer: null
    };
    pipeline = pipe;

    const layerProgress = {
      1: { pct: 25, label: '第一层·一瞥' },
      2: { pct: 40, label: '第二层·全景地图' },
      3: { pct: 55, label: '第三层·深层逻辑' },
      4: { pct: 70, label: '第四层·拓展应用' },
      5: { pct: 85, label: '第五层·渐进学习' },
    };
    let lastFinalizedK = -1; // 已定界（可送核对）的最高层索引(0-based)
    const headerRe = /##\s*第[一二三四五]层[：:·\-—\s]*\s*(.+)/g;

    // 进度缓动定时器：生成+核对合并驱动（阅读器未开时驱动首页条，开后驱动阅读器内细条）
    startPipelineProgress(pipe);
    bootStep('[生成] 调用 LLM 流式生成...');

    const markdown = await callLLMStream(concept, null, (delta, full) => {
      const matches = [...full.matchAll(headerRe)];
      const newCount = matches.length;
      // 当第 newCount 个层头出现，第 1..(newCount-1) 层已可定界（其后有下一层起点）
      for (let k = lastFinalizedK + 1; k <= newCount - 2; k++) {
        finalizeGeneratedLayer(pipe, k, full.slice(matches[k].index, matches[k + 1].index));
      }
      if (newCount - 2 > lastFinalizedK) lastFinalizedK = newCount - 2;
      // 进度标签：当前正在生成第 newCount 层（newCount>=1）
      const lp = layerProgress[newCount];
      if (lp) {
        pipe._progTarget = Math.max(pipe._progTarget, lp.pct);
        text.textContent = '正在生成：' + lp.label + '...';
      }
    }, systemPrompt);

    // 流结束：定界剩余层（最后一层没有后继边界）
    pipe.streamDone = true;
    {
      const matches = [...markdown.matchAll(headerRe)];
      const total = matches.length;
      pipe.totalLayers = total || 1;
      readerState.totalLayers = pipe.totalLayers;
      for (let k = 0; k < total; k++) {
        if (!pipe.genDone[k]) {
          const start = matches[k].index;
          const end = (k + 1 < total) ? matches[k + 1].index : markdown.length;
          finalizeGeneratedLayer(pipe, k, markdown.slice(start, end));
        }
      }
      if (total === 0) finalizeGeneratedLayer(pipe, 0, markdown);
      rebuildReaderDots(pipe.totalLayers);
    }

    // 等待所有层核对完成（兜底：保证最终回写的是已核对内容）
    await Promise.all(pipe.verPromises);
    if (pipe._progTimer) clearInterval(pipe._progTimer);
    bootStep('[生成] 流完成，层数=' + pipe.totalLayers + ' 准备打开阅读器...');

    // 拼接最终已核对内容，回写缓存 + Obsidian
    let finalMd = pipe.verifiedMd.filter(Boolean).join('\n---\n');
    // 在末尾追加参考链接（如存在）
    const urls = pipe.urlCandidates || [];
    if (urls.length > 0) {
      const refBlock = '\n\n---\n\n**参考链接**\n\n' + urls.map((u, i) => `来源「${i + 1}」：${u}`).join('\n');
      finalMd += refBlock;
    }
    const finalStructure = parseMarkdown(finalMd);
    const finalGlossary = extractGlossary(finalMd);
    const now = Date.now();
    await dbPut('frameworks', {
      concept: currentConcept, markdown: finalMd, structure: finalStructure,
      glossary: finalGlossary, urlCandidates: pipe.urlCandidates || [], _cacheVersion: CACHE_VERSION, _verified: true,
      createdAt: now, updatedAt: now
    }).catch(() => {});
    for (const g of finalGlossary) {
      await dbPut('glossary', { term: g.term, content: g.content, parentConcept: currentConcept, createdAt: now }).catch(() => {});
    }
    try { syncToObsidian(currentConcept, finalMd, finalGlossary); } catch (e) {}

    // 若阅读器尚未打开（首层核对超时/失败兜底），强制打开（attachReaderShell 已挂上阅读器并隐藏首页，此处仅确保状态就绪）
    if (!pipe.readerOpen) {
      try { openReaderForPipe(pipe); }
      catch (e) { console.warn('[openReaderForPipe] 兜底开门异常（阅读器应已可见）:', e); }
    }

    const gfill = document.getElementById('readerGenFill');
    const gtext = document.getElementById('readerGenText');
    if (gfill) gfill.style.width = '100%';
    if (gtext) gtext.textContent = '已就绪';
    setTimeout(() => { const gb = document.getElementById('readerGenBar'); if (gb) gb.style.opacity = '0'; }, 1400);

    saveHistory(currentConcept);
    bar.classList.remove('active');

  } catch (err) {
    console.error(err);
    bootStep('[生成] 出错：' + ((err && err.message) || String(err)));
    // 立即停掉进度条动画（不��让 bar "跑完再弹窗"）
    if (pipeline && pipeline._progTimer) { clearInterval(pipeline._progTimer); pipeline._progTimer = null; }
    try {
      var fe = friendlyError(err);
      // 让用户看到友好提示 + 在下方灰色小字看到实际错误（方便排查）
      text.textContent = fe.text;
      text.style.color = fe.color || '#b00020';
      if (fe.action === 'openSettings') {
        setTimeout(function() { openSettings(); }, 600);
      }
      // 调试信息：把原始错误的第一句展示在进度文字下方
      var rawMsg = (err && err.message) ? err.message.split(/[\n\r]/)[0] : '';
      if (rawMsg && !rawMsg.includes(fe.text)) {
        var debugEl = document.getElementById('progressDebug');
        if (!debugEl) {
          debugEl = document.createElement('div');
          debugEl.id = 'progressDebug';
          debugEl.style.cssText = 'font-size:12px;color:#999;margin-top:4px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
          text.parentNode.appendChild(debugEl);
        }
        debugEl.textContent = '调试：' + rawMsg;
      }
    } catch(_) {}
  } finally {
    setTimeout(() => { btn.disabled = false; bar.classList.remove('active'); bar.style.display = ''; fill.style.width = '0%'; }, 800);
  }
}

// ===== Page Navigation =====
function showPage(pageId) {
  document.querySelectorAll('.page-state').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// ===== Render: 五层分页阅读流 =====

// 渲染单个 layer page（变更单-46 抽离，供首次渲染和增量追加共用）
function renderLayerPage(layer, idx, total, data) {
  const page = document.createElement('div');
  page.className = 'reader-page hidden';
  page.dataset.idx = idx;

  let modulesHtml = '';
  for (let mi = 0; mi < layer.modules.length; mi++) {
    const mod = layer.modules[mi];
    let content = '';
    let moduleExtraClass = '';
    const title = (mod.title || '').toLowerCase();
    // 清理 LLM 回显的 prompt 指令（不应暴露给用户）
    let rawContent = mod.content || '';
    rawContent = rawContent.replace(/[（(]?\s*P0\s*模块[，,]\s*(仅列出来源中明确信息|仅使用来源中明确信息|极度保守)[)）]?\s*(；来源未涉及处标注「⚠️ 暂无可靠来源」)?\s*/gi, '');
    rawContent = rawContent.replace(/[（(]\s*P0\s*模块[：:]\s*全部跳过[)）]?\s*/gi, '');
    rawContent = rawContent.replace(/^>\s*⚠️\s*搜索结果深度不足，该模块需要更丰富的参考资料。\s*/gmi, '');
    rawContent = rawContent.replace(/[（(]\s*缩减模式\s*[)）]\s*/gi, '');
    rawContent = rawContent.replace(/\n\s*P0\s*模块.*?\n/g, '\n');
    rawContent = rawContent.replace(/^⚠️\s*暂无可靠来源\s*$/gmi, '').trim();

    // 领域分类 → 思维导图 SVG
    if (title.includes('领域分类') || title.includes('分类')) {
      const categories = parseMindmapCategories(rawContent);
      if (categories.length > 0) {
        content = generateMindmapDOM(data.concept, categories);
        moduleExtraClass = ' module-mindmap';
      } else {
        content = marked.parse(rawContent);
      }
    }
    // 发展脉络 → 时间轴 SVG
    else if (title.includes('发展脉络') || title.includes('时间线') || title.includes('历史')) {
      const tlItems = parseTimelineItems(rawContent);
      content = generateTimelineHTML(rawContent);
      moduleExtraClass = ' module-timeline';
      if (tlItems.length > 0) {
        content += `<span data-tl-items="${encodeURIComponent(JSON.stringify(tlItems))}" hidden></span>`;
      }
    }
    // 常见误区 → 结构化 HTML
    else if (title.includes('常见误区') || title.includes('误区')) {
      content = generateMisconHTML(rawContent);
    }
    // 5 底层原理 → 可折叠手风琴
    else if (title.includes('底层原理') || title.includes('原理')) {
      content = generateAccordionHTML(rawContent);
      moduleExtraClass = ' module-accordion';
    }
    // 6 最新前沿 → 渐进式逐段展开
    else if (title.includes('最新前沿') || title.includes('前沿')) {
      content = generateProgressiveHTML(rawContent);
      moduleExtraClass = ' module-progressive';
    }
    // 7 核心难题 → 卡片网格 (issue)
    else if (title.includes('核心难题') || title.includes('难题')) {
      content = generateCardGridHTML(rawContent, 'issue');
      moduleExtraClass = ' module-cards';
    }
    // 9 现实映射 → 卡片网格 (scenario)
    else if (title.includes('现实映射') || title.includes('现实')) {
      content = generateCardGridHTML(rawContent, 'scenario');
      moduleExtraClass = ' module-cards';
    }
    // 11 推荐学习路径 → 卡片网格 (path)
    else if (title.includes('推荐学习路径') || title.includes('学习路径')) {
      content = generateCardGridHTML(rawContent, 'path');
      moduleExtraClass = ' module-path';
    }
    // 12 工具箱 → 卡片网格 (tool)
    else if (title.includes('工具箱') || title.includes('工具')) {
      content = generateCardGridHTML(rawContent, 'tool');
      moduleExtraClass = ' module-cards';
    }
    // 10 核心概念索引 → 卡片网格（变更单-62）
    else if (title.includes('核心概念') || title.includes('术语')) {
      const terms = (data.glossary && data.glossary.length > 0)
        ? data.glossary
        : extractGlossaryFromContent(rawContent);
      if (terms.length > 0) {
        let cardsHtml = '<div class="glossary-cards">';
        for (const g of terms) {
          const termEsc = esc(g.term);
          const descFull = esc(g.content || '');
          cardsHtml += `<div class="glossary-card" data-term="${termEsc}">
            <div class="card-term">${termEsc}</div>
            <div class="card-desc">${descFull}</div>
            <button class="card-jump" onclick="jumpToTerm('${termEsc}', event)">→ 深入探索</button>
          </div>`;
        }
        cardsHtml += '</div>';
        content = cardsHtml;
      } else {
        content = marked.parse(rawContent);
        content = content.replace(/<p>(<strong>[^<]+<\/strong>)([\s\S]*?)<\/p>/g, '<div class="mod-row"><span class="mod-label">$1</span><span class="mod-val">$2</span></div>');
      }
    }
    // 8 跨领域连接 → 小标题胶囊化
    else if (title.includes('跨领域') || title.includes('跨域')) {
      let html = marked.parse(rawContent);
      html = html.replace(/<strong>([^<]+)<\/strong>/g, '<span class="cross-pill">$1</span><br>');
      content = html;
    }
    else {
      content = marked.parse(rawContent);
      // 将 <p><strong>标签</strong>内容...</p> 转为结构化行，换行后内容对齐
      content = content.replace(/<p>(<strong>[^<]+<\/strong>)([\s\S]*?)<\/p>/g, '<div class="mod-row"><span class="mod-label">$1</span><span class="mod-val">$2</span></div>');
    }

    modulesHtml += `<div class="module" style="animation-delay:${mi * 0.06}s">
      <div class="module-title">${esc(mod.id)}. ${esc(mod.title)}</div>
      <div class="module-content${moduleExtraClass}" id="mod-${idx}-${esc(mod.id)}">${content}</div>
    </div>`;
  }

  const isLast = idx === total - 1;
  page.innerHTML = `
    <div class="reader-page-head">
      <div class="layer-num">第 ${idx + 1} / ${readerState.totalLayers} 层</div>
      <h2>${esc(layer.name)}</h2>
      <div class="time">预计阅读：${esc(layer.estimatedTime)}</div>
    </div>
    <div class="layer-modules">${modulesHtml}</div>
  `;

  // 时间轴真实性核验（异步，不阻塞页面渲染）
  const tlMods = page.querySelectorAll('.module-timeline .module-content');
  for (const tlMod of tlMods) {
    const itemsEl = tlMod.querySelector('[data-tl-items]');
    if (!itemsEl) continue;
    const items = JSON.parse(decodeURIComponent(itemsEl.getAttribute('data-tl-items')));
    if (items.length === 0) continue;
    const loading = document.createElement('div');
    loading.className = 'tl-verify mm-verify-loading';
    loading.textContent = '正在核验时间轴数据真实性...';
    tlMod.appendChild(loading);
    verifyTimelineDates(items).then(results => {
      loading.outerHTML = renderVerifyPanel(results);
    }).catch(() => {
      loading.textContent = '核验暂不可用（网络异常）';
    });
  }

  return page;
}

// 增量追加第 4、5 层（变更单-46）
function appendRemainingLayers(data, fromIdx) {
  const pagesContainer = document.getElementById('readerPages');
  const reader = document.getElementById('reader');
  if (!pagesContainer || !reader) return;

  const layers = data.structure.layers;
  const total = layers.length;

  // 移除旧最后一层的 reader-actions（如果有）
  const oldLastPage = pagesContainer.querySelector('.reader-page:last-child');
  if (oldLastPage) {
    const actions = oldLastPage.querySelector('.reader-actions');
    if (actions) actions.remove();
  }

  // 追加新层
  for (let idx = fromIdx; idx < total; idx++) {
    const page = renderLayerPage(layers[idx], idx, total, data);
    pagesContainer.appendChild(page);
  }

  // 更新 dots 导航
  const dotsContainer = reader.querySelector('.reader-dots');
  dotsContainer.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('div');
    dot.className = 'reader-dot';
    dot.dataset.idx = i;
    if (i === readerState.currentLayer) dot.classList.add('active');
    if (i < readerState.currentLayer) dot.classList.add('done');
    dotsContainer.appendChild(dot);
  }

  // 更新状态
  readerState.totalLayers = 5;
  readerState.sources = data.sources || [];
  goToLayer(readerState.currentLayer);
}

// ===== 事实核对进度（复用首页进度条 + 时间驱动） =====
let _factTimer = null;
let _factStartTime = 0;
const FACT_TIME_CAP = 12000; // 12 秒上限
const FACT_START_PCT = 86;   // 核对阶段起始百分比（生成在 ~85% 结束）

function showFactProgress() {
  _factStartTime = Date.now();
  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (bar && fill && text) {
    bar.classList.add('active');
    bar.style.display = '';
    fill.style.width = FACT_START_PCT + '%';
    text.textContent = '正在抽取可核查事实…';
  }
  // 时间驱动：每秒推进 ~1.17%（12 秒从 86% → 100%）
  if (_factTimer) clearInterval(_factTimer);
  _factTimer = setInterval(() => {
    const elapsed = Date.now() - _factStartTime;
    const timePct = Math.min(FACT_START_PCT + (elapsed / FACT_TIME_CAP) * (100 - FACT_START_PCT), 98);
    const f = document.getElementById('progressFill');
    if (f) f.style.width = Math.round(timePct) + '%';
  }, 1000);
}

function hideFactProgress() {
  if (_factTimer) { clearInterval(_factTimer); _factTimer = null; }
}

function updateFactProgress(p) {
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  if (!fill || !text) return;

  if (p.phase === 'extract') {
    text.textContent = '正在抽取可核查事实…';
    // 保持时间驱动，不覆盖
  } else if (p.phase === 'verify') {
    const ratio = p.total > 0 ? p.done / p.total : 0;
    const actualPct = FACT_START_PCT + ratio * (100 - FACT_START_PCT);
    // 取时间驱动和实际进度的较大值，让实际进度可以超前
    const elapsed = Date.now() - _factStartTime;
    const timePct = FACT_START_PCT + (elapsed / FACT_TIME_CAP) * (100 - FACT_START_PCT);
    const showPct = Math.max(actualPct, Math.min(timePct, 98));
    fill.style.width = Math.round(showPct) + '%';
    text.textContent = `正在核对事实 ${p.done}/${p.total} · ${Math.round(ratio * 100)}%`;
  } else if (p.phase === 'done') {
    if (_factTimer) { clearInterval(_factTimer); _factTimer = null; }
    fill.style.width = '100%';
    text.textContent = '事实核对完成，即将展示…';
  }
}

async function renderResult(data) {
  pipeline = null; // 完整渲染（缓存/Obsidian/子词条/重新生成）不使用渐进管道
  // 事实核对门控：未核对过的内容，先静默修正再展示（绝不让用户看到未核对内容）
  if (!data._verified) {
    showFactProgress();
    try {
      const patched = await factCheckAndPatch(data.markdown, data.concept, updateFactProgress);
      data.markdown = patched.markdown;
      data.structure = parseMarkdown(patched.markdown);
      data.glossary = extractGlossary(patched.markdown);
      data.verificationSummary = patched.summary;
    } catch (e) {
      console.warn('[factCheck] 核对异常，按原内容渲染:', e);
    }
    data._verified = true; // 标记，避免重复核对 / 缓存读回时跳过
    hideFactProgress();
    // 回写：缓存存正确版；Obsidian 存带来源标记的正确版
    try { await dbPut('frameworks', data); } catch (e) {}
    try { syncToObsidian(data.concept, data.markdown, data.glossary); } catch (e) {}
  }
  const structure = data.structure || parseMarkdown(data.markdown);
  const glossary = data.glossary || [];
  const layers = structure.layers;
  const total = layers.length || 5;
  readerState = { currentLayer: 0, totalLayers: total, sources: [], concept: data.concept };

  const reader = attachReaderShell(data);
  const pagesContainer = reader.querySelector('#readerPages');
  layers.forEach((layer, idx) => {
    const page = renderLayerPage(layer, idx, total, data);
    if (idx === 0) page.classList.remove('hidden');
    pagesContainer.appendChild(page);
  });

  updateReaderNav();
  reader.focus();
  // 参考链接：优先用缓存的 urlCandidates，老缓存则从正文提取
  let refUrls = data.urlCandidates || [];
  if (!refUrls.length && data.markdown) {
    refUrls = extractUrlsFromMarkdown(data.markdown);
  }
  startSourceVerify(data.concept, refUrls);
}

// ===== 阅读器外壳（完整渲染 & 渐进管道共用） =====
function readerShellHTML() {
  let dotsHtml = '';
  for (let i = 0; i < readerState.totalLayers; i++) {
    dotsHtml += `<div class="reader-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`;
  }
  return `
    <div class="reader-progress">
      <div class="reader-row-1">
        <span class="reader-brand">frame</span>
        <div class="theme-switch-wrap">
          <span class="theme-label" data-i18n="reader_theme_light">浅色</span>
          <label class="theme-switch">
            <input type="checkbox" onchange="toggleTheme()" aria-label="切换明暗主题">
            <span class="theme-slider"></span>
          </label>
          <span class="theme-label" data-i18n="reader_theme_dark">暗色</span>
        </div>
      </div>
      <div class="reader-row-2">
        <div class="reader-left">
          <button class="reader-back" onclick="closeReader()" data-i18n="reader_back">返回</button>
        </div>
        <div class="reader-dots">${dotsHtml}</div>
        <div class="reader-right">
          <div class="reader-capsules">
            <button class="reader-capsule" onclick="toggleSourcePanel();" title="查看来源" data-i18n="reader_sources">来源</button>
            <button class="reader-capsule" onclick="toggleReaderSearch();" title="搜索 (Ctrl+F / Cmd+F)" data-i18n="reader_search">搜索</button>
            <button class="reader-capsule" onclick="confirmRegenerate(readerConcept())" data-i18n="reader_regenerate">重置</button>
            <button class="reader-capsule" onclick="toggleExportMenu(event)" title="导出" data-i18n="reader_export">导出</button>
          </div>
          <div class="reader-more-wrap">
            <button class="reader-more-btn" onclick="toggleReaderMore(this)" title="更多操作"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;display:block"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="reader-more-menu">
              <button class="reader-more-item" onclick="toggleSourcePanel();closeReaderMore()" data-i18n="reader_sources">来源</button>
              <button class="reader-more-item" onclick="toggleReaderSearch();closeReaderMore()" data-i18n="reader_search">搜索</button>
              <button class="reader-more-item" onclick="confirmRegenerate(readerConcept());closeReaderMore()" data-i18n="reader_regenerate">重置</button>
              <button class="reader-more-item" onclick="toggleExportMenu(event);closeReaderMore()" data-i18n="reader_export">导出</button>
            </div>
          </div>
        </div>
      </div>
      <div class="reader-genbar" id="readerGenBar">
        <div class="reader-genfill" id="readerGenFill"></div>
        <span class="reader-gentext" id="readerGenText"></span>
      </div>
    </div>
    <div class="reader-pages" id="readerPages"></div>
  `;
}

function attachReaderShell(data) {
  const oldReader = document.getElementById('reader');
  if (oldReader) oldReader.remove();

  const reader = document.createElement('div');
  reader.className = 'reader';
  reader.id = 'reader';
  reader.dataset.concept = data.concept;
  reader.innerHTML = readerShellHTML();
  // 动态插入的 reader 按钮需要刷新 i18n
  setLang(currentLang);
  document.body.appendChild(reader);
  // 导航按钮放在 reader 外部（body 直子），避免 reader 的 backdrop-filter 创建新包含块导致 fixed 失效
  const nav = document.createElement('div');
  nav.className = 'reader-nav';
  nav.id = 'readerNav';
  document.body.appendChild(nav);
  // 搜索框 / 来源面板同样移到 reader 外部，避免随阅读器内容滚动
  const sourcePanel = document.createElement('div');
  sourcePanel.id = 'sourcePanel'; sourcePanel.className = 'source-panel hidden';
  document.body.appendChild(sourcePanel);
  const searchPanel = document.createElement('div');
  searchPanel.id = 'readerSearchPanel'; searchPanel.className = 'reader-search-panel hidden';
  searchPanel.innerHTML = '<input id="readerSearchInput" type="text" placeholder="搜索当前框架（标题、模块、内容）" /><span id="readerSearchStatus"></span><button onclick="closeReaderSearch()">✕</button>';
  document.body.appendChild(searchPanel);
  const searchOverlay = document.createElement('div');
  searchOverlay.id = 'readerSearchOverlay'; searchOverlay.className = 'hidden';
  document.body.appendChild(searchOverlay);
  document.body.style.overflow = 'hidden';
  document.body.classList.add('reader-open');
  // 同步阅读器内主题开关到当前主题
  const curTheme = document.documentElement.getAttribute('data-theme');
  const isDarkNow = curTheme === 'dark' || (!curTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  syncThemeSwitch(isDarkNow);

  // 搜索事件绑定（searchInput 现在在 body 直子，不在 reader 内）
  const searchInput = document.getElementById('readerSearchInput');
  searchInput.addEventListener('input', e => performReaderSearch(e.target.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const dir = e.shiftKey ? -1 : 1;
      const next = readerSearchState.currentIdx + dir;
      if (next >= 0 && next < readerSearchState.matches.length) jumpToMatch(next);
    } else if (e.key === 'Escape') {
      closeReaderSearch();
    }
  });
  searchOverlay.addEventListener('click', closeReaderPopups);

  // 完整渲染（已就绪）时隐藏阅读器内细进度条
  if (data && data._verified) {
    const gb = document.getElementById('readerGenBar');
    if (gb) gb.style.display = 'none';
  }
  hideHomeProgress();
  return reader;
}

/** 从 markdown 内容中提取 URL 列表（用于老缓存数据没有 urlCandidates 时的兜底） */
function extractUrlsFromMarkdown(md) {
  if (!md) return [];
  const urls = [];
  // 匹配 markdown 链接 [text](url) 中的 url
  const mdLinkRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = mdLinkRe.exec(md)) !== null) urls.push(m[2]);
  // 匹配裸 URL
  const bareRe = /https?:\/\/[^\s\)\]\>"'`]+/g;
  while ((m = bareRe.exec(md)) !== null) {
    if (!urls.includes(m[0])) urls.push(m[0]);
  }
  return urls.slice(0, 10);
}

function startSourceVerify(concept, urls) {
  // 不再做并行渠道验证，直接展示搜索到的参考链接
  if (urls && urls.length > 0) {
    readerState.sources = urls.map((url, i) => ({
      label: `来源「${i + 1}」`,
      status: 'hit',
      hit: true,
      url: url,
      title: ''
    }));
  } else {
    readerState.sources = [{ label: '参考链接', status: 'miss', hit: false, url: '', title: '未找到参考链接' }];
  }
  renderSourcePanel();
}

function hideHomeProgress() {
  const bar = document.getElementById('progressBar');
  const fill = document.getElementById('progressFill');
  if (bar) { bar.classList.remove('active'); bar.style.display = ''; }
  if (fill) fill.style.width = '0%';
}

// ===== 渐进管道：生成↔核对并行、逐层揭示 =====
function startPipelineProgress(pipe) {
  pipe._progTarget = Math.max(pipe._progTarget || 10, 10);
  if (pipe._progTimer) clearInterval(pipe._progTimer);
  pipe._progTimer = setInterval(() => {
    const reader = document.getElementById('reader');
    const fill = reader ? document.getElementById('readerGenFill') : document.getElementById('progressFill');
    if (!fill) return;
    const cur = parseFloat(fill.style.width) || 10;
    const diff = pipe._progTarget - cur;
    // 逼近目标（含到顶 100%）时直接吸附，避免 cur 在目标两侧反复 +/-0.4 触发过渡抖动
    if (Math.abs(diff) < 0.5) {
      fill.style.width = pipe._progTarget + '%';
      return;
    }
    const step = diff * 0.25;
    const next = cur + step + (step >= 0 ? 0.4 : -0.4);
    fill.style.width = Math.min(Math.max(next, 10), 100) + '%';
  }, 250);
}

function renderPipelineProgress(pipe) {
  const genLayers = pipe.genDone.filter(Boolean).length;
  const verLayers = pipe.verDone.filter(Boolean).length;
  const total = pipe.totalLayers || 5;
  // 进度条只按「彻底完成（生成+核对都 done）的层」离散推进：
  // 某一层还在生成/核对时，进度条停在上一位不动，不再提前滑向下一层，
  // 避免「第二层刚生成完、第三层刚开始生成时，进度条已往第三层位置蹭」的误判。
  const completed = verLayers;
  let target = Math.max(15, 10 + (completed / total) * 90);
  if (pipe.streamDone && completed >= total) target = 100;
  pipe._progTarget = Math.max(pipe._progTarget, target);
  const text = document.getElementById('reader') ? document.getElementById('readerGenText') : document.getElementById('progressText');
  if (text) {
    if (target >= 100) text.textContent = '已就绪';
    else if (genLayers < total) text.textContent = `生成第 ${genLayers + 1}/${total} 层…`;
    else if (verLayers < total) text.textContent = `核对第 ${verLayers + 1}/${total} 层…`;
    else text.textContent = `生成 ${genLayers}/${total}`;
  }
}

// 单层事实核对（后台并行）：抽取+核对更轻量（每层最多 2 条事实，并发 2）
async function verifyLayerParallel(raw, concept) {
  const patched = await factCheckAndPatch(raw, concept, null, 2, 2);
  return patched.markdown;
}

// 每层核对硬超时：任何 LLM/搜索调用挂死都不会拖垮管道（否则 verDone 永不置位、阅读器永不打开）
const VERIFY_LAYER_TIMEOUT = 12000;

// 一层生成完成 → 记录并立即后台触发该层核对，完成后调度揭示
function finalizeGeneratedLayer(pipe, k, raw) {
  if (pipe.genDone[k]) return;
  pipe.genDone[k] = true;
  pipe.rawLayers[k] = raw;
  renderPipelineProgress(pipe);
  const p = (async () => {
    let md = raw;
    try {
      md = await Promise.race([
        verifyLayerParallel(raw, pipe.concept),
        new Promise((_, rej) => setTimeout(() => rej(new Error('verify-timeout')), VERIFY_LAYER_TIMEOUT))
      ]);
    } catch (e) {
      // 超时或失败：按原始内容渲染（绝不卡死管道；后续若来源可补，用户仍可读到内容）
      console.warn('[verifyLayer] 超时/失败，按原内容渲染:', e && e.message);
      md = raw;
    }
    pipe.verifiedMd[k] = md;
    try {
      pipe.structure.layers[k] = parseMarkdown(md).layers[0] || { name: `第${k + 1}层`, estimatedTime: '', modules: [] };
    } catch (e) {
      pipe.structure.layers[k] = { name: `第${k + 1}层`, estimatedTime: '', modules: [] };
    }
    pipe.verDone[k] = true;
    // 揭示调度本身也兜底，避免其抛错导致 Promise.all reject（进而阻断流结束后的强制开门）
    try { scheduleReveal(pipe); } catch (e) { console.warn('[scheduleReveal] 异常:', e); }
  })();
  pipe.verPromises.push(p);
}

// 调度：首层就绪即开阅读器；随后逐层揭示（保留 1 层缓冲，避免向前翻页撞加载墙）
function scheduleReveal(pipe) {
  renderPipelineProgress(pipe);
  renderReaderDots();
  if (!pipe.readerOpen) {
    // 开门闸门：前两层（第1、2页）都生成+核对完才进入，避免进入后「继续」成死按钮；
    // 总层数 < 2（极端情况）则仅要求第 0 层就绪
    const ready0 = pipe.genDone[0] && pipe.verDone[0];
    const ready1 = (pipe.totalLayers >= 2) ? (pipe.genDone[1] && pipe.verDone[1]) : true;
    if (ready0 && ready1) openReaderForPipe(pipe);
    else return;
  }
  // 揭示所有已就绪层（去掉 buffer：不再要求下一层先生成，避免前沿页被卡；
  // 用户读完当前页时下一页通常已就绪，未就绪时底部「继续」会显示禁用的「生成中…」）
  let i = pipe.revealedUpTo + 1;
  while (i < readerState.totalLayers && pipe.genDone[i] && pipe.verDone[i]) {
    appendLayerPageToReader(pipe, i);
    pipe.revealedUpTo = i;
    i++;
  }
  updateReaderNav();
  renderReaderDots();
}

function openReaderForPipe(pipe) {
  readerState = { currentLayer: 0, totalLayers: pipe.totalLayers, sources: [], concept: pipe.concept };
  pipeline = pipe;
  const data = { concept: pipe.concept, glossary: pipe.glossary, structure: { layers: pipe.structure.layers } };
  attachReaderShell(data);
  // 首页条进度平滑交接给阅读器内细条
  const hf = document.getElementById('progressFill');
  const rf = document.getElementById('readerGenFill');
  if (hf && rf) rf.style.width = hf.style.width;
  pipe.readerOpen = true;
  // 交给我们下方的 scheduleReveal 从 0 揭示所有已就绪层（前两层已就绪 → 一进来看得到两页）
  pipe.revealedUpTo = -1;
  startSourceVerify(pipe.concept, pipe.urlCandidates);
  // 防御：即便某层渲染抛错，也不再让阅读器整体空白（绝不让用户卡在"进不去"）
  try { scheduleReveal(pipe); } catch (e) { console.warn('[openReaderForPipe] scheduleReveal 异常:', e); }
  try { goToLayer(0); } catch (e) { console.warn('[openReaderForPipe] goToLayer 异常:', e); }
}

function appendLayerPageToReader(pipe, i) {
  const pagesContainer = document.getElementById('readerPages');
  if (!pagesContainer) return;
  if (pagesContainer.querySelector(`.reader-page[data-idx="${i}"]`)) return; // 防重复
  let layer = pipe.structure.layers[i];
  if (!layer) {
    const raw = pipe.verifiedMd[i] || pipe.rawLayers[i] || '';
    layer = parseMarkdown(raw).layers[0] || { name: `第${i + 1}层`, estimatedTime: '', modules: [] };
  }
  const data = { concept: pipe.concept, glossary: pipe.glossary, structure: { layers: pipe.structure.layers } };
  const page = renderLayerPage(layer, i, readerState.totalLayers, data);
  if (i === 0) page.classList.remove('hidden');
  pagesContainer.appendChild(page);
}

// 阅读器点状导航：每层显示 生成中 / 核对中 / 已就绪(缓冲) / 已读 状态
function renderReaderDots() {
  if (!pipeline || !pipeline.readerOpen) return;
  const dots = document.querySelectorAll('.reader-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done', 'gen', 'ver', 'ready');
    if (i <= pipeline.revealedUpTo) {
      d.classList.add(i === readerState.currentLayer ? 'active' : 'done');
    } else if (pipeline.verDone[i]) {
      d.classList.add('ready');
    } else if (pipeline.genDone[i]) {
      d.classList.add('ver');
    } else {
      d.classList.add('gen');
    }
  });
}

function rebuildReaderDots(total) {
  const cont = document.querySelector('.reader-dots');
  if (!cont) return;
  let html = '';
  for (let i = 0; i < total; i++) html += `<div class="reader-dot" data-idx="${i}"></div>`;
  cont.innerHTML = html;
}

function goToLayer(idx) {
  const total = readerState.totalLayers;
  if (idx < 0 || idx >= total) return;
  // 渐进管道：未揭示的层不可跳转
  if (pipeline && pipeline.readerOpen && idx > pipeline.revealedUpTo) return;
  readerState.currentLayer = idx;

  const pages = document.querySelectorAll('.reader-page');
  pages.forEach((p, i) => p.classList.toggle('hidden', i !== idx));

  // 更新进度点
  document.querySelectorAll('.reader-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
    d.classList.toggle('done', i < idx);
  });

  updateReaderNav();
  renderReaderDots();
  document.getElementById('reader').scrollTop = 0;
}

function updateReaderNav() {
  const nav = document.getElementById('readerNav');
  if (!nav) return;
  const cur = readerState.currentLayer;
  const total = readerState.totalLayers;
  // 渐进管道：已揭示到的层之前可继续；未全部就绪时末层显示"生成中"
  const revealed = (pipeline && pipeline.readerOpen) ? pipeline.revealedUpTo : (total - 1);
  let html = '';
  if (cur > 0) html += `<button class="reader-prev" onclick="goToLayer(${cur - 1})">▲ 上一层</button>`;
  if (cur < revealed) {
    html += `<button class="reader-continue" onclick="goToLayer(${cur + 1})">继续 ▼</button>`;
  } else if (cur === revealed && revealed < total - 1) {
    html += `<button class="reader-continue" disabled style="opacity:.5;cursor:default">生成中…</button>`;
  } else {
    html += `<button class="reader-continue" onclick="syncObsidianNow()">同步 OB</button>`;
  }
  nav.innerHTML = html;
}

function closeReader() {
  const reader = document.getElementById('reader');
  if (reader) reader.remove();
  const nav = document.getElementById('readerNav');
  if (nav) nav.remove();
  const sp = document.getElementById('sourcePanel');
  if (sp) sp.remove();
  const spn = document.getElementById('readerSearchPanel');
  if (spn) spn.remove();
  const so = document.getElementById('readerSearchOverlay');
  if (so) so.remove();
  document.body.style.overflow = '';
  document.body.classList.remove('reader-open');
  pipeline = null; // 清除渐进管道状态，避免下次打开时读到陈旧状态
  showPage('pageInput');
}

// 获取当前阅读器概念（供顶栏下拉菜单调用）
function readerConcept() {
  const reader = document.getElementById('reader');
  return reader ? (reader.dataset.concept || '') : '';
}
// 切换 ▾ 下拉菜单
function toggleReaderMore(btn) {
  const menu = btn.nextElementSibling;
  const isOpen = menu.classList.contains('open');
  // 关闭所有其他下拉
  document.querySelectorAll('.reader-more-menu.open').forEach(m => m.classList.remove('open'));
  if (!isOpen) menu.classList.add('open');
}
function closeReaderMore() {
  document.querySelectorAll('.reader-more-menu.open').forEach(m => m.classList.remove('open'));
}
// 点击页面其他区域关闭下拉
document.addEventListener('click', e => {
  if (!e.target.closest('.reader-more-wrap')) {
    document.querySelectorAll('.reader-more-menu.open').forEach(m => m.classList.remove('open'));
  }
});

async function regenerate(concept) {
  closeReader();
  document.getElementById('conceptInput').value = concept;
  const s = getSettings();
  const prevMode = s.genMode || 'cache';
  s.genMode = 'regenerate';
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  document.querySelector(`input[name="genMode"][value="regenerate"]`).checked = true;
  try {
    await startGenerate();
  } finally {
    s.genMode = prevMode;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    document.querySelector(`input[name="genMode"][value="${prevMode}"]`).checked = true;
  }
}

/* ===== 通用确认弹框 ===== */
let _confirmOkHandler = null;
function showConfirm(title, msg, onOk, okLabel) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').innerHTML = msg;
  const okBtn = document.getElementById('confirmOk');
  okBtn.textContent = okLabel || '确认';
  _confirmOkHandler = onOk;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  _confirmOkHandler = null;
}
function openDonate() {
  const overlay = document.getElementById('donateOverlay');
  if (overlay) overlay.classList.add('active');
}
function closeDonate() {
  const overlay = document.getElementById('donateOverlay');
  if (overlay) overlay.classList.remove('active');
}
function confirmRegenerate(concept) {
  showConfirm(
    '重新生成确认',
    '重新生成将<strong>清除当前概念的缓存</strong>，并<strong>覆盖 Obsidian 中的对应数据</strong>，然后基于最新模型重新生成整套五层认知框架。此操作不可撤销，是否继续？',
    () => { closeConfirm(); regenerate(concept); },
    '确认重新生成'
  );
}
document.getElementById('confirmOk').addEventListener('click', () => {
  const handler = _confirmOkHandler;
  if (handler) handler();
});

function toggleLayer(header) {
  const body = header.nextElementSibling;
  const arrow = header.querySelector('h2');
  body.classList.toggle('collapsed');
  arrow.textContent = body.classList.contains('collapsed') ? `▶ ${arrow.textContent.slice(2)}` : `▼ ${arrow.textContent.slice(2)}`;
}

function toggleModuleExpand(pageIdx, modId) {
  const el = document.getElementById(`mod-${pageIdx}-${modId}`);
  if (!el) return;
  const btn = el.nextElementSibling.querySelector('button');
  if (el.classList.contains('collapsed')) {
    el.classList.remove('collapsed');
    el.style.maxHeight = el.scrollHeight + 'px';
    btn.textContent = '收起 ▲';
  } else {
    el.classList.add('collapsed');
    el.style.maxHeight = '';
    btn.textContent = '展开更多 ▼';
  }
}

// ===== Glossary Tooltip ===== — TC-07: hover 触发
function jumpToTerm(term, e) {
  e.stopPropagation();
  if (!confirm('将搜索「' + term + '」并生成完整认知框架，是否继续？')) return;
  closeReader();
  document.getElementById('conceptInput').value = term;
  startGenerate();
}

async function showGlossary(e, term) {
  e.stopPropagation();
  document.querySelectorAll('.glossary-tooltip').forEach(t => t.remove());

  const el = e.currentTarget;
  const tooltip = document.createElement('div');
  tooltip.className = 'glossary-tooltip show';

  const g = await dbGet('glossary', term);
  if (g) {
    tooltip.innerHTML = `<div class="tt-title">${esc(g.term)}</div>
      <div>${esc(g.content)}</div>
      <div class="tt-action"><button onclick="generateSub('${esc(g.term)}');event.stopPropagation();">→ 生成完整框架</button></div>`;
  } else {
    tooltip.innerHTML = `<div class="tt-title">${esc(term)}</div><div>暂无词条解释</div>`;
  }

  el.appendChild(tooltip);

  // hover 移出关闭
  el.addEventListener('mouseleave', function hide() {
    setTimeout(() => {
      if (!tooltip.matches(':hover')) tooltip.remove();
      el.removeEventListener('mouseleave', hide);
    }, 200);
  });
  tooltip.addEventListener('mouseleave', () => tooltip.remove());
  // 点击空白关闭
  const close = (ev) => { if (!tooltip.contains(ev.target) && !el.contains(ev.target)) { tooltip.remove(); document.removeEventListener('click', close); } };
  setTimeout(() => document.addEventListener('click', close), 10);
}

// TC-08: 子框架追加而非替换
async function generateSub(term) {
  document.querySelectorAll('.glossary-tooltip').forEach(t => t.remove());
  const s = getSettings();
  if (!s.apiKey) { return; }

  const prevMode = s.genMode;
  try {
    s.genMode = 'cache';
    let data = await dbGet('frameworks', term);
    if (!data) {
      const markdown = await callLLM(term);
      const structure = parseMarkdown(markdown);
      const validation = validateStructure(structure);
      if (!validation.valid) {
        console.warn('格式校验失败:', validation.errors);
        const lastLayer = structure.layers[structure.layers.length - 1];
        if (lastLayer) {
          lastLayer.modules.push({
            id: 'warn', title: '⚠ 格式校验',
            content: 'LLM 输出可能存在格式问题：\n\n' + validation.errors.map(e => `- ${e}`).join('\n')
          });
        }
      }
      const glossary = extractGlossary(markdown);
      const now = Date.now();
      data = { concept: term, markdown, structure, glossary };
      await dbPut('frameworks', { concept: term, markdown, structure, glossary, createdAt: now, updatedAt: now });
      for (const g of glossary) {
        await dbPut('glossary', { term: g.term, content: g.content, parentConcept: term, createdAt: now });
      }
    }
    renderResult(data);
    saveHistory(term);
  } catch (err) {
    console.error('generateSub error:', err);
  } finally {
    s.genMode = prevMode;
  }
}

// ===== Export ===== — TC-09: 同时导出独立词条文件
async function exportOne(concept) {
  const data = await dbGet('frameworks', concept);
  if (!data) { return; }

  // 主框架文件（带来源标记，方便 Obsidian 用户区分系统写入 vs 手动批注）
  downloadFile(cleanMarkdownForExport(data.markdown) + OBSIDIAN_SOURCE_MARK, `${concept}-认知框架.md`, 'text/markdown');

  // 词条文件（优先提取完整模块内容，而非一行定义）
  const glossary = data.glossary || [];
  for (const g of glossary) {
    const fullContent = extractTermFullContent(g.term, data.markdown || '') || g.content;
    const termMd = `# ${g.term}\n\n**所属框架**：${concept}\n\n${fullContent}\n`;
    downloadFile(termMd, `${g.term}-词条.md`, 'text/markdown');
  }
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// 导出时清理事实核对标注的 HTML 标签，避免 <u class="fu"> 等原样出现在 md 文件中
function cleanMarkdownForExport(md) {
  return md
    .replace(/<sup class="fu-note"[^>]*>‡<\/sup>/g, '')
    .replace(/<u class="fu"[^>]*>([\s\S]*?)<\/u>/g, '$1');
}

async function exportAll() {
  const all = await dbGetAll('frameworks');
  if (!all.length) { return; }

  for (const f of all) {
    downloadFile(cleanMarkdownForExport(f.markdown), `${f.concept}-认知框架.md`, 'text/markdown');
    for (const g of (f.glossary || [])) {
      const fullContent = extractTermFullContent(g.term, f.markdown || '') || g.content;
      const termMd = `# ${g.term}\n\n**所属框架**：${f.concept}\n\n${fullContent}\n`;
      downloadFile(termMd, `${g.term}-词条.md`, 'text/markdown');
    }
  }
}

// ===== 导出样式图（PNG 长图 / PDF）=====
// 关键：html2canvas 不支持 backdrop-filter 与 color-mix，故导出容器使用「字面量颜色」复刻玻璃质感，
// 并对生成 HTML 中的 var(--token) 做字符串替换（连 SVG 内联属性一并解析）。
let _exportStyleInjected = false;

function currentIsDark() {
  const cur = document.documentElement.getAttribute('data-theme');
  if (cur === 'dark') return true;
  if (cur === 'light') return false;
  // system 模式或无属性：回退到 media query + computed 样式双重保险
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
  // 最终兜底：读一个已知元素的计算后颜色判断主题（防止 data-theme 未及时同步）
  try {
    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue('--bg').trim();
    if (bg) {
      // 解析 rgb/rgba 或 hex，暗色背景通常亮度 < 128
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) return (parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3])) / 3 < 128;
    }
  } catch(e) {}
  return false;
}

function exportThemeTokens(isDark) {
  if (isDark) {
    return {
      pageBg: '#0E0F13',
      cardBg: '#191B21', cardBorder: '#2A2C33', ink: '#EFF1F4', titleInk: '#FFFFFF',
      muted: '#AAB0B8', accent: '#ECE9E3', accent2: '#BBB6AC', onAccent: '#0E0F13',
      accentSoft: 'rgba(236,233,227,0.10)', glassHi: 'rgba(255,255,255,0.06)',
      cardShadow: '0 18px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      menuBg: 'rgba(30,33,40,0.88)', menuBorder: 'rgba(255,255,255,0.14)',
      fuColor: '#AAB0B8', bar: '#BBB6AC'
    };
  }
  return {
    pageBg: '#F1EFEA',
    cardBg: '#FBFAF8', cardBorder: '#D6D3CD', ink: '#1a1a1c', titleInk: '#111214',
    muted: '#5a5754', accent: '#1A1A1C', accent2: '#2d2e32', onAccent: '#FFFFFF',
    accentSoft: 'rgba(26,26,28,0.08)', glassHi: 'rgba(255,255,255,0.55)',
    cardShadow: '0 18px 48px rgba(40,38,34,0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
    menuBg: 'rgba(255,255,255,0.90)', menuBorder: 'rgba(0,0,0,0.10)',
    fuColor: '#686562', bar: '#33333A'
  };
}

function injectExportStyle(t) {
  const css = `
  .export-root {
    box-sizing: border-box; width: 820px; margin: 0 auto; padding: 44px 40px 36px;
    background: ${t.pageBg}; color: ${t.ink};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 15px; line-height: 1.75;
  }
  .export-root * { box-sizing: border-box; }
  .export-root .exp-header { margin-bottom: 30px; padding-bottom: 22px; border-bottom: 1px solid ${t.cardBorder}; }
  .export-root .exp-brand {
    display: inline-block; font-family: "Space Grotesk", sans-serif; font-weight: 700; letter-spacing: 0.04em;
    font-size: 0.8rem; color: ${t.onAccent}; background: ${t.accent}; padding: 4px 12px; border-radius: 999px;
  }
  .export-root .exp-concept { font-family: "Space Grotesk", sans-serif; font-size: 2.1rem; font-weight: 700; color: ${t.titleInk}; margin: 14px 0 8px; line-height: 1.2; }
  .export-root .exp-meta { font-size: 0.82rem; color: ${t.muted}; letter-spacing: 0.02em; }
  .export-root .exp-layer { margin-bottom: 26px; }
  .export-root .exp-layer-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .export-root .exp-layer-num {
    font-size: 0.78rem; font-weight: 700; color: ${t.onAccent}; background: ${t.accent};
    padding: 3px 11px; border-radius: 999px; letter-spacing: 0.03em; white-space: nowrap;
  }
  .export-root .exp-layer-name { font-size: 1.18rem; font-weight: 700; color: ${t.titleInk}; }
  .export-root .exp-layer-time { font-size: 0.78rem; color: ${t.muted}; background: ${t.accentSoft}; padding: 2px 10px; border-radius: 6px; }
  .export-root .exp-layer-bar { height: 3px; border-radius: 2px; background: ${t.bar}; margin: 12px 0 18px; opacity: 0.9; }
  .export-root .exp-modules { display: flex; flex-direction: column; gap: 14px; }
  .export-root .module {
    background: ${t.cardBg}; border: 1px solid ${t.cardBorder}; border-radius: 14px; padding: 18px 20px;
    /* 导出完全不用阴影，html2canvas 会把任何 shadow 渲染成半透明层蒙在文字上 */
    box-shadow: none;
  }
  .export-root .module-title { font-size: 1rem; font-weight: 700; color: ${t.titleInk} !important; margin-bottom: 10px; }
  .export-root .module-content { font-size: 0.92rem; color: ${t.ink} !important; }
  .export-root .module-content * { color: ${t.ink} !important; }
  /* SVG 文字/线条统一使用导出 token（html2canvas 不支持 fill:currentColor 跟随，强制覆盖） */
  .export-root svg text, .export-root svg tspan { fill: ${t.ink} !important; }
  .export-root svg path[stroke="var(--ink)"], .export-root svg line[stroke="var(--ink)"] { stroke: ${t.ink} !important; }
  .export-root svg [fill^="var(--title-ink)"] { fill: ${t.titleInk} !important; }
  .export-root svg [fill^="var(--muted)"] { fill: ${t.muted} !important; }
  .export-root .module-content strong, .export-root .module-content b, .export-root .module-content h1, .export-root .module-content h2, .export-root .module-content h3, .export-root .module-content h4 { color: ${t.titleInk} !important; }
  .export-root .module-content p { margin: 0 0 0.6rem; }
  .export-root .module-content h1,.export-root .module-content h2,.export-root .module-content h3,.export-root .module-content h4 { color: ${t.titleInk}; margin: 0.8rem 0 0.4rem; font-weight: 700; }
  .export-root .module-content ul,.export-root .module-content ol { margin: 0 0 0.6rem 1.3rem; padding: 0; }
  .export-root .module-content li { margin-bottom: 0.3rem; }
  .export-root .module-content code { background: ${t.accentSoft}; padding: 1px 6px; border-radius: 5px; font-size: 0.85em; }
  .export-root .module-content pre { background: ${t.accentSoft}; padding: 12px; border-radius: 8px; overflow-x: auto; }
  .export-root .module-content blockquote { border-left: 3px solid ${t.accent}; padding-left: 12px; color: ${t.muted}; margin: 0 0 0.6rem; }
  .export-root .module-content a { color: ${t.accent2}; text-decoration: none; }
  .export-root .mod-row { display: flex; gap: 0.5em; margin-bottom: 0.5rem; }
  .export-root .mod-label { flex-shrink: 0; font-weight: 700; color: ${t.accent2}; }
  .export-root .mod-label strong { font-weight: 700; }
  .export-root .mod-val { flex: 1; min-width: 0; }
  .export-root .card-phase-item { margin-bottom: 0.55rem; }
  .export-root .card-phase-label { display: block; font-weight: 700; color: ${t.titleInk} !important; margin-bottom: 0.15rem; }
  .export-root .card-phase-text { display: block; color: ${t.ink} !important; }
  .export-root .viz-card { border: 1px solid ${t.cardBorder}; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; background: ${t.cardBg}; }
  .export-root .viz-card-pro { border-left: 3px solid ${t.accent}; background: ${t.cardBg}; }
  .export-root .card-pill { display: inline-block; font-size: 0.72rem; font-weight: 600; padding: 2px 9px; border-radius: 999px; margin-bottom: 8px; background: ${t.accentSoft}; color: ${t.accent2}; }
  .export-root .card-pill.unsolved { background: rgba(128,128,128,0.18); color: ${t.muted}; }
  .export-root .card-title { font-size: 0.98rem; font-weight: 700; color: ${t.titleInk}; margin-bottom: 4px; }
  .export-root .card-desc { font-size: 0.88rem; color: ${t.ink}; line-height: 1.6; }
  .export-root .glossary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .export-root .glossary-card { border: 1px solid ${t.cardBorder}; border-radius: 12px; padding: 12px 14px; background: ${t.cardBg}; }
  .export-root .card-term { font-weight: 700; color: ${t.accent2}; margin-bottom: 4px; font-size: 0.95rem; }
  .export-root .card-jump { display: none !important; }
  .export-root .cross-pill { display: inline-block; background: ${t.accentSoft}; color: ${t.accent2}; font-weight: 600; padding: 1px 9px; border-radius: 999px; margin: 0 4px 4px 0; font-size: 0.85rem; }
  .export-root .miscon-group { display: flex; gap: 14px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid ${t.cardBorder}; }
  .export-root .miscon-insight-icon { flex-shrink: 0; color: ${t.muted}; font-weight: 700; }
  .export-root .miscon-insight-content { flex: 1; min-width: 0; font-size: 0.88rem; color: ${t.ink}; line-height: 1.6; }
  .export-root .accordion { display: flex; flex-direction: column; gap: 8px; }
  .export-root .acc-item { border: 1px solid ${t.cardBorder}; border-radius: 10px; overflow: hidden; }
  .export-root .acc-head { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: ${t.accentSoft}; }
  .export-root .acc-title { font-weight: 700; color: ${t.titleInk}; font-size: 0.92rem; }
  .export-root .acc-icon { display: none !important; }
  .export-root .acc-body { max-height: none !important; overflow: visible !important; display: block !important; }
  .export-root .acc-body-inner { padding: 13px 15px; font-size: 0.9rem; color: ${t.ink}; }
  .export-root .progressive .prog-item { max-height: none !important; overflow: visible !important; opacity: 1 !important; display: block !important; margin-bottom: 0.8rem; }
  .export-root .prog-body { color: ${t.ink}; }
  .export-root .prog-more-btn { display: none !important; }
  .export-root .fu { text-decoration: underline; text-decoration-style: dotted; text-decoration-color: ${t.fuColor}; text-underline-offset: 3px; }
  .export-root .fu-note { font-size: 0.7em; color: ${t.fuColor}; margin-left: 1px; vertical-align: super; }
  .export-root svg { max-width: 100%; height: auto; display: block; }
  .export-root .exp-footer { margin-top: 34px; padding-top: 20px; border-top: 1px solid ${t.cardBorder}; text-align: center; }
  .export-root .exp-foot-brand { font-family: "Space Grotesk", sans-serif; font-weight: 700; color: ${t.titleInk}; font-size: 0.95rem; letter-spacing: 0.03em; }
  .export-root .exp-foot-note { font-size: 0.78rem; color: ${t.muted}; margin-top: 6px; }
  .export-root .exp-mark { color: ${t.accent2}; font-weight: 700; }
  .export-loading {
    position: fixed; inset: 0; z-index: 500; display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.35); color: #fff; font-size: 0.95rem; letter-spacing: 0.02em;
  }
  .export-loading .box { background: rgba(20,20,22,0.9); padding: 18px 28px; border-radius: 12px; display: flex; align-items: center; gap: 12px; }
  .export-loading .spin { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: expspin 0.7s linear infinite; }
  @keyframes expspin { to { transform: rotate(360deg); } }
  .export-menu {
    position: fixed; z-index: 210; min-width: 13rem; display: flex; flex-direction: column; gap: 2px;
    background: ${t.menuBg}; backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid ${t.menuBorder}; border-radius: 14px; padding: 6px;
    box-shadow: 0 18px 48px rgba(0,0,0,0.32);
  }
  .export-menu-sep { height: 1px; background: var(--rule); margin: 4px 2px; opacity: 0.6; }
  .export-menu button {
    display: flex; align-items: center; gap: 8px; text-align: left; background: none; border: none;
    color: ${t.titleInk}; font-size: 0.88rem; padding: 9px 12px; border-radius: 8px; cursor: pointer; white-space: nowrap;
  }
  .export-menu button:hover { background: ${t.accentSoft}; color: ${t.accent2}; }
  .export-menu .export-sub-toggle { justify-content: space-between; gap: 6px; }
  .export-menu .export-sub-toggle .exp-caret { transition: transform 0.15s ease; }
  .export-menu .export-sub-toggle.open .exp-caret { transform: rotate(180deg); }
  .export-menu .export-sub-toggle.open { color: ${t.accent2}; }
  .export-menu .export-layer-list { display: flex; flex-direction: column; gap: 2px; margin-top: 3px; padding: 5px 2px 3px; border-top: 1px solid var(--rule); }
  .export-menu .export-layer-btn { padding-left: 18px; font-size: 0.84rem; }
  `;
  let style = document.getElementById('export-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'export-style';
    document.head.appendChild(style);
  }
  style.textContent = css;
}

// 把生成 HTML 里的 var(--token) 解析为字面量（含 SVG 内联属性），绕开 html2canvas 不支持 color-mix/var 的坑
// 可选 override：导出场景传入 exportTokens（来自 exportThemeTokens），让 SVG 的 fill 与导出 CSS 的 t.ink 完全一致
function resolveCssVars(html, exportTokens) {
  const isDark = currentIsDark();
  const map = {};
  if (exportTokens) {
    // 导出场景：用导出 token 直接映射到 CSS 变量名
    map['bg'] = exportTokens.pageBg;
    map['bg2'] = exportTokens.cardBg;
    map['ink'] = exportTokens.ink;
    map['title-ink'] = exportTokens.titleInk;
    map['muted'] = exportTokens.muted;
    map['accent'] = exportTokens.accent;
    map['accent2'] = exportTokens.accent2;
    map['on-accent'] = exportTokens.onAccent;
    map['accent-soft'] = exportTokens.accentSoft;
    map['rule'] = exportTokens.cardBorder;
  } else {
    // 在线场景：从页面 CSS 读取
    const cs = getComputedStyle(document.documentElement);
    const names = ['bg','bg2','ink','title-ink','muted','rule','hairline','accent','accent2','on-accent','accent-soft','accent2-soft','surface-solid','panel-bg'];
    for (const n of names) {
      const v = cs.getPropertyValue('--' + n).trim();
      if (v) map[n] = v;
    }
  }
  const fbBg = isDark ? '#191B21' : '#FBFAF8';
  const fb = { 'panel-bg': fbBg, 'on-accent': isDark ? '#0E0F13' : '#FFFFFF' };
  return html.replace(/var\(--([\w-]+)\)/g, (m, t) => (map[t] !== undefined ? map[t] : (fb[t] || '#999')));
}

// 复用阅读器模块分支逻辑，产出与界面一致的模块内容 HTML（去掉交互 id）
function renderModuleContentForExport(mod, data) {
  const title = (mod.title || '').toLowerCase();
  // 清理 LLM 回显的 prompt 指令
  let c = (c).replace(/[（(]?\s*P0\s*模块[，,]\s*(仅列出来源中明确信息|仅使用来源中明确信息|极度保守)[)）]?\s*(；来源未涉及处标注「⚠️ 暂无可靠来源」)?\s*/gi, '');
  c = c.replace(/[（(]\s*P0\s*模块[：:]\s*全部跳过[)）]?\s*/gi, '');
  c = c.replace(/^>\s*⚠️\s*搜索结果深度不足，该模块需要更丰富的参考资料。\s*/gmi, '');
  c = c.replace(/[（(]\s*缩减模式\s*[)）]\s*/gi, '');
  c = c.replace(/\n\s*P0\s*模块.*?\n/g, '\n');
  c = c.replace(/^⚠️\s*暂无可靠来源\s*$/gmi, '').trim();
  let content = '';
  if (title.includes('领域分类') || title.includes('分类')) {
    const categories = parseMindmapCategories(c);
    content = categories.length > 0 ? generateMindmapDOM(data.concept, categories) : marked.parse(c);
  } else if (title.includes('发展脉络') || title.includes('时间线') || title.includes('历史')) {
    content = generateTimelineHTML(c);
  } else if (title.includes('常见误区') || title.includes('误区')) {
    content = generateMisconHTML(c);
  } else if (title.includes('底层原理') || title.includes('原理')) {
    content = generateAccordionHTML(c);
  } else if (title.includes('最新前沿') || title.includes('前沿')) {
    content = generateProgressiveHTML(c);
  } else if (title.includes('核心难题') || title.includes('难题')) {
    content = generateCardGridHTML(c, 'issue');
  } else if (title.includes('现实映射') || title.includes('现实')) {
    content = generateCardGridHTML(c, 'scenario');
  } else if (title.includes('推荐学习路径') || title.includes('学习路径')) {
    content = generateCardGridHTML(c, 'path');
  } else if (title.includes('工具箱') || title.includes('工具')) {
    content = generateCardGridHTML(c, 'tool');
  } else if (title.includes('核心概念') || title.includes('术语')) {
    const terms = (data.glossary && data.glossary.length > 0) ? data.glossary : extractGlossaryFromContent(c);
    if (terms.length > 0) {
      let cards = '<div class="glossary-cards">';
      for (const g of terms) {
        cards += `<div class="glossary-card"><div class="card-term">${esc(g.term)}</div><div class="card-desc">${esc(g.content || '')}</div></div>`;
      }
      content = cards + '</div>';
    } else {
      content = marked.parse(c).replace(/<p>(<strong>[^<]+<\/strong>)([\s\S]*?)<\/p>/g, '<div class="mod-row"><span class="mod-label">$1</span><span class="mod-val">$2</span></div>');
    }
  } else if (title.includes('跨领域') || title.includes('跨域')) {
    content = marked.parse(c).replace(/<strong>([^<]+)<\/strong>/g, '<span class="cross-pill">$1</span>');
  } else {
    content = marked.parse(c).replace(/<p>(<strong>[^<]+<\/strong>)([\s\S]*?)<\/p>/g, '<div class="mod-row"><span class="mod-label">$1</span><span class="mod-val">$2</span></div>');
  }
  return content;
}

// 构建离屏导出容器（带网站设计风格）。layerIdx>=0 时只渲染该层（单页导出）
function buildExportCard(data, layerIdx = -1) {
  const isDark = currentIsDark();
  const t = exportThemeTokens(isDark);
  injectExportStyle(t);
  const structure = data.structure || parseMarkdown(data.markdown);
  const layers = structure.layers || [];
  const glossary = data.glossary || [];
  const isSingle = layerIdx >= 0 && !!layers[layerIdx];
  let html = `<div class="exp-header">
    <span class="exp-brand">frame</span>
    <h1 class="exp-concept">${esc(data.concept)}</h1>
    <div class="exp-meta">元框架引擎 · 五层认知框架 · ${isSingle ? `第 ${layerIdx + 1} 层 · 单页导出` : `共 ${layers.length} 层 · 内容已通过事实核对`}</div>
  </div>`;
  const renderList = isSingle ? [layerIdx] : layers.map((_, i) => i);
  renderList.forEach((li) => {
    const layer = layers[li];
    html += `<section class="exp-layer">
      <div class="exp-layer-head">
        <span class="exp-layer-num">第 ${li + 1} 层</span>
        <span class="exp-layer-name">${esc(layer.name || '')}</span>
        ${layer.estimatedTime ? `<span class="exp-layer-time">${esc(layer.estimatedTime)}</span>` : ''}
      </div>
      <div class="exp-layer-bar"></div>
      <div class="exp-modules">`;
    for (const mod of (layer.modules || [])) {
      const c = renderModuleContentForExport(mod, { concept: data.concept, glossary });
      html += `<div class="module">
        <div class="module-title">${esc(mod.id)}. ${esc(mod.title)}</div>
        <div class="module-content">${c}</div>
      </div>`;
    }
    html += `</div></section>`;
  });
  html += `<div class="exp-footer">
    <div class="exp-foot-brand">由元引擎生成</div>
    <div class="exp-foot-note">内容已通过事实核对 · <span class="exp-mark">‡</span> 标记为 AI 生成、未找到权威出处，仅供参考</div>
  </div>`;
  html = resolveCssVars(html, t);
  // 清理事实核对标注的 HTML 标签，避免 <u class="fu" data-tip="..."> 原样出现在导出图片中
  html = html.replace(/<sup class="fu-note"[^>]*>‡<\/sup>/g, '')
             .replace(/<u class="fu"[^>]*>([\s\S]*?)<\/u>/g, '$1');
  const root = document.createElement('div');
  root.className = 'export-root';
  root.innerHTML = html;
  Object.assign(root.style, { position: 'fixed', left: '-10000px', top: '0', width: '820px' });
  document.body.appendChild(root);
  // 用内联 !important 把文字颜色强制写死为当前主题 token，彻底压过主阅读器样式表
  // （如 .viz-card .card-desc 等同特异性规则）与任何残留内联色，保证导出文字跟随主题
  applyExportColors(root, t);
  return root;
}

// 把导出容器内所有文字颜色按当前主题 token 写成内联 !important（独立于 CSS 级联，保证主题跟随）
function applyExportColors(root, t) {
  const set = (sel, val) => root.querySelectorAll(sel).forEach(el => el.style.setProperty('color', val, 'important'));
  // 正文：覆盖模块内容内所有元素（包括 card-desc / card-term / miscon-insight-content 等）
  set('.module-content, .module-content *', t.ink);
  // 标题与强调
  set('.module-title, .exp-layer-name, .exp-concept, .card-phase-label, .card-phase-text, .acc-title, .card-title, .card-term, .module-content strong, .module-content b, .module-content h1, .module-content h2, .module-content h3, .module-content h4', t.titleInk);
  // 弱化说明文字
  set('.exp-meta, .exp-foot-note, .exp-layer-time, .card-pill.unsolved, .module-content blockquote, .module-content .muted-text', t.muted);
  // 正文卡片描述、误区内容、手风琴内容等 — 使用正文色保证可读性
  set('.card-desc, .miscon-insight-content, .acc-body-inner, .prog-body', t.ink);
  // 强调色文字（状态胶囊、跨域标签）
  set('.card-pill:not(.unsolved), .cross-pill, .module-content a', t.accent2);
  // 品牌/层号胶囊：保持高对比（accent 底 + onAccent 字），不被上面的规则覆盖
  set('.exp-brand, .exp-layer-num', t.onAccent);
}

function showExportLoading(text) {
  let el = document.getElementById('exportLoading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'exportLoading';
    el.className = 'export-loading';
    el.innerHTML = `<div class="box"><span class="spin"></span><span class="txt"></span></div>`;
    document.body.appendChild(el);
  }
  el.querySelector('.txt').textContent = text;
  el.style.display = 'flex';
}
function hideExportLoading() {
  const el = document.getElementById('exportLoading');
  if (el) el.style.display = 'none';
}

function checkExportLibs() {
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('导出图片/PDF 所需组件未加载（可能处于离线环境）。请连网后刷新页面再试，或先用「Markdown」导出。');
    return false;
  }
  return true;
}

async function exportPng(concept) {
  if (!checkExportLibs()) return;
  const data = await dbGet('frameworks', concept);
  if (!data) return;
  showExportLoading('正在生成 PNG 长图…');
  // 等一帧，确保容器布局完成
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const root = buildExportCard(data);
  try {
    const canvas = await html2canvas(root, { backgroundColor: currentIsDark() ? '#0E0F13' : '#F1EFEA', scale: 2, useCORS: true, logging: false });
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, `${concept}-认知框架.png`, 'image/png');
      root.remove();
      hideExportLoading();
    }, 'image/png');
  } catch (e) {
    console.error('[exportPng] 失败:', e);
    root.remove();
    hideExportLoading();
    alert('PNG 导出失败：' + (e.message || e));
  }
}

async function exportPdf(concept) {
  if (!checkExportLibs()) return;
  const data = await dbGet('frameworks', concept);
  if (!data) return;
  showExportLoading('正在生成 PDF 文档…');
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const root = buildExportCard(data);
  try {
    const canvas = await html2canvas(root, { backgroundColor: currentIsDark() ? '#0E0F13' : '#F1EFEA', scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pw = 210, ph = 297;
    const imgW = pw;
    const imgH = canvas.height * imgW / canvas.width;
    let heightLeft = imgH, pos = 0;
    pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
    heightLeft -= ph;
    while (heightLeft > 0) {
      pos -= ph;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
      heightLeft -= ph;
    }
    pdf.save(`${concept}-认知框架.pdf`);
    root.remove();
    hideExportLoading();
  } catch (e) {
    console.error('[exportPdf] 失败:', e);
    root.remove();
    hideExportLoading();
    alert('PDF 导出失败：' + (e.message || e));
  }
}

// 导出指定层（第 li 层，0 基）为带设计风格的单页 PNG
async function exportSingleLayer(li, e) {
  if (e) e.stopPropagation();
  closeExportMenuOnce();
  if (!checkExportLibs()) return;
  const concept = readerConcept();
  if (!concept) return;
  const data = await dbGet('frameworks', concept);
  if (!data) return;
  if (!data.structure || !data.structure.layers || !data.structure.layers[li]) {
    alert('该页尚未就绪，请稍候或等全部生成后再试。');
    return;
  }
  showExportLoading(`正在导出第 ${li + 1} 层…`);
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const root = buildExportCard(data, li);
  try {
    const canvas = await html2canvas(root, { backgroundColor: currentIsDark() ? '#0E0F13' : '#F1EFEA', scale: 2, useCORS: true, logging: false });
    canvas.toBlob((blob) => {
      if (blob) downloadFile(blob, `${concept}-第${li + 1}层.png`, 'image/png');
      root.remove();
      hideExportLoading();
    }, 'image/png');
  } catch (err) {
    console.error('[exportSingleLayer] 失败:', err);
    root.remove();
    hideExportLoading();
    alert('单页导出失败：' + (err.message || err));
  }
}

// 导出菜单（阅读器右上角「导出」胶囊触发；锚点在屏幕上半区时向下弹出）
async function toggleExportMenu(e) {
  e.stopPropagation();
  const existing = document.getElementById('exportMenu');
  if (existing) { closeExportMenuOnce(); return; }
  // 确保导出样式（含 .export-menu 的 fixed/z-index）已注入，否则菜单会退化成文档流普通 div
  injectExportStyle(exportThemeTokens(currentIsDark()));
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  // 读取已生成的各层名称，供「导出单页」列表展示
  const concept = readerConcept();
  let layers = [];
  if (concept) {
    const data = await dbGet('frameworks', concept);
    if (data && data.structure && data.structure.layers) layers = data.structure.layers;
  }
  const total = layers.length || readerState.totalLayers || 0;
  let layerBtns;
  if (total > 0) {
    const arr = [];
    for (let i = 0; i < total; i++) {
      const nm = layers[i] && layers[i].name ? ' · ' + esc(layers[i].name) : '';
      arr.push(`<button class="export-layer-btn" onclick="exportSingleLayer(${i}, event)">第 ${i + 1} 层${nm}</button>`);
    }
    layerBtns = arr.join('');
  } else {
    layerBtns = `<button class="export-layer-btn" disabled style="opacity:.5;cursor:default">无可用单页</button>`;
  }
  const menu = document.createElement('div');
  menu.id = 'exportMenu';
  menu.className = 'export-menu';
  menu.innerHTML = `
    <button onclick="doExport('md')">Markdown (.md)</button>
    <button onclick="doExport('png')">整篇 PNG 长图</button>
    <button onclick="doExport('pdf')">整篇 PDF 文档</button>
    <div class="export-menu-sep"></div>
    <button class="export-sub-toggle" onclick="toggleExportLayerList(event)">导出单页 <span class="exp-caret">▾</span></button>
    <div class="export-layer-list" id="exportLayerList" style="display:none">${layerBtns}</div>`;
  document.body.appendChild(menu);
  menu._anchor = rect;
  const mr = menu.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - mr.width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - mr.width - 12));
  menu.style.left = left + 'px';
  // 锚点在屏幕上半区（如顶栏按钮）则向下弹出，否则向上
  const placeBelow = rect.top < window.innerHeight / 2;
  let top = placeBelow ? (rect.bottom + 10) : (rect.top - mr.height - 10);
  if (top < 12) top = 12;
  menu.style.top = top + 'px';
  setTimeout(() => document.addEventListener('click', closeExportMenuOnce, { once: true }), 0);
  document.addEventListener('keydown', escCloseExportMenu, { once: true });
}

// 展开/收起「导出单页」的层选择列表，并按锚点按钮重新定位菜单
function toggleExportLayerList(e) {
  e.stopPropagation();
  const menu = document.getElementById('exportMenu');
  if (!menu) return;
  const list = document.getElementById('exportLayerList');
  if (!list) return;
  const willShow = list.style.display === 'none';
  list.style.display = willShow ? 'flex' : 'none';
  e.currentTarget.classList.toggle('open', willShow);
  // 展开/收起后整体重定位，确保菜单留在视口内（底部贴住导出按钮上方）
  const rect = menu._anchor;
  if (rect) {
    const mr = menu.getBoundingClientRect();
    const placeBelow = rect.top < window.innerHeight / 2;
    let top = placeBelow ? (rect.bottom + 10) : (rect.top - mr.height - 10);
    if (top < 12) top = 12;
    let left = rect.left + rect.width / 2 - mr.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - mr.width - 12));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
}
function escCloseExportMenu(e) { if (e.key === 'Escape') closeExportMenuOnce(); }
function closeExportMenuOnce() {
  const m = document.getElementById('exportMenu');
  if (m) m.remove();
  const o = document.getElementById('exportMenuOverlay');
  if (o) o.remove();
  document.removeEventListener('keydown', escCloseExportMenu);
}
function doExport(kind) {
  closeExportMenuOnce();
  const concept = readerConcept();
  if (!concept) return;
  if (kind === 'md') exportOne(concept);
  else if (kind === 'png') exportPng(concept);
  else if (kind === 'pdf') exportPdf(concept);
}

// 阅读器底部「同步 OB」按钮：支持直写则自动写入目录，否则直接下载 .md
async function syncObsidianNow() {
  const concept = readerConcept();
  if (!concept) return;
  bootStep('[同步] 点击「同步 OB」→ isTauriEnv()=' + isTauriEnv());
  // App 模式：走原生 Rust 命令直接写盘（无需浏览器 API）
  if (isTauriEnv()) {
    try {
      const files = await buildObsidianFiles(concept);
      if (!files.length) { showToast('未找到缓存数据，无法同步', 'warn'); return; }
      const r = await tauriWriteObsidian(files);
      bootStep('[同步] 原生写盘成功：' + r.n + ' 个文件 → ' + r.dir);
      showToast(`已同步 ${r.n} 个文件到：${r.dir}`, 'ok');
    } catch (e) {
      bootStep('[同步] 原生写盘失败：' + (e && e.message));
      showToast('同步失败：' + (e && e.message ? e.message : e), 'warn');
    }
    return;
  }
  bootStep('[同步] 非 App 环境 → 浏览器分支（会下载到下载文件夹）');
  const data = await dbGet('frameworks', concept);
  if (!data) { showToast('未找到缓存数据，无法同步', 'warn'); return; }
  if (fsDirectWriteSupported()) {
    await syncToObsidian(concept, data.markdown || '', data.glossary || []);
  } else {
    exportOne(concept);
    showToast('已导出 .md 到下载目录，移入 Obsidian vault 即可', 'ok');
  }
}

// ===== Cache =====
async function clearCache() {
  try {
    await dbClear('frameworks');
    await dbClear('glossary');
    alert('缓存已清空');
  } catch (e) {
    console.error('清空缓存失败:', e);
    alert('清空失败，请刷新页面后重试');
  }
}

// ===== 轻量提示 toast（失败/异常时可见，成功保持静默避免刷屏） =====
let _toastStyleDone = false;
function showToast(msg, type) {
  if (!_toastStyleDone) {
    const st = document.createElement('style');
    st.textContent = `
      #metaToast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(8px);
        z-index:9999;padding:10px 16px;border-radius:10px;font-size:0.86rem;max-width:82vw;line-height:1.4;
        box-shadow:0 8px 28px rgba(0,0,0,0.30);opacity:0;transition:opacity .25s ease, transform .25s ease;
        pointer-events:none;font-family:inherit;text-align:center}
      #metaToast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #metaToast.ok{background:#1f8a4c;color:#fff}
      #metaToast.warn{background:#b54708;color:#fff}
      #metaToast.info{background:#33363f;color:#fff}`;
    document.head.appendChild(st);
    _toastStyleDone = true;
  }
  let el = document.getElementById('metaToast');
  if (!el) { el = document.createElement('div'); el.id = 'metaToast'; document.body.appendChild(el); }
  el.className = type || 'info';
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3800);
}

// ===== Obsidian 同步（纯前端：支持直写则自动写入目录，不支持则提示手动下载 .md）=====
async function syncToObsidian(concept, markdown, glossary) {
  // 支持 File System Access API：生成完自动直写目录（静默，无需用户操作）
  if (fsDirectWriteSupported()) {
    const handle = await getObsidianHandle();
    if (!handle) {
      showToast('尚未选择同步目录，请到「设置」中选择', 'warn');
      return;
    }
    try {
      if (handle.queryPermission) {
        let perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          perm = await handle.requestPermission({ mode: 'readwrite' });
          if (perm !== 'granted') { showToast('未授权写入同步目录', 'warn'); return; }
        }
      }
    } catch (e) { /* 部分环境无 queryPermission，直接尝试写 */ }
    const cleanMd = cleanMarkdownForExport(markdown) + OBSIDIAN_SOURCE_MARK;
    try {
      await writeFileToDir(handle, `${concept}-认知框架.md`, cleanMd);
      if (Array.isArray(glossary)) {
        for (const g of glossary) {
          if (g && g.term && g.content) {
            const fullContent = extractTermFullContent(g.term, markdown || '') || g.content;
            await writeFileToDir(handle, `${g.term}-词条.md`, `# ${g.term}\n\n${fullContent}\n${OBSIDIAN_SOURCE_MARK}`);
          }
        }
      }
      showToast('已同步到本地目录：' + handle.name, 'ok');
      return;
    } catch (e) {
      console.warn('[sync] 直写失败:', e);
      showToast('写入失败：' + (e.message || e), 'warn');
    }
  }
  // 不支持直写：提示用户从导出菜单手动导出 Markdown
  showToast('此浏览器不支持自动同步，请点右下角「同步 OB」或右上角「导出 → Markdown (.md)」手动保存 .md', 'info');
}

async function readFromObsidian(concept) {
  if (!('showDirectoryPicker' in window)) return null;
  const handle = await getObsidianHandle();
  if (!handle) return null;
  try {
    if (handle.queryPermission) {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') return null;
    }
  } catch (e) {}
  try {
    const fh = await handle.getFileHandle(`${concept}-认知框架.md`);
    const file = await fh.getFile();
    return await file.text();
  } catch (e) {
    return null; // 文件不存在或读取失败
  }
}

// ===== History =====
const HISTORY_KEY = 'metaengine_history';
const MAX_HISTORY = 20;
function saveHistory(concept) {
  try {
    let list = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    list = list.filter(item => item !== concept);
    list.unshift(concept);
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
    renderHistory();
  } catch(e) {}
}
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch(e) { return []; }
}
// 小胶囊上限：预设 6 个 + 历史，合计最多 12 个；超过则只显示最新的 12 个（历史优先，预设补位）
const MAX_CAPSULES = 12;
function computeCapsules() {
  const history = getHistory();                      // 新 → 旧
  const histShown = history.slice(0, MAX_CAPSULES);  // 最多 12 条最新历史
  const slots = MAX_CAPSULES - histShown.length;     // 留给预设的空位
  const histSet = new Set(history.map(s => s.toLowerCase()));
  const presets = QUICK_EXAMPLES
    .filter(ex => !histSet.has(ex.toLowerCase()))
    .slice(0, Math.max(0, slots));
  return { histShown, presets };
}
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderQuickExamples();  // 恢复被历史隐藏的预设项
  renderHistory();        // 清空历史胶囊 + 隐藏清除按钮
}
// 胶囊/示例点击：把概念写入输入框并启动生成（单条调用，规避 callHandler 多语句限制；data-concept 属性避免引号转义问题）
function startWithConcept(el) {
  var concept = (el && el.dataset && el.dataset.concept) || (el && el.getAttribute && el.getAttribute('data-concept')) || '';
  var input = document.getElementById('conceptInput');
  if (input) input.value = concept;
  startGenerate();
}
function renderHistory() {
  const capsulesEl = document.getElementById('historyCapsules');
  if (!capsulesEl) return;
  const { histShown: items } = computeCapsules();
  const clearWrap = document.getElementById('tagClearWrap');
  if (!items.length) { capsulesEl.innerHTML = ''; if (clearWrap) clearWrap.style.display = 'none'; return; }
  if (clearWrap) clearWrap.style.display = '';
  capsulesEl.innerHTML = items.map(item =>
    `<span class="hist-capsule" data-concept="${esc(item)}" onclick="startWithConcept(this)">${esc(item)}</span>`
  ).join('');
}

// ===== Utils =====
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ===== 思维导图 DOM 生成 =====
function splitText(text, maxLen) {
  const lines = [];
  for (let i = 0; i < text.length; i += maxLen) lines.push(text.substring(i, i + maxLen));
  return lines;
}

// 解析 LLM 输出的领域分类文本 → categories 数组
function parseMindmapCategories(raw) {
  const categories = [];

  // 解析1：bold 标题（**xxx**）+ 下方列表项（支持缩进），列表项可带冒号注释
  const lines = raw.split('\n');
  let currentCat = null;
  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过明显的 URL、数据来源、参考链接行（不解析为分类）
    if (/^https?:\/\//i.test(trimmed) || /^(参考链接|数据来源|来源|参考文献|出处)[：:]/i.test(trimmed) || /^\[(\d+|来源)\]/i.test(trimmed)) continue;
    const catMatch = trimmed.match(/^-?\s*\**(.+?)\**\s*[:：]?\s*$/) || trimmed.match(/^\s*-\s*\*\*(.+?)\*\*/);
    if (catMatch && !trimmed.match(/^\s*[-*]\s+\S/)) {
      let name = catMatch[1].trim().replace(/\*\*/g, '');
      // 过滤：名称本身是 URL、域名、或为纯数字引用
      if (/^https?:\/\//i.test(name) || /^\d{1,2}\/\d{1,2}\/下$/i.test(name)) continue;
      // 书名号规则：若有《，取《到最后一个》，中间字符（冒号/破折号/逗号等）一律保留
      if (name.includes('《')) {
        const start = name.indexOf('《');
        const end = name.lastIndexOf('》');
        if (end > start) name = name.slice(start, end + 1);
      }
      if (name && (name.length <= 20 || (name.includes('《') && name.length <= 50))) {
        currentCat = { name, items: [], annotation: '' };
        categories.push(currentCat);
        continue;
      }
    }
    if (currentCat) {
      const itemMatch = trimmed.match(/^\s*[-*]\s+(.+)/);
      if (itemMatch) {
        const rawItem = itemMatch[1].trim().replace(/^\[.*?\]\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1');
        // 过滤：item 是 URL、纯数字引用、或明显不是分类的内容
        if (/^https?:\/\//i.test(rawItem) || /^\[.*\]\(https?:\/\//i.test(rawItem) || /^[\[\d]/.test(rawItem) && /^\d+\.$/i.test(rawItem)) continue;
        // 拆分三级节点名与注释：概率论：研究随机现象的数学分支
        const sepIdx = rawItem.search(/[：:—]/);
        if (sepIdx !== -1) {
          const itemName = rawItem.slice(0, sepIdx).trim();
          const itemAnno = rawItem.slice(sepIdx + 1).trim();
          if (itemName && itemAnno) {
            currentCat.items.push({ name: itemName, annotation: itemAnno });
          } else {
            currentCat.items.push({ name: rawItem, annotation: '' });
          }
        } else {
          currentCat.items.push({ name: rawItem, annotation: '' });
        }
      }
    }
  }
  // 过滤空分类（所有子项都被过滤掉了）
  const filtered = categories.filter(c => c.items.length > 0);
  if (filtered.length > 0 && filtered.some(c => c.items.length > 0)) return filtered;

  // 解析2：冒号分隔（类别：项1、项2 或 类别：\n- 项1\n- 项2）
  categories.length = 0;
  const colonBlocks = raw.split(/\n\s*\n/);
  for (const block of colonBlocks) {
    const blines = block.trim().split('\n').filter(l => l.trim());
    if (blines.length === 0) continue;
    const firstLine = blines[0];
    const colonIdx = firstLine.indexOf('：') !== -1 ? firstLine.indexOf('：') : firstLine.indexOf(':');
    if (colonIdx !== -1) {
      const catName = firstLine.slice(0, colonIdx).replace(/^[-*#\d.\s]+/, '').replace(/\*\*/g, '').trim();
      const rest = firstLine.slice(colonIdx + 1).trim();
      const items = [];
      // 同行有内容：按顿号/逗号分割
      if (rest) {
        items.push(...rest.split(/[、，,;；]/).map(s => ({ name: s.trim().replace(/\*\*/g, ''), annotation: '' })).filter(s => s.name));
      }
      // 后续行作为列表项
      for (let i = 1; i < blines.length; i++) {
        const t = blines[i].replace(/^\s*[-*#\d.]+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1').trim();
        if (t) items.push({ name: t, annotation: '' });
      }
      if (catName && items.length > 0) categories.push({ name: catName, items, annotation: '' });
    }
  }
  if (categories.length > 0) return categories;

  // 解析3：Markdown 标题分块 + 下方列表项
  categories.length = 0;
  const headingRegex = /^#{1,4}\s+(.+)/gm;
  const headings = [];
  let m;
  while ((m = headingRegex.exec(raw)) !== null) {
    headings.push({ title: m[1].trim().replace(/\*\*/g, ''), pos: m.index });
  }
  if (headings.length > 0) {
    for (let i = 0; i < headings.length; i++) {
      const start = headings[i].pos;
      const end = i + 1 < headings.length ? headings[i + 1].pos : raw.length;
      const section = raw.slice(start, end);
      const secLines = section.split('\n');
      const items = [];
      for (let j = 1; j < secLines.length; j++) {
        const itemMatch = secLines[j].match(/^\s*[-*]\s+(.+)/);
        if (itemMatch) {
          const t = itemMatch[1].trim().replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[.*?\]\s*/, '');
          if (t) items.push({ name: t, annotation: '' });
        }
      }
      if (items.length > 0) categories.push({ name: headings[i].title, items });
    }
  }
  if (categories.length > 0) return categories;

  // 解析4：按空行分块，首行做类名，其余做子项
  categories.length = 0;
  const blocks = raw.split(/\n\s*\n/);
  for (const block of blocks) {
    const blines = block.trim().split('\n').filter(l => l.trim());
    if (blines.length < 2) continue;
    let name = blines[0].replace(/^[-*#\d.\s]+/, '').replace(/\*\*/g, '').trim();
    // 书名号规则：若有《，取《到最后一个》
    if (name.includes('《')) {
      const start = name.indexOf('《');
      const end = name.lastIndexOf('》');
      if (end > start) name = name.slice(start, end + 1);
    }
    const items = blines.slice(1).map(l => ({ name: l.replace(/^\s*[-*#\d.]+\s*/, '').replace(/\*\*(.+?)\*\*/g, '$1').trim(), annotation: '' })).filter(i => i.name);
    if (name && (name.length <= 20 || (name.includes('《') && name.length <= 50)) && items.length > 0) categories.push({ name, items });
  }
  if (categories.length > 0) return categories;

  // 解析5：纯文本冒号分隔（类别：项1、项2）
  categories.length = 0;
  const textLines = raw.split('\n').filter(l => l.trim().length > 0);
  for (const line of textLines) {
    const clean = line.replace(/^[-*#>\s]+/, '').trim();
    const colonMatch = clean.match(/^(.+?)[：:]\s*(.+)/);
    if (colonMatch) {
      const catName = colonMatch[1].trim().replace(/\*\*/g, '');
      const itemsStr = colonMatch[2].trim();
      const items = itemsStr.split(/[、，,;；]/).map(s => ({ name: s.trim().replace(/\*\*/g, ''), annotation: '' })).filter(s => s.name.length > 0);
      if (catName && items.length > 0) categories.push({ name: catName, items, annotation: '' });
    }
  }
  if (categories.length > 0) return categories;

  // 解析6：兜底——按行分割，每行作为一个分类，名称取前10字，items 取该行内容
  categories.length = 0;
  const fallbackLines = raw.split('\n').filter(l => l.trim().length > 0 && !l.match(/^#{1,4}\s/));
  for (const line of fallbackLines) {
    const clean = line.replace(/^[-*#>\s]+/, '').replace(/\*\*/g, '').trim();
    if (clean.length > 0 && clean.length <= 50) {
      const name = clean.length > 10 ? clean.slice(0, 10) + '…' : clean;
      categories.push({ name, items: [{ name: clean, annotation: '' }], annotation: '' });
    }
  }

  return categories;
}

function generateMindmapDOM(rootName, categories) {
  // 布局用字号估算
  const bodyFs = 15;
  const rootFs = 15.2;
  const catFs = 14.4;
  const itemFs = 14.4;
  const annoFs = 12;                // 领域注释字号
  const annoLineH = 18;             // 注释行高（含间距）
  const s = bodyFs / 14.4;
  const halfChar = bodyFs * 0.5;

  // 使用 CSS 自定义属性，切换主题时自动跟随（不再硬编码颜色值）
  const inkColor = 'var(--ink)';
  const accentColor = 'var(--accent)';

  // 分支颜色调色板（7 色）
  const branchColors = ['#6366f1', '#0F6E56', '#B45309', '#993556', '#0E7490', '#7C3AED', '#B91C1C'];

  // 文字宽度估算：中文≈1em，英文/数字≈0.55em
  function textWidth(text, fs) {
    let w = 0;
    for (const ch of text) {
      w += /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch) ? fs : fs * 0.55;
    }
    return w;
  }

  // 收集所有三级项，计算尺寸
  let totalItems = 0;
  let maxItemWidth = 0;
  let maxItemAnnoWidth = 0;
  let hasAnyAnno = false;
  for (const cat of categories) {
    for (const item of (cat.items || [])) {
      totalItems++;
      const w = textWidth(item.name, itemFs);
      if (w > maxItemWidth) maxItemWidth = w;
      if (item.annotation) {
        hasAnyAnno = true;
        const aw = textWidth(item.annotation, annoFs);
        if (aw > maxItemAnnoWidth) maxItemAnnoWidth = aw;
      }
    }
  }
  if (totalItems === 0) return '<p class="tl-empty">暂无分类数据</p>';

  // 三级项间距（含注释行高）
  const itemGap = Math.round(28 * s);

  // 计算每个三级项的高度（有注释多加一行）
  function itemHeight(itemObj) {
    return itemObj.annotation ? itemGap + annoLineH : itemGap;
  }

  // 计算每个二级分类下三级项的 y 范围
  const catRanges = [];
  let yCursor = 0;
  for (const cat of categories) {
    const count = (cat.items || []).length;
    let totalH = 0;
    for (const item of (cat.items || [])) totalH += itemHeight(item);
    const startY = yCursor;
    const endY = startY + totalH - itemGap; // 最后一项不需要尾部间距
    catRanges.push({ startY, endY, centerY: (startY + endY) / 2, count, totalH });
    yCursor += totalH;
  }

  // 文字宽度
  const rootTextWidth = textWidth(rootName, rootFs);
  let maxCatTextWidth = 0;
  for (const cat of categories) {
    const w = textWidth(cat.name, catFs);
    if (w > maxCatTextWidth) maxCatTextWidth = w;
  }

  // X 坐标：动态计算，留足间距
  const col1X = Math.round(16 * s);
  const col1EndX = col1X + rootTextWidth;
  const colGap = Math.round(50 * s);
  const col2X = col1EndX + colGap;
  const col2EndX = col2X + maxCatTextWidth;
  const col3X = col2EndX + colGap;

  // SVG 尺寸
  const svgW = col3X + Math.max(maxItemWidth, maxItemAnnoWidth) + Math.round(16 * s);
  const svgH = yCursor + Math.round(32 * s);
  const topPad = Math.round(16 * s);

  let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,PingFang SC,sans-serif">\n`;

  // 一级中心 Y
  const allItemsCenterY = topPad + (catRanges[0].startY + catRanges[catRanges.length - 1].endY) / 2;

  // 圆滑贝塞尔曲线生成器
  function smoothPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const cx1 = x1 + dx * 0.5;
    const cx2 = x2 - dx * 0.5;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${cx1.toFixed(1)} ${y1.toFixed(1)}, ${cx2.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  // 绘制一级标题
  svg += `<text class="mm-root" x="${col1X}" y="${allItemsCenterY}" fill="${accentColor}" text-anchor="start" dominant-baseline="central" style="font-size:0.95rem;font-weight:600">${escXml(rootName)}</text>\n`;

  // 绘制二级和三级
  for (let ci = 0; ci < categories.length; ci++) {
    const cat = categories[ci];
    const range = catRanges[ci];
    const catY = topPad + range.centerY;
    const branchColor = branchColors[ci % branchColors.length];
    const catWidth = textWidth(cat.name, catFs);

    // 二级标题
    svg += `<text class="mm-cat" x="${col2X}" y="${catY}" fill="${inkColor}" text-anchor="start" dominant-baseline="central" style="font-size:0.9rem;font-weight:500">${escXml(cat.name)}</text>\n`;

    // 一级→二级 圆滑曲线
    const l1X1 = col1EndX + halfChar;
    const l1Y1 = allItemsCenterY;
    const l1X2 = col2X - halfChar;
    const l1Y2 = catY;
    svg += `<path d="${smoothPath(l1X1, l1Y1, l1X2, l1Y2)}" stroke="${branchColor}" stroke-width="1" fill="none" opacity="0.5"/>\n`;
    svg += `<circle cx="${l1X1}" cy="${l1Y1}" r="2" fill="${branchColor}" opacity="0.6"/>\n`;
    svg += `<circle cx="${l1X2}" cy="${l1Y2}" r="2" fill="${branchColor}" opacity="0.6"/>\n`;

    // 三级项：累积 Y 偏移
    let itemYOffset = 0;
    for (let ii = 0; ii < (cat.items || []).length; ii++) {
      const item = cat.items[ii];
      const iH = itemHeight(item);
      const itemNameY = topPad + range.startY + itemYOffset;
      itemYOffset += iH;

      // 三级文字
      svg += `<text class="mm-item" x="${col3X}" y="${itemNameY}" fill="${inkColor}" text-anchor="start" dominant-baseline="central" style="font-size:0.9rem;font-weight:400">${escXml(item.name)}</text>\n`;

      // 三级注释（如果有）
      if (item.annotation) {
        const annoY = itemNameY + annoLineH;
        svg += `<text class="mm-anno" x="${col3X}" y="${annoY.toFixed(1)}" fill="${inkColor}" text-anchor="start" dominant-baseline="central" style="font-size:0.75rem;font-weight:400;opacity:0.55">${escXml(item.annotation)}</text>\n`;
      }

      // 二级→三级 圆滑曲线（从二级文字右端+半字符 → 三级文字左端-半字符）
      const l2X1 = col2X + catWidth + halfChar;
      const l2Y1 = catY;
      const l2X2 = col3X - halfChar;
      const l2Y2 = itemNameY;
      svg += `<path d="${smoothPath(l2X1, l2Y1, l2X2, l2Y2)}" stroke="${branchColor}" stroke-width="1" fill="none" opacity="0.5"/>\n`;
      svg += `<circle cx="${l2X1}" cy="${l2Y1}" r="2" fill="${branchColor}" opacity="0.6"/>\n`;
      svg += `<circle cx="${l2X2}" cy="${l2Y2}" r="2" fill="${branchColor}" opacity="0.6"/>\n`;
    }
  }

  svg += '</svg>';
  return svg;
}

function escXml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== 时间轴条目解析（共享） =====
function parseTimelineItems(raw) {
  const lines = raw.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const items = [];
  for (const line of lines) {
    let plain = line.replace(/^[\s]*[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
    const match = plain.match(/^(.+?)(：|:)\s*(.+)/);
    if (match) {
      items.push({ date: match[1].trim(), event: match[3].trim() });
    } else {
      items.push({ date: '', event: plain });
    }
  }
  return items;
}

// ===== 发展脉络时间轴 SVG =====
// ===== 发展脉络时间轴 HTML =====
function generateTimelineHTML(raw) {
  const items = parseTimelineItems(raw);
  if (items.length === 0) return '<p class="tl-empty">暂无时间轴数据</p>';

  let html = '<div class="tl">';
  for (const item of items) {
    // 清理事实核对标注（timeline 不支持内联 HTML tooltip）
    let evt = item.event.replace(/<sup class="fu-note"[^>]*>‡<\/sup>/g, '');
    evt = evt.replace(/<u class="fu"[^>]*>([\s\S]*?)<\/u>/g, '$1');
    html += '<div class="tl-item">';
    html += `<div class="tl-date">${escXml(item.date)}</div>`;
    html += '<div class="tl-dot" aria-hidden="true"></div>';
    html += `<div class="tl-event">${escXml(evt)}</div>`;
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// ===== 时间轴真实性核验 =====
async function verifyTimelineDates(items) {
  const results = [];
  for (const item of items) {
    if (!item.date) { results.push({ ...item, status: 'none', sources: [] }); continue; }
    const query = `${item.date} ${item.event}`;
    let found = false;
    // 优先英文源
    for (const instance of SEARXNG_INSTANCES) {
      if (found) break;
      const data = await trySearXNG(instance, query, 'wikipedia');
      if (data && data.results && data.results.length > 0) {
        results.push({
          ...item,
          status: 'ok',
          sources: data.results.slice(0, 2).map(r => ({
            title: r.title, url: r.url, snippet: (r.snippet || r.content || '').substring(0, 150)
          }))
        });
        found = true;
      }
    }
    // 回退中文源
    for (const instance of SEARXNG_INSTANCES) {
      if (found) break;
      const data = await trySearXNG(instance, query, 'baidu');
      if (data && data.results && data.results.length > 0) {
        results.push({
          ...item,
          status: 'warn',
          sources: data.results.slice(0, 1).map(r => ({
            title: r.title, url: r.url, snippet: (r.snippet || r.content || '').substring(0, 150)
          }))
        });
        found = true;
      }
    }
    if (!found) {
      results.push({ ...item, status: 'err', sources: [] });
    }
  }
  return results;
}

function renderVerifyPanel(verifyResults) {
  const ok = verifyResults.filter(r => r.status === 'ok').length;
  const warn = verifyResults.filter(r => r.status === 'warn').length;
  const err = verifyResults.filter(r => r.status === 'err').length;
  const total = verifyResults.length;
  let html = `<details class="tvr-panel"><summary class="tvr-summary">时间轴真实性核验：${ok}项通过 / ${warn}项存疑 / ${err}项待确认（共 ${total} 项）</summary>`;
  html += '<ul class="tvr-list">';
  for (const r of verifyResults) {
    const cls = r.status === 'ok' ? 'tvr-ok' : r.status === 'warn' ? 'tvr-warn' : 'tvr-err';
    const mark = r.status === 'ok' ? '✓' : r.status === 'warn' ? '△' : '✗';
    html += `<li class="${cls}"><span class="tvr-mark">${mark}</span><strong>${escXml(r.date)}</strong>：${escXml(r.event)}`;
    for (let i = 0; i < r.sources.length; i++) {
      html += ` <a class="tvr-link" href="${escXml(r.sources[i].url)}" target="_blank" rel="noopener">[源${i + 1}]</a>`;
    }
    html += '</li>';
  }
  html += '</ul></details>';
  if (err === 0 && warn === 0) {
    html += '<div class="tvr-note">所有日期均已通过英文学术源核验，可信度较高。</div>';
  } else if (err > 0) {
    html += '<div class="tvr-note">⚠ 有日期条目未找到可靠来源，请交叉验证后使用。</div>';
  }
  return html;
}

// ===== 常见误区 HTML 生成 =====
function generateMisconHTML(raw) {
  const items = [];
  const blocks = raw.split(/\n\s*\n/);
  for (const block of blocks) {
    if (!block.includes('❌')) continue;
    // 兼容 LLM 两种输出格式：带前缀（错误认知：xxx）和不带前缀（❌ xxx）
    const wrong = block.match(/❌\s*(?:错误认知[:：]?\s*)?(.+)/);
    const right = block.match(/✅\s*(?:正确理解[:：]?\s*)?(.+)/);
    const insight = block.match(/💡\s*(?:深层洞察[:：]?\s*)?(.+)/);
    if (wrong) {
      items.push({
        wrong: wrong[1].trim(),
        right: right ? right[1].trim() : '',
        insight: insight ? insight[1].trim() : ''
      });
    }
  }
  if (items.length === 0) {
    return '<div class="miscon-fallback">' + marked.parse(raw) + '</div>';
  }
  // 过滤"待补充"项：正解和洞察都为空（或只有"待补充"占位）的项不显示
  const hasContent = items.filter(it => {
    const rightEmpty = !it.right || /^[（(]待补充[）)]$/.test(it.right.trim());
    const insightEmpty = !it.insight || /^[（(]待补充[）)]$/.test(it.insight.trim());
    return !rightEmpty || !insightEmpty;
  });
  // 全部都是待补充 → 直接显示"暂无常见误区"
  if (hasContent.length === 0) {
    return '<div class="miscon-fallback">该概念暂无常见误区记录。</div>';
  }
  return hasContent.map(it => `
    <div class="miscon-group">
      <div class="miscon-left-body">
        <div class="miscon-row">
          <span class="miscon-icon miscon-icon-wrong">✗</span>
          <div class="miscon-row-text"><span class="label">误区</span><div class="body">${esc(it.wrong)}</div></div>
        </div>
        ${it.right && !/^[（(]待补充[）)]$/.test(it.right.trim()) ? `
        <div class="miscon-row">
          <span class="miscon-icon miscon-icon-right">✓</span>
          <div class="miscon-row-text"><span class="label">正解</span><div class="body">${esc(it.right)}</div></div>
        </div>` : ''}
      </div>
      ${it.insight && !/^[（(]待补充[）)]$/.test(it.insight.trim()) ? `
      <div class="miscon-insight-col">
        <span class="miscon-insight-icon">•</span>
        <div class="miscon-insight-content"><div class="label">洞察</div>${esc(it.insight)}</div>
      </div>` : ''}
    </div>
  `).join('');
}

// ===== 底层原理 / 长内容 → 可折叠手风琴 =====
function generateAccordionHTML(raw) {
  // 按「维度X：」开头拆分段落
  const items = [];
  const parts = raw.split(/\n(?=维度\s*[一二三四五六七八九十\d]+[：:])/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(维度\s*[一二三四五六七八九十\d]+)[：:]\s*(.+)$/s);
    if (m) {
      const prefix = m[1].trim();
      const rest = m[2].trim();
      // 标题与正文在同一行，用第一个句号分割（标题通常是一句话）
      let title, body;
      const dotIdx = rest.indexOf('。');
      if (dotIdx > 4 && dotIdx < 80) {
        title = rest.slice(0, dotIdx + 1);   // 包含句号
        body = rest.slice(dotIdx + 1).trim(); // 句号之后全是正文
      } else {
        // 没有合适句号，取前45字为标题
        title = rest.length > 45 ? rest.slice(0, 45) + '…' : rest;
        body = rest;
      }
      items.push({ title: prefix + '：' + title, body });
    } else {
      if (items.length > 0) {
        items[items.length - 1].body += '\n' + trimmed;
      } else {
        items.push({ title: trimmed.slice(0, 60), body: trimmed });
      }
    }
  }
  if (items.length === 0) return '<div class="accordion-fallback">' + marked.parse(raw) + '</div>';

  return `<div class="accordion">${items.map((it, i) => `
    <div class="acc-item${i === 0 ? ' acc-open' : ''}">
      <div class="acc-head" onclick="toggleAcc(this)">
        <span class="acc-title">${esc(it.title)}</span>
        <span class="acc-btn"><svg class="acc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></span>
      </div>
      <div class="acc-body"><div class="acc-body-inner">${marked.parse(it.body)}</div></div>
    </div>
  `).join('')}</div>`;
}

function toggleAcc(head) {
  const item = head.parentElement;
  const isOpen = item.classList.contains('acc-open');
  item.classList.toggle('acc-open', !isOpen);
}

// ===== 最新前沿 / 长内容 → 渐进式逐段展开 =====
function generateProgressiveHTML(raw) {
  // 按双换行或年份开头拆分段落
  const paras = raw
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (paras.length === 0) return '<div class="prog-fallback">' + marked.parse(raw) + '</div>';

  return `<div class="progressive">${paras.map((p, i) => `
    <div class="prog-item${i === 0 ? ' prog-visible' : ''}" data-idx="${i}">
      <div class="prog-body">${marked.parse(p)}</div>
    </div>
  `).join('')}
    <button class="prog-more-btn" onclick="showNextProg(this)">展开下一段 ▾</button>
  </div>`;
}

function showNextProg(btn) {
  const container = btn.parentElement;
  const hidden = container.querySelector('.prog-item:not(.prog-visible)');
  if (!hidden) { btn.style.display = 'none'; return; }
  hidden.classList.add('prog-visible');
  // 如果没有更多隐藏项了，隐藏按钮
  if (!container.querySelector('.prog-item:not(.prog-visible)')) {
    btn.style.display = 'none';
  }
}

// ===== 卡片网格 HTML 生成（变更单-42） =====
function generateCardGridHTML(raw, variant) {
  const lines = raw.split('\n');
  const items = [];

  if (variant === 'issue') {
    // 模块7：**难题名** [状态]：描述
    for (const line of lines) {
      const m = line.match(/^\s*\*\*(.+?)\*\*\s*\[(.+?)\]\s*[:：]\s*(.+)/);
      if (m) items.push({ name: m[1].trim(), status: m[2].trim(), desc: m[3].trim() });
    }
    if (items.length === 0) return marked.parse(raw);
    return items.map(it => {
      const statusClass = it.status.includes('未解') ? 'unsolved' : it.status.includes('研究') ? 'active' : 'solved';
      return `<div class="viz-card">
        <span class="card-pill ${statusClass}">${esc(it.status)}</span><div class="card-title">${esc(it.name)}</div>
        <div class="card-desc">${esc(it.desc)}</div>
      </div>`;
    }).join('');
  }

  if (variant === 'scenario') {
    // 模块9：场景名：描述（优先识别《书名》避免书名内冒号截断）
    for (const line of lines) {
      let m = line.match(/^\s*《(.+?)》\s*[:：]\s*(.+)/);
      if (m && !m[1].includes('格式') && !m[1].includes('示例') && m[1].length < 40) {
        items.push({ name: '《' + m[1].trim() + '》', desc: m[2].trim() });
      } else {
        m = line.match(/^\s*(.+?)\s*[:：]\s*(.+)/);
        if (m && !m[1].includes('格式') && !m[1].includes('示例') && m[1].length < 20) {
          items.push({ name: m[1].trim(), desc: m[2].trim() });
        }
      }
    }
    if (items.length === 0) return marked.parse(raw);
    return items.map(it => `<div class="viz-card">
      <div class="card-title">${esc(it.name)}</div>
      <div class="card-desc">${esc(it.desc)}</div>
    </div>`).join('');
  }

  if (variant === 'lesson') {
    // 模块12：序号. **课程名** [时长]：微任务
    for (const line of lines) {
      const m = line.match(/^\s*\d+\.\s*\*\*(.+?)\*\*\s*\[(.+?)\]\s*[:：]\s*(.+)/);
      if (m) items.push({ name: m[1].trim(), duration: m[2].trim(), task: m[3].trim() });
    }
    if (items.length === 0) return marked.parse(raw);
    return items.map((it, i) => {
      const checkKey = 'lesson_' + currentConcept + '_' + i;
      const checked = localStorage.getItem(checkKey) === '1';
      return `<div class="viz-card">
        <input type="checkbox" class="card-check" ${checked ? 'checked' : ''} onchange="localStorage.setItem('${checkKey}', this.checked ? '1' : '0')" />
        <div class="card-duration">${esc(it.duration)}</div>
        <div class="card-title">${esc(it.name)}</div>
        <div class="card-desc">${esc(it.task)}</div>
      </div>`;
    }).join('');
  }

  if (variant === 'tool') {
    // 模块12：按 **类型名** 分组（优先识别《书名》避免书名内冒号截断）
    let currentGroup = '';
    let groupHtml = [];
    let currentItems = [];
    for (const line of lines) {
      const grp = line.match(/^\s*\*\*(.+?)\*\*\s*$/);
      if (grp) {
        if (currentItems.length > 0) {
          groupHtml.push(`<div class="card-group-title">${esc(currentGroup)}</div>` + currentItems.join(''));
          currentItems = [];
        }
        currentGroup = grp[1].trim();
        continue;
      }
      let m = line.match(/^\s*-\s*《(.+?)》\s*[:：]\s*(.+)/);
      if (m) {
        currentItems.push(`<div class="viz-card"><div class="card-title">《${esc(m[1].trim())}》</div><div class="card-desc">${esc(m[2].trim())}</div></div>`);
      } else {
        m = line.match(/^\s*-\s*(.+?)\s*[:：]\s*(.+)/);
        if (m) {
          currentItems.push(`<div class="viz-card"><div class="card-title">${esc(m[1].trim())}</div><div class="card-desc">${esc(m[2].trim())}</div></div>`);
        }
      }
    }
    if (currentItems.length > 0) {
      groupHtml.push(`<div class="card-group-title">${esc(currentGroup)}</div>` + currentItems.join(''));
    }
    if (groupHtml.length === 0) return marked.parse(raw);
    return groupHtml.join('');
  }

  if (variant === 'path') {
    // 模块11：**阶段名** [时长] + 三个子项
    const stages = [];
    let cur = null;
    let afterStage = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 阶段头：**阶段名** [时长]
      const sm = line.match(/^\*\*(.+?)\*\*\s*\[(.+?)\]/);
      if (sm) {
        if (cur && cur.items.length > 0) stages.push(cur);
        cur = { name: sm[1].trim(), duration: sm[2].trim(), items: [], isPro: sm[1].includes('专业') };
        afterStage = true;
        continue;
      }
      // 子项：- 标签：内容
      if (afterStage && cur) {
        const im = line.match(/^\s*-\s*(.+?)\s*[:：]\s*(.+)/);
        if (im) cur.items.push({ label: im[1].trim(), text: im[2].trim() });
        else if (line === '' && cur.items.length > 0) afterStage = false;
      }
    }
    if (cur && cur.items.length > 0) stages.push(cur);
    if (stages.length === 0) return marked.parse(raw);

    return stages.map(s => {
      const proClass = s.isPro ? ' viz-card-pro' : '';
      return `<div class="viz-card${proClass}">
        <div class="card-phase-title">${esc(s.name)}</div>
        <div class="card-phase-duration">${esc(s.duration)}</div>
        ${s.items.map(it => `<div class="card-phase-item">
          <span class="card-phase-label">${esc(it.label)}</span>
          <span class="card-phase-text">${esc(it.text)}</span>
        </div>`).join('')}
      </div>`;
    }).join('');
  }

  return marked.parse(raw);
}

// ===== 模块10 放射图（变更单-42） =====
function generateRadialDOM(concept, terms) {
  const nodes = (terms || []).slice(0, 8);
  const cx = 280, cy = 280, r = 200, nodeR = 24;
  const safeConcept = esc(concept || '');

  // SVG 放射图
  let svgPaths = '';
  let svgNodes = '';
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    svgPaths += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--rule)" stroke-width="1.5" />`;
    const termEsc = esc(node.term || '');
    svgNodes += `<circle class="radial-node" cx="${x}" cy="${y}" r="${nodeR}" fill="var(--panel-bg)" stroke="var(--accent)" stroke-width="2" onclick="showGlossary(event,'${termEsc}')" />`;
    svgNodes += `<text class="radial-label" x="${x}" y="${y + nodeR + 14}" fill="var(--ink)">${termEsc}</text>`;
  });

  const svgHtml = `<svg class="radial-svg" viewBox="0 0 560 560" preserveAspectRatio="xMidYMid meet">
    <line x1="0" y1="0" x2="0" y2="0" stroke="none" />
    ${svgPaths}
    <circle class="radial-center" cx="${cx}" cy="${cy}" r="60" fill="var(--accent)" opacity="0.15" />
    <circle cx="${cx}" cy="${cy}" r="60" fill="none" stroke="var(--accent)" stroke-width="2" />
    <text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="var(--ink)" font-size="14" font-weight="600">${safeConcept}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--muted)" font-size="12">核心概念</text>
    ${svgNodes}
  </svg>`;

  return `<div class="module-radial">${svgHtml}</div>`;
}

// ===== LLM 格式校验 =====
function validateStructure(structure) {
  const errors = [];
  const layers = structure.layers || [];
  if (layers.length === 0) {
    errors.push('未解析到任何层级（LLM 可能未按 ## 第X层 格式输出）');
  }
  let totalModules = 0;
  for (const layer of layers) {
    const mods = layer.modules || [];
    totalModules += mods.length;
    if (mods.length === 0) {
      errors.push(`层级「${layer.name}」下无模块`);
    }
    for (const mod of mods) {
      if (!mod.content || mod.content.trim().length < 20) {
        errors.push(`模块「${mod.title}」内容过短或为空`);
      }
    }
  }
  if (totalModules < 2) {
    errors.push(`总模块数 ${totalModules} 过少，可能解析不完整`);
  }
  return { valid: errors.length === 0, errors };
}

// ===== SearXNG 实例池 + 健康检查（变更单-25 重建） =====
let SEARXNG_INSTANCES = JSON.parse(localStorage.getItem('searxng_instances_v2') || '[]');
if (SEARXNG_INSTANCES.length === 0) {
  SEARXNG_INSTANCES = [
    'https://baresearch.org',
    'https://search.anoni.net',
    'https://search.catboy.house',
    'https://search.bladerunn.in',
    'https://sear.lurx.net',
  ];
  localStorage.setItem('searxng_instances_v2', JSON.stringify(SEARXNG_INSTANCES));
}
const SEARXNG_DOWN = new Map();

async function trySearXNG(instance, query, engine) {
  if (SEARXNG_DOWN.has(instance) && Date.now() < SEARXNG_DOWN.get(instance)) return null;
  try {
    let url = instance + '/search?q=' + encodeURIComponent(query) + '&format=json&categories=general&language=zh&pageno=1';
    if (engine) url += '&engines=' + engine;
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), 5000);
    const resp = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tm);
    if (!resp.ok) throw new Error('bad status');
    return await resp.json();
  } catch (_) {
    SEARXNG_DOWN.set(instance, Date.now() + 60000);
    return null;
  }
}

// ===== 多引擎搜索（变更单-25 重建 / 变更单-43 并行化） =====
async function searchWebSources(concept) {
  const result = { zhref: false, web: false, snippets: [] };
  const engines = [
    { eng: 'wikipedia', isZh: true },
    { eng: 'baidu', isZh: true },
    { eng: 'bing', isZh: false },
    { eng: 'google', isZh: false },
  ];

  // 并发信号量：限制同实例同时最多 2 个请求，防止 SearXNG 公网限流
  const semMap = new Map();
  const limit = (key, fn) => {
    if (!semMap.has(key)) semMap.set(key, { running: 0, queue: [] });
    const s = semMap.get(key);
    return new Promise((resolve, reject) => {
      const run = () => { s.running++; fn().then(v => { s.running--; next(); resolve(v); }).catch(e => { s.running--; next(); reject(e); }); };
      const next = () => { if (s.queue.length && s.running < 2) { s.queue.shift()(); } };
      if (s.running < 2) run(); else s.queue.push(run);
    });
  };

  const requests = [];
  for (const instance of SEARXNG_INSTANCES) {
    for (const e of engines) {
      requests.push(
        limit(instance, () => trySearXNG(instance, concept, e.eng)).then(data => ({ engine: e, data }))
      );
    }
  }

  const settled = await Promise.allSettled(requests);

  for (const r of settled) {
    if (r.status !== 'fulfilled' || !r.value || !r.value.data) continue;
    const { engine, data } = r.value;
    if (!data.results || data.results.length === 0) continue;

    if (engine.isZh) result.zhref = true;
    else result.web = true;

    for (let i = 0; i < Math.min(2, data.results.length); i++) {
      const item = data.results[i];
      if (item.snippet || item.content) {
        result.snippets.push({
          text: (item.snippet || item.content).substring(0, 200),
          url: item.url || '',
          engine: engine.eng
        });
      }
    }
  }

  return result;
}

// ===== 四级来源校验（变更单-40） =====

// ===== 来源校验（逐渠道实时回报进度） =====
const SOURCE_TIMEOUT = 5000;

async function verifyWikidata(concept) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT);
  const sparqlUrl = 'https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(
    `SELECT ?item ?itemLabel ?itemDescription WHERE { ?item rdfs:label "${concept}"@zh. SERVICE wikibase:label { bd:serviceParam wikibase:language "zh". } } LIMIT 1`
  );
  const res = await fetch(sparqlUrl, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
  clearTimeout(timer);
  const data = await res.json();
  const bindings = (data.results && data.results.bindings) || [];
  if (bindings.length > 0) {
    const b = bindings[0];
    return { hit: true, url: b.item.value, title: (b.itemLabel && b.itemLabel.value) || concept };
  }
  return { hit: false, url: '', title: '' };
}

async function verifySearXNG(concept) {
  const sr = await searchWebSources(concept);
  if (sr.snippets && sr.snippets.length > 0) {
    const s = sr.snippets[0];
    return { hit: true, url: s.url || '', title: s.text ? s.text.substring(0, 60) : concept };
  }
  return { hit: false, url: '', title: '' };
}

async function verifyZhWiki(concept) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT);
  const wikiUrl = `https://zh.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(concept)}&format=json&srlimit=1`;
  const res = await fetch(wikiUrl, { signal: ctrl.signal });
  clearTimeout(timer);
  const data = await res.json();
  const results = (data.query && data.query.search) || [];
  if (results.length > 0) {
    const r = results[0];
    return { hit: true, url: `https://zh.wikipedia.org/wiki?curid=${r.pageid}`, title: r.title };
  }
  return { hit: false, url: '', title: '' };
}

async function verifyDDG(concept) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SOURCE_TIMEOUT);
  const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(concept)}&format=json&no_html=1`;
  const res = await fetch(ddgUrl, { signal: ctrl.signal });
  clearTimeout(timer);
  const data = await res.json();
  const ddgUrl2 = data.AbstractURL || (data.RelatedTopics && data.RelatedTopics[0] && data.RelatedTopics[0].FirstURL) || '';
  const ddgTitle = data.Heading || (data.RelatedTopics && data.RelatedTopics[0] && data.RelatedTopics[0].Text) || '';
  if (ddgUrl2) {
    return { hit: true, url: ddgUrl2, title: ddgTitle || concept };
  }
  return { hit: false, url: '', title: '' };
}

/**
 * 并行校验 4 个渠道来源，每完成一个就调用 onProgress(sources) 实时刷新 UI。
 * 全局硬超时（VERIFY_HARD_TIMEOUT）兜底，任何渠道挂死都不会拖垮整体。
 * @returns {Promise<{verified:boolean, sources:Array}>}
 */
const VERIFY_HARD_TIMEOUT = 12000;
async function verifySources(concept, onProgress) {
  const channels = [
    { label: 'Wikidata', run: verifyWikidata },
    { label: 'SearXNG', run: verifySearXNG },
    { label: '中文维基', run: verifyZhWiki },
    { label: 'DuckDuckGo', run: verifyDDG },
  ];
  const CHANNEL_TIMEOUT = 6000; // 每个渠道独立超时 6 秒
  const sources = channels.map(ch => ({ label: ch.label, status: 'checking', hit: false, url: '', title: '' }));
  if (onProgress) onProgress(sources);

  // 并行跑所有渠道，每个带独立超时兜底（防止 fetch 在 CORS 下挂死不 settle）
  const tasks = channels.map((ch, i) =>
    Promise.race([
      ch.run(concept).catch(() => ({ hit: false, url: '', title: '' })),
      new Promise(resolve => setTimeout(() => resolve({ hit: false, url: '', title: '' }), CHANNEL_TIMEOUT))
    ]).then(r => {
      const e = sources[i];
      e.hit = !!r.hit; e.url = r.url || ''; e.title = r.title || '';
      e.status = e.hit ? 'hit' : 'miss';
      if (onProgress) onProgress(sources);
    })
  );

  // 全局兜底：到点强制收尾，把仍在 checking 的标记为 miss
  const guard = new Promise(resolve => setTimeout(() => {
    let changed = false;
    for (const e of sources) {
      if (e.status === 'checking') { e.status = 'miss'; changed = true; }
    }
    if (changed && onProgress) onProgress(sources);
    resolve();
  }, VERIFY_HARD_TIMEOUT));

  await Promise.race([Promise.all(tasks), guard]);
  const verified = sources.some(s => s.hit);
  return { verified, sources };
}

// ===================================================================
// L2 事实级核对：生成后、展示前静默修正；查不到出处的标注 ⚠️
// 设计原则（产品决策）：绝不让用户看到未核对/可能错误的内容；
// 能确认的冲突直接替换为正确值；不确定的标注"AI 生成、仅供参考"。
// ===================================================================

// Obsidian 反写时追加的来源标记（兜底：区分系统写入 vs 用户批注）
const OBSIDIAN_SOURCE_MARK = '\n\n---\n> 📌 本文由「元引擎」自动生成并经过事实核对。带 ⚠️ 标记的内容为 AI 自行生成、未找到权威出处，仅供参考；其余内容已尽量核对，请以原始来源为准。';

// 不确定事实的标注（轻量：首处带符号‡+虚线下划线，后续仅虚线下划线）
// 用原生 HTML <u> 标签，markdown 渲染器通常透传；Obsidian 也支持
const FACT_WARN_FULL = (t) => `<u class="fu" data-tip="AI 生成，未找到权威出处，仅供参考">${t}</u><sup class="fu-note">‡</sup>`;
const FACT_WARN_SHORT = (t) => `<u class="fu" data-tip="AI 生成，未找到权威出处，仅供参考">${t}</u>`;

const EXTRACT_SYSTEM = `你是一名严谨的事实核查助手。下面是一篇知识框架内容（Markdown）。请抽取其中所有可被外部权威来源（维基百科、官方网站等）独立验证的【具体事实断言】，重点关注：年份/日期、人名、地名、事件、具体数字、机构名。
忽略：主观评价、定义性/解释性文字、无法客观验证的表述、框架结构标签。
对每条事实输出 JSON 数组，元素：{"id":序号,"originalText":原文中承载该事实的短语或短句（尽量原样摘录，便于后续定位替换）,"claim":用一句客观陈述描述该事实,"type":"date|person|place|event|number|org"}。
只输出 JSON 数组本身，不要任何解释或代码围栏。`;

const VERIFY_SYSTEM = `你是一名事实核查裁判。判断下列事实断言是否正确。
若正确 verdict="correct"；若错误 verdict="wrong" 并在 correctedText 给出修正后的原文短语（保持原句式，仅替换错误部分）；若搜索摘要不足以判断 verdict="unknown"。
只输出 JSON 对象：{"verdict":"correct|wrong|unknown","correctedText":"","note":""}，不要解释。`;

// 轻量搜索：DDG + 中文维基并行，各 5s 超时，返回拼接摘要
async function factSearch(query) {
  const snippets = [];
  const tasks = [
    (async () => {
      try {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 5000);
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
        const r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tm);
        const d = await r.json();
        if (d.AbstractText) snippets.push(d.AbstractText);
        if (Array.isArray(d.RelatedTopics)) d.RelatedTopics.slice(0, 3).forEach(t => { if (t && t.Text) snippets.push(t.Text); });
      } catch (e) {}
    })(),
    (async () => {
      try {
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 5000);
        const url = `https://zh.wikipedia.org/w/api.php?origin=*&action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`;
        const r = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tm);
        const d = await r.json();
        (d.query && d.query.search || []).forEach(s => snippets.push(s.snippet || s.title));
      } catch (e) {}
    })()
  ];
  await Promise.allSettled(tasks);
  return snippets.join('\n').substring(0, 1500);
}

// 大小写不敏感、仅替换首次出现；返回 {changed,text}
function safeReplace(text, from, to) {
  if (!from) return { changed: false, text };
  const idx = text.toLowerCase().indexOf(from.toLowerCase());
  if (idx === -1) return { changed: false, text };
  return { changed: true, text: text.slice(0, idx) + to + text.slice(idx + from.length) };
}

// 并发受限的 map
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let idx = 0;
  const runners = [];
  const n = Math.min(limit, items.length);
  for (let i = 0; i < n; i++) {
    runners.push((async () => {
      while (idx < items.length) {
        const cur = idx++;
        results[cur] = await worker(items[cur], cur);
      }
    })());
  }
  await Promise.all(runners);
  return results;
}

/**
 * 事实核对主流程：抽取 → 并发逐条判定 → 静默修正 / 标注。
 * 返回 { markdown: 修正后内容, summary: {total,corrected,unknown} }
 */
async function factCheckAndPatch(markdown, concept, onProgress, maxFacts = 12, concurrency = 3) {
  onProgress && onProgress({ phase: 'extract', done: 0, total: 0 });
  let facts = [];
  try {
    facts = await callLLMJson(EXTRACT_SYSTEM, `概念：${concept}\n\n内容：\n${markdown}`);
    if (!Array.isArray(facts)) facts = [];
  } catch (e) {
    console.warn('[factCheck] 抽取失败，按原内容渲染:', e);
    facts = [];
  }
  facts = facts.slice(0, maxFacts); // 上限，控制耗时
  const total = facts.length;
  let result = markdown;
  let corrected = 0, unknown = 0;
  let firstUnknown = true; // 首处 unknown 显示 ‡ 符号，后续仅下划线
  const lock = { done: 0 };
  await mapWithConcurrency(facts, concurrency, async (f) => {
    try {
      const snippets = await factSearch(`${concept} ${f.claim || f.originalText || ''}`);
      const judge = await callLLMJson(VERIFY_SYSTEM,
        `类型：${f.type || 'fact'}\n原文短语：${f.originalText || ''}\n客观陈述：${f.claim || ''}\n\n搜索摘要：\n${snippets}`);
      if (judge.verdict === 'wrong' && judge.correctedText) {
        const r = safeReplace(result, f.originalText, judge.correctedText);
        if (r.changed) { result = r.text; corrected++; }
      } else if (judge.verdict === 'unknown') {
        const marked = firstUnknown ? FACT_WARN_FULL(f.originalText) : FACT_WARN_SHORT(f.originalText);
        const r = safeReplace(result, f.originalText, marked);
        if (r.changed) { result = r.text; unknown++; if (firstUnknown) firstUnknown = false; }
      }
    } catch (e) { /* 单条失败不影响整体 */ }
    lock.done++;
    onProgress && onProgress({ phase: 'verify', done: lock.done, total });
  });
  onProgress && onProgress({ phase: 'done', done: total, total });
  return { markdown: result, summary: { total, corrected, unknown } };
}

function toggleSourcePanel() {
  const panel = document.getElementById('sourcePanel');
  const overlay = document.getElementById('readerSearchOverlay');
  if (!panel) return;
  if (panel.classList.contains('hidden')) {
    closeReaderSearch();
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    renderSourcePanel();
  } else {
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
  }
}

function closeReaderPopups() {
  closeReaderSearch();
  const sp = document.getElementById('sourcePanel');
  if (sp) sp.classList.add('hidden');
  const ov = document.getElementById('readerSearchOverlay');
  if (ov) ov.classList.add('hidden');
}

function renderSourcePanel() {
  const panel = document.getElementById('sourcePanel');
  if (!panel) return;
  const sources = (readerState && readerState.sources) || [];
  const concept = readerState ? readerState.concept : '';
  let html = '<div class="source-panel-inner">';
  html += `<div class="source-panel-title">参考链接 · ${esc(concept)}</div>`;
  const hits = sources.filter(s => s.hit && s.url);
  if (hits.length === 0) {
    html += '<div class="source-item miss"><span class="source-icon">⬜</span><span class="source-label">未找到参考链接</span></div>';
  } else {
    for (const s of hits) {
      html += `<div class="source-item hit"><span class="source-icon">🔗</span><a href="${s.url}" target="_blank" rel="noopener" class="source-label" style="color:var(--accent);text-decoration:underline;">${esc(s.label)}</a></div>`;
    }
  }
  html += '</div>';
  panel.innerHTML = html;
}

// ===== 框架内搜索 =====
let readerSearchState = { term: '', matches: [], currentIdx: -1 };

function toggleReaderSearch() {
  const panel = document.getElementById('readerSearchPanel');
  const overlay = document.getElementById('readerSearchOverlay');
  const sp = document.getElementById('sourcePanel');
  if (panel.classList.contains('hidden')) {
    if (sp) sp.classList.add('hidden');
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    document.getElementById('readerSearchInput').focus();
  } else {
    closeReaderSearch();
  }
}

function closeReaderSearch() {
  document.getElementById('readerSearchPanel').classList.add('hidden');
  document.getElementById('readerSearchOverlay').classList.add('hidden');
  document.getElementById('readerSearchInput').value = '';
  document.getElementById('readerSearchStatus').textContent = '';
  document.querySelectorAll('.reader-page mark.reader-highlight').forEach(m => m.outerHTML = m.innerHTML);
  readerSearchState = { term: '', matches: [], currentIdx: -1 };
}

function performReaderSearch(term) {
  readerSearchState.term = term;
  readerSearchState.matches = [];
  readerSearchState.currentIdx = -1;
  document.querySelectorAll('.reader-page mark.reader-highlight').forEach(m => m.outerHTML = m.innerHTML);
  if (!term) { document.getElementById('readerSearchStatus').textContent = ''; return; }
  const pages = document.querySelectorAll('.reader-page');
  pages.forEach((page, pageIdx) => {
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const text = node.textContent;
      const lower = text.toLowerCase();
      const searchLower = term.toLowerCase();
      let idx = 0;
      while ((idx = lower.indexOf(searchLower, idx)) !== -1) {
        readerSearchState.matches.push({ pageIdx, node, offset: idx, len: term.length });
        idx += term.length;
      }
    }
  });
  document.getElementById('readerSearchStatus').textContent = readerSearchState.matches.length === 0 ? '无匹配' : `${readerSearchState.matches.length} 个匹配`;
  if (readerSearchState.matches.length > 0) jumpToMatch(0);
}

function jumpToMatch(idx) {
  if (idx < 0 || idx >= readerSearchState.matches.length) return;
  readerSearchState.currentIdx = idx;
  const m = readerSearchState.matches[idx];
  goToLayer(m.pageIdx);
  const range = document.createRange();
  range.setStart(m.node, m.offset);
  range.setEnd(m.node, m.offset + m.len);
  const mark = document.createElement('mark');
  mark.className = 'reader-highlight active';
  mark.textContent = m.node.textContent.slice(m.offset, m.offset + m.len);
  try { range.deleteContents(); range.insertNode(mark); mark.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
  document.getElementById('readerSearchStatus').textContent = `第 ${idx + 1}/${readerSearchState.matches.length} 个匹配`;
}

// ===== Quick Examples =====
const QUICK_EXAMPLES = ['博弈论', '熵增定律', 'CRISPR', '机器学习', '纳什均衡', '暗物质', '内卷', '显眼包'];

// ===== Onboarding Guide (first-time users) =====
const ONBOARDING_KEY = 'metaengine_onboarded';
const ONBOARDING_STEPS = [
  { icon: '🔑', zh: '设置 API Key', en: 'Set API Key', desc_zh: '一个 Key 搞定所有功能。推荐 DeepSeek（<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">注册即送额度</a>）。', desc_en: 'One key for everything. DeepSeek recommended (<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">free credits on signup</a>).', keyInput: true },
  { icon: '🔍', zh: '输入任意概念', en: 'Enter any concept', desc_zh: '从博弈论到显眼包，学术或流行都行', desc_en: 'From Game Theory to trending memes' },
  { icon: '🌐', zh: 'AI 联网搜索', en: 'AI web search', desc_zh: '实时搜索 + 交叉验证，杜绝编造', desc_en: 'Real-time search with cross-verification' },
  { icon: '🧠', zh: '生成认知框架', en: 'Generate framework', desc_zh: '12 模块深度拆解，每条认知都有出处', desc_en: '12-module deep breakdown, every claim sourced' },
  { icon: '📂', zh: '同步到 Obsidian', en: 'Sync to Obsidian', desc_zh: '一键存入你的知识库，随时回顾', desc_en: 'One click into your vault, review anytime' },
];

function showOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY) === '1') return;
  let step = 0;
  const overlay = document.createElement('div');
  overlay.className = 'onboard-overlay';
  const box = document.createElement('div');
  box.className = 'onboard-box';
  function render() {
    const s = ONBOARDING_STEPS[step];
    const title = currentLang === 'en' ? s.en : s.zh;
    const desc = currentLang === 'en' ? s.desc_en : s.desc_zh;
    const keyExtra = s.keyInput ? `
      <div style="margin:1rem 0;text-align:left">
        <input type="password" id="onboardKey" class="onboard-key-input" placeholder="sk-..." autocomplete="off"
               value="${(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')).apiKey || ''}">
        <div style="font-size:0.7rem;color:var(--text-3);margin-top:0.3rem">
          ${currentLang === 'en' ? '🔒 Stored locally only' : '🔒 仅存本地浏览器'}
        </div>
      </div>` : '';
    box.innerHTML = `
      <div class="onboard-icon">${s.icon}</div>
      <h2 class="onboard-title">${title}</h2>
      <p class="onboard-desc">${desc}</p>
      ${keyExtra}
      <div class="onboard-dots">${ONBOARDING_STEPS.map((_, i) => `<span class="onboard-dot ${i === step ? 'active' : ''}"></span>`).join('')}</div>
      <div class="onboard-actions">
        <button class="onboard-skip">${t('confirm_skip') || '跳过'}</button>
        <button class="onboard-next">${step < ONBOARDING_STEPS.length - 1 ? (currentLang === 'en' ? 'Next' : '下一步') : (currentLang === 'en' ? 'Got it' : '开始使用')}</button>
      </div>`;
    box.querySelector('.onboard-skip').onclick = () => { overlay.remove(); localStorage.setItem(ONBOARDING_KEY, '1'); };
    box.querySelector('.onboard-next').onclick = () => {
      if (s.keyInput) {
        const keyEl = document.getElementById('onboardKey');
        const key = keyEl ? keyEl.value.trim() : '';
        if (key) {
          const cfg = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
          cfg.apiKey = key;
          cfg.apiBase = cfg.apiBase || 'https://api.deepseek.com';
          cfg.modelName = cfg.modelName || 'deepseek-v4-flash';
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(cfg));
          try { loadSettings(); } catch(_) {}
        }
      }
      if (step < ONBOARDING_STEPS.length - 1) { step++; render(); }
      else { overlay.remove(); localStorage.setItem(ONBOARDING_KEY, '1'); }
    };
  }
  render();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}
function renderQuickExamples() {
  const container = document.getElementById('quickExamples');
  if (!container) return;
  const { presets } = computeCapsules();
  container.innerHTML = presets
    .map(ex =>
      `<span class="quick-ex" data-concept="${esc(ex)}" onclick="startWithConcept(this)">${ex}</span>`
    ).join('');
}

// ===== Keyboard Shortcuts =====
function setupKeyboard() {
  const hintEl = document.getElementById('kbHint');
  let hintTimer = null;
  function showHint(text) {
    hintEl.textContent = text;
    hintEl.classList.add('show');
    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hintEl.classList.remove('show'), 2000);
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSettings();
      document.querySelectorAll('.glossary-tooltip').forEach(t => t.remove());
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startGenerate();
      showHint('Ctrl + Enter 生成');
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      document.getElementById('conceptInput').focus();
      showHint('/ 聚焦搜索');
    }
  });
}

// ===== WKWebView 顶层函数显式挂到 window（async 函数 hoisting 修复）=====
try { if (typeof bootDiagEl === 'function') window.bootDiagEl = bootDiagEl; } catch(e) {}
try { if (typeof bootStep === 'function') window.bootStep = bootStep; } catch(e) {}
try { if (typeof showBootError === 'function') window.showBootError = showBootError; } catch(e) {}
try { if (typeof checkOnclickFns === 'function') window.checkOnclickFns = checkOnclickFns; } catch(e) {}
try { if (typeof handlerSelector === 'function') window.handlerSelector = handlerSelector; } catch(e) {}
try { if (typeof callHandler === 'function') window.callHandler = callHandler; } catch(e) {}
try { if (typeof splitTopLevel === 'function') window.splitTopLevel = splitTopLevel; } catch(e) {}
try { if (typeof resolveArg === 'function') window.resolveArg = resolveArg; } catch(e) {}
try { if (typeof bindEl === 'function') window.bindEl = bindEl; } catch(e) {}
try { if (typeof bindAllHandlers === 'function') window.bindAllHandlers = bindAllHandlers; } catch(e) {}
try { if (typeof watchOnclickMutations === 'function') window.watchOnclickMutations = watchOnclickMutations; } catch(e) {}
try { if (typeof buildSystemPrompt === 'function') window.buildSystemPrompt = buildSystemPrompt; } catch(e) {}
try { if (typeof openDB === 'function') window.openDB = openDB; } catch(e) {}
try { if (typeof dbPut === 'function') window.dbPut = dbPut; } catch(e) {}
try { if (typeof dbGet === 'function') window.dbGet = dbGet; } catch(e) {}
try { if (typeof dbGetAll === 'function') window.dbGetAll = dbGetAll; } catch(e) {}
try { if (typeof dbDelete === 'function') window.dbDelete = dbDelete; } catch(e) {}
try { if (typeof dbClear === 'function') window.dbClear = dbClear; } catch(e) {}
try { if (typeof loadSettings === 'function') window.loadSettings = loadSettings; } catch(e) {}
try { if (typeof saveSettings === 'function') window.saveSettings = saveSettings; } catch(e) {}
try { if (typeof applyThemeMode === 'function') window.applyThemeMode = applyThemeMode; } catch(e) {}
try { if (typeof _openHandleDb === 'function') window._openHandleDb = _openHandleDb; } catch(e) {}
try { if (typeof getObsidianHandle === 'function') window.getObsidianHandle = getObsidianHandle; } catch(e) {}
try { if (typeof setObsidianHandle === 'function') window.setObsidianHandle = setObsidianHandle; } catch(e) {}
try { if (typeof fsDirectWriteSupported === 'function') window.fsDirectWriteSupported = fsDirectWriteSupported; } catch(e) {}
try { if (typeof refreshFsAccessStatus === 'function') window.refreshFsAccessStatus = refreshFsAccessStatus; } catch(e) {}
try { if (typeof selectSyncDir === 'function') window.selectSyncDir = selectSyncDir; } catch(e) {}
try { if (typeof clearSyncDir === 'function') window.clearSyncDir = clearSyncDir; } catch(e) {}
try { if (typeof writeFileToDir === 'function') window.writeFileToDir = writeFileToDir; } catch(e) {}
try { if (typeof isTauriEnv === 'function') window.isTauriEnv = isTauriEnv; } catch(e) {}
try { if (typeof buildObsidianFiles === 'function') window.buildObsidianFiles = buildObsidianFiles; } catch(e) {}
try { if (typeof tauriWriteObsidian === 'function') window.tauriWriteObsidian = tauriWriteObsidian; } catch(e) {}
try { if (typeof getSettings === 'function') window.getSettings = getSettings; } catch(e) {}
try { if (typeof toggleTheme === 'function') window.toggleTheme = toggleTheme; } catch(e) {}
try { if (typeof syncThemeSwitch === 'function') window.syncThemeSwitch = syncThemeSwitch; } catch(e) {}
try { if (typeof openSettings === 'function') window.openSettings = openSettings; } catch(e) {}
try { if (typeof closeSettings === 'function') window.closeSettings = closeSettings; } catch(e) {}
try { if (typeof parseMarkdown === 'function') window.parseMarkdown = parseMarkdown; } catch(e) {}
try { if (typeof extractGlossary === 'function') window.extractGlossary = extractGlossary; } catch(e) {}
try { if (typeof extractGlossaryFromContent === 'function') window.extractGlossaryFromContent = extractGlossaryFromContent; } catch(e) {}
try { if (typeof callLLM === 'function') window.callLLM = callLLM; } catch(e) {}
try { if (typeof callLLMJson === 'function') window.callLLMJson = callLLMJson; } catch(e) {}
try { if (typeof callLLMStream === 'function') window.callLLMStream = callLLMStream; } catch(e) {}
try { if (typeof startGenerate === 'function') window.startGenerate = startGenerate; } catch(e) {}
try { if (typeof friendlyError === 'function') window.friendlyError = friendlyError; } catch(e) {}
try { if (typeof showPage === 'function') window.showPage = showPage; } catch(e) {}
try { if (typeof renderLayerPage === 'function') window.renderLayerPage = renderLayerPage; } catch(e) {}
try { if (typeof appendRemainingLayers === 'function') window.appendRemainingLayers = appendRemainingLayers; } catch(e) {}
try { if (typeof showFactProgress === 'function') window.showFactProgress = showFactProgress; } catch(e) {}
try { if (typeof hideFactProgress === 'function') window.hideFactProgress = hideFactProgress; } catch(e) {}
try { if (typeof updateFactProgress === 'function') window.updateFactProgress = updateFactProgress; } catch(e) {}
try { if (typeof renderResult === 'function') window.renderResult = renderResult; } catch(e) {}
try { if (typeof readerShellHTML === 'function') window.readerShellHTML = readerShellHTML; } catch(e) {}
try { if (typeof attachReaderShell === 'function') window.attachReaderShell = attachReaderShell; } catch(e) {}
try { if (typeof startSourceVerify === 'function') window.startSourceVerify = startSourceVerify; } catch(e) {}
try { if (typeof hideHomeProgress === 'function') window.hideHomeProgress = hideHomeProgress; } catch(e) {}
try { if (typeof startPipelineProgress === 'function') window.startPipelineProgress = startPipelineProgress; } catch(e) {}
try { if (typeof renderPipelineProgress === 'function') window.renderPipelineProgress = renderPipelineProgress; } catch(e) {}
try { if (typeof verifyLayerParallel === 'function') window.verifyLayerParallel = verifyLayerParallel; } catch(e) {}
try { if (typeof finalizeGeneratedLayer === 'function') window.finalizeGeneratedLayer = finalizeGeneratedLayer; } catch(e) {}
try { if (typeof scheduleReveal === 'function') window.scheduleReveal = scheduleReveal; } catch(e) {}
try { if (typeof openReaderForPipe === 'function') window.openReaderForPipe = openReaderForPipe; } catch(e) {}
try { if (typeof appendLayerPageToReader === 'function') window.appendLayerPageToReader = appendLayerPageToReader; } catch(e) {}
try { if (typeof renderReaderDots === 'function') window.renderReaderDots = renderReaderDots; } catch(e) {}
try { if (typeof rebuildReaderDots === 'function') window.rebuildReaderDots = rebuildReaderDots; } catch(e) {}
try { if (typeof goToLayer === 'function') window.goToLayer = goToLayer; } catch(e) {}
try { if (typeof updateReaderNav === 'function') window.updateReaderNav = updateReaderNav; } catch(e) {}
try { if (typeof closeReader === 'function') window.closeReader = closeReader; } catch(e) {}
try { if (typeof readerConcept === 'function') window.readerConcept = readerConcept; } catch(e) {}
try { if (typeof toggleReaderMore === 'function') window.toggleReaderMore = toggleReaderMore; } catch(e) {}
try { if (typeof closeReaderMore === 'function') window.closeReaderMore = closeReaderMore; } catch(e) {}
try { if (typeof regenerate === 'function') window.regenerate = regenerate; } catch(e) {}
try { if (typeof showConfirm === 'function') window.showConfirm = showConfirm; } catch(e) {}
try { if (typeof closeConfirm === 'function') window.closeConfirm = closeConfirm; } catch(e) {}
try { if (typeof confirmRegenerate === 'function') window.confirmRegenerate = confirmRegenerate; } catch(e) {}
try { if (typeof toggleLayer === 'function') window.toggleLayer = toggleLayer; } catch(e) {}
try { if (typeof toggleModuleExpand === 'function') window.toggleModuleExpand = toggleModuleExpand; } catch(e) {}
try { if (typeof jumpToTerm === 'function') window.jumpToTerm = jumpToTerm; } catch(e) {}
try { if (typeof showGlossary === 'function') window.showGlossary = showGlossary; } catch(e) {}
try { if (typeof generateSub === 'function') window.generateSub = generateSub; } catch(e) {}
try { if (typeof exportOne === 'function') window.exportOne = exportOne; } catch(e) {}
try { if (typeof downloadFile === 'function') window.downloadFile = downloadFile; } catch(e) {}
try { if (typeof cleanMarkdownForExport === 'function') window.cleanMarkdownForExport = cleanMarkdownForExport; } catch(e) {}
try { if (typeof exportAll === 'function') window.exportAll = exportAll; } catch(e) {}
try { if (typeof currentIsDark === 'function') window.currentIsDark = currentIsDark; } catch(e) {}
try { if (typeof exportThemeTokens === 'function') window.exportThemeTokens = exportThemeTokens; } catch(e) {}
try { if (typeof injectExportStyle === 'function') window.injectExportStyle = injectExportStyle; } catch(e) {}
try { if (typeof resolveCssVars === 'function') window.resolveCssVars = resolveCssVars; } catch(e) {}
try { if (typeof renderModuleContentForExport === 'function') window.renderModuleContentForExport = renderModuleContentForExport; } catch(e) {}
try { if (typeof buildExportCard === 'function') window.buildExportCard = buildExportCard; } catch(e) {}
try { if (typeof applyExportColors === 'function') window.applyExportColors = applyExportColors; } catch(e) {}
try { if (typeof showExportLoading === 'function') window.showExportLoading = showExportLoading; } catch(e) {}
try { if (typeof hideExportLoading === 'function') window.hideExportLoading = hideExportLoading; } catch(e) {}
try { if (typeof checkExportLibs === 'function') window.checkExportLibs = checkExportLibs; } catch(e) {}
try { if (typeof exportPng === 'function') window.exportPng = exportPng; } catch(e) {}
try { if (typeof exportPdf === 'function') window.exportPdf = exportPdf; } catch(e) {}
try { if (typeof exportSingleLayer === 'function') window.exportSingleLayer = exportSingleLayer; } catch(e) {}
try { if (typeof toggleExportMenu === 'function') window.toggleExportMenu = toggleExportMenu; } catch(e) {}
try { if (typeof toggleExportLayerList === 'function') window.toggleExportLayerList = toggleExportLayerList; } catch(e) {}
try { if (typeof escCloseExportMenu === 'function') window.escCloseExportMenu = escCloseExportMenu; } catch(e) {}
try { if (typeof closeExportMenuOnce === 'function') window.closeExportMenuOnce = closeExportMenuOnce; } catch(e) {}
try { if (typeof doExport === 'function') window.doExport = doExport; } catch(e) {}
try { if (typeof syncObsidianNow === 'function') window.syncObsidianNow = syncObsidianNow; } catch(e) {}
try { if (typeof clearCache === 'function') window.clearCache = clearCache; } catch(e) {}
try { if (typeof showToast === 'function') window.showToast = showToast; } catch(e) {}
try { if (typeof syncToObsidian === 'function') window.syncToObsidian = syncToObsidian; } catch(e) {}
try { if (typeof readFromObsidian === 'function') window.readFromObsidian = readFromObsidian; } catch(e) {}
try { if (typeof saveHistory === 'function') window.saveHistory = saveHistory; } catch(e) {}
try { if (typeof getHistory === 'function') window.getHistory = getHistory; } catch(e) {}
try { if (typeof computeCapsules === 'function') window.computeCapsules = computeCapsules; } catch(e) {}
try { if (typeof clearHistory === 'function') window.clearHistory = clearHistory; } catch(e) {}
try { if (typeof startWithConcept === 'function') window.startWithConcept = startWithConcept; } catch(e) {}
try { if (typeof renderHistory === 'function') window.renderHistory = renderHistory; } catch(e) {}
try { if (typeof esc === 'function') window.esc = esc; } catch(e) {}
try { if (typeof escRegex === 'function') window.escRegex = escRegex; } catch(e) {}
try { if (typeof splitText === 'function') window.splitText = splitText; } catch(e) {}
try { if (typeof parseMindmapCategories === 'function') window.parseMindmapCategories = parseMindmapCategories; } catch(e) {}
try { if (typeof generateMindmapDOM === 'function') window.generateMindmapDOM = generateMindmapDOM; } catch(e) {}
try { if (typeof escXml === 'function') window.escXml = escXml; } catch(e) {}
try { if (typeof parseTimelineItems === 'function') window.parseTimelineItems = parseTimelineItems; } catch(e) {}
try { if (typeof generateTimelineHTML === 'function') window.generateTimelineHTML = generateTimelineHTML; } catch(e) {}
try { if (typeof verifyTimelineDates === 'function') window.verifyTimelineDates = verifyTimelineDates; } catch(e) {}
try { if (typeof renderVerifyPanel === 'function') window.renderVerifyPanel = renderVerifyPanel; } catch(e) {}
try { if (typeof generateMisconHTML === 'function') window.generateMisconHTML = generateMisconHTML; } catch(e) {}
try { if (typeof generateAccordionHTML === 'function') window.generateAccordionHTML = generateAccordionHTML; } catch(e) {}
try { if (typeof toggleAcc === 'function') window.toggleAcc = toggleAcc; } catch(e) {}
try { if (typeof generateProgressiveHTML === 'function') window.generateProgressiveHTML = generateProgressiveHTML; } catch(e) {}
try { if (typeof showNextProg === 'function') window.showNextProg = showNextProg; } catch(e) {}
try { if (typeof generateCardGridHTML === 'function') window.generateCardGridHTML = generateCardGridHTML; } catch(e) {}
try { if (typeof generateRadialDOM === 'function') window.generateRadialDOM = generateRadialDOM; } catch(e) {}
try { if (typeof validateStructure === 'function') window.validateStructure = validateStructure; } catch(e) {}
try { if (typeof trySearXNG === 'function') window.trySearXNG = trySearXNG; } catch(e) {}
try { if (typeof searchWebSources === 'function') window.searchWebSources = searchWebSources; } catch(e) {}
try { if (typeof verifyWikidata === 'function') window.verifyWikidata = verifyWikidata; } catch(e) {}
try { if (typeof verifySearXNG === 'function') window.verifySearXNG = verifySearXNG; } catch(e) {}
try { if (typeof verifyZhWiki === 'function') window.verifyZhWiki = verifyZhWiki; } catch(e) {}
try { if (typeof verifyDDG === 'function') window.verifyDDG = verifyDDG; } catch(e) {}
try { if (typeof verifySources === 'function') window.verifySources = verifySources; } catch(e) {}
try { if (typeof factSearch === 'function') window.factSearch = factSearch; } catch(e) {}
try { if (typeof safeReplace === 'function') window.safeReplace = safeReplace; } catch(e) {}
try { if (typeof mapWithConcurrency === 'function') window.mapWithConcurrency = mapWithConcurrency; } catch(e) {}
try { if (typeof factCheckAndPatch === 'function') window.factCheckAndPatch = factCheckAndPatch; } catch(e) {}
try { if (typeof toggleSourcePanel === 'function') window.toggleSourcePanel = toggleSourcePanel; } catch(e) {}
try { if (typeof closeReaderPopups === 'function') window.closeReaderPopups = closeReaderPopups; } catch(e) {}
try { if (typeof renderSourcePanel === 'function') window.renderSourcePanel = renderSourcePanel; } catch(e) {}
try { if (typeof toggleReaderSearch === 'function') window.toggleReaderSearch = toggleReaderSearch; } catch(e) {}
try { if (typeof closeReaderSearch === 'function') window.closeReaderSearch = closeReaderSearch; } catch(e) {}
try { if (typeof performReaderSearch === 'function') window.performReaderSearch = performReaderSearch; } catch(e) {}
try { if (typeof jumpToMatch === 'function') window.jumpToMatch = jumpToMatch; } catch(e) {}
try { if (typeof renderQuickExamples === 'function') window.renderQuickExamples = renderQuickExamples; } catch(e) {}
try { if (typeof setupKeyboard === 'function') window.setupKeyboard = setupKeyboard; } catch(e) {}
try { if (typeof t === 'function') window.t = t; } catch(e) {}
try { if (typeof setLang === 'function') window.setLang = setLang; } catch(e) {}
try { if (typeof openDonate === 'function') window.openDonate = openDonate; } catch(e) {}
try { if (typeof closeDonate === 'function') window.closeDonate = closeDonate; } catch(e) {}
try { if (typeof showOnboarding === 'function') window.showOnboarding = showOnboarding; } catch(e) {}
try { if (typeof closeOnboarding === 'function') window.closeOnboarding = closeOnboarding; } catch(e) {}

// ===== Init =====
// 容错隔离：每个初始化子步骤独立 try/catch，单个子系统失败不再中断整段初始化
async function safeInit(name, fn) {
  try {
    await fn();
  } catch (e) {
    var msg = '[初始化警告] ' + name + ': ' + (e && e.message ? e.message : String(e));
    if (window.__bootErrors) window.__bootErrors.push(msg);
    try { bootStep(msg); } catch (_) {}
    console.error(msg, e);
  }
}
window.addEventListener('DOMContentLoaded', async () => {
  await safeInit('bindAllHandlers', () => bindAllHandlers());
  await safeInit('watchOnclickMutations', () => watchOnclickMutations());
  await safeInit('loadSettings', () => loadSettings());
  await safeInit('applySavedLang', () => applySavedLang());
  // 同步滑动开关初始状态
  await safeInit('syncThemeSwitch', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const isDark = currentTheme === 'dark' || (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    syncThemeSwitch(isDark);
  });
  await safeInit('openDB', async () => { await openDB(); });
  // App 模式：启动时从 Rust 端拉取当前已记录的同步目录并显示在设置面板（否则会显示「未选择」造成误解）
  await safeInit('get_sync_dir', async () => {
    if (isTauriEnv() && window.__TAURI__ && window.__TAURI__.core) {
      const d = await window.__TAURI__.core.invoke('get_sync_dir');
      const el = document.getElementById('obsidianDirName');
      if (el) el.textContent = d || t('settings_sync_none');
    }
  });
  await safeInit('renderQuickExamples', () => renderQuickExamples());
  await safeInit('renderHistory', () => renderHistory());
  await safeInit('setupKeyboard', () => setupKeyboard());
  await safeInit('showOnboarding', () => { setTimeout(showOnboarding, 600); });
  try {
    bootStep('Tauri 环境=' + (typeof window.__TAURI__ !== 'undefined') + '，isTauriEnv()=' + (typeof isTauriEnv === 'function' ? isTauriEnv() : 'n/a'));
    checkOnclickFns();
    bootStep('初始化完成 ✓（若上方无 [错误]/[警告]，说明脚本已就绪，请尝试点击按钮）');
    // 启动期若无任何 JS 错误，2.6s 后自动淡出诊断条；若有错误则保留以便截图反馈
    setTimeout(function () {
      var d = bootDiagEl();
      if (!d) return;
      if ((window.__bootErrors || []).length === 0) {
        d.style.transition = 'opacity .6s ease';
        d.style.opacity = '0';
        setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 700);
      }
    }, 2600);
  } catch (e) { bootStep('[初始化自检错误] ' + (e && e.message)); }
});
