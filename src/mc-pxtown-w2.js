// ==== mc-pxtown-w2.js ====
(function () {
// Pixel town wonders, one at a time — batch 2: 自由女神像 · 巨石阵 · 罗马斗兽场 · 泰姬陵 · 马丘比丘 (designs in the town plan).
// Painted at st 1 (whole) · 2 (grown) · 3 (the top tier). PT.wonderBS: mc-pxtown-w1.js.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.wonderBS) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, once = PT.once, steps = H.steps, WB = PT.wonderBS;
const festoon = (S, sc, x0, x1, y, m, c, sag) => { const li = sc.light({ x: (x0 + x1) / 2, y: y + 2, z: 10, r: Math.abs(x1 - x0) * 0.6 + 8, i: 0.6, c: c || '#ffe080', fl: 'buzz', ph: x0, tint: 0.3 }); S.lay('front'); S.beg(); const n = Math.max(3, Math.round(Math.abs(x1 - x0) / 3)); for (let i = 0; i <= n; i++) { const q = i / n, x = Math.round(x0 + (x1 - x0) * q), yy = Math.round(y + Math.sin(q * Math.PI) * (sag || 3)); S.px(x, yy, 'ink', 2); if (i % 2) S.px(x, yy + 1, m || 'lamp', 10, { e: li + 1 }); } S.end(); };
const fireworks = (G, x, y, cols) => G.an.push((D, t) => { const c = steps(t, 3.7); if (c > 0.35) return; const q = c / 0.35, r = Math.round(q * 11); D.lay('front'); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; D.px(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r * 0.8), cols[k % cols.length], 11 - Math.round(q * 6), { e: 255 }); } });
const water = (S, G, x0, x1, y) => { S.lay('front'); S.beg(); S.rect(x0, y, x1 - x0, G.gy + 2 - y, 'water', 4); S.hl(x0, y, x1 - x0, 'water', 6); S.end(); G.an.push((D, t) => { D.lay('front'); for (let x = x0; x < x1; x++) if (n1(t * 1.6 + x * 0.45) > 0.5) D.px(x, y, 'water', 10, { e: 255 }); }); };

