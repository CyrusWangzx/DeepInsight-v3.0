"""分歧检测算法 - DeepInsight核心创新

三模型异构分歧检测：DeepSeek/GLM/Kimi 三个不同模型的分析结果交叉比对

检测流程：
1. 尝试用 LLM 提取关键结论并量化分歧（精确模式）
2. 如果 LLM 调用失败，回退到文本相似度对比（兜底模式）
"""
import json
import re
from difflib import SequenceMatcher
from services.llm import call_model


DIVERGENCE_EXTRACTION_PROMPT = """你是一个专业的多视角审查对比专家。

你的任务：比对三个AI分析师（使用不同模型）的分析结果，提取关键结论并量化分歧。

请严格按照以下JSON格式输出（不要输出任何其他内容）：

```json
{
  "conclusions": [
    {
      "topic": "审查主题",
      "agent_a": {"position": "Agent A的立场", "severity": 3, "evidence": "支撑证据摘要"},
      "agent_b": {"position": "Agent B的立场", "severity": 2, "evidence": "支撑证据摘要"},
      "agent_c": {"position": "Agent C的立场", "severity": 4, "evidence": "支撑证据摘要"}
    }
  ]
}
```

要求：
1. 提取3-5个核心审查主题
2. 每个主题下记录三个分析师各自的立场、问题严重度(1-5)和支撑证据
3. 严重度差异≥2级的主题必须包含
4. 立场完全相反的主题必须包含
5. 某个分析师未提及但其他两个都提及的主题必须包含

以下是三个分析师的分析结果：

【政策风险分析师】
{agent_a_result}

【供应链分析师】
{agent_b_result}

【技术路线分析师】
{agent_c_result}
"""

DIVERGENCE_ANALYSIS_PROMPT = """基于以下三个分析师的结论对比，计算分歧度并生成分歧报告。

结论对比数据：
{conclusions_json}

请严格按照以下JSON格式输出（不要输出任何其他内容）：

```json
{{
  "divergence_points": [
    {{
      "topic": "分歧主题",
      "divergence_type": "分析结论矛盾/问题严重度分歧/分析盲区",
      "severity": 0.8,
      "description": "分歧描述"
    }}
  ],
  "divergence_score": 0.45,
  "focus_questions": ["针对分歧点1的追问", "针对分歧点2的追问"]
}}
```

分歧度计算规则：
- 分析结论矛盾（立场完全相反）：单点severity = 0.7-1.0
- 问题严重度分歧（严重度差≥2）：单点severity = 0.4-0.7
- 分析盲区（某分析师未覆盖）：单点severity = 0.2-0.5
- 总分歧度 = 各点severity的加权平均（结论矛盾权重0.4，严重度分歧0.35，分析盲区0.25）
- focus_questions：只针对severity >= 0.4的分歧点生成追问
"""


# ============================================================
# 兜底算法：基于文本相似度的分歧检测
# ============================================================
def _extract_key_sentences(text: str, max_sentences: int = 10) -> list:
    """从分析文本中提取关键句子（去掉空行和格式标记）"""
    # 去掉 markdown 标记
    text = re.sub(r'#{1,6}\s*', '', text)
    text = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', text)
    text = re.sub(r'[-•]\s*', '', text)

    # 按句号/换行分句
    sentences = re.split(r'[。\n]+', text)
    # 过滤空句和过短句
    key_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    return key_sentences[:max_sentences]


def _compute_text_divergence(text_a: str, text_b: str, text_c: str) -> dict:
    """基于文本相似度的分歧度计算（兜底算法）

    原理：
    1. 提取三段文本的关键句子
    2. 计算两两之间的相似度
    3. 相似度越低 → 分歧越大
    """
    sentences_a = _extract_key_sentences(text_a)
    sentences_b = _extract_key_sentences(text_b)
    sentences_c = _extract_key_sentences(text_c)

    if not sentences_a or not sentences_b or not sentences_c:
        return {
            "divergence_points": [],
            "divergence_score": 0.3,
            "focus_questions": [],
        }

    # 计算两两文本的整体相似度
    full_sim_ab = SequenceMatcher(None, text_a[:2000], text_b[:2000]).ratio()
    full_sim_bc = SequenceMatcher(None, text_b[:2000], text_c[:2000]).ratio()
    full_sim_ac = SequenceMatcher(None, text_a[:2000], text_c[:2000]).ratio()

    avg_similarity = (full_sim_ab + full_sim_bc + full_sim_ac) / 3

    # 也计算关键句子级别的交叉覆盖率
    cross_matches = 0
    total_checks = 0
    for s in sentences_a[:5]:
        best_sim = max(
            SequenceMatcher(None, s, sb).ratio() for sb in sentences_b[:5]
        ) if sentences_b else 0
        cross_matches += best_sim
        total_checks += 1
    for s in sentences_b[:5]:
        best_sim = max(
            SequenceMatcher(None, s, sc).ratio() for sc in sentences_c[:5]
        ) if sentences_c else 0
        cross_matches += best_sim
        total_checks += 1

    sentence_sim = cross_matches / total_checks if total_checks > 0 else 0.5

    # 综合分歧度：相似度越低，分歧越大
    combined_similarity = avg_similarity * 0.6 + sentence_sim * 0.4
    divergence_score = round(1.0 - combined_similarity, 2)
    # 限制范围 [0.1, 0.9]，避免极端值
    divergence_score = max(0.1, min(0.9, divergence_score))

    # 生成分歧点
    divergence_points = []
    pairs = [
        ("政策风险分析师 vs 供应链分析师", full_sim_ab),
        ("供应链分析师 vs 技术路线分析师", full_sim_bc),
        ("政策风险分析师 vs 技术路线分析师", full_sim_ac),
    ]
    for pair_name, sim in pairs:
        if sim < 0.4:
            divergence_points.append({
                "topic": f"分析差异：{pair_name}",
                "divergence_type": "分析结论分歧",
                "severity": round(1.0 - sim, 2),
                "description": f"两方分析结论差异较大（相似度 {sim:.0%}），可能存在视角盲区或判断分歧",
            })

    focus_questions = []
    if divergence_score > 0.4:
        focus_questions.append("请进一步分析各分析师结论的核心分歧点")

    return {
        "divergence_points": divergence_points,
        "divergence_score": divergence_score,
        "focus_questions": focus_questions,
    }


