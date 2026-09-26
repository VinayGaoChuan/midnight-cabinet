// ==== mc-pxroom-f.js ====
(function () {
// Pixel rooms, batch f (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 金字塔 pyramids · 巨石阵 stonehenge · 空中花园 gardens · 阿尔忒弥斯神庙 artemis · 罗德岛巨像 colossus — five outdoor wonders.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, stroll, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;
// true once when `on` turns true (per slot state key)
const once = (st, k, on) => { if (!on) { st[k] = 0; return false; } if (st[k]) return false; st[k] = 1; return true; };

// ───────── shared bits ─────────
// cellular pixel fire in a w×h box (same automaton as the smithy's), run at 30 Hz
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; } st.cool = cool == null ? 0.4 : cool;
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 3 ? 6 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < st.cool ? 1 : 0)); }
  }
  return f;
}
// clean: drop cells that float free of the flame body (nothing lit below them or beside them)
function drawFire(D, f, w, h, x0, y0, mask, lo, clean) { lo = lo || 4; const on = (x, y) => x >= 0 && x < w && y < h && f[y * w + x] >= lo;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f[y * w + x]; if (v < lo || (mask && !mask(x, y))) continue; if (clean && y < h - 1 && !on(x, y + 1) && !on(x - 1, y + 1) && !on(x + 1, y + 1)) continue; D.px(x0 + x, y0 + y, 'fire', clamp(v / 36 * 11.5, 1, 11), { e: 255 }); } }
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// palm: a curved, ringed trunk; fronds baked to 60 % of their length, the tips sway in anim (palmTips)
function palmTrunk(S, x0, y0, x1, y1, bend, m, t0) {
  const n = Math.round(Math.hypot(x1 - x0, y1 - y0));
  for (let k = 0; k <= n; k++) { const q = k / n, x = Math.round(x0 + (x1 - x0) * q + Math.sin(q * Math.PI) * bend), y = Math.round(y0 + (y1 - y0) * q), w = q < 0.25 ? 4 : q < 0.7 ? 3 : 2, ring = k % 3 === 0;
    for (let i = 0; i < w; i++) S.px(x + i - 1, y, m || 'wood', (t0 || 5) + (ring ? -1.6 : 0) + (i === 0 ? 1.2 : i === w - 1 ? -1.2 : 0), { n: [i === 0 ? -0.7 : i === w - 1 ? 0.7 : 0, 0] }); }
}
function frond(P, cx, cy, f, s0, s1, sw, lit) {
  for (let s = s0; s <= s1; s++) { const q = s / f.L, x = cx + Math.cos(f.a) * s, y = cy + Math.sin(f.a) * s + f.dr * q * q * f.L + sw * Math.max(0, q - 0.6) * f.L * 0.5;
    P.px(x, y, 'leaf', lit + 1.5 - q * 1.5, { n: [0, -0.7] }); if (s > 1 && s % 2 === 0) { P.px(x, y + 1, 'leaf', lit - 0.5); if (q > 0.25 && q < 0.92) P.px(x + (Math.cos(f.a) > 0 ? -1 : 1), y + 2, 'leaf', lit - 1.5); } }
}
function fronds(cx, cy, n, L, seed) { const r = X.rng(seed), out = []; for (let i = 0; i < n; i++) { const a = -Math.PI * 0.95 + i / (n - 1) * Math.PI * 0.9 + (r() - 0.5) * 0.2; out.push({ a, L: L * (0.75 + r() * 0.35), dr: 0.35 + r() * 0.3 + (Math.abs(Math.cos(a)) > 0.7 ? 0.25 : 0), ph: r() * 6 }); } return out; }
function palmBake(S, cx, cy, fr, lit) { fr.forEach(f => frond(S, cx, cy, f, 0, Math.round(f.L * 0.6), 0, lit)); S.ell(cx, cy + 1, 2.5, 2, 'wood', lit - 1, { dome: 1 }); S.px(cx - 2, cy + 3, 'brass', 5); S.px(cx + 1, cy + 3, 'brass', 4); S.px(cx - 1, cy + 4, 'brass', 5); }
function palmTips(D, cx, cy, fr, t, lit, gust) { fr.forEach(f => frond(D, cx, cy, f, Math.round(f.L * 0.6) + 1, Math.round(f.L), Math.sin(t * 1.3 + f.ph) * (0.25 + (gust || 0)) + (gust || 0) * 0.3, lit)); }
// a hard-edged light beam drawn as glow pixels (vertical, centre x, from y0 up to y1 < y0), fading in steps
function beam(D, x, y0, y1, w, a, m) { for (let y = y1; y <= y0; y++) { const q = (y0 - y) / Math.max(1, y0 - y1), v = a * (1 - q * 0.6); if (v < 0.12) continue; for (let i = -w; i <= w; i++) { const e = Math.abs(i) / (w + 0.5); if (v * (1 - e * 0.8) < 0.15) continue; D.px(x + i, y, m || 'lamp', clamp(Math.round(5 + v * 6.5 - e * 4.5), 4, 11), { e: 255 }); } } }

