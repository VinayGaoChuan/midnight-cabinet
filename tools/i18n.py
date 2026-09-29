#!/usr/bin/env python3
"""Translations (src/mc-i18n.js): collect the Chinese text, hand it to translators in batches, pack the answers for the game.

  python3 tools/i18n.py extract                 every Chinese string in the sources → .ai/i18n/static.json
  python3 tools/i18n.py merge                   static + what the game showed (.ai/i18n/harvest*.json, tools/i18n-harvest.mjs)
                                                → .ai/i18n/keys.json: one list of keys, the most seen first
  python3 tools/i18n.py batches <lang> [n]      the keys <lang> still lacks, n per file → .ai/i18n/todo/<lang>/NNN.tsv (编号<TAB>中文);
                                                the translator writes .ai/i18n/ans/<lang>/NNN.tsv (编号<TAB>译文)
  python3 tools/i18n.py pack [lang…]            answers → .ai/i18n/tr/<lang>.json (every answer so far) → src/i18n/<lang>.js
  python3 tools/i18n.py status                  how much of keys.json each language has
  .ai/fontenv/bin/python3 tools/i18n.py traditional   zh-TW from the Chinese with OpenCC (Taiwan phrasing), then pack zh-TW

A key is the Chinese text as it reaches the screen, trimmed, numbers as {0} {1}…; template values as {e0} {e1}… (both stay in the
translation, in whatever order the language wants). The Chinese is the source; src/i18n/<lang>.js is generated — edit the answers.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, AI = ROOT / 'src', ROOT / '.ai' / 'i18n'
CJK = re.compile(r'[㐀-鿿豈-﫿]')
NUM = re.compile(r'\d+(?:[.,]\d+)*')
SEP = re.compile(r"(\n|\s*[·•｜|／/→←↑↓×]\s*|[：:，,、；;。！!？?…～~]+\s*|[（）()「」『』【】《》〈〉“”\"]\s*|\s{2,})")
LANGS = ['zh-TW', 'en', 'ja', 'ko', 'ru', 'fr', 'de', 'es', 'es-419', 'pt', 'pt-BR', 'it', 'pl', 'tr', 'uk', 'cs', 'hu', 'ro', 'nl', 'sv', 'da', 'no', 'fi', 'el', 'bg', 'th', 'vi', 'id', 'ms', 'ar']
LIT = re.compile(r"'(?:[^'\\\n]|\\.)*'|\"(?:[^\"\\\n]|\\.)*\"|`(?:[^`\\]|\\.)*`", re.S)


def norm(s):
    s = s.strip(); n = [0]
    def f(m): i = n[0]; n[0] += 1; return '{%d}' % i
    return NUM.sub(f, s)


def unescape(body):
    try: return json.loads('"' + body.replace('"', '\\"').replace("\\'", "'").replace('\\`', '`') + '"')
    except Exception: return body


def extract():
    order = [l.strip() for l in (SRC / '_order.txt').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('i18n/') and '*' not in l]
    keys = {}
    def add(k, where):
        k = k.strip()
        if not k or not CJK.search(k): return
        keys.setdefault(k, set()).add(where)
    for n in order + ['template.html']:
        p = SRC / n
        if not p.exists(): continue
        text = p.read_text(encoding='utf-8')
        if n.endswith('.html'):
            text = re.sub(r'<script\b.*?</script>', '', text, flags=re.S)
            for m in re.finditer(r'>([^<>]*[㐀-鿿][^<>]*)<', text):
                t = re.sub(r'\{\{[^}]*\}\}', '\u0000', m.group(1))
                # text around {{values}}: the template gives each value its own element → {e0} {e1}…
                i = [0]
                def e(_): r = '{e%d}' % i[0]; i[0] += 1; return r
                add(re.sub('\u0000', e, t), n)
            continue
        # line comments at the start of a line and block comments go first (their text is not shown)
        code = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
        code = '\n'.join(l for l in code.split('\n') if not l.lstrip().startswith('//'))
        for m in re.finditer(r"^\s*([\u3400-\u9fff][\u3400-\u9fff\w]{0,11})\s*:", code, re.M): add(m.group(1), n)
        for m in LIT.finditer(code):
            raw = m.group(0); body = raw[1:-1]
            if not CJK.search(body): continue
            if raw[0] == '`':
                i = [0]
                def v(_): r = '{%d}' % i[0]; i[0] += 1; return r
                body = re.sub(r'\$\{[^}]*\}', v, body)
            s = unescape(body)
            for line in s.split('\\n') if '\\n' in s else [s]:
                add(norm(line), n)
                # the pieces a composed string is cut into when it has no key of its own
                for i, part in enumerate(SEP.split(line)):
                    if i % 2 == 0 and CJK.search(part) and part.strip() != line.strip(): add(norm(part), n)
    AI.mkdir(parents=True, exist_ok=True)
    # only the docs read these (M.ROOM_D → docs/effects.md, tools/i18n-harvest.mjs dumps it) and the tuning panel is a dev tool
    doc = set()
    if (AI / 'doc-only.json').exists():
        for d in json.loads((AI / 'doc-only.json').read_text(encoding='utf-8')):
            doc.add(norm(d)); doc.update(norm(p) for i, p in enumerate(SEP.split(d)) if i % 2 == 0 and CJK.search(p))
    DEV = re.compile(r'^mc-(pxroom-[a-z]|tune)\.js$')
    # static keys: only whole strings — a fragment of a sentence put together at run time never matches what reaches the screen
    FRAG = re.compile(r'^[·•、，。：；！？」』）】…\-—+×/%,.:;!?)\]\s\u3000]|[「『（【：，、+−\-—×(/·]$|[{};=]\s*M\.|=>|\{(hold|tap|p|[a-z]+)\}|parts\.')
    keys = {k: v for k, v in keys.items() if k not in doc and not all(DEV.match(f) for f in v) and not FRAG.search(k) and len(CJK.findall(k)) >= 2}
    out = {k: sorted(v) for k, v in keys.items()}
    (AI / 'static.json').write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding='utf-8')
    print('static keys', len(out), 'CJK chars', sum(len(CJK.findall(k)) for k in out))


UNITS = ['{0} ' + u for u in '天 支 秒 个 次 级 张 件 名 座 夜 层 格 颗 只 块 场 局 点 瓶 条 道 项 盏 倍'.split()] + [
    '还需 {0} 天', '还需 {0} 天。', '第 {0} 天', '第 {0} 夜', '{0} 天后', '{0} 物资 · {1} 天',
    # the battle bar (mc-bbar.js): a bond not yet made, and each leader's passive as one sentence
    '还差 {0} 支', '每 {0} 秒所有敌人停顿 {1} 秒。', '部队的攻击有 {0}% 的概率造成双倍伤害。', '每 {0} 秒全队回复 {1}% 生命。', '每倒下一支部队，其余部队攻击 +{0}%。',
    '部队攻速 +{0}%。', '部队打倒的敌人会起火，点燃身边的敌人（每秒 {0}% 生命）。',
    # a summon skill by its timing (mc-awaken.js summonD): the summoned unit's name is a key of its own
    '每 {0} 秒召唤 {1} 只{n}', '每 {0} 秒召唤 {1} 只{n}，留场 {2} 秒。', '每攻击 {0} 次召唤 {1} 只{n}', '每攻击 {0} 次召唤 {1} 只{n}，留场 {2} 秒。',
    '每 {0} 秒召唤 {1} 只月豹和 {2} 只看门犬', '每 {0} 秒召唤 {1} 只月豹和 {2} 只看门犬，留场 {3} 秒，自己损失 {4} 点生命。',
    '每 {0} 秒召唤 {1} 只魔豹和 {2} 只邪犬', '每 {0} 秒召唤 {1} 只魔豹和 {2} 只邪犬，留场 {3} 秒，自己损失 {4} 点生命。',
    # a mini-game's result line (mc-ledger.js) and the expedition going on (mc-resume.js), cut at 「·」「、」「（」 when translated
    '花费 {0} 积分', '基础 {0}', '加成 +{0}', '净赚 {0}', '净赔 {0}', '领袖生命 +{0}', '领袖生命 -{0}', '积分 -{0}', '物资 -{0}', '第 {0} 站']


def merge():
    st = json.loads((AI / 'static.json').read_text(encoding='utf-8'))
    seen = {}
    for p in sorted(AI.glob('harvest*.json')):
        for k, n in json.loads(p.read_text(encoding='utf-8')):
            k = k.strip()
            # a single character is a piece of a title drawn one character at a time: the drawing code translates the whole title;
            # one character around a number is a unit, not a piece (「{0} 天」「{0} 支」)
            c = len(CJK.findall(k))
            if k and (c >= 2 or (c == 1 and '{' in k)): seen[k] = seen.get(k, 0) + n
    # a line typed one character at a time left every prefix of itself: keep only the whole line
    ks = sorted(seen); pre = set()
    for i, k in enumerate(ks):
        for k2 in ks[i + 1:i + 4]:
            if k2.startswith(k) and len(k2) - len(k) <= 2 and k not in st: pre.add(k); break
    seen = {k: n for k, n in seen.items() if k not in pre}
    # a long description drawn over several lines left each line on its own: a line that is part of a longer key goes
    allk = set(seen) | set(st)
    frag = {k for k in seen if k not in st and any(len(o) >= len(k) + 2 and k in o for o in allk)}
    seen = {k: n for k, n in seen.items() if k not in frag}
    keys = {}
    for k, n in seen.items(): keys[k] = {'n': n, 'src': 'screen'}
    # the unit table (mc-db.js) still carries its old trait texts: what a unit shows now, the harvest's data tour got from the tip
    # functions themselves — a unit-table string no screen ever showed is not translated
    LEGACY = {'mc-db.js'}
    for k, where in st.items():
        if k not in keys and not set(where) <= LEGACY: keys[k] = {'n': 0, 'src': ','.join(where[:3])}
    # a number and its unit, built in code by joining strings (「o.days + ' 天'」): the split fallback in src/mc-i18n.js needs these
    for k in UNITS:
        if k not in keys: keys[k] = {'n': 0, 'src': 'unit'}
    order = sorted(keys, key=lambda k: (-keys[k]['n'], k))
    (AI / 'keys.json').write_text(json.dumps([[k, keys[k]['n'], keys[k]['src']] for k in order], ensure_ascii=False, indent=0), encoding='utf-8')
    print('keys', len(order), '· seen on screen', len(seen), '· static only', len(order) - len([k for k in order if keys[k]['n']]), '· CJK chars', sum(len(CJK.findall(k)) for k in order))


esc = lambda s: s.replace('\\', '\\\\').replace('\n', '\\n').replace('\t', '\\t')
unesc = lambda s: re.sub(r'\\(.)', lambda m: {'n': '\n', 't': '\t'}.get(m.group(1), m.group(1)), s)


def read_tsv(p):
    out = {}
    for line in p.read_text(encoding='utf-8-sig').splitlines():
        if '\t' not in line: continue
        i, t = line.split('\t', 1)
        if i.strip().isdigit(): out[int(i)] = unesc(t)
    return out


def load_tr(lang):
    """every answer so far: .ai/i18n/tr/<lang>.json, plus answer files .ai/i18n/ans/<lang>/NNN.tsv matched to .ai/i18n/todo/<lang>/NNN.tsv"""
    f = AI / 'tr' / (lang + '.json')
    d = json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}
    new = 0
    for a in sorted((AI / 'ans' / lang).glob('*.tsv')):
        q = AI / 'todo' / lang / a.name
        src = read_tsv(q) if q.exists() else {}   # 「中文<TAB>译文」 lines need no batch; numbered ones do
        for line in a.read_text(encoding='utf-8-sig').splitlines():
            if '\t' not in line: continue
            c0, t = line.split('\t', 1); t = unesc(t).strip()
            # 「编号<TAB>译文」 or 「中文<TAB>译文」 (the second cannot slip a line)
            k = src.get(int(c0)) if c0.strip().isdigit() else unesc(c0).strip()
            if k and t and d.get(k) != t: d[k] = t; new += 1
    if new:
        f.parent.mkdir(parents=True, exist_ok=True); f.write_text(json.dumps(d, ensure_ascii=False, indent=0), encoding='utf-8')
    return d


def batches(lang, n=300):
    """the keys <lang> lacks, as numbered lines: .ai/i18n/todo/<lang>/NNN.tsv (「编号<TAB>中文」); answers go to
    .ai/i18n/ans/<lang>/NNN.tsv as 「编号<TAB>译文」 or 「中文<TAB>译文」 (\\n for a line break)"""
    keys = [k for k, _, _ in json.loads((AI / 'keys.json').read_text(encoding='utf-8'))]
    have = load_tr(lang); todo = [k for k in keys if k not in have]
    for sub in ('todo', 'ans'):
        d = AI / sub / lang
        if d.exists():
            for p in d.glob('*.tsv'): p.unlink()
    d = AI / 'todo' / lang; d.mkdir(parents=True, exist_ok=True); (AI / 'ans' / lang).mkdir(parents=True, exist_ok=True)
    for i in range(0, len(todo), n):
        (d / ('%03d.tsv' % (i // n))).write_text(''.join('%d\t%s\n' % (j + 1, esc(k)) for j, k in enumerate(todo[i:i + n])), encoding='utf-8')
    print(lang, 'todo', len(todo), 'in', (len(todo) + n - 1) // n, 'files →', d)


def check(k, v):
    """a translation keeps every placeholder of its key"""
    ph = lambda s: sorted(re.findall(r'\{(?:e?\d+|n)\}', s))
    return ph(k) == ph(v)


def pack(langs):
    keys = {k for k, _, _ in json.loads((AI / 'keys.json').read_text(encoding='utf-8'))} if (AI / 'keys.json').exists() else None
    (SRC / 'i18n').mkdir(exist_ok=True)
    for lang in langs or LANGS:
        d = load_tr(lang)
        if not d: continue
        bad = [k for k, v in d.items() if not check(k, v)]
        for k in bad: del d[k]
        body = json.dumps(dict(sorted(d.items())), ensure_ascii=False, indent=0)
        (SRC / 'i18n' / (lang + '.js')).write_text("(window.MC_I18N = window.MC_I18N || {})[%s] = %s;\n" % (json.dumps(lang), body), encoding='utf-8')
        print(lang, len(d), 'entries', ('· dropped %d with wrong placeholders' % len(bad)) if bad else '', ('· %.0f%% of keys' % (100 * len(set(d) & keys) / len(keys))) if keys else '')


def traditional():
    """zh-TW from the Chinese itself: OpenCC's Simplified → Taiwan standard with Taiwanese phrasing (設定, 滑鼠, 軟體); needs the
    opencc package (pip install opencc-python-reimplemented, e.g. into .ai/fontenv). Terms OpenCC gets wrong for this game are kept."""
    from opencc import OpenCC
    cc = OpenCC('s2twp')
    KEEP = [('機臺', '機台'), ('臺灣', '台灣')]   # an arcade machine is a 機台 in Taiwan too
    keys = [k for k, _, _ in json.loads((AI / 'keys.json').read_text(encoding='utf-8'))]
    d = {}
    for k in keys:
        t = cc.convert(k)
        for a, b in KEEP: t = t.replace(a, b)
        d[k] = t
    f = AI / 'tr' / 'zh-TW.json'; f.parent.mkdir(parents=True, exist_ok=True)
    old = json.loads(f.read_text(encoding='utf-8')) if f.exists() else {}
    old.update({k: v for k, v in d.items() if k not in old})
    f.write_text(json.dumps(old, ensure_ascii=False, indent=0), encoding='utf-8')
    print('zh-TW', len(old), 'entries')


def status():
    keys = [k for k, _, _ in json.loads((AI / 'keys.json').read_text(encoding='utf-8'))]
    for lang in LANGS:
        d = load_tr(lang); have = sum(1 for k in keys if k in d)
        print('%-7s %5d / %d  %5.1f%%' % (lang, have, len(keys), 100 * have / max(1, len(keys))))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__)
    elif a[0] == 'extract': extract()
    elif a[0] == 'merge': merge()
    elif a[0] == 'batches': batches(a[1], int(a[2]) if len(a) > 2 else 300)
    elif a[0] == 'pack': pack(a[1:])
    elif a[0] == 'status': status()
    elif a[0] == 'traditional': traditional()
    else: print(__doc__)
