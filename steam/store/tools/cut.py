#!/usr/bin/env python3
"""商店素材剪辑：按剪辑表（JSON）从 rec.mjs 的录像里导出截图、描述动图和预告片。

  python3 cut.py <剪辑表.json> <输出文件夹>

剪辑表：
  "src":    { "A": "<录像文件夹>", ... }            每个文件夹里有 final.mp4（有声）/ video.mp4、png/（每 N 帧一张原画）
  "shots":  [ { "n": "01_boss", "src": "C", "f": 帧号 } ]          → 截图/<n>.png（1920×1080 原画）+ <n>.jpg
  "anims":  [ { "n": "02_merge", "src": "A", "t": 秒, "d": 秒, "crop": [x, y, w, h]? } ]   （或 "parts": [[秒, 秒], …] 几段接在一起）
                                                   → 动图/<n>.gif（616 宽）+ <n>.mp4（1170 宽，无声，≤12 秒）
  "trailer": { "out": "午夜机台-预告片.mp4", "cards": "<字幕卡文件夹>",
               "parts": [ { "src": "O", "t": 秒, "d": 秒, "card": "c1"? }, …, { "end": "end_demo", "d": 5, "src": "O", "t": 秒 } ] }
                                                   → 预告片/<out>（1920×1080，30 帧，H.264 + AAC）
Steam 的要求（2026-09-28 核对 partner.steamgames.com）：截图至少 5 张、1920×1080、只放实机画面；「关于这款游戏」里的
动图可以是 GIF / MP4 / WEBM，推荐 1170 宽、最长 12 秒；每个文件小于 5 MB，「关于」里的图加起来 15 MB 以内（剪辑表 "mp4mb" 是每段 MP4 的额度，默认 1.6）；预告片最高 1920×1080、30 或 60 帧、5000 kbps 以上。
"""
import json, os, subprocess, sys, pathlib

FF = os.environ.get('FFMPEG', 'ffmpeg')
spec = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8'))
OUT = pathlib.Path(sys.argv[2])
SRC = {k: pathlib.Path(v) for k, v in spec.get('src', {}).items()}
BT709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']


def run(args):
    r = subprocess.run([FF, '-y', '-loglevel', 'error'] + [str(a) for a in args])
    if r.returncode: raise SystemExit('ffmpeg failed: ' + ' '.join(map(str, args))[:400])


def media(k):
    d = SRC[k]
    return d / 'final.mp4' if (d / 'final.mp4').exists() else d / 'video.mp4'


def mb(p): return round(p.stat().st_size / 1e6, 2)


# ── 截图：原画 PNG，另存一份 JPG（整页 15 MB 的额度里，截图用 JPG 省一半以上）──
if spec.get('shots'):
    d = OUT / '截图'; d.mkdir(parents=True, exist_ok=True)
    for s in spec['shots']:
        pngs = sorted((SRC[s['src']] / 'png').glob('f*.png'))
        best = min(pngs, key=lambda p: abs(int(p.stem[1:]) - s['f']))
        png = d / (s['n'] + '.png'); png.write_bytes(best.read_bytes())
        run(['-i', png, '-q:v', '2', d / (s['n'] + '.jpg')])
        print('shot', s['n'], best.name, mb(png), 'MB png /', mb(d / (s['n'] + '.jpg')), 'MB jpg')

