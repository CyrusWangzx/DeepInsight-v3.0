"""ChromaDB向量存储管理"""
import os
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from knowledge.embeddings import get_embeddings

# 持久化目录
CHROMA_BASE_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")


def get_vectorstore(collection_name: str) -> Chroma:
    """获取指定知识库的Chroma向量存储"""
    persist_dir = os.path.join(CHROMA_BASE_DIR, collection_name)
    return Chroma(
        collection_name=collection_name,
        embedding_function=get_embeddings(),
        persist_directory=persist_dir,
    )


def ingest_documents(collection_name: str, docs: list[Document]):
    """批量入库文档"""
    vs = get_vectorstore(collection_name)
    vs.add_documents(docs)
    return len(docs)


def ingest_texts(collection_name: str, texts: list[str], metadatas: list[dict] = None):
    """批量入库纯文本（自动转为Document）"""
    docs = [
        Document(page_content=text, metadata=metadatas[i] if metadatas else {})
        for i, text in enumerate(texts)
    ]
    return ingest_documents(collection_name, docs)


def get_collection_stats() -> dict:
    """获取所有知识库统计"""
    stats = {}
    for name in ["policy", "supply_chain", "competitor", "tech_route"]:
        try:
            vs = get_vectorstore(name)
            count = vs._collection.count()
            stats[name] = {"document_count": count, "status": "ok"}
        except Exception as e:
            stats[name] = {"document_count": 0, "status": f"error: {e}"}
    return stats


def is_knowledge_seeded() -> bool:
    """检查知识库是否已有数据"""
    try:
        stats = get_collection_stats()
        return any(s.get("document_count", 0) > 0 for s in stats.values())
    except Exception:
        return False
