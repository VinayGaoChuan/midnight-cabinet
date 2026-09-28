// ==== mc-pxtown-r4.js ====
(function () {
// Pixel town, one building at a time — batch 4: 箭楼 · 募兵所 · 军需处 · 矿车站 · 兵营 (designs in the town plan).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
// a little soldier (6 px, spear) — for ranks and galleries; step: 0/1 foot
const trooper = (D, x, y, m, step, spear) => { D.px(x, y - 6, 'skin', 6); D.px(x, y - 7, m, 7); D.rect(x - 1, y - 5, 3, 3, m, 6); D.px(x - 1 + step, y - 2, 'denim', 4); D.px(x + 1 - step, y - 2, 'denim', 4); D.px(x - 1 + step, y - 1, 'hair', 2); D.px(x + 1 - step, y - 1, 'hair', 2); if (spear) { D.vl(x + 2, y - 10, 9, 'wood', 6); D.px(x + 2, y - 11, 'iron', 10); } };

// ───────── 箭楼 arrowtower: a tall narrow square tower, a timber gallery overhanging its top, archers on it ─────────
BS('arrowtower', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'arrow', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  if (st === 0) { const x0 = cx - 7, pt = gy - Math.round(h * 0.55); S.lay('back'); S.beg(); [x0, x0 + 13].forEach(x => S.vl(x, pt, gy - pt, 'wood', 5)); for (let y = pt + 3; y < gy - 3; y += 7) { S.line(x0, y, x0 + 13, y + 6, 'wood', 4); S.line(x0 + 13, y, x0, y + 6, 'wood', 3); } S.end();
    S.beg(); S.box(x0 - 3, pt - 2, 20, 3, 'wood', 6, { top: 1 }); for (let x = x0 - 3; x < x0 + 17; x += 3) S.vl(x, pt - 6, 4, 'wood', 5); S.hl(x0 - 3, pt - 6, 20, 'wood', 7); S.end();
    G.an.push((D, t) => { D.lay('mid'); trooper(D, x0 + 7, pt - 2, 'leaf', Math.floor(t * 1.2) % 2 ? 0 : 0, false); D.line(x0 + 9, pt - 9, x0 + 9, pt - 3, 'wood', 7); });
    S.lay('front'); S.beg(); for (let i = 0; i < 4; i++) S.vl(R - 8 + i, gy - 7, 7, 'wood', 7); S.hl(R - 9, gy - 4, 6, 'leather', 5); S.end(); G.fx = { x: x0 + 7, y: pt - 8 }; worker(G, L - 2, 1, 'guard'); return; }
  const tw = Math.round(w * 0.3), tx = cx - (tw >> 1), th = Math.round(h * (st === 2 ? 1.05 : 0.88)), tt = gy - th;
  S.lay('wall'); K.wall(S, tx, tt, tw, th, ['stone', 6, 'ashlar']); K.quoins(S, tx, tt, tw, th, 'stone', 6); S.beg(); for (let y = tt + 8; y < gy - 8; y += 9) { S.rect(cx - 1, y, 1, 5, 'ink', 1); S.px(cx - 1, y - 1, 'stone', 8); } S.end(); K.door(S, cx - 3, gy - 8, 6, 8, K.tier('medieval', 2), 2);
  // the hoarding: a timber box on brackets wider than the tower, a shingled roof, slots for the bows
  const hw = tw + 8, hx = cx - (hw >> 1), hy = tt - 7; S.beg(); for (let x = hx + 1; x < hx + hw; x += 4) S.line(x, tt + 4, x + (x < cx ? 3 : -3), tt, 'wood', 4); S.end();
  K.wall(S, hx, hy, hw, 8, ['wood', 5, 'vplanks']); S.beg(); for (let x = hx + 2; x < hx + hw - 2; x += 4) S.rect(x, hy + 2, 2, 3, 'night', 1); S.end(); K.roof(S, hx - 1, hy, hw + 2, 6, 'hip', st === 2 ? 'tile' : 'wood', 5);
  K.flag(S, G, cx, hy - 6, 10, st === 2 ? 'gold' : 'crimson');
  const n = st === 2 ? 4 : 2; G.an.push((D, t, s) => { const draw = o => o; D.lay('front'); for (let i = 0; i < n; i++) { const x = hx + 3 + Math.round(i * (hw - 6) / Math.max(1, n - 1)), y = hy + 3, up = s.st.cheer ? 1 : 0; D.px(x, y - 1 - up, 'skin', 6); D.px(x, y - 2 - up, 'leaf', 6); D.line(x + 1, y - 4 - up, x + 1, y + 1 - up, 'wood', 7); } });
  if (st === 2) { P.brazier(S, sc, G, tx - 4, gy - Math.round(th * 0.45)); P.brazier(S, sc, G, tx + tw + 3, gy - Math.round(th * 0.45)); }
  S.lay('front'); S.beg(); for (let i = 0; i < 4; i++) S.vl(R - 6 + i, gy - 7, 7, 'wood', 7); S.hl(R - 7, gy - 4, 6, 'leather', 5); S.end(); P.target(S, L + 4, gy);
  G.fx = { x: cx, y: hy }; worker(G, L - 3, 1, 'guard');
}, show(s, o, G, q) { if (once(s, o, 'vol', 0.3)) for (let i = 0; i < 6 + q * 2; i++) s.burst('spark', G.fx.x - 6 + i * 2, G.fx.y, 1, { sp: 60, ang: -0.3 + (i % 3) * 0.3, spread: 0.1, life: 0.6 }); } });

