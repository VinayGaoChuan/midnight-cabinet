// ==== mc-pxroom.js ====
(function () {
// Pixel rooms (user ruling 2026-09-25: the whole base is real pixel art, and its rooms are the juiciest thing on screen).
// A room is painted once at art resolution — 150×105, one art pixel = 2 world units — into four depth layers
// (wall 0 · back 5 · mid 14 · front 26 art px in front of the wall). Every pixel keeps a material (a palette ramp),
// a tone (its step on that ramp), a normal, a glow flag and a depth. Each frame the room's own lights move pixels up
// and down their ramps, with a narrow ordered-dither band between steps, so torch flicker, hammer flashes and swinging
// bulbs read as pixel art, never as blurred gradients. Animated things (fire, gears, workers) are painted into the same
// kind of layers every frame and lit the same way; particles are single pixels that walk a colour ramp over their life.
// HD-2D later: those layers are exactly what a 3D renderer needs — M.PXR.export(key) hands out albedo / normal / glow /
// depth images per layer, the lights and the emitters (see docs/design.md §10 · 基地像素房间).
const M = window.MC;
// room canvas: 150×105 by default; a def may declare its own size ({ size: [w, h], fy }) — every entry point switches
// W / H / N / FY and the size's buffers to the def it serves first (use(key)); all work for a key is synchronous
let W = 150, H = 105, N = W * H, FY = 90; const FZ = 2;   // floor top at art y 90; each floor row is FZ art px deeper
const GAIN = 3.2, L0 = 0.78, DW = 0.06, WRAP = 0.35;     // light → ramp steps; neutral light level; dither band; wrap light
const KEY = (() => { const v = [-0.38, -0.72, 0.58], l = Math.hypot(...v); return v.map(a => a / l); })();   // ambient comes from the ceiling, front-left
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hstr = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const h2 = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const sm = (a) => a * a * (3 - 2 * a);
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi), a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
const n1 = (t) => vnoise(t, 0.5, 9) * 2 - 1;   // smooth 1-D noise in −1…1

// ───────── palette: material ramps, darkest → lightest ─────────
// Darks meet in the same night indigo as the characters' palette (pcd/lib/pcd.js); highlights lean warm; shadows lean blue-violet.
const RAMPS = {
  ink:    ['#07060f', '#0b0a18', '#12132e'],
  night:  ['#07060f', '#0b0a18', '#12132e', '#1a1d45', '#242b5f', '#333d7c'],
  stone:  ['#0b0a18', '#161323', '#201c2e', '#2b263b', '#373149', '#453e58', '#564e69', '#6b6380', '#857d97', '#a6a2b5', '#cdc5b3'],
  mstone: ['#0b0a18', '#171218', '#221a1f', '#2e2428', '#3b2f31', '#4a3c3b', '#5b4b47', '#6f5d55', '#877264', '#a38c78', '#c4ad92'],
  brick:  ['#0b0a18', '#1e0e16', '#2e1319', '#421a1f', '#582226', '#6f2d2b', '#883b31', '#a14f3b', '#bb6a4c', '#d48e66', '#ebb88e'],
  wood:   ['#0b0a18', '#1a0e12', '#2a1614', '#3b2016', '#4e2b1b', '#633822', '#7a4a2b', '#915d36', '#aa7445', '#c48f5a', '#dcae78'],
  leather:['#0b0a18', '#1e1010', '#341c14', '#4e2a1a', '#6a3a22', '#86502c', '#a8703f', '#c89058', '#e0b07a'],
  iron:   ['#07060f', '#0e0f18', '#151822', '#1c202d', '#252b3a', '#303849', '#3e475b', '#4f5a70', '#65708a', '#8791a6', '#aeb7c8', '#dde3ee'],
  brass:  ['#140a0a', '#261410', '#3b2012', '#553016', '#71441a', '#8f5c20', '#ad7828', '#c99632', '#e2b546', '#f3d27a', '#fff0b8'],
  copper: ['#120808', '#240e0c', '#3a1610', '#521f14', '#6d2a18', '#89391e', '#a64b26', '#c06232', '#d67f46', '#e8a066', '#f6c89a'],
  linen:  ['#161422', '#26233a', '#3a3752', '#524f6c', '#6e6b86', '#8b88a0', '#a8a5b9', '#c3c0cf', '#dbd8e0', '#eeebe8', '#fffdf4'],
  crimson:['#0b0a18', '#1f0a18', '#33102a', '#4a1634', '#621c40', '#7e2446', '#9c2f4c', '#b83c52', '#cf4f5a', '#e87070', '#ff9a8a'],
  leaf:   ['#0b0a18', '#0b1814', '#0f2419', '#15311e', '#1d4124', '#27532a', '#346831', '#447e38', '#58963f', '#72ae48', '#95c85a', '#c0e27a'],
  moss:   ['#0b0a18', '#0c1516', '#10201c', '#152b21', '#1b3726', '#23442b', '#2e5330', '#3b6436'],
  earth:  ['#07060a', '#110c0d', '#1a1312', '#251b17', '#31241d', '#3e2e24', '#4d392c', '#5f4735', '#735640', '#8a684d', '#a37e60'],
  rock:   ['#050408', '#0b090d', '#120e13', '#1a1519', '#221c1f', '#2b2426', '#352c2d', '#403636', '#4d4140', '#5c4e4b', '#6e5e58', '#857268'],
  water:  ['#0b0a18', '#0b1430', '#0e1e48', '#132a62', '#1a3a7e', '#224c9a', '#2c62b4', '#3a7ccc', '#4e98de', '#6cb8ec', '#9ad8f6', '#d0f2ff'],
  tile:   ['#0b0a18', '#0d1732', '#11224a', '#162e60', '#1d3c78', '#264c8e', '#315ea2', '#3f72b4', '#5089c4', '#66a2d2', '#84bcde', '#aad6ea', '#dff2f8'],
  scifi:  ['#07060f', '#0c0f1c', '#111827', '#172032', '#1e293e', '#26334b', '#303e59', '#3b4a68', '#495a7b', '#5a6d90', '#7087a8', '#90a8c4', '#bcd0e2'],
  teal:   ['#06110f', '#0a1e1c', '#0f302c', '#15463f', '#1c5e54', '#25786a', '#309482', '#47b8a2', '#6ad6c0', '#9aeede', '#cffaf0', '#ffffff'],
  screen: ['#030a06', '#061409', '#0a2410', '#103818', '#185222', '#22702e', '#30923e', '#48b852', '#78dc72', '#b4f4a0', '#e8ffd8'],
  magic:  ['#0b0a18', '#120d20', '#19112b', '#221636', '#2c1c43', '#372352', '#442b62', '#533574', '#654188', '#7a519c', '#9468b4', '#b488cc'],
  arcane: ['#140c24', '#221444', '#2f1c66', '#3e268c', '#5032b0', '#6644d4', '#7e5cf0', '#9a7cff', '#b89cff', '#d6c0ff', '#f0e6ff', '#ffffff'],
  fire:   ['#1e0604', '#3a0c06', '#5e1608', '#86240c', '#ae3812', '#d0521a', '#ec7224', '#ff9630', '#ffbc44', '#ffdc76', '#fff4b8', '#ffffff'],
  lamp:   ['#1e1008', '#3a200c', '#5e3410', '#864c16', '#ae661c', '#d08224', '#ea9e32', '#ffba48', '#ffd06a', '#ffe496', '#fff4cc', '#ffffff'],
  red:    ['#12040a', '#260810', '#420c16', '#62121e', '#861a26', '#aa262e', '#cc3a38', '#e85848', '#ff7e68', '#ffac98', '#ffdcd0'],
  pink:   ['#14061a', '#260a2c', '#3c1044', '#56185c', '#722278', '#902e92', '#b03cac', '#cc52c2', '#e470d6', '#f69ae6', '#ffc8f4'],
  lav:    ['#0b0a18', '#161027', '#211834', '#2d2142', '#3a2b51', '#483662', '#584374', '#6a5287', '#80649b', '#9a7cb0', '#b898c6', '#d8badc'],
  candy:  ['#1a0a14', '#301024', '#4c1836', '#6a224a', '#8a2e60', '#a83c78', '#c44e8e', '#dc66a4', '#ee86bc', '#f8aad2', '#ffd2e8'],
  sand:   ['#140c0a', '#281a12', '#3e2816', '#56381c', '#6e4a22', '#88602c', '#a07838', '#b89048', '#ceaa5e', '#e2c47c', '#f2dea4'],
  paper:  ['#161218', '#2a2226', '#403430', '#58483c', '#72604c', '#8c7a60', '#a69476', '#bfae90', '#d6c8ac', '#e8dec8', '#f8f2e4'],
  glass:  ['#0b0a18', '#0e1830', '#132444', '#1a3258', '#23426e', '#2e5586', '#3c6a9c', '#5084b2', '#6aa0c6', '#8cbcd8', '#b6d8ea', '#e6f6ff'],
  skin:   ['#1e0e14', '#3a1c1e', '#5a2e28', '#7a4232', '#98583e', '#b27250', '#c88c64', '#dcaa80', '#eec8a0', '#fce4c4'],
  hair:   ['#07060f', '#120c14', '#1e141a', '#2c1c20', '#3c2626', '#50322c', '#664034'],
  denim:  ['#0b0a18', '#0f1430', '#152046', '#1c2c5e', '#253a76', '#30498c', '#3e5ca2', '#5074b8', '#6a90cc', '#8cb0de'],
  gold:   ['#1a0e08', '#3a2008', '#5c340a', '#80500e', '#a46c14', '#c48a1e', '#dea630', '#f2c24a', '#ffda6e', '#ffec9e', '#fff8d6', '#ffffff'],
  bone:   ['#161218', '#2c2428', '#463a38', '#62544c', '#7e6e62', '#9a8a7a', '#b4a692', '#cabea8', '#ded4c0', '#eee8d8', '#fcf8ee'],
  dusk:   ['#0b0a18', '#161232', '#241a4c', '#3a2060', '#58286a', '#7c3268', '#a2425e', '#c65a4e', '#e47a42', '#f8a048', '#ffcc70', '#fff0b0'],
  ice:    ['#0b0a18', '#101c34', '#182c4c', '#224064', '#2e567c', '#3e6e94', '#5288ac', '#6aa4c4', '#88c0d8', '#acdaea', '#d4f0f8', '#ffffff'],
};
const SPEC = { iron: 0.55, brass: 0.75, copper: 0.6, gold: 0.9, glass: 0.9, water: 0.7, tile: 0.5, scifi: 0.35, ice: 0.7, teal: 0.4 };
const abgr = (h) => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
const MATS = [null], MI = {}, lut = [];
Object.keys(RAMPS).forEach(k => { MI[k] = MATS.length; MATS.push({ k, o: lut.length, n: RAMPS[k].length, sp: SPEC[k] || 0 }); RAMPS[k].forEach(h => lut.push(abgr(h))); });
const LUT = new Uint32Array(lut);
const mid = (m) => (typeof m === 'number' ? m : MI[m] || MI.stone);
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const col32 = (m, k) => { const R = MATS[mid(m)]; return LUT[R.o + clamp(Math.round(k), 0, R.n - 1)]; };
// 4×4 Bayer, mapped so floor(v + DITH[p]) rounds with a narrow dithered band around each half step
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const mkDith = () => { const d = new Float32Array(N); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = 0.5 + ((BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * DW; return d; };
let DITH = mkDith();
const bayer = (x, y) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// ───────── layers ─────────
const LAYS = [['wall', 0, 0], ['back', 5, 0.34], ['mid', 14, 0.67], ['front', 26, 1]];
function Lay(z, par) { return { z, par, m: new Uint8Array(N), t: new Float32Array(N), nx: new Int8Array(N), ny: new Int8Array(N), e: new Uint8Array(N), d: new Uint8Array(N), o: new Uint16Array(N), f: new Uint8Array(N) }; }
function layers() { const L = {}; LAYS.forEach(([k, z, par]) => { L[k] = Lay(z, par); L[k].k = k; }); return L; }
function clearLay(L) { const pl = L.pl; for (let i = 0; i < pl.length; i++) { L.m[pl[i]] = 0; L.e[pl[i]] = 0; } pl.length = 0; L.stamp = (L.stamp + 1) >>> 0 || 1; }

// ───────── painter: pixel-exact primitives into the current layer ─────────
// tone t = step on the material's ramp under neutral light (0 = darkest); n = [nx, ny] facing (nz follows); e = glow
// (255: always lit at its own tone; 1…16: glows with light e−1); z = depth override. Objects (beg/end) get a selective outline.
const NO = {};
class Pn {
  constructor(L, seed) { this.L = L; this.c = L.wall; this.r = rng(seed || 1); this.id = 1; this.bb = null; this.dx = 0; this.dy = 0; }
  lay(k) { this.c = this.L[k]; return this; }
  rand() { return this.r(); }
  put(x, y, m, t, nx, ny, e, z) {
    x = Math.round(x + this.dx); y = Math.round(y + this.dy); if (x < 0 || y < 0 || x >= W || y >= H) return;
    const p = y * W + x, L = this.c; L.m[p] = m; L.t[p] = t; L.nx[p] = nx * 127; L.ny[p] = ny * 127; L.e[p] = e || 0; L.d[p] = z != null ? z : L.z; L.o[p] = this.id; L.f[p] = 0;
    const b = this.bb; if (b) { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
    if (L.pl && L.st[p] !== L.stamp) { L.st[p] = L.stamp; L.pl.push(p); }   // dyn layers keep a list of what was painted this frame
  }
  // read / adjust what is already painted
  at(x, y) { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= W || y >= H ? 0 : this.c.m[y * W + x]; }
  tone(x, y, dt) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const p = y * W + x; if (this.c.m[p]) this.c.t[p] = Math.max(0, this.c.t[p] + dt); }
  px(x, y, m, t, o) { o = o || NO; this.put(x, y, mid(m), t, o.n ? o.n[0] : 0, o.n ? o.n[1] : 0, o.e, o.z); return this; }
  rect(x, y, w, h, m, t, o) {
    o = o || NO; const mi = mid(m), nx = o.n ? o.n[0] : 0, ny = o.n ? o.n[1] : 0; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, mi, o.j ? t + Math.round((this.r() - 0.5) * o.j) : t, nx, ny, o.e, o.z);
    return this;
  }
  hl(x, y, w, m, t, o) { return this.rect(x, y, w, 1, m, t, o); }
  vl(x, y, h, m, t, o) { return this.rect(x, y, 1, h, m, t, o); }
  // vertical tone ramp (the dither at light time turns it into bands, never a smooth gradient)
  vgrad(x, y, w, h, m, t0, t1, o) { o = o || NO; for (let k = 0; k < h; k++) this.rect(x, y + k, w, 1, m, t0 + (t1 - t0) * (h > 1 ? k / (h - 1) : 0), o); return this; }
  line(x0, y0, x1, y1, m, t, o) {
    o = o || NO; const mi = mid(m), nx = o.n ? o.n[0] : 0, ny = o.n ? o.n[1] : 0, w = o.w || 1;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
    for (;;) { for (let a = 0; a < w; a++) for (let b = 0; b < w; b++) this.put(x0 + a, y0 + b, mi, t, nx, ny, o.e, o.z); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  poly(pts, m, t, o) {
    o = o || NO; const mi = mid(m), nx = o.n ? o.n[0] : 0, ny = o.n ? o.n[1] : 0; let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const cy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.put(x, y, mi, t, nx, ny, o.e, o.z); }
    return this;
  }
  // filled ellipse; o.dome gives sphere normals, o.ring draws only the rim of width o.ring
  ell(cx, cy, rx, ry, m, t, o) {
    o = o || NO; const mi = mid(m);
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const u = (x + 0.5 - cx) / (rx + 0.01), v = (y + 0.5 - cy) / (ry + 0.01), d = u * u + v * v; if (d > 1) continue;
      if (o.ring) { const ui = (x + 0.5 - cx) / Math.max(0.5, rx - o.ring), vi = (y + 0.5 - cy) / Math.max(0.5, ry - o.ring); if (ui * ui + vi * vi < 1) continue; }
      let nx = o.n ? o.n[0] : 0, ny = o.n ? o.n[1] : 0; if (o.dome) { nx = u * 0.9; ny = v * 0.9; }
      this.put(x, y, mi, t, nx, ny, o.e, o.z);
    }
    return this;
  }
  // panel with a one-pixel bevel: lit top edge, dark bottom edge; o.top = visible top face rows, o.side = right face columns
  box(x, y, w, h, m, t, o) {
    o = o || NO; x = Math.round(x); y = Math.round(y); const b = o.bev == null ? 1 : o.bev, tp = o.top || 0, sd = o.side || 0, q = { e: o.e, z: o.z };
    if (tp) this.rect(x, y - tp, w, tp, m, t + (o.tt != null ? o.tt : 1.6), Object.assign({ n: [0, -0.86] }, q));
    this.rect(x, y, w, h, m, t, Object.assign({ n: [0, 0] }, q));
    if (b && w > 2 && h > 2) {
      this.rect(x, y, w, 1, m, t + 0.9, Object.assign({ n: [0, -0.7] }, q)); this.rect(x, y + h - 1, w, 1, m, t - 1.2, Object.assign({ n: [0, 0.7] }, q));
      this.rect(x, y + 1, 1, h - 2, m, t + 0.35, Object.assign({ n: [-0.7, 0] }, q)); this.rect(x + w - 1, y + 1, 1, h - 2, m, t - 0.6, Object.assign({ n: [0.7, 0] }, q));
    }
    if (sd) this.rect(x + w, y - tp, sd, h + tp, m, t - 1.3, Object.assign({ n: [0.86, 0] }, q));
    return this;
  }
  // round things: normals sweep across the width (vertical) or height (horizontal)
  cyl(x, y, w, h, m, t, o) { o = o || NO; x = Math.round(x); y = Math.round(y); const mi = mid(m); for (let i = 0; i < w; i++) { const u = (i + 0.5) / w * 2 - 1; for (let k = 0; k < h; k++) this.put(x + i, y + k, mi, t + (o.rim ? -Math.pow(Math.abs(u), 3) * o.rim : 0), u * 0.92, o.ny || 0, o.e, o.z); } return this; }
  hcyl(x, y, w, h, m, t, o) { o = o || NO; x = Math.round(x); y = Math.round(y); const mi = mid(m); for (let k = 0; k < h; k++) { const u = (k + 0.5) / h * 2 - 1; for (let i = 0; i < w; i++) this.put(x + i, y + k, mi, t + (o.rim ? -Math.pow(Math.abs(u), 3) * o.rim : 0), 0, u * 0.92, o.e, o.z); } return this; }
  // string sprite: rows of characters, pal = { ch: [material, tone, {n, e}] }; '.' and ' ' are empty
  spr(x, y, rows, pal, flip) {
    const w = rows[0].length; rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i], p = pal[ch]; if (!p) continue; const xx = flip ? x + w - 1 - i : x + i, o = p[2] || NO; this.put(xx, y + j, mid(p[0]), p[1], o.n ? o.n[0] * (flip ? -1 : 1) : 0, o.n ? o.n[1] : 0, o.e, o.z); } });
    return this;
  }
  // tone jitter in clusters (value noise on a `cell`-pixel lattice, rounded to whole steps) over what is already painted
  noise(x, y, w, h, amp, cell, seed, o) {
    o = o || NO; const L = this.c; seed = seed || 1;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const p = yy * W + xx; if (!L.m[p] || (o.only && L.m[p] !== mid(o.only))) continue;
      const v = vnoise(xx / cell, yy / cell, seed) * 0.7 + vnoise(xx / cell * 2.3, yy / cell * 2.3, seed + 7) * 0.3; L.t[p] = Math.max(0, L.t[p] + Math.round((v - 0.5) * 2 * amp)); }
    return this;
  }
  // darken toward an edge ('t' top, 'b' bottom, 'l', 'r') — baked occlusion under shelves, in corners, behind props
  ao(x, y, w, h, side, amt) {
    const L = this.c; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const p = yy * W + xx; if (!L.m[p]) continue;
      const k = side === 't' ? (yy - y) / h : side === 'b' ? (y + h - 1 - yy) / h : side === 'l' ? (xx - x) / w : (x + w - 1 - xx) / w; L.t[p] = Math.max(0, L.t[p] - amt * (1 - k) * (1 - k)); }
    return this;
  }
  // cast shadow: lower the tone of everything already painted inside a polygon
  shadow(pts, dt) { const L = this.c; let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) { const cy = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
      xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) { const p = y * W + x; if (L.m[p]) L.t[p] = Math.max(0, L.t[p] - dt); } }
    return this;
  }
  // an object: everything painted between beg() and end() is outlined — dark (step 0) on the bottom / right,
  // one step up on the top / left where the ceiling light lands (selective outline); o.none skips it
  beg() { this.id = (this.id % 65000) + 1; this.bb = [1e9, 1e9, -1e9, -1e9]; return this; }
  end(o) {
    o = o || NO; const b = this.bb; this.bb = null; if (o.none || !b || b[0] > b[2]) return this; const L = this.c, id = this.id, add = [];
    for (let y = Math.max(0, b[1] - 1); y <= Math.min(H - 1, b[3] + 1); y++) for (let x = Math.max(0, b[0] - 1); x <= Math.min(W - 1, b[2] + 1); x++) {
      const p = y * W + x; if (L.o[p] === id && L.m[p]) continue;
      const nb = (xx, yy) => (xx >= 0 && yy >= 0 && xx < W && yy < H && L.o[yy * W + xx] === id && L.m[yy * W + xx] ? yy * W + xx : -1);
      const up = nb(x, y + 1), dn = nb(x, y - 1), lf = nb(x + 1, y), rt = nb(x - 1, y), q = up >= 0 ? up : lf >= 0 ? lf : dn >= 0 ? dn : rt;
      if (q < 0) continue; const lit = up >= 0 || lf >= 0; add.push([p, L.m[q], lit ? (o.lit != null ? o.lit : 1) : 0, L.d[q]]);
    }
    add.forEach(([p, m, t, d]) => { if (o.ink) m = MI.ink; L.m[p] = m; L.t[p] = t; L.nx[p] = 0; L.ny[p] = 0; L.e[p] = 0; L.d[p] = d; L.o[p] = id; L.f[p] = 0; if (L.pl && L.st[p] !== L.stamp) { L.st[p] = L.stamp; L.pl.push(p); } });
    return this;
  }
  // mark painted floor rows: they lie flat (normal up) and recede FZ art px per row
  floor(y0) { const L = this.c; for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (!L.m[p]) continue; L.f[p] = 1; L.ny[p] = -127; L.nx[p] = 0; L.d[p] = (y - y0) * FZ; } return this; }
}
M.PXR_Painter = Pn;

