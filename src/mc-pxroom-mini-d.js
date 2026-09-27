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
const MD = X.MINI_D = { W, H, FY, art };
// draw a def at 4× onto the stage (whole stage by default; ax / ay = its top-left in art px); returns the slot (flash, burst)
MD.draw = function (x, key, t, o, ax, ay) {
  const d = X.defs[key]; if (!d) return null; const id = 'mini_' + key; X.pixels(key, t, o || {}, id); const s = X.slots[id]; if (!s || !s.cx) return s; s.cx.putImageData(s.img, 0, 0);
  const w = d.size ? d.size[0] : 150, h = d.size ? d.size[1] : 105, sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false;
  x.drawImage(s.cv, 0, 0, w, h, 360 + (ax || 0) * 4, 110 + (ay || 0) * 4, w * 4, h * 4); x.imageSmoothingEnabled = sm; return s;
};
MD.slot = (key) => X.slots['mini_' + key];
// a pixel-cast character standing with its feet at logical (lx, ly), 4× like the stage; st: idle / move / attack / hurt …, fi 12 fps frame
MD.cast = function (x, key, lx, ly, st, fi, flip, tint, clipY) {
  const P = M.PCDG; if (!P || !P.has(key)) return null; const c = P.bodyFrame(key, st || 'idle', fi || 0, tint || null, 4); if (!c) return null;
  x.save(); x.imageSmoothingEnabled = false; if (clipY != null) { x.beginPath(); x.rect(0, 0, 1920, clipY); x.clip(); }
  x.translate(Math.round(lx / 4) * 4, Math.round(ly / 4) * 4); if (flip) x.scale(-1, 1); x.drawImage(c, -c.cx, -c.footY, c.width, c.height); x.restore(); return c;
};
MD.frames = (key, st) => { const P = M.PCDG, b = P && P.has(key) ? P.body(key) : null; return !b ? 8 : st === 'idle' ? b.nIdle : st === 'hurt' ? b.nHurt : Math.max(1, Math.round((b.dur[{ move: 1, attack: 2, charge: 3, cast: 4, recover: 5, hurt: 6, death: 7 }[st] || 0] || 0.75) * 12)); };

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
// a small torch / candle flame (s px tall), flickering, glowing
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
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

// ═════════════════════ 地下温泉 · the hot-spring grotto ═════════════════════
// warm layered rock, dripping stalactites, a hot fall out of a crack, teal crystals, a stone lantern and a paper-lantern
// rope; a boulder-rimmed pool whose light walks from teal to amber to red with the heat; a brass thermometer bolted to the
// right wall (glass tube, jade marks for the sweet spot, a bulb that glows the heat's colour, a relief valve that hisses).
const SP = { pool: [150, 128, 104, 16], tube: [262, 32.5, 100], zone: [0.55, 0.78] };
const spY = (h) => SP.tube[1] + SP.tube[2] * (1 - h);
const heatRGB = (h) => { const a = [[70, 214, 193], [255, 190, 80], [255, 70, 60]], k = h < 0.6 ? 0 : 1, q = clamp(h < 0.6 ? h / 0.6 : (h - 0.6) / 0.4, 0, 1); return a[k].map((v, i) => Math.round(v + (a[k + 1][i] - v) * q)); };
// cave rock: a jittered grid of facets (nearest-seed cells), each tilted its own way, dark cracks between them
function facets(S, x0, y0, w, h, m, t, cell, seed, o) {
  o = o || {}; const r = X.rng(seed || 3), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, pts = [];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push({ x: x0 + (i - 0.5 + r()) * cell, y: y0 + (j - 0.5 + r() * 0.8) * cell * 0.8, nx: (r() - 0.5) * 1.4, ny: -0.2 - r() * 0.7, dt: (r() - 0.5) * 1.6 });
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (o.mask && !o.mask(x, y)) continue; let b1 = 1e9, b2 = 1e9, bp = null; const gi = Math.floor((x - x0) / cell), gj = Math.floor((y - y0) / (cell * 0.8));
    for (let dj = -1; dj <= 2; dj++) for (let di = -1; di <= 2; di++) { const q = pts[(gj + dj) * gw + gi + di]; if (!q) continue; const d = (x - q.x) ** 2 + ((y - q.y) * 1.25) ** 2; if (d < b1) { b2 = b1; b1 = d; bp = q; } else if (d < b2) b2 = d; }
    const edge = Math.sqrt(b2) - Math.sqrt(b1), crack = ((bp.x * 7 + bp.y * 13) | 0) % 3 !== 0; let tt = t + bp.dt - (bp.nx * 0.9 + bp.ny * 1.1) * 0.8 + ((y - bp.y) > cell * 0.25 ? -0.6 : 0); if (edge < (crack ? 1.1 : 0.5)) tt -= crack ? 2.4 : 1.2; else if (edge < 2.4 && y < bp.y) tt += 1.1;
    S.px(x, y, m, tt, { n: [bp.nx * 0.6, bp.ny * 0.6] });
  }
}
// the same facets as a tone pass over what is already painted in material m: rough-hewn stone on a carved body
function facetTone(S, x0, y0, w, h, m, cell, amp, seed) {
  const r = X.rng(seed || 5), gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2, pts = [], mi = X.MI[m];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) pts.push({ x: x0 + (i - 0.5 + r()) * cell, y: y0 + (j - 0.5 + r()) * cell, d: (r() - 0.5) * amp * 2 + (r() < 0.5 ? amp * 0.6 : -amp * 0.2) });
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { if (S.at(x, y) !== mi) continue; let b1 = 1e9, b2 = 1e9, bp = null; const gi = Math.floor((x - x0) / cell), gj = Math.floor((y - y0) / cell);
    for (let dj = -1; dj <= 2; dj++) for (let di = -1; di <= 2; di++) { const q = pts[(gj + dj) * gw + gi + di]; if (!q) continue; const d = (x - q.x) ** 2 + (y - q.y) ** 2; if (d < b1) { b2 = b1; b1 = d; bp = q; } else if (d < b2) b2 = d; }
    const e = Math.sqrt(b2) - Math.sqrt(b1); S.tone(x, y, e < 0.9 ? -amp * 1.3 : e < 1.9 && y < bp.y ? amp * 0.8 : bp.d); }
}
function boulder(S, x, y, rx, ry, t, moss) {
  S.beg(); blob(S, x, y, rx, ry, 'rock', t, { k: 2.2 }); S.end();
  if (moss) for (let i = -rx + 1; i < rx - 1; i++) { const top = y - Math.round(ry * Math.sqrt(Math.max(0, 1 - (i / rx) ** 2))); if ((i * 7 + x) % 5 < 3) S.px(x + i, top + 1, 'moss', 5 + ((i + x) % 3)); if ((i * 3 + x) % 7 === 0) S.px(x + i, top + 2, 'moss', 4); }
  S.px(x - Math.round(rx * 0.4), y - Math.round(ry * 0.55), 'rock', t + 3.5, { n: [-0.5, -0.6] });
}
X.def('mini_spring', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.22, 0.22],
  paint(S, sc) {
    sc.light({ x: 150, y: 124, z: 6, r: 118, i: 0.85, c: '#47d6c1', fl: 'pulse', amp: 0.08, sp: 1.2, tint: 0.5 });   // 0 the pool's own glow
    [[62, 36], [112, 42], [172, 42]].forEach(([x, y], i) => sc.light({ x, y: y + 8, z: 22, r: 84, i: 1.25, c: '#ff8a48', fl: 'candle', ph: i * 2.1, tint: 0.6 }));   // 1–3 paper lanterns
    sc.light({ x: 38, y: 92, z: 16, r: 44, i: 0.8, c: '#ffa050', fl: 'candle', ph: 4, tint: 0.5 });   // 4 stone lantern
    [[48, 80], [238, 64], [86, 22]].forEach(([x, y], i) => sc.light({ x, y, z: 10, r: 46, i: 0.85, c: '#6ad6c0', fl: 'pulse', amp: 0.15, sp: 1 + i * 0.4, ph: i, tint: 0.55 }));   // 5–7 crystals
    sc.light({ x: 116, y: 40, z: 12, r: 30, i: 0.3, c: '#bff7f0', tint: 0.3 });   // 8 the hot fall's sheen
    // ── rock: layered strata, darker toward the back of the cave, a ceiling of stalactites ──
    S.lay('wall'); facets(S, 0, 0, W, FY, 'mstone', 5.6, 24, 21); S.noise(0, 0, W, FY, 0.6, 2, 22, { only: 'mstone' });
    for (let x = 60; x < 244; x++) for (let y = 20; y < 110; y++) { const d = Math.hypot((x - 150) / 90, (y - 70) / 50); if (d < 1 && S.at(x, y)) S.tone(x, y, -1.2 * (1 - d)); }   // the far back is deeper
    S.ao(0, 0, 36, FY, 'l', 1.5); S.ao(W - 36, 0, 36, FY, 'r', 1.5); S.ao(0, 0, W, 26, 't', 2.4);
    for (let i = 0; i < 30; i++) { const x = 4 + i * 10 + Math.floor(S.r() * 6), len = 6 + Math.floor(S.r() * (i % 3 === 0 ? 22 : 12)), w0 = 2 + Math.floor(S.r() * 3);
      S.lay('back'); S.beg(); for (let k = 0; k < len; k++) { const w = Math.max(0, Math.round(w0 * (1 - k / len))); for (let j = -w; j <= w; j++) S.px(x + j, k, 'rock', 7 + (j < 0 ? 1.6 : j > 0 ? -1.4 : 0.6) - k / len * 1.5, { n: [j / (w + 1) * 0.7, 0.2] }); } S.px(x, len, 'water', 9, { e: 255 }); S.end(); }
    // the crack the hot fall comes out of
    S.lay('wall'); S.poly([[108, 26], [124, 26], [120, 40], [112, 40]], 'rock', 0.6);
    // ── crystals: tall teal prisms that glow with their light ──
    const crystal = (x, y, s, li) => { S.lay('back'); [[0, 1, 10], [-3, 0.8, 7], [3, 0.9, 8], [-5, 0.6, 5]].forEach(([dx, k, h]) => { const hh = Math.round(h * s), w = Math.max(1, Math.round(1.6 * s * k)); S.beg();
      for (let yy = 0; yy < hh; yy++) { const ww = yy < w ? yy + 0.5 : w; for (let j = -Math.floor(ww); j <= Math.floor(ww); j++) S.px(x + dx + j, y - hh + yy, 'teal', (j < 0 ? 9 : j > 0 ? 6 : 10) - yy / hh * 3, { e: li + 1 }); } S.end(); }); };
    crystal(48, 90, 1.1, 5); crystal(238, 72, 1, 6); crystal(86, 30, 0.8, 7);
    // ── stone lantern on the left rim ──
    S.lay('mid'); S.beg(); S.box(32, 102, 12, 6, 'stone', 5, { top: 1 }); S.box(35, 92, 6, 10, 'stone', 6); S.box(30, 86, 16, 3, 'stone', 7, { top: 1 }); S.poly([[29, 86], [47, 86], [38, 79]], 'stone', 6.5, { n: [0, -0.6] }); S.rect(35, 94, 6, 5, 'fire', 8, { e: 5 }); S.rect(37, 95, 2, 3, 'fire', 10, { e: 5 }); S.end();
    // ── the pool: boulders behind, the water, boulders in front ──
    const [px0, py0, prx, pry] = SP.pool;
    S.lay('back'); for (let i = 0; i < 17; i++) { const a = Math.PI + i / 16 * Math.PI, x = px0 + Math.cos(a) * (prx + 6), y = py0 + Math.sin(a) * (pry + 4); boulder(S, x, y - 2, 8 + (i % 3) * 2, 6 + (i % 2) * 2, 6 + (i % 4) * 0.4, 1); }
    S.lay('mid'); for (let y = Math.floor(py0 - pry); y <= py0 + pry; y++) for (let x = Math.floor(px0 - prx); x <= px0 + prx; x++) { const u = (x + 0.5 - px0) / prx, v = (y + 0.5 - py0) / pry, d = u * u + v * v; if (d > 1) continue;
      S.px(x, y, 'teal', 4.2 + v * 0.8 - d * 1.2 + ((x * 3 + y * 7) % 11 === 0 ? 1 : 0), { n: [0, -0.9] }); }
    S.lay('front'); for (let i = 0; i < 15; i++) { const a = i / 14 * Math.PI, x = px0 + Math.cos(a) * (prx + 4), y = py0 + Math.sin(a) * (pry + 5); boulder(S, x, y + 4, 9 + (i % 3) * 2, 6 + (i % 2), 6.6 + (i % 3) * 0.5, i % 2); }
    // stone steps into the water on the right, a bucket and a folded towel on the left
    S.beg(); S.box(214, 150, 26, 6, 'stone', 6, { top: 1 }); S.box(222, 156, 24, 6, 'stone', 5.4, { top: 1 }); S.end();
    S.beg(); S.cyl(14, 150, 14, 14, 'wood', 5.4, { rim: 2.4 }); S.hcyl(14, 153, 14, 2, 'brass', 6); S.hcyl(14, 160, 14, 2, 'brass', 5); S.ell(21, 150, 7, 1.6, 'teal', 5, { n: [0, -0.9] }); S.end();
    S.beg(); S.box(32, 160, 20, 3, 'linen', 8.5, { top: 1 }); S.box(33, 157, 18, 3, 'linen', 9.2, { top: 1 }); S.hl(33, 158, 18, 'red', 6); S.end();
    // floor: wet rock, a few puddles catching the light
    S.lay('wall'); facets(S, 0, FY, W, H - FY, 'rock', 5.4, 10, 23);
    [[70, 166, 10], [196, 170, 8], [124, 172, 6]].forEach(([x, y, r]) => S.ell(x, y, r, 1.2, 'water', 4.5, { n: [0, -0.9] }));
    // ── the thermometer: brass case, glass tube, jade marks, bulb, relief valve ──
    const [tx, tt, th] = SP.tube, zy0 = Math.round(spY(SP.zone[1])), zy1 = Math.round(spY(SP.zone[0]));
    S.lay('back'); S.beg(); S.box(tx - 8, tt - 7, 17, th + 13, 'brass', 5.4, { top: 1, side: 1 }); S.rect(tx - 5, tt - 4, 11, th + 7, 'brass', 3.4);
    for (let y = tt; y < tt + th; y += 10) { S.hl(tx - 7, Math.round(y), 3, 'brass', 8); S.hl(tx + 5, Math.round(y), 3, 'brass', 7); }
    [[tx - 6, tt - 5], [tx + 6, tt - 5], [tx - 6, tt + th + 3], [tx + 6, tt + th + 3]].forEach(([x, y]) => TX.rivet(S, x, y, 'brass', 7));
    S.rect(tx - 3, tt - 1, 7, th + 2, 'glass', 2.4); S.vl(tx - 2, tt, th, 'glass', 7, { n: [-0.6, -0.4] });
    for (let y = zy0; y <= zy1; y++) { S.px(tx - 5, y, 'teal', y === zy0 || y === zy1 ? 9 : 6); S.px(tx + 5, y, 'teal', y === zy0 || y === zy1 ? 9 : 6); } S.hl(tx - 7, zy0, 15, 'teal', 8); S.hl(tx - 7, zy1, 15, 'teal', 7);
    S.end();
    S.beg(); S.ell(tx + 0.5, tt + th + 8, 7.5, 7, 'brass', 6, { dome: 1 }); S.ell(tx + 0.5, tt + th + 8, 5, 4.6, 'glass', 3, { dome: 1 }); S.end();
    S.beg(); S.rect(tx - 1, tt - 16, 3, 9, 'copper', 6); S.ell(tx + 0.5, tt - 17, 4, 1.5, 'copper', 7.5, { ring: 1 }); S.hl(tx - 3, tt - 17, 8, 'copper', 5); S.px(tx + 4, tt - 13, 'copper', 5); S.px(tx + 5, tt - 13, 'copper', 4); S.end();
    // steam and drips that are always there
    sc.emit({ k: 'steam', x: 116, y: 112, w: 10, rate: 3, sp: 5, ang: 0, spread: 0.7, life: 3.2 });
    sc.emit({ k: 'drip', x: 150, y: 20, w: 240, rate: 0.8, sp: 0, life: 3 });
    sc.field({ x0: 44, y0: 40, x1: 256, y1: 112, lay: 'wall', fn: (x, y, t) => { const v = Math.sin(x * 0.23 + t * 1.8 + Math.sin(y * 0.3 + t) * 1.5) * Math.sin(y * 0.41 - t * 1.2 + x * 0.07); return v > 0.55 ? 0.22 : 0; } });
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, tq = q12(T), h = mg.heat || 0, soak = mg.phase === 'soak', hot = soak && h > SP.zone[1], [px0, py0, prx, pry] = SP.pool;
    // lanterns on their rope
    D.lay('front'); D.beg(); for (let x = 20; x < 210; x++) { const y = 22 + Math.round(((x - 20) / 190) * 8 + Math.sin((x - 20) / 190 * Math.PI) * 10); D.px(x, y, 'wood', 3); } D.end({ none: 1 });
    [[62, 36], [112, 42], [172, 42]].forEach(([x, y], i) => lantern(D, x, y, 1 + i, Math.round(Math.sin(T * 1.1 + i * 2) * (hot ? 2 : 1)), i === 1));
    // the hot fall: a sheet of water that scrolls, white foam where it hits
    D.lay('back'); for (let y = 40; y < py0 - pry + 2; y++) { const w = 3 + Math.floor((y - 40) / 18); for (let j = -w; j <= w; j++) { const s2 = Math.floor((y * 1.0 - T * 40 + j * 7) / 3); D.px(116 + j, y, 'ice', (s2 % 4 === 0 ? 10 : 8) - Math.abs(j) / (w + 1) * 3, { e: 8 + 1 }); } }
    for (let j = -8; j <= 8; j++) if ((j + Math.floor(T * 14)) % 3) D.px(116 + j, py0 - pry + 2 + (Math.abs(j) > 5 ? 1 : 0), 'linen', 10, { e: 255 });
    // the surface: moving glints, rings where things hit the water, and a light that follows the heat
    const c = heatRGB(h); rs.dl.push({ x: px0, y: py0 + 6, z: 2, r: 80 + h * 30, i: 0.35 + h * 0.9, rgb: c, tint: 0.55 });
    D.lay('mid'); for (let k = 0; k < 26; k++) { const x0 = px0 - prx + ((k * 37 + Math.floor(T * (8 + k % 5))) % (prx * 2)), y0 = py0 - pry + 2 + (k * 5) % (pry * 2 - 3), u = (x0 - px0) / prx, v = (y0 - py0) / pry; if (u * u + v * v > 0.86) continue; D.hl(x0, y0, 2 + (k % 3), 'teal', 9 + (k % 2), { e: 255 }); }
    (mg.rip || []).forEach(r => { const a = T - r.t; if (a < 0 || a > 1.2) return; const rr = 3 + a * (r.big ? 30 : 16); for (let k = 0; k < 40; k++) { const th2 = k / 40 * Math.PI * 2, x = r.x + Math.cos(th2) * rr, y = r.y + Math.sin(th2) * rr * 0.28; const u = (x - px0) / prx, v = (y - py0) / pry; if (u * u + v * v < 0.95) D.px(x, y, 'teal', 10 - a * 5, { e: 255 }); } });
    // bubbles and steam climb with the heat; over the top the water blushes red
    if (soak && Math.random() < 0.2 + h * 1.4) rs.burst('bubble', px0 + (Math.random() - 0.5) * prx * 1.4, py0 + 4, 1, { sp: 6, life: 0.8, floor: py0 - pry });
    if (Math.random() < 0.08 + h * 0.6) rs.burst('steam', px0 + (Math.random() - 0.5) * prx * 1.6, py0 - 4, 1, { sp: 6, ang: 0, spread: 0.6, life: 2.4 + h });
    // the thermometer: the column in the heat's colour, a bright meniscus; the jade marks light up while you are in the zone
    const [tx, tt, th] = SP.tube, top = Math.round(spY(h)), inZ = h >= SP.zone[0] && h <= SP.zone[1];
    D.lay('back'); const hm = h < 0.6 ? 'teal' : h < 0.8 ? 'lamp' : 'fire';
    for (let y = top; y < tt + th; y++) { D.px(tx - 1, y, hm, 7, { e: 255 }); D.px(tx, y, hm, 9, { e: 255 }); D.px(tx + 1, y, hm, 7.5, { e: 255 }); }
    if (h > 0.01) { D.hl(tx - 1, top, 3, hm, 11, { e: 255 }); }
    const bt = tt + th + 8; D.ell(tx + 0.5, bt, 4.2, 3.8, hm, 7 + h * 3, { e: 255 }); D.px(tx - 1, bt - 2, hm, 11, { e: 255 }); rs.dl.push({ x: tx, y: bt, z: 8, r: 24 + h * 20, i: 0.5 + h * 0.8, rgb: c, tint: 0.6 });
    const zT = mg.zoneT != null ? T - mg.zoneT : 9, zy0 = Math.round(spY(SP.zone[1])), zy1 = Math.round(spY(SP.zone[0]));
    if (inZ || zT < 0.4) for (let y = zy0; y <= zy1; y++) { const lit = zT < 0.4 ? y >= zy1 - (zy1 - zy0) * zT / 0.12 : true; if (!lit) continue; D.px(tx - 5, y, 'teal', 10, { e: 255 }); D.px(tx + 5, y, 'teal', 10, { e: 255 }); }
    // the brass pointer on the left follows the column; after the release it clamps (a bright notch)
    const py = Math.round(spY(mg.phase === 'done' ? mg.lockH != null ? mg.lockH : h : h)), pc = hot ? 'red' : inZ ? 'teal' : 'brass';
    D.beg(); for (let k = 0; k < 5; k++) D.vl(tx - 13 + k, py - (4 - k), 1 + (4 - k) * 2, pc, pc === 'brass' ? 8 : 9); D.end();
    if (mg.clampT != null && T - mg.clampT < 0.5) { D.hl(tx - 4, py, 9, 'linen', 11, { e: 255 }); }
    // the relief valve hisses harder as it heats
    if (soak && Math.random() < h * h * 1.6) rs.burst('steam', tx + 5, tt - 13, 1, { sp: 20 + h * 30, ang: 1.1, spread: 0.3, life: 0.9 });
    // PERFECT: a geyser out of the middle of the pool, a pixel rainbow in the mist
    const gz = mg.geyserT != null ? T - mg.geyserT : 9;
    if (gz < 2.2) { const hh = Math.round(Math.min(1, gz / 0.25) * 96 * (gz > 1.4 ? Math.max(0, 1 - (gz - 1.4) / 0.8) : 1)); D.lay('front');
      for (let y = 0; y < hh; y++) { const w = 3 + Math.round(Math.sin(y * 0.5 + T * 20) * 1) + (y < 6 ? 2 : 0); for (let j = -w; j <= w; j++) D.px(px0 + j, py0 - y, y > hh - 5 ? 'linen' : 'water', y > hh - 5 ? 11 : 9 + (j === -1 ? 1.5 : 0) - Math.abs(j) / w * 2, { e: 255 }); }
      if (gz < 1.8 && Math.random() < 0.9) rs.burst('drip', px0 + (Math.random() - 0.5) * 20, py0 - hh, 2, { sp: 40, spread: 2.4, life: 1.4, floor: py0 });
      if (gz > 0.3) { const ra = Math.min(1, (gz - 0.3) / 0.4) * (gz > 1.8 ? Math.max(0, 1 - (gz - 1.8) / 0.4) : 1), R0 = 58, cols = [['red', 8], ['fire', 8], ['lamp', 9], ['leaf', 9], ['teal', 8], ['water', 8], ['arcane', 7]];
        D.lay('wall'); if (ra > 0.1) cols.forEach(([m, tn], i) => { const r = R0 - i * 2; for (let a = 0; a < Math.PI * ra; a += 0.5 / r) { const x = Math.round(px0 - Math.cos(a) * r * 1.3), y = Math.round(py0 - 16 - Math.sin(a) * r * 0.9); if (y > 18) { D.px(x, y, m, tn, { e: 255 }); D.px(x, y + 1, m, tn - 1, { e: 255 }); } } }); } }
  },
});

