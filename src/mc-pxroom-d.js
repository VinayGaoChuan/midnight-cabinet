// ==== mc-pxroom-d.js ====
(function () {
// Pixel rooms, batch d (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 冥想室 meditation · 少林寺 shaolin · 罗马斗兽场 colosseum · 马拉卡纳体育场 maracana · 亚历山大图书馆 library
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random, NO_ = {};
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const hh = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };   // 0…1 hash
const sm = (a) => { a = clamp(a, 0, 1); return a * a * (3 - 2 * a); };

// ───────── shared bits ─────────
// a small flame for candles, torches and lanterns (s px tall), flickering
function flame(D, x, y, s, t, ph) {
  const fh = Math.max(2, Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph)))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < fh; k++) { const q = k / fh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// a candle (static): wax column with a lit left edge and a drip
function candle(S, x, y, h, w, t) { w = w || 2; t = t || 7.5; S.beg(); S.rect(x, y - h, w, h, 'bone', t); S.vl(x, y - h, h, 'bone', t + 1.2); if (w > 2) S.vl(x + w - 1, y - h, h, 'bone', t - 1.4); S.hl(x, y - h, w, 'bone', t + 2); S.vl(x + w - 1, y - h + 1, 2 + (h % 3), 'bone', t + 1.6); S.end(); S.px(x + (w > 2 ? 1 : 0), y - h - 1, 'ink', 1); }
// a thin ribbon of incense smoke rising from (x, y): it sways and breaks up as it climbs
function smoke(D, x, y, len, t, ph, m) {
  for (let k = 0; k < len; k++) { const q = k / len, gap = q > 0.5 && ((k + Math.floor(t * 6 + ph)) % (q > 0.8 ? 3 : 5) === 0); if (gap) continue;
    const xx = x + Math.sin(k * 0.22 - t * 1.4 + ph) * q * 5 + Math.sin(k * 0.07 + t * 0.5) * q * 3; D.px(xx, y - k, m || 'linen', 8 - q * 3.5); if (q > 0.35 && q < 0.75) D.px(xx + 1, y - k, m || 'linen', 6 - q * 2); }
}
// a front-facing head, 6×6: h hair, s skin, c closed eye (a darker skin dash)
const FACE = [' hhhh ', 'hhhhhh', 'hssssh', 'scsscs', ' ssss ', '  ss  '];
// a seated figure (lotus): x centre, y top of what it sits on; lift raises it (levitation), br 0/1 breath
function sitter(D, x, y, L, o) {
  o = o || {}; y -= Math.round(o.lift || 0); const br = Math.round(o.br || 0), sh = y - 14 - br, top = L.top, bot = L.bot, sk = L.skin;
  D.beg();
  D.poly([[x - 9, y], [x + 10, y], [x + 7, y - 5], [x - 6, y - 5]], bot[0], bot[1]); D.hl(x - 6, y - 5, 13, bot[0], bot[1] + 1, { n: [0, -0.7] });
  D.hl(x - 7, y - 2, 6, bot[0], bot[1] - 1.4); D.hl(x + 2, y - 2, 6, bot[0], bot[1] - 1.4); D.px(x - 6, y - 3, sk[0], sk[1]); D.px(x + 6, y - 3, sk[0], sk[1] - 0.6);
  D.cyl(x - 3, sh + 1, 7, y - 5 - sh, top[0], top[1], { rim: 1.5 }); D.hl(x - 2, sh, 5, top[0], top[1] + 0.8, { n: [0, -0.8] });
  if (L.sash) { D.line(x - 3, sh + 1, x + 3, sh + 8, L.sash[0], L.sash[1]); D.line(x - 2, sh + 1, x + 3, sh + 7, L.sash[0], L.sash[1] + 1); }
  // arms: shoulders out, elbows at the waist, hands meet in the lap
  D.line(x - 3, sh + 2, x - 5, sh + 7, top[0], top[1] - 1.2, { w: 2 }); D.line(x - 5, sh + 8, x - 2, y - 6, top[0], top[1] - 0.6, { w: 2 });
  D.line(x + 3, sh + 2, x + 5, sh + 7, top[0], top[1] + 0.3, { w: 2 }); D.line(x + 5, sh + 8, x + 2, y - 6, top[0], top[1] + 0.3, { w: 2 }); D.rect(x - 1, y - 6, 3, 2, sk[0], sk[1]); D.px(x, y - 7, sk[0], sk[1] + 1);
  D.spr(x - 3, sh - 6, FACE, { h: [L.hair[0], L.hair[1]], s: [sk[0], sk[1]], c: [sk[0], sk[1] - 2.2] });
  if (L.knot) { D.rect(x - 1, sh - 8, 3, 2, L.hair[0], L.hair[1]); D.px(x, sh - 9, L.hair[0], L.hair[1] + 1); }
  D.end({ lit: 1 });
}

// ───────── 冥想室 meditation (magic · train) ─────────
// a mystic sits on a dais under a carved lotus mandala; incense smoke curls up, candles flicker; now and then a floating
// mallet circles the singing bowl, the bowl rings out in waves, the mandala flares and the mystic rises off the cushion
const CANDLES = [[29, 9, 3], [33, 6, 2], [36, 12, 3], [40, 5, 2], [107, 7, 2], [110, 13, 3], [114, 5, 2], [117, 9, 3], [121, 6, 2]];
const MYSTIC = { skin: ['skin', 6], hair: ['hair', 3], top: ['linen', 7], bot: ['linen', 5], boot: ['linen', 5], sash: ['crimson', 6], knot: 1 };
X.def('meditation', {
  amb: [0.24, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'magic');
    sc.light({ x: 75, y: 42, z: 8, r: 80, i: 0.85, c: '#b89cff', fl: 'pulse', amp: 0.16, sp: 1.1, tint: 0.5 });   // 1 mandala
    sc.light({ x: 36, y: 80, z: 14, r: 46, i: 0.75, c: '#ffb060', fl: 'candle', tint: 0.45 });                    // 2 candles left
    sc.light({ x: 116, y: 80, z: 14, r: 46, i: 0.75, c: '#ffb060', fl: 'candle', ph: 2, tint: 0.45 });            // 3 candles right
    sc.light({ x: 137, y: 25, z: 24, r: 56, i: 0.7, c: '#ffc070', fl: 'candle', ph: 4, tint: 0.4 });             // 4 paper lantern
    // the mandala: a round stone set into the brick; a double lotus of glowing lines, a ring, a bright heart
    S.lay('back'); S.beg();
    const mx = 75, my = 42, MR = 21, seg = Math.PI / 4;
    const petal = (x, y, rot, r0, r1, w) => { const d = Math.hypot(x, y); if (d < r0 || d > r1) return false; const th = Math.atan2(y, x) + rot, a = ((th % seg) + seg) % seg - seg / 2; return Math.abs(a) * d < w * Math.pow(Math.sin(Math.PI * (d - r0) / (r1 - r0)), 0.7); };
    const P1 = (x, y) => petal(x, y, 0, 3.5, 15.5, 4.4), P2 = (x, y) => petal(x, y, seg / 2, 5, 18, 4);
    for (let y = -MR - 1; y <= MR + 1; y++) for (let x = -MR - 1; x <= MR + 1; x++) {
      const u = x + 0.5, v = y + 0.5, d = Math.hypot(u, v); if (d > MR + 0.3) continue; const nx = u / MR, ny = v / MR, X0 = mx + x, Y0 = my + y;
      if (d > MR - 2.2) { S.px(X0, Y0, 'magic', 7 - (nx + ny) * 1.3 + (d > MR - 1 ? -0.8 : 0), { n: [nx * 0.7, ny * 0.7] }); continue; }
      if (d < 3.6) { S.px(X0, Y0, 'arcane', d < 1.6 ? 11 : 9, { e: 2 }); continue; }
      const edge = (f) => f(u, v) && (!f(u + 1, v) || !f(u - 1, v) || !f(u, v + 1) || !f(u, v - 1));
      if (P1(u, v)) { S.px(X0, Y0, edge(P1) ? 'arcane' : 'magic', edge(P1) ? 9 : 7.4 - ny * 1.4 - d / MR, edge(P1) ? { e: 2 } : { n: [nx * 0.4, ny * 0.4] }); continue; }
      if (P2(u, v)) { S.px(X0, Y0, edge(P2) ? 'arcane' : 'magic', edge(P2) ? 6.5 : 4.5 - ny, edge(P2) ? { e: 2 } : { n: [nx * 0.3, ny * 0.3] }); continue; }
      if (Math.abs(d - 18.6) < 0.55) { S.px(X0, Y0, 'arcane', 6, { e: 2 }); continue; }
      S.px(X0, Y0, 'magic', 2.6 - (d / MR) * 0.6);
    }
    S.end();
    // hanging scroll (left): rod, paper, one big brushed 心 (heart / mind), an ensō circle under it, the red seal
    S.beg(); S.px(22, 9, 'iron', 7); S.line(22, 9, 13, 14, 'hair', 3); S.line(22, 9, 31, 14, 'hair', 3);
    S.hcyl(11, 14, 22, 2, 'wood', 4, { rim: 1 }); S.rect(12, 16, 20, 42, 'paper', 8); S.vl(12, 16, 42, 'paper', 9); S.vl(31, 16, 42, 'paper', 6); S.rect(14, 18, 16, 38, 'paper', 7.5);
    // 心: middle dot, the lying hook (down, along the bottom, up to a point), left dot, right dot
    ['......##......', '.......##.....', '........##....', '...##......#..', '...##......##.', '.#.##.......##', '##.##........#', '#..##......#..', '...##.....##..', '...###...###..', '....#######...']
      .forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') S.px(15 + i, 21 + j, 'ink', 1); });
    // ensō: one brush stroke round, heavy at the lower left, dry and thin where it ends, open at the upper right
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = Math.hypot(x, y), th = Math.atan2(y, x), a = ((th + 0.75) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);   // a: 0 where the stroke starts (upper right), grows clockwise
      if (a > 5.75) continue; const wd = 0.6 + 0.85 * Math.sin(Math.min(1, a / 5.4) * Math.PI); if (Math.abs(d - 5.6) > wd) continue;
      S.px(22 + x, 42 + y, 'ink', a > 5.2 ? 2 : 1); }
    S.rect(25, 51, 3, 3, 'red', 5); S.px(26, 52, 'red', 7); S.px(25, 51, 'red', 6.5);
    S.hcyl(10, 58, 24, 3, 'wood', 4, { rim: 1 }); S.px(9, 59, 'brass', 7); S.px(34, 59, 'brass', 7); S.end();
    // wall shelf (right): a teapot, two cups, a row of sutras
    S.beg(); S.box(101, 48, 27, 3, 'wood', 5, { top: 1 }); S.rect(104, 51, 2, 4, 'wood', 3); S.rect(123, 51, 2, 4, 'wood', 3); S.end();
    S.beg(); S.ell(108, 43.5, 4, 3.5, 'teal', 5, { dome: 1 }); S.hl(106, 40, 5, 'teal', 7); S.px(108, 39, 'teal', 8); S.line(112, 43, 115, 40, 'teal', 5); S.line(104, 42, 103, 45, 'teal', 4); S.end();
    [[116, 47], [120, 47]].forEach(([x, y]) => { S.beg(); S.rect(x, y - 2, 3, 2, 'linen', 8); S.hl(x, y - 2, 3, 'linen', 9); S.end(); });
    [[123, 36, 'crimson', 5], [125, 38, 'paper', 7], [127, 37, 'teal', 4]].forEach(([x, y, m, t]) => { S.beg(); S.box(x, y, 2, 47 - y, m, t, { bev: 0 }); S.px(x, y + 2, 'gold', 7); S.end(); });
    // the dais: two stone steps
    S.lay('mid'); S.beg(); S.box(42, 86, 66, 4, 'magic', 7, { top: 2 }); S.box(50, 82, 50, 4, 'magic', 8, { top: 2 }); S.end();
    for (let x = 52; x < 98; x += 6) S.px(x, 83, 'arcane', 6, { e: 2 });
    // cushion (zafu)
    S.beg(); S.ell(75, 80, 11, 3, 'crimson', 6, { dome: 1 }); S.hl(66, 78, 18, 'crimson', 8); S.hl(65, 81, 21, 'crimson', 4); for (let x = 66; x < 85; x += 3) S.px(x, 80, 'crimson', 5); S.end();
    // incense censer (left of the cushion): a bronze tripod bowl with sticks
    S.beg(); S.ell(58, 79, 4, 2.5, 'brass', 6, { dome: 1 }); S.hl(54, 77, 9, 'brass', 8); S.px(55, 81, 'brass', 4); S.px(61, 81, 'brass', 4); S.px(58, 81, 'brass', 4); S.hl(55, 77, 7, 'ink', 1); S.end();
    S.vl(57, 71, 6, 'brass', 3); S.vl(59, 72, 5, 'brass', 3); S.px(57, 70, 'fire', 9, { e: 255 }); S.px(59, 71, 'fire', 8, { e: 255 });
    // singing bowl on its ring cushion (right of the cushion)
    S.beg(); S.ell(92, 81, 5, 1.5, 'crimson', 5); S.end();
    S.beg(); for (let y = 0; y < 5; y++) { const hw = Math.round(5 - y * y * 0.14); S.hl(92 - hw, 75 + y, hw * 2 + 1, 'brass', 6 - y * 0.4, { n: [0, 0.3] }); } S.hl(87, 75, 11, 'brass', 9); S.hl(88, 76, 9, 'brass', 3); S.px(89, 77, 'brass', 10); S.end();
    // candle clusters on the floor
    [[27, 18], [105, 18]].forEach(([x, w]) => { S.beg(); S.box(x, 88, w, 2, 'brass', 6, { top: 1 }); S.end(); });   // brass trays
    CANDLES.forEach(([x, h, w]) => candle(S, x, 87, h, w));
    // woven mat around the dais foot
    S.lay('wall'); for (let y = 91; y < 101; y++) { const k = (y - 90.5) / 5 - 1, hw = Math.round(Math.sqrt(Math.max(0, 1 - k * k)) * 44); if (hw > 0) { S.hl(75 - hw, y, hw * 2, 'sand', 5 + ((y % 2) ? 0.6 : -0.3)); S.px(75 - hw, y, 'sand', 3); S.px(75 + hw - 1, y, 'sand', 3); } }
    for (let x = 34; x < 117; x += 4) S.px(x, 96, 'sand', 3);
    // paper lantern hanging in front (right), and a potted bamboo near the eye (left)
    S.lay('front'); S.beg(); S.vl(138, 3, 13, 'hair', 3); S.rect(135, 16, 7, 2, 'wood', 4); S.ell(138, 24, 5, 7, 'paper', 9, { e: 5 }); for (let y = 19; y < 30; y += 3) S.hl(134, y, 9, 'paper', 7, { e: 5 }); S.vl(133, 21, 7, 'paper', 6, { e: 5 }); S.rect(135, 31, 7, 2, 'wood', 4); S.vl(138, 33, 4, 'crimson', 6); S.px(137, 37, 'crimson', 7); S.px(139, 37, 'crimson', 5); S.end();
    S.rect(137, 23, 2, 3, 'crimson', 7, { e: 5 });
    S.beg(); S.box(4, 81, 13, 9, 'teal', 4, { top: 1 }); S.hl(4, 83, 13, 'teal', 6); S.end();
    [[7, 38, 4.5, -1], [10, 50, 5.5, 1], [13, 43, 4, 1]].forEach(([x, top, t, d]) => { S.beg(); for (let y = top; y < 81; y++) S.px(x, y, 'leaf', t + ((y - top) % 6 === 0 ? 2.5 : 0)); for (let y = top + 3, k = 0; y < 74; y += 5, k++) { const dd = k % 2 ? d : -d; S.line(x, y, x + dd * 4, y - 2, 'leaf', 7); S.line(x + dd, y, x + dd * 5, y - 1, 'leaf', 5.5); S.px(x + dd * 5, y - 2, 'leaf', 8); } S.line(x, top, x + d * 3, top - 3, 'leaf', 8); S.end(); });
    sc.emit({ k: 'soul', x: 75, y: 76, w: 40, rate: 0.7, sp: 3, ang: 0, spread: 0.4, life: 3.2 });
  },
  anim(D, t, rs) {
    const st = rs.st, cy = steps(t, 10), ring = cy > 0.62 && cy < 0.92, lift = sm((cy - 0.66) / 0.1) * (1 - sm((cy - 0.9) / 0.08)) * 5.5;
    // the mandala's outer ring of runes turns slowly
    D.lay('back'); for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + t * 0.25, x = 75 + Math.cos(a) * 19.2, y = 42 + Math.sin(a) * 19.2; D.px(x, y, 'arcane', ring ? 11 : 9, { e: 255 }); }
    // smoke from the censer
    D.lay('mid'); smoke(D, 57, 69, 34, t, 0.7); smoke(D, 59, 70, 22, t, 2.9);
    // the mystic breathes; when the bowl sings the mystic rises
    const br = Math.sin(t * 1.3) > 0.2 ? 1 : 0;
    sitter(D, 75, 79, MYSTIC, { br, lift });
    if (lift > 0.5) { for (let x = 66; x < 85; x += 2) D.px(x + (Math.floor(t * 8) % 2), 80, 'arcane', 7, { e: 255 });
      D.lay('back'); const ar = 11 + lift * 0.8, n = 64; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = 75 + Math.cos(a) * ar, y = 70 - lift + Math.sin(a) * (ar + 3); if ((k + Math.floor(t * 20)) % 8 < 5) D.px(x, y, 'arcane', 6 + lift, { e: 255 }); } D.lay('mid'); }
    // the mallet: rests on the dais, rises to the bowl's rim, circles it, sinks back (the stick turns upright as it rises)
    let mx = 96, my = 80, up = 0;
    if (cy > 0.58 && cy < 0.62) { const k = sm((cy - 0.58) / 0.04); mx = 96 + k * 2; my = 80 - k * 6; up = k; }
    else if (cy >= 0.62 && cy < 0.92) { const a = (cy - 0.62) * 70; mx = 91.5 + Math.cos(a) * 7; my = 74 + Math.sin(a) * 1.5; up = 1; }
    else if (cy >= 0.92 && cy < 0.98) { const k = sm((cy - 0.92) / 0.06), a = 0.3 * 70; mx = 91.5 + Math.cos(a) * 7 + (96 - 91.5 - Math.cos(a) * 7) * k; my = 74 + Math.sin(a) * 1.5 + (80 - 74 - Math.sin(a) * 1.5) * k; up = 1 - k; }
    const ca = Math.cos(up * Math.PI / 2), sa = Math.sin(up * Math.PI / 2), mhx = Math.round(mx + ca * 4 - sa * 0.5), mhy = Math.round(my - sa * 8 - (1 - sa));
    // the mallet: a 2 px handle and a crimson felt head
    D.beg(); D.line(mx - ca * 3, my, mx + ca * 3, my - sa * 5, 'wood', 7, { w: 2 }); D.rect(mhx, mhy, 3, 3, 'crimson', 6.5); D.px(mhx, mhy, 'crimson', 9); D.px(mhx + 1, mhy, 'crimson', 8); D.px(mhx + 2, mhy + 2, 'crimson', 4); D.end();
    if (up > 0.9) { D.px(mhx + 1, mhy - 1, 'arcane', 10, { e: 255 }); if (R() < 0.3) rs.burst('glint', mhx, mhy - 1, 1, { sp: 6, life: 0.5 }); }
    // sound waves: rings that swell out of the bowl while it sings
    if (ring) { D.lay('back'); for (let w = 0; w < 3; w++) { const r = ((t * 12 + w * 8) % 24) + 5, a = 1 - r / 29; if (a < 0.2) continue; const n = Math.round(r * 3); for (let k = 0; k <= n; k++) { const th = Math.PI * (1.08 + 0.84 * k / n), x = 92 + Math.cos(th) * r * 1.2, y = 74 + Math.sin(th) * r * 0.8; D.px(x, y, 'arcane', 5 + a * 6, { e: 255 }); } } D.lay('mid'); }
    if (cy > 0.66 && !st.f) { st.f = 1; rs.flash(1, 0.9); rs.burst('rune', 75, 60, 10, { sp: 18, life: 1.4 }); rs.burst('glint', 75, 42, 5, { sp: 26, life: 0.6, w: 10, h: 10 }); } if (cy < 0.5) st.f = 0;
    if (ring) rs.mul[1] = 1.25; else rs.mul[1] = 1;
    // motes drift in toward the mystic while it hovers
    if (lift > 1 && R() < 0.35) { const a = R() * Math.PI * 2; rs.burst('soul', 75 + Math.cos(a) * 28, 64 + Math.sin(a) * 14, 1, { sp: 2, life: 1.2 }); }
    // the temple cat sleeps on the flags: breathing, an ear twitch, the tail tip flicks
    const cb = Math.sin(t * 1.9) > 0 ? 1 : 0, tw = steps(t, 5.3) < 0.06, tf = Math.round(Math.sin(t * 2.3) * 1.2);
    D.beg(); D.ell(137.5, 87.2 - cb * 0.3, 6.4, 3.4 + cb * 0.3, 'sand', 7.5, { dome: 1 }); [135, 138, 141].forEach(x => D.vl(x, 84 - cb, 2, 'sand', 5)); D.hl(133, 90, 11, 'sand', 6);
    D.ell(130.5, 87.4, 3.1, 2.7, 'sand', 8, { dome: 1 }); D.vl(128, 83, 2, 'sand', 8); D.px(129, 84, 'sand', 7); D.vl(tw ? 133 : 132, tw ? 84 : 83, 2, 'sand', 7); D.px(131, 84, 'sand', 6); D.hl(129, 88, 2, 'sand', 4); D.px(128, 89, 'bone', 9); D.px(129, 89, 'bone', 8);
    D.line(143, 88, 144, 90, 'sand', 6); D.hl(133, 91, 11, 'sand', 6.5); D.px(132 + tf, 91, 'sand', 9); D.px(133 + tf, 91, 'sand', 8); D.end();
    // candle flames
    CANDLES.forEach(([x, h, w], i) => flame(D, x + (w > 2 ? 1 : 0), 86 - h - 1, 4, t, i * 1.9));
  },
});

