// ==== mc-pxtown-r7.js ====
(function () {
// Pixel town, one building at a time — batch 7: 奥术尖塔 · 高德院 · 石墙 · 防御罩 · 生命古树 (designs in the town plan).
// Painted at st 1 (a whole building) · 2 (grown) · 3 (the top tier).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.bespoke) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, BS = PT.bespoke, once = PT.once, steps = H.steps;
const near = (G) => G.s >= 0.8, worker = (G, x, dir, act) => { if (near(G)) G.workers.push({ x, dir, act }); };

// ───────── 奥术尖塔 spire: a twisted crystal needle growing out of a violet stone base, shards floating round it ─────────
BS('spire', { kind: 'arcane', col: '#b89cff', look: 'mage', icon: 'star', pillarC: '#d8c0ff', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const bw = Math.round(w * 0.5), bh = Math.round(h * 0.2); S.lay('wall'); S.beg(); S.poly([[cx - (bw >> 1) - 3, gy], [cx - (bw >> 1), gy - bh], [cx + (bw >> 1), gy - bh], [cx + (bw >> 1) + 3, gy]], 'magic', 5); S.end(); S.beg(); TX.ashlar(S, cx - (bw >> 1), gy - bh, bw, bh, 'magic', 6, { bh: 4 }); S.box(cx - (bw >> 1) - 1, gy - bh - 2, bw + 2, 2, 'magic', 8, { top: 1 }); S.end();
  const lc = sc.light({ x: cx, y: gy - h * 0.5, z: 12, r: 40 + st * 8, i: 1.1, c: '#b89cff', fl: 'pulse', amp: 0.18, sp: 1.3, tint: 0.55 });
  // the needle: a stack of offset crystal slabs that twist as they climb, a lit face and a shaded face, a white core line
  const needle = (x, base, len, wd, m) => { S.lay('mid'); S.beg(); for (let k = 0; k < len; k++) { const q = k / len, hw = Math.max(0.5, wd * (1 - q) * (1 - q * 0.3)), off = Math.round(Math.sin(q * 5) * 1.5), y = base - k; S.rect(Math.round(x + off - hw), y, Math.max(1, Math.round(hw)), 1, m, 8 + (k % 6 === 0 ? 1 : 0), { e: lc + 1 }); S.rect(Math.round(x + off), y, Math.max(1, Math.round(hw)), 1, m, 5, { e: lc + 1 }); if (k % 4 === 0) S.px(Math.round(x + off), y, m, 11, { e: 255 }); } S.end(); };
  const nl = Math.round(h * [0, 0.72, 0.95, 1.08][st]); needle(cx, gy - bh - 2, nl, Math.max(3, w * 0.08), 'arcane');
  if (st >= 3) { needle(cx - 8, gy - bh - 2, Math.round(nl * 0.6), 2.5, 'magic'); needle(cx + 8, gy - bh - 2, Math.round(nl * 0.55), 2.5, 'magic'); }
  // shards orbiting (more by stage); a ring of runes at 2+, gold at 3; a beam from the tip at 3
  const n = 2 + st * 2; G.an.push((D, t, s) => { for (let i = 0; i < n; i++) { const a = t * (0.6 + (s.st.emb || 0)) + i * Math.PI * 2 / n, x = cx + Math.round(Math.cos(a) * (8 + (i % 3) * 3)), y = gy - bh - Math.round(nl * (0.25 + (i % 4) * 0.15)) + Math.round(Math.sin(a) * 2); D.lay(Math.sin(a) > 0 ? 'front' : 'back'); D.px(x, y, 'arcane', 10, { e: 255 }); D.px(x, y + 1, 'arcane', 7, { e: 255 }); } });
  if (st >= 2) G.an.push((D, t) => { const y = gy - bh - Math.round(nl * 0.55), r = 9; D.lay('front'); for (let k = 0; k < 14; k++) { const a = t * 1.2 + k * 0.45, sn = Math.sin(a); if (sn < -0.1) continue; D.px(cx + Math.round(Math.cos(a) * r), y + Math.round(sn * 2), st >= 3 ? 'gold' : 'arcane', 10, { e: 255 }); } });
  if (st >= 3) { const Gp = G; G.an.push(() => { Gp.pillar = Math.max(Gp.pillar || 0, 0.45); }); P.circle(S, sc, G, cx, gy, 10); }
  [cx - (bw >> 1) - 4, cx + (bw >> 1) + 4].forEach(x => P.crystal(S, sc, G, x, gy, 5 + st, 'arcane')); worker(G, R + 3, -1, 'staff'); G.fx = { x: cx, y: gy - bh - nl };
}, sfx: (d) => PT.SND.shimmer(d + 0.2, 1.2) });

// ───────── 高德院 kotoku: the great seated bronze Buddha on an open stone terrace, stone lanterns, a pine, incense ─────────
BS('kotoku', { kind: 'holy', col: '#9af0c8', look: 'mage', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  S.lay('wall'); S.beg(); S.box(L + 2, gy - 3, w - 4, 3, 'stone', 6, { top: 1 }); S.end();
  // the gate roof behind (2+) and the halo (3)
  const bh = Math.round(h * [0, 0.72, 0.86, 0.96][st]), bw = Math.round(bh * 0.72), by = gy - 3;
  if (st >= 2) { S.lay('back'); S.beg(); S.rect(cx - Math.round(w * 0.42), by - Math.round(bh * 0.6), 3, Math.round(bh * 0.6), 'crimson', 5); S.rect(cx + Math.round(w * 0.42) - 3, by - Math.round(bh * 0.6), 3, Math.round(bh * 0.6), 'crimson', 4); S.poly([[cx - Math.round(w * 0.5), by - Math.round(bh * 0.6)], [cx - Math.round(w * 0.44), by - Math.round(bh * 0.72)], [cx + Math.round(w * 0.44), by - Math.round(bh * 0.72)], [cx + Math.round(w * 0.5), by - Math.round(bh * 0.6)]], 'iron', 4); S.end(); }
  if (st >= 3) { const lh = sc.light({ x: cx, y: by - bh * 0.78, z: 4, r: bw * 1.2, i: 1, c: '#ffe070', fl: 'pulse', amp: 0.15, sp: 0.8, tint: 0.5 }); S.lay('back'); S.beg(); S.ell(cx + 0.5, by - bh * 0.72, bw * 0.55, bw * 0.55, 'gold', 8, { e: lh + 1 }); S.ell(cx + 0.5, by - bh * 0.72, bw * 0.45, bw * 0.45, 'gold', 5, { e: lh + 1 }); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(cx + Math.round(Math.cos(a) * bw * 0.5), Math.round(by - bh * 0.72 + Math.sin(a) * bw * 0.5), 'gold', 11, { e: 255 }); } S.end(); }
  // the Buddha: a lotus base, the folded legs, the robe, hands in the lap, the head with its curls, a green-bronze patina
  const m = 'teal', lb = sc.light({ x: cx - bw * 0.3, y: by - bh * 0.6, z: 30, r: bh * 1.3, i: 0.7, c: '#dff0ff', tint: 0.3 }); S.lay('mid'); S.beg();
  S.ell(cx + 0.5, by - 2, bw * 0.55, 3, 'copper', 5); S.ell(cx + 0.5, by - Math.round(bh * 0.16), bw * 0.5, bh * 0.14, m, 5, { dome: 1 });
  S.poly([[cx - bw * 0.42, by - bh * 0.18], [cx - bw * 0.3, by - bh * 0.62], [cx + bw * 0.3, by - bh * 0.62], [cx + bw * 0.42, by - bh * 0.18]], m, 6); for (let k = 1; k < 4; k++) S.line(cx - bw * 0.36 + k * bw * 0.06, by - bh * 0.2, cx - bw * 0.26 + k * bw * 0.04, by - bh * 0.6, m, 4);
  S.ell(cx + 0.5, by - bh * 0.3, bw * 0.16, bh * 0.07, m, 7, { dome: 1 }); S.rect(cx - Math.round(bw * 0.12), Math.round(by - bh * 0.7), Math.round(bw * 0.24) + 1, Math.round(bh * 0.1), m, 6);
  S.ell(cx + 0.5, by - bh * 0.8, bw * 0.17, bh * 0.12, m, 7, { dome: 1 }); for (let k = -2; k <= 2; k++) S.px(cx + Math.round(k * bw * 0.06), Math.round(by - bh * 0.92), m, 8); S.px(cx, Math.round(by - bh * 0.97), m, 9); S.hl(cx - 2, Math.round(by - bh * 0.8), 2, 'ink', 2); S.hl(cx + 1, Math.round(by - bh * 0.8), 2, 'ink', 2); S.px(cx, Math.round(by - bh * 0.74), 'gold', 9, { e: 255 });
  S.end(); S.noise(Math.round(cx - bw * 0.5), Math.round(by - bh), Math.round(bw), Math.round(bh), 1, 3, 17);
  // stone lanterns, the pine, the incense burner and its smoke
  [L + 3, R - 3].forEach((x, i) => { const li = sc.light({ x, y: gy - 10, z: 8, r: 14, i: 0.7, c: '#ffc070', fl: 'candle', ph: i * 2, tint: 0.5 }); S.lay('front'); S.beg(); S.vl(x, gy - 7, 4, 'stone', 6); S.box(x - 2, gy - 11, 5, 4, 'stone', 7); S.px(x, gy - 9, 'lamp', 10, { e: li + 1 }); S.poly([[x - 3, gy - 11], [x + 0.5, gy - 14], [x + 4, gy - 11]], 'stone', 6); S.end(); });
  S.lay('back'); S.beg(); S.vl(L + 9, gy - 16, 16, 'wood', 4); [[L + 5, gy - 16], [L + 12, gy - 20], [L + 7, gy - 24]].forEach(([x, y]) => S.ell(x + 0.5, y, 4, 2, 'moss', 5, { dome: 1 })); S.end();
  S.lay('front'); S.beg(); S.box(cx - 3, gy - 6, 7, 3, 'brass', 7); S.vl(cx - 2, gy - 3, 3, 'brass', 5); S.vl(cx + 2, gy - 3, 3, 'brass', 5); S.end(); sc.emit({ k: 'steam', x: cx, y: gy - 8, rate: 0.8 + st * 0.3, sp: 3, ang: 0, spread: 0.2, life: 3, w: 2 });
  if (st >= 3) { sc.emit({ k: 'leaf', x: cx, y: gy - h, rate: 0.8, sp: 4, ang: 0.8, spread: 1, life: 3, w: w * 0.8 }); for (let i = 0; i < 4; i++) K.lantern(S, sc, L + 6 + i * Math.round((w - 12) / 3), gy - Math.round(bh * 0.66), { c: '#ff9a50' }); }
  worker(G, R + 4, -1, 'sweep'); G.fx = { x: cx, y: Math.round(by - bh * 0.8) };
} });

