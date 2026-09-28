// ==== mc-pxtown-kit.js ====
(function () {
// The pixel town's building kit (mc-pxtown.js; user ruling 2026-09-28, second pass: 「每一阶段要一眼看得出来：加一层或加一翼、换更好的
// 材质（木→石→带金饰）、更多灯光和招牌、屋顶装饰、发光的东西、在门口干活的人更多」「细节密度再往上提」).
// A building is a short spec — its style, its kind of show, and a sig() that paints what makes it itself (the forge
// mouth, the boiler, the cross …) — on a body the kit grows by stage:
//   0 · a one-storey hut of the style's humblest stuff (planks and thatch, a tin shed, a prefab box …), one window, a crate
//   1 · two storeys, the ground one in stone or brick, a side wing, a chimney, a swinging sign, a lantern, one worker
//   2 · the finest stuff and gold (or brass, neon, crystal) trim, a tower with its own roof, a flag, banners, two lanterns,
//       more lit windows, a glowing emblem, two workers at the door
// Every surface is textured on the rooms' ramps (planks, ashlar, bricks, panels, plaster and beams, tile rows, straw),
// windows have frames, sills, shutters or flower boxes, doors have steps and things beside them. Workers only stand on
// the near street (on the far ones they would be taller than the doors).
const M = window.MC, X = M.PXR, PT = M.PXTOWN; if (!X || !PT) return;
const { TX, n1, worker } = X, H = PT.H, cl = H.cl, steps = H.steps, R = Math.random;
const K = PT.K = {};

// ───────── materials by style × stage ─────────
// wall / base: [material, tone, texture] · roof: [kind, material, tone] · frame: window frames · trim: cornice (null: none)
// tower: its roof kind · glass: window glass material and light colour · deco: window extras
const T0 = (o) => Object.assign({ base: null, trim: null, frame: ['wood', 3], glass: ['lamp', '#ffb060'], deco: '', plinth: 'stone', gold: 0 }, o);
const TIER = {
  medieval: [T0({ wall: ['wood', 5, 'vplanks'], roof: ['thatch', 'sand', 6], plinth: 'earth', deco: 'shutter' }),
    T0({ wall: ['sand', 8, 'plaster'], base: ['mstone', 5, 'ashlar'], roof: ['gable', 'brick', 5], trim: ['wood', 3], deco: 'shutter' }),
    T0({ wall: ['mstone', 6, 'ashlar'], base: ['stone', 5, 'ashlar'], roof: ['gable', 'tile', 5], trim: ['gold', 8], tower: 'cone', frame: ['stone', 7], gold: 1, deco: 'box' })],
  steam: [T0({ wall: ['wood', 4, 'planks'], roof: ['tin', 'iron', 5], plinth: 'earth' }),
    T0({ wall: ['brick', 5, 'bricks'], base: ['stone', 4, 'ashlar'], roof: ['saw', 'iron', 5], trim: ['stone', 6], frame: ['iron', 5] }),
    T0({ wall: ['brick', 6, 'bricks'], base: ['stone', 5, 'ashlar'], roof: ['gable', 'copper', 6], trim: ['brass', 8], tower: 'clock', frame: ['brass', 6], gold: 1 })],
  scifi: [T0({ wall: ['scifi', 6, 'panels'], roof: ['flat', 'scifi', 5], frame: ['scifi', 4], glass: ['ice', '#c8f0ff'] }),
    T0({ wall: ['linen', 7, 'panels'], base: ['scifi', 6, 'panels'], roof: ['flat', 'linen', 8], trim: ['teal', 7], frame: ['scifi', 6], glass: ['ice', '#c8f0ff'] }),
    T0({ wall: ['glass', 5, 'curtain'], base: ['linen', 8, 'panels'], roof: ['flat', 'linen', 9], trim: ['teal', 10, 1], tower: 'antenna', frame: ['scifi', 7], glass: ['ice', '#c8f0ff'], gold: 1 })],
  magic: [T0({ wall: ['wood', 4, 'vplanks'], roof: ['gable', 'magic', 5], deco: 'shutter', glass: ['arcane', '#b89cff'] }),
    T0({ wall: ['magic', 5, 'ashlar'], base: ['stone', 4, 'ashlar'], roof: ['gable', 'magic', 7], trim: ['stone', 6], glass: ['arcane', '#b89cff'] }),
    T0({ wall: ['magic', 6, 'ashlar'], base: ['stone', 5, 'ashlar'], roof: ['gable', 'arcane', 4], trim: ['gold', 8], tower: 'spire', glass: ['arcane', '#c8a8ff'], gold: 1, frame: ['gold', 5] })],
  nature: [T0({ wall: ['wood', 5, 'logs'], roof: ['thatch', 'moss', 6], plinth: 'earth', deco: 'box' }),
    T0({ wall: ['sand', 8, 'plaster'], base: ['rock', 5, 'ashlar'], roof: ['thatch', 'leaf', 5], trim: ['wood', 3], deco: 'box', plinth: 'earth' }),
    T0({ wall: ['wood', 6, 'logs'], base: ['rock', 6, 'ashlar'], roof: ['gable', 'moss', 6], trim: ['gold', 7], tower: 'tree', deco: 'box', gold: 1, plinth: 'earth' })],
  water: [T0({ wall: ['wood', 5, 'planks'], roof: ['gable', 'linen', 7], deco: 'shutter' }),
    T0({ wall: ['bone', 8, 'smooth'], base: ['bone', 6, 'ashlar'], roof: ['gable', 'tile', 6], trim: ['tile', 8], frame: ['tile', 5], deco: 'shutter' }),
    T0({ wall: ['bone', 9, 'smooth'], base: ['bone', 7, 'ashlar'], roof: ['hip', 'tile', 7], trim: ['gold', 8], tower: 'dome', frame: ['tile', 6], gold: 1 })],
  fantasy: [T0({ wall: ['sand', 7, 'smooth'], roof: ['flat', 'sand', 6], frame: ['wood', 4], plinth: 'sand' }),
    T0({ wall: ['bone', 8, 'smooth'], base: ['sand', 6, 'ashlar'], roof: ['dome', 'tile', 7], trim: ['sand', 8], plinth: 'sand' }),
    T0({ wall: ['bone', 9, 'smooth'], base: ['bone', 7, 'ashlar'], roof: ['onion', 'gold', 7], trim: ['gold', 9], tower: 'onion', frame: ['gold', 6], gold: 1, plinth: 'sand' })],
  cartoon: [T0({ wall: ['candy', 7, 'vplanks'], roof: ['gable', 'red', 6], deco: 'box' }),
    T0({ wall: ['brick', 6, 'bricks'], base: ['candy', 7, 'vplanks'], roof: ['flat', 'brick', 6], trim: ['candy', 9], deco: 'awning' }),
    T0({ wall: ['brick', 7, 'bricks'], base: ['candy', 8, 'vplanks'], roof: ['gable', 'pink', 7], trim: ['gold', 9], tower: 'bulbs', deco: 'awning', gold: 1 })],
};
TIER.core = TIER.medieval;
K.tier = (style, st) => (TIER[style] || TIER.medieval)[cl(st | 0, 0, 2)];

// ───────── surfaces ─────────
K.wall = function (S, x, y, w, h, W) {
  const [m, t, tx] = W; if (w < 1 || h < 1) return;
  S.beg();
  if (tx === 'vplanks') TX.vplanks(S, x, y, w, h, m, t);
  else if (tx === 'planks') TX.planks(S, x, y, w, h, m, t);
  else if (tx === 'ashlar') TX.ashlar(S, x, y, w, h, m, t, { bh: 4 });
  else if (tx === 'bricks') TX.bricks(S, x, y, w, h, m, t, { bw: 5, bh: 3, v: 1 });
  else if (tx === 'panels') { TX.panels(S, x, y, w, h, m, t, { pw: 7, ph: 5, v: 0.8 }); }
  else if (tx === 'logs') { for (let yy = y; yy < y + h; yy += 3) S.hcyl(x, yy, w, Math.min(3, y + h - yy), m, t + ((yy - y) % 6 ? 0 : -0.5), { rim: 1.5 }); for (let yy = y; yy < y + h; yy += 3) { S.px(x, yy + 1, m, t + 2); S.px(x + w - 1, yy + 1, m, t - 2); } }
  else if (tx === 'plaster') { S.rect(x, y, w, h, m, t); S.noise(x, y, w, h, 1, 3, 4); S.hl(x, y, w, 'wood', 4); S.hl(x, y + h - 1, w, 'wood', 3); for (let xx = x; xx < x + w; xx += 7) { S.vl(xx, y, h, 'wood', 4); if (xx + 7 < x + w && h > 5) S.line(xx + 1, y + h - 2, xx + 6, y + 1, 'wood', 3); } S.vl(x + w - 1, y, h, 'wood', 3); }
  else if (tx === 'curtain') { S.rect(x, y, w, h, m, t); for (let xx = x; xx < x + w; xx += 4) S.vl(xx, y, h, 'scifi', 7); for (let yy = y; yy < y + h; yy += 5) S.hl(x, yy, w, 'scifi', 6); for (let yy = y + 1; yy < y + h; yy += 5) for (let xx = x + 1; xx < x + w - 1; xx += 4) S.px(xx, yy, m, t + 3, { n: [0, -0.5] }); }
  else { S.rect(x, y, w, h, m, t); S.noise(x, y, w, h, 1, 4, 7); }
  // a lit edge on the left, a shaded one on the right, a darker course at the foot
  S.vl(x, y, h, m, t + 1.2, { n: [-0.7, 0] }); S.vl(x + w - 1, y, h, m, t - 1.4, { n: [0.7, 0] });
  S.end();
};
// quoins: big corner stones in alternating widths (stone bases, stages 1–2)
K.quoins = function (S, x, y, w, h, m, t) { S.beg(); for (let yy = y, i = 0; yy < y + h - 1; yy += 3, i++) { const ww = i % 2 ? 2 : 3; S.rect(x, yy, ww, 2, m, t + 1.5); S.rect(x + w - ww, yy, ww, 2, m, t + 0.5); } S.end(); };
// a roof over [x, x + w) standing on y, rh high
K.roof = function (S, x, y, w, rh, kind, m, t) {
  const cx = x + w / 2;
  if (kind === 'flat') { S.beg(); S.box(x - 1, y - 3, w + 2, 3, m, t, { top: 1 }); S.hl(x - 1, y, w + 2, m, t - 3); for (let xx = x + 2; xx < x + w - 2; xx += 5) S.px(xx, y - 2, m, t - 1.5); S.end(); return y - 4; }
  if (kind === 'dome' || kind === 'onion') { const r = Math.min(w / 2 - 1, rh); S.beg(); S.box(x - 1, y - 2, w + 2, 2, m, t - 1); for (let yy = 0; yy <= r; yy++) { const hw = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy))); if (hw < 1) continue; S.rect(cx - hw, y - 2 - yy, hw, 1, m, t + 1 - yy / r, { n: [-0.5, -0.6] }); S.rect(cx, y - 2 - yy, hw, 1, m, t - 1 - yy / r, { n: [0.5, -0.6] }); }
    for (let k = 1; k < 4; k++) { const xx = Math.round(cx - r + k * r / 2); S.line(xx, y - 3, cx + (xx - cx) * 0.3, y - 2 - r * 0.92, m, t - 2); } const top = y - 3 - r;
    if (kind === 'onion') { S.rect(cx - 1, top - 3, 2, 3, m, t + 1); S.px(cx - 0.5, top - 5, 'gold', 10, { e: 255 }); S.vl(cx - 0.5, top - 4, 1, 'gold', 8); }
    S.end(); return top - (kind === 'onion' ? 5 : 0); }
  if (kind === 'saw') { S.beg(); const n = Math.max(2, Math.round(w / 11)), tw = w / n; for (let i = 0; i < n; i++) { const a = x + i * tw; S.poly([[a, y], [a + tw, y], [a + tw, y - 7]], m, t); for (let k = 2; k < 6; k += 2) S.line(a + tw * k / 7, y - 1, a + tw, y - 1 - k, m, t + 1.5); S.vl(Math.round(a + tw) - 1, y - 6, 6, 'glass', 8, { e: 255 }); } S.hl(x - 1, y, w + 2, m, t - 2.5); S.end(); return y - 8; }
  if (kind === 'hip') { S.beg(); for (let k = 0; k <= rh; k++) { const inset = Math.round(k * 0.9), a = x - 1 + inset, b = x + w + 1 - inset; if (b - a < 4) break; S.rect(a, y - k, (b - a) >> 1, 1, m, t + (k % 3 === 0 ? -1.2 : 0.8), { n: [-0.4, -0.7] }); S.rect(a + ((b - a) >> 1), y - k, b - a - ((b - a) >> 1), 1, m, t - 0.8 + (k % 3 === 0 ? -1.2 : 0), { n: [0.4, -0.7] }); } S.hl(x - 2, y, w + 4, m, t - 2.5); S.end(); return y - rh; }
  if (kind === 'cone') { S.beg(); S.poly([[x - 1, y + 0.5], [cx, y - rh], [x + w + 1, y + 0.5]], m, t); for (let k = 3; k < rh; k += 3) { const hw = (w / 2 + 1) * (1 - k / rh); S.hl(cx - hw, y - k, hw * 2, m, t - 1.5); } S.vl(cx - 0.5, y - rh, rh * 0.8, m, t + 1.5); S.end(); return y - rh; }
  // gable family: tiles, tin ribs, thatch straw
  S.beg();
  for (let k = 0; k <= rh; k++) { const yy = y - k, hw = Math.max(0, (w / 2 + 1) * (1 - k / (rh + 0.5))); if (hw < 0.5) continue;
    let tl = t + 0.8, tr = t - 1; if (kind === 'gable' && k % 3 === 0) { tl -= 2.3; tr -= 1.5; } if (kind === 'thatch') { tl += (k % 2 ? -0.6 : 0.4); tr += (k % 2 ? -0.6 : 0.2); }
    S.rect(cx - hw, yy, hw, 1, m, tl, { n: [-0.5, -0.6] }); S.rect(cx, yy, hw, 1, m, tr, { n: [0.5, -0.6] });
    if (kind === 'gable' && k % 3 === 1) for (let xx = Math.ceil(cx - hw) + (k % 2); xx < cx + hw; xx += 3) S.px(xx, yy, m, t - 1.6);
    if (kind === 'tin') for (let xx = Math.ceil(cx - hw); xx < cx + hw; xx += 2) S.px(xx, yy, m, t + (xx < cx ? 1.8 : 0.6));
    if (kind === 'thatch') for (let xx = Math.ceil(cx - hw); xx < cx + hw; xx++) if ((xx * 7 + k * 3) % 5 === 0) S.px(xx, yy, m, t - 1.8); }
  if (kind === 'thatch') for (let xx = x - 1; xx < x + w + 1; xx++) S.px(xx, y + 1 + ((xx * 5) % 3 === 0 ? 1 : 0), m, t - 1.5);
  else S.hl(x - 1, y, w + 2, m, t - 2.6);
  S.hl(Math.round(cx) - 1, y - rh, 2, m, t + 2);
  S.end(); return y - rh;
};
// windows: frame, glass lit by its own flickering light, mullions, sill; shutters, a flower box or an awning by the style
K.win = function (S, sc, x, y, w, h, T, o) {
  o = o || {}; const lit = o.lit !== false, gm = o.glass || T.glass[0];
  const li = lit ? sc.light({ x: x + w / 2, y: y + h / 2, z: 7, r: o.r || 9 + w, i: o.i || 0.55, c: o.c || T.glass[1], fl: 'candle', ph: x * 0.7 + y, tint: 0.5 }) : -1;
  S.beg(); S.rect(x - 1, y - 1, w + 2, h + 2, T.frame[0], T.frame[1]);
  for (let k = 0; k < h; k++) S.rect(x, y + k, w, 1, lit ? gm : 'glass', lit ? cl(10 - Math.floor(k / h * 3), 7, 11) : 3 - (k === 0 ? 1 : 0), lit ? { e: li + 1 } : null);
  if (w >= 4) S.vl(x + (w >> 1), y, h, T.frame[0], T.frame[1] + 1); if (h >= 5) S.hl(x, y + (h >> 1), w, T.frame[0], T.frame[1] + 1);
  if (lit) S.px(x, y, gm, 11, { e: 255 });
  S.hl(x - 1, y - 2, w + 2, T.frame[0], T.frame[1] - 1);
  if (o.sill !== false) S.hl(x - 1, y + h + 1, w + 2, 'stone', 7, { n: [0, -0.8] });
  S.end();
  const d = o.deco != null ? o.deco : T.deco;
  if (d === 'shutter') { S.beg(); S.rect(x - 3, y - 1, 2, h + 2, T.shut || 'wood', 5); S.rect(x + w + 1, y - 1, 2, h + 2, T.shut || 'wood', 4); S.vl(x - 3, y, h, 'wood', 3); S.end(); }
  else if (d === 'box') { S.beg(); S.box(x - 1, y + h + 1, w + 2, 2, 'wood', 5); for (let i = 0; i < w + 2; i += 2) S.px(x - 1 + i, y + h, i % 4 ? 'pink' : 'leaf', i % 4 ? 8 : 7); S.end(); }
  else if (d === 'awning') { S.beg(); for (let i = 0; i < w + 4; i++) { S.px(x - 2 + i, y - 3, i % 4 < 2 ? 'red' : 'linen', i % 4 < 2 ? 7 : 9); S.px(x - 2 + i, y - 2, i % 4 < 2 ? 'red' : 'linen', i % 4 < 2 ? 5 : 7); } S.end(); }
  return li;
};
K.door = function (S, x, y, w, h, T, st) {
  S.beg(); const arch = st >= 1; S.rect(x - 1, y - 1, w + 2, h + 1, T.frame[0], T.frame[1] - 1);
  S.rect(x, y, w, h, 'wood', 3); for (let i = 1; i < w; i += 2) S.vl(x + i, y + (arch ? 1 : 0), h - 1, 'wood', 4.5);
  if (arch) { S.px(x, y, T.frame[0], T.frame[1] - 1); S.px(x + w - 1, y, T.frame[0], T.frame[1] - 1); }
  S.hl(x, y + (h >> 1), w, 'iron', 5); S.px(x + w - 2, y + (h >> 1) + 1, 'brass', 10);
  S.box(x - 2, y + h, w + 4, 1, 'stone', 7); S.end();
};
K.lantern = function (S, sc, x, y, o) { o = o || {}; const li = sc.light({ x, y: y + 2, z: 9, r: 15, i: 0.8, c: o.c || '#ffc070', fl: 'candle', ph: x, tint: 0.55 }); S.beg(); S.hl(x - 1, y - 2, 3, 'iron', 5); S.px(x, y - 1, 'iron', 6); S.rect(x - 1, y, 3, 3, o.m || 'lamp', 9, { e: li + 1 }); S.px(x, y + 1, o.m || 'lamp', 11, { e: 255 }); S.hl(x - 1, y + 3, 3, 'iron', 4); S.end(); return li; };
K.chimney = function (S, sc, x, y, h, m, o) { o = o || {}; S.beg(); TX.bricks(S, x, y - h, 5, h, m || 'brick', 5, { bw: 3, bh: 2, v: 1 }); S.box(x - 1, y - h - 1, 7, 2, 'stone', 6); S.end(); sc.emit({ k: o.k || 'steam', x: x + 2.5, y: y - h - 2, rate: o.rate || 1.4, sp: 5, ang: 0.25, spread: 0.5, life: 2.6, w: 2 }); };
K.crate = function (S, x, y, m) { S.beg(); S.box(x, y - 5, 6, 5, m || 'wood', 6, { top: 1 }); S.line(x, y - 5, x + 5, y - 1, m || 'wood', 4); S.hl(x, y - 3, 6, m || 'wood', 4); S.end(); };
K.barrel = function (S, x, y) { S.beg(); S.cyl(x, y - 6, 5, 6, 'wood', 5, { rim: 2 }); S.hl(x, y - 5, 5, 'iron', 6); S.hl(x, y - 2, 5, 'iron', 5); S.end(); };
K.sack = function (S, x, y) { S.beg(); S.ell(x + 2, y - 2, 2.5, 2.5, 'sand', 7, { dome: 1 }); S.px(x + 2, y - 5, 'sand', 5); S.end(); };
K.pot = function (S, x, y) { S.beg(); S.box(x, y - 3, 4, 3, 'brick', 6); S.end(); S.beg(); S.ell(x + 2, y - 5, 3, 2.5, 'leaf', 6, { dome: 1 }); S.px(x + 1, y - 6, 'pink', 9); S.px(x + 3, y - 5, 'gold', 9); S.end(); };
// things that move: a flag on a pole, a sign on a bracket (both drawn every frame)
K.flag = function (S, G, x, y, h, m) { S.beg(); S.vl(x, y - h, h, 'wood', 6); S.px(x, y - h - 1, 'gold', 10); S.end(); G.flags.push({ x: x + 1, y: y - h + 1, m: m || 'crimson', n: h > 14 ? 8 : 6 }); };
K.sign = function (S, G, x, y, icon, m, dir) { S.beg(); S.hl(x, y, 5 * (dir || 1), 'iron', 6); S.end(); G.signs.push({ x: x + 4 * (dir || 1) - 3, y: y + 1, icon, m: m || 'wood' }); };
K.bannerV = function (S, x, y, h, m, icon) { S.beg(); S.hl(x - 1, y - 1, 6, 'wood', 5); S.rect(x, y, 4, h, m, 6); S.vl(x, y, h, m, 7.5); S.vl(x + 3, y, h, m, 4.5); S.px(x, y + h, m, 5); S.px(x + 3, y + h, m, 5); S.px(x + 1, y + h + 1, m, 5); S.hl(x, y + 1, 4, 'gold', 8); if (icon && H.ICON[icon]) H.ICON[icon](S, x + 2, y + (h >> 1) + 1); S.end(); };

