// ==== mc-pxroom-minib-tree.js ====
(function () {
// 世界树 (G006): the root of the world. A cave in which one giant tree holds up the roof — bark with deep grooves and moss,
// teal sap veins that beat upward from the roots, a fork where a watered bud can flower into a fourth fruit, a canopy of
// leaves under a hole in the roof that lets the moon in, vines, glowing mushrooms and fireflies. Its roots arch over four
// hollows and each hollow is a small window onto another world (a snowy night, a lava field, the starry void, a windy
// meadow — "the roots reach into every world"). The fruit (seven kinds, each its own per-pixel sprite on its own ramp that
// glows in its colour), the branches that carry them, the sap, the bloom, the axe and the curse eyes are painted in anim()
// from the game state o (read-only):
// o = {
//   fruits: [{ k: 0…6 (index in MINI.tree's FRUITS: 生命 力量 坚韧 智慧 灵魂 黄金 幸运), x, y (art px where it hangs; defaults
//              to MB.tree.hang[i]), grow: 0…1 (size; the watered fruit grows from 0), gone: bool (collected: no longer drawn),
//              fy: art px it has fallen (0 on the branch; > 0 = the stem has snapped), ripe: 0…1 (the picked fruit swelling),
//              q: 0…3 omen quality = aura colour (common steel, rare teal, epic violet, legendary gold), crack: 0…1 (the skin
//              splits and light leaks out, on a promotion), hov: 0…1 (hovered: branch bends, fruit bigger and brighter),
//              beat: s since the last beat (press / each ripening step: squash-pop, leaves shake, a ring in the aura colour;
//              −1 = none), land: s since it hit the floor (−1 = not yet), squash: 0…1 (optional; derived from land) }],
//   sap: 0…1 (watering: glowing water climbs the veins from the roots to the twig in the fork),
//   bloom: 0…1 (the twig's bud: 0–0.3 swells, 0.3–0.65 flowers, 0.65–0.8 sheds its petals, then the fruit — fruits[3].grow),
//   cut: { a: 0…1 axe swing (0 raised out of frame, 1 = the blade in the branch; ≥ 0.97 chips fly), hit: bool (optional,
//          same as reaching 1), branch: 0…1 (0 on the tree, 0…0.7 falling, 0.7 lands, 0.8 splits, 1 the scroll unrolled) },
//   eyes: 0…1 (curse: the bark knots open one by one into red eyes, the sap turns red),
//   flare: 0…1 (legendary payoff: every vein burns gold), tier: 0…4 (echo particles after a result),
//   dim: 0…1 (leaving: the lights fade), tap: { x, y, age } (a click on empty ground: fireflies scatter, a leaf drops) }
const M = window.MC, X = M.PXR; if (!X || !X.MINIB) return;
const MB = X.MINIB, { vnoise } = X, { AW, AH, clamp, hash } = MB;
const R = Math.random, TAU = Math.PI * 2, FL = 148, E = { e: 255 };
const sm = (a) => { a = clamp(a, 0, 1); return a * a * (3 - 2 * a); };
const frac = (a) => a - Math.floor(a);

// ───────── geometry the game uses (art px; logical = 360 + 4·ax, 110 + 4·ay) ─────────
const HANG = [[95, 62.5], [150, 47.5], [205, 62.5], [150, 82.5]];   // where the fruit hang (the fourth grows when watered)
const LANDY = 140, FRR = 8.5;                                        // a fallen fruit rests at y 140 below where it hung
const KNOTS = [[138, 112], [163, 123], [127, 86], [176, 66], [119, 62]];   // bark knots that open into curse eyes
const HOL = [{ cx: 36, rx: 16, ry: 21 }, { cx: 128, rx: 10, ry: 19 }, { cx: 172, rx: 10, ry: 19 }, { cx: 264, rx: 16, ry: 21 }];   // snow · lava · void · meadow
// fruit branches: base inside a limb → tip past the hang point (the stem hangs where the branch crosses the fruit's x)
const BR = [[115, 57, 89, 46.5], [186, 40, 144, 32], [185, 57, 211, 46.5], [131, 76, 153, 67.5]];
const CUT = [209, 84], AXP = [300, 152];                             // the cut point on the glowing branch; the axe's pivot (off stage)
const CUTS = [[179, 92, 5.2], [194, 88, 4.4], [209, 84, 3.8]], CUTP = [[0, 0, 3.8], [8, -2.5, 3.1], [15, -4.5, 2.3], [21, -5.5, 1.5]];
// fruit ramps and light colours, in FRUITS order; omen ramps / colours by quality
const FK = [['candy', [255, 128, 196]], ['lamp', [255, 170, 60]], ['tile', [90, 150, 255]], ['leaf', [176, 232, 96]], ['arcane', [164, 124, 255]], ['gold', [255, 214, 90]], ['screen', [80, 226, 112]]];
const QM = ['iron', 'tile', 'arcane', 'fire'], QRGB = [[196, 204, 217], [79, 143, 255], [184, 107, 255], [255, 154, 60]];   // the game's quality colours (SHOW.QC): 普通 · 稀有 · 史诗 · 传说
const SAPC = [64, 226, 196];
const PK = X.PK;
PK.tspore = { g: -4, drag: 1, ramp: ['ice', [11, 10, 9, 8, 7, 6]], wob: 4, glow: 1 };
PK.tgleaf = { g: 12, drag: 1.8, ramp: ['gold', [11, 10, 10, 9, 8, 7]], wob: 14, sz: 2, glow: 1 };
PK.tchip = { g: 170, drag: 0.3, ramp: ['wood', [10, 9, 8, 7, 6]], bounce: 0.3 };
PK.tpetal = { g: 9, drag: 2, ramp: ['candy', [10, 10, 9, 8, 7]], wob: 12, sz: 2 };
PK.tsap = { g: -18, drag: 1.2, ramp: ['teal', [11, 11, 10, 9, 8]], glow: 1 };
QM.forEach((m, q) => { PK['tjuice' + q] = { g: 150, drag: 0.4, ramp: [m, [11, 11, 10, 9, 8, 7]], glow: 1, trail: 1, bounce: 0.25 }; });

// ───────── tubes: tapering curved limbs / roots, rasterised per pixel (u across −1…1, s along, normals round) ─────────
function spline(C, step) {
  const out = [];
  for (let i = 0; i < C.length - 1; i++) {
    const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]); }
  }
  const l = C[C.length - 1]; out.push([l[0], l[1], l[2]]); return out;
}
function tube(C, step) {
  const P = spline(C, step || 2.5), cum = [0]; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < P.length; i++) { if (i) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const w = P[i][2]; x0 = Math.min(x0, P[i][0] - w); x1 = Math.max(x1, P[i][0] + w); y0 = Math.min(y0, P[i][1] - w); y1 = Math.max(y1, P[i][1] + w); }
  const SB = new Float32Array(P.length * 4); for (let i = 0; i < P.length - 1; i++) { const a = P[i], b = P[i + 1], w = Math.max(a[2], b[2]) + 1; SB[i * 4] = Math.min(a[0], b[0]) - w; SB[i * 4 + 1] = Math.max(a[0], b[0]) + w; SB[i * 4 + 2] = Math.min(a[1], b[1]) - w; SB[i * 4 + 3] = Math.max(a[1], b[1]) + w; }
  return { P, cum, SB, len: cum[cum.length - 1], bb: [Math.floor(x0) - 1, Math.floor(y0) - 1, Math.ceil(x1) + 1, Math.ceil(y1) + 1] };
}
const TA = { u: 0, s: 0, tx: 0, ty: 0, w: 0 };
function tubeAt(T, x, y) {
  const P = T.P, SB = T.SB; let best = 1, hit = false;
  for (let i = 0; i < P.length - 1; i++) {
    if (x < SB[i * 4] || x > SB[i * 4 + 1] || y < SB[i * 4 + 2] || y > SB[i * 4 + 3]) continue;
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-6; let t = ((x - a[0]) * dx + (y - a[1]) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = x - a[0] - dx * t, ey = y - a[1] - dy * t, w = a[2] + (b[2] - a[2]) * t, d = Math.sqrt(ex * ex + ey * ey) / w;
    if (d < best) { best = d; hit = true; const l = Math.sqrt(l2); TA.tx = dx / l; TA.ty = dy / l; TA.u = (dx * ey - dy * ex >= 0 ? 1 : -1) * d; TA.s = T.cum[i] + t * l; TA.w = w; }
  }
  return hit ? TA : null;
}
// paint a tube with bark: grooves along it, a lit upper edge, moss on top; fn(x, y, u, s) may veto pixels
function barkTube(S, T, tn, o) {
  o = o || {}; const ng = o.g || 2.5, seed = o.seed || 1, [bx0, by0, bx1, by1] = T.bb;
  for (let y = Math.max(0, by0); y <= Math.min(AH - 1, by1); y++) for (let x = Math.max(0, bx0); x <= Math.min(AW - 1, bx1); x++) {
    if (o.clip && o.clip(x, y)) continue; const a = tubeAt(T, x + 0.5, y + 0.5); if (!a) continue;
    const u = a.u, nx = -a.ty * u * 0.9, ny = a.tx * u * 0.9, gw = u * ng + ng + (vnoise(u * 2 + seed, a.s / 9, seed) - 0.5) * 1.3, f = frac(gw);
    let t2 = tn + (hash(x, y, seed) - 0.5) * 0.7 - (ny > 0.3 ? 1 : 0);
    if (f < 0.2) t2 -= 2.6; else if (f < 0.34) t2 -= 1.1; else if (f > 0.8) t2 += 0.8;
    const mossy = o.moss && ny < -0.15 && f > 0.2 && vnoise(x / 4, y / 3, seed + 3) > 0.5 - (-ny) * 0.3;
    if (mossy) S.px(x, y, 'moss', 3 + (-ny) * 3 + (hash(x, y, 9) < 0.3 ? 1 : 0), { n: [nx, ny] }); else S.px(x, y, 'wood', t2, { n: [nx, ny] });
  }
}

// ───────── the tree: trunk column + two limbs (one groove system flowing up both), roots, veins, hollows ─────────
const LIMB = [[[140, 118, 15], [134, 96, 14.5], [124, 72, 12.5], [113, 48, 10.5], [104, 26, 8.5], [98, 4, 7]], [[160, 118, 15], [166, 96, 14.5], [176, 72, 12.5], [187, 48, 10.5], [196, 26, 8.5], [202, 4, 7]]];
const COL = (y) => 30 + (y > 118 ? (y - 118) * (y - 118) * 0.014 : 0), colX = (y) => 150 + Math.sin(y * 0.07) * 1.2;
const arch = (cx, rx, ry, w0, w1, a0) => { const P = []; for (let a = a0; a <= 180.1; a += 12) { const th = a * Math.PI / 180; P.push([cx + rx * Math.cos(th), FL - ry * Math.sin(th), w0 + (w1 - w0) * (a - a0) / (180 - a0)]); } P.push([P[P.length - 1][0] - 1, FL + 3, w1]); return P; };
const mir = (C) => C.map(([x, y, w]) => [300 - x, y, w]);
const A0 = arch(36, 21.5, 26.5, 5, 6.5, 0);
const WALLL = [[16, 150, 7.5], [8, 126, 7], [10, 100, 6.2], [21, 80, 5.2], [26, 62, 4.6], [21, 46, 4], [11, 33, 3.4], [2, 24, 3]], WALLR = [[284, 150, 7.5], [293, 122, 7], [289, 94, 6.2], [277, 74, 5.2], [271, 56, 4.6], [276, 40, 4], [288, 28, 3.4], [298, 20, 3]];
// roots: C, layer, vein (sap runs along it, from the far end toward the trunk), groove count
const ROOTS = [{ C: [[112, 141, 5.5], [102, 146, 4.8], [88, 149, 4.2], [74, 150, 3.6], [59, 149, 3]], lay: 'mid', vein: 1 }, { C: mir([[112, 141, 5.5], [102, 146, 4.8], [88, 149, 4.2], [74, 150, 3.6], [59, 149, 3]]), lay: 'mid', vein: 1 },
  { C: A0, lay: 'back' }, { C: mir(A0), lay: 'back' }, { C: WALLL, lay: 'back' }, { C: WALLR, lay: 'back' },
  { C: [[10, 100, 4], [3, 90, 3], [-2, 84, 2.5]], lay: 'back' }, { C: [[289, 94, 4], [297, 84, 3], [302, 78, 2.5]], lay: 'back' },
  { C: [[144, 149, 4], [137, 155, 3.4], [124, 160, 2.8], [110, 163, 2.2], [98, 163, 1.6]], lay: 'mid', vein: 1 }, { C: [[156, 149, 4], [164, 155, 3.4], [178, 160, 2.8], [192, 162, 2.2], [206, 161, 1.6]], lay: 'mid', vein: 1 },
  { C: [[40, 150, 3], [34, 158, 2.6], [24, 164, 2.2], [12, 167, 1.8]], lay: 'mid' }, { C: [[262, 150, 3], [270, 157, 2.6], [282, 162, 2.2], [294, 164, 1.8]], lay: 'mid' }];
const VG = [2, 5, 8, 11];   // the grooves that carry sap
function inHol(x, y, a, b) { for (let k = a; k <= b; k++) { const h = HOL[k], u = (x - h.cx) / h.rx, v = (y - FL) / h.ry; if (u * u + v * v < 1 && y < FL) return true; } return false; }
const groove = (cu, sg) => cu * 6.5 + 6.5 + (vnoise(cu * 2.2 + 5, sg / 16, 11) - 0.5) * 2.6 + (vnoise(cu * 5 + 2, sg / 6, 12) - 0.5) * 0.7;
let TG = null;
function treeGeo() {
  if (TG) return TG;
  const N = AW * AH, part = new Int8Array(N).fill(-1), U = new Float32Array(N), SV = new Float32Array(N), NX = new Float32Array(N), NY = new Float32Array(N), DEP = new Float32Array(N);
  const limbs = LIMB.map(C => tube(C));
  for (let y = 0; y <= FL; y++) for (let x = 84; x < 216; x++) {
    const px = x + 0.5, py = y + 0.5; let best = 0, bp = -1, bu = 0, bs = 0, bnx = 0, bny = 0;
    if (y >= 100) { const hw = COL(y), u = (px - colX(y)) / hw; if (Math.abs(u) < 1 && !inHol(px, py, 1, 2)) { best = (1 - Math.abs(u)) * hw; bp = 0; bu = u; bs = FL - y; bnx = u * 0.9; bny = 0; } }
    for (let k = 0; k < 2; k++) { const T = limbs[k]; if (x < T.bb[0] || x > T.bb[2] || y < T.bb[1] || y > T.bb[3]) continue; const a = tubeAt(T, px, py); if (!a) continue; const dp = (1 - Math.abs(a.u)) * a.w; if (dp > best) { best = dp; bp = k + 1; bu = a.u; bs = a.s; bnx = -a.ty * a.u * 0.9; bny = a.tx * a.u * 0.9; } }
    if (bp < 0) continue; const p = y * AW + x; part[p] = bp; U[p] = bu; SV[p] = bs; NX[p] = bnx; NY[p] = bny; DEP[p] = best;
  }
  const roots = ROOTS.map(r => Object.assign({ T: tube(r.C) }, r));
  roots.forEach((r, k) => { const T = r.T; for (let y = Math.max(0, T.bb[1]); y <= Math.min(AH - 1, T.bb[3]); y++) for (let x = Math.max(0, T.bb[0]); x <= Math.min(AW - 1, T.bb[2]); x++) {
    if (r.lay === 'back' && y > FL) continue; const p = y * AW + x; if (part[p] >= 0 && part[p] < 3) continue; const a = tubeAt(T, x + 0.5, y + 0.5); if (!a) continue; const dp = (1 - Math.abs(a.u)) * a.w; if (part[p] >= 3 && DEP[p] >= dp) continue;
    part[p] = 3 + k; U[p] = a.u; SV[p] = a.s; NX[p] = -a.ty * a.u * 0.9; NY[p] = a.tx * a.u * 0.9; DEP[p] = dp; } });
  // sap veins: the chosen grooves up the column and limbs (distance from the root tips = d), the centre line of the two arch roots
  const vp = [], vd = [], nearKnot = (x, y) => KNOTS.some(([kx, ky]) => ((x - kx) / 5.5) ** 2 + ((y - ky) / 4) ** 2 < 1);
  for (let p = 0; p < N; p++) { const k = part[p]; if (k < 0) continue; const x = p % AW, y = (p / AW) | 0; if (nearKnot(x, y)) continue;
    if (k <= 2) { const cu = k === 0 ? U[p] : k === 1 ? (U[p] - 1) / 2 : (U[p] + 1) / 2, sg = k === 0 ? FL - y : SV[p] + 29.5, gw = groove(cu, sg), gi = Math.floor(gw);
      if (VG.indexOf(gi) >= 0 && gw - gi < 0.24 && Math.abs(U[p]) < 0.93) { vp.push(p); vd.push(26 + sg); } }
    else if (roots[k - 3].vein && Math.abs(U[p]) < 0.22 && y <= FL + 12) { vp.push(p); vd.push(26 * (1 - SV[p] / roots[k - 3].T.len)); } }
  // thin the veins: where a groove runs flat, a row of candidates keeps only its middle pixel
  const VM = new Float32Array(N).fill(-1); vp.forEach((p, i) => { VM[p] = vd[i]; }); vp.length = 0; vd.length = 0;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW;) { if (VM[y * AW + x] < 0) { x++; continue; } let e = x; while (e + 1 < AW && VM[y * AW + e + 1] >= 0) e++;
    const keep = e - x < 2 ? [x, e] : [Math.floor((x + e) / 2)]; for (let q = x; q <= e; q++) if (keep.indexOf(q) >= 0) { vp.push(y * AW + q); vd.push(VM[y * AW + q]); } x = e + 1; }
  // the windows: hollow pixels not covered by any root
  const HM = new Uint8Array(N);
  HOL.forEach((h, k) => { const px = []; h.x0 = Math.floor(h.cx - h.rx); h.x1 = Math.ceil(h.cx + h.rx); h.y0 = Math.floor(FL - h.ry);
    for (let y = h.y0; y < FL; y++) for (let x = h.x0; x <= h.x1; x++) { const u = (x + 0.5 - h.cx) / h.rx, v = (y + 0.5 - FL) / h.ry; if (u * u + v * v >= 1) continue; const p = y * AW + x; if (part[p] >= 0) continue; px.push(p); HM[p] = k + 1; }
    h.px = Int32Array.from(px); });
  return (TG = { part, U, SV, NX, NY, roots, vp: Int32Array.from(vp), vd: Float32Array.from(vd), dmax: Math.max(...vd), HM });
}

