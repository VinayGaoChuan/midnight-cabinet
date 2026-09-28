// ==== mc-pxtown-r5.js ====
(function () {
// Pixel town, one building at a time — batch 5: 瞭望塔 · 脚手架厂 · 神殿 · 战鼓楼 · 水培农场 (designs in the town plan).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };

// ───────── 瞭望塔 watchtower: a slim round stone tower, a spire-roofed lookout with a great spyglass, a spiral stair ─────────
BS('watchtower', { kind: 'war', col: '#ffd070', look: 'keeper', icon: 'eye', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  if (st === 0) { const tx = cx - 4, th = Math.round(h * 0.9); P.tree(S, tx, gy, Math.round(h * 0.28), 'moss'); S.lay('mid'); S.beg(); S.box(tx - 8, gy - Math.round(th * 0.62), 17, 2, 'wood', 6, { top: 1 }); for (let x = tx - 8; x < tx + 9; x += 3) S.vl(x, gy - Math.round(th * 0.62) - 4, 4, 'wood', 5); S.hl(tx - 8, gy - Math.round(th * 0.62) - 4, 17, 'wood', 7); S.end();
    S.beg(); S.vl(tx + 10, gy - Math.round(th * 0.62), Math.round(th * 0.62), 'wood', 6); S.vl(tx + 13, gy - Math.round(th * 0.62), Math.round(th * 0.62), 'wood', 4); for (let y = gy - 3; y > gy - Math.round(th * 0.62); y -= 3) S.hl(tx + 10, y, 4, 'wood', 5); S.end(); G.fx = { x: tx, y: gy - Math.round(th * 0.62) - 6 }; worker(G, R + 3, -1, 'guard'); return; }
  const tw = Math.round(w * 0.24), tx = cx - (tw >> 1) - 4, th = Math.round(h * (st === 2 ? 1.08 : 0.92)), tt = gy - th;
  S.lay('wall'); S.beg(); S.cyl(tx, tt, tw, th, 'stone', 7, { rim: 2.5 }); for (let y = tt + 3; y < gy; y += 4) for (let x = tx + ((y >> 2) % 2) * 2; x < tx + tw; x += 4) S.px(x, y, 'stone', 4); S.end();
  // the spiral stair: steps winding round the outside, lit on the near side
  S.lay('mid'); S.beg(); for (let y = gy - 3, i = 0; y > tt + 10; y -= 2, i++) { const q = (i % 12) / 12, x = tx + Math.round((Math.sin(q * Math.PI * 2) * 0.5 + 0.5) * (tw - 3)); if (Math.cos(q * Math.PI * 2) > -0.2) S.hl(x, y, 3, 'wood', 6); } S.end();
  // the lookout: a ring of posts, a spire, the spyglass on its tripod sticking out
  const lh = 8, lt = tt - lh; S.lay('wall'); S.beg(); S.box(tx - 2, tt - 1, tw + 4, 2, 'stone', 8, { top: 1 }); S.rect(tx, lt, tw, lh - 1, 'night', 2); for (let x = tx; x < tx + tw; x += 3) S.vl(x, lt, lh, 'wood', 5); S.end(); K.roof(S, tx - 2, lt, tw + 4, Math.round(tw * 1.1), 'cone', 'tile', 6);
  const li = sc.light({ x: tx + tw / 2, y: lt + 4, z: 8, r: 14, i: 0.8, c: '#ffc070', fl: 'candle', tint: 0.5 }); S.beg(); S.px(tx + (tw >> 1), lt + 4, 'lamp', 10, { e: li + 1 }); S.end();
  S.lay('front'); S.beg(); S.line(tx + tw - 1, lt + 4, tx + tw + 9, lt - 1, 'brass', 8, { w: 2 }); S.px(tx + tw + 10, lt - 2, 'glass', 10, { e: 255 }); S.hl(tx + tw + 2, lt + 1, 3, 'brass', 6); S.end();
  K.door(S, tx + (tw >> 1) - 2, gy - 8, 5, 8, K.tier('medieval', 2), 2);
  if (st === 2) { P.brazier(S, sc, G, tx + (tw >> 1), lt - Math.round(tw * 1.1) - 1); const ls = sc.light({ x: tx - 3, y: tt + 10, z: 10, r: 20, i: 0.1, c: '#ffe0a0', tint: 0.4 }); G.an.push((D, t, s) => { const on = steps(t, 0.9) < 0.3 || s.st.cheer; D.lay('front'); D.rect(tx - 5, tt + 9, 3, 3, 'lamp', on ? 11 : 4, { e: 255 }); s.mul[ls] = on ? 8 : 0; }); S.lay('back'); S.beg(); S.hl(tx - 6, tt + 8, 5, 'iron', 5); S.end(); P.bell(S, G, R - 5, gy - 2); }
  S.lay('front'); S.beg(); S.box(R - 10, gy - 4, 8, 4, 'wood', 6, { top: 1 }); S.end(); worker(G, R + 3, -1, 'guard'); G.fx = { x: tx + (tw >> 1), y: lt - 4 };
} });

// ───────── 脚手架厂 scaffold: a tower crane over a brick tower forever being built, timber scaffold round it, a lumber yard ─────────
BS('scaffold', { kind: 'forge', col: '#ffd050', look: 'worker', icon: 'gear', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const lumber = (x, n) => { S.lay('front'); S.beg(); for (let i = 0; i < n; i++) { S.hl(x + (i % 2), gy - 1 - i * 2, 14, 'wood', 7 - (i % 2)); S.hl(x + (i % 2), gy - 2 - i * 2, 14, 'wood', 4); } S.end(); };
  if (st === 0) { lumber(L, 4); S.lay('mid'); S.beg(); S.line(cx, gy, cx + 4, gy - 22, 'wood', 6); S.line(cx + 8, gy, cx + 4, gy - 22, 'wood', 4); S.line(cx + 4, gy - 22, cx + 14, gy - 14, 'wood', 5); S.end(); G.an.push((D, t) => { const sw = Math.round(Math.sin(t * 1.3)); D.lay('mid'); D.vl(cx + 14, gy - 14, 6, 'ink', 3); D.box(cx + 12 + sw, gy - 8, 5, 3, 'wood', 6); });
    S.lay('front'); S.beg(); S.line(R - 12, gy, R - 9, gy - 5, 'wood', 5); S.line(R - 6, gy, R - 9, gy - 5, 'wood', 4); S.hl(R - 13, gy - 5, 10, 'wood', 7); S.end(); worker(G, R + 3, -1, 'hammer'); G.fx = { x: cx + 4, y: gy - 22 }; return; }
  // the brick tower rising, jagged at its unfinished top; the scaffold of poles and planks wrapped round it
  const bw = Math.round(w * 0.3), bx = L + 4, bh = Math.round(h * (st === 2 ? 0.8 : 0.6)), bt = gy - bh; S.lay('wall'); S.beg(); TX.bricks(S, bx, bt, bw, bh, 'brick', 5, { bw: 5, bh: 3, v: 1 }); for (let x = bx; x < bx + bw; x += 2) S.rect(x, bt - ((x * 7) % 4), 2, (x * 7) % 4, 'brick', 6); S.end();
  const T = K.tier('steam', 1); K.win(S, sc, bx + (bw >> 1) - 2, bt + 6, 4, 5, T, { deco: '', lit: st === 2 });
  S.lay('mid'); S.beg(); [bx - 2, bx + (bw >> 1), bx + bw + 1].forEach(x => S.vl(x, bt - 4, bh + 4, 'wood', 6)); for (let y = gy - 7; y > bt - 3; y -= 8) { S.hl(bx - 3, y, bw + 6, 'wood', 7); S.hl(bx - 3, y + 1, bw + 6, 'wood', 3); S.line(bx - 2, y, bx + (bw >> 1), y - 7, 'wood', 4); } S.end();
  // the tower crane: a lattice mast, the long jib and its counterweight, the trolley and hook with its load
  const mx = cx + Math.round(w * 0.12), mh = Math.round(h * (st === 2 ? 1.08 : 0.9)), mt = gy - mh, jl = Math.round(w * 0.55), cm = st === 2 ? 'gold' : 'brass';
  S.lay('back'); S.beg(); for (let y = gy - 1; y > mt; y--) { S.px(mx - 2, y, cm, 7); S.px(mx + 2, y, cm, 5); if ((gy - y) % 4 === 0) { S.line(mx - 2, y, mx + 2, y - 4, cm, 6); S.hl(mx - 2, y, 5, cm, 4); } } S.hl(mx - jl, mt, jl + 12, cm, 8); S.hl(mx - jl, mt + 2, jl + 12, cm, 5); for (let x = mx - jl; x < mx + 12; x += 3) S.line(x, mt + 2, x + 2, mt, cm, 6); S.box(mx + 7, mt + 1, 6, 5, 'stone', 5); S.line(mx, mt - 6, mx - jl + 2, mt, 'ink', 3); S.line(mx, mt - 6, mx + 10, mt, 'ink', 3); S.vl(mx, mt - 6, 6, cm, 7); S.box(mx - 3, mt + 3, 6, 4, 'glass', 6); S.end();
  G.an.push((D, t, s) => { const q = (Math.sin(t * 0.35) + 1) / 2, tx = Math.round(mx - jl + 4 + q * (jl - 10)), drop = 8 + Math.round((Math.sin(t * 0.7) + 1) * 4); D.lay('back'); D.box(tx - 2, mt + 2, 5, 2, 'iron', 6); D.vl(tx, mt + 4, drop, 'ink', 3); if (st === 2) { D.hl(tx - 6, mt + 4 + drop, 13, 'iron', 8); D.hl(tx - 6, mt + 5 + drop, 13, 'iron', 4); } else D.box(tx - 3, mt + 4 + drop, 7, 4, 'brick', 6); });
  if (st === 2) { const lb = sc.light({ x: mx, y: mt, z: 10, r: 20, i: 0.6, c: '#ffe080', fl: 'buzz', tint: 0.4 }); S.lay('front'); S.beg(); [mx - jl, mx - (jl >> 1), mx + 11].forEach(x => S.px(x, mt - 1, 'red', 10, { e: 255 })); S.px(mx, mt - 7, 'lamp', 11, { e: lb + 1 }); S.end(); }
  lumber(R - 14, st === 2 ? 5 : 3); worker(G, bx + bw + 6, 1, 'hammer'); G.fx = { x: mx, y: mt };
}, sfx: (d) => SN.snd(S => { S.tone(300, 0.5, 'sawtooth', 0.03, -80, d); [0.6, 0.8].forEach(a => { S.tone(200, 0.08, 'square', 0.07, -40, d + a); S.noise(0.05, 0.08, 2000, d + a); }); }) });

