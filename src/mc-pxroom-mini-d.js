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
})();