// ───────── pose tracks: keyframed worker poses, eased (continuous time) ─────────
const PKEYS = ['aB', 'eB', 'aF', 'eF', 'lB', 'kB', 'lF', 'kF', 'lean', 'bob', 'hx'];
function track(keys, t) {   // keys: [[time, pose], …] over one loop; t in the loop's seconds
  const n = keys.length, T = keys[n - 1][0]; t = ((t % T) + T) % T; let i = 0; while (i < n - 2 && t >= keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1], k = sm((t - t0) / Math.max(0.001, t1 - t0)), o = {};
  PKEYS.forEach(q => { const va = a[q] || 0, vb = b[q] || 0; o[q] = va + (vb - va) * k; }); return o;
}
// a Chinese roof: ridge top0 over ±hw0, hips falling at `slope`, eave at eb curling up by `lift` toward ±hw
function roof(S, cx, top0, hw0, slope, eb, hw, lift, m, t) {
  for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) {
    const u = Math.abs(x + 0.5 - cx); if (u > hw) continue; const top = top0 + Math.max(0, u - hw0) * slope, bot = eb - lift * Math.pow(u / hw, 3); if (top > bot) continue;
    const rib = ((x - Math.round(cx)) % 3 + 3) % 3, side = (x + 0.5 - cx) / hw;
    for (let y = Math.round(top); y <= Math.round(bot); y++) { const k = (y - top) / Math.max(1, bot - top); S.px(x, y, m, t + (rib === 0 ? 1.3 : rib === 2 ? -0.9 : 0) - k * 0.8 + (y === Math.round(top) ? 1.6 : 0), { n: [side * 0.35, -0.5] }); }
    const lip = Math.round(bot) + 1; S.px(x, lip, m, t - 1.6, { n: [0, 0.6] }); if (rib === 0) S.px(x, lip, 'gold', 6);
  }
}
function lerpPose(a, b, k) { k = clamp(k, 0, 1); const o = {}; Object.keys(Object.assign({}, a, b)).forEach(q => { const va = a[q] || 0, vb = b[q] || 0; o[q] = typeof va === 'number' && typeof vb === 'number' ? va + (vb - va) * k : (k < 0.5 ? a[q] : b[q]); }); return o; }
function glyphs(S, x, y, rows, m, t, o) { rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') S.px(x + i, y + j, m, t, o); }); }

// ───────── 少林寺 Shaolin temple (fantasy · train, epic) ─────────
// the great hall at dusk under the Song mountains: a double-eaved roof, painted beams, the gold plaque, glowing lattice
// doors, red lanterns; four monks run their forms in step while the master watches. Every ten seconds a monk swings the
// log into the great bell: the bell booms (flash, rings of sound), birds burst off the ridge, pine needles fall and the
// monks answer with one flying kick together
const MONK = { skin: ['skin', 6], hair: ['skin', 7], top: ['fire', 4], bot: ['brick', 4.5], boot: ['linen', 7] };   // deep saffron, darker than the glowing doors behind them
const MASTER = { skin: ['skin', 5], hair: ['linen', 9], top: ['crimson', 5], bot: ['lamp', 3], boot: ['linen', 6], beard: ['linen', 9] };
const FORM = [   // one monk's form, 4.8 s: stance, punch, punch, front kick, turn-block, stance
  [0, { aF: 0.3, eF: -1.6, aB: 0.3, eB: -1.6, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2 }],
  [0.6, { aF: 1.57, eF: 0, aB: 0.3, eB: -1.6, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2, lean: 0.2 }],
  [1.1, { aF: 0.3, eF: -1.6, aB: 1.57, eB: 0, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2, lean: 0.2 }],
  [1.6, { aF: 0.3, eF: -1.6, aB: 0.3, eB: -1.6, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2 }],
  [2.1, { aF: 1.3, eF: -1.4, aB: 0.7, eB: -1.4, lF: 1.6, kF: -0.1, lB: -0.1, kB: 0, lean: -0.4, bob: 0 }],
  [2.6, { aF: 1.3, eF: -1.4, aB: 0.7, eB: -1.4, lF: 1.6, kF: -0.1, lB: -0.1, kB: 0, lean: -0.4, bob: 0 }],
  [3.0, { aF: 2.6, eF: -0.9, aB: -0.4, eB: -0.2, lF: 0.4, kF: 0.3, lB: -0.4, kB: 0.4, bob: 1 }],
  [3.6, { aF: 2.6, eF: -0.9, aB: -0.4, eB: -0.2, lF: 0.4, kF: 0.3, lB: -0.4, kB: 0.4, bob: 1 }],
  [4.2, { aF: 0.3, eF: -1.6, aB: 0.3, eB: -1.6, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2 }],
  [4.8, { aF: 0.3, eF: -1.6, aB: 0.3, eB: -1.6, lF: 0.7, kF: -0.7, lB: -0.7, kB: 0.7, bob: 2 }],
];
const JUMP = { aF: 1.3, eF: -1.5, aB: -0.9, eB: 0.4, lF: 1.95, kF: 0, lB: 0.7, kB: -2.2, lean: -0.5 };
const BELL = [15, 41];   // top of the great bell
function bell(D, sh) {
  D.beg(); D.vl(BELL[0], 30, 11, 'iron', 4); D.rect(BELL[0] - 1, 37, 3, 3, 'iron', 6);
  for (let y = 0; y < 21; y++) { const hw = y < 3 ? 3 + y : y < 16 ? 6 + (y - 3) * 0.12 : 7.6 + (y - 16) * 0.5, x0 = Math.round(BELL[0] - hw + sh), x1 = Math.round(BELL[0] + hw + sh);
    for (let x = x0; x <= x1; x++) { const u = (x - BELL[0] - sh) / (hw + 0.5); D.px(x, BELL[1] + y, 'brass', 5.5 - Math.pow(Math.abs(u), 2) * 2.2 - u * 1.2 + (y === 5 || y === 11 || y > 17 ? 1.2 : 0) + (y === 6 || y === 12 ? -1 : 0), { n: [u * 0.9, 0] }); } }
  for (let r = 0; r < 2; r++) for (let c = -1; c <= 1; c++) D.px(BELL[0] + c * 3 + sh, BELL[1] + 4 + r * 3, 'teal', 5); D.rect(BELL[0] + sh - 1, BELL[1] + 14, 3, 3, 'teal', 4);
  D.end();
}
X.def('shaolin', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { dusk: 1, sun: [133, 45, 6], far: 'peaks', horizon: 52, floor: 'stone' });                   // 0 low sun
    sc.light({ x: 75, y: 60, z: 4, r: 64, i: 0.9, c: '#ffc060', fl: 'candle', ph: 1, tint: 0.45 });              // 1 the hall's lamps (doors glow with it)
    sc.light({ x: 44, y: 55, z: 16, r: 40, i: 0.85, c: '#ff5a3a', fl: 'candle', ph: 3, tint: 0.55 });            // 2 red lantern left
    sc.light({ x: 106, y: 55, z: 16, r: 40, i: 0.85, c: '#ff5a3a', fl: 'candle', ph: 5, tint: 0.55 });           // 3 red lantern right
    sc.light({ x: 139, y: 74, z: 28, r: 42, i: 0.8, c: '#ffa040', fl: 'fire', ph: 2, tint: 0.5 });               // 4 stone lantern
    sc.light({ x: 18, y: 50, z: 28, r: 52, i: 1, c: '#ffe0a0', tint: 0.35, bake: false });                        // 5 the bell's boom (kicked)
    // streaks of cloud lit from below by the sun
    S.lay('wall'); [[8, 12, 40], [30, 16, 34], [96, 9, 30], [70, 26, 44], [112, 32, 26]].forEach(([x, y, w], i) => { S.hl(x, y, w, 'dusk', 5.5 + i * 0.3, { e: 255 }); S.hl(x + 4, y + 1, w - 6, 'dusk', 8.5, { e: 255 }); S.hl(x + 8, y - 1, w - 14, 'dusk', 4.5, { e: 255 }); });
    // the pagoda forest on the far slopes: stepped silhouettes
    [[40, 38, 7, 2], [118, 40, 5, 1.6], [47, 40, 4, 1.4]].forEach(([x, base, n, sc2]) => { for (let k = 0; k < n; k++) { const y = base - k * 2.2 * sc2, hw = Math.max(1, Math.round((n - k) * 0.55 * sc2)); S.hl(x - hw - 1, Math.round(y), hw * 2 + 3, 'dusk', 1.2, { e: 255 }); S.rect(x - hw, Math.round(y) + 1, hw * 2 + 1, Math.ceil(2.2 * sc2) - 1, 'dusk', 0.6, { e: 255 }); } S.vl(x, Math.round(base - n * 2.2 * sc2) - 2, 3, 'dusk', 1.2, { e: 255 }); });
    // ─ the hall (back layer) ─
    S.lay('back');
    // plinth: dressed stone, a marble balustrade, stairs up the middle
    S.beg(); TX.ashlar(S, 20, 74, 110, 16, 'stone', 5, { bh: 5, bw: 12, crack: 0.1 }); S.hl(20, 74, 110, 'stone', 8, { n: [0, -0.8] }); S.end();
    S.beg(); for (let y = 74; y < 90; y += 2) { const i = (y - 74) / 2; S.rect(59 - i, y, 32 + i * 2, 1, 'stone', 7.5, { n: [0, -0.8] }); S.rect(59 - i, y + 1, 32 + i * 2, 1, 'stone', 4.5); } S.vl(58, 74, 16, 'stone', 7.5); S.vl(91, 74, 16, 'stone', 4); S.end();
    [[22, 58], [92, 128]].forEach(([a, b]) => { S.beg(); S.rect(a, 68, b - a, 1, 'bone', 9, { n: [0, -0.8] }); S.rect(a, 69, b - a, 1, 'bone', 6); S.rect(a, 73, b - a, 1, 'bone', 7); for (let x = a; x < b; x += 3) S.vl(x + 1, 70, 3, 'bone', (x % 6) ? 7 : 5.5); for (let x = a; x <= b - 2; x += 9) { S.rect(x, 66, 2, 8, 'bone', 8); S.px(x, 65, 'bone', 9); } S.end(); });
    // the hall's front: columns, painted beam, lattice bays, the open centre with the golden figure inside
    S.beg(); S.rect(26, 48, 98, 20, 'crimson', 3); S.end();
    const bays = [[30, 44], [46, 60], [90, 104], [106, 120]];
    bays.forEach(([a, b]) => { S.beg(); S.rect(a, 51, b - a, 16, 'wood', 3); for (let y = 52; y < 66; y += 2) for (let x = a + 1; x < b - 1; x += 2) S.px(x, y, 'lamp', 6.5 + ((x + y) % 4 ? 0 : 1), { e: 2 }); S.hl(a, 58, b - a, 'wood', 5); S.vl(Math.round((a + b) / 2), 51, 16, 'wood', 5); S.rect(a, 64, b - a, 3, 'wood', 4); S.end(); });
    S.beg(); S.rect(62, 51, 26, 17, 'lamp', 4, { e: 2 }); S.rect(62, 51, 26, 3, 'lamp', 3, { e: 2 });
    for (let x = 66; x < 85; x += 4) { S.vl(x, 54, 14, 'lamp', 5.5, { e: 2 }); }
    S.ell(75, 62, 5, 5, 'gold', 7, { e: 2 }); S.ell(75, 55.5, 2.2, 2.4, 'gold', 8, { e: 2 }); S.rect(70, 64, 11, 4, 'gold', 6, { e: 2 }); S.hl(71, 64, 9, 'gold', 8, { e: 2 }); S.ell(75, 55, 7, 7, 'lamp', 7, { ring: 1, e: 2 });
    S.rect(64, 66, 3, 2, 'crimson', 6); S.rect(83, 66, 3, 2, 'crimson', 6); S.px(65, 65, 'fire', 10, { e: 255 }); S.px(84, 65, 'fire', 10, { e: 255 });
    S.rect(61, 51, 2, 17, 'wood', 4); S.rect(87, 51, 2, 17, 'wood', 4); S.end();
    [[58, 51, 4], [88, 51, 4]].forEach(([x, y, w]) => { S.beg(); S.rect(x - 1, y, w, 17, 'wood', 4); for (let yy = y + 1; yy < y + 16; yy += 2) S.px(x, yy, 'lamp', 6, { e: 2 }); S.end(); });
    [28, 44, 60, 88, 104, 120].forEach(x => { S.beg(); S.cyl(x, 49, 3, 20, 'crimson', 6.5, { rim: 1.5 }); S.rect(x - 1, 66, 5, 2, 'stone', 7); S.end(); });
    S.beg(); S.rect(24, 45, 102, 4, 'teal', 5); S.hl(24, 45, 102, 'gold', 7); S.hl(24, 48, 102, 'crimson', 4); for (let x = 26; x < 124; x += 6) { S.rect(x, 46, 3, 2, 'teal', 8); S.px(x + 1, 46, 'gold', 9); } S.end();
    S.ao(24, 49, 102, 5, 't', 1.6);
    // double-eaved roof, the upper wall with the gold plaque, the ridge and its beasts
    S.beg(); S.rect(40, 29, 70, 9, 'crimson', 4); for (let x = 42; x < 110; x += 5) S.vl(x, 30, 8, 'crimson', 3); S.hl(40, 36, 70, 'teal', 5); S.hl(40, 37, 70, 'gold', 6); S.end();
    S.beg(); roof(S, 75, 37, 38, 0.55, 44, 62, 7, 'stone', 3.2); S.end();
    S.beg(); roof(S, 75, 18, 24, 0.9, 29, 44, 5, 'stone', 3.4); S.end();
    S.beg(); S.rect(49, 15, 52, 3, 'stone', 3); S.hl(49, 15, 52, 'stone', 6.5, { n: [0, -0.8] }); for (let x = 51; x < 100; x += 4) S.px(x, 16, 'gold', 5); S.end();
    [[48, -1], [102, 1]].forEach(([x, d]) => { S.beg(); S.rect(x - 1, 11, 3, 6, 'gold', 5); S.px(x + d * 2, 11, 'gold', 6); S.px(x + d * 2, 10, 'gold', 7); S.px(x + d, 9, 'gold', 8); S.px(x - d, 12, 'gold', 7); S.px(x - d * 2, 13, 'gold', 5); S.end(); });
    // the plaque: 少 林 寺 in gold on blue lacquer (8 px tall characters, 林 = two 木 side by side)
    S.beg(); S.rect(56, 26, 39, 12, 'gold', 6); S.rect(57, 27, 37, 10, 'tile', 2); S.hl(56, 26, 39, 'gold', 8); S.hl(56, 37, 39, 'gold', 4.5); S.vl(56, 27, 10, 'gold', 7); S.vl(94, 27, 10, 'gold', 5);
    glyphs(S, 59, 28, ['....#....', '.#..#..#.', '#...#...#', '....#....', '...##..#.', '......#..', '....##...', '.###.....'], 'gold', 9, { e: 2 });
    glyphs(S, 70, 28, ['..#.....#..', '####..#####', '..#.....#..', '.###...###.', '#.#.#.#.#.#', '..#.....#..', '..#.....#..', '..#.....#..'], 'gold', 9, { e: 2 });
    glyphs(S, 83, 28, ['....#....', '.#######.', '....#....', '#########', '......#..', '#########', '..#...#..', '.....##..'], 'gold', 9, { e: 2 }); S.end();
    // incense tripod at the top of the stairs
    S.beg(); S.ell(75, 70.5, 5, 3, 'brass', 5, { dome: 1 }); S.hl(70, 68, 11, 'brass', 8); S.px(71, 73, 'brass', 3); S.px(79, 73, 'brass', 3); S.px(75, 73, 'brass', 3); S.hl(71, 68, 9, 'ink', 1); S.px(69, 67, 'brass', 7); S.px(81, 67, 'brass', 7); S.end();
    for (let k = 0; k < 3; k++) { S.vl(73 + k * 2, 64 - (k % 2), 4 + (k % 2), 'wood', 4); S.px(73 + k * 2, 63 - (k % 2), 'fire', 9, { e: 255 }); }
    // lantern hooks
    [44, 106].forEach(x => S.vl(x, 49, 2, 'iron', 5));
    // ─ foreground (front layer): the bell pavilion (left), a pine bough and a stone lantern (right) ─
    S.lay('front');
    S.beg(); S.box(3, 28, 4, 62, 'wood', 4); S.box(25, 28, 4, 62, 'wood', 4.5); S.box(1, 26, 31, 4, 'wood', 5.5); S.rect(2, 30, 29, 1, 'wood', 2); S.end();
    S.beg(); S.poly([[0, 26], [33, 26], [29, 20], [3, 20]], 'stone', 3.5); S.hl(3, 20, 26, 'stone', 6); for (let x = 2; x < 32; x += 3) S.vl(x, 21, 5, 'stone', 2.5); S.px(0, 25, 'gold', 7); S.px(32, 25, 'gold', 7); S.end();
    S.beg(); S.rect(2, 86, 29, 4, 'stone', 5); S.hl(2, 86, 29, 'stone', 8); S.end();
    bell(S, 0);
    // pine: a gnarled bough from the right edge with flat pads of needles
    S.beg(); S.line(147, 10, 132, 14, 'wood', 4, { w: 2 }); S.line(132, 14, 120, 12, 'wood', 4.5, { w: 2 }); S.line(120, 12, 111, 15, 'wood', 4, { w: 1 }); S.line(136, 13, 131, 21, 'wood', 4, { w: 1 }); S.end();
    PINE.forEach(([x, y, w]) => { S.beg(); S.ell(x, y, w, 2.2, 'leaf', 3.2, { dome: 1 }); S.hl(x - w + 2, y - 2, w * 2 - 3, 'leaf', 6); for (let k = -w + 2; k < w - 1; k += 2) S.px(x + k, y - 1, 'leaf', 5); S.hl(x - w + 1, y + 1, w * 2 - 1, 'leaf', 2); S.end(); });
    // stone lantern
    S.beg(); S.box(132, 86, 14, 4, 'stone', 6, { top: 1 }); S.box(136, 76, 6, 10, 'stone', 5.5); S.box(133, 74, 12, 2, 'stone', 7); S.rect(134, 67, 10, 7, 'stone', 5); S.rect(136, 68, 6, 5, 'ink', 1);
    S.poly([[130, 67], [148, 67], [143, 62], [135, 62]], 'stone', 6); S.hl(131, 66, 16, 'stone', 4); S.px(130, 66, 'stone', 8); S.px(147, 66, 'stone', 8); S.rect(138, 59, 3, 3, 'stone', 7); S.px(139, 58, 'stone', 8); S.end();
    sc.emit({ k: 'ember', x: 75, y: 63, w: 6, rate: 0.8, sp: 3, ang: 0, spread: 0.4, life: 2.2 });
    sc.emit({ k: 'leaf', x: 126, y: 15, w: 26, h: 6, rate: 0.3, sp: 3, life: 4 });
  },
  anim(D, t, rs) {
    const st = rs.st, C = 10, q = ((t % C) + C) % C;
    rs.mul[5] = 0;
    // the bell stroke: pull back 6.6–8.0 s, swing 8.0–8.25, boom, the log rebounds and settles
    const pull = q < 6.6 ? 0 : q < 8 ? sm((q - 6.6) / 1.4) : q < 8.25 ? 1 - sm((q - 8) / 0.25) : q < 9.2 ? Math.sin((q - 8.25) / 0.95 * Math.PI) * 0.25 : 0, boom = q >= 8.25;
    if (q >= 8.22 && !st.boom) { st.boom = 1; rs.flash(5, 2.6); rs.flash(1, 0.6); rs.flash(2, 0.5); rs.flash(3, 0.5); rs.burst('glint', 22, 58, 6, { sp: 26, life: 0.5, w: 8, h: 10 }); rs.burst('leaf', 128, 16, 7, { sp: 8, life: 2.8, w: 28, h: 6 }); rs.burst('steam', 15, 26, 4, { sp: 5, life: 1.2, w: 16 }); }
    if (q < 1) st.boom = 0;
    const ring = boom ? q - 8.25 : 9;
    // the great bell: shivers after the blow
    const sh = ring < 1.2 ? Math.round(Math.sin(ring * 40) * (1.2 - ring)) : 0;
    D.lay('front'); if (sh) bell(D, sh);
    // the striking log on its ropes
    const lx = 23 + Math.round(pull * 6), ly = 58 - Math.round(pull * 1.5);
    D.beg(); D.line(22, 30, lx + 2, ly, 'hair', 3.5); D.line(28, 30, lx + 9, ly, 'hair', 3.5); D.hcyl(lx, ly, 13, 3, 'wood', 5.5, { rim: 1.5 }); D.vl(lx, ly, 3, 'wood', 7); D.hl(lx + 1, ly + 1, 11, 'wood', 4); D.end();
    // sound: bright rings rolling out from the bell
    // (two dashed arcs that stay on the bell pavilion's side of the yard, dimming as they grow)
    if (ring < 1.4) for (let w = 0; w < 2; w++) { const r = ring * 26 - w * 9; if (r < 5 || r > 32) continue; const tn = 9 - (r - 5) / 27 * 4, n = Math.round(r * 3.2);
      for (let k = 0; k <= n; k++) { if (k % 5 > 2) continue; const th = -Math.PI * 0.3 + (k / n - 0.5) * Math.PI * 1.15, x = BELL[0] + Math.cos(th) * r * 1.15, y = 52 + Math.sin(th) * r * 0.75; if (x >= 50 || y < 5) continue; D.px(x, y, 'lamp', tn, { e: 255 }); } }
    // birds on the ridge: they burst off at the boom, circle away and come home
    D.lay('back'); [[56, 0], [61, 1.3], [93, 2.1]].forEach(([bx, ph], i) => {
      if (q >= 1.5 && q < 3) { const k = sm((q - 1.5) / 1.5), fx = bx + (1 - k) * (40 + i * 10), fy = 13 - (1 - k) * (14 + i * 3) + Math.sin(k * Math.PI) * 3, up = Math.sin(t * 22 + ph * 5) > 0 && k < 0.95;
        D.px(fx, fy, 'linen', 10, { e: 255 }); D.px(fx + 1, fy, 'linen', 8, { e: 255 }); D.px(fx - 1, fy + (up ? -1 : 0), 'linen', 9, { e: 255 }); D.px(fx + 2, fy + (up ? -1 : 0), 'linen', 9, { e: 255 }); return; }
      if (!boom && q >= 3) { const pk = Math.sin(t * 2 + ph * 3) > 0.85 ? 1 : 0; D.rect(bx, 13, 3, 2, 'linen', 9, { e: 255 }); D.hl(bx, 14, 3, 'linen', 6, { e: 255 }); D.px(bx + (i % 2 ? -1 : 3), 13 - pk, 'linen', 9, { e: 255 }); D.px(bx + (i % 2 ? -1 : 3), 14 - pk, 'lamp', 8, { e: 255 }); return; }
      const k = boom ? ring : q + 1.75, fx = bx + k * (14 + i * 4) + Math.sin(k * 3 + ph) * 3, fy = 13 - k * (7 + i * 2) + Math.sin(k * 5 + ph) * 2; if (fy < 4 || fx > W - 5) return;
      const up = Math.sin(t * 22 + ph * 5) > 0; D.px(fx, fy, 'linen', 10, { e: 255 }); D.px(fx + 1, fy, 'linen', 8, { e: 255 }); D.px(fx - 1, fy + (up ? -1 : 1), 'linen', 9, { e: 255 }); D.px(fx + 2, fy + (up ? -1 : 1), 'linen', 9, { e: 255 }); if (up) { D.px(fx - 2, fy - 2, 'linen', 7, { e: 255 }); D.px(fx + 3, fy - 2, 'linen', 7, { e: 255 }); } });
    // red lanterns sway in the evening air
    [[44, 0], [106, 1.7]].forEach(([x, ph]) => { const a = Math.sin(t * 1.3 + ph) * 0.9, dx = Math.round(a); D.beg(); D.line(x, 51, x + dx, 53, 'iron', 4);
      D.rect(x - 2 + dx, 53, 5, 1, 'gold', 6); D.ell(x + dx + 0.5, 57, 4, 3.6, 'red', 7, { e: 3 + (x > 75 ? 1 : 0) }); D.vl(x + dx - 2, 55, 5, 'red', 5, { e: 3 + (x > 75 ? 1 : 0) }); D.vl(x + dx + 2, 55, 5, 'red', 9, { e: 3 + (x > 75 ? 1 : 0) }); D.hl(x + dx - 1, 56, 3, 'lamp', 9, { e: 3 + (x > 75 ? 1 : 0) });
      D.rect(x - 2 + dx, 61, 5, 1, 'gold', 5); D.vl(x + dx + Math.round(a * 0.6), 62, 3, 'red', 6); D.end({ none: 1 }); });
    // incense smoke from the tripod
    smoke(D, 75, 62, 18, t, 0.4, 'stone');
    // the monks: four run the form in step; at the boom they leap together; the master counts, the ringer pulls
    D.lay('mid'); const leap = boom && ring < 1 ? Math.sin(ring * Math.PI) : 0;
    const lw = boom && ring < 1.2 ? sm(ring / 0.12) * (1 - sm((ring - 0.95) / 0.25)) : 0, fp = track(FORM, t), jp = lerpPose(fp, JUMP, lw); jp.bob = lw > 0 ? Math.round(lerpPose(fp, { bob: 0 }, lw).bob - leap * 7) : fp.bob;
    [55, 70, 86, 101].forEach(x => worker(D, x, FY, MONK, jp, 1));
    if (boom && ring > 0.95 && !st.land) { st.land = 1; [55, 70, 86, 101].forEach(x => rs.burst('steam', x, 88, 2, { sp: 10, ang: Math.PI / 2, spread: 3, life: 0.6, w: 6 })); } if (!boom) st.land = 0;
    const mp = lerpPose({ aF: 1.2 + Math.max(0, Math.sin(t * 5.2)) * 0.5, eF: -1.3, aB: 0.2, eB: -1.4, lF: 0.1, lB: -0.1 }, { aF: 2.8, eF: -0.2, aB: 0.2, eB: -1.5, bob: 0 }, lw);
    worker(D, 121, FY, MASTER, mp, -1);
    const pl = pull; worker(D, 43 + Math.round(pl * 5), FY, MONK, { aF: 2.0 - pl * 0.3, eF: -0.2, aB: 1.8 - pl * 0.3, eB: -0.3, lF: 0.35 - pl * 0.6, kF: 0.1, lB: -0.3 - pl * 0.1, kB: 0.3, lean: -pl * 0.7 }, -1);
    // stone lantern flame; stars coming out
    D.lay('front'); flame(D, 139, 72, 4, t, 0.8); X.twinkle(D, t, 5, 24, 13);
  },
});
const PINE = [[141, 8, 7], [127, 11, 8], [114, 13, 6], [133, 20, 6], [120, 7, 5]];

