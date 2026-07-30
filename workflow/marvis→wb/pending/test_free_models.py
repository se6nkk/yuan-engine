#!/usr/bin/env python3
"""
免费模型质量测试脚本
用法: 
  export SILICONFLOW_KEY=sk-xxx
  export ZHIPU_KEY=xxx          # 可选，仅测试 GLM-4-Flash 时需要
  python test_free_models.py
"""
import os, json, time, sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ===== 配置 =====
SILICONFLOW_KEY = os.environ.get("SILICONFLOW_KEY", "")
ZHIPU_KEY = os.environ.get("ZHIPU_KEY", "")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "marvis→wb", "archived", "free_model_test")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CONCEPTS = ["博弈论", "熵", "第一性原理", "认知偏差", "边际效用"]

MODELS = {
    "A_glm4-plus": {
        "url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        "model": "glm-4-plus",
        "key_env": "ZHIPU_KEY",
    },
    "B_GLM4-9B-Chat": {
        "url": "https://api.siliconflow.cn/v1/chat/completions",
        "model": "THUDM/glm-4-9b-chat",
        "key_env": "SILICONFLOW_KEY",
    },
    "C_Qwen2.5-7B": {
        "url": "https://api.siliconflow.cn/v1/chat/completions",
        "model": "Qwen/Qwen2.5-7B-Instruct",
        "key_env": "SILICONFLOW_KEY",
    },
    "D_GLM4-Flash": {
        "url": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        "model": "glm-4-flash",
        "key_env": "ZHIPU_KEY",
    },
}

# ===== System Prompt（从 index.html buildSystemPrompt 提取，不含搜索结果） =====
def build_prompt(concept):
    return f"""你是一位顶尖的认知科学专家与知识工程师。你的任务是为用户输入的概念「{concept}」生成一个完整的五层渐进认知框架。

**重要：概念类型判定。** 若输入是一个**具体作品名**（动画、电影、电视剧、小说、游戏、漫画等），你必须分析该作品本身（故事设定、世界观、主题思想、创作背景等），**严禁**将其名称拆字做字面哲学解读。例如：输入"灵笼"应分析国产动画《灵笼》的世界观与设定，而非解读"灵魂的笼子"这一抽象概念。若无法确认该名称是否为具体作品，优先参考下方网络搜索信息判断。

输出格式要求：
使用 Markdown 格式，严格按照以下 12 个模块的结构输出。各模块有独立字数范围，请严格遵守，不可为凑总字数而稀释重头模块、也不可为省字而跳过低字数模块。

# {concept} · 认知框架

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
- 至少列出 6 个关键事件，每个事件描述 1-2 句话

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
- **每个维度严格按以下格式输出：`维度X：一句话摘要。正文段落。`**（标题后必须跟冒号，摘要以句号收尾，摘要后紧跟正文，不可将摘要与正文拆成多行）

### 6. 最新前沿
介绍该概念在学术界或产业界的最新进展（近 3-5 年）。格式要求：
- 至少列出 3 个进展，每个包含：时间（年份）、机构/研究者、核心突破点
- 每个进展独立一段，2-4 句话展开，不可只写标题
- 总字数 600-1000 字

### 7. 核心难题
列出该领域尚未解决的重大开放问题。
格式要求：
- 每个难题独占一行，至少列出 3 个
- 格式：**难题名** [状态]：一句简述
- 状态取「未解决」「研究中」「已突破」三者之一

---

## 第四层：拓展应用（3-5分钟阅读）

### 8. 跨领域连接
说明该概念如何与其他学科产生联系和应用。格式要求：
- 至少列出 3 个跨领域连接，每个独立一段
- 每个连接必须以 **加粗小标题** 开头，格式：**概念名 × 领域名**
- 小标题后换行展开该连接的具体机制：该概念在目标领域中充当什么角色、解决了什么问题
- 不可写成"XX与YY有关"这种空洞陈述
- 总字数 300-500 字

### 9. 现实映射
给出 3-5 个该概念在现实世界中的具体应用场景。
格式要求：
- 每个场景独占一行
- 格式：场景名：一句话描述该概念在此场景中的应用方式

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

### 12. 工具箱
推荐学习该概念相关的工具、软件、数据集或实验平台。
格式要求：
- 按类型分组，每组用 **加粗类型名** 独占一行
- 每个工具独占一行，格式：- 工具名：一句话说明

---

注意事项：
- 所有内容使用中文
- 重头模块（5 底层原理、6 最新前沿）必须充分展开，这是整个框架的核心价值
- 轻量模块（1 核心定义、11 推荐学习路径、12 工具箱）追求精准而非堆字数
- 模块 10 中的术语要准确，方便后续生成独立词条
- 禁止在任何模块中使用空洞套话（如"具有重要意义""值得深入研究""发挥着关键作用"等无信息量的表述）
- 每个模块的输出质量优先于字数要求，如果概念本身高度专业，允许超出上限"""


# ===== 调用 API =====
def call_api(url, model, api_key, prompt, max_tokens=8192, timeout=180):
    body = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": max_tokens,
    }
    data = json.dumps(body).encode("utf-8")
    req = Request(url, data=data, headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    })
    try:
        resp = urlopen(req, timeout=timeout)
        result = json.loads(resp.read().decode("utf-8"))
        content = result["choices"][0]["message"]["content"]
        usage = result.get("usage", {})
        return content, usage
    except HTTPError as e:
        err_body = e.read().decode("utf-8")
        return f"HTTP {e.code}: {err_body}", None
    except Exception as e:
        return f"Error: {str(e)}", None


# ===== 主流程 =====
def main():
    results = {}

    for model_key, cfg in MODELS.items():
        env_var = cfg["key_env"]
        api_key = SILICONFLOW_KEY if env_var == "SILICONFLOW_KEY" else ZHIPU_KEY
        if not api_key:
            print(f"[跳过] {model_key}: 缺少 {env_var}")
            continue

        print(f"\n{'='*60}")
        print(f"模型: {model_key} ({cfg['model']})")
        print(f"{'='*60}")

        for concept in CONCEPTS:
            safe_name = concept.replace("/", "_")
            output_path = os.path.join(OUTPUT_DIR, f"{model_key}_{safe_name}.md")

            if os.path.exists(output_path):
                print(f"  [已存在] {concept} → {output_path}")
                continue

            prompt = build_prompt(concept)
            print(f"  生成: {concept} ... ", end="", flush=True)

            start = time.time()
            content, usage = call_api(cfg["url"], cfg["model"], api_key, prompt)
            elapsed = time.time() - start

            if usage:
                tokens = usage.get("total_tokens", "?")
                print(f"完成 ({elapsed:.1f}s, {tokens} tokens)")
            else:
                print(f"失败 ({elapsed:.1f}s)")

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(content)

            time.sleep(2)  # 避免限流

    print(f"\n输出目录: {OUTPUT_DIR}")
    print("测试完成。")


if __name__ == "__main__":
    main()
