// ==== mc-pxtown-r1.js ====
(function () {
// Pixel town, one building at a time (2026-09-28 second pass: 「每个房间对应的上层建筑，看一眼就知道这是哪座楼、下面是哪间房」,
// 「不能有共用的房子主体」). Each building here draws its own body and outline from what its room underground holds;
// only the low things are shared (material ramps, windows, lights, smoke, fire, flags, people, small props). The design
// line of every building is in the town plan. PT.bespoke(key, { kind, col, look, paint(S, sc, G, st), show, sfx }).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.K || !PT.P) return;
const { TX } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, cl = H.cl, steps = H.steps;
PT.bespoke = function (key, D) {
  PT.ART[key] = { kind: D.kind, col: D.col, mat: D.mat || 'stone', icon: D.icon, beam: D.beam, bespoke: 1,
    paint(S, sc, G) { G.flags = []; G.signs = []; G.workers = []; G.an = []; G.P = { kind: D.kind, look: D.look }; G.fx = { x: G.cx, y: G.gy - Math.round(G.h * 0.6) }; H.plinth(S, G, D.plinth || 'stone'); D.paint(S, sc, G, G.st);
      G.pillar = 0; const Gp = G; sc.shaft({ x: G.fx.x, y0: 0, y1: G.fx.y + 2, w0: 2, w1: 5, i: 0.9, haze: 0.8, c: D.pillarC || '#fff0c0', f: () => Gp.pillar }); },
    anim: K.anim, show(s, o, G) { K.SHOW[D.kind](s, o, G, o.show.q); if (D.show) D.show(s, o, G, o.show.q); }, sfx(d, q) { K.SFX[D.kind](d, q); if (D.sfx) D.sfx(d, q); } };
};
const BS = PT.bespoke, once = PT.once, near = (G) => G.s >= 0.8;
const worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
// a lean-to roof from (x0, y0) high side down to (x1, y1), shingle lines
const lean = (S, x0, y0, x1, y1, m, t) => { S.beg(); const lo = Math.min(y0, y1); S.poly([[x0, y0], [x1, y1], [x1, y1 + 3], [x0, y0 + 3]], m, t); for (let k = 1; k < 3; k++) S.line(x0, y0 + k, x1, y1 + k, m, t - (k === 1 ? 1.6 : 0.4)); S.line(x0, y0, x1, y1, m, t + 1.6); S.end(); return lo; };
const posts = (S, xs, y0, y1, m) => { S.beg(); xs.forEach(x => { S.vl(x, y0, y1 - y0, m || 'wood', 5); S.px(x, y0, m || 'wood', 7); }); S.end(); };

// ───────── 蒸汽工坊 generator: the copper boiler tower, the flywheel turning in the open, the engine house and its stack ─────────
BS('generator', { kind: 'power', col: '#ffb070', look: 'worker', icon: 'bolt', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the flywheel on its stone mount, turning in the open air
  const fr = Math.round(h * (0.19 + st * 0.03)), fx = L + fr, fy = gy - fr - 3; S.lay('back'); S.beg(); S.box(fx - 3, gy - 4, 7, 4, 'stone', 6, { top: 1 }); S.end();
  G.an.push((D, t, s) => { const a = t * (1.6 + (s.st.zap || 0) * 6); D.lay('back'); D.ell(fx + 0.5, fy + 0.5, fr, fr, 'iron', 5, { ring: 2 }); for (let k = 0; k < 6; k++) { const an = a + k * Math.PI / 3; D.line(fx, fy, fx + Math.round(Math.cos(an) * (fr - 2)), fy + Math.round(Math.sin(an) * (fr - 2)), 'iron', 4); }
    for (let k = 0; k < 10; k++) { const an = -2.6 + k * 0.22; D.px(fx + Math.round(Math.cos(an) * fr), fy + Math.round(Math.sin(an) * fr), 'iron', 9); } D.ell(fx + 0.5, fy + 0.5, 1.6, 1.6, 'brass', 8); });
  // the boiler: an upright riveted copper drum with a dome, bands, a gauge and a glowing fire door
  const bw = Math.round(w * (0.24 + st * 0.04)), bh = Math.round(h * [0.56, 0.74, 0.84][st]), bx = cx - (bw >> 1) - 2, by = gy - bh, gx = bx + (bw >> 1);
  S.lay('wall'); S.beg(); S.cyl(bx, by, bw, bh, 'copper', 6, { rim: 2.5 }); for (let y = by + 3; y < gy - 7; y += 5) for (let x = bx + 1; x < bx + bw - 1; x += 3) S.px(x, y, 'copper', 9); S.end();
  S.beg(); S.ell(gx, by, bw / 2, Math.max(3, bw * 0.38), 'copper', 7, { dome: 1 }); S.end();
  S.beg(); [0.28, 0.66].forEach(f => S.hl(bx, by + Math.round(bh * f), bw, 'brass', 8)); S.end();
  const lg = sc.light({ x: gx, y: by + 6, z: 6, r: 10, i: 0.5, c: '#fff0b0', tint: 0.3 }), gyy = by + Math.round(bh * 0.28) - 4; S.beg(); S.ell(gx + 0.5, gyy + 0.5, 3, 3, 'brass', 7); S.ell(gx + 0.5, gyy + 0.5, 2, 2, 'paper', 9, { e: lg + 1 }); S.end();
  const lf = sc.light({ x: gx, y: gy - 4, z: 10, r: 22, i: 1.1, c: '#ff8a30', fl: 'fire', tint: 0.55 }); S.beg(); S.box(bx + 2, gy - 7, bw - 4, 6, 'iron', 4); S.rect(bx + 3, gy - 6, bw - 6, 4, 'fire', 8, { e: lf + 1 }); S.end();
  G.an.push((D, t, s) => { D.lay('wall'); for (let x = bx + 3; x < bx + bw - 3; x++) D.px(x, gy - 6 + (X.n1(t * 6 + x) > 0.2 ? 0 : 1), 'fire', 9 + Math.round(X.n1(t * 8 + x)), { e: 255 }); const na = -2.4 + 0.3 * X.n1(t * 3) + (s.st.zap || 0) * 2.2; D.px(gx + Math.round(Math.cos(na) * 1.4), gyy + Math.round(Math.sin(na) * 1.4), 'red', 7); });
  const dt = by - Math.max(3, Math.round(bw * 0.38)); S.beg(); S.vl(gx, dt - 4, 4, 'brass', 9); S.hl(gx - 1, dt - 4, 3, 'brass', 10); S.end(); G.whistle = { x: gx, y: dt - 5 };
  if (st === 2) { S.beg(); S.hl(bx - 1, by + 1, bw + 2, 'gold', 9); for (let x = bx; x < bx + bw; x += 3) S.px(x, by, 'gold', 10); S.end(); }
  // the engine house on the right, its stack
  const hx0 = bx + bw + 1, hx1 = R + 2, hh = Math.round(h * [0.3, 0.42, 0.5][st]), ht = gy - hh;
  if (st === 0) { K.wall(S, hx0, ht, hx1 - hx0, hh, ['wood', 4, 'planks']); lean(S, hx0 - 1, ht - 4, hx1 + 1, ht + 1, 'iron', 5); K.door(S, hx0 + 3, gy - 8, 5, 8, K.tier('steam', 0), 0); }
  else { K.wall(S, hx0, ht, hx1 - hx0, hh, ['brick', 5, 'bricks']); K.roof(S, hx0, ht, hx1 - hx0, 7, 'saw', 'iron', 5); const T = K.tier('steam', 1); for (let x = hx0 + 3; x + 4 < hx1 - 1; x += 7) { K.win(S, sc, x, ht + 4, 4, Math.max(5, Math.round(hh * 0.35)), T, { deco: '' }); S.beg(); S.hl(x, ht + 3, 4, 'stone', 7); S.end(); } K.door(S, hx0 + 2, gy - 9, 6, 9, T, 1);
    S.lay('back'); S.beg(); const py = by + Math.round(bh * 0.46); S.hl(bx + bw, py, hx0 - bx - bw + 3, 'brass', 7); S.vl(hx0 + 2, py, ht - py + 1, 'brass', 6); S.px(hx0 + 2, py, 'brass', 9); S.end();
    S.beg(); S.line(fx, fy - fr, bx, by + Math.round(bh * 0.8), 'leather', 3); S.line(fx, fy + fr, bx, gy - 3, 'leather', 2); S.end(); }
  P.stack(S, sc, G, hx1 - 6, ht, Math.round(h * [0.3, 0.42, 0.52][st]), { rate: 1.5 + st, w: 4 });
  if (st === 2) { P.coils(S, sc, G, [hx0 + 2, hx1 - 12], ht - 7, 7); const lb = sc.light({ x: (gx + hx1) / 2, y: dt, z: 10, r: 26, i: 0.7, c: '#ffe080', fl: 'buzz', tint: 0.5 }); S.lay('front'); S.beg(); for (let i = 0; i <= 8; i++) { const q = i / 8, x = Math.round(gx + q * (hx1 - 6 - gx)), y = Math.round(dt + 2 + Math.sin(q * Math.PI) * 4); S.px(x, y, 'ink', 2); if (i % 2) S.px(x, y + 1, 'lamp', 10, { e: lb + 1 }); } S.end(); }
  if (st >= 1) worker(G, R + 4, -1, 'wrench');
  G.fx = { x: gx, y: dt };
}, show(s, o, G, q) { if (once(s, o, 'wh', 0)) { s.burst('steam', G.whistle.x, G.whistle.y, 16 + q * 5, { sp: 34, ang: 0, spread: 0.4, life: 1.6 }); s.st.zap = 1; } },
  sfx: (d, q) => SN.snd(S => { S.tone(1760, 0.8, 'sine', 0.06, 0, d); S.tone(2217, 0.8, 'sine', 0.04, 0, d); S.noise(0.8, 0.06, 3500, d); }) });

// ───────── 铁匠铺 smithy: the great tapered brick chimney in the middle, open sheds either side, the forge glowing at its foot ─────────
BS('smithy', { kind: 'forge', col: '#ff9a3c', look: 'smith', icon: 'anvil', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G, cw0 = Math.round(w * [0.24, 0.28, 0.3][st]), cw1 = cw0 - 5, ch = Math.round(h * [0.72, 0.96, 1.04][st]), ctop = gy - ch;
  const sh = Math.round(h * [0.34, 0.4, 0.44][st]), roofM = [['sand', 6], ['brick', 5], ['tile', 5]][st];
  // shed interiors (dark, lit by the forge), their back walls from stage 1
  S.lay('wall'); if (st >= 1) { K.wall(S, L, gy - sh + 3, cx - (cw0 >> 1) - L, sh - 3, ['mstone', 4, 'ashlar']); K.wall(S, cx + (cw0 >> 1), gy - sh + 3, R - cx - (cw0 >> 1), sh - 3, ['mstone', 4, 'ashlar']); }
  else { S.beg(); S.rect(L + 1, gy - sh + 3, w - 2, sh - 3, 'night', 2); S.end(); }
  // the chimney: rows of bricks, narrowing to its cap
  S.beg(); for (let y = gy - 1, row = 0; y >= ctop; y--, row++) { const k = (gy - 1 - y) / ch, hw = Math.round((cw0 + (cw1 - cw0) * k) / 2); for (let x = cx - hw; x < cx + hw; x++) { const mortar = row % 3 === 2 || (x + (Math.floor(row / 3) % 2) * 2) % 5 === 0; S.px(x, y, 'brick', mortar ? 3 : (x === cx - hw ? 7 : x >= cx + hw - 1 ? 3.5 : 5 + ((x * 7 + row) % 4 === 0 ? 1 : 0)), { n: [x < cx - hw + 2 ? -0.6 : x > cx + hw - 3 ? 0.6 : 0, 0] }); } } S.end();
  S.beg(); S.box(cx - (cw1 >> 1) - 1, ctop - 2, cw1 + 2, 3, 'stone', 6, { top: 1 }); S.ao(cx - (cw0 >> 1), gy - Math.round(ch * 0.55), cw0, 4, 't', 1.5); S.end();
  if (st === 2) { S.beg(); S.vl(cx, ctop - 9, 7, 'brass', 7); S.line(cx - 3, ctop - 7, cx + 4, ctop - 7, 'brass', 9); S.px(cx + 4, ctop - 8, 'brass', 9); S.px(cx + 4, ctop - 6, 'brass', 9); S.end(); }
  sc.emit({ k: 'steam', x: cx, y: ctop - 3, rate: 1.4 + st * 0.6, sp: 6, ang: 0.2, spread: 0.5, life: 2.6, w: cw1 - 2 }); sc.emit({ k: 'ember', x: cx, y: ctop - 3, rate: 0.8 + st, sp: 14, ang: 0, spread: 0.7, life: 1.3, w: 3 });
  // the forge mouth at its foot
  P.forge(S, sc, G, cx - (cw0 >> 1) + 2, cx + (cw0 >> 1) - 2, gy, false);
  // the sheds' roofs (lean-tos off the chimney) and their posts
  const rl = lean(S, cx - (cw0 >> 1), gy - sh - 3, L - 2, gy - sh + 3, roofM[0], roofM[1]), rr = lean(S, cx + (cw0 >> 1), gy - sh - 3, R + 2, gy - sh + 3, roofM[0], roofM[1]);
  posts(S, [L, R - 1], gy - sh + 5, gy, 'wood');
  // under the left shed: the anvil and the quench barrel; under the right: coal (0), the tool rack (1+)
  P.anvil(S, L + Math.round(w * 0.2), gy); S.lay('front'); S.beg(); S.cyl(L + 2, gy - 5, 4, 5, 'wood', 5, { rim: 2 }); S.hl(L + 2, gy - 5, 4, 'water', 7); S.end();
  if (st === 0) { S.lay('front'); S.beg(); S.ell(R - 6 + 0.5, gy - 1, 5, 2.5, 'ink', 2, { dome: 1 }); for (let i = 0; i < 5; i++) S.px(R - 9 + i * 1.5, gy - 2 - (i % 2), 'iron', 3); S.end(); }
  else { S.lay('back'); S.beg(); S.hl(R - 13, gy - sh + 6, 10, 'wood', 5); for (let i = 0; i < 5; i++) { S.vl(R - 12 + i * 2, gy - sh + 7, 5 + (i % 2), i % 2 ? 'iron' : 'wood', 7); S.px(R - 12 + i * 2, gy - sh + 12 + (i % 2), 'iron', 9); } S.end(); }
  if (st === 2) { S.lay('back'); S.beg(); S.hl(L - 4, gy - sh + 4, 5, 'iron', 6); S.vl(L - 4, gy - sh + 5, 2, 'iron', 5); S.box(L - 7, gy - sh + 7, 7, 5, 'wood', 6); H.ICON.anvil(S, L - 4, gy - sh + 9); S.end(); P.stack(S, sc, G, R - 5, gy - sh - 1, Math.round(h * 0.3), { k: 'ember', glow: true, rate: 2 }); K.lantern(S, sc, cx - (cw0 >> 1) - 3, gy - sh + 4); K.lantern(S, sc, cx + (cw0 >> 1) + 3, gy - sh + 4); }
  worker(G, L + Math.round(w * 0.2) + 6, -1, 'hammer'); if (st === 2) worker(G, R - 5, -1, 'carry');
  G.fx = { x: cx, y: ctop - 3 }; G.anvilX = L + Math.round(w * 0.2);
}, show(s, o, G, q) { if (once(s, o, 'ch', 0.05)) s.burst('ember', G.fx.x, G.fx.y, 16 + q * 6, { sp: 40, ang: 0, spread: 0.5, life: 1.6, w: 4 }); } });