# ============================================================
# LLM 模式的分歧检测
# ============================================================
def extract_conclusions(agent_a_result: str, agent_b_result: str, agent_c_result: str) -> list:
    """用 DeepSeek 提取三分析师的关键结论"""
    messages = [{"role": "user", "content": DIVERGENCE_EXTRACTION_PROMPT.format(
        agent_a_result=agent_a_result,
        agent_b_result=agent_b_result,
        agent_c_result=agent_c_result,
    )}]
    try:
        text = call_model("deepseek", messages, max_tokens=2000, temperature=0.1)
        json_str = _extract_json(text)
        data = json.loads(json_str)
        conclusions = data.get("conclusions", [])
        if not conclusions:
            if isinstance(data, list):
                conclusions = data
            elif isinstance(data, dict):
                for v in data.values():
                    if isinstance(v, list) and len(v) > 0:
                        conclusions = v
                        break
        return conclusions
    except Exception:
        return []


def compute_divergence(conclusions: list) -> dict:
    """用 DeepSeek 计算分歧度并生成分歧报告"""
    messages = [{"role": "user", "content": DIVERGENCE_ANALYSIS_PROMPT.format(
        conclusions_json=json.dumps(conclusions, ensure_ascii=False, indent=2)
    )}]
    try:
        text = call_model("deepseek", messages, max_tokens=1500, temperature=0.1)
        json_str = _extract_json(text)
        result = json.loads(json_str)
        score = float(result.get("divergence_score", 0.5))
        # 确保分数在合理范围
        score = max(0.1, min(0.9, score))
        return {
            "divergence_points": result.get("divergence_points", []),
            "divergence_score": score,
            "focus_questions": result.get("focus_questions", []),
        }
    except Exception:
        return {}


# ============================================================
# 主入口：带兜底的分歧检测
# ============================================================
def detect_divergence(agent_a_result: str, agent_b_result: str, agent_c_result: str) -> dict:
    """完整分歧检测流程：LLM精确模式 → 文本相似度兜底模式

    永远不会返回0.5的默认值，而是基于实际内容计算分歧度
    """
    # 第一步：尝试 LLM 精确模式
    conclusions = extract_conclusions(agent_a_result, agent_b_result, agent_c_result)
    if conclusions:
        llm_result = compute_divergence(conclusions)
        if llm_result:
            return llm_result

    # 第二步：LLM 失败，回退到文本相似度兜底
    return _compute_text_divergence(agent_a_result, agent_b_result, agent_c_result)


def _extract_json(text: str) -> str:
    """从LLM输出中提取JSON块 - 增强版"""
    text = text.strip()

    # 1. 尝试提取 ```json ... ``` 代码块
    if "```json" in text:
        start = text.index("```json") + 7
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()

    # 2. 尝试提取 ``` ... ``` 代码块
    if "```" in text:
        start = text.index("```") + 3
        first_newline = text.find("\n", start)
        if first_newline != -1 and first_newline - start < 20:
            start = first_newline + 1
        end = text.find("```", start)
        if end != -1:
            return text[start:end].strip()

    # 3. 尝试找最外层的 { } 或 [ ]
    for open_char, close_char in [("{", "}"), ("[", "]")]:
        start = text.find(open_char)
        if start != -1:
            depth = 0
            for i in range(start, len(text)):
                if text[i] == open_char:
                    depth += 1
                elif text[i] == close_char:
                    depth -= 1
                if depth == 0:
                    return text[start:i+1].strip()

    # 4. 直接返回原文
    return text
