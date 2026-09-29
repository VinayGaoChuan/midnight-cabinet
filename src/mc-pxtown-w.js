// ==== mc-pxtown-w.js ====
(function () {
// The pixel town's wonders (far behind the last street, 1.4 times their size, in the evening haze; mc-wonders.js places
// them): each its own silhouette, grown by stage (more tiers, bronze and gold, more light), its own show and sound.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.H) return;
const { TX, n1 } = X, H = PT.H, { fireSim, drawFire, flame, plinth, win, door, cl, steps } = H, once = PT.once, SN = PT.SND;
const horn = SN.horn, chime = SN.chime;

// 亚历山大灯塔: three stacked tiers of pale stone (square, octagonal, round), a fire bowl at the top with a bronze mirror,
// the beam sweeping the night. 0: two tiers, the fire on the second. 1: the round top tier and the mirror. 2: a gold statue
PT.ART.lighthouse = {
  mat: 'bone', icon: 'sun', padt: 30,
  paint(S, sc, G) {
    const { cx, gy, w, h, st } = G, t1 = gy - Math.round(h * 0.42), t2 = gy - Math.round(h * 0.7), t3 = gy - Math.round(h * 0.84);
    plinth(S, G, 'stone'); S.lay('wall');
    const w1 = Math.round(w * 0.78), w2 = Math.round(w * 0.5), w3 = Math.round(w * 0.32);
    S.beg(); TX.ashlar(S, cx - (w1 >> 1), t1, w1, gy - t1, 'bone', 7, { bh: 6 }); S.box(cx - (w1 >> 1) - 2, t1 - 2, w1 + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = t1 + 7; y < gy - 18; y += 15) [cx - Math.round(w1 * 0.28), cx + Math.round(w1 * 0.28) - 2].forEach(x => win(S, sc, x, y, 3, 6, { i: 0.4, sill: false, fm: 'bone', ft: 4 }));
    door(S, cx - 4, gy - 14, 8, 14);
    S.beg(); for (let x = cx - (w1 >> 1) - 2; x < cx + (w1 >> 1) + 2; x += 4) S.box(x, t1 - 5, 2, 3, 'bone', 8); S.end(); S.beg(); S.hl(cx - (w1 >> 1), t1 + 3, w1, 'gold', 6); S.end();
    const top2 = st >= 1 ? t2 : t2, w2b = w2; S.beg(); for (let y = top2; y < t1 - 2; y++) { S.rect(cx - (w2b >> 1), y, 3, 1, 'bone', 6, { n: [-0.6, 0] }); S.rect(cx - (w2b >> 1) + 3, y, w2b - 6, 1, 'bone', 7.5); S.rect(cx + (w2b >> 1) - 3, y, 3, 1, 'bone', 5, { n: [0.6, 0] }); } S.noise(cx - (w2b >> 1), top2, w2b, t1 - top2, 1, 3, 5); S.box(cx - (w2b >> 1) - 2, top2 - 2, w2b + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = top2 + 8; y < t1 - 8; y += 16) win(S, sc, cx - 1, y, 3, 6, { i: 0.45, sill: false, fm: 'bone', ft: 4 });
    let fy = top2 - 3;
    if (st >= 1) { S.beg(); S.cyl(cx - (w3 >> 1), t3, w3, top2 - t3 - 2, 'bone', 7, { rim: 2 }); S.box(cx - (w3 >> 1) - 2, t3 - 2, w3 + 4, 3, 'bone', 8, { top: 1 }); S.end(); fy = t3 - 3; }
    // the fire bowl and (1+) the bronze mirror behind it
    G.lf = sc.light({ x: cx, y: fy - 5, z: 14, r: 44, i: 1.5, c: '#ffb050', fl: 'fire', tint: 0.6 });
    S.lay('mid'); S.beg(); S.poly([[cx - 6, fy - 3], [cx + 7, fy - 3], [cx + 4, fy + 1], [cx - 3, fy + 1]], 'brass', 7); S.hl(cx - 6, fy - 3, 13, 'brass', 10); S.end(); G.fire = { x: cx, y: fy - 4 };
    if (st >= 1) { S.lay('back'); S.beg(); S.ell(cx + 0.5, fy - 9, 6, 7, 'brass', 8, { dome: 1 }); S.ell(cx + 0.5, fy - 9, 4, 5, 'gold', 9); S.end(); }
    if (st >= 2) { const sy = fy - 18; S.lay('back'); S.beg(); S.rect(cx - 1, sy - 12, 3, 10, 'gold', 7); S.px(cx, sy - 14, 'gold', 9); S.rect(cx - 1, sy - 13, 3, 2, 'gold', 8); S.line(cx + 1, sy - 11, cx + 4, sy - 15, 'gold', 8); S.vl(cx + 4, sy - 18, 8, 'gold', 9); S.hl(cx + 3, sy - 18, 3, 'gold', 10); S.end(); }
    G.lamp = { x: cx, y: fy - 6 };
  },
  anim(D, t, s, o, G) {
    const st = s.st, f = fireSim(st, 13, 13, t, 0.95 + (st.roar || 0) * 0.4, 0.4); D.lay('mid'); drawFire(D, f, 13, 13, G.fire.x - 6, G.fire.y - 12);
    st.roar = Math.max(0, (st.roar || 0) - 0.015);
  },
  show(s, o, G) {
    const q = o.show.q; if (once(s, o, 'i', 0)) { s.st.roar = 1.5; s.flash(G.lf, 2.5); s.burst('ember', G.fire.x, G.fire.y - 4, 16 + q * 6, { sp: 30, ang: 0, spread: 1.2, life: 1.8, w: 8 }); }
  },
  beam: true,
  sfx: (d, q) => { horn(d, 1.4); [784, 988, 1175].forEach((f, i) => chime(f, d + 0.35 + i * 0.14, 0.05)); },
  col: '#ffd06a',
};
})();

