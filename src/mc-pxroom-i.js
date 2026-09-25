// ==== mc-pxroom-i.js ====
(function () {
// Pixel rooms, batch i (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1):
// 阿蒙森-斯科特科考站 amundsen · 布达拉宫 potala · 圣米歇尔山 michel · 亚历山大灯塔 lighthouse · 吴哥窟 angkor.
// All five are wonders under the open sky: X.sky for the backdrop, the landmark in the middle distance, a framing
// foreground, and one signature moment each (aurora surge + balloon launch, wind gust, bell toll, beam sweep, gong).
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, n1, vnoise } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// ───────── shared bits ─────────
// where a worker's front hand ends up for a pose (same rig as PXR.worker)
function handAt(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), x0 = sx + dir, y0 = shY + 2, a1 = p.aF || 0, a2 = p.eF || 0;
  const ex = x0 + Math.sin(a1) * 5 * dir, ey = y0 + Math.cos(a1) * 5; return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5)];
}
// half dome standing on a base line (igloo, stupa bell, domes): sphere normals, only the part above the base
function dome(S, cx, by, rx, ry, m, t, o) {
  o = o || {};
  for (let y = Math.floor(by - ry); y < by; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - by) / ry; if (u * u + v * v > 1) continue;
    S.px(x, y, m, t + (o.sh ? -u * o.sh : 0), { n: [u * 0.85, v * 0.85], e: o.e });
  }
}
// a small flame (torch, butter lamp, brazier tongue), flickering
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// a flag of w×h cloth on a pole top at (x, y), rippling in the wind (to the right); m tone t
function flag(D, x, y, w, h, m, t, time, ph, gust) {
  const amp = 0.6 + (gust || 0) * 1.4;
  for (let i = 0; i < w; i++) { const dy = Math.round(Math.sin(time * 7 + ph - i * 0.9) * amp * (i / w)), sh = Math.sin(time * 7 + ph - i * 0.9 + 1.2) > 0.3 ? -1 : 0;
    for (let k = 0; k < h; k++) D.px(x + 1 + i, y + k + dy, m, t + sh + (k === 0 ? 0.6 : 0) - (h > 3 && k === h - 1 ? 1.6 : 0), { n: [0, 0] }); }
}

// a small emperor penguin, waddling (or flapping when `flap`)
function penguin(D, x, y, dir, t, walk, flap) {
  const sw = walk ? Math.round(Math.sin(t * 9)) : 0, f = flap ? Math.round(Math.sin(t * 22) * 1.5) : 0;
  D.beg(); D.ell(x + sw * 0.5, y - 6, 3, 5.5, 'iron', 3, { dome: 1 }); D.ell(x + dir + sw * 0.5, y - 5, 1.8, 4.2, 'linen', 9, { dome: 1 });
  D.ell(x + dir * 0.5 + sw, y - 12, 2.3, 2, 'iron', 2.6, { dome: 1 }); D.px(x + dir * 2 + sw, y - 11, 'gold', 8.5); D.px(x + dir * 2 + sw, y - 10, 'gold', 7);
  D.px(x + dir * 3 + sw, y - 12, 'brick', 7); D.px(x + dir * 1 + sw, y - 13, 'linen', 10);
  D.line(x - dir * 2, y - 8, x - dir * (3 + Math.abs(f)), y - 4 - f, 'iron', 2.5);
  D.px(x - 1 + (walk && Math.sin(t * 9) > 0 ? 1 : 0), y, 'gold', 6); D.px(x + 1 - (walk && Math.sin(t * 9) < 0 ? 1 : 0), y, 'gold', 5.5); D.end();
}

