// ==== mc-pxtown-w1.js ====
(function () {
// Pixel town wonders, one at a time — batch 1: 亚历山大灯塔 · 罗德岛巨像 · 埃菲尔铁塔 · 圣米歇尔山 · 兵马俑 (designs in the town plan).
// Wonders are the city's landmarks: finer than any building. Painted at st 1 (whole) · 2 (grown) · 3 (the top tier).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, once = PT.once, steps = H.steps;
// a wonder: bespoke, flagged (less haze, drawn far), lit by the moon from the upper left and the town's glow from below
const WB = PT.wonderBS = function (key, D) { const paint = D.paint; D.paint = (S, sc, G, st) => { sc.light({ x: -G.W, y: -G.H * 0.6, z: 240, r: G.W * 5 + G.H * 2, i: 0.6, c: '#c8d0ff', tint: 0.2 }); sc.light({ x: G.cx + G.w * 0.2, y: G.gy + 30, z: 70, r: G.H * 1.3, i: 0.55, c: '#ffcf90', tint: 0.3 }); paint(S, sc, G, st); }; PT.bespoke(key, D); PT.ART[key].wonder = 1; return PT.ART[key]; };
const festoon = (S, sc, x0, x1, y, m, c, sag) => { const li = sc.light({ x: (x0 + x1) / 2, y: y + 2, z: 10, r: Math.abs(x1 - x0) * 0.6 + 8, i: 0.6, c: c || '#ffe080', fl: 'buzz', ph: x0, tint: 0.3 }); S.lay('front'); S.beg(); const n = Math.max(3, Math.round(Math.abs(x1 - x0) / 3)); for (let i = 0; i <= n; i++) { const q = i / n, x = Math.round(x0 + (x1 - x0) * q), yy = Math.round(y + Math.sin(q * Math.PI) * (sag || 3)); S.px(x, yy, 'ink', 2); if (i % 2) S.px(x, yy + 1, m || 'lamp', 10, { e: li + 1 }); } S.end(); };
const water = (S, G, x0, x1, y, m) => { S.lay('front'); S.beg(); S.rect(x0, y, x1 - x0, G.gy + 2 - y, m || 'water', 4); S.hl(x0, y, x1 - x0, m || 'water', 6); S.end(); G.an.push((D, t) => { D.lay('front'); for (let x = x0; x < x1; x++) { if (n1(t * 1.6 + x * 0.45) > 0.5) D.px(x, y, 'water', 10, { e: 255 }); if (n1(t * 1.1 + x * 0.3 + 9) > 0.62) D.px(x, y + 2, 'water', 8); } }); };
const figure = (S, x, y, h, m, t, arm) => { S.beg(); const sw = Math.max(2, Math.round(h * 0.16)); S.poly([[x - sw, y], [x - sw * 0.7, y - h * 0.62], [x + sw * 0.7, y - h * 0.62], [x + sw, y]], m, t); S.rect(x - Math.round(sw * 0.7), Math.round(y - h * 0.82), Math.round(sw * 1.4) + 1, Math.round(h * 0.22), m, t + 0.6); S.ell(x + 0.5, y - h * 0.88, Math.max(1.3, sw * 0.45), Math.max(1.6, sw * 0.55), m, t + 1, { dome: 1 }); if (arm) S.line(x + Math.round(sw * 0.6), Math.round(y - h * 0.8), x + Math.round(sw * 0.9), Math.round(y - h * 1.05), m, t, { w: 1 }); S.end(); };

// ───────── 亚历山大灯塔 lighthouse: three tiers of white stone on the harbour mole, the fire and bronze mirror, the beam ─────────
WB('lighthouse', { kind: 'water', col: '#ffd06a', look: 'keeper', icon: 'sun', beam: true, paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the mole: big blocks, the sea washing against it
  S.lay('wall'); S.beg(); TX.ashlar(S, L - 6, gy - 7, w + 12, 7, 'stone', 6, { bh: 3 }); S.end(); water(S, G, L - 8, L + 4, gy - 3); water(S, G, R - 4, R + 8, gy - 3);
  const t1 = gy - 7 - Math.round(h * 0.4), t2 = t1 - Math.round(h * 0.26), t3 = t2 - Math.round(h * 0.13), w1 = Math.round(w * 0.74), w2 = Math.round(w * 0.46), w3 = Math.round(w * 0.3);
  // tier 1: square, battered a little, rows of small windows, a cornice with merlons and a triton at each corner
  K.wall(S, cx - (w1 >> 1), t1, w1, gy - 7 - t1, ['bone', 8, 'ashlar']); S.beg(); S.poly([[cx - (w1 >> 1) - 2, gy - 7], [cx - (w1 >> 1), t1 + 10], [cx - (w1 >> 1) + 2, gy - 7]], 'bone', 6); S.end();
  S.beg(); [t1 + 4, gy - 26].forEach(y => { S.hl(cx - (w1 >> 1), y, w1, st >= 2 ? 'gold' : 'bone', st >= 2 ? 8 : 6); for (let x = cx - (w1 >> 1) + 1; x < cx + (w1 >> 1); x += 3) S.px(x, y + 1, 'bone', 5); }); S.end(); for (let y = t1 + 9, r = 0; y < gy - 30; y += 14, r++) [cx - Math.round(w1 * 0.3), cx + Math.round(w1 * 0.3) - 3].forEach(x => { K.win(S, sc, x, y, 3, 7, K.tier('water', 1), { deco: '', sill: true, lit: st >= 2 || r % 2 === 0, i: 0.45, c: '#ffd890' }); S.beg(); S.px(x + 1, y - 2, 'bone', 9); S.end(); });
  K.door(S, cx - 4, gy - 21, 8, 14, K.tier('water', 2), 2); P.merlons(S, cx - (w1 >> 1) - 2, cx + (w1 >> 1) + 2, t1, 'bone', 9, st >= 3);
  [cx - (w1 >> 1) + 1, cx + (w1 >> 1) - 2].forEach(x => figure(S, x, t1 - 2, 12, st >= 2 ? 'gold' : 'bone', st >= 2 ? 7 : 8, true));
  // tier 2: octagonal (lit face, two shaded faces), slit windows; tier 3: a drum with columns
  S.beg(); for (let y = t2; y < t1 - 2; y++) { S.rect(cx - (w2 >> 1), y, 3, 1, 'bone', 6.5, { n: [-0.6, 0] }); S.rect(cx - (w2 >> 1) + 3, y, w2 - 6, 1, 'bone', 8.5); S.rect(cx + (w2 >> 1) - 3, y, 3, 1, 'bone', 5.5, { n: [0.6, 0] }); } S.noise(cx - (w2 >> 1), t2, w2, t1 - t2, 1, 3, 5); S.box(cx - (w2 >> 1) - 2, t2 - 2, w2 + 4, 3, 'bone', 9, { top: 1 }); S.end();
  for (let y = t2 + 5; y < t1 - 8; y += 10) K.win(S, sc, cx - 1, y, 2, 6, K.tier('water', 1), { deco: '', sill: false, i: 0.45, c: '#ffd890' });
  S.lay('mid'); S.beg(); S.rect(cx - (w3 >> 1), t3, w3, t2 - t3 - 2, 'night', 2); for (let x = cx - (w3 >> 1); x < cx + (w3 >> 1); x += 3) S.cyl(x, t3, 2, t2 - t3 - 2, 'bone', 9, { rim: 1 }); S.box(cx - (w3 >> 1) - 2, t3 - 2, w3 + 4, 2, 'bone', 9, { top: 1 }); S.end();
  // the fire bowl and the bronze mirror; the statue on top (3)
  const lf = sc.light({ x: cx, y: t3 - 6, z: 14, r: 50 + st * 8, i: 1.5, c: '#ffb050', fl: 'fire', tint: 0.6 }); S.beg(); S.poly([[cx - 6, t3 - 3], [cx + 7, t3 - 3], [cx + 4, t3 + 1], [cx - 3, t3 + 1]], 'brass', 7); S.hl(cx - 6, t3 - 3, 13, 'brass', 10); S.end();
  S.lay('back'); S.beg(); S.ell(cx + 0.5, t3 - 10, 6, 7, 'brass', 8, { dome: 1 }); S.ell(cx + 0.5, t3 - 10, 4, 5, 'gold', 9); S.end();
  const fs = {}; G.an.push((D, t, s) => { const f = H.fireSim(fs, 13, 13 + st * 2, t, 0.95 + (s.st.roar || 0) * 0.4, 0.4); D.lay('mid'); H.drawFire(D, f, 13, 13 + st * 2, cx - 6, t3 - 16 - st * 2); s.st.roar = Math.max(0, (s.st.roar || 0) - 0.015); });
  if (st >= 3) { S.lay('back'); figure(S, cx, t3 - 20, 16, 'gold', 8, true); festoon(S, sc, cx - (w1 >> 1), cx + (w1 >> 1), t1 + 4, 'lamp', '#ffe080', 3); festoon(S, sc, cx - (w2 >> 1), cx + (w2 >> 1), t2 + 4, 'lamp', '#ffe080', 2); }
  if (st >= 2) { K.flag(S, G, cx - (w1 >> 1) - 1, t1 - 4, 10, 'tile'); K.flag(S, G, cx + (w1 >> 1), t1 - 4, 10, 'tile'); }
  G.lamp = { x: cx, y: t3 - 6 }; G.fx = { x: cx, y: t3 - 10 };
}, show(s, o) { if (once(s, o, 'roar', 0)) s.st.roar = 1.6; }, sfx: (d) => { SN.horn(d, 1.4); [784, 988, 1175].forEach((f, i) => SN.chime(f, d + 0.35 + i * 0.14, 0.05)); } });

// ───────── 罗德岛巨像 colossus: the bronze giant astride the harbour mouth, torch raised, crown of rays, a ship sailing between its legs ─────────
WB('colossus', { kind: 'water', col: '#ffc070', look: 'keeper', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G, m = 'copper';
  water(S, G, L - 8, R + 8, gy - 5);
  // the ship: sails between the legs back and forth, lamps at 3
  G.an.push((D, t) => { const q = (Math.sin(t * 0.35) + 1) / 2, x = Math.round(L + 6 + q * (w - 20)), dir = Math.cos(t * 0.35) > 0 ? 1 : -1, bob = Math.round(Math.sin(t * 2)); D.lay('front'); D.beg(); D.poly([[x - 7, gy - 6 + bob], [x + 7, gy - 6 + bob], [x + 5, gy - 3 + bob], [x - 5, gy - 3 + bob]], 'wood', 5); D.vl(x, gy - 20 + bob, 14, 'wood', 6); D.poly([[x + 1, gy - 19 + bob], [x + 1 + dir * 7, gy - 12 + bob], [x + 1, gy - 8 + bob]], 'linen', 9); if (st >= 3) { D.px(x - 5, gy - 7 + bob, 'lamp', 11, { e: 255 }); D.px(x + 5, gy - 7 + bob, 'lamp', 11, { e: 255 }); } D.end(); });
  // the pedestals: stepped stone blocks with lamps (2+)
  const px = [cx - Math.round(w * 0.3), cx + Math.round(w * 0.3)], ph = Math.round(h * 0.16); px.forEach(x => { K.wall(S, x - 8, gy - ph - 5, 17, ph, ['stone', 7, 'ashlar']); S.beg(); S.box(x - 9, gy - ph - 7, 19, 2, 'stone', 9, { top: 1 }); S.end(); if (st >= 2) K.lantern(S, sc, x, gy - ph - 3, { c: '#ffc070' }); });
  // the giant: legs astride, a kilt, a muscled torso lit from the left, the left arm on a spear, the right arm raising the torch, the crowned head
  const top = gy - ph - 7, hh = h - ph - 20, hip = top - Math.round(hh * 0.42), gl = st >= 3 ? 'gold' : m; S.lay('mid'); S.beg();
  S.beg(); const lq = (x0, y0, x1, y1, w0, w1, t) => S.poly([[x0 - w0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1 - w1, y1]], gl, t);
  lq(px[0], top, cx - 5, hip, 4, 3, 6); lq(px[1], top, cx + 5, hip, 4, 3, 5.5); S.ell(px[0] + 0.5, top - 1, 4.5, 2, gl, 6); S.ell(px[1] + 0.5, top - 1, 4.5, 2, gl, 5);
  S.poly([[cx - 10, hip + 3], [cx + 10, hip + 3], [cx + 8, hip - 6], [cx - 8, hip - 6]], gl, 5); for (let x = cx - 9; x < cx + 10; x += 2) S.vl(x, hip - 5, 8, gl, 3.5);
  const ch = Math.round(hh * 0.38), ct = hip - 6 - ch; S.poly([[cx - 8, hip - 6], [cx + 8, hip - 6], [cx + 12, ct + Math.round(ch * 0.3)], [cx + 11, ct + 2], [cx + 4, ct], [cx - 4, ct], [cx - 11, ct + 2], [cx - 12, ct + Math.round(ch * 0.3)]], gl, 6);
  S.hl(cx - 7, ct + Math.round(ch * 0.4), 6, gl, 4); S.hl(cx + 2, ct + Math.round(ch * 0.4), 6, gl, 4); S.vl(cx, ct + Math.round(ch * 0.45), Math.round(ch * 0.4), gl, 4); for (let k = 0; k < 3; k++) S.hl(cx - 4, ct + Math.round(ch * (0.62 + k * 0.1)), 9, gl, 4.5);
  lq(cx - 11, ct + 3, cx - 15, hip + 2, 2, 2, 6.5); S.vl(cx - 16, ct - 12, hip + 22 - ct, 'iron', 8); S.px(cx - 16, ct - 13, 'iron', 10); S.px(cx - 17, ct - 12, 'iron', 9); S.px(cx - 15, ct - 12, 'iron', 9);
  const tx = cx + 14, ty = ct - Math.round(hh * 0.32); lq(cx + 10, ct + 3, tx, ty + 3, 2, 2, 7); S.rect(tx - 2, ty, 5, 3, 'gold', 8); S.hl(tx - 2, ty, 5, 'gold', 10);
  S.rect(cx - 2, ct - 3, 5, 3, gl, 6); S.ell(cx + 0.5, ct - 7, 4.5, 5, gl, 7, { dome: 1 }); S.hl(cx - 2, ct - 7, 2, 'ink', 2); S.hl(cx + 1, ct - 7, 2, 'ink', 2); S.px(cx, ct - 5, gl, 5);
  for (let i = -4; i <= 4; i++) S.line(cx + i, ct - 11, cx + Math.round(i * 1.8), ct - 16 - (Math.abs(i) < 2 ? 2 : 0), st >= 2 ? 'gold' : gl, st >= 2 ? 10 : 8, st >= 2 ? { e: 255 } : null); S.end();
  for (let y = ct - 12; y < top; y++) for (let x = cx - 18; x < cx + 18; x++) { if (x < cx - 3) S.tone(x, y, 1.2); else if (x > cx + 4) S.tone(x, y, -1.2); }
  S.noise(cx - 16, ct - 12, 32, hip - ct + 16, 1, 3, 31);
  const li = sc.light({ x: tx, y: ty - 5, z: 16, r: 40 + st * 10, i: 1.4, c: '#ffb050', fl: 'fire', tint: 0.6 }); const fs = {}; G.an.push((D, t, s) => { const f = H.fireSim(fs, 7, 9 + st * 2, t, 1 + (s.st.roar || 0) * 0.4, 0.4); D.lay('mid'); H.drawFire(D, f, 7, 9 + st * 2, tx - 3, ty - 9 - st * 2); s.st.roar = Math.max(0, (s.st.roar || 0) - 0.02); });
  if (st >= 3) { festoon(S, sc, px[0], px[1], top - 4, 'lamp', '#ffe080', 5); sc.emit({ k: 'glint', x: cx, y: ct, rate: 1.4, sp: 4, ang: 0, spread: 3, life: 0.7, w: 20, h: 30 }); }
  G.fx = { x: tx, y: ty - 6 };
}, show(s, o) { if (once(s, o, 'roar', 0)) s.st.roar = 2; } });