// ───────── the other wonders: own silhouettes on the kit's surfaces; show and sound by kind (mc-pxtown-kit.js) ─────────
(function () {
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.K || !PT.P) return;
const { TX } = X, H = PT.H, K = PT.K, P = PT.P, cl = H.cl;
// WD(key, kind, col, paint(S, sc, G)): G.w / G.h / G.cx / G.gy / G.st as for every building
function WD(key, kind, col, paint) {
  PT.ART[key] = { wonder: 1, kind, col, mat: 'stone', icon: 'star',
    paint(S, sc, G) { G.flags = []; G.signs = []; G.workers = []; G.an = []; G.P = { kind, look: 'keeper' }; G.fx = { x: G.cx, y: G.gy - G.h }; H.plinth(S, G, 'stone');
      // moonlight from high on the left and the town's warm glow from the street below: a wonder stands out of the dark
      sc.light({ x: -G.W, y: -G.H * 0.6, z: 240, r: G.W * 5 + G.H * 2, i: 0.6, c: '#c8d0ff', tint: 0.2 }); sc.light({ x: G.cx + G.w * 0.2, y: G.gy + 30, z: 70, r: G.H * 1.3, i: 0.55, c: '#ffcf90', tint: 0.3 }); paint(S, sc, G, G.st);
      G.pillar = 0; const Gp = G; sc.shaft({ x: G.fx.x, y0: 0, y1: G.fx.y + 2, w0: 2, w1: 6, i: 0.9, haze: 0.8, c: '#fff0c0', f: () => Gp.pillar }); },
    anim: K.anim, show: (s, o, G) => K.SHOW[kind](s, o, G, o.show.q), sfx: (d, q) => K.SFX[kind](d, q) };
}
const Y = (G, f) => G.gy - Math.round(G.h * f), Xp = (G, f) => G.cx + Math.round(G.w * f);
const lamps = (S, sc, xs, y, c) => xs.forEach(x => K.lantern(S, sc, x, y, { c }));
const arches = (S, x0, x1, y, h, step, lit) => { S.beg(); const ow = Math.max(2, step - 3); for (let x = x0 + 1; x + ow < x1; x += step) { S.rect(x, y + 1, ow, h - 1, lit ? 'lamp' : 'night', lit ? 8 : 2, lit ? { e: 255 } : null); S.hl(x, y + 1, ow, lit ? 'lamp' : 'night', lit ? 10 : 3, lit ? { e: 255 } : null); S.px(x - 1, y, 'bone', 9); S.px(x + ow, y, 'bone', 9); } S.end(); };
// a robed statue (liberty, colossus): feet at y, h tall, one arm raised with a torch; returns the torch point
function figure(S, cx, y, h, m, t, raise) {
  S.beg(); const sw = Math.max(3, Math.round(h * 0.16));
  S.poly([[cx - sw, y], [cx - Math.round(sw * 0.7), y - h * 0.62], [cx + Math.round(sw * 0.7), y - h * 0.62], [cx + sw, y]], m, t); for (let k = 1; k < 4; k++) S.line(cx - sw + k * sw / 2, y - 1, cx - sw * 0.7 + k * sw * 0.35, y - h * 0.6, m, t - 1.5);
  S.rect(cx - Math.round(sw * 0.7), Math.round(y - h * 0.8), Math.round(sw * 1.4) + 1, Math.round(h * 0.2), m, t + 0.6); S.ell(cx + 0.5, y - h * 0.86, Math.max(1.5, sw * 0.45), Math.max(1.8, sw * 0.55), m, t + 1, { dome: 1 });
  const ax = cx + raise * Math.round(sw * 0.9), ay = Math.round(y - h); S.line(cx + raise * Math.round(sw * 0.6), Math.round(y - h * 0.78), ax, ay, m, t, { w: 2 }); S.line(cx - raise * Math.round(sw * 0.6), Math.round(y - h * 0.75), cx - raise * Math.round(sw * 0.9), Math.round(y - h * 0.62), m, t - 1, { w: 2 });
  S.end(); return { x: ax, y: ay - 1 };
}
const torch = (S, sc, G, p, big) => { const li = sc.light({ x: p.x, y: p.y - 3, z: 14, r: big ? 40 : 26, i: 1.3, c: '#ffb050', fl: 'fire', tint: 0.6 }); S.lay('mid'); S.beg(); S.rect(p.x - 1, p.y, 3, 2, 'gold', 8); S.end(); G.an.push((D, t) => { D.lay('mid'); H.flame(D, p.x, p.y - 1, big ? 7 : 5, t, p.x); }); G.fx = { x: p.x, y: p.y - 4 }; return li; };

// 罗德岛巨像: a bronze giant on two pedestals over the harbour mouth, a torch raised
WD('colossus', 'water', '#6ac8ff', (S, sc, G, st) => { const w = G.w, gy = G.gy; S.lay('front'); S.beg(); S.rect(G.L - 4, gy - 3, w + 8, 3, 'water', 5); S.end();
  [G.cx - Math.round(w * 0.28), G.cx + Math.round(w * 0.28)].forEach(x => { S.lay('wall'); K.wall(S, x - 6, gy - 16, 13, 16, ['stone', 6, 'ashlar']); S.beg(); S.box(x - 7, gy - 17, 15, 2, 'stone', 8, { top: 1 }); S.end(); });
  S.lay('mid'); const top = gy - 17, h = G.h - 26; S.beg(); S.line(G.cx - Math.round(w * 0.28), top, G.cx - 3, top - h * 0.42, 'copper', 6, { w: 3 }); S.line(G.cx + Math.round(w * 0.28), top, G.cx + 3, top - h * 0.42, 'copper', 5, { w: 3 }); S.end();
  const p = figure(S, G.cx, Math.round(top - h * 0.4), Math.round(h * 0.6), 'copper', 6, 1); torch(S, sc, G, p, st >= 1);
  if (st >= 1) { S.beg(); for (let i = -2; i <= 2; i++) S.px(G.cx + i * 2, Math.round(top - h * 0.4 - h * 0.6 * 0.95) - (i % 2 ? 1 : 2), st === 2 ? 'gold' : 'copper', 9, { e: st === 2 ? 255 : 0 }); S.end(); }
  if (st === 2) { lamps(S, sc, [G.cx - Math.round(w * 0.28), G.cx + Math.round(w * 0.28)], gy - 22); K.flag(S, G, G.L + 2, gy - 3, 16, 'gold'); } });
// 埃菲尔铁塔: four iron legs in lattice curving in, three platforms, the beacon; bulbs up the edges, then a searchlight
WD('eiffel', 'power', '#ffd070', (S, sc, G, st) => { const gy = G.gy, h = G.h, w = G.w; const hw = (y) => { const q = (gy - y) / h; return Math.max(1, Math.round(w * 0.46 * Math.pow(1 - q, 2.2))); };
  S.lay('wall'); S.beg(); for (let y = gy - 1; y > gy - h + 4; y--) { const a = hw(y), m = st === 2 ? 'brass' : 'iron'; S.px(G.cx - a, y, m, 8); S.px(G.cx - a + 1, y, m, 6); S.px(G.cx + a, y, m, 5); S.px(G.cx + a - 1, y, m, 6); if ((gy - y) % 6 === 0) { S.line(G.cx - a, y, G.cx + a, y - 6, m, 6); S.line(G.cx + a, y, G.cx - a, y - 6, m, 5); } } S.end();
  S.beg(); for (let yy = gy - 1; yy > gy - Math.round(h * 0.12); yy--) { const a = Math.round(hw(gy - Math.round(h * 0.12)) * Math.sqrt(1 - Math.pow((gy - yy) / (h * 0.12), 2))); S.px(G.cx - a, yy, 'ink', 1); S.px(G.cx + a, yy, 'ink', 1); } S.end();
  [0.12, 0.38, 0.7].forEach((f, i) => { const y = Y(G, f), a = hw(y) + 2; S.beg(); S.box(G.cx - a, y - 2, a * 2 + 1, 2, 'iron', 7, { top: 1 }); S.end(); if (st >= 1) { const li = sc.light({ x: G.cx, y, z: 10, r: 12, i: 0.6, c: '#ffd070', fl: 'buzz', ph: i, tint: 0 }); S.beg(); for (let x = -a; x <= a; x += 2) S.px(G.cx + x, y - 3, 'lamp', 10, { e: li + 1 }); S.end(); } });
  const bl = sc.light({ x: G.cx, y: gy - h + 2, z: 12, r: 20, i: 1, c: '#ff5050', fl: 'pulse', amp: 0.4, sp: 3, tint: 0.5 }); S.beg(); S.vl(G.cx, gy - h - 4, 6, 'iron', 8); S.px(G.cx, gy - h - 5, 'red', 11, { e: bl + 1 }); S.end(); G.fx = { x: G.cx, y: gy - h };
  if (st === 2) G.lamp = { x: G.cx, y: gy - h + 4 }; });
// 圣米歇尔山: a rocky island with houses climbing it, the abbey and its spire on top, the tide round the foot
WD('michel', 'holy', '#ffe8a0', (S, sc, G, st) => { const gy = G.gy, h = G.h, w = G.w; S.lay('wall'); S.beg(); S.poly([[G.L - 4, gy], [G.cx - w * 0.3, gy - h * 0.35], [G.cx - w * 0.1, gy - h * 0.55], [G.cx + w * 0.15, gy - h * 0.52], [G.cx + w * 0.32, gy - h * 0.3], [G.R + 4, gy]], 'rock', 7); S.noise(G.L - 4, gy - Math.round(h * 0.55), w + 8, Math.round(h * 0.55), 1, 3, 9); S.end();
  for (let r = 0; r < 4; r++) { const y = gy - 6 - r * Math.round(h * 0.11), hw = Math.round(w * (0.42 - r * 0.08)); for (let x = G.cx - hw; x < G.cx + hw - 6; x += 9) { K.wall(S, x, y - 6, 7, 6, ['bone', 7, 'smooth']); K.roof(S, x, y - 6, 7, 3, 'gable', 'tile', 5); if (st >= 1 || (x + r) % 2) K.win(S, sc, x + 2, y - 4, 2, 2, G.T || K.tier('water', 1), { deco: '', sill: false, i: 0.5 }); } }
  const ay = Y(G, 0.55), aw = Math.round(w * 0.3); K.wall(S, G.cx - (aw >> 1), ay - 14, aw, 14, ['stone', 6, 'ashlar']); K.roof(S, G.cx - (aw >> 1), ay - 14, aw, 7, 'gable', 'iron', 5); for (let x = G.cx - (aw >> 1) + 2; x < G.cx + (aw >> 1) - 3; x += 5) K.win(S, sc, x, ay - 11, 2, 5, K.tier('water', 1), { deco: '', sill: false, c: '#ffe0a0' });
  const sy = ay - 21, sh = Math.round(h * 0.22); S.beg(); S.poly([[G.cx - 3, sy + 1], [G.cx + 0.5, sy - sh], [G.cx + 4, sy + 1]], 'iron', 6); S.box(G.cx - 3, sy, 7, 7, 'stone', 7); S.end(); G.fx = { x: G.cx, y: sy - sh };
  if (st === 2) { const li = sc.light({ x: G.cx, y: sy - sh - 2, z: 10, r: 16, i: 0.9, c: '#ffe080', tint: 0.5 }); S.beg(); S.vl(G.cx, sy - sh - 5, 4, 'gold', 10, { e: li + 1 }); S.hl(G.cx - 2, sy - sh - 4, 5, 'gold', 9, { e: li + 1 }); S.end(); }
  S.lay('front'); S.beg(); S.rect(G.L - 6, gy - 3, w + 12, 3, 'water', 5); S.end(); G.an.push((D, t) => { D.lay('front'); for (let x = G.L - 6; x < G.R + 6; x++) if (X.n1(t * 1.5 + x * 0.5) > 0.5) D.px(x, gy - 3, 'water', 10, { e: 255 }); }); });
// 兵马俑: rows of clay soldiers in their pit under a long hall roof
WD('terracotta', 'war', '#d09060', (S, sc, G, st) => { const gy = G.gy, w = G.w; S.lay('wall'); K.wall(S, G.L, gy - Math.round(G.h * 0.62), w, Math.round(G.h * 0.3), ['brick', 4, 'bricks']); K.roof(S, G.L - 2, gy - Math.round(G.h * 0.62), w + 4, Math.round(G.h * 0.18), 'hip', st === 2 ? 'gold' : 'tile', st === 2 ? 6 : 6);
  S.beg(); S.rect(G.L, gy - Math.round(G.h * 0.32), w, Math.round(G.h * 0.32), 'earth', 3); S.end(); const rows = 2 + st;
  for (let r = 0; r < rows; r++) { const y = gy - 1 - r * Math.round(G.h * 0.3 / rows); S.lay(r ? 'back' : 'mid'); for (let x = G.L + 3 + (r % 2) * 3; x < G.R - 3; x += 6) { S.beg(); S.rect(x - 1, y - 6, 3, 5, 'brick', 7 - r * 0.5); S.ell(x + 0.5, y - 7, 1.4, 1.4, 'brick', 8 - r * 0.5); S.vl(x - 1, y - 1, 1, 'brick', 5); S.vl(x + 1, y - 1, 1, 'brick', 5); S.vl(x + 2, y - 9, 8, 'wood', 5); S.end(); } }
  if (st >= 1) lamps(S, sc, [G.L + 2, G.R - 2], gy - Math.round(G.h * 0.34)); G.fx = { x: G.cx, y: gy - Math.round(G.h * 0.4) }; });
// 自由女神像: the green lady on her star pedestal, the torch, the crown of rays
WD('liberty', 'holy', '#9af0c8', (S, sc, G, st) => { const gy = G.gy, h = G.h, w = G.w; S.lay('wall'); const pw = Math.round(w * 0.6), ph = Math.round(h * 0.38); S.beg(); S.poly([[G.cx - pw * 0.7, gy], [G.cx - pw * 0.5, gy - 6], [G.cx + pw * 0.5, gy - 6], [G.cx + pw * 0.7, gy]], 'stone', 6); S.end(); K.wall(S, G.cx - (pw >> 1), gy - ph, pw, ph - 6, ['sand', 7, 'ashlar']); S.beg(); S.box(G.cx - (pw >> 1) - 2, gy - ph - 2, pw + 4, 3, 'sand', 8, { top: 1 }); S.end();
  for (let x = G.cx - (pw >> 1) + 3; x < G.cx + (pw >> 1) - 3; x += 6) K.win(S, sc, x, gy - ph + 5, 2, 5, K.tier('water', 1), { deco: '', sill: false, i: 0.4 });
  const p = figure(S, G.cx, gy - ph - 2, h - ph - 8, 'teal', 5, 1); torch(S, sc, G, p, st >= 1); const hy = gy - ph - 2 - Math.round((h - ph - 8) * 0.86);
  S.beg(); for (let i = -3; i <= 3; i++) S.px(G.cx + i, hy - 3 - (Math.abs(i) < 2 ? 1 : 0), st === 2 ? 'gold' : 'teal', 8, { e: st === 2 ? 255 : 0 }); S.rect(G.cx - 5, hy + 8, 3, 5, 'teal', 7); S.end();
  if (st === 2) lamps(S, sc, [G.cx - (pw >> 1) - 3, G.cx + (pw >> 1) + 3], gy - 10); });
// 巨石阵: a ring of trilithons, the altar stone, runes glowing (1+), the aurora of the stones (2)
WD('stonehenge', 'arcane', '#b8f0c0', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; const li = st >= 1 ? sc.light({ x: G.cx, y: gy - h * 0.4, z: 10, r: w * 0.8, i: 0.7, c: '#9affc0', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.5 }) : -1;
  [[-0.4, 0], [-0.16, 1], [0.1, 1], [0.34, 0]].forEach(([f, back]) => { const x = Xp(G, f), hh = Math.round(h * (back ? 0.6 : 0.72)); S.lay(back ? 'back' : 'mid'); S.beg(); S.box(x - 6, gy - hh, 5, hh, 'stone', 8 - back); S.box(x + 2, gy - hh, 5, hh, 'stone', 7 - back); S.box(x - 7, gy - hh - 4, 15, 4, 'stone', 9 - back, { top: 1 }); S.noise(x - 5, gy - hh - 3, 12, hh + 3, 1, 2, 3 + back); if (st >= 1) { S.px(x - 3, gy - hh + 4, 'screen', 10, { e: li + 1 }); S.px(x + 4, gy - hh + 7, 'screen', 10, { e: li + 1 }); } S.end(); });
  S.lay('front'); S.beg(); S.box(G.cx - 5, gy - 3, 11, 3, 'rock', 7, { top: 1 }); S.end(); G.fx = { x: G.cx, y: gy - 6 }; if (st >= 1) { P.brazier(S, sc, G, G.L + 2, gy); P.brazier(S, sc, G, G.R - 2, gy); G.fx = { x: G.cx, y: gy - 6 }; } if (st === 2) { P.circle(S, sc, G, G.cx, gy, Math.round(w * 0.35), 'screen'); G.fx = { x: G.cx, y: gy - 6 }; } });