// ───────── 医院 hospital: a field tent (0), a white clinic with the red-cross pylon (1), a helipad on the roof (2) ─────────
BS('hospital', { kind: 'heal', col: '#6fe0a0', look: 'nurse', icon: 'cross', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  if (st === 0) {
    // the field hospital: a long white tent on poles, a red cross on its flap, a stretcher and crates
    const tw = Math.round(w * 0.74), tx = cx - (tw >> 1) + 2, th = Math.round(h * 0.46); S.lay('wall'); S.beg(); S.poly([[tx - 2, gy], [tx + 4, gy - th], [tx + tw - 4, gy - th], [tx + tw + 2, gy]], 'linen', 9); for (let x = tx + 6; x < tx + tw - 4; x += 6) S.line(x, gy - th, x - 3, gy - 1, 'linen', 7); S.hl(tx + 4, gy - th, tw - 8, 'linen', 10); S.end();
    S.beg(); S.poly([[cx - 4, gy], [cx - 2, gy - th + 4], [cx + 3, gy - th + 4], [cx + 5, gy]], 'night', 2); S.end(); const li = sc.light({ x: cx, y: gy - 5, z: 8, r: 18, i: 0.7, c: '#ffe0b0', fl: 'candle', tint: 0.5 }); S.beg(); S.px(cx, gy - 3, 'lamp', 10, { e: li + 1 }); S.end();
    S.beg(); S.rect(tx + 6, gy - th + 5, 7, 7, 'linen', 10); S.rect(tx + 8, gy - th + 6, 3, 5, 'red', 8); S.rect(tx + 7, gy - th + 7, 5, 3, 'red', 8); S.end();
    S.lay('front'); S.beg(); S.hl(tx + tw - 10, gy - 3, 9, 'linen', 8); S.vl(tx + tw - 10, gy - 3, 3, 'wood', 5); S.vl(tx + tw - 2, gy - 3, 3, 'wood', 5); S.end(); K.crate(S, L, gy); K.flag(S, G, tx + tw + 3, gy, Math.round(h * 0.6), 'linen');
    G.fx = { x: cx, y: gy - th }; worker(G, L - 2, 1, 'read'); return; }
  // the clinic: white panels, teal bands, rows of cool windows, a curved glass canopy over the doors
  const bw = Math.round(w * 0.66), bx = cx - (bw >> 1) + 4, bh = Math.round(h * (st === 2 ? 0.7 : 0.62)), bt = gy - bh, T = K.tier('scifi', 1);
  S.lay('wall'); K.wall(S, bx, bt, bw, bh, ['linen', 8, 'panels']); S.beg(); S.box(bx - 1, bt - 2, bw + 2, 2, 'linen', 9, { top: 1 }); S.end();
  for (let y = bt + 4, f = 0; y < gy - 12; y += 9, f++) { S.beg(); S.hl(bx, y + 6, bw, 'teal', 7); S.end(); for (let x = bx + 3; x + 4 < bx + bw - 2; x += 6) K.win(S, sc, x, y, 4, 4, T, { deco: '', sill: false, lit: (x + f) % 3 !== 0, glass: 'ice', c: '#c8f0ff' }); }
  const ex = bx + (bw >> 1) - 4, le = sc.light({ x: ex + 4, y: gy - 4, z: 10, r: 20, i: 0.9, c: '#6ae0c8', fl: 'screen', tint: 0.5 }); S.beg(); S.rect(ex, gy - 8, 9, 8, 'teal', 8, { e: le + 1 }); S.vl(ex + 4, gy - 8, 8, 'scifi', 6); S.end();
  S.lay('back'); S.beg(); for (let x = -8; x <= 16; x++) { const y = gy - 11 - Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((x - 4) / 13, 2))) * 3); S.px(ex + x, y, 'glass', 9); S.px(ex + x, y + 1, 'glass', 6); } S.end();
  // the red-cross pylon on the left, taller than the clinic, its box glowing
  const px = bx - 5, ph = Math.round(h * (st === 2 ? 1 : 0.86)); S.lay('mid'); S.beg(); S.box(px - 1, gy - ph + 9, 3, ph - 9, 'scifi', 7); S.end(); P.cross(S, sc, G, px, gy - ph + 4, 4);
  if (st === 2) {
    // the helipad: a flat disc on the roof, the H, lights blinking round its rim; an ambulance at the door
    const hy = bt - 3; S.lay('wall'); S.beg(); S.ell(cx + 4.5, hy, Math.round(bw * 0.4), 2.5, 'scifi', 9); S.hl(cx - 1, hy - 3, 11, 'scifi', 6); S.vl(cx + 1, hy - 1, 3, 'gold', 10); S.vl(cx + 7, hy - 1, 3, 'gold', 10); S.hl(cx + 1, hy, 7, 'gold', 10); S.end();
    const pts = [-1, 1].map(sd => ({ x: cx + 4 + sd * Math.round(bw * 0.4), y: hy })), lr = sc.light({ x: cx + 4, y: hy, z: 8, r: bw * 0.6, i: 0.1, c: '#ff4040', tint: 0.4 });
    G.an.push((D, t, s) => { const on = steps(t, 1.2) < 0.2; D.lay('front'); pts.forEach(p => D.px(p.x, p.y - 1, 'red', on ? 11 : 4, { e: 255 })); s.mul[lr] = on ? 6 : 0; });
    S.lay('front'); S.beg(); S.box(R - 12, gy - 7, 12, 6, 'linen', 9); S.hl(R - 12, gy - 4, 12, 'red', 7); S.rect(R - 11, gy - 6, 3, 2, 'glass', 8); S.px(R - 10, gy - 1, 'ink', 1); S.px(R - 3, gy - 1, 'ink', 1); S.end();
    G.an.push((D, t) => { D.lay('front'); D.px(R - 6, gy - 8, steps(t, 0.5) < 0.5 ? 'red' : 'tile', 11, { e: 255 }); });
    sc.emit({ k: 'heal', x: cx, y: bt - 4, rate: 0.8, sp: 5, ang: 0, spread: 0.6, life: 1.6, w: bw * 0.6 });
  } else K.crate(S, R - 6, gy);
  worker(G, L - 1, 1, 'read'); if (st === 2) worker(G, R + 5, -1, 'carry');
  G.fx = { x: px, y: gy - ph + 4 };
} });

