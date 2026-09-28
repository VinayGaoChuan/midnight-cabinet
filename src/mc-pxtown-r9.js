// ==== mc-pxtown-r9.js ====
(function () {
// Pixel town, one building at a time — batch 9: 影刃密室 · 法师塔 · 圣泉疗养院 · 神谕祭坛 · 月神殿 (designs in the town plan).
// Painted at st 1 (a whole building) · 2 (grown) · 3 (the top tier).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };

// ───────── 影刃密室 ev_ass2: a narrow dark house leaning to one side, eaves jutting, a crow on the roof, a grapple rope, violet lanterns ─────────
BS('ev_ass2', { kind: 'arcane', col: '#b070ff', look: 'mage', icon: 'sword', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const hw = Math.round(w * 0.34), hh = Math.round(h * [0, 0.8, 0.95, 1.05][st]), lean = 0.12, x0 = cx - (hw >> 1);
  // the leaning tower-house: storeys of dark planks, each shifted a little, jutting eaves between them
  const floors = st >= 2 ? 4 : 3, fh = Math.round(hh / floors); for (let f = 0; f < floors; f++) { const y1 = gy - f * fh, sx = x0 + Math.round(f * fh * lean); K.wall(S, sx, y1 - fh + 2, hw, fh - 2, ['magic', 3, 'vplanks']); S.beg(); S.poly([[sx - 3, y1 - fh + 2], [sx + hw + 3, y1 - fh + 2], [sx + hw + 1, y1 - fh + 4], [sx - 1, y1 - fh + 4]], 'ink', 2); S.end();
    const lw = sc.light({ x: sx + hw / 2, y: y1 - fh / 2, z: 6, r: 10, i: 0.6, c: '#b070ff', fl: 'candle', ph: f, tint: 0.5 }); S.beg(); S.rect(sx + (hw >> 1) - 1, y1 - fh + 6, 3, 4, 'arcane', f % 2 ? 7 : 9, { e: lw + 1 }); S.end(); }
  const tx = x0 + Math.round(floors * fh * lean), tt = gy - hh; K.roof(S, tx - 3, tt + 2, hw + 6, Math.round(hw * 0.7), 'cone', 'ink', 2);
  // the crow on the ridge (flies off in a show), the grapple rope down the side, the dagger sign
  G.an.push((D, t, s) => { const gone = s.st.cheer ? 1 : 0, x = tx + (hw >> 1) + (gone ? Math.round(t * 20 % 30) : 0), y = tt - Math.round(hw * 0.7) + 1 - (gone ? Math.round(t * 12 % 20) : 0), hop = Math.sin(t * 2) > 0.95 ? 1 : 0; D.lay('front'); D.rect(x - 1, y - 2 - hop, 3, 2, 'ink', 2); D.px(x + 2, y - 3 - hop, 'ink', 2); D.px(x + 3, y - 3 - hop, 'gold', 8); D.px(x - 2, y - 1 - hop, 'ink', 2); });
  S.lay('front'); S.beg(); S.line(tx + hw + 2, tt + 4, tx + hw + 1, gy - 6, 'leather', 5); S.px(tx + hw + 2, tt + 3, 'iron', 9); S.px(tx + hw + 3, tt + 2, 'iron', 9); S.px(tx + hw + 1, tt + 2, 'iron', 9); S.end();
  S.lay('back'); S.beg(); S.hl(x0 - 6, gy - fh + 2, 6, 'iron', 5); S.box(x0 - 7, gy - fh + 3, 5, 7, 'ink', 2); S.vl(x0 - 5, gy - fh + 4, 5, 'iron', 10); S.hl(x0 - 6, gy - fh + 7, 3, 'brass', 8); S.end();
  // violet paper lanterns on a line; the door low and dark
  [x0 - 4, x0 + hw + 5].forEach((x, i) => K.lantern(S, sc, x, gy - Math.round(fh * 1.4), { c: '#b070ff', m: 'arcane' })); S.beg(); S.rect(x0 + 2, gy - 7, 4, 7, 'ink', 1); S.end();
  if (st >= 3) { const lm = sc.light({ x: tx + hw + 12, y: tt - 6, z: 20, r: 30, i: 0.6, c: '#c090ff', tint: 0.3 }); S.lay('back'); S.beg(); S.ell(tx + hw + 12.5, tt - 6, 6, 6, 'arcane', 9, { e: lm + 1 }); S.ell(tx + hw + 14.5, tt - 7, 5, 5, 'night', 1); S.end(); G.an.push((D, t) => { D.lay('front'); for (let i = 0; i < 3; i++) { const a = t * 0.8 + i * 2.1; D.px(cx + Math.round(Math.cos(a) * w * 0.4), gy - Math.round(h * 0.5) + Math.round(Math.sin(a * 1.3) * 6), 'magic', 4); D.px(cx + Math.round(Math.cos(a) * w * 0.4) + 1, gy - Math.round(h * 0.5) + Math.round(Math.sin(a * 1.3) * 6), 'arcane', 10, { e: 255 }); } }); }
  worker(G, R + 4, -1, 'guard'); G.fx = { x: tx + (hw >> 1), y: tt };
}, show(s, o) { if (once(s, o, 'crow', 0.1)) s.st.cheer = 2; } });

// ───────── 法师塔 ev_mag2: a crooked tall tower under a bent pointed hat, round windows aglow, books flying round it, coloured smoke ─────────
BS('ev_mag2', { kind: 'arcane', col: '#c8a8ff', look: 'mage', icon: 'star', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const tw = Math.round(w * 0.3), th = Math.round(h * [0, 0.72, 0.86, 0.96][st]), x0 = cx - (tw >> 1) - 3;
  // the tower: stone courses that bulge and kink as it rises
  S.lay('wall'); S.beg(); for (let y = gy - 1; y > gy - th; y--) { const q = (gy - y) / th, off = Math.round(Math.sin(q * 3.2) * 3), hw = Math.round(tw / 2 * (1 - q * 0.18)); for (let x = -hw; x < hw; x++) { const row = gy - y, mortar = row % 4 === 3 || (x + (Math.floor(row / 4) % 2) * 3) % 6 === 0; S.px(cx - 3 + off + x, y, 'magic', mortar ? 3 : 6 + (x < -hw + 2 ? 1.5 : x > hw - 3 ? -1.5 : 0), { n: [x / hw * 0.7, 0] }); } } S.end();
  const T = K.tier('magic', 2); [0.22, 0.48, 0.72].forEach((f, i) => { const y = gy - Math.round(th * f), off = Math.round(Math.sin(f * 3.2) * 3), li = sc.light({ x: cx - 3 + off, y, z: 6, r: 12, i: 0.7, c: ['#c8a8ff', '#ffd070', '#8adcff'][i], fl: 'candle', ph: i, tint: 0.5 }); S.beg(); S.ell(cx - 3 + off + 0.5, y + 0.5, 2.5, 2.5, 'stone', 6); S.ell(cx - 3 + off + 0.5, y + 0.5, 1.6, 1.6, ['arcane', 'lamp', 'ice'][i], 9, { e: li + 1 }); S.end(); });
  K.door(S, cx - 5, gy - 8, 5, 8, T, 2);
  // the hat: a tall cone that bends over at the tip, a band, a star at the end
  const hx = cx - 3 + Math.round(Math.sin(3.2) * 3), ht = gy - th, hh = Math.round(h * 0.34); S.beg(); for (let k = 0; k < hh; k++) { const q = k / hh, hw = Math.round((tw / 2 + 3) * (1 - q)), bend = Math.round(q * q * 8); S.hl(hx - hw + bend, ht - k, Math.max(1, hw * 2), 'magic', 5 + (k % 5 === 0 ? 1 : 0)); S.px(hx - hw + bend, ht - k, 'magic', 7); } S.hl(hx - (tw >> 1) - 3, ht - 2, tw + 6, 'gold', 8); S.end();
  const sx = hx + 8, sy = ht - hh, ls = sc.light({ x: sx, y: sy, z: 10, r: 18, i: st >= 3 ? 1.2 : 0.6, c: '#ffe070', fl: 'pulse', amp: 0.3, sp: 2, tint: 0.5 }); S.beg(); S.px(sx, sy, 'gold', 11, { e: ls + 1 }); S.px(sx - 1, sy, 'gold', 9, { e: ls + 1 }); S.px(sx + 1, sy, 'gold', 9, { e: ls + 1 }); S.px(sx, sy - 1, 'gold', 9, { e: ls + 1 }); S.px(sx, sy + 1, 'gold', 9, { e: ls + 1 }); S.end();
  // flying books, coloured smoke from a crooked chimney, a balcony and crystal ball (2+), a rune ring (3)
  const nb = 2 + st; G.an.push((D, t) => { for (let i = 0; i < nb; i++) { const a = t * 0.8 + i * Math.PI * 2 / nb, x = cx - 3 + Math.round(Math.cos(a) * (tw * 0.9)), y = gy - Math.round(th * (0.3 + 0.15 * (i % 3))) + Math.round(Math.sin(a) * 2), flap = Math.floor(t * 6 + i) % 2; D.lay(Math.sin(a) > 0 ? 'front' : 'back'); D.rect(x - 1, y, 3, 2, ['crimson', 'tile', 'leaf', 'brass'][i % 4], 7); D.px(x - 2 + flap * 4, y - 1, 'paper', 9); } });
  const cx2 = cx + Math.round(tw * 0.45); S.lay('back'); S.beg(); S.line(cx2, gy - Math.round(th * 0.5), cx2 + 3, gy - Math.round(th * 0.62), 'brick', 5, { w: 2 }); S.end(); ['arcane', 'leaf', 'pink'].forEach((m, i) => sc.emit({ k: 'steam', x: cx2 + 3, y: gy - Math.round(th * 0.63), rate: 0.6, sp: 5, ang: 0.4, spread: 0.4, life: 2, w: 1 }));
  if (st >= 2) { const by = gy - Math.round(th * 0.4), bx = cx - 3 - (tw >> 1) - 5; S.lay('front'); S.beg(); S.box(bx - 1, by, 8, 2, 'wood', 6, { top: 1 }); for (let x = bx; x < bx + 7; x += 2) S.vl(x, by - 3, 3, 'wood', 5); S.end(); const lc = sc.light({ x: bx + 2, y: by - 5, z: 8, r: 12, i: 0.8, c: '#8adcff', fl: 'pulse', amp: 0.3, sp: 1.5, tint: 0.5 }); S.beg(); S.ell(bx + 2.5, by - 5, 2, 2, 'ice', 9, { e: lc + 1 }); S.end(); }
  if (st >= 3) G.an.push((D, t) => { const y = gy - Math.round(th * 0.85), r = tw; D.lay('front'); for (let k = 0; k < 12; k++) { const a = -t * 1.3 + k * 0.52, sn = Math.sin(a); if (sn < 0) continue; D.px(cx - 3 + Math.round(Math.cos(a) * r), y + Math.round(sn * 2), 'gold', 10, { e: 255 }); } });
  worker(G, R + 4, -1, 'staff'); G.fx = { x: sx, y: sy };
}, show(s, o, G, q) { if (once(s, o, 'bk', 0.2)) s.burst('glint', G.fx.x, G.fx.y, 10 + q * 3, { sp: 30, ang: 0, spread: 6.3, life: 0.8 }); } });

