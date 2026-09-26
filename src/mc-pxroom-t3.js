// ==== mc-pxroom-t3.js ====
(function () {
// Pixel rooms, batch t3 (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// Special terrain, pixel versions: 大地之心 heart · 陨星坑 star · 雷暴核心 storm · 英灵冢 bones · 时之沙 hourglass ·
// 梦境裂隙 dream · 世界树根 ygg · 王座遗骸 crown. Each is a whole cell of ground (no wall, no floor, no frame) that sits
// between plain rock cells: rock-dark for the outer few pixels, then its own geology, its own light and a slow life.
// PXR.TILEF[key] is the seam a room dug out of that ground keeps along its floor.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, TX, vnoise, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;
const sm = (a) => a * a * (3 - 2 * a);
const hh = (a, b, s) => { let n = (a * 374761393 + b * 668265263 + s * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const ed = (x, y, cx, cy, rx, ry) => Math.hypot((x - cx) / rx, (y - cy) / ry);
const G = { e: 255 };

// ───────── shared ground bits ─────────
// the plain rock the cell sits in (same bands, grain and pebbles as the rock cells around it); skip(x, y, r) keeps the
// middle free for the terrain's own geology
function bed(S, v, skip, o) {
  o = o || {}; S.lay('wall'); const r = S.r, t0 = o.t0 == null ? 4 : o.t0;
  for (let y = 0; y < H; y++) { const band = Math.round(Math.sin(y * 0.16 + v * 2.1) * 0.8 + (vnoise(v, y * 0.07, v) - 0.5) * 3); for (let x = 0; x < W; x++) S.px(x, y, 'rock', t0 + band); }
  S.noise(0, 0, W, H, 1, 4, v * 7 + 1); S.noise(0, 0, W, H, 1, 1.6, v * 7 + 2);
  for (let i = 0; i < (o.peb == null ? 30 : o.peb); i++) { const cx = r() * W, cy = r() * H, rx = 2.5 + r() * 6, ry = rx * (0.5 + r() * 0.35); if (skip && skip(cx, cy, rx + 2)) continue; S.beg(); S.ell(cx, cy, rx, ry, 'rock', 5 + Math.round(r() * 3), { dome: 1 }); S.end(); }
  for (let i = 0; i < 7; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * H); if (skip && skip(x, y, 8)) continue; TX.crack(S, x, y, 6 + Math.floor(r() * 12), 'rock', 5, r() < 0.5 ? 'v' : 'h'); }
  for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H; if (skip && skip(x, y, 1)) continue; S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); if (r() < 0.3) S.px(x + 1, y, 'rock', 7); }
}
// a random-walk path (veins, roots, fulgurites): 1-px steps, gentle wander, pull toward angle `to`; branches recurse
function walk(r, x, y, a, len, o, out, depth) {
  const pts = [[x, y]]; depth = depth || 0;
  for (let k = 0; k < len; k++) {
    a += (r() - 0.5) * (o.wig || 0.5); if (o.to != null) a += Math.sin(o.to - a) * (o.pull || 0.05);
    x += Math.cos(a); y += Math.sin(a); const bb = o.b || [o.x0 || 4, o.y0 || 4, W - (o.x0 || 4), H - (o.y0 || 4)]; if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) break; pts.push([x, y]);
    if (depth < (o.maxD != null ? o.maxD : 1) && k > 5 && k < len - 6 && r() < (o.br != null ? o.br : 0.03)) { walk(r, x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), Math.round((len - k) * (0.45 + r() * 0.3)), o, out, depth + 1); }
  }
  const P = []; pts.forEach(([px, py]) => { const q = [Math.round(px), Math.round(py)], l = P[P.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) P.push(q); });
  out.push({ pts: P, depth }); return out;
}
// a round tube along a path, tapering w0 → w1 (roots, arteries): cross-section normals so the room's lights shade it
function tube(S, pts, w0, w1, m, t, o) {
  o = o || {}; const n = pts.length;
  for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, hw = (w0 + (w1 - w0) * i / Math.max(1, n - 1)) / 2;
    for (let s = -hw; s <= hw + 0.01; s += 0.5) { const u = hw > 0.3 ? s / hw : 0; S.px(pts[i][0] + nx * s, pts[i][1] + ny * s, m, t + (o.band ? (u * (ny < 0 ? 1 : -1) > 0.35 ? o.band : u * (ny < 0 ? 1 : -1) < -0.45 ? -o.band : 0) : 0), { n: [nx * u * 0.85, ny * u * 0.85], e: o.e }); } }
}
// a thin glowing line along a path (vein cores); e ties it to a light
function thread(S, pts, m, t, e, from, to) { for (let i = from || 0; i < Math.min(pts.length, to || 1e9); i++) S.px(pts[i][0], pts[i][1], m, t, { e }); }
// a bright pulse running along a path: head at arc length s (px), a short fading tail
function runPulse(D, pts, s, m, tHead, len) { const k = Math.floor(s); if (k < 0 || k >= pts.length + (len || 3)) return; for (let j = 0; j < (len || 3); j++) { const q = pts[k - j]; if (q) D.px(q[0], q[1], m, Math.round(tHead - j * 1.5), G); } }
// sparks thrown out in a ring from (x, y): k = 0…1 since the throw, n sparks, R = how far they get (drawn, so they keep
// the terrain's own colour instead of a particle ramp)
function burstPx(D, x, y, k, n, m, tn, Rr) { if (k < 0 || k > 1) return; const e = 1 - (1 - k) * (1 - k); for (let i = 0; i < n; i++) { const a = i / n * 6.283 + i * 0.37, d = e * Rr * (0.7 + (i % 3) * 0.15), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 + k * k * 4; D.px(px, py, m, Math.round(tn - k * 3), G); if (k < 0.6) D.px(px - Math.cos(a) * 1.4, py - Math.sin(a) * 1.1, m, Math.round(tn - 2 - k * 3), G); } }
// a four-point twinkle, sized by a (0…1)
function star4(D, x, y, m, t, a) { if (a <= 0.15) return; D.px(x, y, m, t, G); if (a > 0.55) { D.px(x - 1, y, m, t - 2, G); D.px(x + 1, y, m, t - 2, G); D.px(x, y - 1, m, t - 2, G); D.px(x, y + 1, m, t - 2, G); } if (a > 0.9) { D.px(x - 2, y, m, t - 4, G); D.px(x + 2, y, m, t - 4, G); D.px(x, y - 2, m, t - 4, G); D.px(x, y + 2, m, t - 4, G); } }

// the terrain's own ground fills the cell to a ragged margin of plain rock (about 6–14 px): a rounded, squarish
// outline (superellipse) with a slow wobble, whose last few pixels break up in clusters into the rock
const fillE = (x, y, s, o) => { o = o || {}; const cx = o.cx != null ? o.cx : 75, cy = o.cy != null ? o.cy : 52, rx = o.rx || 66, ry = o.ry || 44, p = o.p || 4;
  return Math.pow(Math.pow(Math.abs(x + 0.5 - cx) / rx, p) + Math.pow(Math.abs(y + 0.5 - cy) / ry, p), 1 / p) + (vnoise(x / 9, y / 9, s) - 0.5) * (o.amp || 0.12) + (vnoise(x / 3.5, y / 3.5, s + 1) - 0.5) * 0.05; };
const inFill = (x, y, s, o) => { if (x < 5 || y < 5 || x > W - 6 || y > H - 6) return false; const e = fillE(x, y, s, o), k = (o && o.brk) || 0.08; if (e > 1) return false; return !(e > 1 - k && vnoise(x / 2.2, y / 2.2, s + 2) < (e - (1 - k)) / k); };
// floor-seam pixels lie flat and recede like the floor rows they sit in
const FZ = (y) => ({ z: (y - 90) * 2, n: [0, -0.9] });

// ═════════ 大地之心 heart ═════════
// a garnet heart hangs in a hollow at the middle of the rock, held by arteries that run out into the stone;
// it beats (lub-dub), a pulse runs down every artery, and every 9 s a great beat sends a ring through the hollow
const HC = [75, 53], HCAV = [75, 52, 43, 31], HGEO = 4;
const beat = (t) => { const q = steps(t, 1.25), g = (c, w) => Math.exp(-((q - c) / w) * ((q - c) / w)); return g(0.04, 0.05) + 0.65 * g(0.24, 0.05); };
const inCav = (x, y) => ed(x, y, HCAV[0], HCAV[1], HCAV[2], HCAV[3]) < 1 + (vnoise(x / 5, y / 5, 5) - 0.5) * 0.26;
// heart sprites at rest and at the beat: pillow-shaded garnet, hot pink core, a gloss on the left lobe, a dark rim
function heartSpr(s) {
  const out = [], m = {}, ins = (x, y) => { const u = x / s, v = -(y + 0.1 * s) / s, a = u * u + v * v - 1; return a * a * a - u * u * v * v * v <= 0; };
  const R0 = Math.ceil(s * 1.4);
  for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) if (ins(x, y)) m[x + ',' + y] = 1;
  const dep = (x, y) => { for (let d = 1; d < 9; d++) for (let k = -d; k <= d; k++) if (!m[(x + k) + ',' + (y - d)] || !m[(x + k) + ',' + (y + d)] || !m[(x - d) + ',' + (y + k)] || !m[(x + d) + ',' + (y + k)]) return d; return 9; };
  const sc = s / 11.5;
  Object.keys(m).forEach(kk => { const [x, y] = kk.split(',').map(Number), d = dep(x, y), k = Math.min(1, (d - 1) / (s * 0.55)), dl = (-(x) - (y + 0.2 * s)) / (s * 1.6), v = k * 0.75 + dl * 0.45 + 0.1;
    let mm = 'crimson', tt; if (v < 0.1) tt = 5; else if (v < 0.28) tt = 6; else if (v < 0.46) tt = 7; else if (v < 0.62) tt = 8; else if (v < 0.8) tt = 9; else { mm = 'candy'; tt = 9; }
    if (d === 1 && x + y > 0) tt = 4;
    out.push([x, y, mm, tt]); });
  // facet lines from the dip to the point, a gloss arc on the left lobe, a speck on the right
  for (let k = 2; k < s * 1.6; k++) { const y = Math.round(-0.3 * s + k * 0.62), x = Math.round(-k * 0.3), x2 = Math.round(k * 0.34); if (m[x + ',' + y]) out.push([x, y, 'crimson', 6]); if (m[x2 + ',' + y] && k > 3) out.push([x2, y, 'crimson', 5]); }
  [[-7, -6], [-8, -5], [-8, -4], [-6, -7], [-5, -7]].forEach(([x, y], i) => out.push([Math.round(x * sc), Math.round(y * sc), 'linen', i > 2 ? 9 : 10]));
  out.push([Math.round(5 * sc), Math.round(-7 * sc), 'candy', 10]); out.push([Math.round(6 * sc), Math.round(-7 * sc), 'candy', 8]);
  // rim: dark garnet all round (glow, so the heart's own light never washes it out)
  Object.keys(m).forEach(kk => { const [x, y] = kk.split(',').map(Number); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const q = (x + a) + ',' + (y + b); if (!m[q] && !m['o' + q]) { m['o' + q] = 1; out.unshift([x + a, y + b, 'crimson', b < 0 || a < 0 ? 2 : 1]); } }); });
  return out;
}
const HSPR = [heartSpr(15.4), heartSpr(16.4)];
// arteries: a few big vessels leave the heart, curve and branch, then burrow into the stone as veins
const ART = []; { const r = X.rng(313); [[-2.55, 42], [-1.95, 30], [-1.2, 36], [-0.45, 46], [0.35, 52], [1.1, 36], [2.0, 38], [2.75, 48]].forEach(([a, l], i) => { const sx = HC[0] + Math.cos(a) * 14, sy = HC[1] - 3 + Math.sin(a) * 12 + 1; walk(r, sx, sy, a + (r() - 0.5) * 0.4, l + 10 + Math.floor(r() * 8), { wig: 0.5, to: a, pull: 0.07, br: 0.07, maxD: 1, x0: 8, y0: 8 }, ART); }); }
ART.forEach(A => { A.cav = A.pts.map(([x, y]) => inCav(x, y)); });
const MOTES = []; { const r = X.rng(312); for (let i = 0; i < 14; i++) MOTES.push([HCAV[0] + (r() - 0.5) * 62, r(), 0.08 + r() * 0.1, r() * 7]); }
// the stone round the heart, remembered pixel by pixel (sorted by distance out from the hollow) so a beat can run out
// through it as a brighter band of the same stone: [d, x, y, material, tone, nx, ny]
const HWAVE = [];
const hwaveRange = (d0, d1, fn) => { let lo = 0, hi = HWAVE.length; while (lo < hi) { const m = (lo + hi) >> 1; if (HWAVE[m][0] < d0) lo = m + 1; else hi = m; } for (let i = lo; i < HWAVE.length && HWAVE[i][0] < d1; i++) fn(HWAVE[i]); };
X.def('_tile_heart', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: HC[0], y: HC[1] - 3, z: 20, r: 86, i: 1, c: '#ff6a8a', tint: 0.46 });                   // 0 the heart (beats: rs.mul)
    sc.light({ x: 75, y: 80, z: 6, r: 38, i: 0.45, c: '#ff4060', fl: 'pulse', amp: 0.25, sp: 1.1, tint: 0.45 });   // 1 glow pooled under it
    bed(S, 4, (x, y, r2) => fillE(x, y, HGEO) < 1 + r2 / 50);
    // flesh-stone: layers wrapped round the hollow, fading out into the rock (and breaking up well before the cell's edge)
    const wv = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = ed(x, y, HCAV[0], HCAV[1], HCAV[2], HCAV[3]) + (vnoise(x / 8, y / 8, 6) - 0.5) * 0.3; if (d < 1 || !inFill(x, y, HGEO)) continue;
      const ring = Math.floor((d - 1) * 7); S.px(x, y, ring % 3 === 1 ? 'mstone' : 'crimson', ring === 0 ? 4 : ring % 3 === 2 ? 2 : 3, { n: [0, 0] }); wv.push([d, x, y]); }
    S.noise(8, 4, W - 16, H - 8, 1, 3, 17, { only: 'crimson' });
    // the hollow: dark back wall, drips from its roof, a lit lip along its floor
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inCav(x, y)) { S.px(x, y, 'crimson', 0.8 + (y - HCAV[1]) / HCAV[3] * 0.5, { n: [0, 0] }); wv.push([ed(x, y, HCAV[0], HCAV[1], HCAV[2], HCAV[3]), x, y]); }
    S.noise(30, 18, 92, 68, 1, 5, 19, { only: 'crimson' });
    for (let x = 30; x < 121; x++) { let top = -1, bot = -1; for (let y = 16; y < 90; y++) if (inCav(x, y)) { if (top < 0) top = y; bot = y; } if (top < 0) continue;
      S.px(x, top, 'ink', 0); if (hh(x, 1, 7) < 0.25) { const l = 1 + Math.floor(hh(x, 2, 7) * 4); for (let k = 0; k < l; k++) S.px(x, top + k, 'crimson', 3 - k * 0.5); }
      S.px(x, bot, 'crimson', 5, { n: [0, -0.8] }); S.px(x, bot - 1, 'crimson', 3); }
    // garnets growing from the hollow's floor
    const cavBot = (x) => { let b = -1; for (let y = 16; y < 90; y++) if (inCav(x, y)) b = y; return b; };
    [[49, 1], [56, 0], [95, 0], [102, 1]].map(([x, big]) => [x, cavBot(x) - 1, big]).forEach(([x, y, big]) => { S.beg(); const h = big ? 6 : 4; S.poly([[x - 2, y + 1], [x - 2, y - h + 2], [x, y - h], [x + 2, y - h + 2], [x + 2, y + 1]], 'crimson', 5); S.vl(x - 1, y - h + 2, h - 1, 'crimson', 8); S.px(x, y - h + 1, 'candy', 9); S.vl(x + 1, y - h + 3, h - 2, 'crimson', 3); S.end(); });
    // arteries: round garnet vessels leave the heart across the hollow; in the stone they run on as sunken vessels —
    // the big ones 2 px (a lit upper edge, a glowing red core, a dark lower lip), the branches 1 px — and over their last
    // stretch they dim and sink into the stone
    const AV = new Set(), vside = (P, k) => { const n = P.length, a = P[Math.max(0, k - 2)], b = P[Math.min(n - 1, k + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; let sx = -dy / l, sy = dx / l; if (sy > 0.2 || (Math.abs(sy) <= 0.2 && sx > 0)) { sx = -sx; sy = -sy; } return [Math.round(sx), Math.round(sy)]; };
    ART.forEach(A => { const n = A.pts.length, w0 = A.depth === 0 ? 5 : A.depth === 1 ? 3 : 2, inPts = A.pts.filter((_, k) => A.cav[k]);
      A.tail = Math.floor(n * 0.7); A.live = A.pts.slice(0, A.tail);
      if (inPts.length) { S.lay('back'); S.beg(); tube(S, inPts, w0, Math.max(1.5, w0 * 0.45), 'crimson', 5, { band: 2 }); S.end(); } });
    S.lay('wall');
    const vpass = (fn) => ART.forEach(A => A.pts.forEach(([x, y], k) => { if (A.cav[k]) return; const [ox, oy] = vside(A.pts, k); fn(A, x, y, k, ox, oy, k >= A.tail); }));
    const vput = (x, y, m, tn, o) => { S.px(x, y, m, tn, o); AV.add(Math.round(y) * W + Math.round(x)); };
    vpass((A, x, y, k, ox, oy, deep) => vput(x - ox, y - oy, 'crimson', A.depth ? 1.5 : 1));                                     // lower lips
    vpass((A, x, y, k, ox, oy, deep) => { if (!A.depth) vput(x + ox, y + oy, 'crimson', deep ? 4 : 6); });                       // lit upper edges
    vpass((A, x, y, k, ox, oy, deep) => { if (A.depth) vput(x, y, 'crimson', deep ? 4 : 5); else vput(x, y, deep ? 'crimson' : 'red', deep ? 4 : 5, deep ? undefined : { e: 1 }); });   // cores
    ART.forEach(A => { S.lay('back'); A.pts.forEach(([x, y], k) => { if (A.cav[k] && k < A.tail) S.px(x, y, 'crimson', A.depth ? 7 : 8, { e: 1 }); }); });
    // remember the stone round the heart for the beat waves (not the vessels: they carry their own pulse)
    const Lw = S.L.wall; HWAVE.length = 0; wv.forEach(([d, x, y]) => { const p = y * W + x; if (!Lw.m[p] || AV.has(p) || Lw.e[p]) return; HWAVE.push([d, x, y, Lw.m[p], Lw.t[p], Lw.nx[p] / 127, Lw.ny[p] / 127]); });
    HWAVE.sort((a, b) => a[0] - b[0]);
  },
  anim(D, t, rs) {
    const st = rs.st, b = beat(t), big = steps(t, 9), bb = big < 0.1 ? Math.sin(big / 0.1 * Math.PI) : 0;
    rs.mul[0] = 0.78 + b * 0.5 + bb * 0.6;
    // every beat runs out through the flesh-stone as a band of the same stone a step or two brighter; the great beat
    // starts at the heart, crosses the hollow's back wall and runs further and brighter
    const ph = steps(t, 1.25) * 1.25, rp = ph / 0.7; D.lay('wall');
    const MS = X.MI.mstone, wave = (d, w, up) => hwaveRange(d - w, d + 0.001, (P) => { const f = (d - P[0]) / w, u = P[3] === MS ? up * 0.6 : up; D.px(P[1], P[2], P[3], P[4] + (f < 0.45 ? u : u * 0.5), { n: [P[5], P[6]] }); });   // the grey-brown bands lift less, so the wave stays garnet
    if (big < 0.1) { const k = big / 0.1; wave(0.35 + sm(k) * 1.8, 0.14, 2.5 - k); }
    else if (rp < 1) wave(1.02 + rp * 1.0, 0.1, rp < 0.6 ? 1.5 : 1);
    // the heart: two sprites, the bigger one on the beat
    D.lay('mid'); const spr = HSPR[b > 0.55 || bb > 0.3 ? 1 : 0], lift = Math.round((b > 0.55 ? 0.6 : 0) + bb * 1.2);
    spr.forEach(([x, y, m, tt]) => D.px(HC[0] + x, HC[1] + y, m, tt > 3 ? tt + lift : tt, G));
    // a pulse down every artery after each beat (it fades out where the vessel sinks into the stone)
    ART.forEach((A, i) => { D.lay('back'); runPulse(D, A.live, (ph - 0.03) * 60 - A.depth * 8, 'candy', 9, 4); });
    // motes rising through the hollow
    D.lay('mid'); MOTES.forEach(([x0, p0, sp, w]) => { const q = (p0 + t * sp) % 1, y = 80 - q * 56, x = x0 + Math.sin(t * 0.9 + w) * 3; if (!inCav(x, y)) return; D.px(x, y, 'candy', q < 0.6 ? 8 : 6, G); });
    // the great beat: the heart throws sparks
    if (big < 0.08) burstPx(D, HC[0], HC[1] - 4, big / 0.08, 12, 'candy', 10, 28);
    if (big < 0.02 && !st.g) { st.g = 1; rs.flash(1, 1.4); } if (big > 0.5) st.g = 0;
  },
});
X.TILEF.heart = (D, t) => {
  // a garnet vein along the floor; a heartbeat pulse runs it left to right
  const p = steps(t, 2.5) * 190 - 20;
  for (let x = 3; x < 147; x++) { const y = 93 + Math.round(Math.sin(x * 0.11) * 1.2 + Math.sin(x * 0.041 + 1) * 0.8), d = p - (x - 3), glow = d >= 0 && d < 9 ? 10 - d : 0;
    D.px(x, y - 1, 'crimson', 3); D.px(x, y, glow ? 'candy' : 'crimson', glow ? clamp(glow, 7, 10) : 6, G); D.px(x, y + 1, 'crimson', 2);
    if (x % 23 === 11) { D.px(x, y - 2, 'crimson', 4); D.px(x - 1, y - 1, 'crimson', 5); D.px(x + 1, y - 1, 'crimson', 5); D.px(x, y - 1, 'candy', 8, G); } }
};

