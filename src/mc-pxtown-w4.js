// ==== mc-pxtown-w4.js ====
(function () {
// Pixel town wonders, one at a time — batch 4: 大本钟 · 布达拉宫 (designs in the town plan).
// Painted at st 1 (whole) · 2 (grown) · 3 (the top tier). PT.wonderBS: mc-pxtown-w1.js.
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT || !PT.wonderBS) return;
const { TX, n1 } = X, H = PT.H, K = PT.K, P = PT.P, SN = PT.SND, once = PT.once, steps = H.steps, WB = PT.wonderBS;
const fireworks = (G, x, y, cols, per) => G.an.push((D, t) => { const c = steps(t, per || 3.7); if (c > 0.35) return; const q = c / 0.35, r = Math.round(q * 11); D.lay('front'); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; D.px(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r * 0.8), cols[k % cols.length], 11 - Math.round(q * 6), { e: 255 }); } });

// ───────── 大本钟 bigben: a gothic square tower of vertical tracery, the lit clock faces, a pinnacled iron spire, the palace wing at its foot ─────────
WB('bigben', { kind: 'trade', col: '#ffe0a0', look: 'keeper', icon: 'coin', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  const tw = Math.round(w * 0.44), tx = cx - (tw >> 1) + 4, ct = gy - Math.round(h * 0.66), T = K.tier('steam', 2);
  // the palace wing: a gothic range with pinnacles and tall windows, running off to the left
  const pw = tx - L + 4, ph = Math.round(h * 0.2); K.wall(S, L - 4, gy - ph, pw, ph, ['sand', 7, 'ashlar']); S.beg(); for (let x = L - 3; x < tx - 2; x += 5) { S.vl(x, gy - ph - 5, 5, 'sand', 8); S.px(x, gy - ph - 6, 'sand', 9); } S.hl(L - 4, gy - ph, pw, 'sand', 9); S.end(); for (let x = L; x < tx - 4; x += 5) K.win(S, sc, x, gy - ph + 3, 2, Math.round(ph * 0.6), T, { deco: '', sill: false, lit: st >= 2 || x % 2 === 0, i: 0.4, c: '#ffe0a0' });
  // the shaft: sand stone, vertical tracery panels, small lit windows up its length
  S.lay('wall'); S.beg(); S.rect(tx, ct, tw, gy - ct, 'sand', 7); for (let x = tx + 2; x < tx + tw - 1; x += 3) S.vl(x, ct, gy - ct, 'sand', 5.5); S.vl(tx, ct, gy - ct, 'sand', 9); S.vl(tx + tw - 1, ct, gy - ct, 'sand', 4); for (let y = ct + 8; y < gy; y += 10) S.hl(tx, y, tw, 'sand', 8.5); S.end();
  for (let y = ct + 10; y < gy - 10; y += 10) K.win(S, sc, cx + 3, y, 2, 5, T, { deco: '', sill: false, lit: st >= 2 || y % 20 === 0, i: 0.35, c: '#ffe0a0' });
  // the clock stage: wider, the great lit face with its hands, gilded frame; the belfry above with its arches
  const cw = tw + 4, cx0 = tx - 2, cy1 = ct, cy0 = ct - Math.round(tw * 1.1); K.wall(S, cx0, cy0, cw, cy1 - cy0, ['sand', 8, 'ashlar']); S.beg(); S.box(cx0 - 1, cy1 - 2, cw + 2, 2, 'sand', 9, { top: 1 }); S.end();
  const r = Math.round(tw * 0.36), fyc = cy0 + Math.round((cy1 - cy0) / 2), lc = sc.light({ x: tx + tw / 2, y: fyc, z: 8, r: r * 3, i: st >= 3 ? 1.3 : 0.9, c: '#fff0c0', tint: 0.4 }); S.beg(); S.rect(tx + (tw >> 1) - r - 2, fyc - r - 2, r * 2 + 5, r * 2 + 5, st >= 3 ? 'gold' : 'brass', 7); S.ell(tx + (tw >> 1) + 0.5, fyc + 0.5, r, r, 'paper', 10, { e: lc + 1 }); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(tx + (tw >> 1) + Math.round(Math.cos(a) * (r - 1)), fyc + Math.round(Math.sin(a) * (r - 1)), 'ink', 2); } S.end();
  G.an.push((D, t) => { const hx = tx + (tw >> 1), a = t * 0.25 - Math.PI / 2, b = t * 0.02 - Math.PI / 2; D.lay('wall'); D.line(hx, fyc, hx + Math.round(Math.cos(a) * (r - 2)), fyc + Math.round(Math.sin(a) * (r - 2)), 'ink', 1); D.line(hx, fyc, hx + Math.round(Math.cos(b) * (r - 3)), fyc + Math.round(Math.sin(b) * (r - 3)), 'ink', 2); });
  const by0 = cy0 - Math.round(tw * 0.6); K.wall(S, tx, by0, tw, cy0 - by0, ['sand', 7, 'ashlar']); S.beg(); for (let x = tx + 2; x < tx + tw - 2; x += 4) S.rect(x, by0 + 3, 2, cy0 - by0 - 5, 'night', 2); S.end();
  // the spire: a steep iron pyramid, corner pinnacles (gold at 3), a lantern, the finial
  const sh = Math.round(h * 0.26); S.beg(); S.poly([[tx - 1, by0], [cx + 4 + 0.5, by0 - sh], [tx + tw + 1, by0]], 'iron', 5); for (let k = 3; k < sh; k += 3) { const hw = (tw / 2 + 1) * (1 - k / sh); S.hl(tx + tw / 2 - hw, by0 - k, hw * 2, 'iron', 3.5); } S.end();
  S.beg(); [tx - 1, tx + tw].forEach(x => { S.vl(x, by0 - 8, 8, st >= 3 ? 'gold' : 'iron', st >= 3 ? 9 : 7); S.px(x, by0 - 9, st >= 3 ? 'gold' : 'iron', 10); }); const ll = sc.light({ x: tx + tw / 2, y: by0 - sh * 0.4, z: 8, r: 12, i: 0.8, c: '#fff0c0', tint: 0.3 }); S.rect(tx + (tw >> 1) - 1, by0 - Math.round(sh * 0.45), 3, 3, 'lamp', 10, { e: ll + 1 }); S.vl(tx + (tw >> 1), by0 - sh - 5, 5, 'gold', 10); S.end();
  if (st >= 2) { K.flag(S, G, L - 3, gy - ph - 5, 12, 'crimson'); for (let x = L; x < tx - 2; x += 8) K.lantern(S, sc, x, gy - 6, { c: '#ffe0a0' }); }
  if (st >= 3) { fireworks(G, L + 8, by0 - 6, ['red', 'gold', 'linen'], 3.1); fireworks(G, R + 2, by0 + 10, ['tile', 'gold', 'pink'], 3.7); }
  G.fx = { x: tx + (tw >> 1), y: fyc };
}, sfx: (d) => SN.snd(S => { [0, 0.45, 0.9, 1.35].forEach((a, i) => { S.tone([330, 262, 294, 196][i], 1.1, 'sine', 0.08, 0, d + a); S.tone([660, 524, 588, 392][i], 0.7, 'sine', 0.03, 0, d + a); }); }) });

