// ==== mc-pxroom-t1.js ====
(function () {
// Pixel terrain, batch t1 (pixel-room workflow; pattern: mc-pxroom-a.js, docs/design.md §10.1): 地热 geo · 化石层 fossil ·
// 陶土层 clay · 古遗迹 ruin · 地下泉 spring · 松软土层 mole · 晶簇 crystal, and the unexplored deep vein (_vein).
// A special terrain is a whole cell of ground (150×105, no frame, no floor) among the plain rock cells: a lens of its own
// geology inside a rim painted with the rock cells' own recipe (so the neighbours meet it), its own colour and light, slow
// motion, and one moment every 6–12 s. PXR.TILEF[key] is the seam a room dug out of that ground keeps along its floor.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, TX, vnoise, MI } = X;
const NO = {};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;
const hh = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const AMB = [0.5, 0.42];   // the rock cells' ambient: a rim painted with their tones comes out the same

// ───────── shared ─────────
const nz = (x, y, c, s) => vnoise(x / c, y / c, s) * 0.7 + vnoise(x / c * 2.3, y / c * 2.3, s + 7) * 0.3;   // the painter's noise() value
// the rock cells' tone at (x, y) for variant v (same bands and two noise passes as the kit's rockPaint)
function rockTone(x, y, v) {
  const band = Math.round(Math.sin(y * 0.16 + v * 2.1) * 0.8 + (vnoise(v, y * 0.07, v) - 0.5) * 3);
  let t = Math.max(0, 4 + band + Math.round((nz(x, y, 4, v * 7 + 1) - 0.5) * 2)); return Math.max(0, t + Math.round((nz(x, y, 1.6, v * 7 + 2) - 0.5) * 2));
}
// lens(seed, inset, wob): 1 inside the terrain, 0 in the rock rim; the rim is inset…inset+wob px wide and lumpy (only the
// crystal geode, whose own outline is the geode, still uses this plain lens; the other cells are blob()s)
function lens(seed, inset, wob, cell) { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.min(x, W - 1 - x, y, H - 1 - y); const c = cell || 10; if (d > inset + wob * (vnoise(x / c, y / c, seed) * 0.7 + vnoise(x / c * 2.6, y / c * 2.6, seed + 3) * 0.3)) m[y * W + x] = 1; } return m; }
// blob(seed, o): the ground of a special cell as an irregular clump in the rock, like the other terrain cells (never a framed
// picture): a rim o.r0…o.r1 px thick (default 4…16) that swells and thins at two scales, a rock clump o.bite [x, y, r] gnawed
// in at each corner, o.keep ellipses [x, y, rx, ry] the rim stays out of (never within the outer 4 px); a majority pass takes
// out one-pixel steps so the contact reads as a clean line
function blob(seed, o) {
  const r0 = o.r0 == null ? 5 : o.r0, r1 = o.r1 == null ? 16 : o.r1, c = o.cell || 11, m = new Uint8Array(W * H), bite = o.bite || [], keep = o.keep || [];
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
    const d = Math.min(x, W - 1 - x, y, H - 1 - y), n = clamp((vnoise(x / c, y / c, seed) * 0.7 + vnoise(x / c * 2.7, y / c * 2.7, seed + 3) * 0.3 - 0.5) * 1.9 + 0.5, 0, 1);
    let v = d > r0 + (r1 - r0) * n;
    if (v) for (const [bx, by, br] of bite) if (Math.hypot(x + 0.5 - bx, (y + 0.5 - by) * 1.1) < br * (1 + (vnoise(x / 4, y / 4, seed + 11) - 0.5) * 0.45)) { v = false; break; }
    if (!v) for (const [kx, ky, rx, ry] of keep) { const u = (x + 0.5 - kx) / rx, w = (y + 0.5 - ky) / ry; if (u * u + w * w < 1) { v = true; break; } }
    if (v) m[y * W + x] = 1;
  }
  for (let it = 0; it < 2; it++) { const c2 = m.slice(); for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += c2[(y + j) * W + x + i]; m[y * W + x] = s >= 5 ? 1 : 0; } }
  m.bite = bite; m.keep = keep; return m;
}
const inM = (m, x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1; };
const clear = (m, x, y, k) => { for (let j = Math.floor(y - k); j <= Math.ceil(y + k); j++) for (let i = Math.floor(x - k); i <= Math.ceil(x + k); i++) if (inM(m, i, j)) return false; return true; };
const deep = (m, x, y, k) => { for (let j = -k; j <= k; j++) for (let i = -k; i <= k; i++) if (!inM(m, x + i, y + j)) return false; return true; };
// rim(S, m, v, o): rock (variant v) wherever m is 0, a big boulder in each corner clump of a blob, cobbles where the rim is
// thick, a few glints; then the contact line:
// o.hollow → the terrain is a cavity (a dark overhang under the rim, a lit lip where the rim is below), else a plain dark seam;
// o.noSeam → neither (the lens is host rock round a body of its own)
function rim(S, m, v, o) {
  o = o || NO; S.lay('wall'); const r = X.rng(v * 131 + 7);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!m[y * W + x]) S.px(x, y, 'rock', rockTone(x, y, v));
  // the corner clumps are boulders of the host rock, like the big ones in the rock cells
  (m.bite || []).forEach(([bx, by, br], i) => { const rx = br * 0.62, ry = rx * 0.74; S.beg();
    for (let y = Math.floor(by - ry); y <= Math.ceil(by + ry); y++) for (let x = Math.floor(bx - rx); x <= Math.ceil(bx + rx); x++) { const u = (x + 0.5 - bx) / rx, v = (y + 0.5 - by) / ry; if (u * u + v * v > 1 || inM(m, x, y)) continue; S.px(x, y, 'rock', 6 + (i % 2), { n: [u * 0.9, v * 0.9] }); }
    S.px(Math.round(bx - rx * 0.45), Math.round(by - ry * 0.5), 'rock', 9); S.end(); });
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, rr = 1.6 + r() * 2.4; if (!clear(m, x, y, rr + 2) || (m.bite || []).some(([bx, by, br]) => Math.hypot(x - bx, (y - by) * 1.3) < br * 0.62 + rr + 1)) continue; S.beg(); S.ell(x, y, rr, rr * 0.7, 'rock', 5 + Math.round(r() * 3), { dome: 1 }); S.end(); }
  for (let i = 0; i < 30; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H); if (!m[y * W + x]) S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); }
  if (o.noSeam) return;   // the lens is rock too (a body set in the host rock): no contact line
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (m[y * W + x]) continue; const dn = inM(m, x, y + 1), up = inM(m, x, y - 1), sd = inM(m, x - 1, y) || inM(m, x + 1, y); if (!(dn || up || sd)) continue;
    if (o.hollow) S.px(x, y, 'rock', dn ? 1 : up ? 8 : 2, up && !dn ? { n: [0, -0.8] } : NO); else S.px(x, y, 'rock', up && !dn ? 3 : 1); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!m[y * W + x]) continue;
    if (o.hollow) { const k = !inM(m, x, y - 1) ? 2 : !inM(m, x, y - 2) || !inM(m, x - 1, y) || !inM(m, x + 1, y) ? 1 : 0; if (k) S.tone(x, y, -k); }
    else if (!inM(m, x, y - 1) || !inM(m, x, y + 1) || !inM(m, x - 1, y) || !inM(m, x + 1, y)) S.tone(x, y, -1); }
  // boulders sitting across the contact, so the lens reads as ground, not a framed picture
  const kept = (x, y) => (m.keep || []).some(([kx, ky, rx, ry]) => Math.pow((x - kx) / (rx + 4), 2) + Math.pow((y - ky) / (ry + 4), 2) < 1);   // never over the things the rim was kept off
  const edge = []; for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) if (!m[y * W + x] && (inM(m, x + 1, y) || inM(m, x, y + 1)) && !kept(x, y)) edge.push([x, y]);
  for (let i = 0; i < (o.boulders || 0) && edge.length; i++) { const q = edge[Math.floor(r() * edge.length)], rr = 2.2 + r() * 2.6; S.beg(); S.ell(q[0], q[1], rr, rr * 0.72, 'rock', 5 + Math.round(r() * 2), { dome: 1 }); S.px(q[0] - Math.round(rr / 2), q[1] - Math.round(rr * 0.4), 'rock', 9); S.end(); }
}
// erase what this layer has outside the terrain lens (things on the back / mid layers must not cover the rock rim)
function unmask(S, m, x0, y0, x1, y1) { for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (!m[y * W + x]) S.px(x, y, 0, 0); }
// a wandering path (turning by up to `turn` per step, pulled toward angle `pull`) and its pixels in order
function walk(r, x, y, n, ang, turn, step, pull, k) { const p = [[x, y]]; for (let i = 0; i < n; i++) { ang += (r() - 0.5) * turn; if (pull != null) ang += (pull - ang) * (k || 0.15); x += Math.cos(ang) * step; y += Math.sin(ang) * step; p.push([x, y]); } return p; }
function rast(pts) {
  const out = [], seen = new Set();
  for (let i = 0; i + 1 < pts.length; i++) { let x0 = Math.round(pts[i][0]), y0 = Math.round(pts[i][1]); const x1 = Math.round(pts[i + 1][0]), y1 = Math.round(pts[i + 1][1]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { const k = y0 * W + x0; if (!seen.has(k)) { seen.add(k); out.push([x0, y0]); } if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } }
  return out;
}
const clip = (m, px, k) => { const o = []; for (const q of px) { if (!deep(m, q[0], q[1], k)) break; o.push(q); } return o; };
// a floor seam: one row that wanders ±1 around y0 from x0 to x1
function seamPath(seed, x0, x1, y0) { const r = X.rng(seed), p = []; let y = y0; for (let x = x0; x <= x1; x++) { if (r() < 0.22) y = clamp(y + (r() < 0.5 ? -1 : 1), y0 - 1, y0 + 1); p.push([x, y]); } return p; }
// loose bits (soil, clay, stone chips) that fall, bounce once and vanish: kept in the slot's state, drawn into the current layer
// o.sz 2: a 2×1 chunk (its right half a step darker) instead of a single grain
function spill(st, x, y, n, m, tn, o) { const a = st.bits || (st.bits = []); o = o || NO; for (let i = 0; i < n && a.length < 48; i++) { const ang = (o.ang || 0) + (R() - 0.5) * (o.spread == null ? 2 : o.spread), sp = (o.sp == null ? 20 : o.sp) * (0.4 + R() * 0.8); a.push({ x: x + (R() - 0.5) * (o.w || 0), y, vx: Math.sin(ang) * sp, vy: -Math.cos(ang) * sp, t: 0, life: (o.life || 1.2) * (o.lj === 0 ? 1 : 0.7 + R() * 0.6), fl: o.floor == null ? y + 20 : o.floor, m, tn: tn + Math.round((R() - 0.5) * 2), sz: o.sz || 1, e: o.e }); } }
function bits(D, st, t) { const a = st.bits; if (!a || !a.length) { st.bt = t; return; } const dt = clamp(t - (st.bt == null ? t : st.bt), 0, 0.1); st.bt = t;
  for (let i = a.length - 1; i >= 0; i--) { const c = a[i]; c.t += dt; if (c.t > c.life) { a.splice(i, 1); continue; } c.vy += 150 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y > c.fl) { c.y = c.fl; c.vy *= -0.3; c.vx *= 0.5; }
    const o = c.e ? { e: c.e } : NO; D.px(c.x, c.y, c.m, c.tn, o); if (c.sz > 1) D.px(c.x + 1, c.y, c.m, c.tn - 1, o); } }
// the cell sits in dark rock: its own ground falls off toward the lens's top, left and right edges (and a little toward the
// bottom) in whole steps, so the terrain's lights make pools instead of one flat bright slab
function lensAO(S, m, reach, amt, bot) {
  const run = (x, y, dx, dy) => { for (let k = 1; k <= reach; k++) if (!inM(m, x + dx * k, y + dy * k)) return k - 1; return reach; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!m[y * W + x]) continue; const k = Math.min(run(x, y, 0, -1), run(x, y, -1, 0), run(x, y, 1, 0)), kb = run(x, y, 0, 1);
    const v = amt * Math.pow(1 - k / reach, 2) + (bot || 0) * Math.pow(1 - kb / reach, 2); if (v >= 0.5) S.tone(x, y, -Math.round(v)); }
}
// a four-point twinkle of strength a (0…1) in ramp m: the PK glint is lamp-yellow, cold things twinkle in their own colour
function twinkle(D, x, y, a, m) { if (a <= 0.05) return; const o = { e: 255 }; D.px(x, y, 'linen', a > 0.6 ? 11 : 10, o); if (a > 0.3) [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([i, j]) => D.px(x + i, y + j, m, 9, o)); if (a > 0.75) [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([i, j]) => D.px(x + i, y + j, m, 7, o)); }
const blink = (t, per, off, w) => { const q = steps(t + off, per); return q < (w || 0.12) ? Math.sin(q / (w || 0.12) * Math.PI) : 0; };
// a glowing dome swelling out of a liquid surface at row y (bubble), radius rr
function dome(D, x, y, rr, m, t0) { for (let j = 0; j <= rr; j++) { const hw = Math.round(Math.sqrt(Math.max(0, rr * rr - j * j))); for (let i = -hw; i <= hw; i++) D.px(x + i, y - j, m, j === rr || Math.abs(i) === hw ? t0 + 1 : t0, { e: 255 }); } if (rr > 1) D.px(x - Math.round(rr / 2), y - rr + 1, m, t0 + 2, { e: 255 }); }