// ───────── the four worlds in the root hollows (emissive: they are lit by their own sky) ─────────
function worlds(D, t, dk, st) {
  const G = treeGeo(), HM = G.HM, MI = X.MI, tq = Math.floor(t * 15), redo = st.wq !== tq;
  const WC = st.wc || (st.wc = HOL.map(h => ({ m: new Uint8Array(h.px.length), t: new Float32Array(h.px.length) }))); st.wq = tq; let W;
  const inW = (x, y, k) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < AW && y < AH && HM[y * AW + x] === k + 1; };
  // 0 · a snowy night: a moon, stars, a snowy hill with a pine and a cabin with a lit window, snow falling
  let h = HOL[0]; W = WC[0]; if (redo) for (let i = 0; i < h.px.length; i++) { const p = h.px[i], x = p % AW, y = (p / AW) | 0, gy = 139 + Math.round(Math.sin(x * 0.38) * 1.6 - Math.max(0, 7 - Math.abs(x - 43)) * 0.55);
    let m = 'night', tn = 1.6 + (y - h.y0) / h.ry * 2.8;
    if (y >= gy) { m = 'ice'; tn = (y === gy ? 10 : 8.6 - (y - gy) * 0.22) - (x > 44 ? 0.6 : 0) + (hash(x, y, 4) < 0.07 ? 1.5 : 0); }
    else if (Math.abs(x - 29) <= (y - 130) * 0.42 && y >= 130) { m = 'leaf'; tn = ((y - 130) % 3 === 0 && x <= 29) ? 0 : 1.2; if ((y - 130) % 3 === 0 && x < 29) { m = 'ice'; tn = 9; } }
    else if (x >= 44 && x <= 48 && y >= gy - 4) { m = 'wood'; tn = 2; if (y === gy - 4) { m = 'ice'; tn = 10; } else if (x === 46 && y === gy - 2) { m = 'lamp'; tn = 9 + 0.8 * Math.sin(t * 3); } }
    else if (Math.hypot(x - 24.5, y - 132.5) < 2.3) { m = 'linen'; tn = 10 - (x > 25 ? 1 : 0); }
    else if (hash(x, y, 7) < 0.045) { m = 'linen'; tn = 7 + 3 * Math.max(0, Math.sin(t * 2.3 + x * 1.7 + y)); }
    W.m[i] = MI[m]; W.t[i] = tn; }
  const ov = [];
  for (let k = 0; k < 11; k++) { const x = h.x0 + frac(k * 0.37 + Math.sin(t * 0.7 + k) * 0.04 + t * 0.02) * (h.x1 - h.x0), y = h.y0 + frac(k * 0.61 + t * (0.18 + (k % 3) * 0.06)) * h.ry; if (inW(x, y, 0)) ov.push([x, y, 'linen', 10]); }
  // 1 · lava: a black smoky sky with a red glow low down, two volcano cones with glowing craters, a river of lava, embers
  h = HOL[1]; W = WC[1]; if (redo) for (let i = 0; i < h.px.length; i++) { const p = h.px[i], x = p % AW, y = (p / AW) | 0, rel = (y - h.y0) / h.ry, xx = x + 0.5;
    let m = 'rock', tn = 0.8 + (vnoise(x / 3 - t * 0.5, y / 2.5, 3) > 0.58 ? 1.2 : 0);
    if (rel > 0.3) { m = rel > 0.62 ? 'fire' : 'red'; tn = rel > 0.62 ? 3.5 + (rel - 0.62) * 9 : 1.5 + (rel - 0.3) * 8; }
    const v1 = h.cx - 4, v2 = h.cx + 5.5, c1 = y - 137 - Math.abs(xx - v1) * 1.25, c2 = y - 140 - Math.abs(xx - v2) * 1.1;
    if (c1 >= 0 || c2 >= 0) { m = 'rock'; tn = 0.6 + (xx < v1 || (c2 >= 0 && xx < v2 && c1 < 0) ? 0.9 : 0);
      if ((c1 >= 0 && c1 < 1.2 && Math.abs(xx - v1) < 1.5) || (c2 >= 0 && c2 < 1.2 && Math.abs(xx - v2) < 1.2)) { m = 'fire'; tn = 10; }
      const run = v1 + (y - 138) * 0.35 + Math.sin(y * 0.9) * 0.6; if (c1 >= 0 && Math.abs(xx - run) < 0.7 && y < 145) { m = 'fire'; tn = 7 + 3 * frac(-t * 1.3 + y * 0.18); } }
    const rv = 144.5 + Math.sin(xx * 0.45 + 1) * 1; if (y >= rv) { m = 'fire'; tn = 7.5 + 3 * (0.5 + 0.5 * Math.sin(xx * 0.8 - t * 3 + y * 1.1)); if (vnoise(xx / 3 + t * 0.4, y / 1.4, 5) > 0.66) { m = 'rock'; tn = 1.5; } }
    W.m[i] = MI[m]; W.t[i] = tn; }
  for (let k = 0; k < 6; k++) { const x = h.x0 + 2 + frac(k * 0.43 + Math.sin(t * 1.6 + k * 2) * 0.05) * (h.x1 - h.x0 - 4), y = FL - 4 - frac(t * 0.35 + k * 0.29) * (h.ry - 2); if (inW(x, y, 1)) ov.push([x, y, 'fire', 9 + 2 * frac(k * 0.7)]); }
  // 2 · the void: black space, a spiral galaxy turning slowly, twinkling stars, a comet now and then
  h = HOL[2]; const cq = frac(t / 7), cx0 = h.cx + 10 - cq * 26, cy0 = 132 + cq * 10, gx = h.cx - 0.5, gy = 139.5;
  W = WC[2]; if (redo) for (let i = 0; i < h.px.length; i++) { const p = h.px[i], x = p % AW, y = (p / AW) | 0, dx = x + 0.5 - gx, dy = (y + 0.5 - gy) * 1.5, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    let m = 'night', tn = 0.5 + (vnoise(x / 4, y / 3.5, 8) > 0.6 ? 1 : 0);
    const arm = Math.pow(Math.max(0, Math.cos(2 * th - 2.3 * Math.log(r + 1) + t * 0.35)), 3) * Math.max(0, 1 - r / 10.5);
    if (r < 1.6) { m = 'linen'; tn = 11; } else if (r < 3) { m = 'arcane'; tn = 10 - (r - 1.6); } else if (arm > 0.15) { m = 'arcane'; tn = 5.5 + arm * 6 + (hash(x, y, 16) < 0.2 ? 1.5 : 0); }
    else if (hash(x, y, 13) < 0.08) { m = hash(x, y, 14) < 0.6 ? 'linen' : 'arcane'; tn = 6.5 + 4 * Math.max(0, Math.sin(t * 2.7 + hash(x, y, 15) * 20)); }
    if (cq < 0.35) { const cd = (x - cx0) * 0.7 + (y - cy0) * 0.3, cp = Math.abs((y - cy0) - (x - cx0) * -0.4); if (cp < 0.7 && cd > -0.5 && cd < 4) { m = 'linen'; tn = 11 - cd * 1.2; } }
    W.m[i] = MI[m]; W.t[i] = tn; }
  // 3 · a windy meadow in daylight: sky, sun, a drifting cloud, far hills, grass rolling in the wind, flowers, a bird
  h = HOL[3]; const cl = 246 + frac(t / 22) * 44, bxp = 250 + frac(t / 9) * 34, byp = 132 + Math.sin(t * 1.3) * 1.5;
  W = WC[3]; if (redo) for (let i = 0; i < h.px.length; i++) { const p = h.px[i], x = p % AW, y = (p / AW) | 0, hill = 139 + Math.round(Math.sin(x * 0.21 + 1) * 1.5), gl = 142 + Math.round(Math.sin(x * 0.5 + 2) * 0.6);
    let m = 'ice', tn = 9.6 - (y - h.y0) * 0.06;
    if (Math.hypot(x + 0.5 - 273, y + 0.5 - 132) < 2.6) { m = 'lamp'; tn = 11; }
    else if (Math.hypot(x + 0.5 - 273, y + 0.5 - 132) < 3.6) { m = 'lamp'; tn = 9.5; }
    else if (((x + 0.5 - cl) / 5) ** 2 + ((y + 0.5 - 131.5) / 1.6) ** 2 < 1 || ((x + 0.5 - cl - 2.5) / 3) ** 2 + ((y + 0.5 - 130) / 1.4) ** 2 < 1) { m = 'linen'; tn = y > 132 ? 8.5 : 10; }
    if (y >= hill) { m = 'leaf'; tn = 6.8 + (y === hill ? 1 : 0); }
    if (y >= gl) { const wv = Math.sin(x * 0.42 - t * 3.3 + y * 0.3); m = 'leaf'; tn = 8 + 1.6 * wv + (hash(x, y, 3) < 0.15 ? -1 : 0); if ((x * 7 + y * 3) % 11 === 0 && y > 143) { m = hash(x, y, 5) < 0.5 ? 'candy' : 'gold'; tn = 9.5; } }
    else if (y === gl - 1 && hash(x, 3, 2) < 0.55) { m = 'leaf'; tn = 9.5; }
    W.m[i] = MI[m]; W.t[i] = tn; }
  [[-1, 0], [0, 1], [1, 0]].forEach(([dx, dy]) => { if (inW(bxp + dx, byp - dy, 3)) ov.push([bxp + dx, byp - dy + (Math.sin(t * 12) > 0 && dx ? -1 : 0), 'hair', 2]); });
  for (let k = 0; k < 4; k++) { const hh = HOL[k], C = WC[k]; for (let i = 0; i < hh.px.length; i++) { const p = hh.px[i]; if (C.m[i]) D.px(p % AW, (p / AW) | 0, C.m[i], C.t[i] * dk, E); } }
  ov.forEach(([x, y, m, tn]) => D.px(x, y, m, tn * dk, E));
}

