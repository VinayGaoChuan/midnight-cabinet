#!/usr/bin/env python3
"""Re-pack build/{game.js,mimg.js,template.html} into the single-file bundle (same resource uuids, same escaping).

Usage: python3 tools/build.py <shell.html> <out.html>
The shell is the original bundle; only the game script, the m-img element and the UI template are replaced.
"""
import base64, gzip, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / 'build'
src_html = pathlib.Path(sys.argv[1]); dst_html = pathlib.Path(sys.argv[2])
s = src_html.read_text(encoding='utf-8')


def block(name):
    return re.search(r'(<script type="__bundler/%s"[^>]*>)(.*?)(</script>)' % name, s, re.S)


man_m = block('manifest'); man = json.loads(man_m.group(2))
for uuid, path in {'a41355fa-4761-4b6d-911e-fe1fa4cb8db2': 'game.js', 'c6426465-2029-48c4-b4b6-48f1694ed343': 'mimg.js'}.items():
    data = (BUILD / path).read_bytes()
    assert man[uuid]['compressed']
    man[uuid]['data'] = base64.b64encode(gzip.compress(data, 9, mtime=0)).decode('ascii')
tpl = (BUILD / 'template.html').read_text(encoding='utf-8')
tpl_raw = json.dumps(tpl, ensure_ascii=False).replace('</', '<\\u002F')
man_raw = json.dumps(man, separators=(',', ':'))

tpl_m = block('template')


def ws(g):
    t = g.strip(); i = g.index(t[:20]); return g[:i], g[i + len(t):]


ml, mt = ws(man_m.group(2)); tl, tt = ws(tpl_m.group(2))
out = s[:man_m.start(2)] + ml + man_raw + mt + s[man_m.end(2):tpl_m.start(2)] + tl + tpl_raw + tt + s[tpl_m.end(2):]
dst_html.write_text(out, encoding='utf-8')
print('wrote', dst_html, len(out))