// ───────── 自由女神像 liberty: a star fort on the island, the granite pedestal, the copper-green lady with torch, tablet and crown ─────────
WB('liberty', { kind: 'holy', col: '#9af0c8', look: 'keeper', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  water(S, G, L - 8, R + 8, gy - 3);
  // the star fort: a low wall zig-zagging in points
  S.lay('wall'); S.beg(); const fw = Math.round(w * 0.9), fy = gy - 4; for (let x = -fw / 2; x < fw / 2; x++) { const tri = 4 - Math.abs(((x + fw / 2) % 12) - 6) * 0.6; const top = Math.round(fy - 6 - tri); S.rect(cx + x, top, 1, fy - top, 'stone', 6 + (((x + fw / 2) % 12) < 6 ? 1 : -1)); } S.hl(cx - fw / 2, fy - 1, fw, 'stone', 4); S.end();
  // the pedestal: a stepped granite block, rows of windows, a balcony ring, the lamps (2+)
  const pw = Math.round(w * 0.5), pt = fy - 10 - Math.round(h * 0.34); K.wall(S, cx - (pw >> 1), pt, pw, fy - 10 - pt, ['sand', 7, 'ashlar']); S.beg(); S.box(cx - (pw >> 1) - 3, fy - 12, pw + 6, 3, 'sand', 6, { top: 1 }); S.box(cx - (pw >> 1) - 2, pt - 2, pw + 4, 3, 'sand', 8, { top: 1 }); for (let x = cx - (pw >> 1) - 1; x < cx + (pw >> 1) + 1; x += 3) S.vl(x, pt - 5, 3, 'sand', 7); S.hl(cx - (pw >> 1) - 1, pt - 5, pw + 2, 'sand', 8); S.end();
  const T = K.tier('water', 1); for (let y = pt + 6; y < fy - 18; y += 10) [cx - Math.round(pw * 0.25), cx + Math.round(pw * 0.25) - 2].forEach(x => K.win(S, sc, x, y, 3, 6, T, { deco: '', sill: true, i: 0.4, c: '#ffe0a0' }));
  S.beg(); S.rect(cx - 3, fy - 12 - Math.round(h * 0.1), 6, Math.round(h * 0.1), 'sand', 5); S.end();
  if (st >= 2) [cx - (pw >> 1) - 4, cx + (pw >> 1) + 4].forEach(x => { const li = sc.light({ x, y: pt + 10, z: 20, r: 40, i: 0.8, c: '#fff0d0', tint: 0.3 }); S.lay('front'); S.beg(); S.rect(x - 1, fy - 13, 3, 2, 'lamp', 11, { e: li + 1 }); S.end(); });
  // the lady: robe falling in folds, the tablet in her left arm, the right arm raising the torch, the head with its seven rays
  const m = 'teal', base = pt - 5, fh = Math.round(h * 0.42), sw = Math.round(fh * 0.16); S.lay('mid'); S.beg();
  S.poly([[cx - sw - 2, base], [cx - sw, base - fh * 0.6], [cx + sw, base - fh * 0.62], [cx + sw + 2, base]], m, 5); for (let k = -sw; k <= sw; k += 2) S.line(cx + k, base - 1, cx + Math.round(k * 0.7), base - Math.round(fh * 0.58), m, k < 0 ? 7 : 4);
  S.poly([[cx - sw, base - fh * 0.6], [cx + sw, base - fh * 0.6], [cx + sw * 0.8, base - fh * 0.8], [cx - sw * 0.8, base - fh * 0.8]], m, 6);
  S.rect(cx - sw - 4, Math.round(base - fh * 0.72), 4, Math.round(fh * 0.16), 'teal', 7); S.hl(cx - sw - 4, Math.round(base - fh * 0.72), 4, 'teal', 9);
  const ax = cx + sw + 1, tyy = Math.round(base - fh * 1.02); S.line(cx + sw - 1, Math.round(base - fh * 0.78), ax, tyy + 3, m, 6, { w: 2 }); S.rect(ax - 1, tyy, 3, 3, st >= 2 ? 'gold' : m, 8);
  const hy = Math.round(base - fh * 0.86); S.rect(cx - 1, hy + 1, 3, 2, m, 6); S.ell(cx + 0.5, hy - 1, 2.5, 3, m, 7, { dome: 1 }); for (let i = -3; i <= 3; i++) S.line(cx + i, hy - 3, cx + Math.round(i * 1.7), hy - 6 - (Math.abs(i) < 2 ? 1 : 0), st >= 3 ? 'gold' : m, st >= 3 ? 10 : 8, st >= 3 ? { e: 255 } : null); S.end();
  S.noise(cx - sw - 4, Math.round(base - fh), sw * 2 + 8, fh, 1, 3, 37);
  const lt = sc.light({ x: ax, y: tyy - 3, z: 14, r: 32 + st * 8, i: 1.3, c: '#ffc060', fl: 'fire', tint: 0.5 }); G.an.push((D, t, s) => { D.lay('mid'); H.flame(D, ax, tyy - 1, 5 + st + (s.st.emb > 0.5 ? 3 : 0), t, 1, 'fire'); });
  if (st >= 3) { fireworks(G, cx - Math.round(w * 0.35), gy - Math.round(h * 0.85), ['red', 'lamp', 'tile']); fireworks(G, cx + Math.round(w * 0.35), gy - Math.round(h * 0.75), ['gold', 'pink', 'ice']); festoon(S, sc, cx - (pw >> 1), cx + (pw >> 1), pt + 3, 'lamp', '#ffe080', 2); }
  G.fx = { x: ax, y: tyy - 5 };
} });

