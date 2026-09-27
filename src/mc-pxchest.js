// ==== mc-pxchest.js ====
(function () {
// The map's treasure chest as lit pixel art (user ruling 2026-09-27: 「地图上领取宝箱的界面不行，要优化」; the gacha
// reference is the floor for every beat of it). One art cell = 4 logical px, the minigames' scale.
// The chest is not a sprite: it is painted fresh every frame from its parameters — width / height (squash and stretch
// are redrawn, never scaled), the lid's real hinge angle, the oblique view (hover tilt changes how much side and top you
// see), the chains round it, the glow leaking from inside, the white of a hit — into the pixel room engine's layers with its
// own depth test, so the room's lights light it and its inner light lights the room (mc-pxroom.js, docs/design.md §10.1).
const M = window.MC, X = M.PXR; if (!X) return;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hh = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s | 0) * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const MI = X.MI, mid = (m) => (typeof m === 'number' ? m : MI[m]);
// show tiers 0…6 = 普通 优质 稀有 史诗 传说 神话 不朽 on pixel ramps (glow tone), and as light colours
const QR = [['iron', 10], ['screen', 9], ['water', 9.5], ['arcane', 9], ['fire', 9], ['red', 8.6], ['gold', 9], ['lamp', 9.4]];   // 7: the warm idle glow (not a tier)
const QL = ['#dde3ee', '#8ff08a', '#6cb8ec', '#b89cff', '#ffb040', '#ff6a5a', '#ffd070', '#ffc878'];
// reference geometry (art cells): body width / height / depth, lid half-depth and rise, feet
const G0 = { W: 96, BH: 38, D: 30, RY: 15, FT: 3 };
const PX = M.PXCHEST = { QR, QL, G0 };

// ───────── depth-tested pixels ─────────
// the chest is convex pieces seen from front-right-above: every pixel keeps the nearest surface
// dist = b − sx·x − ky·y (b = depth into the chest, from its front face); smaller = nearer
let ZB = null, ZW = 0, ZH = 0;
function zclear(w, h, bb) { if (!ZB || ZB.length !== w * h || ZW !== w) { ZB = new Float32Array(w * h); ZW = w; ZH = h; ZB.fill(1e9); return; } ZW = w; ZH = h; if (bb && bb.x1 >= bb.x0) { for (let y = Math.max(0, bb.y0); y <= Math.min(h - 1, bb.y1); y++) ZB.fill(1e9, y * w + Math.max(0, bb.x0), y * w + Math.min(w - 1, bb.x1) + 1); } else ZB.fill(1e9); }
PX.mask = (x, y) => ZB && x >= 0 && y >= 0 && x < ZW && ZB[y * ZW + x] < 1e8;
let BB = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
function zp(S, x, y, d, m, t, nx, ny, e, z) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= ZW || y >= ZH) return; const p = y * ZW + x; if (d >= ZB[p]) return; ZB[p] = d;
  if (x < BB.x0) BB.x0 = x; if (x > BB.x1) BB.x1 = x; if (y < BB.y0) BB.y0 = y; if (y > BB.y1) BB.y1 = y;
  S.put(x, y, m, t, nx, ny, e, z);
}

// ───────── surface materials (texture space: xr 0…W0 across, yr 0…BH0 up the front, u 0…1 over the lid) ─────────
const BX = [Math.round(G0.W * 0.21), Math.round(G0.W * 0.79)];            // the two iron bands, over body and lid
const inBand = (xr) => { for (const b of BX) { const d = xr - b; if (d >= -3 && d <= 3) return d; } return null; };
// wood with planks (seams, grain, knots) — hv: plank index variation seed
function wood(xr, yr, seam, pk, base) {
  let t = base + (hh(pk, 3, 71) - 0.5) * 1.1;
  if (seam === 0) return [MI.wood, t - 3.1, 0, 0.6];            // dark gap
  if (seam === 1) return [MI.wood, t + 1.0, 0, -0.7];            // lit lip under the gap
  const g = hh(Math.floor(xr / (3 + hh(pk, yr, 5) * 5)), yr, pk * 13 + 1);
  if (g < 0.16) t -= 1.1; else if (g > 0.93) t += 0.7;
  if (hh(xr >> 3, pk, 91) < 0.09 && Math.abs((xr & 7) - 3) < 2 && seam === 3) t -= 1.6;   // a knot
  return [MI.wood, t, 0, 0];
}
function rivet(dx, dy, base) { if (dx === 0 && dy === 0) return [MI.iron, base + 3.4, -0.5, -0.5]; if (dx === 1 && dy === 1) return [MI.iron, base - 2.6, 0.5, 0.5]; if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) return [MI.iron, base + 1.2, 0, 0]; return null; }
// body front, texture coords; returns [mat, tone, nx, ny, glow]
function bodyTex(xr, yr, st) {
  const W = G0.W, BH = G0.BH, cx = W / 2;
  // lock plate with a keyhole
  if (Math.abs(xr - cx) <= 7 && yr >= BH - 19 && yr <= BH - 3) {
    const dx = xr - cx, dy = yr - (BH - 19), edge = Math.abs(dx) === 7 || dy === 0 || yr === BH - 3;
    const kh = (Math.abs(dx) <= 1 && yr >= BH - 12 && yr <= BH - 9) || (dx === 0 && yr >= BH - 15 && yr < BH - 12);
    if (kh) return st.leak > 0.02 ? [mid(QR[st.q][0]), QR[st.q][1] + 1.5 * st.leak, 0, 0, 255] : [MI.ink, 0, 0, 0];
    if (edge) return [MI.brass, dx === -7 || yr === BH - 3 ? 7.4 : 4.4, dx === -7 ? -0.6 : dx === 7 ? 0.6 : 0, yr === BH - 3 ? -0.6 : dy === 0 ? 0.6 : 0];
    const rv = [[-5, BH - 5], [5, BH - 5], [-5, BH - 17], [5, BH - 17]].map(([a, b]) => rivet(dx - a, yr - b, 6)).find(v => v);
    if (rv) return [MI.brass, rv[1] + 1, rv[2], rv[3]];
    return [MI.brass, 6 + (Math.abs(dx) < 4 && yr > BH - 8 ? 0.7 : 0) - (dy < 3 ? 0.4 : 0), 0, 0];
  }
  // brass corner guards (L plates with a diagonal) and their rivets
  const cxr = xr < 11 ? xr : W - 1 - xr, cyr = yr < 11 ? yr : BH - 1 - yr, right = xr >= 11, top = yr >= 11;
  if ((xr < 11 || xr >= W - 11) && (yr < 11 || yr >= BH - 11) && (cxr < 4 || cyr < 4 || cxr + cyr < 12)) {
    const rim = cxr === 0 || cyr === 0 || cxr + cyr === 11 || (cxr === 3 && cyr > 3 && cxr + cyr < 12) || (cyr === 3 && cxr > 3 && cxr + cyr < 12);
    if ((cxr === 2 && cyr === 2) || (cxr === 2 && cyr === 7) || (cxr === 7 && cyr === 2)) return [MI.brass, 9.5, -0.5, -0.5];
    if ((cxr === 3 && cyr === 3) || (cxr === 3 && cyr === 8) || (cxr === 8 && cyr === 3)) return [MI.brass, 3.6, 0.5, 0.5];
    const lit = (right ? cxr === 0 : false) || (top ? cyr === 0 : false);
    return [MI.brass, rim ? (lit ? 8.2 : 4.4) : 6.4 - (cxr + cyr) * 0.08, right ? 0.2 : -0.2, top ? -0.2 : 0.2];
  }
  // iron rims: bottom 4 rows, top 5 rows
  if (yr < 4 || yr >= BH - 5) {
    const top2 = yr >= BH - 5, k = top2 ? yr - (BH - 5) : yr, n = top2 ? 5 : 4;
    const rv = rivet((xr % 12) - 5, top2 ? yr - (BH - 3) : yr - 1, 5); if (rv && xr > 12 && xr < W - 12) return rv;
    return [MI.iron, 5 + (k === n - 1 ? 1.6 : 0) - (k === 0 ? 1.4 : 0), 0, k === n - 1 ? -0.7 : k === 0 ? 0.7 : 0];
  }
  // iron bands with rivets
  const bd = inBand(xr);
  if (bd != null) {
    const rv = rivet(bd, (yr - 6) % 8 - 1, 5); if (rv && Math.abs(bd) <= 1) return rv;
    return [MI.iron, 5.2 + (bd === -3 ? 1.4 : bd === 3 ? -1.6 : 0) + (bd === -2 ? 0.5 : 0), bd === -3 ? -0.7 : bd === 3 ? 0.7 : 0, 0];
  }
  // three horizontal planks between the rims
  const ph = (BH - 9) / 3, yy = yr - 4, pk = Math.floor(yy / ph), inp = yy - pk * ph;
  const seam = inp < 1 && pk > 0 ? 0 : inp < 2 && pk > 0 ? 1 : 3;
  return wood(xr, yr, seam, pk + 1, 5.2);
}
// lid outside: texture across (xr) and around (u: 0 front edge → 1 hinge)
function lidTex(xr, u, st) {
  const W = G0.W, cx = W / 2, v = Math.round(u * 40);
  if (u < 0.085) { const k = Math.round(u / 0.085 * 3); const rv = rivet((xr % 12) - 5, k - 1, 5); if (rv && xr > 8 && xr < W - 8) return rv; return [MI.iron, 5.1 + (k === 0 ? -1.2 : k >= 3 ? 1.2 : 0.3), 0, 0]; }
  if (xr < 5 || xr >= W - 5) { const e = xr < 5 ? xr : W - 1 - xr; return [MI.brass, 6.2 + (e === 0 ? -1.6 : e === 4 ? -0.8 : e === 1 ? 1.2 : 0), xr < 5 ? -0.3 : 0.3, 0]; }
  const bd = inBand(xr);
  if (bd != null) { const rv = rivet(bd, (v - 5) % 7 - 1, 5); if (rv && Math.abs(bd) <= 1 && v > 4 && v < 38) return rv; return [MI.iron, 5.2 + (bd === -3 ? 1.4 : bd === 3 ? -1.6 : 0), bd === -3 ? -0.7 : bd === 3 ? 0.7 : 0, 0]; }
  // the cabinet's crescent moon, in brass (it takes the tier's light while the chest charges)
  const ex = xr - cx, ey = (u - 0.24) * 44;
  if (Math.abs(ex) <= 7 && Math.abs(ey) <= 7) { const r1 = ex * ex + ey * ey, r2 = (ex - 3) * (ex - 3) + (ey + 1.5) * (ey + 1.5);
    if (r1 <= 36 && r2 > 22) { return [MI.brass, 6.8 + (ex < -2 ? 1.2 : 0) - (r1 > 28 ? 1.4 : 0), ex < 0 ? -0.4 : 0.2, ey < 0 ? -0.4 : 0.3]; }
    if (r1 <= 49 && r1 > 36 && r2 > 16) return [MI.brass, 3.6, 0, 0]; }
  const bnd = [0.085, 0.3, 0.52, 0.76, 1.01]; let pk = 0; while (u >= bnd[pk + 1]) pk++;
  const inp = (u - bnd[pk]) * 40, seam = inp < 0.9 && pk > 0 ? 0 : inp < 1.9 && pk > 0 ? 1 : 3;
  return wood(xr, v, seam, pk + 11, 5.4);
}
// lid lining: crimson quilted velvet inside a brass trim (v 0 front edge → 1 hinge)
function liningTex(xr, v, st) {
  const W = G0.W; if (xr < 3 || xr >= W - 3 || v < 0.1 || v > 0.93) return [MI.brass, 5.2 + (xr < 3 || v < 0.1 ? 1 : -0.6), 0, 0];
  const q = (xr * 0.5 + v * 16) % 6, r = (xr * 0.5 - v * 16 + 60) % 6, tuft = (q < 0.6 || r < 0.6), cv = Math.sin((v - 0.1) / 0.83 * Math.PI);
  return [MI.crimson, 3.4 + cv * 2 + (tuft ? -1.6 : 0) + ((q > 2.5 && q < 3.5 && r > 2.5 && r < 3.5) ? 0.9 : 0), 0, (0.5 - v) * 0.8];
}

