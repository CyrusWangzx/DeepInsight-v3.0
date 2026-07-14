"""DeepInsight LangGraph核心工作流（v3.0 三模型异构）

工作流：用户输入 → 匿名化 → 分析规划 → 三Agent并行(异构模型) → 分歧检测 → 共识综合 → 交叉验证报告

模型分配：
- 匿名化/规划/分歧检测/共识综合 → DeepSeek V4 Flash（原生 OpenAI 调用）
- 政策风险分析师 → DeepSeek V4 Flash（LangChain Agent + Tool Calling）
- 供应链分析师   → GLM-5.2（LangChain Agent + Tool Calling）
- 技术路线分析师 → Kimi K2.6（LangChain Agent + Tool Calling）
"""
import time
import json
from langgraph.graph import StateGraph, END
from models.state import AgentState
from services.llm import (
    call_model, get_silicon_llm_for_synthesis,
    MODELS, MODEL_DISPLAY,
)
from services.divergence import detect_divergence
from agents.policy_analyst import get_policy_analyst
from agents.supply_chain import get_supply_chain_analyst
from agents.tech_route import get_tech_route_analyst

MAX_VALIDATION_ROUNDS = 2
MAX_AGENT_RETRIES = 2  # Agent 调用最大重试次数


def _run_agent_with_retry(agent_fn, enhanced_query: str, meta: dict, result_key: str) -> dict:
    """带重试的 Agent 执行器

    Args:
        agent_fn: 获取 Agent 的函数（如 get_policy_analyst）
        enhanced_query: 增强后的查询文本
        meta: Agent 元信息字典
        result_key: 返回结果的 key（如 agent_a_result）
    """
    last_error = None
    for attempt in range(MAX_AGENT_RETRIES + 1):
        try:
            agent = agent_fn()
            result = agent.invoke({"input": enhanced_query})
            output = result.get("output", result.get("result", str(result)))
            return {result_key: {
                "agent_name": meta["display"],
                "model_name": meta["model_display"],
                "model_key": meta["model"],
                "output": output,
            }}
        except Exception as e:
            last_error = e
            if attempt < MAX_AGENT_RETRIES:
                time.sleep(2 * (attempt + 1))  # 递增等待：2s, 4s
                continue
    # 所有重试失败
    return {result_key: {
        "agent_name": meta["display"],
        "model_name": meta["model_display"],
        "output": f"[分析异常] 模型 {meta['model_display']} 调用失败（已重试{MAX_AGENT_RETRIES}次）: {last_error}",
        "error": True,
    }}

# ============================================================
# 节点1：匿名化（DeepSeek 原生调用）
# ============================================================
ANONYMIZE_PROMPT = """你是一个文本匿名化专家。请将用户输入的商业决策描述中的以下信息替换为通用占位符：
- 具体公司名 → [公司A]、[公司B]
- 具体金额 → [金额X]
- 具体人名 → [人物X]
- 具体地址 → [地点X]

保留决策的核心逻辑和结构，只替换可能引发偏见的实体信息。

原始输入：
{query}

请直接输出匿名化后的文本，不要添加任何说明。"""


def anonymize_query(state: AgentState) -> dict:
    """匿名化用户问题，消除品牌/金额偏见"""
    prompt = ANONYMIZE_PROMPT.format(query=state["query"])
    messages = [{"role": "user", "content": prompt}]
    result = call_model("deepseek", messages, max_tokens=1000, temperature=0.1)
    return {"anonymous_query": result.strip()}


# ============================================================
# 节点2：分析规划（DeepSeek 原生调用）
# ============================================================
PLAN_PROMPT = """你是一个商业分析规划专家。基于以下匿名化的商业决策/问题，生成分析计划。

问题：{query}

请输出JSON格式（不要输出其他内容）：
```json
{{
  "domain": "识别的商业领域（如：科技/制造/金融/新能源等）",
  "plan": ["步骤1", "步骤2", "步骤3"],
  "search_keywords": ["关键词1", "关键词2", "关键词3"]
}}
```"""


def generate_analysis_plan(state: AgentState) -> dict:
    """生成分析计划"""
    query = state.get("anonymous_query") or state["query"]
    prompt = PLAN_PROMPT.format(query=query)
    messages = [{"role": "user", "content": prompt}]
    response = call_model("deepseek", messages, max_tokens=800, temperature=0.3)

    try:
        text = response.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        data = json.loads(text)
        return {
            "domain": data.get("domain", "综合"),
            "plan": data.get("plan", ["政策分析", "供应链分析", "技术路线分析"]),
            "search_keywords": data.get("search_keywords", []),
        }
    except (json.JSONDecodeError, IndexError):
        return {
            "domain": "综合",
            "plan": ["政策分析", "供应链分析", "技术路线分析"],
            "search_keywords": [],
        }