// ───────── 阿蒙森-斯科特科考站 amundsen (legendary · scifi · misc) ─────────
// the South Pole under an aurora: the elevated station on its stilts, a radome mast with a red beacon, a snow igloo with a
// warm door, the ceremonial pole's mirror ball flanked by three flags, a cargo sled; a scientist inflates and launches a weather
// balloon, a penguin waddles past, a snowcat crawls along the horizon with its headlights on; the aurora ripples, its light
// moves over the snow in bands, and every ~9 s it surges bright with a pink hem, washing the whole scene green.
const AM_HZ = 62;
const AM_FLAGS = [[44, 88, 'red'], [48, 86, 'gold'], [60, 87, 'denim']];   // three flags flanking the pole, kept inside x 44–64 (x, foot y, cloth)
const AM_FH = 9;   // flag pole height
function aurora(D, t, surge, sx) {
  // far curtain: higher, dimmer, violet-leaning
  for (let x = 4; x < W - 4; x++) {
    const env = 0.5 + 0.5 * Math.sin(x * 0.028 + t * 0.17 + 2.2), ray = vnoise(x * 0.33 + t * 0.7, t * 0.2, 17), b = 13 + Math.sin(x * 0.05 - t * 0.28) * 5 + Math.sin(x * 0.13 + t * 0.5) * 2;
    const h = 4 + ray * 8, L0 = (0.2 + 0.8 * ray) * env * 0.55;
    for (let k = 0; k < h; k++) { const u = k / h, L = (1 - u) * L0; if (L < 0.13) break; const y = Math.round(b - k);
      D.px(x, y, u > 0.45 ? 'magic' : 'teal', u > 0.45 ? 4 : L > 0.4 ? 5 : 4, { e: 255 }); }
  }
  // main curtain: a folded ribbon with vertical rays, bright green lower hem, violet top; the hem (y 22–36) stays clear of the station roof
  for (let x = 4; x < W - 4; x++) {
    const env = 0.55 + 0.45 * Math.sin(x * 0.034 - t * 0.21 + 0.4), ray = vnoise(x * 0.42 - t * 0.9, t * 0.25, 5) * 0.75 + vnoise(x * 0.11 + t * 0.3, 1.5, 6) * 0.25;
    const b = 29 + Math.sin(x * 0.047 + t * 0.35) * 5 + Math.sin(x * 0.12 - t * 0.6) * 2, sg = surge ? surge * Math.exp(-((x - sx) / 22) * ((x - sx) / 22)) : 0;
    const h = 9 + ray * 17 + sg * 20, L0 = (0.3 + 0.7 * ray) * env + sg * 0.9;
    for (let k = 0; k < h; k++) { const u = k / h, L = (1 - u * 0.95) * L0; if (L < 0.14) break; const y = Math.round(b - k);
      let m = 'teal', tn;
      if (k === 0) { if (sg > 0.25) { m = 'pink'; tn = 9; } else tn = L > 0.6 ? 10 : 8; }
      else if (u > 0.72) { m = 'pink'; tn = L > 0.4 ? 5 : 3; }
      else tn = L > 0.85 ? 9 : L > 0.62 ? 8 : L > 0.42 ? 7 : L > 0.26 ? 5 : 4;
      D.px(x, y, m, tn, { e: 255 }); }
  }
}
X.def('amundsen', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: AM_HZ, far: 'none', floor: 'snow' });
    sc.light({ x: 75, y: 30, z: 60, r: 175, i: 0.55, c: '#60f0c0', fl: 'pulse', amp: 0.14, sp: 0.8, tint: 0.45 });   // 0 aurora
    sc.light({ x: 104, y: 66, z: 10, r: 38, i: 0.55, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.2 });                // 1 station windows, spilling on the snow under it
    sc.light({ x: 34, y: 79, z: 16, r: 16, i: 0.85, c: '#ffa850', fl: 'fire', ph: 2, tint: 0.3 });                   // 2 igloo door: warms the porch, never pools on the icy snow
    sc.light({ x: 30, y: 7, z: 4, r: 16, i: 0.7, c: '#ff3030', fl: 'pulse', amp: 0.95, sp: 3.2, tint: 0.45 });        // 3 mast beacon
    const r = S.r;
    // the polar plateau: flat snow to the horizon, lit from above, with wind-carved sastrugi
    S.lay('wall');
    S.vgrad(0, AM_HZ, W, FY - AM_HZ, 'ice', 4.6, 7.2, { n: [0, -0.85] });
    S.hl(0, AM_HZ, W, 'ice', 6.5, { n: [0, -0.85] });
    for (let i = 0; i < 70; i++) { const q = Math.pow(r(), 1.4), y = Math.round(AM_HZ + 2 + q * (FY - AM_HZ - 3)), x = r() * W, len = 2 + Math.round((y - AM_HZ) * 0.35 * (0.4 + r())), bt = 4.6 + (y - AM_HZ) / (FY - AM_HZ) * 2.6;
      S.hl(x, y, len, 'ice', bt + 1.2, { n: [0, -0.95] }); S.hl(x + 1, y + 1, Math.max(1, len - 2), 'ice', bt - 1, { n: [0, 0.3] }); }
    // far outbuildings on the horizon with a few lit windows
    [[44, 5, 3], [50, 3, 2], [55, 7, 4], [141, 4, 3]].forEach(([x, w, h]) => { S.rect(x, AM_HZ - h, w, h, 'scifi', 2.5); S.hl(x, AM_HZ - h, w, 'scifi', 4); if (w > 4) S.px(x + 2, AM_HZ - 2, 'lamp', 9, { e: 255 }); });
    S.rect(60, AM_HZ - 2, 6, 2, 'scifi', 2); S.ell(63, AM_HZ - 2, 3, 2, 'scifi', 3);   // a far fuel tank
    // ── the elevated station (back): blue-grey modules on stilts, rows of lit windows, a stair tower, snow on the roof
    S.lay('back');
    S.beg(); for (let x = 72; x < 140; x += 11) { S.box(x, 60, 2, 15, 'scifi', 4.5); S.line(x + 1, 62, x + 6, 73, 'scifi', 3.5); } S.rect(70, 74, 70, 1, 'scifi', 3); S.end();
    S.beg();
    S.poly([[68, 45], [140, 45], [140, 58], [136, 61], [72, 61], [68, 58]], 'scifi', 6.5);
    TX.panels(S, 69, 46, 71, 13, 'scifi', 6.8, { pw: 9, ph: 7, rivets: false, v: 0.7 });
    S.box(67, 43, 75, 3, 'scifi', 9, { top: 1 }); S.hl(67, 42, 75, 'ice', 10, { n: [0, -0.9] }); S.hl(70, 41, 20, 'ice', 10, { n: [0, -0.9] }); S.hl(100, 41, 30, 'ice', 9.5, { n: [0, -0.9] });
    S.hl(72, 60, 64, 'scifi', 3.5); S.hl(68, 52, 72, 'scifi', 4.5);
    for (let x = 72, i = 0; x < 136; x += 6, i++) { const on = (i * 7) % 5 !== 2; S.rect(x, 48, 3, 2, on ? 'lamp' : 'glass', on ? 8.5 : 2.5, on ? { e: 2 } : {}); if (on) S.px(x, 48, 'lamp', 10, { e: 2 });
      const on2 = (i * 3) % 4 !== 1; S.rect(x + 2, 55, 3, 2, on2 ? 'lamp' : 'glass', on2 ? 8 : 2.5, on2 ? { e: 2 } : {}); }
    S.end();
    S.beg(); S.box(60, 38, 9, 37, 'scifi', 5.5, { top: 1 }); for (let y = 44; y < 72; y += 5) S.rect(63, y, 3, 2, 'lamp', 7.5, { e: 2 }); S.hl(59, 37, 11, 'ice', 10, { n: [0, -0.9] }); S.end();
    // roof dish mount (the dish itself turns in anim) and a snow drift banked under the stilts
    S.beg(); S.vl(118, 36, 6, 'scifi', 7); S.rect(116, 40, 5, 2, 'scifi', 6); S.end();
    S.lay('wall'); S.poly([[64, 76], [80, 71], [104, 72], [128, 70], [144, 75], [144, 77], [64, 77]], 'ice', 7.8, { n: [0, -0.9] }); S.hl(80, 71, 20, 'ice', 9, { n: [0, -0.9] });
    // ── the radome mast (back): lattice tower, white ball, red beacon on top
    S.lay('back');
    S.beg(); for (let y = 22; y < 78; y++) { const hw = 2 + (y - 22) * 0.06; S.px(30 - hw, y, 'iron', 6); S.px(30 + hw, y, 'iron', 4.5); }
    for (let y = 24; y < 76; y += 6) { const hw = 2 + (y - 22) * 0.06, hw2 = 2 + (y + 6 - 22) * 0.06; S.line(30 - hw, y, 30 + hw2, y + 6, 'iron', 5); S.line(30 + hw, y, 30 - hw2, y + 6, 'iron', 4); } S.end();
    S.beg(); S.ell(30, 17, 6, 6, 'linen', 7.5, { dome: 1 }); [[28, 13], [32, 13], [26, 17], [30, 17], [34, 17], [28, 21], [32, 21]].forEach(([x, y]) => S.px(x, y, 'linen', 6)); S.px(27, 14, 'linen', 10); S.px(28, 13, 'linen', 9.5); S.rect(28, 23, 5, 2, 'iron', 5); S.end();
    S.beg(); S.rect(29, 9, 3, 2, 'iron', 4); S.end(); S.px(30, 8, 'red', 7, { e: 4 });
    // ── the igloo (mid): snow blocks in courses, a tunnel door glowing from inside
    S.lay('mid');
    S.beg(); dome(S, 20, FY, 16, 15, 'ice', 7.4, { sh: 1.1 });
    for (let y = FY - 14; y < FY; y += 3) { for (let x = 4; x < 37; x++) if (S.at(x, y)) S.px(x, y, 'ice', 5.2 - (x - 20) / 16, { n: [0, 0.4] }); }
    for (let row = 0, y = FY - 13; y < FY; y += 3, row++) for (let x = 6 + (row % 2) * 3; x < 36; x += 6) if (S.at(x, y + 1)) { S.px(x, y + 1, 'ice', 5); S.px(x, y + 2, 'ice', 5); S.px(x - 1, y + 1, 'ice', 8.6); }
    S.rect(19, FY - 15, 3, 1, 'ice', 4); S.end();
    // the tunnel porch sticks out toward us: an outer arch of blocks, a doorway lit warm from inside
    S.beg(); for (let y = FY - 10; y < FY; y++) for (let x = 26; x < 41; x++) { const u = (x + 0.5 - 33.5) / 7, v = (y + 0.5 - FY) / 10; if (u * u + v * v <= 1) S.px(x, y, 'ice', 8 - u * 1.2, { n: [u * 0.8, v * 0.8] }); }
    S.hl(27, FY - 5, 13, 'ice', 5.4); for (let x = 29; x < 40; x += 4) S.vl(x, FY - 9, 4, 'ice', 5.4);
    for (let y = FY - 7; y < FY; y++) for (let x = 30; x < 38; x++) { const u = (x + 0.5 - 34) / 4, v = (y + 0.5 - FY) / 7; if (u * u + v * v <= 1) S.px(x, y, 'lamp', v < -0.55 ? 4 : Math.abs(u) > 0.6 ? 5.5 : 7, { e: 3 }); }
    S.end();
    S.lay('wall'); S.shadow([[4, FY], [37, FY], [44, FY + 3], [8, FY + 3]], 1.2);
    // ── the ceremonial pole (mid): candy stripes, a mirror ball, the ring of flags on thin poles (cloth waves in anim)
    S.lay('mid');
    AM_FLAGS.forEach(([x, y]) => { S.beg(); S.vl(x, y - AM_FH, AM_FH, 'iron', 7.5); S.px(x, y - AM_FH - 1, 'brass', 8.5); S.end({ none: 1 }); });   // bare single-pixel poles
    S.beg(); S.box(52, FY - 3, 8, 3, 'stone', 6, { top: 1 }); S.cyl(54, FY - 21, 4, 18, 'linen', 9, { rim: 2 });
    for (let y = FY - 21; y < FY - 3; y++) for (let x = 54; x < 58; x++) if (((x - y) & 7) < 3) S.px(x, y, 'red', 7 - (x === 57 ? 1.5 : 0), { n: [(x - 55.5) * 0.4, 0] });
    S.end();
    // the chrome mirror ball: bright sky-lit top left, the aurora's teal band across the middle, snow below, a dark crescent low right
    S.beg(); for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { if (x * x + y * y > 17) continue; const e = { e: 255 }, X0 = 56 + x, Y0 = FY - 25 + y, rim = (x + 1) * (x + 1) + (y + 1) * (y + 1) > 13 && x + y > 1;
      if (rim) S.px(X0, Y0, 'iron', y > 1 || x > 2 ? 3 : 4, e);
      else if (y <= -2) S.px(X0, Y0, x <= 0 ? 'linen' : 'ice', x <= 0 ? 9 : 8.6, e);
      else if (y === -1) S.px(X0, Y0, 'teal', x > 1 ? 7 : 8, e);
      else if (y === 0) S.px(X0, Y0, 'teal', x > 1 ? 6 : 7, e);
      else S.px(X0, Y0, 'ice', 8 - y * 0.6 - (x > 0 ? 0.8 : 0), e); }
    S.px(54, FY - 28, 'linen', 10, { e: 255 }); S.px(53, FY - 27, 'linen', 10, { e: 255 }); S.end();
    // helium cylinder for the balloons, and a lit door at the foot of the stair tower
    S.beg(); S.cyl(98, FY - 13, 4, 13, 'leaf', 5, { rim: 2 }); S.ell(100, FY - 13, 2, 1.5, 'leaf', 7, { dome: 1 }); S.rect(99, FY - 16, 2, 2, 'brass', 7); S.hl(98, FY - 8, 4, 'linen', 8); S.end();
    S.lay('back'); S.beg(); S.rect(62, 67, 5, 8, 'lamp', 7, { e: 2 }); S.vl(62, 67, 8, 'lamp', 5, { e: 2 }); S.hl(61, 66, 7, 'scifi', 8); S.end();
    // ── foreground: a cargo sled with crates and a fuel drum, a snow bank
    S.lay('front');
    S.beg(); S.line(112, 99, 141, 99, 'iron', 7); S.line(141, 99, 144, 96, 'iron', 7); S.px(144, 95, 'iron', 8); S.hl(112, 100, 29, 'iron', 3);
    for (let x = 115; x < 140; x += 8) S.vl(x, 96, 3, 'iron', 5); S.box(113, 94, 29, 2, 'wood', 6); S.end();
    S.beg(); S.box(115, 84, 11, 10, 'wood', 6, { top: 2 }); S.hl(115, 88, 11, 'wood', 4); S.line(116, 85, 125, 92, 'wood', 5); S.rect(118, 81, 5, 1, 'ice', 10, { n: [0, -0.9] }); S.end();
    S.beg(); S.cyl(128, 83, 8, 11, 'red', 6, { rim: 2.5 }); S.hcyl(128, 86, 8, 1, 'red', 4); S.hcyl(128, 90, 8, 1, 'red', 4); S.ell(132, 83, 4, 1.2, 'red', 8, { n: [0, -0.8] }); S.px(130, 82, 'iron', 7); S.end();
    S.beg(); S.box(137, 87, 6, 7, 'denim', 5, { top: 1 }); S.hl(137, 89, 6, 'gold', 7); S.end();
    S.beg(); S.poly([[96, 101], [104, 97], [118, 99], [124, 101]], 'ice', 9, { n: [0, -0.9] }); S.end({ none: 1 });
    // the station's generator stack breathes vapour; the igloo's vent a thinner curl
    S.lay('back'); S.beg(); S.box(130, 36, 4, 7, 'scifi', 7); S.hl(130, 36, 4, 'iron', 4); S.end();
    sc.emit({ k: 'steam', x: 132, y: 34, rate: 1.1, sp: 5, ang: 0.5, spread: 0.5, life: 2.2 });
    sc.emit({ k: 'steam', x: 20, y: FY - 17, rate: 0.35, sp: 3, ang: 0.3, spread: 0.4, life: 1.2 });
    // the aurora's light moves over the snow in slow bands, brighter under the surge
    sc.field({ x0: 4, y0: AM_HZ + 1, x1: W - 4, y1: FY + 8, lay: 'wall', fn: (x, y, t, s) => { const st = s.st; if (st.ft !== t) { st.ft = t; const c = st.fc || (st.fc = new Float32Array(W * 3)), sg = st.surge || 0;
        for (let i = 0; i < W; i++) { const g = sg ? sg * Math.exp(-((i - st.sx) / 30) * ((i - st.sx) / 30)) * 0.4 : 0; for (let r = 0; r < 3; r++) { const v = Math.sin(i * 0.047 - r * 0.9 + t * 0.35) + 0.6 * Math.sin(i * 0.12 + t * 0.6 + r * 0.5); c[r * W + i] = (v > 0.8 ? 0.3 : v > 0.05 ? 0.13 : 0) * (1 - r * 0.2) + g; } } }
      return st.fc[Math.min(2, ((y - AM_HZ) / 12) | 0) * W + x]; } });
    // diamond dust: ice crystals glinting in the still air
    sc.emit({ k: 'glint', x: 80, y: 50, w: 140, h: 70, rate: 1.2, sp: 1, life: 0.9 });
  },
  anim(D, t, rs) {
    const st = rs.st;
    // aurora: ripples all the time; every 9 s a surge runs along it (pink hem), the snow flushes green
    const sp = steps(t, 9), surge = sp < 0.3 ? Math.sin(sp / 0.3 * Math.PI) : 0, sx = -30 + sp / 0.3 * 210;
    if (sp < 0.03 && !st.sg) { st.sg = 1; rs.flash(0, 0.9); } if (sp > 0.5) st.sg = 0;
    rs.mul[0] = 1 + surge * 1.1; st.surge = surge; st.sx = sx;
    D.lay('wall'); aurora(D, t, surge, sx);
    // spindrift: snow streaks skating over the plateau
    for (let i = 0; i < 12; i++) { const y = 66 + ((i * 7) % 24), spd = 14 + (i % 4) * 5, x = ((i * 53.7 + t * spd) % 190) - 20, len = 2 + (i % 3); if (x < 4 || x > 144) continue; D.hl(x, y, len, 'ice', 10, { e: 255 }); if (i % 2) D.px(x - 2, y, 'ice', 8, { e: 255 }); }
    // the roof dish tracks slowly across the sky
    D.lay('back'); const da = Math.sin(t * 0.25) * 0.9, dw = Math.max(1, Math.round(Math.abs(Math.cos(da)) * 4));
    D.beg(); for (let k = -3; k <= 3; k++) { const x = 118 + Math.round(Math.sin(da) * 2) + Math.round(k * dw / 3.5), y = 33 + Math.round(Math.abs(k) * 0.5); D.px(x, y, 'linen', 8 - Math.abs(k) * 0.4, { n: [k * 0.2, -0.5] }); D.px(x, y + 1, 'linen', 6); } D.line(118, 36, 118 + Math.round(Math.sin(da) * 3), 31, 'iron', 7); D.end();
    // someone walks past the station windows (seen only through the glass)
    const wx = Math.round(72 + (t * 4 % 64)); if ((wx - 72) % 6 < 2) D.rect(wx, 48, 2, 2, 'hair', 2);
    // a snowcat crawls across the far plateau, headlights on, its light sliding over the snow
    const cq = steps(t, 38), cxp = Math.round(-14 + cq * 180);
    if (cxp > -10 && cxp < 150) { D.lay('wall'); D.beg(); D.rect(cxp, 66, 7, 3, 'red', 5.5); D.rect(cxp + 1, 64, 4, 2, 'glass', 5); D.hl(cxp, 69, 8, 'iron', 2.5); D.px(cxp + ((t * 8) & 1), 69, 'iron', 5); D.end({ none: 1 });
      if (cxp + 7 > 4 && cxp + 7 < 145) { D.px(cxp + 7, 67, 'lamp', 11, { e: 255 }); D.px(cxp + 8, 67, 'lamp', 9, { e: 255 }); D.px(cxp + 9, 67, 'lamp', 7, { e: 255 }); } if (cxp > 4) D.px(cxp - 1, 67, 'red', 8, { e: 255 });
      rs.dl.push({ x: cxp + 12, y: 69, z: 4, r: 12, i: 0.6, rgb: hex('#fff0c0'), tint: 0.3 }); }
    // a tiny far figure trudging between the stilts, for scale
    const fq = steps(t, 26), fx = Math.round(142 - fq * 76), fb = Math.round(Math.abs(Math.sin(t * 5)) * 0.6);
    if (fx > 70 && fx < 140) { D.beg(); D.rect(fx, 69 - fb, 2, 4, 'red', 6); D.px(fx, 67 - fb, 'skin', 6); D.px(fx + 1, 67 - fb, 'red', 7); D.px(fx, 73, 'iron', 3); D.px(fx + 1, 73 - (Math.sin(t * 5) > 0 ? 1 : 0), 'iron', 3); D.end({ none: 1 }); }
    // the mast beacon
    D.px(30, 8, 'red', 7, { e: 4 }); D.px(29, 8, 'red', 5, { e: 4 }); D.px(31, 8, 'red', 5, { e: 4 });
    // a shooting star now and then
    const mq = steps(t, 7.3); if (mq < 0.1) { const k = mq / 0.1, mx = 128 - k * 60, my = 8 + k * 16; for (let j = 0; j < 7; j++) D.px(mx + j * 2.5, my - j * 0.67, 'linen', 11 - j * 1.2, { e: 255 }); }
    // a penguin waddles along the front, and stops to flap at the aurora when it surges
    const pw = X.stroll(t, 30, 98, 4, 0.9, 2.5); D.lay('front'); penguin(D, pw.x, 99, pw.dir, t, pw.walking && !surge, surge > 0.3);
    // stars flare now and then
    D.lay('wall'); X.twinkle(D, t, 10, 30, 7);
    // flags around the pole flutter
    D.lay('mid'); AM_FLAGS.forEach(([x, y, m], i) => flag(D, x, y - AM_FH, 4, 3, m, 6.5, t, i * 1.3, surge * 0.5));
    // igloo door flame flicker inside
    D.lay('mid'); flame(D, 34, FY - 1, 3, t, 0.7);
    // the scientist: inflates a weather balloon, lets it go (12 s), then notes it down on a clipboard
    const q = steps(t, 12), ax = 84;
    let pose, bal = null;
    if (q < 0.42) { const bob = q > 0.3 ? Math.sin(t * 6) * 0.1 : 0; pose = { aF: 2.75 + bob, eF: 0.2, aB: 2.55 - bob, eB: 0.35, lF: 0.12, lB: -0.12 }; const hd = handAt(ax, FY, pose, 1), rr = 2 + Math.min(1, q / 0.3) * 4; bal = [hd[0], hd[1] - rr - 3, rr, hd]; }
    else if (q < 0.55) { const k = (q - 0.42) / 0.13; pose = { aF: 2.7 - k * 1.4, eF: 0.2, aB: 2.5 - k * 1.8, eB: 0.2, lF: 0.12, lB: -0.12 }; }
    else pose = { aF: 1.5, eF: -1.3, aB: 0.3, eB: -0.3, tool: 'board', lF: 0.1, lB: -0.1 };
    const look = { skin: ['skin', 6], hair: ['hair', 3], top: ['red', 6.5], bot: ['iron', 4], boot: ['iron', 2], hood: ['red', 7.5] };
    worker(D, ax, FY, look, pose, 1);
    if (steps(t, 3.1) < 0.03 && !st.br) { st.br = 1; rs.burst('steam', ax + 4, FY - 24, 2, { sp: 5, ang: 1.3, spread: 0.4, life: 0.9 }); } if (steps(t, 3.1) > 0.5) st.br = 0;   // breath in the cold
    // the mirror ball catches the aurora
    if (surge > 0.05) { D.hl(53, FY - 26, 6, 'teal', 8 + surge * 2.5, { e: 255 }); D.hl(53, FY - 25, 6, 'teal', 7 + surge * 2.5, { e: 255 }); }
    if (q >= 0.42 && !st.rel) { st.rel = 1; rs.burst('glint', 88, 52, 4, { sp: 18, life: 0.5, w: 6, h: 6 }); } if (q < 0.1) st.rel = 0;
    if (q >= 0.42) { const k = (q - 0.42) / 0.58, yy = 52 - k * k * 72 - k * 20, xx = 88 + k * 24 + Math.sin(t * 1.3) * 2, rr = 6 - k * 2.5; if (yy > 2) bal = [xx, yy, rr, null]; }
    if (bal) { const [bx, by, br, hd] = bal; D.lay(hd ? 'mid' : 'back'); D.beg(); D.ell(bx, by, br, br * 1.1, 'linen', 8.5, { dome: 1 }); D.px(bx - br * 0.4, by - br * 0.5, 'linen', 10.5); D.end({ none: br < 3 });
      if (hd) { D.line(hd[0], hd[1], bx, by + br, 'linen', 6); if (q < 0.34) { D.line(100, FY - 16, 97, FY - 24, 'hair', 3); D.line(97, FY - 24, hd[0] + 1, hd[1] + 1, 'hair', 3); } } else { D.vl(bx, by + br + 1, 5, 'linen', 5); D.rect(bx - 1, by + br + 6, 2, 2, 'iron', 7); } }
  },
});

