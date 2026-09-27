// ==== mc-pxroom-minib-tarot.js ====
(function () {
// 占卜摊 (G007) · a fortune teller's tent. Crimson velvet on every side (a scalloped valance with gold fringe carries the rule
// line, tied-back side drapes, a back curtain with gold-thread moons and stars), two pierced brass star lanterns that turn and
// throw star-shaped spots over the curtains (a field; the spots take the omen colour), hanging shelves of bottles, a skull and
// old books, a wicker fan chair for the teller, a black cat on a high stool, a censer with a curl of smoke, and a round table
// under purple velvet with a gold-embroidered border and fringe: a crystal ball on a brass claw stand (right), a cluster of
// candles (left) and three tarot cards floating above it. Two defs: mb_tarot (opaque: the tent, its props, the cat, the whole
// table) and mb_tarot_fg (see-through: the near half of the table top, the hanging cloth and fringe, ball, candles, cards);
// the fortune teller (her own character module) is drawn between them, in the fan chair behind the middle card.
// The card back and the ten faces are 42×62 textures (material, tone, glow per texel) built once, four animation frames per
// face (sun rays turn, the wolf blinks, stars twinkle, the tower smokes…), sampled every frame, so a card can flip, lean,
// squash and glow. The gold foil is lit per pixel (it glints in the candle, lantern and ball light); the rest of a card takes
// the light level at its slot (cheaper: three cards are ~8k pixels). A card with an omen or a lit face switches on a light
// over its slot (lights 5–7) in the omen's / the face's colour, so the curtains, the chair and the cloth pick it up.
//
// o (read-only; every field optional):
//   cards: [{ face 0…9 (TAROT order), flip (half-turns done; fractional while turning; face up when round(flip) is odd; more
//             turns for higher tiers are just larger odd targets), lift (art px up), hov 0…1 (gold foil brightens),
//             lean −1…1 (the top leans toward the cursor, 3 px at ±1), press 0…1 (squeezed, white rim; a pinch of gold dust
//             when it rises past 0.5), pop (extra scale, e.g. +0.06 on the bounce),
//             q −1 | 0…3 (omen quality: aura, cracks and slot light in 普通 / 稀有 / 史诗 / 传说 colour; kept on a lit face as a
//             quieter aura), omen 0…1 (aura strength, default 1 while q ≥ 0 and face down), shake 0…1 (jitter, 2 px at 1),
//             crack 0…1 (cracks of light spread from the mandala), glow 0…1 (a face-up card lights up and lights the tent),
//             dealt 0…1 (0 = in the teller's hands at deal, 1 = in place; 1 → 0 flies it back when she leaves) }]
//   ball 0…1 (crystal ball: mist brightness and its violet light), stars { spin 0…1 (lanterns turn faster), q −1 | 0…3 (the
//   spots take the quality colour) }, cat 0…1 (the cat turns to look at you), tier 0…4 (echo particles after a reveal),
//   dim 0…1 (the freeze before the flip: every flame dims, the cards and the ball stay lit), tap { x, y, n } (a click on the
//   cloth: gold dust rings out each time n changes)
const M = window.MC, X = M.PXR; if (!X || !X.MINIB) return;
const MB = X.MINIB, { TX, n1, MI, vnoise } = X, { AW, AH, clamp, hash, flame, candle } = MB;
const R = Math.random, TAU = Math.PI * 2, PI = Math.PI, NO = {};
const ease = (k) => 1 - (1 - k) * (1 - k) * (1 - k);

// ───────── geometry (art px) ─────────
const TG = {
  cards: [[90, 106], [150, 106], [210, 106]], cw: 42, ch: 62,     // card centres (42×62, y 75…137)
  table: { cx: 150, cy: 138, rx: 110, ry: 12, hem: 160, hry: 12 }, // table top ellipse; the cloth's hem ellipse
  ball: { x: 250, y: 115, r: 11 },
  teller: { x0: 124, y0: 30, x1: 176, y1: 100 },                   // left empty for the fortune teller
  deal: [150, 72],                                                 // where dealt cards fly from (her hands)
  lanterns: [[44, 42], [256, 42]],
  plate: { x: 5, y: 51, w: 32, h: 8 },                             // blank name plate on a face, card-local px
};
// omen quality → [ramp, light rgb, top tone], the game's quality colours (SHOW.QC): 普通 white · 稀有 blue · 史诗 violet · 传说 orange
const QR = [['linen', [214, 222, 238], 10], ['tile', [79, 143, 255], 11], ['arcane', [184, 107, 255], 10], ['fire', [255, 154, 60], 9]];
// the light each face throws when it glows (TAROT order)
const FRGB = [[255, 200, 90], [170, 200, 255], [150, 190, 255], [255, 170, 70], [255, 210, 120], [255, 190, 110], [255, 220, 120], [255, 140, 170], [255, 120, 80], [200, 190, 230]];
const E = { e: 255 }, GOLD = MI.gold, LINEN = MI.linen;

// ───────── card textures: 42×62, material + tone + glow per texel ─────────
const CW = 42, CH = 62, CN = CW * CH;
function CT() { this.m = new Uint8Array(CN); this.t = new Float32Array(CN); this.g = new Uint8Array(CN); this.ox = 0; this.oy = 0; this.cl = [0, 0, CW, CH]; }
const CP = CT.prototype;
CP.px = function (x, y, m, t, g) { x = Math.round(x) + this.ox; y = Math.round(y) + this.oy; const c = this.cl; if (x < c[0] || y < c[1] || x >= c[2] || y >= c[3]) return this; const p = y * CW + x; this.m[p] = typeof m === 'number' ? m : MI[m]; this.t[p] = t; this.g[p] = g ? 1 : 0; return this; };
CP.rect = function (x, y, w, h, m, t, g) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, m, t, g); return this; };
CP.hl = function (x, y, w, m, t, g) { return this.rect(x, y, w, 1, m, t, g); };
CP.vl = function (x, y, h, m, t, g) { return this.rect(x, y, 1, h, m, t, g); };
CP.fn = function (x0, y0, w, h, f) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const r = f(x, y); if (r) this.px(x, y, r[0], r[1], r[2]); } return this; };
CP.ell = function (cx, cy, rx, ry, m, t, g, ring) {
  return this.fn(Math.floor(cx - rx - 1), Math.floor(cy - ry - 1), Math.ceil(rx * 2 + 3), Math.ceil(ry * 2 + 3), (x, y) => { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v > 1) return null;
    if (ring) { const a = (x + 0.5 - cx) / Math.max(0.3, rx - ring), b = (y + 0.5 - cy) / Math.max(0.3, ry - ring); if (a * a + b * b < 1) return null; } return [m, typeof t === 'function' ? t(u, v, x, y) : t, g]; });
};
CP.line = function (x0, y0, x1, y1, m, t, g) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy; for (;;) { this.px(x0, y0, m, t, g); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } return this; };
CP.poly = function (pts, m, t, g) { let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const cy = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= cy && b[1] > cy) || (b[1] <= cy && a[1] > cy)) xs.push(a[0] + (cy - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, m, typeof t === 'function' ? t(x, y) : t, g); } return this; };
CP.spr = function (x, y, rows, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const p = pal[r[i]]; if (p) this.px(x + i, y + j, p[0], p[1], p[2]); } }); return this; };
// a silhouette from strings ('.' empty): lit on the edge facing (lx, ly), darker on the far edge; o.map char → tone offset, o.mm char → material
CP.sil = function (x0, y0, rows, m, t, o) {
  o = o || NO; const lx = o.lx == null ? -1 : o.lx, ly = o.ly == null ? -1 : o.ly, on = (i, j) => j >= 0 && j < rows.length && i >= 0 && i < rows[j].length && rows[j][i] !== '.';
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (!on(i, j)) continue; const ch = r[i]; let tt = t + ((o.map && o.map[ch]) || 0);
    if ((lx && !on(i + lx, j)) || (ly && !on(i, j + ly))) tt += o.up == null ? 1.5 : o.up; else if ((lx && !on(i - lx, j)) || (ly && !on(i, j - ly))) tt -= o.dn == null ? 1.2 : o.dn;
    this.px(x0 + i, y0 + j, (o.mm && o.mm[ch]) || m, tt, o.g); } });
  return this;
};
// a silhouette from a predicate over a w×h box (pixel centres), shaded like sil
CP.shape = function (x0, y0, w, h, pred, m, t, o) { const rows = []; for (let j = 0; j < h; j++) { let r = ''; for (let i = 0; i < w; i++) r += pred(i + 0.5, j + 0.5) ? '#' : '.'; rows.push(r); } return this.sil(x0, y0, rows, m, t, o); };
CP.win = function () { this.ox = 5; this.oy = 5; this.cl = [5, 5, 37, 49]; return this; };   // the illustration window, 32×44
CP.all = function () { this.ox = 0; this.oy = 0; this.cl = [0, 0, CW, CH]; return this; };
const sky = (T, m, bands) => { for (let y = 0; y < 44; y++) { let tn = bands[0][1]; bands.forEach(b => { if (y >= b[0]) tn = b[1]; }); T.hl(0, y, 32, m, tn); } };
const spark = (T, x, y, m, t, big, g) => { T.px(x, y, m, t, g); if (big) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => T.px(x + a, y + b, m, t - 2, g)); };
const twk = (k, i) => ((k + i) & 3) === 0;   // does star i sparkle on frame k
const inE = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inP = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
// the lemniscate (∞): a glowing core in a dark gold outline, so it reads on a light sky
const lemni = (T, cx, cy) => T.fn(cx - 7, cy - 3, 14, 7, (x, y) => { const a = Math.hypot(Math.abs(x + 0.5 - cx) - 2.6, y + 0.5 - cy), d = Math.abs(a - 1.9); return d < 0.6 ? ['lamp', 11, 1] : d < 1.25 ? ['gold', 5, 1] : null; });

// card back: indigo with a fine lattice, gold foil frame, corner stars, a sun · moon · eye mandala
function paintBack(T) {
  T.fn(0, 0, CW, CH, (x, y) => { const a = (x + y) % 6, b = (x - y + 66) % 6; return ['denim', a === 0 && b === 0 ? 4 : a === 0 || b === 0 ? 3 : 2]; });
  const box = (a, m, t) => { T.hl(a, a, CW - 2 * a, m, t); T.hl(a, CH - 1 - a, CW - 2 * a, m, t - 1); T.vl(a, a + 1, CH - 2 * a - 2, m, t); T.vl(CW - 1 - a, a + 1, CH - 2 * a - 2, m, t - 1); };
  box(0, 'gold', 5); box(1, 'gold', 8); box(2, 'denim', 1); box(3, 'denim', 1); box(4, 'gold', 6);
  // corner fleurons + stars
  [[5, 5, 1, 1], [36, 5, -1, 1], [5, 56, 1, -1], [36, 56, -1, -1]].forEach(([x, y, sx, sy]) => { T.px(x, y, 'gold', 8); T.px(x + sx, y, 'gold', 6); T.px(x, y + sy, 'gold', 6); T.px(x + sx, y + sy, 'gold', 5);
    const cx = x + sx * 3, cy = y + sy * 3; spark(T, cx, cy, 'gold', 9, 1); T.px(cx + sx * 2, cy, 'gold', 5); T.px(cx, cy + sy * 2, 'gold', 5); });
  // scattered star dots
  for (let i = 0; i < 40; i++) { const x = 6 + Math.floor(hash(i, 1, 41) * 30), y = 6 + Math.floor(hash(i, 2, 41) * 50), d = Math.hypot(x + 0.5 - 21, y + 0.5 - 31); if (d > 17.5 && Math.abs(x + 0.5 - 21) > 2.5 || (d > 17.5 && Math.abs(y - 31) > 20)) T.px(x, y, 'gold', hash(i, 3, 41) < 0.3 ? 7 : 5); }
  // a dotted ring round the mandala
  for (let k = 0; k < 44; k++) { const a = k / 44 * TAU; if (k % 2) continue; T.px(Math.floor(21 + Math.cos(a) * 16.5), Math.floor(31 + Math.sin(a) * 16.5), 'gold', 5); }
  // the sun: 16 rays round a ring
  T.fn(4, 14, 34, 34, (x, y) => { const dx = x + 0.5 - 21, dy = y + 0.5 - 31, r = Math.hypot(dx, dy); if (r < 8.4 || r > 14.6) return null;
    if (r < 9.6) return ['gold', dy < 0 ? 8 : 7];
    const a = Math.atan2(dy, dx), s = PI / 8, q = Math.round(a / s), da = Math.abs(a - q * s), lng = (q & 1) === 0, len = lng ? 14.6 : 12.4, w = (lng ? 0.15 : 0.11) * (1 - (r - 9.6) / (len - 9.6)) + 0.03;
    return r < len && da < w ? ['gold', lng ? (dy < 0 ? 8 : 7) : 6] : null; });
  // inside: a crescent moon cradling an eye
  T.ell(21, 31, 8.4, 8.4, 'denim', 1);
  T.fn(12, 22, 18, 18, (x, y) => { const a = Math.hypot(x + 0.5 - 21, y + 0.5 - 31.5), b = Math.hypot(x + 0.5 - 21, y + 0.5 - 28.4); return a < 7.2 && b > 6.3 ? ['gold', x < 21 ? 9 : 7] : null; });
  T.fn(15, 26, 12, 8, (x, y) => { const u = (x + 0.5 - 21) / 5.6; if (Math.abs(u) >= 1) return null; const k = 1 - u * u, yt = 30.4 - 2.7 * k, yb = 30.4 + 2.2 * k, yy = y + 0.5; if (yy < yt || yy > yb) return null;
    if (yy - yt < 0.9 || yb - yy < 0.9) return ['gold', yy - yt < 0.9 ? 8 : 6]; const d = Math.hypot(x + 0.5 - 21, yy - 30.4); return d < 0.8 ? ['night', 0] : d < 2.1 ? ['arcane', 7, 1] : ['bone', 9]; });
  T.px(20, 29, 'arcane', 10, 1);
  [[17, 26], [21, 25], [25, 26]].forEach(([x, y]) => T.px(x, y, 'gold', 6));
  // a little sun above, a little crescent below
  T.ell(21, 10.5, 2, 2, 'gold', 9); [[21, 7], [21, 13], [18, 10], [23, 10], [19, 8], [23, 8], [19, 12], [23, 12]].forEach(([x, y]) => T.px(x, y, 'gold', 6));
  T.fn(17, 48, 8, 7, (x, y) => { const a = Math.hypot(x + 0.5 - 21, y + 0.5 - 51.5), b = Math.hypot(x + 0.5 - 22.3, y + 0.5 - 50.6); return a < 2.9 && b > 2.3 ? ['gold', 8] : null; });
}
// hairline cracks of light on the back (revealed from the mandala outward as crack goes 0 → 1)
const CRK = new Float32Array(CN).fill(9), CRH = new Float32Array(CN).fill(9);
(function () { const r = X.rng(71);
  const walk = (x, y, a, n, t0, t1, depth) => { for (let k = 0; k < n; k++) { a += (r() - 0.5) * 0.8; x += Math.cos(a) * 1.2; y += Math.sin(a) * 1.2; const xi = Math.round(x), yi = Math.round(y); if (xi < 1 || yi < 1 || xi > CW - 2 || yi > CH - 2) return;
    const p = yi * CW + xi, th = t0 + (t1 - t0) * k / n; CRK[p] = Math.min(CRK[p], th); const hx = Math.abs(Math.cos(a)) > 0.7 ? 0 : 1, hy = 1 - hx;   // a halo pixel on each side, across the crack
    [[hx, hy], [-hx, -hy]].forEach(([dx, dy]) => { const q = (yi + dy) * CW + xi + dx; CRH[q] = Math.min(CRH[q], th + 0.05); });
    if (depth < 1 && r() < 0.05) walk(x, y, a + (r() < 0.5 ? 0.8 : -0.8), Math.floor((n - k) * 0.5), th, t1, depth + 1); } };
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + r() * 0.5 - 0.9; walk(21 + Math.cos(a) * 3, 31 + Math.sin(a) * 3, a, 30, 0.02 + i * 0.05, 1, 0); } })();

