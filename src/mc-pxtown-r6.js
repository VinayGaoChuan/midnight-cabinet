// ==== mc-pxtown-r6.js ====
(function () {
// Pixel town, one building at a time — batch 6: 沃尔夫斯堡工厂 · 要塞 · 弩炮室 · 蒸汽加农炮 · 特斯拉线圈 (designs in the town plan).
// Painted at st 1 (a whole building, what a player sees first) · 2 (grown) · 3 (the top tier) — PT.bespoke passes stage + 1.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
const festoon = (S, sc, x0, x1, y, m, c) => { const li = sc.light({ x: (x0 + x1) / 2, y: y + 2, z: 10, r: Math.abs(x1 - x0) * 0.6 + 8, i: 0.6, c: c || '#ffe080', fl: 'buzz', ph: x0, tint: 0.4 }); S.lay('front'); S.beg(); const n = Math.max(3, Math.round(Math.abs(x1 - x0) / 3)); for (let i = 0; i <= n; i++) { const q = i / n, x = Math.round(x0 + (x1 - x0) * q), yy = Math.round(y + Math.sin(q * Math.PI) * 3); S.px(x, yy, 'ink', 2); if (i % 2) S.px(x, yy + 1, m || 'lamp', 10, { e: li + 1 }); } S.end(); };
// a little car (9×4) in a colour, headlights on
const car = (D, x, y, m, dir) => { D.beg(); D.rect(x, y - 3, 9, 2, m, 7); D.rect(x + 2, y - 5, 5, 2, m, 8); D.px(x + 3, y - 4, 'glass', 9); D.px(x + 5, y - 4, 'glass', 9); D.px(dir > 0 ? x + 8 : x, y - 3, 'lamp', 11, { e: 255 }); D.px(x + 1, y - 1, 'ink', 1); D.px(x + 7, y - 1, 'ink', 1); D.end(); };

// ───────── 沃尔夫斯堡工厂 wolfsburg: a long sawtooth-roofed car works, a neon car on its roof, cars driving out onto the test track ─────────
BS('wolfsburg', { kind: 'forge', col: '#6ae0ff', look: 'worker', icon: 'gear', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const fw = Math.round(w * [0, 0.72, 0.8, 0.86][st]), fx = R - fw + 2, fh = Math.round(h * [0, 0.4, 0.46, 0.52][st]), ft = gy - fh;
  K.wall(S, fx, ft, fw, fh, ['brick', 5, 'bricks']); K.roof(S, fx, ft, fw, 8, 'saw', 'iron', 5);
  // the big glazed window where the robot arm welds, the doors the cars come out of
  const wx = fx + 4, ww = Math.round(fw * 0.42), wy = ft + 4, wh = Math.round(fh * 0.5), lw = sc.light({ x: wx + ww / 2, y: wy + wh / 2, z: 6, r: ww, i: 0.8, c: '#bfefff', fl: 'screen', tint: 0.5 });
  S.beg(); S.rect(wx, wy, ww, wh, 'glass', 6, { e: lw + 1 }); for (let x = wx; x < wx + ww; x += 4) S.vl(x, wy, wh, 'iron', 6); S.hl(wx, wy + (wh >> 1), ww, 'iron', 6); S.end();
  G.an.push((D, t, s) => { const a = Math.sin(t * 2.2), bx = wx + 3, by = wy + wh - 1, ex = bx + 4 + Math.round(a * 2), ey = by - 4; D.lay('wall'); D.line(bx, by, bx + 2, by - 4, 'gold', 8); D.line(bx + 2, by - 4, ex, ey, 'gold', 8); D.px(ex + 1, ey + 1, 'lamp', 11, { e: 255 }); if (a > 0.9 && !s.st.wd) { s.st.wd = 1; s.burst('spark', wx + ww / 2, by - 2, 4, { sp: 20, ang: 0, spread: 2.5, life: 0.4 }); } if (a < 0) s.st.wd = 0; car(D, wx + ww - 12, by + 1, 'tile', 1); });
  const dx = fx + fw - 16, dh = Math.round(fh * 0.55); S.beg(); S.rect(dx, gy - dh, 12, dh, 'night', 2); for (let y = gy - dh; y < gy; y += 2) S.hl(dx, y, 12, 'iron', 4); S.hl(dx - 1, gy - dh - 1, 14, 'stone', 7); S.end();
  // the test track: a strip of road in front, cars driving out and round
  S.lay('front'); S.beg(); S.rect(L - 4, gy - 1, w + 8, 2, 'stone', 3); for (let x = L - 4; x < R + 4; x += 6) S.hl(x, gy, 3, 'paper', 8); S.end();
  const cars = st >= 2 ? 2 : 1; G.an.push((D, t) => { D.lay('front'); for (let i = 0; i < cars; i++) { const q = steps(t * 0.12 + i * 0.5, 1), x = Math.round(dx + 2 - q * (dx - L + 16)); car(D, x, gy - 1, ['crimson', 'teal', 'gold'][i % 3], -1); } });
  // the neon car on the roof: an outline that blinks on piece by piece
  const nx = fx + Math.round(fw * 0.5) - 8, ny = ft - 12, ln = sc.light({ x: nx + 8, y: ny + 3, z: 8, r: 24, i: 0.8, c: '#6ae0ff', fl: 'buzz', tint: 0.5 }); S.lay('back'); S.beg(); S.vl(nx + 2, ny + 6, 6, 'iron', 5); S.vl(nx + 14, ny + 6, 6, 'iron', 5); S.end();
  const pts = []; for (let x = 0; x < 24; x++) { pts.push([x - 4, 7]); pts.push([x - 4, 8]); } for (let x = 3; x < 14; x++) pts.push([x, 0]); for (let k = 0; k < 4; k++) { pts.push([-3 + k, 6 - k * 0]); pts.push([2 - k * 0, 4 - k]); pts.push([14 + k, 1 + k]); } [[-4, 6], [19, 6], [19, 5], [0, 5], [1, 4], [2, 3], [2, 2], [2, 1], [15, 2], [16, 3], [17, 4], [18, 5], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6]].forEach(p => pts.push(p)); [[0, 10], [1, 10], [2, 10], [1, 9], [1, 11], [14, 10], [15, 10], [16, 10], [15, 9], [15, 11]].forEach(p => pts.push(p));
  G.an.push((D, t, s) => { const k = s.st.cheer ? pts.length : Math.min(pts.length, Math.floor(steps(t, 3) * pts.length * 1.6)); D.lay('back'); for (let i = 0; i < k; i++) D.px(nx + pts[i][0], ny + pts[i][1], 'teal', 11, { e: ln + 1 }); });
  // the chimney with the works' ring (2+), lights and gold at 3
  if (st >= 2) { const cx0 = fx + 3; P.stack(S, sc, G, cx0, ft, Math.round(h * (st >= 3 ? 0.72 : 0.56)), { rate: 2.5, w: 5 }); const ry = ft - Math.round(h * 0.4); S.lay('back'); S.beg(); S.ell(cx0 + 2.5, ry, 4, 4, st >= 3 ? 'gold' : 'teal', 8, { ring: 1 }); S.vl(cx0 + 2, ry - 3, 7, st >= 3 ? 'gold' : 'teal', 9); S.end(); }
  if (st >= 3) { festoon(S, sc, fx, R + 2, ft - 2, 'teal', '#6ae0ff'); G.an.push((D, t) => { if (steps(t, 0.9) < 0.5) { D.lay('front'); D.px(L - 2, gy - 6, 'red', 11, { e: 255 }); D.px(L + 2, gy - 6, 'lamp', 11, { e: 255 }); } }); S.lay('front'); S.beg(); S.vl(L, gy - 12, 10, 'iron', 6); S.hl(L - 3, gy - 12, 7, 'crimson', 7); S.hl(L - 3, gy - 11, 7, 'linen', 9); S.end(); }
  K.barrel(S, fx - 6, gy - 1); worker(G, fx - 3, 1, 'wrench'); G.fx = { x: nx + 8, y: ny };
}, sfx: (d) => SN.snd(S => { S.tone(440, 0.15, 'square', 0.05, 0, d + 0.3); S.tone(349, 0.25, 'square', 0.05, 0, d + 0.45); S.noise(0.3, 0.06, 5000, d); }) });