// 罗马斗兽场: three tiers of arches round the arena, banners on top, the arches lit at 2
WD('colosseum', 'war', '#ffc070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h;
  S.lay('wall'); for (let r = 0; r < 3; r++) { const y0 = gy - Math.round(h * (0.3 + r * 0.24)), y1 = gy - Math.round(h * r * 0.24), inset = r * 3; K.wall(S, G.L + inset, y0, w - inset * 2, y1 - y0, ['bone', 7 - r * 0.5, 'ashlar']); arches(S, G.L + inset + 2, G.R - inset - 2, y0 + 3, Math.round((y1 - y0) * 0.62), 6, st === 2 || (st === 1 && r === 0)); S.beg(); S.hl(G.L + inset - 1, y0, w - inset * 2 + 2, 'bone', 9); S.end(); }
  const tp = gy - Math.round(h * 0.78); if (st >= 1) for (let x = G.L + 10; x < G.R - 8; x += 16) K.flag(S, G, x, tp, 9, st === 2 ? 'gold' : 'crimson'); G.fx = { x: G.cx, y: tp }; });
// 泰姬陵: the white dome and its four minarets on the plinth, a reflecting pool, gold finials (2)
WD('taj', 'holy', '#fff0d0', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h, bw = Math.round(w * 0.46), by = gy - 8;
  S.lay('front'); S.beg(); S.box(G.L - 2, gy - 4, w + 4, 4, 'bone', 8, { top: 1 }); S.hl(G.cx - (bw >> 1), gy - 3, bw, 'water', 7); S.end();
  S.lay('wall'); K.wall(S, G.cx - (bw >> 1), by - Math.round(h * 0.36), bw, Math.round(h * 0.36), ['bone', 9, 'smooth']); S.beg(); S.rect(G.cx - 5, by - Math.round(h * 0.3), 11, Math.round(h * 0.3), 'bone', 7); S.rect(G.cx - 3, by - Math.round(h * 0.26), 7, Math.round(h * 0.26), 'ink', 2); S.end();
  const dt = K.roof(S, G.cx - Math.round(bw * 0.35), by - Math.round(h * 0.36), Math.round(bw * 0.7), Math.round(bw * 0.36), 'onion', st === 2 ? 'gold' : 'bone', st === 2 ? 8 : 9); G.fx = { x: G.cx, y: dt };
  if (st >= 1) [G.cx - (bw >> 1) + 3, G.cx + (bw >> 1) - 4].forEach(x => { S.lay('back'); S.beg(); S.rect(x - 2, by - Math.round(h * 0.36) - 5, 5, 5, 'bone', 8); S.end(); K.roof(S, x - 3, by - Math.round(h * 0.36) - 5, 7, 4, 'onion', st === 2 ? 'gold' : 'bone', 8); });
  [-0.44, -0.3, 0.3, 0.44].forEach((f, i) => { const x = Xp(G, f), mh = Math.round(h * (i % 3 === 0 ? 0.62 : 0.5)); S.lay(i % 3 === 0 ? 'mid' : 'back'); S.beg(); S.cyl(x - 1, gy - 4 - mh, 3, mh, 'bone', 9, { rim: 1.5 }); for (let y = gy - 4 - mh + 6; y < gy - 6; y += 8) S.hl(x - 2, y, 5, 'bone', 7); S.ell(x + 0.5, gy - 5 - mh, 2, 2, st === 2 ? 'gold' : 'bone', 9, { dome: 1 }); S.end(); });
  if (st >= 1) lamps(S, sc, [G.cx - (bw >> 1) - 3, G.cx + (bw >> 1) + 3], by - 6, '#ffe0b0'); if (st === 2) { const l = sc.light({ x: G.cx, y: dt, z: 10, r: 18, i: 1, c: '#ffe080', tint: 0.5 }); S.beg(); S.vl(G.cx, dt - 4, 4, 'gold', 10, { e: l + 1 }); S.end(); } });
