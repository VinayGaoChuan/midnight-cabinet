// ==== mc-pxtown-w3.js ====
(function () {
// Pixel town wonders, one at a time — batch 3: 悉尼歌剧院 · 奥林匹亚宙斯神像 · 金字塔 · 空中花园 · 亚历山大图书馆 (designs in the town plan).
// Painted at st 1 (whole) · 2 (grown) · 3 (the top tier). PT.wonderBS: mc-pxtown-w1.js.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.wonderBS) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, once = PT.once, steps = H.steps, WB = PT.wonderBS;
const fireworks = (G, x, y, cols) => G.an.push((D, t) => { const c = steps(t, 3.7); if (c > 0.35) return; const q = c / 0.35, r = Math.round(q * 11); D.lay('front'); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; D.px(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r * 0.8), cols[k % cols.length], 11 - Math.round(q * 6), { e: 255 }); } });
const columns = (S, x0, x1, y0, y1, step, m, t) => { for (let x = x0; x < x1; x += step) { S.beg(); S.cyl(x, y0, 3, y1 - y0, m, t, { rim: 2 }); S.box(x - 1, y0, 5, 2, m, t + 1); S.box(x - 1, y1 - 1, 5, 1, m, t - 1); S.end(); } };

// ───────── 悉尼歌剧院 opera: white shells of different sizes on a granite podium, chevron tiles, glass mouths aglow, the harbour and a ferry ─────────
WB('opera', { kind: 'trade', col: '#fff0c0', look: 'keeper', icon: 'star', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  S.lay('front'); S.beg(); S.rect(L - 8, gy - 3, w + 16, 5, 'water', 4); S.hl(L - 8, gy - 3, w + 16, 'water', 6); S.end(); G.an.push((D, t) => { D.lay('front'); for (let x = L - 8; x < R + 8; x++) if (n1(t * 1.6 + x * 0.4) > 0.55) D.px(x, gy - 3, 'water', 10, { e: 255 }); const fx = Math.round(L + ((t * 5) % (w + 20)) - 10); D.rect(fx - 4, gy - 6, 9, 3, 'lamp', 7); D.hl(fx - 4, gy - 7, 9, 'linen', 9); D.px(fx, gy - 9, 'lamp', 11, { e: 255 }); });
  // the podium: broad granite steps
  S.lay('wall'); S.beg(); S.box(L - 2, gy - 12, w + 4, 9, 'sand', 6, { top: 1 }); for (let k = 0; k < 4; k++) S.hl(cx - 20 + k * 2, gy - 12 + k * 2, 40 - k * 4, 'sand', 8); S.end();
  const lg = sc.light({ x: cx, y: gy - 18, z: 10, r: w * 0.6, i: st >= 2 ? 1 : 0.6, c: '#ffd090', fl: 'candle', tint: 0.4 });
  // the shells: each a curved sail, two faces (lit / shade), chevron tile rows, a glass mouth at its base
  const shells = [[-0.36, 0.5, 0.26, 'back'], [-0.2, 0.78, 0.32, 'wall'], [0.02, 0.92, 0.34, 'mid'], [0.24, 0.66, 0.28, 'mid'], [0.4, 0.44, 0.22, 'front']];
  shells.forEach(([f, hf, wf, lay], si) => { const x = cx + Math.round(w * f), sh = Math.round(h * hf * 0.8), sw = Math.round(w * wf), base = gy - 12; S.lay(lay); S.beg();
    for (let k = 0; k < sh; k++) { const q = k / sh, a = x - sw / 2 + Math.pow(q, 2.2) * sw * 0.25, b = x + sw / 2 - Math.pow(q, 0.55) * sw * 0.72; if (b - a < 1) continue; for (let xx = Math.round(a); xx < Math.round(b); xx++) { const u = (xx - a) / (b - a), chev = ((xx + Math.round(k * 0.5)) % 4 === 0) || ((xx - Math.round(k * 0.5)) % 4 === 0 && k % 2 === 0); S.px(xx, base - k, 'linen', (u < 0.5 ? 9.5 : 7.5) - (chev ? 1.2 : 0), { n: [u < 0.5 ? -0.5 : 0.5, -0.4] }); } }
    for (let xx = Math.round(x - sw / 2 + 2); xx < Math.round(x + sw * 0.25); xx++) S.px(xx, base - 1, 'glass', 8, { e: lg + 1 }); S.hl(Math.round(x - sw / 2 + 2), base - 2, Math.round(sw * 0.7), 'glass', 9, { e: lg + 1 }); S.end(); });
  if (st >= 3) { G.an.push((D, t) => { const hue = ['pink', 'teal', 'gold', 'arcane'][Math.floor(t / 1.5) % 4]; D.lay('front'); for (let i = 0; i < 18; i++) { const s0 = shells[i % shells.length], x = cx + Math.round(w * s0[0]) + ((i * 5) % 9) - 4, y = gy - 12 - Math.round(h * s0[1] * 0.8 * (0.3 + (i % 5) * 0.12)); D.px(x, y, hue, 9, { e: 255 }); } }); fireworks(G, cx + 20, gy - Math.round(h * 0.95), ['gold', 'pink', 'teal']); }
  if (st >= 2) for (let x = L; x < R; x += 12) K.lantern(S, sc, x, gy - 15, { c: '#ffe0a0' });
  G.fx = { x: cx + Math.round(w * 0.06), y: gy - 12 - Math.round(h * 0.74) };
}, sfx: (d) => SN.snd(S => { [523, 659, 784, 1047].forEach(f => S.tone(f, 1.2, 'triangle', 0.035, 0, d + 0.2)); }) });

