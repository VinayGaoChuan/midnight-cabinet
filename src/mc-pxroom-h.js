// ==== mc-pxroom-h.js ====
(function () {
// Pixel rooms, batch h (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 泰姬陵 taj · 大本钟 bigben · 自由女神像 liberty · 悉尼歌剧院 opera · 金门大桥 goldengate — five landmark wonders under five
// different skies: moonrise, London fog, daybreak, a moonless light show, sunset in the fog.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, stroll, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle

// ───────── shared bits ─────────
// a small flame (candles, lamps, torches), flickering
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', Math.round(clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11)), { e: 255 }); }
}
// where a worker's front hand is (same rig as PXR.worker), to hang a lantern or a spyglass on it
function handAt(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), a1 = p.aF || 0, a2 = p.eF || 0;
  const ex = Math.round(sx + dir + Math.sin(a1) * 5 * dir), ey = Math.round(shY + 2 + Math.cos(a1) * 5);
  return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5), sx + Math.round((p.hx || 0) * dir), shY];
}
// the other way round: the pose angles [a, e] (as PXR.worker takes them) that put a hand at (tx, ty) from the shoulder at
// (px, py) with the rig's two 5-px bones; bend ±1 picks which side the elbow goes
function reach(px, py, tx, ty, dir, bend) {
  let dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy); if (d > 9.8) { dx *= 9.8 / d; dy *= 9.8 / d; d = 9.8; } if (d < 0.6) { dx = 0; dy = 0.6; d = 0.6; }
  const h = Math.sqrt(Math.max(0, 25 - d * d / 4)), ex = px + dx / 2 - dy / d * h * bend, ey = py + dy / 2 + dx / d * h * bend, a = Math.atan2((ex - px) * dir, ey - py);
  return [a, Math.atan2((px + dx - ex) * dir, py + dy - ey) - a];
}
// onion dome: apex yA, neck yN, widest half-width rw about 60% down, neck half-width rn; sphere-like normals, darker rims
function onion(S, cx, yA, yN, rw, rn, m, t, o) {
  o = o || {}; const wv = o.wv || 0.56;
  for (let y = yA; y <= yN; y++) {
    const v = (y - yA) / (yN - yA), w = v < wv ? rw * Math.pow(Math.sin(Math.PI / 2 * v / wv), o.pt || 1.35) : rn + (rw - rn) * Math.pow(Math.cos(Math.PI / 2 * (v - wv) / (1 - wv)), 0.8);
    const hw = Math.max(0.5, w), vn = clamp((v - 0.5) * 1.6, -0.9, 0.7);
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) { const u = (x - cx) / (hw + 0.5);
      // hard-banded shading: a crescent of light on the upper left, a mid band, the shade side, a dark rim
      const l = -u * 0.62 - vn * 0.55 + 0.1, band = !o.band ? 0 : Math.abs(u) > 0.88 ? -1.6 : l > 0.45 ? 1.2 : l > -0.05 ? 0.2 : l > -0.45 ? -0.8 : -1.5;
      S.px(x, y, m, t + band - (o.band ? 0 : Math.pow(Math.abs(u), 3) * 1.6), { n: [u * 0.85, vn], e: o.e }); }
  }
}
// pointed (Mughal / gothic) arch opening: full width below the spring line, two arcs meeting at the apex above it
function parch(S, x0, x1, yA, yS, yB, m, t, o) {
  const cx = (x0 + x1) / 2, hw = (x1 - x0 + 1) / 2;
  for (let y = yA; y <= yB; y++) { let w = hw; if (y < yS) { const k = (yS - y) / (yS - yA + 0.5); w = hw * Math.sqrt(Math.max(0, 1 - k * k)) * (1 - 0.28 * k); }
    if (w < 0.5 && y > yA) w = 0.5; for (let x = Math.round(cx - w + 0.01); x < Math.round(cx + w - 0.01) || x === Math.round(cx - 0.5); x++) S.px(x, y, m, t, o); }
}
// reflection in still water: each water row repeats the picture above the waterline (read back from last frame), squashed,
// rippled row by row, and re-coloured onto the water ramp (warm lights stay warm, violet stays violet)
const RMAP = new Map();
function rampLum(m) { return X.RAMPS[m].map(h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11); }); }
const RL = {}; ['water', 'lamp', 'arcane', 'candy', 'teal', 'dusk', 'fire'].forEach(k => { RL[k] = rampLum(k); });
function mapCol(c, dim, warm) {
  const key = c * 4 + dim; let v = RMAP.get(key); if (v) return v;
  const r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255, lum = (r * 0.3 + g * 0.59 + b * 0.11) * dim;
  let m = 'water'; if (r > 140 && r > b + 50 && g > b) m = r > g + 110 ? 'fire' : 'lamp'; else if (b > g + 40 && r > g + 20 && lum > 50) m = 'arcane'; else if (r > g + 50 && b > g + 20 && lum > 50) m = 'candy'; else if (warm && r > b + 20 && lum > 30) m = 'dusk';
  const L = RL[m]; let k = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i] - lum) < Math.abs(L[k] - lum)) k = i;
  if (m === 'water') k = lum < 22 ? 1 : lum < 42 ? 2 : lum < 72 ? 3 : lum < 104 ? 5 : lum < 150 ? 6 : 8;   // posterise the water: fewer, bigger shapes
  else k = Math.max(3, k - (k % 2));
  v = [X.MI[m], k]; RMAP.set(key, v); return v;
}
function reflect(D, rs, t, o) {
  const prev = rs.u32; if (!prev || rs.fn < 2) return; const { y0, y1, ym, sq } = o, x0 = o.x0 || 4, x1 = o.x1 || W - 4, dim = o.dim || 0.62;
  const lum = (c) => (c & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + ((c >> 16) & 255) * 0.11;
  D.lay('wall');
  for (let y = y0; y < y1; y++) {
    const d = y - y0, k = d / (y1 - y0), ya = Math.round(ym - 1 - d * sq), yb = Math.max(4, Math.round(ym - 1 - (d + 1) * sq) + 1); if (ya < 4) continue;
    const sh = Math.round(Math.sin(y * 1.3 + t * 1.7) * (0.25 + k * 0.95) + Math.sin(t * 0.7 + y * 0.45) * 0.3);
    for (let x = x0; x < x1; x++) {
      if (o.mask && !o.mask(x, y)) continue;
      // each water row stands for a band of rows above: keep the band's second-brightest pixel (big shapes survive, fine lines drop)
      const xs = clamp(x + sh, 4, W - 5); let b1 = 0, l1 = -1, b2 = 0, l2 = -1;
      for (let yy = ya; yy >= yb; yy--) { const c = prev[yy * W + xs], l = lum(c); if (l > l1) { b2 = b1; l2 = l1; b1 = c; l1 = l; } else if (l > l2) { b2 = c; l2 = l; } }
      const mt = mapCol(l2 >= 0 ? b2 : b1, dim, o.warm);
      const gap = (y % 3 === 1) && ((x + Math.floor(t * (2 + (y % 2)) + y * 13)) % 23) < 6;   // dark ripple dashes drift along every third row
      D.px(x, y, mt[0], Math.max(1, mt[1] - (gap ? 1 : 0)), { e: 255 });
    }
  }
}

// ───────── mirror tables (paint time) ─────────
// A still pool shows a landmark upside down. Reading last frame back and squeezing it breaks thin lines into noise, so the
// two pool rooms decide once, at paint time, what every water pixel shows (taj: a hand-built upside-down silhouette; opera:
// the sail pixel its row mirrors, dark where a sail edge falls in the squeezed band). Frames then only ripple it (≤ 1 px
// row shifts, dark dashes) and recolour what changes. (bigben's puddle and goldengate's bay still use reflect() above.)
let MN = null;   // material index → ramp name
const matName = (m) => { if (!MN) { MN = []; Object.keys(X.MI).forEach(k => { MN[X.MI[k]] = k; }); } return MN[m]; };
// look up what shows at (x, y) in the static layers, back over wall: [layer 'b' | 'w', ramp name, tone, object id]
function seen(S, x, y) { const p = y * W + x, B = S.L.back, Wl = S.L.wall; if (B.m[p]) return ['b', matName(B.m[p]), B.t[p], B.o[p]]; if (Wl.m[p]) return ['w', matName(Wl.m[p]), Wl.t[p], 0]; return ['w', 'night', 1, 0]; }
// the topmost marble pixel of each column of the object being painted gets a cold rim (the moon stands right above and
// behind: its light rims every upper edge), and the pixels just under it drop a little into shade
function rimT(S, x0, x1, y0, y1, m, t, sh) { const L = S.c, id = S.id, lin = X.MI.linen;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const p = y * W + x; if (L.o[p] !== id || L.m[p] !== lin) continue; if (L.t[p] >= 4) { S.px(x, y, m, t, { e: 255 }); (sh || [1.2]).forEach((d, k) => { const q = (y + 1 + k) * W + x; if (L.o[q] === id && L.m[q] === lin) S.tone(x, y + 1 + k, -d); }); } break; } }
// a ripple row: shifted by one pixel now and then, a traveling wave down the pool
const rip = (t, y) => { const s = Math.sin(t * 1.2 - y * 0.5) + 0.35 * Math.sin(t * 0.7 + y * 1.9); return s > 1.05 ? 1 : s < -1.05 ? -1 : 0; };
const dashAt = (t, x, y) => y % 3 === 1 && ((x + Math.floor(t * (2 + (y % 2))) + y * 13) % 23) < 4;
// the candle flicker of a light as whole tone steps (glow pixels that follow a flickering light by e: n land between two
// steps and dither into a checkerboard; drawn with this they step cleanly)
const candleStep = (t, ph, kick, gain) => Math.round(((0.9 + 0.08 * n1(t * 9 + (ph || 0)) + 0.03 * n1(t * 23 + (ph || 0))) - 0.9) * (gain || 9) + (kick || 0) * 2.5);
const GLOW = { e: 255 };