// face frame: parchment, gold hairlines, the illustration window (32×44 at 5,5) and a blank name plate
function paintFrame(T) {
  T.all(); T.fn(0, 0, CW, CH, (x, y) => ['paper', 8 + (vnoise(x / 2.2, y / 2.2, 5) > 0.62 ? 1 : 0) - (vnoise(x / 1.3, y / 1.3, 6) > 0.8 ? 1 : 0)]);
  T.hl(0, 0, CW, 'paper', 6); T.hl(0, CH - 1, CW, 'paper', 5); T.vl(0, 1, CH - 2, 'paper', 6); T.vl(CW - 1, 1, CH - 2, 'paper', 5);
  T.hl(2, 2, CW - 4, 'gold', 7); T.hl(2, CH - 3, CW - 4, 'gold', 6); T.vl(2, 3, CH - 6, 'gold', 7); T.vl(CW - 3, 3, CH - 6, 'gold', 6);
  T.hl(4, 4, 34, 'gold', 8); T.vl(4, 5, 45, 'gold', 8); T.hl(4, 49, 34, 'gold', 6); T.vl(37, 5, 45, 'gold', 6);
  T.rect(5, 51, 32, 8, 'paper', 9); T.hl(6, 51, 30, 'paper', 7); T.hl(6, 58, 30, 'paper', 6); T.vl(5, 52, 6, 'paper', 7); T.vl(36, 52, 6, 'paper', 6);
  [[3, 51], [3, 58], [38, 51], [38, 58]].forEach(([x, y]) => T.px(x, y, 'gold', 8)); T.px(4, 54, 'gold', 6); T.px(4, 55, 'gold', 6); T.px(37, 54, 'gold', 6); T.px(37, 55, 'gold', 6);
  [[2, 2], [39, 2], [2, 59], [39, 59]].forEach(([x, y]) => T.px(x, y, 'gold', 10)); T.px(21, 1, 'gold', 9); T.px(20, 2, 'gold', 8); T.px(21, 3, 'gold', 7); T.px(20, 60, 'gold', 8);
}

