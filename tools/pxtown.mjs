// Pixel town shots (dev tool for src/mc-pxtown.js): one headless Chrome over a local http server (designcheck fetches the doc).
//   node tools/pxtown.mjs sheet  [--out dir]     → <out>/pxtown-<key>.png: every stage, the site, the back streets, the show key frames
//   node tools/pxtown.mjs city   [--out dir]     → <out>/city-old.png and city-new.png: the same city, the same camera, switch off / on
//   node tools/pxtown.mjs check                  → bot.js (viewErrs) and __designCheck(), switch off and on; frame time of the base
//   env CHROME: the Chrome to use
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const MODE = process.argv[2] || 'sheet', OUT = path.resolve(arg('out', path.join(ROOT, '.ai', 'pxtown'))), PORT = +arg('port', 9731), HP = PORT + 1;
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const KEYS = (arg('keys', 'smithy,hospital,altar,generator,ballista,lighthouse')).split(',');
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.md': 'text/markdown; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); }).listen(HP);
const prof = path.join(os.tmpdir(), 'mc-pxtown-' + PORT); fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--user-data-dir=' + prof, '--remote-debugging-port=' + PORT, '--window-size=1600,900', 'about:blank'], { stdio: 'ignore' });
let ws, id = 0; const pend = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr, to) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: to || 120000 }); if (r.exceptionDetails) return 'EXC ' + JSON.stringify(r.exceptionDetails).slice(0, 600); return r.result && r.result.value; };
async function open(q) {
  await send('Page.navigate', { url: 'http://127.0.0.1:' + HP + '/index.html' + (q || '') });
  for (let i = 0; i < 240; i++) { await wait(500); if (await ev('!!(window.__mcg && window.MC && window.MC_ALL_READY)') === true) break; }
}
const shot = async (file, clip) => { const r = await send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {})); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; };
const saveUrl = (file, url) => { fs.writeFileSync(file, Buffer.from(String(url).split(',')[1], 'base64')); return file; };
// a city: the pilot six and some others underground, 繁荣 at the given level, the lighthouse as a wonder; the base screen, home camera
const CITY = (lv) => `(async () => { const g = __mcg, M = MC; if (!g.meta) g.newGame(); const m = g.meta, B = M.BUILDINGS;
  const keys = ['smithy', 'hospital', 'altar', 'generator', 'ballista', 'farm', 'training', 'storage', 'pool', 'vault', 'library', 'cannon', 'tesla', 'spire', 'lookout', 'venice', 'ruhr', 'gardens'].filter(k => B[k]);
  let i = 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b === 'core') continue; x.dug = 1; x.open = 1; x.job = null; x.ruin = 0; x.b = keys[i++ % keys.length]; }
  m.prosLv = M.prosLvOf ? M.prosLvOf(M.prosperity(m)) : ${lv}; m.wonders = ['lighthouse']; m.wonderV = 1; m.dirOwe = 0; m.prosUp = null; g.dirPick = null; g.expand = null; g.town = null; g.go('base'); g.townSync(true); if (g.bv && g.bv.home) g.bv.home(); if (g.bv) { g.bv.x = g.bv.tx; g.bv.y = g.bv.ty; g.bv.z = g.bv.tz; }
  await new Promise(r => setTimeout(r, 8000)); return JSON.stringify({ n: i, span: M.townSpan, z: g.bv && g.bv.z }); })()`;