// ───────── 泰姬陵 taj (fantasy · misc, epic) ─────────
// the white mausoleum under the full moon, which stands right behind the great dome (the finial crosses its disc): onion
// dome and chhatris rimmed by its light, the great iwan with a lamp, four minarets, a long pool that mirrors it all with the
// moon's own reflection at the foot of the mirrored dome; souls drift up from the water, and every ten seconds three of them
// fly into the iwan and a shard is born
const TAJ_DIYA = [22, 34, 46, 58, 92, 104, 116, 128];
// the pool: water rows 74…87 hold the mausoleum upside down, drawn as a clean squeezed silhouette — plinth, the block with
// its dark iwan and warm door, drum and chhatris, the great dome with its tip over the moon's reflection (on the axis, cut
// by the near kerb), the minarets, the cypresses — kept in a table so each frame can ripple it and, in the flare, turn its
// marble violet
const TJ = { x0: 4, x1: 146, y0: 74, y1: 88 }, TJ_M = new Uint8Array(W * 15), TJ_T = new Uint8Array(W * 15), TJ_K = new Uint8Array(W * 15);
const TJ_DOOR = [], TJ_LAT = [], TJ_RIM = ['ice', 10];   // the iwan door's frame and lattice (glow that steps with the lamp); the moonlit rim
const TJ_SKYMOON = [75.5, 11.5, 7], TJ_MOON = [75.5, 86.2];   // the full moon right over the dome (the finial crosses it), and its reflection on the pool's axis
function tajMirror(S) {
  const set = (x, y, m, t) => { x = Math.round(x); y = Math.round(y); if (x < TJ.x0 || x >= TJ.x1 || y < TJ.y0 || y >= TJ.y1) return; const i = (y - TJ.y0) * W + x; TJ_M[i] = X.MI[m]; TJ_T[i] = clamp(Math.round(t), 0, 11); TJ_K[i] = m === 'linen' ? 1 : 0; };
  const flip = (a, b) => ({ px: (x, y, m, t) => set(x, a + b - y, m, t) }), hl = (x, y, w, m, t) => { for (let k = 0; k < w; k++) set(x + k, y, m, t); };
  const mr = 'linen', ell = (cx, cy, rx, ry, m, t) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) { const v = (y + 0.5 - cy) / ry; if (Math.abs(v) >= 1) continue; const hw = rx * Math.sqrt(1 - v * v); for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) set(x, y, m, t); } };
  // the sky upside down; round the far end of the mirrored dome the moon's halo, and the moon itself (the dome hangs over it)
  for (let y = TJ.y0; y < TJ.y1; y++) hl(TJ.x0, y, TJ.x1 - TJ.x0, 'water', 2);
  ell(TJ_MOON[0], TJ_MOON[1], 15, 4.4, 'water', 3); ell(TJ_MOON[0], TJ_MOON[1], 10, 3.2, 'water', 4);
  ell(TJ_MOON[0], TJ_MOON[1], 7, 2.6, 'bone', 9); ell(TJ_MOON[0] + 1.5, TJ_MOON[1] + 0.5, 4.6, 1.6, 'bone', 10);
  // the lawn's edge and the cypresses hang down as dark spikes
  hl(TJ.x0, 74, 18, 'leaf', 2); hl(128, 74, TJ.x1 - 128, 'leaf', 2);
  [[8, 6, 3.2], [16, 8, 3.6], [134, 8, 3.6], [142, 6, 3.2]].forEach(([cx, h, w]) => { for (let k = 0; k < h; k++) { const hw = w * Math.pow(1 - k / h, 0.9); for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) set(x, 75 + k, 'leaf', x < cx ? 3 : 2); } });
  // the plinth: its shaded face by the water with the row of niches, then the lit top
  hl(22, 74, 107, mr, 4); for (let x = 26; x < 125; x += 7) hl(x + 1, 74, 2, 'lav', 2); hl(22, 75, 107, mr, 5);
  // the minarets: shafts, three balconies, the kiosk and its little dome, all hanging down
  [31, 119].forEach(cx => { for (let y = 76; y < 82; y++) { const hw = y < 78 ? 2 : 1; for (let x = cx - hw; x <= cx + hw; x++) set(x, y, mr, x < cx ? 6 : x > cx ? 4 : 5); }
    [77, 79, 81].forEach(y => hl(cx - 3, y, 7, mr, 6)); onion(flip(82, 84), cx, 82, 84, 2.4, 1.6, mr, 5, { band: 1 }); set(cx, 85, 'gold', 4); });
  // the block: chamfered corners in shade, two rows of niches, the lit pishtaq frame with its inlay round the dark iwan
  for (let y = 76; y < 79; y++) { hl(50, y, 51, mr, 4); hl(97, y, 4, mr, 3); }
  [76, 78].forEach(y => [56, 91].forEach(x => hl(x, y, 4, 'lav', 3)));
  for (let y = 76; y < 79; y++) { hl(62, y, 27, mr, 5); set(63, y, 'arcane', 3); set(87, y, 'arcane', 3); }
  parch(flip(76, 78), 66, 84, 76, 77, 78, 'lav', 2); parch(flip(76, 78), 68, 82, 76, 77, 78, 'lav', 1);
  hl(72, 76, 7, 'lamp', 4); hl(73, 77, 5, 'lamp', 5);
  // parapet and drum, the chhatris hanging from them, the great dome (its tip over the moon) and the finial, dark on the moon
  hl(50, 79, 51, mr, 5); hl(65, 79, 21, mr, 4);
  [57, 93].forEach(cx => { onion(flip(80, 82), cx, 80, 82, 4.4, 3, mr, 5, { band: 1 }); set(cx, 83, 'gold', 4); });
  onion(flip(80, 84), 75, 80, 84, 13.5, 8.5, mr, 5.8, { band: 1, wv: 0.5 });
  hl(74, 85, 3, 'gold', 3); set(75, 86, 'gold', 2); set(74, 87, 'gold', 2); set(76, 87, 'gold', 2);
  // a dark water line round every pale shape keeps the silhouette crisp at 1:1
  const wi = X.MI.water, li = X.MI.linen, edge = [];
  for (let y = TJ.y0 + 1; y < TJ.y1; y++) for (let x = TJ.x0 + 1; x < TJ.x1 - 1; x++) { const i = (y - TJ.y0) * W + x; if (TJ_M[i] !== wi || TJ_T[i] > 3) continue; if (TJ_M[i - 1] === li || TJ_M[i + 1] === li || TJ_M[i - W] === li || (y + 1 < TJ.y1 && TJ_M[i + W] === li)) edge.push(i); }
  edge.forEach(i => { TJ_T[i] = 1; });
  S.lay('wall'); for (let i = 0; i < TJ_M.length; i++) { const y = TJ.y0 + Math.floor(i / W), x = i % W; if (x >= TJ.x0 && x < TJ.x1 && y < TJ.y1 && TJ_M[i]) S.px(x, y, TJ_M[i], TJ_T[i], GLOW); }
}
// the pool at a moment: ripple rows shift a pixel, dark dashes drift, and in the flare the mirrored marble glows violet too
// (lt: the iwan lamp's flicker in whole steps — the mirrored door steps with it)
function tajWater(D, t, fl, lt) {
  D.lay('wall'); const LI = X.MI.lamp;
  for (let y = TJ.y0; y < TJ.y1; y++) { const sh = rip(t, y), dr = y % 3 === 1, lr = y === 76 || y === 77; if (!sh && !dr && !fl && !(lr && lt)) continue;
    for (let x = TJ.x0; x < TJ.x1; x++) { const i = (y - TJ.y0) * W + clamp(x - sh, TJ.x0, TJ.x1 - 1), g = dr && dashAt(t, x, y), f = fl && TJ_K[i], lp = lt && TJ_M[i] === LI; if (!sh && !g && !f && !lp) continue;
      let m = TJ_M[i], tn = TJ_T[i]; if (f) { m = fl > 1 ? X.MI.arcane : X.MI.lav; tn = fl > 1 ? tn + 1 : tn + 3; } if (lp) tn = clamp(tn + lt, 3, 8); if (g) tn = Math.max(1, tn - (m === X.MI.water ? 1 : 2));
      D.px(x, y, m, tn, GLOW); } }
}
const TAJ_LOOK = { skin: ['skin', 4], hair: ['hair', 2], top: ['linen', 8], bot: ['linen', 6], boot: ['leather', 3], beard: ['hair', 2] };
X.def('taj', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 60, moon: TJ_SKYMOON, far: 'trees', floor: 'stone' });                                        // 0 moon, right over the dome
    sc.light({ x: 75, y: 57, z: 8, r: 30, i: 0.9, c: '#ffc070', fl: 'candle', tint: 0.55 });                              // 1 lamp in the iwan
    sc.light({ x: 40, y: 86, z: 24, r: 48, i: 0.75, c: '#ffa040', fl: 'fire', tint: 0.45 });                              // 2 diyas left
    sc.light({ x: 110, y: 86, z: 24, r: 48, i: 0.75, c: '#ffa040', fl: 'fire', ph: 2, tint: 0.45 });                     // 3 diyas right
    sc.light({ x: 75, y: 46, z: 18, r: 88, i: 0.35, c: '#a080ff', fl: 'pulse', amp: 0.3, sp: 1.1, tint: 0.6 });          // 4 soul light
    const mar = 'linen';
    // garden: lawn, the pool with marble kerbs, the terrace of red sandstone flags
    S.lay('wall');
    S.rect(3, 66, 144, 7, 'leaf', 2.6, { n: [0, -0.8] }); S.noise(3, 66, 144, 7, 1, 3, 5);
    S.hl(3, 73, 144, mar, 6.5, { n: [0, -0.9] });
    S.rect(3, 74, 144, 14, 'water', 2.5, { n: [0, -0.9] });
    S.rect(3, 88, 144, 2, mar, 7.5, { n: [0, -0.9] }); S.hl(3, 89, 144, mar, 5);
    TX.tiles(S, 0, FY, W, H - FY, 'brick', 5.5, { s: 7, gt: 3, v: 0.7, gloss: false });
    for (let x = 6; x < W; x += 14) { S.px(x, 94, mar, 8); S.px(x - 1, 95, mar, 7); S.px(x + 1, 95, mar, 7); S.px(x, 96, mar, 6); }
    // cypress rows on the lawn either side of the plinth
    const cypress = (cx, yb, h, w, tn) => { S.beg(); for (let k = 0; k < h; k++) { const v = k / h, hw = Math.max(0.5, w * Math.sin(Math.PI * Math.pow(v, 0.8)) * (v > 0.85 ? 0.8 : 1)); for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) { const u = (x - cx) / (hw + 0.5); S.px(x, yb - h + k, 'leaf', tn + (u < -0.2 ? 1 : 0) - (u > 0.4 ? 1 : 0) + ((x * 5 + k * 3) % 7 === 0 ? 1 : 0), { n: [u * 0.8, -0.2] }); } } S.end(); };
    S.lay('back'); [[8, 72, 30, 3.2], [16, 72, 38, 3.6], [134, 72, 38, 3.6], [142, 72, 30, 3.2]].forEach(([x, y, h, w]) => cypress(x, y, h, w, 3.2));
    // plinth: a broad marble platform with a row of niches
    S.beg(); S.box(22, 65, 106, 7, mar, 6.5, { top: 2, tt: 1.4 });
    for (let x = 26; x < 125; x += 7) { parch(S, x, x + 3, 66, 67, 70, mar, 3.5); S.px(x + 1, 66, mar, 8); }
    S.end();
    // minarets: tapering shafts, three balconies, a little domed kiosk on top
    [31, 119].forEach(cx => { S.beg();
      for (let y = 25; y < 65; y++) { const hw = 2 + (y > 45 ? 1 : 0); S.cyl(cx - hw, y, hw * 2 + 1, 1, mar, 7, { rim: 1.4 }); }
      [52, 40, 29].forEach(y => { S.box(cx - 4, y, 9, 2, mar, 7.5); S.hl(cx - 3, y + 2, 7, mar, 3.5); });
      for (let y = 21; y < 25; y++) { S.px(cx - 2, y, mar, 7); S.px(cx + 2, y, mar, 5.5); S.px(cx, y, mar, 2.5); S.px(cx - 1, y, mar, 3); S.px(cx + 1, y, mar, 3); }
      S.hl(cx - 3, 20, 7, mar, 8); onion(S, cx, 14, 20, 3.2, 2.2, mar, 8, { band: 1 }); S.vl(cx, 12, 3, 'gold', 7); S.px(cx, 11, 'gold', 9);
      rimT(S, cx - 4, cx + 4, 12, 64, TJ_RIM[0], TJ_RIM[1] - 1, [1]); S.end(); });
    // main block: chamfered corners, two storeys of niches either side, parapet with corner pinnacles
    S.beg();
    S.box(50, 40, 51, 25, mar, 7); S.rect(50, 40, 5, 25, mar, 5.8, { n: [-0.6, 0] }); S.rect(96, 40, 5, 25, mar, 5.4, { n: [0.6, 0] });
    S.hl(50, 39, 51, mar, 8.5, { n: [0, -0.8] }); S.hl(50, 38, 51, mar, 6);
    for (let x = 51; x < 101; x += 3) S.px(x, 37, mar, 7.5);
    [[51, 1], [99, 1]].forEach(([x]) => { S.vl(x, 31, 7, mar, 7.5); S.px(x, 30, 'gold', 8); });
    // side bays: two storeys of pointed niches, a lit inlay frame round each
    [[55, 60], [90, 95]].forEach(([a, b]) => { [[42, 45, 51], [53, 56, 63]].forEach(([yA, yS, yB]) => { S.rect(a - 1, yA - 1, b - a + 3, yB - yA + 2, mar, 8.2); parch(S, a, b, yA, yS, yB, 'lav', 3); S.hl(a, yB, b - a + 1, 'lav', 2); }); });
    [57, 92].forEach(x => { S.vl(x + 1, 57, 1, 'iron', 4); S.rect(x, 58, 3, 2, 'lamp', 7, GLOW); S.px(x + 1, 60, 'lamp', 5, GLOW); });   // hanging lamps (their flicker is drawn per frame)
    [[51, 53], [97, 99]].forEach(([a, b]) => { [[43, 45, 51], [54, 56, 63]].forEach(([yA, yS, yB]) => parch(S, a, b, yA, yS, yB, 'lav', 2.4)); });
    // the pishtaq: a tall frame with an inlaid border, and the great pointed iwan inside it
    S.box(62, 35, 27, 30, mar, 7.6); S.hl(62, 35, 27, mar, 9, { n: [0, -0.8] });
    S.rect(63, 36, 25, 1, 'arcane', 4, { e: 5 }); S.rect(63, 36, 1, 28, 'arcane', 4, { e: 5 }); S.rect(87, 36, 1, 28, 'arcane', 4, { e: 5 });   // inlaid border: breathes with the soul light
    for (let x = 65; x < 87; x += 2) S.px(x, 38, 'lav', 3.5);
    parch(S, 66, 84, 40, 48, 64, 'lav', 2.6); parch(S, 68, 82, 43, 49, 64, 'lav', 1.8);
    // the door at the back of the iwan (glows with the lamp) and a lattice window over it
    // (the core glows steady; the frame and the lattice step with the lamp's flicker, drawn per frame)
    parch(S, 72, 78, 53, 56, 64, 'lamp', 5, GLOW); parch(S, 73, 77, 55, 57, 64, 'lamp', 7, GLOW);
    if (!TJ_DOOR.length) { const a = [], b = new Set(); parch({ px: (x, y) => a.push([x, y]) }, 72, 78, 53, 56, 64); parch({ px: (x, y) => b.add(x + ',' + y) }, 73, 77, 55, 57, 64); a.forEach(q => { if (!b.has(q[0] + ',' + q[1])) TJ_DOOR.push(q); });
      for (let x = 72; x <= 78; x += 2) for (let y = 46; y <= 50; y += 2) TJ_LAT.push([x, y]); }
    TJ_LAT.forEach(([x, y]) => S.px(x, y, 'lamp', 6, GLOW));
    // spandrels: tiny inlaid flowers
    [[64, 38], [85, 38]].forEach(([x, y]) => { S.px(x, y + 1, 'crimson', 7); S.px(x, y + 2, 'leaf', 6); });
    S.end();
    // drum, the great onion dome, lotus top and gilded finial
    S.beg(); S.cyl(65, 31, 21, 6, mar, 7.2, { rim: 1.6 }); S.hl(65, 31, 21, mar, 8.6); for (let x = 66; x < 86; x += 3) S.px(x, 34, mar, 5);
    onion(S, 75, 11, 31, 15, 9, mar, 7.8, { band: 1, wv: 0.5 }); rimT(S, 59, 91, 11, 30, TJ_RIM[0], TJ_RIM[1], [1.4, 0.7]);   // moonlit upper rim over a band of shade
    S.end();
    // the finial: lotus, rod and crescent, a thin dark silhouette on the moon behind (no outline, so the disc stays whole)
    S.beg(); S.hl(74, 10, 3, 'gold', 3.5); S.px(75, 9, 'gold', 4); S.px(74, 10, 'gold', 5.5); S.vl(75, 6, 3, 'gold', 3); [[74, 4], [74, 5], [75, 6], [76, 5], [76, 4]].forEach(([x, y]) => S.px(x, y, 'gold', 3.5)); S.end({ none: 1 });
    // chhatris on the roof corners
    [57, 93].forEach(cx => { S.beg(); S.hl(cx - 5, 29, 11, mar, 8); for (let y = 30; y < 38; y++) { S.px(cx - 4, y, mar, 7.5); S.px(cx, y, mar, 7); S.px(cx + 4, y, mar, 5.8); if (y > 30) { S.px(cx - 3, y, 'lav', 2); S.px(cx - 2, y, 'lav', 2); S.px(cx - 1, y, 'lav', 2); S.px(cx + 1, y, 'lav', 2); S.px(cx + 2, y, 'lav', 2); S.px(cx + 3, y, 'lav', 2); } }
      onion(S, cx, 21, 29, 4.6, 3.2, mar, 8, { band: 1 }); rimT(S, cx - 5, cx + 5, 21, 28, TJ_RIM[0], TJ_RIM[1] - 1, [1.2]); S.vl(cx, 19, 3, 'gold', 7.5); S.end(); });
    // the pool mirrors all of it (static; the frames ripple it)
    tajMirror(S);
    // near side: diyas on the pool's near kerb, a stone lotus urn at each end
    S.lay('front');
    TAJ_DIYA.forEach(x => { S.beg(); S.hl(x - 2, 87, 5, 'brick', 7); S.hl(x - 1, 88, 3, 'brick', 4.5); S.end(); });
    [[8, -1], [142, 1]].forEach(([x]) => { S.beg(); S.box(x - 3, 82, 7, 8, mar, 6.5, { top: 1 }); S.rect(x - 4, 80, 9, 2, mar, 7.5); S.ell(x, 78, 3.5, 2.2, 'leaf', 6, { dome: 1 }); S.px(x, 75, 'pink', 8); S.px(x - 1, 76, 'pink', 7); S.px(x + 1, 76, 'pink', 6); S.end(); });
    // lotus pads on the water (over the reflection)
    S.lay('back'); [[22, 80], [46, 85], [104, 83], [137, 80]].forEach(([x, y], i) => { S.beg(); S.ell(x, y, 3.2, 1.2, 'leaf', 5, { n: [0, -0.9] }); S.px(x + 1, y, 'leaf', 3); if (i % 2 === 0) { S.px(x - 1, y - 1, 'pink', 8); S.px(x, y - 2, 'pink', 9); S.px(x - 2, y - 1, 'pink', 6); } S.end(); });
    sc.emit({ k: 'soul', x: 75, y: 80, w: 100, rate: 0.5, sp: 3, ang: 0, spread: 0.4, life: 3.2 });
    sc.emit({ k: 'glint', x: 75, y: 62, w: 140, h: 16, rate: 0.6, sp: 2, life: 1.2 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10.5), fl = q > 0.66 && q < 0.86 ? (q > 0.7 && q < 0.8 ? 2 : 1) : 0;
    // the pool: the mirrored mausoleum ripples (and flares violet with the facade)
    const lt = candleStep(t, 0, rs.kick[1]);
    tajWater(D, t, fl, lt);
    // the iwan's lamp: door frame, lattice and the two hanging lamps step with its flicker (the mirrored door with them)
    D.lay('back');
    TJ_DOOR.forEach(([x, y]) => D.px(x, y, 'lamp', clamp(5 + lt, 4, 10), GLOW)); TJ_LAT.forEach(([x, y]) => D.px(x, y, 'lamp', clamp(6 + lt, 4, 10), GLOW));
    [57, 92].forEach(x => { D.rect(x, 58, 3, 2, 'lamp', clamp(7 + lt, 5, 10), GLOW); D.px(x + 1, 60, 'lamp', clamp(5 + lt, 4, 9), GLOW); });
    D.lay('wall');
    // the moon's glitter on the pool: sparks either side of its reflection, wandering, a dash of lamplight under the door
    for (let y = 84; y < 88; y++) for (let k = 0; k < 2; k++) { const ph = t * (1.1 + k * 0.5) + y * 2.3 + k * 2.9, sd = Math.sin(ph) > 0 ? 1 : -1, x = Math.round(TJ_MOON[0] + sd * (7 + ((y * 5 + k * 3 + Math.floor(t * 2.2)) % 9) + (y - 84) * 1.5)), on = Math.sin(t * 3.1 + y * 1.7 + k * 4) > -0.2;
      if (on) D.hl(x - (sd < 0 ? 1 : 0), y, 1 + ((y + k + Math.floor(t * 3)) & 1), 'bone', 10, GLOW); }
    if ((Math.floor(t * 5) % 3) !== 0) D.hl(74 + (Math.floor(t * 2.5) & 1), 78, 2, 'lamp', clamp(4 + lt, 3, 7), GLOW);
    X.twinkle(D, t, 9, 48, 17);
    D.lay('front'); TAJ_DIYA.forEach((x, i) => flame(D, x, 86, 3, t, i * 1.9));
    // the moment: three souls rise from the pool, curl into the iwan, the facade flares violet and a shard is born
    D.lay('mid');
    if (q > 0.5 && q < 0.72) { const k = (q - 0.5) / 0.22, e = k * k * (3 - 2 * k);
      [[36, 0], [75, 2.1], [114, 4.2]].forEach(([sx, ph]) => { const x = sx + (75 - sx) * e + Math.sin(k * 7 + ph) * 6 * (1 - e), y = 82 + (52 - 82) * e - Math.sin(k * Math.PI) * 14;
        for (let j = 3; j >= 0; j--) { const kk = Math.max(0, k - j * 0.025), ee = kk * kk * (3 - 2 * kk), tx = sx + (75 - sx) * ee + Math.sin(kk * 7 + ph) * 6 * (1 - ee), ty = 82 + (52 - 82) * ee - Math.sin(kk * Math.PI) * 14; D.px(tx, ty, 'arcane', Math.round(9 - j * 1.5), { e: 255 }); }
        D.rect(x - 1, y - 1, 3, 3, 'arcane', 9, { e: 255 }); D.px(x, y, 'arcane', 11, { e: 255 }); }); }
    if (q > 0.72 && !st.born) { st.born = 1; rs.flash(4, 2.2); rs.flash(1, 0.8); rs.burst('rune', 75, 52, 12, { sp: 26, life: 1.3 }); rs.burst('glint', 75, 52, 6, { sp: 20, life: 0.6 }); }
    if (q < 0.5) st.born = 0;
    rs.mul[4] = 1 + (q > 0.6 && q < 0.72 ? (q - 0.6) / 0.12 * 1.2 : q >= 0.72 ? Math.max(0, 2.6 * (1 - (q - 0.72) / 0.2)) : 0);
    if (q > 0.72 && q < 0.98) { const k = (q - 0.72) / 0.26, fly = k > 0.62 ? (k - 0.62) / 0.38 : 0, sx = 75 + Math.sin(fly * 2.2) * 26 * fly, sy = 52 - Math.sin(Math.min(1, k / 0.2) * Math.PI / 2) * 4 - fly * fly * 60, hl = (t * 1.6) % 1;
      if (sy > 4) { for (let y = -4; y <= 4; y++) { const hw = Math.round((4 - Math.abs(y)) * 0.6); for (let x = -hw; x <= hw; x++) { const f = (x / (hw + 1) + 1) / 2; D.px(sx + x, sy + y, 'arcane', (y < 0 ? 8 : 6) + (Math.abs(f - hl) < 0.25 ? 2 : 0) - (x > 0 ? 1 : 0), { e: 255 }); } } D.px(sx - 1, sy - 2, 'arcane', 11, { e: 255 }); }
      if (fly > 0 && R() < 0.7) rs.burst('glint', sx, sy + 4, 1, { sp: 4, life: 0.5 }); }
    // the keeper walks the terrace with a lantern, stops at the diyas
    const w = stroll(t, 96, 132, 6, 0.2, 3), p = w.walking ? Object.assign(w.pose, { aF: 0.35 + Math.sin(t * 5) * 0.1, eF: -0.2 }) : { aF: 0.9, eF: -0.5, aB: 0.2, eB: -0.2, lean: 0.25, hx: 0.3 };
    D.lay('mid'); worker(D, w.x, FY, TAJ_LOOK, p, w.dir);
    if (X.noWorkers) return; const [hx, hy, hdx, shY] = handAt(w.x, FY, p, w.dir);
    D.beg(); D.rect(hdx - 3, shY - 7, 6, 2, 'lamp', 5.5); D.hl(hdx - 2, shY - 8, 4, 'lamp', 7); D.px(hdx + (w.dir > 0 ? -3 : 2), shY - 5, 'lamp', 4.5); D.px(hdx + (w.dir > 0 ? -4 : 3), shY - 4, 'lamp', 4); D.end();
    const lx = hx + (w.dir > 0 ? 1 : 0), ly = hy + 3, sw = Math.round(Math.sin(t * 3.1) * (w.walking ? 1 : 0));
    D.vl(lx, hy + 1, 2, 'iron', 5); D.beg(); D.rect(lx - 1 + sw, ly, 3, 4, 'lamp', 9, { e: 255 }); D.px(lx + sw, ly + 1, 'lamp', 11, { e: 255 }); D.hl(lx - 1 + sw, ly - 1, 3, 'iron', 6); D.hl(lx - 1 + sw, ly + 4, 3, 'iron', 4); D.end({ none: 1 });
    rs.dl.push({ x: lx + sw, y: ly + 2, z: 18, r: 20, i: 0.55, rgb: [255, 190, 110], tint: 0.4 });
  },
});