// ───────── the ten faces (window-local 32×44; k = animation frame 0…3) ─────────
const FACE = [
  // 0 太阳: a smiling sun whose rays turn, sunflowers over a wall
  function (T, k) {
    sky(T, 'tile', [[0, 6], [6, 7], [13, 8], [21, 9]]);
    const cx = 15.5, cy = 14, rot = k * PI / 32, s = PI / 8;
    T.fn(0, 0, 32, 30, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r < 7.4 || r > 15.6) return null; const a = Math.atan2(dy, dx) - rot, q = Math.round(a / s), da = a - q * s, lng = (q & 1) === 0, len = lng ? 15.6 : 12.4;
      if (r > len) return null; const wig = lng ? 0 : Math.sin(r * 1.4 + k * 1.6) * 0.07, w = (lng ? 0.17 : 0.12) * (1 - (r - 7.4) / (len - 7.4)) + 0.025; return Math.abs(da - wig) < w ? ['gold', lng ? (r < 11 ? 10 : 9) : 8, 1] : null; });
    T.ell(cx, cy, 7.6, 7.6, 'gold', (u, v) => (u + v < -0.85 ? 11 : u + v > 0.75 ? 8 : 9), 1); T.ell(cx, cy, 7.6, 7.6, 'lamp', 8, 1, 0.9);
    [[12, 13], [13, 12], [14, 13], [17, 13], [18, 12], [19, 13]].forEach(([x, y]) => T.px(x, y, 'fire', 4, 1));
    T.px(11, 15, 'fire', 8, 1); T.px(20, 15, 'fire', 8, 1); T.px(10, 15, 'fire', 7, 1); T.px(21, 15, 'fire', 7, 1);
    [[12, 16], [13, 17], [14, 18], [15, 18], [16, 18], [17, 17], [18, 16]].forEach(([x, y]) => T.px(x, y, 'fire', 4, 1)); T.px(15, 17, 'fire', 7, 1); T.px(14, 17, 'fire', 7, 1); T.px(16, 17, 'fire', 7, 1);
    T.px(12, 10, 'lamp', 11, 1); T.px(11, 11, 'lamp', 11, 1);
    // the wall and the sunflowers peeking over it
    T.hl(0, 29, 32, 'stone', 9); T.rect(0, 30, 32, 6, 'stone', 7);
    for (let y = 30; y < 36; y++) for (let x = 0; x < 32; x++) { const row = Math.floor((y - 30) / 3), yy = (y - 30) % 3; if (yy === 2 || (x + row * 3) % 6 === 0) T.px(x, y, 'stone', 5); else if (yy === 0) T.px(x, y, 'stone', 8); }
    [[3, 25, 0], [10, 23, 1], [22, 24, 2], [28, 25, 3]].forEach(([x, y, i]) => { T.vl(x, y + 2, 29 - y - 2, 'leaf', 6); T.px(x + (i % 2 ? 1 : -1), y + 4, 'leaf', 8); T.px(x + (i % 2 ? 2 : -2), y + 3, 'leaf', 7);
      T.ell(x + 0.5, y + 0.5, 2.7, 2.7, 'gold', (u, v) => (u + v < -0.4 ? 10 : 8)); T.ell(x + 0.5, y + 0.5, 1.3, 1.3, 'wood', 4); T.px(x, y, 'wood', 7); });
    T.rect(0, 36, 32, 8, 'leaf', 6); for (let i = 0; i < 30; i++) T.px(Math.floor(hash(i, 3, 1) * 32), 36 + Math.floor(hash(i, 5, 1) * 8), hash(i, 7, 1) < 0.5 ? 'leaf' : 'gold', hash(i, 7, 1) < 0.5 ? 8 : 9);
    T.hl(0, 36, 32, 'leaf', 8);
  },
  // 1 月亮: a moon with a sleeping face, a wolf howling on a rock, two towers, a pool
  function (T, k) {
    sky(T, 'glass', [[0, 2], [8, 3], [16, 4], [23, 5], [28, 6]]);
    [[3, 3], [27, 2], [5, 13], [29, 12], [25, 19], [2, 21], [28, 25]].forEach(([x, y], i) => spark(T, x, y, 'linen', twk(k, i) ? 11 : 8, twk(k, i), 1));
    for (let a = 0; a < 24; a++) if (a % 2 === 0) { const ang = a / 24 * TAU; T.px(Math.floor(17 + Math.cos(ang) * 10.4), Math.floor(10 + Math.sin(ang) * 10.4), 'lamp', 7, 1); }
    T.ell(17, 10, 7.8, 7.8, 'bone', (u, v, x, y) => (Math.hypot(x + 0.5 - 20.5, y + 0.5 - 8.5) < 7 ? 6 : 10), 1);
    [[11, 8], [13, 13], [10, 11], [12, 6]].forEach(([x, y]) => T.px(x, y, 'bone', 8, 1));
    T.hl(18, 9, 3, 'bone', 3, 1); T.px(21, 8, 'bone', 3, 1); T.px(20, 13, 'bone', 3, 1); T.px(21, 13, 'bone', 3, 1); T.px(23, 11, 'bone', 4, 1);
    [11, 18, 24].forEach((x, i) => { const y = 20 + ((k + i) % 4) * 1.5; T.px(x, y, 'gold', 9, 1); T.px(x, y + 1, 'gold', 7, 1); });
    // distant hills, a tower on the right, the pool
    T.fn(0, 26, 32, 8, (x, y) => (y >= 29 + Math.round(Math.sin(x * 0.3 + 1) * 1.6) ? ['glass', 2] : null));
    T.rect(26, 17, 6, 17, 'stone', 4); T.vl(26, 17, 17, 'stone', 6); for (let x = 26; x < 32; x += 2) T.px(x, 16, 'stone', 4); T.px(28, 21, 'lamp', 9, 1); T.px(28, 22, 'lamp', 7, 1); T.px(29, 27, 'lamp', 8, 1);
    T.rect(0, 35, 32, 9, 'water', 4); T.hl(0, 35, 32, 'water', 6); for (let y = 36; y < 44; y++) T.px(19 + ((y * 3) % 4) - 1, y, 'bone', y % 2 ? 9 : 8, 1); for (let i = 0; i < 12; i++) T.px(Math.floor(hash(i, 1, 9) * 32), 37 + Math.floor(hash(i, 2, 9) * 7), 'water', 6);
    // the wolf on a rock, head thrown back, howling at the moon (moonlit rim on its upper right)
    T.poly([[0, 44], [0, 36], [4, 33], [13, 32], [17, 35], [18, 44]], 'rock', (x, y) => (y < 34 ? 8 : x > 12 ? 4 : 6)); T.line(6, 36, 9, 44, 'rock', 3); T.hl(3, 33, 9, 'rock', 9);
    T.shape(1, 14, 15, 19, (x, y) => inE(x, y, 5.5, 14.4, 4.6, 4.2) || inP(x, y, [[6, 7.6], [9.8, 5.4], [11.9, 11], [11.8, 18.6], [6.4, 18.6]]) || inE(x, y, 9.7, 5, 2.8, 2.3)
      || inP(x, y, [[9.6, 4.4], [12.8, 0.6], [14.3, 1.8], [11.8, 5.9]]) || inP(x, y, [[7.2, 5], [7.4, 0.4], [9.8, 3.4]]) || inE(x, y, 1.9, 18, 2.6, 1.1), 'iron', 3, { lx: 1, ly: -1, up: 3.6, dn: 1 });
    T.px(13, 16, 'ink', 0); T.px(12, 17, 'ink', 0); T.px(10, 19, k === 3 ? 'iron' : 'lamp', k === 3 ? 4 : 10, 1); T.vl(10, 26, 7, 'iron', 2); T.px(11, 31, 'iron', 6); T.px(12, 32, 'iron', 6);
  },
  // 2 星星: a great star, little stars, a kneeling figure pouring water onto the land and into a pool
  function (T, k) {
    sky(T, 'glass', [[0, 3], [8, 4], [18, 5], [26, 6]]);
    [[4, 4], [28, 5], [3, 15], [29, 15], [8, 24], [25, 23], [12, 17]].forEach(([x, y], i) => spark(T, x, y, 'lamp', twk(k, i) ? 11 : 8, twk(k, i) || i === 6, 1));
    T.fn(7, 0, 18, 18, (x, y) => { const dx = x + 0.5 - 16, dy = y + 0.5 - 8.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), q = Math.round(a / (PI / 4)), da = Math.abs(a - q * PI / 4), len = (q & 1) ? 5.2 : 8.4 + (k & 1);
      const lim = len * Math.max(0, 1 - da / 0.42); if (r > Math.max(2.4, lim)) return null; return ['lamp', r < 1.6 ? 11 : r < 3 ? 10 : 9, 1]; });
    // land (left), pool (right)
    T.poly([[0, 34], [9, 32], [14, 35], [13, 44], [0, 44]], 'leaf', (x, y) => (y < 35 ? 7 : 5));
    T.poly([[13, 35], [32, 33], [32, 44], [12, 44]], 'water', (x, y) => (y < 36 ? 7 : 5)); for (let i = 0; i < 10; i++) T.px(14 + Math.floor(hash(i, 1, 4) * 18), 37 + Math.floor(hash(i, 2, 4) * 7), 'water', 8);
    T.vl(3, 24, 9, 'wood', 4); T.ell(3.5, 23, 2.6, 3, 'leaf', 5); T.px(4, 20, 'hair', 2);
    // the figure: kneels on the bank, one foot in the pool
    T.ell(15.5, 22.5, 2.2, 2.4, 'skin', 7); T.px(14, 22, 'skin', 5); T.vl(17, 21, 8, 'gold', 7); T.vl(18, 22, 6, 'gold', 6); T.hl(14, 20, 4, 'gold', 8);
    T.poly([[13, 25], [18, 25], [20, 33], [12, 33]], 'linen', (x, y) => (x < 15 ? 9 : 7)); T.poly([[12, 32], [20, 32], [22, 35], [10, 35]], 'linen', 6);
    T.line(13, 26, 9, 30, 'skin', 6); T.line(18, 26, 22, 30, 'skin', 6);
    T.rect(7, 30, 3, 3, 'copper', 7); T.px(7, 30, 'copper', 9); T.rect(21, 30, 3, 3, 'copper', 7); T.px(21, 30, 'copper', 9);
    for (let y = 33; y < 38; y++) { T.px(8, y, 'water', (y + k) % 2 ? 10 : 9, 1); T.px(23 + (y > 35 ? 1 : 0), y, 'water', (y + k) % 2 ? 10 : 9, 1); }
    T.px(22, 38, 'water', 9, 1); T.px(25, 38, 'water', 9, 1); T.px(7, 37, 'leaf', 9); T.px(9, 37, 'leaf', 9);
  },
  // 3 力量: a golden lion under the lemniscate, green hills
  function (T, k) {
    sky(T, 'dusk', [[0, 9], [8, 10], [18, 9], [25, 8]]);
    T.fn(0, 24, 32, 10, (x, y) => (y >= 28 + Math.round(Math.sin(x * 0.28 + 2) * 2) ? ['leaf', y < 30 ? 5 : 4] : null));
    lemni(T, 16, 3.5);
    T.rect(0, 35, 32, 9, 'leaf', 6); T.hl(0, 35, 32, 'leaf', 8); for (let i = 0; i < 18; i++) T.px(Math.floor(hash(i, 1, 3) * 32), 36 + Math.floor(hash(i, 2, 3) * 8), hash(i, 3, 3) < 0.4 ? 'red' : 'leaf', hash(i, 3, 3) < 0.4 ? 8 : 4);
    // haunches and tail behind, the chest and front legs, big paws
    T.ell(16, 34, 11, 5, 'sand', (u, v) => (u < -0.4 ? 7.5 : 6)); T.line(26, 36, 29, 30, 'sand', 6); T.line(29, 30, 29, 27, 'sand', 6); T.ell(29.5, 26 - (k & 1), 1.6, 2, 'copper', 5);
    T.ell(16, 30, 6.4, 6, 'sand', (u, v) => (u + v < -0.5 ? 9 : u > 0.5 ? 6.5 : 8));
    T.rect(11, 31, 4, 7, 'sand', 8.5); T.rect(17, 31, 4, 7, 'sand', 7); T.vl(15, 31, 7, 'sand', 5); T.vl(16, 31, 7, 'sand', 5);
    T.ell(12.5, 38.5, 2.6, 1.5, 'sand', 9.5); T.ell(19, 38.5, 2.6, 1.5, 'sand', 8); T.px(11, 39, 'wood', 5); T.px(13, 39, 'wood', 5); T.px(18, 39, 'wood', 5); T.px(20, 39, 'wood', 5);
    // the mane: a shaggy ring of copper locks lit gold on its upper left, then the face
    T.fn(3, 4, 26, 26, (x, y) => { const dx = x + 0.5 - 16, dy = y + 0.5 - 16.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), lim = 9.6 + 1.6 * (vnoise(a * 2.4 + 3, 0.5, 8) - 0.5) * 2 + 0.7 * Math.sin(a * 13 + (k & 1) * 0.5); if (r > lim) return null;
      const lk = Math.sin(a * 14 + r * 0.9) > 0.15; return r > lim - 1.1 ? [dx + dy < 0 ? 'gold' : 'copper', dx + dy < 0 ? 8 : 6] : ['copper', (lk ? 7 : 5) + (dx + dy < -4 ? 1 : dx + dy > 5 ? -1 : 0)]; });
    T.ell(11, 9.5, 1.8, 1.8, 'sand', 7); T.px(11, 9, 'copper', 4); T.ell(21, 9.5, 1.8, 1.8, 'sand', 6); T.px(21, 9, 'copper', 4);
    T.ell(16, 17.5, 5.6, 6.2, 'sand', (u, v) => (u + v < -0.6 ? 10 : u + v > 0.7 ? 7 : 8.5));
    T.ell(16, 20.5, 3.3, 2.4, 'sand', 10); T.rect(15, 18, 2, 2, 'wood', 2); T.px(15, 20, 'wood', 3); T.px(16, 20, 'wood', 3); T.hl(14, 22, 4, 'wood', 4); T.px(13, 21, 'wood', 5); T.px(18, 21, 'wood', 5);
    if (k === 2) { T.hl(12, 15, 3, 'wood', 3); T.hl(18, 15, 3, 'wood', 3); } else { T.rect(13, 14, 2, 2, 'gold', 10); T.px(14, 15, 'wood', 1); T.rect(18, 14, 2, 2, 'gold', 10); T.px(18, 15, 'wood', 1); }
    T.hl(12, 13, 3, 'copper', 3); T.hl(18, 13, 3, 'copper', 3);
  },
  // 4 隐者: an old man in a grey hood with a white beard, holding out a lantern with a star in it, a staff, a snowy peak
  function (T, k) {
    sky(T, 'glass', [[0, 2], [12, 3], [24, 4]]);
    [[29, 3], [26, 11], [3, 4], [9, 9]].forEach(([x, y], i) => spark(T, x, y, 'linen', twk(k, i) ? 10 : 7, 0, 1));
    T.poly([[0, 44], [0, 36], [7, 31], [15, 34], [24, 30], [32, 34], [32, 44]], 'ice', (x, y) => (y < 34 ? 9 : y < 38 ? 7 : 6)); T.poly([[20, 32], [24, 30], [28, 32], [24, 33]], 'linen', 10);
    // staff
    T.line(26, 7, 27, 42, 'wood', 6); T.px(26, 6, 'wood', 8);
    // cloak, hood
    T.poly([[15, 13], [23, 12], [27, 41], [11, 41]], 'stone', (x, y) => (x < 16 ? 8 : x > 23 ? 5 : 6.5));
    for (let y = 18; y < 41; y += 5) T.line(19 + (y % 3), y, 20 + (y % 3), y + 4, 'stone', 5);
    T.ell(19, 10, 5, 5.2, 'stone', (u, v) => (u < -0.3 ? 8 : 6.5)); T.poly([[20, 5], [25, 2], [24, 8]], 'stone', 6);
    T.ell(16.5, 11, 2.2, 2.6, 'skin', 6); T.px(15, 10, 'skin', 8); T.px(16, 10, 'hair', 2); T.hl(15, 9, 3, 'linen', 9);
    T.poly([[14, 12], [19, 12], [18, 21], [16, 23]], 'linen', (x, y) => (x < 16 ? 10 : 8)); T.px(16, 13, 'skin', 4);
    // the arm reaching out with the lantern
    T.line(16, 16, 10, 17, 'stone', 7); T.line(16, 17, 10, 18, 'stone', 6); T.px(9, 17, 'skin', 7); T.vl(9, 18, 2, 'brass', 6);
    T.rect(7, 20, 5, 6, 'brass', 5); T.rect(8, 21, 3, 4, 'lamp', k === 1 ? 11 : 10, 1); T.px(9, 22, 'linen', 11, 1); T.px(9, 23, 'lamp', 11, 1); T.hl(7, 20, 5, 'brass', 8); T.hl(8, 26, 3, 'brass', 4);
    for (let a = 0; a < 12; a++) { if ((a + k) % 3) continue; const ang = a / 12 * TAU; T.px(Math.round(9 + Math.cos(ang) * 5), Math.round(23 + Math.sin(ang) * 5), 'lamp', 8, 1); }
    T.px(25, 20, 'skin', 6); T.px(25, 21, 'skin', 5);
  },
  // 5 魔术师: roses along the top, the lemniscate, a wand floating over a table with a cup, a coin and a sword
  function (T, k) {
    sky(T, 'gold', [[0, 9], [10, 8], [20, 7], [28, 6]]);
    for (let x = 0; x < 32; x++) T.px(x, 1 + Math.round(Math.sin(x * 0.7) * 0.8), 'leaf', 5);
    [[2, 2], [9, 1], [23, 1], [30, 2]].forEach(([x, y]) => { T.ell(x + 0.5, y + 0.5, 1.8, 1.8, 'red', 7); T.px(x, y, 'red', 9); T.px(x + 1, y + 1, 'red', 5); T.px(x - 1, y + 2, 'leaf', 6); });
    lemni(T, 16, 7);
    // the wand, its glowing tip and sparks
    T.line(10, 26, 21, 13, 'linen', 9, 1); T.line(11, 26, 22, 13, 'linen', 7); T.px(10, 26, 'gold', 8); T.px(9, 27, 'gold', 7);
    T.ell(22, 12, 1.8, 1.8, 'lamp', 11, 1); spark(T, 22, 12, 'linen', 11, 1, 1);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * 0.5, r = 3.5 + ((i + k) % 3); T.px(Math.round(22 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r), 'lamp', (i + k) % 2 ? 10 : 8, 1); }
    // the table and what lies on it
    T.rect(1, 29, 30, 3, 'wood', 8); T.hl(1, 29, 30, 'wood', 9); T.rect(2, 32, 28, 7, 'wood', 5); T.hl(2, 32, 28, 'wood', 3); T.rect(4, 34, 10, 3, 'wood', 4); T.rect(18, 34, 10, 3, 'wood', 4);
    T.rect(3, 39, 2, 5, 'wood', 4); T.rect(27, 39, 2, 5, 'wood', 3); T.rect(0, 41, 32, 3, 'leaf', 5); T.rect(3, 39, 2, 5, 'wood', 4); T.rect(27, 39, 2, 5, 'wood', 3);
    T.rect(1, 30, 30, 6, 'red', 5); T.hl(1, 30, 30, 'red', 7); for (let x = 2; x < 31; x += 4) T.vl(x, 31, 5, 'red', 4); for (let x = 1; x < 31; x++) T.px(x, 36, 'gold', x % 2 ? 8 : 6); T.px(16, 33, 'gold', 9); T.px(15, 33, 'gold', 7); T.px(17, 33, 'gold', 7); T.px(16, 32, 'gold', 7); T.px(16, 34, 'gold', 7);
    T.ell(6, 23, 2.8, 2, 'brass', (u) => (u < 0 ? 9 : 6)); T.hl(4, 22, 5, 'brass', 10); T.vl(6, 25, 2, 'brass', 6); T.hl(4, 27, 5, 'brass', 7); T.hl(5, 28, 3, 'brass', 5);
    T.ell(14, 26.5, 2.4, 2.4, 'gold', 8); T.px(14, 26, 'gold', 5); T.px(13, 27, 'gold', 5); T.px(15, 27, 'gold', 5); T.px(14, 25, 'gold', 10);
    T.hl(19, 27, 9, 'iron', 10); T.hl(19, 28, 9, 'iron', 7); T.vl(18, 26, 3, 'brass', 7); T.hl(16, 27, 2, 'brass', 5); T.px(15, 27, 'red', 7);
  },
  // 6 命运之轮: a golden wheel with runes that turns among clouds
  function (T, k) {
    sky(T, 'tile', [[0, 7], [12, 8], [30, 9]]);
    [[3, 4, 5, 3], [28, 5, 5, 3], [3, 39, 6, 4], [28, 40, 6, 4]].forEach(([x, y, rx, ry]) => { T.ell(x, y, rx, ry, 'linen', 8); T.ell(x - 1, y - 1, rx - 1.6, ry - 1.2, 'linen', 10); });
    const cx = 16, cy = 22, rot = k * PI / 16;
    T.fn(2, 8, 28, 28, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); if (r > 12.6) return null; const a = Math.atan2(dy, dx) - rot;
      if (r > 11.2) return ['gold', dy < 0 ? 9 : 7, 1];
      if (r > 8.2) { const q = ((a / TAU * 12) % 1 + 1) % 1, g = Math.floor(((a / TAU * 12) % 12 + 12) % 12); return r > 10.8 || r < 8.6 ? ['gold', 5, 1] : (q > 0.3 && q < 0.7 && ((g & 1) ? Math.abs(r - 9.7) < 0.6 : q < 0.5 || Math.abs(r - 9.7) < 0.5)) ? ['copper', 3, 1] : ['gold', dy < 0 ? 9 : 8, 1]; }
      if (r < 2.2) return ['gold', 10, 1]; if (r < 3.4) return ['gold', 6, 1]; if (Math.abs(r - 5.6) < 0.5) return ['gold', 7, 1];
      const q = Math.round(a / (PI / 4)); if (Math.abs(a - q * PI / 4) * r < 0.8) return ['gold', 8, 1]; return ['tile', 5]; });
    T.poly([[14, 9], [18, 9], [19, 6], [17, 4], [15, 4], [13, 6]], 'sand', 8); T.px(15, 5, 'hair', 1); T.px(17, 5, 'hair', 1); T.line(18, 5, 21, 1, 'iron', 9);
  },
  // 7 恋人: two figures holding hands under a glowing heart, a flame tree and an apple tree, a mountain
  function (T, k) {
    sky(T, 'tile', [[0, 8], [14, 9], [26, 10]]);
    T.ell(16, 3, 4, 3.4, 'lamp', 10, 1); for (let i = 0; i < 8; i++) { const a = i / 8 * PI; T.px(Math.round(16 + Math.cos(a) * 6), Math.round(3 + Math.sin(a) * 5), 'lamp', 9, 1); }
    T.poly([[10, 35], [16, 25], [22, 35]], 'glass', (x, y) => (x < 16 ? 7 : 6)); T.poly([[14.5, 28], [16, 25], [17.5, 28]], 'linen', 10);
    const hs = k & 1 ? 1 : 0; T.fn(8, 5, 16, 14, (x, y) => { const dx = (x + 0.5 - 16) / (4.2 + hs * 0.5), dy = -(y + 0.5 - 11.5) / (4 + hs * 0.5), q = (dx * dx + dy * dy - 1), h = q * q * q - dx * dx * dy * dy * dy; return h <= 0 ? ['red', dy > 0.3 && dx < 0 ? 10 : dx > 0.4 ? 7 : 8, 1] : null; });
    T.px(13, 9, 'linen', 11, 1); T.px(14, 9, 'red', 10, 1); if (k & 1) { spark(T, 10, 8, 'pink', 10, 0, 1); spark(T, 22, 9, 'pink', 10, 0, 1); } else { spark(T, 11, 14, 'pink', 10, 0, 1); spark(T, 21, 13, 'pink', 10, 0, 1); }
    T.vl(3, 24, 11, 'wood', 4); T.ell(3.5, 21, 3.4, 4.6, 'leaf', 5); [[2, 19], [4, 22], [1, 23], [5, 18]].forEach(([x, y], i) => T.px(x, y, 'fire', (i + k) % 2 ? 10 : 8, 1));
    T.vl(28, 24, 11, 'wood', 4); T.ell(28.5, 21, 3.4, 4.6, 'leaf', 6); [[27, 19], [29, 22], [30, 18]].forEach(([x, y]) => T.px(x, y, 'red', 8)); T.px(27, 25, 'leaf', 9); T.px(28, 26, 'leaf', 9);
    T.rect(0, 35, 32, 9, 'leaf', 6); T.hl(0, 35, 32, 'leaf', 8);
    // him (left), her (right)
    T.ell(9, 21, 2, 2.2, 'skin', 7); T.hl(8, 19, 3, 'hair', 3); T.px(7, 20, 'hair', 3); T.poly([[7, 23], [11, 23], [12, 33], [6, 33]], 'denim', (x) => (x < 9 ? 8 : 6)); T.rect(7, 33, 2, 4, 'denim', 4); T.rect(10, 33, 2, 4, 'denim', 4);
    T.line(11, 25, 15, 27, 'skin', 6);
    T.ell(23, 21, 2, 2.2, 'skin', 7); T.vl(24, 19, 8, 'gold', 7); T.vl(25, 21, 5, 'gold', 6); T.hl(22, 19, 3, 'gold', 8); T.poly([[21, 23], [25, 23], [27, 36], [19, 36]], 'crimson', (x) => (x < 22 ? 8 : 6));
    T.line(21, 25, 17, 27, 'skin', 6); T.px(16, 27, 'skin', 8);
  },
  // 8 高塔: a stone tower on a crag struck by lightning, its crown knocked off, fire in the windows, smoke
  function (T, k) {
    sky(T, 'magic', [[0, 2], [10, 3], [22, 4]]);
    T.ell(6, 3, 7, 3, 'stone', 3); T.ell(25, 5, 8, 3.4, 'stone', 3); T.ell(22, 4, 5, 2, 'stone', 4);
    T.poly([[4, 44], [7, 36], [12, 34], [21, 34], [25, 37], [28, 44]], 'rock', (x, y) => (x < 12 ? 7 : x > 22 ? 4 : 5)); T.line(12, 38, 16, 44, 'rock', 3); T.line(20, 36, 22, 41, 'rock', 3);
    T.rect(11, 11, 10, 24, 'stone', 6); T.vl(11, 11, 24, 'stone', 8); T.vl(12, 11, 24, 'stone', 7); T.vl(20, 11, 24, 'stone', 4);
    for (let y = 13; y < 35; y += 3) for (let x = 11 + ((y / 3) % 2 ? 2 : 0); x < 21; x += 4) T.px(x, y, 'stone', 4);
    for (let x = 10; x < 22; x += 2) T.rect(x, 9, 1, 2, 'stone', 6); T.hl(10, 10, 12, 'stone', 6);
    [[13, 15], [17, 21], [13, 27]].forEach(([x, y], i) => { T.rect(x, y, 2, 3, 'fire', 9, 1); T.px(x, y, 'fire', 11, 1); T.px(x + (i % 2 ? 2 : -1), y - 1 - ((k + i) & 1), 'fire', 8, 1); T.px(x + (i % 2 ? 2 : -1), y - ((k + i) & 1), 'fire', 10, 1); });
    for (let x = 11; x < 21; x++) { const h = 2 + Math.round(2 * Math.abs(Math.sin(x * 1.3 + k * 1.7))); for (let j = 0; j < h; j++) T.px(x, 8 - j, 'fire', 10 - j * 1.5, 1); }
    T.poly([[21, 5], [27, 3], [28, 6], [22, 8]], 'gold', 8); T.px(22, 4, 'gold', 10); T.px(24, 3, 'gold', 10); T.px(26, 2, 'gold', 10); T.px(24, 5, 'red', 8);
    for (let i = 0; i < 3; i++) { const y = 6 - ((k + i * 1.4) % 4) * 1.6, x = 14 + i * 2 + ((k + i) & 1); T.ell(x, y, 1.6, 1.2, 'stone', 5); }
    if (k !== 2) { const Z = [[0, 0], [4, 4], [2, 5], [7, 8], [5, 9], [11, 11]]; for (let i = 0; i + 1 < Z.length; i++) { T.line(Z[i][0], Z[i][1], Z[i + 1][0], Z[i + 1][1], 'lamp', 9, 1); T.line(Z[i][0] + 1, Z[i][1], Z[i + 1][0] + 1, Z[i + 1][1], 'linen', 11, 1); } }
    T.rect(5, 19, 2, 3, 'crimson', 7); T.px(5, 18, 'skin', 7); T.px(4, 21, 'skin', 6); T.rect(25, 24, 2, 3, 'denim', 7); T.px(26, 23, 'skin', 7); T.px(27, 26, 'skin', 6);
    [[8, 14], [24, 17], [9, 26], [23, 30]].forEach(([x, y], i) => T.px(x, y + ((k + i) & 1), 'fire', 9, 1));
  },
  // 9 死神: a skeleton knight in black armour under a red plume, a black banner with a white rose, the sun between two towers
  function (T, k) {
    sky(T, 'lav', [[0, 3], [12, 4], [24, 5], [32, 6]]);
    T.ell(24, 36, 4.4, 4.4, 'dusk', 10, 1); T.ell(24, 36, 2.6, 2.6, 'dusk', 11, 1); T.rect(19, 28, 3, 9, 'stone', 3); T.rect(27, 28, 3, 9, 'stone', 3); T.px(20, 27, 'stone', 3); T.px(28, 27, 'stone', 3);
    T.rect(0, 37, 32, 7, 'earth', 4); T.hl(0, 37, 32, 'earth', 6); T.line(20, 44, 25, 38, 'water', 6); T.line(21, 44, 26, 38, 'water', 5);
    // the banner
    T.line(19, 3, 19, 42, 'wood', 5); T.px(19, 2, 'gold', 9);
    const w = (x) => Math.round(Math.sin(x * 0.7 - k * 1.5) * 0.9);
    for (let x = 20; x < 31; x++) for (let y = 4; y < 15; y++) T.px(x, y + w(x), 'iron', 2 + (y === 4 ? 1.5 : 0));
    const rw = w(25); T.ell(25, 9 + rw, 2.6, 2.6, 'linen', 9); T.px(25, 9 + rw, 'linen', 6); T.px(24, 8 + rw, 'linen', 11); T.px(26, 10 + rw, 'linen', 7); T.px(23, 12 + rw, 'leaf', 5);
    // the knight: a black cape, plate armour lit on its left, a skull in an open helm under a red plume, a gauntlet on the pole
    T.poly([[3, 18], [8, 17], [6, 38], [0, 40], [0, 26]], 'magic', (x) => (x < 2 ? 3 : 2));
    T.poly([[5, 18], [15, 18], [16, 31], [4, 31]], 'iron', (x) => (x < 7 ? 6.5 : x > 13 ? 3 : 4.5)); T.vl(10, 19, 12, 'iron', 7.5); T.vl(11, 19, 12, 'iron', 3.5); T.hl(5, 18, 10, 'iron', 7);
    for (let j = 0; j < 3; j++) { const y = 31 + j * 2; T.hl(4 - j, y, 13 + j * 2, 'iron', 6); T.hl(4 - j, y + 1, 13 + j * 2, 'iron', 3); }
    T.hl(4, 30, 12, 'brass', 6); T.px(10, 30, 'brass', 9); T.rect(6, 37, 3, 4, 'iron', 4); T.rect(12, 37, 3, 4, 'iron', 3); T.hl(5, 40, 4, 'iron', 6); T.hl(12, 40, 4, 'iron', 5);
    T.ell(5, 19, 3.4, 2.6, 'iron', (u, v) => (u + v < -0.3 ? 8 : 5)); T.ell(15.5, 19, 3, 2.4, 'iron', (u, v) => (u + v < -0.3 ? 6 : 3.5)); T.px(4, 18, 'iron', 10); T.hl(2, 21, 6, 'iron', 3);
    T.line(16, 21, 18, 25, 'iron', 4); T.rect(18, 24, 2, 3, 'iron', 6); T.px(18, 24, 'iron', 8);
    T.line(3, 21, 2, 27, 'iron', 5); T.rect(1, 27, 2, 2, 'iron', 7);
    T.ell(10, 11.5, 4.8, 5.4, 'iron', (u) => (u < -0.3 ? 7 : u > 0.4 ? 3 : 5)); T.px(8, 7, 'iron', 9); T.rect(8, 10, 5, 6, 'bone', 8); T.px(8, 10, 'bone', 9); T.px(12, 15, 'bone', 6);
    T.rect(8, 11, 2, 2, 'ink', 0); T.rect(11, 11, 2, 2, 'ink', 0); T.px(9, 12, 'red', k & 1 ? 9 : 7, 1); T.px(12, 12, 'red', k & 1 ? 9 : 7, 1); T.px(10, 13, 'ink', 1); T.hl(8, 15, 5, 'bone', 6); T.px(9, 15, 'ink', 1); T.px(11, 15, 'ink', 1);
    for (let i = 0; i < 7; i++) T.px(10 - i, 6 - Math.round(Math.sin(i * 0.55) * 2.2) + (i > 4 ? i - 4 : 0), 'red', 8 - i * 0.4); T.px(11, 6, 'red', 9); T.px(9, 5, 'red', 6); T.px(6, 4, 'red', 6); T.px(4, 5, 'red', 5);
  },
];
// build: the back, and every face × 4 frames
const BACK = new CT(); paintBack(BACK);
const FACES = FACE.map((f) => [0, 1, 2, 3].map((k) => { const T = new CT(); paintFrame(T); T.win(); f(T, k); T.all(); return T; }));

