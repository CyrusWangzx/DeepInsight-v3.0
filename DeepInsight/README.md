# DeepInsight 洞见

> 不是帮你搜索，而是帮你思考

Multi-Agent 交叉验证商业决策平台

## 架构

```
用户输入 → 匿名化 → 分析规划 → 三Agent并行分析 → 分歧检测 → 共识综合 → 交叉验证报告
                                    ↑                    ↓
                                    └──── 二轮验证 ←─────┘
```

### 三Agent

- 🏛️ **政策风险分析师** - 政策法规视角
- 🔗 **供应链分析师** - 供应链与竞争格局视角
- 🧬 **技术路线分析师** - 技术可行性与趋势视角

### 核心特性

- **匿名化处理**：消除品牌/金额偏见
- **分歧量化**：自动检测三Agent分析分歧程度
- **自适应验证**：分歧大时自动启动二轮验证
- **交叉验证报告**：共识度评分+盲区图谱
- **SSE流式输出**：实时显示分析进度
- **多语言支持**：中文/English切换
- **知识库RAG**：政策法规+供应链+竞品+技术路线四大知识库

## 技术栈

- **后端**: Flask + LangGraph + ChromaDB
- **LLM**: MiMo-V2.5-Pro (OpenAI兼容)
- **RAG**: BGE-large-zh-v1.5 + ChromaDB
- **搜索**: Tavily API
- **前端**: 原生HTML/CSS/JS

## 启动

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

访问 http://localhost:5000

## 首次运行

首次启动会自动：
1. 下载BGE嵌入模型（约400MB，使用HF镜像）
2. 填充4个知识库（政策/供应链/竞品/技术路线）
3. 预加载LangGraph工作流

## 目录结构

```
backend/
├── agents/          # 三Agent定义
├── knowledge/       # 向量数据库
├── models/          # 状态定义
├── services/        # LLM/SSE/分歧检测
├── tools/           # RAG/搜索/评分工具
├── app.py           # Flask主入口
├── graph.py         # LangGraph工作流
└── seed_knowledge.py # 知识库填充脚本
frontend/
├── templates/       # HTML
└── static/js/       # JS逻辑
```
