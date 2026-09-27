// ==== mc-pxmarket.js ====
(function () {
// The night market stall (user ruling 2026-09-27: 「夜市的界面也要重新设计，现在太空了；要把抽卡加进来」). One lit pixel
// scene behind the shop screen, 480×270 art px at 4 logical px each (the minigames' scale): the night sky and the moon,
// the town's roofs, two strings of paper lanterns, the stall (striped awning with a bulb chain, plank back wall, a shelf
// of goods, the counter and its cloth runner), the keeper (each trade its own), the midnight card-pack machine on the
// right, the noodle stall next door, wet cobbles. Painted by the pixel room engine (mc-pxroom.js); one key per trade,
// '_mk_<shop kind>'. Render options o: ev { buy, deny, refresh, pull, leave } — scene times (s) the keeper reacts to;
// tier (0…4: the bulbs and the machine's neon take that quality colour during a draw, -1 = warm), pity (lit pity lamps),
// drop (the pack falling into the tray, 0…1; -1 none), coil (the slot that turns while a pack is bought).
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, n1 } = X;
const AW = 480, AH = 270, GY = 238;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sm = (a) => a * a * (3 - 2 * a);
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const sagY = (S0) => (x) => { const u = (x - S0.x0) / (S0.x1 - S0.x0); return S0.y0 + (S0.y1 - S0.y0) * u + S0.s * 4 * u * (1 - u); };
// the stall: awning x 76…378, poles, back wall, a shelf band between the valance and the card tops, the counter
const STX0 = 83, STX1 = 372, AWY = 52, VAL = 74, SHELF = 116, CTOP = 219, KX = 227;
// the machine
const MX0 = 390, MX1 = 470, MY0 = 64, MWIN = [398, 96, 64, 58];
// lantern strings: A high across the sky, B lower and in front of the awning
const STR = [{ x0: -4, y0: 19, x1: 484, y1: 12, s: 20, step: 32, first: 12, big: 0 }, { x0: 52, y0: 33, x1: 392, y1: 40, s: 11, step: 36, first: 70, big: 1 }];
const LANTS = []; STR.forEach((S0, si) => { const f = sagY(S0); for (let x = S0.first, k = 0; x < S0.x1 - 4; x += S0.step, k++) LANTS.push({ x, y: Math.round(f(x)), si, k, big: S0.big, kind: si === 1 ? (k % 3 === 1 ? 'lamp' : 'red') : (k % 4 === 2 ? 'lamp' : k % 7 === 5 ? 'teal' : 'red') }); });
const QRAMP = [['linen', 9], ['leaf', 9], ['tile', 10], ['arcane', 9], ['fire', 9]];   // quality colours on pixel ramps: 普通 … 传说
// the trades: awning stripes, the runner, the keeper, the goods on the shelf
const KINDS = {
  bazaar:   { aw: [['crimson', 5.4], ['linen', 7.4]], run: ['crimson', 5.2], keep: 'fox', goods: 'curio' },
  barracks: { aw: [['iron', 5.2], ['linen', 7]], run: ['iron', 5], keep: 'vet', goods: 'arms' },
  slaver:   { aw: [['red', 3.6], ['hair', 3.4]], run: ['red', 3.4], keep: 'hood', goods: 'chain' },
  guild:    { aw: [['magic', 6.4], ['arcane', 4.6]], run: ['magic', 6], keep: 'sage', goods: 'arcane' },
  hunters:  { aw: [['leaf', 5.2], ['leather', 5.6]], run: ['leather', 4.6], keep: 'hunt', goods: 'pelt' },
  mercs:    { aw: [['gold', 6.2], ['hair', 3]], run: ['hair', 3.2], keep: 'merc', goods: 'coin' },
};
M.MARKET_KINDS = KINDS;
const STARS = [], LIS = {};   // light indices per trade (paint order), read by anim

function paintLantern(S, L, e) {
  const x = L.x, y = L.y + 2, big = L.big, w = big ? 9 : 7, h = big ? 11 : 9, x0 = x - (w >> 1), m = L.kind, tn = m === 'lamp' ? 8 : m === 'teal' ? 7 : 7.2;
  S.beg(); S.vl(x, L.y, 2, 'iron', 3);
  S.rect(x0 + 1, y, w - 2, 1, 'wood', 3); S.rect(x0 + 1, y + h - 1, w - 2, 1, 'wood', 3);
  for (let k = 1; k < h - 1; k++) { const edge = k === 1 || k === h - 2, ww = edge ? w - 2 : w, xx = edge ? x0 + 1 : x0;
    for (let i = 0; i < ww; i++) { const u = Math.abs(xx + i - x) / (w / 2), rib = (k % 3 === 0) ? -1.4 : 0; S.px(xx + i, y + k, m, tn + 1.6 * (1 - u * u) + rib - (edge ? 0.8 : 0), { e }); } }
  S.px(x, y + (h >> 1), m === 'lamp' ? 'lamp' : m, tn + 3, { e });
  S.vl(x, y + h, big ? 4 : 3, 'crimson', 5); S.px(x, y + h + (big ? 4 : 3), 'brass', 7);
  S.end({ ink: 1 });
}
function scallops(S, x0, x1, y, stripes, depth, m2) {
  for (let x = x0; x < x1; x++) { const k = Math.floor((x - x0) / 12), u = ((x - x0) % 12 + 0.5) / 12 * 2 - 1, d = Math.round(Math.sqrt(Math.max(0, 1 - u * u)) * depth), st = stripes[k % 2];
    for (let yy = 0; yy <= d; yy++) S.px(x, y + yy, st[0], st[1] - 0.6 + (yy === d ? -1.6 : 0), { n: [0, 0.4] });
    if (d >= depth - 1 && Math.abs(u) < 0.2) S.px(x, y + d + 1, m2 || 'brass', 7); }
}
function jar(S, x, y, h, m, tn) { S.beg(); S.rect(x, y - h, 5, h, 'glass', 3); S.rect(x + 1, y - h + 2, 3, h - 2, m, tn); S.vl(x + 1, y - h + 1, h - 2, 'glass', 8); S.rect(x + 1, y - h - 2, 3, 2, 'wood', 5); S.hl(x, y - h, 5, 'glass', 6); S.end(); }
function bottle(S, x, y, m, tn) { S.beg(); S.rect(x, y - 6, 4, 6, m, tn); S.vl(x, y - 6, 6, m, tn + 1.5); S.rect(x + 1, y - 9, 2, 3, 'glass', 5); S.px(x + 1, y - 10, 'wood', 5); S.px(x + 1, y - 5, 'linen', 10); S.end(); }
function goods(S, kind) {
  const r = S.r, L = [[90, 200], [256, 368]];
  if (kind === 'curio') {
    // jars of sweets, a crystal ball on a stand, masks, scroll bundles, a beckoning cat, little lanterns
    jar(S, 92, SHELF, 9, 'candy', 7); jar(S, 99, SHELF, 7, 'leaf', 7); jar(S, 106, SHELF, 10, 'gold', 7);
    S.beg(); S.ell(122, SHELF - 7, 5, 5, 'glass', 6, { dome: 1 }); S.ell(121, SHELF - 8, 3, 3, 'arcane', 8, { e: 255 }); S.px(120, SHELF - 10, 'glass', 11, { e: 255 }); S.rect(118, SHELF - 2, 9, 2, 'brass', 6); S.end();
    [[134, 'bone'], [146, 'crimson']].forEach(([x, m]) => { S.beg(); S.ell(x, SHELF - 7, 5, 6, m, m === 'bone' ? 8 : 6, { dome: 1 }); S.px(x - 3, SHELF - 13, m, 7); S.px(x + 3, SHELF - 13, m, 7); S.px(x - 4, SHELF - 12, m, 7); S.px(x + 4, SHELF - 12, m, 7); S.hl(x - 3, SHELF - 8, 2, 'ink', 1); S.hl(x + 2, SHELF - 8, 2, 'ink', 1); S.px(x - 2, SHELF - 5, m === 'bone' ? 'crimson' : 'gold', 7); S.px(x + 2, SHELF - 5, m === 'bone' ? 'crimson' : 'gold', 7); S.end(); });
    S.beg(); for (let k = 0; k < 4; k++) S.hcyl(158 + (k % 2) * 3, SHELF - 3 - k * 3, 14, 3, 'paper', 7 - k * 0.4, { rim: 1 }); S.hl(163, SHELF - 12, 3, 'crimson', 6); S.end();
    S.beg(); S.rect(180, SHELF - 10, 8, 10, 'gold', 7); S.ell(184, SHELF - 12, 4, 4, 'gold', 7.5, { dome: 1 }); S.px(181, SHELF - 16, 'gold', 7); S.px(187, SHELF - 16, 'gold', 7); S.rect(187, SHELF - 18, 2, 5, 'gold', 8); S.hl(182, SHELF - 12, 1, 'ink', 1); S.hl(185, SHELF - 12, 1, 'ink', 1); S.px(184, SHELF - 6, 'crimson', 7); S.rect(182, SHELF - 4, 5, 2, 'gold', 6); S.end();
    [262, 274].forEach((x, i) => { S.beg(); S.rect(x, SHELF - 8, 6, 8, i ? 'lamp' : 'red', 7, { e: 255 }); S.hl(x, SHELF - 9, 6, 'wood', 3); S.hl(x, SHELF, 6, 'wood', 3); S.end(); });
    S.beg(); S.box(288, SHELF - 9, 16, 9, 'wood', 5.5, { top: 2 }); S.hl(288, SHELF - 5, 16, 'crimson', 6); S.end();
    for (let k = 0; k < 6; k++) bottle(S, 310 + k * 5, SHELF, ['crimson', 'leaf', 'tile', 'arcane', 'gold', 'teal'][k], 6);
    jar(S, 344, SHELF, 11, 'copper', 6); jar(S, 351, SHELF, 8, 'tile', 7); jar(S, 358, SHELF, 10, 'candy', 7);
  } else if (kind === 'arms') {
    // spears in a rack, shields, helmets
    for (let k = 0; k < 7; k++) { S.beg(); S.vl(94 + k * 5, SHELF - 30, 30, 'wood', 5.5); S.poly([[94 + k * 5 - 1, SHELF - 30], [94 + k * 5 + 2, SHELF - 30], [94 + k * 5 + 0.5, SHELF - 36]], 'iron', 8); S.end(); }
    [[140, 'crimson'], [160, 'tile'], [180, 'iron']].forEach(([x, m]) => { S.beg(); S.ell(x, SHELF - 8, 7, 8, m, 5.5, { dome: 1 }); S.ell(x, SHELF - 8, 2, 2, 'brass', 8, { dome: 1 }); S.ell(x, SHELF - 8, 7, 8, 'iron', 6, { ring: 1 }); S.end(); });
    [264, 280, 296].forEach(x => { S.beg(); S.ell(x, SHELF - 5, 6, 5, 'iron', 6, { dome: 1 }); S.rect(x - 6, SHELF - 2, 13, 2, 'iron', 5); S.vl(x, SHELF - 10, 7, 'crimson', 6); S.end(); });
    for (let k = 0; k < 8; k++) { S.beg(); S.vl(312 + k * 7, SHELF - 26, 26, 'iron', 7); S.hl(310 + k * 7, SHELF - 8, 5, 'brass', 6); S.end(); }
  } else if (kind === 'chain') {
    [[100, 140], [300, 350]].forEach(([a, b]) => { S.beg(); for (let x = a; x < b; x += 5) S.vl(x, SHELF - 30, 30, 'iron', 5); S.hl(a, SHELF - 30, b - a, 'iron', 6); S.hl(a, SHELF - 1, b - a, 'iron', 4); S.end(); });
    for (let k = 0; k < 16; k++) { const x = 150 + k * 3; S.px(x, SHELF - 20 + Math.round(Math.sin(k / 15 * Math.PI) * 8), 'iron', 7); }
    S.beg(); S.ell(270, SHELF - 6, 5, 6, 'bone', 7, { dome: 1 }); S.hl(268, SHELF - 7, 1, 'ink', 1); S.hl(271, SHELF - 7, 1, 'ink', 1); S.end();
  } else if (kind === 'arcane') {
    for (let k = 0; k < 9; k++) { const c = ['magic', 'crimson', 'tile', 'leaf', 'leather'][k % 5]; S.beg(); S.rect(92 + k * 6, SHELF - 14 + (k % 3), 5, 14 - (k % 3), c, 5.5); S.vl(92 + k * 6, SHELF - 14 + (k % 3), 14 - (k % 3), c, 7); S.hl(93 + k * 6, SHELF - 10, 3, 'gold', 7); S.end(); }
    S.beg(); S.ell(160, SHELF - 8, 6, 6, 'glass', 5, { dome: 1 }); S.ell(160, SHELF - 8, 3, 3, 'arcane', 9, { e: 255 }); S.rect(155, SHELF - 2, 11, 2, 'brass', 6); S.end();
    for (let k = 0; k < 5; k++) bottle(S, 176 + k * 5, SHELF, ['arcane', 'teal', 'magic', 'tile', 'arcane'][k], 7);
    S.beg(); S.rect(262, SHELF - 12, 20, 12, 'paper', 7); S.hl(262, SHELF - 12, 20, 'paper', 9); S.ell(272, SHELF - 6, 4, 4, 'arcane', 8, { ring: 1, e: 255 }); S.end();
    for (let k = 0; k < 9; k++) { const c = ['magic', 'tile', 'crimson'][k % 3]; S.beg(); S.rect(300 + k * 7, SHELF - 16, 6, 16, c, 5); S.vl(300 + k * 7, SHELF - 16, 16, c, 6.6); S.end(); }
  } else if (kind === 'pelt') {
    [[96, 'leather'], [136, 'sand'], [300, 'leather'], [336, 'hair']].forEach(([x, m]) => { S.beg(); S.poly([[x, SHELF - 24], [x + 26, SHELF - 24], [x + 22, SHELF], [x + 13, SHELF - 4], [x + 4, SHELF]], m, 5.5); S.noise(x, SHELF - 24, 26, 24, 1, 2, x); S.end(); });
    S.beg(); S.line(180, SHELF - 20, 196, SHELF - 4, 'bone', 8, { w: 1 }); S.line(196, SHELF - 20, 180, SHELF - 4, 'bone', 8); S.end();
    S.beg(); for (let k = 0; k < 18; k++) S.px(266 + Math.round(Math.sin(k / 17 * Math.PI) * 8), SHELF - 22 + k, 'wood', 7); S.line(266, SHELF - 22, 266, SHELF - 4, 'linen', 7); S.end();
  } else if (kind === 'coin') {
    for (let k = 0; k < 5; k++) { S.beg(); S.ell(100 + k * 14, SHELF - 6, 6, 6, 'leather', 5, { dome: 1 }); S.hl(97 + k * 14, SHELF - 11, 6, 'leather', 3); S.px(100 + k * 14, SHELF - 13, 'gold', 9); S.end(); }
    S.beg(); S.rect(172, SHELF - 30, 26, 30, 'paper', 6.5); for (let k = 0; k < 6; k++) S.rect(175 + (k % 2) * 11, SHELF - 27 + Math.floor(k / 2) * 9, 9, 7, 'paper', 8.4); S.end();
    for (let k = 0; k < 20; k++) S.px(264 + Math.floor(r() * 50), SHELF - 1 - Math.floor(r() * 6), 'gold', 8 + r() * 2);
    S.beg(); S.line(330, SHELF - 34, 350, SHELF - 2, 'iron', 9, { w: 2 }); S.hl(334, SHELF - 26, 10, 'brass', 7); S.end();
  }
  L.forEach(([a, b]) => { for (let k = 0; k < 3; k++) S.px(a + Math.floor(r() * (b - a)), SHELF - 1, 'wood', 3); });
}

function paint(S, sc, kind) {
  const K = KINDS[kind] || KINDS.bazaar, r = S.r;
  // ── lights (index order is fixed: the anim kicks them by index) ──
  const LI = {};
  LANTS.forEach((L, i) => { if (L.si === 0 && L.k % 2) return; LI['l' + i] = sc.light({ x: L.x, y: L.y + 7, z: L.si ? 30 : 22, r: L.si ? 52 : 40, i: L.si ? 0.7 : 0.45, c: L.kind === 'teal' ? '#5fd0c0' : L.kind === 'lamp' ? '#ffc070' : '#ff8a60', fl: 'candle', ph: i * 1.3, tint: 0.5 }); });
  LI.keeper = sc.light({ x: 196, y: 96, z: 34, r: 70, i: 0.95, c: '#ffc070', fl: 'candle', ph: 3.3, tint: 0.45 });
  LI.bulbs = sc.light({ x: KX, y: 90, z: 30, r: 170, i: 0.55, c: '#ffd08a', fl: 'candle', ph: 1.1, tint: 0.25 });
  LI.neon = sc.light({ x: 430, y: 78, z: 30, r: 90, i: 0.9, c: '#5fe0d0', fl: 'buzz', ph: 5, tint: 0.55 });
  LI.win = sc.light({ x: 430, y: 128, z: 22, r: 60, i: 0.7, c: '#c8e8ff', fl: 'pulse', amp: 0.06, sp: 2, tint: 0.35 });
  LI.pot = sc.light({ x: 24, y: 196, z: 20, r: 60, i: 0.9, c: '#ff9a40', fl: 'fire', ph: 2, tint: 0.5 });
  LI.post = sc.light({ x: 70, y: 96, z: 28, r: 96, i: 0.9, c: '#ffd08a', fl: 'candle', ph: 8, tint: 0.4 });
  LI.spill = sc.light({ x: KX, y: 226, z: 44, r: 160, i: 0.6, c: '#ffc890', fl: 'candle', ph: 4.4, tint: 0.3 });
  LI.tray = sc.light({ x: 430, y: 224, z: 16, r: 50, i: 0.65, c: '#5fe0d0', fl: 'pulse', amp: 0.1, sp: 1.3, tint: 0.5 });
  LI.pool = sc.light({ x: 70, y: 214, z: 26, r: 70, i: 0.55, c: '#ffd08a', fl: 'candle', ph: 8, tint: 0.4 });
  LI.noodle = sc.light({ x: 52, y: 162, z: 22, r: 44, i: 0.6, c: '#ff7050', fl: 'candle', ph: 6, tint: 0.5 });
  LIS[kind] = LI;

  S.lay('wall');
  // ── sky: hard bands from ink to indigo, a faint milky way, stars, the moon with a banded halo ──
  for (let y = 0; y < GY; y++) S.rect(0, y, AW, 1, 'night', 1.5 + Math.min(1, y / 140) * 3.3, { e: 255 });
  for (let i = 0; i < 170; i++) { const k = r(), x = 20 + k * 360 + (r() - 0.5) * 60, y = 4 + k * 64 + (r() - 0.5) * 20; S.px(x, y, 'lav', 2.5 + r() * 2, { e: 255 }); }
  for (let i = 0; i < 120; i++) { const x = Math.floor(r() * AW), y = Math.floor(r() * 120), b = r(), tn = 6 + b * 4.5; S.px(x, y, 'linen', tn, { e: 255 }); if (b > 0.9) { S.px(x - 1, y, 'linen', 6, { e: 255 }); S.px(x + 1, y, 'linen', 6, { e: 255 }); S.px(x, y - 1, 'linen', 6, { e: 255 }); S.px(x, y + 1, 'linen', 6, { e: 255 }); } STARS.push({ x, y, b, ph: r() * 6.28, sp: 0.6 + r() * 2 }); }
  const mx = 428, my = 25; [[20, 2.1], [16.5, 2.9], [13.5, 3.8]].forEach(([rr, tn]) => S.ell(mx, my, rr, rr, 'night', tn, { e: 255 }));
  for (let y = -11; y <= 11; y++) for (let x = -11; x <= 11; x++) { const d = Math.hypot(x + 0.5, y + 0.5); if (d > 11) continue; const lx = (x + 0.5) / 11, ly = (y + 0.5) / 11, sh = 0.5 + 0.5 * (-lx * 0.55 - ly * 0.55 + Math.sqrt(Math.max(0, 1 - lx * lx - ly * ly)) * 0.65);
    S.px(mx + x, my + y, 'bone', 5 + sh * 5.4 + (X.vnoise((mx + x) / 4, (my + y) / 4, 9) < 0.33 ? -1.3 : 0), { e: 255 }); }
  [[-4, -3, 2.2], [3, 4, 1.8], [4, -5, 1.4], [-3, 6, 1.2]].forEach(([a, b, rr]) => S.ell(mx + a, my + b, rr, rr, 'bone', 6.2, { e: 255 }));
  // ── the town behind: roofs and a pagoda and a clock tower over the awning, lit windows, strings of tiny lights ──
  const roofs = [];
  for (let x = -8; x < AW;) { const w = 18 + Math.floor(r() * 24), mid0 = x + w / 2, cen = mid0 > 70 && mid0 < 390, top = cen ? 44 + Math.floor(r() * 16) : 58 + Math.floor(r() * 44); roofs.push([x, w, top, r() < 0.55]); x += w - 2 + Math.floor(r() * 4); }
  roofs.forEach(([x, w, top, gable]) => {
    const tn = 0.5 + r() * 0.35, ph = gable ? Math.round(w * 0.32) : 0;
    if (gable) { for (let k = 0; k <= ph; k++) { const a = x + Math.round((ph - k) * (w / 2) / ph), b = x + w - Math.round((ph - k) * (w / 2) / ph); S.rect(a, top + k, b - a, 1, 'night', tn, { e: 255 }); S.px(b - 1, top + k, 'night', tn + 1.6, { e: 255 }); S.px(b - 2, top + k, 'night', tn + 0.8, { e: 255 }); } }
    else { S.rect(x, top, w, 2, 'night', tn + 0.5, { e: 255 }); if (r() < 0.6) { const cx0 = x + 3 + Math.floor(r() * (w - 8)); S.rect(cx0, top - 6, 3, 6, 'night', tn + 0.3, { e: 255 }); } }
    S.rect(x, top + ph, w, GY - top - ph, 'night', tn, { e: 255 }); S.vl(x + w - 1, top + ph, GY - top - ph, 'night', tn + 1.1, { e: 255 });
    for (let wy = top + ph + 4; wy < 150; wy += 9) for (let wx = x + 3; wx < x + w - 4; wx += 7) { if (r() < 0.62) continue; const lit = r(); S.rect(wx, wy, 2, 3, lit < 0.75 ? 'lamp' : 'teal', lit < 0.75 ? 6 + r() * 2.5 : 6, { e: 255 }); if (r() < 0.3) S.px(wx, wy + 1, 'lamp', 4, { e: 255 }); }
  });
  // pagoda (centre right) and clock tower (centre left) rise over the awning
  const pag = (cx, base) => { for (let tier = 0; tier < 4; tier++) { const y = base - tier * 9, hw = 15 - tier * 3; for (let k = 0; k < 4; k++) S.rect(cx - hw - (3 - k), y - k, (hw + 3 - k) * 2 + 1, 1, 'night', 0.8 + k * 0.35, { e: 255 }); S.rect(cx - hw + 3, y, (hw - 3) * 2 + 1, 6, 'night', 0.55, { e: 255 }); S.px(cx - hw - 3, y + 1, 'red', 7, { e: 255 }); S.px(cx + hw + 3, y + 1, 'red', 7, { e: 255 }); if (tier < 3) S.rect(cx - 1, y + 2, 3, 3, 'lamp', 7.5, { e: 255 }); } S.vl(cx, base - 42, 8, 'night', 2.2, { e: 255 }); S.px(cx, base - 43, 'lamp', 9, { e: 255 }); };
  pag(318, 60);
  S.rect(140, 26, 16, 36, 'night', 0.6, { e: 255 }); S.vl(155, 26, 36, 'night', 1.7, { e: 255 }); S.poly([[138, 27], [158, 27], [148, 12]], 'night', 0.9, { e: 255 }); S.vl(148, 8, 5, 'night', 2, { e: 255 });
  S.ell(148, 36, 5, 5, 'teal', 5.5, { e: 255 }); S.ell(148, 36, 5, 5, 'teal', 3, { e: 255, ring: 1 }); S.vl(148, 33, 3, 'ink', 1, { e: 255 }); S.hl(148, 36, 3, 'ink', 1, { e: 255 });
  // ── the stall's back wall: dark planks, shaded under the awning ──
  TX.vplanks(S, STX0, VAL, STX1 - STX0, CTOP - VAL, 'wood', 3.1, { pw: 8, knots: 1 });
  S.ao(STX0, VAL, STX1 - STX0, 26, 't', 2.4);
  // ── cobbles and puddles (floor rows) ──
  for (let y = GY; y < AH; y++) S.rect(0, y, AW, 1, 'stone', 2.2);
  for (let row = 0, y = GY; y < AH; row++) { const hh = 3 + Math.floor(row / 3); let x = -((row * 5) % 9);
    while (x < AW) { const w = 6 + Math.floor(r() * 5) + Math.floor(row / 2), tn = 4.6 + r() * 1.5 - row * 0.1; S.rect(x + 1, y + 1, w - 1, hh - 1, 'stone', tn, { n: [0, -0.3] }); S.hl(x + 1, y + 1, w - 1, 'stone', tn + 1); if (r() < 0.25) S.px(x + 2 + Math.floor(r() * (w - 3)), y + 2, 'moss', 4); x += w; }
    y += hh; }
  [[150, 247, 44, 4], [300, 255, 56, 5], [52, 262, 34, 4], [428, 249, 40, 4], [226, 265, 40, 3], [372, 266, 30, 3]].forEach(([cx, cy, rx, ry]) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const u = x / rx, v = y / ry, d = u * u + v * v + (X.vnoise((cx + x) / 5, (cy + y) / 3, 4) - 0.5) * 0.5; if (d < 1) S.px(cx + x, cy + y, 'water', 2.6 - d * 0.8, { n: [0, -0.2] }); } });
  // reflections of the lanterns and the neon in the puddles: dithered columns (static; the lights flicker over them)
  const refl = (x, m, tn) => { for (let y = GY + 1; y < AH; y++) { const p = S.at(x, y); if (p !== X.MI.water) continue; if ((y & 1) === 0) S.px(x, y, m, tn - (y - GY) * 0.08, { e: 255 }); if ((y % 3) === 0) S.px(x + 1, y, m, tn - 1.5, { e: 255 }); } };
  LANTS.forEach(L => refl(L.x, L.kind === 'teal' ? 'teal' : L.kind === 'lamp' ? 'lamp' : 'red', 5.2));
  [424, 430, 436].forEach(x => refl(x, 'teal', 6)); refl(70, 'lamp', 6);

  S.lay('back');
  // ── the neighbour: a noodle stall with its pot, awning and paper menu ──
  for (let x = -2; x < 66; x++) { const st = Math.floor((x + 2) / 8) % 2; S.rect(x, 140, 1, 10, st ? 'linen' : 'teal', st ? 7 : 5, { n: [0, 0.4] }); }
  scallops(S, -2, 66, 150, [['teal', 5], ['linen', 7]], 3, 'linen');
  TX.vplanks(S, 0, 154, 62, 52, 'wood', 2.6, { pw: 7 });
  [6, 13, 20, 27, 34].forEach((x, i) => { S.beg(); S.rect(x, 156, 5, 16 + (i % 2) * 3, 'paper', 7.8 - (i % 3) * 0.4); for (let k = 0; k < 4; k++) S.hl(x + 1, 159 + k * 3, 3, 'ink', 2); S.end(); });
  S.beg(); S.cyl(12, 188, 24, 18, 'iron', 5, { rim: 2 }); S.hl(12, 188, 24, 'iron', 8); S.ell(24, 187, 12, 2, 'iron', 6.5); S.rect(22, 184, 5, 2, 'iron', 7); S.end();
  S.beg(); S.box(0, 204, 64, 3, 'wood', 6, { top: 2 }); TX.planks(S, 0, 207, 64, 31, 'wood', 3.6, { ph: 5 }); S.end({ none: 1 });
  S.beg(); S.vl(64, 138, 100, 'wood', 4.6); S.vl(65, 138, 100, 'wood', 3.4); S.end();
  // ── the shelf band: brackets, the plank, the goods; charms and herbs hanging from the awning ──
  S.beg(); S.box(STX0 + 4, SHELF, STX1 - STX0 - 8, 3, 'wood', 5.6, { top: 1 }); [100, 170, 290, 356].forEach(x => { S.rect(x, SHELF + 3, 2, 5, 'wood', 4); S.px(x + 2, SHELF + 3, 'wood', 4); }); S.end();
  S.ao(STX0 + 4, SHELF + 3, STX1 - STX0 - 8, 8, 't', 1.6);
  goods(S, K.goods);
  [[98, 6], [118, 9], [196, 5], [258, 8], [342, 7], [362, 6]].forEach(([x, len], i) => { S.beg(); S.vl(x, VAL + 6, len, 'linen', 5); if (i % 2) { S.rect(x - 2, VAL + 6 + len, 5, 7, 'leaf', 4.6); S.px(x - 1, VAL + 13 + len, 'leaf', 3); S.px(x + 1, VAL + 13 + len, 'leaf', 3); } else { S.rect(x - 2, VAL + 6 + len, 5, 8, 'paper', 8); S.hl(x - 1, VAL + 8 + len, 3, 'crimson', 6); S.hl(x - 1, VAL + 11 + len, 3, 'crimson', 6); } S.end(); });

  S.lay('mid');
  // ── the awning: stripes, pleats, the batten, the scalloped valance with a gold fringe, the bulb wire ──
  S.beg(); S.box(74, AWY - 3, 306, 3, 'wood', 5, { top: 1 }); S.end();
  for (let x = 76; x < 378; x++) { const k = Math.floor((x - 76) / 12), st = K.aw[k % 2], q = ((x - 76) % 12) / 11;
    for (let y = AWY; y < VAL; y++) { const v = (y - AWY) / (VAL - AWY); S.px(x, y, st[0], st[1] - 0.9 + v * 1.4 - (q > 0.85 ? 0.7 : q < 0.1 ? -0.3 : 0), { n: [0, 0.35 - v * 0.5] }); } }
  scallops(S, 76, 378, VAL, K.aw, 6);
  for (let x = 78; x < 376; x++) S.px(x, VAL + 3 + Math.round(Math.sin(((x - 76) % 12) / 12 * Math.PI) * 2), 'iron', 2);
  // poles, capped
  [[79, 'l'], [372, 'r']].forEach(([x]) => { S.beg(); S.cyl(x, AWY - 4, 4, GY - AWY + 4, 'wood', 5, { rim: 1.6 }); S.rect(x - 1, AWY - 7, 6, 3, 'brass', 6.5); S.px(x, AWY - 7, 'brass', 9); S.end(); });
  // ── the counter: a heavy top, the plank front, the runner with the trade's emblem and tassels ──
  S.beg(); S.box(STX0 - 2, CTOP, STX1 - STX0 + 4, 3, 'wood', 6.4, { top: 2 }); S.end();
  S.beg(); TX.planks(S, STX0, CTOP + 3, STX1 - STX0, GY - CTOP - 3, 'wood', 3.8, { ph: 5 }); S.end({ none: 1 });
  S.ao(STX0, CTOP + 3, STX1 - STX0, 6, 't', 1.8);
  const [rm, rt] = K.run; S.beg(); S.rect(98, CTOP + 3, 258, 10, rm, rt); S.hl(98, CTOP + 3, 258, 'brass', 7); S.hl(98, CTOP + 12, 258, 'brass', 6);
  for (let x = 98; x < 356; x += 6) { S.px(x + 3, CTOP + 13, rm, rt - 1); S.px(x + 3, CTOP + 14, 'brass', 6.5); }
  S.ell(KX, CTOP + 8, 4, 3.5, 'brass', 7.5, { dome: 1 }); S.ell(KX, CTOP + 8, 2, 1.5, rm, rt + 2); S.end();
  // ── the card-pack machine: sign box, violet enamel body with a side face, the window, lamp strips, the panel, the tray ──
  S.beg(); S.box(MX0 - 1, MY0, MX1 - MX0 + 2, 26, 'brass', 5.5, { side: 3 }); S.rect(MX0 + 3, MY0 + 3, MX1 - MX0 - 6, 20, 'night', 0.6, { e: 255 });
  [[MX0 + 1, MY0 + 1], [MX1 - 3, MY0 + 1], [MX0 + 1, MY0 + 23], [MX1 - 3, MY0 + 23]].forEach(([a, b]) => TX.rivet(S, a, b, 'brass', 6)); S.end();
  S.beg(); S.box(MX0 + 2, MY0 + 26, MX1 - MX0 - 4, GY - MY0 - 30, 'magic', 4.8, { side: 4 });
  S.rect(MX0 + 2, MY0 + 26, 2, GY - MY0 - 30, 'brass', 7); S.rect(MX1 - 4, MY0 + 26, 2, GY - MY0 - 30, 'brass', 5);
  const [wx, wy, ww, wh] = MWIN; S.box(wx - 3, wy - 3, ww + 6, wh + 6, 'brass', 6); S.rect(wx, wy, ww, wh, 'glass', 1.4);
  for (let row = 0; row < 3; row++) { const sy = wy + 18 + row * 19; S.rect(wx, sy, ww, 2, 'iron', 5); S.hl(wx, sy, ww, 'iron', 7);
    for (let k = 0; k < 4; k++) { const px = wx + 3 + k * 15, q = [0, 0, 1, 0, 1, 2, 0, 1, 3, 1, 2, 4][row * 4 + k], [qm, qt] = QRAMP[q];
      S.rect(px, sy - 15, 9, 14, qm, qt - 2.2); S.vl(px, sy - 15, 14, qm, qt - 0.6); S.vl(px + 8, sy - 15, 14, qm, qt - 3.4);
      for (let i = 0; i < 9; i++) S.px(px + i, sy - 16 + (i % 2), qm, qt - 1); S.rect(px + 3, sy - 10, 3, 3, 'linen', 9); S.px(px + 4, sy - 11, 'linen', 10); S.px(px + 4, sy - 7, 'linen', 8);
      S.line(px + 1, sy - 3, px + 6, sy - 14, qm, qt + 0.8);
      for (let i = 0; i < 12; i += 3) S.line(px - 1 + i, sy - 1, px + 1 + i, sy - 4, 'iron', 8); } }
  S.rect(wx, wy + wh - 4, ww, 4, 'ink', 1);
  const panelY = 164; S.box(MX0 + 7, panelY, MX1 - MX0 - 14, 10, 'night', 1.6); S.box(MX0 + 7, panelY + 12, MX1 - MX0 - 14, 8, 'night', 1.6);
  S.box(MX0 + 7, 186, MX1 - MX0 - 14, 22, 'iron', 2.8); S.rect(MX0 + 12, 190, 3, 12, 'ink', 0); S.vl(MX0 + 11, 190, 12, 'iron', 7); S.vl(MX0 + 15, 190, 12, 'iron', 4); S.rect(MX0 + 10, 186 + 18, 7, 2, 'brass', 7);
  S.box(MX0 + 14, 212, MX1 - MX0 - 28, 18, 'brass', 5.5); S.rect(MX0 + 17, 215, MX1 - MX0 - 34, 13, 'ink', 0.6); S.hl(MX0 + 17, 215, MX1 - MX0 - 34, 'iron', 4);
  [MX0 + 6, MX1 - 10].forEach(x => { S.rect(x, GY - 4, 6, 4, 'brass', 6); S.hl(x, GY - 4, 6, 'brass', 8.5); }); S.end();
  S.shadow([[MX0 - 4, GY], [MX1 + 8, GY], [MX1 + 16, GY + 8], [MX0, GY + 8]], 1.4);

  S.lay('front');
  // ── near the eye: the lamp post, crates, a stool; the lantern strings ──
  S.beg(); S.cyl(68, 100, 4, GY - 100, 'iron', 4.4, { rim: 1.5 }); S.rect(66, GY - 5, 8, 5, 'iron', 5); S.hl(66, GY - 5, 8, 'iron', 7);
  S.poly([[64, 88], [76, 88], [74, 86], [66, 86]], 'iron', 6); S.rect(65, 88, 10, 11, 'lamp', 8.5, { e: LI.post + 1 }); S.vl(65, 88, 11, 'iron', 4); S.vl(74, 88, 11, 'iron', 4); S.vl(70, 88, 11, 'iron', 4); S.hl(64, 99, 12, 'iron', 5); S.rect(68, 100, 4, 2, 'iron', 6); S.end();
  S.beg(); S.box(2, 224, 20, 14, 'wood', 5, { top: 2 }); S.hl(2, 230, 20, 'wood', 3); S.box(24, 228, 14, 10, 'wood', 4.6, { top: 2 }); S.box(6, 212, 14, 10, 'wood', 5.4, { top: 2 }); S.hl(6, 216, 14, 'crimson', 5); S.end();
  STR.forEach((S0, si) => { const f = sagY(S0); for (let x = Math.max(0, S0.x0); x < Math.min(AW, S0.x1); x++) S.px(x, f(x), 'iron', si ? 3.4 : 2.4); });
  sc.emit({ k: 'steam', x: 24, y: 184, w: 14, h: 2, rate: 5, sp: 5, life: 2.4 });
  sc.emit({ k: 'ember', x: 24, y: 206, w: 16, h: 2, rate: 1.4, sp: 10, life: 1.4 });
  sc.emit({ k: 'glint', x: 230, y: 200, w: 440, h: 70, rate: 1.2, life: 1.3 });
  sc.emit({ k: 'dust', x: 200, y: 100, w: 150, h: 60, rate: 1, sp: 2, life: 3.2 });
}