// ───────── 金字塔 pyramids (fantasy · misc · 史诗) ─────────
// golden dusk desert, the sun going down right behind the apex: the great pyramid stands against it as a dark silhouette
// with a rim of fire down both edges, rays fanning out round it over the whole sky; a painted sphinx, a red granite
// obelisk; a mason dresses a block, an architect reads the plan, kites circle the tip, sand drifts, the long shadows
// fall toward the eye. Every 9 s the sun sinks onto the tip: glints climb both edges, the capstone flares, the rays shoot
// out, a beam stands up into the sky, a sheen runs down the faces and the obelisk's glyphs light from top to bottom.
const PY = { ax: 70, ay: 13, L: [14, 84], F: [90, 87], Rt: [137, 81] };
const PSUN = [70, 16, 9];   // the sun's disc, centred just under the apex: only its crown and sides show round the tip
// ray wedges round the sun: [start angle, end angle, length], irregular widths, every other one lit
const PRAY = []; { const r = X.rng(64); for (let a = -Math.PI - 0.2, i = 0; a < 0.3; i++) { const w = 0.07 + r() * 0.1; if (i % 2 === 0) PRAY.push([a, a + w, 38 + r() * 80]); a += w; } }
// the pyramid's outer edge on row y (left or right), used for the rim of light
const pyEdge = (y, side) => { const q = (y - PY.ay) / (side < 0 ? PY.L[1] - PY.ay : PY.Rt[1] - PY.ay); return PY.ax + q * ((side < 0 ? PY.L[0] : PY.Rt[0]) - PY.ax); };
const PFR = fronds(15, 31, 8, 17, 41);
const duneY = (x) => 70 - Math.round(Math.abs(Math.sin(x * 0.028 + 0.9)) * 4 + Math.sin(x * 0.075 + 2) * 1.5);
const GLY = []; { const r = X.rng(12); for (let k = 0; k < 11; k++) for (let c = 0; c < 2; c++) GLY.push([134 + c * 4, 30 + k * 5, Math.floor(r() * 6)]); }
let PYF = null;
const GLYPH = ['010111010', '111101111', '110011110', '101010101', '011110010', '111010010'];
const EGY = {
  mason: { skin: ['skin', 4.5], hair: ['hair', 2], top: ['skin', 4.5], bot: ['linen', 6], boot: ['leather', 3] },
  arch: { skin: ['skin', 4.5], hair: ['hair', 2], top: ['linen', 6.4], bot: ['linen', 5], boot: ['leather', 3], robe: 1, hood: ['tile', 5] },
  girl: { skin: ['skin', 5], hair: ['hair', 2], top: ['teal', 5], bot: ['teal', 4], boot: ['leather', 3], robe: 1 },
};
X.def('pyramids', {
  amb: [0.36, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { dusk: 1, far: 'none', floor: 'sand', horizon: 66 });
    const [SX, SY, SR] = PSUN;
    sc.light({ x: SX, y: SY, z: -8, r: 260, i: 0.95, c: '#ffb070', tint: 0.45 });                              // 0 sun, behind the pyramid: it rims what faces up, the faces stay in shadow
    const cap = sc.light({ x: PY.ax, y: PY.ay + 3, z: 12, r: 44, i: 0.7, c: '#ffd060', fl: 'pulse', amp: 0.1, sp: 1.7, tint: 0.55 });   // 1 capstone
    sc.light({ x: 124, y: 72, z: 18, r: 58, i: 1.0, c: '#ff9a40', fl: 'fire', tint: 0.5 });                    // 2 brazier
    sc.light({ x: 137, y: 22, z: 30, r: 30, i: 0.35, c: '#ffd060', fl: 'pulse', amp: 0.15, sp: 1.7, ph: 1, tint: 0.4 });   // 3 obelisk tip
    sc.light({ x: 60, y: 30, z: 90, r: 150, i: 0.24, c: '#d07890', tint: 0.18 });                                // 4 the afterglow over the viewer's shoulder
    const r = S.r;
    // rays fanning out from behind the apex: every other wedge a step brighter, each its own length
    S.lay('wall'); for (let y = 3; y < 70; y++) for (let x = 3; x < W - 3; x++) { const d = Math.hypot(x + 0.5 - SX, (y + 0.5 - SY) * 1.1), a = Math.atan2(y + 0.5 - SY, x + 0.5 - SX); if (d < SR + 15) continue; if (PRAY.some(([a0, a1, l]) => a >= a0 && a < a1 && d < l)) S.tone(x, y, d < 60 ? 1.6 : 1.2); }
    // the sun: a halo in hard rings, the white-gold disc (the pyramid hides its lower half)
    for (let k = 4; k >= 1; k--) S.ell(SX, SY, SR + k * 3.6, SR + k * 3, 'dusk', 7 + (4 - k) * 0.95, { e: 255 });
    S.ell(SX, SY, SR, SR, 'lamp', 10, { e: 255 }); S.ell(SX - 1.5, SY - 2, SR * 0.62, SR * 0.55, 'lamp', 11, { e: 255 });
    // far dunes: flat backdrop in the sun's back light, every crest caught by it (brightest under the sun)
    for (let x = 0; x < W; x++) { const y0 = duneY(x), c = Math.abs(x - SX); for (let y = y0; y < FY; y++) S.px(x, y, 'sand', y - y0 < 1 ? (c < 45 ? 8 : 7) : y - y0 < 2 ? 5 : y < 78 ? 3.6 : 4.4, { e: 255 }); }
    for (let x = 0; x < W; x++) { const y0 = 79 + Math.round(Math.sin(x * 0.05 + 0.4) * 2 + Math.sin(x * 0.13) * 1); for (let y = y0; y < FY; y++) S.px(x, y, 'sand', y - y0 < 1 ? 7 : 5, { e: 255 }); }
    // ripples on the sand floor
    for (let y = FY + 2; y < H - 3; y += 3) for (let x = 0; x < W; x++) { const w = Math.sin(x * 0.19 + y * 0.8) + Math.sin(x * 0.07 - y); if (w > 0.9) { S.px(x, y, 'sand', 7.6); S.px(x, y + 1, 'sand', 4.6); } }
    // the great pyramid, back-lit: two faces in shadow with courses and staggered joints (the left one takes a little of
    // the afterglow), the gilded capstone cutting into the sun's disc
    S.lay('back'); const A = [PY.ax, PY.ay], L = PY.L, F = PY.F, Rt = PY.Rt;
    S.beg(); S.poly([A, L, F], 'sand', 4.3, { n: [-0.5, -0.3] }); S.poly([A, F, Rt], 'sand', 2.9, { n: [0.6, -0.3] });
    const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
    for (let k = 0.1; k < 1; k += 0.045) {
      const p = lerp(A, L, k), q = lerp(A, F, k), u = lerp(A, Rt, k);
      S.line(p[0], p[1], q[0], q[1], 'sand', 3.1, { n: [-0.5, -0.3] }); S.line(q[0], q[1], u[0], u[1], 'sand', 1.9, { n: [0.6, -0.3] });
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]), k2 = k + 0.0225, p2 = lerp(A, L, k2), q2 = lerp(A, F, k2);
      for (let s = (Math.round(k * 40) % 2) * 3 + 2; s < len - 1; s += 6) { const x = p2[0] + (q2[0] - p2[0]) * s / len, y = p2[1] + (q2[1] - p2[1]) * s / len; S.px(x, y, 'sand', 3.3); }
    }
    S.noise(10, 12, 130, 76, 1, 5, 17, { only: 'sand' });
    for (let i = 0; i < 14; i++) { const k = 0.35 + r() * 0.6, s = r(), p = lerp(lerp(A, L, k), lerp(A, F, k), s); S.px(p[0], p[1], 'sand', 2.8); S.px(p[0] + 1, p[1], 'sand', 3.4); S.px(p[0], p[1] + 1, 'sand', 5.8); }
    S.line(A[0], A[1], F[0], F[1], 'sand', 5.6, { n: [-0.3, -0.5] });
    const c1 = lerp(A, L, 0.1), c2 = lerp(A, F, 0.1), c3 = lerp(A, Rt, 0.1);
    S.poly([A, c1, c2], 'gold', 6, { e: cap + 1 }); S.poly([A, c2, c3], 'gold', 4, { e: cap + 1 }); S.line(A[0], A[1], c2[0], c2[1], 'gold', 8, { e: cap + 1 }); S.hl(c1[0], c1[1], c2[0] - c1[0], 'gold', 3.4, { e: cap + 1 });
    S.end();
    // the rim of fire: the sun behind catches the outermost pixel of both edges (two pixels thick near the tip), fading down
    for (let y = A[1] - 1; y < 58; y++) [-1, 1].forEach(side => { const q = (y - A[1]) / 56; let x = Math.round(pyEdge(y, side)) + side * 3; while (x > 3 && x < W - 3 && !S.at(x, y)) x -= side; if (!S.at(x, y)) return;
      S.px(x, y, 'lamp', clamp(10.6 - q * 7 - (side > 0 ? 0.6 : 0), 5, 11), { e: 255 }); if (q < 0.3) S.px(x - side, y, 'gold', clamp(9 - q * 10, 6, 10), { e: 255 }); });
    S.rect(64, 44, 3, 3, 'ink', 1); S.hl(63, 43, 5, 'sand', 2.6);   // the entrance, high on the face
    // the pyramid's shadow falls toward the eye, over the sand in front
    S.lay('wall'); S.shadow([[16, FY], [136, FY], [118, H], [34, H]], 1.3);
    // the sphinx: lion body, paws stretched forward, a gold-and-blue nemes
    S.lay('back'); const B = 88; S.beg();
    S.ell(131, B - 7, 8, 7, 'sand', 5.6, { dome: 1 }); S.rect(110, B - 13, 22, 13, 'sand', 5.6, { n: [0, -0.1] }); S.hl(111, B - 14, 19, 'sand', 7.2, { n: [0, -0.8] });
    S.rect(88, B - 5, 22, 5, 'sand', 6.2); S.hl(88, B - 6, 20, 'sand', 7.6, { n: [0, -0.8] }); S.vl(88, B - 5, 5, 'sand', 7.8, { n: [-0.8, 0] }); [89, 91, 93].forEach(x => S.px(x, B - 1, 'sand', 3));
    S.hl(96, B - 3, 14, 'sand', 4.5);
    S.rect(104, B - 17, 9, 17, 'sand', 6, { n: [-0.3, 0] }); S.vl(104, B - 16, 11, 'sand', 7.5, { n: [-0.8, 0] });
    // nemes: striped cap and lappets
    S.poly([[104, B - 29], [107, B - 32], [114, B - 32], [117, B - 28], [119, B - 15], [112, B - 13], [108, B - 20]], 'gold', 6.5);
    for (let y = B - 31; y < B - 13; y += 2) for (let x = 105; x < 120; x++) if (S.at(x, y)) S.px(x, y, 'tile', 4.5);
    S.poly([[103, B - 22], [108, B - 22], [109, B - 13], [104, B - 13]], 'gold', 7); for (let y = B - 21; y < B - 13; y += 2) S.hl(104, y, 5, 'tile', 4.5);
    S.hl(104, B - 30, 10, 'gold', 9); S.px(103, B - 30, 'gold', 10); S.px(103, B - 31, 'gold', 8);   // headband and uraeus
    // face in profile: brow, eye, nose, lips, false beard
    S.rect(100, B - 29, 5, 9, 'sand', 7.8, { n: [-0.7, 0] }); S.px(99, B - 26, 'sand', 8.6); S.px(98, B - 25, 'sand', 8.2); S.px(99, B - 24, 'sand', 6); S.hl(99, B - 22, 2, 'sand', 5.5); S.px(100, B - 21, 'sand', 7);
    S.hl(101, B - 27, 3, 'ink', 1); S.px(102, B - 28, 'sand', 5); S.px(104, B - 26, 'sand', 5.5);
    S.rect(101, B - 20, 2, 4, 'tile', 4.5); S.px(101, B - 17, 'gold', 7);
    S.line(137, B - 5, 133, B - 2, 'sand', 4); S.px(138, B - 6, 'sand', 6);   // tail
    S.end();
    S.noise(88, B - 16, 50, 16, 1, 3, 29, { only: 'sand' });
    S.shadow([[88, B], [140, B], [148, B + 2], [92, B + 2]], 1);
    // mid: the block being dressed on its sledge, chippings; the brazier on a tripod
    S.lay('mid'); S.beg(); S.box(35, FY - 12, 18, 11, 'sand', 7, { top: 3, side: 3, tt: 1.4 }); for (let k = 0; k < 4; k++) S.px(38 + k * 4, FY - 7 + (k % 2), 'sand', 5); S.hl(36, FY - 4, 16, 'sand', 6);
    S.rect(32, FY - 1, 26, 1, 'wood', 5); S.hl(32, FY - 2, 26, 'wood', 7); S.px(31, FY - 2, 'wood', 6); S.end();
    S.lay('wall'); S.shadow([[57, FY], [58, FY - 1], [74, FY + 1], [74, FY + 2], [56, FY + 2]], 1.6);
    S.lay('mid'); for (let i = 0; i < 16; i++) S.px(58 + r() * 12, FY - (r() < 0.3 ? 1 : 0), 'sand', 6 + r() * 3);
    S.beg(); S.line(120, FY, 124, 79, 'iron', 4); S.line(128, FY, 124, 79, 'iron', 3); S.line(124, FY, 124, 79, 'iron', 5); S.poly([[118, 76], [130, 76], [128, 80], [120, 80]], 'copper', 5); S.hl(118, 76, 12, 'copper', 8); S.end();
    // front: the palm against the glowing sky, the obelisk
    S.lay('front'); S.beg(); palmTrunk(S, 6, FY + 2, 15, 32, 4, 'wood', 3.6); palmBake(S, 15, 31, PFR, 4); S.end({ ink: 1 });
    S.beg(); S.rect(128, 85, 17, 5, 'mstone', 5, { n: [0, -0.3] }); S.hl(128, 85, 17, 'mstone', 8, { n: [0, -0.8] }); S.hl(128, 89, 17, 'mstone', 3);
    S.poly([[132, 25], [141, 25], [142, 85], [131, 85]], 'brick', 5.6); S.poly([[139, 25], [141, 25], [142, 85], [140, 85]], 'brick', 3.6); S.vl(132, 26, 59, 'brick', 7.4, { n: [-0.8, 0] });
    S.noise(131, 25, 12, 60, 1, 3, 33, { only: 'brick' });
    S.poly([[132, 25], [136.5, 17], [141, 25]], 'gold', 7, { e: 4 }); S.line(136, 18, 132, 24, 'gold', 10, { e: 4 }); S.poly([[137, 18], [141, 25], [139, 25]], 'gold', 4, { e: 4 });
    GLY.forEach(([x, y, g]) => { const gl = GLYPH[g]; for (let k = 0; k < 9; k++) if (gl[k] === '1') { S.px(x + (k % 3), y + Math.floor(k / 3), 'brick', 2.6); S.px(x + (k % 3), y + Math.floor(k / 3) + 1, 'brick', 7); } });
    S.end();
    sc.emit({ k: 'ember', x: 124, y: 74, w: 6, rate: 2.5, sp: 6, ang: 0, spread: 0.6, life: 1.8 });
    // the moment's sheen: a band of gold light sweeps down both faces after the capstone flares
    // (anim narrows the field's rows to the band each frame, and to nothing between moments, so it costs nothing at rest)
    let sT = -1, sP = -9; PYF = { x0: 14, y0: 14, x1: 138, y1: 14, lay: 'back', fn: (x, y, t) => { if (t !== sT) { sT = t; const mp = steps(t, 9); sP = mp > 0.08 && mp < 0.2 ? (mp - 0.08) / 0.12 * 100 - 8 : -99; } if (sP < -50) return 0; const d = (y - 13) + Math.abs(x - 70) * 0.35 - sP; return d > -5 && d < 0 ? 0.5 : d >= 0 && d < 3 ? 0.25 : 0; } }; sc.field(PYF);
    sc.shaft({ x: PY.ax, y0: 4, y1: PY.ay, w0: 6, w1: 2, i: 0.3, haze: 0.9, c: '#ffe08a', f: (t) => { const mp = steps(t, 9); return mp > 0.07 && mp < 0.32 ? 1 - (mp - 0.07) / 0.25 : 0; } });
  },
  anim(D, t, rs) {
    const st = rs.st;
    // two kites circle the capstone, gliding, now and then a few wingbeats
    D.lay('back'); for (let i = 0; i < 2; i++) { const a = t * (0.42 + i * 0.07) + i * 2.6, x = PY.ax + Math.cos(a) * (26 + i * 9), y = 27 + i * 5 + Math.sin(a) * 5, fl = Math.sin(t * 9 + i) > 0.3 && Math.sin(t * 0.8 + i * 3) > 0.2, d = Math.sin(a) > 0 ? 1 : -1;
      D.px(x, y, 'dusk', 1, { e: 255 }); D.px(x + d, y, 'dusk', 1, { e: 255 }); if (fl) { D.px(x - 1, y - 1, 'dusk', 1, { e: 255 }); D.px(x + 2, y - 1, 'dusk', 1, { e: 255 }); D.px(x - 2, y - 2, 'dusk', 1, { e: 255 }); D.px(x + 3, y - 2, 'dusk', 1, { e: 255 }); } else { D.px(x - 1, y, 'dusk', 1, { e: 255 }); D.px(x + 2, y, 'dusk', 1, { e: 255 }); D.px(x - 2, y + 1, 'dusk', 1, { e: 255 }); D.px(x + 3, y + 1, 'dusk', 1, { e: 255 }); } }
    D.lay('wall');
    // wind drifts sand along the ground
    for (let i = 0; i < 5; i++) { const y = 92 + i * 2 + (i % 2), x = ((t * (14 + i * 3) + i * 37) % 190) - 20; for (let k = 0; k < 6 + i; k++) D.px(x + k, y, 'sand', 8 - (k === 0 ? 1 : 0)); }
    // brazier fire
    D.lay('mid'); flame(D, 124, 75, 7, t, 0.4); flame(D, 121, 75, 4, t, 2.1); flame(D, 127, 75, 4, t, 3.3);
    // the mason dresses the block: raise, strike — a puff of stone dust and chips
    const hp = steps(t, 1.05); let aF; if (hp < 0.5) aF = 1.1 + Math.sin(hp / 0.5 * Math.PI / 2) * 1.8; else if (hp < 0.56) aF = 2.9 - (hp - 0.5) / 0.06 * 1.8; else aF = 1.1;
    worker(D, 60, FY, EGY.mason, { aF, eF: hp < 0.5 ? -0.3 : 0.1, aB: 1.3, eB: 0.5, lB: -0.25, lF: 0.3, kB: 0.1, lean: hp > 0.5 && hp < 0.7 ? 0.6 : 0.2, tool: 'hammer', ta: 0.3 }, -1);
    D.line(52, 71, 49, 72, 'iron', 8);
    if (once(st, 'hit', hp > 0.53 && hp < 0.62)) { rs.burst('steam', 54, FY - 7, 1, { sp: 5, ang: -0.8, spread: 1, life: 0.45 }); rs.burst('dust', 55, FY - 8, 5, { sp: 26, ang: 0.6, spread: 1.4, life: 0.8 }); }
    // the architect paces with the plan, stops to hold it up against the pyramid
    const w = stroll(t, 64, 84, 6, 0.2, 3.2), look = !w.walking && steps(t, 3.1) > 0.35;
    worker(D, w.x, FY, EGY.arch, w.walking ? Object.assign(w.pose, { aF: 1.3, eF: -1.2, tool: 'board' }) : look ? { aF: 2.4, eF: 0.2, aB: 0.6, eB: -1.2, tool: 'board', ta: -0.4 } : { aF: 1.3, eF: -1.2, aB: 0.2, eB: -0.3, tool: 'board' }, w.dir);
    D.hl(w.x - 2, FY - 21 + Math.round(w.walking ? w.pose.bob : 0), 5, 'gold', 7);
    // the sun is behind them: their shadows fall toward the eye, a little to the side (away from the sun's x)
    D.lay('wall'); [60, w.x].forEach((x) => { const sk = x < PSUN[0] ? -1 : 1; for (let k = 0; k < 7; k++) D.hl(x - 1 + Math.round(k * 0.45 * sk), FY + 1 + k, k < 5 ? 3 : 2, 'sand', 3.4); });
    // palm frond tips
    D.lay('front'); palmTips(D, 15, 31, PFR, t, 4);
    // the moment: every 9 s the last ray hits the capstone
    const mp = steps(t, 9), A = [PY.ax, PY.ay], F = PY.F;
    if (PYF) { const sp = mp > 0.08 && mp < 0.2 ? (mp - 0.08) / 0.12 * 100 - 8 : -99; PYF.y0 = Math.max(14, Math.floor(sp - 12)); PYF.y1 = sp < -50 ? PYF.y0 : Math.min(88, Math.ceil(sp + 17)); }
    // glints climb both rims to the tip
    if (mp < 0.07) { const q = mp / 0.07; D.lay('back'); [-1, 1].forEach(side => { for (let k = 0; k < 5; k++) { const y = Math.round(PY.ay + (1 - q) * 52 + k * 2); if (y > 66) continue; D.px(Math.round(pyEdge(y, side)) + side, y, 'lamp', 11 - k * 1.5, { e: 255 }); } }); }
    if (once(st, 'cap', mp >= 0.07 && mp < 0.4)) { rs.flash(0, 0.6); rs.flash(1, 2.2); rs.flash(3, 1.2); rs.burst('glint', A[0], A[1] + 2, 8, { sp: 26, life: 0.7 }); rs.burst('dust', A[0], A[1] + 4, 10, { sp: 14, life: 2.2, w: 8 }); }
    // the rays shoot out from behind the tip (behind the pyramid, over the sky) and fade
    if (mp >= 0.07 && mp < 0.3) { const q = (mp - 0.07) / 0.23, r0 = PSUN[2] + 13, r1 = r0 + 8 + Math.sin(Math.min(1, q * 1.6) * Math.PI / 2) * 72; D.lay('wall');
      for (let i = 0; i < 16; i++) { const a = -Math.PI - 0.25 + i / 15 * (Math.PI + 0.5), ca = Math.cos(a), sa = Math.sin(a) * 0.9, r2 = r1 * (i % 2 ? 0.7 : 1); for (let d = r0; d < r2; d += 1) { const y = PSUN[1] + sa * d; if (y > 68) break; const f = (d - r0) / (r2 - r0), v = 10.8 - f * 4 - q * 4.5; if (v < 5) break; D.px(PSUN[0] + ca * d, y, 'lamp', Math.round(v), { e: 255 }); } } }
    if (mp >= 0.07 && mp < 0.32) { const q = (mp - 0.07) / 0.25; D.lay('back'); beam(D, A[0], A[1] - 1, 4, 2, 1 - q);
      if (q < 0.4) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2, r0 = 3 + q * 10, r1 = r0 + 5 - q * 6; for (let d = r0; d < r1; d++) D.px(A[0] + Math.cos(a) * d, A[1] + 2 + Math.sin(a) * d * 0.8, 'lamp', 11 - (d - r0), { e: 255 }); } }
    if (mp >= 0.09 && mp < 0.45) { const q = (mp - 0.09) / 0.36; D.lay('front'); GLY.forEach(([x, y, g]) => { const k = (y - 30) / 55, a = q * 1.6 - k; if (a < 0 || a > 1) return; const gl = GLYPH[g]; for (let j = 0; j < 9; j++) if (gl[j] === '1') D.px(x + (j % 3), y + Math.floor(j / 3), 'gold', a < 0.4 ? 10 : 8, { e: 255 }); }); }
  },
});