// ───────── the tent ─────────
// velvet: vertical folds (ridges lit, valleys dark), pile noise; normals follow the folds so the lanterns catch the ridges
const velH = (xx) => 0.62 * Math.sin(xx * TAU / 13 + 0.9 * Math.sin(xx * 0.057)) + 0.38 * Math.sin(xx * TAU / 29 + 1.7);
function velvet(S, x, y, m, base, xx, rec, flip) {
  const hh = velH(xx), sl = (velH(xx + 0.7) - velH(xx - 0.7)) / 1.4, t = base + 1.7 * hh + (hh > 0.74 ? 0.9 : 0) - (hh < -0.62 ? 0.9 : 0) + (vnoise(x / 1.7, y / 4.5, 13) - 0.5) * 0.9;
  S.px(x, y, m, t, { n: [clamp(-sl * 2.6, -0.85, 0.85) * (flip ? -1 : 1), 0] }); if (rec) rec[y * AW + x] = t; return hh;
}
const CURT = new Float32Array(AW * AH).fill(-1);   // the back curtain's painted tone (the coloured star spots follow its folds)
const MOT = { s: ['.....', '..#..', '.#o#.', '..#..', '.....'], m: ['..##.', '.#...', '#o...', '.#...', '..##.'] };

// the fan chair behind the teller: a rolled rim, spokes, rings of open wicker loops (the curtain shows through)
function fanChair(S) {
  const cx = 150, cy = 86, rx = 47, ry = 55, SEG = PI / 14, bw = 0.175;
  S.beg();
  for (let y = cy - ry; y <= 126; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, r = Math.sqrt(u * u + v * v); if (r > 1) continue; const th = Math.atan2(v, u);
    if (r > 0.9) { const k = (r - 0.9) / 0.1, bind = Math.floor((th + PI) * rx / 3.2) % 3 === 0; S.px(x, y, 'sand', (bind ? 3.6 : 5.6) + (k > 0.3 && k < 0.7 ? 0.8 : 0), { n: [u * (k - 0.5) * 1.6, v * (k - 0.5) * 1.6] }); continue; }
    const s = (th + PI) / SEG, f = s - Math.floor(s), across = Math.min(f, 1 - f) * SEG * r * rx;
    if (r < 0.2) { S.px(x, y, 'sand', 4.2 + (((x + y) & 1) ? 0.8 : -0.6), { n: [u * 0.6, v * 0.6] }); continue; }
    if (across < 0.7) { S.px(x, y, 'sand', 4.9, { n: [f < 0.5 ? -0.5 : 0.5, 0] }); continue; }
    const b = (0.9 - r) / bw, bf = b - Math.floor(b);
    if (bf < 0.1) { S.px(x, y, 'sand', 4.5, { n: [u * 0.5, v * 0.5] }); continue; }
    const cw = SEG * r * rx, ex = (f - 0.5) * cw, ey = (bf - 0.55) * bw * ry, ax = cw * 0.34, ay = bw * ry * 0.34;
    if (ax < 1.4) { if ((x + y) % 2) S.px(x, y, 'sand', 3.8); continue; }
    const q = Math.sqrt((ex / ax) ** 2 + (ey / ay) ** 2); if (Math.abs(q - 1) * Math.min(ax, ay) < 0.62) S.px(x, y, 'sand', 4.4 + (ey < 0 ? 0.8 : -0.4), { n: [ex / ax * 0.5, ey / ay * 0.5] });
  }
  S.end();
}
// a round table under velvet: the top (a gold-embroidered border, a ring of stitched stars), the cloth hanging to the floor in
// folds that crowd toward the sides, an embroidered band of moons and stars along a wavy hem, the fringe.
// near: only the half toward us (fg); rec: keep what was painted (the cards' shadows darken it)
function paintTable(S, near, rec) {
  const { cx, cy, rx, ry, hem, hry } = TG.table;
  const put = (x, y, m, t, n) => { if (y >= AH) return; S.px(x, y, m, t, { n }); if (rec) { const p = y * AW + x; rec.m[p] = MI[m]; rec.t[p] = t; rec.nx[p] = n[0]; rec.ny[p] = n[1]; } };
  for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
    if (near && y < cy) continue; const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.sqrt(u * u + v * v); if (d > 1) continue;
    const pile = (vnoise(x / 2.5, y / 1.3, 21) - 0.5) * 0.9;
    if (d > 0.955) { put(x, y, 'magic', 7.6 + (v > 0 ? 0.6 : -0.8), [u * 0.4, v > 0 ? 0.35 : -0.7]); continue; }
    if (d > 0.87) { const a = Math.atan2(v, u), sx = Math.floor((a + PI) * rx / 3); put(x, y, 'gold', (sx % 3 === 0 ? 7 : 5) + (d > 0.93 || d < 0.89 ? -1 : 0), [0, -0.8]); continue; }
    if (Math.abs(d - 0.56) < 0.035) { const a = Math.atan2(v, u), q = Math.floor((a + PI) * rx * 0.56 / 2); if (q % 2 === 0) { put(x, y, 'gold', 5.2, [0, -0.8]); continue; } }
    put(x, y, 'magic', 6.2 + pile + (v < 0 ? -0.5 : 0), [0, -0.85]);
  }
  for (let x = cx - rx; x < cx + rx; x++) {
    const u = (x + 0.5 - cx) / rx; if (Math.abs(u) >= 1) continue; const s = Math.sqrt(1 - u * u), ph = Math.asin(u), a = ph * 26 + 0.5 * Math.sin(ph * 7), fh = Math.sin(a), fs = Math.cos(a);
    const yt = Math.round(cy + ry * s), yb = Math.round(hem + hry * s + fh * 1.2 * s), mi = Math.floor((ph + PI / 2) * 30 / PI), mf = (ph + PI / 2) * 30 / PI - mi;
    for (let y = yt + 1; y <= yb; y++) {
      const k = (y - yt) / Math.max(1, yb - yt), n = [clamp(u * 0.8 - fs * 0.5, -0.9, 0.9), 0.12];
      if (y === yt + 1) { put(x, y, 'magic', 7.6 + fh * 0.6, [u * 0.5, -0.3]); continue; }
      if (y >= yb - 6 && y <= yb - 2) {   // embroidered band: crescents and stars in gold thread
        const row = y - (yb - 6); if (row === 0 || row === 4) { put(x, y, 'gold', 6 + fh * 0.9 - (row === 4 ? 1 : 0), n); continue; }
        const lc = Math.round(mf * 6 - 3), mo = (mi % 2) ? (row === 2 ? Math.abs(lc) <= 1 : lc === 0) : (row === 2 ? lc === -1 : lc === 0 || lc === 1);
        put(x, y, mo ? 'gold' : 'magic', mo ? 7 + fh * 0.8 : 3.6 + fh * 1.4, n); continue; }
      put(x, y, 'magic', 5 + fh * 2.1 - k * 1.3 + (fh > 0.8 ? 0.8 : 0) - (fh < -0.7 ? 0.8 : 0), n);
    }
    put(x, yb + 1, 'magic', 2.2, [0, 0.4]);
    const len = x % 6 === 0 ? 5 : x % 2 === 0 ? 3 : 2; for (let j = 2; j <= len + 1; j++) put(x, yb + j, 'gold', (x % 6 === 0 && j === 3 ? 8 : 6.8) - j * 0.8 + fh * 0.4, [u * 0.5, 0.3]);
  }
}
// lights, the same in both defs (so both halves are lit alike); 5–7 sit on the three card slots, off until a card shows an
// omen or a lit face: anim sets their level (rs.mul) and colour (the light's rgb) every frame
const CL = {};
const lightsOf = (sc, key) => {
  sc.light({ x: 44, y: 42, z: 16, r: 104, i: 0.85, c: '#ffb45c', tint: 0.25 });                           // 0 star lantern, left
  sc.light({ x: 256, y: 42, z: 16, r: 104, i: 0.85, c: '#ffb45c', tint: 0.25 });                          // 1 star lantern, right
  sc.light({ x: 55, y: 122, z: 24, r: 92, i: 0.9, c: '#ff9a48', fl: 'candle', ph: 1.3, tint: 0.35 });    // 2 the candles
  sc.light({ x: 250, y: 115, z: 22, r: 86, i: 0, c: '#9a7cff', bake: false, tint: 0.45 });               // 3 crystal ball (from o.ball)
  sc.light({ x: 150, y: 118, z: 50, r: 130, i: 0.36, c: '#c89cff' });                                     // 4 soft fill from the front
  CL[key] = TG.cards.map(([x, y]) => sc.lights[sc.light({ x, y, z: 30, r: 58, i: 0, c: '#ffffff', bake: false, tint: 0.4 })]);   // 5–7 cards
};
// pierced lantern holes by band (latitude, count, longitude offset): lit on the front, thrown as spots from the back
const BANDS = [[-0.32, 7, 0], [0.12, 8, 0.2], [0.5, 8, 0.6], [0.86, 6, 0.1]];
const HOLES = []; BANDS.forEach(([lat, n, o0]) => { for (let k = 0; k < n; k++) HOLES.push([lat, o0 + k * TAU / n]); });
// the lantern's star points: brass cones round the equator and two tilted rings, [lat, lon, length]
const SPK = []; for (let k = 0; k < 8; k++) SPK.push([0, k * TAU / 8, 7]); for (let k = 0; k < 5; k++) { SPK.push([-0.62, k * TAU / 5 + 0.3, 4.5]); SPK.push([0.62, k * TAU / 5 + 0.9, 5]); }
// five-pointed star masks, radius 2…7: [dx, dy, edge]
const STAR = []; for (let r = 2; r <= 7; r++) { const L = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const rho = Math.hypot(x, y), w = (((Math.atan2(y, x) + PI / 2) * 5 / TAU) % 1 + 1) % 1, tri = Math.abs(w - 0.5) * 2, lim = r * (0.42 + 0.58 * tri); if (rho <= lim + 0.25) L.push([x, y, rho > lim - 0.9 ? 1 : 0]); } STAR.push(L); }
const Wd = (y) => (y < 92 ? 16 + 15 * Math.pow((92 - y) / 80, 1.4) : 16 + 11 * Math.pow((y - 92) / 60, 0.8));   // side drape width
// the star spots' field: anim fills a buffer and sets the box to where the spots are this frame
const FLD = { lay: 'wall', x0: 0, y0: 12, x1: 0, y1: 150, fn: (x, y, t, s) => { const b = s.st.sb; return b ? b[y * AW + x] : 0; } };