// ───────── fruit: seven per-pixel sprites, any size (R = half height in art px) ─────────
// fpart → 0 outside, 1 skin, 2… details; u right, v down, the fruit spans about −1…1; FTOP = where its stem enters
const FTOP = [-0.66, -0.76, -0.92, -0.9, -1.0, -0.66, -0.32];
function leafSh(u, v, x0, y0, dx, dy, L, W) { const bx = u - x0, by = v - y0, al = bx * dx + by * dy, ac = -bx * dy + by * dx; if (al <= 0 || al >= L) return 0; const hw = W * Math.sin(Math.PI * Math.pow(al / L, 0.75)); return Math.abs(ac) < hw ? (ac < 0 ? 1 : 2) : 0; }
const CL = { rx: 0, ry: 0, al: 0, ac: 0 };
function clover(u, v) { for (let j = 0; j < 4; j++) { const ph = Math.PI / 4 + j * Math.PI / 2, dx = Math.cos(ph), dy = Math.sin(ph), rx = u - dx * 0.5, ry = v - dy * 0.5, al = rx * dx + ry * dy, ac = -rx * dy + ry * dx;
    if (al * al + ac * ac > 0.25) continue; if (al > 0.2 && Math.abs(ac) < (al - 0.2) * 0.8) continue; CL.rx = rx; CL.ry = ry; CL.al = al; CL.ac = ac; return j; } return -1; }
function fpart(k, u, v, t, blink) {
  const r2 = u * u + v * v;
  switch (k) {
    case 0: { const X2 = u * 1.14, Y = 0.22 - v * 1.14, a = X2 * X2 + Y * Y - 1; if (a * a * a - X2 * X2 * Y * Y * Y > 0) return 0;   // heart
      return ((u + 0.45) / 0.2) ** 2 + ((v + 0.4) / 0.15) ** 2 < 1 ? 2 : 1; }
    case 1: { const bl = leafSh(u, v, 0.08, -0.72, 0.62, -0.78, 1.2, 0.22); if (bl) return bl + 2;   // spiky amber + a blade leaf
      const th = Math.atan2(v, u), sp = Math.pow(Math.max(0, Math.cos(th * 4 + 0.35)), 8), rr = 0.74 + 0.3 * sp; if (r2 > rr * rr) return 0;
      const cr = 0.12 + 0.03 * Math.sin(th * 3 + t * 2); return r2 < cr * 0.45 ? 6 : r2 < cr ? 2 : r2 > 0.6 && sp > 0.2 ? 5 : 1; }
    case 2: { if (v < -0.95 || v > 1) return 0; const hw = 0.82 * Math.sqrt(Math.max(0, 1 - v * v)) * (1 + 0.12 * v); if (Math.abs(u) > hw) return 0;   // egg of shield scales
      const row = Math.floor((v + 1) / 0.44), off = row % 2 ? 0.22 : 0, cu = (u + off + 10) / 0.44, fx = cu - Math.floor(cu) - 0.5, fy = (v + 1) / 0.44 - row;
      return fy > 0.7 - fx * fx * 1.3 ? 2 : fy < 0.36 && fx < 0.05 ? 3 : 1; }
    case 3: { if (u * u / 0.9 + v * v > 1) return 0;   // translucent lime, a seed like an eye
      const ex = u / 0.52, ey = (v - 0.12) / 0.3; if (Math.abs(ex) < 1 && Math.abs(ey) < (1 - ex * ex) * blink) { const ir = (u - 0.04) ** 2 + (v - 0.12) ** 2; return ir < 0.035 ? (u < 0.02 && v < 0.1 ? 5 : 4) : 3; }
      return ((u + 0.45) / 0.16) ** 2 + ((v + 0.45) / 0.12) ** 2 < 1 || ((u - 0.5) / 0.09) ** 2 + ((v - 0.42) / 0.09) ** 2 < 1 ? 2 : 1; }
    case 4: { let inb; if (v > 0.2) inb = u * u + (v - 0.2) ** 2 < 0.56; else { const q = (v + 1.02) / 1.22; if (q < 0) return 0; inb = Math.abs(u - 0.16 * (1 - q) * (1 - q)) < 0.75 * Math.pow(q, 0.95); }   // teardrop of violet light
      if (!inb) return 0;
      for (let j = 0; j < 7; j++) { const a = t * 2.6 - j * 0.55, rr = 0.36 - j * 0.035, wx = 0.02 + rr * Math.cos(a), wy = 0.22 + rr * Math.sin(a) * 0.8 - j * 0.04; if ((u - wx) ** 2 + (v - wy) ** 2 < (j < 2 ? 0.02 : 0.012)) return j < 2 ? 2 : 3; }
      return 1; }
    case 5: { const lf = leafSh(u, v, 0.06, -0.66, 0.8, -0.6, 0.78, 0.2); if (lf) return lf + 3;   // golden apple, strong highlight
      const th = Math.atan2(u, -v), rr = 0.97 - 0.3 * Math.exp(-(th * th) / 0.1) - 0.07 * Math.exp(-((Math.abs(th) - Math.PI) ** 2) / 0.12); if (u * u * 0.88 + v * v > rr * rr) return 0;
      if (((u + 0.42) / 0.19) ** 2 + ((v + 0.3) / 0.3) ** 2 < 1) return 2; if (((u + 0.08) / 0.1) ** 2 + ((v + 0.56) / 0.08) ** 2 < 1) return 3; return 1; }
    case 6: { if (r2 < 0.035) return 4; const j = clover(u, v); if (j < 0) return 0;   // four-leaf clover (×): four domed heart-shaped leaflets, a gold heart
      return Math.abs(CL.ac) < 0.05 && CL.al < 0.16 && CL.al > -0.3 ? 3 : 1; }
  }
  return 0;
}
// tone for a fruit pixel; tl / br = on the lit (top-left) / shaded (bottom-right) edge
function ftone(k, p, u, v, tl, br) {
  const L = clamp(0.3 - 0.5 * u - 0.62 * v, -1, 1), C = Math.max(0, 1 - u * u - v * v), r2 = u * u + v * v, ed = tl ? 1.6 : br ? -1.3 : 0;
  switch (k) {
    case 0: return p === 2 ? ['candy', 10.5] : ['candy', 4.4 + 2 * L + 1.5 * C + ed];
    case 1: return p === 3 ? ['iron', 10.5] : p === 4 ? ['iron', 7 + (u > 0.6 ? 2 : 0)] : p === 6 ? ['fire', 10] : p === 2 ? ['fire', 8] : ['lamp', 4.6 + 2 * L + 1.3 * C + (p === 5 ? 1.2 - (u + v) * 0.6 : 0) + ed];
    case 2: return ['tile', p === 2 ? 3.2 + L : p === 3 ? 8.6 + L : 5.6 + 1.8 * L + 0.8 * C + ed];
    case 3: return p === 3 ? ['linen', 9.6] : p === 4 ? ['leaf', 1.5] : p === 5 ? ['linen', 11] : p === 2 ? ['leaf', 11] : ['leaf', 6.4 + 3.4 * r2 + 1.1 * L + (tl ? 1.2 : br ? 0.6 : 0)];
    case 4: return p === 2 ? ['linen', 10.6] : p === 3 ? ['arcane', 10] : ['arcane', 4.2 + 3.6 * r2 + 1 * L + (tl ? 1.4 : br ? 0.8 : 0)];
    case 5: return p === 2 ? ['gold', 11] : p === 3 ? ['gold', 10.4] : p === 4 ? ['leaf', 8.5] : p === 5 ? ['leaf', 5.5] : ['gold', 5.2 + 2.4 * L + 1.2 * C + (tl ? 1.6 : br ? 0.6 : 0)];
    case 6: { if (p === 4) return ['gold', 9 - u * 2]; clover(u, v); const Ll = clamp(0.35 - 0.9 * CL.rx - 1.1 * CL.ry, -1, 1); return p === 3 ? ['screen', 4 + Ll] : ['screen', 5.2 + 2.6 * Ll + (tl ? 1.4 : br ? -1.2 : 0)]; }
  }
  return ['stone', 5];
}
const FB = new Int8Array(64 * 64), FEXT = [[1.1, 1.1, 1.0, 1.2], [1.1, 1.1, 1.8, 1.1], [0.95, 0.95, 1.0, 1.05], [1.02, 1.02, 1.05, 1.05], [0.95, 0.95, 1.05, 1.0], [1.1, 1.1, 1.2, 1.05], [0.92, 0.92, 0.92, 0.92]];
// draw a fruit centred at (cx, cy) with half-size R; o: { lum, sx, sy, rot }
function drawFruit(D, k, cx, cy, R, t, o) {
  o = o || {}; if (R < 0.6) return; const sx = o.sx || 1, sy = o.sy || 1, rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot), lum = o.lum || 0, F = FEXT[k], ex = rot ? Math.max(...F) : 0;
  const x0 = Math.floor(cx - (ex || F[0]) * R * sx) - 1, y0 = Math.floor(cy - (ex || F[2]) * R * sy) - 1, w = Math.min(64, Math.ceil(cx + (ex || F[1]) * R * sx) + 2 - x0), h = Math.min(64, Math.ceil(cy + (ex || F[3]) * R * sy) + 2 - y0), bl = k === 3 ? (frac(t / 4.7 + (o.ph || 0)) < 0.035 ? 0.12 : 1) : 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const dx = x0 + i + 0.5 - cx, dy = y0 + j + 0.5 - cy, u = (dx * cr + dy * sr) / (R * sx), v = (-dx * sr + dy * cr) / (R * sy); FB[j * w + i] = fpart(k, u, v, t + (o.ph || 0) * 3, bl); }
  D.beg();
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const p = FB[j * w + i]; if (!p) continue;
    const tl = !(i > 0 && FB[j * w + i - 1]) || !(j > 0 && FB[(j - 1) * w + i]), br = !(i < w - 1 && FB[j * w + i + 1]) || !(j < h - 1 && FB[(j + 1) * w + i]);
    const dx = x0 + i + 0.5 - cx, dy = y0 + j + 0.5 - cy, u = (dx * cr + dy * sr) / (R * sx), v = (-dx * sr + dy * cr) / (R * sy), [m, tn] = ftone(k, p, u, v, tl, br);
    D.px(x0 + i, y0 + j, m, tn + lum, E); }
  D.end();
}
// omen aura (behind the fruit): two dashed rings turning opposite ways and rays that grow as it ripens
function drawAura(D, cx, cy, R, q, ripe, t) {
  const m = QM[q], Ra = R * 1.15 + 2.5 + Math.sin(t * 5) * 0.6, Rb = Ra + 3.5, ext = Math.ceil(Rb + 3 + 6 * ripe);
  for (let y = Math.floor(cy - ext); y <= cy + ext; y++) for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), th = Math.atan2(dy, dx) / TAU;
    if (Math.abs(d - Ra) < 0.55) { if (frac(th * 14 + t * 0.6) < 0.62) D.px(x, y, m, 8.6 + ripe * 1.5, E); }
    else if (d > R && d < Ra - 0.5) { if (((x + y) & 1) === 0 || d < R + 1.6) D.px(x, y, m, 4 + ripe * 2.5 - (d - R) * 0.4, E); }
    else if (Math.abs(d - Rb) < 0.5) { if (frac(th * 22 - t * 0.9) < 0.4) D.px(x, y, m, 6.5 + ripe * 2, E); }
    else if (d > Ra + 1.2 && d < Ra + 2.5 + 6 * ripe) { const ray = frac(th * 8 + t * 0.12); if (ray < 0.05 || ray > 0.95) D.px(x, y, m, 10.2 - (d - Ra) * 0.5, E); }
  }
}
const CRK = [[0.55, -0.62], [0.24, -0.34], [0.36, -0.06], [0.02, 0.14], [0.14, 0.4], [-0.22, 0.56], [-0.3, 0.86]];
function drawCrack(D, cx, cy, R, q, c, t) {
  const m = QM[q], P = CRK.map(([u, v]) => [cx + u * R, cy + v * R]), n = (P.length - 1) * c;
  for (let i = 0; i < Math.ceil(n); i++) { const a = P[i], b0 = P[i + 1], f = Math.min(1, n - i), b = [a[0] + (b0[0] - a[0]) * f, a[1] + (b0[1] - a[1]) * f];
    D.line(a[0] + 1, a[1], b[0] + 1, b[1], m, 9, E); D.line(a[0], a[1], b[0], b[1], 'linen', 11, E);
    if (c > 0.4 && i % 2 === 0) { const ox = a[0] - cx, oy = a[1] - cy, l = Math.hypot(ox, oy) || 1, L = R * 0.45 + 2 + c * 5 + Math.sin(t * 20 + i) * 1.2; for (let s = R * 0.6; s < R * 0.6 + L; s += 1) if (frac(s * 0.5 + t * 3) < 0.7) D.px(a[0] + ox / l * s * 0.9, a[1] + oy / l * s * 0.9, m, 10.5 - s * 0.2, E); } }
}

