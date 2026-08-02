#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
元引擎 → Obsidian 本地同步桥接服务

监听 127.0.0.1:8765，提供：
  POST /save       接收 {concept, markdown, glossary, vaultPath}，写入 vault
  GET  /concept?q= 读取某概念 markdown，返回 {found, markdown}
  GET  /           健康检查

写入目录（可用环境变量 OBSIDIAN_SYNC_DIR 覆盖）：
  /Users/sean/Documents/第二大脑/元框架引擎/认知框架实例
  - 主框架文件：{concept}-认知框架.md
  - 词条文件：  {term}-词条.md

仅依赖 Python 标准库，支持 CORS（允许前端跨域 fetch）。
"""
import json
import os
import re
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.environ.get(
    "OBSIDIAN_SYNC_DIR",
    "/Users/sean/Documents/第二大脑/元框架引擎/认知框架实例",
)
HOST = "127.0.0.1"
PORT = 8765


def safe_name(name):
    """去掉文件系统不安全字符，保留中文。"""
    name = (name or "").strip()
    name = re.sub(r'[\\/:*?"<>|]', "_", name)
    return name[:120]


def ensure_dir():
    os.makedirs(BASE_DIR, exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, fmt, *args):
        sys.stderr.write("[obsidian-sync] " + (fmt % args) + "\n")
        sys.stderr.flush()

    def _send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/health"):
            self._send_json(200, {"ok": True, "service": "obsidian-sync", "dir": BASE_DIR})
            return
        if parsed.path == "/concept":
            q = parse_qs(parsed.query)
            concept = (q.get("q") or [""])[0]
            fname = os.path.join(BASE_DIR, safe_name(concept) + "-认知框架.md")
            if concept and os.path.isfile(fname):
                try:
                    with open(fname, "r", encoding="utf-8") as f:
                        md = f.read()
                    self._send_json(200, {"found": True, "markdown": md})
                except Exception as e:  # noqa
                    self._send_json(500, {"found": False, "error": str(e)})
            else:
                self._send_json(200, {"found": False})
            return
        self._send_json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/save":
            self._send_json(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length) if length else b"{}"
            data = json.loads(raw.decode("utf-8"))
        except Exception as e:  # noqa
            self._send_json(400, {"ok": False, "error": "bad json: " + str(e)})
            return

        concept = data.get("concept", "")
        markdown = data.get("markdown", "")
        glossary = data.get("glossary", []) or []
        if not concept:
            self._send_json(400, {"ok": False, "error": "missing concept"})
            return

        ensure_dir()
        main_path = os.path.join(BASE_DIR, safe_name(concept) + "-认知框架.md")
        try:
            with open(main_path, "w", encoding="utf-8") as f:
                f.write(markdown)
        except Exception as e:  # noqa
            self._send_json(500, {"ok": False, "error": "write main failed: " + str(e)})
            return

        written_terms = 0
        for g in glossary:
            if not isinstance(g, dict):
                continue
            term = g.get("term", "")
            content = g.get("content", "")
            if not term:
                continue
            tpath = os.path.join(BASE_DIR, safe_name(term) + "-词条.md")
            try:
                with open(tpath, "w", encoding="utf-8") as f:
                    f.write(content)
                written_terms += 1
            except Exception:  # noqa
                pass

        self._send_json(200, {"ok": True, "path": main_path, "terms": written_terms})


if __name__ == "__main__":
    ensure_dir()
    sys.stderr.write("[obsidian-sync] listening on %s:%d, dir=%s\n" % (HOST, PORT, BASE_DIR))
    sys.stderr.flush()
    server = HTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
