#!/usr/bin/env python3
"""Turn index.html into a Claude Artifact page (the artifact host wraps the page in its own <html>/<head>/<body>).

Usage: python3 tools/artifact.py [in.html] [out.html]   (defaults: index.html -> .ai/artifact/midnight-cabinet.html)
Played as an artifact that declares the `db` capability, the game uploads its play telemetry to the artifact store.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'index.html'
dst = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / '.ai' / 'artifact' / 'midnight-cabinet.html'
s = src.read_text(encoding='utf-8')
# outer shell only: leading doctype/html/head, the first </head> + <body>, the trailing </body></html>
s = re.sub(r'^\s*<!DOCTYPE html>\s*<html[^>]*>\s*<head>\s*', '', s, count=1, flags=re.I)
i = s.index('</head>'); j = s.index('<body>', i)
s = s[:i] + s[j + len('<body>'):]
s = re.sub(r'</body>\s*</html>\s*$', '', s, flags=re.I)
s = s.replace('<title>Bundled Page</title>', '', 1).replace('background: #faf9f5', 'background: #07050a')
s = '<title>午夜机台</title>\n<style>html,body{background:#07050a;color-scheme:dark}</style>\n' + s
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(s, encoding='utf-8')
print('wrote', dst, len(s))