// ───────── 巨石阵 stonehenge: the outer ring of sarsens with lintels (the far side small and dim), the inner horseshoe, the heel stone ─────────
WB('stonehenge', { kind: 'arcane', col: '#b8f0c0', look: 'mage', icon: 'sun', pillarC: '#fff0c0', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  S.lay('wall'); S.beg(); S.ell(cx + 0.5, gy - 1, w * 0.52, 5, 'moss', 5, { dome: 1 }); S.end();
  const lr = st >= 2 ? sc.light({ x: cx, y: gy - h * 0.4, z: 10, r: w * 0.7, i: 0.7, c: '#9affc0', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.3 }) : -1;
  // a trilithon: two uprights (lit left, shaded right, weathered) with a lintel
  const tri = (x, y, sh, sw, lay, dim, rune) => { S.lay(lay); S.beg(); S.box(x - sw - 1, y - sh, sw, sh, 'stone', 7 - dim); S.box(x + 1, y - sh, sw, sh, 'stone', 6 - dim); S.box(x - sw - 2, y - sh - 3, sw * 2 + 4, 3, 'stone', 8 - dim, { top: 1 }); S.end(); S.noise(x - sw - 2, y - sh - 3, sw * 2 + 4, sh + 3, 1, 2, x); if (rune && lr >= 0) { S.beg(); S.px(x - sw + 1, y - Math.round(sh * 0.6), 'screen', 10, { e: lr + 1 }); S.px(x + 2, y - Math.round(sh * 0.4), 'screen', 10, { e: lr + 1 }); S.end(); } };
  // the far half of the ring (back layer: small, dim), then the inner horseshoe (tall), then the near half (big)
  const ringR = w * 0.44; for (let i = 0; i < 9; i++) { const a = Math.PI + i * Math.PI / 8, x = cx + Math.round(Math.cos(a) * ringR), y = gy - 5 - Math.round(Math.abs(Math.sin(a)) * 4); tri(x, y, Math.round(h * 0.36), 3, 'back', 1.5, false); }
  [-0.22, 0, 0.22].forEach((f, i) => tri(cx + Math.round(w * f), gy - 6, Math.round(h * (i === 1 ? 0.62 : 0.52)), 4, 'wall', 0.5, true));
  for (let i = 0; i < 5; i++) { const a = i * Math.PI / 4, x = cx + Math.round(Math.cos(a) * ringR), y = gy - 1; tri(x, y, Math.round(h * 0.42), 4, 'mid', 0, i % 2); }
  S.lay('front'); S.beg(); S.poly([[R + 1, gy], [R + 2, gy - 16], [R + 6, gy - 18], [R + 7, gy]], 'stone', 6); S.box(cx - 5, gy - 3, 11, 3, 'stone', 7, { top: 1 }); S.end();
  if (st >= 2) [L - 1, R - 3].forEach(x => P.brazier(S, sc, G, x, gy));
  if (st >= 3) { const Gp = G; G.an.push((D, t) => { Gp.pillar = Math.max(Gp.pillar || 0, 0.5 + 0.1 * Math.sin(t)); }); P.circle(S, sc, G, cx, gy, Math.round(w * 0.3), 'screen'); sc.emit({ k: 'rune', x: cx, y: gy - 10, rate: 1.4, sp: 6, ang: 0, spread: 2, life: 2.4, w: w * 0.6 }); }
  G.fx = { x: cx, y: gy - Math.round(h * 0.62) };
} });