// ───────── 地热 geo ─────────
// basalt columns fanned out over a magma chamber; round the chamber the rock is a crust of plates whose seams glow, hotter
// nearer the melt; jagged cracks carry pulses of heat up the columns, crust drifts on the melt, bubbles swell and pop, a
// sulfur-crusted vent breathes steam; every 9 s the chamber heaves and bursts (sparks, heat races up every crack)
const GEO = (() => {
  const r = X.rng(4011), m = blob(401, { bite: [[11, 10, 13], [139, 9, 12], [10, 95, 14], [140, 96, 13]], keep: [[124, 64, 13, 11], [75, 84, 31, 9]] }), C = { x: 75, y: 80, rx: 28, ry: 10, s: 78 };
  const ch = (x, y) => { const u = (x + 0.5 - C.x) / C.rx, v = (y + 0.5 - C.y) / C.ry; return u * u + v * v; };
  const fan = (x, y) => 75 + (x - 75) / (1 + 0.3 * Math.max(0, 64 - y) / 64);   // column coordinate before the fan
  const cols = []; for (let x = -40; x < W + 40;) { const w = 6 + Math.floor(r() * 4), bot = 50 + Math.floor(r() * 12), js = []; for (let y = 1 + Math.floor(r() * 10); y < bot - 6; y += 7 + Math.floor(r() * 11)) js.push(y); cols.push({ x, w, t: 3 + Math.floor(r() * 2.2), bot, js }); x += w; }
  const seeds = []; for (let i = 0; i < 64; i++) seeds.push([18 + r() * 114, 50 + r() * 52]);
  // cracks climb the column joints (magma intrudes along them), stepping sideways along a cross-joint now and then
  const unfan = (x0, y) => Math.round(75 + (x0 - 75) * (1 + 0.3 * Math.max(0, 64 - y) / 64));
  const cr = (ci, y0, n, e, side) => { const pts = []; let c = ci, y = y0, j = 0; while (pts.length < n && c > 0 && c < cols.length - 1) { const q = cols[c], x0 = q.x + q.w - 1; if (r() < 0.12) j = j ? 0 : (r() < 0.5 ? -1 : 1); pts.push([unfan(x0, y) + j, y]); y--; if (y < 2) break;
      if (q.js.includes(y) && r() < 0.6) { const c2 = c + side * (r() < 0.75 ? 1 : -1), x2 = cols[c2].x + cols[c2].w - 1; for (let k = 1; k <= 3; k++) pts.push([unfan(x0 + (x2 - x0) * k / 3, y), y]); c = c2; } }
    return { p: clip(m, rast(pts), 3), e }; };
  const ci = (x) => cols.findIndex(q => x >= q.x && x < q.x + q.w);
  const cracks = [cr(ci(58), 60, 60, 2, -1), cr(ci(92), 59, 60, 3, 1), cr(ci(75), 58, 34, 2, -1), cr(ci(66), 44, 22, 2, 1), cr(ci(104), 40, 20, 3, 1)];
  const plates = [0, 1, 2, 3].map(i => ({ x: i * 14 + r() * 6, w: 4 + Math.floor(r() * 4), v: 1.1 + r() * 1.3 }));
  const vent = [124, 60];
  const seam = [[6, 46], [54, 98], [106, 144]].map(([a, b], i) => seamPath(4020 + i, a, b, 97));
  return { m, C, ch, fan, cols, seeds, cracks, plates, vent, seam };
})();
X.def('_tile_geo', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const G = GEO, C = G.C, m = G.m, r = S.r;
    sc.light({ x: C.x, y: C.y - 3, z: 16, r: 70, i: 1, c: '#ff7a3a', fl: 'fire', tint: 0.4 });                            // 0 the magma chamber (its melt glows with it)
    sc.light({ x: 56, y: 38, z: 10, r: 34, i: 1, c: '#ff6a2a', fl: 'pulse', amp: 0.4, sp: 1.1, tint: 0.22 });              // 1 cracks, left
    sc.light({ x: 96, y: 36, z: 10, r: 34, i: 1, c: '#ff6a2a', fl: 'pulse', amp: 0.4, sp: 1.1, ph: 2.2, tint: 0.22 });     // 2 cracks, right
    sc.light({ x: C.x, y: C.y - 6, z: 20, r: 78, i: 0.4, c: '#ff7a3a', tint: 0.2 });                                      // 3 steady heat from the chamber
    S.lay('wall');
    // basalt columns, fanned: a lit facet with a bright arris, a middle facet, a shade facet; dark joints; bowed cross-joints
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const x0 = G.fan(x, y), c = G.cols.find(q => x0 >= q.x && x0 < q.x + q.w); if (!c) continue; const f = (x0 - c.x) / c.w;
      if (y >= c.bot) { S.px(x, y, 'iron', 3 + Math.round((nz(x, y, 3.5, 405) - 0.5) * 2.4)); continue; }
      const jy = c.js.find(j => { const b = j + Math.round(Math.sin(f * Math.PI) * 1.2); return y === b || y === b + 1; }), jb = jy != null && y === jy + Math.round(Math.sin(f * Math.PI) * 1.2);
      if (f > 0.86 || y === c.bot - 1) S.px(x, y, 'iron', 1);
      else if (jy != null) S.px(x, y, 'iron', jb ? 1 : c.t + 2, jb ? NO : { n: [0, -0.7] });
      else S.px(x, y, 'iron', f < 0.3 ? c.t + 1 : f < 0.38 ? c.t + 2 : f < 0.66 ? c.t : c.t - 1, { n: [f < 0.38 ? -0.55 : f < 0.66 ? 0 : 0.5, 0] }); }
    for (let i = 0; i < 70; i++) { const x = Math.floor(r() * W), y = 52 + Math.floor(r() * 48), x0 = G.fan(x, y), c = G.cols.find(q => x0 >= q.x && x0 < q.x + q.w); if (!c || y <= c.bot + 1) continue; S.px(x, y, 'iron', 1); S.px(x, y + 1, 'iron', 5); }
    // the crust round the chamber: Voronoi plates, red-hot rims and glowing seams near the melt, cold dark seams further out
    for (let y = 48; y < H; y++) for (let x = 14; x < 136; x++) { const d = Math.sqrt(G.ch(x, y)); if (d < 1.1 || d > 2.05 + (nz(x, y, 7, 408) - 0.5) * 0.7) continue;
      let d1 = 1e9, d2 = 1e9, s1 = null; G.seeds.forEach(s => { const q = Math.hypot(x + 0.5 - s[0], (y + 0.5 - s[1]) * 1.3); if (q < d1) { d2 = d1; d1 = q; s1 = s; } else if (q < d2) d2 = q; });
      const g = d2 - d1, hf = clamp((2.0 - d) / 0.9, 0, 1), up = ((x - s1[0]) * -0.6 + (y - s1[1]) * -0.8) > 0;
      if (g < 1.1) { if (hf > 0.12) S.px(x, y, 'fire', 4 + Math.round(hf * 4.4), { e: 1 }); else S.px(x, y, 'iron', 1); }
      else if (g < 2.3 && hf > 0.35) S.px(x, y, 'brick', up ? 5 : 4);
      else S.px(x, y, 'iron', 3 + (g < 2.6 ? (up ? 1 : -1) : 0) + (hf > 0.6 ? 0 : 0), { n: g < 2.6 ? (up ? [-0.4, -0.6] : [0.3, 0.5]) : [0, 0] }); }
    // the chamber: dark air over the melt; the melt in three fixed hard bands whose borders roll slowly (always lit at their
    // own tone: a flickering light over a broad glow would dither it), only the skin row breathes with the chamber's fire
    for (let y = 60; y < H; y++) for (let x = 40; x < 110; x++) { const d = G.ch(x, y);
      if (d < 1) { if (y < C.s) S.px(x, y, 'rock', y < C.s - 4 ? 2 : 3); else { const k = y - C.s, b1 = 2 + Math.round(Math.sin(x * 0.21 + 1) * 0.9), b2 = 6 + Math.round(Math.sin(x * 0.12 + 2.2) * 1.4);
        if (k === 0) S.px(x, y, 'fire', 10, { e: 1 }); else S.px(x, y, 'fire', k <= b1 ? 9 : k <= b2 ? 8 : 7, { e: 255 }); } }
      else if (d < 1.2) S.px(x, y, y < C.s ? 'iron' : 'fire', y < C.s ? 1 : 4, y < C.s ? NO : { e: 255 }); }
    // jagged cracks up the columns: red-hot rock, a glowing edge, a core that thins and dims as it climbs
    G.cracks.forEach(c => { const P = c.p, n = P.length;
      P.forEach(([x, y], k) => { if (k / n > 0.8) return; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([i, j]) => { if (S.at(x + i, y + j) !== MI.fire) S.px(x + i, y + j, 'brick', 4); }); });
      P.forEach(([x, y], k) => { const q = k / n; if (q < 0.55) [[1, 0], [-1, 0]].forEach(([i, j]) => { if (S.at(x + i, y + j) !== MI.fire || q < 0.2) S.px(x + i, y + j, 'fire', 4 + (q < 0.2 ? 1 : 0), { e: c.e }); }); S.px(x, y, 'fire', q < 0.3 ? 9 : q < 0.6 ? 8 : q < 0.85 ? 6 : 5, { e: c.e }); }); });
    // the vent: a squat chimney of crusted rock, a dark mouth with heat inside, sulfur grown round the lip and running down
    const [vx, vy] = G.vent; S.lay('back'); S.beg();
    S.poly([[vx - 10, vy + 13], [vx - 5, vy], [vx + 5, vy], [vx + 10, vy + 13]], 'rock', 7);
    for (let y = vy; y < vy + 13; y++) for (let x = vx - 10; x <= vx + 10; x++) { if (S.at(x, y) !== MI.rock) continue; const n = nz(x, y, 2.5, 409), e = S.at(x - 1, y) !== MI.rock; S.px(x, y, 'rock', e ? 9 : 7 + (n > 0.62 ? 1 : n < 0.36 ? -1 : 0) - (x > vx + 3 ? 2 : 0), { n: [x < vx ? -0.4 : 0.4, 0] }); }
    for (let y = vy - 2; y <= vy + 4; y++) for (let x = vx - 7; x <= vx + 7; x++) { const n = nz(x, y, 1.8, 410), d = Math.abs(x - vx) / 7 + Math.max(0, y - vy) / 5; if (n < 0.3 + d * 0.35 || (y < vy && Math.abs(x - vx) > 5)) continue; S.px(x, y, 'gold', nz(x, y - 1, 1.8, 410) < 0.3 + d * 0.35 ? 9 : n > 0.6 ? 7 : 6); }
    S.ell(vx, vy, 3.2, 1.2, 'ink', 0); S.hl(vx - 1, vy + 1, 3, 'fire', 6, { e: 1 }); S.px(vx, vy, 'fire', 7, { e: 1 });
    S.end(); S.lay('wall');
    rim(S, m, 4, { boulders: 12 });
    sc.emit({ k: 'ember', x: C.x, y: C.s - 1, w: 44, rate: 1.4, sp: 5, ang: 0, spread: 0.8, life: 2.4 });
    sc.emit({ k: 'steam', x: vx, y: vy - 3, rate: 1.2, sp: 5, ang: 0.1, spread: 0.5, life: 1.8 });
  },
  anim(D, t, rs) {
    const st = rs.st, G = GEO, C = G.C, x0 = 49, x1 = 101; D.lay('wall');
    // the melt's skin: crest glints and drifting crust plates
    for (let x = x0; x <= x1; x++) { if (G.ch(x, C.s) >= 1) continue; if (Math.sin(x * 0.55 - t * 2.1) + Math.sin(x * 0.23 + t * 1.3) > 1.2) D.px(x, C.s, 'fire', 11, { e: 255 }); }
    G.plates.forEach(p => { const span = x1 - x0 - 6, q = ((p.x + t * p.v) % span + span) % span, x = x0 + 3 + Math.floor(q), w = Math.max(0, Math.min(p.w, Math.floor(q), Math.floor(span - q) - 1)); if (w < 2) return;
      D.hl(x, C.s, w, 'iron', 3); if (w > 2) D.hl(x + 1, C.s + 1, w - 2, 'iron', 2); D.px(x - 1, C.s, 'fire', 10, { e: 255 }); D.px(x + w, C.s, 'fire', 10, { e: 255 }); });
    // bubbles swell and pop
    for (let i = 0; i < 3; i++) { const q = (t + i * 0.53) / 1.4, c = Math.floor(q), k = q - c, bx = 55 + Math.floor(hh(c * 3 + i) * 40);
      if (k < 0.6) dome(D, bx, C.s, Math.round(k / 0.6 * 2.2), 'fire', 9); else if (st['b' + i] !== c) { st['b' + i] = c; rs.burst('ember', bx, C.s - 2, 2, { sp: 10, ang: 0, spread: 1.2, life: 1.2 }); } }
    // the moment: a big bubble heaves up and bursts; heat races up every crack
    const mp = steps(t, 9);
    if (mp < 0.13) dome(D, 75, C.s, Math.round(mp / 0.13 * 5), 'fire', 9);
    else if (mp < 0.3 && !st.burp) { st.burp = 1; st.bt0 = t; rs.burst('spark', 75, C.s - 4, 16, { sp: 46, ang: 0, spread: 1.3, life: 0.9, floor: C.s }); rs.burst('ember', 75, C.s - 3, 10, { sp: 16, ang: 0, spread: 1.6, life: 2.2, w: 8 }); rs.flash(0, 1.1); rs.flash(1, 0.7); rs.flash(2, 0.7); }
    if (mp > 0.5) st.burp = 0;
    G.cracks.forEach((c, ci) => { const P = c.p, n = P.length; if (!n) return; const hs = [(t * 13 + ci * 9) % (n + 30)]; if (st.bt0 != null && t - st.bt0 < 2) hs.push((t - st.bt0) * 46);
      hs.forEach(hd => { for (let k = 0; k < 4; k++) { const i = Math.floor(hd) - k; if (i >= 0 && i < n) D.px(P[i][0], P[i][1], 'fire', 11 - k, { e: 255 }); } }); });
    // the vent coughs now and then
    if (steps(t + 3, 6.5) < 0.03 && !st.puff) { st.puff = 1; rs.burst('steam', G.vent[0], G.vent[1] - 3, 7, { sp: 12, ang: 0.1, spread: 0.5, life: 2.2, w: 3 }); } if (steps(t + 3, 6.5) > 0.3) st.puff = 0;
  },
});
X.TILEF.geo = (D, t, rs) => {
  GEO.seam.forEach((P, si) => { const n = P.length, hd = (t * 22 + si * 37) % (n + 40);
    for (let i = 0; i < n; i++) { const x = P[i][0], y = P[i][1], d = Math.abs(i - hd); D.px(x, y - 1, 'rock', 2); D.px(x, y, 'fire', d < 1 ? 11 : d < 3 ? 9 : 6 + ((x * 7) % 3 === 0 ? 1 : 0), { e: 255 }); if ((x * 13) % 5 < 2) D.px(x, y + 1, 'brick', 5); } });
  if (R() < 0.012) { const P = GEO.seam[Math.floor(R() * 3)], q = P[Math.floor(R() * P.length)]; rs.burst('ember', q[0], q[1] - 1, 1, { sp: 6, ang: 0, spread: 0.6, life: 1.4 }); }
};