// ───────── 布达拉宫 potala (epic · magic · luck) ─────────
// the palace on its hill under a moon and snow peaks, floodlit warm from below: white wings, the red palace, gilded roofs;
// a string of prayer flags across the sky, a juniper burner smoking at the left, a great prayer wheel in its shrine at the
// right that a monk keeps turning (a bell rings each turn and mantra runes rise); a pilgrim walks the kora with a hand
// wheel; every ~11 s a gust streams the flags out flat, presses the smoke level, tears wind-horse papers off the string into
// the night sky, and at its height the floodlights surge and every gilded roof blazes.
const PO_FLAGS = [['denim', 6.5], ['linen', 9], ['red', 6.5], ['leaf', 7.5], ['gold', 8]];
const PO_PEAKS = [[4, 38, 0.9], [26, 27, 1.05], [52, 36, 0.8], [80, 33, 0.9], [118, 15, 1.0], [146, 30, 0.9]];
const poPeak = (x) => { let best = 1e9, pk = null; PO_PEAKS.forEach(p => { const y = p[1] + Math.abs(x - p[0]) * p[2] + Math.sin(x * 0.61 + p[0]) * 0.8 + Math.sin(x * 0.23) * 1.2; if (y < best) { best = y; pk = p; } }); return [best, pk]; };
const poHill = (x) => 71 - 13 * Math.exp(-((x - 75) / 46) * ((x - 75) / 46));
const poStr = (x) => { const u = (x - 8) / 138; return 12 + (5 - 12) * u + 9 * 4 * u * (1 - u) * 0.9; };   // flag string: pole top → right edge, sagging
// a battered Tibetan wall block: sides lean in going up, a dark frieze with gold studs under a white parapet, small windows
function tibBlock(S, x0, x1, top, bot, m, tn, o) {
  o = o || {}; const lean = Math.round((bot - top) / 7);
  S.beg(); S.poly([[x0 + lean, top], [x1 - lean, top], [x1, bot], [x0, bot]], m, tn);
  for (let y = top; y < bot; y++) { const k = (y - top) / (bot - top), xr = Math.round(x1 - lean + lean * k); S.px(xr - 1, y, m, tn - 1.6, { n: [0.7, 0] }); S.px(xr - 2, y, m, tn - 0.8, { n: [0.4, 0] }); }
  S.rect(x0 + lean, top + 1, x1 - x0 - 2 * lean, 3, 'brick', 2.6); for (let x = x0 + lean + 2; x < x1 - lean - 1; x += 4) S.px(x, top + 2, 'gold', 7.5);
  S.hl(x0 + lean - 1, top, x1 - x0 - 2 * lean + 2, m, tn + 1.4, { n: [0, -0.8] });
  const wr = o.win || 5; for (let y = top + 7, row = 0; y < bot - 3; y += wr, row++) { const k = (y - top) / (bot - top), a = x0 + lean - Math.round(lean * k) + 3, b = x1 - lean + Math.round(lean * k) - 4;
    for (let x = a + (row % 2); x < b; x += o.ws || 4) { const lit = o.lit && ((x * 7 + y * 3) % 11) < o.lit; S.rect(x, y, 2, 2, lit ? 'lamp' : 'ink', lit ? 8 : 1, lit ? { e: 3 } : {}); S.hl(x - 1, y + 2, 4, 'ink', 1.5); } }
  S.end();
}
// a gilded pagoda roof with upturned eaves and a finial
function goldRoof(S, cx, by, w, h) {
  S.beg(); const hw = w / 2;
  S.poly([[cx - hw - 2, by], [cx + hw + 2, by], [cx + hw - 1, by - h + 1], [cx - hw + 1, by - h + 1]], 'gold', 6.5);
  S.px(cx - hw - 3, by - 1, 'gold', 8); S.px(cx + hw + 2, by - 1, 'gold', 7); S.hl(cx - hw - 2, by, w + 4, 'gold', 4.5);
  for (let x = Math.round(cx - hw); x < cx + hw; x += 2) S.vl(x, by - h + 2, h - 2, 'gold', 5.5);
  S.hl(cx - hw + 1, by - h + 1, w - 2, 'gold', 9, { n: [0, -0.8] });
  S.vl(Math.round(cx), by - h - 3, 3, 'gold', 8.5); S.px(Math.round(cx), by - h - 4, 'gold', 10);
  S.end();
}
const PO_ROOFS = [[63, 30, 9, 5], [88, 30, 9, 5], [75.5, 30, 14, 7], [75.5, 22, 8, 4]];
const PO_BANNERS = [[58, 29], [94, 29], [45, 41], [106, 42]];   // gyaltsen, the gilded victory banners
// the same gilded roof repainted glowing (tone tn), for the flash at the height of the gust; the baked outline stays
function goldRoofLit(D, cx, by, w, h, tn) {
  const hw = w / 2, e = { e: 255 };
  D.poly([[cx - hw - 2, by], [cx + hw + 2, by], [cx + hw - 1, by - h + 1], [cx - hw + 1, by - h + 1]], 'gold', tn, e);
  D.px(cx - hw - 3, by - 1, 'gold', tn + 1, e); D.px(cx + hw + 2, by - 1, 'gold', tn, e); D.hl(cx - hw - 2, by, w + 4, 'gold', tn - 1.5, e);
  for (let x = Math.round(cx - hw); x < cx + hw; x += 2) D.vl(x, by - h + 2, h - 2, 'gold', tn - 0.8, e);
  D.hl(cx - hw + 1, by - h + 1, w - 2, 'gold', 11, e); D.vl(Math.round(cx), by - h - 3, 3, 'gold', tn + 0.5, e); D.px(Math.round(cx), by - h - 4, 'gold', 11, e);
}
// wind-horse papers (lungta): five colours, bright face / darker back as they tumble
const PO_LUNG = [['denim', 8.5], ['linen', 10], ['red', 8], ['leaf', 9], ['gold', 9]];
X.def('potala', {
  amb: [0.28, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 50, far: 'none', floor: 'stone', moon: [40, 23, 5] });                                  // 0 moon
    sc.light({ x: 75, y: 104, z: 40, r: 108, i: 0.8, c: '#ffc27a', tint: 0.3 });                                     // 1 floodlights from below
    sc.light({ x: 75, y: 50, z: 22, r: 30, i: 0.45, c: '#ffb060', fl: 'candle', ph: 3, tint: 0.15 });                  // 2 lamps in the windows
    sc.light({ x: 19, y: 77, z: 14, r: 38, i: 1, c: '#ff8a30', fl: 'fire', tint: 0.3 });                              // 3 juniper burner
    sc.light({ x: 137, y: 74, z: 12, r: 30, i: 0.7, c: '#ffc060', fl: 'candle', ph: 1, tint: 0.45 });                  // 4 butter lamp at the wheel
    const r = S.r;
    // snow peaks: faces toward the moon (left) lit, snow on the upper slopes running down the gullies, dark rock below
    S.lay('wall');
    for (let x = 0; x < W; x++) { const [top, pk] = poPeak(x), lit = x < pk[0], sl = pk[1] + 10 + Math.sin(x * 0.9) * 1.5 + ((x * 7) % 5 === 0 ? 4 : (x * 3) % 7 === 0 ? 2 : 0);
      for (let y = Math.round(top); y < FY; y++) { const snow = y < sl, d = y - top;
        S.px(x, y, snow ? 'linen' : 'night', snow ? (lit ? 8 : 5.4) - (d > 7 ? 0.7 : 0) : (lit ? 2.6 : 1.7), { e: 255 }); }
      S.px(x, Math.round(top), lit ? 'linen' : 'lav', lit ? 10 : 7, { e: 255 }); }
    // nearer foothills, darker, no snow
    for (let x = 0; x < W; x++) { const top = Math.round(60 - 6 * Math.abs(Math.sin(x * 0.05 + 2)) - 2 * Math.sin(x * 0.13)); for (let y = top; y < FY; y++) S.px(x, y, 'night', 1.2 + (y === top ? 0.8 : 0), { e: 255 }); }
    // ── Marpo Ri, the hill under the palace (back)
    S.lay('back');
    S.beg(); for (let x = 4; x < W - 4; x++) { const top = Math.round(poHill(x)); for (let y = top; y < FY; y++) S.px(x, y, 'mstone', 4.6 + (y === top ? 1 : 0), { n: [0, -0.4] }); } S.noise(4, 55, W - 8, 35, 1, 4, 7); S.end({ none: 1 });
    for (let i = 0; i < 16; i++) { const x = 8 + r() * 134, y = poHill(x) + 3 + r() * (FY - poHill(x) - 6); S.beg(); S.ell(x, y, 2 + r() * 2, 1.2 + r(), 'mstone', 5.5, { dome: 1 }); S.end(); }
    // ── the palace: white wings stepping up the hill, the red palace in the middle, gilded roofs on top
    tibBlock(S, 7, 40, 56, 82, 'bone', 7.6, { lit: 2 });
    tibBlock(S, 26, 62, 43, 80, 'bone', 8, { lit: 2 });
    tibBlock(S, 110, 143, 57, 82, 'bone', 7.6, { lit: 2 });
    tibBlock(S, 88, 124, 44, 80, 'bone', 8, { lit: 2 });
    tibBlock(S, 54, 97, 30, 74, 'crimson', 6, { lit: 3, win: 6, ws: 5 });
    // the dark yak-hair curtain high on the red palace, and the great hall door
    S.beg(); S.rect(68, 35, 15, 6, 'brick', 2.4); for (let x = 69; x < 83; x += 3) S.vl(x, 35, 6, 'brick', 1.5); S.hl(68, 35, 15, 'gold', 6.5); S.end();
    S.beg(); S.rect(70, 64, 11, 10, 'ink', 1); S.hl(69, 63, 13, 'gold', 7); S.rect(72, 65, 7, 9, 'crimson', 3); S.vl(75, 65, 9, 'gold', 6); S.end();
    // a stairway slanting up the right wing, a lit parapet and a shadow under it (it runs behind the prayer-wheel shrine)
    [[141, 79, 115, 59]].forEach(([x0, y0, x1, y1]) => { const d = Math.sign(x1 - x0), n = Math.abs(x1 - x0), sl = (y1 - y0) / n;
      for (let k = 0; k <= n; k++) { const x = x0 + k * d, y = Math.round(y0 + k * sl); S.px(x, y - 2, 'bone', 8.2, { n: [0, -0.8] }); S.px(x, y - 1, 'bone', 6.4 + (k % 2 ? 0.7 : 0)); S.px(x, y, 'bone', 6.4 + (k % 2 ? 0.7 : 0)); S.px(x, y + 1, 'bone', 4.4); } });
    PO_ROOFS.forEach(([cx, by, w, h]) => goldRoof(S, cx, by, w, h));
    PO_BANNERS.forEach(([x, y]) => { S.beg(); S.cyl(x - 1, y - 4, 3, 4, 'gold', 7, { rim: 1.5 }); S.px(x, y - 5, 'gold', 9.5); S.end(); });   // gyaltsen, victory banners
    // the long front wall of the palace precinct, a dark band and gold studs on top, a gate in the middle
    S.beg(); S.rect(4, 80, W - 8, 9, 'bone', 7.2); S.rect(4, 80, W - 8, 2, 'brick', 2.6); for (let x = 6; x < W - 6; x += 5) S.px(x, 80, 'gold', 7); S.hl(4, 79, W - 8, 'bone', 8.6, { n: [0, -0.8] }); S.hl(4, 88, W - 8, 'bone', 5);
    S.hl(67, 81, 17, 'crimson', 5); S.end();
    // the gate: an arched opening outlined in ink, two crimson leaves swung half open, lamplight in the gap between them
    S.beg(); for (let y = 82; y < 89; y++) { const a = y === 82 ? 71 : 70, b = y === 82 ? 80 : 81;
      for (let x = a; x < b; x++) { const k = x - a, w = b - a, leaf = k < 3 || k >= w - 3, lx = k < 3 ? k : w - 1 - k;
        if (leaf) S.px(x, y, 'crimson', (k < 3 ? 5.4 : 4) + (lx === 0 ? -1 : 0) + (y === 85 && lx === 1 ? 2.5 : 0), y === 85 && lx === 1 ? {} : { n: [k < 3 ? -0.4 : 0.4, 0] });
        else S.px(x, y, 'lamp', y === 82 ? 6 : y > 86 ? 8.5 : 7.4, { e: 3 }); } }
    for (let y = 82; y < 89; y += 3) { S.px(71, y + 1, 'gold', 7.5); S.px(79, y + 1, 'gold', 6.5); }
    S.end({ ink: 1 });
    // ── left: a juniper burner (whitewashed, a firebox mouth) and the flag pole
    S.lay('mid');
    S.beg(); S.box(9, 82, 20, 8, 'bone', 7.5, { top: 1 }); S.hl(9, 85, 20, 'brick', 3); dome(S, 19, 82, 8, 9, 'bone', 7.8); S.rect(17, 71, 5, 3, 'bone', 7); S.vl(19, 67, 4, 'gold', 7.5); S.px(19, 66, 'gold', 9.5); S.end();
    S.beg(); for (let y = 76; y < 82; y++) for (let x = 15; x < 24; x++) { const u = (x + 0.5 - 19.5) / 4.5, v = (y + 0.5 - 82) / 6; if (u * u + v * v <= 1) S.px(x, y, 'fire', v < -0.6 ? 3 : 4, { e: 4 }); } S.end({ none: 1 });
    S.lay('front'); S.beg(); S.cyl(6, 12, 2, FY - 12, 'wood', 6, { rim: 1 }); S.rect(5, 10, 4, 2, 'gold', 8); S.px(6, 9, 'gold', 10); S.rect(4, FY - 3, 6, 3, 'stone', 5); S.end();
    // ── right: the prayer-wheel shrine: posts, a red eave with gold trim, a ledge with a butter lamp, the bell
    S.lay('mid');
    S.beg(); S.box(113, 62, 3, 28, 'wood', 5); S.box(136, 62, 3, 28, 'wood', 4.5); S.box(112, 86, 28, 4, 'stone', 6, { top: 1 }); S.end();
    S.beg(); S.poly([[108, 62], [144, 62], [139, 55], [113, 55]], 'crimson', 5.5); S.hl(108, 62, 36, 'gold', 7.5); S.hl(112, 58, 28, 'brick', 3); for (let x = 115; x < 139; x += 3) S.px(x, 59, 'gold', 8);
    S.px(107, 61, 'gold', 9); S.px(144, 61, 'gold', 8); S.hl(113, 55, 26, 'gold', 8.5, { n: [0, -0.8] }); S.end();
    S.beg(); S.box(135, 77, 6, 2, 'wood', 6); S.rect(136, 75, 3, 2, 'gold', 7); S.end();
    S.beg(); S.rect(130, 63, 3, 3, 'gold', 7.5); S.px(131, 66, 'gold', 5); S.vl(131, 62, 1, 'iron', 5); S.end();
    sc.emit({ k: 'ember', x: 19, y: 76, w: 6, rate: 1.4, sp: 6, ang: 0, spread: 0.6, life: 1.4 });
    // juniper smoke: a slow curl leaning right in calm air; in the gust it is pressed flat and torn away to the right
    sc.emit({ k: 'steam', x: 19, y: 66, rate: 2.4, sp: 7, ang: 0.25, spread: 0.4, life: 1.8, when: (t, s) => !(s.st.gust > 0.3) });
    sc.emit({ k: 'steam', x: 20, y: 66, rate: 6, sp: 30, ang: 1.5, spread: 0.2, life: 1.3, when: (t, s) => s.st.gust > 0.3 });
  },
  anim(D, t, rs) {
    const st = rs.st, gq = steps(t, 11), gust = gq < 0.3 ? Math.sin(gq / 0.3 * Math.PI) : 0; st.gust = gust;
    // stars
    D.lay('wall'); X.twinkle(D, t, 10, 30, 11);
    // the gust's wind: two rows of long streaks with bright heads, running over the sky and the snow peaks (behind the palace)
    if (gust > 0.12) for (let r = 0; r < 2; r++) { const fr = ((gq / 0.3) * 2.2 + r * 0.45) % 1, hx = Math.round(-12 + fr * 178), L = Math.round(12 + gust * 6), yr = r ? 35 : 24;
      for (let j = 0; j < L; j++) { const x = hx - j; if (x < 4 || x > 145 || (j > L - 5 && j % 2)) continue; const y = yr + Math.round(Math.sin(x * 0.09 + r * 2) * 1.2);
        D.px(x, y, 'ice', j === 0 ? 11 : j < 3 ? 10 : j < L * 0.45 ? 9.2 : j < L * 0.75 ? 8 : 6.5, { e: 255 }); if (j < 3) D.px(x, y + 1, 'ice', j === 0 ? 10 : 8.5, { e: 255 }); } }
    // the fire in the burner's mouth (its smoke is the emitters')
    D.lay('mid');
    for (let k = 0; k < 3; k++) flame(D, 17 + k * 2, 81, 3 + (k === 1 ? 1 : 0), t, k * 1.9);
    // the great prayer wheel: embossed mantra bands roll round as it turns; a peg rings the bell once a turn
    const wdt = clamp(t - (st.wt == null ? t : st.wt), 0, 0.1); st.wt = t; st.a = (st.a || 0) + wdt * (1.35 + gust * 0.3); const a = st.a;   // integrated: the gust speeds it up, never jumps it
    D.beg(); const wx = 119, ww = 12, wy = 66, wh = 19;
    for (let i = 0; i < ww; i++) { const u = (i + 0.5) / ww * 2 - 1, th = Math.asin(u) + a, shade = -Math.pow(Math.abs(u), 3) * 2.2 - u * 0.6;
      for (let k = 0; k < wh; k++) { const band = k < 2 || k >= wh - 2, mark = !band && k > 3 && k < wh - 4 && (((th / (Math.PI * 2)) * 8 % 1 + 1) % 1) < 0.28 && (k % 3 !== 0);
        D.px(wx + i, wy + k, band ? 'gold' : mark ? 'gold' : 'crimson', (band ? 7 : mark ? 8 : 5.5) + shade, { n: [u * 0.9, 0] }); } }
    D.hl(wx, wy - 1, ww, 'gold', 8.5, { n: [0, -0.8] }); D.hl(wx, wy + wh, ww, 'gold', 5); D.vl(wx + 5, wy - 4, 3, 'iron', 6); D.vl(wx + 5, wy + wh + 1, 1, 'iron', 5);
    D.end();
    const px = Math.sin(a) * 5.5, pz = Math.cos(a); if (pz > 0) D.px(wx + 6 + Math.round(px), wy - 2, 'iron', 8);
    const ring = Math.floor(a / (Math.PI * 2)); if (ring !== st.ring) { if (st.ring != null) { rs.flash(4, 0.9); rs.burst('glint', 131, 64, 3, { sp: 14, life: 0.5 }); rs.burst('rune', 125, 64, 5, { sp: 12, ang: 0, spread: 1.4, life: 2, w: 10 }); st.ding = t; } st.ring = ring; }
    const dg = st.ding != null ? t - st.ding : 9; D.px(131 + (dg < 0.6 ? Math.round(Math.sin(dg * 30) * (1 - dg / 0.6)) : 0), 66, 'gold', 5);
    // butter lamp flame, and a row of small lamps along the precinct wall
    flame(D, 137, 75, 3, t, 2.2);
    D.lay('back'); [26, 40, 54, 96, 110, 124].forEach((x, i) => { D.px(x, 78, 'gold', 6); D.px(x, 77, 'fire', 9 + Math.round(n1(t * 7 + i * 3) * 1.5), { e: 255 }); if (n1(t * 5 + i) > 0) D.px(x, 76, 'fire', 7, { e: 255 }); }); D.lay('mid');
    // the monk keeps the wheel turning, his hand on the rim
    const push = Math.sin(a * 2) * 0.25;
    worker(D, 110, FY, { skin: ['skin', 5], hair: ['skin', 3.5], top: ['crimson', 5.5], bot: ['crimson', 4], boot: ['crimson', 2], robe: 1 }, { aF: 1.45 + push, eF: -0.1, aB: 0.35, eB: -0.4, lean: 0.25 + push * 0.3 }, 1);
    // a pilgrim walks the kora, spinning a hand wheel
    const w = X.stroll(t, 38, 96, 6, 0.55, 2.2), pose = Object.assign(w.pose, { aF: 1.35, eF: -1.1 }), hd = handAt(w.x, FY, pose, w.dir);
    worker(D, w.x, FY, { skin: ['skin', 5], hair: ['hair', 2], top: ['leather', 5], bot: ['leather', 3], boot: ['hair', 2], hat: ['leather', 6.5] }, pose, w.dir);
    const hw = t * 9; D.vl(hd[0], hd[1] - 5, 5, 'wood', 6); D.beg(); D.rect(hd[0] - 1, hd[1] - 9, 3, 4, 'gold', 7); D.px(hd[0] + (Math.sin(hw) > 0 ? 1 : -1), hd[1] - 8, 'gold', 9.5); D.px(hd[0] + Math.round(Math.cos(hw) * 3), hd[1] - 8, 'iron', 6); D.end({ none: 1 });
    // prayer flags on their string across the sky: they ripple, and whip in the gust
    D.lay('front');
    for (let x = 8; x < 146; x++) D.px(x, Math.round(poStr(x) + Math.sin(t * 1.3 + x * 0.05) * 0.4), 'hair', 4);
    // in the gust the flags stream out flat (4–5 px) with their tails kicked up, snapping as they go
    for (let i = 0, x = 11; x < 142; x += 5, i++) { const [m, tn] = PO_FLAGS[i % 5], y0 = Math.round(poStr(x + 2)) + 1, sw = Math.sin(t * 3.1 + i * 0.8) * 0.8 * (1 - gust) + gust * (4.3 + Math.sin(t * 13 + i) * 0.6);
      for (let k = 0; k < 5; k++) { const dx = Math.round(sw * k / 4), dy = gust > 0.25 ? -Math.round(gust * (k / 4) * (k / 4) * 2.4) : 0, fl = gust > 0.25 && Math.sin(t * 24 + i * 1.3 + k) > 0.5 ? 0.8 : 0;
        for (let j = 0; j < 4; j++) D.px(x + j + dx, y0 + k + dy, m, tn + fl + (j === 0 ? 0.6 : j === 3 ? -0.8 : 0) + (k === 4 ? -0.6 : 0)); } }
    // the gust's wind-horse papers: 22 squares torn off the string, tumbling (3 → 2 → 1 px wide as they turn). They drop clear of
    // the flags into the night sky: the left dozen sweep over the moon and the left peak, then climb steeply over the gilded roofs
    // and out of the top; the right ten blow out over the right peaks. Never across the white walls.
    if (gq < 0.5) for (let i = 0; i < 22; i++) { const A = i < 12, d = ((i * 7) % 11) / 11 * 0.1 + (A ? 0 : 0.02), k = (gq - d) / 0.3; if (k < 0 || k > 1) continue;
      const x0 = A ? 12 + ((i * 17) % 35) : 96 + ((i * 13) % 33), ys = poStr(x0) + 2, yl = A ? 27 + ((i * 5) % 12) : 22 + ((i * 5) % 14), wob = Math.sin(k * 10 + i * 1.7) * 1.5, e = Math.min(1, k / 0.2), drop = ys + (yl - ys) * e * e * (3 - 2 * e);
      let x, y; if (A) { x = x0 + (60 - x0 + (i % 3) * 6) * k + Math.sin(k * 7 + i) * 2; y = drop - (yl + 8) * Math.pow(clamp((k - 0.55) / 0.45, 0, 1), 1.6) + wob; }
      else { x = x0 + (160 - x0) * k * (0.6 + 0.4 * k); y = drop + wob; }
      if (x > 146 || y < 4) continue;
      const f = Math.sin(t * (8 + (i % 5) * 2.3) + i), wd = Math.abs(f) > 0.7 ? (i % 3 ? 3 : 2) : Math.abs(f) > 0.3 ? 2 : 1, [m, tn] = PO_LUNG[i % 5];
      const px0 = Math.round(x) - (wd >> 1), py0 = Math.round(y); D.rect(px0, py0, wd, 2, m, f > 0 ? tn : tn - 2.5, { e: 255 }); D.hl(px0, py0 + 2, wd, 'ink', 1, { e: 255 }); }   // a dark underside: invisible on the night sky, it keeps the paper readable over snow and the moon
    // a gleam slides across the gilded roofs; at the height of the gust the floodlights surge and every gilded roof blazes
    D.lay('back'); const gx = 52 + ((t * 11) % 70); PO_ROOFS.forEach(([cx, by, w, h]) => { if (Math.abs(gx - cx) > w / 2) return; for (let y = by - h + 1; y < by; y++) D.px(Math.round(gx - (y - by) * 0.4), y, 'gold', 9.5, { e: 255 }); });
    if (gq > 0.06 && gq < 0.3 && !st.g) { st.g = 1; rs.flash(3, 0.6); } if (gq < 0.03) st.g = 0;   // the wind fans the burner
    if (gq >= 0.15 && gq < 0.3 && !st.pk) { st.pk = 1; st.pkT = t; rs.flash(1, 0.5); rs.burst('glint', 76, 20, 4, { sp: 10, life: 0.6, w: 30, h: 8 }); } if (gq < 0.03) st.pk = 0;
    const pa = st.pkT != null ? t - st.pkT : 9;
    if (pa >= 0 && pa < 0.32) { const tn = pa < 0.2 ? 10 : 8.6; PO_ROOFS.forEach(([cx, by, w, h]) => goldRoofLit(D, cx, by, w, h, tn)); PO_BANNERS.forEach(([x, y]) => { D.rect(x - 1, y - 4, 3, 4, 'gold', tn, { e: 255 }); D.px(x, y - 5, 'gold', 11, { e: 255 }); }); }
  },
});