# ============================================================
# 节点3-5：三Agent并行（异构模型）
# ============================================================
# Agent-模型元信息映射
AGENT_META = {
    "policy": {"name": "policy_analyst", "display": "政策风险分析师", "model": "deepseek", "model_display": MODEL_DISPLAY["deepseek"]},
    "supply_chain": {"name": "supply_chain_analyst", "display": "供应链分析师", "model": "minimax", "model_display": MODEL_DISPLAY["minimax"]},
    "tech_route": {"name": "tech_route_analyst", "display": "技术路线分析师", "model": "kimi", "model_display": MODEL_DISPLAY["kimi"]},
}


def run_policy_analyst(state: AgentState) -> dict:
    """Agent A：政策风险分析（DeepSeek V4 Flash）"""
    query = state.get("anonymous_query") or state["query"]
    keywords = state.get("search_keywords", [])
    enhanced_query = query
    if keywords:
        enhanced_query += f"\n\n重点关注领域：{', '.join(keywords)}"
    return _run_agent_with_retry(get_policy_analyst, enhanced_query, AGENT_META["policy"], "agent_a_result")


def run_supply_chain_analyst(state: AgentState) -> dict:
    """Agent B：供应链分析（GLM-5.2）"""
    query = state.get("anonymous_query") or state["query"]
    keywords = state.get("search_keywords", [])
    enhanced_query = query
    if keywords:
        enhanced_query += f"\n\n重点关注领域：{', '.join(keywords)}"
    return _run_agent_with_retry(get_supply_chain_analyst, enhanced_query, AGENT_META["supply_chain"], "agent_b_result")


def run_tech_route_analyst(state: AgentState) -> dict:
    """Agent C：技术路线分析（Kimi K2.6）"""
    query = state.get("anonymous_query") or state["query"]
    keywords = state.get("search_keywords", [])
    enhanced_query = query
    if keywords:
        enhanced_query += f"\n\n重点关注领域：{', '.join(keywords)}"
    return _run_agent_with_retry(get_tech_route_analyst, enhanced_query, AGENT_META["tech_route"], "agent_c_result")


# ============================================================
# 节点6：分歧检测（DeepSeek 原生调用）
# ============================================================
def detect_divergence_node(state: AgentState) -> dict:
    """分歧检测：量化多Agent分析结果的分歧程度

    支持部分模型失败的情况：
    - 只有1个有效模型 → 无法交叉验证，标记为降级
    - 2个有效模型 → 仅对这两个做分歧检测
    - 3个全部失败 → 无法进行分歧检测
    """
    a_result = state.get("agent_a_result") or {}
    b_result = state.get("agent_b_result") or {}
    c_result = state.get("agent_c_result") or {}

    a_output = a_result.get("output", "") if isinstance(a_result, dict) else str(a_result)
    b_output = b_result.get("output", "") if isinstance(b_result, dict) else str(b_result)
    c_output = c_result.get("output", "") if isinstance(c_result, dict) else str(c_result)

    a_error = isinstance(a_result, dict) and a_result.get("error", False)
    b_error = isinstance(b_result, dict) and b_result.get("error", False)
    c_error = isinstance(c_result, dict) and c_result.get("error", False)

    errors = []
    if a_error:
        errors.append({"topic": "政策风险分析师模型调用失败", "divergence_type": "模型不可用",
                        "severity": 0.5, "description": f"DeepSeek V4 Flash 调用异常，分析覆盖度降低"})
    if b_error:
        errors.append({"topic": "供应链分析师模型调用失败", "divergence_type": "模型不可用",
                        "severity": 0.5, "description": f"GLM-5.2 调用异常，供应链视角分析缺失"})
    if c_error:
        errors.append({"topic": "技术路线分析师模型调用失败", "divergence_type": "模型不可用",
                        "severity": 0.5, "description": f"Kimi K2.6 调用异常，技术视角分析缺失"})

    success_count = 3 - len(errors)

    # 只有1个或0个有效模型：无法交叉验证
    if success_count <= 1:
        return {
            "divergence_points": errors,
            "divergence_score": 0.5,
            "focus_questions": ["模型调用异常，建议检查API连通性后重试"],
        }

    # 2个有效模型：仅对有效的做分歧检测
    if success_count == 2:
        valid_outputs = []
        valid_names = []
        if not a_error:
            valid_outputs.append(a_output)
            valid_names.append("政策风险分析师")
        if not b_error:
            valid_outputs.append(b_output)
            valid_names.append("供应链分析师")
        if not c_error:
            valid_outputs.append(c_output)
            valid_names.append("技术路线分析师")

        try:
            # 将两个有效输出格式化为分歧检测格式
            result = detect_divergence(valid_outputs[0], valid_outputs[1], f"[{valid_names[2] if len(valid_names) > 2 else '缺失'}模型调用失败，无有效分析]")
            # 添加模型失败作为分歧点
            all_points = errors + result.get("divergence_points", [])
            return {
                "divergence_points": all_points,
                "divergence_score": min(1.0, result.get("divergence_score", 0.5) + 0.1 * len(errors)),
                "focus_questions": result.get("focus_questions", []) + [f"⚠️ {len(errors)}个模型调用失败，分析覆盖度降低"],
            }
        except Exception:
            return {
                "divergence_points": errors,
                "divergence_score": 0.5,
                "focus_questions": [],
            }

    # 3个全部有效：正常分歧检测
    try:
        result = detect_divergence(a_output, b_output, c_output)
        return {
            "divergence_points": result.get("divergence_points", []),
            "divergence_score": result.get("divergence_score", 0.5),
            "focus_questions": result.get("focus_questions", []),
        }
    except Exception as e:
        return {
            "divergence_points": [],
            "divergence_score": 0.5,
            "focus_questions": [],
        }


