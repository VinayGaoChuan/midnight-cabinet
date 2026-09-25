// ==== mc-pxroom-g.js ====
(function () {
// Pixel rooms, batch g (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 兵马俑 terracotta · 奥林匹亚宙斯神像 zeus · 高德院 kotoku · 圣索菲亚大教堂 hagia · 紫禁城 forbidden
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const ease = (a) => { a = clamp(a, 0, 1); return a * a * (3 - 2 * a); };

// ───────── shared bits ─────────
// cellular pixel fire (spreading heat) in a w×h box, stepped at 30 Hz; st is a per-fire state object
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 3 ? 7 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < cool ? 1 : 0)); }
  }
  return f;
}
function drawFire(D, f, w, h, x0, y0) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f[y * w + x]; if (v < 5) continue; D.px(x0 + x, y0 + y, 'fire', clamp(v / 36 * 11.5, 2, 11), { e: 255 }); } }
// a small flame (s px tall) standing on (x, y)
function flame(D, x, y, s, t, ph) {
  const hh = Math.max(2, Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph)))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.42)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// where worker()'s front hand ends up for a pose (same rig as mc-pxroom.js), for tools the rig does not carry
function handAt(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), a1 = p.aF || 0, a2 = p.eF || 0;
  const ex = sx + dir + Math.sin(a1) * 5 * dir, ey = shY + 2 + Math.cos(a1) * 5; return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5), a1 + a2];
}
// a jagged lightning path from (x0,y0) to (x1,y1): n segments, offsets from a seeded rng
function boltPath(x0, y0, x1, y1, n, amp, seed) {
  const r = X.rng(seed), pts = [[x0, y0]];
  for (let i = 1; i < n; i++) { const k = i / n, px = -(y1 - y0), py = x1 - x0, l = Math.hypot(px, py) || 1, o = (r() - 0.5) * 2 * amp; pts.push([x0 + (x1 - x0) * k + px / l * o, y0 + (y1 - y0) * k + py / l * o]); }
  pts.push([x1, y1]); return pts;
}
function drawBolt(D, pts, m, t0, core) { for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = pts[i], [c, d] = pts[i + 1]; D.line(a + 1, b, c + 1, d, m, t0 - 2.5, { e: 255 }); D.line(a, b, c, d, m, core != null ? core : t0, { e: 255 }); } }

