// ==== mc-pxroom-mini-d.js ====
(function () {
// Pixel stages for the minigames in mc-mini-d.js (docs/design.md §7.5, §10.1): 300×175 art px, one art px = 4 logical px
// (the same pixel size as the battle characters), floor rows from y 148. Painted and lit like the base rooms (M.PXR), so the
// HD-2D renderer can take them as they are. Game state reaches anim() through o: { mg, t } (mg.t is the game clock).
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const q12 = (t) => Math.floor(t * 12 + 1e-6) / 12;             // poses step at 12 fps, like the pixel characters
const steps = (t, per) => ((t % per) + per) % per / per;        // 0…1 phase of a repeating cycle
const W = 300, H = 175, FY = 148;
const art = (wx, wy) => [(wx - 360) / 4, (wy - 110) / 4];       // logical stage point → art px
X.MINI_D = { W, H, FY, art };

// a hanging paper lantern: string, black caps, a glowing ribbed body that follows light li, a gold tassel; sw = sway in px
function lantern(D, x, y, li, sw, big) {
  const bh = big ? 14 : 11, bw = big ? 6 : 5, top = y, cx = x + sw;
  D.beg(); D.line(x, 0, cx, top - 1, 'wood', 3); D.end({ none: 1 });
  D.beg();
  D.rect(cx - bw + 2, top, bw * 2 - 3, 2, 'wood', 2); D.hl(cx - bw + 2, top, bw * 2 - 3, 'gold', 6);
  for (let k = 0; k < bh; k++) { const u = (k + 0.5 - bh / 2) / (bh / 2 + 0.6), w = Math.max(2, Math.round(bw * Math.sqrt(1 - u * u) + 0.4)), rib = k % 3 === 1;
    for (let i = -w; i < w; i++) { const s = Math.abs(i + 0.5) / w; D.px(cx + i, top + 2 + k, 'red', clamp((rib ? 7 : 9) - s * 3.2 + (i === -1 ? 1.2 : 0), 3, 10), { e: li + 1 }); } }
  D.rect(cx - bw + 2, top + 2 + bh, bw * 2 - 3, 2, 'wood', 2); D.hl(cx - bw + 2, top + 3 + bh, bw * 2 - 3, 'gold', 5);
  D.end();
  D.beg(); const ty = top + 4 + bh; D.px(cx, ty, 'gold', 8); for (let k = 1; k < 6; k++) { D.px(cx - 1 + Math.round(sw * 0.2 * k / 5), ty + k, 'gold', 6 - (k > 3 ? 1 : 0)); D.px(cx + Math.round(sw * 0.2 * k / 5), ty + k, 'gold', 7 - (k > 3 ? 1 : 0)); } D.end();
}
// a square-holed coin seen at turn phase a (0 = face on): 7 px across at most
function coin(D, x, y, a, tone, big) {
  const r = big ? 4 : 3, c = Math.cos(a), w = Math.max(0.6, Math.abs(c) * r), edge = Math.abs(c) < 0.3;
  D.beg();
  for (let yy = -r; yy <= r; yy++) for (let xx = -Math.ceil(w); xx <= Math.ceil(w); xx++) {
    const u = xx / (w + 0.35), v = yy / (r + 0.35); if (u * u + v * v > 1) continue;
    const rim = u * u + v * v > 0.45, hole = !edge && Math.abs(xx) <= (Math.abs(c) > 0.7 ? 0 : -1) + 0.5 && Math.abs(yy) < 1;
    if (hole && Math.abs(c) > 0.7) { D.px(x + xx, y + yy, 'ink', 1); continue; }
    D.px(x + xx, y + yy, 'gold', (tone || 8) + (edge ? 1 : rim ? 0 : 1.5) - (v > 0.3 ? 1.5 : 0) + (u < -0.3 && !edge ? 1 : 0), { n: [u * 0.6 * Math.sign(c || 1), v * 0.6] });
  }
  D.end();
}
// a boat-shaped gold ingot (元宝), 11×7
function ingot(D, x, y, tilt) {
  D.beg();
  for (let i = -5; i <= 5; i++) { const lift = Math.round(Math.abs(i) > 3 ? 2 : Math.abs(i) > 2 ? 1 : 0), bot = 2 - (Math.abs(i) > 3 ? 1 : 0), ti = Math.round(i * tilt * 0.12);
    for (let yy = -1 - lift; yy <= bot; yy++) D.px(x + i, y + yy + ti, 'gold', 8 + (yy < 0 ? 1.5 : 0) - (yy >= 1 ? 2 : 0) + (i < -1 ? 0.8 : 0), { n: [i / 8, yy / 3] }); }
  D.ell(x, y - 2 + Math.round(tilt * 0.1), 2.2, 1.8, 'gold', 10, { dome: 1 });
  D.end();
  D.px(x - 1, y - 3, 'gold', 11, { e: 255 });
}
function bomb(D, x, y, t) {
  D.beg(); D.ell(x, y, 4.2, 4.2, 'iron', 4, { dome: 1 }); D.px(x - 2, y - 2, 'iron', 10); D.px(x - 1, y - 3, 'iron', 8); D.rect(x - 1, y - 5, 3, 1, 'iron', 6); D.end();
  D.beg(); D.line(x, y - 6, x + 1, y - 8, 'wood', 6); D.end({ none: 1 });
  const on = Math.floor(t * 20) % 2; D.px(x + 1 + on, y - 9, 'fire', 11, { e: 255 }); D.px(x + 1, y - 9 - on, 'fire', 8, { e: 255 });
}

// ═════════════════════ 招财猫 · the lucky-cat shrine ═════════════════════
// red lacquer hall, a gold torii round a black lacquer altar, lanterns, censers, a coin-print carpet; the cat on its cushion
// is the stage's star: gold porcelain (12-step ramp, lanterns put speculars on it), red markings, a bell that swings, the
// raised paw that beckons (each flick throws a coin up — the rain is its doing), a koban it lifts in fever.
const CAT = { x: 150, head: 57, sh: [163, 82] };
// a round volume with its form painted in (light from the upper left, a darker lower-right rim, a warm core highlight),
// dome normals on top so the lanterns still put speculars on it
function blob(S, cx, cy, rx, ry, m, t, o) {
  o = o || {}; const k = o.k == null ? 1.6 : o.k;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x + 0.5 - cx) / (rx + 0.01), v = (y + 0.5 - cy) / (ry + 0.01), d = u * u + v * v; if (d > 1 || (o.clipY != null && y > o.clipY)) continue;
    let tt = t - k * (u * 0.45 + v * 0.8); if (d > 0.72 && u + v > 0.2) tt -= 1.1; const hx = u + 0.42, hy = v + 0.5; if (hx * hx + hy * hy < 0.05) tt += 1.6; else if (hx * hx + hy * hy < 0.14) tt += 0.7;
    S.px(x, y, m, tt, { n: [u * 0.85, v * 0.85] });
  }
}
// a tapered capsule (arms, tails) shaded as one volume: light from the upper left across its width, darker toward the far end
function capsule(S, x0, y0, x1, y1, r0, r1, m, t, o) {
  o = o || {}; const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, nxp = -dy / Math.sqrt(L2), nyp = dx / Math.sqrt(L2), rm = Math.max(r0, r1);
  for (let y = Math.floor(Math.min(y0, y1) - rm); y <= Math.ceil(Math.max(y0, y1) + rm); y++) for (let x = Math.floor(Math.min(x0, x1) - rm); x <= Math.ceil(Math.max(x0, x1) + rm); x++) {
    const px = x + 0.5, py = y + 0.5, q = clamp(((px - x0) * dx + (py - y0) * dy) / L2, 0, 1), cx = x0 + dx * q, cy = y0 + dy * q, r = r0 + (r1 - r0) * q, ex = px - cx, ey = py - cy, d = Math.hypot(ex, ey);
    if (d > r) continue; const u = ex / r, v = ey / r, side = (ex * nxp + ey * nyp) / r;
    let tt = t - 1.5 * (u * 0.5 + v * 0.7) - (o.fall || 0) * q; if (d > r * 0.78 && u + v > 0.1) tt -= 1; if (Math.abs(side + 0.45) < 0.2 && d < r * 0.8) tt += 0.8;
    S.px(x, y, m, tt, { n: [u * 0.8, v * 0.8] });
  }
}
function catBody(S) {
  S.lay('mid');
  // body, haunches and the lighter chest; the seat sits flat in the cushion's shadow
  S.beg(); blob(S, 150, 90, 18, 14, 'gold', 5.8); blob(S, 137, 96, 8.5, 6.5, 'gold', 5.6); blob(S, 163, 96, 8.5, 6.5, 'gold', 5.2); blob(S, 150, 91, 9.5, 9.5, 'gold', 7.2, { k: 1.2 }); S.end();
  for (let x = 127; x <= 173; x++) for (let y = 101; y <= 104; y++) if (S.at(x, y)) S.px(x, y, 'gold', 4, { n: [0, 0.6] });
  // red flame markings (haunches, flank) like the lacquered figurines
  const flameMark = (x, y, s, big) => { const pts = big ? [[0, 0], [1, -1], [2, -2], [3, -2], [4, -1], [4, 0], [3, 1], [2, 1], [1, 2], [2, 3], [3, 3], [0, 1], [0, 2]] : [[0, 0], [1, -1], [2, -1], [3, 0], [2, 1], [1, 1], [0, 2]]; pts.forEach(([dx, dy], i) => S.px(x + dx * s, y + dy, 'red', 6.5 - (dy > 1 ? 1 : 0) + (i < 2 ? 1 : 0))); };
  flameMark(131, 95, 1, 1); flameMark(169, 95, -1, 1); flameMark(158, 83, -1, 0);
  S.beg(); blob(S, 144, 101, 4, 2.6, 'gold', 6.8); S.end(); S.beg(); blob(S, 156, 101, 4, 2.6, 'gold', 6.4); S.end();
  [142.5, 145.5, 154.5, 157.5].forEach(x => { S.px(x, 102, 'gold', 3.5); S.px(x, 103, 'gold', 3); });
  // ears, then the head over their roots
  [[1], [-1]].forEach(([s]) => {
    S.beg(); S.poly([[150 - s * 19, 52], [150 - s * 17, 32], [150 - s * 5, 44]], 'gold', s > 0 ? 7.4 : 6.2, { n: [-s * 0.45, -0.6] }); S.end();
    S.poly([[150 - s * 16.5, 48], [150 - s * 16, 37], [150 - s * 8.5, 45]], 'candy', s > 0 ? 6 : 5, { n: [0, -0.3] }); S.px(150 - s * 16, 39, 'candy', 8); S.px(150 - s * 15, 42, 'candy', 7);
  });
  S.beg(); blob(S, 150, 57, 21, 15.5, 'gold', 6.6, { k: 1.4 }); blob(S, 138.5, 65.5, 7.5, 5, 'gold', 7, { k: 1 }); blob(S, 161.5, 65.5, 7.5, 5, 'gold', 6.4, { k: 1 }); S.end();
  // painted accents: forehead stripes, red side splashes, cheek blush, nose, whiskers
  [[146, 3], [150, 4], [154, 3]].forEach(([x, h], i) => { for (let k = 0; k < h; k++) S.px(x, 45 + k + (i === 1 ? 0 : 1), 'red', 7 - k * 0.6); });
  [[131, 55, 1], [169, 55, -1]].forEach(([x, y, s]) => { S.px(x, y, 'red', 6); S.px(x, y + 1, 'red', 6); S.px(x + s, y + 2, 'red', 5); S.px(x + s, y - 1, 'red', 7); S.px(x + 2 * s, y - 1, 'red', 6); });
  S.rect(136, 63, 5, 2, 'red', 7.2); S.px(137, 62, 'red', 8); S.rect(160, 63, 5, 2, 'red', 7); S.px(163, 62, 'red', 7.5);
  S.px(149, 61, 'candy', 7); S.px(150, 61, 'candy', 8.5); S.px(151, 61, 'candy', 7); S.px(150, 62, 'candy', 5);
  [[-1, 135], [1, 165]].forEach(([s, x0]) => { S.line(x0, 62, x0 + s * 8, 60, 'gold', 3.2); S.line(x0, 64, x0 + s * 9, 64, 'gold', 3.2); S.line(x0, 66, x0 + s * 8, 68, 'gold', 3.2); });
  // collar under the chin: a red band that dips in the middle, gold studs
  S.beg(); for (let x = 134; x <= 166; x++) { const y = 71 + Math.round(3 - ((x - 150) / 16) ** 2 * 3); S.px(x, y, 'red', 8.6, { n: [0, -0.6] }); S.px(x, y + 1, 'red', 7); S.px(x, y + 2, 'red', 5.6); S.px(x, y + 3, 'red', 3.8, { n: [0, 0.6] }); if ((x - 134) % 5 === 2) { S.px(x, y + 1, 'gold', 9.5); S.px(x, y + 2, 'gold', 6); } } S.end();
}
// the live parts: tail (back), koban arm, beckoning arm, eyes, mouth, bell
// c: { paw 0 palm out … 1 folded, arm 0 rest … 1 flicked up, eyes 0 closed / 1 open, bell swing, flinch, koban lift 0…1, fever }
function catLive(D, t, c) {
  const tq = q12(t);
  D.lay('back'); D.beg(); const sw = Math.sin(tq * 2.2) * (c.fever ? 2 : 1);
  const tp = (q) => [168 + q * 9 + Math.sin(q * 2) * 1.5 + sw * q * q, 99 - q * 15 - q * q * 3];
  for (let k = 0; k < 6; k++) { const a = tp(k / 6), b = tp((k + 1) / 6); capsule(D, a[0], a[1], b[0], b[1], 2.8 - k * 0.25, 2.8 - (k + 1) * 0.25, k >= 4 ? 'red' : 'gold', k >= 4 ? 6.5 : 6.2); }
  D.end();
  D.lay('mid');
  // koban arm: hugs a big gold coin to the chest; in fever lifts it high and shakes it
  const kl = c.koban || 0, kx = 139 - Math.round(kl * 15), ky = 88 - Math.round(kl * 16 + (c.fever ? Math.abs(Math.sin(tq * 14)) * 2 : 0));
  D.beg(); for (let y = -10; y <= 10; y++) for (let x = -7; x <= 7; x++) { const u = x / 7.4, v = y / 10.4, d = u * u + v * v; if (d > 1) continue; const rim = d > 0.62 && d < 0.8; D.px(kx + x, ky + y, 'gold', (rim ? 5.5 : 8.6 - v * 1.2 - u * 0.6) + (Math.abs(y) % 3 === 0 && !rim && d < 0.6 ? -0.9 : 0), { n: [u * 0.3, v * 0.3] }); } D.end();
  D.rect(kx - 2, ky - 3, 5, 6, 'red', 5.5); D.px(kx - 1, ky - 2, 'red', 8.5); D.px(kx + 1, ky - 2, 'red', 8); D.px(kx, ky - 1, 'red', 9); D.px(kx, ky, 'red', 8); D.px(kx - 1, ky + 1, 'red', 8.5); D.px(kx + 1, ky + 1, 'red', 9); D.hl(kx - 1, ky + 2, 3, 'red', 7);
  D.px(kx - 4, ky - 7, 'gold', 11, { e: 255 }); D.px(kx - 5, ky - 6, 'gold', 9, { e: 255 });
  D.beg(); blob(D, kx + 5, ky + 4 - Math.round(kl * 2), 4.2, 5, 'gold', 6.8, { k: 1.2 }); D.px(kx + 3, ky + 8 - Math.round(kl * 2), 'gold', 4); D.px(kx + 5, ky + 8 - Math.round(kl * 2), 'gold', 4); D.end();
  // the beckoning arm: a short chubby arm, paw beside the face; the paw folds forward at the wrist
  const aa = 0.12 + (c.arm || 0) * 0.2, wx = CAT.sh[0] + Math.round(Math.sin(aa) * 16 + 3), wy = CAT.sh[1] - Math.round(Math.cos(aa) * 16);
  D.beg(); capsule(D, CAT.sh[0], CAT.sh[1], wx, wy, 5.6, 4.6, 'gold', 6.4); D.end();
  const pf = clamp(c.paw || 0, 0, 1), ph = Math.round(10 - pf * 4), pcx = wx - Math.round(pf * 2), pcy = wy - Math.round(ph / 2) + Math.round(pf * 3);
  D.beg(); blob(D, pcx, pcy, 5.4, ph / 2 + 0.5, 'gold', 7.4, { k: 1.2 }); D.end();
  if (pf < 0.5) { blob(D, pcx, pcy + 1.5, 2.2, 1.7, 'candy', 7.5, { k: 0.6 }); [[-3, -2], [-1, -3.5], [1, -3.5], [3, -2]].forEach(([dx, dy]) => D.px(pcx + dx, pcy + dy, 'candy', 8)); D.px(pcx - 3, pcy - 4, 'gold', 11, { e: 255 }); }
  else { [-2, 0, 2].forEach(dx => D.px(pcx + dx, pcy - Math.floor(ph / 2) + 1, 'gold', 4.5)); D.hl(pcx - 3, pcy + 1, 7, 'gold', 6.5); }
  // face: happy-closed ∩ with a lash flick, wide gold eyes in fever, >< when a bomb goes off; ω mouth, open in fever
  const ey = 56;
  [[142, -1], [158, 1]].forEach(([ex, s]) => {
    if (c.flinch) { for (let k = -2; k <= 2; k++) D.px(ex - s * (2 - Math.abs(k)), ey + k, 'ink', 1); }
    else if (c.eyes >= 1) { D.ell(ex, ey, 2.8, 3.3, 'ink', 1); D.rect(ex - 1, ey - 2, 3, 5, 'gold', 9.5, { e: 255 }); D.vl(ex, ey - 2, 5, 'ink', 0); D.px(ex - 1, ey - 2, 'bone', 10, { e: 255 }); D.px(ex + 1, ey + 2, 'gold', 7, { e: 255 }); }
    else { [[-3, 1], [-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [3, 1]].forEach(([dx, dy]) => D.px(ex + dx, ey + dy, 'ink', 1)); D.px(ex + s * 4, ey - 1, 'ink', 1); }
  });
  if (c.eyes >= 1 && !c.flinch) { D.rect(147, 64, 7, 3, 'red', 2.5); D.hl(148, 66, 5, 'candy', 6); D.px(147, 64, 'ink', 1); D.px(153, 64, 'ink', 1); }
  else { [[147, 64], [148, 65], [149, 65], [150, 64], [151, 65], [152, 65], [153, 64]].forEach(([x, y]) => D.px(x, y, 'ink', 1.5)); }
  if (c.flinch) { D.px(172, 46, 'ice', 10, { e: 255 }); D.px(172, 47, 'ice', 9, { e: 255 }); D.px(171, 48, 'ice', 8, { e: 255 }); D.px(173, 48, 'ice', 7, { e: 255 }); }
  // the bell: swings on the collar, a slit, a hot highlight
  const ba = Math.sin(tq * 9) * (c.bell || 0.15), bx = 150 + Math.round(Math.sin(ba) * 3), by = 79 + Math.round((1 - Math.cos(ba)) * 1);
  D.beg(); blob(D, bx, by, 3.8, 3.6, 'gold', 7.2, { k: 1.8 }); D.hl(bx - 3, by, 7, 'gold', 4.5); D.px(bx, by + 2, 'ink', 1); D.px(bx, by + 1, 'gold', 3); D.end();
  D.px(bx - 1, by - 2, 'bone', 10, { e: 255 });
}
X.def('mini_cat', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.3, 0.3],
  paint(S, sc) {
    sc.light({ x: 150, y: 60, z: 10, r: 74, i: 0.55, c: '#ffcf60', fl: 'pulse', amp: 0.06, sp: 1.6, tint: 0.35 });   // 0 the halo behind the cat
    [[26, 34], [58, 40], [242, 40], [274, 34]].forEach(([x, y], i) => sc.light({ x, y: y + 8, z: 20, r: 62, i: 0.85, c: '#ff7a48', fl: 'candle', ph: i * 1.7, tint: 0.5 }));   // 1–4 lanterns
    [[78, 118], [222, 118]].forEach(([x, y], i) => sc.light({ x, y, z: 16, r: 26, i: 0.45, c: '#ff9a40', fl: 'fire', ph: i * 2, tint: 0.4 }));   // 5–6 censer embers
    sc.light({ x: 150, y: 18, z: 44, r: 118, i: 0.42, c: '#fff0c8', tint: 0.15 });   // 7 the spot from the roof on the altar
    sc.light({ x: 150, y: 150, z: 30, r: 90, i: 0.3, c: '#ffd070', tint: 0.3 });     // 8 coin glow off the carpet (kicked on catches)
    // ── wall: red lacquer, a gold key-fret frieze, framed panels with cloud scrolls, a black dado printed with coins ──
    S.lay('wall');
    S.rect(0, 0, W, FY, 'red', 3); S.noise(0, 14, W, 112, 0.6, 5, 11, { only: 'red' });
    S.rect(0, 0, W, 9, 'wood', 2); for (let x = 3; x < W; x += 12) { S.px(x, 6, 'gold', 7); S.px(x + 1, 7, 'gold', 4); } S.hl(0, 8, W, 'wood', 1);
    S.rect(0, 9, W, 6, 'red', 2);
    for (let x = 0; x < W; x += 8) { S.hl(x, 10, 6, 'gold', 5); S.vl(x + 5, 10, 4, 'gold', 5); S.hl(x + 2, 13, 4, 'gold', 4); S.vl(x + 2, 11, 2, 'gold', 4); S.px(x + 3, 11, 'gold', 4); }
    S.hl(0, 15, W, 'gold', 7, { n: [0, -0.7] }); S.hl(0, 16, W, 'gold', 3);
    const panel = (x0, x1, y0, y1) => {
      S.rect(x0, y0, x1 - x0, y1 - y0, 'red', 4); S.noise(x0, y0, x1 - x0, y1 - y0, 0.5, 4, x0, { only: 'red' });
      S.hl(x0, y0, x1 - x0, 'gold', 6, { n: [0, -0.6] }); S.vl(x0, y0, y1 - y0, 'gold', 6, { n: [-0.6, 0] }); S.hl(x0, y1 - 1, x1 - x0, 'gold', 3); S.vl(x1 - 1, y0, y1 - y0, 'gold', 3);
      S.hl(x0 + 2, y0 + 2, x1 - x0 - 4, 'red', 6); S.vl(x0 + 2, y0 + 2, y1 - y0 - 4, 'red', 6); S.hl(x0 + 2, y1 - 3, x1 - x0 - 4, 'red', 2); S.vl(x1 - 3, y0 + 2, y1 - y0 - 4, 'red', 2);
      for (let y = y0 + 4; y < y1 - 4; y++) for (let x = x0 + 4; x < x1 - 4; x++) if (((x - y + 400) % 8 === 0) || ((x + y) % 8 === 0)) S.px(x, y, 'red', 4.6);
      const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2); S.ell(cx, cy, 8, 8, 'red', 3.2); S.ell(cx, cy, 7, 7, 'gold', 5.5, { ring: 1 }); S.ell(cx, cy, 4, 4, 'gold', 4, { ring: 1 }); S.rect(cx - 1, cy - 1, 3, 3, 'red', 1.5); S.px(cx - 5, cy - 5, 'gold', 8);
      [[x0 + 4, y0 + 4, 1, 1], [x1 - 5, y0 + 4, -1, 1], [x0 + 4, y1 - 5, 1, -1], [x1 - 5, y1 - 5, -1, -1]].forEach(([x, y, sx, sy]) => { S.hl(Math.min(x, x + sx * 4), y, 5, 'gold', 5); S.vl(x, Math.min(y, y + sy * 4), 5, 'gold', 5); S.px(x + sx, y + sy, 'gold', 6); });
    };
    panel(16, 54, 22, 124); panel(58, 94, 22, 124); panel(206, 242, 22, 124); panel(246, 284, 22, 124);
    // the niche behind the cat: darker, with a gold sunburst halo that glows with light 0
    S.rect(104, 36, 92, 94, 'red', 1.6); S.ao(104, 36, 92, 20, 't', 1.5);
    for (let y = 26; y <= 94; y++) for (let x = 116; x <= 184; x++) { const dx = x + 0.5 - 150, dy = y + 0.5 - 60, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d > 32) continue; if (d > 29.5) { S.px(x, y, 'gold', d > 31 ? 5 : 7.5, { e: 1 }); continue; } if (d > 28.5) { S.px(x, y, 'gold', 3); continue; }
      const ray = Math.cos(a * 16) > 0.6; S.px(x, y, 'gold', ray ? 3.4 - d / 40 : 2.4, { e: 1 }); }
    // dado: black lacquer with a gold rim and a row of coin prints
    S.rect(0, 126, W, 22, 'wood', 1.4); S.hl(0, 126, W, 'gold', 7, { n: [0, -0.7] }); S.hl(0, 127, W, 'gold', 3); S.hl(0, 146, W, 'wood', 0.5);
    for (let x = 8; x < W; x += 16) { S.ell(x, 137, 4, 4, 'gold', 4, { ring: 1 }); S.rect(x - 1, 136, 3, 3, 'wood', 1); S.px(x - 2, 134, 'gold', 6); }
    // carpet: red with gold borders and a diamond lattice (floor rows lie flat and recede)
    S.rect(0, FY, W, H - FY, 'red', 4.4);
    for (let y = FY; y < H; y++) for (let x = 0; x < W; x++) { const yy = y - FY; if (yy === 2 || yy === 24) { S.px(x, y, 'gold', 5.5); continue; } if (yy === 3 || yy === 25) { S.px(x, y, 'red', 2.5); continue; }
      if (yy > 4 && yy < 23) { const m = Math.abs(((x + 8) % 16) - 8) + Math.abs(yy - 13.5); if (Math.round(m) === 7) S.px(x, y, 'gold', 4.2); else if (Math.round(m) === 2) S.px(x, y, 'red', 6); } }
    // ── torii: two lacquer pillars, the tie beam, a black top beam with swept ends, a coin plaque ──
    S.lay('back');
    [94, 197].forEach(x => { S.beg(); S.cyl(x, 28, 9, 120, 'red', 6.5, { rim: 2.5 }); S.cyl(x - 1, 42, 11, 3, 'gold', 7, { rim: 2 }); S.cyl(x - 2, 138, 13, 10, 'gold', 6.5, { rim: 2.5 }); S.hl(x - 2, 138, 13, 'gold', 9); S.end(); S.ao(x, 110, 9, 28, 'b', 0.8); });
    S.beg(); S.box(84, 30, 132, 5, 'red', 6.5, { top: 1 }); S.end();
    S.beg(); S.box(80, 21, 140, 5, 'red', 6, { top: 1 }); S.poly([[72, 20], [228, 20], [233, 14], [226, 17], [74, 17], [67, 14]], 'wood', 2.2, { n: [0, -0.5] }); S.hl(74, 17, 152, 'wood', 5); S.px(68, 14, 'gold', 8); S.px(232, 14, 'gold', 8); S.end();
    S.beg(); S.box(142, 24, 16, 11, 'wood', 1.6); S.hl(143, 25, 14, 'gold', 7); S.hl(143, 33, 14, 'gold', 4); S.vl(143, 25, 9, 'gold', 6); S.vl(156, 25, 9, 'gold', 4); S.ell(150, 29.5, 3, 3, 'gold', 8, { ring: 1 }); S.px(150, 29, 'wood', 1); S.end();
    // cushion and altar
    S.beg(); S.box(120, 101, 60, 5, 'crimson', 7, { top: 2 }); S.hl(121, 99, 58, 'crimson', 9); [[120, 106], [179, 106]].forEach(([x, y]) => { S.px(x, y, 'gold', 8); S.px(x, y + 1, 'gold', 6); S.px(x, y + 2, 'gold', 5); }); S.end();
    S.beg(); S.box(108, 108, 84, 23, 'wood', 1.8, { top: 2 }); S.hl(108, 106, 84, 'wood', 5, { n: [0, -0.9] });
    S.hl(110, 111, 80, 'gold', 7); S.hl(110, 128, 80, 'gold', 4); S.vl(110, 111, 18, 'gold', 6); S.vl(189, 111, 18, 'gold', 4);
    for (let x = 114; x < 186; x += 8) { S.hl(x, 114, 6, 'gold', 5); S.vl(x + 5, 114, 4, 'gold', 5); S.hl(x + 2, 117, 4, 'gold', 4); S.vl(x + 2, 115, 2, 'gold', 4); }
    S.ell(150, 123, 5, 4, 'gold', 7, { ring: 1 }); S.rect(149, 122, 3, 3, 'wood', 1); S.px(147, 120, 'gold', 10); S.end();
    S.beg(); S.box(96, 131, 108, 17, 'wood', 2.6, { top: 2 }); S.hl(96, 129, 108, 'wood', 6, { n: [0, -0.9] }); S.hl(97, 133, 106, 'gold', 5); S.end();
    // censers: bronze bowls on legs, glowing coals
    [78, 222].forEach(x => { S.lay('mid'); S.beg(); S.line(x - 5, 130, x - 7, 146, 'copper', 4); S.line(x + 5, 130, x + 7, 146, 'copper', 3); S.line(x, 131, x, 146, 'copper', 5);
      S.ell(x, 126, 8, 5, 'copper', 6, { dome: 1 }); S.rect(x - 8, 121, 17, 2, 'copper', 8, { n: [0, -0.7] }); S.ell(x, 121, 6, 1, 'fire', 7, { e: 5 + (x > 150 ? 1 : 0) + 1 }); S.px(x - 6, 124, 'copper', 10); S.end(); });
    sc.emit({ k: 'steam', x: 78, y: 116, w: 3, rate: 1.3, sp: 4, ang: 0, spread: 0.9, life: 4.2 });
    sc.emit({ k: 'steam', x: 222, y: 116, w: 3, rate: 1.3, sp: 4, ang: 0, spread: 0.9, life: 4.2 });
    sc.emit({ k: 'dust', x: 150, y: 70, w: 110, h: 90, rate: 5, sp: 3, life: 3 });
    // side pillars, closest to the eye
    S.lay('front'); [[0, 12], [288, 12]].forEach(([x, w]) => { S.beg(); S.cyl(x, 0, w, FY, 'red', 5, { rim: 2 }); [30, 88, 138].forEach(y => { S.cyl(x, y, w, 3, 'gold', 7, { rim: 2 }); }); S.end(); });
    catBody(S);
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, st = rs.st, T = o && o.t != null ? o.t : t, sh = mg.sh || {}, fev = !!sh.fever, rain = mg.phase === 'rain', L = M.MK && M.MK.lampFx;
    // lanterns sway on their strings
    [[26, 34], [58, 40], [242, 40], [274, 34]].forEach(([x, y], i) => { D.lay('front'); lantern(D, x, y, 1 + i, Math.round(Math.sin(T * 1.3 + i * 1.9) * (fev ? 2 : 1)), i === 0 || i === 3); });
    // marquee bulbs along the altar lip and the frieze: chase faster when the show is tense, flash the prize colour
    const sp = L && L.sp ? L.sp : 1, strobe = L && L.strobe ? Math.floor(T * 6) % 2 : -1;
    D.lay('back'); for (let i = 0; i < 14; i++) { const x = 111 + i * 6, on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(T * 6 * sp) + i) % 3 === 0; D.px(x, 107, 'lamp', on ? 11 : 4, { e: 255 }); if (on) D.px(x, 106, 'lamp', 8, { e: 255 }); }
    // the heap of offerings grows with what you catch
    const heap = clamp(2 + (mg.sum || 0) * 0.3, 2, 16); D.lay('mid');
    [[116, -1], [184, 1]].forEach(([hx, s]) => { D.beg(); const hw = 8 + heap * 0.5;
      for (let yy = 0; yy < heap; yy++) { const w = Math.round(hw * Math.sqrt(1 - (yy / heap) ** 1.6)); for (let xx = -w; xx <= w; xx++) { const g = ((xx * 3 + yy * 5 + 99) % 7), tn = 7 + (g === 0 ? 2.5 : g === 3 ? -2 : 0) + (yy === Math.floor(heap) - 1 ? 1 : 0); D.px(hx + xx, 130 - yy, 'gold', tn, { n: [xx / (w + 1) * 0.6, -0.5] }); } }
      D.end(); if (heap > 6) ingot(D, hx - s * 2, 130 - Math.floor(heap) - 1, s); });
    // the cat
    const tq = q12(T), flick = mg.flickT != null ? T - mg.flickT : 9, per = rain ? (fev ? 0.26 : 0.42) : 1.25, bp = steps(tq, per);
    let paw = bp < 0.45 ? Math.sin(bp / 0.45 * Math.PI) : 0; if (flick < 0.2) paw = 1 - flick / 0.2;
    const joy = mg.joyT != null && T - mg.joyT < 1.8, bow = mg.phase === 'bow', hot = fev || joy;
    const c = { paw: bow ? 0.3 : paw, arm: rain ? (flick < 0.12 ? 1 : 0.4) : 0, eyes: hot ? 1 : 0, bell: bow || hot ? 0.6 : (mg.pop || 0) * 0.5 + 0.12, flinch: (mg.boom || 0) > 0.2, koban: hot ? 1 : 0, fever: hot };
    catLive(D, T, c);
    // in fever the halo turns: gold rays sweep round behind the cat
    if (hot) { D.lay('wall'); const a0 = T * 1.6; for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4; for (let r = 33; r < 70; r++) { const x = Math.round(150 + Math.cos(a) * r), y = Math.round(60 + Math.sin(a) * r * 0.9); if (y < 16 || y > 128) continue; D.px(x, y, 'gold', 9.5 - r / 14, { e: 255 }); D.px(x + 1, y, 'gold', 8 - r / 14, { e: 255 }); } } rs.flash(0, 0.25); }
    // coins thrown up by the paw (they leave the top of the stage; the rain comes down elsewhere)
    D.lay('front'); (mg.ups || []).forEach(u => { const k = T - u.t; if (k < 0 || k > 0.6) return; coin(D, u.x + k * u.vx, u.y - k * 150 + k * k * 60, T * 14 + u.x, 9); });
    // the rain: coins spin, ingots rock and glint, bombs spark (their fuses light what is near)
    (mg.items || []).forEach(it => { const [ax, ay] = art(it.x, it.y); if (ay > H + 6) return;
      if (it.k === 'coin') coin(D, ax, ay, it.rot, 8, 1);
      else if (it.k === 'bar') { ingot(D, ax, ay, Math.sin(it.rot) * 3); if ((Math.floor(T * 8) + Math.round(ax)) % 9 === 0) rs.burst('glint', ax + 3, ay - 3, 1, { sp: 0, life: 0.3 }); }
      else { bomb(D, ax, ay, T); rs.dl.push({ x: ax + 2, y: ay - 9, z: 12, r: 12, i: 0.7, rgb: [255, 150, 60], tint: 0.5 }); if (Math.floor(T * 30) % 3 === 0) rs.burst('spark', ax + 2, ay - 9, 1, { sp: 14, ang: 0, spread: 1.6, life: 0.3 }); } });
    // coins knocked out of the tray, rolling on the carpet
    (mg.spill || []).forEach(p => { if (p.a > 0) coin(D, p.x, p.y, p.r, 7); });
  },
});
})();