// ───────── 要塞 citadel: a castle climbing a rocky hill — walls, the keep and its spire on top, torches up the road ─────────
BS('citadel', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'shield', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const hh = Math.round(h * 0.42), peak = cx + Math.round(w * 0.08); S.lay('wall'); S.beg(); S.poly([[L - 5, gy], [L + 2, gy - hh * 0.4], [peak - 12, gy - hh], [peak + 10, gy - hh], [R - 2, gy - hh * 0.5], [R + 5, gy]], 'rock', 6); S.noise(L - 5, gy - hh, w + 10, hh, 1, 3, 13); for (let i = 0; i < 9; i++) S.ell(L + 3 + (i * 11) % (w - 4), gy - 3 - (i * 7) % (hh - 8), 1.6, 1, 'moss', 6); S.end();
  // the road zig-zagging up with torches, lit in turn during the show
  const road = [[L + 2, gy - 2], [cx - 4, gy - Math.round(hh * 0.35)], [L + 10, gy - Math.round(hh * 0.62)], [peak - 8, gy - hh + 2]]; S.beg(); for (let i = 0; i < road.length - 1; i++) S.line(road[i][0], road[i][1], road[i + 1][0], road[i + 1][1], 'sand', 6); S.end();
  road.forEach(([x, y], i) => { if (i === 0 && st < 2) return; const li = sc.light({ x, y: y - 3, z: 8, r: 12, i: 0.7, c: '#ff9a40', fl: 'fire', ph: i, tint: 0.5 }); S.lay('front'); S.beg(); S.vl(x, y - 3, 3, 'wood', 5); S.end(); G.an.push((D, t) => { D.lay('front'); H.flame(D, x, y - 4, 3, t, i); }); });
  // the curtain wall round the top, the keep, towers (more and taller by stage)
  const ty = gy - hh, ww = Math.round(w * [0, 0.5, 0.6, 0.66][st]), wx = peak - (ww >> 1); K.wall(S, wx, ty - 8, ww, 9, ['stone', 7, 'ashlar']); P.merlons(S, wx, wx + ww, ty - 8, 'stone', 8, st >= 3);
  const kw = Math.round(ww * 0.4), kh = Math.round(h * [0, 0.34, 0.42, 0.5][st]), kx = peak - (kw >> 1), kt = ty - 8 - kh; K.wall(S, kx, kt, kw, kh, ['stone', 8, 'ashlar']); K.quoins(S, kx, kt, kw, kh, 'stone', 8);
  const T = K.tier('medieval', 2); for (let y = kt + 4; y < ty - 12; y += 8) K.win(S, sc, peak - 1, y, 2, 4, T, { deco: '', sill: false, lit: true });
  K.roof(S, kx - 1, kt, kw + 2, Math.round(kw * 1.3), 'cone', st >= 3 ? 'gold' : 'tile', st >= 3 ? 6 : 5); K.flag(S, G, peak, kt - Math.round(kw * 1.3), 10, st >= 3 ? 'gold' : 'crimson');
  const towers = st >= 2 ? [wx - 2, wx + ww - 5] : [wx + ww - 5]; towers.forEach((x, i) => { const th = Math.round(h * (0.2 + st * 0.05)); S.lay('mid'); S.beg(); S.cyl(x, ty - 8 - th, 7, th + 2, 'stone', 7, { rim: 2 }); S.rect(x + 3, ty - th, 1, 3, 'lamp', 10, { e: 255 }); S.end(); K.roof(S, x - 1, ty - 8 - th, 9, 8, 'cone', 'crimson', 5); if (st >= 2) K.flag(S, G, x + 3, ty - 16 - th, 6, 'crimson'); });
  S.lay('back'); S.beg(); S.rect(peak - 3, ty - 6, 6, 6, 'night', 1); S.end();
  if (st >= 3) { festoon(S, sc, wx, wx + ww, ty - 10, 'fire', '#ffb060'); K.bannerV(S, kx + 1, kt + 3, 12, 'crimson', 'shield'); sc.emit({ k: 'glint', x: peak, y: kt - 10, rate: 1, sp: 4, ang: 0, spread: 3, life: 0.7, w: 10 }); }
  worker(G, R + 3, -1, 'guard'); G.fx = { x: peak, y: kt - 6 };
}, show(s, o, G) { if (once(s, o, 'tq', 0.1)) s.st.cheer = 1; } });

