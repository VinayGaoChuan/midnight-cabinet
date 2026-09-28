// ==== mc-pxtown-r2.js ====
(function () {
// Pixel town, one building at a time — batch 2: 净水池 · 监听室 · 冥想室 · 修理铺 · 城墙 (designs in the town plan).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
const posts = (S, xs, y0, y1, m, t) => { S.beg(); xs.forEach(x => { S.vl(x, y0, y1 - y0, m || 'wood', t || 5); S.px(x, y0, m || 'wood', (t || 5) + 2); }); S.end(); };

// ───────── 净水池 pool: the water tower on its legs over a tiled basin, the pump house ─────────
BS('pool', { kind: 'water', col: '#6ac8ff', look: 'keeper', icon: 'drop', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the basin in front: tiles, shining water (a fountain at 2)
  const bx0 = L + 1, bx1 = cx + Math.round(w * 0.1), li = sc.light({ x: (bx0 + bx1) / 2, y: gy - 3, z: 4, r: 22, i: 0.6, c: '#6ac8ff', fl: 'pulse', amp: 0.15, sp: 1.3, tint: 0.5 });
  S.lay('front'); S.beg(); S.box(bx0 - 1, gy - 4, bx1 - bx0 + 2, 4, 'tile', 8, { top: 1 }); for (let x = bx0; x < bx1; x += 3) S.vl(x, gy - 3, 3, 'tile', 6); S.hl(bx0, gy - 4, bx1 - bx0, 'water', 8, { e: li + 1 }); S.end();
  G.an.push((D, t) => { D.lay('front'); for (let x = bx0; x < bx1; x++) if (n1(t * 2 + x * 0.7) > 0.5) D.px(x, gy - 4, 'water', 11, { e: 255 }); });
  // the tower: legs and braces, a tank (a rain barrel at 0), a pipe down to the basin
  const tx = cx + Math.round(w * 0.2), tw = Math.round(w * [0.26, 0.36, 0.4][st]), lh = Math.round(h * [0.38, 0.5, 0.56][st]), th = Math.round(h * [0.2, 0.26, 0.3][st]), tt = gy - lh - th;
  const legM = st ? 'iron' : 'wood'; S.lay('back'); S.beg(); [tx - (tw >> 1) + 1, tx + (tw >> 1) - 2].forEach(x => S.vl(x, gy - lh, lh, legM, 5)); [tx - 2, tx + 1].forEach(x => S.vl(x, gy - lh, lh, legM, 3)); for (let y = gy - lh + 2; y < gy - 4; y += 7) { S.line(tx - (tw >> 1) + 1, y, tx + (tw >> 1) - 2, y + 6, legM, 4); S.line(tx + (tw >> 1) - 2, y, tx - (tw >> 1) + 1, y + 6, legM, 3); } S.end();
  S.lay('wall'); if (st === 0) { S.beg(); S.cyl(tx - (tw >> 1), tt, tw, th, 'wood', 5, { rim: 2 }); [0.25, 0.75].forEach(f => S.hl(tx - (tw >> 1), tt + Math.round(th * f), tw, 'iron', 6)); S.end(); }
  else { S.beg(); S.cyl(tx - (tw >> 1), tt, tw, th, 'iron', 6, { rim: 2.5 }); for (let y = tt + 2; y < tt + th - 1; y += 3) for (let x = tx - (tw >> 1) + 1; x < tx + (tw >> 1); x += 3) S.px(x, y, 'iron', 8); S.end();
    const rm = st === 2 ? 'gold' : 'iron'; S.beg(); S.poly([[tx - (tw >> 1) - 1, tt], [tx, tt - Math.round(tw * 0.3)], [tx + (tw >> 1) + 1, tt]], rm, st === 2 ? 7 : 5); S.px(tx, tt - Math.round(tw * 0.3) - 1, rm, 9); S.end();
    S.beg(); S.box(tx - (tw >> 1) - 2, gy - lh - 1, tw + 4, 2, 'iron', 6, { top: 1 }); for (let x = tx - (tw >> 1) - 2; x < tx + (tw >> 1) + 2; x += 2) S.px(x, gy - lh - 3, 'iron', 5); S.end(); }
  if (st === 2) { const lw = sc.light({ x: tx, y: tt + th / 2, z: 6, r: 16, i: 0.9, c: '#6ac8ff', fl: 'pulse', amp: 0.2, sp: 1, tint: 0.5 }); S.beg(); S.rect(tx - 1, tt + 2, 3, th - 4, 'water', 9, { e: lw + 1 }); S.end(); G.an.push((D, t) => { D.lay('wall'); D.px(tx, tt + 2 + Math.round((Math.sin(t) + 1) * (th - 6) / 2), 'water', 11, { e: 255 }); }); }
  S.lay('back'); S.beg(); S.vl(tx - (tw >> 1) - 1, tt + th, gy - 6 - tt - th, 'brass', 6); S.hl(bx1 - 2, gy - 6, tx - (tw >> 1) - bx1 + 2, 'brass', 6); S.px(bx1 - 2, gy - 5, 'brass', 8); S.end();
  G.an.push((D, t, s) => { if (steps(t, 0.5) < 0.2) s.burst('drip', bx1 - 2, gy - 5, 1, { sp: 6, ang: 3.1, spread: 0.3, life: 0.4, floor: gy - 4 }); });
  // the pump house (1+): a small tiled hut with its gauge
  if (st >= 1) { const px = R - 10; K.wall(S, px, gy - 11, 11, 11, ['tile', 7, 'bricks']); K.roof(S, px, gy - 11, 11, 4, 'gable', 'tile', 5); const lg = sc.light({ x: px + 5, y: gy - 7, z: 6, r: 8, i: 0.4, c: '#fff0b0', tint: 0.3 }); S.beg(); S.ell(px + 5.5, gy - 6.5, 2.5, 2.5, 'brass', 7); S.ell(px + 5.5, gy - 6.5, 1.5, 1.5, 'paper', 9, { e: lg + 1 }); S.end(); }
  if (st === 2) { P.fountain(S, sc, G, (bx0 + bx1) >> 1, gy - 1, 3); K.lantern(S, sc, L - 1, gy - 12, { c: '#9adcff' }); }
  worker(G, L - 3, 1, 'sweep'); G.fx = { x: (bx0 + bx1) >> 1, y: gy - 6 };
} });

// ───────── 监听室 lookout: a lattice mast with a turning radar dish, a great ear trumpet, the bunker ─────────
BS('lookout', { kind: 'war', col: '#8af0a0', look: 'keeper', icon: 'eye', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the bunker (a plank hut at 0) with its green screen window
  const bx = L + 2, bw = Math.round(w * (st ? 0.46 : 0.34)), bh = Math.round(h * [0.26, 0.3, 0.34][st]);
  if (st === 0) { K.wall(S, bx, gy - bh, bw, bh, ['wood', 5, 'planks']); K.roof(S, bx, gy - bh, bw, 5, 'gable', 'wood', 4); K.door(S, bx + 3, gy - 8, 5, 8, K.tier('medieval', 0), 0); }
  else { S.lay('wall'); S.beg(); S.poly([[bx - 1, gy], [bx + 2, gy - bh], [bx + bw - 2, gy - bh], [bx + bw + 1, gy]], 'scifi', 6); S.noise(bx, gy - bh, bw, bh, 1, 3, 5); S.hl(bx + 2, gy - bh, bw - 4, 'scifi', 9); S.end();
    const lw = sc.light({ x: bx + bw / 2, y: gy - bh / 2, z: 6, r: 14, i: 0.8, c: '#78dc72', fl: 'screen', tint: 0.5 }); S.beg(); S.rect(bx + 4, gy - bh + 4, bw - 8, 3, 'screen', 8, { e: lw + 1 }); S.end();
    G.an.push((D, t) => { D.lay('wall'); const k = Math.floor(t * 8) % (bw - 8); D.px(bx + 4 + k, gy - bh + 5, 'screen', 11, { e: 255 }); }); }
  // the ear trumpet on its post, bell to the sky
  const ex = bx + (bw >> 1), ey = gy - bh - 2; S.lay('mid'); S.beg(); S.vl(ex, ey - 5, 6, 'iron', 6); for (let k = 0; k < 9; k++) { const r = 1 + Math.round(k * 0.45); S.hl(ex + k - r + 1, ey - 6 - k, r * 2, 'brass', 6 + (k > 6 ? 2 : 0)); } S.hl(ex + 4, ey - 15, 10, 'brass', 9); S.end();
  // the mast: a lattice tapering up, a turning dish on top (two at 2), the red beacon
  const mx = R - Math.round(w * 0.2), mh = Math.round(h * [0.55, 0.9, 1.05][st]), mt = gy - mh;
  S.lay('back'); S.beg(); for (let y = gy - 1; y > mt; y--) { const hw = Math.max(1, Math.round((gy - y) < mh ? 5 * (1 - (gy - y) / mh) + 1 : 1)); S.px(mx - hw, y, st ? 'iron' : 'wood', 6); S.px(mx + hw, y, st ? 'iron' : 'wood', 4); if ((gy - y) % 4 === 0) S.line(mx - hw, y, mx + hw, y - 4, st ? 'iron' : 'wood', 5); } S.end();
  const dish = (y, sp, big) => G.an.push((D, t, s) => { const a = Math.sin(t * sp + y + (s.st.cheer ? t * 6 : 0)), wd = Math.max(1, Math.round(Math.abs(a) * (big ? 6 : 4))); D.lay('mid'); D.beg(); D.vl(mx, y - 2, 3, 'iron', 6); for (let k = 0; k <= wd; k++) { const dy = Math.round((k / Math.max(1, wd)) ** 2 * 3); D.px(mx - k, y - 3 - dy, 'linen', 9 - dy); D.px(mx + k, y - 3 - dy, 'linen', 7 - dy * 0.5); D.px(mx - k, y - 2 - dy, 'iron', 4); D.px(mx + k, y - 2 - dy, 'iron', 4); } D.line(mx, y - 3, mx + Math.round(a * 2), y - 8, 'iron', 7); D.px(mx + Math.round(a * 2), y - 9, 'red', 9, { e: 255 }); D.end(); });
  if (st >= 1) dish(mt, 0.8, true); else { S.lay('mid'); S.beg(); S.ell(mx + 0.5, mt - 2, 3, 3, 'brass', 7); S.end(); }
  if (st === 2) { dish(mt + Math.round(mh * 0.4), 1.3, false); G.beacon = { x: mx, y: mt - 8, li: sc.light({ x: mx, y: mt - 8, z: 8, r: 14, i: 0.1, c: '#ff4040', tint: 0.4 }) }; }
  worker(G, bx + bw + 5, -1, 'read'); G.fx = { x: mx, y: mt - 4 };
}, sfx: (d) => SN.snd(S => { [0, 0.18, 0.36, 0.54].forEach((a, i) => S.tone(1320 + i * 220, 0.06, 'square', 0.035, 0, d + a)); }) });