// ═════════════════════ 地雷阵 · the minefield in a ruined pass ═════════════════════
// a broken ashlar wall with a torn war banner, two torches, a barbed-wire line; a 6×3 field of thick stone slabs (the grid
// the game walks); an arch you came in by, a skull sign; the chest on a plinth in a shaft of light; rubble up front.
// Opened slabs sink and show a lit engraving under the number, mines are rusty spiked iron with a red lamp, blasts leave
// charred craters that smoke. The field trembles (every closed neighbour alike — no hint) while you stand on a 2+.
const TG = { x0: 39, y0: 43, tw: 37, th: 32, tc: 6, tr: 3, chest: [278, 91] };
MD.TRAP = TG;
const NUMC = [['screen', 9], ['lamp', 9], ['fire', 8], ['red', 8], ['red', 9]];
function slab(D, x, y, w, h, t, o) {
  o = o || {}; const dy = o.dy || 0, th = 4;
  D.beg();
  for (let k = 0; k < th; k++) D.rect(x + 1, y + h - th + dy + k, w - 2, 1, 'stone', t - 2.6 - k * 0.5, { n: [0, 0.7] });   // front face (thickness), darker toward the ground
  for (let k = 0; k < h - th; k++) D.px(x + w - 1, y + k + dy + 1, 'stone', t - 3.4, { n: [0.7, 0] });                          // right face in shadow
  for (let yy = 0; yy < h - th; yy++) for (let xx = 1; xx < w - 1; xx++) { const e = xx < 2 || yy < 1, f = xx > w - 3 || yy > h - th - 2, cu = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - (h - th) / 2) / ((h - th) / 2)) ** 2; D.px(x + xx, y + yy + dy, 'stone', t + (e ? 1.6 : f ? -1 : cu < 0.35 ? 0.5 : 0), { n: [0, -0.85] }); }
  D.end();
  if (!o.plain) { D.noise(x + 2, y + 1 + dy, w - 4, h - th - 2, 1, 4, (x * 31 + y) | 0, { only: 'stone' }); const r = X.rng(x * 7 + y); for (let k = 0; k < 3; k++) D.px(x + 3 + Math.floor(r() * (w - 6)), y + 2 + dy + Math.floor(r() * (h - th - 4)), 'stone', t - 2); if (r() < 0.5) { let cx = x + 5 + Math.floor(r() * (w - 10)), cy = y + 2 + dy; for (let k = 0; k < h - th - 5; k++) { D.px(cx, cy + k, 'stone', t - 2.6); if (r() < 0.4) cx += r() < 0.5 ? -1 : 1; } } }
}
function mine(D, x, y, t, lit) {
  D.beg(); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; D.line(x + Math.round(Math.cos(a) * 5), y + Math.round(Math.sin(a) * 4), x + Math.round(Math.cos(a) * 7), y + Math.round(Math.sin(a) * 5.5), 'iron', 6); } D.end();
  D.beg(); blob(D, x, y, 5.5, 4.5, 'copper', 4.4, { k: 2 }); D.hl(x - 4, y, 9, 'iron', 3); [[-3, -1], [2, -2], [3, 1]].forEach(([a, b]) => D.px(x + a, y + b, 'copper', 7)); D.end();
  D.px(x, y - 4, lit ? 'red' : 'red', lit ? 10 : 5, lit ? { e: 255 } : undefined); D.px(x, y - 5, 'iron', 7);
}
X.def('mini_trap', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.22, 0.24],
  paint(S, sc) {
    sc.light({ x: 72, y: 16, z: 18, r: 92, i: 1.1, c: '#ff9040', fl: 'fire', ph: 0, tint: 0.55 });    // 0 left torch
    sc.light({ x: 230, y: 16, z: 18, r: 92, i: 1.1, c: '#ff9040', fl: 'fire', ph: 2, tint: 0.55 });   // 1 right torch
    sc.light({ x: 278, y: 70, z: 30, r: 56, i: 0.9, c: '#ffe0a0', tint: 0.3 });                         // 2 the shaft on the chest
    sc.light({ x: 20, y: 96, z: 10, r: 40, i: 0.35, c: '#8fa0ff', tint: 0.4 });                         // 3 cold air from the arch
    sc.light({ x: 150, y: 90, z: 60, r: 170, i: 0.35, c: '#c0b8ff', tint: 0.12 });                      // 4 the dim over the field
    // ── wall: ashlar with a broken top, a torn banner, torch brackets, a line of wire posts ──
    S.lay('wall'); S.rect(0, 0, W, FY, 'stone', 2); TX.ashlar(S, 0, 0, W, 40, 'stone', 5, { bh: 8, bw: 18, crack: 0.25 });
    for (let x = 0; x < W; x++) { const top = 3 + Math.round(Math.abs(Math.sin(x * 0.09)) * 5 + (x % 17 < 4 ? 3 : 0)); for (let y = 0; y < top; y++) S.px(x, y, 'night', 1, { e: 255 }); }
    S.ao(0, 26, W, 14, 'b', 2); S.hl(0, 40, W, 'stone', 1);
    S.lay('back'); S.beg(); S.rect(141, 4, 18, 30, 'crimson', 5); for (let y = 4; y < 34; y++) { S.px(141, y, 'crimson', 6.5); S.px(158, y, 'crimson', 3); } S.poly([[141, 34], [150, 27], [159, 34], [159, 38], [155, 35], [150, 31], [144, 37], [141, 36]], 'crimson', 4.5); S.rect(139, 3, 22, 2, 'wood', 5); S.end();
    S.ell(150, 15, 5, 5, 'gold', 5, { ring: 1 }); S.px(150, 15, 'gold', 7); S.rect(146, 20, 9, 1, 'gold', 4); [[147, 26], [153, 29]].forEach(([x, y]) => { S.px(x, y, 'crimson', 1.5); S.px(x + 1, y, 'crimson', 1.5); });
    [72, 230].forEach(x => { S.beg(); S.box(x - 3, 20, 7, 3, 'iron', 5); S.line(x, 20, x, 13, 'wood', 6); S.px(x - 1, 13, 'wood', 4); S.px(x + 1, 13, 'wood', 4); S.end(); });
    for (let x = 6; x < W; x += 30) { S.beg(); S.rect(x, 30, 2, 12, 'wood', 5); S.px(x, 30, 'wood', 7); S.end(); }
    for (let x = 0; x < W; x++) { const y = 33 + Math.round(Math.abs(((x % 10) - 5)) * 0.4); S.px(x, y, 'iron', 6); if (x % 5 === 0) { S.px(x, y - 1, 'iron', 8); S.px(x, y + 1, 'iron', 4); } }
    // ── ground: gravel and packed dirt between everything ──
    S.lay('wall'); S.rect(0, 40, W, H - 40, 'earth', 3.5); S.noise(0, 40, W, H - 40, 1.2, 2, 31, { only: 'earth' });
    // ── the slab field (closed slabs; opened ones are drawn live) ──
    for (let r = 0; r < TG.tr; r++) for (let c = 0; c < TG.tc; c++) slab(S, TG.x0 + c * TG.tw, TG.y0 + r * TG.th, TG.tw, TG.th, 5.2 + ((r + c) % 2) * 0.4);
    for (let i = 0; i < 26; i++) { const x = TG.x0 + Math.floor(S.r() * TG.tw * 6), y = TG.y0 + Math.floor(S.r() * TG.th * 3); if (S.at(x, y) && S.r() < 0.6) S.px(x, y, 'moss', 4 + S.r() * 2); }
    // ── the arch on the left, the skull sign ──
    S.lay('back'); S.beg(); TX.ashlar(S, 0, 44, 34, 104, 'stone', 5.6, { bh: 7, bw: 10 }); S.end();
    for (let y = 60; y < 148; y++) for (let x = 6; x < 28; x++) { const u = (x + 0.5 - 17) / 11, top = 72 - 12 * Math.sqrt(Math.max(0, 1 - u * u)); if (y >= top) S.px(x, y, 'night', 0.8 + (y - top) / 90, { e: 255 }); }
    S.lay('mid'); S.beg(); S.rect(28, 118, 2, 26, 'wood', 5); S.box(20, 110, 18, 12, 'wood', 6); S.end();
    S.ell(29, 115, 3, 2.6, 'bone', 9); S.px(28, 115, 'ink', 0); S.px(30, 115, 'ink', 0); S.hl(28, 118, 3, 'bone', 7); S.line(24, 112, 34, 120, 'bone', 7); S.line(34, 112, 24, 120, 'bone', 7);
    // ── the chest's plinth and the shaft of light ──
    S.lay('back'); S.beg(); S.box(262, 100, 34, 14, 'stone', 6.4, { top: 2 }); S.box(258, 114, 42, 34, 'stone', 5.6, { top: 1 }); S.end(); TX.ashlar(S, 258, 116, 42, 32, 'stone', 5.4, { bh: 8, bw: 14 });
    sc.shaft({ x: 278, y0: 0, y1: 100, w0: 7, w1: 15, i: 0.45, haze: 0.6, c: '#fff0c8', f: (t) => 0.85 + 0.15 * Math.sin(t * 1.4) });
    sc.emit({ k: 'dust', x: 278, y: 60, w: 20, h: 70, rate: 4, sp: 3, life: 3 });
    // ── rubble up front: a dented helmet, bones, a broken blade in the dirt, loose stones ──
    S.lay('front'); for (let i = 0; i < 14; i++) { const x = 40 + i * 17 + Math.floor(S.r() * 8), y = 152 + Math.floor(S.r() * 16); S.beg(); blob(S, x, y, 2 + S.r() * 3, 1.5 + S.r() * 1.5, 'stone', 5 + S.r(), { k: 2 }); S.end(); }
    S.beg(); blob(S, 96, 162, 6, 4, 'iron', 5, { k: 2.4, clipY: 164 }); S.hl(90, 164, 13, 'iron', 3); S.rect(94, 160, 1, 3, 'ink', 1); S.end();
    S.beg(); S.line(200, 150, 204, 166, 'iron', 8); S.line(201, 150, 205, 166, 'iron', 6); S.rect(197, 148, 9, 2, 'brass', 6); S.rect(200, 145, 3, 3, 'wood', 5); S.end();
    S.beg(); S.line(150, 167, 162, 164, 'bone', 8); S.px(149, 166, 'bone', 9); S.px(163, 163, 'bone', 9); S.end();
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, sh = mg.sh || {}, idle = mg.phase === 'idle';
    // torches
    [72, 230].forEach((x, i) => flame(D, x, 13, 6, T, i * 2.3));
    if (!mg.open) return;
    const at = mg.at, tense = sh.tense && at, adj = (r, c) => at && Math.abs(at.r - r) <= 1 && Math.abs(at.c - c) <= 1 && !(at.r === r && at.c === c);
    for (let r = 0; r < TG.tr; r++) for (let c = 0; c < TG.tc; c++) {
      const x = TG.x0 + c * TG.tw, y = TG.y0 + r * TG.th, op = mg.open[r][c], mn = mg.mine[r][c];
      if (op && mg.openT && mg.openT[r] && T < mg.openT[r][c]) continue;   // still in the air: the slab has not sunk yet
      if (op) {
        const st = mg.openT && mg.openT[r] ? T - mg.openT[r][c] : 9, press = st < 0.08 ? 3 : st < 0.16 ? 1 : 2;
        D.lay('back');
        if (mn) { // a charred crater: black ring, glowing cracks that cool, the mine's burst shell
          D.rect(x + 1, y, TG.tw - 2, TG.th, 'earth', 1.5); D.ell(x + TG.tw / 2, y + TG.th / 2, 14, 10, 'ink', 1); D.ell(x + TG.tw / 2, y + TG.th / 2, 14, 10, 'earth', 2.6, { ring: 2 });
          const cool = Math.max(0, 1 - st / 4); for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3; D.line(x + TG.tw / 2 + Math.cos(a) * 4, y + TG.th / 2 + Math.sin(a) * 3, x + TG.tw / 2 + Math.cos(a) * 11, y + TG.th / 2 + Math.sin(a) * 8, 'fire', 3 + cool * 7, cool > 0.1 ? { e: 255 } : undefined); }
          if (Math.random() < 0.15) rs.burst('steam', x + TG.tw / 2, y + TG.th / 2 - 2, 1, { sp: 5, ang: 0, spread: 0.5, life: 2 });
          if (cool > 0.3 && Math.random() < 0.3) rs.burst('ember', x + TG.tw / 2 + (Math.random() - 0.5) * 16, y + TG.th / 2, 1, { sp: 8, ang: 0, spread: 1, life: 1 });
        } else { // sunk slab with a lit engraving under the number
          D.rect(x + 1, y, TG.tw - 2, TG.th, 'earth', 1.2); slab(D, x, y + press, TG.tw, TG.th - press, 4.4, { plain: 1 });
          const n = mg.cnt ? mg.cnt(r, c) : 0, [m, tn] = NUMC[n] || NUMC[4], cx = x + Math.round(TG.tw / 2), cy = y + press + Math.round((TG.th - 4) / 2);
          D.rect(cx - 7, cy - 8, 15, 15, 'stone', 2.2); D.rect(cx - 6, cy - 7, 13, 13, m, tn - 6, { e: 255 });
          D.hl(cx - 7, cy - 8, 15, m, tn - (st < 0.3 ? 0 : 2), { e: 255 }); D.hl(cx - 7, cy + 6, 15, m, tn - 3, { e: 255 }); D.vl(cx - 7, cy - 8, 15, m, tn - 2, { e: 255 }); D.vl(cx + 7, cy - 8, 15, m, tn - 3, { e: 255 });
          if (n >= 2) rs.dl.push({ x: cx, y: cy, z: 8, r: 14 + n * 3, i: 0.4, rgb: n >= 3 ? [255, 70, 60] : [255, 150, 60], tint: 0.6 });
          if (idle && mg.adjOk && mg.adjOk(r, c) && !(mg.at && mg.at.r === r && mg.at.c === c)) { const hv = mg.hov && mg.hov.r === r && mg.hov.c === c, g = hv ? 10 : 6.5; for (let xx = x + 1; xx < x + TG.tw - 1; xx++) { D.px(xx, y + press, 'fire', g, { e: 255 }); D.px(xx, y + TG.th - 1, 'fire', g - 2, { e: 255 }); } }   // a legal step back
        }
        continue;
      }
      // closed: tremble while standing on a 2+ (all the closed neighbours alike), lift and glow when it is a legal step
      const can = idle && mg.adjOk && mg.adjOk(r, c), hov = can && mg.hov && mg.hov.r === r && mg.hov.c === c, sj = tense && adj(r, c) ? ((Math.floor(T * 30) + r * 3 + c) % 3) - 1 : 0;
      if (sj || hov) { D.lay('back'); D.rect(x + 1, y, TG.tw - 2, TG.th, 'earth', 1.5); slab(D, x + sj, y - (hov ? 1 : 0), TG.tw, TG.th, 5.6 + (hov ? 0.6 : 0)); if (sj && Math.random() < 0.08) rs.burst('dust', x + TG.tw / 2 + (Math.random() - 0.5) * TG.tw, y + TG.th - 3, 2, { sp: 4, life: 1 }); }
      if (can) { D.lay('back'); const g = hov ? 11 : 8 + Math.sin(T * 5) * 1.5, m = hov ? 'lamp' : 'fire';
        for (let xx = x + 1; xx < x + TG.tw - 1; xx++) { D.px(xx, y - (hov ? 1 : 0), m, g, { e: 255 }); D.px(xx, y + TG.th - 1, m, g - 3, { e: 255 }); } for (let yy = y; yy < y + TG.th; yy++) { D.px(x + 1, yy - (hov ? 1 : 0), m, g - 1, { e: 255 }); D.px(x + TG.tw - 2, yy - (hov ? 1 : 0), m, g - 2, { e: 255 }); } }
    }
    // mines that were never stepped on, shown once the chest is open (red lamps blink one by one); a clean run sends them up as fireworks
    if (mg.revealT != null && T > mg.revealT) for (let r = 0; r < TG.tr; r++) for (let c = 0; c < TG.tc; c++) { if (!mg.mine[r][c] || mg.open[r][c]) continue; const k = r * 6 + c, on = T - mg.revealT > k * 0.05;
      if (!on) continue; const x = TG.x0 + c * TG.tw + TG.tw / 2, y = TG.y0 + r * TG.th + TG.th / 2 - 2;
      if (mg.fireworks) { const ft = T - mg.revealT - k * 0.12; if (ft < 0) { D.lay('mid'); mine(D, x, y, T, 1); } else if (ft < 0.5) { D.lay('front'); for (let j = 0; j < 4; j++) D.px(x, y - ft * 160 + j, 'fire', 11 - j * 2, { e: 255 }); } else if (!mg.fw || !mg.fw[k]) { (mg.fw = mg.fw || {})[k] = 1; rs.burst('spark', x, y - 80, 22, { sp: 60, spread: 6.3, life: 1.1 }); rs.burst('glint', x, y - 80, 8, { sp: 40, life: 0.8, w: 10, h: 10 }); } }
      else { D.lay('mid'); mine(D, x, y, T, Math.floor(T * 8 + k) % 2); } }
    // the chest: shakes in its omen colour, light leaks from the seams; the lid flies open and a pillar of light goes up
    const B = mg.box || {}, cx = TG.chest[0], cy = TG.chest[1], sk = B.sk || 0, jx = Math.round(Math.sin(T * 50) * sk), op2 = B.open != null ? T - B.open : -1, qc = B.qc || null;
    D.lay('mid'); D.beg(); D.box(cx - 12 + jx, cy - 4, 24, 13, 'wood', 5, { top: 1 }); D.hl(cx - 12 + jx, cy + 2, 24, 'brass', 7); D.vl(cx - 12 + jx, cy - 4, 13, 'brass', 7); D.vl(cx + 11 + jx, cy - 4, 13, 'brass', 5); D.rect(cx - 2 + jx, cy - 3, 5, 5, 'brass', 8); D.px(cx + jx, cy - 1, 'ink', 0); D.end();
    if (op2 < 0) { D.beg(); D.box(cx - 13 + jx, cy - 11 - (sk > 1 ? 1 : 0), 26, 7, 'wood', 6, { top: 1 }); D.hl(cx - 13 + jx, cy - 11, 26, 'brass', 8); D.vl(cx - 13 + jx, cy - 11, 7, 'brass', 7); D.vl(cx + 12 + jx, cy - 11, 7, 'brass', 5); D.end();
      if (qc) { D.hl(cx - 11 + jx, cy - 4, 22, qc[0], qc[1], { e: 255 }); D.px(cx + jx, cy - 1, qc[0], qc[1] + 1, { e: 255 }); rs.dl.push({ x: cx, y: cy - 4, z: 10, r: 30 + sk * 6, i: 0.6 + sk * 0.2, rgb: qc[2], tint: 0.6 }); } }
    else { const la = Math.min(1, op2 / 0.25), ly = cy - 11 - Math.round(la * 14), lx = cx + Math.round(la * 10); D.beg(); D.box(lx - 13, ly, 26, 4 + Math.round((1 - la) * 3), 'wood', 6.5, { top: 1 }); D.hl(lx - 13, ly, 26, 'brass', 8); D.end();
      if (qc) { const ph = Math.max(0, 1 - op2 / 2.5); for (let y = 0; y < cy - 4; y++) { const w = 4 + Math.round((cy - 4 - y) / 12); for (let j = -w; j <= w; j++) if (Math.abs(j) < w * ph + 1) D.px(cx + j, y, qc[0], qc[1] - Math.abs(j) / w * 3, { e: 255 }); } rs.dl.push({ x: cx, y: cy - 10, z: 20, r: 70, i: 1.2 * ph, rgb: qc[2], tint: 0.6 }); } }
  },
});

