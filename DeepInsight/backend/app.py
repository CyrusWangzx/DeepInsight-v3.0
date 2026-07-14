"""DeepInsight Flask API主入口"""
import os
import time
import json

from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, template_folder="../frontend/templates", static_folder="../frontend/static")
CORS(app)

# ============================================================
# 速率限制
# ============================================================
import time as _time
_rate_limit_store = {}
RATE_LIMIT_MAX = 6
RATE_LIMIT_WINDOW = 60

def _check_rate_limit(ip: str) -> bool:
    now = _time.time()
    if ip not in _rate_limit_store:
        _rate_limit_store[ip] = [now]
        return True
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit_store[ip].append(now)
    return True

# 延迟导入
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        from graph import build_graph
        _graph = build_graph()
    return _graph


def warmup():
    """预加载：嵌入模型 + LangGraph + 自动seed知识库"""
    import threading

    def _warmup():
        print("[Warmup] 初始化 SiliconFlow Embedding API...")
        try:
            from knowledge.embeddings import get_embeddings
            get_embeddings()
            print("[Warmup] ✅ Embedding API 已就绪")
        except Exception as e:
            print(f"[Warmup] ❌ Embedding API 初始化失败: {e}")

        print("[Warmup] 检查知识库...")
        try:
            from knowledge.vectorstore import is_knowledge_seeded, get_collection_stats
            if not is_knowledge_seeded():
                print("[Warmup] 知识库为空，自动执行seed...")
                from seed_knowledge import seed_all
                seed_all()
            else:
                stats = get_collection_stats()
                total = sum(s.get("document_count", 0) for s in stats.values())
                print(f"[Warmup] ✅ 知识库已有 {total} 篇文档")
        except Exception as e:
            print(f"[Warmup] ❌ 知识库初始化失败: {e}")

        print("[Warmup] 预构建LangGraph...")
        try:
            get_graph()
            print("[Warmup] ✅ LangGraph已构建")
        except Exception as e:
            print(f"[Warmup] ❌ LangGraph构建失败: {e}")

        print("[Warmup] 预加载完成，服务就绪 🚀")

    t = threading.Thread(target=_warmup, daemon=True)
    t.start()


from services.sse import sse_event
from services.tracker import TokenTracker


# ============================================================
# 页面路由
# ============================================================
@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# 健康检查
# ============================================================
@app.route("/api/health")
def health():
    checks = {"silicon_api": False, "chromadb": False, "tavily": False}

    try:
        from services.llm import call_model, MODELS
        result = call_model("deepseek", [{"role": "user", "content": "hi"}], max_tokens=10)
        if result:
            checks["silicon_api"] = True
    except Exception:
        pass

    try:
        from knowledge.vectorstore import get_collection_stats
        stats = get_collection_stats()
        checks["chromadb"] = any(s.get("status") == "ok" for s in stats.values())
    except Exception:
        pass

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        client.search("test", max_results=1)
        checks["tavily"] = True
    except Exception:
        pass

    return jsonify(checks)


# ============================================================
# 知识库状态
# ============================================================
@app.route("/api/knowledge/status")
def knowledge_status():
    try:
        from knowledge.vectorstore import get_collection_stats
        return jsonify(get_collection_stats())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# 完整分析（非流式）