// ───────── 化石层 fossil ─────────
// sediment beds (siltstone, shale partings, cross-bedded sandstone, limestone, a pebble bed, a shell bed) broken by a small
// fault; in them only sea-floor invertebrates and plants (the bones belong to the dragon and the barrow cells): an ammonite
// whose nacre shimmers in turning colours, a fern frond pressed into the siltstone with pyrite glinting along its stem, a
// trilobite, a crinoid stem, scallops and a tower shell. The ammonite and the fern light warm pools; the beds fall off into
// the dark rock at the edges. Sand trickles out of the fault, dust hangs in the air, glints wake on the fossils; every 10 s
// a flake of rock drops off above the trilobite and the ammonite flares
// the ammonite is a tube coiled round (cx, cy): its suture is the spiral AS(u) (radius after u turns, starting at angle a0 and
// turning clockwise on screen), U turns in all; the last whorl ends at the aperture, back at angle a0. Every pixel knows its
// whorl w (−1 inside the first turn), where it lies across the tube (f: 0 at the inner suture, 1 at the outer edge), its
// angle and its outward direction; sut is the suture as one continuous one-pixel line from the centre out to the aperture
const AS = (u) => 1 + 3.4 * u + 0.45 * u * u;
function ammoniteGeo(cx, cy, U, a0) {
  const out = [], R = AS(U), TAU = 2 * Math.PI;
  for (let y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R + 1); y++) for (let x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy); if (d > R + 0.5) continue;
    const ph = Math.atan2(dy, dx), u0 = (((ph - a0) % TAU) + TAU) % TAU / TAU; let k = -1;
    while (u0 + k + 1 <= U && AS(u0 + k + 1) <= d) k++;
    if (u0 + k + 1 > U) continue;   // past the last whorl
    const ri = k < 0 ? 0 : AS(u0 + k), ro = AS(u0 + k + 1);
    out.push({ x, y, w: k, f: (d - ri) / (ro - ri), ph, d, ux: d > 0.01 ? dx / d : 0, uy: d > 0.01 ? dy / d : 0, u: u0 + k });
  }
  // the suture, sampled finely and thinned to a clean line (no doubled corner pixels)
  const sut = []; for (let u = 0; u <= U - 1; u += 0.0015) { const r = AS(u), a = a0 + u * TAU, q = [Math.floor(cx + Math.cos(a) * r), Math.floor(cy + Math.sin(a) * r)], l = sut[sut.length - 1];
    if (l && l[0] === q[0] && l[1] === q[1]) continue; sut.push(q); const n = sut.length; if (n >= 3 && Math.abs(sut[n - 3][0] - q[0]) === 1 && Math.abs(sut[n - 3][1] - q[1]) === 1) sut.splice(n - 2, 1); }
  return { px: out, sut };
}
// a fern frond pressed into the rock as a carbon film: a stem curving from base b through c to tip e, slim leaflets
// alternating left and right along it, each angled toward the tip with rock showing between them (a feather of strokes, so
// it reads as a frond), longest a little above the base, small at the tip
function fernGeo(b, c, e) {
  const at = (s) => [(1 - s) * (1 - s) * b[0] + 2 * (1 - s) * s * c[0] + s * s * e[0], (1 - s) * (1 - s) * b[1] + 2 * (1 - s) * s * c[1] + s * s * e[1]];
  const tan = (s) => { const dx = 2 * (1 - s) * (c[0] - b[0]) + 2 * s * (e[0] - c[0]), dy = 2 * (1 - s) * (c[1] - b[1]) + 2 * s * (e[1] - c[1]), l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  const stem = []; for (let i = 0; i <= 60; i++) stem.push(at(i / 60)); const rachis = rast(stem);
  const leaf = new Map(), n = 26;
  for (let k = 0; k < n; k++) { const s = 0.05 + k / (n - 1) * 0.88, P = at(s), T = tan(s), side = k % 2 ? 1 : -1, a = side * 0.85, D = [T[0] * Math.cos(a) - T[1] * Math.sin(a), T[0] * Math.sin(a) + T[1] * Math.cos(a)];
    const L = 1.5 + 8.5 * Math.pow(1 - s, 0.85) * Math.min(1, 0.35 + s * 5), px = rast([[P[0] + D[0] * 1.2, P[1] + D[1] * 1.2], [P[0] + D[0] * L, P[1] + D[1] * L]]);
    px.forEach(([x, y], i) => { const q = y * W + x; if (!leaf.has(q)) leaf.set(q, { x, y, tip: i > px.length * 0.6 }); if (i < px.length * 0.55 && L > 4) { const x2 = Math.round(x + T[0]), y2 = Math.round(y + T[1]), q2 = y2 * W + x2; if (!leaf.has(q2)) leaf.set(q2, { x: x2, y: y2, lo: 1 }); } }); }
  return { rachis, leaf: [...leaf.values()], pyr: rachis.filter((_, i) => i % 7 === 3 && i < rachis.length - 6) };
}
const FOS = (() => {
  // the shells along the bottom bed [x, y] and the tower shell [base, apex]; the rim stays off them and off the crinoid stem
  const shells = [[24, 85, 4], [49, 87, 4], [75, 85, 4], [97, 86, 4], [111, 86, 5], [122, 83, 3]];
  const m = blob(501, { bite: [[12, 10, 13], [138, 11, 14], [11, 94, 13], [139, 95, 12]], keep: [[70, 15, 15, 6], ...shells.map(([x, y, r]) => [x, y, r + 3, r + 1])] });
  // beds kept a step or two down: the cell's light is the ammonite's and the fern's pools, not a bright slab
  const beds = [[0, 'paper', 3], [12, 'earth', 3], [15, 'sand', 4], [27, 'bone', 4], [30, 'paper', 3], [64, 'earth', 3], [67, 'bone', 3], [79, 'sand', 2], [82, 'sand', 3]];
  const fx = (y) => 121 + y * 0.16;
  const fold = (x) => Math.sin(x * 0.035 - 1) * 6 + Math.sin(x * 0.07 + 1.3) * 1.2 + (vnoise(x / 13, 0.5, 503) - 0.5) * 3;   // the beds arch into a low fold: no bed line runs straight across
  const bedAt = (x, y) => { const yy = y + Math.round(fold(x)) - (x > fx(y) ? 5 : 0); let k = 0; for (let i = 0; i < beds.length; i++) if (yy >= beds[i][0]) k = i; return { k, yy }; };
  // the ammonite: three turns, the aperture to the lower right. Each pixel's shade: the tube lit from the upper left, so every
  // whorl has its bright ridge on the side that faces up-left and steps out from the one inside it
  const AM = ammoniteGeo(40, 47, 3, 0.45), amm = AM.px, LX = -0.6, LY = -0.62, LZ = 0.5;
  amm.forEach(p => { const nr = (p.f * 2 - 1) * 0.9; p.sh = nr * (p.ux * LX + p.uy * LY) + Math.sqrt(1 - nr * nr) * LZ; });
  // the nacre: pearly sheen on the body whorl (the band of light turns over these); a few small clusters of it catch the light
  // at rest — pale bone, one pixel of teal, gold or lavender in each
  const nacre = amm.filter(p => p.w === 1 && p.f > 0.18 && p.f < 0.9);
  const adist = (a, b) => Math.abs(((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  // (tones sit a little under the look they end with: the ammonite's own light lifts them one to two steps)
  const pearl = []; [[0.95, 'teal', 5], [1.9, 'gold', 5], [2.9, 'lav', 6], [3.8, 'teal', 5], [4.75, 'gold', 5], [5.7, 'lav', 6]].forEach(([a, m, tn]) => {
    const c = nacre.filter(p => adist(p.ph, a) * p.d < 1.3 && p.f > 0.35 && p.f < 0.72).sort((q, r) => r.sh - q.sh).slice(0, 4);
    c.forEach((p, i) => pearl.push({ x: p.x, y: p.y, ph: p.ph, m: i === 1 ? m : 'bone', tn: i === 1 ? tn : i === 0 ? 7 : 6 })); });
  const fern = fernGeo([60, 56], [80, 44], [105, 37]);
  const glints = [[36, 36], [30, 54], [70, 52], [88, 41], [112, 47], [97, 85], [24, 84]];
  // the flake that drops in the moment: a notch in the siltstone above the trilobite
  const notch = [[115, 36], [116, 36], [117, 36], [114, 37], [115, 37], [116, 37], [117, 37], [118, 37], [115, 38], [116, 38], [117, 38]];
  const ring = [0, 1, 2, 3, 4, 5, 6].map(i => { const a = i / 7 * Math.PI * 2 - 1.2; return [Math.round(40 + Math.cos(a) * 18), Math.round(47 + Math.sin(a) * 17)]; });
  const seam = seamPath(5020, 6, 144, 97);
  return { m, beds, fx, fold, bedAt, amm, sut: AM.sut, nacre, pearl, fern, shells, glints, notch, ring, seam };
})();
// trilobite, head up, a dark fossil in the pale siltstone: a half-round head shield with a raised glabella and two eyes,
// genal spines sweeping back, a bright one-pixel axis between dark furrows, seven thoracic segments in alternating tones,
// a small tail shield
const TRILO = ['...hhHHHhh...', '.hHHhgGghhhh.', 'hHhhgGGGghhhh', 'hehhgGggghheh', 'hhhhhgggghhhh', 's.PPPdAdPPP.s', 's.qqqdadqqq.s', 's.PPPdAdPPP.s', '.sqqqdadqqqs.', '..PPPdAdPPP..', '..qqqdadqqq..', '...PPdAdPP...', '...yydadyy...', '....yyAyy....', '.....yyy.....'];
const TRILP = { h: ['mstone', 4, { n: [0, -0.4] }], H: ['mstone', 6, { n: [-0.5, -0.6] }], g: ['mstone', 5, { n: [0, -0.5] }], G: ['mstone', 7, { n: [-0.4, -0.6] }], e: ['mstone', 1], s: ['mstone', 7, { n: [-0.4, -0.4] }], P: ['mstone', 5, { n: [0, -0.4] }], q: ['mstone', 2], A: ['mstone', 8], a: ['mstone', 7], d: ['mstone', 1], y: ['mstone', 4] };
X.def('_tile_fossil', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const F = FOS, m = F.m, r = S.r;
    sc.light({ x: 40, y: 47, z: 14, r: 52, i: 1.1, c: '#ffe2a8', fl: 'pulse', amp: 0.35, sp: 0.9, tint: 0.3 });              // 0 the ammonite's nacre: a warm pool round it
    sc.light({ x: 84, y: 44, z: 18, r: 34, i: 0.6, c: '#ffd9a0', fl: 'pulse', amp: 0.4, sp: 0.6, ph: 2, tint: 0.25 });    // 1 the fern's pyrite (and its e:2 specks): a soft pool that leaves the film dark
    sc.light({ x: 80, y: 50, z: 30, r: 90, i: 0.12, c: '#fff0d0', tint: 0.1 });                                        // 2 a faint fill
    sc.light({ x: 116, y: 41, z: 10, r: 28, i: 1, c: '#ffe8c0', bake: false, tint: 0.3 });                             // 3 the moment: light on the falling flake (off otherwise)
    S.lay('wall');
    // the beds: each its own material, a lit top row and a dark bottom row, clustered grain
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const { k, yy } = F.bedAt(x, y), b = F.beds[k], top = yy - b[0], bot = (k + 1 < F.beds.length ? F.beds[k + 1][0] : 999) - 1 - yy;
      S.px(x, y, b[1], b[2] + (top === 0 ? 1 : bot === 0 ? -1 : 0) + Math.round((nz(x, y, 5, 504 + k) - 0.5) * 2.2)); }
    // cross-bedding in the sandstone, pebbles in the conglomerate, shell hash in the lowest bed
    for (let i = 0; i < 9; i++) { const x0 = 10 + i * 15 + r() * 4; for (let k = 0; k < 12; k++) { const x = x0 + k, y = 17 + Math.round(k * 0.7 - F.fold(x)), b = F.bedAt(x, y); if (b.k === 2) S.px(x, y, 'sand', 4); } }
    for (let i = 0; i < 26; i++) { const x = 8 + r() * 134, y = 68 + r() * 11; if (F.bedAt(x, y).k !== 6) continue; S.beg(); S.ell(x, y, 1.2 + r() * 1.4, 1 + r() * 0.8, r() < 0.5 ? 'rock' : 'mstone', 6 + Math.round(r() * 2), { dome: 1 }); S.end(); }
    for (let i = 0; i < 18; i++) { const x = 8 + r() * 134, y = 85 + r() * 12; if (F.bedAt(x, y).k !== 8) continue; S.px(x, y, 'bone', 7); S.px(x + 1, y - 1, 'bone', 6); S.px(x + 2, y, 'bone', 5); }
    // fine lamination in the thick beds: broken wavy lines a step darker
    for (let y = 2; y < H; y++) for (let x = 0; x < W; x++) { const { k, yy } = F.bedAt(x, y), b = F.beds[k], nb = k + 1 < F.beds.length ? F.beds[k + 1][0] : 999; if (nb - b[0] < 10 || (yy - b[0]) % 5 !== 3 || nb - yy < 3 || vnoise(x / 7, yy / 5, 505) < 0.42) continue; S.tone(x, y, -1); }
    // the fault: a dark slip line with a lit edge, and a little sand fan where it leaks
    for (let y = 0; y < H; y++) { const x = Math.round(F.fx(y)); S.px(x, y, 'earth', 1); S.px(x - 1, y, 'paper', 6); }
    S.beg(); S.poly([[123, 48], [129, 48], [126, 44]], 'sand', 6); S.hl(124, 48, 5, 'sand', 4); S.end();
    // the scar the flake falls from: a shallow notch, a shade under its lip
    F.notch.forEach(([x, y]) => S.tone(x, y, -1)); S.hl(115, 36, 3, 'paper', 2);
    lensAO(S, m, 10, 2.4, 1);
    // ammonite: the coiled tube in bone, lit from the upper left (each whorl's ridge on its up-left side), fine ribs across
    // the outer two whorls, a small knob at the centre; the suture one dark line spiralling out from it; pearl clusters
    S.lay('back'); S.beg();
    F.amm.forEach(p => { if (p.d < 1.2) { S.px(p.x, p.y, 'bone', 6); return; }
      const sh = p.sh; let tn = (p.w < 1 ? 2 : 3) + (sh > 0.85 ? 3 : sh > 0.62 ? 2 : sh > 0.38 ? 1 : sh > 0.08 ? 0 : sh > -0.25 ? -1 : -2);
      if (p.w >= 0 && p.f > 0.25 && p.f < 0.95) { const nr = p.w === 1 ? 20 : 14, per = 2 * Math.PI * p.d / nr, q = (p.u * nr) % 1; if (q * per < 1) tn += 1; }
      S.px(p.x, p.y, 'bone', tn); });
    F.sut.forEach(([x, y]) => S.px(x, y, 'bone', 0));
    F.pearl.forEach(q => S.px(q.x, q.y, q.m, q.tn));
    S.end();
    // the fern frond: a carbon film pressed into the siltstone — dark leaflets with a faint vein, a stem with a lit lip under
    // it where the rock was pressed in, pyrite specks along the stem glowing with the fern's light
    // (the film is the dark 'hair' ramp: its short top end keeps it dark however much the fern's light lifts it)
    F.fern.leaf.forEach(q => S.px(q.x, q.y, 'hair', q.tip ? 2 : q.lo ? 0 : 1));
    F.fern.rachis.forEach(([x, y], i, a) => { const thick = i < a.length * 0.55; S.px(x, y, 'hair', 0); if (thick) S.px(x, y + 1, 'hair', 1); if (S.at(x, y + (thick ? 2 : 1)) !== MI.hair) S.px(x, y + (thick ? 2 : 1), 'paper', 5); });
    F.fern.pyr.forEach(([x, y]) => S.px(x, y, 'gold', 6, { e: 2 }));
    // trilobite in the siltstone beside the fern's tip
    S.beg(); S.spr(106, 44, TRILO, TRILP); S.end();
    // scallops along the shell bed (ribbed fans, a lit rim along the top, the hinge dark), a crinoid stem up in the sandstone
    F.shells.forEach(([x, y, a]) => { const b = Math.round(a * 0.75); S.beg(); S.poly([[x - a, y + 1], [x - a + 1, y - b + 1], [x - 1, y - b], [x + 2, y - b], [x + a, y - b + 2], [x + a, y + 1], [x + 1, y + 2], [x - 1, y + 2]], 'bone', 7, { n: [-0.3, -0.5] });
      for (let k = -a + 1; k <= a - 1; k += 2) S.line(x, y + 2, x + k, y - b + 1, 'bone', 5); S.hl(x - a + 2, y - b, a * 2 - 3, 'bone', 9); S.hl(x - 1, y + 2, 3, 'bone', 4); S.end(); });
    S.beg(); for (let k = 0; k < 9; k++) { const x = 58 + k * 2.6, y = 11 + k * 0.9; S.rect(x, y, 2, 3, 'bone', 7 + (k % 2)); S.px(x + 1, y + 2, 'bone', 5); } S.end();
    rim(S, m, 5, { boulders: 12 });
    sc.emit({ k: 'dust', x: 80, y: 50, w: 110, h: 70, rate: 1.1, sp: 2, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, F = FOS, age = st.ft != null ? t - st.ft : 99;
    // the nacre shimmer: a narrow band of light turns round the body whorl — a pale core on the tube's lit side, a teal edge
    // leading and gold / lavender trailing — and the pearl clusters it passes change colour; in the moment a second, wider
    // band races once round the whorl
    D.lay('back'); const TAU = 2 * Math.PI, ths = (t * 0.8) % TAU, E = { e: 255 };
    const band = (p, a, w) => { let d = p.ph - a; d -= Math.round(d / TAU) * TAU; const k = d / w;
      if (Math.abs(k) < 0.4) { if (p.sh > 0.05) D.px(p.x, p.y, 'bone', p.sh > 0.5 ? 10 : 9, E); }
      else if (Math.abs(k) < 1 && p.sh > 0.3) D.px(p.x, p.y, k > 0 ? 'teal' : p.f > 0.55 ? 'gold' : 'lav', 9, E); };
    F.nacre.forEach(p => band(p, ths, 0.22));
    const HUE = { teal: 'gold', gold: 'lav', lav: 'teal' };
    F.pearl.forEach(q => { let d = q.ph - ths; d -= Math.round(d / TAU) * TAU; if (q.m !== 'bone' && d < 0 && d > -1.2) D.px(q.x, q.y, HUE[q.m], 9, E); else if (q.m === 'bone' && Math.abs(d) < 0.3) D.px(q.x, q.y, 'bone', 10, E); });
    if (age < 0.7) { const a = ths + age / 0.7 * TAU; F.nacre.forEach(p => band(p, a, 0.5)); }
    if (age < 1.1) F.ring.forEach(([x, y], i) => { const k = (age - i * 0.07) / 0.6; if (k > 0 && k < 1) twinkle(D, x, y, Math.sin(k * Math.PI), 'gold'); });
    // sand trickles out of the fault
    D.lay('wall'); for (let k = 0; k < 7; k++) { const q = (t * 1.1 + k / 7) % 1, x = 124 + (k % 2), y = 30 + Math.round(q * q * 17); D.px(x, y, 'sand', q < 0.5 ? 9 : 8); }
    // glints wake on the fossils
    if (steps(t, 2.3) < 0.03 && !st.g) { st.g = 1; const q = F.glints[Math.floor(R() * F.glints.length)]; rs.burst('glint', q[0], q[1], 1, { sp: 0, life: 0.7 }); } if (steps(t, 2.3) > 0.2) st.g = 0;
    // the moment: a flake breaks off above the trilobite (a lit burst of pale and dark chips, dust in the light), the scar
    // shows dark and slowly weathers back; the ammonite flares
    const mp = steps(t, 10);
    if (mp < 0.02 && !st.m) { st.m = 1; st.ft = t;
      // the chips drop straight on down the face and out of the cell (none of them comes to rest on the rock)
      spill(st, 117, 37, 5, 'bone', 9, { sp: 34, ang: 2.75, spread: 0.6, floor: 140, life: 0.9, lj: 0, sz: 2, w: 4 }); spill(st, 117, 37, 5, 'rock', 2, { sp: 30, ang: 2.8, spread: 0.7, floor: 140, life: 0.9, lj: 0, sz: 2, w: 4 });
      rs.burst('dust', 116, 40, 8, { sp: 9, life: 2, w: 8, h: 4 }); rs.burst('glint', 40, 42, 2, { sp: 12, life: 0.6 }); rs.flash(0, 0.6); }
    if (mp > 0.3) st.m = 0;
    rs.mul[3] = age < 0.08 ? age / 0.08 : Math.max(0, 1 - (age - 0.08) / 1.8);
    if (age < 7) { const k = age < 0.1 ? 3 : Math.max(0, Math.round(3 * (1 - (age - 0.6) / 6))); if (k) F.notch.forEach(([x, y]) => { const b = F.beds[F.bedAt(x, y).k]; D.px(x, y, b[1], b[2] - 1 - k + (y === 38 ? 1 : 0)); }); if (k) D.hl(115, 39, 3, 'paper', 6); }
    D.lay('mid'); bits(D, st, t);
  },
});
X.TILEF.fossil = (D, t, rs) => {
  // a pale bed line with bits of shell and crinoid stem in it; a glint hops from bit to bit
  const P = FOS.seam, hop = Math.floor(t / 1.3);
  for (let i = 0; i < P.length; i++) { const [x, y] = P[i]; if ((x * 7) % 23 < 15) D.px(x, y, 'paper', 6 + ((x * 3) % 4 === 0 ? 1 : 0)); }
  for (let k = 0; k < 9; k++) { const x = 12 + k * 16 + (k * 5) % 7, y = 97; if (k % 3 === 0) { D.px(x, y - 1, 'bone', 8); D.px(x + 1, y - 1, 'bone', 9); D.px(x + 2, y, 'bone', 7); D.px(x + 1, y, 'bone', 3); D.px(x, y, 'bone', 7); }
    else if (k % 3 === 1) { for (let i = 0; i < 5; i++) D.px(x + i, y, 'bone', i % 2 ? 6 : 8); D.hl(x, y + 1, 5, 'bone', 4); } else { D.px(x, y - 1, 'bone', 9); D.hl(x - 1, y, 3, 'bone', 7); }
    if (hop % 9 === k && (t % 1.3) < 0.5) D.px(x + 1, y - 1, 'linen', 11, { e: 255 }); }
};

// ───────── 陶土层 clay ─────────
// thick clay beds bowed into a trough (terracotta, ochre, a blue-grey gley band); in them three clay guards: one bust with
// glowing eyes, one head peeping out lower down, one hand still gripping a bronze spear. Water seeps from the gley band,
// a wet sheen slides along it, the spearhead glints; every 10 s the big guard's eyes flare and glance, and clay crumbles
// off its shoulder
const CLAY = (() => {
  // the rim stays off the side-turned guard, the spearhead, the small guard's head and the amphora
  const m = blob(601, { bite: [[9, 12, 12], [140, 10, 13], [10, 96, 13], [141, 97, 12]], keep: [[34, 22, 12, 12], [117, 16, 5, 9], [32, 78, 10, 9], [126, 83, 10, 12]] });
  const beds = [[0, 'brick', 5], [12, 'sand', 5], [16, 'brick', 7], [29, 'stone', 4], [34, 'brick', 7], [55, 'brick', 5], [59, 'leather', 6], [76, 'stone', 3], [80, 'brick', 6]];
  const sag = (x) => Math.round(6 * (1 - Math.pow((x - 75) / 75, 2)));
  const bedAt = (x, y) => { const yy = y - sag(x) + Math.round((vnoise(x / 16, 0.5, 603) - 0.5) * 3); let k = 0; for (let i = 0; i < beds.length; i++) if (yy >= beds[i][0]) k = i; return { k, yy }; };
  const gley = (x) => 29 + sag(x) - Math.round((vnoise(x / 16, 0.5, 603) - 0.5) * 3);   // top row of the gley band at x
  const seam = seamPath(6020, 6, 144, 97);
  const crack = rast([[97, 29], [95, 26], [96, 23], [93, 20], [94, 17], [91, 14]]).concat(rast([[96, 23], [100, 21], [101, 18]]));
  return { m, beds, sag, bedAt, gley, seam, crack };
})();
// a terracotta guard, head centre (cx, cy): hair cap with a topknot, deep brows over eye sockets whose eyes glow (e), a strong
// nose, a curled moustache; a red scarf, lamellar armour of big plates laced in red
function guard(S, cx, cy, e) {
  const mt = 'mstone'; S.beg();
  S.poly([[cx - 17, cy + 30], [cx - 16, cy + 18], [cx - 12, cy + 13], [cx - 6, cy + 10], [cx + 6, cy + 10], [cx + 12, cy + 13], [cx + 16, cy + 18], [cx + 17, cy + 30]], mt, 4);
  for (let j = 0; j < 5; j++) for (let i = -4; i <= 3; i++) { const x = cx + i * 4 + (j % 2 ? 2 : 0), y = cy + 13 + j * 4; if (Math.abs(x + 1 - cx) > Math.min(15, 5 + j * 4)) continue; S.rect(x, y, 3, 3, mt, 7 - (x > cx + 4 ? 1 : 0)); S.hl(x, y, 3, mt, 9); S.px(x + 1, y + 3, 'crimson', 5); }
  S.ell(cx - 14, cy + 15, 3.5, 3, mt, 7, { dome: 1 }); S.ell(cx + 14, cy + 15, 3.5, 3, mt, 6, { dome: 1 });
  S.rect(cx - 6, cy + 9, 13, 3, 'crimson', 5); S.hl(cx - 6, cy + 9, 13, 'crimson', 7); S.hl(cx - 6, cy + 11, 13, 'crimson', 3);
  S.rect(cx - 3, cy + 6, 7, 4, mt, 6); S.vl(cx + 3, cy + 6, 4, mt, 4);
  S.ell(cx, cy, 6.5, 8, mt, 8, { dome: 1 });
  for (let y = cy - 8; y <= cy - 3; y++) for (let x = cx - 7; x <= cx + 7; x++) { const u = (x + 0.5 - cx) / 7, v = (y + 0.5 - cy) / 8.4; if (u * u + v * v > 1) continue; S.px(x, y, mt, (x - cx) % 3 === 0 ? 4 : 6, { n: [u * 0.5, -0.5] }); }
  S.ell(cx + 5, cy - 9, 2.6, 2.2, mt, 6, { dome: 1 }); S.hl(cx + 3, cy - 8, 5, 'crimson', 5);
  S.hl(cx - 6, cy - 3, 13, mt, 4); S.rect(cx - 8, cy - 1, 2, 4, mt, 7); S.rect(cx + 7, cy - 1, 2, 4, mt, 5);
  S.hl(cx - 5, cy - 1, 4, mt, 3); S.hl(cx + 2, cy - 1, 4, mt, 3);
  S.rect(cx - 5, cy, 4, 2, mt, 3); S.rect(cx + 2, cy, 4, 2, mt, 3);
  S.rect(cx - 4, cy + 1, 2, 1, 'lamp', 9, { e }); S.rect(cx + 3, cy + 1, 2, 1, 'lamp', 9, { e });
  S.vl(cx, cy, 5, mt, 10); S.vl(cx + 1, cy + 1, 4, mt, 5); S.px(cx - 1, cy + 4, mt, 5); S.px(cx + 1, cy + 5, mt, 3);
  S.px(cx - 4, cy + 5, mt, 3); S.hl(cx - 3, cy + 6, 3, mt, 3); S.hl(cx + 1, cy + 6, 3, mt, 3); S.px(cx + 4, cy + 5, mt, 3); S.hl(cx - 1, cy + 8, 3, mt, 5);
  S.end();
}
// a guard's head in profile, facing right, sprite top-left (x, y): a topknot tied in red jutting from the back, combed hair
// cap, an ear, a dark brow over one glowing 2×1 eye (e), a nose standing out two pixels, moustache, mouth, a clear chin
// and jaw line; a short neck below for the clay to cover
const GSIDE = ['.kkk...............', 'kKKkk..HHHHHH......', 'kKKkrrhhhhhhhhh....', '.kkkrjjjjjjjjjhh...', '....hhhhhhhhhhhhh..', '...hjjjjjjjjjjhsSs.', '...hhhhhhhhhhsSSs..', '...hjjjjjjjhsSSss..', '...hhhhhhhsssbbbbs.', '...hjjjheeesssEEs..', '...hhhhseiessssssn.', '...hhhdseeesssssNnn', '...hhddsssssssxddd.', '....dddsssssmmmmm..', '.....ddssssssmoo...', '......ddsssssSSss..', '.......ddsssssss...', '........ddddddd....', '........ddddd......', '.......rrrrrrr.....', '......rrrrrrrrr....'];
function guardSide(S, x, y, e) {
  const mt = 'mstone', P = { k: [mt, 6, { n: [-0.5, -0.6] }], K: [mt, 4], r: ['crimson', 5], H: [mt, 7, { n: [0, -0.8] }], h: [mt, 5, { n: [0, -0.5] }], j: [mt, 3], s: [mt, 7], S: [mt, 9, { n: [0.3, -0.7] }], d: [mt, 5], b: [mt, 2], E: ['lamp', 9, { e }],
    e: [mt, 6], i: [mt, 3], n: [mt, 7, { n: [0.6, -0.3] }], N: [mt, 9, { n: [0.4, -0.6] }], x: [mt, 3], m: [mt, 3], o: [mt, 2] };
  S.beg(); S.spr(x, y, GSIDE, P); S.end();
}
// clay over the lower part of a buried thing: repaint the bed's own pixels on this layer below a lumpy line (never above lo)
function bury(S, x0, x1, y0, y1, seed, lo) { for (let x = x0; x <= x1; x++) { const top = Math.max(lo == null ? -99 : lo, y0 + Math.round((vnoise(x / 4, 0.5, seed) - 0.5) * 5)); for (let y = top; y <= y1; y++) { const { k, yy } = CLAY.bedAt(x, y), b = CLAY.beds[k]; S.px(x, y, b[1], b[2] + (y === top ? 1 : 0) + Math.round((nz(x, y, 8, 604 + k) - 0.5) * 2)); } } }
X.def('_tile_clay', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const C = CLAY, m = C.m, r = S.r;
    sc.light({ x: 96, y: 43, z: 14, r: 42, i: 1.1, c: '#ffa050', fl: 'pulse', amp: 0.4, sp: 0.8, tint: 0.3 });         // 0 the big guard's eyes: the warm pool at the heart of the cell
    sc.light({ x: 32, y: 82, z: 8, r: 22, i: 1, c: '#ffa050', fl: 'pulse', amp: 0.4, sp: 0.8, ph: 2.5, tint: 0.35 });  // 1 the small guard's eyes
    sc.light({ x: 75, y: 45, z: 30, r: 95, i: 0.12, c: '#ffd8b0', tint: 0.12 });                                      // 2 a faint warm fill
    sc.light({ x: 39, y: 21, z: 6, r: 18, i: 1, c: '#ffa050', fl: 'pulse', amp: 0.4, sp: 0.8, ph: 4.4, tint: 0.3 });     // 3 the third guard's eye
    S.lay('wall');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const { k, yy } = C.bedAt(x, y), b = C.beds[k], top = yy - b[0], bot = (k + 1 < C.beds.length ? C.beds[k + 1][0] : 999) - 1 - yy;
      S.px(x, y, b[1], b[2] + (top === 0 ? 1 : bot === 0 ? -1 : 0) + Math.round((nz(x, y, 8, 604 + k) - 0.5) * 2)); }
    // wet sheen on the beds, a few pits, pottery shards
    for (let i = 0; i < 16; i++) { const x = 10 + r() * 130, y = 8 + r() * 88, l = 2 + Math.floor(r() * 5); for (let k = 0; k < l; k++) S.tone(x + k, y, 2); }
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; S.tone(x, y, -2); S.tone(x, y + 1, 1); }
    // pottery shards: thin curved slivers of fired clay, lit along their top edge
    [[22, 50, 6, 1], [60, 22, 5, -1], [66, 90, 7, 1], [132, 62, 5, -1], [48, 72, 4, 1]].forEach(([x, y, l, d]) => { for (let k = 0; k < l; k++) { const yy = y + Math.round(Math.abs(k - l / 2) * 0.4) * d; S.px(x + k, yy, 'brick', 10); S.px(x + k, yy + 1, 'brick', 7); if (k > 0 && k < l - 1) S.px(x + k, yy + 2, 'brick', 4); } });
    lensAO(S, m, 9, 2.2, 1);
    // the big guard's spear standing beside him: a bronze leaf blade, a red tassel
    S.lay('back'); S.beg(); S.vl(116, 22, 44, 'wood', 5); S.vl(117, 22, 44, 'wood', 3); S.poly([[116, 11], [119, 16], [118, 21], [115, 21], [114, 16]], 'brass', 7); S.vl(116, 12, 9, 'brass', 10); S.hl(114, 21, 5, 'brass', 5);
    S.rect(115, 22, 3, 3, 'crimson', 6); S.px(114, 25, 'crimson', 5); S.px(116, 26, 'crimson', 5); S.px(118, 25, 'crimson', 4); S.end();
    // a third guard, turned aside, buried to the chin in the upper beds
    guardSide(S, 24, 12, 4); bury(S, 21, 47, 31, 37, 611, 30);   // the clay covers the neck, the jaw line stays clear
    // the big guard, buried to the chest; the small one to the nose
    guard(S, 96, 40, 1); bury(S, 76, 116, 64, 74, 612);
    guard(S, 32, 80, 2); bury(S, 12, 52, 84, 104, 613);
    // an amphora standing half in the clay: round belly, a neck with a rolled lip, two handles, a painted band, a crack
    const ax = 126; S.beg(); S.ell(ax, 84, 7.5, 8.5, 'brick', 8, { dome: 1 }); S.rect(ax - 2, 71, 5, 6, 'brick', 7); S.rect(ax - 3, 70, 7, 2, 'brick', 9); S.hl(ax - 3, 72, 7, 'brick', 5);
    S.line(ax - 3, 73, ax - 7, 75, 'brick', 6); S.line(ax - 7, 75, ax - 6, 79, 'brick', 6); S.line(ax + 3, 73, ax + 7, 75, 'brick', 5); S.line(ax + 7, 75, ax + 6, 79, 'brick', 5);
    for (let x = ax - 6; x < ax + 7; x++) { S.px(x, 81 + ((x >> 1) % 2), 'ink', 2); S.px(x, 79, 'brick', 5); } S.line(ax + 3, 77, ax + 1, 86, 'brick', 4); S.px(ax - 4, 78, 'brick', 10); S.px(ax - 3, 77, 'brick', 9); S.end();
    bury(S, ax - 11, ax + 13, 89, 99, 614);
    unmask(S, m, 0, 0, W - 1, H - 1);
    lensAO(S, m, 9, 2.2, 1);   // the buried things fall off into the rock with the beds
    rim(S, m, 6, { boulders: 12 });
  },
  anim(D, t, rs) {
    const st = rs.st, C = CLAY;
    // the wet sheen slides along the gley band
    D.lay('wall'); const sx = Math.round(14 + ((t * 7) % 122)), sy = C.gley(sx); [[0, 9], [-1, 7], [1, 7]].forEach(([i, tn]) => { if (deep(C.m, sx + i, sy, 1)) D.px(sx + i, sy, 'stone', tn); });
    // water seeps from the gley band and drips down to the next bed
    // water seeps out under the gley band and creeps down the clay, leaving a dark wet trail behind a bright bead
    [[24, 4.2, 0], [58, 5.1, 1.7], [131, 4.6, 3.1]].forEach(([x, p, o]) => { const q = steps(t + o, p), y0 = C.gley(x) + 5, len = Math.floor(q * 18); if (q > 0.92) return;
      for (let k = 0; k < len; k++) { if (!deep(C.m, x, y0 + k, 1)) return; const { k: bk } = C.bedAt(x, y0 + k), b = C.beds[bk]; D.px(x, y0 + k, b[1], b[2] - 2); } D.px(x, y0 + len, 'water', 9, { e: 255 }); D.px(x, y0 + len - 1, 'water', 7, { e: 255 }); });
    // the spearhead glints
    if (steps(t, 4.1) < 0.03 && !st.g) { st.g = 1; rs.burst('glint', 116, 14, 1, { sp: 0, life: 0.7 }); } if (steps(t, 4.1) > 0.2) st.g = 0;
    // the moment: the big guard's eyes flare, glance left and right; clay crumbles off its shoulder
    const mp = steps(t, 10), on = mp < 0.16; D.lay('back');
    if (on) { const g = mp < 0.05 ? 0 : mp < 0.1 ? -1 : 1, hot = mp > 0.015 && mp < 0.12;
      [92, 99].forEach(x => { if (hot) { D.hl(x - 1, 40, 4, 'lamp', 7, { e: 255 }); D.hl(x - 1, 42, 4, 'lamp', 6, { e: 255 }); D.px(x - 2, 41, 'lamp', 6, { e: 255 }); D.px(x + 3, 41, 'lamp', 6, { e: 255 }); }
        D.px(x + (g < 0 ? 0 : 1), 41, 'lamp', 11, { e: 255 }); D.px(x + (g < 0 ? 1 : 0), 41, 'lamp', g ? 9 : 11, { e: 255 }); });
      // the clay over its head splits as it stirs
      D.lay('wall'); const n = Math.min(CLAY.crack.length, Math.floor(mp / 0.06 * CLAY.crack.length)); for (let i = 0; i < n; i++) { const [x, y] = CLAY.crack[i]; D.px(x, y, 'brick', 2); D.px(x + 1, y, 'brick', 10); } D.lay('back'); }
    if (on && !st.m) { st.m = 1; rs.flash(0, 1.6); spill(st, 110, 55, 8, 'mstone', 7, { sp: 12, ang: 0.6, spread: 1.4, floor: 66, life: 1.3 }); spill(st, 82, 55, 6, 'mstone', 7, { sp: 12, ang: -0.6, spread: 1.4, floor: 66, life: 1.3 }); rs.burst('dust', 110, 57, 5, { sp: 6, life: 1.6, w: 5 }); rs.burst('dust', 82, 57, 4, { sp: 6, life: 1.6, w: 5 }); }
    if (mp > 0.4) st.m = 0;
    bits(D, st, t);
  },
});
X.TILEF.clay = (D, t, rs) => {
  // a terracotta band with pottery shards in it; a wet gleam slides along
  const P = CLAY.seam, gx = 6 + ((t * 9) % 150);
  for (let i = 0; i < P.length; i++) { const [x, y] = P[i]; D.px(x, y, 'brick', 8 + ((x * 5) % 7 === 0 ? 1 : 0)); D.px(x, y + 1, 'brick', 3); if (Math.abs(x - gx) < 1.5) D.px(x, y, 'brick', 10); }
  for (let k = 0; k < 7; k++) { const x = 14 + k * 20 + (k * 7) % 9; D.hl(x, 95, 5, 'brick', 10); D.hl(x, 96, 5, 'brick', 9); D.px(x + 5, 96, 'brick', 5); }
};

