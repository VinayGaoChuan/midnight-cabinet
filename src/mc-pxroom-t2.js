// ==== mc-pxroom-t2.js ====
(function () {
// Pixel terrain, batch t2: 灵脉 ley · 琥珀层 amber · 金脉 mint · 裂隙 rift · 富矿脉 ore · 风穴 wind · 龙骨 dragon.
// Each kind is one solid block of ground set among the rock cells (no wall, floor or frame): its own geology and colour,
// its own light, a slow loop and one "moment" every 6–12 s. The outer few pixels go back to plain rock so it sits in the
// rock around it. PXR.TILEF[kind] is the thin seam of it that a room dug out of this ground keeps along its floor.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, TX, vnoise, n1 } = X;
const N = W * H, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;
const edgeD = (x, y) => Math.min(x, y, W - 1 - x, H - 1 - y);

// ───────── shared ground bits ─────────
// the same rock as the cells around (kit rockPaint), so the edges meet it
function rockBase(S, v) {
  S.lay('wall'); const r = S.r;
  for (let y = 0; y < H; y++) { const band = Math.round(Math.sin(y * 0.16 + v * 2.1) * 0.8 + (vnoise(v, y * 0.07, v) - 0.5) * 3); for (let x = 0; x < W; x++) S.px(x, y, 'rock', 4 + band); }
  S.noise(0, 0, W, H, 1, 4, v * 7 + 1); S.noise(0, 0, W, H, 1, 1.6, v * 7 + 2);
  for (let i = 0; i < 30; i++) { const cx = r() * W, cy = r() * H, rx = 2.5 + r() * 8, ry = rx * (0.5 + r() * 0.35); S.beg(); S.ell(cx, cy, rx, ry, 'rock', 5 + Math.round(r() * 3), { dome: 1 }); S.end(); }
  for (let i = 0; i < 7; i++) TX.crack(S, Math.floor(r() * W), Math.floor(r() * H), 6 + Math.floor(r() * 14), 'rock', 5, r() < 0.5 ? 'v' : 'h');
  for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H; S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); if (r() < 0.3) S.px(x + 1, y, 'rock', 7); }
}
const KS = ['m', 't', 'nx', 'ny', 'e', 'd', 'o', 'f'];
function snap(S) { const L = S.L.wall, o = {}; KS.forEach(k => { o[k] = L[k].slice(); }); return o; }
function keep(S, sn, p) { const L = S.L.wall; for (let i = 0; i < KS.length; i++) L[KS[i]][p] = sn[KS[i]][p]; }
// rift (11) and ore (13) keep a narrow rim: their ground already darkens into rock away from the tear / the seams.
// The rest go back to rock over a wide rim, with a clump of rock in each corner, so no block reads as a rectangle
const RIM0 = { 11: 3, 13: 3 }, DEP = {};
const rimW = (x, y, s) => (RIM0[s] || 6) + vnoise(x * 0.11 + s, y * 0.11, s) * 3.5;
// how far into the ground a pixel lies, past the rock rim and the corner clumps (< 0: rock)
function depth(s) {
  if (DEP[s]) return DEP[s];
  const d = new Float32Array(N), cr = RIM0[s] ? [] : [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].map(([cx, cy], i) => [cx, cy, 16 + vnoise(i * 1.7 + 0.3, s * 0.37, 5) * 9]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = edgeD(x, y) - rimW(x, y, s);
    for (let i = 0; i < cr.length; i++) { const [cx, cy, R] = cr[i], dx = (x - cx) / 1.35, dy = y - cy, a = Math.atan2(Math.abs(dy), Math.abs(dx)), rr = R * (0.72 + 0.5 * vnoise(a * 3.1 + i * 2.3, s * 0.21, 23)); v = Math.min(v, Math.hypot(dx, dy) - rr); }
    d[y * W + x] = v; }
  return (DEP[s] = d);
}
const dep = (x, y, s) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= W || y >= H ? -9 : depth(s)[y * W + x]; };
// the ground goes back to rock: outright past the rim, in clumps over the next `inner` px
// (wide-rim kinds: the rock bites in in bays and tongues at two scales, and the ground left near it steps down a tone
// or two, so it sinks into the rock instead of stopping at a line)
function soften(S, sn, s, inner) {
  const Dp = depth(s), Y = S.L.wall, wide = !RIM0[s];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x, d = Dp[p];
    if (!wide) { if (d < 0 || (d < inner && vnoise(x / 4, y / 4, s + 3) > d / inner)) keep(S, sn, p); continue; }
    if (d < 0) { keep(S, sn, p); continue; } if (d >= inner) continue;
    const n = clamp((0.55 * vnoise(x / 9, y / 9, s + 4) + 0.45 * vnoise(x / 3.5, y / 3.5, s + 3) - 0.5) * 1.9 + 0.5, 0, 1), q = d / inner;
    if (n > q) { keep(S, sn, p); continue; }
    const g = q - n; if (Y.m[p] && !Y.e[p]) Y.t[p] = Math.max(0, Y.t[p] - (g < 0.14 ? 2 : g < 0.32 ? 1 : 0)); }
}
function rimCut(S, sn, s) {
  const L = S.L.wall, Dp = depth(s); for (let p = 0; p < N; p++) if (Dp[p] < 0) keep(S, sn, p);
  // a one-pixel seam where the ground meets the rock again, then a little occlusion toward the rim
  const rk = new Uint8Array(N); for (let p = 0; p < N; p++) rk[p] = L.m[p] === sn.m[p] && L.t[p] === sn.t[p] && L.o[p] === sn.o[p] ? 1 : 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const p = y * W + x; if (rk[p] || L.e[p]) continue; if (rk[p - 1] || rk[p + 1] || rk[p - W] || rk[p + W]) L.t[p] = Math.max(0, L.t[p] - 1.2); }
  S.ao(0, 0, W, 9, 't', 1); S.ao(0, H - 9, W, 9, 'b', 1); S.ao(0, 0, 10, H, 'l', 1); S.ao(W - 10, 0, 10, H, 'r', 1);
  // whole steps only: a flat pixel resting on a half step would sit in the dither band and checker
  ['wall', 'back', 'mid', 'front'].forEach(k => { const Y = S.L[k]; for (let p = 0; p < N; p++) if (Y.m[p] && !Y.e[p]) Y.t[p] = Math.round(Y.t[p]); }); S.lay('wall');
}
// how far inside the ground a point is (0 at the rock rim, 1 from `k` px in)
const inK = (x, y, s, k) => clamp(dep(x, y, s) / k, 0, 1);
// chamfer distance to the nearest set pixel
function dfield(mask) {
  const d = new Float32Array(N), s2 = 1.414; for (let p = 0; p < N; p++) d[p] = mask[p] ? 0 : 1e4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; let v = d[p]; if (x > 0) v = Math.min(v, d[p - 1] + 1); if (y > 0) { v = Math.min(v, d[p - W] + 1); if (x > 0) v = Math.min(v, d[p - W - 1] + s2); if (x < W - 1) v = Math.min(v, d[p - W + 1] + s2); } d[p] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const p = y * W + x; let v = d[p]; if (x < W - 1) v = Math.min(v, d[p + 1] + 1); if (y < H - 1) { v = Math.min(v, d[p + W] + 1); if (x < W - 1) v = Math.min(v, d[p + W + 1] + s2); if (x > 0) v = Math.min(v, d[p + W - 1] + s2); } d[p] = v; }
  return d;
}
function bres(x0, y0, x1, y1, out) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
  for (;;) { const l = out[out.length - 1]; if (!l || l[0] !== x0 || l[1] !== y0) out.push([x0, y0]); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  return out;
}
// a wandering line through control points: nodes every `seg` px pushed sideways up to `amp`, joined pixel by pixel
function path(r, ctrl, seg, amp) {
  const nodes = [ctrl[0]];
  for (let i = 0; i + 1 < ctrl.length; i++) { const [ax, ay] = ctrl[i], [bx, by] = ctrl[i + 1], len = Math.hypot(bx - ax, by - ay) || 1, n = Math.max(1, Math.round(len / seg)), px = -(by - ay) / len, py = (bx - ax) / len;
    for (let k = 1; k < n; k++) { const u = k / n, o = (r() - 0.5) * 2 * amp; nodes.push([ax + (bx - ax) * u + px * o, ay + (by - ay) * u + py * o]); }
    nodes.push([bx, by]); }
  const out = []; for (let i = 0; i + 1 < nodes.length; i++) bres(nodes[i][0], nodes[i][1], nodes[i + 1][0], nodes[i + 1][1], out); return out;
}
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
// which of the lights a glowing pixel breathes with (e: index + 1)
const nearL = (Ls, x, y) => { let b = 0, bd = 1e9; Ls.forEach((l, i) => { const d = (l[0] - x) ** 2 + (l[1] - y) ** 2; if (d < bd) { bd = d; b = i; } }); return b + 1; };