// ───────── the body, by stage ─────────
// returns the box the spec's sig() paints into: mx0/mx1 (main block), top (its eaves), rtop (roof top), side (the
// wing side region at the ground: the yard at stage 0, the wing at 1–2), door, sh (storey height)
K.build = function (S, sc, G, P) {
  const st = G.st, T = K.tier(P.style, st), w = G.w, h = G.h, gy = G.gy, sd = P.wing === 'l' ? -1 : 1, near = G.s >= 0.8;
  G.flags = []; G.signs = []; G.workers = []; G.an = []; G.T = T; G.P = P;
  H.plinth(S, G, T.plinth);
  const sh = cl(Math.round(h * 0.26), 9, 16), floors = Math.min([1, 2, 3][st], Math.max(1, Math.floor((h * (st === 2 ? 0.74 : 0.66)) / sh))) + (P.floors || 0);
  const mw = Math.max(16, Math.round(w * (P.mw || [0.58, 0.6, 0.62][st]))), ww = st ? Math.max(9, Math.round(w * 0.26)) : 0, span = mw + ww;
  const left = G.cx - (span >> 1), mx0 = sd > 0 ? left : left + ww, mx1 = mx0 + mw, wx0 = sd > 0 ? mx1 : left, wx1 = wx0 + ww, top = gy - floors * sh, cx = (mx0 + mx1) >> 1;
  const RF = st > 0 && P.roofM ? P.roofM : [T.roof[1], T.roof[2]];
  const B = { st, T, sd, mx0, mx1, mw, cx, top, sh, floors, gy, near, wx0, wx1, ww };
  // ground storey and upper storeys
  S.lay('wall');
  const baseW = T.base && floors > 1 ? T.base : T.wall;
  K.wall(S, mx0, gy - sh, mw, sh, baseW); if (floors > 1) K.wall(S, mx0, top, mw, gy - sh - top, T.wall);
  if (st >= 1 && baseW[2] === 'ashlar') K.quoins(S, mx0, gy - sh, mw, sh, baseW[0], baseW[1]);
  if (st >= 1) { S.beg(); S.box(mx0 - 1, gy - sh - 1, mw + 2, 2, (T.trim || baseW)[0], (T.trim || baseW)[1] - (T.trim && T.trim[2] ? 0 : 1), T.trim && T.trim[2] ? { e: 255 } : null); S.end(); }
  S.ao(mx0, top, mw, 3, 't', 2);
  // the wing: a lower annex under a lean-to (stage 2: a storey taller)
  if (ww) { const wt = gy - sh * (st === 2 && floors > 2 ? 2 : 1) - 1; B.wtop = wt; K.wall(S, wx0, wt, ww, gy - wt, st === 2 ? T.wall : baseW); S.ao(wx0, wt, ww, 2, 't', 1.5);
    S.beg(); const lo = sd > 0 ? wx1 + 1 : wx0 - 1, hi = sd > 0 ? wx0 : wx1; S.poly([[hi, wt - 5], [lo, wt + 0.5], [hi, wt + 0.5]], RF[0], RF[1] - 0.5); for (let k = 1; k < 5; k += 2) S.line(hi, wt - 5 + k, lo - sd * k * 0.6, wt, RF[0], RF[1] - 2); S.end(); }
  // the main roof
  const rk = P.roof || T.roof[0], rh = cl(Math.round(mw * (rk === 'thatch' ? 0.42 : 0.36)), 6, 18);
  B.rtop = K.roof(S, mx0, top, mw, rh, rk, RF[0], RF[1]);
  if (st >= 2 && T.trim) { S.beg(); S.hl(mx0, top - 1, mw, T.trim[0], T.trim[1], { e: T.trim[2] ? 255 : 0 }); S.end(); }
  // windows on every storey; the door on the ground one
  const dw = st ? 7 : 6, dh = Math.min(sh - 2, st ? 11 : 9), dx = P.door != null ? mx0 + Math.round(mw * P.door) - (dw >> 1) : cx - (dw >> 1);
  B.door = { x: dx, w: dw, h: dh, y: gy - dh };
  for (let f = 0; f < floors; f++) { const y = gy - sh * (f + 1) + Math.round(sh * 0.28), wh = Math.max(4, Math.round(sh * 0.4)), n = Math.max(1, Math.floor((mw - 4) / 9));
    for (let i = 0; i < n; i++) { const x = mx0 + Math.round((i + 0.5) * mw / n) - 2; if (f === 0 && x + 5 > dx - 1 && x < dx + dw + 1) continue; if (P.noWin && P.noWin(f, i, n, st)) continue; K.win(S, sc, x, y, 4, wh, T, { lit: st > 0 || (i + f) % 2 === 0 || n < 2, i: 0.45 + st * 0.1 }); } }
  if (ww && st >= 1) for (let f = 0; f < (st === 2 && floors > 2 ? 2 : 1); f++) K.win(S, sc, ((wx0 + wx1) >> 1) - 2, gy - sh * (f + 1) + Math.round(sh * 0.3), 4, Math.max(4, Math.round(sh * 0.36)), T, { deco: '' });
  K.door(S, dx, gy - dh, dw, dh, T, st);
  // the side region: yard at stage 0 (things stand in it), the wing's front at 1–2
  B.side = ww ? [wx0 + 1, wx1 - 1] : sd > 0 ? [mx1 + 2, G.R + 4] : [G.L - 4, mx0 - 2];
  // the stage's extras
  S.lay('back');
  if (st === 0) { K.crate(S, dx + dw + 2, gy); }
  if (st >= 1) {
    const lx = dx - 2; K.lantern(S, sc, lx, gy - dh - 1);
    if (P.chimney !== false && /medieval|nature|steam|water|magic/.test(P.style || 'medieval')) K.chimney(S, sc, sd > 0 ? mx0 + 3 : mx1 - 8, top - Math.round(rh * 0.35), Math.round(rh * 0.6) + 4, st === 2 ? 'mstone' : 'brick', { k: P.smoke || 'steam' });
    K.sign(S, G, dx + dw + 1, gy - dh - 2, P.icon, P.signM || 'wood');
    K.barrel(S, dx + dw + 8 < mx1 ? dx + dw + 3 : mx0 + 1, gy); if (near) G.workers.push({ x: sd > 0 ? mx0 - 4 : mx1 + 4, dir: sd, act: P.act || 'work' });
  }
  if (st >= 2) {
    K.lantern(S, sc, dx + dw + 2, gy - dh - 1);
    // a tower on the wing's outer side, its own roof, a glowing window, the flag on top
    const tw = cl(Math.round(w * 0.14), 7, 11), tx = sd > 0 ? wx1 - tw : wx0, th = Math.round(sh * 1.2) + 4, tb = (B.wtop || top), tt = tb - th;
    S.lay('wall'); K.wall(S, tx, tt, tw, th, T.wall); K.win(S, sc, tx + (tw >> 1) - 1, tt + 3, 2, 4, T, { deco: '', sill: false, i: 0.7 });
    let rt = tt; const tk = T.tower || 'cone';
    if (tk === 'cone' || tk === 'spire') rt = K.roof(S, tx, tt, tw, tk === 'spire' ? tw + 6 : tw + 1, 'cone', RF[0], RF[1]);
    else if (tk === 'dome' || tk === 'onion') rt = K.roof(S, tx, tt, tw, (tw >> 1) + 1, tk, tk === 'onion' ? 'gold' : T.roof[1], T.roof[2] + 1);
    else if (tk === 'clock') { rt = K.roof(S, tx, tt, tw, (tw >> 1) + 1, 'dome', 'copper', 7); G.clock = { x: tx + (tw >> 1), y: tt + 3 }; }
    else if (tk === 'antenna') { S.beg(); S.vl(tx + (tw >> 1), tt - 12, 12, 'iron', 7); S.hl(tx + (tw >> 1) - 2, tt - 8, 5, 'iron', 6); S.end(); G.beacon = { x: tx + (tw >> 1), y: tt - 13, li: sc.light({ x: tx + (tw >> 1), y: tt - 13, z: 8, r: 14, i: 0.1, c: '#ff4040', tint: 0.4 }) }; rt = tt - 13; }
    else if (tk === 'tree') { S.beg(); for (let i = 0; i < 4; i++) S.ell(tx + (tw >> 1) + (i - 1.5) * 2.5, tt - 3 - (i % 2) * 2, 4, 3.5, 'leaf', 5 + (i % 2), { dome: 1 }); S.end(); rt = tt - 8; }
    else if (tk === 'bulbs') { const lb = sc.light({ x: tx + tw / 2, y: tt - 5, z: 8, r: 20, i: 0.8, c: '#ffd070', fl: 'buzz', tint: 0.5 }); S.beg(); S.box(tx - 1, tt - 7, tw + 2, 6, 'crimson', 5); for (let i = 0; i < tw + 2; i += 2) { S.px(tx - 1 + i, tt - 8, 'lamp', 10, { e: lb + 1 }); S.px(tx - 1 + i, tt - 1, 'lamp', 10, { e: lb + 1 }); } S.end(); if (P.icon && H.ICON[P.icon]) { S.beg(); H.ICON[P.icon](S, tx + (tw >> 1), tt - 4); S.end(); } rt = tt - 8; }
    B.tower = { x0: tx, x1: tx + tw, top: tt, rtop: rt };
    if (tk !== 'antenna' && tk !== 'bulbs') K.flag(S, G, tx + (tw >> 1), rt - 1, 9, P.flagM || (T.gold ? 'gold' : 'crimson'));
    // banners on the upper façade and the glowing emblem in the gable
    S.lay('back'); if (floors > 1 && mw >= 22) { K.bannerV(S, mx0 + 2, top + 2, Math.min(sh + 3, 12), P.bannerM || 'crimson', P.icon); if (mw >= 34) K.bannerV(S, mx1 - 6, top + 2, Math.min(sh + 3, 12), P.bannerM || 'crimson', P.icon); }
    if (P.icon && H.ICON[P.icon] && rk !== 'flat' && B.rtop < top - 7) { const ey = top - Math.round((top - B.rtop) * 0.42), le = sc.light({ x: cx, y: ey, z: 6, r: 14, i: 0.7, c: P.col || '#ffd070', fl: 'pulse', amp: 0.15, sp: 1.8, tint: 0.5 }); S.lay('wall'); S.beg(); S.ell(cx + 0.5, ey + 0.5, 3.5, 3.5, T.trim ? T.trim[0] : 'gold', 7); S.ell(cx + 0.5, ey + 0.5, 2.5, 2.5, 'ink', 2); H.ICON[P.icon](S, cx, ey); S.end(); G.emblem = { x: cx, y: ey, li: le }; }
    S.lay('back'); K.pot(S, dx - 6, gy); if (near) G.workers.push({ x: sd > 0 ? G.R + 2 : G.L - 2, dir: -sd, act: P.act2 || P.act || 'work' });
  }
  // the building's own things
  G.fx = { x: cx, y: top - 2 };
  if (P.sig) P.sig(S, sc, G, B);
  // a pillar of light every building can raise in a show (holy / arcane shows): nothing to pay when it is off
  G.pillar = 0; const Gp = G; sc.shaft({ x: G.fx.x, y0: 0, y1: G.fx.y + 2, w0: 2, w1: 5, i: 0.9, haze: 0.8, c: P.pillarC || '#fff0c0', f: () => Gp.pillar });
  G.B = B; return B;
};