// ───────── 神殿 temple: a round colonnade under a dome, the sacred flame on its altar in the middle ─────────
BS('temple', { kind: 'holy', col: '#ffe8a0', look: 'mage', icon: 'sun', pillarC: '#fff4c0', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const lf = sc.light({ x: cx, y: gy - 12, z: 12, r: 36, i: 1.3, c: '#ffb050', fl: 'fire', tint: 0.6 });
  // steps and the round platform
  const pw = Math.round(w * [0.5, 0.74, 0.8][st]); S.lay('wall'); S.beg(); for (let k = 0; k < 3; k++) S.box(cx - (pw >> 1) + k * 3, gy - 2 - k * 2, pw - k * 6, 2, 'bone', 8 - k, { top: 1 }); S.end();
  // the altar and the flame
  const ay = gy - 7; S.lay('mid'); S.beg(); S.box(cx - 3, ay - 5, 7, 5, 'bone', 9); S.hl(cx - 3, ay - 3, 7, 'gold', 8); S.end(); G.an.push((D, t, s) => { D.lay('mid'); const big = s.st.emb > 0.5 ? 4 : 0; H.flame(D, cx, ay - 6, 7 + st + big, t, 1); H.flame(D, cx - 2, ay - 6, 4, t, 3); H.flame(D, cx + 2, ay - 6, 4, t, 5); });
  if (st === 0) { S.lay('front'); S.beg(); for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; S.box(cx + Math.round(Math.cos(a) * 12) - 1, gy - 7 + Math.round(Math.sin(a) * 3), 3, 5 + (i % 2) * 2, 'stone', 6); } S.end(); G.fx = { x: cx, y: ay - 12 }; worker(G, R + 3, -1, 'staff'); return; }
  // the colonnade: back columns dim, front columns bright; the ring beam; the dome (gilded at 2) and a figure on top
  const r = (pw >> 1) - 5, ch = Math.round(h * 0.44), ct = gy - 8 - ch, n = st === 2 ? 8 : 6;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.round(Math.cos(a) * r), front = Math.sin(a) > 0; S.lay(front ? 'front' : 'back'); S.beg(); S.cyl(x - 1, ct, 3, ch, 'bone', front ? 9 : 6, { rim: 2 }); S.box(x - 2, ct, 5, 1, 'bone', front ? 10 : 7); S.end(); }
  S.lay('wall'); S.beg(); S.box(cx - r - 3, ct - 3, (r + 3) * 2 + 1, 3, 'bone', 8, { top: 1 }); S.hl(cx - r - 3, ct - 1, (r + 3) * 2 + 1, st === 2 ? 'gold' : 'bone', st === 2 ? 9 : 6); S.end();
  const dt = K.roof(S, cx - r - 2, ct - 3, (r + 2) * 2 + 1, r + 2, 'dome', st === 2 ? 'gold' : 'tile', st === 2 ? 7 : 6);
  if (st === 2) { S.lay('wall'); S.beg(); S.rect(cx - 1, dt - 9, 3, 7, 'gold', 8); S.ell(cx + 0.5, dt - 10, 1.5, 1.5, 'gold', 10); S.line(cx + 1, dt - 7, cx + 4, dt - 11, 'gold', 9); S.end(); P.brazier(S, sc, G, cx - (pw >> 1) - 1, gy); P.brazier(S, sc, G, cx + (pw >> 1) + 1, gy); }
  worker(G, R + 4, -1, 'staff'); G.fx = { x: cx, y: ay - 12 };
}, show(s, o, G) { if (once(s, o, 'fl', 0)) s.st.emb = 3; } });