// 马丘比丘: terraces up the mountain, stone huts with thatch, the sharp peak behind; the sun disc in gold (2)
WD('machu', 'nature', '#a8e070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; S.lay('wall'); S.beg(); S.poly([[G.L - 4, gy], [G.cx + w * 0.22, gy - h * 0.82], [G.R + 4, gy - h * 0.25], [G.R + 4, gy]], 'rock', 5); S.noise(G.L - 4, gy - h, w + 8, h, 1, 3, 12); S.end(); S.beg(); S.poly([[G.R - w * 0.35, gy - h * 0.4], [G.R - w * 0.18, gy - h], [G.R + 2, gy - h * 0.45]], 'rock', 6); S.noise(Math.round(G.R - w * 0.35), gy - h, Math.round(w * 0.37), Math.round(h * 0.6), 1, 3, 4); S.poly([[G.R - w * 0.24, gy - h * 0.9], [G.R - w * 0.18, gy - h], [G.R - w * 0.1, gy - h * 0.85]], 'moss', 6); S.end();
  for (let r = 0; r < 5; r++) { const y = gy - r * Math.round(h * 0.09), inset = r * Math.round(w * 0.07); S.beg(); S.box(G.L + inset, y - 5, w - inset * 2 - (r ? Math.round(w * 0.12) : 0), 5, 'rock', 8 - r * 0.3, { top: 1 }); S.hl(G.L + inset, y - 6, w - inset * 2 - (r ? Math.round(w * 0.12) : 0), 'moss', 7); S.end(); if (r >= 2 && r <= 3 + (st >= 1 ? 1 : 0)) for (let x = G.L + inset + 4; x < G.L + w - inset - Math.round(w * 0.14) - 6; x += 11) { K.wall(S, x, y - 11, 7, 6, ['rock', 6, 'ashlar']); K.roof(S, x, y - 11, 7, 4, 'thatch', 'sand', 6); K.win(S, sc, x + 3, y - 9, 1, 2, K.tier('nature', 0), { deco: '', sill: false, lit: st > 0 }); } }
  G.fx = { x: G.cx, y: gy - Math.round(h * 0.5) }; if (st === 2) { const li = sc.light({ x: G.cx - w * 0.2, y: gy - h * 0.7, z: 10, r: 24, i: 1, c: '#ffd050', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.5 }); S.beg(); S.ell(G.cx - Math.round(w * 0.2) + 0.5, gy - Math.round(h * 0.7), 4, 4, 'gold', 9, { e: li + 1 }); S.end(); } });
