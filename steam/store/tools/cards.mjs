// 预告片的字幕卡和片尾卡：游戏自己的字（M.UI.text：像素字体、墨色描边），透明底 1920×1080 PNG，叠在实机画面上。
//   node cards.mjs <输出文件夹> '<JSON：[{ "n": 文件名, "zh": 中文, "en": 英文 }, …]>'
// 另外总会画 end.png（片尾：标题 + 加入愿望单）和 end_demo.png（片尾：标题 + 免费试玩版 + 加入愿望单）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHROME_BIN } from './chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..', '..');
const OUT = path.resolve(process.argv[2]), CARDS = JSON.parse(process.argv[3] || '[]'), PORT = 9622;
const prof = path.join(os.tmpdir(), 'mc-cards-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME_BIN(), ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };
const logo = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const DRAW = (cards, L) => `(async () => {
  await document.fonts.ready;
  const U = MC.UI, PAL = PCD.createEngine({ game: true }).E.PAL, out = {};
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = ${JSON.stringify(L)}; });
  const cv = () => { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; return c; };
  const spaced = (x, s, cx, y, size, col, gap) => { const cs = [...s], w = cs.map(c => U.measure(x, c, size, true)); let px = cx - (w.reduce((a, b) => a + b, 0) + gap * (cs.length - 1)) / 2; cs.forEach((c, i) => { U.text(x, c, px + w[i] / 2, y, size, col, { num: true, outline: true, u: 3 }); px += w[i] + gap; }); };
  // a caption: the Chinese line big over a soft dark band at the bottom, the English one small under it
  for (const k of ${JSON.stringify(cards)}) {
    const c = cv(), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 780, 0, 1080); g.addColorStop(0, 'rgba(8,6,20,0)'); g.addColorStop(0.55, 'rgba(8,6,20,0.55)'); g.addColorStop(1, 'rgba(8,6,20,0.7)'); x.fillStyle = g; x.fillRect(0, 780, 1920, 300);
    U.text(x, k.zh, 960, 900, 84, null, { ramp: true, outline: true, u: 6 });
    if (k.en) spaced(x, k.en.toUpperCase(), 960, 980, 26, PAL[63], 6);
    out[k.n] = c.toDataURL('image/png');
  }
  // the end: the title, then the ask
  for (const demo of [false, true]) {
    const c = cv(), x = c.getContext('2d'); x.fillStyle = '#0d0a1c'; x.fillRect(0, 0, 1920, 1080);
    const rg = x.createRadialGradient(960, 420, 60, 960, 420, 900); rg.addColorStop(0, 'rgba(70,40,120,0.55)'); rg.addColorStop(1, 'rgba(13,10,28,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1920, 1080);
    const lw = 1180, lh = img.height * lw / img.width; x.imageSmoothingEnabled = false; x.drawImage(img, 960 - lw / 2, 360 - lh / 2, lw, lh);
    if (demo) { U.text(x, '免费试玩版 现已推出', 960, 640, 56, PAL[63] || '#ff9fb0', { outline: true, u: 4 }); spaced(x, 'FREE DEMO OUT NOW', 960, 705, 24, '#cfc8ff', 6); }
    const ty = demo ? 790 : 700; U.tab(x, '加入愿望单', 960, ty, { kind: 'gold', size: 64, align: 'center' });
    spaced(x, 'WISHLIST ON STEAM', 960, ty + 150, 26, '#cfc8ff', 6);
    out[demo ? 'end_demo' : 'end'] = c.toDataURL('image/png');
  }
  return out;
})()`;

try {
  let tgt; for (let i = 0; i < 50 && !tgt; i++) { await wait(200); try { tgt = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Page.enable'); await send('Page.navigate', { url: pathToFileURL(path.join(REPO, 'index.html')).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.MC && window.MC.UI && window.PCD && window.MC_ALL_READY)')) break; } catch (e) {} }
  const L = logo(process.env.LOGO || path.join(OUT, '..', 'logo', 'title_wide.png'));
  const r = await ev(DRAW(CARDS, L)); fs.mkdirSync(OUT, { recursive: true });
  for (const k in r) { fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(r[k].split(',')[1], 'base64')); console.log('saved', k); }
} catch (e) { console.log('ERR', e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
