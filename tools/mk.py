#!/usr/bin/env python3
"""src/* -> build/* -> index.html (every script syntax-checked with node first).

Usage: python3 tools/mk.py [out.html]      (default: index.html in the repo root)
       python3 tools/mk.py --demo [--store-app=APPID] out.html    the Steam demo (src/mc-demo.js turns on; the store page
                                                                     its 「加入愿望单」 opens is the full game's APPID)
"""
import pathlib, subprocess, sys, json
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
DEMO = '--demo' in sys.argv[1:]
STORE = next((int(a.split('=', 1)[1]) for a in sys.argv[1:] if a.startswith('--store-app=')), 0)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, BUILD = ROOT / 'src', ROOT / 'build'
order = []
for l in (SRC / '_order.txt').read_text(encoding='utf-8').splitlines():
    l = l.strip()
    if not l: continue
    # a glob (i18n/*.js: every language's dictionary) takes whatever files are there, in name order
    if '*' in l: order += sorted(str(p.relative_to(SRC)).replace('\\', '/') for p in SRC.glob(l))
    else: order.append(l)
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
# the demo: one line before the game's code (the full build never has it, so src/mc-demo.js does nothing there)
if DEMO: code = 'window.MC_DEMO = ' + json.dumps({'storeAppId': STORE}) + ';\n' + code
tpl_text = (SRC / 'template.html').read_text(encoding='utf-8')
fonts_css = (SRC / 'fonts.css').read_text(encoding='utf-8')
# build id = content hash of the sources: identical sources always give an identical index.html
build_id = hashlib.sha1((code + tpl_text + fonts_css).encode('utf-8')).hexdigest()[:8]
# the game runs once per page: the bundle's unpacker executes every script of the template, and the UI runtime mounts the
# template's <helmet> scripts again — the whole game ran twice (every hook on the canvas and on React stacked twice, so a
# language switched back to Chinese stayed translated underneath, and every module-level loop ran twice). The second run
# is skipped; the files are all IIFEs, so the block changes no scope that matters (node --check below still checks it)
(BUILD / 'game.js').write_text('window.MC_BUILD = "' + build_id + '";\nif (!window.__mcRan) { window.__mcRan = 1;\n' + code + '\n}\n', encoding='utf-8')
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
out = pathlib.Path(ARGS[0]) if ARGS else ROOT / 'index.html'
if DEMO and out.resolve() == (ROOT / 'index.html').resolve(): print('the demo never overwrites index.html: give it its own out.html'); sys.exit(1)
subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), str(ROOT / 'tools' / 'shell.html'), str(out)], check=True)