// ───────── branches, leaves, vines ─────────
function leaf(D, x, y, a, L, tn) {
  const ca = Math.cos(a), sa = Math.sin(a), s = ca >= 0 ? 1 : -1;
  for (let k = 0; k <= L; k++) { const w = Math.sin(Math.PI * k / L), px = x + ca * k, py = y + sa * k; D.px(px, py, 'leaf', tn + 0.3 + k * 0.2); if (w > 0.55 && k < L) { D.px(px - sa * s, py + ca * s, 'leaf', tn - 1.3); D.px(px + sa * s, py - ca * s, 'leaf', tn + 1.6); } }
}
// a fruit branch as a bent quadratic: base (bx, by) → tip; returns the point where it crosses x = hx (the stem top)
const bez = (b, c, e, u) => (1 - u) * (1 - u) * b + 2 * (1 - u) * u * c + u * u * e;
const bpath = (i, bend) => { const [bx, by, tx, ty0] = BR[i], ty = ty0 + bend; return [bx, by, (bx + tx) / 2, Math.min(by, ty) - 3 + bend * 0.4, tx, ty]; };
// where the stem hangs from branch i: the point over the hang x (bottom of the branch)
function branchTop(i, bend) {
  const [bx, by, cxp, cyp, tx, ty] = bpath(i, bend), hx = HANG[i][0]; let lo = 0, hi = 1;
  for (let k = 0; k < 18; k++) { const u = (lo + hi) / 2; if ((bez(bx, cxp, tx, u) - hx) * (tx - bx) < 0) lo = u; else hi = u; }
  const u = (lo + hi) / 2, w = Math.max(1, Math.round((i === 3 ? 2.2 : 3.2) * (1 - u * 0.65))); return [hx, bez(by, cyp, ty, u) + (w >> 1)];
}
const REST = [0, 1, 2, 3].map(i => branchTop(i, 0));
function drawBranch(D, i, bend, shake, t, glow) {
  const [bx, by, cxp, cyp, tx, ty] = bpath(i, bend), wb = i === 3 ? 2.2 : 3.2, n = Math.ceil(Math.abs(tx - bx) * 2) + 2;
  for (let s = 0; s <= n; s++) { const u = s / n, x = bez(bx, cxp, tx, u), y = bez(by, cyp, ty, u), w = Math.max(1, Math.round(wb * (1 - u * 0.65)));
    for (let k = 0; k < w; k++) D.px(x, y + k - (w >> 1), 'wood', (k === 0 ? 6.5 : k === w - 1 ? 2.6 : 4.4) + (glow ? 0 : 0), { n: [0, k === 0 ? -0.7 : k === w - 1 ? 0.7 : 0] });
    if (glow > 0 && w > 1 && s % 2 === 0) D.px(x, y, 'teal', 6 + glow * 4, E); }
  // leaves along the branch (they shake when hovered or on a beat)
  const js = shake * Math.sin(t * 38);
  [[0.3, -1], [0.52, 1], [0.72, -1], [0.93, 1], [1, -1]].forEach(([u, sd], j) => { const x = bez(bx, cxp, tx, u), y = bez(by, cyp, ty, u), dir = tx < bx ? Math.PI : 0;
    leaf(D, x, y + sd, dir + sd * (0.75 + 0.2 * Math.sin(t * 1.3 + j * 2)) + js * 0.5 * sd, 4 + (j % 2), 5 + (j % 3) * 0.6); });
  return branchTop(i, bend);
}
const VINES = [[62, 50, 22, 0], [76, 49, 32, 1.3], [119, 36, 16, 2.1], [127, 33, 27, 0.4], [173, 33, 25, 3], [181, 36, 14, 1.7], [224, 49, 30, 2.6], [238, 50, 19, 0.9]];
function vine(D, x0, y0, L, ph, t, gust) {
  for (let k = 0; k < L; k++) { const q = k / L, sw = Math.sin(t * 0.8 + ph + k * 0.13) * q * q * (2.2 + gust * 3), x = x0 + sw, y = y0 + k;
    D.px(x, y, 'leaf', 3.2 + (k % 4 === 0 ? 1 : 0)); if (k % 3 === 1) { const sd = (k >> 1) % 2 ? 1 : -1; D.px(x + sd, y, 'leaf', 6.2 - q); D.px(x + sd * 2, y - 1, 'leaf', 5 - q); D.px(x + sd, y - 1, 'leaf', 7.4 - q); } }
  const ex = x0 + Math.sin(t * 0.8 + ph + L * 0.13) * (2.2 + gust * 3); D.px(ex + 1, y0 + L, 'leaf', 5); D.px(ex + 1, y0 + L + 1, 'leaf', 4);
}
const SPRIG = [[68, 51], [83, 48], [97, 44], [110, 38], [133, 30], [165, 30], [190, 38], [203, 44], [217, 48], [232, 51]];
const FIRE = [[40, 108], [58, 84], [80, 118], [100, 96], [124, 58], [176, 56], [198, 98], [222, 116], [246, 86], [262, 108], [150, 100], [30, 90], [88, 76], [212, 74], [270, 92], [110, 124], [190, 122], [60, 130], [240, 130], [70, 60], [232, 62], [34, 70]];

// ───────── the cut branch and the axe ─────────
let CPC = null;
function drawCutRest(D, t, glow) {
  if (!CPC) { const T = tube(CUTP.map(([x, y, w]) => [CUT[0] + x, CUT[1] + y, w]), 2), L = [];
    for (let y = T.bb[1]; y <= T.bb[3]; y++) for (let x = T.bb[0]; x <= T.bb[2]; x++) { const a = tubeAt(T, x + 0.5, y + 0.5); if (!a) continue; const u = a.u, gr = frac(u * 1.5 + 1.5 + Math.sin(a.s * 0.4) * 0.2);
      L.push([x, y, Math.abs(u) < 0.22 && a.s > 1 && a.s < T.len - 2 ? 1 : 0, 4.6 - u * 1.4 + (gr < 0.25 ? -1.8 : 0) + (hash(x, y, 2) - 0.5) * 0.6, -a.ty * u * 0.9, a.tx * u * 0.9, a.s]); }
    CPC = L; }
  D.beg(); const OP = { n: [0, 0] };
  for (let i = 0; i < CPC.length; i++) { const q = CPC[i]; if (q[2]) { const sh = frac(q[6] * 0.25 - t * 0.8); if (sh < 0.5) { D.px(q[0], q[1], 'lamp', 7.5 + glow * 2 + (sh < 0.2 ? 1 : 0), E); continue; } } OP.n[0] = q[4]; OP.n[1] = q[5]; D.px(q[0], q[1], 'wood', q[3], OP); }
  const c = 1, s = 0, tip = [CUT[0] + CUTP[3][0], CUT[1] + CUTP[3][1]], mid = [CUT[0] + CUTP[2][0], CUT[1] + CUTP[2][1]];
  D.line(mid[0], mid[1], mid[0] + 2 * c + 4 * s, mid[1] + 2 * s - 4 * c, 'wood', 5);
  leaf(D, tip[0], tip[1], -0.4, 4, 5.4); leaf(D, tip[0], tip[1], 0.7, 4, 4.8); leaf(D, mid[0] + 2, mid[1] - 4, -1.3, 4, 5.8);
  D.end();
}
function drawCutPiece(D, ox, oy, rot, t, split, glow) {
  const c = Math.cos(rot), s = Math.sin(rot), C = CUTP.map(([x, y, w]) => [ox + x * c - y * s, oy + x * s + y * c, w]), T = tube(C, 2);
  D.beg();
  for (let y = T.bb[1]; y <= T.bb[3]; y++) for (let x = T.bb[0]; x <= T.bb[2]; x++) { const a = tubeAt(T, x + 0.5, y + 0.5); if (!a) continue; const u = a.u, gr = frac(u * 1.5 + 1.5 + Math.sin(a.s * 0.4) * 0.2);
    if (split && u < -0.1) continue; let tn = 4.6 - u * 1.4 + (gr < 0.25 ? -1.8 : 0) + (hash(x, y, 2) - 0.5) * 0.6;
    if (Math.abs(u) < 0.22 && a.s > 1 && a.s < T.len - 2 && (glow > 0 || split)) { const sh = frac(a.s * 0.25 - t * 0.8); if (split || sh < 0.5) { D.px(x, y, 'lamp', 7.5 + glow * 2 + (split ? 2 : 0) + (sh < 0.2 ? 1 : 0), E); continue; } }
    D.px(x, y, 'wood', tn, { n: [-a.ty * u * 0.9, a.tx * u * 0.9] }); }
  // a fork and three leaves near the tip
  const tip = C[3], mid = C[2]; D.line(mid[0], mid[1], mid[0] + 2 * c + 4 * s, mid[1] + 2 * s - 4 * c, 'wood', 5);
  leaf(D, tip[0], tip[1], rot - 0.4, 4, 5.4); leaf(D, tip[0], tip[1], rot + 0.7, 4, 4.8); leaf(D, mid[0] + 2 * c + 4 * s, mid[1] + 2 * s - 4 * c, rot - 1.3, 4, 5.8);
  D.end();
  if (split) { const sx = C[1][0], sy = C[1][1] - 3; D.beg(); D.rect(sx - 4, sy - 1, 9, 3, 'paper', 8.5); D.hl(sx - 4, sy - 1, 9, 'paper', 10); D.vl(sx - 5, sy - 1, 3, 'paper', 6); D.vl(sx + 5, sy - 1, 3, 'paper', 6); D.px(sx, sy, 'tile', 7, E); D.px(sx + 2, sy, 'tile', 7, E); D.end(); }
}
function drawAxe(D, a, t, prev) {
  const th1 = Math.atan2(CUT[1] - AXP[1], CUT[0] - AXP[0]), L = Math.hypot(CUT[0] - AXP[0], CUT[1] - AXP[1]);
  const at = (q) => { const th = th1 + (1 - q) * 1.05, dx = Math.cos(th), dy = Math.sin(th), mx = Math.sin(th), my = -Math.cos(th); return { dx, dy, mx, my, ex: AXP[0] + dx * L - mx * 9, ey: AXP[1] + dy * L - my * 9 }; };
  // smear: the edge's arc between the last frame and this one
  if (prev != null && a - prev > 0.04) for (let q = prev; q < a; q += 0.012) { const g = at(q); for (let s = 5; s < 10; s++) D.px(g.ex + g.mx * s, g.ey + g.my * s, 'iron', 5 + (s - 5) * 0.5 + (q - prev) / (a - prev) * 2); }
  const g = at(a); D.beg();
  D.line(AXP[0], AXP[1], g.ex + g.dx * 3, g.ey + g.dy * 3, 'wood', 5, { w: 3 }); D.line(AXP[0] + g.mx, AXP[1] + g.my, g.ex + g.dx * 3 + g.mx, g.ey + g.dy * 3 + g.my, 'wood', 7.5);
  for (let s = -3; s <= 10; s++) { const half = s < 0 ? 2 : 2 + s * 0.42; for (let al = -half; al <= half; al += 0.5) { const x = g.ex + g.mx * s + g.dx * al, y = g.ey + g.my * s + g.dy * al;
    if (s >= 9) D.px(x, y, 'iron', 11, E); else if (s >= 7) D.px(x, y, 'iron', 9); else D.px(x, y, 'iron', s < 0 ? 3.5 : 5.2 + (al < 0 ? 1.2 : -0.6)); } }
  D.px(g.ex, g.ey, 'wood', 3); D.end();
}