// ───────── 战鼓楼 wardrum: a massive stone base with an arched passage, an open timber hall on top, the great red drum ─────────
BS('wardrum', { kind: 'war', col: '#ff5a4a', look: 'keeper', icon: 'drum', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const drum = (x, y, r) => { S.lay('mid'); S.beg(); S.rect(x - r - 1, y - 1, 2, r * 2 + 2, 'wood', 4); S.rect(x + r, y - 1, 2, r * 2 + 2, 'wood', 4); S.end(); S.beg(); S.cyl(x - r, y, r * 2, r * 2, 'crimson', 6, { rim: 2 }); S.ell(x - r + 0.5, y + r, 1.5, r, 'linen', 9); for (let k = 0; k < r * 2; k += 3) { S.px(x - r + 1, y + k, 'gold', 9); S.px(x + r - 2, y + k, 'gold', 9); } S.end(); };
  const strikes = (x, y) => G.an.push((D, t, s) => { const hp = steps(t, s.st.cheer ? 0.4 : 1.4), up = hp < 0.5; D.lay('front'); D.line(x - 2, y + 3, x - 5, y + (up ? -3 : 3), 'wood', 7); D.px(x - 5, y + (up ? -4 : 3), 'crimson', 8); if (!up && !s.st.dh) { s.st.dh = 1; s.burst('dust', x, y + 3, 3, { sp: 10, ang: 0, spread: 3, life: 0.5 }); } if (up) s.st.dh = 0; });
  if (st === 0) { const dx = cx, dr = 6; S.lay('mid'); S.beg(); S.line(dx - 8, gy, dx - 3, gy - 10, 'wood', 5); S.line(dx + 8, gy, dx + 3, gy - 10, 'wood', 4); S.end(); drum(dx, gy - 16, dr); strikes(dx - 7, gy - 12); K.flag(S, G, L + 2, gy, Math.round(h * 0.7), 'crimson'); K.flag(S, G, R - 2, gy, Math.round(h * 0.7), 'crimson'); G.fx = { x: dx, y: gy - 16 }; worker(G, dx - 10, 1, 'work'); return; }
  // the base: big ashlar blocks battering out at the foot, an arched passage through
  const bw = Math.round(w * 0.74), bx = cx - (bw >> 1), bh = Math.round(h * 0.4), bt = gy - bh; S.lay('wall'); S.beg(); S.poly([[bx - 3, gy], [bx, bt], [bx + bw, bt], [bx + bw + 3, gy]], 'stone', 5); S.end(); S.beg(); TX.ashlar(S, bx, bt, bw, bh, 'stone', 6, { bh: 5 }); S.box(bx - 1, bt - 2, bw + 2, 2, 'stone', 8, { top: 1 }); S.end();
  S.beg(); const aw = 10, ah = Math.round(bh * 0.7); for (let y = gy - ah; y < gy; y++) for (let x = cx - (aw >> 1); x < cx + (aw >> 1); x++) { const u = (x + 0.5 - cx) / (aw / 2); if (y >= gy - ah + Math.round(5 * (1 - Math.sqrt(Math.max(0, 1 - u * u))))) S.px(x, y, 'night', 1); } S.end();
  // the hall on top: red lacquered posts, an open front, the drum inside, a sweeping roof (a second eave at 2)
  const hw = Math.round(bw * 0.72), hx = cx - (hw >> 1), hh = Math.round(h * 0.3), ht = bt - 2 - hh; S.lay('back'); S.beg(); S.rect(hx, ht, hw, hh, 'night', 2); S.end(); S.lay('mid'); S.beg(); [hx, hx + hw - 2, hx + Math.round(hw * 0.25), hx + Math.round(hw * 0.75)].forEach(x => S.rect(x, ht, 2, hh, 'crimson', 5)); S.hl(hx, bt - 3, hw, 'crimson', 3); S.end();
  drum(cx, ht + 2, Math.round(hh * 0.38)); strikes(cx - Math.round(hh * 0.38) - 3, ht + 4); if (st === 2) strikes(cx + Math.round(hh * 0.38) + 5, ht + 4);
  const eave = (a, b, y, rh) => { S.lay('wall'); S.beg(); S.poly([[a - 5, y - 1], [a + 2, y - rh], [b - 2, y - rh], [b + 5, y - 1], [b + 4, y + 1], [a - 4, y + 1]], 'iron', 4); S.hl(a + 2, y - rh, b - a - 4, 'iron', 6); S.px(a - 5, y - 2, 'iron', 7); S.px(b + 5, y - 2, 'iron', 7); for (let x = a; x < b; x += 3) S.vl(x, y - rh + 2, rh - 2, 'iron', 3); S.end(); };
  eave(hx, hx + hw, ht, 6); if (st === 2) { eave(hx + 3, hx + hw - 3, ht - 7, 5); S.lay('wall'); S.beg(); S.px(cx, ht - 13, 'gold', 10); S.vl(cx, ht - 12, 2, 'gold', 8); S.end(); [bx - 3, bx + bw + 2].forEach(x => K.flag(S, G, x, gy, Math.round(h * 0.95), 'crimson')); }
  K.lantern(S, sc, hx - 3, ht + 2, { c: '#ff8a50' }); K.lantern(S, sc, hx + hw + 2, ht + 2, { c: '#ff8a50' }); worker(G, R + 4, -1, 'guard'); G.fx = { x: cx, y: ht + 2 };
}, show(s, o, G, q) { [0.2, 0.5, 0.8].forEach((a, i) => { if (once(s, o, 'dr' + i, a)) { s.burst('dust', G.fx.x, G.fx.y + 8, 8 + q * 3, { sp: 26, ang: 0, spread: 3, life: 0.7 }); s.flash('all', 0.5); } }); },
  sfx: (d, q) => SN.snd(S => { [0.2, 0.5, 0.8].forEach(a => { S.tone(55, 0.35, 'sine', 0.22, -15, d + a); S.noise(0.1, 0.12, 200, d + a); }); }) });

