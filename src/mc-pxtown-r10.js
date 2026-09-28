// ==== mc-pxtown-r10.js ====
(function () {
// Pixel town, one building at a time — batch 10: 召唤法阵 · 灵魂熔炉 · 跳蚤市场 · 黄金交易所 (designs in the town plan).
// Painted at st 1 (a whole building) · 2 (grown) · 3 (the top tier).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };

// ───────── 召唤法阵 ev_sum1: a glowing circle ringed by black obelisks, a vertical rift standing in it, violet swirling, eyes inside ─────────
BS('ev_sum1', { kind: 'arcane', col: '#b070ff', look: 'mage', icon: 'flame', pillarC: '#d0a0ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  P.circle(S, sc, G, cx, gy, Math.round(w * 0.4));
  // obelisks (two, four from 2), violet fire on their tips at 2+
  const ob = st >= 2 ? [-0.44, -0.24, 0.24, 0.44] : [-0.36, 0.36]; ob.forEach((f, i) => { const x = cx + Math.round(w * f), oh = Math.round(h * (0.4 + (i % 2) * 0.08 + st * 0.04)); S.lay(Math.abs(f) < 0.3 ? 'back' : 'mid'); S.beg(); S.poly([[x - 3, gy], [x - 2, gy - oh], [x + 0.5, gy - oh - 3], [x + 3, gy - oh], [x + 4, gy]], 'ink', 2); S.vl(x - 2, gy - oh, oh, 'night', 4); for (let y = gy - oh + 4; y < gy - 3; y += 5) S.px(x, y, 'arcane', 10, { e: 255 }); S.end(); if (st >= 2) G.an.push((D, t) => { D.lay('mid'); H.flame(D, x, gy - oh - 4, 4, t, i, 'arcane'); }); });
  // the rift: a tall oval tear, its edge crackling, a swirl inside, eyes that open
  const rh = Math.round(h * [0, 0.5, 0.62, 0.72][st]), rw = Math.round(rh * 0.4), ry = gy - 4 - (rh >> 1), lr = sc.light({ x: cx, y: ry, z: 10, r: rh * 1.2, i: 1.1, c: '#b070ff', fl: 'pulse', amp: 0.25, sp: 1.6, tint: 0.4 });
  G.an.push((D, t, s) => { D.lay('mid'); for (let y = -rh / 2; y <= rh / 2; y++) { const hw = Math.round(rw / 2 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * y / rh, 2)))); for (let x = -hw; x <= hw; x++) { const d = Math.hypot(x / (rw / 2 + 0.1), 2 * y / rh), a = Math.atan2(y, x) + t * 1.5 + d * 4; const edge = d > 0.82; D.px(cx + x, Math.round(ry + y), edge ? 'arcane' : 'magic', edge ? 10 + (Math.sin(a * 3) > 0 ? 1 : 0) : (Math.sin(a * 2) > 0.2 ? 6 : 3), { e: 255 }); } }
    const open = steps(t, 4) < 0.7 || s.st.cheer; if (open) [[-2, -3], [2, 2], [-1, 5]].slice(0, st).forEach(([dx, dy]) => { D.px(cx + dx, Math.round(ry + dy), 'screen', 11, { e: 255 }); D.px(cx + dx + 1, Math.round(ry + dy), 'screen', 9, { e: 255 }); });
    if (st >= 3) for (let k = 0; k < 3; k++) { const a = t * 1.2 + k * 2.1, x0 = cx + Math.round(Math.cos(a) * rw * 0.5), y0 = Math.round(ry + Math.sin(a) * rh * 0.3); for (let j = 0; j < 6; j++) D.px(x0 + Math.round(Math.cos(a) * j * 1.5), y0 + Math.round(Math.sin(a + j * 0.4) * j), 'ink', 2); } s.mul[lr] = 1 + (s.st.cheer ? 1 : 0); });
  sc.emit({ k: 'soul', x: cx, y: ry + (rh >> 1), rate: 0.6 + st * 0.4, sp: 6, ang: 0, spread: 1, life: 2, w: rw }); if (st >= 3) { sc.emit({ k: 'rune', x: cx, y: gy - 3, rate: 1, sp: 6, ang: 0, spread: 2, life: 2, w: w * 0.6 }); const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.3); }); }
  worker(G, R + 4, -1, 'staff'); G.fx = { x: cx, y: ry };
}, show(s, o) { if (once(s, o, 'op', 0)) s.st.cheer = 2; }, sfx: (d) => SN.snd(S => { S.tone(55, 1.2, 'sawtooth', 0.05, -15, d); S.noise(1, 0.05, 400, d); }) });