// ───────── 大本钟 bigben (steam · store, rare) ─────────
// the clock tower on a foggy Westminster night: no moon, no stars; fog banks drift across, the clock face glows through
// them in a hard-edged halo, the minute hand sweeps round, the bell hangs in its arcade; Parliament's lit windows and
// pinnacles, two gas lamps with halos of lit fog, a costermonger's barrow, a constable on his beat; now and then a fine
// drizzle. At the top of each turn the bell tolls: the face flares, rings of sound roll out, the pigeons scatter and return
const BB = { cx: 100, fy: 36, fr: 8, per: 12 };
const BB_BIRDS = [[93, 26, -1], [96, 26, -1], [104, 26, 1], [107, 26, 1], [90, 45, -1]];
// a London fog night: no moon, no stars. Fog banks drift across at three heights as a hard two-step veil (core and rim),
// each lamp wears a hard-edged halo of lit fog (rings, brighter inward, breathing with its flame), and now and then a
// fine drizzle comes down, streaks catching the lamplight, rings opening on the puddle
const BB_FOG = [{ y: 13, h: 5, amp: 3, sp: 2.2, s: 3, a: 0.18 }, { y: 55, h: 8, amp: 4, sp: -3.2, s: 7, a: 0.26 }, { y: 80, h: 7, amp: 3, sp: 2.5, s: 11, a: 0.24 }];
const BB_FOGC = [133, 125, 151], BB_LAMPC = [255, 192, 112], BB_FACEC = [255, 226, 160];
const BB_LAMP2 = { x: 118, y: 57 };
function bbFog(out, t) {
  BB_FOG.forEach(f => { for (let x = 4; x < W - 4; x++) { const u = (x + t * f.sp) * 0.045, n = X.vnoise(u, f.s, f.s); if (n < 0.3) continue;
    const n2 = X.vnoise(u * 1.7 + 3, f.s + 2, f.s), top = Math.round(f.y - f.amp * (n - 0.3) * 2.2), bot = Math.round(f.y + f.h * (0.35 + n2 * 0.8));
    for (let y = Math.max(4, top); y <= Math.min(H - 5, bot); y++) X.blendPx(out, y * W + x, BB_FOGC, y - top < 2 || bot - y < 1 || n < 0.36 ? f.a * 0.5 : f.a); } });
}
// rings [[radius, strength], …] outer → inner; k scales them all (the flame's flicker), in sixteenths so the edges stay hard
function bbHalo(out, cx, cy, rings, c, k, hole) {
  const R = rings[0][0]; for (let y = Math.max(4, Math.floor(cy - R)); y <= Math.min(H - 5, Math.ceil(cy + R)); y++) for (let x = Math.max(4, Math.floor(cx - R)); x <= Math.min(W - 5, Math.ceil(cx + R)); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > R || (hole && d < hole)) continue; let a = 0; for (let i = 0; i < rings.length; i++) if (d <= rings[i][0]) a = rings[i][1];
    const aq = Math.round(a * k * 16) / 16; if (aq > 0) X.addPx(out, y * W + x, c, aq); }
}
const BB_RAIN = []; { const r = X.rng(23); for (let i = 0; i < 46; i++) BB_RAIN.push([r(), r(), i % 2]); }   // [x phase, y phase, near]
const bbRainK = (t) => { const q = steps(t, 23); return q < 0.05 ? q / 0.05 : q < 0.3 ? 1 : q < 0.36 ? 1 - (q - 0.3) / 0.06 : 0; };
function bbRain(D, t, k) {
  const n = Math.round(BB_RAIN.length * k), near = (x, y) => Math.hypot(x - 24, y - 43) < 15 || Math.hypot(x - BB_LAMP2.x, y - BB_LAMP2.y) < 10 || Math.hypot(x - BB.cx, y - BB.fy) < 14;
  for (let i = 0; i < n; i++) { const [px, py, nr] = BB_RAIN[i], vy = nr ? 96 : 68, gy = nr ? FY + 6 + (i % 7) : FY, span = gy - 5, y = 5 + ((py * span + t * vy) % span), x = 4 + ((px * 142 - y * 0.25) % 142 + 142) % 142;
    D.lay(nr ? 'front' : 'mid'); for (let j = 0; j < (nr ? 4 : 3); j++) { const xx = Math.round(x + j * 0.3), yy = Math.round(y - j), lit = near(xx, yy); D.px(xx, yy, lit ? 'lamp' : 'glass', lit ? 9 - (j >> 1) : (nr ? 7 : 6) - (j >> 1), GLOW); } }
  // rings open on the wet street and the puddle
  D.lay('wall'); for (let i = 0; i < Math.round(9 * k); i++) { const c = t * 2.2 + i * 0.41, sl = Math.floor(c), ph = c - sl, r2 = X.rng(sl * 17 + i * 101 + 1), x = Math.round(8 + r2() * 134), y = Math.round(FY + 3 + r2() * 10), rr = 1 + Math.floor(ph * 2.4), tn = ph < 0.5 ? 8 : 6;
    D.px(x - rr, y, 'glass', tn, GLOW); D.px(x + rr, y, 'glass', tn, GLOW); if (rr > 1) { D.px(x - rr + 1, y - 1, 'glass', tn - 1, GLOW); D.px(x + rr - 1, y - 1, 'glass', tn - 1, GLOW); } else D.px(x, y - 1, 'glass', 9, GLOW); }
}
const BB_LOOK = { skin: ['skin', 6], hair: ['hair', 3], top: ['denim', 2.5], bot: ['denim', 1.8], boot: ['hair', 1] };
X.def('bigben', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 66, far: 'city', floor: 'stone' });
    S.lay('wall'); S.vgrad(0, 0, W, 55, 'stone', 1.4, 3.9, GLOW);                                                         // fog hides the stars: a murky haze, paler toward the town
    sc.light({ x: 75, y: 30, z: 70, r: 260, i: 0.35, c: '#c0b0d8', tint: 0.08 });                                          // 0 the fog's own glow
    sc.light({ x: BB.cx, y: BB.fy, z: 22, r: 60, i: 0.75, c: '#ffe2a0', fl: 'pulse', amp: 0.04, sp: 1.3, tint: 0.3 });  // 1 clock face
    sc.light({ x: 24, y: 43, z: 30, r: 62, i: 1.05, c: '#ffc070', fl: 'candle', tint: 0.5 });                              // 2 gas lamp
    sc.light({ x: 44, y: 70, z: 12, r: 58, i: 0.45, c: '#ffb060', fl: 'candle', ph: 3, tint: 0.3 });                       // 3 Parliament windows
    sc.light({ x: 100, y: 92, z: 20, r: 64, i: 0.55, c: '#ffcc88', tint: 0.3 });                                           // 4 floodlight at the tower's foot
    sc.light({ x: BB_LAMP2.x, y: BB_LAMP2.y, z: 16, r: 40, i: 0.8, c: '#ffc070', fl: 'candle', ph: 3.3, tint: 0.45 });   // 5 the far gas lamp
    const st = 'sand';
    // street: kerb, pavement, cobbles; the lamp and the clock face shine in the wet
    S.lay('wall'); S.rect(0, FY, W, 3, 'stone', 6); S.hl(0, FY, W, 'stone', 8, { n: [0, -0.9] });
    TX.ashlar(S, 0, FY + 3, W, H - FY - 3, 'stone', 4.5, { bh: 3, bw: 6, crack: 0.05 });
    for (let x = 80; x < 128; x++) { const u = (x - 104) / 22.5; if (Math.abs(u) >= 1) continue; const h = 4.6 * Math.sqrt(1 - u * u); S.px(x, Math.round(FY + 7 - h), 'stone', 2.5); S.px(x, Math.round(FY + 7 + h), 'stone', 6.5); }   // the puddle's rim
    [[24, 5, 'lamp', 3], [136, 3, 'red', 255]].forEach(([x, w, m, e]) => { for (let y = FY + 4; y < H - 3; y += 2) { const ww = Math.max(1, w - ((y * 3) % 4)); S.hl(x - (ww >> 1) + ((y * 5) % 3) - 1, y, ww, m, (m === 'red' ? 4.5 : 7.4) - (y - FY) * 0.22, { e }); } });
    // Parliament: slate roof, pinnacles, buttresses, three floors of pointed windows (some lit), railings
    const ps = 'mstone';
    const parl = (x0, x1, top) => {
      S.beg(); S.poly([[x0, top], [x1, top], [x1 - 4, top - 6], [x0 + 4, top - 6]], 'iron', 2.4); S.hl(x0 + 4, top - 6, x1 - x0 - 8, 'iron', 4.6, { n: [0, -0.8] });
      for (let x = x0 + 8; x < x1 - 6; x += 12) { S.rect(x, top - 9, 3, 4, 'iron', 3.2); S.px(x + 1, top - 10, 'iron', 4.4); S.px(x + 1, top - 7, 'lamp', 6, { e: 4 }); }   // dormers
      S.box(x0, top, x1 - x0, FY - top, ps, 5); S.hl(x0, top, x1 - x0, ps, 7.4, { n: [0, -0.8] });
      S.hl(x0, top + 12, x1 - x0, ps, 7, { n: [0, -0.7] }); S.hl(x0, top + 13, x1 - x0, ps, 3.4);
      const r = X.rng(x0 * 7 + 3);
      for (let x = x0 + 2; x < x1 - 1; x += 12) { S.rect(x, top, 2, FY - top - 4, ps, 6.2, { n: [-0.5, 0] }); S.vl(x + 2, top + 1, FY - top - 5, ps, 3.8); S.rect(x, top - 7, 2, 7, ps, 6.4); S.vl(x + 1, top - 7, 7, ps, 4.2); S.px(x, top - 8, ps, 7.4); S.px(x, top - 9, 'gold', 7.5); }
      for (let x = x0 + 5; x < x1 - 4; x += 12) [top + 3, top + 16].forEach((y) => { if (y + 8 > FY - 4) return; [0, 5].forEach(dx => { const lit = r() < 0.6; parch(S, x + dx, x + dx + 2, y, y + 2, y + 8, lit ? 'lamp' : 'night', lit ? 6 + Math.round(r()) : 2, lit ? { e: 4 } : { e: 255 }); if (lit) { S.vl(x + dx + 1, y + 2, 7, 'lamp', 5, { e: 4 }); S.px(x + dx, y + 3, 'lamp', 8, { e: 4 }); } }); });
      S.rect(x0, FY - 4, x1 - x0, 4, ps, 3.6); S.hl(x0, FY - 4, x1 - x0, ps, 5.5); S.end();
    };
    S.lay('back');
    // the central tower of the palace: an octagonal lantern and spire over the roofs
    S.beg(); S.box(40, 42, 11, 20, 'mstone', 5); S.rect(40, 42, 2, 20, 'mstone', 6.5); S.rect(49, 42, 2, 20, 'mstone', 3.5); for (let y = 45; y < 58; y += 6) { parch(S, 43, 44, y, y + 1, y + 4, 'lamp', 7, { e: 4 }); parch(S, 46, 47, y, y + 1, y + 4, 'lamp', 5, { e: 4 }); }
    for (let y = 30; y < 42; y++) { const hw = Math.round((y - 30) * 0.45); for (let x = 45 - hw; x <= 45 + hw; x++) S.px(x, y, 'mstone', x < 45 ? 6 : 4); } S.px(45, 29, 'gold', 8); [40, 50].forEach(x => { S.vl(x, 37, 5, 'mstone', 6); S.px(x, 36, 'gold', 7); }); S.end();
    parl(3, 90, 60); parl(110, 147, 66);
    [[19, 55], [66, 55], [128, 61]].forEach(([x, y]) => { S.beg(); S.box(x, y - 5, 3, 5, 'brick', 4.5); S.hl(x - 1, y - 6, 5, 'brick', 5.5); S.end(); });
    // the tower: shaft, clock stage, belfry arcade, slate spire with gilded pinnacles
    const cx = BB.cx; S.beg();
    S.box(cx - 8, 45, 17, FY - 45, st, 6); for (let x = cx - 6; x <= cx + 6; x += 4) { S.vl(x, 46, FY - 47, st, 7.4, { n: [-0.5, 0] }); S.vl(x + 1, 46, FY - 47, st, 4.6); }
    for (let y = 50; y < 84; y += 9) for (let x = cx - 5; x <= cx + 3; x += 4) parch(S, x, x + 1, y, y + 1, y + 4, 'night', 2, { e: 255 });
    [56, 74].forEach(y => { S.hl(cx - 9, y, 19, st, 7.8, { n: [0, -0.8] }); S.hl(cx - 9, y + 1, 19, st, 3.8); });
    S.box(cx - 10, 26, 21, 19, st, 5.2); S.hl(cx - 11, 26, 23, st, 8, { n: [0, -0.8] }); S.hl(cx - 11, 45, 23, st, 3.6);
    S.rect(cx - 10, 27, 1, 18, st, 7.8); S.rect(cx + 10, 27, 1, 18, st, 4.5);
    [[cx - 9, 27], [cx + 7, 27], [cx - 9, 42], [cx + 7, 42]].forEach(([x, y]) => { S.rect(x, y, 3, 3, 'gold', 6.5); S.px(x + 1, y + 1, 'gold', 9); });
    S.ell(cx, BB.fy, BB.fr + 2.4, BB.fr + 2.4, 'iron', 2.5, { ring: 1.2 }); S.ell(cx, BB.fy, BB.fr + 1.4, BB.fr + 1.4, 'gold', 6.5, { ring: 1.2 });
    S.ell(cx, BB.fy, BB.fr, BB.fr, 'lamp', 8, { e: 2 }); S.ell(cx, BB.fy, BB.fr - 3, BB.fr - 3, 'lamp', 9, { e: 2 });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = cx + Math.cos(a) * (BB.fr - 1.2), y = BB.fy + Math.sin(a) * (BB.fr - 1.2); S.px(x, y, 'lamp', 4, { e: 2 }); }
    for (let k = 0; k < 12; k++) { const a = (k + 0.5) / 12 * Math.PI * 2; S.px(cx + Math.cos(a) * 4, BB.fy + Math.sin(a) * 4, 'lamp', 7, { e: 2 }); }
    // belfry: an arcade of three pointed openings with the bell inside, a gallery rail
    S.box(cx - 9, 17, 19, 9, st, 6); S.hl(cx - 10, 25, 21, st, 7.6);
    [cx - 7, cx - 1, cx + 5].forEach(x => { parch(S, x, x + 2, 18, 20, 24, 'ink', 1.4); });
    for (let x = cx - 9; x <= cx + 9; x += 2) S.px(x, 16, st, 7.2);
    // the spire: slate faces, gilded ribs, little dormers
    for (let y = 7; y < 16; y++) { const hw = Math.round(1 + (y - 7) * 0.85); for (let x = cx - hw; x <= cx + hw; x++) S.px(x, y, 'iron', x < cx ? 5 : 3.2, { n: [x < cx ? -0.5 : 0.5, -0.3] }); S.px(cx - hw, y, 'gold', 6.5); S.px(cx + hw, y, 'gold', 5); }
    S.vl(cx, 7, 9, 'gold', 7); [10, 13].forEach(y => { S.px(cx - 2, y, 'lamp', 6, { e: 2 }); S.px(cx + 2, y, 'lamp', 5, { e: 2 }); });
    S.vl(cx, 4, 3, 'gold', 8); S.px(cx - 1, 5, 'gold', 7); S.px(cx + 1, 5, 'gold', 6);
    [cx - 9, cx + 9].forEach(x => { S.vl(x, 10, 6, st, 6.5); S.px(x, 9, 'gold', 8); });
    S.end();
    // costermonger's barrow of crates, sacks and apples (the wares the tower brings in)
    S.lay('mid'); S.beg(); S.box(38, 76, 26, 6, 'wood', 5.5, { top: 1 }); S.hl(38, 79, 26, 'wood', 3.5); S.line(64, 78, 72, 82, 'wood', 5); S.line(40, 82, 40, 89, 'wood', 4); S.ell(56, 85, 4.5, 4.5, 'wood', 4.5, { ring: 1.2 }); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; S.line(56 - Math.cos(a) * 3, 85 - Math.sin(a) * 3, 56 + Math.cos(a) * 3, 85 + Math.sin(a) * 3, 'wood', 3.5); } S.rect(55, 84, 2, 2, 'iron', 6);
    S.box(40, 68, 9, 8, 'wood', 6, { top: 1 }); S.line(41, 69, 47, 74, 'wood', 4.5); S.box(50, 70, 8, 6, 'wood', 5, { top: 1 });
    S.ell(60, 72, 3.5, 4, 'sand', 6.5, { dome: 1 }); S.px(60, 68, 'leather', 4);
    for (let i = 0; i < 6; i++) S.ell(52 + (i % 3) * 2.5, 69 - Math.floor(i / 3) * 1.6, 1.2, 1.1, 'red', 7 + (i % 2), { dome: 1 });
    S.end();
    // a second gas lamp further down the street, smaller in the fog
    { const lx = BB_LAMP2.x; S.beg(); S.box(lx - 2, 86, 5, 4, 'iron', 4, { top: 1 }); S.cyl(lx - 1, 63, 2, 23, 'iron', 4.5, { rim: 1 }); S.hl(lx - 3, 63, 7, 'iron', 5.5);
      S.poly([[lx - 3, 53], [lx + 4, 53], [lx + 3, 61], [lx - 2, 61]], 'glass', 3); S.rect(lx - 3, 52, 7, 1, 'iron', 5); S.poly([[lx - 2, 52], [lx + 3, 52], [lx + 1, 49], [lx, 49]], 'iron', 5.5); S.px(lx, 48, 'brass', 8);
      S.rect(lx - 2, 61, 5, 2, 'brass', 6); S.vl(lx - 3, 53, 8, 'iron', 4); S.vl(lx + 3, 53, 8, 'iron', 3); S.end(); }
    // near the eye: the gas lamp, the red pillar box, a railing end
    S.lay('front');
    S.beg(); S.box(21, 84, 7, 6, 'iron', 4, { top: 1 }); S.rect(22, 80, 5, 4, 'iron', 5); S.cyl(23, 50, 3, 30, 'iron', 4.5, { rim: 1.2 }); S.hl(18, 52, 13, 'iron', 5.5); S.px(18, 53, 'iron', 4); S.px(30, 53, 'iron', 3);
    S.poly([[19, 38], [30, 38], [28, 48], [21, 48]], 'glass', 3); S.rect(19, 36, 12, 2, 'iron', 5); S.poly([[21, 36], [28, 36], [25, 32], [24, 32]], 'iron', 5.5); S.px(24, 31, 'brass', 8);
    S.rect(21, 48, 7, 2, 'brass', 6); S.vl(24, 39, 9, 'iron', 3); S.vl(20, 38, 10, 'iron', 4); S.vl(29, 38, 10, 'iron', 3); S.end();
    S.beg(); S.cyl(131, 70, 10, 20, 'red', 5.5, { rim: 1.6 }); S.hcyl(130, 67, 12, 3, 'red', 6.5, { rim: 1 }); S.ell(136, 66, 5, 1.6, 'red', 7, { n: [0, -0.8] }); S.hl(132, 75, 8, 'ink', 1); S.rect(134, 79, 4, 3, 'gold', 7); S.hcyl(130, 88, 12, 2, 'red', 3.5); S.px(135, 69, 'gold', 9); S.end();
  },
  post(out, t, s, o, I) {
    bbFog(out, t);
    bbHalo(out, BB.cx + 0.5, BB.fy + 0.5, [[19, 0.05], [15, 0.09], [12, 0.14]], BB_FACEC, (I[1] || 0.75) / 0.75, 10.8);    // the clock face glows through the fog
    bbHalo(out, 24.5, 43.5, [[15, 0.06], [10.5, 0.11], [6.5, 0.18]], BB_LAMPC, (I[2] || 1.05) / 1.05);
    bbHalo(out, BB_LAMP2.x + 0.5, BB_LAMP2.y + 0.5, [[9.5, 0.06], [6, 0.12]], BB_LAMPC, (I[5] || 0.8) / 0.8);
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, BB.per), cx = BB.cx;
    // a puddle in the street holds the tower upside down
    reflect(D, rs, t, { y0: FY + 4, y1: FY + 11, ym: FY, sq: 6.4, x0: 82, x1: 126, dim: 0.7, mask: (x, y) => { const u = (x - 104) / 21, v = (y - FY - 7) / 3.9; return u * u + v * v < 1; } });
    // coal smoke curls from the chimney pots
    D.lay('back'); [[20, 48, 0], [67, 48, 0.4], [129, 54, 0.7]].forEach(([cx, cy, ph]) => { for (let k = 0; k < 4; k++) { const a = (t * 0.32 + ph + k / 4) % 1, x = cx + a * 12 + Math.sin(a * 5 + k) * 1.2, y = cy - a * 16, rr = 0.8 + a * 2.2, tn = Math.round(5.6 - a * 2.6);
      for (let yy = -Math.ceil(rr); yy <= Math.ceil(rr); yy++) for (let xx = -Math.ceil(rr); xx <= Math.ceil(rr); xx++) if (xx * xx + yy * yy <= rr * rr) D.px(x + xx, y + yy, 'stone', tn + (xx + yy < -rr * 0.6 ? 1 : 0), { e: 255 }); } });
    // clock hands: the minute hand sweeps round each turn; the hour hand creeps
    D.lay('back'); const ma = q * Math.PI * 2 - Math.PI / 2, ha = (9.2 + q) / 12 * Math.PI * 2 - Math.PI / 2;
    D.line(cx, BB.fy, cx + Math.cos(ha) * 4, BB.fy + Math.sin(ha) * 4, 'ink', 1, { e: 255 }); D.line(cx, BB.fy, cx + Math.cos(ma) * 6.4, BB.fy + Math.sin(ma) * 6.4, 'ink', 1, { e: 255 }); D.px(cx, BB.fy, 'gold', 9, { e: 255 });
    // the bell: hangs still, swings when it tolls
    const tk = q < 0.12 ? q / 0.12 : 0, sw = Math.round(Math.sin(tk * Math.PI * 3) * 2 * (1 - tk)), bx = cx;
    D.beg(); for (let y = 0; y < 5; y++) { const hw = [1, 1.6, 2, 2.4, 3][y], dx = Math.round(sw * y / 4); for (let x = -Math.round(hw); x <= Math.round(hw); x++) D.px(bx + x + dx, 19 + y, 'brass', 7 - (x > 0 ? 1.5 : 0) + (y === 0 ? 1 : 0)); } D.px(bx + sw, 24, 'brass', 4); D.end({ none: 1 });
    if (q < 0.03 && !st.toll) { st.toll = 1; rs.flash(1, 1.6); rs.flash(4, 0.4); rs.burst('glint', cx, BB.fy, 5, { sp: 26, life: 0.6 }); } if (q > 0.5) st.toll = 0;
    // arcs of sound roll out either side of the belfry
    for (let r = 0; r < 3; r++) { const k = (q - r * 0.045) / 0.2; if (k <= 0 || k >= 1) continue; const rad = 12 + k * 20, tn = Math.round(10.5 - k * 5);
      for (let a = -0.62; a <= 0.62; a += 0.9 / rad) { const x = Math.cos(a) * rad, y = 21 + Math.sin(a) * rad; D.px(cx + x, y, 'lamp', tn, { e: 255 }); D.px(cx - x, y, 'lamp', tn, { e: 255 }); } }
    // pigeons: sit on the ledges, burst away at the toll, drift back one by one
    D.lay('mid'); BB_BIRDS.forEach(([px, py, dir], i) => { const out = clamp(q / 0.3, 0, 1), back = clamp((q - 0.55 - i * 0.05) / 0.2, 0, 1), k = back > 0 ? 1 - back : out;
      const ex = px + dir * (40 + i * 9), ey = py - 30 - i * 4, x = px + (ex - px) * k, y = py + (ey - py) * k - Math.sin(k * Math.PI) * 6, fl = k > 0.01 && k < 0.99, wg = fl ? Math.sin(t * 22 + i) > 0 : 0;
      D.hl(x - 1, y, 3, 'stone', 9, { e: 255 }); D.px(x + dir * 2, y - 1, 'stone', 10, { e: 255 }); D.px(x + dir * 3, y - 1, 'gold', 7, { e: 255 });
      if (fl) { D.px(x - 1, y - 1 - (wg ? 1 : 0), 'linen', 9, { e: 255 }); D.px(x, y - 1 - (wg ? 2 : 0), 'linen', 10, { e: 255 }); D.px(x + 1, y - (wg ? 2 : 0), 'linen', 8, { e: 255 }); D.px(x, y + 1, 'stone', 6, { e: 255 }); } else { D.px(x, y - 1, 'stone', 8, { e: 255 }); D.px(x - dir * 2, y + 1, 'stone', 6, { e: 255 }); } });
    // the constable walks his beat; when the bell tolls he checks his watch
    const w = stroll(t, 64, 88, 5, 0.7, 2.5), look = q < 0.2;
    const p = look ? { aF: 1.4, eF: -1.9, aB: 0.1, eB: -0.1, lean: 0.1 } : w.walking ? w.pose : { aF: -0.2, eF: -0.4, aB: 0.2, eB: -0.3 };
    // the gas mantle breathes
    D.lay('front'); D.rect(22, 41, 5, 5, 'lamp', 9, { e: 3 }); D.rect(23, 42, 3, 3, 'lamp', 10, { e: 3 }); D.px(24, 42, 'lamp', 11, { e: 255 });
    D.lay('mid'); D.rect(BB_LAMP2.x - 1, 54, 3, 5, 'lamp', 9, { e: 6 }); D.rect(BB_LAMP2.x, 55, 1, 3, 'lamp', 10, { e: 6 }); D.px(BB_LAMP2.x, 56, 'lamp', 11, GLOW);
    // drizzle, now and then
    const rk = bbRainK(t); if (rk > 0) bbRain(D, t, rk);
    D.lay('mid'); worker(D, w.x, FY, BB_LOOK, p, w.dir);
    if (X.noWorkers) return; const [hx, hy, hdx, shY] = handAt(w.x, FY, p, w.dir);
    D.beg(); D.rect(hdx - 3, shY - 10, 6, 5, 'denim', 2.2); D.hl(hdx - 2, shY - 11, 4, 'denim', 3); D.hl(hdx - 4, shY - 5, 8, 'denim', 1.6); D.px(hdx, shY - 9, 'gold', 8); D.end();
    if (look) { D.rect(hx, hy - 1, 2, 2, 'gold', 8); D.px(hx, hy - 1, 'linen', 10); }
    D.px(hx - w.dir * 2, shY + 6, 'gold', 7);
  },
});

