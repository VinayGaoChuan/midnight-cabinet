// ==== mc-pxroom-minib-eggs.js ====
(function () {
// 砸金蛋 (G008) · a temple-fair night stage. A red velvet backcloth with a scalloped valance and gold fringe, side drapes
// tied back with gold rope, strings of festoon bulbs that chase, two big red lanterns swaying on their cords, firecracker
// braids down both sides, a bronze gong on a lacquered stand (left) and an offering table with mandarins and incense (right),
// confetti on the boards. Three red-lacquer drum stools with gold studs carry a satin cushion each, and on each cushion a
// big golden egg. The eggs are drawn per pixel every frame from a precomputed egg map (sphere normals, a raised band of
// lucky clouds round the waist, a raised coin on the front, crack paths that grow outward from the hammer's point), so they
// rock, squash, crack, gleam and burst as clean pixel art lit by the stage's lamps like everything else. A burst egg keeps
// its jagged bottom half as a cup on the cushion; a pillar of light in the prize's quality colour shoots out of it and the
// prize pops out and floats above. The golden hammer (gold head, red lacquer handle, red silk ribbon) is in the front layer.
const M = window.MC, X = M.PXR; if (!X || !X.MINIB) return;
const MB = X.MINIB, { AW, AH, clamp, hash, mask } = MB, PK = X.PK, bay = X.bayer;
const TAU = Math.PI * 2, R = Math.random, E = { e: 255 };

// ───────── geometry (art px) ─────────
const EX = [75, 150, 225], EY = 92, ERX = 19, ERY = 24, ETOP = 68, EBOT = 116;
const GONG = { x: 33, y: 110, r: 13 };
const LAN = [{ x: 34, y: 27, len: 11, li: 0, ph: 0 }, { x: 266, y: 27, len: 11, li: 1, ph: 2.1 }];
const PRY = 55;   // where a prize floats (its centre)
// omen / quality colours of the show's four steps: 0 普通 steel · 1 稀有 teal · 2 史诗 violet · 3 传说 gold
const QM = [['iron', [196, 204, 217]], ['tile', [79, 143, 255]], ['arcane', [184, 107, 255]], ['fire', [255, 154, 60]]];   // the game's quality colours (SHOW.QC)
// prizes in MINI.eggs' EGGS order: 0 满满的积分 · 1 FEVER 预热 · 2 图纸 · 3 雏鸟 · 4 空的 · 5 蛇; the quality their light takes
const PQ = [2, 1, 3, 1, -1, -1];
const pqOf = (e) => ((e.prize | 0) >= 4 ? -1 : e.pq != null ? clamp(e.pq | 0, 0, 3) : PQ[e.prize | 0]);
const FEST = ['lamp', 'red', 'lamp', 'fire', 'lamp', 'candy'];   // festoon bulb colours, idle

// ───────── particle kinds of this stage (single pixels walking a ramp) ─────────
PK.egShell = { g: 190, drag: 0.4, ramp: ['gold', [11, 10, 9, 8, 8, 7, 6, 5]], bounce: 0.35, sz: 2 };
PK.egCoin = { g: 150, drag: 0.1, ramp: ['gold', [10, 7, 11, 8, 10, 7, 11, 8, 9, 6]], bounce: 0.45, sz: 2 };
PK.egSmoke = { g: -7, drag: 1.3, ramp: ['linen', [6, 5, 5, 4, 3, 2]], wob: 6 };
const conf = (m, a, b) => ({ g: 24, drag: 1.4, ramp: [m, [a, b, a, b - 1, a, b, a - 1, b - 1]], wob: 16, sz: 2 });
PK.egConfR = conf('red', 9, 6); PK.egConfG = conf('gold', 11, 7); PK.egConfP = conf('candy', 9, 6); PK.egConfT = conf('teal', 9, 6);
PK.egGlit = { g: -4, drag: 1, ramp: ['gold', [8, 10, 11, 10, 8, 6]], wob: 7, glow: 1 };
PK.egSpark = Object.assign({}, PK.spark, { light: null }); PK.egGold = Object.assign({}, PK.gold, { light: null }); PK.egSoul = Object.assign({}, PK.soul, { light: null });   // no light of their own (budget)
const CONF = ['egConfR', 'egConfG', 'egConfR', 'egConfP', 'egConfG', 'egConfT'];
['egSpk0', 'egSpk1', 'egSpk2', 'egSpk3'].forEach((k, q) => { PK[k] = { g: 70, drag: 0.7, ramp: [QM[q][0], [11, 11, 10, 9, 8, 7, 6]], glow: 1, trail: 1 }; });

// ───────── the egg map: computed once ─────────
// local pixel (lx, ly) relative to the egg centre, lx −22…21, ly −26…25. Per pixel: inside, sphere coords U/V, painted
// tone, normal, painted highlight, crack growth time (0 none), dark crack lip, glowing halo, cup class once burst
let EG = null;
const tri = (z) => 2 * Math.abs(z - Math.floor(z) - 0.5);
function eggGeo() {
  if (EG) return EG;
  const GW = 44, GH = 52, OX = 22, OY = 26, n = GW * GH;
  const G = { GW, GH, OX, OY, n, ins: new Uint8Array(n), U: new Float32Array(n), V: new Float32Array(n), tn: new Float32Array(n), nx: new Float32Array(n), ny: new Float32Array(n), hi: new Uint8Array(n), crk: new Uint16Array(n), lip: new Uint16Array(n), halo: new Uint16Array(n), cup: new Uint8Array(n), gl: new Float32Array(n), topE: new Uint8Array(n) };
  const idx = (lx, ly) => (lx < -OX || lx >= GW - OX || ly < -OY || ly >= GH - OY ? -1 : (ly + OY) * GW + lx + OX);
  const inside = (lx, ly) => { const i = idx(lx, ly); return i >= 0 && G.ins[i]; };
  for (let ly = -OY; ly < GH - OY; ly++) for (let lx = -OX; lx < GW - OX; lx++) {
    const v = (ly + 0.5) / ERY; if (Math.abs(v) >= 1) continue; const U = (lx + 0.5) / (ERX * (1 + 0.18 * v)); if (U * U + v * v > 1) continue;
    const i = idx(lx, ly); G.ins[i] = 1; G.U[i] = U; G.V[i] = v; G.gl[i] = U * 0.75 + v * 0.55;
  }
  // relief heights: a band of lucky clouds round the waist (a ribbon with a wave cut along it and a three-lobed cloud head
  // every 7 columns of the unwrapped surface, up / down in turn), a coin with a square hole on the front in a sunk ring
  const H = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    if (!G.ins[i]) continue; const lx = (i % GW) - OX, ly = Math.floor(i / GW) - OY, U = G.U[i];
    const s = Math.sqrt(Math.max(0, 1 - U * U)), yc = 4.6 + 2.2 * s, r = ly + 0.5 - (yc - 5.5), c = Math.asin(clamp(U, -1, 1)) * 16, cm = ((c % 14) + 14) % 14;
    if (r >= 0 && r < 11) {
      // a raised ribbon with a wave cut along it; cloud heads of three lobes rise off it, up and down in turn
      let h = r >= 3.8 && r < 7.2 ? 1 : 0;
      if (h && Math.abs(r - (5.5 + 0.9 * Math.sin(cm / 14 * TAU))) < 0.42) h = 0;
      [[3.5, 3.2, 1], [10.5, 7.8, -1], [17.5, 3.2, 1], [-3.5, 7.8, -1]].forEach(([pc, pr, sd]) => {
        const l1 = Math.hypot(cm - pc + 2.2, r - pr), l2 = Math.hypot(cm - pc, r - pr + 1.4 * sd), l3 = Math.hypot(cm - pc - 2.2, r - pr);
        if (l1 < 1.9 || l2 < 2 || l3 < 1.9) h = 1; if (Math.hypot(cm - pc, r - pr + 0.9 * sd) < 0.6) h = 0; });
      H[i] = h; continue;
    }
    const dx = lx + 0.5, dy = ly + 0.5 + 11, d = Math.hypot(dx, dy), ax = Math.abs(dx), ay = Math.abs(dy), m = Math.max(ax, ay);
    if (d < 8.4) { let h = 1; if (d >= 7.6) h = -1; else if (d >= 6.3) h = 2; else if (d >= 5.6) h = 1; if (m <= 1.6) h = -1; else if (m <= 2.7) h = 2;
      [[0, -4.3], [0, 4.3], [-4.3, 0], [4.3, 0]].forEach(([a, b]) => { if (Math.abs(dx - a) < 0.9 && Math.abs(dy - b) < 0.9) h = 2; }); H[i] = h; }
  }
  const hAt = (lx, ly) => { const i = idx(lx, ly); return i >= 0 && G.ins[i] ? H[i] : 0; };
  for (let i = 0; i < n; i++) {
    if (!G.ins[i]) continue; const lx = (i % GW) - OX, ly = Math.floor(i / GW) - OY, U = G.U[i], v = G.V[i], e2 = U * U + v * v, h = H[i], hul = hAt(lx - 1, ly - 1), hdr = hAt(lx + 1, ly + 1);
    let tn = 5.6 - U * 1.45 - v * 1.7, nx = U * 0.95, ny = v * 0.95;
    if (e2 > 0.8) tn -= 0.9; if (e2 > 0.93) tn -= 0.8;
    if (v > 0.4 && U > -0.3 && e2 > 0.74 && e2 < 0.93) tn += 1.4;   // warm bounce off the satin, lower right rim
    if (h > hul) { tn += 1.9; nx -= 0.35; ny -= 0.35; } else if (h < hul) { tn -= 2.1; nx += 0.2; ny += 0.2; }
    if (h > hdr && h >= hul) tn -= 1.1;
    tn += h * 0.3;
    // a big painted specular highlight up-left, a small second one low right
    const du = (U + 0.46) / 0.12, dv = (v + 0.55) / 0.14, dd = du * du + dv * dv, du2 = (U - 0.5) / 0.07, dv2 = (v - 0.36) / 0.07;
    if (dd < 1) G.hi[i] = 2; else if (dd < 2.3) G.hi[i] = 1; else if (du2 * du2 + dv2 * dv2 < 1) G.hi[i] = 1;
    const k = Math.hypot(nx, ny); if (k > 0.97) { nx *= 0.97 / k; ny *= 0.97 / k; }
    G.tn[i] = tn; G.nx[i] = nx; G.ny[i] = ny;
  }
  // crack paths: zig-zag branches from the point the hammer strikes (top front), each pixel stamped with its growth time
  const rr = X.rng(8117); let T = 0;
  const mark = (x, y, tm) => { const i = idx(x, y); if (i >= 0 && G.ins[i] && (!G.crk[i] || G.crk[i] > tm)) G.crk[i] = tm; };
  const branch = (x, y, a, len, tm, dep) => {
    let seg = 0;
    while (len > 0) { const sl = 2 + Math.floor(rr() * 3), aa = a + (seg % 2 ? 0.62 : -0.62) * (0.55 + rr() * 0.6);
      for (let s = 0; s < sl && len > 0; s++, len--) { x += Math.sin(aa); y += Math.cos(aa); tm++; if (!inside(Math.floor(x), Math.floor(y))) { T = Math.max(T, tm); return; } mark(Math.floor(x), Math.floor(y), tm); }
      seg++; a += (rr() - 0.5) * 0.35;
      if (dep < 2 && rr() < 0.2) branch(x, y, a + (rr() < 0.5 ? -1 : 1) * (0.7 + rr() * 0.45), Math.floor(len * 0.5), tm, dep + 1); }
    T = Math.max(T, tm);
  };
  mark(0, -21, 1); mark(-1, -21, 1);
  [[-1.25, 17], [-0.55, 27], [0.08, 33], [0.7, 25], [1.3, 16], [2.3, 7], [-2.2, 7]].forEach(([a, l]) => branch(0, -20.5, a, l, 1, 0));
  G.T = T;
  for (let i = 0; i < n; i++) { const tm = G.crk[i]; if (!tm) continue; const lx = (i % GW) - OX, ly = Math.floor(i / GW) - OY;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const j = idx(lx + a, ly + b); if (j < 0 || !G.ins[j] || G.crk[j]) continue; const near = Math.abs(a) <= 1 && Math.abs(b) <= 1 && (a === 0 || b === 0 || (a > 0 && b > 0));
      if (near) { if (!G.lip[j] || G.lip[j] > tm) G.lip[j] = tm; } else if (!G.halo[j] || G.halo[j] > tm) G.halo[j] = tm; } }
  // once burst: the bottom half is a cup with a jagged rim, seen a little from above (front arc low, back arc high)
  for (let i = 0; i < n; i++) {
    if (!G.ins[i]) continue; const lx = (i % GW) - OX, ly = Math.floor(i / GW) - OY, U = G.U[i], s = Math.sqrt(Math.max(0, 1 - U * U)), jg = 2.4 * tri(U * 3.3 + 0.15), jb = 2 * tri(U * 2.7 + 0.6);
    const yf = -1.5 + 3.4 * s - jg, yb = -1.5 - 3.4 * s - jb, y = ly + 0.5;
    if (y > yf + 1) G.cup[i] = 1; else if (y > yf) G.cup[i] = 3; else if (y >= yb + 1) G.cup[i] = 2; else if (y >= yb) G.cup[i] = 4; else G.cup[i] = 0;
    if (y <= yf && y > yf - 1.2) G.topE[i] = 1;
  }
  // the outline ring just outside the egg (selective: one step up where the egg is below / right of it, black elsewhere),
  // and which of its pixels still border the cup once burst
  G.rim = new Uint8Array(n); G.rimC = new Uint8Array(n);
  for (let ly = -OY; ly < GH - OY; ly++) for (let lx = -OX; lx < GW - OX; lx++) { const i = idx(lx, ly); if (G.ins[i]) continue;
    const nb = [[0, 1], [1, 0], [0, -1], [-1, 0]].map(([a, b]) => idx(lx + a, ly + b)).map(j => (j >= 0 && G.ins[j] ? j : -1));
    if (nb.every(j => j < 0)) continue; G.rim[i] = nb[0] >= 0 || nb[1] >= 0 ? 1 : 2; if (nb.some(j => j >= 0 && (G.cup[j] === 1 || G.cup[j] === 3))) G.rimC[i] = 1; }
  return (EG = G);
}
// the cushion's front lip hides the egg's lowest rows (it sits in a dent)
const CLIP = new Int16Array(61).map((_, k) => { const a = Math.abs(k - 30); return 113 - (a > 11 ? 1 : 0) - (a > 15 ? 1 : 0); });

