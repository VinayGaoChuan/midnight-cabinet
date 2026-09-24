// ==== mc-pixel.js ====
(function () {
// Pixel-art pipeline: vector painters -> quantised, outlined sprites; low-res scene layers; crisp pixel text & digits.
const M = window.MC, HD = M._hd, PX = 2;
M.PX = PX; M.pixelMode = true;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
M.pxCanvas = mk;
const hex = (h) => { const n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
M.hexRgb = hex;
// mark a canvas as pixel art: bitmap is art-res, logical size is PX times larger, drawn nearest-neighbour
function asPx(c, s) { s = s || PX; const bw = c.width, bh = c.height; c.bw = bw; c.bh = bh; c._px = 1; return M.hiRes(c, bw * s, bh * s, 1 / s); }
M.asPx = asPx;

// ───────── vector -> pixel art ─────────
function kmeans(cols, k) {
  if (cols.length <= k) return cols.map(c => c.slice());
  const cen = []; const step = cols.length / k;
  const sorted = cols.slice().sort((a, b) => (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) - (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11));
  for (let i = 0; i < k; i++) cen.push(sorted[Math.floor((i + 0.5) * step)].slice());
  const as = new Int32Array(cols.length);
  for (let it = 0; it < 7; it++) {
    const sum = cen.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < cols.length; i++) { const c = cols[i]; let bi = 0, bd = 1e9; for (let j = 0; j < cen.length; j++) { const e = cen[j], d = (c[0] - e[0]) ** 2 * 0.3 + (c[1] - e[1]) ** 2 * 0.59 + (c[2] - e[2]) ** 2 * 0.11; if (d < bd) { bd = d; bi = j; } } as[i] = bi; const s = sum[bi]; s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; s[3]++; }
    sum.forEach((s, j) => { if (s[3]) cen[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  return cen.map(c => c.map(Math.round));
}
// o.k palette size, o.ink outline colour, o.rim lit top-left edge
function pixelize(c, o = {}) {
  const w = c.width, h = c.height, x = c.getContext('2d'), im = x.getImageData(0, 0, w, h), d = im.data;
  const solid = new Uint8Array(w * h), idx = [], cols = [];
  for (let p = 0, i = 0; p < w * h; p++, i += 4) { if (d[i + 3] < (o.cut || 110)) { d[i + 3] = 0; continue; } d[i + 3] = 255; solid[p] = 1; idx.push(i); if (p % 2 === 0 || cols.length < 400) cols.push([d[i], d[i + 1], d[i + 2]]); }
  if (!idx.length) return c;
  const pal = kmeans(cols, o.k || 12);
  for (const i of idx) { let bi = 0, bd = 1e9; for (let j = 0; j < pal.length; j++) { const e = pal[j], dd = (d[i] - e[0]) ** 2 * 0.3 + (d[i + 1] - e[1]) ** 2 * 0.59 + (d[i + 2] - e[2]) ** 2 * 0.11; if (dd < bd) { bd = dd; bi = j; } } d[i] = pal[bi][0]; d[i + 1] = pal[bi][1]; d[i + 2] = pal[bi][2]; }
  const out = new Uint8ClampedArray(d), ink = o.ink ? hex(o.ink) : null;
  const at = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && solid[yy * w + xx];
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const p = yy * w + xx, i = p * 4;
    if (!solid[p]) {
      let n = -1; if (at(xx, yy + 1)) n = p + w; else if (at(xx, yy - 1)) n = p - w; else if (at(xx - 1, yy)) n = p - 1; else if (at(xx + 1, yy)) n = p + 1;
      if (n >= 0) { const j = n * 4; if (ink) { out[i] = ink[0]; out[i + 1] = ink[1]; out[i + 2] = ink[2]; } else { out[i] = d[j] * 0.2 + 12; out[i + 1] = d[j + 1] * 0.16 + 6; out[i + 2] = d[j + 2] * 0.24 + 18; } out[i + 3] = 255; }
    } else if (o.rim !== false && (!at(xx, yy - 1) || !at(xx - 1, yy))) { out[i] = Math.min(255, d[i] * 1.18 + 22); out[i + 1] = Math.min(255, d[i + 1] * 1.18 + 20); out[i + 2] = Math.min(255, d[i + 2] * 1.12 + 16); }
  }
  x.putImageData(new ImageData(out, w, h), 0, 0);
  return c;
}
M.pixelize = pixelize;

// character sprites: same painters as the HD art, rasterised at art resolution then quantised + outlined
const hdVec = M.hdCanvas, pcache = {};
M.hdVector = hdVec;
function tinted(base, tint) {
  const c = mk(base.bw, base.bh), x = c.getContext('2d'); x.drawImage(base, 0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.85; x.fillStyle = tint; x.fillRect(0, 0, c.width, c.height);
  const r = asPx(c); r.footY = base.footY; r.cx = base.cx; r.S = base.S; return r;
}
M.hdCanvas = function (D, H, tint, pose) {
  if (!M.pixelMode) return hdVec(D, H, tint);
  const aS = Math.max(8, Math.round(H / PX)), pk = D.key + '|' + aS + '|' + (pose || 0), key = pk + '|' + (tint || '');
  if (pcache[key]) return pcache[key];
  let base = pcache[pk + '|'];
  if (!base) {
    const W = Math.ceil(aS * 2.4), Ht = Math.ceil(aS * 1.5), c = mk(W, Ht), x = c.getContext('2d');
    x.translate(Math.round(W / 2), Ht - 3);
    const P = HD.RACE[D.race] || HD.RACE['人类'], Dp = pose ? Object.assign({}, D, { pose }) : D;
    (HD.PAINT[D.kind || HD.kindOf(D.key)] || HD.PAINT.hum)(x, Dp, P, aS, HD.rnd(D.key));
    pixelize(c, { k: aS < 30 ? 9 : 13 });
    base = asPx(c); base.footY = (Ht - 3) * PX; base.cx = Math.round(W / 2) * PX; base.S = aS * PX;
    pcache[pk + '|'] = base;
  }
  if (!tint) return base;
  return (pcache[key] = tinted(base, tint));
};

// ───────── low-res scene layers ─────────
const layers = {};
M.pxLayer = function (name, W, H) {
  const bw = Math.round(W / PX), bh = Math.round(H / PX); let L = layers[name];
  if (!L || L.width !== bw || L.height !== bh) { L = layers[name] = mk(bw, bh); const x = L.getContext('2d'); M._hiPatch(x); x._R = 1 / PX; x.setTransform(1, 0, 0, 1, 0, 0); }
  return L;
};
// render fn(ctx) in art resolution, then blit nearest-neighbour onto the target stage canvas
M.pxRender = function (target, W, H, fn, name) {
  if (!M.pixelMode) return fn(target.getContext('2d'));
  const L = M.pxLayer(name || 'scene', W, H), lx = L.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalAlpha = 1; lx.globalCompositeOperation = 'source-over'; lx.filter = 'none';
  fn(lx);
  const t = target.getContext('2d'); t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.globalAlpha = 1; t.globalCompositeOperation = 'copy'; t.imageSmoothingEnabled = false;
  t.drawImage(L, 0, 0, L.width, L.height, 0, 0, W, H); t.restore();
};

// ───────── crisp pixel text (any glyph, incl. Chinese) ─────────
const tcache = new Map();
const FONT = "'Noto Serif SC', serif", NUMFONT = "'Cinzel', 'Noto Serif SC', serif";
// size: logical px height of the glyphs
M.pxTextCanvas = function (text, size, col, o = {}) {
  const key = text + '|' + size + '|' + col + '|' + (o.ink || '') + '|' + (o.font || '') + '|' + (o.bold ? 1 : 0);
  let c = tcache.get(key); if (c) return c;
  const fs = Math.max(7, Math.round(size / PX)), font = (o.bold ? '900 ' : '700 ') + fs + 'px ' + (o.font || FONT);
  const mx = mk(4, 4).getContext('2d'); mx.font = font; const tw = Math.ceil(mx.measureText(text).width) + 4, th = Math.ceil(fs * 1.35) + 4;
  c = mk(tw, th); const x = c.getContext('2d'); x.font = font; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(text, 2, th / 2 + 1);
  const im = x.getImageData(0, 0, tw, th), d = im.data, solid = new Uint8Array(tw * th), rgb = hex(col.length >= 7 ? col : '#ffffff');
  for (let p = 0, i = 0; p < tw * th; p++, i += 4) { if (d[i + 3] >= 96) { solid[p] = 1; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255; } else d[i + 3] = 0; }
  const ink = hex(o.ink || '#0a0610');
  for (let yy = 0; yy < th; yy++) for (let xx = 0; xx < tw; xx++) { const p = yy * tw + xx; if (solid[p]) continue; let n = false; for (let dy = -1; dy <= 1 && !n; dy++) for (let dx = -1; dx <= 1; dx++) { const X = xx + dx, Y = yy + dy; if (X >= 0 && Y >= 0 && X < tw && Y < th && solid[Y * tw + X]) { n = true; break; } } if (n) { const i = p * 4; d[i] = ink[0]; d[i + 1] = ink[1]; d[i + 2] = ink[2]; d[i + 3] = 255; } }
  x.putImageData(im, 0, 0); c = asPx(c);
  if (tcache.size > 600) tcache.delete(tcache.keys().next().value);
  tcache.set(key, c); return c;
};
M.pxText = function (ctx, text, x, y, size, col, o = {}) {
  const c = M.pxTextCanvas(String(text), size, col, o), sc = o.scale || 1, w = c.width * sc, h = c.height * sc;
  const ax = o.align === 'left' ? 0 : o.align === 'right' ? -w : -w / 2;
  ctx.drawImage(c, Math.round(x + ax), Math.round(y - h / 2), w, h);
  return w;
};

// ───────── 5x7 pixel digits (damage numbers) ─────────
const DG = { '0':'01110100011001110101110011000101110', '1':'00100011000010000100001000010001110', '2':'01110100010000100010001000100011111', '3':'11110000010000101110000010000111110', '4':'00010001100101010010111110001000010', '5':'11111100001111000001000011000101110', '6':'00110010001000011110100011000101110', '7':'11111000010001000100010000100001000', '8':'01110100011000101110100011000101110', '9':'01110100011000101111000010001001100', '+':'00000001000010011111001000010000000', '-':'00000000000000011111000000000000000', '.':'00000000000000000000000000110001100', 'K':'10001100101010011000101001001010001', 'M':'10001110111010110101100011000110001', 'B':'11110100011000111110100011000111110', '×':'00000100010101000100010101000100000', '%':'11001110010001000100010011100110011', '!':'00100001000010000100001000000000100', ',':'00000000000000000000001100010001000', '/':'00001000010001000100010001000010000' };
const ncache = new Map();
M.pxNumCanvas = function (str, col, o = {}) {
  const key = str + '|' + col + '|' + (o.ink || '') + '|' + (o.hl || '');
  let c = ncache.get(key); if (c) return c;
  const chars = [...str].filter(ch => DG[ch] || ch === ' '), w = chars.length * 6 + 3, h = 10;
  c = mk(w, h); const x = c.getContext('2d'), ink = o.ink || '#12060c', hl = o.hl || '#ffffff';
  const put = (ox, oy, fill) => chars.forEach((ch, k) => { const g = DG[ch]; if (!g) return; for (let i = 0; i < 35; i++) if (g[i] === '1') { x.fillStyle = fill(i); x.fillRect(ox + 1 + k * 6 + (i % 5), oy + 1 + Math.floor(i / 5), 1, 1); } });
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [1, 2]]) put(1 + dx, 1 + dy, () => ink);
  put(1, 1, (i) => (i < 10 ? hl : col));
  c = asPx(c);
  if (ncache.size > 500) ncache.delete(ncache.keys().next().value);
  ncache.set(key, c); return c;
};
// scale: art-pixel multiplier on top of PX (1 = 5x7 glyphs at 10x14 logical px)
M.pxNum = function (ctx, str, x, y, col, scale, o = {}) {
  const c = M.pxNumCanvas(String(str), col, o), s = scale || 1, w = c.width * s, h = c.height * s;
  ctx.drawImage(c, Math.round(x - (o.align === 'left' ? 0 : o.align === 'right' ? w : w / 2)), Math.round(y - h / 2), w, h);
  return w;
};

// ───────── dithered glow + pixel primitives for effects ─────────
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const gcache = {};
M.pxGlowCanvas = function (col, r) {
  const rb = Math.max(4, Math.round(r / PX / 4) * 4), key = col + '|' + rb; if (gcache[key]) return gcache[key];
  const n = rb * 2, c = mk(n, n), x = c.getContext('2d'), im = x.createImageData(n, n), d = im.data, rgb = hex(col);
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) { const dd = Math.hypot(xx + 0.5 - rb, yy + 0.5 - rb) / rb; if (dd >= 1) continue; const v = Math.pow(1 - dd, 1.6), th = (BAYER[(yy % 4) * 4 + (xx % 4)] + 0.5) / 16, lvl = Math.floor(v * 4 + th) / 4; if (lvl <= 0) continue; const i = (yy * n + xx) * 4; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = Math.round(255 * lvl); }
  x.putImageData(im, 0, 0); return (gcache[key] = asPx(c));
};
M.pxGlow = function (ctx, x, y, r, col, a) {
  if (!(a > 0) || !(r > 0) || !col || col.length < 7) return;
  const c = M.pxGlowCanvas(col.slice(0, 7), r), s = r / (c.width / 2);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= Math.min(1, a); ctx.drawImage(c, x - r, y - r, c.width * s, c.height * s); ctx.restore();
};
// dotted pixel ellipse (magic circles, rings): points snapped to the art grid
M.pxRing = function (ctx, x, y, rx, ry, col, o = {}) {
  const n = Math.max(12, Math.round((rx + ry) * (o.dense || 0.9))), sz = (o.w || 1) * PX, rot = o.rot || 0;
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { if (o.gap && (i % o.gap) === 0) continue; const a = rot + i / n * Math.PI * 2, px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry; ctx.fillRect(Math.round(px / PX) * PX - sz / 2, Math.round(py / PX) * PX - sz / 2, sz, sz); }
};
M.pxDot = function (ctx, x, y, s, col) { const z = Math.max(PX, Math.round(s / PX) * PX); ctx.fillStyle = col; ctx.fillRect(Math.round(x / PX) * PX - z / 2, Math.round(y / PX) * PX - z / 2, z, z); };
})();

;