// ───────── 圣米歇尔山 michel (epic · water · defense) ─────────
// the tidal island under a full moon: granite ramparts and round towers at the waterline, a village of slate roofs and lit
// windows climbing the rock, the abbey and its spire on top with the gilded archangel; the lit windows shiver in the sea,
// the moon lays a path of glitter, a cloud drifts over the moon; on the pier a guard with a halberd walks under a lamp,
// a rowboat bobs; every ~10 s the abbey bell tolls: the archangel flares and a golden ward sweeps out over the island.
const MI_WL = 77;   // the island's waterline
const MI_WIN = [[62, 60], [70, 58], [83, 55], [93, 60], [112, 59], [118, 64], [57, 66]];   // lit village windows
const miRock = [[39, MI_WL], [47, 70], [55, 62], [63, 53], [71, 44], [79, 36], [95, 36], [103, 44], [111, 53], [120, 62], [128, 70], [135, MI_WL]];
function miSea(D, t, y0, y1, mx, skip) {
  for (let y = y0; y < y1; y++) { const k = (y - y0) / Math.max(1, y1 - y0);
    for (let x = 4; x < W - 4; x++) { const near = Math.abs(x - mx) < 5 + k * 16, w = Math.sin(x * 0.45 - t * 1.6 + y * 1.3) + Math.sin(x * 0.17 + t * 0.9 - y * 0.7);
      if (skip(x, y) && !near) continue; if (w > (near ? 0.95 : 1.62 - k * 0.12)) D.px(x, y, 'water', (near ? 9.5 - (w < 1.3 ? 2 : 0) : 5 + k * 1.6), { e: 255 }); } }
}
X.def('michel', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 60, far: 'none', floor: 'water', moon: [124, 19, 6] });                                    // 0 moon
    sc.light({ x: 96, y: 44, z: 20, r: 40, i: 0.45, c: '#ffc070', fl: 'candle', ph: 1, tint: 0.14 });                 // 1 abbey windows
    sc.light({ x: 84, y: 62, z: 16, r: 42, i: 0.45, c: '#ffb060', fl: 'candle', ph: 4, tint: 0.18 });                 // 2 village windows
    sc.light({ x: 50, y: 60, z: 14, r: 46, i: 0.95, c: '#ffb050', fl: 'fire', ph: 2, tint: 0.5 });                     // 3 pier lamp
    sc.light({ x: 87, y: 10, z: 12, r: 64, i: 0.25, c: '#ffd870', fl: 'pulse', amp: 0.2, sp: 1.2, tint: 0.5 });        // 4 the archangel (flares when the bell tolls)
    sc.light({ x: 88, y: 76, z: 60, r: 96, i: 0.42, c: '#ffc27a', tint: 0.22 });                                        // 5 floodlight on the abbey from below
    const r = S.r;
    // the night sea, darker toward us; the mainland's low coast on the left horizon with a few far lights
    S.lay('wall'); S.vgrad(0, 64, W, FY - 64, 'water', 2.6, 1.8, { e: 255 }); S.hl(0, 64, W, 'water', 3.4, { e: 255 });
    S.vgrad(0, FY, W, H - FY, 'water', 2.6, 1.6, { n: [0, -0.9] });
    for (let x = 0; x < 44; x++) { const top = Math.round(61 + Math.abs(Math.sin(x * 0.12)) * 1.5 + x * 0.04); for (let y = top; y < 65; y++) S.px(x, y, 'night', 1.4 + (y === top ? 0.8 : 0), { e: 255 }); }
    [[6, 62], [11, 63], [19, 62], [30, 63], [36, 64]].forEach(([x, y]) => S.px(x, y, 'lamp', 7, { e: 255 }));
    // the island's reflection darkens the sea under it
    S.poly([[42, MI_WL], [132, MI_WL], [122, 84], [104, 90], [70, 90], [52, 84]], 'water', 1.4, { e: 255 });
    // ── the rock: warm granite, moonlit on the right, scrub on the shaded north slope
    S.lay('back');
    S.beg(); S.poly(miRock, 'mstone', 4.4); S.end();
    S.noise(40, 34, 96, 44, 1, 3.5, 5, { only: 'mstone' });
    for (let y = 36; y < MI_WL; y++) for (let x = 40; x < 136; x++) { if (S.at(x, y) !== X.MI.mstone) continue; if (!S.at(x + 2, y) && x > 88) { S.px(x, y, 'mstone', 7.2, { n: [0.7, -0.3] }); S.px(x - 1, y, 'mstone', 6); } }
    for (let i = 0; i < 26; i++) { const x = 44 + r() * 26, y = 58 + r() * 16; if (S.at(x, y)) S.px(x, y, 'moss', 4 + r() * 3); }
    // ── abbey on the summit: the Merveille's buttressed wall, the lodgings, the church, the tower and spire
    S.beg(); S.rect(94, 34, 20, 24, 'stone', 6); for (let x = 95; x < 114; x += 4) { S.vl(x, 34, 24, 'stone', 7.4, { n: [-0.5, 0] }); S.vl(x + 1, 34, 24, 'stone', 4.4, { n: [0.5, 0] }); }
    S.poly([[93, 34], [115, 34], [112, 30], [96, 30]], 'iron', 3.5); S.hl(96, 30, 16, 'iron', 5.5, { n: [0, -0.8] });
    for (let x = 97; x < 113; x += 4) { S.vl(x, 38, 4, 'lamp', 7.5, { e: 2 }); S.vl(x, 48, 3, 'lamp', 7, { e: 2 }); } S.end();
    S.beg(); S.rect(85, 36, 10, 21, 'stone', 5.2); S.hl(85, 36, 10, 'stone', 6.6, { n: [0, -0.8] }); S.rect(88, 41, 2, 3, 'lamp', 7, { e: 2 }); S.rect(88, 49, 2, 3, 'ink', 1); S.end();
    S.beg(); S.rect(68, 38, 18, 16, 'stone', 5.6); S.poly([[67, 38], [87, 38], [84, 34], [70, 34]], 'iron', 3.4); for (let x = 71; x < 85; x += 4) S.rect(x, 43, 2, 3, 'lamp', 7, { e: 2 }); S.hl(68, 48, 18, 'stone', 4); S.end();
    S.beg(); S.rect(76, 26, 22, 10, 'stone', 6.6); S.poly([[75, 26], [99, 26], [96, 21], [78, 21]], 'iron', 4); S.hl(78, 21, 18, 'iron', 6, { n: [0, -0.8] }); for (let x = 79; x < 96; x += 4) S.vl(x, 29, 4, 'lamp', 7, { e: 2 }); S.end();
    S.beg(); S.rect(83, 16, 9, 11, 'stone', 7); S.vl(91, 16, 11, 'stone', 5); S.vl(83, 16, 11, 'stone', 8); [85, 87, 89].forEach(x => S.rect(x, 19, 1, 4, 'ink', 1)); S.hl(82, 16, 11, 'stone', 8.5, { n: [0, -0.8] });
    [82, 92].forEach(x => { S.vl(x, 12, 4, 'stone', 7.5); S.px(x, 11, 'stone', 9); }); S.end();
    S.beg(); for (let y = 8; y < 16; y++) { const hw = (y - 8) * 0.55; for (let x = Math.round(87.5 - hw); x <= Math.round(87.5 + hw); x++) S.px(x, y, 'iron', x > 87.5 ? 6.5 : 4, { n: [x > 87.5 ? 0.6 : -0.3, -0.3] }); if (y % 3 === 0) { S.px(Math.round(87.5 - hw) - 1, y, 'iron', 5); S.px(Math.round(87.5 + hw) + 1, y, 'iron', 7); } } S.end();
    // ── the village: slate-roofed houses stepping up behind the walls, windows lit
    [[58, 66, 7], [66, 64, 6], [74, 63, 8], [84, 64, 7], [93, 65, 6], [101, 64, 8], [110, 66, 7], [118, 67, 6], [62, 57, 6], [71, 55, 7], [110, 56, 6], [117, 60, 6]].forEach(([x, by, w], i) => {
      const hh = 5 + (i % 3); S.beg(); S.rect(x, by - hh, w, hh, i % 2 ? 'stone' : 'bone', i % 2 ? 6 : 6.4); S.poly([[x - 1, by - hh], [x + w + 1, by - hh], [x + w / 2 + 0.5, by - hh - 4]], 'iron', 3.4 + (i % 2) * 0.6); S.hl(x, by - hh, w, 'iron', 2.4);
      S.px(Math.round(x + w / 2), by - hh - 4, 'iron', 6); S.end(); });
    MI_WIN.forEach(([x, y]) => { S.rect(x, y, 2, 2, 'lamp', 8, { e: 3 }); S.px(x, y, 'lamp', 9.5, { e: 3 }); });
    // ── ramparts: a crenellated granite wall along the waterline with round towers and the gate
    S.beg(); TX.ashlar(S, 43, 67, 90, 10, 'stone', 5.4, { bh: 4, bw: 7, crack: 0.05 }); for (let x = 43; x < 133; x += 4) S.rect(x, 65, 2, 2, 'stone', 6.4); S.hl(43, 67, 90, 'stone', 7, { n: [0, -0.8] }); S.end();
    [[46, 62, 7, 15], [69, 60, 9, 17], [100, 61, 7, 16], [124, 63, 7, 14]].forEach(([x, y, w, h], i) => { S.beg(); S.cyl(x, y, w, h, 'stone', 5.8, { rim: 2.4 }); for (let k = 0; k < w; k += 2) S.px(x + k, y - 1, 'stone', 7); S.hl(x, y, w, 'stone', 7.6, { n: [0, -0.8] }); S.rect(x + 2, y + 4, 1, 3, 'ink', 1); if (i === 1) { S.rect(x + 2, y + 9, 5, 8, 'ink', 1); S.px(x + 3, y + 8, 'ink', 1); S.px(x + 5, y + 8, 'ink', 1); S.rect(x + 3, y + 12, 3, 5, 'lamp', 5, { e: 3 }); } S.end(); });
    // weed and wet stone at the waterline
    for (let x = 40; x < 135; x++) if (S.at(x, MI_WL - 1)) { S.px(x, MI_WL - 1, 'moss', 3 + (x % 3)); if (x % 4 === 0) S.px(x, MI_WL - 2, 'moss', 2.5); }
    // ── the pier (mid): planks on posts, a lamp post; the mooring rope to the boat
    S.lay('mid');
    S.beg(); TX.planks(S, 4, 86, 52, 4, 'wood', 5, { ph: 2, pw: 10 }); S.hl(4, 86, 52, 'wood', 7, { n: [0, -0.8] }); for (let x = 8; x < 56; x += 12) { S.box(x, 90, 3, 11, 'wood', 3.5); S.hl(x, 97, 3, 'moss', 4); } S.end();
    S.beg(); S.cyl(49, 60, 3, 26, 'iron', 4, { rim: 1.5 }); S.rect(47, 84, 7, 2, 'iron', 5); S.box(46, 52, 9, 2, 'iron', 6); S.rect(47, 54, 1, 6, 'iron', 5); S.rect(53, 54, 1, 6, 'iron', 4); S.rect(48, 54, 5, 6, 'lamp', 5, { e: 4 }); S.hl(47, 60, 7, 'iron', 5); S.px(50, 51, 'iron', 7); S.end();
    S.beg(); S.cyl(53, 83, 3, 3, 'iron', 5); S.end();
    sc.emit({ k: 'mist', x: 90, y: 80, w: 100, h: 6, rate: 0.35, sp: 2, ang: 1.4, spread: 0.3, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, bq = steps(t, 10), toll = bq < 0.18;
    D.lay('wall'); X.twinkle(D, t, 9, 40, 23);
    // a cloud drifts over the moon; the moonlight dims while it covers it
    const cx = 170 - ((t * 3.2) % 240), cy = 18, cov = Math.max(0, 1 - Math.abs(cx - 124) / 16);
    rs.mul[0] = 1 - cov * 0.55;
    [[-14, 1, 12, 1.6], [0, 0, 16, 2.6], [5, -2, 9, 2.2], [20, 1, 14, 1.8], [34, 0, 9, 1.4]].forEach(([dx, dy, rx, ry]) => { const x0 = cx + dx, y0 = cy + dy; for (let y = Math.floor(y0 - ry); y <= y0 + ry; y++) for (let x = Math.floor(x0 - rx); x <= x0 + rx; x++) { const u = (x - x0) / rx, v = (y - y0) / ry, d = u * u + v * v; if (d > 1 || x < 4 || x > 145) continue;
      const dm = Math.hypot(x - 124, y - 19), rim = d > 0.55 && dm < 16; D.px(x, y, rim ? 'lav' : 'night', rim ? 9 - dm * 0.18 : v < -0.3 ? 3.8 : 3.2, { e: 255 }); } });
    // the sea: rolling glints, a glitter path under the moon, the lit windows shivering on the water
    miSea(D, t, 66, 101, 124, (x, y) => y >= MI_WL && y < 90 && x > 46 && x < 128);
    [[58, 5], [63, 4], [73, 5], [95, 4], [103, 6], [113, 4], [119, 5]].forEach(([x, n], i) => { for (let k = 0; k < n; k++) { const yy = MI_WL + 2 + k * 2, wob = Math.round(Math.sin(t * 2.2 + k * 1.3 + i) * 0.8); if (Math.sin(t * 3 + k * 2.1 + i * 1.7) > -0.3) D.hl(x + wob, yy, k < 2 ? 2 : 1, 'lamp', 7.5 - k * 0.6, { e: 255 }); } });
    for (let k = 0; k < 7; k++) { const yy = 91 + k * 1.5, wob = Math.round(Math.sin(t * 2.6 + k * 1.1) * (0.6 + k * 0.25)); D.hl(49 + wob - (k > 2 ? 1 : 0), Math.round(yy), k > 2 ? 4 : 3, 'lamp', 9 - k * 0.6, { e: 255 }); }   // the pier lamp's long reflection
    for (let x = 40; x < 136; x++) { const f = Math.sin(x * 0.7 + t * 2.4) + Math.sin(x * 0.23 - t * 1.1); if (f > 0.8) D.px(x, MI_WL, 'water', 10, { e: 255 }); }
    // the bell tolls: the archangel flares gold, a ward sweeps out over the island, rings spread on the water
    D.lay('back');
    const sg = toll ? 1 - bq / 0.18 : 0; D.px(87, 7, 'gold', 8.5 + sg * 2.5, { e: 255 }); D.px(86, 6, 'gold', 8 + sg * 2, { e: 255 }); D.px(88, 6, 'gold', 8 + sg * 2, { e: 255 }); D.px(87, 5, 'gold', 7.5 + sg * 3, { e: 255 }); D.px(87, 6, 'gold', 9.5 + sg, { e: 255 });
    if (bq < 0.02 && !st.b) { st.b = 1; rs.flash(4, 3.2); rs.flash(1, 0.4); rs.burst('glint', 87, 7, 5, { sp: 26, life: 0.7 }); } if (bq > 0.5) st.b = 0;
    if (toll) { const k = bq / 0.18, Rw = 8 + k * 70, a = 1 - k;
      for (let i = 0; i < 180; i++) { const th = Math.PI + i / 179 * Math.PI, x = 87 + Math.cos(th) * Rw, y = MI_WL + Math.sin(th) * Rw * 0.78; if (y < 5 || x < 4 || x > 145 || (a < 0.45 && i % 2)) continue; D.px(x, y, 'gold', 6 + a * 4, { e: 255 }); if (a > 0.6) D.px(x, y + 1, 'gold', 5, { e: 255 }); }
      D.lay('wall'); const rw = 6 + k * 40; for (let i = 0; i < 120; i++) { const th = i / 120 * Math.PI * 2, x = 87 + Math.cos(th) * rw, y = MI_WL + 4 + Math.sin(th) * rw * 0.14; if (y < MI_WL + 1 || (a < 0.5 && i % 2)) continue; D.px(x, y, 'water', 8 + a * 2, { e: 255 }); } }
    // a bell buoy rocking far out, its light blinking red
    const bx = 22, byy = 70 + Math.round(Math.sin(t * 1.7) * 0.6), btl = Math.round(Math.sin(t * 1.7 + 1) * 1);
    D.beg(); D.rect(bx - 1, byy, 3, 2, 'red', 5); D.line(bx, byy, bx + btl, byy - 4, 'iron', 5); D.end({ none: 1 }); if (steps(t, 2.4) < 0.3) { D.px(bx + btl, byy - 5, 'red', 10, { e: 255 }); D.px(bx + btl, byy + 3, 'red', 6, { e: 255 }); }
    // lamp flame
    D.lay('mid'); flame(D, 50, 59, 4, t, 0.4);
    // the guard walks the pier with his halberd; at the end he stops and looks out to sea
    const w = X.stroll(t, 12, 40, 5, 0.2, 3), look = { skin: ['skin', 6], hair: ['hair', 3], top: ['tile', 5], bot: ['iron', 4], boot: ['hair', 2], cap: ['iron', 8] };
    const pose = Object.assign(w.pose, { aF: 0.9, eF: -1.2 }), hd = handAt(w.x, 86, pose, w.dir);
    worker(D, w.x, 86, look, pose, w.dir);
    D.beg(); D.line(hd[0], hd[1] + 6, hd[0], hd[1] - 16, 'wood', 6); D.poly([[hd[0] - 1, hd[1] - 16], [hd[0] + 1, hd[1] - 16], [hd[0], hd[1] - 21]], 'iron', 9); D.line(hd[0], hd[1] - 15, hd[0] + 3 * w.dir, hd[1] - 13, 'iron', 7); D.end();
    const sx = w.x + Math.round((pose.lean || 0) * 3 * w.dir); D.px(sx, 86 - 21 + 4, 'linen', 9); D.px(sx, 86 - 21 + 5, 'linen', 9); D.px(sx - 1, 86 - 21 + 5, 'linen', 8); D.px(sx + 1, 86 - 21 + 5, 'linen', 8);   // the cross on his tabard
    // a rowboat bobbing at the pier, its rope sagging
    D.lay('front'); const by = 96 + Math.round(Math.sin(t * 1.3) * 0.8), tilt = Math.sin(t * 1.3 + 0.8) * 0.6;
    D.beg(); D.poly([[66, by - 3 + tilt], [98, by - 3 - tilt], [94, by + 2], [70, by + 2]], 'wood', 6); D.hl(66, Math.round(by - 3 + tilt), 32, 'wood', 8.5); D.hl(70, by + 1, 24, 'wood', 3.5); D.hl(69, by - 1, 27, 'crimson', 5); D.px(65, Math.round(by - 4 + tilt), 'wood', 7);
    D.line(74, by - 3, 64, by + 3, 'wood', 6); D.line(90, by - 3, 100, by + 2, 'wood', 6); D.end();
    for (let x = 69; x < 96; x++) if ((x + Math.floor(t * 4)) % 5 < 2) D.px(x, by + 3, 'water', 8, { e: 255 });
    D.line(54, 84, 60, 90, 'hair', 4); D.line(60, 90, 67, by - 3, 'hair', 4);
  },
});