// ───────── 巨石阵 stonehenge (nature · luck · 稀有) ─────────
// moonlit sarsen ring on the downs: far ring stones, the great trilithon whose gap glows like a curtain of light, the
// altar stone, carved rings that breathe with the gate; a druid keeps watch, sheep graze, mist creeps, a campfire burns.
// Every 8 s the moon stands over the gate: a moonbeam drops through it onto the altar, the gate flares, the carvings
// light up stone by stone and runes rise; the druid lifts his staff.
function sarsen(S, x, y, w, h, tn, sd, seed, o) {
  o = o || {}; const r = S.r;
  S.poly([[x + 1, y], [x + w - 1, y], [x + w, y + 2], [x + w + 0.5, y + h], [x - 0.5, y + h], [x, y + 2]], 'stone', tn);
  if (sd) S.poly([[x + w, y + 2], [x + w + sd, y + 3], [x + w + sd, y + h], [x + w, y + h]], 'stone', tn - 2.4, { n: [0.8, 0] });
  S.hl(x + 1, y, w - 2, 'stone', tn + 1.6, { n: [0, -0.8] }); S.vl(x, y + 2, h - 2, 'stone', tn + 0.9, { n: [-0.7, 0] }); S.vl(x + w - 1, y + 2, h - 2, 'stone', tn - 0.8, { n: [0.5, 0] });
  for (let i = 1; i < w - 1; i++) { const b = Math.floor(r() * 3) - 1; if (b > 0) { S.px(x + i, y, 0, 0); S.px(x + i, y + 1, 'stone', tn + 1.6, { n: [0, -0.8] }); } }
  for (let k = 0; k < h; k += 3 + Math.floor(r() * 5)) if (r() < 0.5) S.px(x - 0.5 + (r() < 0.5 ? 0 : w + 1), y + 3 + k, 0, 0);
  S.noise(x, y, w + (sd || 0), h, 1, 2.5, seed, { only: 'stone' });
  for (let k = 0; k < Math.max(1, w / 4); k++) { const gx = x + 2 + Math.floor(r() * Math.max(1, w - 4)), gy = y + 3 + Math.floor(r() * h * 0.4), gl = 3 + Math.floor(r() * h * 0.5); S.vl(gx, gy, Math.min(gl, y + h - gy - 1), 'stone', tn - 1.6); S.vl(gx + 1, gy + 1, Math.min(gl, y + h - gy - 2), 'stone', tn + 0.6); }
  // moss in a few clumps: at the foot of the stone and in the shadowed groove down its right side
  const nm = w > 10 ? 3 + Math.floor(r() * 2) : 2;
  for (let k = 0; k < nm; k++) { const foot = k % 2 === 0, vert = r() < 0.4, cw = vert ? 2 : 3, ch = vert ? 3 : 2;
    const cx = foot ? x + 1 + Math.floor(r() * Math.max(1, w - cw - 1)) : x + w - cw - Math.floor(r() * 2), cy = foot ? y + h - ch - 1 - Math.floor(r() * h * 0.2) : y + Math.floor(h * (0.45 + r() * 0.3));
    clump(S, cx, cy, cw, ch, 'moss', 3.5 + r()); }
  // lichen: one or two ochre patches along the top edge
  if (o.lichen) for (let k = 0, n = 1 + Math.floor(r() * 2); k < n; k++) { const big = r() < 0.5; clump(S, x + 2 + Math.floor(r() * Math.max(1, w - 5)), y + 1 + Math.floor(r() * 2), big ? 3 : 2, big ? 2 : 1, 'sand', 5.6); }
}
// a small block of moss / lichen, its top row a step lighter, only over stone already painted
function clump(S, x, y, w, h, m, t) { const cut = w * h > 4 && (x + y) % 2 ? w - 1 : -1;   // bigger clumps lose a top corner so they read as growth, not a sticker
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((j || i !== cut) && S.at(x + i, y + j) === X.MI.stone) S.px(x + i, y + j, m, j === 0 ? t + 1 : t); }
function lintel(S, x, y, w, h, tn, seed) {
  S.poly([[x + 1, y], [x + w - 1, y], [x + w, y + 1], [x + w, y + h], [x, y + h], [x, y + 1]], 'stone', tn); S.hl(x + 1, y, w - 2, 'stone', tn + 1.8, { n: [0, -0.8] }); S.hl(x, y + h - 1, w, 'stone', tn - 1.6, { n: [0, 0.7] });
  S.noise(x, y, w, h, 1, 2.5, seed, { only: 'stone' });
}
function carve(S, x, y, k, gi) { const g = ['0110100110010110', '0100111001000100', '1001011001101001'][k % 3]; for (let i = 0; i < 16; i++) if (g[i] === '1') S.px(x + (i % 4), y + Math.floor(i / 4), 'ice', 5.5, { e: gi }); }
const CARV = [[19, 70, 0], [31, 68, 1], [59, 52, 2], [59, 66, 0], [86, 50, 1], [86, 64, 2], [107, 70, 1], [118, 72, 0], [7, 50, 2], [137, 54, 1]];
const SHEEP = [[27, 0.4, 1], [44, 2.2, 1]];
X.def('stonehenge', {
  amb: [0.3, 0.26],
  paint(S, sc) {
    X.sky(S, sc, { moon: [75, 16, 6], far: 'hills', floor: 'grass', horizon: 62 });                                  // 0 moon
    const gate = sc.light({ x: 75, y: 70, z: 16, r: 74, i: 1.0, c: '#8fd8ff', fl: 'pulse', amp: 0.14, sp: 1.4, tint: 0.6 });   // 1 gate
    sc.light({ x: 116, y: 83, z: 20, r: 46, i: 0.9, c: '#ff9a40', fl: 'fire', tint: 0.5 });                           // 2 campfire
    const gi = gate + 1;
    // far ring: uprights with lintels, a gap, a leaning stone
    S.lay('back');
    [[14, 8], [25, 8]].forEach(([x, w], i) => { S.beg(); sarsen(S, x, 62, w, 23, 5.4, 2, 60 + i); S.end(); }); S.beg(); lintel(S, 12, 58, 25, 4, 6, 70); S.end();
    S.beg(); sarsen(S, 42, 64, 7, 21, 5, 2, 63); S.end();
    [[103, 8], [114, 8]].forEach(([x, w], i) => { S.beg(); sarsen(S, x, 62, w, 23, 5.4, 2, 66 + i); S.end(); }); S.beg(); lintel(S, 101, 58, 25, 4, 6, 71); S.end();
    S.beg(); S.poly([[128, 85], [131, 64], [138, 65], [137, 85]], 'stone', 5); S.hl(131, 64, 6, 'stone', 7); S.end();
    CARV.slice(0, 2).concat(CARV.slice(6, 8)).forEach(([x, y, k]) => carve(S, x, y, k, gi));
    // the great trilithon
    S.lay('mid'); S.beg(); sarsen(S, 55, 38, 13, 52, 6.4, 3, 80, { lichen: 1 }); S.end(); S.beg(); sarsen(S, 82, 38, 12, 52, 6.2, 3, 81, { lichen: 1 }); S.end();
    S.beg(); lintel(S, 52, 31, 47, 7, 6.8, 82); S.px(60, 30, 'stone', 6); S.px(90, 30, 'stone', 6); S.end();
    CARV.slice(2, 6).forEach(([x, y, k]) => carve(S, x, y, k, gi));
    // the altar stone lying in the gate
    S.beg(); S.box(60, 85, 31, 5, 'stone', 6.5, { top: 2, tt: 1.4 }); S.hl(62, 87, 26, 'stone', 5); for (let x = 64; x < 88; x += 5) S.px(x, 84, 'ice', 6, { e: gi }); S.end();
    // campfire: a ring of stones and crossed sticks
    S.beg(); for (let k = 0; k < 6; k++) S.ell(110 + k * 2.4, FY - 1, 1.6, 1.2, 'stone', 5 + (k % 2), { dome: 1 }); S.line(111, FY - 1, 120, FY - 4, 'wood', 4); S.line(111, FY - 4, 120, FY - 1, 'wood', 5); S.end();
    // sheep bodies (heads graze in anim)
    SHEEP.forEach(([x, ph, d]) => { S.beg(); S.ell(x, FY - 6, 5, 3.5, 'linen', 6.4, { dome: 1 }); [[-3, -8], [0, -9], [3, -8], [-2, -5], [2, -6], [-4, -6], [4, -5]].forEach(([a, b], i) => S.px(x + a, FY + b, 'linen', i < 3 ? 8 : 5)); [-3, -1, 2, 4].forEach(k => S.vl(x + k * d, FY - 3, 3, 'hair', 2)); S.end(); });
    // front: the nearest stones of the ring, cropped by the frame, rimmed by the gate's light
    S.lay('front'); S.beg(); sarsen(S, 4, 24, 13, 70, 3.6, 2, 90); lintel(S, -6, 17, 26, 7, 4, 91); S.end();
    S.beg(); sarsen(S, 134, 30, 12, 64, 3.4, 0, 92); S.end();
    CARV.slice(8).forEach(([x, y, k]) => carve(S, x, y, k, gi));
    // grass: the floor in bands (one base tone each, a gently wavy edge), tufts of same-coloured blades, a few white flowers
    S.lay('wall'); { const r = S.r, BT = [4.4, 4, 3.6, 3.2];
      for (let x = 0; x < W; x++) S.px(x, FY, 'leaf', h2i(Math.floor(x / 5), 3) < 0.45 ? 6 : 5, { n: [0, -0.8] });
      for (let y = FY + 1; y < H; y++) for (let x = 0; x < W; x++) { const b = Math.floor((y - FY - 1 + Math.round(Math.sin(x * 0.07 + y * 0.9) * 0.9)) / 3); S.px(x, y, 'leaf', BT[clamp(b, 0, 3)]); }
      const tuft = (x, y, n, tn, tip) => { for (let k = 0; k < n; k++) { const dx = k - (n - 1) / 2, hh = 4 - Math.round(Math.abs(dx) * 1.2); S.line(x + dx, y, x + dx + Math.sign(dx), y - hh + 1, 'leaf', tn); if (tip) S.px(x + dx + Math.sign(dx), y - hh + 1, 'leaf', tn + 1.5); } };
      for (let i = 0; i < 22; i++) { const x = 8 + Math.floor(r() * 134), y = FY + 3 + Math.floor(r() * 8), b = clamp(Math.floor((y - FY - 1) / 3), 0, 3); tuft(x, y, 3 + Math.floor(r() * 3), BT[b] + 1, Math.abs(x - 75) < 28); }
      [[22, 95], [49, 99], [96, 97], [131, 94], [58, 93]].forEach(([x, y]) => { S.vl(x, y - 1, 2, 'leaf', 4.6); S.px(x, y - 2, 'linen', 8.6); S.px(x + 1, y - 2, 'linen', 7); S.px(x, y - 3, 'linen', 7.6); }); }
    S.lay('front'); { const r = S.r; for (let i = 0; i < 16; i++) { const x = 18 + Math.floor(r() * 114), y = H - 4, tn = 3.4 + Math.floor(r() * 3) * 0.6; S.beg(); for (let k = -2; k <= 2; k++) { const hh = 3 + Math.floor(r() * 4) - Math.abs(k); S.line(x + k, y, x + k + (k < 0 ? -1 : k > 0 ? 1 : 0), y - hh, 'leaf', tn); } S.end({ none: 1 }); } }
    sc.emit({ k: 'mist', x: 75, y: FY - 2, w: 120, rate: 1.4, sp: 3, ang: 1.57, spread: 0.6, life: 3.2 });
    // the gate's light: a hazy beam standing in the gap (brighter at the moment)
    sc.shaft({ x: 75, y0: 38, y1: 86, w0: 6.5, w1: 7.5, i: 0.45, haze: 0.95, c: '#9fe4ff', f: (t) => { const q = steps(t, 8); return 0.7 + 0.15 * Math.sin(t * 1.4) + (q > 0.62 && q < 0.95 ? Math.sin((q - 0.62) / 0.33 * Math.PI) * 0.6 : 0); } });
    // the moment's moonbeam
    sc.shaft({ x: 75, y0: 22, y1: 86, w0: 3, w1: 9, i: 0.5, haze: 0.8, c: '#c8e8ff', f: (t) => { const q = steps(t, 8); return q > 0.62 && q < 0.95 ? Math.sin((q - 0.62) / 0.33 * Math.PI) : 0; } });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 8), mom = q > 0.62 && q < 0.95, mk = mom ? Math.sin((q - 0.62) / 0.33 * Math.PI) : 0;
    // the gate: threads of light rising through the gap, a bright seam over the altar, motes drifting up
    D.lay('back'); for (let k = 0; k < 5; k++) { const x = 69 + k * 3 - (k > 2 ? 1 : 0), sp = 9 + k * 2.3, len = 10 + (k * 7) % 9 + mk * 12; for (let j = 0; j < 2; j++) { const y0 = 85 - ((t * sp + k * 13 + j * 26) % 50); for (let y = 0; y < len; y++) { const yy = Math.round(y0 - y); if (yy < 39 || yy > 85) continue; D.px(x, yy, 'ice', clamp(Math.round(10.5 - y / len * 4.5 + mk), 5, 11), { e: 255 }); } } }
    for (let x = 68; x < 82; x++) { D.px(x, 84, 'ice', 10 + (mk > 0.3 ? 1 : 0), { e: 255 }); D.px(x, 83, 'ice', 8 + Math.round(mk * 2), { e: 255 }); }
    for (let k = 0; k < 6; k++) { const ph = (t * 0.28 + k / 6) % 1, x = 70 + ((k * 5) % 11) + Math.round(Math.sin(t * 2 + k) * 1.2), y = 82 - ph * 44; D.px(x, y, 'ice', ph < 0.7 ? 11 : 8, { e: 255 }); }
    // at the moment a ring of light runs out over the grass, and the carvings light one by one from the gate outward
    if (mom) { const rq = (q - 0.66) / 0.25; if (rq > 0 && rq < 1) { D.lay('wall'); const rx = 10 + rq * 70, ry = 2 + rq * 6; for (let a = 0; a < 90; a++) { const an = a / 90 * Math.PI * 2, x = 75 + Math.cos(an) * rx, y = FY + 4 + Math.sin(an) * ry; if (y > FY) D.px(x, y, 'ice', 10 - rq * 4, { e: 255 }); } }
      CARV.forEach(([x, y, k], i) => { const d = Math.abs(x + 2 - 75) / 70, a = (q - 0.66) / 0.2 - d; if (a < 0 || a > 1.6) return; const g = ['0110100110010110', '0100111001000100', '1001011001101001'][k % 3]; D.lay(i < 2 || i === 6 || i === 7 ? 'back' : i >= 8 ? 'front' : 'mid'); for (let j = 0; j < 16; j++) if (g[j] === '1') D.px(x + (j % 4), y + Math.floor(j / 4), 'ice', a < 0.5 ? 11 : 9, { e: 255 }); }); }
    // campfire
    D.lay('mid'); flame(D, 116, FY - 3, 7, t, 0.3); flame(D, 113, FY - 2, 4, t, 1.9); flame(D, 119, FY - 2, 4, t, 3.7);
    // sheep heads: grazing, now and then looking up
    SHEEP.forEach(([x, ph, d]) => { const up = Math.sin(t * 0.6 + ph) > 0.55 || mom, hx = x + d * 5, hy = up ? FY - 10 : FY - 5 + Math.round(Math.sin(t * 3 + ph) * 0.5);
      D.beg(); D.rect(hx - (d < 0 ? 2 : 0), hy, 3, 3, 'hair', 2.4); D.px(hx + d * 3, hy + 1, 'hair', 3); D.px(hx + d * 3, hy + 2, 'hair', 2); D.px(hx - d, hy, 'linen', 5.6); D.px(hx + d, hy + 1, 'ink', 1); D.end({ none: 1 }); });
    // the druid: watches the gate; at the moment lifts his staff
    worker(D, 100, FY, { skin: ['skin', 6], hair: ['linen', 8], top: ['linen', 6.4], bot: ['linen', 5], boot: ['leather', 3], robe: 1, hood: ['linen', 5.5], beard: ['linen', 8] },
      mom ? { aF: 2.6, eF: 0.2, aB: 1.6, eB: 0.4, tool: 'staff' } : { aF: 0.5, eF: -0.4, aB: 0.3, eB: -0.3, tool: 'staff', bob: Math.round(Math.sin(t * 1.2) * 0.5) }, -1);
    // fireflies over the grass
    if (R() < 0.08) rs.burst('glint', 12 + R() * 126, 70 + R() * 18, 1, { sp: 4, life: 1.4 });
    // now and then a shooting star
    const ss = steps(t, 11); if (ss < 0.05) { const k = ss / 0.05; D.lay('wall'); for (let j = 0; j < 7; j++) { const x = 30 + k * 60 - j * 2, y = 8 + k * 20 - j * 0.66; if (j / 7 < 1 - k * 0.6) D.px(x, y, 'linen', 10 - j * 1.2, { e: 255 }); } }
    if (once(st, 'm', mom && q > 0.7)) { rs.burst('glint', 95, 47, 4, { sp: 14, life: 0.6 }); rs.burst('rune', 94, 48, 6, { sp: 22, ang: -2.1, spread: 0.5, life: 1.1 }); rs.flash(1, 1.6); rs.burst('rune', 75, 80, 12, { sp: 18, ang: 0, spread: 1.4, life: 1.8, w: 20 }); rs.burst('glint', 75, 16, 6, { sp: 18, life: 0.6 }); }
  },
});
const h2i = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