// ───────── 灵脉 ley: rivers of violet light winding through dark slate; they braid at two rune stones, light flows down them ─────────
// Two broad rivers cross at the node stones and part again (a long lens between them); a thinner one runs in from the lower
// left to the first node and out of the second toward the upper right; rune stones sit in the flow. Packets of light drift
// down the rivers; every 10 s a tide of light runs through the whole net and the runes wake one after another.
const LEY = (() => {
  // the main river: one channel in from the left; at N1 it parts round a long island and meets itself again at N2, where a
  // tributary sweeping up from the lower left crosses it and runs on out to the upper right
  const N1x = 36, N2x = 102, M = (x) => 43 + 4 * Math.sin(x * 0.04 + 0.3) + 1.5 * Math.sin(x * 0.11 + 2), N1 = [N1x, Math.round(M(N1x))], N2 = [N2x, Math.round(M(N2x))];
  const isl = (x) => (x <= N1x || x >= N2x ? 0 : Math.pow(Math.sin(Math.PI * (x - N1x) / (N2x - N1x)), 1.3));
  const T0 = (x) => (x <= N2x ? M(N2x) + (88 - M(N2x)) * Math.sin(Math.PI / 2 * clamp((N2x - x) / (N2x - 6), 0, 1)) : M(N2x) - (M(N2x) - 13) * Math.sin(Math.PI / 2 * clamp((x - N2x) / (W - 4 - N2x), 0, 1)));
  const T = (x) => T0(x) + 3.5 * Math.sin((x - N2x) * 0.11) * clamp(Math.abs(x - N2x) / 18, 0, 1);
  // each river is a smooth function of x (flow runs left to right): w = width, v = drift speed of its packets (px / s);
  // the two arms coincide outside the island
  const RV = [
    { f: (x) => M(x) + isl(x) * (13 + 2 * Math.sin(x * 0.15)), w: 3, a: 0, b: W - 1, v: 10, ph: 0 },
    { f: (x) => M(x) - isl(x) * (12 + 1.5 * Math.sin(x * 0.13 + 1)), w: 3, a: 0, b: W - 1, v: 10, ph: 0 },
    { f: T, w: 2, a: 6, b: W - 1, v: 8, ph: 17 },
  ];
  const R0 = RV[0].f, R1 = RV[1].f;
  // per column: the centre, and the arc length run so far (the packets and the tide travel along it)
  // band pixels: [x, y, river, arc, kind] — kind 0 core, 1 body, 2 the row above, 3 the row below, 4 two rows out (tide only)
  const band = [], own = new Int16Array(N).fill(-1), mask = new Uint8Array(N);
  RV.forEach((R, ri) => { let acc = 0;
    for (let x = R.a; x <= R.b; x++) { const yc = R.f(x), sl = R.f(x + 0.5) - R.f(x - 0.5), E = R.w / 2 * Math.hypot(1, sl); acc += Math.hypot(1, sl);
      const y0 = Math.floor(yc - E + 0.5), y1 = Math.floor(yc + E - 0.5), yk = Math.round(yc);
      for (let y = y0 - 2; y <= y1 + 2; y++) { if (!inside(x, y)) continue; const p = y * W + x, kind = y < y0 ? (y === y0 - 1 ? 2 : 4) : y > y1 ? (y === y1 + 1 ? 3 : 4) : (y === yk || (R.w < 3 && y1 === y0 + 1 && Math.abs(y - yc) < 0.5)) ? 0 : 1;
        if (kind < 2) { if (own[p] >= 0 && band[own[p]][4] <= kind) continue; mask[p] = 1; }
        else if (mask[p] || own[p] >= 0) continue;
        if (own[p] >= 0) { band[own[p]] = [x, y, ri, acc, kind]; continue; }
        own[p] = band.length; band.push([x, y, ri, acc, kind]); } } });
  // the rune stones: [x, y, w, h, glyph]; the two nodes first
  const GLY = [['#.#.#', '.###.', '..#..', '..#..', '..#..'], ['..#..', '.#.#.', '#...#', '.#.#.', '#...#'], ['#..', '##.', '#.#', '##.', '#..'], ['#.#', '###', '#.#', '.#.', '.#.']];
  // the two nodes, the crown of the island's upper arm, and one on the tributary
  let hi = N1x; for (let x = N1x; x <= N2x; x++) if (R1(x) < R1(hi)) hi = x;
  const ST = [[N1x, N1[1], 13, 11, GLY[0]], [N2x, N2[1], 13, 11, GLY[1]], [hi, Math.round(R1(hi)), 9, 9, GLY[2]], [46, Math.round(T(46)), 9, 9, GLY[3]]];
  return { RV, band, mask, ST, dist: dfield(mask), N1, N2 };
})();
// a rune stone set in the flow: a worn pebble of pale slate, lit from the upper left in hard steps, a glyph cut into it
// that glows with light e; returns the glyph's pixels so the moment can light them
function runeStone(S, cx, cy, w, h, gl, e) {
  const rx = w / 2, ry = h / 2, has = (x, y) => { const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), k = 1 + 0.08 * Math.sin(a * 3 + cx) + 0.05 * Math.sin(a * 5 + cy), u = (x + 0.5 - cx) / (rx * k), v = (y + 0.5 - cy) / (ry * k); return u * u + v * v <= 1; };
  S.beg(); for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { if (!has(x, y)) continue;
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, lit = -u * 0.6 - v * 0.8, rim = !has(x, y - 1) || !has(x - 1, y);
    S.px(x, y, 'lav', 5 + (lit > 0.5 ? 2 : lit > 0.05 ? 1 : lit < -0.55 ? -2 : lit < -0.2 ? -1 : 0) + (rim && lit > 0 ? 1 : 0), { n: [u * 0.7, v * 0.7] }); }
  const gw = gl[0].length, gh = gl.length, gx = Math.round(cx - gw / 2), gy = Math.round(cy - gh / 2), G = [];
  gl.forEach((row, j) => { for (let i = 0; i < gw; i++) if (row[i] === '#') { S.px(gx + i, gy + j, 'arcane', 8.2, { e }); G.push([gx + i, gy + j]); } });
  S.end(); return G;
}
X.def('_tile_ley', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const Lv = LEY, Y = S.L.wall;
    Lv.ST.forEach(([x, y], i) => sc.light({ x, y, z: 10, r: i < 2 ? 42 : 30, i: i < 2 ? 0.85 : 0.6, c: '#b86bff', fl: 'pulse', amp: 0.15, sp: 1.3, ph: i * 1.6, tint: 0.18 }));   // 0–3 the rune stones
    sc.light({ x: 74, y: 54, z: 16, r: 80, i: 0.6, c: '#b86bff', fl: 'pulse', amp: 0.06, sp: 0.8, tint: 0.12 });   // 4 the rivers' light, which the tide swells
    rockBase(S, 3); const sn = snap(S);
    // violet slate: thin wavy laminae, clumped tone, mica flecks
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const yy = y + x * 0.12 + Math.sin(x * 0.07 + 1.3) * 2.4, lam = vnoise(0.3, yy * 0.45, 31), cl = vnoise(x / 5, y / 4, 32);
      S.px(x, y, 'magic', 2 + (lam > 0.62 ? 1 : lam < 0.3 ? -1 : 0) + Math.round((cl - 0.5) * 1.6)); }
    for (let i = 0; i < 40; i++) { const x = S.rand() * W, y = S.rand() * H; S.px(x, y, 'lav', 5 + Math.round(S.rand() * 2)); }
    for (let i = 0; i < 12; i++) TX.crack(S, Math.floor(S.rand() * W), Math.floor(S.rand() * H), 5 + Math.floor(S.rand() * 9), 'magic', 3, 'h');
    // the slate is lit from inside near the rivers, in clumps that step down with distance
    for (let p = 0; p < N; p++) { const d = Lv.dist[p], x = p % W, y = (p / W) | 0; if (d > 8 || Lv.mask[p]) continue; const v = vnoise(x / 3, y / 3, 17); if (v < 1.2 - d / 5) Y.t[p] = Math.round(Y.t[p]) + (d < 3 ? 2 : 1); }
    soften(S, sn, 5, 14);
    // the rivers: a white-hot thread, a violet body, a lit bank each side; toward the rock they cool into dark cuts
    Lv.band.forEach(([x, y, r, s, kd]) => { if (kd === 4) return; const k = inK(x, y, 5, 12), e = k > 0.45 ? nearL(Lv.ST, x, y) : 0;
      if (k < 0.2) { if (kd < 2) S.px(x, y, 'magic', 1); return; }
      if (kd > 1) { S.px(x, y, 'magic', kd === 2 ? 6 : 7, { n: [0, kd === 2 ? 0.4 : -0.4] }); return; }
      const t0 = kd === 0 ? (Lv.RV[r].w > 2 ? 9 : 8.6) - (Math.sin(s * 0.23 + r * 1.7) < -0.55 ? 1 : 0) : 7; S.px(x, y, 'arcane', Math.max(4, Math.round(t0 - (1 - k) * 5)), { e }); });
    // the rune stones, set where the rivers meet and in the flow between
    S.lay('back'); Lv.G = Lv.ST.map(([x, y, w, h, gl], i) => runeStone(S, x, y, w, h, gl, i + 1)); S.lay('wall');
    // each stone sits in a socket: a dark ring cut round it, the river's light pooled in it
    Lv.ST.forEach(([cx, cy, w, h]) => { for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2, x = cx + Math.cos(an) * (w / 2 + 1.4), y = cy + Math.sin(an) * (h / 2 + 1.2); if (Lv.mask[Math.round(y) * W + Math.round(x)]) continue; S.px(x, y, Math.sin(an) > 0.3 ? 'arcane' : 'magic', Math.sin(an) > 0.3 ? 4 : 0.6, Math.sin(an) > 0.3 ? { e: 5 } : undefined); } });
    rimCut(S, sn, 5);
    sc.emit({ k: 'soul', x: Lv.N1[0], y: Lv.N1[1] - 6, w: 6, rate: 0.35, sp: 4, ang: 0, spread: 0.5, life: 2.6 });
    sc.emit({ k: 'soul', x: Lv.N2[0], y: Lv.N2[1] - 6, w: 6, rate: 0.35, sp: 4, ang: 0, spread: 0.5, life: 2.6 });
  },
  anim(D, t, rs) {
    const Lv = LEY, st = rs.st; D.lay('wall');
    // the tide: every 10 s a front of light runs the whole net left to right, a little wider than the rivers
    const tp = steps(t, 10) * 10, xf = tp < 3 ? -18 + tp * 62 : -999, P = 54;
    rs.mul[4] = 1 + (tp < 3.4 ? 0.8 * Math.sin(tp / 3.4 * Math.PI) : 0);
    for (let i = 0; i < Lv.band.length; i++) { const [x, y, r, s, kd] = Lv.band[i], f = xf - x;
      if (f >= 0 && f < 20) { if (kd === 4 && f > 5) continue; const k = inK(x, y, 5, 12); if (k < 0.35) continue; const a = 1 - f / 20;
        D.px(x, y, 'arcane', kd === 0 ? 11 : kd === 1 ? 9.6 + a * 1.4 : kd === 4 ? 6.4 : 6 + a * 3.4, { e: 255 }); continue; }
      if (kd > 1) continue;
      // packets of light drift down each river, brightest at the front
      const Rv = Lv.RV[r], u = (((s - Rv.v * t + Rv.ph) % P) + P) % P;
      if (u < 13) { if (inK(x, y, 5, 12) < 0.45) continue; const g = u / 13; D.px(x, y, 'arcane', kd === 0 ? 9.8 + g * 1.4 : 8 + g * 1.8, { e: 255 }); }
      else if (kd === 0 && Math.sin(s * 0.8 - t * 3.1 + r * 2.1) > 0.965 && inK(x, y, 5, 12) > 0.45) D.px(x, y, 'arcane', 11, { e: 255 }); }
    // the runes wake as the tide reaches them: the glyph burns white, a ring of light opens round the stone
    st.lt = st.lt || [];
    Lv.ST.forEach(([x, y, w, h], i) => { if (xf >= x - 3 && !((st.lit || 0) & (1 << i))) { st.lit = (st.lit || 0) | (1 << i); st.lt[i] = t; rs.flash(i, i < 2 ? 1.2 : 0.9); rs.burst('rune', x, y - h / 2 - 1, i < 2 ? 5 : 3, { sp: 12, ang: 0, spread: 1.4, life: 1.4, w: w - 4 }); }
      const a = st.lt[i] != null ? t - st.lt[i] : 9; if (a < 0 || a > 2) return;
      D.lay('back'); Lv.G[i].forEach(([gx, gy]) => D.px(gx, gy, 'arcane', a < 0.3 ? 11 : 11 - (a - 0.3) * 2, { e: 255 }));
      if (a < 0.8) { D.lay('mid'); const rx = w / 2 + 2 + a * 16, ry = h / 2 + 2 + a * 11; for (let k = 0; k < 72; k++) { if (k % 3 === 2) continue; const an = k / 72 * Math.PI * 2, px = x + Math.cos(an) * rx, py = y + Math.sin(an) * ry; if (inK(px, py, 5, 6) > 0.4) D.px(px, py, 'arcane', Math.round(10 - a * 6), { e: 255 }); } }
      D.lay('wall'); });
    if (tp > 3.6) st.lit = 0;
    // a mote now and then lifts off a river
    if (R() < 0.03) { const b = Lv.band[Math.floor(R() * Lv.band.length)]; if (b[4] === 0 && inK(b[0], b[1], 5, 12) > 0.6) rs.burst('rune', b[0], b[1] - 1, 1, { sp: 4, ang: 0, spread: 0.6, life: 1.8 }); }
  },
});

// ───────── 琥珀层 amber: warm sandstone beds round a black lignite seam, studded with amber; the big piece holds a wasp ─────────
// nodules: [cx, cy, rx, ry, light]
const AMB = [[58, 52, 19, 13, 0], [107, 47, 9.5, 7, 1], [24, 48, 7, 5.5, 2], [129, 52, 6, 4.5, 1], [86, 57, 4.5, 3.5, 0], [40, 24, 5, 4, 2], [115, 85, 5.5, 4, 1], [22, 84, 4, 3, 2], [138, 25, 4, 3, 1]];
const AMBPX = AMB.map(([cx, cy, rx, ry], n) => { const o = []; for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
  const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), k = 1 + 0.1 * Math.sin(a * 3 + n * 1.7) + 0.06 * Math.sin(a * 5 + n), u = (x + 0.5 - cx) / (rx * k), v = (y + 0.5 - cy) / (ry * k), d = Math.hypot(u, v); if (d < 1) o.push([x, y, d, u, v]); } return o; });