function drawEgg(D, t, i, e, st) {
  const G = eggGeo(), cx = EX[i], hit = clamp(e.hit || 0, 0, 1), open = !!e.open;
  const wob = e.wob != null ? e.wob : 0.4 * Math.sin(t * 1.6 + i * 2.1) * (0.55 + 0.45 * Math.sin(t * 0.37 + i * 1.3));
  const cr = open ? 0 : clamp(e.cr || 0, 0, 1), crT = cr * G.T, q = clamp(e.q | 0, 0, 3), om = QM[q][0], pulse = 0.5 + 0.5 * Math.sin(t * 9 + i);
  const trem = cr > 0.5 && !open ? Math.round(Math.sin(t * 47 + i) * (cr - 0.2) * 1.2) : 0, th = wob * 0.13, c = Math.cos(th), s = Math.sin(th), sx = 1 + 0.12 * hit, sy = 1 - 0.15 * hit;
  // gleam: a diagonal band sweeping across; idle every ~4.7 s, hovered: one at once, then every 1.1 s
  const hs = st.hs[i], gph = hs != null ? ((t - hs) % 1.1) / 0.45 : ((t + i * 1.57) % 4.7) / 0.5, gpos = -1.45 + gph * 2.9, gleam = gph < 1;
  const oq = open ? pqOf(e) : -1, qa = oq >= 0 ? oq : 0, om2 = QM[qa][0], bad = open && oq < 0;
  const O = {};
  for (let oy = ETOP - 5; oy <= EBOT; oy++) {
    const wy = oy + 0.5 - EBOT;
    for (let ox = cx - 25; ox <= cx + 25; ox++) {
      if (oy >= CLIP[ox - cx + 30]) continue;
      const wx = ox + 0.5 - cx - trem, rx = (wx * c + wy * s) / sx, ry = (-wx * s + wy * c) / sy + (EBOT - EY), lx = Math.floor(rx), ly = Math.floor(ry);
      if (lx < -22 || lx >= 22 || ly < -26 || ly >= 26) continue; const k = (ly + 26) * 44 + lx + 22;
      if (!G.ins[k]) { const r = G.rim[k]; if (r && (!open || G.rimC[k])) D.px(ox, oy, 'gold', r === 1 ? 1.6 : 0, E); continue; }
      if (open) { const cp = G.cup[k];
        if (!cp) continue;
        if (cp === 2) { const f = clamp((ly + 0.5 + 5) / 7, 0, 1); if (bad) D.px(ox, oy, 'gold', 1.5 + f * 1.5); else D.px(ox, oy, om2, 4.6 + f * 4 + (bay(ox, oy) < 0.5 ? 0.6 : 0), E); continue; }
        if (cp === 3) { D.px(ox, oy, 'gold', bad ? 7.5 : 10.4, bad ? undefined : E); continue; }
        if (cp === 4) { D.px(ox, oy, 'gold', bad ? 4 : 8, bad ? undefined : E); continue; } }
      if (G.hi[k]) { D.px(ox, oy, 'gold', G.hi[k] === 2 ? 11 : 9.6, E); continue; }
      if (cr > 0) {
        const ct = G.crk[k]; if (ct && ct <= crT) { D.px(ox, oy, om, clamp(8.6 + cr * 1.6 + pulse * cr, 0, 11), E); continue; }
        const lp = G.lip[k]; if (lp && lp <= crT) { D.px(ox, oy, 'gold', 0.8); continue; }
        const hl = G.halo[k]; if (hl && hl <= crT && !G.lip[k]) { const nx = G.nx[k], ny = G.ny[k]; O.n = [nx * c - ny * s, nx * s + ny * c]; D.px(ox, oy, 'gold', G.tn[k] + 1 + cr * 1.4, O); continue; }
      }
      if (gleam && Math.abs(G.gl[k] - gpos) < 0.085) { D.px(ox, oy, 'gold', 10.4, E); continue; }
      const nx = G.nx[k], ny = G.ny[k]; O.n = [nx * c - ny * s, nx * s + ny * c];
      D.px(ox, oy, 'gold', G.tn[k] + (open ? 0.3 : 0), O);
    }
  }
}
// the burst top: spins up and away (the part of the egg above the jagged cut)
function drawTop(D, t, i, e) {
  const G = eggGeo(), a = e.openAge || 0; if (a > 0.9) return; const dir = i === 0 ? -1 : i === 2 ? 1 : (i + 1) % 2 ? 1 : -1;
  const px = EX[i] + dir * 70 * a, py = EY - 12 - 210 * a + 120 * a * a, th = dir * 9 * a, c = Math.cos(th), s = Math.sin(th);
  if (py < -30) return;
  D.beg();
  for (let oy = Math.floor(py - 26); oy <= py + 26; oy++) for (let ox = Math.floor(px - 26); ox <= px + 26; ox++) {
    const wx = ox + 0.5 - px, wy = oy + 0.5 - py, lx = Math.floor(wx * c + wy * s), ly = Math.floor(-wx * s + wy * c - 12);
    if (lx < -22 || lx >= 22 || ly < -26 || ly >= 26) continue; const k = (ly + 26) * 44 + lx + 22; if (!G.ins[k] || G.cup[k] === 1 || G.cup[k] === 3) continue;
    // it flies through the burst's own light: painted shading, no per-pixel lighting
    D.px(ox, oy, 'gold', G.topE[k] ? 10.5 : G.hi[k] ? 10 : G.tn[k] + 1.4 + (G.crk[k] ? -3 : 0), E);
  }
  D.end();
}