// ───────── 自由女神像 liberty (water · luck, epic) ─────────
// seen from the rail of a ferry at daybreak: a pastel sky (night blue, lilac, pink, a gold rim), the sun half out of the sea
// between the island and Manhattan; the copper-green goddess on her granite pedestal and star fort, rimmed on her sunward
// side, her torch burning; the torch is a beacon whose beam turns over the harbour (a glare each time it faces us), pink-lit
// clouds drift, gulls wheel round her, a steamer crosses the sun, a sailor at the rail watches through his spyglass
const LB = { tx: 55, ty: 11, per: 10, sx: 99, sy: 66, sr: 6, wx: 129 };   // torch; the beacon's turn; the sun coming up behind Manhattan
const LB_LOOK = { skin: ['skin', 6], hair: ['hair', 4], top: ['linen', 8.5], bot: ['denim', 3], boot: ['hair', 2], cap: ['linen', 9] };
function lbBeam(t) { const ph = steps(t, LB.per) * Math.PI * 2; return { c: Math.cos(ph), s: Math.sin(ph), ph }; }   // s > 0: turned toward us
// daybreak over the harbour: night blue overhead, lilac, pink, a gold rim on the sea, the sun's disc half out of the water
// behind the towers (hard bands; the sea takes the sky's colours)
function lbDawn(S, sc) {
  S.lay('wall');
  [[0, 16, 'night', 3.2, 5.2], [16, 31, 'lav', 5.4, 8.2], [31, 43, 'lav', 8.6, 10.2], [43, 54, 'candy', 7.8, 9.2], [54, 66, 'dusk', 9.4, 10.2]].forEach(([y0, y1, m, a, b]) => S.vgrad(0, y0, W, y1 - y0, m, a, b, GLOW));
  // the glow round the sun: hard-edged ellipses, brighter inward
  [[46, 15, 'dusk', 10.6], [28, 10, 'dusk', 11], [15, 6, 'lamp', 10]].forEach(([rx, ry, m, tn]) => S.ell(LB.sx, LB.sy, rx, ry, m, tn, GLOW));
  S.ell(LB.sx, LB.sy, LB.sr, LB.sr, 'lamp', 11, GLOW);
  S.hl(LB.sx - 13, LB.sy - 4, 17, 'dusk', 7, GLOW); S.hl(LB.sx - 9, LB.sy - 4, 5, 'dusk', 8, GLOW); S.hl(LB.sx - 3, LB.sy - 2, 16, 'dusk', 8, GLOW);   // thin strata across the disc, backlit
  // the last stars and the morning star
  const r = X.rng(5); for (let i = 0; i < 9; i++) S.px(4 + r() * 142, 4 + r() * 12, 'linen', 6 + Math.round(r() * 2), GLOW);
  S.px(24, 11, 'linen', 11, GLOW); [[23, 11], [25, 11], [24, 10], [24, 12]].forEach(([x, y]) => S.px(x, y, 'lav', 9, GLOW));
  // the sea: bright where it meets the sky, darker toward us, the sun's road of light across it
  S.vgrad(0, 66, W, 4, 'lav', 7.6, 6.4, GLOW); S.vgrad(0, 70, W, FY - 70, 'lav', 6, 3.6, GLOW); S.hl(0, 66, W, 'dusk', 10, GLOW);
  for (let y = 67; y < 82; y++) { const k = (y - 66) / 15, hw = 2 + k * 7, r2 = X.rng(y * 13); for (let x = Math.round(LB.sx - hw); x <= Math.round(LB.sx + hw);) { const len = 2 + Math.floor(r2() * 4); if (r2() < 0.62 - k * 0.2) S.hl(x, y, Math.min(len, Math.round(LB.sx + hw) - x + 1), 'dusk', Math.abs(x + len / 2 - LB.sx) < hw * 0.45 ? 10 : 9, GLOW); x += len + 1; } }
  sc.light({ x: LB.sx, y: LB.sy - 4, z: 70, r: 300, i: 0.65, c: '#ffc890', tint: 0.25 });                           // 0 the sun
}
// clouds lit from below by the rising sun: violet bodies, pink-and-gold undersides; they drift
const LB_CLOUD = [[70, 20, 46, 0.5], [0, 31, 38, 0.8], [96, 40, 30, 0.35]];   // all above the towers' tops
function lbClouds(D, t) {
  LB_CLOUD.forEach(([x0, y, w, sp], ci) => { const x = ((x0 + t * sp) % (W + w)) - w / 2, near = Math.abs(x + w / 2 - LB.sx) < 40;
    for (let k = 0; k < w; k++) { const u = k / (w - 1), hh = Math.round(1 + 2.2 * Math.sin(Math.PI * u) + ((k + ci * 3) % 9 < 4 ? 0.6 : 0)), xx = x + k; if (xx < 3 || xx > W - 4) continue;
      for (let j = 0; j < hh; j++) D.px(xx, y - j, 'lav', j === hh - 1 ? 7 : 6, GLOW);
      D.px(xx, y + 1, near ? 'dusk' : 'candy', near ? 10 : 9, GLOW); } });
}
// glitter on the dawn sea: rolling dashes, gold on the sun's road and pink elsewhere
function lbSea(D, t) {
  for (let y = 67; y < 82; y++) { const k = (y - 66) / 15, hw = 3 + k * 9;
    for (let x = 3; x < W - 3; x++) { const w = Math.sin(x * 0.45 - t * 1.6 + y * 1.3) + Math.sin(x * 0.17 + t * 0.9 - y * 0.7); if (w < 1.35) continue;
      const road = Math.abs(x - LB.sx) < hw; D.px(x, y, road ? 'dusk' : 'candy', road ? 11 : Math.round(8 - k * 1.5), GLOW); } }
}
X.def('liberty', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    lbDawn(S, sc);                                                                                                     // 0 the sun
    sc.light({ x: LB.tx, y: LB.ty, z: 12, r: 86, i: 1.05, c: '#ffb040', fl: 'fire', tint: 0.5 });                     // 1 torch
    sc.light({ x: 70, y: 52, z: 20, r: 44, i: 0.6, c: '#c8f0ff', tint: 0.3 });                                         // 2 floodlights on the pedestal
    sc.light({ x: 139, y: 60, z: 34, r: 50, i: 0.85, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.5 });                // 3 ferry lantern
    // Manhattan on the horizon: dark towers against the sunrise, a gold rim along their tops, the last windows still lit
    S.lay('wall'); const r = X.rng(41);
    for (let x = 107; x < 147;) { const bw = 3 + Math.floor(r() * 5), bh = 4 + Math.floor(r() * 12) + (x > 118 && x < 126 ? 8 : 0); S.rect(x, 66 - bh, bw, bh, 'dusk', 2, GLOW); S.hl(x, 66 - bh, bw, 'dusk', 8, GLOW); S.vl(x + bw - 1, 67 - bh, bh - 1, 'dusk', 3, GLOW);
      for (let k = 0; k < bw * bh / 14; k++) S.px(x + Math.floor(r() * (bw - 1)), 68 - bh + Math.floor(r() * (bh - 2)), 'lamp', 7 + Math.round(r() * 2), GLOW); x += bw + (r() < 0.3 ? 1 : 0); }
    S.px(122, 49, 'red', 8, GLOW);
    // deck of the ferry (the floor rows)
    TX.planks(S, 0, FY, W, H - FY, 'wood', 5, { ph: 3, pw: 34 }); S.hl(0, FY, W, 'wood', 7, { n: [0, -0.9] });
    // the island: rocks at the waterline, dark trees round the fort
    S.lay('back'); S.beg(); for (let x = 26; x < 108; x++) { const h = 2 + Math.round(1.5 + Math.sin(x * 0.7) * 1 + Math.sin(x * 0.23) * 1.2); S.vl(x, 79 - h, h, 'rock', 6 - (x % 3 === 0 ? 1 : 0)); S.px(x, 79 - h, 'rock', 8); }
    for (let i = 0; i < 18; i++) { const x = 30 + i * 4.3 + (i % 2) * 2, y = 73 + (i % 3); S.ell(x, y, 3.5, 3, 'leaf', 3 + (i % 3) * 0.6, { dome: 1 }); S.px(x - 1, y - 2, 'leaf', 5); } S.end();
    // star fort: low granite walls whose angled bastions catch light on one face and fall into shade on the other
    S.beg(); S.box(38, 69, 57, 6, 'stone', 5, { top: 1 }); for (let x = 40, k = 0; x < 92; x += 9, k++) { S.poly([[x, 75], [x + 4, 68], [x + 5, 68], [x + 5, 75]], 'stone', 6.8, { n: [-0.6, 0] }); S.poly([[x + 5, 75], [x + 5, 68], [x + 6, 68], [x + 9, 75]], 'stone', 3.8, { n: [0.6, 0] }); } S.hl(38, 74, 57, 'stone', 3); S.end();
    // pedestal: stepped granite, the loggia near the top, a cornice, the floodlights at its foot
    const g = 'stone'; S.beg();
    S.box(50, 64, 33, 5, g, 6, { top: 1 }); S.box(54, 58, 25, 6, g, 6.6); S.box(52, 56, 29, 2, g, 7.6); S.box(55, 54, 23, 2, g, 7);
    S.rect(54, 58, 3, 6, g, 7.6, { n: [-0.6, 0] }); S.rect(76, 58, 3, 6, g, 4.6, { n: [0.6, 0] }); S.rect(50, 64, 3, 5, g, 7.2, { n: [-0.6, 0] }); S.rect(80, 64, 3, 5, g, 4.2, { n: [0.6, 0] });
    for (let x = 58; x < 75; x += 3) { S.rect(x, 59, 2, 3, 'ink', 1.5); S.px(x + 2, 59, g, 8); } S.hl(57, 62, 19, g, 8, { n: [0, -0.7] }); S.hl(57, 63, 19, g, 4);
    for (let x = 57; x < 76; x += 4) { S.px(x, 65, g, 8.4); S.px(x + 1, 66, g, 4); }
    S.rect(58, 67, 3, 2, 'linen', 9, { e: 3 }); S.rect(72, 67, 3, 2, 'linen', 9, { e: 3 });
    S.end();
    // the goddess: robe with deep folds, a stola across the chest, the tablet on her left arm, the crown's rays,
    // the right arm raised with the torch (flame is animated)
    const tl = 'teal'; S.dy = 4; S.beg();
    S.poly([[59, 24], [73, 24], [77, 50], [55, 50]], tl, 5);
    for (let x = 59; x < 76; x += 3) { S.line(x, 28, x - 2, 49, tl, 3.6); S.line(x + 1, 28, x - 1, 49, tl, 6.6); }
    S.poly([[59, 24], [65, 24], [75, 38], [72, 41]], tl, 6.4); S.line(59, 24, 73, 40, tl, 7.8); S.line(60, 26, 72, 42, tl, 3.8);
    S.hl(55, 49, 22, tl, 4); S.hl(56, 50, 21, tl, 3); S.px(62, 51, tl, 3); S.px(69, 51, tl, 3);
    S.poly([[71, 27], [78, 26], [79, 40], [72, 41]], tl, 6.4); S.line(71, 27, 78, 26, tl, 8.2); S.vl(79, 27, 13, tl, 3.5); S.hl(73, 30, 5, tl, 4.6); S.hl(73, 33, 5, tl, 4.6);
    S.line(74, 26, 71, 34, tl, 5.5, { w: 2 });
    S.rect(64, 21, 3, 4, tl, 5); S.ell(65.5, 18, 3, 3.6, tl, 6.4, { dome: 1 }); S.px(64, 18, tl, 3.5); S.px(67, 18, tl, 3.5); S.px(65, 20, tl, 4.5); S.px(66, 20, tl, 4.5); S.px(65, 19, tl, 7);
    S.hl(62, 15, 8, tl, 7.6); S.hl(63, 14, 6, tl, 6.2); [-158, -122, -90, -58, -22].forEach(dg => { const a = dg * Math.PI / 180; S.line(65.5 + Math.cos(a) * 3.4, 14.5 + Math.sin(a) * 1.6, 65.5 + Math.cos(a) * 7.4, 14.5 + Math.sin(a) * 5.6, tl, 8.2); });
    S.px(67, 19, tl, 4.6); S.px(67, 20, tl, 4.6); S.px(66, 21, tl, 5);
    S.line(61, 25, 57, 15, tl, 5.2, { w: 2 }); S.poly([[59, 27], [63, 24], [59, 15], [56, 16]], tl, 6.2); S.px(58, 24, tl, 4); S.line(59, 25, 58, 17, tl, 7.6);
    S.rect(55, 12, 3, 4, tl, 6.5); S.rect(55, 10, 2, 2, 'gold', 6); S.box(53, 8, 6, 2, 'gold', 7.5); S.hl(53, 7, 6, 'gold', 9, { e: 1 });
    S.dy = 0;
    // the rising sun (right) catches her copper on that side: one pale rim pixel down each row
    { const L = S.c, id = S.id, tm = X.MI.teal; for (let y = 10; y < 56; y++) for (let x = 84; x > 50; x--) { const p = y * W + x; if (L.o[p] === id && L.m[p] === tm) { S.tone(x, y, 2.6); break; } } }
    S.end({ lit: 1.5 });
    // the ferry rail, a life ring, a coil of rope, the lantern post, the flagstaff
    S.lay('front');
    S.beg(); S.rect(0, 81, W, 2, 'wood', 6.5); S.hl(0, 81, W, 'wood', 8.5, { n: [0, -0.9] }); S.hl(0, 83, W, 'wood', 3); S.rect(0, 87, W, 1, 'linen', 5);
    for (let x = 3; x < W; x += 18) { S.box(x, 83, 3, 7, 'linen', 6.2); } for (let x = 6; x < W; x += 3) if ((x - 3) % 18 > 2) S.vl(x, 84, 6, 'linen', 4.4);
    S.end();
    S.beg(); S.ell(30, 85, 4.6, 4.6, 'linen', 8, { ring: 1.8 }); [[26, 84], [26, 85], [26, 86], [34, 84], [34, 85], [34, 86], [29, 81], [30, 81], [31, 81], [29, 89], [30, 89], [31, 89]].forEach(([x, y], i) => S.px(x, y, 'red', i % 3 === 1 ? 8 : 6.5)); S.end();
    S.beg(); S.ell(12, 89, 6, 1.6, 'sand', 6, { n: [0, -0.8] }); S.ell(12, 88.5, 4, 1, 'sand', 4, { ring: 0.9 }); S.px(9, 88, 'sand', 8); S.px(15, 89, 'sand', 7.5); S.end();
    S.beg(); S.cyl(141, 44, 2, 37, 'iron', 5, { rim: 1 }); S.hl(137, 46, 6, 'iron', 6); S.vl(137, 47, 3, 'iron', 4); S.end();
    S.beg(); S.vl(5, 40, 41, 'wood', 6); S.px(5, 39, 'gold', 8); S.end();
    sc.emit({ k: 'ember', x: LB.tx + 1, y: 6, w: 3, rate: 1.4, sp: 5, ang: 0.2, spread: 0.6, life: 1.4 });
  },
  post(out, t) {
    // the beacon beam: a hard-stepped wash from the torch, its length set by how far it is turned across the view
    const b = lbBeam(t), ac = Math.abs(b.c), L = 12 + 130 * ac, dx = Math.sign(b.c) || 1, x0 = LB.tx + 1, y0 = LB.ty - 1, sl = 0.3 + 0.12 * ac, cc = [255, 214, 120];
    if (b.s < 0.9) for (let d = 3; d < L; d++) { const x = Math.round(x0 + dx * d), hw = 1 + d * 0.1, yc = y0 + d * sl, a = Math.pow(1 - d / L, 0.5) * (b.s < 0 ? 1 + b.s * 0.75 : 1); if (x < 4 || x > W - 5) break;
      for (let y = Math.floor(yc - hw); y <= Math.ceil(yc + hw); y++) { if (y < 4 || y > H - 5) continue; const u = Math.abs(y + 0.5 - yc) / hw; if (u > 1) continue; const aq = Math.floor(a * (u < 0.3 ? 1 : u < 0.65 ? 0.62 : 0.4) * 4) / 4; if (aq > 0) X.addPx(out, y * W + x, cc, aq * 0.62); } }
  },
  anim(D, t, rs) {
    const st = rs.st, b = lbBeam(t);
    X.twinkle(D, t, 4, 15, 31);
    D.lay('wall'); lbClouds(D, t); lbSea(D, t);
    // a steamer crosses far out, behind the island; its smoke trails
    const sx = 150 - steps(t, 34) * 190, sy = 66; D.beg(); D.rect(sx, sy - 2, 14, 2, 'night', 1, { e: 255 }); D.hl(sx + 1, sy - 3, 12, 'night', 2, { e: 255 }); D.rect(sx + 5, sy - 6, 2, 3, 'night', 2, { e: 255 }); D.px(sx + 5, sy - 6, 'red', 6, { e: 255 });
    for (let k = 0; k < 5; k++) D.px(sx + 2 + k * 2.2, sy - 3, 'lamp', 8, { e: 255 }); D.end({ none: 1 });
    // the torch: a big flame, and the glare when the beam faces us
    D.lay('mid'); flame(D, LB.tx + 1, LB.ty - 1, 6, t, 0.4);
    if (b.s > 0.8) { const g = (b.s - 0.8) / 0.2, rr = Math.round(3 + g * 11), cx = LB.tx + 1, cy = LB.ty - 2;
      for (let k = -rr; k <= rr; k++) { const tn = Math.round(11 - Math.abs(k) / rr * 6); D.px(cx + k, cy, 'lamp', tn, { e: 255 }); if (Math.abs(k) < rr * 0.6) D.px(cx, cy + k, 'lamp', tn, { e: 255 }); if (Math.abs(k) < rr * 0.35) { D.px(cx + k, cy + k, 'lamp', tn - 1, { e: 255 }); D.px(cx + k, cy - k, 'lamp', tn - 1, { e: 255 }); } }
      D.rect(cx - 1, cy - 1, 3, 3, 'lamp', 11, { e: 255 }); if (g > 0.5) for (let a = 0; a < 6.28; a += 0.35) D.px(cx + Math.cos(a) * (rr * 0.45), cy + Math.sin(a) * (rr * 0.45), 'lamp', 8, { e: 255 });
      rs.mul[1] = 1 + g * 1.4; if (!st.gl) { st.gl = 1; rs.flash(1, 1.2); rs.flash(2, 0.6); rs.burst('glint', cx, cy, 8, { sp: 30, life: 0.8 }); rs.burst('ember', cx, cy, 8, { sp: 18, life: 1.2 }); } }
    else rs.mul[1] = 1;
    if (b.s < 0.5) st.gl = 0;
    if (b.s < 0.9) { const ac = Math.abs(b.c), d = Math.min(12 + 130 * ac, 20 + 70 * ac), sl = 0.3 + 0.12 * ac; rs.dl.push({ x: LB.tx + Math.sign(b.c) * d, y: LB.ty + d * sl, z: 24, r: 34, i: 0.6 * ac, rgb: [255, 214, 150], tint: 0.5 }); }
    // gulls wheel round the statue
    [[0, 22, 66, 0.55], [2.4, 16, 58, 0.7]].forEach(([ph, rx, cy, sp]) => { const a = t * sp + ph, x = 68 + Math.cos(a) * (rx + 18), y = cy - 34 + Math.sin(a * 2) * 5, wg = Math.sin(t * 9 + ph) > 0;
      D.px(x, y, 'linen', 9, { e: 255 }); D.px(x - 1, y - (wg ? 1 : 0), 'linen', 8, { e: 255 }); D.px(x + 1, y - (wg ? 1 : 0), 'linen', 8, { e: 255 }); D.px(x - 2, y - (wg ? 2 : 0), 'linen', 6, { e: 255 }); D.px(x + 2, y - (wg ? 2 : 0), 'linen', 6, { e: 255 }); });
    // the ferry lantern sways on its hook
    D.lay('front'); const la = Math.sin(t * 1.4) * 0.25, lx = 138 + Math.sin(la) * 6, ly = 47 + Math.cos(la) * 6;
    D.line(138, 47, lx, ly, 'iron', 4); D.beg(); D.rect(lx - 2, ly, 5, 6, 'lamp', 9, { e: 4 }); D.px(lx, ly + 2, 'lamp', 11, { e: 255 }); D.hl(lx - 2, ly - 1, 5, 'iron', 6); D.hl(lx - 2, ly + 6, 5, 'iron', 4); D.vl(lx - 2, ly, 6, 'iron', 5); D.vl(lx + 2, ly, 6, 'iron', 3); D.end({ none: 1 });
    // the flag on its staff
    for (let i = 0; i < 12; i++) { const wv = Math.round(Math.sin(t * 5 - i * 0.7) * 1.2 * (i / 12)); for (let j = 0; j < 7; j++) { const y = 41 + j + wv, blue = i < 5 && j < 4; D.px(6 + i, y, blue ? 'denim' : (j % 2 ? 'linen' : 'red'), blue ? ((i + j) % 2 ? 6 : 4) : (j % 2 ? 8 : 6)); } }
    // the sailor at the rail: raises his spyglass to follow the beam
    const look = b.s < 0.2 && Math.abs(b.c) > 0.6, p = look ? { aF: 2.1, eF: -1.4, aB: 1.6, eB: -1.3, lF: 0.1, lB: -0.1, hx: 0.5 } : { aF: 0.6, eF: -0.9, aB: 0.2, eB: -0.3, lB: -0.15, lF: 0.1, bob: Math.round(Math.sin(t * 1.4) * 0.5) };
    const dir = look ? (b.c < 0 ? -1 : 1) : -1; worker(D, LB.wx, FY, LB_LOOK, p, dir);
    if (X.noWorkers) return; const [hx, hy] = handAt(LB.wx, FY, p, dir); D.beg(); if (look) { D.line(hx, hy, hx + dir * 5, hy - 2, 'brass', 7, { w: 2 }); D.px(hx + dir * 6, hy - 3, 'brass', 9); } else { D.line(hx, hy, hx - dir * 1, hy + 5, 'brass', 6, { w: 1 }); } D.end();
  },
});