const STRATA = [[-12, 'mstone', 4.2], [2, 'earth', 2.6], [5, 'sand', 3.6], [15, 'mstone', 2.8], [18, 'earth', 4], [26, 'sand', 4.4], [30, 'hair', 2.2, 1], [52, 'sand', 4.4], [55, 'mstone', 3.6], [66, 'earth', 2.4], [69, 'sand', 3.3], [82, 'mstone', 2.6], [86, 'mstone', 3.8], [104, 'earth', 3], [130]];
const WASP = [
  '.........oooo...oooo..',
  '........oWWWWo.oWWWWo.',
  '.........oWWWWoWWWWo..',
  '..........ooWWWWoo....',
  '.a..........ooo.......',
  '..a.hhh.tttt.bBbBbBb..',
  '...hhhhhttttttBbBbBbBb',
  '....hhh.tttt.bBbBbBb..',
  '.....l..l.l...l.......',
  '....l..l...l...l......',
  '...l..l.....l...l.....',
];
const WASPC = { o: ['lamp', 6], W: ['lamp', 9], a: ['lamp', 1], h: ['lamp', 0], t: ['lamp', 1], b: ['lamp', 1], B: ['lamp', 4], l: ['lamp', 2] };
X.def('_tile_amber', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: 58, y: 52, z: 12, r: 60, i: 1, c: '#ffb03a', fl: 'pulse', amp: 0.08, sp: 1.1, tint: 0.22 });
    sc.light({ x: 107, y: 47, z: 10, r: 40, i: 0.62, c: '#ffb03a', fl: 'pulse', amp: 0.12, sp: 1.3, ph: 2, tint: 0.2 });
    sc.light({ x: 30, y: 48, z: 10, r: 36, i: 0.5, c: '#ffb03a', fl: 'pulse', amp: 0.12, sp: 1.2, ph: 4, tint: 0.2 });
    rockBase(S, 5); const sn = snap(S), r = S.r;
    // the beds: each its own stone and tone, a lit top line, a dark parting under it
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const yy = y - x * 0.05 + Math.sin(x * 0.045 + 0.8) * 3.2 + (vnoise(x * 0.1, 3, 9) - 0.5) * 2; let b = 0; while (b + 1 < STRATA.length - 1 && yy >= STRATA[b + 1][0]) b++;
      const [y0, m, t0, lig] = STRATA[b], o = yy - y0, th = STRATA[b + 1][0] - y0, cl = Math.round((vnoise(x / 5, y / 3.5, 41 + b) - 0.5) * 1.8);
      S.px(x, y, m, t0 + cl + (o < 1 ? 0.9 : o > th - 1 ? -1 : 0) + (lig && vnoise(x / 9, y * 0.8, 44) > 0.7 ? 0.8 : 0)); }
    for (let i = 0; i < 26; i++) { const x = r() * W, y = 34 + r() * 22, l = 3 + r() * 9; S.hl(x, y, l, 'wood', 2.6); S.hl(x + 1, y - 1, l - 2, 'wood', 3.4); }   // coalified wood in the seam
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; if (S.at(x, y) === X.MI.sand) { S.px(x, y, 'sand', 6.5); S.px(x + 1, y + 1, 'sand', 2); } }                     // grains
    soften(S, sn, 7, 14);
    // amber: a dark resin skin, light entering top-left and pooling bottom-right, a hard white glint, a few bubbles;
    // the big piece breathes with its light (whole steps, so the pulse never rests on a half step), the rest just glow
    AMBPX.forEach((px, n) => { const e = n ? 255 : 1; S.beg(); px.forEach(([x, y, d, u, v]) => { const th = u * 0.55 + v * 0.8; let tn = d > 0.84 ? 3 : d > 0.62 && th > 0.3 ? 7 : 5 + Math.round(th * 1.4); S.px(x, y, 'lamp', tn + (n ? 0 : 0.15), { e }); }); S.end();
      const [cx, cy, rx, ry] = AMB[n]; S.px(cx - rx * 0.45, cy - ry * 0.52, 'lamp', 11, { e: 255 }); if (rx > 5) { S.px(cx - rx * 0.45 + 1, cy - ry * 0.52, 'lamp', 9.4, { e: 255 }); S.px(cx - rx * 0.45, cy - ry * 0.52 + 1, 'lamp', 9.4, { e: 255 }); }
      if (rx > 8) for (let k = 0; k < 4; k++) S.px(cx + (r() - 0.3) * rx, cy + (r() - 0.2) * ry * 0.8, 'lamp', 8.15, { e: n ? 255 : 1 }); });
    S.spr(47, 46, WASP, Object.fromEntries(Object.entries(WASPC).map(([k, [m, t]]) => [k, [m, t + 0.15, { e: 1 }]])));
    rimCut(S, sn, 7);
    sc.emit({ k: 'dust', x: 75, y: 55, w: 120, h: 70, rate: 1.1, sp: 3, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st; D.lay('wall');
    // a glint slides over the big piece
    const g = steps(t, 4.6) * 4.6; if (g < 1.1) { const s = -24 + g / 1.1 * 48; AMBPX[0].forEach(([x, y, d]) => { if (d > 0.82) return; const w = (x - 58) + (y - 52) * 0.8 - s; if (w > -1.5 && w < 1.5) D.px(x, y, 'lamp', Math.abs(w) < 0.6 ? 10.4 : 8.6, { e: 255 }); }); }
    // bubbles creep up through it
    for (let i = 0; i < 3; i++) { const x = 53 + i * 6, y = Math.round(62 - ((t * 1.1 + i * 4.3) % 20)), a = AMBPX[0].find(q => q[0] === x && q[1] === y); if (a && a[2] < 0.78) { D.px(x, y, 'lamp', 9.6, { e: 255 }); D.px(x, y + 1, 'lamp', 6.6, { e: 255 }); } }
    // a tear of resin swells under the second piece, lets go, falls
    const dp = steps(t + 1.3, 7.3) * 7.3, dx = 108;
    if (dp < 3.4) { const L = Math.floor(dp / 3.4 * 5); for (let k = 0; k <= L; k++) D.px(dx, 54 + k, 'lamp', k === L ? 8.4 : 6.4, { e: 255 }); if (L > 1) { D.px(dx - 1, 54 + L, 'lamp', 6.2, { e: 255 }); D.px(dx, 55 + L, 'lamp', 5.4, { e: 255 }); } st.dr = 0; }
    else if (dp < 4.1) { const f = (dp - 3.4) / 0.7, y = 59 + f * f * 22; D.px(dx, y, 'lamp', 9, { e: 255 }); D.px(dx, y - 1, 'lamp', 7, { e: 255 }); D.px(dx, 54, 'lamp', 6.4, { e: 255 }); D.px(dx, 55, 'lamp', 6, { e: 255 }); }
    else if (!st.dr) { st.dr = 1; rs.burst('glint', dx, 81, 2, { sp: 10, life: 0.5 }); rs.burst('dust', dx, 80, 4, { sp: 8, life: 1.4 }); }
    // every 10 s the amber wakes: the big piece flares, the wasp's wings catch the light, motes lift
    const wp = steps(t, 10) * 10;
    if (wp < 1.2) { const k = wp < 0.25 ? 11 : 11 - (wp - 0.25) * 2.4; WASP.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'W') D.px(47 + i, 46 + j, 'lamp', k, { e: 255 }); }); }
    if (wp < 0.1 && !st.w) { st.w = 1; rs.flash(0, 1.3); rs.burst('glint', 58, 52, 7, { sp: 26, life: 0.7, w: 20, h: 12 }); rs.burst('dust', 58, 60, 10, { sp: 10, ang: 0, spread: 1.4, life: 2.6, w: 30 }); } if (wp > 2) st.w = 0;
    if (R() < 0.02) { const n = 1 + Math.floor(R() * (AMB.length - 1)), [cx, cy, rx, ry] = AMB[n]; rs.burst('glint', cx - rx * 0.45, cy - ry * 0.52, 1, { sp: 0, life: 0.6 }); }
  },
});

// ───────── 金脉 mint: a white quartz reef slanting through blue-grey greenstone, threaded and studded with gold ─────────
const REEF = { dx: 0.934, dy: -0.357 };
const reefAt = (x, y) => { const al = (x + 6) * REEF.dx + (y - 84) * REEF.dy, ac = (x + 6) * -REEF.dy + (y - 84) * REEF.dx - 3 * Math.sin(al * 0.045 + 1) - (vnoise(al * 0.08, 1, 61) - 0.5) * 4, hw = 8 + 3 * Math.sin(al * 0.05 + 2) + (vnoise(al * 0.2, ac > 0 ? 3 : 5, 62) - 0.5) * 3; return { al, ac, hw }; };
const MINT = (() => { const r = X.rng(9091), nug = [[78, 51, 6.5, 5], [47, 64, 3.8, 3], [104, 40, 3.8, 2.8], [69, 56, 3, 2.4], [87, 46, 3, 2.4], [121, 34, 2.6, 2.2], [31, 70, 2.4, 2], [58, 58, 2, 1.6], [136, 30, 2, 1.6]];
  const str = [[[-4, 80], [30, 68], [60, 58], [96, 46], [154, 24]], [[-4, 88], [40, 72], [80, 58], [120, 44], [154, 32]], [[60, 57], [66, 40], [72, 27]], [[104, 42], [110, 60], [117, 76]], [[31, 70], [20, 52], [10, 44]]].map(c => path(r, c, 5, 2).filter(([x, y]) => inside(x, y)));
  return { nug, str, gold: [] }; })();
X.def('_tile_mint', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: 79, y: 50, z: 14, r: 70, i: 0.85, c: '#ffd650', fl: 'pulse', amp: 0.06, sp: 0.9, tint: 0.12 });
    sc.light({ x: 34, y: 70, z: 10, r: 42, i: 0.55, c: '#ffd650', fl: 'pulse', amp: 0.1, sp: 1.2, ph: 2, tint: 0.18 });
    sc.light({ x: 124, y: 32, z: 10, r: 42, i: 0.55, c: '#ffd650', fl: 'pulse', amp: 0.1, sp: 1.2, ph: 4, tint: 0.18 });
    rockBase(S, 6); const sn = snap(S), r = S.r, Y = S.L.wall; MINT.gold.length = 0;
    // greenstone: blue-grey, foliated along the reef
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const { ac } = reefAt(x, y), f = vnoise(ac * 0.35, 0.5, 63), cl = Math.round((vnoise(x / 4.5, y / 4.5, 64) - 0.5) * 1.8); S.px(x, y, 'stone', 3 + cl + (f > 0.66 ? 0.8 : f < 0.3 ? -0.6 : 0)); }
    // the reef: milky quartz in blocks, cracked; a rusty halo where it meets the rock
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const { al, ac, hw } = reefAt(x, y), a = Math.abs(ac);
      if (a < hw) { const blk = vnoise(x / 3.5, y / 3.5, 65), tn = 4.6 + Math.round((blk - 0.5) * 2.4) + (ac < -hw + 1.2 ? 1.6 : ac > hw - 1.2 ? -1.4 : 0); S.px(x, y, 'linen', tn); }
      else if (a < hw + 2.5 && vnoise(x / 2.5, y / 2.5, 66) > 0.35) S.px(x, y, 'sand', 3 + (a < hw + 1 ? 0.6 : 0)); }
    for (let i = 0; i < 26; i++) { let x = r() * W, y = r() * H; const { ac, hw } = reefAt(x, y); if (Math.abs(ac) > hw - 1) continue; const a = r() * Math.PI; for (let k = 0; k < 3 + r() * 5; k++) { if (Math.abs(reefAt(x, y).ac) > reefAt(x, y).hw - 1) break; S.px(x, y, 'linen', 2.6); S.px(x + 1, y, 'linen', 6.2); x += Math.cos(a); y += Math.sin(a); } }
    soften(S, sn, 9, 14);
    // gold: wandering threads, flecks, nuggets
    const G = (x, y, tn, o) => { S.px(x, y, 'gold', tn, o); MINT.gold.push([x, y, S.c.k]); };
    MINT.str.forEach((ps, i) => ps.forEach(([x, y], j) => { if (inK(x, y, 9, 8) < 0.3) return; const { ac, hw } = reefAt(x, y), inR = Math.abs(ac) < hw; if (!inR && i < 2) return; const v = vnoise(j * 0.2, i, 67); if (v < 0.3) return; G(x, y, v > 0.62 ? 8 : 6.4, { n: [-0.3, -0.5] }); if (v > 0.7) G(x, y + 1, 5, { n: [0.2, 0.5] }); }));
    for (let i = 0; i < 60; i++) { const x = Math.round(r() * W), y = Math.round(r() * H), { ac, hw } = reefAt(x, y); if (Math.abs(ac) < hw - 1 && inK(x, y, 9, 8) > 0.4) G(x, y, 7 + r() * 2, { n: [-0.4, -0.4] }); }
    S.lay('back'); MINT.nug.forEach(([cx, cy, rx, ry], n) => { S.beg(); for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), k = 1 + 0.16 * Math.sin(a * 3 + n * 2.3) + 0.1 * Math.sin(a * 5 + n), u = (x + 0.5 - cx) / (rx * k), v = (y + 0.5 - cy) / (ry * k), d = u * u + v * v; if (d > 1) continue;
        const lit = -u * 0.6 - v * 0.8, lump = vnoise(x / 1.6, y / 1.6, 68 + n) > 0.62; G(x, y, 5 + Math.round(lit * 2) + (lump ? 1 : 0), { n: [u * 0.7, v * 0.7] }); } S.end();
      S.px(cx - rx * 0.4, cy - ry * 0.45, 'gold', 11, { e: 255 }); if (rx > 3) { S.px(cx - rx * 0.4 + 1, cy - ry * 0.45, 'gold', 9, { e: 255 }); S.px(cx + rx * 0.2, cy - ry * 0.1, 'gold', 9, { e: 255 }); } }); S.lay('wall');
    rimCut(S, sn, 9);
  },
  anim(D, t, rs) {
    const st = rs.st, Gd = MINT.gold; D.lay('wall');
    // a sheen runs up the reef every 5 s
    const sh = steps(t, 5) * 5; if (sh < 1.6) { const s = -10 + sh / 1.6 * 185; Gd.forEach(([x, y, k]) => { const al = (x + 6) * REEF.dx + (y - 84) * REEF.dy, w = Math.abs(al - s); if (w < 2.5) D.lay(k).px(x, y, 'gold', w < 1 ? 11 : 9.6, { e: 255 }); }); }
    // specks of gold dust drift down from the nuggets, twinkling
    D.lay('mid');
    MINT.nug.slice(0, 5).forEach(([cx, cy, rx, ry], i) => { const q = steps(t + i * 1.7, 3.8), y = cy + ry + q * 16, x = cx + Math.sin(q * 6 + i) * 1.5; if (q < 0.9) D.px(x, y, 'gold', (Math.floor(t * 8 + i) & 1) ? 10.6 : 8, { e: 255 }); });
    if (R() < 0.05 && Gd.length) { const [x, y] = Gd[Math.floor(R() * Gd.length)]; if (inK(x, y, 9, 8) > 0.5) rs.burst('glint', x, y, 1, { sp: 0, life: 0.55 }); }
    // every 8 s the big nugget gleams: a four-point star, a shower of glints
    const gp = steps(t, 8) * 8;
    if (gp < 0.7) { const a = Math.sin(gp / 0.7 * Math.PI), L = Math.round(a * 7), cx = 75, cy = 49; for (let k = 1; k <= L; k++) { const tn = 11 - k * 0.7; D.px(cx + k, cy, 'gold', tn, { e: 255 }); D.px(cx - k, cy, 'gold', tn, { e: 255 }); if (k <= L - 2) { D.px(cx, cy + k, 'gold', tn, { e: 255 }); D.px(cx, cy - k, 'gold', tn, { e: 255 }); } } D.px(cx, cy, 'gold', 11, { e: 255 }); if (L > 3) { D.px(cx + 1, cy + 1, 'gold', 9, { e: 255 }); D.px(cx - 1, cy - 1, 'gold', 9, { e: 255 }); D.px(cx + 1, cy - 1, 'gold', 9, { e: 255 }); D.px(cx - 1, cy + 1, 'gold', 9, { e: 255 }); } }
    if (gp < 0.1 && !st.g) { st.g = 1; rs.flash(0, 1.1); rs.burst('glint', 77, 50, 8, { sp: 28, life: 0.8 }); } if (gp > 1) st.g = 0;
  },
});