// ═════════════════════ 沉睡的古像 · the sleeping colossus ═════════════════════
// a ruined temple swallowed by roots (cool grey ashlar, vines, glowing mushrooms, moonlight through a broken roof, cold-flame
// braziers, broken pillars, a rune floor) around a seated giant in warm carved stone: stepped crown, heavy brow, closed eyes,
// straight nose, a long braided beard, square shoulders, arms on its knees, a draped lap. Its chest is the three-ring dial
// (carved rings with a rune groove, a direction mark each, a bronze tooth at 12 o'clock). Asleep, a faint teal breath pulses
// in its cracks; on a reach its eyelids leak light with the heartbeat; awake, the eyes blaze, the cracks light from the chest
// to the face, moss and dust shake off and the head lifts and nods.
const ST = { x: 150, y: 98, R: [42, 28, 14], eye: [[142, 37], [158, 37]] };
MD.STATUE = ST;
function tealFlame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.85 + 0.2 * n1(t * 7 + ph))), sw = Math.round(n1(t * 4 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.5)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'teal', clamp(11 - q * 5 - Math.abs(i) * 1.8, 4, 11), { e: 255 }); }
}
// a faceted stone mass: polygon filled with per-facet tones (light from the upper left), a lit top edge, a dark lower edge
function carve(S, pts, m, t, o) {
  o = o || {}; S.beg(); S.poly(pts, m, t, { n: o.n || [0, 0] });
  let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9; pts.forEach(([x, y]) => { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); });
  for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { if (!S.at(x, y) || S.c.o[y * X.W + x] !== S.id) continue; const u = (x - x0) / Math.max(1, x1 - x0), v = (y - y0) / Math.max(1, y1 - y0); S.tone(x, y, (0.5 - u) * (o.k || 1.6) + (0.4 - v) * (o.kv || 1.2)); }
  S.end();
}
const CRACKS = [[[150, 55], [148, 52], [150, 49], [147, 46]], [[124, 70], [116, 66], [108, 67], [100, 64]], [[176, 70], [184, 65], [192, 66], [200, 62]], [[124, 126], [118, 132], [110, 133]], [[176, 126], [182, 131], [190, 132]], [[150, 141], [151, 146]]];
X.def('mini_statue', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.2, 0.26],
  paint(S, sc) {
    sc.light({ x: 176, y: 70, z: 40, r: 120, i: 0.75, c: '#b8d8ff', tint: 0.35 });                          // 0 moonlight on the chest
    [[36, 112], [264, 112]].forEach(([x, y], i) => sc.light({ x, y: y - 10, z: 18, r: 74, i: 1, c: '#47d6c1', fl: 'fire', ph: i * 2, tint: 0.55 }));   // 1–2 cold braziers
    sc.light({ x: 150, y: 98, z: 12, r: 58, i: 0.25, c: '#6ad6c0', fl: 'pulse', amp: 0.5, sp: 1.3, tint: 0.5 });   // 3 the breath in the dial
    sc.light({ x: 150, y: 150, z: 16, r: 96, i: 1, c: '#ffa050', fl: 'candle', tint: 0.5 });              // 4 the candle row, warm on the stone
    sc.light({ x: 132, y: 30, z: 34, r: 56, i: 0.55, c: '#d8e4ff', tint: 0.25 });                          // 5 moon fill on the face
    // ── temple wall ──
    S.lay('wall'); S.rect(0, 0, W, FY, 'stone', 3); TX.ashlar(S, 0, 0, W, FY, 'stone', 4.4, { bh: 16, bw: 30, crack: 0.3 });
    for (let x = 180; x < 240; x++) for (let y = 0; y < 16 - Math.abs(x - 210) * 0.4; y++) S.px(x, y, 'night', 2 + y * 0.12, { e: 255 });
    [[194, 3], [218, 6], [230, 2]].forEach(([x, y]) => S.px(x, y, 'linen', 10, { e: 255 }));
    S.ao(0, 0, W, 30, 't', 2); S.ao(0, 0, 30, FY, 'l', 1.6); S.ao(W - 30, 0, 30, FY, 'r', 1.6);
    const vine = (x0, y0, len, dir) => { let x = x0; for (let y = y0; y < y0 + len; y++) { if (S.r() < 0.3) x += dir * (S.r() < 0.6 ? 1 : -1); S.px(x, y, 'leaf', 4 + (y % 3 === 0 ? 1.5 : 0)); if (y % 5 === 0) { S.px(x + 1, y, 'leaf', 6.5); S.px(x + 2, y + 1, 'leaf', 5); } } };
    [[18, 0, 70, 1], [34, 0, 40, 1], [262, 0, 90, -1], [280, 10, 60, -1], [96, 0, 30, 1], [210, 14, 30, -1]].forEach(a => vine(...a));
    [[24, 76], [276, 96], [60, 136], [240, 132], [110, 26]].forEach(([x, y]) => { S.ell(x, y, 2, 1, 'teal', 8, { e: 255 }); S.px(x, y + 1, 'bone', 7); S.ell(x + 3, y + 1, 1.5, 1, 'teal', 7, { e: 255 }); sc.light({ x, y, z: 6, r: 14, i: 0.5, c: '#6ad6c0', tint: 0.6 }); });
    S.lay('back'); [[2, 30, 22], [276, 50, 22]].forEach(([x, top, w]) => { S.beg(); S.cyl(x, top, w, FY - top, 'stone', 5.2, { rim: 2.4 }); S.poly([[x, top], [x + w, top + 4], [x + w * 0.6, top - 5], [x + w * 0.3, top + 2]], 'stone', 6); S.end(); for (let y = top + 10; y < FY; y += 14) S.hl(x, y, w, 'stone', 3.6); });
    [36, 264].forEach(x => { S.beg(); S.line(x - 6, 114, x - 8, 147, 'iron', 4); S.line(x + 6, 114, x + 8, 147, 'iron', 3); S.ell(x, 112, 9, 4, 'iron', 5.5, { dome: 1 }); S.hl(x - 9, 109, 19, 'iron', 8); S.end(); });
    // ── the colossus in warm stone: lap, knees, arms, torso slab, shoulders (the head is live: it nods) ──
    const m = 'mstone';
    S.lay('back');
    carve(S, [[70, 148], [230, 148], [222, 128], [196, 120], [104, 120], [78, 128]], m, 6.6, { k: 1.2 });                     // draped lap
    for (let x = 80; x < 222; x += 6) { let xx = x; for (let y = 124; y < 148; y++) { if ((y + x) % 4 === 0) xx += Math.sign(150 - x); S.px(xx, y, m, 3.2); S.px(xx + 1, y, m, 6.4); } }   // folds
    carve(S, [[80, 136], [118, 136], [122, 118], [112, 108], [86, 110], [78, 122]], m, 7.4);                                  // left knee
    carve(S, [[182, 136], [220, 136], [222, 122], [214, 110], [188, 108], [178, 118]], m, 6.4);                              // right knee
    carve(S, [[108, 60], [192, 60], [196, 126], [104, 126]], m, 6.8, { k: 1.4 });                                             // torso slab
    carve(S, [[86, 62], [108, 56], [112, 70], [104, 112], [88, 116], [80, 104]], m, 7.6);                                     // left arm
    carve(S, [[192, 56], [214, 62], [220, 104], [212, 116], [196, 112], [188, 70]], m, 6);                                  // right arm
    carve(S, [[84, 108], [110, 106], [114, 118], [104, 124], [86, 122]], m, 8); carve(S, [[190, 106], [216, 108], [214, 122], [196, 124], [186, 118]], m, 6.6);   // hands
    [[88, 118], [94, 120], [100, 120], [196, 120], [202, 120], [208, 118]].forEach(([x, y]) => S.vl(x, y, 4, m, 2.6));
    carve(S, [[96, 64], [118, 50], [182, 50], [204, 64], [196, 70], [104, 70]], m, 7.8, { k: 1.4, kv: 0.6 });                // shoulders
    facetTone(S, 70, 50, 162, 98, m, 8, 0.9, 41);
    // moss and cracks
    for (let i = 0; i < 110; i++) { const x = 78 + Math.floor(S.r() * 144), y = 50 + Math.floor(S.r() * 96); if (S.at(x, y) && !S.at(x, y - 2)) { S.px(x, y, 'moss', 6 + S.r() * 1.6); S.px(x, y + 1, 'moss', 4.6); if (S.r() < 0.4) S.px(x + 1, y + 1, 'moss', 3.5); } }
    for (let i = 0; i < 50; i++) { const x = 96 + Math.floor(S.r() * 108), y = 50 + Math.floor(S.r() * 8); if (S.at(x, y)) { S.px(x, y, 'moss', 6 + S.r()); if (S.r() < 0.5) S.px(x, y + 1, 'moss', 4.5); } }
    CRACKS.forEach(c => { for (let k = 0; k + 1 < c.length; k++) S.line(c[k][0], c[k][1], c[k + 1][0], c[k + 1][1], m, 1.8); });
    S.ell(ST.x, ST.y, ST.R[0] + 2, ST.R[0] + 2, m, 1.6);   // the dial's recess
    S.lay('mid'); S.beg(); S.poly([[146, 53], [154, 53], [150, 59]], 'brass', 7.5, { n: [0, -0.6] }); S.hl(146, 53, 9, 'brass', 9.5); S.end();
    // ── floor and candles ──
    S.lay('wall'); TX.tiles(S, 0, FY, W, H - FY, 'stone', 4.2, { s: 14, v: 1, gloss: false });
    for (let i = 0; i < 16; i++) { const x = 10 + i * 18, y = 156 + (i % 2) * 8; S.rect(x, y, 5, 1, 'stone', 2.6); S.rect(x + 2, y - 2, 1, 5, 'stone', 2.6); }
    for (let i = 0; i < 8; i++) { const x = 104 + i * 13 + (i >= 4 ? 2 : 0); S.lay('front'); S.beg(); S.rect(x, 143, 3, 8, 'bone', 8.5); S.px(x, 143, 'bone', 10); S.rect(x - 1, 150, 5, 2, 'bone', 6); S.end(); }
    sc.shaft({ x: 200, dx: -44, y0: 0, y1: 100, w0: 12, w1: 20, i: 0.4, haze: 0.5, c: '#c8dcff', f: (t) => 0.8 + 0.2 * Math.sin(t * 0.9) });
    sc.emit({ k: 'dust', x: 170, y: 60, w: 50, h: 80, rate: 5, sp: 2, life: 3.5 });
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, sh = mg.sh || {}, wake = mg.phase === 'wake', m = 'mstone';
    [36, 264].forEach((x, i) => tealFlame(D, x, 108, 8 + (wake ? 3 : 0), T, i * 2));
    // ── the head: stepped crown, brow, closed eyes, nose, mustache, a long carved beard; lifts and nods when it wakes ──
    const hy = wake ? (mg.pt < 0.9 ? -Math.round(Math.min(1, mg.pt / 0.5) * 2) : mg.pt < 1.3 ? 1 : mg.pt < 1.6 ? -1 : 0) : 0;
    D.lay('back');
    D.beg(); D.poly([[134, 26 + hy], [134, 14 + hy], [139, 18 + hy], [143, 9 + hy], [147, 16 + hy], [150, 6 + hy], [153, 16 + hy], [157, 9 + hy], [161, 18 + hy], [166, 14 + hy], [166, 26 + hy]], m, 6.8, { n: [0, -0.5] }); D.hl(134, 24 + hy, 33, m, 4); D.hl(134, 21 + hy, 33, m, 8.4); D.end();
    D.beg(); for (let y = 25; y <= 50; y++) { const q = (y - 25) / 25, w = Math.round(15 + (q > 0.35 && q < 0.6 ? 1 : 0) - Math.max(0, q - 0.62) * 14); for (let x = -w; x <= w; x++) { const cb = q > 0.42 && q < 0.56 && Math.abs(Math.abs(x) - 9) < 2.5; D.px(150 + x, y + hy, m, 7.6 - x / w * 2.2 - (q > 0.86 ? 1.2 : 0) + (cb ? (x < 0 ? 1.2 : 0.4) : 0) - (Math.abs(x) === w ? 1 : 0), { n: [x / (w + 1) * 0.7, (q - 0.4) * 0.6] }); } } D.end();
    D.px(135, 36 + hy, m, 5); D.px(135, 37 + hy, m, 4); D.px(165, 36 + hy, m, 3); D.px(165, 37 + hy, m, 2.5);   // ears
    D.hl(137, 32 + hy, 11, m, 8.6); D.hl(152, 32 + hy, 11, m, 7.6); D.hl(137, 33 + hy, 11, m, 3); D.hl(152, 33 + hy, 11, m, 2.6);   // brow ridge and its shadow
    D.rect(148, 34 + hy, 4, 9, m, 7.4); D.vl(148, 34 + hy, 9, m, 8.6); D.vl(151, 34 + hy, 9, m, 4.6); D.hl(147, 43 + hy, 6, m, 3.2); D.px(147, 42 + hy, m, 3.6); D.px(152, 42 + hy, m, 3.2);   // nose
    D.beg(); for (let y = 44; y <= 66; y++) { const q = (y - 44) / 22, w = Math.round(12 - q * 8 + (q < 0.2 ? q * 6 : 0)); for (let x = -w; x <= w; x++) D.px(150 + x + Math.round(Math.sin(q * 3) * q), y + hy, m, (x % 3 === 0 ? 5 : 7) - x / (w + 1) * 1.4 - q * 0.8, { n: [x / (w + 1) * 0.6, 0.3] }); } D.end();   // beard
    D.hl(142, 45 + hy, 7, m, 7.4); D.hl(151, 45 + hy, 7, m, 6.4); D.hl(145, 47 + hy, 10, m, 2.4);   // mustache, mouth
    for (let i = 0; i < 12; i++) D.px(136 + (i * 7) % 29, 12 + (i * 5) % 14 + hy, 'moss', 5.5 + (i % 2));
    // eyes: shut asleep; at a reach the lids leak light on each heartbeat; awake they blaze
    const beat = sh.tense ? Math.max(0, 1 - (sh.beatT || 9) * 5) : 0, eye = wake ? clamp((mg.pt - 0.12) / 0.4, 0, 1) : 0;
    ST.eye.forEach(([ex, ey]) => { D.rect(ex - 4, ey - 1 + hy, 9, 3, m, 2.6);
      if (eye > 0) { D.rect(ex - 4, ey - 1 + hy, 9, 3, 'teal', 8 + eye * 3, { e: 255 }); D.hl(ex - 3, ey + hy, 7, 'bone', 10, { e: 255 }); rs.dl.push({ x: ex, y: ey + hy, z: 14, r: 30 + eye * 34, i: 0.6 + eye, rgb: [120, 240, 220], tint: 0.6 }); }
      else { D.hl(ex - 4, ey + hy, 9, 'ink', 0.6); D.hl(ex - 3, ey - 1 + hy, 7, m, 6); if (beat > 0.15) { D.hl(ex - 3, ey + 1 + hy, 7, 'teal', 7 + beat * 4, { e: 255 }); rs.dl.push({ x: ex, y: ey + 1, z: 12, r: 18, i: beat * 0.8, rgb: [120, 240, 220], tint: 0.6 }); } } });
    // ── cracks light from the chest outward: two per locked ring, all of them once awake ──
    const al = (mg.rot || [1, 1, 1]).filter(v => v === 0).length, lit = wake ? CRACKS.length * clamp(mg.pt / 0.8, 0, 1) : al * 2 * (0.65 + 0.35 * Math.sin(T * 2));
    CRACKS.forEach((c, ci) => { const a = clamp(lit - ci, 0, 1); if (a <= 0) return; for (let k = 0; k + 1 < c.length; k++) D.line(c[k][0], c[k][1] + (ci === 0 ? hy : 0), c[k + 1][0], c[k + 1][1] + (ci === 0 ? hy : 0), 'teal', 6 + a * 5, { e: 255 }); });
    // ── the rings: carved warm stone, bevelled; a rune groove round the middle; a quarter turn tweens with an overshoot;
    //    when a ring is set its groove lights teal from the tooth round both ways ──
    const rot = mg.rot || [1, 2, 3], an = mg.anim || [0, 0, 0], lk = mg.lk || [0, 0, 0];
    D.lay('mid');
    [0, 1, 2].forEach(i => { const R0 = ST.R[i], R1 = i < 2 ? ST.R[i + 1] + 2 : 0, q = 1 - an[i], ov = an[i] > 0 ? Math.sin(q * Math.PI) * 0.1 : 0, ang = (rot[i] - an[i] + ov) * Math.PI / 2;
      const on = wake || (rot[i] === 0 && !an[i]), sweep = lk[i] > 0 ? 1 - lk[i] : 1, hov = mg.hovRing === i && mg.phase === 'idle', lift = hov ? -1 : 0, t0 = [6, 6.8, 7.4][i], gr = i < 2 ? (R0 + R1) / 2 : 9;
      D.beg();
      for (let y = -R0; y <= R0; y++) for (let x = -R0; x <= R0; x++) { const d = Math.hypot(x + 0.5, y + 0.5); if (d > R0 || d < R1) continue; const th = Math.atan2(x + 0.5, -(y + 0.5)), phi = ((th - ang) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2), seg = phi / (Math.PI / 6), f = seg - Math.floor(seg);
        let tt = t0 - (x * 0.4 + y * 0.6) / R0 * 1.7; if (d > R0 - 1.2) tt += (x + y < 0 ? 1.6 : -2.2); else if (i < 2 && d < R1 + 1.2) tt += (x + y < 0 ? -2 : 1.2);
        const groove = Math.abs(d - gr) < 0.7, glyph = !groove && Math.abs(d - gr) < 3.2 && f > 0.3 && f < 0.7 && ((Math.floor(seg) + i) % 3 !== 1 ? Math.abs(d - gr) < 2.2 : f > 0.42 && f < 0.58);
        if ((groove || glyph) && on && (phi / (Math.PI * 2) < sweep / 2 || phi / (Math.PI * 2) > 1 - sweep / 2)) D.px(ST.x + x, ST.y + y + lift, 'teal', (groove ? 10 : 9) + Math.sin(T * 5 + seg) * 0.8, { e: 255 });
        else D.px(ST.x + x, ST.y + y + lift, m, groove ? tt - 3 : glyph ? tt - 2.4 : tt, { n: [x / R0 * 0.7, y / R0 * 0.7] });
      }
      D.end();
      // direction mark at the ring's own 12 o'clock: arrows on the outer two, an eye on the inner; gold while off, teal once set
      const mr = i < 2 ? R0 - 4 : 7, mx = ST.x + Math.round(Math.sin(ang) * mr), my = ST.y - Math.round(Math.cos(ang) * mr) + lift, mm = on ? 'teal' : 'gold', mt = on ? 10 : 8.5, ex = on ? { e: 255 } : undefined, ux = Math.sin(ang), uy = -Math.cos(ang);
      if (i === 2) { D.ell(ST.x, ST.y + lift, 4.5, 3.2, mm, mt - 1, ex); D.ell(ST.x, ST.y + lift, 1.6, 1.6, 'ink', 0); D.px(ST.x + Math.round(ux * 2), ST.y + lift + Math.round(uy * 2), mm, mt + 1, ex); }
      else for (let k = 0; k < 4; k++) for (let j = -k; j <= k; j++) D.px(mx + Math.round(ux * (1 - k) - uy * j), my + Math.round(uy * (1 - k) + ux * j), mm, mt - k * 0.5, ex);
      if (an[i] > 0.2 && Math.random() < 0.6) rs.burst('dust', ST.x + (Math.random() - 0.5) * R0 * 2, ST.y + R0 - 2, 2, { sp: 6, life: 1 });
    });
    // candles: one goes out per turn used (a thin smoke), the last two burn red
    const mv = mg.moves == null ? 8 : mg.moves, low = mv <= 2 && mg.phase === 'idle';
    D.lay('front'); for (let i = 0; i < 8; i++) { const x = 105 + i * 13 + (i >= 4 ? 2 : 0); if (i < mv || wake) { D.px(x, 142, low ? 'red' : 'fire', 10 + Math.sin(T * 13 + i) * 0.6, { e: 255 }); D.px(x, 141, low ? 'red' : 'fire', 8, { e: 255 }); } else if (Math.random() < 0.05) rs.burst('steam', x, 141, 1, { sp: 4, ang: 0, spread: 0.2, life: 1.4 }); }
    if (wake && mg.pt < 1.4) { if (Math.random() < 0.9) rs.burst('dust', 150 + (Math.random() - 0.5) * 120, 54 + Math.random() * 20, 3, { sp: 10, life: 1.4 }); if (Math.random() < 0.4) rs.burst('leaf', 150 + (Math.random() - 0.5) * 100, 56, 1, { sp: 8, life: 1.6 }); }
    if (wake) { const fr = clamp((mg.pt - 0.6) / 1, 0, 1); D.lay('wall'); for (let i = 0; i < 16; i++) { const x = 10 + i * 18, y = 156 + (i % 2) * 8, d = Math.abs(x - 150) / 150; if (d < fr) { D.rect(x, y, 5, 1, 'teal', 9, { e: 255 }); D.rect(x + 2, y - 2, 1, 5, 'teal', 9, { e: 255 }); } } }
  },
});

