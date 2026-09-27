// ==== mc-mini-c-px.js ====
(function () {
// Pixel stages for the nine encounters of mc-mini-c.js (乐师 / 裁缝 / 许愿井 / 孩子 / 墓碑 / 医务室 / 镜子 / 血祭坛 / 货郎).
// One stage = one PXR def, 300×175 art px, one art px = 4 logical px (the battle cast's scale), ground at y 148.
// Everything that moves (bottles, needle, coin, blood…) is painted in the def's anim from the game state `o`
// (the mini's mg), so it is lit by the stage's own lights and can light the stage back (docs/design.md §7.5 · §10.1).
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ART = 4, AW = 300, AH = 175, AFY = 148, SX = 360, SY = 110;
const hash = (a, b, s) => { let n = (a * 374761393 + b * 668265263 + (s || 0) * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const A = M.MCPX = { ART, AW, AH, AFY, hash, rgb };
// art px → logical stage px
A.lx = (ax) => SX + ax * ART; A.ly = (ay) => SY + ay * ART;
A.ax = (lx) => (lx - SX) / ART; A.ay = (ly) => (ly - SY) / ART;
// draw a def at 4× onto the stage (art px ax, ay = its top-left); id keeps separate slots (particles, flashes) per use
A.draw = function (x, key, ax, ay, t, o, id) {
  const d = X.defs[key]; if (!d) return null; id = id || 'mc_' + key;
  X.pixels(key, t, o || {}, id); const s = X.slots[id]; if (!s || !s.cx) return s; s.cx.putImageData(s.img, 0, 0);
  const w = d.size ? d.size[0] : 150, h = d.size ? d.size[1] : 105, sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false;
  x.drawImage(s.cv, 0, 0, w, h, SX + ax * ART, SY + ay * ART, w * ART, h * ART); x.imageSmoothingEnabled = sm; return s;
};
A.slot = (key, id) => X.slots[id || 'mc_' + key];
// a pixel-cast character (pcd) standing on the stage: feet at art (ax, ay), 4× like the stage; st idle / move / hurt…; t seconds
A.cast = function (x, key, ax, ay, st, t, flip, tint) {
  const P = M.PCDG; if (!P || !P.has(key)) return null; const b = P.body(key), n = st === 'idle' ? b.nIdle : st === 'hurt' ? b.nHurt : 8, fi = Math.floor((t || 0) * 12) % Math.max(1, n);
  const c = P.bodyFrame(key, st || 'idle', fi, tint || '', ART); if (!c) return null; const sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false;
  x.save(); x.translate(Math.round(SX + ax * ART), Math.round(SY + ay * ART)); if (flip) x.scale(-1, 1); x.drawImage(c, -c.cx, -c.footY, c.width, c.height); x.restore(); x.imageSmoothingEnabled = sm; return c;
};
// a moving light from anim: lights the stage around it this frame (x, y art px; c hex; i 0…1.5)
A.glow = (rs, x, y, r, c, i, z) => { rs.dl.push({ x, y, z: z == null ? 14 : z, r, i, rgb: rgb(c), tint: 0.55 }); };
// the stage defs share this shape
A.def = (key, d) => X.def(key, Object.assign({ size: [AW, AH], fy: AFY, noFrame: 1 }, d));

// ═════════════════════ glass: six bottle shapes (half-width per row, bottom → top) ═════════════════════
// b: { body: rows of the vessel, neck: first neck row, lip: [row, hw], cap: 'cork' | 'lid' | 'bulb' }
const circleRows = (r, cy, from, to) => { const a = []; for (let y = from; y <= to; y++) { const d = y + 0.5 - cy; a.push(Math.max(1, Math.round(Math.sqrt(Math.max(0, r * r - d * d)) - 0.15))); } return a; };
const rep = (v, n) => Array(n).fill(v);
const BOTTLES = [
  { n: 'flask', rows: circleRows(9.4, 9, 0, 17).concat(rep(3, 8)), body: 17, lip: 4, cap: 'cork' },
  { n: 'square', rows: [6].concat(rep(7, 15), [6, 5, 4], rep(3, 5)), body: 17, lip: 4, cap: 'cork' },
  { n: 'vial', rows: [2, 3].concat(rep(4, 24), [3]), body: 25, lip: 4, cap: 'cork' },
  { n: 'gourd', rows: circleRows(7.8, 7.5, 0, 14).concat([4, 4], circleRows(5.2, 4, 0, 8), [2, 2, 2]), body: 25, lip: 3, cap: 'wax' },
  { n: 'jar', rows: [7].concat(rep(8, 15), [7], rep(9, 3)), body: 16, lip: 0, cap: 'lid' },
  { n: 'dropper', rows: [5].concat(rep(6, 12), [5, 4, 3], rep(4, 8), [3]), body: 13, lip: 0, cap: 'bulb' },
];
A.BOTTLES = BOTTLES;
// liquids by med (mc-mini-c.js MEDS order): 回血 经验 宝贝 物资 剧毒 部队攻击
const LIQ = [
  { m: 'screen', t: 7, c: '#6fd46a' }, { m: 'water', t: 7, c: '#4f8fff' }, { m: 'gold', t: 7, c: '#ffcf4a' },
  { m: 'bone', t: 8, c: '#f4efe0', pills: 1 }, { m: 'red', t: 6, c: '#e8434f' }, { m: 'arcane', t: 6, c: '#b86bff' }];
A.LIQ = LIQ;
// one bottle, bottom-centre (cx, yb). s: { shape, liq (index), dark, lvl 0…1, open 0…1 (cork off), done, glow 0…1, gc (glow colour),
// sy (squash), seed, crack 0…1 (blood crust flaking), sick (poison: glass cracked) }
A.bottle = function (D, cx, yb, s) {
  const B = BOTTLES[s.shape % BOTTLES.length], L = LIQ[s.liq] || LIQ[0], sy = s.sy || 1, rows = B.rows, n = Math.round(rows.length * sy), seed = s.seed || 0;
  const bodyN = Math.round(B.body * sy), lvl = s.done ? 0.1 : s.lvl == null ? 0.7 : s.lvl, liqTop = Math.round(bodyN * lvl), dim = s.done ? -1.6 : 0, glow = s.glow || 0;
  // blood crust: an irregular splotch round a centre on the body, a wet core, drips below; flakes off from the top as `crack` rises
  const bc = { x: Math.round((hash(1, 2, seed) - 0.5) * 3), k: Math.round(bodyN * (0.45 + hash(3, 4, seed) * 0.15)), r: bodyN * 0.52 + 3 };
  const crust = (dx, k) => { if (!s.dark) return 0; const a = Math.atan2(k - bc.k, dx - bc.x), d = Math.hypot((dx - bc.x) * 1.25, k - bc.k), R = bc.r * (0.72 + 0.28 * Math.sin(a * 3 + seed) + 0.18 * Math.sin(a * 7 + seed * 2)); if (d > R) return 0; if (s.crack && k > bc.k + bc.r - s.crack * bc.r * 2.4) return 0; return d < R * 0.42 ? 2 : 1; };
  D.beg();
  for (let k = 0; k < n; k++) {
    const r = Math.min(rows.length - 1, Math.floor(k / sy)), hw = rows[r], y = yb - 1 - k, isBody = r <= B.body, lipRow = !isBody && B.lip && k >= n - 2, w = lipRow ? B.lip : hw;
    for (let dx = -w; dx <= w; dx++) {
      const u = dx / (w + 0.5), x = cx + dx, edgeL = dx === -w, edgeR = dx === w, nx = u * 0.9;
      let m = 'glass', t, o = { n: [nx, 0] };
      if (!isBody && B.cap === 'bulb' && k >= n - 9) { m = 'crimson'; t = 5 + (dx < 0 ? 1.5 : -0.5) + (k === n - 1 ? 1 : 0) - (edgeR ? 1.5 : 0); }
      else if (!isBody && B.cap === 'lid' && k >= n - 3) { m = 'iron'; t = 6 + (k === n - 1 ? 2.5 : k === n - 3 ? -1.5 : 0) - (dx > 2 ? 1.2 : 0) + (dx < -4 ? 0.8 : 0); }
      else if (edgeL) t = 7 + dim; else if (edgeR) t = 4.2 + dim; else if (k <= 1 && isBody) t = 8 + dim - (k ? 1 : 0);   // rim and the thick glass foot
      else if (isBody && k <= liqTop && lvl > 0) {
        // liquid: a darker sediment band, a bright meniscus, a few bubbles; tablets for the pill bottle; it glows during the omen
        if (L.pills) { const tab = ((dx + 40 + ((k >> 1) & 1)) % 3 !== 2) && (k % 3 !== 2); m = tab ? 'bone' : 'glass'; t = tab ? 7.5 + (hash(dx, k, seed) > 0.6 ? 1.5 : 0) - (dx > 0 ? 1 : 0) : 2; }
        else { m = L.m; t = L.t - (k <= 2 ? 1.6 : 0) + (k === liqTop ? 2.6 : k === liqTop - 1 ? 0.8 : 0) - Math.abs(u) * 1.4 + (dx === w - 2 ? 0.8 : 0); if (hash(dx + 4, k * 3, seed) < 0.04 && k < liqTop - 1 && k > 2) t += 3.2; }
        t += dim; if (glow > 0 && !s.dark) { t += 2.2 * glow; o.e = 255; }
      } else t = 2.2 + dim;   // empty glass: dark, the back of the cabinet shows through
      if (m === 'glass' && dx === -w + 1 && k > 2 && k < n - 3 && k % 9 !== 4 && !lipRow) { t = 10.5 + dim; o = { n: [-0.6, -0.2] }; }   // long highlight
      if (m === 'glass' && dx === -w + 2 && isBody && k > bodyN * 0.7 && k < bodyN * 0.85) t = 11 + dim;                                // specular glint on the shoulder
      if ((m === 'glass' || !isBody) && dx === w - 1 && k > n * 0.3 && k < n * 0.6 && m !== 'crimson' && m !== 'iron') t = Math.max(t, 6 + dim);   // bounced light, right side
      const cr = isBody ? crust(dx, k) : 0; if (cr) { m = cr === 2 ? 'red' : 'crimson'; t = cr === 2 ? 4.6 + (hash(dx, k, seed + 5) > 0.82 ? 2.4 : 0) : 2.2 + hash(dx + 3, k, seed) * 1.8; o = { n: [nx * 0.5, 0] }; }
      D.px(x, y, m, t, o);
    }
  }
  // paper label: small, on the upper body, so the liquid shows below it (the chart on the wall is the key)
  if (B.body > 10) {
    const kr = Math.round(bodyN * 0.62), hwL = rows[Math.min(rows.length - 1, Math.round(kr / sy))], lw = Math.max(2, Math.round(hwL * 0.62)), ly = yb - 1 - kr - 3;
    for (let j = 0; j < 4; j++) for (let dx = -lw; dx <= lw; dx++) { if (crust(dx, kr + 3 - j)) continue; D.px(cx + dx, ly + j, 'paper', (j === 0 ? 9.2 : 8) + dim - (dx === lw ? 1.6 : 0) - (j === 3 ? 0.8 : 0), { n: [dx / (lw + 1) * 0.8, 0] }); }
    for (let dx = -lw + 2; dx <= lw - 1; dx++) if (hash(dx, 1, seed) < 0.7 && !crust(dx, kr + 2)) D.px(cx + dx, ly + 1, 'ink', 2.5);
    for (let dx = -lw + 1; dx <= lw - 2; dx++) if (hash(dx, 2, seed) < 0.5 && !crust(dx, kr + 1)) D.px(cx + dx, ly + 2, 'ink', 2.5);
    if (!crust(-lw, kr + 2)) { D.px(cx - lw, ly + 1, 'red', 7 + dim); D.px(cx - lw, ly + 2, 'red', 5.5 + dim); }
  }
  // poison: the glass cracks; a live bubble rises through the liquid
  if (s.sick) { let x = cx - 2, y = yb - Math.round(bodyN * 0.8); for (let k = 0; k < bodyN * 0.7; k++) { D.px(x, y, 'glass', 11, { e: 255 }); y++; if (hash(k, 3, seed) < 0.45) x += hash(k, 4, seed) < 0.5 ? -1 : 1; if (k === 5) for (let j = 1; j < 5; j++) D.px(x + j, y - j, 'glass', 10, { e: 255 }); } }
  if (s.t != null && lvl > 0.2 && !s.dark && !L.pills) { const ph = ((s.t * 0.7 + seed * 0.13) % 1.4), k = Math.floor(ph * liqTop / 1.4) + 2; if (ph < 1 && k < liqTop) D.px(cx + ((seed % 3) - 1), yb - 1 - k, L.m, L.t + 3.5, glow > 0 ? { e: 255 } : undefined); }
  // drips running down from the crust to the shelf
  if (s.dark) for (let i = 0; i < 4; i++) { const dx = bc.x + Math.round((hash(i, 7, seed) - 0.5) * rows[2] * 1.3), len = 3 + Math.floor(hash(i, 8, seed) * 9), k0 = Math.max(1, bc.k - Math.round(bc.r * 0.7)); for (let k = 0; k < len && k0 - k >= 0; k++) D.px(cx + dx, yb - 1 - k0 + k, 'crimson', 3.4 - k * 0.12 + (k === len - 1 ? 1 : 0)); }
  D.end({ lit: 2 });
  // stopper: a cork (wood, lit top) or a wax seal; it pops off and spins away as `open` rises
  const top = yb - n, op = s.open || 0, lift = Math.round(op * op * 22), spin = Math.floor(op * 6) % 2, sx = Math.round(op * 6);
  if (!s.done && op < 1 && (B.cap === 'cork' || B.cap === 'wax')) {
    const wax = B.cap === 'wax', cw = wax ? 3 : 2, ch = wax ? 3 : 4, m = wax ? 'red' : 'wood';
    D.beg();
    if (!spin) for (let j = 0; j < ch; j++) for (let dx = -cw; dx <= cw; dx++) D.px(cx + dx + sx, top - 1 - j - lift, m, (wax ? 5 : 6) + (j === ch - 1 ? 2 : 0) - (dx === cw ? 1.5 : 0) + (dx === -cw ? 0.8 : 0) + (!wax && (dx + j) % 3 === 0 ? -0.8 : 0));
    else for (let j = 0; j < cw * 2 + 1; j++) for (let dx = -1; dx <= 1; dx++) D.px(cx + dx + sx, top - 1 - j - lift, m, 6 + (dx === -1 ? 1 : 0));
    if (wax && !op) { D.px(cx - cw, top, m, 5); D.px(cx + cw, top + 1, m, 4); D.px(cx + cw, top + 2, m, 3.5); }
    D.end();
  }
  return { top: top - 4, mid: yb - Math.round(n * 0.4) };
};
// a tiny bottle icon for the chart on the wall (7 × 10)
A.miniBottle = function (S, x, y, li) {
  const L = LIQ[li], rows = [2, 2, 2, 2, 2, 1, 1]; S.beg();
  rows.forEach((hw, k) => { for (let dx = -hw; dx <= hw; dx++) { const yy = y + 7 - k, edge = Math.abs(dx) === hw; if (k >= 5) S.px(x + dx, yy, 'glass', dx < 0 ? 7 : 5); else if (edge) S.px(x + dx, yy, 'glass', dx < 0 ? 7.5 : 4); else if (k <= 3) S.px(x + dx, yy, L.m, L.t + (k === 3 ? 2 : 0) - (dx > 0 ? 1 : 0) + (L.pills && (dx + k) % 2 ? -2.5 : 0)); else S.px(x + dx, yy, 'glass', 3); } });
  S.px(x - 1, y + 3, 'glass', 10.5); S.rect(x - 1, y, 3, 1, 'wood', 7);
  S.end({ lit: 1 });
};

// ═════════════════════ 废弃医务室 · the clinic ═════════════════════
// slot centres of the six bottles on the middle shelf, their feet on y 114
const CLX = [90, 114, 138, 162, 186, 210], CLY = 114;
A.CLINIC = { x: CLX, y: CLY, chart: [246, 63, 48, 54], cups: [[38, 115], [44, 115], [50, 115]] };
A.def('mini_clinic', {
  amb: [0.26, 0.3],
  paint(S, sc) {
    sc.light({ x: 150, y: 33, z: 26, r: 190, i: 1.0, c: '#dff4ff', fl: 'buzz', ph: 3, tint: 0.1 });   // 0 the tube
    sc.light({ x: 254, y: 44, z: 6, r: 120, i: 0.6, c: '#7f9dff', tint: 0.55 });                     // 1 moonlight through the bars
    sc.light({ x: 57, y: 33, z: 6, r: 46, i: 0.45, c: '#5cff8a', fl: 'pulse', amp: 0.05, sp: 1.3, tint: 0.55 });   // 2 exit sign
    sc.shaft({ x: 254, y0: 58, y1: 150, w0: 11, w1: 26, dx: -46, i: 0.32, haze: 0.45, c: '#a8c0ff' });
    // ── wall: ceiling pipes, white tiles above, a green band, green tiles below, stains and cracks
    S.lay('wall');
    S.rect(0, 0, 300, 26, 'stone', 1.6); S.noise(0, 0, 300, 26, 1, 6, 2); for (let x = 0; x < 300; x += 50) S.rect(x, 0, 3, 26, 'stone', 1); S.hcyl(0, 17, 300, 5, 'iron', 4.2, { rim: 2 }); for (let x = 22; x < 300; x += 64) { S.box(x, 16, 5, 7, 'brass', 4); S.px(x + 1, 17, 'brass', 8); }
    S.hcyl(0, 23, 300, 3, 'copper', 3.3, { rim: 1.5 }); for (let x = 40; x < 300; x += 90) S.rect(x, 22, 2, 5, 'iron', 3);
    TX.tiles(S, 0, 26, 300, 71, 'linen', 6.2, { s: 8, gt: 3.4, v: 1 });
    S.box(0, 96, 300, 4, 'teal', 3.6, { top: 1 }); S.hl(0, 96, 300, 'teal', 6);
    TX.tiles(S, 0, 100, 300, 48, 'teal', 4.6, { s: 7, gt: 1.6, v: 1.2 });
    S.noise(0, 11, 300, 137, 1, 8, 3);
    // rust bleeding from the pipe, water streaks down the tiles, some cracked and missing tiles
    for (let i = 0; i < 26; i++) { const x = Math.floor(S.rand() * 300), len = 8 + Math.floor(S.rand() * 44), y0 = 26; for (let k = 0; k < len; k++) { S.tone(x, y0 + k, -1.2 - (k < 3 ? 0.8 : 0)); if (k % 9 === 0) S.tone(x + 1, y0 + k, -0.6); } }
    for (let i = 0; i < 9; i++) { const x = 8 + Math.floor(S.rand() * 280); for (let k = 0; k < 4 + i % 3; k++) S.px(x, 26 + k, 'copper', 3.6 - k * 0.3); for (let k = 0; k < 14 + i * 2; k++) S.tone(x, 30 + k, -1.4); }
    [[30, 40, 'v'], [212, 70, 'h'], [96, 104, 'h'], [276, 20, 'v'], [8, 120, 'h']].forEach(([x, y, d], i) => TX.crack(S, x, y, 10 + i * 3, i < 2 ? 'linen' : 'teal', i < 2 ? 6 : 4.6, d));
    [[184, 51], [279, 104], [24, 82]].forEach(([x, y]) => { S.rect(x, y, 7, 7, 'stone', 3); S.noise(x, y, 7, 7, 1, 2, 5); S.hl(x, y, 7, 'stone', 1.5); });
    S.ao(0, 26, 300, 12, 't', 2.2); S.ao(0, 124, 300, 24, 'b', 2.6);
    // barred window: stone reveal, night sky, a sliver of moon, dirty panes, three bars
    S.beg(); S.box(236, 27, 36, 34, 'stone', 5, { top: 1 }); S.rect(239, 30, 30, 28, 'night', 3); S.vgrad(239, 30, 30, 28, 'night', 4, 2);
    for (let i = 0; i < 7; i++) S.px(241 + i * 4, 32 + (i * 5) % 11, 'linen', 8, { e: 255 });
    S.ell(261, 37, 5, 5, 'bone', 10, { e: 255 }); S.ell(259, 36, 4.4, 4.6, 'night', 3); S.px(264, 35, 'bone', 9, { e: 255 });
    S.rect(239, 30, 30, 28, 'glass', 3); for (let k = 0; k < 30; k++) { const x = 239 + k, y = 30 + (k * 7) % 28; S.px(x, y, 'glass', 6); } S.ell(261, 37, 5, 5, 'bone', 9, { e: 255 }); S.ell(259, 36, 4.4, 4.6, 'glass', 3);
    [245, 253, 261].forEach(x => S.cyl(x, 30, 2, 28, 'iron', 5)); S.hcyl(239, 43, 30, 2, 'iron', 5); S.box(236, 58, 36, 3, 'stone', 6, { top: 1 }); S.end();
    // a bloody handprint and the smear it left going down to the floor
    const hand = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3]];
    hand.forEach(([a, b]) => S.px(232 + a, 104 + b, 'crimson', 4 + (a + b) % 2));
    [[0, -4, 3], [1, -5, 4], [2, -5, 4], [3, -4, 3], [5, -1, 2]].forEach(([a, b, l]) => { for (let k = 0; k < l; k++) S.px(232 + a, 104 + b + k, 'crimson', 4.5); });
    for (let k = 0; k < 18; k++) S.px(233 + (k % 5 === 4 ? 1 : 0), 108 + k, 'crimson', 3.5 - k * 0.06); for (let k = 0; k < 6; k++) S.px(235, 108 + k * 2, 'crimson', 3);
    // floor: dirty cream / grey-green checker, rows foreshortened, grime and a dragged blood trail
    const RB = [148, 151, 155, 160, 166, 173, 181];
    for (let y = 148; y < 175; y++) { const z = (y - 40) / 108, row = RB.findIndex((v, i) => y >= v && y < RB[i + 1]), edgeY = RB.includes(y);
      for (let x = 0; x < 300; x++) { const u = (x - 150) / (12 * z), fu = u - Math.floor(u), grout = edgeY || fu < 0.9 / (12 * z), c = (Math.floor(u) + row) & 1;
        if (grout) S.px(x, y, 'ink', 2); else S.px(x, y, c ? 'linen' : 'teal', (c ? 3.1 : 2.7) + (hash(Math.floor(u), row, 4) - 0.5) * 0.9 - (y - 148) * 0.03); } }
    S.noise(0, 148, 300, 27, 1, 5, 9); S.ao(0, 148, 300, 5, 't', 1.6); S.ao(0, 162, 300, 13, 'b', 1.2);
    // a dried pool under the handprint, then two drag marks toward the cabinet
    for (let y = -2; y <= 2; y++) for (let x = -7; x <= 7; x++) { const d = Math.hypot(x / 7, y / 2.2); if (d < 0.8 + 0.25 * hash(x, y, 3)) S.px(236 + x, 150 + y, d < 0.45 ? 'red' : 'crimson', d < 0.45 ? 3.6 : 2.6); }
    [0, 3].forEach(o => { for (let k = 0; k < 46; k++) if (hash(k, o, 9) < 0.78 - k * 0.012) S.px(229 - k * 1.2, 151 + o * 0.6 + k * 0.42, 'crimson', 2.5 + hash(k, o, 1) * 1.2); });
    // ── back: exit sign, the tube fixture on chains, the chart, the bed behind a stained curtain
    S.lay('back');
    S.beg(); S.box(47, 29, 21, 9, 'iron', 3); S.rect(48, 30, 19, 7, 'screen', 4.5, { e: 255 });
    const EX = ['EEE.X.X.III.TTT', 'E...X.X..I...T.', 'EE...X...I...T.', 'E...X.X..I...T.', 'EEE.X.X.III..T.']; S.spr(50, 31, EX, { E: ['screen', 10, { e: 255 }], X: ['screen', 10, { e: 255 }], I: ['screen', 10, { e: 255 }], T: ['screen', 10, { e: 255 }] }); S.end();
    for (let y = 26; y < 29; y += 2) { S.px(124, y, 'iron', 6); S.px(176, y, 'iron', 6); S.px(124, y + 1, 'iron', 4); S.px(176, y + 1, 'iron', 4); }
    S.beg(); S.box(116, 29, 68, 3, 'iron', 5, { top: 1 }); S.rect(118, 32, 64, 2, 'linen', 10, { e: 1 }); S.hl(118, 32, 64, 'linen', 11, { e: 1 }); S.px(117, 32, 'iron', 3); S.px(182, 32, 'iron', 3); S.end();
    // the chart: yellowed paper, a folded corner, a coffee ring, a rusty tack; six rows of little bottles
    const [cx0, cy0, cw, chh] = A.CLINIC.chart;
    S.beg(); S.rect(cx0, cy0, cw, chh, 'paper', 8); S.noise(cx0, cy0, cw, chh, 1, 4, 21); S.hl(cx0, cy0, cw, 'paper', 9.5); S.vl(cx0 + cw - 1, cy0, chh, 'paper', 6.5);
    for (let k = 0; k < 6; k++) { S.px(cx0 + cw - 1 - k, cy0 + k, 'linen', 5); for (let j = 0; j < 6 - k; j++) S.px(cx0 + cw - 1 - k - j - 1, cy0 + k, 'paper', 6.5); }
    for (let x = cx0; x < cx0 + cw; x += 3) S.px(x + (x % 2), cy0 + chh - 1, 'paper', 5);
    S.ell(cx0 + 36, cy0 + 40, 6, 5, 'sand', 6, { ring: 1 }); S.px(cx0 + 32, cy0 + 37, 'sand', 5);
    S.hl(cx0 + 3, cy0 + 4, cw - 10, 'red', 5.5); S.hl(cx0 + 3, cy0 + 5, cw - 10, 'red', 4);
    for (let r = 0; r < 6; r++) { const ry = cy0 + 7 + Math.round(r * 7.6); A.miniBottle(S, cx0 + 6, ry, r); if (r < 5) for (let x = cx0 + 3; x < cx0 + cw - 3; x += 2) S.px(x, ry + 8, 'paper', 6.2); }
    // a red skull stamp on the poison row
    const sk = ['.rrr.', 'rrrrr', 'r.r.r', 'rrrrr', '.r.r.']; S.spr(cx0 + cw - 8, cy0 + 8 + Math.round(4 * 7.6), sk, { r: ['red', 6.5] });
    S.end({ lit: 1 }); S.beg(); S.ell(cx0 + cw / 2, cy0 + 1, 1.6, 1.6, 'copper', 6, { dome: 1 }); S.end();
    // iron bed foot behind the curtain, then the curtain on its rail
    S.beg(); S.vl(4, 110, 38, 'iron', 6); S.vl(18, 110, 38, 'iron', 6); S.hl(4, 110, 15, 'iron', 7); S.hl(4, 124, 15, 'iron', 5); for (let x = 7; x < 18; x += 3) S.vl(x, 111, 13, 'iron', 5); S.box(0, 128, 30, 6, 'linen', 6, { top: 2 }); S.end();
    S.beg(); S.hcyl(0, 19, 38, 2, 'iron', 6); for (let x = 2; x < 31; x += 5) S.ell(x, 21, 1.4, 1.4, 'iron', 6, { ring: 1 });
    for (let x = 0; x < 31; x++) { const f = Math.sin(x * 0.85) * 0.5 + Math.sin(x * 0.31) * 0.5, bot = 140 + Math.round(Math.sin(x * 1.7) * 1.5 + (x > 24 ? (x - 24) * 0.5 : 0)); for (let y = 22; y < bot; y++) S.px(x, y, 'paper', 6.2 + f * 1.8 - (y > 120 ? 0.8 : 0), { n: [Math.cos(x * 0.85) * 0.5, 0] }); }
    S.noise(0, 22, 31, 120, 1, 5, 12); [[8, 70, 5], [22, 96, 4], [14, 118, 6], [5, 40, 3]].forEach(([x0, y0, r]) => { for (let y = -r * 2; y <= r * 2; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y * 0.55) / r; if (d < 0.75 + 0.3 * hash(x, y, 8)) S.tone(x0 + x, y0 + y, d > 0.7 ? -1.2 : -0.6); } });
    S.end();
    // ── mid: the trolley, the cabinet, the sink
    S.lay('mid');
    S.beg(); S.box(30, 116, 34, 3, 'iron', 7, { top: 1 }); S.hl(30, 115, 34, 'iron', 9); S.vl(32, 119, 27, 'iron', 6); S.vl(61, 119, 27, 'iron', 5); S.box(31, 134, 32, 2, 'iron', 6);
    S.ell(32, 146, 2, 2, 'ink', 2, { dome: 1 }); S.ell(61, 146, 2, 2, 'ink', 2, { dome: 1 }); S.end();
    S.beg(); S.ell(57, 114, 4, 1.4, 'iron', 8); S.hl(54, 113, 7, 'iron', 10); S.line(33, 114, 38, 113, 'iron', 10); S.px(33, 114, 'iron', 7); S.end();
    S.beg(); S.rect(34, 131, 10, 3, 'linen', 8); S.rect(46, 130, 8, 4, 'paper', 7); S.hl(46, 130, 8, 'red', 6); S.end();
    // cabinet: cornice with dentils and a crest, posts, back planks, three shelves, drawers, turned feet
    S.beg(); S.box(70, 41, 160, 5, 'wood', 5, { top: 2 }); for (let x = 72; x < 228; x += 4) S.rect(x, 46, 2, 2, 'wood', 4); S.hl(70, 48, 160, 'wood', 2.5);
    S.box(138, 31, 24, 10, 'wood', 5, { top: 1 }); S.ell(150, 36, 4, 4, 'brass', 7, { dome: 1 }); S.rect(149, 33, 2, 7, 'red', 7); S.rect(147, 35, 6, 2, 'red', 7); S.end();
    S.beg(); TX.vplanks(S, 78, 48, 144, 90, 'wood', 2.6, { pw: 9, knots: 1 }); S.ao(78, 48, 144, 26, 't', 2); S.ao(78, 77, 144, 10, 't', 1.8); S.ao(78, 117, 144, 6, 't', 1.5); S.end({ none: 1 });
    [[70, 1], [222, -1]].forEach(([x, s]) => { S.beg(); S.box(x, 46, 8, 94, 'wood', 5); S.vl(x + (s > 0 ? 6 : 1), 48, 90, 'wood', 3); S.vl(x + 3, 50, 86, 'wood', 6.5); S.end(); });
    S.beg(); S.box(78, 74, 144, 3, 'wood', 6, { top: 1 }); S.box(78, 114, 144, 3, 'wood', 6, { top: 1 }); S.hl(78, 77, 144, 'wood', 1.5); S.hl(78, 117, 144, 'wood', 1.5); S.end();
    // drawers: brass pulls and label holders; the left one is pulled out, bandage and pills spilling
    [[80, 0], [151, 1]].forEach(([x, i]) => { const out = i === 0 ? 2 : 0; S.beg(); if (out) S.rect(x, 118, 69, out, 'wood', 7, { n: [0, -0.8] }); S.box(x, 118 + out, 69, 18, 'wood', 4.4); S.rect(x + 29, 124 + out, 11, 3, 'brass', 6); S.hl(x + 29, 124 + out, 11, 'brass', 9); S.px(x + 29, 127 + out, 'brass', 3); S.px(x + 39, 127 + out, 'brass', 3);
      S.rect(x + 31, 129 + out, 7, 4, 'brass', 5); S.rect(x + 32, 130 + out, 5, 2, 'paper', 8); S.end(); });
    S.beg(); S.hcyl(92, 116, 9, 3, 'linen', 8); S.rect(100, 117, 14, 1, 'linen', 7); [[118, 117], [121, 116], [124, 117], [128, 117]].forEach(([x, y], i) => { S.px(x, y, 'bone', 8); S.px(x + 1, y, i % 2 ? 'red' : 'bone', 6); }); S.end();
    S.beg(); S.box(70, 138, 160, 4, 'wood', 4, { top: 1 }); [76, 150, 224].forEach(x => { S.ell(x, 145, 3, 3, 'wood', 5, { dome: 1 }); S.rect(x - 1, 142, 3, 2, 'wood', 4); }); S.end();
    // top shelf: the clutter an infirmary leaves behind (amber and blue bottles, cotton jar, poison tin, bandages, pill boxes,
    // mortar, a syringe, one bottle on its side), dust and cobwebs
    const small = (x, h, w, m, t) => { S.beg(); S.cyl(x, 74 - h, w, h, m, t, { rim: 2 }); S.vl(x + 1, 74 - h + 2, h - 4, m, t + 3.5); S.rect(x + Math.floor(w / 2) - 1, 74 - h - 2, 2, 2, m, t - 1); S.rect(x + Math.floor(w / 2) - 1, 74 - h - 3, 3, 1, 'wood', 6); S.end({ lit: 1 }); };
    small(83, 10, 5, 'copper', 3.5); small(89, 13, 5, 'copper', 3); small(138, 17, 6, 'water', 3.2); small(198, 9, 5, 'leaf', 4); small(204, 12, 5, 'leaf', 3.5);
    S.beg(); S.cyl(96, 62, 11, 12, 'glass', 3.5, { rim: 2 }); S.rect(96, 60, 11, 2, 'iron', 6); for (let i = 0; i < 12; i++) S.px(97 + (i * 7) % 9, 64 + (i * 5) % 8, 'linen', 9); S.vl(97, 63, 9, 'glass', 9); S.end();
    S.beg(); S.box(110, 65, 11, 9, 'iron', 4); S.spr(113, 67, ['.w.', 'www', 'w.w', '.w.'], { w: ['bone', 9] }); S.hl(110, 65, 11, 'iron', 7); S.end();
    S.beg(); [[124, 68], [130, 68], [127, 62]].forEach(([x, y]) => { S.ell(x + 3, y + 3, 3, 3, 'linen', 8); S.ell(x + 3, y + 3, 1.6, 1.6, 'linen', 6, { ring: 1 }); S.px(x + 3, y + 3, 'linen', 5); }); S.end();
    S.beg(); S.box(146, 64, 14, 10, 'paper', 7); S.hl(146, 68, 14, 'red', 6); S.box(148, 58, 11, 6, 'paper', 8); S.hl(148, 60, 11, 'water', 6); S.end();
    S.beg(); S.poly([[164, 66], [175, 66], [173, 74], [166, 74]], 'stone', 6); S.hl(164, 66, 12, 'stone', 8); S.line(172, 66, 177, 58, 'stone', 7, { w: 2 }); S.end();
    S.beg(); S.rect(180, 71, 12, 3, 'glass', 6); S.hl(180, 71, 12, 'glass', 10); S.rect(182, 72, 5, 1, 'red', 6); S.hl(192, 72, 4, 'iron', 8); S.vl(179, 70, 5, 'iron', 7); S.hl(196, 72, 3, 'iron', 10); S.end();
    S.beg(); S.hcyl(209, 69, 12, 5, 'water', 3, { rim: 2 }); S.hl(211, 70, 8, 'water', 7); S.rect(221, 70, 2, 3, 'wood', 6); S.end({ lit: 1 });
    for (let x = 80; x < 220; x++) if (hash(x, 74, 3) < 0.3) S.tone(x, 74, 1);
    const web = (x, y, fx, fy) => { for (let k = 0; k < 9; k++) { S.px(x + fx * k, y, 'linen', 5.5 - k * 0.3); S.px(x, y + fy * k, 'linen', 5.5 - k * 0.3); S.px(x + fx * k, y + fy * k * 0.9, 'linen', 5.5 - k * 0.3); } for (let r = 3; r < 9; r += 3) for (let k = 0; k <= r; k++) S.px(x + fx * k, y + fy * (r - k), 'linen', 4.5); };
    web(78, 48, 1, 1); web(221, 48, -1, 1); web(78, 77, 1, 1);
    // the stethoscope on a brass hook on the left post
    S.beg(); S.px(74, 58, 'brass', 8); S.px(74, 59, 'brass', 6); for (let k = 0; k < 30; k++) { const x = 74 + Math.round(Math.sin(k * 0.21) * 4 - (k > 18 ? (k - 18) * 0.4 : 0)), y = 60 + k; S.px(x, y, 'night', 4.5); S.px(x + 1, y, 'night', 3); } S.ell(69, 92, 2.5, 2.5, 'iron', 8, { dome: 1 }); S.px(68, 91, 'iron', 11); S.end();
    // sink: porcelain basin with a rust ring, the trap and pipe, a tap that drips
    S.beg(); S.box(250, 128, 40, 7, 'linen', 8.5, { top: 2 }); S.ell(270, 128, 17, 2, 'linen', 4); S.ell(270, 128, 12, 1.3, 'copper', 4.5, { ring: 1 }); S.rect(252, 135, 36, 1, 'linen', 5);
    S.cyl(266, 136, 5, 8, 'iron', 5, { rim: 2 }); S.hcyl(266, 142, 12, 3, 'iron', 5); S.cyl(276, 142, 3, 6, 'iron', 4); S.end();
    S.beg(); S.cyl(268, 119, 4, 5, 'iron', 7, { rim: 1.5 }); S.hcyl(268, 119, 6, 2, 'iron', 8); S.rect(272, 120, 2, 3, 'iron', 7); S.hl(265, 118, 7, 'brass', 7); S.end();
    sc.emit({ k: 'drip', x: 273, y: 123, rate: 0.7, sp: 0, life: 1.4, floor: 128 });
    sc.emit({ k: 'dust', x: 150, y: 70, w: 150, h: 70, rate: 3.2, sp: 2, life: 4.5 });
    // hinge plates where the left door used to hang
    S.lay('mid'); [58, 118].forEach(y => { S.beg(); S.rect(70, y, 3, 6, 'brass', 5); S.px(71, y + 1, 'brass', 8); S.px(71, y + 4, 'brass', 3); S.end(); });
    // ── front: the right glass door hangs open, its pane cracked (the left one is gone)
    S.lay('front');
    [[230, 246, 1]].forEach(([x0, x1, cr]) => { S.beg(); const w = x1 - x0; S.rect(x0, 46, w, 94, 'wood', 4.5); S.rect(x0 + 2, 49, w - 4, 88, 'glass', 3.2); S.vl(x0 + 3, 50, 86, 'glass', 8); S.line(x0 + 4, 60, x0 + w - 4, 76, 'glass', 9); S.line(x0 + 4, 64, x0 + w - 5, 78, 'glass', 6);
      S.rect(x0 + (cr ? 1 : w - 3), 88, 2, 8, 'brass', 7); if (cr) { [[238, 70, 1, 1], [238, 70, -1, 1], [238, 70, 1, -1], [238, 70, 0, 1]].forEach(([x, y, dx, dy]) => { for (let k = 0; k < 12; k++) S.px(x + dx * k + (k % 3 === 2 ? dx : 0), y + dy * k * 1.2, 'glass', 10); }); }
      S.end(); });
  },
  // o = the mini's state; without one (gallery, tests) a still life
  anim(D, t, rs, o) {
    o = o || {}; const bt = o.bt || DEMO_BT;
    D.lay('mid');
    // a moth circling the tube, its shadow crossing the tiles
    const ma = t * 2.3, mx = 150 + Math.cos(ma) * 26 + Math.sin(t * 5.1) * 3, my = 42 + Math.sin(ma * 1.3) * 6; D.px(mx, my, 'linen', 5); D.px(mx - 1, my - (Math.floor(t * 18) % 2), 'linen', 7); D.px(mx + 1, my - (Math.floor(t * 18 + 1) % 2), 'linen', 7);
    // the three measuring cups on the trolley: a used one lies on its side
    const used = o.opened || 0;
    A.CLINIC.cups.forEach(([x, y], i) => { D.beg(); if (i < 3 - used) { D.rect(x - 2, y - 5, 5, 5, 'glass', 4); D.vl(x - 2, y - 5, 5, 'glass', 8); D.hl(x - 2, y - 5, 5, 'glass', 9); D.rect(x - 1, y - 2, 3, 2, 'glass', 6); for (let k = 0; k < 3; k++) D.px(x + 2, y - 4 + k, 'glass', 9); }
      else { D.rect(x - 3, y - 3, 6, 3, 'glass', 4); D.hl(x - 3, y - 3, 6, 'glass', 8); D.vl(x + 2, y - 3, 3, 'glass', 9); } D.end({ lit: 1 }); });
    // the six bottles
    bt.forEach((b, i) => {
      if (!b) return; const lift = Math.round(b.lift || 0), glow = b.glow || 0, cx = CLX[i] + (b.dx || 0), yb = CLY - lift + (b.dy || 0);
      const r = A.bottle(D, cx, yb, { shape: i, liq: b.liq, dark: b.dark && !b.done && !(b.crack >= 1), lvl: b.lvl, open: b.open, done: b.done && !b.sick, glow, sy: b.sy, seed: i * 7 + 3, crack: b.crack, sick: b.sick, t });
      // glowing liquid lights the cabinet around it (a moving light in the liquid's or the omen's colour)
      if (glow > 0) { A.glow(rs, cx, r.mid, 34 + 26 * glow, b.gc || LIQ[b.liq].c, 0.5 + 0.9 * glow); if (hash(Math.floor(t * 20), i, 1) < 0.2 * glow) rs.burst('glint', cx + (Math.random() - 0.5) * 12, r.mid + (Math.random() - 0.5) * 10, 1, { sp: 8, life: 0.5 }); }
      if (lift > 0 && !b.done) { D.lay('wall'); for (let k = -4; k <= 4; k++) D.px(cx + k, CLY - 1, 'ink', 1); D.lay('mid'); }
    });
  },
});

// ═════════════════════ 流浪乐师 · under the bridge ═════════════════════
// the note highway is a violin neck in perspective: three strings = three lanes, the bridge = the hit line
const MU = { top: 36, hit: 131, lane: [108, 150, 192], topLane: [140, 150, 160], lamp: [74, 56], moon: 0, bulbs: 0, crowd: 0 };
MU.k = (y) => clamp((y - MU.top) / (MU.hit - MU.top), 0, 1.25);
MU.x = (l, y) => { const k = MU.k(y); return MU.topLane[l] + (MU.lane[l] - MU.topLane[l]) * k; };
A.MUS = MU;
const ARCH = { cx: 150, cy: 122, rx: 196, ry: 114 };
const archY = (x, grow) => ARCH.cy - (ARCH.ry + (grow || 0)) * Math.sqrt(Math.max(0, 1 - Math.pow((x - ARCH.cx) / (ARCH.rx + (grow || 0)), 2)));
X.PK.firefly = { g: -1, drag: 0.9, ramp: ['lamp', [11, 10, 10, 9, 10, 11, 9, 8]], glow: 1, wob: 12, light: [9, 0.35, '#ffd070'] };
X.PK.rosin = { g: 30, drag: 1.2, ramp: ['linen', [11, 10, 9, 8, 7]], wob: 4 };
X.PK.notefx = { g: -26, drag: 1.4, ramp: ['lamp', [11, 11, 10, 9, 8, 6]], glow: 1, trail: 1, light: [10, 0.45, '#ffe08a'] };
A.def('mini_musician', {
  amb: [0.22, 0.3],
  paint(S, sc) {
    sc.light({ x: 74, y: 57, z: 18, r: 150, i: 1.05, c: '#ffc070', fl: 'candle', tint: 0.5 });   // 0 gas lamp
    sc.light({ x: 150, y: 150, z: 22, r: 90, i: 0.5, c: '#ffd9a0', tint: 0, bake: false });    // 1 the violin catches the lamp (anim drives it)
    sc.light({ x: 150, y: 30, z: 26, r: 170, i: 0.9, c: '#ffcf70', tint: 0, bake: false });   // 2 string lights under the vault (fever)
    sc.light({ x: 248, y: 110, z: 20, r: 70, i: 0.8, c: '#b8c8ff', tint: 0, bake: false });   // 3 moonbeam on the leader (combo 12)
    sc.shaft({ x: 236, y0: 18, y1: 148, w0: 5, w1: 18, dx: 14, i: 0.45, haze: 0.7, c: '#c8d6ff', f: () => MU.moon });
    S.lay('wall');
    // the bridge above: spandrel bricks, a dark deck edge with a railing; the vault inside the arch, deeper and darker
    TX.bricks(S, 0, 0, 300, 148, 'brick', 3.6, { bw: 12, bh: 5, v: 1, chip: 0.15 });
    for (let x = 0; x < 300; x++) { const ay = archY(x); for (let y = Math.max(0, Math.floor(ay) + 7); y < 148; y++) S.tone(x, y, -1.1 - clamp((y - ay) / 60, 0, 1) * 0.9); }
    S.rect(0, 0, 300, 5, 'stone', 3); S.hl(0, 5, 300, 'stone', 5); for (let x = 3; x < 300; x += 9) { S.rect(x, 0, 2, 4, 'iron', 3); }
    // voussoirs: a ring of dressed stone blocks along the arch, each its own tone, mortar between
    for (let x = 0; x < 300; x++) { const a0 = archY(x), a1 = archY(x, 7); for (let y = Math.floor(a1); y <= Math.ceil(a0) + 6; y++) { if (y < 0 || y >= 148) continue; const dx = (x - ARCH.cx) / ARCH.rx, dy = (ARCH.cy - y) / ARCH.ry, r = Math.hypot(dx, dy); if (r < 1 || r > 1 + 7 / ARCH.ry + 0.01) continue;
      const ang = Math.atan2(dy, dx), blk = Math.floor(ang / 0.075), fr = ang / 0.075 - blk, key = blk === 0 || blk === 20; S.px(x, y, key ? 'mstone' : 'stone', fr < 0.12 ? 2.5 : (key ? 6.5 : 5 + hash(blk, 1, 2) * 1.6) - (r - 1) * 18 * 0.12, { n: [-dx * 0.4, -dy * 0.4] }); } }
    // moss along the ring, water streaks, a hole in the vault where the moon gets in
    for (let i = 0; i < 70; i++) { const x = Math.floor(S.rand() * 300), y = Math.floor(archY(x) + 7 + S.rand() * 3); S.px(x, y, 'moss', 4 + S.rand() * 3); if (S.rand() < 0.5) S.px(x, y + 1, 'moss', 3); }
    for (let i = 0; i < 18; i++) { const x = Math.floor(S.rand() * 300), y0 = Math.floor(archY(x) + 8); for (let k = 0; k < 10 + S.rand() * 40; k++) S.tone(x, y0 + k, -0.8); }
    S.ell(236, 17, 7, 3, 'ink', 0); S.ell(236, 17, 5, 2, 'night', 3); S.px(234, 16, 'bone', 9, { e: 255 });
    // quay: cobbles, then the canal at the front
    for (let y = 148; y < 160; y++) for (let x = 0; x < 300; x++) { const cw = 7 + ((y - 148) >> 2), cx = Math.floor((x + ((y >> 2) & 1) * 3) / cw), cy = (y - 148) >> 2, fx = (x + ((y >> 2) & 1) * 3) % cw, fy = (y - 148) % 4;
      S.px(x, y, 'stone', fx === 0 || fy === 3 ? 1.8 : 4.2 + hash(cx, cy, 5) * 1.6 + (fy === 0 ? 1 : 0)); }
    S.hl(0, 159, 300, 'stone', 6.5); S.hl(0, 160, 300, 'stone', 2.5);
    for (let y = 161; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'water', 2.4 + (y - 161) * 0.05);
    S.ao(0, 5, 300, 20, 't', 1.5); S.ao(0, 136, 300, 12, 'b', 1.8);
    S.lay('back');
    // right: crates, a barrel, a torn poster
    S.beg(); S.box(272, 124, 26, 24, 'wood', 4.5); S.rect(273, 135, 24, 1, 'wood', 2.5); S.line(273, 125, 296, 146, 'wood', 6); S.box(276, 104, 20, 20, 'wood', 5); S.line(277, 105, 294, 122, 'wood', 6.5); S.end();
    S.beg(); S.cyl(252, 122, 16, 26, 'wood', 4.5, { rim: 2.5 }); [125, 134, 143].forEach(y => S.hl(252, y, 16, 'iron', 5)); S.ell(260, 122, 8, 2, 'wood', 6); S.end();
    S.beg(); S.rect(214, 70, 18, 24, 'paper', 6.5); S.noise(214, 70, 18, 24, 1, 3, 4); S.rect(217, 74, 12, 9, 'crimson', 4); S.ell(223, 78, 3, 3, 'bone', 7); for (let x = 216; x < 230; x += 2) S.px(x, 88, 'ink', 2); S.poly([[226, 94], [232, 88], [232, 94]], 'brick', 3); S.end();
    // left: an old hand cart, and the lamp post (cast iron, a fluted base, the brass-and-glass lantern)
    S.beg(); S.box(4, 132, 24, 10, 'wood', 4); S.ell(10, 145, 4, 4, 'wood', 3.5, { ring: 1.5 }); S.line(28, 134, 40, 128, 'wood', 5); S.end();
    S.beg(); S.box(69, 142, 11, 6, 'iron', 4.5, { top: 1 }); S.cyl(71, 70, 7, 72, 'iron', 4.5, { rim: 2 }); for (let y = 76; y < 140; y += 6) S.hl(71, y, 7, 'iron', 3);
    S.box(68, 64, 13, 4, 'iron', 5, { top: 1 }); S.poly([[67, 63], [74, 44], [81, 63]], 'glass', 3); S.rect(70, 48, 9, 15, 'lamp', 6, { e: 1 });
    S.vl(69, 50, 13, 'brass', 7); S.vl(79, 50, 13, 'brass', 5); S.poly([[66, 47], [74, 40], [82, 47]], 'iron', 5); S.px(74, 38, 'iron', 7); S.end();
    // the violin case, open at the lamp's foot: leather shell, crimson velvet, a few coins and a page of music
    S.beg(); S.poly([[48, 147], [51, 141], [86, 141], [90, 147]], 'leather', 4); S.poly([[51, 146], [53, 142], [84, 142], [87, 146]], 'crimson', 4); S.poly([[50, 140], [53, 131], [84, 131], [88, 140]], 'leather', 5); S.poly([[53, 139], [55, 133], [82, 133], [85, 139]], 'crimson', 5.5);
    [[58, 144], [62, 145], [66, 143], [70, 145], [75, 144]].forEach(([x, y]) => { S.px(x, y, 'gold', 8); S.px(x + 1, y, 'gold', 6); }); S.rect(76, 142, 8, 3, 'paper', 8); S.hl(77, 143, 6, 'ink', 3); S.end();
    S.lay('mid');
    // the violin: scroll and pegs at the top, an ebony fingerboard in perspective, the maple bridge (hit line), the spruce top with f-holes
    const T0 = MU.top, HB = MU.hit;
    S.beg(); for (let y = T0; y <= HB; y++) { const k = MU.k(y), xl = Math.round(MU.x(0, y) - 7 - 7 * k), xr = Math.round(MU.x(2, y) + 7 + 7 * k);
      for (let x = xl; x <= xr; x++) { const u = (x - (xl + xr) / 2) / ((xr - xl) / 2 + 0.5), g = Math.floor((u + 1) * 23) , grain = hash(g, Math.floor(y / 6), 7) > 0.7 ? 0.7 : hash(g, 3, 2) > 0.85 ? -0.6 : 0;
        S.px(x, y, 'wood', 1.6 + k * 0.7 + grain + (x === xl ? 2.6 : x === xl + 1 ? 1.2 : x === xr ? -0.8 : 0) - Math.abs(u) * 0.5, { n: [x <= xl + 1 ? -0.7 : x === xr ? 0.7 : u * 0.2, -0.2] }); } }
    S.end({ lit: 1 });
    // a faint strip of each string's colour near the bridge (where the notes land)
    [['pink', 0], ['ice', 1], ['screen', 2]].forEach(([m, l]) => { for (let y = HB - 26; y < HB - 3; y++) { const x = Math.round(MU.x(l, y)), a = (y - (HB - 26)) / 23; for (let d = -2; d <= 2; d++) if (Math.abs(d) < 1 + a * 2 && X.bayer(x + d, y) < a * 0.55) S.px(x + d, y, m, 3 + a * 2); } });
    S.beg(); S.box(143, 25, 14, 11, 'wood', 5); S.ell(150, 22, 6, 5, 'wood', 6, { dome: 1 }); S.ell(150, 22, 3, 2.5, 'wood', 4, { ring: 1 }); S.px(150, 22, 'wood', 7);
    [[138, 27], [138, 32], [162, 27], [162, 32]].forEach(([x, y], i) => { S.rect(x - (i < 2 ? 3 : 0), y, 4, 2, 'night', 3); S.ell(x + (i < 2 ? -4 : 5), y + 1, 2, 1.6, 'night', 3.5, { dome: 1 }); }); S.end();
    S.beg(); for (let y = HB + 3; y < 175; y++) { const k = (y - HB) / 44, hw = 64 + Math.sin(Math.min(1, k * 1.4) * Math.PI / 2) * 22;
      for (let x = Math.round(150 - hw); x <= Math.round(150 + hw); x++) { const u = (x - 150) / hw, e = Math.abs(u), d = (1 - e) * hw;
        let tn = 7 - e * e * 3.4 + (((x * 7) >> 2) % 5 === 0 ? -0.7 : 0);                       // spruce grain: fine lines along the top
        if (d < 1.2) tn = 2.5; else if (d >= 2.5 && d < 3.5) tn -= 2.6;                         // the edge, then the purfling inlay
        const hl = Math.abs(u + 0.42 - (y - HB) * 0.004) < 0.05 + k * 0.02; if (hl && d > 4) tn += 2.6;   // a varnish highlight sweeping down the left
        S.px(x, y, 'copper', tn, { n: [u * 0.75, -0.4] }); } } S.end({ lit: 1 });
    const fhole = (x0, s) => { for (let k = 0; k < 22; k++) { const y = HB + 12 + k, x = x0 + Math.round(Math.sin(k / 22 * Math.PI * 2) * 3 * s); S.px(x, y, 'ink', 0); if (k > 4 && k < 18) S.px(x + s, y, 'ink', 1); } S.ell(x0 + 2 * s, HB + 12, 1.5, 1.5, 'ink', 0); S.ell(x0 - 2 * s, HB + 33, 1.5, 1.5, 'ink', 0); };
    fhole(116, 1); fhole(184, -1);
    // strings run on over the body to the tailpiece
    [0, 1, 2].forEach(l => S.line(MU.lane[l], HB + 3, 146 + l * 4, 158, 'iron', 7.5));
    S.beg(); S.poly([[139, 157], [161, 157], [157, 175], [143, 175]], 'night', 2.2); S.hl(139, 157, 22, 'night', 4); [0, 1, 2].forEach(i => { S.rect(145 + i * 4, 160, 2, 3, 'iron', 8); S.px(145 + i * 4, 159, 'iron', 10); }); S.end();
    S.beg(); S.poly([[96, HB + 3], [102, HB - 3], [198, HB - 3], [204, HB + 3]], 'sand', 7.5); S.hl(102, HB - 3, 96, 'sand', 9.5); S.rect(118, HB + 1, 64, 2, 'sand', 5); S.hl(96, HB + 3, 108, 'sand', 4);
    for (let x = 104; x < 196; x += 3) S.px(x, HB - 1, 'sand', 6.5); S.ell(126, HB + 1, 3, 1.4, 'sand', 3.5); S.ell(174, HB + 1, 3, 1.4, 'sand', 3.5); S.end();
  },
  // o = mg: notes, song time, lane flashes, combo; without it a still frame
  anim(D, t, rs, o) {
    if (!o || !o.notes) o = DEMO_MU; const T0 = MU.top, HB = MU.hit, song = o.song == null ? 2.2 : o.song, beat = o.beat == null ? (song * 132 / 60) : o.beat, bp = beat - Math.floor(beat), pulse = Math.max(0, 1 - bp * 4);
    const layers = o.layers == null ? 3 : o.layers;
    // lights: the lamp dims a step per miss streak, the string lights and the moon come with the combo
    rs.mul[0] = (o.lampK == null ? 1 : o.lampK) * (1 + 0.06 * pulse); MU.bulbs = layers >= 2 ? 1 : 0; rs.mul[2] = layers >= 2 ? 0.8 + 0.25 * pulse : 0; MU.moon = layers >= 4 ? 1 : 0; rs.mul[3] = MU.moon; rs.mul[1] = 0.6 + 0.8 * pulse;
    D.lay('back');
    // string lights: sixteen bulbs on a wire along the vault, lit one by one when the band gets going
    const nB = 16, lit = Math.round(nB * clamp((o.bulbsK == null ? (layers >= 2 ? 1 : 0) : o.bulbsK), 0, 1));
    for (let i = 0; i <= 60; i++) { const x = 20 + i * 4.3, y = archY(x) + 11 + Math.sin(i / 60 * Math.PI * 5) * 2.5; D.px(x, y, 'ink', 2); }
    for (let i = 0; i < nB; i++) { const x = 26 + i * 16.5, y = archY(x) + 13 + Math.sin((x - 20) / 258 * Math.PI * 5) * 2.5, on = i < lit, tw = on && ((i + Math.floor(beat)) % 4 === 0); D.px(x, y - 1, 'iron', 4); D.rect(x - 1, y, 2, 2, 'lamp', on ? (tw ? 11 : 9.5) : 3, on ? { e: 255 } : undefined); }
    // ghost listeners: faceless, dithered, swaying on the beat (combo 8+)
    const crowd = clamp(o.crowd == null ? (layers >= 3 ? 1 : 0) : o.crowd, 0, 1);
    if (crowd > 0) [[16, 1], [226, -1], [290, -1]].forEach(([x0, f], i) => { const sw = Math.round(Math.sin(beat * Math.PI + i) * 1.2), h = 30 + i * 2;
      for (let y = 0; y < h; y++) { const hw = y < 7 ? 3 - Math.abs(y - 3.5) * 0.3 : y < 9 ? 1.5 : 4 + y * 0.08; for (let x = -Math.round(hw); x <= Math.round(hw); x++) if (((x + y) & 1) === 0 && X.bayer(x + x0, y) < crowd) D.px(x0 + x + (y < 12 ? sw : 0), 148 - h + y, 'lav', y < 7 ? 7 : 5 - y * 0.03, { e: 255 }); } });
    D.lay('wall');
    // canal: the lamp's reflection, broken by ripples that jump on every beat
    for (let y = 161; y < 175; y++) { const amp = 1 + pulse * 2 + (y - 161) * 0.12; for (let x = 0; x < 300; x++) { const w = Math.sin(x * 0.35 + t * 2.2 + y * 1.3) + Math.sin(x * 0.11 - t * 1.4); let tn = 2.4 + (y - 161) * 0.05 + (w > 1.2 ? 1 : 0);
      const rx = Math.abs(x - 74 - Math.sin(y * 1.7 + t * 3) * amp); if (rx < 5 - (y - 161) * 0.1 && (w > -0.8)) { D.px(x, y, 'lamp', 8 - rx * 0.8 - (y - 161) * 0.15, { e: 255 }); continue; }
      if (MU.bulbs && y < 168 && (x % 16 === 10) && w > 0) { D.px(x, y, 'lamp', 6, { e: 255 }); continue; } if (tn > 2.9) D.px(x, y, 'water', tn); } }
    D.lay('mid');
    // beat lines (brass frets) scroll with the notes: every beat thin, every bar bright
    const SP = (HB - T0) / 1.5, secB = 60 / 132;
    for (let b = Math.floor(beat) - 1; b < beat + 5; b++) { const dt = (b - beat) * secB, y = Math.round(HB - dt * SP); if (y < T0 + 2 || y > HB) continue; const bar = b % 4 === 0, xl = Math.round(MU.x(0, y) - 6 - 7 * MU.k(y)), xr = Math.round(MU.x(2, y) + 6 + 7 * MU.k(y));
      for (let x = xl; x <= xr; x++) D.px(x, y, 'brass', bar ? 8.5 : 6 - (1 - MU.k(y)) * 2, bar ? { e: 255 } : undefined); }
    // strings: steel, lit; a hit makes one vibrate (amplitude by grade) and glow in its lane colour
    const LC = [['pink', '#ff6bd6'], ['ice', '#bff7f0'], ['screen', '#b6f28a']];
    for (let l = 0; l < 3; l++) { const f = (o.laneF || [0, 0, 0])[l], amp = f * (o.laneG ? o.laneG[l] : 2);
      for (let y = T0; y <= HB + 1; y++) { const k = MU.k(y), wob = amp ? Math.round(Math.sin(y * 0.9 - t * 60) * amp * k) : 0, x = Math.round(MU.x(l, y)) + wob; D.px(x, y, f > 0.05 ? LC[l][0] : 'iron', f > 0.05 ? 9 + f * 2 : 7.5 + k * 2, f > 0.3 ? { e: 255 } : undefined); }
      if (f > 0.05) A.glow(rs, MU.lane[l], HB - 6, 30 + 20 * f, LC[l][1], 0.8 * f);
      // the bridge under this string: a notch that glows on the beat, flashes on a hit, goes dark red on a stray press
      const bad = (o.laneBad || [0, 0, 0])[l]; D.rect(MU.lane[l] - 3, HB - 3, 7, 2, bad > 0.05 ? 'red' : f > 0.05 ? LC[l][0] : 'sand', bad > 0.05 ? 6 : f > 0.05 ? 10 : 8 + pulse * 2, (f > 0.05 || bad > 0.05 || pulse > 0.5) ? { e: 255 } : undefined); }
    // notes: beads of light sliding down the strings, ♪-shaped once they are close, growing with perspective
    (o.notes || []).forEach(n => { if (n.st > 0) return; const dt = n.t - song; if (dt > 1.5 || dt < -0.5) return; const y = HB - dt * SP; if (y < T0) return; const k = MU.k(y), x = Math.round(MU.x(n.l, y)), c = LC[n.l][0], gone = n.st === -1;
      const sz = Math.max(1, Math.round(1 + k * 4)), yy = Math.round(y);
      if (gone) { for (let i = 0; i < 5; i++) D.px(x - 2 + i + ((i * 7) % 3 - 1), yy + Math.round((song - n.t) * 60) + (i % 2) * 2, 'stone', 5); return; }
      D.beg(); D.ell(x, yy, sz, Math.max(1, sz - 1), c, 9, { e: 255 }); D.px(x - Math.round(sz / 2), yy - Math.round(sz / 2), c, 11, { e: 255 });
      if (sz >= 3) { D.vl(x + sz, yy - sz * 2 - 1, sz * 2, c, 8, { e: 255 }); D.px(x + sz + 1, yy - sz * 2 - 1, c, 8, { e: 255 }); D.px(x + sz + 2, yy - sz * 2, c, 7, { e: 255 }); }
      D.end({ none: 1 }); if (k > 0.6) A.glow(rs, x, yy, 16 + 10 * k, LC[n.l][1], 0.35 * k); });
    // idle life: fireflies drift in once the band warms up
    if (layers >= 1 && Math.random() < 0.05 + 0.05 * layers) rs.burst('firefly', 10 + Math.random() * 280, 70 + Math.random() * 60, 1, { sp: 6, life: 3.5 });
  },
});
const DEMO_MU = { song: 2.2, layers: 3, laneF: [0, 0.8, 0], laneG: [0, 3, 0], notes: [{ t: 2.5, l: 0 }, { t: 2.95, l: 2 }, { t: 3.4, l: 1 }, { t: 3.4, l: 2 }, { t: 3.85, l: 0 }, { t: 1.95, l: 1, st: -1 }] };


// ───────── shared scenery ─────────
// night sky in hard bands with stars; a moon with craters and a two-step halo
A.sky = function (S, y0, y1, m, t0, t1, stars, seed) { for (let y = y0; y < y1; y++) S.rect(0, y, 300, 1, m, t0 + (t1 - t0) * (y - y0) / Math.max(1, y1 - y0 - 1)); for (let i = 0; i < (stars || 0); i++) { const x = Math.floor(hash(i, 1, seed) * 300), y = y0 + Math.floor(hash(i, 2, seed) * (y1 - y0) * 0.8); S.px(x, y, 'linen', 7 + hash(i, 3, seed) * 4, { e: 255 }); } };
A.moon = function (S, x, y, r, m) { m = m || 'bone'; for (let k = 3; k >= 1; k--) S.ell(x, y, r + k * 3, r + k * 3, 'night', 3 + (3 - k) * 0.8, { e: 255 }); S.ell(x, y, r, r, m, 9.5, { e: 255 }); [[-0.3, -0.2, 0.25], [0.35, 0.25, 0.18], [-0.1, 0.45, 0.14], [0.2, -0.45, 0.12]].forEach(([a, b, c]) => S.ell(x + a * r, y + b * r, c * r, c * r, m, 8, { e: 255 })); for (let k = 0; k < r; k++) S.px(x + r - 1 - Math.round(k * 0.2), y - r / 2 + k, m, 8.5, { e: 255 }); };
X.PK.snow = { g: 7, drag: 0.6, ramp: ['ice', [11, 11, 10, 10, 9, 9]], wob: 9 };
X.PK.dirt = { g: 160, drag: 0.3, ramp: ['earth', [9, 8, 7, 6, 5, 4]], bounce: 0.2, sz: 2 };
X.PK.blood = { g: 140, drag: 0.1, ramp: ['red', [9, 8, 7, 6, 5, 4]], splash: 0 };
X.PK.shard = { g: 120, drag: 0.4, ramp: ['glass', [11, 10, 9, 8, 7, 6]], glow: 1, bounce: 0.4 };
X.PK.thread = { g: 20, drag: 1.6, ramp: ['arcane', [11, 10, 9, 8, 7, 6]], glow: 1, wob: 8 };
X.PK.water = { g: 150, drag: 0.2, ramp: ['water', [11, 11, 10, 9, 8]], glow: 1 };

// ═════════════════════ 裁缝老太 · the attic sewing room ═════════════════════
// the leader's shadow is cast on the back wall by the oil lamp; the seam runs over the pattern pinned in it
const GR = { seam: (u) => ({ x: 150 - 74 * Math.cos(Math.PI * u), y: 116 - 72 * Math.sin(Math.PI * u) }), lamp: [104, 112] };
A.GRANNY = GR;
A.def('mini_granny', {
  amb: [0.2, 0.28],
  paint(S, sc) {
    sc.light({ x: 104, y: 104, z: 16, r: 170, i: 1.15, c: '#ffb860', fl: 'candle', tint: 0.5 });   // 0 oil lamp on the work table
    sc.light({ x: 262, y: 36, z: 8, r: 100, i: 0.5, c: '#8aa4ff', tint: 0.5 });                    // 1 moon through the round window
    sc.shaft({ x: 262, y0: 44, y1: 150, w0: 7, w1: 16, dx: -22, i: 0.3, haze: 0.5, c: '#a8b8ff' });
    S.lay('wall');
    TX.vplanks(S, 0, 0, 300, 148, 'wood', 3.4, { pw: 7, knots: 1 }); S.noise(0, 0, 300, 148, 1, 6, 4);
    // the roof slopes in on both sides: rafters, purlins, a tie beam
    for (let x = 0; x < 300; x++) { const yl = 44 - x * 0.5, yr = 44 - (300 - x) * 0.5; for (let y = 0; y < Math.max(yl, yr); y++) S.px(x, y, 'wood', 2 + ((x + y) % 9 === 0 ? 0.8 : 0)); }
    [[0, 44, 88, 0], [300, 44, 212, 0]].forEach(([x0, y0, x1, y1]) => { S.beg(); S.line(x0, y0, x1, y1, 'wood', 5.5, { w: 3 }); S.end(); });
    S.beg(); S.box(0, 12, 300, 5, 'wood', 4.8, { top: 1 }); S.end(); for (let x = 20; x < 300; x += 40) { S.beg(); S.rect(x, 17, 3, 6, 'wood', 4); S.end(); }
    // round window with a moon in it
    S.beg(); S.ell(262, 36, 14, 14, 'wood', 5, { ring: 3 }); S.ell(262, 36, 11, 11, 'night', 3); A.moon(S, 266, 32, 4); S.line(251, 36, 273, 36, 'wood', 5); S.line(262, 25, 262, 47, 'wood', 5); S.end();
    // spool shelf: three rows of thread in a dozen colours
    S.beg(); S.box(26, 30, 58, 3, 'wood', 5, { top: 1 }); S.box(26, 46, 58, 3, 'wood', 5, { top: 1 }); S.box(26, 62, 58, 3, 'wood', 5, { top: 1 }); S.vl(26, 30, 36, 'wood', 4); S.vl(83, 30, 36, 'wood', 3); S.end();
    const SP = ['red', 'gold', 'teal', 'arcane', 'leaf', 'water', 'candy', 'copper', 'linen', 'lav', 'screen', 'crimson'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const x = 29 + i * 8, y = 30 + r * 16, m = SP[(i * 5 + r * 3) % SP.length]; S.beg(); S.rect(x, y - 11, 6, 2, 'wood', 7); S.rect(x, y - 2, 6, 2, 'wood', 5); S.cyl(x, y - 9, 6, 7, m, 6, { rim: 2.5 }); for (let k = 0; k < 7; k += 2) S.hl(x + 1, y - 9 + k, 4, m, 7.5); S.end(); }
    // scissors and a tape measure on nails
    S.beg(); S.px(96, 40, 'iron', 7); S.line(96, 41, 90, 58, 'iron', 8, { w: 2 }); S.line(96, 41, 101, 58, 'iron', 7, { w: 2 }); S.ell(89, 60, 2.5, 2.5, 'iron', 7, { ring: 1 }); S.ell(102, 60, 2.5, 2.5, 'iron', 6, { ring: 1 }); S.end();
    S.beg(); for (let k = 0; k < 40; k++) { const x = 206 + Math.sin(k * 0.3) * 3, y = 40 + k; S.px(x, y, 'gold', 7 + (k % 5 === 0 ? -2 : 0)); } S.ell(206, 38, 4, 4, 'crimson', 5, { dome: 1 }); S.end();
    S.ao(0, 124, 300, 24, 'b', 2.2);
    // floorboards
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) { const z = (y - 60) / 88, u = (x - 150) / (9 * z), fu = u - Math.floor(u); S.px(x, y, 'wood', (fu < 0.1 ? 2 : 4 + hash(Math.floor(u), (y - 148) >> 3, 2) * 1.2) - (y - 148) * 0.03); }
    S.lay('back');
    // dress form stuck with pins, on a turned stand
    S.beg(); S.ell(24, 98, 11, 14, 'linen', 6, { dome: 1 }); S.ell(24, 82, 7, 5, 'linen', 6.5, { dome: 1 }); S.rect(22, 76, 4, 3, 'wood', 6); S.rect(23, 111, 2, 31, 'wood', 5); S.poly([[14, 146], [24, 138], [34, 146]], 'wood', 4.5);
    [[18, 90, 'red'], [28, 94, 'gold'], [22, 102, 'teal'], [30, 86, 'arcane'], [16, 104, 'gold']].forEach(([x, y, m]) => { S.px(x, y, m, 8); S.px(x + 1, y + 1, 'iron', 8); }); S.hl(14, 92, 20, 'gold', 6); S.end();
    // treadle sewing machine: iron frame with gold scrollwork, wooden top, the black head, the flywheel
    S.beg(); S.box(214, 106, 76, 5, 'wood', 5.5, { top: 2 }); S.rect(218, 111, 4, 33, 'iron', 3.5); S.rect(282, 111, 4, 33, 'iron', 3.5); S.poly([[218, 144], [286, 144], [280, 138], [224, 138]], 'iron', 3);
    for (let k = 0; k < 8; k++) { S.px(220 + Math.round(Math.sin(k) * 1.5), 116 + k * 3, 'gold', 7); S.px(284 - Math.round(Math.sin(k) * 1.5), 116 + k * 3, 'gold', 6); }
    S.ell(252, 130, 10, 10, 'iron', 4, { ring: 2 }); S.ell(252, 130, 2, 2, 'iron', 6); S.rect(236, 143, 28, 3, 'iron', 5);
    S.box(226, 86, 50, 8, 'night', 3, { top: 1 }); S.box(266, 86, 10, 20, 'night', 3); S.rect(232, 94, 5, 12, 'night', 3); S.vl(234, 100, 6, 'iron', 9); S.px(234, 106, 'iron', 10);
    for (let x = 230; x < 264; x += 3) S.px(x, 89, 'gold', 7.5); S.ell(280, 94, 5, 5, 'iron', 6, { ring: 1.5 }); S.hl(228, 86, 46, 'night', 6); S.end();
    S.lay('mid');
    // the work table with the oil lamp (brass base, glass chimney, a steady flame), a pincushion and a thimble
    S.beg(); S.box(84, 116, 44, 4, 'wood', 5.5, { top: 2 }); S.rect(87, 120, 3, 28, 'wood', 4); S.rect(122, 120, 3, 28, 'wood', 3.5); S.end();
    S.beg(); S.ell(104, 114, 6, 2, 'brass', 6); S.cyl(101, 106, 6, 8, 'brass', 6, { rim: 2 }); S.cyl(102, 94, 4, 12, 'glass', 4, { rim: 1.5 }); S.vl(102, 95, 10, 'glass', 9); S.rect(103, 99, 2, 5, 'fire', 10, { e: 255 }); S.px(103, 98, 'fire', 11, { e: 255 }); S.end();
    S.beg(); S.ell(118, 112, 5, 4, 'red', 6, { dome: 1 }); S.px(116, 110, 'iron', 9); S.px(120, 109, 'iron', 9); S.px(118, 108, 'iron', 9); S.line(118, 113, 118, 116, 'leaf', 5); S.end();
    S.beg(); S.cyl(91, 111, 3, 4, 'iron', 7, { rim: 1 }); S.end();
    sc.emit({ k: 'dust', x: 150, y: 80, w: 200, h: 80, rate: 2.2, sp: 2, life: 5 });
  },
  anim(D, t, rs, o) {
    o = o || DEMO_GR; const ph = o.phase || 'sew', u = o.u == null ? 0.62 : o.u;
    // the flywheel creeps round
    D.lay('back'); const a = t * 1.2; for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2; D.line(252, 130, 252 + Math.cos(b) * 8, 130 + Math.sin(b) * 8, 'iron', 6); }
    // the pattern (a half-round cape of pale paper, pinned to the wall) and the leader's shadow cast by the lamp over wall and paper
    D.lay('wall'); const sh = o.shadowK == null ? 1 : o.shadowK, br = Math.sin(t * 1.6) * 0.5 + (o.breath || 0) * 3, pat = ph !== 'idle' && ph !== 'select', sunk = o.sunk || 0;
    const inShadow = (x, y) => { if (y < 30) return 0; const dh = Math.hypot((x - 150) / 9.5, (y - 42) / 11); if (dh < 1) return 1; if (y < 52) return 0; const hw = y < 56 ? 5 : y < 64 ? 5 + (y - 56) * 2.2 : Math.min(26, 22 + (y - 64) * 0.2) - (y > 100 ? (y - 100) * 0.1 : 0) + br; return Math.abs(x - 150) < hw ? 1 : 0; };
    for (let y = 30; y < 148; y++) for (let x = 60; x < 240; x++) {
      const r = Math.hypot(x - 150, (y - 116) * 1.0), onPaper = pat && y <= 116 && r < 77 - sunk * 77, shd = inShadow(x, y) * sh;
      if (onPaper) { const edge = r > 75.5, grain = ((x * 3 + y * 5) % 17 === 0) ? -0.6 : 0; const chalk = (Math.abs(r - 60) < 0.5 || (Math.abs(x - 150) < 0.5 && y > 60)) && (x + y) % 3; D.px(x, y, chalk ? 'linen' : 'paper', chalk ? 8 - shd * 4 : (edge ? 5.5 : 7.2) + grain - shd * 4.4 - (y > 110 ? 0.6 : 0)); }
      else if (shd) D.px(x, y, 'night', 0.6 + (X.bayer(x, y) > 0.5 && !inShadow(x - 2, y) ? 0.8 : 0));
    }
    if (pat) {
      for (let k = 0; k <= 160; k++) { const q = k / 160, p = GR.seam(q); if (k % 4 < 2) D.px(p.x, p.y + 2, 'lav', q <= u ? 8 : 4.5, q <= u ? { e: 255 } : undefined); }
      // sewn thread: a glowing violet line behind the needle
      for (let k = 0; k <= 200; k++) { const q = k / 200; if (q > u) break; const p = GR.seam(q); D.px(p.x, p.y - 1, 'arcane', 8 + (u - q < 0.05 ? 3 : 0), { e: 255 }); }
      // six pins with glass heads; a stitched one leaves a gold X
      (o.marks || DEMO_GR.marks).forEach((m, i) => { const p = GR.seam(m.u), x = Math.round(p.x), y = Math.round(p.y); if (m.ok) { D.line(x - 2, y - 2, x + 2, y + 2, 'gold', 10, { e: 255 }); D.line(x + 2, y - 2, x - 2, y + 2, 'gold', 10, { e: 255 }); return; }
        const hm = ['red', 'gold', 'teal', 'arcane', 'candy', 'screen'][i]; D.beg(); D.line(x, y, x + 3, y + 5, 'iron', 9); D.ell(x, y, 1.6, 1.6, m.gone ? 'stone' : hm, m.gone ? 3 : 8, { dome: 1 }); D.end(); });
      // the needle: long, bright, eye at the back, riding the seam
      const p = GR.seam(u), q = GR.seam(Math.min(1, u + 0.01)), ang = Math.atan2(q.y - p.y, q.x - p.x) - 0.8; D.beg(); for (let k = -3; k < 13; k++) { const x = p.x - Math.cos(ang) * k, y = p.y - Math.sin(ang) * k; D.px(x, y, 'iron', k < 0 ? 11 : 9 - k * 0.2, { e: k < 1 ? 255 : 0 }); } D.end();
      A.glow(rs, p.x, p.y, 26, '#c8a0ff', 0.7); }
    // the unit swatches on the clothesline (choosing)
    if (ph === 'idle' || ph === 'select') { D.lay('mid'); for (let x = 30; x < 270; x++) D.px(x, 52 + Math.round(Math.sin((x - 30) / 240 * Math.PI) * 6), 'linen', 6);
      (o.cards || DEMO_GR.cards).forEach((c, i) => { const x = c.ax, y = 52 + Math.round(Math.sin((x - 30) / 240 * Math.PI) * 6), sw = Math.round(Math.sin(t * 1.4 + i) * 1 + (c.hov ? 2 : 0)); const m = ['crimson', 'denim', 'leaf', 'lav', 'sand', 'candy', 'teal', 'copper'][i % 8];
        D.beg(); for (let yy = 0; yy < 30; yy++) for (let xx = -11; xx <= 11; xx++) { const s2 = Math.round(sw * yy / 30); D.px(x + xx + s2, y + 3 + yy, m, 5 + ((xx + yy) % 4 === 0 ? 0.7 : 0) - (Math.abs(xx) === 11 ? 1.5 : 0) + (yy === 29 && xx % 2 ? -2 : 0)); } D.end();
        D.beg(); D.rect(x - 1, y - 2, 3, 6, 'wood', 7); D.end(); }); }
  },
});
const DEMO_GR = { phase: 'sew', u: 0.62, marks: [{ u: 0.12, ok: 1 }, { u: 0.27, ok: 1 }, { u: 0.42, gone: 1 }, { u: 0.57, ok: 1 }, { u: 0.72 }, { u: 0.87 }], cards: [] };