// 悉尼歌剧院: white shells overlapping on a platform by the water, lit from inside
WD('opera', 'trade', '#fff0c0', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; S.lay('front'); S.beg(); S.rect(G.L - 4, gy - 2, w + 8, 2, 'water', 5); S.end(); S.lay('wall'); S.beg(); S.box(G.L, gy - 8, w, 6, 'sand', 6, { top: 1 }); S.end();
  const li = sc.light({ x: G.cx, y: gy - 12, z: 10, r: w * 0.6, i: st ? 0.9 : 0.4, c: '#ffd090', fl: 'candle', tint: 0.5 });
  [[-0.3, 0.55, 0.3], [-0.12, 0.8, 0.26], [0.08, 0.95, 0.24], [0.28, 0.7, 0.22]].forEach(([f, hf, wf], i) => { const x = Xp(G, f), sh = Math.round(h * hf * 0.8), sw = Math.round(w * wf); S.lay(i % 2 ? 'mid' : 'back'); S.beg(); S.poly([[x - sw / 2, gy - 8], [x + sw * 0.35, gy - 8 - sh], [x + sw / 2, gy - 8]], 'linen', 9 - i * 0.3); for (let k = 2; k < sh; k += 3) S.line(x - sw / 2 + k * 0.4, gy - 9, x + sw * 0.35, gy - 8 - sh + k * 0.2, 'linen', 7); S.rect(x - sw / 2 + 2, gy - 12, sw - 4, 4, 'glass', 8, { e: li + 1 }); S.end(); });
  G.fx = { x: G.cx, y: gy - Math.round(h * 0.7) }; if (st === 2) lamps(S, sc, [G.L + 2, G.R - 2], gy - 12); });