// ───────── 悉尼歌剧院 opera (cartoon · luck, rare) ─────────
// the white sails on their granite podium on a moonless night, lit up for a festival: round after round the projection
// changes colour (pink, teal, gold, violet) and pattern, the projector's light on the podium, the quay and the water turns
// with it, lasers fan up from behind the roof and chase lights run along the Harbour Bridge's arch; the glass mouths glow,
// notes float up, the harbour holds the sails upside down, festoon bulbs hang over the quay, a violinist busks by his open
// case; every nine seconds fireworks burst over the harbour and colour floods the whole roof for a few seconds
const OP_SHELLS = [   // [tip x, tip y, base left, base right, lean bulge] back to front
  [103, 47, 96, 114, 3], [94, 41, 86, 110, 3.5], [85, 36, 78, 103, 4],
  [70, 41, 63, 91, 4], [58, 34, 50, 86, 4.5], [45, 28, 36, 76, 5],
  [29, 51, 23, 42, 2], [22, 48, 16, 36, 2.5],
];
const OP_SAIL = [];   // every sail pixel still showing: [x, y, shell, v, u, tone, object id, seam] (v 0 at the tip … 1 at the podium; u 0 lit edge … 1 shadow side)
const OP_BY = 66, OP_BULBS = [], OP_SETS = [['candy', 'teal', 'gold'], ['teal', 'gold', 'candy'], ['gold', 'candy', 'teal']];   // flood colours for the back / middle / front sails
// the show's rounds: every round the whole roof wears one colour (and the projector's light on the podium, the quay and the
// water turns with it); the lasers and the chase lights on the bridge take it too
const OP_HUE = ['candy', 'teal', 'gold', 'arcane'], OP_HUEC = { candy: [255, 112, 192], teal: [64, 240, 208], gold: [255, 196, 72], arcane: [160, 128, 255] };
let OP_PJ = null;   // the projector light (its hue is set per frame from the round)
const OP_ARCH = [];   // the lamps along the bridge's arch
let OP_CM = null, OP_CT = null;   // this frame's colour of every sail pixel (0 = white tile, as painted)
// the harbour under the podium (x 12…118, rows 75…89) mirrors it: row y shows source row 73 − (y − 75) × 2.9; each water pixel
// keeps a sail pixel index (≥ 0, coloured live) or a fixed colour code −(ramp × 16 + tone) − 1
const OP_R = { x0: 12, x1: 119, y0: 75, y1: 90, sq: 2.9 }, OP_RF = new Int32Array(W * 15);
function opMirror(S) {
  const at = new Map(), code = (m, t) => -(X.MI[m] * 16 + t) - 1; OP_SAIL.forEach((q, i) => at.set(q[1] * W + q[0], i));
  for (let y = OP_R.y0; y < OP_R.y1; y++) { const ys = Math.round(73 - (y - OP_R.y0) * OP_R.sq);
    for (let x = OP_R.x0; x < OP_R.x1; x++) { const i = (y - OP_R.y0) * W + x, si = at.get(ys * W + x);
      // a sail's dark edge anywhere in the band this row stands for survives the squeeze, so the upside-down sails stay apart
      const edge = [ys - 1, ys + 1].some(yy => { const [ly, m, tn] = seen(S, x, yy); return ly === 'b' && m === 'linen' && tn < 2.5; });
      if (si != null && !edge) { OP_RF[i] = si; continue; } if (si != null) { OP_RF[i] = code('water', 1); continue; }
      const [ly, m, tn] = seen(S, x, ys);
      OP_RF[i] = ly === 'b' ? (m === 'lamp' ? code('lamp', clamp(Math.round(tn - 3.5), 2, 4)) : m === 'mstone' ? code('mstone', clamp(Math.round(tn - 3.5), 1, 5)) : code('water', 1))
        : m === 'lamp' ? code('lamp', 5) : m === 'red' ? code('red', 4) : m === 'night' && tn < 2.5 && x > 100 ? code('water', 1) : code('water', 2); } }
}
{ const r = X.rng(9); for (let x = 4; x < 147; x += 6) { const u = (x - 75) / 71; OP_BULBS.push([x, Math.round(5 + 9 * (1 - u * u)), ['candy', 'gold', 'teal', 'lamp'][Math.floor(r() * 4)], r() * 7]); } }
function opEdge(sh, y) { const [tx, ty, b0, b1, bu] = sh, v = clamp((y - ty) / (OP_BY - ty), 0, 1); return [tx + (b0 - tx) * v - bu * Math.sin(Math.PI * v), tx + (b1 - tx) * Math.pow(Math.sin(Math.PI / 2 * v), 0.75), v]; }
// the busker stands out on the dark water: warm brown trousers and a wine waistcoat over the white shirt, and the far lights
// of the bridge rim his back edge (opRim) so his outline never sinks into the harbour
const OP_LOOK = { skin: ['skin', 6], hair: ['hair', 2], top: ['linen', 8.4], bot: ['leather', 4], boot: ['hair', 1], apron: ['crimson', 4.5] };
// a 1-px cold rim down the right edge of the object just drawn (its outline pixel on that side takes the light)
function opRim(D, x0, x1, y0, y1) { const L = D.c, id = D.id;
  for (let y = y0; y <= y1; y++) for (let x = x1; x >= x0; x--) { const p = y * W + x; if (L.o[p] === id && L.m[p]) { D.px(x, y, 'ice', L.m[p] === X.MI.linen ? 9 : 7, GLOW); break; } } }