// ───────── 圣泉疗养院 ev_cle2: steaming hot-spring pools stepping down the slope, a white bathhouse with a blue roof, the spring statue ─────────
BS('ev_cle2', { kind: 'heal', col: '#8adcff', look: 'nurse', icon: 'drop', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the bathhouse on the right, raised on a stone base
  const bw = Math.round(w * 0.42), bx = R - bw, bh = Math.round(h * [0, 0.36, 0.42, 0.48][st]), bt = gy - bh; K.wall(S, bx, bt, bw, bh, ['bone', 9, 'smooth']); S.beg(); S.rect(bx, gy - 5, bw, 5, 'stone', 5); S.end(); K.roof(S, bx - 3, bt, bw + 6, Math.round(bw * 0.28), 'hip', 'tile', 6);
  const T = K.tier('water', 1); K.win(S, sc, bx + 3, bt + 4, 4, 5, T, { deco: '' }); K.win(S, sc, bx + bw - 7, bt + 4, 4, 5, T, { deco: '' }); S.beg(); S.rect(bx + (bw >> 1) - 3, gy - 12, 6, 7, 'crimson', 5); S.hl(bx + (bw >> 1) - 3, gy - 12, 6, 'crimson', 7); S.end();
  // the pools stepping down to the left, each a basin of stone with shining water; the water falls from one to the next
  const n = st >= 2 ? 3 : 2, lp = sc.light({ x: L + 12, y: gy - 6, z: 4, r: 30, i: 0.7, c: '#8adcff', fl: 'pulse', amp: 0.15, sp: 1.2, tint: 0.5 }), pools = [];
  for (let i = 0; i < n; i++) { const pw = Math.round((bx - L) / n) + 3, px = bx - (i + 1) * (pw - 3), py = gy - 3 - (n - 1 - i) * 5; pools.push([px, py, pw]); S.lay('front'); S.beg(); S.box(px, py - 3, pw, 4, 'stone', 6, { top: 1 }); S.hl(px + 1, py - 3, pw - 2, 'water', 8, { e: lp + 1 }); S.end(); sc.emit({ k: 'steam', x: px + pw / 2, y: py - 4, rate: 1 + st * 0.3, sp: 4, ang: 0, spread: 0.6, life: 2.4, w: pw - 4 }); }
  G.an.push((D, t) => { D.lay('front'); pools.forEach(([px, py, pw], i) => { for (let x = px + 1; x < px + pw - 1; x++) if (n1(t * 2 + x * 0.6 + i) > 0.55) D.px(x, py - 3, 'water', 11, { e: 255 }); if (i < pools.length - 1) for (let k = 0; k < 5; k++) D.px(px - 1, py - 3 + ((k + Math.floor(t * 10)) % 5), 'water', 10, { e: 255 }); }); });
  // the spring source: a rock with a figure pouring water into the top pool (gold at 3)
  const top = pools[0], sx = top[0] + top[2] - 3, sy = top[1] - 4; S.lay('mid'); S.beg(); S.ell(sx + 0.5, sy, 4, 3, 'rock', 6, { dome: 1 }); S.end(); P.statue(S, sx, sy - 1, 12, st >= 3 ? 'gold' : 'bone'); G.an.push((D, t) => { D.lay('mid'); for (let k = 0; k < 4; k++) D.px(sx - 3 - Math.round(k * 0.5), sy - 9 + k * 2 + (Math.floor(t * 12) % 2), 'water', 10, { e: 255 }); });
  if (st >= 2) { S.lay('back'); S.beg(); [L - 2, bx - 1].forEach(x => S.vl(x, gy - Math.round(h * 0.5), Math.round(h * 0.5), 'wood', 5)); S.hl(L - 2, gy - Math.round(h * 0.5), bx - L + 2, 'wood', 6); S.hl(L - 2, gy - Math.round(h * 0.5) + 1, bx - L + 2, 'wood', 3); S.end(); for (let i = 0; i < 3; i++) K.lantern(S, sc, L + 2 + i * Math.round((bx - L) / 3), gy - Math.round(h * 0.5) + 2, { c: '#ffe0a0' }); }
  if (st >= 3) { sc.emit({ k: 'heal', x: L + (bx - L) / 2, y: gy - 10, rate: 1.4, sp: 6, ang: 0, spread: 0.8, life: 1.8, w: bx - L }); K.flag(S, G, bx + bw + 2, bt, 10, 'teal'); }
  worker(G, R + 4, -1, 'sweep'); G.fx = { x: sx, y: sy - 12 };
} });