# ============================================================
# 节点7：聚焦追问
# ============================================================
FOCUS_REFINE_PROMPT = """基于以下分歧点和追问，生成更精准的分析指令。

原始问题：{query}

分歧点：
{divergence_points}

聚焦追问：
{focus_questions}

请生成一段综合性的追问指令，要求三个分析师针对上述分歧点进行更深入的分析，重点关注分歧最大和证据最薄弱的部分。输出追问指令文本即可。"""


def generate_focus_questions(state: AgentState) -> dict:
    """基于分歧生成聚焦追问"""
    return {"round": state.get("round", 0) + 1}


# ============================================================
# 条件边
# ============================================================
def should_continue(state: AgentState) -> str:
    """决定继续验证还是综合输出"""
    if state.get("round", 0) >= MAX_VALIDATION_ROUNDS:
        return "converge"
    if state.get("divergence_score", 1.0) < 0.3:
        return "converge"
    return "continue"


# ============================================================
# 节点8：共识综合（DeepSeek 原生调用，LangChain ChatOpenAI）
# ============================================================
SYNTHESIS_PROMPT = """你是「洞见DeepInsight」的交叉验证综合分析师。

你的任务：综合多个分析师（分别使用不同AI模型）的分析结果，输出一份结构化的交叉验证报告。

⚠️ 重要规则：
- 如果某个分析师标记为【模型调用失败】，说明该模型无法正常响应，其内容不是有效分析
- 你只能基于有效的分析内容进行综合，不得引用失败模型的错误信息作为分析依据
- 如果只有两个模型有效，则共识度标注为 [2/2] 或 [1/2] 而非 [3/3]
- 在报告中明确说明哪些模型成功、哪些失败，以及失败对分析覆盖度的影响

原始问题：{query}
领域：{domain}
分歧度：{divergence_score}
验证轮次：{round}

{agent_sections}

{divergence_info}

请输出完整的交叉验证报告，包含：

## 模型参与状态
列出每个模型的调用状态（成功/失败），以及失败对分析覆盖度的影响

## 模型共识度分析
逐行列出核心判断及其共识度：
- 所有有效模型都认同 → [N/N]
- 多数认同少数不同 → [M/N]
- 只有一个模型提出 → [1/N]
（N = 有效模型数量，M = 认同模型数量）

## 一致结论
所有有效模型都认同的核心判断

## 分歧分析
结论矛盾或差异大的地方，分析分歧来源

## 认知盲区图谱
列出各视角可能遗漏的风险维度，以及因模型失败导致的分析盲区

## 综合洞察
最终融合报告，给出整体风险评估和建议

## 建议行动
1-3条具体可执行的建议
"""