// ───────── textures ─────────
const TX = {
  // running-bond bricks with mortar; each brick has its own tone, a lit top edge, a dark bottom edge and a few pits
  bricks(S, x, y, w, h, m, t, o) {
    o = o || NO; const bw = o.bw || 12, bh = o.bh || 6, mm = o.mortar || m, mt = o.mt != null ? o.mt : t - 3, v = o.v == null ? 1.2 : o.v, r = S.r;
    S.rect(x, y, w, h, mm, mt, { n: [0, 0] });
    for (let row = 0, yy = y; yy < y + h; row++, yy += bh) {
      let xx = x - (row % 2 ? Math.round(bw / 2) : 0) - Math.floor(r() * 3);
      while (xx < x + w) { const ww = bw + Math.round((r() - 0.5) * (o.wj || 4)), tt = t + Math.round((r() - 0.5) * 2 * v), a = Math.max(x, xx + 1), b = Math.min(x + w, xx + ww), hh = Math.min(bh - 1, y + h - yy - 1);
        if (b > a && hh > 0) { S.rect(a, yy + 1, b - a, hh, m, tt); S.rect(a, yy + 1, b - a, 1, m, tt + 1, { n: [0, -0.7] }); if (hh > 2) S.rect(a, yy + hh, b - a, 1, m, tt - 1, { n: [0, 0.7] }); S.rect(a, yy + 1, 1, hh, m, tt + 0.4, { n: [-0.6, 0] });
          for (let k = 0; k < (o.pits == null ? 2 : o.pits); k++) S.px(a + Math.floor(r() * (b - a)), yy + 2 + Math.floor(r() * Math.max(1, hh - 2)), m, tt - 2);
          if (o.chip && r() < o.chip) { S.px(b - 1, yy + 1, mm, mt); S.px(b - 2, yy + 1, m, tt - 1); } }
        xx += ww; }
    }
  },
  // irregular dressed stone: rows of varied height, blocks of varied width
  ashlar(S, x, y, w, h, m, t, o) {
    o = o || NO; const r = S.r, mm = o.mortar || m, mt = o.mt != null ? o.mt : t - 3.2; S.rect(x, y, w, h, mm, mt);
    for (let yy = y; yy < y + h;) { const bh = (o.bh || 9) + Math.round((r() - 0.5) * 4); let xx = x - Math.floor(r() * 10);
      while (xx < x + w) { const bw = (o.bw || 16) + Math.round((r() - 0.5) * 10), tt = t + Math.round((r() - 0.5) * 2.4), a = Math.max(x, xx + 1), b = Math.min(x + w, xx + bw), hh = Math.min(bh - 1, y + h - yy - 1);
        if (b > a && hh > 1) { S.rect(a, yy + 1, b - a, hh, m, tt); S.rect(a, yy + 1, b - a, 1, m, tt + 1.2, { n: [0, -0.75] }); S.rect(a, yy + 1, 1, hh, m, tt + 0.6, { n: [-0.7, 0] }); S.rect(a, yy + hh, b - a, 1, m, tt - 1.2, { n: [0, 0.7] }); S.rect(b - 1, yy + 2, 1, hh - 2, m, tt - 0.7, { n: [0.7, 0] });
          if (b - a > 6 && hh > 4) for (let k = 0; k < 3; k++) S.px(a + 2 + Math.floor(r() * (b - a - 4)), yy + 2 + Math.floor(r() * (hh - 3)), m, tt - 1.5 - Math.floor(r() * 2));
          if (r() < (o.crack || 0.15) && b - a > 8) { let cx = a + 3 + Math.floor(r() * (b - a - 6)), cy = yy + 1; for (let k = 0; k < hh - 1; k++) { S.px(cx, cy + k, m, tt - 2.6); S.px(cx + 1, cy + k, m, tt + 0.5); if (r() < 0.4) cx += r() < 0.5 ? -1 : 1; } } }
        xx += bw; }
      yy += bh; }
  },
  // horizontal planks with seams, grain streaks and nails
  planks(S, x, y, w, h, m, t, o) {
    o = o || NO; const r = S.r, ph = o.ph || 4;
    for (let yy = y, row = 0; yy < y + h; yy += ph, row++) { let xx = x - Math.floor(r() * 20);
      while (xx < x + w) { const pw = (o.pw || 26) + Math.floor(r() * 18), tt = t + Math.round((r() - 0.5) * 2), a = Math.max(x, xx), b = Math.min(x + w, xx + pw), hh = Math.min(ph, y + h - yy);
        S.rect(a, yy, b - a, hh, m, tt); S.rect(a, yy, b - a, 1, m, tt + 0.8, { n: [0, -0.6] }); S.rect(a, yy + hh - 1, b - a, 1, m, tt - 1.6, { n: [0, 0.6] });
        for (let k = 0; k < (b - a) / 7; k++) { const gx = a + Math.floor(r() * (b - a)), gy = yy + 1 + Math.floor(r() * Math.max(1, hh - 2)), gl = 2 + Math.floor(r() * 5); S.rect(gx, gy, Math.min(gl, b - gx), 1, m, tt - 1); }
        if (b - a > 3) { S.rect(b - 1, yy, 1, hh, m, tt - 2.2); if (o.nails !== false && hh > 2) { S.px(a + 1, yy + 1, 'iron', 7); S.px(b - 3, yy + 1, 'iron', 7); } }
        xx += pw; }
    }
  },
  vplanks(S, x, y, w, h, m, t, o) {
    o = o || NO; const r = S.r, pw = o.pw || 6;
    for (let xx = x; xx < x + w; xx += pw) { const tt = t + Math.round((r() - 0.5) * 2), ww = Math.min(pw, x + w - xx);
      S.rect(xx, y, ww, h, m, tt); S.rect(xx, y, 1, h, m, tt + 0.7, { n: [-0.6, 0] }); S.rect(xx + ww - 1, y, 1, h, m, tt - 2, { n: [0.6, 0] });
      for (let k = 0; k < h / 5; k++) { const gy = y + Math.floor(r() * h), gl = 3 + Math.floor(r() * 6); S.rect(xx + 1 + Math.floor(r() * Math.max(1, ww - 3)), gy, 1, Math.min(gl, y + h - gy), m, tt - 1); }
      if (o.knots) { const ky = y + Math.floor(r() * h); S.px(xx + 2, ky, m, tt - 2.5); S.px(xx + 3, ky, m, tt - 1.5); } }
  },
  // square glazed tiles: grout lines, a gloss pixel at the lit corner
  tiles(S, x, y, w, h, m, t, o) {
    o = o || NO; const r = S.r, s = o.s || 8, gm = o.grout || m, gt = o.gt != null ? o.gt : t - 3; S.rect(x, y, w, h, gm, gt);
    for (let yy = y; yy < y + h; yy += s) for (let xx = x + ((o.off && ((yy - y) / s) % 2) ? -s / 2 : 0); xx < x + w; xx += s) { const tt = t + Math.round((r() - 0.5) * (o.v == null ? 1.4 : o.v)), a = Math.max(x, xx + 1), b = Math.min(x + w, xx + s), hh = Math.min(s - 1, y + h - yy - 1);
      if (b <= a || hh <= 0) continue; S.rect(a, yy + 1, b - a, hh, m, tt); S.rect(a, yy + 1, b - a, 1, m, tt + 1, { n: [0, -0.6] }); S.rect(a, yy + hh, b - a, 1, m, tt - 1, { n: [0, 0.6] }); if (o.gloss !== false && b - a > 3) { S.px(a + 1, yy + 2, m, tt + 2.5); if (s > 6) S.px(a + 2, yy + 2, m, tt + 1.5); } }
  },
  // riveted metal panels
  panels(S, x, y, w, h, m, t, o) {
    o = o || NO; const r = S.r, pw = o.pw || 24, ph = o.ph || 18;
    for (let yy = y; yy < y + h; yy += ph) for (let xx = x; xx < x + w; xx += pw) { const tt = t + Math.round((r() - 0.5) * (o.v == null ? 1.6 : o.v)), ww = Math.min(pw, x + w - xx), hh = Math.min(ph, y + h - yy);
      S.box(xx, yy, ww, hh, m, tt);
      if (o.rivets !== false && ww > 6 && hh > 6) [[2, 2], [ww - 3, 2], [2, hh - 3], [ww - 3, hh - 3]].forEach(([a, b]) => { S.px(xx + a, yy + b, m, tt + 3, { n: [-0.5, -0.5] }); S.px(xx + a + 1, yy + b + 1, m, tt - 2.5); });
      if (o.streak) for (let k = 0; k < 2; k++) { const sx = xx + 3 + Math.floor(r() * (ww - 6)); S.rect(sx, yy + 2, 1, Math.floor(hh * (0.3 + r() * 0.5)), m, tt - 1.4); } }
  },
  // raised diamond plate
  grate(S, x, y, w, h, m, t) { S.rect(x, y, w, h, m, t); for (let yy = y + 1; yy < y + h; yy += 3) for (let xx = x + ((yy - y) % 6 === 1 ? 0 : 2); xx < x + w; xx += 4) { S.px(xx, yy, m, t + 2, { n: [-0.4, -0.5] }); S.px(xx + 1, yy + 1, m, t - 1.5); } },
  // a lumpy crack line with a lit lip under it
  crack(S, x, y, len, m, t, dir) { const r = S.r; let cx = x, cy = y; for (let k = 0; k < len; k++) { S.px(cx, cy, m, t - 3); S.px(cx, cy + 1, m, t + 0.8); if (dir === 'v') { cy++; if (r() < 0.45) cx += r() < 0.5 ? -1 : 1; } else { cx++; if (r() < 0.45) cy += r() < 0.5 ? -1 : 1; } } },
  rivet(S, x, y, m, t) { S.px(x, y, m, t + 3, { n: [-0.5, -0.5] }); S.px(x + 1, y, m, t); S.px(x, y + 1, m, t); S.px(x + 1, y + 1, m, t - 2.5, { n: [0.5, 0.5] }); },
};