// ───────── 石墙 wall: the masons' yard — a treadwheel crane lifting a cut block onto a thick new wall, stones stacked, masons at work ─────────
BS('wall', { kind: 'war', col: '#ff7a5a', look: 'smith', icon: 'shield', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the new wall: big ashlar courses, its top ragged where the next blocks go (finished and crenellated at 3)
  const wx = cx - 4, ww = R - wx + 2, wh = Math.round(h * [0, 0.4, 0.52, 0.6][st]), wt = gy - wh; K.wall(S, wx, wt, ww, wh, ['stone', 6, 'ashlar']);
  if (st < 3) { S.beg(); for (let x = wx + ww - 10; x < wx + ww; x += 5) S.box(x, wt - 4, 4, 4, 'stone', 7, { top: 1 }); S.end(); } else P.merlons(S, wx, wx + ww, wt, 'stone', 8, true);
  K.flag(S, G, wx + ww - 3, wt - 2, 12, st >= 3 ? 'gold' : 'crimson');
  // the treadwheel crane: a great wooden wheel (a man walks in it), the jib reaching over the wall, a block on the rope
  const tr = Math.round(h * [0, 0.2, 0.23, 0.25][st]), tx = L + tr + 1, ty = gy - tr - 2; S.lay('back'); S.beg(); S.line(tx - tr, gy, tx, ty, 'wood', 5); S.line(tx + tr, gy, tx, ty, 'wood', 4); S.end();
  G.an.push((D, t, s) => { const a = t * 0.7; D.lay('mid'); D.ell(tx + 0.5, ty + 0.5, tr, tr, 'wood', 6, { ring: 2 }); for (let k = 0; k < 8; k++) { const an = a + k * Math.PI / 4; D.line(tx, ty, tx + Math.round(Math.cos(an) * (tr - 1)), ty + Math.round(Math.sin(an) * (tr - 1)), 'wood', 4); } D.px(tx, ty, 'iron', 7); const step = Math.floor(t * 3) % 2; D.px(tx, gy - 9, 'skin', 6); D.rect(tx - 1, gy - 8, 3, 4, 'denim', 5); D.px(tx - 1 + step, gy - 4, 'hair', 2); D.px(tx + 1 - step, gy - 4, 'hair', 2); });
  const jx = wx + Math.round(ww * 0.4), jt = gy - Math.round(h * (0.72 + st * 0.08)); S.lay('back'); S.beg(); S.line(tx, ty, jx, jt, 'wood', 6, { w: 2 }); S.line(tx + 2, gy, jx, jt, 'wood', 4); S.end();
  G.an.push((D, t) => { const up = Math.round((Math.sin(t * 0.7) + 1) * 3), by = wt - 10 + up; D.lay('back'); D.vl(jx, jt + 1, by - jt - 1, 'ink', 3); D.box(jx - 3, by, 7, 4, 'stone', 7, { top: 1 }); });
  // cut blocks stacked in the yard, the masons chipping (chips fly)
  S.lay('front'); S.beg(); [[cx - 14, 0], [cx - 9, 0], [cx - 12, 4]].forEach(([x, dy]) => S.box(x, gy - 4 - dy, 5, 4, 'stone', 7, { top: 1 })); S.end();
  G.an.push((D, t, s) => { if (steps(t, 1.1) < 0.08 && !s.st.ch) { s.st.ch = 1; s.burst('dust', wx - 2, gy - 6, 3, { sp: 14, ang: 0, spread: 2, life: 0.4 }); } if (steps(t, 1.1) > 0.3) s.st.ch = 0; });
  if (st >= 3) { const li = sc.light({ x: wx + ww / 2, y: wt - 14, z: 12, r: 20, i: 0.9, c: '#ffe070', fl: 'pulse', amp: 0.15, sp: 1, tint: 0.4 }); S.lay('front'); S.beg(); S.rect(wx + (ww >> 1) - 1, wt - 16, 3, 10, 'gold', 8, { e: li + 1 }); S.ell(wx + (ww >> 1) + 0.5, wt - 17, 1.6, 1.6, 'gold', 10); S.vl(wx + (ww >> 1) + 3, wt - 22, 16, 'gold', 9); S.end(); P.brazier(S, sc, G, wx + 3, wt - 1); for (let i = 0; i < 3; i++) K.lantern(S, sc, wx + 4 + i * Math.round(ww / 3), wt + 4); }
  worker(G, wx - 3, -1, 'hammer'); G.fx = { x: jx, y: wt - 10 };
}, sfx: (d) => SN.snd(S => { S.tone(70, 0.3, 'sine', 0.2, -20, d + 0.5); [0.8, 1.0, 1.2].forEach(a => S.noise(0.05, 0.1, 2500, d + a)); }) });