X.def('opera', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    OP_SAIL.length = 0;
    X.sky(S, sc, { horizon: 60, far: 'sea', floor: 'stone' });                                                            // a moonless night: the show is the light
    sc.light({ x: 75, y: 20, z: 70, r: 270, i: 0.45, c: '#b8b0ff', tint: 0.1 });                                          // 0 the city's glow in the night sky
    sc.light({ x: 118, y: 26, z: 40, r: 150, i: 1.3, c: '#ffd8f0', tint: 0.3, bake: false });                              // 1 firework flash
    sc.light({ x: 10, y: 50, z: 36, r: 46, i: 0.8, c: '#ffe0a0', fl: 'candle', ph: 2, tint: 0.4 });                    // 2 quay lamp
    sc.light({ x: 60, y: 60, z: 2, r: 1, i: 1, c: '#ffb060', fl: 'candle', ph: 4, tint: 0 });                          // 3 glass mouths (lights nothing: the glass glows with it)
    sc.light({ x: 62, y: 72, z: 30, r: 72, i: 0.55, c: '#fff0e0', tint: 0.08 });                                       // 4 floodlights along the podium
    OP_PJ = sc.lights[sc.light({ x: 70, y: 58, z: 46, r: 92, i: 0.55, c: '#ff70c0', tint: 0.42, bake: false })];       // 5 the projector (hue follows the round)
    // the Harbour Bridge behind: granite pylons, the steel arch with its lights, the deck
    S.lay('wall'); const nb = 'night';
    const arch = (x, k) => { const u = (x - 138) / 30; return 28 + k + u * u * 20; };
    OP_ARCH.length = 0;
    for (let x = 110; x < 147; x++) { const y0 = Math.round(arch(x, 0)), y1 = Math.round(arch(x, 6)); for (let y = y0; y <= y1; y++) S.px(x, y, nb, y === y0 ? 5 : y === y1 ? 4 : 3, { e: 255 }); if (x % 4 === 0) for (let y = y1; y < 58; y++) S.px(x, y, nb, 2, { e: 255 }); if (x % 3 === 0) { S.px(x, y0 - 1, 'lamp', 8, { e: 255 }); OP_ARCH.push([x, y0 - 1]); } }
    for (let x = 111; x < 147; x += 4) for (let y = Math.round(arch(x, 1)); y < Math.round(arch(x, 6)); y += 2) S.px(x + ((y >> 1) % 2), y, nb, 1, { e: 255 });
    S.rect(104, 57, 43, 3, nb, 3, { e: 255 }); S.hl(104, 57, 43, nb, 4, { e: 255 }); for (let x = 105; x < 147; x += 3) S.px(x, 58, 'lamp', 8, { e: 255 });
    S.rect(106, 40, 8, 26, nb, 3, { e: 255 }); S.hl(106, 40, 8, nb, 5, { e: 255 }); S.vl(106, 41, 25, nb, 4, { e: 255 }); S.rect(108, 43, 2, 4, nb, 1, { e: 255 }); S.rect(111, 43, 2, 4, nb, 1, { e: 255 }); S.px(110, 39, 'red', 7, { e: 255 });
    // podium on the point: one pale granite plinth — a lit top and upper band, dressed blocks, the floodlight strip — and at
    // the left the broad stair climbing into it, each step two rows (lit tread, shaded riser) set back as it rises
    S.lay('back'); S.beg(); const stR = 36;
    S.hl(stR + 1, OP_BY - 1, 117 - stR, 'mstone', 9.5, { n: [0, -0.86] }); S.rect(stR + 1, OP_BY, 117 - stR, 8, 'mstone', 8);
    S.hl(stR + 1, OP_BY, 117 - stR, 'mstone', 9.5, { n: [0, -0.7] }); S.hl(stR + 1, OP_BY + 1, 117 - stR, 'mstone', 9, { n: [0, -0.4] });
    S.vl(117, OP_BY + 1, 6, 'mstone', 7, { n: [0.7, 0] }); S.hl(stR + 1, OP_BY + 7, 117 - stR, 'mstone', 5, { n: [0, 0.7] });
    for (let x = 48; x < 117; x += 9) S.vl(x, OP_BY + 2, 5, 'mstone', 6); for (let x = 43; x < 117; x += 18) S.vl(x + 1, OP_BY + 5, 2, 'mstone', 6.5);
    S.hl(46, OP_BY + 3, 70, 'lamp', 7, { e: 4 }); for (let x = 47; x < 116; x += 3) S.px(x, OP_BY + 3, 'mstone', 6);
    for (let k = 0; k < 4; k++) { const y = OP_BY + k * 2, x0 = 18 - k * 2;   // k 0 = top step
      S.hl(x0, y, stR + 1 - x0, 'mstone', 9, { n: [0, -0.86] }); S.px(x0, y, 'mstone', 10, { n: [-0.5, -0.8] });
      S.hl(x0, y + 1, stR + 1 - x0, 'mstone', k === 3 ? 5 : 6); }
    S.vl(stR, OP_BY + 1, 7, 'mstone', 6.5); S.hl(18, OP_BY - 1, stR - 17, 'mstone', 9.5, { n: [0, -0.86] });
    S.end({ lit: 2 });
    // the sails: white tiles in chevron rows, a lit leading edge, the ribbed shadow side; glass walls under the tips
    OP_SHELLS.forEach((sh, si) => { S.beg();
      const [tx, ty] = sh;
      for (let y = ty; y < OP_BY; y++) { const [xl, xr, v] = opEdge(sh, y); for (let x = Math.round(xl); x <= Math.round(xr); x++) { const u = (x - xl) / Math.max(1, xr - xl), band = u < 0.14 ? 1.2 : u < 0.55 ? 0.3 : u < 0.82 ? -0.5 : -1.3, row = (y - ty) % 4 === 3 ? -0.5 : 0;
        S.px(x, y, 'linen', 8 + band + row, { n: [-0.5 + u * 0.7, -0.4] }); OP_SAIL.push([x, y, si, v, u, 8 + band + row, S.id, row ? 1 : 0]); } }
      // glass mouth: a wall of bronze glass hanging from the leading edge, glowing from inside
      for (let y = ty + 4; y < OP_BY; y++) { const [xl] = opEdge(sh, y), xg = tx - 1 + (y - ty) * 0.08; for (let x = Math.round(xl); x < Math.round(xg); x++) S.px(x, y, 'lamp', (x + y) % 5 === 0 ? 4 : Math.round(6.2 + (y - ty) / (OP_BY - ty) * 1.2), { e: 4 }); }
      S.end({ lit: 1.4 }); });
    // keep only the sail pixels still showing (not under a nearer shell or its outline), once each
    { const L = S.L.back, lin = X.MI.linen, got = new Set(), keep = OP_SAIL.filter(q => { const p = q[1] * W + q[0]; if (got.has(p) || L.o[p] !== q[6] || L.m[p] !== lin) return false; got.add(p); return true; }); OP_SAIL.length = 0; keep.forEach(q => OP_SAIL.push(q)); }
    OP_CM = new Uint8Array(OP_SAIL.length); OP_CT = new Uint8Array(OP_SAIL.length);
    // the quay: flagstones, a railing of chain posts, a globe lamp, the open violin case
    S.lay('wall'); TX.tiles(S, 0, FY, W, H - FY, 'mstone', 5.2, { s: 8, gt: 3, v: 0.6, gloss: false }); S.hl(0, FY, W, 'mstone', 7.5, { n: [0, -0.9] });
    S.rect(3, 74, 144, 16, 'water', 2.4, { n: [0, -0.9] });
    opMirror(S);
    S.lay('front');
    for (let x = 22; x < 146; x += 20) { S.beg(); S.box(x, 83, 3, 7, 'iron', 5.5, { top: 1 }); S.px(x + 1, 82, 'brass', 8); S.end(); if (x + 20 < 146) for (let k = 1; k < 20; k++) S.px(x + 1 + k, 84 + Math.round(Math.sin(k / 20 * Math.PI) * 2), 'iron', 4 + (k % 2)); }
    S.beg(); S.cyl(9, 54, 3, 36, 'iron', 4.5, { rim: 1 }); S.box(7, 86, 7, 4, 'iron', 4, { top: 1 }); S.hl(6, 55, 9, 'iron', 6); S.ell(10.5, 50, 3.5, 3.5, 'linen', 10, { e: 3 }); S.px(9, 49, 'linen', 11, { e: 255 }); S.end();
    // the open violin case lies flat on the quay: the lid leans back behind it (a thin leather slab, its crimson lining in
    // shade, a lit top edge); the low tray in front shows its violin-shaped velvet bed (two bouts, a pinched waist) with the
    // evening's coins on it
    { const c = 106;
      S.beg(); S.poly([[c, 86], [c + 14, 86], [c + 12, 81], [c + 2, 81]], 'crimson', 2.6); S.line(c, 85, c + 2, 82, 'leather', 5.5); S.hl(c + 2, 81, 10, 'leather', 7.5, { n: [0, -0.8] }); S.line(c + 13, 85, c + 12, 82, 'leather', 3.5); S.end();
      S.beg(); S.rect(c, 86, 14, 6, 'leather', 4.5); S.hl(c, 86, 14, 'leather', 6, { n: [0, -0.8] }); S.hl(c, 90, 14, 'leather', 7, { n: [0, -0.8] }); S.vl(c + 13, 87, 5, 'leather', 3.5);
      ['.VVVV....VVVV.', '.VVVVVVVVVVVV.', '..VVV....VVV..'].forEach((row, j) => { for (let i = 0; i < 14; i++) if (row[i] === 'V') S.px(c + i, 87 + j, 'crimson', j ? 6.5 : 5); });
      S.end();
      [[c + 2, 88], [c + 4, 87], [c + 7, 88], [c + 10, 88], [c + 11, 89]].forEach(([x, y], k) => S.px(x, y, 'gold', k === 2 ? 10 : 9));
      sc.emit({ k: 'glint', x: c + 7, y: 88, w: 10, h: 2, rate: 0.5, sp: 2, life: 0.6 }); }
  },
  anim(D, t, rs) {
    const st = rs.st;
    X.twinkle(D, t, 7, 40, 41);
    // the light show: the sails stand white; a projected pattern (stripes, a sweeping band, rings from the stage) paints about
    // a third of the tiles in each group's colour and changes every few seconds with a wipe. The moment: when the fireworks
    // burst, colour floods the whole roof from the right, holds while the second rocket goes, and drains away — shaded, so the
    // sails keep their lit edge, their shadow side and their tile rows
    const md = (a, n) => ((a % n) + n) % n, pc = t / 4.2, pn = Math.floor(pc), pk = pc - pn, pat = md(pn, 3), ppat = md(pn - 1, 3), wipe = pk < 0.16 ? pk / 0.16 * 130 + 8 : 999;
    const hue = OP_HUE[md(pn, 4)], phue = OP_HUE[md(pn - 1, 4)], fq = steps(t, 9), wset = OP_SETS[md(Math.floor(t / 9), 3)];
    const xin = fq < 0.15 ? 999 : fq < 0.21 ? 130 - (fq - 0.15) / 0.06 * 130 : -10, xout = fq < 0.4 ? 999 : fq < 0.46 ? 130 - (fq - 0.4) / 0.06 * 130 : -10;
    const fb = (st.fl || 0) > 0.35 ? 1 : 0, MIc = X.MI, hm = MIc[hue], phm = MIc[phue], flood = fq > 0.15 && fq < 0.46;
    // the projector's light takes the round's colour (it dips while the new picture wipes in, and swells in the flood)
    if (OP_PJ) OP_PJ.rgb = OP_HUEC[pk < 0.08 ? phue : hue];
    rs.mul[5] = (pk < 0.16 ? 0.45 + 0.55 * Math.abs(pk - 0.08) / 0.08 : 1) * (flood ? 1.35 : 1);
    // lasers fan up from behind the sails in the round's colour and sweep slowly (the sails hide their feet)
    D.lay('wall');
    if (!flood) [[46, 64, -0.52, 0], [72, 64, 0.06, 2.1], [96, 64, 0.58, 4.2]].forEach(([x0, y0, a0, ph]) => { const a = a0 + 0.26 * Math.sin(t * 0.45 + ph), sx = Math.sin(a), sy = -Math.cos(a);
      for (let d = 6; d < 150; d++) { const x = Math.round(x0 + sx * d), y = Math.round(y0 + sy * d); if (y < 4 || x < 4 || x > W - 5) break; D.px(x, y, hm, d < 60 ? 9 : d < 95 ? 7 : 5, GLOW); } });
    // chase lights run along the bridge's arch in the round's colour
    OP_ARCH.forEach(([x, y], i) => { const k = md(i - Math.floor(t * 9), 6); if (k < 2) D.px(x, y, hm, k ? 7 : 10, GLOW); });
    D.lay('back');
    for (let i = 0; i < OP_SAIL.length; i++) { const q = OP_SAIL[i], x = q[0], y = q[1], P = x < wipe ? pat : ppat, u = q[4], seam = q[7], g = q[2] < 3 ? 1 : q[2] < 6 ? 0 : 2;
      const on = P === 0 ? Math.sin(x * 0.3 - y * 0.5 + t * 4.2) > 0.6                                    // diagonal stripes
        : P === 1 ? Math.abs((((x - t * 30) % 60) + 60) % 60 - 30) < 9                                     // a broad band sweeps across
        : Math.sin(Math.hypot(x - 60, y - 72) * 0.55 - t * 4) > 0.6;                                        // rings out from the stage
      const lit = u < 0.14 ? 0 : u < 0.55 ? 1 : u < 0.82 ? 2 : 3;
      let m = 0, tn = 0;
      if (x >= xin && x < xout) { m = MIc[wset[g]]; tn = [8, 7, 6, 5][lit] - seam; if (on) tn = Math.min(9, tn + 2); }   // flooded: shaded, the pattern rides lighter on top
      else if (on) { m = x < wipe ? hm : phm; tn = lit < 2 ? 8 - seam : 7; }
      OP_CM[i] = m; OP_CT[i] = tn; if (m) D.px(x, y, m, tn + fb, GLOW); }
    // the harbour: ripples everywhere, and under the podium the sails upside down, dimmer, in whatever colour they wear
    D.lay('wall'); X.sea(D, t, OP_R.y0, OP_R.y1, null);
    const lin = MIc.linen, wat = MIc.water;
    for (let y = OP_R.y0; y < OP_R.y1; y++) { const sh = rip(t, y);
      for (let x = OP_R.x0; x < OP_R.x1; x++) { const r = OP_RF[(y - OP_R.y0) * W + clamp(x - sh, OP_R.x0, OP_R.x1 - 1)]; let m, tn;
        if (r >= 0) { const u = OP_SAIL[r][4]; if (OP_CM[r]) { m = OP_CM[r]; tn = OP_CT[r] > 7 ? 4 : 3; } else { m = lin; tn = u < 0.14 ? 7 : u < 0.55 ? 6 : u < 0.82 ? 5 : 4; } tn += fb; }
        else { const c = -r - 1; m = c >> 4; tn = c & 15; }
        if (dashAt(t, x, y)) tn = Math.max(1, tn - (m === wat ? 1 : 2));
        D.px(x, y, m, tn, GLOW); } }
    // the bridge's deck lamps wobble in the water off to the right
    for (let x = 121; x < 146; x += 3) { const y = 80 + ((x * 5 + Math.floor(t * 3)) % 3 === 0 ? 1 : 0), dx = Math.round(Math.sin(t * 1.4 + x) * 0.8); D.hl(x + dx, y, 2, 'lamp', 5, GLOW); if ((x + Math.floor(t * 2)) % 2) D.px(x + dx + 1, y + 2, 'lamp', 4, GLOW); }
    // festoon bulbs over the quay twinkle
    D.lay('front'); for (let i = 0; i < OP_BULBS.length; i++) { const [x, y, m, ph] = OP_BULBS[i], a = Math.sin(t * 2.2 + ph); D.px(x, y, m, a > 0.2 ? 10 : 6, { e: 255 }); D.px(x, y + 1, m, a > 0.2 ? 8 : 5, { e: 255 }); if (i) { const [px, py] = OP_BULBS[i - 1]; for (let xx = px + 1; xx < x; xx++) D.px(xx, Math.round(py + (y - py) * (xx - px) / (x - px) - Math.sin((xx - px) / (x - px) * Math.PI) * 0.8) - 1, 'night', 3, { e: 255 }); } D.px(x, y - 1, 'night', 4, { e: 255 }); }
    // fireworks: a rocket climbs from the harbour and bursts twice (the outer ring flies ~15 px, so both bursts stay well
    // inside the frame)
    D.lay('wall');
    if (!st.fw) st.fw = [];
    [[0.02, 118, 22, 'candy'], [0.2, 124, 30, 'gold']].forEach(([at, fx, fy, fm], k) => { const q = fq - at;
      if (q > 0 && q < 0.13) { const kk = q / 0.13, y = 76 - (76 - fy) * (1 - (1 - kk) * (1 - kk)); D.px(fx, y, 'fire', 10, { e: 255 }); D.px(fx, y + 1, 'fire', 8, { e: 255 }); D.px(fx, y + 2, 'fire', 6, { e: 255 }); }
      if (q >= 0.13 && q < 0.2 && !st['b' + k]) { st['b' + k] = 1; for (let i = 0; i < 40; i++) { const a = i / 20 * Math.PI * 2 + (i >= 20 ? 0.16 : 0), sp = i < 20 ? 26 : 14; st.fw.push({ x: fx, y: fy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, m: i >= 20 ? 'linen' : fm }); } st.fl = 1; rs.burst('glint', fx, fy, 6, { sp: 16, life: 0.6 }); }
      if (q < 0) st['b' + k] = 0; });
    const dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t;
    for (let i = st.fw.length - 1; i >= 0; i--) { const p = st.fw[i]; p.t += dt; p.vx *= Math.exp(-dt * 1.6); p.vy = p.vy * Math.exp(-dt * 1.6) + 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > 1.6) { st.fw.splice(i, 1); continue; }
      const tn = Math.round(11 - p.t * 4); D.px(p.x, p.y, p.m, tn, { e: 255 }); D.px(p.x - Math.sign(p.vx), p.y - Math.sign(p.vy) * (Math.abs(p.vy) > Math.abs(p.vx) * 0.5 ? 1 : 0), p.m, tn - 2, { e: 255 }); if (p.t < 0.9) D.px(p.x - p.vx * 0.09, p.y - p.vy * 0.09, p.m, tn - 4, { e: 255 });
      if (p.t > 0.9 && ((p.t * 20 + i) | 0) % 3 === 0) D.px(p.x, p.y, 'linen', 10, { e: 255 }); }
    st.fl = (st.fl || 0) * Math.exp(-dt * 3); rs.mul[1] = st.fl * 1.1;
    // the violinist, out on the quay in front of the railing against the dark water, facing the hall: the fiddle lies level
    // under his chin, his left hand holds the neck, and the bow (a bright line) saws across the body near the bridge — sliding
    // and tipping each stroke
    D.lay('front');
    const x0 = 136, dir = -1, bw = Math.sin(t * 5.2), lean = -0.1 + 0.2 * Math.sin(t * 1.6), sx = x0 + Math.round(lean * 3 * dir), shY = FY - 21, hx = sx;
    const V = (u, v) => [hx + dir * u, shY + v];                                   // u forward from the chin, v down from the shoulders
    const bk = 3.5 + 1.5 * bw, bth = 0.65 + 0.12 * bw, bd = [Math.sin(bth), -Math.cos(bth)], bH = [3 - bk * bd[0], 1 - bk * bd[1]], bT = [bH[0] + 10 * bd[0], bH[1] + 10 * bd[1]];
    const [hxB, hyB] = V(bH[0], bH[1]), [txB, tyB] = V(bT[0], bT[1]), [nxL, nyL] = V(6, 2);
    const [aF, eF] = reach(sx + dir, shY + 2, nxL, nyL, dir, -1), [aB, eB] = reach(sx - 2 * dir, shY + 2, hxB, hyB, dir, -1);
    const p = { aF, eF, aB, eB, lF: 0.12, lB: -0.12, lean };
    worker(D, x0, FY, OP_LOOK, p, dir);
    const notes = st.notes || (st.notes = []), nm = () => ['candy', 'gold', 'teal'][Math.floor(R() * 3)];
    if (!X.noWorkers) {
      opRim(D, x0 - 9, x0 + 9, shY - 8, FY - 1);
      const P = (u, v, m, tn) => { const [x, y] = V(u, v); D.px(x, y, m, tn); };
      D.beg();   // the violin: two bouts of red-brown varnish pinched at the waist, a lit top edge, the dark fingerboard running on into the neck, the scroll
      [-1, 0, 1, 3, 4].forEach(u => { P(u, 0, 'copper', 9); P(u, 2, 'copper', 5.5); }); for (let u = -1; u <= 4; u++) P(u, 1, 'copper', 7.5);
      P(3, 1, 'wood', 3.5); P(4, 1, 'wood', 3.5); for (let u = 5; u <= 7; u++) P(u, 1, 'wood', 5); P(8, 0, 'wood', 5.5); P(9, 0, 'copper', 7); P(9, -1, 'copper', 9); P(1, 1, 'bone', 9);
      D.end();
      P(0, -1, 'skin', 6); P(1, -1, 'skin', 5);                                                                          // his chin rests on it
      const [lx, ly] = V(6, 2); D.px(lx, ly, 'skin', 6); D.px(lx - dir, ly, 'skin', 7);                            // left fingers round the neck
      D.line(hxB, hyB, txB, tyB, 'linen', 10);                                                                         // the bow
      const hbx = Math.round(hxB), hby = Math.round(hyB); D.rect(hbx - (dir > 0 ? 1 : 0), hby, 2, 2, 'skin', 6); D.px(hbx - dir * 2, hby + 1, 'linen', 6.5); D.px(hbx - dir * 2 - (dir > 0 ? 1 : 0), hby, 'linen', 7);   // bow hand and cuff
    }
    // notes float up from the violin and, now and then, out of the halls
    D.lay('mid'); const [nvx, nvy] = V(10, -8);
    if (st.nt == null || t - st.nt > 0.7 || t < st.nt) { st.nt = t; if (!X.noWorkers) notes.push({ x: nvx, y: nvy, t0: t, m: nm(), s: R() < 0.5 }); if (R() < 0.35) notes.push({ x: 30 + R() * 50, y: 56, t0: t, m: nm(), s: R() < 0.5 }); }
    for (let i = notes.length - 1; i >= 0; i--) { const n = notes[i], a = t - n.t0; if (a > 3.2 || a < 0) { notes.splice(i, 1); continue; } const x = Math.round(n.x - a * 5 + Math.sin(a * 3) * 2), y = Math.round(n.y - a * 9), tn = a < 2.2 ? 9 : 9 - (a - 2.2) * 4;
      const tq = Math.round(tn); D.rect(x, y + 3, 2, 2, n.m, tq, { e: 255 }); D.vl(x + 1, y, 3, n.m, tq, { e: 255 }); if (n.s) D.px(x + 2, y + 1, n.m, tq - 1, { e: 255 }); else D.px(x + 2, y, n.m, tq - 1, { e: 255 }); }
  },
});

