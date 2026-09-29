// 商店素材录制：无头 Chrome 打开游戏包，时钟换成 vclock.js 的，机器人（tools/bot.js）按真人的节奏玩，
// 每 1/30 秒游戏时间截一帧，配上游戏自己离线渲染的声音，得到一段帧率严格的 1920×1080 录像。
//
//   node rec.mjs prep --html <游戏包.html> --days <N> --out <存档.json> [--seed n]
//        机器人快进玩到第 N 天白天，把存档（localStorage）存下来，给录制当起点
//   node rec.mjs rec --html <游戏包.html> [--save <存档.json>] --secs <秒> --out <文件夹> [--opts '<JSON>'] [--png <每几帧一张>] [--hide 点击跳过,…]
//        从存档（或全新开始）录 N 秒：<文件夹>/video.mp4（无声）、audio.wav、final.mp4（有声）、png/（原画截图）、log.jsonl（每帧在干什么）
//   node rec.mjs stills --at <秒,秒,…> --out <文件夹> [--save …] [--dsf 2] [--hide 点击跳过,…]
//        同样的玩法，只在给定的时刻各截一张 PNG（--dsf 2 = 3840×2160，给封面裁图用）
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHROME_BIN } from './chrome.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2), MODE = argv[0];
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const HTML = path.resolve(arg('html', path.join(REPO, 'steam/demo/放游戏包/午夜机台-试玩版.html')));
const PORT = +arg('port', 9610), W = 1920, H = 1080, FPS = 30;

const CHROME = CHROME_BIN();
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const prof = path.join(os.tmpdir(), 'mc-rec-profile-' + PORT);
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--mute-audio', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT,
  '--window-size=' + W + ',' + H, '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr, ms = 900000) => { const r = await Promise.race([send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: ms }), new Promise((_, no) => setTimeout(() => no(new Error('page not answering')), ms + 5000))]); if (r.exceptionDetails) throw new Error('page: ' + JSON.stringify(r.exceptionDetails).slice(0, 800)); return r.result && r.result.value; };

// the bot at a player's pace: in real mode (window.__botReal) it never fast-forwards the game itself — the clock does that — and it
// lets each moment stay on screen a while before it clicks on (DWELL, ms of game time)
function director() {
  let src = fs.readFileSync(path.join(REPO, 'tools/bot.js'), 'utf8');
  const n0 = (src.match(/g\.tick\(1 \/ 30\)/g) || []).length;
  src = src.replace(/g\.tick\(1 \/ 30\)/g, '(window.__botReal || g.tick(1 / 30))').replace(/b\.step\(1 \/ 30\)/g, '(window.__botReal || b.step(1 / 30))');
  const hook = "    const s = g.screen;\n";
  if (!src.includes(hook) || n0 < 5) throw new Error('tools/bot.js changed: the director cannot hook it');
  // a player clicks through the title and inserts the coin (the bot skips both)
  const intro = "if (s === 'intro') g.toMenu();", menu = "else if (s === 'menu') g.startGame();";
  if (!src.includes(intro) || !src.includes(menu)) throw new Error('tools/bot.js changed: intro / menu');
  src = src.replace(intro, "if (s === 'intro') (window.__botReal ? (g.intro && g.intro.started ? 0 : g.introClick()) : g.toMenu());").replace(menu, "else if (s === 'menu') (window.__botReal ? g.menuGo() : g.startGame());");
  // at a player's pace every step waits a little: several of the bot's branches `continue` straight on, expecting the game to have moved
  // on synchronously (it does when the bot ticks it itself) — in real time that spun forever and froze the page
  const top = "    steps++;\n";
  if (!src.includes(top)) throw new Error('tools/bot.js changed: steps++');
  src = src.replace(top, top + "    if (window.__botReal) await sleep(40);\n");
  src = src.replace(hook, hook + "    if (window.__botReal) { const key = window.__recKey(g); if (key !== window.__bk) { window.__bk = key; window.__bkT = performance.now(); } const dw = (window.__DWELL || {})[key.split('|')[0]] || 0; if (performance.now() - window.__bkT < dw) { await sleep(60); continue; } }\n");
  return src;
}
const KEYFN = `window.__recKey = (g) => g.evoFx ? 'evo' : g.parade ? 'parade' : g.storyFx ? 'story' : g.bigFx ? 'big' : g.swapFx ? 'swap' : g.chest ? 'chest' : g.reel ? 'reel' : g.settle ? 'settle' : g.mini ? 'mini|' + g.mini.kind : g.modal ? 'modal|' + (g.modal.title || '') : g.visit ? 'visit' : g.dirPick ? 'dir' : g.bpPick ? 'bp' : g.lvPick ? 'lv' : g.relPick ? 'rel' : (g.gaActive && g.gaActive()) ? 'gacha' : g.night ? 'night|' + (g.night.ph || '') : g.screen;
window.__recState = () => { const g = window.__mcg, b = g.battle; return { s: window.__recKey(g), day: g.meta && g.meta.day, node: g.node && g.screen === 'battle' ? g.node.type : undefined, fever: !!(b && b.fever && b.fever.on), raid: g.screen === 'raid' || undefined, over: b ? !!b.over : undefined, banner: (g.banners || []).map(x => x.text).join(' ') || undefined }; };`;
// --hide: page text that is not part of the picture (the opening's 「点击跳过」)
const HIDE = () => `(() => { const H = ${JSON.stringify(arg('hide').split(','))}; document.querySelectorAll('div,span').forEach(e => { if (e.children.length === 0 && H.includes((e.textContent || '').trim())) e.style.visibility = 'hidden'; }); return true; })()`;
const DWELL = { intro: 5000, menu: 2500, room: 2500, evo: 3600, parade: 5200, story: 2600, big: 3000, swap: 2200, chest: 2600, reel: 3200, settle: 2600, mini: 1400, modal: 1800, visit: 1800, dir: 2200, bp: 2200, lv: 2000, rel: 2200, gacha: 3200, shop: 3600, end: 3500 };