// ───────── what moves (every frame) ─────────
const ACT = {
  work: (t) => { const hp = steps(t, 1.2); return { p: { aF: hp < 0.5 ? 1.2 + hp * 3 : 2.7 - (hp - 0.5) * 3, eF: -0.2, aB: 0.9, eB: 0.5, lF: 0.2, lB: -0.2 }, hit: hp > 0.5 && hp < 0.56 }; },
  hammer: (t) => { const hp = steps(t, 1.15); let aF = hp < 0.5 ? 1.2 + Math.sin(hp / 0.5 * Math.PI / 2) * 1.7 : hp < 0.56 ? 2.9 - (hp - 0.5) / 0.06 * 1.7 : 1.2; return { p: { aF, eF: hp < 0.5 ? -0.3 : 0.1, aB: 1.2, eB: 0.6, lB: -0.2, lF: 0.25, tool: 'hammer', ta: 0.3, lean: hp > 0.5 && hp < 0.7 ? 0.6 : 0.2 }, hit: hp > 0.52 && hp < 0.6 }; },
  sweep: (t) => { const a = Math.sin(t * 3); return { p: { aF: 0.6 + a * 0.4, eF: -0.4, aB: 0.5 + a * 0.3, eB: -0.3, tool: 'mop', lean: 0.3 } }; },
  carry: (t) => ({ p: { aF: 1.4, eF: -1.2, aB: 1.3, eB: -1.1, tool: 'box', bob: Math.sin(t * 6) > 0.6 ? -1 : 0 } }),
  read: (t) => ({ p: { aF: 1.1, eF: -1, aB: 0.3, eB: 0, tool: 'board', lean: 0.1 * Math.sin(t) } }),
  staff: (t) => ({ p: { aF: 0.9 + 0.2 * Math.sin(t * 2), eF: -0.6, aB: 0.2, eB: 0, tool: 'staff' } }),
  wrench: (t) => { const a = Math.sin(t * 5); return { p: { aF: 1.3 + a * 0.3, eF: -0.5, aB: 0.8, eB: 0.4, tool: 'wrench', lean: 0.4 }, hit: a > 0.97 }; },
  guard: (t) => ({ p: { aF: 0.2, eF: -0.2, aB: 0.1, eB: 0, tool: 'staff', bob: Math.sin(t * 1.3) > 0.9 ? -1 : 0 } }),
  wave: (t) => ({ p: { aF: 2.6 + 0.4 * Math.sin(t * 6), eF: 0.3, aB: 0.2, eB: 0 } }),
};
const LOOKS = { forge: 'smith', heal: 'nurse', holy: 'mage', arcane: 'mage', power: 'worker', trade: 'farmer', nature: 'farmer', water: 'keeper', war: 'keeper' };
K.anim = function (D, t, s, o, G) {
  // flags: a strip that waves column by column
  G.flags.forEach((f, i) => { D.lay('back'); for (let c = 0; c < f.n; c++) { const dy = Math.round(Math.sin(t * 5 + i - c * 0.7) * (c / f.n) * 1.6); for (let k = 0; k < 4; k++) D.px(f.x + c, f.y + k + dy, f.m, (k === 0 ? 8 : k === 3 ? 4 : 6) + (dy < 0 ? 1 : 0)); } });
  // signs: swing on their brackets
  G.signs.forEach((g, i) => { const sw = Math.round(Math.sin(t * 1.7 + i * 2) * 1.2); D.lay('back'); D.beg(); D.vl(g.x + 1, g.y, 1, 'iron', 5); D.vl(g.x + 5, g.y, 1, 'iron', 5); D.rect(g.x + sw, g.y + 1, 7, 5, g.m, 6); D.hl(g.x + sw, g.y + 1, 7, g.m, 8); D.hl(g.x + sw, g.y + 5, 7, g.m, 4); if (g.icon && H.ICON[g.icon]) H.ICON[g.icon](D, g.x + 3 + sw, g.y + 3); D.end(); });
  // the building's own movers
  G.an.forEach(f => f(D, t, s, o, G));
  if (G.clock) { D.lay('back'); const a = t * 0.5; D.px(G.clock.x, G.clock.y, 'paper', 10, { e: 255 }); D.px(G.clock.x + Math.round(Math.cos(a) * 1.4), G.clock.y + Math.round(Math.sin(a) * 1.4), 'ink', 1); }
  if (G.beacon) { const on = steps(t, 1.6) < 0.18; D.lay('front'); D.px(G.beacon.x, G.beacon.y, 'red', on ? 11 : 4, { e: 255 }); s.mul[G.beacon.li] = on ? 9 : 0; }
  if (G.emblem) s.mul[G.emblem.li] = 1 + (s.st.emb || 0); s.st.emb = Math.max(0, (s.st.emb || 0) - 0.03);
  // workers at the door (near street only)
  const kind = G.P.kind || 'trade', look = G.P.look || LOOKS[kind] || 'worker';
  G.workers.forEach((wk, i) => { const A = ACT[s.st.cheer ? 'wave' : wk.act] || ACT.work, r = A(t + i * 0.7); D.lay('front'); worker(D, wk.x, G.gy, look, r.p, wk.dir);
    if (r.hit && !s.st['wh' + i]) { s.st['wh' + i] = 1; if (wk.act === 'hammer') s.burst('spark', wk.x + wk.dir * 7, G.gy - 3, 4, { sp: 22, ang: 0, spread: 2.2, life: 0.5, floor: G.gy - 1 }); } if (!r.hit) s.st['wh' + i] = 0; });
  if (s.st.cheer) s.st.cheer = Math.max(0, s.st.cheer - 0.01);
};