// ───────── 灵魂熔炉 ev_sum2: a pot-bellied bottle kiln burning ghost-green, chains and copper pipes, souls rising from its stack ─────────
BS('ev_sum2', { kind: 'arcane', col: '#7affc0', look: 'smith', icon: 'flame', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const kiln = (x, kh, kw) => { S.lay('wall'); S.beg(); for (let y = gy - 1; y > gy - kh; y--) { const q = (gy - y) / kh, hw = Math.round(kw / 2 * (q < 0.55 ? 1 - Math.pow((0.45 - q) / 0.45, 2) * 0.15 : Math.max(0.28, 1 - (q - 0.55) * 1.6))); for (let xx = -hw; xx < hw; xx++) { const row = gy - y, mortar = row % 3 === 2 || (xx + (Math.floor(row / 3) % 2) * 2) % 5 === 0; S.px(x + xx, y, 'brick', mortar ? 2 : 4 + (xx < -hw + 2 ? 1.5 : xx > hw - 3 ? -1.5 : 0), { n: [xx / hw * 0.7, 0] }); } } S.box(x - Math.round(kw * 0.16) - 1, gy - kh - 2, Math.round(kw * 0.32) + 2, 3, 'iron', 5, { top: 1 }); S.end();
    const lf = sc.light({ x, y: gy - 5, z: 10, r: 30, i: 1.2, c: '#7affc0', fl: 'fire', ph: x, tint: 0.55 }); S.beg(); S.rect(x - 4, gy - 8, 8, 8, 'ink', 1); S.end(); const fs = {}; G.an.push((D, t, s) => { const f = H.fireSim(fs, 6, 6, t, 0.9 + (s.st.roar || 0) * 0.4, 0.4); D.lay('wall'); for (let yy = 0; yy < 6; yy++) for (let xx = 0; xx < 6; xx++) { const v = f[yy * 6 + xx]; if (v < 4) continue; D.px(x - 3 + xx, gy - 7 + yy, 'screen', Math.min(11, Math.round(v / 36 * 11.5)), { e: 255 }); } s.st.roar = Math.max(0, (s.st.roar || 0) - 0.02); });
    sc.emit({ k: 'soul', x, y: gy - kh - 3, rate: 1 + st * 0.5, sp: 10, ang: 0, spread: 0.4, life: 2.2, w: 3 }); return { x, y: gy - kh - 2 }; };
  const k1 = kiln(cx - 4, Math.round(h * [0, 0.72, 0.84, 0.92][st]), Math.round(w * 0.42));
  if (st >= 3) kiln(R - 6, Math.round(h * 0.58), Math.round(w * 0.26));
  // chains from a gantry with a crucible (2+), copper pipes, a soul ring at the stack mouth (3)
  S.lay('back'); S.beg(); S.line(k1.x + 10, gy - Math.round(h * 0.4), R - 1, gy - Math.round(h * 0.4), 'copper', 6, { w: 2 }); S.vl(R - 2, gy - Math.round(h * 0.4), Math.round(h * 0.4), 'copper', 5); S.end();
  if (st >= 2) { const gx = L + 4; S.lay('mid'); S.beg(); S.vl(gx, gy - Math.round(h * 0.62), Math.round(h * 0.62), 'iron', 6); S.hl(gx, gy - Math.round(h * 0.62), 12, 'iron', 7); S.end(); G.an.push((D, t) => { const sw = Math.round(Math.sin(t * 1.1) * 1.5), cy = gy - Math.round(h * 0.32); D.lay('mid'); for (let y = gy - Math.round(h * 0.62) + 1; y < cy; y += 2) D.px(gx + 10 + Math.round(sw * (y - gy + h * 0.62) / (h * 0.3)), y, 'iron', 7); D.beg(); D.poly([[gx + 6 + sw, cy], [gx + 14 + sw, cy], [gx + 13 + sw, cy + 5], [gx + 7 + sw, cy + 5]], 'iron', 5); D.hl(gx + 7 + sw, cy, 6, 'screen', 11, { e: 255 }); D.end(); }); }
  if (st >= 3) G.an.push((D, t) => { D.lay('front'); for (let k = 0; k < 12; k++) { const a = t * 2 + k * 0.52; D.px(k1.x + Math.round(Math.cos(a) * 6), k1.y - 3 + Math.round(Math.sin(a) * 2), 'screen', 10, { e: 255 }); } });
  worker(G, R + 4, -1, 'hammer'); G.fx = k1;
}, show(s, o) { if (once(s, o, 'r', 0)) s.st.roar = 2; }, sfx: (d) => SN.snd(S => { S.noise(0.8, 0.08, 700, d); S.tone(880, 0.9, 'sine', 0.03, -500, d + 0.3); S.tone(660, 0.9, 'sine', 0.03, -400, d + 0.4); }) });