// ═════════ 陨星坑 star ═════════
// a buried impact crater in section. Below the old ground surface the beds it punched through are dragged down round
// its bowl, pale shatter streaks radiate through them and a pale ejecta blanket lies on the surface by the rim, with
// black glass beads (tektites) in it. The bowl holds a lens of rubble with younger beds sagging into it from above,
// and at its bottom lies the fallen star: a dark iron stone cut open by the section, its face etched with crossing
// Widmanstätten lines under a black fusion crust; starlight shows only in its cracks. Every 10 s a shooting star
// falls into the crater, the cracks flare and an echo runs out along the shatter streaks
const SGEO = 7, SBX = 75, SBR = 48, SBD = 52, SMT = [75, 69], SMR = [20, 12.5], SMP = [75, 66];
const sSurf = (x) => 30 + Math.sin(x * 0.06) * 1.2 + (vnoise(x / 7, 3, 336) - 0.5) * 2 - 2 * Math.exp(-(((Math.abs(x - SBX) - SBR) / 5) ** 2));   // the old ground surface, raised at the rim
const sBot = (x) => { const u = (x - SBX) / SBR; return 30 + SBD * (1 - u * u); };
const inSB = (x, y) => Math.abs(x - SBX) < SBR && y >= sSurf(x) && y <= sBot(x) + (vnoise(x / 4, y / 4, 21) - 0.5) * 1.4;
const inSM = (x, y) => ed(x, y, SMT[0], SMT[1], SMR[0], SMR[1]) < 1 + (vnoise(x / 4, y / 4, 23) - 0.5) * 0.24;
// distance from the bowl (chamfer), for the drag on the old beds and the shatter streaks
const SDB = new Float32Array(W * H); { for (let p = 0; p < W * H; p++) SDB[p] = inSB(p % W, (p / W) | 0) ? 0 : 999;
  const pass = (y0, y1, dy, x0, x1, dx) => { for (let y = y0; y !== y1; y += dy) for (let x = x0; x !== x1; x += dx) { const p = y * W + x; let v = SDB[p]; const a = x - dx, b = y - dy; if (a >= 0 && a < W) v = Math.min(v, SDB[y * W + a] + 1); if (b >= 0 && b < H) { v = Math.min(v, SDB[b * W + x] + 1); if (a >= 0 && a < W) v = Math.min(v, SDB[b * W + a] + 1.41); } SDB[p] = v; } };
  pass(0, H, 1, 0, W, 1); pass(H - 1, -1, -1, W - 1, -1, -1); pass(0, H, 1, W - 1, -1, -1); pass(H - 1, -1, -1, 0, W, 1); }
// old beds 3–6 px thick with a thin pale marker every fifth; young beds 2–3 px, warmer
const mkBeds = (n, s, thin) => { const B = [], K = []; let b = -30; for (let i = 0; i < n; i++) { B.push(b); K.push(i % (thin ? 4 : 5)); b += thin ? (i % 4 === 3 ? 1 : 2 + Math.floor(hh(i, 2, s) * 2)) : i % 5 === 4 ? 2 : 3 + Math.floor(hh(i, 1, s) * 4); } return [B, K]; };
const [SOB, SOK] = mkBeds(50, 328), [SYB, SYK] = mkBeds(70, 338, 1);
const SOLD = [['stone', 5], ['rock', 4.2], ['mstone', 4.6], ['stone', 3.2], ['stone', 7]], SYNG = [['earth', 3.4], ['earth', 4.4], ['mstone', 3.4], ['earth', 5.4]];
const bedAt = (B, bv) => { let lo = 0, hi = B.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (B[m] <= bv) lo = m; else hi = m - 1; } return lo; };
// the young beds sag over and into the crater (deeper the lower they lie); the old ones are dragged down by its wall
const sYoung = (x, y) => { const u = (x - SBX) / SBR, c = Math.max(0, 1 - u * u), s = y < 30 ? 12 * c * Math.pow(clamp(1 - (30 - y) / 24, 0, 1), 1.5) : 12 * c + (y - 30) * 0.42 * c; return y - s; };
const sOld = (x, y) => { const k = Math.max(0, 1 - SDB[y * W + x] / 26); return y - 8 * k * k + x * 0.02; };
// shatter streaks: out through the old beds from the impact, starting at the bowl's wall
const SRAY = []; { const r = X.rng(327), n = 15; for (let i = 0; i < n; i++) { const a = -0.25 + (i + 0.25 + r() * 0.5) / n * (Math.PI + 0.5) - 0.0, dx = Math.cos(a), dy = Math.sin(a); let x = SMP[0], y = SMP[1], k = 0; while (k < 90 && inSB(Math.round(x), Math.round(y))) { x += dx; y += dy; k++; }
  const L = 14 + Math.floor(r() * 18), pts = []; for (let j = 0; j < L; j++) { const X2 = Math.round(x + dx * (j + 1)), Y2 = Math.round(y + dy * (j + 1)); if (!inFill(X2, Y2, SGEO) || inSB(X2, Y2) || Y2 < sSurf(X2) + 1) break; const l = pts[pts.length - 1]; if (!l || l[0] !== X2 || l[1] !== Y2) pts.push([X2, Y2]); }
  if (pts.length > 4) SRAY.push({ pts, a, i }); } }
// tektites: black glass beads fallen on the old surface round the crater, a few buried a little higher
const STEK = [[16, 38], [33, 19], [52, 13], [118, 16], [134, 36], [21, 64], [131, 66], [112, 90]].map(([x, y], i) => [x, y, i % 3, i * 2.3, 0.6 + (i % 4) * 0.3]).filter(([x, y]) => inFill(x - 2, y - 2, SGEO) && inFill(x + 2, y + 2, SGEO) && !inSB(x, y + 3));
// cracks across the stone out from a bright core; the etched lines of its face (for the sheen that crosses it)
const SCORE = [SMT[0] + 3, SMT[1] - 3], SCR = []; { const r = X.rng(326); [-2.75, -1.9, -0.45, 0.35, 2.3].forEach((a) => walk(r, SCORE[0], SCORE[1], a, 10 + Math.floor(r() * 9), { wig: 0.8, to: a, pull: 0.14, br: 0.1, maxD: 1, x0: 6, y0: 6 }, SCR)); SCR.forEach(C => { C.pts = C.pts.filter(([x, y]) => inSM(x, y) && inSM(x + 1, y + 1) && inSM(x - 1, y - 1)); }); }
const SCP = [].concat(...SCR.map(C => C.pts));
const SWA = [0.32, 0.32 + Math.PI / 3, 0.32 + 2 * Math.PI / 3], SWL = [];
X.def('_tile_star', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: SMT[0], y: SMT[1] - 5, z: 18, r: 74, i: 1.1, c: '#9fb8ff', tint: 0.2 });                           // 0 the fallen star (breathes, flares: rs.mul)
    sc.light({ x: 75, y: 60, z: 10, r: 1, i: 1, c: '#9fb8ff', fl: 'pulse', amp: 0.45, sp: 1.1, tint: 0 });             // 1 lights nothing: the cracks breathe with it
    bed(S, 7, (x, y, r2) => fillE(x, y, SGEO) < 1 + r2 / 50);
    // the ground: old beds under the surface, young beds over it and down into the bowl, a rubble lens at its bottom
    const r = X.rng(324), cl = []; for (let i = 0; i < 40; i++) { const x = SBX + (r() - 0.5) * 70; cl.push([x, sBot(x) - r() * 20, r() < 0.35 ? ['mstone', 5.2] : r() < 0.6 ? ['stone', 4.6] : ['rock', 6.4], r() * 1.2]); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!inFill(x, y, SGEO)) continue; const sf = sSurf(x), inB = inSB(x, y);
      if (!inB && y >= sf) { const bv = sOld(x, y) + (vnoise(x / 14, y / 10, 331) - 0.5) * 1.4, i = bedAt(SOB, bv), f = bv - SOB[i], th = SOB[i + 1] - SOB[i], [m, tn] = SOLD[SOK[i]]; S.px(x, y, m, tn + (f < 1 ? 0.8 : f >= th - 1 && th > 2 ? -0.8 : 0), { n: [0, f < 1 ? -0.5 : 0] }); continue; }
      const u = (x - SBX) / SBR, rub = inB && y > sBot(x) - 3 - 19 * Math.sqrt(Math.max(0, 1 - u * u)) + (vnoise(x / 4, 7, 339) - 0.5) * 4;
      if (rub) { let d1 = 1e9, d2 = 1e9, bi = 0; for (let i = 0; i < cl.length; i++) { const dx = x - cl[i][0], dy = (y - cl[i][1]) * 1.25, d = Math.abs(dx) + Math.abs(dy) * 0.9 + Math.max(Math.abs(dx), Math.abs(dy)) * 0.6; if (d < d1) { d2 = d1; d1 = d; bi = i; } else if (d < d2) d2 = d; }
        const c = cl[bi], edge = d2 - d1 < 1.7; S.px(x, y, edge ? 'rock' : c[2][0], edge ? 1.6 : c[2][1] - 1 + c[3] + ((x - c[0]) + (y - c[1]) < -2 ? 0.9 : 0), { n: [0, 0] }); continue; }
      const bv = sYoung(x, y), i = bedAt(SYB, bv), f = bv - SYB[i], [m, tn] = SYNG[SYK[i]]; S.px(x, y, m, tn + (f < 1 ? 0.5 : 0), { n: [0, 0] }); }
    S.noise(6, 6, W - 12, H - 12, 1, 4, 332, { only: 'stone' });
    // the ejecta blanket: a pale wedge on the old surface, thinning away from the rim
    for (let x = 6; x < W - 6; x++) { const d = Math.abs(x - SBX) - SBR; if (d < -1 || d > 34) continue; const sf = Math.round(sSurf(x)), th = Math.round(3.2 * (1 - d / 34) + (vnoise(x / 3, 5, 340) - 0.5) * 1.2); for (let k = 1; k <= th; k++) { const y = sf - k; if (!inFill(x, y, SGEO)) continue; S.px(x, y, 'stone', k === th ? 6.6 : hh(x, y, 341) < 0.2 ? 3.6 : 5.6); } if (inFill(x, sf, SGEO)) S.px(x, sf, 'rock', 1.5); }
    // the bowl's wall: a dark seam inside, a pale shocked lip outside where it faces up
    for (let y = 20; y < H - 4; y++) for (let x = 5; x < W - 5; x++) { const a = inSB(x, y); if (a && y > sSurf(x) + 1 && (!inSB(x - 1, y) || !inSB(x + 1, y) || !inSB(x, y + 1))) S.px(x, y, 'ink', 1); else if (!a && inFill(x, y, SGEO) && inSB(x, y - 1) && y > sSurf(x) + 2) S.px(x, y, 'stone', 7, { n: [0, -0.7] }); }
    // shatter streaks, pale and dashed, fading out
    SRAY.forEach(R => R.pts.forEach(([x, y], k) => { const f = k / R.pts.length; if (f > 0.35 && hh(R.i, k, 334) < f * 0.5) return; S.px(x, y, 'linen', 6.4 - f * 2.4); if (k < 4 && k % 2 === 0) S.px(x + (Math.abs(Math.cos(R.a)) < 0.6 ? 1 : 0), y + (Math.abs(Math.cos(R.a)) < 0.6 ? 0 : 1), 'linen', 4.8); }));
    // tektites: black glass drops with a glint
    STEK.forEach(([x, y, k]) => { S.beg(); S.spr(x - 1, y - 1, [['.#.', '###', '.#.'], ['.##', '###', '##.', '#..'], ['##.', '###', '.##']][k], { '#': ['night', 1.4] }); S.px(x - (k === 1 ? 0 : 1), y - (k === 1 ? 1 : 0), 'glass', 7.5, { n: [-0.5, -0.5] }); S.end(); });
    // the fallen star: black fusion crust round a cut face etched with crossing lines (a dark partner under each bright one)
    S.lay('mid'); S.beg(); SWL.length = 0;
    for (let y = SMT[1] - 16; y <= SMT[1] + 16; y++) for (let x = SMT[0] - 24; x <= SMT[0] + 24; x++) { if (!inSM(x, y)) continue; const u = (x - SMT[0]) / SMR[0], v = (y - SMT[1]) / SMR[1];
      const c1 = !inSM(x - 1, y) || !inSM(x + 1, y) || !inSM(x, y - 1) || !inSM(x, y + 1), c2 = !inSM(x - 2, y) || !inSM(x + 2, y) || !inSM(x, y - 2) || !inSM(x, y + 2);
      if (c1 || c2) { S.px(x, y, 'iron', (c1 ? 1 : 2) + (u + v < -0.6 ? 2.4 : 0), { n: [u * 0.8, v * 0.8] }); continue; }
      let tn = 3 - v * 0.9 - u * 0.5, bright = false, dark = false;
      SWA.forEach((a, k) => { const c = x * Math.cos(a) + y * Math.sin(a), al = -x * Math.sin(a) + y * Math.cos(a), m = ((c % 5) + 5) % 5; if (hh(Math.floor(c / 5), Math.floor(al / 7), 40 + k) < 0.3) return; if (m < 1) bright = true; else if (m < 2) dark = true; });
      if (bright) { tn += 4.4; SWL.push([x, y]); } else if (dark) tn -= 1.2;
      S.px(x, y, 'iron', tn, { n: [u * 0.6, v * 0.6] }); }
    S.end();
    // cracks: a dark lip under a seam of starlight, a core where it pours out
    SCR.forEach(C => C.pts.forEach(([x, y], k) => { S.px(x + 1, y + 1, 'iron', 0.5); S.px(x, y, 'ice', clamp(10.2 - k * 0.28 - C.depth * 1.2, 7, 10.2), { e: 2 }); if (k < 5 && !C.depth) S.px(x, y - 1, 'ice', 8.6, { e: 2 }); }));
    S.ell(SCORE[0], SCORE[1], 3, 2.2, 'ice', 9.8, { e: 2 }); S.px(SCORE[0], SCORE[1], 'linen', 11, G); S.px(SCORE[0] - 1, SCORE[1], 'ice', 10.5, G);
    // rubble lapping over the stone's foot
    S.lay('front'); [[56, 81, 4], [63, 83, 3], [70, 84, 2.5], [83, 83.5, 3.5], [92, 81, 4]].forEach(([x, y, s], i) => { S.beg(); S.poly([[x - s, y + 1], [x - s * 0.6, y - s * 0.8], [x + s * 0.3, y - s], [x + s, y - s * 0.3], [x + s * 0.8, y + 1]], i % 2 ? 'mstone' : 'rock', i % 2 ? 4.6 : 5.6); S.hl(x - s * 0.6 + 1, Math.round(y - s * 0.8), Math.max(1, Math.round(s * 0.8)), i % 2 ? 'mstone' : 'rock', i % 2 ? 6.2 : 7.4); S.end(); });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10), fall = q > 0.91 ? (q - 0.91) / 0.09 : -1, hitK = q < 0.16 ? q / 0.16 : -1;
    rs.mul[0] = 1 + 0.07 * Math.sin(t * 1.3) + (hitK >= 0 ? (1 - hitK) * (1 - hitK) * 1.6 : 0);
    // a sheen crosses the etched face every 5 s
    D.lay('mid'); const sw = steps(t, 5) * 80 - 30; SWL.forEach(([x, y]) => { const d = (x - SMT[0]) + (y - SMT[1]) * 0.7 - sw; if (d > -2.5 && d < 2.5) D.px(x, y, 'iron', 10.6 - Math.abs(d) * 0.9, G); });
    // starlight twinkles in the cracks and creeps along them; motes of it rise out of the core
    for (let i = 0; i < 3; i++) { const c = t * 0.55 + i / 3, n = Math.floor(c), f = c - n, p = SCP[Math.floor(hh(n, i, 335) * SCP.length)]; if (p) star4(D, p[0], p[1], i ? 'ice' : 'linen', i ? 10.5 : 11, Math.sin(f * Math.PI)); }
    SCR.forEach((C, i) => runPulse(D, C.pts, (t * 5 + i * 7) % (C.pts.length + 14), 'ice', 10.6, 3));
    for (let i = 0; i < 4; i++) { const k = (t * 0.22 + i / 4) % 1, x = SCORE[0] + Math.sin(t * 0.8 + i * 1.9) * (3 + k * 6), y = SCORE[1] - 3 - k * 28; if (k < 0.85) D.px(x, y, 'ice', k < 0.5 ? 9.5 : 8, G); }
    // the tektites catch the light now and then
    D.lay('wall'); STEK.forEach(([x, y, k, p, sp]) => { const a = Math.sin(t * sp + p); if (a > 0.8) D.px(x - (k === 1 ? 0 : 1), y - (k === 1 ? 1 : 0), 'glass', 10.5, G); });
    // the impact: the cracks run white, sparks ring out, an echo runs out along every streak
    if (hitK >= 0) { D.lay('mid'); SCR.forEach(C => runPulse(D, C.pts, hitK * 40, 'linen', 11, 6)); if (hitK < 0.5) { D.lay('front'); burstPx(D, SCORE[0], SCORE[1], hitK / 0.5, 12, 'ice', 10.5, 16); }
      D.lay('wall'); SRAY.forEach(R => runPulse(D, R.pts, (hitK - 0.1) * 60 - (R.i % 3) * 2, 'ice', 9.6, 5)); }
    // the shooting star: in from the upper left, down into the crater
    if (fall >= 0) { const x0 = 10, y0 = 3, x1 = SCORE[0], y1 = SCORE[1], k = fall * fall, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; D.lay('front');
      for (let j = 1; j < 18; j++) { const b = Math.max(0, k - j * 0.013), xx = x0 + (x1 - x0) * b, yy = y0 + (y1 - y0) * b; D.px(xx, yy, j < 3 ? 'linen' : 'ice', j < 3 ? 11 : Math.max(6, 10.6 - j * 0.35), G); }
      star4(D, x, y, 'linen', 11, 1); }
    if (q < 0.03 && !st.h) { st.h = 1; rs.flash(0, 1.3); rs.flash(1, 1); rs.burst('mist', SCORE[0], SCORE[1] - 4, 4, { sp: 8, ang: 0, spread: 1.6, life: 1.4 }); } if (q > 0.5) st.h = 0;
  },
});
X.TILEF.star = (D, t) => {
  // a thread of black impact glass wandering along the floor, pale starlight specks in it and a tektite bead now and then
  const yy = (x) => 95 + Math.round(Math.sin(x * 0.08 + 2) * 1.1 + Math.sin(x * 0.21) * 0.5);
  for (let x = 3; x < 147; x++) { const y = yy(x); D.px(x, y, 'night', 1, FZ(y)); if (hh(x, 6, 8) < 0.1) { const a = Math.sin(t * (0.9 + hh(x, 4, 8) * 1.8) + hh(x, 5, 8) * 9); D.px(x, y, 'ice', a > 0.7 ? 10.5 : 6.5, G); } }
  [19, 58, 97, 131].forEach((x, i) => { const y = yy(x) - 1; D.px(x, y, 'night', 1.5, FZ(y)); D.px(x + 1, y, 'night', 1.5, FZ(y)); D.px(x, y + 1, 'night', 1, FZ(y + 1)); D.px(x + 1, y + 1, 'night', 1, FZ(y + 1)); D.px(x, y, 'glass', Math.sin(t * 1.1 + i * 2.1) > 0.75 ? 10.5 : 7.5, G); });
};