// ───────── 募兵所 levyhall: the recruiting stage — a notice board, a crier, a queue, a drum; a hall; a bell arch at 2 ─────────
BS('levyhall', { kind: 'war', col: '#ffd070', look: 'keeper', icon: 'drum', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const board = (x, y, bw, bh) => { S.lay('mid'); S.beg(); S.vl(x, y, gy - y, 'wood', 5); S.vl(x + bw - 1, y, gy - y, 'wood', 4); S.box(x - 1, y, bw + 2, bh, 'wood', 5); for (let i = 0; i < 3; i++) { const px = x + 1 + i * Math.round((bw - 2) / 3); S.rect(px, y + 2, Math.round((bw - 2) / 3) - 1, bh - 4, 'paper', 8 + (i % 2)); S.hl(px + 1, y + 3, 2, 'red', 7); S.hl(px + 1, y + 5, Math.round((bw - 2) / 3) - 3, 'ink', 3); S.hl(px + 1, y + 7, Math.round((bw - 2) / 3) - 4, 'ink', 3); } S.poly([[x - 2, y], [x + bw / 2, y - 4], [x + bw + 1, y]], 'crimson', 5); S.end(); };
  const queue = (x0, n) => G.an.push((D, t, s) => { D.lay('front'); for (let i = 0; i < n; i++) trooper(D, x0 + i * 4, gy, ['leaf', 'denim', 'leather', 'sand'][i % 4], (Math.floor(t * 2) + i) % 2 && s.st.cheer ? 1 : 0, false); });
  if (st === 0) { board(L + 2, gy - Math.round(h * 0.42), 18, 12); K.crate(S, cx + 2, gy); P.drum(S, R - 6, gy); queue(L + 3, 3); worker(G, cx + 5, -1, 'wave'); G.fx = { x: L + 11, y: gy - Math.round(h * 0.42) }; return; }
  // the hall: timber frame and plaster, a raised front stage on posts with steps, a poster wall
  const hw = Math.round(w * 0.64), hx = R - hw, hh = Math.round(h * 0.4), ht = gy - hh; K.wall(S, hx, ht, hw, hh, ['sand', 8, 'plaster']); K.roof(S, hx - 1, ht, hw + 2, Math.round(hw * 0.3), 'gable', 'brick', 5);
  const T = K.tier('medieval', 1); K.win(S, sc, hx + 4, ht + 4, 4, 5, T); K.win(S, sc, hx + hw - 8, ht + 4, 4, 5, T);
  S.lay('mid'); S.beg(); S.box(hx - 2, gy - 6, hw + 4, 2, 'wood', 7, { top: 1 }); for (let x = hx; x < hx + hw; x += 6) S.vl(x, gy - 4, 4, 'wood', 4); S.box(hx - 6, gy - 3, 4, 1, 'wood', 6); S.box(hx - 4, gy - 5, 2, 1, 'wood', 6); S.end();
  board(hx + Math.round(hw * 0.35), ht + 3, Math.round(hw * 0.3), 9); P.drum(S, hx + hw - 5, gy - 6); queue(L - 1, st === 2 ? 5 : 3);
  if (st === 2) { const ax = L + 3, aw = 14, ah = Math.round(h * 0.6); S.lay('back'); S.beg(); S.rect(ax, gy - ah, 3, ah, 'stone', 7); S.rect(ax + aw - 3, gy - ah, 3, ah, 'stone', 5); S.poly([[ax - 1, gy - ah], [ax + aw / 2, gy - ah - 6], [ax + aw + 1, gy - ah]], 'stone', 6); S.end(); P.bell(S, G, ax + (aw >> 1), gy - ah + 9); K.flag(S, G, hx + hw - 1, ht - Math.round(hw * 0.3), 9, 'gold'); K.bannerV(S, hx + 2, ht + 12, 8, 'crimson', 'drum'); }
  worker(G, hx + (hw >> 1), -1, 'wave'); G.fx = { x: hx + (hw >> 1), y: ht };
}, sfx: (d) => SN.snd(S => { [0, 0.25, 0.5, 0.62].forEach(a => S.tone(90, 0.12, 'sine', 0.15, -30, d + a)); }) });