// small cellular fire for braziers (the spreading-heat automaton, 30 Hz); heat 0…36 walks the fire ramp
function fireSim(st, w, h, t, heat) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; } const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) { for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.8 + R() * 0.2) - (edge < 2 ? 8 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < 0.55 ? 2 : 0)); } }
  return f;
}
function drawFire(D, f, w, h, x0, y0, taper) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = f[y * w + x]; if (taper) { const u = Math.abs(x + 0.5 - w / 2) / (w / 2), lim = 0.25 + 0.75 * y / h; v -= Math.max(0, (u - lim) * 60); } if (v < 5) continue; D.px(x0 + x, y0 + y, 'fire', clamp(v / 36 * 11.5, 2, 11), { e: 255 }); } }
// where a worker's front hand ends up (mirrors worker(): shoulder, 5 px upper arm, 5 px forearm)
function handAt(x, y, p, dir) { const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), a1 = p.aF || 0, a2 = a1 + (p.eF || 0), ex = sx + dir + Math.sin(a1) * 5 * dir, ey = shY + 2 + Math.cos(a1) * 5; return [ex + Math.sin(a2) * 5 * dir, ey + Math.cos(a2) * 5, a2, sx, shY]; }

// ───────── 罗马斗兽场 Colosseum (medieval · train, epic) ─────────
// inside the arena by night: the stands climb in curved tiers of cheering crowd to the arcade and the moonlit rim,
// the emperor's box hangs its purple; braziers roar on both sides. A murmillo (helmet, shield, sword) and a retiarius
// (trident, net) trade blows — every clash throws sparks and a flash; every ten seconds the murmillo knocks the trident
// spinning away into the open sand in front of them, raises his sword over his helmet, the braziers flare and the whole
// crowd leaps up with its arms in the air; the retiarius finds his feet, grips the top of the shaft and pulls it free
const COL = { u: (x) => (x - 75) / 72, top: (x) => 21 - 8 * COL.u(x) * COL.u(x), base: (x) => 63 + 9 * COL.u(x) * COL.u(x) };
const colY = (h, x) => Math.round(COL.base(x) + (COL.top(x) - COL.base(x)) * h);
const BZ = [36, 114];   // braziers
const CROWD = [];   // [x, head y, tunic material] of every spectator (painted once; the anim raises their arms)
const MURM = { skin: ['skin', 6], hair: ['hair', 3], top: ['skin', 6], bot: ['linen', 8], boot: ['brass', 5] };
const RETI = { skin: ['skin', 5], hair: ['hair', 2], top: ['skin', 5], bot: ['teal', 5], boot: ['leather', 4] };
function murmillo(D, x, y, p, dir) {
  const [hx, hy, a2, sx, shY] = handAt(x, y, p, dir), bx = sx + dir * 3;
  D.beg(); D.cyl(Math.min(bx, bx + dir * 5), shY + 1, 6, 13, 'crimson', 6, { rim: 2 }); D.vl(dir > 0 ? bx + 5 : bx - 5, shY + 1, 13, 'gold', 7); D.hl(Math.min(bx, bx + dir * 5), shY + 1, 6, 'gold', 8); D.hl(Math.min(bx, bx + dir * 5), shY + 13, 6, 'gold', 5); D.rect(bx + dir * 2 - (dir < 0 ? 1 : 0), shY + 6, 2, 3, 'gold', 9); D.end();
  worker(D, x, y, MURM, p, dir);
  // the helmet: a brass bowl with a wide brim, a grille over the face, a crimson crest
  const h0 = sx + Math.round((p.hx || 0) * dir); D.beg(); D.rect(h0 - 3, shY - 7, 7, 6, 'brass', 6); D.hl(h0 - 4, shY - 2, 9, 'brass', 7); D.hl(h0 - 3, shY - 7, 7, 'brass', 9); for (let k = 0; k < 3; k++) D.px(h0 + dir * 2, shY - 5 + k, 'ink', 1); D.px(h0 + dir * 3, shY - 4, 'ink', 1);
  D.rect(h0 - 2 - dir, shY - 10, 5, 3, 'crimson', 7); D.hl(h0 - 2 - dir, shY - 10, 5, 'crimson', 9); D.px(h0 - 3 * dir, shY - 9, 'crimson', 5); D.end();
  // a sword arm raised past the brim passes in front of the helmet: the forearm again, over it (its edge parts it from the brass)
  const up = (p.aF || 0) > 2.2;
  if (up) { const ex = sx + dir + Math.sin(p.aF) * 5 * dir, ey = shY + 2 + Math.cos(p.aF) * 5; D.beg(); D.line(ex, ey, hx, hy, 'skin', 6.6, { w: 2 }); D.end({ lit: 1 }); }
  // the gladius, with a brass guard
  const dx = Math.sin(a2 + (p.ta || 0)) * dir, dy = Math.cos(a2 + (p.ta || 0)); D.beg(); D.line(hx, hy, hx + dx * 8, hy + dy * 8, 'iron', 10); D.px(hx - dx, hy - dy, 'brass', 7); D.px(hx + dy, hy, 'brass', 6); D.end();
  // held high: the fist closes over the grip, the crossguard just above it, a bright edge at the point
  if (up) { const fx = Math.round(hx), fy = Math.round(hy), tx = Math.round(hx + dx * 8), ty = Math.round(hy + dy * 8);
    D.rect(fx, fy, 2, 2, 'skin', 6); D.px(fx + (dir > 0 ? 1 : 0), fy, 'skin', 7.5); D.px(fx + (dir > 0 ? 0 : 1), fy + 1, 'skin', 4.5);
    D.hl(fx - 1, fy - 1, 4, 'brass', 7); D.px(fx - 1, fy - 1, 'brass', 9); D.px(fx + 2, fy - 1, 'brass', 5); D.px(tx, ty, 'iron', 11); }
  return [hx + dx * 8, hy + dy * 8];
}
// the net: a hanging teardrop of diamond mesh (two sets of diagonals), darker than the trident, lead weights on the hem
const NET_W = [0.6, 1.2, 1.8, 2.4, 2.9, 3.2, 3.3, 3.1, 2.6, 1.6];
function net(D, x, y, sw) {
  D.beg(); for (let j = 0; j < NET_W.length; j++) { const hw = NET_W[j], c = x + Math.round(sw * j / NET_W.length); for (let i = -Math.floor(hw); i <= Math.floor(hw); i++) { const rim = Math.abs(i) >= Math.floor(hw) || j === NET_W.length - 1, mesh = ((i + j) % 4 + 4) % 4 === 0 || ((i - j) % 4 + 4) % 4 === 0;
    if (rim) D.px(c + i, y + j, 'hair', 5); else if (mesh) D.px(c + i, y + j, 'hair', 6); } }
  D.end({ none: 1 });
  const b = y + NET_W.length, c = x + Math.round(sw); for (let i = -3; i <= 3; i += 2) D.px(c + i, b - (Math.abs(i) > 2 ? 1 : 0), 'iron', 7);
}
// the trident's shaft: dark wood two pixels wide with a lit stripe on its upper / left side, so it stands out on the sand
function pole(D, x0, y0, x1, y1) { const h = Math.abs(x1 - x0) >= Math.abs(y1 - y0), ox = h ? 0 : 1, oy = h ? 1 : 0; D.line(x0 + ox, y0 + oy, x1 + ox, y1 + oy, 'wood', 4); D.line(x0, y0, x1, y1, 'wood', 7); }
// the trident stuck tines-first in the sand: the middle tine's tip at (x, y), leaning back one pixel to the right every
// three rows; three iron tines under a crossbar and a collar, then the shaft (wood 4, a wood 7 stripe), all outlined in ink.
// `wig` bends the upper shaft a pixel while someone tugs at it. Returns where a hand grips it (near the top).
const TRI_H = 21, triX = (x, h) => x + Math.floor(h / 3), NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function stuckTri(D, x, y, wig) {
  const P = new Map(), put = (px, py, m, t) => P.set(px * 256 + py, [px, py, m, t]);
  for (let h = 0; h < 5; h++) [-3, 0, 3].forEach(o => put(triX(x, h) + o, y - h, 'iron', h === 0 ? 8 : 9));
  for (let i = -3; i <= 3; i++) put(triX(x, 5) + i, y - 5, 'iron', i === -3 ? 9.5 : 7.5); for (let i = -1; i <= 1; i++) put(triX(x, 6) + i, y - 6, 'brass', i < 0 ? 8 : 6);
  for (let h = 7; h <= TRI_H; h++) { const sx = triX(x, h) + Math.round(wig * Math.max(0, h - 13) / 8); put(sx, y - h, 'wood', 7); put(sx + 1, y - h, 'wood', 4); }
  // the ink edge, drawn pixel by pixel (an anim layer keeps only what it paints, so end()'s outline would not show)
  P.forEach(([px, py]) => { for (const [ox, oy] of NB4) if (!P.has((px + ox) * 256 + py + oy)) D.px(px + ox, py + oy, 'ink', 1); });
  P.forEach(([px, py, m, t]) => D.px(px, py, m, t));
  return [triX(x, 19) + Math.round(wig * 6 / 8), y - 19];
}
function retiarius(D, x, y, p, dir, hasTri) {
  const [hx, hy, a2, sx, shY] = handAt(x, y, p, dir);
  // the net hangs from the back hand (worker()'s back arm: shoulder at sx − 2·dir, two 5 px segments), trailing behind him
  const b1 = p.aB || 0, b2 = b1 + (p.eB || 0), bhx = sx - 2 * dir + (Math.sin(b1) + Math.sin(b2)) * 5 * dir, bhy = shY + 2 + (Math.cos(b1) + Math.cos(b2)) * 5;
  net(D, Math.round(bhx - dir * 3), Math.round(bhy), -dir);
  worker(D, x, y, RETI, p, dir);
  // the galerus: a stepped brass guard on the back shoulder, tall on the outside, low toward the neck
  D.beg(); [[4, 1], [3, 2], [2, 3]].forEach(([o, top]) => { const gx = sx - dir * o; D.vl(gx, shY + top, 6 - top, 'brass', 6.5); D.px(gx, shY + top, 'brass', 9); D.px(gx, shY + 5, 'brass', 4.5); }); D.end();
  if (!hasTri) return [hx, hy];
  const dx = Math.sin(a2 + (p.ta || 0)) * dir, dy = Math.cos(a2 + (p.ta || 0)), tx = hx + dx * 9, ty = hy + dy * 9; D.beg(); pole(D, hx - dx * 9, hy - dy * 9, tx, ty); trident(D, tx, ty, dx, dy); D.end();
  return [tx + dx * 3, ty + dy * 3];
}
function trident(D, x, y, dx, dy) { const px = -dy, py = dx; D.line(x - px * 2, y - py * 2, x + px * 2, y + py * 2, 'iron', 8); for (let k = -1; k <= 1; k++) D.line(x + px * k * 2, y + py * k * 2, x + px * k * 2 + dx * 4, y + py * k * 2 + dy * 4, 'iron', 10); }
const G_M = { aF: 1.1, eF: -0.9, aB: 0.9, eB: -1.2, lF: 0.45, kF: -0.2, lB: -0.45, kB: 0.3, bob: 1 }, G_R = { aF: 1.4, eF: -0.3, aB: 0.6, eB: -0.8, lF: 0.4, lB: -0.4, kB: 0.2, bob: 1 };
const BOUT = [   // murmillo (right-facing, left) and retiarius (left-facing, right): 2.8 s — a jab on the shield, a lunge on the shaft
  [0, { m: Object.assign({ x: 58 }, G_M), r: Object.assign({ x: 97 }, G_R) }],
  [0.55, { m: Object.assign({ x: 60 }, G_M, { lean: -0.2 }), r: { x: 90, aF: 1.75, eF: -0.15, aB: 0.2, eB: -0.6, lF: 0.8, kF: -0.4, lB: -0.6, kB: 0.4, bob: 2, lean: 0.5 } }],
  [0.75, { m: Object.assign({ x: 59 }, G_M, { lean: -0.3 }), r: { x: 90, aF: 1.75, eF: -0.15, aB: 0.2, eB: -0.6, lF: 0.8, kF: -0.4, lB: -0.6, kB: 0.4, bob: 2, lean: 0.5 } }],
  [1.15, { m: Object.assign({ x: 62 }, G_M), r: Object.assign({ x: 96 }, G_R) }],
  [1.5, { m: { x: 67, aF: 1.65, eF: 0, aB: 1.0, eB: -1.2, lF: 0.85, kF: -0.3, lB: -0.7, kB: 0.2, bob: 2, lean: 0.5 }, r: { x: 97, aF: 0.9, eF: -1.3, aB: 0.6, eB: -0.8, lF: 0.2, lB: -0.6, kB: 0.4, bob: 1, lean: -0.4, ta: 1.2 } }],
  [1.7, { m: { x: 67, aF: 1.65, eF: 0, aB: 1.0, eB: -1.2, lF: 0.85, kF: -0.3, lB: -0.7, kB: 0.2, bob: 2, lean: 0.5 }, r: { x: 97, aF: 0.9, eF: -1.3, aB: 0.6, eB: -0.8, lF: 0.2, lB: -0.6, kB: 0.4, bob: 1, lean: -0.4, ta: 1.2 } }],
  [2.3, { m: Object.assign({ x: 58 }, G_M), r: Object.assign({ x: 97 }, G_R) }],
  [2.8, { m: Object.assign({ x: 58 }, G_M), r: Object.assign({ x: 97 }, G_R) }],
];
// the win: where the trident sticks (middle tine's tip), and the retiarius's poses as he goes to pull it out;
// TRI_GX puts his reaching hand on the top of the shaft
const TRI = [84, 98], R_STAG = { aF: 0.4, eF: -0.2, aB: -0.3, eB: 0.4, lF: -0.3, lB: 0.3, lean: -0.6, bob: 1 },
  R_STAND = { aF: 0.25, eF: -0.3, aB: 0.3, eB: -0.3, lF: 0.25, lB: -0.25, kB: 0.1, lean: 0.1 },
  R_REACH = { aF: 0.7, eF: 0.4, aB: 0.5, eB: -0.7, lF: 0.55, kF: -0.7, lB: -0.35, kB: 0.55, lean: 0.5, bob: 2 },
  TRI_GX = triX(TRI[0], 19) - Math.round(handAt(0, FY, R_REACH, -1)[0]);