// ───────── 亚历山大灯塔 lighthouse (rare · water · luck) ─────────
// the Pharos on its rock in a night sea: a square marble tier with bronze tritons, an octagonal tier, the round fire
// chamber, a bronze god on the dome; the fire roars behind a turning bronze mirror that throws a beam sweeping over the sea
// (every ~8 s it swings round to face us: the scene flares warm and the whole sea glitters gold); waves burst on the rocks;
// far out a merchant ship with a lantern sails behind the island; on the quay a porter carries crates to the pile of
// amphorae and grain sacks under a brazier.
const LH = { x: 76, y: 26 };   // the lamp
const lhBeam = (t) => t * Math.PI * 2 / 8;
function fireBox(st, w, h, t, heat) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 2 ? 6 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s2 = y * w + x, v = f[s2]; if (!v) { f[s2 - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < 0.5 ? 1 : 0)); }
  }
  return f;
}
function seaGlints(D, t, y0, y1, dens, boost) {
  for (let y = y0; y < y1; y++) { const k = (y - y0) / Math.max(1, y1 - y0);
    for (let x = 4; x < W - 4; x++) { const b = boost ? boost(x, y) : 0, w = Math.sin(x * 0.45 - t * 1.6 + y * 1.3) + Math.sin(x * 0.17 + t * 0.9 - y * 0.7);
      if (w > dens - k * 0.12 - b * 0.7) D.px(x, y, b > 0.3 ? 'lamp' : 'water', b > 0.3 ? 8 + b * 2 : 5 + k * 1.6, { e: 255 }); } }
}
X.def('lighthouse', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 62, far: 'none', floor: 'stone' });
    sc.light({ x: LH.x, y: LH.y, z: 14, r: 92, i: 1.15, c: '#ffb050', fl: 'fire', tint: 0.5 });                        // 0 the beacon
    sc.light({ x: 132, y: 70, z: 16, r: 46, i: 0.9, c: '#ff9a40', fl: 'fire', ph: 3, tint: 0.5 });                     // 1 quay brazier
    sc.light({ x: 76, y: 60, z: 10, r: 40, i: 0.35, c: '#ffc070', fl: 'candle', ph: 2, tint: 0.3 });                   // 2 lamplight in the tower's windows
    const r = S.r;
    // the dark sea to the horizon, a low far shore on the right with a few lights (the bloom round the fire is in post)
    S.lay('wall');
    S.vgrad(0, 62, W, FY - 62, 'water', 2.6, 1.8, { e: 255 }); S.hl(0, 62, W, 'water', 3.4, { e: 255 });
    for (let x = 108; x < 146; x++) { const top = Math.round(60 + Math.abs(Math.sin(x * 0.1)) * 1.5); for (let y = top; y < 63; y++) S.px(x, y, 'night', 1.4 + (y === top ? 0.8 : 0), { e: 255 }); }
    [[114, 61], [121, 61], [133, 62], [140, 61]].forEach(([x, y]) => S.px(x, y, 'lamp', 7, { e: 255 }));
    // ── the island rock and the platform (back)
    S.lay('back');
    S.beg(); S.poly([[34, 88], [42, 82], [56, 79], [98, 79], [112, 82], [120, 88]], 'rock', 5); S.noise(34, 79, 86, 10, 1.2, 3, 9); S.end();
    for (let i = 0; i < 12; i++) { const x = 38 + r() * 80, y = 83 + r() * 4; S.beg(); S.ell(x, y, 2 + r() * 3, 1.5 + r(), 'rock', 6 + r() * 2, { dome: 1 }); S.end(); }
    S.beg(); S.rect(50, 75, 54, 6, 'stone', 5.6); TX.ashlar(S, 50, 75, 54, 6, 'stone', 5.6, { bh: 3, bw: 8, crack: 0.05 }); for (let x = 50; x < 104; x += 4) S.rect(x, 73, 2, 2, 'stone', 6.4); S.hl(50, 75, 54, 'stone', 7.4, { n: [0, -0.8] }); S.end();
    // tier 1: square, tapering, marble in courses, slit windows (a few lit), a cornice with dentils; bronze tritons on the corners
    S.beg(); S.poly([[63, 75], [89, 75], [87, 48], [65, 48]], 'bone', 7.2);
    for (let y = 51; y < 75; y += 4) S.hl(64, y, 25, 'bone', 6.2);
    for (let y = 48; y < 75; y++) { const k = (75 - y) / 27; S.px(Math.round(63 + k * 2), y, 'bone', 8.4, { n: [-0.7, 0] }); S.px(Math.round(63 + k * 2) + 1, y, 'bone', 7.8); S.px(Math.round(88 - k * 2), y, 'bone', 5.2, { n: [0.7, 0] }); S.px(Math.round(87 - k * 2), y, 'bone', 6); }
    [[70, 52], [76, 52], [82, 52], [70, 60], [76, 60], [82, 60], [76, 68]].forEach(([x, y], i) => { const lit = i === 1 || i === 3 || i === 6; S.rect(x, y, 1, 4, lit ? 'lamp' : 'ink', lit ? 8 : 1, lit ? { e: 3 } : {}); S.px(x, y - 1, 'bone', 5.4); S.px(x + 1, y, 'bone', 5.8); });
    S.box(62, 45, 28, 3, 'bone', 8.4, { top: 1 }); for (let x = 63; x < 89; x += 2) S.px(x, 47, 'bone', 5.5); S.end();
    [[64, 1], [87, -1]].forEach(([x, d]) => { S.beg(); S.rect(x - 1, 40, 3, 4, 'brass', 6.5); S.px(x, 39, 'brass', 7.5); S.px(x - 1, 42, 'brass', 5); S.line(x + d, 40, x + d * 3, 38, 'brass', 8); S.px(x + d * 4, 37, 'brass', 9); S.rect(x - 1, 44, 3, 1, 'brass', 5); S.end(); });
    // tier 2: octagonal (a lit front face and two turned faces), windows, a cornice
    S.beg(); S.rect(67, 30, 18, 15, 'bone', 7.4); S.rect(67, 30, 4, 15, 'bone', 8.5, { n: [-0.6, 0] }); S.rect(81, 30, 4, 15, 'bone', 5.4, { n: [0.6, 0] }); S.vl(71, 30, 15, 'bone', 6.4); S.vl(80, 30, 15, 'bone', 6.2);
    S.rect(75, 34, 2, 5, 'ink', 1); S.rect(68, 35, 2, 4, 'ink', 1); S.rect(82, 35, 2, 4, 'ink', 1); S.box(65, 28, 22, 2, 'bone', 8.6); for (let x = 66; x < 86; x += 2) S.px(x, 29, 'bone', 5.6); S.end();
    // tier 3: the round fire chamber on columns (fire and mirror in anim), a dome, the bronze god with his trident
    S.beg(); S.cyl(70, 20, 12, 8, 'bone', 7.6, { rim: 2.4 }); S.rect(71, 21, 10, 6, 'ink', 1); [70, 73, 78, 81].forEach(x => S.vl(x, 20, 8, 'bone', x < 76 ? 8.2 : 6)); S.box(69, 27, 14, 2, 'bone', 8); S.box(69, 18, 14, 2, 'bone', 8.4); S.end();
    S.beg(); dome(S, 76, 18, 6, 4, 'brass', 6.5); S.end();
    S.beg(); S.rect(75, 9, 3, 5, 'brass', 6.5); S.px(76, 8, 'brass', 7.5); S.rect(75, 7, 2, 2, 'brass', 7); S.rect(74, 14, 5, 1, 'brass', 5); S.vl(79, 5, 10, 'brass', 8); S.px(78, 5, 'brass', 8.5); S.px(80, 5, 'brass', 8.5); S.line(77, 10, 79, 9, 'brass', 7); S.end();
    // ── the quay (floor) edge, bollards; amphorae, grain sacks and a crate stack (mid); the brazier (front)
    S.lay('wall'); S.hl(0, FY, W, 'stone', 7.5, { n: [0, -0.9] }); S.hl(0, FY + 1, W, 'stone', 4);
    S.lay('mid');
    [[46, FY], [100, FY]].forEach(([x, y]) => { S.beg(); S.cyl(x, y - 4, 4, 4, 'iron', 5, { rim: 1.5 }); S.ell(x + 2, y - 4, 2, 1, 'iron', 7, { n: [0, -0.8] }); S.end(); });
    const amph = (x, y, m, tn) => { S.beg(); S.ell(x, y - 5, 2.6, 3.6, m, tn, { dome: 1 }); S.rect(x - 1, y - 11, 2, 3, m, tn - 0.5); S.hl(x - 2, y - 12, 4, m, tn + 1); S.px(x - 2, y - 10, m, tn - 1); S.px(x + 2, y - 10, m, tn - 1.5); S.px(x, y - 1, m, tn - 1); S.hl(x - 2, y - 6, 5, m, tn - 1.6); S.end(); };
    amph(10, FY, 'brick', 7); amph(16, FY, 'brick', 6.5); amph(22, FY, 'brick', 7); amph(13, FY - 8, 'brick', 7.2); amph(19, FY - 8, 'brick', 6.8);
    [[29, 8], [36, 7]].forEach(([x, w]) => { S.beg(); S.ell(x, FY - 4, w / 2, 4.5, 'sand', 6.5, { dome: 1 }); S.px(x, FY - 9, 'leather', 4); S.hl(x - 2, FY - 7, 4, 'sand', 5); S.end(); });
    S.beg(); S.box(26, FY - 18, 12, 9, 'wood', 6, { top: 1 }); S.hl(26, FY - 14, 12, 'wood', 4); S.line(27, FY - 17, 37, FY - 10, 'wood', 5); S.end();
    S.lay('front');
    S.beg(); S.line(126, FY + 6, 132, 72, 'iron', 5); S.line(138, FY + 6, 132, 72, 'iron', 4); S.line(132, FY + 7, 132, 72, 'iron', 5); S.poly([[125, 68], [139, 68], [136, 73], [128, 73]], 'iron', 5.5); S.hl(125, 68, 14, 'iron', 7.5); S.rect(127, 66, 10, 2, 'ink', 1); S.end();
    sc.emit({ k: 'ember', x: 132, y: 64, w: 8, rate: 3, sp: 9, ang: 0, spread: 0.7, life: 1.8 });
  },
  anim(D, t, rs) {
    const st = rs.st, th = lhBeam(t), face = Math.cos(th), side = Math.sin(th);
    rs.mul[0] = 0.8 + 0.45 * Math.max(0, face);
    if (face > 0.97 && !st.fl) { st.fl = 1; st.flT = t; rs.flash(0, 1.4); rs.flash(1, 0.3); rs.flash(2, 1.2); rs.burst('glint', LH.x, LH.y, 4, { sp: 30, life: 0.5 }); } if (face < 0.5) st.fl = 0;
    D.lay('wall'); X.twinkle(D, t, 10, 40, 31);
    // the sea: glints everywhere, gold where the beam falls
    const bl = 110 * Math.pow(Math.abs(side), 0.6), bd = Math.sign(side);
    const sweep = face > 0.8 ? (face - 0.8) / 0.2 : 0;   // facing us: a gold sweep over the whole sea
    seaGlints(D, t, 64, FY, 1.6, (x, y) => { const d = (x - LH.x) * bd, b = d > 8 && d < bl ? 0.6 * (1 - d / bl) + (y < 72 ? 0.2 : 0) : 0; return Math.max(b, sweep * (0.75 - Math.abs(x - LH.x) / 300)); });
    // the ship: far out beyond the island (wall layer, so the rock and the tower pass in front of it), a lantern at the stern
    const sq = steps(t, 34), sx = Math.round(170 - sq * 210), sb = Math.round(Math.sin(t * 1.4) * 0.5);
    if (sx > -14 && sx < 162) {
      const hy = 68 + sb; D.lay('wall'); D.beg();
      D.poly([[sx - 8, hy - 2], [sx + 8, hy - 2], [sx + 6, hy + 1], [sx - 6, hy + 1]], 'wood', 4.5); D.hl(sx - 8, hy - 2, 16, 'wood', 7); D.hl(sx - 6, hy, 12, 'crimson', 4);
      D.line(sx - 8, hy - 2, sx - 10, hy - 4, 'wood', 5.5); D.px(sx + 8, hy - 3, 'wood', 5);
      D.vl(sx, hy - 12, 10, 'wood', 4.5); D.hl(sx - 5, hy - 11, 11, 'wood', 5.5);
      const lit = Math.abs(sx - LH.x) < 50 ? 1 : 0; for (let k = 0; k < 8; k++) { const bw = k < 1 || k > 6 ? 4 : 5; for (let i = -bw; i <= bw; i++) D.px(sx + i + (k > 3 ? 1 : 0), hy - 10 + k, (i + 6) % 4 < 2 ? 'linen' : 'crimson', ((i + 6) % 4 < 2 ? 6.6 : 4.8) + lit - (i > 3 ? 0.8 : 0), { n: [0.3, 0] }); }
      D.end(); if (sx + 7 > 4 && sx + 7 < 146) { D.px(sx + 7, hy - 3, 'lamp', 10, { e: 255 }); rs.dl.push({ x: sx + 7, y: hy - 3, z: 2, r: 9, i: 0.45, rgb: hex('#ffb050'), tint: 0.4 }); }
      for (let x = sx - 6; x < sx + 7; x++) if (x > 4 && x < 146 && (x + Math.floor(t * 5)) % 4 < 2) D.px(x, hy + 2, 'water', 7, { e: 255 });
    }
    // surf on the rocks, and every ~5.5 s a wave bursts into spray on one side
    D.lay('back'); for (let x = 34; x < 121; x++) { const f = Math.sin(x * 0.8 + t * 2.6) + Math.sin(x * 0.3 - t * 1.4); if (f > 0.7) D.px(x, 88 - (x < 42 || x > 112 ? 1 : 0), 'linen', 9, { e: 255 }); }
    const wq = steps(t, 5.5), wx = Math.floor(t / 5.5) % 2 ? 44 : 110; if (wq < 0.03 && !st.w) { st.w = 1; rs.burst('mist', wx, 84, 5, { sp: 14, ang: 0, spread: 1.2, life: 1.3, w: 8 }); rs.burst('drip', wx, 84, 8, { sp: 34, ang: 0, spread: 1.4, life: 1, floor: 88 }); } if (wq > 0.3) st.w = 0;
    // gulls wheel round the top of the tower, lit by the fire as they pass in front of it
    for (let i = 0; i < 3; i++) { const a = t * (0.55 + i * 0.13) + i * 2.1, gx = LH.x + Math.cos(a) * (20 + i * 5), gy = 20 + i * 5 + Math.sin(a * 2) * 2, front = Math.sin(a) > 0, fl = Math.sin(t * 11 + i * 2) > 0;
      if (gx < 5 || gx > 144) continue; D.lay(front ? 'back' : 'wall'); const g = { n: [0, -0.3], z: front ? 18 : 2 }; D.px(gx, gy, 'linen', 8, g); D.px(gx - 1, gy - (fl ? 1 : 0), 'linen', 7, g); D.px(gx + 1, gy - (fl ? 1 : 0), 'linen', 7, g); if (fl) { D.px(gx - 2, gy - 2, 'linen', 6, g); D.px(gx + 2, gy - 2, 'linen', 6, g); } else { D.px(gx - 2, gy, 'linen', 5, g); D.px(gx + 2, gy, 'linen', 5, g); } }
    D.lay('back');
    // the fire chamber: the bronze mirror turns behind the flames; bright when it faces us
    const f = fireBox(st, 10, 9, t, 0.95), mw = Math.max(0.6, Math.abs(face) * 4);
    D.ell(LH.x, 23, mw, 3, 'brass', face > 0 ? 6 + face * 5 : 4, { e: 255 });
    for (let y = 0; y < 9; y++) for (let x = 0; x < 10; x++) { const v = f[y * 10 + x]; if (v < 6) continue; D.px(71 + x, 19 + y, 'fire', clamp(v / 36 * 11.5, 2, 11), { e: 255 }); }
    D.lay('mid');
    // the porter carries crates from the ship's side to the pile, and walks back for more
    const w = X.stroll(t, 44, 112, 8, 0.7, 1.6), carry = w.dir < 0 || (!w.walking && w.x > 100);
    worker(D, w.x, FY, { skin: ['skin', 5], hair: ['hair', 2], top: ['linen', 7], bot: ['skin', 4.5], boot: ['leather', 3] }, Object.assign(w.pose, carry ? { aF: 1.2, eF: -1.2, aB: 1, eB: -1, tool: 'box' } : {}), w.dir);
    // the brazier fire
    D.lay('front'); for (let k = 0; k < 4; k++) flame(D, 128 + k * 3, 67, 5 + (k % 2) * 2, t, k * 1.3);
  },
  // the beam: a hard-edged, stepped wedge of light swept round by the mirror; a star flare when it faces us
  post(out, t, s, o, I) {
    const on = clamp(I[0] / 1.15, 0, 1); if (on < 0.2) return;   // dark until the beacon is lit (a room being built)
    for (let y = LH.y - 12; y <= LH.y + 8; y++) for (let x = LH.x - 13; x <= LH.x + 13; x++) { const d = Math.hypot((x - LH.x) / 1.2, y - LH.y + 2), a = d < 7 ? 0.2 : d < 11 ? 0.09 : 0; if (a && y > 3) X.addPx(out, y * W + x, [255, 150, 60], a); }   // warm bloom round the fire
    const th = lhBeam(t), face = Math.cos(th), side = Math.sin(th), warm = [255, 170, 70], core = [255, 244, 208], bl = 118 * Math.pow(Math.abs(side), 0.6), d0 = Math.sign(side), cy = LH.y - 2;
    const dim = (face < -0.2 ? 0.6 : 1) * (on < 0.7 ? 0.5 : 1);
    if (bl > 6) for (let d = 5; d < bl; d++) { const x = Math.round(LH.x + d * d0); if (x < 4 || x > W - 5) break; const hw = 2 + d * 0.13, tail = d / bl > 0.72;
      for (let y = Math.floor(cy - hw); y <= Math.ceil(cy + hw); y++) { const u = Math.abs(y + 0.5 - cy) / hw; if (u > 1 || y < 4) continue; X.addPx(out, y * W + x, warm, (u < 0.3 ? 0.6 : u < 0.65 ? 0.3 : 0.14) * (tail ? 0.5 : 1) * dim); }
      if (on >= 0.7) X.blendPx(out, cy * W + x, core, (d < 30 ? 0.7 : d / bl < 0.72 ? 0.4 : 0.2) * dim); }   // a bright core line, hottest near the lamp
    if (face > 0.55) { const k = (face - 0.55) / 0.45, L = Math.round(k * k * 34), a = 0.2 + k * 0.4, fy = LH.y - 3;
      for (let i = -L; i <= L; i++) { const q = 1 - Math.abs(i) / (L + 1), aa = Math.round(a * q * 4) / 4; if (aa <= 0) continue; const x = LH.x + i, y = fy;
        if (x > 3 && x < W - 4) { if (Math.abs(i) <= 1) X.blendPx(out, y * W + x, core, 0.9); else X.addPx(out, y * W + x, warm, aa); }
        if (Math.abs(i) < L * 0.5 && y + i > 3 && y + i < H - 4) { if (Math.abs(i) <= 1) X.blendPx(out, (y + i) * W + LH.x, core, 0.9); else X.addPx(out, (y + i) * W + LH.x, warm, aa); } }
      if (k > 0.85) for (let y = LH.y - 7; y <= LH.y + 1; y++) for (let x = LH.x - 4; x <= LH.x + 4; x++) { const r2 = (x - LH.x) * (x - LH.x) + (y - fy) * (y - fy); if (r2 < 18) X.addPx(out, y * W + x, warm, r2 < 5 ? 0.6 : 0.35); } }
    // the moment the beam faces us: a brief warm wash over the whole scene, in three hard steps
    const ft = s.st.flT != null ? t - s.st.flT : 9; if (ft >= 0 && ft < 0.3 && on >= 0.7) { const wa = ft < 0.1 ? 0.12 : ft < 0.2 ? 0.08 : 0.04; for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) X.addPx(out, y * W + x, warm, wa); }
  },
});

