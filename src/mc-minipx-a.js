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

// ═════════════ 午夜转盘：地下赌场，前后两层（荷官站在中间：幕布之后、赌桌之前） ═════════════
// the wheel is seen from above at an angle: centre (WX, WY), radii WRX × WRY; 14 pockets, 0 = 金 · 7 = 骷髅 · odd = 红 · even = 黑
const RL = M.ROUL_PX = { WX: 204, WY: 124, WRX: 60, WRY: 25, N: 14, top: 100, spots: { r: [66, 147], b: [104, 147], g: [142, 147] }, rack: [81, 108], board: [252, 18], cr: [124, 121] };   // cr: the croupier's feet — his waist (21 cells up) sits on the table top
const secM = (i) => (i === 0 ? ['gold', 8.5] : i === 7 ? ['bone', 4] : i % 2 ? ['red', 6.5] : ['night', 2.6]);
const roulLights = (sc) => {
  sc.light({ x: RL.WX - 10, y: 70, z: 30, r: 120, i: 1.25, c: '#ffd68a', fl: 'candle', ph: 1, tint: 0.45 });   // 0 the lamp over the table
  sc.light({ x: 150, y: 12, z: 20, r: 120, i: 0.7, c: '#ffc070', fl: 'candle', ph: 3, tint: 0.4 });          // 1 chandelier
  sc.light({ x: 26, y: 58, z: 14, r: 60, i: 0.8, c: '#ffae50', fl: 'candle', ph: 5, tint: 0.5 });            // 2 sconce left
  sc.light({ x: 274, y: 58, z: 14, r: 60, i: 0.8, c: '#ffae50', fl: 'candle', ph: 7, tint: 0.5 });           // 3 sconce right
  sc.light({ x: RL.WX, y: RL.WY, z: 16, r: 90, i: 0, c: '#ffdc60', tint: 0.6, bake: false });                 // 4 the pocket that won
  sc.light({ x: RL.WX, y: RL.WY, z: 16, r: 90, i: 0, c: '#ff4a4a', tint: 0.6, bake: false });                 // 5 the skull pocket
};
X.def('_mg_roul_back', {
  size: [300, 175], fy: 175, noFrame: 1, noFloor: 1, bootK: 1.6, amb: [0.16, 0.18],
  paint(S, sc) {
    roulLights(sc);
    // velvet curtains in deep folds, a gold-fringed valance
    S.lay('wall');
    for (let y = 0; y < 175; y++) for (let x = 0; x < 300; x++) { const f = Math.sin(x * 0.42 + Math.sin(y * 0.03) * 0.8), nx = Math.cos(x * 0.42) * 0.8; S.px(x, y, 'crimson', 3.2 + f * 1.3 - y * 0.008 + (vnoise(x / 3, y / 9, 2) - 0.5) * 0.5, { n: [nx, 0] }); }
    for (let x = 0; x < 300; x++) { const sag = Math.round(3 + Math.sin(x / 300 * Math.PI * 6) * 3); for (let y = 0; y < 10 + sag; y++) S.px(x, y, 'crimson', 5 + (y < 2 ? 1 : 0) - y * 0.12, { n: [0, -0.4] }); S.px(x, 10 + sag, 'gold', 8, { n: [0, -0.6] }); if (x % 3 === 0) { S.px(x, 11 + sag, 'gold', 6); S.px(x, 12 + sag, 'gold', 5 + (x % 6 ? 0 : 2)); if (x % 6 === 0) S.px(x, 13 + sag, 'gold', 7); } }
    // sconces and the chandelier (flames are glow pixels that breathe with their lights)
    [[26, 2], [274, 3]].forEach(([x, li]) => { S.beg(); S.box(x - 3, 60, 7, 4, 'brass', 6); S.line(x, 64, x, 70, 'brass', 5); S.cyl(x - 1, 54, 3, 6, 'paper', 8, { rim: 1 }); S.end(); S.px(x, 52, 'fire', 9, { e: li + 1 }); S.px(x, 51, 'fire', 11, { e: li + 1 }); S.px(x, 53, 'fire', 7, { e: li + 1 }); });
    S.lay('back'); S.beg(); S.vl(150, 0, 6, 'brass', 5); S.ell(150, 10, 18, 3, 'brass', 6, { ring: 1.2 }); S.hl(133, 10, 35, 'brass', 8);
    [-16, -8, 0, 8, 16].forEach((d, i) => { S.vl(150 + d, 5, 5, 'brass', 7 - (i % 2)); S.cyl(150 + d - 1, 2, 3, 3, 'paper', 8); }); S.poly([[146, 12], [154, 12], [150, 20]], 'brass', 7); S.end();
    [-16, -8, 0, 8, 16].forEach(d => { S.px(150 + d, 1, 'fire', 10, { e: 2 }); S.px(150 + d, 0, 'fire', 8, { e: 2 }); });
    for (let k = 0; k < 7; k++) S.px(140 + k * 3, 21 + (k % 2), 'glass', 10, { e: 255 });
    // the lamp over the wheel: a green shade on a chain
    S.beg(); S.vl(RL.WX - 10, 0, 44, 'brass', 5); S.poly([[RL.WX - 24, 56], [RL.WX + 4, 56], [RL.WX - 3, 44], [RL.WX - 17, 44]], 'leaf', 5, { n: [0, -0.5] }); S.hl(RL.WX - 24, 56, 29, 'brass', 8); S.hl(RL.WX - 17, 44, 15, 'brass', 7); S.end();
    for (let x = RL.WX - 22; x < RL.WX + 3; x++) S.px(x, 57, 'lamp', 10, { e: 1 });
    // the history board: a brass frame with a column of lamp slots (lit ones are animated), room for the net under it
    const [bx, by] = RL.board; S.beg(); S.box(bx, by, 34, 72, 'wood', 3, { side: 2 }); S.rect(bx + 3, by + 3, 28, 66, 'ink', 1); S.hl(bx, by, 34, 'brass', 8); S.hl(bx, by + 71, 34, 'brass', 5); S.end();
    for (let i = 0; i < 10; i++) { const y = by + 9 + i * 6; S.rect(bx + 6, y, 22, 4, 'night', 2); S.hl(bx + 6, y, 22, 'night', 3.5); }
    S.beg(); S.box(bx - 2, by + 76, 38, 12, 'wood', 3); S.rect(bx + 1, by + 78, 32, 8, 'ink', 1); S.end();
    sc.emit({ k: 'dust', x: RL.WX - 10, y: 70, w: 40, h: 40, rate: 1.4, sp: 2, life: 4 });
  },
  anim(D, t, rs, o) {
    const [bx, by] = RL.board; D.lay('back');
    (o.hist || []).slice(-10).reverse().forEach((h, i) => { const y = by + 9 + i * 6, [m, tn] = { r: ['red', 7], b: ['iron', 5], g: ['gold', 9], x: ['bone', 6] }[h], fresh = i === 0 && o.histT != null && o.histT < 0.6 && Math.floor(o.histT * 10) % 2; D.rect(bx + 7, y, 20, 3, fresh ? 'linen' : m, fresh ? 10 : tn + (i === 0 ? 1.5 : 0), { e: 255 }); D.px(bx + 8, y, m, tn + 3, { e: 255 }); });
    rs.mul[4] = o.glow || 0; rs.mul[5] = o.skull || 0;
  },
});
X.def('_mg_roul_front', {
  size: [300, 175], fy: 175, clear: 1, noFrame: 1, noFloor: 1, bootK: 1.6, amb: [0.16, 0.18],
  paint(S, sc) {
    roulLights(sc);
    // the table: padded leather rail, green felt in perspective
    S.lay('mid');
    const top = RL.top, bot = 172, xl = (y) => 36 - (y - top) * 0.45, xr = (y) => 264 + (y - top) * 0.45;
    for (let y = top; y < bot; y++) for (let x = Math.floor(xl(y)); x < Math.ceil(xr(y)); x++) { const edge = y < top + 3 || x < xl(y) + 4 || x > xr(y) - 4; S.px(x, y, edge ? 'leather' : 'leaf', edge ? 5.2 - (y < top + 1 ? -1 : 0) : 3.4 + (vnoise(x / 6, y / 6, 8) - 0.5) * 0.5, { n: edge ? [0, -0.6] : [0, -0.9] }); }
    // the felt's printed layout: gold lines round the three bet spots
    for (let x = 48; x < 160; x++) { S.px(x, 131, 'gold', 6.5); if (x % 2) S.px(x, 162, 'gold', 5); }
    const spot = (cx, cy, m, tn) => { for (let y = -8; y <= 8; y++) for (let x = -18; x <= 18; x++) { const d = Math.abs(x) / 18 + Math.abs(y) / 8; if (d > 1) continue; S.px(cx + x, cy + y, d > 0.84 ? 'gold' : m, d > 0.84 ? 7 : tn - d * 0.8); } };
    spot(...RL.spots.r, 'red', 5); spot(...RL.spots.b, 'night', 2.6); spot(...RL.spots.g, 'gold', 6.5);
    // a star in the gold spot
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; S.line(RL.spots.g[0], RL.spots.g[1], RL.spots.g[0] + Math.round(Math.cos(a) * 5), RL.spots.g[1] + Math.round(Math.sin(a) * 3), 'gold', 9); }
    // chip rack on the dealer side
    const [rx, ry] = RL.rack; S.beg(); S.box(rx - 25, ry - 4, 50, 9, 'wood', 5, { top: 2 }); [['red', 6], ['night', 3], ['teal', 6], ['gold', 7], ['candy', 7], ['red', 5], ['iron', 8]].forEach(([m, tn], i) => { S.hcyl(rx - 23 + i * 7, ry - 3, 6, 7, m, tn); S.hl(rx - 23 + i * 7, ry - 3, 6, m, tn + 2.5); }); S.end();
    // an ashtray with a cigar
    S.beg(); S.ell(44, 110, 5, 2, 'glass', 5, { ring: 1 }); S.hl(42, 108, 6, 'sand', 6); S.px(47, 108, 'fire', 9, { e: 255 }); S.end();
    // the wheel's bowl: dark mahogany sunk into the felt (the spinning part is animated)
    for (let y = RL.WY - RL.WRY - 4; y <= RL.WY + RL.WRY + 5; y++) for (let x = RL.WX - RL.WRX - 6; x <= RL.WX + RL.WRX + 6; x++) { const u = (x - RL.WX) / (RL.WRX + 6), v = (y - RL.WY) / (RL.WRY + 4.5); const d = u * u + v * v; if (d > 1) continue; S.px(x, y, 'wood', 3.2 + (v < 0 ? 1.4 : -0.6) - d, { n: [u * 0.4, v * 0.6 - 0.4] }); }
    // the carved apron under the rail, near the eye
    S.lay('front');
    for (let x = 0; x < 300; x++) { const y0 = 168; for (let y = y0; y < 175; y++) S.px(x, y, 'wood', 4 + (y === y0 ? 2 : 0) - (x % 24 === 0 ? 1.5 : 0) + ((x % 24) === 12 && y > y0 + 1 ? 1.2 : 0)); }
    S.beg(); for (let x = 6; x < 300; x += 24) S.ell(x + 6, 172, 3, 2, 'brass', 7, { dome: 1 }); S.end();
    sc.emit({ k: 'steam', x: 47, y: 106, rate: 0.35, sp: 3, ang: 0.3, spread: 0.3, life: 3.4 });   // cigar smoke
  },
  anim(D, t, rs, o) {
    const rot = o.rot || 0, step = Math.PI * 2 / RL.N, fast = Math.abs(o.spin || 0) > 5;
    D.lay('mid');
    // the spinning part: ball track with brass diamonds, pocket ring with frets, the cone and the brass turret; a fast wheel smears its pockets
    for (let y = RL.WY - RL.WRY; y <= RL.WY + RL.WRY; y++) for (let x = RL.WX - RL.WRX; x <= RL.WX + RL.WRX; x++) {
      const u = (x + 0.5 - RL.WX) / RL.WRX, v = (y + 0.5 - RL.WY) / RL.WRY, d = Math.sqrt(u * u + v * v); if (d > 1) continue;
      const ang = Math.atan2(v, u), near = v > 0;
      if (d > 0.9) { D.px(x, y, 'wood', 7 + (near ? -1.5 : 1) + (d > 0.97 ? 1.5 : 0), { n: [u * 0.3, -0.7] }); continue; }
      if (d > 0.76) { const dia = Math.abs(((ang * 8 / Math.PI) % 1 + 1) % 1 - 0.5) < 0.06 && d > 0.8 && d < 0.86; D.px(x, y, dia ? 'brass' : 'wood', dia ? 10 : 5.5 + (near ? 1 : -0.5) - (d - 0.76) * 6, { n: [-u * 0.5, near ? -0.2 : -0.8] }); continue; }
      if (d > 0.5) { const sm = fast && X.bayer(x, y) < 0.5 ? step * 0.5 : 0, a = (((ang - rot + sm) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2), i = Math.floor(a / step), fr = a / step - i; const [m, tn] = secM(i), lit = o.glowSec === i && Math.floor(t * 8) % 2;
        if ((fr < 0.07 && !fast) || d < 0.53 || d > 0.73) D.px(x, y, 'brass', near ? 8 : 6); else D.px(x, y, lit ? (m === 'night' ? 'linen' : m) : m, tn + (near ? 0.5 : -0.3) + (d > 0.66 ? 0.6 : 0) + (lit ? 3 : 0), { n: [0, -0.8], e: lit || (m === 'gold') ? 255 : 0 }); continue; }
      if (d > 0.2) { const spoke = Math.abs(Math.sin((ang - rot) * 2)) < 0.12; D.px(x, y, spoke ? 'brass' : 'wood', spoke ? 8 : 4 + d * 3, { n: [u * 0.6, v * 0.6 - 0.3] }); continue; }
      D.px(x, y, 'brass', 7 + (1 - d / 0.2) * 3, { n: [u * 0.5, v * 0.5 - 0.3] });
    }
    // the ball: ivory, a shadow under it, a trail when it flies round the track
    const b = o.ball; if (b) { const bx = RL.WX + Math.cos(b.a) * b.r * RL.WRX, by = RL.WY + Math.sin(b.a) * b.r * RL.WRY, BX = Math.round(bx), BY = Math.round(by - (b.h || 0));
      if (b.trail) for (let k = 1; k <= 3; k++) { const a2 = b.a + b.trail * k * 0.07; D.px(Math.round(RL.WX + Math.cos(a2) * b.r * RL.WRX), Math.round(RL.WY + Math.sin(a2) * b.r * RL.WRY), 'bone', 8 - k * 1.5, { e: 255 }); }
      D.hl(BX - 1, Math.round(by) + 2, 3, 'ink', 1); D.beg(); D.rect(BX - 1, BY - 1, 3, 3, 'bone', 9); D.px(BX - 1, BY - 1, 'bone', 11); D.px(BX + 1, BY + 1, 'bone', 6); D.end({ lit: 1 }); }
    // the bet spots: hover lifts the gold edge, the chosen spot glows
    ['r', 'b', 'g'].forEach(k => { const [cx, cy] = RL.spots[k], on = o.hov === k || o.bet === k; if (!on) return; for (let y = -9; y <= 9; y++) for (let x = -19; x <= 19; x++) { const d = Math.abs(x) / 19 + Math.abs(y) / 9; if (d > 1 || d < 0.86) continue; D.px(cx + x, cy + y, 'gold', o.bet === k ? 10 : 8.5, { e: 255 }); } });
    // the chip stack (its own position: it slides on to the spot, and off to the rack when the house takes it)
    const c = o.stack; if (c && c.n > 0) { const m = { r: 'red', b: 'night', g: 'gold' }[c.m] || 'red'; for (let k = 0; k < c.n; k++) { D.beg(); D.ell(c.x, c.y - k * 2, 7, 2.5, m === 'night' ? 'iron' : m, m === 'night' ? 4 : 6, { n: [0, -0.8] }); D.hl(Math.round(c.x) - 5, Math.round(c.y) + 1 - k * 2, 11, 'linen', 8); D.end(); } }
    (o.flying || []).forEach(f => { D.beg(); D.ell(f.x, f.y, 5, 2, f.m || 'gold', 7, { n: [0, -0.8] }); D.hl(Math.round(f.x) - 3, Math.round(f.y), 7, 'linen', 9); D.end(); });
    rs.mul[4] = o.glow || 0; rs.mul[5] = o.skull || 0;
  },
});