// ───────── 军需处 quarter: a brick depot with a loading dock, a covered supply wagon, a steam traction engine at 2 ─────────
BS('quarter', { kind: 'trade', col: '#ffc070', look: 'worker', icon: 'crate', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const wagon = (x) => { S.lay('front'); S.beg(); S.box(x, gy - 7, 16, 3, 'wood', 6); S.poly([[x, gy - 7], [x + 1, gy - 14], [x + 4, gy - 16], [x + 12, gy - 16], [x + 15, gy - 14], [x + 16, gy - 7]], 'linen', 9); for (let k = 3; k < 14; k += 4) S.vl(x + k, gy - 15, 8, 'linen', 7); S.end(); G.an.push((D) => { D.lay('front'); [x + 3, x + 13].forEach(wx => { D.ell(wx + 0.5, gy - 2.5, 2.5, 2.5, 'wood', 5, { ring: 1 }); D.px(wx, gy - 3, 'iron', 7); }); }); S.beg(); S.line(x - 4, gy - 5, x, gy - 6, 'wood', 5); S.end(); };
  const barrels = (x, n) => { for (let i = 0; i < n; i++) K.barrel(S, x + (i % 3) * 5 + (i >= 3 ? 2 : 0), gy - (i >= 3 ? 6 : 0)); };
  if (st === 0) { wagon(L + 2); barrels(cx + 2, 4); S.lay('mid'); S.beg(); S.box(R - 10, gy - 6, 10, 2, 'wood', 6, { top: 1 }); S.vl(R - 9, gy - 4, 4, 'wood', 4); S.vl(R - 2, gy - 4, 4, 'wood', 4); S.rect(R - 8, gy - 8, 5, 2, 'paper', 9); S.end(); worker(G, R + 3, -1, 'read'); G.fx = { x: L + 10, y: gy - 16 }; return; }
  // the depot: bricks, arched loading doors, a raised dock along its front, the tally board
  const dw = Math.round(w * 0.6), dx = R - dw, dh = Math.round(h * 0.46), dt = gy - dh; K.wall(S, dx, dt, dw, dh, ['brick', 5, 'bricks']); K.roof(S, dx - 1, dt, dw + 2, 8, 'saw', 'iron', 5);
  S.beg(); for (let i = 0; i < 2; i++) { const ax = dx + 3 + i * Math.round(dw * 0.46), aw = Math.round(dw * 0.36), ah = Math.round(dh * 0.62); S.rect(ax, gy - ah, aw, ah - 4, 'wood', 4); for (let x = ax + 1; x < ax + aw; x += 2) S.vl(x, gy - ah + 2, ah - 6, 'wood', 5.5); S.hl(ax - 1, gy - ah - 1, aw + 2, 'stone', 7); } S.end();
  S.lay('mid'); S.beg(); S.box(dx - 1, gy - 5, dw + 1, 5, 'stone', 6, { top: 1 }); S.end(); S.lay('back'); S.beg(); S.box(dx + dw - 8, dt + 3, 6, 5, 'ink', 2); for (let k = 0; k < 3; k++) S.hl(dx + dw - 7, dt + 4 + k, 4, 'paper', 8); S.end();
  wagon(L - 2); barrels(dx + 2, st === 2 ? 5 : 3);
  if (st === 2) { const ex = L + 2; G.an.push((D, t, s) => { D.lay('front'); const sp = t * 2; [[ex + 4, 6], [ex + 13, 4]].forEach(([wx, r]) => { D.ell(wx + 0.5, gy - r + 0.5, r, r, 'iron', 5, { ring: 1 }); for (let k = 0; k < 4; k++) { const a = sp + k * Math.PI / 2; D.px(wx + Math.round(Math.cos(a) * (r - 1)), gy - r + Math.round(Math.sin(a) * (r - 1)), 'iron', 8); } }); });
    S.lay('mid'); S.beg(); S.hcyl(ex + 3, gy - 13, 12, 5, 'iron', 6, { rim: 1.5 }); S.box(ex + 13, gy - 16, 5, 8, 'wood', 5); S.cyl(ex + 5, gy - 22, 2, 9, 'iron', 5); S.hl(ex + 4, gy - 22, 4, 'brass', 8); S.end(); sc.emit({ k: 'steam', x: ex + 6, y: gy - 23, rate: 1.4, sp: 6, ang: 0.3, spread: 0.5, life: 2 }); S.lay('back'); wagon(ex + 20); }
  worker(G, dx + 4, -1, 'carry'); if (st === 2) worker(G, R + 4, -1, 'read'); G.fx = { x: dx + (dw >> 1), y: dt };
}, sfx: (d) => SN.snd(S => { S.tone(1175, 0.6, 'sine', 0.05, 0, d); S.tone(1480, 0.6, 'sine', 0.035, 0, d); [0.3, 0.5, 0.7].forEach(a => S.tone(140, 0.08, 'square', 0.06, -40, d + a)); }) });