// the coin heap inside: height above the inner floor (0…11) over the opening
const heapH = (x, b, W, D, hp) => { const u = (x - W / 2) / (W / 2 - 3), v = (b - D / 2) / (D / 2 - 2), f = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v * 0.7); return Math.pow(f, 0.8) * 17 * hp; };
// [dx, dy, material, tone, glow]: a coin lying flat, a coin on edge, three gems
const COIN_F = [[-1, -1, MI.gold, 9.4], [0, -1, MI.gold, 10.2], [1, -1, MI.gold, 8.6], [-2, 0, MI.gold, 7.6], [-1, 0, MI.gold, 8.2], [0, 0, MI.gold, 7.4], [1, 0, MI.gold, 6.8], [2, 0, MI.gold, 5.6], [-1, 1, MI.gold, 4.6], [0, 1, MI.gold, 4.2], [1, 1, MI.gold, 3.6]];
const COIN_E = [[0, -2, MI.gold, 9.8], [1, -2, MI.gold, 7.4], [0, -1, MI.gold, 8.8], [1, -1, MI.gold, 6.4], [0, 0, MI.gold, 8.2], [1, 0, MI.gold, 5.6], [0, 1, MI.gold, 6.4], [1, 1, MI.gold, 4.2]];
const gem = (m) => [[0, -1, MI[m], 10, 255], [-1, 0, MI[m], 8], [0, 0, MI[m], 7.4], [1, 0, MI[m], 5.4], [0, 1, MI[m], 4]];
const GEMS = [gem('red'), gem('water'), gem('leaf')];

// chains, in chest space: [x, y] points on the front (y up from the floor; over the lid the path follows its curve), or
// [y, b, 'side'] points on the right side face. The order they appear in, and the order they snap in (the X last)
const CHAIN_PATH = {
  x1: (W, BH, FT, top, RY) => [[3, top + RY * 0.86], [W - 3, FT + 1]],
  x2: (W, BH, FT, top, RY) => [[W - 3, top + RY * 0.86], [3, FT + 1]],
  belt: (W, BH, FT, top, RY, D) => [[-1, FT + BH * 0.46], [W, FT + BH * 0.46]].concat([[FT + BH * 0.46, 0, 'side'], [FT + BH * 0.46, D, 'side']]),
  lid: (W, BH, FT, top, RY) => [[-1, top + RY * 0.5], [W, top + RY * 0.5]],
  vl: (W, BH, FT, top, RY) => [[W * 0.32, FT], [W * 0.32, top + RY * 0.98]],
  vr: (W, BH, FT, top, RY) => [[W * 0.68, FT], [W * 0.68, top + RY * 0.98]],
  low: (W, BH, FT, top, RY, D) => [[-1, FT + BH * 0.16], [W, FT + BH * 0.16]].concat([[FT + BH * 0.16, 0, 'side'], [FT + BH * 0.16, D, 'side']]),
};
PX.CHAIN_SHOW = ['x1', 'x2', 'belt', 'lid', 'vl', 'vr', 'low'];
PX.CHAIN_BREAK = ['low', 'vr', 'vl', 'lid', 'belt', 'x1', 'x2'];
// the middle of a chain on the room canvas (where it snaps), for the show's links and sparks
PX.chainMid = function (id, info) { const I = info; if (!I || !CHAIN_PATH[id]) return null; const W = I.W, BH = I.BH, FT = G0.FT, top = I.top, RY = G0.RY, p = CHAIN_PATH[id](W, BH, FT, top, RY, G0.D); const a = p[0], b = p[1]; return { x: I.x0 + (a[0] + b[0]) / 2, y: I.y1 - (a[1] + b[1]) / 2, x0: I.x0 + a[0], y0: I.y1 - a[1], x1: I.x0 + b[0], y1: I.y1 - b[1] }; };
// the padlock (15×14 cells): shackle, brass body with a bevel, keyhole; [dx, dy, material, tone, nx] from the top middle
const PADLOCK = (() => { const o = [];
  for (let y = 0; y < 6; y++) for (let x = -5; x <= 5; x++) { const arc = y < 2 ? (Math.abs(x) <= 4 - y && Math.abs(x) >= 2 - y) || (y === 0 && Math.abs(x) <= 3) || (y === 1 && Math.abs(x) >= 3 && Math.abs(x) <= 4) : (Math.abs(x) === 4 || Math.abs(x) === 5);
    if (arc) o.push([x, y, MI.iron, x < 0 ? 8 : 4.8, x < 0 ? -0.6 : 0.6]); }
  for (let y = 6; y < 14; y++) for (let x = -7; x <= 7; x++) { const edge = y === 6 || y === 13 || Math.abs(x) === 7, key = (x === 0 && (y === 8 || y === 11 || y === 10)) || (Math.abs(x) === 1 && y === 9) || (x === 0 && y === 9);
    o.push([x, y, key ? MI.ink : MI.brass, key ? 0.4 : edge ? (y === 6 ? 8.6 : y === 13 ? 3.6 : x < 0 ? 7.4 : 4.2) : 6.2 + (x < -3 ? 0.8 : x > 3 ? -0.8 : 0) - (y - 6) * 0.12, x < 0 ? -0.4 : 0.4]); }
  [[-5, 8], [5, 8], [-5, 11], [5, 11]].forEach(([x, y]) => o.push([x, y, MI.brass, 9.4, -0.5]));
  return o; })();
// the padlock lying on the floor (bottom middle at x, y): upright, shackle sprung open
PX.padlock = function (D, x, y, r, open) { D.beg(); PADLOCK.forEach(([dx, dy, m, t, nx]) => { if (open && dy < 6 && dx >= 4) return; D.px(x + dx, y - 14 + dy - (open && dy < 6 ? 2 : 0), m, t, { n: [nx || 0, 0] }); }); D.end({ lit: 1 }); };

