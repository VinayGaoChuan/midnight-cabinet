// ==== mc-pxtown-r8.js ====
(function () {
// Pixel town, one building at a time — batch 8: 破阵营 · 誓约大厅 · 角斗场 · 骑士团驻地 · 圣光礼拜堂 (designs in the town plan).
// Painted at st 1 (a whole building) · 2 (grown) · 3 (the top tier).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };
// a champion statue on a plinth: spear or shield raised
const champion = (S, sc, x, y, h, m, arm) => { S.lay('mid'); S.beg(); S.box(x - 4, y - 4, 9, 4, 'stone', 6, { top: 1 }); const b = y - 4; S.rect(x - 2, b - Math.round(h * 0.45), 2, Math.round(h * 0.45), m, 7); S.rect(x + 1, b - Math.round(h * 0.45), 2, Math.round(h * 0.45), m, 5); S.cyl(x - 3, b - Math.round(h * 0.8), 7, Math.round(h * 0.38), m, 7, { rim: 2 }); S.ell(x + 0.5, b - Math.round(h * 0.88), 2, 2.4, m, 8, { dome: 1 });
  if (arm === 'spear') { S.line(x + 3, b - Math.round(h * 0.7), x + 5, b - h - 4, m, 8); S.vl(x + 5, b - h - 8, 12 + Math.round(h * 0.3), 'wood', 6); S.px(x + 5, b - h - 9, 'iron', 10); } else { S.rect(x - 7, b - Math.round(h * 0.75), 5, 8, 'tile', 7); S.vl(x - 5, b - Math.round(h * 0.75), 8, 'gold', 9); } S.end(); };
const horse = (D, x, y, dir, m, gait) => { const f = dir; D.beg(); D.rect(x - 5, y - 8, 11, 4, m, 7); D.rect(x + f * 5 - (f < 0 ? 2 : 0), y - 11, 3, 4, m, 8); D.px(x + f * 7, y - 11, m, 8); D.px(x + f * 7, y - 12, m, 6); D.px(x - f * 6, y - 8, 'hair', 3); D.px(x - f * 6, y - 7, 'hair', 3);
  [[-4, gait], [-2, -gait], [2, gait], [4, -gait]].forEach(([lx, g]) => { D.vl(x + lx + g, y - 4, 4, m, 5); D.px(x + lx + g, y - 1, 'ink', 2); }); D.end(); };

// ───────── 破阵营 ev_van2: the vanguard's siege camp — a roofed battering ram on wheels, spiked barricades, the spear champion ─────────
BS('ev_van2', { kind: 'war', col: '#ff5a4a', look: 'keeper', icon: 'sword', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the ram: a long pitched shed on four wheels, hide-covered, the iron head swinging out of its front
  const rw = Math.round(w * [0, 0.54, 0.6, 0.64][st]), rx = L + 1, rh = Math.round(h * [0, 0.26, 0.3, 0.34][st]), rt = gy - 7 - rh, hm = st >= 3 ? 'gold' : 'iron';
  // the frame on its chassis: four posts under a steep hide-covered roof, open at the sides so the log shows
  S.lay('back'); S.beg(); S.hl(rx, gy - 7, rw, 'wood', 5); S.hl(rx, gy - 6, rw, 'wood', 3); [rx + 1, rx + (rw >> 1), rx + rw - 2].forEach(x => S.vl(x, rt + 2, gy - 8 - rt, 'wood', 5)); S.end();
  S.lay('mid'); S.beg(); S.poly([[rx - 2, rt + 3], [rx + rw / 2, rt - Math.round(rh * 0.55)], [rx + rw + 2, rt + 3]], 'leather', 5); for (let k = 2; k < Math.round(rh * 0.55); k += 3) { const hw = (rw / 2 + 2) * (1 - k / (rh * 0.55)); S.hl(rx + rw / 2 - hw, rt + 3 - k, hw * 2, 'leather', 3.5); } S.hl(rx - 2, rt + 3, rw + 4, 'wood', 6); S.end();
  S.lay('front'); [rx + 5, rx + rw - 6].forEach(x => { S.beg(); S.ell(x + 0.5, gy - 3.5, 3.5, 3.5, 'wood', 6, { ring: 1.2 }); S.hl(x - 2, gy - 4, 5, 'wood', 4); S.vl(x, gy - 6, 5, 'wood', 4); S.px(x, gy - 4, 'iron', 9); S.end(); });
  // the log hung on chains from the ridge, swinging, its iron ram's head (gold at 3) out in front
  G.an.push((D, t, s, o) => { const sw = o.show ? Math.max(0, Math.sin(o.show.a * 8)) * 5 : Math.max(0, Math.sin(t * 1.2)) * 3, hx = rx + rw + Math.round(sw), ly = rt + Math.round(rh * 0.55); D.lay('mid'); D.beg(); [rx + Math.round(rw * 0.3), rx + Math.round(rw * 0.7)].forEach(x => D.line(x, rt + 3, x + Math.round(sw * 0.5), ly, 'iron', 6)); D.rect(rx + 3 + Math.round(sw), ly, hx - rx - 3, 3, 'wood', 6); D.hl(rx + 3 + Math.round(sw), ly, hx - rx - 3, 'wood', 8);
    D.rect(hx, ly - 3, 6, 9, hm, 7); D.rect(hx + 6, ly - 1, 2, 5, hm, 9); D.hl(hx, ly - 3, 6, hm, 10); D.px(hx + 1, ly - 4, hm, 8); D.px(hx + 2, ly - 5, hm, 9); D.px(hx + 1, ly + 6, hm, 8); D.px(hx + 2, ly + 7, hm, 9); D.px(hx + 4, ly, 'ink', 1); D.end(); });
  // spiked barricades (cheval de frise) along the right, red banners, the champion with his spear
  S.lay('front'); S.beg(); for (let x = cx + 6; x < R + 3; x += 7) { S.line(x - 3, gy, x + 3, gy - 7, 'wood', 6); S.line(x + 3, gy, x - 3, gy - 7, 'wood', 4); S.hl(x - 4, gy - 4, 9, 'wood', 5); S.px(x + 3, gy - 8, 'iron', 10); S.px(x - 3, gy - 8, 'iron', 10); } S.end();
  champion(S, sc, cx + Math.round(w * 0.2), gy - 7, Math.round(h * (0.34 + st * 0.06)), st >= 3 ? 'gold' : 'stone', 'spear');
  K.flag(S, G, rx + rw + 8, gy, Math.round(h * 0.7), 'crimson'); if (st >= 2) { P.tent(S, R - 14, gy - 7, 13, 9, 'crimson'); P.brazier(S, sc, G, rx - 2, gy); }
  if (st >= 3) { K.flag(S, G, R + 2, gy, Math.round(h * 0.9), 'gold'); K.flag(S, G, L - 3, gy, Math.round(h * 0.8), 'crimson'); sc.emit({ k: 'glint', x: cx + Math.round(w * 0.2), y: gy - Math.round(h * 0.6), rate: 1, sp: 4, ang: 0, spread: 3, life: 0.7, w: 8 }); }
  worker(G, R + 5, -1, 'guard'); G.fx = { x: rx + rw, y: gy - 10 };
}, show(s, o, G, q) { [0.2, 0.5, 0.8].forEach((a, i) => { if (once(s, o, 'rm' + i, a)) s.burst('dust', G.fx.x + 4, G.fx.y, 6 + q * 2, { sp: 22, ang: 1.4, spread: 1, life: 0.6 }); }); } });

// ───────── 誓约大厅 ev_gua2: a huge tower-shield of stone standing before a low hall, the guardians' blue, the oath glowing on it ─────────
BS('ev_gua2', { kind: 'holy', col: '#8ab8ff', look: 'keeper', icon: 'shield', pillarC: '#cfe0ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the hall behind: long, low, a heavy roof, blue banners between its pillars
  const hw = Math.round(w * 0.9), hx = cx - (hw >> 1), hh = Math.round(h * 0.3), ht = gy - hh; K.wall(S, hx, ht, hw, hh, ['stone', 5, 'ashlar']); K.roof(S, hx - 2, ht, hw + 4, Math.round(h * 0.14), 'hip', 'tile', 5);
  for (let i = 0; i < (st >= 2 ? 4 : 2); i++) K.bannerV(S, hx + 3 + Math.round(i * (hw - 10) / Math.max(1, (st >= 2 ? 3 : 1))), ht + 3, Math.round(hh * 0.6), 'tile', 'shield');
  S.beg(); S.box(cx - 10, gy - 3, 21, 3, 'stone', 7, { top: 1 }); S.box(cx - 8, gy - 5, 17, 2, 'stone', 8, { top: 1 }); S.end();
  // the shield stone: a heater shield taller than the hall, its oath-sigil glowing, a silver (gold at 3) rim
  const sh = Math.round(h * [0, 0.72, 0.88, 1][st]), sw = Math.round(sh * 0.62), sy = gy - 5, lg = sc.light({ x: cx, y: sy - sh * 0.55, z: 10, r: sw * 1.6, i: 0.9, c: '#8ab8ff', fl: 'pulse', amp: 0.2, sp: 0.8, tint: 0.5 });
  S.lay('mid'); S.beg(); for (let y = sy - sh; y < sy; y++) { const q = (y - (sy - sh)) / sh, hw2 = q < 0.55 ? sw / 2 : sw / 2 * Math.sqrt(Math.max(0, 1 - Math.pow((q - 0.55) / 0.45, 1.6))); for (let x = Math.round(cx - hw2); x < Math.round(cx + hw2); x++) { const edge = x <= Math.round(cx - hw2) + 1 || x >= Math.round(cx + hw2) - 2 || y < sy - sh + 2; S.px(x, y, edge ? (st >= 3 ? 'gold' : 'linen') : 'stone', edge ? 9 : 6 + (x < cx ? 1 : -0.5), { n: [(x - cx) / sw, 0] }); } } S.end();
  S.beg(); const gy2 = sy - Math.round(sh * 0.55); S.vl(cx, gy2 - Math.round(sh * 0.25), Math.round(sh * 0.5), 'tile', 10, { e: lg + 1 }); S.hl(cx - Math.round(sw * 0.25), gy2 - Math.round(sh * 0.08), Math.round(sw * 0.5) + 1, 'tile', 10, { e: lg + 1 }); S.ell(cx + 0.5, gy2 - Math.round(sh * 0.08), 2.5, 2.5, 'ice', 11, { e: 255 }); S.end();
  if (st >= 3) { [hx - 2, hx + hw + 2].forEach(x => champion(S, sc, x, gy, Math.round(h * 0.42), 'linen', 'shield')); const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.3); }); }
  if (st >= 2) [cx - Math.round(sw * 0.7), cx + Math.round(sw * 0.7)].forEach(x => K.lantern(S, sc, x, gy - 14, { c: '#bfd8ff' }));
  worker(G, R + 4, -1, 'guard'); G.fx = { x: cx, y: sy - sh };
} });