// ───────── 兵马俑 terracotta army (fantasy · legendary · defence) ─────────
// a Qin tomb hall: three ranks of clay soldiers on rammed-earth terraces, bronze tree lamps, a ding brazier, a gong.
// Every ~10 s the keeper strikes the gong: a wave of gold light runs through the ranks, the eyes of the army light up,
// dust shakes off the clay and every spear dips in salute.
const TC = {
  // w, h, rows; eyes (row, cols) and spear hand (col, row) are read from the rows
  big: ['......kk...', '...kkkkk...', '...kfffk...', '...fefef...', '...fffff...', '....fmf....', '....FFF....', '..rrAAArr..', '.dAAaAaAAd.', 'cdAAAAAAAdg', 'cCAaAaAaAGg', 'cCAAAAAAAGg', 'cCdAaAaAdGg', 'hhdAAAAAdhh', '..sssssss..', '..sssssss..', '..SsssssS..', '...lL.lL...', '...lL.lL...', '...lL.lL...', '...lL.lL...', '..bbb.bbb..', 'PPPPPPPPPPP', 'ppppppppppp'],
  gen: ['...k...k...', '...kk.kk...', '....kkk....', '...kkkkk...', '...fefef...', '...fffff...', '...fmmmf...', '....fmf....', '..rrAAArr..', '.dAAaAaAAd.', 'cdAaAaAaAdg', 'cCArAaArAGg', 'cCAAAAAAAGg', 'cCdAAAAAdGg', 'cCsshhhssGg', '.hsssZsssh.', '..sssZsss..', '..sssZsss..', '..SssZssS..', '..SssZssS..', '..SssssssS.', '...sssssS..', '...lL.lL...', '...lL.lL...', '..bbb.bbb..', 'PPPPPPPPPPP', 'ppppppppppp'],
  mid: ['.....kk..', '..kkkkk..', '..fefef..', '..fffff..', '...fmf...', '..rAAAr..', '.dAaAaAd.', 'cdAAAAAdg', 'cCAaAaAGg', 'cCAAAAAGg', 'hhdAAAdhh', '..sssss..', '..sssss..', '..SsssS..', '..lL.lL..', '..lL.lL..', '..lL.lL..', '.bbb.bbb.', 'PPPPPPPPP', 'ppppppppp'],
  // the clay horse faces right: pricked ears, a cropped standing mane (k), a long head with the muzzle down, a barrel body, a knotted tail
  horse: ['...............k.k....', '..............kHkH....', '.............kHHHHH...', '............kkHHeHHH..', '...........kkHHHHHHHH.', '..........kkHHHH.HHHHn', '.........kkHHHH...HHm.', '........kkHHHH........', '..BBBBBBBHHHHH........', '.BBBBBBBBBBBBB........', 'tBBBBbBBBBBBBB........', 'tBBBBBBBBBBBBB........', 'tDBBBBBBBBBBBD........', 't.LlL.....LlL.........', '..LlL.....LlL.........', '..LlL.....LlL.........', '.PPPPPPPPPPPPPP.......', '.pppppppppppppp.......'],
  sml: ['....k..', '..kkk..', '..efe..', '..fff..', '.rAAAr.', 'cAaAaAg', 'cAAAAAg', 'cAaAaAg', 'hdAAAdh', '.sssss.', '.SsssS.', '..l.l..', '..l.l..', '.bb.bb.', 'PPPPPPP', 'ppppppp'],
};
function clayPal(o) {
  const c = 'mstone';
  return { H: [c, 7.4 + o, { n: [0.2, -0.3] }], n: [c, 6 + o], B: [c, 7 + o], D: [c, 5 + o], t: [c, 4.6 + o], k: [c, 4.2 + o], f: [c, 8.4 + o], F: [c, 6.4 + o], e: ['ink', 1], m: [c, 5.6 + o], r: ['crimson', 5.4 + o * 0.5], A: [c, 6.6 + o], a: [c, 8.8 + o, { n: [-0.3, -0.5] }], d: [c, 5 + o],
    c: [c, 7.6 + o, { n: [-0.6, 0] }], C: [c, 6 + o], g: [c, 5.4 + o, { n: [0.6, 0] }], G: [c, 6 + o], h: [c, 8.2 + o], s: [c, 7 + o], S: [c, 5.6 + o], l: [c, 7 + o], L: [c, 5.2 + o], b: [c, 4.2 + o], P: [c, 7.8 + o, { n: [0, -0.8] }], p: [c, 5.2 + o], Z: ['brass', 7 + o] };
}
// ranks: [kind, x (centre), y (feet), tone offset, layer]; the front four answer the call (effect: 4 soldiers join the defence)
const TROOPS = [];
for (let i = 0; i < 10; i++) TROOPS.push({ k: 'sml', x: 29 + i * 10.3, y: 60, o: -1.2, lay: 'wall', sp: 13 });
for (let i = 0; i < 9; i++) if (i !== 6 && i !== 7) TROOPS.push({ k: 'mid', x: 23 + i * 13, y: 74, o: -0.5, lay: 'back', sp: 17 });
TROOPS.push({ k: 'horse', x: 104.5, y: 74, o: -0.6, lay: 'back', sp: 0 });   // one horse in the gap of the front rank, its head above their helmets
[[47, 'big'], [63, 'big'], [80, 'gen'], [95, 'big'], [117, 'big']].forEach(([x, k]) => TROOPS.push({ k, x, y: 90, o: 0, lay: 'mid', sp: k === 'gen' ? 0 : 21, front: 1 }));
TROOPS.forEach(s => { const rows = TC[s.k], w = rows[0].length; s.w = w; s.x0 = Math.round(s.x - (w - 1) / 2); s.y0 = s.y - rows.length; s.eyes = []; rows.forEach((row, j) => { for (let i = 0; i < w; i++) { if (row[i] === 'e') s.eyes.push([s.x0 + i, s.y0 + j]); if (row[i] === 'h' && i >= w - 2 && s.hand == null) s.hand = [s.x0 + w - 1.5, s.y0 + j]; } }); });
const TR_WAVE = [36, 80, 124];
// when the gong has woken the army, the dragon disc's jade eye throws a beam down onto the general (0…1 by anim time)
const trBeam = (t) => { const g = (steps(t, 10.5) - 0.69) * 10.5; return g < 0.5 ? 0 : g < 0.9 ? (g - 0.5) / 0.4 : g < 3.4 ? 1 : g < 4.4 ? 4.4 - g : 0; };
const BEAM_C = [255, 226, 160];
X.def('terracotta', {
  amb: [0.27, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'fantasy');
    sc.light({ x: 17, y: 38, z: 8, r: 74, i: 0.95, c: '#ffb45a', fl: 'candle', tint: 0.45 });                 // 0 tree lamp left
    sc.light({ x: 133, y: 38, z: 8, r: 74, i: 0.95, c: '#ffb45a', fl: 'candle', ph: 2.3, tint: 0.45 });       // 1 tree lamp right
    sc.light({ x: 134, y: 66, z: 30, r: 92, i: 1.2, c: '#ff8a38', fl: 'fire', ph: 1.1, tint: 0.5 });          // 2 ding brazier
    TR_WAVE.forEach(x => sc.light({ x, y: 64, z: 20, r: 50, i: 1.15, c: '#ffcf6a', tint: 0.55, bake: false }));   // 3–5 the awakening wave
    // the hall: darker lacquer red, a black banner each side with a gold roundel, a bronze dragon disc in the middle
    S.lay('wall'); S.shadow([[12, 0], [138, 0], [138, FY], [12, FY]], 1.3); S.noise(12, 8, 126, 50, 1, 5, 14);
    [[33, 0], [117, 1]].forEach(([x]) => { S.beg(); S.hcyl(x - 2, 9, 14, 2, 'gold', 6); S.rect(x, 11, 10, 27, 'night', 1.6); S.vl(x, 11, 27, 'night', 2.6); S.vl(x + 9, 11, 27, 'ink', 1); S.rect(x, 11, 10, 1, 'crimson', 6); S.rect(x + 1, 35, 8, 1, 'crimson', 6); for (let k = 0; k < 10; k += 2) S.px(x + k, 38, 'crimson', 5);
      S.ell(x + 4.5, 20, 3.4, 3.4, 'gold', 7, { ring: 1 }); S.px(x + 4, 20, 'crimson', 7); S.px(x + 5, 20, 'crimson', 7); S.hl(x + 2, 27, 6, 'gold', 6); S.hl(x + 3, 29, 4, 'gold', 5); S.hl(x + 2, 31, 6, 'gold', 6); S.end(); });
    S.beg(); S.box(60, 11, 31, 28, 'night', 1.8); S.rect(61, 12, 29, 1, 'gold', 7); S.rect(61, 37, 29, 1, 'gold', 5); S.vl(61, 13, 24, 'gold', 6); S.vl(89, 13, 24, 'gold', 4.5); S.end();
    S.beg(); S.ell(75.5, 25, 11.5, 11.5, 'brass', 5, { dome: 1 }); S.ell(75.5, 25, 11.5, 11.5, 'brass', 7, { ring: 1.2 }); S.ell(75.5, 25, 8, 8, 'brass', 4, { ring: 1 });
    // coiled dragon: one unbroken 2 px body curling in round the jade pearl (lit outer edge, shadowed inner edge), a tapering
    // tail at the top, two claws, and the head at the inner end looking at the pearl
    { const cx = 75.5, cy = 25, a0 = -Math.PI / 2 - 0.5, a1 = a0 + Math.PI * 1.66, r0 = 7.3, r1 = 4.8;
      for (let y = 16; y <= 34; y++) for (let x = 66; x <= 85; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy); let a = Math.atan2(dy, dx); while (a < a0) a += Math.PI * 2; if (a > a1) continue;
        const k = (a - a0) / (a1 - a0), rs = r0 + (r1 - r0) * k, w = k < 0.14 ? 0.6 + k / 0.14 * 0.4 : 1, d = r - rs, n = [dx / r * 0.7, dy / r * 0.7];
        if (d > 0 && d < w) S.px(x, y, 'brass', 8, { n }); else if (d <= 0 && d > -w) S.px(x, y, 'brass', 5.6); else if (d <= -w && d > -w - 0.8) S.px(x, y, 'brass', 3); }
      [0.36, 0.68].forEach(k => { const a = a0 + (a1 - a0) * k, rr = r0 + (r1 - r0) * k + 1.5; S.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 'brass', 7.4); S.px(cx + Math.cos(a) * (rr + 1), cy + Math.sin(a) * (rr + 1), 'brass', 6.4); });
      const hx = Math.round(cx + Math.cos(a1) * r1) - 1, hy = Math.round(cy + Math.sin(a1) * r1) - 2;
      S.rect(hx, hy, 3, 3, 'brass', 7.6, { n: [-0.3, -0.5] }); S.hl(hx, hy, 3, 'brass', 8.6); S.hl(hx, hy + 2, 3, 'brass', 5); S.px(hx + 1, hy + 1, 'ink', 1); S.px(hx + 3, hy + 1, 'brass', 8); S.px(hx + 3, hy + 2, 'brass', 4.4); S.px(hx - 1, hy - 1, 'brass', 8.4); S.px(hx, hy - 1, 'brass', 7); }
    S.ell(75.5, 25, 2, 2, 'teal', 6, { dome: 1 }); S.px(75, 24, 'teal', 9); S.end();
    // rammed-earth terraces: layered faces, a timber edge, the back one topped with soldiers and tree lamps
    const terrace = (y0, y1, t) => { S.rect(12, y0, 126, y1 - y0, 'earth', t); for (let y = y0 + 2; y < y1; y += 3) { S.hl(12, y, 126, 'earth', t - 1.4); for (let x = 12; x < 138; x += 5 + ((x * 7 + y) % 4)) S.px(x, y - 1, 'earth', t + 0.8); } S.noise(12, y0, 126, y1 - y0, 1, 4, y0); S.box(12, y0 - 2, 126, 3, 'wood', 3.6, { bev: 1 }); S.hl(12, y0 - 2, 126, 'earth', t + 1.6, { n: [0, -0.9] }); };
    S.lay('wall'); S.beg(); terrace(60, 76, 4.2); S.end({ none: 1 });
    // bronze tree lamps on the back terrace ends: a trunk, three tiers of branches with lamp dishes
    const TL = [[17, 0], [133, 1]];
    TL.forEach(([x]) => { S.lay('back'); S.beg(); S.rect(x - 3, 58, 7, 2, 'brass', 4); S.rect(x - 2, 56, 5, 2, 'brass', 5); S.vl(x, 32, 24, 'brass', 6); S.vl(x + 1, 34, 22, 'brass', 3.5);
      [[46, 7], [40, 5], [34, 0]].forEach(([y, s]) => { if (s) { S.line(x, y + 3, x - s, y, 'brass', 5); S.line(x + 1, y + 3, x + s + 1, y, 'brass', 4.5); S.rect(x - s - 1, y, 3, 1, 'brass', 7); S.rect(x + s, y, 3, 1, 'brass', 6); } else S.rect(x - 1, y, 3, 1, 'brass', 7); });
      S.end(); });
    S.lay('wall'); TROOPS.filter(s => s.lay === 'wall').forEach(s => { S.beg(); S.spr(s.x0, s.y0, TC[s.k], clayPal(s.o)); S.end(); });
    S.lay('back'); S.beg(); terrace(74, 90, 4.8); S.end({ none: 1 });
    TROOPS.filter(s => s.lay === 'back').forEach(s => { S.beg(); S.spr(s.x0, s.y0, TC[s.k], clayPal(s.o)); S.end(); });
    // floor: grey brick paving instead of the hall's boards
    S.lay('wall'); TX.bricks(S, 0, FY, W, H - FY, 'mstone', 4.2, { bw: 9, bh: 3, v: 0.8, pits: 0 }); S.ao(0, FY, W, 5, 't', 1.6);
    // front rank on the floor
    S.lay('mid'); TROOPS.filter(s => s.lay === 'mid').forEach(s => { S.beg(); S.spr(s.x0, s.y0, TC[s.k], clayPal(s.o)); S.end(); });
    // the gong on its lacquered frame (left)
    S.beg(); S.box(8, 55, 3, 35, 'wood', 3.5); S.box(28, 55, 3, 35, 'wood', 3.5); S.box(6, 53, 27, 3, 'crimson', 5, { top: 1 }); S.rect(5, 52, 3, 3, 'gold', 7); S.rect(31, 52, 3, 3, 'gold', 7); S.rect(7, 87, 6, 3, 'wood', 4); S.rect(26, 87, 6, 3, 'wood', 4);
    S.vl(15, 56, 5, 'leather', 5); S.vl(23, 56, 5, 'leather', 5); S.end();
    S.beg(); S.ell(19.5, 69, 8.5, 8.5, 'brass', 6, { dome: 1 }); S.ell(19.5, 69, 8.5, 8.5, 'brass', 4, { ring: 1 }); S.ell(19.5, 69, 5.5, 5.5, 'brass', 7.5, { ring: 1 }); S.ell(19.5, 69, 2.2, 2.2, 'brass', 8, { dome: 1 }); S.end();
    // ding brazier (right, nearest the eye): three legs, a round belly with a beast-mask band, two upright ears
    S.lay('front'); S.beg(); [[126, 1], [134, 0], [142, -1]].forEach(([x, d]) => { S.rect(x - 1, 80, 3, 9, 'brass', 3.8); S.px(x - 1, 80, 'brass', 5.5); S.rect(x - 2 + d, 88, 4, 2, 'brass', 3.2); });
    S.ell(134, 75, 11.5, 7.5, 'brass', 4.6, { dome: 1 }); S.rect(122, 69, 25, 3, 'brass', 5.6, { n: [0, -0.7] }); S.hl(122, 69, 25, 'brass', 8); S.hl(123, 71, 23, 'brass', 3);
    for (let x = 124; x < 145; x++) { const k = (x - 124) % 7; S.px(x, 74, 'brass', k === 1 || k === 5 ? 7.5 : 3.4); S.px(x, 75, 'brass', k === 3 ? 7 : k === 2 || k === 4 ? 6 : 3.8); S.px(x, 76, 'brass', 2.8); }
    S.px(134, 74, 'teal', 8, { e: 3 }); S.px(127, 79, 'teal', 4); S.px(128, 80, 'teal', 5); S.px(139, 79, 'teal', 4); S.px(140, 78, 'teal', 5); S.px(132, 81, 'teal', 4);
    [[123, 0], [143, 1]].forEach(([x]) => { S.rect(x, 62, 3, 7, 'brass', 5.2); S.px(x + 1, 64, 'ink', 1); S.px(x + 1, 65, 'ink', 1); S.px(x + 1, 66, 'ink', 1); S.hl(x, 62, 3, 'brass', 8); }); S.end();
    sc.emit({ k: 'ember', x: 134, y: 66, w: 12, rate: 3, sp: 7, ang: 0, spread: 0.7, life: 2.4 });
    sc.emit({ k: 'dust', x: 75, y: 40, w: 110, h: 40, rate: 1.2, sp: 2, life: 4 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10.5);
    // tree lamp flames
    [17, 133].forEach((x, i) => [[x - 7, 45], [x + 8, 45], [x - 5, 39], [x + 6, 39], [x + 0.5, 33]].forEach(([fx, fy], k) => flame(D, Math.round(fx), fy, 4, t, i * 3 + k * 1.3)));
    // ding fire
    D.lay('front'); { const fw = 19, fh = 16, f = fireSim(st.fire || (st.fire = {}), fw, fh, t, 0.9 + (st.flare || 0) * 0.1, 0.5 - (st.flare || 0) * 0.25);
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const v = f[y * fw + x], u = Math.abs(x - (fw - 1) / 2) / (fw / 2), k = (fh - 1 - y) / fh; if (v < 6 || u > 1 - k * 0.75) continue; D.px(125 + x, 54 + y, 'fire', clamp(v / 36 * 11.5 + (1 - u) * 0.8, 2, 11), { e: 255 }); } }
    st.flare = Math.max(0, (st.flare || 0) - 0.02);
    // the keeper: strolls in front of the gong, then strikes it
    let kx, kdir, pose, mal = 0;
    if (q < 0.5) { const w = X.stroll(t, 34, 42, 6, 0.2, 1.6); kx = w.x; kdir = w.dir; pose = w.pose; }
    else { kx = 36; kdir = -1; const r = (q - 0.58) / 0.1; mal = q < 0.58 ? 0.3 : q < 0.68 ? 0.3 + ease(r) * 2.2 : q < 0.7 ? 2.5 - (q - 0.68) / 0.02 * 1.3 : 1.2 - Math.min(1, (q - 0.7) / 0.12) * 0.9; pose = { aF: mal, eF: -0.2, aB: 0.2, eB: -0.3, lF: 0.2, lB: -0.15, lean: q > 0.68 && q < 0.74 ? 0.5 : 0 }; }
    const look = { skin: ['skin', 6], hair: ['hair', 2], top: ['denim', 4], bot: ['denim', 2.6], boot: ['ink', 2], robe: 1, cap: ['ink', 2] };
    D.lay('mid'); worker(D, kx, FY, look, pose, kdir);
    // the robe's skirt is round: shade it across (lit side toward the lamp) so no flat patch sits on a half step
    { const L = D.c, dn = X.MI.denim; for (let y = FY - 12; y < FY; y++) for (let x = kx - 6; x <= kx + 6; x++) { const p = y * W + x; if (L.m[p] === dn) L.t[p] = Math.max(0, L.t[p] + (kx - x) * 0.22 - (y > FY - 4 ? 0.3 : 0)); } }
    const hd = handAt(kx, FY, pose, kdir); if (!X.noWorkers) { D.beg(); const a = hd[2], dx = Math.sin(a) * kdir, dy = Math.cos(a); D.line(hd[0], hd[1], hd[0] + dx * 7, hd[1] + dy * 7, 'wood', 6); D.rect(Math.round(hd[0] + dx * 7) - 1, Math.round(hd[1] + dy * 7) - 1, 3, 3, 'crimson', 6); D.end(); }
    const hit = q >= 0.69 && q < 0.72; if (hit && !st.hit) { st.hit = 1; st.gong = t; st.flare = 1; rs.flash(2, 0.5); rs.flash(0, 0.4); rs.flash(1, 0.4); rs.burst('glint', 20, 69, 4, { sp: 18, life: 0.5, w: 8, h: 8 }); } if (q < 0.6) st.hit = 0;
    // gong shimmer: a ring of light that swims while it rings, and sound rings that spread
    const ga = st.gong != null ? t - st.gong : 99;
    if (ga < 3) { const k = Math.max(0, 1 - ga / 3); D.lay('mid'); for (let a = 0; a < 40; a++) { const th = a / 40 * Math.PI * 2, rr = 4 + Math.sin(ga * 30) * 0.8; D.px(19.5 + Math.cos(th) * rr, 69 + Math.sin(th) * rr, 'brass', 8 + k * 3, { e: 255 }); }
      if (ga < 0.9) { D.lay('front'); const rr = 10 + ga * 40; for (let a = 0; a < 60; a++) { const th = a / 60 * Math.PI * 2; if (a % 3 === 0) continue; const x = 19.5 + Math.cos(th) * rr, y = 69 + Math.sin(th) * rr * 0.8; if (x > 3 && x < W - 4 && y > 3 && y < FY) D.px(x, y, 'lamp', 9 - ga * 6, { e: 255 }); } } }
    // the awakening wave: runs left to right through the ranks, eyes light, spears dip, dust shakes off
    const wx = ga < 3.5 ? -10 + ga * 110 : -99;
    TR_WAVE.forEach((x, i) => { rs.mul[3 + i] = ga < 3.5 ? Math.max(0, 1 - Math.abs(wx - x) / 44) * (ga < 2.5 ? 1 : (3.5 - ga)) : 0; });
    rs.mul[4] = Math.max(rs.mul[4], trBeam(t) * 0.9);   // the beam keeps the centre lit on the general
    st.dust = st.dust || {};
    TROOPS.forEach((s, i) => {
      const pass = ga < 4.2 ? ga - (s.x + 10) / 110 : -1, on = pass > 0 ? (pass < 0.15 ? 1 : pass < 2.4 ? 0.75 : Math.max(0, 1 - (pass - 2.4) / 0.6) * 0.75) : 0;
      D.lay(s.lay);
      if (on > 0.05) s.eyes.forEach(([ex, ey]) => { D.px(ex, ey, 'lamp', 6 + on * 5, { e: 255 }); });
      if (pass > 0 && pass < 0.1 && st.dust[i] !== st.gong) { st.dust[i] = st.gong; rs.burst('dust', s.x, s.y0 + 6, s.front ? 3 : 1, { sp: 6, life: 1.6, w: s.w, h: 8 }); if (s.front) rs.burst('glint', s.eyes[0][0] + 1, s.eyes[0][1], 1, { sp: 0, life: 0.5 }); }
      if (!s.sp || !s.hand) return;
      const dip = pass > 0 ? (pass < 0.25 ? ease(pass / 0.25) : pass < 2.2 ? 1 : 1 - ease((pass - 2.2) / 0.4)) : 0, a = dip * 0.42, [hx, hy] = s.hand, L = s.sp, dx = Math.sin(a), dy = -Math.cos(a);
      D.beg(); D.line(hx - dx * 3, hy - dy * 3, hx + dx * L, hy + dy * L, 'wood', 4.4 + s.o); const tx = hx + dx * L, ty = hy + dy * L; D.line(tx, ty, tx + dx * 3, ty + dy * 3, 'brass', 7.6 + s.o); D.px(tx + dx * 4, ty + dy * 4, 'brass', 9 + s.o); D.px(tx - 1, ty + 1, 'crimson', 6); D.end({ none: 1 });
    });
    // the general's bronze sword catches the light as the wave reaches him
    if (ga < 3.5 && Math.abs(wx - 80) < 6 && !st.gl) { st.gl = 1; rs.burst('glint', 80, 72, 2, { sp: 4, life: 0.6 }); } if (ga > 3.5) st.gl = 0;
    // the jade eye wakes with the beam
    if (ga > 0.5 && ga < 4.4) { const k = ga < 0.9 ? (ga - 0.5) / 0.4 : ga < 3.4 ? 1 : 4.4 - ga; D.lay('wall'); D.ell(75.5, 25, 2.2, 2.2, 'teal', 6 + k * 3, { e: 255 }); D.px(75, 24, 'teal', 9 + k, { e: 255 }); if (!st.jd) { st.jd = 1; rs.burst('glint', 75.5, 25, 5, { sp: 26, life: 0.6 }); } } else st.jd = 0;
    // the dragon disc: a slow glint sweeps across it
    const gp = steps(t, 5.5); if (gp < 0.35) { const b = -12 + gp / 0.35 * 26; D.lay('wall'); for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) { if (x * x + y * y > 132) continue; const d = x + y * 0.6 - b; if (d > -1 && d < 1.2) D.px(75.5 + x, 25 + y, 'brass', 9.5 - Math.abs(d) * 1.5, { e: 255 }); } }
  },
  // the beam's haze: hard-stepped washes of warm light down a widening wedge (cheaper than an engine shaft)
  post(out, t) {
    const a = trBeam(t); if (a <= 0) return;
    for (let y = 37; y < FY; y++) { const k = (y - 37) / 53, hw = 2.5 + 8.5 * k, cx = 76 + 4 * k, sh = 0.88 + 0.12 * Math.sin(t * 2.6 + y * 0.35);
      for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) { const u = Math.abs(x + 0.5 - cx) / hw; if (u >= 1) continue; const v = (1 - u * u) * (1 - k * 0.25) * a * 0.62 * sh, aq = Math.min(0.45, Math.floor(v * 8) / 8); if (aq > 0) X.blendPx(out, y * W + x, BEAM_C, aq); } }
  },
});

