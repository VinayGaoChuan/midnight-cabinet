// 预告片的字幕卡和片尾卡：游戏自己的字（M.UI.text：像素字体、墨色描边），透明底 1920×1080 PNG，叠在实机画面上。
//   node cards.mjs <输出文件夹> '<JSON：[{ "n": 文件名, "zh": 中文, "en": 英文 }, …]>'
//   CARD_LANG=en node cards.mjs …：英文版（字幕只写英文、片尾的字也是英文），给英文商店页的预告片
//   CARD_LANG=<语言代码> node cards.mjs <输出文件夹> <字幕.json>：任意语言。字幕.json = { "cards": [{ "n": "c1", "zh-CN": …, "en": …, "fr": … }],
//     "end": { "<语言>": { "demo": 试玩版一句, "wish": 愿望单按钮, "sub": 按钮下的小字 } } }；中文、繁中、日文是大字加一行小号英文，其余语言只写这门语言
// 另外总会画 end.png（片尾：标题 + 加入愿望单）和 end_demo.png（片尾：标题 + 免费试玩版 + 加入愿望单）。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHROME_BIN } from './chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '..', '..', '..');
const OUT = path.resolve(process.argv[2]), ARG = process.argv[3] || '[]', PORT = 9622;
// the captions: an inline list (「zh」「en」) or a file with every language
const SPEC = ARG.trim().startsWith('[') ? { cards: JSON.parse(ARG).map(k => Object.assign({ 'zh-CN': k.zh }, k)) } : JSON.parse(fs.readFileSync(path.resolve(ARG), 'utf8'));
const LANG = process.env.CARD_LANG || 'zh-CN', CJK = /^(zh-CN|zh-TW|ja)$/.test(LANG);
const END0 = { 'zh-CN': { demo: '免费试玩版 现已推出', wish: '加入愿望单', sub: 'WISHLIST ON STEAM' }, en: { demo: 'Free demo out now', wish: 'Wishlist now', sub: 'WISHLIST ON STEAM' } };
const END = Object.assign({}, END0.en, (SPEC.end || {})[LANG] || END0[LANG] || {});
const CARDS = SPEC.cards.map(k => ({ n: k.n, t: k[LANG] || k.en, en: k.en }));
const prof = path.join(os.tmpdir(), 'mc-cards-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME_BIN(), ['--headless=new', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result.value; };
const logo = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const DRAW = (cards, L, EN, CJK, END) => `(async () => {
  await document.fonts.ready;
  if (window.__i18nSet) window.__i18nSet('zh-CN');   // the cards write their own words in each language: the game's translation stays out of it
  const EN = ${EN ? 'true' : 'false'}, CJK = ${CJK ? 'true' : 'false'}, END = ${JSON.stringify(END)};
  const U = MC.UI, PAL = PCD.createEngine({ game: true }).E.PAL, out = {};
  const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = ${JSON.stringify(L)}; });
  // the cards write their own words: the canvas's own text functions (kept before the game hooked them for its translation) draw them
  const CPT = CanvasRenderingContext2D.prototype; if (window.__cp0) { CPT.fillText = __cp0.f; CPT.strokeText = __cp0.s; CPT.measureText = __cp0.m; }
  const cv = () => { const c = document.createElement('canvas'); c.width = 1920; c.height = 1080; return c; };
  const spaced = (x, s, cx, y, size, col, gap) => { const cs = [...s], w = cs.map(c => U.measure(x, c, size, true)); let px = cx - (w.reduce((a, b) => a + b, 0) + gap * (cs.length - 1)) / 2; cs.forEach((c, i) => { U.text(x, c, px + w[i] / 2, y, size, col, { num: true, outline: true, u: 3 }); px += w[i] + gap; }); };
  // a caption: the Chinese line big over a soft dark band at the bottom, the English one small under it
  for (const k of ${JSON.stringify(cards)}) {
    const c = cv(), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 780, 0, 1080); g.addColorStop(0, 'rgba(8,6,20,0)'); g.addColorStop(0.55, 'rgba(8,6,20,0.55)'); g.addColorStop(1, 'rgba(8,6,20,0.7)'); x.fillStyle = g; x.fillRect(0, 780, 1920, 300);
    if (!CJK) U.text(x, k.t, 960, 920, 72, null, { ramp: true, outline: true, u: 6 });
    else { U.text(x, k.t, 960, 900, 84, null, { ramp: true, outline: true, u: 6 }); if (k.en) spaced(x, k.en.toUpperCase(), 960, 980, 26, PAL[63], 6); }
    out[k.n] = c.toDataURL('image/png');
  }
  // the end: the title, then the ask
  for (const demo of [false, true]) {
    const c = cv(), x = c.getContext('2d'); x.fillStyle = '#0d0a1c'; x.fillRect(0, 0, 1920, 1080);
    const rg = x.createRadialGradient(960, 420, 60, 960, 420, 900); rg.addColorStop(0, 'rgba(70,40,120,0.55)'); rg.addColorStop(1, 'rgba(13,10,28,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1920, 1080);
    // the two-line letters logo is taller: narrower
    const lw = img.height / img.width > 0.3 ? 860 : 1180, lh = img.height * lw / img.width; x.imageSmoothingEnabled = false; x.drawImage(img, 960 - lw / 2, 360 - lh / 2, lw, lh);
    if (demo && !CJK) U.text(x, END.demo, 960, 650, 56, PAL[63] || '#ff9fb0', { outline: true, u: 4 });
    else if (demo) { U.text(x, END.demo, 960, 640, 56, PAL[63] || '#ff9fb0', { outline: true, u: 4 }); spaced(x, 'FREE DEMO OUT NOW', 960, 705, 24, '#cfc8ff', 6); }
    const ty = demo ? 790 : 700; U.tab(x, END.wish, 960, ty, { kind: 'gold', size: 64, align: 'center' });
    // Arabic letters join and Thai marks sit on their letters: drawn letter by letter they fall apart, so those lines go in one piece
    const sub = (END.sub || 'WISHLIST ON STEAM').toUpperCase();
    if (/[\u0600-\u06FF\u0E00-\u0E7F]/.test(sub)) U.text(x, sub, 960, ty + 150, 26, '#cfc8ff', { outline: true, u: 2 }); else spaced(x, sub, 960, ty + 150, 26, '#cfc8ff', 6);
    out[demo ? 'end_demo' : 'end'] = c.toDataURL('image/png');
  }
  return out;
})()`;

try {
  let tgt; for (let i = 0; i < 50 && !tgt; i++) { await wait(200); try { tgt = (await (await fetch('http://127.0.0.1:' + PORT + '/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__cp0 = { f: CanvasRenderingContext2D.prototype.fillText, s: CanvasRenderingContext2D.prototype.strokeText, m: CanvasRenderingContext2D.prototype.measureText };' });
  await send('Page.navigate', { url: pathToFileURL(path.join(REPO, 'index.html')).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.MC && window.MC.UI && window.PCD && window.MC_ALL_READY)')) break; } catch (e) {} }
  const L = logo(process.env.LOGO || path.join(OUT, '..', 'logo', 'title_wide.png'));
  const r = await ev(DRAW(CARDS, L, LANG === 'en', CJK, END)); fs.mkdirSync(OUT, { recursive: true });
  for (const k in r) { fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(r[k].split(',')[1], 'base64')); console.log('saved', k); }
} catch (e) { console.log('ERR', e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