// ───────── 奥林匹亚宙斯神像 zeus: a Doric temple, its middle open, the seated gold-and-ivory god inside with sceptre and Victory ─────────
WB('zeus', { kind: 'holy', col: '#ffe070', look: 'mage', icon: 'sun', pillarC: '#fff4c0', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const top = gy - Math.round(h * 0.66), stb = gy - 6;
  // stylobate steps; the dark cella behind; the god, lit warm from below
  S.lay('wall'); S.beg(); for (let k = 0; k < 3; k++) S.box(L - 4 + k * 2, gy - 2 - k * 2, w + 8 - k * 4, 2, 'bone', 8 - k * 0.5, { top: 1 }); S.rect(L + 2, top, w - 4, stb - top, 'night', 2); S.end();
  const li = sc.light({ x: cx, y: stb - 20, z: 20, r: h * 0.7, i: 1.3, c: '#ffd890', fl: 'candle', tint: 0.4 });
  const gh = Math.round((stb - top) * 0.92), gb = stb - 1; S.lay('back'); S.beg();
  S.box(cx - 12, gb - Math.round(gh * 0.42), 25, Math.round(gh * 0.42), 'gold', 5); S.rect(cx - 13, gb - Math.round(gh * 0.72), 3, Math.round(gh * 0.3), 'gold', 6); S.rect(cx + 11, gb - Math.round(gh * 0.72), 3, Math.round(gh * 0.3), 'gold', 4);
  S.poly([[cx - 9, gb - 2], [cx + 9, gb - 2], [cx + 8, gb - Math.round(gh * 0.36)], [cx - 8, gb - Math.round(gh * 0.36)]], 'gold', 7); for (let k = -7; k <= 7; k += 3) S.line(cx + k, gb - 3, cx + Math.round(k * 0.8), gb - Math.round(gh * 0.34), 'gold', 5);
  S.poly([[cx - 7, gb - Math.round(gh * 0.36)], [cx + 7, gb - Math.round(gh * 0.36)], [cx + 6, gb - Math.round(gh * 0.72)], [cx - 6, gb - Math.round(gh * 0.72)]], 'bone', 9, { e: li + 1 }); S.line(cx - 6, gb - Math.round(gh * 0.7), cx + 5, gb - Math.round(gh * 0.4), 'gold', 8);
  S.ell(cx + 0.5, gb - Math.round(gh * 0.8), 3.5, 4, 'bone', 9); S.hl(cx - 3, gb - Math.round(gh * 0.86), 7, 'gold', 9); S.rect(cx - 2, gb - Math.round(gh * 0.76), 5, 3, 'linen', 8);
  const sx = cx + 10, sy = gb - Math.round(gh * 0.98); S.vl(sx, sy, Math.round(gh * 0.9), 'gold', 9); S.px(sx - 1, sy - 1, 'gold', 10); S.px(sx + 1, sy - 1, 'gold', 10); S.px(sx, sy - 2, 'gold', 10);
  S.line(cx - 7, gb - Math.round(gh * 0.55), cx - 12, gb - Math.round(gh * 0.5), 'bone', 8); S.rect(cx - 14, gb - Math.round(gh * 0.6), 3, 5, 'gold', 9); S.end();
  // columns (the middle bay open), architrave, triglyph frieze, the pediment with its acroteria
  S.lay('mid'); const step = Math.max(8, Math.round(w / 9)); for (let x = L + 3; x < R - 3; x += step) { if (Math.abs(x + 1 - cx) < 16) continue; S.beg(); S.cyl(x, top, 4, stb - top, 'bone', 9, { rim: 2 }); for (let y = top + 2; y < stb; y += 2) S.px(x + 2, y, 'bone', 7); S.box(x - 1, top, 6, 2, 'bone', 10); S.end(); }
  S.lay('wall'); S.beg(); S.box(L, top - 4, w, 4, 'bone', 8, { top: 1 }); for (let x = L; x < R; x += 4) S.rect(x, top - 7, 2, 3, 'bone', 6); S.hl(L, top - 8, w, 'bone', 9); const ph = Math.round(h * 0.2), pm = st >= 2 ? 'gold' : 'bone'; S.poly([[L - 2, top - 8], [cx + 0.5, top - 8 - ph], [R + 2, top - 8]], pm, st >= 2 ? 6 : 8); S.poly([[L + 5, top - 9], [cx + 0.5, top - 6 - ph], [R - 5, top - 9]], 'bone', 5); for (let k = -2; k <= 2; k++) { S.rect(cx + k * 8 - 1, top - 14 - Math.round((2 - Math.abs(k)) * ph * 0.3), 3, 5, 'bone', 7); } [L - 2, cx, R + 1].forEach((x, i) => S.px(x, top - (i === 1 ? 10 + ph : 10), 'gold', 10)); S.end();
  if (st >= 2) for (let x = L; x < R; x += 14) K.lantern(S, sc, x, stb - 8, { c: '#ffd890' });
  if (st >= 3) { K.roof(S, L - 2, top - 8, w + 4, 0, 'flat', 'gold', 7); G.an.push((D, t, s) => { const c = steps(t, 4.1); if (c > 0.12) return; D.lay('front'); let x = sx, y = 0; for (let yy = 0; yy < sy; yy += 2) { x = sx + Math.round((X.rng(Math.floor(t * 30) + yy)() - 0.5) * 6); D.px(x, yy, 'ice', 11, { e: 255 }); D.px(x + 1, yy + 1, 'arcane', 10, { e: 255 }); } s.flash('all', 0.6); }); }
  G.fx = { x: cx, y: gb - Math.round(gh * 0.8) };
}, sfx: (d) => SN.snd(S => { S.noise(0.9, 0.18, 180, d + 0.3); S.tone(60, 0.8, 'sine', 0.15, -20, d + 0.3); }) });