// ═════════ 雷暴核心 storm ═════════
// a round pocket in blue slate with a ball of lightning caught in it: filaments writhe out from it to the pocket's glassy
// wall like a plasma globe, ions circle it, and lightning-glass (fulgurite) branches out through the stone. Every 7 s it charges,
// then a bolt runs the longest fulgurite out to the edge of the cell and the whole ground flashes
const SO = [75, 51], SCAV = [75, 51, 31, 25], SGE2 = 3, SFO = { amp: 0.17, p: 3.6 };
const inPock = (x, y) => ed(x, y, SCAV[0], SCAV[1], SCAV[2], SCAV[3]) < 1 + (vnoise(x / 3.5, y / 3.5, 31) - 0.5) * 0.34 + (vnoise(x / 9, y / 9, 34) - 0.5) * 0.2;
const FUL = []; { const r = X.rng(331); [-2.8, -2.05, -1.2, -0.35, 0.5, 1.45, 2.4].forEach((a, i) => walk(r, SO[0] + Math.cos(a) * SCAV[2], SO[1] + Math.sin(a) * SCAV[3], a, 30 + Math.floor(r() * 26) + (Math.abs(Math.cos(a)) > 0.8 ? 18 : 0), { wig: 1.1, to: a, pull: 0.22, br: Math.abs(Math.cos(a)) > 0.8 ? 0.035 : 0.05, maxD: 1, x0: 7, y0: 7 }, FUL)); }
// slate stratigraphy: a dipping, gently bent bedding coordinate, stepped across three faults; laminae of 2–5 px
const SFAULT = [[46, 0.32, 3], [79, -0.18, -2], [108, 0.4, 2]];
const slateS = (x, y) => { let s = y + Math.sin(x * 0.07) * 2.2 + x * 0.12 + (vnoise(x / 16, y / 11, 35) - 0.5) * 1.8; SFAULT.forEach(([fx, sl, off]) => { if (x > fx + (y - 50) * sl) s += off; }); return s; };
const SLB = [], SLT = []; { let b = -12; for (let i = 0; i < 60; i++) { SLB.push(b); SLT.push(hh(i, 1, 36) < 0.3 ? 3 : 2); b += 2 + Math.floor(vnoise(i * 0.8, 0.5, 36) * 4); } }
const slateI = (sv) => { let lo = 0, hi = SLB.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (SLB[m] <= sv) lo = m; else hi = m - 1; } return lo; };
const FMAIN = FUL.filter(F => F.depth === 0).sort((a, b) => b.pts.length - a.pts.length)[0];
// a jagged bolt between two points: continuous noise bends it, so it writhes rather than blinks
function bolt(D, x0, y0, x1, y1, t, seed, amp, m, tn, n) {
  n = n || 7; const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; let px = x0, py = y0;
  for (let k = 1; k <= n; k++) { const f = k / n, o = k < n ? n1(t * 16 + seed * 7.3 + k * 1.9) * amp * Math.sin(f * Math.PI) : 0, qx = x0 + dx * f + nx * o, qy = y0 + dy * f + ny * o; D.line(px, py, qx, qy, m, tn, G); px = qx; py = qy; }
}
X.def('_tile_storm', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: SO[0], y: SO[1], z: 18, r: 80, i: 1.05, c: '#8ff6ff', tint: 0.36 });                          // 0 the ball (crackles: rs.mul)
    sc.light({ x: 75, y: 50, z: 12, r: 1, i: 1, c: '#8ff6ff', fl: 'pulse', amp: 0.5, sp: 2.3, tint: 0 });       // 1 lights nothing: the fulgurites breathe with it
    bed(S, 3, (x, y, r2) => fillE(x, y, SGE2, SFO) < 1 + r2 / 50);
    // blue slate round the pocket: split laminae 2–5 px thick, each with a lit upper edge and a dark underside,
    // stepped along three faults, a few cleavage seams across them; it breaks off in chunks into the rock
    const SL = new Int16Array(W * H).fill(-1), SF = new Float32Array(W * H);
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { if (!inFill(x, y, SGE2, SFO)) continue;
      const sv = slateS(x, y), i = slateI(sv), f = sv - SLB[i], p = y * W + x; SL[p] = i; SF[p] = f;
      S.px(x, y, 'scifi', SLT[i], { n: [0, 0] }); }
    S.noise(8, 4, W - 16, H - 8, 1, 5, 33, { only: 'scifi' });
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { const p = y * W + x, i = SL[p]; if (i < 0) continue; const th = SLB[i + 1] - SLB[i], f = SF[p];
      if (f < 1 && vnoise(x / 8, i * 2.7, 38) > 0.22) S.px(x, y, 'scifi', 4, { n: [0, -0.6] });
      else if (f >= th - 1 && th > 2) S.px(x, y, 'scifi', 1, { n: [0, 0.5] }); }
    // the faults: a dark hairline where the laminae step
    SFAULT.forEach(([fx, sl, off]) => { for (let y = 6; y < H - 6; y++) { const x = Math.round(fx + (y - 50) * sl); if (SL[y * W + x] < 0 || hh(x, y, 39) < 0.25) continue; S.px(x, y, 'scifi', 0); if (SL[y * W + x + 1] >= 0) S.px(x + 1, y, 'scifi', 3); } });
    // cleavage seams: short dark cracks across the grain, a lit lip under each
    { const r = X.rng(334); for (let c = 0; c < 9; c++) { let x = 10 + r() * 130, y = 8 + r() * 88; const a = 1.15 + (r() - 0.5) * 0.5, len = 5 + Math.floor(r() * 9); if (SL[Math.round(y) * W + Math.round(x)] < 0) continue;
      for (let k = 0; k < len; k++) { const p = Math.round(y) * W + Math.round(x); if (SL[p] < 0) break; S.px(x, y, 'scifi', 0); if (SL[p + W] >= 0) S.px(x, y + 1, 'scifi', 3.6); x += Math.cos(a) + (r() - 0.5) * 0.6; y += Math.sin(a); } } }
    // fulgurites: branching tubes of lightning glass, dark lips, a core that breathes
    FUL.forEach(F => F.pts.forEach(([x, y], k) => { const w = F.depth === 0 && k < F.pts.length * 0.6; S.px(x + 1, y + 1, 'night', 1); if (w) { S.px(x, y - 1, 'glass', 3); S.px(x - 1, y, 'glass', 3); } S.px(x, y, F.depth ? 'ice' : 'teal', F.depth ? 6 : 7, { e: 2 }); }));
    // the pocket: black inside, a glassy rim
    for (let y = 18; y < 86; y++) for (let x = 38; x < 113; x++) { if (!inPock(x, y)) continue; const e = ed(x, y, SCAV[0], SCAV[1], SCAV[2], SCAV[3]); S.px(x, y, e > 0.86 ? 'glass' : 'night', e > 0.86 ? 2 : 0.6 + (y - SO[1]) / 18 * 0.4, { n: [0, 0] }); if (!inPock(x, y - 1)) S.px(x, y, 'ink', 0); if (!inPock(x, y + 1)) S.px(x, y, 'glass', 5, { n: [0, -0.8] }); }
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 7), charge = q > 0.75 ? (q - 0.75) / 0.25 : 0, hit = q < 0.1 ? 1 - q / 0.1 : 0;
    rs.mul[0] = 0.9 + 0.12 * n1(t * 13) + 0.1 * n1(t * 31) + charge * 0.5 + hit * 1.2;
    // the ball: churning bands round a white core
    D.lay('mid'); const Rb = 12 + charge * 1.5 + hit * 1.5;
    for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) { const d = Math.hypot(x, y); if (d > Rb) continue; const an = Math.atan2(y, x), sw = Math.sin(an * 3 + t * 4.2 - d * 0.7) + Math.sin(an * 2 - t * 2.7 + d * 0.5) * 0.6;
      let tn = 5.5 + (1 - d / Rb) * 5 + (sw > 0.7 ? 1.4 : sw < -0.9 ? -1.2 : 0) + charge * 1.2 + hit; if (d > Rb - 1) tn = Math.min(tn, 6.5); tn = clamp(tn, 4, 11.4); D.px(SO[0] + x, SO[1] + y, tn > 8.5 ? 'teal' : 'ice', tn > 8.5 ? Math.min(11, tn) : tn, G); }
    D.px(SO[0] - 4, SO[1] - 5, 'linen', 11, G); D.px(SO[0] - 5, SO[1] - 4, 'linen', 10, G); D.px(SO[0] - 3, SO[1] - 5, 'linen', 10, G); D.px(SO[0] - 4, SO[1] - 4, 'linen', 10, G);
    // filaments: they wander round the ball and strike the pocket wall, which glows where they land
    for (let i = 0; i < 6; i++) { const an = i * 1.047 + Math.sin(t * (0.5 + i * 0.13) + i * 1.7) * 0.7 + t * 0.15, on = Math.sin(t * (1.7 + i * 0.41) + i * 2.3) + charge * 1.5; if (on < -0.2) continue;
      const sx = SO[0] + Math.cos(an) * (Rb - 1), sy = SO[1] + Math.sin(an) * (Rb - 1); let ex = sx, ey = sy; for (let k = 0; k < 40; k++) { const nx = ex + Math.cos(an), ny = ey + Math.sin(an); if (!inPock(Math.round(nx), Math.round(ny))) break; ex = nx; ey = ny; }
      bolt(D, sx, sy, ex, ey, t, i, 2.8, on > 0.6 ? 'teal' : 'ice', on > 0.6 ? 10 : 8, 6); D.px(ex, ey, 'linen', 11, G); D.px(ex + Math.cos(an), ey + Math.sin(an), 'teal', 9, G); }
    // ions circling the ball
    for (let i = 0; i < 7; i++) { const a = t * (1.6 + i * 0.13) + i * 0.9, rr = 16 + (i % 3) * 3, x = SO[0] + Math.cos(a) * rr, y = SO[1] + Math.sin(a) * rr * 0.55 * (i % 2 ? 1 : -1); D.px(x, y, 'teal', Math.sin(a) > 0 ? 9 : 7, G); }
    // pulses creep out along the fulgurites
    D.lay('wall'); FUL.forEach((F, i) => { if (F.depth) return; runPulse(D, F.pts, (t * 14 + i * 17) % (F.pts.length + 30), 'teal', 10, 3); });
    // the strike: a bolt down the longest fulgurite to the edge of the cell
    if (hit > 0) { const n = FMAIN.pts.length, reach = Math.min(n, Math.round((1 - hit) * 5 * n + 2)); for (let k = 0; k < reach; k++) { const [x, y] = FMAIN.pts[k], j = Math.round(n1(t * 40 + k * 0.7) * hit * 1.4); D.px(x + j, y, 'linen', 11, G); D.px(x + j + 1, y, 'teal', hit > 0.5 ? 10 : 8, G); }
      FUL.forEach(F => { if (F.depth !== 1) return; F.pts.forEach(([x, y], k) => { if (k < 10 * hit) D.px(x, y, 'teal', 9, G); }); });
      const e = FMAIN.pts[Math.max(0, n - 10)], Rs = clamp(Math.min(W - 9 - e[0], e[0] - 9, H - 13 - e[1], e[1] - 9), 5, 14); if (reach >= n) burstPx(D, e[0], e[1], 1 - hit, 8, 'teal', 10, Rs); }
    if (q < 0.02 && !st.s) { st.s = 1; rs.flash('all', 0.5); rs.burst('mist', SO[0], SO[1], 5, { sp: 10, life: 1.2 }); } if (q > 0.5) st.s = 0;
  },
});
X.TILEF.storm = (D, t) => {
  // a vein of lightning glass along the floor; a spark races it now and then
  const p = steps(t, 3.1) * 260 - 30;
  for (let x = 3; x < 147; x++) { const y = 94 + ((Math.floor(x / 5) + (x % 5 < 3 ? 0 : 1)) % 2 ? -1 : 0) + Math.round(Math.sin(x * 0.05) * 0.6), d = p - x;
    D.px(x, y - 1, 'glass', 3); D.px(x, y, 'teal', d >= 0 && d < 8 ? 11 - d * 0.6 : 5, G); D.px(x, y + 1, 'night', 1);
    if (d >= 0 && d < 2 && Math.sin(t * 40 + x) > 0) { D.px(x, y - 2, 'teal', 9, G); D.px(x + 1, y - 3, 'teal', 8, G); } }
};