// ───────── 罗马斗兽场 colosseum: tiers of arcades with columns, the attic of small windows, one side broken open showing the inner wall ─────────
WB('colosseum', { kind: 'war', col: '#ffc070', look: 'keeper', icon: 'sword', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const H0 = Math.round(h * 0.9), top = gy - H0, bk = cx + Math.round(w * 0.12);
  // the height of the outer wall at x: whole on the left, falling away in a ragged slope on the right (the broken side)
  const wallH = (x) => x < bk ? H0 : Math.max(Math.round(h * 0.26), H0 - Math.round((x - bk) * 0.9) - ((x * 7) % 5));
  // the inner wall standing behind the break: lower, dimmer, its own arches
  S.lay('back'); S.beg(); const iy = gy - Math.round(h * 0.7); for (let x = bk - 6; x < R + 2; x++) for (let y = iy; y < gy; y++) { const col = (x - bk) % 6, arch = col >= 2 && ((y - iy) % 14) > 4 && ((y - iy) % 14) < 12; S.px(x, y, arch ? 'night' : 'bone', arch ? 2 : 5 + (col === 0 ? 1 : 0)); } S.hl(bk - 6, iy, R - bk + 8, 'bone', 7); S.end();
  // the outer wall: three arcades (piers with half-columns, round-headed arches, a cornice on each), the attic band with small windows
  const tiers = [[gy, Math.round(h * 0.25)], [gy - Math.round(h * 0.25), Math.round(h * 0.23)], [gy - Math.round(h * 0.48), Math.round(h * 0.22)]], attic = [gy - Math.round(h * 0.7), H0 - Math.round(h * 0.7)];
  S.lay('wall'); S.beg(); for (let x = L - 2; x < R + 2; x++) { const hx = wallH(x), yTop = gy - hx;
    tiers.forEach(([yb, th], ti) => { const y0 = yb - th; for (let y = Math.max(y0, yTop); y < yb; y++) { const col = (x - L + 2) % 8, ay = y - y0, ah = th - 5, archTop = y0 + 4 + (col === 3 || col === 6 ? 1 : 0); const inArch = col >= 3 && col <= 6 && y >= archTop && y < yb - 1;
      const lit = st >= 2 || (st >= 1 && ti === 0); if (inArch) S.px(x, y, lit && (x * 3 + ti) % 5 ? 'lamp' : 'night', lit && (x * 3 + ti) % 5 ? 8 : 2, lit && (x * 3 + ti) % 5 ? { e: 255 } : null); else S.px(x, y, 'bone', ay < 2 ? 9.5 : col === 1 ? 9 : col === 2 ? 6 : 7.5); } });
    for (let y = Math.max(attic[0] - attic[1], yTop); y < attic[0]; y++) { const col = (x - L + 2) % 16; S.px(x, y, (col >= 7 && col <= 8 && y > attic[0] - attic[1] + 3 && y < attic[0] - attic[1] + 7) ? 'night' : 'bone', col === 0 ? 5.5 : y - (attic[0] - attic[1]) < 2 ? 9 : 7.5); }
    if (x >= bk) for (let k = 0; k < 2; k++) S.px(x, yTop + k, 'bone', 5); } S.end();
  S.noise(L - 2, top, w + 4, H0, 1, 3, 43);
  // flags and awning poles along the whole part of the top; fireworks at 3
  if (st >= 2) for (let x = L + 4; x < bk; x += 16) K.flag(S, G, x, top, 10, st >= 3 ? 'gold' : 'crimson');
  if (st >= 3) { S.lay('back'); S.beg(); for (let x = L + 4; x < bk - 10; x += 12) { S.vl(x, top - 12, 12, 'wood', 6); S.line(x, top - 12, x + 12, top - 6, 'linen', 8); S.line(x, top - 11, x + 12, top - 5, 'crimson', 6); } S.end(); fireworks(G, cx - 10, top - 16, ['gold', 'red', 'lamp']); }
  G.fx = { x: cx, y: top };
}, sfx: (d) => SN.snd(S => { S.noise(1.2, 0.07, 900, d); SN.horn(d + 0.3, 1); }) });