// ───────── tiny workers: a rigged pixel person, ~26 art px tall, lit like everything else ─────────
// look: { skin, hair, top, bot, boot, apron, cap, hat, hood, robe } as [material, tone]; pose angles in radians
// (0 = limb hanging straight down, positive swings toward where the worker faces): aB/eB back arm, aF/eF front arm,
// lB/kB back leg, lF/kF front leg, lean, bob, tool (+ ta: tool angle offset)
const LOOK = {
  smith: { skin: ['skin', 5], hair: ['hair', 3], top: ['linen', 5], bot: ['leather', 3], apron: ['leather', 5], boot: ['hair', 2], beard: ['hair', 3] },
  worker: { skin: ['skin', 6], hair: ['hair', 4], top: ['denim', 5], bot: ['denim', 3], boot: ['hair', 2], cap: ['brass', 6] },
  nurse: { skin: ['skin', 7], hair: ['hair', 5], top: ['linen', 8], bot: ['linen', 6], boot: ['linen', 5], cap: ['linen', 9] },
  mage: { skin: ['skin', 6], hair: ['linen', 8], top: ['magic', 7], bot: ['magic', 5], boot: ['magic', 3], robe: 1, hood: ['magic', 6] },
  farmer: { skin: ['skin', 6], hair: ['hair', 5], top: ['leaf', 6], bot: ['denim', 4], boot: ['leather', 3], hat: ['sand', 7] },
  keeper: { skin: ['skin', 6], hair: ['hair', 3], top: ['tile', 7], bot: ['iron', 5], boot: ['iron', 3], cap: ['tile', 9] },
};
const HEAD = [' hhhh ', 'hhhhhh', 'hhsses', 'hsssss', ' sssm ', '  ss  '];
function limb(S, x, y, a1, l1, a2, l2, dir, m, t, w) {
  const ex = x + Math.sin(a1) * l1 * dir, ey = y + Math.cos(a1) * l1, hx = ex + Math.sin(a1 + a2) * l2 * dir, hy = ey + Math.cos(a1 + a2) * l2;
  S.line(x, y, ex, ey, m, t, { w }); S.line(ex, ey, hx, hy, m, t, { w }); return [Math.round(hx), Math.round(hy)];
}
function worker(S, x, y, look, p, dir) {
  if (M.PXR.noWorkers) return { hand: [x, y - 12], head: [x, y - 24], shoulder: [x, y - 19] };   // a room still being built shows its things, not its people
  const L = typeof look === 'string' ? LOOK[look] : look; p = p || {}; dir = dir || 1; const bob = Math.round(p.bob || 0), lean = p.lean || 0;
  const hipY = y - 12 + bob, shY = y - 21 + bob, sx = x + Math.round(lean * 3 * dir), hx = sx + Math.round((p.hx || 0) * dir), fl = dir < 0;
  const boot = (f, dk) => S.rect(dir > 0 ? f[0] - 1 : f[0] - 2, f[1] - 1, 4, 2, L.boot[0], L.boot[1] - dk);
  S.beg();
  if (!L.robe) { const b = limb(S, x - dir, hipY + 1, p.lB || 0, 5, p.kB || 0, 5, dir, L.bot[0], L.bot[1] - 1.6, 2); boot([b[0], Math.min(y, b[1] + 1)], 1); }
  limb(S, sx - 2 * dir, shY + 2, p.aB || 0, 5, p.eB || 0, 5, dir, L.top[0], L.top[1] - 1.6, 2);
  if (L.robe) { S.poly([[sx - 3, shY + 1], [sx + 4, shY + 1], [x + 5, y], [x - 4, y]], L.top[0], L.top[1]); S.rect(x - 4, y - 1, 9, 1, L.top[0], L.top[1] - 1.6); S.vl(x + (dir > 0 ? -2 : 3), shY + 6, y - shY - 7, L.top[0], L.top[1] - 1.2); }
  else { const f = limb(S, x + dir, hipY + 1, p.lF || 0, 5, p.kF || 0, 5, dir, L.bot[0], L.bot[1], 2); boot([f[0], Math.min(y, f[1] + 1)], 0);
    S.rect(Math.min(x, sx) - 3, hipY - 1, 7 + Math.abs(sx - x), 3, L.bot[0], L.bot[1] + 0.4); }
  // torso: round shoulders, a lit front, a belt
  S.cyl(sx - 3, shY + 1, 7, 9, L.top[0], L.top[1], { rim: 1.5 }); S.hl(sx - 2, shY, 5, L.top[0], L.top[1] + 0.8, { n: [0, -0.8] });
  if (!L.robe) S.hl(sx - 3, hipY - 2, 7, 'leather', 3);
  if (L.apron) { S.rect(sx - 2 + (dir > 0 ? 1 : 0), shY + 3, 4, 11, L.apron[0], L.apron[1]); S.hl(sx - 2 + (dir > 0 ? 1 : 0), shY + 3, 4, L.apron[0], L.apron[1] + 1); }
  // head (hand-drawn, facing right; mirrored for left)
  const hp = { h: [L.hair[0], L.hair[1]], s: [L.skin[0], L.skin[1]], e: ['ink', 1], m: [L.skin[0], L.skin[1] - 1.4] };
  if (L.beard) hp.m = [L.beard[0], L.beard[1]];
  S.spr(hx - 3, shY - 6, HEAD, hp, fl);
  if (L.beard) { S.px(hx + (fl ? -1 : 1), shY - 1, L.beard[0], L.beard[1]); S.px(hx + (fl ? -2 : 2), shY - 2, L.beard[0], L.beard[1]); }
  if (L.hood) { S.rect(hx - 3, shY - 7, 7, 3, L.hood[0], L.hood[1]); S.rect(fl ? hx + 2 : hx - 4, shY - 5, 2, 6, L.hood[0], L.hood[1] - 1); S.px(hx, shY - 8, L.hood[0], L.hood[1] + 1); }
  if (L.cap) { S.rect(hx - 3, shY - 7, 6, 2, L.cap[0], L.cap[1]); S.rect(fl ? hx - 5 : hx + 2, shY - 5, 3, 1, L.cap[0], L.cap[1] - 1.5); }
  if (L.hat) { S.rect(hx - 5, shY - 5, 11, 1, L.hat[0], L.hat[1]); S.rect(hx - 3, shY - 8, 7, 3, L.hat[0], L.hat[1] + 0.6); S.hl(hx - 3, shY - 6, 7, 'crimson', 6); }
  // front arm, hand
  const hand = limb(S, sx + dir, shY + 2, p.aF || 0, 5, p.eF || 0, 5, dir, L.top[0], L.top[1] + 0.6, 2);
  S.rect(hand[0], hand[1], 2, 2, L.skin[0], L.skin[1]);
  S.end({ lit: 1 }); const ret = { hand, head: [hx, shY - 3], shoulder: [sx + dir, shY + 2] };
  if (p.tool) { const a = (p.aF || 0) + (p.eF || 0) + (p.ta || 0), dx = Math.sin(a) * dir, dy = Math.cos(a), hx0 = hand[0] + 0.5, hy0 = hand[1] + 0.5;
    S.beg(); const tx = Math.round(hx0 + dx * 8), ty = Math.round(hy0 + dy * 8);
    if (p.tool === 'hammer') { S.line(hx0, hy0, tx, ty, 'wood', 6); const px = -dy, py = dx; for (let k = -3; k <= 3; k++) for (let q = 0; q < 3; q++) S.px(tx + px * k + dx * (q - 1), ty + py * k + dy * (q - 1), 'iron', q === 0 ? 9 : 6); }
    else if (p.tool === 'wrench') { S.line(hx0, hy0, tx, ty, 'iron', 7); S.rect(tx - 1, ty - 1, 3, 3, 'iron', 8); S.px(tx, ty, 'iron', 2); }
    else if (p.tool === 'staff') { S.line(hx0, hy0 + 7, hx0 + dx * 2, hy0 - 13, 'wood', 6); S.rect(Math.round(hx0 + dx * 2) - 1, Math.round(hy0) - 16, 3, 3, 'arcane', 9, { e: 255 }); S.px(Math.round(hx0 + dx * 2), Math.round(hy0) - 15, 'arcane', 11, { e: 255 }); }
    else if (p.tool === 'board') { const bx = hand[0] - (dir > 0 ? 0 : 5); S.rect(bx, hand[1] - 6, 6, 8, 'paper', 8); S.hl(bx, hand[1] - 6, 6, 'brass', 7); for (let k = 0; k < 3; k++) S.hl(bx + 1, hand[1] - 4 + k * 2, 4, 'paper', 5); }
    else if (p.tool === 'can') { S.rect(hand[0] - 2, hand[1], 6, 5, 'iron', 7); S.hl(hand[0] - 2, hand[1], 6, 'iron', 9); S.line(hand[0] + (dir > 0 ? 4 : -3), hand[1] + 1, hand[0] + (dir > 0 ? 8 : -7), hand[1] - 2, 'iron', 6); }
    else if (p.tool === 'box') { const bx = hand[0] - (dir > 0 ? 1 : 6); S.box(bx, hand[1] - 7, 8, 7, 'wood', 6); S.hl(bx, hand[1] - 4, 8, 'wood', 4); S.px(bx + 3, hand[1] - 6, 'crimson', 7); }
    else if (p.tool === 'mop') { S.line(hx0, hy0 - 8, hx0 + dx * 6, hy0 + 10, 'wood', 6); S.rect(Math.round(hx0 + dx * 6) - 2, Math.round(hy0) + 10, 5, 2, 'linen', 7); }
    S.end({ lit: 1 }); }
  return ret;
}
// walk cycle poses for a worker moving at `speed` art px / s: returns x, dir and pose, pausing at the ends
function stroll(t, x0, x1, speed, seed, pause) {
  const span = x1 - x0, per = span / speed, pz = pause || 1.2, cyc = 2 * (per + pz), q = ((t + seed * 7.3) % cyc + cyc) % cyc;
  let x, dir, walking; if (q < per) { x = x0 + q * speed; dir = 1; walking = 1; } else if (q < per + pz) { x = x1; dir = 1; walking = 0; } else if (q < 2 * per + pz) { x = x1 - (q - per - pz) * speed; dir = -1; walking = 1; } else { x = x0; dir = -1; walking = 0; }
  const ph = (t * speed / 5) * Math.PI, s = walking ? Math.sin(ph) : 0;
  return { x: Math.round(x), dir, walking, pose: { lF: s * 0.55, kF: Math.max(0, -s) * 0.6, lB: -s * 0.55, kB: Math.max(0, s) * 0.6, aF: -s * 0.4, eF: -0.3, aB: s * 0.4, eB: -0.3, bob: walking ? -Math.abs(Math.cos(ph)) + 0.4 : 0 } };
}