// ───────── 裂隙 rift: a tear across fractured black rock, green light boiling up out of it, chips of rock afloat ─────────
const RIFT = (() => { const r = X.rng(3131), ctr = path(r, [[-4, 60], [30, 55], [62, 52], [92, 47], [122, 43], [154, 38]], 8, 2.5), cy = new Float32Array(W), n = new Float32Array(W);
  ctr.forEach(([x, y]) => { if (x >= 0 && x < W) { cy[x] += y; n[x]++; } }); for (let x = 0; x < W; x++) cy[x] = n[x] ? cy[x] / n[x] : cy[Math.max(0, x - 1)];
  const top = new Int16Array(W), bot = new Int16Array(W), hw = new Float32Array(W); let zt = 0, zb = 0, nx = 0;
  for (let x = 0; x < W; x++) { const k = clamp((x - 4) / 142, 0, 1); hw[x] = 0.5 + 9.5 * Math.pow(Math.sin(Math.PI * k), 0.8) * (0.72 + 0.5 * vnoise(x * 0.06, 1, 71)); if (x >= nx) { zt = r() - 0.5; zb = r() - 0.5; nx = x + 2 + Math.floor(r() * 3); }
    top[x] = Math.round(cy[x] - hw[x] * (1 + zt * 0.5)); bot[x] = Math.round(cy[x] + hw[x] * (0.85 + zb * 0.5)); if (bot[x] <= top[x]) bot[x] = top[x] + 1; }
  const frac = []; for (let i = 0; i < 12; i++) { const x = 14 + i * 11 + Math.floor(r() * 6), up = i % 2 === 0, y0 = up ? top[x] - 1 : bot[x] + 1, len = 5 + r() * 11; frac.push(path(r, [[x, y0], [x + (r() - 0.5) * 12, y0 + (up ? -len : len)]], 3, 1.4)); }
  // chips of rock afloat in the green light, their near edge 3–5 px off a lip: [x, lip to centre (− above the tear, + below), w, h]
  const shards = [[33, -8, 16, 9], [70, -8, 18, 10], [104, -8, 13, 8], [133, -6, 8, 6], [50, 8, 15, 9], [88, 6, 9, 6], [119, 8, 15, 9]].map(([x, g, w, h], i) => {
    const SH = [[[-1, -0.2], [-0.35, -1], [0.55, -0.8], [1, 0.15], [0.3, 1], [-0.65, 0.75]], [[-1, 0.35], [-0.15, -1], [1, -0.45], [0.6, 0.7], [-0.3, 1]], [[-1, -0.55], [0.2, -1], [1, 0.05], [0.1, 1], [-0.75, 0.55]], [[-1, 0.1], [-0.3, -0.95], [0.65, -0.7], [1, 0.3], [0.15, 0.95]]][i % 4];
    const pts = SH.map(([a, b]) => [a * w / 2 * (0.92 + 0.16 * r()), b * h / 2 * (0.92 + 0.16 * r())]);
    const px = []; for (let yy = -h; yy <= h; yy++) for (let xx = -w; xx <= w; xx++) if (inPoly(pts, xx + 0.5, yy + 0.5)) px.push([xx, yy]);
    const set = new Set(px.map(([a, b]) => a + ',' + b)), has = (a, b) => set.has(a + ',' + b), below = g > 0, y = below ? bot[x] + g : top[x] + g;
    // per pixel: how far in from the face toward the tear (0 = on it) and from the top face (0 = on it)
    const tearD = (a, b) => { let k = 0; while (k < 3 && has(a, below ? b - k - 1 : b + k + 1)) k++; return k; }, topD = (a, b) => { let k = 0; while (k < 3 && has(a, b - k - 1)) k++; return k; };
    // a hard black rim all round (not lit, so the green light does not tint it into a halo): the dark gap that parts it from the rock
    const ol = []; for (let yy = -h - 1; yy <= h + 1; yy++) for (let xx = -w - 1; xx <= w + 1; xx++) if (!has(xx, yy) && (has(xx + 1, yy) || has(xx - 1, yy) || has(xx, yy + 1) || has(xx, yy - 1))) ol.push([xx, yy, has(xx, yy + 1) || has(xx + 1, yy) ? 1 : 0]);
    return { x, y, below, ol, px: px.map(([a, b]) => [a, b, tearD(a, b), topD(a, b), !has(a - 1, b)]), ph: r() * 6, sp: 0.8 + r() * 0.7 }; });
  const specks = []; for (let i = 0; i < 18; i++) specks.push([r() * W, r() * 2 - 1, r()]);
  const gap = new Uint8Array(N); for (let x = 0; x < W; x++) if (hw[x] > 0.8) for (let y = top[x]; y <= bot[x]; y++) if (y >= 0 && y < H) gap[y * W + x] = 1;
  return { top, bot, hw, cy, frac, shards, specks, dist: dfield(gap), L: [[22, 57], [58, 53], [92, 47], [126, 42]] }; })();