// ───────── prizes: small sprites, lit by their own glow ─────────
function mkSpr(w, h, f) {
  const m = new Array(w * h).fill(null), tn = new Float32Array(w * h);
  const P = { w, h, px(x, y, mat, t) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; m[y * w + x] = mat; tn[y * w + x] = t; },
    ell(cx, cy, rx, ry, mat, fn) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1) P.px(x, y, mat, fn(u, v)); } },
    mask(x0, y0, rows, pal) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const p = pal[r[i]]; if (p) P.px(x0 + i, y0 + j, p[0], typeof p[1] === 'function' ? p[1](i, j) : p[1]); } }); } };
  f(P);
  // a dark rim round the whole sprite (one step above black on its own material)
  const o = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (m[y * w + x]) continue; let nb = null; [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(([a, b]) => { const xx = x + a, yy = y + b; if (!nb && xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) nb = m[yy * w + xx]; }); if (nb) o.push([x, y, nb]); }
  o.forEach(([x, y, mat]) => { m[y * w + x] = mat; tn[y * w + x] = 1; });
  return { w, h, m, tn };
}
const SPR = [];
// 0 a heap of gold coins with an ingot on top
SPR[0] = mkSpr(27, 19, (P) => {
  const coin = (x, y) => { for (let i = 1; i < 6; i++) P.px(x + i, y + 3, 'gold', i < 3 ? 4.5 : 3.5); P.px(x, y + 2, 'gold', 4); P.px(x + 6, y + 2, 'gold', 3);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 7; i++) { if ((j === 0 || j === 2) && (i === 0 || i === 6)) continue; P.px(x + i, y + j, 'gold', j === 0 ? 9.2 - i * 0.2 : j === 1 ? 7.6 - i * 0.2 : 6.4); }
    P.px(x + 3, y + 1, 'gold', 3); P.px(x + 1, y, 'gold', 10.6); };
  [[10, 6], [5, 8], [15, 8], [2, 10], [9, 10], [19, 10], [6, 12], [13, 12], [0, 14], [20, 13], [10, 15], [3, 15], [16, 15]].forEach(([x, y]) => coin(x, y));
  P.mask(7, 0, ['.....aaa.....', 'a...abbba...a', 'ab.abbbbba.ba', 'abbaaaaaaabba', 'cbbbbbbbbbbbc', '.ccbbbbbbbcc.', '...ccccccc...'], { a: ['gold', 10.6], b: ['gold', (i, j) => 8.4 - i * 0.12 - j * 0.15], c: ['gold', 5] });
  P.px(12, 1, 'gold', 11); P.px(8, 3, 'gold', 11);
});
// 1 the FEVER gem: a violet brilliant, lit from the upper left
SPR[1] = mkSpr(17, 15, (P) => P.mask(1, 0, [
  '....aBBBBBa....', '...aCTTTTTDa...', '..aCCTTTTTDDa..', '.aCCcTTTTTdDDa.', 'aCCccTTTTTddDDa', 'aGGGgggggggggga', '.aLLlMMMMMrRRa.', '..aLlMMMMMrRa..', '...alMMMMMra...', '....alMMMra....', '.....alMra.....', '......aMa......', '.......a.......'],
  { a: ['arcane', 2.5], B: ['arcane', 11], C: ['arcane', 9], T: ['arcane', 10], D: ['arcane', 6], c: ['arcane', 8], d: ['arcane', 5], G: ['arcane', 10], g: ['arcane', 8], L: ['arcane', 8.5], l: ['arcane', 7], M: ['arcane', 6], r: ['arcane', 4.5], R: ['arcane', 3.5] }));
// 2 a blueprint scroll: two rollers with gold knobs, a blue sheet with a grid, a white drawing and a red seal
SPR[2] = mkSpr(26, 19, (P) => {
  for (let y = 3; y < 16; y++) for (let x = 4; x < 22; x++) P.px(x, y, 'tile', (x - 4) % 3 === 0 || (y - 3) % 3 === 0 ? 7 : 5.4 - (y > 13 ? 0.8 : 0) + (y < 5 ? 0.8 : 0));
  const W = (x, y) => P.px(x, y, 'tile', 12);
  for (let x = 8; x <= 17; x++) W(x, 11); for (let y = 7; y <= 11; y++) { W(9, y); W(16, y); } for (let k = 0; k <= 5; k++) { W(12.5 - k, 5 + k * 0.6); W(12.5 + k, 5 + k * 0.6); }
  for (let y = 8; y <= 11; y++) W(12, y); W(13, 8); W(14, 9); W(7, 13); W(8, 13); W(17, 13); W(18, 13);
  [[5, 6], [6, 5], [7, 6], [6, 7]].forEach(([x, y]) => W(x, y));
  P.ell(19, 14, 2, 2, 'red', (u, v) => 7 - u - v); P.px(18, 13, 'red', 9.5); P.px(18, 16, 'red', 5); P.px(20, 17, 'red', 4.5);
  [[1, 3], [22, 3]].forEach(([x0]) => { for (let y = 2; y < 17; y++) { P.px(x0, y, 'paper', 8.6); P.px(x0 + 1, y, 'paper', 7.2); P.px(x0 + 2, y, 'paper', 5); if (y % 4 === 1) P.px(x0 + 1, y, 'paper', 6); }
    [1, 17].forEach(y => { P.px(x0, y, 'gold', 10); P.px(x0 + 1, y, 'gold', 8); P.px(x0 + 2, y, 'gold', 6); P.px(x0 + 1, y === 1 ? 0 : 18, 'gold', 7); }); });
});
// 3 a fluffy chick
SPR[3] = mkSpr(18, 17, (P) => P.mask(0, 0, [
  '......y.y.........', '.....yYyYy........', '....yYYYYYYy......', '...yYYYYYYYYy.....', '...yYYYYYeeYy.....', '..yYYYYYYehYYBB...', '..yYYYYYYppYybbb..', '..yYYYYYYYYYyb....', '.yYYYwwwYYYYYYy...', 'yYYYwwwwwYYYYYYy..', 'yYYYYwwwwYYYYYYy..', 'yYYYYYwwYYYYYYYy..', '.yYYYYYYYYYYYYy...', '..yyYYYYYYYYyy....', '....yyyyyyyy......', '.....f....f.......', '....fff..fff......'],
  { Y: ['lamp', (i, j) => 10 - i * 0.07 - j * 0.12], y: ['lamp', 6.4], w: ['lamp', 7.2], e: ['ink', 0], h: ['bone', 10.5], p: ['candy', 7.5], B: ['fire', 7.8], b: ['fire', 5.6], f: ['fire', 6.2] }));
const MOTH = [mask(['W.......W', 'Ww.....wW', 'www.b.www', '.wwwbwww.', '...wbw...', '....b....']), mask(['....b....', '...wbw...', '.wwwbwww.', 'www.b.www', 'Ww.....wW', 'W.......W'])];
// blit a sprite centred at (cx, cy), scaled (sx < 0: its back, mirrored and darker)
function blit(D, S, cx, cy, sx, sy, dk) {
  const ax = Math.abs(sx); if (ax < 0.05 || sy < 0.05) return; const hw = S.w * ax / 2, hh = S.h * sy / 2;
  for (let y = Math.floor(cy - hh); y <= Math.ceil(cy + hh); y++) for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
    let u = Math.floor((x + 0.5 - cx) / ax + S.w / 2); const v = Math.floor((y + 0.5 - cy) / sy + S.h / 2); if (u < 0 || v < 0 || u >= S.w || v >= S.h) continue; if (sx < 0) u = S.w - 1 - u;
    const m = S.m[v * S.w + u]; if (m) D.px(x, y, m, S.tn[v * S.w + u] - (sx < 0 ? 1.5 : 0) + (dk || 0), E); }
}

// ───────── the snake (5): a red body in an S out of the cup, jaws open, lunging at you ─────────
function snake(D, t, cx, a) {
  const ext = a < 0.14 ? Math.sin(a / 0.14 * Math.PI / 2) * 1.15 : 1 + 0.15 * Math.exp(-(a - 0.14) * 9) * Math.cos((a - 0.14) * 30), sw = Math.sin(t * 3.2) * 2;
  const pts = []; for (let k = 0; k <= 26; k++) { const q = k / 26 * ext; pts.push([cx + 2 + Math.sin(q * 5.2) * 7 * q - q * q * 12 + sw * q, 100 - q * 40]); }
  D.beg();
  pts.forEach(([x, y], k) => { const r = 2.6 - k * 0.03; for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = Math.hypot(xx, yy); if (d > r) continue; const belly = xx > 0.8, spot = (k % 5 === 2) && d < 1.3;
    D.px(Math.round(x + xx), Math.round(y + yy), 'red', spot ? 3 : belly ? 8.5 : 6.2 - xx * 0.4 - yy * 0.2, { n: [xx / 3, yy / 3] }); } });
  const [hx, hy] = pts[pts.length - 1], op = 2 + Math.round(Math.abs(Math.sin(t * 6)) * 1.5);
  for (let yy = -3; yy <= 2; yy++) for (let xx = -5; xx <= 3; xx++) { if (xx * xx / 20 + yy * yy / 7 > 1) continue; D.px(hx + xx, hy + yy - op, 'red', 6.8 - yy * 0.4 - xx * 0.15, { n: [xx / 5, yy / 3] }); }
  for (let xx = -4; xx <= 3; xx++) { D.px(hx + xx, hy + 2, 'red', 5.5); if (xx > -3) D.px(hx + xx, hy + 3, 'red', 4); }
  for (let yy = hy - op + 2; yy < hy + 2; yy++) for (let xx = -4; xx <= 1; xx++) D.px(hx + xx, yy, 'red', 1.5);
  D.end();
  D.px(hx - 4, hy - op + 2, 'bone', 10, E); D.px(hx - 2, hy - op + 2, 'bone', 10, E); D.px(hx - 3, hy + 1, 'bone', 9, E);
  D.px(hx - 1, hy - op - 2, 'lamp', 10, E); D.px(hx, hy - op - 2, 'fire', 6, E);
  if (Math.sin(t * 11) > 0) { for (let k = 1; k <= 4; k++) D.px(hx - 5 - k, hy - 1 + (k > 3 ? 0 : 0), 'red', 8.5, E); D.px(hx - 10, hy - 2, 'red', 8, E); D.px(hx - 10, hy, 'red', 8, E); }
}