// ═════════ 英灵冢 bones ═════════
// a barrow sealed in the rock: a vaulted chamber of dry stone, skulls in niches, a cairn of bones in the middle and a
// hero's sword planted in it, a torn pennant on its guard. Pale spirit-light: skull eyes glow, wisps drift, souls rise.
// Every 9 s the sword wakes: runes climb the blade, every skull's eyes flare, the pennant lifts and souls pour up
const BX = 75, BFL = 83, BV = [75, 83, 50, 58];
const inVault = (x, y) => y < BFL && ed(x, y, BV[0], BV[1], BV[2], BV[3]) < 1;
const cairnTop = (x) => { const u = (x - BX) / 34; return Math.abs(u) >= 1 ? BFL : BFL - 22 * (1 - u * u) * (0.9 + 0.1 * Math.cos(x * 0.7)); };
const SKULL = ['.###.', '#####', '#o#o#', '##.##', '.#.#.'];
const BSK = [[53, 79], [60, 76], [67, 73], [83, 73], [90, 76], [97, 79], [72, 78], [79, 78], [64, 80], [86, 80], [57, 82], [93, 82], [75, 74]];
const NICHE = [[38, 50], [112, 50], [48, 34], [102, 34]];
const SW = [BX, 34];   // sword: guard at y 34, the blade runs down into the cairn
const BBONES = []; { const r = X.rng(341); for (let i = 0; i < 40 && BBONES.length < 16; i++) { const x = 10 + r() * 130, y = 8 + r() * 90; if (ed(x, y, BV[0], BV[1] - 4, BV[2] + 8, BV[3] + 8) < 1 || x < 9 || x > 141 || y < 8 || y > 97) continue; BBONES.push([x, y, r() * 3.14, 4 + r() * 4, r() < 0.3]); } }
function skullAt(S, x, y, tn, eyeE) { S.spr(x - 2, y - 2, SKULL, { '#': ['bone', tn], o: ['lav', 2, { e: eyeE }] }); S.px(x - 2, y - 2, 'bone', tn + 1); S.px(x - 1, y - 2, 'bone', tn + 1.5); }
X.def('_tile_bones', {
  noFrame: 1, noFloor: 1, amb: [0.46, 0.4],
  paint(S, sc) {
    sc.light({ x: SW[0], y: SW[1] + 10, z: 16, r: 58, i: 1, c: '#d8c8ff', fl: 'pulse', amp: 0.08, sp: 0.8, tint: 0.3 });     // 0 the sword's pale light (wakes: rs.mul / flash)
    sc.light({ x: 75, y: 60, z: 10, r: 1, i: 1, c: '#e8e0ff', fl: 'pulse', amp: 0.35, sp: 1.6, tint: 0 });                   // 1 lights nothing: skull eyes and runes breathe with it
    bed(S, 5, (x, y) => ed(x, y, BV[0], BV[1] - 4, BV[2] + 6, BV[3] + 6) < 1.05);
    // grave earth round the barrow, with the bones of older burials in it
    for (let y = 6; y < H - 5; y++) for (let x = 6; x < W - 6; x++) { const e = ed(x, y, BV[0], BV[1] - 4, BV[2] + 14, BV[3] + 12) + (vnoise(x / 6, y / 6, 42) - 0.5) * 0.25; if (e > 1 || inVault(x, y)) continue; if (e > 0.85 && vnoise(x / 2.2, y / 2.2, 2) < (e - 0.85) / 0.15) continue; if (y > 89 && vnoise(x / 2.2, y / 2.2, 2) < (y - 89) / 8) continue; S.px(x, y, 'earth', 3 + (Math.floor(y / 6) % 2 ? 0 : 1), { n: [0, 0] }); }
    S.noise(6, 6, W - 12, H - 12, 1, 3, 43, { only: 'earth' });
    BBONES.forEach(([x, y, a, l, sk]) => { if (sk) { S.beg(); skullAt(S, x, y, 6, 0); S.end(); return; } const dx = Math.cos(a) * l, dy = Math.sin(a) * l; S.beg(); S.line(x - dx, y - dy, x + dx, y + dy, 'bone', 6); [[-1, -dx, -dy], [1, dx, dy]].forEach(([, ex, ey]) => { S.px(x + ex, y + ey, 'bone', 7); S.px(x + ex + 1, y + ey, 'bone', 5); S.px(x + ex, y + ey - 1, 'bone', 7); }); S.end(); });
    // the vault: dark inside, dry-stone voussoirs round it, a floor of packed earth
    for (let y = 20; y < BFL; y++) for (let x = 20; x < 131; x++) if (inVault(x, y)) S.px(x, y, 'lav', 1 + (y - 30) / 60, { n: [0, 0] });
    S.noise(25, 24, 100, 60, 1, 5, 44, { only: 'lav' });
    for (let y = 18; y < BFL; y++) for (let x = 18; x < 133; x++) { const e = ed(x, y, BV[0], BV[1], BV[2], BV[3]); if (e < 1 || e > 1.12) continue; const an = Math.atan2(y - BV[1], (x - BV[0]) * BV[3] / BV[2]), seg = Math.floor(an / 0.16), ring = e > 1.06 ? 1 : 0, joint = Math.abs(an / 0.16 - Math.round(an / 0.16)) < 0.09 || Math.abs(e - 1.06) < 0.008;
      S.px(x, y, 'stone', joint ? 2 : 5 + ((seg + ring) % 3 === 0 ? 1 : 0) - ring * 0.8, { n: [0, 0] }); }
    S.rect(24, BFL, 102, 4, 'earth', 4); S.hl(24, BFL, 102, 'earth', 6, { n: [0, -0.8] }); S.noise(24, BFL, 102, 4, 1, 2, 45, { only: 'earth' });
    // niches in the back wall, a skull in each
    NICHE.forEach(([x, y]) => { S.rect(x - 5, y - 3, 11, 9, 'night', 1); S.ell(x, y - 3, 5, 4, 'night', 1); S.rect(x - 6, y - 3, 1, 9, 'stone', 6); S.rect(x + 6, y - 3, 1, 9, 'stone', 3); for (let a = 0; a <= 12; a++) { const an = Math.PI + a / 12 * Math.PI; S.px(x + Math.cos(an) * 6, y - 3 + Math.sin(an) * 5, 'stone', a < 6 ? 6 : 4); } S.hl(x - 6, y + 6, 13, 'stone', 7, { n: [0, -0.8] }); S.hl(x - 6, y + 7, 13, 'stone', 3); S.beg(); skullAt(S, x, y + 3, 7, 2); S.end(); });
    // the cairn: packed bones and skulls heaped in the middle
    S.lay('back'); S.beg(); for (let x = BX - 34; x <= BX + 34; x++) { const top = Math.round(cairnTop(x)); for (let y = top; y < BFL + 1; y++) S.px(x, y, 'bone', 3 + (y - top < 2 ? 1 : 0) - (y - top) * 0.06, { n: [0, 0] }); } S.end();
    const r = X.rng(342); for (let i = 0; i < 26; i++) { const x = BX - 30 + r() * 60, y = cairnTop(x) + 1 + r() * (BFL - cairnTop(x) - 2), a = r() * 3.14, l = 2 + r() * 3; S.line(x - Math.cos(a) * l, y - Math.sin(a) * l, x + Math.cos(a) * l, y + Math.sin(a) * l, 'bone', 5 + r() * 2); }
    BSK.forEach(([x, y], i) => { S.beg(); skullAt(S, x, y, 7 + (i % 3 === 0 ? 1 : 0), 2); S.end(); });
    // the sword: blade into the cairn, guard, grip, pommel with a stone
    S.lay('mid'); S.beg(); const bx = SW[0] - 1, by = SW[1] + 3;
    S.rect(bx, by, 3, 34, 'iron', 7); S.vl(bx, by, 34, 'iron', 9, { n: [-0.6, 0] }); S.vl(bx + 2, by, 34, 'iron', 5, { n: [0.6, 0] }); for (let k = 2; k < 30; k += 3) S.px(bx + 1, by + k, 'lav', 6, { e: 2 });
    S.box(SW[0] - 7, SW[1], 15, 3, 'gold', 6); S.px(SW[0] - 8, SW[1] + 1, 'gold', 7); S.px(SW[0] + 8, SW[1] + 1, 'gold', 5); S.rect(SW[0] - 1, SW[1] - 7, 3, 7, 'leather', 4); for (let k = 0; k < 7; k += 2) S.hl(SW[0] - 1, SW[1] - 7 + k, 3, 'leather', 6);
    S.ell(SW[0] + 0.5, SW[1] - 9, 2.5, 2.2, 'gold', 7, { dome: 1 }); S.px(SW[0], SW[1] - 9, 'arcane', 9, { e: 2 }); S.end();
    S.lay('back'); for (let k = 0; k < 5; k++) S.px(SW[0] - 2 + k, cairnTop(SW[0]) - 1 + (k % 2), 'bone', 3);   // where the blade goes in
    sc.emit({ k: 'soul', x: BX, y: 70, w: 44, rate: 1.1, sp: 5, ang: 0, spread: 0.4, life: 3.2 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 9), wake = q < 0.3 ? Math.sin(q / 0.3 * Math.PI) : 0, climb = q < 0.14 ? q / 0.14 : -1;
    rs.mul[0] = 1 + wake * 0.9; rs.mul[1] = 1 + wake * 1.4;
    // runes climb the blade as it wakes
    if (climb >= 0) { const bx = SW[0], by = SW[1] + 3; for (let k = 2; k < 30; k += 3) if (30 - k < climb * 34) D.px(bx, by + k, 'arcane', 11 - Math.max(0, (30 - k) - climb * 30) * 0.1, G); }
    D.lay('mid'); if (wake > 0.2) { D.px(SW[0], SW[1] - 9, 'linen', 11, G); star4(D, SW[0], SW[1] - 9, 'linen', 11, wake); }
    // skull eyes: one pair at a time glints at rest; all of them flare when the sword wakes
    const eyes = BSK.map(([x, y]) => [x, y, 'back']).concat(NICHE.map(([x, y]) => [x, y + 3, 'wall'])), who = Math.floor(t / 1.7) % eyes.length, wk = steps(t, 1.7);
    eyes.forEach(([x, y, ly], i) => { const on = wake > 0.25 ? 1 : i === who && wk > 0.2 && wk < 0.8 ? 0.6 : 0; if (!on) return; D.lay(ly); D.px(x - 1, y, 'arcane', on > 0.8 ? 7 : 6, G); D.px(x + 1, y, 'arcane', on > 0.8 ? 7 : 6, G); if (on > 0.8) { D.px(x - 1, y + 1, 'arcane', 4, G); D.px(x + 1, y + 1, 'arcane', 4, G); } });
    // the pennant on the guard, stirred by the spirit wind
    D.lay('mid'); const lift = wake; D.beg(); for (let k = 0; k < 14; k++) { const f = k / 14, x = SW[0] + 7 + k, sag = (1 - lift) * f * f * 9, y = SW[1] + 2 + sag + Math.sin(t * 3.2 - k * 0.55) * (0.6 + f * 1.4) + (lift ? -f * 2 * lift : 0), hgt = Math.max(1, Math.round(5 - f * 2.5 - (k > 10 && k % 2 ? 1 : 0)));
      for (let j = 0; j < hgt; j++) D.px(x, y + j, 'crimson', j === 0 ? 6 : 4 - (k % 3 === 2 ? 1 : 0)); } D.end();
    // wisps: two pale lights wandering the vault
    for (let i = 0; i < 2; i++) { const x = BX + Math.sin(t * (0.31 + i * 0.12) + i * 3) * 36, y = 52 + Math.sin(t * (0.53 + i * 0.2) + i) * 14 - (i ? 6 : 0);
      if (!inVault(x, y)) continue; D.rect(x - 1, y - 1, 3, 3, 'lav', 10, G); D.px(x, y, 'linen', 11, G); D.px(x - 2, y, 'lav', 8, G); D.px(x + 2, y, 'lav', 8, G); D.px(x, y - 2, 'lav', 8, G); D.px(x, y + 2, 'lav', 8, G);
      const vx = Math.cos(t * (0.31 + i * 0.12) + i * 3); for (let k = 2; k < 8; k++) D.px(x - vx * k * 1.1, y + k * 0.5 + Math.sin(t * 3 + k) * 0.6, 'lav', 10 - k, G);
      rs.dl.push({ x, y, z: 14, r: 16, i: 0.5, rgb: [216, 200, 255], tint: 0.4 }); }
    if (q < 0.02 && !st.w) { st.w = 1; rs.flash(0, 0.8); rs.burst('soul', BX, 66, 9, { sp: 12, ang: 0, spread: 1.4, life: 2.4, w: 30 }); } if (q > 0.5) st.w = 0;
  },
});
X.TILEF.bones = (D, t) => {
  // a course of old bones along the floor; now and then a little skull's eyes glow
  let x = 3, j = 0; while (x < 147) { const l = 3 + Math.floor(hh(j, 1, 93) * 6), dy = hh(j, 2, 93) < 0.3 ? 1 : 0; for (let k = 0; k < l && x + k < 147; k++) { const end = k === 0 || k === l - 1; D.px(x + k, 94 + dy, 'bone', end ? 7 : 5); if (end) D.px(x + k, 93 + dy, 'bone', 6); D.px(x + k, 95 + dy, 'earth', 2); } x += l + 2 + Math.floor(hh(j, 3, 93) * 4); j++; }
  for (let i = 0; i < 5; i++) { const x = 16 + i * 29, y = 92, a = Math.sin(t * 0.8 + i * 2.4); D.spr(x - 2, y - 1, ['.###.', '#o#o#', '.#.#.'], { '#': ['bone', 7], o: ['lav', a > 0.5 ? 9 : 2, { e: 255 }] }); }
};

// ═════════ 时之沙 hourglass ═════════
// layered sands of time with clock gears fossilised in them — still turning; in a hollow among them a great hourglass
// floats, its sand running down in a thread of light. Every 10 s the lower bulb is full: the glass turns over, a ring of
// gold runs out through the sand and the grains in the strata stir
const HG = [75, 50], HGC = [75, 53, 35, 40], HP = 10, HV = 26, HU = 18, TGEO = 6;   // HV: half-height of a bulb, HU: outer half-width
const inHollow = (x, y) => ed(x, y, HGC[0], HGC[1], HGC[2], HGC[3]) < 1 + (vnoise(x / 5, y / 5, 51) - 0.5) * 0.14;
const bulbW = (a) => 1.4 + 13.2 * Math.pow(Math.max(0, Math.sin(a * Math.PI * 0.92)), 0.6);   // half-width of the glass at a = |v|/HV
// one pixel of the hourglass in its own frame (u across, v down from the neck); k = share of sand already run down
function hgPix(u, v, k, t) {
  const av = Math.abs(v), au = Math.abs(u);
  if (av >= HV && av < HV + 4 && au <= HU) { const edge = av >= HV + 3 || au >= HU; return ['gold', edge ? 4 : av === HV ? 8 : 6 - (u > HU - 7 ? 1 : 0), 0]; }   // end caps
  if (av < HV && au >= HU - 2 && au < HU) return ['wood', u < 0 ? (au < HU - 1 ? 7 : 5) : (au < HU - 1 ? 5 : 3), 0];                                     // posts
  if (av < HV && Math.round(av) % 8 === 4 && au >= HU - 3 && au < HU + 1) return ['gold', 7, 0];                                                       // post rings
  const w = bulbW(av / HV); if (av >= HV || au > w) return null;
  if (au > w - 1) return ['glass', u < 0 ? 9 : 6, 0];                                                                                              // the glass wall
  // sand: the upper bulb drains from its top down to the neck (a funnel dip), the lower one fills up (a heap)
  const sh = u < -w * 0.35 ? 1 : u > w * 0.45 ? -1 : 0;
  if (v < 0) { const lvl = -HV + (HV - 1) * k; if (v > lvl && v < 0) return ['gold', 8 + sh + (v - lvl < 1.2 ? 1 : 0), 1]; }
  else { const lvl = HV - (HV - 1) * k - Math.max(0, 6 - au) * 0.7 * (k > 0.02 ? 1 : 0); if (v > lvl) return ['gold', 7.6 + sh + (v - lvl < 1.2 ? 1.4 : 0), 1]; if (au < 1 && k < 0.985 && ((Math.round(v) + Math.floor(t * 24)) % 3)) return ['gold', 10, 1]; }
  // empty glass: see-through, a gleam down the left side
  if (u < -w * 0.45 && u > -w * 0.75 && av > 4 && av < HV - 3 && (v < 0 || av < 14)) return ['glass', 9, 1];
  return null;
}
const HGEARS = [[26, 29, 9, 7, 10, 0.25], [125, 73, 11, 8, 12, -0.2], [27, 79, 7, 5, 8, -0.4], [123, 26, 7, 5, 8, 0.35], [137, 50, 4, 2.5, 6, 0.5], [16, 54, 4, 2.5, 6, -0.45]];
function gearD(D, cx, cy, R0, R1, n, a, m, t0) {
  for (let y = -R0 - 1; y <= R0 + 1; y++) for (let x = -R0 - 1; x <= R0 + 1; x++) { const d = Math.hypot(x, y); if (d > R0 + 0.5) continue; const th = Math.atan2(y, x) - a, tooth = Math.cos(th * n) > 0.2;
    if (d > R1 + 0.5 && !tooth) continue; if (d < 1.8) { D.px(cx + x, cy + y, 'ink', 1); continue; } if (d < R1 - 1.5 && d > 2.8 && Math.abs(Math.sin(th * 2)) > 0.35) continue;
    D.px(cx + x, cy + y, m, t0 + (d > R1 - 1.5 && d <= R1 + 0.5 ? 1 : 0) - (x + y) / R0 * 1.2 - (d > R1 + 0.5 ? 0.6 : 0), { n: [x / (d || 1) * 0.5, y / (d || 1) * 0.5] }); }
}
const GRAINS = []; { const r = X.rng(352); for (let i = 0; i < 22; i++) GRAINS.push([r(), 10 + r() * 85, 3 + r() * 5, r() * 7]); }
const dune = (x, y) => y + Math.sin(x * 0.045 + y * 0.02) * 4 + Math.sin(x * 0.13) * 1.2;
X.def('_tile_hourglass', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: HG[0], y: HG[1], z: 18, r: 82, i: 1, c: '#ffe08a', fl: 'pulse', amp: 0.06, sp: 1, tint: 0.45 });   // 0 the hourglass (turns: rs.mul / flash)
    sc.light({ x: HG[0], y: 86, z: 6, r: 36, i: 0.5, c: '#ffc860', tint: 0.4 });                                        // 1 the glow it throws on the hollow's floor
    bed(S, 6, (x, y, r2) => fillE(x, y, TGEO) < 1 + r2 / 50);
    // the sands: wavy beds of gold and umber, cross-bedded, fading into the rock at the edges
    for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) { if (!inFill(x, y, TGEO)) continue;
      const d = dune(x, y), band = Math.floor(d / 4), sub = ((d % 4) + 4) % 4, cross = Math.floor((d + x * 0.35) / 2) % 5 === 0 && band % 3 === 1;
      S.px(x, y, band % 4 === 3 ? 'earth' : 'sand', band % 4 === 3 ? 4 : (band % 2 ? 4 : 5) + (sub < 1 ? 1 : 0) - (cross ? 1 : 0), { n: [0, 0] }); }
    S.noise(8, 6, W - 16, H - 12, 1, 3, 54, { only: 'sand' });
    // the hollow: shadowed sand behind, a lit rim, a drift of sand on its floor
    for (let y = 10; y < 97; y++) for (let x = 36; x < 115; x++) { if (!inHollow(x, y)) continue; S.px(x, y, 'sand', 1.4 + (y - 20) / 70, { n: [0, 0] }); if (!inHollow(x, y - 1)) S.px(x, y, 'sand', 0.6); if (!inHollow(x, y + 1)) S.px(x, y, 'sand', 6, { n: [0, -0.8] }); }
    S.noise(38, 12, 76, 84, 1, 4, 55, { only: 'sand' });
    S.lay('back'); S.beg(); for (let x = 44; x < 107; x++) { const hgt = 4 + Math.round(3 * Math.cos((x - 75) / 31 * 1.5)) + (x % 7 === 0 ? 1 : 0); for (let y = 0; y < hgt; y++) { const yy = 91 - y; if (inHollow(x, yy)) S.px(x, yy, 'sand', y === hgt - 1 ? 7 : 5 - (y < 2 ? 1 : 0), { n: [0, y === hgt - 1 ? -0.8 : 0] }); } } S.end();
    // gear sockets (the gears themselves turn)
    S.lay('wall'); HGEARS.forEach(([x, y, R0]) => { S.ell(x, y, R0 + 1.5, R0 + 1.5, 'earth', 2); });
    sc.emit({ k: 'dust', x: HG[0], y: 58, w: 62, h: 50, rate: 3, sp: 3, life: 3 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, HP), k = Math.min(1, q / 0.84), fl = q > 0.86 ? (q - 0.86) / 0.14 : 0, th = Math.PI * (fl < 0.5 ? 2 * fl * fl : 1 - 2 * (1 - fl) * (1 - fl)), post = q < 0.12 ? 1 - q / 0.12 : 0;
    rs.mul[0] = 1 + (fl > 0 ? Math.sin(fl * Math.PI) * 0.7 : 0) + post * post * 0.9;
    // fossil gears in the sand, turning a tooth at a time (smoothly)
    D.lay('wall'); HGEARS.forEach(([x, y, R0, R1, n, sp], i) => { const tick = t * sp * 1.2, a = (Math.floor(tick) + sm(tick - Math.floor(tick))) * 2 * Math.PI / n * Math.sign(sp); gearD(D, x, y, R0, R1, n, a, 'brass', 5 + (i % 2)); });
    // grains drifting along the beds
    GRAINS.forEach(([p, y0, sp, w]) => { const x = 8 + ((p * 134 + t * sp * (post ? 3 : 1)) % 134), y = y0 + Math.sin(x * 0.045 + y0 * 0.02) * -4; if (inHollow(x, y) || !inFill(x, y, TGEO)) return; D.px(x, y, 'gold', 9, G); D.px(x - 1, y, 'gold', 7, G); });
    // the hourglass floats, bobbing; while it turns it is drawn rotated, pixel by pixel
    D.lay('mid'); const cy = HG[1] + Math.round(Math.sin(t * 1.1) * 1.2), c = Math.cos(th), s2 = Math.sin(th), Rr = fl > 0 ? 35 : 0;
    D.beg();
    if (!Rr) { for (let v = -HV - 4; v <= HV + 3; v++) for (let u = -HU; u <= HU; u++) { const P = hgPix(u, v, k, t); if (P) D.px(HG[0] + u, cy + v, P[0], P[1], P[2] ? G : undefined); } }
    else for (let y = -Rr; y <= Rr; y++) for (let x = -Rr; x <= Rr; x++) { const u = Math.round(c * x + s2 * y), v = Math.round(-s2 * x + c * y); if (Math.abs(u) > HU || v < -HV - 4 || v > HV + 3) continue; const P = hgPix(u, v, 1, t); if (P) D.px(HG[0] + x, cy + y, P[0], P[1], P[2] ? G : undefined); }
    D.end();
    // the turn: a ring of gold runs out through the sand, glints, the gleam on the glass
    if (post > 0) { const kk = 1 - post, rx = 22 + kk * 50, ry = 16 + kk * 34; D.lay('wall'); for (let a = 0; a < 6.283; a += 0.02) { const x = HG[0] + Math.cos(a) * rx, y = HG[1] + Math.sin(a) * ry; if (!inHollow(x, y) && x > 6 && x < W - 6 && y > 6 && y < H - 6) D.px(x, y, 'gold', 9 - kk * 4, G); } }
    if (q > 0.86 && !st.f) { st.f = 1; rs.burst('glint', HG[0], cy, 7, { sp: 28, life: 0.7, w: 24, h: 36 }); } if (q < 0.5) st.f = 0;
    if (q < 0.01 && !st.g) { st.g = 1; rs.flash(0, 0.8); rs.flash(1, 0.8); } if (q > 0.5) st.g = 0;
  },
});
X.TILEF.hourglass = (D, t) => {
  // a bed of golden sand along the floor; bright grains drift along it
  for (let x = 3; x < 147; x++) { const y = 93 + Math.round(Math.sin(x * 0.07) * 0.8); D.px(x, y, 'sand', 6); D.px(x, y + 1, 'sand', 4); D.px(x, y + 2, 'earth', 3); if (Math.floor(x * 0.37) % 4 === 0) D.px(x, y + 1, 'sand', 5); }
  for (let i = 0; i < 9; i++) { const x = 3 + ((i * 17 + t * (4 + i % 3)) % 144), y = 93 + Math.round(Math.sin(x * 0.07) * 0.8); D.px(x, y, 'gold', 10, G); D.px(x - 1, y, 'gold', 8, G); }
};