// ───────── the chest ─────────
// st: x, y (front-left corner of the base on the room canvas), w, h (squash / stretch), sx, ky (oblique view),
// lid (hinge angle, rad), q (tier 0…7), leak (0…1 light through the seam and the keyhole), wt (0…1 white of a hit),
// dark (the backlit silhouette of the hitstop), heap (0…1 coins inside), mimic (0…1), chains [{ id, on, heat, col }],
// lock (the padlock on the hasp: { a swing }), t, z (depth of the front face)
PX.paint = function (S, st) {
  const W = Math.round(G0.W * (st.w || 1)), BH = Math.round(G0.BH * (st.h || 1)), D = G0.D, RY = G0.RY * (st.h || 1), R = D / 2, FT = G0.FT;
  const sx = st.sx == null ? 0.3 : st.sx, ky = st.ky == null ? 0.33 : st.ky, ox = Math.round(st.x - (W - G0.W) / 2), oy = Math.round(st.y), Z = st.z || 40;
  const q = clamp(st.q | 0, 0, 7), wt = st.wt || 0, WB = wt > 0.5 ? 255 : 0, lift = wt * 9;
  const top = FT + BH, fx = W / G0.W, fy = BH / G0.BH;
  zclear(st.cw || 480, st.ch || 270, BB); BB = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  const P = (m, t, nx, ny, e) => [m, t + lift, nx, ny, e || WB];
  const WHITE = wt >= 0.95, WM = MI.linen, DARK = !!st.dark;
  const zput = (x, y, d, T) => DARK ? zp(S, x, y, d, MI.ink, 1.2, 0, 0, 255, Z - d * 0.5) : WHITE ? zp(S, x, y, d, WM, 10.4, 0, 0, 255, Z - d * 0.5) : zp(S, x, y, d, T[0], T[1] + lift, T[2], T[3], T[4] || WB, Z - d * 0.5);
  const dst = (x, y, b) => b - sx * x - ky * y;
  const QM = mid(QR[q][0]), QT = QR[q][1];
  // ── feet: four brass claws
  [[3, 0], [W - 11, 0], [4, D - 4], [W - 12, D - 4]].forEach(([fx0, fb]) => { for (let y = 0; y < FT; y++) for (let i = 0; i < 8; i++) { const b = fb + (i % 3); const T = [MI.brass, 5 + (i < 2 ? 1.2 : i > 5 ? -1.4 : 0) - (y === 0 ? 1.2 : 0), 0, 0.3]; zput(ox + fx0 + i + b * sx, oy - y - b * ky, dst(fx0 + i, y, b), T); } });
  // ── right side of the body (in the ceiling light's shade)
  if (sx > 0.02) { const cols = Math.ceil(D * sx);
    for (let c = 0; c < cols; c++) { const b = (c + 0.5) / sx; if (b > D) break;
      for (let y = FT; y < top; y++) { const yr = (y - FT) / fy, T = (yr < 4 || yr >= G0.BH - 5) ? [MI.iron, 4.2 + (yr >= G0.BH - 1.5 ? 1.2 : 0), 0.86, 0] : (b < 3 ? [MI.brass, 4.6, 0.86, 0] : (() => { const w = wood(Math.round(b * 3), Math.round(yr), ((yr - 4) % ((G0.BH - 9) / 3)) < 1 && yr > 6 ? 0 : 3, 21 + Math.floor((yr - 4) / ((G0.BH - 9) / 3)), 4.2); return [w[0], w[1], 0.86, 0]; })());
        zput(ox + W + c, oy - Math.round(y + b * ky), dst(W, y, b), T); } } }
  // ── the opening, the rim and the coins (only once the lid is off the rim)
  const lidA = st.lid || 0, mim = st.mimic || 0;
  if (lidA > 0.04) {
    for (let b = 0.25; b < D; b += 0.5) for (let x = 0; x < W; x++) {
      const wall = x < 2 || x >= W - 2 || b < 2 || b > D - 2;
      let y = top, T;
      if (wall) T = [MI.wood, 7.2 - (b < 2 ? 0 : 1), 0, -0.86];
      else if (mim > 0.01) { T = [MI.crimson, 1.2 + 0.6 * Math.sin(x * 0.3 + b), 0, -0.5]; y = top - 1; }
      else { const hp = st.heap == null ? 1 : st.heap; y = top - 5 + heapH(x, b, W, D, hp); const u = (x - W / 2) / (W / 2 - 3);
        T = hp < 0.05 ? [MI.wood, 1.6, 0, -0.8] : [MI.gold, 4.2 + (hh(x, Math.round(b * 2), 9) - 0.5) * 1.4 + (b < D / 2 ? 0.3 : -0.8), -u * 0.5, -0.8]; }
      const X0 = ox + x + b * sx, Y0 = oy - (y + b * ky); zput(X0, Y0, dst(x, y, b), T); zput(X0, Y0 + 1, dst(x, y, b) + 0.2, T);
    }
    // coins lying on the heap (lit rim, dark underside), a few on edge, and gems that glint
    const hp = st.heap == null ? 1 : st.heap;
    if (mim < 0.01 && hp > 0.05) for (let k = 0; k < 150; k++) { const x = 4 + hh(k, 1, 31) * (W - 8), b = 3 + hh(k, 2, 31) * (D - 6), hy = heapH(x, b, W, D, hp); if (hy < 1.5) continue;
      const y = top - 5 + hy, X0 = Math.round(ox + x + b * sx), Y0 = Math.round(oy - (y + b * ky)), d0 = dst(x, y, b) - 0.6, kind = hh(k, 3, 31);
      const spr = kind < 0.08 ? GEMS[Math.floor(kind / 0.08 * 3)] : kind < 0.22 ? COIN_E : COIN_F;
      spr.forEach(([dx, dy, m, t, e]) => zput(X0 + dx, Y0 + dy, d0 - dy * 0.01, [m, t + (e ? 0.8 * Math.sin((st.t || 0) * 4 + k) : 0), 0, -0.6, e || 0])); }
    // the mimic: teeth along both rims, a tongue, eyes in the dark
    if (mim > 0.01) { for (let x = 4; x < W - 4; x++) { const k = (x - 4) % 9, big = ((x - 4) / 9 | 0) % 2, hgt = k < 5 ? (big ? 6.5 : 4) - Math.abs(k - 2) * (big ? 2.4 : 1.7) : 0; for (let yy = 0; yy < hgt * mim; yy++) zput(ox + x + 1 * sx, oy - (top + yy + 1 * ky), dst(x, top + yy, 1) - 0.4, [MI.bone, 9 - yy * 0.7 - (k > 2 ? 1.4 : 0), 0, -0.3]); } }
  }
  // ── body front
  for (let y = FT; y < top; y++) for (let x = 0; x < W; x++) {
    const xr = Math.min(G0.W - 1, Math.floor(x / fx)), yr = Math.min(G0.BH - 1, Math.floor((y - FT) / fy));
    zput(ox + x, oy - y, dst(x, y, 0), bodyTex(xr, yr, st));
  }
  // mimic tongue over the front rim
  if (mim > 0.3) { const tx = ox + Math.round(W * 0.36), n = 16; for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * 2 - 1, len = Math.round((5 + Math.sqrt(1 - u * u) * 9) * mim); for (let j = 0; j < len; j++) { const edge = j === len - 1 || i === 0 || i === n - 1, groove = Math.abs(u) < 0.13 && j > 1 && j < len - 2; zput(tx + i, oy - top - 1 + j, -99, [MI.red, edge ? 3.6 : groove ? 4.6 : 6.4 + (u < -0.3 ? 1 : 0) - j * 0.12, u * 0.6, 0.3]); } } }
  // ── the lid: a barrel (half ellipse, depth D, rise RY) turning about the back top edge
  const N = 28, pts = [], ca = Math.cos(lidA), sa = Math.sin(lidA);
  const rot = (b, y) => { const rb = b - D, ry = y - top; return [D + rb * ca + ry * sa, top - rb * sa + ry * ca]; };
  const rotN = (nb, ny) => [nb * ca + ny * sa, -nb * sa + ny * ca];
  for (let i = 0; i <= N; i++) { const th = i / N * Math.PI, b = R - R * Math.cos(th), y = top + RY * Math.sin(th), n = rotN(-Math.cos(th) * RY, Math.sin(th) * R), l = Math.hypot(n[0], n[1]); pts.push({ p: rot(b, y), n: [n[0] / l, n[1] / l], k: 'a', u: i / N }); }
  // chord (the lining), back → front
  for (let i = 1; i < N; i++) { const b = D - i / N * D; pts.push({ p: rot(b, top), n: rotN(0, -1), k: 'c', u: 1 - i / N }); }
  let s0 = 1e9, s1 = -1e9; const ss = pts.map(o => { const s = o.p[1] + o.p[0] * ky; if (s < s0) s0 = s; if (s > s1) s1 = s; return s; });
  // end cap (right end of the lid), exact: invert the view on the plane x = W and test the half ellipse
  if (sx > 0.05) { const cx0 = ox + W, xs0 = Math.floor(cx0 + Math.min(...pts.map(o => o.p[0])) * sx) - 1, xs1 = Math.ceil(cx0 + Math.max(...pts.map(o => o.p[0])) * sx) + 1;
    for (let Xs = xs0; Xs <= xs1; Xs++) { const b = (Xs + 0.5 - cx0) / sx; for (let s = Math.floor(s0) - 1; s <= Math.ceil(s1) + 1; s++) { const y = s + 0.5 - b * ky, rb = b - D, ry = y - top, lb = D + rb * ca - ry * sa, ly = top + rb * sa + ry * ca, u = (lb - R) / R, v = (ly - top) / RY;
      if (ly < top - 0.01 || u * u + v * v > 1) continue; const edge = u * u + v * v > 0.72, T = edge ? [MI.iron, 4 + (v > 0.7 ? 1 : 0), 0.86, 0] : [MI.wood, 3.4 + (Math.round(Math.hypot(u, v) * 7) % 2 ? -0.7 : 0), 0.86, 0]; zput(Xs, oy - s, dst(W, y, b) - 0.01, T); } } }
  for (let s = Math.floor(s0); s <= Math.ceil(s1); s++) {
    const sc = s + 0.5; let best = null, bd = 1e9;
    for (let i = 0; i < pts.length; i++) { const A = pts[i], B = pts[(i + 1) % pts.length], sa2 = ss[i], sb2 = ss[(i + 1) % pts.length]; if ((sa2 <= sc && sb2 > sc) || (sb2 <= sc && sa2 > sc)) { const f = (sc - sa2) / (sb2 - sa2), b = A.p[0] + (B.p[0] - A.p[0]) * f, y = A.p[1] + (B.p[1] - A.p[1]) * f, d = b - ky * y;
      if (d < bd) { bd = d; best = { b, y, k: A.k === B.k ? A.k : 'a', u: A.u + (B.u - A.u) * f, n: [A.n[0] + (B.n[0] - A.n[0]) * f, A.n[1] + (B.n[1] - A.n[1]) * f] }; } } }
    if (!best) continue; const Xo = ox + best.b * sx, nx = 0, ny = clamp(-best.n[1], -0.95, 0.95), nzb = best.n[0];
    for (let x = 0; x < W; x++) {
      const xr = Math.min(G0.W - 1, Math.floor(x / fx)); let T;
      if (best.k === 'a') { T = lidTex(xr, best.u, st);
        const up = -ny, sh = T[4] ? 0 : (up > 0.55 ? 0.9 + (up > 0.85 ? 0.5 : 0) : up < -0.2 ? -1.2 : 0) + (nzb > 0.3 ? -1.4 : 0);
        T = [T[0], T[1] + sh, T[2] || nx, (T[3] || 0) * 0.5 + ny * (nzb < 0 ? 1 : 0.6), T[4]]; }
      else { T = liningTex(xr, best.u, st); const L = lidA < 0.6 ? (st.leak || 0) : 0; if (L > 0.02 && best.u < 0.35 + L * 0.5) T = [QM, QT - 1 + L * 1.5 - best.u * 2, 0, 0, 255]; else if (mim > 0.3) { const ex = Math.min(Math.abs(xr - G0.W / 2 + 15), Math.abs(xr - G0.W / 2 - 15)), ev = Math.abs(best.u - 0.62) * 30; T = ex < 4 && ev < 1.6 - ex * 0.3 ? [MI.red, ex < 1.5 && ev < 0.7 ? 10.5 : 8.6, 0, 0, 255] : [MI.crimson, 1.4 + Math.sin(best.u * 9) * 0.5, 0, 0.5]; } }
      zput(Math.round(Xo + x), oy - s, dst(x, best.y, best.b), T);
    }
  }
  // mimic's upper teeth on the lid's front edge
  if (mim > 0.01) for (let x = 7; x < W - 4; x++) { const k = (x - 7) % 7, hgt = k < 4 ? 3 - Math.abs(k - 1.5) * 1.3 : 0; for (let yy = 0; yy < hgt * mim * 1.6; yy++) { const p = rot(0.8, top - yy - 0.5); zput(ox + x + p[0] * sx, oy - Math.round(p[1] + p[0] * ky), dst(x, p[1], p[0]) - 0.5, [MI.bone, 8.4 - yy * 0.9, 0, 0.3]); } }
  // hasp: a brass tongue on the lid's front edge, hanging over the lock plate
  for (let x = Math.round(W / 2 - 4); x <= Math.round(W / 2 + 4); x++) for (let k = 0; k < 9; k++) { const p = rot(-0.6, top + 2 - k), dx = x - W / 2, edge = Math.abs(dx) >= 3.6 || k === 8, T = edge ? [MI.brass, k === 8 ? 3.8 : dx < 0 ? 8 : 4.2, 0, 0] : (k === 4 && Math.abs(dx) < 1.5 ? [MI.ink, 0.5, 0, 0] : [MI.brass, 6.6 + (k < 2 ? 1 : 0) - k * 0.12, 0, -0.2]);
    zput(ox + x + p[0] * sx, oy - Math.round(p[1] + p[0] * ky), dst(x, p[1], p[0]) - 0.6, T); }
  // chains round the chest (each one heats up in its tier's colour just before it snaps) and the padlock on the hasp
  if (st.chains && lidA < 0.3) { const lidB = (y) => (y <= top ? 0 : R - R * Math.cos(Math.asin(clamp((y - top) / RY, 0, 1))));
    st.chains.forEach(ch => { if (!ch.on) return; const path = CHAIN_PATH[ch.id]; if (!path) return; const pts = path(W, BH, FT, top, RY, D);
      const heat = ch.heat || 0, cm = mid(QR[clamp(ch.col | 0, 0, 7)][0]), ct = QR[clamp(ch.col | 0, 0, 7)][1];
      let s0 = 0; for (let k = 0; k + 1 < pts.length; k++) { const A = pts[k], Bp = pts[k + 1], side = A[2] === 'side'; if (side !== (Bp[2] === 'side')) continue;
        const toS = (P) => side ? [ox + W + P[1] * sx, oy - (P[0] + P[1] * ky), P[1]] : (() => { const b = lidB(P[1]); return [ox + P[0] + b * sx, oy - (P[1] + b * ky), b]; })();
        const a0 = side ? [A[0], A[1]] : A, b0 = side ? [Bp[0], Bp[1]] : Bp, sa = toS(a0), sb = toS(b0), len = Math.hypot(sb[0] - sa[0], sb[1] - sa[1]), n = Math.max(1, Math.ceil(len * 1.5)), px2 = -(sb[1] - sa[1]) / (len || 1), py2 = (sb[0] - sa[0]) / (len || 1);
        for (let i = 0; i <= n; i++) { const f = i / n, P = [a0[0] + (b0[0] - a0[0]) * f, a0[1] + (b0[1] - a0[1]) * f], S2 = toS(P), sidx = Math.floor(s0 + f * len), kk = ((sidx % 4) + 4) % 4, yl = side ? P[0] : P[1], d0 = (side ? dst(W, yl, P[1]) : dst(P[0], yl, S2[2])) - 1.6;
          const T = (tn, lit) => heat > 0.02 ? [cm, ct - 4.2 + heat * 4.4 + (lit ? 0.6 : 0) + (heat > 0.8 ? Math.sin((st.t || 0) * 40 + i) * 0.4 : 0), 0, 0, heat > 0.25 ? 255 : 0] : [MI.iron, tn, lit ? -0.5 : 0.5, lit ? -0.5 : 0.5];
          if (kk < 2) { zput(Math.round(S2[0] + px2), Math.round(S2[1] + py2), d0, T(4.4, false)); zput(Math.round(S2[0] - px2), Math.round(S2[1] - py2), d0, T(7.2, true)); }
          else zput(Math.round(S2[0]), Math.round(S2[1]), d0, T(kk === 2 ? 8.2 : 6.6, true)); }
        s0 += len; } }); }
  if (st.lock && lidA < 0.3) { const p0 = rot(-0.6, top - 6), X0 = Math.round(ox + W / 2 + p0[0] * sx), Y0 = Math.round(oy - (p0[1] + p0[0] * ky)), d0 = dst(W / 2, top - 6, -1) - 3, sw = st.lock.a || 0;
    PADLOCK.forEach(([dx, dy, m, t2, nx]) => zput(X0 + dx + Math.round(Math.sin(sw) * dy), Y0 + dy, d0, [m, t2, nx || 0, 0])); }
  // iron ring handle on the right side
  if (sx > 0.12) { const b = D * 0.5, y = FT + BH * 0.62, X0 = Math.round(ox + W + b * sx), Y0 = Math.round(oy - (y + b * ky)), d0 = dst(W, y, b) - 2;
    [[0, -2, 6.4], [1, -2, 4], [0, -1, 5.6], [1, -1, 3.4], [-1, 1, 7], [0, 2, 6.2], [1, 3, 5.2], [2, 3, 4.4], [3, 2, 3.4], [3, 1, 3], [2, 0, 3.6]].forEach(([dx, dy, t]) => zput(X0 + dx, Y0 + dy, d0, [MI.iron, t + 0.6, 0.5, 0])); }
  // selective outline: ink under and right of the chest, a dark step of the neighbour on the lit sides
  { const L = S.c, add = []; for (let y = BB.y0 - 1; y <= BB.y1 + 1; y++) for (let x = BB.x0 - 1; x <= BB.x1 + 1; x++) { if (x < 0 || y < 0 || x >= ZW || y >= ZH) continue; const p = y * ZW + x; if (ZB[p] < 1e8) continue;
      const up = y > 0 && ZB[p - ZW] < 1e8, lf = x > 0 && ZB[p - 1] < 1e8, dn = y < ZH - 1 && ZB[p + ZW] < 1e8, rt = x < ZW - 1 && ZB[p + 1] < 1e8; if (!(up || lf || dn || rt)) continue;
      const q = dn ? p + ZW : p + 1; add.push([x, y, up || lf ? MI.ink : L.m[q], up || lf ? 0 : 1 + lift]); }
    add.forEach(a => S.put(a[0], a[1], a[2], a[3], 0, 0, WB && a[2] !== MI.ink ? 255 : 0, Z - 20)); }
  return { x0: ox, y0: oy - Math.round(top + D * ky + RY + 30), x1: ox + W + Math.ceil(D * sx), y1: oy, top, W, BH, cx: ox + W / 2 + D * sx / 2, cy: oy - top };
};

