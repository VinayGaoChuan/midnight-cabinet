// Pixel room shots without a browser (dev tool for mc-pxroom*.js): renders rooms headless and writes PNG sheets.
//   node tools/pxshot.js smithy generator              → .ai/pxshots/<key>.png: 4 moments (t 0.6 / 1.8 / 3.0 / 4.2 s) at ×3
//   options: --t 0.5,2,3.5   --scale 4   --big (one frame at ×5 too)   --ev built|sel (poke at 0.2 s, frames follow it)
//            --hov   --par -1…1   --fire (weapon fires every 2 s: o.fireT)   --tile geo (terrain seam on the floor)
//            --sheet name (all keys into one sheet, one row each)   --out dir   --extra draft.js (load a draft file too)
// Prints one JSON line per key: ms per frame (average over 120 frames), colours used, checker (share of 2×2 dither
// checkerboards — keep it under 0.03), lights, peak particles, and the first error if the room threw.
const fs = require('fs'), path = require('path'), vm = require('vm'), { performance } = require('perf_hooks'), png = require('./pj-png');
const ROOT = path.join(__dirname, '..'), SRC = path.join(ROOT, 'src');
const argv = process.argv.slice(2), opt = {}, keys = [];
for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; opt[k] = v; } else keys.push(a); }
const order = fs.readFileSync(path.join(SRC, '_order.txt'), 'utf8').split(/\s+/).filter(f => /\.js$/.test(f));

// ── game data (buildings, terrain, room lines) from the real code, cached by source mtimes ──
function gameData() {
  const stamp = order.filter(f => !/^mc-pxroom/.test(f)).map(f => { try { return fs.statSync(path.join(SRC, f)).mtimeMs; } catch (e) { return 0; } }).join(','), cache = path.join(ROOT, '.ai', 'pxshot-data.json');
  try { const c = JSON.parse(fs.readFileSync(cache, 'utf8')); if (c.stamp === stamp) return c.data; } catch (e) {}
  const stub = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === Symbol.iterator ? function* () {} : stub, apply: () => stub, construct: () => stub, set: () => true });
  const win = { MC: {}, document: stub, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: { userAgent: 'node', maxTouchPoints: 0 }, location: { hash: '', search: '', href: '' }, performance, console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1, Image: function () { return stub; }, Audio: function () { return stub; }, AudioContext: function () { return stub; }, fetch: () => ({ then: () => stub }) };
  ['CanvasRenderingContext2D', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'OffscreenCanvas', 'Path2D', 'KeyboardEvent', 'MouseEvent', 'Event'].forEach(n => { win[n] = function () { return stub; }; win[n].prototype = {}; });
  win.customElements = { define() {}, get() {} }; win.window = win; win.self = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  order.forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), ctx, { filename: f }); } catch (e) { /* a broken module elsewhere must not stop shots */ } });
  const M = win.MC, pick = (o, f) => JSON.parse(JSON.stringify(o || {}, (k, v) => (typeof v === 'function' ? undefined : v)));
  const data = { BUILDINGS: pick(M.BUILDINGS), TILES: pick(M.TILES), ROOM_D: pick(M.ROOM_D), STYLE: pick(M.STYLE), CAT: pick(M.CAT), TILE_DIG: pick(M.TILE_DIG) };
  fs.mkdirSync(path.dirname(cache), { recursive: true }); const tmp = cache + '.' + process.pid; fs.writeFileSync(tmp, JSON.stringify({ stamp, data })); fs.renameSync(tmp, cache); return data;   // atomic: many shots run at once
}

// ── the pixel room code alone, headless ──
const data = gameData();
const box = { MC: Object.assign({ PJ: {} }, data), console, Math, performance, Date };
box.window = box; box.globalThis = box; vm.createContext(box);
order.filter(f => /^mc-pxroom/.test(f)).forEach(f => vm.runInContext(fs.readFileSync(path.join(SRC, f), 'utf8'), box, { filename: f }));
if (opt.extra) String(opt.extra).split(',').forEach(f => vm.runInContext(fs.readFileSync(path.resolve(f), 'utf8'), box, { filename: f }));   // --extra draft.js: try a room before it goes into src
const X = box.MC.PXR, W = X.W, H = X.H;
if (!keys.length) { console.log('pixel rooms: ' + Object.keys(X.defs).join(' ')); process.exit(0); }

