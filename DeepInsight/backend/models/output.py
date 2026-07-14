"""DeepInsight Pydantic输出模型 - 结构化约束"""
from pydantic import BaseModel, Field
from typing import List, Optional


class BlindSpot(BaseModel):
    """认知盲区"""
    category: str = Field(description="盲区类别：政策/供应链/技术/市场")
    description: str = Field(description="盲区描述")
    severity: int = Field(ge=1, le=5, description="严重程度1-5")
    source_agent: str = Field(description="发现该盲区的Agent")
    evidence: str = Field(description="支撑证据")


class DivergencePoint(BaseModel):
    """分歧点"""
    topic: str = Field(description="分歧主题")
    agent_a_position: str = Field(description="Agent A立场")
    agent_b_position: str = Field(description="Agent B立场")
    agent_c_position: str = Field(description="Agent C立场")
    divergence_type: str = Field(description="分歧类型：方向冲突/评级差异/视角遗漏")
    severity: float = Field(ge=0, le=1, description="分歧严重程度")


class AgentAnalysisResult(BaseModel):
    """单个Agent分析结果"""
    agent_name: str = Field(description="Agent名称")
    domain: str = Field(description="分析领域")
    key_findings: List[str] = Field(description="关键发现")
    risk_level: int = Field(ge=1, le=5, description="风险等级1-5")
    evidence: List[str] = Field(description="支撑证据")
    recommendations: List[str] = Field(description="建议")
    raw_output: str = Field(description="原始输出文本")


class ConsensusReport(BaseModel):
    """共识报告"""
    query: str = Field(description="原始问题")
    consensus_level: float = Field(ge=0, le=1, description="共识度0-1")
    blind_spots: List[BlindSpot] = Field(description="认知盲区列表")
    consensus_points: List[str] = Field(description="三视角一致同意的结论")
    divergence_points: List[DivergencePoint] = Field(description="分歧点")
    risk_assessment: dict = Field(description="风险评估汇总")
    recommended_actions: List[str] = Field(description="建议行动")
    confidence_score: float = Field(ge=0, le=1, description="整体置信度")
    validation_rounds: int = Field(description="验证轮次")
    divergence_score: float = Field(description="最终分歧度")
    raw_report: str = Field(description="原始报告文本（LLM生成的完整报告）")