// ───────── 训练场 training: a fenced drill yard — dummy, target, rack, tall banners — and its pavilion, then a drum tower ─────────
BS('training', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'sword', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the ground of the yard: packed sand with footprints
  S.lay('wall'); S.beg(); S.rect(L - 2, gy - 2, w + 4, 2, 'sand', 6); for (let x = L; x < R; x += 4) S.px(x + (x % 3), gy - 2, 'sand', 4); S.end();
  // the pavilion at the back: posts, an eave roof with turned-up ends (a two-storey drum tower at 2)
  const pw = Math.round(w * (st ? 0.5 : 0.34)), px0 = st ? cx - (pw >> 1) : R - pw - 2, ph = Math.round(h * [0.4, 0.5, 0.46][st]), pt = gy - ph;
  if (st >= 1) { S.lay('back'); S.beg(); S.rect(px0 + 1, pt + 3, pw - 2, ph - 3, 'wood', 3); S.end(); K.wall(S, px0 + 2, pt + 3, pw - 4, ph - 3, ['wood', 4, 'vplanks']); }
  posts(S, [px0, px0 + (pw >> 1), px0 + pw - 1].filter((v, i) => st || i !== 1), pt + 2, gy);
  const eave = (x0, x1, y, rh, m, t) => { S.beg(); S.poly([[x0 - 3, y - 1], [x0 + 2, y - rh], [x1 - 2, y - rh], [x1 + 3, y - 1], [x1 + 3, y + 1], [x0 - 3, y + 1]], m, t); S.hl(x0 + 2, y - rh, x1 - x0 - 4, m, t + 2); S.px(x0 - 3, y - 2, m, t + 1); S.px(x1 + 3, y - 2, m, t + 1); for (let x = x0; x < x1; x += 3) S.vl(x, y - rh + 2, rh - 2, m, t - 1.5); S.end(); };
  eave(px0, px0 + pw, pt + 2, 5, st ? 'crimson' : 'sand', st ? 5 : 6);
  if (st === 2) { const tw = Math.round(pw * 0.6), tx = cx - (tw >> 1), tt = pt - Math.round(h * 0.26); S.lay('back'); S.beg(); S.rect(tx, tt, tw, pt - tt, 'wood', 3); S.end(); posts(S, [tx, tx + tw - 1], tt, pt, 'wood'); S.lay('mid'); S.beg(); S.hl(cx - 5, tt + 2, 11, 'wood', 6); S.vl(cx, tt + 3, 2, 'iron', 5); S.ell(cx + 0.5, pt - 7, 4, 4, 'brass', 8, { dome: 1 }); S.ell(cx + 0.5, pt - 7, 2, 2, 'brass', 6, { ring: 1 }); S.end(); eave(tx, tx + tw, tt, 5, 'crimson', 6); S.lay('front'); S.beg(); S.px(cx, tt - 7, 'gold', 10); S.vl(cx, tt - 6, 2, 'gold', 8); S.end();
    [px0 - 2, px0 + pw + 2].forEach(x => K.lantern(S, sc, x, pt + 3, { c: '#ff9a50' })); G.fx = { x: cx, y: pt - 4 }; } else G.fx = { x: px0 + (pw >> 1), y: pt };
  // the yard's things: the dummy and the target always; banners and the rack from 1
  P.dummy(S, L + Math.round(w * 0.14), gy - 1); P.target(S, st ? R - 4 : L + Math.round(w * 0.36), gy - 1);
  if (st >= 1) { P.rack(S, st === 2 ? R - 12 : L + Math.round(w * 0.34), gy - 1); K.flag(S, G, L + 1, gy, Math.round(h * 0.75), 'crimson'); }
  if (st === 2) { K.flag(S, G, R - 1, gy, Math.round(h * 0.75), 'crimson'); K.flag(S, G, cx - (pw >> 1) - 5, gy, Math.round(h * 0.6), 'gold'); }
  // the fence in front: posts and two rails, a gap for the gate
  S.lay('front'); S.beg(); for (let x = L - 2; x <= R + 2; x += 4) { if (Math.abs(x - cx) < 4) continue; S.vl(x, gy - 6, 6, 'wood', 6); S.px(x, gy - 7, 'wood', 8); } [gy - 5, gy - 2].forEach(y => { S.hl(L - 2, y, cx - 4 - L + 2, 'wood', 5); S.hl(cx + 4, y, R + 2 - cx - 4, 'wood', 5); }); S.end();
  worker(G, R + 4, -1, 'guard'); if (st >= 1) worker(G, L - 4, 1, 'work');
} });