// ───────── 古遗迹 ruin ─────────
// a buried temple front in sandstone: a frieze of glyphs inlaid in gold that light one after another, a sealed stone door
// under an arch with a sun sigil and light leaking round its seams, a broken column and its fallen capital, a toppled drum,
// dust hanging in the glow; every 9 s the sun sigil kindles ray by ray and flashes, and every glyph answers
const RUIN = (() => {
  const m = blob(701, { bite: [[12, 9, 13], [139, 10, 12], [11, 96, 12], [140, 95, 14]], keep: [[75, 60, 26, 34]] }), cx = 75, ay = 48, ri = 14, ro = 21;
  const seam = []; for (let y = 88; y > ay; y--) seam.push([cx - ri - 1, y]); for (let k = 0; k <= 44; k++) { const a = Math.PI + k / 44 * Math.PI, q = [Math.round(cx + Math.cos(a) * (ri + 0.5)), Math.round(ay + Math.sin(a) * (ri + 0.5))], l = seam[seam.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) seam.push(q); } for (let y = ay + 1; y <= 88; y++) seam.push([cx + ri + 1, y]);
  const G = ['1110110101', '0111010111', '1011101101', '1101011011', '0110111110', '1111001011', '1010111101', '0101110111', '1110101110'];
  const glyphs = []; for (let x = 17, i = 0; x < 132; x += 13, i++) glyphs.push({ x, bits: G[i % G.length] });
  const seamF = seamPath(7020, 6, 144, 97);
  // rock and rubble the temple is buried in: lumpy masses over the corners and down the left side
  const fillB = [[4, 4, 30, 22], [0, 62, 24, 30], [150, 0, 22, 16], [146, 56, 12, 26], [36, 104, 30, 10], [104, 104, 24, 8]];
  const fill = (x, y) => fillB.some(([bx, by, a, b]) => { const u = (x - bx) / a, v = (y - by) / b; return u * u + v * v + (vnoise(x / 6, y / 6, 703) - 0.5) * 0.9 < 1; });
  const lit = glyphs.filter(g => !fill(g.x + 2, 18) && deep(m, g.x + 2, 18, 3));   // the glyphs the rock has not buried: only these light up
  return { m, cx, ay, ri, ro, seam, glyphs, lit, seamF, fill };
})();
const glyphPx = (g, f) => { for (let k = 0; k < 10; k++) if (g.bits[k] === '1') f(g.x + (k % 5), 16 + Math.floor(k / 5) * 2 + (k % 2)); };
X.def('_tile_ruin', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const U = RUIN, m = U.m, r = S.r, cx = U.cx, ay = U.ay;
    sc.light({ x: cx, y: 64, z: 12, r: 58, i: 1, c: '#e8c070', fl: 'pulse', amp: 0.15, sp: 1.1, tint: 0.3 });       // 0 light behind the door
    sc.light({ x: cx, y: 16, z: 4, r: 1, i: 1, fl: 'pulse', amp: 0.45, sp: 0.9 });                                   // 1 drives the glyph inlay
    sc.light({ x: cx, y: 62, z: 16, r: 30, i: 1, c: '#ffe08a', fl: 'pulse', amp: 0.18, sp: 1.7, ph: 1, tint: 0.3 });  // 2 the sun sigil
    S.lay('wall');
    // the wall: dressed sandstone, some blocks fallen out (rock behind), cracks
    TX.ashlar(S, 0, 0, W, H, 'sand', 5, { bh: 9, bw: 16, crack: 0.25 }); S.noise(0, 0, W, H, 1, 6, 702);
    // holes where blocks fell out: a recess (the overhang's shadow along the top, a shaded left jamb, a lit right one, rubbly
    // rock at the back, a bright sill), and the fallen bits lodged below
    const hr = X.rng(712); [[22, 30, 12, 8], [118, 58, 10, 9], [34, 60, 9, 7]].forEach(([x, y, w, h], hi) => {
      const cs = []; for (let k = 0; k < 3 + Math.round(w / 4); k++) cs.push([x + 1 + hr() * (w - 2), y + 2 + hr() * (h - 3), 6 + Math.floor(hr() * 3)]);   // the rubble core behind the fallen block
      for (let j = 0; j < h - 1; j++) for (let i = 0; i < w; i++) { const px = x + i + 0.5, py = y + j + 0.5; let d1 = 1e9, d2 = 1e9, c1 = null; cs.forEach(c => { const d = Math.hypot(px - c[0], (py - c[1]) * 1.4); if (d < d1) { d2 = d1; d1 = d; c1 = c; } else if (d < d2) d2 = d; });
        const u = px - c1[0] + (py - c1[1]); let tn = d2 - d1 < 0.9 ? 2 : c1[2] + (u < -1.2 ? 1 : u > 1.2 ? -1 : 0);
        if (j === 0) tn = 1; else if (j === 1) tn = Math.min(tn, 2); else if (i === 0) tn = Math.min(tn, 3);
        if (i === w - 1 && j > 0) S.px(x + i, y + j, 'sand', j === 1 ? 3 : 5, { n: [-0.7, 0] }); else S.px(x + i, y + j, 'rock', tn); }
      S.hl(x, y + h - 1, w, 'sand', 7, { n: [0, -0.8] }); S.hl(x, y + h, w, 'sand', 3);                                                                   // the sill
      [[0.22, 2, 3], [0.7, 4, 2]].forEach(([u, dy, a]) => { const bx = x + Math.round(u * w + (hr() - 0.5) * 2), by = y + h + dy;   // bits of the block, lodged below
        S.lay('back'); S.beg(); S.hl(bx + 1, by, a - 1, 'sand', 7, { n: [0, -0.7] }); S.hl(bx, by + 1, a, 'sand', 5); S.px(bx + 1, by, 'sand', 9); S.end(); S.lay('wall'); }); });
    // the door: a stone double door, bands in relief, the sun sigil; its seams let the light out
    for (let y = ay - U.ri; y <= 88; y++) for (let x = cx - U.ri; x <= cx + U.ri; x++) { if (y < ay && Math.hypot(x + 0.5 - cx, y + 0.5 - ay) > U.ri) continue; S.px(x, y, 'stone', (y - ay) % 10 === 4 ? 6 : (y - ay) % 10 === 5 ? 3 : 4, { n: (y - ay) % 10 === 4 ? [0, -0.6] : [0, 0] }); }
    S.vl(cx, ay - U.ri, 88 - ay + U.ri, 'gold', 8, { e: 1 });
    U.seam.forEach(([x, y]) => S.px(x, y, 'gold', 8, { e: 1 }));
    S.ell(cx, 62, 6.4, 6.4, 'gold', 6, { ring: 1.3, e: 3 }); S.ell(cx, 62, 2.6, 2.6, 'gold', 8, { e: 3 }); S.px(cx - 1, 61, 'gold', 10, { e: 3 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; S.line(cx + Math.cos(a) * 8, 62 + Math.sin(a) * 8, cx + Math.cos(a) * 10, 62 + Math.sin(a) * 10, 'gold', 5, { e: 3 }); }
    // the arch: voussoirs round the door, a keystone with a gold boss; jambs of stacked blocks
    S.lay('back'); S.beg();
    for (let y = ay - U.ro; y <= ay; y++) for (let x = cx - U.ro; x <= cx + U.ro; x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - ay); if (d <= U.ri + 1.5 || d > U.ro) continue; const a = Math.atan2(y + 0.5 - ay, x + 0.5 - cx), seg = Math.floor((a + Math.PI) / (Math.PI / 9)), jt = Math.abs(((a + Math.PI) / (Math.PI / 9)) - Math.round((a + Math.PI) / (Math.PI / 9))) < 0.09;
      S.px(x, y, 'sand', jt ? 3 : (seg % 2 ? 7 : 6) + (d > U.ro - 1.2 ? 1 : 0) - (d < U.ri + 2.5 ? 1 : 0), { n: [(x - cx) / d * 0.5, (y - ay) / d * 0.5] }); }
    S.box(cx - 3, ay - U.ro - 1, 7, 8, 'sand', 8); S.rect(cx - 1, ay - U.ro + 2, 3, 3, 'gold', 8, { e: 3 });
    [cx - U.ro, cx + U.ri + 2].forEach(x => { for (let y = ay; y < 88; y += 7) S.box(x, y, 7 - (x > cx ? 0 : 0), Math.min(7, 88 - y), 'sand', 6 + ((y / 7) % 2)); });
    S.end();
    // the frieze: a moulded band, glyph cartouches with gold inlay (glowing with light 1)
    S.beg(); S.box(9, 13, 132, 11, 'sand', 6); S.hl(9, 12, 132, 'sand', 8, { n: [0, -0.8] }); S.hl(9, 24, 132, 'sand', 3);
    U.glyphs.forEach(g => { S.rect(g.x - 1, 15, 7, 7, 'sand', 3); glyphPx(g, (x, y) => S.px(x, y, 'gold', 6, { e: 2 })); });
    S.end();
    for (let x = 9; x < 141; x++) if (x < 14 || x > 136) for (let y = 12; y < 25; y++) if (vnoise(x / 3, y / 3, 705) > 0.45) S.px(x, y, 'rock', 4);   // broken ends
    // steps before the door
    S.lay('mid'); S.beg(); S.box(cx - 22, 88, 45, 3, 'sand', 7, { top: 1 }); S.box(cx - 26, 91, 53, 4, 'sand', 6, { top: 1 }); S.end();
    // the broken column on the right, its capital fallen at its foot; a toppled drum and rubble on the left
    S.beg(); S.cyl(112, 30, 10, 58, 'sand', 7, { rim: 2 }); for (let x = 114; x < 121; x += 2) S.vl(x, 32, 55, 'sand', 5); S.box(110, 86, 14, 3, 'sand', 6); S.poly([[112, 30], [114, 26], [116, 29], [119, 24], [122, 30]], 'sand', 7); S.end();
    S.beg(); S.box(124, 81, 14, 6, 'sand', 7, { top: 2 }); S.ell(125, 84, 2.4, 2.4, 'sand', 8, { ring: 1 }); S.ell(137, 84, 2.4, 2.4, 'sand', 8, { ring: 1 }); S.hl(124, 87, 14, 'sand', 4); S.end();
    S.beg(); S.hcyl(14, 80, 28, 10, 'sand', 7, { rim: 2 }); for (let y = 82; y < 89; y += 2) S.hl(15, y, 26, 'sand', 5); S.ell(42, 85, 2.5, 5, 'sand', 8); S.ell(42, 85, 1, 2.4, 'sand', 6); S.end();
    // a spill of gold coins and a toppled cup at the foot of the steps
    S.beg(); [[56, 93], [59, 94], [62, 93], [58, 92], [90, 94], [93, 93], [95, 94], [61, 91]].forEach(([x, y], i) => { S.hl(x, y, 2, 'gold', i % 3 ? 7 : 8); S.px(x, y - 1, 'gold', 9); }); S.end();
    S.beg(); S.poly([[98, 90], [104, 88], [105, 92], [99, 93]], 'gold', 6); S.hl(99, 90, 5, 'gold', 9); S.ell(98, 91, 1, 2, 'gold', 4); S.hl(104, 93, 3, 'gold', 5); S.end();
    for (let i = 0; i < 9; i++) { const x = 46 + r() * 8 + (i > 4 ? 60 : 0), s2 = 1.2 + r() * 2; S.beg(); S.ell(x, 93 - s2 * 0.4, s2, s2 * 0.7, i % 3 ? 'sand' : 'rock', 6 + Math.round(r()), { dome: 1 }); S.end(); }
    // the fill: rock over the masonry wherever the temple is still buried, a lit lip where it overhangs, shadow under it
    const inF = (x, y) => x >= 0 && y >= 0 && x < W && y < H && U.fill(x, y);
    ['back', 'mid'].forEach(k => { S.lay(k); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inF(x, y) || !m[y * W + x]) S.px(x, y, 0, 0); });
    S.lay('wall'); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (inF(x, y)) S.px(x, y, 'rock', rockTone(x, y, 7) + 1 + (!inF(x, y - 1) ? 3 : !inF(x, y + 1) ? -2 : 0)); else if (inF(x, y - 1) || inF(x, y - 2)) S.tone(x, y, -2); else if (inF(x - 1, y)) S.tone(x, y, -1); }
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, rr = 1.5 + r() * 2.5; if (!inF(Math.round(x - rr), Math.round(y)) || !inF(Math.round(x + rr), Math.round(y)) || !inF(Math.round(x), Math.round(y + rr))) continue; S.beg(); S.ell(x, y, rr, rr * 0.7, r() < 0.3 ? 'sand' : 'rock', r() < 0.3 ? 5 : 6 + Math.round(r() * 2), { dome: 1 }); S.end(); }
    rim(S, m, 7, { boulders: 11 });
    sc.emit({ k: 'dust', x: cx, y: 60, w: 36, h: 44, rate: 1.4, sp: 2, life: 3.2 });
  },
  anim(D, t, rs) {
    const st = rs.st, U = RUIN, cx = U.cx;
    // glyphs light one after another along the frieze
    D.lay('back'); const n = U.lit.length, k = Math.floor(t * 2.4) % (n + 3), mp = steps(t, 9), all = mp > 0.12 && mp < 0.2;
    U.lit.forEach((g, i) => { const tn = all ? 10 : i === k ? 10 : i === k - 1 ? 8 : 0; if (tn) glyphPx(g, (x, y) => { if (!U.fill(x, y) && inM(U.m, x, y)) D.px(x, y, 'gold', tn, { e: 255 }); }); });
    // a bright bead runs round the door seam
    D.lay('wall'); const L = U.seam.length, hd = (t * 18) % (L + 20); for (let j = 0; j < 5; j++) { const i = Math.floor(hd) - j; if (i >= 0 && i < L) D.px(U.seam[i][0], U.seam[i][1], 'gold', 11 - j * 0.6, { e: 255 }); }
    // the moment: the sun sigil kindles ray by ray, then flashes; every glyph answers
    if (mp < 0.12) { const lit = Math.floor(mp / 0.12 * 8); for (let q = 0; q <= lit && q < 8; q++) { const a = q / 8 * Math.PI * 2; D.line(cx + Math.cos(a) * 8, 62 + Math.sin(a) * 8, cx + Math.cos(a) * 10, 62 + Math.sin(a) * 10, 'gold', q === lit ? 11 : 9, { e: 255 }); } }
    if (mp >= 0.12 && mp < 0.3 && !st.m) { st.m = 1; rs.flash(2, 1.6); rs.flash(0, 0.9); rs.burst('glint', cx, 62, 5, { sp: 26, life: 0.6 }); rs.burst('dust', cx, 70, 8, { sp: 10, life: 2, w: 20, h: 10 }); }
    if (mp > 0.5) st.m = 0;
    if (steps(t, 3.7) < 0.03 && !st.g) { st.g = 1; const q = [[57, 92], [93, 93], [101, 89], [cx, 44]][Math.floor(R() * 4)]; rs.burst('glint', q[0], q[1], 1, { sp: 0, life: 0.7 }); } if (steps(t, 3.7) > 0.2) st.g = 0;
    if (mp >= 0.12 && mp < 0.22) { D.ell(cx, 62, 2.6, 2.6, 'gold', 11, { e: 255 }); for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2; D.line(cx + Math.cos(a) * 8, 62 + Math.sin(a) * 8, cx + Math.cos(a) * 11, 62 + Math.sin(a) * 11, 'gold', 10, { e: 255 }); } }
  },
});
X.TILEF.ruin = (D, t, rs) => {
  // a course of dressed stone with small gold plates set in it; the plates light one after another
  const P = RUIN.seamF, k = Math.floor(t * 2) % 12;
  for (let i = 0; i < P.length; i++) { const x = P[i][0]; if (x % 12 === 0) continue; D.px(x, 98, 'sand', 3); }
  for (let j = 0; j < 12; j++) { const x = 8 + j * 12; D.rect(x, 96, 4, 2, 'gold', 5); D.hl(x, 96, 4, 'gold', 7); if (j === k || j === k - 1) D.rect(x, 96, 4, 2, 'gold', j === k ? 10 : 8, { e: 255 }); }
};