// 奥林匹亚宙斯神像: a temple of columns, the seated gold-and-ivory god inside, a bolt in his hand
WD('zeus', 'holy', '#ffe070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h, top = Y(G, 0.72), li = sc.light({ x: G.cx, y: gy - h * 0.4, z: 8, r: w * 0.5, i: 0.9, c: '#ffe0a0', fl: 'candle', tint: 0.55 });
  S.lay('wall'); S.beg(); S.rect(G.L + 4, top, w - 8, gy - top - 4, 'dusk', 3); S.end(); const sx = G.cx, sy = gy - 6, sh = Math.round((gy - top) * 0.8);
  S.beg(); S.rect(sx - 7, sy - 6, 15, 6, 'gold', 6); S.rect(sx - 4, sy - sh * 0.6, 9, sh * 0.6 - 6, 'bone', 8, { e: li + 1 }); S.ell(sx + 0.5, sy - sh * 0.66, 3, 3, 'bone', 9); S.rect(sx - 4, sy - sh * 0.62, 9, 3, 'gold', 8); S.line(sx + 5, sy - sh * 0.45, sx + 8, sy - sh * 0.75, 'gold', 9, { e: 255 }); S.end();
  S.lay('mid'); for (let x = G.L + 3; x < G.R - 3; x += Math.max(6, Math.round(w / 8))) { if (Math.abs(x - G.cx) < 8) continue; S.beg(); S.cyl(x, top, 3, gy - top - 4, 'bone', 8, { rim: 2 }); S.end(); }
  S.lay('wall'); S.beg(); S.box(G.L, top - 3, w, 3, 'bone', 8, { top: 1 }); S.poly([[G.L - 1, top - 3], [G.cx + 0.5, top - 3 - Math.round(h * 0.18)], [G.R + 1, top - 3]], 'bone', 7); S.end(); S.beg(); S.box(G.L - 2, gy - 4, w + 4, 4, 'bone', 7, { top: 1 }); S.end();
  if (st >= 1) { S.beg(); S.hl(G.L, top - 1, w, 'gold', 8); S.end(); } if (st === 2) { lamps(S, sc, [G.L + 1, G.R - 1], gy - 10); G.bolt = { x: sx + 8, y: sy - sh * 0.75 }; } G.fx = { x: sx, y: sy - sh * 0.7 }; });