// the keeper, from the waist up behind the counter: each trade its own. p: lean (−1…1 toward the machine), arms (0 rest …
// 1 raised), shake (head turn), bow, puff (pipe smoke), blink
function keeper(D, kind, t, p, s) {
  const x = KX + Math.round(p.lean * 3), bob = Math.round(Math.sin(t * 1.7) * 0.6 + 0.4) + Math.round(p.bow * 4), hy = 86 + bob, sy = hy + 21, turn = Math.round(p.shake * 2);
  const robe = { fox: ['denim', 3.6], vet: ['iron', 4.4], hood: ['hair', 2.6], sage: ['magic', 5], hunt: ['leather', 4.4], merc: ['crimson', 3.4] }[kind] || ['denim', 3.6];
  D.beg();
  // body: wide shoulders, sleeves, a sash
  D.poly([[x - 17, sy + 6], [x - 11, sy], [x + 11, sy], [x + 17, sy + 6], [x + 19, 132], [x - 19, 132]], robe[0], robe[1], { n: [0, -0.2] });
  D.poly([[x - 4, sy], [x + 4, sy], [x + 1, sy + 14], [x - 1, sy + 14]], robe[0], robe[1] - 1.4);
  D.hl(x - 11, sy, 22, robe[0], robe[1] + 1.2, { n: [0, -0.8] });
  if (kind === 'fox' || kind === 'sage') { D.line(x - 6, sy, x + 2, sy + 12, 'linen', 7); D.line(x + 6, sy, x - 2, sy + 12, 'linen', 6); }
  if (kind === 'vet' || kind === 'merc') { D.rect(x - 16, sy + 1, 8, 4, 'iron', 6.5); D.rect(x + 8, sy + 1, 8, 4, 'iron', 5.5); D.hl(x - 16, sy + 1, 8, 'iron', 9); }
  if (kind === 'hunt') { D.poly([[x - 16, sy + 2], [x + 16, sy + 2], [x + 12, sy + 8], [x - 12, sy + 8]], 'sand', 5.5); }
  // arms: resting on the (hidden) counter, or raised
  const armUp = p.arms, lx = x - 15, rx = x + 15;
  [[lx, -1], [rx, 1]].forEach(([ax, sd]) => { const hx = ax + sd * Math.round(2 - armUp * 3), hy2 = Math.round(sy + 20 - armUp * 22);
    D.line(ax, sy + 4, hx, hy2, robe[0], robe[1] + (sd > 0 ? -0.6 : 0.4), { w: 4 }); D.rect(hx - 1 + (sd > 0 ? 1 : 0), hy2 - 1, 3, 3, 'skin', 6); });
  // the head
  const hx = x + turn;
  if (kind === 'fox') {
    D.poly([[hx - 9, hy + 20], [hx - 10, hy + 6], [hx - 7, hy - 1], [hx + 7, hy - 1], [hx + 10, hy + 6], [hx + 9, hy + 20]], 'hair', 2.2);
    D.poly([[hx - 8, hy + 2], [hx - 7, hy - 7], [hx - 2, hy]], 'bone', 8); D.poly([[hx + 8, hy + 2], [hx + 7, hy - 7], [hx + 2, hy]], 'bone', 7.4); D.px(hx - 6, hy - 3, 'crimson', 7); D.px(hx + 6, hy - 3, 'crimson', 6.5);
    D.ell(hx, hy + 8, 7, 8, 'bone', 7.8, { dome: 1 }); D.poly([[hx - 3, hy + 12], [hx + 3, hy + 12], [hx, hy + 18]], 'bone', 7);
    D.line(hx - 6, hy + 4, hx - 2, hy + 6, 'crimson', 7); D.line(hx + 6, hy + 4, hx + 2, hy + 6, 'crimson', 7); D.hl(hx - 5, hy + 12, 2, 'crimson', 6.5); D.hl(hx + 4, hy + 12, 2, 'crimson', 6.5); D.px(hx, hy + 17, 'ink', 1);
    const bl = p.blink ? 0 : 1; D.hl(hx - 5, hy + 8, 3, 'ink', 0.5); D.hl(hx + 3, hy + 8, 3, 'ink', 0.5); if (bl) { D.px(hx - 4, hy + 8, 'teal', 9, { e: 255 }); D.px(hx + 4, hy + 8, 'teal', 9, { e: 255 }); }
    D.px(hx, hy + 20, 'crimson', 6); D.ell(hx, hy + 22, 1.5, 1.5, 'gold', 8.5, { dome: 1 });
  } else {
    const skin = kind === 'hood' ? ['hair', 1.2] : ['skin', 5.8];
    D.ell(hx, hy + 9, 7, 8, skin[0], skin[1], { dome: 1 });
    if (kind === 'vet') { D.ell(hx, hy + 3, 8, 5, 'iron', 6.5, { dome: 1 }); D.hl(hx - 9, hy + 5, 18, 'iron', 5); D.rect(hx - 5, hy + 8, 4, 2, 'hair', 1); D.hl(hx - 6, hy + 7, 7, 'hair', 1); D.px(hx + 3, hy + 9, 'ink', 0.5); D.hl(hx - 3, hy + 13, 6, 'hair', 4); D.rect(hx - 4, hy + 14, 8, 3, 'linen', 6); }
    if (kind === 'hood') { D.poly([[hx - 11, hy + 20], [hx - 10, hy + 2], [hx, hy - 6], [hx + 10, hy + 2], [hx + 11, hy + 20]], 'hair', 2.6); D.ell(hx, hy + 10, 6, 7, 'ink', 0.4); D.px(hx - 3, hy + 9, 'red', 9, { e: 255 }); D.px(hx + 2, hy + 9, 'red', 9, { e: 255 }); }
    if (kind === 'sage') { D.poly([[hx - 14, hy + 3], [hx + 14, hy + 3], [hx + 4, hy - 2], [hx + 7, hy - 14], [hx - 4, hy - 2]], 'magic', 6); D.hl(hx - 14, hy + 3, 28, 'magic', 4.5); D.px(hx + 7, hy - 14, 'gold', 9, { e: 255 }); D.poly([[hx - 6, hy + 12], [hx + 6, hy + 12], [hx, hy + 24]], 'linen', 8.4); D.px(hx - 3, hy + 9, 'ink', 1); D.px(hx + 3, hy + 9, 'ink', 1); }
    if (kind === 'hunt') { D.ell(hx, hy + 4, 9, 7, 'sand', 5.5, { dome: 1 }); D.px(hx - 7, hy - 2, 'sand', 6); D.px(hx + 7, hy - 2, 'sand', 6); D.hl(hx - 4, hy + 9, 3, 'ink', 1); D.hl(hx + 2, hy + 9, 3, 'ink', 1); D.hl(hx - 2, hy + 14, 5, 'skin', 4); }
    if (kind === 'merc') { D.hl(hx - 7, hy + 3, 14, 'hair', 2.4); D.rect(hx - 7, hy + 1, 14, 3, 'hair', 2.6); D.hl(hx - 5, hy + 9, 3, 'ink', 1); D.hl(hx + 2, hy + 9, 3, 'ink', 1); D.line(hx + 2, hy + 6, hx + 5, hy + 13, 'crimson', 5); D.hl(hx - 3, hy + 14, 7, 'skin', 3.8); }
  }
  D.end({ lit: 1 });
  // the pipe (fox): a long kiseru to the mask's mouth
  if (kind === 'fox' && armUp < 0.3) { D.beg(); D.line(hx + 1, hy + 17, rx + 2, sy + 12, 'wood', 4); D.rect(hx - 1, hy + 16, 3, 2, 'brass', 7); D.end(); if (p.puff && s) s.burst('steam', hx, hy + 15, 1, { sp: 3, life: 1.6 }); }
}