// ───────── 空中花园 gardens (nature · med · 史诗) ─────────
// Babylon in the blue hour before dawn: a sky of hard blue bands paling to a lilac glow, the last stars and the morning
// star, thin clouds lit pink from below, the far city in blue silhouette standing in a bank of fog. Three terraces of blue
// glazed brick with gold trim, arches lamp-lit from inside, every ledge a hedge of flowers with cypresses and palms,
// vines hanging down the walls; water runs down the middle of the terraces into a glowing healing pool. Wisps of mist
// drift across the terraces so the garden seems to hang in cloud, ground fog rolls over the floor, spray breathes over
// the pool; a gardener waters, swallows cross the sky, a blossom branch sways near the eye.
// Every 9 s a surge runs down the cascade: the pool splashes, a rainbow stands in the spray and green crosses rise.
const TR = [[14, 68, 122], [30, 48, 90], [46, 30, 58]];   // terraces: left x, top of wall, width
const CX = 75, CW = 3;                                     // the cascade channel: centre, half width
const VINES = []; { const r = X.rng(55); TR.forEach(([x, y, w], ti) => { for (let vx = x + 3; vx < x + w - 2; vx += 3 + Math.floor(r() * 4)) { if (Math.abs(vx - CX) < CW + 3) continue; VINES.push([vx, y + 1, 4 + Math.floor(r() * (ti === 0 ? 9 : 12)), r() * 6, r() < 0.4 ? ['pink', 'linen', 'gold'][Math.floor(r() * 3)] : null]); } }); }
const GFR = fronds(122, 30, 7, 10, 23), GFR2 = fronds(28, 50, 7, 10, 24);
const BCL = [[118, 13, 0], [122, 19, 1.3], [134, 17, 2.1], [130, 8, 3], [140, 4, 3.9], [146, 14, 4.6], [126, 12, 5.4]];   // blossom clusters on the branch
const BIRDS = [[0, 0], [-4, 3], [-8, 6], [4, 3], [8, 6]];
// mist wisps drifting across the terraces: [y, length, speed (art px / s), phase]
const GWISP = [[44, 44, 2.2, 0], [63, 58, 1.6, 100], [26, 30, 2.8, 40], [55, 34, 1.9, 170]];
const FOGC = [206, 226, 244];
const GLAN = [[24, 68, 2, 0], [46, 68, 2, 1.7], [104, 68, 5, 3.1], [126, 68, 5, 4.4], [40, 48, 2, 2.3], [110, 48, 5, 5.2]];   // lanterns under the gold trim: x, trim y, glow (light + 1), phase
// the dawn sky, painted over the plain night one: hard bands of blue paling to lilac, clouds lit from below, the far
// city in blue silhouette with a few windows still lit, the fog bank round its feet
function dawnSky(S) {
  S.lay('wall'); const r = X.rng(71);
  S.vgrad(0, 0, W, 60, 'ice', 2, 6.4, { e: 255 }); S.vgrad(0, 60, W, FY - 60, 'lav', 8.8, 10.6, { e: 255 });
  for (let i = 0; i < 16; i++) { const x = 4 + r() * (W - 8), y = 3 + r() * 20; S.px(x, y, 'linen', y < 12 ? 8 : 7, { e: 255 }); }
  // clouds: flat-bottomed, a lumpy violet crown, the underside caught pink by the sun still under the horizon
  [[5, 14, 30, 1], [24, 20, 20, 2], [97, 36, 24, 3]].forEach(([x0, y0, L, sd]) => { for (let i = 0; i < L; i++) { const q = i / (L - 1), x = x0 + i, th = Math.max(1, Math.round(0.6 + Math.sin(q * Math.PI) * 3 + Math.sin(i * 0.55 + sd) * 1.1));
    for (let k = 0; k < th; k++) S.px(x, y0 - k, 'lav', k === th - 1 ? 6 : 5, { e: 255 }); S.px(x, y0 + 1, 'candy', q > 0.25 && q < 0.75 ? 7.4 : 6.2, { e: 255 }); if (q > 0.35 && q < 0.6) S.px(x, y0 + 2, 'candy', 6.2, { e: 255 }); } });
  // the far city
  for (let x = 3; x < W - 3;) { const bw = 5 + Math.floor(r() * 9), bh = 5 + Math.floor(r() * 16), top = 80 - bh; S.rect(x, top, bw, FY - top, 'ice', 3.4, { e: 255 }); S.hl(x, top, bw, 'ice', 4.4, { e: 255 });
    if (r() < 0.4) S.rect(x + Math.floor(bw / 2) - 1, top - 3, 2, 3, 'ice', 3.4, { e: 255 });
    for (let k = 0; k < bw * bh / 20; k++) if (r() < 0.35) S.px(x + 1 + Math.floor(r() * (bw - 2)), top + 2 + Math.floor(r() * (bh - 3)), 'lamp', 8, { e: 255 }); x += bw + Math.floor(r() * 2); }
  // the fog bank: flat pale bands with a wavy top
  for (let x = 0; x < W; x++) { const y0 = 74 + Math.round(Math.sin(x * 0.09) * 1.6 + Math.sin(x * 0.23 + 1) * 1); S.px(x, y0, 'ice', 7.6, { e: 255 }); for (let y = y0 + 1; y < FY; y++) S.px(x, y, 'ice', y < y0 + 4 ? 6.6 : 6, { e: 255 }); }
}
X.def('gardens', {
  amb: [0.36, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { far: 'none', floor: 'stone', horizon: 70 }); dawnSky(S);
    sc.light({ x: 75, y: -30, z: 50, r: 240, i: 0.72, c: '#9cc4ff', tint: 0.25 });                             // 0 the pale dawn sky overhead
    sc.light({ x: 52, y: 80, z: 12, r: 42, i: 0.7, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.5 });            // 1 arch lamps
    sc.light({ x: 75, y: 22, z: 12, r: 34, i: 0.75, c: '#ffc070', fl: 'candle', ph: 3, tint: 0.45 });          // 2 pavilion lamp
    sc.light({ x: 75, y: 84, z: 14, r: 50, i: 0.85, c: '#60ffc0', fl: 'pulse', amp: 0.15, sp: 1.6, tint: 0.6 });   // 3 healing pool
    sc.light({ x: 106, y: 60, z: 12, r: 36, i: 0.55, c: '#ffc070', fl: 'candle', ph: 5, tint: 0.45 });         // 4 arch lamps, right
    const r = S.r;
    // the terraces: blue glazed brick, gold trim, dark arches with lamps in them, a lion frieze on the lowest
    S.lay('back');
    TR.forEach(([x, y, w], ti) => {
      const h = (ti === 0 ? FY : TR[ti - 1][1]) - y;
      S.beg(); TX.bricks(S, x, y, w, h, 'tile', 4.8 - ti * 0.3, { bw: 7, bh: 4, v: 0.8, pits: 0, mt: 2.5 }); S.box(x - 1, y - 1, w + 2, 2, 'gold', 6.5); S.hl(x, y + h - 2, w, 'gold', 4.5);
      const n = ti === 0 ? 8 : ti === 1 ? 6 : 4, aw = 6;
      for (let k = 0; k < n; k++) { const side = k < n / 2 ? -1 : 1, kk = side < 0 ? k : k - n / 2, span = (w / 2 - CW - 4), gap = (span - (n / 2) * aw) / (n / 2 + 1), ax = Math.round(side < 0 ? x + gap + kk * (aw + gap) : CX + CW + 3 + gap + kk * (aw + gap)), ay = y + 5, ah = h - 8;
        for (let yy = 0; yy < ah; yy++) for (let xx = 0; xx < aw; xx++) { const u = (xx + 0.5 - aw / 2) / (aw / 2), top = 3 * (1 - Math.sqrt(Math.max(0, 1 - u * u))); if (yy >= top) S.px(ax + xx, ay + yy, 'ink', 1); }
        for (let xx = 0; xx < aw; xx++) { const u = (xx + 0.5 - aw / 2) / (aw / 2); S.px(ax + xx, ay + Math.round(3 * (1 - Math.sqrt(Math.max(0, 1 - u * u)))) - 1, 'gold', 6); }
        const lit = (k + ti) % 3 !== 1, e = side < 0 ? 2 : ti === 2 ? 3 : 5;
        if (lit) { S.rect(ax + 1, ay + ah - 4, 4, 4, 'lamp', 4.5, { e }); S.rect(ax + 2, ay + ah - 6, 2, 2, 'lamp', 8, { e }); S.px(ax + 2, ay + ah - 7, 'lamp', 10, { e }); } }
      if (ti === 0) [[20, 1], [36, 1], [104, -1], [120, -1]].forEach(([lx, d]) => { const ly = FY - 5; S.spr(lx, ly - 3, ['.....x.', 'xxxxxxx', 'xxxxxx.', 'x.x.x.x'], { x: ['gold', 7] }, d < 0); });
      S.end();
    });
    // ledges: a hedge of flowers along each, cypresses at the ends
    TR.forEach(([x, y, w], ti) => { for (let xx = x; xx < x + w; xx++) { if (Math.abs(xx - CX) <= CW + 1) continue; const hb = 3 + Math.round(Math.abs(Math.sin(xx * 0.55 + ti)) * 2.2 + Math.sin(xx * 0.21) * 0.8);
        for (let k = 0; k < hb; k++) S.px(xx, y - 1 - k, 'leaf', 4.2 + k / hb * 2.4 + (xx < CX ? 0.6 : 0), { n: [0, -0.5] }); if (r() < 0.22) { const m = ['pink', 'red', 'gold', 'linen', 'pink'][Math.floor(r() * 5)]; S.px(xx, y - hb, m, 8); if (r() < 0.5) S.px(xx, y - hb + 1, m, 6.5); } } });
    const cypress = (x, y, h) => { S.beg(); for (let k = 0; k < h; k++) { const q = k / h, w = Math.max(1, Math.round(Math.sin(q * Math.PI * 0.85 + 0.25) * 2.6)); S.hl(x - w + 1, y - 1 - k, w * 2 - 1, 'leaf', 3.4 + (k % 3 === 0 ? 0.8 : 0)); S.px(x - w + 1, y - 1 - k, 'leaf', 5.2); } S.end(); };
    cypress(18, 68, 18); cypress(132, 68, 18); cypress(34, 48, 15); cypress(116, 48, 15); cypress(50, 30, 12); cypress(100, 30, 12);
    S.beg(); palmTrunk(S, 124, 67, 122, 30, 2, 'wood', 5); palmBake(S, 122, 30, GFR, 5.5); S.end();
    S.beg(); palmTrunk(S, 26, 67, 28, 50, -1, 'wood', 5); palmBake(S, 28, 50, GFR2, 5.5); S.end();
    // the crowning pavilion over the source of the water: a tiled alcove, a tipped urn pouring into the channel, two
    // chain lamps between the columns; only a narrow strip under the eave stays black
    S.beg(); S.box(60, 28, 31, 3, 'bone', 6, { top: 1 });
    TX.tiles(S, 60, 16, 31, 11, 'tile', 3.2, { s: 5, gt: 1.4, v: 0.6, gloss: false }); S.ao(60, 16, 31, 11, 't', 1.4); S.hl(60, 16, 31, 'ink', 1);
    S.hl(60, 26, 31, 'tile', 2);   // skirting
    S.rect(71, 27, 9, 1, 'water', 6.4); S.px(71, 27, 'bone', 4); S.px(79, 27, 'bone', 4); S.vl(71, 28, 3, 'bone', 4.4); S.vl(79, 28, 3, 'bone', 4.4);   // the channel cut into the floor
    S.end();
    // the urn on its stand, tipped toward the channel: a jar laid along a 45° axis, bottom up-right, mouth down-left
    S.beg(); S.rect(76, 24, 5, 3, 'bone', 5.6); S.hl(76, 24, 5, 'bone', 7.4); S.vl(80, 24, 3, 'bone', 4.2); S.end();
    S.beg(); for (let y = 14; y < 27; y++) for (let x = 69; x < 84; x++) { const rx = x + 0.5 - 80.4, ry = y + 0.5 - 17.6, u = (-rx + ry) * 0.7071, v = (rx + ry) * 0.7071;
      const band = u >= 5 && u < 6, lip = u >= 7.4, hw = u < 0 ? 0 : u < 5 ? Math.max(u > 3.5 ? 1.7 : 0, 3.5 * Math.sqrt(Math.max(0, 1 - ((u - 2.5) / 2.7) ** 2))) : band ? 1.7 : u < 7.4 ? 1.2 : u < 8.5 ? 2.2 : 0; if (Math.abs(v) > hw) continue;
      const tn = lip ? (v < -0.4 ? 9.4 : v < 1 ? 7.6 : 5.6) : band ? (v < 0 ? 8.4 : 6.4) : v < -1.4 ? 8.2 : v > 1.3 ? 4.6 : 6.4;
      S.px(x, y, band ? 'gold' : 'brick', tn, { n: [v / 4, -0.3] }); }
    S.end();
    S.beg(); [61, 67, 82, 88].forEach(x => S.cyl(x, 15, 2, 12, 'bone', 7));
    // chain lamps in the side bays
    [[65, 20], [85, 20]].forEach(([x, y]) => { S.vl(x, 17, y - 18, 'iron', 5); S.hl(x - 1, y - 1, 3, 'brass', 6.4); S.rect(x - 1, y, 3, 2, 'lamp', 8, { e: 3 }); S.px(x, y, 'lamp', 10.5, { e: 3 }); S.px(x, y + 2, 'brass', 5); });
    S.poly([[57, 15], [75, 5], [93, 15]], 'gold', 6); S.hl(57, 15, 36, 'gold', 8); S.line(75, 5, 93, 15, 'gold', 4.5); S.px(75, 4, 'gold', 9);
    S.end();
    // vine stems (tips sway in anim)
    VINES.forEach(([x, y, L, ph, fl]) => { const b = Math.round(L * 0.6); for (let k = 0; k < b; k++) { S.px(x, y + k, 'leaf', 5 - (k % 3 === 1 ? 1 : 0)); if (k % 2) S.px(x - 1, y + k, 'leaf', 6.4); else if (k > 1) S.px(x + 1, y + k, 'leaf', 4); } });
    // the pool at the foot of the cascade
    S.lay('mid'); S.beg(); S.box(52, 83, 46, 7, 'bone', 6.4, { top: 2, tt: 1.4 }); S.rect(54, 84, 42, 4, 'water', 5); S.hl(54, 84, 42, 'water', 7); S.hl(53, 89, 44, 'bone', 4); S.end();
    // a bench and a potted flower on the left
    S.beg(); S.box(20, FY - 5, 16, 3, 'bone', 6.5, { top: 1 }); S.rect(22, FY - 2, 2, 2, 'bone', 5); S.rect(32, FY - 2, 2, 2, 'bone', 5); S.end();
    S.beg(); S.poly([[40, FY], [47, FY], [48, FY - 6], [39, FY - 6]], 'brick', 6); S.hl(39, FY - 6, 10, 'brick', 8); S.end(); S.beg(); S.ell(43.5, FY - 9, 5, 3.5, 'leaf', 6, { dome: 1 }); S.end(); [[41, 80], [45, 79], [47, 81], [43, 82]].forEach(([x, y]) => S.px(x, y, 'red', 8));
    // the blossom branch near the eye, top right
    S.lay('front'); S.beg(); S.line(W, 3, 132, 9, 'wood', 3.2, { w: 2 }); S.line(132, 9, 118, 13, 'wood', 3.6); S.line(138, 7, 134, 17, 'wood', 3.4); S.line(126, 11, 122, 19, 'wood', 3.6); S.line(144, 5, 146, 14, 'wood', 3.4); S.end();
    BCL.forEach(([x, y]) => { S.px(x - 3, y + 1, 'leaf', 4.6); S.px(x + 3, y - 1, 'leaf', 5.2); S.px(x - 2, y + 2, 'leaf', 3.8); });
    sc.emit({ k: 'mist', x: CX, y: 84, w: 8, rate: 1.2, sp: 5, ang: 0, spread: 1.2, life: 1.6 });
  },
  // mist, in hard alpha steps over the finished frame (never a dither): wisps drifting across the terraces, the spray
  // breathing over the pool (thicker in the surge), the ground fog rolling over the floor
  post(out, t) {
    const q = steps(t, 9), sp = q > 0.15 && q < 0.6 ? Math.sin((q - 0.15) / 0.45 * Math.PI) : 0;
    const fog = (x, y, a) => { if (x >= 3 && x < W - 3 && y >= 3 && y < H - 3) X.blendPx(out, y * W + x, FOGC, a); };
    GWISP.forEach(([y, L, v, ph]) => { const x0 = ((t * v + ph) % (W + L + 40)) - L - 20; [0.35, 0.75, 1, 0.9, 0.6].forEach((f, k) => { const w = Math.round(L * f), xs = Math.round(x0 + (L - w) * (k < 2 ? 0.7 : 0.4)); for (let x = xs; x < xs + w; x++) { const e = Math.min(x - xs, xs + w - 1 - x); fog(x, y + k, k === 0 || k === 4 || e < 3 ? 0.125 : k === 2 && e > 6 ? 0.375 : 0.25); } }); });
    const rx = 12 + 1.5 * Math.sin(t * 1.4) + sp * 7, ry = 4.5 + sp * 3.5; for (let y = Math.floor(81 - ry); y <= 84; y++) for (let x = Math.floor(CX - rx); x <= Math.ceil(CX + rx); x++) { const u = (x + 0.5 - CX) / rx, v = (y + 0.5 - 81) / ry, d = u * u + v * v; if (d < 1) fog(x, y, d < 0.3 ? 0.25 + (sp > 0.5 ? 0.125 : 0) : 0.125); }
    for (let x = 3; x < W - 3; x++) { const top = 88 + Math.round(2 * Math.sin(x * 0.08 + t * 0.35) + 1.4 * Math.sin(x * 0.21 - t * 0.6)); for (let y = top; y < H - 3; y++) fog(x, y, y < top + 2 ? 0.125 : X.vnoise(x * 0.07 - t * 0.3, y * 0.3, 5) > 0.55 ? 0.375 : 0.25); }
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 9), surge = q < 0.2 ? q / 0.2 : -1;
    // the morning star and the last stars
    D.lay('wall'); X.twinkle(D, t, 5, 22, 7); { const a = 0.5 + 0.5 * Math.sin(t * 1.7), x = 38, y = 6; D.px(x, y, 'linen', 10.6, { e: 255 }); const l = a > 0.7 ? 2 : 1; for (let k = 1; k <= l; k++) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([u, v]) => D.px(x + u * k, y + v * k, 'ice', k === 1 ? 9 : 7, { e: 255 })); }
    // swallows cross the sunset
    D.lay('wall'); { const bx = W + 20 - ((t * 11) % 240), by = 34 + Math.round(Math.sin(t * 0.7) * 3); BIRDS.forEach(([dx, dy], i) => { const x = bx + dx, y = by + dy, f = Math.sin(t * 12 + i) > 0; D.px(x, y, 'dusk', 1, { e: 255 }); D.px(x - 1, y - (f ? 1 : 0), 'dusk', 1, { e: 255 }); D.px(x + 1, y - (f ? 1 : 0), 'dusk', 1, { e: 255 }); }); }
    // vine tips
    D.lay('back'); VINES.forEach(([x, y, L, ph, fl]) => { const b = Math.round(L * 0.6), sw = Math.sin(t * 1.3 + ph) * 0.8; for (let k = b; k < L; k++) { const o = Math.round(sw * (k - b + 1) / (L - b + 1) * 1.6); D.px(x + o, y + k, 'leaf', 5.4 - (k % 3 === 1 ? 1 : 0)); if (k % 2) D.px(x + o - 1, y + k, 'leaf', 6.4); } if (fl) { D.px(x + Math.round(sw * 1.6), y + L, fl, 8.5); D.px(x + Math.round(sw * 1.6), y + L - 1, fl, 7); } });
    palmTips(D, 122, 30, GFR, t, 5.5); palmTips(D, 28, 50, GFR2, t + 1, 5.5);
    // lanterns hung under the trim, still lit in the blue hour, swaying on their cords
    GLAN.forEach(([x, y, e, ph]) => { const o = Math.round(Math.sin(t * 1.2 + ph) * 0.8); D.px(x, y + 1, 'iron', 4); D.px(x + Math.round(o / 2), y + 2, 'iron', 4); D.px(x + o, y + 3, 'iron', 4);
      D.hl(x + o - 1, y + 4, 3, 'brass', 6); D.rect(x + o - 1, y + 5, 3, 2, 'lamp', 8, { e }); D.px(x + o, y + 5, 'lamp', 10.5, { e }); D.px(x + o, y + 7, 'brass', 5); });
    // the cascade down the middle; a bright surge front at the moment
    // the urn pours into the channel
    for (let y = 25; y < 28; y++) { D.px(74, y, 'water', 10, { e: 255 }); D.px(75, y, 'water', 8, { e: 255 }); }
    D.px(73 + (Math.floor(t * 5) % 3), 27, 'linen', 10, { e: 255 });
    const sy = surge >= 0 ? 28 + surge * 60 : -99;
    // the falling water: a base sheet, each column carrying one or two bright streaks sliding down
    for (let i = -CW; i <= CW; i++) { const x = CX + i, edge = Math.abs(i) === CW, c = i + CW;
      for (let y = 28; y < 83; y++) D.px(x, y, 'water', edge ? 6 : 7, { e: 255 });
      const sp = 32 + (c * 7 % 5) * 4, lp = 58 + (c * 13 % 17), L = 4 + (c * 3 % 5);
      for (let k = 0; k < (edge ? 1 : 2); k++) { const hy = 28 + ((t * sp + c * 23 + k * lp / 2) % lp); for (let j = 0; j < L; j++) { const y = Math.floor(hy) - j; if (y < 28 || y > 82) continue; D.px(x, y, 'water', edge ? (j ? 7.6 : 9) : j ? 8.6 - (j > L / 2 ? 0.6 : 0) : 10.6, { e: 255 }); } } }
    // lips: the water rolls over each ledge in a white curl, fanning out one pixel below it
    [30, 48, 68].forEach((ly, li) => { for (let y = ly + 1; y < ly + 5; y++) { D.px(CX - CW - 1, y, 'water', y < ly + 3 ? 7 : 6, { e: 255 }); D.px(CX + CW + 1, y, 'water', y < ly + 3 ? 7 : 6, { e: 255 }); }
      for (let i = -CW - 1; i <= CW + 1; i++) { const fo = (Math.floor(t * 6 + li) + Math.floor((i + 8) / 2)) % 3, side = Math.abs(i) > CW - 1;
        D.px(CX + i, ly, 'linen', fo ? 10 : 8.4, { e: 255 }); if (side || fo === 0) D.px(CX + i, ly + 1, 'linen', side ? 8.6 : 9.4, { e: 255 }); } });
    // the surge: a white front, a bright body trailing it, one pixel wider than the stream
    if (sy > 0) { const fy = Math.round(sy); for (let j = 0; j < 9; j++) { const y = fy - j; if (y < 28 || y > 82) continue; const wd = j < 3 ? CW + 1 : CW;
      for (let i = -wd; i <= wd; i++) D.px(CX + i, y, j < 2 ? 'linen' : 'water', j < 2 ? (Math.abs(i) > CW - 1 ? 9 : 10.6) : j < 5 ? 11 : 10, { e: 255 }); } }
    D.lay('mid'); for (let x = 54; x < 96; x++) { const y = 84 + Math.round(Math.sin(x * 0.6 + t * 3) * 0.5 - (Math.abs(x - CX) < 5 ? 1 : 0)); D.px(x, y, 'water', Math.abs(x - CX) < 5 ? 11 : 9, { e: 255 }); }
    if (R() < 0.4) rs.burst('drip', CX - 3 + R() * 6, 83, 1, { sp: 16, ang: (R() - 0.5) * 2.4, spread: 0.6, life: 0.4, floor: 84 });
    // the gardener waters along the lowest terrace
    const w = stroll(t, 102, 132, 7, 0.4, 2.6), GL = { skin: ['skin', 5], hair: ['hair', 2], top: ['crimson', 5.5], bot: ['linen', 5], boot: ['leather', 3], hat: ['sand', 6] };
    if (w.walking) worker(D, w.x, FY, GL, Object.assign(w.pose, { aF: 0.7, eF: -0.9, tool: 'can' }), w.dir);
    else { worker(D, w.x, FY, GL, { aF: 1.4, eF: -0.4, aB: 0.2, lF: 0.15, lB: -0.1, lean: 0.4, tool: 'can' }, w.dir); if (R() < 0.35) rs.burst('drip', w.x + w.dir * 12, 76, 1, { sp: 6, ang: w.dir * 2, spread: 0.4, life: 0.6, floor: FY }); }
    // blossoms on the branch near the eye
    D.lay('front'); BCL.forEach(([x, y, ph]) => { const o = Math.round(Math.sin(t * 1.1 + ph) * 0.7), yy = y + (Math.sin(t * 1.1 + ph) > 0.8 ? 1 : 0); D.beg(); D.ell(x + o, yy, 2, 1.7, 'pink', 6, { dome: 1 }); D.px(x + o - 1, yy - 1, 'pink', 8); D.px(x + o + 1, yy, 'pink', 7.4); D.px(x + o, yy - 1, 'linen', 9); D.px(x + o + 1, yy + 1, 'pink', 4.6); D.end({ none: 1 }); });
    // petals drifting down from the branch
    for (let k = 0; k < 4; k++) { const q = steps(t + k * 1.7, 6.8), x = 132 - k * 5 - q * 40 + Math.sin(q * 12 + k) * 3, y = 14 + q * 70; if (q < 0.95) D.px(x, y, 'pink', Math.sin(q * 30 + k) > 0 ? 8 : 6, { e: 255 }); }
    // the moment: splash, rainbow in the spray, crosses rising from the pool
    if (once(st, 'sp', q > 0.2 && q < 0.5)) { rs.burst('drip', CX, 83, 16, { sp: 32, ang: 0, spread: 1.6, life: 0.7, floor: 84 }); rs.burst('mist', CX, 80, 6, { sp: 12, ang: 0, spread: 1.4, life: 1.8, w: 10 }); rs.burst('heal', CX, 80, 6, { sp: 8, ang: 0, spread: 0.9, life: 2.4, w: 30 }); rs.flash(3, 1.5); }
    if (q > 0.2 && q < 0.6) { const k = Math.sin((q - 0.2) / 0.4 * Math.PI); if (k > 0.2) { D.lay('mid'); ['red', 'gold', 'leaf', 'water', 'arcane'].forEach((m, i) => { const rr = 20 - i; for (let an = 0.12; an < Math.PI - 0.12; an += 0.035) { const x = CX + Math.cos(an) * rr * 1.25, y = 84 - Math.sin(an) * rr * 0.9; if (Math.abs(x - CX) <= CW) continue; D.px(x, y, m, clamp(Math.round(5 + k * 4), 4, 9), { e: 255 }); } }); } }
  },
});

