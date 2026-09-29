// 标题字（透明底 PNG）：用游戏自己画标题的那一套——像素字体、金色色带、墨色八向描边（src/mc-pj-ui.js 的 M.UI.text），
// 和开场菜单里的「午夜机台 / MIDNIGHT CABINET」一模一样，只是画得更大。
//   node logo.mjs <输出文件夹>   → logo.png（1280×720，Steam 资料库标志）、logo_demo.png（带「试玩版」牌子）、
//                                  title_wide.png / title_wide_demo.png（裁掉空白的横版，给封面叠字用）、
//                                  library_logo.png / library_logo_demo.png（裁掉空白，约 1280 宽：Steam 资料库标志）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHROME_BIN } from './chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..', '..');
const OUT = path.resolve(process.argv[2] || '.'), PORT = 9620;
const prof = path.join(os.tmpdir(), 'mc-logo-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME_BIN(), ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 600)); return r.result.value; };

const DRAW = `(async () => {
  await document.fonts.ready;
  const U = MC.UI, E = PCD.createEngine({ game: true }).E, PAL = E.PAL;
  // one title: 午夜机台 in the game's gold ramp, MIDNIGHT CABINET spaced under it, an optional 试玩版 plate
  const title = (w, h, size, demo, trim) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const ch = [...'午夜机台'], gap = Math.round(size * 0.08), u = Math.max(3, Math.round(size / 26));
    const cw = ch.map(s => U.measure(x, s, size)); const tw = cw.reduce((a, b) => a + b, 0) + gap * (ch.length - 1);
    const cy = h / 2 - size * (demo ? 0.36 : 0.2); let px = w / 2 - tw / 2;
    ch.forEach((s, i) => { U.text(x, s, px + cw[i] / 2, cy, size, null, { ramp: true, outline: true, u }); px += cw[i] + gap; });
    const ss = Math.max(18, Math.round(size * 0.2 / 2) * 2), sg = Math.round(ss * 0.35), sc = [...'MIDNIGHT CABINET'], sw = sc.map(s => U.measure(x, s, ss, true));
    let qx = w / 2 - (sw.reduce((a, b) => a + b, 0) + sg * (sc.length - 1)) / 2; const sy = cy + size * 0.78;
    sc.forEach((s, i) => { U.text(x, s, qx + sw[i] / 2, sy, ss, PAL[63], { num: true, outline: true, u: Math.max(2, Math.round(u * 0.6)) }); qx += sw[i] + sg; });
    // the demo's plate: the game's own wine-red sign (M.UI.tab), as on its panels
    if (demo) { const ts = Math.round(size * 0.3 / 2) * 2; x.save(); x.translate(0, 0); U.tab(x, '试玩版 · DEMO', w / 2, sy + ss * 0.95, { kind: 'wine', size: ts, align: 'center' }); x.restore(); }
    if (!trim) return c.toDataURL('image/png');
    const d = x.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 8) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, -x0, -y0); return o.toDataURL('image/png');
  };
  return { logo: title(1280, 720, 240, false), logo_demo: title(1280, 720, 228, true), title_wide: title(2400, 1000, 360, false, true), title_wide_demo: title(2400, 1100, 360, true, true),
    library_logo: title(2400, 1000, 300, false, true), library_logo_demo: title(2400, 1100, 300, true, true) };
})()`;

try {
  let tgt; for (let i = 0; i < 50 && !tgt; i++) { await wait(200); try { tgt = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Page.enable'); await send('Page.navigate', { url: pathToFileURL(path.join(REPO, 'index.html')).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.MC && window.MC.UI && window.PCD && window.MC_ALL_READY)')) break; } catch (e) {} }
  const r = await ev(DRAW); fs.mkdirSync(OUT, { recursive: true });
  for (const k in r) { fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(r[k].split(',')[1], 'base64')); console.log('saved', path.join(OUT, k + '.png')); }
} catch (e) { console.log('ERR', e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