// ───────── scene registry ─────────
// PXR.def(key, { style, amb: [base, fromCeiling], paint(S, sc), anim(D, t, rs, o) })
// paint: S is a painter over the static layers; sc.light({...}) / sc.emit({...}) / sc.shaft({...}) declare what lives.
// anim: D paints into this frame's layers; rs.burst(kind, x, y, n, opts) spawns particles; rs.flash(i, amt) kicks a light.
const DEFS = {}, BAKED = {};
const PXR = M.PXR = { W, H, FY, FZ, RAMPS, MI, TX, LOOK, worker, stroll, vnoise, n1, rng, hstr, bayer, col32, def: (k, d) => { DEFS[k] = Object.assign({ key: k }, d); delete BAKED[k]; return DEFS[k]; }, has: (k) => !!DEFS[k], defs: DEFS };

function lightFn(L) {
  const ph = L.ph || 0;
  switch (L.fl) {
    case 'fire': return (t) => 0.84 + 0.1 * n1(t * 6.5 + ph) + 0.06 * n1(t * 17 + ph * 3);
    case 'candle': return (t) => 0.9 + 0.08 * n1(t * 9 + ph) + 0.03 * n1(t * 23 + ph);
    case 'pulse': return (t) => 1 + (L.amp || 0.2) * Math.sin(t * (L.sp || 2) + ph);
    case 'buzz': return (t) => { const c = Math.floor((t + ph * 3) / 9), q = (t + ph * 3) - c * 9, on = h2(c, 3, 11) < 0.55 && q < 0.5 ? (h2(Math.floor(t * 24), c, 5) < 0.45 ? 0.25 : 1) : 1; return on * (0.98 + 0.02 * Math.sin(t * 50)); };
    case 'screen': return (t) => 0.94 + 0.04 * Math.sin(t * 3 + ph) + 0.02 * n1(t * 30);
    default: return () => 1;
  }
}