// ───────── 水培农场 farm: an arched glass greenhouse glowing magenta with grow lights, rows of seedlings inside ─────────
BS('farm', { kind: 'nature', col: '#ff8ad8', look: 'farmer', icon: 'wheat', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const beds = (x0, x1, y, tiers) => { for (let k = 0; k < tiers; k++) { const yy = y - k * 7; S.beg(); S.box(x0, yy - 2, x1 - x0, 2, k ? 'iron' : 'wood', 5); for (let x = x0 + 1; x < x1 - 1; x += 2) { const hh = 2 + ((x * 7 + k) % 3); S.vl(x, yy - 2 - hh, hh, 'leaf', 6 + ((x + k) % 3)); if ((x * 5 + k) % 7 === 0) S.px(x, yy - 3 - hh, 'red', 8); } S.end(); } };
  if (st === 0) { S.lay('front'); beds(L, cx - 2, gy, 1); beds(cx + 2, R - 8, gy, 1); const li = sc.light({ x: cx, y: gy - 18, z: 10, r: 26, i: 0.8, c: '#ff70d0', fl: 'pulse', amp: 0.1, sp: 1, tint: 0.55 }); S.lay('mid'); S.beg(); S.vl(cx, gy - 18, 18, 'iron', 6); S.hl(cx - 5, gy - 19, 11, 'iron', 7); S.hl(cx - 4, gy - 18, 9, 'pink', 9, { e: li + 1 }); S.end(); K.barrel(S, R - 6, gy); worker(G, L - 2, 1, 'work'); G.fx = { x: cx, y: gy - 19 }; return; }
  // the hoop house: glass panes on curved ribs, magenta grow light inside, racks of seedlings; a second tier at 2
  const hw = Math.round(w * 0.84), hx = cx - (hw >> 1), hh = Math.round(h * 0.5), li = sc.light({ x: cx, y: gy - hh / 2, z: 6, r: hw * 0.7, i: 1.1, c: '#ff70d0', fl: 'pulse', amp: 0.08, sp: 0.8, tint: 0.6 });
  const hoop = (x0, w0, y0, hgt) => { S.lay('back'); S.beg(); for (let x = x0; x < x0 + w0; x++) { const u = (x + 0.5 - x0 - w0 / 2) / (w0 / 2), top = y0 - Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * hgt); for (let y = top; y < y0; y++) S.px(x, y, 'pink', (y - top) < 3 ? 7 : (y - top) % 7 < 2 ? 6 : 4, { e: li + 1 }); } S.end(); beds(x0 + 3, x0 + w0 - 3, y0, Math.max(1, Math.floor(hgt / 8)));
    S.lay('mid'); S.beg(); for (let x = x0; x < x0 + w0; x++) { const u = (x + 0.5 - x0 - w0 / 2) / (w0 / 2), top = y0 - Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * hgt); S.px(x, top, 'glass', 10); S.px(x, top + 1, 'glass', 8); if ((x - x0) % 6 === 0) S.vl(x, top, y0 - top, 'iron', 7); } for (let y = y0 - 5; y > y0 - hgt; y -= 6) S.hl(x0, y, w0, 'glass', 7); S.end(); };
  hoop(hx, hw, gy - 1, hh); if (st === 2) { hoop(hx + Math.round(hw * 0.2), Math.round(hw * 0.6), gy - hh + 2, Math.round(hh * 0.5)); P.windmill(S, G, R + 1, gy - 1, Math.round(h * 0.6), 7); S.lay('back'); S.beg(); S.cyl(L - 2, gy - Math.round(h * 0.7), 7, 8, 'wood', 5, { rim: 2 }); S.vl(L - 1, gy - Math.round(h * 0.62), Math.round(h * 0.62), 'wood', 4); S.vl(L + 3, gy - Math.round(h * 0.62), Math.round(h * 0.62), 'wood', 4); S.end(); }
  S.lay('front'); S.beg(); S.rect(cx - 3, gy - 9, 6, 9, 'glass', 6); S.vl(cx, gy - 9, 9, 'iron', 7); S.end(); K.barrel(S, R - 4, gy); K.sack(S, L - 3, gy);
  worker(G, R + 5, -1, 'work'); G.fx = { x: cx, y: gy - hh };
} });
})();