// ───────── 阿尔忒弥斯神庙 artemis (nature · store · 稀有) ─────────
// a white Ionic temple under a crescent moon at the forest's edge: fluted columns, a pediment with the goddess's crescent,
// her statue glowing in the cella, braziers on the steps; before it an altar fire and the offerings — amphorae, baskets,
// sacks; a priestess tends the fire, an acolyte brings another crate, a stag grazes. Every 8 s the priestess casts
// incense: the altar fire roars up in sparks, the statue flares, the stag lifts its head.
const COLS = [30, 45, 59, 85, 99, 114];   // the middle span is wide: the doorway and the goddess stand clear in it
// olive canopy: clumps (cx, cy, rx, ry); leaf strokes (x, y, len, kind, shiver phase or −1): silver-green strokes along each
// clump's upper-left rim (kind 1 silver, 0 bright green), dark strokes in its lower-right (kind 2)
const OLC = [[11, 18, 11, 7], [24, 25, 8, 5], [4, 29, 6, 4]], OLS = [];
{ const r = X.rng(88); OLC.forEach(([cx, cy, rx, ry]) => { for (let y = Math.ceil(cy - ry) + 1; y < cy + ry; y += 2) for (let x = Math.floor(cx - rx) + Math.floor(r() * 3) + ((y & 2) ? 2 : 0); x < cx + rx - 1; x += 4 + Math.floor(r() * 2)) {
  const u = (x + 1 - cx) / rx, v = (y + 0.5 - cy) / ry, d = u * u + v * v, lit = u + v * 1.2; if (x < 4 || d > 0.8) continue;
  if (lit < -0.5) OLS.push([x, y, 2 + (r() < 0.35 ? 1 : 0), d > 0.3 && r() < 0.8 ? 1 : 0, r() < 0.3 ? r() * 6 : -1]); else if (lit > 0.35 && r() < 0.7) OLS.push([x, y, 2 + (r() < 0.5 ? 1 : 0), 2, -1]); } }); }
// the goddess: crescent diadem, bow held out at her side (arc and string), quiver over the right shoulder, chiton with folds
const ARTEMIS = ['.....c...c....', '..b...ccc..aa.', '.bs...hhh..q..', '.bs...xxd..q..', '.bs...xxd.q...', 'b.s....x..q...', 'b.s..xxxxdq...', 'b.s.xxxxxdd...', 'b.sxxxxxxdd...', 'bxx..xxxxdd...',
  'b.s..gggggd...', 'b.s..xxxxdd...', 'b.s..xxdxdx...', 'b.s.xxxdxd....', '.bs.xxxdxxd...', '.bs.xxdxxxd...', '.bs.xxdxxxd...', '..b.xxdxxxd...', '....ddddddd...', '.....dd.dd....'];
// her silhouette for the flare: the empty pixel just outside each row's ends and each column's top and bottom (the outer
// contour only, so the gaps between bow and body stay dark), a second ring one pixel further out; the diadem's crescent
const ART_X = 68, ART_Y = 41, ART_RIM = [], ART_HALO = [], ART_C = [];
{ const A = ARTEMIS, nh = A.length, on = (i, j) => j >= 0 && j < nh && i >= 0 && i < 14 && A[j][i] !== '.', seen = {};
  const add = (L, i, j) => { const k = i + ',' + j; if (j >= nh || on(i, j) || seen[k]) return; seen[k] = 1; L.push([ART_X + i, ART_Y + j]); };
  for (const d of [1, 2]) { const L = d === 1 ? ART_RIM : ART_HALO;
    for (let j = 0; j < nh; j++) { let a = -1, b = -1; for (let i = 0; i < 14; i++) if (on(i, j)) { if (a < 0) a = i; b = i; } if (a >= 0) { add(L, a - d, j); add(L, b + d, j); } }
    for (let i = 0; i < 14; i++) { let a = -1, b = -1; for (let j = 0; j < nh; j++) if (on(i, j)) { if (a < 0) a = j; b = j; } if (a >= 0) { add(L, i, a - d); add(L, i, b + d); } } }
  for (let j = 0; j < 2; j++) for (let i = 0; i < 14; i++) if (A[j][i] === 'c') ART_C.push([ART_X + i, ART_Y + j]); }
