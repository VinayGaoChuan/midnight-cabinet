// Steam 封面与资料库图：全部取自游戏开场的实机画面（rec.mjs stills 以 3840×2160 渲染），按每种尺寸裁切，
// 标题用游戏自己的标题字（logo.mjs 的同一套画法），试玩版加游戏里的酒红牌子「试玩版 · DEMO」。
//   node capsules.mjs <开场截图文件夹> <输出文件夹>
//   LOGO_DIR=<logo.mjs 的输出> PLATE='試玩版 · DEMO' node capsules.mjs …：别的语言的标题字和试玩版牌子（默认 <输出>/../logo、「试玩版 · DEMO」）
//   CAPS_OVR='{"small_capsule":{"box":[x,y,w,h]}}'：按名字改某几张的裁切框 / 牌子位置（字母版的片名是两行，小图要框得更高）
//     字母版（2026-09-30 定稿）：CAPS_OVR='{"small_capsule":{"box":[606,262,708,266.7]},"demo_small_capsule":{"box":[548,270,832,313.3],"plate":{"x":960,"y":552,"size":22}}}' LOGO_DIR=<LOGO_LANG=en 的输出> PLATE='DEMO'
// 截图文件夹里要有 t016.00.png（屏幕上咧嘴笑的恶魔脸）和 t020.25.png（中奖：标题砸在屏幕上）。
// 尺寸按 Steamworks 文档（2026-09-28 核对）：https://partner.steamgames.com/doc/store/assets/standard 、…/libraryassets
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHROME_BIN } from './chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..', '..');
const SRC = path.resolve(process.argv[2]), OUT = path.resolve(process.argv[3]), PORT = 9621, LOGO_DIR = path.resolve(process.env.LOGO_DIR || path.join(OUT, '..', 'logo'));
const prof = path.join(os.tmpdir(), 'mc-caps-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME_BIN(), ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

// every asset: which still, which box of it (in 1920×1080 view coordinates; the still is twice that), the output size, what goes on top.
// jack = t020.25 (the title on the machine's screen), grin = t016.00 (the grinning face, no words)
const JOBS = [
  // 商店
  { n: 'header_capsule', w: 920, h: 430, src: 'jack', box: [260, 40, 1400, 654] },
  { n: 'small_capsule', w: 462, h: 174, src: 'jack', box: [676, 330, 568, 213.5] },
  { n: 'main_capsule', w: 1232, h: 706, src: 'jack', box: [160, 30, 1600, 917] },
  { n: 'vertical_capsule', w: 748, h: 896, src: 'jack', box: [505, 0, 902, 1080] },
  { n: 'page_background', w: 1438, h: 810, src: 'grin', box: [0, 0, 1920, 1080], dim: 0.55 },
  // 资料库
  { n: 'library_capsule', w: 600, h: 900, src: 'grin', box: [470, 0, 980, 1080], logo: { y: 0.045, w: 0.88 }, top: 285 },
  { n: 'library_header', w: 920, h: 430, src: 'jack', box: [260, 40, 1400, 654] },
  { n: 'library_hero', w: 3840, h: 1240, src: 'grin', box: [0, 0, 1920, 620] },
  // 社区图标：机台招牌上的一只红眼
  { n: 'community_icon', w: 184, h: 184, src: 'grin', box: [777, 22, 150, 150] },
];
// the demo's own set: every capsule says it is the demo (Steam: 「clearly indicate that the app is a demo」)
const DEMO = [
  { n: 'demo_header_capsule', w: 920, h: 430, src: 'jack', box: [260, 40, 1400, 654], plate: { x: 960, y: 548, size: 34 } },
  { n: 'demo_small_capsule', w: 462, h: 174, src: 'jack', box: [648, 330, 624, 234], plate: { x: 960, y: 524, size: 24 } },
  { n: 'demo_main_capsule', w: 1232, h: 706, src: 'jack', box: [160, 30, 1600, 917], plate: { x: 960, y: 552, size: 30 } },
  { n: 'demo_vertical_capsule', w: 748, h: 896, src: 'jack', box: [505, 0, 902, 1080], plate: { x: 960, y: 552, size: 30 } },
  { n: 'demo_library_capsule', w: 600, h: 900, src: 'grin', box: [470, 0, 980, 1080], logo: { y: 0.03, w: 0.8, demo: true }, top: 315 },
  { n: 'demo_library_header', w: 920, h: 430, src: 'jack', box: [260, 40, 1400, 654], plate: { x: 960, y: 548, size: 34 } },
];
// per-language changes to a few boxes (CAPS_OVR): the letters title takes two lines
const OVR = JSON.parse(process.env.CAPS_OVR || '{}'); [JOBS, DEMO].forEach(L => L.forEach(j => { if (OVR[j.n]) Object.assign(j, OVR[j.n]); }));

const DRAW = (jobs, imgs) => `(async () => {
  await document.fonts.ready;
  const U = MC.UI, load = (s) => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
  const I = {}; for (const [k, v] of Object.entries(${JSON.stringify(imgs)})) I[k] = await load(v);
  const out = {};
  for (const j of ${JSON.stringify(jobs)}) {
    const c = document.createElement('canvas'); c.width = j.w; c.height = j.h; const x = c.getContext('2d');
    x.fillStyle = '#0d0a1c'; x.fillRect(0, 0, j.w, j.h);
    // the still, twice the view's size: plates go on it first, in view coordinates, so they scale with the picture
    const src = I[j.src], S = document.createElement('canvas'); S.width = src.width; S.height = src.height; const sx = S.getContext('2d'); sx.drawImage(src, 0, 0);
    if (j.plate) { sx.save(); sx.scale(2, 2); U.tab(sx, ${JSON.stringify(process.env.PLATE || '试玩版 · DEMO')}, j.plate.x, j.plate.y, { kind: 'wine', size: j.plate.size, align: 'center' }); sx.restore(); }
    const [bx, by, bw, bh] = j.box, top = j.top || 0, dh = j.h - top, k = Math.max(j.w / bw, dh / bh);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    const w2 = bw * k, h2 = bh * k;
    x.drawImage(S, bx * 2, by * 2, bw * 2, bh * 2, (j.w - w2) / 2, top + (dh - h2) / 2, w2, h2);
    if (top) { const g = x.createLinearGradient(0, top - 10, 0, top + 120); g.addColorStop(0, '#0d0a1c'); g.addColorStop(1, 'rgba(13,10,28,0)'); x.fillStyle = g; x.fillRect(0, 0, j.w, top + 120); }
    if (j.dim) { x.fillStyle = 'rgba(8,6,20,' + j.dim + ')'; x.fillRect(0, 0, j.w, j.h); }
    if (j.logo) { const L = I[j.logo.demo ? 'logoDemo' : 'logo'], lw = j.w * j.logo.w, lh = L.height * lw / L.width; x.imageSmoothingEnabled = false; x.drawImage(L, (j.w - lw) / 2, j.h * j.logo.y, lw, lh); }
    out[j.n] = c.toDataURL('image/png');
  }
  return out;
})()`;

try {
  let tgt; for (let i = 0; i < 50 && !tgt; i++) { await wait(200); try { tgt = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Page.enable'); await send('Page.navigate', { url: pathToFileURL(path.join(REPO, 'index.html')).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.MC && window.MC.UI && window.MC_ALL_READY)')) break; } catch (e) {} }
  const imgs = { jack: b64(path.join(SRC, 't020.25.png')), grin: b64(path.join(SRC, 't016.00.png')), logo: b64(path.join(LOGO_DIR, 'title_wide.png')), logoDemo: b64(path.join(LOGO_DIR, 'title_wide_demo.png')) };
  fs.mkdirSync(OUT, { recursive: true });
  for (const set of [JOBS, DEMO]) {
    const r = await ev(DRAW(set, imgs));
    for (const k in r) { fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(r[k].split(',')[1], 'base64')); console.log('saved', k); }
  }
} catch (e) { console.log('ERR', e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
