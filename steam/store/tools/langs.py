#!/usr/bin/env python3
"""各语言的商店文案（steam/store/lang/<语言>.md）：检查格式，把预告片字幕收进 tools/captions.json。

  python3 langs.py            检查全部语言，更新 captions.json
  python3 langs.py fr de      只处理这几种

每份文案的标题固定：# …、## Short description、## Short description · demo、## About This Game（代码块）、## Demo page（代码块）、
## Wishlist line、## Trailer captions（c1…c6、demo、wish、sub 各一行「键: 文字」）。简短描述上限 300 字符（Steam 的限制）；
「关于这款游戏」里的 [img] 行要和英文母本（商店文案.md）一样多、一样的顺序。
"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
STORE = HERE.parent
HEADS = ['Short description', 'Short description · demo', 'About This Game', 'Demo page', 'Wishlist line', 'Trailer captions']
CAPS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'demo', 'wish', 'sub']


def sections(text):
    out = {}
    for part in re.split(r'^## ', text, flags=re.M)[1:]:
        head, _, body = part.partition('\n'); out[head.strip()] = body.strip()
    return out


def fenced(body):
    m = re.search(r'```\n(.*?)\n```', body, re.S); return m.group(1) if m else None


def english_imgs():
    s = (STORE / '商店文案.md').read_text(encoding='utf-8-sig')
    i = s.index('### English (BBCode)'); body = s[s.index('```\n', i) + 4:s.index('\n```', s.index('```\n', i) + 4)]
    return re.findall(r'\[img\][^\[]+\[/img\]', body)


def check(lang, imgs):
    p = STORE / 'lang' / (lang + '.md'); t = p.read_text(encoding='utf-8-sig'); S = sections(t); bad = []
    for h in HEADS:
        if h not in S: bad.append('missing section: ' + h)
    for h in ('Short description', 'Short description · demo'):
        if h in S and len(S[h]) > 300: bad.append('%s: %d characters (max 300)' % (h, len(S[h])))
    for h in ('About This Game', 'Demo page'):
        if h in S and fenced(S[h]) is None: bad.append(h + ': no code block')
    a = fenced(S.get('About This Game', '')) or ''
    if re.findall(r'\[img\][^\[]+\[/img\]', a) != imgs: bad.append('About This Game: the [img] lines differ from the English')
    for tag in ('h2', 'list', 'b'):
        if a.count('[' + tag + ']') != a.count('[/' + tag + ']'): bad.append('About This Game: unbalanced [%s]' % tag)
    cap = {}
    for line in S.get('Trailer captions', '').splitlines():
        k, sep, v = line.partition(':')
        if sep and k.strip() in CAPS: cap[k.strip()] = v.strip()
    miss = [k for k in CAPS if not cap.get(k)]
    if miss: bad.append('Trailer captions missing: ' + ', '.join(miss))
    return bad, cap, {h: len(S.get(h, '')) for h in HEADS[:2]}


def main(langs):
    files = sorted(p.stem for p in (STORE / 'lang').glob('*.md'))
    langs = langs or files; imgs = english_imgs()
    cj = HERE / 'captions.json'; C = json.loads(cj.read_text(encoding='utf-8'))
    ok = True
    for lang in langs:
        bad, cap, n = check(lang, imgs)
        print('%-7s %s  short %d / demo %d' % (lang, 'ok' if not bad else 'PROBLEMS', n['Short description'], n['Short description · demo']))
        for b in bad: print('        ' + b)
        ok = ok and not bad
        if cap:
            for c in C['cards']:
                if cap.get(c['n']): c[lang] = cap[c['n']]
            C.setdefault('end', {})[lang] = {k: cap[k] for k in ('demo', 'wish', 'sub') if cap.get(k)}
    cj.write_text(json.dumps(C, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