// ───────── 角斗场 ev_war1: a round timber stockade arena — stands, a sand pit, two fighters clashing ─────────
BS('ev_war1', { kind: 'war', col: '#ff7a5a', look: 'keeper', icon: 'sword', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const aw = Math.round(w * [0, 0.9, 0.96, 1][st]), ax = cx - (aw >> 1), sh = Math.round(h * [0, 0.3, 0.42, 0.5][st]), m = st >= 3 ? 'stone' : 'wood';
  // the far side of the ring: the stands rising (a crowd of heads on them), then the sand
  S.lay('back'); S.beg(); for (let r = 0; r < (st >= 2 ? 3 : 2); r++) { const y = gy - 10 - r * 5; S.rect(ax + r * 3, y - 4, aw - r * 6, 4, m, 5 - r * 0.5); S.hl(ax + r * 3, y - 4, aw - r * 6, m, 7); } S.end();
  G.an.push((D, t, s) => { D.lay('back'); for (let r = 0; r < (st >= 2 ? 3 : 2); r++) for (let x = ax + 3 + r * 3; x < ax + aw - 3 - r * 3; x += 3) { const up = s.st.cheer || (Math.sin(t * 3 + x) > 0.9) ? 1 : 0; D.px(x, gy - 15 - r * 5 - up, ['skin', 'hair', 'skin'][(x + r) % 3], 5 + (x % 3)); D.px(x, gy - 14 - r * 5 - up, ['crimson', 'tile', 'leaf', 'sand'][(x + r) % 4], 6); } });
  S.lay('wall'); S.beg(); S.ell(cx + 0.5, gy - 4, aw * 0.42, 4, 'sand', 7); S.end();
  // the fighters: two figures circling, blades flashing when they meet
  G.an.push((D, t, s) => { const q = Math.sin(t * 2), a = Math.round(q * 4), hit = Math.abs(q) < 0.1; D.lay('mid'); [[cx - 6 + a, 1, 'crimson'], [cx + 6 - a, -1, 'tile']].forEach(([x, dir, c]) => { D.px(x, gy - 12, 'skin', 6); D.rect(x - 1, gy - 11, 3, 4, c, 6); D.px(x - 1, gy - 7, 'leather', 4); D.px(x + 1, gy - 7, 'leather', 4); D.px(x - 1, gy - 6, 'ink', 2); D.px(x + 1, gy - 6, 'ink', 2); D.line(x + dir * 2, gy - 10, x + dir * 5, gy - 13 + (hit ? 2 : 0), 'iron', 10); }); if (hit && !s.st.clk) { s.st.clk = 1; s.burst('spark', cx, gy - 12, 4, { sp: 20, ang: 0, spread: 3, life: 0.4 }); } if (!hit) s.st.clk = 0; });
  // the near stockade: posts and planks, cut low in the middle so the fight shows; flags on the tall posts
  S.lay('front'); S.beg(); for (let x = ax; x <= ax + aw; x += 2) { const mid = Math.abs(x - cx) < aw * 0.28; const hh = mid ? 5 : 9 + (x % 4 === 0 ? 1 : 0); S.vl(x, gy - hh, hh, m, 6 + (x % 4 === 0 ? 1 : 0)); } S.hl(ax, gy - 4, aw + 1, m, 4); S.end();
  [ax, ax + aw].forEach(x => K.flag(S, G, x, gy - 9, Math.round(h * 0.3), 'crimson')); if (st >= 2) [cx - Math.round(aw * 0.3), cx + Math.round(aw * 0.3)].forEach(x => K.flag(S, G, x, gy - 9, Math.round(h * 0.34), 'gold'));
  if (st >= 3) { const li = sc.light({ x: cx, y: gy - sh - 10, z: 10, r: 18, i: 0.9, c: '#ffe070', tint: 0.4 }); S.lay('back'); S.beg(); S.box(cx - 2, gy - sh - 8, 5, sh - 8, 'stone', 7); S.rect(cx - 2, gy - sh - 12, 5, 4, 'gold', 9, { e: li + 1 }); S.hl(cx - 3, gy - sh - 12, 7, 'gold', 10, { e: li + 1 }); S.end(); P.brazier(S, sc, G, ax + 3, gy - 9); P.brazier(S, sc, G, ax + aw - 3, gy - 9); }
  G.fx = { x: cx, y: gy - 14 };
}, sfx: (d) => SN.snd(S => { S.noise(0.9, 0.06, 900, d); [0.3, 0.55].forEach(a => { S.tone(2400, 0.06, 'square', 0.04, 0, d + a); S.noise(0.04, 0.08, 6000, d + a); }); }) });