// ───────── 金门大桥 goldengate (steam · misc, rare) ─────────
// the orange bridge at sunset in the fog: art-deco towers, the great cable sagging between them, sodium lamps and car lights
// running along the deck, red beacons blinking on the tower tops; fog banks roll through at three depths; the bay mirrors it
// all. On the rocks a steam foghorn stands with its boiler; every ten seconds the keeper pulls the chain and it blasts
const GG = { tl: 44, tr: 134, top: 14, deck: 57, wl: 64 };
const GG_LOOK = { skin: ['skin', 5], hair: ['hair', 3], top: ['denim', 4.5], bot: ['leather', 3], boot: ['hair', 2], cap: ['night', 3], beard: ['hair', 3] };
const ggCable = (x) => { const m = (GG.tl + GG.tr) / 2, h = (GG.tr - GG.tl) / 2; if (x < GG.tl) { const u = (GG.tl - x) / GG.tl; return GG.top + 1 + u * u * 30 + u * 6; } if (x > GG.tr) { const u = (x - GG.tr) / 40; return GG.top + 1 + u * u * 30 + u * 6; } const u = (x - m) / h; return GG.deck - 5 - (GG.deck - 6 - GG.top) * u * u; };
function ggFog(D, t, y0, amp, sp, seed, m, t0, t1, h, lay, w0, w1) {
  D.lay(lay); const r = X.rng(seed), a = [r() * 7, r() * 7, r() * 7];
  for (let x = w0 || 3; x < (w1 || W - 3); x++) { const xx = x + t * sp, top = Math.round(y0 - amp * (0.5 + 0.5 * Math.sin(xx * 0.09 + a[0])) * (0.6 + 0.4 * Math.sin(xx * 0.031 + a[1])) - Math.max(0, Math.sin(xx * 0.21 + a[2])) * 1.4), bot = Math.round(y0 + h + Math.sin(xx * 0.05 + a[1]) * 2);
    if (top >= bot) continue; D.px(x, top, m, t1, { e: 255 }); for (let y = top + 1; y < bot; y++) D.px(x, y, m, y - top < 3 ? t0 + 1 : t0, { e: 255 }); }
}
X.def('goldengate', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 58, dusk: true, sun: [98, 41, 6], far: 'hills', floor: 'dirt' });                          // 0 sun
    sc.lights[0].tint = 0.2;   // the sun's hue on everything costs a blend per pixel per frame; the copper and the dusk ramp carry the warmth
    sc.light({ x: 88, y: 54, z: 14, r: 64, i: 0.5, c: '#ffb050', tint: 0.4 });                                          // 1 sodium lamps along the deck
    sc.light({ x: GG.tl, y: 7, z: 8, r: 26, i: 0.6, c: '#ff3030', fl: 'pulse', amp: 0.9, sp: 3, tint: 0.6 });          // 2 tower beacons
    sc.light({ x: 22, y: 61, z: 36, r: 52, i: 0.9, c: '#ffc070', fl: 'candle', tint: 0.5 });                           // 3 station lantern
    sc.light({ x: 70, y: 66, z: 30, r: 60, i: 1, c: '#fff0d0', tint: 0.3, bake: false });                               // 4 the horn's blast lamp
    // the bay (the reflection is painted over it every frame)
    S.lay('wall'); S.rect(3, GG.wl - 4, W - 6, FY - GG.wl + 4, 'water', 2.4, { n: [0, -0.9] });
    // quay stones in front, water to the right
    X.TX.ashlar(S, 0, FY, 96, H - FY, 'stone', 4.6, { bh: 4, bw: 12, crack: 0.1 }); S.hl(0, FY, 96, 'stone', 6.5, { n: [0, -0.9] }); S.vgrad(96, FY, W - 96, H - FY, 'water', 3.4, 2.2);
    for (let y = FY + 2; y < H - 3; y += 3) S.hl(100 + (y * 7) % 11, y, 3 + (y % 4), 'dusk', 8, { e: 255 });
    // the bridge: towers with stepped portal struts, the cables, suspenders, the deck truss
    const cp = 'copper';
    S.lay('back');
    const tower = (cx) => { S.beg();
      for (let y = GG.top; y < GG.wl + 4; y++) { const k = (y - GG.top) / (GG.wl - GG.top), lw = 3 + Math.round(k * 1.4); [cx - 6, cx + 6 - lw + 1].forEach((x0, side) => { for (let i = 0; i < lw; i++) S.px(x0 + i, y, cp, (i === 0 ? 7.4 : i === lw - 1 ? 4 : 5.8) - (side ? 0.4 : 0), { n: [i === 0 ? -0.6 : i === lw - 1 ? 0.6 : 0, 0] }); if (y % 7 === 3) S.px(x0 + 1, y, cp, 4.5); }); }
      [[GG.top, 4], [25, 3], [36, 3], [46, 3]].forEach(([y, h]) => { S.rect(cx - 3, y, 7, h, cp, 5.6); S.hl(cx - 3, y, 7, cp, 7.4, { n: [0, -0.7] }); S.hl(cx - 3, y + h - 1, 7, cp, 3.6); S.px(cx, y + 1, cp, 3.5); });
      S.rect(cx - 7, GG.top - 2, 15, 2, cp, 6.6); S.hl(cx - 6, GG.top - 3, 13, cp, 7.4); S.rect(cx - 5, GG.top - 5, 3, 3, cp, 6.2); S.rect(cx + 3, GG.top - 5, 3, 3, cp, 5.4);
      S.box(cx - 9, GG.wl - 2, 19, 7, 'stone', 5, { top: 1 }); S.end(); };
    tower(GG.tl); tower(GG.tr);
    S.beg(); for (let x = 3; x < W - 3; x++) { const y = ggCable(x); S.px(x, Math.round(y), cp, 7); S.px(x, Math.round(y) + 1, cp, 4.6); if (x % 3 === 0 && y + 2 < GG.deck && (x < GG.tl - 7 || x > GG.tl + 7) && (x < GG.tr - 7 || x > GG.tr + 7)) S.vl(x, Math.round(y) + 2, GG.deck - Math.round(y) - 2, cp, 4); } S.end();
    S.beg(); S.rect(3, GG.deck, W - 6, 2, cp, 6.4); S.hl(3, GG.deck, W - 6, cp, 7.8, { n: [0, -0.8] }); S.hl(3, GG.deck + 4, W - 6, cp, 4.6); for (let x = 3; x < W - 3; x += 3) S.vl(x, GG.deck + 2, 2, cp, 3.8); S.hl(3, GG.deck + 2, W - 6, cp, 2.4);
    for (let x = 5; x < W - 3; x += 7) { S.px(x, GG.deck - 1, 'iron', 5); S.px(x, GG.deck - 2, 'lamp', 8, { e: 2 }); } S.end();
    // the headland under the left tower's approach
    S.beg(); S.poly([[3, 53], [10, 50], [18, 52], [26, 57], [32, 62], [32, GG.wl + 2], [3, GG.wl + 2]], 'rock', 5); S.noise(3, 50, 30, 16, 1, 3, 3);
    for (let x = 3; x < 32; x++) { const y = x < 10 ? 53 - (x - 3) * 0.43 : x < 18 ? 50 + (x - 10) * 0.25 : x < 26 ? 52 + (x - 18) * 0.62 : 57 + (x - 26) * 0.83; S.px(x, Math.round(y), 'leaf', 5 + (x % 3 === 0 ? 1 : 0)); S.px(x, Math.round(y) + 1, 'rock', 7.5, { n: [-0.4, -0.7] }); if (x % 4 === 1) S.px(x, Math.round(y) - 1, 'leaf', 6); } S.end();
    // near the eye: the foghorn on its stand, the boiler with its gauge, the lantern post, rocks at the quay edge
    S.lay('front');
    [[6, 5], [12, 3], [80, 4], [88, 6], [95, 3]].forEach(([x, rr], i) => { S.beg(); S.ell(x, 90 - rr * 0.35, rr + 1, rr * 0.75, 'rock', 5.4 + (i % 2) * 0.6, { dome: 1 }); S.px(x - 1, 89 - rr, 'rock', 8); S.end(); });
    S.beg(); S.cyl(60, 67, 3, 23, 'iron', 4.5, { rim: 1 }); S.box(56, 86, 11, 4, 'iron', 4, { top: 1 });
    for (let x = 58; x <= 72; x++) { const k = (x - 58) / 14, hw = 1.5 + k * k * 6; for (let y = Math.round(64 - hw); y <= Math.round(64 + hw); y++) S.px(x, y, 'brass', 6.4 + (y < 64 - hw * 0.4 ? 1.6 : y > 64 + hw * 0.4 ? -1.4 : 0), { n: [0, (y - 64) / (hw + 1) * 0.8] }); }
    S.vl(72, 57, 15, 'brass', 3); S.vl(73, 58, 13, 'ink', 1); S.rect(55, 62, 4, 4, 'brass', 5.5); S.end();
    S.beg(); S.cyl(34, 73, 12, 17, 'copper', 5.6, { rim: 2 }); S.ell(40, 73, 6, 2, 'copper', 7, { n: [0, -0.8] }); S.hcyl(34, 78, 12, 2, 'brass', 6); S.hcyl(34, 86, 12, 2, 'brass', 5); S.box(37, 66, 3, 6, 'iron', 4.5);
    S.ell(41, 82, 3, 3, 'brass', 7, { ring: 1 }); S.ell(41, 82, 2, 2, 'linen', 9); S.px(42, 81, 'red', 6); S.px(41, 82, 'ink', 1);
    S.line(40, 70, 56, 64, 'iron', 5.5); S.line(40, 71, 56, 65, 'iron', 3.5); S.end();
    S.beg(); S.cyl(21, 60, 2, 30, 'iron', 4.5, { rim: 1 }); S.hl(18, 60, 7, 'iron', 6); S.rect(19, 61, 5, 6, 'lamp', 9, { e: 4 }); S.px(21, 63, 'lamp', 11, { e: 255 }); S.hl(19, 67, 5, 'iron', 4); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10);
    reflect(D, rs, t, { y0: GG.wl - 3, y1: FY, ym: GG.wl - 4, sq: 2, x0: 3, x1: W - 3, dim: 0.7, warm: 1 });
    // far fog lying on the water at the horizon, lit pink by the sunset
    ggFog(D, t, 58, 3, -2.2, 3, 'dusk', 7, 8, 4, 'wall');
    // a freighter slides under the bridge
    const sx = 160 - steps(t, 40) * 200; D.lay('wall'); D.rect(sx, 60, 20, 3, 'night', 2, { e: 255 }); D.rect(sx + 3, 57, 10, 3, 'night', 2, { e: 255 }); D.rect(sx + 8, 53, 3, 4, 'night', 2, { e: 255 }); for (let k = 0; k < 5; k++) D.px(sx + 4 + k * 2, 58, 'lamp', 8, { e: 255 });
    // the deck: cars run both ways, headlights one way and tail lights the other
    D.lay('back'); for (let i = 0; i < 7; i++) { const dir = i % 2 ? 1 : -1, x = ((i * 37 + t * (14 + i * 2) * dir) % 160 + 160) % 160 - 5; if (x < 3 || x > W - 4) continue; D.px(x, GG.deck - 1, dir > 0 ? 'linen' : 'red', dir > 0 ? 10 : 7, { e: 255 }); D.px(x - dir, GG.deck - 1, dir > 0 ? 'lamp' : 'red', dir > 0 ? 8 : 5, { e: 255 }); }
    // beacons on the tower tops
    [GG.tl, GG.tr].forEach(x => { D.rect(x - 1, GG.top - 7, 2, 2, 'red', 7, { e: 3 }); });
    // the rolling fog: a bank in front of the piers and a thin wisp near the eye
    ggFog(D, t, GG.wl + 1, 5, -3.2, 7, 'lav', 7, 9, 5, 'mid', 3, W - 3);
    ggFog(D, t, 44, 3, -5, 11, 'lav', 8, 10, 2, 'mid', 70, 130);
    // the foghorn: the keeper pulls the chain, the horn blasts steam, rings of sound roll out over the water
    const pull = q > 0.62 && q < 0.72, blast = q > 0.68 && q < 0.86;
    D.lay('front'); const cy = pull ? 70 : 66; D.vl(57, 66, cy - 66 + 8, 'iron', 6); D.rect(56, cy + 8, 3, 2, 'iron', 7);
    const w = worker, p = pull ? { aF: 2.4, eF: -0.3, aB: 0.5, eB: -0.5, lF: 0.2, lB: -0.2, lean: 0.35 } : { aF: 0.3 + Math.sin(t * 0.8) * 0.05, eF: -0.4, aB: 0.2, eB: -0.3, bob: Math.round(Math.sin(t * 1.3) * 0.5) };
    w(D, 51, FY, GG_LOOK, p, 1);
    if (blast && !st.b) { st.b = 1; st.bt = t; rs.burst('glint', 73, 64, 4, { sp: 20, life: 0.5 }); }
    if (!blast) st.b = 0;
    // the plume: round puffs of steam roll out of the bell and spread over the water
    if (st.bt != null && t - st.bt < 3.2 && t >= st.bt) for (let k = 0; k < 7; k++) { const a = (t - st.bt) - k * 0.1; if (a < 0) continue; const f = 1 - Math.exp(-a * 1.6), x = 74 + f * (26 + k * 5), y = 64 - f * (3 + (k % 3) * 3) + (k % 2 ? 2 : -1), rr = Math.min(6, 1.5 + a * 3.2) * (a > 2.4 ? Math.max(0, (3.2 - a) / 0.8) : 1), tn = Math.round(10 - Math.min(3, a * 1.6));
      if (rr < 0.8) continue; const ri = Math.ceil(rr), hot = a < 0.5; for (let yy = -ri; yy <= ri; yy++) for (let xx = -ri; xx <= ri; xx++) { const d = xx * xx + yy * yy; if (d > rr * rr) continue; const lit = xx + yy < -rr * 0.5, sh = xx + yy > rr * 0.7;
        if (lit) D.px(x + xx, y + yy, 'dusk', hot ? 11 : 10, { e: 255 }); else D.px(x + xx, y + yy, hot ? 'linen' : 'lav', hot ? 10 : sh ? 9 : 11, { e: 255 }); } }
    // the boiler breathes a little steam from its stack
    for (let k = 0; k < 3; k++) { const a = (t * 0.5 + k / 3) % 1, x = 38 + a * 5 + Math.sin(a * 6 + k) * 1, y = 65 - a * 12, rr = 0.7 + a * 1.8; for (let yy = -Math.ceil(rr); yy <= Math.ceil(rr); yy++) for (let xx = -Math.ceil(rr); xx <= Math.ceil(rr); xx++) if (xx * xx + yy * yy <= rr * rr) D.px(x + xx, y + yy, 'linen', Math.round(8.5 - a * 2.5), { e: 255 }); }
    rs.mul[4] = blast ? 1 - (q - 0.68) / 0.18 : 0;
    if (blast) { const k = (q - 0.68) / 0.18; for (let r = 0; r < 3; r++) { const kk = k * 1.4 - r * 0.2; if (kk <= 0 || kk >= 1) continue; const rad = 10 + kk * 40, tn = Math.round(10 - kk * 5); for (let a = -0.55; a <= 0.55; a += 0.9 / rad) D.px(72 + Math.cos(a) * rad, 64 + Math.sin(a) * rad * 0.8, 'linen', tn, { e: 255 }); } }
    if (R() < 0.04) rs.burst('mist', 20 + R() * 110, GG.wl + 2, 1, { sp: 3, ang: -Math.PI / 2, spread: 0.4, life: 3 });
  },
});

