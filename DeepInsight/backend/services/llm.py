"""SiliconFlow 硅基流动 — 三模型异构配置（v3.0）

核心设计：三Agent使用不同模型，保证视角多样性
- DeepSeek V4 Flash  → 政策风险分析师 + 交叉验证综合
- GLM-5.2         → 供应链分析师
- Kimi K2.6          → 技术路线分析师

通用调用（匿名化、规划、分歧检测等）使用 DeepSeek
"""
import os
from openai import OpenAI
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# SiliconFlow 客户端（原生 OpenAI SDK，用于非Agent场景）
# ============================================================
SILICON_BASE_URL = os.getenv("SILICON_BASE_URL", "https://api.siliconflow.cn/v1")
SILICON_API_KEY = os.getenv("SILICON_API_KEY", "")

SILICON_CLIENT = OpenAI(
    api_key=SILICON_API_KEY,
    base_url=SILICON_BASE_URL,
)

# ============================================================
# 三模型 ID 配置
# ============================================================
MODELS = {
    "deepseek": os.getenv("SILICON_MODEL_DEEPSEEK", "deepseek-ai/DeepSeek-V4-Flash"),
    "minimax": os.getenv("SILICON_MODEL_MINIMAX", "zai-org/GLM-5.2"),
    "kimi": os.getenv("SILICON_MODEL_KIMI", "Pro/moonshotai/Kimi-K2.6"),
}

MODEL_DISPLAY = {
    "deepseek": "DeepSeek V4 Flash",
    "minimax": "GLM-5.2",
    "kimi": "Kimi K2.6",
}

# Agent-模型绑定映射
AGENT_MODEL_MAP = {
    "policy_analyst": "deepseek",     # 政策风险分析师 → DeepSeek
    "supply_chain_analyst": "minimax",  # 供应链分析师 → GLM-5.2
    "tech_route_analyst": "kimi",      # 技术路线分析师 → Kimi
}


# ============================================================
# 原生 OpenAI 调用（匿名化、规划、分歧检测、综合等节点）
# ============================================================
def call_model(model_key: str, messages: list, max_tokens: int = 1500,
               temperature: float = 0.7) -> str:
    """非流式调用 SiliconFlow 模型，返回完整文本"""
    model_id = MODELS[model_key]
    response = SILICON_CLIENT.chat.completions.create(
        model=model_id,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return response.choices[0].message.content


def call_model_stream(model_key: str, messages: list, max_tokens: int = 1500,
                      temperature: float = 0.7):
    """流式调用 SiliconFlow 模型，逐 chunk yield 文本片段"""
    model_id = MODELS[model_key]
    response = SILICON_CLIENT.chat.completions.create(
        model=model_id,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    )
    for chunk in response:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


# ============================================================
# LangChain ChatOpenAI 封装（用于 Agent Tool Calling）
# ============================================================
def get_silicon_llm(model_key: str = "deepseek",
                    temperature: float = 0.3, max_tokens: int = 2000) -> ChatOpenAI:
    """获取 SiliconFlow ChatOpenAI 实例（LangChain 兼容）

    Args:
        model_key: MODELS 字典中的 key（deepseek/minimax/kimi）
        temperature: 采样温度
        max_tokens: 最大生成 token 数
    """
    return ChatOpenAI(
        model=MODELS[model_key],
        base_url=SILICON_BASE_URL,
        api_key=SILICON_API_KEY,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def get_silicon_llm_for_agent(agent_name: str) -> ChatOpenAI:
    """根据 Agent 名称获取对应的 LLM（三模型异构核心）

    Args:
        agent_name: Agent 名称，如 policy_analyst / supply_chain_analyst / tech_route_analyst
    """
    model_key = AGENT_MODEL_MAP.get(agent_name, "deepseek")
    return get_silicon_llm(model_key=model_key, temperature=0.3, max_tokens=2000)


def get_silicon_llm_for_synthesis() -> ChatOpenAI:
    """综合报告专用 LLM — 使用 DeepSeek，较高 temperature 增加表达力"""
    return get_silicon_llm(model_key="deepseek", temperature=0.5, max_tokens=3000)
