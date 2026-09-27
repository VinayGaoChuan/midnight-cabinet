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
})();