// ───────── 泰姬陵 taj: the marble plinth, the great pointed iwan, the onion dome on its drum, four kiosks, four minarets, the long pool ─────────
WB('taj', { kind: 'holy', col: '#fff0d0', look: 'keeper', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the long reflecting pool in front, cypresses along it
  S.lay('front'); S.beg(); S.box(cx - Math.round(w * 0.22), gy - 5, Math.round(w * 0.44), 5, 'bone', 8, { top: 1 }); S.hl(cx - Math.round(w * 0.2), gy - 5, Math.round(w * 0.4), 'water', 7); S.end(); [cx - Math.round(w * 0.28), cx + Math.round(w * 0.28)].forEach(x => { S.beg(); S.ell(x + 0.5, gy - 8, 2, 7, 'leaf', 4, { dome: 1 }); S.end(); });
  G.an.push((D, t) => { D.lay('front'); for (let x = cx - Math.round(w * 0.2); x < cx + Math.round(w * 0.2); x++) if (n1(t + x * 0.5) > 0.55) D.px(x, gy - 5, 'water', 10, { e: 255 }); });
  // the plinth
  const py = gy - 8; S.lay('wall'); S.beg(); S.box(L - 2, py - 6, w + 4, 6, 'bone', 8, { top: 1 }); for (let x = L; x < R; x += 6) S.rect(x + 2, py - 4, 3, 3, 'bone', 6); S.end();
  // the minarets at the four corners: tapering, three balconies, small domes
  [[-0.47, 'mid', 0.78], [0.47, 'mid', 0.78], [-0.33, 'back', 0.64], [0.33, 'back', 0.64]].forEach(([f, lay, hf]) => { const x = cx + Math.round(w * f), mh = Math.round(h * hf); S.lay(lay); S.beg(); for (let y = py - 6; y > py - 6 - mh; y--) { const hw = Math.round(2.5 - (py - 6 - y) / mh); S.hl(x - hw, y, hw * 2 + 1, 'bone', 9 - (lay === 'back' ? 1.5 : 0)); } [0.33, 0.66, 0.95].forEach(q => S.box(x - 4, Math.round(py - 6 - mh * q), 9, 2, 'bone', 8)); S.ell(x + 0.5, py - 8 - mh, 2.5, 2.5, st >= 3 ? 'gold' : 'bone', 9, { dome: 1 }); S.vl(x, py - 13 - mh, 3, 'gold', 9); S.end(); });
  // the main block: bevelled corners, the iwan (a tall pointed arch in a frame), small arches either side
  const bw = Math.round(w * 0.46), bx = cx - (bw >> 1), bh = Math.round(h * 0.34), bt = py - 6 - bh; K.wall(S, bx, bt, bw, bh, ['bone', 9, 'smooth']); S.beg(); S.rect(bx, bt, 2, bh, 'bone', 7); S.rect(bx + bw - 2, bt, 2, bh, 'bone', 7); S.end();
  const iw = Math.round(bw * 0.34), ih = Math.round(bh * 0.86); S.beg(); S.rect(cx - (iw >> 1) - 2, py - 6 - ih - 3, iw + 4, ih + 3, 'bone', 10); for (let y = py - 6 - ih; y < py - 6; y++) for (let x = cx - (iw >> 1); x < cx + (iw >> 1); x++) { const u = Math.abs(x + 0.5 - cx) / (iw / 2), top = py - 6 - ih + Math.round((1 - Math.sqrt(Math.max(0, 1 - u))) * iw * 0.9); if (y >= top) S.px(x, y, 'night', 3); } S.end();
  const lg = sc.light({ x: cx, y: py - 12, z: 6, r: 16, i: 0.9, c: '#ffe0a0', fl: 'candle', tint: 0.5 }); S.beg(); S.rect(cx - 2, py - 14, 4, 8, 'lamp', 9, { e: lg + 1 }); S.end();
  [-1, 1].forEach(sd => [0.3, 0.7].forEach(q => { const x = cx + sd * Math.round(bw * 0.32) - 2, y = Math.round(bt + bh * q) - 4; S.beg(); S.rect(x, y, 4, 7, 'night', 3); S.px(x + 1, y - 1, 'night', 3); S.px(x + 2, y - 1, 'night', 3); S.end(); }));
  // the drum and the onion dome, the kiosks at its shoulders, the finial
  const dr = Math.round(bw * 0.3), dcy = bt - 6 - dr; S.beg(); S.rect(cx - dr + 2, bt - 7, dr * 2 - 3, 7, 'bone', 8); S.end(); S.beg(); for (let y = -dr - 5; y <= dr; y++) { const q = (y + dr + 5) / (dr * 2 + 5), hw = y < -dr * 0.4 ? Math.round(dr * Math.pow((y + dr + 5) / (dr * 0.6 + 5), 0.8) * 0.9) : Math.round(Math.sqrt(Math.max(0, dr * dr - y * y))); for (let x = -hw; x <= hw; x++) S.px(cx + x, dcy + y, st >= 3 ? 'gold' : 'bone', (st >= 3 ? 8 : 9) + (x < -hw * 0.4 ? 1 : x > hw * 0.4 ? -1.5 : 0), { n: [x / (hw + 1) * 0.7, y / dr * 0.5] }); } S.vl(cx, dcy - dr - 11, 6, 'gold', 10); S.px(cx, dcy - dr - 12, 'gold', 11, { e: 255 }); S.end();
  [-1, 1].forEach(sd => { const x = cx + sd * Math.round(bw * 0.38); S.beg(); S.rect(x - 3, bt - 7, 7, 7, 'bone', 8); S.rect(x - 1, bt - 5, 3, 4, 'night', 3); S.end(); K.roof(S, x - 4, bt - 7, 9, 5, 'onion', st >= 3 ? 'gold' : 'bone', 9); });
  if (st >= 2) { for (let x = L + 2; x < R; x += 10) K.lantern(S, sc, x, py - 9, { c: '#ffe0a0' }); const ld = sc.light({ x: cx, y: dcy, z: 20, r: dr * 3, i: 0.7, c: '#fff4e0', tint: 0.3 }); }
  if (st >= 3) { fireworks(G, cx - Math.round(w * 0.3), dcy - 6, ['gold', 'pink']); G.an.push((D, t) => { D.lay('front'); for (let i = 0; i < 5; i++) { const x = cx - Math.round(w * 0.2) + ((i * 17 + Math.floor(t * 3)) % Math.round(w * 0.4)); D.px(x, gy - 6, 'lamp', 11, { e: 255 }); } }); }
  G.fx = { x: cx, y: dcy - dr };
} });

