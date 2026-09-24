#!/usr/bin/env python3
"""src/* -> build/* -> index.html (every script syntax-checked with node first).

Usage: python3 tools/mk.py [out.html]      (default: index.html in the repo root)
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, BUILD = ROOT / 'src', ROOT / 'build'
order = [l.strip() for l in (SRC / '_order.txt').read_text(encoding='utf-8').splitlines() if l.strip()]
BUILD.mkdir(exist_ok=True)
(BUILD / 'game.js').write_text(''.join((SRC / n).read_text(encoding='utf-8') for n in order), encoding='utf-8')
for n in ('template.html', 'mimg.js'):
    (BUILD / n).write_text((SRC / n).read_text(encoding='utf-8'), encoding='utf-8')
for f in ('game.js', 'mimg.js'):
    r = subprocess.run(['node', '--check', str(BUILD / f)], capture_output=True, text=True)
    if r.returncode:
        print(r.stderr); sys.exit(1)
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'index.html'
subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), str(ROOT / 'tools' / 'shell.html'), str(out)], check=True)
