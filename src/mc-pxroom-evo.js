// ==== mc-pxroom-evo.js ====
(function () {
// Pixel rooms of the new over-limit evolution halls (mc-night.js, user ruling 2026-09-26: 「要想超限进化第二次，就需要建
// 不同种类的类似建筑」). One hall per key: the vocation's banners and emblem, its champion as a statue on a dais (stone,
// bronze or gold by the hall's quality), the vocation's own things round the walls (a weapon rack, shields, a target,
// drapes, shelves, a font, a brazier, a circle, coin piles), and a trainee at work beside the dais. Every hall looks
// different: its style's shell, its props, its statue's pose and metal, its lights.
const M = window.MC, X = M.PXR; if (!X) return;
const { worker } = X;
const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
const steps = (t, per) => ((t % per) + per) % per / per;

// a vocation: colours (banner, trim), the light, how its people dress, what they hold, what stands round its halls
const LK = (top, bot, extra) => Object.assign({ skin: ['skin', 6], hair: ['hair', 3], top, bot, boot: ['leather', 3] }, extra || {});
const V = {
  先锋: { c: 'crimson', c2: 'iron', lc: '#ff8a5a', look: LK(['crimson', 6], ['iron', 5], { cap: ['iron', 8] }), gear: 'spear', props: ['rack', 'shields'], act: 'thrust' },
  守护者: { c: 'tile', c2: 'iron', lc: '#8ab8ff', look: LK(['tile', 6], ['iron', 5], { cap: ['iron', 8] }), gear: 'shield', props: ['shields', 'rack'], act: 'guard' },
  战士: { c: 'red', c2: 'leather', lc: '#ffb060', look: LK(['red', 5], ['leather', 4], { beard: ['hair', 3] }), gear: 'sword', props: ['rack', 'target'], act: 'swing' },
  圣骑士: { c: 'gold', c2: 'linen', lc: '#ffe8a0', look: LK(['linen', 8], ['iron', 6], { cap: ['gold', 8] }), gear: 'sword', props: ['shields', 'brazier'], act: 'swing' },
  射手: { c: 'leaf', c2: 'wood', lc: '#b0ff90', look: LK(['leaf', 5], ['leather', 4], { hood: ['leaf', 4] }), gear: 'bow', props: ['target', 'rack'], act: 'shoot' },
  刺客: { c: 'night', c2: 'lav', lc: '#b080ff', look: LK(['night', 4], ['night', 3], { hood: ['night', 3] }), gear: 'dagger', props: ['drape', 'target'], act: 'sneak' },
  法师: { c: 'magic', c2: 'arcane', lc: '#9a7cff', look: { skin: ['skin', 6], hair: ['linen', 8], top: ['magic', 7], bot: ['magic', 5], boot: ['magic', 3], robe: 1, hood: ['magic', 6] }, gear: 'staff', props: ['shelf', 'circle'], act: 'cast' },
  牧师: { c: 'linen', c2: 'gold', lc: '#fff0c0', look: { skin: ['skin', 7], hair: ['hair', 5], top: ['linen', 8], bot: ['linen', 6], boot: ['linen', 5], robe: 1, hood: ['linen', 9] }, gear: 'staff', props: ['fount', 'shelf'], act: 'pray' },
  祭司: { c: 'lav', c2: 'gold', lc: '#ff9ae0', look: { skin: ['skin', 6], hair: ['hair', 2], top: ['lav', 6], bot: ['lav', 4], boot: ['lav', 3], robe: 1, hood: ['gold', 7] }, gear: 'staff', props: ['brazier', 'fount'], act: 'pray' },
  召唤师: { c: 'arcane', c2: 'teal', lc: '#6af4ff', look: { skin: ['skin', 5], hair: ['hair', 2], top: ['teal', 5], bot: ['teal', 3], boot: ['teal', 2], robe: 1, hood: ['arcane', 6] }, gear: 'staff', props: ['circle', 'brazier'], act: 'cast' },
  商人: { c: 'gold', c2: 'brass', lc: '#ffd060', look: LK(['crimson', 7], ['denim', 4], { hat: ['brass', 6] }), gear: 'box', props: ['coins', 'shelf'], act: 'count' },
};
const METAL = { 2: ['mstone', 6], 3: ['brass', 6.5], 4: ['gold', 7] };

// ───────── pieces ─────────
function emblem(S, x, y, gear, m, t) {
  if (gear === 'shield') { S.poly([[x - 4, y - 4], [x + 4, y - 4], [x + 4, y + 1], [x, y + 5], [x - 4, y + 1]], m, t); S.vl(x, y - 3, 7, m, t + 2); }
  else if (gear === 'sword') { S.vl(x, y - 6, 10, m, t + 1.5); S.hl(x - 3, y + 2, 7, m, t); S.vl(x, y + 3, 3, 'leather', 4); }
  else if (gear === 'spear') { S.vl(x, y - 3, 10, 'wood', 6); S.poly([[x - 2, y - 3], [x, y - 8], [x + 2, y - 3]], m, t + 1); }
  else if (gear === 'bow') { for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + k / 12 * Math.PI; S.px(x + Math.cos(a) * 4, y + Math.sin(a) * 6, m, t); } S.vl(x, y - 6, 12, 'linen', 8); }
  else if (gear === 'dagger') { S.line(x - 4, y + 4, x + 3, y - 4, m, t + 1.5); S.line(x + 4, y + 4, x - 3, y - 4, m, t + 1); }
  else if (gear === 'staff') { S.vl(x, y - 3, 10, 'wood', 6); S.ell(x, y - 5, 2.5, 2.5, m, t + 2, { dome: 1 }); }
  else if (gear === 'box') { S.ell(x, y, 4.5, 4.5, m, t, { dome: 1 }); S.ell(x, y, 4.5, 4.5, m, t - 2, { ring: 1 }); S.vl(x, y - 2, 5, m, t - 2.5); }
}
function banner(S, x, v, q) {
  const h = 26 + q * 3; S.beg();
  S.hcyl(x - 2, 9, 20, 2, q >= 4 ? 'gold' : 'wood', 6);
  S.vgrad(x, 11, 16, h, v.c, 6, 4); S.vl(x, 11, h, v.c, 7); S.vl(x + 15, 11, h, v.c, 3);
  for (let k = 0; k < 16; k += 2) { S.px(x + k, 11 + h, v.c, 4); S.px(x + k + 1, 12 + h, q >= 3 ? 'gold' : v.c2, 6); }
  S.hl(x, 12, 16, q >= 3 ? 'gold' : v.c2, 7);
  emblem(S, x + 8, 11 + h * 0.45, v.gear, v.c2 === 'iron' ? 'iron' : 'gold', 7);
  S.end();
}
function sconce(S, x, y) { S.beg(); S.box(x - 3, y + 6, 6, 3, 'iron', 5); S.line(x, y + 6, x, y, 'wood', 6, { w: 1 }); S.end(); }
const PROP = {
  rack(S, x) { S.beg(); S.box(x, 50, 3, 40, 'wood', 4); S.box(x + 21, 50, 3, 40, 'wood', 4); S.box(x - 1, 49, 26, 3, 'wood', 6, { top: 1 }); S.box(x - 1, 82, 26, 3, 'wood', 5); S.end();
    [5, 11, 17].forEach((dx, i) => { S.beg(); const xx = x + dx; S.vl(xx, 38 + i * 2, 50 - i * 2, 'wood', 6.5); S.vl(xx + 1, 38 + i * 2, 50 - i * 2, 'wood', 4.5); S.poly([[xx - 1.5, 38 + i * 2], [xx + 0.5, 32 + i * 2], [xx + 2.5, 38 + i * 2]], 'iron', 8); S.end(); }); },
  shields(S, x) { [[x + 6, 34], [x + 18, 40], [x + 6, 48]].forEach(([cx, cy], i) => { S.beg(); S.ell(cx, cy, 5.5, 5.5, i === 1 ? 'crimson' : 'tile', 6, { dome: 1 }); S.ell(cx, cy, 5.5, 5.5, 'iron', 7, { ring: 1.2 }); S.ell(cx, cy, 1.8, 1.8, 'brass', 8, { dome: 1 }); S.end(); }); },
  target(S, x) { S.beg(); S.line(x + 4, 60, x, 89, 'wood', 5); S.line(x + 12, 60, x + 16, 89, 'wood', 5); S.ell(x + 8, 52, 8, 8, 'sand', 6, { dome: 1 }); S.ell(x + 8, 52, 6, 6, 'linen', 8.5); S.ell(x + 8, 52, 4.2, 4.2, 'tile', 6); S.ell(x + 8, 52, 2.4, 2.4, 'crimson', 7); S.ell(x + 8, 52, 0.9, 0.9, 'gold', 9); S.end();
    [[x + 6, 50, -1], [x + 11, 54, 1]].forEach(([ax, ay, d]) => { S.beg(); S.line(ax, ay, ax + d * 6, ay - 5, 'wood', 7); S.px(ax + d * 7, ay - 5, 'crimson', 7); S.end(); }); },
  drape(S, x) { S.beg(); for (let k = 0; k < 22; k++) { const wave = Math.round(Math.sin(k * 0.9) * 1.2); S.vl(x + k, 12, 70 + wave, 'night', 3 + (k % 4 === 0 ? 1.5 : 0)); } S.hl(x, 12, 22, 'lav', 6); S.end();
    [[x + 7, 40], [x + 15, 52]].forEach(([dx, dy]) => { S.beg(); S.line(dx - 3, dy + 4, dx + 3, dy - 4, 'iron', 9); S.px(dx - 3, dy + 4, 'lav', 7); S.end(); }); },
  shelf(S, x) { S.beg(); S.box(x, 34, 26, 56, 'wood', 4); for (let r = 0; r < 4; r++) { const y = 38 + r * 13; S.hl(x + 1, y + 11, 24, 'wood', 6); for (let k = 0; k < 11; k++) { const bh = 7 + ((k * 7 + r * 3) % 4), m = ['crimson', 'tile', 'leaf', 'magic', 'brass'][(k + r) % 5]; S.rect(x + 2 + k * 2, y + 11 - bh, 2, bh, m, 5 + (k % 2)); } } S.end(); },
  fount(S, x) { S.beg(); S.box(x, 76, 26, 13, 'mstone', 6, { top: 2 }); S.ell(x + 13, 76, 12, 2.2, 'water', 5, { n: [0, -0.9] }); S.cyl(x + 11, 60, 4, 16, 'mstone', 7, { rim: 1 }); S.ell(x + 13, 60, 5, 1.6, 'water', 6); S.end(); },
  brazier(S, x) { S.beg(); S.line(x + 3, 89, x + 8, 70, 'iron', 5); S.line(x + 17, 89, x + 12, 70, 'iron', 5); S.line(x + 10, 89, x + 10, 70, 'iron', 4); S.ell(x + 10, 69, 9, 3, 'iron', 6, { dome: 1 }); S.hl(x + 2, 67, 17, 'brass', 7); S.end(); },
  circle(S, x) { S.lay('wall'); for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; S.px(x + 13 + Math.cos(a) * 14, 95 + Math.sin(a) * 3, 'arcane', 5, { e: 180 }); } S.lay('back'); },
  coins(S, x) { [[x + 4, 86, 6], [x + 14, 87, 8], [x + 22, 86, 5]].forEach(([cx, cy, r]) => { S.beg(); for (let k = 0; k < r; k++) S.hl(cx - r + k, cy - k, (r - k) * 2, 'gold', 6 + (k % 2) * 2); S.end(); });
    S.beg(); S.box(x + 2, 66, 18, 12, 'wood', 5, { top: 2 }); S.hl(x + 2, 70, 18, 'brass', 7); S.rect(x + 9, 69, 4, 4, 'gold', 8); S.end(); },
};
// the champion: a statue in the hall's metal, holding the vocation's weapon up
function statue(S, v, q) {
  const [m, t] = METAL[q] || METAL[2], L = { skin: [m, t + 1], hair: [m, t - 1], top: [m, t], bot: [m, t - 1.2], boot: [m, t - 2] };
  if (v.look.robe) L.robe = 1; if (v.look.hood) L.hood = [m, t + 0.6]; if (v.look.cap) L.cap = [m, t + 1.2];
  const pose = v.act === 'shoot' ? { aF: 1.6, eF: 0, aB: 1.3, eB: 0.4 } : v.act === 'pray' || v.act === 'cast' ? { aF: 2.8, eF: 0.2, aB: 0.4, eB: -0.2 } : v.act === 'guard' ? { aF: 1.1, eF: -0.4, aB: 0.2, eB: -0.3 } : { aF: 2.7, eF: 0.3, aB: 0.3, eB: -0.3, lean: 0.2 };
  const r = worker(S, 75, 71, L, pose, 1); gearAt(S, r.hand, v.gear, pose, m, t + 1.5);
}
function gearAt(S, hand, gear, p, m, t) {
  const [hx, hy] = hand, a = (p.aF || 0) + (p.eF || 0), dx = Math.sin(a), dy = Math.cos(a);
  S.beg();
  if (gear === 'sword' || gear === 'spear') { const L = gear === 'spear' ? 16 : 11; S.line(hx, hy, hx + dx * L, hy + dy * L, m, t, { w: 1 }); if (gear === 'spear') S.px(Math.round(hx + dx * (L + 1)), Math.round(hy + dy * (L + 1)), m, t + 2); else S.line(hx - dy * 2, hy + dx * 2, hx + dy * 2, hy - dx * 2, m, t - 1); }
  else if (gear === 'staff') { S.line(hx, hy + 6, hx + dx * 1, hy - 12, 'wood', 6); S.rect(hx - 1, hy - 15, 3, 3, m, t + 1.5, { e: 200 }); }
  else if (gear === 'shield') { S.poly([[hx - 1, hy - 5], [hx + 6, hy - 5], [hx + 6, hy + 2], [hx + 2.5, hy + 6], [hx - 1, hy + 2]], m, t); }
  else if (gear === 'bow') { S.ell(hx + 1, hy, 3, 7, m, t, { ring: 1 }); S.vl(hx - 1, hy - 7, 14, 'linen', 8); }
  else if (gear === 'dagger') { S.line(hx, hy, hx + dx * 6, hy + dy * 6, m, t + 1, { w: 1 }); }
  else if (gear === 'box') { S.ell(hx + 1, hy - 1, 3, 3, m, t + 1, { dome: 1 }); }
  S.end();
}
// a trainee's moves, per vocation: [pose at rest, pose at the peak], a cycle length, a burst at the peak
const MOVES = {
  thrust: [{ aF: 1.2, eF: -0.6, lean: 0 }, { aF: 1.6, eF: 0, lean: 0.8, lF: 0.5, lB: -0.4 }, 1.6, 'dust'],
  guard: [{ aF: 1.0, eF: -0.5 }, { aF: 1.3, eF: -0.9, lean: -0.3, bob: 1 }, 2.2, 'glint'],
  swing: [{ aF: 2.8, eF: 0.4, lean: -0.2 }, { aF: 1.2, eF: 0, lean: 0.6 }, 1.4, 'dust'],
  shoot: [{ aF: 1.55, eF: 0, aB: 1.2, eB: 0.5 }, { aF: 1.6, eF: 0, aB: 0.9, eB: 0.1, lean: -0.2 }, 2.0, 'glint'],
  sneak: [{ aF: 0.6, eF: -0.8, lean: 0.5, bob: 1 }, { aF: 1.8, eF: 0, lean: 0.9 }, 1.8, 'soul'],
  cast: [{ aF: 0.9, eF: -0.4 }, { aF: 2.8, eF: 0.2, aB: 2.4, eB: 0.3 }, 2.4, 'rune'],
  pray: [{ aF: 0.4, eF: -0.9, aB: 0.4, eB: -0.9 }, { aF: 2.6, eF: 0.3, aB: 2.6, eB: 0.3 }, 3.0, 'glint'],
  count: [{ aF: 1.2, eF: -1.0 }, { aF: 1.4, eF: -1.4, bob: 1 }, 1.2, 'glint'],
};
const mix = (A, B, k) => { const o = {}; new Set(Object.keys(A).concat(Object.keys(B))).forEach(key => { o[key] = (A[key] || 0) + ((B[key] || 0) - (A[key] || 0)) * k; }); return o; };