function bake(key) {
  use(key); if (BAKED[key]) return BAKED[key];
  const D = DEFS[key], L = layers(), S = new Pn(L, hstr(key));
  const sc = { key, lights: [], emit: [], shafts: [], amb: D.amb || [0.42, 0.34], fields: [] };
  sc.emits = [];
  sc.light = (o) => { sc.lights.push(Object.assign({ z: 12, r: 60, i: 1, c: '#ffd8a0', tint: 0.3 }, o)); return sc.lights.length - 1; };
  sc.emit = (o) => { sc.emits.push(o); return sc; };
  sc.shaft = (o) => { sc.shafts.push(o); return sc; };
  sc.field = (o) => { sc.fields.push(o); return sc; };
  S.sc = sc; D.paint(S, sc);
  if (!D.noFloor) { const Y = L.wall; for (let y = FY; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (!Y.m[p] || Y.e[p]) continue; Y.f[p] = 1; Y.nx[p] = 0; Y.ny[p] = -127; Y.d[p] = (y - FY) * FZ; } }
  const lights = sc.lights.map((l, i) => Object.assign(l, { idx: i, f: lightFn(l), rgb: rgbOf(l.c) }));
  const LP = new Float32Array(lights.length * 6); lights.forEach((l, i) => { LP.set([l.x, l.y, l.z, l.r, l.tint || 0, 0], i * 6); });
  const B = { key, D, sc, lights, LP, L: {} };
  LAYS.forEach(([k]) => {
    const Y = L[k], idx = []; for (let p = 0; p < N; p++) if (Y.m[p]) idx.push(p);
    const n = idx.length, pi = new Int32Array(idx), xs = new Uint8Array(n), ys = new Uint8Array(n), base = new Uint16Array(n), len1 = new Uint8Array(n), s0 = new Float32Array(n), gl = new Int8Array(n), tw = new Float32Array(n), td = new Uint8Array(n), jx = new Int32Array(N).fill(-1);
    for (let j = 0; j < n; j++) { const p = pi[j], R = MATS[Y.m[p]]; jx[p] = j; xs[j] = p % W; ys[j] = (p / W) | 0; base[j] = R.o; len1[j] = R.n - 1;
      const e = Y.e[p]; if (e) { s0[j] = Y.t[p]; gl[j] = e === 255 ? -1 : e; continue; }
      const nx = Y.nx[p] / 127, ny = Y.ny[p] / 127, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), amb = sc.amb[0] + sc.amb[1] * Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
      s0[j] = Y.t[p] + GAIN * (amb - L0); }
    // per light: the static weight of every pixel it reaches (diffuse with wrap, specular on shiny ramps)
    // sparse: only the pixels a light reaches
    const WL = lights.map((l) => { const js = [], ws = [];
      for (let j = 0; j < n; j++) { if (gl[j]) continue; const p = pi[j], r = pixW(Y, p, xs[j], ys[j], l); if (r > 0.002) { js.push(j); ws.push(r); if (l.tint && r * l.tint > tw[j]) { tw[j] = r * l.tint; td[j] = l.idx + 1; } } }
      if (js.length && l.bake !== false) for (let q = 0; q < js.length; q++) s0[js[q]] += GAIN * ws[q] * (l.i || 1);   // each light's resting value is baked in; frames add only the change (bake: false → frames add all of it)
      return js.length ? { j: new Int32Array(js), w: new Float32Array(ws) } : null; });
    const SH = sc.shafts.map(sh => { const js = [], ws = []; for (let j = 0; j < n; j++) { const v = beamAt(sh, xs[j], ys[j]); if (v > 0.002) { js.push(j); ws.push(v); } } return { j: new Int32Array(js), w: new Float32Array(ws) }; });
    B.L[k] = { Y, n, pi, xs, ys, base, len1, s0, gl, WL, tw, td, jx, SH, par: Y.par, s: new Float32Array(n) };
  });
  B.HZ = sc.shafts.map(sh => { const ps = [], ws = []; for (let y = Math.max(0, sh.y0 | 0); y < Math.min(H, Math.ceil(sh.y1)); y++) for (let x = 0; x < W; x++) { const v = beamAt(sh, x, y); if (v > 0.002) { ps.push(y * W + x); ws.push(v); } } return { p: new Int32Array(ps), w: new Float32Array(ws) }; });
  return (BAKED[key] = B);
}
// how much of light l reaches pixel p of layer Y (0…~1.6), in light units (×GAIN later)
function pixW(Y, p, x, y, l) {
  const f = Y.f[p], px = x + 0.5, py = f ? FY : y + 0.5, pz = Y.d[p], dx = l.x - px, dy = l.y - py, dz = l.z - pz, d2 = dx * dx + dy * dy + dz * dz, r = l.r;
  if (d2 >= r * r) return 0; const d = Math.sqrt(d2) || 1, att = (1 - d / r) * (1 - d / r);
  const nx = Y.nx[p] / 127, ny = Y.ny[p] / 127, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), ndl = (nx * dx + ny * dy + nz * dz) / d;
  let w = att * Math.max(0, (ndl + WRAP) / (1 + WRAP));
  const sp = MATS[Y.m[p]].sp; if (sp) { let hx = dx / d, hy = dy / d, hz = dz / d + 1; const hl = Math.hypot(hx, hy, hz) || 1; const nh = (nx * hx + ny * hy + nz * hz) / hl; if (nh > 0) w += att * sp * Math.pow(nh, 18) * 1.6; }
  return w;
}

// ───────── particles: single pixels that walk a colour ramp over their life ─────────
// kinds: ember (rises, glows), spark (flies, falls, bounces, glows), steam (dithered puff), bubble, drip, dust (only shows
// where it is lit), soul (rising wisp), leaf, glint (a 4-point twinkle), mist
const PK = {
  ember: { g: -8, drag: 0.5, ramp: ['fire', [11, 10, 9, 8, 7, 6, 5, 4, 3]], glow: 1, light: [6, 0.25, '#ff9a40'], wob: 6 },
  spark: { g: 90, drag: 0.2, ramp: ['fire', [11, 11, 10, 9, 8, 7, 6]], glow: 1, trail: 1, bounce: 0.35, light: [8, 0.4, '#ffc060'] },
  steam: { g: -10, drag: 1.4, puff: 1, ramp: ['linen', [9, 8, 7, 6, 5]], grow: 5 },
  bubble: { g: -14, drag: 0.8, ramp: ['water', [11, 10, 10, 9]], ringy: 1, wob: 10 },
  drip: { g: 120, drag: 0, ramp: ['water', [10, 10, 9]], splash: 1 },
  dust: { g: 1.5, drag: 1.5, ramp: ['lamp', [10, 10, 9, 9, 8]], wob: 3, litOnly: 1 },
  soul: { g: -12, drag: 0.6, ramp: ['arcane', [11, 10, 9, 8, 7, 6, 5]], glow: 1, trail: 2, wob: 8, light: [10, 0.3, '#9a7cff'] },
  leaf: { g: 10, drag: 1.8, ramp: ['leaf', [9, 8, 8, 7, 6]], wob: 14, sz: 2 },
  glint: { g: 0, drag: 0, ramp: ['lamp', [11, 11, 10, 9]], glow: 1, star: 1 },
  mist: { g: -2, drag: 2, puff: 1, ramp: ['ice', [10, 9, 8, 7]], grow: 3 },
  heal: { g: -10, drag: 0.8, ramp: ['screen', [10, 10, 9, 8, 7]], glow: 1, plus: 1 },
  rune: { g: -7, drag: 0.8, ramp: ['arcane', [11, 10, 9, 8, 7, 6]], glow: 1, rune: 1, wob: 4 },
};
function Parts() { return { a: [], burst(kind, x, y, n, o) { o = o || NO; const K = PK[kind]; for (let i = 0; i < (n == null ? 1 : n); i++) { if (this.a.length > 260) this.a.shift(); const ang = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.spread != null ? o.spread : 1) : Math.random() * Math.PI * 2, sp = (o.sp || 20) * (0.4 + Math.random() * 0.8);
  this.a.push({ k: kind, K, x: x + (Math.random() - 0.5) * (o.w || 0), y: y + (Math.random() - 0.5) * (o.h || 0), vx: Math.sin(ang) * sp + (o.vx || 0), vy: -Math.cos(ang) * sp + (o.vy || 0), t: 0, life: (o.life || 1.2) * (0.6 + Math.random() * 0.8), ph: Math.random() * 7, px: x, py: y, fl: o.floor != null ? o.floor : FY + 2, sz: o.sz || K.sz || 1 }); } } }; }