// ═════════════════════ 许愿井 · the well in the ruined courtyard ═════════════════════
const WL = { x: 225, mouth: 100, hero: 55, meter: [80, 73, 8, 65], col: 0, q: -1 };
A.WELL = WL;
A.def('mini_well', {
  amb: [0.24, 0.3],
  paint(S, sc) {
    sc.light({ x: 62, y: 30, z: 40, r: 300, i: 0.75, c: '#9ab4ff', tint: 0.45 });                      // 0 moon
    sc.light({ x: 225, y: 100, z: 6, r: 60, i: 0.55, c: '#6fd0ff', fl: 'pulse', amp: 0.2, sp: 1.3, tint: 0.6 });   // 1 the well's own glow
    sc.light({ x: 264, y: 70, z: 12, r: 70, i: 0.8, c: '#ffb050', fl: 'candle', tint: 0.5 });           // 2 lantern on the post
    sc.light({ x: 225, y: 60, z: 20, r: 110, i: 1.2, c: '#ffffff', tint: 0, bake: false });            // 3 the answer (omen colour, anim)
    ['#c4ccd9', '#47d6c1', '#b86bff', '#ffcf4a'].forEach((c, q) => sc.shaft({ x: 225, y0: 0, y1: 101, w0: 22, w1: 16, i: 0.6, haze: 0.8, c, f: () => (WL.q === q ? WL.col : 0) }));
    S.lay('wall');
    A.sky(S, 0, 118, 'night', 1.2, 4.2, 90, 5); A.moon(S, 62, 30, 9);
    // clouds: soft bands of lavender lit from the moon side
    [[20, 18, 60], [150, 28, 80], [230, 12, 50]].forEach(([x0, y0, w], i) => { for (let y = 0; y < 8; y++) for (let x = 0; x < w; x++) { const d = Math.abs(x - w / 2) / (w / 2) + Math.abs(y - 4) / 5; if (d < 1 + 0.2 * Math.sin(x * 0.4 + i)) S.px(x0 + x, y0 + y, 'lav', 3.5 + (y < 3 ? 1.2 : 0) - d); } });
    // far ruins: a broken arcade, a wall, the headless statue
    for (let x = 0; x < 300; x++) { const h = 22 + Math.round(8 * Math.sin(x * 0.05) + 6 * hash(x >> 3, 1, 7)); for (let y = 118 - h; y < 148; y++) S.px(x, y, 'stone', 2.2 + (y === 118 - h ? 1.5 : 0)); }
    for (let i = 0; i < 4; i++) { const x = 104 + i * 30, top = i === 3 ? 92 : 74; S.rect(x, top, 6, 118 - top, 'stone', 3.2); S.hl(x, top, 6, 'stone', 4.5); S.vl(x, top, 118 - top, 'stone', 4); if (i < 3) for (let k = 0; k <= 24; k++) { const ax = x + 6 + k, ay = 76 - Math.round(Math.sin(k / 24 * Math.PI) * 8); if (!(i === 2 && k > 12)) { S.rect(ax, ay - 3, 1, 4, 'stone', 3.2); S.px(ax, ay - 3, 'stone', 4.5); } } }
    S.rect(0, 116, 300, 32, 'stone', 2.8); S.noise(0, 90, 300, 58, 1, 4, 3);
    S.beg(); S.box(22, 112, 16, 36, 'stone', 5, { top: 2 }); S.ell(30, 100, 7, 12, 'stone', 5.5, { dome: 1 }); S.rect(26, 88, 8, 4, 'stone', 4); S.ell(24, 100, 3, 5, 'stone', 4.5, { dome: 1 }); S.end();
    // grass and flagstones
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) { const dW = Math.hypot((x - 225) / 70, (y - 150) / 22), bx = Math.floor((x + ((y >> 2) & 1) * 3) / 6), fl = dW < 1 + 0.25 * hash(bx, y >> 2, 9) && ((x + ((y >> 2) & 1) * 3) % 6) && (y % 4); S.px(x, y, fl ? 'stone' : 'moss', fl ? 4.2 + hash(bx, y >> 2, 1) * 1.4 : 3 + hash(x, y, 2) * 2); }
    for (let i = 0; i < 90; i++) { const x = Math.floor(hash(i, 5, 5) * 300), y = 146 + Math.floor(hash(i, 6, 5) * 26); S.px(x, y, 'leaf', 5 + hash(i, 7, 5) * 3); S.px(x, y - 1, 'leaf', 6); if (i % 7 === 0) { S.px(x, y - 2, i % 2 ? 'candy' : 'linen', 8); } }
    S.lay('mid');
    // the well: rough stone courses with moss, a lip, the dark water deep down with the moon in it
    const WX = WL.x, MY = WL.mouth;
    S.beg(); for (let y = MY; y < 148; y++) { const row = Math.floor((y - MY) / 6); for (let x = WX - 36; x <= WX + 36; x++) { const u = (x - WX) / 36, bx = Math.floor((x + row * 5) / 11), fy = (y - MY) % 6, fx = (x + row * 5) % 11;
      S.px(x, y, 'stone', (fy === 0 || fx === 0 ? 2 : 5 + hash(bx, row, 3) * 1.8 + (fy === 1 ? 0.8 : 0)) - Math.abs(u) * 1.8, { n: [u * 0.85, 0] }); } } S.end({ lit: 1 });
    for (let i = 0; i < 40; i++) { const x = WX - 34 + Math.floor(hash(i, 1, 9) * 68), y = MY + 1 + Math.floor(hash(i, 2, 9) * 40); S.px(x, y, 'moss', 5); S.px(x + 1, y, 'moss', 4); }
    S.beg(); S.ell(WX, MY, 38, 8, 'stone', 6.5); S.ell(WX, MY, 32, 6, 'ink', 0); S.ell(WX, MY + 1, 26, 4, 'water', 1.5); S.ell(WX + 6, MY + 2, 5, 1.2, 'bone', 5, { e: 255 }); S.end();
    // the frame: two posts with ivy, a tiled roof, the windlass with its rope, a bucket on the lip, a lantern
    [WX - 38, WX + 36].forEach((x, i) => { S.beg(); S.box(x, 44, 4, MY - 40, 'wood', 4.8); S.vl(x, 44, MY - 40, 'wood', 6.5); S.end(); for (let k = 0; k < 40; k++) S.px(x + Math.round(Math.sin(k * 0.7 + i) * 2) + 1, MY - 2 - k, 'leaf', 5 + (k % 3)); });
    S.beg(); for (let y = 26; y < 46; y++) { const hw = (y - 24) * 2.7; for (let x = Math.round(WX - hw); x <= Math.round(WX + hw); x++) { const row = (y - 26) >> 2, tx = (x + row * 3) % 6; S.px(x, y, 'brick', ((y - 26) % 4 === 3 ? 2.5 : 4.5 + hash(Math.floor((x + row * 3) / 6), row, 4)) + (tx === 0 ? -1 : 0) + (x < WX ? 0.6 : -0.3), { n: [x < WX ? -0.5 : 0.5, -0.5] }); } } S.hl(WX - 57, 46, 114, 'wood', 3); S.end();
    S.beg(); S.hcyl(WX - 36, 58, 72, 6, 'wood', 5, { rim: 2 }); for (let x = WX - 16; x < WX + 16; x += 2) S.vl(x, 58, 6, 'sand', 6 + (x % 4 ? 0 : 1)); S.line(WX + 38, 61, WX + 44, 66, 'iron', 6); S.rect(WX + 43, 66, 3, 5, 'wood', 6); S.end();
    S.beg(); S.vl(WX + 4, 64, 34, 'sand', 6); S.end();
    S.beg(); S.poly([[WX - 30, 99], [WX - 28, 90], [WX - 18, 90], [WX - 16, 99]], 'wood', 5); S.hl(WX - 29, 92, 12, 'iron', 6); S.hl(WX - 29, 97, 12, 'iron', 5); S.end();
    S.beg(); S.px(264, 62, 'iron', 7); S.box(261, 64, 7, 9, 'iron', 4); S.rect(262, 65, 5, 7, 'lamp', 8, { e: 3 }); S.end();
    // the charge pillar: a carved stone post with a groove and a brass band (the target band is set per throw, anim)
    const [px0, py0, pw, ph] = WL.meter; S.beg(); S.box(px0 - 3, py0 - 4, pw + 6, 4, 'stone', 6, { top: 1 }); S.box(px0 - 2, py0, pw + 4, ph, 'stone', 5.2); S.rect(px0, py0 + 1, pw, ph - 2, 'ink', 1); S.box(px0 - 4, py0 + ph, pw + 8, 148 - py0 - ph, 'stone', 5.5, { top: 1 }); S.end();
    sc.emit({ k: 'firefly', x: 150, y: 130, w: 280, h: 20, rate: 1.4, sp: 6, life: 4 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const [px0, py0, pw, ph] = WL.meter, band = o.band == null ? 0.6 : o.band, pow = o.pow == null ? 0.52 : o.pow;
    WL.q = o.q == null ? -1 : o.q; WL.col = o.col || 0; rs.mul[3] = WL.col; if (o.q != null && o.q >= 0) { const c = ['#c4ccd9', '#47d6c1', '#b86bff', '#ffcf4a'][o.q]; A.glow(rs, WL.x, 70, 90, c, 1.2 * WL.col); }
    D.lay('mid');
    // target band: a brass collar with glowing runes; the fill is water-light with a bright foam line
    const bY = Math.round(py0 + ph * (1 - band)), bh = Math.round(ph * 0.16);
    D.beg(); D.rect(px0 - 2, bY - bh / 2, pw + 4, bh, 'brass', 6); D.hl(px0 - 2, bY - bh / 2, pw + 4, 'brass', 9); D.hl(px0 - 2, bY + bh / 2 - 1, pw + 4, 'brass', 3.5); for (let k = 0; k < 3; k++) D.px(px0 + 1 + k * 3, bY - 1 + (k % 2), 'gold', 10, { e: 255 }); D.end();
    const fh = Math.round((ph - 2) * pow); for (let y = 0; y < fh; y++) { const yy = py0 + ph - 1 - y; if (yy >= bY - bh / 2 && yy < bY + bh / 2) continue; for (let x = 0; x < pw; x++) D.px(px0 + x, yy, 'water', y === fh - 1 ? 11 : 6 + ((x + y + Math.floor(t * 12)) % 5 === 0 ? 2 : 0) - (x === pw - 1 ? 1.5 : 0), { e: 255 }); }
    if (pow > 0) A.glow(rs, px0 + 4, py0 + ph - fh, 18, '#6fd0ff', 0.6);
    // the throw preview: a dotted arc of pixel beads into the well mouth, breathing
    if (o.preview !== false && o.phase !== 'fly') for (let k = 1; k < 18; k++) { const q = k / 18, x = WL.hero + 14 + (WL.x - WL.hero - 14) * (0.35 + pow * 0.8) * q, y = 102 - Math.sin(q * Math.PI) * (55 + pow * 40) + q * 4; if ((k + Math.floor(t * 8)) % 3) D.px(x, y, 'gold', 8 + (k % 2), { e: 255 }); }
    // water glints on the well's surface
    if (Math.random() < 0.08) rs.burst('glint', WL.x - 20 + Math.random() * 40, WL.mouth + 2, 1, { sp: 2, life: 0.5 });
  },
});

// ═════════════════════ 迷路的孩子 · the snowy birch fork ═════════════════════
// the fork is near enough for footprints to read: the trodden path comes up from the bottom, splits at y 124 and runs off left and right
const CH = { fork: [150, 124], br: (s, q) => ({ x: 150 + s * (10 + q * 118), y: 124 - q * 22 - Math.sin(q * Math.PI) * 4 }) };
A.CHILD = CH;
A.def('mini_child', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    sc.light({ x: 150, y: 20, z: 60, r: 320, i: 0.5, c: '#8aa8ff', tint: 0.5 });                      // 0 cold sky light
    sc.light({ x: 150, y: 110, z: 10, r: 90, i: 1.0, c: '#ffc060', fl: 'candle', tint: 0, bake: false });   // 1 her lantern (moves, anim)
    S.lay('wall');
    A.sky(S, 0, 90, 'night', 1.2, 3.6, 70, 11);
    // three layers of birches: far grey lines, mid, near white trunks with black marks
    [[2, 7, 0.9, 20], [3.5, 11, 1.4, 14]].forEach(([tn, gap, w, seed]) => { for (let x = 0; x < 300; x += gap) { const xx = x + Math.floor(hash(x, seed, 2) * gap * 0.6), top = 20 + Math.floor(hash(x, 3, seed) * 30); for (let y = top; y < 100; y++) for (let k = 0; k < w; k++) S.px(xx + k, y, 'ice', tn + (hash(xx, y >> 2, seed) > 0.85 ? -1.5 : 0)); } });
    // snowfield in perspective with the path forking into the trees
    for (let y = 88; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'ice', 6.2 + (y - 88) * 0.03 + (hash(x >> 1, y, 3) > 0.9 ? 0.8 : 0));
    for (let y = 122; y < 175; y++) { const k = (y - 122) / 53, hw = 7 + k * 46; for (let x = Math.round(150 - hw); x <= Math.round(150 + hw); x++) S.px(x, y, 'ice', 4.8 + (hash(x, y, 7) > 0.8 ? 0.7 : 0) + (Math.abs(x - 150) > hw - 2 ? 1.2 : 0)); }
    [-1, 1].forEach(sd => { for (let q = 0; q <= 1; q += 0.003) { const p = CH.br(sd, q), hw = 6 - q * 2.5; for (let d = -hw; d <= hw; d++) S.px(p.x, p.y + d, 'ice', 4.9 + (Math.abs(d) > hw - 1 ? 1.3 : 0) + (hash(Math.round(p.x), Math.round(p.y + d), 3) > 0.85 ? 0.7 : 0)); } });
    S.ao(0, 88, 300, 8, 't', 1.8);
    S.lay('back');
    // the signpost at the fork: two boards with their words scraped off
    const sx0 = 176; S.beg(); S.rect(sx0, 88, 3, 30, 'wood', 4.5); S.poly([[sx0 - 18, 90], [sx0, 90], [sx0, 96], [sx0 - 18, 96], [sx0 - 22, 93]], 'wood', 5.5); S.poly([[sx0 + 3, 97], [sx0 + 22, 97], [sx0 + 26, 100], [sx0 + 22, 103], [sx0 + 3, 103]], 'wood', 5); for (let x = sx0 - 16; x < sx0 - 2; x += 3) S.px(x, 93, 'wood', 3); for (let x = sx0 + 6; x < sx0 + 20; x += 3) S.px(x, 100, 'wood', 3); S.hl(sx0 - 18, 90, 18, 'ice', 9); S.hl(sx0 + 3, 97, 19, 'ice', 9); S.rect(sx0 - 1, 117, 5, 2, 'ice', 8); S.end();
    S.lay('mid');
    // near birches at both edges: white bark, black scars, snow on the branches
    [[8, 9], [36, 6], [266, 8], [290, 10], [96, 4], [204, 4]].forEach(([x0, w], i) => { S.beg(); for (let y = 0; y < 150 - (i >= 4 ? 40 : 0); y++) for (let x = 0; x < w; x++) { const u = x / (w - 1) * 2 - 1; S.px(x0 + x, y, 'bone', 8.5 - Math.abs(u) * 2 - (u > 0.4 ? 1.5 : 0) + (hash(x0 + x, y >> 1, i) > 0.93 ? -6 : 0) + ((y + i * 3) % 13 < 2 && x > 1 && x < w - 1 ? -5.5 : 0), { n: [u * 0.8, 0] }); } S.end({ lit: 1 }); });
    for (let i = 0; i < 12; i++) { const x0 = [12, 40, 270, 294, 98, 206][i % 6], y = 20 + i * 9; S.line(x0, y, x0 + (i % 2 ? 16 : -16), y - 8, 'wood', 3); S.px(x0 + (i % 2 ? 14 : -14), y - 8, 'ice', 10); }
    sc.emit({ k: 'snow', x: 150, y: -2, w: 320, h: 2, rate: 16, sp: 3, life: 12, ang: Math.PI, spread: 0.6 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const g = o.girl || { x: 150, y: 124, lk: 1 };
    rs.mul[1] = g.lk == null ? 1 : g.lk; const L = X.defs.mini_child; L.__gl = g;
    // her lantern moves the light: nudge the def's light to where she stands
    const B = rs; B.dl.push({ x: g.x + 3, y: g.y - 8, z: 10, r: 60 + 40 * (g.lk || 1), i: 0.9 * (g.lk || 1), rgb: [255, 192, 96], tint: 0.6 });
    // footprints: small pressed hollows; the real side glows in her lantern's colour, the other side is cold and dim
    const pr = o.prints || { real: 1, vis: 0.8, decoy: 0.2 };
    [0, 1].forEach(side => { const a = side === pr.real ? pr.vis : Math.min(pr.vis, pr.decoy), sd = side ? 1 : -1, lit = side === pr.real;
      for (let i = 0; i < 6; i++) { const q = 0.08 + i * 0.15, p = CH.br(sd, q), off = (i % 2 ? 2 : -2), x = Math.round(p.x), y = Math.round(p.y + off), w = i < 2 ? 2 : 1;
        D.rect(x - w, y, w * 2 + 1, 2, 'ice', 3.4); D.hl(x - w, y + 2, w * 2 + 1, 'ice', 8.5); D.px(x + sd * (w + 1), y + 1, 'ice', 3.8);
        if (a > 0.05) { D.rect(x - w + 1, y, Math.max(1, w * 2 - 1), 1, lit ? 'lamp' : 'ice', lit ? 6 + a * 5 : 5 + a * 3, { e: 255 }); if (lit && a > 0.3) A.glow(rs, x, y, 10, '#ffc060', 0.45 * a); } } });
  },
});


// ═════════════════════ 无名墓碑 · the hillside graveyard ═════════════════════
// the candle on the headstone is the only warm light and the timer: it shrinks, its light closes in
const GV = { stone: [128, 76, 44, 70], candle: [164, 74], pit: [112, 150, 96], pile: [238, 150], hero: 86 };
A.GRAVE = GV;
A.def('mini_grave', {
  amb: [0.2, 0.28],
  paint(S, sc) {
    sc.light({ x: 250, y: 36, z: 50, r: 300, i: 0.62, c: '#a8bcff', tint: 0.45 });                              // 0 full moon
    sc.light({ x: 164, y: 66, z: 12, r: 120, i: 1.1, c: '#ffb050', fl: 'candle', tint: 0.55, bake: false });      // 1 the candle (shrinks, anim)
    sc.light({ x: 160, y: 168, z: 8, r: 70, i: 1.3, c: '#ffe08a', tint: 0, bake: false });                        // 2 the coffin's light (omen)
    S.lay('wall');
    A.sky(S, 0, 120, 'night', 1.4, 3.4, 60, 17); A.moon(S, 250, 36, 15);
    // hill line, a dead tree with a crow, a row of crooked stones and an iron fence far off
    for (let x = 0; x < 300; x++) { const h = 112 + Math.round(Math.sin(x * 0.018 + 1) * 8 + Math.sin(x * 0.07) * 2); for (let y = h; y < 148; y++) S.px(x, y, 'moss', 1.6 + (y - h) * 0.03 + (y === h ? 1.4 : 0)); }
    S.beg(); const tr = (x, y, a, l, w) => { if (l < 3) return; const x2 = x + Math.sin(a) * l, y2 = y - Math.cos(a) * l; S.line(x, y, x2, y2, 'ink', 1.5, { w }); tr(x2, y2, a - 0.45, l * 0.68, Math.max(1, w - 1)); tr(x2, y2, a + 0.38, l * 0.62, Math.max(1, w - 1)); };
    tr(46, 118, -0.05, 30, 3); S.end({ none: 1 }); S.spr(58, 84, ['.kk.', 'kkkk', '.kkkr', 'kk..'], { k: ['ink', 1], r: ['gold', 8, { e: 255 }] });
    for (let x = 64; x < 290; x += 5) { const y = 106 + Math.round(Math.sin(x * 0.018 + 1) * 8); S.vl(x, y - 8, 9, 'iron', 2.5); S.px(x, y - 9, 'iron', 3.5); } for (let x = 64; x < 290; x++) { const y = 106 + Math.round(Math.sin(x * 0.018 + 1) * 8); S.px(x, y - 6, 'iron', 2.5); }
    [[18, 116, 10, 18, -0.2], [106, 118, 8, 14, 0.25], [214, 114, 12, 20, -0.1], [282, 118, 9, 16, 0.3]].forEach(([x, y, w, h, tl]) => { S.beg(); for (let k = 0; k < h; k++) { const sx = Math.round(tl * k); for (let i = 0; i < w; i++) S.px(x + i + sx, y - k, 'stone', 3 + (i === 0 ? 1.4 : i === w - 1 ? -1 : 0) + (k >= h - 2 ? 1 : 0)); } S.end({ lit: 1 }); });
    // ground: dark grass, the dug earth round the grave
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'moss', 2.6 + hash(x, y, 4) * 1.4 - (y - 148) * 0.02);
    for (let y = 146; y < 175; y++) for (let x = 100; x < 262; x++) { const d = Math.hypot((x - 170) / 80, (y - 158) / 16); if (d < 1 + 0.12 * hash(x >> 1, y, 5)) S.px(x, y, 'earth', 4.2 + hash(x, y, 6) * 1.6 - d); }
    S.lay('mid');
    // the nameless headstone: weathered granite, a crack, moss at the foot, a rough "?" gouged where the name should be
    const [gx, gy, gw, gh] = GV.stone; S.beg();
    for (let y = gy; y < gy + gh; y++) for (let x = gx; x < gx + gw; x++) { const top = gy + 14 - Math.sqrt(Math.max(0, 1 - Math.pow((x - gx - gw / 2) / (gw / 2), 2))) * 14; if (y < top) continue; const u = (x - gx) / gw * 2 - 1;
      S.px(x, y, 'stone', 5.4 - u * 1.4 + (hash(x >> 1, y >> 1, 3) - 0.5) * 1.2 - (y > gy + gh - 6 ? 1 : 0), { n: [u * 0.6, y < top + 2 ? -0.7 : 0] }); }
    S.end({ lit: 1 }); TX.crack(S, gx + 8, gy + 20, 26, 'stone', 5, 'v');
    S.spr(gx + 16, gy + 24, ['.qqqq.', 'qq..qq', '....qq', '...qq.', '..qq..', '..qq..', '......', '..qq..'], { q: ['stone', 2] });
    for (let i = 0; i < 30; i++) S.px(gx + Math.floor(hash(i, 1, 4) * gw), gy + gh - 1 - Math.floor(hash(i, 2, 4) * 7), 'moss', 4 + hash(i, 3, 4) * 3);
    // wax pooled on the stone under the candle
    S.beg(); S.ell(GV.candle[0], gy + 12, 6, 2, 'bone', 8); for (let k = 0; k < 7; k++) S.px(GV.candle[0] + 5, gy + 12 + k, 'bone', 7.5); S.end();
    // the leaning shovel planted in the dirt pile is drawn by anim (it moves); a lantern-less pick lies on the grass
    S.beg(); S.line(20, 160, 46, 150, 'wood', 5, { w: 2 }); S.line(44, 146, 50, 156, 'iron', 7, { w: 2 }); S.end();
    sc.emit({ k: 'firefly', x: 150, y: 140, w: 300, h: 20, rate: 0.5, sp: 4, life: 5 });
  },
  anim(D, t, rs, o) {
    o = o || DEMO_GV; const life = o.life == null ? 0.55 : o.life, dep = o.dep == null ? 0.6 : o.dep, [px0, py0, pw] = GV.pit, wob = o.wob || 0;
    rs.mul[1] = life > 0 ? 0.35 + 0.75 * life + (o.flick || 0) : 0; rs.mul[2] = o.coffinK || 0;
    // fog: three dithered bands creeping along the ground, thicker as the candle dies
    D.lay('back'); const fog = 0.25 + (1 - life) * 0.55;
    for (let b = 0; b < 3; b++) for (let y = 128 + b * 7; y < 140 + b * 9; y++) for (let x = 0; x < 300; x++) { const v = Math.sin(x * 0.05 + t * (0.3 + b * 0.15) + b) * 0.5 + 0.5; if (X.bayer(x, y) < fog * v * 0.55) D.px(x, y, 'lav', 4 + b * 0.6, { e: 255 }); }
    D.lay('mid');
    // the pit: a dark mouth; its back wall shows the strata as it deepens (topsoil, clay, gravel, roots, a bone)
    const deep = Math.round(4 + dep * 22);
    for (let y = py0; y < Math.min(175, py0 + deep); y++) for (let x = px0; x < px0 + pw; x++) { const k = (y - py0) / 26, e = Math.min(x - px0, px0 + pw - 1 - x); let m = 'earth', tn = 5.4 - k * 2.6 + (y === py0 ? 2 : 0);
      if (e < 2) tn = 5 - k * 2; if (k > 0.22 && k < 0.42) { m = 'brick'; tn = 4.6 - k * 2; } if (k > 0.55 && hash(x >> 1, y >> 1, 2) > 0.75) { m = 'stone'; tn = 5 - k * 2; } if (e < 3) tn -= 1.5; if (k > 0.5 && ((x * 7 + y * 3) % 23 === 0)) { m = 'wood'; tn = 3.5; }
      D.px(x, y, m, Math.max(0.2, tn)); }
    if (dep > 0.7) D.spr(px0 + 30, py0 + 18, ['bb...bb', '.bbbbb.', 'bb...bb'], { b: ['bone', 6] });
    // the coffin lid at the bottom once it is reached (o.coffin): planks, iron corners; lifts on the treasure beat
    if (o.coffin) { const lid = o.lid || 0; D.beg(); D.rect(px0 + 10, 165 - Math.round(lid * 4), pw - 20, 7, 'wood', 4.5); for (let x = px0 + 12; x < px0 + pw - 10; x += 12) D.vl(x, 165 - Math.round(lid * 4), 7, 'wood', 2.5); D.px(px0 + 11, 166, 'iron', 7); D.px(px0 + pw - 12, 166, 'iron', 7); D.end();
      if (lid > 0 && o.coffinC) { for (let x = px0 + 10; x < px0 + pw - 10; x++) D.px(x, 172 - Math.round(lid * 4), 'gold', 9 + lid * 2, { e: 255 }); A.glow(rs, 160, 170, 40 + 40 * lid, o.coffinC, 1.2 * lid); } }
    // the spoil heap beside the pit grows with every shovelful
    const ph = Math.round(3 + dep * 16); D.beg(); for (let y = 0; y < ph; y++) { const hw = Math.sqrt(Math.max(0, 1 - Math.pow(y / ph, 2))) * (10 + dep * 22); for (let x = -Math.round(hw); x <= Math.round(hw); x++) D.px(GV.pile[0] + x, GV.pile[1] - y, 'earth', 4.6 + (y === ph - 1 ? 1 : 0) - Math.abs(x) / hw * 1.5 + (hash(x, y, 8) - 0.5), { n: [x / hw * 0.6, -0.5] }); } D.end({ lit: 1 });
    // the candle: shorter as it burns, the flame steady → guttering and leaning, wax running
    const [cx, cyTop] = GV.candle, hgt = Math.max(1, Math.round(14 * life)), base = GV.stone[1] + 11; D.beg(); D.rect(cx - 2, base - hgt, 5, hgt, 'bone', 8.5); D.vl(cx - 2, base - hgt, hgt, 'bone', 10); D.vl(cx + 2, base - hgt, hgt, 'bone', 6.5); D.px(cx + 1, base - hgt + 2, 'bone', 7); D.end();
    if (life > 0) { const s = 4 + life * 3, lean = Math.round(wob * 2 * Math.sin(t * 29)), hh = Math.round(s * (0.8 + 0.3 * n1(t * (9 + wob * 20)))); for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.42)); for (let i = -w + 1; i < w; i++) D.px(cx + i + Math.round(lean * q), base - hgt - 1 - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); } D.px(cx, base - hgt, 'ink', 1); }
    else { for (let k = 0; k < 12; k++) D.px(cx + Math.round(Math.sin(k * 0.8 + t * 3) * 1.5), base - hgt - 2 - k, 'linen', 6 - k * 0.3); }
  },
});
const DEMO_GV = { life: 0.5, dep: 0.62, wob: 0.4 };