// ───────── the vault: the whole screen behind the chest (480×270 cells, floor top at 196) ─────────
// A treasure cellar, not a shrine: a heavy ceiling beam on two wooden posts with torches, a stone arch at the back closed
// by an iron portcullis with a dark corridor behind it, shelves of treasure left and right (goblets, crowns, potions, a
// skull, scroll cases…), dark side passages with heaps of coins in front, two iron braziers, two lanterns on chains, the
// chest on a low stone dais at the end of a worn red carpet, chains hanging in front. The chest's own light, through
// its seam and then out of the open lid, is what lights the room in the tier's colour.
const TX = X.TX, n1 = X.n1;
const AW = 480, AH = 270, GY = 196, CHX = 240, CHY = 229;
const V = PX.V = { AW, AH, GY, CHX, CHY };
// fire (cellular heat automaton, as in the smithy) and small flames
let R0 = X.rng(991); const RR = () => R0();
function fireSim(st, w, h, t, heat) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + RR() * 0.15) - (edge < 3 ? 6 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s2 = y * w + x, v = f[s2]; if (!v) { f[s2 - w] = 0; continue; } const r = Math.floor(RR() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (RR() < 0.42 ? 1 : 0)); }
  }
  return f;
}
function flame(D, x, y, s2, t, ph) { const hh2 = Math.round(s2 * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh2; k++) { const q = k / hh2, w = Math.max(1, Math.round((1 - q * q) * s2 * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); } }
// an arch opening: inside(x, y) for a round-topped doorway, and its ring of wedge stones
const inArch = (x, y, cx, top, w, bot) => { const r = w / 2, cy = top + r; if (y > bot || Math.abs(x - cx) > r) return false; if (y >= cy) return true; const dx = x - cx, dy = y - cy; return dx * dx + dy * dy <= r * r; };
function archRing(S, cx, top, w, bot, th, m, t0) {
  const r = w / 2, cy = top + r;
  for (let y = top - th; y <= bot; y++) for (let x = Math.round(cx - r - th); x <= Math.round(cx + r + th); x++) {
    if (inArch(x, y, cx, top, w, bot) || !inArch(x, y, cx, top - th, w + th * 2, bot)) continue;
    let seg, rad; if (y < cy) { const a = Math.atan2(y - cy, x - cx); seg = Math.floor((a + Math.PI) / (Math.PI / 9)); rad = Math.hypot(x - cx, y - cy) - r; } else { seg = 100 + Math.floor((y - cy) / 10) * 2 + (x < cx ? 0 : 1); rad = Math.abs(x - cx) - r; }
    const edge = y < cy ? (Math.abs(((Math.atan2(y - cy, x - cx) + Math.PI) / (Math.PI / 9)) % 1) < 0.1) : ((y - cy) % 10 < 1);
    S.px(x, y, m, t0 + (hh(seg, 3, 17) - 0.5) * 1.2 + (rad < 1 ? -1.4 : rad > th - 1.5 ? 0.6 : 0.2) + (edge ? -2.4 : 0), { n: [0, 0] });
  }
}
// the layout
const ARCH = { x: CHX, top: 40, w: 150 };
const POSTS = [{ x: 82, w: 12 }, { x: 386, w: 12 }];
const TORCH = [{ x: 88, y: 118 }, { x: 392, y: 118 }];
const SHELF = [{ x0: 100, x1: 160 }, { x0: 320, x1: 380 }], SHELF_Y = [86, 120, 154], SHELF_TOP = 56, SHELF_BOT = 172;
const LANT = [{ x: 176, y: 62, ph: 0 }, { x: 304, y: 62, ph: 2.1 }];
const PILES = [{ x: 44, y: 214, w: 48, h: 26, s: 1 }, { x: 436, y: 214, w: 48, h: 26, s: 2 }];
const pileH = (P, x) => { const u = (x - P.x) / P.w; if (Math.abs(u) >= 1) return 0; return P.h * Math.pow(1 - u * u, 0.8) * (0.9 + 0.1 * Math.sin(x * 0.7 + P.s)); };
const BRAZ = [{ x: 146, y: 222 }, { x: 334, y: 222 }];
const DAIS = { top: 214, y: 230, hw0: 70, hw1: 80, r1: 6, s2: 4, hw2: 92, r2: 5 };
// lights (fixed order; the game drives them through s.mul): the key light on the chest, the chest's tier lights, braziers
const LI = { spot: 0, tier: 1, brazL: 9, brazR: 10 };
// shelf treasures: a few kinds drawn from small painters
function goblet(S, x, y, m) { S.beg(); S.rect(x - 2, y - 8, 5, 4, m, 6.6); S.hl(x - 2, y - 8, 5, m, 8.6); S.px(x - 1, y - 7, m, 10); S.vl(x, y - 4, 3, m, 5.6); S.rect(x - 2, y - 1, 5, 1, m, 5); S.end({ lit: 1 }); }
function potion(S, x, y, liq) { S.beg(); S.rect(x - 2, y - 6, 5, 6, 'glass', 4.6); S.rect(x - 1, y - 4, 3, 4, liq, 7, { e: 255 }); S.px(x - 1, y - 5, 'glass', 9.6); S.rect(x - 1, y - 8, 3, 2, 'glass', 5.4); S.px(x, y - 9, 'wood', 5); S.end({ lit: 1 }); }
function crown(S, x, y) { S.beg(); S.rect(x - 4, y - 3, 9, 3, 'gold', 7); S.hl(x - 4, y - 3, 9, 'gold', 9); [-4, -2, 0, 2, 4].forEach((d, i) => S.px(x + d, y - 4 - (i % 2), 'gold', 8.4)); S.px(x - 2, y - 2, 'red', 8, { e: 255 }); S.px(x + 2, y - 2, 'water', 8.6, { e: 255 }); S.end({ lit: 1 }); }
function skull(S, x, y) { S.beg(); S.ell(x, y - 4, 3.5, 3.5, 'bone', 7.2, { dome: 1 }); S.rect(x - 2, y - 1, 5, 1, 'bone', 6); S.px(x - 1, y - 4, 'ink', 0); S.px(x + 1, y - 4, 'ink', 0); S.px(x, y - 2, 'bone', 3); S.end({ lit: 1 }); }
function scrolls(S, x, y) { S.beg(); S.hcyl(x - 5, y - 3, 11, 3, 'paper', 7.4, { rim: 2 }); S.hcyl(x - 4, y - 6, 9, 3, 'paper', 8, { rim: 2 }); S.px(x, y - 2, 'crimson', 6); S.px(x, y - 5, 'crimson', 6); S.end({ lit: 1 }); }
function coinPile(S, x, y) { S.beg(); for (let k = 0; k < 4; k++) { S.rect(x - 3, y - 1 - k * 2, 7, 2, 'gold', 6 + k * 0.4); S.hl(x - 3, y - 1 - k * 2, 7, 'gold', 8.4); } S.end({ lit: 1 }); }
function casket(S, x, y) { S.beg(); S.box(x - 5, y - 6, 11, 6, 'wood', 5.4, { top: 2 }); S.hl(x - 5, y - 4, 11, 'brass', 6.6); S.px(x, y - 3, 'brass', 8.4); S.end({ lit: 1 }); }
const SHELF_ITEMS = [(S, x, y) => goblet(S, x, y, 'brass'), (S, x, y) => potion(S, x, y, 'red'), crown, skull, (S, x, y) => potion(S, x, y, 'leaf'), scrolls, coinPile, casket, (S, x, y) => potion(S, x, y, 'arcane'), (S, x, y) => goblet(S, x, y, 'gold'), (S, x, y) => potion(S, x, y, 'water')];
const SHELF_CANDLES = [];
const CAND = [];
function paintVault(S, sc) {
  S.lay('wall');
  TX.ashlar(S, 0, 0, AW, GY, 'stone', 2.8, { bh: 12, bw: 26, crack: 0.22, mt: 0.9 });
  S.noise(0, 0, AW, GY, 0.7, 16, 3);
  // side passages
  [[40, 108, 62], [440, 108, 62]].forEach(([cx, top, w]) => {
    for (let y = top; y < GY; y++) for (let x = cx - w / 2; x <= cx + w / 2; x++) if (inArch(x, y, cx, top, w, GY)) { const k = (y - top) / (GY - top); S.px(x, y, 'rock', 0.6 + k * 1.4 + (inArch(x, y, cx, top + 14, w - 24, GY) ? 0.8 : 0)); }
    archRing(S, cx, top, w, GY, 7, 'mstone', 3.2);
  });
  // the back arch: a dark corridor running away behind an iron portcullis (the bars are in the back layer)
  for (let y = ARCH.top; y < GY; y++) for (let x = ARCH.x - ARCH.w / 2; x <= ARCH.x + ARCH.w / 2; x++) { if (!inArch(x, y, ARCH.x, ARCH.top, ARCH.w, GY)) continue; const dx = Math.abs(x - ARCH.x) / (ARCH.w / 2), inner = inArch(x, y, ARCH.x, ARCH.top + 40, ARCH.w - 70, GY);
    S.px(x, y, 'rock', inner ? 0.7 + (y > 150 ? (y - 150) / 46 * 1.6 : 0) : 1.2 + (1 - dx) * 0.8 + (y - ARCH.top) / (GY - ARCH.top) * 1.2); }
  for (let k = 0; k < 6; k++) { const y = 156 + k * k * 1.3; S.hl(ARCH.x - 34 - k * 4, Math.round(y), 68 + k * 8, 'rock', 2.2 + k * 0.2); }   // the corridor floor running away
  archRing(S, ARCH.x, ARCH.top, ARCH.w, GY, 10, 'mstone', 3.6);
  S.beg(); S.box(ARCH.x - 8, ARCH.top - 13, 16, 16, 'mstone', 4.4); for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const r1 = x * x + y * y, r2 = (x - 2.5) ** 2 + (y + 1) ** 2; if (r1 <= 20 && r2 > 12) S.px(ARCH.x + x, ARCH.top - 5 + y, 'brass', 6.4 - (r1 > 14 ? 1.4 : 0) + (x < -2 ? 1 : 0)); } S.end({ lit: 1 });
  // cobwebs, ceiling shadow
  [[0, 0, 1], [AW - 1, 0, -1]].forEach(([x0, y0, dx]) => { for (let k = 0; k < 5; k++) { const a = k / 4 * Math.PI / 2; for (let r = 0; r < 30; r++) if (hh(k, r, 9) > 0.25) S.px(x0 + dx * Math.round(Math.cos(a) * r), y0 + 22 + Math.round(Math.sin(a) * r), 'linen', 3 - r * 0.04); } });
  S.ao(0, 0, AW, 60, 't', 2.2);
  // floor: flagstones in perspective (the seams run toward the back arch), worn, a few cracks and lost coins
  const ROWS = [196, 200, 205, 211, 219, 229, 242, 258, 271], VP = [240, 40];
  for (let ri = 0; ri < ROWS.length - 1; ri++) { const y0 = ROWS[ri], y1 = ROWS[ri + 1];
    for (let y = y0; y < y1 && y < AH; y++) { const k = (y - VP[1]) / (GY - VP[1]), sp = 46 * k, off = ri % 2 ? sp / 2 : 0;
      for (let x = 0; x < AW; x++) { const cxk = Math.floor((x - VP[0] + off + 1000 * sp) / sp), inx = (x - VP[0] + off + 1000 * sp) - cxk * sp, stone = hh(cxk, ri, 41);
        S.px(x, y, 'stone', 3.1 + (stone - 0.5) * 1.1 + (y - y0 < 1 && ri > 0 ? -2.6 : y - y0 < 2 && ri > 0 ? 0.7 : 0) + (inx < 1 ? -2.4 : inx < 2 ? 0.5 : 0) - (y > 250 ? 0.6 : 0)); } } }
  S.noise(0, GY, AW, AH - GY, 0.8, 7, 12);
  TX.crack(S, 96, 238, 26, 'stone', 3); TX.crack(S, 352, 224, 18, 'stone', 3); TX.crack(S, 404, 256, 22, 'stone', 3);
  // the red carpet up to the dais: gold edges, a row of diamonds, worn patches
  for (let y = DAIS.y + DAIS.r1 + DAIS.s2 + DAIS.r2; y < AH; y++) { const k = (y - 245) / 25, hw = 40 + k * 14;
    for (let x = Math.round(CHX - hw); x <= Math.round(CHX + hw); x++) { const e = Math.min(x - (CHX - hw), CHX + hw - x), u = (x - CHX) / hw, dia = Math.abs(((x - CHX) / 7 + (y % 12) / 6) % 2 - 1) + Math.abs(((y % 12) - 6) / 6) < 0.5 && Math.abs(u) < 0.6;
      S.px(x, y, e < 2 ? 'gold' : 'crimson', e < 2 ? 5.6 - e * 0.8 : 4 + (dia ? 1.6 : 0) - Math.abs(u) * 0.6 + (hh(x >> 2, y >> 1, 5) < 0.12 ? -1 : 0)); } }
  // lost coins on the floor
  for (let k = 0; k < 18; k++) { const x = 16 + hh(k, 5, 3) * 448, y = 204 + hh(k, 6, 3) * 62; if (Math.abs(x - CHX) < 100) continue; COIN_F.forEach(([dx, dy, m, t]) => S.px(Math.round(x) + dx, Math.round(y) + dy, m, t - 1.5)); }
  // ── back layer: the portcullis, the ceiling beam and posts, the shelves
  S.lay('back');
  S.beg(); for (let y = ARCH.top + 2; y < GY; y++) for (let x = ARCH.x - ARCH.w / 2 + 2; x <= ARCH.x + ARCH.w / 2 - 2; x++) { if (!inArch(x, y, ARCH.x, ARCH.top + 2, ARCH.w - 4, GY)) continue; const bx = ((x - ARCH.x) % 11 + 11) % 11, by = (y - ARCH.top) % 13;
    if (bx < 2) S.px(x, y, 'iron', bx ? 3.6 : 6, { n: [bx ? 0.6 : -0.6, 0] }); else if (by < 2) S.px(x, y, 'iron', by ? 3.4 : 5.6, { n: [0, by ? 0.6 : -0.6] });
    if (bx === 0 && by === 0) S.px(x, y, 'iron', 8.4); }
  for (let x = ARCH.x - ARCH.w / 2 + 2; x <= ARCH.x + ARCH.w / 2 - 2; x++) { const bx = ((x - ARCH.x) % 11 + 11) % 11; if (bx < 2) for (let k = 0; k < 3; k++) S.px(x, GY - 1 - k, 'iron', 7 - k); }
  S.end({ lit: 1 });
  S.beg(); TX.planks(S, 0, 10, AW, 12, 'wood', 4.4, { ph: 6, nails: false }); S.hl(0, 21, AW, 'wood', 2.2); for (let x = 30; x < AW; x += 90) { S.rect(x, 9, 6, 14, 'iron', 4.6); S.px(x + 1, 11, 'iron', 8); S.px(x + 1, 19, 'iron', 8); } S.end({ lit: 1 });
  POSTS.forEach(P => { S.beg(); TX.vplanks(S, P.x, 22, P.w, GY - 22, 'wood', 4.2, { pw: 6, knots: 1 }); S.rect(P.x - 2, 22, P.w + 4, 4, 'wood', 5); S.rect(P.x - 1, GY - 5, P.w + 2, 5, 'stone', 4); S.end({ lit: 1 }); });
  // torches in iron sconces on the posts
  TORCH.forEach(T => { S.beg(); S.rect(T.x - 1, T.y, 3, 8, 'iron', 4.6); S.line(T.x, T.y + 6, T.x + 3, T.y + 10, 'iron', 4); S.rect(T.x - 2, T.y - 4, 5, 5, 'wood', 4.4); S.hl(T.x - 2, T.y - 4, 5, 'iron', 6); S.end({ lit: 1 }); });
  SHELF.forEach((H, si) => { S.beg();
    TX.vplanks(S, H.x0, SHELF_TOP, H.x1 - H.x0, SHELF_BOT - SHELF_TOP, 'wood', 2.6, { pw: 7 }); S.ao(H.x0, SHELF_TOP, H.x1 - H.x0, 10, 't', 1.2);
    S.rect(H.x0 - 3, SHELF_TOP - 2, 3, SHELF_BOT - SHELF_TOP + 2, 'wood', 4.6); S.rect(H.x1, SHELF_TOP - 2, 3, SHELF_BOT - SHELF_TOP + 2, 'wood', 3.8); S.rect(H.x0 - 4, SHELF_TOP - 4, H.x1 - H.x0 + 8, 3, 'wood', 5.2);
    SHELF_Y.forEach(y => { S.rect(H.x0, y, H.x1 - H.x0, 3, 'wood', 5); S.hl(H.x0, y, H.x1 - H.x0, 'wood', 6.6); S.hl(H.x0, y + 3, H.x1 - H.x0, 'wood', 1.4); S.ao(H.x0, y - 8, H.x1 - H.x0, 8, 'b', 0.8); });
    S.end({ lit: 1 });
    SHELF_Y.forEach((y, ri) => { let x = H.x0 + 5; let k = si * 7 + ri * 3; while (x < H.x1 - 5) { const f = SHELF_ITEMS[k % SHELF_ITEMS.length]; if (hh(k, ri, 77) < 0.14) { SHELF_CANDLES.push({ x, y: y - 1 }); S.beg(); S.rect(x - 1, y - 6, 2, 6, 'linen', 8.6); S.end({ lit: 1 }); } else f(S, x, y); x += 9 + Math.floor(hh(k, 3, 11) * 4); k++; } }); });
  // ── mid layer: treasure heaps, braziers, the dais
  S.lay('mid');
  PILES.forEach((P, pi) => { S.beg();
    for (let x = Math.round(P.x - P.w); x <= P.x + P.w; x++) { const h = pileH(P, x); for (let y = Math.round(P.y - h); y <= P.y; y++) { const u = (x - P.x) / P.w, top = y - (P.y - h) < 1.5; S.px(x, y, 'gold', 4.2 + (top ? 1.6 : 0) + (hh(x, y, 13) - 0.5) * 1.3 - (y - (P.y - h)) * 0.06, { n: [u * 0.6, -0.5] }); } }
    for (let k = 0; k < 60; k++) { const x = P.x - P.w + 4 + hh(k, 7, P.s) * (P.w * 2 - 8), h = pileH(P, x), y = P.y - h + 2 + hh(k, 8, P.s) * Math.max(1, h - 3), kind = hh(k, 9, P.s); (kind < 0.07 ? GEMS[k % 3] : kind < 0.2 ? COIN_E : COIN_F).forEach(([dx, dy, m, t, e]) => S.px(Math.round(x) + dx, Math.round(y) + dy, m, t - 0.6, e ? { e } : undefined)); }
    S.end({ lit: 1 });
    const sg = pi ? -1 : 1, swx = P.x + sg * 8, swy = P.y - pileH(P, P.x + sg * 8) + 4; S.beg(); S.rect(swx, swy - 26, 2, 22, 'iron', 8); S.vl(swx + 1, swy - 26, 22, 'iron', 5); S.px(swx, swy - 27, 'iron', 9); S.rect(swx - 4, swy - 29, 10, 2, 'brass', 6.6); S.rect(swx, swy - 35, 2, 6, 'leather', 5); S.rect(swx - 1, swy - 37, 4, 2, 'brass', 8); S.end({ lit: 1 });
    const shx = P.x - sg * 22, shy = P.y - 9; S.beg(); S.ell(shx, shy, 10, 10, 'iron', 5, { dome: 1 }); S.ell(shx, shy, 8, 8, 'crimson', 5.2, { dome: 1 }); S.rect(shx - 1, shy - 8, 3, 17, 'brass', 6); S.rect(shx - 8, shy - 1, 17, 3, 'brass', 6); S.ell(shx, shy, 2.5, 2.5, 'brass', 8, { dome: 1 }); S.end({ lit: 1 });
  });
  BRAZ.forEach((B, bi) => { S.beg(); const x = B.x, y = B.y;
    [[-8, 0], [8, 0], [0, 2]].forEach(([dx, dy]) => S.line(x + dx * 0.4, y - 18, x + dx, y + dy, 'iron', dy ? 3.4 : 4.6, { w: 2 }));
    S.hl(x - 6, y - 8, 13, 'iron', 4);
    for (let k = 0; k < 8; k++) { const w = 11 - k * 0.8; S.rect(Math.round(x - w), y - 26 + k, Math.round(w * 2) + 1, 1, 'iron', 5.4 - k * 0.35); }
    S.ell(x, y - 26, 11, 2.4, 'iron', 7, { ring: 1 }); S.ell(x, y - 26, 9.5, 1.6, 'rock', 2);
    for (let k = -8; k <= 8; k += 2) S.px(x + k, y - 27 + (Math.abs(k) > 5 ? 1 : 0), 'fire', 3.2 + hh(k, bi, 3) * 1.5, { e: 255 });
    S.end({ lit: 1 }); });
  // the dais: a flat top in perspective, a riser, a lower step and its riser
  S.beg(); const D0 = DAIS;
  for (let y = D0.top; y < D0.y; y++) { const k = (y - D0.top) / (D0.y - D0.top), hw = D0.hw0 + (D0.hw1 - D0.hw0) * k; for (let x = Math.round(CHX - hw); x <= Math.round(CHX + hw); x++) { const e = Math.min(x - (CHX - hw), CHX + hw - x); S.px(x, y, 'mstone', 4.2 + (e < 1.5 ? 0.9 : 0) + (y === D0.top ? -1.4 : 0) + (hh(x >> 3, y >> 2, 21) - 0.5) * 0.8, { n: [0, -0.8] }); } }
  S.rect(CHX - D0.hw1, D0.y, D0.hw1 * 2 + 1, D0.r1, 'mstone', 3, { n: [0, 0] }); S.hl(CHX - D0.hw1, D0.y, D0.hw1 * 2 + 1, 'mstone', 5.2);
  for (let x = CHX - D0.hw1; x <= CHX + D0.hw1; x += 17) S.vl(x, D0.y + 1, D0.r1 - 1, 'mstone', 1.4);
  const y2 = D0.y + D0.r1; for (let y = y2; y < y2 + D0.s2; y++) { const hw = D0.hw1 + (D0.hw2 - D0.hw1) * (y - y2) / D0.s2; S.hl(Math.round(CHX - hw), y, Math.round(hw * 2) + 1, 'mstone', 4.4, { n: [0, -0.8] }); }
  S.rect(CHX - D0.hw2, y2 + D0.s2, D0.hw2 * 2 + 1, D0.r2, 'mstone', 2.8); S.hl(CHX - D0.hw2, y2 + D0.s2, D0.hw2 * 2 + 1, 'mstone', 4.8);
  S.noise(CHX - D0.hw2, D0.top, D0.hw2 * 2, 40, 0.6, 5, 33); S.end({ lit: 1 });
  // ── front layer: rubble at the corners
  S.lay('front');
  [[16, 268, 1], [468, 266, -1]].forEach(([x, y, s2]) => { S.beg(); S.ell(x, y, 22, 9, 'rock', 1.4, { dome: 1 }); S.ell(x + s2 * 14, y - 6, 9, 6, 'mstone', 1.8, { dome: 1 }); S.end({ ink: 1 }); });
  // ── lights (order matters: LI)
  sc.light({ x: CHX, y: 120, z: 96, r: 150, i: 1, c: '#ffd8a8', tint: 0.2, bake: false });
  QL.forEach(c => sc.light({ x: CHX, y: CHY - 40, z: 50, r: 180, i: 0, c, tint: 0.5, bake: false }));
  BRAZ.forEach((B, i) => sc.light({ x: B.x, y: B.y - 34, z: 36, r: 118, i: 0, c: '#ff9a40', tint: 0.5, fl: 'fire', ph: i * 5, bake: false }));
  TORCH.forEach((T, i) => sc.light({ x: T.x, y: T.y - 8, z: 10, r: 96, i: 0.95, c: '#ffa050', tint: 0.3, fl: 'fire', ph: i * 3 + 1 }));
  LANT.forEach((L, i) => sc.light({ x: L.x, y: L.y + 6, z: 30, r: 70, i: 0.7, c: '#ffc070', tint: 0.25, fl: 'candle', ph: i * 2 }));
  sc.light({ x: ARCH.x, y: 150, z: 2, r: 60, i: 0.5, c: '#ff9a50', tint: 0.4, fl: 'fire', ph: 7 });   // a torch far down the corridor
  sc.light({ x: 40, y: 160, z: 4, r: 80, i: 0.4, c: '#4a5cb0', tint: 0.4 }); sc.light({ x: 440, y: 160, z: 4, r: 80, i: 0.4, c: '#4a5cb0', tint: 0.4 });
  sc.light({ x: CHX, y: 160, z: 170, r: 330, i: 0.3, c: '#8a86c8', tint: 0.12 });
  BRAZ.forEach(B => sc.emit({ k: 'ember', x: B.x, y: B.y - 40, w: 10, h: 6, rate: 7, life: 1.5, sp: 12, ang: 0, spread: 0.8, when: () => V.fire > 0.3 }));
  TORCH.forEach(T => sc.emit({ k: 'ember', x: T.x, y: T.y - 10, w: 3, h: 2, rate: 1.6, life: 1.1, sp: 8, ang: 0, spread: 0.6 }));
}
PX.LI = LI;
// ───────── the vault, per frame ─────────
// o.ch: the chest (see PX.paint; x / y are filled in here, lift raises it off the dais); o.lock: the padlock once it has
// fallen ({ x, y } on the floor); o.room: q (tier 0…7), glow (the chest's light), spot (the key light 0…1), fire (braziers
// 0…1), sway (lanterns, kicked on every beat), dark (room pressed toward black, the chest excepted), pillar { a, w, rb },
// slit { a, y } (the hitstop's blade of light), beams [{ x, y, h, q, a }] (loot drop beams), halo { a, r }, rip [{ x, y, r, a, w }]
// o.pp: pixel particles [x, y, abgr, size]
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const QRGB = QL.map(rgb), INK = rgb('#07060f'), WHT = [255, 255, 255];
const RAIN = ['#e8434f', '#e0781f', '#ffcf4a', '#6fd46a', '#47d6c1', '#4f8fff', '#b86bff'].map(rgb);
const QMAIN = ['#c4ccd9', '#6fd46a', '#4f8fff', '#b86bff', '#ff9a3c', '#ff4a5a', '#c9a24a', '#ffb050'].map(rgb);
PX.chestX = (sx) => CHX - (G0.W + G0.D * (sx == null ? 0.3 : sx)) / 2;
const FS = [{}, {}];
function animVault(D, t, s, o) {
  const R = o.room || {}, c = o.ch || {}, q = clamp(R.q | 0, 0, 7);
  s.mul = s.mul || {}; s.mul[LI.spot] = R.spot == null ? 1 : R.spot; for (let i = 0; i < 8; i++) s.mul[LI.tier + i] = i === q ? (R.glow || 0) : 0;
  s.mul[LI.brazL] = s.mul[LI.brazR] = R.fire || 0; V.fire = R.fire || 0;
  // lanterns on chains: they swing harder when the chest jolts
  D.c = D.L.back; LANT.forEach(L => { const a = 0.05 * Math.sin(t * 0.9 + L.ph) + (R.sway || 0) * 0.2 * Math.sin(t * 7 + L.ph), top = 22, len = L.y - top; D.beg();
    for (let k = 0; k < len; k++) { const x = Math.round(L.x + Math.sin(a) * k); if (k % 4 < 2) D.px(x, top + k, 'iron', 4.6 - (k % 4) * 0.8); else D.px(x, top + k, 'iron', 6); }
    const bx = Math.round(L.x + Math.sin(a) * len), by = L.y; D.rect(bx - 3, by, 7, 2, 'iron', 4.6); D.rect(bx - 3, by + 11, 7, 2, 'iron', 4); D.vl(bx - 3, by + 2, 9, 'iron', 5.2); D.vl(bx + 3, by + 2, 9, 'iron', 3.6);
    D.rect(bx - 2, by + 2, 5, 9, 'lamp', 7.6, { e: 255 }); D.px(bx - 1, by + 3, 'lamp', 10, { e: 255 }); D.px(bx, by - 1, 'iron', 6); D.end({ lit: 1 }); flame(D, bx, by + 8, 3, t, L.ph); });
  // torches, shelf candles, the far corridor torch
  TORCH.forEach((T, i) => flame(D, T.x, T.y - 4, 7, t, i * 2.3));
  SHELF_CANDLES.forEach((C, i) => flame(D, C.x, C.y - 6, 3, t, i * 1.7));
  flame(D, ARCH.x, 150, 3, t, 5.5);
  // braziers catch when the lid opens
  D.c = D.L.mid; if ((R.fire || 0) > 0.02) BRAZ.forEach((B, bi) => { const f = fireSim(FS[bi], 20, 26, t, 0.55 + 0.45 * R.fire); for (let y = 0; y < 26; y++) for (let x = 0; x < 20; x++) { const v = f[y * 20 + x] - Math.max(0, Math.abs(x - 9.5) - 10 * Math.pow(y / 25, 0.8) - 1) * 6 - (25 - y) * 0.35; if (v < 4) continue; D.px(B.x - 10 + x, B.y - 52 + y, 'fire', clamp(v / 36 * 11.5, 1, 11), { e: 255 }); } });
  // chains hanging in front, swaying
  D.c = D.L.front; [[26, 132, 0], [454, 116, 2]].forEach(([x0, len, ph]) => { const a = 0.035 * Math.sin(t * 0.8 + ph) + (R.sway || 0) * 0.08 * Math.sin(t * 6 + ph); D.beg(); for (let y = 0; y < len; y++) { const x = Math.round(x0 + Math.sin(a) * y), k = y % 6; if (k < 4) { if (y % 12 < 6) D.px(x, y, 'iron', 4.4 - (k === 3 ? 1 : 0)); else { D.px(x - 1, y, 'iron', 5.4); D.px(x + 1, y, 'iron', 3.4); if (k === 0 || k === 3) D.px(x, y, 'iron', 5); } } }
    const hx = Math.round(x0 + Math.sin(a) * len); D.px(hx, len, 'iron', 5); D.px(hx + 1, len + 1, 'iron', 5); D.px(hx + 2, len + 2, 'iron', 4.4); D.px(hx + 2, len + 3, 'iron', 4); D.px(hx + 1, len + 4, 'iron', 3.4); D.end({ ink: 1 }); });
  // the padlock on the floor once it has fallen
  D.c = D.L.mid; if (o.lock) PX.padlock(D, Math.round(o.lock.x), Math.round(o.lock.y), o.lock.rot || 0, 1);
  // the chest
  const sx = c.sx == null ? 0.3 : c.sx;
  s.info = PX.paint(D, Object.assign({ t, z: 64, cw: AW, ch: AH }, c, { x: PX.chestX(sx), y: CHY - Math.round(c.lift || 0) }));
}
// screen-space passes at art resolution (hard bands, ordered dither, never blur)
function postVault(out, t, s, o) {
  const R = o.room || {}, q = clamp(R.q | 0, 0, 7), c1 = QRGB[q], cm = QMAIN[q], lift = (o.ch && o.ch.lift) || 0, B = X.bayer, mask = PX.mask;
  const add = (p, c, a) => { const v = out[p], r = (v & 255) + c[0] * a, g = ((v >> 8) & 255) + c[1] * a, b = ((v >> 16) & 255) + c[2] * a; out[p] = (0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0)) >>> 0; };
  // the chest's shadow on the dais (smaller and softer when it floats)
  { const k = clamp(1 - lift / 30, 0.35, 1), rx = 58 * k + 6, ry = 6 * k + 1, cy = CHY; for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(CHX - rx); x <= Math.ceil(CHX + rx); x++) { const u = (x - CHX) / rx, v = (y - cy) / ry, d = u * u + v * v; if (d > 1 || mask(x, y)) continue; X.blendPx(out, y * AW + x, INK, (d < 0.55 ? 0.5 : 0.3) * k); } }
  // loot drop beams: a thin column of the item's colour standing on a glow on the floor
  (R.beams || []).forEach(bm => { if (!(bm.a > 0.02)) return; const col = QMAIN[clamp(bm.q | 0, 0, 7)], x0 = Math.round(bm.x), yb = Math.round(bm.y), h = bm.h || 90;
    for (let y = Math.max(0, Math.round(yb - h)); y <= yb; y++) { const k = (yb - y) / h, fall = 1 - k * k; for (let dx = -4; dx <= 4; dx++) { const x = x0 + dx; if (x < 0 || x >= AW) continue; const ad = Math.abs(dx), a = bm.a * fall * (ad === 0 ? 1 : ad === 1 ? 0.8 : ad === 2 ? 0.5 : ad === 3 ? 0.26 : 0.1) * (0.85 + 0.15 * Math.sin(y * 0.4 - t * 9)), aq = Math.floor((a + (B(x, y) - 0.5) * 0.1) * 6) / 6; if (aq > 0) add(y * AW + x, ad === 0 ? WHT : col, aq); } }
    for (let y = yb - 3; y <= yb + 3; y++) for (let x = x0 - 16; x <= x0 + 16; x++) { if (x < 0 || x >= AW || y >= AH) continue; const u = (x - x0) / 16, v = (y - yb) / 3, d = u * u + v * v; if (d > 1) continue; const aq = Math.floor((bm.a * (1 - d) * 0.6 + (B(x, y) - 0.5) * 0.12) * 6) / 6; if (aq > 0) add(y * AW + x, col, aq); } });
  // the room pressed toward black (the chest itself stays)
  const dk = R.dark || 0; if (dk > 0.02) { const a0 = Math.round(dk * 8) / 8, k0 = 1 - a0, ir = INK[0] * a0, ig = INK[1] * a0, ib = INK[2] * a0;
    for (let p = 0; p < AW * AH; p++) { if (ZB[p] < 1e8) continue; const v = out[p]; out[p] = (0xff000000 | (((((v >> 16) & 255) * k0 + ib) | 0) << 16) | (((((v >> 8) & 255) * k0 + ig) | 0) << 8) | (((v & 255) * k0 + ir) | 0)) >>> 0; } }
  // the pillar of light out of the open chest, up into the ceiling: white core, bands of the tier's colour (rainbow for
  // 传说 and up) with bright streaks running up it, a splash where it hits the beam
  const pl = R.pillar; if (pl && pl.a > 0.02) { const top = Math.round(pl.top == null ? 0 : pl.top), bot = Math.round(CHY - 44 - lift), hw = (pl.w || 22) / 2;
    for (let y = Math.max(0, top); y < bot; y++) { const edgeFade = Math.min(1, (bot - y) / 10), wob = Math.sin(y * 0.13 + t * 3) * 0.8;
      for (let x = Math.floor(CHX - hw - 2); x <= Math.ceil(CHX + hw + 2); x++) { if (x < 0 || x >= AW) continue; const u = Math.abs(x + 0.5 - CHX - wob) / hw; if (u > 1.15) continue;
        const streak = 0.75 + 0.25 * Math.sin(y * 0.55 + t * 24 + Math.floor(x / 3) * 1.7), col = u < 0.22 ? WHT : pl.rb ? RAIN[((Math.floor((y + t * 60) / 9) % 7) + 7) % 7] : u < 0.55 ? c1 : cm;
        const a = pl.a * edgeFade * streak * (u < 0.22 ? 0.95 : u < 0.55 ? 0.7 : u < 1 ? 0.42 : 0.16), aq = Math.floor((a + (B(x, y) - 0.5) * 0.12) * 6) / 6; if (aq > 0) add(y * AW + x, col, aq); } }
    if (top <= 24) for (let y = 0; y < 30; y++) for (let x = Math.floor(CHX - hw * 3); x <= Math.ceil(CHX + hw * 3); x++) { const u = (x - CHX) / (hw * 3), v = (y - 16) / 14, d = u * u + v * v; if (d > 1) continue; const aq = Math.floor((pl.a * (1 - d) * 0.55 + (B(x, y) - 0.5) * 0.12) * 6) / 6; if (aq > 0) add(y * AW + x, c1, aq); } }
  // the hitstop's blade: the lid lifted a crack, a line of light across the whole room from the seam
  const sl = R.slit; if (sl && sl.a > 0.02) { const y0 = Math.round(sl.y); for (let y = y0 - 6; y <= y0 + 6; y++) { if (y < 0 || y >= AH) continue; const dy = Math.abs(y - y0); for (let x = 0; x < AW; x++) { const fx2 = 1 - Math.min(1, Math.abs(x - CHX) / 250) * 0.55, a = sl.a * fx2 * (dy === 0 ? 1 : dy === 1 ? 0.85 : dy < 4 ? 0.45 : 0.16), p = y * AW + x; if (ZB[p] < 1e8 && dy > 0) continue; const aq = Math.floor((a + (B(x, y) - 0.5) * 0.1) * 6) / 6; if (aq > 0) add(p, dy < 2 ? WHT : c1, aq); } } }
  // backlit by the blade: a rim of the tier's light along the silhouette's top edges
  if (sl && sl.a > 0.02 && o.ch && o.ch.dark) for (let y = 1; y < AH; y++) for (let x = 1; x < AW - 1; x++) { const p = y * AW + x; if (ZB[p] >= 1e8 || ZB[p - AW] < 1e8) continue; add(p, c1, 0.9 * sl.a); if (ZB[p + 1] < 1e8) add(p + AW, c1, 0.35 * sl.a); }
  // the chest's glow round its mouth (never over the chest itself)
  const hl = R.halo, mouth = CHY - 42 - lift; if (hl && hl.a > 0.02) { const r = hl.r || 70, r2 = r * r, cx = CHX, cy = mouth - 6; for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(AH, cy + r); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(AW, cx + r); x++) { const dx = x - cx, dy = (y - cy) * 1.3, d2 = dx * dx + dy * dy; if (d2 >= r2) continue; if (ZB[y * AW + x] < 1e8) continue; const f = 1 - Math.sqrt(d2) / r, a = Math.min(0.8, Math.floor(f * f * hl.a * 6 + B(x, y) * 0.4) / 6); if (a > 0) add(y * AW + x, c1, a); } }
  // ripples: a displaced ring with a white crest
  (R.rip || []).forEach(w => { if (!(w.a > 0.02)) return; const src = WB || (WB = new Uint32Array(AW * AH)); src.set(out); const ww = w.w || 7;
    const y0 = Math.max(0, Math.floor(w.y - w.r - ww)), y1 = Math.min(AH - 1, Math.ceil(w.y + w.r + ww)), x0 = Math.max(0, Math.floor(w.x - w.r - ww)), x1 = Math.min(AW - 1, Math.ceil(w.x + w.r + ww));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - w.x, dy = (y - w.y) * 1.25, d = Math.sqrt(dx * dx + dy * dy) || 1, e = Math.abs(d - w.r); if (e >= ww) continue; const k = w.a * (1 - e / ww), sx = Math.round(x - dx / d * k * 5), sy = Math.round(y - dy / d * k * 4), p = y * AW + x;
      if (sx >= 0 && sy >= 0 && sx < AW && sy < AH) out[p] = src[sy * AW + sx]; if (k > 0.35) X.addPx(out, p, w.c || WHT, Math.round(k * 3) / 10); } });
  // pixel particles (coins, links, dust, motes)
  const pp = o.pp; if (pp) for (let i = 0; i < pp.length; i++) { const P = pp[i], x = Math.round(P[0]), y = Math.round(P[1]), sz = P[3] || 1; for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) { const X0 = x + a, Y0 = y + b; if (X0 >= 0 && Y0 >= 0 && X0 < AW && Y0 < AH) out[Y0 * AW + X0] = P[2]; } }
}
let WB = null;
X.def('_chest_vault', { size: [AW, AH], fy: GY, noFrame: 1, amb: [0.26, 0.2], paint: paintVault, anim: animVault, post: postVault });