// ───────── the golden hammer: grip at (x, y), handle along a (0 = up, −π/2 = pointing left) ─────────
// local u along the handle from the grip, w across it. Head: a gold barrel across the handle, hoops, flat striking faces.
const HS = 1.3;
function hamShape(u, w) {
  u /= HS; w /= HS; const aw = Math.abs(w);
  if (u >= 22.5 && u < 33.5 && aw < 8.6) { const cu = (u - 28) / 5.5; if (aw > 7.2 && Math.abs(cu) > 0.78) return null;
    let tn = 5.6 - cu * 2, nu = cu * 0.85, nw = (w / 8.6) * 0.3, m = 'gold';
    if (aw > 7.6) { tn = 8 - cu * 1.6; nw = Math.sign(w) * 0.7; nu *= 0.5; } else if (aw > 5 && aw < 6.1) tn += 2.2; else if (aw >= 6.1 && aw < 6.8) tn -= 2.4;
    else if (aw < 2.2 && Math.abs(cu) < 0.46) { m = 'red'; tn = 7 - cu * 2 - w * 0.4; }
    return [m, tn, nu, nw]; }
  if (u >= 20 && u < 22.5 && aw < 2.4) return ['gold', 7.8 - (u - 20) * 0.5 - w * 0.3, 0, w / 2.4 * 0.8];
  if (u >= 0 && u < 20 && aw < 1.6) { const k = w / 1.6; let tn = 5.8 - k * 1.7; if (Math.abs(k + 0.4) < 0.28) tn += 2.4; if (u < 8 && Math.floor(u + w * 0.9 + 60) % 3 === 0) tn -= 2.4; return ['red', tn, 0, k * 0.9]; }
  if (u >= -3.4 && u < 0 && aw < 2.3) return ['gold', 7.2 - (aw > 1.4 ? 1.4 : 0) - (u < -2.5 ? 1.2 : 0), -0.6, w / 2.3 * 0.7];
  return null;
}
function hamPass(D, gx, gy, a, ghost) {
  const dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a), O = {};
  if (!ghost) D.beg();
  // the hammer's own box (pommel to head, ±head half-length), turned
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; [[-4.6 * HS, -8.8 * HS], [-4.6 * HS, 8.8 * HS], [33.8 * HS, -8.8 * HS], [33.8 * HS, 8.8 * HS]].forEach(([u, w]) => { const X1 = gx + u * dx + w * px, Y1 = gy + u * dy + w * py; x0 = Math.min(x0, X1); x1 = Math.max(x1, X1); y0 = Math.min(y0, Y1); y1 = Math.max(y1, Y1); });
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
    const rx = x + 0.5 - gx, ry = y + 0.5 - gy, u = rx * dx + ry * dy; if (ghost && u < 21 * HS) continue; const w = rx * px + ry * py, s = hamShape(u, w); if (!s) continue;
    if (ghost) { if (bay(x, y) > 0.9 - ghost * 0.24) continue; D.px(x, y, 'gold', 8.6 - ghost * 1.3, E); continue; }
    O.n = [s[2] * dx + s[3] * px, s[2] * dy + s[3] * py]; D.px(x, y, s[0], s[1], O);
  }
  if (!ghost) D.end();
}
function hammer(D, t, H, st) {
  const a = H.a || 0, gx = H.x, gy = H.y, sm = clamp(H.smear || 0, 0, 1), prev = st.ha == null ? a : st.ha, dir = H.w != null ? (Math.sign(H.w) || -1) : Math.abs(a - prev) > 0.02 ? Math.sign(a - prev) : -1; st.ha = a;
  if (sm > 0.05) for (let g = 3; g >= 1; g--) hamPass(D, gx, gy, a - dir * g * 0.2 * sm, g);
  hamPass(D, gx, gy, a, 0);
  // the red silk ribbon: a bow at the neck, two tails that stream and flutter
  const dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a), kx = gx + dx * 20.6 * HS, ky = gy + dy * 20.6 * HS;
  [-1, 1].forEach(sd => { for (let yy = -1; yy <= 1; yy++) for (let xx = -2; xx <= 2; xx++) { if (xx * xx / 5 + yy * yy / 2 > 1) continue; D.px(kx + px * sd * 3.6 + xx, ky + py * sd * 3.6 + yy, 'red', 7.2 - yy * 0.8 - xx * 0.3); } });
  D.px(kx, ky, 'red', 9); D.px(kx + 1, ky, 'red', 6);
  const tr = Math.atan2(-dir * py, -dir * px);
  [0, 1].forEach(j => { let x = kx, y = ky; for (let s = 1; s <= 13; s++) { const base = Math.PI / 2 + (j ? 0.4 : -0.3), ang = base + (tr - base) * sm * 0.85 + 0.45 * Math.sin(t * 8 + s * 0.7 + j * 1.9) * (0.4 + s / 13);
    x += Math.cos(ang); y += Math.sin(ang); const tw = (s + Math.floor(t * 10)) % 4 === 0; D.px(x, y, 'red', (tw ? 8.8 : 6.8) - s * 0.12, { n: [0, -0.3] }); if (s < 8) D.px(x + 1, y, 'red', 4.5 - s * 0.1); } });
}

// ───────── the gong: a bronze disc with a raised rim and a boss; ringing, rings of light run over it ─────────
let GGL = null;
function gongGeo() { if (GGL) return GGL; const L = [], r = GONG.r; for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const dx = x + 0.5, dy = y + 0.5, d = Math.hypot(dx, dy); if (d <= r + 0.4) L.push([x, y, d, dx / (d || 1), dy / (d || 1), X.vnoise(x / 2.2 + 9, y / 2.2 + 9, 3)]); } return (GGL = L); }
function gong(D, t, amp) {
  const sh = amp > 0.05 ? Math.round(Math.sin(t * 57 + 0.4) * amp * 1.5) : 0, cx = GONG.x + sh, cy = GONG.y, r = GONG.r, O = {};
  gongGeo().forEach(([x, y, d, ux, uy, tx]) => {
    let tn, n;
    if (d > r - 1.9) { const k = (d - (r - 1.9)) / 1.9, ga = Math.atan2(uy, ux); tn = 8 - k * 2 + (ga > -2.7 && ga < -1.9 ? 2.4 : 0) - (ga > 0.4 && ga < 1.6 ? 1.4 : 0); n = [ux * (k * 1.2 - 0.3), uy * (k * 1.2 - 0.3)]; }
    else if (d > r - 2.8) { tn = 2.6; n = [ux * -0.4, uy * -0.4]; }
    else if (d < 3.7) { tn = 8.4 - (ux + uy) * d * 0.35; n = [ux * d / 3.7 * 0.85, uy * d / 3.7 * 0.85]; if (d > 3) tn -= 1.5; if (x === -2 && y === -2) tn = 10.5; }
    else { tn = 6 + Math.round((tx - 0.5) * 2.4) * 0.6 + (Math.abs(d - 6.5) < 0.5 || Math.abs(d - 9.3) < 0.5 ? -1 : 0); n = [ux * 0.12, uy * 0.12]; }
    let e = 0; if (amp > 0.05) for (let k = 0; k < 3; k++) { const rho = 1.5 + ((t * 30 + k * 4.4) % 11.5); if (Math.abs(d - rho) < 0.62) { tn += 3.2 * amp; if (amp > 0.35) e = 1; } }
    O.n = n; if (e) D.px(cx + x, cy + y, 'brass', Math.min(10, tn), E); else D.px(cx + x, cy + y, 'brass', tn, O);
  });
}

let LB = null;
function lanBody() {
  if (LB) return LB; LB = [];
  for (let y = -12; y <= 12; y++) { const v = (y + 0.5) / 12.6, s = Math.sqrt(Math.max(0, 1 - v * v));
    for (let x = -12; x <= 12; x++) { const u = (x + 0.5) / 12.2; if (u * u + v * v > 1) continue;
      let rib = 0; for (let k = -3; k <= 3; k++) { const rx = 12.2 * Math.sin(k * Math.PI / 8) * s; if (Math.abs(x + 0.5 - rx) < 0.5) rib = 1; }
      const band = Math.abs(Math.abs(v) - 0.8) < 0.05, core = u * u * 1.3 + v * v < 0.2;
      const lit = band ? ['gold', 7.6] : core && !rib ? ['fire', 8.4 - (u * u + v * v) * 6] : ['red', 8.9 - 3.4 * u * u - 2.4 * v * v - (rib ? 1.8 : 0)];
      LB.push([x, y, lit[0], lit[1], band ? 'gold' : 'red', band ? 5 : 3.4 - (rib ? 1 : 0), u * 0.8, v * 0.8]); } }
  return LB;
}
// ───────── lanterns: ribbed red paper lit from inside (follows its light's flicker), gold caps, a tassel ─────────
function lantern(D, t, L, on, kick) {
  const sw = Math.sin(t * 1.25 + L.ph) * 0.9 + kick * Math.sin(t * 10) * 2.2, cy = L.y + L.len + 14, bx = L.x + sw, lag = Math.sin(t * 1.25 + L.ph - 0.7) * 1.1 + kick * Math.sin(t * 10 - 1) * 1.5;
  for (let y = L.y; y < cy - 14; y++) D.px(L.x + sw * (y - L.y) / (cy - L.y), y, 'red', 3.2);
  const G = on ? { e: L.li + 1 } : null, O = {}, X0 = Math.round(bx);
  D.beg();
  lanBody().forEach(([x, y, m, tn, m0, t0, nx, ny]) => { if (on) D.px(X0 + x, cy + y, m, tn, G); else { O.n = [nx, ny]; D.px(X0 + x, cy + y, m0, t0, O); } });
  for (let x = -6; x <= 6; x++) { D.px(X0 + x, cy - 14, 'gold', 8.2, { n: [0, -0.7] }); D.px(X0 + x, cy - 13, 'gold', 6); D.px(X0 + x, cy - 12, 'gold', 3.6); D.px(X0 + x, cy + 12, 'gold', 7.4); D.px(X0 + x, cy + 13, 'gold', 4.4); }
  D.end();
  // tassel: a gold bead, a fall of red strands that lags the swing
  D.px(X0, cy + 14, 'gold', 8.8); D.px(X0 + 1, cy + 14, 'gold', 6); D.px(X0, cy + 15, 'gold', 5.6); D.px(X0 + 1, cy + 15, 'gold', 4);
  for (let s = -2; s <= 2; s++) for (let k = 0; k < 10; k++) D.px(X0 + s + lag * k / 10 + (s < 0 ? 0 : 1) - 0.5, cy + 16 + k, 'red', (s === -1 ? 7.6 : s === 2 ? 4.2 : 6) - k * 0.15);
}

// ───────── the burst: a pillar of light out of the cup, silk streamers ─────────
// pillar: hard bands (white core, the quality colour, a dithered fringe), light rising through it in bands, wide at the
// burst and settling to a steady column; at the mouth of the cup the light spills over as a flat ring
function pillar(D, t, cx, age, m, rs) {
  const top = age < 0.12 ? 104 - age / 0.12 * 104 : 0, w = 5.2 + 5.5 * Math.exp(-age * 3) + 0.6 * Math.sin(t * 7), rise = Math.floor(t * 64);
  for (let y = Math.floor(top); y < 102; y++) { const flare = y > 84 ? (y - 84) / 18 * 3 : 0, ww = w + flare;
    for (let x = Math.floor(cx - ww - 2); x <= cx + ww + 2; x++) { const d = Math.abs(x + 0.5 - cx) / ww; if (d > 1.2) continue; const band = ((y + rise) % 9) < 2;
      if (d < 0.26) D.px(x, y, m, 11, E); else if (d < 0.55) D.px(x, y, m, band ? 11 : 10, E); else if (d < 0.82) { if (bay(x, y) < (band ? 1 : 0.7)) D.px(x, y, m, band ? 9.4 : 8.4, E); } else if (bay(x, y) < (band ? 0.45 : 0.18)) D.px(x, y, m, 7.4, E); } }
  const rr = 13 + 6 * Math.exp(-age * 4);
  for (let a = 0; a < TAU; a += 0.5 / rr) { const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(90 + Math.sin(a) * rr * 0.22); if (Math.sin(a) < 0 && bay(x, y) < 0.6) D.px(x, y, m, 9.5, E); }
  if (R() < 0.6) rs.burst('glint', cx + (R() - 0.5) * w * 2, 16 + R() * 72, 1, { sp: 6, life: 0.5 });
}
// streamers: silk ribbons shot out of the burst, falling with drag, fluttering along their length
function streamers(D, t, cx, age, seed) {
  if (age > 2.4) return; const k0 = 1.5, g = 150;
  for (let j = 0; j < 7; j++) {
    const a = -1.35 + j * 0.45 + (hash(j, seed, 3) - 0.5) * 0.3, sp = 150 + hash(j, seed, 5) * 90, vx = Math.sin(a) * sp, vy = -Math.cos(a) * sp, m = j % 3 === 1 ? 'gold' : 'red';
    const at = (tt) => { const f = (1 - Math.exp(-k0 * tt)) / k0; return [cx + vx * f, 86 + (vy + g / k0) * f - g * tt / k0]; };
    let px = null; for (let s = 0; s <= 14; s++) { const tt = Math.max(0, age - s * 0.022), [x0, y0] = at(tt), wv = Math.sin(s * 1.2 - t * 16 + j) * Math.min(2, s * 0.3), x = Math.round(x0 + wv * Math.cos(a)), y = Math.round(y0 + wv * Math.sin(a));
      if (px) { const tn = (m === 'gold' ? 9.5 : 7.6) - s * 0.2 + ((s + j) % 3 === 0 ? 1.4 : 0); D.line(px[0], px[1] + 1, x, y + 1, m, tn - 2.2, E); D.line(px[0], px[1], x, y, m, tn, E); } px = [x, y]; if (tt <= 0) break; }
  }
}

