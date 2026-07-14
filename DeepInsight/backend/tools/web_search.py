"""Web搜索工具 - Tavily"""
import os
from langchain_core.tools import tool
from dotenv import load_dotenv

load_dotenv()


@tool
def web_search(query: str) -> str:
    """搜索互联网获取最新信息。当知识库信息不足或需要最新动态时使用。"""
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        results = client.search(query, max_results=3, search_depth="basic")
        if not results.get("results"):
            return "网络搜索未返回结果。"
        return "\n\n---\n\n".join([
            f"[来源: {r.get('url', '未知')}]\n{r.get('content', '')}"
            for r in results["results"][:3]
        ])
    except Exception as e:
        return f"网络搜索异常: {e}。请基于已有知识进行分析。"