// ───────── the loot: what flies out of the chest (48×44 cells each, see-through, lit from below by the chest) ─────────
// kinds: coins (积分), pouch (a few 积分), sup (物资), bp (图纸, the wax seal in its quality), gift (纪念品, wrapped in
// its colour), pick (图纸三选一: three rolled sheets). o.q = quality 0…6 for the seal / wrapping / the light below
const LW = 48, LH = 44;
function coinStack(S, x, yb, n, ph) { for (let k = 0; k < n; k++) { const y = yb - k * 2, dx = Math.round(Math.sin(k * 1.7 + ph) * 0.6); S.rect(x - 5 + dx, y - 1, 11, 2, 'gold', 5.2); S.hl(x - 5 + dx, y - 1, 11, 'gold', 7.4); S.px(x - 5 + dx, y, 'gold', 3.8); S.px(x + 5 + dx, y, 'gold', 3.4); for (let i = -3; i <= 3; i += 2) S.px(x + i + dx, y, 'gold', 4.4); }
  const y = yb - n * 2, dx = Math.round(Math.sin((n - 1) * 1.7 + ph) * 0.6); S.ell(x + dx, y + 0.5, 5.5, 2, 'gold', 7.6); S.ell(x + dx, y + 0.5, 5.5, 2, 'gold', 9.4, { ring: 1 }); S.px(x + dx - 1, y, 'gold', 5.6); S.px(x + dx, y, 'gold', 5.6); S.px(x + dx + 1, y + 1, 'gold', 5.6); S.px(x + dx - 3, y, 'gold', 11); }