// ───────── 地下泉 spring ─────────
// a wet limestone pocket: stalactites and flowstone over a pool of spring water that glows from below; water spills from a
// fissure in the wall, drops fall from the stalactite tips and ring the surface, bubbles rise, light wanders on the rock;
// every 8.5 s the spring surges up through the middle of the pool and throws a splash
const SPR = (() => {
  const m = blob(801, { bite: [[11, 10, 12], [139, 9, 13], [10, 95, 13], [140, 96, 12]], keep: [[28, 40, 5, 20]] }), S0 = 72;
  const top = (x) => { for (let y = 0; y < H; y++) if (inM(m, x, y)) return y; return 10; };
  const tites = [[20, 5, 3], [25, 10, 3], [66, 7, 3], [71, 14, 4], [77, 22, 5], [82, 9, 3], [88, 16, 4], [93, 6, 3], [128, 9, 3], [132, 5, 3], [45, 4, 2], [58, 6, 3]].map(([x, l, w]) => ({ x, y: top(x) - 1, l, w }));
  const drops = [1, 4, 6, 8].map((i, k) => ({ i, p: 3.1 + k * 0.9, o: k * 1.3 }));
  // the basin: the banks slope down into the pool from both walls, on under the water, and meet a rocky bed, so the water is
  // held in stone on every side (its skin ends against the banks, never at the cell's edge); the line is lumpy, never ruled
  const bump = (x) => (vnoise(x / 5, 0.5, 812) - 0.5) * 7 + (vnoise(x / 2, 0.5, 813) - 0.5) * 2;
  const edge = (x) => Math.min(50 + (x - 2) * 0.95 + Math.max(0, x - 24) * 1.2, 48 + (148 - x) * 0.9 + Math.max(0, 122 - x) * 1.2, 93 - Math.pow((x - 78) / 50, 2) * 14) + bump(x);
  const bank = (x, y) => y >= edge(x) + Math.round((vnoise(x / 3, y / 5, 809) - 0.5) * 2);
  const round3 = (x, y) => { for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10 && !inM(m, x + i, y + j)) return false; return true; };
  const WM = new Uint8Array(W * H); for (let y = S0; y < H; y++) for (let x = 0; x < W; x++) if (round3(x, y) && !bank(x, y)) WM[y * W + x] = 1;   // never within 3 px of the rock
  const water = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < W && y < H && WM[y * W + x] === 1; };
  // flowstone curtains: round folds 3–5 px wide (a lit ridge on the left, a dark seam to the next fold), each its own tone,
  // hanging to its own rounded drip — neighbouring hems 2–4 px apart — with a bead of water under it; a fold may carry a
  // short growth ripple or two, each fold at its own heights
  const curtains = [[36, 62, 44, 806], [104, 122, 36, 807]].map(([x0, x1, bot, sd]) => { const r = X.rng(sd), folds = []; let x = x0, fi = 0, prev = null;
    while (x <= x1) { const w = 3 + Math.floor(r() * 3), a = x, b = Math.min(x1, x + w - 1), u = ((a + b) / 2 - x0) / (x1 - x0);
      let hem = Math.round(bot - Math.pow(Math.abs(u - 0.45) * 2, 2) * 14 - 3 + (fi % 2 ? -1 : 1) * (1 + r() * 1.5));
      if (prev != null) { const d = hem - prev, s = d >= 0 ? 1 : -1; if (Math.abs(d) < 2) hem = prev + s * 2; else if (Math.abs(d) > 4) hem = prev + s * 4; }
      const dash = [16 + Math.floor(r() * 7)]; if (hem - dash[0] > 14) dash.push(dash[0] + 7 + Math.floor(r() * 5));
      folds.push({ a, b, dt: Math.round((r() - 0.5) * 2.2), hem, g: u < 0.3 ? 1 : u > 0.7 ? -1 : 0, dash, dx: Math.floor(r() * 2) }); prev = hem; x = b + 1; fi++; }
    return { x0, x1, folds }; });
  // pale streaks in the top of the water: the curtains and the long stalactites mirrored, broken, on every other row
  const refl = []; curtains.forEach(c => c.folds.forEach(f => { if (f.b - f.a < 2) return; const x = f.a + 1; for (let y = S0 + 2; y <= S0 + 10; y += 2) if (hh(x * 7.1 + y) < 0.85 - (y - S0) * 0.05) refl.push([x, y, f.b - f.a > 3 ? 2 : 1, y > S0 + 6 ? 8 : 9]); }));
  tites.filter(q => q.l > 12).forEach(q => { for (let y = S0 + 2; y <= S0 + 2 + Math.round(q.l * 0.4); y += 2) refl.push([q.x, y, 1, 9]); });
  // rocks standing out of the water at both ends: x, radius, height above the waterline
  const rocks = [[33, 4.6, 4.4], [43, 2.6, 2.2], [107, 2.8, 2.4], [117, 5, 4.6]];
  return { m, S0, tites, drops, edge, bank, water, curtains, refl, rocks };
})();
X.def('_tile_spring', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const P = SPR, m = P.m, S0 = P.S0;
    sc.light({ x: 75, y: 80, z: 14, r: 86, i: 1, c: '#6fd0ff', fl: 'pulse', amp: 0.12, sp: 1.2, tint: 0.1 });        // 0 the pool (a light tint: never a hard cyan dome)
    sc.light({ x: 28, y: 40, z: 8, r: 26, i: 1, c: '#9ad8f6', fl: 'pulse', amp: 0.45, sp: 2, tint: 0.12 });          // 1 the fissure
    sc.light({ x: 82, y: 68, z: 10, r: 36, i: 1, c: '#bfeeff', tint: 0, bake: false });                                 // 2 the surge: off, kicked in the moment (untinted)
    // caustics: light off the water wanders on the rock above it
    sc.field({ x0: 18, y0: 34, x1: 132, y1: S0, lay: 'wall', fn: (x, y, t) => { const k = (y - 34) / (S0 - 34), a = Math.abs(Math.sin(x * 0.21 + t * 1.2 + Math.sin(y * 0.2 - t * 0.8) * 2)), b = Math.abs(Math.sin(y * 0.31 - t * 1.0 + Math.sin(x * 0.12 + t * 0.6) * 1.8)); return Math.max(0, 0.24 - Math.min(a, b)) * 5 * k * k; } });
    S.lay('wall');
    // wet cave rock: dark blue-grey with clustered grain, darker low down
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.px(x, y, 'stone', 3 + Math.round((nz(x, y, 5, 802) - 0.5) * 2.4) + (y > 58 ? -1 : 0));
    // flowstone: pale curtains poured down the wall. Each fold is round: a lit ridge on its left, its body, a one-pixel dark
    // seam before the next fold; its hem is a rounded drip (the middle hangs lowest, the seam stops short) with a bead of water
    // under it; a growth ripple or two, one or two pixels long, sits on the body of a fold at that fold's own height
    P.curtains.forEach(c => c.folds.forEach(f => { const w = f.b - f.a + 1, body = w - 1, cc = Math.floor(body / 2);
      for (let i = 0; i < w; i++) { const x = f.a + i, seam = i === w - 1, hem = seam ? f.hem - 3 : f.hem - Math.min(2, Math.abs(i - cc));
        const t0 = seam ? 2 : i === 0 ? 6 : i === 1 ? 5 : 4, n = [i === 0 ? -0.5 : seam ? 0.5 : 0, 0];
        for (let y = 10; y <= hem; y++) { if (!inM(m, x, y)) continue; let tn = t0 + f.dt + (seam ? 0 : f.g) - (y < 12 + (f.a * 7) % 5 ? 1 : 0);
          if (!seam && i > 0 && f.dash.some(d => y === d && (i === 1 + f.dx || (body > 3 && i === 2 + f.dx)))) tn -= 1;
          if (y === hem && !seam) tn -= i === cc ? 0 : 1;
          S.px(x, y, 'bone', tn, { n }); } }
      if (inM(m, f.a + cc, f.hem + 1)) S.px(f.a + cc, f.hem + 1, 'linen', 8); }));
    [[40, 22], [47, 30], [55, 25], [109, 24], [116, 30]].forEach(([x, y]) => S.px(x, y, 'glass', 8));
    // the fissure the spring comes out of
    for (let y = 22; y < 58; y++) { const x = 28 + Math.round(Math.sin(y * 0.3) * 1.2); S.px(x - 1, y, 'ink', 1); S.px(x, y, 'water', 9, { e: 2 }); S.px(x + 1, y, 'ink', 0); S.px(x + 2, y, 'stone', 5); }
    // the pool: glowing water with a dark line under its skin, darker as it deepens, a dark caustic net on the bottom,
    // boulders under it, pale shafts of light going down (its tones are fixed: the pool is the light, lights never dither it);
    // round it the basin's wet stone, lit where the water touches it
    for (let y = S0; y < H; y++) for (let x = 0; x < W; x++) { if (!inM(m, x, y)) continue; const k = y - S0;
      if (P.water(x, y)) { let tn = k === 0 ? 10 : k === 1 ? 5 : k < 5 ? 7 : k < 11 ? 6 : k < 17 ? 5 : 4; if (k > 11 && Math.min(Math.abs(Math.sin(x * 0.33 + Math.sin(y * 0.45) * 1.6)), Math.abs(Math.sin(y * 0.55 + Math.sin(x * 0.21) * 1.4))) < 0.2) tn -= 1;
        const gu = (x + 0.5 - 82) / 26, gv = (y + 0.5 - 88) / 13, g = gu * gu + gv * gv + (vnoise(x / 4, y / 4, 814) - 0.5) * 0.25; if (k > 1) tn += g < 0.3 ? 2 : g < 1 ? 1 : 0;   // the spring wells up bright from the bottom
        S.px(x, y, 'water', tn, { e: 255 }); }
      else { const lip = P.water(x, y - 1) || P.water(x - 1, y) || P.water(x + 1, y), lip2 = P.water(x, y - 2) || P.water(x - 2, y) || P.water(x + 2, y), n = nz(x, y, 3, 816);
        S.px(x, y, 'stone', lip ? 6 : lip2 ? 4 : 3 + (n > 0.64 ? 1 : n < 0.34 ? -1 : 0), lip ? { n: [0, -0.6] } : NO); if (lip && (x * 5 + y) % 7 === 0) S.px(x, y, 'glass', 8); } }
    [[50, 90, 6, 3], [71, 93, 8, 3], [98, 91, 7, 3]].forEach(([x, y, a, b]) => { for (let yy = y - b; yy <= y + b; yy++) for (let xx = x - a; xx <= x + a; xx++) { const u = (xx - x) / a, v = (yy - y) / b; if (u * u + v * v <= 1 && P.water(xx, yy)) S.px(xx, yy, 'water', 3 + (v < -0.5 ? 1 : 0), { e: 255 }); } });
    // boulders along the drowned banks break their line: wet stone, lit on top, half in the water
    [[29, 80, 4, 3], [35, 88, 4.5, 3.2], [120, 79, 4, 3], [114, 88, 4.5, 3.2]].forEach(([x, y, a, b]) => { for (let yy = Math.floor(y - b); yy <= y + b; yy++) for (let xx = Math.floor(x - a); xx <= x + a; xx++) { const u = (xx + 0.5 - x) / a, v = (yy + 0.5 - y) / b; if (u * u + v * v <= 1 && yy > S0 + 1 && inM(m, xx, yy)) S.px(xx, yy, 'stone', v < -0.55 ? 6 : u > 0.4 ? 3 : 5, { n: [u * 0.7, v * 0.7] }); } });
    for (let k = 0; k < 5; k++) for (let y = S0 + 3; y < S0 + 20; y++) { const x = 34 + k * 20 + Math.round((y - S0) * 0.35); if (P.water(x, y) && (y + k) % 5 !== 0) S.px(x, y, 'water', 8 - Math.floor((y - S0) / 7), { e: 255 }); }
    // banks: wet rock sloping into the pool from both walls (textured, a wet sheen along the top), a few stones on them
    for (let y = 40; y < S0; y++) for (let x = 0; x < W; x++) { if (!P.bank(x, y) || !inM(m, x, y)) continue; const top = !P.bank(x, y - 1), n = nz(x, y, 3, 808); S.px(x, y, 'stone', top ? 7 : 4 + (n > 0.62 ? 1 : n < 0.36 ? -1 : 0) + (P.bank(x, y - 3) ? 0 : 1), top ? { n: [0, -0.8] } : NO); if (top && (x * 5) % 7 === 0) S.px(x, y, 'glass', 8); }
    S.lay('back'); [[14, 2.6], [20, 2.2], [136, 2.8], [129, 2.2]].forEach(([x, a]) => { const y = Math.round(P.edge(x) - a * 0.5); S.beg(); S.ell(x, y, a, a * 0.7, 'stone', 5, { dome: 1 }); S.px(x - 1, y - 1, 'glass', 7); S.end(); });
    // rocks standing out of the water: wet tops, a dark shape under the surface
    P.rocks.forEach(([x, a, b]) => {
      S.beg(); for (let y = S0 - Math.round(b); y < S0; y++) for (let xx = Math.floor(x - a); xx <= Math.ceil(x + a); xx++) { const v = (S0 - 0.5 - y) / b, u = (xx + 0.5 - x) / a; if (u * u + v * v > 1) continue; const topRow = y === S0 - Math.round(b) || (S.at(xx, y - 1) !== MI.stone && S.at(xx, y - 1) !== MI.glass);
        S.px(xx, y, 'stone', topRow ? 8 : u < -0.3 ? 7 : u > 0.4 ? 4 : 6, { n: [u * 0.8, topRow ? -0.8 : -v * 0.6] }); if (topRow && u < 0.2 && u > -0.7) S.px(xx, y, 'glass', 10); } S.end();
      for (let y = S0; y <= S0 + Math.round(b * 0.7); y++) for (let xx = Math.floor(x - a); xx <= Math.ceil(x + a); xx++) { const u = (xx + 0.5 - x) / (a * (1 - (y - S0) / (b * 1.6))); if (Math.abs(u) <= 1 && inM(m, xx, y)) S.px(xx, y, 'water', y === S0 ? 9 : 4, { e: 1 }); } });
    // stalactites in clusters, thick and thin, a wet bead at each tip
    P.tites.forEach(q => { S.beg(); for (let k = 0; k < q.l; k++) { const hw = Math.max(0, Math.round((q.w / 2) * (1 - k / q.l))), kx = q.x + (k > q.l * 0.6 && q.l > 10 ? 1 : 0); for (let i = -hw; i <= hw; i++) S.px(kx + i, q.y + k, 'bone', i < 0 ? 7 : i === 0 ? 6 : 4, { n: [i / (hw + 1) * 0.8, 0] }); } S.px(q.x + (q.l > 10 ? 1 : 0), q.y + q.l, 'linen', 9, { e: 255 }); S.end(); });
    unmask(S, m, 0, 0, W - 1, H - 1);
    S.lay('wall'); rim(S, m, 8, { hollow: 1, boulders: 11 });
    sc.emit({ k: 'bubble', x: 73, y: 94, w: 62, rate: 1, sp: 3, ang: 0, spread: 0.3, life: 3, floor: S0 + 1 });   // from the pool bed (the anim pops them at the skin)
  },
  anim(D, t, rs) {
    const st = rs.st, P = SPR, S0 = P.S0, dt = clamp(t - (st.lt == null ? t : st.lt), 0, 0.1); st.lt = t; D.lay('wall'); rs.mul[2] = 0;
    // bubbles live only in the water: one that reaches the skin pops (a bright pixel on the surface), one over a bank is gone
    const pops = st.pops || (st.pops = []), A = rs.P.a;
    for (let i = A.length - 1; i >= 0; i--) { const q = A[i]; if (q.k !== 'bubble') continue; const x = Math.round(q.x), y = Math.round(q.y);
      if (y <= S0 + 2) { A.splice(i, 1); if (P.water(x, S0)) pops.push([x, t]); } else if (!P.water(x, y) || !P.water(x, y - 1)) A.splice(i, 1); }
    for (let i = pops.length - 1; i >= 0; i--) { const [x, t0] = pops[i], a = t - t0; if (a > 0.22 || a < 0) { pops.splice(i, 1); continue; } D.px(x, S0, 'water', 11, { e: 255 }); if (a < 0.08) D.px(x, S0 - 1, 'water', 11, { e: 255 }); }
    // the surface: rolling crests, a swell where the spring comes up
    const mp = steps(t, 8.5), surge = mp < 0.14 ? Math.sin(mp / 0.14 * Math.PI) : 0, sw = 0.6 + 0.4 * Math.sin(t * 1.7) + surge * 3;
    for (let x = 18; x < 134; x++) { if (!P.water(x, S0)) continue; const bump = Math.max(0, sw * (1 - Math.abs(x - 82) / (5 + surge * 4))), y = S0 - Math.round(bump), c = Math.sin(x * 0.4 - t * 2.2) + Math.sin(x * 0.13 + t * 1.3);
      for (let yy = y; yy < S0; yy++) D.px(x, yy, 'water', 10, { e: 255 }); if (c > 1.2 || bump > 0.5) D.px(x, y, 'water', 11, { e: 255 }); }
    // reflections sway in the top of the water
    P.refl.forEach(([x, y, w, tn]) => { const dx = Math.round(Math.sin(t * 1.4 + y * 0.7 + x * 0.05)); for (let i = 0; i < w; i++) if (P.water(x + dx + i, y)) D.px(x + dx + i, y, 'water', tn, { e: 255 }); });
    // wavelets lap at the rocks
    P.rocks.forEach(([x, a], i) => { const q = Math.sin(t * 2.6 + i * 1.9); [-1, 1].forEach(s => { const xx = Math.round(x + s * (a + 1 + (q > 0 ? 1 : 0))); if (P.water(xx, S0)) D.px(xx, S0, 'water', q * s > 0.3 ? 11 : 10, { e: 255 }); }); });
    // water spilling from the fissure into the pool; its splash kicks up drops at a steady rate
    for (let y = 57; y < S0; y++) { const x = 29 + (y > 64 ? 1 : 0); D.px(x, y, 'water', ((y + Math.floor(t * 22)) % 4) ? 9 : 11, { e: 255 }); if (y > 62) D.px(x - 1, y, 'water', 7, { e: 255 }); }
    st.dacc = (st.dacc || 0) + dt * 8; while (st.dacc >= 1) { st.dacc -= 1; rs.burst('drip', 30 + R() * 2, S0 - 1, 1, { sp: 12, ang: (R() - 0.5) * 2.2, spread: 0.6, life: 0.4, floor: S0 }); }
    // drops from the stalactite tips; each rings the surface where it lands
    P.drops.forEach((d, j) => { const q = P.tites[d.i], k = Math.floor((t + d.o) / d.p), ph = (t + d.o) - k * d.p, fall = Math.sqrt(2 * (S0 - q.y - q.l) / 120);
      if (st['d' + j] !== k) { st['d' + j] = k; rs.burst('drip', q.x, q.y + q.l + 1, 1, { sp: 0, life: 3, floor: S0 - 1 }); }
      const a = ph - fall; if (a > 0 && a < 1.1) { const rr = Math.round(1 + a * 8), tn = a < 0.5 ? 11 : 9; if (P.water(q.x - rr, S0)) D.px(q.x - rr, S0, 'water', tn, { e: 255 }); if (P.water(q.x + rr, S0)) D.px(q.x + rr, S0, 'water', tn, { e: 255 }); } });
    // the moment: the spring surges, throws a splash, rings spread
    if (mp > 0.08 && mp < 0.3 && !st.m) { st.m = 1; rs.burst('drip', 82, S0 - 4, 12, { sp: 34, ang: 0, spread: 1.3, life: 1, floor: S0 - 1 }); st.tw = t; rs.flash(2, 2.2); }
    if (mp > 0.5) st.m = 0;
    if (st.tw != null && t - st.tw < 0.7) { const k = (t - st.tw) / 0.7; [[78, -7, 0], [88, -10, 0.15], [83, -14, 0.3]].forEach(([x, dy, o]) => twinkle(D, x, S0 + dy, k > o ? Math.sin((k - o) / (1 - o) * Math.PI) : 0, 'water')); }
    if (mp > 0.1 && mp < 0.3) { const rr = Math.round((mp - 0.1) / 0.2 * 26); [82 - rr, 82 + rr, 82 - Math.round(rr * 0.6), 82 + Math.round(rr * 0.6)].forEach((x, i) => { if (P.water(x, S0)) D.px(x, S0, 'water', i < 2 ? 11 : 10, { e: 255 }); }); }
  },
});
X.TILEF.spring = (D, t, rs) => {
  // five short runnels of spring water between stones, two rows deep: the water takes the room's own light, only the ripple
  // heads glow
  [[12, 25], [40, 55], [72, 85], [101, 116], [128, 139]].forEach(([a, b], ci) => {
    for (let x = a; x <= b; x++) { const q = ((x - t * 11 - ci * 7) % 13 + 13) % 13; D.px(x, 97, 'water', q < 1 ? 10 : q < 2.5 ? 6 : 5, q < 1 ? { e: 255 } : NO); D.px(x, 98, 'water', 4); }
    [a - 3, b + 1].forEach(x => { D.beg(); D.hl(x + 1, 96, 2, 'stone', 7); D.hl(x, 97, 3, 'stone', 5); D.hl(x, 98, 3, 'stone', 3); D.px(x + 1, 96, 'stone', 8); D.end(); }); });
};