// ═════════════════════ 落地镜 · the old bedroom ═════════════════════
const MR = { frame: [156, 28, 88, 118], glass: [163, 36, 74, 102], hero: 80 };
A.MIRROR = MR;
A.def('mini_mirror', {
  amb: [0.24, 0.3],
  paint(S, sc) {
    sc.light({ x: 44, y: 70, z: 14, r: 170, i: 1.05, c: '#ffb458', fl: 'candle', tint: 0.5 });   // 0 candelabra
    sc.light({ x: 200, y: 86, z: 10, r: 80, i: 0.35, c: '#8fb4ff', fl: 'pulse', amp: 0.15, sp: 0.9, tint: 0.5 });   // 1 the glass's own cold sheen
    sc.light({ x: 200, y: 80, z: 16, r: 110, i: 1.2, c: '#ffffff', tint: 0, bake: false });   // 2 omen / flash (anim)
    S.lay('wall');
    // damask wallpaper: a repeating motif, faded, one strip peeled to the plaster; picture rail; wainscot panels
    for (let y = 0; y < 104; y++) for (let x = 0; x < 300; x++) { const u = ((x % 16) + 16) % 16 - 8, v = (((y + (Math.floor(x / 16) % 2) * 10) % 20) + 20) % 20 - 10, d = Math.abs(u) * 0.9 + Math.abs(v) * 0.55, mot = d < 5 && d > 3.2 || (Math.abs(u) < 1 && Math.abs(v) < 6);
      S.px(x, y, 'crimson', 3.4 + (mot ? 1.3 : 0) + (hash(x >> 2, y >> 2, 1) - 0.5) * 0.5); }
    for (let y = 30; y < 90; y++) for (let x = 112; x < 124 - Math.round((y - 30) * 0.12); x++) S.px(x, y, 'paper', 5.5 + hash(x, y, 3)); for (let y = 30; y < 90; y++) S.px(124 - Math.round((y - 30) * 0.12), y, 'crimson', 5.5);
    S.box(0, 8, 300, 3, 'wood', 5, { top: 1 }); S.box(0, 102, 300, 4, 'wood', 5.5, { top: 1 });
    for (let x = 0; x < 300; x += 38) { S.beg(); S.box(x + 3, 110, 32, 34, 'wood', 4.2); S.box(x + 7, 114, 24, 26, 'wood', 3.6); S.end(); } S.box(0, 144, 300, 4, 'wood', 3.2, { top: 1 });
    S.noise(0, 0, 300, 148, 1, 7, 6); S.ao(0, 0, 300, 18, 't', 2.2);
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) { const z = (y - 50) / 98, u = (x - 150) / (8 * z), fu = u - Math.floor(u); S.px(x, y, 'wood', (fu < 0.12 ? 1.8 : 4 + hash(Math.floor(u), (y - 148) >> 2, 5) * 1.3) - (y - 148) * 0.035); }
    S.lay('back');
    // the covered painting, the candelabra on a side table
    S.beg(); S.rect(60, 34, 44, 46, 'linen', 6.5); for (let x = 60; x < 104; x++) { const f = Math.sin(x * 0.5) * 0.8; S.vl(x, 34, 46 + Math.round(Math.sin(x * 1.3) * 2), 'linen', 6.5 + f); } S.hl(60, 34, 44, 'linen', 8.5); S.rect(58, 32, 48, 3, 'gold', 5); S.end();
    S.beg(); S.box(26, 112, 36, 4, 'wood', 5, { top: 2 }); S.rect(30, 116, 3, 32, 'wood', 4); S.rect(55, 116, 3, 32, 'wood', 3.5); S.end();
    S.beg(); S.ell(44, 110, 6, 1.6, 'brass', 7); S.rect(43, 88, 3, 22, 'brass', 6.5); S.vl(43, 88, 22, 'brass', 8.5); S.hl(34, 90, 21, 'brass', 7); S.vl(34, 84, 6, 'brass', 6); S.vl(54, 84, 6, 'brass', 6); [[34, 76], [44, 72], [54, 76]].forEach(([x, y]) => { S.rect(x - 1, y, 3, 88 - y - (x === 44 ? 0 : 4), 'bone', 9); S.px(x + 1, y + 2, 'bone', 7); }); S.end();
    S.lay('mid');
    // the floor mirror: gilded frame, carved scrolls and a cherub crest, a cracked corner; feet on the boards
    const [fx, fy, fw, fh] = MR.frame, [gx, gy, gw, gh] = MR.glass;
    S.beg(); for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) { if (x >= gx && x < gx + gw && y >= gy && y < gy + gh) continue; const e = Math.min(x - fx, fx + fw - 1 - x, y - fy, fy + fh - 1 - y), ie = Math.min(Math.abs(x - gx + 1), Math.abs(x - gx - gw), Math.abs(y - gy + 1), Math.abs(y - gy - gh));
      const orn = ((x + y) % 5 === 0 && e > 1 && ie > 1) ? 1.8 : 0; S.px(x, y, 'gold', 5.6 + (e === 0 ? -2 : e === 1 ? 1.4 : 0) + (ie === 0 ? -2.2 : ie === 1 ? 1.2 : 0) + orn - (x > fx + fw / 2 ? 0.8 : 0), { n: [x < fx + 3 ? -0.6 : x > fx + fw - 4 ? 0.6 : 0, y < fy + 3 ? -0.6 : 0] }); }
    S.end({ lit: 1 });
    S.beg(); S.ell(fx + fw / 2, fy - 2, 12, 7, 'gold', 6, { dome: 1 }); S.ell(fx + fw / 2, fy - 3, 4, 4, 'gold', 8, { dome: 1 }); S.px(fx + fw / 2 - 1, fy - 4, 'ink', 2); S.px(fx + fw / 2 + 1, fy - 4, 'ink', 2); S.ell(fx + fw / 2 - 8, fy - 1, 4, 2, 'gold', 7); S.ell(fx + fw / 2 + 8, fy - 1, 4, 2, 'gold', 5.5); S.end();
    [[fx - 3, fy + 20], [fx + fw - 1, fy + 20], [fx - 3, fy + fh - 30], [fx + fw - 1, fy + fh - 30]].forEach(([x, y]) => { S.beg(); S.ell(x + 2, y, 3, 5, 'gold', 6.5, { dome: 1 }); S.end(); });
    S.beg(); S.rect(fx + 6, fy + fh, 6, 2, 'gold', 5); S.rect(fx + fw - 12, fy + fh, 6, 2, 'gold', 5); S.end();
  },
  anim(D, t, rs, o) {
    o = o || {}; const [gx, gy, gw, gh] = MR.glass; rs.mul[2] = o.omenK || 0;
    // the glass: the room reversed, colder and darker; a slow sheen crosses it; ripples when something comes through; cracks on a fail
    D.lay('mid'); const rip = o.ripple || 0, crk = o.crack || 0, sheen = ((t * 0.13) % 1.6) - 0.3;
    for (let y = gy; y < gy + gh; y++) for (let x = gx; x < gx + gw; x++) { const mx = gx + gw - 1 - (x - gx), wy = y + (rip ? Math.round(Math.sin(Math.hypot(x - 200, y - 86) * 0.5 - t * 9) * rip * 1.5) : 0);
      const wall = wy < 72 ? 1 : 0, u = ((mx % 16) + 16) % 16 - 8, v = (((wy + (Math.floor(mx / 16) % 2) * 10) % 20) + 20) % 20 - 10, d = Math.abs(u) * 0.9 + Math.abs(v) * 0.55;
      let m = wall ? 'magic' : 'glass', tn = wall ? 3.6 + (d < 5 && d > 3.2 ? 1.2 : 0) + (wy > 60 ? -0.6 : 0) : 3 + (wy > 112 ? ((mx * 3 >> 3) % 2) * 0.8 : 0.4);
      const sd = (x - gx) / gw + (y - gy) / gh * 0.4 - sheen; if (sd > 0 && sd < 0.05) tn += 3; if (x === gx || y === gy) tn += 2;
      if (o.omenC && o.omenK) { m = 'glass'; tn += o.omenK * 4; }
      D.px(x, y, m, tn, (o.omenK > 0.2 || (sd > 0 && sd < 0.05)) ? { e: 255 } : undefined); }
    if (crk > 0) { const n = Math.round(10 * crk); for (let i = 0; i < n; i++) { const a = i / 10 * Math.PI * 2 + 0.3; for (let k = 0; k < 40 * crk; k++) { const x = 200 + Math.cos(a) * k + (k % 5 === 0 ? 1 : 0), y = 80 + Math.sin(a) * k * 1.3; if (x > gx && x < gx + gw && y > gy && y < gy + gh) D.px(x, y, 'linen', 10, { e: 255 }); } } }
    if (o.omenC && o.omenK) A.glow(rs, 200, 86, 60 + 40 * o.omenK, o.omenC, o.omenK);
    // one candle on the crest for every move, lit as you get them right
    const n = o.moves || 5, lit = o.lit == null ? 3 : o.lit; for (let i = 0; i < n; i++) { const x = Math.round(MR.frame[0] + 10 + i * (MR.frame[2] - 20) / Math.max(1, n - 1)), y = MR.frame[1] - 1; D.rect(x, y - 4, 2, 4, 'bone', 8.5);
      if (i < lit) { D.px(x, y - 6, 'fire', 10, { e: 255 }); D.px(x + 1, y - 5, 'fire', 8, { e: 255 }); D.px(x, y - 5, 'fire', 11, { e: 255 }); A.glow(rs, x, y - 6, 14, '#ffb458', 0.35); } }
  },
});