# ============================================================
@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    data = request.json
    query = data.get("query", "")
    lang = data.get("lang", "zh")
    feature_type = data.get("feature_type", "decision")

    if not query:
        return jsonify({"error": "请输入分析内容"}), 400

    graph = get_graph()
    start = time.time()

    try:
        result = graph.invoke({
            "query": query,
            "anonymous_query": "",
            "lang": lang,
            "feature_type": feature_type,
            "plan": [],
            "domain": "",
            "search_keywords": [],
            "agent_a_result": None,
            "agent_b_result": None,
            "agent_c_result": None,
            "divergence_points": [],
            "divergence_score": 0.0,
            "focus_questions": [],
            "round": 0,
            "consensus_report": None,
            "blind_spot_map": None,
            "messages": [],
            "elapsed_seconds": 0.0,
        })

        elapsed = round(time.time() - start, 1)
        result["elapsed_seconds"] = elapsed

        return jsonify({
            "type": feature_type,
            "agent_outputs": {
                "policy": result.get("agent_a_result", {}),
                "supply_chain": result.get("agent_b_result", {}),
                "tech_route": result.get("agent_c_result", {}),
            },
            "divergence": {
                "score": result.get("divergence_score", 0),
                "points": result.get("divergence_points", []),
                "rounds": result.get("round", 0),
            },
            "consensus_report": result.get("consensus_report", {}),
            "blind_spot_map": result.get("blind_spot_map", {}),
            "elapsed_seconds": elapsed,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ============================================================
# 完整分析（SSE流式）
# ============================================================
@app.route("/api/analyze/stream", methods=["POST"])
def api_analyze_stream():
    client_ip = request.remote_addr
    if not _check_rate_limit(client_ip):
        return jsonify({"error": "请求过于频繁，请稍后再试"}), 429

    data = request.json
    query = data.get("query", "")
    lang = data.get("lang", "zh")
    feature_type = data.get("feature_type", "decision")

    if not query:
        return jsonify({"error": "请输入分析内容"}), 400

    def generate():
        start = time.time()

        try:
            yield sse_event("phase", {"phase": "anonymizing", "message": "正在匿名化处理..."})

            from graph import anonymize_query, generate_analysis_plan
            state = {
                "query": query, "anonymous_query": "", "lang": lang,
                "feature_type": feature_type, "plan": [], "domain": "",
                "search_keywords": [], "agent_a_result": None,
                "agent_b_result": None, "agent_c_result": None,
                "divergence_points": [], "divergence_score": 0.0,
                "focus_questions": [], "round": 0,
                "consensus_report": None, "blind_spot_map": None,
                "messages": [], "elapsed_seconds": 0.0,
            }

            state.update(anonymize_query(state))
            yield sse_event("phase", {"phase": "planning", "message": "正在生成分析计划..."})

            state.update(generate_analysis_plan(state))
            yield sse_event("phase", {
                "phase": "planned",
                "message": f"领域：{state['domain']}，计划{len(state['plan'])}步分析"
            })

            yield sse_event("phase", {"phase": "agents_running", "message": "三视角独立分析中..."})

            from graph import run_policy_analyst, run_supply_chain_analyst, run_tech_route_analyst
            import concurrent.futures

            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                future_a = executor.submit(run_policy_analyst, state)
                future_b = executor.submit(run_supply_chain_analyst, state)
                future_c = executor.submit(run_tech_route_analyst, state)

                for future, name, display in [
                    (future_a, "policy", "政策风险分析师"),
                    (future_b, "supply_chain", "供应链分析师"),
                    (future_c, "tech_route", "技术路线分析师"),
                ]:
                    try:
                        result = future.result(timeout=120)
                        state.update(result)
                        agent_key = "agent_a_result" if name == "policy" else "agent_b_result" if name == "supply_chain" else "agent_c_result"
                        agent_result = result.get(agent_key, {})
                        yield sse_event("agent_done", {
                            "agent": name,
                            "display_name": display,
                            "model_name": agent_result.get("model_name", ""),
                            "output": agent_result.get("output", ""),
                            "has_error": bool(agent_result.get("error")),
                        })
                    except Exception as e:
                        key = "agent_a_result" if name == "policy" else "agent_b_result" if name == "supply_chain" else "agent_c_result"
                        state[key] = {"agent_name": display, "output": "[分析异常] " + str(e), "error": True}
                        yield sse_event("agent_done", {"agent": name, "display_name": display, "output": "[分析异常] " + str(e), "has_error": True})

            yield sse_event("phase", {"phase": "divergence_check", "message": "交叉验证中..."})

            from graph import detect_divergence_node
            state.update(detect_divergence_node(state))

            yield sse_event("divergence", {
                "score": state["divergence_score"],
                "points": len(state["divergence_points"]),
                "need_refinement": state["divergence_score"] >= 0.3,
            })

            if state["divergence_score"] >= 0.3 and state["round"] < 2:
                yield sse_event("phase", {"phase": "refinement", "message": "分歧较大，进行二轮验证..."})

                from graph import generate_focus_questions
                state.update(generate_focus_questions(state))

                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    future_a = executor.submit(run_policy_analyst, state)
                    future_b = executor.submit(run_supply_chain_analyst, state)
                    future_c = executor.submit(run_tech_route_analyst, state)

                    for future, name, key in [
                        (future_a, "policy", "agent_a_result"),
                        (future_b, "supply_chain", "agent_b_result"),
                        (future_c, "tech_route", "agent_c_result"),
                    ]:
                        try:
                            result = future.result(timeout=120)
                            state.update(result)
                        except Exception:
                            pass

                state.update(detect_divergence_node(state))
                yield sse_event("divergence", {
                    "score": state["divergence_score"],
                    "points": len(state["divergence_points"]),
                    "need_refinement": False,
                })

            yield sse_event("phase", {"phase": "synthesis", "message": "生成共识报告..."})

            from graph import synthesize_consensus
            state.update(synthesize_consensus(state))

            raw_report = state.get("consensus_report") or {}
            raw_text = raw_report.get("raw_report", "报告生成失败") if isinstance(raw_report, dict) else "报告生成失败"
            chunk_size = 8
            for i in range(0, len(raw_text), chunk_size):
                yield sse_event("report_chunk", {"chunk": raw_text[i:i+chunk_size]})
                time.sleep(0.02)

            elapsed = round(time.time() - start, 1)
            cr = state.get("consensus_report") or {}
            yield sse_event("done", {
                "consensus_level": cr.get("consensus_level", 0) if isinstance(cr, dict) else 0,
                "divergence_score": state.get("divergence_score", 0),
                "rounds": state.get("round", 0),
                "elapsed_seconds": elapsed,
                "success_models": cr.get("success_models", 3) if isinstance(cr, dict) else 3,
                "failed_models": cr.get("failed_models", 0) if isinstance(cr, dict) else 0,
                "agent_outputs": {
                    "policy": state.get("agent_a_result", {}),
                    "supply_chain": state.get("agent_b_result", {}),
                    "tech_route": state.get("agent_c_result", {}),
                },
            })

        except Exception as e:
            yield sse_event("error", {"message": str(e)})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# ============================================================
# 追问（SSE流式）
# ============================================================
@app.route("/api/followup/stream", methods=["POST"])
def api_followup_stream():
    data = request.json
    question = data.get("question", "")
    previous_report = data.get("previous_report", "")

    if not question:
        return jsonify({"error": "请输入追问内容"}), 400

    def generate():
        from services.llm import call_model_stream
        start = time.time()
        yield sse_event("phase", {"phase": "followup", "message": "正在思考追问..."})

        context = f"之前的分析报告：\n{previous_report}\n\n" if previous_report else ""
        messages = [
            {"role": "system", "content": "你是洞见DeepInsight的追问分析师。基于之前的交叉验证报告，回答用户的追问。要求简洁有力，引用之前报告中的具体分析。"},
            {"role": "user", "content": f"{context}追问：{question}"},
        ]

        full_answer = ""
        for chunk in call_model_stream("deepseek", messages, max_tokens=1500, temperature=0.5):
            full_answer += chunk
            yield sse_event("followup_chunk", {"chunk": chunk})

        elapsed = round(time.time() - start, 1)
        yield sse_event("done", {"answer": full_answer, "elapsed_seconds": elapsed})

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ============================================================
# 导出Markdown
# ============================================================
@app.route("/api/export/markdown", methods=["POST"])
def api_export_markdown():
    data = request.json
    query = data.get("query", "")
    agent_outputs = data.get("agent_outputs", {})
    consensus_report = data.get("consensus_report", {})
    divergence = data.get("divergence", {})
    elapsed = data.get("elapsed_seconds", 0)

    md = f"# 洞见DeepInsight — 交叉验证报告\n\n"
    md += f"## 原始问题\n\n{query}\n\n"
    md += "---\n\n## 三视角独立分析\n\n"

    for name, display in [("policy", "政策风险分析师"), ("supply_chain", "供应链分析师"), ("tech_route", "技术路线分析师")]:
        output = agent_outputs.get(name, {})
        md += f"### {display}\n\n{output.get('output', 'N/A')}\n\n"

    md += "---\n\n## 分歧检测\n\n"
    md += f"分歧度：{divergence.get('score', 'N/A')}\n"
    md += f"验证轮次：{divergence.get('rounds', 'N/A')}\n\n"

    if divergence.get("points"):
        md += "### 分歧点\n\n"
        for dp in divergence["points"]:
            md += f"- **{dp.get('topic', '未知')}** ({dp.get('divergence_type', '未知')}): {dp.get('description', '')}\n"
        md += "\n"

    md += "---\n\n## 共识报告\n\n"
    md += consensus_report.get("raw_report", "N/A") + "\n\n"

    md += f"---\n\n*生成时间：{time.strftime('%Y年%m月%d日%H时%M分%S秒')}*\n\n"
    md += f"*共识度：{consensus_report.get('consensus_level', 'N/A')} | 分歧度：{divergence.get('score', 'N/A')} | 耗时：{elapsed}s*\n"

    return jsonify({"markdown": md})


# ============================================================
# 知识库入库脚本（API触发）
# ============================================================
@app.route("/api/knowledge/ingest", methods=["POST"])
def api_knowledge_ingest():
    data = request.json
    collection = data.get("collection", "")
    texts = data.get("texts", [])
    metadatas = data.get("metadatas", [])

    if not collection or not texts:
        return jsonify({"error": "请指定collection和texts"}), 400

    try:
        from knowledge.vectorstore import ingest_texts
        count = ingest_texts(collection, texts, metadatas if metadatas else None)
        return jsonify({"status": "ok", "collection": collection, "count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or True:
        warmup()
    app.run(host="0.0.0.0", port=5000, debug=False)
