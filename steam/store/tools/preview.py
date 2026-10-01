#!/usr/bin/env python3
"""商店页预览：把 商店文案.md 里的简短描述和「关于这款游戏」（BBCode）排成一页，图文和动图放在一起看效果。

  python3 preview.py <交付文件夹> [en]   → <交付文件夹>/商店页预览.html（en：商店页预览-English.html，英文文案和英文素材）（引用同文件夹里的 封面/正式版、封面/试玩版、截图/（png/ 原画）、动图/、预告片/，离线打开）
"""
import html, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1])
md = (HERE.parent / '商店文案.md').read_text(encoding='utf-8')
blocks = re.findall(r"```\n(.*?)\n```", md, re.S)
# en: the English page — English copy, 截图-English / 动图-English and the English trailer, → 商店页预览-English.html
EN = len(sys.argv) > 2 and sys.argv[2] == 'en'
SUF, SHOTS, ANIM = ('-English', '截图-English', '动图-English') if EN else ('', '截图', '动图')
COV = '封面-English（其余语言）' if EN else '封面'   # the English page shows the letters covers (MIDNIGHT / CABINET)
short_zh, short_demo, about_zh, demo_zh = (blocks[2], blocks[3], blocks[5], blocks[7]) if EN else (blocks[0], blocks[1], blocks[4], blocks[6])


def bb(s):
    out = []
    for line in s.split('\n'):
        t = html.escape(line)
        m = re.match(r"\[img\]\{STEAM_APP_IMAGE\}/extras/(.+?)\[/img\]", line)
        if m:
            name = m.group(1)
            mp4 = name.rsplit('.', 1)[0] + '.mp4'   # the page shows the MP4 Steam will play (same clip as the GIF)
            if (OUT / ANIM / mp4).exists(): out.append(f'<figure><video src="{ANIM}/{html.escape(mp4)}" autoplay loop muted playsinline></video></figure>')
            else: out.append(f'<figure><img src="{ANIM}/{html.escape(name)}" alt="" loading="lazy"></figure>')
            continue
        t = re.sub(r"\[h2\](.*?)\[/h2\]", r"<h2>\1</h2>", t)
        t = re.sub(r"\[b\](.*?)\[/b\]", r"<strong>\1</strong>", t)
        t = t.replace('[list]', '<ul>').replace('[/list]', '</ul>')
        t = re.sub(r"^\[\*\](.*)$", r"<li>\1</li>", t)
        if t and not t.startswith('<'): t = f'<p>{t}</p>'
        out.append(t)
    return '\n'.join(out)


shots = sorted(p.name for p in (OUT / SHOTS).glob('*.jpg'))
thumbs = '\n'.join(f'<a href="{SHOTS}/png/{html.escape(n[:-4])}.png"><img src="{SHOTS}/{html.escape(n)}" alt=""></a>' for n in shots)
trailer = next((p.name for p in sorted((OUT / '预告片').glob('*.mp4')) if ('Midnight' in p.name) == EN), '')
page = f"""<!doctype html><html lang="{'en' if EN else 'zh-CN'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{'Midnight Cabinet · Store Page Preview' if EN else '午夜机台 · 商店页预览'}</title>
<style>
:root {{ --bg: #14111f; --panel: #1d1830; --ink: #e9e4ff; --dim: #a39cc4; --gold: #ffcf4a; --wine: #8c2340; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.7 -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }}
.wrap {{ max-width: 1080px; margin: 0 auto; padding: 24px 16px 80px; }}
.note {{ color: var(--dim); font-size: 13px; margin: 0 0 18px; }}
.top {{ display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 16px; }}
.top video, .top img {{ width: 100%; display: block; border-radius: 4px; }}
.side {{ background: var(--panel); padding: 14px; border-radius: 4px; display: flex; flex-direction: column; gap: 12px; }}
.side p {{ margin: 0; color: var(--dim); }}
.strip {{ display: flex; gap: 8px; overflow-x: auto; margin: 12px 0 28px; padding-bottom: 6px; }}
.strip img {{ height: 110px; border-radius: 3px; display: block; }}
.cols {{ display: grid; grid-template-columns: minmax(0, 780px) minmax(0, 1fr); gap: 28px; }}
.about h2 {{ font-size: 15px; letter-spacing: .08em; color: var(--gold); border-bottom: 1px solid #3a3160; padding-bottom: 4px; margin: 26px 0 10px; }}
.about figure {{ margin: 18px 0 0; }} .about figure img, .about figure video {{ width: 100%; display: block; border-radius: 3px; }}
.about p {{ margin: 8px 0; }}
.demo {{ background: var(--panel); padding: 14px 16px; border-left: 3px solid var(--wine); border-radius: 4px; }}
.demo h2 {{ font-size: 14px; color: var(--gold); margin: 12px 0 6px; }}
.caps {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-top: 36px; }}
.caps figure {{ margin: 0; background: var(--panel); padding: 8px; border-radius: 4px; }}
.caps img {{ width: 100%; display: block; }}
.caps figcaption {{ color: var(--dim); font-size: 12px; margin-top: 6px; }}
@media (max-width: 760px) {{ .top, .cols {{ grid-template-columns: 1fr; }} }}
</style></head><body><div class="wrap">
<p class="note">{'Local preview of how the text and clips sit together; fill in Steamworks from 商店文案.md.' if EN else '本地预览，只用来看图文和动图排在一起的效果；上传时照 商店文案.md 在 Steamworks 后台逐栏填写。'}</p>
<div class="top">
  <video src="预告片/{html.escape(trailer)}" controls muted playsinline poster="{SHOTS}/{html.escape(shots[0]) if shots else ''}"></video>
  <div class="side"><img src="{COV}/正式版/header_capsule.png" alt=""><p>{html.escape(short_zh)}</p></div>
</div>
<div class="strip">{thumbs}</div>
<div class="cols">
  <div class="about">{bb(about_zh)}</div>
  <div><div class="demo"><strong>{'Demo' if EN else '试玩版'}</strong><p>{html.escape(short_demo)}</p>{bb(demo_zh)}</div></div>
</div>
<div class="caps">
{''.join(f'<figure><img src="{COV}/{n}.png" alt=""><figcaption>{c}</figcaption></figure>' for n, c in [
    ('正式版/header_capsule', '顶部横幅 920×430'), ('正式版/small_capsule', '小封面 462×174'), ('正式版/main_capsule', '主封面 1232×706'), ('正式版/vertical_capsule', '竖版封面 748×896'),
    ('正式版/library_capsule', '资料库封面 600×900'), ('正式版/library_hero', '资料库主图 3840×1240'), ('正式版/library_logo', '资料库标志 1280 宽，透明底'), ('正式版/page_background', '页面背景 1438×810'),
    ('试玩版/header_capsule', '试玩版 · 顶部横幅'), ('试玩版/main_capsule', '试玩版 · 主封面'), ('试玩版/library_capsule', '试玩版 · 资料库封面'), ('试玩版/library_logo', '试玩版 · 资料库标志')])}
</div>
</div></body></html>"""
(OUT / f'商店页预览{SUF}.html').write_text(page, encoding='utf-8')
print('wrote', OUT / f'商店页预览{SUF}.html')