// ───────── a hall ─────────
function hall(voc, q, style, seed) {
  const v = V[voc]; if (!v) return null;
  const pl = v.props[seed % 2], pr = v.props[(seed + 1) % 2], tx = seed % 2 ? 108 : 34, tdir = seed % 2 ? -1 : 1;
  return {
    amb: [0.26 + q * 0.01, 0.26],
    paint(S, sc) {
      X.shell(S, sc, style);
      sc.light({ x: 46, y: 30, z: 10, r: 70, i: 1.0, c: '#ffb070', fl: 'fire', tint: 0.4 });
      sc.light({ x: 104, y: 30, z: 10, r: 70, i: 1.0, c: '#ffb070', fl: 'fire', ph: 2.3, tint: 0.4 });
      sc.light({ x: 75, y: 46, z: 18, r: 50 + q * 12, i: 0.7 + q * 0.18, c: v.lc, fl: 'pulse', amp: 0.14, sp: 1.4 + seed * 0.1, tint: 0.55 });
      if (q >= 3) sc.shaft({ x: 75, y0: 8, y1: 80, w0: 4, w1: 10 + q * 2, i: 0.25 + q * 0.08, haze: 0.7, c: v.lc, f: (t) => 0.75 + 0.25 * Math.sin(t * 1.3) });
      S.lay('back');
      banner(S, 52, v, q); banner(S, 82, v, q);
      sconce(S, 46, 30); sconce(S, 104, 30);
      if (PROP[pl]) PROP[pl](S, 8); if (PROP[pr]) PROP[pr](S, 116);
      S.lay('back');
      // the dais: steps, a plinth with the vocation's emblem, trim in the hall's metal
      const [mm, mt] = METAL[q] || METAL[2];
      S.lay('mid'); S.beg(); S.box(52, 84, 46, 6, 'mstone', 5, { top: 2 }); S.box(58, 79, 34, 5, 'mstone', 6, { top: 2 }); S.box(64, 71, 22, 8, 'mstone', 7, { top: 2 }); S.hl(64, 71, 22, mm, mt + 1); S.end();
      S.beg(); emblem(S, 75, 75, v.gear, mm, mt + 1); S.end();
      statue(S, v, q);
      if (q >= 4) { S.lay('front'); S.beg(); [[56, 88], [94, 88]].forEach(([x, y]) => { S.cyl(x - 1, y - 12, 3, 12, 'gold', 6, { rim: 1 }); S.ell(x, y - 13, 2.5, 1.2, 'gold', 8); }); S.end(); }
      sc.emit({ k: q >= 4 ? 'glint' : 'dust', x: 75, y: 40, w: 30, h: 30, rate: 0.6 + q * 0.3, sp: 3, life: 3 });
      if (pl === 'brazier' || pr === 'brazier') sc.emit({ k: 'ember', x: pl === 'brazier' ? 18 : 126, y: 66, w: 8, rate: 3, sp: 8, ang: 0, spread: 0.4, life: 1.2 });
      if (pl === 'fount' || pr === 'fount') sc.emit({ k: 'mist', x: pl === 'fount' ? 21 : 129, y: 74, w: 18, rate: 0.8, sp: 2, life: 2.5 });
    },
    anim(D, t, rs) {
      const st = rs.st, mv = MOVES[v.act] || MOVES.swing, per = mv[2], ph = steps(t + seed * 0.37, per), up = ph < 0.45 ? 0 : ph < 0.6 ? (ph - 0.45) / 0.15 : ph < 0.8 ? 1 : 1 - (ph - 0.8) / 0.2, pose = mix(mv[0], mv[1], cl(up, 0, 1));
      // the floor glow under the dais breathes; the circle turns (a summoner's, a mage's)
      D.lay('wall'); const g = 0.5 + 0.5 * Math.sin(t * 1.6 + seed);
      for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2 + t * 0.4; D.px(75 + Math.cos(a) * (26 + q * 2), 96 + Math.sin(a) * 3, v.c2 === 'iron' ? 'lamp' : v.c2, 5 + g * 3, { e: 200 }); }
      if (pl === 'circle' || pr === 'circle') { const cx = pl === 'circle' ? 21 : 129; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 0.9; D.px(cx + Math.cos(a) * 12, 95 + Math.sin(a) * 2.6, 'arcane', 10, { e: 255 }); } }
      // flames of the sconces and the brazier
      [[46, 29], [104, 29]].forEach(([x, y], i) => { const f = Math.sin(t * 9 + i * 2) > 0 ? 1 : 0; D.px(x, y - 1, 'fire', 9, { e: 255 }); D.px(x, y - 2 - f, 'lamp', 10, { e: 255 }); D.px(x + (f ? 1 : -1), y - 1, 'fire', 7, { e: 255 }); });
      if (pl === 'brazier' || pr === 'brazier') { const bx = pl === 'brazier' ? 18 : 126; for (let k = -3; k <= 3; k++) { const h = 2 + Math.round((Math.sin(t * 8 + k) + 1) * 1.5); D.vl(bx + k, 66 - h, h, 'fire', 8, { e: 255 }); } }
      // the trainee
      D.lay('mid'); const r = worker(D, tx, 89, v.look, Object.assign({ bob: 0 }, pose), tdir); gearAt(D, r.hand, v.gear, pose, v.gear === 'box' ? 'gold' : 'iron', 8);
      if (ph >= 0.6 && !st.hit) { st.hit = 1; rs.burst(mv[3], r.hand[0], r.hand[1], v.act === 'cast' || v.act === 'pray' ? 8 : 4, { sp: 16, life: 0.9 }); if (v.act === 'cast' || v.act === 'pray') rs.flash(2, 0.8); }
      if (ph < 0.6) st.hit = 0;
      // the statue's weapon catches the light now and then
      const gl = steps(t + seed, 5); if (gl < 0.12) { const k = gl / 0.12; D.px(75 + Math.round(k * 10) - 4, 44 - Math.round(k * 8), 'lamp', 11, { e: 255 }); }
    },
  };
}
// the table lives in mc-night.js (loaded later); the new halls are listed here too so the rooms exist from the start
const HALLS = [
  ['先锋', 'ev_van2', 3, 'medieval'], ['先锋', 'ev_van3', 4, 'fantasy'], ['守护者', 'ev_gua2', 3, 'medieval'], ['守护者', 'ev_gua3', 4, 'magic'],
  ['战士', 'ev_war1', 2, 'medieval'], ['圣骑士', 'ev_pal1', 2, 'medieval'], ['圣骑士', 'ev_pal2', 3, 'fantasy'], ['射手', 'ev_rng3', 4, 'nature'],
  ['刺客', 'ev_ass2', 3, 'fantasy'], ['刺客', 'ev_ass3', 4, 'magic'], ['法师', 'ev_mag2', 3, 'magic'], ['法师', 'ev_mag3', 4, 'scifi'],
  ['牧师', 'ev_cle2', 3, 'water'], ['牧师', 'ev_cle3', 4, 'fantasy'], ['祭司', 'ev_pri1', 2, 'magic'], ['祭司', 'ev_pri2', 3, 'nature'],
  ['召唤师', 'ev_sum1', 2, 'magic'], ['召唤师', 'ev_sum2', 3, 'steam'], ['商人', 'ev_mer1', 2, 'cartoon'], ['商人', 'ev_mer2', 3, 'steam'],
];
HALLS.forEach(([voc, key, q, style], i) => { const d = hall(voc, q, style, i); if (d) X.def(key, d); });
})();

;
