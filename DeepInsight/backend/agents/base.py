"""Agent工厂函数 - 构建带工具的 SiliconFlow 异构 Agent

三模型异构设计：每个 Agent 绑定不同的 SiliconFlow 模型
- policy_analyst     → DeepSeek V4 Flash
- supply_chain_analyst → GLM-5.2
- tech_route_analyst  → Kimi K2.6
"""
from langchain_classic.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from services.llm import get_silicon_llm_for_agent


def build_agent(system_prompt: str, tools: list, name: str = "") -> AgentExecutor:
    """构建带工具的 SiliconFlow Agent（异构模型绑定）

    Args:
        system_prompt: Agent的系统提示词
        tools: 可用工具列表
        name: Agent名称（用于自动选择对应的异构模型）
    """
    llm = get_silicon_llm_for_agent(name)

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder("agent_scratchpad"),
    ])

    agent = create_openai_functions_agent(llm, tools, prompt)
    return AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        max_iterations=5,
        max_execution_time=60,
        name=name,
        handle_parsing_errors=True,
    )