// ───────── 弩炮室 ballista: a half-round stone bastion with a great bow aimed at the night sky, bolts in a rack ─────────
BS('ballista', { kind: 'war', col: '#ffcf4a', look: 'keeper', icon: 'arrow', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const bw = Math.round(w * [0, 0.66, 0.74, 0.8][st]), bh = Math.round(h * [0, 0.3, 0.36, 0.42][st]), bx = cx - (bw >> 1), bt = gy - bh;
  S.lay('wall'); S.beg(); for (let x = bx; x < bx + bw; x++) { const u = (x + 0.5 - cx) / (bw / 2), top = bt + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * bh * 0.35); for (let y = top; y < gy; y++) { const row = y - bt, mortar = row % 4 === 3 || (x + (Math.floor(row / 4) % 2) * 3) % 6 === 0; S.px(x, y, 'stone', mortar ? 4 : 6 + (u < -0.3 ? 1 : u > 0.5 ? -1 : 0), { n: [u * 0.7, 0] }); } } S.end();
  S.beg(); for (let x = bx; x < bx + bw; x += 4) { const u = (x + 1.5 - cx) / (bw / 2), top = bt + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * bh * 0.35); S.box(x, top - 3, 2, 3, 'stone', 8, { top: 1 }); if (st >= 3) S.hl(x, top - 3, 2, 'gold', 9); } S.end();
  S.beg(); for (let y = bt + 6; y < gy - 4; y += 7) [bx + Math.round(bw * 0.2), bx + Math.round(bw * 0.8)].forEach(x => { S.rect(x, y, 1, 4, 'night', 1); S.px(x, y - 1, 'stone', 8); }); S.end();
  // the great bow on its turntable, aimed up and out; it draws and looses in a show (G.bolt)
  const aim = (x, y, s, iron) => { S.lay('mid'); S.beg(); S.box(x - 4, y - 2, 9, 2, 'wood', 5, { top: 1 }); S.end(); G.bolt = { x, y: y - 6 };
    G.an.push((D, t, sst, o) => { const a = o.show ? o.show.a : 9, dr = a < 0.55 ? Math.min(1, a / 0.5) : 0, len = Math.round(16 * s), ang = -0.6, dx = Math.cos(ang), dy = Math.sin(ang), px = -dy, py = dx, bx0 = x - Math.round(dx * len * 0.3), by0 = y - 3 - Math.round(dy * len * 0.3);
      D.lay('mid'); D.beg(); D.line(bx0, by0, bx0 + Math.round(dx * len), by0 + Math.round(dy * len), 'wood', 7, { w: 2 }); const hx = bx0 + Math.round(dx * len * 0.72), hy = by0 + Math.round(dy * len * 0.72), arm = Math.round(9 * s), bend = dr * 2.5;
      const tip = (sd) => [hx + Math.round(px * arm * sd - dx * bend * 2), hy + Math.round(py * arm * sd - dy * bend * 2)]; const t1 = tip(1), t2 = tip(-1); D.line(hx, hy, t1[0], t1[1], iron ? 'iron' : 'wood', 8); D.line(hx, hy, t2[0], t2[1], iron ? 'iron' : 'wood', 6); D.px(t1[0], t1[1], 'brass', 10); D.px(t2[0], t2[1], 'brass', 10);
      const nx = bx0 + Math.round(dx * len * (0.35 - dr * 0.2)), ny = by0 + Math.round(dy * len * (0.35 - dr * 0.2)); D.line(t1[0], t1[1], nx, ny, 'linen', 9); D.line(nx, ny, t2[0], t2[1], 'linen', 8);
      if (!(a >= 0.55 && a < 1.6)) { D.line(nx, ny, nx + Math.round(dx * 14 * s), ny + Math.round(dy * 14 * s), 'wood', 9); D.px(nx + Math.round(dx * 15 * s), ny + Math.round(dy * 15 * s), 'iron', 11); } D.end(); }); };
  aim(cx, bt, 1.5 + (st - 1) * 0.2, st >= 3); if (st >= 3) aim(cx + Math.round(bw * 0.32), bt + 3, 1.1, true);
  // a rack of bolts, a brazier on the parapet
  S.lay('front'); S.beg(); S.hl(R - 7, gy - 10, 8, 'wood', 6); for (let i = 0; i < 5; i++) { S.vl(R - 6 + i * 2, gy - 12, 12, 'wood', 7); S.px(R - 6 + i * 2, gy - 13, 'iron', 10); } S.end();
  if (st >= 2) { P.brazier(S, sc, G, bx + 3, bt + 2); K.flag(S, G, bx + bw - 2, bt + 2, 12, st >= 3 ? 'gold' : 'crimson'); }
  if (st >= 3) { K.bannerV(S, cx - 2, bt + 4, 10, 'crimson', 'arrow'); festoon(S, sc, bx, bx + bw, bt - 2, 'fire', '#ff9a50'); }
  worker(G, L - 3, 1, 'guard'); G.fx = { x: cx, y: bt - 10 };
}, sfx: (d, q) => SN.snd(S => { S.tone(140, 0.5, 'sawtooth', 0.04, 60, d); S.tone(110, 0.16, 'square', 0.09, -60, d + 0.55); S.noise(0.5, 0.08, 2200, d + 0.58); }) });