// ═════════════════════ 黑市 · the market under the bridge ═════════════════════
// a rainy night under a stone bridge: wet brick with rusty dripping pipes and torn wanted posters, the bridge arch overhead with
// rain coming through its gap, cobbles with puddles that mirror the green ghost-lantern (broken up by the rain), crates and a rat.
// The stall: a tattered violet canopy hung with bottles, a skull and charms; a table under a violet cloth; on it a wax-sealed
// blueprint scroll (left), the brass bell you slap to close the price (middle) and a mechanical price scale — brass case,
// three enamel bands, a bone needle, glass with a glint, a little abacus base (right). The dealer (a pixel-cast character)
// stands behind the table.
const MK = { dial: [212, 96, 30], scroll: [80, 104], bell: [150, 114], lantern: [132, 58], table: [46, 254, 112] };
MD.MARKET = MK;
X.def('mini_market', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.18, 0.22],
  paint(S, sc) {
    sc.light({ x: MK.lantern[0], y: MK.lantern[1] + 6, z: 24, r: 110, i: 1.25, c: '#6af0a0', fl: 'candle', tint: 0.6 });   // 0 the ghost lantern
    sc.light({ x: 40, y: 20, z: 40, r: 90, i: 0.35, c: '#8fa8ff', tint: 0.3 });                                               // 1 cold street glow through the bridge gap
    sc.light({ x: 212, y: 96, z: 14, r: 34, i: 0.35, c: '#ffcf70', tint: 0.4 });                                              // 2 the scale's brass (kicked on a slap)
    sc.light({ x: 80, y: 104, z: 12, r: 30, i: 0.2, c: '#9ab8ff', tint: 0.5 });                                               // 3 the scroll (its omen glow)
    // ── wall: wet brick, pipes, posters; the bridge arch across the top with a gap where the rain comes in ──
    S.lay('wall'); TX.bricks(S, 0, 0, W, FY, 'brick', 2.8, { bw: 12, bh: 6, v: 1.2, chip: 0.2 }); S.noise(0, 0, W, FY, 0.8, 3, 51, { only: 'brick' }); S.ao(0, 0, W, 60, 't', 1.4); S.ao(0, 0, 40, FY, 'l', 1.2); S.ao(W - 40, 0, 40, FY, 'r', 1.2);
    for (let x = 0; x < W; x += 5) { const len = 6 + ((x * 7) % 13); for (let k = 0; k < len; k++) S.tone(x, 30 + k + ((x * 3) % 40), 1); }   // wet streaks
    S.lay('back'); S.beg(); for (let x = 0; x < W; x++) { const top = x < 120 ? 0 : Math.round(26 - Math.sqrt(Math.max(0, 1 - ((x - 210) / 90) ** 2)) * 20); for (let y = 0; y < top + (x >= 120 ? 0 : 10); y++) S.px(x, y, 'stone', 4.4 - y * 0.04); } S.end();
    S.beg(); for (let x = 120; x < W; x++) { const y = Math.round(26 - Math.sqrt(Math.max(0, 1 - ((x - 210) / 90) ** 2)) * 20); for (let k = 0; k < 4; k++) S.px(x, y + k, 'stone', 6 - k * 0.8 + ((x >> 3) % 2 ? 0.4 : 0)); } S.end();
    for (let x = 60; x < 120; x++) for (let y = 0; y < 10; y++) S.px(x, y, 'night', 2 + y * 0.1, { e: 255 });   // the gap to the sky
    S.beg(); S.hcyl(0, 44, 70, 4, 'iron', 4.6, { rim: 1.4 }); S.cyl(66, 44, 4, 60, 'iron', 4.2, { rim: 1.4 }); S.rect(64, 60, 8, 3, 'iron', 6); S.end();
    S.beg(); S.cyl(270, 30, 5, 118, 'copper', 3.6, { rim: 1.6 }); S.rect(268, 70, 9, 3, 'copper', 5); S.end();
    [[22, 64, 14, 18], [236, 58, 16, 20]].forEach(([x, y, w, h], i) => { S.beg(); S.rect(x, y, w, h, 'paper', 7.4 - i * 0.6); S.ell(x + w / 2, y + 7, 3.5, 4, 'paper', 4.2); S.rect(x + 2, y + h - 5, w - 4, 1, 'paper', 4.6); S.rect(x + 3, y + h - 3, w - 6, 1, 'paper', 4.6); S.poly([[x + w, y + h], [x + w - 5, y + h], [x + w, y + h - 6]], 'brick', 3.6); S.end(); });
    // ── floor: wet cobbles, puddles ──
    S.lay('wall'); TX.ashlar(S, 0, FY, W, H - FY, 'stone', 3.4, { bh: 4, bw: 9, crack: 0 });
    [[70, 162, 22, 3], [196, 166, 18, 2.5], [138, 172, 12, 1.6]].forEach(([x, y, rx, ry]) => S.ell(x, y, rx, ry, 'water', 2.6, { n: [0, -0.95] }));
    // ── crates and the rat's hole ──
    S.lay('back'); [[260, 118, 34, 30], [266, 92, 26, 26]].forEach(([x, y, w, h]) => { S.beg(); TX.vplanks(S, x, y, w, h, 'wood', 4.6, { pw: 5 }); S.hl(x, y, w, 'wood', 6.4); S.line(x, y, x + w - 1, y + h - 1, 'wood', 3.4); S.end(); });
    S.ell(8, 146, 4, 2.4, 'ink', 0);
    // ── the canopy: a tattered violet cloth on two poles ──
    S.lay('mid'); [[48, 40], [252, 40]].forEach(([x, y]) => { S.beg(); S.rect(x - 1, y, 3, 72, 'wood', 4.6); S.px(x - 1, y, 'wood', 7); S.end(); });
    S.beg(); for (let x = 42; x <= 258; x++) { const sag = Math.round(Math.sin((x - 42) / 216 * Math.PI) * 5), top = 36 + sag, bot = top + 10 + ((x * 7) % 5 === 0 ? 3 : 0) - ((x * 11) % 7 === 0 ? 2 : 0); for (let y = top; y < bot; y++) S.px(x, y, 'magic', 6 - (y - top) * 0.3 + ((x >> 2) % 2 ? 0.6 : 0), { n: [0, -0.4] }); } S.end();
    for (let x = 44; x < 258; x += 9) S.vl(x, 38 + Math.round(Math.sin((x - 42) / 216 * Math.PI) * 5), 8, 'magic', 3.4);
    // ── the table: violet cloth with a gold fringe over a heavy board ──
    const [tx0, tx1, ty] = MK.table;
    S.beg(); S.box(tx0, ty, tx1 - tx0, 4, 'wood', 5.6, { top: 2 }); S.end();
    S.beg(); for (let x = tx0 + 2; x < tx1 - 2; x++) { const hang = 20 + Math.round(Math.sin(x * 0.4) * 1.5); for (let y = ty + 2; y < ty + hang; y++) S.px(x, y, 'magic', 5.2 - (y - ty) * 0.06 + (Math.sin(x * 0.8) > 0.6 ? 0.8 : Math.sin(x * 0.8) < -0.6 ? -0.8 : 0), { n: [Math.sin(x * 0.8) * 0.5, 0] }); if (x % 3 === 0) S.px(x, ty + hang, 'gold', 6); } S.end();
    for (let x = tx0 + 8; x < tx1 - 8; x += 24) { S.ell(x, ty + 11, 3, 3, 'gold', 5, { ring: 1 }); S.px(x, ty + 11, 'gold', 7); }
    S.lay('back'); S.rect(tx0 + 4, ty + 22, 3, FY - ty - 22, 'wood', 3); S.rect(tx1 - 7, ty + 22, 3, FY - ty - 22, 'wood', 3);
    // things on the table that never move: a candle stub, a pile of coins, a knife stuck in the board
    S.lay('mid'); S.beg(); S.rect(60, ty - 5, 3, 5, 'bone', 7); S.end(); S.beg(); for (let i = 0; i < 7; i++) S.hl(170 + (i % 3) * 3, ty - 1 - Math.floor(i / 3), 3, 'gold', 7 + (i % 2)); S.end();
    S.beg(); S.line(236, ty - 9, 238, ty, 'iron', 8); S.rect(234, ty - 13, 4, 4, 'wood', 5); S.end();
    // ── the scale: brass case (a half disc standing on a little abacus), enamel bands, ticks; needle and glass are live ──
    const [dx, dy, dr] = MK.dial;
    S.lay('mid'); S.beg(); S.box(dx - dr - 4, dy + 2, (dr + 4) * 2, 12, 'wood', 4.4, { top: 1 }); for (let r = 0; r < 2; r++) { S.hl(dx - dr, dy + 5 + r * 4, dr * 2, 'brass', 6); for (let k = 0; k < 9; k++) S.ell(dx - dr + 4 + k * 7 + (r ? 3 : 0), dy + 5 + r * 4, 1.4, 1.4, 'wood', 7.5, { dome: 1 }); } S.end();
    S.beg(); for (let y = dy - dr - 3; y <= dy + 1; y++) for (let x = dx - dr - 3; x <= dx + dr + 3; x++) { const d = Math.hypot(x + 0.5 - dx, y + 0.5 - dy); if (d > dr + 3) continue; S.px(x, y, 'brass', d > dr ? 6.4 - (x - dx) / dr * 1.6 + (y - dy) / dr * 1 : 2.6, { n: [(x - dx) / dr * 0.6, (y - dy) / dr * 0.6] }); } S.end();
    const bands = [[0, 1 / 3, 'screen', 7], [1 / 3, 2 / 3, 'lamp', 8], [2 / 3, 1, 'red', 6.5]];
    for (let y = dy - dr; y <= dy; y++) for (let x = dx - dr; x <= dx + dr; x++) { const d = Math.hypot(x + 0.5 - dx, y + 0.5 - dy); if (d > dr - 2 || d < dr - 10) continue; const a = Math.atan2(y + 0.5 - dy, x + 0.5 - dx), f = (a + Math.PI) / Math.PI; if (f < 0 || f > 1) continue; const b = bands.find(bb => f >= bb[0] && f <= bb[1]); S.px(x, y, b[2], b[3] - (d < dr - 8 ? 1.5 : 0) + (d > dr - 3 ? 1 : 0)); }
    for (let k = 0; k <= 12; k++) { const a = Math.PI + k / 12 * Math.PI; S.line(dx + Math.cos(a) * (dr - 11), dy + Math.sin(a) * (dr - 11), dx + Math.cos(a) * (dr - (k % 3 ? 13 : 15)), dy + Math.sin(a) * (dr - (k % 3 ? 13 : 15)), 'bone', k % 3 ? 7 : 9); }
    // the bell's cradle
    S.beg(); S.box(MK.bell[0] - 7, ty - 2, 14, 2, 'wood', 4); S.end();
    sc.emit({ k: 'drip', x: 68, y: 64, w: 2, rate: 0.9, sp: 0, life: 2, floor: 150 });
    sc.emit({ k: 'drip', x: 272, y: 74, w: 2, rate: 0.6, sp: 0, life: 2, floor: 150 });
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, tq = q12(T), [tx0, tx1, ty] = MK.table, slap = mg.slapT != null ? T - mg.slapT : 9, jump = slap < 0.12 ? 1 : 0;
    // rain: steady diagonal streaks, pushed away for a moment by a reveal's shock
    const clr = mg.clearT != null && T - mg.clearT < 0.6 ? { x: MK.scroll[0], y: MK.scroll[1], r: (T - mg.clearT) * 260 } : null;
    D.lay('front'); for (let i = 0; i < 120; i++) { const sp = 150 + (i % 7) * 12, y = ((i * 53.7 + T * sp) % 190) - 10, x = ((i * 37.3 + T * sp * 0.25) % 310) - 5; if (y < 8 && x > 120) continue; if (clr && Math.hypot(x - clr.x, y - clr.y) < clr.r) continue; D.px(x, y, 'ice', 7 + (i % 3)); D.px(x - 0.25, y - 1, 'ice', 5.5); D.px(x - 0.5, y - 2, 'ice', 4); }
    if (Math.random() < 0.7) rs.burst('drip', Math.random() * 300, 150 + Math.random() * 20, 1, { sp: 20, life: 0.2, floor: 151 + Math.random() * 20 });
    // puddles mirror the ghost lantern, the reflection broken by the rain
    D.lay('wall'); [[70, 162, 22], [196, 166, 18], [138, 172, 12]].forEach(([x, y, rx], pi) => { for (let k = -rx + 2; k < rx - 2; k++) { const wob = Math.sin(T * 6 + k * 0.7 + pi) > 0.3, near = Math.abs(x + k - MK.lantern[0]) < 16; if (near && wob) D.px(x + k, y + (k % 2), 'screen', 7 - Math.abs(x + k - MK.lantern[0]) / 5, { e: 255 }); else if ((k + Math.floor(T * 4)) % 9 === 0) D.px(x + k, y, 'water', 7, { e: 255 }); } });
    // the rat now and then
    const rp = steps(T, 11); if (rp < 0.25) { const rx = 10 + rp * 4 * 250; D.lay('mid'); D.beg(); D.rect(rx, 146, 6, 3, 'hair', 4); D.px(rx + 6, 147, 'hair', 5); D.px(rx + 7, 148, 'candy', 7); D.line(rx - 1, 148, rx - 5, 147 - Math.round(Math.sin(T * 20)), 'candy', 5); D.end(); }
    // the canopy's trinkets sway; the ghost lantern flickers green
    D.lay('mid'); [[64, 'bottle'], [92, 'skull'], [178, 'charm'], [200, 'bottle2'], [232, 'bat']].forEach(([x, k], i) => { const sw = Math.round(Math.sin(T * 1.8 + i * 1.3) * 1.5), y0 = 44 + Math.round(Math.sin((x - 42) / 216 * Math.PI) * 5); D.beg(); D.line(x, y0, x + sw, y0 + 7, 'wood', 3); D.end({ none: 1 }); const y = y0 + 8;
      if (k === 'bottle' || k === 'bottle2') { D.beg(); D.rect(x + sw - 2, y, 5, 6, k === 'bottle' ? 'teal' : 'crimson', 6); D.rect(x + sw - 1, y - 2, 3, 2, 'glass', 6); D.px(x + sw - 1, y + 1, 'glass', 10); D.end(); }
      else if (k === 'skull') { D.beg(); D.ell(x + sw, y + 2, 3, 3, 'bone', 8, { dome: 1 }); D.px(x + sw - 1, y + 2, 'ink', 0); D.px(x + sw + 1, y + 2, 'ink', 0); D.hl(x + sw - 1, y + 5, 3, 'bone', 6); D.end(); }
      else if (k === 'charm') { D.beg(); D.ell(x + sw, y + 2, 3, 3, 'gold', 7, { ring: 1 }); D.px(x + sw, y + 2, 'red', 8); D.end(); }
      else { D.beg(); D.poly([[x + sw - 5, y], [x + sw, y + 3], [x + sw + 5, y], [x + sw + 3, y + 3], [x + sw, y + 5], [x + sw - 3, y + 3]], 'hair', 4); D.end(); } });
    const [lx, ly] = MK.lantern; D.beg(); D.line(lx, 40, lx, ly - 4, 'iron', 4); D.box(lx - 4, ly - 4, 9, 2, 'iron', 6); for (let k = 0; k < 8; k++) { const w = k < 2 || k > 5 ? 3 : 4; D.rect(lx - w, ly - 2 + k, w * 2 + 1, 1, 'glass', 3); } D.box(lx - 4, ly + 6, 9, 2, 'iron', 5); D.end();
    for (let k = 0; k < 5; k++) { const f = 0.8 + 0.25 * n1(T * 9 + k); D.px(lx + Math.round(n1(T * 4 + k) * 1.4), ly + 3 - Math.round(k * f), 'screen', 10 - k, { e: 255 }); D.px(lx - 1 + (k & 1), ly + 4 - Math.round(k * f * 0.7), 'teal', 9 - k, { e: 255 }); }
    // the scroll: rolled with a red wax seal; before the reveal it shakes in its omen colour and light leaks from the seal; then it unrolls
    const B = mg.bq || {}, [sx, sy] = MK.scroll, sk = B.sk || 0, jx = Math.round(Math.sin(T * 50) * sk), op = B.open != null ? T - B.open : -1;
    D.lay('mid');
    if (!mg.bq) { /* the scroll is on the table only once the dealer slaps it down */ }
    else if (op < 0) { const yy = sy - jump; D.beg(); D.hcyl(sx - 14 + jx, yy - 3, 28, 7, 'paper', 7.4, { rim: 2 }); D.rect(sx - 15 + jx, yy - 3, 2, 7, 'wood', 5); D.rect(sx + 13 + jx, yy - 3, 2, 7, 'wood', 5); D.end();
      D.ell(sx + jx, yy, 3.2, 3.2, 'red', 6.5, { dome: 1 }); D.px(sx - 1 + jx, yy - 1, 'red', 9);
      if (B.qc) { D.ell(sx + jx, yy, 2, 2, B.qc[0], B.qc[1], { e: 255 }); D.hl(sx - 12 + jx, yy - 3, 24, B.qc[0], B.qc[1] - 2, { e: 255 }); rs.dl.push({ x: sx, y: yy, z: 10, r: 26 + sk * 8, i: 0.6 + sk * 0.3, rgb: B.qc[2], tint: 0.6 }); } }
    else { const un = clamp(op / 0.3, 0, 1), hh = Math.round(4 + un * 30), top = sy - 6 - hh; D.beg(); D.rect(sx - 15, top, 30, hh, 'water', 4); D.hcyl(sx - 16, top - 2, 32, 3, 'wood', 5, { rim: 1 }); D.hcyl(sx - 16, top + hh, 32, 3, 'wood', 5, { rim: 1 }); D.end();
      if (un > 0.6) { for (let k = 0; k < 5; k++) D.hl(sx - 11, top + 4 + k * 5, 14 + (k % 2) * 6, 'water', 9, { e: 255 }); D.rect(sx + 6, top + 6, 6, 6, 'water', 8, { e: 255 }); D.ell(sx + 8.5, top + 20, 3, 3, 'water', 9, { ring: 1, e: 255 }); }
      if (B.qc) rs.dl.push({ x: sx, y: top + hh / 2, z: 14, r: 50, i: Math.max(0, 1.2 - op * 0.4), rgb: B.qc[2], tint: 0.6 }); }
    // the bell: jumps and rings when slapped; a hand comes down on it from the bottom of the stage
    const [bx, by] = MK.bell; D.beg(); D.ell(bx, by - 3 - jump, 5.5, 4, 'brass', 7, { dome: 1 }); D.rect(bx - 6, by - 1 - jump, 13, 2, 'brass', 5); D.px(bx, by - 8 - jump, 'brass', 9); D.px(bx - 2, by - 5 - jump, 'brass', 11); D.end();
    if (slap < 0.35) { const hy = slap < 0.08 ? by - 12 + Math.round(slap / 0.08 * 6) : by - 6 + Math.round((slap - 0.08) / 0.27 * 40); D.lay('front'); D.beg(); D.rect(bx - 7, hy + 8, 14, H - hy, 'leather', 3.8); D.hl(bx - 7, hy + 8, 14, 'leather', 5); for (let k = 0; k < 4; k++) { D.rect(bx - 7 + k * 4, hy - 1 + (k === 0 || k === 3 ? 1 : 0), 3, 9, 'leather', 5.6 - k * 0.3); D.px(bx - 7 + k * 4, hy - 1 + (k === 0 || k === 3 ? 1 : 0), 'leather', 7.5); } D.rect(bx - 9, hy + 4, 3, 6, 'leather', 5); D.hl(bx - 7, hy + 6, 14, 'brass', 7); D.end(); if (slap < 0.05) rs.burst('glint', bx, by - 6, 6, { sp: 30, life: 0.3 }); }
    // the scale's needle (bone), a trembling stop, the glass glint sweeping; the green band flashes when the needle crosses it
    const [dx, dy, dr] = MK.dial, nd = mg.dialN != null ? mg.dialN : 0.5, a = Math.PI + clamp(nd, 0, 1) * Math.PI; D.lay('mid');
    if (mg.phase === 'swing' && nd < 1 / 3) for (let k = 0; k < 10; k++) { const aa = Math.PI + k / 30 * Math.PI; D.px(dx + Math.round(Math.cos(aa) * (dr - 1)), dy + Math.round(Math.sin(aa) * (dr - 1)), 'screen', 10, { e: 255 }); }
    D.beg(); D.line(dx, dy - jump, dx + Math.cos(a) * (dr - 4), dy - jump + Math.sin(a) * (dr - 4), 'bone', 9); D.line(dx + 1, dy - jump, dx + 1 + Math.cos(a) * (dr - 8), dy - jump + Math.sin(a) * (dr - 8), 'bone', 6); D.end(); D.ell(dx, dy - jump, 2.4, 2.4, 'brass', 8, { dome: 1 });
    const gl = steps(T, 3.5); if (gl < 0.3) { const ga = Math.PI + gl / 0.3 * Math.PI; for (let r = 6; r < dr - 2; r += 2) D.px(dx + Math.round(Math.cos(ga) * r), dy + Math.round(Math.sin(ga) * r), 'glass', 11, { e: 255 }); }
  },
});