// ───────── 矿车站 minecart: the pithead frame with its great sheave wheel turning, the shaft house, ore bins, rails ─────────
BS('minecart', { kind: 'power', col: '#ffd06a', look: 'worker', icon: 'pick', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const hx = cx - Math.round(w * 0.12), fh = Math.round(h * [0.4, 0.9, 1.05][st]), ft = gy - fh, fm = st ? 'iron' : 'wood';
  // the frame: two legs leaning in, cross-braced, the back stay; the wheel(s) at the top turning with the cable
  S.lay('back'); S.beg(); const lw = Math.round(fh * 0.28); S.line(hx - lw, gy, hx - 1, ft, fm, 8, { w: 2 }); S.line(hx + lw, gy, hx + 1, ft, fm, 6, { w: 2 }); for (let y = gy - 5; y > ft + 3; y -= 6) { const k = (gy - y) / fh, a = Math.round(lw * (1 - k)); S.line(hx - a, y, hx + a, y - 5, fm, 7); S.hl(hx - a, y, a * 2, fm, 5); } if (st) S.line(hx + 2, ft + 2, R - 2, gy - 2, fm, 6, { w: 1 }); S.end();
  const wr = st === 2 ? 6 : st ? 5 : 3, wheels = st === 2 ? [[hx - 4, ft + 1], [hx + 5, ft + 3]] : [[hx, ft]];
  G.an.push((D, t, s) => { const a = t * (2 + (s.st.zap || 0) * 8); D.lay('mid'); wheels.forEach(([x, y], i) => { D.ell(x + 0.5, y + 0.5, wr, wr, st ? 'copper' : fm, 8, { ring: 1 }); for (let k = 0; k < 6; k++) { const an = a * (i ? -1 : 1) + k * Math.PI / 3; D.line(x, y, x + Math.round(Math.cos(an) * (wr - 1)), y + Math.round(Math.sin(an) * (wr - 1)), st ? 'copper' : fm, 6); } D.px(x, y, 'brass', 9); D.vl(x + wr, y, gy - 8 - y, 'ink', 3); }); });
  // the shaft house under the frame, the cage coming up; ore bins with a chute (1+); rails and carts
  const sh = Math.round(h * 0.26); K.wall(S, hx - 8, gy - sh, 16, sh, [st ? 'brick' : 'wood', 5, st ? 'bricks' : 'planks']); K.roof(S, hx - 9, gy - sh, 18, 5, 'gable', st ? 'iron' : 'wood', 5); S.beg(); S.rect(hx - 3, gy - sh + 4, 6, sh - 4, 'night', 1); S.end();
  G.an.push((D, t) => { const y = gy - 3 - Math.round((Math.sin(t * 0.8) + 1) * (sh - 7) / 2); D.lay('wall'); D.box(hx - 2, y - 4, 5, 4, 'iron', 7); });
  if (st >= 1) { const bx = L - 1; S.lay('mid'); S.beg(); S.poly([[bx, gy - 18], [bx + 14, gy - 18], [bx + 12, gy - 8], [bx + 2, gy - 8]], 'wood', 5); S.hl(bx, gy - 18, 14, 'wood', 7); for (let x = bx + 2; x < bx + 13; x += 2) S.px(x, gy - 19, 'rock', 6 + (x % 3)); S.px(bx + 6, gy - 20, 'gold', 10); S.vl(bx + 2, gy - 8, 8, 'wood', 4); S.vl(bx + 11, gy - 8, 8, 'wood', 4); S.line(bx + 12, gy - 10, bx + 16, gy - 6, 'iron', 6); S.end(); }
  P.cart(S, G, L - 2, R + 2, gy + 1); if (st === 2) { const lb = sc.light({ x: hx, y: ft + 6, z: 10, r: 26, i: 0.7, c: '#ffe080', fl: 'buzz', tint: 0.5 }); S.lay('front'); S.beg(); for (let i = 0; i < 7; i++) { const x = Math.round(hx - lw + i * lw * 2 / 6), y = Math.round(gy - fh * 0.45 + Math.sin(i / 6 * Math.PI) * 3); S.px(x, y, 'lamp', 10, { e: lb + 1 }); } S.end(); }
  if (st === 0) { S.lay('front'); S.beg(); S.ell(R - 6.5, gy - 2, 5, 3, 'rock', 5, { dome: 1 }); S.px(R - 7, gy - 4, 'gold', 9); S.end(); }
  worker(G, R + 3, -1, 'carry'); G.fx = { x: hx, y: ft };
}, show(s, o, G, q) { if (once(s, o, 'ore', 0.4)) { s.burst('dust', G.fx.x - 10, G.gy - 10, 10, { sp: 16, ang: 0, spread: 2, life: 1 }); s.burst('glint', G.fx.x - 10, G.gy - 16, 4 + q, { sp: 14, ang: 0, spread: 3, life: 0.8 }); } } });