// ═════════ 梦境裂隙 dream ═════════
// a long tear across the rock, upper left to lower right, with a dream showing through it: a night sky in hard bands
// that warm from indigo to pink towards the bottom, a thin pink nebula, stars, a ringed crescent moon, light clouds
// drifting past, a slow vortex. The lips of the tear burn hot pink, two side cracks run off it, the rock round it has
// turned to banded violet dream-stone, pink crystals grow on its lips, bubbles float out. Every 8 s the tear flares
// and a dream moth flutters out, loops and melts into sparkles
const DA = [24, 17], DB = [127, 88], DLEN = Math.hypot(DB[0] - DA[0], DB[1] - DA[1]), DCO = (DB[0] - DA[0]) / DLEN, DSI = (DB[1] - DA[1]) / DLEN, DGEO = 8;
const dMean = (s) => Math.sin(s * 0.055 + 0.5) * 5 + Math.sin(s * 0.13 + 1) * 2;   // the tear's middle line meanders about its axis
// s along the axis, n across it (n > 0: the lower-left side); dPt(s, n) back to the cell (n measured from the middle line)
const dFrame = (x, y) => { const dx = x - DA[0], dy = y - DA[1]; return [dx * DCO + dy * DSI, -dx * DSI + dy * DCO]; };
const dPt = (s, n) => { const m = n + dMean(s); return [DA[0] + DCO * s - DSI * m, DA[1] + DSI * s + DCO * m]; };
// the lips are torn: a sawtooth of uneven teeth on each side over a pointed lens, widest (~21 px a side) in the middle
const rhw = (s, side) => { if (s < 0 || s > DLEN) return 0; const a = Math.sin(Math.PI * s / DLEN), ph = (s + side * 3.7) / (6 + side), c = Math.floor(ph), f = ph - c, tooth = (f < 0.65 ? f / 0.65 : (1 - f) / 0.35) * (1.6 + hh(c, side, 68) * 2.6);
  return Math.max(0, 19 * Math.pow(a, 1.1) * (1 + (vnoise(s / 13, side * 5, 61) - 0.5) * 0.5) + (tooth - 1.5 + (vnoise(s / 2, side * 9, 67) - 0.5)) * Math.min(1, a * 2.5)); };
const dLip = (s, side) => dPt(s, (side ? 1 : -1) * (rhw(s, side) - 0.5));
// the side cracks: off the upper lip up and away, off the lower lip down and away; a distance field so they share the lips and glow
const DBR = []; { const r = X.rng(364), zig = (x, y, a, n, dep) => { const P = [[Math.round(x), Math.round(y)]]; let s = r() < 0.5 ? 1 : -1; for (let i = 0; i < n; i++) { const l = 3 + Math.floor(r() * 4), aa = a + s * (0.45 + r() * 0.3); for (let k = 0; k < l; k++) { x += Math.cos(aa); y += Math.sin(aa); P.push([Math.round(x), Math.round(y)]); } s = -s; } DBR.push({ pts: P, depth: dep }); return P; };
  const p0 = dLip(DLEN * 0.44, 0), p1 = dLip(DLEN * 0.7, 1); zig(p0[0], p0[1], -1.15, 6, 0); zig(p1[0], p1[1], 2.2, 4, 1); }
const DBRD = new Float32Array(W * H).fill(99); DBR.forEach(B => { const n = B.pts.length; B.pts.forEach(([x, y], k) => { const hw = B.depth ? 1.0 * Math.pow(1 - k / n, 0.7) + 0.3 : 1.3 * Math.pow(1 - k / n, 0.7) + 0.3; for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 < 0 || Y2 < 0 || X2 >= W || Y2 >= H) continue; const d = Math.hypot(dx, dy) - hw, p = Y2 * W + X2; if (d < DBRD[p]) DBRD[p] = d; } }); });
const riftM = (x, y) => { const [s, n] = dFrame(x, y), d = n - dMean(s); return Math.abs(d) - (d < 0 ? rhw(s, 0) : rhw(s, 1)) + Math.max(0, -s, s - DLEN); };
const riftD = (x, y) => { const xi = Math.round(x), yi = Math.round(y); return Math.min(riftM(x, y), xi >= 0 && yi >= 0 && xi < W && yi < H ? DBRD[yi * W + xi] : 99); };   // < 0 inside
// the dream's sky: hard bands, indigo at the top to pink at the bottom, with a gently stepped edge between them
const DSKY = [[26, 'night', 2], [34, 'night', 3], [42, 'magic', 3], [50, 'magic', 4], [58, 'magic', 5], [66, 'pink', 3], [75, 'pink', 4], [999, 'pink', 5]];
const dsky = (x, y) => { const yy = y + Math.round(Math.sin(x * 0.23 + y * 0.05) * 1.1); for (let i = 0; i < DSKY.length; i++) if (yy < DSKY[i][0]) return DSKY[i]; return DSKY[DSKY.length - 1]; };
const DMOON = dPt(DLEN * 0.3, -3).map(Math.round), DSP = dPt(DLEN * 0.68, 3).map(Math.round);
const DSTARS = []; { const r = X.rng(361); for (let i = 0; i < 200 && DSTARS.length < 15; i++) { const [x, y] = dPt(r() * DLEN, (r() - 0.5) * 30); if (y < 62 && riftD(x, y) < -3 && Math.hypot(x - DMOON[0], y - DMOON[1]) > 9 && Math.hypot(x - DSP[0], y - DSP[1]) > 12) DSTARS.push([Math.round(x), Math.round(y), r() * 7, 0.7 + r() * 1.6]); } }
const DBUB = []; { const r = X.rng(362); for (let i = 0; i < 9; i++) DBUB.push([r(), DLEN * (0.2 + r() * 0.6), 0.1 + r() * 0.1, r() * 7, i % 2]); }
// crystals: clumps on the lips, leaning out of the tear: [side, s, angle, how many]
const DOUT = [Math.atan2(-DCO, DSI), Math.atan2(DCO, -DSI)];   // outward from the upper lip, from the lower lip
const DXT = [[0, DLEN * 0.62, DOUT[0] + 0.25, 3], [1, DLEN * 0.28, DOUT[1] - 0.3, 2], [1, DLEN * 0.83, DOUT[1] + 0.2, 3], [0, DLEN * 0.2, DOUT[0] - 0.2, 2]];
// cloud sprites: a few overlapping puffs; each pixel knows whether it is a top edge (lit), body or underside
const DCLOUD = [['....llll.....', '.lll.cccl.ll.', 'lcccccccccccl', 'pcccccccccccp', '.ppppppppppp.'], ['...lll...', '.llcccll.', 'lcccccccl', '.ppppppp.']].map(rows => { const px = []; rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const k = 'lcp'.indexOf(row[x]); if (k >= 0) px.push([x, y - rows.length + 1, k]); } }); return px; });
const DCL = [['linen', 9], ['candy', 8], ['pink', 6]];
// the dream moth, two wing beats (up, down): candy outline, pink wings, linen spots and body
const DMOTH = [['....a...a....', '.###.aba.###.', '#owww#b#wwwo#', '#wwwwwbwwwww#', '.#wwwwbwwww#.', '..###wbw###..', '..#owwbwwo#..', '...###b###...'],
  ['....a...a....', '.....aba.....', '...##wbw##...', '..#owwbwwo#..', '.#wwwwbwwww#.', '.#wwwwbwwww#.', '..##owbwo##..', '....##b##....']];