async function open(seed) {
  let tgt; for (let i = 0; i < 60 && !tgt; i++) { await wait(200); try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); tgt = l.find(t => t.type === 'page'); } catch (e) {} }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: +arg('dsf', 1), mobile: false });
  await send('Page.enable'); await send('Runtime.enable'); await send('Animation.enable');
  const cfg = { audioSecs: MODE === 'rec' ? +arg('secs', 60) + 30 : 0 };
  let pre = 'window.__VT_CFG = ' + JSON.stringify(cfg) + ';\n';
  // the save to start from goes in before the game reads it (once: a reload by the game itself keeps what it wrote)
  if (seed) pre += `try { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); const S = ${JSON.stringify(seed)}; for (const k in S) localStorage.setItem(k, S[k]); sessionStorage.setItem('__seeded', '1'); } } catch (e) {}\n`;
  else pre += `try { if (!sessionStorage.getItem('__seeded')) { localStorage.clear(); sessionStorage.setItem('__seeded', '1'); } } catch (e) {}\n`;
  if (arg('seed')) pre += `(() => { let s = ${+arg('seed')} >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();\n`;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: pre + fs.readFileSync(path.join(HERE, 'vclock.js'), 'utf8') });
  await send('Page.navigate', { url: pathToFileURL(HTML).href });
  for (let i = 0; i < 240; i++) { await wait(500); try { if (await ev('!!(window.__mcg && window.MC && window.MC_ALL_READY)') === true) break; } catch (e) {} }
  await wait(1500);
  await ev(director() + ';\n' + KEYFN + '; true');
}

async function prep() {
  const out = path.resolve(arg('out')), days = +arg('days', 5);
  await open(null);
  const opts = Object.assign({ fast: true, buy: true, extract: true }, JSON.parse(arg('opts', '{}')));
  await ev(`window.__botStop = false; window.__prepRes = null; window.__bot(3600, ${JSON.stringify(opts)}).then(r => window.__prepRes = r); true`);
  const T0 = Date.now(); let last = '';
  while (Date.now() - T0 < 50 * 60e3) {
    await wait(2000);
    const st = await ev(`(() => { const g = window.__mcg; return { day: g.meta.day, s: g.screen, res: !!window.__prepRes, core: g.meta.core, run: !!g.run }; })()`);
    const line = JSON.stringify(st); if (line !== last) { console.log(Math.round((Date.now() - T0) / 1000) + 's', line); last = line; }
    if (st.res) { console.log('bot ended', JSON.stringify(await ev('window.__prepRes')).slice(0, 600)); break; }
    if (st.day >= days && st.s === 'base' && !st.run) { await ev('window.__botStop = true; true'); await wait(1500); break; }
  }
  const save = await ev(`(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; })()`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(save));
  console.log('saved', out, Object.keys(save).join(', '));
}