// ───────── 埃菲尔铁塔 eiffel: four curving lattice legs, the great arches, three platforms with rails, the lift, lights; the sparkle at 3 ─────────
WB('eiffel', { kind: 'power', col: '#ffd070', look: 'keeper', icon: 'bolt', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G, m = st >= 3 ? 'brass' : 'copper', hw = (y) => Math.max(1, Math.round(w * 0.46 * Math.pow(1 - (gy - y) / h, 2.3)));
  // the legs: two lattice girders each side, cross-bracing in X, lighter on the left
  S.lay('wall'); S.beg(); for (let y = gy - 1; y > gy - h + 6; y--) { const a = hw(y), b = Math.max(0, a - Math.max(2, Math.round(a * 0.22))); S.px(cx - a, y, m, 8); S.px(cx - b, y, m, 6); S.px(cx + a, y, m, 5); S.px(cx + b, y, m, 4);
    if ((gy - y) % 5 === 0) { S.line(cx - a, y, cx - b, y - 5, m, 6); S.line(cx - b, y, cx - a, y - 5, m, 5); S.line(cx + a, y, cx + b, y - 5, m, 4); S.line(cx + b, y, cx + a, y - 5, m, 3); } if ((gy - y) % 10 === 0 && b > 2) S.hl(cx - b, y, b * 2, m, 3); } S.end();
  // the great arch between the legs at the foot
  const ay = gy - Math.round(h * 0.14), aa = hw(ay); S.beg(); for (let x = -aa + 2; x < aa - 2; x++) { const u = x / (aa - 2), y = Math.round(ay + 3 - Math.sqrt(Math.max(0, 1 - u * u)) * Math.round(h * 0.06)); S.px(cx + x, y, m, 7); S.px(cx + x, y + 1, m, 4); } S.end();
  // the platforms with rails and their lights
  const lv = [0.14, 0.38, 0.72]; lv.forEach((f, i) => { const y = gy - Math.round(h * f), a = hw(y) + 2; S.beg(); S.box(cx - a, y - 2, a * 2 + 1, 2, m, 7, { top: 1 }); for (let x = cx - a; x <= cx + a; x += 2) S.px(x, y - 4, m, 5); S.hl(cx - a, y - 5, a * 2 + 1, m, 6); S.end();
    const li = sc.light({ x: cx, y: y - 3, z: 10, r: 14, i: 0.6, c: '#ffd070', fl: 'buzz', ph: i, tint: 0 }); S.beg(); for (let x = cx - a + 1; x < cx + a; x += 3) S.px(x, y - 3, 'lamp', 10, { e: li + 1 }); S.end(); });
  // the lift running up the east leg and down
  G.an.push((D, t) => { const q = (Math.sin(t * 0.5) + 1) / 2, y = Math.round(gy - 4 - q * h * 0.36), a = hw(y) - 2; D.lay('mid'); D.box(cx + a - 2, y - 3, 4, 3, 'crimson', 7); D.px(cx + a - 1, y - 2, 'lamp', 11, { e: 255 }); });
  // the top: a mast, a red light blinking (2+), the searchlight turning (3)
  S.beg(); S.vl(cx, gy - h - 4, 10, m, 8); S.end(); if (st >= 2) G.beacon = { x: cx, y: gy - h - 5, li: sc.light({ x: cx, y: gy - h - 5, z: 8, r: 14, i: 0.1, c: '#ff4040', tint: 0.3 }) };
  if (st >= 3) { G.lamp = { x: cx, y: gy - Math.round(h * 0.86) }; G.an.push((D, t) => { if (steps(t, 5) > 0.3) return; D.lay('front'); for (let i = 0; i < 40; i++) { const y = gy - 4 - ((i * 37) % Math.round(h * 0.9)), a = hw(y); D.px(cx + (i % 2 ? a : -a) - (i % 3), y, 'lamp', 11, { e: 255 }); } }); }
  G.fx = { x: cx, y: gy - h };
}, sfx: (d) => SN.snd(S => { [0, 0.1, 0.2, 0.3, 0.4, 0.5].forEach((a, i) => S.tone(1568 + i * 110, 0.05, 'square', 0.025, 0, d + a)); }) });