// ───────── 神谕祭坛 ev_pri1: a rock outcrop, a bronze tripod smoking violet, an eye floating above that opens and blinks, rune stones ─────────
BS('ev_pri1', { kind: 'holy', col: '#c8a8ff', look: 'mage', icon: 'eye', pillarC: '#d8c0ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const rh = Math.round(h * [0, 0.34, 0.4, 0.44][st]), rw = Math.round(w * 0.7); S.lay('wall'); S.beg(); S.poly([[cx - rw / 2 - 4, gy], [cx - rw / 2 - 1, gy - rh * 0.55], [cx - rw * 0.4, gy - rh * 0.9], [cx - rw * 0.3, gy - rh * 0.72], [cx - rw * 0.18, gy - rh * 1.25], [cx - rw * 0.08, gy - rh], [cx + rw * 0.12, gy - rh], [cx + rw * 0.22, gy - rh * 1.15], [cx + rw * 0.32, gy - rh * 0.8], [cx + rw * 0.42, gy - rh * 0.95], [cx + rw / 2 + 1, gy - rh * 0.5], [cx + rw / 2 + 4, gy]], 'rock', 7); S.noise(cx - rw / 2 - 4, gy - rh, rw + 8, rh, 1, 3, 29); for (let i = 0; i < 10; i++) S.px(cx - rw / 2 + (i * 13) % rw, gy - 3 - (i * 7) % (rh - 6), 'moss', 7); S.hl(cx - rw * 0.25, gy - rh, rw * 0.55, 'rock', 9); S.end();
  // the glowing fissures in the rock (more at 2+)
  const lf = sc.light({ x: cx, y: gy - rh / 2, z: 6, r: rw * 0.6, i: 0.8, c: '#b89cff', fl: 'pulse', amp: 0.3, sp: 1.1, tint: 0 }); S.beg(); [[cx - 8, gy - 2, cx - 4, gy - rh + 6], [cx + 6, gy - 3, cx + 9, gy - rh + 8]].slice(0, st >= 2 ? 2 : 1).forEach(([a, b, c, d]) => S.line(a, b, c, d, 'arcane', 9, { e: lf + 1 })); S.end();
  // the tripod and its violet smoke; the floating eye above
  const tx = cx, ty = gy - rh; S.lay('mid'); S.beg(); S.line(tx - 4, ty, tx - 1, ty - 6, 'brass', 7); S.line(tx + 4, ty, tx + 1, ty - 6, 'brass', 5); S.vl(tx, ty - 6, 6, 'brass', 6); S.ell(tx + 0.5, ty - 7, 4, 2, 'brass', 8); S.end(); sc.emit({ k: 'soul', x: tx, y: ty - 9, rate: 1 + st * 0.4, sp: 6, ang: 0, spread: 0.4, life: 2, w: 3 });
  const ey = ty - Math.round(h * 0.34), le = sc.light({ x: tx, y: ey, z: 10, r: 22, i: 0.9, c: '#e0c8ff', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.5 });
  G.an.push((D, t, s) => { const bob = Math.round(Math.sin(t * 1.3) * 2), open = s.st.cheer ? 1 : steps(t, 5) < 0.05 ? 0 : 1, y = ey + bob; D.lay('front'); D.hl(tx - 6, y, 13, 'linen', 9, { e: 255 }); D.hl(tx - 4, y - 1, 9, 'linen', open ? 10 : 6, { e: 255 }); D.hl(tx - 4, y + 1, 9, 'linen', open ? 8 : 6, { e: 255 }); D.hl(tx - 2, y - 2, 5, 'linen', open ? 9 : 5, { e: 255 }); D.hl(tx - 2, y + 2, 5, 'linen', open ? 7 : 5, { e: 255 }); if (open) { D.rect(tx - 2, y - 2, 5, 5, 'arcane', 8, { e: 255 }); D.rect(tx - 1, y - 1, 3, 3, 'ink', 1); D.px(tx - 1, y - 1, 'linen', 11, { e: 255 }); } D.px(tx - 5, y, 'arcane', 9, { e: le + 1 }); D.px(tx + 5, y, 'arcane', 9, { e: le + 1 });
    if (st >= 3) for (let k = 0; k < 16; k++) { const a = t * 0.9 + k * 0.39; D.px(tx + Math.round(Math.cos(a) * 9), y + Math.round(Math.sin(a) * 6), 'gold', 10, { e: 255 }); } });
  // rune stones round the outcrop
  [cx - rw / 2 - 2, cx + rw / 2 + 1].forEach((x, i) => { S.lay('front'); S.beg(); S.poly([[x - 2, gy], [x - 2, gy - 12 - i * 2], [x + 1, gy - 14 - i * 2], [x + 3, gy]], 'stone', 6); if (st >= 2) { S.px(x, gy - 9, 'arcane', 10, { e: lf + 1 }); S.px(x, gy - 6, 'arcane', 10, { e: lf + 1 }); } S.end(); });
  if (st >= 3) { const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.3); }); sc.emit({ k: 'rune', x: cx, y: gy - rh, rate: 1.2, sp: 6, ang: 0, spread: 2, life: 2, w: rw * 0.6 }); }
  worker(G, R + 4, -1, 'staff'); G.fx = { x: tx, y: ey };
}, show(s, o) { if (once(s, o, 'eye', 0)) s.st.cheer = 1.5; }, sfx: (d) => SN.snd(S => { S.noise(1.2, 0.04, 600, d); S.tone(147, 1.2, 'sine', 0.05, 0, d); S.tone(220, 1.2, 'sine', 0.03, 0, d + 0.2); }) });

