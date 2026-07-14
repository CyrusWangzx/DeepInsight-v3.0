"""DeepInsight AgentState - LangGraph工作流状态定义"""
from typing import TypedDict, List, Optional, Dict, Annotated
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """LangGraph工作流全局状态"""
    # 输入
    query: str                              # 用户原始问题
    anonymous_query: str                    # 匿名化后问题
    lang: str                               # 语言：zh/en
    feature_type: str                       # 功能类型：decision/blindspot/competitor

    # 分析计划
    plan: List[str]                         # 分析步骤
    domain: str                             # 领域识别
    search_keywords: List[str]              # 检索关键词

    # 三Agent输出
    agent_a_result: Optional[Dict]          # 政策风险分析
    agent_b_result: Optional[Dict]          # 供应链分析
    agent_c_result: Optional[Dict]          # 技术路线分析

    # 交叉验证
    divergence_points: List[Dict]           # 分歧点列表
    divergence_score: float                 # 总分歧度 0-1
    focus_questions: List[str]              # 聚焦追问
    round: int                              # 当前验证轮次

    # 输出
    consensus_report: Optional[Dict]        # 共识报告
    blind_spot_map: Optional[Dict]          # 盲区图谱

    # 元信息
    messages: Annotated[list, add_messages] # LangGraph消息追踪
    elapsed_seconds: float                  # 总耗时
