#!/usr/bin/env python3
"""把 app.js 重新内联进 index.html 的 app.js 块，输出 dist/index.html。

用于 Tauri 构建：WKWebView 不加载外部 <script src>，所有 JS 必须内联。
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "index.html")
APPJS = os.path.join(ROOT, "app.js")
OUT = os.path.join(ROOT, "dist", "index.html")

MARKER = "<script>/* == app.js (inlined, single-file build) == */"

with open(SRC, encoding="utf-8") as f:
    html = f.read()

with open(APPJS, encoding="utf-8") as f:
    appjs = f.read()

# 安全：app.js 内的 </script> 会提前闭合脚本块，必须转义
if "</script" in appjs.lower():
    appjs = appjs.replace("</script", "<\\/script")

start = html.find(MARKER)
if start == -1:
    raise SystemExit("ERROR: app.js block marker not found in index.html")

# 从 marker 之后找闭合 </script>
block_open = start
after_marker = html[start:]
close_idx = after_marker.find("</script>")
if close_idx == -1:
    raise SystemExit("ERROR: closing </script> not found for app.js block")
block_close = start + close_idx + len("</script>")

new_block = MARKER + "\n" + appjs + "\n</script>"

new_html = html[:block_open] + new_block + html[block_close:]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(new_html)

print(f"OK: rebuilt {OUT} ({len(new_html)} bytes, app.js {len(appjs)} bytes inlined)")