// ═════════════════════ 地下拳馆 · the basement gym ═════════════════════
// red-brown brick with faded fight posters, a chalk tally board, a caged lamp on a chain that swings with every punch (its
// light swings with it), cigar smoke in the lamp's cone; the corner of a ring (red / white / blue ropes, a brass post with
// the bell on it), a dumbbell rack, a skipping rope, a bucket with a towel; a stained canvas floor. The heavy bag: old
// leather with tape patches and stitching on a chain from the beam — squashes and swings, splits and leaks sand in fever,
// and on an S the chain snaps and it flies into the wall.
const GY = { len: 90, bag: [192, 18], lamp: [160, 4], board: [14, 46, 64, 40], post: 286, ropes: [78, 94, 110] };
MD.GYM = GY;
X.def('mini_gym', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.2, 0.24],
  paint(S, sc) {
    sc.light({ x: 160, y: 30, z: 30, r: 130, i: 1.2, c: '#ffd890', fl: 'buzz', ph: 1, tint: 0.35, bake: false });   // 0 the caged lamp (moved each frame by its swing: see anim)
    sc.light({ x: 286, y: 60, z: 16, r: 40, i: 0.4, c: '#ffcf70', tint: 0.4 });                                      // 1 the bell's brass (kicked when it rings)
    sc.light({ x: 40, y: 20, z: 40, r: 80, i: 0.3, c: '#8898ff', tint: 0.3 });                                        // 2 a cold window high on the left
    // ── wall ──
    S.lay('wall'); TX.bricks(S, 0, 0, W, FY, 'brick', 3.4, { bw: 11, bh: 5, v: 1.4, chip: 0.3 }); S.noise(0, 0, W, FY, 0.8, 4, 61, { only: 'brick' });
    S.ao(0, 0, W, 40, 't', 2); S.ao(0, 110, W, 38, 'b', 1.2);
    S.rect(28, 6, 24, 12, 'night', 3, { e: 255 }); S.rect(28, 11, 24, 1, 'iron', 4); S.rect(39, 6, 1, 12, 'iron', 4); S.hl(26, 18, 28, 'stone', 6);   // a barred window
    // faded fight posters (no words): two boxers squaring up, a fist, a belt
    const poster = (x, y, w, h, m, t, draw) => { S.lay('back'); S.beg(); S.rect(x, y, w, h, 'paper', t); S.hl(x, y, w, 'paper', t + 1.5); S.rect(x + 2, y + 2, w - 4, h - 10, m, 4.6); draw(x, y, w, h); S.rect(x + 3, y + h - 6, w - 6, 1, 'crimson', 5); S.rect(x + 5, y + h - 4, w - 10, 1, 'crimson', 4); S.poly([[x + w, y], [x + w - 5, y], [x + w, y + 5]], 'brick', 3); S.end(); };
    poster(92, 36, 22, 30, 'crimson', 6.4, (x, y) => { S.rect(x + 6, y + 8, 3, 10, 'ink', 1.5); S.rect(x + 13, y + 8, 3, 10, 'ink', 1.5); S.ell(x + 7, y + 6, 2, 2, 'ink', 1.5); S.ell(x + 14, y + 6, 2, 2, 'ink', 1.5); S.rect(x + 9, y + 10, 4, 2, 'ink', 1.5); });
    poster(226, 30, 20, 26, 'denim', 6, (x, y) => { S.ell(x + 10, y + 11, 5, 4, 'ink', 1.5); S.rect(x + 7, y + 14, 6, 4, 'ink', 1.5); });
    poster(122, 44, 16, 20, 'sand', 5.4, (x, y) => { S.rect(x + 3, y + 7, 10, 4, 'gold', 7); S.ell(x + 8, y + 9, 2, 2, 'red', 7); });
    // the chalk tally board
    const [bx, by, bw, bh] = GY.board; S.lay('back'); S.beg(); S.box(bx, by, bw, bh, 'wood', 5.4); S.rect(bx + 2, by + 2, bw - 4, bh - 4, 'leaf', 1.6); S.noise(bx + 2, by + 2, bw - 4, bh - 4, 0.6, 3, 62, { only: 'leaf' }); S.hl(bx + 4, by + bh + 1, 18, 'wood', 6); S.rect(bx + 30, by + bh, 6, 2, 'linen', 9); S.end();
    // skipping rope on a nail, a dumbbell rack, a bucket with a towel
    S.lay('back'); S.beg(); for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI; S.px(88 + Math.round(Math.cos(a) * 6), 94 + Math.round(Math.sin(a) * 18), 'red', 6); } S.rect(80, 92, 3, 5, 'wood', 6); S.rect(94, 92, 3, 5, 'wood', 6); S.end();
    S.lay('mid'); S.beg(); S.rect(12, 126, 44, 3, 'iron', 4); S.rect(14, 129, 2, 19, 'iron', 3); S.rect(52, 129, 2, 19, 'iron', 3); for (let k = 0; k < 3; k++) { const x = 18 + k * 12; S.rect(x, 120, 8, 2, 'iron', 6); S.box(x - 1, 117, 3, 7, 'iron', 4); S.box(x + 7, 117, 3, 7, 'iron', 4); } S.rect(12, 138, 44, 2, 'iron', 4); S.box(18, 132, 5, 6, 'iron', 3.4); S.box(36, 132, 5, 6, 'iron', 3.4); S.end();
    S.beg(); S.cyl(64, 132, 14, 16, 'iron', 4.6, { rim: 2 }); S.hcyl(64, 133, 14, 1, 'iron', 7); S.ell(71, 132, 7, 1.4, 'water', 4, { n: [0, -0.9] }); S.rect(66, 126, 5, 9, 'red', 6); S.hl(66, 126, 5, 'red', 8); S.end();
    // ── the ring's corner: brass post with the bell, three ropes ──
    S.lay('mid'); S.beg(); S.cyl(GY.post - 3, 56, 6, 92, 'brass', 5.4, { rim: 2 }); S.cyl(GY.post - 4, 54, 8, 3, 'brass', 8, { rim: 2 }); for (let k = 0; k < 3; k++) S.cyl(GY.post - 4, GY.ropes[k] - 2, 8, 4, 'linen', [4, 9, 6][k], { rim: 1.5 }); S.end();
    GY.ropes.forEach((y, k) => { S.beg(); for (let x = 214; x < GY.post - 3; x++) { const yy = y + Math.round(Math.sin((x - 214) / (GY.post - 217) * Math.PI) * 2); S.px(x, yy, k === 1 ? 'linen' : k === 0 ? 'red' : 'denim', k === 1 ? 9 : 6); S.px(x, yy + 1, k === 1 ? 'linen' : k === 0 ? 'red' : 'denim', k === 1 ? 6 : 3.6); } S.end(); });
    S.beg(); S.line(GY.post, 60, GY.post - 6, 64, 'iron', 5); S.ell(GY.post - 7, 68, 4, 3.5, 'brass', 7, { dome: 1 }); S.px(GY.post - 7, 72, 'brass', 4); S.end();
    // the beam the bag hangs from; canvas floor with stains and tape
    S.lay('back'); S.beg(); S.box(0, 12, W, 6, 'wood', 3.6, { top: 1 }); for (let x = 6; x < W; x += 24) { S.px(x, 14, 'iron', 7); S.px(x + 1, 15, 'iron', 3); } S.end();
    S.lay('wall'); S.rect(0, FY, W, H - FY, 'paper', 5.6); S.noise(0, FY, W, H - FY, 0.8, 3, 63, { only: 'paper' });
    [[60, 160, 9, 3], [210, 166, 12, 3], [150, 170, 6, 2]].forEach(([x, y, rx, ry]) => { S.ell(x, y, rx, ry, 'paper', 4.2, { n: [0, -0.9] }); S.ell(x + 2, y, rx * 0.5, ry * 0.5, 'paper', 3.6, { n: [0, -0.9] }); });
    S.rect(0, FY, W, 1, 'paper', 3); S.hl(100, 156, 30, 'paper', 8.6); S.hl(180, 162, 18, 'paper', 8.6);
    sc.emit({ k: 'dust', x: 160, y: 70, w: 90, h: 80, rate: 5, sp: 2, life: 3.4 });
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, tq = q12(T), s = rs.st, fev = mg.sh && mg.sh.fever;
    // the caged lamp: its chain, cage and bulb swing; the light follows the bulb; it flickers red in the last second
    const sw = (mg.lampSw || 0) * Math.sin(T * 5) + Math.sin(T * 0.9) * 0.04, [lx0, ly0] = GY.lamp, L = 26, bx = lx0 + Math.sin(sw) * L, by = ly0 + Math.cos(sw) * L, red = mg.phase === 'mash' && mg.pt > 3;
    D.lay('mid'); D.beg(); for (let k = 0; k < L; k += 2) D.px(lx0 + Math.sin(sw) * k, ly0 + Math.cos(sw) * k, 'iron', 5 + (k % 4 ? 0 : 2)); D.end({ none: 1 });
    D.beg(); D.box(bx - 4, by - 1, 9, 2, 'iron', 6); for (let k = 0; k < 6; k++) { D.px(bx - 4, by + 1 + k, 'iron', 4); D.px(bx + 4, by + 1 + k, 'iron', 4); if (k % 2) D.hl(bx - 4, by + 1 + k, 9, 'iron', 3); } D.hl(bx - 4, by + 7, 9, 'iron', 5); D.end();
    const bulb = red && Math.floor(T * 8) % 2 ? 'red' : 'lamp'; D.ell(bx, by + 4, 2.4, 2.6, bulb, 11, { e: 255 });
    rs.dl.push({ x: bx, y: by + 6, z: 30, r: 120, i: 0.25, rgb: red ? [255, 90, 70] : [255, 220, 150], tint: 0.3 });
    // cigar smoke drifting in the cone
    if (Math.random() < 0.3) rs.burst('steam', 250 + Math.random() * 10, 92, 1, { sp: 3, ang: -0.4, spread: 0.5, life: 4 });
    // the tally board: one chalk stroke per punch, bundled by five
    const [gx, gy, gw, gh] = GY.board, n = Math.min(60, mg.hits || 0); D.lay('back');
    for (let i = 0; i < n; i++) { const b = Math.floor(i / 5), k = i % 5, col = b % 6, row = Math.floor(b / 6), x = gx + 5 + col * 9, y = gy + 5 + row * 11; if (y > gy + gh - 12) break; if (k < 4) D.vl(x + k * 2, y, 8, 'linen', 9 - (i === n - 1 ? 0 : 1), { e: 255 }); else D.line(x - 1, y + 6, x + 7, y + 1, 'linen', 10, { e: 255 }); }
    // the bag: swings on its chain, squashes when hit; tape, stitching; a split that leaks sand in fever; snaps off on an S
    const [hx, hy] = GY.bag, fly = mg.flyT != null ? T - mg.flyT : -1, ang = (mg.bagAng || 0), sq = 1 + (mg.bag || 0) * 0.08;
    let cx, cy, rot = ang; if (fly >= 0) { cx = hx + Math.sin(ang) * GY.len + Math.min(1, fly / 0.35) * 70; cy = hy + GY.len - Math.sin(Math.min(1, fly / 0.35) * Math.PI * 0.6) * 24 + Math.max(0, fly - 0.35) * 40; rot = ang + fly * 5; } else { cx = hx + Math.sin(ang) * GY.len; cy = hy + Math.cos(ang) * GY.len; }
    D.lay('mid');
    if (fly < 0) { D.beg(); for (let k = 0; k < GY.len - 30; k += 2) D.px(hx + Math.sin(ang) * k, hy + Math.cos(ang) * k, 'iron', 6 + (k % 4 ? -1 : 1)); D.end({ none: 1 }); }
    else if (fly < 0.2) { rs.burst('spark', hx, hy + 10, 8, { sp: 40, spread: 6.3, life: 0.5 }); }
    const w = Math.round(13 / sq), h = Math.round(58 * sq), top = cy - 30, split = fev || mg.phase === 'end';
    if (fly < 0 || cy < FY + 20) { D.beg(); for (let yy = 0; yy < h; yy++) { const q = yy / h, ww = Math.round(w * (q < 0.08 ? 0.7 + q * 3 : q > 0.92 ? 0.8 : 1)); for (let xx = -ww; xx <= ww; xx++) { const u = xx / (ww + 0.5), px = cx + xx + Math.round(Math.sin(rot) * (yy - 28) * 0.9), py = top + yy; D.px(px, py, 'leather', 3.4 - u * 1.8 + (Math.abs(u) > 0.85 ? -0.8 : 0) + (u < -0.4 && u > -0.7 ? 1.3 : 0) - (q < 0.1 || q > 0.9 ? 0.6 : 0), { n: [u * 0.8, 0] }); } } D.end();
      const at = (xx, yy, m, tt) => D.px(cx + xx + Math.round(Math.sin(rot) * (yy - 28) * 0.9), top + yy, m, tt);
      [[6, 'linen'], [48, 'linen']].forEach(([yy, m]) => { for (let xx = -w; xx <= w; xx++) { at(xx, yy, m, 6.4 - xx / w * 1.4); at(xx, yy + 1, m, 5); } });
      for (let yy = 14; yy < 44; yy += 3) at(-Math.round(w * 0.3), yy, 'leather', 2.2);
      [[4, 22, 4, 5], [-6, 34, 5, 4]].forEach(([x0, y0, pw, ph]) => { for (let a = 0; a < pw; a++) for (let b = 0; b < ph; b++) at(x0 + a, y0 + b, 'iron', 6 - b * 0.4); });
      if (split) { for (let yy = 30; yy < 38; yy++) at(Math.round(w * 0.4), yy, 'ink', 0); if (Math.random() < 0.6) rs.burst('dust', cx + w * 0.4, top + 38, 2, { sp: 8, life: 1.2 }); } }
    if (fly >= 0.35 && !s.crashed) { s.crashed = 1; rs.burst('dust', cx, cy, 40, { sp: 40, spread: 6.3, life: 1.8 }); rs.burst('spark', cx, cy, 10, { sp: 50, spread: 6.3, life: 0.6 }); }
    if (fly < 0) s.crashed = 0;
    // the bell rings: the hammer shakes
    const bt = mg.bellT != null ? T - mg.bellT : 9; if (bt < 0.5) { D.lay('mid'); D.px(GY.post - 7 + (Math.floor(T * 40) % 2 ? 1 : -1), 72, 'brass', 10, { e: 255 }); rs.flash(1, 0.6); }
  },
});