X.def('artemis', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    X.sky(S, sc, { far: 'trees', floor: 'grass', horizon: 66 });
    // the crescent moon (her sign): halo, a lit sickle, the dark of the disc in earthshine
    const mx = 124, my = 16, mr = 7; S.lay('wall');
    for (let k = 3; k >= 1; k--) S.ell(mx, my, mr + k * 2.5, mr + k * 2.5, 'night', 3.4 + (4 - k) * 0.55, { e: 255 });
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { const d = (x * x + y * y) / (mr * mr), d2 = ((x - 3.2) ** 2 + (y + 1.4) ** 2) / (mr * mr * 0.8); if (d > 1) continue; S.px(mx + x, my + y, d2 < 1 ? 'night' : 'bone', d2 < 1 ? 5.4 : d > 0.6 ? 9 : 10, { e: 255 }); }
    sc.light({ x: mx, y: my, z: 70, r: 280, i: 0.55, c: '#c8d0ff', tint: 0.22 });                                      // 0 moon
    const fire = sc.light({ x: 75, y: 70, z: 20, r: 62, i: 1.05, c: '#ff9040', fl: 'fire', tint: 0.5 });                 // 1 altar fire
    const cella = sc.light({ x: 75, y: 58, z: 4, r: 30, i: 0.8, c: '#ffd090', fl: 'candle', ph: 2, tint: 0.5 });         // 2 cella lamp
    sc.light({ x: 48, y: 64, z: 10, r: 34, i: 0.7, c: '#ffa050', fl: 'fire', ph: 1.7, tint: 0.45 });                  // 3 brazier left
    sc.light({ x: 103, y: 64, z: 10, r: 34, i: 0.7, c: '#ffa050', fl: 'fire', ph: 4.1, tint: 0.45 });                 // 4 brazier right
    // the temple
    S.lay('back');
    // cella wall and the doorway with the statue
    S.beg(); S.rect(28, 36, 94, 42, 'linen', 3); for (let y = 40; y < 78; y += 5) S.hl(28, y, 94, 'linen', 2.2); S.end({ none: 1 });
    S.rect(66, 40, 18, 38, 'ink', 1); S.rect(67, 41, 16, 36, 'magic', 1.4);
    // the goddess on her pedestal: bow in hand, quiver at the shoulder, lit from a lamp at her feet
    S.beg(); S.box(70, 63, 11, 15, 'bone', 5.4); S.box(69, 61, 13, 2, 'bone', 6.6); S.hl(70, 65, 11, 'gold', 5.4); S.end();
    { const gE = { e: cella + 1 }, x0 = 68, y0 = 41, on = (i, j) => j >= 0 && j < ARTEMIS.length && i >= 0 && i < 14 && ARTEMIS[j][i] !== '.';
      // a soft darker marble edge first, so she stands clear of the fire's glow
      for (let j = -1; j <= ARTEMIS.length; j++) for (let i = -1; i <= 14; i++) if (!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) S.px(x0 + i, y0 + j, 'bone', 4, gE);
      S.spr(x0, y0, ARTEMIS, { x: ['bone', 7.6, gE], d: ['bone', 6, gE], h: ['bone', 6.6, gE], c: ['gold', 9.4, gE], b: ['gold', 7.8, gE], s: ['linen', 8.6, gE], q: ['gold', 5.4, gE], a: ['crimson', 7, gE], g: ['gold', 7, gE] }); }
    // steps
    S.beg(); [[26, 78, 98, 3], [23, 81, 104, 3], [20, 84, 110, 3], [18, 87, 114, 3]].forEach(([x, y, w, h], i) => { S.rect(x, y, w, h, 'linen', 6.2 - i * 0.3); S.hl(x, y, w, 'linen', 8, { n: [0, -0.8] }); }); S.end();
    // fluted Ionic columns
    COLS.forEach(x => { S.beg(); S.box(x - 2, 75, 11, 3, 'linen', 7); S.cyl(x, 38, 7, 37, 'linen', 7, { rim: 2.4 }); for (let k = 1; k < 7; k += 2) S.vl(x + k, 39, 36, 'linen', 5.4, { n: [(k - 3) / 4, 0] });
      S.rect(x - 2, 36, 11, 2, 'linen', 8); S.ell(x - 2, 37.5, 1.8, 1.8, 'linen', 7, { ring: 0.9 }); S.ell(x + 8, 37.5, 1.8, 1.8, 'linen', 7, { ring: 0.9 }); S.px(x - 2, 37, 'linen', 4); S.px(x + 8, 37, 'linen', 4); S.end(); });
    // entablature: architrave with fasciae, a frieze of tiny deer, the cornice
    S.beg(); S.rect(24, 30, 102, 6, 'linen', 7); S.hl(24, 32, 102, 'linen', 5.6); S.hl(24, 34, 102, 'linen', 5.6); S.hl(24, 30, 102, 'linen', 8.4, { n: [0, -0.7] });
    S.rect(24, 25, 102, 5, 'linen', 6); for (let x = 28; x < 124; x += 11) S.spr(x, 26, ['x....', '.xxx.', '.x.x.'], { x: ['linen', 8.4] }, x > 75);
    S.rect(21, 23, 108, 2, 'linen', 8.6); S.hl(21, 25, 108, 'linen', 4); S.end();
    // pediment with the crescent in gold
    S.beg(); S.poly([[21, 23], [75, 8], [129, 23]], 'linen', 7.4); S.poly([[29, 21], [75, 11], [121, 21]], 'linen', 5); S.line(21, 22, 75, 8, 'linen', 9); S.line(75, 8, 129, 22, 'linen', 6.4);
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = x * x + y * y, d2 = (x - 2) ** 2 + (y + 1) ** 2; if (d <= 18 && d2 > 11) S.px(75 + x, 16 + y, 'gold', 7.5, { e: cella + 1 }); }
    S.px(75, 7, 'gold', 8); S.rect(20, 21, 3, 2, 'gold', 6); S.rect(128, 21, 3, 2, 'gold', 6); S.end();
    // tripod braziers on the top step
    [48, 103].forEach(x => { S.beg(); S.line(x - 3, 78, x, 68, 'brass', 5); S.line(x + 3, 78, x, 68, 'brass', 4); S.poly([[x - 5, 65], [x + 5, 65], [x + 3, 69], [x - 3, 69]], 'brass', 6); S.hl(x - 5, 65, 11, 'brass', 8.5); S.end(); });
    // mid: the altar, the offerings
    S.lay('mid');
    S.beg(); S.box(63, 78, 24, 12, 'bone', 6.6, { top: 2, tt: 1.5 }); S.hl(63, 81, 24, 'bone', 5); for (let x = 66; x < 85; x += 4) { S.px(x, 84, 'leaf', 6); S.px(x + 1, 85, 'leaf', 5); S.px(x + 2, 84, 'leaf', 6); } S.rect(65, 76, 20, 2, 'ink', 1); S.end();
    const amph = (x, h, m) => { S.beg(); S.ell(x, FY - h * 0.45, 3.6, h * 0.35, m, 5.5, { dome: 1 }); S.rect(x - 1, FY - h, 3, h * 0.3, m, 5); S.hl(x - 2, FY - h, 5, m, 6.5); S.px(x - 3, FY - h * 0.8, m, 4); S.px(x + 3, FY - h * 0.8, m, 4); S.rect(x - 1, FY - 2, 3, 2, m, 4); S.hl(x - 3, FY - h * 0.5, 7, 'ink', 1); S.end(); };
    amph(34, 13, 'copper'); amph(41, 11, 'copper');
    S.beg(); S.ell(98, FY - 4, 6, 4, 'sand', 6, { dome: 1 }); S.px(98, FY - 9, 'leather', 4); S.end();
    S.beg(); S.box(104, FY - 6, 8, 6, 'wood', 6, { top: 2 }); [[105, 'red'], [107, 'gold'], [109, 'leaf'], [110, 'red'], [106, 'pink'], [108, 'gold']].forEach(([x, m], i) => S.px(x, FY - 8 - (i > 3 ? 1 : 0), m, 8)); S.end();
    // the stack the acolyte takes his crates from (marked like the one he carries)
    S.beg(); S.box(112, FY - 4, 6, 4, 'wood', 5.4); S.px(114, FY - 3, 'crimson', 6); S.box(113, FY - 8, 5, 4, 'wood', 6, { top: 1 }); S.px(115, FY - 7, 'crimson', 7); S.end();
    S.beg(); for (let k = 0; k < 7; k++) S.line(91 + k, FY - 1, 89 + k * 1.5, FY - 14, 'sand', 7 + (k % 2)); S.hl(90, FY - 7, 7, 'wood', 4); S.end();   // a sheaf of wheat
    // the stag's body (neck and head move in anim)
    S.beg(); S.ell(133, FY - 13, 7, 3.4, 'leather', 5.6, { dome: 1 }); S.hl(129, FY - 10, 9, 'bone', 6.4); S.rect(139, FY - 15, 2, 3, 'bone', 8); S.px(141, FY - 15, 'leather', 4);
    [[128, 0], [130, 0], [136, 1], [138, 1]].forEach(([x, hind]) => { if (hind) { S.line(x, FY - 11, x + 1, FY - 6, 'leather', 4.6); S.line(x + 1, FY - 6, x, FY - 2, 'leather', 4.2); } else S.vl(x, FY - 11, 10, 'leather', x === 128 ? 5 : 4.2); S.px(x, FY - 1, 'ink', 1); }); S.end();
    // front: the olive tree at the left — a twisted trunk, three clumps of silvery leaves
    S.lay('front'); S.beg(); S.poly([[5, FY + 3], [15, FY + 3], [13, 70], [15, 52], [12, 36], [10, 36], [11, 52], [8, 70]], 'wood', 3.6); S.vl(9, 60, 30, 'wood', 5); S.vl(13, 44, 20, 'wood', 2.6);
    S.line(12, 38, 21, 27, 'wood', 3.6, { w: 2 }); S.line(11, 37, 4, 30, 'wood', 3.2, { w: 2 }); S.line(12, 36, 12, 22, 'wood', 3.4); S.end();
    OLC.forEach(([cx, cy, rx, ry]) => { S.beg(); S.ell(cx, cy, rx, ry, 'moss', 3.6, { dome: 1 }); S.ell(cx - 1.2, cy - 1.2, rx * 0.74, ry * 0.66, 'moss', 4.8, { dome: 1 }); S.ell(cx - 2.2, cy - 2.2, rx * 0.4, ry * 0.36, 'moss', 5.8, { dome: 1 });
      for (let k = 0; k < rx * 1.6; k++) { const a = Math.PI * (0.15 + 0.7 * ((k * 0.618) % 1)), x = cx + Math.cos(a) * rx * 0.95, y = cy + Math.sin(a) * ry; S.px(x, y + 1, 'moss', 3.2); } S.end(); });
    // leaf strokes: silver-green along the lit rims, dark ones in the shade (the shivering ones are drawn by anim)
    OLS.forEach(([x, y, l, k, ph]) => { if (ph >= 0) return; S.hl(x, y, l, k === 1 ? 'linen' : 'moss', k === 1 ? 5.4 : k === 0 ? 7 : 2.4, { n: [-0.3, -0.6] }); });
    // silver-grey tufts of olive leaves along each clump's moonlit top (a bright tip, a grey body, a dark notch under it)
    const tuft = (x, y, hi) => { S.px(x, y, 'linen', hi, { n: [-0.2, -0.8] }); S.px(x + 1, y, 'moss', 7, { n: [0, -0.8] }); S.px(x - 1, y + 1, 'linen', hi - 0.9, { n: [-0.3, -0.5] }); S.px(x, y + 1, 'moss', 6.4); S.px(x + 1, y + 1, 'linen', hi - 1.4); S.px(x + 2, y + 1, 'moss', 6); S.px(x, y + 2, 'moss', 2.4); S.px(x + 1, y + 2, 'moss', 3); };
    OLC.forEach(([cx, cy, rx, ry], ci) => { const n = Math.round(rx * 0.55) + 1; for (let k = 0; k < n; k++) { const a = Math.PI * (1.08 + 0.84 * k / (n - 1)), x = Math.round(cx + Math.cos(a) * rx * 0.8), y = Math.round(cy + Math.sin(a) * ry * 0.72) + ((k + ci) & 1); if (x >= 4) tuft(x, y, k % 3 === 1 ? 6 : 5.5); }
      for (let k = 0; k < n - 2; k++) { const a = Math.PI * (1.2 + 0.7 * k / Math.max(1, n - 3)) + 0.3, x = Math.round(cx - 1 + Math.cos(a) * rx * 0.42), y = Math.round(cy + 1 + Math.sin(a) * ry * 0.3) + (k & 1) * 2; if (x >= 4) tuft(x, y, 4.8); } });
    // a path of flagstones from the viewer to the altar
    S.lay('wall'); for (let y = FY + 1, row = 0; y < H - 2; y += 3, row++) { const hw = 16 + row * 4; for (let x = 75 - hw + (row % 2) * 4; x < 75 + hw; x += 8 + (row % 3)) { S.rect(x, y, 7, 2, 'stone', 5.4 + ((x + row) % 3) * 0.4); S.hl(x, y, 7, 'stone', 6.6); } }
    sc.emit({ k: 'ember', x: 75, y: 67, w: 10, rate: 3.2, sp: 8, ang: 0, spread: 0.7, life: 1.3 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 8), cast = q > 0.55 && q < 0.8, roar = q > 0.6 && q < 0.95 ? Math.sin((q - 0.6) / 0.35 * Math.PI) : 0,
      glow = q > 0.6 && q < 0.86 ? Math.sin((q - 0.6) / 0.26 * Math.PI) : 0;
    // the goddess flares: the cella lamp swells (her marble glows with it), a bright rim wakes around her, the diadem burns gold
    rs.mul[2] = 1 + glow * 0.6;
    if (glow > 0.12) { D.lay('back'); const rt = Math.min(10, 6 + Math.round(glow * 4.4)); ART_RIM.forEach(([x, y]) => D.px(x, y, 'lamp', rt, { e: 255 }));
      if (glow > 0.55) ART_HALO.forEach(([x, y]) => D.px(x, y, 'lamp', glow > 0.85 ? 6 : 5, { e: 255 }));
      ART_C.forEach(([x, y]) => D.px(x, y, 'gold', glow > 0.6 ? 11 : 10, { e: 255 })); }
    if (once(st, 'gl', glow > 0.9)) rs.burst('glint', 77, 41, 1, { sp: 0, life: 0.7 });
    // altar fire (cellular), taller when incense is cast; brazier flames
    D.lay('mid'); const f = fireSim(st, 18, 28, t, 0.78 + roar * 0.22, 0.62 - roar * 0.42); drawFire(D, f, 18, 28, 66, 49, (x, y) => Math.abs(x - 8.5) < 1.2 + Math.pow(y / 28, 0.9) * 8.2, 16, 1);
    D.lay('back'); flame(D, 48, 65, 6, t, 0.9); flame(D, 103, 65, 6, t, 2.7);
    // the priestess: tends the fire; at the moment raises both arms and casts incense
    D.lay('mid'); const PL = { skin: ['skin', 6], hair: ['hair', 3], top: ['linen', 6.8], bot: ['linen', 5.6], boot: ['leather', 3], robe: 1 };
    worker(D, 55, FY, PL, cast ? { aF: 2.7, eF: 0.3, aB: 2.5, eB: 0.2, bob: -1 } : { aF: 1.2 + Math.sin(t * 1.3) * 0.15, eF: -0.9, aB: 0.3, eB: -0.3, bob: Math.round(Math.sin(t * 1.3) * 0.5) }, 1);
    D.line(52, FY - 18, 57, FY - 8, 'crimson', 6); D.px(55, FY - 27, 'gold', 8); D.px(56, FY - 27, 'gold', 8);
    if (once(st, 'inc', q > 0.6 && q < 0.9)) { rs.flash(1, 1.4); rs.flash(2, 1.2); rs.burst('spark', 75, 70, 14, { sp: 40, ang: 0, spread: 1.4, life: 1, floor: 77 }); rs.burst('ember', 75, 66, 12, { sp: 16, ang: 0, spread: 0.8, life: 2.6, w: 10 });
      rs.burst('ember', 66, 58, 5, { sp: 14, ang: -0.7, spread: 0.6, life: 1.8 }); rs.burst('ember', 84, 58, 5, { sp: 14, ang: 0.7, spread: 0.6, life: 1.8 }); rs.burst('glint', 75, 16, 4, { sp: 16, life: 0.6 }); rs.burst('glint', 124, 14, 3, { sp: 14, life: 0.6 }); }
    // the incense smokes from the two braziers and drifts outward, clear of the goddess
    if (roar > 0.3) { if (R() < 0.3) rs.burst('steam', 47, 58, 1, { sp: 7, ang: -0.45, spread: 0.3, life: 1.3 }); if (R() < 0.3) rs.burst('steam', 104, 58, 1, { sp: 7, ang: 0.45, spread: 0.3, life: 1.3 }); }
    // the acolyte takes a crate off the stack, brings it to the offerings, walks back for the next (he stays left of the
    // stack, clear of the stag); his arms come up to the carry pose over the last 0.4 s at the stack and go back down
    // over the first 0.4 s after he sets the crate down
    const A0 = 96, A1 = 110, ASP = 7, APZ = 1.6, w = stroll(t, A0, A1, ASP, 0.7, APZ), aper = (A1 - A0) / ASP, acyc = 2 * (aper + APZ), aq = ((t + 0.7 * 7.3) % acyc + acyc) % acyc,
      carry = w.dir < 0, lift = carry ? 1 : aq < aper ? 1 - clamp(aq / 0.4, 0, 1) : clamp((aq - aper - APZ + 0.4) / 0.4, 0, 1), mix = (a, b) => a + (b - a) * lift,
      AL = { skin: ['skin', 5], hair: ['hair', 4], top: ['sand', 5], bot: ['skin', 5], boot: ['leather', 3] };
    worker(D, w.x, FY, AL, Object.assign(w.pose, { aF: mix(w.pose.aF, 1.2), eF: mix(w.pose.eF, -1.2), aB: mix(w.pose.aB, 1), eB: mix(w.pose.eB, -1) }, carry ? { tool: 'box' } : {}), w.dir);
    // the stag: mostly grazes, now and then looks about; head down just before the moment, then it snaps up at the flare
    const up = roar > 0.1 || (Math.sin(t * 0.45 + 1) > 0.35 && (q < 0.4 || q > 0.6)), chew = Math.round(Math.sin(t * 4) * 0.5);
    D.beg(); if (up) { D.rect(127, FY - 21, 2, 7, 'leather', 5.4); D.px(126, FY - 21, 'leather', 6); D.rect(123, FY - 24, 5, 3, 'leather', 5.8); D.px(122, FY - 23, 'leather', 4.4); D.px(124, FY - 24, 'ink', 1); D.px(128, FY - 25, 'leather', 4); D.px(129, FY - 26, 'leather', 5);
      D.line(125, FY - 25, 124, FY - 31, 'bone', 6.6); D.px(123, FY - 29, 'bone', 6); D.px(123, FY - 32, 'bone', 7); D.line(127, FY - 25, 129, FY - 31, 'bone', 6); D.px(130, FY - 29, 'bone', 5.6); D.px(130, FY - 32, 'bone', 6.4); }
    else { D.line(128, FY - 15, 124, FY - 8, 'leather', 5.4, { w: 2 }); D.rect(120, FY - 6 + chew, 5, 3, 'leather', 5.8); D.px(119, FY - 5 + chew, 'leather', 4.4); D.px(122, FY - 6 + chew, 'ink', 1);
      D.line(123, FY - 7 + chew, 121, FY - 12 + chew, 'bone', 6.4); D.line(125, FY - 7 + chew, 127, FY - 12 + chew, 'bone', 6); D.px(120, FY - 10 + chew, 'bone', 6); }
    D.end();
    // the olive leaves shiver
    D.lay('front'); OLS.forEach(([x, y, l, k, ph]) => { if (ph < 0) return; const a = Math.sin(t * 1.6 + ph), dx = a > 0.72 ? 1 : a < -0.72 ? -1 : 0; D.hl(x + dx, y, l, a > 0.3 ? 'linen' : 'moss', a > 0.3 ? 5.6 : 6.6, { n: [-0.3, -0.6] }); });
    // moths about the fire
    D.lay('mid'); for (let k = 0; k < 2; k++) { const a = t * (2.4 + k * 0.7) + k * 3, x = 75 + Math.cos(a) * (9 + k * 4), y = 58 + Math.sin(a * 1.3) * 5; D.px(x, y, 'paper', Math.sin(t * 30 + k) > 0 ? 8 : 5); }
  },
});