// ───────── 圣米歇尔山 michel: a rock island in the tide — walls and round towers at its foot, houses climbing, the abbey and its gold angel ─────────
WB('michel', { kind: 'holy', col: '#ffe8a0', look: 'keeper', icon: 'sun', pillarC: '#fff0c0', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  water(S, G, L - 8, R + 8, gy - 4, 'water');
  // the rock: a steep cone, crags, moss on the ledges
  S.lay('wall'); S.beg(); S.poly([[L - 4, gy - 4], [L + w * 0.12, gy - h * 0.3], [cx - w * 0.12, gy - h * 0.58], [cx + w * 0.08, gy - h * 0.6], [R - w * 0.12, gy - h * 0.32], [R + 4, gy - 4]], 'rock', 8); S.noise(L - 4, gy - Math.round(h * 0.6), w + 8, Math.round(h * 0.6), 1, 3, 9); S.poly([[cx + w * 0.08, gy - h * 0.6], [R - w * 0.12, gy - h * 0.32], [R + 4, gy - 4], [cx + w * 0.1, gy - 4]], 'rock', 6); for (let i = 0; i < 14; i++) S.hl(L + (i * 17) % w, gy - 8 - (i * 11) % Math.round(h * 0.45), 3, 'moss', 6); S.end();
  // the ramparts at the foot: a wall with merlons, round towers
  K.wall(S, L - 2, gy - 16, w + 4, 12, ['stone', 7, 'ashlar']); P.merlons(S, L - 2, R + 2, gy - 16, 'stone', 8, st >= 3); [L - 2, cx - 4, R - 8].forEach(x => { S.lay('mid'); S.beg(); S.cyl(x, gy - 22, 9, 18, 'stone', 7, { rim: 2 }); S.end(); K.roof(S, x - 1, gy - 22, 11, 6, 'cone', 'iron', 5); });
  // houses climbing the rock in rows, slate roofs, lit windows
  const T = K.tier('water', 1); for (let r = 0; r < 5; r++) { const y = gy - 20 - r * Math.round(h * 0.075), span = Math.round(w * (0.42 - r * 0.07)); for (let x = cx - span + (r % 2) * 3, i = 0; x < cx + span - 6; x += 7, i++) { K.wall(S, x, y - 7, 7, 7, ['bone', 7 + (i % 2), 'smooth']); K.roof(S, x, y - 7, 7, 3, 'gable', 'iron', 5); K.win(S, sc, x + 2, y - 5, 2, 2, T, { deco: '', sill: false, lit: st >= 2 || (x + r) % 2 === 0, i: 0.4 }); } }
  // the abbey church: a long gothic nave on the summit, buttresses, the spire with St Michael in gold
  const ay = gy - Math.round(h * 0.58), aw = Math.round(w * 0.36); K.wall(S, cx - (aw >> 1), ay - 16, aw, 16, ['stone', 7, 'ashlar']); K.roof(S, cx - (aw >> 1) - 1, ay - 16, aw + 2, 8, 'gable', 'iron', 5);
  for (let x = cx - (aw >> 1) + 3; x < cx + (aw >> 1) - 3; x += 5) { K.win(S, sc, x, ay - 13, 2, 7, T, { deco: '', sill: false, c: '#ffe0a0', i: 0.6 }); S.beg(); S.px(x, ay - 14, 'stone', 8); S.end(); }
  const sx = cx + 2, sh = Math.round(h * 0.3); S.beg(); S.box(sx - 4, ay - 26, 8, 12, 'stone', 7); S.poly([[sx - 4, ay - 26], [sx + 0.5, ay - 26 - sh], [sx + 4, ay - 26]], 'iron', 6); for (let k = 4; k < sh; k += 4) S.px(sx + (k % 8 ? -1 : 1), ay - 26 - k, 'iron', 8); S.end();
  const lg = sc.light({ x: sx, y: ay - 28 - sh, z: 12, r: 18, i: st >= 3 ? 1.2 : 0.7, c: '#ffe080', tint: 0.4 }); S.lay('front'); S.beg(); S.vl(sx, ay - 32 - sh, 5, 'gold', 9, { e: lg + 1 }); S.line(sx - 2, ay - 30 - sh, sx + 2, ay - 31 - sh, 'gold', 10, { e: lg + 1 }); S.px(sx, ay - 33 - sh, 'gold', 11, { e: 255 }); S.end();
  // the causeway with lamps (2+); boats and strings of lights (3)
  if (st >= 2) { S.lay('front'); S.beg(); S.hl(R + 1, gy - 5, 10, 'stone', 7); S.end(); [R + 3, R + 8].forEach(x => K.lantern(S, sc, x, gy - 10, { c: '#ffe0a0' })); }
  if (st >= 3) { festoon(S, sc, L, R, gy - 18, 'lamp', '#ffe080', 3); festoon(S, sc, cx - (aw >> 1), cx + (aw >> 1), ay - 17, 'lamp', '#ffe080', 2); const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.25); }); G.an.push((D, t) => { const x = Math.round(L - 4 + ((t * 6) % (w + 8))); D.lay('front'); D.hl(x - 3, gy - 3, 7, 'wood', 6); D.vl(x, gy - 9, 6, 'wood', 6); D.px(x + 1, gy - 8, 'linen', 9); D.px(x - 3, gy - 4, 'lamp', 11, { e: 255 }); }); }
  G.fx = { x: sx, y: ay - 30 - sh };
} });