function stepParts(P, dt) {
  const a = P.a; for (let i = a.length - 1; i >= 0; i--) { const q = a[i], K = q.K; q.t += dt; if (q.t >= q.life) { a.splice(i, 1); continue; }
    q.px = q.x; q.py = q.y; q.vy += K.g * dt; const dr = Math.exp(-K.drag * dt); q.vx *= dr; q.vy *= K.g < 0 ? dr : 1; q.x += (q.vx + (K.wob ? Math.sin(q.t * 3 + q.ph) * K.wob * 0.3 : 0)) * dt; q.y += q.vy * dt;
    if (K.bounce && q.y > q.fl && q.vy > 0) { q.y = q.fl; q.vy *= -K.bounce; q.vx *= 0.6; if (Math.abs(q.vy) < 6) q.vy = 0; }
    if (K.splash && q.y > q.fl) { a.splice(i, 1); for (let k = 0; k < 3; k++) P.a.push({ k: 'drip', K: PK.bubble, x: q.x + (k - 1), y: q.fl - 1, vx: (k - 1) * 16, vy: -18, t: 0, life: 0.25, ph: 0, px: q.x, py: q.fl, fl: q.fl, sz: 1 }); } }
}

// ───────── per-slot state ─────────
const SLOTS = {};
function slot(id, key) {
  use(key); let s = SLOTS[id]; if (s && s.key === key) return s;
  // headless (node tools): no canvas, just the pixel buffer
  const dom = typeof document !== 'undefined' && typeof ImageData !== 'undefined', cv = dom ? document.createElement('canvas') : null; if (cv) { cv.width = W; cv.height = H; }
  const cx = cv ? cv.getContext('2d') : null, img = cx ? cx.createImageData(W, H) : { width: W, height: H, data: new Uint8ClampedArray(N * 4) };
  s = SLOTS[id] = { id, key, cv, cx, img, u32: new Uint32Array(img.data.buffer), P: Parts(), lt: null, seed: (hstr(id) % 1000) / 1000, kick: {}, ev: {}, st: {}, fn: 0, hov: 0 };
  s.burst = (k, x, y, n, o) => s.P.burst(k, x, y, n, o);
  s.flash = (i, a) => { s.kick[i] = Math.max(s.kick[i] || 0, a); };
  return s;
}
// dyn layers are shared: slots render one at a time and each paints its moving things fresh every frame
const dynSet = () => { const L = layers(), P = new Pn(L, 99); LAYS.forEach(([k]) => { L[k].pl = []; L[k].st = new Uint32Array(N); L[k].stamp = 1; }); return { L, P }; };
let { L: DL, P: DP } = dynSet();
// per-size buffers; use(key) makes a def's size current
const SIZES = { '150x105x90': { W: 150, H: 105, FY: 90, DITH, DL, DP } }; let CUR = '150x105x90';
function use(key) {
  const d = DEFS[key] || NO, w = d.size ? d.size[0] : 150, h = d.size ? d.size[1] : 105, fy = d.fy != null ? d.fy : d.size ? h : 90, k = w + 'x' + h + 'x' + fy;
  if (k === CUR) return; CUR = k; W = w; H = h; N = w * h; FY = fy;
  let z = SIZES[k]; if (!z) { const dd = dynSet(); z = SIZES[k] = { W, H, FY, DITH: mkDith(), DL: dd.L, DP: dd.P }; }
  DITH = z.DITH; DL = z.DL; DP = z.DP;
}
PXR.use = use;