// ───────── 蒸汽加农炮 cannon: a riveted steel casemate with a long barrel out, a boiler piped to it, balls stacked; a turning turret at 3 ─────────
BS('cannon', { kind: 'war', col: '#ffb070', look: 'worker', icon: 'shield', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const dr = Math.round(w * [0, 0.26, 0.3, 0.32][st]), dx = cx - 2, dy = gy - 3;
  // the casemate: a half dome of riveted plates on a concrete footing
  S.lay('wall'); S.beg(); S.box(dx - dr - 3, gy - 4, dr * 2 + 7, 4, 'stone', 5, { top: 1 }); S.end(); S.beg(); for (let yy = 0; yy <= dr; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, dr * dr - yy * yy))); for (let x = -hw; x < hw; x++) { const u = x / dr; S.px(dx + x, dy - 1 - yy, st >= 3 ? 'brass' : 'iron', 6 + (u < -0.3 ? 1.5 : u > 0.4 ? -1.5 : 0) + (yy > dr * 0.7 ? 1 : 0), { n: [u * 0.8, -yy / dr * 0.7] }); } } S.end();
  S.beg(); for (let yy = 3; yy < dr; yy += 4) { const hw = Math.round(Math.sqrt(dr * dr - yy * yy)); for (let x = -hw + 1; x < hw; x += 3) S.px(dx + x, dy - 1 - yy, 'iron', 9); } S.end();
  // the barrel(s): long, banded, a muzzle ring; they turn a little (a turret at 3), recoil and flash in a show
  const barrels = st >= 3 ? [-2, 3] : [0], len = Math.round(w * [0, 0.42, 0.5, 0.54][st]);
  G.an.push((D, t, s, o) => { const a = o.show ? o.show.a : 9, rec = a > 0.5 && a < 0.7 ? 3 : 0, sw = st >= 3 ? Math.sin(t * 0.4) * 0.15 : 0; D.lay('mid'); barrels.forEach(off => { const ang = -0.35 + sw, x0 = dx, y0 = dy - Math.round(dr * 0.55) + off, ex = x0 - Math.round(Math.cos(ang) * (len - rec)), ey = y0 + Math.round(Math.sin(ang) * (len - rec));
    D.line(x0, y0, ex, ey, 'iron', 6, { w: 3 }); for (let k = 3; k < len - rec; k += 5) D.px(x0 - Math.round(Math.cos(ang) * k), y0 + Math.round(Math.sin(ang) * k), 'brass', 8); D.rect(ex - 1, ey - 1, 3, 4, 'brass', 9);
    if (a > 0.5 && a < 0.62) { D.rect(ex - 5, ey - 3, 5, 6, 'fire', 11, { e: 255 }); if (!s.st['m' + off]) { s.st['m' + off] = 1; s.burst('steam', ex - 4, ey, 10, { sp: 26, ang: -1.9, spread: 0.6, life: 1.2 }); s.burst('spark', ex - 4, ey, 6, { sp: 50, ang: -1.9, spread: 0.5, life: 0.4 }); } } else s.st['m' + off] = 0; }); });
  const pw = Math.round(dr * 0.5); S.lay('wall'); S.beg(); S.ell(dx + pw + 0.5, dy - Math.round(dr * 0.4), 2.5, 2.5, 'brass', 8); S.ell(dx + pw + 0.5, dy - Math.round(dr * 0.4), 1.5, 1.5, 'glass', 9); S.end();
  // the boiler at the back, its pipe into the dome, steam from the vents (more at 2+)
  const bx = R - 9, bh = Math.round(h * (0.3 + st * 0.06)); S.lay('back'); S.beg(); S.cyl(bx, gy - bh, 8, bh, 'copper', 6, { rim: 2 }); for (let y = gy - bh + 3; y < gy; y += 4) S.hl(bx, y, 8, 'copper', 8); S.ell(bx + 4, gy - bh, 4, 3, 'copper', 7, { dome: 1 }); S.hl(dx + dr - 2, dy - Math.round(dr * 0.3), bx - dx - dr + 3, 'brass', 7); S.end();
  sc.emit({ k: 'steam', x: bx + 4, y: gy - bh - 3, rate: 1 + st * 0.6, sp: 8, ang: 0.3, spread: 0.4, life: 2, w: 3 });
  // a pyramid of balls; more at 2+; flags and lights at 3
  const balls = (x, n) => { S.lay('front'); S.beg(); const rows = n; for (let r = 0; r < rows; r++) for (let i = 0; i < rows - r; i++) S.ell(x + i * 3 + r * 1.5 + 0.5, gy - 1.5 - r * 2.5, 1.6, 1.6, 'iron', 4, { dome: 1 }); S.end(); };
  balls(L - 1, st >= 2 ? 4 : 3); if (st >= 2) balls(R - 20, 3);
  if (st >= 3) { K.flag(S, G, dx, dy - dr - 1, 12, 'gold'); [L - 3, bx - 3].forEach(x => { S.lay('front'); S.beg(); S.vl(x, gy - 16, 16, 'iron', 6); S.end(); K.lantern(S, sc, x, gy - 17, { c: '#ffe080' }); }); festoon(S, sc, L - 3, bx - 3, gy - 16, 'lamp', '#ffe080'); }
  worker(G, R + 4, -1, 'wrench'); G.fx = { x: dx - Math.round(len * 0.9), y: dy - Math.round(dr * 0.55) - Math.round(len * 0.33) };
}, sfx: (d) => SN.snd(S => { S.tone(45, 0.6, 'sine', 0.25, -15, d + 0.52); S.noise(0.5, 0.2, 180, d + 0.52); S.noise(0.8, 0.06, 3000, d + 0.6); }) });

