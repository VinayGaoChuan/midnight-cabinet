// ==== mc-pxtown-r3.js ====
(function () {
// Pixel town, one building at a time — batch 3: 营房 · 保险库 · 钱庄 · 军械库 · 工兵营 (designs in the town plan).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
const fire = (S, sc, G, x, y) => { const li = sc.light({ x, y: y - 3, z: 8, r: 22, i: 1, c: '#ff9a40', fl: 'fire', ph: x, tint: 0.55 }); S.lay('front'); S.beg(); S.line(x - 3, y, x + 3, y - 2, 'wood', 4); S.line(x + 3, y, x - 3, y - 2, 'wood', 5); for (let i = -3; i <= 3; i += 2) S.px(x + i, y, 'stone', 6); S.end(); G.an.push((D, t, s) => { D.lay('front'); H.flame(D, x, y - 2, 5 + (s.st.cheer ? 3 : 0), t, x); H.flame(D, x - 2, y - 1, 3, t, x + 2); }); return li; };

// ───────── 营房 barrack: a long low log bunkhouse with a porch (two tents at 0), a campfire, a flag, washing ─────────
BS('barrack', { kind: 'war', col: '#ffb060', look: 'keeper', icon: 'sword', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  if (st === 0) { P.tent(S, L, gy, 16, 11, 'sand'); P.tent(S, L + 17, gy, 14, 9, 'linen'); fire(S, sc, G, R - 12, gy); K.flag(S, G, R - 2, gy, Math.round(h * 0.55), 'crimson'); worker(G, R + 3, -1, 'guard'); G.fx = { x: R - 12, y: gy - 8 }; return; }
  // the bunkhouse: horizontal logs, a long row of small windows, a shallow roof, the porch on posts along its front
  const bx = L - 2, bw = w + 4, bh = Math.round(h * (st === 2 ? 0.52 : 0.32)), bt = gy - bh; K.wall(S, bx, bt, bw, bh, ['wood', 5, 'logs']);
  const T = K.tier('medieval', 0); for (let f = 0; f < (st === 2 ? 2 : 1); f++) for (let x = bx + 4; x + 3 < bx + bw - 2; x += 7) { if (f === 0 && Math.abs(x - cx) < 5) continue; K.win(S, sc, x, gy - Math.round(bh / (st === 2 ? 2 : 1)) * (f + 1) + 4, 3, 3, T, { deco: '', sill: false, lit: (x + f) % 3 !== 0 }); }
  S.beg(); S.poly([[bx - 2, bt + 1], [bx + 3, bt - 6], [bx + bw - 3, bt - 6], [bx + bw + 2, bt + 1]], 'wood', 4); for (let x = bx; x < bx + bw; x += 3) S.vl(x, bt - 5, 5, 'wood', 6); S.hl(bx - 2, bt + 1, bw + 4, 'wood', 2); S.end();
  K.door(S, cx - 3, gy - 9, 6, 9, T, 0);
  S.lay('mid'); S.beg(); S.hl(bx, gy - 11, bw, 'wood', 7); S.hl(bx, gy - 10, bw, 'wood', 3); for (let x = bx + 1; x < bx + bw; x += 8) S.vl(x, gy - 10, 10, 'wood', 5); S.end();
  S.lay('back'); S.beg(); S.line(bx + 2, gy - 12, bx + 18, gy - 11, 'ink', 3); for (let x = bx + 3; x < bx + 17; x += 3) S.rect(x, gy - 11, 2, 3, ['linen', 'tile', 'crimson'][x % 3], 7); S.end();
  if (st === 2) { const lx = cx, lt = bt - 13; S.lay('back'); S.beg(); S.rect(lx - 5, lt, 10, 8, 'wood', 4); S.vl(lx - 5, lt, 8, 'wood', 6); S.vl(lx + 4, lt, 8, 'wood', 6); S.end(); K.roof(S, lx - 6, lt, 12, 5, 'gable', 'wood', 5); P.bell(S, G, lx, lt + 8); }
  fire(S, sc, G, R + 2, gy); K.flag(S, G, L - 1, bt, 14, st === 2 ? 'gold' : 'crimson'); worker(G, R - 6, 1, 'guard'); if (st === 2) worker(G, L + 3, 1, 'wave');
  G.fx = { x: R + 2, y: gy - 8 };
} });

// ───────── 保险库 vault: an armoured strongroom sunk in a mound, a great round door with a wheel (a safe on skids at 0) ─────────
BS('vault', { kind: 'trade', col: '#ffd06a', look: 'keeper', icon: 'coin', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const wheel = (x, y, r) => G.an.push((D, t, s) => { const a = (s.st.cheer || 0) * 12 + t * 0.2; D.lay('mid'); D.ell(x + 0.5, y + 0.5, r, r, 'brass', 7, { ring: 1 }); for (let k = 0; k < 6; k++) { const an = a + k * Math.PI / 3; D.line(x, y, x + Math.round(Math.cos(an) * r), y + Math.round(Math.sin(an) * r), 'brass', 8); D.px(x + Math.round(Math.cos(an) * (r + 1)), y + Math.round(Math.sin(an) * (r + 1)), 'brass', 10); } D.ell(x + 0.5, y + 0.5, 1.5, 1.5, 'gold', 9); });
  if (st === 0) { const sx = cx - 9, sw = 18, sh = 16; S.lay('front'); S.beg(); S.hl(sx - 3, gy - 1, sw + 6, 'wood', 5); S.end(); K.wall(S, sx, gy - sh - 1, sw, sh, ['iron', 6, 'panels']); S.beg(); S.rect(sx + 2, gy - sh + 1, sw - 4, sh - 4, 'iron', 5); for (let y = gy - sh; y < gy - 1; y += 4) { S.px(sx + 1, y, 'iron', 9); S.px(sx + sw - 2, y, 'iron', 9); } S.end(); wheel(cx, gy - (sh >> 1) - 1, 4);
    S.lay('front'); S.beg(); for (let x = L - 2; x < R + 2; x += 4) { if (x > sx - 4 && x < sx + sw + 3) continue; S.vl(x, gy - 7, 7, 'wood', 5); } S.hl(L - 2, gy - 5, w + 4, 'wood', 4); S.end(); worker(G, sx - 6, 1, 'guard'); G.fx = { x: cx, y: gy - sh }; return; }
  // the mound of earth and stones, and the iron strongroom face let into it
  const mh = Math.round(h * (st === 2 ? 0.62 : 0.56)); S.lay('wall'); S.beg(); S.poly([[L - 4, gy], [L + 4, gy - mh * 0.7], [cx - 6, gy - mh], [cx + 10, gy - mh], [R - 2, gy - mh * 0.6], [R + 4, gy]], 'earth', 5); S.noise(L - 4, gy - mh, w + 8, mh, 1, 3, 7); for (let i = 0; i < 12; i++) S.ell(L + 2 + (i * 13) % (w - 2), gy - 3 - (i * 7) % (mh - 6), 1.6, 1.2, 'rock', 6); S.poly([[cx - 6, gy - mh], [cx + 10, gy - mh], [cx + 8, gy - mh + 2], [cx - 4, gy - mh + 2]], 'moss', 6); S.end();
  const fw = Math.round(w * 0.5), fx = cx - (fw >> 1), fh = Math.round(mh * 0.86); K.wall(S, fx, gy - fh, fw, fh, ['iron', 5, 'panels']); S.beg(); for (let x = fx + 1; x < fx + fw - 1; x += 3) { S.px(x, gy - fh + 1, 'iron', 9); S.px(x, gy - 2, 'iron', 8); } S.box(fx - 1, gy - fh - 2, fw + 2, 2, 'iron', 7, { top: 1 }); S.end();
  // the round door, its bolts, the wheel (it spins in the show), the gold rim at 2
  const dr = Math.round(fh * 0.34), dy = gy - dr - 3; S.beg(); S.ell(cx + 0.5, dy + 0.5, dr + 1.5, dr + 1.5, st === 2 ? 'gold' : 'iron', st === 2 ? 8 : 4); S.ell(cx + 0.5, dy + 0.5, dr, dr, 'iron', 6, { dome: 1 }); S.ell(cx + 0.5, dy + 0.5, dr - 2, dr - 2, 'iron', 7, { ring: 1 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; S.px(cx + Math.round(Math.cos(a) * (dr - 1)), dy + Math.round(Math.sin(a) * (dr - 1)), 'brass', 9); } S.end(); wheel(cx, dy, Math.max(3, dr - 4));
  // gold bars stacked, the velvet rope on its posts
  S.lay('front'); S.beg(); for (let i = 0; i < 6; i++) { const x = fx + fw + 2 + (i % 3) * 4 - (i >= 3 ? -2 : 0), y = gy - 1 - Math.floor(i / 3) * 2; S.hl(x, y - 1, 3, 'gold', 9); S.hl(x, y, 3, 'gold', 6); } S.end();
  S.beg(); [fx - 6, fx - 1].forEach(x => { S.vl(x, gy - 6, 6, 'brass', 8); S.px(x, gy - 7, 'brass', 10); }); S.line(fx - 6, gy - 5, fx - 1, gy - 5, 'crimson', 6); S.end();
  if (st === 2) { const lc = sc.light({ x: cx, y: gy - mh - 6, z: 8, r: 14, i: 0.6, c: '#fff0c0', tint: 0.3 }); S.lay('back'); S.beg(); S.rect(cx - 3, gy - mh - 6, 7, 6, 'brass', 6); S.end(); K.roof(S, cx - 4, gy - mh - 6, 9, 4, 'dome', 'copper', 7); S.beg(); S.ell(cx + 0.5, gy - mh - 3, 1.8, 1.8, 'paper', 9, { e: lc + 1 }); S.end(); K.lantern(S, sc, fx - 3, gy - fh + 2); worker(G, R + 3, -1, 'guard'); }
  worker(G, L - 2, 1, 'read'); G.fx = { x: cx, y: dy };
}, sfx: (d) => SN.snd(S => { S.tone(180, 0.5, 'sawtooth', 0.04, -60, d); S.noise(0.2, 0.08, 800, d + 0.5); }) });

// ───────── 钱庄 bank: a classical front — steps, columns, a pediment with a great clock (a money-changer's booth at 0) ─────────
BS('bank', { kind: 'trade', col: '#ffe0a0', look: 'keeper', icon: 'coin', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  if (st === 0) { const bx = cx - 12; S.lay('wall'); S.beg(); S.box(bx, gy - 8, 24, 8, 'wood', 6, { top: 1 }); S.hl(bx, gy - 5, 24, 'wood', 4); S.end(); P.awningStall(S, bx - 1, gy - 8, 26, 'leaf');
    S.lay('front'); S.beg(); S.vl(cx - 5, gy - 14, 5, 'brass', 8); S.hl(cx - 9, gy - 14, 9, 'brass', 8); S.hl(cx - 10, gy - 11, 3, 'brass', 7); S.hl(cx - 2, gy - 11, 3, 'brass', 7); S.end(); P.coins(S, cx + 2, gy - 8, 5); worker(G, bx + 30, -1, 'read'); G.fx = { x: cx, y: gy - 14 }; return; }
  // steps, the hall behind columns, the entablature, the pediment and its clock
  const fw = Math.round(w * (st === 2 ? 0.8 : 0.66)), fx = cx - (fw >> 1), ch = Math.round(h * 0.42), top = gy - 4 - ch;
  S.lay('wall'); K.wall(S, fx + 2, top, fw - 4, ch, ['bone', 6, 'ashlar']); const T = K.tier('water', 1);
  for (let x = fx + 5; x + 3 < fx + fw - 4; x += 8) { K.win(S, sc, x, top + 5, 3, Math.round(ch * 0.45), T, { deco: '', sill: false, c: '#ffe0a0' }); S.beg(); for (let y = top + 6; y < top + 5 + Math.round(ch * 0.45); y += 2) S.hl(x, y, 3, 'iron', 4); S.end(); }
  K.door(S, cx - 3, gy - 4 - Math.round(ch * 0.6), 7, Math.round(ch * 0.6), T, 2);
  S.beg(); for (let k = 0; k < 3; k++) S.box(fx - 2 + k * 2, gy - 1 - k * 1 - 1, fw + 4 - k * 4, 2, 'bone', 8 - k * 0.5, { top: 1 }); S.end();
  const nc = st === 2 ? 4 : 2, cols = []; for (let i = 0; i < nc; i++) cols.push(nc === 2 ? [fx + 3, fx + fw - 6][i] : fx + 3 + Math.round(i * (fw - 9) / 3)); S.lay('mid'); cols.forEach(x => { S.beg(); S.cyl(x, top, 3, ch, 'bone', 9, { rim: 2 }); S.box(x - 1, top, 5, 2, 'bone', 10); S.box(x - 1, gy - 5, 5, 1, 'bone', 8); S.end(); });
  S.lay('wall'); S.beg(); S.box(fx - 1, top - 3, fw + 2, 3, 'bone', 8, { top: 1 }); S.hl(fx, top - 1, fw, st === 2 ? 'gold' : 'bone', st === 2 ? 9 : 6); const ph = Math.round(fw * 0.22); S.poly([[fx - 2, top - 3], [cx + 0.5, top - 3 - ph], [fx + fw + 2, top - 3]], 'bone', 7); S.poly([[fx + 3, top - 4], [cx + 0.5, top - 1 - ph], [fx + fw - 3, top - 4]], 'bone', 5); S.end();
  P.clockface(S, sc, G, cx, top - 3 - Math.round(ph * 0.45), Math.max(2, Math.round(ph * 0.34)));
  if (st === 2) { const tt = top - 3 - ph - 12; S.lay('back'); K.wall(S, cx - 5, tt, 10, 12, ['bone', 7, 'ashlar']); K.roof(S, cx - 6, tt, 12, 6, 'dome', 'teal', 6); P.clockface(S, sc, G, cx, tt + 5, 3); S.beg(); S.vl(cx, tt - 9, 3, 'gold', 10); S.end(); K.flag(S, G, fx - 1, top - 3, 10, 'gold'); K.flag(S, G, fx + fw, top - 3, 10, 'gold'); G.fx = { x: cx, y: tt - 6 }; }
  else G.fx = { x: cx, y: top - 3 - ph };
  P.coins(S, R - 4, gy, 3 + st * 2); worker(G, L - 2, 1, 'read');
}, sfx: (d) => SN.snd(S => { [0.4, 0.8, 1.2].forEach(a => S.tone(523, 0.4, 'triangle', 0.05, 0, d + a)); }) });