// ───────── 冥想室 meditation: a pagoda of curling eaves, its round moon window glowing, bamboo, incense ─────────
BS('meditation', { kind: 'holy', col: '#c8a8ff', look: 'mage', icon: 'flame', pillarC: '#e0d0ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // bamboo at the left, its canes a column of bright nodes
  S.lay('back'); for (let i = 0; i < 3 + st; i++) { const x = L + 1 + i * 3, hh = Math.round(h * (0.5 + (i % 2) * 0.15)); S.beg(); for (let y = gy - hh; y < gy; y++) S.px(x, y, 'leaf', (gy - y) % 5 === 0 ? 8 : 5); S.px(x + 1, gy - hh + 2, 'leaf', 7); S.px(x - 1, gy - hh + 5, 'leaf', 6); S.end(); }
  // the stone base and the moon window: a ring glowing violet, a mandala in it
  const ww = Math.round(w * [0.44, 0.52, 0.56][st]), x0 = cx - (ww >> 1) + 3, x1 = x0 + ww, sh = Math.round(h * 0.34), st0 = gy - sh;
  S.lay('wall'); S.beg(); S.box(x0 - 3, gy - 3, ww + 6, 3, 'stone', 6, { top: 1 }); S.end();
  const lm = sc.light({ x: (x0 + x1) / 2, y: gy - sh / 2, z: 8, r: 26 + st * 6, i: 1, c: '#b89cff', fl: 'pulse', amp: 0.15, sp: 0.9, tint: 0.55 }), mr = Math.round(Math.min(sh * 0.4, ww * 0.3)), mx = (x0 + x1) >> 1, my = gy - 3 - mr - 1;
  if (st >= 1) { K.wall(S, x0, st0, ww, sh - 3, ['magic', 5, 'ashlar']); posts(S, [x0, x1 - 1], st0, gy - 3, 'crimson', 5); }
  S.beg(); S.ell(mx + 0.5, my + 0.5, mr + 1.5, mr + 1.5, 'stone', st ? 7 : 6, { ring: 1.6 }); S.ell(mx + 0.5, my + 0.5, mr, mr, 'arcane', 6, { e: lm + 1 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; S.line(mx, my, mx + Math.round(Math.cos(a) * (mr - 1)), my + Math.round(Math.sin(a) * (mr - 1)), 'arcane', 9, { e: lm + 1 }); } S.px(mx, my, 'arcane', 11, { e: 255 }); S.end();
  // curling eaves, one tier per stage, each smaller, bells on their tips
  const eave = (a, b, y, m, t) => { S.beg(); S.poly([[a - 4, y - 3], [a + 2, y - 5], [b - 2, y - 5], [b + 4, y - 3], [b + 3, y], [a - 3, y]], m, t); S.hl(a + 2, y - 5, b - a - 4, m, t + 2); S.px(a - 4, y - 4, m, t + 2); S.px(b + 4, y - 4, m, t + 2); for (let x = a; x < b; x += 3) S.vl(x, y - 3, 3, m, t - 1.4); S.end(); if (st === 2) G.an.push((D, tt) => { const sw = Math.round(Math.sin(tt * 2 + a) * 1); D.lay('front'); D.px(a - 4 + sw, y - 1, 'gold', 9); D.px(b + 4 + sw, y - 1, 'gold', 9); }); };
  const roofM = st === 2 ? ['gold', 6] : ['crimson', 5];
  if (st === 0) { S.lay('mid'); S.beg(); S.rect(mx - 4, gy - 4, 9, 1, 'crimson', 6); S.end(); K.lantern(S, sc, x1 + 2, gy - 14, { c: '#ffb070' }); }
  else { let y = st0, a = x0, b = x1; for (let k = 0; k < (st === 2 ? 3 : 1); k++) { eave(a, b, y, roofM[0], roofM[1]); if (k < (st === 2 ? 2 : 0)) { const na = a + 4, nb = b - 4, ny = y - 5 - Math.round(h * 0.18); K.wall(S, na + 1, ny, nb - na - 2, y - 5 - ny, ['magic', 6, 'smooth']); K.win(S, sc, ((na + nb) >> 1) - 1, ny + 3, 3, 4, K.tier('magic', 2), { deco: '', sill: false }); a = na; b = nb; y = ny; } }
    S.beg(); S.vl((a + b) >> 1, y - 12, 7, 'gold', 9); S.px((a + b) >> 1, y - 13, 'gold', 11, { e: 255 }); S.end(); G.fx = { x: (a + b) >> 1, y: y - 13 }; }
  // incense bowl and its thread of smoke; candles either side
  S.lay('front'); S.beg(); S.box(mx - 2, gy - 3, 5, 2, 'brass', 7); S.end(); sc.emit({ k: 'steam', x: mx, y: gy - 5, rate: 0.9, sp: 3, ang: 0, spread: 0.2, life: 2.6, w: 1 });
  [x0 - 2, x1 + 1].forEach((x, i) => { const lc = sc.light({ x, y: gy - 4, z: 6, r: 10, i: 0.6, c: '#ffd070', fl: 'candle', ph: i * 3, tint: 0.5 }); S.beg(); S.vl(x, gy - 3, 3, 'linen', 9); S.end(); G.an.push((D, t) => { D.lay('front'); H.flame(D, x, gy - 4, 3, t, i * 2); }); });
  if (st === 2) sc.emit({ k: 'leaf', x: cx, y: gy - h, rate: 0.6, sp: 4, ang: 0.8, spread: 1, life: 3, w: w * 0.8 });
  worker(G, R + 3, -1, 'staff'); if (st === 0) G.fx = { x: mx, y: my };
} });

