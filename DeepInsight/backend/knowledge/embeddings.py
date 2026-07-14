"""嵌入模型配置 — 使用 SiliconFlow Embedding API

替代本地 BGE 模型，统一使用 SiliconFlow 平台
- 无需下载 400MB 本地模型
- 不依赖 HuggingFace 镜像
- 与项目整体 SiliconFlow 架构一致
"""
import os
from langchain_openai import OpenAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

_silicon_embeddings = None

# SiliconFlow Embedding 模型配置
EMBEDDING_MODEL = os.getenv(
    "SILICON_EMBEDDING_MODEL",
    "BAAI/bge-large-zh-v1.5"  # SiliconFlow 上的中文嵌入模型
)
SILICON_BASE_URL = os.getenv("SILICON_BASE_URL", "https://api.siliconflow.cn/v1")
SILICON_API_KEY = os.getenv("SILICON_API_KEY", "")


def get_embeddings():
    """获取 SiliconFlow Embedding 实例（单例）

    使用 SiliconFlow 的 Embedding API，无需本地模型下载
    """
    global _silicon_embeddings
    if _silicon_embeddings is None:
        _silicon_embeddings = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            base_url=SILICON_BASE_URL,
            api_key=SILICON_API_KEY,
        )
    return _silicon_embeddings