X.def('_tile_rift', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const Rf = RIFT; Rf.L.forEach(([x, y], i) => sc.light({ x, y, z: 10, r: 50, i: 0.9, c: '#9cff7a', fl: 'pulse', amp: 0.2, sp: 2.3, ph: i * 1.7, tint: 0.28 }));
    rockBase(S, 8); const sn = snap(S), r = S.r;
    // black rock in angular fractures; round the tear it glows green in bands that step down with distance
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const cl = Math.round((vnoise(x / 5, y / 5, 73) - 0.5) * 1.8), d = Rf.dist[y * W + x] + (vnoise(x / 3, y / 3, 74) - 0.5) * 2.4;
      if (d < 15) S.px(x, y, 'moss', d < 1.6 ? 7 : d < 3 ? 6 : d < 5 ? 5 : d < 8 ? 4 : d < 11 ? 3 + (cl > 0 ? 1 : 0) : 2 + (cl > 0 ? 1 : 0)); else S.px(x, y, 'rock', 3 + cl); }
    for (let i = 0; i < 26; i++) { const x0 = r() * W, y0 = r() * H, a = (r() < 0.5 ? 0.5 : 2.6) + (r() - 0.5) * 0.7, l = 5 + r() * 12; for (let k = 0; k < l; k++) { const x = x0 + Math.cos(a) * k, y = y0 + Math.sin(a) * k; if (y > Rf.top[clamp(Math.round(x), 0, W - 1)] - 3 && y < Rf.bot[clamp(Math.round(x), 0, W - 1)] + 3) break; const m = S.at(x, y) === X.MI.moss ? 'moss' : 'rock'; S.px(x, y, m, 1); S.px(x, y + 1, m, 5); } }
    soften(S, sn, 11, 8);
    // fractures off the lips glow in their first half
    Rf.frac.forEach(ps => ps.forEach(([x, y], j) => { if (!inside(x, y) || inK(x, y, 11, 6) < 0.3) return; if (j < ps.length * 0.55) S.px(x, y, 'screen', Math.max(3, 8 - j * 0.6), { e: nearL(Rf.L, x, y) }); else S.px(x, y, 'moss', 1); }));
    // the tear: glowing lips, lit rock round them, a void with a green haze and specks of somewhere else
    for (let x = 0; x < W; x++) { const t0 = Rf.top[x], b0 = Rf.bot[x], k = inK(x, (t0 + b0) >> 1, 11, 8), e = nearL(Rf.L, x, t0), wd = b0 - t0;
      if (k < 0.2) { for (let y = t0; y <= b0; y++) S.px(x, y, 'ink', 1); continue; }
      // inside: black, a wisp of green haze in torn clumps along a wandering middle, a few less-black patches deep in it
      const mc = 0.5 + 0.15 * Math.sin(x * 0.13);
      for (let y = t0; y <= b0; y++) { const m = (y - t0) / Math.max(1, wd), c = Math.abs(m - mc);
        if (y === t0) S.px(x, y, 'screen', Math.round(4 + 6 * k), { e }); else if (y === b0) S.px(x, y, 'screen', Math.round(4 + 6.4 * k), { e });
        else if (y === b0 - 1 && wd > 3) S.px(x, y, 'screen', 5, { e });
        else { const mist = wd > 6 && c < 0.22 && vnoise(x / 4, y / 2, 75) > 0.55, deep = wd > 7 && c < 0.16 ? vnoise(x / 3, y / 2, 76) : 0;
          S.px(x, y, mist ? 'screen' : 'ink', mist ? (wd > 12 && c < 0.1 ? 4 : 3) : deep > 0.72 ? 2 : deep > 0.5 ? 1 : 0, { e: 255 }); } } }
    rimCut(S, sn, 11);
    // what the wall looks like at rest, so a chip's shadow can darken it
    const Y = S.L.wall; Rf.wall = { m: Y.m.slice(), t: Y.t.slice(), nx: Y.nx.slice(), ny: Y.ny.slice(), e: Y.e.slice() };
  },
  anim(D, t, rs) {
    const Rf = RIFT, st = rs.st; D.lay('wall');
    // light crawls along the lips; green licks flicker up off the upper lip
    for (let x = 8; x < W - 8; x++) { const a = Math.sin(x * 0.33 - t * 4.2) + n1(x * 0.12 + t * 0.8) * 0.8; if (a > 1.2) { D.px(x, Rf.top[x], 'screen', 11, { e: 255 }); if (a > 1.55) D.px(x, Rf.bot[x], 'screen', 11, { e: 255 }); }
      if (Rf.hw[x] > 3 && inK(x, Rf.top[x], 11, 8) > 0.5) { const h = 2.4 * n1(x * 0.21 + t * 1.7) + 1.6 * Math.sin(x * 0.55 - t * 4.4); for (let k = 1; k <= Math.round(h); k++) D.px(x, Rf.top[x] - k, 'screen', 10 - k * 1.4, { e: 255 }); } }
    // specks of the other side drift past in the void
    Rf.specks.forEach(([x0, v, b], i) => { const x = Math.round(((x0 + t * (2 + b * 3)) % 128 + 128) % 128) + 11, y = Math.round(Rf.cy[x] + v * (Rf.bot[x] - Rf.top[x]) * 0.3); if (y > Rf.top[x] + 1 && y < Rf.bot[x] - 1) D.px(x, y, b > 0.6 ? 'linen' : 'screen', b > 0.6 ? (Math.sin(t * 5 + i) > 0.5 ? 11 : 9) : 8, { e: 255 }); });
    // motes of green boil up out of it
    for (let i = 0; i < 12; i++) { const q = steps(t * 0.32 + i * 0.37, 1), x0 = 14 + ((i * 53) % 122), x = Math.round(x0 + Math.sin(q * 5 + i) * 2), y = Math.round(Rf.top[x0] - 2 - q * 24); if (q < 0.85 && inK(x, y, 11, 6) > 0.4) D.px(x, y, 'screen', 10.6 - q * 5, { e: 255 }); }
    // the discharge: every 7 s a bolt jumps the gap and forks into the rock; the chips jolt
    const dp = steps(t, 7) * 7, cyc = Math.floor(t / 7), bx = 36 + ((cyc * 37) % 76);
    if (dp < 0.42 && ((dp * 30) | 0) % 4 !== 3) { const rr = X.rng(cyc * 7 + 1); let x = bx, y = Rf.top[bx] - 7; while (y < Rf.bot[bx] + 8) { D.px(x, y, 'linen', 11, { e: 255 }); D.px(x + 1, y, 'screen', 9, { e: 255 }); D.px(x - 1, y, 'screen', 7, { e: 255 }); y++; if (rr() < 0.5) x += rr() < 0.5 ? -1 : 1; }
      for (let b = 0; b < 3; b++) { let fx = bx, fy = b === 1 ? Rf.bot[bx] + 3 : Rf.top[bx] - 3 - b * 2; const dx = b === 2 ? 1 : -1; for (let k = 0; k < 9; k++) { fx += b === 1 ? 1 : dx; fy += (b === 1 ? 1 : -1) * (rr() < 0.55 ? 1 : 0); D.px(fx, fy, 'screen', 10.6 - k * 0.6, { e: 255 }); } } }
    // the light jumps where the bolt is: the nearest lamp of the tear flares, the one beside it a little
    if (dp < 0.05 && !st.z) { st.z = 1; const near = Rf.L.map(([lx], i) => [Math.abs(lx - bx), i]).sort((a, b) => a[0] - b[0]); rs.flash(near[0][1], 1); rs.flash(near[1][1], 0.35); } if (dp > 1) st.z = 0;
    // green sparks spit out along the tear from where the bolt struck, each alive for 0.4 s
    if (dp < 0.62) { const rr = X.rng(cyc * 13 + 5); D.lay('mid');
      for (let i = 0; i < 6; i++) { const b0 = (i >> 1) * 0.05, age = dp - b0, dir = i & 1 ? 1 : -1, up = i < 4, v = 22 + rr() * 34, vy = (up ? -1 : 1) * (30 + rr() * 30), sy = up ? Rf.top[bx] : Rf.bot[bx]; if (age < 0 || age > 0.4) continue;
        const u = age / 0.4, x = bx + dir * v * age, y = sy + vy * age + 70 * age * age, tn = Math.round(11 - u * 4), gy = vy + 140 * age, gl = Math.hypot(v, gy) || 1, ux = dir * v / gl, uy = gy / gl;
        for (let k = 0; k < 4 - Math.floor(u * 2); k++) D.px(x - ux * k, y - uy * k, 'screen', tn - k * 1.4, { e: 255 }); } }
    const jolt = dp < 1.4 ? Math.round(-2.6 * Math.exp(-dp * 2.6) * Math.cos(dp * 8)) : 0;
    // the chips: black rock afloat in the green, a pale top face, a 2 px rim burning green on the side that faces the tear,
    // a sliver of dark under each, and their shadow on the rock behind (it stays put while the chip bobs, so they float)
    const Wl = Rf.wall; D.lay('wall'); Rf.shards.forEach(s => { const sd = s.below ? 4 : -4; s.px.forEach(([xx, yy]) => { const x = s.x + xx + 2, y = s.y + yy + sd, p = y * W + x; if (!inside(x, y) || !Wl.m[p] || Wl.e[p]) return; D.px(x, y, Wl.m[p], Math.max(0, Wl.t[p] - 2), { n: [Wl.nx[p] / 127, Wl.ny[p] / 127] }); }); });
    D.lay('mid'); Rf.shards.forEach(s => { const oy = Math.round(Math.sin(t * s.sp + s.ph) * 2.5) + (s.below ? -jolt : jolt); s.ol.forEach(([xx, yy, lt]) => D.px(s.x + xx, s.y + yy + oy, 'ink', lt, { e: 255 }));
      s.px.forEach(([xx, yy, td, tp, lf]) => { const x = s.x + xx, y = s.y + yy + oy; if (td < 2) D.px(x, y, 'screen', td ? 6 : 8, { e: 255 });
        else if (tp < 1 + (s.below ? 0 : 1)) D.px(x, y, 'rock', tp ? 8 : 9, { n: [-0.2, -0.8] }); else D.px(x, y, 'rock', lf ? 6 : 4 - (yy > 1 ? 1 : 0), { n: lf ? [-0.7, -0.2] : [0.2, 0.3] }); }); });
  },
});

// ───────── 富矿脉 ore: a band of faceted copper nuggets in rust-dark rock, hot seams glowing between them ─────────
const ORE = (() => { const r = X.rng(5151), nug = [], bandY = (x) => 54 + Math.sin(x * 0.045 + 0.6) * 7 - x * 0.03;
  const add = (cx, cy, rr) => { if (nug.some(n => Math.hypot(n.cx - cx, (n.cy - cy) * 1.3) < (n.r + rr) * 0.92 + 0.5)) return; const q = r(), m = q < 0.9 || rr > 3.5 ? 'copper' : 'iron', k = 5 + Math.floor(r() * 3), vs = [];
    for (let i = 0; i < k; i++) vs.push([i / k * Math.PI * 2 + (r() - 0.5) * 0.7, 0.75 + r() * 0.4]); nug.push({ cx, cy, r: rr, ry: rr * (0.72 + r() * 0.2), m, t: m === 'iron' ? 5 : 6 + (r() < 0.3 ? 1 : 0), vs, rot: r() * 6 }); };
  add(74, 51, 8.5); add(47, 56, 6.5); add(105, 48, 7); add(28, 58, 5); add(126, 45, 5.5);
  for (let i = 0; i < 1200 && nug.length < 44; i++) { const x = 10 + r() * 130, rr = 2.2 + r() * r() * 6, off = (r() - 0.5) * 2 * (3 + 8 * r()) * (1.1 - Math.abs(x - 75) / 150); add(x, bandY(x) + off, rr); }
  for (let i = 0; i < 80 && nug.length < 50; i++) add(12 + r() * 126, 12 + r() * 82, 1.6 + r() * 1.4);
  const seams = [path(r, [[4, 57], [20, 60], [46, 57], [60, 54], [74, 52], [90, 50], [104, 49], [124, 45], [146, 42]], 5, 1.6), path(r, [[46, 57], [52, 66], [66, 70], [82, 66]], 4, 1.5), path(r, [[74, 52], [80, 40], [92, 34]], 4, 1.2)];
  const hot = new Uint8Array(N); seams.forEach(ps => ps.forEach(([x, y]) => { if (inside(x, y)) hot[y * W + x] = 1; }));
  const crack = path(r, [[68, 44], [72, 50], [75, 55], [79, 61]], 3, 1);
  return { nug, seams, dist: dfield(hot), crack, L: [[74, 52], [28, 52], [52, 52], [76, 50], [100, 48], [124, 45]] }; })();
X.def('_tile_ore', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const O = ORE; sc.light({ x: 74, y: 56, z: 18, r: 62, i: 0.6, c: '#ff8a30', fl: 'fire', tint: 0.2 });
    O.L.slice(1).forEach(([x, y]) => sc.light({ x, y, z: 16, r: 36, i: 1.15, c: '#fff0d8', tint: 0.1, bake: false }));   // 1–5: the gleam that sweeps across
    rockBase(S, 10); const sn = snap(S);
    // rock warmed and rusted toward the seams, in steps
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = O.dist[y * W + x] + (vnoise(x / 4, y / 4, 83) - 0.5) * 3, cl = Math.round((vnoise(x / 5, y / 4, 84) - 0.5) * 1.6);
      if (d < 2.5) S.px(x, y, 'brick', 5); else if (d < 5.5) S.px(x, y, 'brick', 4); else if (d < 10) S.px(x, y, 'brick', 3); else if (d < 16) S.px(x, y, 'brick', 2 + (cl > 0 ? 1 : 0)); else if (d < 22 && cl >= 0) S.px(x, y, 'mstone', 3); else S.px(x, y, 'rock', 3 + cl); }
    soften(S, sn, 13, 9);
    // the seams glow
    O.seams.forEach((ps, i) => ps.forEach(([x, y], j) => { if (!inside(x, y) || inK(x, y, 13, 6) < 0.3) return; S.px(x, y, 'fire', (j * 7) % 5 === 0 ? 9 : 7, { e: 1 }); if (i === 0 && inside(x, y - 1) && S.at(x, y - 1) !== X.MI.fire) S.px(x, y - 1, 'fire', 5, { e: 1 }); if (inside(x, y + 1) && S.at(x, y + 1) !== X.MI.fire) S.px(x, y + 1, 'fire', 3, { e: 1 }); }));
    // the nuggets: faceted, lit from the top-left, a flat top, a hard glint
    S.lay('back'); O.nug.forEach(n => { if (inK(n.cx, n.cy, 13, 4) < 0.4) return; const pts = n.vs.map(([a, rr]) => [n.cx + Math.cos(a + n.rot) * n.r * rr, n.cy + Math.sin(a + n.rot) * n.ry * rr]);
      S.beg(); for (let y = Math.floor(n.cy - n.ry * 1.2); y <= n.cy + n.ry * 1.2; y++) for (let x = Math.floor(n.cx - n.r * 1.2); x <= n.cx + n.r * 1.2; x++) { if (!inPoly(pts, x + 0.5, y + 0.5)) continue;
        const u = (x + 0.5 - n.cx) / n.r, v = (y + 0.5 - n.cy) / n.ry, s2 = u * 0.8 + v, f = s2 < -0.4 ? 2 : s2 > 0.5 ? -2 : u > 0.4 ? -1 : 0, edge = !inPoly(pts, x - 0.5, y + 0.5) || !inPoly(pts, x + 0.5, y - 0.5); S.px(x, y, n.m, n.t + f + (edge && f >= 0 ? 1 : 0), { n: f > 0 ? [-0.5, -0.6] : f < -1 ? [0.5, 0.6] : [0.3, -0.1] }); } S.end();
      if (n.r > 3) { S.px(n.cx - n.r * 0.35, n.cy - n.ry * 0.45, n.m, 10, { e: 255 }); if (n.r > 5.5) { S.px(n.cx - n.r * 0.35 + 1, n.cy - n.ry * 0.45, n.m, 9, { e: 255 }); S.px(n.cx - n.r * 0.35, n.cy - n.ry * 0.45 + 1, n.m, 9, { e: 255 }); } } }); S.lay('wall');
    rimCut(S, sn, 13);
  },
  anim(D, t, rs) {
    const O = ORE, st = rs.st; D.lay('wall');
    // the gleam: a light sweeps along the band every 6.5 s, facets flash as it passes
    const gp = steps(t, 6.5) * 6.5, u = gp < 2.4 ? gp / 2.4 * 5 - 0.5 : -9; for (let i = 0; i < 5; i++) rs.mul[1 + i] = Math.max(0, 1 - Math.abs(u - i));
    if (u > 0 && u < 4.5 && R() < 0.45) { const n = O.nug[Math.floor(R() * O.nug.length)]; if (Math.abs(n.cx - (28 + u * 24)) < 14 && n.r > 2.5) rs.burst('glint', n.cx - n.r * 0.3, n.cy - n.ry * 0.35, 1, { sp: 0, life: 0.45 }); }
    // heat crawls along the seams
    O.seams.forEach((ps, i) => { const n = ps.length, h = (t * 12 + i * 30) % (n + 30); for (let q = 0; q < 5; q++) { const j = Math.floor(h) - q; if (j < 0 || j >= n) continue; const [x, y] = ps[j]; if (inK(x, y, 13, 6) > 0.4) D.px(x, y, 'fire', 11 - q, { e: 255 }); } });
    // every 9 s the big nugget splits along a white-hot crack and throws sparks
    const cp = steps(t, 9) * 9;
    D.lay('back'); if (cp < 1.6) { const n = O.crack.length, L = Math.min(n, Math.floor(cp / 0.3 * n)); for (let k = 0; k < L; k++) { const [x, y] = O.crack[k]; D.px(x, y, 'fire', cp < 0.4 ? 11 : Math.round(11 - (cp - 0.4) * 3.5), { e: 255 }); if (cp < 0.6) D.px(x + 1, y, 'fire', 8, { e: 255 }); } }
    if (cp > 0.28 && cp < 0.8 && !st.c) { st.c = 1; rs.flash(0, 1.4); rs.burst('spark', 74, 52, 16, { sp: 52, ang: 0, spread: 2.6, life: 1.1, floor: 108 }); rs.burst('ember', 74, 54, 5, { sp: 10, life: 1.6, w: 8 }); } if (cp > 2) st.c = 0;
    if (R() < 0.04) { const [x, y] = O.seams[0][Math.floor(R() * O.seams[0].length)]; if (inK(x, y, 13, 6) > 0.5) rs.burst('ember', x, y, 1, { sp: 4, ang: 0, spread: 0.6, life: 1.6 }); }
  },
});