// 金字塔: three pyramids of stepped sand and the sphinx; gold capstones glowing (2)
WD('pyramids', 'holy', '#ffd070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; [[0.18, 0.75, 0.5, 'back'], [-0.2, 1, 0.66, 'wall'], [0.36, 0.5, 0.34, 'mid']].forEach(([f, hf, wf, lay]) => { const x = Xp(G, f), ph = Math.round(h * hf * 0.95), pw = Math.round(w * wf); S.lay(lay); S.beg(); for (let k = 0; k < ph; k++) { const hw = Math.round(pw / 2 * (1 - k / ph)); S.rect(x - hw, gy - 1 - k, hw, 1, 'sand', 8 - (k % 3 === 0 ? 1.5 : 0), { n: [-0.5, -0.4] }); S.rect(x, gy - 1 - k, hw, 1, 'sand', 5 - (k % 3 === 0 ? 1.5 : 0), { n: [0.6, -0.3] }); } S.end();
    if (st === 2) { const li = sc.light({ x, y: gy - ph, z: 10, r: 18, i: 1, c: '#ffe070', fl: 'pulse', amp: 0.2, sp: 1.3, tint: 0.5 }); S.beg(); S.rect(x - 1, gy - ph - 1, 3, 2, 'gold', 10, { e: li + 1 }); S.end(); } });
  S.lay('front'); S.beg(); S.rect(G.L + 2, gy - 5, 14, 5, 'sand', 7); S.rect(G.L + 12, gy - 10, 5, 6, 'sand', 8); S.px(G.L + 15, gy - 9, 'ink', 2); S.hl(G.L + 11, gy - 11, 6, 'tile', 6); S.end(); if (st >= 1) P.brazier(S, sc, G, G.L + 20, gy); G.fx = { x: Xp(G, -0.2), y: gy - Math.round(h * 0.95) }; });
// 空中花园: stepped terraces hung with green, waterfalls, flowers glowing (2)
WD('gardens', 'nature', '#a8e070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; for (let r = 0; r < 4; r++) { const y = gy - r * Math.round(h * 0.22), inset = r * Math.round(w * 0.1), ww = w - inset * 2; S.lay('wall'); K.wall(S, G.L + inset, y - Math.round(h * 0.2), ww, Math.round(h * 0.2), ['sand', 7, 'ashlar']); arches(S, G.L + inset + 2, G.R - inset - 2, y - Math.round(h * 0.16), Math.round(h * 0.12), 6, false);
    S.beg(); for (let x = G.L + inset; x < G.R - inset; x++) { const d = 1 + ((x * 7 + r) % 4); S.vl(x, y - Math.round(h * 0.2), d, 'leaf', 5 + ((x + r) % 3)); if (st === 2 && (x * 3 + r) % 7 === 0) S.px(x, y - Math.round(h * 0.2) + d, 'pink', 10, { e: 255 }); } S.end(); }
  const wf = sc.light({ x: G.cx, y: gy - h * 0.4, z: 8, r: 20, i: 0.5, c: '#8adcff', tint: 0.4 }); S.lay('mid'); S.beg(); S.rect(G.cx - 1, gy - Math.round(h * 0.66), 3, Math.round(h * 0.66), 'water', 8, { e: wf + 1 }); S.end(); G.an.push((D, t) => { D.lay('mid'); for (let y = gy - Math.round(h * 0.66); y < gy; y += 3) D.px(G.cx - 1 + ((y + Math.floor(t * 12)) % 3), y + (Math.floor(t * 12) % 3), 'water', 11, { e: 255 }); });
  if (st >= 1) P.tree(S, G.L + 4, gy - Math.round(h * 0.22), 5, 'leaf'); G.fx = { x: G.cx, y: gy - Math.round(h * 0.8) }; });