// a crystal prism: straight sides, a pointed cap, a lit face and a shaded face, a bright edge between them
function dShard(S, x, y, a, l, hw) {
  const dx = Math.cos(a), dy = Math.sin(a), lit = (-dy * -0.6 + dx * -0.8) > 0 ? 1 : -1, px = -dy * hw * lit, py = dx * hw * lit, bx = x + dx * l * 0.62, by = y + dy * l * 0.62, ex = x + dx * l, ey = y + dy * l;
  S.poly([[x, y], [x + px, y + py], [bx + px, by + py], [ex, ey]], 'candy', 8); S.poly([[x, y], [ex, ey], [bx - px, by - py], [x - px, y - py]], 'candy', 4.5);
  S.line(x, y, ex - dx, ey - dy, 'candy', 9, { e: 2 }); S.px(ex, ey, 'linen', 10, { e: 2 });
}
X.def('_tile_dream', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    const mid = dPt(DLEN * 0.52, 0);
    sc.light({ x: mid[0], y: mid[1], z: 18, r: 84, i: 1, c: '#ff3aa0', tint: 0.3 });                              // 0 the tear (flares: rs.mul)
    sc.light({ x: mid[0], y: mid[1], z: 10, r: 1, i: 1, c: '#ff3aa0', fl: 'pulse', amp: 0.4, sp: 1.7, tint: 0 });   // 1 lights nothing: the lips and crystals breathe with it
    bed(S, 8, (x, y, r2) => fillE(x, y, DGEO) < 1 + r2 / 50);
    // dream-stone: the rock round the tear has turned violet and glassy in bands that follow it out to the plain rock
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { if (!inFill(x, y, DGEO)) continue; const d = riftD(x, y) + (vnoise(x / 6, y / 6, 63) - 0.5) * 8; if (d < 0) continue;
      const band = Math.floor((d + Math.sin(y * 0.2 + x * 0.05) * 2) / 4.5); S.px(x, y, band % 2 ? 'lav' : 'magic', band % 2 ? 3 - (band > 6 ? 0.5 : 0) : 4 - (band > 3 ? 1 : 0) + (band === 0 ? 1 : 0), { n: [0, 0] }); }
    S.noise(4, 4, W - 8, H - 8, 1, 3, 64, { only: 'lav' });
    // the dream behind: the sky in hard bands, faint star dust; the burning lips
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { const d = riftD(x, y); if (d >= 0) continue; const b = dsky(x, y);
      let m = b[1], tn = b[2]; if (riftM(x, y) >= 0) { m = d > -1.2 ? 'candy' : 'pink'; tn = d > -1.2 ? 8 : hh(x, y, 71) < 0.2 ? 7 : 5; } else if (d > -1.5) { m = 'candy'; tn = 9; } else if (d > -2.5) { m = 'pink'; tn = 7; }
      S.px(x, y, m, tn, { e: d > -2.5 ? 1 : 255 });
      if (d < -3 && y < 62 && hh(x, y, 66) < 0.03) S.px(x, y, 'linen', 6, G); }
    // the nebula: short curved wisps along the tear, a brighter core with a soft pink edge under it
    [[-9, 0.12, 16, 4], [7, 0.44, 16, -4], [-5, 0.74, 14, 3]].forEach(([off, s0, n, bul]) => { for (let k = 0; k < n; k++) { const u = k / (n - 1), [x, y] = dPt(DLEN * s0 + k, off + Math.sin(u * Math.PI) * bul).map(Math.round); if (riftD(x, y) > -3) continue; const mid2 = u > 0.2 && u < 0.8;
      S.px(x, y, 'candy', mid2 ? 7 : 6, G); if (mid2) S.px(x, y + (bul > 0 ? -1 : 1), 'pink', 5, G); if (u > 0.35 && u < 0.65) S.px(x, y + (bul > 0 ? 1 : -1), 'candy', 6, G); } });
    // the moon: a crescent, lit on its outer edge, a crater or two, a ring of light round it
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const X2 = DMOON[0] + x, Y2 = DMOON[1] + y; if (riftD(X2, Y2) > -2.5) continue; const d = Math.hypot(x + 0.5, y + 0.5), dc = Math.hypot(x + 0.5 - 2.4, y + 0.5 + 1.3);
      if (d < 5.2 && dc > 4.3) S.px(X2, Y2, 'bone', dc < 5.3 ? 8 : d > 4.3 ? 10 : 9, G);
      else if (d > 7 && d < 8) S.px(X2, Y2, 'lav', x + y < 0 ? 9 : 7, G); }
    S.px(DMOON[0] - 3, DMOON[1] + 1, 'bone', 7, G); S.px(DMOON[0] - 2, DMOON[1] + 3, 'bone', 7, G);
    // lips: a dark rim just outside the burning edge
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { const d = riftD(x, y); if (d >= 0 && d < 1.2) S.px(x, y, 'magic', 1); }
    // hairline cracks in the dream-stone off the lips (dark, unlit): the rock has been torn, not cut
    { const r = X.rng(365); for (let i = 0; i < 10; i++) { const side = i % 2, s = DLEN * (0.12 + r() * 0.76), [x, y] = dPt(s, (side ? 1 : -1) * (rhw(s, side) + 1)); if (riftD(x, y) < 0) continue; let cx = x, cy = y; const a = DOUT[side] + (r() - 0.5) * 1.1;
      for (let k = 0; k < 6 + r() * 7; k++) { cx += Math.cos(a) + (r() - 0.5) * 0.8; cy += Math.sin(a) + (r() - 0.5) * 0.8; if (riftD(cx, cy) < 0.5 || !inFill(Math.round(cx), Math.round(cy), DGEO)) continue; S.px(cx, cy, 'magic', 1); S.px(cx, cy + 1, 'lav', 5); } } }
    // pink crystals growing out of the lips in clumps, leaning out of the tear
    S.lay('back'); DXT.forEach(([side, s0, a, n]) => { [[-0.38, 5, 1.5, -3], [0.36, 4, 1.4, 3], [0, 8, 2, 0]].slice(3 - n).forEach(([da, l, hw, ds]) => { const [x, y] = dLip(s0 + ds, side); S.beg(); dShard(S, x, y, a + da, l + (n === 2 ? -1 : 0), hw); S.end(); }); });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 8), flare = q < 0.12 ? Math.sin(q / 0.12 * Math.PI) : 0, moth = q < 0.5 ? q / 0.5 : -1;
    rs.mul[0] = 1 + 0.08 * Math.sin(t * 1.7) + flare * 0.9;
    // light clouds drifting across the dream
    D.lay('wall'); [[0.3, 2.6, 0, -3], [0.64, 3.2, 1, 5], [0.46, 1.7, 1, -9], [0.8, 2.2, 0, 2]].forEach(([sf, sp, ci, off], i) => { const [bx, by] = dPt(DLEN * sf, off), cx = bx - 36 + ((t * sp + i * 23) % 72), cy = Math.round(by);
      DCLOUD[ci].forEach(([x, y, k]) => { const X2 = Math.round(cx) + x, Y2 = cy + y; if (riftD(X2, Y2) < -2.5) D.px(X2, Y2, DCL[k][0], DCL[k][1], G); }); });
    // the dream's own slow vortex: two pink arms turning round a white eye
    for (let arm = 0; arm < 2; arm++) for (let k = 3; k < 44; k++) { const rr = k * 0.38, an = k * 0.23 + arm * Math.PI - t * 0.6, x = DSP[0] + Math.cos(an) * rr * 1.1, y = DSP[1] + Math.sin(an) * rr * 0.8; if (riftD(x, y) > -2.5) continue; D.px(x, y, k < 14 ? 'candy' : 'pink', k < 14 ? 9 - k * 0.15 : 7 - (k - 14) * 0.1, G); }
    D.px(DSP[0], DSP[1], 'linen', 11, G); D.px(DSP[0] + 1, DSP[1], 'candy', 10, G); D.px(DSP[0] - 1, DSP[1], 'candy', 10, G);
    // stars twinkle; the moon's ring glints round
    DSTARS.forEach(([x, y, p, sp]) => { const a = Math.sin(t * sp + p); if (a > 0.3) star4(D, x, y, 'linen', 10, (a - 0.3) / 0.7); });
    { const a = t * 0.8; D.px(DMOON[0] + Math.cos(a) * 7.5, DMOON[1] + Math.sin(a) * 7.5, 'linen', 10, G); }
    // the burning lips shimmer: a bright crawl along each side
    for (let s2 = 0; s2 < 2; s2++) { const s = (t * 30 + s2 * DLEN / 2) % DLEN, [x, y] = dLip(s, s2); D.px(x, y, 'linen', 11, G); const [ax, ay] = dLip(s - 1, s2), [bx, by] = dLip(s + 1, s2); D.px(ax, ay, 'candy', 10, G); D.px(bx, by, 'candy', 10, G); }
    DBR.forEach((B, i) => { const P = B.pts, k = Math.floor((t * 14 + i * 13) % (P.length + 20)); if (k < P.length) { D.px(P[k][0], P[k][1], 'linen', 11, G); if (k > 0) D.px(P[k - 1][0], P[k - 1][1], 'candy', 10, G); } });
    if (flare > 0) for (let s = 1; s < DLEN; s += 1) { if ((Math.round(s) + Math.floor(t * 30)) % 3) continue; [0, 1].forEach(sd => { const [x, y] = dLip(s, sd); D.px(x, y, 'candy', 9 + Math.round(flare * 2), G); }); }
    // bubbles floating out over the lips, rising, popping
    D.lay('mid'); DBUB.forEach(([p, s0, sp, w, sd]) => { const k = (p + t * sp) % 1, [lx, ly] = dLip(s0, sd), oa = DOUT[sd], x = lx + Math.cos(oa) * (k * 12 - 2) + Math.sin(t * 1.3 + w) * 2, y = ly + Math.sin(oa) * (k * 12 - 2) - k * 14; if (k > 0.9) { if (k < 0.95) star4(D, x, y, 'candy', 9, 0.7); return; }
      D.px(x, y - 1, 'candy', 8, G); D.px(x - 1, y, 'candy', 7, G); D.px(x + 1, y, 'candy', 6, G); D.px(x, y + 1, 'candy', 6, G); D.px(x - 1, y - 1, 'linen', 10, G); });
    // the dream moth: out of the vortex, a wide loop, then it melts into sparkles (a glint trail behind it)
    if (moth >= 0) { const k = moth, x0 = DSP[0], y0 = DSP[1], mp = (kk) => [x0 - kk * 56 - Math.sin(kk * 6) * 8, y0 - kk * 40 + Math.sin(kk * 9) * 6], [x, y] = mp(k), fl = Math.sin(t * 18) > 0, fade = k > 0.82 ? (k - 0.82) / 0.18 : 0;
      if (fade < 0.8) { D.lay('front'); const f3 = fade * 3, pal = { '#': ['candy', 9 - f3, G], w: ['pink', 6 - f3, G], o: ['linen', 10 - f3, G], b: ['linen', 10 - f3, G], a: ['linen', 8 - f3, G] };
        D.spr(Math.round(x) - 6, Math.round(y) - 4, DMOTH[fl ? 0 : 1], pal);
        if (k < 0.82 && (st.gl == null || t - st.gl > 0.15 || t < st.gl)) { st.gl = t; rs.burst('glint', x + (Math.random() - 0.5) * 4, y + 3, 1, { sp: 4, life: 0.7 }); } }
      if (k > 0.82 && !st.m) { st.m = 1; st.mx = x; st.my = y; st.mt = t; rs.burst('glint', x, y, 6, { sp: 18, life: 0.8 }); } }
    if (st.mt != null && t - st.mt >= 0 && t - st.mt < 0.9) { D.lay('front'); burstPx(D, st.mx, st.my, (t - st.mt) / 0.9, 9, 'candy', 10, 12); }
    if (q < 0.02 && !st.f) { st.f = 1; rs.flash(1, 1.2); } if (q > 0.6) { st.f = 0; st.m = 0; }
  },
});
X.TILEF.dream = (D, t) => {
  // a hairline tear along the floor burning pink; bubbles slip out of it and pop (all within the floor rows)
  for (let x = 3; x < 147; x++) { const y = 94 + Math.round(Math.sin(x * 0.09) * 1.1 + Math.sin(x * 0.23) * 0.5), g = Math.sin(x * 0.2 - t * 2.4) > 0.8; D.px(x, y - 1, 'magic', 2); D.px(x, y, g ? 'candy' : 'pink', g ? 9 : 7, G); D.px(x, y + 1, 'magic', 3); }
  for (let i = 0; i < 4; i++) { const k = (t * 0.45 + i * 0.27) % 1, x = 20 + i * 36 + Math.sin(t + i) * 2, y = Math.round(94 - k * 3); if (k < 0.8) { D.px(x, y - 1, 'candy', 8, G); D.px(x - 1, y, 'candy', 7, G); D.px(x + 1, y, 'candy', 6, G); } else D.px(x, Math.max(91, y), 'linen', 10, G); }
};