// ───────── 吴哥窟 angkor (rare · nature · train) ─────────
// Angkor Wat at sunset across its lotus pond: stepped galleries and seven lotus-bud towers in warm stone against an orange
// sky, the whole temple mirrored in the water; palms frame the right, lotus flowers sway, fireflies wink over the pond;
// a monk in saffron stands on the stone landing by the naga balustrade (its hood a fan of seven heads), candles burn
// under the gong; every ~9 s he strikes it: the gong shines, rings spread across the pond and a flock of birds lifts off
// the towers into the sunset.
const AK_WL = 76, AK_SUN = [124, 50, 6];
// the naga's hood: seven heads fanned out (A crown, h lit face, d shaded side, e eye), the hood (l lit edge, m, d) below
const AK_NAGA = ['.......A.......', '....A.hAd.A....', '....hdhedhd....', '..A.edmmdhe.A..', '..hdmmmmmmdhd..', 'A.edmmmmmmdhe.A', 'hdlmmmmmmmdddhd', 'edlmmmmmmmdddhe', 'lmmmmmmmmmddddd', '.lmmmmmmmmdddd.', '...lmmmmmddd...'];
const AK_CANDLES = [[11, 0], [13, 1], [17, 1], [19, 0]];   // offering candles under the gong: x, 1 = the shorter ones
const AK_LOTUS = [[54, 97, 1], [61, 88, 0], [99, 99, 1], [107, 89, 0], [118, 96, 1], [135, 92, 0], [141, 99, 1]];
// a lotus-bud tower: tiers of stone narrowing to a point, each tier's corners jutting out, the sun side lit
function prang(S, cx, base, top, w, tn) {
  S.beg(); const hgt = base - top;
  for (let y = base; y >= top; y--) { const k = (base - y) / hgt, hw = (k < 0.22 ? 0.82 + k * 0.8 : Math.pow(1 - (k - 0.22) / 0.78, 0.85)) * w / 2, tier = ((base - y) % 4) === 0, jut = tier && k > 0.05 && k < 0.9 ? 1 : 0;
    for (let x = Math.round(cx - hw - jut); x <= Math.round(cx + hw + jut); x++) { const u = (x + 0.5 - cx) / Math.max(1, hw); S.px(x, y, 'mstone', tn + (tier ? -1.4 : 0) + (((base - y) % 4) === 1 ? 0.9 : 0) + u * 0.9 - (Math.abs(u) > 0.85 ? 0.6 : 0), { n: [u * 0.7, -0.2] }); } }
  S.vl(Math.round(cx), top + 2, hgt - 4, 'mstone', tn + 0.8); S.px(Math.round(cx), top - 1, 'mstone', tn + 1.5); S.px(Math.round(cx), top - 2, 'mstone', tn + 1);
  S.end();
}
// a stepped gallery: pillars and dark bays under a two-step roof
function gallery(S, x0, x1, top, bot, tn) {
  S.beg(); S.rect(x0, top, x1 - x0, bot - top, 'mstone', tn - 2.6);
  for (let x = x0 + 1; x < x1 - 1; x += 4) S.rect(x, top + 3, 2, bot - top - 4, 'mstone', tn, { n: [-0.3, 0] });
  S.rect(x0 - 1, top, x1 - x0 + 2, 2, 'mstone', tn + 0.6); S.hl(x0, top - 1, x1 - x0, 'mstone', tn + 1.4, { n: [0, -0.8] }); S.hl(x0 - 1, bot - 1, x1 - x0 + 2, 'mstone', tn - 0.5);
  S.end();
}
function lotusTip(D, x, y, t, i) {
  const sw = Math.round(Math.sin(t * 1.3 + i * 1.7) * 0.7), hx = x + sw; D.px(x, y - 1, 'leaf', 5); D.px(hx, y - 2, 'leaf', 5.5);
  if (i % 2) { D.px(hx, y - 4, 'pink', 9); D.px(hx - 1, y - 3, 'pink', 7.5); D.px(hx + 1, y - 3, 'pink', 6.5); D.px(hx, y - 3, 'pink', 8.5); D.px(hx - 1, y - 4, 'pink', 8); D.px(hx + 1, y - 5, 'pink', 7); }
  else { D.px(hx, y - 3, 'pink', 7); D.px(hx, y - 4, 'pink', 8.5); D.px(hx, y - 5, 'pink', 9.5); }
}
X.def('angkor', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    X.sky(S, sc, { horizon: 58, dusk: 1, far: 'none', floor: 'water', sun: AK_SUN });                                      // 0 the setting sun
    sc.light({ x: 15, y: 83, z: 12, r: 28, i: 0.75, c: '#ffb050', fl: 'candle', ph: 1, tint: 0.45 });                     // 1 offering candles under the gong
    sc.light({ x: 15, y: 76, z: 12, r: 34, i: 0.3, c: '#ffd070', fl: 'pulse', amp: 0.1, sp: 2, tint: 0.5 });                // 2 the gong (flares when struck)
    const L = S.L, r = S.r;
    // the sunset: violet overhead, rose, then orange and gold down to the jungle line behind the temple
    S.lay('wall'); S.vgrad(0, 0, W, 60, 'dusk', 2, 10.2, { e: 255 });
    for (let k = 3; k >= 1; k--) S.ell(AK_SUN[0], AK_SUN[1], AK_SUN[2] + k * 3.5, AK_SUN[2] + k * 2.6, 'dusk', 8.8 + (3 - k) * 0.7, { e: 255 });
    S.ell(AK_SUN[0], AK_SUN[1], AK_SUN[2], AK_SUN[2], 'lamp', 10, { e: 255 }); S.ell(AK_SUN[0] - 1, AK_SUN[1] - 1, AK_SUN[2] - 2, AK_SUN[2] - 2, 'lamp', 11, { e: 255 });
    [[20, 16, 14], [60, 22, 18], [104, 30, 12], [38, 34, 10]].forEach(([x, y, w]) => { S.hl(x, y, w, 'dusk', 6, { e: 255 }); S.hl(x + 3, y + 1, w - 5, 'dusk', 7.5, { e: 255 }); });   // thin lit cloud streaks
    for (let x = 0; x < W; x++) { const h = 58 - Math.abs(Math.sin(x * 0.09 + 1)) * 3 - (((x * 13) % 7) < 2 ? 2 : 0) - Math.abs(Math.sin(x * 0.31)) * 2; for (let y = Math.round(h); y < FY; y++) S.px(x, y, 'dusk', y - h < 1 ? 4 : 3, { e: 255 }); }
    // ── the temple (back): outer gallery, terraces stepping up, seven lotus-bud towers
    S.lay('back');
    prang(S, 58, 44, 28, 8, 4.6); prang(S, 92, 44, 28, 8, 4.6);                                   // the rear corner towers
    S.beg(); S.poly([[48, 46], [102, 46], [98, 40], [52, 40]], 'mstone', 4.8); S.end();
    gallery(S, 50, 100, 44, 54, 6);
    prang(S, 75, 44, 11, 14, 6.2);
    gallery(S, 28, 122, 54, 64, 5.6);
    prang(S, 40, 54, 30, 10, 5.8); prang(S, 110, 54, 30, 10, 5.8);
    gallery(S, 8, 142, 64, AK_WL - 1, 5.4);
    prang(S, 13, 64, 50, 7, 5.2); prang(S, 137, 64, 50, 7, 5.2);
    // the gate pavilion and the steep central stair
    S.beg(); S.rect(67, 58, 16, 17, 'mstone', 6); S.poly([[65, 58], [85, 58], [80, 52], [70, 52]], 'mstone', 6.6); S.rect(72, 64, 6, 11, 'ink', 1); S.hl(71, 63, 8, 'mstone', 7.5); S.end();
    S.beg(); for (let y = 44; y < 58; y++) { S.hl(72, y, 6, 'mstone', (y % 2) ? 7 : 5.2); } S.end();
    // the grass bank at the waterline
    S.beg(); S.rect(4, AK_WL - 1, W - 8, 2, 'leaf', 4); for (let x = 5; x < W - 5; x++) if ((x * 7) % 5 < 2) S.px(x, AK_WL - 2, 'leaf', 5 + (x % 3)); S.end({ none: 1 });
    // ── the pond: first the water itself (the dusk sky's colour, deeper toward us), then the temple mirrored in it —
    // outlines left out, two steps darker, the darkest parts sinking into the water's colour, broken lit ripples every 4th row
    S.lay('wall'); S.vgrad(4, AK_WL, W - 8, H - 3 - AK_WL, 'dusk', 3.6, 2.6, { e: 255 });
    for (let y = AK_WL; y < H - 3; y++) { const row = y - AK_WL, sy = Math.round(AK_WL - 1 - row / 0.42); if (sy < 4) break;
      const band = Math.floor(row / 4), ox = band % 2 ? 1 : band % 4 === 2 ? -1 : 0, rip = row % 4 === 3;
      for (let x = 4; x < W - 4; x++) { const sp = sy * W + clamp(x + ox, 4, W - 5); let m = L.back.m[sp], t0 = L.back.t[sp], sky = 0; if (!m) { m = L.wall.m[sp]; t0 = L.wall.t[sp]; sky = 1; }
        const tn = sky ? t0 - 0.6 - row * 0.03 : 1.8 + (t0 - 4) * 0.5 - row * 0.02;   // the sky a step darker; the stone a dark violet silhouette
        if (rip && ((x + band * 7) % 11) < 4) { S.px(x, y, 'dusk', Math.max(5.6, sky ? tn + 1 : 0), { e: 255 }); continue; }
        if (!m || t0 <= 1.2) continue;   // outlines: the water shows through
        if (tn < 1.6) S.px(x, y, 'night', 2, { e: 255 }); else S.px(x, y, 'dusk', Math.max(tn, sky ? 3 : 2), { e: 255 }); } }
    S.hl(4, AK_WL, W - 8, 'dusk', 9, { e: 255 });
    // ── the stone landing (floor, left): sandstone steps down into the water, the naga balustrade with its fan of heads
    S.lay('mid');
    S.beg(); S.rect(4, FY - 2, 44, 2, 'mstone', 7, { n: [0, -0.8] }); TX.ashlar(S, 4, FY, 44, H - FY - 3, 'mstone', 5.6, { bh: 3, bw: 9, crack: 0.05 }); S.hl(4, FY, 44, 'mstone', 7.6); for (let y = FY + 3; y < H - 3; y += 3) S.hl(4 + (y - FY), y, 44 - (y - FY), 'mstone', 4); S.end();
    // the naga's body is the railing: a scaled serpent running left from its raised neck, on short posts
    S.beg(); S.hcyl(4, 82, 40, 3, 'mstone', 7.4, { rim: 1.5 }); for (let x = 5; x < 43; x += 3) { S.px(x, 82, 'mstone', 9); S.px(x + 1, 83, 'mstone', 5.6); } for (let x = 6; x < 40; x += 7) S.rect(x, 85, 2, 4, 'mstone', 5); S.end({ ink: 1 });
    // the raised neck on its plinth and the fanned hood of seven heads (each a lit crown, a shaded side and an eye), sun side lit
    S.beg(); S.box(39, 86, 11, 4, 'mstone', 6.8, { top: 1 }); S.cyl(42, 81, 5, 5, 'mstone', 7.4, { rim: 1.6 }); for (let y = 82; y < 86; y += 2) S.hl(43, y, 3, 'mstone', 5.8);
    S.spr(37, 70, AK_NAGA, { A: ['mstone', 9.8, { n: [0, -0.8] }], h: ['mstone', 8.6, { n: [-0.5, 0] }], l: ['mstone', 8.4, { n: [-0.7, 0] }], m: ['mstone', 7.2], d: ['mstone', 5.8, { n: [0.5, 0] }], e: ['ink', 1] });
    S.end({ ink: 1 });
    // the gong in its wooden frame (the disc hangs in anim); under it, offering candles on a low stone step
    S.beg(); S.box(6, 64, 3, FY - 66, 'wood', 5); S.box(22, 64, 3, FY - 66, 'wood', 4.5); S.box(4, 62, 23, 3, 'wood', 6); S.px(4, 61, 'wood', 7); S.px(26, 61, 'wood', 6); S.end();
    S.beg(); S.box(10, FY - 4, 11, 4, 'mstone', 6.4, { top: 1 }); AK_CANDLES.forEach(([x, sh]) => S.rect(x, FY - 7 + sh, 1, 3 - sh, 'lamp', 7)); S.end();
    // ── lotus pads on the water (static), palms framing the right (front)
    AK_LOTUS.forEach(([x, y, f], i) => { S.lay(y > 90 ? 'front' : 'mid'); S.beg(); S.ell(x, y, 4 - (y < 90 ? 1 : 0), 1.3, 'leaf', 5.5 + (i % 2), { n: [0, -0.8] }); S.px(x + 2, y, 'leaf', 3); S.px(x - 2, y - 1, 'leaf', 8); S.end(); });
    S.lay('front');
    [[141, 8, 1], [128, 20, 0]].forEach(([x, top, big]) => { S.beg(); for (let y = top + 5; y < H - 3; y++) { const bx = Math.round(x + Math.sin((y - top) * 0.05) * 2); S.px(bx, y, 'wood', 3.5 + ((y % 4) === 0 ? -1 : 0)); S.px(bx + 1, y, 'wood', 2.5); if (big) S.px(bx - 1, y, 'wood', 4.2); } S.end(); });
    sc.emit({ k: 'glint', x: 96, y: 84, w: 90, h: 14, rate: 0.9, sp: 3, life: 1.3 });
    sc.emit({ k: 'steam', x: 20, y: FY - 9, rate: 0.4, sp: 3, ang: 0.3, spread: 0.3, life: 1.4 });
  },
  anim(D, t, rs) {
    const st = rs.st, gq = steps(t, 9), gt = gq * 9;
    // the sun's glitter path on the pond, rolling ripples, the gong's rings spreading
    D.lay('wall');
    for (let y = AK_WL + 1; y < H - 4; y++) { const k = (y - AK_WL) / 25; for (let x = 46; x < W - 4; x++) { const near = Math.abs(x - AK_SUN[0]) < 3 + k * 7, w = Math.sin(x * 0.5 - t * 1.4 + y * 1.1) + Math.sin(x * 0.19 + t * 0.8 - y * 0.6);
      if (near) { if (w > 0.6) D.px(x, y, 'lamp', 10 - k * 2, { e: 255 }); } else if (w > 1.96) { const n = 2 + ((x + y) & 1); D.hl(x, y, Math.min(n, W - 4 - x), 'dusk', 8, { e: 255 }); x += n + 3; } } }
    if (gt < 4) { const rr = 4 + gt * 26, a = 1 - gt / 4; for (let i = 0; i < 140; i++) { const th = i / 140 * Math.PI * 2, x = 48 + Math.cos(th) * rr, y = AK_WL + 7 + Math.sin(th) * rr * 0.18; if (x < 46 || x > 145 || y < AK_WL + 1 || y > 100 || (a < 0.5 && i % 2)) continue; D.px(x, y, 'dusk', 8 + a * 2.5, { e: 255 }); } }
    // lotus flowers sway on their stems
    AK_LOTUS.forEach(([x, y, f], i) => { D.lay(y > 90 ? 'front' : 'mid'); lotusTip(D, x - 1, y - 1, t, i + f); });
    // palm crowns: fronds fanning out, swaying
    D.lay('front');
    [[141, 8, 14], [128, 20, 10]].forEach(([x, top, L0], j) => { const sw = Math.sin(t * 0.9 + j * 2) * 0.12; D.beg();
      for (let i = 0; i < 15; i++) { const a = -Math.PI * 1.02 + i * Math.PI * 0.146 + sw * (1 + (i % 3) * 0.3), len = L0 * (0.85 + ((i * 7) % 3) * 0.14), droop = 0.4;
        for (let k = 1; k <= len; k++) { const q = k / len, fx = x + Math.cos(a) * k, fy = top + 5 + Math.sin(a) * k * 0.8 + q * q * len * droop; D.px(fx, fy, 'leaf', 3.4 + (1 - q) * 1.6 - (i % 2) * 0.6, { n: [Math.cos(a) * 0.5, -0.5] }); if (k % 2 === 0 && q > 0.3) D.px(fx, fy + 1, 'leaf', 2.6); } }
      D.ell(x, top + 5, 2, 1.5, 'wood', 3); D.end(); });
    // the gong: hangs and swings a little after each stroke, a bright boss
    D.lay('mid'); const sw = gt < 2.5 ? Math.sin(gt * 9) * (1 - gt / 2.5) * 1.2 : 0, gx = 15 + Math.round(sw), shine = gt < 1.5 ? (1 - gt / 1.5) * 3 : 0;
    D.line(10, 65, gx - 4, 71, 'hair', 4); D.line(21, 65, gx + 4, 71, 'hair', 4);
    D.beg(); D.ell(gx, 77, 6, 6, 'brass', 6 + shine, { dome: 1 }); D.ell(gx, 77, 4.3, 4.3, 'brass', 5 + shine, { ring: 1 }); D.ell(gx, 77, 1.6, 1.6, 'brass', 8.5 + shine, { dome: 1 }); D.px(gx - 2, 74, 'brass', 10); D.end();
    AK_CANDLES.forEach(([x, sh], i) => { const fy = FY - 8 + sh; D.px(x, fy, 'fire', 9 + Math.round(n1(t * 8 + i * 2.3) * 1.2), { e: 255 }); if (n1(t * 6 + i * 1.7) > 0.15) D.px(x, fy - 1, 'fire', 7, { e: 255 }); });
    // the monk: winds up, strikes, then stands with palms together
    let pose;
    if (gt < 0.5) pose = { aF: 0.2 - gt / 0.5 * 0.9, eF: -0.8, aB: 1.6, eB: -2, lF: 0.1, lB: -0.1 };
    else if (gt < 0.66) { const k = (gt - 0.5) / 0.16; pose = { aF: -0.7 + k * 2.5, eF: -0.8 + k * 0.6, aB: 1.6, eB: -2, lean: k * 0.4, lF: 0.1, lB: -0.1 }; }
    else if (gt < 2) pose = { aF: 1.8 - (gt - 0.66) * 0.3, eF: -0.2, aB: 1.6, eB: -2, lean: 0.3, lF: 0.1, lB: -0.1 };
    else pose = { aF: 1.9, eF: -2.1, aB: 1.9, eB: -2.1, bob: Math.round(Math.sin(t * 1.4) * 0.5), lF: 0.05, lB: -0.05 };
    const mx = 30, look = { skin: ['skin', 5], hair: ['skin', 3.5], top: ['fire', 6.2], bot: ['fire', 5], boot: ['fire', 4], robe: 1 };
    worker(D, mx, FY, look, pose, -1);
    if (gt < 2) { const hd = handAt(mx, FY, pose, -1), a = (pose.aF || 0) + (pose.eF || 0), dx = -Math.sin(a), dy = Math.cos(a); D.line(hd[0], hd[1], hd[0] + dx * 7, hd[1] + dy * 7, 'wood', 6); D.rect(Math.round(hd[0] + dx * 8) - 1, Math.round(hd[1] + dy * 8) - 1, 3, 3, 'linen', 8); }
    if (gt >= 0.64 && !st.hit) { st.hit = 1; rs.flash(2, 3); rs.burst('glint', 15, 77, 5, { sp: 26, life: 0.6, w: 4, h: 4 }); } if (gt < 0.3) st.hit = 0;
    // sound rings in the air round the gong
    if (gt > 0.64 && gt < 2) { const k = (gt - 0.64) / 1.36; for (let j = 0; j < 2; j++) { const rr = 8 + k * 14 + j * 5; if (rr > 26) continue;
      for (let i = 0; i < 40; i++) { const th = 1.2 + i / 39 * (Math.PI * 2 - 2.4), x = 15 + Math.cos(th) * rr, y = 77 + Math.sin(th) * rr; if (x < 4 || y < 4 || (k > 0.5 && i % 2)) continue; D.px(x, y, 'lamp', 9 - k * 3, { e: 255 }); } } }
    // the flock: rises off the towers after the stroke and wheels away across the sunset
    if (gt > 0.7 && gt < 6.5) { const k = (gt - 0.7) / 5.8; D.lay('wall'); for (let i = 0; i < 9; i++) { const sx = 75 + (i - 4) * 5, sy = 16 + (i % 3) * 3, x = sx + k * (70 + i * 6) + Math.sin(k * 6 + i) * 3, y = sy - k * 10 + Math.sin(k * 9 + i * 2) * 2 + k * k * (i % 2 ? -4 : 6), fl = Math.sin(t * 16 + i * 1.3) > 0;
      if (x > 145 || y < 5) continue; D.px(x, y, 'night', 1.5, { e: 255 }); D.px(x - 1, y + (fl ? -1 : 0), 'night', 1.5, { e: 255 }); D.px(x + 1, y + (fl ? -1 : 0), 'night', 1.5, { e: 255 }); if (fl) { D.px(x - 2, y - 1, 'night', 2, { e: 255 }); D.px(x + 2, y - 1, 'night', 2, { e: 255 }); } } }
  },
});