try {
  let tgt; for (let i = 0; i < 80 && !tgt; i++) { await wait(250); try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json')).json(); tgt = l.find(t => t.type === 'page'); } catch (e) { /* not up yet */ } }
  ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d); pend.delete(d.id); } });
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  if (MODE === 'stages') {
    // one image for a group: every building a row of its three stages on the near street (wonders: far, in their haze), two buildings a row
    await open('?pxtown=1');
    const url = await ev(`(() => { const M = MC, PT = M.PXTOWN, SC = 3, keys = ${JSON.stringify(KEYS)}.filter(k => PT.ART[k] || (PT.auto && PT.auto(k))); let n = 0;
      const cell = (key, st) => { const far = !!(M.WONDER_Y && M.townRole && !M.BUILDINGS[key]) || key === 'lighthouse' || (PT.ART[key] && PT.ART[key].wonder), sc = far ? 1.4 : 0.84, f = M.townFoot(key), CW = Math.round(f.w * sc / 2) + 44, CH = Math.round(f.h * sc / 2) + 50, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const x = cv.getContext('2d'), T1 = 20 + (++n) * 9;
        PT.stageForce = st; const v = { key, k: 'st' + n, x: 0, y: 0, sc, dk: far ? 0.26 : 0.06, B: { q: 1 }, w: f.w, h: f.h, pxSt: st };
        for (let t = T1 - 1.5; t <= T1 + 1e-6; t += 1 / 30) { x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#12132e'; x.fillRect(0, 0, CW, CH); x.fillStyle = '#1a1d45'; x.fillRect(0, CH - 10, CW, 10); x.setTransform(0.5, 0, 0, 0.5, CW / 2, CH - 10); x.imageSmoothingEnabled = false; PT.draw(x, v, t, null, null); }
        PT.stageForce = null; return cv; };
      const cells = keys.map(k => [0, 1, 2].map(st => cell(k, st))), fw = Math.max(...cells.flat().map(c => c.width)), fh = Math.max(...cells.flat().map(c => c.height)), gp = 4, per = 2, rows = Math.ceil(cells.length / per);
      const cv = document.createElement('canvas'); cv.width = (fw * SC + gp) * 3 * per + gp * per; cv.height = (fh * SC + gp) * rows + gp; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#07060f'; x.fillRect(0, 0, cv.width, cv.height);
      cells.forEach((r, i) => r.forEach((c, j) => { const ox = gp + (i % per) * ((fw * SC + gp) * 3 + gp) + j * (fw * SC + gp), oy = gp + Math.floor(i / per) * (fh * SC + gp); x.drawImage(c, ox + (fw - c.width) * SC / 2, oy + (fh - c.height) * SC, c.width * SC, c.height * SC); }));
      x.font = '20px monospace'; x.fillStyle = '#ffd06a'; keys.forEach((k, i) => x.fillText(k + ' · ' + ((M.BUILDINGS[k] || {}).n || k), gp + (i % per) * ((fw * SC + gp) * 3 + gp) + 8, gp + Math.floor(i / per) * (fh * SC + gp) + 24));
      return cv.toDataURL('image/png'); })()`);
    if (typeof url !== 'string' || !url.startsWith('data:')) console.log('ERR', String(url).slice(0, 600)); else console.log(saveUrl(path.join(OUT, 'stages-' + arg('name', 'group') + '.png'), url));
  } else if (MODE === 'sheet') {
    await open('?pxtown=1');
    for (const key of KEYS) {
      const url = await ev(`(() => { const M = MC, PT = M.PXTOWN, SC = 3, key = '${key}', far = key === 'lighthouse', f = M.townFoot(key); let n = 0;
        // one moment through the game's own draw (squash, flash, rings, rays, debris, beam included): o = { sc, dk, stage, prog, rise: age, up: age }
        const cell = (o) => { const sc = o.sc, CW = Math.round(f.w * sc / 2) + 110, CH = Math.round(f.h * sc / 2) + 110, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const x = cv.getContext('2d');
          const site = o.stage === 'site', T1 = 20 + (++n) * 9; PT.stageForce = site ? 0 : o.stage;
          const v = { key, k: 'sheet' + n, x: 0, y: 0, sc, dk: o.dk || 0, B: { q: o.q || 0 }, w: f.w, h: f.h, site, prog: o.prog || 0 };
          if (o.rise != null) v.riseT = T1 - o.rise; if (o.up != null) { v.pxSt = o.stage; v.upT = T1 - o.up; v.upFrom = o.stage - 1; v.upSnd = 1; }
          const t0 = Math.min(T1 - 1.2, (v.riseT != null ? v.riseT : v.upT != null ? v.upT : T1) - 0.05);
          for (let t = t0; t <= T1 + 1e-6; t += 1 / 30) { x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#12132e'; x.fillRect(0, 0, CW, CH); x.setTransform(0.5, 0, 0, 0.5, CW / 2, CH - 14); x.imageSmoothingEnabled = false; PT.draw(x, v, t, null, null); }
          PT.stageForce = null; return cv; };
        const s0 = far ? 1.4 : 0.84, rows = [];
        rows.push([0, 1, 2].map(st => cell({ sc: s0, stage: st, dk: far ? 0.26 : 0.06 })).concat([0.3, 0.75].map(p => cell({ sc: s0, stage: 'site', prog: p }))));
        rows.push((far ? [[1.4, 0.26, 0], [1.4, 0.26, 1]] : [[0.84, 0.06, 2], [0.7, 0.2, 2], [0.58, 0.34, 2]]).map(([sc, dk, st]) => cell({ sc, dk, stage: st })));
        rows.push([0.2, 0.7, 1.03, 1.3, 1.9].map(a => cell({ sc: s0, stage: 0, rise: a, q: 1 })));
        rows.push([0.3, 0.47, 0.75, 1.3].map(a => cell({ sc: s0, stage: 2, up: a, q: 1 })));
        const fw = Math.max(...rows.flat().map(c => c.width)), fh = Math.max(...rows.flat().map(c => c.height)), gp = 4, nc = Math.max(...rows.map(r => r.length));
        const cv = document.createElement('canvas'); cv.width = (fw * SC + gp) * nc + gp; cv.height = (fh * SC + gp) * rows.length + gp; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#07060f'; x.fillRect(0, 0, cv.width, cv.height);
        rows.forEach((r, ri) => r.forEach((c, ci) => x.drawImage(c, gp + ci * (fw * SC + gp) + (fw - c.width) * SC / 2, gp + ri * (fh * SC + gp) + (fh - c.height) * SC, c.width * SC, c.height * SC)));
        return cv.toDataURL('image/png'); })()`);
      if (typeof url !== 'string' || !url.startsWith('data:')) { console.log(key, 'ERR', String(url).slice(0, 400)); continue; }
      console.log(saveUrl(path.join(OUT, 'pxtown-' + key + '.png'), url));
    }
  } else if (MODE === 'city') {
    const lv = +arg('lv', 5);
    for (const [q, name] of [['', 'old'], ['?pxtown=1', 'new']]) {
      await open(q); console.log(name, await ev(CITY(lv)));
      console.log(await shot(path.join(OUT, 'city-' + name + '-wide.png'), { x: 0, y: 105, width: 1600, height: 240 }));
      // close: the camera on the streets just right of the main base
      await ev(`(async () => { const g = __mcg, b = g.bv, X = MC.BASE_GEO.DOOR_X; b.x = b.tx = X + 380; b.y = b.ty = -150; b.z = b.tz = 1.5; if (b.keepFree) b.keepFree(); await new Promise(r => setTimeout(r, 1500)); return 1; })()`);
      console.log(await shot(path.join(OUT, 'city-' + name + '-close.png')));
    }
  } else if (MODE === 'perf') {
    // the base's draw time with a full city (switch off / on), then (on) a site, a rise, an upgrade and a demolition played through it
    for (const q of ['', '?pxtown=1']) {
      await open(q); await ev(CITY(5));
      const r = await ev(`(async () => { const g = __mcg, M = MC, o = M.drawBase, ts = [], sl = (ms) => new Promise(r => setTimeout(r, ms)); let errs = 0, last = '';
        const oX = M.PXR.draw; let twMs = 0, rmMs = 0; M.PXR.draw = function (c, x, y, key, t, o, id) { const a = performance.now(); try { return oX.apply(this, arguments); } finally { const d = performance.now() - a; if (String(id).startsWith('tw:')) twMs += d; else rmMs += d; } };
        M.drawBase = function () { const a = performance.now(); try { return o.apply(this, arguments); } catch (e) { errs++; last = String(e && e.stack).slice(0, 300); } finally { ts.push(performance.now() - a); } };
        const st = () => { const a = ts.slice().sort((x, y) => x - y), n0 = Math.max(1, ts.length), tw = +(twMs / n0).toFixed(2), rm = +(rmMs / n0).toFixed(2); ts.length = 0; twMs = rmMs = 0; return { tw, rm, n: a.length, med: +(a[a.length >> 1] || 0).toFixed(2), p90: +(a[Math.floor(a.length * 0.9)] || 0).toFixed(2) }; };
        await sl(3000); const wide = st(); const b = g.bv, X = M.BASE_GEO.DOOR_X; b.x = b.tx = X + 380; b.y = b.ty = -150; b.z = b.tz = 1.5; if (b.keepFree) b.keepFree(); await sl(3000); const close = st();
        const m = g.meta; let cell = null; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b === 'smithy') cell = x; }
        if (cell) { cell.b = null; cell.job = { kind: 'build', key: 'smithy', days: 1, total: 2 }; g.townSync(true); await sl(1500); cell.b = 'smithy'; cell.job = null; g.townSync(true); await sl(3000);
          const lv = m.prosLv; m.prosLv = 1; await sl(800); m.prosLv = lv; await sl(4500); cell.job = { kind: 'demolish', days: 1, total: 1 }; g.townSync(true); await sl(1000); }
        const shows = st(); M.drawBase = o; M.PXR.draw = oX; return JSON.stringify({ wide, close, shows, errs, last, mcErrs: (window.__mcErrs || []).slice(0, 3) }); })()`, 60000);
      console.log(JSON.stringify({ q: q || 'off', r }));
    }
  } else if (MODE === 'check') {
    for (const q of ['', '?pxtown=1']) {
      await open(q);
      for (const t of ['bot.js', 'designcheck.js']) await ev(fs.readFileSync(path.join(ROOT, 'tools', t), 'utf8') + ';true');
      const dc = await ev('__designCheck().then(r => JSON.stringify({ ok: r.ok, missing: r.missing }))');
      const bot = await ev('__bot(' + (+arg('secs', 90)) + ').then(r => JSON.stringify({ viewErrs: r.viewErrs, builds: r.builds, pros: r.pros, log: (r.log || []).filter(l => /VIEW|ERR|EXC/.test(l)).slice(0, 4) }))', 400000);
      // frame time on the base screen with a full city (switch as loaded)
      await ev(CITY(5));
      const ft = await ev(`(async () => { const g = __mcg, ts = []; for (let i = 0; i < 90; i++) { const a = performance.now(); g.view(); ts.push(performance.now() - a); await new Promise(r => setTimeout(r, 16)); } ts.sort((a, b) => a - b); return JSON.stringify({ med: +ts[45].toFixed(2), p90: +ts[81].toFixed(2), errs: (window.__mcErrs || []).slice(0, 3) }); })()`);
      console.log(JSON.stringify({ q: q || 'off', designcheck: dc, bot, frame: ft }));
    }
  }
} catch (e) { console.log('ERR', e && e.stack); }
finally { try { ws && ws.close(); } catch (e) { /* closed */ } chrome.kill('SIGKILL'); srv.close(); await wait(300); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0); }