// ───────── 兵马俑 terracotta: the pit under a long hall roof — ranks of armoured clay warriors, horses and a chariot ─────────
WB('terracotta', { kind: 'war', col: '#d09060', look: 'keeper', icon: 'sword', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the hall: columns and a great hip roof (gold at 3), lanterns hanging (2+)
  const rt = gy - Math.round(h * 0.78), rb = gy - Math.round(h * 0.6); K.roof(S, L - 4, rb, w + 8, rb - rt, 'hip', st >= 3 ? 'gold' : 'tile', st >= 3 ? 6 : 5); S.lay('back'); S.beg(); S.rect(L - 2, rb, w + 4, gy - rb, 'night', 2); for (let x = L; x < R; x += 12) S.rect(x, rb, 3, gy - rb - 10, 'crimson', 4); S.end();
  if (st >= 2) for (let x = L + 6; x < R - 4; x += 12) K.lantern(S, sc, x, rb + 2, { c: '#ff9a50' });
  // the pit: its earthen walls; ranks of warriors (each with a helmet, armour plates, a lance), more ranks by stage
  S.lay('wall'); S.beg(); S.rect(L - 2, gy - Math.round(h * 0.3), w + 4, Math.round(h * 0.3), 'earth', 4); for (let y = gy - Math.round(h * 0.3); y < gy; y += 7) S.hl(L - 2, y, w + 4, 'earth', 5.5); S.end();
  const ranks = 2 + st; for (let r = 0; r < ranks; r++) { const y = gy - 2 - r * Math.round(h * 0.28 / ranks), lay = r === 0 ? 'front' : r === 1 ? 'mid' : 'back', tone = 7 - r * 0.6; S.lay(lay); for (let x = L + 3 + (r % 2) * 3; x < R - 3; x += 6) { if (r === 0 && Math.abs(x - cx) < 10) continue; S.beg(); S.rect(x - 1, y - 8, 3, 6, 'brick', tone); S.hl(x - 1, y - 6, 3, 'brick', tone - 1.5); S.ell(x + 0.5, y - 9.5, 1.5, 1.5, 'brick', tone + 1); S.px(x, y - 11, 'brick', tone - 1); S.vl(x - 1, y - 2, 2, 'brick', tone - 1); S.vl(x + 1, y - 2, 2, 'brick', tone - 1); S.vl(x + 2, y - 13, 11, 'wood', 5); S.px(x + 2, y - 14, 'iron', 8); S.end(); } }
  // the chariot and its horses in the front rank's gap; the general (2+); gold chariot (3)
  const cm = st >= 3 ? 'gold' : 'brick'; S.lay('front'); S.beg(); [cx - 9, cx - 4].forEach(x => { S.rect(x - 3, gy - 9, 6, 3, 'brick', 7); S.rect(x + 3, gy - 12, 2, 4, 'brick', 8); [-2, 0, 2, 3].forEach(lx => S.vl(x + lx, gy - 6, 4, 'brick', 5)); }); S.rect(cx + 1, gy - 10, 8, 5, cm, 7); S.ell(cx + 5.5, gy - 3.5, 3, 3, cm, 6, { ring: 1 }); S.rect(cx + 4, gy - 16, 3, 6, 'brick', 8); S.ell(cx + 5.5, gy - 17, 1.5, 1.5, 'brick', 9); S.end();
  if (st >= 2) { S.lay('front'); S.beg(); S.rect(R - 8, gy - 12, 4, 10, 'brick', 8); S.ell(R - 6 + 0.5, gy - 14, 2, 2, 'brick', 9); S.hl(R - 9, gy - 10, 6, 'gold', 8); S.vl(R - 3, gy - 18, 16, 'iron', 8); S.end(); K.flag(S, G, L - 2, gy - 1, 18, 'crimson'); }
  if (st >= 3) { K.flag(S, G, R + 2, gy - 1, 22, 'gold'); sc.emit({ k: 'glint', x: cx + 5, y: gy - 10, rate: 1, sp: 4, ang: 0, spread: 3, life: 0.7, w: 10 }); }
  G.fx = { x: cx, y: gy - 16 };
}, show(s, o, G, q) { if (once(s, o, 'dust', 0.1)) s.burst('dust', G.cx, G.gy - 8, 16 + q * 4, { sp: 18, ang: 0, spread: 3, life: 1.2, w: G.w }); } });
})();