// ───────── 风穴 wind: blue-grey wind-scoured stone round a cave throat; pale light at its far end, wind pouring out ─────────
const WND = (() => { const r = X.rng(6161), C = [50, 52], F = [61, 45], rings = [0, 1, 2, 3, 4, 5].map(k => { const s = 1 - k * 0.15; return { i: k, x: C[0] + (F[0] - C[0]) * k / 6, y: C[1] + (F[1] - C[1]) * k / 6, rx: 26 * s, ry: 20 * s }; });
  // each ring its own ragged outline, so the steps into the dark read as rock, not as the rings of an eye
  const lumpR = (x, y, g) => { const a = Math.atan2(y - g.y, x - g.x), k = 1 + 0.07 * Math.sin(a * 4 + 1 + g.i) + 0.05 * Math.sin(a * 7 + 2 + g.i * 2) + (g.i ? (vnoise(a * 2.2 + 4, g.i * 1.7, 95) - 0.5) * 0.22 : 0); return Math.hypot((x + 0.5 - g.x) / (g.rx * k), (y + 0.5 - g.y) / (g.ry * k)); };
  const lipY = (x, top) => { let t = -1, b = -1; for (let y = 0; y < H; y++) if (lumpR(x, y, rings[0]) < 1) { if (t < 0) t = y; b = y; } return top ? t : b; };
  // wind lines: a fan of gentle S-curves out of the throat, and two long ones across the whole face
  // (some curl once round a little loop on the way, the way wind is drawn)
  const curve = (x0, y0, x1, sl, A, ph, lx) => { const px = []; let pp = null; const to = (x, y) => { if (pp) bres(pp[0], pp[1], x, y, px); pp = [x, y]; };
    for (let x = x0; x <= x1; x++) { const y = y0 + (x - x0) * sl + A * Math.sin((x - x0) * 0.085 + ph); to(x, y); if (lx && x === lx) for (let a = 0.3; a < Math.PI * 2; a += 0.3) to(x + Math.sin(a) * 4, y - 4 + Math.cos(a) * 4); } return px.filter(([x, y]) => inside(x, y)); };
  const lines = [[72, 38, -0.24, 2.5, 0, 104], [76, 45, -0.1, 3, 1.4], [78, 52, 0.02, 3, 2.6, 118], [76, 59, 0.12, 2.6, 0.7], [70, 66, 0.26, 2.4, 2, 96]].map(([x0, y0, sl, A, ph, lx]) => curve(x0, y0, 152, sl, A, ph, lx));
  lines.push(curve(-2, 16, 152, 0.03, 2.2, 0.5), curve(-2, 92, 152, -0.02, 2, 2.2));
  const pits = []; for (let i = 0; i < 16; i++) { const x = 8 + r() * 134, y = 8 + r() * 88; if (lumpR(x, y, rings[0]) > 1.25) pits.push([x, y, 1.4 + r() * 2.6, 0.9 + r() * 1.5]); }
  // the far opening: a ragged hole, three nested outlines (rim, body, core)
  const far = [1, 0.7, 0.4].map((s, k) => { const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + (r() - 0.5) * 0.5, q = 0.7 + r() * 0.45; pts.push([F[0] + 0.4 + Math.cos(a) * 6 * s * q, F[1] + Math.sin(a) * 4.6 * s * q]); } return pts; });
  // stone teeth hanging off the upper lip: [x, length]
  const teeth = [[33, 4], [42, 6], [52, 5], [60, 3], [67, 4]].map(([x, l]) => [x, lipY(x, 1), l]);
  // dry grass on the lip, one tuft up top and one below: two or three thin blades out of a root in a dark crack,
  // already laid over toward the right by the wind that never stops; [root x, upper lip?, blades [x off, length, bend]]
  const tufts = [[37, 1, [[-1, 5, 0.5], [0, 7, 1], [1, 5, 1.4]]], [66, 0, [[0, 6, 0.9], [1, 4, 1.5]]]].map(([x, up, bl], i) => ({ rx: x, ry: (up ? lipY(x, 1) : lipY(x, 0)) - 1, bl, i }));
  return { C, F, rings, lumpR, lipY, lines, pits, far, teeth, tufts }; })();
X.def('_tile_wind', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const Wd = WND; sc.light({ x: Wd.F[0], y: Wd.F[1], z: 6, r: 64, i: 0.9, c: '#bfefff', fl: 'pulse', amp: 0.08, sp: 0.9, tint: 0.4 });
    sc.light({ x: 108, y: 50, z: 16, r: 66, i: 0.35, c: '#bfefff', tint: 0.1 });
    rockBase(S, 12); const sn = snap(S), r = S.r, Rg = Wd.rings;
    // blue-grey scoured stone: long soft bands, cross-bedding, grooves the wind cut (their lower lips catch a cold light)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const yy = y + Math.sin(x * 0.03 + 0.4) * 4, b = vnoise(0.2, yy * 0.11, 91), cb = Math.sin((x * 0.25 - yy * 1.1) * 0.5), cl = Math.round((vnoise(x / 6, y / 4, 92) - 0.5) * 1.4);
      S.px(x, y, 'scifi', 5.8 + (b > 0.64 ? 0.9 : b < 0.34 ? -0.8 : 0) + cl + (cb > 0.93 && b > 0.5 ? -0.9 : 0)); }
    for (let i = 0; i < 12; i++) { const x = r() * W, y = 6 + r() * 92, l = 10 + r() * 24; if (Wd.lumpR(x + l / 2, y, Rg[0]) < 1.15) continue; S.hl(x, y, l, 'scifi', 3.6); S.hl(x + 2, y + 1, l - 4, 'ice', 5); }
    soften(S, sn, 15, 9);
    // honeycomb pits
    Wd.pits.forEach(([x, y, rx, ry]) => { S.ell(x, y, rx, ry, 'scifi', 2.6); S.hl(x - rx * 0.6, y + ry, rx * 1.2 + 1, 'ice', 5); S.hl(x - rx * 0.6, y - ry - 0.5, rx * 1.2, 'scifi', 3.6); });
    // the throat: ragged steps down into the dark (darker every step); a lip lit from above-left; only the very edge of
    // each step, where it faces the far opening, catches a thread of its light, so the eye runs down the rings to the exit
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d0 = Wd.lumpR(x, y, Rg[0]); if (d0 > 1) continue; let k = 0; while (k < 5 && Wd.lumpR(x, y, Rg[k + 1]) < 1) k++;
      const g = Rg[k], u = (x + 0.5 - g.x) / g.rx, v = (y + 0.5 - g.y) / g.ry, below = v > 0, lip = k === 0 && d0 > 0.9 - vnoise(x / 3, y / 3, 93) * 0.07;
      if (lip) { const lit = (x - Rg[0].x) + (y - Rg[0].y) * 1.3 < 0; S.px(x, y, lit ? 'scifi' : 'scifi', lit ? 8.4 : 3, { n: [-(x - Rg[0].x) / 30, -(y - Rg[0].y) / 24] }); continue; }
      const face = -u * 0.75 + v * 0.66;   // > 0: this bit of wall faces up-right, toward the far opening
      if (k >= 2 && Wd.lumpR(x, y, g) > 0.87 && face > 0.24 + vnoise(x / 2, y / 2, 96) * 0.16) S.px(x, y, 'ice', k >= 4 ? 2 : 1, { e: 1 });
      else S.px(x, y, 'scifi', Math.max(0, [4.8, 3.2, 1.4, 1.1, 0.8, 0.5][k] + (k < 2 ? (below ? 0.5 : -0.4) : below ? 0 : -0.3) + (vnoise(x / 3, y / 2, 97) > 0.68 ? -0.6 : 0)), { n: [u * 0.6, v * 0.6] }); }
    // the upper lip overhangs: its shadow darkens the first rows inside it
    const sh = [], L0 = 26, L1 = 75; for (let x = L0; x <= L1; x++) sh.push([x, Wd.lipY(x, 1) + 1.5]); for (let x = L1; x >= L0; x--) sh.push([x, Wd.lipY(x, 1) + 4.5 + Math.round(vnoise(x / 4, 1, 98) * 1.4)]); S.shadow(sh, 1.5);
    // stone teeth hang off it: lit left face, dark right face
    Wd.teeth.forEach(([x, y, l]) => { S.beg(); for (let k = 0; k < l; k++) { const w = k < l * 0.4 ? 3 : k < l - 1 ? 2 : 1; for (let j = 0; j < w; j++) S.px(x + j, y + 1 + k, 'scifi', j === 0 ? 7 : j === w - 1 && w > 1 ? 3.6 : 5, { n: [j === 0 ? -0.6 : 0.5, 0.2] }); } S.end(); });
    // the far opening: a ragged hole of cold light
    const [f0, f1, f2] = Wd.far; S.poly(f0, 'ice', 6, { e: 1 }); S.poly(f1, 'ice', 9, { e: 1 }); S.poly(f2, 'ice', 10, { e: 255 }); S.px(Wd.F[0] - 1, Wd.F[1] - 1, 'ice', 11, { e: 255 }); S.px(Wd.F[0], Wd.F[1] - 1, 'ice', 11, { e: 255 });
    // the grass roots sit in dark cracks of the lip
    Wd.tufts.forEach(({ rx: x, ry: y }) => { S.rect(x - 1, y + 1, 3, 1, 'earth', 2); S.px(x, y + 2, 'earth', 1.6); S.px(x - 2, y + 1, 'scifi', 2); });
    rimCut(S, sn, 15);
    sc.emit({ k: 'mist', x: 72, y: 50, w: 4, h: 14, rate: 0.5, sp: 14, ang: Math.PI / 2, spread: 0.7, life: 1.8 });
  },
  anim(D, t, rs) {
    const Wd = WND, st = rs.st; D.lay('wall');
    // gusts every 6.5 s: the wind runs faster and thicker, a pale ring blows out of the throat
    const gp = steps(t, 6.5) * 6.5, gust = gp < 1.4 ? Math.sin(gp / 1.4 * Math.PI) : 0, sp = 30 + gust * 60;
    st.ph = (st.ph || 0) + sp * clamp(t - (st.lt || t), 0, 0.1); st.lt = t;
    D.lay('front'); Wd.lines.forEach((ln, i) => { const n = ln.length, amb = i >= 5, gap = amb ? 90 : gust > 0.3 ? 44 : 72, len = amb ? 14 : 20; for (let h = (st.ph * (amb ? 0.8 : 1) + i * 23) % gap; h < n + len; h += gap) for (let q = 0; q < len; q++) { const j = Math.floor(h) - q; if (j < 0 || j >= n) continue; const [x, y] = ln[j]; if (inK(x, y, 15, 8) < 0.3) continue; D.px(x, y, 'ice', Math.max(5, (amb ? 8.6 : 11) - q * (amb ? 0.3 : 0.3)), { e: 255 }); } });
    // dry grass on the lip: thin blades, dark at the foot, dull straw at the tips, laid over to the right by the wind and
    // flattened further in a gust
    D.lay('back'); Wd.tufts.forEach(tf => { const lean = 1 + gust * 0.7 + 0.12 * Math.sin(t * 4.6 + tf.i * 2.1);
      tf.bl.forEach(([dx, len, bend]) => { const pts = []; let px = null;
        for (let j = 0; j < len; j++) { const u = j / (len - 1), x = tf.rx + dx + Math.round(lean * bend * 3.6 * Math.pow(u, 1.6)), y = tf.ry - Math.round(j * (1 - 0.1 * lean * bend * u)); if (px) bres(px[0], px[1], x, y, pts); else pts.push([x, y]); px = [x, y]; }
        const top = len >= 6 ? 5 : 4; pts.forEach(([x, y], q) => { const u = q / Math.max(1, pts.length - 1); D.px(x, y, 'sand', Math.min(top, 2 + Math.floor(u * 3.99))); }); }); });
    // the ring of the gust, and chaff torn off the grass riding it
    D.lay('front'); if (gp < 0.8) { const g = gp / 0.8, rx = 27 + g * 26, ry = rx * 0.75, [cx, cy] = Wd.C; for (let k = 0; k < 90; k++) { const a = -1.3 + k / 90 * 2.6; if (k % 4 === 3) continue; D.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 'ice', 9.6 - g * 3.5, { e: 255 }); } }
    if (gp < 2.6) for (let i = 0; i < 6; i++) { const u = gp - i * 0.12; if (u < 0) continue; const x = 64 + i * 3 + u * (28 + ((i * 5) % 6) * 7), y = 38 + ((i * 7) % 6) * 4.4 + Math.sin(u * 6 + i) * 2 + u * u * 2.5; if (x > 140 || u > 2.2) continue; D.px(x, y, 'sand', 5); D.px(x - 1, y + (i & 1 ? 1 : 0), 'sand', 3); }
    if (gp < 0.05 && !st.g) { st.g = 1; rs.flash(0, 0.9); rs.burst('mist', 74, 50, 4, { sp: 40, ang: Math.PI / 2, spread: 0.8, life: 1.6, h: 10 }); rs.burst('dust', 72, 50, 4, { sp: 44, ang: Math.PI / 2, spread: 0.8, life: 2, h: 12 }); } if (gp > 1) st.g = 0;
    if (R() < 0.012) rs.burst('dust', 70, 46 + R() * 10, 1, { sp: 34, ang: Math.PI / 2, spread: 0.6, life: 2 });
    // the far light shivers
    D.lay('wall'); const [fx, fy] = Wd.F; if (Math.sin(t * 7) > 0.4) D.px(fx + 1, fy - 1, 'ice', 11, { e: 255 });
  },
});