// ═════════════════════ 血祭坛 · the crypt chapel ═════════════════════
const AL = { cup: [150, 104], candle: [196, 110], hero: 66, circle: [150, 161, 78, 9] };
A.ALTAR = AL;
A.def('mini_altar', {
  amb: [0.18, 0.26],
  paint(S, sc) {
    sc.light({ x: 150, y: 44, z: 20, r: 190, i: 0.8, c: '#ff4a5a', tint: 0.6 });                          // 0 the red window
    sc.light({ x: 196, y: 92, z: 10, r: 110, i: 1.1, c: '#ffb050', fl: 'candle', tint: 0.5, bake: false });   // 1 the tall candle (anim)
    sc.light({ x: 26, y: 70, z: 8, r: 60, i: 0.6, c: '#ff9a40', fl: 'candle', ph: 2, tint: 0.5 });          // 2 niche candle left
    sc.light({ x: 274, y: 70, z: 8, r: 60, i: 0.6, c: '#ff9a40', fl: 'candle', ph: 4, tint: 0.5 });         // 3 niche candle right
    sc.light({ x: 150, y: 120, z: 18, r: 150, i: 1.3, c: '#ff5040', tint: 0, bake: false });              // 4 blood fire (anim)
    sc.shaft({ x: 150, y0: 78, y1: 150, w0: 22, w1: 42, i: 0.35, haze: 0.5, c: '#ff5a60' });
    S.lay('wall');
    TX.ashlar(S, 0, 0, 300, 148, 'rock', 4.2, { bh: 10, bw: 20 }); S.noise(0, 0, 300, 148, 1, 5, 4); S.ao(0, 0, 300, 24, 't', 2.4); S.ao(0, 120, 300, 28, 'b', 2);
    // the red rose window: stone tracery, lead cames, red and gold glass that glows
    S.beg(); S.ell(150, 44, 34, 34, 'stone', 5, { ring: 4 }); for (let y = -30; y <= 30; y++) for (let x = -30; x <= 30; x++) { const r = Math.hypot(x, y); if (r > 30) continue; const a = Math.atan2(y, x), seg = Math.floor((a + Math.PI) / (Math.PI / 6)), came = Math.abs(((a + Math.PI) / (Math.PI / 6)) % 1 - 0.5) > 0.45 || Math.abs(r - 18) < 0.8 || Math.abs(r - 9) < 0.7;
      S.px(150 + x, 44 + y, came ? 'ink' : r < 9 ? 'gold' : seg % 2 ? 'red' : 'crimson', came ? 1 : r < 9 ? 9 : 7.5 - r * 0.05 + (seg % 3 === 0 ? 1 : 0), came ? undefined : { e: 255 }); } S.end();
    // niches with skulls and stubs of candles; hanging chains
    [[14, 1], [262, -1]].forEach(([x]) => { S.beg(); S.rect(x, 54, 24, 30, 'ink', 1); S.ell(x + 12, 54, 12, 8, 'ink', 1); S.hl(x - 2, 84, 28, 'rock', 6); S.end(); S.beg(); S.ell(x + 8, 78, 5, 5, 'bone', 7, { dome: 1 }); S.rect(x + 5, 82, 7, 2, 'bone', 6); S.px(x + 6, 78, 'ink', 0); S.px(x + 10, 78, 'ink', 0); S.rect(x + 16, 72, 3, 12, 'bone', 8); S.end(); });
    [70, 230].forEach(x => { for (let y = 0; y < 60; y++) S.px(x + (y % 4 < 2 ? 0 : 1), y, 'iron', (y % 4 === 0 ? 7 : 4)); });
    // floor slabs
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) { const z = (y - 60) / 88, u = (x - 150) / (24 * z), fu = u - Math.floor(u), row = y < 154 ? 0 : y < 162 ? 1 : 2; S.px(x, y, 'rock', (fu < 0.05 || y === 154 || y === 162 ? 2 : 4.4 + hash(Math.floor(u), row, 3)) - (y - 148) * 0.03); }
    S.lay('mid');
    // the altar: black stone, a heavy top slab, carved runes, channels for the blood
    S.beg(); S.box(88, 114, 124, 34, 'rock', 3.4); S.box(82, 108, 136, 7, 'rock', 4.6, { top: 2 }); S.box(92, 144, 116, 4, 'rock', 3); S.end();
    for (let i = 0; i < 7; i++) { const x = 98 + i * 16; S.spr(x, 124, ['r.r', '.r.', 'rrr', 'r.r'].map((r, k) => (i + k) % 2 ? r : r.split('').reverse().join('')), { r: ['magic', 5] }); }
    S.beg(); S.hl(96, 118, 108, 'ink', 1); S.vl(150, 118, 26, 'ink', 1); S.end({ none: 1 });
    // the golden chalice
    S.beg(); S.ell(AL.cup[0], AL.cup[1] + 2, 8, 2, 'gold', 6); S.rect(AL.cup[0] - 1, AL.cup[1] - 8, 3, 9, 'gold', 7); S.ell(AL.cup[0], AL.cup[1] - 8, 3, 1.5, 'gold', 8);
    S.poly([[AL.cup[0] - 11, AL.cup[1] - 26], [AL.cup[0] + 11, AL.cup[1] - 26], [AL.cup[0] + 7, AL.cup[1] - 12], [AL.cup[0] - 7, AL.cup[1] - 12]], 'gold', 6.5); S.vl(AL.cup[0] - 8, AL.cup[1] - 24, 10, 'gold', 10); S.vl(AL.cup[0] + 8, AL.cup[1] - 24, 9, 'gold', 4.5);
    S.hl(AL.cup[0] - 11, AL.cup[1] - 26, 23, 'gold', 9); S.px(AL.cup[0] - 3, AL.cup[1] - 18, 'red', 8, { e: 255 }); S.px(AL.cup[0] + 3, AL.cup[1] - 18, 'teal', 8, { e: 255 }); S.end();
    // the tall candle's iron stand on the altar's right end
    S.beg(); S.ell(AL.candle[0], 107, 7, 2, 'iron', 5); S.rect(AL.candle[0] - 1, 100, 3, 7, 'iron', 6); S.ell(AL.candle[0], 100, 5, 1.5, 'iron', 6); S.end();
  },
  anim(D, t, rs, o) {
    o = o || DEMO_AL; const lvl = o.lvl == null ? 0.5 : o.lvl, near = o.near || 0, out = !!o.out, lv = o.lv == null ? 5 : o.lv, fire = o.fire || 0;
    rs.mul[1] = out ? 0 : 0.85 + 0.25 * n1(t * (6 + near * 20)); rs.mul[4] = fire + lvl * 0.35;
    // the rune circle on the floor: twelve segments, one per level poured
    D.lay('wall'); const [cx, cy, rx, ry] = AL.circle;
    for (let k = 0; k < 240; k++) { const a = k / 240 * Math.PI * 2, seg = Math.floor(k / 20), on = seg < lv, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; D.px(x, y, on ? 'red' : 'rock', on ? 8 + (k % 20 === 10 ? 2 : 0) : 3, on ? { e: 255 } : undefined); if (k % 20 === 10) D.px(cx + Math.cos(a) * (rx - 6), cy + Math.sin(a) * (ry - 1), on ? 'gold' : 'rock', on ? 10 : 3.5, on ? { e: 255 } : undefined); }
    D.lay('mid');
    // blood in the chalice (level + ripple), running down the channels, glowing brighter the more is given
    const [ux, uy] = AL.cup, top = Math.round(uy - 13 - lvl * 11); for (let y = top; y < uy - 13; y++) { const k = (y - (uy - 26)) / 14, hw = Math.round(7 + (1 - k) * 3.5) - 1; for (let x = -hw; x <= hw; x++) D.px(ux + x, y, 'red', y === top ? 9 : 5.5 + lvl * 2 - Math.abs(x) * 0.15, { e: 255 }); }
    const run = Math.round(lvl * 60); for (let i = 0; i < run; i++) { const x = i < 54 ? 150 - i : 96, y = i < 54 ? 118 : 118 + (i - 54) * 4; D.px(x, y, 'red', 6 + fire * 4, { e: 255 }); D.px(150 + (150 - x), y, 'red', 6 + fire * 4, { e: 255 }); }
    // the tall candle: shrinking flame leaning in the draught near the limit; drowned: a curl of smoke
    const [kx] = AL.candle, hgt = 20; D.beg(); D.rect(kx - 3, 98 - hgt, 7, hgt, 'bone', 8.5); D.vl(kx - 3, 98 - hgt, hgt, 'bone', 10); D.vl(kx + 3, 98 - hgt, hgt, 'bone', 6.5); for (let k = 0; k < 5; k++) D.px(kx + 3, 98 - hgt + 2 + k, 'bone', 7.5); D.end();
    if (!out) { const s = 7 - near * 3, lean = Math.round(near * 3 * Math.sin(t * 31)), hh = Math.round(s * (0.85 + 0.25 * n1(t * (8 + near * 30)))); for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.4)); for (let i = -w + 1; i < w; i++) D.px(kx + i + Math.round(lean * q), 98 - hgt - 1 - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); } }
    else for (let k = 0; k < 16; k++) D.px(kx + Math.round(Math.sin(k * 0.7 + t * 2) * 2), 98 - hgt - 2 - k, 'linen', 6.5 - k * 0.3);
    // the blood stream from the leader's hand to the cup (while pouring)
    if (o.pour) { for (let k = 0; k < 30; k++) { const q = k / 30, x = AL.hero + 12 + (ux - AL.hero - 12) * q, y = 118 - Math.sin(q * Math.PI) * 26 - q * 12 + Math.sin(t * 20 + k) * 0.5; D.px(x, y, 'red', 7 + (k % 3 === 0 ? 1.5 : 0), { e: 255 }); } if (Math.random() < 0.6) rs.burst('blood', ux, uy - 26, 1, { sp: 20, ang: 0, spread: 1.4, life: 0.5, floor: uy - 13 }); }
    if (fire > 0 && Math.random() < fire) rs.burst('ember', 96 + Math.random() * 108, 118, 2, { sp: 26, ang: 0, spread: 0.5, life: 1.3 });
  },
});
const DEMO_AL = { lvl: 0.55, lv: 5, near: 0.4, pour: 1 };