# ── 描述动图：GIF（616 宽，调色板 + 抖动）和 MP4（1170 宽，无声）──
if spec.get('anims'):
    d = OUT / '动图'; d.mkdir(parents=True, exist_ok=True)
    for a in spec['anims']:
        # one stretch ("t", "d") or several joined back to back ("parts": [[秒, 秒], …], e.g. the start of a build and the room finishing)
        segs = a.get('parts') or [[a['t'], a['d']]]; dur = min(12, sum(x[1] for x in segs))
        crop = a.get('crop'); pre = f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}," if crop else ''
        ins = [v for t, sd in segs for v in ('-ss', t, '-t', sd, '-i', media(a.get('src')))]
        cat = ''.join(f'[{i}:v]' for i in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0,' if len(segs) > 1 else ''
        vin = '' if len(segs) > 1 else '[0:v]'
        # the eight clips of 「关于」 share Steam's 15 MB: each MP4 is squeezed (higher CRF) until it fits its share
        mp4 = d / (a['n'] + '.mp4')
        for crf in [a.get('crf', 21), 24, 27, 30, 33]:
            run(ins + ['-an', '-filter_complex', vin + cat + pre + f'trim=duration={dur},scale=1170:-2:flags=lanczos[v]', '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf,
                 '-pix_fmt', 'yuv420p', *BT709, '-movflags', '+faststart', mp4])
            if mb(mp4) <= a.get('mp4mb', spec.get('mp4mb', 1.6)): break
        # a GIF over 3 MB loads slowly (and Steam refuses files of 5 MB and more): fewer frames, colours, then pixels until it fits
        steps = [(15, 128, 616), (13, 96, 616), (11, 64, 616), (10, 48, 616), (10, 48, 540), (10, 48, 480), (8, 40, 480)]
        for fps, colors, gw in steps:
            gif = d / (a['n'] + '.gif')
            run(ins + ['-filter_complex',
                 vin + cat + pre + f"trim=duration={dur},fps={fps},scale={gw}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors={colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle", '-loop', '0', gif])
            if mb(gif) <= a.get('maxmb', 3.0): break
        print('anim', a['n'], dur, 's ·', mb(gif), 'MB gif @', fps, 'fps', gw, 'px /', mb(mp4), 'MB mp4 crf', crf)

# ── 预告片：一段段实机画面（带游戏自己的声音），字幕卡淡入淡出，片尾卡 ──
if spec.get('trailer'):
    T = spec['trailer']; d = OUT / '预告片'; d.mkdir(parents=True, exist_ok=True); tmp = d / '.parts'; tmp.mkdir(exist_ok=True)
    cards = pathlib.Path(T['cards']); parts = []; sheet = []
    at = 0.0
    for i, p in enumerate(T['parts']):
        seg = tmp / f'p{i:02d}.mp4'; dur = p['d']; fi = p.get('fin', 0.25); fo = p.get('fout', 0.25)
        vf = f"fps=30,scale=1920:1080:flags=lanczos,format=yuv420p,fade=t=in:st=0:d={fi},fade=t=out:st={dur - fo}:d={fo}"
        af = f"aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st=0:d={fi},afade=t=out:st={dur - fo}:d={fo}"
        if p.get('end'):
            # the end card over the sound of a chosen stretch of the game (the menu's music)
            run(['-loop', '1', '-t', dur, '-i', cards / (p['end'] + '.png'), '-ss', p['t'], '-t', dur, '-i', media(p['src']),
                 '-filter_complex', f"[0]{vf}[v];[1:a]{af}[a]", '-map', '[v]', '-map', '[a]', '-r', 30, '-c:v', 'libx264', '-preset', 'slow', '-crf', 14, '-c:a', 'aac', '-b:a', '320k', '-shortest', seg])
        else:
            if p.get('card'):
                c0, c1 = p.get('cin', 0.3), min(dur - 0.3, p.get('cout', dur - 0.4))
                fc = (f"[0:v]{vf}[b];[1]format=rgba,fade=t=in:st={c0}:d=0.35:alpha=1,fade=t=out:st={c1 - 0.35}:d=0.35:alpha=1[c];[b][c]overlay=0:0:shortest=1[v];[0:a]{af}[a]")
                inputs = ['-ss', p['t'], '-t', dur, '-i', media(p['src']), '-loop', '1', '-t', dur, '-i', cards / (p['card'] + '.png')]
            else:
                fc = f"[0:v]{vf}[v];[0:a]{af}[a]"; inputs = ['-ss', p['t'], '-t', dur, '-i', media(p['src'])]
            run(inputs + ['-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-r', 30, '-c:v', 'libx264', '-preset', 'slow', '-crf', 14, '-c:a', 'aac', '-b:a', '320k', seg])
        parts.append(seg); sheet.append(f"{at:6.2f}–{at + dur:6.2f} 秒  {p.get('src', '')} {p.get('t', '')}+{dur}  {p.get('card') or p.get('end') or ''}  {p.get('note', '')}"); at += dur
    lst = tmp / 'list.txt'; lst.write_text(''.join(f"file '{s.name}'\n" for s in parts), encoding='utf-8')
    raw = tmp / 'joined.mp4'
    run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', raw])
    out = d / T['out']
    # one loudness for the whole film (about -14 LUFS, the level video sites play at)
    # Steam asks for 5000+ kbps: pixel art compresses so well that a quality target lands under it, so the rate is set
    run(['-i', raw, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '12M', '-maxrate', '18M', '-bufsize', '36M', '-pix_fmt', 'yuv420p', *BT709, '-r', 30,
         '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.84:level=false', '-c:a', 'aac', '-b:a', '320k', '-ar', 48000, '-movflags', '+faststart', out])
    (d / '剪辑表.txt').write_text('\n'.join(sheet) + f"\n共 {at:.1f} 秒\n", encoding='utf-8')
    for s in parts: s.unlink()
    lst.unlink(); raw.unlink(); tmp.rmdir()
    print('trailer', out, round(at, 1), 's', mb(out), 'MB')