// ───────── 奥林匹亚宙斯神像 statue of Zeus (fantasy · epic · defence: chain lightning) ─────────
// the temple's cella: an ivory-and-gold Zeus on an ebony throne, the thunderbolt raised in one hand, the eagle sceptre in
// the other, a black pool of oil at his feet, tripod braziers, Doric columns framing it; a hoplite keeps watch.
// Firing (rs.fireAge < 0.5): the bolt goes white, lightning forks up through the roof, the arm kicks, sparks rain.
const ZB = [98, 20];   // the thunderbolt's grip
// the reflection in the oil pool, one entry per row from the far lip: [x0, x1, ramp, tone, broken]
const ZREF = [[47, 103, 'gold', 4, 0], [61, 89, 'gold', 5, 1], [64, 87, 'bone', 6, 0], [67, 84, 'bone', 5, 1], [70, 81, 'gold', 4, 0]];
X.def('zeus', {
  amb: [0.26, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'fantasy');
    sc.light({ x: ZB[0], y: ZB[1], z: 20, r: 96, i: 0.85, c: '#b8e6ff', fl: 'pulse', amp: 0.12, sp: 7, tint: 0.5 });   // 0 the thunderbolt
    sc.light({ x: 26, y: 60, z: 16, r: 64, i: 0.95, c: '#ff9a40', fl: 'fire', tint: 0.5 });                              // 1 brazier left
    sc.light({ x: 124, y: 60, z: 16, r: 64, i: 0.95, c: '#ff9a40', fl: 'fire', ph: 2.2, tint: 0.5 });                   // 2 brazier right
    sc.light({ x: 75, y: 4, z: 30, r: 150, i: 0.25, c: '#a8c8ff', tint: 0.35 });                                         // 3 the sky through the roof (kicked by strikes)
    S.lay('wall');
    // meander frieze under the ceiling
    S.rect(0, 9, W, 7, 'night', 1.5); S.hl(0, 9, W, 'gold', 6); S.hl(0, 15, W, 'gold', 4.5);
    for (let x = 0; x < W; x += 6) { S.vl(x + 1, 10, 4, 'gold', 6.5); S.hl(x + 1, 10, 4, 'gold', 6.5); S.vl(x + 4, 10, 3, 'gold', 6); S.px(x + 3, 12, 'gold', 5.5); S.hl(x + 1, 13, 3, 'gold', 5.5); }
    // the cella niche behind the statue: deep blue-black, gold-edged, so ivory and gold stand out
    S.beg(); S.rect(36, 17, 78, 70, 'night', 1.2); S.noise(36, 17, 78, 70, 1, 6, 5); S.vl(36, 17, 70, 'gold', 5); S.vl(113, 17, 70, 'gold', 3.5); S.hl(36, 17, 78, 'gold', 6.5); S.end({ none: 1 });
    for (let k = 0; k < 16; k++) { const x = 40 + (k * 37) % 70, y = 20 + (k * 23) % 60; S.px(x, y, 'gold', 4); }   // painted stars on the niche
    // throne: ebony with gold rails, ivory inlay, lion-paw legs
    S.lay('back'); S.beg(); S.box(54, 11, 42, 49, 'night', 2.2); S.rect(57, 14, 36, 43, 'ink', 2); S.hcyl(52, 8, 46, 3, 'gold', 6, { rim: 1.5 }); [[53], [96]].forEach(([x]) => { S.ell(x, 6.5, 2, 2, 'gold', 7, { dome: 1 }); });   // the back rises above his head so the curls stand on black
    for (let y = 19; y < 56; y += 7) { S.px(59, y, 'bone', 8); S.px(91, y, 'bone', 8); } S.vl(57, 14, 43, 'gold', 5); S.vl(92, 14, 43, 'gold', 4);
    S.box(50, 46, 12, 4, 'gold', 5.5, { top: 1 }); S.box(88, 46, 12, 4, 'gold', 5, { top: 1 }); S.rect(50, 50, 3, 26, 'gold', 5); S.rect(97, 50, 3, 26, 'gold', 4);
    S.box(52, 58, 46, 20, 'night', 2.4); S.rect(55, 61, 40, 1, 'gold', 6); S.rect(55, 74, 40, 1, 'gold', 5); for (let x = 58; x < 94; x += 9) { S.ell(x + 2, 67.5, 2, 2, 'bone', 7, { dome: 1 }); }
    [[53], [95]].forEach(([x]) => { S.rect(x - 1, 76, 4, 4, 'gold', 5.5); S.hl(x - 2, 79, 6, 'gold', 7); }); S.end();
    // pedestal: black stone with gold mouldings, three steps
    S.beg(); S.box(46, 80, 58, 3, 'stone', 3.4, { top: 1 }); S.box(40, 83, 70, 3, 'stone', 3.2, { top: 1 }); S.box(34, 86, 82, 4, 'stone', 3, { top: 1 }); S.hl(46, 79, 58, 'gold', 7); S.hl(40, 82, 70, 'gold', 6.5); S.hl(34, 85, 82, 'gold', 6);
    for (let x = 44; x < 108; x += 8) { S.rect(x, 87, 4, 2, 'gold', 4.5); S.px(x + 1, 87, 'gold', 7); } S.end();
    // Zeus: shins in gold drapery, the lap, a bare ivory torso, the arms, a hand-drawn head (gold hair and beard, olive wreath)
    S.beg();
    S.rect(61, 77, 28, 3, 'gold', 5); S.hl(61, 77, 28, 'gold', 7.4); S.rect(63, 75, 7, 2, 'bone', 8.2); S.rect(80, 75, 7, 2, 'bone', 7.6); S.px(64, 75, 'bone', 9); S.px(81, 75, 'bone', 8.4); S.hl(63, 76, 7, 'gold', 6.4); S.hl(80, 76, 7, 'gold', 6);   // footstool, toes, sandals
    [[62, 5.9], [80, 5.4]].forEach(([x, tn]) => { S.cyl(x, 58, 9, 17, 'gold', tn, { rim: 2.4 }); for (let k = 0; k < 4; k++) S.line(x + 1 + k * 2, 60 + k, x + 3 + k * 2, 73, 'gold', tn - 1.6); });
    S.poly([[70, 58], [80, 58], [78, 74], [72, 74]], 'gold', 3.6); S.line(75, 59, 75, 73, 'gold', 2.4); S.line(72, 60, 74, 72, 'gold', 5); S.line(78, 60, 76, 72, 'gold', 4.4);   // cloth hanging between the knees
    for (let x = 59; x < 92; x++) { const u = (x - 75.5) / 16, top = 50, bot = 58 + (Math.abs(((x - 59) % 6) - 3) < 1.5 ? 1 : 0); for (let y = top; y <= bot; y++) S.px(x, y, 'gold', 6.4 - Math.pow(Math.abs(u), 3) * 1.8 + (y === top ? 1.2 : 0) - ((x - 59) % 6 === 0 && y > top + 1 ? 1.6 : 0), { n: [u * 0.7, y === top ? -0.6 : 0] }); }
    for (let y = 30; y < 50; y++) { const hw = 13.5 - Math.max(0, y - 34) * 0.2 - (y < 32 ? (32 - y) * 1.6 : 0); for (let x = Math.round(75.5 - hw); x < Math.round(75.5 + hw); x++) { const u = (x + 0.5 - 75.5) / hw; S.px(x, y, 'bone', 7.8 - Math.pow(Math.abs(u), 3) * 2.4 - (u > 0 ? u * 0.6 : 0), { n: [u * 0.85, y < 33 ? -0.5 : 0] }); } }
    S.line(66, 38, 73, 39, 'bone', 5.8); S.line(78, 39, 85, 38, 'bone', 5.4); S.hl(67, 37, 5, 'bone', 8.8); S.hl(79, 37, 5, 'bone', 8.2); S.vl(75, 40, 9, 'bone', 5.8); S.hl(72, 43, 3, 'bone', 6.2); S.hl(77, 43, 3, 'bone', 6); S.hl(72, 46, 3, 'bone', 6.2); S.hl(77, 46, 3, 'bone', 6);   // chest and belly
    S.poly([[61, 30], [69, 30], [91, 50], [84, 51], [61, 39]], 'gold', 6.4, { n: [-0.3, -0.3] }); S.line(63, 32, 84, 50, 'gold', 4.6); S.line(65, 31, 88, 50, 'gold', 8.2); S.line(61, 36, 76, 48, 'gold', 5);   // himation over the left shoulder
    const arm = (pts, tn, lit) => { S.poly(pts, 'bone', tn, { n: [0.2, 0] }); S.line(pts[0][0], pts[0][1], pts[pts.length - 1][0], pts[pts.length - 1][1], 'bone', tn + 1.1, { n: [-0.6, -0.2] }); if (lit) S.line(pts[1][0], pts[1][1], pts[2][0], pts[2][1], 'bone', tn - 1.3, { n: [0.6, 0] }); };
    arm([[60, 31], [65, 33], [60, 44], [56, 44]], 7.3, 1); arm([[56, 43], [60, 43], [59, 48], [55, 48]], 7.6, 1); S.rect(54, 45, 4, 4, 'bone', 8.2); S.px(57, 47, 'bone', 6);   // sceptre arm
    arm([[87, 31], [91, 30], [98, 25], [98, 30], [92, 35], [88, 35]], 6.9, 0); S.line(91, 30, 98, 25, 'bone', 8, { n: [0, -0.6] }); arm([[94, 28], [98, 27], [99, 21], [95, 21]], 7.2, 1); S.rect(95, 19, 5, 4, 'bone', 8); S.px(95, 22, 'bone', 6.2); S.px(99, 20, 'bone', 6.8);   // raised arm
    S.line(66, 38, 73, 39, 'bone', 4.8); S.line(78, 39, 85, 38, 'bone', 4.6); S.hl(67, 36, 5, 'bone', 9); S.hl(79, 36, 4, 'bone', 8.4);
    // the head: a mass of curls round the face (broken outline), an olive wreath, a brow ridge in shadow, a lit nose with its
    // shadow side, the right half of the face turned away, a beard of rows of snail curls
    S.spr(68, 12, ['.....g..g.g.....', '...gGGkkGGkgGk..', '..gGGgGGgGGgGgk.', '.gLLlLLlLLlLLlgk', 'gGkhhhffdddddkgk', 'GGkhhfffdddddkGk', 'Ggkrrrrnrrrrrkgk', 'kGghfefnrdeddkgk', 'gGkhfffnrddddkgg', 'GGkBffnnrrddbkg.',
      '.gBBBBbfdbbBbbk.', '.GbBBBmmmmbBbbg.', '.gBBbBBbBBbBBbk.', '.kbbcbbcbbcbbck.', '..bBBbBBbBBbBc..', '..cbbcbbcbbcbc..', '...BBbBBbBBbb...', '...cbbcbbcbc....', '....cBBbBBbc....', '.....cbbcbc.....', '.......cc.......'],
      { L: ['leaf', 7.4, { n: [0, -0.5] }], l: ['leaf', 5.4], G: ['gold', 7.2, { n: [-0.4, -0.5] }], g: ['gold', 5.4], k: ['gold', 3.4], h: ['bone', 9.2, { n: [-0.5, -0.3] }], f: ['bone', 8.4], d: ['bone', 7, { n: [0.6, 0] }], r: ['bone', 6], n: ['bone', 9, { n: [-0.4, 0] }], e: ['ink', 1],
        B: ['gold', 7, { n: [-0.3, -0.5] }], b: ['gold', 5], c: ['gold', 3.2], m: ['gold', 2.4] });
    S.end();
    // the eagle sceptre (left hand) and the thunderbolt grip (right hand; the bolt itself is animated)
    // the sceptre leans from the left hand up across the dark niche, the eagle on its tip stands out gold on blue-black
    S.beg(); S.line(56, 51, 46, 29, 'gold', 6.8); S.line(57, 51, 47, 29, 'gold', 4.2); S.rect(45, 29, 4, 1, 'gold', 7.6);
    S.spr(40, 19, ['.....HH......', '....kHeH.....', 'W.....HH....W', 'WW...BBB...WW', '.WWWwBBBwWWW.', '..wWwBBBwWw..', '..w.wBBBw.w..', '.....bbb.....', '....bbbbb....', '....t...t....'],
      { W: ['gold', 7.6, { n: [0, -0.6] }], w: ['gold', 5], e: ['ink', 1], H: ['gold', 7.8, { n: [-0.3, -0.5] }], k: ['gold', 9], B: ['gold', 6.6, { n: [-0.3, -0.3] }], b: ['gold', 5], t: ['gold', 5.6] }); S.end();
    // floor of dark polished slabs; the black oil pool before the statue, a white marble kerb, the statue's gold in it
    S.lay('wall'); TX.tiles(S, 0, FY, W, H - FY, 'stone', 3, { s: 12, gt: 1.4, v: 0.6 }); S.ao(0, FY, W, 4, 't', 1.4);
    S.rect(40, 92, 70, 6, 'night', 0.8); S.hl(40, 92, 70, 'ink', 0.4); S.hl(39, 98, 72, 'bone', 7, { n: [0, -0.8] });   // the oil, its far lip in shadow, the lit marble kerb in front (the reflection is animated)
    // votive bronze shields hung on the side walls
    [[26, 5.6], [124, 5]].forEach(([x, tn]) => { S.beg(); S.ell(x, 33, 6.5, 6.5, 'brass', tn, { dome: 1 }); S.ell(x, 33, 6.5, 6.5, 'brass', tn + 2, { ring: 1 }); S.ell(x, 33, 3, 3, 'brass', tn - 1.4, { ring: 1 }); S.line(x - 1, 29, x + 1, 33, 'gold', 8.6); S.line(x + 1, 33, x - 1, 37, 'gold', 8.6); S.px(x, 26, 'iron', 3); S.end(); });
    // tripod braziers
    S.lay('mid'); [26, 124].forEach(x => { S.beg(); S.line(x - 5, 89, x - 2, 70, 'brass', 5); S.line(x + 5, 89, x + 2, 70, 'brass', 4); S.line(x, 89, x, 70, 'brass', 4.6); S.hl(x - 4, 80, 9, 'brass', 5.4); S.ell(x, 67, 7.5, 3.5, 'brass', 5.4, { dome: 1 }); S.hl(x - 7, 65, 15, 'brass', 8); S.hl(x - 6, 69, 13, 'brass', 3.4); S.end(); });
    // Doric columns nearest the eye
    S.lay('front'); [3, 137].forEach(x => { S.beg(); S.cyl(x + 1, 16, 9, 74, 'bone', 7, { rim: 2.2 }); for (let k = 2; k < 9; k += 2) S.vl(x + 1 + k, 18, 72, 'bone', 5.8 - (k > 5 ? 0.8 : 0)); S.box(x - 1, 9, 13, 3, 'bone', 8, { bev: 1 }); S.box(x, 12, 11, 3, 'bone', 7.4); S.hl(x + 1, 15, 9, 'bone', 5.5); S.end(); });
    sc.emit({ k: 'ember', x: 26, y: 62, w: 8, rate: 1.6, sp: 6, ang: 0, spread: 0.6, life: 1.8 });
    sc.emit({ k: 'ember', x: 124, y: 62, w: 8, rate: 1.6, sp: 6, ang: 0, spread: 0.6, life: 1.8 });
  },
  anim(D, t, rs) {
    const st = rs.st, fa = rs.fireAge, firing = fa < 0.5, cq = steps(t, 9.5), charge = cq > 0.8 ? (cq - 0.8) / 0.2 : 0, idleZap = cq < 0.03;
    // brazier fires
    D.lay('mid'); [[26, 'a'], [124, 'b']].forEach(([x, k]) => { const fw = 13, fh = 11, f = fireSim(st[k] || (st[k] = {}), fw, fh, t, 0.88, 0.55); for (let y = 0; y < fh; y++) for (let xx = 0; xx < fw; xx++) { const v = f[y * fw + xx], u = Math.abs(xx - 6) / 6.5, kk = (fh - 1 - y) / fh; if (v < 6 || u > 1 - kk * 0.7) continue; D.px(x - 6 + xx, 54 + y, 'fire', clamp(v / 36 * 11.5, 2, 11), { e: 255 }); } });
    // the arm kicks back when the bolt is thrown; the bolt itself
    const kick = firing ? (fa < 0.08 ? fa / 0.08 : Math.max(0, 1 - (fa - 0.08) / 0.3)) : 0, bx = ZB[0] + Math.round(kick * 2), by = ZB[1] + Math.round(kick * 2);
    D.lay('back'); D.beg();
    if (kick > 0.05) { D.line(95, 29, bx - 1, by + 2, 'bone', 7.2, { w: 3 }); D.rect(bx - 2, by, 3, 3, 'bone', 8); }
    const hot = firing ? 11 : idleZap ? 10.5 : 9 + charge * 2 + Math.sin(t * 13) * 0.4;
    // the keraunos: a zigzag spindle out of each side of the fist, three prongs at each tip
    const ZZ = [0, 0, 1, 2, 1, 0, -1, 0, 1, 1, 0];
    [-1, 1].forEach(sg => { for (let k = 1; k <= 11; k++) { const x = bx + 0.5 + ZZ[k - 1] * sg, y = by + 1.5 + sg * (k + 1); D.px(x, y, 'lamp', hot - k * 0.1, { e: 255 }); if (k < 6) D.px(x + 1, y, 'lamp', hot - 1.8, { e: 255 }); }
      const ty = by + 1.5 + sg * 12; [-3, 3].forEach(o => { D.line(bx + 0.5, ty, bx + 0.5 + o, ty + sg * 2, 'lamp', hot - 1.2, { e: 255 }); D.px(bx + 0.5 + o, ty + sg * 3, 'lamp', hot - 0.6, { e: 255 }); }); D.px(bx + 0.5, ty + sg * 3, 'lamp', hot, { e: 255 }); });
    D.end({ none: 1 });
    // crackling arcs around the bolt (more as it charges)
    const na = firing ? 5 : idleZap ? 4 : 1 + Math.floor(charge * 3) + (R() < 0.3 ? 1 : 0);
    for (let i = 0; i < na; i++) { if (R() < 0.35 && !firing) continue; const a = R() * Math.PI * 2, l = 4 + R() * (firing ? 10 : 6), sy = by - 9 + R() * 20; drawBolt(D, boltPath(bx, sy, bx + Math.cos(a) * l, sy + Math.sin(a) * l, 3, 1.5, Math.floor(t * 20) * 7 + i), 'ice', 10); }
    if (charge > 0) rs.flash(0, charge * 0.7);
    // Zeus's eyes burn while he throws
    if (firing || idleZap || charge > 0.7) { D.px(73, 19, 'ice', firing ? 11 : 9, { e: 255 }); D.px(78, 19, 'ice', firing ? 11 : 9, { e: 255 }); }
    // the strike: forks up through the roof, flash, sparks
    if (firing && fa < 0.35) { const sd = Math.floor(t * 24); D.lay('front');
      drawBolt(D, boltPath(bx, by - 10, 110 + (sd % 5) * 4, 3, 7, 5, sd * 13 + 1), 'ice', 11, 11); drawBolt(D, boltPath(bx, by - 8, 84 - (sd % 3) * 6, 3, 6, 4, sd * 17 + 3), 'ice', 10);
      if (fa < 0.12) drawBolt(D, boltPath(bx + 2, by + 10, 132, 40, 5, 4, sd * 5 + 2), 'ice', 9); }
    if (firing && !st.fired) { st.fired = 1; rs.flash(0, 3); rs.flash(3, 2.2); rs.burst('spark', bx, by - 6, 18, { sp: 50, life: 1, floor: 79 }); rs.burst('glint', bx, by - 10, 4, { sp: 30, life: 0.5 }); }
    if (!firing) st.fired = 0;
    if (idleZap && !st.zap) { st.zap = 1; rs.flash(0, 1.3); rs.flash(3, 0.8); rs.burst('spark', bx, by - 8, 8, { sp: 34, life: 0.8, floor: 79 }); } if (!idleZap) st.zap = 0;
    if (idleZap) { const sd = Math.floor(t * 24); D.lay('front'); drawBolt(D, boltPath(bx, by - 10, 104 + (sd % 3) * 3, 3, 5, 3, sd * 11 + 5), 'ice', 10, 11); }
    // the bolt's light in the oil pool
    D.lay('wall'); const gl = firing ? 1 : idleZap ? 0.8 : 0.3 + charge * 0.3; for (let y = 93; y < 98; y++) { const w = Math.round(Math.sin(t * 3 + y) * 1.2); if (R() < gl + 0.3) D.px(bx + w, y, 'ice', 6 + gl * 4 - (y - 93) * 0.7, { e: 255 }); }
    // Zeus upside down in the oil: gold feet and knees, the ivory body, the gold head, every row shifted a pixel with the swell,
    // every other row broken; bright ripples slide across it; it all flares with the bolt
    const up = firing ? 2 : idleZap ? 1 : 0;
    ZREF.forEach(([x0, x1, m, tn, br], i) => { const y = 93 + i, sh = Math.round(Math.sin(t * 1.7 + i * 1.9) * 1.1), ph = Math.floor(t * 2.2 + i * 3);
      for (let x = x0 + sh; x <= x1 + sh; x++) { if (br && ((x + ph) % 6) < 2) continue; if (x < 41 || x > 108) continue; D.px(x, y, m, tn + up, { e: 255 }); } });
    for (let k = 0; k < 4; k++) { const x = 42 + ((t * (5 + k * 1.5) + k * 17) % 64), y = 93 + ((k * 3) % 5), l = 2 + (k % 3); D.hl(Math.round(x), y, l, k % 2 ? 'bone' : 'gold', k % 2 ? 8 : 7, { e: 255 }); }
    // hoplite on watch: walks the front of the pedestal, stops to look up when the bolt flies
    const w = X.stroll(t, 34, 112, 8, 0.5, 2.2), look = { skin: ['skin', 6], hair: ['hair', 3], top: ['crimson', 6], bot: ['brass', 5], boot: ['leather', 3], cap: ['brass', 7] };
    const pose = firing ? { aF: 0.6, eF: -0.4, aB: 1.2, eB: -0.8, lean: -0.3 } : Object.assign(w.pose, { aF: 0.35 + (w.pose.aF || 0) * 0.3, eF: -0.5, aB: 1.2, eB: -0.9 });
    D.lay('mid'); worker(D, w.x, FY, look, pose, w.dir);
    if (!X.noWorkers) { const x = w.x, dir = w.dir, hy = FY - 21 + Math.round(pose.bob || 0);
      D.beg(); D.rect(x - 2, hy - 8, 5, 1, 'crimson', 7); D.rect(x - 1 - dir, hy - 9, 4, 1, 'crimson', 8); D.px(x + 2 * dir, hy - 3, 'brass', 8); D.end();   // horsehair crest, cheek guard
      const hd = handAt(x, FY, pose, dir); D.beg(); D.line(hd[0], hd[1] + 8, hd[0], hd[1] - 16, 'wood', 6); D.rect(hd[0] - 0, hd[1] - 19, 1, 3, 'iron', 9); D.end();   // spear
      D.beg(); D.ell(x - dir * 3, FY - 13 + Math.round(pose.bob || 0), 4.5, 5.5, 'brass', 6, { dome: 1 }); D.ell(x - dir * 3, FY - 13 + Math.round(pose.bob || 0), 4.5, 5.5, 'brass', 8, { ring: 1 }); D.px(x - dir * 3, FY - 13 + Math.round(pose.bob || 0), 'crimson', 7); D.end();   // hoplon
    }
  },
});