// ───────── 月神殿 ev_pri2: a great crescent arch on white steps, a pond mirroring the moonlight under it, silver lamps, moonflowers ─────────
BS('ev_pri2', { kind: 'holy', col: '#cfe0ff', look: 'mage', icon: 'star', pillarC: '#d8e8ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  S.lay('wall'); S.beg(); for (let k = 0; k < 3; k++) S.box(cx - Math.round(w * 0.42) + k * 3, gy - 2 - k * 2, Math.round(w * 0.84) - k * 6, 2, 'bone', 9 - k * 0.5, { top: 1 }); S.end();
  // the crescent: two arcs, the inner offset so it thins to points, silver, glowing along its inside (gold at 3)
  const cr = Math.round(h * [0, 0.42, 0.5, 0.56][st]), ccy = gy - 7 - cr, m = st >= 3 ? 'gold' : 'ice', lm = sc.light({ x: cx, y: ccy, z: 8, r: cr * 1.8, i: 0.9, c: '#cfe0ff', fl: 'pulse', amp: 0.12, sp: 0.7, tint: 0.45 });
  S.lay('mid'); S.beg(); for (let y = ccy - cr; y <= ccy + cr; y++) for (let x = cx - cr; x <= cx + cr; x++) { const d1 = Math.hypot(x - cx, y - ccy), d2 = Math.hypot(x - cx - cr * 0.42, y - ccy + cr * 0.12); if (d1 <= cr && d2 > cr * 0.86 && y < gy - 6) S.px(x, y, m, d2 < cr * 0.92 ? 11 : 7 + (x < cx ? 1 : 0), d2 < cr * 0.92 ? { e: lm + 1 } : { n: [(x - cx) / cr * 0.6, (y - ccy) / cr * 0.6] }); } S.end();
  // the pond under it, ripples; silver lamps (2+); moonflowers
  const pw = Math.round(w * 0.5); S.lay('front'); S.beg(); S.box(cx - (pw >> 1), gy - 9, pw, 3, 'bone', 8, { top: 1 }); S.hl(cx - (pw >> 1) + 1, gy - 9, pw - 2, 'ice', 8, { e: lm + 1 }); S.end();
  G.an.push((D, t) => { D.lay('front'); const r = Math.round(steps(t, 2.2) * pw * 0.45); D.px(cx - r, gy - 9, 'ice', 11, { e: 255 }); D.px(cx + r, gy - 9, 'ice', 11, { e: 255 }); });
  const flowers = (x0, x1) => { S.lay('front'); S.beg(); for (let x = x0; x < x1; x += 3) { S.vl(x, gy - 4, 3, 'leaf', 5); S.px(x, gy - 5, 'ice', 10, { e: lm + 1 }); } S.end(); }; flowers(L, cx - (pw >> 1) - 2); flowers(cx + (pw >> 1) + 2, R);
  if (st >= 2) [cx - Math.round(w * 0.42), cx + Math.round(w * 0.42)].forEach(x => { S.lay('mid'); S.beg(); S.vl(x, gy - 14, 12, 'stone', 7); S.end(); K.lantern(S, sc, x, gy - 17, { c: '#cfe0ff', m: 'ice' }); });
  if (st >= 3) { const lf = sc.light({ x: cx + cr * 0.9, y: ccy - cr * 0.9, z: 30, r: 40, i: 0.7, c: '#e8f0ff', tint: 0.3 }); S.lay('back'); S.beg(); S.ell(cx + cr * 0.9 + 0.5, ccy - cr * 0.9, 5, 5, 'ice', 10, { e: lf + 1 }); S.end(); const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.3); }); sc.emit({ k: 'glint', x: cx, y: ccy, rate: 1.2, sp: 4, ang: 0, spread: 3, life: 0.8, w: cr }); }
  worker(G, R + 4, -1, 'staff'); G.fx = { x: cx, y: ccy - cr };
}, sfx: (d) => SN.snd(S => { [1568, 1976, 2349, 3136].forEach((f, i) => S.tone(f, 0.6, 'sine', 0.03, 0, d + i * 0.15)); }) });
})();