// 亚历山大图书馆: a hall of columns under a pediment, a dome behind, scrolls stacked; lamps in every bay (1+)
WD('library', 'arcane', '#c8a8ff', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h, top = Y(G, 0.55), T = K.tier('magic', 2);
  S.lay('back'); K.roof(S, G.cx - Math.round(w * 0.2), top - 3, Math.round(w * 0.4), Math.round(w * 0.2), 'dome', st === 2 ? 'gold' : 'tile', 6);
  S.lay('wall'); K.wall(S, G.L + 2, top, w - 4, gy - top - 4, ['bone', 7, 'ashlar']); for (let x = G.L + 6; x < G.R - 8; x += 9) K.win(S, sc, x, top + 6, 4, Math.round((gy - top) * 0.4), T, { deco: '', lit: st > 0 || x % 2 === 0, c: '#ffd8a0', glass: 'lamp' });
  S.lay('mid'); for (let x = G.L + 3; x < G.R - 3; x += 9) { S.beg(); S.cyl(x, top, 3, gy - top - 4, 'bone', 9, { rim: 2 }); S.end(); }
  S.lay('wall'); S.beg(); S.box(G.L, top - 3, w, 3, 'bone', 8, { top: 1 }); S.poly([[G.L - 1, top - 3], [G.cx + 0.5, top - 3 - Math.round(h * 0.2)], [G.R + 1, top - 3]], 'bone', 7); S.end(); S.beg(); S.box(G.L - 2, gy - 4, w + 4, 4, 'bone', 7, { top: 1 }); S.end();
  P.books(S, G.L + 4, gy - 4, 4); if (st >= 1) P.brazier(S, sc, G, G.R - 3, gy - 4, 'arcane'); if (st === 2) P.orbs(G, G.cx, top - 12, Math.round(w * 0.3), 3); G.fx = { x: G.cx, y: top - Math.round(h * 0.2) }; });
// 大本钟: the square clock tower, four lit faces, the spire; gold on the spire (2)
WD('bigben', 'trade', '#ffe0a0', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h, tw = Math.round(w * 0.56), x0 = G.cx - (tw >> 1), ct = Y(G, 0.66);
  S.lay('wall'); K.wall(S, x0, ct, tw, gy - ct, ['sand', 7, 'ashlar']); for (let y = ct + 16; y < gy - 12; y += 12) for (let x = x0 + 3; x < x0 + tw - 4; x += 6) K.win(S, sc, x, y, 2, 7, K.tier('steam', 2), { deco: '', sill: false, lit: st > 0 || (x + y) % 3 === 0, i: 0.4 });
  const cy = ct - Math.round(tw * 0.55); K.wall(S, x0 - 1, cy - Math.round(tw * 0.6), tw + 2, Math.round(tw * 1.15), ['sand', 8, 'ashlar']); P.clockface(S, sc, G, G.cx, cy - 1, Math.round(tw * 0.34)); G.fx = { x: G.cx, y: cy };
  const sp = cy - Math.round(tw * 0.6); K.roof(S, x0 - 1, sp, tw + 2, Math.round(h * 0.18), 'cone', 'iron', 5); if (st >= 1) lamps(S, sc, [x0 - 3, x0 + tw + 3], ct + 4); if (st === 2) { S.beg(); S.vl(G.cx, sp - Math.round(h * 0.18) - 4, 5, 'gold', 10, { e: 255 }); S.hl(x0 - 1, sp, tw + 2, 'gold', 9); S.end(); } });
// 布达拉宫: white and red palace tiers climbing the hill, gold roofs on top
WD('potala', 'holy', '#ffd070', (S, sc, G, st) => { const gy = G.gy, w = G.w, h = G.h; S.lay('wall'); S.beg(); S.poly([[G.L - 4, gy], [G.L + w * 0.1, gy - h * 0.3], [G.R - w * 0.1, gy - h * 0.3], [G.R + 4, gy]], 'rock', 7); S.noise(G.L - 4, gy - Math.round(h * 0.3), w + 8, Math.round(h * 0.3), 1, 3, 6); S.end();
  [[0.9, 0.32, 'bone'], [0.62, 0.3, 'bone'], [0.34, 0.26, 'crimson']].forEach(([wf, hf, m], i) => { const ww = Math.round(w * wf), y1 = gy - Math.round(h * (0.2 + i * 0.26)), hh = Math.round(h * hf); K.wall(S, G.cx - (ww >> 1), y1 - hh, ww, hh, [m, m === 'crimson' ? 5 : 9, 'smooth']); for (let x = G.cx - (ww >> 1) + 4; x < G.cx + (ww >> 1) - 4; x += 8) for (let y = y1 - hh + 4; y < y1 - 4; y += 9) K.win(S, sc, x, y, 2, 3, K.tier('magic', 1), { deco: '', sill: false, lit: (x * 3 + y) % 5 < (st + 2), i: 0.35, c: '#ffc070', glass: 'lamp' }); S.beg(); S.hl(G.cx - (ww >> 1), y1 - hh, ww, 'crimson', 4); S.end(); });
  const ty = gy - Math.round(h * 0.98); K.roof(S, G.cx - 8, ty + 4, 17, 5, 'hip', 'gold', st === 2 ? 9 : 7); if (st >= 1) K.flag(S, G, G.cx - Math.round(w * 0.3), gy - Math.round(h * 0.52), 10, 'gold'); G.fx = { x: G.cx, y: ty }; });
})();
