"""Token统计器 - 复用V1.0"""
import threading


class TokenTracker:
    """线程安全的Token计数器"""
    def __init__(self):
        self._lock = threading.Lock()
        self.total_tokens = 0
        self.call_count = 0
        self.model_tokens = {}
        self._start_time = None

    def add(self, model_key: str, tokens: int):
        with self._lock:
            self.total_tokens += tokens
            self.call_count += 1
            self.model_tokens[model_key] = self.model_tokens.get(model_key, 0) + tokens

    def start(self):
        import time
        self._start_time = time.time()

    def elapsed(self) -> float:
        import time
        if self._start_time is None:
            return 0.0
        return round(time.time() - self._start_time, 1)

    def get_stats(self) -> dict:
        with self._lock:
            return {
                "total_tokens": self.total_tokens,
                "call_count": self.call_count,
                "model_tokens": dict(self.model_tokens),
                "elapsed_seconds": self.elapsed(),
            }

    def reset(self):
        with self._lock:
            self.total_tokens = 0
            self.call_count = 0
            self.model_tokens = {}
            self._start_time = None