// ───────── 修理铺 mender: an A-frame gantry over a wall being mended, the workshop with its great turning gear ─────────
BS('mender', { kind: 'forge', col: '#ffb070', look: 'worker', icon: 'gear', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the wall section under repair: stone courses with a gap, blocks lying about
  const wx0 = L, wx1 = cx - 2, wh = Math.round(h * 0.26); S.lay('wall'); S.beg(); TX.ashlar(S, wx0, gy - wh, wx1 - wx0, wh, 'stone', 6, { bh: 4 }); S.end(); S.beg(); S.rect(wx0 + Math.round((wx1 - wx0) * 0.4), gy - wh, 7, 5, 'night', 1); S.end();
  S.lay('front'); S.beg(); S.box(wx0 + 2, gy - 4, 6, 4, 'stone', 7, { top: 1 }); S.box(wx0 + 9, gy - 3, 5, 3, 'stone', 6, { top: 1 }); S.end();
  // the gantry: an A-frame straddling the wall (from 1: taller, brass pulleys at 2), a block swinging on its chain
  if (st >= 1) { const gh = Math.round(h * (st === 2 ? 0.95 : 0.78)), ga = wx0 + 1, gb = wx1 - 1, gtop = gy - gh; S.lay('back'); S.beg(); S.line(ga, gy, ga + 5, gtop, 'wood', 6, { w: 2 }); S.line(gb, gy, gb - 5, gtop, 'wood', 4, { w: 2 }); S.hl(ga + 4, gtop, gb - ga - 8, 'wood', 7); S.hl(ga + 4, gtop + 1, gb - ga - 8, 'wood', 4); S.line(ga + 2, gy - Math.round(gh * 0.4), gb - 2, gy - Math.round(gh * 0.4), 'wood', 4); S.end();
    const hx = (ga + gb) >> 1; if (st === 2) { S.beg(); S.ell(hx + 0.5, gtop + 2.5, 2, 2, 'brass', 8); S.end(); }
    G.an.push((D, t, s) => { const up = Math.round((Math.sin(t * 0.5) + 1) * 4), sw = Math.round(Math.sin(t * 1.2)), by = gtop + 8 + up; D.lay('back'); D.vl(hx, gtop + 2, by - gtop - 2, 'ink', 3); D.box(hx - 3 + sw, by, 7, 4, 'stone', 7, { top: 1 }); }); }
  else { S.lay('front'); S.beg(); S.line(wx0 + 2, gy, wx0 + 5, gy - 6, 'wood', 5); S.line(wx0 + 8, gy, wx0 + 5, gy - 6, 'wood', 4); S.hl(wx0 + 1, gy - 6, 12, 'wood', 7); S.box(wx0 + 14, gy - 3, 6, 3, 'crimson', 6); S.end(); }
  // the workshop with the great gear sign (a gear on a post at 0)
  const sx = cx + 1, sw = R - sx + 1, shh = Math.round(h * [0.3, 0.46, 0.52][st]), stp = gy - shh;
  if (st >= 1) { K.wall(S, sx, stp, sw, shh, ['brick', 5, 'bricks']); K.roof(S, sx - 1, stp, sw + 2, 6, 'gable', 'iron', 5); const T = K.tier('steam', 1); K.door(S, sx + 3, gy - 9, 7, 9, T, 1); K.win(S, sc, R - 7, gy - Math.round(shh * 0.55), 4, 5, T, { deco: '' }); }
  const gr = st ? 6 + st : 4, gxc = st ? sx + (sw >> 1) : sx + 4, gyc = st ? stp - gr + 2 : gy - 14;
  if (!st) { S.lay('back'); S.beg(); S.vl(gxc, gyc, gy - gyc, 'wood', 5); S.end(); }
  const gear = (x, y, r, dir, m) => G.an.push((D, t, s) => { const a = t * 0.8 * dir * (1 + (s.st.zap || 0) * 4); D.lay('mid'); for (let yy = -r - 1; yy <= r + 1; yy++) for (let xx = -r - 1; xx <= r + 1; xx++) { const d = Math.hypot(xx, yy); if (d > r + 0.6) continue; const th = Math.atan2(yy, xx) - a, tooth = Math.cos(th * 8) > 0.2; if (d > r - 1.2 && !tooth) continue; if (d < 1.3) { D.px(x + xx, y + yy, 'ink', 1); continue; } D.px(x + xx, y + yy, m, d > r - 1.5 ? 5 : (xx + yy < 0 ? 8 : 6)); } });
  gear(gxc, gyc, gr, 1, 'brass'); if (st === 2) gear(gxc + gr + 4, gyc + 3, 4, -2, 'iron');
  if (st === 2) G.an.push((D, t, s) => { if (steps(t, 1.6) < 0.08) { s.burst('spark', (wx0 + wx1) >> 1, gy - wh, 4, { sp: 26, ang: 0, spread: 2.4, life: 0.5, floor: gy - 1 }); s.flash(0, 0.5); } });
  K.crate(S, R - 5, gy); worker(G, (wx0 + wx1) >> 1, 1, 'hammer'); G.fx = { x: gxc, y: gyc }; G.anvilX = gxc;
}, sfx: (d) => SN.snd(S => { [0.1, 0.35, 0.6].forEach(a => { S.tone(220, 0.08, 'square', 0.06, -40, d + a); S.noise(0.05, 0.08, 2000, d + a); }); }) });