// what each pixel room shows, in words (M.ROOM_D; docs/effects.md §R is generated from it)
const D_ = {
  taj: '月光下的白色陵墓：满月正好升在大圆顶后面，顶上细细的金色尖饰映在月亮上；洋葱圆顶、两座小亭、大拱门里一盏灯，两侧宣礼塔立在台基上，柏树成排，圆顶和塔顶的上沿镶着一道冷白的月光边；长水池里倒映着倒过来的陵墓，倒影最下面正是月亮的倒影，水面一道道晃动，月亮倒影两边碎光闪烁，拱门的暖光在倒影里一明一暗，岸边一排油灯摇曳；灵魂从水里慢慢升起，每隔一会儿三团魂光飞进拱门，墙面、镶边和水里的倒影一起泛起紫光，结出一枚灵魂碎片朝月亮飞走；守陵人提着灯沿池边巡夜',
  bigben: '雾夜的伦敦，看不见月亮和星星：钟楼的表盘在雾里发光，外面罩着一圈圈光晕，分针一圈圈转；转到整点大钟一摆、表盘一亮，声波一圈圈荡开，鸽子从钟楼上飞散又飞回；雾带一层层横着飘过议会大楼和街道，一近一远两盏煤气路灯各罩着一圈硬边光晕、灯火摇曳；议会大楼的尖塔和窗灯、烟囱冒烟；时不时下起细雨，雨丝经过灯下被照亮，湿石板和水洼上溅起小水圈，水洼倒映着钟楼；推车上堆着货箱和苹果，巡警踱步、钟响时掏出怀表对时',
  liberty: '黎明时从渡轮的栏杆望出去：天空从头顶的深蓝变成淡紫、粉红，海天交界一片金色，太阳在自由岛和曼哈顿之间刚露出半个，几道薄云横过日面；铜绿色的女神站在花岗岩基座和星形堡垒上，朝太阳的一侧镶着一道亮边，高举的火炬熊熊燃烧；火炬是一座灯塔，光束在港口上空转圈，每转到正对你时一阵强光；被照成粉色的云慢慢飘，海面上粉光金光闪烁，海鸥绕着她盘旋，远处轮船从太阳前驶过；曼哈顿的楼顶镶着金边，还有几扇窗亮着；水手靠在栏杆边，光束扫过时举起望远镜，船灯摇晃、旗子飘动',
  opera: '没有月亮的港湾夜里，浅色花岗岩台基上一片白色贝壳屋顶，台基左头是一段宽台阶；灯光秀一轮换一种颜色（粉、青、金、紫）：瓦面上投出斜条纹、扫过的光带或一圈圈光环，台基和码头也被照成同一种颜色，几道激光从屋顶后面射向夜空、慢慢摆动，港湾大桥的拱上彩灯一串串跑过；玻璃幕墙透出暖光；码头上一个街头小提琴手把琴夹在下巴下来回拉弓，音符从琴弦和大厅里飘起；码头上挂着彩灯，海里倒映着倒过来的浅色扇片；每隔一会儿烟花从海面升起炸开，整片屋顶从右到左被染成粉、青、金色，连同倒影一起亮上两三秒再褪回白色',
  goldengate: '夕阳下的红色悬索桥：装饰艺术风格的桥塔、主缆垂成弧线，桥面上一串钠灯，车灯来回流动，塔顶红灯一闪一闪；雾一层层从海面滚过，远处货轮从桥下驶过，海面倒映着夕阳和桥；岸边石码头上立着蒸汽雾笛和小锅炉，每隔一会儿看守人一拉链条，雾笛喷出一大团蒸汽、声波一圈圈荡开',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