// ───────── 马丘比丘 machu: the sharp green peak behind, stone terraces stepping down, thatched huts, the sun stone, llamas, mist ─────────
WB('machu', { kind: 'nature', col: '#a8e070', look: 'farmer', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // Huayna Picchu: a steep peak behind to the right, green on its ledges; the saddle ridge
  S.lay('back'); S.beg(); S.poly([[cx - w * 0.1, gy - h * 0.42], [R - w * 0.22, gy - h], [R - w * 0.12, gy - h * 0.92], [R + 4, gy - h * 0.38], [R + 4, gy - h * 0.2], [cx - w * 0.1, gy - h * 0.3]], 'moss', 5); S.poly([[R - w * 0.22, gy - h], [R - w * 0.12, gy - h * 0.92], [R - w * 0.1, gy - h * 0.7], [R - w * 0.2, gy - h * 0.75]], 'rock', 6); S.noise(cx - Math.round(w * 0.1), gy - h, Math.round(w * 0.6), Math.round(h * 0.8), 1, 3, 41); for (let i = 0; i < 60; i++) { const x = R - Math.round(w * 0.36) + (i * 7) % Math.round(w * 0.36), y = gy - Math.round(h * 0.35) - (i * 11) % Math.round(h * 0.6); S.hl(x, y, 3, i % 4 ? 'leaf' : 'rock', 5 + (i % 3)); } S.end();
  // the terraces: stone walls (courses) topped with grass, stepping down to the left
  const rows = 7; for (let r = 0; r < rows; r++) { const y = gy - r * Math.round(h * 0.08), x0 = L - 4 + r * Math.round(w * 0.045), x1 = R - Math.round(w * 0.06) - r * Math.round(w * 0.035); S.lay('wall'); S.beg(); TX.ashlar(S, x0, y - 6, x1 - x0, 6, 'stone', 7 - r * 0.2, { bh: 2 }); S.rect(x0, y - 9, x1 - x0, 3, 'leaf', 6); S.hl(x0, y - 9, x1 - x0, 'leaf', 8); for (let x = x0; x < x1; x += 4) S.px(x + (r % 2), y - 8, 'leaf', 4); S.end(); }
  // the huts: stone gables with steep thatch, doorways; the sun stone on the highest terrace
  const T = K.tier('nature', 0); for (let i = 0; i < 7; i++) { const r = 2 + (i % 3), x = L + 8 + i * Math.round(w * 0.1), y = gy - r * Math.round(h * 0.07) - 8; if (x > R - Math.round(w * 0.2)) continue; K.wall(S, x, y - 7, 8, 7, ['stone', 7, 'ashlar']); K.roof(S, x - 1, y - 7, 10, 6, 'thatch', 'sand', 6); S.beg(); S.rect(x + 3, y - 4, 2, 4, 'night', 1); S.end(); if (st >= 2 && i % 2) K.win(S, sc, x + 6, y - 5, 1, 2, T, { deco: '', sill: false }); }
  const sy = gy - rows * Math.round(h * 0.07) - 6, sx = cx - Math.round(w * 0.05); S.lay('mid'); S.beg(); S.box(sx - 4, sy - 3, 9, 3, 'stone', 8, { top: 1 }); S.poly([[sx - 1, sy - 3], [sx, sy - 9], [sx + 2, sy - 9], [sx + 3, sy - 3]], 'stone', 8); S.end();
  // llamas grazing on the terraces
  G.an.push((D, t) => { [[L + 14, 1], [cx + 8, 3]].forEach(([x, r], i) => { const y = gy - r * Math.round(h * 0.07) - 8, head = Math.sin(t * 0.8 + i * 2) > 0.3 ? 2 : 0; D.lay('front'); D.rect(x, y - 4, 5, 3, 'linen', 8); D.vl(x + 4, y - 8 + head, 4, 'linen', 8); D.px(x + 5, y - 8 + head, 'linen', 7); [0, 1, 3, 4].forEach(lx => D.vl(x + lx, y - 1, 1, 'linen', 5)); }); });
  sc.emit({ k: 'mist', x: cx, y: gy - Math.round(h * 0.3), rate: 0.6, sp: 3, ang: 1.2, spread: 0.6, life: 4, w: w });
  if (st >= 2) for (let i = 0; i < 4; i++) P.brazier(S, sc, G, L + 6 + i * Math.round(w * 0.2), gy - (i + 1) * Math.round(h * 0.07) - 8);
  if (st >= 3) { const ls = sc.light({ x: sx, y: sy - 18, z: 14, r: 30, i: 1.1, c: '#ffd050', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.4 }); S.lay('back'); S.beg(); S.ell(sx + 0.5, sy - 18, 5, 5, 'gold', 9, { e: ls + 1 }); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(sx + Math.round(Math.cos(a) * 8), sy - 18 + Math.round(Math.sin(a) * 8), 'gold', 10, { e: 255 }); } S.end(); festoon(S, sc, L, R - Math.round(w * 0.2), gy - Math.round(h * 0.2), 'lamp', '#ffd070', 4); }
  G.fx = { x: sx, y: sy - 10 };
} });
})();