// ───────── 军械库 armory: a steep-roofed stone hall with a great shield crest (a weapons tent at 0), a giant armour statue at 2 ─────────
BS('armory', { kind: 'war', col: '#ffd070', look: 'smith', icon: 'shield', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const grind = (x) => { S.lay('front'); S.beg(); S.vl(x - 2, gy - 5, 5, 'wood', 5); S.vl(x + 2, gy - 5, 5, 'wood', 4); S.end(); G.an.push((D, t, s) => { D.lay('front'); const a = t * 6; D.ell(x + 0.5, gy - 6.5, 3, 3, 'stone', 7); D.line(x, gy - 6, x + Math.round(Math.cos(a) * 3), gy - 6 + Math.round(Math.sin(a) * 3), 'stone', 4); if (steps(t, 0.9) < 0.15) s.burst('spark', x + 3, gy - 7, 2, { sp: 20, ang: 1.2, spread: 0.8, life: 0.4, floor: gy - 1 }); }); };
  const crest = (x, y, r, gold) => { S.beg(); S.poly([[x - r, y - r], [x + r + 1, y - r], [x + r + 1, y + 1], [x + 0.5, y + r + 2], [x - r, y + 1]], 'crimson', 6); S.hl(x - r, y - r, 2 * r + 1, gold ? 'gold' : 'iron', 9); S.vl(x, y - r + 1, 2 * r, gold ? 'gold' : 'linen', 9); S.hl(x - r + 1, y - 1, 2 * r - 1, gold ? 'gold' : 'linen', 9); S.end(); };
  if (st === 0) { const tx = cx - 14; P.tent(S, tx, gy, 22, 14, 'crimson'); P.rack(S, tx + 28, gy); P.rack(S, tx + 36, gy); grind(L + 2); worker(G, R + 3, -1, 'hammer'); G.fx = { x: tx + 11, y: gy - 14 }; return; }
  const hw = Math.round(w * 0.56), hx = L + 2, hh = Math.round(h * 0.42), ht = gy - hh; K.wall(S, hx, ht, hw, hh, ['stone', 5, 'ashlar']); K.quoins(S, hx, ht, hw, hh, 'stone', 6);
  S.beg(); for (let x = hx + 4; x < hx + hw - 3; x += 6) { if (Math.abs(x - hx - hw / 2) < 4) continue; S.rect(x, ht + 5, 1, 6, 'ink', 1); S.px(x, ht + 4, 'stone', 8); } S.end();
  K.door(S, hx + (hw >> 1) - 3, gy - 10, 7, 10, K.tier('medieval', 2), 2);
  const rh = Math.round(hw * 0.62); K.roof(S, hx - 1, ht, hw + 2, rh, 'gable', 'iron', 5); crest(hx + (hw >> 1), ht - Math.round(rh * 0.42), Math.max(3, Math.round(hw * 0.1)), st === 2);
  P.rack(S, hx + hw + 5, gy); grind(hx + hw + 12);
  if (st === 2) {
    // the giant suit of armour on its plinth, sword point down, gleaming
    const ah = Math.round(h * 0.95), s = ah / 24, ax = R - Math.round(3 * s), b = gy - 4, r = (v) => Math.round(v * s); S.lay('mid'); S.beg(); S.box(ax - r(3.5), gy - 4, r(7) + 1, 4, 'stone', 6, { top: 1 }); S.end(); S.beg();
    S.rect(ax - r(2), b - r(8), r(1.6), r(8), 'iron', 7); S.rect(ax + r(0.4), b - r(8), r(1.6), r(8), 'iron', 5); S.hl(ax - r(2.2), b - 1, r(4.6), 'iron', 4);
    S.cyl(ax - r(2.8), b - r(16), r(5.6), r(8.2), 'iron', 7, { rim: 2 }); S.hl(ax - r(2.8), b - r(9), r(5.6), 'brass', 8); S.ell(ax - r(3), b - r(15.5), r(1.4), r(1.2), 'iron', 9, { dome: 1 }); S.ell(ax + r(3), b - r(15.5), r(1.4), r(1.2), 'iron', 6, { dome: 1 });
    S.rect(ax - r(4), b - r(15), r(1.2), r(6), 'iron', 7); S.rect(ax + r(2.8), b - r(15), r(1.2), r(6), 'iron', 5);
    S.ell(ax + 0.5, b - r(18.6), r(1.8), r(2.2), 'iron', 8, { dome: 1 }); S.hl(ax - r(1.2), b - r(18.6), r(2.4), 'ink', 1); S.vl(ax, b - r(22.5), r(2), 'crimson', 7); S.px(ax + 1, b - r(22.5), 'crimson', 8);
    S.vl(ax + r(3.2), b - r(12), r(12), 'iron', 10); S.hl(ax + r(3.2) - 2, b - r(12), 5, 'gold', 9); S.end();
    sc.light({ x: ax, y: b - r(14), z: 14, r: 30, i: 0.9, c: '#dfe8ff', tint: 0.4 }); G.fx = { x: ax, y: b - r(20) };
    K.bannerV(S, hx + 2, ht + 3, 11, 'crimson', 'shield'); K.bannerV(S, hx + hw - 6, ht + 3, 11, 'crimson', 'shield'); worker(G, L - 3, 1, 'hammer');
  } else { G.fx = { x: hx + (hw >> 1), y: ht - Math.round(rh * 0.42) }; worker(G, R + 3, -1, 'hammer'); }
} });