// ═════════════ 抓娃娃机：夜里游戏厅的粉色机箱，前后两层（娃娃夹在中间：柜里和娃娃堆在后，爪子、玻璃、机箱前脸在前） ═════════════
// the glass case spans x 28…284 (art); prizes sit on the heap between x 90…280 (the game's own coordinates / 4); the chute is inside, front left
const CL = M.CLAW_PX = { L: 28, R: 284, T: 30, F: 147, chute: [51, 116], door: [51, 161], btn: [214, 158], stick: [158, 147] };
const clawLights = (sc) => {
  sc.light({ x: 160, y: 34, z: 10, r: 150, i: 1.25, c: '#f0f4ff', fl: 'buzz', ph: 4, tint: 0.2 });          // 0 the tube light inside the case
  sc.light({ x: 150, y: 10, z: 20, r: 100, i: 0.8, c: '#ff6ad0', tint: 0.55 });                              // 1 the marquee
  sc.light({ x: CL.door[0], y: 160, z: 16, r: 40, i: 0.6, c: '#ffcf4a', tint: 0.5 });                        // 2 prize door lamp
  sc.light({ x: 0, y: 60, z: 30, r: 120, i: 0.6, c: '#40e0ff', tint: 0.5 });                                 // 3 arcade neon, left
  sc.light({ x: 300, y: 90, z: 30, r: 120, i: 0.5, c: '#b86bff', tint: 0.5 });                               // 4 arcade neon, right
  sc.light({ x: CL.chute[0], y: 130, z: 14, r: 80, i: 0, c: '#ffd040', tint: 0.6, bake: false });             // 5 the chute flashes on a win
  sc.light({ x: 150, y: 60, z: 20, r: 60, i: 0, c: '#ffffff', tint: 0.5, bake: false });                      // 6 moving: the held prize's quality glow
};
X.def('_mg_claw_back', {
  size: [300, 175], fy: 175, noFrame: 1, noFloor: 1, bootK: 1.6, amb: [0.2, 0.22],
  paint(S, sc) {
    const r = S.r; clawLights(sc);
    // the arcade behind: a dark wall with a neon strip, other cabinets as silhouettes
    S.lay('wall'); for (let y = 0; y < 175; y++) for (let x = 0; x < 300; x++) S.px(x, y, 'night', 1.5 + (vnoise(x / 20, y / 20, 3) - 0.5) + (y > 150 ? 0.8 : 0));
    for (let x = 0; x < 300; x++) S.px(x, 4, 'teal', x % 40 < 20 ? 7 : 4, { e: 255 });
    [[4, 60, 20, 115], [282, 70, 18, 105]].forEach(([x, y, w, h]) => { S.rect(x, y, w, h, 'night', 2.6); S.rect(x + 3, y + 8, w - 6, 18, 'screen', 3, { e: 255 }); for (let yy = y + 9; yy < y + 26; yy += 2) S.hl(x + 3, yy, w - 6, 'screen', 4, { e: 255 }); });
    // printed backdrop inside the glass: a night sky of stars and hearts
    S.lay('back');
    for (let y = CL.T; y < CL.F; y++) for (let x = CL.L; x < CL.R; x++) S.px(x, y, 'lav', 2.4 + (y - CL.T) * 0.012 + (vnoise(x / 9, y / 9, 7) - 0.5) * 0.6);
    for (let i = 0; i < 40; i++) { const x = CL.L + 4 + Math.floor(r() * (CL.R - CL.L - 8)), y = CL.T + 4 + Math.floor(r() * 60); if (r() < 0.3) { S.px(x, y, 'candy', 7); S.px(x + 2, y, 'candy', 7); S.px(x, y + 1, 'candy', 6); S.px(x + 1, y + 1, 'candy', 7); S.px(x + 2, y + 1, 'candy', 6); S.px(x + 1, y + 2, 'candy', 5); } else S.px(x, y, 'lav', 8); }
    // the gantry: two chrome rails under the roof, the tube light
    S.beg(); S.box(CL.L, CL.T - 4, CL.R - CL.L, 3, 'iron', 8); S.box(CL.L, CL.T + 2, CL.R - CL.L, 2, 'iron', 6); S.end();
    S.rect(100, CL.T - 1, 120, 1, 'glass', 11, { e: 255 });
    // the chute's back wall and its dark mouth
    S.beg(); for (let y = CL.chute[1]; y < CL.F; y++) for (let x = 34; x < 68; x++) S.px(x, y, 'ink', 1); S.rect(32, CL.chute[1] - 8, 38, 8, 'glass', 6); S.hl(32, CL.chute[1] - 8, 38, 'glass', 10); S.end();
    // the heap of plush filler on the right, lit from the tube
    S.lay('mid');
    const balls = []; for (let i = 0; i < 74; i++) { const x = 84 + r() * 200, h = 18 - Math.abs(x - 190) * 0.08 + r() * 6; balls.push([x, CL.F - r() * h, 5 + r() * 5, ['candy', 'teal', 'lav', 'gold', 'pink'][i % 5]]); }
    balls.sort((a, b) => a[1] - b[1]).forEach(([x, y, rr, m]) => { S.beg(); S.ell(x, y, rr, rr * 0.8, m, 5.5, { dome: 1 }); S.px(x - rr * 0.4, y - rr * 0.4, m, 9); S.end({ lit: 1 }); });
  },
  anim(D, t, rs, o) {
    // the claw's shadow on the heap: where it will land
    if (o.cx != null && o.shadow) { const sx = Math.round(o.cx); D.lay('mid'); for (let x = -7; x <= 7; x++) for (let y = -1; y <= 1; y++) if (Math.abs(x) / 7 + Math.abs(y) / 1.6 < 1 && X.bayer(sx + x, CL.F - 20 + y) < 0.55) D.px(sx + x, CL.F - 20 + y, 'ink', 1, { e: 255 }); }
    rs.mul[5] = o.chute || 0;
  },
});
X.def('_mg_claw_front', {
  size: [300, 175], fy: 175, clear: 1, noFrame: 1, noFloor: 1, bootK: 1.6, amb: [0.2, 0.22],
  paint(S, sc) {
    clawLights(sc);
    // the cabinet: candy frame and marquee band with bulbs, chrome corner posts, the chute's acrylic guard
    S.lay('back');
    S.beg(); S.box(CL.L - 8, 2, CL.R - CL.L + 16, 22, 'candy', 6); S.end({ lit: 1 });
    for (let x = 80; x < 220; x++) for (let y = 8; y < 19; y++) S.px(x, y, 'pink', 3 + (y === 8 ? 2 : 0));
    S.lay('front');
    S.beg(); S.rect(32, CL.chute[1], 2, CL.F - CL.chute[1], 'glass', 9, { e: 255 }); S.rect(68, CL.chute[1], 2, CL.F - CL.chute[1], 'glass', 7, { e: 255 }); for (let y = CL.chute[1] + 2; y < CL.F; y += 5) S.px(33, y, 'glass', 11, { e: 255 }); S.end({ none: 1 });
    S.beg(); S.box(CL.L - 8, CL.T - 6, 8, CL.F - CL.T + 8, 'candy', 5.5); S.box(CL.R, CL.T - 6, 8, CL.F - CL.T + 8, 'candy', 4.2); S.vl(CL.L - 2, CL.T - 6, CL.F - CL.T + 8, 'iron', 9); S.vl(CL.R + 1, CL.T - 6, CL.F - CL.T + 8, 'iron', 7); S.end({ lit: 1 });
    // the skirt under the glass: candy panel with a star print, the prize door, the joystick, the big red button, a coin slot
    S.beg(); S.box(CL.L - 8, CL.F, CL.R - CL.L + 16, 175 - CL.F, 'candy', 5); S.hl(CL.L - 8, CL.F, CL.R - CL.L + 16, 'iron', 9); S.hl(CL.L - 8, CL.F + 1, CL.R - CL.L + 16, 'iron', 5);
    for (let x = CL.L; x < CL.R; x += 9) for (let y = CL.F + 6; y < 173; y += 8) S.px(x + ((y / 8) % 2) * 4, y, 'pink', 8); S.end();
    S.beg(); S.box(CL.door[0] - 15, 152, 30, 18, 'iron', 4); S.end();
    S.beg(); S.box(CL.stick[0] - 8, 158, 30, 6, 'iron', 6, { top: 2 }); S.end({ lit: 1 });
    S.beg(); S.ell(CL.btn[0], CL.btn[1] + 2, 9, 5, 'iron', 6); S.end({ lit: 1 });
    S.beg(); S.box(248, 152, 14, 16, 'iron', 6); S.rect(253, 155, 4, 8, 'ink', 1); S.end();
    // glass: a few hard diagonal glints
    [[92, 36, 9], [97, 36, 5], [250, 50, 8], [255, 50, 4]].forEach(([x, y, len]) => { for (let k = 0; k < len; k++) { S.px(x + k, y + k * 2, 'glass', 10, { e: 255 }); S.px(x + k, y + k * 2 + 1, 'glass', 8, { e: 255 }); S.px(x + k + 1, y + k * 2 + 1, 'glass', 9, { e: 255 }); } });
  },
  anim(D, t, rs, o) {
    const cx = o.cx, cy = o.cy, op = o.open != null ? o.open : 1, sw = o.sway || 0, top = CL.T + 2, hx = cx + Math.sin(sw) * Math.max(0, cy - top), hy = cy;
    // marquee bulbs chase (the stage's lamp mood); the title itself is drawn crisp by the game
    const L = o.L, sp = (L && L.sp) || 1, strobe = L && L.strobe ? Math.floor(t * 3) % 2 : -1;
    D.lay('back'); for (let i = 0; i < 44; i++) { const x = CL.L - 4 + i * 6, on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(t * 10 * sp) + i) % 4 === 0; D.rect(x, 21, 2, 2, on ? 'lamp' : 'candy', on ? 11 : 3, { e: on ? 255 : 0 }); D.rect(x, 3, 2, 2, on ? 'lamp' : 'candy', on ? 11 : 3, { e: on ? 255 : 0 }); }
    D.lay('mid');
    // carriage on the rails, the cable (it swings), the claw hub and three prongs
    D.beg(); D.box(Math.round(cx) - 7, CL.T - 5, 14, 7, 'iron', 7); D.px(Math.round(cx) - 5, CL.T - 3, 'red', 9, { e: 255 }); D.end({ lit: 1 });
    D.line(cx, top, hx, hy, 'iron', 8);
    D.beg(); D.box(Math.round(hx) - 8, Math.round(hy), 17, 9, 'brass', 6); D.hl(Math.round(hx) - 8, Math.round(hy), 17, 'brass', 9); D.rect(Math.round(hx) - 3, Math.round(hy) + 3, 7, 3, 'iron', 4); D.px(Math.round(hx) + 5, Math.round(hy) + 2, 'red', 9, { e: 255 });
    [-1, 0, 1].forEach(sd => { const a = sd * (0.2 + op * 0.75) + sw, x0 = hx + sd * 5, y0 = hy + 9, x1 = x0 + Math.sin(a) * 11, y1 = y0 + Math.cos(a) * 11, a2 = a - sd * (0.7 + op * 0.2), x2 = x1 + Math.sin(a2) * 9, y2 = y1 + Math.cos(a2) * 9;
      D.line(x0, y0, x1, y1, 'iron', sd ? 7.5 : 5.5, { w: 2 }); D.line(x1, y1, x2, y2, 'iron', 8, { w: sd ? 2 : 1 }); D.px(Math.round(x1), Math.round(y1), 'iron', 10); D.rect(Math.round(x2) - 1, Math.round(y2), 2, 2, 'iron', 11); });
    D.end({ lit: 1 });
    if (o.glow) rs.dl.push({ x: hx, y: hy + 16, z: 14, r: 50, i: o.glow, rgb: o.glowRgb || [255, 255, 255], tint: 0.5 });
    // the front: joystick (leans the way the claw moves), the big red button (pressed), the prize door (flaps open)
    D.lay('front');
    const lean = clamp(o.lean || 0, -1, 1); D.beg(); D.line(CL.stick[0], 157, CL.stick[0] + Math.round(lean * 3), 149, 'iron', 8, { w: 1 }); D.ell(CL.stick[0] + lean * 3, 147, 3, 3, 'red', 7, { dome: 1 }); D.end({ lit: 1 });
    const pr = o.press || 0; D.beg(); D.ell(CL.btn[0], CL.btn[1] + pr * 2, 7, 4.5 - pr, pr > 0.3 ? 'linen' : 'red', pr > 0.3 ? 9 : 6.5, { dome: 1 }); D.px(CL.btn[0] - 3, CL.btn[1] - 2 + pr * 2, 'red', 10); D.end({ lit: 1 });
    const dr = o.door || 0; D.beg(); if (dr < 0.5) { D.rect(CL.door[0] - 13, 154, 26, 14, 'ink', 1); D.hl(CL.door[0] - 13, 154, 26, 'iron', 7); } else { D.rect(CL.door[0] - 13, 154, 26, 14, 'lamp', 6 + (o.doorGlow || 0) * 4, { e: 255 }); D.rect(CL.door[0] - 13, 168, 26, 3, 'iron', 7); } D.end({ none: 1 });
  },
});