// ───────── 跳蚤市场 ev_mer1: a row of mismatched stalls under striped awnings, goods hanging, a big parasol, bunting across ─────────
BS('ev_mer1', { kind: 'trade', col: '#ffd06a', look: 'farmer', icon: 'coin', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const stall = (x, sw, sh, m1, m2, goods) => { S.lay('mid'); S.beg(); S.rect(x, gy - 6, sw, 6, 'wood', 5); S.hl(x, gy - 6, sw, 'wood', 7); for (let i = 1; i < sw - 1; i += 2) S.px(x + i, gy - 7, goods[i % goods.length], 8 + (i % 3 === 0 ? 1 : 0)); S.vl(x, gy - sh, sh, 'wood', 5); S.vl(x + sw - 1, gy - sh, sh, 'wood', 4); S.end();
    S.beg(); for (let i = -1; i < sw + 1; i++) { const m = (i >> 1) % 2 ? m2 : m1; S.px(x + i, gy - sh - 1, m, 8); S.px(x + i, gy - sh, m, 6); if (i % 2 === 0) S.px(x + i, gy - sh + 1, m, 5); } S.poly([[x - 1, gy - sh - 1], [x + sw / 2, gy - sh - 5], [x + sw, gy - sh - 1]], m1, 7); S.end();
    G.an.push((D, t) => { D.lay('mid'); for (let i = 2; i < sw - 1; i += 3) { const sw2 = Math.round(Math.sin(t * 1.5 + x + i)); D.vl(x + i, gy - sh + 1, 2, 'ink', 3); D.px(x + i + sw2, gy - sh + 3, goods[(i + 1) % goods.length], 9); } }); };
  const n = st >= 2 ? 3 : 2, sw = Math.round(w / n) - 2; for (let i = 0; i < n; i++) stall(L + i * (sw + 2), sw, Math.round(h * (0.34 + (i % 2) * 0.08 + st * 0.03)), ['red', 'tile', 'leaf'][i % 3], 'linen', [['gold', 'crimson', 'tile'], ['leaf', 'brass', 'pink'], ['paper', 'red', 'teal']][i % 3]);
  // the parasol, the bunting across (on poles), lamps at 2+, a little stage and arch sign at 3
  const px = R + 2; S.lay('front'); S.beg(); S.vl(px, gy - 16, 16, 'wood', 6); for (let k = -6; k <= 6; k++) S.px(px + k, gy - 16 + Math.round(Math.abs(k) * 0.4), (k + 6) % 4 < 2 ? 'gold' : 'crimson', 8); S.end();
  S.lay('back'); S.beg(); [L - 3, R + 3].forEach(x => S.vl(x, gy - Math.round(h * 0.75), Math.round(h * 0.75), 'wood', 5)); for (let i = 0; i <= 16; i++) { const q = i / 16, x = Math.round(L - 3 + q * (w + 6)), y = gy - Math.round(h * 0.75) + Math.round(Math.sin(q * Math.PI) * 4); S.px(x, y, 'ink', 2); if (i % 2) { S.px(x, y + 1, ['red', 'gold', 'tile', 'leaf'][i % 4], 8); S.px(x, y + 2, ['red', 'gold', 'tile', 'leaf'][i % 4], 6); } } S.end();
  if (st >= 2) for (let i = 0; i < n; i++) K.lantern(S, sc, L + i * (sw + 2) + (sw >> 1), gy - Math.round(h * 0.34) + 2, { c: '#ffd070' });
  if (st >= 3) { const ax = cx, aw = 16, ah = Math.round(h * 0.95); S.lay('back'); S.beg(); S.vl(ax - (aw >> 1), gy - ah, ah, 'wood', 6); S.vl(ax + (aw >> 1), gy - ah, ah, 'wood', 4); S.box(ax - (aw >> 1) - 2, gy - ah - 6, aw + 5, 6, 'crimson', 5); S.end(); const la = sc.light({ x: ax, y: gy - ah - 3, z: 8, r: 20, i: 0.9, c: '#ffd070', fl: 'buzz', tint: 0.4 }); S.beg(); for (let x = ax - (aw >> 1) - 1; x < ax + (aw >> 1) + 3; x += 2) { S.px(x, gy - ah - 7, 'lamp', 10, { e: la + 1 }); S.px(x, gy - ah, 'lamp', 10, { e: la + 1 }); } H.ICON.coin(S, ax, gy - ah - 3); S.end(); sc.emit({ k: 'glint', x: ax, y: gy - 10, rate: 1, sp: 4, ang: 0, spread: 3, life: 0.7, w: w }); }
  worker(G, L - 4, 1, 'carry'); if (st >= 2) worker(G, R + 6, -1, 'wave'); G.fx = { x: cx, y: gy - Math.round(h * 0.5) };
}, sfx: (d) => SN.snd(S => { S.tone(392, 0.12, 'square', 0.04, 60, d); S.tone(494, 0.12, 'square', 0.04, 60, d + 0.15); }) });