// ───────── 高德院 kōtoku-in, the Great Buddha of Kamakura (fantasy · rare · defence: two warrior monks) ─────────
// a night garden: the bronze Buddha sits under the open sky with the full moon behind his head for a halo; a black pine
// leans in from the left with a paper lantern, a bronze censer smokes, a stone lantern glows; one warrior monk drills with
// his naginata, one sweeps. Every ~10 s the drill ends in a great cut: a gust shakes needles from the pine, bends the
// smoke, and a glint runs off the Buddha's brow.
const KB = { x: 75.5, hy: 31 };
function kotokuSmoke(D, t, x0, y0, gust) {
  // incense smoke: a thin thread off the censer, then rounded 2–3 px puffs strung up a swaying ribbon that climb one row
  // every 1/6 s; the thread gives out halfway and the puffs dim as they rise; the gust bends the top over
  const sway = (k) => { const a = k / 40; return Math.sin(k * 0.17 - t * 1.4) * (1.6 + a * 4) + Math.sin(k * 0.07 + t * 0.6) * a * 3 + gust * a * a * 22 + a * 5; }, G = { e: 255 };
  for (let k = 0; k < 30; k++) { if (k > 20 && (k & 1)) continue; D.px(Math.round(x0 + sway(k)), y0 - k, 'linen', k < 8 ? 6 : k < 20 ? 5 : 4, G); }
  const ph = (t * 6) % 4;
  for (let j = 0; j < 9; j++) { const k = 5 + ph + j * 4; if (k > 40) break; const a = k / 40, x = Math.round(x0 + sway(k)), y = Math.round(y0 - k), tn = a < 0.35 ? 6 : a < 0.7 ? 5 : 4;
    if (a < 0.3) { D.rect(x, y - 1, 2, 2, 'linen', tn, G); D.px(x, y - 1, 'linen', tn + 1, G); continue; }
    D.hl(x - 1, y, 3, 'linen', tn, G); D.hl(x - 1, y - 1, 2, 'linen', tn + 1, G); D.px(x + 1, y - 1, 'linen', tn - 1, G); if (a < 0.8) D.hl(x, y + 1, 2, 'linen', tn - 1, G); }
  return [x0 + sway(40), y0 - 40];
}
X.def('kotoku', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 62, moon: [KB.x, 24, 15], far: 'trees', floor: 'stone' });                            // 0 moon
    // the moon's halo behind his head in three whole steps (the kit's middle ring sits on a half step and checkers)
    S.ell(KB.x, 24, 22.5, 22.5, 'night', 3, { e: 255, ring: 2.5 }); S.ell(KB.x, 24, 20, 20, 'night', 4, { e: 255, ring: 2.6 });
    sc.light({ x: 137, y: 66, z: 20, r: 58, i: 1, c: '#ffc070', fl: 'candle', tint: 0.14 });                       // 1 stone lantern
    sc.light({ x: 117, y: 70, z: 16, r: 36, i: 0.7, c: '#ff8a40', fl: 'pulse', amp: 0.25, sp: 1.7, tint: 0.25 });  // 2 censer embers
    sc.light({ x: 36, y: 34, z: 22, r: 60, i: 0.85, c: '#ffb060', fl: 'candle', ph: 3, tint: 0.3 });               // 3 paper lantern in the pine
    // the Buddha: crossed legs on a lotus base, robe over both shoulders, hands in the lap, curled hair, long ears
    S.lay('back');
    S.beg(); S.rect(38, 84, 75, 6, 'stone', 4.2); S.hl(38, 84, 75, 'stone', 6.4, { n: [0, -0.8] }); for (let x = 40; x < 111; x += 6) S.vl(x, 85, 5, 'stone', 3); S.end();
    S.beg(); for (let i = 0; i < 13; i++) { const x = 41 + i * 5.6; S.poly([[x - 3, 84], [x + 3, 84], [x + 2.5, 80], [x, 77.5], [x - 2.5, 80]], 'stone', 5.4, { n: [0, -0.3] }); S.line(x, 78, x, 83, 'stone', 7); S.px(x - 1, 81, 'stone', 4); } S.end();
    const B = 'teal', cx = KB.x;
    S.beg();
    // The bronze is shaded in whole-step planes lit from the front-left: lit (5–6), mid (4), shade (3), crease (1.6–2).
    // crossed legs: the lap's top edge catches the light, the fronts turn down into shade, a knee dome at each side
    for (let y = 64; y < 81; y++) { const k = (y - 64) / 17, hw = 38 - Math.pow(1 - k, 2.2) * 10;
      for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) { const u = (x + 0.5 - cx) / hw;
        S.px(x, y, B, (k < 0.3 ? 4.6 : k < 0.7 ? 4 : 3.2) + (u < -0.3 ? 0.9 : u > 0.3 ? -0.8 : 0) - (Math.abs(u) > 0.9 ? 0.8 : 0), { n: [u * 0.8, -0.3 + k * 0.5] }); } }
    const knee = (kx, ky, rx, ry, t0) => { for (let y = Math.floor(ky - ry); y <= Math.ceil(ky + ry); y++) for (let x = Math.floor(kx - rx); x <= Math.ceil(kx + rx); x++) { const u = (x + 0.5 - kx) / (rx + 0.01), v = (y + 0.5 - ky) / (ry + 0.01); if (u * u + v * v > 1) continue;
      const l = -(u * 0.6 + v * 0.8); S.px(x, y, B, t0 + (l > 0.5 ? 1.4 : l > 0 ? 0.7 : l > -0.5 ? 0 : -1), { n: [u * 0.9, v * 0.9] }); } };
    knee(47, 74, 10, 6, 4.6); knee(104, 74, 10, 6, 3.4);
    S.rect(42, 70, 4, 2, B, 6.4); S.px(43, 69, B, 6.4); S.px(46, 70, B, 5.6); S.rect(99, 70, 4, 2, B, 5.6); S.px(100, 69, B, 5.6);   // the knees' highlights
    // robe folds over the shins: a dark crease with a lit lip on its light side
    [[56, 66, 52, 79], [62, 67, 60, 80], [89, 67, 91, 80], [95, 66, 99, 79], [70, 70, 68, 80], [81, 70, 83, 80]].forEach(([a, b, c, d]) => { S.line(a, b, c, d, B, 1.8); S.line(a - 1, b, c - 1, d, B, a < 76 ? 6 : 4.8); });
    // the robe hangs between the knees in three shallow loops
    for (let r = 0; r < 3; r++) { const hwl = 6.5 - r * 0.8, y0 = 70 + r * 3; for (let x = Math.round(cx - hwl); x < Math.round(cx + hwl); x++) { const d = (x + 0.5 - cx) / hwl, y = Math.round(y0 + (1 - d * d) * 2.2); S.px(x, y, B, 1.8); S.px(x, y - 1, B, x < cx ? 5.4 : 4.6); } }
    S.hl(40, 80, 71, B, 1.9);
    // body: shoulders, the robe over both of them, the chest in its V, arms folded down to the lap; ie = where the arm
    // meets the body (px from the centre line): a 2-px core shadow on the body side of it, a 2-px lit ridge on the sleeve side
    for (let y = 40; y < 66; y++) { const hw = y < 51 ? 11 + Math.sqrt((y - 40) / 11) * 19 : 30 + (y - 51) * 0.2, ie = 16 + Math.max(0, y - 46) * 5 / 17;
      for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) { const u = (x + 0.5 - cx) / hw, d = Math.abs(x + 0.5 - cx), L = u < 0, s = d - ie; let tn;
        if (y >= 64) tn = y === 64 ? (L ? 6 : 5.5) : (L ? 4.8 : 3.6);                                         // the lap's lit ridge, then its front
        else if (y < 46) tn = (L ? 5.6 : 4.6) - (Math.abs(u) > 0.8 ? 0.8 : 0);                                 // the shoulders' tops face the sky
        else if (s > 0) tn = s <= 2 ? (L ? 6 : 5.5) : L ? (Math.abs(u) > 0.88 ? 4.2 : 5) : (Math.abs(u) > 0.85 ? 2.6 : 3.4);   // sleeves
        else if (s > -2) tn = 1.6;                                                                               // core shadow by the arm
        else tn = L ? 4.8 : d < 3 ? 4.2 : 3.6;                                                                   // the robe over the belly
        S.px(x, y, B, tn, { n: [u * 0.85, y < 47 ? -0.65 : 0] }); } }
    S.hl(Math.round(cx - 33), 63, 12, B, 2); S.hl(Math.round(cx + 21), 63, 12, B, 1.8);   // the sleeves' hems shade the lap
    [[-1], [1]].forEach(([d]) => { for (let k = 0; k < 2; k++) { const a = cx + d * (24 + k * 4.5), c = cx + d * (23 + k * 4.5); S.line(a, 51 + k * 3, c, 62, B, 2); S.line(a - 1, 51 + k * 3, c - 1, 62, B, d < 0 ? 6 : 4.4); }
      S.line(cx + d * 25, 47, cx + d * 31, 58, B, d < 0 ? 6.2 : 4.4); S.line(cx + d * 25, 48, cx + d * 31, 59, B, d < 0 ? 3.4 : 2.2); });   // sleeve folds: crease + lit lip
    // the chest in the robe's V: lit on the left, a step darker on the right, the robe's edges folded over it
    for (let y = 41; y < 56; y++) { const k = (y - 41) / 15, x0 = Math.round(66 + k * 5), x1 = Math.round(85 - k * 5); for (let x = x0; x < x1; x++) S.px(x, y, B, x < cx - 1 ? 5.4 : x < cx + 3 ? 4.8 : 4.2, { n: [0, 0.1] }); }
    S.line(66, 41, 71, 56, B, 1.7); S.line(85, 41, 80, 56, B, 1.5); S.line(65, 41, 70, 56, B, 6.2); S.line(86, 41, 81, 56, B, 4.6); S.line(67, 41, 72, 55, B, 3);
    S.hl(71, 49, 4, B, 3.4); S.hl(76, 49, 4, B, 3); S.hl(72, 48, 3, B, 6.2); S.hl(77, 48, 2, B, 5.2); S.px(75, 51, B, 3.4); S.px(75, 53, B, 3.4);
    for (let k = 0; k < 2; k++) { S.line(58 + k * 4, 45 + k, 65 + k * 2, 57, B, 2.3); S.line(57 + k * 4, 45 + k, 64 + k * 2, 57, B, 6); S.line(93 - k * 4, 45 + k, 86 - k * 2, 57, B, 2.2); }   // robe folds over the chest
    // hands in the mudra: forearms into the lap, the left hand palm up, the right hand laid on it, the thumbs meeting in an arch
    for (let x = 63; x < 89; x++) { const u = (x + 0.5 - cx) / 12.01; S.px(x, Math.min(67, Math.floor(63 + 5 * Math.sqrt(Math.max(0, 1 - u * u))) + 1), B, 1.6); }   // their shadow on the lap
    { const cxh = cx, cyh = 63; for (let y = 58; y <= 68; y++) for (let x = 63; x < 89; x++) { const u = (x + 0.5 - cxh) / 12.01, v = (y + 0.5 - cyh) / 5.01; if (u * u + v * v > 1) continue; const l = -(u * 0.55 + v * 0.8); S.px(x, y, B, l > 0.45 ? 5.6 : l > -0.1 ? 4.6 : 3.6, { n: [u * 0.9, v * 0.9] }); } }
    S.hl(65, 60, 12, B, 6); S.hl(77, 60, 8, B, 5.2); S.hl(64, 67, 24, B, 1.6);
    S.ell(cx - 1.5, 64, 7.5, 2.3, B, 5.6, { dome: 1 }); S.ell(cx + 1, 62.6, 7, 2, B, 6.2, { dome: 1 }); S.hl(cx - 7, 63, 6, B, 3.6); S.hl(cx + 2, 64, 5, B, 3.8); S.hl(cx - 6, 61, 5, B, 7);
    S.hl(cx - 3, 60, 6, B, 2.2); S.px(cx - 4, 61, B, 2.2); S.px(cx + 3, 61, B, 2.2); S.hl(cx - 2, 61, 4, B, 6.6);
    // neck rings
    S.rect(69, 36, 13, 6, B, 3.5); S.hl(69, 38, 13, B, 2.1); S.hl(70, 40, 11, B, 2.1); S.hl(69, 36, 13, B, 4.5);
    // head: long ears, a round face, snail-shell curls, the ushnisha, half-closed eyes, the urna
    [[62, -1], [88, 1]].forEach(([x, d]) => { S.rect(x, 22, 3, 15, B, d < 0 ? 4.6 : 3.4); S.vl(x + (d < 0 ? 0 : 2), 23, 13, B, d < 0 ? 5.6 : 2.6); S.rect(x + (d < 0 ? 1 : 0), 34, 2, 4, B, d < 0 ? 5 : 3.6); S.vl(x + 1, 25, 8, B, 2.1); });
    for (let y = 8; y < 39; y++) for (let x = 60; x < 92; x++) {
      const fu = (x + 0.5 - cx) / 11.4, fv = (y + 0.5 - 27) / 11.6, hu = (x + 0.5 - cx) / 12.2, hv = (y + 0.5 - 21) / 11, uu = (x + 0.5 - cx) / 6.5, uv = (y + 0.5 - 12) / 5;
      const face = fu * fu + fv * fv <= 1 && y >= 20 - Math.round(Math.cos(fu * 1.2) * 1), hair = (hu * hu + hv * hv <= 1 || uu * uu + uv * uv <= 1) && !face;
      if (face) S.px(x, y, B, 4.7 - Math.pow(Math.abs(fu), 3) * 1.5 + (fu < 0 ? 0.6 : -0.4) - Math.max(0, fv) * 0.5, { n: [fu * 0.8, fv * 0.6] });
      else if (hair) { const g = ((x + (Math.floor(y / 2) % 2)) % 2 === 0) && y % 2 === 0; S.px(x, y, B, (g ? 4.8 : 3) + (hu < 0 ? 0.4 : -0.4) - (hv > 0.6 ? 0.6 : 0), { n: [hu * 0.7, hv * 0.7] }); }
    }
    // arched brows, eyes lowered to thin curved lids, a short nose lit on the left, a small mouth
    [[68, 5.7], [80, 5.1]].forEach(([x, tn]) => { S.px(x, 25, B, tn); S.hl(x + 1, 24, 2, B, tn); S.px(x + 3, 25, B, tn); });
    S.px(69, 27, B, 1.5); S.hl(70, 28, 2, B, 1.5); S.hl(80, 28, 2, B, 1.5); S.px(82, 27, B, 1.5); S.hl(69, 29, 3, B, 5); S.hl(80, 29, 3, B, 4.6);
    S.vl(75, 27, 4, B, 5.6); S.vl(76, 27, 4, B, 3.2); S.px(74, 31, B, 2.4); S.px(77, 31, B, 2.4); S.hl(75, 31, 2, B, 4.2);
    S.hl(74, 34, 3, B, 2.1); S.hl(74, 35, 3, B, 4.9);
    S.px(75, 22, 'gold', 6.4); S.px(76, 22, 'gold', 5);
    // a little shade down between the knees, then the moon behind him rims his head, shoulders and upper arms with a thin
    // bright edge
    S.shadow([[cx - 9, 69], [cx + 9, 69], [cx + 5, 80], [cx - 5, 80]], 0.6);
    { const L = S.c, id = S.id, mine = (x, y) => { const p = y * W + x; return x >= 0 && y >= 0 && x < W && L.o[p] === id && L.m[p]; };
      const out = (x, y, dx, dy) => !mine(x + dx, y + dy) && !mine(x + dx * 2, y + dy * 2) && !mine(x + dx * 3, y + dy * 3);   // open sky that way, not the gap by an ear
      const rim = [];
      for (let y = 8; y < 63; y++) for (let x = 35; x < 116; x++) { if (!mine(x, y)) continue; const top = out(x, y, 0, -1), side = y < 52 && (out(x, y, -1, 0) || out(x, y, 1, 0));
        if (top) rim.push([x, y, y < 40 ? 8 : 7]); else if (side) rim.push([x, y, y < 40 ? 7 : 6]); }
      rim.forEach(([x, y, tn]) => S.px(x, y, B, tn, { e: 255 })); }
    S.end({ lit: 1 });
    // the censer: stone plinth, a bronze pot on three feet, a little roof the smoke comes out of
    S.lay('mid'); S.beg(); S.box(106, 84, 22, 6, 'stone', 5, { top: 1 }); [[110], [124]].forEach(([x]) => S.rect(x, 80, 3, 4, 'brass', 3.6)); S.ell(117, 76, 9, 5, 'brass', 4.4, { dome: 1 }); S.hl(108, 72, 19, 'brass', 6.4); S.rect(110, 73, 15, 1, 'teal', 4);
    S.rect(113, 68, 9, 4, 'brass', 3.4); S.px(115, 69, 'fire', 6, { e: 3 }); S.px(119, 69, 'fire', 6, { e: 3 }); S.poly([[108, 68], [127, 68], [122, 63], [113, 63]], 'brass', 4.8, { n: [0, -0.5] }); S.hl(108, 68, 20, 'brass', 3); S.px(107, 67, 'brass', 6); S.px(128, 67, 'brass', 6); S.rect(116, 60, 3, 3, 'brass', 6); S.end();
    // stone lantern (tōrō): base, post, fire box with a lit window, a roof with turned-up eaves, a jewel on top
    S.beg(); S.box(130, 86, 14, 4, 'stone', 5.4, { top: 1 }); S.rect(135, 74, 4, 12, 'stone', 5.8); S.vl(135, 74, 12, 'stone', 7); S.box(131, 70, 12, 4, 'stone', 5.6, { top: 1 }); S.box(132, 62, 10, 8, 'stone', 5.2); S.rect(134, 64, 6, 4, 'lamp', 8, { e: 2 }); S.vl(137, 64, 4, 'stone', 4);
    S.poly([[128, 62], [146, 62], [142, 57], [132, 57]], 'stone', 6.2, { n: [0, -0.6] }); S.px(127, 61, 'stone', 7); S.px(147, 61, 'stone', 7); S.hl(129, 62, 17, 'stone', 3.6); S.ell(137, 55, 2, 2.2, 'stone', 6.8, { dome: 1 }); S.end();
    // the black pine nearest the eye: a leaning trunk, flat pads of needles, the paper lantern's cord
    S.lay('front'); S.beg(); for (let y = 90; y > 18; y--) { const k = (90 - y) / 72, x = 9 + Math.sin(k * 2.6) * 5 + k * 10; S.rect(x - 2 + Math.round(k), y, 5 - Math.round(k * 2), 1, 'wood', 3.6 + (y % 5 === 0 ? -0.8 : 0), { n: [0, 0] }); S.px(x - 2 + Math.round(k), y, 'wood', 5.2); }
    S.line(22, 32, 40, 22, 'wood', 3.2, { w: 2 }); S.line(17, 52, 28, 46, 'wood', 3.2, { w: 2 }); S.line(24, 26, 16, 14, 'wood', 3.4); S.end();
    [[34, 20, 16, 4.5], [16, 13, 12, 4], [50, 24, 12, 3.5], [27, 45, 12, 3.8], [9, 36, 9, 3.4], [40, 14, 10, 3.2]].forEach(([cx, cy, rx, ry], i) => { S.beg(); S.ell(cx, cy, rx, ry, 'leaf', 3.2, { dome: 1 }); for (let x = Math.round(cx - rx + 1); x < cx + rx - 1; x += 2) S.px(x, Math.round(cy - ry + 0.8 + ((x * 3) % 2)), 'leaf', 5.6 + (x % 3) * 0.4); S.hl(Math.round(cx - rx * 0.6), Math.round(cy - ry * 0.3), Math.round(rx * 0.9), 'leaf', 4.6); S.noise(Math.round(cx - rx), Math.round(cy - ry), Math.round(rx * 2), Math.round(ry * 2), 1, 2, 60 + i); S.end(); });
    S.vl(36, 24, 5, 'hair', 2);
    sc.emit({ k: 'leaf', x: 30, y: 22, w: 36, h: 10, rate: 0.25, sp: 5, ang: 2.2, spread: 0.8, life: 4, floor: 92 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 10.2), cut = q > 0.62 && q < 0.66, ga = st.gust != null ? t - st.gust : 99, gust = ga < 2.5 ? Math.sin(Math.min(1, ga / 0.4) * Math.PI / 2) * Math.max(0, 1 - ga / 2.5) : 0;
    X.twinkle(D, t, 8, 40, 11);
    // censer smoke: a ribbon that climbs, sways and thins out; the gust bends it
    D.lay('mid'); const top = kotokuSmoke(D, t, 117.5, 59, gust);
    // little puffs break off the top of the smoke, swell a moment and fade into the night (hard-edged, one tone at a time)
    st.pf = (st.pf || []).filter(p => t >= p.t0 && t - p.t0 < 2.2); if (!(t - (st.puff || -9) < 0.75 && t >= st.puff)) { st.puff = t; st.pf.push({ x: top[0], y: top[1] + 1, t0: t, g: gust }); }
    st.pf.forEach(p => { const e = t - p.t0, a = e / 2.2, x = p.x + e * (2 + p.g * 10), y = p.y - e * 3.2, r = 0.8 + Math.min(a, 0.5) * 3, tn = a < 0.3 ? 4 : a < 0.65 ? 3 : 2;
      D.ell(x, y, r, r * 0.8, 'linen', tn, { e: 255 }); if (a < 0.45) D.px(x - 1, y - 1, 'linen', tn + 1, { e: 255 }); });
    D.px(115, 69, 'fire', 7 + Math.sin(t * 2) * 1.5, { e: 255 }); D.px(119, 69, 'fire', 7 + Math.sin(t * 2 + 1) * 1.5, { e: 255 });
    // stone lantern flame behind its window
    flame(D, 137, 67, 3, t, 0.7);
    // paper lantern swinging on its cord
    D.lay('front'); { const a = Math.sin(t * 1.3) * 0.1 + gust * 0.35, lx = 36 + Math.sin(a) * 8, ly = 29 + Math.cos(a) * 3; D.line(36, 24, lx, ly - 2, 'hair', 2);
      D.beg(); D.ell(lx, ly + 3, 3.5, 4.5, 'red', 7, { e: 4 }); D.hl(Math.round(lx) - 2, Math.round(ly), 5, 'ink', 1); D.hl(Math.round(lx) - 2, Math.round(ly) + 7, 5, 'ink', 1); D.vl(Math.round(lx), Math.round(ly) + 1, 5, 'red', 9, { e: 4 }); D.px(Math.round(lx), Math.round(ly) + 8, 'crimson', 6); D.end({ none: 1 }); }
    // fireflies
    for (let i = 0; i < 5; i++) { const x = 20 + ((i * 29 + t * (3 + i)) % 110), y = 60 + Math.sin(t * 0.7 + i * 2) * 12 + i * 3, b = Math.sin(t * 2.3 + i * 1.7); if (b > 0) D.px(x, y, 'screen', 8 + b * 2, { e: 255 }); }
    // the warrior monk: guard, thrust, spin, and on the beat a great downward cut
    const look = { skin: ['skin', 6], hair: ['linen', 8], top: ['stone', 5.2], bot: ['stone', 3.6], boot: ['wood', 4], robe: 1, hood: ['linen', 8.4] };
    let p1; const dq = (q % 0.2) / 0.2;
    if (q < 0.5) p1 = { aF: 1.1 + Math.sin(dq * Math.PI * 2) * 0.6, eF: -0.6, aB: 1.4 + Math.sin(dq * Math.PI * 2) * 0.4, eB: -0.8, lean: Math.sin(dq * Math.PI * 2) * 0.3, lF: 0.35, lB: -0.3 };
    else if (q < 0.62) { const r = (q - 0.5) / 0.12; p1 = { aF: 1.4 + ease(r) * 1.5, eF: -0.3, aB: 1.6 + ease(r) * 1.2, eB: -0.3, lean: -0.2, lF: 0.3, lB: -0.3, bob: -ease(r) }; }
    else { const r = Math.min(1, (q - 0.62) / 0.05); p1 = { aF: 2.9 - ease(r) * 2.1, eF: -0.2, aB: 2.8 - ease(r) * 1.8, eB: -0.2, lean: 0.6 * ease(r), lF: 0.6, lB: -0.5, kB: 0.4 }; if (q > 0.8) { const b = (q - 0.8) / 0.2; p1.aF = 0.8 + b * 0.3; p1.lean = 0.6 * (1 - b); } }
    D.lay('mid'); worker(D, 33, FY, look, p1, 1);
    if (!X.noWorkers) { const hd = handAt(33, FY, p1, 1), a = hd[2], dx = Math.sin(a), dy = Math.cos(a); D.beg(); D.line(hd[0] - dx * 7, hd[1] - dy * 7, hd[0] + dx * 12, hd[1] + dy * 12, 'wood', 5.6); const tx = hd[0] + dx * 12, ty = hd[1] + dy * 12; D.line(tx, ty, tx + dx * 5 - dy * 1.5, ty + dy * 5 + dx * 1.5, 'iron', 9.6); D.px(tx + dx * 5, ty + dy * 5, 'iron', 11); D.end(); }
    if (cut && !st.cut) { st.cut = 1; st.gust = t; rs.flash(3, 0.6); rs.flash(1, 0.4); rs.burst('leaf', 30, 20, 14, { sp: 16, ang: 1.9, spread: 1.2, life: 3.5, w: 34, h: 12, floor: 92 }); rs.burst('dust', 50, 88, 4, { sp: 8, ang: 1.2, spread: 0.6, life: 1.2, w: 6 }); rs.burst('glint', KB.x, 22, 3, { sp: 16, life: 0.7 }); }
    if (!cut) st.cut = 0;
    // wind lines race across the garden with the gust
    if (ga < 0.9) { D.lay('front'); for (let i = 0; i < 6; i++) { const y = 18 + i * 11 + (i % 2) * 4, x = -20 + ga * 230 - i * 17 + (i % 3) * 9, l = 10 + (i % 3) * 5; for (let k = 0; k < l; k++) { const xx = x - k; if (xx < 4 || xx > W - 5) continue; D.px(xx, y + Math.round(Math.sin((xx + i * 9) * 0.12) * 1.5), 'linen', 9 - k / l * 4, { e: 255 }); } } }
    // the second monk sweeps the paving with a bamboo broom
    const w2 = X.stroll(t, 88, 102, 3.5, 0.3, 1.6), sw = Math.sin(t * 4.2);
    const p2 = { aF: 0.9 + sw * 0.35, eF: -0.4, aB: 0.7 + sw * 0.3, eB: -0.5, lean: 0.35, lF: w2.walking ? w2.pose.lF : 0.2, lB: w2.walking ? w2.pose.lB : -0.2, kF: w2.pose.kF, kB: w2.pose.kB };
    worker(D, w2.x, FY, look, p2, -1);
    if (!X.noWorkers) { const hd = handAt(w2.x, FY, p2, -1); D.beg(); D.line(hd[0] + 2, hd[1] - 6, hd[0] - 5 - sw * 2, FY - 1, 'sand', 6); for (let k = -2; k <= 2; k++) D.line(hd[0] - 5 - sw * 2, FY - 2, hd[0] - 7 - sw * 2 + k * 1.5, FY, 'sand', 7 - Math.abs(k) * 0.6); D.end(); if (R() < 0.05) rs.burst('dust', hd[0] - 7, FY - 1, 1, { sp: 6, ang: -1.4, spread: 0.6, life: 0.8 }); }
    // the urna catches the moonlight now and then
    const uq = steps(t, 4.3); if (uq < 0.15) D.px(KB.x, 22, 'gold', 9 + Math.sin(uq / 0.15 * Math.PI) * 2, { e: 255 });
  },
});