// ───────── 松软土层 mole ─────────
// loose soil: dark topsoil threaded with roots, crumbly loam, sandy subsoil with pebbles; a mole's tunnel winds through it to
// a nest chamber lit by glowing mushrooms, glow-worms hang in an old side tunnel; the mole trundles along the tunnel,
// a worm wriggles, crumbs trickle from the tunnel roof; every ~11 s the mole digs at the tunnel's end in a spray of soil
const MOLE = (() => {
  const m = blob(901, { bite: [[11, 10, 12], [139, 9, 13], [10, 95, 13], [141, 97, 12]], keep: [[137, 56, 8, 8]] }), r = X.rng(9031);   // the rim stays off the face the mole digs at
  const main = [[12, 52], [22, 55], [34, 61], [46, 64], [62, 64], [76, 61], [90, 58], [104, 60], [118, 57], [128, 55]];
  const side = [[34, 61], [30, 50], [32, 40], [42, 32], [54, 28], [64, 30]];
  const low = [[90, 58], [94, 70], [104, 80], [118, 84]];
  const tun = new Uint8Array(W * H);
  const stamp = (pts, rad) => rast(pts).forEach(([x, y]) => { for (let j = -Math.ceil(rad); j <= Math.ceil(rad); j++) for (let i = -Math.ceil(rad) - 1; i <= Math.ceil(rad) + 1; i++) if ((i * i) / ((rad + 1) * (rad + 1)) + (j * j) / (rad * rad) <= 1 && inM(m, x + i, y + j) && deep(m, x + i, y + j, 2)) tun[(y + j) * W + x + i] = 1; });
  stamp(main, 5); stamp(side, 2.8); stamp(low, 2.6);
  for (let y = 55; y < 76; y++) for (let x = 36; x < 75; x++) { const u = (x + 0.5 - 55) / 18, v = (y + 0.5 - 65) / 9; if (u * u + v * v <= 1 && inM(m, x, y)) tun[y * W + x] = 1; }   // the nest chamber
  const mainPx = rast(main), floorY = (x) => { let best = null; mainPx.forEach(q => { if (q[0] === Math.round(x)) best = best == null ? q[1] : Math.max(best, q[1]); }); let y = best == null ? 60 : best; while (tun[(y + 1) * W + Math.round(x)]) y++; return y; };
  const roots = [0, 1, 2, 3, 4].map(i => walk(r, 20 + i * 26 + r() * 8, 6, 14, Math.PI / 2, 0.8, 2, Math.PI / 2, 0.2));
  const worms = [[42, 85], [118, 27]];
  const seam = seamPath(9020, 6, 144, 97);
  // the pocket the mole digs at the tunnel's end, k = 1…5 px on: a round cap pushed on past the end of the tunnel
  const cap = (k) => { const o = []; for (let y = 49; y <= 62; y++) for (let x = 126; x <= 144; x++) { const u = (x + 0.5 - (131 + k)) / 5, v = (y + 0.5 - 55.5) / 4.6; if (u * u + v * v <= 1 && !tun[y * W + x] && deep(m, x, y, 2)) o.push(y * W + x); } return o; };
  return { m, tun, floorY, roots, worms, seam, cap, pk: [] };
})();
const inT = (x, y) => x >= 0 && y >= 0 && x < W && y < H && MOLE.tun[y * W + x] === 1;
// the mole, side view facing dir, feet on row y: velvet body, pink snout and spade paws; k = walk phase, dig = paws a blur
function mole(D, x, y, dir, k, dig) {
  const d = dir, px = (i, j, m, t) => D.px(x + i * d, y + j, m, t);
  D.beg();
  // velvet body: lit back, dark belly, rounded rump
  for (let j = -9; j <= -1; j++) for (let i = -9; i <= 7; i++) { const u = (i + 0.5) / 8.6, v = (j + 4.6) / 4.6; if (u * u + v * v > 1) continue; px(i, j, 'stone', j <= -8 ? 7 : j <= -6 ? 6 : j <= -4 ? 5 : j >= -2 ? 3 : 4); }
  // snout tapering to a pink nose, a tiny eye, whiskers
  px(8, -6, 'stone', 5); px(8, -5, 'stone', 5); px(8, -4, 'stone', 4); px(9, -5, 'stone', 5); px(9, -4, 'stone', 4); px(10, -5, 'stone', 4);
  px(11, -5, 'candy', 9); px(11, -4, 'candy', 7); px(12, -5, 'candy', 8); px(12, -4, 'candy', 6);
  px(5, -6, 'ink', 0); px(5, -7, 'stone', 8);
  px(12, -7, 'linen', 6); px(13, -3, 'linen', 5);
  px(-10, -4, 'candy', 7); px(-11, -3, 'candy', 6);
  // spade forepaws (pink, clawed) and small hind feet; paws swim when walking, blur when digging
  const s = dig ? Math.round(Math.sin(k * 3) * 2) : Math.round(Math.sin(k) * 1.2), s2 = dig ? -s : -Math.round(Math.sin(k) * 1.2);
  [[5 + s, -2], [6 + s, -2], [7 + s, -2], [5 + s, -1], [6 + s, -1], [7 + s, -1], [8 + s, -1], [6 + s, 0], [7 + s, 0]].forEach(([i, j], n) => px(i, j, 'skin', n < 3 ? 9 : n < 7 ? 8 : 6));
  px(9 + s, -1, 'linen', 9); px(8 + s, 0, 'linen', 8);
  [[-6 + s2, 0], [-5 + s2, 0], [-4 + s2, 0]].forEach(([i, j], n) => px(i, j, 'skin', 7 - n * 0.5));
  D.end();
}
X.def('_tile_mole', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const O = MOLE, m = O.m, r = S.r;
    sc.light({ x: 52, y: 68, z: 6, r: 25, i: 1.3, c: '#ffc870', fl: 'pulse', amp: 0.25, sp: 1.1, tint: 0.3 });       // 0 mushrooms in the nest: a warm pool kept inside the chamber
    sc.light({ x: 44, y: 32, z: 6, r: 18, i: 1, c: '#8affd8', fl: 'pulse', amp: 0.45, sp: 0.7, ph: 1, tint: 0.2 });   // 1 glow-worms, in the side tunnel
    sc.light({ x: 80, y: 50, z: 30, r: 90, i: 0.12, c: '#ffe8c0', tint: 0.1 });                                    // 2 a faint warm fill
    sc.light({ x: 133, y: 56, z: 8, r: 34, i: 1.6, c: '#ffb860', bake: false, tint: 0.1 });                       // 3 the tunnel's end: a dim glow, bright while the mole digs
    S.lay('wall');
    // soil horizons: dark topsoil, crumbly loam, sandy subsoil — kept a step or two down, so the lights make pools
    const hz = (x, y) => y + Math.round((vnoise(x / 12, 0.5, 902) - 0.5) * 6);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const q = hz(x, y), n = Math.round((nz(x, y, 7, 903) - 0.5) * 2.4);
      if (q < 22) S.px(x, y, 'earth', 6 + n); else if (q < 58) S.px(x, y, 'earth', 7 + Math.max(0, n)); else S.px(x, y, 'paper', 5 + n); }
    // clods: a few little lumps, a step up from the soil, a lit pixel on top
    for (let i = 0; i < 50; i++) { const x = 8 + r() * 134, y = 8 + r() * 90, q = hz(x, y), a = 1 + r() * 1.6, b = 0.8 + r() * 0.8; if (inT(Math.round(x), Math.round(y))) continue; const mt = q < 58 ? 'earth' : 'paper', t0 = q < 22 ? 6 : q < 58 ? 7 : 5;
      S.ell(x, y, a, b, mt, t0 + 1, { dome: 1 }); S.px(x - 1, y - Math.round(b), mt, t0 + 2); }
    // pebbles in the subsoil: a lit pixel top-left, a dark edge only under and right of them
    for (let i = 0; i < 14; i++) { const x = 10 + r() * 130, y = 66 + r() * 30, a = 1.5 + r() * 1.6, b = 1.1 + r(), tn = 7 + Math.round(r() * 2); if (inT(Math.round(x), Math.round(y))) continue; S.ell(x + 1, y + 1, a, b, 'mstone', 3); S.ell(x, y, a, b, 'mstone', tn, { dome: 1 }); S.px(Math.round(x - a / 2), Math.round(y - b / 2), 'mstone', tn + 2); }
    // roots down from the top
    O.roots.forEach((P, i) => rast(P).forEach(([x, y], k, a) => { if (inT(x, y)) return; S.px(x, y, 'wood', 5 - k / a.length * 1.5); if (k < a.length * 0.4) S.px(x + 1, y, 'wood', 3); if (k % 7 === 3) { S.px(x - 1, y + 1, 'wood', 4); S.px(x - 2, y + 2, 'wood', 3); } }));
    lensAO(S, m, 10, 2.4, 1);   // the soil falls off into the dark rock round the cell
    // the tunnels: dark inside, a lit floor, an overhang shadow under their roof
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inT(x, y)) continue; const roof = !inT(x, y - 1), floor = !inT(x, y + 1); S.px(x, y, 'earth', floor ? 5 : !inT(x, y + 2) ? 4 : roof || !inT(x, y - 2) ? 1 : 2); }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { if (inT(x, y)) continue; if (inT(x, y + 1)) S.tone(x, y, -3); else if (inT(x, y - 1)) S.tone(x, y, 1); }
    // the chamber floor catches the mushrooms' glow (e:1, so it breathes with them): warm sand right under the caps, lit
    // earth further out; the light itself stays small, so the solid soil over the tunnel keeps its own dark
    for (let x = 38; x <= 72; x++) { const fy = O.floorY(x), d = Math.abs(x - 50); if (d > 12 || !inT(x, fy)) continue; S.px(x, fy, d < 7 ? 'sand' : 'earth', d < 4 ? 5 : d < 7 ? 4 : d < 10 ? 6 : 5, { e: 1 }); }
    // the nest: a bowl of dry grass on the chamber floor (every column stands on the floor under it), seeds stored beside it
    for (let x = 57; x <= 69; x++) { const u = (x - 63) / 6.5, h = Math.round(3 * Math.sqrt(Math.max(0, 1 - u * u))) + 1, fy = O.floorY(x); for (let k = 0; k < h; k++) S.px(x, fy - k, 'sand', k === h - 1 ? 9 : (x + k) % 3 ? 7 : 5); }
    for (let i = 0; i < 12; i++) { const x = 58 + r() * 10, y = O.floorY(Math.round(x)) - 2 - r() * 2; S.line(x, y, x + (r() - 0.5) * 6, y - r() * 2.5, 'sand', 8 + Math.round(r())); }
    S.hl(60, O.floorY(63) - 3, 6, 'sand', 3); [70, 72, 71].forEach((x, i) => { const fy = O.floorY(x) - (i === 2 ? 1 : 0); S.px(x, fy, 'leather', 7); S.px(x, fy - 1, 'leather', 8); });
    // glowing mushrooms beside the nest, standing on the chamber floor: pale stems, domed caps that glow, brighter spots
    S.lay('back'); [[49, 4, 6], [54, 3, 4], [45, 2, 3]].forEach(([x, w, h]) => { const y = Math.max(O.floorY(x - 1), O.floorY(x)) + 1; S.beg(); S.rect(x - 1, y - h, 2, h, 'linen', 7); S.px(x - 1, y - h, 'linen', 5);
      for (let j = 0; j < Math.ceil(w * 0.8) + 1; j++) { const hw = Math.round(w * Math.sqrt(1 - Math.pow(j / (w * 0.8 + 1), 2))); S.hl(x - hw, y - h - 1 - j, hw * 2, 'lamp', j === 0 ? 6 : 8 + (j > 1 ? 1 : 0), { e: 1 }); }
      S.px(x - Math.round(w / 2), y - h - 2, 'lamp', 10, { e: 1 }); if (w > 2) S.px(x + 1, y - h - 1 - Math.round(w * 0.5), 'lamp', 10, { e: 1 }); S.end({ lit: 2 }); });
    // a warm rim on the chamber wall round the caps (e:1, breathing with them): a step of glow the small light leaves out
    { const B = S.L.back, rim = new Map(); for (let p = 0; p < W * H; p++) { if (B.m[p] !== MI.lamp || B.e[p] !== 1) continue; const cx = p % W, cy = (p / W) | 0;   // the caps (their outline is not e)
        for (let j = -3; j <= 0; j++) for (let i = -3; i <= 3; i++) { const x = cx + i, y = cy + j, q = y * W + x, d = Math.max(Math.abs(i), Math.abs(j)); if (d && !B.m[q] && inT(x, y)) rim.set(q, Math.min(rim.get(q) || 9, d)); } }
      S.lay('wall'); rim.forEach((d, q) => { const x = q % W, y = (q / W) | 0; if (d <= 2 || hh(x * 3.7 + y * 9.1) < 0.35) S.px(x, y, 'lamp', d <= 2 ? 1.4 : 0.6, { e: 1 }); }); }
    // glow-worms on the side tunnel's roof: a dark silk thread (never lit up past the bead), a 2 px bead of light, a teal halo
    S.lay('wall'); [[30, 44], [33, 38], [38, 34], [44, 31], [50, 29], [57, 28]].forEach(([x, y], i) => { let yy = y; while (inT(x, yy - 1)) yy--; let fl = yy; while (inT(x, fl + 1)) fl++;
      const l = Math.max(1, Math.min([2, 4, 3, 5, 2, 3][i], fl - yy - 2)), E = { e: 255 }; S.vl(x, yy, l, 'stone', 3); S.px(x, yy + l, 'teal', 11, E); S.px(x, yy + l + 1, 'teal', 10, E); S.px(x + (i % 2 ? 1 : -1), yy + l + 1, 'teal', 8, E); });
    rim(S, m, 3, { boulders: 11 });
    // the pocket the mole digs, k px on: drawn the tunnels' way (dark inside, a lit floor row), with the soil's own tones round
    // it for the overhang shadow over its roof and the lit ledge under its floor
    const L = S.c; O.pk = [[]]; O.face = [[]]; for (let k = 1; k <= 5; k++) { const ex = new Set(O.cap(k)), inU = (x, y) => inT(x, y) || ex.has(y * W + x), o = [];
      ex.forEach(p => { const x = p % W, y = (p / W) | 0, roof = !inU(x, y - 1), floor = !inU(x, y + 1); o.push([x, y, MI.earth, floor ? 5 : !inU(x, y + 2) ? 4 : roof || !inU(x, y - 2) ? 1 : 2]); });
      ex.forEach(p => { const x = p % W, y = (p / W) | 0; [[y - 1, -3], [y + 1, 1]].forEach(([yy, dt]) => { if (!inU(x, yy) && L.m[yy * W + x]) o.push([x, yy, L.m[yy * W + x], Math.max(0, L.t[yy * W + x] + dt)]); }); });
      O.pk.push(o); O.face[k] = [...ex].map(p => [p % W, (p / W) | 0]).filter(([x, y]) => !inU(x + 1, y)).map(([x, y]) => [x + 1, y]); }
  },
  anim(D, t, rs) {
    const st = rs.st, O = MOLE, dt = clamp(t - (st.lt == null ? t : st.lt), 0, 0.1); st.lt = t;
    // the mole trundles between the nest and the tunnel's end: it sniffs at the nest, digs at the end
    const X0 = 74, X1 = 122, SP = 14, PZ = 2.4, PER = (X1 - X0) / SP, CY = 2 * (PER + PZ), q = ((t + 1.46) % CY + CY) % CY, cyc = Math.floor((t + 1.46) / CY);
    const w = X.stroll(t, X0, X1, SP, 0.2, PZ), dig = q >= PER && q < PER + PZ, dT = q - PER, back = q >= PER + PZ, y = O.floorY(w.x), HX = 104;
    if (st.cy !== cyc) { st.cy = cyc; st.heap = 0; st.cl = []; st.ca = 0; st.d = 0; st.du = 0; }
    // the moment: at the tunnel's end the mole digs. The face opens into a new pocket, a pixel every 0.4 s; the glow there
    // comes up; clods fly back over the mole in arcs and pile up behind it; a puff of dust hangs at the face
    const k = dig ? Math.min(5, Math.floor(dT / 0.4)) : back ? 5 : 0;
    D.lay('wall'); (O.pk[k] || []).forEach(([x, yy, mm, tn]) => D.px(x, yy, mm, tn));
    if (dig && k) O.face[k].forEach(([x, yy], i) => D.px(x, yy, hh(x * 5.3 + yy * 1.7) < 0.4 ? 'earth' : 'paper', hh(x * 5.3 + yy * 1.7) < 0.4 ? 8 : 7));   // the fresh, crumbly face
    rs.mul[3] = 0.2 + 0.8 * (dig ? Math.min(1, dT / 0.25) : back ? Math.max(0, 1 - (q - PER - PZ) / 0.6) : 0);
    if (dig) { if (!st.d) { st.d = 1; rs.burst('dust', 133, 56, 10, { sp: 9, life: 1.8, w: 4, h: 7 }); rs.flash(3, 0.5); }
      if (dT < 2.1) { st.ca += dt * 6; while (st.ca >= 1) { st.ca -= 1; const mat = R() < 0.55 ? 'earth' : 'paper';
        st.cl.push({ x: w.x + 11, y: y - 4 - R() * 2, vx: -(30 + R() * 14), vy: -(33 + R() * 8), m: mat, tn: mat === 'earth' ? 8 + Math.round(R()) : 8 + Math.round(R()) }); rs.flash(3, 0.3); } }
      if (dT - st.du > 0.55) { st.du = dT; rs.burst('dust', 133, 57, 3, { sp: 7, life: 1.4, w: 3, h: 5 }); } }
    // the pile behind the mole grows with every clod that lands; once the mole turns back, it tramples it flat
    if (back && w.walking && st.heap > 0) st.heap = Math.max(0, st.heap - dt * 5);
    const hp = Math.round(st.heap); if (hp >= 1) { D.lay('back'); const hw = hp + 2;
      for (let dx = -hw; dx <= hw; dx++) { const x = HX + dx, ch = Math.round(hp * (1 - Math.pow(dx / (hw + 0.5), 2))), fy = O.floorY(x); for (let j = 0; j < ch; j++) { const top = j === ch - 1, hsh = hh(x * 3.1 + j * 7.7);
        D.px(x, fy - j, top ? (hsh < 0.5 ? 'paper' : 'earth') : 'earth', top ? (hsh < 0.5 ? 8 : 9) : 7 + (hsh > 0.7 ? 1 : 0) - (dx > hw * 0.35 ? 1 : 0)); } } }
    // the mole
    D.lay('mid'); mole(D, w.x, y + 1, w.dir, w.walking ? t * 14 : dig ? t * 16 : t * 2, dig);
    // clods in flight (behind the mole, lit by the dig): 2×2 lumps, lit on top; each that lands joins the pile
    D.lay('back'); for (let i = st.cl.length - 1; i >= 0; i--) { const c = st.cl[i]; c.vy += 150 * dt; c.x += c.vx * dt; c.y += c.vy * dt; const fy = O.floorY(Math.round(c.x));
      if (c.y >= fy - 1) { st.cl.splice(i, 1); st.heap = Math.min(5.5, st.heap + 0.45); continue; }
      D.px(c.x, c.y, c.m, c.tn + 1); D.px(c.x + 1, c.y, c.m, c.tn); D.px(c.x, c.y + 1, c.m, c.tn - 1); D.px(c.x + 1, c.y + 1, c.m, c.tn - 2); }
    // a worm wriggles in its burrow; crumbs trickle from the tunnel roof
    D.lay('wall'); O.worms.forEach(([x0, y0], i) => { const s = Math.sin(t * 0.7 + i * 2) * 4; for (let k = 0; k < 7; k++) { const x = Math.round(x0 + s + k), y = y0 + Math.round(Math.sin(t * 3 + k * 0.9 + i) * 0.8); if (deep(O.m, x, y, 1)) D.px(x, y, 'candy', k === 6 ? 8 : 6 + (k % 2)); } });
    if (steps(t + 1, 3.3) < 0.02 && !st.c) { st.c = 1; const x = 60 + Math.floor(R() * 60), yy = O.floorY(x); let top = yy; while (inT(x, top - 1)) top--; spill(st, x, top, 2, 'earth', 8, { sp: 2, floor: yy, life: 1.2 }); } if (steps(t + 1, 3.3) > 0.3) st.c = 0;
    D.lay('mid'); bits(D, st, t);
  },
});
X.TILEF.mole = (D, t, rs) => {
  // loose crumbly soil along the floor, and a worm working its way across it
  // a line of loose soil with little molehills on it; a worm works its way along; now and then a hill puffs a crumb
  const P = MOLE.seam;
  for (let i = 0; i < P.length; i++) { const [x] = P[i]; D.px(x, 98, 'earth', 3); if ((x * 13) % 7 < 4) D.px(x, 97, 'paper', 6 + ((x * 3) % 4 === 0 ? 1 : 0)); }
  for (let k = 0; k < 6; k++) { const x = 16 + k * 24 + (k * 5) % 7; D.hl(x - 3, 97, 7, 'paper', 6); D.hl(x - 2, 96, 5, 'paper', 7); D.hl(x - 1, 95, 3, 'paper', 8); D.px(x, 94, 'paper', 9); D.px(x + 2, 96, 'paper', 5); D.px(x + 3, 97, 'paper', 4); }
  const wx = 10 + ((t * 5) % 130); for (let k = 0; k < 6; k++) D.px(wx - k, 99 + Math.round(Math.sin(t * 4 + k) * 0.6), 'candy', 6 + (k % 2));
};