// ───────── 特斯拉线圈 tesla: a tall coil tower crowned with a glowing ring, arcs leaping off it; a control hut with the lightning sign ─────────
BS('tesla', { kind: 'power', col: '#9ad8ff', look: 'worker', icon: 'bolt', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const tower = (x, th, big) => { const cw = big ? 6 : 4, tt = gy - th; S.lay('mid'); S.beg(); S.box(x - cw, gy - 5, cw * 2 + 1, 5, 'scifi', 5, { top: 1 }); S.cyl(x - (cw >> 1) - 1, tt + 4, cw + 2, th - 9, 'copper', 6, { rim: 2 }); for (let y = tt + 5; y < gy - 5; y += 2) S.hl(x - (cw >> 1) - 1, y, cw + 2, 'copper', 8); S.end();
    const rr = big ? 7 : 5, ry = tt + 1, lr = sc.light({ x, y: ry, z: 10, r: 36, i: 0.6, c: '#9ad8ff', fl: 'buzz', ph: x, tint: 0.55 }); S.beg(); for (let a = 0; a < Math.PI * 2; a += 0.08) { const px = x + Math.round(Math.cos(a) * rr), py = ry + Math.round(Math.sin(a) * rr * 0.35); S.px(px, py, 'iron', Math.sin(a) > 0 ? 8 : 5); S.px(px, py + 1, 'iron', 4); } S.px(x, ry - 3, 'ice', 11, { e: lr + 1 }); S.end();
    G.an.push((D, t, s) => { const z = s.st.zap || 0; s.st.zap = Math.max(0, z - 0.02); const n = 1 + (steps(t, 0.7) < 0.3 ? 2 : 0) + Math.round(z * 3); D.lay('front'); for (let k = 0; k < n; k++) { const sd = Math.floor(t * 18) * 7 + k * 13 + x, rg = X.rng(sd), a = rg() * Math.PI * 2, len = 6 + Math.round(rg() * (8 + z * 10)); let px = x + Math.round(Math.cos(a) * rr), py = ry; for (let j = 0; j < len; j++) { px += Math.round(Math.cos(a) * 1.2 + (rg() - 0.5) * 2); py += Math.round(Math.sin(a) * 0.9 + (rg() - 0.5) * 2); D.px(px, py, j < 2 ? 'ice' : 'arcane', 11 - (j > len * 0.6 ? 2 : 0), { e: 255 }); } } s.mul[lr] = 0.6 + n * 0.8; }); return { x, y: ry };
  };
  const main = tower(cx - 4, Math.round(h * [0, 0.78, 0.92, 1.05][st]), true);
  // the control hut: panels, a green scope window, the yellow lightning sign
  const hx = R - 16, hw = 16, hh = Math.round(h * 0.28); K.wall(S, hx, gy - hh, hw, hh, ['scifi', 6, 'panels']); K.roof(S, hx - 1, gy - hh, hw + 2, 3, 'flat', 'scifi', 7); const lw = sc.light({ x: hx + 5, y: gy - hh + 5, z: 6, r: 10, i: 0.7, c: '#78dc72', fl: 'screen', tint: 0.5 }); S.beg(); S.rect(hx + 2, gy - hh + 3, 6, 4, 'screen', 7, { e: lw + 1 }); S.end();
  G.an.push((D, t) => { D.lay('wall'); for (let i = 0; i < 6; i++) D.px(hx + 2 + i, gy - hh + 5 + Math.round(Math.sin(t * 8 + i) * 1.3), 'screen', 11, { e: 255 }); });
  S.beg(); S.poly([[hx + 11, gy - hh + 3], [hx + 15, gy - hh + 9], [hx + 7, gy - hh + 9]], 'gold', 8); S.line(hx + 11, gy - hh + 5, hx + 10, gy - hh + 7, 'ink', 1); S.px(hx + 11, gy - hh + 7, 'ink', 1); S.end();
  // stage 2+: a second, smaller tower; the two throw a fat arc between them. Insulator fence; at 3 gold rings, a festoon, a beacon
  if (st >= 2) { const b = tower(L + 5, Math.round(h * (st >= 3 ? 0.72 : 0.6)), false); G.an.push((D, t, s) => { if (steps(t, 1.6) > 0.25 && !(s.st.zap > 0.2)) return; const sd = Math.floor(t * 20); D.lay('front'); let y = b.y; for (let x = b.x; x <= main.x; x++) { const q = (x - b.x) / Math.max(1, main.x - b.x); y = Math.round(b.y + (main.y - b.y) * q + (X.rng(sd * 31 + x)() - 0.5) * 4); D.px(x, y, 'ice', 11, { e: 255 }); D.px(x, y + 1, 'arcane', 9, { e: 255 }); } }); }
  S.lay('front'); S.beg(); for (let x = L - 3; x < R + 3; x += 5) { S.vl(x, gy - 5, 5, 'iron', 5); S.px(x, gy - 6, 'linen', 9); } S.hl(L - 3, gy - 4, w + 6, 'iron', 4); S.end();
  if (st >= 3) { festoon(S, sc, main.x + 3, hx + hw, gy - hh - 1, 'ice', '#bfefff'); G.beacon = { x: hx + 8, y: gy - hh - 5, li: sc.light({ x: hx + 8, y: gy - hh - 5, z: 8, r: 14, i: 0.1, c: '#ff4040', tint: 0.4 }) }; S.lay('mid'); S.beg(); S.vl(hx + 8, gy - hh - 4, 4, 'iron', 7); S.end(); }
  worker(G, hx - 4, 1, 'read'); G.fx = main;
} });
})();