function bout(t) { const n = BOUT.length, T = BOUT[n - 1][0]; t = ((t % T) + T) % T; let i = 0; while (i < n - 2 && t >= BOUT[i + 1][0]) i++; const [t0, a] = BOUT[i], [t1, b] = BOUT[i + 1], k = sm((t - t0) / (t1 - t0)), o = {};
  ['m', 'r'].forEach(w => { o[w] = {}; Object.keys(Object.assign({}, a[w], b[w])).forEach(q => { const va = a[w][q] || 0, vb = b[w][q] || 0; o[w][q] = va + (vb - va) * k; }); }); return o; }
X.def('colosseum', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    CROWD.length = 0;
    X.sky(S, sc, { moon: [121, 11, 4], far: 'none', horizon: 30, floor: 'sand' });                                // 0 moon
    sc.light({ x: 36, y: 54, z: 22, r: 66, i: 1.15, c: '#ff8a30', fl: 'fire', tint: 0.5 });                        // 1 brazier left
    sc.light({ x: 114, y: 54, z: 22, r: 66, i: 1.15, c: '#ff8a30', fl: 'fire', ph: 3, tint: 0.5 });               // 2 brazier right
    sc.light({ x: 75, y: 46, z: 10, r: 34, i: 0.7, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.4 });               // 3 lamps in the emperor's box
    sc.light({ x: 78, y: 70, z: 18, r: 40, i: 1, c: '#fff0c0', tint: 0.3, bake: false });                          // 4 clash of steel (kicked)
    S.lay('wall');
    const r = S.r, TUN = [['linen', 8], ['linen', 7], ['crimson', 6], ['teal', 5], ['sand', 7], ['lav', 6], ['denim', 5], ['brick', 6]];
    for (let x = 3; x < W - 3; x++) {
      const yt = COL.top(x), yb = COL.base(x);
      // the attic rim and its windows, the arcade, walls and tiers down to the podium
      for (let y = Math.round(yt) - 5; y < Math.round(yt); y++) S.px(x, y, 'mstone', 5 + (y === Math.round(yt) - 5 ? 2 : 0) + ((x % 9 < 3 && y > yt - 4 && y < yt - 1) ? -3 : 0));
      for (let y = Math.round(yt); y <= Math.round(yb); y++) {
        const h = (yb - y) / (yb - yt); let m = 'mstone', tn = 4;
        if (h > 0.8) { const ax = ((x - 75) % 9 + 9) % 9, top = colY(1, x) + 2, arch = y > top + (ax === 1 || ax === 7 ? 1 : ax === 2 || ax === 6 ? 0 : -1); if (ax < 2 || !arch || y >= colY(0.8, x) - 1) { m = 'mstone'; tn = ax === 0 ? 8 : ax === 1 ? 6.5 : 5.5; } else { m = 'night'; tn = 1.2; } }
        else if (h > 0.76) { m = 'mstone'; tn = 6.5 - (h - 0.76) * 30; }
        else if (h > 0.5 || (h > 0.18 && h <= 0.44)) { m = 'mstone'; tn = 3; }
        else if (h > 0.44) { const vx = ((x - 75) % 24 + 24) % 24; m = 'mstone'; tn = 5.5; if (vx > 9 && vx < 15 && h < 0.485) { m = 'ink'; tn = 1; } }
        else if (h > 0.15) { m = 'gold'; tn = h > 0.165 ? 6 : 3.5; }
        else { m = 'bone'; tn = 6.5 - (h < 0.03 ? 1.5 : 0); }
        S.px(x, y, m, tn, { n: [0, 0] });
      }
      // seat rows with people: 3 rows per tier
      [[0.18, 0.44], [0.5, 0.76]].forEach(([h0, h1]) => { for (let k = 0; k < 3; k++) { const ya = colY(h0 + (h1 - h0) * (k + 1) / 3, x), yb2 = colY(h0 + (h1 - h0) * k / 3, x); S.px(x, yb2, 'mstone', 6.5, { n: [0, -0.8] });
        const col = Math.floor((x + k * 1.5 + (h0 > 0.3 ? 1 : 0)) / 3), cx = Math.round(col * 3 - k * 1.5 - (h0 > 0.3 ? 1 : 0)), sd = col * 7 + k * 131 + (h0 > 0.3 ? 5000 : 0); let hn = 0; const hsh = () => hh(sd, ++hn);
        if (hsh() < 0.1 || yb2 - ya < 3) continue; const tu = TUN[Math.floor(hsh() * TUN.length)], sk = 4 + hsh() * 3, head = yb2 - 3;
        if (x === cx) { S.px(x, head, hsh() < 0.2 ? 'hair' : 'skin', hsh() < 0.2 ? 2 : sk); S.px(x, head + 1, tu[0], tu[1]); S.px(x, head + 2, tu[0], tu[1] - 1.2); CROWD.push([x, head, tu, hsh() * 7]); }
        else if (x === cx + 1) { S.px(x, head + 1, tu[0], tu[1] - 0.8); S.px(x, head + 2, tu[0], tu[1] - 2); } } });
    }
    // the emperor's box: a pediment on columns, purple hangings, the emperor in his laurel between two guards, the eagle above
    S.lay('back'); S.beg(); S.rect(61, 41, 28, 12, 'night', 2); S.poly([[58, 40], [92, 40], [75, 33]], 'bone', 7); S.poly([[63, 39], [87, 39], [75, 35]], 'bone', 5); S.hl(58, 40, 34, 'bone', 9); [59, 88].forEach(x => { S.cyl(x, 41, 3, 12, 'bone', 7, { rim: 1.5 }); }); S.end();
    S.beg(); [[62, 1], [87, -1]].forEach(([x, d]) => { for (let y = 41; y < 51; y++) { const w = Math.max(1, Math.round(4 - (y - 41) * 0.35)); S.hl(d > 0 ? x : x - w + 1, y, w, 'pink', 4.5 + (y % 3 === 0 ? 1 : 0)); } }); S.end();
    S.beg(); S.rect(72, 45, 7, 7, 'linen', 8); S.vl(73, 45, 7, 'pink', 6); S.rect(73, 42, 5, 3, 'skin', 6); S.hl(72, 41, 7, 'leaf', 8); S.px(74, 43, 'ink', 1); S.px(79, 46, 'skin', 6); S.px(80, 45, 'skin', 6); S.end();
    [[66, 1], [84, -1]].forEach(([x, d]) => { S.beg(); S.rect(x - 1, 45, 3, 7, 'crimson', 5); S.rect(x - 1, 42, 3, 3, 'brass', 7); S.rect(x - 1, 40, 3, 2, 'red', 7); S.vl(x + d * 2, 36, 16, 'wood', 6); S.px(x + d * 2, 35, 'iron', 9); S.end(); });
    S.beg(); S.box(58, 52, 34, 3, 'bone', 8, { top: 1 }); S.rect(60, 55, 30, 6, 'bone', 5.5); for (let x = 61; x < 89; x += 3) S.vl(x, 55, 6, 'bone', 7); S.rect(69, 55, 12, 8, 'pink', 5); S.hl(69, 55, 12, 'gold', 8); S.hl(69, 62, 12, 'gold', 6); S.rect(73, 57, 4, 3, 'gold', 8); S.end();
    S.beg(); S.vl(75, 22, 11, 'gold', 5); S.rect(73, 20, 5, 2, 'gold', 8); S.px(72, 19, 'gold', 7); S.px(78, 19, 'gold', 7); S.px(71, 18, 'gold', 6); S.px(79, 18, 'gold', 6); S.px(75, 18, 'gold', 9); S.rect(73, 24, 5, 5, 'crimson', 6); S.hl(73, 24, 5, 'gold', 7); S.hl(73, 28, 5, 'gold', 6); S.end();
    // masts along the rim, the velarium sagging between two of them
    // (everything stays below y 5, clear of the room frame)
    const mast = (x) => [Math.max(6, Math.round(COL.top(x) - 11)), Math.round(COL.top(x) - 5)];
    [10, 38, 112, 140].forEach(x => { const [a, b] = mast(x); S.beg(); S.vl(x, a, b - a, 'wood', 5); S.px(x, a - 1, 'wood', 7); S.end(); });
    S.beg(); for (let x = 11; x <= 37; x++) { const u = (x - 10) / 28, yy = Math.round(6.5 + u * 2.5 + Math.sin(u * Math.PI) * 2); for (let k = 0; k < 3; k++) S.px(x, yy + k, (Math.floor(x / 4) % 2) ? 'crimson' : 'linen', (Math.floor(x / 4) % 2 ? 6 : 8) - k); } S.end();
    // podium torches
    [30, 50, 100, 120].forEach(x => { S.beg(); S.rect(x, colY(0.15, x) - 1, 2, 3, 'iron', 5); S.end(); S.px(x, colY(0.15, x) - 2, 'fire', 9, { e: 255 }); S.px(x + 1, colY(0.15, x) - 3, 'fire', 8, { e: 255 }); });
    // the arena: raked sand, the gate in the podium wall
    S.lay('wall'); for (let x = 3; x < W - 3; x++) for (let y = colY(0, x) + 1; y < H; y++) S.px(x, y, 'sand', 6 - (y < colY(0, x) + 3 ? 1.5 : 0) + ((x * 3 + y * 7) % 23 === 0 ? -1 : 0), { n: [0, -0.9] });
    S.noise(3, 60, W - 6, H - 60, 1, 5, 17); for (let k = 0; k < 5; k++) { const cy = 80 + k * 5; for (let x = 12; x < 140; x++) if (Math.sin(x * 0.07 + k) > 0.2) S.px(x, cy + Math.round(Math.sin(x * 0.05 + k * 2) * 1.2), 'sand', 4.5); }
    S.lay('back'); S.beg(); S.rect(126, 61, 14, 12, 'ink', 1); for (let x = 127; x < 140; x += 3) S.vl(x, 61, 12, 'iron', 5); S.hl(126, 65, 14, 'iron', 6); S.hl(126, 69, 14, 'iron', 6); S.box(124, 58, 18, 3, 'bone', 8); S.end();
    S.px(131, 67, 'fire', 8, { e: 255 }); S.px(134, 67, 'fire', 8, { e: 255 });   // eyes in the dark behind the gate
    // braziers on tall tripods (mid)
    S.lay('mid'); BZ.forEach(x => { S.beg(); S.line(x, 64, x - 6, FY, 'iron', 5); S.line(x, 64, x + 6, FY, 'iron', 4); S.vl(x, 64, 26, 'iron', 6); S.hl(x - 4, 76, 9, 'iron', 5); S.poly([[x - 8, 58], [x + 9, 58], [x + 5, 65], [x - 4, 65]], 'brass', 5); S.hl(x - 8, 58, 17, 'brass', 8); S.hl(x - 7, 59, 15, 'ink', 1); S.end(); });
    // near the eye: a spear rack and a shield on the sand (left), a fallen helmet (right)
    S.lay('front'); S.beg(); S.box(3, 70, 3, 20, 'wood', 4); S.box(20, 70, 3, 20, 'wood', 4); S.hl(3, 72, 20, 'wood', 6); [6, 10, 14, 18].forEach((x, i) => { S.line(x, 90, x + 1, 56 + i * 2, 'wood', 5.5); S.poly([[x + 1, 56 + i * 2], [x + 3, 52 + i * 2], [x + 2, 57 + i * 2]], 'iron', 9); }); S.end();
    S.beg(); S.ell(30, 94, 7, 5, 'crimson', 6, { dome: 1 }); S.ell(30, 94, 7, 5, 'gold', 7, { ring: 1 }); S.ell(30, 94, 2, 1.5, 'gold', 9); S.end();
    S.beg(); S.ell(124, 96, 4, 3, 'brass', 6, { dome: 1 }); S.rect(121, 96, 7, 2, 'brass', 5); S.rect(122, 92, 4, 1, 'crimson', 7); S.px(126, 96, 'ink', 1); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st, C = 10, q = ((t % C) + C) % C, win = q > 7.1 && q < 9.6, rec = q >= 9.6;
    rs.mul[4] = 0;
    // braziers
    D.lay('mid'); [[BZ[0], 'a'], [BZ[1], 'b']].forEach(([x, k]) => { const f = fireSim(st[k] || (st[k] = {}), 15, 18, t, win ? 1.1 : 0.95); drawFire(D, f, 15, 18, x - 7, 40, 1); });
    BZ.forEach(x => { if (R() < 0.12) rs.burst('ember', x + (R() - 0.5) * 8, 46, 1, { sp: 6, ang: 0, spread: 0.6, life: 1.8 }); });
    // the bout
    const b = bout(win || rec ? 0 : t);
    if (!win && !rec) {
      const tip = murmillo(D, Math.round(b.m.x), FY, b.m, 1), tri = retiarius(D, Math.round(b.r.x), FY, b.r, -1, true);
      const ph = ((t % 2.8) + 2.8) % 2.8, hit = ph > 0.55 && ph < 0.75 ? 1 : ph > 1.5 && ph < 1.7 ? 2 : 0;
      if (hit && st.clash !== hit) { st.clash = hit; const at = hit === 1 ? tri : tip; rs.flash(4, hit === 2 ? 1.6 : 1.1); rs.burst('spark', at[0], at[1], hit === 2 ? 11 : 7, { sp: 40, ang: 0, spread: 2.6, life: 0.6, floor: FY + 2 }); rs.burst('glint', at[0], at[1], 1, { sp: 0, life: 0.3 }); } if (!hit) st.clash = 0;
    } else {
      // the decisive blow: the trident spins away and sticks in the sand; the murmillo raises his sword; the retiarius pulls it out
      const k = q - 7.1;
      if (win && k < 0.1 && !st.win) { st.win = 1; rs.flash(4, 2.2); rs.flash(1, 0.8); rs.flash(2, 0.8); rs.burst('spark', 86, 66, 9, { sp: 50, life: 0.7, floor: FY + 2 }); rs.burst('glint', 86, 66, 4, { sp: 30, life: 0.5 }); BZ.forEach(x => rs.burst('ember', x, 44, 5, { sp: 20, ang: 0, spread: 0.8, life: 1.8 })); }
      // it spins high over the fight and sticks tines-first in the open sand in front of both fighters, the shaft leaning back
      const fk = Math.min(1, k / 1.1), stuck = k >= 1.1 && k < 2.2, END = [TRI[0] + 2.6, TRI[1] - 9.7], REST = Math.PI + 0.33;
      if (k < 1.1) { const spin = fk * (Math.PI * 4 + REST), dx = Math.sin(spin), dy = -Math.cos(spin), cx0 = 88 + fk * (END[0] - 88), cy0 = 64 - Math.sin(fk * Math.PI) * 30 + fk * (END[1] - 64);
        D.beg(); pole(D, cx0 - dx * 10, cy0 - dy * 10, cx0 + dx * 5, cy0 + dy * 5); trident(D, cx0 + dx * 5, cy0 + dy * 5, dx, dy); D.end(); }
      // the retiarius is knocked back, finds his feet, bends over the trident, grips the top of the shaft, tugs and pulls it free
      const tug = k > 1.75 && k < 2.2 && Math.sin((k - 1.75) * 24) > 0 ? 1 : 0;
      if (stuck) { stuckTri(D, TRI[0], TRI[1], tug); D.hl(TRI[0] - 5, TRI[1] + 1, 11, 'sand', 7); D.hl(TRI[0] - 2, TRI[1] + 1, 2, 'sand', 8); D.hl(TRI[0] + 1, TRI[1] + 1, 2, 'sand', 8); D.px(TRI[0] - 4, TRI[1], 'sand', 7.5); D.px(TRI[0] + 4, TRI[1], 'sand', 7.5); D.hl(TRI[0] + 5, TRI[1] + 1, 3, 'sand', 4.5);
        if (!st.stick) { st.stick = 1; rs.burst('dust', TRI[0], TRI[1] - 1, 5, { sp: 12, life: 0.9, w: 5 }); } }
      if (k >= 2.2 && !st.yank) { st.yank = 1; rs.burst('dust', TRI[0], TRI[1] - 2, 6, { sp: 14, life: 1, w: 6 }); }
      const vict = { x: 64, aF: 2.4, eF: 0.6, aB: 0.6, eB: -0.9, lF: 0.4, lB: -0.4, kB: 0.2, bob: Math.round(Math.sin(t * 6) * 0.6), ta: -0.15 };
      const b0 = bout(t - k), b1 = bout(t + (10 - q)), mm = rec ? lerpPose(vict, b1.m, sm((q - 9.6) / 0.4)) : k < 0.3 ? lerpPose(b0.m, vict, sm(k / 0.3)) : vict;
      const tip = murmillo(D, Math.round(mm.x), FY, mm, 1);
      if (k > 0.35 && !st.gl) { st.gl = 1; rs.burst('glint', tip[0], tip[1], 1, { sp: 0, life: 0.5 }); }   // the raised blade catches the firelight
      const rp = k < 0.3 ? lerpPose(b0.r, Object.assign({}, R_STAG, { x: 101 }), sm(k / 0.3))
        : k < 0.9 ? Object.assign({}, R_STAG, { x: 101, bob: 1 + (Math.sin(k * 9) > 0.3 ? 1 : 0) })
        : k < 1.35 ? lerpPose(Object.assign({}, R_STAG, { x: 101 }), Object.assign({}, R_STAND, { x: 101 }), sm((k - 0.9) / 0.45))
        : k < 1.75 ? lerpPose(Object.assign({}, R_STAND, { x: 101 }), Object.assign({}, R_REACH, { x: TRI_GX }), sm((k - 1.35) / 0.4))
        : k < 2.2 ? Object.assign({}, R_REACH, { x: TRI_GX, lean: tug ? 0.15 : 0.5 })
        : lerpPose(Object.assign({}, R_REACH, { x: TRI_GX, ta: 0.33 - (R_REACH.aF + R_REACH.eF) }), b1.r, sm((k - 2.2) / 0.7));
      retiarius(D, Math.round(rp.x), FY, rp, -1, k >= 2.2);
    }
    if (q < 1) { st.win = 0; st.stick = 0; st.yank = 0; st.gl = 0; }
    // the crowd: some always stir; at the win they all leap up with their arms in the air
    D.lay('wall'); const all = win && q < 9.2;
    if (all) { if (!st.roar) { st.roar = 1; rs.flash(3, 1.4); rs.flash(0, 0.35); }   // the stands light up as they rise
      for (let i = 0; i < CROWD.length; i++) { const [x, y, tu, ph] = CROWD[i], up = Math.sin(t * 9 + ph * 3) > -0.3 ? 2 : 1;
        D.vl(x, y - up + 1, up, tu[0], tu[1]); D.px(x, y - up, 'skin', 6); D.px(x - 1, y - up - 1, 'skin', 6.5); D.px(x + 1, y - up - 1, 'skin', 5.5); } }
    else { st.roar = 0; for (let i = 0; i < CROWD.length; i += 6) { const [x, y, tu, ph] = CROWD[i], a = Math.sin(t * 2.2 + ph * 3); if (a < 0.6) continue;
      D.px(x, y, 'skin', 6); if (a > 0.85) { D.px(x - 1, y - 1, tu[0], tu[1] + 1); D.px(x + 1, y - 1, tu[0], tu[1] + 1); } } }
    X.twinkle(D, t, 5, 12, 21);
  },
});