// ═════════════════════ 斗兽场 · the fighting pit ═════════════════════
// tiers of stone stands full of a pixel crowd (dozens of heads and raised fists; your side waves gold flags, they jump with
// the cheer, freeze on the killing blow, throw coins or boo); a VIP box with a shadowy host; red banners and torches round
// the wall; portcullis gates left and right (they rise when the beasts are pushed in); a gong over the right gate; a row of
// six braziers along the wall that is the cheer meter; a sand floor with blood, claw marks and a broken spear.
const AR = { gates: [[14, 44], [256, 286]], gong: [271, 50], braz: [104, 118, 132, 168, 182, 196], wall: 70 };
MD.ARENA = AR;
const CROWD = []; (() => { const r = X.rng(77); for (let row = 0; row < 3; row++) for (let x = 6 + row * 3; x < 294; x += 7 + Math.floor(r() * 3)) { if (x > 118 && x < 182 && row < 2) continue; CROWD.push({ x, row, y: 30 + row * 13, skin: ['skin', 'skin', 'leather', 'bone'][Math.floor(r() * 4)], st: 3 + r() * 3, cloth: ['crimson', 'denim', 'leaf', 'lav', 'sand', 'brick'][Math.floor(r() * 6)], ct: 3 + r() * 3, ph: r() * 7, side: x < 150 ? 0 : 1, hat: r() < 0.25 }); } })();
X.def('mini_arena', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.2, 0.24],
  paint(S, sc) {
    [[60, 58], [104, 60], [196, 60], [240, 58]].forEach(([x, y], i) => sc.light({ x, y, z: 20, r: 80, i: 1, c: '#ff9040', fl: 'fire', ph: i * 1.7, tint: 0.55 }));   // 0–3 torches
    sc.light({ x: 150, y: 120, z: 30, r: 120, i: 0.45, c: '#ffd8a0', tint: 0.2 });   // 4 the pit
    sc.light({ x: 150, y: 90, z: 12, r: 70, i: 0.2, c: '#ff8030', fl: 'fire', tint: 0.5 });   // 5 the braziers together (kicked with the cheer)
    // ── the stands: three stone tiers under a dark sky, the VIP box in the middle ──
    S.lay('wall'); S.vgrad(0, 0, W, 26, 'night', 0.8, 2.4, { e: 255 }); for (let i = 0; i < 20; i++) S.px((i * 47) % W, (i * 13) % 20, 'linen', 8, { e: 255 });
    for (let row = 0; row < 3; row++) { const y = 26 + row * 13; S.rect(0, y, W, 13, 'stone', 3.4 - row * 0.3); S.hl(0, y + 10, W, 'stone', 5.4); S.hl(0, y + 11, W, 'stone', 2); }
    S.lay('back'); S.beg(); S.box(118, 12, 64, 30, 'wood', 3.4, { top: 2 }); S.rect(122, 16, 56, 22, 'night', 1.2); S.poly([[114, 12], [186, 12], [180, 4], [120, 4]], 'crimson', 5.4); for (let x = 116; x < 184; x += 6) S.vl(x, 4, 8, 'gold', 5); S.hl(118, 38, 64, 'gold', 6); S.end();
    S.ell(150, 28, 5, 6, 'ink', 0.6); S.rect(143, 30, 14, 8, 'ink', 0.6); S.px(148, 27, 'gold', 9, { e: 255 }); S.px(152, 27, 'gold', 9, { e: 255 });   // the host: a shape with two glints
    // ── the wall: big stones, red banners, torch brackets; the gates ──
    S.lay('wall'); TX.ashlar(S, 0, AR.wall - 4, W, FY - AR.wall + 4, 'stone', 4.6, { bh: 10, bw: 18, crack: 0.25 }); S.hl(0, AR.wall - 4, W, 'stone', 7.4); S.ao(0, AR.wall - 4, W, 30, 't', 1);
    [[76, 'crimson'], [224, 'crimson'], [130, 'gold'], [170, 'gold']].forEach(([x, m]) => { S.lay('back'); S.beg(); S.rect(x - 6, AR.wall - 2, 12, 22, m, m === 'gold' ? 5 : 4.6); S.poly([[x - 6, AR.wall + 20], [x, AR.wall + 15], [x + 6, AR.wall + 20], [x + 6, AR.wall + 26], [x, AR.wall + 22], [x - 6, AR.wall + 26]], m, m === 'gold' ? 4 : 3.6); S.rect(x - 7, AR.wall - 3, 14, 2, 'wood', 5); S.end(); S.ell(x, AR.wall + 7, 3, 3, m === 'gold' ? 'crimson' : 'gold', 6, { ring: 1 }); });
    [60, 104, 196, 240].forEach(x => { S.lay('back'); S.beg(); S.box(x - 3, 64, 7, 3, 'iron', 5); S.line(x, 64, x, 58, 'wood', 6); S.end(); });
    AR.gates.forEach(([x0, x1]) => { S.lay('back'); S.beg(); S.rect(x0 - 3, 66, x1 - x0 + 6, 4, 'stone', 7); S.rect(x0 - 3, 66, 3, 84, 'stone', 5.6); S.rect(x1, 66, 3, 84, 'stone', 5.6); S.end(); S.lay('wall'); S.rect(x0, 70, x1 - x0, 78, 'night', 0.6); });
    // gong on its frame over the right gate
    S.lay('back'); S.beg(); S.rect(260, 36, 2, 30, 'wood', 5); S.rect(282, 36, 2, 30, 'wood', 4); S.rect(258, 34, 28, 3, 'wood', 6); S.end();
    // braziers along the wall foot (their fire is live)
    AR.braz.forEach(x => { S.lay('mid'); S.beg(); S.rect(x - 1, 98, 3, 8, 'iron', 4); S.ell(x, 97, 5, 2.4, 'iron', 6, { dome: 1 }); S.hl(x - 5, 95, 11, 'iron', 8); S.end(); });
    // ── the sand ──
    S.lay('wall'); S.rect(0, 104, W, H - 104, 'sand', 5.6); S.noise(0, 104, W, H - 104, 1.2, 3, 71, { only: 'sand' }); S.ao(0, 104, W, 10, 't', 1.8);
    [[90, 132, 8, 2], [210, 150, 10, 2.4], [150, 164, 6, 1.6]].forEach(([x, y, rx, ry]) => S.ell(x, y, rx, ry, 'red', 3, { n: [0, -0.9] }));
    for (let k = 0; k < 4; k++) { S.line(60 + k * 3, 150, 70 + k * 3, 140, 'sand', 3.4); S.line(236 + k * 3, 124, 244 + k * 3, 116, 'sand', 3.4); }
    S.lay('mid'); S.beg(); S.line(40, 160, 70, 152, 'wood', 5); S.line(70, 152, 76, 150, 'iron', 8); S.end(); S.beg(); S.ell(260, 160, 4, 2, 'bone', 8); S.line(252, 158, 262, 162, 'bone', 7); S.end();
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, tq = q12(T), cheer = mg.cheer || 0, fight = mg.phase === 'fight', frozen = mg.ko && !mg.fin, fev = mg.sh && mg.sh.fever, won = mg.fin && mg.winner === mg.side, lost = mg.fin && mg.winner !== mg.side;
    // torches
    [60, 104, 196, 240].forEach((x, i) => flame(D, x, 58, 6, T, i * 1.9));
    // the crowd: heads, shoulders, fists; your side waves gold flags; jump with the cheer; freeze on the killing blow; throw coins / boo
    D.lay('back');
    CROWD.forEach((c, i) => { const mine = mg.side != null && c.side === mg.side, amp = frozen ? 0 : (fight ? (mine ? 1 + cheer * 3 + (fev ? 1.5 : 0) : 1) : won && mine ? 3 : 0.5), jy = frozen ? -1 : -Math.round(Math.abs(Math.sin(T * (fight ? 9 : 4) + c.ph)) * amp), x = c.x, y = c.y + jy;
      D.rect(x - 2, y + 4, 5, 5, c.cloth, c.ct); D.ell(x, y + 2, 2, 2, c.skin, c.st, { dome: 1 }); if (c.hat) D.hl(x - 2, y, 5, 'wood', 3);
      const armUp = frozen ? 1 : lost ? 0 : fight ? (Math.sin(T * 7 + c.ph) > 0.2 - cheer) : won && mine;
      if (armUp) { D.vl(x + 3, y - 2, 4, c.skin, c.st); if (mine && mg.side != null && (i % 3 === 0)) { D.vl(x + 4, y - 7, 6, 'wood', 6); D.rect(x + 5, y - 7, 4, 3, 'gold', 8 + (Math.floor(T * 6 + i) % 2)); } }
      else if (lost && !mine) { D.vl(x + 3, y - 1, 3, c.skin, c.st); } else if (lost && mine) { D.px(x + 3, y + 6, c.skin, c.st); D.px(x + 3, y + 7, c.skin, c.st - 1); } });
    // gates: the portcullis rises when the fight opens
    const gt = mg.gateT != null ? clamp((T - mg.gateT) / 0.6, 0, 1) : 0; D.lay('back');
    AR.gates.forEach(([x0, x1]) => { const lift = Math.round(gt * 70); for (let x = x0 + 1; x < x1; x += 4) D.rect(x, 70, 2, Math.max(0, 76 - lift), 'iron', 5.4); for (let y = 74; y < 146 - lift; y += 8) D.hl(x0, y, x1 - x0, 'iron', 4); });
    // gong: struck at the open and on the KO, it swings and glows
    const gg = mg.gongT != null ? T - mg.gongT : 9, gs = gg < 1 ? Math.sin(gg * 20) * (1 - gg) * 2 : 0, [gx, gy] = AR.gong; D.lay('mid');
    D.beg(); D.line(gx - 6, 37, gx - 6 + Math.round(gs), 41, 'iron', 5); D.line(gx + 6, 37, gx + 6 + Math.round(gs), 41, 'iron', 5); for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) { const d = Math.hypot(xx, yy); if (d > 9) continue; D.px(gx + xx + Math.round(gs), gy + yy, 'brass', (gg < 0.4 ? 9 : 6.4) - d * 0.12 + (d > 7.6 ? -1.5 : d < 2 ? 1.4 : 0) - xx * 0.08, { n: [xx / 12, yy / 12] }); } D.end();
    if (gg < 0.6) rs.dl.push({ x: gx, y: gy, z: 16, r: 50, i: 1 - gg, rgb: [255, 200, 90], tint: 0.5 });
    // the cheer braziers: lit from the left as the cheer climbs; all roar when it is full
    const lit = fight ? Math.round(cheer * 6) : mg.fin ? (won ? 6 : 0) : 0;
    AR.braz.forEach((x, i) => { if (i < lit) { flame(D, x, 94, 5 + (lit >= 6 ? 3 : 0) + (i === lit - 1 ? 1 : 0), T, i); if (lit >= 6 && Math.random() < 0.3) rs.burst('ember', x, 88, 1, { sp: 12, ang: 0, spread: 0.6, life: 1 }); } else D.px(x, 95, 'fire', 3, { e: 255 }); });
    if (lit) rs.flash(5, lit / 6 * 0.6);
    // coins thrown from the stands after a win: they arc down onto the sand and bounce
    (mg.toss || []).forEach(c => { const k = T - c.t; if (k < 0 || k > 1.4) return; const x = c.x + c.vx * k, y = c.y - c.vy * k + 200 * k * k, yy = Math.min(y, c.fy); coin(D, x, yy, T * 12 + c.x, 9); });
  },
});