// ───────── 圣索菲亚大教堂 Hagia Sophia (fantasy · epic · luck) ─────────
// dusk over the water: the great dome, its half domes and buttresses in the last light, four minarets, the sun going down
// behind the left pair; a caique in front, the boatman rowing; gulls wheel. Every ~11 s the evening lamps come on: the
// minaret balconies light up ring by ring, the window ring round the dome catches, and a flock bursts off the dome.
const HS = { cx: 75, dy: 44, drx: 22, dry: 14 };
const MIN = [[16, 8, 4, 'back', [34, 52]], [134, 8, 4, 'back', [34, 52]], [29, 18, 5, 'mid', [40, 58]], [121, 18, 5, 'mid', [40, 58]]];   // x, cap top, shaft width, layer, balcony rows
const HWIN = []; for (let k = 0; k < 15; k++) HWIN.push(55 + k * 2.85);
X.def('hagia', {
  amb: [0.3, 0.26],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 66, dusk: 1, sun: [22, 58, 8], far: 'sea', floor: 'water' });                                      // 0 sun
    sc.light({ x: HS.cx, y: 48, z: 18, r: 64, i: 0.7, c: '#ffc070', fl: 'candle', ph: 1.5, tint: 0.45 });                      // 1 the lamps inside, through the windows
    sc.light({ x: 30, y: 40, z: 14, r: 52, i: 0.9, c: '#ffd890', tint: 0.5, bake: false });                                     // 2 minaret lamps + mahya, left
    sc.light({ x: 120, y: 40, z: 14, r: 52, i: 0.9, c: '#ffd890', tint: 0.5, bake: false });                                    // 3 minaret lamps + mahya, right
    sc.light({ x: 75, y: 84, z: 20, r: 60, i: 0.7, c: '#ffb060', fl: 'candle', ph: 4, tint: 0.4 });                            // 4 quay lamps
    sc.light({ x: 62, y: 88, z: 30, r: 34, i: 0.8, c: '#ffb050', fl: 'candle', ph: 2, tint: 0.5 });                            // 5 the boat's lantern
    const Wm = 'brick', q = (x0, y0, w, h, tn) => { S.rect(x0, y0, w, h, Wm, tn); S.hl(x0, y0, w, Wm, tn + 1.2, { n: [0, -0.7] }); S.vl(x0, y0 + 1, h - 1, Wm, tn + 0.6, { n: [-0.6, 0] }); S.vl(x0 + w - 1, y0 + 1, h - 1, Wm, tn - 1, { n: [0.6, 0] }); };
    const arch = (x, y, w, h, lit) => { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const u = (xx + 0.5 - w / 2) / (w / 2), top = yy < w / 2 ? Math.sqrt(Math.max(0, 1 - Math.pow((w / 2 - yy - 0.5) / (w / 2), 2))) : 1; if (Math.abs(u) > top + 0.05) continue; S.px(x + xx, y + yy, lit ? 'lamp' : 'ink', lit ? 6.4 + (yy > h / 2 ? 0.8 : 0) : 1.6, lit ? { e: 2 } : NOE); } };
    // the quay and sea wall under it all
    S.lay('mid'); S.beg(); TX.ashlar(S, 0, 83, W, 7, 'mstone', 4.6, { bh: 4, bw: 12, crack: 0.1 }); S.hl(0, 83, W, 'mstone', 6.6, { n: [0, -0.8] }); S.end({ none: 1 }); S.lay('back');
    // far minarets
    MIN.filter(m => m[3] === 'back').forEach(m => hagiaMinaret(S, m));
    // the dome on its window drum, the tympanum under it, buttress towers, a half dome and two exedrae cascading down, the main block
    const dome = (cx, by, rx, ry, tn, ribs) => { for (let y = Math.floor(by - ry); y <= by; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - by) / ry; if (u * u + v * v > 1) continue; const rib = ribs && Math.abs(Math.sin(Math.asin(clamp(u, -1, 1)) * ribs)) < 0.18 && v > -0.85; S.px(x, y, 'stone', tn - Math.pow(Math.abs(u), 3) * 1.8 + (u < 0 ? 0.5 : -0.4) + (rib ? -1 : 0) + (v < -0.75 ? 0.7 : 0), { n: [u * 0.8, v * 0.8] }); } };
    S.beg(); q(50, 44, 50, 15, 5.2); for (let x = 53; x < 97; x += 5) arch(x, 47, 3, 6, (x * 3) % 7 !== 2); S.end();
    S.beg(); dome(HS.cx, HS.dy - 1, HS.drx, HS.dry, 5.8, 12); S.rect(HS.cx - 22, HS.dy - 1, 45, 3, Wm, 6); S.hl(HS.cx - 22, HS.dy - 1, 45, Wm, 7.4); HWIN.forEach(x => S.rect(x, HS.dy, 1, 2, 'ink', 1.4)); S.end();
    S.beg(); q(31, 48, 11, 35, 5.4); q(108, 48, 11, 35, 4.6); S.poly([[31, 48], [42, 48], [39, 44], [34, 44]], Wm, 6.2); S.poly([[108, 48], [119, 48], [116, 44], [111, 44]], Wm, 5.4); for (let y = 54; y < 82; y += 9) { arch(34, y, 3, 5, 0); arch(112, y, 3, 5, 0); } S.end();
    S.beg(); q(40, 60, 70, 23, 5); for (let x = 43; x < 107; x += 7) arch(x, 72, 4, 8, (x * 7) % 3 !== 0); S.hl(40, 69, 70, Wm, 6.4); S.hl(40, 70, 70, Wm, 3.6); S.end();
    S.beg(); dome(HS.cx, 60, 19, 9, 5.4, 8); S.rect(HS.cx - 19, 60, 39, 2, Wm, 6.4); S.hl(HS.cx - 19, 60, 39, Wm, 7.2); for (let x = 60; x < 92; x += 4) arch(x, 62, 2, 4, 1); S.end();
    S.beg(); dome(50, 62, 9, 5, 5.2, 5); dome(100, 62, 9, 5, 4.8, 5); S.hl(41, 62, 19, Wm, 6.8); S.hl(91, 62, 19, Wm, 6.2); S.end();
    S.beg(); S.vl(HS.cx, 24, 6, 'gold', 7); S.ell(HS.cx, 25, 1.5, 1.5, 'gold', 8, { dome: 1 }); S.px(HS.cx - 1, 20, 'gold', 8); S.px(HS.cx - 2, 21, 'gold', 7.6); S.px(HS.cx - 2, 22, 'gold', 7.6); S.px(HS.cx - 1, 23, 'gold', 8); S.px(HS.cx, 19, 'gold', 7); S.px(HS.cx, 23, 'gold', 7); S.end();
    // near minarets in front of the buttresses
    S.lay('mid'); MIN.filter(m => m[3] === 'mid').forEach(m => hagiaMinaret(S, m));
    // quay lamps on posts
    [58, 92, 104].forEach(x => { S.beg(); S.vl(x, 78, 5, 'iron', 4); S.rect(x - 1, 75, 3, 3, 'iron', 5); S.px(x, 76, 'lamp', 9, { e: 5 }); S.end(); });
    // the caique nearest the eye (hull only: it bobs, so it is animated)
    sc.emit({ k: 'mist', x: 100, y: 90, w: 60, rate: 0.35, sp: 2, ang: 1.5, spread: 0.4, life: 3 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 11), on = q > 0.3 && q < 0.95, since = (q - 0.3) * 11, off = q > 0.9 ? (0.95 - q) / 0.05 : 1;
    X.twinkle(D, t, 5, 26, 21);
    // sun glitter on the water and ripples across the bay
    X.sea(D, t, 91, 104, 22);
    // the lamps: balcony rings light one by one (outer left, outer right, then the inner pair), the window ring sweeps round
    MIN.forEach((m, mi) => m[4].forEach((by, bi) => { const at = (mi * 2 + bi) * 0.18, k = on ? clamp((since - at) / 0.15, 0, 1) * clamp(off, 0, 1) : 0; if (k <= 0) return; D.lay(m[3]);
      for (let x = m[0] - 3; x <= m[0] + 3; x++) { D.px(x, by + 1, 'lamp', 6 + k * 3 + ((x + bi) % 2 ? 1.5 : 0), { e: 255 }); if ((x + bi) % 2 === 0) D.px(x, by, 'lamp', 5 + k * 3, { e: 255 }); }
      if (k > 0.9 && !st['m' + mi + bi]) { st['m' + mi + bi] = 1; rs.burst('glint', m[0], by + 1, 1, { sp: 0, life: 0.4 }); } }));
    // the mahya: a garland of lamps slung between the outer minarets, lit bulb by bulb from both ends to the middle
    if (on) { D.lay('back'); for (let x = 17; x <= 133; x++) { const u = (x - 75) / 58, y = 35 + 7 * (1 - u * u), at = 0.7 + (1 - Math.abs(u)) * 1.1, k = clamp((since - at) / 0.12, 0, 1) * clamp(off, 0, 1);
      if (x % 4 === 1) { if (k > 0) { D.px(x, y + 1, 'lamp', 7 + k * 4 - (Math.sin(t * 6 + x) > 0.8 ? 1.5 : 0), { e: 255 }); if (k > 0.8) D.px(x, y + 2, 'lamp', 6.5, { e: 255 }); } else D.px(x, y + 1, 'iron', 3); }
      else if (since > 0.5) D.px(x, y, 'hair', 2); }
      if (since > 1.8 && !st.mh) { st.mh = 1; rs.flash(1, 0.7); rs.burst('glint', 75, 43, 4, { sp: 30, life: 0.6 }); } }
    else st.mh = 0;
    if (!on) MIN.forEach((m, mi) => m[4].forEach((_, bi) => { st['m' + mi + bi] = 0; }));
    rs.mul[2] = on ? clamp((since - 0.1) / 0.4, 0, 1) * off : 0; rs.mul[3] = on ? clamp((since - 0.3) / 0.4, 0, 1) * off : 0;
    D.lay('back'); HWIN.forEach((x, i) => { const at = 1.2 + Math.abs(x - HS.cx) / 24 * 0.8, k = on ? clamp((since - at) / 0.2, 0, 1) * clamp(off, 0, 1) : 0; const fl = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3); D.px(x, HS.dy + 1, 'lamp', k > 0 ? 7 + k * 3 : 3 + fl * 1.5, { e: 255 }); D.px(x, HS.dy + 2, 'lamp', k > 0 ? 6 + k * 2 : 2.4 + fl, { e: 255 }); });
    if (on && since > 1.2 && since < 1.6) rs.flash(1, 0.3);
    // a flock bursts off the dome as the lamps catch, and wheels away
    if (on && since < 3.2) { const k = since; for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.15 + 0.7 * ((i * 0.37) % 1)), sp = 16 + (i % 3) * 7, x = HS.cx + Math.cos(a) * sp * k + Math.sin(k * 3 + i) * 2, y = 32 + Math.sin(a) * sp * k * 0.7 + k * k * 2; if (x < 5 || x > W - 6 || y < 5) continue; gull(D, x, y, t * 9 + i, 1); } }
    // gulls wheeling over the water
    [[0, 30, 16], [2.1, 22, 11], [4.4, 38, 9]].forEach(([ph, r, y0], i) => { const a = t * 0.35 + ph, x = 75 + Math.cos(a) * (40 + r), y = y0 + Math.sin(a * 2) * 5; gull(D, x, y, t * 5 + i * 2, Math.cos(a) < 0 ? -1 : 1, 1); });
    // the caique: a high-prowed boat that rocks on the swell, the boatman rowing standing up (he stands clear of the pale
    // minaret plinth, against the red buttress and the dark water, so his shirt reads)
    const bob = Math.sin(t * 1.7) * 1, rk = Math.round(bob); D.lay('front'); D.dy = rk;
    D.beg(); D.poly([[20, 93], [60, 94], [67, 88], [69, 88], [65, 97], [58, 100], [26, 100], [21, 97], [18, 92]], 'wood', 4.6, { n: [0, 0.3] }); D.hl(21, 94, 40, 'wood', 6.8, { n: [0, -0.7] }); D.hl(22, 96, 40, 'crimson', 6.4); D.hl(23, 97, 38, 'teal', 5.4); D.hl(26, 99, 32, 'wood', 3); D.px(68, 87, 'wood', 7); D.px(18, 91, 'wood', 6.4); D.end();
    D.beg(); D.vl(62, 84, 9, 'iron', 4); D.rect(61, 86, 3, 3, 'iron', 5); D.px(62, 87, 'lamp', 10, { e: 255 }); D.end();
    const rq = steps(t, 2.6), stroke = Math.sin(rq * Math.PI * 2), look = { skin: ['skin', 5.6], hair: ['hair', 3], top: ['linen', 7], bot: ['denim', 4], boot: ['leather', 3], cap: ['crimson', 6] };
    const pose = { aF: 1.4 + stroke * 0.5, eF: -0.6, aB: 1.1 + stroke * 0.4, eB: -0.8, lean: 0.3 + stroke * 0.3, lF: 0.25, lB: -0.25 }, BX = 38;
    worker(D, BX, 94, look, pose, 1);
    if (!X.noWorkers) { const sx = BX + Math.round(pose.lean * 3); D.hl(sx - 3, 80, 7, 'crimson', 6); D.px(sx - 3, 81, 'crimson', 4.6); D.px(sx - 4, 81, 'crimson', 5);   // a red sash, its end hanging behind
      const hd = handAt(BX, 94, pose, 1), ox = BX + 10 + stroke * 5, oy = 101; D.beg(); D.line(hd[0] - 2, hd[1] - 3, ox, oy, 'wood', 6); D.rect(Math.round(ox) - 1, oy - 1, 3, 2, 'wood', 5); D.end(); if (stroke > 0.7 && R() < 0.4) rs.burst('drip', ox, 99 + rk, 1, { sp: 10, ang: -0.6, spread: 0.8, life: 0.5, floor: 101 }); }
    D.dy = 0;
    for (let k = 0; k < 3; k++) { const x = 24 + ((t * 7 + k * 14) % 44); D.hl(x, 101, 3, 'water', 8, { e: 255 }); }
  },
});
// a minaret: a plinth, a slender shaft, balconies with a lamp rail, a lead-grey cone and a gold finial
function hagiaMinaret(S, m) {
  const [x, top, w, , balc] = m, hw = (w - 1) / 2;
  S.beg(); S.box(x - hw - 2, 70, w + 4, 14, 'bone', 6.4, { top: 1 }); S.cyl(x - hw, top + 11, w, 60 - top, 'bone', 7.4, { rim: 2 });
  balc.forEach(by => { S.rect(x - hw - 2, by, w + 4, 2, 'bone', 8, { n: [0, -0.5] }); S.rect(x - hw - 1, by + 2, w + 2, 2, 'bone', 5); S.px(x - hw - 2, by + 1, 'bone', 6); });
  for (let k = 0; k < 11; k++) { const hh = Math.round((k / 10) * (hw + 1)); S.rect(x - hh, top + k, hh * 2 + 1, 1, 'stone', 5.6 + (k === 10 ? -1 : 0), { n: [0, -0.4] }); S.px(x - hh, top + k, 'stone', 6.8); }
  S.vl(x, top - 3, 3, 'gold', 7.4); S.px(x, top - 4, 'gold', 9); S.end();
}
// a gull: two wing strokes that flap — up a 'V', down a 'ʌ' with the tips hanging (never a flat bar); small for far birds
function gull(D, x, y, ph, dir, far) {
  const f = Math.sin(ph) > 0 ? 1 : 0, c = far ? 8 : 9; x = Math.round(x); y = Math.round(y);
  D.px(x, y, 'bone', c, { e: 255 });
  if (f) { D.px(x - 1, y - 1, 'bone', c, { e: 255 }); D.px(x + 1, y - 1, 'bone', c, { e: 255 }); D.px(x - 2, y - 2, 'bone', c - 1, { e: 255 }); D.px(x + 2, y - 2, 'bone', c - 1, { e: 255 }); }
  else { D.px(x - 1, y, 'bone', c, { e: 255 }); D.px(x + 1, y, 'bone', c, { e: 255 }); D.px(x - 2, y + 1, 'bone', c - 1, { e: 255 }); D.px(x + 2, y + 1, 'bone', c - 1, { e: 255 }); }
}
const NOE = {};