// ───────── 马拉卡纳体育场 Maracanã (cartoon · train, epic) ─────────
// a night match under the floodlights: the roof ring with its blazing lamp banks, stands packed section by section in
// yellow and green (heads over solid bands of shirt, concrete aisles between) with a Mexican wave rolling round, a giant
// flag held up and camera flashes, LED boards scrolling along the touchline, a striped pitch. The number 10 dribbles
// past a defender and shoots: the net bulges, GOL! — fireworks over the roof, the floodlights flare, the scoreboard
// flashes, the stands jump section by section and the striker runs off with his arms out like wings; then the keeper kicks it back out
const FAN = [], BEAM = [];   // every fan (see fanPaint); floodlight flare under the lamp banks [pixel, alpha]
const LED = [];   // the two touchline-board lights (their colour follows the scrolling boards)
const LEDC = { lamp: [255, 186, 72], tile: [80, 137, 196], candy: [238, 134, 188], screen: [120, 220, 114], gold: [255, 218, 110], leaf: [149, 200, 90] };
const BRA = { skin: ['skin', 5], hair: ['hair', 2], top: ['gold', 8], bot: ['denim', 6], boot: ['linen', 9] };
const OPP = { skin: ['skin', 7], hair: ['hair', 4], top: ['linen', 9], bot: ['ink', 2], boot: ['ink', 1] };
const GK = { skin: ['skin', 6], hair: ['hair', 3], top: ['fire', 6], bot: ['ink', 2], boot: ['linen', 8] };
const PHOTO = { skin: ['skin', 6], hair: ['hair', 3], top: ['denim', 4], bot: ['denim', 3], boot: ['hair', 2], cap: ['crimson', 6] };
const GOAL_X = 131;
// the stands' plan: two tiers (top row y, aisle x's, one shirt colour per section between them); rows 4 px apart
const STANDS = [{ y0: 21, aisles: [40, 66, 92, 118], cols: ['gold', 'leaf', 'gold', 'leaf', 'gold'] },
  { y0: 40, aisles: [27, 53, 99, 125], cols: ['leaf', 'gold', 'leaf', 'gold', 'leaf'] }];