// ───────── 罗德岛巨像 colossus (water · defense · 史诗 · weapon: slam) ─────────
// sunrise over the harbour mouth — the giant is Helios, and his sun comes up behind him: it rises out of the sea on the
// right, rays fanning over a sky that goes from night blue to rose and gold, thin clouds rimmed with gold, a road of
// gold light glittering across the water toward the eye. The bronze giant straddles the harbour from two stone
// pedestals, back-lit into a dark silhouette with a gold rim down every edge that faces the sun, a radiant crown on his
// head, a torch still burning in his raised hand, a great hammer resting on the left pedestal. A ship with a lantern
// sails in between his legs; on the quay near the eye a hoplite keeps watch by a brazier. Every 10 s a swell breaks on
// the pedestals. When the weapon fires (rs.fireAge < 0.5): the hammer swings up and smashes down on the pedestal —
// sparks, a burst of stone dust, water leaping on both sides, rings running over the harbour, the torch and the eyes flare.
const CSUN = [128, 66, 9], CHZ = 66;   // the rising sun: its centre on the sea line, only the upper half is up
// the dawn sky: night blue bands overhead, the sun's glow in hard rose-to-gold rings round it, rays, clouds, the disc;
// the sea under it with the road of gold light baked in as broken dashes (anim makes them glitter)
function sunriseSky(S, sc) {
  S.lay('wall'); const [SX, SY, SR] = CSUN, r = X.rng(77);
  const glow = (x, y) => Math.round(11 - Math.hypot((x + 0.5 - SX) / 2.1, y + 0.5 - SY) / 4.4);
  for (let y = 0; y < CHZ; y++) for (let x = 0; x < W; x++) { const g = glow(x, y);
    if (g >= 6) S.px(x, y, 'dusk', g, { e: 255 });
    else { const c = y < 18 ? ['night', 2] : y < 32 ? ['night', 3] : y < 44 ? ['night', 4] : y < 55 ? ['lav', 6] : ['lav', 7]; S.px(x, y, c[0], c[1] + (g >= 5 && c[0] === 'lav' ? 1 : 0), { e: 255 }); } }
  for (let i = 0; i < 16; i++) S.px(4 + r() * 80, 4 + r() * 24, 'linen', 6 + r() * 2, { e: 255 });   // the last stars, over the dark side
  // rays: every other wedge a step brighter, each its own length
  { let a = -Math.PI; const RS = []; for (let i = 0; a < 0; i++) { const w = 0.08 + r() * 0.12; if (i % 2) RS.push([a, a + w, 40 + r() * 90]); a += w; }
    for (let y = 3; y < CHZ - 1; y++) for (let x = 3; x < W - 3; x++) { const d = Math.hypot(x + 0.5 - SX, (y + 0.5 - SY) * 1.4), an = Math.atan2(y + 0.5 - SY, x + 0.5 - SX); if (d < SR + 12) continue; if (RS.some(([a0, a1, l]) => an >= a0 && an < a1 && d < l)) S.tone(x, y, 1); } }
  // clouds: long thin bars, plum bodies, their undersides lit — gold near the sun, rose farther off
  [[92, 50, 46], [112, 41, 28], [8, 28, 30], [22, 36, 20], [60, 45, 22]].forEach(([x0, y0, L], ci) => { for (let i = 0; i < L; i++) { const q = i / (L - 1), x = x0 + i, th = Math.max(1, Math.round(Math.sin(q * Math.PI) * 2.2 + Math.sin(i * 0.6 + ci) * 0.7)), near = Math.abs(x - SX) < 30;
    for (let k = 0; k < th; k++) S.px(x, y0 - k, 'dusk', k === th - 1 ? 3 : 4, { e: 255 }); S.px(x, y0 + 1, near ? 'lamp' : 'dusk', near ? (q > 0.2 && q < 0.8 ? 9 : 8) : 7, { e: 255 }); } });
  // the sun: a tight ring, the white-gold disc, clipped by the sea line
  const disc = (rr, m, t, cx, cy) => { for (let y = Math.floor(cy - rr); y < CHZ; y++) for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < rr * rr) S.px(x, y, m, t, { e: 255 }); };
  disc(SR + 4, 'dusk', 10, SX, SY); disc(SR + 2, 'lamp', 9, SX, SY); disc(SR, 'lamp', 10, SX, SY); disc(SR * 0.62, 'lamp', 11, SX - 1, SY - 1);
  // the far headland on the left, a few town lamps still lit
  for (let x = 3; x < 46; x++) { const h = Math.round(3 + (46 - x) * 0.17 + Math.sin(x * 0.45) * 0.8); for (let y = CHZ - h; y < CHZ; y++) S.px(x, y, 'night', 1, { e: 255 }); S.px(x, CHZ - h, 'lav', 4, { e: 255 }); if (x % 4 === 1 && r() < 0.6) S.px(x, CHZ - h + 2 + Math.floor(r() * Math.max(1, h - 3)), 'lamp', 8, { e: 255 }); }
  // the sea: a pale line at the horizon (burning under the sun), rose-lilac rows reflecting the sky, then deep blue
  for (let x = 0; x < W; x++) { const u = Math.abs(x - SX); S.px(x, CHZ, u < SR + 4 ? 'lamp' : u < 34 ? 'dusk' : 'lav', u < SR + 4 ? 10 : u < 34 ? 8 : 7, { e: 255 });
    for (let y = CHZ + 1; y < FY; y++) S.px(x, y, y < CHZ + 4 ? 'lav' : 'water', y < CHZ + 4 ? 5 : y < CHZ + 10 ? 3 : 2, { e: 255 }); }
  // the road of light on the water: broken dashes, gold in the middle, rose at the edges, widening toward the eye
  for (let y = CHZ + 1; y < FY; y++) { const k = (y - CHZ) / (FY - CHZ), hw = 3 + k * 15, odd = (y - CHZ) % 2 === 0; let x = Math.round(SX - hw + r() * 3);
    while (x < SX + hw) { const u0 = Math.abs(x - SX) / hw, len = Math.round(2 + r() * (3 + k * 5) * (1 - u0 * 0.5)), u = Math.abs(x + len / 2 - SX) / hw;
      if (!odd || u < 0.3) for (let i = 0; i < len && x + i < SX + hw; i++) S.px(x + i, y, u < 0.3 ? 'lamp' : 'dusk', u < 0.3 ? 9 : u < 0.65 ? 9 : 7, { e: 255 });
      x += len + 2 + Math.floor(r() * (1 + u * 5)); } }
  // the floor rows: the harbour water near the eye (lit)
  S.vgrad(0, FY, W, H - FY, 'water', 4, 2.4);
  sc.light({ x: SX, y: SY - 4, z: -10, r: 300, i: 0.9, c: '#ffb060', tint: 0.45 });   // 0 sun, behind everything: it rims, it does not light faces
}
// a thick tapered limb with cylinder shading across its width
function seg(P, x0, y0, x1, y1, w0, w1, m, t0, st) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux, ds = st || 0.5;
  for (let s = 0; s <= L; s += ds) { const w = w0 + (w1 - w0) * s / L, cx = x0 + ux * s, cy = y0 + uy * s;
    for (let i = -w / 2; i <= w / 2; i += 0.5) { const u = i / (w / 2 + 0.01); P.px(cx + px * i, cy + py * i, m, t0 - Math.pow(Math.abs(u), 3) * 1.6, { n: [px * u * 0.9, py * u * 0.9] }); } }
}
const CO = { sh: [64, 34], torch: [101, 11] };
function hammerPose(fa) {   // arm angle a, hammer angle b (0 = hanging straight down, + = out to the viewer's left)
  const rest = [0.35, 0.62], up = [1.9, 2.3];
  if (fa >= 0.5 || fa < 0) return rest;
  if (fa < 0.14) { const k = Math.sin(fa / 0.14 * Math.PI / 2); return [rest[0] + (up[0] - rest[0]) * k, rest[1] + (up[1] - rest[1]) * k]; }
  if (fa < 0.22) { const k = (fa - 0.14) / 0.08, e = k * k; return [up[0] + (rest[0] - up[0]) * e, up[1] + (rest[1] - up[1]) * e]; }
  const k = (fa - 0.22) / 0.28, bo = Math.sin(k * Math.PI) * 0.12 * (1 - k); return [rest[0] + bo, rest[1] + bo];
}
// the sledge's head lying flat: an 11×6 iron block, lit top edge, two brass bands, the socket collar
function hammerHead(P, x, y) {
  P.rect(x, y + 1, 11, 4, 'iron', 5.2); P.hl(x, y, 11, 'iron', 7.6, { n: [0, -0.8] }); P.vl(x, y + 1, 4, 'iron', 6.4, { n: [-0.7, 0] }); P.hl(x + 1, y + 1, 9, 'iron', 6, { n: [0, -0.4] }); P.vl(x + 10, y + 1, 4, 'iron', 3.4, { n: [0.7, 0] }); P.hl(x, y + 5, 11, 'iron', 3, { n: [0, 0.7] });
  P.px(x, y, 'iron', 8.6); P.px(x + 1, y + 1, 'iron', 8.2);
  [[2, 6.4], [8, 5.6]].forEach(([i, tn]) => { P.vl(x + i, y, 6, 'brass', tn); P.px(x + i, y, 'brass', tn + 2.2); });
  P.hl(x + 4, y - 1, 3, 'brass', 6.8);
}
// cracks the strike opens down the left pedestal's face
const CRK = []; { const r = X.rng(31); [[37, 7], [41, 10], [45, 8]].forEach(([x0, n]) => { const pts = []; let x = x0; for (let y = 78; y < 78 + n; y++) { pts.push([x, y]); if (r() < 0.45) x += r() < 0.5 ? -1 : 1; } CRK.push(pts); }); }
X.def('colossus', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    sunriseSky(S, sc);                                                                                               // 0 sun
    const torch = sc.light({ x: CO.torch[0], y: CO.torch[1], z: 18, r: 96, i: 1.1, c: '#ff9a40', fl: 'fire', tint: 0.5 });   // 1 torch
    sc.light({ x: 141, y: 78, z: 30, r: 40, i: 0.85, c: '#ff9040', fl: 'fire', ph: 2.3, tint: 0.5 });                  // 2 quay brazier
    const eye = sc.light({ x: 75, y: 22, z: 12, r: 22, i: 0.25, c: '#8fe0ff', fl: 'pulse', amp: 0.3, sp: 1.1, tint: 0.6 });   // 3 eyes
    sc.light({ x: 20, y: 0, z: 60, r: 200, i: 0.32, c: '#8a98ff', tint: 0.2 });                                     // 4 the cool dawn sky on the dark side
    // pedestals rising from the water
    S.lay('back');
    [[30, 32], [88, 31]].forEach(([x, w]) => { S.beg(); TX.ashlar(S, x, 80, w, 12, 'stone', 5.6, { bh: 4, bw: 9, crack: 0.2 }); S.box(x - 1, 78, w + 2, 3, 'stone', 7, { top: 1 }); S.hl(x, 82, w, 'brass', 5.4); S.end(); });
    // the giant (mid layer, standing in front of his pedestals): legs, drape, torso, the torch arm; bronze lit by the moon
    // on the left, the torch on the right
    S.lay('mid'); S.beg();
    seg(S, 57, 78, 46, 78, 4, 4, 'copper', 5); seg(S, 93, 78, 104, 78, 4, 4, 'copper', 5);                           // feet
    seg(S, 69, 54, 60, 67, 9, 8, 'copper', 5.6); seg(S, 60, 67, 53, 76, 7, 5, 'copper', 5.4);                        // left leg
    seg(S, 81, 54, 90, 67, 9, 8, 'copper', 5.6); seg(S, 90, 67, 97, 76, 7, 5, 'copper', 5.4);                        // right leg
    S.ell(60, 67, 3.5, 3, 'copper', 6.4, { dome: 1 }); S.ell(90, 67, 3.5, 3, 'copper', 6.4, { dome: 1 });              // knees
    S.poly([[63, 46], [87, 46], [89, 55], [83, 58], [76, 56], [67, 59], [62, 55]], 'brass', 5.6); S.line(66, 48, 70, 57, 'brass', 4.2); S.line(78, 48, 80, 55, 'brass', 4.2); S.line(84, 48, 86, 56, 'brass', 4.4); S.hl(63, 46, 25, 'brass', 7.6);
    S.poly([[65, 33], [85, 33], [87, 40], [84, 47], [66, 47], [63, 40]], 'copper', 5.6);
    S.ell(70, 37, 5, 3.4, 'copper', 6.4, { dome: 1 }); S.ell(80, 37, 5, 3.4, 'copper', 6, { dome: 1 }); S.vl(75, 35, 11, 'copper', 4);
    [41, 44].forEach(y => { S.hl(71, y, 3, 'copper', 4.4); S.hl(76, y, 3, 'copper', 4.4); S.hl(71, y - 1, 3, 'copper', 6.6); S.hl(76, y - 1, 3, 'copper', 6.6); });
    S.ell(64, 34, 4.4, 4, 'copper', 6.2, { dome: 1 }); S.ell(86, 34, 4.4, 4, 'copper', 6, { dome: 1 });                 // shoulders
    seg(S, 86, 33, 95, 26, 6, 5, 'copper', 5.8); seg(S, 95, 26, 100, 19, 5, 4, 'copper', 5.8); S.ell(95, 26, 2.6, 2.6, 'copper', 6.2, { dome: 1 });   // torch arm
    S.ell(100, 19, 3, 2.6, 'copper', 6.4, { dome: 1 });
    S.poly([[96, 17], [106, 17], [105, 13], [97, 13]], 'brass', 6.4); S.hl(96, 13, 11, 'brass', 9); S.rect(99, 17, 4, 2, 'brass', 5);   // torch cup
    // neck, head, the radiant crown
    S.rect(72, 28, 6, 6, 'copper', 5.4); S.ell(75, 23, 5, 6, 'copper', 6, { dome: 1 }); S.hl(71, 21, 9, 'copper', 4.4); S.px(74, 24, 'copper', 7.6); S.px(75, 25, 'copper', 4.4); S.hl(73, 27, 4, 'copper', 4.2);
    S.end();
    // back-lit: the whole figure a step and a half darker (the torch still warms his head and arm)
    for (let y = 8; y < 82; y++) for (let x = 40; x < 112; x++) if (S.at(x, y)) S.tone(x, y, -2.2);
    // the rim: the sun low behind him on the right catches every edge that faces it — the outermost pixel turns gold,
    // two pixels deep on the lower body nearest the sun
    { const rim = []; for (let y = 8; y < 82; y++) for (let x = 40; x < 112; x++) if (S.at(x, y) && !S.at(x + 1, y)) rim.push([x, y]);
      rim.forEach(([x, y]) => { const near = y > 44 && x > 80; S.px(x, y, near ? 'lamp' : 'gold', near ? 9.4 : 8.4, { e: 255 }); if (near || (y > 60 && x > 50)) S.px(x - 1, y, 'gold', 6.6, { e: 255 }); }); }
    for (let k = 0; k < 9; k++) { const an = -Math.PI + 0.25 + k / 8 * (Math.PI - 0.5); S.beg(); for (let d = 6; d < 12 - Math.abs(k - 4) * 0.4; d++) S.px(75 + Math.cos(an) * d, 22 + Math.sin(an) * d * 1.05, 'gold', 8 - (d - 6) * 0.4, { e: torch + 1 }); S.end({ none: 1 }); }
    S.hl(70, 17, 11, 'gold', 7, { e: torch + 1 });
    S.px(72, 22, 'ice', 6, { e: eye + 1 }); S.px(77, 22, 'ice', 6, { e: eye + 1 });
    // verdigris running down from the joints
    [[66, 36, 6], [84, 38, 5], [62, 58, 7], [88, 58, 6], [57, 70, 5], [93, 70, 6], [74, 29, 4], [70, 44, 3], [96, 22, 4]].forEach(([x, y, l]) => { for (let k = 0; k < l; k++) if (S.at(x, y + k)) S.px(x, y + k, 'teal', 3.4 - k * 0.2); });
    // front right: the quay near the eye — flagstones, the brazier on its stand
    S.lay('front'); S.beg(); TX.ashlar(S, 110, FY, 40, H - FY, 'stone', 5, { bh: 4, bw: 12, crack: 0.1 }); S.hl(110, FY, 40, 'stone', 7.6, { n: [0, -0.8] }); S.vl(110, FY, H - FY, 'stone', 6.6, { n: [-0.8, 0] }); S.end();
    S.beg(); S.line(137, FY, 141, 80, 'iron', 4); S.line(145, FY, 141, 80, 'iron', 3.4); S.poly([[135, 76], [147, 76], [145, 80], [137, 80]], 'brass', 5); S.hl(135, 76, 12, 'brass', 8); S.end();
    S.lay('mid'); S.beg(); S.rect(93, 25, 3, 2, 'linen', 8); S.px(96, 25, 'linen', 6); S.px(92, 24, 'linen', 8); S.px(91, 24, 'brass', 7); S.end();   // a gull asleep on the torch arm
    sc.emit({ k: 'ember', x: 101, y: 6, w: 6, rate: 3, sp: 6, ang: 0.3, spread: 0.8, life: 1.8 });
    sc.emit({ k: 'ember', x: 141, y: 72, w: 6, rate: 1.2, sp: 5, ang: 0, spread: 0.6, life: 1.6 });
  },
  anim(D, t, rs, o) {
    const st = rs.st, fa = rs.fireAge, firing = fa < 0.5;
    // the sea: lilac ripples rolling in, and the road of sunlight glittering — gold sparks running over the baked dashes
    const [SX] = CSUN; D.lay('wall');
    for (let y = CHZ + 1; y < H - 3; y++) { const fl = y >= FY, k = (y - CHZ) / (H - CHZ), hw = 3 + Math.min(1, (y - CHZ) / (FY - CHZ)) * 15 + (fl ? (y - FY) * 1.2 : 0), x1 = fl ? 110 : W - 3;
      for (let x = 3; x < x1; x++) { const u = Math.abs(x + 0.5 - SX);
        if (u < hw) { const v = Math.sin(x * 0.7 - t * 2.6 + y * 2.3) + Math.sin(x * 0.23 + t * 1.3 - y * 1.1); if (v > 1.62) { D.px(x, y, 'lamp', u < hw * 0.5 ? 11 : 10, { e: 255 }); if (v > 1.8) D.px(x + 1, y, 'lamp', 10, { e: 255 }); } else if (fl && v > 0.9 && (y & 1)) D.px(x, y, 'dusk', u < hw * 0.5 ? 9 : 7, { e: 255 }); }
        else { const w = Math.sin(x * 0.45 - t * 1.6 + y * 1.3) + Math.sin(x * 0.17 + t * 0.9 - y * 0.7); if (w > 1.4) D.px(x, y, fl ? 'water' : 'lav', fl ? 6 : 5 + Math.round(k * 2), { e: 255 }); } } }
    // the last stars fade over the dark side
    for (let i = 0; i < 4; i++) { const x = 10 + i * 17, y = 6 + (i * 7) % 15, a = Math.sin(t * (1.1 + i * 0.4) + i * 2); if (a > 0.5) { D.px(x, y, 'linen', 9, { e: 255 }); if (a > 0.9) { D.px(x - 1, y, 'linen', 6, { e: 255 }); D.px(x + 1, y, 'linen', 6, { e: 255 }); } } }
    // the ship: sails in between the legs, a lantern at the stern (a moving light)
    const sx = Math.round(((t * 5 + 40) % 250) - 45), sy = 85 + Math.round(Math.sin(t * 1.4) * 0.6);
    if (sx > -30 && sx < W + 30) { D.beg(); D.poly([[sx - 12, sy - 3], [sx + 12, sy - 3], [sx + 9, sy + 2], [sx - 9, sy + 2]], 'wood', 4.6); D.hl(sx - 12, sy - 3, 24, 'wood', 6.4); for (let k = -8; k < 9; k += 3) D.px(sx + k, sy, 'wood', 3);
      D.vl(sx, sy - 21, 18, 'wood', 5); D.poly([[sx + 1, sy - 20], [sx + 9, sy - 17], [sx + 8, sy - 6], [sx + 1, sy - 5]], 'linen', 6.6); D.vl(sx + 5, sy - 18, 12, 'crimson', 5.4); D.poly([[sx - 1, sy - 18], [sx - 7, sy - 7], [sx - 1, sy - 6]], 'linen', 5.6);
      D.line(sx - 12, sy - 3, sx - 15, sy - 7, 'wood', 5); D.end(); D.rect(sx + 10, sy - 7, 2, 2, 'lamp', 10, { e: 255 });
      rs.dl.push({ x: sx + 11, y: sy - 6, z: 8, r: 20, i: 0.6, rgb: [255, 200, 120], tint: 0.5 }); for (let k = 0; k < 4; k++) D.px(sx + 10 + Math.round(Math.sin(t * 6 + k) * 0.6), sy + 3 + k * 2, 'lamp', 8 - k, { e: 255 }); }
    // the torch
    D.lay('mid'); const f = fireSim(st, 14, 16, t, 0.88 + (firing ? 0.12 : 0), firing ? 0.3 : 0.52); drawFire(D, f, 14, 16, 94, 0, (x, y) => y > 4 && Math.abs(x - 6.5) < 1.5 + (y - 5) * 0.62, 9);
    // the hammer arm: rests on the left pedestal; when the weapon fires it swings up and smashes down
    const [aa, bb] = hammerPose(firing ? fa : 99), sh = CO.sh, hx = sh[0] - Math.sin(aa) * 18, hy = sh[1] + Math.cos(aa) * 18, ex = hx - Math.sin(bb) * 28, ey = hy + Math.cos(bb) * 28;
    // at rest (and in the little bounce after a strike) the head lies flat on the pedestal, hand-drawn; only mid-swing is it rotated
    const rest = Math.abs(aa - 0.35) < 0.14 && Math.abs(bb - 0.62) < 0.14;
    D.beg(); seg(D, sh[0], sh[1], hx, hy, 6, 5, 'copper', 3.6, 0.7); D.ell(hx, hy, 3, 3, 'copper', 4, { dome: 1 });   // back-lit like the rest of him
    if (rest) { const ox = Math.round(ex - 41.5), oy = Math.round(ey - 73.7); D.line(hx, hy, 41 + ox, 70 + oy, 'wood', 5, { w: 2 }); hammerHead(D, 36 + ox, 71 + oy); }
    else { D.line(hx, hy, ex, ey, 'wood', 5, { w: 2 }); const px = Math.cos(bb), py = Math.sin(bb), dx = -Math.sin(bb), dy = Math.cos(bb);
      D.poly([[ex + px * 5 - dx, ey + py * 5 - dy], [ex - px * 5 - dx, ey - py * 5 - dy], [ex - px * 5 + dx * 6, ey - py * 5 + dy * 6], [ex + px * 5 + dx * 6, ey + py * 5 + dy * 6]], 'iron', 5.6);
      D.line(ex + px * 5 - dx, ey + py * 5 - dy, ex - px * 5 - dx, ey - py * 5 - dy, 'iron', 8); D.line(ex + px * 3, ey + py * 3, ex + px * 3 + dx * 5, ey + py * 3 + dy * 5, 'brass', 6); D.line(ex - px * 3, ey - py * 3, ex - px * 3 + dx * 5, ey - py * 3 + dy * 5, 'brass', 5); }
    D.end();
    // foam where the sea meets the pedestals
    D.lay('back'); [[29, 63], [87, 120]].forEach(([a, b]) => { for (let x = a; x < b; x++) if (Math.sin(x * 0.9 + t * 3) > 0.2) D.px(x, 89 + (Math.sin(x * 1.3 + t * 2) > 0.6 ? -1 : 0), 'water', 10, { e: 255 }); });
    // the watchman on the quay: spear and round shield; braces when the giant strikes
    D.lay('front'); const gd = { skin: ['skin', 5], hair: ['hair', 2], top: ['crimson', 5.4], bot: ['skin', 4.6], boot: ['leather', 3], cap: ['brass', 6.4] }, look = Math.sin(t * 0.4) > -0.3, d0 = look ? 1 : -1, gx = 115;
    worker(D, gx, FY, gd, firing ? { aF: 1.6, eF: -0.6, aB: 1.2, eB: -0.8, lean: -0.4, lB: -0.3, lF: 0.3 } : { aF: 0.9, eF: -0.8, aB: 0.4, eB: -0.3, hx: look ? 0.5 : 0, bob: Math.round(Math.sin(t * 1.1) * 0.5) }, d0);
    const spx = gx + d0 * 4; D.beg(); D.vl(spx, FY - 33, 32, 'wood', 5.4); D.rect(spx - 1, FY - 36, 3, 3, 'iron', 8); D.px(spx, FY - 37, 'iron', 9); D.end();
    D.beg(); D.ell(gx - d0 * 3, FY - 14, 4.5, 5, 'brass', 6, { dome: 1 }); D.ell(gx - d0 * 3, FY - 14, 1.6, 1.8, 'crimson', 6); D.end();
    D.rect(gx - 2, FY - 30, 5, 1, 'crimson', 6); D.rect(gx - 3, FY - 31, 7, 1, 'crimson', 7);
    flame(D, 141, 77, 6, t, 0.2);
    // every 10 s a swell breaks on the pedestals
    const wq = steps(t, 10); if (wq > 0.5 && wq < 0.58) { const k = Math.sin((wq - 0.5) / 0.08 * Math.PI); D.lay('back'); [[29, 63], [87, 120]].forEach(([a, b]) => { for (let x = a; x < b; x++) { const hh = Math.round(k * (7 + 4 * Math.sin(x * 0.7 + 1) + 2 * Math.sin(x * 1.9))); for (let y = 0; y < hh; y++) D.px(x, 89 - y, 'water', y > hh - 2 ? 11 : y > hh - 4 ? 9 : 7, { e: 255 }); } }); }
    if (once(st, 'sw', wq > 0.5 && wq < 0.6)) { rs.burst('drip', 46, 86, 10, { sp: 30, ang: 0, spread: 0.9, life: 0.8, w: 30, floor: 90 }); rs.burst('drip', 103, 86, 10, { sp: 30, ang: 0, spread: 0.9, life: 0.8, w: 30, floor: 90 }); rs.burst('mist', 75, 86, 4, { sp: 8, ang: 0, spread: 2, life: 1.6, w: 80 }); }
    // the strike
    if (firing) { D.lay('mid'); D.px(72, 22, 'ice', 11, { e: 255 }); D.px(77, 22, 'ice', 11, { e: 255 }); D.px(71, 22, 'ice', 8, { e: 255 }); D.px(78, 22, 'ice', 8, { e: 255 }); }
    if (once(st, 'hit', firing && fa > 0.22)) { rs.flash(1, 1.2); rs.flash(3, 1.2); rs.burst('spark', 42, 78, 12, { sp: 50, ang: 0, spread: 2.6, life: 0.9, floor: 79 }); rs.burst('steam', 42, 76, 3, { sp: 24, ang: 0, spread: 3, life: 0.6, w: 16 }); rs.burst('dust', 41, 76, 8, { sp: 20, ang: 0, spread: 2.4, life: 1.2, w: 10 });
      rs.burst('drip', 28, 86, 10, { sp: 44, ang: 0, spread: 0.5, life: 0.9, floor: 92 }); rs.burst('drip', 64, 86, 10, { sp: 44, ang: 0, spread: 0.5, life: 0.9, floor: 92 }); rs.burst('mist', 46, 84, 5, { sp: 12, ang: 0, spread: 2, life: 1.4, w: 40 }); }
    if (fa > 0.22 && fa < 1.4) { const k = (fa - 0.22) / 1.18; D.lay('wall'); for (let ring = 0; ring < 2; ring++) { const kk = k - ring * 0.25; if (kk <= 0) continue; const rx = 20 + kk * 70, ry = 3 + kk * 8; for (let an = 0; an < Math.PI; an += 0.02) { const x = 46 + Math.cos(an) * rx, y = 90 + Math.sin(an) * ry; if (y < H - 3) D.px(x, y, 'water', 11 - kk * 4, { e: 255 }); } } }
    // the impact: cracks split down the pedestal's face (white-hot for a moment, then dark), a star flashes under the head
    if (fa > 0.22 && fa < 0.55) { const age = fa - 0.22; D.lay('back'); CRK.forEach(pts => pts.forEach(([x, y], k) => { if (k > age / 0.06 * pts.length) return;
      if (age < 0.09) D.px(x, y, 'lamp', 10.5 - k * 0.4, { e: 255 }); else if (age < 0.16) D.px(x, y, 'fire', 6 - k * 0.3, { e: 255 }); else D.px(x, y, 'ink', 0); D.px(x + 1, y, 'stone', 8); })); }
    if (fa > 0.22 && fa < 0.36) { const k = 1 - (fa - 0.22) / 0.14, cx = 41, cy = 77; D.lay('mid');
      [[1, 0, 7], [-1, 0, 7], [0, 1, 5], [0, -1, 4], [1, 1, 3], [-1, 1, 3], [1, -1, 2], [-1, -1, 2]].forEach(([ux, uy, l]) => { const n = Math.round(l * (0.4 + 0.6 * k)); for (let d = 1; d <= n; d++) D.px(cx + ux * d, cy + uy * d, 'lamp', clamp(11 - d / n * 3.4, 7, 11), { e: 255 }); });
      D.px(cx, cy, 'lamp', 11, { e: 255 }); }
  },
});