// ───────── 紫禁城 the Forbidden City (medieval · legendary · misc) ─────────
// moonlit: the Hall of Supreme Harmony on its three white marble terraces, double eaves of gold tiles with dragon ridge
// ends, blue-green brackets, red columns, lattice doors glowing; two great red lanterns sway nearest the eye, clouds pass
// the moon, the night watchman walks the court with his lantern and gong. Every ~9 s fireworks go up behind the hall:
// a gold peony, then a red one, lighting the golden roofs from above.
const FC = { cx: 75 };
const FW = [{ x: 48, y: 18, at: 0, m: 'lamp', c: '#ffd070', tail: 'fire', R: 24, n: 32 }, { x: 101, y: 15, at: 0.6, m: 'red', c: '#ff6070', tail: 'pink', R: 22, n: 28 }, { x: 76, y: 11, at: 1.25, m: 'linen', c: '#fff0d0', tail: 'lamp', R: 15, n: 20 }];
function fcRoof(S, cx, rh, eh, yR, yE, lift, tn) {
  // a hipped roof of gold tiles: a level main ridge, concave hips falling to eaves that sweep up at the corners
  for (let x = Math.floor(cx - eh - lift); x <= Math.ceil(cx + eh + lift); x++) { const d = Math.abs(x + 0.5 - cx), sg = x + 0.5 < cx ? -1 : 1, k = d <= rh ? 0 : (d - rh) / (eh - rh);
    const up = Math.pow(clamp((d - eh * 0.72) / (eh * 0.28 + lift), 0, 1), 1.7) * lift, eave = Math.round(yE - up), top = Math.round(Math.min(eave - 2, yR + (yE - yR) * (1 - Math.pow(1 - clamp(k, 0, 1), 2.2)) - up * 0.9));
    for (let y = top; y <= eave; y++) { const v = (y - top) / Math.max(1, eave - top), rid = (x & 1) === 0; S.px(x, y, 'gold', tn + (rid ? 0.6 : -0.6) + v * 0.8 - (sg > 0 ? 0.4 : 0), { n: [sg * 0.2, -0.75 + v * 0.35] }); }
    if (d > rh) { S.px(x, top, 'gold', tn + 2.2, { n: [0, -0.9] }); S.px(x, top + 1, 'gold', tn + 1.1); }
    S.px(x, eave, 'gold', tn + 2, { n: [0, 0.3] }); S.px(x, eave + 1, 'ink', 1.4); }
  S.rect(Math.round(cx - rh), yR - 2, Math.round(rh * 2) + 1, 3, 'gold', tn + 1, { n: [0, -0.6] }); S.hl(Math.round(cx - rh), yR - 2, Math.round(rh * 2) + 1, 'gold', tn + 3); S.hl(Math.round(cx - rh), yR, Math.round(rh * 2) + 1, 'gold', tn - 1.4);
}
X.def('forbidden', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 72, moon: [124, 16, 7], far: 'none', floor: 'stone' });                                            // 0 moon
    S.ell(124, 16, 14.5, 14.5, 'night', 3, { e: 255, ring: 2.5 }); S.ell(124, 16, 12, 12, 'night', 4, { e: 255, ring: 2.6 });   // the halo in whole steps (the kit's middle ring sits on a half step and checkers)
    sc.light({ x: FC.cx, y: 62, z: 16, r: 74, i: 0.85, c: '#ffc070', fl: 'candle', ph: 2, tint: 0.45 });                        // 1 lamplight behind the lattice doors
    sc.light({ x: 12, y: 36, z: 30, r: 58, i: 1, c: '#ff5a40', fl: 'candle', tint: 0.55 });                                     // 2 red lantern left
    sc.light({ x: 138, y: 36, z: 30, r: 58, i: 1, c: '#ff5a40', fl: 'candle', ph: 1.7, tint: 0.55 });                           // 3 red lantern right
    FW.slice(0, 2).forEach(f => sc.light({ x: f.x, y: f.y, z: 40, r: 120, i: 1.1, c: f.c, tint: 0.5, bake: false }));            // 4, 5 fireworks (the third shell lights both)
    // far halls and the palace wall along the horizon: flat silhouettes
    S.lay('wall'); const sil = (x0, x1, y, h) => { for (let x = x0 - 3; x <= x1 + 3; x++) { const u = Math.abs(x - (x0 + x1) / 2) / ((x1 - x0) / 2 + 3), top = y - h + Math.round(Math.max(0, u - 0.6) * h * 0.4) - (u > 0.93 ? 1 : 0); for (let yy = top; yy < 80; yy++) S.px(x, yy, 'night', yy < y ? 2.2 : 1.6, { e: 255 }); } };
    sil(4, 26, 70, 6); sil(122, 146, 69, 7); sil(34, 50, 66, 4); sil(98, 114, 66, 4); S.rect(0, 74, W, 6, 'night', 1.2, { e: 255 }); S.hl(0, 74, W, 'night', 2.4, { e: 255 });
    // the triple marble terrace with balustrades, dragon-head spouts and the imperial ramp up the middle
    S.lay('back'); const tier = (x0, x1, y0, y1, tn) => { S.beg(); S.rect(x0, y0, x1 - x0, y1 - y0, 'bone', tn); S.hl(x0, y0, x1 - x0, 'bone', tn + 1.4, { n: [0, -0.8] }); S.hl(x0, y1 - 1, x1 - x0, 'bone', tn - 2); for (let x = x0 + 3; x < x1 - 2; x += 7) { S.px(x, y1 - 2, 'bone', tn + 1.4); S.px(x, y1 - 1, 'bone', tn - 0.5); S.px(x + 1, y1 - 1, 'ink', 1); }
      S.hl(x0, y0 - 3, x1 - x0, 'bone', tn + 0.8); for (let x = x0; x < x1; x += 3) { S.vl(x, y0 - 3, 3, 'bone', tn + 1.2, { n: [-0.4, 0] }); S.px(x, y0 - 4, 'bone', tn + 2); } S.hl(x0, y0 - 1, x1 - x0, 'bone', tn - 1.2); S.end(); };
    tier(30, 120, 74, 78, 6.6); tier(20, 130, 80, 85, 6.2); S.lay('mid'); tier(9, 141, 87, 91, 5.8);
    // the stair up the terraces: a landing through the top balustrade, then two-pixel steps (lit tread, dark riser) widening
    // from 18 to 24 as they come down, a parapet each side, and the carved imperial ramp sunk in the middle with its dragon
    S.lay('back'); S.beg(); S.rect(66, 70, 18, 4, 'bone', 7, { n: [0, -0.8] }); S.hl(66, 70, 18, 'bone', 5.6); S.vl(65, 69, 5, 'bone', 7.8); S.vl(84, 69, 5, 'bone', 5.4); S.px(65, 68, 'bone', 8.6); S.px(84, 68, 'bone', 6.4); S.end({ none: 1 });
    S.lay('mid'); S.beg();
    for (let y = 74; y < 90; y++) { const hw = Math.round(9 + 3 * (y - 74) / 15), rw = Math.round(3 + (y - 74) / 15), x0 = 75 - hw, x1 = 75 + hw, tread = (y & 1) === 0;
      for (let x = x0; x < x1; x++) { if (x >= 75 - rw && x < 75 + rw) continue; S.px(x, y, 'bone', tread ? 7.5 + (x < 75 ? 0.3 : -0.3) : 4.5 + (x < 75 ? 0.2 : -0.3), { n: tread ? [0, -0.8] : [0, 0.2] }); }
      S.rect(75 - rw, y, rw * 2, 1, 'bone', 5); S.px(75 - rw, y, 'bone', 3.5); S.px(75 + rw - 1, y, 'bone', 7);   // the ramp: sunk, its left wall in shadow, its right wall lit
      S.px(x0 - 1, y, 'bone', 8, { n: [-0.6, -0.4] }); S.px(x1, y, 'bone', 5.2, { n: [0.6, 0] }); S.px(x0 - 2, y, 'bone', 2); S.px(x1 + 1, y, 'bone', 1.6); }
    [[74, 0], [77, 1], [80, 0], [83, -1], [86, 0]].forEach(([y, o], i) => { const x = 74 + o; S.rect(x, y, 2, 2, 'bone', 7.5, { n: [-0.3, -0.5] }); S.px(x + 2, y + 1, 'bone', 3.5); S.px(x, y + 2, 'bone', 3.5); if (i === 0) S.px(x - 1, y, 'bone', 7.5); });
    [[64, 72], [85, 72], [61, 89], [88, 89]].forEach(([x, y], i) => S.px(x, y, 'bone', i % 2 ? 6 : 9));
    S.end({ none: 1 }); S.lay('back');
    // the hall: red columns, glowing lattice doors, a beam, blue-green brackets
    S.beg(); S.rect(36, 57, 79, 15, 'red', 3.4);
    for (let i = 0; i < 8; i++) { const x = 36 + i * 10, door = i > 0 && i < 7; if (door) { S.rect(x + 2, 59, 8, 13, 'lamp', 5.8, { e: 2 }); for (let yy = 60; yy < 71; yy += 2) S.hl(x + 2, yy, 8, 'red', 3.2); for (let xx = x + 3; xx < x + 10; xx += 2) S.vl(xx, 59, 13, 'red', 3.4); S.hl(x + 2, 65, 8, 'gold', 5); S.hl(x + 2, 59, 8, 'red', 5); }
      else S.rect(x + 2, 59, 8, 13, 'red', 4.4); }
    for (let i = 0; i < 9; i++) { const x = 35 + i * 10; S.rect(x, 56, 3, 16, 'red', 5.6); S.vl(x, 56, 16, 'red', 7, { n: [-0.6, 0] }); S.vl(x + 2, 56, 16, 'red', 3.8, { n: [0.6, 0] }); }
    S.rect(33, 53, 85, 4, 'red', 5); S.hl(33, 53, 85, 'gold', 6.4); S.hl(33, 55, 85, 'teal', 5.2); S.rect(33, 50, 85, 3, 'teal', 4.4); for (let x = 34; x < 117; x += 3) { S.px(x, 50, 'tile', 6.8); S.px(x, 51, 'gold', 7); S.px(x + 1, 52, 'teal', 2.6); }
    S.end();
    S.beg(); fcRoof(S, FC.cx, 34, 50, 43, 49, 5, 5.6); S.end();
    // upper storey: brackets, the name plaque, the upper hipped roof with its ridge, dragon ridge ends, little ridge beasts
    S.beg(); S.rect(46, 36, 59, 7, 'red', 4); S.rect(46, 36, 59, 2, 'teal', 4.4); for (let x = 47; x < 104; x += 3) { S.px(x, 36, 'tile', 6.8); S.px(x, 37, 'gold', 7); } S.hl(46, 38, 59, 'gold', 6);
    S.box(70, 37, 11, 6, 'tile', 3.4); S.rect(71, 38, 9, 4, 'tile', 2.4); for (let k = 0; k < 3; k++) { S.px(72 + k * 3, 39, 'gold', 8.4); S.px(73 + k * 3, 40, 'gold', 7); } S.hl(70, 37, 11, 'gold', 7.6); S.end();
    S.beg(); fcRoof(S, FC.cx, 22, 38, 26, 35, 5, 5.8);
    [[53, 1], [97, -1]].forEach(([x, d]) => S.spr(x - 2, 18, d > 0 ? ['gg...', 'gGg..', '.gGg.', '..gg.', '.ggg.', 'gGgg.', 'ggggg', 'gg.gg'] : ['...gg', '..gGg', '.gGg.', '.gg..', '.ggg.', '.ggGg', 'ggggg', 'gg.gg'], { g: ['gold', 5.2], G: ['gold', 8.4] }));
    [[35, 30, -1], [115, 30, 1], [26, 44, -1], [124, 44, 1]].forEach(([x, y, d]) => { for (let k = 0; k < 3; k++) { S.px(x + d * k * 2, y + k, 'gold', 7.6); S.px(x + d * k * 2, y + k - 1, 'gold', 4.6); } });
    S.end();
    // two great red palace lanterns nearest the eye, on cords from above (they sway: drawn live)
    sc.emit({ k: 'dust', x: 75, y: 60, w: 120, h: 40, rate: 0.4, sp: 2, life: 4 });
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 9.2), fs = (q - 0.15) * 9.2;
    X.twinkle(D, t, 7, 34, 31);
    // clouds drift across the sky and over the moon (the moonlight dims behind them)
    D.lay('wall'); let cover = 0;
    [[0, 22, 26, 0.9], [0.55, 12, 20, 1.3]].forEach(([ph, y, w, sp]) => { const cx = ((t * sp * 2.2 + ph * 180) % 190) - 20; for (let k = 0; k < 3; k++) { const x0 = Math.round(cx - w / 2 + k * 5), ww = w - k * 8, yy = y + k; if (ww < 4) continue; D.hl(x0, yy, ww, 'night', 3 + (k === 0 ? 0.7 : 0), { e: 255 }); D.hl(x0 + 2, yy - 1, ww - 6, 'night', 3.6, { e: 255 }); } if (Math.abs(cx - 124) < w / 2 + 4 && Math.abs(y - 16) < 10) cover = Math.max(cover, 1 - Math.abs(cx - 124) / (w / 2 + 4)); });
    rs.mul[0] = 1 - cover * 0.45;
    // fireworks: a rocket climbs with a spark trail, bursts into a ring of streaks that droop and fade, lights the roofs
    const env = [0, 0, 0]; FW.forEach((f, i) => { const a = fs - f.at; if (a < 0 || a > 3) { st['b' + i] = 0; return; }
      const x0 = f.x + (i === 1 ? -4 : 4), y0 = 60, rise = 0.85;
      if (a < rise) { const k = ease(a / rise), x = x0 + (f.x - x0) * k, y = y0 + (f.y - y0) * k; D.lay('wall'); D.px(x, y, 'lamp', 11, { e: 255 }); for (let j = 1; j < 6; j++) { const kk = ease(Math.max(0, a - j * 0.03) / rise); D.px(x0 + (f.x - x0) * kk + (j % 2), y0 + (f.y - y0) * kk, 'fire', 10 - j * 1.3, { e: 255 }); } return; }
      const b = a - rise; if (!st['b' + i]) { st['b' + i] = 1; rs.burst('glint', f.x, f.y, 6, { sp: 30, life: 0.9 }); rs.flash(1, 0.2); }
      env[i] = b < 0.08 ? b / 0.08 : Math.exp(-(b - 0.08) * 1.8);
      D.lay('wall'); const n = f.n, Rr = f.R, life = b / 2.1;
      [[1, 0, n, 5], [0.55, 0.5, n >> 1, 3]].forEach(([rk, off, nn, tl]) => { for (let k = 0; k < nn; k++) { const ang = (k + off) / nn * Math.PI * 2 + i * 0.4, sp2 = (k % 3 === 1 ? 0.86 : 1) * Rr * rk, r = sp2 * (1 - Math.exp(-b * 3.2)), dr = b * b * 5 * rk, c = Math.cos(ang), sn = Math.sin(ang) * 0.9;
        if (life > 0.62 && ((k * 7 + Math.floor(t * 18)) % 3) === 0) continue;
        for (let j = 0; j < tl; j++) { const rr = r - j * (0.6 + 1.4 * Math.exp(-b * 2)); if (rr < 1) break; const x = f.x + c * rr, y = f.y + sn * rr + dr * (1 - j * 0.12); if (y > 70 || y < 4) continue;
          const tn = j === 0 ? (life < 0.25 ? 11 : 10.4 - life * 4.5) : 9.6 - j * 1.3 - life * 4, m = life < 0.3 || j < 2 ? f.m : f.tail; if (tn < 3) break; D.px(x, y, m, tn, { e: 255 }); } } });
      if (b < 0.14) { D.rect(f.x - 1, f.y - 1, 3, 3, 'lamp', 11, { e: 255 }); D.hl(f.x - 4, f.y, 9, 'lamp', 10, { e: 255 }); D.vl(f.x, f.y - 4, 9, 'lamp', 10, { e: 255 }); }
      if (b > 0.9 && b < 2.2 && i < 2) for (let k = 0; k < 5; k++) { const x = f.x + Math.cos(k * 2.4 + i) * Rr * 0.7 + Math.sin(t * 7 + k) * 2, y = f.y + Math.sin(k * 2.4 + i) * Rr * 0.6 + b * b * 4; if (((k + Math.floor(t * 15)) % 2) === 0 && y < 70) D.px(x, y, 'linen', 10, { e: 255 }); } });
    rs.mul[4] = Math.max(env[0], env[2] * 0.55); rs.mul[5] = Math.max(env[1], env[2] * 0.55);
    // red lanterns: swaying on their cords, a gold cap and tassel
    // (each lantern breathes with its own light, 2 / 3, in whole tone steps so the big red body never dithers)
    D.lay('front'); [[12, 0, 0], [138, 1.9, 1.7]].forEach(([x, ph, lph]) => { const a = Math.sin(t * 1.1 + ph) * 0.09, len = 22, lx = x + Math.sin(a) * len, ly = 5 + Math.cos(a) * len;
      const fk = (0.08 * n1(t * 9 + lph) + 0.03 * n1(t * 23 + lph)) / 0.11, b = Math.round(fk * 0.75), G = { e: 255 };
      D.line(x, 3, lx, ly, 'hair', 2.4); D.beg(); D.rect(lx - 3, ly, 7, 2, 'gold', 6.4); D.ell(lx + 0.5, ly + 9, 7, 7.5, 'red', 7 + b, G); for (let k = -4; k <= 4; k += 2) D.vl(Math.round(lx + 0.5 + k), ly + 3, 12 - Math.abs(k), 'red', 5 + b, G); D.vl(Math.round(lx) + 2, ly + 4, 9, 'red', 9 + b, G);
      D.rect(lx - 3, ly + 16, 7, 2, 'gold', 6); D.vl(Math.round(lx + 0.5 + Math.sin(a * 3) * 2), ly + 18, 6, 'crimson', 7); D.px(Math.round(lx + 0.5 + Math.sin(a * 3) * 2), ly + 24, 'gold', 7); D.end({ none: 1 }); });
    // the night watchman: lantern on a pole, a small gong he strikes when he stops
    const w = X.stroll(t, 24, 126, 6, 0.4, 2.4), look = { skin: ['skin', 6], hair: ['hair', 2], top: ['night', 5], bot: ['night', 3.4], boot: ['ink', 2], robe: 1, hat: ['ink', 2.6] };
    const strike = !w.walking && steps(t, 0.9) < 0.2, pose = w.walking ? Object.assign(w.pose, { aB: 1.3, eB: -0.9, aF: 0.6 + w.pose.aF * 0.3, eF: -0.9 }) : { aB: 1.3, eB: -0.9, aF: strike ? 1.9 : 1.2, eF: strike ? -0.3 : -1.1, lF: 0.1, lB: -0.1 };
    const WY = 99; D.lay('front'); worker(D, w.x, WY, look, pose, w.dir);
    if (!X.noWorkers) { const lx = w.x - w.dir * 7, ly = WY - 30 + Math.round(pose.bob || 0), sw = Math.round(Math.sin(t * 3) * (w.walking ? 1 : 0.3));
      D.beg(); D.line(w.x - w.dir * 2, WY - 17, lx, ly - 2, 'wood', 5); D.line(lx, ly - 2, lx + sw, ly + 1, 'hair', 2); D.end();
      D.beg(); D.ell(lx + sw, ly + 4, 2.5, 3.2, 'red', 8.6, { e: 255 }); D.px(lx + sw, ly + 3, 'lamp', 10, { e: 255 }); D.hl(lx + sw - 1, ly + 1, 3, 'ink', 1); D.hl(lx + sw - 1, ly + 7, 3, 'ink', 1); D.end({ none: 1 });
      rs.dl.push({ x: lx + sw, y: ly + 4, z: 18, r: 24, i: 0.55, rgb: [255, 120, 80], tint: 0.4 });
      const hd = handAt(w.x, WY, pose, w.dir); D.beg(); D.ell(hd[0] + w.dir * 2, hd[1] + 2, 2.5, 2.5, 'brass', 7, { dome: 1 }); D.px(hd[0] + w.dir * 2, hd[1] + 2, 'brass', 4); D.end();
      if (strike && !st.gong) { st.gong = 1; rs.burst('glint', hd[0] + w.dir * 2, hd[1] + 2, 1, { sp: 6, life: 0.4 }); } if (!strike) st.gong = 0; }
  },
});