// ───────── 晶簇 crystal ─────────
// a geode split open: banded agate rind, a dark hollow furred with druzy, clusters of glowing prisms growing up from the
// floor, down from the roof and in from the walls; glints run up the prism edges, sparkles wake at the tips, motes drift;
// every 8 s a resonance sweeps across the geode and every crystal flares as it passes
function prismPx(bx, by, ang, len, w) {
  const dx = Math.sin(ang), dy = -Math.cos(ang), px = -dy, py = dx, tip = Math.max(2, w * 0.9), hw = w / 2, out = [];
  const xs = [bx, bx + dx * len], ys = [by, by + dy * len];
  for (let y = Math.floor(Math.min(...ys) - w); y <= Math.ceil(Math.max(...ys) + w); y++) for (let x = Math.floor(Math.min(...xs) - w); x <= Math.ceil(Math.max(...xs) + w); x++) {
    const rx = x + 0.5 - bx, ry = y + 0.5 - by, v = rx * dx + ry * dy, u = rx * px + ry * py; if (v < 0 || v > len) continue;
    const lim = v > len - tip ? hw * (len - v) / tip : hw; if (Math.abs(u) > lim + 0.01) continue; out.push({ x, y, f: u / hw, v: v / len }); }
  return out;
}
const CRY = (() => {
  const m = lens(1001, 3, 7, 15), G = { x: 74, y: 56, rx: 56, ry: 35 };
  const ge = (x, y) => { const u = (x + 0.5 - G.x) / G.rx, v = (y + 0.5 - G.y) / G.ry; return Math.sqrt(u * u + v * v) + (vnoise(x / 11, y / 11, 1003) - 0.5) * 0.2 + (vnoise(x / 4, y / 4, 1006) - 0.5) * 0.05; };
  const P = [
    [66, 90, -0.05, 42, 10, 0, 'back'], [55, 89, -0.42, 30, 8, 0, 'back'], [78, 90, 0.22, 33, 8, 0, 'back'], [88, 89, 0.52, 22, 7, 0, 'back'], [46, 88, -0.8, 18, 6, 0, 'back'], [99, 87, 0.95, 13, 5, 0, 'back'],
    [61, 91, -0.2, 16, 6, 0, 'mid'], [72, 91, 0.1, 13, 5, 0, 'mid'], [109, 85, 1.15, 9, 4, 0, 'mid'], [39, 85, -1.1, 10, 4, 0, 'mid'],
    [83, 21, Math.PI - 0.08, 20, 7, 1, 'back'], [94, 22, Math.PI - 0.4, 14, 6, 1, 'back'], [72, 22, Math.PI + 0.3, 11, 5, 1, 'back'], [105, 25, Math.PI - 0.72, 9, 4, 1, 'back'],
    [21, 58, 1.35, 22, 7, 2, 'back'], [23, 68, 1.05, 14, 6, 2, 'back'], [22, 47, 1.72, 12, 5, 2, 'back'], [28, 37, 2.2, 8, 4, 2, 'back'],
    [129, 51, -1.4, 13, 5, 3, 'back'], [127, 61, -1.1, 9, 4, 3, 'back'],
  ].map(([x, y, a, l, w, g, lay]) => ({ x, y, a, l, w, g, lay, px: prismPx(x, y, a, l, w), tip: [Math.round(x + Math.sin(a) * l), Math.round(y - Math.cos(a) * l)] }));
  // each pixel's facet (2 lit · 4 arris · 1 middle · −1 shade) and its resting tone: brighter toward the tip
  P.forEach(p => { p.px.forEach(q => { const f = q.f; q.face = f < -0.36 ? 2 : f <= -0.2 ? 4 : f < 0.34 ? 1 : -1; q.tn = clamp((q.v > 0.45 ? 5 : q.v > 0.2 ? 4 : 3) + q.face + Math.floor(q.v * 3), 2, 10); });
    p.ridge = p.px.filter(q => q.face === 4).sort((a, b) => a.v - b.v); p.glow = p.px.filter(q => q.v > 0.45); });
  const seam = seamPath(10020, 6, 144, 99);
  return { m, G, ge, P, seam };
})();
X.def('_tile_crystal', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    const C = CRY, m = C.m, r = S.r;
    sc.light({ x: 68, y: 66, z: 16, r: 78, i: 1, c: '#7fe0ff', fl: 'pulse', amp: 0.15, sp: 1.3, tint: 0.2  });           // 0 floor cluster
    sc.light({ x: 88, y: 30, z: 12, r: 46, i: 1, c: '#7fe0ff', fl: 'pulse', amp: 0.15, sp: 1.3, ph: 2, tint: 0.2  });     // 1 roof cluster
    sc.light({ x: 32, y: 56, z: 10, r: 34, i: 1, c: '#9ad8ff', fl: 'pulse', amp: 0.15, sp: 1.3, ph: 4, tint: 0.2  });     // 2 left wall
    sc.light({ x: 122, y: 54, z: 10, r: 30, i: 1, c: '#9ad8ff', fl: 'pulse', amp: 0.15, sp: 1.3, ph: 1, tint: 0.2  });    // 3 right wall
    S.lay('wall');
    // host rock, agate rind in bands, the hollow
    const B = [[1.0, 'ice', 3], [1.035, 'glass', 6], [1.07, 'linen', 7], [1.1, 'ice', 5], [1.135, 'lav', 4], [1.165, 'glass', 4], [1.2, 'stone', 1]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = C.ge(x, y);
      if (d < 1) S.px(x, y, 'night', 2 + Math.round((nz(x, y, 4, 1004) - 0.5) * 2) + (d > 0.9 ? 1 : 0));
      else { const b = B.find(q => d < q[0] + 0.035); if (b) S.px(x, y, b[1], b[2]); else if (d < 1.29) S.px(x, y, d < 1.26 ? 'stone' : 'ice', d < 1.26 ? 2 : 1); else S.px(x, y, 'rock', rockTone(x, y, 10)); } }
    // druzy: tiny points furring the hollow, thicker near its rim
    for (let i = 0; i < 260; i++) { const x = Math.floor(18 + r() * 114), y = Math.floor(18 + r() * 74), d = C.ge(x, y); if (d > 0.99 || d < 0.8 || r() > (d - 0.78) * 4) continue;   // in little clusters hugging the rind
      const tn = 5 + Math.round(r() * 2); S.px(x, y, 'ice', tn); if (C.ge(x + 1, y) < 1) S.px(x + 1, y, 'ice', tn - 1); if (r() < 0.5 && C.ge(x, y + 1) < 1) S.px(x, y + 1, 'ice', tn - 2); }
    // prisms: lit facet, bright arris, middle facet, shade facet; they glow from inside, brighter toward the tip
    C.P.forEach(p => { S.lay(p.lay); S.beg(); p.px.forEach(q => S.px(q.x, q.y, 'ice', q.tn, { e: p.g + 1 }));
      S.px(p.tip[0], p.tip[1], 'linen', 10, { e: p.g + 1 }); S.end({ lit: 2 }); });
    S.lay('back'); unmask(S, m, 0, 0, W - 1, H - 1); S.lay('mid'); unmask(S, m, 0, 0, W - 1, H - 1);
    rim(S, m, 10, { noSeam: 1 });
    S.lay('wall');
    // the host rock is the same rock as the cells round it: its cobbles, its glints
    { const hr = X.rng(1010); for (let i = 0; i < 90; i++) { const x = hr() * W, y = hr() * H, rr = 1.6 + hr() * (i < 40 ? 6 : 2.6); let ok = true; for (let j = -Math.ceil(rr); j <= Math.ceil(rr) && ok; j++) for (let k = -Math.ceil(rr) - 1; k <= Math.ceil(rr) + 1; k++) if (C.ge(x + k, y + j) < 1.3) { ok = false; break; } if (!ok) continue; S.beg(); S.ell(x, y, rr, rr * 0.7, 'rock', 5 + Math.round(hr() * 3), { dome: 1 }); S.end(); }
      for (let i = 0; i < 24; i++) { const x = Math.floor(hr() * W), y = Math.floor(hr() * H); if (C.ge(x, y) > 1.3) S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); } }
  },
  anim(D, t, rs) {
    const st = rs.st, C = CRY;
    // glints run up the prism edges
    C.P.forEach((p, i) => { if (p.l < 14) return; const q = steps(t + i * 0.77, 3 + (i % 4) * 0.7); if (q > 0.45) return; const R0 = p.ridge, k = Math.floor(q / 0.45 * R0.length); D.lay(p.lay); for (let j = 0; j < 3; j++) { const e = R0[k - j]; if (e) D.px(e.x, e.y, 'ice', 11 - j, { e: 255 }); } });
    // sparkles at the tips; motes drifting up through the hollow
    C.P.forEach((p, i) => { if (i % 2 === 0) twinkle(D, p.tip[0], p.tip[1], blink(t, 2.3 + (i % 5) * 0.7, i * 0.61, 0.16), 'ice'); });
    D.lay('mid'); for (let i = 0; i < 7; i++) { const q = (t * 0.09 + i / 7) % 1, x = 30 + ((i * 41) % 90) + Math.round(Math.sin(t * 0.8 + i) * 3), y = 86 - Math.round(q * 60); if (C.ge(x, y) < 0.95 && q > 0.1 && q < 0.9) D.px(x, y, 'ice', q < 0.5 ? 10 : 9, { e: 255 }); }
    // the moment: a resonance sweeps left to right; each crystal flares as it passes — every facet steps up its ramp (the lit
    // facet, the middle and the shade keep their order, the arris goes white), and its tip throws a glint
    const mp = steps(t, 8), cyc = Math.floor(t / 8); if (mp < 0.18) { const wx = 14 + mp / 0.18 * 122, E = { e: 255 }, CAP = { 2: 10, 1: 9, '-1': 8 };
      C.P.forEach((p, i) => { const dx = Math.abs(p.tip[0] - wx); if (dx > 9) return; const up = dx < 4 ? 3 : 2; D.lay(p.lay);
        p.glow.forEach(q => { if (q.face === 4) D.px(q.x, q.y, dx < 4 ? 'linen' : 'ice', dx < 4 ? 10 : 11, E); else D.px(q.x, q.y, 'ice', Math.max(q.tn, Math.min(CAP[q.face], q.tn + up)), E); });
        D.px(p.tip[0], p.tip[1], 'linen', 10, E); twinkle(D, p.tip[0], p.tip[1], 1 - dx / 9, 'ice');
        if (dx < 3 && st['p' + i] !== cyc) { st['p' + i] = cyc; rs.burst('glint', p.tip[0], p.tip[1], 1, { sp: 4, life: 0.45 }); } });
      // the wave carries its own untinted light across the hollow (the clusters' tinted lights only lift a little)
      rs.dl.push({ x: wx, y: 58, z: 18, r: 34, i: 0.75 * Math.min(1, mp / 0.03, (0.18 - mp) / 0.03), rgb: [191, 239, 255], tint: 0 });
      const li = wx < 50 ? 2 : wx < 100 ? 0 : 3; if (st['w' + li] !== cyc) { st['w' + li] = cyc; rs.flash(li, 0.3); if (li === 0) rs.flash(1, 0.25); } }
  },
});
X.TILEF.crystal = (D, t, rs) => {
  // small crystal points poking up out of the floor; one after another they twinkle
  const k = Math.floor(t * 1.6) % 11;
  for (let j = 0; j < 11; j++) { const x = 10 + j * 13 + (j * 7) % 5, h = 2 + (j * 5) % 4; for (let y = 0; y < h; y++) { D.px(x, 99 - y, 'ice', 6 + y, { e: y > 1 ? 255 : 0 }); if (y < h - 1) D.px(x + 1, 99 - y, 'ice', 4 + y); } D.px(x - 1, 99, 'ice', 5);
    if (j === k) { const ty = 99 - h; D.px(x, ty, 'linen', 11, { e: 255 }); D.px(x - 1, ty, 'ice', 9, { e: 255 }); D.px(x + 1, ty, 'ice', 9, { e: 255 }); D.px(x, ty - 1, 'ice', 9, { e: 255 }); } }
};