// ───────── 骑士团驻地 ev_pal1: the knights' commandery — a stable with horses looking out, the jousting barrier, a mounted knight riding ─────────
BS('ev_pal1', { kind: 'war', col: '#ffe8a0', look: 'keeper', icon: 'shield', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the stable: timber frame, plaster, half doors with horse heads over them; a bell turret (2+)
  const sw = Math.round(w * 0.5), sx = R - sw, shh = Math.round(h * [0, 0.34, 0.4, 0.44][st]), st0 = gy - shh; K.wall(S, sx, st0, sw, shh, ['sand', 8, 'plaster']); K.roof(S, sx - 1, st0, sw + 2, Math.round(sw * 0.3), 'gable', st >= 3 ? 'tile' : 'wood', 5);
  const bays = 3; for (let i = 0; i < bays; i++) { const bx = sx + 3 + i * Math.round((sw - 6) / bays); S.beg(); S.rect(bx, gy - 9, 6, 9, 'night', 1); S.hl(bx, gy - 5, 6, 'wood', 6); S.rect(bx, gy - 5, 6, 5, 'wood', 4); S.end(); G.an.push((D, t) => { const nod = Math.sin(t * 1.3 + i * 2) > 0.6 ? 1 : 0; D.lay('wall'); D.rect(bx + 1, gy - 9 + nod, 4, 3, ['hair', 'linen', 'leather'][i % 3], 5); D.px(bx + 4, gy - 8 + nod, 'ink', 1); }); }
  if (st >= 2) { const tx = sx + (sw >> 1); S.lay('back'); S.beg(); S.rect(tx - 3, st0 - Math.round(sw * 0.3) - 7, 6, 8, 'wood', 5); S.end(); K.roof(S, tx - 4, st0 - Math.round(sw * 0.3) - 7, 8, 5, 'cone', 'tile', 6); }
  // the jousting list: a striped barrier along the front, the knight galloping its length with his lance
  S.lay('front'); S.beg(); S.hl(L - 2, gy - 6, sx - L, 'linen', 8); for (let x = L - 2; x < sx - 2; x += 4) { S.vl(x, gy - 6, 6, 'wood', 5); S.hl(x, gy - 6, 2, 'tile', 8); } S.end();
  G.an.push((D, t) => { const q = (Math.sin(t * 0.8) + 1) / 2, dir = Math.cos(t * 0.8) > 0 ? 1 : -1, x = Math.round(L + 4 + q * (sx - L - 12)), gait = Math.floor(t * 8) % 2 ? 1 : 0; D.lay('mid'); horse(D, x, gy - 1, dir, 'linen', gait); D.px(x, gy - 13, st >= 3 ? 'gold' : 'iron', 9); D.rect(x - 1, gy - 12, 3, 4, 'tile', 7); D.line(x + dir, gy - 11, x + dir * 12, gy - 13, 'wood', 8); D.px(x + dir * 12, gy - 13, 'iron', 10); });
  K.flag(S, G, L - 2, gy - 6, Math.round(h * 0.5), 'tile'); if (st >= 2) K.flag(S, G, sx - 3, gy - 6, Math.round(h * 0.5), 'gold');
  if (st >= 3) { S.lay('back'); S.beg(); S.box(L - 1, gy - 18, 14, 2, 'wood', 6, { top: 1 }); S.vl(L, gy - 16, 10, 'wood', 5); S.vl(L + 12, gy - 16, 10, 'wood', 5); for (let x = L; x < L + 13; x += 2) S.px(x, gy - 19, x % 4 ? 'tile' : 'gold', 9); S.end(); K.bannerV(S, sx + 2, st0 + 2, 10, 'tile', 'shield'); K.bannerV(S, sx + sw - 6, st0 + 2, 10, 'gold', 'shield'); }
  worker(G, R + 4, -1, 'guard'); G.fx = { x: sx + (sw >> 1), y: st0 - 6 };
}, sfx: (d) => SN.snd(S => { [0, 0.12, 0.24, 0.36, 0.48].forEach(a => S.tone(180, 0.05, 'square', 0.04, -40, d + a)); S.tone(392, 0.5, 'sawtooth', 0.05, 0, d + 0.7); S.noise(0.2, 0.1, 1500, d + 0.7); }) });