// ═════════════════════ 货郎 · the peddler's cart ═════════════════════
const PD = { x: [90, 150, 210], top: 112, peddler: 150 };
A.PEDDLER = PD;
A.def('mini_peddler', {
  amb: [0.24, 0.3],
  paint(S, sc) {
    [[62, 44], [118, 46], [182, 46], [238, 44]].forEach(([x, y], i) => sc.light({ x, y, z: 12, r: 90, i: 0.85, c: '#ff9a48', fl: 'candle', ph: i * 1.7, tint: 0.5 }));   // 0–3 paper lanterns
    sc.light({ x: 150, y: 100, z: 16, r: 90, i: 1.2, c: '#ffffff', tint: 0, bake: false });   // 4 the reveal (anim)
    S.lay('wall');
    // a night-market alley behind: brick, far stalls as warm blurs of lights, a banner string
    TX.bricks(S, 0, 0, 300, 148, 'brick', 2.8, { bw: 10, bh: 5 }); S.ao(0, 0, 300, 30, 't', 2);
    [[58, 7], [84, 5]].forEach(([y0, sag], w) => { for (let x = 0; x < 300; x++) { const y = y0 + Math.round(Math.sin((x % 100) / 100 * Math.PI) * sag); S.px(x, y, 'ink', 1.5); if (x % 9 === 4) { const c = ['lamp', 'candy', 'teal', 'gold'][(x / 9 + w) % 4 | 0]; S.px(x, y + 1, c, 9, { e: 255 }); S.px(x, y + 2, c, 7, { e: 255 }); } } });
    for (let x = 0; x < 300; x++) { const y = 16 + Math.round(Math.sin(x / 300 * Math.PI) * 10); S.px(x, y, 'ink', 2); if (x % 12 === 0) { S.poly([[x, y], [x + 6, y], [x + 3, y + 6]], ['red', 'gold', 'teal', 'candy'][(x / 12) % 4], 5.5); } }
    for (let y = 148; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'stone', 3 + hash(x >> 2, y >> 1, 3) * 1.2 - (y - 148) * 0.03);
    S.lay('back');
    // the awning: red-and-cream striped canvas with a scalloped edge on two poles
    S.beg(); S.rect(28, 30, 3, 118, 'wood', 4.5); S.rect(269, 30, 3, 118, 'wood', 4); S.end();
    S.beg(); for (let y = 24; y < 40; y++) for (let x = 22; x < 278; x++) { const st = Math.floor((x - 22) / 12) % 2, sag = Math.round(Math.sin((x - 22) / 256 * Math.PI) * 2); S.px(x, y + sag, st ? 'linen' : 'red', (st ? 7.5 : 5.5) + (y < 27 ? 1.2 : 0) - (y > 36 ? 1 : 0)); }
    for (let x = 22; x < 278; x += 12) for (let k = 0; k < 12; k++) { const h = Math.round(Math.sin(k / 12 * Math.PI) * 3); for (let j = 0; j < h; j++) S.px(x + k, 40 + j + Math.round(Math.sin((x + k - 22) / 256 * Math.PI) * 2), Math.floor((x - 22) / 12) % 2 ? 'linen' : 'red', 5); } S.end();
    // goods hanging from the frame: brass bells, a fox mask, a pinwheel stick, dried herbs, small pots
    S.beg(); [[36, 56, 'brass'], [40, 64, 'brass'], [262, 58, 'brass']].forEach(([x, y, m]) => { S.vl(x, 43, y - 43, 'ink', 2); S.ell(x, y, 2.5, 3, m, 7, { dome: 1 }); S.px(x, y + 3, m, 4); }); S.end();
    S.beg(); S.ell(50, 60, 6, 7, 'linen', 8.5, { dome: 1 }); S.poly([[45, 54], [47, 48], [49, 54]], 'linen', 8); S.poly([[51, 54], [53, 48], [55, 54]], 'linen', 8); S.hl(46, 59, 3, 'red', 7); S.hl(52, 59, 3, 'red', 7); S.px(50, 64, 'red', 6); S.vl(50, 43, 10, 'ink', 2); S.end();
    S.beg(); for (let k = 0; k < 5; k++) { S.vl(246 + k * 3, 43, 12 + (k % 2) * 4, 'leaf', 4 + (k % 3)); S.px(246 + k * 3, 55 + (k % 2) * 4, 'sand', 6); } S.end();
    S.beg(); S.vl(20, 40, 50, 'wood', 5); S.end();
    // lantern paper globes with ribs (the flame inside glows with its light)
    [[62, 44], [118, 46], [182, 46], [238, 44]].forEach(([x, y], i) => { S.beg(); S.vl(x, 40, y - 40 - 4, 'ink', 2); S.ell(x, y + 3, 6, 7, 'red', 7, { e: i + 1 }); for (let k = -5; k <= 5; k += 2.5) S.vl(Math.round(x + k), y - 3, 12, 'red', 5, { e: i + 1 }); S.rect(x - 3, y - 5, 7, 2, 'ink', 2); S.rect(x - 3, y + 10, 7, 2, 'ink', 2); S.px(x, y + 13, 'gold', 7); S.vl(x, y + 14, 4, 'gold', 6); S.end(); });
    S.lay('mid');
    // the cart: counter with a crimson velvet cloth, a hanging banner with 货, a spoked wheel, shafts on the ground
    S.beg(); S.box(40, PD.top, 220, 6, 'wood', 5.5, { top: 3 }); S.box(46, PD.top + 6, 208, 26, 'wood', 4.2); for (let x = 50; x < 250; x += 16) S.vl(x, PD.top + 7, 24, 'wood', 3); S.end();
    S.beg(); for (let x = 44; x < 256; x++) { const drape = x < 50 || x > 250 ? 6 : 0; S.vl(x, PD.top - 2, 3 + drape + (x % 7 === 0 ? 1 : 0), 'crimson', 5.5 + Math.sin(x * 0.6) * 0.8); } S.hl(44, PD.top - 2, 212, 'crimson', 7.5); S.end();
    S.beg(); S.rect(134, PD.top + 8, 32, 26, 'linen', 7.5); S.hl(134, PD.top + 8, 32, 'linen', 9); for (let x = 134; x < 166; x += 3) S.px(x + 1, PD.top + 34, 'linen', 5);
    S.ell(150, PD.top + 26, 6, 6, 'red', 5.5); S.ell(150, PD.top + 17, 4, 4, 'red', 5.5); S.rect(149, PD.top + 11, 2, 3, 'red', 4); S.hl(145, PD.top + 21, 10, 'gold', 7); S.px(147, PD.top + 24, 'red', 8); S.end();
    S.beg(); S.ell(68, 150, 12, 12, 'wood', 5, { ring: 2 }); for (let k = 0; k < 8; k++) S.line(68, 150, 68 + Math.cos(k * 0.785) * 11, 150 + Math.sin(k * 0.785) * 11, 'wood', 4.5); S.ell(68, 150, 2.5, 2.5, 'iron', 7, { dome: 1 }); S.end();
    S.beg(); S.line(250, 146, 292, 160, 'wood', 5, { w: 2 }); S.end();
  },
  anim(D, t, rs, o) {
    o = o || DEMO_PD; rs.mul[4] = o.revK || 0; if (o.revC && o.revK) A.glow(rs, o.revX || 150, PD.top - 6, 50, o.revC, o.revK);
    // lantern sway (a few pixels of tassel) and a pinwheel spinning on the left pole
    D.lay('back'); const a = t * 3; for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2; D.line(20, 40, 20 + Math.cos(b) * 5, 40 + Math.sin(b) * 5, ['red', 'gold', 'teal', 'candy'][k], 7); } D.ell(20, 40, 1, 1, 'iron', 8);
    D.lay('mid');
    // three upturned gourds on the velvet: tan skin with a highlight and a red cord at the waist
    (o.gourds || DEMO_PD.gourds).forEach((g, i) => { const x = Math.round(g.x), yb = Math.round(PD.top - 1 - (g.lift || 0) + (g.dy || 0)), sq = g.sy || 1;
      if (g.prize && (g.lift || 0) > 4) { D.beg(); D.ell(x, PD.top - 4, 4, 3, g.gem || 'arcane', 9, { e: 255, dome: 1 }); D.px(x - 1, PD.top - 6, 'linen', 11, { e: 255 }); D.end(); A.glow(rs, x, PD.top - 4, 30, g.gemC || '#b86bff', 0.8); }
      if ((g.lift || 0) > 0 && (g.lift || 0) < 6 && g.crackC) { for (let dx = -8; dx <= 8; dx++) D.px(x + dx, PD.top - 1, 'gold', 10, { e: 255 }); A.glow(rs, x, PD.top - 2, 30, g.crackC, 0.9); }
      D.beg(); const rows = circleRows(10, 9.5, 0, 17).concat([6, 6]).concat(circleRows(6.4, 5.8, 0, 11)).concat([2, 2]), n = Math.round(rows.length * sq);
      for (let k = 0; k < n; k++) { const hw = rows[Math.min(rows.length - 1, Math.floor(k / sq))]; for (let dx = -hw; dx <= hw; dx++) { const u = dx / (hw + 0.5), cord = k === Math.round(18 * sq) || k === Math.round(19 * sq); D.px(x + dx, yb - k, cord ? 'red' : 'sand', cord ? 6.5 - u : 6.8 - u * 2.2 - (k < 2 ? 1.5 : 0) + (dx === -Math.round(hw * 0.5) && k > 3 && k < n - 4 ? 3 : 0) + (hash(dx, k, i) > 0.92 ? -1 : 0), { n: [u * 0.85, -0.2] }); } }
      D.end({ lit: 1 }); });
  },
});
const DEMO_PD = { gourds: [{ x: 90 }, { x: 150, lift: 9, prize: 1 }, { x: 210 }] };

// still life for the gallery: gold omen on the lifted flask, one drained, two bloody
const DEMO_BT = [{ liq: 0 }, { liq: 4, dark: 1 }, { liq: 2, lift: 7, glow: 0.8, gc: '#ffcf4a', open: 0.35 }, { liq: 1, done: 1 }, { liq: 5, dark: 1, crack: 0.45 }, { liq: 3 }];
})();