const SHADE_UP = 27;   // the roof's shadow ends here (hard edge, through the second row's shirts)
const shadeAt = (y) => (y < SHADE_UP ? 2 : y >= 40 && y < 42 ? 1.4 : 0);
// one fan: [x, y, shirt, tone, skin, hair material, hair tone, section, row]. lift 0 paints the seated block (static);
// lift 1 / 2 paints the fan half risen / standing (anim): the head moves up and the shirt fills where it was (the seated
// block's lower shirt rows stay as painted), both arms up when standing
function fanPaint(S, f, lift) {
  const [x, y, m, tn, sk, hm, ht] = f, yy = y - lift, sh = (r) => (lift ? shadeAt(r) : 0);   // seated fans get their shadow from S.shadow() after
  S.px(x, yy, hm, ht - sh(yy)); S.px(x + 1, yy, hm, ht - 0.6 - sh(yy));
  S.px(x, yy + 1, 'skin', sk + 0.4 - sh(yy + 1)); S.px(x + 1, yy + 1, 'skin', sk - 0.7 - sh(yy + 1));
  for (let r = yy + 2, r1 = lift ? y + 1 : y + 3; r <= r1; r++) { const top = r === yy + 2, d = sh(r); S.px(x, r, m, tn - (top ? 0 : 0.8) - d); S.px(x + 1, r, m, tn - (top ? 0.2 : 1) - d); S.px(x + 2, r, m, tn - (top ? 1.4 : 2.2) - d); }
  if (lift > 1) { const d0 = sh(yy - 1), d1 = sh(yy); S.px(x - 1, yy - 1, m, tn + 0.8 - d0); S.px(x - 1, yy, m, tn - 0.2 - d1); S.px(x + 2, yy - 1, m, tn + 0.3 - d0); S.px(x + 2, yy, m, tn - 0.9 - d1); }   // sleeves up, a scarf in the section's colour
}
// the match, one 10 s loop: [ball x, ball y, striker x, striker dir, defender x, keeper x, phase]
function match(q) {
  const run = (a, b, k) => a + (b - a) * clamp(k, 0, 1);
  if (q < 1) { const k = q / 1; return { bx: run(126, 60, k), by: FY - 1 - Math.sin(k * Math.PI) * 30, sx: run(62, 54, k), sd: -1, dx: 69, kx: 126, ph: 'kick' }; }
  if (q < 6) { const k = (q - 1) / 5, bx = run(60, 97, k); return { bx: bx + Math.sin(q * 9) * 1.5, by: FY - 1 - Math.abs(Math.sin(q * 6)) * 1.2, sx: bx - 6, sd: 1, dx: run(72, 96, sm(k * 1.05)) - 3, kx: run(126, 124, k), ph: 'drib' }; }
  if (q < 6.35) { const k = (q - 6) / 0.35; return { bx: run(97, GOAL_X + 3, k), by: FY - 1 - Math.sin(k * Math.PI * 0.8) * 12 - k * 4, sx: 91, sd: 1, dx: 93, kx: 124, ph: 'shot' }; }
  if (q < 9) { const k = (q - 6.35) / 2.65; return { bx: GOAL_X + 6, by: FY - 2, sx: run(92, 58, k), sd: -1, dx: 93, kx: 124, ph: 'gol' }; }
  const k = (q - 9) / 1; return { bx: run(GOAL_X + 6, 126, k), by: FY - 1, sx: run(58, 62, k), sd: -1, dx: run(93, 69, k), kx: run(124, 126, k), ph: 'back' };
}
X.def('maracana', {
  amb: [0.32, 0.3],
  paint(S, sc) {
    FAN.length = 0;
    X.sky(S, sc, { far: 'none', horizon: 14, floor: 'grass' });
    sc.light({ x: 30, y: 16, z: 40, r: 120, i: 0.75, c: '#eef4ff', tint: 0.15 });                                  // 0 floodlights left
    sc.light({ x: 120, y: 16, z: 40, r: 120, i: 0.75, c: '#eef4ff', tint: 0.15 });                                 // 1 floodlights right
    sc.light({ x: 22, y: 30, z: 8, r: 26, i: 0.6, c: '#ffd060', fl: 'screen', tint: 0.5 });                         // 2 scoreboard
    sc.light({ x: 112, y: 66, z: 30, r: 84, i: 1, c: '#fff4c0', tint: 0.3, bake: false });                         // 3 goal! (kicked)
    LED.length = 0; [40, 110].forEach(x => LED.push(sc.lights[sc.light({ x, y: 59, z: 14, r: 44, i: 0.5, c: '#ffba48', tint: 0.55 })]));   // 4, 5 the touchline boards
    S.lay('wall');
    // the stands: two tiers of four rows, a concourse between, a dark gap under the roof. Every fan is one 3×4 block — a 2×2
    // head (hair over face) on three columns of shirt — packed shoulder to shoulder, so each row reads as a line of heads
    // over a solid band of colour. Concrete aisles part the sections, and each section wears one colour: yellow or green.
    // Back rows sit a little darker; the roof throws a hard band of shadow over the top rows, the concourse lip a thin one
    // over the first row below it (fanUp() in the anim shades a standing fan the same way)
    S.rect(3, 19, W - 6, 39, 'night', 1.5);
    let rowG = 0;
    STANDS.forEach(({ y0, aisles, cols }, tier) => {
      const edges = [3].concat(aisles.flatMap(a => [a, a + 2]), [W - 3]);
      for (let r = 0; r < 4; r++, rowG++) { const y = y0 + r * 4, back = (tier ? 0 : 1) + (3 - r) * 0.3, sk = 5.4 - back * 0.5;
        for (let s = 0; s < cols.length; s++) { const a = edges[s * 2], b = edges[s * 2 + 1], m = cols[s], tn = (m === 'gold' ? 7.6 : 7.8) - back;
          for (let x = a + 1 + (r % 2); x + 2 < b; x += 3) {
            const sd = x * 13 + y * 7 + tier * 999, hv = hh(sd, 2), hm = hv < 0.14 ? 'hair' : hv < 0.22 ? m : 'hair', ht = hv < 0.14 ? 4.5 : hv < 0.22 ? tn + 0.6 : 2.2, sk2 = sk + (hh(sd, 3) - 0.5) * 1.2;
            const f = [x, y, m, tn, sk2, hm, ht, s + tier * 7, rowG]; fanPaint(S, f, 0);
            const hid = (tier === 0 && x >= 8 && x + 2 <= 37 && y >= 23) || (tier === 1 && x >= 52 && x + 2 <= 97 && (y === 44 || y === 48));   // behind the scoreboard / the giant flag
            if (!hid) FAN.push(f); } }
        // the aisles: concrete steps, a lit tread on each row
        aisles.forEach(ax => { S.rect(ax, y, 2, 4, 'lav', 3.2); S.hl(ax, y, 2, 'lav', 5.4, { n: [0, -0.8] }); S.px(ax + 1, y + 1, 'lav', 2.2); }); } });
    S.rect(3, 37, W - 6, 3, 'lav', 2.5); S.hl(3, 37, W - 6, 'lav', 5); for (let x = 12; x < W - 8; x += 26) S.rect(x, 38, 6, 2, 'ink', 1);
    // hard shadow bands: under the roof lip over the top rows, and under the concourse lip over the lower tier's first row
    S.shadow([[3, 19], [W - 3, 19], [W - 3, SHADE_UP], [3, SHADE_UP]], 2); S.shadow([[3, 40], [W - 3, 40], [W - 3, 42], [3, 42]], 1.4);
    // the giant flag held up in the lower tier (its wave is animated)
    // the roof ring: a white lip with its lamp banks
    S.lay('back'); S.beg(); S.rect(3, 13, W - 6, 5, 'linen', 6); S.hl(3, 13, W - 6, 'linen', 9, { n: [0, -0.8] }); S.hl(3, 17, W - 6, 'linen', 3); for (let x = 6; x < W - 6; x += 7) S.line(x, 14, x + 4, 17, 'linen', 4.5); S.end({ none: 1 });
    [16, 45, 75, 105, 134].forEach(x => { S.beg(); S.rect(x - 5, 18, 11, 3, 'iron', 4); S.end(); for (let k = 0; k < 5; k++) { S.px(x - 4 + k * 2, 19, 'linen', 11, { e: 255 }); S.px(x - 4 + k * 2, 20, 'lamp', 10, { e: 255 }); } });
    // the scoreboard
    S.beg(); S.box(8, 23, 30, 12, 'iron', 4); S.rect(10, 25, 26, 8, 'ink', 1); S.end();
    // LED boards along the far touchline (their messages scroll in the anim)
    S.beg(); S.rect(3, 56, W - 6, 6, 'ink', 1); S.hl(3, 56, W - 6, 'iron', 6); S.hl(3, 61, W - 6, 'iron', 3); S.end();
    // the pitch: mowing stripes that run to a far vanishing point, white lines, the centre circle, the box, the goal line
    S.lay('wall'); for (let y = 62; y < H; y++) for (let x = 3; x < W - 3; x++) { const u = (x - 75) / (y + 60) * 90, band = Math.floor(u / 11 + 100) % 2; S.px(x, y, 'leaf', (band ? 6.5 : 5.2) + (y > 96 ? 0.6 : 0), { n: [0, -0.9] }); }
    S.noise(3, 62, W - 6, H - 62, 1, 4, 23, { only: 'leaf' });
    S.hl(3, 63, W - 6, 'linen', 8); S.vl(75, 63, H - 63, 'linen', 8); for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2; S.px(75 + Math.cos(a) * 17, 78 + Math.sin(a) * 6, 'linen', 8); } S.px(75, 78, 'linen', 9);
    for (let y = 63; y < H; y++) S.px(GOAL_X + Math.round((y - 63) * 0.12), y, 'linen', 8); S.hl(106, 69, GOAL_X - 105, 'linen', 7.5); S.hl(110, 93, GOAL_X - 106, 'linen', 7.5); S.line(106, 69, 110, 93, 'linen', 7.5);
    // the goal (mid): a white frame seen from the side, the net box behind it
    S.lay('mid'); S.beg(); S.rect(GOAL_X, 66, 2, FY - 66, 'linen', 9); S.hl(GOAL_X, 66, 13, 'linen', 8); S.line(GOAL_X + 12, 66, GOAL_X + 14, FY - 1, 'linen', 7); S.end();
    for (let y = 68; y < FY; y += 2) for (let x = GOAL_X + 2 + (y % 4 ? 1 : 0); x < GOAL_X + 13; x += 2) S.px(x, y, 'linen', 6);
    // floodlight beams: two cones of light baked into everything they cross (hard bands, no per-frame cost)
    // (the haze in the air is laid over the finished frame in post: two hard bands of pale light, cheap)
    BEAM.length = 0; const seen = new Set();
    [[16, 0, 0.6], [45, 1, 1], [75, 0, 0.6], [105, 1, 1], [134, 0, 0.6]].forEach(([bx, main, a0]) => { for (let y = 21; y <= (main ? 40 : 30); y++) { const hw = 4 + (y - 21) * 0.35; for (let x = Math.floor(bx - hw); x <= Math.ceil(bx + hw); x++) { const u = Math.abs(x + 0.5 - bx - 0.5) / hw, p = y * W + x; if (u >= 1 || x < 3 || x >= W - 3 || seen.has(p)) continue; seen.add(p);
      BEAM.push([p, a0 * (y < 23 ? (u < 0.45 ? 0.34 : 0.17) : y < 26 ? (u < 0.45 ? 0.17 : 0.06) : 0.05)]); } } });
    // their pools of light on the pitch (baked into the grass)
    const lit = new Set(); [[45, 20], [105, -20]].forEach(([bx, dx]) => { for (let y = 62; y < FY + 4; y++) { const kk = (y - 21) / (FY - 17), cx = bx + dx * kk, hw = 1.5 + 11 * kk; for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) { const u = Math.abs(x + 0.5 - cx) / hw; if (u >= 1 || x < 3 || x >= W - 3 || lit.has(y * W + x)) continue; lit.add(y * W + x);
      ['wall', 'mid'].forEach(k => { S.lay(k); S.tone(x, y, u < 0.4 ? 1.3 : 0.6); }); } } });
    // near the eye: the corner flag (left), a photographer kneeling with a long lens (right)
    S.lay('front'); S.beg(); S.vl(8, 72, 26, 'linen', 9); S.px(8, 71, 'gold', 9); S.end();
    S.beg(); S.ell(12, 98.5, 6, 1.2, 'leaf', 4); S.end();
    sc.emit({ k: 'glint', x: 75, y: 38, w: 140, h: 34, rate: 2.5, sp: 0, life: 0.22 });
    sc.emit({ k: 'dust', x: 46, y: 25, w: 10, h: 6, rate: 0.8, sp: 2, life: 2 }); sc.emit({ k: 'dust', x: 106, y: 25, w: 10, h: 6, rate: 0.8, sp: 2, life: 2 });
  },
  anim(D, t, rs) {
    const st = rs.st, C = 10, q = ((t % C) + C) % C, m = match(q), gol = q >= 6.35 && q < 9.4, gk = gol ? q - 6.35 : 9;
    rs.mul[3] = 0;
    if (q >= 6.35 && !st.gol) { st.gol = 1; rs.flash(3, 1.8); rs.burst('glint', GOAL_X + 6, 80, 6, { sp: 30, life: 0.5 }); rs.burst('leaf', 75, 26, 16, { w: 130, h: 8, sp: 6, life: 3.2, floor: 56 }); }
    if (q < 1) st.gol = 0;
    // the floodlights catch their breath at the goal — a dip, then a flare that settles back
    const flo = gk < 0.12 ? 1 - 0.4 * sm(gk / 0.12) : gk < 0.3 ? 0.6 + 1.2 * sm((gk - 0.12) / 0.18) : gk < 1.2 ? 1.8 - 0.8 * sm((gk - 0.3) / 0.9) : 1; rs.mul[0] = rs.mul[1] = flo;
    // fireworks: shells climb from behind the roof, burst high in the strip of sky
    const FWX = (n) => 22 + ((n * 47) % 106), FWY = (n) => 4.5 + (n % 3) * 1.5;
    if (gol && gk < 3.4) { D.lay('wall'); for (let n = 0; n < 7; n++) { const a = gk - n * 0.42; if (a < 0 || a >= 0.3) continue; const y = 17 + (FWY(n) - 17) * sm(a / 0.3), x = FWX(n) + Math.round(a * 6); for (let j = 0; j < 4; j++) D.px(x - Math.round(j * 0.5), y + j, j ? 'fire' : 'lamp', 11 - j * 2, { e: 255 }); }
      const n = Math.floor((gk - 0.3) / 0.42); if (n >= 0 && n < 7 && n !== st.fw) { st.fw = n; const x = FWX(n) + 2, y = FWY(n); rs.burst('spark', x, y, 9, { sp: 18, life: 0.8, floor: 60 }); rs.burst('glint', x, y, 10, { sp: 16, life: 0.7 }); rs.flash(3, 0.4); } } else st.fw = -1;
    // the boards' light takes the colour scrolling past it (gold and green after the goal)
    LED.forEach((L, i) => { const x = i ? 110 : 40, u = x + Math.floor(t * 14), seg = Math.floor(u / 18) % 4; L.rgb = gol ? LEDC[Math.floor(t * 8) % 2 ? 'gold' : 'leaf'] : LEDC[['lamp', 'tile', 'candy', 'screen'][seg]]; });
    // the crowd: a Mexican wave rolls round the stands — fan by fan, each block half rises, stands with its arms up, sits
    // back down (lower rows a beat behind, so the wave leans); at the goal it breaks and whole sections jump together
    D.lay('wall'); const all = gol && gk < 2.8, wx = ((t * 30) % 250) - 50;
    for (let i = 0; i < FAN.length; i++) { const f = FAN[i]; let lift;
      if (all) { const a = Math.sin(t * 12 + f[7] * 1.9 + (f[8] > 3 ? 0.7 : 0)); lift = a > 0.1 ? 2 : a > -0.5 ? 1 : 0; }
      else { const d = wx - f[0] - f[8] * 1.5; lift = d < 0 ? 0 : d < 3 ? 1 : d < 12 ? 2 : d < 16 ? 1 : 0; }
      if (lift) fanPaint(D, f, lift); }
    // the giant flag rolls in the lower tier: green field, yellow diamond, blue globe
    for (let x = 52; x < 98; x++) { const w = Math.round(Math.sin(x * 0.25 - t * 3) * 1.2 + Math.sin(x * 0.11 + t * 1.4) * 0.8), y0 = 42 + w, u = (x - 75) / 23; for (let y = 0; y < 12; y++) { const v = (y - 5.5) / 6, dia = Math.abs(u) + Math.abs(v) < 0.8, glob = u * u * 2.6 + v * v * 1.1 < 0.28;
      D.px(x, y0 + y, glob ? 'denim' : dia ? 'gold' : 'leaf', (glob ? 6 : dia ? 8 : 6) + (w > 0 ? -0.8 : w < 0 ? 0.8 : 0) + (glob && Math.abs(v - 0.1 + u * 0.3) < 0.12 ? 3 : 0)); }
      if (x % 8 === 3) { D.px(x, y0 - 1, 'skin', 5.8); D.px(x + 1, y0 - 1, 'skin', 4.6); } }   // the fans under it hold its top edge up
    // scoreboard: BRA 1 : 0, GOL! flashing after the goal, then 2 : 0
    D.lay('back'); const digits = { 0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], ':': ['...', '.#.', '...', '.#.', '...'] };
    const put = (ch, x, y, m2, tn) => (digits[ch] || []).forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '#') D.px(x + i, y + j, m2, tn, { e: 255 }); });
    if (gol && gk < 2.5 && Math.floor(gk * 4) % 2 === 0) { ['###.###.#..', '#...#.#.#..', '#.#.#.#.#..', '#.#.#.#.#..', '###.###.###'].forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') D.px(14 + i, 27 + j, 'gold', 10, { e: 255 }); }); D.vl(26, 27, 3, 'gold', 10, { e: 255 }); D.px(26, 31, 'gold', 10, { e: 255 }); }
    else { const sc2 = q >= 6.35 ? '2' : '1'; D.hl(12, 27, 3, 'leaf', 9, { e: 255 }); D.hl(12, 29, 3, 'gold', 9, { e: 255 }); D.hl(12, 31, 3, 'denim', 8, { e: 255 }); put(sc2, 18, 27, 'lamp', 10); put(':', 22, 27, 'lamp', 8); put('0', 26, 27, 'lamp', 10); D.px(31, 29, 'screen', 9, { e: 255 }); D.px(33, 29, 'screen', 9, { e: 255 }); }
    // LED boards: blocks of colour that slide along, green-yellow bursts after the goal
    for (let x = 4; x < W - 4; x++) { const u = x + Math.floor(t * 14), seg = Math.floor(u / 18) % 4, k = u % 18; const c = gol ? ((Math.floor(t * 8) + Math.floor(x / 6)) % 2 ? ['gold', 10] : ['leaf', 10]) : [['lamp', 9], ['tile', 9], ['candy', 9], ['screen', 9]][seg];
      if (k < 14 && (gol || (k % 4 !== 3))) { D.px(x, 58, c[0], c[1] - 1.5, { e: 255 }); D.px(x, 59, c[0], c[1], { e: 255 }); } }
    // the match
    D.lay('mid'); const ph = q * 9;
    // the second striker, a step behind, further up the pitch
    const tx2 = Math.max(44, m.sx - 13);
    { const w = Math.sin(ph * 0.9 + 1), jump = gol && gk < 1.4 ? Math.round(Math.abs(Math.sin(gk * 7)) * -4) : 0; worker(D, Math.round(tx2), FY - 6, BRA, gol ? { aF: 2.9, eF: 0, aB: 2.9, eB: 0, bob: jump, lF: w * 0.5, lB: -w * 0.5 } : { lF: w * 0.6, lB: -w * 0.6, kF: Math.max(0, -w) * 0.7, kB: Math.max(0, w) * 0.7, aF: -w * 0.5, eF: -0.6, aB: w * 0.5, eB: -0.6, bob: -Math.abs(Math.cos(ph * 0.9)) + 0.4, lean: 0.2 }, gol ? -1 : 1); }
    // keeper: sways on his line, dives at the shot, fetches the ball, then kicks it out
    const kd = m.ph === 'shot' ? (q - 6) / 0.35 : 0, down = gol && gk < 1.6;
    if (down) worker(D, m.kx + 2, FY, GK, { aF: 2.2, eF: 0, aB: 2.4, eB: 0, lF: 0.6, lB: -0.6, lean: 1.6, bob: 5 }, 1);
    else if (m.ph === 'kick' && q < 0.25) worker(D, m.kx, FY, GK, { aF: -0.6, eF: 0, aB: 0.6, eB: 0, lF: 1.6, kF: 0, lB: -0.2, lean: -0.4 }, -1);
    else worker(D, m.kx, FY, GK, { aF: 1.0 + kd * 1.6, eF: -0.4, aB: 1.0 + kd * 1.6, eB: -0.4, lF: 0.35, lB: -0.35, kB: 0.2, bob: 1 + Math.round(Math.sin(t * 3)), lean: kd * 0.8 }, -1);
    // defender: chases, lunges for a tackle, then stands with his hands on his head
    if (m.ph === 'drib') { const w = Math.sin(ph + 2), lunge = q > 4.3 && q < 4.9; worker(D, Math.round(m.dx), FY, OPP, lunge ? { lF: 1.4, kF: -0.2, lB: -0.6, kB: 0.4, aF: 1.2, eF: -0.4, aB: -0.4, lean: 0.8, bob: 2 } : { lF: w * 0.6, lB: -w * 0.6, kF: Math.max(0, -w) * 0.7, kB: Math.max(0, w) * 0.7, aF: -w * 0.5, eF: -0.6, aB: w * 0.5, eB: -0.6, bob: -Math.abs(Math.cos(ph)) + 0.4, lean: 0.2 }, 1); }
    else if (m.ph === 'kick' || m.ph === 'back') { const w = Math.sin(ph * 0.8); worker(D, Math.round(m.dx), FY, OPP, m.ph === 'back' ? { lF: w * 0.5, lB: -w * 0.5, aF: -w * 0.4, eF: -0.5, aB: w * 0.4, eB: -0.5 } : { aF: 0.2, eF: -0.3, aB: 0.2, eB: -0.3 }, m.ph === 'back' ? -1 : 1); }
    else worker(D, Math.round(m.dx), FY, OPP, { aF: 2.6, eF: -2.2, aB: 2.6, eB: -2.2, lean: -0.1 }, 1);
    // the number 10: runs with the ball, strikes it, then flies off with his arms spread
    if (m.ph === 'drib' || m.ph === 'kick') { const w = Math.sin(ph); worker(D, Math.round(m.sx), FY, BRA, { lF: w * 0.7, lB: -w * 0.7, kF: Math.max(0, -w) * 0.8, kB: Math.max(0, w) * 0.8, aF: -w * 0.5, eF: -0.7, aB: w * 0.5, eB: -0.7, bob: -Math.abs(Math.cos(ph)) + 0.4, lean: 0.3 }, m.sd); }
    else if (m.ph === 'shot') { const k = (q - 6) / 0.35; worker(D, m.sx, FY, BRA, { lF: -0.8 + k * 2.6, kF: k < 0.5 ? -1 : 0, lB: 0.1, kB: 0, aF: -0.6, eF: 0, aB: 1.2, eB: 0, lean: -0.3 }, 1); }
    else { const w = Math.sin(ph * 1.1); worker(D, Math.round(m.sx), FY, BRA, { lF: w * 0.7, lB: -w * 0.7, kF: Math.max(0, -w) * 0.8, kB: Math.max(0, w) * 0.8, aF: 1.57, eF: 0, aB: 1.57, eB: 0, bob: -Math.abs(Math.cos(ph * 1.1)) + 0.4, lean: 0.3 }, -1); }
    // the ball, and the net bulging as it goes in
    { const x = Math.round(m.bx), y = Math.round(m.by); D.beg(); D.rect(x - 1, y - 2, 3, 3, 'linen', 10); D.px(x - 1, y - 2, 'linen', 8); D.px(x, y - 1, 'ink', 2); D.px(x + 1, y, 'linen', 7); D.end(); }
    if (gol && gk < 1) { const b = Math.round(Math.sin(gk * Math.PI) * 3); for (let y = 70; y < FY; y += 2) D.px(GOAL_X + 13 + b * Math.sin((y - 70) / 20 * Math.PI), y, 'linen', 9); }
    // the corner flag streams, the photographer's flash pops at the goal
    D.lay('front'); for (let k = 0; k < 7; k++) { const w = Math.round(Math.sin(t * 6 - k * 0.8) * (k / 4)); D.px(9 + k, 72 + w, k % 2 ? 'red' : 'gold', 8); D.px(9 + k, 73 + w, k % 2 ? 'red' : 'gold', 6); D.px(9 + k, 74 + w, k % 2 ? 'red' : 'gold', 6); if (k < 5) D.px(9 + k, 75 + w, k % 2 ? 'red' : 'gold', 5); }
    const fl = gol && (Math.floor(gk * 3) % 3 === 0) && gk < 2.2;
    worker(D, 24, H - 4, PHOTO, { lF: 1.5, kF: -1.5, lB: 0.1, kB: 1.5, aF: 1.6, eF: -0.5, aB: 1.4, eB: -0.8, bob: 4, lean: 0.4 }, 1);
    D.beg(); D.rect(26, 87, 8, 4, 'ink', 2); D.hl(26, 87, 8, 'iron', 5); D.rect(34, 88, 5, 3, 'iron', 3); D.hl(34, 88, 5, 'iron', 6); D.rect(28, 85, 3, 2, 'iron', 4); D.end();
    D.rect(28, 84, 3, 1, 'linen', fl ? 11 : 6, { e: fl ? 255 : 0 }); if (fl && !st.pf) { st.pf = 1; rs.burst('glint', 29, 84, 2, { sp: 10, life: 0.3 }); } if (!fl) st.pf = 0;
  },
  // the floodlights' flare under each lamp bank: a pale wash over the finished frame, brighter while the lights flare
  post(out, t, s, o, I) { const c = [226, 234, 255], k = Math.min(1.6, 0.5 * ((I[0] || 0) + (I[1] || 0)) / 0.75); for (let i = 0; i < BEAM.length; i++) X.blendPx(out, BEAM[i][0], c, BEAM[i][1] * k); },
});