X.def('mb_tarot', {
  size: [AW, AH], fy: 150, noFrame: 1, amb: [0.2, 0.2],
  paint(S, sc) {
    lightsOf(sc, 'mb_tarot');
    // tent roof (under the marquee): dark striped panels meeting above the middle
    S.lay('wall'); for (let y = 0; y < 12; y++) for (let x = 0; x < AW; x++) { const s = Math.atan2(x + 0.5 - 150, y + 40) * 16 / PI, i = Math.floor(s), f = s - i; S.px(x, y, i & 1 ? 'magic' : 'crimson', 2 + y * 0.08 + (f < 0.1 ? -1 : f > 0.9 ? 0.7 : 0), { n: [0, 0.5] }); }
    // back curtain with gold-thread moons and diamonds
    for (let y = 12; y < 150; y++) for (let x = 0; x < AW; x++) velvet(S, x, y, 'crimson', 3.4, x + 1.6 * Math.sin(y * 0.043 + x * 0.013), CURT);
    for (let gy = 38, row = 0; gy < 146; gy += 22, row++) for (let gx = (row % 2 ? 14 : 0) + 6, col = 0; gx < AW - 3; gx += 28, col++) { const mt = (row + col) % 2 ? MOT.s : MOT.m;
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const ch = mt[j][i]; if (ch === '.') continue; const x = gx + i - 2, y = gy + j - 2, hh = velH(x + 1.6 * Math.sin(y * 0.043 + x * 0.013)); S.px(x, y, 'gold', (ch === 'o' ? 5 : 3.4) + hh * 1.2); CURT[y * AW + x] = 4 + hh; } }
    S.ao(0, 12, AW, 20, 't', 2); S.ao(0, 12, 60, 138, 'l', 1.4); S.ao(AW - 60, 12, 60, 138, 'r', 1.4); S.ao(0, 124, AW, 26, 'b', 1.4); S.ao(100, 12, 100, 40, 't', 0.8);
    // floor: dark boards, a patterned rug under the table
    TX.planks(S, 0, 150, AW, 25, 'wood', 3, { ph: 3, pw: 34, nails: false });
    for (let y = 151; y < AH; y++) { const xl = 34 - (y - 151) * 1.1, xr = 266 + (y - 151) * 1.1, by = y - 151;
      for (let x = Math.floor(xl) - 2; x <= Math.ceil(xr) + 2; x++) { if (x < 0 || x >= AW) continue; const bx = Math.min(x - xl, xr - x);
        if (bx < 0) { if (bx > -2.5 && y % 2 === 0) S.px(x, y, 'bone', 5.4); continue; }
        let m = 'crimson', t = 4;
        if (bx < 2 || by < 1) t = 2; else if (bx < 3 || by < 2) { m = 'gold'; t = 4.4; } else if (bx < 7 || by < 5) { m = 'denim'; t = 3; if ((x + y * 2) % 4 === 0) { m = 'gold'; t = 5; } } else if (bx < 8 || by < 6) { m = 'gold'; t = 4.2; }
        else { const dx = Math.abs(x - 150), p = (dx * 0.5 + by * 1.7) % 12, q = (dx * 0.5 - by * 1.7 + 240) % 12; t = 4 + (p < 1 || q < 1 ? 1.4 : 0) - (p > 5 && p < 7 && q > 5 && q < 7 ? 1.2 : 0); if (p < 1 && q < 1) { m = 'gold'; t = 5; } }
        S.px(x, y, m, t); } }
    S.ao(0, 150, AW, 5, 't', 1.4);
    // back: the lantern chains, the fan chair, two hanging shelves
    S.lay('back');
    TG.lanterns.forEach(([lx]) => { for (let y = 0; y < 29; y++) S.px(lx, y, 'iron', y % 3 === 0 ? 3 : y % 3 === 1 ? 7 : 5); });
    fanChair(S);
    [[60, 102], [198, 240]].forEach(([a, b]) => { S.beg(); for (let y = 24; y < 61; y++) { S.px(a + 2, y, 'sand', y % 2 ? 5 : 3.6); S.px(b - 3, y, 'sand', y % 2 ? 5 : 3.6); } S.box(a, 60, b - a, 3, 'wood', 6, { top: 1 }); S.px(a + 2, 59, 'sand', 6); S.px(b - 3, 59, 'sand', 6); S.end(); });
    S.lay('wall'); S.shadow([[60, 63], [102, 63], [104, 69], [62, 69]], 1.6); S.shadow([[198, 63], [240, 63], [242, 69], [200, 69]], 1.6); S.lay('back');
    // left shelf: a green potion, a tall red bottle, a skull, a stack of books
    S.beg(); S.ell(67, 55.5, 3.4, 3.4, 'glass', 4, { dome: 1 }); S.rect(66, 49, 2, 4, 'glass', 5); S.px(66, 48, 'wood', 6); S.px(67, 48, 'wood', 5); S.end();
    for (let y = 55; y < 59; y++) for (let x = 64; x < 71; x++) if (Math.hypot(x + 0.5 - 67, y + 0.5 - 55.5) < 3) S.px(x, y, 'leaf', 7 + (y === 55 ? 2 : 0), { e: 255 }); S.px(65, 54, 'linen', 10);
    S.beg(); S.rect(72, 50, 4, 9, 'glass', 4); S.rect(73, 47, 2, 3, 'glass', 5); S.px(73, 46, 'wood', 6); S.end(); for (let y = 53; y < 59; y++) { S.px(73, y, 'red', 7, { e: 255 }); S.px(74, y, 'red', 6, { e: 255 }); } S.px(72, 51, 'linen', 9);
    S.beg(); S.ell(80, 55, 3.4, 3.2, 'bone', 7, { dome: 1 }); S.rect(78, 57, 5, 2, 'bone', 6); S.end(); S.rect(78, 55, 2, 2, 'ink', 0); S.rect(81, 55, 2, 2, 'ink', 0); S.px(80, 57, 'ink', 1); S.px(79, 58, 'ink', 1); S.px(81, 58, 'ink', 1);
    [[84, 56, 14, 'leather', 5], [85, 53, 12, 'crimson', 5], [86, 51, 10, 'denim', 5]].forEach(([x, y, w, m, t]) => { S.beg(); S.box(x, y, w, 3, m, t); S.hl(x + 1, y + 1, w - 3, 'paper', 7); S.vl(x + 2, y, 3, 'gold', 5); S.end(); });
    // right shelf: upright books, a jar with something in it, a skull under a candle stub, an hourglass
    [[200, 9, 3, 'crimson'], [203, 11, 3, 'denim'], [206, 8, 2, 'leather'], [208, 10, 3, 'leaf'], [211, 7, 3, 'magic']].forEach(([x, h, w, m], i) => { S.beg(); S.box(x, 60 - h, w, h, m, 5 + (i % 2)); S.hl(x, 62 - h, w, 'gold', 5); S.hl(x, 57, w, 'gold', 4); S.end(); });
    S.beg(); S.line(214, 59, 220, 52, 'leather', 5, { w: 2 }); S.end();
    S.beg(); S.rect(221, 51, 7, 8, 'glass', 4); S.hl(221, 50, 7, 'brass', 6); S.hl(221, 49, 7, 'brass', 8); S.end(); S.ell(224.5, 55, 2.2, 2.5, 'leaf', 5); S.px(224, 54, 'linen', 8); S.px(222, 52, 'linen', 9);
    S.beg(); S.ell(232, 55.5, 3.2, 3, 'bone', 7, { dome: 1 }); S.rect(230, 57, 5, 2, 'bone', 6); S.end(); S.rect(230, 55, 2, 2, 'ink', 0); S.rect(233, 55, 2, 2, 'ink', 0); S.px(232, 57, 'ink', 1);
    S.beg(); S.rect(231, 49, 3, 4, 'bone', 8); S.px(232, 48, 'hair', 1); S.px(230, 52, 'bone', 7); S.px(234, 51, 'bone', 7); S.end();
    S.beg(); S.hl(236, 50, 4, 'brass', 8); S.hl(236, 59, 4, 'brass', 6); S.vl(236, 51, 8, 'brass', 5); S.vl(239, 51, 8, 'brass', 4); S.end(); S.px(237, 52, 'glass', 6); S.px(238, 52, 'glass', 6); S.px(237, 57, 'sand', 7); S.px(238, 57, 'sand', 7); S.px(237, 56, 'sand', 6); S.px(238, 58, 'sand', 6); S.px(237, 58, 'sand', 7);
    // mid: the cat's high stool, the whole table
    S.lay('mid');
    S.beg(); S.vl(257, 100, 50, 'wood', 4.6); S.vl(272, 100, 50, 'wood', 3.6); S.hl(258, 126, 14, 'wood', 4); S.hl(258, 127, 14, 'wood', 2.6); S.ell(265, 98.5, 10, 2.4, 'wood', 7, { n: [0, -0.8] }); S.hl(255, 100, 21, 'wood', 4); S.hl(255, 101, 21, 'wood', 2.8); S.end();
    paintTable(S, false);
    // front: side drapes tied back with gold rope, the valance with its fringe, a censer, books and a skull on the floor
    S.lay('front');
    [0, 1].forEach((rt) => { S.beg(); for (let y = 12; y < 155; y++) { const w = Wd(Math.min(y, 152)); for (let x = 0; x <= w; x++) { const X2 = rt ? AW - 1 - x : x, e = w - x;
        if (e < 1) { S.px(X2, y, 'gold', 6, { n: [rt ? -0.6 : 0.6, 0] }); continue; } if (e < 2) { S.px(X2, y, 'crimson', 7.2, { n: [rt ? -0.7 : 0.7, 0] }); continue; }
        velvet(S, X2, y, 'crimson', 4.4 - (y > 150 ? 1 : 0), x / w * 34 + (rt ? 41 : 0), null, rt); } } S.end();
      const tx = rt ? AW - 1 - 17 : 17; S.beg(); for (let x = 0; x < 19; x++) for (let j = 0; j < 4; j++) S.px(rt ? AW - 1 - x : x, 90 + j, 'gold', ((x + j * (rt ? -1 : 1)) % 3 === 0 ? 4 : 7) - (j === 3 ? 1.5 : 0), { n: [0, j < 2 ? -0.6 : 0.4] }); S.end();
      S.beg(); S.ell(tx + 0.5, 96, 2.2, 2.4, 'gold', 7, { dome: 1 }); for (let i = -2; i <= 2; i++) S.vl(tx + i, 98, 9 + (i === 0 ? 2 : Math.abs(i) === 2 ? -2 : 0), 'gold', 6.4 - Math.abs(i) * 0.7 + (i < 0 ? 0.5 : 0)); S.hl(tx - 2, 98, 5, 'gold', 8); S.end(); });
    S.beg(); for (let x = 0; x < AW; x++) { const f = (x % 30) / 30, yb = 24 + Math.round(3 * Math.sin(PI * f));
      for (let y = 12; y < yb; y++) S.px(x, y, 'crimson', 3.6 + 0.9 * Math.sin(x * TAU / 5 + Math.sin(x * 0.11)) + (y > yb - 3 ? -0.7 : 0) + (vnoise(x / 1.6, y / 3, 17) - 0.5) * 0.8, { n: [0.5 * Math.cos(x * TAU / 5), 0.2] });
      S.px(x, 10, 'gold', x % 3 === 0 ? 4 : 6.6, { n: [0, -0.7] }); S.px(x, 11, 'gold', (x + 1) % 3 === 0 ? 3.6 : 7, { n: [0, -0.3] }); S.px(x, 13, 'gold', x % 2 ? 4.6 : 3.4);
      S.px(x, yb, 'gold', 6.4, { n: [0, 0.3] }); S.px(x, yb + 1, 'gold', 3.8); }
    S.end();
    for (let k = 0; k <= 10; k++) { const x = k * 30; S.beg(); S.ell(x + 0.5, 25.5, 1.8, 1.8, 'gold', 7.5, { dome: 1 }); for (let i = -1; i <= 1; i++) S.vl(x + i, 27, 5 + (i === 0 ? 1 : 0), 'gold', 6 + i * -0.7); S.hl(x - 1, 27, 3, 'gold', 8); S.end(); }
    [20, 280].forEach((x) => { S.ell(x, 18.5, 3.2, 3.2, 'gold', 4.6, { ring: 1 }); S.px(x, 18, 'gold', 6.4); });
    // censer: a brass stand with a pierced lid, embers inside
    S.beg(); S.line(20, 134, 13, 167, 'brass', 5); S.line(20, 134, 27, 167, 'brass', 4); S.vl(20, 134, 34, 'brass', 6); S.hl(16, 150, 9, 'brass', 5); S.px(12, 167, 'brass', 7); S.px(28, 167, 'brass', 5);
    S.ell(20, 131, 6, 3, 'brass', 5.5, { n: [0, 0.2] }); S.hl(14, 129, 13, 'brass', 8.5, { n: [0, -0.8] }); S.ell(20, 127, 4.2, 3, 'brass', 6, { dome: 1 }); S.px(20, 123, 'brass', 8); S.end();
    [[18, 126], [21, 125], [22, 127], [19, 128]].forEach(([x, y]) => S.px(x, y, 'fire', 5, { e: 255 }));
    // a pile of old books and a skull, front right
    S.beg(); S.box(270, 162, 26, 5, 'leather', 5, { top: 1 }); S.hl(272, 164, 22, 'paper', 7); S.box(273, 157, 20, 5, 'crimson', 5, { top: 1 }); S.hl(275, 159, 16, 'paper', 7); S.vl(277, 157, 5, 'gold', 5); S.end();
    S.beg(); S.ell(283, 152.5, 3.6, 3.4, 'bone', 7, { dome: 1 }); S.rect(281, 154, 5, 2, 'bone', 6); S.end(); S.rect(281, 152, 2, 2, 'ink', 0); S.rect(284, 152, 2, 2, 'ink', 0); S.px(283, 154, 'ink', 1);
    // what a closer layer covers is never seen: drop it (fewer pixels to light every frame)
    const L = S.L; for (let p = 0; p < AW * AH; p++) { if (L.front.m[p]) { L.mid.m[p] = 0; L.back.m[p] = 0; L.wall.m[p] = 0; } else if (L.mid.m[p]) { L.back.m[p] = 0; L.wall.m[p] = 0; } else if (L.back.m[p]) L.wall.m[p] = 0; }
    // air: dust in the lantern light; the star spots are a field over the back curtain
    sc.emit({ k: 'dust', x: 70, y: 70, w: 60, h: 50, rate: 1.2, sp: 2, life: 5 });
    sc.emit({ k: 'dust', x: 230, y: 70, w: 60, h: 50, rate: 1.2, sp: 2, life: 5 });
    sc.field(FLD);
  },
  anim(D, t, rs, o) {
    o = o || NO; const st = rs.st, dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t;
    stageLights(rs, o, t, 'mb_tarot');
    const SP = o.stars || NO, spin = SP.spin || 0; st.rot = (st.rot || 0) + dt * (0.16 + 2.4 * spin);
    D.lay('wall'); spots(D, st, SP.q == null ? -1 : SP.q, spin);
    D.lay('back'); TG.lanterns.forEach(([lx, ly], i) => lantern(D, lx, ly, st.rot * (i ? -1 : 1), t + i * 3));
    D.lay('mid'); cat(D, t, o.cat || 0);
    D.lay('front'); smoke(D, t);
  },
});