// ───────── 防御罩 dome: a projector pylon throwing a see-through teal dome of hexagons over its base; three pylons and pulses at 3 ─────────
BS('dome', { kind: 'power', col: '#4af0ff', look: 'keeper', icon: 'shield', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the base: a low armoured bunker with a lit slit; the pylons with emitter heads
  const bw = Math.round(w * 0.4); K.wall(S, cx - (bw >> 1), gy - 10, bw, 10, ['scifi', 6, 'panels']); K.roof(S, cx - (bw >> 1) - 1, gy - 10, bw + 2, 3, 'flat', 'scifi', 7); const lb = sc.light({ x: cx, y: gy - 6, z: 6, r: 14, i: 0.8, c: '#4af0ff', fl: 'screen', tint: 0.5 }); S.beg(); S.hl(cx - (bw >> 1) + 3, gy - 6, bw - 6, 'teal', 10, { e: lb + 1 }); S.end();
  const pylon = (x, ph) => { S.lay('mid'); S.beg(); S.box(x - 2, gy - 4, 5, 4, 'scifi', 5); S.vl(x - 1, gy - ph, ph - 4, 'scifi', 7); S.vl(x + 1, gy - ph, ph - 4, 'scifi', 5); for (let y = gy - ph + 3; y < gy - 4; y += 4) S.hl(x - 1, y, 3, 'teal', 7); S.ell(x + 0.5, gy - ph - 1, 2, 2, 'teal', 10, { e: 255 }); S.end(); return { x, y: gy - ph - 1 }; };
  const ps = st >= 3 ? [pylon(cx, Math.round(h * 0.5)), pylon(L + 4, Math.round(h * 0.34)), pylon(R - 4, Math.round(h * 0.34))] : [pylon(cx, Math.round(h * 0.45))];
  // the dome: a hex lattice clipped to a half ellipse, shimmering (a half dome at 1: its right half still building)
  const rx = Math.round(w * [0, 0.46, 0.54, 0.58][st]), ry = Math.round(h * [0, 0.62, 0.8, 0.9][st]), ld = sc.light({ x: cx, y: gy - ry * 0.5, z: 10, r: rx * 2, i: 0.6, c: '#4af0ff', fl: 'pulse', amp: 0.2, sp: 1.4, tint: 0.4 });
  G.an.push((D, t, s) => { const pulse = s.st.emb || 0, wave = steps(t, st >= 3 ? 1.6 : 3.2); D.lay('front'); for (let y = gy - ry; y < gy - 2; y++) for (let x = cx - rx; x <= cx + rx; x++) { const u = (x - cx) / rx, v = (gy - 2 - y) / ry, d = u * u + v * v; if (d > 1) continue; if (st === 1 && x > cx + Math.round(rx * (0.2 + 0.8 * steps(t, 5)))) continue;
      const edge = d > 0.9, hx = (x + (Math.floor(y / 4) % 2) * 3) % 6, hex = (y % 4 === 0 && hx < 4) || hx === 0; const ring = Math.abs(Math.sqrt(d) - wave) < 0.022 && (x + y) % 2 === 0;
      if (edge || ring || (hex && (x * 7 + y * 3 + Math.floor(t * 4)) % 9 === 0)) D.px(x, y, 'teal', edge ? 10 : ring ? 9 : 7, { e: 255 }); else if (pulse > 0.3 && hex) D.px(x, y, 'ice', 10, { e: 255 }); } s.mul[ld] = 1 + pulse * 2; });
  if (st >= 3) { K.flag(S, G, L + 1, gy, Math.round(h * 0.5), 'teal'); const lr = sc.light({ x: cx, y: gy - ry, z: 10, r: 14, i: 0.1, c: '#ff4040', tint: 0.4 }); G.beacon = { x: cx, y: gy - Math.round(h * 0.5) - 5, li: lr }; }
  worker(G, R + 4, -1, 'read'); G.fx = { x: cx, y: gy - ry };
}, sfx: (d) => SN.snd(S => { S.tone(220, 0.9, 'sine', 0.06, 440, d); S.tone(110, 1, 'triangle', 0.05, 0, d); }) });