// ───────── 城墙 rampart: a curtain wall across the plot, the gatehouse with its portcullis, towers at the ends ─────────
BS('rampart', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'shield', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const wh = Math.round(h * [0.3, 0.36, 0.4][st]), wt = gy - wh;
  if (st === 0) {
    // a palisade of sharpened stakes with a little gate
    S.lay('wall'); S.beg(); for (let x = L - 2; x <= R + 2; x += 2) { if (Math.abs(x - cx) < 4) continue; const hh = wh + ((x * 7) % 3); S.vl(x, gy - hh, hh, 'wood', 5 + (x % 4 === 0 ? 1 : 0)); S.px(x, gy - hh - 1, 'wood', 7); } S.hl(L - 2, gy - Math.round(wh * 0.6), w + 4, 'wood', 3); S.end();
    S.beg(); S.rect(cx - 3, gy - wh + 3, 7, wh - 3, 'wood', 4); S.line(cx - 3, gy - wh + 3, cx + 3, gy - 1, 'wood', 6); S.end(); K.flag(S, G, cx + 5, gy - wh, 10, 'crimson'); G.fx = { x: cx, y: wt }; worker(G, cx - 8, 1, 'guard'); return; }
  // the curtain wall with its walk and merlons
  K.wall(S, L - 3, wt, w + 6, wh, ['stone', 6, 'ashlar']); P.merlons(S, L - 3, R + 3, wt, 'stone', 7, st === 2);
  // the gatehouse: a taller block, an arch with the portcullis grid, a slit window
  const gw = Math.round(w * 0.3), gx = cx - (gw >> 1), gh = Math.round(h * [0, 0.62, 0.7][st]), gt = gy - gh;
  K.wall(S, gx, gt, gw, gh, ['stone', 7, 'ashlar']); P.merlons(S, gx - 1, gx + gw + 1, gt, 'stone', 8, st === 2);
  const aw = gw - 6, ah = Math.round(wh * 0.8); S.beg(); for (let y = gy - ah; y < gy; y++) for (let x = gx + 3; x < gx + 3 + aw; x++) { const u = (x + 0.5 - gx - 3 - aw / 2) / (aw / 2); if (y >= gy - ah + Math.round((aw / 2) * (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 0.7)) S.px(x, y, 'night', 1); } S.end();
  G.an.push((D, t, s) => { const drop = s.st.cheer ? Math.min(1, s.st.cheer) : 0, top = gy - ah + 1, bot = gy - 1 - Math.round((1 - drop) * ah * 0.55); D.lay('wall'); for (let x = gx + 4; x < gx + 3 + aw - 1; x += 2) D.vl(x, top, bot - top, 'iron', 5); for (let y = top + 1; y < bot; y += 3) D.hl(gx + 4, y, aw - 2, 'iron', 4); });
  S.beg(); S.rect(cx - 1, gt + 4, 2, 5, 'ink', 1); S.end(); const lt = K.lantern(S, sc, gx - 2, gy - ah - 2);
  // towers at both ends (2): round, conical roofs, flags; braziers on the wall walk
  if (st === 2) { [L - 4, R - 5].forEach(x => { const th = Math.round(h * 0.78); S.lay('mid'); S.beg(); S.cyl(x, gy - th, 9, th, 'stone', 7, { rim: 2 }); for (let y = gy - th + 3; y < gy; y += 4) S.hl(x, y, 9, 'stone', 5); S.rect(x + 4, gy - th + 6, 1, 4, 'ink', 1); S.end(); K.roof(S, x, gy - th, 9, 9, 'cone', 'crimson', 5); K.flag(S, G, x + 4, gy - th - 9, 7, 'crimson'); });
    P.brazier(S, sc, G, gx - 6, wt - 2); P.brazier(S, sc, G, gx + gw + 5, wt - 2); }
  K.flag(S, G, cx, gt, 10, st === 2 ? 'gold' : 'crimson'); worker(G, gx - 7, 1, 'guard'); if (st === 2) worker(G, gx + gw + 7, -1, 'guard');
  G.fx = { x: cx, y: gt - 4 };
}, sfx: (d) => SN.snd(S => { S.noise(0.5, 0.1, 300, d + 0.3); S.tone(80, 0.3, 'square', 0.08, -30, d + 0.7); }) });
})();