// ───────── the table's near half, the ball, the candles, the cards ─────────
const TAB = { m: new Uint8Array(AW * AH), t: new Float32Array(AW * AH), nx: new Float32Array(AW * AH), ny: new Float32Array(AW * AH) };
const CANDLES = [[45, 139, 8, 0], [49, 141, 13, 1], [54, 138, 10, 2], [58, 142, 6, 3], [62, 139, 12, 4], [66, 141, 5, 5]];
const DEF3 = [{}, {}, {}];
X.def('mb_tarot_fg', {
  size: [AW, AH], fy: 150, noFrame: 1, clear: 1, noFloor: 1, amb: [0.2, 0.2],
  paint(S, sc) {
    lightsOf(sc, 'mb_tarot_fg');
    S.lay('mid'); paintTable(S, true, TAB);
    S.lay('front');
    // candles on a brass dish, wax pooled round them
    S.beg(); S.ell(55, 141.5, 13, 3, 'brass', 5.5, { n: [0, -0.7] }); S.ell(55, 141, 11, 2.2, 'brass', 3.6, { n: [0, -0.8] }); S.hl(43, 143, 25, 'brass', 3.4); S.end();
    CANDLES.forEach(([x, y, h]) => candle(S, x, y, h, 'bone', 8));
    [[47, 141], [52, 142], [60, 141], [64, 142], [56, 140]].forEach(([x, y]) => { S.px(x, y, 'bone', 7); S.px(x + 1, y, 'bone', 6); });
    // the ball's brass claw stand (the claws grip the ball, so they are drawn over it)
    S.beg(); S.ell(250, 138, 8, 2.2, 'brass', 5, { n: [0, -0.6] }); S.hl(243, 139, 15, 'brass', 3.4); S.cyl(247, 131, 7, 7, 'brass', 6, { rim: 2 }); S.hl(246, 131, 9, 'brass', 8, { n: [0, -0.8] }); S.hl(246, 134, 9, 'brass', 4); S.end();
    [[-1, 6.5], [1, 5]].forEach(([s, tn]) => { S.beg(); S.line(250 + s * 4, 131, 250 + s * 9, 126, 'brass', tn, { w: 2 }); S.line(250 + s * 9, 126, 250 + s * 10, 120, 'brass', tn + 0.5); S.px(250 + s * 10, 119, 'brass', tn + 2); S.px(250 + s * 11, 121, 'brass', tn - 1); S.end(); });
    S.beg(); S.line(250, 132, 250, 127, 'brass', 7.5, { w: 2 }); S.px(250, 126, 'brass', 9.5); S.px(251, 126, 'brass', 7); S.end();
    // the rest of the deck, some coins
    S.beg(); S.poly([[113, 144], [123, 144], [125, 147], [115, 147]], 'denim', 3.4, { n: [0, -0.8] }); S.hl(115, 147, 11, 'gold', 6); S.hl(115, 148, 11, 'paper', 7); S.hl(115, 149, 11, 'gold', 4); S.px(119, 145, 'gold', 6); S.end();
    [[178, 147], [182, 148], [185, 146], [233, 147]].forEach(([x, y]) => { S.beg(); S.hl(x, y, 3, 'gold', 7, { n: [0, -0.8] }); S.px(x + 1, y + 1, 'gold', 4); S.end(); });
    sc.emit({ k: 'emb', x: 55, y: 124, w: 18, rate: 1.4, sp: 6, ang: 0, spread: 0.6, life: 1.6 });
  },
  anim(D, t, rs, o) {
    o = o || NO; const st = rs.st; stageLights(rs, o, t, 'mb_tarot_fg');
    D.lay('front'); CANDLES.forEach(([x, y, h, i]) => flame(D, x, y - h - 2, 4, t, i * 1.7));
    D.lay('mid'); ball(D, t, o.ball || 0);
    // light level on each card (their own pixels skip the per-pixel lighting, only the gold foil is lit): the candles' flicker
    // on the left one, the ball on the right one
    const b = o.ball || 0, LV = [-0.3 + 0.3 * n1(t * 9 + 1.3), -0.6, -0.5 + 0.9 * b];
    const cs = o.cards || DEF3, P = cs.map((c, i) => pose(i, c || NO, t)).filter((p) => p.i !== o.frontI).sort((a, b2) => a.lift + (a.c.q >= 0 ? 50 : 0) - (b2.lift + (b2.c.q >= 0 ? 50 : 0)));
    P.forEach((p) => cshadow(D, p)); P.forEach((p) => aura(D, p, t));
    D.lay('front'); P.forEach((p) => card(D, p, t, LV[p.i]));
    // events: pressed → a pinch of gold dust; landed face up → a puff; a tap on the cloth → a ring of gold; echo particles by tier
    P.forEach((p) => { const k = 'pr' + p.i, pr = p.c.press || 0; if (pr > 0.5 && !st[k]) rs.burst('gold', p.x, p.y - 28, 10, { sp: 34, life: 0.8, w: 20, floor: 150 }); st[k] = pr > 0.5 ? 1 : 0;
      const f = 'fc' + p.i; if (p.face && st[f] === 0 && p.dl >= 1) rs.burst('mote', p.x, p.y + 30, 8, { sp: 16, ang: 0, spread: 2.4, life: 0.9, w: 30 }); st[f] = p.face ? 1 : 0; });
    const tp = o.tap; if (tp && tp.n !== st.tap) { if (st.tap != null) for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; rs.burst('gold', tp.x + Math.cos(a) * 3, tp.y + Math.sin(a), 1, { sp: 22, ang: a + PI / 2, spread: 0.2, life: 0.6, floor: 175 }); } st.tap = tp.n; }
    const tr = o.tier || 0, lit = P.find((p) => p.face && (p.c.glow || 0) > 0.5);
    if (lit && tr > 0 && R() < 0.1 + tr * 0.1) rs.burst(['mote', 'glint', 'soul', 'gold'][Math.min(3, tr - 1)], lit.x + (R() - 0.5) * 60, lit.y + (R() - 0.5) * 70, 1, { sp: 8, life: 1.6 });
    if (b > 0.3 && R() < b * 0.25) rs.burst('mote', TG.ball.x + (R() - 0.5) * 14, TG.ball.y - 4, 1, { sp: 6, ang: 0, spread: 0.8, life: 1.4 });
  },
});