// ═════════ 世界树根 ygg ═════════
// the world tree's roots come down through the top of the cell: a great taproot flares out of a crack in the rock
// above, splits and spreads into a mass of roots, rootlets and root hairs that fade into the soil; green sap glows
// in lanes under the bark of the big roots, two more thin roots come down from the tree above, moss and glowing
// mushrooms sit on the shoulders, and at the bottom the root tips cradle a green seed. Sap flows down, spores drift,
// a leaf now and then falls through from above. Every 9 s a surge of sap runs down every root at once, the seed flares
// and throws a ring of light, the mushrooms puff
const YTOP = 12, YGEO = 2;   // the rock lip the taproot comes down out of
// a root path that never turns upward (kept at least 0.35 rad below horizontal): [x, y, angle] per pixel step
function yWalk(r, x, y, a, len, o) {
  const P = [];
  for (let k = 0; k <= len; k++) { if (k) { a += (r() - 0.5) * (o.wig || 0.3); if (o.to != null) a += Math.sin(o.to - a) * (o.pull || 0.05); a = clamp(a, 0.35, Math.PI - 0.35); x += Math.cos(a); y += Math.sin(a); }
    if (x < 9 || x > W - 10 || y > H - 10) break; const q = [Math.round(x), Math.round(y), a], l = P[P.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) P.push(q); }
  return P;
}
const YR = []; { const r = X.rng(371);
  const add = (pts, w0, depth, s0, lay, prof) => { const Y = { pts, w0, depth, s0, lay: lay || (w0 >= 6 ? 'back' : 'wall'), prof }; YR.push(Y); return Y; };
  const at = (Y, yy) => { let k = Y.pts.findIndex(p => p[1] >= yy); return k < 0 ? Y.pts.length - 1 : k; };
  // the taproot: out of the rock lip, straight down
  const T = add(yWalk(r, 70, 3, Math.PI / 2, 44, { wig: 0.1, to: Math.PI / 2, pull: 0.25 }), 13, 0, 0, 'back', 'tap');
  // main roots off the taproot, and two thin roots down from the tree above (they come in over the top edge)
  [[17, 2.78, 60, 5.5], [19, 0.36, 60, 5.5], [27, 2.45, 72, 9.5], [29, 0.62, 72, 9.5], [38, 2.02, 56, 7], [40, 1.1, 56, 7]].forEach(([yy, a, len, w0]) => { const k = at(T, yy), p = T.pts[k];
    add(yWalk(r, p[0] + Math.cos(a) * 3, p[1], a, len, { wig: 0.3, to: a * 0.72 + Math.PI / 2 * 0.28, pull: 0.05 }), w0, 0, k); });
  const tk = T.pts.length - 1, C = add(yWalk(r, T.pts[tk][0], T.pts[tk][1], Math.PI / 2, 24, { wig: 0.08, to: Math.PI / 2, pull: 0.35 }), 8, 0, tk);
  [[44, 0, 1.95, 60, 4], [102, 0, 1.15, 58, 3.5]].forEach(([x, y, a, len, w0]) => add(yWalk(r, x, y, a, len, { wig: 0.25, to: a * 0.8 + Math.PI / 2 * 0.2, pull: 0.05 }), w0, 0, -8, 'wall', 'top'));
  // branches off the main roots
  YR.slice(1).filter(Y => Y !== C).forEach(Y => { const n = Y.pts.length, nb = Y.w0 >= 7 ? 2 : 1; for (let b = 0; b < nb; b++) { const k = Math.floor(n * (0.3 + b * 0.25 + r() * 0.12)), p = Y.pts[k]; if (!p) continue; const a = p[2] + (b % 2 ? 0.55 : -0.55) * (p[2] < Math.PI / 2 ? -1 : 1);
    add(yWalk(r, p[0], p[1], a, Math.round((n - k) * (0.45 + r() * 0.2)), { wig: 0.4, to: a * 0.7 + Math.PI / 2 * 0.3, pull: 0.05 }), Math.max(2.5, Y.w0 * 0.42), 1, Y.s0 + k); } });
  // width along each root: tapering to a 1-px hair at the tip; the taproot flares where it leaves the rock
  YR.forEach(Y => { const n = Y.pts.length; Y.w = Y.pts.map((p, k) => Y.prof === 'tap' ? Math.max(10, Math.min(26, 12 + 14 * Math.exp(-(p[1] - 13) / 4.5)) - k * 0.05) : Math.max(1, Y.w0 * Math.pow(1 - k / n, 0.75))); Y.len = n;
    Y.nm = Y.pts.map((p, k) => { const a = Y.pts[Math.max(0, k - 2)], b = Y.pts[Math.min(n - 1, k + 2)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }); });
  // rootlets and root hairs: 1-px, off every root, fading into the soil
  const R1 = []; YR.forEach(Y => { const n = Y.len; for (let k = 3; k < n - 2; k += 3 + Math.floor(r() * 4)) { if (Y.w[k] < 1.6 || Y.pts[k][1] < YTOP + 3) continue; const p = Y.pts[k], sd = r() < 0.5 ? -1 : 1, a = p[2] + sd * (0.6 + r() * 0.6);
      const [nx, ny] = Y.nm[k], hw = Y.w[k] / 2; R1.push(yWalk(r, p[0] + nx * hw * sd, p[1] + ny * hw * sd, a, 4 + Math.floor(r() * 8), { wig: 0.7 })); }
    const e = Y.pts[n - 1]; if (Y.depth < 2 && Y.prof !== 'tap' && Y !== C) for (let h = 0; h < 3; h++) R1.push(yWalk(r, e[0], e[1], e[2] + (h - 1) * 0.5, 4 + Math.floor(r() * 5), { wig: 0.6 })); });
  YR.hairs = R1; }
const YTAP = YR[0], YDOWN = YR.find(Y => Y.w0 === 8), YSEED = [YDOWN.pts[YDOWN.len - 1][0], YDOWN.pts[YDOWN.len - 1][1] + 7];
// the sap lane under the bark of the big roots: just off the centre on the lit side, continuous, ending where the root thins
YR.forEach(Y => { if (Y.w0 < 6) return; const L = []; Y.pts.forEach(([x, y], k) => { if (y < YTOP + 3 || Y.w[k] < 3.5) return; const [nx, ny] = Y.nm[k], lit = ny < 0 || (Math.abs(ny) < 0.3 && nx < 0) ? 1 : -1, o = Y.w[k] / 2 * (0.28 + Math.sin(k * 0.3) * 0.1) * lit, q = [Math.round(x + nx * o), Math.round(y + ny * o)], l = L[L.length - 1];
    if (l && Math.max(Math.abs(l[0] - q[0]), Math.abs(l[1] - q[1])) > 1) L.push([Math.round((l[0] + q[0]) / 2), Math.round((l[1] + q[1]) / 2)]); if (!l || l[0] !== q[0] || l[1] !== q[1]) L.push(q); }); Y.lane = L; });
const YCRADLE = [-1, 1].map(sd => { const pts = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + sd * (0.35 + i / 16 * 2.2); pts.push([Math.round(YSEED[0] + Math.cos(a) * 6.5), Math.round(YSEED[1] + Math.sin(a) * 7.5)]); } return pts; });
const YMUSH = []; { const r = X.rng(372); YR.forEach(Y => { if (Y.w0 < 5 || Y.prof === 'tap' || YMUSH.length > 3) return; for (let k = 10; k < Y.len * 0.6; k += 12 + Math.floor(r() * 9)) { const [x, y] = Y.pts[k]; if (y < 26 || YMUSH.length > 3) continue; let [nx, ny] = Y.nm[k]; if (ny > 0) { nx = -nx; ny = -ny; } if (r() < 0.75) YMUSH.push([Math.round(x + nx * Y.w[k] / 2), Math.round(y + ny * Y.w[k] / 2) + 1, 2 + Math.floor(r() * 2), r() * 7]); } }); }
const YSPORE = []; { const r = X.rng(373); for (let i = 0; i < 12; i++) YSPORE.push([10 + r() * 130, 12 + r() * 80, r() * 7, 0.2 + r() * 0.3]); }
const YGL = [YR[3], YR[4]].map(Y => Y.pts[Math.floor(Y.len * 0.5)]);   // where the two small green lights sit on the big side roots
// bark: a round root, lit on its upper side, with grain; the first rows at the top of the cell stay rock-dark
function rootTube(S, Y, seed) {
  const P = Y.pts, n = P.length; for (let i = 0; i < n; i++) { const [nx, ny] = Y.nm[i], hw = Math.max(0.5, Y.w[i] / 2), fade = P[i][1] < 4 ? -2 : P[i][1] < 7 ? -1 : 0;
    for (let s = -hw; s <= hw + 0.01; s += 0.5) { const u = s / hw, up = u * (ny < 0 ? 1 : -1) * (Math.abs(ny) > 0.3 ? 1 : 0) + u * (nx < 0 ? 1 : -1) * (Math.abs(nx) > 0.3 ? 0.8 : 0), grain = vnoise(i / 5, s * 1.4, seed) > 0.64 ? -1 : 0, tip = Y.w[i] < 1.6 ? -1.2 - (i / n > 0.9 ? 0.8 : 0) : 0;
      S.px(P[i][0] + nx * s, P[i][1] + ny * s, 'wood', 4 + (up > 0.4 ? 1.4 : up < -0.5 ? -1.2 : 0) + grain + (Math.abs(u) > 0.85 ? -0.6 : 0) + tip + fade, { n: [nx * u * 0.85, ny * u * 0.85] }); } }
}
// a surge band: 3 px across the root (1 px on thin ones), head at arc length s, a fading tail
function yBand(D, Y, s, len) { const k = Math.floor(s); if (k < 0 || k >= Y.len + len) return; for (let j = 0; j < len; j++) { const i = k - j; if (i < 0 || i >= Y.len) continue; const [x, y] = Y.pts[i], [nx, ny] = Y.nm[i], tn = clamp(10.6 - j * 0.35, 7, 10.6);
  D.px(x, y, 'screen', tn, G); if (Y.w[i] >= 3) { D.px(x + Math.round(nx), y + Math.round(ny), 'screen', tn - 0.8, G); D.px(x - Math.round(nx), y - Math.round(ny), 'screen', tn - 0.8, G); } } }