const AW = 300, AH = 175, FY = 148, R = Math.random, n1 = X.n1, worker = X.worker;
// ═════════════ 废弃矿坑 ═════════════
// o: { digs, risk 0…1, swing 0…1 (the current swing; −1 idle), glow { m, k } (the hole lit by what is coming out), pile [{ m, tn }], collapse 0…1, jolt 0…1 }
const HOLE = [172, 114]; M.MINE_PX = { hole: HOLE, cart: [44, 120], lead: [86, 148], meter: [272, 150], miner: [146, 148], FY: 148 };
X.def('_mg_mine', {
  size: [300, 175], fy: 148, noFrame: 1, bootK: 1.6, amb: [0.22, 0.22],
  paint(S, sc) {
    const r = S.r;
    sc.light({ x: 40, y: 104, z: 2, r: 70, i: 0.55, c: '#7aa8ff', tint: 0.45 });                              // 0 cold air from the far end of the tunnel
    sc.light({ x: 64, y: 118, z: 16, r: 46, i: 0.7, c: '#ffb050', fl: 'candle', ph: 2, tint: 0.5 });           // 1 candle stub on the cart
    sc.light({ x: 276, y: 60, z: 14, r: 40, i: 0.0, c: '#7ae070', tint: 0.6, bake: false });                    // 2 meter glow: safe
    sc.light({ x: 276, y: 60, z: 14, r: 40, i: 0.0, c: '#ffc040', tint: 0.6, bake: false });                    // 3 meter glow: loose
    sc.light({ x: 276, y: 60, z: 14, r: 44, i: 0.0, c: '#ff4040', tint: 0.65, bake: false });                   // 4 meter glow: danger
    sc.light({ x: HOLE[0], y: HOLE[1], z: 10, r: 70, i: 0.0, c: '#fff0b0', tint: 0.6, bake: false });          // 5 ore flash in the hole
    sc.light({ x: 158, y: 50, z: 16, r: 150, i: 1.0, c: '#ffb45a', fl: 'candle', ph: 5, tint: 0.55 });           // 6 the lantern (its swing is a moving light on top)
    sc.light({ x: 42, y: 100, z: 4, r: 30, i: 0.8, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.5 });            // 7 a lamp far down the tunnel

    // ── the rock: strata that wave, stones set in them, a darker ceiling ──
    S.lay('wall');
    for (let y = 0; y < FY; y++) for (let x = 0; x < AW; x++) {
      const band = Math.floor((y + Math.sin(x * 0.045 + 1.3) * 6 + Math.sin(x * 0.13) * 2) / 17), m = band % 3 === 1 ? 'earth' : 'rock';
      let tn = (m === 'rock' ? 4.2 : 4.6) + (vnoise(x / 7, y / 5, band + 3) - 0.5) * 2.2 - (y < 16 ? (16 - y) * 0.12 : 0);
      const edge = Math.floor((y - 1 + Math.sin(x * 0.045 + 1.3) * 6 + Math.sin(x * 0.13) * 2) / 17) !== band; if (edge) tn -= 1.6;
      S.px(x, y, m, tn, { n: [0, 0] });
    }
    for (let i = 0; i < 46; i++) { const x = 8 + r() * 284, y = 6 + r() * 136, rx = 3 + r() * 7, ry = rx * (0.55 + r() * 0.3); if (x < 84 && y > 34) continue; S.ell(x, y, rx, ry, 'rock', 5 + r() * 1.5, { dome: 1 }); S.ell(x + rx * 0.2, y + ry * 0.35, rx * 0.8, ry * 0.45, 'rock', 3.2); }
    // ore veins: gold flecks, violet crystals, silver streaks (glints come from emitters)
    const VEIN = [[112, 44, 'gold'], [214, 30, 'arcane'], [250, 88, 'gold'], [128, 78, 'iron'], [30, 20, 'arcane'], [236, 132, 'iron'], [96, 128, 'gold'], [282, 18, 'gold']];
    VEIN.forEach(([x, y, m], i) => { for (let k = 0; k < 9; k++) { const px = x + Math.round((r() - 0.5) * 12), py = y + Math.round((r() - 0.5) * 6); S.px(px, py, m, m === 'arcane' ? 7 + r() * 3 : m === 'gold' ? 7 + r() * 2 : 8 + r() * 2, { n: [-0.4, -0.5] }); if (r() < 0.4) S.px(px + 1, py + 1, m, 4); }
      if (m === 'arcane') { S.poly([[x - 2, y + 3], [x, y - 5], [x + 2, y + 3]], 'arcane', 8, { n: [-0.5, -0.3] }); S.vl(x, y - 4, 7, 'arcane', 10); S.poly([[x + 3, y + 4], [x + 5, y - 2], [x + 7, y + 4]], 'arcane', 6); }
      sc.emit({ k: 'glint', x, y, w: 10, h: 5, rate: 0.35, sp: 0, life: 0.6 }); });
    // ceiling cracks the dust sifts from
    [[140, 2], [206, 4], [120, 8]].forEach(([x, y]) => TX.crack(S, x, y, 16, 'rock', 4, 'v'));

    // ── the tunnel on the left: timber sets shrinking into the dark, cold light far in ──
    const tun = (k) => ({ x0: Math.round(42 - 34 * k), x1: Math.round(42 + 34 * k), y0: Math.round(104 - 66 * k), y1: Math.round(104 + 44 * k) });
    { const o = tun(1); for (let y = o.y0; y < o.y1; y++) for (let x = o.x0; x < o.x1; x++) { const d = Math.max(Math.abs(x - 42) / 34, (y < 104 ? (104 - y) / 66 : (y - 104) / 44)); S.px(x, y, 'rock', 0.6 + d * 2.6 + (vnoise(x / 4, y / 4, 9) - 0.5) * 0.8); } }
    [0.22, 0.36, 0.52, 0.72].forEach((k, i) => { const o = tun(k), w = Math.max(1, Math.round(4 * k)), tn = 2 + i * 1.1; S.beg(); S.rect(o.x0, o.y0, w, o.y1 - o.y0, 'wood', tn); S.rect(o.x1 - w, o.y0, w, o.y1 - o.y0, 'wood', tn - 0.6); S.rect(o.x0 - 1, o.y0, o.x1 - o.x0 + 2, w, 'wood', tn + 0.4); S.end({ none: 1 }); });
    S.vl(42, 90, 8, 'hair', 2); S.rect(41, 98, 3, 3, 'lamp', 9, { e: 255 }); S.px(42, 99, 'lamp', 11, { e: 255 });
    // the mouth's own set: two big posts and a lintel, lit from the cave
    S.lay('back');
    S.beg(); S.box(4, 36, 8, 112, 'wood', 5); S.box(72, 36, 8, 112, 'wood', 4.5); S.box(0, 30, 86, 8, 'wood', 5.5, { top: 2 }); [8, 76].forEach(x => { TX.rivet(S, x - 1, 40, 'iron', 5); TX.rivet(S, x - 1, 140, 'iron', 5); }); S.end();
    for (let y = 40; y < 146; y += 9) { S.hl(5, y, 6, 'wood', 3.5); S.hl(73, y + 4, 6, 'wood', 3); }
    S.beg(); S.poly([[10, 38], [24, 38], [11, 52]], 'wood', 4); S.poly([[74, 38], [60, 38], [73, 52]], 'wood', 3.5); S.end();

    // ── the dig: a timber frame over the face, the face itself bulging out of the wall ──
    S.beg(); S.box(98, 30, 6, 118, 'wood', 5); S.box(250, 30, 6, 118, 'wood', 4.2); S.box(90, 22, 174, 8, 'wood', 5.6, { top: 2 }); S.end();
    for (let x = 94; x < 262; x += 11) S.vl(x, 23, 6, 'wood', 3.8);
    TX.crack(S, 150, 24, 14, 'wood', 5, 'h');                                                                                 // the cap beam is splitting
    S.beg(); S.line(104, 42, 122, 30, 'wood', 4, { w: 2 }); S.line(249, 42, 231, 30, 'wood', 3.6, { w: 2 }); S.end();
    [[101, 60], [101, 120], [253, 60], [253, 120]].forEach(([x, y]) => TX.rivet(S, x, y, 'iron', 5));
    // the face: fractured rock, each chunk its own facet (Voronoi cells with their own normal and tone), dark cracks between
    { const seeds = []; for (let i = 0; i < 64; i++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7); seeds.push({ x: 198 + Math.cos(a) * d * 54, y: 108 + Math.sin(a) * d * 50, nx: (r() - 0.5) * 1.5, ny: -0.25 - r() * 0.6, tn: 4.2 + r() * 2.2 }); }
      for (let y = 54; y < FY; y++) for (let x = 140; x < 256; x++) { const u = (x - 198) / 55, v = (y - 108) / 53, ang = Math.atan2(v, u), rim = 1 + n1(ang * 3 + 4) * 0.14 + n1(ang * 9) * 0.05; if (u * u + v * v > rim * rim && y < 134) continue; if (y >= 134 && Math.abs(u) > rim + (y - 134) * 0.02) continue;
        let b1 = 1e9, b2 = 1e9, sd = null; for (const q of seeds) { const d = (x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) * 1.3; if (d < b1) { b2 = b1; b1 = d; sd = q; } else if (d < b2) b2 = d; }
        const gap = Math.sqrt(b2) - Math.sqrt(b1), edge = gap < 0.75, lip = !edge && gap < 1.6 && sd.ny < -0.5, outer = u * u + v * v > rim * rim * 0.9;
        S.px(x, y, 'rock', edge ? 1.4 : lip ? sd.tn + 1.4 : sd.tn - (outer ? 0.8 : 0) - (vnoise(x / 2.5, y / 2.5, 5) - 0.5) * 0.7, { n: edge ? [0, 0] : [clamp(sd.nx + u * 0.3, -0.9, 0.9), clamp(sd.ny + v * 0.3, -0.9, 0.9)] }); } }
    // rubble at the foot of the face, ore crumbs in it
    for (let i = 0; i < 26; i++) { const x = 150 + r() * 96, y = FY - 1 - r() * 5, s2 = 1.5 + r() * 3; S.ell(x, y, s2 * 1.3, s2, 'rock', 4 + r() * 2.5, { dome: 1 }); if (r() < 0.25) S.px(x, y - 1, r() < 0.5 ? 'gold' : 'arcane', 8); }
    // ── props ──
    S.lay('mid');
    // tools leaning on the left post: a spare pick and a shovel
    S.beg(); S.line(106, 146, 118, 106, 'wood', 5.5); S.poly([[114, 106], [125, 101], [126, 103], [117, 108]], 'iron', 6); S.line(111, 111, 114, 106, 'iron', 4); S.end();
    S.beg(); S.line(124, 147, 126, 110, 'wood', 5); S.poly([[121, 146], [131, 146], [130, 138], [122, 138]], 'iron', 6.5); S.hl(122, 138, 8, 'iron', 9); S.end();
    // water bucket and a coil of rope
    S.beg(); S.poly([[132, 147], [141, 147], [142, 139], [131, 139]], 'wood', 5); S.hcyl(131, 141, 11, 1, 'iron', 5); S.hcyl(131, 145, 11, 1, 'iron', 4); S.ell(136.5, 139, 5.5, 1.2, 'water', 4); S.end();
    S.beg(); for (let k = 0; k < 4; k++) S.ell(88, 144 - k * 1.5, 7 - k * 0.4, 2.2, 'sand', 6 - k * 0.3, { ring: 1 }); S.end();
    // the danger meter: a glass tube on a board, brass caps, a skull on top (the level is animated)
    S.beg(); S.box(262, 34, 18, 104, 'wood', 4.4); TX.vplanks(S, 263, 35, 16, 102, 'wood', 4.6, { pw: 4 }); S.box(260, 136, 22, 4, 'wood', 5, { top: 1 }); S.end();
    S.beg(); S.cyl(266, 48, 10, 80, 'glass', 2.2, { rim: 1.5 }); S.box(264, 44, 14, 4, 'brass', 7); S.box(264, 128, 14, 4, 'brass', 6); for (let y = 56; y < 128; y += 9) { S.hl(263, y, 3, 'brass', 8); S.hl(276, y, 3, 'brass', 7); } S.end();
    S.beg(); S.ell(271, 36, 6, 5.5, 'bone', 8, { dome: 1 }); S.rect(268, 40, 7, 3, 'bone', 7); S.px(269, 36, 'ink', 1); S.px(270, 36, 'ink', 1); S.px(273, 36, 'ink', 1); S.px(274, 36, 'ink', 1); S.px(271, 38, 'ink', 1); for (let k = 0; k < 3; k++) S.px(269 + k * 2, 42, 'ink', 2); S.end();
    // canary cage on a hook from the cap beam
    S.beg(); S.vl(232, 30, 8, 'iron', 5); S.ell(232, 44, 7, 6, 'brass', 7, { ring: 1, dome: 1 }); for (let x = 226; x <= 238; x += 3) S.vl(x, 44, 12, 'brass', x < 232 ? 7 : 5); S.hl(225, 56, 15, 'brass', 7); S.hl(225, 57, 15, 'brass', 4); S.hl(227, 51, 11, 'wood', 6); S.end();
    // the mine cart on the rails: planked body, iron bands, rivets
    S.beg(); S.poly([[18, 124], [70, 124], [66, 142], [22, 142]], 'wood', 5); TX.planks(S, 20, 125, 48, 16, 'wood', 5, { ph: 4, pw: 18, nails: false });
    S.hl(16, 123, 56, 'iron', 8); S.hl(16, 124, 56, 'iron', 5); [26, 44, 62].forEach(x => { S.vl(x, 125, 17, 'iron', 6); S.px(x, 127, 'iron', 9); S.px(x, 139, 'iron', 9); }); S.hl(22, 141, 44, 'iron', 4);
    [30, 58].forEach(x => { S.ell(x, 145, 4, 4, 'iron', 5, { ring: 1.5 }); S.px(x, 145, 'iron', 8); }); S.end({ lit: 1 });
    S.beg(); S.cyl(62, 116, 3, 7, 'paper', 8, { rim: 1 }); S.px(63, 115, 'wood', 2); S.end();
    // floor: packed earth, sleepers and two rails running into the tunnel
    S.lay('wall');
    for (let y = FY; y < AH; y++) for (let x = 0; x < AW; x++) S.px(x, y, 'earth', 4.2 + (vnoise(x / 5, y / 2, 4) - 0.5) * 1.6 + (y === FY ? 1.2 : 0));
    for (let i = 0; i < 70; i++) { const x = Math.floor(r() * AW), y = FY + 1 + Math.floor(r() * 26); S.px(x, y, 'rock', 6 + r() * 2); S.px(x + 1, y, 'rock', 3); }
    const rail = (y) => ({ a: Math.round(38 - (y - FY) * 0.6), b: Math.round(46 + (y - FY) * 1.4) });
    for (let y = FY; y < AH; y += 4) { const q = rail(y); S.rect(0, y, q.b + 12, 2, 'wood', 3.6); S.hl(0, y, q.b + 12, 'wood', 5); }
    for (let x = 0; x < 128; x++) { S.px(x, FY + 3, 'iron', 8, { n: [0, -0.8] }); S.px(x, FY + 4, 'iron', 4); S.px(x, FY + 11, 'iron', 9, { n: [0, -0.8] }); S.px(x, FY + 12, 'iron', 4); }
    // foreground rubble, near the eye
    S.lay('front');
    [[150, 172, 9], [170, 174, 6], [286, 173, 11], [4, 174, 8]].forEach(([x, y, s]) => { S.beg(); S.ell(x, y - s * 0.4, s, s * 0.55, 'rock', 4.5, { dome: 1 }); S.ell(x - s * 0.3, y - s * 0.6, s * 0.4, s * 0.2, 'rock', 6.5); S.end(); });
    // a crack in the roof lets the moon in: a cold beam onto the face, dust drifting in it
    S.lay('wall'); for (let x = 196; x < 214; x++) { const w = 2 + Math.round(n1(x * 0.4) * 1.5); for (let y = 0; y < w; y++) S.px(x, y, 'ice', 8 - y, { e: 255 }); }
    sc.shaft({ x: 205, y0: 0, y1: FY, w0: 7, w1: 30, dx: -28, i: 0.5, c: '#a8c0ff', haze: 0.35, fade: 0.35 });
    sc.emit({ k: 'dust', x: 190, y: 20, w: 40, h: 80, rate: 2, sp: 2, life: 4 });
    // a warning board nailed to the left post, a chain hanging from the beam, wedges under the posts
    S.lay('mid'); S.beg(); S.box(86, 58, 26, 14, 'wood', 6); S.hl(87, 59, 24, 'wood', 7.5); for (let k = 0; k < 4; k++) S.px(90 + k * 6, 64, 'red', 6); S.poly([[96, 60], [101, 60], [98, 69]], 'red', 7); S.px(98, 70, 'red', 7); S.end();
    S.beg(); for (let y = 30; y < 58; y += 3) { S.px(122, y, 'iron', 5); S.px(122, y + 1, 'iron', 7); S.px(123, y + 2, 'iron', 4); } S.line(122, 58, 120, 62, 'iron', 6); S.px(123, 62, 'iron', 5); S.end();
    [[96, 146], [248, 146]].forEach(([x, y]) => { S.beg(); S.poly([[x, y + 2], [x + 12, y + 2], [x + 12, y - 2]], 'wood', 6.5); S.end(); });
    sc.emit({ k: 'dust', x: 150, y: 6, w: 120, rate: 1.2, sp: 3, life: 3.6 });
  },
  anim(D, t, rs, o) {
    const st = rs.st, risk = clamp(o.risk || 0, 0, 1), digs = o.digs || 0;
    // lantern on the cap beam: swings harder as the rock loosens; its light swings with it
    const amp = 0.18 + risk * 0.5 + (o.jolt || 0) * 0.6, a = Math.sin(t * (1.5 + risk * 1.5)) * amp, lx = 158 + Math.sin(a) * 18, ly = 30 + Math.cos(a) * 18;
    D.lay('mid'); D.line(158, 30, lx, ly - 3, 'hair', 3); D.beg(); D.rect(Math.round(lx) - 2, Math.round(ly) - 4, 5, 1, 'iron', 7); D.rect(Math.round(lx) - 2, Math.round(ly) - 3, 5, 6, 'glass', 5); D.rect(Math.round(lx) - 1, Math.round(ly) - 2, 3, 4, 'lamp', 10, { e: 255 }); D.px(Math.round(lx), Math.round(ly) - 1, 'lamp', 11, { e: 255 }); D.rect(Math.round(lx) - 2, Math.round(ly) + 3, 5, 1, 'iron', 5); D.end();
    rs.dl.push({ x: lx, y: ly + 2, z: 14, r: 120, i: 0.55, rgb: [255, 190, 100], tint: 0.5 }); rs.mul[6] = 1 - (o.collapse || 0);
    // the meter: liquid level = risk; green / amber / red, bubbling
    const lvl = Math.round(risk * 78), band = risk < 0.34 ? 0 : risk < 0.67 ? 1 : 2, mat = ['screen', 'lamp', 'red'][band];
    for (let y = 127 - lvl; y < 128; y++) for (let x = 267; x < 275; x++) D.px(x, y, mat, (band === 2 ? 6 : 6.5) + (x === 268 ? 2 : 0) + (y === 127 - lvl ? 2.5 : 0) - (x === 274 ? 1.5 : 0), { e: 255 });
    if (lvl > 4 && R() < 0.15 + risk) rs.burst('bubble', 268 + R() * 6, 126, 1, { sp: 4, ang: 0, spread: 0.3, life: 0.4 + lvl / 90, floor: 175 });
    [2, 3, 4].forEach((i, k) => { rs.mul[i] = k === band ? 0.8 + (band === 2 ? 0.4 * Math.max(0, Math.sin(t * 9)) : 0) : 0; });
    // canary: hops on its perch, frantic when the rock is loose
    const hop = Math.floor(t * (2 + risk * 8)) % 5 === 0 ? 1 : 0, cx = 231 + (Math.floor(t * (1 + risk * 4)) % 2);
    D.beg(); D.rect(cx - 2, 47 - hop, 5, 4, 'gold', 8); D.rect(cx + 1, 45 - hop, 3, 3, 'gold', 9); D.px(cx + 2, 46 - hop, 'ink', 1); D.px(cx + 4, 46 - hop, 'lamp', 7); D.px(cx - 3, 48 - hop, 'gold', 6); D.px(cx - 1, 47 - hop, 'gold', 10); D.end();
    // the hole in the face: deeper and wider every swing; its rim catches light; it glows with what is coming out
    const hr = 5 + Math.min(20, digs * 2.6), [hx, hy] = HOLE; D.lay('back');
    for (let y = Math.floor(hy - hr); y <= hy + hr; y++) for (let x = Math.floor(hx - hr * 1.2); x <= hx + hr * 1.2; x++) { const u = (x + 0.5 - hx) / (hr * 1.2), v = (y + 0.5 - hy) / hr, d = u * u + v * v + n1(Math.atan2(v, u) * 2 + 7) * 0.12; if (d > 1) continue; D.px(x, y, 'rock', d > 0.78 ? (v < 0 ? 2.2 : 5.5) : 0.4 + d * 1.2, { n: d > 0.78 ? [-u * 0.6, -v * 0.6] : [0, 0] }); }
    if (o.glow && o.glow.k > 0) { const k = Math.min(1, o.glow.k), gm = o.glow.m || 'gold'; for (let y = Math.floor(hy - hr * 0.7); y <= hy + hr * 0.7; y++) for (let x = Math.floor(hx - hr * 0.8); x <= hx + hr * 0.8; x++) { const d = Math.hypot((x - hx) / (hr * 0.8), (y - hy) / (hr * 0.7)); if (d < k) D.px(x, y, gm, 11 - d * 6, { e: 255 }); } rs.mul[5] = o.glow.k * 1.6; } else rs.mul[5] = 0;
    // the miner with the pick: wind up, strike, pull back
    const sw = o.swing == null || o.swing < 0 ? -1 : o.swing, idle = Math.sin(t * 2) * 0.08;
    const aF = sw < 0 ? 0.9 + idle : sw < 0.43 ? 0.9 + sw / 0.43 * 2.2 : sw < 0.5 ? 3.1 - (sw - 0.43) / 0.07 * 1.7 : 1.4 - (sw - 0.5) * 0.6;
    const p = worker(D, 146, FY, { skin: ['skin', 5], hair: ['hair', 2], top: ['denim', 4], bot: ['leather', 3], boot: ['hair', 2], cap: ['brass', 7] }, { aF, eF: -0.25, aB: aF * 0.7, eB: 0.4, lF: 0.35, lB: -0.25, lean: sw >= 0.43 && sw < 0.6 ? 0.55 : 0.2 }, 1);
    // pick: ash handle, curved iron head
    const ang = aF - 0.25 + 0.5, dx = Math.sin(ang), dy = Math.cos(ang), [px0, py0] = p.hand, tx = px0 + dx * 11, ty = py0 + dy * 11; D.beg(); D.line(px0, py0, tx, ty, 'wood', 6.5);
    for (let k = -5; k <= 5; k++) { const bend = Math.abs(k) * 0.25; D.px(Math.round(tx - dy * k + dx * bend), Math.round(ty + dx * k + dy * bend), 'iron', Math.abs(k) > 3 ? 9 : 6.5); } D.end({ lit: 1 });
    // helmet lamp
    D.px(p.head[0] + 3, p.head[1] - 3, 'lamp', 11, { e: 255 }); rs.dl.push({ x: p.head[0] + 8, y: p.head[1], z: 12, r: 60, i: 0.7, rgb: [255, 240, 190], tint: 0.3 });
    if (sw >= 0.5 && !st.hit) { st.hit = 1; rs.burst('spark', hx - hr * 0.6, hy, 10, { sp: 60, ang: -Math.PI / 2, spread: 1.6, life: 0.5, floor: FY }); rs.burst('dust', hx - 4, hy, 6, { sp: 14, life: 1, ang: -Math.PI / 2, spread: 2 }); }
    if (sw < 0.5) st.hit = 0;
    // the haul in the cart: chunks pile up
    (o.pile || []).forEach((c, i) => { const col = i % 6, row = Math.floor(i / 6), x = 24 + col * 7 + (row % 2) * 3, y = 121 - row * 4; D.beg(); D.ell(x + 2.5, y + 1.5, 3.2, 2.6, c.m, c.tn, { dome: 1 }); D.px(x + 1, y, c.m, c.tn + 3); D.end(); });
    if (R() < 0.04 + risk * 0.4) rs.burst('dust', 110 + R() * 150, 30 + R() * 4, 1, { sp: 2, life: 3 });
    if (risk > 0.4 && R() < risk * 0.08) rs.burst('spark', 110 + R() * 150, 31, 1, { sp: 4, life: 1.4, floor: FY });
  },
});

})();