// ───────── 金字塔 pyramids: three pyramids of stepped courses (lit face, shaded face), a smooth casing cap on the greatest, the sphinx, palms ─────────
WB('pyramids', { kind: 'holy', col: '#ffd070', look: 'keeper', icon: 'sun', plinth: 'sand', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  S.lay('wall'); S.beg(); S.rect(L - 6, gy - 3, w + 12, 3, 'sand', 7); S.end();
  const pyr = (x, hf, wf, lay, dim, cap) => { const ph = Math.round(h * hf), pw = Math.round(w * wf); S.lay(lay); S.beg(); for (let k = 0; k < ph; k++) { const hw = Math.round(pw / 2 * (1 - k / ph)); if (hw < 1) break; const course = k % 3 === 0, casing = cap && k > ph * 0.82; for (let xx = -hw; xx < 0; xx++) S.px(x + xx, gy - 3 - k, casing ? 'bone' : 'sand', (casing ? 9 : 8.5 - dim) - (course && !casing ? 1.4 : 0) - ((xx * 7 + k) % 11 === 0 ? 1 : 0), { n: [-0.5, -0.3] }); for (let xx = 0; xx < hw; xx++) S.px(x + xx, gy - 3 - k, casing ? 'bone' : 'sand', (casing ? 6.5 : 5.5 - dim) - (course && !casing ? 1.2 : 0), { n: [0.6, -0.3] }); } S.end();
    if (st >= 3) { const lc = sc.light({ x, y: gy - 3 - ph, z: 12, r: 22, i: 1, c: '#ffe070', fl: 'pulse', amp: 0.25, sp: 1.2, tint: 0.4 }); S.beg(); S.rect(x - 1, gy - 4 - ph, 3, 2, 'gold', 10, { e: lc + 1 }); S.end(); } return { x, y: gy - 3 - ph }; };
  const p2 = pyr(cx + Math.round(w * 0.18), 0.72, 0.5, 'back', 1, true); pyr(cx - Math.round(w * 0.2), 0.95, 0.66, 'wall', 0, false); pyr(cx + Math.round(w * 0.4), 0.42, 0.3, 'mid', 0.5, false);
  // the sphinx: the lion body, the paws forward, the nemes headdress, the face; palms beside it
  const sx = L + Math.round(w * 0.14); S.lay('front'); S.beg(); S.rect(sx - 10, gy - 9, 22, 6, 'sand', 7); S.hl(sx - 10, gy - 9, 22, 'sand', 9); S.rect(sx + 12, gy - 5, 8, 2, 'sand', 8); S.rect(sx - 13, gy - 7, 4, 4, 'sand', 6);
  S.poly([[sx + 5, gy - 9], [sx + 13, gy - 9], [sx + 12, gy - 18], [sx + 6, gy - 18]], 'sand', 7); for (let y = gy - 17; y < gy - 9; y += 2) S.hl(sx + 5, y, 8, 'tile', 6); S.rect(sx + 8, gy - 17, 4, 6, 'sand', 9); S.px(sx + 11, gy - 15, 'ink', 2); S.hl(sx + 9, gy - 12, 2, 'sand', 6); S.end();
  [R - 4, R + 2].forEach((x, i) => { S.lay('front'); S.beg(); S.line(x, gy - 3, x + (i ? 2 : -1), gy - 20 + i * 3, 'wood', 5); [-3, -1, 1, 3].forEach(k => S.line(x + (i ? 2 : -1), gy - 20 + i * 3, x + (i ? 2 : -1) + k * 2, gy - 17 + i * 3 + Math.abs(k) * 0.5, 'leaf', 6)); S.end(); });
  if (st >= 2) [L + 2, sx + 22].forEach(x => P.brazier(S, sc, G, x, gy - 3));
  if (st >= 3) { const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.4); }); }
  G.fx = { x: cx - Math.round(w * 0.2), y: gy - 3 - Math.round(h * 0.95) };
} });