X.def('_tile_ygg', {
  noFrame: 1, noFloor: 1, amb: [0.5, 0.42],
  paint(S, sc) {
    sc.light({ x: YSEED[0], y: YSEED[1], z: 16, r: 72, i: 1.4, c: '#7aff9a', tint: 0.2 });                          // 0 the seed (surges: rs.mul)
    sc.light({ x: 72, y: 58, z: 14, r: 70, i: 0.7, c: '#7aff9a', fl: 'pulse', amp: 0.18, sp: 0.9, tint: 0.25 });      // 1 sap glow over the lower roots
    sc.light({ x: 75, y: 50, z: 10, r: 1, i: 1, c: '#7aff9a', fl: 'pulse', amp: 0.4, sp: 1.2, tint: 0 });               // 2 lights nothing: sap lanes and mushroom caps breathe with it
    YGL.forEach(([x, y], i) => sc.light({ x, y, z: 10, r: 26, i: 0.5, c: '#7aff9a', fl: 'pulse', amp: 0.15, sp: 0.7, ph: i * 2, tint: 0.45 }));   // 3, 4 green rim light on the bark
    bed(S, 2, (x, y, r2) => fillE(x, y, YGEO) < 1 + r2 / 50);
    // dark rich soil round the roots, a band of moist clay
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { if (!inFill(x, y, YGEO)) continue;
      const band = Math.floor((y + Math.sin(x * 0.07) * 3) / 9); S.px(x, y, band === 6 ? 'mstone' : 'earth', band === 6 ? 3 : 3 + (band % 2), { n: [0, 0] }); }
    S.noise(6, 4, W - 12, H - 8, 1, 3, 75, { only: 'earth' });
    for (let i = 0; i < 26; i++) { const x = 10 + hh(i, 1, 76) * 130, y = 8 + hh(i, 2, 76) * 88; if (!inFill(Math.round(x), Math.round(y), YGEO)) continue; S.px(x, y, 'stone', 5); S.px(x + 1, y, 'stone', 4); }
    // rootlets and root hairs first (behind everything), darkening toward their tips
    S.lay('wall'); YR.hairs.forEach(P => P.forEach(([x, y], k) => S.px(x, y, 'wood', k < 2 ? 4.4 : k < P.length * 0.6 ? 3.6 : 2.6)));
    // roots, thinnest first so the big ones lie over them
    const order = YR.map((Y, i) => i).sort((a, b) => YR[a].w0 - YR[b].w0);
    order.forEach(i => { const Y = YR[i]; S.lay(Y.lay); S.beg(); rootTube(S, Y, 77 + i); S.end(); });
    // the sap lanes: a continuous glowing vein under the bark, a dark lip on its shadow side
    order.forEach(i => { const Y = YR[i]; if (!Y.lane) return; S.lay(Y.lay); const L = Y.lane;
      L.forEach(([x, y], k) => { const nx = L[Math.min(L.length - 1, k + 1)][0] - L[Math.max(0, k - 1)][0], steep = Math.abs(nx) < 1.5; S.px(steep ? x + 1 : x, steep ? y : y + 1, 'wood', 2); });
      L.forEach(([x, y], k) => S.px(x, y, 'screen', hh(Math.floor(k / 3), i, 78) < 0.35 ? 8 : 7, { e: 3 })); });
    // moss in a few patches on the shoulders of the big roots
    S.lay('back'); { let c = 0; YR.forEach((Y, i) => { if (Y.w0 < 7 || Y.prof === 'tap') return; [0.36, 0.64].forEach((f, j) => { const k0 = Math.floor(Y.len * f); if (YMUSH.some(([mx, my]) => Math.abs(mx - Y.pts[k0][0]) < 8 && Math.abs(my - Y.pts[k0][1]) < 8)) return; if (c > 5) return; c++; const n = 4 + ((i + j) % 3);
      for (let k = k0; k < k0 + n && k < Y.len; k++) { const [x, y] = Y.pts[k]; let [nx, ny] = Y.nm[k]; if (ny > 0) { nx = -nx; ny = -ny; } const hw = Y.w[k] / 2 - 0.5, tx = x + nx * hw, ty = y + ny * hw;
        S.px(tx, ty, 'leaf', 7, { n: [0, -0.7] }); S.px(tx - nx, ty - ny, 'leaf', 4.6); if (k === k0 + 1 || k === k0 + n - 2) S.px(tx + nx, ty + ny, 'leaf', 8, { n: [0, -0.7] }); } }); }); }
    // the fissure the taproot comes down out of: the bark stops at a jagged crack (above it is the cell's own rock) and one
    // ragged overhang of that rock juts over it — lit top edge, a body, a dark underside that shades the bark just below,
    // two notches of different sizes; past its ends the crack runs on into the rock either side
    const yb = (x) => Math.round(YTOP - 1 + (vnoise(x / 2.4, 3, 81) - 0.5) * 3.4 + Math.pow(Math.abs(x - 70) / 15, 2) * 1.6);
    for (let x = 42; x <= 98; x++) { const e = yb(x);
      if (x >= 54 && x <= 86) { S.lay('back'); for (let y = 0; y < e; y++) S.px(x, y, 0, 0); S.px(x, e, 'ink', 0); }
      else { const f = Math.min(Math.abs(x - 54), Math.abs(x - 86)) / 14; if (hh(x, 2, 85) < f * 0.7) continue; S.lay('wall'); S.px(x, e, 'ink', 0); S.px(x, e + 1, 'rock', 7, { n: [0, -0.6] }); } }
    { // top edge and underside per column x 54…86: thicker in the middle where it juts furthest, a 2-px notch left of the
      // taproot's axis and a 1-px one right of it, the underside ragged by a pixel
      const TOP = [11, 10, 10, 9, 9, 9, 9, 11, 11, 9, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 9, 9, 9, 9, 9, 9, 10, 10, 11],
        RAG = [0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
      for (let x = 54; x <= 86; x++) { const i = x - 54, top = TOP[i], u = Math.max(yb(x), 12 + (x > 80 ? 1 : 0)) + RAG[i], tl = TOP[i - 1] == null ? 99 : TOP[i - 1], tr = TOP[i + 1] == null ? 99 : TOP[i + 1];
        S.lay('mid'); S.px(x, u, 'ink', 0);
        for (let y = top + 1; y < u; y++) S.px(x, y, 'rock', y < top + 2 ? 5 : 4, { n: [0, 0] });
        for (let y = top + 1; y < Math.min(u, tl); y++) S.px(x, y, 'rock', 6, { n: [-0.7, 0] });   // a face turned to the light where it stands above its left neighbour
        for (let y = top + 1; y < Math.min(u, tr); y++) S.px(x, y, 'rock', 3, { n: [0.7, 0] });    // and one turned away on the right
        S.px(x, top, 'rock', 7, { n: [0, -0.7] });
        ['back', 'wall'].forEach(k => { S.lay(k); S.tone(x, u + 1, -2.4); S.tone(x, u + 2, -1.3); S.tone(x, u + 3, -0.5); }); }   // its shadow on the bark just below
      // two loose chips on it, off to the sides
      S.lay('mid'); S.px(57, 8, 'rock', 8, { n: [-0.5, -0.6] }); S.px(58, 8, 'rock', 5); S.px(83, 8, 'rock', 7, { n: [0, -0.7] }); }
    // the seed and the root tips that hold it
    S.lay('mid'); YCRADLE.forEach((P, i) => { const Y = { pts: P, w: P.map((_, k) => 3 - k / P.length * 1.5), nm: P.map((p, k) => { const a = P[Math.max(0, k - 1)], b = P[Math.min(P.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }) }; S.beg(); rootTube(S, Y, 80 + i); S.end(); });
    // glowing mushrooms on the roots
    YMUSH.forEach(([x, y, s2], i) => { [[0, s2 + 0.5, 3], [i % 2 ? 3 : -3, s2 - 0.5, 2]].forEach(([dx, cs, hgt]) => { const mx = x + dx; S.beg(); S.vl(mx, y - hgt, hgt, 'linen', 6); S.hl(mx - Math.round(cs), y - hgt - 1, Math.round(cs) * 2 + 1, 'screen', 6, { e: 3 }); S.hl(mx - Math.round(cs) + 1, y - hgt - 2, Math.round(cs) * 2 - 1, 'teal', 8, { e: 3 }); S.px(mx - Math.round(cs) + 1, y - hgt - 2, 'linen', 10, { e: 3 }); S.end(); }); });
    sc.emit({ k: 'leaf', x: 70, y: YTOP + 2, w: 18, rate: 0.3, sp: 3, ang: Math.PI, spread: 0.6, life: 2.6 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 9), surge = q < 0.2 ? q / 0.2 : -1, sk = surge >= 0 ? Math.sin(surge * Math.PI) : 0, sSeed = (YDOWN.s0 + YDOWN.len) / 190, ring = surge >= sSeed ? (surge - sSeed) / (1 - sSeed) : -1;
    rs.mul[0] = 1 + 0.12 * Math.sin(t * 1.4) + (ring >= 0 ? (1 - ring) * 1.2 : 0); rs.mul[2] = 1 + sk * 1.2;
    // sap runs down the lanes in beads
    YR.forEach((Y, i) => { if (!Y.lane) return; D.lay(Y.lay); const n = Y.lane.length; for (let b = 0; b < n; b += 22) runPulse(D, Y.lane, (t * 9 + b + i * 5) % (n + 3), 'screen', 10, 3); });
    // the surge: a bright band down every root at once, out from the rock
    if (surge >= 0) YR.forEach(Y => { if (Y.depth > 1) return; D.lay(Y.lay); yBand(D, Y, surge * 190 - Y.s0, 12); });
    // the seed: an emerald that breathes; when the surge reaches it, it throws a ring of light
    D.lay('mid'); const g = Math.round(0.5 + 0.5 * Math.sin(t * 1.4) + (ring >= 0 ? (1 - ring) * 1.6 : 0)); D.beg(); D.ell(YSEED[0], YSEED[1], 4, 5.5, 'screen', 7 + g, G); D.ell(YSEED[0] - 1, YSEED[1] - 1, 2, 3.5, 'screen', 9 + g, G); D.px(YSEED[0] - 2, YSEED[1] - 3, 'linen', 11, G); D.px(YSEED[0] - 2, YSEED[1] - 2, 'linen', 10, G); D.vl(YSEED[0] + 2, YSEED[1] - 1, 4, 'screen', 5 + g, G); D.px(YSEED[0], YSEED[1] + 4, 'screen', 5 + g, G); D.end();
    if (ring >= 0 && ring < 1) { const rr = 7 + sm(ring) * 14, n = Math.round(rr * 5); D.lay('front'); for (let i = 0; i < n; i++) { const a = i / n * 6.283; if ((i + Math.floor(ring * 12)) % 4 === 3) continue; D.px(YSEED[0] + Math.cos(a) * rr, YSEED[1] + Math.sin(a) * rr * 0.8, 'screen', ring < 0.5 ? 10 : 8, G); } }
    if (ring >= 0 && !st.r) { st.r = 1; rs.flash(1, 0.9); rs.burst('heal', YSEED[0], YSEED[1], 8, { sp: 18, life: 1.3 }); rs.burst('leaf', YSEED[0], YSEED[1] - 4, 3, { sp: 14, life: 1.8 }); } if (q > 0.5) st.r = 0;
    // spores drifting up out of the soil
    YSPORE.forEach(([x0, y0, p, sp]) => { const k = (p / 7 + t * sp * 0.1) % 1, x = x0 + Math.sin(t * 0.7 + p) * 4, y = y0 - k * 18; if (!inFill(Math.round(x), Math.round(y), YGEO)) return; D.px(x, y, 'screen', k < 0.7 ? 9 : 7, G); });
    if (surge >= 0 && surge < 0.9) YMUSH.forEach(([x, y], i) => { const kk = clamp(surge * 1.4 - i * 0.05, 0, 1); if (kk > 0 && kk < 1) burstPx(D, x, y - 4, kk, 5, 'screen', 10, 6); });
    if (q < 0.02 && !st.s) { st.s = 1; rs.flash(2, 0.8); } if (q > 0.5) st.s = 0;
  },
});
X.TILEF.ygg = (D, t) => {
  // a root runs along the floor, sap beading down it in small beads with gaps; a sprout or two (all within the floor rows)
  for (let x = 3; x < 147; x++) { const y = 94 + Math.round(Math.sin(x * 0.06) * 1.2), s = ((x - t * 12) % 26 + 26) % 26; D.px(x, y - 1, 'wood', 5); D.px(x, y, 'wood', 4); D.px(x, y + 1, 'wood', 2); if (hh(x, 1, 92) < 0.12) D.px(x, y - 1, 'wood', 7);
    if (s < 1.5) D.px(x, y, 'screen', 10, G); else if (x % 7 === 0) D.px(x, y, 'screen', 7, G); }
  [[28, 1], [81, -1], [127, 1]].forEach(([x, d], i) => { const y = 94 + Math.round(Math.sin(x * 0.06) * 1.2), sw = Math.round(Math.sin(t * 1.3 + i) * 0.6); D.px(x, y - 2, 'leaf', 6); D.px(x + sw, y - 3, 'leaf', 7); D.px(x + sw + d, y - 3, 'leaf', 9); D.px(x + sw - d, Math.max(90, y - 4), 'leaf', 8); });
};

// ═════════ 王座遗骸 crown ═════════
// a pocket of a buried throne hall: flagstones, a broken column, a torn royal banner, and the throne itself, gilded and
// spired, with the crown still on its seat. Light falls on it through a crack in the rock, dust turning in the beam;
// gold veins run off into the stone and coins spill from a heap. Every 10 s the crown's ruby flares and a coin rolls off
const CRN = [83, 62], CFL = 82, CHV = [76, 50, 58, 36];
const inHall = (x, y) => y <= CFL && ed(x, y, CHV[0], CHV[1], CHV[2], CHV[3]) < 1 + (vnoise(x / 5, y / 5, 81) - 0.5) * 0.18;
const CVEIN = []; { const r = X.rng(381); [[8, 20, 0.3], [10, 88, -0.25], [140, 14, 2.7], [142, 92, 3.4], [60, 6, 1.3], [110, 100, -1.6]].forEach(([x, y, a]) => walk(r, x, y, a, 26 + Math.floor(r() * 16), { wig: 0.7, to: a, pull: 0.05, br: 0.08, maxD: 1, x0: 5, y0: 5 }, CVEIN)); }
const COINS = []; { const r = X.rng(382); for (let i = 0; i < 26; i++) { const u = r() * 2 - 1, x = 112 + u * 13, top = CFL - 8 * (1 - u * u); COINS.push([Math.round(x), Math.round(top + r() * (CFL - top)), r() < 0.3]); } }
X.def('_tile_crown', {
  noFrame: 1, noFloor: 1, amb: [0.44, 0.38],
  paint(S, sc) {
    sc.light({ x: CRN[0], y: CRN[1] - 4, z: 18, r: 46, i: 1, c: '#ffcc33', fl: 'pulse', amp: 0.08, sp: 1.2, tint: 0.4 });     // 0 the crown's own gleam (flares: flash)
    sc.light({ x: 84, y: 52, z: 22, r: 44, i: 0.7, c: '#ffe0a0', tint: 0.2 });                              // 1 the daylight from the crack, where it lands on the seat
    sc.light({ x: 75, y: 50, z: 10, r: 1, i: 1, c: '#ffcc33', fl: 'pulse', amp: 0.5, sp: 1.6, tint: 0 });                        // 2 lights nothing: gold veins and gems breathe with it
    sc.shaft({ x: 86, y0: 16, y1: CFL, w0: 3, w1: 11, dx: -4, i: 0.5, haze: 0.5, c: '#ffe8a0', f: (t) => 0.8 + 0.2 * Math.sin(t * 0.9) });
    bed(S, 1, (x, y) => ed(x, y, CHV[0], CHV[1], CHV[2] + 6, CHV[3] + 6) < 1.05);
    // gold veins in the rock, glinting
    CVEIN.forEach(V => V.pts.forEach(([x, y], k) => { if (inHall(x, y)) return; S.px(x, y, 'gold', V.depth ? 4 : 5); S.px(x, y + 1, 'rock', 2); if (k % 5 === 2) S.px(x, y, 'gold', 8, { e: 3 }); }));
    // the hall's back: dressed stone, half fallen; dark where the roof caved
    for (let y = 8; y < CFL + 1; y++) for (let x = 12; x < 140; x++) { if (!inHall(x, y)) continue; S.px(x, y, 'mstone', 2, { n: [0, 0] }); }
    S.lay('wall'); { const r = X.rng(383); for (let row = 0; row < 7; row++) { const y = CFL - 6 - row * 7; let x = 16 + (row % 2) * 7; while (x < 136) { const w = 12 + Math.floor(r() * 5); if (r() < 0.8 - row * 0.09) for (let yy = y; yy < y + 6; yy++) for (let xx = x; xx < x + w - 1; xx++) if (inHall(xx, yy) && inHall(xx, yy - 2)) S.px(xx, yy, 'mstone', (yy === y ? 5 : 4) + (xx === x ? 0.6 : 0) - (row > 3 ? 0.6 : 0), { n: [0, yy === y ? -0.7 : 0] }); x += w; } } }
    for (let x = 12; x < 140; x++) { let top = -1; for (let y = 8; y < CFL; y++) if (inHall(x, y)) { top = y; break; } if (top < 0) continue; S.px(x, top, 'ink', 0); if (hh(x, 3, 84) < 0.3) { S.px(x, top + 1, 'rock', 3); if (hh(x, 4, 84) < 0.5) S.px(x, top + 2, 'rock', 2); } }
    // the crack in the roof the light comes through
    for (let y = 5; y < 19; y++) { const x = 88 + Math.round(Math.sin(y * 0.5) * 0.8 - (18 - y) * 0.2); S.px(x - 1, y, 'ink', 0); S.px(x, y, 'ink', 1); S.px(x + 1, y, 'rock', 6);
      if (y >= 12) { const tn = y < 14 ? 8 : y < 17 ? 9 : 10; S.px(x, y, 'lamp', tn, G); S.px(x + 1, y, 'lamp', tn - (y < 16 ? 1 : 0), G); S.px(x + 2, y, 'rock', 6); } }   // the slit the daylight comes through
    // flagstones
    for (let x = 16; x < 138; x++) for (let y = CFL; y < CFL + 5; y++) { if (!inHall(x, CFL - 1) && y > CFL) continue; const seam = (x + (y > CFL + 2 ? 7 : 0)) % 15 === 0; S.px(x, y, 'mstone', y === CFL ? 6 : seam ? 2 : 4 - (y - CFL) * 0.3, { n: [0, y === CFL ? -0.8 : 0] }); }
    // a broken column on the left, a fallen drum at its foot
    S.lay('back'); S.beg(); S.cyl(24, 30, 11, CFL - 30, 'mstone', 5, { rim: 2 }); for (let x = 26; x < 34; x += 3) S.vl(x, 32, CFL - 34, 'mstone', 3.6); S.box(21, CFL - 5, 17, 5, 'mstone', 5, { top: 1 }); S.end();
    S.beg(); S.poly([[24, 30], [27, 26], [29, 29], [31, 25], [35, 30]], 'mstone', 6); S.end();
    S.lay('mid'); S.beg(); S.ell(46, CFL - 5, 7, 5, 'mstone', 5, { dome: 1 }); S.ell(52, CFL - 5, 2.5, 5, 'mstone', 3); S.hl(40, CFL - 8, 6, 'mstone', 7); S.end();
    // the throne: a tall spired back, gilded edges, a worn crimson panel; arms; the seat
    S.lay('back'); S.beg(); const tx = 68, tw = 30, ty = 30;
    S.box(tx, ty, tw, CFL - ty, 'stone', 4); S.rect(tx + 4, ty + 8, tw - 8, 24, 'crimson', 4); S.vgrad(tx + 4, ty + 8, tw - 8, 24, 'crimson', 5, 3); for (let k = 0; k < 4; k++) S.px(tx + 8 + k * 5, ty + 14 + (k % 2) * 6, 'gold', 6);
    S.rect(tx, ty, 2, CFL - ty, 'gold', 6); S.rect(tx + tw - 2, ty, 2, CFL - ty, 'gold', 4); S.hl(tx, ty, tw, 'gold', 7); S.hl(tx + 4, ty + 7, tw - 8, 'gold', 7); S.hl(tx + 4, ty + 32, tw - 8, 'gold', 5);
    S.poly([[tx + 8, ty], [tx + 15, ty - 9], [tx + 22, ty]], 'stone', 5); S.line(tx + 9, ty - 1, tx + 15, ty - 8, 'gold', 7); S.px(tx + 15, ty - 10, 'gold', 9);
    S.poly([[tx - 1, ty + 1], [tx + 2, ty - 7], [tx + 5, ty + 1]], 'stone', 5); S.px(tx + 2, ty - 8, 'gold', 8); S.poly([[tx + 25, ty + 1], [tx + 27, ty - 3], [tx + 29, ty - 1], [tx + 31, ty + 1]], 'stone', 3);   // the right spire broke off
    S.end();
    S.beg(); S.box(tx - 5, 58, 8, 5, 'stone', 5, { top: 2 }); S.box(tx + tw - 3, 58, 8, 5, 'stone', 4, { top: 2 }); S.ell(tx - 5, 58, 2.5, 2.5, 'gold', 7, { dome: 1 }); S.ell(tx + tw + 4, 58, 2.5, 2.5, 'gold', 6, { dome: 1 });
    S.rect(tx - 3, 63, 4, CFL - 63, 'stone', 3.5); S.rect(tx + tw - 1, 63, 4, CFL - 63, 'stone', 3); S.end();
    S.lay('mid'); S.beg(); S.box(tx + 1, 66, tw - 2, 5, 'crimson', 5, { top: 2 }); S.box(tx + 1, 71, tw - 2, CFL - 71, 'stone', 4); S.hl(tx + 1, 71, tw - 2, 'gold', 7); S.hl(tx + 1, CFL - 1, tw - 2, 'gold', 4); for (let x = tx + 5; x < tx + tw - 3; x += 6) S.rect(x, 74, 3, 4, 'stone', 2.5); S.end();
    // the broken spire lying at the foot
    S.beg(); S.poly([[tx + 34, CFL], [tx + 38, CFL - 6], [tx + 40, CFL - 5], [tx + 37, CFL]], 'stone', 4); S.px(tx + 39, CFL - 6, 'gold', 7); S.end();
    // the crown on the seat: a gold band, five points, a ruby and two sapphires
    S.beg(); const cx = CRN[0], cy = CRN[1];
    S.spr(cx - 6, cy - 6, ['o.....o.....o', '#....###....#', '##..#####..##', '###.#####.###', '#############', '#.b.#.r.#.b.#', '#############'],
      { o: ['gold', 10], '#': ['gold', 7], '.': null, b: ['tile', 8, { e: 3 }], r: ['red', 7, { e: 3 }] });
    for (let y = cy - 5; y <= cy; y++) { S.tone(cx - 6, y, 1); S.tone(cx + 6, y, -1.5); } S.hl(cx - 6, cy - 2, 13, 'gold', 9); S.hl(cx - 6, cy, 13, 'gold', 4); S.px(cx - 6, cy - 1, 'gold', 5); [cx - 4, cx - 2, cx + 2, cx + 4].forEach(x => S.px(x, cy - 1, 'gold', 6));
    S.px(cx, cy - 1, 'red', 9, { e: 3 }); S.px(cx - 1, cy - 1, 'gold', 6); S.px(cx + 1, cy - 1, 'gold', 6); S.px(cx - 1, cy - 4, 'gold', 9); S.px(cx, cy - 5, 'gold', 9); S.end();
    // the coin heap
    S.lay('mid'); S.beg(); for (let x = 99; x < 126; x++) { const u = (x - 112) / 13, top = Math.round(CFL - 8 * (1 - u * u)); for (let y = top; y < CFL; y++) S.px(x, y, 'gold', 4.4 + (y === top ? 2 : 0) - (y - top) * 0.15, { n: [0, y === top ? -0.7 : 0] }); } S.end();
    COINS.forEach(([x, y, face]) => { S.hl(x - 1, y, 3, 'gold', face ? 9 : 7); S.px(x - 1, y + 1, 'gold', 5); S.px(x + 1, y + 1, 'gold', 4); });
    sc.emit({ k: 'dust', x: 84, y: 30, w: 16, h: 40, rate: 4, sp: 3, life: 3.2 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10), fl = q < 0.1 ? Math.sin(q / 0.1 * Math.PI) : 0, roll = q > 0.05 && q < 0.35 ? (q - 0.05) / 0.3 : -1;
    rs.mul[2] = 1 + fl * 1.5;
    // the banner, stirring in the draught from the crack
    D.lay('mid'); D.beg(); for (let k = 0; k < 20; k++) { const y = 20 + k, sw = Math.sin(t * 1.3 - k * 0.25) * (k / 20) * 1.6, x0 = 44 + Math.round(sw), w = k > 16 ? (k % 2 ? 3 : 7) : 9;
      for (let i = 0; i < w; i++) D.px(x0 + i, y, 'crimson', i === 0 ? 6 : i === w - 1 ? 3 : 5); if (k === 6) { D.px(x0 + 2, y, 'gold', 8); D.px(x0 + 4, y, 'gold', 8); D.px(x0 + 6, y, 'gold', 8); } if (k === 7) D.hl(x0 + 2, y, 5, 'gold', 7); if (k === 8) D.hl(x0 + 2, y, 5, 'gold', 5); }
    D.hl(42, 19, 13, 'wood', 5); D.px(41, 19, 'wood', 7); D.px(55, 19, 'wood', 7); D.end();
    // glints running over the crown and the heap
    D.lay('mid'); const gp = [[CRN[0] - 6, CRN[1] - 5], [CRN[0], CRN[1] - 9], [CRN[0] + 6, CRN[1] - 5], [106, 77], [117, 75], [112, 74]];
    gp.forEach(([x, y], i) => { const a = Math.sin(t * (1.1 + i * 0.37) + i * 2); if (a > 0.55) star4(D, x, y, 'lamp', 11, (a - 0.55) / 0.45); });
    if (fl > 0) { star4(D, CRN[0], CRN[1] + 1, 'red', 10, fl); D.px(CRN[0], CRN[1] + 1, 'linen', 11, G); }
    // a coin rolls off the heap, bouncing, and drops into a crack between the flagstones
    if (roll >= 0) { const k = roll, x = 110 - k * 58, bounce = Math.abs(Math.sin(k * 11)) * (1 - k) * 5, y = CFL - 4 - bounce - (k < 0.12 ? (0.12 - k) * 30 : 0), w = [4, 3, 1, 3][Math.floor(t * 14) % 4];
      if (k < 0.92) { D.beg(); D.rect(Math.round(x) - Math.floor(w / 2), Math.round(y), w, 4, 'gold', w === 1 ? 5 : 7, G); D.hl(Math.round(x) - Math.floor(w / 2), Math.round(y), w, 'gold', 9, G); D.px(Math.round(x), Math.round(y) + 1, 'gold', 10, G); D.end(); } else if (!st.c) { st.c = 1; rs.burst('glint', x, CFL - 2, 3, { sp: 12, life: 0.5 }); } }
    if (q < 0.02 && !st.f) { st.f = 1; rs.flash(0, 1.2); rs.burst('glint', CRN[0], CRN[1] - 3, 7, { sp: 30, life: 0.7, w: 12, h: 6 }); } if (q > 0.5) { st.f = 0; st.c = 0; }
  },
});
X.TILEF.crown = (D, t) => {
  // a thread of gold wandering along the floor with gold flecks strewn beside it, a ruby chip here and there; a gleam runs it
  const yy = (x) => 95 + Math.round(Math.sin(x * 0.085 + 4) * 1.2 + Math.sin(x * 0.19 + 1) * 0.6), p = steps(t, 4) * 200 - 30;
  for (let x = 3; x < 147; x++) { const y = yy(x), d = Math.abs(x - p); if (d < 3) D.px(x, y, 'gold', 10.6 - d, G); else D.px(x, y, 'gold', 6.4, FZ(y)); }
  for (let x = 8, i = 0; x < 143; i++) { const y = yy(x) + (hh(i, 2, 94) < 0.5 ? -2 : 2), tw = Math.sin(t * (1 + hh(i, 4, 94)) + i * 2.3);
    D.px(x, y, 'gold', tw > 0.85 ? 10 : 7.6, tw > 0.85 ? G : FZ(y)); if (hh(i, 3, 94) < 0.45) D.px(x + 1, y, 'gold', 5, FZ(y));
    if (i % 4 === 2) D.px(x + 3, yy(x + 3), 'red', 8, G); x += 9 + Math.floor(hh(i, 1, 94) * 8); }
};

})();