// one card alone on a see-through stage (o.frontI): the mini game draws the card being revealed above the show's dim and rays
X.def('mb_tarot_card', { size: [AW, AH], fy: 150, noFrame: 1, clear: 1, noFloor: 1, amb: [0.2, 0.2],
  paint(S, sc) { lightsOf(sc, 'mb_tarot_card'); },
  anim(D, t, rs, o) { o = o || NO; const i = o.frontI, c = o.cards && o.cards[i]; if (i == null || !c) return; stageLights(rs, o, t, 'mb_tarot_card'); const p = pose(i, c, t), b = o.ball || 0, LV = [-0.3 + 0.3 * n1(t * 9 + 1.3), -0.6, -0.5 + 0.9 * b];
    D.lay('mid'); aura(D, p, t); D.lay('front'); card(D, p, t, LV[i]); } });

// ───────── per-frame pieces ─────────
// light levels: the ball from o.ball; the flames dim in the freeze (o.dim) while cards and ball stay lit; a card with an
// omen or a lit face turns on the light over its slot, in the omen's (or the face's) colour
function stageLights(rs, o, t, key) {
  const b = o.ball || 0, k = 1 - 0.85 * (o.dim || 0), cs = o.cards || DEF3, L = CL[key];
  rs.mul[3] = (0.3 + 1.3 * b) * (0.92 + 0.08 * Math.sin(t * 2.3)); rs.mul[0] = rs.mul[1] = rs.mul[2] = rs.mul[4] = k;
  for (let i = 0; i < 3; i++) { const c = cs[i] || NO, q = c.q == null ? -1 : c.q, face = (Math.floor((c.flip || 0) + 0.5) & 1) === 1, om = c.omen == null ? 1 : c.omen, gl = c.glow || 0, dl = c.dealt == null ? 1 : c.dealt;
    let v = 0, rgb = null; if (dl >= 1 && q >= 0 && !face && om > 0) { v = 0.35 + 0.6 * om; rgb = QR[q][1]; } else if (dl >= 1 && face && gl > 0) { v = 0.85 * gl; rgb = FRGB[(c.face | 0) % 10]; }
    rs.mul[5 + i] = v; if (rgb && L) L[i].rgb = rgb; }
}
// where a card is this frame: dealt from the teller's hands, bobbing ±1 px out of phase, lifted, shaken, squeezed, turned
function pose(i, c, t) {
  const [bx, by] = TG.cards[i], dl = c.dealt == null ? 1 : clamp(c.dealt, 0, 1), e = ease(dl), [tx, ty] = TG.deal, pr = c.press || 0, sc = (0.35 + 0.65 * e) * (1 + (c.pop || 0));
  let x = tx + (bx - tx) * e, y = ty + (by - ty) * e - Math.sin(e * PI) * 16 + Math.round(Math.sin(t * 1.9 + i * 2.1)) - (c.lift || 0);
  const sh = c.shake || 0; if (sh) { x += (hash(Math.floor(t * 30), i, 3) - 0.5) * 4 * sh; y += (hash(Math.floor(t * 30), i, 7) - 0.5) * 3 * sh; }
  const fl = c.flip || 0;
  return { i, c, dl, x: Math.round(x), y: Math.round(y), sx: Math.abs(Math.cos(fl * PI)) * sc * (1 + 0.07 * pr), sy: sc * (1 - 0.1 * pr), face: (Math.floor(fl + 0.5) & 1) === 1, side: Math.sin(fl * PI), lean: c.lean || 0, lift: (c.lift || 0) + (1 - e) * 30 };
}
// a card: the texture sampled through scale (flip, squeeze), a lean (shear) and a lift; the gold foil is lit per pixel (so it
// glints in the candle, lantern and ball light), the rest takes the card's light level; a glint sweeps the back now and then,
// cracks of omen light open on it, a white rim when pressed; gilded edges and a dark outline
const COPT = { n: [0, 0], e: 0 };
function card(D, p, t, lv) {
  if (p.dl <= 0) return; const c = p.c, { x: cx, y: cy, sx, sy } = p, hw = 21 * sx, hh = 31 * sy, top = cy - hh, ln = p.lean * 3;
  const q = c.q == null ? -1 : c.q, gl = c.glow || 0, hov = c.hov || 0, rim = c.press || 0, crk = c.crack || 0, T = p.face ? FACES[(c.face | 0) % 10][Math.floor(t * 5 + p.i) & 3] : BACK;
  const gp = ((t * 0.19 + p.i * 0.37) % 1) * 5.3, gs = gp < 1 ? -14 + gp * 92 : -99, qm = q >= 0 ? MI[QR[q][0]] : 0, qt = q >= 0 ? QR[q][2] : 0, turn = -Math.abs(p.side) * 2.2;
  if (hw < 0.7) { for (let y = Math.round(top); y < Math.round(cy + hh); y++) D.px(cx, y, 'gold', 7, E); return; }
  const y0 = Math.floor(top), y1 = Math.ceil(cy + hh) - 1, x0 = Math.floor(cx - hw - 4), x1 = Math.ceil(cx + hw + 4); COPT.n[0] = clamp(p.side * 0.9, -0.9, 0.9);
  const base = lv + turn + rim * 1.4, sw = Math.round(Math.abs(p.side) * 2.4 * sy); let xa0 = 0, xb0 = 0;
  for (let y = y0; y <= y1; y++) { const v = (y + 0.5 - top) / sy; if (v < 0 || v >= CH) continue; const vi = v | 0, off = ln * (31 - v) / 31; let xa = 9999, xb = -1;
    for (let x = x0; x <= x1; x++) { const u = (x + 0.5 - cx - off) / sx + 21; if (u < 0 || u >= CW) continue; const ui = u | 0, pi = vi * CW + ui;
      let m = T.m[pi], tn = T.t[pi], e = 255;
      if (!p.face) {
        const gd = Math.abs(u + 0.55 * v - gs) < 2.6;
        if (m === GOLD) { if (gd) tn += 3; else { e = 0; tn += hov * 1.6 + rim * 1.4 + turn * 0.5; } } else tn += base + (gd ? 1 : 0);
        if (crk > 0) { if (CRK[pi] < crk) { m = qm; tn = qt; e = 255; } else if (CRH[pi] < crk) { m = qm; tn = qt - 4; e = 255; } }
      } else if (T.g[pi]) tn += 0.2 + gl * 0.8 + turn;
      else if (m === GOLD && gl < 0.3) { e = 0; tn += turn * 0.5; }
      else tn += base + gl * 0.8;
      if (rim > 0.05 && (ui === 0 || vi === 0 || ui === CW - 1 || vi === CH - 1)) { m = LINEN; tn = 8 + 3 * rim; e = 255; }
      COPT.e = e; D.px(x, y, m, e ? Math.round(tn) : tn, COPT); if (x < xa) xa = x; xb = x; }
    if (xb < 0) continue; if (y === y0) { xa0 = xa; xb0 = xb; }
    // right: the gilded side (wider while turning), then the outline; left: the outline
    if (sw > 0 && p.side > 0) { D.rect(xb + 1, y, sw, 1, 'gold', 5, E); xb += sw; } else if (sw > 0) { D.rect(xa - sw, y, sw, 1, 'gold', 5, E); xa -= sw; } else { D.px(xb + 1, y, 'gold', 3, E); xb++; }
    D.px(xa - 1, y, 'ink', 1, E); D.px(xb + 1, y, 'ink', 0, E); if (y === y1) for (let x = xa - 1; x <= xb + 1; x++) D.px(x, y + 1, 'ink', 0, E); }
  // the top edge catches the light
  if (hw > 4 && sw === 0) for (let x = xa0; x <= xb0; x++) D.px(x, y0 - 1, 'gold', 8, E);
}
// the omen aura: flame-edged light of the quality colour round a face-down card (behind it); a lit face gets a quieter one
const COLT = new Float32Array(AW), TOPT = new Float32Array(AW), ROWT = new Float32Array(AH);
function aura(D, p, t) {
  const c = p.c, q = c.q == null ? -1 : c.q; if (q < 0 || p.dl < 1) return; const om = p.face ? (c.glow || 0) * 0.55 : c.omen == null ? 1 : c.omen; if (om <= 0.02) return;
  const qm = QR[q][0], qt = QR[q][2], hw = 21 * p.sx, hh = 31 * p.sy, cx = p.x, cy = p.y, pad = Math.ceil(3 + 6 * om), w0 = 1.4 + 4 * om;
  const X0 = Math.max(0, Math.floor(cx - hw - pad)), X1 = Math.min(AW - 1, Math.ceil(cx + hw + pad)), Y0 = Math.max(0, Math.floor(cy - hh - pad - 5)), Y1 = Math.min(AH - 1, Math.ceil(cy + hh + pad));
  for (let x = X0; x <= X1; x++) { COLT[x] = w0 * (0.5 + 0.7 * vnoise(x * 0.45 + p.i * 9, t * 5, 5)); TOPT[x] = COLT[x] + 4.5 * om * vnoise(x * 0.6, t * 7.3, 6); }
  for (let y = Y0; y <= Y1; y++) ROWT[y] = w0 * (0.5 + 0.7 * vnoise((y + t * 22) * 0.28, p.i * 9 + 3, 5));
  const L = cx - hw, Rr = cx + hw, Tp = cy - hh, Bt = cy + hh;
  for (let y = Y0; y <= Y1; y++) { const yc = y + 0.5, dy = yc < Tp ? Tp - yc : yc > Bt ? yc - Bt : 0;
    for (let x = X0; x <= X1; x++) { const xc = x + 0.5, dx = xc < L ? L - xc : xc > Rr ? xc - Rr : 0; if (dx === 0 && dy === 0) { x = Math.max(x, Math.floor(Rr)); continue; }
      const th = dx === 0 ? (yc < Tp ? TOPT[x] : COLT[x]) : dy === 0 ? ROWT[y] : Math.min(ROWT[y], yc < Tp ? TOPT[x] : COLT[x]), d = dx === 0 ? dy : dy === 0 ? dx : Math.sqrt(dx * dx + dy * dy);
      if (d > th) continue; const k = d / th; D.px(x, y, qm, qt - (k < 0.3 ? 0 : k < 0.62 ? 2 : 4), E); } }
}
// the card's shadow on the cloth: the cloth's own pixels a few steps darker (smaller and fainter as the card rises)
const SOPT = { n: [0, 0] };
function cshadow(D, p) {
  if (p.dl < 0.5) return; const a = clamp(1 - p.lift / 40, 0.2, 1), rx = Math.max(1, 19.5 * p.sx * (0.65 + 0.35 * a) + 1), ry = 2.4, cx = p.x, cy = 143;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v; if (d > 1) continue; const pi = y * AW + x, m = TAB.m[pi]; if (!m) continue;
    SOPT.n[0] = TAB.nx[pi]; SOPT.n[1] = TAB.ny[pi]; D.px(x, y, m, TAB.t[pi] - (d < 0.5 ? 3 : 1.5) * a, SOPT);
  }
}
// the crystal ball: glass with a fresnel rim, mist swirling inside (a vortex, faster and brighter with b), highlights
let BGEO = null;
function ball(D, t, b) {
  const { x: bx, y: by, r } = TG.ball;
  if (!BGEO) { BGEO = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const u = (x + 0.5) / (r + 0.3), v = (y + 0.5) / (r + 0.3), q = u * u + v * v; if (q <= 1) BGEO.push([x, y, u, v, Math.sqrt(q)]); } }
  const a0 = t * (0.5 + 1.8 * b), O = { n: [0, 0], e: 0 };
  D.beg();
  for (const [x, y, u, v, rho] of BGEO) {
    const a = a0 + (1 - rho) * 2.4, ca = Math.cos(a), sa = Math.sin(a), ru = u * ca - v * sa, rv = u * sa + v * ca;
    const dens = vnoise(ru * 2.4 + 7, rv * 2.4 + 7, 11) * 0.75 + vnoise(ru * 5 + 3, rv * 5 + 3, 12) * 0.25 - 0.4 + b * 0.16;
    let m = 'glass', tn = 2 + (rho > 0.84 ? 2.5 : rho > 0.7 ? 1 : 0), e = 0;
    if (dens > 0 && rho < 0.93) { m = 'arcane'; tn = Math.min(11, Math.floor(2.5 + dens * 16 * (0.45 + 0.55 * b) + b * 2.5)); e = 255; }
    if ((Math.abs(u + 0.42) < 0.13 && Math.abs(v + 0.45) < 0.13) || (u + 0.3) ** 2 + (v + 0.62) ** 2 < 0.012) { m = 'linen'; tn = 11; e = 255; }
    else if (Math.abs(u - 0.44) < 0.1 && Math.abs(v - 0.36) < 0.1) { m = 'lamp'; tn = 9; e = 255; }
    O.n[0] = u * 0.9; O.n[1] = v * 0.9; O.e = e; D.px(bx + x, by + y, m, tn, O);
  }
  D.end();
}
// the star spots on the back curtain: each lantern's back-facing holes projected onto the curtain 26 px behind it; neutral they
// feed the field (the velvet brightens), with a quality colour they are painted in it, following the folds
function spots(D, st, q, spin) {
  const B = st.sb || (st.sb = new Float32Array(AW * AH)), L = st.sl || (st.sl = []); for (let k = 0; k < L.length; k++) B[L[k]] = 0; L.length = 0;
  const col = q >= 0 ? QR[q] : null, br = 1.2 + 0.4 * spin; let bx0 = AW, by0 = AH, bx1 = 0, by1 = 0;
  TG.lanterns.forEach(([lx, ly], li) => { const dir = li ? -1 : 1;
    for (const [lat, lon0] of HOLES) { const lon = lon0 + st.rot * dir, cl = Math.cos(lat), dz = cl * Math.cos(lon); if (dz > -0.3) continue;
      const k = 30 / -dz, sx = Math.round(lx + cl * Math.sin(lon) * k), sy = Math.round(ly + Math.sin(lat) * k), rr = clamp(Math.round(2.2 + 2.4 / -dz), 3, 7), v = br * Math.sqrt(-dz);
      for (const [dx, dy, ed] of STAR[rr - 2]) { const x = sx + dx, y = sy + dy; if (x < 0 || y < 12 || x >= AW || y >= 150) continue; const p = y * AW + x;
        if (col) { const ct = CURT[p]; if (ct >= 0) D.px(x, y, col[0], Math.round(col[2] - 3.5 + (ct - 4) * 0.7 - (ed ? 1.6 : 0) + spin), E); continue; }
        const w = ed ? v * 0.45 : v; if (w > B[p]) { if (!B[p]) L.push(p); B[p] = w; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } } } });
  if (bx1 >= bx0) { FLD.x0 = bx0; FLD.x1 = bx1 + 1; FLD.y0 = by0; FLD.y1 = by1 + 1; } else FLD.x1 = FLD.x0 = 0;
}
// a pierced brass star lantern turning on its chain: an onion dome, a globe of glowing holes and ribs, brass star points all
// round (the far ones behind the globe, the near ones in front) with a lit pinhole at each tip, a crimson tassel
let LGEO = null;
function lantern(D, lx, ly, rot, t) {
  if (!LGEO) { LGEO = []; for (let y = -5; y <= 5; y++) for (let x = -6; x <= 6; x++) { const u = x / 6.4, v = y / 5.7, q = u * u + v * v; if (q > 1) continue; const z = Math.sqrt(1 - q), lat = Math.asin(clamp(v, -1, 1)); LGEO.push([x, y, u, v, q, lat, Math.atan2(u, z), Math.cos(lat)]); } }
  const O = { n: [0, 0], e: 0 }, fl = 0.5 * n1(t * 7);
  const spike = (front) => { for (const [lat, l0, len] of SPK) { const lon = l0 + rot, cl = Math.cos(lat), dx = cl * Math.sin(lon), dy = Math.sin(lat), dz = cl * Math.cos(lon); if ((dz >= 0) !== front) continue;
      const bx = lx + dx * 5.6, by = ly + dy * 5, tx = lx + dx * (5.6 + len), ty = ly + dy * (5 + len); if (Math.abs(tx - bx) + Math.abs(ty - by) < 1.5) continue;
      O.n[0] = dx * 0.8; O.n[1] = dy * 0.8; D.line(bx, by, tx, ty, 'brass', 4.6 + dz * 1.8 - (dx > 0.3 ? 0.6 : 0), O); D.line(bx + (Math.abs(dy) > 0.5 ? 1 : 0), by + (Math.abs(dy) > 0.5 ? 0 : 1), (bx + tx) / 2, (by + ty) / 2, 'brass', 3.8 + dz * 1.5, O);
      if (front) D.px(tx, ty, 'lamp', 9, E); } };
  spike(false);
  D.px(lx, ly - 13, 'brass', 8); D.px(lx - 1, ly - 12, 'brass', 5); D.px(lx + 1, ly - 12, 'brass', 5);
  [0.6, 1.6, 3, 4.2, 5.2].forEach((hw, j) => { for (let x = -Math.round(hw); x <= Math.round(hw); x++) { O.n[0] = x / 6; O.n[1] = -0.6; D.px(lx + x, ly - 11 + j, 'brass', 5.4 + (x < 0 ? 1 : 0) + (j === 4 ? -1 : 0), O); } });
  D.hl(lx - 6, ly - 6, 13, 'brass', 8, { n: [0, -0.7] });
  for (const [x, y, u, v, q, lat, lp, cl] of LGEO) {
    let hole = 0; for (const [bl, n, o0] of BANDS) { if (Math.abs(bl - lat) > 0.24) continue; const st2 = TAU / n, j = Math.round((lp - rot - o0) / st2), dl = lp - rot - o0 - j * st2; if ((bl - lat) ** 2 + (dl * cl) ** 2 < 0.024) { hole = 1; break; } }
    if (hole) { D.px(lx + x, ly + y, 'lamp', Math.round((q < 0.45 ? 10.6 : 9) + fl), E); continue; }
    let rb = ((lp - rot) / (PI / 4)) % 1; rb = rb < 0 ? rb + 1 : rb; const rib = Math.min(rb, 1 - rb) * (PI / 4) * cl * 6.4 < 0.45;
    O.n[0] = u * 0.9; O.n[1] = v * 0.9; D.px(lx + x, ly + y, 'brass', rib ? 3.2 : 5 + (u < -0.3 && v < 0 ? 1.6 : 0) - (u > 0.5 ? 0.8 : 0), O);
  }
  D.hl(lx - 5, ly + 5, 11, 'brass', 7, { n: [0, 0.5] });
  [4, 3, 2, 1].forEach((hw, j) => D.hl(lx - hw, ly + 6 + j, hw * 2 + 1, 'brass', 5 - j * 0.4, { n: [0, 0.7] }));
  D.px(lx, ly + 10, 'brass', 8); D.px(lx, ly + 11, 'brass', 6);
  spike(true);
  for (let i = -1; i <= 1; i++) D.vl(lx + i, ly + 12, 4 + (i ? 0 : 1), 'crimson', 6 - Math.abs(i));
}
// the black cat on its high stool: sits looking at the table, turns to look at you (look > 0.5), blinks, swishes its tail;
// its top edge catches the lantern, its lower left the crystal ball's violet (a rim that follows the ball's light)
function cat(D, t, look) {
  const O = { n: [0, 0], e: 0 }, lk = look > 0.5, hx = lk ? 262 : 261, hy = 78, blink = !lk && (t % 3.7) < 0.14;
  const inside = (x, y) => { x += 0.5; y += 0.5; return inE(x, y, 266, 89.5, 6.6, 8.4) || inE(x, y, 262.5, 87, 4.6, 6) || inE(x, y, hx + 0.5, hy, 5.2, 4.3) || inP(x, y, [[hx - 4.6, hy - 1], [hx - 4, hy - 8], [hx - 0.6, hy - 3.4]])
    || inP(x, y, [[hx + 5.6, hy - 1], [hx + 5, hy - 8], [hx + 1.6, hy - 3.4]]) || (x >= 259 && x < 261 && y >= 88 && y < 98) || (x >= 262 && x < 264 && y >= 88 && y < 98); };
  // the tail, over the stool's edge
  const sw = Math.sin(t * 1.7) * 1.4 + Math.sin(t * 0.63) * 0.8;
  for (let j = 0; j < 20; j++) { const k = j / 19, x = 272 + Math.round(sw * k * k * 3 + k * 1.5), y = 95 + j; O.n[0] = 0.6; O.n[1] = 0; D.px(x, y, 'magic', 1.2, O); if (j < 15) D.px(x + 1, y, 'magic', 3.4, O); }
  for (let y = 68; y < 98; y++) for (let x = 255; x < 274; x++) { if (!inside(x, y)) continue;
    const up = !inside(x, y - 1), rt = !inside(x + 1, y), lf = !inside(x - 1, y), dn = !inside(x, y + 1), leg = (x === 261 && y > 89) || (x === 264 && y > 91);
    if ((lf || dn) && !up && y > 82) { D.px(x, y, 'arcane', 4, { e: 4 }); continue; }
    O.n[0] = rt ? 0.7 : lf ? -0.5 : 0; O.n[1] = up ? -0.8 : 0; D.px(x, y, 'magic', up ? 4.6 : rt ? 3.2 : leg ? 0.3 : 1.3 + (hash(x, y, 5) < 0.2 ? 0.6 : 0), O); }
  // ears, eyes, nose, whiskers
  D.px(hx - 3, hy - 5, 'pink', 3, O); D.px(hx - 3, hy - 4, 'pink', 2, O); D.px(hx + 4, hy - 5, 'pink', 3, O); D.px(hx + 4, hy - 4, 'pink', 2, O);
  if (blink) { D.hl(hx - 3, hy, 2, 'magic', 3, O); D.hl(hx + 2, hy, 2, 'magic', 3, O); }
  else { const g = lk ? 11 : 10; [[hx - 3, hy], [hx + 2, hy]].forEach(([x, y]) => { D.px(x, y, 'leaf', g, E); D.px(x + 1, y, 'leaf', g - 1, E); D.px(x, y - 1, 'leaf', g - 3, E); D.px(x + 1, y - 1, 'leaf', g - 2, E); D.px(lk ? x + 1 : x, y, 'ink', 0, E); }); }
  D.px(hx, hy + 2, 'pink', 6, O); D.px(hx + 1, hy + 2, 'pink', 5, O); D.px(hx, hy + 3, 'magic', 0, O);
  [[-4, 2], [-5, 2], [-6, 3], [-4, 3], [-5, 4]].forEach(([dx, dy]) => D.px(hx + dx, hy + dy, 'linen', 6, O)); [[5, 2], [6, 2], [7, 3], [5, 3], [6, 4]].forEach(([dx, dy]) => D.px(hx + dx, hy + dy, 'linen', 5, O));
}
// incense: two strands of smoke curling up from the censer, thinning out (dithered away) as they rise
function smoke(D, t) {
  const O = { n: [0, 0], e: 1 };
  for (let s = 0; s < 2; s++) for (let j = 0; j < 84; j++) { const k = j / 84, y = 122 - j, x = Math.round(20 + j * 0.16 + (1 + j * 0.07) * Math.sin(j * 0.13 - t * 1.5 + s * 2.3) + 2.2 * k * Math.sin(j * 0.05 - t * 0.7));
    const a = 1.15 - k * 1.1; if (X.bayer(x, y) > a) continue; D.px(x, y, 'lav', Math.round(8.4 - k * 3 - (s ? 0.8 : 0)), O); if (j > 12 && X.bayer(x + 1, y) < a * 0.8) D.px(x + 1, y, 'lav', Math.round(7 - k * 2.6), O); }
}

// geometry for the game (art px; logical = 360 + 4·ax, 110 + 4·ay): card centres (hit boxes 42×62 round them, before lift),
// the name plate on a face (card-local; its centre sits at card centre + plateC), the table, the ball, the teller's box
MB.tarot = { cards: TG.cards, cw: CW, ch: CH, table: TG.table, ball: TG.ball, teller: TG.teller, deal: TG.deal, plate: TG.plate, plateC: [0, 24], lanterns: TG.lanterns,
  // the textures themselves ({ m, t, g } per texel, 42×62): face 0…9 in TAROT order, −1 for the back; k = animation frame 0…3
  tex: (f, k) => (f < 0 ? BACK : FACES[f % 10][(k || 0) & 3]) };
})();
