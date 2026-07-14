"""RAG检索工具"""
from langchain_core.tools import tool
from knowledge.vectorstore import get_vectorstore


@tool
def policy_rag_search(query: str) -> str:
    """搜索政策法规知识库，返回相关政策条文和分析。当需要查询法规、政策动态、监管要求时使用。"""
    try:
        vs = get_vectorstore("policy")
        docs = vs.similarity_search(query, k=3)
        if not docs:
            return "知识库中未找到相关政策信息，请结合网络搜索获取最新政策。"
        return "\n\n---\n\n".join([f"[来源: {d.metadata.get('source', '未知')}]\n{d.page_content}" for d in docs])
    except Exception as e:
        return f"知识库检索异常: {e}，请使用网络搜索替代。"


@tool
def supply_chain_rag_search(query: str) -> str:
    """搜索供应链知识库，返回行业报告、供应链数据和财报分析。当需要查询行业趋势、供应链风险时使用。"""
    try:
        vs = get_vectorstore("supply_chain")
        docs = vs.similarity_search(query, k=3)
        if not docs:
            return "知识库中未找到相关供应链信息，请结合网络搜索获取最新数据。"
        return "\n\n---\n\n".join([f"[来源: {d.metadata.get('source', '未知')}]\n{d.page_content}" for d in docs])
    except Exception as e:
        return f"知识库检索异常: {e}，请使用网络搜索替代。"


@tool
def tech_rag_search(query: str) -> str:
    """搜索技术路线知识库，返回论文摘要、专利信息和技术趋势分析。当需要查询技术可行性、技术成熟度时使用。"""
    try:
        vs = get_vectorstore("tech_route")
        docs = vs.similarity_search(query, k=3)
        if not docs:
            return "知识库中未找到相关技术信息，请结合网络搜索获取最新技术动态。"
        return "\n\n---\n\n".join([f"[来源: {d.metadata.get('source', '未知')}]\n{d.page_content}" for d in docs])
    except Exception as e:
        return f"知识库检索异常: {e}，请使用网络搜索替代。"