def _build_agent_section(agent_raw: dict, agent_key: str) -> str:
    """构建单个Agent的分析段落，处理失败情况"""
    if not isinstance(agent_raw, dict):
        return f"【{agent_key}】\n无分析结果\n"

    agent_name = agent_raw.get("agent_name", agent_key)
    model_name = agent_raw.get("model_name", "")
    output = agent_raw.get("output", "")
    has_error = agent_raw.get("error", False)

    if has_error:
        # 失败的Agent：明确标注为调用失败，不传递错误信息
        return f"【{agent_name}】（模型：{model_name}）\n⚠️ 模型调用失败 — 该模型未能提供有效分析，其输出不参与交叉验证\n"

    # 成功的Agent：正常传递分析内容
    return f"【{agent_name}】（模型：{model_name}）\n{output}\n"


def synthesize_consensus(state: AgentState) -> dict:
    """综合多Agent输出，生成共识报告（支持部分模型失败）"""
    llm = get_silicon_llm_for_synthesis()

    a_raw = state.get("agent_a_result") or {}
    b_raw = state.get("agent_b_result") or {}
    c_raw = state.get("agent_c_result") or {}

    # 统计有效/失败模型数量
    all_raw = [a_raw, b_raw, c_raw]
    failed_count = sum(1 for r in all_raw if isinstance(r, dict) and r.get("error"))
    success_count = 3 - failed_count

    # 构建各Agent分析段落（失败的会标记为调用失败）
    agent_sections = ""
    agent_sections += _build_agent_section(a_raw, "政策风险分析师")
    agent_sections += _build_agent_section(b_raw, "供应链分析师")
    agent_sections += _build_agent_section(c_raw, "技术路线分析师")

    divergence_points = state.get("divergence_points", [])
    divergence_info = ""
    if divergence_points:
        divergence_info = f"\n检测到的分歧点：\n"
        for dp in divergence_points:
            divergence_info += f"- {dp.get('topic', '未知')}: {dp.get('description', '')}\n"
    if failed_count > 0:
        divergence_info += f"\n⚠️ 注意：有 {failed_count} 个模型调用失败，仅 {success_count} 个模型参与交叉验证\n"

    prompt = SYNTHESIS_PROMPT.format(
        query=state["query"],
        domain=state.get("domain", "综合"),
        divergence_score=state.get("divergence_score", 0),
        round=state.get("round", 0),
        agent_sections=agent_sections,
        divergence_info=divergence_info,
    )

    response = llm.invoke(prompt)
    report = response.content.strip()

    # 共识度应基于有效模型数量计算
    consensus_level = round(1 - state.get("divergence_score", 0.5), 2) if success_count >= 2 else 0.0

    return {
        "consensus_report": {
            "consensus_level": consensus_level,
            "divergence_score": state.get("divergence_score", 0.5),
            "validation_rounds": state.get("round", 0),
            "raw_report": report,
            "success_models": success_count,
            "failed_models": failed_count,
        },
        "blind_spot_map": {
            "divergence_points": divergence_points,
            "consensus_level": consensus_level,
        },
    }


# ============================================================
# 构建工作流
# ============================================================
def build_graph():
    """构建LangGraph工作流"""
    graph = StateGraph(AgentState)

    graph.add_node("anonymize", anonymize_query)
    graph.add_node("analysis_plan", generate_analysis_plan)
    graph.add_node("agent_a", run_policy_analyst)
    graph.add_node("agent_b", run_supply_chain_analyst)
    graph.add_node("agent_c", run_tech_route_analyst)
    graph.add_node("divergence_check", detect_divergence_node)
    graph.add_node("focus_refine", generate_focus_questions)
    graph.add_node("synthesize", synthesize_consensus)

    graph.set_entry_point("anonymize")
    graph.add_edge("anonymize", "analysis_plan")
    graph.add_edge("analysis_plan", "agent_a")
    graph.add_edge("analysis_plan", "agent_b")
    graph.add_edge("analysis_plan", "agent_c")
    graph.add_edge("agent_a", "divergence_check")
    graph.add_edge("agent_b", "divergence_check")
    graph.add_edge("agent_c", "divergence_check")

    graph.add_conditional_edges(
        "divergence_check",
        should_continue,
        {
            "continue": "focus_refine",
            "converge": "synthesize",
        }
    )

    graph.add_edge("focus_refine", "agent_a")
    graph.add_edge("focus_refine", "agent_b")
    graph.add_edge("focus_refine", "agent_c")

    graph.add_edge("synthesize", END)

    return graph.compile()
