"""风险评估计算工具"""
from langchain_core.tools import tool


@tool
def policy_impact_score(policy_description: str, business_domain: str) -> str:
    """评估政策对业务的影响程度（1-10分）。输入政策描述和业务领域，返回影响评分和分析。"""
    # 基于关键词的简化评分逻辑，实际场景中可接入更复杂的评估模型
    high_impact_keywords = ["禁止", "限制", "强制", "处罚", "淘汰", "收紧"]
    medium_impact_keywords = ["规范", "引导", "鼓励", "试点", "备案"]
    low_impact_keywords = ["建议", "参考", "自愿", "推荐"]

    score = 5  # 默认中等影响
    for kw in high_impact_keywords:
        if kw in policy_description:
            score = max(score, 8)
            break
    for kw in medium_impact_keywords:
        if kw in policy_description:
            score = max(score, 6)
            break
    for kw in low_impact_keywords:
        if kw in policy_description:
            score = min(score, 3)
            break

    return f"政策影响评分：{score}/10\n政策：{policy_description}\n业务领域：{business_domain}\n说明：该评分基于政策关键词匹配，建议结合RAG检索和政策原文进行综合判断。"


@tool
def supply_chain_risk_score(risk_factors: str) -> str:
    """评估供应链风险等级（1-10分）。输入风险因素描述，返回风险评分和分析。"""
    high_risk_keywords = ["断供", "制裁", "战争", "封锁", "停产"]
    medium_risk_keywords = ["涨价", "延迟", "替代", "波动", "集中"]
    low_risk_keywords = ["稳定", "多元化", "库存充足"]

    score = 5
    for kw in high_risk_keywords:
        if kw in risk_factors:
            score = max(score, 8)
            break
    for kw in medium_risk_keywords:
        if kw in risk_factors:
            score = max(score, 6)
            break
    for kw in low_risk_keywords:
        if kw in risk_factors:
            score = min(score, 3)
            break

    return f"供应链风险评分：{score}/10\n风险因素：{risk_factors}\n说明：该评分基于关键词匹配，建议结合行业报告和实时数据综合判断。"


@tool
def tech_maturity_score(technology_name: str) -> str:
    """评估技术成熟度（TRL 1-9）。输入技术名称，返回成熟度评估。"""
    # 简化的技术成熟度映射
    maturity_map = {
        "人工智能": 8, "AI": 8, "大模型": 7, "LLM": 7,
        "区块链": 6, "5G": 8, "自动驾驶": 5,
        "量子计算": 3, "脑机接口": 3,
        "AR": 5, "VR": 6, "元宇宙": 3,
        "物联网": 7, "IoT": 7, "边缘计算": 7,
        "新能源": 7, "固态电池": 4, "氢能源": 5,
    }

    score = 5  # 默认TRL 5
    for key, val in maturity_map.items():
        if key in technology_name:
            score = val
            break

    trl_descriptions = {
        1: "基础研究", 2: "技术概念", 3: "概念验证",
        4: "实验室验证", 5: "相关环境验证", 6: "原型演示",
        7: "系统原型在运行环境验证", 8: "系统完成并合格", 9: "系统实际运行验证"
    }

    return f"技术成熟度评估：TRL {score}/9（{trl_descriptions.get(score, '未知')}）\n技术：{technology_name}\n说明：该评估基于通用技术成熟度映射，建议结合最新技术报告验证。"