// ───────── 圣光礼拜堂 ev_pal2: a gothic chapel — steep stone roof, a tall pointed window of stained glass glowing gold, a bell spire ─────────
BS('ev_pal2', { kind: 'holy', col: '#ffe8a0', look: 'mage', icon: 'sun', pillarC: '#fff4c0', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const nw = Math.round(w * 0.5), nx = cx - (nw >> 1) - 4, nh = Math.round(h * [0, 0.46, 0.52, 0.56][st]), nt = gy - nh; K.wall(S, nx, nt, nw, nh, ['bone', 7, 'ashlar']);
  const rh = Math.round(nw * 0.75); S.beg(); S.poly([[nx - 2, nt + 1], [nx + nw / 2, nt - rh], [nx + nw + 2, nt + 1]], 'iron', 5); for (let k = 3; k < rh; k += 3) { const hw = (nw / 2 + 2) * (1 - k / rh); S.hl(nx + nw / 2 - hw, nt - k, hw * 2, 'iron', 3.5); } S.end();
  // the great lancet window: a pointed arch of coloured panes, lit from within, tracery lines
  const ww = Math.round(nw * 0.42), wx = nx + (nw >> 1) - (ww >> 1), wh = Math.round(nh * 0.62), wy = nt + 4, lw = sc.light({ x: wx + ww / 2, y: wy + wh / 2, z: 8, r: ww * 2.5, i: 1.1, c: '#ffe0a0', fl: 'candle', tint: 0.55 });
  S.beg(); for (let y = wy; y < wy + wh; y++) for (let x = wx; x < wx + ww; x++) { const u = (x + 0.5 - wx - ww / 2) / (ww / 2), top = wy + Math.round((ww / 2) * (1 - Math.sqrt(Math.max(0, 1 - Math.abs(u)))) * 1.4); if (y < top) continue; const col = ['gold', 'crimson', 'tile', 'leaf'][((x >> 1) + (y >> 1)) % 4]; S.px(x, y, col, 9, { e: lw + 1 }); } for (let y = wy + 2; y < wy + wh; y += 4) S.hl(wx, y, ww, 'stone', 5); S.vl(wx + (ww >> 1), wy + 2, wh - 2, 'stone', 5); S.end();
  K.door(S, nx + (nw >> 1) - 3, gy - 8, 6, 8, K.tier('medieval', 2), 2);
  // buttresses (2+) and the bell spire on the right, a gold spire at 3
  if (st >= 2) { S.beg(); [nx - 3, nx + nw].forEach(x => S.poly([[x, gy], [x, nt + 6], [x + 3, nt + 10], [x + 3, gy]], 'bone', 6)); S.end(); }
  const tx = nx + nw + 4, tw = 8, th = Math.round(h * [0, 0.6, 0.72, 0.8][st]), tt = gy - th; K.wall(S, tx, tt, tw, th, ['bone', 8, 'ashlar']); S.beg(); S.rect(tx + 2, tt + 3, 4, 6, 'night', 1); S.end(); P.bell(S, G, tx + 4, tt + 10);
  K.roof(S, tx - 1, tt, tw + 2, Math.round(h * 0.3), 'cone', st >= 3 ? 'gold' : 'iron', st >= 3 ? 7 : 5); S.beg(); S.vl(tx + 4, tt - Math.round(h * 0.3) - 4, 4, 'gold', 10, { e: 255 }); S.hl(tx + 3, tt - Math.round(h * 0.3) - 3, 3, 'gold', 9, { e: 255 }); S.end();
  if (st >= 3) { const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.4); }); sc.emit({ k: 'glint', x: nx + nw / 2, y: wy + wh / 2, rate: 1.5, sp: 6, ang: 0, spread: 3, life: 1, w: ww }); [nx - 5, tx + tw + 3].forEach(x => K.lantern(S, sc, x, gy - 14, { c: '#ffe0a0' })); }
  worker(G, L - 2, 1, 'staff'); G.fx = { x: wx + (ww >> 1), y: wy + (wh >> 1) };
} });
})();