// ───────── 空中花园 gardens: stepped terraces of arches, vines hanging from each, waterfalls from level to level, palms and flowers ─────────
WB('gardens', { kind: 'nature', col: '#a8e070', look: 'farmer', icon: 'leaf', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const lv = 4, th = Math.round(h * 0.22), T = K.tier('nature', 1), lf = st >= 3 ? sc.light({ x: cx, y: gy - h * 0.5, z: 10, r: w * 0.6, i: 0.8, c: '#ff9ad8', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.3 }) : -1;
  for (let r = 0; r < lv; r++) { const y1 = gy - r * th, inset = r * Math.round(w * 0.1), x0 = L - 2 + inset, x1 = R + 2 - inset; S.lay('wall'); S.beg(); TX.ashlar(S, x0, y1 - th, x1 - x0, th, 'sand', 7 - r * 0.2, { bh: 4 }); S.end();
    S.beg(); for (let x = x0 + 3; x < x1 - 5; x += 8) { for (let y = y1 - th + 5; y < y1 - 1; y++) for (let xx = 0; xx < 5; xx++) { const u = Math.abs(xx - 2) / 2.5; if (y >= y1 - th + 5 + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 3)) S.px(x + xx, y, st >= 2 && (x + r) % 3 === 0 ? 'lamp' : 'night', st >= 2 && (x + r) % 3 === 0 ? 8 : 2, st >= 2 && (x + r) % 3 === 0 ? { e: 255 } : null); } } S.end();
    // the garden on top of this terrace, vines falling over its edge
    S.lay('mid'); S.beg(); S.rect(x0, y1 - th - 2, x1 - x0, 3, 'leaf', 6); S.hl(x0, y1 - th - 2, x1 - x0, 'leaf', 8); for (let x = x0; x < x1; x++) { const d = 1 + ((x * 7 + r * 3) % 5); if ((x * 3 + r) % 4 === 0) continue; S.vl(x, y1 - th + 1, d, 'leaf', 5 + ((x + r) % 3)); if ((x * 5 + r) % 9 === 0) S.px(x, y1 - th + 1 + d, ['pink', 'red', 'gold'][x % 3], st >= 3 ? 10 : 8, st >= 3 ? { e: lf + 1 } : null); } S.end();
    if (r < lv - 1 && r % 2 === 0) { const px = x0 + 6 + r * 4; S.lay('front'); S.beg(); S.line(px, y1 - th - 2, px + (r % 2 ? 2 : -2), y1 - th - 12, 'wood', 5); [-3, -1, 1, 3].forEach(k => S.line(px + (r % 2 ? 2 : -2), y1 - th - 12, px + (r % 2 ? 2 : -2) + k * 2, y1 - th - 10 + Math.abs(k) * 0.5, 'leaf', 6)); S.end(); } }
  // the waterfalls: two ribbons stepping down the terraces, splashing at each ledge
  const lw = sc.light({ x: cx, y: gy - h * 0.4, z: 8, r: 26, i: 0.5, c: '#8adcff', tint: 0.3 }); [cx - 6, cx + 8].forEach((x, i) => { S.lay('mid'); S.beg(); S.rect(x - 1, gy - lv * th, 3, lv * th, 'water', 7, { e: lw + 1 }); S.end(); G.an.push((D, t, s) => { D.lay('mid'); for (let y = gy - lv * th; y < gy; y += 2) D.px(x - 1 + ((y + Math.floor(t * 14) + i) % 3), y, 'water', 11, { e: 255 }); if (steps(t * 2 + i * 0.4, 1) < 0.1) s.burst('drip', x, gy - 3, 2, { sp: 10, ang: 0, spread: 2, life: 0.4, floor: gy - 1 }); }); });
  if (st >= 2) for (let r = 0; r < lv; r++) K.lantern(S, sc, L + r * Math.round(w * 0.1) + 1, gy - (r + 1) * th + 3, { c: '#ffd070' });
  if (st >= 3) G.an.push((D, t) => { D.lay('front'); for (let i = 0; i < 4; i++) { const a = t * 1.1 + i * 1.6, x = cx + Math.round(Math.cos(a) * w * 0.35), y = gy - Math.round(h * 0.75) + Math.round(Math.sin(a * 2) * 5), f = Math.floor(t * 8 + i) % 2; D.px(x, y, 'linen', 9); D.px(x - 1, y - f, 'linen', 8); D.px(x + 1, y - f, 'linen', 8); } });
  G.fx = { x: cx, y: gy - lv * th };
} });