// ───────── 兵营 barracks: a square stone keep with merlons, its gate, the parade ground and a rank of spearmen ─────────
BS('barracks', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'sword', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const rank = (x0, n) => G.an.push((D, t, s) => { const mark = s.st.cheer ? Math.floor(t * 4) % 2 : Math.floor(t * 1.3) % 2; D.lay('front'); for (let i = 0; i < n; i++) trooper(D, x0 + i * 4, gy, 'crimson', (mark + i) % 2, true); });
  if (st === 0) { S.lay('back'); K.wall(S, R - 12, gy - 12, 11, 12, ['wood', 5, 'planks']); K.roof(S, R - 13, gy - 12, 13, 5, 'gable', 'wood', 4); S.beg(); S.rect(R - 9, gy - 8, 4, 8, 'night', 1); S.end();
    S.lay('mid'); S.beg(); S.hl(L, gy - 8, 16, 'wood', 6); for (let i = 0; i < 6; i++) { S.vl(L + 1 + i * 3, gy - 13, 13, 'wood', 6); S.px(L + 1 + i * 3, gy - 14, 'iron', 10); } S.end(); K.flag(S, G, cx, gy, Math.round(h * 0.7), 'crimson'); rank(cx + 3, 3); G.fx = { x: cx, y: gy - Math.round(h * 0.7) }; worker(G, L - 3, 1, 'guard'); return; }
  // the keep
  const kw = Math.round(w * 0.46), kx = R - kw - 1, kh = Math.round(h * (st === 2 ? 0.8 : 0.68)), kt = gy - kh; K.wall(S, kx, kt, kw, kh, ['stone', 6, 'ashlar']); K.quoins(S, kx, kt, kw, kh, 'stone', 7); P.merlons(S, kx - 1, kx + kw + 1, kt, 'stone', 7, st === 2);
  const T = K.tier('medieval', 2); S.beg(); [kt + 6, kt + Math.round(kh * 0.45)].forEach((y, r) => [kx + Math.round(kw * 0.25), kx + Math.round(kw * 0.72)].forEach(x => { S.rect(x, y, 2, 6, 'night', 1); S.px(x, y - 1, 'stone', 8); S.px(x + 1, y - 1, 'stone', 8); S.hl(x - 1, y + 6, 4, 'stone', 7); })); S.end(); K.bannerV(S, kx + (kw >> 1) - 2, kt + 4, 12, 'crimson', 'sword');
  S.beg(); const gw = 8; for (let y = gy - 11; y < gy; y++) for (let x = kx + (kw >> 1) - (gw >> 1); x < kx + (kw >> 1) + (gw >> 1); x++) { const u = (x + 0.5 - kx - kw / 2) / (gw / 2); if (y >= gy - 11 + Math.round(4 * (1 - Math.sqrt(Math.max(0, 1 - u * u))))) S.px(x, y, 'wood', (x % 2) ? 3 : 4); } S.end();
  K.flag(S, G, kx + (kw >> 1), kt - 5, 10, st === 2 ? 'gold' : 'crimson'); K.lantern(S, sc, kx + (kw >> 1) - 6, gy - 12); K.lantern(S, sc, kx + (kw >> 1) + 5, gy - 12);
  if (st === 2) [kx - 3, kx + kw - 3].forEach(x => { S.lay('mid'); S.beg(); S.cyl(x, kt - 6, 6, 10, 'stone', 7, { rim: 2 }); S.end(); K.roof(S, x - 1, kt - 6, 8, 6, 'cone', 'crimson', 5); });
  // the parade ground: packed sand, a rank of spearmen marking time (two ranks at 2)
  S.lay('wall'); S.beg(); S.rect(L - 2, gy - 2, kx - L + 1, 2, 'sand', 6); S.end(); rank(L, 4); if (st === 2) G.an.push((D, t, s) => { const mark = Math.floor(t * 1.3 + 1) % 2; D.lay('mid'); for (let i = 0; i < 4; i++) trooper(D, L + 2 + i * 4, gy - 3, 'tile', (mark + i) % 2, true); });
  worker(G, kx - 5, -1, 'wave'); G.fx = { x: kx + (kw >> 1), y: kt };
} });
})();