// ───────── one frame of one room ─────────
function render(s, t, o) {
  use(s.key); const B = bake(s.key), D = B.D, sc = B.sc, out = s.u32, reduced = M.PJ && M.PJ.reduced;
  if (D.clear) out.fill(0);   // a def with a see-through background (the main base on the skyline)
  const dt = s.lt == null ? 0 : clamp(t - s.lt, 0, 0.1); s.lt = t; s.fn++;
  // light intensities: flicker × kicks (flashes decay) × room events
  Object.keys(s.kick).forEach(k => { s.kick[k] *= Math.exp(-dt * 7); if (s.kick[k] < 0.01) delete s.kick[k]; });
  const ev = s.ev, now = t, hovK = s.hov += ((o.hov ? 1 : 0) - s.hov) * (1 - Math.exp(-dt * 8));
  const selA = ev.sel != null ? Math.max(0, 1 - (now - ev.sel) / 0.7) : 0, bootT = ev.built != null ? now - ev.built : 9;
  // animated content into the shared dyn layers (before the lights: anim may set s.mul[i] or kick lights)
  LAYS.forEach(([k]) => clearLay(DL[k])); DP.c = DL.mid; DP.id = 1; DP.dx = DP.dy = 0;
  const moving = []; s.dl = moving; s.mul = s.mul || {};
  s.fireAge = o.fireT != null ? t - o.fireT : 99;   // defence rooms: seconds since this room's weapon last fired (raids)
  PXR.noWorkers = !!o.noNpc; if (D.anim) D.anim(DP, t + s.seed * 13, s, o); PXR.noWorkers = false;
  // a room dug out of special terrain keeps a seam of it along the floor (PXR.TILEF[tile], painted into the wall layer's floor rows)
  if (o.tile && PXR.TILEF[o.tile]) { DP.c = DL.wall; PXR.TILEF[o.tile](DP, t + s.seed * 13, s); DP.c = DL.mid; }
  const I = B.lights.map((l, i) => { let v = reduced ? 1 : l.f(t + s.seed * 13); v *= s.mul[i] == null ? 1 : s.mul[i]; v += (s.kick[i] || 0) + (s.kick.all || 0);
    if (bootT < 2.6) { const on = 0.35 + i * 0.32; v *= bootT < on ? 0.05 : bootT < on + 0.3 ? (h2(Math.floor(bootT * 30), i, 3) < 0.5 ? 0.15 : 1) : 1; }
    return v * (l.i || 1) * (1 + 0.18 * hovK + 1.1 * selA * selA); });
  const ambK = (bootT < 2.6 ? clamp(bootT / 2.2, 0.25, 1) : 1) * (1 + 0.1 * hovK);
  stepParts(s.P, dt);
  // emitters
  if (!reduced) sc.emits.forEach(em => { em.acc = (em.acc || {}); const a = (em.acc[s.id] || 0) + dt * (em.rate || 4); const n = Math.floor(a); em.acc[s.id] = a - n; if (n > 0 && (!em.when || em.when(t + s.seed * 13, s))) s.P.burst(em.k, em.x, em.y, n, em); });
  // glowing particles light what is around them
  s.P.a.forEach(q => { const L = q.K.light; if (L && q.t < q.life * 0.8) moving.push({ x: q.x, y: q.y, z: 14, r: L[0], i: L[1] * (1 - q.t / q.life), rgb: rgbOf(L[2]), tint: 0.5 }); });
  const par = o.par || 0, shafts = sc.shafts;
  // composite: each layer's static pixels, then its animated pixels, back to front
  for (let li = 0; li < LAYS.length; li++) {
    const k = LAYS[li][0], Lb = B.L[k], off = Math.round(par * Lb.par * 2);
    if (Lb.n) {
      const sb = Lb.s; sb.set(Lb.s0); const ak = GAIN * (ambK - 1) * 0.5;
      if (ak) for (let j = 0; j < Lb.n; j++) if (!Lb.gl[j]) sb[j] += ak;
      for (let i = 0; i < B.lights.length; i++) { const L = Lb.WL[i]; if (!L) continue; const g = GAIN * (I[i] - (B.lights[i].bake === false ? 0 : B.lights[i].i || 1)); if (g > -0.01 && g < 0.01) continue; const J = L.j, Wt = L.w; for (let q = 0; q < J.length; q++) sb[J[q]] += g * Wt[q]; }
      const jx = Lb.jx;
      moving.forEach(l => { const x0 = Math.max(0, Math.floor(l.x - l.r)), x1 = Math.min(W - 1, Math.ceil(l.x + l.r)), y0 = Math.max(0, Math.floor(l.y - l.r)), y1 = Math.min(H - 1, Math.ceil(l.y + l.r));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const j = jx[y * W + x]; if (j < 0 || Lb.gl[j]) continue; const v = pixW(Lb.Y, y * W + x, x, y, l); if (v) sb[j] += GAIN * v * l.i; } });
      shafts.forEach((sh, si) => { const a = sh.f ? sh.f(t + s.seed * 13) : 1; if (a <= 0) return; const P = Lb.SH[si], g = GAIN * a * (sh.i || 0.4), xs = Lb.xs, ys = Lb.ys;
        for (let q = 0; q < P.j.length; q++) { const j = P.j[q]; sb[j] += g * P.w[q] * mote(xs[j], ys[j], t); } });
      sc.fields.forEach(fd => { if (fd.lay && fd.lay !== k) return; const tt = t + s.seed * 13; for (let y = Math.max(0, fd.y0); y < Math.min(H, fd.y1); y++) for (let x = Math.max(0, fd.x0); x < Math.min(W, fd.x1); x++) { const j = jx[y * W + x]; if (j < 0 || Lb.gl[j]) continue; const v = fd.fn(x, y, tt, s); if (v) sb[j] += GAIN * v; } });
      resolve(Lb, sb, out, off, I, B.lights, t, k === 'wall' ? par : 0);
    }
    resolveDyn(DL[k], out, B, I, moving, sc, ambK, off, t);
    if (k === 'mid') drawParts(s, out, B, I);
  }
  // shaft haze on top: a dithered wash of the beam colour over dark pixels
  shafts.forEach((sh, si) => { const a = sh.f ? sh.f(t + s.seed * 13) : 1; if (a <= 0) return; const c = sh.rgb || (sh.rgb = rgbOf(sh.c || '#fff0c0')), Z = B.HZ[si], k = a * (sh.haze || 0.5);
    for (let q = 0; q < Z.p.length; q++) { const p = Z.p[q], v = Z.w[q] * k * mote(p % W, (p / W) | 0, t), aq = Math.min(0.45, Math.floor(v * 8) / 8); if (aq > 0) blendPx(out, p, c, aq); } });
  if (D.post) D.post(out, t + s.seed * 13, s, o, I);
  if (!D.noFrame) frame(out, s, t, o, hovK);
}
// a beam's static shape (0…1) at a pixel; the drifting dust in it is a cheap per-frame term (mote)
function beamAt(sh, x, y) { if (y < sh.y0 || y >= sh.y1) return 0; const k = (y - sh.y0) / (sh.y1 - sh.y0), hw = sh.w0 + (sh.w1 - sh.w0) * k, cx = sh.x + (sh.dx || 0) * k, u = Math.abs(x + 0.5 - cx) / hw; if (u >= 1) return 0; return (1 - u * u) * (sh.fade ? 1 - k * sh.fade : 1); }
const mote = (x, y, t) => 0.78 + 0.22 * Math.sin(x * 0.61 + y * 0.23 - t * 1.3) * Math.sin(y * 0.17 - x * 0.11 + t * 0.7);
function inShaft(sh, x, y, t) { const b = beamAt(sh, x, y); return b ? b * mote(x, y, t) : 0; }
function blendPx(out, p, c, a) { const v = out[p], r = v & 255, g = (v >> 8) & 255, b = (v >> 16) & 255; out[p] = (0xff000000 | (Math.round(b + (c[2] - b) * a) << 16) | (Math.round(g + (c[1] - g) * a) << 8) | Math.round(r + (c[0] - r) * a)) >>> 0; }
function addPx(out, p, c, a) { const v = out[p], r = Math.min(255, (v & 255) + c[0] * a), g = Math.min(255, ((v >> 8) & 255) + c[1] * a), b = Math.min(255, ((v >> 16) & 255) + c[2] * a); out[p] = (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
PXR.blendPx = blendPx; PXR.addPx = addPx;

function resolve(Lb, sb, out, off, I, lights, t, floorPar) {
  const { n, pi, xs, ys, base, len1, gl, tw, td, Y } = Lb;
  for (let j = 0; j < n; j++) {
    const p = pi[j], x = xs[j], y = ys[j]; let v;
    if (gl[j]) v = gl[j] > 0 ? Lb.s0[j] + 2.2 * ((I[gl[j] - 1] || 1) - 1) : Lb.s0[j]; else v = sb[j];
    let k = (v + DITH[p]) | 0; if (v + DITH[p] < 0) k = 0; if (k > len1[j]) k = len1[j];
    let c = LUT[base[j] + k];
    const o2 = floorPar && y >= FY ? Math.round(floorPar * (y - FY) / (H - FY) * 2) : off, xx = x + o2; if (xx < 0 || xx >= W) continue;
    const q = p + o2;
    // coloured light: the lit side takes the light's hue in hard sixth-steps (no dither — that would checker)
    if (td[j] && !gl[j]) { const L = lights[td[j] - 1], a = tw[j] * I[L.idx] * 0.9; if (a > 0.08) { const aq = Math.min(0.5, Math.round(a * 6) / 6); if (aq > 0) { out[q] = c; blendPx(out, q, L.rgb, aq); continue; } } }
    out[q] = c;
  }
}
// animated pixels: lit live over this frame's painted list, with the light parameters unpacked once per room
function resolveDyn(Y, out, B, I, moving, sc, ambK, off, t) {
  const pl = Y.pl; if (!pl.length) return; const LP = B.LP, nl = B.lights.length, a0 = sc.amb[0] * ambK, a1 = sc.amb[1] * ambK;
  for (let q = 0; q < pl.length; q++) {
    const p = pl[q], m = Y.m[p]; if (!m) continue; const R = MATS[m], e = Y.e[p], x = p % W, y = (p / W) | 0; let v, tl = -1, ta = 0;
    if (e) v = e === 255 ? Y.t[p] : Y.t[p] + 2.2 * ((I[e - 1] || 1) - 1);
    else {
      const nx = Y.nx[p] / 127, ny = Y.ny[p] / 127, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), pz = Y.d[p], px = x + 0.5, py = y + 0.5, sp = R.sp;
      let lum = a0 + a1 * Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
      for (let i = 0, o = 0; i < nl; i++, o += 6) {
        if (I[i] < 0.001) continue;
        const dx = LP[o] - px, dy = LP[o + 1] - py, dz = LP[o + 2] - pz, d2 = dx * dx + dy * dy + dz * dz, r = LP[o + 3]; if (d2 >= r * r) continue;
        const d = Math.sqrt(d2) || 1, f = 1 - d / r, att = f * f, ndl = (nx * dx + ny * dy + nz * dz) / d; let w = att * Math.max(0, (ndl + WRAP) / (1 + WRAP));
        if (sp) { const hx = dx / d, hy = dy / d, hz = dz / d + 1, hl = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1, nh = (nx * hx + ny * hy + nz * hz) / hl; if (nh > 0) w += att * sp * Math.pow(nh, 18) * 1.6; }
        const c = w * I[i]; lum += c; const tt = c * LP[o + 4]; if (tt > ta) { ta = tt; tl = i; }
      }
      for (let k = 0; k < moving.length; k++) { const l = moving[k]; if (Math.abs(x - l.x) < l.r && Math.abs(y - l.y) < l.r) lum += pixW(Y, p, x, y, l) * l.i; }
      v = Y.t[p] + GAIN * (lum - L0);
    }
    let k = Math.floor(v + DITH[p]); if (k < 0) k = 0; if (k > R.n - 1) k = R.n - 1; const xx = x + off; if (xx < 0 || xx >= W) continue; out[p + off] = LUT[R.o + k];
    if (tl >= 0 && ta * 0.9 > 0.08) { const aq = Math.min(0.5, Math.round(ta * 0.9 * 6) / 6); if (aq > 0) blendPx(out, p + off, B.lights[tl].rgb, aq); }
  }
}
function drawParts(s, out, B, I) {
  s.P.a.forEach(q => { const K = q.K, life = q.t / q.life, R = MATS[MI[K.ramp[0]]], st = K.ramp[1], k = st[Math.min(st.length - 1, Math.floor(life * st.length))], c = LUT[R.o + clamp(k, 0, R.n - 1)];
    const x = Math.round(q.x), y = Math.round(q.y); if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return;
    if (K.litOnly) { const a = Math.sin(life * Math.PI); if (a < 0.3 || (bayer(x, y) > a)) return; }
    if (K.puff) { const r = 1 + Math.round(life * (K.grow || 4)), a = (1 - life) * 0.8; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { if (xx * xx + yy * yy > r * r) continue; const X = x + xx, Y2 = y + yy; if (X < 0 || Y2 < 0 || X >= W || Y2 >= H) continue; const edge = (xx * xx + yy * yy) / (r * r); if (a * (1 - edge * 0.6) > bayer(X, Y2)) out[Y2 * W + X] = LUT[R.o + clamp(k - (edge > 0.6 ? 1 : 0), 0, R.n - 1)]; } return; }
    if (K.ringy) { out[(y - 1) * W + x] = c; out[y * W + x - 1] = c; out[y * W + x + 1] = LUT[R.o + clamp(k - 2, 0, R.n - 1)]; out[(y + 1) * W + x] = LUT[R.o + clamp(k - 2, 0, R.n - 1)]; return; }
    if (K.star) { const a = Math.sin(life * Math.PI); out[y * W + x] = c; if (a > 0.5) { out[(y - 1) * W + x] = out[(y + 1) * W + x] = out[y * W + x - 1] = out[y * W + x + 1] = LUT[R.o + clamp(k - 2, 0, R.n - 1)]; } return; }
    if (K.plus) { out[y * W + x] = c; out[(y - 1) * W + x] = out[(y + 1) * W + x] = out[y * W + x - 1] = out[y * W + x + 1] = LUT[R.o + clamp(k - 1, 0, R.n - 1)]; return; }
    if (K.rune) { const g = (q.ph * 10) & 7; out[y * W + x] = c; if (g & 1) out[(y - 1) * W + x] = c; if (g & 2) out[y * W + x + 1] = c; if (g & 4) out[(y + 1) * W + x - 1] = c; return; }
    if (K.trail) { const tx = Math.round(q.px - (q.x - q.px) * 1.5), ty = Math.round(q.py - (q.y - q.py) * 1.5); if (tx > 0 && ty > 0 && tx < W && ty < H) out[ty * W + tx] = LUT[R.o + clamp(k - 3, 0, R.n - 1)]; }
    out[y * W + x] = c; if (q.sz > 1) out[y * W + x + 1] = LUT[R.o + clamp(k - 1, 0, R.n - 1)];
  });
}

// ───────── the frame: ink border, a bevelled trim, the quality line (a glint runs round rare+ rooms) ─────────
const QC = ['#8791a6', '#6fd46a', '#4f8fff', '#b86bff', '#ff9a3c', '#ff4a5a', '#c9a24a'];   // … 神话, 不朽 (boss buildings, mc-q7.js)
function frame(out, s, t, o, hovK) {
  const B = BAKED[s.key], q = (M.BUILDINGS[s.key] || {}).q || 0, ink = abgr('#07060f'), dark = abgr('#1a1640'), lit = abgr('#3d3a8c'), qc = rgbOf(QC[q]), q32 = abgr(QC[q]);
  const set = (x, y, c) => { out[y * W + x] = c; };
  for (let x = 0; x < W; x++) { set(x, 0, ink); set(x, 1, ink); set(x, H - 1, ink); set(x, H - 2, ink); }
  for (let y = 0; y < H; y++) { set(0, y, ink); set(1, y, ink); set(W - 1, y, ink); set(W - 2, y, ink); }
  for (let x = 2; x < W - 2; x++) { set(x, 2, lit); set(x, H - 3, dark); } for (let y = 2; y < H - 2; y++) { set(2, y, lit); set(W - 3, y, dark); }
  if (q >= 1 || hovK > 0.05) { const a = q >= 1 ? 1 : 0; for (let x = 3; x < W - 3; x++) { if (a) { set(x, 3, q32); set(x, H - 4, q32); } } for (let y = 3; y < H - 3; y++) { if (a) { set(3, y, q32); set(W - 4, y, q32); } } }
  // glints: rare+ always, anything while hovered; they run the inner perimeter
  const glints = q >= 3 ? (q >= 4 ? 3 : 2) : 0, per = 2 * (W - 8 + H - 8), g = [];
  for (let i = 0; i < glints; i++) g.push(((t * 0.22 + i / glints) % 1) * per);
  if (hovK > 0.05) g.push(((t * 0.5) % 1) * per);
  g.forEach(d => { for (let k = -5; k <= 5; k++) { const dd = ((d + k) % per + per) % per, a = 1 - Math.abs(k) / 6; let x, y; if (dd < W - 8) { x = 4 + dd; y = 3; } else if (dd < W - 8 + H - 8) { x = W - 4; y = 4 + dd - (W - 8); } else if (dd < 2 * (W - 8) + H - 8) { x = W - 4 - (dd - (W - 8) - (H - 8)); y = H - 4; } else { x = 3; y = H - 4 - (dd - 2 * (W - 8) - (H - 8)); }
    blendPx(out, Math.round(y) * W + Math.round(x), [255, 255, 255], Math.min(1, a * 0.9)); if (Math.abs(k) < 2) blendPx(out, Math.round(y) * W + Math.round(x), qc, 0); } });
  if (q >= 3) [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]].forEach(([x, y], i) => { const a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); set(x, y, a > 0.7 ? abgr('#ffffff') : q32); if (a > 0.85) { set(x + 1, y, q32); set(x - 1, y, q32); set(x, y + 1, q32); set(x, y - 1, q32); } });
}