// ───────── 龙骨 dragon: a dragon's skull and spine in red-brown rock; its heart-stone still beats between the ribs ─────────
const DRG = (() => { const r = X.rng(7171);
  const skull = [[16, 42], [22, 36], [34, 32], [46, 29], [54, 25], [62, 21], [72, 21], [80, 24], [86, 30], [88, 39], [84, 47], [76, 50], [66, 51], [52, 51], [38, 50], [26, 48], [18, 46]];
  const jaw = [[21, 55], [40, 56], [62, 56], [80, 52], [85, 55], [76, 60], [60, 63], [40, 62], [24, 59]];
  const verts = [[93, 53], [100, 57], [107, 61], [114, 64], [121, 68], [128, 71], [135, 75], [141, 80]];
  const horn = path(r, [[78, 25], [88, 15], [100, 9], [112, 7], [121, 10]], 4, 0.6), horn2 = path(r, [[86, 33], [97, 31], [106, 35], [112, 41]], 4, 0.5);
  const ribs = [2, 3, 4, 5, 6].map((k, i) => { const [vx, vy] = verts[k], pts = []; for (let s = 0; s <= 1.001; s += 0.04) { const a = 1 - s; pts.push([a * a * vx + 2 * a * s * (vx - 13) + s * s * (vx - 9 + i), a * a * (vy + 3) + 2 * a * s * (vy + 8) + s * s * (vy + 27 - i * 2)]); } const px = []; for (let q = 0; q + 1 < pts.length; q++) bres(pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1], px); return px; });
  return { skull, jaw, verts, horn, horn2, ribs, heart: [117, 86], eye: [60, 34] }; })();
X.def('_tile_dragon', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const Dg = DRG; sc.light({ x: 60, y: 34, z: 10, r: 46, i: 0.9, c: '#ff5a3a', fl: 'pulse', amp: 0.12, sp: 1, tint: 0.18 });
    sc.light({ x: 117, y: 86, z: 10, r: 52, i: 0.9, c: '#ff5a3a', tint: 0.22 });
    sc.light({ x: 21, y: 41, z: 6, r: 20, i: 0.45, c: '#ff7a3a', fl: 'pulse', amp: 0.2, sp: 1.4, ph: 2, tint: 0.3 });
    rockBase(S, 14); const sn = snap(S), r = S.r;
    // red-brown beds, dry-cracked
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const yy = y + x * 0.08 + Math.sin(x * 0.05) * 2.5, b = vnoise(0.4, yy * 0.14, 101), cl = Math.round((vnoise(x / 5, y / 4, 102) - 0.5) * 1.6); S.px(x, y, b > 0.6 ? 'brick' : 'mstone', (b > 0.6 ? 2.4 : 3.2) + cl + (b < 0.3 ? -0.6 : 0)); }
    for (let i = 0; i < 16; i++) TX.crack(S, Math.floor(r() * W), Math.floor(r() * H), 5 + Math.floor(r() * 9), 'mstone', 3, r() < 0.5 ? 'v' : 'h');
    soften(S, sn, 17, 14);
    // the bones stand proud of the rock: spine and ribs first (the skull overlaps the neck)
    S.lay('back');
    Dg.ribs.forEach(px => { S.beg(); px.forEach(([x, y], j) => { if (inK(x, y, 17, 5) < 0.3) return; S.px(x, y, 'bone', 5.4 - j / px.length * 1.6); S.px(x + 1, y, 'bone', 3.2 - j / px.length); }); S.end(); });
    Dg.verts.forEach(([x, y], i) => { S.beg(); S.ell(x, y, 3.2, 2.6, 'bone', 5.4, { dome: 1 }); S.line(x, y - 2, x + 1, y - 6, 'bone', 6.4); S.px(x + 1, y - 7, 'bone', 7.6); S.px(x - 3, y, 'bone', 5); S.px(x + 3, y + 1, 'bone', 4.4); S.end(); });
    // the heart-stone between the ribs
    const [hx, hy] = Dg.heart; S.beg(); S.poly([[hx - 4, hy - 1], [hx - 1, hy - 5], [hx + 3, hy - 4], [hx + 4, hy + 1], [hx, hy + 5], [hx - 3, hy + 3]], 'red', 5.4, { e: 2 }); S.poly([[hx - 2, hy - 1], [hx, hy - 4], [hx + 2, hy - 3], [hx + 1, hy + 1]], 'red', 8, { e: 2 }); S.px(hx - 1, hy - 2, 'red', 10, { e: 255 }); S.end();
    // horns (ringed, tapering), then the skull
    [[Dg.horn, 3.6], [Dg.horn2, 2.6]].forEach(([px, w0]) => { const n = px.length, nrm = px.map(([x, y], j) => { const a = px[Math.max(0, j - 2)], b = px[Math.min(n - 1, j + 2)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; let nx = -ty / l, ny = tx / l; if (ny > 0) { nx = -nx; ny = -ny; } return [nx, ny, 0.6 + w0 * Math.pow(1 - j / n, 0.8)]; });
      const poly = px.map(([x, y], j) => [x + nrm[j][0] * nrm[j][2], y + nrm[j][1] * nrm[j][2]]).concat(px.map(([x, y], j) => [x - nrm[j][0] * nrm[j][2], y - nrm[j][1] * nrm[j][2]]).reverse());
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; poly.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      S.beg(); for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { if (!inPoly(poly, x + 0.5, y + 0.5)) continue; let bj = 0, bd = 1e9; px.forEach(([qx, qy], j) => { const d = (qx - x) ** 2 + (qy - y) ** 2; if (d < bd) { bd = d; bj = j; } });
        const [nx, ny, w] = nrm[bj], u = ((x - px[bj][0]) * nx + (y - px[bj][1]) * ny) / Math.max(1, w), ring = bj % 4 === 0 && bj < n - 3 && Math.abs(u) < 0.9; S.px(x, y, 'bone', (ring ? 3 : 5) + (u > 0.3 ? 1 : u < -0.4 ? -1 : 0) + (bj > n - 4 ? 1 : 0), { n: [0, -0.2] }); } S.end(); });
    S.beg(); S.poly(Dg.skull, 'bone', 5.2); S.end(); const sk = S.id, Y = S.L.back, BONE = X.MI.bone;
    for (let y = 18; y < 54; y++) for (let x = 14; x < 92; x++) { const p = y * W + x; if (Y.m[p] !== BONE || Y.o[p] !== sk) continue; const out = (dx, dy) => Y.o[p + dy * W + dx] !== sk; let up = 0, dn = 0; for (let k = 3; k >= 1; k--) { if (out(0, -k) || out(-k, -k)) up = 4 - k; if (out(0, k) || out(k, k) || out(k, 0)) dn = 4 - k; }
      let tn = Y.t[p] + (up ? up * 0.6 : dn ? -dn * 0.55 : 0) + (y < 31 ? 0.5 : y > 42 ? -0.6 : 0);
      // form in clumps: the flat of the muzzle catches the light; the hollow behind the eye and under the cheek arch
      // sits in shadow; the bone over the tooth roots turns under
      if (x >= 20 && x <= 48 && y >= 33 && y <= 36) tn = Math.max(tn, 6.5);
      if (x >= 66 && x <= 86 && y >= 36 && y <= 47) { const v = vnoise(x / 3, y / 2.5, 111); tn = v > 0.5 ? 3 : v < 0.2 ? 4.6 : 4; }
      if (y >= 47 && x < 84) tn = Math.min(tn, y >= 49 ? 3 : 4);
      Y.t[p] = tn; }
    S.poly([[48, 29], [56, 24], [64, 21], [70, 21]], 'bone', 7.6); [[56, 24], [63, 21], [70, 21]].forEach(([x, y]) => { S.px(x + 1, y - 1, 'bone', 7.6); S.px(x + 2, y - 2, 'bone', 8.2); });
    // the eye socket sunk in a darker rim under a jutting brow; the cheek arch runs back under the temporal opening
    S.ell(60, 34, 7.8, 6, 'bone', 3.8, { ring: 1.3 });
    for (let x = 52; x <= 68; x++) for (let y = 27; y <= 29; y++) if (S.at(x, y) === BONE) S.px(x, y, 'bone', y === 27 && x > 53 && x < 67 ? 8 : 7, { n: [-0.2, -0.7] });
    for (let x = 53; x <= 85; x++) { const y = 41 + Math.round(Math.sin((x - 53) / 32 * Math.PI) * 0.8); if (S.at(x, y) !== BONE) continue; S.px(x, y, 'bone', x < 58 ? 6 : 7, { n: [0, -0.7] }); S.px(x, y + 1, 'bone', 6); if (S.at(x, y + 2) === BONE) S.px(x, y + 2, 'bone', 3); }
    S.ell(60, 34, 6.4, 4.8, 'ink', 1); S.ell(77, 36, 3.6, 5, 'ink', 1.4); S.ell(40, 41, 5.5, 2.2, 'ink', 1.2); S.hl(35, 39, 10, 'bone', 4); S.ell(20, 41, 1.6, 1.2, 'ink', 0.8);
    [[[30, 34], [33, 40], [31, 46]], [[70, 23], [72, 28], [69, 30]], [[86, 34], [82, 38]]].forEach(c => { const ps = path(S.r, c, 3, 0.8); ps.forEach(([x, y]) => { if (S.at(x, y) === BONE) S.px(x, y, 'bone', 3); }); });
    for (let x = 22; x < 64; x += 5) { const L = x === 27 || x === 52 ? 6 : 3 + (x % 3 === 0 ? 1 : 0); for (let k = 0; k < L; k++) { const w = Math.max(1, Math.round(1.6 * (1 - k / L))); for (let j = 0; j < w; j++) S.px(x + j, 50 + k, 'bone', 7.4 - k * 0.5 - j); } }
    S.beg(); S.poly(Dg.jaw, 'bone', 4.8); S.end(); const jw = S.id; for (let y = 58; y < 66; y++) for (let x = 20; x < 88; x++) { const p = y * W + x; if (Y.m[p] === BONE && Y.o[p] === jw) Y.t[p] -= 1; }
    S.hl(22, 55, 58, 'bone', 6.6); S.hl(24, 61, 50, 'bone', 2);
    for (let x = 25; x < 62; x += 6) for (let k = 0; k < 3; k++) S.px(x, 54 - k, 'bone', 8 - k * 0.6);
    // the eye socket's ember
    const [ex, ey] = Dg.eye; S.ell(ex, ey + 0.5, 4, 2.9, 'red', 3.2, { e: 1 }); S.ell(ex, ey + 0.5, 2.6, 2, 'red', 6.2, { e: 1 }); S.vl(ex, ey - 1, 4, 'fire', 9.2, { e: 1 });
    // the bones throw a shadow on the rock they lie in (down-right), so they sit in it rather than float on it
    S.lay('wall'); const sh = new Uint8Array(N); for (let p = 0; p < N; p++) if (Y.m[p]) { const x = p % W + 2, y = ((p / W) | 0) + 2; if (inside(x, y)) sh[y * W + x] = 1; }
    const Wl = S.L.wall; for (let p = 0; p < N; p++) if (sh[p] && !Y.m[p] && Wl.m[p] && !Wl.e[p]) Wl.t[p] = Math.max(0, Wl.t[p] - 1.8);
    // coals round the heart
    for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2, d = 5 + r() * 14, x = hx + Math.cos(a) * d * 1.4, y = hy + Math.sin(a) * d * 0.6; if (inK(x, y, 17, 5) > 0.5) S.px(x, y, 'fire', 4 + r() * 3, { e: 2 }); }
    rimCut(S, sn, 17);
    sc.emit({ k: 'ember', x: 60, y: 32, w: 6, rate: 0.7, sp: 5, ang: 0, spread: 0.6, life: 2.2 });
    sc.emit({ k: 'ember', x: 117, y: 84, w: 16, rate: 0.6, sp: 5, ang: 0, spread: 0.6, life: 2 });
  },
  anim(D, t, rs) {
    const Dg = DRG, st = rs.st; D.lay('back');
    // the heart beats (lub-dub every 1.5 s) and lights the ribs
    const hb = steps(t, 1.5), beat = Math.exp(-((hb - 0.05) ** 2) / 0.002) + 0.6 * Math.exp(-((hb - 0.22) ** 2) / 0.002); rs.mul[1] = 0.85 + beat * 0.6;
    // the ember in the eye flickers like a slit pupil
    const [ex, ey] = Dg.eye, fl = n1(t * 7); D.px(ex, ey - 1 + (fl > 0.3 ? -1 : 0), 'fire', 11, { e: 255 }); D.px(ex, ey, 'fire', 10.4 + fl, { e: 255 }); if (fl < -0.3) D.px(ex + 1, ey, 'fire', 8.6, { e: 255 });
    // every 8.5 s the dragon breathes: fire runs up the spine from the heart, the eye flares, the nostril spits embers
    const bp = steps(t, 8.5) * 8.5; if (bp < 1) Dg.verts.slice().reverse().forEach(([x, y], i) => { const a = bp - i * 0.09; if (a < 0 || a > 0.35) return; const tn = 11 - a * 8; D.px(x + 1, y - 7, 'fire', tn, { e: 255 }); D.px(x + 1, y - 6, 'fire', tn - 1, { e: 255 }); D.px(x, y - 4, 'fire', tn - 2, { e: 255 }); D.hl(x - 2, y - 2, 4, 'fire', tn - 3, { e: 255 }); });
    if (bp > 0.72 && bp < 1.2 && !st.b) { st.b = 1; rs.flash(0, 1.6); rs.flash(2, 2); rs.burst('ember', 21, 40, 12, { sp: 16, ang: -0.35, spread: 0.5, life: 1 }); rs.burst('steam', 24, 39, 2, { sp: 12, ang: -0.3, spread: 0.4, life: 1.1 }); rs.burst('ember', 60, 32, 6, { sp: 14, ang: 0, spread: 1, life: 1.6 }); } if (bp > 2) st.b = 0;
  },
});