// ───────── 亚历山大图书馆 Library of Alexandria (magic · train, epic) ─────────
// scroll cubbies climb both walls to the vault, some scrolls glowing; through the great arched window the Pharos burns
// on its island and sweeps its beam over the sea. An armillary sphere turns its gold rings, books drift in the air like
// slow birds, a librarian climbs the ladder for a scroll, oil lamps sway. Every nine seconds the great book on the
// lectern riffles its pages: letters of light spiral up, a wave of glow runs through every cubby and the books swirl
const CELLS = [], LBEAM = [];   // glowing cubbies [x, y, delay]; window-light haze [pixel, alpha]
const SAGE = { skin: ['skin', 6], hair: ['linen', 7], top: ['linen', 8], bot: ['linen', 6], boot: ['leather', 4], beard: ['linen', 8], robe: 1 };
const CLERK = { skin: ['skin', 5], hair: ['hair', 3], top: ['teal', 6], bot: ['sand', 5], boot: ['leather', 3] };
function cubbies(S, x0, y0, w, h, sd, lamp) {
  S.beg(); S.rect(x0, y0, w, h, 'wood', 3.5); const CW = 7, CH = 7, COD = ['crimson', 'teal', 'gold', 'leaf', 'denim', 'brick'];
  // a rolled scroll seen end-on: muted paper (tone 4.5–6) with one highlight pixel and a dark core; glowing ones are arcane
  const end = (x, y, glow, tn) => { if (glow) { const o = { e: 3 }; S.rect(x, y, 3, 3, 'arcane', 6, o); S.px(x + 1, y, 'arcane', 9, o); S.px(x, y + 1, 'arcane', 9, o); S.px(x, y, 'arcane', 8, o); S.px(x + 2, y + 1, 'arcane', 8, o); S.px(x + 1, y + 2, 'arcane', 7, o); S.px(x + 1, y + 1, 'arcane', 11, o); return; }
    S.rect(x, y, 3, 3, 'paper', tn - 0.8); S.px(x, y, 'paper', Math.min(7, tn + 1)); S.px(x + 1, y + 1, 'paper', tn - 2.6); S.px(x + 2, y + 2, 'paper', tn - 1.8); };
  // (the case reads as one dark mass: the top two rows sit in shadow, the cells by the oil lamp catch a little light,
  // a third of the cells hold books, a lying scroll or nothing; the glowing cells are the accents)
  for (let cy = y0 + 1, r = 0; cy + CH - 1 <= y0 + h - 1; cy += CH, r++) for (let cx = x0 + 1, c = 0; cx + CW - 1 <= x0 + w - 1; cx += CW, c++) {
    S.rect(cx, cy, CW - 1, CH - 1, 'ink', 1); S.hl(cx, cy, CW - 1, 'wood', 2); const k = hh(sd + r * 17, c + 3), glow = hh(sd + r * 5, c * 11) < 0.13;
    const dk = (r < 2 ? -1.5 : 0) + (Math.hypot(cx + 3 - lamp[0], cy + 3 - lamp[1]) < 16 ? 0.5 : 0), tn = clamp(5 + hh(sd + c, r) * 1 + dk, 3.5, 6);
    if (glow) { end(cx, cy + 3, 1); end(cx + 3, cy + 3, 1); if (k > 0.45) end(cx + 1 + (k > 0.7 ? 1 : 0), cy, 1); CELLS.push([cx + 3, cy + 3]); continue; }
    if (k < 0.14) { for (let i = 0; i < 3; i++) { const bh = 4 + Math.floor(hh(sd + i, r * 9 + c) * 2), m = COD[Math.floor(hh(sd + i * 3, r + c * 5) * COD.length)]; S.rect(cx + i * 2, cy + CH - 1 - bh, 2, bh, m, 4 + dk); S.vl(cx + i * 2, cy + CH - 1 - bh, bh, m, 5 + dk); S.px(cx + i * 2, cy + CH - 3, 'gold', 5.5 + dk); } }
    else if (k < 0.24) { S.hcyl(cx, cy + 3, 6, 3, 'paper', tn - 0.5, { rim: 1.2 }); S.px(cx + 5, cy + 4, 'paper', tn + 1); S.px(cx + 2, cy + 5, 'red', 4.5); }
    else if (k < 0.36) { S.px(cx + 4, cy + 5, 'paper', 3); }
    else { end(cx + (k > 0.68 ? 0 : 1), cy + 3, 0, tn); if (k > 0.68) end(cx + 3, cy + 3, 0, tn - 0.5); }
  }
  for (let cy = y0 + CH; cy < y0 + h - 1; cy += CH) S.hl(x0, cy, w, 'wood', 5.5, { n: [0, -0.8] });
  for (let cx = x0 + CW; cx < x0 + w - 1; cx += CW) S.vl(cx, y0, h, 'wood', 4.2);
  S.box(x0 - 1, y0 - 3, w + 2, 3, 'wood', 6, { top: 1 }); S.box(x0 - 1, y0 + h, w + 2, 3, 'wood', 5); S.vl(x0, y0, h, 'wood', 6.5); S.vl(x0 + w - 1, y0, h, 'wood', 4);
  S.end();
}
// a gold armillary sphere: three rings turned in 3D, drawn back half first, the little Earth between
function armillary(D, cx, cy, R0, t, boost) {
  const spin = t * (0.5 + boost * 2.5), pts = [];
  const ring = (tilt, yaw, rr, m, tn) => { for (let k = 0; k < 56; k++) { const a = k / 56 * Math.PI * 2; let x = Math.cos(a) * rr, y = 0, z = Math.sin(a) * rr; const ct = Math.cos(tilt), st2 = Math.sin(tilt); [y, z] = [y * ct - z * st2, y * st2 + z * ct]; const cy2 = Math.cos(yaw), sy = Math.sin(yaw); [x, z] = [x * cy2 + z * sy, -x * sy + z * cy2]; pts.push([cx + x, cy + y, z, m, tn]); } };
  ring(Math.PI / 2, spin, R0, 'gold', 7); ring(0.42, spin * 0.7 + 1, R0 - 1, 'gold', 6.5); ring(1.2, -spin * 0.5, R0 - 2, 'brass', 7); ring(0, 0, R0, 'gold', 6);
  pts.forEach(p => { if (p[2] < 0) D.px(p[0], p[1], p[3], p[4] - 2.5); });
  D.beg(); D.ell(cx, cy, 3, 3, 'water', 6, { dome: 1 }); D.px(cx - 1, cy - 1, 'water', 9); D.px(cx + 1, cy, 'leaf', 6); D.px(cx, cy + 1, 'leaf', 5); D.end({ none: 1 });
  pts.forEach(p => { if (p[2] >= 0) D.px(p[0], p[1], p[3], p[4] + (p[2] > R0 * 0.6 ? 1.5 : 0)); });
}
function book(D, x, y, flap, cov) { x = Math.round(x); y = Math.round(y); const f = flap > 0 ? -1 : 1; D.beg(); D.rect(x - 1, y, 3, 2, 'paper', 9); D.px(x, y + 2, 'paper', 6); D.line(x - 1, y, x - 4, y + f, cov, 6); D.line(x + 1, y, x + 4, y + f, cov, 5); D.px(x - 4, y + f + 1, cov, 4); D.px(x + 4, y + f + 1, cov, 3); D.end({ none: 1 }); }
X.def('library', {
  amb: [0.26, 0.28],
  paint(S, sc) {
    CELLS.length = 0; LBEAM.length = 0;
    X.shell(S, sc, 'magic');
    sc.light({ x: 75, y: 30, z: 4, r: 90, i: 0.55, c: '#a8c8ff', tint: 0.3 });                                   // 1 night through the window
    sc.light({ x: 75, y: 66, z: 12, r: 60, i: 0.95, c: '#9a7cff', fl: 'pulse', amp: 0.15, sp: 1.6, tint: 0.55 });   // 2 the great book (glowing scrolls breathe with it)
    sc.light({ x: 49, y: 26, z: 26, r: 50, i: 0.7, c: '#ffb860', fl: 'candle', ph: 1, tint: 0.45 });             // 3 oil lamp left
    sc.light({ x: 101, y: 26, z: 26, r: 50, i: 0.7, c: '#ffb860', fl: 'candle', ph: 4, tint: 0.45 });            // 4 oil lamp right
    S.lay('wall');
    // the great arched window: night sky, the sea, the Pharos on its rock
    const inWin = (x, y) => { if (x < 57 || x > 93 || y < 13 || y > 60) return false; if (y >= 31) return true; const u = (x + 0.5 - 75) / 18.5, v = (y + 0.5 - 31) / 18.5; return u * u + v * v <= 1; };
    for (let y = 12; y <= 61; y++) for (let x = 56; x <= 94; x++) if (inWin(x, y)) S.px(x, y, 'night', 1.2 + (y - 12) / 48 * 3, { e: 255 });
    for (let i = 0; i < 16; i++) { const x = 58 + hh(i, 1) * 34, y = 14 + hh(i, 2) * 26; if (inWin(x, y)) S.px(x, y, 'linen', 7 + hh(i, 3) * 3, { e: 255 }); }
    for (let y = 50; y <= 60; y++) for (let x = 57; x <= 93; x++) if (inWin(x, y)) S.px(x, y, 'water', 2 + (y - 50) * 0.18 + ((x * 3 + y * 5) % 11 === 0 ? 2 : 0), { e: 255 });
    S.poly([[64, 51], [88, 51], [84, 47], [70, 46]], 'night', 1, { e: 255 }); S.hl(70, 46, 13, 'night', 2.5, { e: 255 });
    S.rect(71, 38, 9, 9, 'stone', 5.8, { e: 255 }); S.vl(71, 38, 9, 'stone', 7.5, { e: 255 }); S.vl(79, 38, 9, 'stone', 4.2, { e: 255 }); S.hl(70, 38, 11, 'stone', 8, { e: 255 });
    S.rect(72, 31, 7, 7, 'stone', 5.5, { e: 255 }); S.vl(72, 31, 7, 'stone', 7.5, { e: 255 }); S.vl(78, 31, 7, 'stone', 4, { e: 255 }); S.hl(71, 31, 9, 'stone', 8, { e: 255 });
    S.rect(73, 27, 5, 4, 'stone', 6, { e: 255 }); S.vl(73, 27, 4, 'stone', 8, { e: 255 }); S.hl(72, 27, 7, 'stone', 8, { e: 255 });
    [[74, 41], [76, 43], [74, 34], [76, 35]].forEach(([x, y]) => S.px(x, y, 'lamp', 8, { e: 255 }));
    S.rect(73, 23, 5, 4, 'fire', 9, { e: 255 }); S.hl(74, 22, 3, 'fire', 10, { e: 255 }); S.px(75, 21, 'fire', 11, { e: 255 }); S.vl(75, 17, 4, 'gold', 6, { e: 255 }); S.px(75, 16, 'gold', 9, { e: 255 });
    // window frame: stone jambs, arch voussoirs, two mullions, the sill
    S.lay('back'); S.beg(); for (let y = 10; y <= 63; y++) for (let x = 53; x <= 97; x++) { if (inWin(x, y)) continue; const near = inWin(x - 3, y) || inWin(x + 3, y) || inWin(x, y + 3) || inWin(x, y - 3) || inWin(x - 2, y - 2) || inWin(x + 2, y - 2); if (near) { const u = x - 75; S.px(x, y, 'magic', 7 + (u < 0 ? 0.6 : -0.8) + (((Math.atan2(y - 31, u) * 6) | 0) % 2 && y < 31 ? -1 : 0), { n: [u < 0 ? -0.4 : 0.4, y < 31 ? -0.4 : 0] }); } }
    S.box(66, 20, 2, 41, 'magic', 7); S.box(82, 20, 2, 41, 'magic', 7); S.hl(57, 48, 37, 'magic', 6.5); S.box(52, 61, 46, 3, 'magic', 8, { top: 1 }); S.end();
    // scroll cubbies up both walls
    cubbies(S, 7, 13, 43, 78, 11, [49, 22]); cubbies(S, 100, 13, 43, 78, 29, [101, 22]);
    // the ladder leaning on the right-hand cubbies
    S.beg(); S.line(108, FY - 1, 116, 30, 'wood', 6); S.line(113, FY - 1, 121, 30, 'wood', 5); for (let y = 34; y < FY; y += 5) { const k = (FY - y) / (FY - 30); S.hl(Math.round(108 + k * 8), y, 6, 'wood', 7); } S.end();
    // the lectern with the great book (pages animate)
    S.lay('mid'); S.beg(); S.poly([[69, 90], [83, 90], [80, 77], [72, 77]], 'wood', 5); S.hl(71, 81, 10, 'wood', 7); S.hl(70, 86, 12, 'wood', 3); S.rect(66, 88, 20, 2, 'wood', 4); S.poly([[61, 77], [91, 77], [88, 72], [64, 72]], 'wood', 6.5); S.hl(64, 72, 24, 'wood', 8); S.hl(61, 77, 30, 'wood', 3); S.end();
    S.beg(); S.poly([[62, 73], [76, 70], [76, 74], [63, 76]], 'crimson', 5); S.poly([[76, 70], [90, 73], [89, 76], [76, 74]], 'crimson', 4); S.end();
    // armillary sphere's pedestal (the rings turn in the anim)
    S.beg(); S.rect(39, 78, 5, 12, 'magic', 7); S.box(35, 87, 13, 3, 'magic', 8, { top: 1 }); S.poly([[36, 78], [47, 78], [44, 75], [39, 75]], 'gold', 6); S.vl(41, 62, 13, 'gold', 5); S.end();
    // near the eye: hanging oil lamps on chains, a date palm in a pot, a heap of books and scrolls
    S.lay('front'); [[49, 22], [101, 22]].forEach(([x, y]) => { S.beg(); for (let yy = 3; yy < y - 2; yy += 3) { S.px(x, yy, 'iron', 5); S.px(x, yy + 1, 'iron', 7); } S.poly([[x - 5, y], [x + 6, y], [x + 3, y + 4], [x - 2, y + 4]], 'brass', 6); S.hl(x - 5, y, 11, 'brass', 9); S.line(x + 5, y + 1, x + 8, y - 1, 'brass', 7); S.end(); });
    S.beg(); S.poly([[3, 90], [15, 90], [13, 80], [5, 80]], 'brick', 6); S.hl(4, 80, 11, 'brick', 8); S.hl(5, 84, 9, 'brick', 4); S.end();
    S.beg(); S.line(9, 80, 11, 52, 'wood', 5, { w: 2 }); for (let y = 56; y < 80; y += 3) S.hl(9 + Math.round((80 - y) / 14), y, 3, 'wood', 7); S.end();
    [[-1.9, 16], [-1.3, 16], [-0.6, 13], [0.1, 12], [0.7, 14], [-2.6, 14]].forEach(([a, L]) => { S.beg(); let x = 11, y = 52; for (let k = 0; k < L; k++) { const q = k / L, aa = a + (a < -1.5 ? -1 : 1) * q * 0.9; x += Math.cos(aa); y += Math.sin(aa) * 0.8 + q * 0.9; S.px(x, y, 'leaf', 6 - q * 2); if (k % 2) { S.px(x, y + 1, 'leaf', 4.5 - q); S.px(x + (Math.cos(aa) > 0 ? -1 : 1), y + 2, 'leaf', 4 - q); } } S.end(); });
    S.beg(); S.box(131, 85, 15, 5, 'crimson', 5); S.hl(131, 87, 15, 'paper', 8); S.box(133, 80, 11, 5, 'teal', 5); S.hl(133, 82, 11, 'paper', 8); S.box(130, 76, 12, 4, 'wood', 6); S.hl(130, 77, 12, 'paper', 8); S.end();
    S.beg(); S.hcyl(122, 86, 9, 4, 'paper', 7, { rim: 1.5 }); S.ell(122, 88, 1.5, 2, 'paper', 9); S.px(126, 86, 'red', 6); S.end();
    // moonlight from the window: a pale band falling to the floor (laid over the frame in post)
    const seen = new Set(); for (let y = 58; y < 101; y++) { const k = (y - 58) / 43, cx = 75 - 6 * k, hw = 15 + 5 * k; for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) { const u = Math.abs(x + 0.5 - cx) / hw, p = y * W + x; if (u < 1 && !seen.has(p)) { seen.add(p); LBEAM.push([p, (u < 0.55 ? 0.14 : 0.07) * (1 - k * 0.4)]); } } }
    sc.emit({ k: 'dust', x: 72, y: 76, w: 36, h: 24, rate: 1.5, sp: 2, life: 3.4 });
    sc.emit({ k: 'soul', x: 75, y: 70, w: 16, rate: 0.6, sp: 3, ang: 0, spread: 0.5, life: 2.6 });
  },
  anim(D, t, rs) {
    const st = rs.st, C = 9, q = ((t % C) + C) % C, riff = q > 5.6 && q < 7.4, rk = riff ? (q - 5.6) / 1.8 : 0, swirl = Math.PI * 2 * sm((q - 5.6) / 2.6);
    // the Pharos sweeps its beam across the window
    D.lay('wall'); if (Math.abs(Math.sin(t * 0.55)) < 0.2) { D.rect(73, 22, 5, 3, 'lamp', 11, { e: 255 }); D.px(72, 23, 'lamp', 10, { e: 255 }); D.px(78, 23, 'lamp', 10, { e: 255 }); }   // the lamp flares as the beam swings past
    // the armillary sphere
    D.lay('mid'); armillary(D, 41, 62, 11, t, riff ? Math.sin(rk * Math.PI) : 0);
    // the great book: pages riffle during the moment
    D.beg(); if (riff) { const n = Math.floor(q * 14) % 5; for (let k = 0; k < 3; k++) { const f = (n + k * 2) % 5 - 2, px2 = 75 + f * 2; D.line(76, 72, px2 + f * 2, 63 + Math.abs(f), 'paper', 9 - k); D.line(76, 72, px2 + (f > 0 ? 6 : -6), 65 + Math.abs(f), 'paper', 8 - k); } }
    D.poly([[63, 72], [76, 69], [76, 73], [64, 75]], 'paper', 8.5); D.poly([[76, 69], [89, 72], [88, 75], [76, 73]], 'paper', 7.5); D.vl(76, 69, 4, 'paper', 5); for (let k = 0; k < 3; k++) { D.line(65, 72 + k, 74, 70 + k, 'arcane', 7 - k * 0.5, { e: 255 }); D.line(78, 70 + k, 87, 72 + k, 'arcane', 6.5 - k * 0.5, { e: 255 }); } D.end({ none: 1 });
    if (riff && !st.r) { st.r = 1; rs.flash(2, 1.3); rs.burst('rune', 75, 68, 16, { sp: 22, ang: 0, spread: 1.4, life: 1.8 }); rs.burst('glint', 75, 68, 5, { sp: 20, life: 0.6 }); } if (q < 5) st.r = 0;
    if (riff && R() < 0.5) rs.burst('rune', 75 + Math.cos(t * 7) * 6, 64, 1, { sp: 10, ang: 0, spread: 0.6, life: 1.6 });
    // a wave of light runs out from the book through the glowing cubbies
    if (q > 5.7 && q < 7.8) { D.lay('back'); const wr = (q - 5.7) * 60; CELLS.forEach(([x, y]) => { const d = Math.hypot(x - 75, (y - 70) * 1.3), a = 1 - Math.abs(d - wr) / 16; if (a > 0) { D.rect(x - 3, y - 3, 6, 6, 'arcane', 2 + a * 3, { e: 255 }); [[x - 3, y], [x, y], [x - 2, y - 3]].forEach(([ex, ey]) => { D.rect(ex, ey, 3, 3, 'arcane', 6 + a * 3, { e: 255 }); D.px(ex + 1, ey + 1, 'arcane', 11, { e: 255 }); }); } }); }
    // the sage reads; at the moment he throws up his hands
    D.lay('mid'); const rw = sm((q - 5.5) / 0.3) * (1 - sm((q - 7.3) / 0.5)); worker(D, 60, FY, SAGE, lerpPose({ aF: 1.3 + Math.sin(t * 0.8) * 0.1, eF: -1.1, aB: 0.3, eB: -0.3, hx: 0.3, bob: Math.round(Math.sin(t * 1.2) * 0.5) }, { aF: 2.7, eF: 0.1, aB: 2.4, eB: 0.3, lean: -0.2 }, rw), 1);
    // the clerk climbs the ladder, pulls a scroll, comes down
    const lq = steps(t, 12), up = lq < 0.25 ? sm(lq / 0.25) : lq < 0.55 ? 1 : lq < 0.8 ? 1 - sm((lq - 0.55) / 0.25) : 0, fy = Math.round(FY - up * 34), fx = Math.round(108 + (FY - fy) / 60 * 8) + 2, climb = (lq < 0.25 || (lq > 0.55 && lq < 0.8)), cp = Math.sin(t * 8);
    const hold = lq > 0.4 && lq < 0.95;
    worker(D, fx, fy, CLERK, climb ? { lF: 0.9 + cp * 0.5, kF: -1.1, lB: 0.3 - cp * 0.5, kB: -0.6, aF: 2.4 - cp * 0.4, eF: 0.2, aB: 2.2 + cp * 0.4, eB: 0.2, lean: 0.3 } : up > 0.9 ? { lF: 0.5, kF: -0.6, lB: 0.2, kB: -0.3, aF: 1.9 + (lq > 0.3 && lq < 0.4 ? 0.5 : 0), eF: -0.2, aB: 2.3, eB: 0.2, lean: 0.3 } : { aF: 0.6, eF: -1.2, aB: 0.3, eB: -0.3 }, 1);
    if (hold) { const [hx, hy] = handAt(fx, fy, up > 0.9 ? { aF: 1.9, eF: -0.2, lean: 0.3 } : climb ? { aF: 2.4 - cp * 0.4, eF: 0.2, lean: 0.3 } : { aF: 0.6, eF: -1.2 }, 1); D.beg(); D.hcyl(Math.round(hx) - 2, Math.round(hy) - 1, 6, 2, 'arcane', 8, { e: 255 }); D.end({ none: 1 }); }
    // books drift through the air like slow birds, and swirl when the pages riffle
    [[0, 'crimson', 22], [1.6, 'teal', 18], [3.1, 'gold', 24], [4.5, 'leaf', 16]].forEach(([ph, cov, r], i) => { const a = t * 0.28 + ph + swirl, x = 75 + Math.cos(a) * (38 + i * 3), y = 36 + Math.sin(a) * 10 + Math.sin(t * 1.3 + ph) * 2; book(D, x, y, Math.sin(t * (riff ? 14 : 5) + ph * 3), cov); if (R() < 0.04) rs.burst('glint', x, y + 2, 1, { sp: 2, life: 0.4 }); });
    // oil lamp flames
    D.lay('front'); flame(D, 57, 22, 4, t, 0.4); flame(D, 109, 22, 4, t, 2.2);
  },
  post(out, t, s, o, I) {
    const c = [200, 214, 255], k = 0.85 + 0.15 * Math.sin(t * 0.7); for (let i = 0; i < LBEAM.length; i++) X.blendPx(out, LBEAM[i][0], c, LBEAM[i][1] * k);
    // the Pharos beam: a pale wedge that swings across the window's sky, widest when it points at us
    const ba = Math.sin(t * 0.55), dirx = ba < 0 ? -1 : 1, len = 5 + Math.abs(ba) * 24, bc = [255, 236, 170];
    for (let r = 2; r < len; r++) { const hw = 0.6 + r * 0.17 * (1 - Math.abs(ba) * 0.35), x = Math.round(75 + dirx * r), ym = 24 + r * 0.06; if (x < 57 || x > 93) continue;
      for (let y = Math.round(ym - hw); y <= Math.round(ym + hw); y++) { if (y < 14 || y > 49) continue; const u = (x + 0.5 - 75) / 18.5, v = (y + 0.5 - 31) / 18.5; if (y < 31 && u * u + v * v > 1) continue; if ((x === 66 || x === 67 || x === 82 || x === 83) && y >= 20) continue;
        const e2 = Math.abs(y - ym) / (hw + 0.5); X.blendPx(out, y * W + x, bc, (e2 < 0.4 ? 0.62 : 0.31) * (1 - r / len * 0.6)); } }
  },
});