// ───────── static scenery helpers ─────────
// sedimentary cave rock: wavy layers of varied height, each broken into leaning blocks; lit layer tops, dark undersides,
// cracks with a lit lip, slow bulges (their normals catch the lights)
function strata(S, x0, y0, w, h, m, t0, seed) {
  const r = X.rng(seed), B = [], L = [];
  for (let y = y0 - 8; y < y0 + h + 10;) { B.push(y); const cr = []; let x = x0 - 30; while (x < x0 + w + 30) { x += 12 + Math.floor(r() * 34); cr.push([x, (r() - 0.5) * 1.6, (r() - 0.5) * 2]); } L.push({ cr, t: (r() - 0.5) * 1.6 }); y += 4 + Math.floor(r() * 13); }
  const BU = new Float32Array((w + 1) * (h + 1)); for (let y = 0; y <= h; y++) for (let x = 0; x <= w; x++) BU[y * (w + 1) + x] = vnoise((x0 + x) / 26, (y0 + y) / 18, seed + 5);
  for (let x = x0; x < x0 + w; x++) {
    const tops = B.map((b, k) => b + Math.sin(x * 0.04 + k * 1.9) * 3.2 + (vnoise(x / 13, k * 3.7, seed) - 0.5) * 5);
    for (let y = y0; y < y0 + h; y++) { let k = 0; while (k + 1 < tops.length && tops[k + 1] <= y + 0.5) k++;
      const ly = y + 0.5 - tops[k], lh = (k + 1 < tops.length ? tops[k + 1] : 1e9) - tops[k], Lk = L[k]; let bi = 0, cx = 99;
      for (let j = 0; j < Lk.cr.length; j++) { if (Lk.cr[j][0] - 16 > x) break; const c = Lk.cr[j][0] + ly * Lk.cr[j][1], d = x + 0.5 - c; if (d >= 0) bi = j + 1; if (Math.abs(d) < Math.abs(cx)) cx = d; }
      const bq = (y - y0) * (w + 1) + x - x0, bt = bi > 0 ? Lk.cr[bi - 1][2] : 0, bu = BU[bq], gx = BU[bq + 1] - bu, gy = BU[bq + w + 1] - bu;
      let tn = t0 + Lk.t + bt * 0.55 + (bu - 0.5) * 2.4 + (vnoise(x / 3, y / 2, seed + 9) - 0.5) * 1.1, nx = clamp(-gx * 14, -0.7, 0.7), ny = clamp(-gy * 14, -0.7, 0.7);
      if (ly < 1) { tn += 0.9; ny = -0.75; } else if (lh - ly < 1.2) { tn -= 1.4; ny = 0.6; } else if (Math.abs(cx) < 0.55 && hash(k, Math.round(y / 3), bi) < 0.8) tn -= 2;
      if (hash(x, y, seed) < 0.012) tn -= 2;
      if (ly < 2.2 && vnoise(x / 6, k * 2.3, seed + 11) > 0.62) { S.px(x, y, 'moss', 2.6 + (ly < 1 ? 1.4 : 0) + (hash(x, y, 3) < 0.3 ? 0.8 : 0), { n: [0, -0.6] }); continue; }
      S.px(x, y, m, tn, { n: [nx, ny] }); }
  }
}
// thin branching roots that wander over the rock; a few sap glints along them
function rootNet(S, x, y, a, len, w, r, depth) {
  for (let k = 0; k < len; k++) { a += (r() - 0.5) * 0.4; x += Math.cos(a); y += Math.sin(a); if (y > FL - 1) { a = -Math.abs(a); y = FL - 1; } const ww = Math.max(1, Math.round(w * (1 - k / len) + 0.4)), hz = Math.abs(Math.sin(a)) < 0.7;
    for (let q = 0; q < ww; q++) S.px(x + (hz ? 0 : q), y + (hz ? q : 0), 'wood', (q === 0 ? 4 : 2.4) - k / len * 0.8, { n: hz ? [0, q === 0 ? -0.6 : 0.5] : [q === 0 ? -0.6 : 0.5, 0] });
    if (k % 4 === 2 && r() < 0.35) S.px(x, y, 'teal', 4 + r() * 2.5, { e: 255 });
    if (depth > 0 && k > 4 && r() < 0.09) rootNet(S, x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7), len * (0.35 + r() * 0.3), Math.max(1, w - 1), r, depth - 1); }
}
function mush(S, x, y, h, rw, tn, li) {
  S.beg(); S.vl(x, y - h, h, 'bone', 7); S.vl(x - 1, y - h + 1, h - 1, 'bone', 8.5); if (rw > 2) S.vl(x + 1, y - h + 1, h - 1, 'bone', 5.5);
  for (let yy = -Math.ceil(rw * 0.7); yy <= 0; yy++) for (let xx = -rw; xx <= rw; xx++) { const u = xx / (rw + 0.4), v = yy / (rw * 0.7 + 0.4); if (u * u + v * v > 1) continue; S.px(x + xx, y - h + yy, 'ice', tn + (yy === 0 ? -2.5 : 0) - u * 0.8 - v * 0.6 + (hash(x + xx, yy, 5) < 0.18 && yy < 0 ? 2.5 : 0), { e: yy === 0 ? 0 : li + 1, n: [u * 0.7, v * 0.7] }); }
  S.end();
}
function fern(S, x, y, h, dir, tn) {
  S.beg(); for (let f = 0; f < 3; f++) { const a = -Math.PI / 2 + dir * (0.35 + f * 0.38), L = h - f * 2.5; let px = x, py = y;
    for (let k = 0; k < L; k++) { const bend = dir * k * k * 0.012; px = x + Math.cos(a) * k + bend * 6; py = y + Math.sin(a) * k + k * k * 0.018; S.px(px, py, 'leaf', tn + 0.5); if (k > 1 && k < L - 1 && k % 2 === 0) { const lw = Math.round((1 - k / L) * 3) + 1; for (let q = 1; q <= lw; q++) { S.px(px - q, py + q * 0.4, 'leaf', tn + 1.4 - q * 0.3); S.px(px + q, py + q * 0.4, 'leaf', tn - 0.6 - q * 0.3); } } } }
  S.end();
}
function clump(S, cx, cy, rx, ry, t0, seed) {
  const r = X.rng(seed); S.beg();
  for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++) for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, th = Math.atan2(v, u), rr = 1 + 0.1 * Math.sin(th * 6 + seed) + 0.07 * Math.sin(th * 11 + seed * 1.7) + (vnoise(x / 2.2, y / 2.2, seed) - 0.5) * 0.3;
    if (u * u + v * v > rr * rr) continue; const lit = clamp(-0.5 * u - 0.8 * v, -1, 1);
    S.px(x, y, 'leaf', t0 + lit * 1.1 + (hash(x, y, seed) - 0.5) * 0.8, { n: [u * 0.75, v * 0.75] }); }
  // leaf marks: little three-pixel leaves, lit on the side facing up-left, darker deep inside
  const n = Math.round(rx * ry * 0.75);
  for (let k = 0; k < n; k++) { let u, v; do { u = r() * 2 - 1; v = r() * 2 - 1; } while (u * u + v * v > 1); const x = Math.round(cx + u * rx), y = Math.round(cy + v * ry), lit = clamp(-0.5 * u - 0.8 * v, -1, 1), tn = t0 + 1.3 + lit * 2 + r() * 0.9, sd = r() < 0.5 ? -1 : 1;
    S.px(x, y, 'leaf', tn + 0.9, { n: [u * 0.75, v * 0.75 - 0.3] }); S.px(x + sd, y + 1, 'leaf', tn, { n: [u * 0.75, v * 0.75] }); S.px(x + sd, y, 'leaf', tn + 0.4, { n: [u * 0.75, v * 0.75] }); if (r() < 0.5) S.px(x, y + 1, 'leaf', tn - 1.6, { n: [u * 0.75, v * 0.75 + 0.3] }); }
  S.end();
  // leaves hanging off the lower rim
  for (let x = Math.round(cx - rx * 0.8); x <= cx + rx * 0.8; x += 2 + Math.floor(r() * 3)) { const u = (x - cx) / rx, yb = Math.round(cy + ry * Math.sqrt(Math.max(0, 1 - u * u)) * 0.95), L = 1 + Math.floor(r() * 3); for (let k = 0; k < L; k++) S.px(x + (k === L - 1 && r() < 0.5 ? 1 : 0), yb + k, 'leaf', t0 + 0.8 - k * 0.5, { n: [u * 0.5, 0.4] }); }
}
const BACKC = [[150, 0, 60, 14], [96, 9, 34, 13], [204, 9, 34, 13], [70, 26, 18, 13], [230, 26, 18, 13], [122, 18, 28, 11], [178, 18, 28, 11], [84, 34, 16, 9], [216, 34, 16, 9], [150, 16, 26, 9]];
const MIDC = [[56, 36, 10, 9], [244, 36, 10, 9], [90, 22, 14, 8], [210, 22, 14, 8], [150, 8, 22, 8], [68, 47, 10, 8], [232, 47, 10, 8], [82, 41, 11, 8], [218, 41, 11, 8], [99, 36, 13, 8], [118, 29, 13, 7], [136, 24, 12, 6], [150, 22, 13, 6], [164, 24, 12, 6], [182, 29, 13, 7], [201, 36, 13, 8]];