// what each pixel room shows, in words (M.ROOM_D; docs/effects.md §R is generated from it)
const D_ = {
  forbidden: '月夜里，太和殿立在三层汉白玉台基上，正中一道台阶，中间是刻着龙纹的御路，重檐金瓦、屋脊两端的鸱吻，青绿斗拱下是一排红柱，格子门里透出暖光；云慢慢飘过月亮，近处两盏大红灯笼随风轻摆；更夫提着灯笼沿着台基走，停下来敲一下锣；隔一会儿殿后升起烟花，先开一朵金色、再开一朵红色，把金色屋顶照得发亮',
  hagia: '暮色的海上，大圆顶、半圆顶和扶壁被夕阳照成暖红，四座宣礼塔立在两侧，太阳正落在左边塔后；圆顶底下一圈小窗透着烛光，海面上波光粼粼，海鸥盘旋；近处一条小船随浪起伏，船夫站着摇橹；隔一会儿宣礼塔的阳台灯一圈圈亮起，圆顶窗环依次点亮，一群鸟从圆顶上惊飞',
  kotoku: '月夜的庭院里，青铜大佛盘腿坐在莲花座上，满月正好挂在他脑后当作光环，月光给他的头和肩镶上一道亮边；左边黑松伸进画面，枝上纸灯笼轻轻摇晃，右边铜香炉升起一缕缕青烟、飘到高处散成小团，石灯笼透着烛光，萤火虫一闪一闪；一名武僧练长刀，一名武僧扫地；练到最后一记劈砍，风卷松针、吹弯青烟，大佛额头闪过一点光',
  zeus: '神殿深处，象牙与黄金的宙斯坐在乌木宝座上，一手高举雷霆、一手斜握着顶上立着金鹰的权杖；雷霆噼啪闪着电弧，脚下油池里倒映着金色的神像、波纹来回晃动，两座三足火盆燃烧，重装步兵在台前巡逻；开火时雷霆变白、闪电劈穿屋顶，宙斯双眼发光、手臂一震，满殿一亮、火花落地',
  terracotta: '秦陵大厅里，三排陶俑站在夯土台上持矛列队，中间是将军俑，前排两俑之间露出一匹陶马；两侧青铜连枝灯烛光摇曳，右边铜鼎里火焰翻滚、火星上飘，墙上铜盘里一条蟠龙绕着玉眼盘成一圈，不时闪过一道光；守陵人来回踱步，隔一会儿敲响铜锣，金光从左到右扫过军阵，陶俑眼睛一个个亮起、抖落尘土、长矛齐齐一斜',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