// an opened egg's prize: pops out of the cup spinning (0.35 → 1), floats; the empty one lets a moth out, the snake lunges
function prizeDraw(D, t, i, e, rs, cx) { const age = e.openAge || 0, pz = e.prize | 0;
        const u = clamp((age - 0.05) / 0.32, 0, 1), sc = age < 0.05 ? 0 : 0.35 + 0.65 * (1 + 2.70158 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2)), spin = Math.pow(1 - u, 2) * 2.5 * TAU, py = EY - 6 - (EY - 6 - PRY) * (1 - Math.pow(1 - u, 3)) + Math.sin(t * 2.3 + i) * 1.6;
        if (pz <= 3) { const S = SPR[pz]; blit(D, S, cx, py, sc * Math.cos(spin), sc, 0); if (pz === 1 && Math.sin(t * 3) > 0.6) { D.px(cx - 4, py - 5, 'arcane', 11, E); D.px(cx - 5, py - 5, 'arcane', 8, E); D.px(cx - 3, py - 5, 'arcane', 8, E); D.px(cx - 4, py - 6, 'arcane', 8, E); D.px(cx - 4, py - 4, 'arcane', 8, E); }
          if (pz === 0 && age > 0.15 && age < 2.2 && R() < 0.8) rs.burst('egCoin', cx + (R() - 0.5) * 110, 2, 1, { sp: 10, ang: Math.PI, spread: 0.4, life: 2.2, floor: 150 + R() * 22 }); }
        else if (pz === 4) { const ma = age * 1.4, mx = cx + ma * 40 + Math.sin(age * 9) * 5, my = EY - 10 - ma * 50 + Math.sin(age * 15) * 3, f = MOTH[Math.floor(t * 18) % 2];
          if (my > -5) for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const c = f.at(x, y); if (c) D.px(mx - 4 + x, my - 3 + y, c === 'b' ? 'hair' : 'linen', c === 'b' ? 3 : c === 'W' ? 5 : 8, E); } }
        else if (pz === 5) snake(D, t, cx, age);
}
// ───────── the stage ─────────
// o, the mock / game state (read-only here, every field optional; art px, seconds, 0…1):
//   eggs: 3 × { cr 0…1 crack amount (0 none … 1 cracked all over; the next blow bursts it) · q 0…3 omen quality of the
//     cracks (0 steel · 1 teal · 2 violet · 3 gold) · hit 0…1 squash impulse (1 on a blow, decaying ~exp(−14·s); its
//     rising edge chips the shell) · wob −1…1 rocking (±0.13 rad about the base; omitted → a slow idle rock) · hov 0…1
//     hovered (a gleam sweeps across at once, then every 1.1 s; a warm glow) · open bool burst · openAge s since the burst
//     · prize 0…5 in EGGS order (0 coins · 1 FEVER gem · 2 blueprint · 3 chick · 4 empty · 5 snake) · pq 0…3 optional
//     override of the quality its pillar / light takes (default PQ) }
//   hammer: { x, y the grip (art px) · a rad (0 = handle straight up, −π/2 = pointing left with the head striking down) ·
//     smear 0…1 ghost heads trailing the swing · w optional swing velocity (its sign sets the trail side) · show false
//     hides it }. MB.eggs.raise(i) / strike(i) give the wind-up and contact poses for egg i.
//   bulbs: { mode 'idle' | 'chase' | 'strobe' | 'off' · q 0…3 colour for chase / strobe (omitted: festive mix / white) }
//   gong 0…1 ringing (shakes, rings of light run over it, rings of sound in the air) · pop 0…1 firecrackers popping ·
//   confetti 0…1 confetti rain · tier 0…4 echo particles (motes, glints, souls, gold) · dim 0…1 the hush before the last
//   blow (lanterns, key light and bulbs go down; the eggs' spots stay) · leave 0…1 exit (bulbs die, lanterns go out one
//   by one, the curtains close halfway) · tap { x, n } a tap on the boards (each new n: a few confetti hop, dust)
// Lights: 0, 1 lanterns · 2 key · 3–5 egg glows (colour set per frame) · 6 gong · 7 incense · 8–10 a spot on each egg.
let LOBJ = null, SHF = null, BUL = [];
const PIL = [0, 0, 0];
X.def('mb_eggs', {
  size: [AW, AH], fy: 150, noFrame: 1, amb: [0.2, 0.22],
  paint(S, sc) {
    // ── wall: the proscenium beam (the title marquee sits on it), the velvet backcloth, the stage boards
    S.lay('wall');
    for (let y = 0; y < 12; y++) for (let x = 0; x < AW; x++) S.px(x, y, 'red', y >= 10 ? 0 : 2.4 + (y === 2 ? 1.2 : 0) + (y === 9 ? -0.8 : 0) + (hash(x >> 2, y, 5) < 0.18 ? -0.5 : 0));
    for (let x = 0; x < AW; x++) { S.px(x, 10, 'gold', 6.4 + ((x >> 1) % 2) * 1.2, { n: [0, -0.6] }); S.px(x, 11, 'gold', 3); }
    for (let k = 0; k < 7; k++) { const x = 21 + k * 43; S.ell(x, 5.5, 2.5, 2.5, 'gold', 6.5, { dome: 1 }); S.px(x - 1, 4, 'gold', 9.5); }
    const fold = (x, y) => x / 12.5 + 0.22 * Math.sin(x * 0.083) + 0.08 * Math.sin(x * 0.31) + (y - 12) * 0.0015 * Math.sin(x * 0.05);
    for (let y = 12; y < 150; y++) for (let x = 0; x < AW; x++) { const ph = fold(x, y) * TAU, f = Math.sin(ph), g = Math.cos(ph);
      S.px(x, y, 'red', 3 + f * 1.05 + (hash(x, y, 9) < 0.1 ? -0.6 : 0) + (hash(x >> 1, y >> 2, 4) < 0.06 ? 0.6 : 0), { n: [-g * 0.6, 0] }); }
    // hem of the backcloth: a twisted gold braid and a fringe
    for (let x = 0; x < AW; x++) { S.px(x, 136, 'red', 1.2); S.px(x, 137, 'gold', (x + 1) % 3 === 0 ? 4.5 : 8.4, { n: [0, -0.5] }); S.px(x, 138, 'gold', x % 3 === 0 ? 9.2 : 6); S.px(x, 139, 'gold', 3.8);
      if (x % 2 === 0) { const l = 4 + (hash(x, 1, 3) < 0.3 ? 1 : 0); for (let k = 0; k < l; k++) S.px(x, 140 + k, 'gold', 6.4 - k * 0.7); } }
    S.ao(0, 12, AW, 26, 't', 2); S.ao(0, 128, AW, 22, 'b', 1.4); S.ao(0, 0, 50, 150, 'l', 1.3); S.ao(AW - 50, 0, 50, 150, 'r', 1.3);
    // stage boards, confetti on them, the drums' contact shadows
    X.TX.planks(S, 0, 150, AW, 25, 'wood', 3.5, { ph: 5, pw: 42, nails: false });
    S.ao(0, 150, AW, 5, 't', 1.6);
    const cr = X.rng(55);
    for (let k = 0; k < 95; k++) { const near = k < 45, x = near ? EX[k % 3] + (cr() - 0.5) * 80 : cr() * AW, y = 151 + Math.floor(Math.pow(cr(), near ? 1.4 : 1) * 23), c = cr(), m = c < 0.4 ? 'red' : c < 0.7 ? 'gold' : c < 0.85 ? 'candy' : 'teal', tn = m === 'gold' ? 8.5 : 7.5;
      S.px(x, y, m, tn + (cr() < 0.3 ? 1.2 : 0)); if (cr() < 0.6) S.px(x + 1, y, m, tn - 1.5); }
    EX.forEach(cx => S.shadow([[cx - 27, 150], [cx + 27, 150], [cx + 24, 153], [cx - 24, 153]], 2));
    S.shadow([[4, 150], [60, 150], [56, 152], [8, 152]], 1.4); S.shadow([[244, 150], [296, 150], [292, 152], [248, 152]], 1.4);

    // ── back: side drapes tied back with gold rope, the scalloped valance, festoon strings, firecracker braids, the gong
    S.lay('back');
    [0, 1].forEach(fl => {
      const XX = (x) => (fl ? AW - 1 - x : x), sg = fl ? 1 : -1;
      S.beg();
      for (let y = 12; y < 150; y++) {
        const xi = y < 100 ? 46 - 28 * Math.pow((y - 12) / 88, 1.35) : 18 + 12 * Math.pow((y - 100) / 50, 0.75);
        for (let x = 0; x < xi; x++) { const f = x / xi, ph = f * (y < 100 ? 4.3 : 3.1) + 0.1, s1 = Math.sin(ph * TAU), c1 = Math.cos(ph * TAU), edge = xi - x < 1.6;
          S.px(XX(x), y, 'red', 3.9 + s1 * 1.2 + (edge ? 1.3 : 0) - (y > 136 ? 0.8 : 0), { n: [sg * c1 * 0.62, y < 100 ? -0.1 : 0.1] }); }
        S.px(XX(Math.floor(xi)), y, 'gold', 6.2 + (y % 3 === 0 ? 1.4 : 0), { n: [sg * -0.5, 0] });
      }
      S.end();
      S.beg(); for (let x = 0; x < 21; x++) { S.px(XX(x), 98, 'gold', 5.5); S.px(XX(x), 99, 'gold', (x % 3) ? 8.6 : 5.4, { n: [0, -0.5] }); S.px(XX(x), 100, 'gold', (x % 3) === 1 ? 5 : 7.4); S.px(XX(x), 101, 'gold', 3.6); }
      S.ell(XX(19), 103, 2.4, 2.2, 'gold', 7, { dome: 1 }); for (let k = 0; k < 14; k++) for (let s = -2; s <= 2; s++) if ((s + k) % 2 === 0 || k < 3) S.px(XX(19 + s), 105 + k, 'gold', (s < 0 ? 7.6 : 5.6) - k * 0.2); S.end();
    });
    S.ao(0, 12, 34, 138, 'l', 1.2); S.ao(AW - 34, 12, 34, 138, 'r', 1.2);
    // valance: pleated red velvet with a scalloped hem, gold braid, fringe, a tassel at every join
    for (let x = 0; x < AW; x++) {
      const u = ((x % 25) + 0.5) / 25, yb = 26 + Math.round(5.2 * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2))), pp = Math.sin(x * TAU / 8);
      for (let y = 12; y < yb; y++) S.px(x, y, 'red', 3.5 + pp * 0.7 + (y < 14 ? -0.5 : 0), { n: [-Math.cos(x * TAU / 8) * 0.45, 0.15] });
      S.px(x, 12, 'gold', 7.8, { n: [0, -0.6] }); S.px(x, 13, 'gold', (x % 3) ? 5.6 : 8.4); S.px(x, 14, 'red', 1.4);
      S.px(x, 23, 'gold', (x % 4 === 1) ? 8.4 : 5.2); if (x % 4 === 1) { S.px(x, 22, 'gold', 6.4); S.px(x, 24, 'gold', 4); }
      S.px(x, yb - 1, 'gold', 8, { n: [0, -0.4] }); S.px(x, yb, 'gold', 5.6); S.px(x, yb + 1, 'gold', 3.2);
      if (x % 2 === 0) for (let k = 0; k < 3; k++) S.px(x, yb + 2 + k, 'gold', 6.2 - k * 1.2);
    }
    for (let x = 0; x <= AW; x += 25) { S.beg(); S.ell(x, 27, 1.8, 1.8, 'gold', 7.4, { dome: 1 }); for (let k = 0; k < 8; k++) { S.px(x - 1, 29 + k, 'gold', 7 - k * 0.3); S.px(x, 29 + k, 'gold', 5.6 - k * 0.3); if (k < 6) S.px(x + 1, 29 + k, 'gold', 4.4); } S.end(); }
    // festoon strings, hung from the tassels; the bulbs are animated (positions kept in BUL)
    BUL = [];
    const string = (pts, sag, row) => { for (let s = 0; s + 1 < pts.length; s++) { const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
      for (let x = x0; x <= x1; x++) { const u = (x - x0) / (x1 - x0), y = Math.round(y0 + (y1 - y0) * u + sag * 4 * u * (1 - u)); S.px(x, y, 'iron', 2.4); if ((x - x0) % 6 === 3) BUL.push([x, y + 1, row, BUL.length]); } } };
    string([[0, 30], [75, 30], [150, 30], [225, 30], [300, 30]], 11, 0);
    string([[0, 33], [100, 33], [200, 33], [299, 33]], 15, 1);
    // lucky knots hung from the lowest points of the upper string, between the eggs
    [112, 187].forEach(kx => { S.beg(); S.vl(kx, 41, 4, 'red', 4); S.rect(kx - 1, 45, 3, 2, 'gold', 7.4); S.px(kx - 1, 45, 'gold', 9.6);
      for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.abs(x) + Math.abs(y); if (d > 5) continue; const w = ((x + y + 20) % 3 === 0) || ((x - y + 20) % 3 === 0);
        S.px(kx + x, 53 + y, 'red', w ? 7.2 - (x + y) * 0.12 : 3.2, { n: [x / 8, y / 8] }); }
      [[-6, 0], [6, 0], [0, -6]].forEach(([a, b]) => { S.px(kx + a, 53 + b, 'red', 6.4); S.px(kx + a + Math.sign(a), 53 + b, 'red', 4.4); S.px(kx + a, 53 + b + (b ? -1 : 1), 'red', 5); });
      S.rect(kx - 1, 59, 3, 2, 'gold', 7); S.px(kx - 1, 59, 'gold', 9.4);
      for (let k = 0; k < 13; k++) for (let s2 = -2; s2 <= 2; s2++) if (Math.abs(s2) < 2 || k > 1) S.px(kx + s2, 61 + k, 'red', (s2 === -1 ? 7.4 : s2 === 2 ? 4.2 : 6) - k * 0.15 - (k > 10 && Math.abs(s2) === 2 ? 9 : 0));
      S.hl(kx - 2, 62, 5, 'gold', 7.6); S.end(); });
    // firecracker braids: a cord, little red tubes in a herringbone, gold bands, a red paper tassel at the end
    [8, 291].forEach(X0 => { S.beg(); S.vl(X0, 27, 88, 'red', 2.4);
      for (let k = 0; k < 28; k++) { const y = 30 + k * 3; [-1, 1].forEach(sd => { const yy = y + (sd > 0 ? 1 : 0), tt = (hash(k, sd, 7) - 0.5) * 1.2;
        for (let s = 0; s < 5; s++) { const x = X0 + sd * (1 + s), y2 = yy + Math.floor(s * 0.62), b = s === 3; S.px(x, y2, b ? 'gold' : 'red', (b ? 8.4 : 7.6 - s * 0.15) + tt, { n: [sd * 0.2, -0.6] }); S.px(x, y2 + 1, b ? 'gold' : 'red', (b ? 5 : 4.6) + tt, { n: [sd * 0.2, 0.3] }); S.px(x, y2 + 2, 'red', 2.2); }
        S.px(X0 + sd * 6, yy + 3, 'paper', 6.5); }); }
      S.ell(X0 + 0.5, 116, 2.2, 2, 'gold', 7, { dome: 1 }); for (let k = 0; k < 9; k++) for (let s = -3; s <= 3; s++) if (Math.abs(s) < 2 + k * 0.3) S.px(X0 + s, 118 + k, 'red', 7 - Math.abs(s) * 0.5 - k * 0.2 + (s === -1 ? 1.2 : 0));
      S.ell(X0 + 0.5, 28, 2, 1.6, 'gold', 7.5, { dome: 1 }); S.end(); });
    // gong stand (red lacquer posts and a crossbar with gold dragon-tail ends), the gong's cords, a mallet leaning on it
    S.beg(); S.cyl(16, 84, 4, 64, 'red', 3.6, { rim: 1.5 }); S.cyl(47, 84, 4, 64, 'red', 3.3, { rim: 1.5 });
    S.box(12, 146, 12, 4, 'red', 3.4, { top: 1 }); S.box(43, 146, 12, 4, 'red', 3.2, { top: 1 }); S.hl(12, 149, 12, 'gold', 5); S.hl(43, 149, 12, 'gold', 5);
    S.hcyl(12, 81, 43, 4, 'red', 4.6, { rim: 1.5 }); S.hl(12, 81, 43, 'gold', 6.4, { n: [0, -0.6] }); S.hl(12, 84, 43, 'gold', 4);
    [[10, -1], [56, 1]].forEach(([x, sd]) => { S.ell(x, 81, 2.5, 3, 'gold', 7, { dome: 1 }); S.px(x + sd, 77, 'gold', 8); S.px(x + sd * 2, 76, 'gold', 7); S.px(x, 78, 'gold', 8.5); });
    [16, 47].forEach(x => { S.hl(x - 1, 86, 6, 'gold', 7); S.hl(x - 1, 87, 6, 'gold', 4); });
    S.end();
    S.line(26, 85, 27, 98, 'red', 5); S.line(40, 85, 39, 98, 'red', 4.4);
    S.beg(); gong(S, 0, 0); S.end();
    S.beg(); S.line(4, 149, 12, 124, 'wood', 6, { w: 1 }); S.line(5, 149, 13, 124, 'wood', 4, { w: 1 }); S.ell(13, 121, 3.4, 3.4, 'red', 6.4, { dome: 1 }); S.hl(10, 122, 7, 'linen', 7); S.end();

    // ── mid: three red-lacquer drum stools with gold studs, a satin cushion on each; the offering table (right)
    S.lay('mid');
    EX.forEach((cx, i) => {
      const y0 = 121, y1 = 147; S.beg();
      for (let y = y0; y <= y1; y++) { const v = (y - y0) / (y1 - y0) * 2 - 1, hw = 20 + 2.8 * (1 - v * v);
        for (let x = Math.floor(cx - hw); x < Math.ceil(cx + hw); x++) { const u = (x + 0.5 - cx) / hw; if (Math.abs(u) > 1) continue;
          let m = 'red', tn = 5 - 0.6 * v - (u * u > 0.78 ? 1 : 0) - (u > 0.6 ? 0.5 : 0); const n = [u * 0.9, -v * 0.3];
          if (y - y0 < 2 || y1 - y < 2) { m = 'gold'; tn = (y === y0 || y === y1 - 1) ? 8 - u : 5 - u; n[1] = y === y0 || y === y1 - 1 ? -0.6 : 0.4; }
          else if (Math.abs(u + 0.44) < 0.045) tn += 2.8; else if (Math.abs(u + 0.3) < 0.03) tn += 1.2;
          S.px(x, y, m, tn, { n }); } }
      [y0 + 3.5, y1 - 4.5].forEach(sy => { const v = (sy - y0) / (y1 - y0) * 2 - 1, hw = 20 + 2.8 * (1 - v * v);
        for (let k = 0; k < 16; k++) { const ph = -Math.PI / 2 + (k + 0.5) * Math.PI / 16, co = Math.cos(ph); if (co < 0.3) continue; const x = Math.round(cx + hw * Math.sin(ph) - 0.5), y = Math.round(sy);
          S.px(x, y, 'gold', 10); S.px(x + 1, y, 'gold', 7); S.px(x, y + 1, 'gold', 6); S.px(x + 1, y + 1, 'gold', 3); } });
      S.ell(cx, 130.5, 2.6, 2.1, 'gold', 7.4, { dome: 1 }); S.ell(cx, 135.5, 3.6, 3.6, 'gold', 6.6, { ring: 1.1 }); S.px(cx - 2, 133, 'gold', 9.4); S.px(cx - 1, 129, 'gold', 10);
      S.end();
      // satin cushion: puffed top surface, a dent under the egg, sheen along the front edge, folds, gold corner tassels
      S.beg();
      for (let y = 106; y <= 122; y++) for (let x = cx - 23; x <= cx + 23; x++) {
        const dx = x + 0.5 - cx, ax = Math.abs(dx), topEdge = 107 + (1 - Math.min(1, ax / 21)) * -0.5, frontY = 114 + (ax > 18 ? (ax - 18) * 0.4 : 0), botY = 121.5 - (ax / 23) ** 2 * 3.2, halfW = y < frontY ? 19 + (y - 107) / 7 * 3.4 : 22.4 - (y - frontY) * 0.15;
        if (y < topEdge || y > botY || ax > halfW) continue;
        if (y < frontY) { const d = Math.hypot(dx / 17, (y + 0.5 - 111.5) / 3.6), fold = Math.abs(((Math.atan2(y + 0.5 - 111.5, dx) + 7) * 3.1) % 2 - 1) < 0.18 && d > 1 && d < 1.6;
          S.px(x, y, 'red', 6 + (d < 1 ? -2.6 + d * 1.2 : 0) + (fold ? -1.5 : 0) + (y === Math.floor(frontY) - 1 && d > 1.05 ? 2.8 : 0), { n: [dx / 23 * 0.4, -0.75] }); }
        else { const fy = (y - frontY) / (botY - frontY), fld = Math.abs(Math.sin((dx + (ax > 12 ? Math.sign(dx) * (y - 114) * 1.6 : 0)) * 0.55)) < 0.2;
          S.px(x, y, 'red', 5.3 - fy * 2 + (fy < 0.2 ? 2.4 : 0) + (fld ? -1.4 : 0) - (ax > 19 ? 0.8 : 0), { n: [dx / 23 * 0.5, 0.25] }); }
      }
      S.end();
      [-1, 1].forEach(sd => { const x = cx + sd * 22.5; S.beg(); S.ell(x, 116, 1.6, 1.6, 'gold', 7.6, { dome: 1 }); for (let k = 0; k < 7; k++) for (let s = -1; s <= 1; s++) S.px(x + s + (s > 0 ? 0 : 0), 118 + k, 'gold', (s < 0 ? 7 : s ? 4.4 : 5.8) - k * 0.2); S.end(); });
    });
    // offering table: red lacquer with gold trim; a plate of mandarins, a brass incense burner with three sticks
    S.beg(); S.box(248, 125, 44, 4, 'red', 4.4, { top: 2 }); S.hl(248, 128, 44, 'gold', 6); S.hl(248, 129, 44, 'gold', 3.4);
    [251, 287].forEach(x => { S.cyl(x, 130, 3, 17, 'red', 3.6, { rim: 1 }); S.hl(x - 1, 147, 5, 'red', 3); S.px(x - 1, 148, 'gold', 6); S.px(x + 3, 148, 'gold', 5); }); S.end();
    S.beg(); S.ell(262, 122.5, 9, 1.6, 'bone', 8.4, { n: [0, -0.7] }); S.hl(254, 124, 17, 'bone', 5.5); S.end();
    [[256, 119], [261.5, 119.5], [267, 119], [258.8, 114.8], [264.2, 115], [261.5, 110.8]].forEach(([x, y]) => { S.beg(); S.ell(x, y, 2.8, 2.6, 'fire', 6.2, { dome: 1 }); S.px(Math.floor(x) - 1, Math.floor(y) - 1, 'fire', 9.4); S.end(); });
    S.px(261, 107, 'leaf', 7); S.px(262, 107, 'leaf', 5); S.px(260, 106, 'leaf', 8);
    S.beg(); S.ell(280.5, 119.5, 5, 3.6, 'brass', 6, { dome: 1 }); S.ell(280.5, 116.5, 5.5, 1.4, 'brass', 8.4, { n: [0, -0.8] }); S.hl(277, 116, 7, 'stone', 7.4); S.px(277, 123, 'brass', 5); S.px(284, 123, 'brass', 4); S.px(280, 124, 'brass', 4.6);
    S.px(275, 118, 'brass', 7); S.px(286, 118, 'brass', 4); S.end();
    [[278, 104], [280.5, 102], [283, 105]].forEach(([x, y]) => { S.vl(x, y, 116 - y, 'red', 4.6); S.px(x, y - 1, 'fire', 10, E); S.px(x, y, 'fire', 7, E); });
    sc.emit({ k: 'egSmoke', x: 280.5, y: 101, w: 5, rate: 5, sp: 3, ang: 0, spread: 0.4, life: 3.4 });

    // ── front: a heap of spent firecracker paper (left), a fan of red envelopes (right)
    S.lay('front');
    { const r = X.rng(31); for (let k = 0; k < 70; k++) { const a = r() * Math.PI, d = Math.sqrt(r()), x = 20 + Math.cos(a) * d * 15, y = 171 - Math.sin(a) * d * 6 - (1 - d) * 2;
      S.px(x, y, r() < 0.12 ? 'gold' : 'red', (r() < 0.12 ? 8 : 6.4) + (r() - 0.5) * 2.4 - (y > 169 ? 1.2 : 0)); if (r() < 0.5) S.px(x + 1, y, 'red', 4.5); }
      [[13, 166, 1], [24, 164, -1], [30, 168, 1]].forEach(([x, y, sd]) => { S.px(x, y, 'red', 7.4); S.px(x + sd, y, 'red', 6.4); S.px(x + 2 * sd, y + 1, 'red', 5); S.px(x + 1, y + 1, 'red', 3.4); S.px(x + 3 * sd, y + 1, 'stone', 3); }); }
    [[270, 163, 0], [276, 161, 1], [282, 163, 2]].forEach(([x, y, k]) => { S.beg(); S.box(x, y, 9, 6, 'red', 6.2 - k * 0.3); S.hl(x + 1, y + 2, 7, 'gold', 7); S.px(x + 4, y + 3, 'gold', 9); S.end(); });

    // ── lights
    sc.light({ x: 34, y: 52, z: 34, r: 92, i: 0.95, c: '#ff6a3c', fl: 'candle', ph: 0.7, tint: 0.34 });          // 0 lantern, left
    sc.light({ x: 266, y: 52, z: 34, r: 92, i: 0.95, c: '#ff6a3c', fl: 'candle', ph: 3.3, tint: 0.34 });         // 1 lantern, right
    sc.light({ x: 150, y: 20, z: 130, r: 300, i: 0.46, c: '#fff0d8', tint: 0 });                                  // 2 the stage's key light, high and in front (pulses with chasing / strobing bulbs)
    EX.forEach(x => sc.light({ x, y: 88, z: 18, r: 78, i: 0, c: '#ffd070', bake: false, tint: 0.5 }));           // 3, 4, 5 egg glow (omen / prize colour, set per frame)
    sc.light({ x: GONG.x, y: GONG.y, z: 24, r: 50, i: 0, c: '#ffcc66', bake: false, tint: 0.34 });                // 6 the gong
    sc.light({ x: 280, y: 104, z: 16, r: 22, i: 0.35, c: '#ff9a40', fl: 'candle', ph: 5, tint: 0.4 });           // 7 incense tips
    EX.forEach((x, i) => sc.light({ x, y: 68, z: 46, r: 72, i: 1.05, c: '#ffe4b8', tint: 0.12 }));               // 8, 9, 10 a spot on each egg
    LOBJ = sc.lights;
    EX.forEach((x, i) => sc.shaft({ x, y0: 0, y1: 104, w0: 11, w1: 7, dx: 0, c: '#ffd070', i: 0.55, haze: 0.14, fade: -0.5, f: () => PIL[i] }));
    SHF = sc.shafts;
    sc.emit({ k: 'dust', x: 150, y: 80, w: 280, h: 100, rate: 3, sp: 2, life: 5 });
    sc.emit({ k: 'egGlit', x: 150, y: 110, w: 200, h: 30, rate: 1.6, sp: 3, ang: 0, spread: 1, life: 3.5 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const st = rs.st, eggs = o.eggs || [], dim = clamp(o.dim || 0, 0, 1), lv = clamp(o.leave || 0, 0, 1);
    const dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t; st.hp = st.hp || []; st.op = st.op || []; st.kick = Math.max(0, (st.kick || 0) - dt * 1.6);
    const dimK = 1 - 0.85 * dim; st.hs = st.hs || [];
    eggs.forEach((e, i) => { const h = e && !e.open && (e.hov || 0) > 0.4; if (h && st.hs[i] == null) st.hs[i] = t; if (!h) st.hs[i] = null; });
    // ── events: a blow (rising squash impulse) chips the shell; a burst sprays shell, confetti, silk and sparks
    eggs.forEach((e, i) => { if (!e) return; const h = e.hit || 0, cx = EX[i], q = clamp(e.q | 0, 0, 3), cr = e.cr || 0;
      if (h > 0.6 && h > (st.hp[i] || 0) + 0.25 && !e.open) { rs.burst('egShell', cx, ETOP + 4, 7 + Math.round(cr * 6), { sp: 70, ang: 0, spread: 2.6, life: 1.1, w: 10, floor: 112 + R() * 36 }); rs.burst('egSpk' + q, cx, ETOP + 8, 5 + Math.round(cr * 10), { sp: 55, ang: 0, spread: 3, life: 0.7, w: 8, h: 8 });
        rs.flash(3 + i, 0.8 + cr); st.kick = 1; rs.burst('dust', 150, 36, 6, { w: 260, h: 4, life: 2.2, sp: 3 }); }
      st.hp[i] = h;
      if (e.open && !st.op[i]) { st.op[i] = 1; const pq = pqOf(e), good = pq >= 0;
        rs.burst('egShell', cx, EY - 6, 16, { sp: 110, ang: 0, spread: 2.8, life: 1.4, w: 16, floor: 112 + R() * 38 });
        if (good) { rs.burst('egSpk' + pq, cx, EY - 8, 18 + pq * 6, { sp: 120, ang: 0, spread: 2.4, life: 0.9, w: 10 }); for (let k = 0; k < 44 + pq * 14; k++) rs.burst(CONF[k % CONF.length], cx, EY - 8, 1, { sp: 95, ang: 0, spread: 1.9, life: 3.2, w: 12 }); rs.flash(3 + i, 1.6 + pq * 0.4); rs.flash(8 + i, 1); rs.flash(2, 0.2 + pq * 0.14); st.kick = 1.4; }
        else if ((e.prize | 0) === 4) { rs.burst('egSmoke', cx, EY - 6, 16, { sp: 22, ang: 0, spread: 2, life: 1.2, w: 16, h: 4 }); }
        else { rs.flash(3 + i, 1.8); st.kick = 1; } }
      if (!e.open) st.op[i] = 0; });
    // ── lights: lanterns (die one by one when leaving), key light, spots, egg glows in the omen / prize colour
    const lamp = (k) => (lv > 0.2 + k * 0.3 ? (lv < 0.28 + k * 0.3 && hash(Math.floor(t * 24), k, 3) < 0.5 ? 0.4 : 0) : 1);
    rs.mul[0] = lamp(0) * dimK; rs.mul[1] = lamp(1) * dimK; rs.mul[7] = dimK; for (let i = 0; i < 3; i++) { const e = eggs[i]; rs.mul[8 + i] = (1 - lv * 0.7) * (1 + (e && (e.cr > 0 || e.hov > 0.4) ? dim * 0.7 : -dim * 0.3)); }
    eggs.forEach((e, i) => { if (!e) return; const L = LOBJ[3 + i]; let a = 0;
      if (e.open) { const pq = pqOf(e), age = e.openAge || 0;
        if (pq >= 0) { L.rgb = QM[pq][1]; a = 0.75 + 1.2 * Math.exp(-age * 2.2) + 0.12 * Math.sin(t * 5); PIL[i] = age < 0.1 ? age / 0.1 : 0.55 + 0.45 * Math.exp(-(age - 0.1) * 1.6); }
        else if ((e.prize | 0) === 5) { L.rgb = [255, 80, 70]; a = 1.4 * Math.exp(-age * 3); PIL[i] = 0; }
        else PIL[i] = 0; }
      else { PIL[i] = 0; if ((e.cr || 0) > 0) { L.rgb = QM[clamp(e.q | 0, 0, 3)][1]; a = 0.2 + 0.8 * e.cr * (0.8 + 0.2 * Math.sin(t * 9 + i)); } else if (e.hov > 0) { L.rgb = [255, 196, 90]; a = 0.3 * e.hov; } }
      if (SHF) SHF[i].rgb = e.open && pqOf(e) >= 0 ? QM[pqOf(e)][1] : [255, 210, 110];
      rs.mul[3 + i] = a; });
    for (let i = eggs.length; i < 3; i++) { rs.mul[3 + i] = 0; PIL[i] = 0; }
    const gg = clamp(o.gong || 0, 0, 1); rs.mul[6] = gg * (0.7 + 0.3 * Math.sin(t * 38));
    const pop = clamp(o.pop || 0, 0, 1);
    // ── festoon bulbs: idle a slow walk of gaps; chase: runs in the prize colour; strobe: all flash together
    const B = o.bulbs || {}, bm = lv > 0.9 ? 'off' : B.mode || 'idle', bq = B.q != null && B.q >= 0 ? clamp(B.q | 0, 0, 3) : -1, NB = BUL.length;
    let lit = 0; D.lay('back');
    for (let k = 0; k < NB; k++) { const [x, y, row] = BUL[k];
      let on, m = FEST[(k + row * 3) % FEST.length];
      if (bm === 'chase') { on = (((k - Math.floor(t * 15)) % 4) + 4) % 4 < 2; if (bq >= 0) m = QM[bq][0]; }
      else if (bm === 'strobe') { on = Math.floor(t * 11) % 3 !== 2; m = bq >= 0 ? QM[bq][0] : 'lamp'; }
      else if (bm === 'off') on = false;
      else on = (((k + row * 2 + Math.floor(t * 3.2)) % 6) !== 0) && hash(k, Math.floor(t * 7), 5) > 0.04;
      if (lv > 0 && k / NB < (lv - 0.05) * 1.6) on = false; if (st.kick > 0.85 && hash(k, Math.floor(t * 30), 2) < 0.6) on = false;
      D.px(x, y, 'iron', 2.6, E);
      if (on) { lit++; const dk = dim * 3; D.px(x, y + 1, m, 11 - dk, E); D.px(x, y + 2, m, 9 - dk, E); if (dim < 0.3) { D.px(x - 1, y + 1, m, 5.4, E); D.px(x + 1, y + 1, m, 5.4, E); D.px(x, y + 3, m, 5, E); } }
      else { D.px(x, y + 1, m, 3.2, E); D.px(x, y + 2, m, 2.2, E); } }
    // the key light breathes with the bulbs only when they chase or strobe (a steady light costs nothing per frame)
    rs.mul[2] = dimK * (1 - lv * 0.5) * (bm === 'strobe' ? (lit ? 1 : 0.62) : 1);
    // ── the gong rings (back: painted still in paint(), redrawn shaking while it rings), its rings of sound (mid)
    if (gg > 0.05) { D.beg(); gong(D, t, gg); D.end(); }
    // ── eggs, pillars, prizes (mid)
    D.lay('mid');
    if (gg > 0.1) for (let k = 0; k < 3; k++) { const rho = 16 + ((t * 52 + k * 10) % 30), fa = (1 - (rho - 16) / 30) * gg;
      for (let a = -1; a <= 1; a += 1 / rho) [a, Math.PI + a].forEach(b => { const x = Math.round(GONG.x + rho * Math.cos(b)), y = Math.round(GONG.y + rho * Math.sin(b) * 0.9); if (bay(x, y) < fa * 1.1) D.px(x, y, 'lamp', 6 + fa * 4, E); }); }
    eggs.forEach((e, i) => { if (!e) return; const cx = EX[i];
      if (e.open && PIL[i] > 0 && !o.front) pillar(D, t, cx, e.openAge || 0, QM[pqOf(e)][0], rs);
      drawEgg(D, t, i, e, st);
      // deep cracks: light escapes in short dithered rays off the upper shell
      if (!e.open && e.cr > 0.5) { const m = QM[clamp(e.q | 0, 0, 3)][0], nr = Math.floor(2 + (e.cr - 0.5) * 10);
        for (let k = 0; k < nr; k++) { const a = -Math.PI / 2 + (hash(k, i, 11) - 0.5) * 2.6, L = (3 + 8 * e.cr) * (0.65 + 0.35 * Math.sin(t * 13 + k * 2.1)), ca = Math.cos(a), sa = Math.sin(a);
          for (let q = 0; q < L; q++) { const x = Math.round(cx + ca * (ERX * 0.97 + q)), y = Math.round(EY + 2 + sa * (ERY * 0.97 + q)); if (bay(x, y) < (1 - q / L) * 1.25) D.px(x, y, m, 10 - q / L * 3, E); } } }
      if (e.open) { drawTop(D, t, i, e); if (!o.front) prizeDraw(D, t, i, e, rs, cx); }
    });
    // ── confetti rain, coins, echo particles, firecrackers popping
    const cf = clamp(o.confetti || 0, 0, 1); if (cf > 0) { const n = cf * 3.2 * (dt || 1 / 30) * 30; for (let k = 0; k < n; k++) if (R() < n - k) rs.burst(CONF[Math.floor(R() * CONF.length)], R() * AW, -2, 1, { sp: 14, ang: Math.PI, spread: 0.8, life: 4.2 }); }
    if (pop > 0) [0, 1].forEach(sd => { if (R() > pop * 0.36) return; const x = sd ? 291 : 8, y = 50 + R() * 66; rs.flash(sd, 0.35 + R() * 0.3); rs.burst('egSpark', x, y, 6, { sp: 64, life: 0.45, floor: 150 }); rs.burst('egSmoke', x, y, 3, { sp: 10, life: 1.4, w: 4 }); rs.burst('egConfR', x, y, 2, { sp: 40, life: 2, ang: sd ? -1.2 : 1.2, spread: 1.4 });
      D.lay('front'); D.px(x, y, 'lamp', 11, E); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => D.px(x + a, y + b, 'lamp', 8.5, E)); });
    const tr = o.tier || 0; if (tr > 0 && R() < 0.08 + tr * 0.1) rs.burst(['mote', 'glint', 'egSoul', 'egGold'][Math.min(3, tr - 1)], 40 + R() * 220, 30 + R() * 100, 1, { sp: 8, life: 1.6 });
    if (o.tap && o.tap.n !== st.tapN) { if (st.tapN != null) { rs.burst(CONF[Math.floor(R() * 6)], o.tap.x, 152, 4, { sp: 34, ang: 0, spread: 1.4, life: 1.2, floor: 153 }); rs.burst('dust', o.tap.x, 150, 3, { sp: 8, life: 0.8 }); } st.tapN = o.tap.n; }
    // glints on the gold now and then
    if (dt && R() < dt * 2.2) { const i = Math.floor(R() * 3), e = eggs[i]; if (!e || !e.open) rs.burst('glint', EX[i] - 10 + R() * 20, ETOP + 6 + R() * 30, 1, { sp: 0, life: 0.45 }); }
    // heat wisps over closed eggs
    D.lay('mid');
    eggs.forEach((e, i) => { if (e && e.open) return; const cx = EX[i]; [-5, 4].forEach((ox, j) => { for (let k = 0; k < 15; k++) { const y = ETOP - 3 - k, x = Math.round(cx + ox + Math.sin(k * 0.42 - t * 2.6 + j * 2 + i) * (0.6 + k * 0.12)), on = ((k + Math.floor(t * 9 + j * 3)) % 6) < 3;
      if (on && bay(x, y) < 0.95 - k * 0.05) D.px(x, y, 'lamp', 6.6 - k * 0.14, E); } }); });
    // ── front: lanterns, the hammer, the curtain closing when leaving
    D.lay('front');
    LAN.forEach((L, k) => lantern(D, t, L, lamp(k) > 0.5 && dim < 0.8, st.kick));
    eggs.forEach((e, i) => { if (e && e.open && pqOf(e) >= 0) streamers(D, t, EX[i], e.openAge || 0, i); });
    const H = o.hammer; if (H && H.show !== false) hammer(D, t, H, st);
    if (lv > 0.05) { const wv = lv * 72; for (let y = 12; y < 150; y++) for (let x = 0; x < wv; x++) { const ph = (x / wv) * 4 + y * 0.002, s1 = Math.sin(ph * TAU); [x, AW - 1 - x].forEach((xx, j) => x > wv - 1 ? D.px(xx, y, 'gold', 6.4 + (y % 3 === 0 ? 1.4 : 0)) : D.px(xx, y, 'red', 3.9 + s1 * 1.2 + (x > wv - 2.5 ? 1.3 : 0) - (y > 136 ? 0.8 : 0), { n: [(j ? 1 : -1) * Math.cos(ph * TAU) * 0.6, 0] })); } }
  },
});