const D_ = {
  pyramids: '黄昏的金色沙漠，夕阳正落在大金字塔尖的后面：金字塔背着光成了暗色剪影，两条塔边描着一道金边，霞光从塔尖向整片天空放射；旁边是戴蓝金头巾的狮身人面像和刻满符号的红色方尖碑，塔影朝近处铺在沙地上；石匠抡锤凿石、石粉飞溅，建筑师拿着图纸来回踱步，两只鹰绕着塔顶盘旋，风吹着沙粒贴地流动；每隔一阵两个光点沿塔边爬上塔尖，金顶一闪，光芒向四周射出，一道光柱冲天，一片金光顺着塔面往下扫，方尖碑上的符号从上到下亮起',
  stonehenge: '月夜草原上的巨石阵：月亮悬在中央石门正上方，门里立着一道淡蓝的光，光丝和光点不停往上飘，石头上的刻纹跟着一明一暗；白袍祭司拄杖守着祭石，两只羊低头吃草，篝火摇曳，萤火点点，地上漫着薄雾，偶尔划过一颗流星；每隔一阵月光直落进石门，门光大亮，刻纹从中间往外一块块亮起，一圈光在草地上散开，祭司举起法杖',
  gardens: '天快亮时蓝色天光下的巴比伦：天空从深蓝淡到淡紫，几朵云的底边染成粉色，晨星一闪一闪，远处的城站在雾里；三层蓝色琉璃砖的阶梯花园，金边拱门里亮着灯，檐下挂的小灯笼轻轻摇晃，每层都长满花丛、柏树和棕榈，藤蔓顺墙垂下随风摆动；顶上金顶亭子里挂着两盏吊灯，一只倾倒的陶瓮往外流水，水沿中间一层层往下淌、在每层台沿卷起白色水花，流进发光的水池；一缕缕薄雾从花园前飘过，地上的雾慢慢翻滚，水池上水汽升腾；园丁提壶浇花，燕子飞过，近处一枝开花的树枝轻摇、花瓣飘落；每隔一阵一股大水冲下，水池溅起水花，水雾变浓，雾里挂出一道彩虹，绿色十字从水里升起',
  artemis: '月牙下林边的白色希腊神庙：带凹槽的石柱、山墙上的金色月牙，中间敞开的神殿门里站着头戴月牙、手持金弓的女神像，台阶上两只铜火盆；左边一棵银绿叶子的橄榄树，庙前祭坛燃着像素火焰，旁边堆着陶罐、麦束和果子箱，女祭司照看火焰，侍从来回搬箱子，一头雄鹿在旁边低头吃草、偶尔抬头，飞蛾绕火，橄榄叶轻轻抖动；每隔一阵祭司举起双手撒香，火焰猛地窜高、火星四溅，两只火盆冒出香烟，女神像周身亮起金边、月牙冠放光，鹿猛地抬起头',
  colossus: '日出时的港口：太阳从右边海面升起，霞光一道道射满天空，几条细云镶着金边，海面上一条金色光带闪闪发亮、一直铺到眼前；铜色巨人跨立在两座石台上，背着光成了暗色剪影，朝着太阳的一侧描着一圈金边，头戴光芒王冠，一手高举还在燃烧的火炬，一手握着的大锤平放在左边石台上；帆船挂着灯从他两腿间驶过，近处码头上持矛执盾的卫兵守在火盆旁，左边远岸的小城还亮着几盏灯，每隔一阵浪头拍上石台；开火时巨人抡起大锤砸向石台，锤下迸出一团星形闪光，石台正面裂开几道发红的裂纹，火星和石粉飞溅，两边海水冲起，水面一圈圈荡开，火炬和眼睛一亮',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
