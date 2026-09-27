// ==== mc-minipx-a.js ====
(function () {
// Pixel stages for 废弃矿坑 / 午夜转盘 / 水果机 / 抓娃娃 and the full-screen quality reel's cabinet (docs/design.md §7.5.1).
// Drawn by the pixel room engine (mc-pxroom.js) at 1 art px = 4 logical px; the minigames put them on the stage with K.pxr,
// the reel draws its cabinet itself (mc-fx.js M.drawReel).
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, vnoise } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ═════════════ 全屏品质滚轮的机箱：205×160 格、透明底，画在屏幕中央 820×640 ═════════════
// o: { p 滚筒位置（格）, tiles [材质]（每一格两端色签的材质）, chg 0…1 蓄力（灯全灭）, lock 0…1 锁定的闪光, tc 灯泡的材质, lever 0…1, rail 中奖轨的材质, fast 转得快 }
// 滚筒：半径 48 格的圆柱，每格 0.62 弧度（mc-fx.js 画字用同一套，REEL_CYL）
const RC = M.REEL_CYL = { R: 48, step: 0.62, cy: 75, x0: 27, x1: 169, y0: 37, y1: 113, cx: 98 };
X.def('_reel_cab', {
  size: [205, 160], fy: 160, clear: 1, noFrame: 1, noFloor: 1, amb: [0.34, 0.3],
  paint(S, sc) {
    sc.light({ x: 98, y: 72, z: 22, r: 110, i: 0.9, c: '#fff0d0', tint: 0.3 });                               // 0 the window's backlight
    sc.light({ x: 102, y: 0, z: 26, r: 110, i: 0.7, c: '#ff6a8a', tint: 0.45 });                              // 1 marquee glow above
    sc.light({ x: 98, y: 72, z: 26, r: 160, i: 0, c: '#ffffff', tint: 0.55, bake: false });                    // 2 lock flash
    // body: wine enamel in ribbed bands, chrome trim with a bevel, rivet rows, a side face for depth
    S.lay('back');
    S.beg(); S.box(8, 10, 180, 146, 'crimson', 4.6, { side: 4 }); S.end({ lit: 1 });
    for (let y = 14; y < 154; y += 3) S.hl(10, y, 176, 'crimson', 4.2 + ((y / 3) % 2) * 0.5);
    S.noise(10, 12, 176, 142, 1, 5, 17, { only: 'crimson' });
    S.beg(); S.rect(8, 10, 180, 2, 'iron', 9.5); S.rect(8, 154, 180, 2, 'iron', 4.5); S.rect(8, 10, 2, 146, 'iron', 8.5); S.rect(186, 10, 2, 146, 'iron', 4.5); S.end({ none: 1 });
    for (let x = 16; x < 184; x += 12) { TX.rivet(S, x, 14, 'iron', 7); TX.rivet(S, x, 150, 'iron', 6); }
    for (let y = 26; y < 146; y += 12) { TX.rivet(S, 12, y, 'iron', 7); TX.rivet(S, 182, y, 'iron', 6); }
    // the reel window: chrome surround with a lit top-left bevel and a shadowed lip, an ink well behind the drum
    S.beg(); S.box(RC.x0 - 5, RC.y0 - 5, RC.x1 - RC.x0 + 10, RC.y1 - RC.y0 + 10, 'iron', 8); S.rect(RC.x0 - 2, RC.y0 - 2, RC.x1 - RC.x0 + 4, RC.y1 - RC.y0 + 4, 'ink', 1); S.end();
    S.hl(RC.x0 - 5, RC.y0 - 5, RC.x1 - RC.x0 + 10, 'iron', 11); S.vl(RC.x0 - 5, RC.y0 - 5, RC.y1 - RC.y0 + 10, 'iron', 10);
    // coin tray under the window, a coin slot with its lit bezel
    S.beg(); S.box(60, 118, 76, 5, 'iron', 6); S.rect(62, 119, 72, 3, 'ink', 1); S.end();
    // the lever boss (the rod is animated)
    S.beg(); S.box(188, 60, 10, 26, 'iron', 7, { side: 1 }); S.rect(191, 62, 4, 22, 'ink', 1); S.end();
    // message screen: an LCD well with scanlines
    S.beg(); S.box(22, 126, 152, 22, 'iron', 6); S.rect(25, 129, 146, 16, 'night', 1.2); for (let y = 130; y < 145; y += 2) S.hl(25, y, 146, 'night', 2.2); S.end();
  },
  anim(D, t, rs, o) {
    const tiles = o.tiles || ['stone'], N = tiles.length, p = o.p || 0, base = Math.floor(p), fr = p - base, chg = o.chg || 0, R = RC.R;
    D.lay('mid');
    // the drum: every tile a band on a cylinder (shade by its tilt), its quality tag at both ends, a dark seam between tiles
    for (let y = RC.y0; y < RC.y1; y++) { const v = (y + 0.5 - RC.cy) / R, ang = Math.asin(clamp(v, -1, 1)), off = ang / RC.step + fr, k = Math.round(off), idx = ((base + k) % N + N) % N, m = tiles[idx], local = off - k, shade = Math.cos(ang), seam = Math.abs(local) > 0.46;
      for (let x = RC.x0; x < RC.x1; x++) { const tag = x < RC.x0 + 8 || x >= RC.x1 - 8, edge = x === RC.x0 + 8 || x === RC.x1 - 9;
        if (seam) D.px(x, y, 'ink', 1, { e: 255 }); else if (tag) D.px(x, y, m, 3 + shade * 6 + (x === RC.x0 || x === RC.x1 - 8 ? 1.5 : 0), { e: 255 }); else D.px(x, y, 'night', 1 + shade * 2.4 - (edge ? 0.8 : 0), { e: 255 }); } }
    // the drum sinks into shadow at the top and bottom of the window
    for (let x = RC.x0; x < RC.x1; x++) { [RC.y0, RC.y0 + 1, RC.y1 - 1, RC.y1 - 2].forEach((y, i) => { if (i % 2 === 0 || X.bayer(x, y) < 0.5) D.px(x, y, 'ink', 0, { e: 255 }); }); }
    // win rails and arrows (the quality of the tile passing the line, once it slows down)
    const rm = o.rail || 'gold';
    for (let x = RC.x0 - 5; x < RC.x1 + 5; x++) { D.px(x, RC.cy - 20, rm, 8, { e: 255 }); D.px(x, RC.cy - 19, rm, 5, { e: 255 }); D.px(x, RC.cy + 19, rm, 8, { e: 255 }); D.px(x, RC.cy + 20, rm, 5, { e: 255 }); }
    [[RC.x0 - 10, 1], [RC.x1 + 9, -1]].forEach(([x, d]) => { for (let c = 0; c < 4; c++) for (let h = -(6 - c * 1.5); h <= 6 - c * 1.5; h++) D.px(x + d * c, RC.cy + Math.round(h), rm, 9 - c + (h === 0 ? 1 : 0), { e: 255 }); });
    // chase bulbs round the body: faster while the reel runs, dark during a charge, the locked quality's colour after
    const nb = 34, per = 2 * (170 + 136), sp = o.fast ? 18 : o.lock ? 10 : 4;
    for (let i = 0; i < nb; i++) { let d = (i / nb) * per, bx, by; if (d < 170) { bx = 13 + d; by = 22; } else if ((d -= 170) < 136) { bx = 183; by = 22 + d * 0.74; } else if ((d -= 136) < 170) { bx = 183 - d; by = 122; } else { d -= 170; bx = 13; by = 122 - d * 0.74; }
      const on = !chg && (Math.floor(t * sp) + i) % 3 === 0, x = Math.round(bx), y = Math.round(by); D.rect(x - 1, y - 1, 3, 3, 'ink', 0, { e: 255 }); D.rect(x, y, 2, 2, on ? (o.tc || 'lamp') : 'crimson', on ? 10 : 2.4, { e: 255 }); if (on) D.px(x, y, o.tc || 'lamp', 11, { e: 255 }); }
    // lever: steel rod and a red ball, pulled down at the start
    const la = 0.2 + (o.lever || 0) * 2, ex = 193 + Math.sin(la) * 30, ey = 72 - Math.cos(la) * 30;
    D.beg(); D.line(193, 72, ex, ey, 'iron', 9, { w: 2 }); D.ell(ex, ey, 5, 5, 'red', 6, { dome: 1 }); D.px(Math.round(ex) - 2, Math.round(ey) - 2, 'red', 10); D.px(Math.round(ex) - 1, Math.round(ey) - 2, 'red', 9); D.end({ lit: 1 });
    rs.mul[2] = o.lock || 0;
  },
});
// quality colour → a pixel-engine material for the reel's tags, bulbs and rails
const QMAT = [['#c4ccd9', 'stone'], ['#8791a6', 'stone'], ['#6fd46a', 'leaf'], ['#b6f28a', 'leaf'], ['#4f8fff', 'tile'], ['#47d6c1', 'teal'], ['#bff7f0', 'ice'], ['#b86bff', 'arcane'], ['#ff6bd6', 'pink'], ['#ff9a3c', 'fire'], ['#e0781f', 'fire'],
  ['#ffcf4a', 'gold'], ['#fff3b0', 'lamp'], ['#ff4a5a', 'red'], ['#e8434f', 'red'], ['#8c1f3a', 'crimson'], ['#c9a24a', 'brass'], ['#caa84a', 'brass'], ['#6b6570', 'stone'], ['#e0904a', 'copper'], ['#ffcc33', 'gold']];
const hx = (h) => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
M.reelMat = function (col) { const a = hx(M.UI ? M.UI.pal(col) : col); let best = 'stone', bd = 1e9; QMAT.forEach(([c, m]) => { const b = hx(c), d = (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = m; } }); return best; };

// ═════════════ 水果机：后街游戏厅角落的一台老虎机（300×175 格） ═════════════
// symbols are painted with lit primitives, so the lamps and flashes shade them; k: cherry lemon bell bar seven skull; sc = size (1 ≈ 16 cells)
const SYMS = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'skull'];
const FONT3 = { L: ['1..', '1..', '1..', '1..', '111'], U: ['1.1', '1.1', '1.1', '1.1', '111'], C: ['111', '1..', '1..', '1..', '111'], K: ['1.1', '1.1', '11.', '1.1', '1.1'], Y: ['1.1', '1.1', '.1.', '.1.', '.1.'], B: ['11.', '1.1', '11.', '1.1', '11.'], A: ['.1.', '1.1', '111', '1.1', '1.1'], R: ['11.', '1.1', '11.', '1.1', '1.1'], O: ['111', '1.1', '1.1', '1.1', '111'], G: ['111', '1..', '1.1', '1.1', '111'], P: ['11.', '1.1', '11.', '1..', '1..'], E: ['111', '1..', '11.', '1..', '111'], N: ['1.1', '111', '111', '1.1', '1.1'], ' ': ['...', '...', '...', '...', '...'] };
function word(S, s, x, y, m, tn, o) { [...s].forEach((ch, i) => { (FONT3[ch] || FONT3[' ']).forEach((row, j) => [...row].forEach((c, k) => { if (c === '1') S.px(x + i * 4 + k, y + j, m, tn + (j === 0 ? 1 : 0), o); })); }); }
function sym(S, k, cx, cy, sc, d, o) {
  sc = sc || 1; o = o || {}; d = d || 0; const e = o.e, sy = o.sy || 1, P = (x, y) => [cx + x * sc, cy + y * sc * sy];
  const E = (x, y, rx, ry, m, tn, q) => S.ell(cx + x * sc, cy + y * sc * sy, Math.max(0.6, rx * sc), Math.max(0.6, ry * sc * sy), m, tn + d, Object.assign({ e }, q || {}));
  if (k === 'cherry') { S.line(...P(-3, 0), ...P(2, -7), 'leaf', 4 + d, { e }); S.line(...P(3, 1), ...P(2, -7), 'leaf', 5 + d, { e }); E(4, -7, 3, 1.5, 'leaf', 7, { dome: 1 }); E(-3, 2, 4, 4, 'red', 6, { dome: 1 }); E(3, 3, 4, 4, 'red', 5.5, { dome: 1 }); S.px(...P(-5, 0), 'red', 10 + d, { e }); S.px(...P(1, 1), 'red', 10 + d, { e }); }
  else if (k === 'lemon') { E(0, 0, 7, 5, 'gold', 7, { dome: 1 }); S.px(...P(-7, 0), 'gold', 5 + d, { e }); S.px(...P(7, 0), 'gold', 5 + d, { e }); E(-3, -2, 2, 1, 'gold', 10); S.px(...P(2, 2), 'gold', 5 + d, { e }); S.px(...P(-1, 3), 'gold', 5.5 + d, { e }); }
  else if (k === 'bell') { S.poly([P(-6, 5), P(-5, -1), P(-3, -5), P(3, -5), P(5, -1), P(6, 5)], 'gold', 7 + d, { e, n: [0, -0.3] }); S.rect(...P(-7, 4), 14 * sc, Math.max(1, 2 * sc * sy), 'brass', 6 + d, { e }); E(0, 7, 1.6, 1.6, 'brass', 4, { dome: 1 }); S.rect(...P(-3, -3), Math.max(1, sc), 6 * sc * sy, 'gold', 10 + d, { e }); S.px(...P(0, -6), 'gold', 8 + d, { e }); }
  else if (k === 'bar') { S.rect(...P(-8, -4), 16 * sc, Math.max(2, 9 * sc * sy), 'ink', 1, { e: e ? 255 : 0 }); S.rect(...P(-7, -3), 14 * sc, Math.max(1, 7 * sc * sy), 'night', 3 + d, { e }); S.hl(...P(-7, -3), 14 * sc, 'gold', 8 + d, { e }); S.hl(...P(-7, 3), 14 * sc, 'gold', 6 + d, { e }); if (sc >= 1 && sy > 0.7) word(S, 'BAR', cx - 5, cy - 2, 'gold', 8 + d, { e }); }
  else if (k === 'seven') { const pts = [[-6, -6], [6, -6], [6, -3], [0, 6], [-4, 6], [2, -3], [-6, -3]]; S.poly(pts.map(([x, y]) => P(x + 1, y + 1)), 'ink', 1, { e: e ? 255 : 0 }); S.poly(pts.map(([x, y]) => P(x, y)), 'red', 6.5 + d, { e, n: [-0.3, -0.4] }); S.hl(...P(-5, -5), 10 * sc, 'red', 10 + d, { e }); S.line(...P(4, -3), ...P(-1, 5), 'red', 4 + d, { e }); }
  else if (k === 'skull') { E(0, -1, 6, 5.5, 'bone', 8, { dome: 1 }); S.rect(...P(-3, 4), 7 * sc, Math.max(1, 3 * sc * sy), 'bone', 7 + d, { e }); E(-2.5, -1, 1.8, 1.8, 'ink', 1); E(2.5, -1, 1.8, 1.8, 'ink', 1); S.px(...P(0, 2), 'ink', 1, { e }); [-2, 0, 2].forEach(x => S.px(...P(x, 6), 'ink', 2, { e })); }
}
M.MKSYM = sym;
const FR = M.FRUIT_PX = { x0: 82, x1: 218, RW: [[104, 132], [136, 164], [168, 196]], ry0: 62, ry1: 106, line: 84, gogo: [204, 32], lever: [226, 90], tray: [150, 136], pay: { x: 16, y: 46, dy: 16, tx: 44 }, lcd: [104, 118, 36, 8] };
const STRIP = M.FRUIT_STRIP || [0, 1, 2, 0, 3, 1, 4, 0, 2, 5, 1, 3];   // the reel strip is the game's (mc-mini-a.js)
X.def('_mg_fruit', {
  size: [300, 175], fy: 160, noFrame: 1, bootK: 1.8, amb: [0.18, 0.2],
  paint(S, sc) {
    const r = S.r;
    sc.light({ x: 150, y: 36, z: 22, r: 110, i: 1.0, c: '#ff5aa0', fl: 'buzz', ph: 2, tint: 0.55 });        // 0 the 777 neon
    sc.light({ x: 150, y: 84, z: 16, r: 70, i: 0.9, c: '#fff4d0', fl: 'pulse', amp: 0.06, sp: 2.2, tint: 0.3 });   // 1 reel backlight
    sc.light({ x: 270, y: 16, z: 12, r: 80, i: 0.9, c: '#40e0d0', fl: 'buzz', ph: 6, tint: 0.6 });           // 2 OPEN sign
    sc.light({ x: 150, y: 142, z: 14, r: 60, i: 0.55, c: '#ffcf60', tint: 0.5 });                            // 3 coin tray lamp
    sc.light({ x: 150, y: 84, z: 20, r: 170, i: 0, c: '#ffd040', tint: 0.6, bake: false });                  // 4 win flash
    sc.light({ x: FR.gogo[0], y: FR.gogo[1], z: 12, r: 70, i: 0, c: '#ffcf4a', tint: 0.6, bake: false });   // 5 GOGO
    sc.light({ x: 272, y: 46, z: 30, r: 120, i: 0.55, c: '#a8b8ff', tint: 0.4 });                            // 6 street light through the back door
    sc.light({ x: 40, y: 30, z: 18, r: 80, i: 0.75, c: '#ffc070', fl: 'candle', ph: 4, tint: 0.45 });        // 7 lamp over the pay board
    // ── the back room: soot-dark bricks, a back door with a streetlamp outside, an OPEN sign over it ──
    S.lay('wall'); TX.bricks(S, 0, 0, 300, 160, 'brick', 3.4, { bw: 11, bh: 5, v: 1.2, chip: 0.2 }); S.noise(0, 0, 300, 160, 1, 6, 12); S.ao(0, 0, 300, 30, 't', 2);
    S.beg(); S.box(248, 30, 44, 130, 'wood', 3.2); S.rect(252, 34, 36, 126, 'night', 3); for (let y = 36; y < 158; y++) for (let x = 254; x < 286; x++) if (y < 90) S.px(x, y, 'night', 3 + (y - 36) * 0.02 + (X.bayer(x, y) < 0.08 ? 3 : 0)); S.rect(254, 90, 32, 68, 'stone', 3); S.end();
    for (let y = 96; y < 158; y += 7) S.hl(254, y, 32, 'stone', 4.5);
    S.px(272, 46, 'glass', 11, { e: 255 }); S.px(271, 46, 'glass', 8, { e: 255 }); S.px(273, 46, 'glass', 8, { e: 255 }); S.vl(272, 47, 43, 'iron', 3);
    for (let x = 250; x < 291; x++) { S.px(x, 7, 'iron', 4); S.px(x, 25, 'iron', 3); } for (let y = 7; y < 26; y++) { S.px(250, y, 'iron', 4); S.px(290, y, 'iron', 3); }
    word(S, 'OPEN', 262, 13, 'teal', 10, { e: 3 }); for (let x = 254; x < 287; x++) { S.px(x, 10, 'teal', 5, { e: 3 }); S.px(x, 21, 'teal', 5, { e: 3 }); }
    // the pay board: a wood frame round a dark slate, a lamp on an arm above it (the numbers are crisp text drawn by the game)
    S.beg(); S.box(8, 36, 64, 108, 'wood', 5, { side: 2 }); S.rect(11, 39, 58, 102, 'night', 2.2); S.end(); S.noise(11, 39, 58, 102, 1, 4, 3, { only: 'night' });
    for (let i = 0; i < 6; i++) { const y = FR.pay.y + i * FR.pay.dy; sym(S, SYMS[[4, 3, 2, 1, 0, 5][i]], FR.pay.x + 6, y, 0.62, 0.5); if (i < 5) for (let x = 13; x < 67; x += 2) S.px(x, y + 8, 'night', 3.4); }
    S.beg(); S.line(40, 36, 40, 26, 'iron', 5); S.line(40, 26, 36, 24, 'iron', 5); S.poly([[30, 22], [44, 22], [42, 26], [32, 26]], 'iron', 5); S.hl(32, 26, 10, 'lamp', 10, { e: 7 + 1 }); S.end();
    // a power socket with the machine's plug in it
    S.beg(); S.box(236, 126, 8, 10, 'linen', 6); S.rect(238, 129, 4, 5, 'ink', 1); S.rect(239, 128, 2, 4, 'iron', 7); S.end();
    // ── the machine ──
    S.lay('mid'); const x0 = FR.x0, x1 = FR.x1;
    S.beg(); S.box(x0 - 4, 150, x1 - x0 + 8, 10, 'iron', 3, { top: 2 }); S.box(x0, 40, x1 - x0, 110, 'crimson', 5.2, { side: 3 });
    for (let y = 44; y < 148; y += 6) S.hl(x0 + 2, y, 3, 'crimson', 7); S.vl(x0 + 1, 40, 110, 'crimson', 8, { n: [-0.8, 0] }); S.vl(x1 - 2, 40, 110, 'crimson', 3, { n: [0.8, 0] }); S.end({ lit: 1 });
    S.noise(x0 + 4, 42, x1 - x0 - 8, 106, 1, 5, 9, { only: 'crimson' });
    // topper: a rounded arch of chrome with a dark marquee panel for the neon
    S.beg(); for (let y = 20; y < 42; y++) for (let x = x0 + 2; x < x1 - 2; x++) { const u = (x - 150) / 66, top = 20 + Math.round(12 * (1 - Math.sqrt(Math.max(0, 1 - u * u)))); if (y < top) continue; const rim = y < top + 3 || x < x0 + 5 || x > x1 - 6; S.px(x, y, rim ? 'iron' : 'crimson', rim ? 8.5 - (y - top) * 0.4 : 2.6, { n: rim ? [u * 0.4, -0.7] : [0, 0] }); } S.end({ lit: 1 });
    // chrome frame round the reels (lit top-left, a shadow lip), the reel drums (the symbols are animated)
    S.beg(); S.box(98, 54, 104, 60, 'iron', 7.5, { bev: 1 }); S.rect(100, 56, 100, 56, 'iron', 4); S.end(); S.hl(98, 54, 104, 'iron', 10.5); S.vl(98, 54, 60, 'iron', 9.5);
    FR.RW.forEach(([a, b]) => { for (let y = FR.ry0; y < FR.ry1; y++) for (let x = a; x < b; x++) { const v = (y - (FR.ry0 + FR.ry1) / 2) / ((FR.ry1 - FR.ry0) / 2), sh = 1 - v * v; S.px(x, y, 'paper', 4.5 + sh * 5, { n: [0, v * 0.8] }); } for (let y = FR.ry0; y < FR.ry1; y++) { S.px(a - 1, y, 'ink', 1); S.px(b, y, 'ink', 1); } });
    // coin panel: an LCD for the pulls left (crisp text over it), the coin slot, two buttons
    S.beg(); S.box(98, 116, 104, 12, 'iron', 6); S.rect(FR.lcd[0], FR.lcd[1], FR.lcd[2], FR.lcd[3], 'screen', 2, { e: 255 }); for (let x = FR.lcd[0]; x < FR.lcd[0] + FR.lcd[2]; x += 2) S.px(x, FR.lcd[1], 'screen', 3, { e: 255 }); S.rect(145, 119, 10, 2, 'ink', 1); S.hl(145, 121, 10, 'iron', 9); S.end();
    S.beg(); S.ell(178, 122, 4, 3, 'red', 7, { dome: 1 }); S.ell(192, 122, 4, 3, 'gold', 7, { dome: 1 }); S.end({ lit: 1 });
    // payout chute and coin tray right under the coin panel, chrome lip
    S.beg(); S.box(114, 130, 72, 10, 'iron', 4); S.rect(116, 132, 68, 7, 'ink', 1); S.hl(114, 130, 72, 'iron', 10); S.rect(142, 128, 16, 2, 'ink', 1); S.end();
    // belly glass: a strip of cherries and sevens lit from behind
    S.beg(); S.box(100, 142, 100, 8, 'iron', 7.5); S.rect(102, 143, 96, 6, 'crimson', 2, { e: 255 }); S.end();
    for (let i = 0; i < 8; i++) sym(S, i % 2 ? 'seven' : 'cherry', 108 + i * 12, 146, 0.3, 1, { e: 255 });
    // the lever's chrome boss on the right side
    S.beg(); S.box(x1 + 3, 78, 10, 24, 'iron', 7, { side: 1 }); S.rect(x1 + 6, 80, 4, 20, 'ink', 1); S.end();
    // the plug cable from the base to the socket
    S.beg(); for (let x = x1 + 4; x < 238; x++) { const k = (x - x1 - 4) / (238 - x1 - 4), y = 156 + Math.sin(k * Math.PI) * 6 - k * 24; S.px(x, Math.round(y), 'hair', 3); S.px(x, Math.round(y) + 1, 'hair', 2); } S.end();
    // floor: wet concrete with a puddle catching the neon
    S.lay('wall'); for (let y = 160; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'stone', 3.2 + (vnoise(x / 6, y / 2, 3) - 0.5) * 1.2 + (y === 160 ? 1.5 : 0));
    for (let y = 164; y < 172; y++) for (let x = 20; x < 90; x++) { const u = (x - 55) / 35, v = (y - 168) / 4; if (u * u + v * v < 1) S.px(x, y, 'water', 2.5 + (1 - v * v) * 1.5, { n: [0, -0.9] }); }
    sc.emit({ k: 'spark', x: 240, y: 131, rate: 0.4, sp: 18, ang: -0.6, spread: 1, life: 0.4, floor: 160 });
    sc.emit({ k: 'dust', x: 272, y: 60, w: 30, h: 60, rate: 1, sp: 2, life: 4 });
    sc.emit({ k: 'dust', x: 40, y: 50, w: 50, h: 60, rate: 0.8, sp: 2, life: 4 });
  },
  anim(D, t, rs, o) {
    const reels = o.reels || [{ pos: 0 }, { pos: 4 }, { pos: 8 }], dark = o.dark || 0;
    D.lay('mid');
    // LUCKY 777 in neon tubes; a super reach strobes the sevens red / gold; a zap blacks it out
    if (dark < 0.5) { word(D, 'LUCKY', 140, 26, 'pink', 10, { e: 1 }); const sev = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 2], [3, 3], [2, 4], [2, 5], [2, 6]], sm = o.neon === 'strobe' ? (Math.floor(t * 10) % 2 ? 'gold' : 'red') : 'red';
      [128, 144, 160].forEach((x, i) => sev.forEach(([a, b]) => { D.rect(x + a * 2, 33 + b * 2, 2, 2, sm, 9 + (b === 0 ? 1 : 0), { e: 1 }); D.px(x + a * 2 + 1, 34 + b * 2, sm, 6, { e: 1 }); })); }
    // GOGO lamp
    const go = o.gogo ? 1 : 0, gb = go && Math.floor(t * 10) % 2; D.beg(); D.ell(FR.gogo[0], FR.gogo[1], 7, 5, go ? (gb ? 'lamp' : 'gold') : 'crimson', go ? 10 : 3, { dome: 1, e: go ? 255 : 0 }); D.hl(FR.gogo[0] - 4, FR.gogo[1] + 5, 9, 'iron', 7); D.end(); word(D, 'GO', FR.gogo[0] - 4, FR.gogo[1] - 2, go ? 'ink' : 'crimson', go ? 1 : 5, { e: 255 });
    // reels: symbols wrap round a drum (squashed near the top and bottom); a fast reel smears; a winning one pulses
    reels.forEach((rl, i) => { const [a, b] = FR.RW[i], cx = (a + b) / 2, cy = FR.line, base = Math.floor(rl.pos), fr = rl.pos - base;
      for (let k = -2; k <= 2; k++) { const s = STRIP[(((base + k) % 12) + 12) % 12], ang = (k - fr) * 0.55; if (Math.abs(ang) > 1.3) continue; const y = cy + Math.sin(ang) * 26, sy = Math.cos(ang);
        if (rl.fast) { for (let g = 2; g >= 0; g--) { const yy = y + g * 5; if (yy < FR.ry0 + 2 || yy > FR.ry1 - 2) continue; sym(D, SYMS[s], cx, Math.round(yy), 1, -2 - g * 1.6, { sy: sy * 1.25 }); } }
        else if (y > FR.ry0 + 2 && y < FR.ry1 - 2) { const on = k === 0 ? rl.k || 1 : 1; sym(D, SYMS[s], cx, Math.round(y), on, (sy - 1) * 4 + (rl.win && k === 0 ? 2.5 : 0) - (rl.dim ? 2 : 0), { sy }); } }
      // the drum sinks into shadow at its top and bottom edge; a stop flashes the window frame white
      for (let x = a; x < b; x++) { D.px(x, FR.ry0, 'ink', 1, { e: 255 }); D.px(x, FR.ry1 - 1, 'ink', 1, { e: 255 }); if (X.bayer(x, FR.ry0 + 1) < 0.5) D.px(x, FR.ry0 + 1, 'ink', 1, { e: 255 }); if (X.bayer(x, FR.ry1 - 2) < 0.5) D.px(x, FR.ry1 - 2, 'ink', 1, { e: 255 }); }
      const sf = rl.sf || 0, wf = rl.win && Math.floor(t * 8) % 2; if (sf > 0.2 || wf) { const m = wf ? 'gold' : 'linen', tn = wf ? 10 : 10; for (let x = a - 2; x < b + 2; x++) { D.px(x, FR.ry0 - 2, m, tn, { e: 255 }); D.px(x, FR.ry1 + 1, m, tn, { e: 255 }); } for (let y = FR.ry0 - 2; y < FR.ry1 + 2; y++) { D.px(a - 2, y, m, tn, { e: 255 }); D.px(b + 1, y, m, tn, { e: 255 }); } } });
    // payline
    const pm = o.flash ? (Math.floor(t * 12) % 2 ? 'lamp' : 'gold') : o.tense ? 'gold' : 'red'; for (let x = 100; x < 200; x++) D.px(x, FR.line, pm, 8, { e: 255 });
    // the pay board: the row that just paid blinks
    if (o.payHit != null && Math.floor(t * 8) % 2) { const y = FR.pay.y + o.payHit * FR.pay.dy; for (let x = 12; x < 68; x++) { D.px(x, y - 7, 'gold', 9, { e: 255 }); D.px(x, y + 7, 'gold', 9, { e: 255 }); } for (let yy = y - 7; yy <= y + 7; yy++) { D.px(12, yy, 'gold', 9, { e: 255 }); D.px(67, yy, 'gold', 9, { e: 255 }); } }
    // a coin going into the slot as the lever drops
    if (o.ins != null && o.ins < 1) { const y = Math.round(110 + o.ins * 10); if (o.ins < 0.8) { D.beg(); D.rect(148, y, 4, 2, 'gold', 9); D.px(148, y, 'gold', 11); D.end({ none: 1 }); } }
    // coins in the tray (the pile grows over the session) and coins dropping out of the chute
    const pile = Math.min(96, o.pile || 0); for (let i = 0; i < pile; i++) { const row = Math.floor(i / 16), x = 118 + ((i * 7) % 62) + (row % 2) * 2, y = 138 - row; D.rect(x, y, 3, 1, 'gold', 8 - (i % 3), { e: 0 }); D.px(x, y, 'gold', 10); }
    (o.drops || []).forEach(c => { D.beg(); D.rect(Math.round(c.x) - 1, Math.round(c.y), 3, 2, 'gold', 8); D.px(Math.round(c.x) - 1, Math.round(c.y), 'gold', 11); D.end({ none: 1 }); });
    // the lever: rod and red ball; pulled down by o.lever (0 up … 1 down); flashes white where it was grabbed
    const la = 0.18 + (o.lever || 0) * 2.2 + (o.sway || 0), lx = FR.lever[0], ly = FR.lever[1], ex = lx + Math.sin(la) * 34, ey = ly - Math.cos(la) * 34, kn = (o.knob || 1) * 5;
    D.beg(); D.line(lx, ly, ex, ey, 'iron', 9, { w: 2 }); D.ell(ex, ey, kn, kn, (o.leverW || 0) > 0.4 ? 'linen' : 'red', (o.leverW || 0) > 0.4 ? 10 : 6, { dome: 1 }); D.px(Math.round(ex) - 2, Math.round(ey) - 2, 'red', 10); D.end({ lit: 1 });
    // chase bulbs round the topper arch and down the sides (the stage's lamp mood: faster when tense, the prize colour on a win)
    const L = o.L, sp = (L && L.sp) || 1, strobe = L && L.strobe ? Math.floor(t * 3) % 2 : -1;
    for (let i = 0; i < 22; i++) { const a = Math.PI * (1 - i / 21), bx = Math.round(150 + Math.cos(a) * 62), by = Math.round(38 - Math.sin(a) * 13); const on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(t * 8 * sp) + i) % 3 === 0; D.rect(bx - 1, by - 1, 2, 2, on ? 'lamp' : 'brass', on ? 11 : 4, { e: on ? 255 : 0 }); }
    for (let i = 0; i < 16; i++) { const y = 46 + i * 6.5, on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(t * 8 * sp) + i) % 3 === 0; [FR.x0 - 2, FR.x1 + 1].forEach(x => D.rect(x, Math.round(y), 2, 2, on ? 'lamp' : 'brass', on ? 11 : 4, { e: on ? 255 : 0 })); }
    rs.mul[4] = (o.flash || 0) * 1.3; rs.mul[5] = go ? 1.4 + Math.sin(t * 20) * 0.4 : 0; rs.mul[0] = (o.neon === 'strobe' ? 1.4 : 1) * (1 - dark); rs.mul[1] = 1 - dark * 0.8; rs.mul[3] = 1 - dark * 0.8; rs.mul[7] = 1 - dark * 0.6;
  },
});
})();