// ───────── seams: what a room dug out of this ground keeps along its floor (rows 90–101, into the wall layer) ─────────
const FZ2 = (y) => ({ z: (y - 90) * 2, n: [0, -0.9] });
const seamY = (x, s, a) => 95 + Math.round(Math.sin(x * 0.09 + s) * a + Math.sin(x * 0.23 + s * 2) * a * 0.5);
X.TILEF.ley = (D, t) => { const hx = 3 + ((t * 26) % 190); for (let x = 3; x < 147; x++) { const y = seamY(x, 1, 1.2), d = x - hx; D.px(x, y, 'arcane', d <= 0 && d > -4 ? 11 + d * 0.8 : 7.6 + (Math.sin(x * 0.5 + t * 2) > 0.8 ? 1.4 : 0), { e: 255 }); if ((x * 7) % 5 === 0) D.px(x, y + 1, 'magic', 4, FZ2(y + 1)); }
  [22, 61, 99, 131].forEach((x, i) => { const y = seamY(x, 1, 1.2), a = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7); D.px(x, y - 1, 'arcane', 8 + a * 2.6, { e: 255 }); D.px(x + 1, y - 2, 'arcane', 6 + a * 3, { e: 255 }); D.px(x - 1, y - 1, 'arcane', 6, { e: 255 }); }); };
X.TILEF.amber = (D, t) => { const B = [[8, 2], [26, 3], [41, 1.5], [60, 2.5], [79, 2], [99, 3], [117, 1.5], [134, 2.5]], lit = Math.floor(t * 1.4) % B.length;
  for (let x = 3; x < 147; x++) D.px(x, seamY(x, 3, 0.8) + 1, 'hair', 2, FZ2(97));
  B.forEach(([bx, rx], i) => { const y = seamY(bx, 3, 0.8); for (let yy = -1; yy <= 1; yy++) for (let xx = -Math.ceil(rx); xx <= Math.ceil(rx); xx++) if ((xx / (rx + 0.3)) ** 2 + (yy / 1.4) ** 2 < 1) D.px(bx + xx, y + yy, 'lamp', yy < 0 ? 5.4 : 6.8, { e: 255 }); D.px(bx - Math.floor(rx / 2), y - 1, 'lamp', i === lit ? 11 : 9, { e: 255 }); }); };
X.TILEF.mint = (D, t) => { const tw = Math.floor(t * 1.6); for (let x = 3; x < 147; x++) { const y = seamY(x, 5, 1), fl = (x * 13) % 7 === 0; D.px(x, y, 'gold', fl ? 9.6 : 6, fl ? { e: 255 } : FZ2(y)); if ((x * 5) % 11 === 0) D.px(x, y + 1, 'gold', 5, FZ2(y + 1)); }
  const sx = 3 + ((tw * 37) % 140), sy = seamY(sx, 5, 1), a = Math.sin((t * 1.6 % 1) * Math.PI); D.px(sx, sy, 'gold', 11, { e: 255 }); if (a > 0.4) [[1, 0], [-1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => D.px(sx + dx, sy + dy, 'gold', 9, { e: 255 })); if (a > 0.8) { D.px(sx + 2, sy, 'gold', 8, { e: 255 }); D.px(sx - 2, sy, 'gold', 8, { e: 255 }); } };
X.TILEF.rift = (D, t) => { for (let x = 3; x < 147; x++) { const y = seamY(x, 7, 1.3), g = n1(x * 0.18 + t * 2.2); D.px(x, y, 'ink', 1, FZ2(y)); if (g > -0.2) D.px(x, y - 1, 'screen', 6.4 + g * 3.6, { e: 255 }); if (g > 0.5) D.px(x, y + 1, 'screen', 5, { e: 255 }); }
  for (let i = 0; i < 3; i++) { const q = steps(t * 0.6 + i * 0.33, 1), x = 20 + ((i * 47 + Math.floor(t * 0.6 + i * 0.33) * 29) % 110); if (q < 0.8) D.px(x, Math.max(90, seamY(x, 7, 1.3) - 2 - Math.floor(q * 3.6)), 'screen', Math.round(10 - q * 4), { e: 255 }); } };
X.TILEF.ore = (D, t) => { const gl = Math.floor(t * 1.2) % 12; let px = 3; for (let x = 3; x < 147; x++) D.px(x, seamY(x, 9, 0.7) + 2, 'rock', 1, FZ2(98));
  for (let x = 3, i = 0; x < 142; i++) { const w = 2 + ((i * 7) % 3), y = seamY(x, 9, 0.7), m = i % 6 === 4 ? 'iron' : 'copper'; for (let g = px; g < x - 1; g++) if (Math.sin(g * 0.7 + t * 3) > -0.3) D.px(g, seamY(g, 9, 0.7) + 1, 'fire', 5 + (Math.sin(g * 0.7 + t * 3) > 0.7 ? 2 : 0), { e: 255 });
    D.px(x - 1, y, 'rock', 1, FZ2(y)); D.px(x + w, y, 'rock', 1, FZ2(y)); for (let k = 0; k < w; k++) { D.px(x + k, y, m, k ? 7 : 9, FZ2(y)); D.px(x + k, y + 1, m, 4, FZ2(y + 1)); } if (i % 12 === gl) D.px(x, y, m, 11, { e: 255 }); px = x + w + 1; x += w + 3 + ((i * 5) % 4); } };
// wind-cut grooves in two staggered rows: random lengths and gaps, now and then a little pit
const hh = (i, s) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const WGROOVE = (() => { const o = []; [[97, 1], [99, 2]].forEach(([y, s]) => { let x = 3 + Math.floor(hh(0, s) * 7), i = 0;
  while (x < 143) { const pit = hh(i, s + 7) < 0.15, len = pit ? 2 : 2 + Math.floor(hh(i, s + 3) * 6); o.push([x, y - (hh(i, s + 5) < 0.3 ? 1 : 0), Math.min(len, 146 - x), pit]); x += len + 3 + Math.floor(hh(i, s + 11) * 7); i++; } }); return o; })();
X.TILEF.wind = (D, t) => { WGROOVE.forEach(([x, y, l, pit]) => { if (pit) { D.hl(x, y, 2, 'scifi', 1, FZ2(y)); D.px(x + 1, y + 1, 'scifi', 7, FZ2(y + 1)); D.px(x - 1, y, 'scifi', 3, FZ2(y)); return; } D.hl(x, y, l, 'scifi', 2, FZ2(y)); if (l > 2) D.hl(x + 1, y + 1, l - 1, 'scifi', 7, FZ2(y + 1)); else D.px(x + 1, y + 1, 'scifi', 6, FZ2(y + 1)); });
  [[93, 34, 0], [96, 22, 60]].forEach(([y0, sp, o]) => { for (let k = 0; k < 3; k++) { const h = 3 + ((t * sp + o + k * 52) % 160); for (let q = 0; q < 8; q++) { const x = Math.floor(h) - q; if (x < 3 || x > 146) continue; D.px(x, y0 + Math.round(Math.sin(x * 0.07 + k) * 0.8), 'ice', 9.4 - q * 0.5, { e: 255 }); } } }); };
// a buried spine: vertebrae of 3–5 px, every other one mirrored, strung on a thin cord; an ember glows by every second or third
const DSPINE = (() => { const o = []; for (let x = 5, i = 0; x < 141; i++) { const l = 3 + ((i * 7 + 1) % 3); o.push({ x, l, fl: i & 1, y: 95 + (i % 2), dot: (i * 3) % 5 < 2 }); x += l + 2 + ((i * 5) % 2); } return o; })();
X.TILEF.dragon = (D, t) => { const hb = steps(t, 1.5), beat = Math.exp(-((hb - 0.05) ** 2) / 0.003) + 0.6 * Math.exp(-((hb - 0.22) ** 2) / 0.003);
  DSPINE.forEach((v, i) => { const { x, l, fl, y } = v, nx = DSPINE[i + 1];
    if (nx) D.hl(x + l, 96, nx.x - x - l, 'bone', 3, FZ2(96));
    for (let k = 0; k < l; k++) { const q = fl ? l - 1 - k : k; D.px(x + k, y, 'bone', Math.round(8 - q * (3 / (l - 1))), FZ2(y)); if (q > 0) D.px(x + k, y + 1, 'bone', q === l - 1 ? 3 : 5, FZ2(y + 1)); }
    D.px(fl ? x + l - 2 : x + 1, y - 1, 'bone', 8, FZ2(y - 1));
    if (v.dot) D.px(x + (fl ? -1 : l), y + 1, 'red', Math.round(5.6 + beat * 3.6), { e: 255 }); }); };

})();