// lights: moon · sap (trunk, left limb, right limb) · the four hang points · three landing spots · lava and void windows · two
// mushroom clusters · the glowing branch · the snow and meadow windows. Fruit / sap / landing lights take their colour each frame (anim sets their rgb).
const L_MOON = 0, L_SAP = 1, L_FR = 4, L_LAND = 8, L_LAVA = 11, L_VOID = 12, L_MUSH = 13, L_BR = 15;
let LREF = null, SHK = 1;   // SHK: the moon shaft's strength (fades when leaving)
const heart = (ph) => Math.max(0, 1 - Math.abs(ph - 0.05) / 0.05) + 0.6 * Math.max(0, 1 - Math.abs(ph - 0.17) / 0.05);
X.def('mb_tree', {
  size: [AW, AH], fy: FL, noFrame: 1, amb: [0.17, 0.2],
  paint(S, sc) {
    const G = treeGeo(), r = X.rng(6006); LREF = sc.lights;
    sc.light({ x: 112, y: 14, z: 46, r: 108, i: 0.6, c: '#8ea6ff', tint: 0.3 });
    sc.light({ x: 150, y: 124, z: 28, r: 60, i: 0.7, c: '#40e2c4', tint: 0.4, bake: false });
    sc.light({ x: 122, y: 78, z: 24, r: 42, i: 0.7, c: '#40e2c4', tint: 0.4, bake: false });
    sc.light({ x: 178, y: 78, z: 24, r: 42, i: 0.7, c: '#40e2c4', tint: 0.4, bake: false });
    HANG.forEach(([x, y]) => sc.light({ x, y, z: 18, r: 36, i: 0.75, c: '#ffffff', tint: 0.55, bake: false }));
    HANG.slice(0, 3).forEach(([x]) => sc.light({ x, y: LANDY + 2, z: 12, r: 44, i: 1, c: '#ffffff', tint: 0.4, bake: false }));
    sc.light({ x: 128, y: 140, z: 10, r: 32, i: 0.6, c: '#ff7a30', tint: 0.5, fl: 'fire', ph: 1 });
    sc.light({ x: 172, y: 140, z: 10, r: 32, i: 0.5, c: '#a47cff', tint: 0.5, fl: 'pulse', amp: 0.15, sp: 0.9 });
    sc.light({ x: 68, y: 140, z: 12, r: 30, i: 0.5, c: '#70d8ff', tint: 0.5, fl: 'pulse', amp: 0.2, sp: 1.7 });
    sc.light({ x: 229, y: 141, z: 12, r: 30, i: 0.5, c: '#70d8ff', tint: 0.5, fl: 'pulse', amp: 0.2, sp: 1.5, ph: 2 });
    sc.light({ x: 218, y: 81, z: 16, r: 22, i: 0.35, c: '#ffd890', tint: 0.4, bake: false });
    sc.light({ x: 37, y: 138, z: 10, r: 30, i: 0.45, c: '#9cc8ff', tint: 0.45, fl: 'pulse', amp: 0.06, sp: 1.3 });
    sc.light({ x: 264, y: 137, z: 10, r: 32, i: 0.55, c: '#ffe49a', tint: 0.4, fl: 'pulse', amp: 0.05, sp: 0.7 });
    // ── the cave: faceted rock, darker up high and in the corners ──
    S.lay('wall'); strata(S, 0, 0, AW, FL, 'rock', 3.7, 31);
    S.ao(0, 0, AW, 50, 't', 2.4); S.ao(190, 0, 110, 60, 't', 1.4); S.ao(0, 0, 40, FL, 'l', 1.2); S.ao(AW - 40, 0, 40, FL, 'r', 1.5); S.shadow([[96, 20], [204, 20], [214, 148], [86, 148]], 0.9); S.shadow([[132, 30], [168, 30], [158, 104], [142, 104]], 1.4); S.shadow([[60, 40], [240, 40], [250, 100], [50, 100]], 0.5);
    // glowing lichen on the rock
    for (let k = 0; k < 90; k++) { const x = Math.floor(r() * AW), y = 30 + Math.floor(r() * 112); if (x > 96 && x < 204) continue; if (r() < 0.55) S.px(x, y, 'teal', 4 + r() * 3, { e: 255 }); if (r() < 0.4) S.px(x + 1, y, 'teal', 3.5, { e: 255 }); }
    // the moon hole in the roof, top left: night sky, stars, the moon; its rim lit
    for (let y = 0; y < 26; y++) for (let x = 0; x < 44; x++) { const u = (x + 0.5 - 17) / 20, v = (y + 0.5 - 4) / 15, rim = 1 + 0.16 * Math.sin(Math.atan2(v, u) * 5 + 1) + (vnoise(x / 3, y / 3, 5) - 0.5) * 0.3, d = u * u + v * v;
      if (d > rim * rim) { if (d < (rim + 0.18) ** 2 && y > 2) S.px(x, y, 'rock', 7.5 + (v > 0 ? 1 : 0), { n: [-u * 0.5, -0.6] }); continue; }
      const md = Math.hypot(x + 0.5 - 11, y + 0.5 - 8);
      if (md < 5.5) S.px(x, y, 'linen', 9.4 + (x < 10 && y < 7 ? 1 : 0) - ((x * 3 + y * 5) % 7 === 0 ? 1.4 : 0) - (md > 4.2 ? 0.8 : 0), { e: 255 });
      else if (md < 7) S.px(x, y, 'night', 5, { e: 255 });
      else S.px(x, y, 'night', 2.3 + y / 20 * 1.6, { e: 255 });
      if (md > 7 && hash(x, y, 3) < 0.05) S.px(x, y, 'linen', 8 + hash(x, y, 4) * 2, { e: 255 }); }
    sc.shaft({ x: 18, y0: 16, y1: FL, w0: 5, w1: 16, dx: 106, c: '#a8c0ff', i: 0.42, haze: 0.34, fade: 0.2, f: () => SHK });
    // floor: dark earth, moss, leaf litter, pebbles; darker at the back edge and toward us
    S.rect(0, FL, AW, AH - FL, 'earth', 4.1); S.noise(0, FL, AW, AH - FL, 1, 3, 17);
    for (let k = 0; k < 26; k++) { const x = r() * AW, y = FL + 2 + r() * 24, w = 6 + r() * 16; for (let yy = -2; yy <= 2; yy++) for (let xx = -w; xx <= w; xx++) if ((xx / w) ** 2 + (yy / 2.2) ** 2 < 1 && vnoise((x + xx) / 3, (y + yy) / 2, 9) > 0.45) S.px(x + xx, y + yy, 'moss', 3 + r() * 2.5); }
    for (let k = 0; k < 220; k++) { const x = r() * AW, y = FL + 1 + r() * 26; S.px(x, y, r() < 0.5 ? 'leaf' : 'sand', 3 + r() * 2.8); if (r() < 0.5) S.px(x + 1, y, 'sand', 3 + r() * 2); }
    for (let k = 0; k < 26; k++) { const x = r() * AW, y = FL + 3 + r() * 22, w = 1 + Math.floor(r() * 2); S.hl(x - w, y, w * 2 + 1, 'stone', 4.5); S.hl(x - w + 1, y - 1, w * 2 - 1, 'stone', 6.5); S.hl(x - w, y + 1, w * 2 + 1, 'earth', 1.5); }
    S.ao(0, FL, AW, 5, 't', 1.4); S.ao(0, AH - 9, AW, 9, 'b', 1.8);
    // ── back: stalactites, ceiling roots, far canopy, wall roots, the trunk, the arch roots ──
    S.lay('back');
    [[44, 12], [240, 12], [248, 20], [256, 14]].forEach(([x, L]) => { S.beg(); S.poly([[x - 3, 0], [x + 3, 0], [x + 0.6, L]], 'rock', 2.6); S.poly([[x - 3, 0], [x, 0], [x + 0.4, L]], 'rock', 3.6, { n: [-0.5, 0] }); S.px(x, L - 1, 'rock', 5); S.end(); });
    // root networks spreading over the rock (sap glints in them): the roots reach into every world
    [[10, 100, -0.5, 44, 2], [22, 78, 0.05, 40, 2], [26, 60, -0.7, 30, 2], [14, 128, 0.2, 30, 2], [2, 60, 0.3, 26, 1], [290, 98, -2.6, 44, 2], [278, 76, 3.1, 40, 2], [272, 58, -2.4, 30, 2], [288, 126, 2.9, 30, 2], [298, 56, 2.8, 26, 1], [108, 126, 3.5, 30, 2], [192, 124, -0.35, 30, 2], [56, 110, 2.6, 26, 1], [244, 108, 0.5, 26, 1]].forEach(([x, y, a, L, w], i) => { S.beg(); rootNet(S, x, y, a, L, w, X.rng(900 + i), 2); S.end(); });
    [[8, 0, 30, 0.3], [22, 0, 20, -0.2], [30, 0, 36, 0.4], [252, 0, 40, 0.3], [262, 0, 26, -0.4], [282, 0, 50, 0.2], [292, 0, 30, -0.2]].forEach(([x, y, L, c]) => { S.beg(); for (let k = 0; k < L; k++) { const xx = x + Math.sin(k * 0.12 + c * 5) * c * 4; S.px(xx, y + k, 'wood', 2.5 + (k % 5 === 0 ? 1 : 0)); if (k < L * 0.6) S.px(xx - 1, y + k, 'wood', 4.2); if (k % 7 === 3) S.px(xx + 1, y + k + 1, 'wood', 2); } S.end(); });
    BACKC.forEach(([x, y, rx, ry], i) => clump(S, x, y, rx, ry, 2.5, 100 + i));
    // secondary branches into the crown
    [[[108, 34, 4], [92, 29, 3], [74, 32, 2.2], [62, 38, 1.5]], [[104, 20, 4], [86, 12, 3], [70, 12, 2]], [[117, 50, 3.5], [104, 42, 2.4], [92, 40, 1.6]]].forEach(C => { [C, mir(C)].forEach(C2 => { const T = tube(C2, 2); S.beg(); barkTube(S, T, 4.4, { g: 1, seed: 7 }); S.end(); }); });
    // wall roots climbing the cave into the roof, and the roots that arch over the four worlds
    G.roots.forEach((rt, k) => { if (rt.lay !== 'back') return; S.beg(); barkTube(S, rt.T, 3.9, { g: 2, seed: 20 + k, moss: 1 }); S.end(); });
    // aerial roots hanging from the crown's side lobes, the long ones reaching the floor
    [[44, 55, 56, 0.4], [56, 58, 90, -0.3], [66, 57, 34, 0.5], [234, 57, 36, -0.4], [245, 58, 90, 0.3], [256, 55, 50, -0.5]].forEach(([x, y, L, c]) => { S.beg(); for (let k = 0; k < L; k++) { const xx = x + Math.sin(k * 0.09 + c * 4) * c * 5; S.px(xx, y + k, 'wood', 4.6 + (k % 6 === 0 ? -1 : 0), { n: [-0.6, 0] }); S.px(xx + 1, y + k, 'wood', 2.6, { n: [0.6, 0] }); if (k % 9 === 4) { S.px(xx - 1, y + k + 1, 'wood', 3.4); S.px(xx - 2, y + k + 2, 'wood', 3); } }
      if (y + L >= FL - 1) { S.px(x + Math.sin(L * 0.09 + c * 4) * c * 5 - 1, FL - 1, 'wood', 4); S.px(x + Math.sin(L * 0.09 + c * 4) * c * 5 + 2, FL - 1, 'wood', 3); } S.end(); });
    // the trunk and limbs: grooved bark in plates, moss on the moonlit side, knots
    S.beg();
    for (let p = 0; p < AW * AH; p++) { const k = G.part[p]; if (k < 0 || k > 2) continue; const x = p % AW, y = (p / AW) | 0, u = G.U[p], cu = k === 0 ? u : k === 1 ? (u - 1) / 2 : (u + 1) / 2, sg = k === 0 ? FL - y : G.SV[p] + 29.5;
      const gw = groove(cu, sg) + sg * 0.012, gi = Math.floor(gw), f = gw - gi, nx = G.NX[p], ny = G.NY[p], pl = 6 + hash(gi, 0, 3) * 9, pj = Math.floor(sg / pl + hash(gi, 1, 4)), pt = (hash(gi, pj, 5) - 0.5) * 1.5;
      let tn = 5 + pt + (hash(x, y, 1) - 0.5) * 0.7 + (vnoise(x / 6, y / 9, 2) - 0.5) * 1.1 - (y > 134 ? (y - 134) * 0.07 : 0) - (Math.abs(u) > 0.9 ? 0.7 : 0);
      if (f < 0.15 || (f < 0.24 && hash(gi, pj, 6) < 0.4)) tn = 1.2 + (f < 0.08 ? -0.5 : 0); else if (f < 0.34) tn += 1.1; else if (f > 0.84) tn -= 1.3;
      if (f > 0.2 && frac(sg / pl + hash(gi, 1, 4)) < 0.09) tn -= 1.9;
      // the hollows in the trunk's base: a rounded lip of bark around each opening
      let lip = 0, lnx = 0, lny = 0; if (k === 0) for (let hk = 1; hk <= 2; hk++) { const h = HOL[hk], dx = (x + 0.5 - h.cx) / h.rx, dy = (y + 0.5 - FL) / h.ry, e = Math.sqrt(dx * dx + dy * dy); if (e < 1.42 && y < FL) { lip = e; lnx = dx / e; lny = dy / e; } }
      if (lip) { const q = (lip - 1) / 0.42; S.px(x, y, 'wood', q < 0.18 ? 1.6 : 6 - q * 2.2 + (-lnx - lny) * 0.8 + (hash(x, y, 2) - 0.5) * 0.6, { n: [lnx * 0.8 * (1 - q), lny * 0.8 * (1 - q)] }); continue; }
      const mossy = f > 0.22 && cu < -0.3 && vnoise(x / 5, y / 4, 21) > 0.6 + (cu + 0.3) * 0.4;
      if (mossy) S.px(x, y, 'moss', 2.8 + (-cu) * 1.6 + (hash(x, y, 8) < 0.25 ? 0.8 : 0) + (f < 0.34 ? 0.8 : 0), { n: [nx, ny - 0.2] }); else S.px(x, y, 'wood', tn, { n: [nx, ny] }); }
    S.end();
    S.ao(100, 136, 100, 13, 'b', 1.6);
    KNOTS.forEach(([x, y]) => { for (let yy = -6; yy <= 6; yy++) for (let xx = -7; xx <= 7; xx++) { const d = (xx / 4.6) ** 2 + (yy / 3.2) ** 2, d2 = (xx / 6.8) ** 2 + (yy / 4.8) ** 2;
      if (d < 1) { const lid = Math.abs(yy) <= 0.5 && Math.abs(xx) <= 3.5 - Math.abs(yy); S.px(x + xx, y + yy, 'wood', lid ? 0.8 : d > 0.55 ? (xx * 0.6 + yy < 0 ? 6.6 : 2.6) : 4.6 - yy * 0.6, { n: [xx / 5.5, yy / 3.6] }); }
      else if (d2 < 1 && d2 > 0.7 && hash(xx, yy, x) < 0.75) S.px(x + xx, y + yy, 'wood', yy < 0 ? 2 : 3.2); }
      S.px(x - 4, y - 1, 'wood', 1.2); S.px(x + 4, y - 1, 'wood', 1.2); S.px(x, y + 1, 'wood', 3.2); });
    // a few broken stubs on the limbs
    [[113, 78, -1], [187, 98, 1]].forEach(([x, y, d]) => { S.beg(); S.hcyl(x + (d < 0 ? -4 : 0), y - 2, 5, 4, 'wood', 4.8, { rim: 1.5 }); S.ell(x + d * 5, y, 1.6, 2.2, 'sand', 6.4, { n: [d * 0.7, -0.2] }); S.px(x + d * 5, y, 'sand', 4.4); S.px(x + d * 5, y - 1, 'sand', 7.6); S.end(); });
    // ── mid: the front of the crown, ground roots, mushrooms, ferns ──
    S.lay('mid');
    MIDC.forEach(([x, y, rx, ry], i) => clump(S, x, y, rx, ry, 3.5, 200 + i));
    G.roots.forEach((rt, k) => { if (rt.lay !== 'mid') return; S.beg(); barkTube(S, rt.T, 4, { g: 1.5, seed: 40 + k, moss: 1, clip: (x, y) => G.part[y * AW + x] !== 3 + k }); S.end(); });
    [[64, 148, 6, 5, 8.5], [70, 149, 4, 3, 8], [58, 149, 3, 2, 7.5], [75, 148, 3, 2, 8], [30, 123, 3, 2, 8], [44, 125, 2, 2, 7.5]].forEach(([x, y, h, w, tn]) => mush(S, x, y, h, w, tn, L_MUSH));
    [[226, 148, 7, 5, 8.5], [233, 149, 4, 3, 8], [220, 149, 3, 2, 7.5], [238, 149, 3, 2, 8], [268, 123, 3, 2, 8], [256, 125, 2, 2, 7.5], [133, 128, 2, 2, 7.5], [167, 128, 2, 2, 7.5]].forEach(([x, y, h, w, tn], i) => mush(S, x, y, h, w, tn, i < 6 ? L_MUSH + 1 : L_MUSH));
    S.beg(); barkTube(S, tube(CUTS, 2), 4.4, { g: 1.5, seed: 71 }); S.end();   // the stump of the glowing branch (its tip is anim: it can be cut off)
    fern(S, 84, 149, 11, -1, 4.5); fern(S, 216, 149, 11, 1, 4.5); fern(S, 60, 150, 8, 1, 4); fern(S, 244, 150, 9, -1, 4);
    // ── front: dark framing in the corners ──
    S.lay('front');
    S.beg(); const cr = tube([[-4, 176, 7], [10, 164, 6], [20, 160, 4.5], [30, 164, 3], [34, 172, 2]], 2); barkTube(S, cr, 3, { g: 1.5, seed: 61, moss: 1 }); S.end();
    fern(S, 6, 175, 18, 1, 3.2); fern(S, 294, 175, 17, -1, 3.2);
    // top right: an overhang of rock with roots hanging off it, in front and unlit (a dark frame)
    S.beg(); S.poly([[256, 0], [300, 0], [300, 72], [293, 66], [286, 52], [279, 40], [270, 28], [262, 14]], 'rock', 1.6, { e: 255 });
    for (let y = 0; y < 72; y++) for (let x = 256; x < 300; x++) { if (!S.at(x, y)) continue; const e2 = !S.at(x - 1, y) || !S.at(x, y + 1); S.px(x, y, 'rock', (e2 ? 3.4 : 1.2 + (vnoise(x / 4, y / 3, 71) > 0.55 ? 0.9 : 0) + (hash(x, y, 72) < 0.06 ? -1 : 0)), { e: 255 }); }
    [[266, 22, 22], [274, 34, 30], [281, 44, 16], [290, 58, 34], [297, 66, 18]].forEach(([x, y, L], i) => { for (let k = 0; k < L; k++) { const xx = x + Math.sin(k * 0.15 + i) * 1.3; S.px(xx, y + k, 'wood', 1.4 + (k % 5 === 0 ? 0.8 : 0), { e: 255 }); if (k % 6 === 3) S.px(xx + 1, y + k, 'leaf', 2.2, { e: 255 }); } });
    for (let k = 0; k < 7; k++) S.px(262 + Math.floor(hash(k, 1, 73) * 34), 8 + Math.floor(hash(k, 2, 73) * 50), 'teal', 4.5, { e: 255 });
    S.end({ none: 1 });
    S.beg(); S.ell(288, 170, 14, 8, 'rock', 4, { dome: 1 }); S.noise(274, 162, 28, 16, 1, 2, 63); for (let x = 276; x < 300; x++) if (hash(x, 1, 3) < 0.7) S.px(x, 162 + Math.round(Math.abs(x - 288) * 0.3) - 1, 'moss', 4.5); S.end();
    // ── emitters ──
    sc.emit({ k: 'leaf', x: 150, y: 34, w: 170, h: 12, rate: 0.45, sp: 3, life: 6, floor: FL + 4 });
    sc.emit({ k: 'tspore', x: 67, y: 141, w: 14, h: 4, rate: 1.1, sp: 3, ang: 0, spread: 1, life: 3 });
    sc.emit({ k: 'tspore', x: 229, y: 142, w: 14, h: 4, rate: 1.1, sp: 3, ang: 0, spread: 1, life: 3 });
    sc.emit({ k: 'dust', x: 72, y: 80, w: 44, h: 90, rate: 4, sp: 2, life: 5 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const st = rs.st, G = treeGeo(), fr = o.fruits || [], dim = o.dim || 0, dk = 1 - 0.55 * dim, lk = 1 - 0.85 * dim;
    const sap = o.sap || 0, flare = o.flare || 0, eyes = o.eyes || 0, cut = o.cut || null, tier = o.tier || 0;
    const busy = fr.some(f => f && ((f.ripe || 0) > 0 || (f.fy || 0) > 0 || (f.land != null && f.land >= 0)));
    // ── light: the sap beats upward (lub-dub), turns red under the curse and gold in the legendary payoff ──
    const sapC = eyes > 0.05 ? [255, 64, 52] : flare > 0.05 ? [255, 206, 90] : SAPC, pl = (d) => heart(frac(t * 0.55 - d / 110));
    if (LREF) for (let i = 0; i < 3; i++) LREF[L_SAP + i].rgb = sapC;
    rs.mul[L_SAP] = (0.5 + 0.8 * pl(40) + 2 * sm(sap * 3) + 2.2 * flare + 1.6 * eyes) * lk;
    rs.mul[L_SAP + 1] = rs.mul[L_SAP + 2] = (0.5 + 0.8 * pl(115) + 2 * sm(sap * 2 - 0.6) + 2.2 * flare + 1.6 * eyes) * lk;
    for (let i = L_LAVA; i < L_BR; i++) rs.mul[i] = lk; rs.mul[L_BR + 1] = rs.mul[L_BR + 2] = lk; rs.mul[L_MOON] = 1 - 0.5 * dim; SHK = 1 - 0.8 * dim;
    // ── back: veins, curse eyes, the worlds in the hollows ──
    D.lay('back');
    const fr0 = sap > 0 ? sap * (G.dmax + 14) : -1, red = eyes > 0.05;
    for (let i = 0; i < G.vp.length; i++) { const p = G.vp[i], d = G.vd[i], x = p % AW, y = (p / AW) | 0; let m = 'teal', tn = 3.4 + pl(d) * 5.6 + (hash(x, y, 3) < 0.12 ? 0.8 : 0);
      if (fr0 >= 0) { if (d < fr0 - 7) tn = Math.max(tn, 8.2 + 1.3 * Math.sin(t * 9 - d * 0.35)); else if (d < fr0) tn = 11; }
      if (flare > 0) { m = 'gold'; tn = Math.max(tn * 0.8, 5 + 6 * flare * (0.82 + 0.18 * Math.sin(t * 8 - d * 0.2))); }
      if (red) { m = 'red'; tn = 2.5 + (pl(d) * 3 + 4) * eyes; }
      D.px(x, y, m, tn * dk, E); }
    if (sap > 0 && sap < 1 && R() < 0.5) { const j = Math.floor(R() * G.vp.length), p = G.vp[j]; if (G.vd[j] < fr0 && G.vd[j] > fr0 - 20) rs.burst('tsap', p % AW, (p / AW) | 0, 1, { sp: 4, life: 0.7 }); }
    if (eyes > 0) KNOTS.forEach(([x, y], i) => { const op = sm((eyes - i * 0.1) / 0.35); if (op <= 0) return; const hh = 3.2 * op, look = Math.round(Math.sin(t * 1.7 + i) * 1.4), bl = frac(t / 3.1 + i * 0.23) < 0.04 ? 0.25 : 1;
      for (let yy = -4; yy <= 4; yy++) for (let xx = -6; xx <= 6; xx++) { const ex = xx / 5.2, lid = Math.max(0.35, hh * bl), ey = yy / lid, ok = Math.abs(ey) <= 1 - ex * ex;
        if (!ok) { if (Math.abs(ey) <= 1.6 - ex * ex && op > 0.5) D.px(x + xx, y + yy, 'red', 3.5 + op * 2, E); continue; }
        const dx2 = xx - look, iris = dx2 * dx2 + yy * yy * 1.5 < 6.5, pupil = Math.abs(dx2) < 0.6 && Math.abs(yy) < lid - 0.2;
        if (pupil) D.px(x + xx, y + yy, 'ink', 0); else D.px(x + xx, y + yy, iris ? 'fire' : 'red', iris ? 9 + (dx2 < 0 && yy < 0 ? 2 : 0) : 7.5 + op * 1.5 - Math.abs(ex) * 2, E); }
      D.hl(x - 4, y - Math.ceil(hh * bl) - 1, 9, 'wood', 1.2); D.hl(x - 3, y + Math.ceil(hh * bl) + 1, 7, 'wood', 1); });
    worlds(D, t, dk, st);
    // ── mid: vines, hanging sprigs, fruit branches, auras, bloom, the glowing branch ──
    D.lay('mid');
    const gust = o.tap && o.tap.age < 1 ? Math.exp(-o.tap.age * 3) : 0;
    VINES.forEach(([x, y, L, ph]) => vine(D, x, y, L, ph, t, gust + flare * 0.5));
    SPRIG.forEach(([x, y], j) => { const sw = Math.round(Math.sin(t * 1.1 + x * 0.07) * 0.9 + gust * Math.sin(t * 20 + j)); leaf(D, x + sw, y, Math.PI / 2 + 0.6, 3, 4.6); leaf(D, x + sw + 1, y, Math.PI / 2 - 0.5, 3, 5.2); leaf(D, x + sw, y + 1, Math.PI / 2, 4, 4 + (j % 2)); });
    st.sn = st.sn || []; st.ld = st.ld || []; st.lb = st.lb || [];
    const draws = [];
    for (let i = 0; i < 4; i++) {
      const f = fr[i], hx = f && f.x != null ? f.x : HANG[i][0], hy = f && f.y != null ? f.y : HANG[i][1];
      if (!f) { if (i === 3) { const tip = drawBranch(D, 3, 0, 0, t, sap > 0.85 ? sm((sap - 0.85) / 0.15) : 0); bloomAt(D, tip, o.bloom || 0, t, rs, st); } else drawBranch(D, i, 0, 0, t, 0); rs.mul[L_FR + i] = 0; continue; }
      const k = f.k | 0, grow = f.grow == null ? 1 : f.grow, hov = f.hov || 0, ripe = f.ripe || 0, fy = f.fy || 0, land = f.land == null ? -1 : f.land, q = f.q | 0, beat = f.beat == null ? -1 : f.beat, picked = ripe > 0 || fy > 0 || land >= 0;
      // transitions: a new beat (leaves shake off), the stem snapping, the landing (juice, light, leaves)
      if (beat >= 0 && (st.lb[i] == null || beat < st.lb[i] - 1e-4)) { rs.burst('leaf', hx, hy - 12, 3 + (beat === 0 ? 2 : 0), { sp: 14, ang: 0, spread: 2.4, life: 2.2, floor: FL + 3 }); rs.flash(L_FR + i, 0.9); }
      st.lb[i] = beat >= 0 ? beat : null;
      if (fy > 0 && st.sn[i] == null) { st.sn[i] = t; rs.burst('leaf', hx, hy - 14, 5, { sp: 18, ang: 0, spread: 2.6, life: 2.4, floor: FL + 3 }); rs.burst('glint', hx, hy - 9, 2, { sp: 20, life: 0.4 }); }
      if (fy <= 0 && land < 0) st.sn[i] = null;
      if (land >= 0 && !st.ld[i]) { st.ld[i] = 1; rs.burst('tjuice' + q, hx, FL - 3, 14 + q * 6, { sp: 46 + q * 8, ang: 0, spread: 2.5, life: 0.9, floor: FL + 3 }); rs.burst('glint', hx, FL - 6, 2 + q, { sp: 30, life: 0.5, w: 10 }); rs.burst('leaf', hx, 40, 3 + q, { sp: 6, life: 4, w: 30, floor: FL + 3 }); if (q >= 3) rs.burst('tgleaf', 150, 28, 26, { sp: 12, life: 5.5, w: 180, h: 20, floor: FL + 3 }); else if (q >= 1) rs.burst('leaf', 150, 30, 4 + q * 3, { sp: 8, life: 5, w: 150, h: 14, floor: FL + 3 }); }
      if (land < 0) st.ld[i] = 0;
      // branch: bends under the hover and the ripening weight, whips up when the stem snaps
      const ts = st.sn[i] != null ? t - st.sn[i] : -1, recoil = ts >= 0 ? -3.2 * Math.exp(-ts * 5) * Math.cos(ts * 16) : 0;
      const pop = beat < 0 ? 0 : beat < 0.07 ? -0.16 * Math.sin(beat / 0.07 * Math.PI) : 0.14 * Math.exp(-(beat - 0.07) * 9) * Math.cos((beat - 0.07) * 22);
      const shake = Math.max(hov * 0.5, beat >= 0 && beat < 0.35 ? (0.35 - beat) / 0.35 : 0);
      const bend = ts >= 0 ? recoil : 2.6 * hov + 2.4 * sm(ripe) + (beat >= 0 && beat < 0.2 ? 1 : 0);
      const top = drawBranch(D, i, bend, shake, t, i === 3 && sap > 0.85 ? sm((sap - 0.85) / 0.15) : 0);
      if (i === 3) bloomAt(D, top, o.bloom == null ? 1 : o.bloom, t, rs, st);
      // the fruit
      const sc = grow * (1 + 0.12 * hov + 0.24 * sm(ripe) + pop + (k === 0 ? 0.035 * heart(frac(t * 0.9 + i * 0.3)) : 0)), Rf = FRR * sc;
      const lum = hov * 1.4 + ripe * 1.3 + (busy && !picked ? -2.6 : 0) - 3 * dim;
      let cx, cy, rot = 0, sx = 1, sy = 1, state;
      if (land >= 0) { state = 2; const sq = f.squash != null ? f.squash : land < 0.4 ? Math.max(0, Math.cos(land * 16) * Math.exp(-land * 8)) : 0; sx = 1 + 0.38 * sq; sy = 1 - 0.36 * sq; cx = hx; cy = FL - Rf * sy * (k === 0 ? 1.07 : 0.98); }
      else if (fy > 0) { state = 1; cx = hx; cy = hy + fy; rot = fy * 0.02 * (i % 2 ? 1 : -1); }
      else { state = 0; const Lc = HANG[i][1] - REST[i][1], phi = 0.07 * Math.sin(t * 1.3 + i * 2.1) + shake * 0.12 * Math.sin(t * 31 + i); cx = hx + Math.sin(phi) * Lc; cy = hy + (top[1] - REST[i][1]) + (Math.cos(phi) - 1) * Lc; }
      // stem: from the branch to where it enters the fruit (a broken stub stays behind once it has snapped)
      const sTop = cy + FTOP[k] * Rf * sy;
      if (state === 0) D.line(top[0], Math.round(top[1]), Math.round(cx), Math.round(sTop), 'leaf', 4.2); else { D.px(top[0], top[1] + 1, 'leaf', 4); D.px(top[0], top[1] + 2, 'leaf', 3); }
      if (state === 1) { D.px(cx, sTop - 1, 'leaf', 4); }
      // aura, beat ring (behind), and the light it gives
      if (ripe > 0 && state < 2 && !f.gone) drawAura(D, cx, cy, Rf, q, ripe, t);
      if (beat >= 0 && beat < 0.4 && !f.gone) { const rr = Rf + 2 + beat * 55, m = QM[q]; for (let a = 0; a < TAU; a += 0.7 / rr) D.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, m, 10.5 - beat * 16, E); }
      const fc = FK[k][1], qa = ripe > 0 ? sm(ripe * 1.4) : 0, lc = [0, 1, 2].map(j => Math.round(fc[j] + (QRGB[q][j] - fc[j]) * qa));
      if (LREF) LREF[L_FR + i].rgb = lc;
      rs.mul[L_FR + i] = state === 0 && !f.gone ? (0.8 + 0.12 * Math.sin(t * 2 + i) + hov * 0.7 + ripe * 1.6 + (f.crack || 0) * 1.4 + (beat >= 0 && beat < 0.2 ? 1 - beat * 5 : 0)) * grow * (busy && !picked ? 0.35 : 1) * lk : 0;
      if (state === 1 && !f.gone) rs.dl.push({ x: cx, y: cy, z: 16, r: 30, i: 0.9 * lk });
      draws.push({ i, k, cx, cy, Rf, sx, sy, rot, lum, state, f, q, land, hx, t: t + i });
    }
    // bloom when there is no fourth fruit yet is handled above; landing lights (colour of the omen)
    const lset = [0, 0, 0];
    draws.forEach(d => { if (d.land >= 0) { const j = d.hx < 120 ? 0 : d.hx < 180 ? 1 : 2; lset[j] = 1; if (LREF) LREF[L_LAND + j].rgb = QRGB[d.q]; rs.mul[L_LAND + j] = (0.45 + 1.9 * Math.exp(-d.land * 2.4) + (d.q >= 3 ? 0.4 : 0)) * lk; } });
    for (let j = 0; j < 3; j++) if (!lset[j]) rs.mul[L_LAND + j] = 0;
    // the glowing branch (the blueprint is rolled up inside) and the axe
    const br = cut ? cut.branch || 0 : 0, ax = cut && cut.a != null ? cut.a : -1;
    if (br > 0 || ax >= 0.97) { D.beg(); D.ell(CUT[0], CUT[1], 1.6, 3.2, 'sand', 8); D.px(CUT[0], CUT[1], 'sand', 6); D.end(); }
    rs.mul[L_BR] = (br > 0 ? 0 : 0.8 + 0.25 * Math.sin(t * 2.2)) * lk;
    if (br <= 0) drawCutRest(D, t, 0.6 + 0.4 * Math.sin(t * 2.2));
    // ── front: fruit, splats, the falling branch, the axe, fireflies ──
    D.lay('front');
    draws.forEach(d => {
      const f = d.f, q = d.q;
      if (d.land >= 0) {   // the juice flower on the floor, a shock ring, then a ring of glowing grass
        const la = d.land, m = QM[q], grow2 = Math.min(1, la / 0.12), fade = Math.max(0, la - 0.3) * 2.2;
        for (let j = 0; j < 11; j++) { const a = j * TAU / 11 + hash(j, d.i, 5) * 0.4, Lp = (6 + hash(j, d.i, 6) * 8 + q * 1.5) * grow2, ca = Math.cos(a), sa = Math.sin(a);
          for (let s2 = 1; s2 < Lp; s2 += 0.7) { const x = d.hx + ca * s2 * 1.3, y = FL + 0.5 + sa * s2 * 0.34; if (y < FL - 1) continue; D.px(x, y, m, Math.max(4.5, 10.6 - s2 / Lp * 3 - fade), E); if (s2 < Lp * 0.6) D.px(x, y + 1, m, Math.max(4, 9.4 - s2 / Lp * 3 - fade), E); }
          const tx = d.hx + ca * (Lp + 1.5) * 1.3, ty = FL + 0.5 + sa * (Lp + 1.5) * 0.34; if (ty >= FL - 1) D.px(tx, ty, m, Math.max(4, 10 - fade), E); }
        if (la < 0.42) { const gk = sm(la / 0.1), sh = la > 0.2 ? (la - 0.2) / 0.22 : 0;   // a crown of juice in the picture plane, petals with drops at the tips
          for (let j = 0; j < 9; j++) { const a = -Math.PI + (j + 0.5) * Math.PI / 9 + (hash(j, d.i, 2) - 0.5) * 0.25, Lp = (9 + hash(j, d.i, 3) * 11 + q * 2) * gk, ca = Math.cos(a), sa = Math.sin(a), r0 = d.Rf * 0.8 + Lp * sh;
            for (let s2 = r0; s2 < d.Rf * 0.8 + Lp; s2 += 0.6) { const x = d.hx + ca * s2 * 1.25, y = FL - 3 + sa * s2 * 0.9 + (s2 / (d.Rf + Lp)) ** 2 * 6 * la / 0.42; D.px(x, y, m, 11 - (s2 - r0) * 0.12 - sh * 3, E); if (s2 > d.Rf * 0.8 + Lp - 2.5) D.px(x + 1, y, m, 10 - sh * 3, E); } } }
        if (la < 0.45) { const rr = 6 + la * 95, tn = 11 - la * 16; for (let a = 0; a < TAU; a += 0.8 / rr) { const y = FL + 1 + Math.sin(a) * rr * 0.28; if (y >= FL - 1) D.px(d.hx + Math.cos(a) * rr, y, m, tn, E); } }
        if (la > 0.45) { const gr = sm((la - 0.45) / 0.8), fm = FK[d.k][0]; for (let j = 0; j < 18; j++) { const a = j * TAU / 18 + 0.1, bx = d.hx + Math.cos(a) * 13, by = FL + 1 + Math.sin(a) * 3.4, hh = Math.round(gr * (2 + hash(j, d.i, 9) * 2.6)), sw = Math.sin(t * 2 + j) > 0.6 ? 1 : 0; for (let s2 = 0; s2 < hh; s2++) D.px(bx + (s2 === hh - 1 ? sw : 0), by - s2, fm, 7 + s2 * 1.2, E); } }
      }
      if (f.gone) return;
      if (d.state === 1) { const m = QM[q], L = Math.min(14, (f.fy || 0) * 0.35); for (let s2 = 2; s2 < L; s2 += 1) if (frac(s2 * 0.5) < 0.5) { D.px(d.cx - d.Rf * 0.5, d.cy - d.Rf - s2, m, 9 - s2 * 0.4, E); D.px(d.cx + d.Rf * 0.5, d.cy - d.Rf - s2, m, 9 - s2 * 0.4, E); } }
      drawFruit(D, d.k, d.cx, d.cy, d.Rf, t, { lum: d.lum, sx: d.sx, sy: d.sy, rot: d.rot, ph: d.i * 0.37 });
      if ((f.crack || 0) > 0 && d.state < 2) drawCrack(D, d.cx, d.cy, d.Rf, q, f.crack, t);
    });
    if (br > 0) { const fb = Math.min(1, br / 0.7), y = CUT[1] + (FL - 3 - CUT[1]) * fb * fb, rot = 0.55 * fb + (br >= 0.7 && br < 0.8 ? Math.sin((br - 0.7) * 60) * 0.06 : 0), x = CUT[0] - 6 * fb;
      drawCutPiece(D, x, y, rot, t, br >= 0.8 ? 1 : 0, 1);
      if (br >= 0.7 && !st.bl) { st.bl = 1; rs.burst('tchip', x + 8, FL - 2, 8, { sp: 30, ang: 0, spread: 2, life: 0.8, floor: FL + 2 }); rs.burst('glint', x + 8, FL - 5, 3, { sp: 20, life: 0.5 }); }
      if (br >= 0.9) { const u = sm((br - 0.9) / 0.1), sx = x + 9, sy = FL - 8 - u * 12, w = Math.round(3 + u * 9); D.beg(); D.rect(sx - w, sy - 3, w * 2, 7, 'paper', 8.6, E); D.hl(sx - w, sy - 3, w * 2, 'paper', 10, E); D.vl(sx - w - 1, sy - 4, 9, 'paper', 6.5, E); D.vl(sx + w, sy - 4, 9, 'paper', 6.5, E);
        for (let j = 0; j < w * 2 - 3; j++) { if (j % 3 === 0) D.px(sx - w + 2 + j, sy - 1, 'tile', 6, E); if (j % 4 === 1) D.px(sx - w + 2 + j, sy + 1, 'tile', 6, E); } D.end(); rs.dl.push({ x: sx, y: sy, z: 20, r: 26, i: 0.9 }); } }
    else st.bl = 0;
    if (ax >= 0) { drawAxe(D, ax, t, st.ax); if ((ax >= 0.97 || (cut && cut.hit)) && !st.axh) { st.axh = 1; rs.burst('tchip', CUT[0], CUT[1], 12, { sp: 44, ang: 0.9, spread: 2.4, life: 1, floor: FL + 2 }); rs.burst('leaf', CUT[0] + 12, CUT[1] - 4, 5, { sp: 16, life: 2.4, floor: FL + 3 }); rs.flash(L_BR, 1.8); rs.burst('glint', CUT[0], CUT[1], 2, { sp: 20, life: 0.4 }); } if (ax < 0.9) st.axh = 0; st.ax = ax; } else st.ax = null;
    // fireflies: wandering blinking points (a click on the ground scatters them)
    const tp = o.tap && o.tap.age < 2 ? o.tap : null; if (tp && st.tap !== tp.x + ',' + tp.y) { st.tap = tp.x + ',' + tp.y; rs.burst('leaf', tp.x, 36, 1, { sp: 3, life: 5, floor: FL + 3 }); }
    FIRE.forEach(([bx, by], i) => { let x = bx + Math.sin(t * 0.31 * (1 + (i % 3) * 0.2) + i * 1.7) * 13 + Math.sin(t * 1.1 + i) * 2.5, y = by + Math.sin(t * 0.27 + i * 2.3) * 8 + Math.cos(t * 1.3 + i) * 2;
      if (tp) { const dx = x - tp.x, dy = y - tp.y, dd = Math.hypot(dx, dy) || 1, pu = 26 * Math.exp(-tp.age * 1.6) * (1 - Math.exp(-tp.age * 12)) * Math.max(0, 1 - dd / 90); x += dx / dd * pu; y += dy / dd * pu; }
      const b = Math.sin(t * (1.1 + i * 0.13) + i * 3) * dk; if (b < -0.1) return; D.px(x, y, 'leaf', 9 + 2 * b, E); if (b > 0.55) { D.px(x - 1, y, 'leaf', 7.5, E); D.px(x + 1, y, 'leaf', 7.5, E); D.px(x, y - 1, 'leaf', 7.5, E); D.px(x, y + 1, 'leaf', 7.5, E); } });
    // echo: the result keeps the air busy — leaves, glints, souls, a rain of gold leaves for the best
    if (tier > 0 && R() < 0.1 + tier * 0.1) { const kk = ['leaf', 'glint', 'soul', 'tgleaf'][Math.min(3, tier - 1)]; rs.burst(kk, 70 + R() * 160, kk === 'tgleaf' || kk === 'leaf' ? 24 + R() * 16 : 40 + R() * 90, 1, { sp: 6, life: kk === 'tgleaf' ? 5 : 1.8, floor: FL + 3 }); }
    if (flare > 0.2 && R() < flare * 0.9) rs.burst('tgleaf', 60 + R() * 180, 18 + R() * 26, 1, { sp: 5, life: 5, floor: FL + 3 });
  },
});
// the bud on the twig in the fork: dormant (a closed bud), swelling, flowering, shedding petals; the fruit then grows (fruits[3])
function bloomAt(D, tip, b, t, rs, st) {
  const [x, y] = tip; if (b >= 0.8) { st.pet = 1; return; }
  if (b < 0.3) { const s = 1 + b / 0.3 * 1.5; D.beg(); D.ell(x, y + 2 + s * 0.5, 1 + s * 0.4, 1.4 + s * 0.6, 'leaf', 5.5, { dome: 1 }); D.px(x, y + 3 + s, 'candy', 7 + b * 8, b > 0.1 ? E : undefined); D.px(x - 1, y + 2, 'leaf', 8); D.end(); st.pet = 0; return; }
  const op = sm((b - 0.3) / 0.35), sh = b > 0.65 ? sm((b - 0.65) / 0.15) : 0, rr = 1 + op * 3.2 * (1 - sh * 0.7), cy = y + 4;
  if (b > 0.65 && !st.pet) { st.pet = 1; rs.burst('tpetal', x, cy, 7, { sp: 12, ang: 0, spread: 2.6, life: 2.6, floor: FL + 3 }); }
  D.beg(); for (let j = 0; j < 5; j++) { const a = j * TAU / 5 - Math.PI / 2 + op * 0.4; for (let s = 0.5; s <= rr; s += 0.5) { const w = Math.sin(Math.PI * s / (rr + 0.5)) * 1.2; D.px(x + Math.cos(a) * s, cy + Math.sin(a) * s, 'candy', 9 + (s > rr - 1 ? 1 : 0), E); if (w > 0.8) D.px(x + Math.cos(a + 0.5) * s, cy + Math.sin(a + 0.5) * s, 'candy', 8, E); } }
  D.px(x, cy, 'gold', 10, E); D.px(x + 1, cy, 'gold', 8.5, E); D.end();
  rs.dl.push({ x, y: cy, z: 18, r: 18, i: 0.6 * op });
}
MB.tree = { hang: HANG, landY: LANDY, floor: FL, fruitR: FRR, knots: KNOTS, hollows: HOL.map(h => ({ x: h.cx, rx: h.rx, ry: h.ry, floor: FL })), cut: CUT, axePivot: AXP, branches: BR };
})();