// ───────── shows, by kind: what bursts out of the building on the beats (a = seconds after the slam / the pop) ─────────
const once = PT.once, SN = PT.SND;
const kick = (s, a) => { s.flash('all', a); s.st.emb = Math.max(s.st.emb || 0, a * 2); };
const SHOW = {
  forge: (s, o, G, q) => { const f = G.fx; if (once(s, o, 'w', 0)) { kick(s, 1.2); s.burst('ember', f.x, f.y, 14 + q * 6, { sp: 30, ang: 0, spread: 1.4, life: 1.6, w: 10 }); } [0.2, 0.5, 0.8].forEach((at, i) => { if (once(s, o, 'c' + i, at)) { kick(s, 0.6 + i * 0.3); s.burst('spark', f.x, f.y + 4, 8 + i * 5 + q * 3, { sp: 44 + i * 10, ang: 0, spread: 2.6, life: 0.9, floor: G.gy - 1 }); } }); },
  heal: (s, o, G, q) => { const f = G.fx; if (once(s, o, 'x', 0)) { kick(s, 1.5); s.burst('heal', f.x, f.y, 12 + q * 5, { sp: 18, ang: 0, spread: 3, life: 1.8, w: 6 }); } [0.3, 0.6].forEach((at, i) => { if (once(s, o, 'h' + i, at)) { kick(s, 0.8); s.burst('heal', G.cx, G.gy - 6, 8 + q * 3, { sp: 14, ang: 0, spread: 1, life: 1.6, w: G.w * 0.8 }); } }); },
  holy: (s, o, G, q) => { const a = o.show.a; if (a >= 0 && a < 1.6) G.pillar = Math.max(G.pillar, a < 0.15 ? a / 0.15 * 1.6 : 1.6 * (1 - (a - 0.15) / 1.45)); if (once(s, o, 'b0', 0.05)) { kick(s, 1.4); s.burst('glint', G.fx.x, G.fx.y - 2, 5 + q, { sp: 20, ang: 0, spread: 6.3, life: 0.7 }); } if (once(s, o, 'b1', 0.75)) { kick(s, 0.9); s.burst('soul', G.fx.x, G.fx.y, 8 + q * 4, { sp: 14, ang: 0, spread: 1.6, life: 2, w: 8 }); } },
  arcane: (s, o, G, q) => { const a = o.show.a; if (a >= 0 && a < 1.2) G.pillar = Math.max(G.pillar, 1.2 * (1 - a / 1.2)); [0, 0.35, 0.7].forEach((at, i) => { if (once(s, o, 'r' + i, at)) { kick(s, 0.8 + i * 0.3); s.burst(i === 1 ? 'soul' : 'rune', G.fx.x, G.fx.y, 8 + q * 4, { sp: 16 + i * 6, ang: 0, spread: 3, life: 1.6, w: 10 }); } }); },
  power: (s, o, G, q) => { if (once(s, o, 's', 0)) { kick(s, 1.3); s.burst('steam', G.fx.x, G.fx.y, 10 + q * 4, { sp: 20, ang: 0, spread: 0.8, life: 2 }); s.st.zap = 1; } [0.25, 0.45, 0.7].forEach((at, i) => { if (once(s, o, 'z' + i, at)) { s.st.zap = 1; kick(s, 0.9); s.burst('spark', G.fx.x, G.fx.y, 6 + q * 2, { sp: 30, ang: 0, spread: 2.4, life: 0.5 }); } }); },
  trade: (s, o, G, q) => { [0, 0.2, 0.4].forEach((at, i) => { if (once(s, o, 'g' + i, at)) { kick(s, 0.7 + i * 0.3); s.burst('glint', G.fx.x + (i - 1) * 6, G.fx.y, 4 + q * 2, { sp: 26, ang: 0, spread: 2.4, life: 0.8 }); s.burst('spark', G.fx.x, G.fx.y, 4 + q * 2, { sp: 30, ang: 0, spread: 1.6, life: 0.7, floor: G.gy - 1 }); } }); if (once(s, o, 'ch', 0.1)) s.st.cheer = 1; },
  nature: (s, o, G, q) => { [0, 0.4, 0.8].forEach((at, i) => { if (once(s, o, 'l' + i, at)) { kick(s, 0.7); s.burst('leaf', G.fx.x, G.fx.y, 8 + q * 3, { sp: 24, ang: 0, spread: 2.8, life: 1.8, w: 12 }); } }); if (once(s, o, 'd', 0.2)) s.burst('dust', G.cx, G.gy - 8, 12, { sp: 10, ang: 0, spread: 3, life: 1.4, w: G.w }); },
  water: (s, o, G, q) => { [0, 0.3, 0.6].forEach((at, i) => { if (once(s, o, 'p' + i, at)) { kick(s, 0.7); s.burst('bubble', G.fx.x, G.fx.y, 8 + q * 3, { sp: 20, ang: 0, spread: 1.8, life: 1.4, w: 10 }); s.burst('drip', G.fx.x, G.fx.y - 4, 6 + q * 2, { sp: 30, ang: 0, spread: 2, life: 0.8, floor: G.gy - 1 }); } }); if (once(s, o, 'm', 0.1)) s.burst('mist', G.cx, G.gy - 4, 10, { sp: 8, ang: 0, spread: 3, life: 2, w: G.w }); },
  war: (s, o, G, q) => { if (once(s, o, 'h', 0)) { kick(s, 1); s.burst('dust', G.cx, G.gy - 3, 14 + q * 4, { sp: 18, ang: 0, spread: 3, life: 1, w: G.w }); s.st.cheer = 1; } [0.3, 0.6].forEach((at, i) => { if (once(s, o, 'e' + i, at)) { kick(s, 0.8); s.burst('ember', G.fx.x, G.fx.y, 6 + q * 3, { sp: 26, ang: 0, spread: 1.6, life: 1.2 }); } }); if (G.bolt && once(s, o, 'f', 0.55)) G.fired = o.show.id; },
};
const SFX = {
  forge: (d, q) => { SN.hiss(0.5, 0.1, 900, d); [0.2, 0.5, 0.8].forEach((a, i) => SN.clang(d + a, 1 + i * 0.12 + q * 0.04)); },
  heal: (d, q) => { [523, 659, 784, 1047, 1319].slice(0, 3 + Math.min(2, q)).forEach((f, i) => SN.chime(f, d + i * 0.11, 0.07)); SN.chime(1568, d + 0.62, 0.04); },
  holy: (d, q) => { SN.bell(d + 0.05, 1 + q * 0.1); SN.bell(d + 0.75, 0.8 + q * 0.1); },
  arcane: (d, q) => { [0, 0.35, 0.7].forEach((a, i) => SN.shimmer(d + a, 0.8 + i * 0.2 + q * 0.05)); },
  power: (d, q) => { SN.hiss(0.8, 0.12, 2600, d); [0.25, 0.45, 0.7].forEach((a, i) => SN.zap(d + a, 0.8 + i * 0.15 + q * 0.05)); SN.hum(d + 0.1, 1.2); },
  trade: (d, q) => { [0, 0.2, 0.4].forEach((a, i) => SN.coin(d + a, 1 + i * 0.12 + q * 0.03)); },
  nature: (d, q) => { [0, 0.4, 0.8].forEach((a) => SN.chirp(d + a)); SN.hiss(0.8, 0.05, 500, d); },
  water: (d, q) => { [0, 0.3, 0.6].forEach((a, i) => SN.splash(d + a, 0.8 + i * 0.2)); },
  war: (d, q) => { SN.horn(d, 1.1); [0.3, 0.6].forEach((a) => SN.drum(d + a, 1 + q * 0.1)); if (q >= 2) SN.drum(d + 0.9, 1.2); },
};
K.SHOW = SHOW; K.SFX = SFX;
const COL = { forge: '#ff9a3c', heal: '#6fe0a0', holy: '#ffe8a0', arcane: '#b89cff', power: '#9ad8ff', trade: '#ffd06a', nature: '#a8e070', water: '#6ac8ff', war: '#ff7a5a' };
const KIND_OF_CAT = { forge: 'forge', med: 'heal', faith: 'holy', power: 'power', store: 'trade', scout: 'war', train: 'war', eng: 'power', fort: 'war', recruit: 'arcane', luck: 'trade', misc: 'trade' };
const KIND_OF_STYLE = { magic: 'arcane', scifi: 'power', nature: 'nature', water: 'water', fantasy: 'holy', medieval: 'war', steam: 'forge', cartoon: 'trade' };
K.kindOf = (key) => { const B = M.BUILDINGS[key] || {}; return B.cat === 'defense' || !KIND_OF_CAT[B.cat] ? KIND_OF_STYLE[B.style] || 'trade' : KIND_OF_CAT[B.cat]; };
// PT.spec(key, spec): a kit building. spec: style (default: the room's), kind, icon, col, wing, sig(S, sc, G, B), act, look …
const ROOF_ALT = { medieval: [['brick', 5], ['tile', 5], ['wood', 5], ['moss', 5], ['iron', 6], ['crimson', 5]], steam: [['iron', 5], ['copper', 6], ['tile', 4], ['brick', 4]], magic: [['magic', 7], ['dusk', 6], ['arcane', 4]], nature: [['moss', 6], ['leaf', 5], ['wood', 5]], water: [['tile', 6], ['linen', 8], ['teal', 5]], fantasy: [['tile', 7], ['sand', 7], ['gold', 6]], cartoon: [['red', 6], ['pink', 7], ['candy', 6]], scifi: [['linen', 8], ['scifi', 6]] };
const BAN = ['crimson', 'tile', 'leaf', 'magic', 'brass', 'teal'];
PT.spec = function (key, P0) {
  // resolved on first use: evolution buildings get their style and category later in the load (mc-night.js)
  const A = PT.ART[key] = { icon: P0.icon, beam: P0.beam, prep() {
    if (A.P) return; const B = M.BUILDINGS[key] || {}, hs = M.townHash ? M.townHash(key) : key.length * 7, P = A.P = Object.assign({ style: B.style || 'medieval' }, P0);
    const ra = ROOF_ALT[P.style] || ROOF_ALT.medieval; if (!P.roofM) P.roofM = ra[hs % ra.length]; if (!P.wing) P.wing = (hs >> 3) % 2 ? 'l' : 'r'; if (!P.bannerM) P.bannerM = BAN[(hs >> 5) % BAN.length];
    P.kind = P.kind || K.kindOf(key); P.col = P.col || COL[P.kind]; A.col = P.col; A.kind = P.kind; A.mat = (K.tier(P.style, 1).base || K.tier(P.style, 1).wall)[0]; },
    paint: (S, sc, G) => K.build(S, sc, G, A.P), anim: K.anim, show: (s, o, G) => { if (A.P.show) A.P.show(s, o, G, o.show.q); SHOW[A.P.kind](s, o, G, o.show.q); }, sfx: (d, q) => { SFX[A.P.kind](d, q); if (A.P.sfx) A.P.sfx(d, q); } };
  return A;
};
})();