const LOOT = {
  coins(S) { S.lay('mid'); S.beg(); S.ell(24, 39, 21, 4.5, 'gold', 4.8, { dome: 1 }); for (let k = 0; k < 22; k++) { const x = 6 + hh(k, 1, 4) * 36, y = 37 + hh(k, 2, 4) * 4; (k % 5 === 0 ? COIN_E : COIN_F).forEach(([dx, dy, m, t]) => S.px(Math.round(x) + dx, Math.round(y) + dy, m, t)); }
    coinStack(S, 13, 38, 7, 1); coinStack(S, 25, 38, 11, 2); coinStack(S, 36, 38, 5, 3); S.end({ ink: 1 });
    S.beg(); [[4, 30], [44, 28], [30, 14]].forEach(([x, y], i) => (i === 2 ? COIN_E : COIN_F).forEach(([dx, dy, m, t]) => S.px(x + dx, y + dy, m, t + 0.6))); S.end({ ink: 1 }); },
  pouch(S) { S.lay('mid'); S.beg(); S.ell(24, 31, 12, 11, 'leather', 5.4, { dome: 1 }); S.rect(19, 18, 11, 4, 'leather', 5); for (let x = 19; x < 30; x += 2) S.vl(x, 18, 4, 'leather', 3.6); S.hl(18, 21, 13, 'sand', 7); S.px(30, 22, 'sand', 7); S.px(31, 23, 'sand', 6.4); S.px(31, 24, 'sand', 5.6);
    S.ell(24, 32, 5, 5, 'brass', 6.4, { dome: 1 }); S.ell(24, 32, 5, 5, 'brass', 4.4, { ring: 1 }); S.px(23, 31, 'brass', 9.4); S.end({ ink: 1 });
    S.beg(); [[20, 16], [26, 14], [31, 17]].forEach(([x, y], i) => (i === 1 ? COIN_E : COIN_F).forEach(([dx, dy, m, t]) => S.px(x + dx, y + dy, m, t + 0.8))); S.end({ ink: 1 }); },
  sup(S) { S.lay('mid'); S.beg(); S.box(5, 20, 26, 20, 'wood', 6.6, { top: 5, side: 6, tt: 1.4 }); TX.vplanks(S, 6, 21, 24, 18, 'wood', 6.8, { pw: 6, knots: 1 });
    S.rect(5, 20, 26, 2, 'wood', 4.6); S.rect(5, 38, 26, 2, 'wood', 4.2); S.rect(5, 20, 2, 20, 'wood', 4.8); S.rect(29, 20, 2, 20, 'wood', 4.2); S.line(7, 22, 28, 37, 'wood', 4.8, { w: 2 });
    S.ell(18, 31, 4, 4, 'crimson', 7.4, { ring: 1 }); S.px(18, 31, 'crimson', 7.4); S.hl(5, 27, 26, 'sand', 8); S.hl(5, 28, 26, 'sand', 5.6); for (let k = 0; k < 5; k++) S.px(31 + k, 26 - k, 'sand', 5.8); S.end({ ink: 1 });
    S.beg(); S.ell(39, 32, 7.5, 9, 'sand', 6, { dome: 1 }); S.rect(36, 20, 6, 4, 'sand', 5.2); S.hl(35, 23, 8, 'leather', 4); S.rect(37, 30, 4, 4, 'linen', 6.4); S.px(38, 31, 'linen', 4); S.px(40, 33, 'linen', 4); S.end({ ink: 1 }); },
  bp(S) { S.lay('mid'); S.beg(); S.rect(8, 10, 32, 26, 'tile', 5.4); for (let x = 8; x < 40; x += 4) S.vl(x, 10, 26, 'tile', 6.4); for (let y = 10; y < 36; y += 4) S.hl(8, y, 32, 'tile', 6.4);
    const L = (x0, y0, x1, y1) => S.line(x0, y0, x1, y1, 'ice', 10.4); L(14, 31, 34, 31); L(15, 31, 15, 21); L(33, 31, 33, 21); L(13, 22, 24, 14); L(24, 14, 35, 22); L(13, 22, 35, 22); L(22, 31, 22, 25); L(26, 31, 26, 25); L(22, 25, 26, 25); S.rect(17, 24, 3, 3, 'ice', 9); S.rect(29, 24, 3, 3, 'ice', 9);
    S.hcyl(6, 6, 36, 5, 'paper', 8, { rim: 3 }); S.hcyl(6, 35, 36, 5, 'paper', 7.6, { rim: 3 }); S.rect(5, 7, 2, 3, 'wood', 5); S.rect(41, 7, 2, 3, 'wood', 5); S.rect(5, 36, 2, 3, 'wood', 5); S.rect(41, 36, 2, 3, 'wood', 5); S.end({ ink: 1 }); },
  gift(S) { S.lay('mid'); S.beg(); S.box(11, 22, 26, 18, 'linen', 7, { top: 4, tt: 1.2 }); S.end({ ink: 1 }); },
  pick(S) { S.lay('mid'); [[-9, -0.35], [9, 0.35], [0, 0]].forEach(([dx, a]) => { S.beg(); const cx = 24 + dx; for (let k = 0; k < 30; k++) { const y = 10 + k, x = cx + Math.round((k - 15) * Math.sin(a) * 0.6); S.rect(x - 4, y, 9, 1, 'tile', 5.4 + (k % 4 === 0 ? 1 : 0)); S.px(x - 4, y, 'paper', 7.6); S.px(x + 4, y, 'paper', 6); } S.hcyl(cx - 6, 8, 13, 4, 'paper', 8, { rim: 3 }); S.end({ ink: 1 }); }); },
};
// quality-coloured parts (painted per frame): the seal, the wrapping and its ribbon
const LOOT_ANIM = {
  bp(D, t, q) { const m = QR[q][0], T = QR[q][1] - 2; D.beg(); D.ell(34, 33, 4.5, 4.5, m, T, { dome: 1 }); D.ell(34, 33, 4.5, 4.5, m, T - 2, { ring: 1 }); D.px(33, 32, m, T + 2.4); D.px(34, 33, m, T - 1.6); D.rect(31, 37, 2, 5, m, T - 0.6); D.rect(36, 37, 2, 4, m, T - 1); D.end({ ink: 1 }); },
  pick(D, t, q) { LOOT_ANIM.bp(D, t, q); },
  gift(D, t, q) { const m = QR[q][0], T = QR[q][1] - 3; D.beg(); D.box(11, 22, 26, 18, m, T, { top: 4, tt: 1.2 }); D.rect(22, 18, 4, 22, 'gold', 7.4); D.rect(11, 28, 26, 3, 'gold', 7); D.vl(22, 18, 22, 'gold', 9); D.hl(11, 28, 26, 'gold', 9);
    D.ell(19, 15, 4, 3, 'gold', 7.4, { ring: 1 }); D.ell(29, 15, 4, 3, 'gold', 7.4, { ring: 1 }); D.rect(23, 15, 3, 3, 'gold', 8.4); D.px(20, 14, 'gold', 10); D.end({ ink: 1 });
    D.beg(); D.line(36, 26, 40, 32, 'sand', 6); D.rect(38, 32, 5, 6, 'paper', 8.4); D.px(40, 33, 'paper', 5); D.end({ ink: 1 }); },
};
Object.keys(LOOT).forEach(k => X.def('_loot_' + k, { size: [LW, LH], fy: LH, noFloor: 1, clear: 1, noFrame: 1, amb: [0.52, 0.34],
  paint(S, sc) { LOOT[k](S); sc.light({ x: 10, y: 2, z: 40, r: 70, i: 0.55, c: '#fff0d0', tint: 0.15 }); QL.forEach(c => sc.light({ x: 24, y: 52, z: 24, r: 46, i: 0, c, tint: 0.55, bake: false })); },
  anim(D, t, s, o) { s.mul = s.mul || {}; const q = clamp((o.q | 0), 0, 6), g = o.glow == null ? 1 : o.glow; QL.forEach((_, i) => { s.mul[1 + i] = i === q ? g : 0; }); if (LOOT_ANIM[k]) { D.c = D.L.front; LOOT_ANIM[k](D, t, q); } },
  post(out, t, s, o) { const w = o.wt || 0; if (w > 0.02) { const a = Math.round(w * 6) / 6; for (let p = 0; p < out.length; p++) if (out[p] >>> 24) X.addPx(out, p, [255, 255, 255], a); } } }));
PX.LW = LW; PX.LH = LH;

})();