// ───────── 黄金交易所 ev_mer2: an exchange hall with a glass dome, a board of figures scrolling on its front, a golden bull at the door ─────────
BS('ev_mer2', { kind: 'trade', col: '#ffd06a', look: 'keeper', icon: 'coin', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const bw = Math.round(w * [0, 0.7, 0.76, 0.8][st]), bx = cx - (bw >> 1) + 3, bh = Math.round(h * [0, 0.42, 0.48, 0.52][st]), bt = gy - bh;
  K.wall(S, bx, bt, bw, bh, ['brick', 6, 'bricks']); K.quoins(S, bx, bt, bw, bh, 'stone', 7); S.beg(); S.box(bx - 1, bt - 3, bw + 2, 3, 'stone', 8, { top: 1 }); S.hl(bx - 1, bt - 1, bw + 2, 'brass', 8); S.end();
  // the dome: iron ribs over glass, lit from inside; gold at 3
  const dr = Math.round(bw * 0.3), dm = st >= 3 ? 'gold' : 'glass', ld = sc.light({ x: cx + 3, y: bt - dr / 2, z: 8, r: dr * 2, i: 0.8, c: '#ffe0a0', fl: 'candle', tint: 0.4 }); S.lay('back'); S.beg(); for (let yy = 0; yy <= dr; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, dr * dr - yy * yy))); for (let x = -hw; x < hw; x++) S.px(cx + 3 + x, bt - 3 - yy, (x % 4 === 0 || yy % 4 === 0) ? (st >= 3 ? 'gold' : 'iron') : dm, (x % 4 === 0 || yy % 4 === 0) ? 7 : st >= 3 ? 8 : 8, st >= 3 ? {} : { e: ld + 1 }); } S.vl(cx + 3, bt - 3 - dr - 5, 5, 'gold', 10); S.end();
  // the ticker board across the front: green figures scrolling, some red (flashing gold in the show)
  const tx = bx + 3, tw = bw - 6, ty = bt + 3, lt = sc.light({ x: tx + tw / 2, y: ty + 2, z: 6, r: tw * 0.7, i: 0.8, c: '#78dc72', fl: 'screen', tint: 0.4 }); S.lay('wall'); S.beg(); S.rect(tx - 1, ty - 1, tw + 2, 7, 'ink', 1); S.end();
  const DIG = [31599, 9362, 29671, 29391, 23497, 31183, 31215, 29257, 31727, 31695]; G.an.push((D, t, s) => { D.lay('wall'); const off = Math.floor(t * 6); for (let x = 0; x < tw; x++) { const g = x + off, cell = Math.floor(g / 4), col = g % 4; if (col === 3) continue; const grp = Math.floor(cell / 4), up = (grp * 7) % 3 !== 0, dig = DIG[(cell * 7 + grp * 3) % 10]; for (let y = 0; y < 5; y++) if ((dig >> (14 - (y * 3 + col))) & 1) D.px(tx + x, ty + y, s.st.cheer ? 'gold' : up ? 'screen' : 'red', 10, { e: 255 }); } });
  const T = K.tier('steam', 2); for (let x = bx + 4; x + 4 < bx + bw - 3; x += 8) K.win(S, sc, x, ty + 10, 4, Math.max(5, bh - 26), T, { deco: '', c: '#ffe0a0' }); K.door(S, cx, gy - 10, 7, 10, T, 2);
  // the golden bull on its plinth
  const ux = L + 9; S.lay('front'); S.beg(); S.box(ux - 7, gy - 3, 15, 3, 'stone', 7, { top: 1 }); const lb = sc.light({ x: ux, y: gy - 8, z: 10, r: 16, i: 0.8, c: '#ffe070', fl: 'pulse', amp: 0.15, sp: 1, tint: 0.4 }); S.rect(ux - 6, gy - 10, 11, 5, 'gold', 7, { e: lb + 1 }); S.rect(ux + 4, gy - 12, 4, 4, 'gold', 8, { e: lb + 1 }); S.px(ux + 5, gy - 13, 'gold', 10); S.px(ux + 7, gy - 13, 'gold', 10); S.px(ux + 8, gy - 14, 'gold', 11); S.px(ux + 4, gy - 14, 'gold', 11); [ux - 5, ux - 2, ux + 1, ux + 3].forEach(x => S.vl(x, gy - 5, 2, 'gold', 6)); S.line(ux - 6, gy - 9, ux - 9, gy - 12, 'gold', 7); S.end();
  if (st >= 2) [bx - 2, bx + bw + 1].forEach(x => { P.clockface(S, sc, G, x, bt - 6, 2); });
  if (st >= 3) { sc.emit({ k: 'glint', x: cx, y: bt - dr, rate: 2, sp: 6, ang: 0, spread: 3, life: 0.8, w: bw }); G.an.push((D, t, s) => { if (steps(t, 2.5) < 0.05) s.burst('spark', cx, bt - dr - 4, 6, { sp: 30, ang: 0, spread: 2.4, life: 0.8, floor: gy - 1 }); }); K.flag(S, G, bx, bt - 3, 10, 'gold'); K.flag(S, G, bx + bw, bt - 3, 10, 'gold'); }
  worker(G, R + 4, -1, 'read'); G.fx = { x: cx + 3, y: bt - dr };
}, show(s, o) { if (once(s, o, 'up', 0)) s.st.cheer = 2; } });
})();