// what each pixel room shows, in words (docs/effects.md §R is generated from M.ROOM_D)
const D_ = {
  meditation: '修行者在石台的蒲团上打坐，身后的莲花曼陀罗一明一暗、外圈符文慢慢转动；墙上挂轴写着一个大大的「心」字，下面画着一个墨圈；香炉升起一缕青烟，两边烛火摇晃，纸灯笼亮着，橘猫在地上睡觉、尾巴轻摆；每隔一阵一把红头木槌自己浮起来绕着颂钵转，钵声一圈圈荡开，曼陀罗一亮，修行者离开蒲团浮起来，光点向他聚拢',
  shaolin: '夕阳落进山谷，少林寺大殿两层屋檐、彩绘横梁，牌匾上金字写着「少林寺」，格子门里透出金光；红灯笼随风轻摆，香炉冒着青烟，松针不时飘落；四个穿深橙僧衣的武僧整齐地出拳、踢腿，师父在旁边看着；每隔一阵撞钟的僧人拉开木桩撞响大钟，钟声在钟亭边一圈圈荡开、满院一亮，屋脊上的白鸽飞走又飞回，武僧一齐跳起飞踢',
  colosseum: '月夜的斗兽场，弧形看台一层层坐满观众、一直升到拱廊和月光下的顶边，皇帝包厢挂着紫帘、立着鹰旗，铁栅门后有一双发光的眼睛；两边火盆熊熊燃烧；戴盔持盾的角斗士和肩戴护板、手拿三叉戟、身后拖着渔网的角斗士你来我往，每次交锋火花四溅、场中一亮；每隔一阵三叉戟被打飞、转着圈插进两人前面的空沙地，胜者高举短剑，火盆一齐腾起、看台一亮，全场观众跳起来举手欢呼，输的一方退了几步，弯腰握住杆子，把三叉戟从沙里拔出来',
  maracana: '夜场比赛：顶棚一圈泛光灯雪亮，看台被水泥台阶分成一区一区，黄衣区、绿衣区成片坐满球迷，一排排人头下面是整条的球衣颜色，顶棚在最上面两排投下一道阴影；人浪一块一块站起来、举起手臂再坐下，绕着看台滚过去；一面巨大的巴西国旗被下层的球迷举着起伏，闪光灯此起彼伏，场边广告屏滚动，映在场边的光跟着变色；10 号带球晃过后卫起脚射门，球网一鼓——进球！泛光灯先一暗再猛地一亮，烟花从顶棚后面升起、在夜空炸开，记分牌闪出 GOL、比分变成 2:0，人浪停下，各个看台一片一片跳起来欢呼，纸屑飘落，射手张开双臂跑向场边，门将随后把球开出去',
  library: '卷轴格从地面一直排到拱顶，有些卷轴发着紫光；大拱窗外，海岛上的法罗斯灯塔燃着火、光束来回扫过夜空，月光斜落到地上；金色浑天仪的圆环慢慢转动，几本书像鸟一样在空中飞，管理员爬梯子取卷轴，老学者在讲台前读书，油灯摇晃；每隔一阵讲台上的大书哗哗翻页，发光的字盘旋升起，一道光波扫过所有卷轴格，飞书打着转',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
