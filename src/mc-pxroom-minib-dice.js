// ==== mc-pxroom-minib-dice.js ====
(function () {
// 骰子对决 · a gambling den under a swinging billiard lamp, in two halves because the top-hat shadow (a character module)
// sits between them: mb_dice is the room behind him (wine damask over dark panelling, a velvet valance that carries the rule
// line, the portrait of a man in a top hat whose eyes follow you, the midnight clock, the bottle cabinet and its red lamp),
// mb_dice_fg is everything in front of him (the oval card table with a padded leather rail and brass studs, chips, dice,
// his leather cup, the croupier rake, the green-shaded lamp with its hard pool of light and smoky cone). Both halves declare
// the same lights. The dice are real 3D cubes ray-cast per pixel from an orientation matrix (rounded edges, three faces,
// correct pips, lit by the lamp), so they tumble and teeter on an edge as clean pixel art.
//
// View: orthographic, looking down ~37° (world X right, Y up, Z toward us → screen x = X, y = −Y·0.8 + Z·0.6). Art px.
// o (read-only, every field optional):
//   dice:  [{ x, y: where it stands on the felt (footprint centre), h: height above the felt, m: 3×3 local→world rotation
//            (9 numbers, row-major; MB.dice.orient / rot / teeter build them), glow: 0…1 gold (double six) }]
//   cup:   { x, y: mouth centre on the felt, lift: 0…1 (off the felt, 26 px at 1), shake: 0…1, tilt: rad (+ = tips right) }
//   chips: { mine: 0…20, his: 0…20, pot: 0…12 (chips resting in the stacks), hov: 0…1 (your stacks brighten, a chip tips up),
//            slide: { from: 'me'|'him'|'pot', to: 'me'|'him'|'pot', n: chips moving, p: 0…1 } (not yet left → drawn on the
//            source stacks, arrived → on the destination; from 'pot' to 'me' is an avalanche: chips hop, scatter and flip) }
//   rake:  0…1 (0 = lying on the far rail, >0 = held from his side, 1 = its head at the pot)
//   lamp:  { a: sideways swing (rad, default: swings by itself), b: fore-aft swing (rad, + = toward you), to: x or {x, y}
//            (the lamp is pulled till its pool lies there; null lets it go), flare: 0…1 }
//   eyes:  { x, y } the portrait looks at this point (the cursor)
//   puff:  { x, y, age } felt dust when a die lands (a new puff each time age restarts)
//   tier:  0…4 of the last result (echo particles)
const M = window.MC, X = M.PXR; if (!X || !X.MINIB) return;
const MB = X.MINIB, { n1, MI, vnoise } = X, { AW, AH, clamp, hash, flame } = MB;
const R = Math.random, TAU = Math.PI * 2;
const SE = 0.6, CE = 0.8, PG = 3.2;                                  // view tilt; the engine's light → tone gain
const TB = { cx: 150, cy: 110, rx: 118, ry: 50, ox: 127, oy: 57 };  // felt ellipse, outer rail ellipse
const zOf = (y) => clamp(Math.round(10 + (y - 60) * 0.5), 0, 110);  // the table top recedes: depth for lighting
const smooth = (a) => a * a * (3 - 2 * a);
const mBone = MI.bone, mInk = MI.ink, mLeaf = MI.leaf, mRed = MI.red, mTile = MI.tile, mGold = MI.gold, mBrass = MI.brass, mIron = MI.iron, mWood = MI.wood, mLeather = MI.leather, mLamp = MI.lamp;
const O = { n: [0, 0], z: 0, e: 0 };
const P = (D, x, y, m, t, nx, ny, z, e) => { O.n[0] = nx; O.n[1] = ny; O.z = z; O.e = e || 0; D.px(x, y, m, t, O); };

// ───────── dice: orientation matrices ─────────
// local faces: +Y 1, −Y 6, +Z 2, −Z 5, +X 3, −X 4 (opposites sum to 7; 1-2-3 run counter-clockwise round their corner)
const FN = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [0, 0, 1], 5: [0, 0, -1], 3: [1, 0, 0], 4: [-1, 0, 0] };
const FACE = [[4, 3], [6, 1], [5, 2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mmul = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; };
function rotM(ax, a) {
  const v = ax === 'x' ? [1, 0, 0] : ax === 'y' ? [0, 1, 0] : ax === 'z' ? [0, 0, 1] : ax, l = Math.hypot(v[0], v[1], v[2]) || 1, x = v[0] / l, y = v[1] / l, z = v[2] / l, c = Math.cos(a), s = Math.sin(a), C = 1 - c;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
// face `up` on top, face `right` toward +X (must be adjacent), as a local→world matrix
function basis(up, right) { if (right == null || right === up || right === 7 - up) right = up === 3 || up === 4 ? 1 : 3; const ex = FN[right], ey = FN[up], ez = cross(ex, ey); return [ex[0], ex[1], ex[2], ey[0], ey[1], ey[2], ez[0], ez[1], ez[2]]; }
const orient = (top, yaw, right) => mmul(rotM('y', yaw || 0), basis(top, right));
// rotate a matrix by `ang` about a world axis ('x' | 'y' | 'z' | [x, y, z]) — tumbling: m = rot(m, spinAxis, speed·dt)
const rot = (m, axis, ang) => mmul(rotM(axis, ang), m);
// balanced between face `top` and the adjacent face `side`: k −1 = flat on top, 0 = on the edge, 1 = flat on side
const teeter = (top, side, yaw, k) => mmul(rotM('y', yaw || 0), mmul(rotM('z', Math.PI / 4 * (1 + clamp(k, -1, 1))), basis(top, side)));
const faceUp = (m) => { const a = [m[3], m[4], m[5]].map(Math.abs), j = a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2; return FACE[j][m[3 + j] > 0 ? 1 : 0]; };

// ───────── dice: per-pixel ray cast of a rounded cube ─────────
const DS = 13, DH = DS / 2, DRr = 2, DA = DH - DRr, DPO = DH * 0.52, DPR = 1.3;
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
// per-pixel geometry of one die (which pixels it covers, their world normals, pips), cached by orientation and sub-pixel
// offset: a die at rest costs only its shading each frame; a tumbling one is ray-cast afresh
const DGEO = new Map();
function dieGeo(m, fx, fy) {
  const key = m.map(v => Math.round(v * 4000)).join(',') + '|' + Math.round(fx * 32) + ',' + Math.round(fy * 32); let G = DGEO.get(key); if (G) return G;
  const l0 = -SE * m[3] - CE * m[6], l1 = -SE * m[4] - CE * m[7], l2 = -SE * m[5] - CE * m[8];   // the view ray in die space
  let bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
  for (let c = 0; c < 8; c++) { const a = c & 1 ? DH : -DH, b = c & 2 ? DH : -DH, e = c & 4 ? DH : -DH, sx = m[0] * a + m[1] * b + m[2] * e, sy = -(m[3] * a + m[4] * b + m[5] * e) * CE + (m[6] * a + m[7] * b + m[8] * e) * SE;
    if (sx < bx0) bx0 = sx; if (sx > bx1) bx1 = sx; if (sy < by0) by0 = sy; if (sy > by1) by1 = sy; }
  const x0 = Math.floor(fx + bx0) - 2, y0 = Math.floor(fy + by0) - 2, n = Math.max(Math.ceil(bx1 - bx0), Math.ceil(by1 - by0)) + 5, mk = new Uint8Array(n * n), cells = [];
  for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) {
    const sx = x0 + xx + 0.5 - fx, sy = y0 + yy + 0.5 - fy, Ox = sx, Oy = -sy * CE + 14 * SE, Oz = sy * SE + 14 * CE;
    const o0 = m[0] * Ox + m[3] * Oy + m[6] * Oz, o1 = m[1] * Ox + m[4] * Oy + m[7] * Oz, o2 = m[2] * Ox + m[5] * Oy + m[8] * Oz;
    let tn = -1e9, tf = 1e9, miss = false;
    for (let j = 0; j < 3 && !miss; j++) { const o = j === 0 ? o0 : j === 1 ? o1 : o2, l = j === 0 ? l0 : j === 1 ? l1 : l2;
      if (Math.abs(l) < 1e-7) { if (Math.abs(o) > DH) miss = true; continue; }
      let a = (-DH - o) / l, b = (DH - o) / l; if (a > b) { const q = a; a = b; b = q; } if (a > tn) tn = a; if (b < tf) tf = b; if (tn > tf) miss = true; }
    if (miss) continue;
    let s = tn, p0 = 0, p1 = 0, p2 = 0, hit = false;
    for (let k = 0; k < 14; k++) { p0 = o0 + s * l0; p1 = o1 + s * l1; p2 = o2 + s * l2;
      const q0 = Math.abs(p0) - DA, q1 = Math.abs(p1) - DA, q2 = Math.abs(p2) - DA, e0 = Math.max(q0, 0), e1 = Math.max(q1, 0), e2 = Math.max(q2, 0);
      const dist = Math.sqrt(e0 * e0 + e1 * e1 + e2 * e2) + Math.min(Math.max(q0, q1, q2), 0) - DRr; if (dist < 0.03) { hit = true; break; } s += dist; if (s > tf) break; }
    if (!hit) continue;
    // normal (die space): from the inner box to the surface point; which face; pips
    let n0 = p0 - clamp(p0, -DA, DA), n1_ = p1 - clamp(p1, -DA, DA), n2 = p2 - clamp(p2, -DA, DA), nl = Math.sqrt(n0 * n0 + n1_ * n1_ + n2 * n2);
    const a0 = Math.abs(p0), a1 = Math.abs(p1), a2 = Math.abs(p2); let j, u, w, sg;
    if (a0 >= a1 && a0 >= a2) { j = 0; sg = p0; u = p2; w = p1; } else if (a1 >= a2) { j = 1; sg = p1; u = p0; w = p2; } else { j = 2; sg = p2; u = p0; w = p1; }
    if (nl < 1e-4) { n0 = j === 0 ? Math.sign(p0) : 0; n1_ = j === 1 ? Math.sign(p1) : 0; n2 = j === 2 ? Math.sign(p2) : 0; nl = 1; }
    n0 /= nl; n1_ /= nl; n2 /= nl;
    const f = FACE[j][sg > 0 ? 1 : 0], PP = PIPS[f], pr = f === 1 ? 1.75 : DPR; let pip = 0;
    for (let q = 0; q < PP.length; q++) { const du = u - PP[q][0] * DPO, dw = w - PP[q][1] * DPO; if (du * du + dw * dw < pr * pr) { pip = f === 1 ? 2 : 1; break; } }
    mk[yy * n + xx] = 1;
    cells.push(xx, yy, m[0] * n0 + m[1] * n1_ + m[2] * n2, m[3] * n0 + m[4] * n1_ + m[5] * n2, m[6] * n0 + m[7] * n1_ + m[8] * n2, pip);
  }
  G = { x0, y0, n, mk, c: new Float32Array(cells) };
  if (DGEO.size > 40) DGEO.delete(DGEO.keys().next().value); DGEO.set(key, G); return G;
}
function drawDie(D, d, L, t) {
  const m = d.m || orient(1, -0.5), h = Math.max(0, d.h || 0), g = d.glow || 0, pl = L.pool;
  const low = (Math.abs(m[3]) + Math.abs(m[4]) + Math.abs(m[5])) * DA + DRr, cx = d.x, cy = d.y - (low + h) * CE, ix = Math.floor(cx), iy = Math.floor(cy);
  const G = dieGeo(m, cx - ix, cy - iy), C = G.c, n = G.n, mk = G.mk, x0 = ix + G.x0, y0 = iy + G.y0;
  // the lamp as seen from the die (world), its half vector with the view, how much of its pool reaches here
  let Lx = L.mouth[0] - d.x, Ly = 80 - h, Lz = (pl.y - d.y) / SE; const ll = Math.hypot(Lx, Ly, Lz); Lx /= ll; Ly /= ll; Lz /= ll;
  let Hx = Lx, Hy = Ly + SE, Hz = Lz + CE; const hl = Math.hypot(Hx, Hy, Hz); Hx /= hl; Hy /= hl; Hz /= hl;
  const lamp = poolAt(pl, d.x, d.y), z = zOf(d.y) + 6;
  D.beg();
  for (let q = 0; q < C.length; q += 6) {
    const px = x0 + C[q], py = y0 + C[q + 1], w0 = C[q + 2], w1 = C[q + 3], w2 = C[q + 4], pip = C[q + 5], snx = w0, sny = -(w1 * CE - w2 * SE);
    const lam = Math.max(0, w0 * Lx + w1 * Ly + w2 * Lz), sp = Math.max(0, w0 * Hx + w1 * Hy + w2 * Hz), s8 = sp * sp * sp * sp, spec = s8 * s8 * s8;
    if (pip === 2) { P(D, px, py, mRed, 3.6 + lamp * lam * 2 + g * 2, snx, sny, z, g > 0.4 ? 255 : 0); continue; }
    if (pip === 1) { P(D, px, py, mInk, 1 + (g > 0.4 ? 0 : lamp * lam * 0.6), snx, sny, z); continue; }
    // three-tone cube shading: the top brightest, the face toward the lamp next, the far side darkest; the lamp's pool on top
    const face = 3.1 * Math.max(0, w1) + 0.5 * Math.max(0, w2) + (w0 * Lx > 0 ? 0.3 : -1.3) * Math.abs(w0);
    if (g > 0.05) { P(D, px, py, g > 0.5 ? mGold : mBone, 6.6 + face * 0.9 + 1.2 * lam + g * 1.4 + spec * 1.5, snx, sny, z, g > 0.35 ? 255 : 0); continue; }
    P(D, px, py, mBone, 5.3 + face + PG * lamp * lam * 0.55 + spec * (1 + lamp * 2.2), snx, sny, z);
  }
  if (g > 0.05) {   // gold halo: a hard ring hugging the silhouette, a dithered second ring
    D.end({ none: 1 }); const pu = 0.5 + 0.5 * Math.sin(t * 9);
    for (let yy = 2; yy < n - 2; yy++) for (let xx = 2; xx < n - 2; xx++) { if (mk[yy * n + xx]) continue; const nb = mk[yy * n + xx - 1] + mk[yy * n + xx + 1] + mk[(yy - 1) * n + xx] + mk[(yy + 1) * n + xx];
      if (nb) { P(D, x0 + xx, y0 + yy, mGold, 7.5 + 3 * g * pu, 0, 0, z, 255); continue; }
      const n2 = mk[yy * n + xx - 2] + mk[yy * n + xx + 2] + mk[(yy - 2) * n + xx] + mk[(yy + 2) * n + xx] + mk[(yy - 1) * n + xx - 1] + mk[(yy - 1) * n + xx + 1] + mk[(yy + 1) * n + xx - 1] + mk[(yy + 1) * n + xx + 1];
      if (n2 && X.bayer(x0 + xx, y0 + yy) < 0.5 * g) P(D, x0 + xx, y0 + yy, mGold, 5.5 + 2 * g * pu, 0, 0, z, 255); }
  } else D.end();
  return { cx, cy, z };
}
// the light pool on the felt (hard edge — the shade cuts it off)
function poolAt(Pl, x, y) { const u = (x - Pl.x) / Pl.rx, v = (y - Pl.y) / Pl.ry, d = u * u + v * v; if (d >= 1.14) return 0; return Pl.i * (d < 1 ? 1 - 0.34 * d : (1.14 - d) / 0.14 * 0.66); }

// ───────── the lamp: pendulum from the ceiling ─────────
const LPV = [184, -2], LC = 32, LPY = 106, LPL = 108, LPZ = 62;
function lampState(tr, o, st) {
  const L = o.lamp || {}, dt = st.lt == null ? 0 : clamp(tr - st.lt, 0, 0.1); st.lt = tr;
  let ax = L.a != null ? L.a : 0.16 * Math.sin(tr * 0.9) + 0.03 * Math.sin(tr * 2.3 + 1.1), az = L.b != null ? L.b : 0.045 * Math.sin(tr * 0.63 + 0.5);
  const to = L.to; if (to != null) { st.lx = typeof to === 'number' ? to : to.x; st.ly = typeof to === 'number' ? null : to.y; }
  st.pull = (st.pull || 0) + ((to != null ? 1 : 0) - (st.pull || 0)) * (1 - Math.exp(-dt * 4.2));
  if (st.pull > 0.001 && st.lx != null) { const k = smooth(clamp(st.pull, 0, 1)), axT = Math.asin(clamp((st.lx - LPV[0]) / LPL, -0.7, 0.7)) + 0.02 * Math.sin(tr * 3.3), azT = st.ly != null ? Math.asin(clamp((st.ly - LPY) / LPZ, -0.6, 0.6)) : az; ax += (axT - ax) * k; az += (azT - az) * k; }
  const fl = L.flare || 0, sa = Math.sin(ax), ca = Math.cos(ax), sz = Math.sin(az);
  const cap = [LPV[0] + LC * sa, LPV[1] + LC * ca + 5 * sz], mouth = [cap[0] + 13.5 * sa, cap[1] + 13.5 * ca];
  const pool = { x: LPV[0] + LPL * sa, y: LPY + LPZ * sz, rx: 56 + 26 * Math.abs(sa), ry: 23 + 10 * Math.abs(sz), i: (1.2 + 0.55 * fl) * (0.97 + 0.03 * n1(tr * 7)) };
  return (st.L = { ax, az, sa, ca, sz, cap, mouth, pool, fl, open: clamp(sz * 8, 0, 1) });
}
function lampLights(rs, L) { rs.dl.push({ x: L.mouth[0], y: L.mouth[1] + 3, z: 34, r: 40, i: 0.45 + 0.5 * L.fl, rgb: [255, 214, 150], tint: 0 }); if (L.fl > 0) rs.flash(0, L.fl * 0.7); }
// the smoky cone under the shade: a dithered warm haze in hard eighth-steps (like the engine's shafts), densest in the smoke
let SMK = null;
function smokeTex() { if (SMK) return SMK; SMK = new Float32Array(64 * 64); for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { let v = 0; [[8, 0.6, 3], [4, 0.3, 4], [2, 0.1, 5]].forEach(([c, a, s]) => { const f = 64 / c; v += a * (vnoise(x / f, y / f, s) * (1 - x / 64) * (1 - y / 64) + vnoise((x - 64) / f, y / f, s) * (x / 64) * (1 - y / 64) + vnoise(x / f, (y - 64) / f, s) * (1 - x / 64) * (y / 64) + vnoise((x - 64) / f, (y - 64) / f, s) * (x / 64) * (y / 64)); }); SMK[y * 64 + x] = v; } return SMK; }
const HZC = [255, 214, 130];
function coneHaze(out, L, tr, fg) {
  const T = smokeTex(), m = L.mouth, Pl = L.pool, y0 = Math.max(0, Math.ceil(m[1])), y1 = Math.min(fg ? AH - 1 : 72, Math.floor(Pl.y + Pl.ry)), k0 = 0.15 + 0.1 * L.fl, sx = Math.floor(tr * 2.2), sy = Math.floor(tr * 4.6), sx2 = Math.floor(tr * -1.3), sy2 = Math.floor(tr * 3.1);
  for (let y = y0; y <= y1; y++) {
    const k = clamp((y + 0.5 - m[1]) / (Pl.y - m[1]), 0, 1), cxr = m[0] + (Pl.x - m[0]) * Math.min(1, k); let hw = 11.5 + (Pl.rx - 11.5) * Math.min(1, k);
    if (y + 0.5 > Pl.y) { const v = (y + 0.5 - Pl.y) / Pl.ry; if (v >= 1) continue; hw = Pl.rx * Math.sqrt(1 - v * v); }
    const xa = Math.max(0, Math.ceil(cxr - hw)), xb = Math.min(AW - 1, Math.floor(cxr + hw)), felt = 1 - 0.4 * clamp((y - Pl.y + Pl.ry) / 12, 0, 1);
    for (let x = xa; x <= xb; x++) { const p = y * AW + x; if (fg && !(out[p] >>> 24)) continue;
      const u = (x + 0.5 - cxr) / hw, sm = T[((y + sy) & 63) * 64 + ((x + sx) & 63)] * 0.6 + T[((y + sy2 + 17) & 63) * 64 + ((x + sx2 + 29) & 63)] * 0.4;
      let a = (k0 + 0.55 * Math.max(0, sm - 0.36)) * (1 - 0.55 * k) * (1 - u * u * 0.6) * felt;
      const aq = Math.min(0.45, Math.floor(a * 8) / 8); if (aq > 0) X.blendPx(out, p, HZC, aq); }
  }
}

// ───────── lights: both halves declare the same ones ─────────
function lights(sc) {
  sc.light({ x: 184, y: 48, z: 46, r: 150, i: 0.3, c: '#ffd79a', tint: 0.2 });                       // 0 the lamp, broad
  sc.light({ x: 184, y: 37, z: 22, r: 34, i: 0.42, c: '#6ee07a', tint: 0.6 });                        // 1 green glass glow round the shade
  sc.light({ x: 43, y: 31, z: 12, r: 50, i: 0.9, c: '#ffc27a', fl: 'buzz', ph: 2, tint: 0.35 });      // 2 picture light
  sc.light({ x: 280, y: 38, z: 14, r: 62, i: 0.62, c: '#ff5a3a', fl: 'candle', ph: 3, tint: 0.45 });  // 3 red lamp in the cabinet
  sc.light({ x: 150, y: 205, z: 150, r: 270, i: 0.34, c: '#7c86ff', tint: 0.2 });                    // 4 cold fill from the room behind you
  sc.light({ x: 270, y: 93, z: 30, r: 13, i: 0.35, c: '#ff7a3a', fl: 'candle', ph: 5, tint: 0.5 });  // 5 cigar ember
  sc.light({ x: 150, y: 110, z: 66, r: 92, i: 1, c: '#ffcc55', bake: false, tint: 0.3 });           // 6 gold (double six), rs.mul
  sc.light({ x: 80, y: 34, z: 12, r: 48, i: 0.55, c: '#ffb45a', fl: 'candle', ph: 7, tint: 0.4 });   // 7 wall candle, left
}
const PK = MB.PK;
PK.fluff = { g: 30, drag: 2.4, ramp: ['leaf', [9, 8, 7, 6, 5, 4]], wob: 4 };
PK.goldd = Object.assign({}, PK.gold, { light: null });   // gold sparks without a light of their own (the glow is light 6)

// ═════════════════════ back: the den ═════════════════════
X.def('mb_dice', {
  size: [AW, AH], fy: 97, noFrame: 1, amb: [0.15, 0.2],
  paint(S, sc) {
    S.lay('wall');
    // ceiling: coffered boards (under the marquee)
    S.rect(0, 0, AW, 12, 'wood', 1.6); for (let x = 4; x < AW; x += 26) { S.rect(x, 0, 4, 11, 'wood', 2.4); S.vl(x, 0, 11, 'wood', 3.2); S.vl(x + 3, 0, 11, 'wood', 1); }
    S.hl(0, 11, AW, 'wood', 1);
    // wallpaper: wine damask — a dotted trellis with a small fleur in every diamond, aged and water-stained
    S.rect(0, 22, AW, 57, 'crimson', 2.7);
    for (let y = 22; y < 79; y++) for (let x = 0; x < AW; x++) { const a = ((x + y) % 16 + 16) % 16, b = ((x - y) % 16 + 16) % 16; if ((a === 0 || b === 0) && (x + y) % 2 === 0) S.px(x, y, 'crimson', 3.6); }
    const FL = ['..a..', '.aba.', '.aba.', 'a.a.a', 'aaaaa', '..a..', '.a.a.'];
    for (let j = 0; j < 6; j++) for (let i = 0; i < 20; i++) [[16 * i + 8, 16 * j + 16], [16 * i, 16 * j + 24]].forEach(([cx, cy]) => { if (cy < 26 || cy > 76) return; FL.forEach((row, r) => { for (let c = 0; c < 5; c++) if (row[c] !== '.') S.px(cx - 2 + c, cy - 3 + r, row[c] === 'b' ? 'gold' : 'crimson', row[c] === 'b' ? 2.4 : 3.9); }); });
    S.noise(0, 22, AW, 57, 1, 6, 17);
    for (let k = 0; k < 9; k++) { const x0 = 12 + k * 33 + ((k * 17) % 11), len = 10 + (k * 7) % 22; for (let y = 26; y < 26 + len; y++) if (hash(x0, y, 3) < 0.7) S.tone(x0 + ((y * 3 + k) % 5 === 0 ? 1 : 0), y, -0.8); }
    // a warmer patch of wall behind his seat (the lamp's spill), so the ink-black shadow reads against it
    for (let y = 24; y < 70; y++) for (let x = 104; x < 197; x++) { const d = Math.hypot((x - 150) / 44, (y - 44) / 24); if (d < 1) S.tone(x, y, d < 0.6 ? 1.1 : 0.55); }
    S.ao(0, 22, AW, 14, 't', 1.8); S.ao(0, 60, AW, 19, 'b', 0.9); S.ao(0, 0, 36, 97, 'l', 1.2); S.ao(AW - 36, 0, 36, 97, 'r', 1.2);
    // chair rail, raised-panel wainscot, baseboard
    S.hl(0, 78, AW, 'wood', 5.6, { n: [0, -0.8] }); S.hl(0, 79, AW, 'wood', 4.2); S.hl(0, 80, AW, 'wood', 1.6);
    S.rect(0, 81, AW, 13, 'wood', 2.6);
    for (let x = -6; x < AW; x += 27) { S.box(x + 2, 82, 24, 11, 'wood', 3.1); S.box(x + 5, 84, 18, 7, 'wood', 3.7); S.hl(x + 6, 85, 16, 'wood', 4.4); }
    S.noise(0, 81, AW, 13, 1, 3, 19);
    S.rect(0, 93, AW, 4, 'wood', 2.2); S.hl(0, 93, AW, 'wood', 4.4, { n: [0, -0.8] }); S.hl(0, 96, AW, 'wood', 0.8);
    // floor: dark boards, a wine rug with a gold border under the table
    for (let y = 97; y < AH; y++) for (let x = 0; x < AW; x++) { const row = Math.floor((y - 97) / 5), sh = (row * 23) % 37, seam = ((x + sh) % 37) === 0 || (y - 97) % 5 === 0;
      S.px(x, y, 'wood', seam ? 1.2 : 2.3 + (hash(Math.floor((x + sh) / 37), row, 7) - 0.5) * 1.2 + (vnoise(x / 9, y / 1.2, 29) - 0.5) * 0.9); }
    for (let y = 103; y < AH; y++) { const sp = (y - 103) * 0.12, xa = Math.round(10 - sp), xb = Math.round(AW - 10 + sp);
      for (let x = xa; x < xb; x++) { const e = Math.min(x - xa, xb - 1 - x, y - 103); let m = 'crimson', tn = 3.2;
        if (e < 1) tn = 1.8; else if (e < 5) { m = 'gold'; tn = (e === 2 ? 4.6 : 3.2) + (((x + y) % 4 === 0 && e === 3) ? 1 : 0); } else if (e < 6) tn = 2; else tn = 3 + ((((x >> 2) + (y >> 1)) & 3) === 0 ? 0.8 : 0) + (vnoise(x / 4, y / 2, 31) - 0.5);
        S.px(x, y, m, tn); } }
    S.shadow([[18, 104], [282, 104], [292, 175], [8, 175]], 1.6); S.ao(0, 97, AW, 8, 't', 1.6);
    // velvet valance with swags and a gold fringe (the rule line sits on it); a wooden pelmet on top
    for (let x = 0; x < AW; x++) { const f = ((x + 15) % 30) / 30, yb = 21 + Math.round(4 * Math.pow(Math.sin(Math.PI * f), 0.8));
      for (let y = 12; y <= yb; y++) { const fold = Math.sin((y - 12 - 3 * Math.sin(Math.PI * f)) * 1.1), jab = Math.abs(f - 0.5) > 0.44 ? -0.8 : 0;
        S.px(x, y, 'magic', 3.4 + fold * 0.7 + jab + (y === yb ? -1.2 : 0) + (hash(x, y, 41) - 0.5) * 0.4, { n: [0, fold * 0.4] }); }
      S.px(x, yb + 1, 'gold', x % 2 ? 6.2 : 4.6); if (x % 2 === 0) { S.px(x, yb + 2, 'gold', 4.2); if (x % 6 === 0) S.px(x, yb + 3, 'gold', 3.4); } }
    S.beg(); S.box(0, 10, AW, 3, 'wood', 3.4); S.hl(0, 11, AW, 'brass', 5.2); S.end({ none: 1 });

    // ── the portrait: a man in a top hat, gilt frame, a brass picture light above
    S.lay('back');
    S.shadow([[23, 32], [69, 32], [69, 77], [23, 77]], 1.2);
    // canvas: warm dark ground with a painted glow behind the head, brush streaks, a vignette
    for (let y = 34; y < 71; y++) for (let x = 25; x < 62; x++) { const g = Math.hypot((x - 43) / 14, (y - 47) / 16), v = vnoise(x / 3, y / 0.9, 51);
      S.px(x, y, 'mstone', 2.6 + Math.max(0, 1 - g) * 2.2 + (v - 0.5) * 1.1 - (Math.min(x - 25, 61 - x, y - 34, 70 - y) < 3 ? 0.8 : 0)); }
    // coat, lapels, shirt, cravat
    for (let y = 56; y < 71; y++) { const hw = 7 + (y - 56) * 0.75; for (let x = Math.round(43 - hw); x <= Math.round(43 + hw); x++) { if (x < 25 || x > 61) continue; const lap = Math.abs(Math.abs(x - 43) - (y - 55) * 0.45 - 1) < 0.8;
      S.px(x, y, 'night', (lap ? 3.8 : 2.3) + (x < 43 ? 0.5 : -0.3) + (vnoise(x / 2, y / 2, 53) - 0.5) * 0.8); } }
    for (let y = 56; y < 64; y++) { const hw = Math.max(0, (y - 55) * 0.45); for (let x = Math.round(43 - hw); x <= Math.round(43 + hw); x++) S.px(x, y, 'bone', 6.2 - (x > 43 ? 1 : 0)); }
    S.rect(42, 56, 3, 3, 'red', 4.2); S.px(42, 56, 'red', 5.6); S.px(43, 59, 'red', 3.4);
    S.rect(41, 54, 5, 3, 'skin', 3.6); S.px(41, 54, 'skin', 4.4);
    // head: pale, lit from above, the hat brim's shadow across the brow
    for (let y = 44; y < 55; y++) for (let x = 37; x < 50; x++) { const u = (x + 0.5 - 43.2) / 5.4, v = (y + 0.5 - 49) / 5.8; if (u * u + v * v > 1) continue;
      S.px(x, y, 'skin', 6.4 - (u > 0.2 ? 1.4 : 0) - (u > 0.6 ? 1 : 0) + (u < -0.4 ? 0.6 : 0) - (y < 46 ? 1.6 : 0) - (v > 0.7 ? 0.8 : 0)); }
    S.rect(39, 47, 3, 2, 'bone', 7.6); S.rect(45, 47, 3, 2, 'bone', 6.8);             // eye whites (the pupils are animated)
    S.hl(39, 46, 3, 'hair', 2); S.hl(45, 46, 3, 'hair', 2); S.px(38, 46, 'hair', 3);
    S.vl(44, 48, 3, 'skin', 4.2); S.px(43, 50, 'skin', 7.4); S.px(44, 51, 'skin', 3.6);
    S.hl(40, 52, 7, 'hair', 2.2); S.px(39, 51, 'hair', 2.6); S.px(47, 51, 'hair', 2.6); S.hl(41, 53, 5, 'red', 2.6); S.px(46, 53, 'red', 3.6);
    S.vl(37, 47, 5, 'hair', 2.4); S.vl(49, 47, 5, 'hair', 2);
    // top hat, a crimson band
    S.rect(38, 35, 11, 8, 'night', 1.6); S.vl(39, 36, 6, 'night', 3.4); S.vl(40, 35, 7, 'night', 2.6); S.hl(38, 35, 11, 'night', 3); S.rect(38, 41, 11, 2, 'crimson', 3.4); S.hl(38, 41, 4, 'crimson', 4.6);
    S.hl(35, 43, 17, 'night', 2.6); S.hl(34, 44, 19, 'night', 1.4); S.px(34, 43, 'night', 2); S.px(52, 43, 'night', 1.4);
    S.noise(25, 34, 37, 37, 1, 2, 55);
    // gilt frame: bevelled moulding with a lit inner bead and corner rosettes
    for (let y = 30; y < 75; y++) for (let x = 21; x < 66; x++) { const e = Math.min(x - 21, 65 - x, y - 30, 74 - y); if (e > 3) continue;
      const side = e === x - 21 || e === y - 30, tn = [3.2, 5.4, 7.2, 4.2][e] + (side ? 0.8 : -0.6) + ((x + y) % 3 === 0 && e === 1 ? 1 : 0);
      S.px(x, y, 'gold', tn, { n: e < 2 ? (side ? [-0.4, -0.4] : [0.4, 0.4]) : (side ? [0.3, 0.3] : [-0.3, -0.3]) }); }
    [[22, 31], [61, 31], [22, 70], [61, 70]].forEach(([x, y]) => { S.beg(); S.rect(x, y, 4, 4, 'gold', 6); S.px(x + 1, y + 1, 'gold', 9); S.px(x + 2, y + 2, 'gold', 3.6); S.end(); });
    S.beg(); S.rect(31, 27, 25, 2, 'brass', 5.6); S.hl(31, 27, 25, 'brass', 8); S.hl(32, 29, 23, 'lamp', 9, { e: 255 }); S.vl(43, 29, 2, 'brass', 4); S.end();

    // ── the clock: brass bezel, bone face with ticks, a little pendulum case under it (hands and bob are animated)
    S.beg(); S.box(91, 46, 15, 22, 'wood', 3.4); S.rect(94, 49, 9, 12, 'glass', 1.6); S.hl(94, 49, 9, 'glass', 3.2); S.px(95, 51, 'glass', 5); S.end();
    S.beg(); S.box(95, 27, 7, 3, 'wood', 4.2); S.px(98, 26, 'brass', 7); S.end();
    S.beg(); for (let y = -10; y <= 10; y++) for (let x = -10; x <= 10; x++) { const r = Math.hypot(x + 0.5, y + 0.5); if (r > 9.6) continue; const ux = (x + 0.5) / r, uy = (y + 0.5) / r;
      if (r > 7.6) S.px(98 + x, 39 + y, 'brass', 5.6 + (r > 8.8 ? -1.2 : 0.6), { n: [ux * 0.7, uy * 0.7] });
      else S.px(98 + x, 39 + y, 'bone', 7.6 - (r > 6.6 ? 1 : 0) - (x > 2 && y > 2 ? 0.6 : 0)); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, q = k % 3 === 0; for (let r = q ? 5.2 : 6; r < 7.1; r += 0.8) S.px(Math.round(98 + Math.cos(a) * r - 0.5), Math.round(39 + Math.sin(a) * r - 0.5), 'ink', 1.4); }
    S.px(94, 35, 'bone', 10); S.px(95, 34, 'bone', 9.5); S.end();

    // ── a brass wall sconce with a drip candle, between the portrait and the clock
    S.beg(); S.rect(74, 38, 3, 9, 'brass', 5); S.vl(74, 38, 9, 'brass', 7.6); S.px(75, 37, 'brass', 8); S.px(75, 47, 'brass', 6); S.end();
    S.beg(); S.hl(77, 44, 2, 'brass', 6); S.px(79, 45, 'brass', 5); S.hl(78, 46, 5, 'brass', 5.4); S.hl(78, 45, 5, 'brass', 7.6); S.px(80, 47, 'brass', 4); S.end();
    MB.candle(S, 80, 45, 6, 'bone', 8.4); S.px(81, 41, 'bone', 9.4); S.px(79, 43, 'bone', 7);
    S.shadow([[77, 38], [84, 38], [86, 50], [79, 50]], 0.6);

    // ── bottle cabinet: mirrored back, three shelves of bottles, a red glass lamp
    S.beg(); S.box(229, 27, 64, 70, 'wood', 3.2); S.end();
    for (let y = 31; y < 93; y++) for (let x = 232; x < 290; x++) S.px(x, y, 'glass', 1.4 + (((x - y * 0.6) % 19 + 19) % 19 < 2 ? 1.4 : 0) + (vnoise(x / 6, y / 6, 61) - 0.5) * 0.8);
    S.box(226, 25, 70, 3, 'wood', 4.6, { top: 1 }); for (let x = 228; x < 294; x += 3) S.px(x, 27, 'wood', 2);
    // bottles as little sprites: c cap, n neck, b body, l label, g crystal, s stopper, w wine / whisky inside; a lit edge
    // down the left, a dark one down the right, a glint near the shoulder
    const BT = {
      wine: [['..c..', '..n..', '..n..', '..n..', '.nnn.', 'bbbbb', 'bbbbb', 'blllb', 'blllb', 'blllb', 'bbbbb', 'bbbbb', 'bbbbb'], { c: ['red', 4.6], n: ['leaf', 2.6], b: ['leaf', 2.4], l: ['paper', 6.4] }],
      claret: [['..c..', '..n..', '..n..', '..n..', '.nnn.', 'bbbbb', 'bbbbb', 'bbbbb', 'blllb', 'blllb', 'bbbbb', 'bbbbb'], { c: ['gold', 6], n: ['red', 2.2], b: ['red', 2.2], l: ['paper', 5.6] }],
      whisky: [['...c...', '...n...', '..nnn..', 'bbbbbbb', 'bbbbbbb', 'bllllbb', 'bllllbb', 'bllllbb', 'bbbbbbb', 'bbbbbbb'], { c: ['gold', 6.4], n: ['lamp', 3.4], b: ['lamp', 3.6], l: ['ink', 1.6] }],
      decanter: [['....s....', '...sss...', '....g....', '..ggggg..', '.ggggggg.', 'ggwwwwwgg', 'gwwwwwwwg', 'gwwwwwwwg', '.gwwwwwg.', '..ggggg..'], { s: ['linen', 8], g: ['linen', 5.6], w: ['lamp', 4.4] }],
      gin: [['..c..', '..n..', '.nnn.', 'bbbbb', 'bbbbb', 'blllb', 'blllb', 'blllb', 'bbbbb', 'bbbbb', 'bbbbb'], { c: ['iron', 6], n: ['ice', 5.4], b: ['ice', 4.8], l: ['paper', 7.2] }],
      liqueur: [['..c..', '..n..', '.bbb.', 'bbbbb', 'bllbb', 'bllbb', 'bbbbb', '.bbb.'], { c: ['gold', 6], n: ['pink', 3.6], b: ['pink', 3.4], l: ['paper', 6] }],
      glass: [['ggggg', 'g...g', 'gwwwg', '.www.', '..g..', '..g..', '.ggg.'], { g: ['linen', 6.4], w: ['red', 3.6] }],
      tumbler: [['g...g', 'gwwwg', 'gwwwg', 'ggggg'], { g: ['linen', 6], w: ['lamp', 4.6] }],
    };
    const bottle = (key, x, sy) => { const [rows, pal] = BT[key], w = rows[0].length, h = rows.length; S.beg();
      rows.forEach((row, j) => { for (let i = 0; i < w; i++) { const ch = row[i], p = pal[ch]; if (!p) continue; const edgeL = i === 0 || !pal[row[i - 1]], edgeR = i === w - 1 || !pal[row[i + 1]], hi = !edgeL && (i === 1 || !pal[row[i - 2]]);
        S.px(x + i, sy - h + j, p[0], p[1] + (hi && ch !== 'l' ? 2.4 : 0) + (edgeR ? -1.2 : 0) + (edgeL ? -0.4 : 0), { n: [((i + 0.5) / w * 2 - 1) * 0.9, 0] }); } });
      S.end(); const gx = rows.findIndex(r => /[bgw]/.test(r)); if (gx >= 0) S.px(x + 1, sy - h + gx + 1, 'bone', 9.6); return w; };
    const SHELF = [[45, ['wine', 'whisky', 'decanter', 'glass', 'liqueur']], [62, ['claret', 'gin', 'whisky', 'tumbler', 'tumbler', 'wine', 'liqueur']], [79, ['decanter', 'wine', 'whisky']]];
    SHELF.forEach(([sy, list], si) => { let x = si === 2 ? 257 : 234 + si;
      list.forEach((k, i) => { x += bottle(k, x, sy - 1) + 1 + (hash(i, sy, 5) < 0.4 ? 1 : 0); });
      S.beg(); S.box(231, sy, 60, 3, 'wood', 4.4, { top: 1 }); S.end(); S.ao(232, sy + 3, 58, 4, 't', 1.2); });
    // the red glass lamp on the top shelf, right end
    S.beg(); S.rect(278, 37, 5, 6, 'red', 4.6, { e: 4 }); S.hl(278, 36, 5, 'brass', 7); S.hl(277, 43, 7, 'brass', 5); S.px(280, 35, 'brass', 8); S.end();

    // velvet drapes framing the stage
    S.lay('front');
    [[0, 15, 1], [285, 300, -1]].forEach(([xa, xb, s]) => { for (let y = 12; y < AH; y++) { const flare = y > 104 ? Math.round((y - 104) * 0.09) : 0, pinch = y > 96 && y < 106 ? 2 : 0, a = s > 0 ? xa : xa - flare + pinch, b = s > 0 ? xb + flare - pinch : xb;
      for (let x = a; x < b; x++) { const ph = (x + 0.5 + (y > 104 ? (y - 104) * 0.05 * s : 0)) / 3.8 * Math.PI, f = Math.sin(ph); S.px(x, y, 'magic', 3.2 + f * 1.3 + ((s > 0 ? b - 1 - x : x - a) === 0 ? -1.3 : 0), { n: [Math.cos(ph) * 0.7, 0] }); } } });
    [[0, 13, 1], [287, 300, -1]].forEach(([a, b, s]) => { S.beg(); for (let x = a; x < b; x++) { const q = (x - a) / (b - a), y = 99 + Math.round(Math.sin(q * Math.PI) * 1.5); S.px(x, y, 'gold', 6.4 - ((x & 1) ? 1.4 : 0), { n: [0, -0.6] }); S.px(x, y + 1, 'gold', 4 - ((x & 1) ? 0 : 1), { n: [0, 0.5] }); }
      const tx = s > 0 ? b : a - 2; S.rect(tx, 99, 2, 2, 'gold', 7); S.px(tx, 99, 'gold', 9); for (let i = 0; i < 3; i++) S.vl(tx - 0.5 + i, 101, 5 + (i % 2), 'gold', 4.6 + (i === 0 ? 1.4 : 0)); S.hl(tx - 1, 101, 4, 'gold', 6); S.end(); });

    lights(sc);
    sc.emit({ k: 'dust', x: 184, y: 56, w: 40, h: 12, rate: 1.5, sp: 2, life: 4 });
    sc.emit({ k: 'dust', x: 43, y: 42, w: 30, h: 16, rate: 1, sp: 2, life: 4 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const tr = t - rs.seed * 13, st = rs.st, L = lampState(tr, o, st);
    lampLights(rs, L); rs.mul[6] = 0;
    D.lay('back');
    // portrait eyes: the pupils slide toward the point it watches; it blinks now and then
    const ex = (o.eyes && o.eyes.x != null) ? o.eyes.x : 150, ey = (o.eyes && o.eyes.y != null) ? o.eyes.y : 150;
    const bl = ((tr % 7.3) + 7.3) % 7.3 < 0.13;
    [[40, 47], [46, 47]].forEach(([x, y], i) => { const dx = ex - x, dy = ey - y, a = Math.abs(dx) > 40 + Math.abs(dy) * 0.3 ? Math.sign(dx) : Math.abs(dx) > 14 ? Math.sign(dx) : 0, b = dy > 34 ? 1 : 0;
      if (bl) { D.hl(x - 1, y, 3, 'skin', 5.2); D.hl(x - 1, y + 1, 3, 'skin', 4.4); return; }
      D.px(x + a, y + b, 'ink', 0.5); D.px(x + a, y + 1 - b, 'ink', 2); });
    // the clock: hands at a minute to midnight, the second hand ticks, the pendulum swings in its window
    const sec = Math.floor(tr), hand = (a, len, m, tn) => { for (let r = 1; r <= len; r++) D.px(Math.round(97.5 + Math.cos(a) * r), Math.round(38.5 + Math.sin(a) * r), m, tn); };
    hand(-Math.PI / 2 - 0.03, 3.6, 'ink', 1); hand(-Math.PI / 2 - 0.1 + ((tr / 60) % 1) * 0.1, 5.6, 'ink', 1.4); hand(-Math.PI / 2 + (sec % 60) / 60 * TAU, 6, 'red', 5.6); D.px(97, 38, 'brass', 8);
    const pa = 0.32 * Math.sin(tr * Math.PI); for (let r = 0; r < 8; r++) { const x = Math.round(98 + Math.sin(pa) * r), y = 49 + r; if (y < 61) D.px(x, y, 'brass', 5); }
    const bx = Math.round(98 + Math.sin(pa) * 8.5); D.rect(bx - 1, 57, 3, 3, 'brass', 6.4); D.px(bx - 1, 57, 'brass', 9);
    // the red lamp's flame, the wall candle
    flame(D, 280, 42, 3, t, 1.3, 'fire'); flame(D, 80, 38, 4, t, 3.1);
    if (R() < 0.02) rs.burst('glint', 240 + R() * 44, 34 + R() * 40, 1, { sp: 1, life: 0.5 });
  },
  post(out, t, s, o) { if (s.st.L) coneHaze(out, s.st.L, t - s.seed * 13, false); },
});

// ═════════════════════ front: the table ═════════════════════
const FELT = new Float32Array(AW * AH).fill(-99);   // the felt's painted tone (dyn shadows repaint it)
let POOLF = null;                                    // the pool's light field (its rect follows the pool)
function paintTable(S) {
  const { cx, cy, rx, ry, ox, oy } = TB;
  // legs at the two ends, seen under the apron: turned mahogany, brass casters
  S.lay('back');
  const LEG = [3, 3, 3, 3, 2.5, 2, 2.5, 3.5, 4, 4.5, 4.5, 4, 3, 2, 1.5, 1.5, 2, 2.5, 3, 2.5, 2, 2];
  [[44, 141, -1.4], [256, 141, -1.4], [34, 147, 0], [266, 147, 0]].forEach(([lx, ly, dk]) => { S.beg(); LEG.forEach((w, r) => { for (let u = -Math.ceil(w); u <= Math.ceil(w); u++) { if (Math.abs(u) > w) continue; const q = u / (w + 0.5), br = r >= LEG.length - 2;
    S.px(lx + u, ly + r, br ? 'brass' : 'wood', (br ? 5 : 3.4) + dk + (q < -0.3 ? 1.4 : 0) - (q > 0.5 ? 1 : 0) + (r === 3 || r === 12 ? -1 : 0), { n: [q * 0.9, 0] }); } }); S.end(); });
  S.lay('mid');
  const OPT = { n: [0, 0], z: 0 };
  for (let y = cy - oy - 1; y <= Math.min(AH - 1, cy + oy + 10); y++) for (let x = cx - ox - 1; x <= cx + ox + 1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, ei = Math.hypot(dx / rx, dy / ry), eo = Math.hypot(dx / ox, dy / oy); OPT.z = zOf(y);
    if (ei < 1) {   // felt: fibres, nap streaks, mottling, worn where the dice land, dark under the rail, an inlaid gold line
      const gx = dx / (rx * rx), gy = dy / (ry * ry), gl = Math.hypot(gx, gy) / Math.max(ei, 1e-3), edge = (1 - ei) / gl;
      let tn = 3.1 + (hash(x, y, 7) - 0.5) * 0.9 + (vnoise(x / 7, y / 1.5, 3) - 0.5) * 1.1 + (vnoise(x / 26, y / 12, 5) - 0.5) * 0.9 + 0.6 * Math.max(0, 1 - Math.hypot((x - 150) / 62, (y - 112) / 26));
      if (edge < 7) tn -= (dy < 0 ? 2 : 1.1) * (1 - edge / 7) * (1 - edge / 7);
      OPT.n[0] = 0; OPT.n[1] = -CE;
      const ld = Math.abs(ei - 0.83) / gl; if (ld < 0.55) { S.px(x, y, 'sand', 3.4 + (hash(x, y, 9) < 0.3 ? -0.8 : 0), OPT); continue; }
      FELT[y * AW + x] = tn; S.px(x, y, 'leaf', tn, OPT); continue; }
    const g2x = dx / (ox * ox), g2y = dy / (oy * oy), g2 = Math.hypot(g2x, g2y) || 1, rX = g2x / g2, rY = g2y / g2;
    if (eo <= 1) {   // padded leather rail: a bolster (normals roll across it), creases, a stitched welt
      const k = (ei - 1) / ((ei - 1) + (1 - eo) + 1e-6), ph = (k * 2 - 1) * 1.2, sp = Math.sin(ph), cp = Math.cos(ph);
      OPT.n[0] = rX * sp * 0.95; OPT.n[1] = -(cp * CE - rY * sp * SE) * 0.95;
      const th = Math.atan2(dy / oy, dx / ox);
      let tn = 3.4 + (vnoise(th * 46, k * 2.5, 11) - 0.5) * 1.1 + (hash(x, y, 13) - 0.5) * 0.4 + (k < 0.12 ? -0.8 : 0);
      if (Math.abs(k - 0.8) < 0.08) tn -= 1.2;
      S.px(x, y, 'leather', tn, OPT); continue; }
    if (dy > 0 && Math.abs(dx) < ox) {   // the near apron: mahogany with a bead moulding
      const yo = cy + oy * Math.sqrt(Math.max(0, 1 - (dx / ox) * (dx / ox))), v = y + 0.5 - yo; if (v <= 0 || v > 9) continue;
      OPT.n[0] = rX * 0.9; OPT.n[1] = 0.45;
      let tn = 4.2 + (vnoise(x / 11, v * 0.6, 21) - 0.5) * 1.4 + (hash(Math.floor(x / 3), 1, 23) < 0.1 ? -0.8 : 0);
      if (v <= 1) tn -= 2.2; else if (v <= 2.2) tn += 1.6; else if (v <= 3.2) tn -= 1; if (v > 8) tn -= 1.6;
      if (v > 1 && v <= 2.2 && ((x % 10) + 10) % 10 === 0) { S.px(x, y, 'brass', 7.8, OPT); continue; }
      S.px(x, y, 'wood', tn, OPT); }
  }
  // stitches along the welt, brass nailheads round the outer edge, four big bosses
  const ring = (k, th) => [cx + (rx + (ox - rx) * k) * Math.cos(th), cy + (ry + (oy - ry) * k) * Math.sin(th)];
  for (let th = 0; th < TAU; th += 0.034) { const [x, y] = ring(0.8, th); if (Math.floor(th / 0.034) % 2) S.px(x, y, 'leather', 5.4); }
  for (let th = 0.02; th < TAU; th += 0.1) { const [x, y] = ring(0.95, th), s = Math.sin(th); S.px(x, y, 'brass', 7.6, { n: [-0.3, -0.5] }); if (s > -0.2) S.px(x + 1, y + 1, 'brass', 2.6); }
  [0.62, Math.PI - 0.62, Math.PI + 0.62, TAU - 0.62].forEach(th => { const [x, y] = ring(0.5, th); S.beg(); S.ell(x, y, 2.2, 1.7, 'brass', 5.6, { dome: 1 }); S.px(Math.round(x - 1), Math.round(y - 1), 'brass', 9.5); S.end(); });
  // on the rail: an ashtray with a cigar (right end), a glass of whisky (left)
  S.beg(); S.ell(267, 98.5, 5.5, 2.8, 'brass', 5.4, { dome: 1 }); S.ell(267, 98, 3.6, 1.6, 'stone', 2); S.px(265, 98, 'stone', 5.5); S.px(268, 98, 'stone', 4.5); S.px(266, 99, 'stone', 6); S.hl(263, 96, 4, 'brass', 8.5); S.end();
  S.beg(); S.line(258, 100, 268, 95, 'leather', 4, { w: 1 }); S.line(258, 101, 268, 96, 'leather', 2.4, { w: 1 }); S.px(261, 98, 'gold', 7); S.px(261, 99, 'crimson', 5); S.px(262, 98, 'gold', 6); S.end();
  // a tumbler of whisky on the left rail: rim highlights, the whisky and an ice cube; the rail shows through the empty glass
  const GL = [[31, 118, 'linen', 8.6], [32, 118, 'linen', 8.6], [33, 118, 'linen', 8], [34, 118, 'linen', 7.4], [30, 119, 'linen', 7.6], [35, 119, 'linen', 5], [31, 119, 'linen', 5.4], [32, 119, 'linen', 4.6], [33, 119, 'linen', 4.6], [34, 119, 'linen', 4.4],
    [30, 120, 'linen', 6.6], [31, 120, 'linen', 8.4], [35, 120, 'linen', 3.6], [30, 121, 'linen', 6.2], [31, 121, 'lamp', 7.4], [32, 121, 'lamp', 7], [33, 121, 'lamp', 6.6], [34, 121, 'lamp', 6], [35, 121, 'linen', 3.4],
    [30, 122, 'linen', 6], [31, 122, 'lamp', 5.2], [32, 122, 'ice', 9.4], [33, 122, 'ice', 8], [34, 122, 'lamp', 4.2], [35, 122, 'linen', 3.2], [30, 123, 'linen', 5.6], [31, 123, 'lamp', 4.8], [32, 123, 'lamp', 5.4], [33, 123, 'lamp', 4.6], [34, 123, 'lamp', 3.8], [35, 123, 'linen', 3],
    [31, 124, 'linen', 4.6], [32, 124, 'linen', 5.4], [33, 124, 'linen', 4.4], [34, 124, 'linen', 3.6]];
  S.beg(); GL.forEach(([x, y, m, t]) => S.px(x, y, m, t)); S.end();
}

X.def('mb_dice_fg', {
  size: [AW, AH], fy: 97, noFrame: 1, clear: 1, noFloor: 1, amb: [0.15, 0.2],
  paint(S, sc) {
    paintTable(S);
    lights(sc);
    // the lamp's pool: a hard-edged ellipse on the felt that follows the swing (lamp state is worked out in anim)
    POOLF = { x0: 20, y0: 50, x1: 282, y1: AH, lay: 'mid', fn: (x, y, t, s) => poolAt(s.st.L.pool, x + 0.5, y + 0.5) * 0.95 }; sc.field(POOLF);
    sc.emit({ k: 'dust', x: 184, y: 84, w: 60, h: 36, rate: 2, sp: 2, life: 4 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const tr = t - rs.seed * 13, st = rs.st, L = lampState(tr, o, st), pl = L.pool;
    lampLights(rs, L);
    if (POOLF) { POOLF.x0 = Math.max(0, Math.floor(pl.x - pl.rx * 1.07)); POOLF.x1 = Math.min(AW, Math.ceil(pl.x + pl.rx * 1.07) + 1); POOLF.y0 = Math.max(0, Math.floor(pl.y - pl.ry * 1.07)); POOLF.y1 = Math.min(AH, Math.ceil(pl.y + pl.ry * 1.07) + 1); }
    const dice = o.dice || [], ch = o.chips || {}, items = [];
    const gmax = dice.reduce((a, d) => Math.max(a, d.glow || 0), 0); rs.mul[6] = gmax * (1.2 + 0.25 * Math.sin(tr * 8));
    // chips: resting stacks, plus the chips in a slide (not yet left → on the source, arrived → on the destination)
    const cnt = { me: clamp(Math.round(ch.mine || 0), 0, 20), him: clamp(Math.round(ch.his || 0), 0, 20), pot: clamp(Math.round(ch.pot || 0), 0, 12) }, extra = { me: [0, 0, 0, 0], him: [0, 0, 0, 0], pot: [0, 0, 0] };
    const sl = ch.slide, fly = [];
    if (sl && sl.n > 0 && STK[sl.from] && STK[sl.to]) { const n = Math.round(sl.n), p = sl.p || 0, av = sl.from === 'pot' && sl.to === 'me';
      for (let k = 0; k < n; k++) { const s0 = n > 1 ? k / (n - 1) * (av ? 0.4 : 0.55) : 0, q = clamp((p - s0) / (av ? 0.6 : 0.45), 0, 1), si = k % STK[sl.from].length, di = (k * 3 + 1) % STK[sl.to].length;
        if (q <= 0) extra[sl.from][si]++; else if (q >= 1) extra[sl.to][di]++; else fly.push({ k, q, si, di, av }); } }
    const stacks = {}; Object.keys(STK).forEach(w => { const S2 = STK[w], ns = S2.length; stacks[w] = S2.map((b, i) => Math.floor((cnt[w] + (ns - 1 - i)) / ns) + extra[w][i]); });
    Object.keys(STK).forEach(w => STK[w].forEach((b, i) => { if (stacks[w][i] > 0) items.push({ y: b[1], f: () => drawStack(D, b[0], b[1], stacks[w][i], STC[w][i], w === 'me' ? ch.hov || 0 : 0, w === 'me' && i === 0 ? ch.hov || 0 : 0, pl, i * 7 + w.length) }); }));
    fly.forEach(c => { const a = STK[sl.from][c.si], b = STK[sl.to][c.di], ha = stacks[sl.from][c.si] * 2, hb = stacks[sl.to][c.di] * 2, e = 1 - (1 - c.q) * (1 - c.q), hs = hash(c.k, 3, 17);
      let x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e, lift = ha + (hb - ha) * e;
      if (c.av) { x += Math.sin(c.q * Math.PI) * (hs - 0.5) * 26; y += Math.sin(c.q * Math.PI) * (hash(c.k, 5, 17) - 0.5) * 12; lift += Math.abs(Math.sin(c.q * Math.PI * (2 + hs * 2))) * (1 - c.q) * 9; }
      else lift += Math.sin(c.q * Math.PI) * 2;
      c.x = x; c.y = y; c.lift = lift;
      items.push({ y, f: () => flyChip(D, x, y, lift, STC[sl.to][c.di], c.av && hs < 0.45 ? c.q * 14 + hs * 5 : null, pl, c.k) }); });
    // dice
    dice.forEach(d => items.push({ y: d.y, f: () => drawDie(D, d, L, tr) }));
    // his cup
    if (o.cup) items.push({ y: o.cup.y + 0.5, f: () => drawCup(D, o.cup, L, tr) });
    // the rake
    items.push({ y: (o.rake || 0) > 0.001 ? 70 + 34 * o.rake : 66, f: () => drawRake(D, o.rake || 0, L) });
    // shadows on the felt first (mid), then everything standing on it back to front (front)
    D.lay('mid');
    Object.keys(STK).forEach(w => STK[w].forEach((b, i) => { if (stacks[w][i] > 0) feltShadow(D, b[0] + 0.5, b[1] + 0.2, 5.8, 3.2, 0.75, pl); }));
    fly.forEach(c => feltShadow(D, c.x + 0.5, c.y, 4.5, 2.5, 0.5 * clamp(1 - c.lift / 16, 0.2, 1), pl));
    dice.forEach(d => { const h = Math.max(0, d.h || 0), k = clamp(1 - h / 34, 0.15, 1), ox = (d.x - pl.x) * 0.02 * (1 + h / 10), oy = (d.y - pl.y) * 0.03 * (1 + h / 10); feltShadow(D, d.x + ox, d.y + 1 + oy, 7.8 * (0.55 + 0.45 * k), 4.4 * (0.55 + 0.45 * k), 0.95 * k, pl); });
    if (o.cup) feltShadow(D, o.cup.x, o.cup.y + 1, 11, 5.5, 0.9 * (1 - clamp(o.cup.lift || 0, 0, 1) * 0.7), pl);
    D.lay('front'); items.sort((a, b) => a.y - b.y).forEach(it => it.f());
    drawLamp(D, L, tr);
    // felt dust where a die lands
    const pf = o.puff; if (pf && pf.age != null) { if (pf.age >= 0 && pf.age < 0.15 && (st.pa == null || st.pa < 0 || pf.age < st.pa - 1e-6 || st.pfx !== pf.x)) { rs.burst('fluff', pf.x, pf.y - 1, 7, { sp: 16, ang: 0, spread: 2.4, life: 0.7, floor: pf.y + 2, w: 6 }); rs.burst('steam', pf.x, pf.y - 1, 2, { sp: 5, life: 0.4, w: 6 }); } st.pa = pf.age; st.pfx = pf.x; }
    // chips glint in the lamp; echo after a result
    if (R() < 0.05) { const w = R() < 0.5 ? 'him' : 'me', i = Math.floor(R() * STK[w].length), b = STK[w][i], hh = stacks[w][i]; if (hh > 0) rs.burst('glint', b[0] - 2 + R() * 5, b[1] - 6 - hh * 2, 1, { sp: 1, life: 0.45 }); }
    const tier = o.tier || 0; if (tier > 0 && R() < 0.06 + tier * 0.09) { const k = ['mote', 'glint', 'goldd', 'goldd'][Math.min(3, tier - 1)]; rs.burst(k, 70 + R() * 160, 70 + R() * 70, 1, { sp: 8, life: 1.6 }); }
    if (gmax > 0.3 && R() < 0.5) dice.forEach(d => { if ((d.glow || 0) > 0.3) rs.burst('goldd', d.x - 7 + R() * 14, d.y - 16 + R() * 8, 1, { sp: 14, ang: 0, spread: 1.2, life: 0.9 }); });
    // cigar ember and its smoke: a thin dithered ribbon that curls up and leans toward the lamp
    const eb = 0.5 + 0.5 * n1(tr * 3); D.px(269, 94, 'fire', 7 + eb * 3, { e: 255 }); D.px(268, 95, 'fire', 4 + eb * 2, { e: 255 }); D.px(269, 95, 'stone', 5);
    for (let k = 1; k < 44; k++) { const q = k / 44, y = 93 - k, x = 269 - k * 0.42 * q * 2 + Math.sin(k * 0.26 - tr * 2.1) * (0.6 + k * 0.1) + n1(tr * 0.6 + k * 0.05) * k * 0.08, wd = 0.4 + k * 0.045;
      for (let i = Math.floor(x - wd); i <= Math.ceil(x + wd); i++) { const dd = Math.abs(i + 0.5 - x) / (wd + 0.5), a = (1 - q) * (0.85 - dd * 0.6) * (0.65 + 0.35 * Math.sin(k * 0.45 - tr * 3.2)); if (a * 1.15 > X.bayer(i, y)) P(D, i, y, MI.linen, 5 - q * 2.4, 0, 0, 30); } }
  },
  post(out, t, s, o) { if (s.st.L) coneHaze(out, s.st.L, t - s.seed * 13, true); },
});

// ───────── chips ─────────
// stack anchors (the bottom chip's footprint centre) and colours per stack
const STK = { me: [[101, 141], [90, 146], [112, 147], [101, 150]], him: [[214, 71], [204, 76], [226, 76], [215, 80]], pot: [[150, 103], [143, 108], [157, 108]] };
const CHC = { r: [mRed, 5.2, mBone, 8.6, mBone, 7.2], b: [mTile, 4.8, mBone, 8.6, mBone, 7.4], w: [mBone, 7.2, mRed, 5.2, mTile, 5.6] };   // body, spot, inlay
const STC = { me: ['r', 'b', 'w', 'r'], him: ['b', 'r', 'w', 'b'], pot: ['r', 'w', 'b'] };
// 9×7 chip: T = top face, s = side (2 px band); the rim of the top face carries the edge spots
const CHIP = ['..TTTTT..', '.TTTTTTT.', 'TTTTTTTTT', 'sTTTTTTTs', 'ssTTTTTss', '.sssssss.', '..sssss..'];
const CTOP = [], CSIDE = [];
CHIP.forEach((row, j) => { for (let i = 0; i < 9; i++) { const c = row[i]; if (c === 'T') { const rim = !['T'].includes((CHIP[j - 1] || '')[i]) || !['T'].includes((CHIP[j + 1] || '')[i]) || row[i - 1] !== 'T' || row[i + 1] !== 'T', inl = (j === 2 && i >= 3 && i <= 5) || ((j === 1 || j === 3) && i === 4); CTOP.push([i, j, rim ? 1 : inl ? 2 : 0]); } else if (c === 's') CSIDE.push([i, j]); } });
const CRIM = CTOP.filter(q => q[2] === 1).sort((a, b) => Math.atan2(a[1] - 2, a[0] - 4) - Math.atan2(b[1] - 2, b[0] - 4));
CRIM.forEach((q, k) => { q[3] = k; });
function chip(D, x0, y0, col, top, pool, rot, bright, lit) {
  const C = CHC[col], z = zOf(y0 + 6) + 4, pt = PG * pool * 0.72, ps = PG * pool * 0.4;
  for (let q = 0; q < CSIDE.length; q++) { const [i, j] = CSIDE[q], spot = ((i + rot) % 4) === 0, bot = CHIP[j + 1] == null || CHIP[j + 1][i] !== 's', nx = (i - 4) / 4.6 * 0.9;
    if (spot) P(D, x0 + i, y0 + j, C[2], C[3] - 1.4 + ps + bright - (bot ? 0.8 : 0), nx, 0.35, z); else P(D, x0 + i, y0 + j, C[0], C[1] - 0.7 + ps + bright - (bot ? 1 : 0), nx, 0.35, z); }
  if (!top) return;
  for (let q = 0; q < CTOP.length; q++) { const [i, j, k] = CTOP[q];
    if (k === 1) { const r = CRIM.indexOf(CTOP[q]), spot = ((r + rot) % 3) === 0, l2 = lit && (j < 2 || (j === 2 && i === 0)) ? 1.3 : 0; if (spot) P(D, x0 + i, y0 + j, C[2], C[3] + pt + bright + l2, 0, -CE, z); else P(D, x0 + i, y0 + j, C[0], C[1] + 0.2 + pt + bright + l2, 0, -CE, z); }
    else if (k === 2) P(D, x0 + i, y0 + j, C[4], C[5] + pt + bright, 0, -CE, z);
    else P(D, x0 + i, y0 + j, C[0], C[1] + 0.6 + pt + bright, 0, -CE, z); }
}
function drawStack(D, bx, by, n, col, hov, tip, pl, seed) {
  const pool = poolAt(pl, bx, by), bright = hov * 0.9;
  D.beg();
  for (let k = 0; k < n; k++) { const jx = hash(seed, k, 31) < 0.22 ? (hash(seed, k, 37) < 0.5 ? -1 : 1) : 0, c = hash(seed, k, 43) < 0.14 ? 'rbw'[Math.floor(hash(seed, k, 47) * 3)] : col, top = k === n - 1, up = top && tip > 0 ? Math.round(tip * 3) : 0;
    chip(D, bx - 4 + jx, by - 6 - 2 * k - up, c, top, pool, (seed + (hash(seed, k, 53) < 0.3 ? 2 : 0)) % 4, bright, top);
    if (up) for (let i = 0; i < 9; i++) if (hash(i, k, 59) < 0.5) D.px(bx - 4 + jx + i, by - 6 - 2 * k + 5 - up + 2, 'ink', 1); }
  D.end();
}
function flyChip(D, x, y, lift, col, flip, pl, k) {
  const pool = poolAt(pl, x, y), x0 = Math.round(x - 4), y0 = Math.round(y - 6 - lift);
  D.beg();
  if (flip == null) chip(D, x0, y0, col, true, pool, k % 4, 0, true);
  else { const C = CHC[col], c = Math.abs(Math.cos(flip)), ry = 1.1 + 2.2 * c, z = zOf(y) + 4;   // a chip tumbling end over end
    for (let yy = -4; yy <= 4; yy++) for (let xx = -5; xx <= 5; xx++) { const u = (xx + 0.5) / 4.6, v = (yy + 0.5) / ry, d = u * u + v * v; if (d > 1) continue; const rim = d > 0.55, sp = rim && ((xx + 9) % 3 === 0);
      P(D, Math.round(x) + xx, Math.round(y - 3 - lift) + yy, sp ? C[2] : d < 0.2 ? C[4] : C[0], (sp ? C[3] : d < 0.2 ? C[5] : C[1]) + PG * pool * 0.6 * c - (Math.sin(flip) > 0 ? 0.8 : 0), 0, -CE * c, z); } }
  D.end();
}
// a darker patch of felt (contact shadow), keeping the felt's own texture and blocking the lamp's pool
function feltShadow(D, x, y, rx, ry, k, pl) {
  for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++) for (let xx = Math.floor(x - rx); xx <= Math.ceil(x + rx); xx++) {
    if (xx < 0 || yy < 0 || xx >= AW || yy >= AH) continue; const u = (xx + 0.5 - x) / rx, v = (yy + 0.5 - y) / ry, dd = u * u + v * v; if (dd > 1) continue;
    const ft = FELT[yy * AW + xx]; if (ft < -50) continue; const a = k * (dd < 0.42 ? 1 : 0.5);
    P(D, xx, yy, mLeaf, ft - a * 1.3 + PG * poolAt(pl, xx + 0.5, yy + 0.5) * 0.95 * (1 - a * 0.85), 0, -CE, zOf(yy)); }
}

// ───────── his leather dice cup (mouth down), brass hoops ─────────
function drawCup(D, c, L, t) {
  const lift = clamp(c.lift || 0, 0, 1), sh = c.shake || 0, tilt = (c.tilt || 0) + sh * 0.2 * Math.sin(t * 41), jx = sh * 1.6 * Math.sin(t * 57 + 1), jy = sh * 1.2 * Math.abs(Math.sin(t * 33));
  const bx = c.x + jx, by = c.y - lift * 26 - jy, HH = 16, RW = 8.5, ax = Math.sin(tilt), ay = -Math.cos(tilt), pxx = Math.cos(tilt), pxy = Math.sin(tilt), z = zOf(c.y) + 8;
  const pool = poolAt(L.pool, c.x, c.y), pt = PG * pool * 0.55;
  D.beg();
  for (let yy = -32; yy <= 8; yy++) for (let xx = -13; xx <= 13; xx++) {
    const rx = xx + 0.5 - (bx - Math.round(bx)), ry = yy + 0.5 - (by - Math.round(by)), u = rx * pxx + ry * pxy, v = rx * ax + ry * ay;   // v: up along the cup's axis from the mouth
    const w = RW - v * 0.09; if (Math.abs(u) > w + 0.2) continue; const q = u / w, ey = w * SE * Math.sqrt(Math.max(0, 1 - q * q));
    if (v < -ey || v > HH + ey) continue;
    const X0 = Math.round(bx) + xx, Y0 = Math.round(by) + yy;
    if (v > HH - ey) {   // the closed end, seen from above: leather disc, a brass hoop round it, a tooled star
      const e2 = Math.hypot(q, (v - HH) / (w * SE)); if (e2 > 1) continue;
      if (e2 > 0.78) P(D, X0, Y0, mBrass, 6 + (q < -0.2 ? 1.5 : 0) - (q > 0.4 ? 1.2 : 0) + pt, q * 0.5, -0.7, z);
      else P(D, X0, Y0, mLeather, 3.8 + (e2 < 0.25 && ((xx + yy) & 1) ? 1.4 : 0) + pt, 0, -CE, z);
      continue; }
    const hoop = v < 2.2 || (v > HH - ey - 2.3 && v <= HH - ey), seam = Math.abs(q + 0.42) < 0.1;
    if (hoop) P(D, X0, Y0, mBrass, 5 + (q < -0.35 ? 2 : 0) - (q > 0.45 ? 1.4 : 0) + (v < 1 ? -1 : 0) + pt * 0.7, q * 0.9, 0.3, z);
    else P(D, X0, Y0, mLeather, 3.1 + (q < -0.5 ? 0.9 : 0) - (q > 0.55 ? 0.8 : 0) + (seam ? ((yy & 1) ? 1.4 : -0.8) : 0) + (hash(xx, Math.floor(v), 71) - 0.5) * 0.6 + pt * 0.7, q * 0.92, 0.25, z);
  }
  D.end();
}

// ───────── the croupier rake ─────────
function drawRake(D, r, L) {
  let hx, hy, ex, ey; if (r <= 0.001) { hx = 245; hy = 73; ex = 197; ey = 58; } else { hx = 178 + (152 - 178) * r; hy = 69 + (104 - 69) * r; ex = 181; ey = 57; }
  const dx = hx - ex, dy = hy - ey, l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, nx = -uy, ny = ux, z = zOf(hy) + 6, pool = poolAt(L.pool, hx, hy);
  D.beg();
  for (let s = 0; s <= l; s += 0.5) { const x = ex + ux * s, y = ey + uy * s; P(D, x, y, mWood, 7 + PG * pool * 0.3, nx * 0.6, -0.6, z); P(D, x, y + 1, mWood, 3.6, 0, 0.5, z); }
  for (let s = l - 4; s <= l - 2; s += 0.5) { const x = ex + ux * s, y = ey + uy * s; P(D, x, y, mBrass, 7.4, 0, -0.5, z); P(D, x, y + 1, mBrass, 4.4, 0, 0.5, z); }
  for (let s = -6; s <= 6; s += 0.5) { const x = hx + nx * s, y = hy + ny * s; P(D, x, y, mWood, 4.6 + PG * pool * 0.4, 0, -CE, z); P(D, x + ux * 1.2, y + uy * 1.2, mBrass, 6.4 + PG * pool * 0.5, ux * 0.5, 0.3, z); }
  P(D, hx + nx * -6, hy + ny * -6, mBrass, 8, 0, 0, z);
  D.end();
}

// ───────── the lamp: chain, brass cap, green glass shade glowing from inside, the bulb when it swings toward you ─────────
function drawLamp(D, L, tr) {
  const sa = L.sa, ca = L.ca, cp = L.cap, fl = L.fl, z = 40;
  for (let k = 0; k < LC - 1; k++) { const x = LPV[0] + sa * k, y = LPV[1] + ca * k * (1 + 5 * L.sz / LC); if (y < 0) continue; const ph = k % 3; P(D, x, y, mIron, ph === 1 ? 7 : ph === 0 ? 4.4 : 2.6, -0.4, 0, z); if (ph === 2) P(D, x + 1, y, mIron, 3.4, 0.4, 0, z); }
  D.beg();
  const x0 = Math.floor(cp[0] - 16), x1 = Math.ceil(cp[0] + 16), y0 = Math.floor(cp[1] - 2), y1 = Math.ceil(cp[1] + 20);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const rx = px + 0.5 - cp[0], ry = py + 0.5 - cp[1], u = rx * ca - ry * sa, v = rx * sa + ry * ca;
    if (v < 0) continue;
    if (v < 2.6) { const w = v < 1 ? 1.3 : 2.6; if (Math.abs(u) > w) continue; P(D, px, py, mBrass, 5.8 + (u < -0.5 ? 1.8 : 0) - (u > 1 ? 1.2 : 0) + fl, u / 3 * 0.9, -0.5, z); continue; }
    if (v < 13.2) { const q = (v - 2.6) / 10.6, w = 3 + 9.4 * Math.pow(q, 0.6); if (Math.abs(u) > w) continue; const uu = u / w;
      const tn = 3 + 3.4 * Math.pow(q, 1.5) + (1 - uu * uu) * 1.1 - (uu > 0.62 ? 1.1 : 0) + (uu > -0.66 && uu < -0.42 ? 2.2 * (1 - q * 0.5) : 0) + (Math.abs(q - 0.35) < 0.05 ? -0.8 : 0) + fl * 1.6;
      P(D, px, py, mLeaf, tn, uu * 0.9, -0.4, z, 255); continue; }
    if (v < 14.8) { if (Math.abs(u) > 12.6) continue; const uu = u / 12.6; if (v > 14) { P(D, px, py, mLamp, 7.5 + fl * 2 + (1 - uu * uu) * 1.5, 0, 0.5, z, 255); continue; }
      P(D, px, py, mBrass, 5.4 + (uu < -0.4 ? 2 : 0) - (uu > 0.5 ? 1.4 : 0) + fl, uu * 0.9, 0.2, z); continue; }
    // the mouth, visible when the lamp swings toward the viewer: white enamel and the bulb
    const op = L.open; if (op < 0.05) continue; const ry2 = 0.6 + op * 4, vv = (v - 14.8) / ry2, uu = u / 12; if (vv > 1 || uu * uu + vv * vv > 1) continue;
    const bulb = Math.hypot(u / 4, (v - 14.8 - ry2 * 0.3) / Math.max(1, ry2 * 0.6)) < 1;
    P(D, px, py, bulb ? mLamp : mBone, bulb ? 11 : 8.5 + (1 - vv) * 1.2 + fl, 0, 0.8, z, 255);
  }
  D.end();
}

MB.dice = {
  table: TB, view: { sin: SE, cos: CE }, size: DS,
  his: [[135, 84], [165, 84]], mine: [[135, 128], [165, 128]], from: [50, 150],   // dice rest spots, where yours are thrown from
  stacks: STK, cup: [112, 77], pot: [150, 106],
  lamp: { pivot: LPV, pool: [LPV[0], LPY] }, rake: { rest: [245, 73], pot: [152, 104] },
  portrait: { x0: 21, y0: 30, x1: 65, y1: 74, eyes: [[40, 47], [46, 47]] }, clock: [98, 39],
  shadow: { x0: 126, x1: 174, y0: 26, y1: 95 },   // where the top-hat shadow sits (drawn between mb_dice and mb_dice_fg)
  orient, rot, teeter, faceUp,
  // how high the die's centre sits above the felt when resting in orientation m (a die on an edge stands taller)
  rest: (m) => (Math.abs(m[3]) + Math.abs(m[4]) + Math.abs(m[5])) * DA + DRr,
};
})();