// ───────── 布达拉宫 potala: battered white walls climbing the hill with zig-zag stairs, the red palace in the middle, golden roofs on top ─────────
WB('potala', { kind: 'holy', col: '#ffd070', look: 'mage', icon: 'sun', paint(S, sc, G, st) {
  const { L, R, cx, gy, w, h } = G;
  // the hill
  S.lay('back'); S.beg(); S.poly([[L - 8, gy], [L - 2, gy - h * 0.12], [R + 2, gy - h * 0.12], [R + 8, gy]], 'rock', 6); S.noise(L - 6, gy - Math.round(h * 0.32), w + 12, Math.round(h * 0.32), 1, 3, 47); for (let i = 0; i < 20; i++) S.hl(L + (i * 13) % w, gy - 3 - (i * 7) % Math.round(h * 0.28), 3, 'moss', 6); S.end();
  // a battered wall block with rows of trapezoid black-framed windows
  const block = (x0, x1, y0, y1, m, t, lay) => { S.lay(lay || 'wall'); S.beg(); const bat = Math.round((y1 - y0) * 0.08); S.poly([[x0 - bat, y1], [x0, y0], [x1, y0], [x1 + bat, y1]], m, t); S.hl(x0, y0, x1 - x0, m, t + 1.5); S.hl(x0, y0 + 2, x1 - x0, 'crimson', 4); S.end();
    for (let y = y0 + 7; y < y1 - 5; y += 10) for (let x = x0 + 4; x < x1 - 4; x += 8) { const lit = st >= 2 ? (x * 3 + y) % 4 !== 0 : (x * 3 + y) % 3 === 0; S.beg(); S.rect(x - 1, y - 1, 4, 5, 'ink', 1); S.rect(x, y, 2, 3, lit ? 'lamp' : 'night', lit ? 8 : 2, lit ? { e: 255 } : null); S.end(); } };
  const baseY = gy - Math.round(h * 0.05);
  block(L + 4, cx - Math.round(w * 0.1), baseY - Math.round(h * 0.46), baseY, 'bone', 9); block(cx + Math.round(w * 0.1), R - 4, baseY - Math.round(h * 0.4), baseY, 'bone', 9); block(L - 2, L + Math.round(w * 0.2), baseY - Math.round(h * 0.2), baseY, 'bone', 8, 'mid'); block(R - Math.round(w * 0.18), R + 2, baseY - Math.round(h * 0.16), baseY, 'bone', 8, 'mid');
  // the zig-zag stairs up the white walls
  S.lay('mid'); S.beg(); let sx = L + 6, sy = gy - 2; for (let k = 0; k < 5; k++) { const nx = k % 2 ? L + 6 : L + Math.round(w * 0.3), ny = sy - Math.round(h * 0.08); S.line(sx, sy, nx, ny, 'bone', 8, { w: 2 }); S.line(sx, sy + 2, nx, ny + 2, 'stone', 5); sx = nx; sy = ny; } S.end();
  // the red palace in the middle, higher, with a big hanging (the thangka) down its front
  const rx0 = cx - Math.round(w * 0.14), rx1 = cx + Math.round(w * 0.14), rt = baseY - Math.round(h * 0.8); block(rx0, rx1, rt, baseY, 'crimson', 5); S.lay('wall'); S.beg(); S.rect(cx - 3, rt + 6, 7, Math.round(h * 0.18), 'gold', 6); S.hl(cx - 3, rt + 6, 7, 'gold', 9); S.vl(cx, rt + 8, Math.round(h * 0.16), 'crimson', 6); S.end();
  // the golden roofs: little pavilions with upturned eaves and finials
  const lg = st >= 3 ? sc.light({ x: cx, y: rt - 6, z: 16, r: w * 0.4, i: 1, c: '#ffd050', fl: 'pulse', amp: 0.15, sp: 0.9, tint: 0.4 }) : -1;
  [cx - 10, cx, cx + 10].forEach((x, i) => { const y = rt - (i === 1 ? 4 : 1); S.lay('back'); S.beg(); S.rect(x - 4, y - 3, 8, 3, 'crimson', 5); S.poly([[x - 7, y - 3], [x - 4, y - 7], [x + 4, y - 7], [x + 7, y - 3], [x + 6, y - 2], [x - 6, y - 2]], 'gold', 7, lg >= 0 ? { e: lg + 1 } : null); S.hl(x - 4, y - 7, 8, 'gold', 10); S.vl(x, y - 11, 4, 'gold', 9); S.px(x, y - 12, 'gold', 11, { e: 255 }); S.end(); });
  // prayer flags strung from the roofs (2+), butter lamps along the walls (3)
  if (st >= 2) { S.lay('front'); S.beg(); [[cx - 10, rt - 9, L + 4, baseY - Math.round(h * 0.26)], [cx + 10, rt - 9, R - 4, baseY - Math.round(h * 0.24)]].forEach(([x0, y0, x1, y1]) => { for (let i = 0; i <= 14; i++) { const q = i / 14, x = Math.round(x0 + (x1 - x0) * q), y = Math.round(y0 + (y1 - y0) * q + Math.sin(q * Math.PI) * 4); S.px(x, y, 'ink', 2); if (i % 2) S.rect(x, y + 1, 2, 2, ['tile', 'linen', 'red', 'leaf', 'gold'][i % 5], 8); } }); S.end(); }
  if (st >= 3) G.an.push((D, t) => { D.lay('front'); for (let x = L + 4; x < R - 4; x += 4) if (Math.sin(t * 3 + x) > -0.6) D.px(x, baseY - 1, 'lamp', 10 + (Math.sin(t * 5 + x) > 0.5 ? 1 : 0), { e: 255 }); });
  G.fx = { x: cx, y: rt - 12 };
}, sfx: (d) => SN.snd(S => { S.tone(98, 1.6, 'sawtooth', 0.05, -3, d); S.tone(147, 1.6, 'sawtooth', 0.03, -3, d); SN.bell(d + 1, 0.8); }) });
})();