// ───────── drawing into the base ─────────
const FB = { t: -1, ms: 0 }; PXR.BUDGET = 4;
// o: { seed, fireT, noNpc, par (camera offset −1…1), hov, sel } — called from mc-base.js drawRoomPx for every built room
PXR.draw = function (ctx, X, Y, key, t, o, id, zoom) {
  // off screen: nothing to paint (the whole grid is walked every frame)
  use(key); const m = ctx.getTransform(), vw = ctx.canvas.width, vh = ctx.canvas.height, sx0 = m.a * X + m.e, sy0 = m.d * Y + m.f, sx1 = sx0 + m.a * W * 2, sy1 = sy0 + m.d * H * 2;
  if (sx1 < 0 || sy1 < 0 || sx0 > vw || sy0 > vh) return;
  const s = slot(id, key);
  // on screen small (zoomed out), a room refreshes every few frames, staggered; close up, every frame. On top, a per-frame
  // budget: once rooms have used BUDGET ms this frame the rest keep last frame's picture (none waits more than 0.2 s)
  if (t !== FB.t) { FB.t = t; FB.ms = 0; }
  const every = (zoom || 1) < 0.7 ? 4 : (zoom || 1) < 0.9 ? 3 : (zoom || 1) < 1.3 ? 2 : 1, stale = s.lr == null ? 9 : t - s.lr;
  const skip = s.fn > 0 && stale < 0.2 && ((every > 1 && (s.fn + (hstr(id) % every)) % every !== 0) || FB.ms > PXR.BUDGET);
  if (skip) s.fn++; else { const t0 = performance.now(); render(s, t, o || NO); s.cx.putImageData(s.img, 0, 0); s.lr = t; FB.ms += performance.now() - t0; }
  const sel = s.ev.sel != null ? Math.max(0, 1 - (t - s.ev.sel) / 0.45) : 0, bt = s.ev.built != null ? t - s.ev.built : 9;
  const pop = 1 + 0.035 * Math.sin(sel * Math.PI) + (bt < 0.5 ? 0.05 * Math.sin(bt / 0.5 * Math.PI) : 0), ww = W * 2, wh = H * 2, cw = ww * pop, ch = wh * pop;
  const shake = bt < 2.4 && bt > 2.1 ? Math.round(Math.sin(bt * 90) * 2) : 0;
  const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = (zoom || 1) < 0.9; ctx.drawImage(s.cv, 0, 0, W, H, X + (ww - cw) / 2 + shake, Y + (wh - ch) / 2, cw, ch); ctx.imageSmoothingEnabled = sm;
};
// room events from the game: 'sel' (clicked), 'built' (finished: lights come on one by one), 'hit'
PXR.poke = function (id, kind) { const s = SLOTS[id]; if (!s) return; use(s.key); s.ev[kind] = s.lt == null ? 0 : s.lt; if (kind === 'built') { s.P.a.length = 0; for (let i = 0; i < 26; i++) s.P.burst('dust', 10 + Math.random() * 130, 6 + Math.random() * 6, 1, { life: 2.4, sp: 4 }); } if (kind === 'sel') { const B = BAKED[s.key]; if (B) B.lights.forEach(l => s.P.burst('glint', l.x, l.y, 3, { sp: 30, life: 0.5, w: 8, h: 8 })); } };
// a still frame (build list thumbnails)
// headless: render one frame of slot `id` (default: one per key) and return its pixels (Uint32 ABGR, W×H). Call with
// increasing t (e.g. 1/30 apart) to let particles and fire evolve; o as for draw (hov, sel via poke, par, fireT, tile)
PXR.pixels = function (key, t, o, id) { const s = slot(id || '_px_' + key, key); render(s, t, o || NO); return s.u32; };
PXR.TILEF = {};
PXR.info = function (key) { const B = bake(key); return { lights: B.lights.length, emitters: B.sc.emits.length, shafts: B.sc.shafts.length, fields: B.sc.fields.length, px: Object.fromEntries(Object.entries(B.L).map(([k, L]) => [k, L.n])) }; };
PXR.snapshot = function (key, t) { const s = slot('_snap_' + key, key); s.lt = null; t = t == null ? 3 : t; for (let k = 0; k <= 40; k++) render(s, t - 2 + k / 20, { snap: 1 }); s.cx.putImageData(s.img, 0, 0); return s.cv; };

// ───────── HD-2D hand-off ─────────
// export(key): per layer { k, z, parallax, albedo, normal, glow, depth } canvases (150×105, art px), plus lights / emitters /
// shafts in art-px room space (x right, y down, z toward the viewer; floor top at FY, floor rows recede FZ each).
// frame(key, t): the animated layers of one moment, same format — a 3D renderer uploads them as textures each frame.
function layCanvases(Y, into) {
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const o = into || { albedo: mk(), normal: mk(), glow: mk(), depth: mk() }; if (!o._im) o._im = [0, 1, 2, 3].map(() => new ImageData(W, H));
  const [A, Nn, G, Dd] = o._im; [A, Nn, G, Dd].forEach(im => im.data.fill(0));
  for (let p = 0; p < N; p++) { if (!Y.m[p]) continue; const R = MATS[Y.m[p]], c = LUT[R.o + clamp(Math.round(Y.t[p]), 0, R.n - 1)], i = p * 4;
    A.data[i] = c & 255; A.data[i + 1] = (c >> 8) & 255; A.data[i + 2] = (c >> 16) & 255; A.data[i + 3] = 255;
    // floor pixels face up in room space, which is the flat plane's own normal in 3D: export them flat
    const nx = Y.f[p] ? 0 : Y.nx[p] / 127, ny = Y.f[p] ? 0 : Y.ny[p] / 127, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); Nn.data[i] = (nx * 0.5 + 0.5) * 255; Nn.data[i + 1] = (-ny * 0.5 + 0.5) * 255; Nn.data[i + 2] = (nz * 0.5 + 0.5) * 255; Nn.data[i + 3] = 255;
    if (Y.e[p]) { G.data[i] = A.data[i]; G.data[i + 1] = A.data[i + 1]; G.data[i + 2] = A.data[i + 2]; } G.data[i + 3] = 255;
    Dd.data[i] = Dd.data[i + 1] = Dd.data[i + 2] = Math.min(255, Y.d[p] * 6); Dd.data[i + 3] = 255; }
  o.albedo.getContext('2d').putImageData(A, 0, 0); o.normal.getContext('2d').putImageData(Nn, 0, 0); o.glow.getContext('2d').putImageData(G, 0, 0); o.depth.getContext('2d').putImageData(Dd, 0, 0);
  return o;
}
PXR.export = function (key) {
  const B = bake(key); return { key, W, H, FY, FZ, artPx: 2, layers: LAYS.map(([k, z, par]) => Object.assign({ k, z, parallax: par }, layCanvases(B.L[k].Y))),
    lights: B.lights.map(l => ({ x: l.x, y: l.y, z: l.z, r: l.r, i: l.i, c: l.c, flicker: l.fl || 'steady', tint: l.tint })), emitters: B.sc.emits.map(e => Object.assign({}, e, { acc: undefined })), shafts: B.sc.shafts.map(s => Object.assign({}, s)) };
};
// frame(key, t): this moment's animated layers (same format, canvases reused between calls), the particles as
// [x, y, r, g, b, glow] in room space, and each light's intensity (flicker and kicks included)
const HDF = {};
PXR.frame = function (key, t) {
  const s = slot('_hd_' + key, key), B = bake(key); render(s, t, { snap: 1 }); const F = HDF[key] || (HDF[key] = {});
  const layers = LAYS.map(([k, z]) => Object.assign({ k, z }, (F[k] = layCanvases(DL[k], F[k]))));
  const parts = s.P.a.map(q => { const K = q.K, R = MATS[MI[K.ramp[0]]], st = K.ramp[1], c = LUT[R.o + clamp(st[Math.min(st.length - 1, Math.floor(q.t / q.life * st.length))], 0, R.n - 1)]; return [q.x, q.y, c & 255, (c >> 8) & 255, (c >> 16) & 255, K.glow ? 1 : 0]; });
  const lights = B.lights.map((l, i) => l.f(t) * (l.i || 1) * (s.mul[i] == null ? 1 : s.mul[i]) + (s.kick[i] || 0));
  return { layers, parts, lights };
};
PXR.pixW = pixW; PXR.PK = PK; PXR.slots = SLOTS;
})();
