#!/usr/bin/env python3
"""Pixel fonts -> src/fonts.css: the two web fonts inlined as data: URIs, cut down to the characters the game uses.

Usage: python3 tools/fonts.py
The page then loads no font from the network (the packaged Steam / Android builds block it, and jsDelivr / Google Fonts
are unreliable or blocked for players in mainland China). Needs network on the first run (downloads are cached in
.ai/fonts/) and fontTools; with brotli the fonts are woff2, without it woff (bigger):  pip install fonttools brotli
Re-run it when new text brings characters the pixel font does not cover yet — tools/mk.py warns about them.
"""
import base64, hashlib, io, pathlib, re, sys, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, CACHE, OUT = ROOT / 'src', ROOT / '.ai' / 'fonts', ROOT / 'src' / 'fonts.css'
# (stylesheet, family): the same two sheets the page used to link
SHEETS = [('https://cdn.jsdelivr.net/npm/@fontsource/fusion-pixel-12px-proportional-sc@5/index.css', 'Fusion Pixel 12px Proportional SC'),
          ('https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap', 'Silkscreen')]
PIXEL = SHEETS[0][1]
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'   # Google serves woff2 to it


def used_chars():
    """Every character that appears in the game's sources (strings and comments alike) plus printable ASCII."""
    cs = set(range(0x20, 0x7F))
    for p in sorted(SRC.iterdir()):
        if p.suffix in ('.js', '.html') and p.name != 'fonts.css':
            cs.update(ord(c) for c in p.read_text(encoding='utf-8-sig') if ord(c) >= 0x20)
    return cs


def parse_range(txt):
    out = set()
    for part in txt.split(','):
        part = part.strip().upper().replace('U+', '')
        if not part: continue
        if '?' in part: a, b = int(part.replace('?', '0'), 16), int(part.replace('?', 'F'), 16)
        elif '-' in part: a, b = (int(x, 16) for x in part.split('-'))
        else: a = b = int(part, 16)
        out.update(range(a, b + 1))
    return out


def fmt_range(cps):
    cps, out, i = sorted(cps), [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1: j += 1
        out.append('U+%X' % cps[i] if i == j else 'U+%X-%X' % (cps[i], cps[j])); i = j + 1
    return ', '.join(out)


def covered(css_text, family=PIXEL):
    """Code points the given family covers in an existing fonts.css (read by tools/mk.py, no fontTools needed)."""
    cs = set()
    for body in re.findall(r'@font-face\s*\{(.*?)\}', css_text, re.S):
        if family in body:
            m = re.search(r'unicode-range:\s*([^;]+);', body)
            if m: cs |= parse_range(m.group(1))
    return cs


def fetch(url):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / (hashlib.sha1(url.encode('utf-8')).hexdigest()[:16] + pathlib.PurePosixPath(urllib.parse.urlparse(url).path).suffix)
    if not f.exists():
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=60) as r: f.write_bytes(r.read())
    return f.read_bytes()


def main():
    from fontTools import subset
    from fontTools.ttLib import TTFont
    try:
        import brotli  # noqa: F401  (woff2 needs it)
        flavor, mime = 'woff2', 'font/woff2'
    except ImportError:
        flavor, mime = 'woff', 'font/woff'; print('brotli missing: writing woff (pip install brotli for smaller woff2)')
    want, faces, total = used_chars(), [], 0
    for sheet, family in SHEETS:
        css = fetch(sheet).decode('utf-8')
        for body in re.findall(r'@font-face\s*\{(.*?)\}', css, re.S):
            rng = re.search(r'unicode-range:\s*([^;]+);', body)
            need = want & parse_range(rng.group(1)) if rng else set(want)
            if not need: continue
            url = re.search(r'url\(\s*["\']?([^)"\']+?\.woff2)["\']?\s*\)', body)
            if not url: continue
            weight = (re.search(r'font-weight:\s*([^;]+);', body) or re.search('()', '')).group(1).strip() or '400'
            style = (re.search(r'font-style:\s*([^;]+);', body) or re.search('()', '')).group(1).strip() or 'normal'
            font = TTFont(io.BytesIO(fetch(urllib.parse.urljoin(sheet, url.group(1)))))
            have = need & set(font.getBestCmap() or {})
            if not have: continue
            opt = subset.Options(); opt.flavor = flavor; opt.layout_features = ['*']; opt.name_IDs = ['*']; opt.notdef_outline = True
            sub = subset.Subsetter(opt); sub.populate(unicodes=sorted(have)); sub.subset(font)
            buf = io.BytesIO(); font.flavor = flavor; font.save(buf); data = buf.getvalue(); total += len(data)
            faces.append("@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:block;src:url(data:%s;base64,%s) format('%s');unicode-range:%s;}"
                         % (family, style, weight, mime, base64.b64encode(data).decode('ascii'), flavor, fmt_range(have)))
    if not faces: sys.exit('no font faces produced')
    OUT.write_text('/* generated by tools/fonts.py: %s + %s, subset to the characters in src/ — do not edit */\n' % (SHEETS[0][1], SHEETS[1][1]) + '\n'.join(faces) + '\n', encoding='utf-8')
    print('wrote %s: %d faces, %d KB of font data, %d pixel-font characters' % (OUT.relative_to(ROOT), len(faces), total // 1024, len(covered(OUT.read_text(encoding='utf-8')))))


if __name__ == '__main__':
    main()
