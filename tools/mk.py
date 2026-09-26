#!/usr/bin/env python3
"""src/* -> build/* -> index.html (every script syntax-checked with node first).

Usage: python3 tools/mk.py [out.html]      (default: index.html in the repo root)
"""
import pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, BUILD = ROOT / 'src', ROOT / 'build'
order = [l.strip() for l in (SRC / '_order.txt').read_text(encoding='utf-8').splitlines() if l.strip()]
BUILD.mkdir(exist_ok=True)
# a // comment put in front of code on the same line swallows that code without any error: refuse to build
import re
CODEISH = re.compile(r"(\bif \(|\bx\.save\(\)|\breturn\b[^.]*;|\bthis\.[a-zA-Z]+\(|\bconst [a-zA-Z]+ = |M\.[a-zA-Z]+\(.*\);|\}\);|\};\s*$)")
def comment_at(l):
    i = l.find('//')
    while i != -1:
        pre = l[:i]
        if pre.count("'") % 2 == 0 and pre.count('"') % 2 == 0 and pre.count('`') % 2 == 0 and not pre.rstrip().endswith(':'): return i
        i = l.find('//', i + 2)
    return -1
bad = []
for n in order:
    for i, l in enumerate((SRC / n).read_text(encoding='utf-8').split('\n'), 1):
        j = comment_at(l)
        if j > 0 and l[:j].strip() and CODEISH.search(l[j + 2:]): bad.append('%s:%d: %s' % (n, i, l[j:j + 120]))
if bad:
    print('code after a // comment on the same line (it never runs); use /* */ or move the comment:\n  ' + '\n  '.join(bad)); sys.exit(1)
import hashlib
code = ''.join((SRC / n).read_text(encoding='utf-8') for n in order)
tpl_text = (SRC / 'template.html').read_text(encoding='utf-8')
fonts_css = (SRC / 'fonts.css').read_text(encoding='utf-8')
# build id = content hash of the sources: identical sources always give an identical index.html
build_id = hashlib.sha1((code + tpl_text + fonts_css).encode('utf-8')).hexdigest()[:8]
(BUILD / 'game.js').write_text('window.MC_BUILD = "' + build_id + '";\n' + code, encoding='utf-8')
(BUILD / 'mimg.js').write_text((SRC / 'mimg.js').read_text(encoding='utf-8'), encoding='utf-8')
# the pixel fonts go inline (src/fonts.css from tools/fonts.py): the page loads no font from the network
assert '/*@FONTS@*/' in tpl_text, 'src/template.html lost its /*@FONTS@*/ marker'
(BUILD / 'template.html').write_text(tpl_text.replace('/*@FONTS@*/', fonts_css), encoding='utf-8')
sys.path.insert(0, str(ROOT / 'tools')); import fonts
miss = sorted(c for c in fonts.used_chars() - fonts.covered(fonts_css) if 0x3000 <= c <= 0x9FFE or 0xFF00 <= c <= 0xFFEF)
if miss: print('warning: %d characters are not in the inlined pixel font (%s): run python3 tools/fonts.py' % (len(miss), ''.join(map(chr, miss[:20]))))
for f in ('game.js', 'mimg.js'):
    r = subprocess.run(['node', '--check', str(BUILD / f)], capture_output=True, text=True)
    if r.returncode:
        print(r.stderr); sys.exit(1)
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'index.html'
subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), str(ROOT / 'tools' / 'shell.html'), str(out)], check=True)