function anim(D, t, s, o, kind) {
  const K = KINDS[kind] || KINDS.bazaar, ev = (o && o.ev) || {}, tier = o && o.tier != null ? o.tier : -1, t0 = t - (s ? s.seed * 13 : 0), since = (k) => (ev[k] != null ? t0 - ev[k] : 99);
  // a blast (a big reveal) swings every lantern hard for a moment
  const bl = o && o.blast != null ? Math.max(0, 1 - (t0 - o.blast) / 1.8) : 0;
  // lanterns sway a pixel; string B swings a little more
  D.lay('front');
  LANTS.forEach((L, i) => { const sw = Math.round(Math.sin(t * (L.si ? 1.3 : 1) + i * 0.9) * (L.si ? 0.9 : 0.6) + bl * bl * (L.si ? 5 : 3.5) * Math.sin(t0 * 13 + i * 1.7) * (L.x < 240 ? -1 : 1)); const key = (LIS[kind] || {})['l' + i]; paintLantern(D, { x: L.x + sw, y: L.y, big: L.big, kind: L.kind }, key != null ? key + 1 : 255); });
  // the bulb chain along the valance: a slow chase in warm white; during a draw, the quality colour
  D.lay('mid');
  for (let k = 0, x = 82; x < 374; x += 12, k++) { const on = ((k + Math.floor(t * 3)) % 4) !== 0, [qm, qt] = tier >= 0 ? QRAMP[tier] : ['lamp', 9]; D.rect(x, VAL + 5, 2, 2, qm, on ? qt : qt - 3, { e: 255 }); D.px(x, VAL + 4, 'iron', 3); }
  // the machine: neon border (buzzes), sign stars, rate lamps, pity lamps, the flap, a pack dropping, glass glints
  const neon = tier >= 0 ? QRAMP[tier] : ['teal', 9], buzz = LIS[kind] ? LIS[kind].neon + 1 : 255;
  for (let x = MX0 + 4; x < MX1 - 4; x++) { D.px(x, MY0 + 4, neon[0], neon[1] - ((x + Math.floor(t * 8)) % 6 === 0 ? 2 : 0), { e: buzz }); D.px(x, MY0 + 21, neon[0], neon[1] - ((x - Math.floor(t * 8)) % 6 === 0 ? 2 : 0), { e: buzz }); }
  for (let y = MY0 + 5; y < MY0 + 21; y++) { D.px(MX0 + 4, y, neon[0], neon[1] - 0.5, { e: buzz }); D.px(MX1 - 5, y, neon[0], neon[1] - 0.5, { e: buzz }); }
  QRAMP.forEach(([qm, qt], i) => { const x = MX0 + 11 + i * 12, y = 166, a = 0.5 + 0.5 * Math.sin(t * 2.4 - i * 0.7); D.rect(x, y, 4, 4, qm, qt - 1 + a * 1.5, { e: 255 }); D.px(x, y, 'linen', 10, { e: 255 }); });
  for (let i = 0; i < 5; i++) { const x = MX0 + 13 + i * 11, y = 179, lit = i < ((o && o.pity) || 0), last = i === 4; D.ell(x + 1, y + 1, 1.6, 1.6, lit ? 'lamp' : last ? 'red' : 'iron', lit ? 9 + Math.sin(t * 6) : last ? 4 + 2 * Math.sin(t * 3) : 3.2, { e: lit || last ? 255 : 0 }); }
  const drop = o && o.drop != null ? o.drop : -1;
  if (drop >= 0 && drop < 1) { const q = sm(clamp(drop, 0, 1)), px = 424, py = Math.round(MWIN[1] + 42 + q * 74), [qm, qt] = QRAMP[0]; D.lay('mid'); D.rect(px, py, 9, 14, qm, qt - 2); D.vl(px, py, 14, qm, qt); }
  const flap = drop >= 0.8 ? Math.min(1, (drop - 0.8) * 5) : 0; D.rect(MX0 + 17, 215, MX1 - MX0 - 34, Math.max(1, Math.round(4 - flap * 3)), 'iron', 6 + flap);
  if (drop >= 1) { const [qm, qt] = QRAMP[0]; D.rect(424, 219, 12, 8, qm, qt - 1.5); D.hl(424, 219, 12, qm, qt); }
  { const g = ((t * 0.35) % 1) * 90 - 16; for (let k = 0; k < 14; k++) { const x = MWIN[0] + Math.round(g) + k, y = MWIN[1] + 50 - k * 3; if (x >= MWIN[0] && x < MWIN[0] + MWIN[2] && y >= MWIN[1]) { D.px(x, y, 'glass', 10, { e: 255 }); D.px(x + 1, y, 'glass', 8, { e: 255 }); } } }
  // the keeper and his lantern
  D.lay('back');
  const buy = since('buy'), deny = since('deny'), refr = since('refresh'), pull = since('pull'), leave = since('leave');
  const pz = { lean: 0, arms: 0, shake: 0, bow: 0, blink: (t % 4.3) < 0.12, puff: s && Math.random() < 0.02 };
  if (buy < 0.9) { const k = buy / 0.9; pz.arms = Math.sin(k * Math.PI) * (1 - k * 0.3); pz.bow = Math.sin(k * Math.PI * 2) * 0.3; }
  if (deny < 0.5) pz.shake = Math.sin(deny * 28) * (1 - deny / 0.5);
  if (refr < 0.7) { pz.arms = Math.sin(refr / 0.7 * Math.PI) * 0.6; pz.lean = Math.sin(refr / 0.7 * Math.PI * 2) * 0.8; }
  if (pull < 1.4) { pz.lean = Math.min(1, pull * 4) * (1 - Math.max(0, pull - 1) * 2.5); pz.arms = 0.25; }
  if (leave < 1.2) pz.arms = 0.5 + 0.5 * Math.sin(leave * 14);
  if (!X.noWorkers) keeper(D, K.keep, t, pz, s);
  D.lay('mid'); D.beg(); const lsw = Math.round(Math.sin(t * 1.1) * 0.8); D.vl(196, VAL + 5, 8, 'iron', 3); paintLantern(D, { x: 196 + lsw, y: VAL + 12, big: 0, kind: 'lamp' }, LIS[kind] ? LIS[kind].keeper + 1 : 255); D.end({ none: 1 });
  // moths round the keeper's lantern and the lamp post
  [[196, 94, 0], [70, 94, 2], [196, 94, 4]].forEach(([cx, cy, ph]) => { const a = t * 3.1 + ph, x = Math.round(cx + Math.cos(a) * 7 + Math.sin(a * 2.3) * 3), y = Math.round(cy + Math.sin(a * 1.3) * 5); D.lay('front'); D.px(x, y, 'linen', 7); if (Math.sin(t * 40 + ph) > 0) D.px(x + 1, y, 'linen', 5); });
  // the black cat's round on the awning every 30 s: walks in, sits and washes, walks off
  { const cyc = (t + 6) % 30; if (cyc < 14) { const x = cyc < 4 ? 382 - cyc * 18 : cyc < 10 ? 310 : 310 - (cyc - 10) * 22, sit = cyc >= 4 && cyc < 10, y = AWY - 4, st = Math.floor(t * 8) % 2;
      D.lay('mid'); D.beg(); if (sit) { D.rect(x, y - 5, 5, 5, 'hair', 1.6); D.rect(x + 1, y - 9, 4, 4, 'hair', 1.8); D.px(x + 1, y - 10, 'hair', 2); D.px(x + 4, y - 10, 'hair', 2); D.px(x + 2, y - 8, 'gold', 9, { e: 255 }); D.px(x + 4, y - 8, 'gold', 9, { e: 255 }); for (let k = 0; k < 5; k++) D.px(x + 5 + k, y - 1 - Math.round(Math.abs(Math.sin(t * 1.5 + k * 0.5)) * k * 0.5), 'hair', 1.6); }
      else { D.rect(x, y - 4, 8, 3, 'hair', 1.6); D.rect(x - 3, y - 6, 4, 4, 'hair', 1.8); D.px(x - 3, y - 7, 'hair', 2); D.px(x - 1, y - 7, 'hair', 2); D.px(x - 2, y - 5, 'gold', 9, { e: 255 }); [0, 6].forEach((dx, i) => { D.vl(x + dx + ((st + i) % 2), y - 1, 1, 'hair', 1.4); D.vl(x + dx + 1 - ((st + i) % 2), y - 1, 1, 'hair', 1.4); }); for (let k = 0; k < 5; k++) D.px(x + 8 + k, y - 5 - Math.round(k * 0.6), 'hair', 1.6); }
      D.end({ none: 1 }); } }
}
// twinkling stars and a rare shooting star, over whatever sky is still showing
// o.glow { x, y, r, i, c: [r, g, b] }: a reveal lights the whole stall in its colour, in hard bands (art px);
// o.wave { x, y, r, w, a }: a shockwave ring bends the picture outward and brightens it
let WB = null;
// the ring of a shockwave, walked row by row: only the pixels inside the band are touched (a full-frame pass cost
// several ms a frame); each is pulled from a little further in, so the picture bulges outward
function waveRows(out, cp, w, W, H) { const sy = 1.25;
  for (let y = Math.max(0, Math.floor(w.y - (w.r + w.w) / sy)); y <= Math.min(H - 1, Math.ceil(w.y + (w.r + w.w) / sy)); y++) { const dy = (y - w.y) * sy, ro = w.r + w.w, ri = Math.max(0, w.r - w.w);
    if (Math.abs(dy) >= ro) continue; const xo = Math.sqrt(ro * ro - dy * dy), xi = Math.abs(dy) < ri ? Math.sqrt(ri * ri - dy * dy) : 0;
    for (const [a, b] of [[w.x - xo, w.x - xi], [w.x + xi, w.x + xo]]) for (let x = Math.max(0, Math.floor(a)); x <= Math.min(W - 1, Math.ceil(b)); x++) { const dx = x - w.x, d = Math.sqrt(dx * dx + dy * dy) || 1, e = Math.abs(d - w.r); if (e >= w.w) continue;
      const k = w.a * (1 - e / w.w), sx = Math.round(x - dx / d * k * 6), yy = Math.round(y - dy / sy / d * k * 5); if (sx >= 0 && yy >= 0 && sx < W && yy < H) out[y * W + x] = cp[yy * W + sx]; } } }