// ───────── 亚历山大图书馆 library: a portico of columns under a pediment, the dome behind, scroll shelves glowing between the columns, Athena ─────────
WB('library', { kind: 'arcane', col: '#c8a8ff', look: 'mage', icon: 'book', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const top = gy - Math.round(h * 0.52), stb = gy - 6;
  // the dome behind (gold at 3) on its drum with small windows
  const dr = Math.round(w * 0.2), dy = top - Math.round(h * 0.1); S.lay('back'); S.beg(); S.rect(cx - dr, dy - 4, dr * 2 + 1, Math.round(h * 0.1) + 4, 'bone', 6); for (let x = cx - dr + 3; x < cx + dr - 2; x += 5) S.rect(x, dy - 1, 2, 3, 'lamp', 8, { e: 255 }); S.end(); K.roof(S, cx - dr - 1, dy - 4, dr * 2 + 3, dr, 'dome', st >= 3 ? 'gold' : 'tile', st >= 3 ? 7 : 6);
  // the hall: steps, the lit shelves behind the columns (scrolls in pigeonholes), the columns, the pediment
  S.lay('wall'); S.beg(); for (let k = 0; k < 3; k++) S.box(L - 4 + k * 2, gy - 2 - k * 2, w + 8 - k * 4, 2, 'bone', 8 - k * 0.5, { top: 1 }); S.end();
  const ls = sc.light({ x: cx, y: (top + stb) / 2, z: 12, r: w * 0.6, i: 1, c: '#ffd890', fl: 'candle', tint: 0.4 }); S.beg(); S.rect(L + 2, top, w - 4, stb - top, 'wood', 3); for (let y = top + 3; y < stb - 2; y += 4) { S.hl(L + 2, y, w - 4, 'wood', 5); for (let x = L + 3; x < R - 3; x += 2) if ((x * 7 + y) % 3) S.px(x, y + 1 + ((x + y) % 2), 'paper', 8 + ((x * 3 + y) % 2), { e: ls + 1 }); } S.end();
  S.lay('mid'); for (let x = L + 3; x < R - 3; x += Math.max(8, Math.round(w / 10))) { S.beg(); S.cyl(x, top, 4, stb - top, 'bone', 9, { rim: 2 }); S.box(x - 1, top, 6, 2, 'bone', 10); S.box(x - 1, stb - 1, 6, 1, 'bone', 8); S.end(); }
  S.lay('wall'); S.beg(); S.box(L, top - 5, w, 5, 'bone', 8, { top: 1 }); S.hl(L, top - 2, w, st >= 2 ? 'gold' : 'bone', st >= 2 ? 8 : 6); const ph = Math.round(h * 0.18); S.poly([[L - 2, top - 5], [cx + 0.5, top - 5 - ph], [R + 2, top - 5]], 'bone', 8); S.poly([[L + 5, top - 6], [cx + 0.5, top - 3 - ph], [R - 5, top - 6]], 'bone', 5); S.end(); S.lay('wall'); S.beg(); H.ICON.book(S, cx, top - 9 - Math.round(ph * 0.3)); S.end();
  // Athena before the steps: helmet, spear, shield
  S.lay('front'); S.beg(); S.box(R - 12, gy - 4, 9, 4, 'bone', 7, { top: 1 }); S.rect(R - 9, gy - 18, 3, 14, 'bone', 9); S.ell(R - 7.5, gy - 19, 1.8, 2, 'bone', 9); S.px(R - 8, gy - 22, 'crimson', 7); S.vl(R - 5, gy - 26, 22, 'bone', 8); S.ell(R - 10.5, gy - 11, 2.5, 3.5, 'bone', 7); S.end();
  if (st >= 2) for (let x = L; x < R - 12; x += 14) K.lantern(S, sc, x, stb - 9, { c: '#ffd890' });
  if (st >= 3) G.an.push((D, t) => { for (let i = 0; i < 5; i++) { const a = t * 0.7 + i * 1.26, x = cx + Math.round(Math.cos(a) * dr * 1.8), y = dy - dr - 6 + Math.round(Math.sin(a) * 4); D.lay(Math.sin(a) > 0 ? 'front' : 'back'); D.hl(x - 2, y, 5, 'paper', 10, { e: 255 }); D.px(x - 3, y, 'wood', 6); D.px(x + 3, y, 'wood', 6); } });
  G.fx = { x: cx, y: dy - dr };
} });
})();