// ═════════════════════ 营火 · a clearing in the woods at night ═════════════════════
// a hard-banded night sky with stars and a faint milky way, a cratered moon, layers of pine silhouettes; a clearing with a
// canvas tent (lit on the fire side), a log to sit on, the campfire (a heat automaton), a pot on a tripod, fireflies in the
// grass, and a long whetstone on two stumps. Resting: the moon crosses the sky, the fire burns down to embers and the east
// goes dawn-pink. Sharpening: a sword slides along the stone; every stroke on the worn middle throws sparks and heats the blade.
const CP = { fire: [128, 146], stone: [176, 276, 146], moon: [70, 36], sky: new Array(300).fill(104) };
MD.CAMP = CP;
function campFire(st, w, h, t, heat) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; } const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) { for (let x = 0; x < w; x++) { const e = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = e < 1 ? 0 : clamp(Math.round(36 * heat * (0.8 + R() * 0.2) - (e < 3 ? 8 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s2 = y * w + x, v = f[s2]; if (!v) { f[s2 - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < 0.62 ? 1 : 0)); } }
  return f;
}
X.def('mini_camp', {
  size: [W, H], fy: FY, noFrame: 1, amb: [0.16, 0.2],
  paint(S, sc) {
    sc.light({ x: CP.fire[0], y: CP.fire[1] - 8, z: 18, r: 130, i: 1.3, c: '#ff8a38', fl: 'fire', tint: 0.6 });   // 0 the fire
    sc.light({ x: CP.moon[0], y: CP.moon[1], z: 80, r: 260, i: 0.4, c: '#c8d0ff', tint: 0.25 });                  // 1 the moon
    // ── sky (glow: lights never touch it), stars, a faint milky way, the moon ──
    S.lay('wall'); S.vgrad(0, 0, W, 120, 'night', 0.6, 3.6, { e: 255 });
    for (let i = 0; i < 90; i++) { const x = S.r() * W, y = S.r() * 90, b = S.r(); S.px(x, y, 'linen', b < 0.15 ? 10 : 5 + b * 3, { e: 255 }); }
    for (let x = 0; x < W; x++) { const y0 = 70 - x * 0.2; for (let k = -4; k <= 4; k++) if (S.r() < 0.35 - Math.abs(k) * 0.07) S.px(x, y0 + k + Math.sin(x * 0.1) * 3, 'lav', 6 + S.r() * 2, { e: 255 }); }
    // ── pines: three layers, the farthest the palest ──
    const pine = (x, base, h, m, tn) => { for (let k = 0; k < h; k++) { const w = Math.round((k / h) * h * 0.32 + (k % 4 === 3 ? -1 : 0)); S.rect(x - w, base - h + k, w * 2 + 1, 1, m, tn, { e: 255 }); for (let xx = x - w; xx <= x + w; xx++) if (xx >= 0 && xx < W) CP.sky[xx] = Math.min(CP.sky[xx], base - h + k); } S.rect(x, base, 1, 3, m, tn, { e: 255 }); };
    for (let i = 0; i < 22; i++) pine(i * 14 + (i % 3) * 3, 98, 16 + (i % 4) * 4, 'night', 2.2);
    for (let i = 0; i < 16; i++) pine(i * 20 + 6 + (i % 2) * 5, 108, 22 + (i % 3) * 6, 'night', 1.4);
    // ── the clearing: grass over earth, a path to the fire ──
    S.rect(0, 104, W, H - 104, 'leaf', 2.4); S.noise(0, 104, W, H - 104, 1, 3, 81, { only: 'leaf' }); S.rect(0, 104, W, 3, 'leaf', 1.4);
    for (let x = 0; x < W; x++) if (S.r() < 0.5) S.px(x, 104 + Math.floor(S.r() * 4), 'leaf', 3.6 + S.r() * 2);
    S.ell(CP.fire[0], CP.fire[1] + 4, 40, 9, 'earth', 3.6, { n: [0, -0.9] }); S.noise(88, 136, 80, 22, 1, 2, 82, { only: 'earth' });
    // ── tent: canvas triangle, the open flap dark, guy ropes and pegs ──
    S.lay('back'); S.beg(); S.poly([[10, 142], [44, 92], [80, 142]], 'linen', 4.6, { n: [0.3, -0.3] }); S.poly([[44, 92], [80, 142], [72, 142], [46, 102]], 'linen', 6.6, { n: [0.8, -0.2] }); S.poly([[34, 142], [44, 112], [54, 142]], 'night', 0.8, { e: 255 }); S.hl(8, 142, 74, 'linen', 3); S.line(44, 92, 44, 88, 'wood', 5); S.end();
    for (let k = 0; k < 6; k++) S.line(44 + 1, 96 + k * 8, 60 + k * 2, 96 + k * 8 + 2, 'linen', 5.4);
    S.line(10, 142, 2, 146, 'wood', 5); S.line(80, 142, 90, 146, 'wood', 5);
    // ── the log seat, the whetstone on its stumps ──
    S.lay('mid'); S.beg(); S.hcyl(70, 140, 40, 7, 'wood', 5, { rim: 2 }); S.ell(110, 143.5, 2, 3.5, 'wood', 8); S.ell(110, 143.5, 1, 2, 'wood', 5); S.end();
    const [s0, s1, sy] = CP.stone; [s0 + 8, s1 - 12].forEach(x => { S.beg(); S.cyl(x, sy + 4, 12, 14, 'wood', 4.6, { rim: 2 }); S.ell(x + 6, sy + 4, 6, 1.4, 'wood', 7.5); S.end(); });
    S.beg(); S.box(s0, sy - 3, s1 - s0, 7, 'stone', 6.2, { top: 1 }); for (let x = s0 + 2; x < s1 - 2; x += 3) S.px(x, sy - 1 + (x % 2), 'stone', 4.4); const mid = (s0 + s1) / 2; S.rect(mid - 10, sy - 3, 20, 2, 'stone', 4.2); S.hl(mid - 9, sy - 3, 18, 'fire', 4.4); S.end();
    // ── the fire's ring of stones and logs, the tripod and pot ──
    const [fx, fy] = CP.fire; S.beg(); for (let k = 0; k < 9; k++) { const a = Math.PI * (1 + k / 8), x = fx + Math.cos(a) * 16, y = fy + 2 + Math.sin(a) * -3; blob(S, x, y + 3, 3.4, 2.4, 'stone', 5, { k: 2 }); } S.end();
    S.beg(); S.line(fx - 12, fy + 2, fx + 10, fy - 4, 'wood', 4, { w: 2 }); S.line(fx - 10, fy - 4, fx + 12, fy + 2, 'wood', 3.4, { w: 2 }); S.end();
    S.beg(); S.line(fx - 14, fy + 2, fx, fy - 30, 'wood', 5); S.line(fx + 14, fy + 2, fx, fy - 30, 'wood', 4); S.line(fx, fy - 30, fx, fy - 22, 'iron', 5); S.ell(fx, fy - 17, 6, 5, 'iron', 4, { dome: 1 }); S.hl(fx - 6, fy - 21, 13, 'iron', 7); S.end();
    sc.emit({ k: 'steam', x: fx, y: fy - 24, w: 4, rate: 1.2, sp: 4, ang: 0, spread: 0.5, life: 3 });
  },
  anim(D, t, rs, o) {
    const mg = (o && o.mg) || {}, T = o && o.t != null ? o.t : t, rest = mg.phase === 'rest', nq = rest ? clamp((mg.pt || 0) / 2.2, 0, 1) : 0, st = rs.st;
    // resting: the sky walks to dawn from the east, the moon crosses, stars wheel
    if (nq > 0.3) { D.lay('wall'); const k0 = (nq - 0.3) / 0.7; for (let x = 0; x < W; x++) for (let y = 0; y < CP.sky[x]; y++) { const e = clamp(k0 * 1.3 - 0.35 + (x / W) * 0.45 - (1 - y / 100) * 0.55, 0, 1); if (e < 0.06) continue; D.px(x, y, 'dusk', 1 + e * 4.5 + (y / 100) * 1.5 * e, { e: 255 }); } }
    for (let i = 0; i < 10; i++) { const r = X.rng(90 + i), sx = r() * W, sy = r() * 80, a = Math.sin(T * (1.4 + r() * 2) + r() * 7); if (a > 0.7 && nq < 0.6) { D.lay('wall'); D.px(sx, sy, 'linen', 10, { e: 255 }); D.px(sx - 1, sy, 'linen', 7, { e: 255 }); D.px(sx + 1, sy, 'linen', 7, { e: 255 }); } }
    const ma = rest ? Math.PI * (1 - nq) : Math.PI * 0.8, mx = 150 + Math.cos(ma) * 120, my = 70 - Math.sin(ma) * 50; D.lay('wall');
    for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) { const d = Math.hypot(xx, yy); if (d > 8) continue; const cr = (xx + 3) ** 2 + (yy + 2) ** 2 < 5 || (xx - 3) ** 2 + (yy - 3) ** 2 < 3 || (xx - 1) ** 2 + (yy + 5) ** 2 < 2; D.px(mx + xx, my + yy, 'bone', (d > 7 ? 8 : 10) - (cr ? 2 : 0) - (xx > 3 ? 1 : 0), { e: 255 }); }
    // the fire: a heat automaton; brighter on a good stroke, low embers by dawn; embers rise
    const [fx, fy] = CP.fire, hot = (mg.flare || 0), heat = rest ? 0.95 - nq * 0.55 : 0.9 + hot * 0.25;
    const fh = 30 + Math.round(hot * 12), f = campFire(st, 24, fh, T, heat); D.lay('mid'); for (let y = 0; y < fh; y++) for (let x = 0; x < 24; x++) { const v = f[y * 24 + x], u = Math.abs(x - 11.5) / 12, q = (fh - y) / fh; if (v < 5 || q > 1.05 - u * 1.3 - (u > 0.5 ? 0.2 : 0)) continue; D.px(fx - 12 + x, fy - fh + y + 2, 'fire', clamp(v / 36 * 11.5 + (u < 0.25 ? 0.8 : 0), 1, 11), { e: 255 }); }
    if (Math.random() < 0.5 + hot) rs.burst('ember', fx + (Math.random() - 0.5) * 12, fy - 10, 1, { sp: 10, ang: 0, spread: 0.6, life: 1.6 });
    rs.flash(0, hot * 0.8 - (rest ? nq * 0.5 : 0));
    // fireflies drifting over the grass
    for (let i = 0; i < 8; i++) { const r = X.rng(200 + i), x = r() * 300 + Math.sin(T * 0.4 + i) * 12, y = 112 + r() * 40 + Math.sin(T * 0.7 + i * 2) * 5, on = Math.sin(T * 2 + i * 1.3) > 0.2; if (on && nq < 0.8) { D.lay('front'); D.px(x, y, 'screen', 10, { e: 255 }); } }
    // the sword on the whetstone: slides with the stroke clock; the edge heats one step per clean stroke
    if (mg.phase === 'sharpen' || mg.phase === 'sharpDone') { const [s0, s1, sy] = CP.stone, q = mg.q != null ? mg.q : 0.5, bx = Math.round(s0 + 6 + q * (s1 - s0 - 40)), heatB = Math.min(5, mg.hits || 0), sk = mg.spark || 0;
      D.lay('front'); D.beg(); D.rect(bx, sy - 6 - (sk > 0.5 ? 1 : 0), 34, 2, 'iron', 8); D.hl(bx, sy - 6 - (sk > 0.5 ? 1 : 0), 34, 'iron', 10); D.px(bx + 34, sy - 6, 'iron', 7); D.rect(bx - 2, sy - 9, 2, 8, 'brass', 7); D.rect(bx - 10, sy - 6, 8, 2, 'leather', 5); D.px(bx - 11, sy - 6, 'brass', 7); D.end();
      if (heatB) for (let k = 0; k < 34; k++) if (k > 34 - heatB * 7) D.px(bx + k, sy - 5, 'fire', 6 + heatB, { e: 255 });
      if (mg.phase === 'sharpDone' && mg.hits >= 5) { const sw = ((T - (mg.doneT || T)) * 1.4) % 1; D.px(bx + Math.round(sw * 34), sy - 6, 'linen', 11, { e: 255 }); } }
  },
});
})();