function post(out, t, s, o) {
  const col = X.col32;
  if (o && o.wave && o.wave.a > 0.02) { if (!WB || WB.length !== out.length) WB = new Uint32Array(out.length); WB.set(out); waveRows(out, WB, o.wave, AW, AH); }
  const b = Math.floor(t / 13), q = t - b * 13 - h1(b) * 3; if (q > 0 && q < 0.6) { const x0 = 60 + h1(b + 7) * 300, y0 = 6 + h1(b + 3) * 30; for (let k = 0; k < 10; k++) { const u = q / 0.6 - k * 0.02; if (u < 0 || u > 1) continue; const x = Math.round(x0 + u * 70), y = Math.round(y0 + u * 22), p = y * AW + x; if (x < 0 || x >= AW || y < 0 || y >= AH) continue; const cur = out[p]; if ((cur & 0xffffff) < 0x503020) out[p] = col('linen', 11 - k); } }
}
Object.keys(KINDS).forEach(kind => X.def('_mk_' + kind, { size: [AW, AH], fy: GY, noFrame: 1, amb: [0.3, 0.24],
  paint: (S, sc) => paint(S, sc, kind), anim: (D, t, s, o) => anim(D, t, s, o, kind), post }));
M.MARKET = { AW, AH, GY, KX, MX0, MX1, MY0, MWIN, CTOP, STX0, STX1, SHELF, VAL, waveRows,
  // g { x, y, r, i, c: [r, g, b] } in art px: three hard rings of light, one row of pixels at a time (no soft edges)
  glow(ctx, g) { if (!g || g.i <= 0.02) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const bands = [[1, 0.14], [0.66, 0.2], [0.36, 0.26]];
    bands.forEach(([m, a]) => { const r = g.r * m; ctx.globalAlpha = Math.min(0.9, a * g.i); ctx.fillStyle = 'rgb(' + g.c[0] + ',' + g.c[1] + ',' + g.c[2] + ')';
      for (let y = Math.max(0, Math.floor(g.y - r)); y <= Math.min(AH - 1, Math.ceil(g.y + r)); y++) { const hw = Math.floor(Math.sqrt(Math.max(0, r * r - (y - g.y) * (y - g.y)))); if (hw > 0) ctx.fillRect(Math.round(g.x - hw), y, hw * 2, 1); } });
    ctx.restore(); } };
})();
