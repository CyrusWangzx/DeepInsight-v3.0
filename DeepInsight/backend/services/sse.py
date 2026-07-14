"""SSE事件工具 - 复用V1.0"""
import json


def sse_event(event: str, data: dict) -> str:
    """格式化一条SSE事件"""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