async function rec() {
  const out = path.resolve(arg('out')), secs = +arg('secs', 60), pngEvery = +arg('png', 45), N = Math.round(secs * FPS);
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(out, 'png'), { recursive: true });
  const seed = arg('save') ? JSON.parse(fs.readFileSync(path.resolve(arg('save')), 'utf8')) : null;
  await open(seed);
  const opts = Object.assign({ sleep: 50, buy: true, extract: true }, JSON.parse(arg('opts', '{}')));
  const dwell = Object.assign({}, DWELL, JSON.parse(arg('dwell', '{}')));
  // from here on the game's time moves only frame by frame
  const t0 = await ev(`window.__vt.setManual(true)`);
  await ev(`window.__botReal = true; window.__DWELL = ${JSON.stringify(dwell)}; window.__botStop = false; window.__recRes = null; window.__bot(1e6, ${JSON.stringify(opts)}).then(r => window.__recRes = r, e => window.__recRes = { err: String(e) }); true`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', path.join(out, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const log = fs.createWriteStream(path.join(out, 'log.jsonl'));
  const settle = `new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => { const d = new MessageChannel(); d.port1.onmessage = () => r(window.__recState()); d.port2.postMessage(0); }; c.port2.postMessage(0); })`;
  let rate = 1, tr = Date.now(), last = '';
  for (let f = 0; f < N; f++) {
    let st; try { st = await ev(`window.__vt.step(1000 / ${FPS}); ${settle}`, 30000); } catch (e) { console.log('STOP at frame', f, e.message); break; }
    if (arg('hide') && f % 5 === 0) await ev(HIDE());
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 94, captureBeyondViewport: false });
    const buf = Buffer.from(shot.data, 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (pngEvery && f % pngEvery === 0) { const p = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(out, 'png', 'f' + String(f).padStart(5, '0') + '.png'), Buffer.from(p.data, 'base64')); }
    st.f = f; log.write(JSON.stringify(st) + '\n');
    const line = st.s + ' d' + st.day + (st.node ? ' ' + st.node : '') + (st.fever ? ' FEVER' : '');
    if (line !== last) { console.log((f / FPS).toFixed(1) + 's', line); last = line; }
    // CSS animations follow the page's clock only roughly: slow them to the capture speed
    if (f % 15 === 14) { const ms = (Date.now() - tr) / 15; tr = Date.now(); const r2 = Math.max(0.05, Math.min(1, (1000 / FPS) / ms)); if (Math.abs(r2 - rate) > 0.03) { rate = r2; await send('Animation.setPlaybackRate', { playbackRate: rate }); } }
    if (f % 300 === 299) console.log('  frame', f + 1, '/', N);
    const res = await ev('window.__recRes'); if (res) { console.log('bot ended', JSON.stringify(res).slice(0, 400)); break; }
  }
  await ev('window.__botStop = true; true');
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); log.end();
  const a = await ev('window.__vt.renderWav ? window.__vt.renderWav() : null');
  if (a && a.bytes) {
    const fd = fs.openSync(path.join(out, 'audio.wav'), 'w'), CH = 6 * 1024 * 1024;
    for (let o = 0; o < a.bytes; o += CH) fs.writeSync(fd, Buffer.from(await ev(`window.__vt.wavPart(${o}, ${CH})`), 'base64'));
    fs.closeSync(fd);
    const lead = Math.max(0, (a.t0 - t0) / 1000);   // the sound starts when the game first asked for it
    fs.writeFileSync(path.join(out, 'audio.json'), JSON.stringify({ lead }));
    await new Promise(r => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', path.join(out, 'video.mp4'), '-itsoffset', String(lead), '-i', path.join(out, 'audio.wav'), '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', path.join(out, 'final.mp4')], { stdio: 'inherit' }).on('close', r));
    console.log('audio lead', lead.toFixed(3), 's');
  } else console.log('no audio: the game never started its sound');
  console.log('done', out);
}

async function stills() {
  const out = path.resolve(arg('out')); fs.mkdirSync(out, { recursive: true });
  const at = arg('at').split(',').map(Number).sort((a, b) => a - b), end = at[at.length - 1];
  const seed = arg('save') ? JSON.parse(fs.readFileSync(path.resolve(arg('save')), 'utf8')) : null;
  await open(seed);
  const opts = Object.assign({ sleep: 50, buy: true, extract: true }, JSON.parse(arg('opts', '{}'))), dwell = Object.assign({}, DWELL, JSON.parse(arg('dwell', '{}')));
  await ev(`window.__vt.setManual(true)`);
  await ev(`window.__botReal = true; window.__DWELL = ${JSON.stringify(dwell)}; window.__botStop = false; window.__bot(1e6, ${JSON.stringify(opts)}); true`);
  const settle = `new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => { const d = new MessageChannel(); d.port1.onmessage = () => r(window.__recState()); d.port2.postMessage(0); }; c.port2.postMessage(0); })`;
  let k = 0;
  for (let f = 0; f <= Math.round(end * FPS) && k < at.length; f++) {
    const st = await ev(`window.__vt.step(1000 / ${FPS}); ${settle}`);
    // --hide: page text that is not part of the picture (the opening's 「点击跳过」) goes before the shot
    if (arg('hide') && k < at.length && f >= Math.round(at[k] * FPS)) await ev(HIDE());
    while (k < at.length && f >= Math.round(at[k] * FPS)) { const p = await send('Page.captureScreenshot', { format: 'png' }); const n = 't' + at[k].toFixed(2).padStart(6, '0') + '.png'; fs.writeFileSync(path.join(out, n), Buffer.from(p.data, 'base64')); console.log(n, st.s); k++; }
  }
}

try { if (MODE === 'prep') await prep(); else if (MODE === 'rec') await rec(); else if (MODE === 'stills') await stills(); else console.log('usage: see the header'); }
catch (e) { console.log('ERR', e && e.stack || e); }
finally { try { ws && ws.close(); } catch (e) {} chrome.kill('SIGKILL'); await wait(400); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