const TS = (opt.t ? String(opt.t).split(',').map(Number) : [0.6, 1.8, 3.0, 4.2]), SC = +(opt.scale || 3), OUT = path.resolve(ROOT, opt.out || '.ai/pxshots');
fs.mkdirSync(OUT, { recursive: true });
function shoot(key) {
  const res = { key }, frames = [], id = '_shot_' + key; let err = null, peak = 0, ms = 0, n = 0;
  const o = () => ({ hov: !!opt.hov, par: opt.par != null ? +opt.par : 0, tile: opt.tile || undefined, po: opt.po != null ? +opt.po : undefined, hp: opt.hp != null ? +opt.hp : undefined }), end = Math.max(...TS) + 0.001, sz = (X.defs[key] && X.defs[key].size) || [W, H];
  try {
    X.pixels(key, 0, o(), id); const s = X.slots[id];
    let poked = false;
    for (let t = 1 / 30; t <= end; t += 1 / 30) {
      if (opt.ev && !poked && t >= 0.2) { X.poke(id, opt.ev); poked = true; }
      const oo = o(); if (opt.fire) oo.fireT = Math.floor(t / 2) * 2 + 0.3;
      const a = performance.now(); const px = X.pixels(key, t, oo, id); const d = performance.now() - a; if (t > 0.5) { ms += d; n++; }
      peak = Math.max(peak, s.P.a.length);
      TS.forEach(tt => { if (Math.abs(t - tt) < 1 / 60) { const f = new Uint32Array(px); f.w = sz[0]; f.h = sz[1]; frames.push(f); } });
    }
    // steady-state timing: 120 more frames
    for (let k = 0; k < 120; k++) { const a = performance.now(); X.pixels(key, end + k / 60, o(), id); ms += performance.now() - a; n++; }
  } catch (e) { err = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
  const last = frames[frames.length - 1]; res.ms = +(ms / Math.max(1, n)).toFixed(3);
  if (last) { const cols = new Set(), LW = last.w, LH = last.h; let chk = 0, blk = 0; for (let p = 0; p < LW * LH; p++) cols.add(last[p]);
    for (let y = 3; y < LH - 4; y++) for (let x = 3; x < LW - 4; x++) { const a = last[y * LW + x], b = last[y * LW + x + 1], c = last[(y + 1) * LW + x], d = last[(y + 1) * LW + x + 1]; blk++; if (a === d && b === c && a !== b && (a >>> 24) && (b >>> 24)) chk++; }
    res.colors = cols.size; res.checker = +(chk / blk).toFixed(4); }
  res.parts = peak; res.frames = frames; if (err) res.err = err; return res;
}
function sheet(rows, file, cols) {
  const fw = Math.max(...rows.flat().map(f => f.w)) * SC, fh = Math.max(...rows.flat().map(f => f.h)) * SC, g = 4, ncol = cols || Math.max(...rows.map(r => r.length)), w = ncol * (fw + g) + g, h = rows.length * (fh + g) + g, img = { w, h, data: new Uint8Array(w * h * 4) };
  for (let i = 0; i < w * h; i++) { img.data[i * 4] = 7; img.data[i * 4 + 1] = 6; img.data[i * 4 + 2] = 15; img.data[i * 4 + 3] = 255; }
  rows.forEach((row, ri) => row.forEach((f, ci) => { const ox = g + ci * (fw + g), oy = g + ri * (fh + g), FW = f.w;
    for (let y = 0; y < f.h * SC; y++) for (let x = 0; x < FW * SC; x++) { const c = f[Math.floor(y / SC) * FW + Math.floor(x / SC)], i = ((oy + y) * w + ox + x) * 4; if (!(c >>> 24)) { const k = ((x >> 3) + (y >> 3)) & 1; img.data[i] = img.data[i + 1] = k ? 40 : 28; img.data[i + 2] = k ? 56 : 44; continue; } img.data[i] = c & 255; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = (c >> 16) & 255; } }));
  png.write(file, img); return file;
}
// cost relative to the pilot smithy measured the same way in this process (node's absolute ms are not the browser's)
let REF = null; if (X.has('smithy')) { const id = '_ref_smithy'; for (let k = 0; k < 40; k++) X.pixels('smithy', k / 30, {}, id); const a = performance.now(); for (let k = 0; k < 150; k++) X.pixels('smithy', 2 + k / 60, {}, id); REF = (performance.now() - a) / 150; }
const all = [];
keys.forEach(k => {
  if (!X.has(k)) { console.log(JSON.stringify({ key: k, err: 'no such pixel room (PXR.def)' })); return; }
  const r = shoot(k); all.push(r);
  if (!opt.sheet && r.frames.length) { const two = r.frames.length > 2 ? [r.frames.slice(0, 2), r.frames.slice(2, 4)] : [r.frames]; r.file = sheet(two.filter(x => x.length), path.join(OUT, k + (opt.ev ? '-' + opt.ev : '') + (opt.tile ? '-' + opt.tile : '') + '.png')); }
  if (opt.big && r.frames.length) { r.big = path.join(OUT, k + '-big.png'); sheetBig(r.frames[r.frames.length - 1], r.big); }
  const out = Object.assign({}, r); delete out.frames; if (REF) out.rel = +(r.ms / REF).toFixed(2); try { Object.assign(out, X.info(k)); } catch (e) {} console.log(JSON.stringify(out));
});
function sheetBig(f, file) { const S2 = opt.bigscale ? +opt.bigscale : 5, FW = f.w, w = FW * S2, h = f.h * S2, img = { w, h, data: new Uint8Array(w * h * 4) }; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f[Math.floor(y / S2) * FW + Math.floor(x / S2)], i = (y * w + x) * 4; img.data[i] = c & 255; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = (c >> 16) & 255; img.data[i + 3] = 255; } png.write(file, img); }
if (opt.sheet && all.length) console.log(JSON.stringify({ sheet: sheet(all.map(r => r.frames), path.join(OUT, opt.sheet + '.png')) }));