// ───────── 储藏室 storage: a pile under a tarp (0), a gambrel-roofed barn warehouse with a hoist (1), a neon star and a balloon (2) ─────────
BS('storage', { kind: 'trade', col: '#ff9ad8', look: 'farmer', icon: 'crate', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G, crates = (x, y, n) => { for (let i = 0; i < n; i++) K.crate(S, x + (i % 3) * 6 - (i >= 3 ? -3 : 0), y - Math.floor(i / 3) * 5, i % 2 ? 'wood' : 'sand'); };
  if (st === 0) {
    // crates heaped under a purple tarp roped down, a little plank shed, barrels
    S.lay('back'); crates(L + 3, gy, 5); S.lay('mid'); S.beg(); S.poly([[L + 1, gy - 2], [L + 4, gy - 13], [L + 18, gy - 14], [L + 22, gy - 2], [L + 18, gy - 6], [L + 6, gy - 6]], 'magic', 6); S.line(L + 4, gy - 13, L + 1, gy - 2, 'magic', 8); S.line(L + 3, gy - 9, L + 21, gy - 9, 'leather', 5); S.end();
    const sx = cx + 2, sw = Math.round(w * 0.36); K.wall(S, sx, gy - Math.round(h * 0.34), sw, Math.round(h * 0.34), ['wood', 5, 'vplanks']); lean(S, sx - 2, gy - Math.round(h * 0.34) - 4, sx + sw + 2, gy - Math.round(h * 0.34) + 1, 'lav', 6); K.door(S, sx + 3, gy - 8, 6, 8, K.tier('cartoon', 0), 0);
    K.barrel(S, R - 4, gy); G.fx = { x: L + 12, y: gy - 14 }; worker(G, R + 4, -1, 'carry'); return; }
  // the barn warehouse: plank walls in lavender, a gambrel roof of shingles, big X-braced barn doors
  const bw = Math.round(w * 0.7), bx = cx - (bw >> 1), wh = Math.round(h * (st === 2 ? 0.5 : 0.4)), wt = gy - wh, rh = Math.round(bw * 0.36), x1 = bx + bw;
  S.lay('wall'); K.wall(S, bx, wt, bw, wh, ['lav', 6, 'vplanks']);
  S.beg(); const kink = Math.round(bw * 0.16); S.poly([[bx - 2, wt + 1], [bx + kink, wt - Math.round(rh * 0.62)], [cx, wt - rh], [x1 - kink, wt - Math.round(rh * 0.62)], [x1 + 2, wt + 1]], 'crimson', 5);
  for (let k = 2; k < rh; k += 3) { const y = wt - k; S.hl(bx - 1 + Math.round(k * kink / (rh * 0.62) * (k < rh * 0.62 ? 1 : 0)), y, 2, 'crimson', 3); } S.line(bx + kink, wt - Math.round(rh * 0.62), x1 - kink, wt - Math.round(rh * 0.62), 'crimson', 7); S.line(bx - 2, wt + 1, bx + kink, wt - Math.round(rh * 0.62), 'crimson', 7); S.hl(bx - 2, wt + 1, bw + 4, 'crimson', 3); S.end();
  const dw = Math.round(bw * 0.36), dx = cx - (dw >> 1), dh = Math.round(wh * 0.72); S.beg(); S.rect(dx, gy - dh, dw, dh, 'wood', 5); S.line(dx, gy - dh, dx + (dw >> 1) - 1, gy - 1, 'wood', 7); S.line(dx + (dw >> 1) - 1, gy - dh, dx, gy - 1, 'wood', 7); S.line(dx + (dw >> 1), gy - dh, dx + dw - 1, gy - 1, 'wood', 7); S.line(dx + dw - 1, gy - dh, dx + (dw >> 1), gy - 1, 'wood', 7); S.vl(dx + (dw >> 1), gy - dh, dh, 'wood', 3); S.hl(dx - 1, gy - dh - 1, dw + 2, 'wood', 7); S.end();
  // the loft door under the ridge, the hoist beam sticking out with a crate on its rope
  const ly = wt - Math.round(rh * 0.5); S.beg(); S.rect(cx - 3, ly, 6, 6, 'night', 2); S.hl(cx - 4, ly - 1, 8, 'wood', 7); S.end(); const hb = wt - rh + 2; S.beg(); S.hl(cx, hb, 10, 'wood', 6); S.px(cx + 9, hb + 1, 'iron', 7); S.end();
  G.an.push((D, t, s) => { const up = st === 2 ? Math.round((Math.sin(t * 0.6) + 1) * 3) : 0, sw = Math.round(Math.sin(t * 1.4) * 1), hy = hb + 8 + up - (s.st.cheer ? 4 : 0); D.lay('front'); D.vl(cx + 9, hb + 1, hy - hb - 1, 'ink', 3); D.box(cx + 7 + sw, hy, 6, 5, 'sand', 6); D.hl(cx + 7 + sw, hy + 2, 6, 'sand', 4); });
  S.lay('front'); crates(L - 2, gy, st === 2 ? 6 : 4); crates(R - 14, gy, 3); K.sack(S, cx - (dw >> 1) - 5, gy);
  if (st === 2) {
    // the neon star over the doors and a pink balloon tied to the crates
    const ln = sc.light({ x: cx, y: wt - 3, z: 8, r: 20, i: 0.8, c: '#ff8ad8', fl: 'buzz', tint: 0.5 }); S.lay('back'); S.beg(); const sx = cx, sy = wt - rh - 6; [[0, -3], [-1, -2], [1, -2], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, 1], [2, 1], [-3, 2], [3, 2]].forEach(([a, b]) => S.px(sx + a, sy + b, 'pink', 10, { e: ln + 1 })); S.end();
    G.an.push((D, t) => { const b = Math.round(Math.sin(t * 1.8) * 1.5), x = R - 9, y = gy - 22 + b; D.lay('front'); D.line(R - 11, gy - 10, x, y + 3, 'ink', 3); D.ell(x + 0.5, y, 2.5, 3, 'pink', 8, { dome: 1 }); D.px(x - 1, y - 1, 'pink', 11); });
    K.lantern(S, sc, dx - 2, gy - dh); K.lantern(S, sc, dx + dw + 1, gy - dh);
  }
  worker(G, L - 5, 1, 'carry'); if (st === 2) worker(G, R + 5, -1, 'carry');
  G.fx = { x: cx, y: wt - rh };
} });
})();