// ───────── 生命古树 elder: a vast ancient tree — gnarled roots, two glowing eyes in its trunk, a shrine at its foot, fireflies ─────────
BS('elder', { kind: 'nature', col: '#c8ff9a', look: 'farmer', icon: 'leaf', plinth: 'earth', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const th = Math.round(h * [0, 0.45, 0.5, 0.55][st]), tw = Math.round(w * 0.18), cr = Math.round(w * [0, 0.44, 0.5, 0.54][st]), cy = gy - th - Math.round(cr * 0.45);
  // roots spreading into the ground, the trunk twisting up, bark lines
  S.lay('mid'); S.beg(); for (let k = -3; k <= 3; k++) { if (!k) continue; S.line(cx + k * 2, gy - 6, cx + k * Math.round(w * 0.09), gy - 1, 'wood', 4 + (k < 0 ? 1 : 0), { w: 2 }); } S.poly([[cx - tw, gy], [cx - tw * 0.6, gy - th], [cx + tw * 0.5, gy - th], [cx + tw, gy]], 'wood', 5); for (let k = 0; k < 5; k++) S.line(cx - tw * 0.8 + k * tw * 0.4, gy - 2, cx - tw * 0.5 + k * tw * 0.25, gy - th + 2, 'wood', k % 2 ? 3 : 6); S.end();
  // the crown: layered leaf clumps, lit from the upper left, dark underneath
  S.lay('back'); S.beg(); const clumps = [[0, 0, 1], [-0.55, 0.25, 0.62], [0.55, 0.22, 0.6], [-0.3, -0.35, 0.6], [0.35, -0.3, 0.58], [0, -0.6, 0.5]]; clumps.forEach(([dx, dy, r], i) => { const x = cx + dx * cr, y = cy + dy * cr * 0.7, rr = r * cr * 0.55; S.ell(x + 0.5, y, rr, rr * 0.75, 'leaf', 5 + (i % 3) * 0.5, { dome: 1 }); }); S.end(); S.noise(cx - cr, cy - cr, cr * 2, cr * 1.6, 1, 2, 23);
  // the eyes in the trunk, glowing and blinking now and then
  const le = sc.light({ x: cx, y: gy - th * 0.55, z: 6, r: 14, i: 0.8, c: '#c8ff9a', fl: 'pulse', amp: 0.3, sp: 0.7, tint: 0.5 }); G.an.push((D, t) => { const blink = steps(t, 6) < 0.03; D.lay('mid'); [-3, 2].forEach(dx => { D.px(cx + dx, gy - Math.round(th * 0.55), 'screen', blink ? 3 : 11, { e: blink ? 0 : 255 }); D.px(cx + dx + 1, gy - Math.round(th * 0.55), 'screen', blink ? 3 : 9, { e: blink ? 0 : 255 }); }); });
  // the little shrine at its foot, fireflies (more by stage)
  S.lay('front'); S.beg(); S.box(cx + tw + 2, gy - 6, 6, 6, 'wood', 5); S.poly([[cx + tw + 1, gy - 6], [cx + tw + 5, gy - 9], [cx + tw + 9, gy - 6]], 'crimson', 5); S.px(cx + tw + 5, gy - 3, 'lamp', 10, { e: 255 }); S.end();
  const nf = 3 + st * 3; G.an.push((D, t) => { for (let i = 0; i < nf; i++) { const a = t * 0.6 + i * 2.3; if (Math.sin(t * 3 + i * 1.7) < -0.3) continue; D.lay('front'); D.px(cx + Math.round(Math.cos(a) * cr * 0.9), cy + Math.round(Math.sin(a * 1.3) * cr * 0.5), 'screen', 11, { e: 255 }); } });
  if (st >= 2) { [cx - Math.round(cr * 0.6), cx + Math.round(cr * 0.5)].forEach(x => K.lantern(S, sc, x, cy + Math.round(cr * 0.3), { c: '#ffd070' })); const sx = cx - Math.round(cr * 0.3); G.an.push((D, t) => { const sw = Math.round(Math.sin(t * 1.5) * 3); D.lay('front'); D.line(sx, cy + Math.round(cr * 0.35), sx + sw, gy - 8, 'ink', 3); D.line(sx + 5, cy + Math.round(cr * 0.35), sx + 5 + sw, gy - 8, 'ink', 3); D.hl(sx + sw, gy - 8, 6, 'wood', 6); }); }
  if (st >= 3) { const lf = sc.light({ x: cx, y: cy, z: 10, r: cr * 1.6, i: 0.8, c: '#ffb0e0', fl: 'pulse', amp: 0.2, sp: 0.9, tint: 0 }); S.lay('back'); S.beg(); for (let i = 0; i < 18; i++) { const a = i * 2.4, r = cr * (0.3 + (i % 5) * 0.14); S.px(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r * 0.6), i % 3 ? 'pink' : 'gold', 10, { e: lf + 1 }); } S.end(); sc.emit({ k: 'soul', x: cx, y: cy, rate: 0.8, sp: 6, ang: 0, spread: 3, life: 2.4, w: cr }); }
  worker(G, L - 3, 1, 'work'); G.fx = { x: cx, y: cy - Math.round(cr * 0.4) };
} });
})();