// geometry the game needs (art px; logical = (360 + 4·ax, 110 + 4·ay))
// the opened eggs' pillars and prizes alone on a see-through stage, drawn by the mini game above the reveal's dim and rays
X.def('mb_eggs_front', { size: [AW, AH], fy: AH, noFrame: 1, clear: 1, noFloor: 1, amb: [0.5, 0.3], paint() {},
  anim(D, t, rs, o) { (o && o.eggs || []).forEach((e, i) => { if (!e || !e.open) return; const cx = EX[i]; D.lay('mid'); if (PIL[i] > 0) pillar(D, t, cx, e.openAge || 0, QM[pqOf(e)][0], rs); prizeDraw(D, t, i, e, rs, cx); }); } });
MB.eggs = {
  eggs: EX.map(x => ({ x, y: EY, rx: ERX, ry: ERY, top: ETOP, bot: EBOT })),
  pedestal: { w: 46, y0: 114, y1: 148 }, prizeY: PRY, gong: GONG, lanterns: LAN.map(L => ({ x: L.x, y: L.y + L.len + 14 })),
  hammer: { head: [22.5 * HS, 33.5 * HS], halfLen: 8.6 * HS, pommel: -3.4 * HS },
  // hammer poses for egg i: raised (wind-up, head up and back) and strike (the head's lower face on the egg's crown)
  raise: (i) => ({ x: EX[i] + 34, y: 72, a: 0.45 }), strike: (i) => ({ x: EX[i] + 28 * HS, y: ETOP - 8.6 * HS, a: -Math.PI / 2 }),
  art: (ax, ay) => [360 + 4 * ax, 110 + 4 * ay],
};
})();