// ───────── 工兵营 sappers: a tunnel into a mound — timber portal, rails, powder kegs, a winch (a dug pit at 0) ─────────
BS('sappers', { kind: 'war', col: '#ffb060', look: 'worker', icon: 'pick', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const keg = (x, y) => { S.lay('front'); S.beg(); S.cyl(x, y - 5, 4, 5, 'wood', 5, { rim: 2 }); S.hl(x, y - 4, 4, 'iron', 6); S.px(x + 1, y - 3, 'red', 8); S.px(x + 2, y - 3, 'linen', 9); S.end(); };
  const fuse = (x, y) => G.an.push((D, t, s) => { if (steps(t, 3.1) < 0.4) { D.lay('front'); D.px(x + Math.round(steps(t, 3.1) * 10), y, 'fire', 11, { e: 255 }); if (steps(t * 3, 1) < 0.2) s.burst('spark', x + Math.round(steps(t, 3.1) * 10), y, 1, { sp: 10, ang: 0, spread: 2, life: 0.3 }); } });
  if (st === 0) { S.lay('wall'); S.beg(); S.poly([[cx - 12, gy], [cx - 9, gy - 5], [cx + 9, gy - 5], [cx + 12, gy]], 'earth', 4); S.rect(cx - 7, gy - 4, 14, 4, 'night', 1); S.end(); S.lay('mid'); S.beg(); S.vl(cx - 7, gy - 11, 8, 'wood', 6); S.vl(cx + 6, gy - 11, 8, 'wood', 4); S.hl(cx - 8, gy - 11, 16, 'wood', 7); S.end();
    S.lay('front'); S.beg(); S.ell(L + 5.5, gy - 2, 5, 3, 'earth', 6, { dome: 1 }); S.end(); keg(R - 10, gy); keg(R - 5, gy); fuse(R - 18, gy - 1); worker(G, L - 3, 1, 'work'); G.fx = { x: cx, y: gy - 6 }; return; }
  // the mound, the timber-framed tunnel mouth, the rails coming out of it with a cart
  const mh = Math.round(h * 0.58); S.lay('wall'); S.beg(); S.poly([[L - 4, gy], [L + 2, gy - mh * 0.5], [L + w * 0.3, gy - mh], [L + w * 0.62, gy - mh * 0.9], [R + 2, gy - mh * 0.3], [R + 4, gy]], 'earth', 5); S.noise(L - 4, gy - mh, w + 8, mh, 1, 3, 11); S.poly([[L + w * 0.28, gy - mh], [L + w * 0.62, gy - mh * 0.9], [L + w * 0.58, gy - mh * 0.84], [L + w * 0.3, gy - mh + 2]], 'moss', 6); S.end();
  const tx = L + Math.round(w * 0.36), tw = 12, th = Math.round(mh * 0.62); S.beg(); S.rect(tx - (tw >> 1) + 1, gy - th, tw - 2, th, 'night', 1); S.end(); S.lay('mid'); S.beg(); S.rect(tx - (tw >> 1) - 1, gy - th - 2, 3, th + 2, 'wood', 6); S.rect(tx + (tw >> 1) - 2, gy - th - 2, 3, th + 2, 'wood', 4); S.box(tx - (tw >> 1) - 3, gy - th - 4, tw + 6, 3, 'wood', 7); S.end();
  const lt = sc.light({ x: tx, y: gy - th + 3, z: 8, r: 14, i: 0.8, c: '#ffc070', fl: 'candle', tint: 0.5 }); S.beg(); S.px(tx, gy - th + 1, 'lamp', 10, { e: lt + 1 }); S.end();
  P.cart(S, G, tx - 4, R - 2, gy + 1);
  // the winch on its frame beside the portal, a rope into the dark
  S.lay('mid'); S.beg(); S.line(tx + 8, gy - 1, tx + 11, gy - 10, 'wood', 5); S.line(tx + 14, gy - 1, tx + 11, gy - 10, 'wood', 4); S.end(); G.an.push((D, t) => { const a = t * 2; D.lay('mid'); D.ell(tx + 11.5, gy - 9.5, 2.5, 2.5, 'wood', 6, { ring: 1 }); D.line(tx + 11, gy - 9, tx + 11 + Math.round(Math.cos(a) * 2), gy - 9 + Math.round(Math.sin(a) * 2), 'iron', 7); });
  keg(L - 1, gy); keg(L + 4, gy); fuse(L + 8, gy - 1); K.flag(S, G, R - 1, gy - Math.round(mh * 0.3), 8, 'red');
  if (st === 2) { const px = R - 14; K.wall(S, px, gy - 12, 12, 12, ['brick', 5, 'bricks']); K.roof(S, px - 1, gy - 12, 14, 5, 'gable', 'red', 6); S.beg(); S.rect(px + 4, gy - 7, 4, 7, 'wood', 4); S.end(); S.lay('back'); S.beg(); H.ICON.pick(S, px + 6, gy - 16); S.end();
    const dx = R - 20, dh = Math.round(h * 0.78); S.lay('back'); S.beg(); for (let y = gy - 1; y > gy - dh; y--) { const hw = Math.max(1, Math.round(4 * (1 - (gy - y) / dh)) + 1); S.px(dx - hw, y, 'iron', 6); S.px(dx + hw, y, 'iron', 4); if ((gy - y) % 4 === 0) S.line(dx - hw, y, dx + hw, y - 4, 'iron', 5); } S.box(dx - 3, gy - dh - 3, 7, 3, 'copper', 6); S.end();
    G.an.push((D, t, s) => { D.lay('mid'); const k = Math.floor(t * 12) % 3; D.vl(dx, gy - 4 + k, 4, 'iron', 9); if (steps(t, 1.5) < 0.05) s.burst('steam', dx, gy - dh - 4, 4, { sp: 8, ang: 0, spread: 0.4, life: 1.2 }); if (steps(t, 0.4) < 0.1) s.burst('dust', dx, gy - 1, 2, { sp: 10, ang: 0, spread: 2, life: 0.5 }); }); }
  worker(G, R + 3, -1, 'carry'); G.fx = { x: tx, y: gy - th };
}, show(s, o, G, q) { if (once(s, o, 'bl', 0.3)) s.burst('dust', G.fx.x, G.fx.y + 8, 18 + q * 4, { sp: 30, ang: 0, spread: 1.4, life: 1.2, w: 8 }); },
  sfx: (d) => SN.snd(S => { S.noise(0.6, 0.06, 5000, d); S.tone(50, 0.5, 'sine', 0.2, -20, d + 0.3); S.noise(0.4, 0.15, 200, d + 0.3); }) });
})();