// ───────── 未勘明的地脉 _vein ─────────
// the rock cells' own recipe, with a few fissures that let out a pale violet-white light: it breathes, cross-shaped glints
// flare along the cracks, a mote drifts out now and then; every 9 s a bead of light runs the length of one crack (a
// different crack each time), its spill on the rock swells and a few wisps rise from the middle of it
const VEIN = (() => { const r = X.rng(9011), fis = [];
  [[22, 28, 0.45, 17], [58, 60, -0.25, 21], [106, 26, 1.0, 15], [100, 82, -0.6, 12]].forEach(([x, y, a, n]) => fis.push(rast(walk(r, x, y, n, a, 2.0, 2, a, 0.35))));
  const br = fis.map(P => { const q = P[Math.floor(P.length * 0.6)]; return rast(walk(r, q[0], q[1], 4, r() < 0.5 ? 1.2 : -1.9, 1.6, 2)); });
  const pts = []; fis.forEach(P => [0.3, 0.7].forEach(k => { const q = P[Math.floor(P.length * k)]; if (q) pts.push(q); }));
  return { fis, br, pts };
})();
X.def('_vein', {
  noFrame: 1, noFloor: 1, amb: AMB,
  paint(S, sc) {
    sc.light({ x: 75, y: 50, z: 2, r: 1, i: 1, c: '#cfc6ff', fl: 'pulse', amp: 0.45, sp: 1.2 });   // 0 drives the breathing of the light in the cracks
    VEIN.fis.map(P => P[Math.floor(P.length / 2)]).forEach(([x, y], i) => sc.light({ x, y, z: 8, r: 30, i: 0.9, c: '#cfc6ff', fl: 'pulse', amp: 0.4, sp: 1.2, tint: 0.22 }));   // 1–4 its spill on the rock
    S.lay('wall'); const r = S.r, v = 5;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) S.px(x, y, 'rock', rockTone(x, y, v));
    for (let i = 0; i < 30; i++) { const cx = r() * W, cy = r() * H, rx = 2.5 + r() * 8, ry = rx * (0.5 + r() * 0.35); S.beg(); S.ell(cx, cy, rx, ry, 'rock', 5 + Math.round(r() * 3), { dome: 1 }); S.end(); }
    for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H; S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); if (r() < 0.3) S.px(x + 1, y, 'rock', 7); }
    // fissures: dark lips, the light widening to a slit in the middle of each — a white core, pale violet-white edges
    VEIN.br.forEach(P => P.forEach(([x, y], k) => { S.px(x, y - 1, 'rock', 1); S.px(x, y, 'arcane', k < 3 ? 9.4 : 8.6, { e: 1 }); }));
    VEIN.fis.forEach(P => { P.forEach(([x, y]) => { S.px(x, y - 1, 'rock', 1); S.px(x, y + 1, 'rock', 7); S.px(x - 1, y, 'rock', 2); });
      P.forEach(([x, y], k) => { const q = k / P.length, mid = Math.abs(q - 0.5); if (mid < 0.2) { S.px(x, y - 1, 'arcane', 9.4, { e: 1 }); S.px(x, y + 1, 'arcane', 9.4, { e: 1 }); S.px(x, y - 2, 'rock', 1); }
        S.px(x, y, mid < 0.22 ? 'linen' : 'arcane', mid < 0.12 ? 10.4 : mid < 0.22 ? 9.6 : mid < 0.42 ? 9.4 : 8.6, { e: 1 }); }); });
  },
  anim(D, t, rs) {
    const st = rs.st; D.lay('wall');
    VEIN.pts.forEach(([x, y], i) => { const a = Math.sin(t * (1.1 + (i % 3) * 0.4) + i * 2.3); if (a < 0.4) return; D.px(x, y, 'linen', a > 0.8 ? 10 : 9, { e: 255 });
      if (a > 0.65) { D.px(x - 1, y, 'arcane', 9, { e: 255 }); D.px(x + 1, y, 'arcane', 9, { e: 255 }); D.px(x, y - 1, 'arcane', 9, { e: 255 }); D.px(x, y + 1, 'arcane', 9, { e: 255 }); }
      if (a > 0.9) { D.px(x - 2, y, 'arcane', 8, { e: 255 }); D.px(x + 2, y, 'arcane', 8, { e: 255 }); D.px(x, y - 2, 'arcane', 8, { e: 255 }); D.px(x, y + 2, 'arcane', 8, { e: 255 }); } });
    // motes leak out of the cracks and drift up
    for (let i = 0; i < 4; i++) { const P = VEIN.fis[i], q = (t * 0.22 + i * 0.37) % 1, s = P[Math.floor(hh(Math.floor(t * 0.22 + i * 0.37) * 5 + i) * P.length)]; if (!s || q > 0.8) continue; D.px(s[0] + Math.round(Math.sin(t * 2 + i) * 1.5), s[1] - 2 - Math.round(q * 16), 'arcane', q < 0.5 ? 9 : 8, { e: 255 }); }
    // the moment: a bead of light runs one crack end to end (linen-white head, a violet tail), its light swells, wisps rise
    const cy = Math.floor(t / 9), ci = ((cy % 4) + 4) % 4, P = VEIN.fis[ci], n = P.length, age = t - cy * 9, run = 1.3;
    for (let i = 1; i <= 4; i++) rs.mul[i] = 1;
    if (age < run + 0.8) { rs.mul[ci + 1] = 1 + 0.8 * Math.sin(Math.min(1, age / (run + 0.8)) * Math.PI);
      if (age < run) { const hd = age / run * (n + 4); for (let k = 0; k < 5; k++) { const j = Math.floor(hd) - k; if (j < 0 || j >= n) continue; D.px(P[j][0], P[j][1], k === 0 ? 'linen' : 'arcane', [11, 10, 10, 9, 9][k], { e: 255 }); if (k < 2) { D.px(P[j][0], P[j][1] - 1, 'arcane', 10, { e: 255 }); D.px(P[j][0], P[j][1] + 1, 'arcane', 10, { e: 255 }); } } } }
    if (age < 0.3 && st.m !== cy) { st.m = cy; const q = P[Math.floor(n / 2)]; rs.flash(ci + 1, 0.8); rs.burst('soul', q[0], q[1] - 1, 4, { sp: 8, ang: 0, spread: 1.4, life: 1.8, w: 6 }); }
  },
});
})();