// what each pixel room shows, in words (replaces the old scene's line in M.ROOM_D)
const D_ = {
  amundsen: '极光在夜空翻卷，不时一道亮波沿光幕跑过、下缘泛粉，雪地跟着被照绿；高架科考站亮着一排窗，屋顶天线慢慢转，雷达球顶上红灯闪；冰屋门口透出火光，极点银球两边插着三面小旗在飘；科学家从氦气瓶给探空气球充气、放飞，再拿夹板记下；企鹅摇摇摆摆走过，远处雪地车亮着车灯开过',
  potala: '布达拉宫被脚下的灯照得暖白，红宫顶上金顶发亮，身后是月光下的雪山；一串经幡横过夜空飘；左边香炉冒烟和火星；右边僧人推着大转经筒，每转一圈铃响一声、紫色经文升起；朝圣者摇着手转经筒走过；一阵风来，天上划过两道风线，经幡被吹得拉平，香炉的烟压成一条横线，五色风马纸从经幡绳上卷起，飞过月亮和雪山，风最大时灯光一亮、金顶全部闪一下',
  michel: '满月下的海中孤岛：水边是城墙和圆塔，小镇的窗沿山坡亮上去，山顶修道院尖塔上站着金色天使；窗光倒映在海里晃，月下铺开一条碎光，云慢慢飘过月亮；码头上卫兵扛着长矛巡逻，小船随浪起伏，远处浮标闪红灯；每隔一会儿钟声响起，天使一亮，一圈金光罩住整座岛',
  lighthouse: '夜海礁石上的灯塔：方形白石塔身、八角层、圆形火室，顶上铜像举着三股叉；火室里火焰翻滚，铜镜转着把一道暖光扫过海面，转到正对这边时整个画面一亮、满海金光；海鸥绕着塔顶飞，浪拍上礁石溅起水花，远处挂条纹帆的商船提着灯从岛后驶过；码头上搬运工把货箱搬到陶罐和粮袋旁，火盆冒火星',
  angkor: '夕阳下的吴哥窟：一层层回廊和七座莲花苞石塔衬着橙色的天，整座寺倒映在莲池里；水面碎光跟着太阳晃，莲花轻摇，萤火虫在池面闪，棕榈叶摆动；穿橘色袈裟的僧人站在石阶上，身旁是扇形七头蛇栏杆，锣下点着供烛；他每隔一会儿敲一下铜锣：锣面一亮，池面荡开波纹，一群鸟从塔尖飞起掠过晚霞',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
