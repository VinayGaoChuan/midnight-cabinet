// ==== mc-pxroom-minib.js ====
(function () {
// Pixel stages for the mini games G005–G010 (弹珠台 · 世界树 · 占卜摊 · 砸金蛋 · 骰子对决 · 命运之轮), drawn with the pixel-room
// engine: 300×175 art px, one art px = 4 logical px on the mini-game stage (docs/design.md §7.5.1, same scale as the cast).
// paint() builds the set (walls, furniture, lights, emitters); anim() paints what moves each frame from the game state the
// mini game passes in as o (read-only here). Everything is lit by the stage's own lights, so the same data goes to HD-2D later.
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, n1 } = X;
const AW = 300, AH = 175;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random, TAU = Math.PI * 2, GLOW = { e: 255 };
const hash = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + (s | 0) * 144665) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const MB = X.MINIB = {};

// ───────── shared bits ─────────
// cellular pixel fire (spreading heat) in a w×h box, heat 0…36 walks the fire ramp; 30 Hz
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30; const c0 = cool == null ? 0.4 : cool;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 3 ? 7 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < c0 ? 1 : 0)); }
  }
  return f;
}
function drawFire(D, f, w, h, x0, y0, mat, mask) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f[y * w + x]; if (v < 4 || (mask && !mask(x, y))) continue; D.px(x0 + x, y0 + y, mat || 'fire', clamp(v / 36 * 11.5, 1, 11), { e: 255 }); } }
// a small flame (candles, lamps): s px tall
function flame(D, x, y, s, t, ph, mat) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, mat || 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// candle: wax body with drips, a wick; the flame is animated
function candle(S, x, y, h, m, tn) { S.beg(); S.cyl(x - 1, y - h, 3, h, m || 'bone', tn || 8, { rim: 1.5 }); S.px(x, y - h - 1, 'hair', 1); S.px(x + 1, y - h + 2, m || 'bone', (tn || 8) + 1); S.px(x - 1, y - h + 3, m || 'bone', (tn || 8) - 0.5); S.hl(x - 2, y - 1, 5, m || 'bone', (tn || 8) - 1.5); S.end(); }
// a rng-made strip of carved glyphs ("names"), w×h bits
function glyphStrip(w, h, seed) { const g = new Uint8Array(w * h), r = X.rng(seed); let x = 0; while (x < w - 4) { const gw = 2 + Math.floor(r() * 3); for (let i = 0; i < gw; i++) for (let j = 0; j < h; j++) if (r() < (i === 0 || j === 0 || j === h - 1 ? 0.55 : 0.3)) g[j * w + x + i] = 1; x += gw + 1 + (r() < 0.25 ? 2 : 0); } return g; }
// sprite from strings (one char per px) → { w, h, at(x, y) → char or '' }
function mask(rows) { const h = rows.length, w = rows[0].length; return { w, h, at: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? '' : (rows[y][x] === '.' ? '' : rows[y][x])) }; }
// pixel particle kinds the stages add (single pixels walking a ramp over their life, like the rooms' own)
const PK = X.PK;
PK.blood = { g: 140, drag: 0.1, ramp: ['red', [8, 7, 6, 6, 5, 4]], splash: 0 };
PK.gold = { g: 40, drag: 0.6, ramp: ['gold', [11, 11, 10, 9, 8, 7, 6]], glow: 1, trail: 1, light: [8, 0.35, '#ffd060'] };
PK.mote = { g: -3, drag: 1, ramp: ['linen', [10, 9, 8, 7]], wob: 5, glow: 1 };
PK.emb = Object.assign({}, PK.ember, { light: null });   // ambient embers: no light of their own (a stage is 3.5× a room)
PK.chip = { g: 160, drag: 0.3, ramp: ['stone', [9, 8, 7, 6, 5]], bounce: 0.3 };
MB.PK = PK;
Object.assign(MB, { AW, AH, clamp, hash, fireSim, drawFire, flame, candle, glyphStrip, mask });   // for the other stage files (mc-pxroom-minib-*.js)

// ═════════════════════ 命运之轮 · a stone wheel in a crypt ═════════════════════
// The disc is computed per pixel in polar coordinates each frame (sector, carved names ring, iron tyre, studs, icons, blood
// grooves), so it turns at any angle as clean pixel art and every pixel is lit by the braziers and the moon like the walls.
// o: { ang, w (rad/s), fl (pointer swing), blood 0…1 (grooves filling), drop -1…1 (a blood drop falling onto the hub),
//      runes 0…1 (rune ring lit), lit (sector index, −1 none), litAge, hov (sector under the cursor, −1), clicks (studs
//      passed so far), flare 0…1 (braziers roar), dim 0…1 (braziers die down: leaving), curse 0…1 (the hub jewel opens
//      into a red eye), tap { x, y, n } (a click on empty stage: grit falls from the lintel above it; n counts taps),
//      tier 0…4 of the result (echo particles), grind 0…1 (the wheel hangs on a stud: grit and sparks at the pointer),
//      gold 0…1 (the blood in the grooves turns to gold), violet 0…1 (the braziers burn violet), rise { i, age, k }
//      (sector i's carved relief rises off the wheel, k × its size, glowing), quake (a counter: each change shakes dust and
//      grit off the lintel) }
const FW = { cx: 150, cy: 92, R: 58 };
// outcome inlays, in the order of MINI.fate's FATE table: 空 · 部队攻击 · 部队 · FEVER · 图纸 · 积分 · 诅咒
const FINL = [['stone', [140, 132, 150]], ['pink', [228, 112, 214]], ['tile', [102, 162, 210]], ['arcane', [154, 124, 255]], ['paper', [214, 200, 172]], ['gold', [255, 218, 110]], ['red', [255, 126, 104]]];
// carved reliefs, 17×17, "outward" is up: a = recessed edge, b = the inlay, c = its bright face
const FICON = [
  mask(['.................', '.................', '........c........', '.......cc........', '.......c.........', '........c........', '.........c.......', '........cc.......', '.......c.........', '.......c.........', '........cc.......', '.........c.......', '........c........', '.................', '.................', '.................', '.................']),
  mask(['........a........', '.......aca.......', '.......acba......', '.......acba......', '.......acba......', '.......acba......', '.......acba......', '.......acba......', '.......acba......', '....aaaacbaaaa...', '....abccccbbba...', '....aaaaabaaaa...', '........aba......', '........aba......', '........aba......', '.......abcba.....', '........aaa......']),
  mask(['........c........', '.......cbc.......', '........b........', '......aaaaa......', '....aabcccbaa....', '...abcbbbbbbba...', '...acbbbbbbbba...', '..abcbbbbbbbbba..', '..aaaaaaaaaaaaa..', '..abbaaaaaaabba..', '..abbbbbabbbbba..', '..abcbbbabbbbba..', '...abbbbabbbba...', '...abbbaaabbba...', '....abba.abba....', '.....aa...aa.....', '.................']),
  mask(['........a........', '.......aca.......', '.......abca......', '......abbca......', '.....abbbca..a...', '....abbbbbca.aa..', '...abbbcbbbcaba..', '...abbccbbbbcba..', '..abbcccbbbbbba..', '..abbccccbbbbba..', '..abcccccbbbbba..', '..abccccccbbbba..', '...abccccbbbba...', '...abbccccbbba...', '....abbbbbbba....', '.....aaaaaaa.....', '.................']),
  mask(['.................', '..aaaaaaaaaaaaa..', '.abcccccccccccba.', '.aabbbbbbbbbbbaa.', '..abbaaaaaaabba..', '..abbbbbbbbbbba..', '..abbaaaaaabbba..', '..abbbbbbbbbbba..', '..abbaaaaaaabba..', '..abbbbbbbbbbba..', '..abbaaaabbbbba..', '..abbbbbbbbbbba..', '.aabbbbbbbbbbbaa.', '.abcccccccccccba.', '..aaaaaaaaaaaaa..', '.................', '.................']),
  mask(['.................', '.....aaaaaaa.....', '....abccccbba....', '...abccbbbbbba...', '..abccbaaabbbba..', '..abcbabbbabbba..', '.abccabbcbabbbba.', '.abcbabcccbabbba.', '.abcbabbcbbabbba.', '.abcbbabbbabbbba.', '.abbbbbaaabbbbba.', '..abbbbbbbbbbba..', '..abbbbbbbbbbba..', '...abbbbbbbbba...', '....abbbbbbba....', '.....aaaaaaa.....', '.................']),
  mask(['.................', '.....aaaaaaa.....', '....abcccccba....', '...abccbbbbbba...', '..abcbbbbbbbbba..', '..abbbbbbbbbbba..', '..abaaabbbaaaba..', '..abaaabbbaaaba..', '..abaaabbbaaaba..', '..abbbbbabbbbba..', '...abbbaaabbba...', '....abbbbbbba....', '....abababab.....', '....aaaaaaaaa....', '....ab.ab.ab.....', '.................', '.................']),
];
const FGLY = glyphStrip(330, 6, 77);
// per-pixel geometry of the disc, computed once: offsets, radius, angle, unit normal
let FGEO = null;
function fateGeo() {
  if (FGEO) return FGEO; const RR = FW.R, L = []; for (let y = -RR - 4; y <= RR + 4; y++) for (let x = -RR - 4; x <= RR + 4; x++) { const dx = x + 0.5, dy = y + 0.5, r = Math.sqrt(dx * dx + dy * dy); if (r <= RR + 3.3) L.push([x, y, dx, dy, r, Math.atan2(dy, dx)]); }
  const n = L.length, G = { n, x: new Int16Array(n), y: new Int16Array(n), dx: new Float32Array(n), dy: new Float32Array(n), r: new Float32Array(n), th: new Float32Array(n), NT: new Float32Array(160 * 160) };
  L.forEach((q, i) => { G.x[i] = q[0]; G.y[i] = q[1]; G.dx[i] = q[2]; G.dy[i] = q[3]; G.r[i] = q[4]; G.th[i] = q[5]; });
  for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) G.NT[y * 160 + x] = X.vnoise(x / 3.2 + 40, y / 3.2 + 40, 5) * 0.7 + X.vnoise(x / 1.3, y / 1.3, 9) * 0.3;
  return (FGEO = G);
}
function fateWheel(D, t, o, rs) {
  const G = fateGeo(), { cx, cy, R: RR } = FW, N = 7, SEG = TAU / N, ang = o.ang || 0, w = o.w || 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const smear = Math.min(SEG * 0.8, Math.abs(w) / 40), ns = smear > 0.03 ? 3 : 1, blood = o.blood || 0, runes = o.runes || 0, lit = o.lit == null ? -1 : o.lit, la = o.litAge || 0;
  const pulse = 0.5 + 0.5 * Math.sin(t * 5), hub = RR * 0.2, rIn = hub + 1, rBand = RR - 15, rRune = RR - 11, rTyre = RR - 4, RC = (rIn + rBand) / 2 + 1, hov = o.hov == null ? -1 : o.hov;
  const lapP = lit >= 0 && la < 1.4 ? la / 0.7 : -9, NT = G.NT, OPT = {}, NO = { n: [0, 0] }, E = { e: 255 }, bm = (o.gold || 0) > 0.5 ? 'gold' : 'red';
  const rot = []; for (let j = 0; j < ns; j++) { const a2 = ang - smear * j / Math.max(1, ns - 1); rot.push([Math.cos(a2), Math.sin(a2)]); }
  for (let q = 0; q < G.n; q++) {
    const r = G.r[q], dx = G.dx[q], dy = G.dy[q], ux = dx / r, uy = dy / r, PX = cx + G.x[q], PY = cy + G.y[q];
    let lt = G.th[q] - ang + Math.PI / 2; lt = ((lt % TAU) + TAU) % TAU; const s = lt / SEG, si = Math.floor(s), i = si % N, fr = s - si, bd = Math.min(fr, 1 - fr) * SEG * r;
    // studs: iron pegs standing out of the tyre at every sector edge
    if (r > RR) { if (bd < 1.7 && r < RR + 3.2) { OPT.n = [ux * 0.6 - 0.2, uy * 0.6 - 0.3]; D.px(PX, PY, 'iron', r > RR + 2.2 ? 9 : 7, OPT); } continue; }
    if (r >= rTyre) {   // iron tyre: rounded, a rivet at every half sector
      const k = (r - rTyre) / 4, hf = Math.abs(((s * 2) % 1) - 0.5) * SEG / 2 * r, riv = hf < 1 && r > rTyre + 1 && r < RR - 0.8;
      D.px(PX, PY, 'iron', riv ? 9.5 : 5.2 + (k < 0.3 ? -1.5 : 0), { n: [ux * (k * 1.4 - 0.5), uy * (k * 1.4 - 0.5)] }); continue; }
    if (r >= rTyre - 0.9) { D.px(PX, PY, 'ink', 1); continue; }
    // local (wheel) coordinates, for textures that turn with the disc
    const lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca, tex = NT[(Math.floor(ly) + 80) * 160 + Math.floor(lx) + 80];
    if (r >= rRune) {   // the ring of carved names; lit, the cuts glow with blood (or the result's colour)
      const u = Math.floor(lt / TAU * 330), v = Math.floor(r - rRune), gl = v < 6 && FGLY[v * 330 + u];
      if (gl) { const on = runes > 0 && (lt / TAU) < runes * 1.02, lap = lapP > -9 && Math.abs(((lt / TAU) - lapP) % 1) < 0.08;
        if (lap) D.px(PX, PY, FINL[lit][0], 10, E); else if (on) D.px(PX, PY, bm, 6 + 2 * pulse * (0.5 + 0.5 * Math.sin(u * 0.7 + t * 3)), E); else D.px(PX, PY, 'stone', 1.4); }
      else { OPT.n = v === 0 ? [ux * 0.5, uy * 0.5] : [0, 0]; D.px(PX, PY, 'stone', 5.4 + Math.round((tex - 0.5) * 2) + (v === 0 ? -1.2 : v === 5 ? 1 : 0), OPT); }
      continue; }
    if (r >= rRune - 1) { D.px(PX, PY, 'ink', 1); continue; }
    if (r < rIn) {   // hub: a brass boss round a socket with a blood jewel
      if (r >= hub - 3.5) { const k = (r - (hub - 3.5)) / 3.5, hf = Math.abs(((s + 0.5) % 1) - 0.5) * SEG * r; D.px(PX, PY, 'brass', hf < 0.9 && k > 0.2 && k < 0.8 ? 9 : 5.5 + (k < 0.25 ? 1 : 0), { n: [ux * (k * 1.6 - 0.6), uy * (k * 1.6 - 0.6)] }); }
      else if (r >= 4.6) D.px(PX, PY, 'iron', 2 + (r < 5.6 ? -1 : 0), { n: [ux * -0.5, uy * -0.5] });
      else if (o.curse > 0) { const lid = Math.abs(dy) > 4.6 * o.curse; D.px(PX, PY, lid ? 'iron' : Math.abs(dx) < 1.1 ? 'ink' : 'red', lid ? 3 : Math.abs(dx) < 1.1 ? 0 : 7 + (r < 3 ? 2 : 0), lid ? undefined : E); }
      else D.px(PX, PY, 'red', (blood > 0 ? 5 + 2 * pulse : 3) + (dx < 0 && dy < 0 ? 2 : 0) + (r < 1.6 && dx < 0 && dy < 0 ? 2 : 0), { e: blood > 0 ? 255 : 0, n: [ux * 0.7, uy * 0.7] });
      continue; }
    // grooves between the sectors: dark cuts that fill with blood from the hub outwards (they blur thin when spinning fast)
    let gv = 0; if (bd < 1.05 + smear * r) for (let j = 0; j < ns; j++) { const ss = (lt - smear * j / Math.max(1, ns - 1)) / SEG, ff = ss - Math.floor(ss); if (Math.min(ff, 1 - ff) * SEG * r < 1.05) gv++; }
    if (gv >= (ns > 1 ? 2 : 1)) { const fill = (r - rIn) / (rRune - 1 - rIn), full = fill < blood, front = full && fill > blood - 0.06;
      if (full) D.px(PX, PY, bm, front ? 9 : 5 + (lit >= 0 ? 1 : 0) + (bm === 'gold' ? 2 : 0), E); else D.px(PX, PY, 'stone', 0.8); continue; }
    if (bd < 2.1 && ns === 1) { OPT.n = [0, -0.4]; D.px(PX, PY, 'stone', 6.4, OPT); continue; }   // groove lips
    const hot = i === lit, hv = i === hov, fin = FINL[i];
    // outcome band: a strip of the prize's material along the outer edge of its sector
    if (r >= rBand) { if (i === 0) D.px(PX, PY, 'stone', 3.2 + (tex > 0.55 ? 1 : 0)); else if (hot) D.px(PX, PY, fin[0], 8 + 2 * Math.max(0, 1 - la * 1.5) + pulse, E); else { OPT.n = [ux * 0.4, uy * 0.4]; D.px(PX, PY, fin[0], 5 + (hv ? 2 : 0) + (r - rBand < 1 ? -1 : 0), OPT); } continue; }
    // sector face: dressed stone, a carved relief of the prize (turns with the wheel; smeared into an arc when fast)
    let ic = null;
    if (Math.abs(r - RC) < 12.5) for (let j = 0; j < ns && !ic; j++) { const c2 = rot[j][0], s2 = rot[j][1], lx2 = dx * c2 + dy * s2, ly2 = -dx * s2 + dy * c2;
      let l2 = Math.atan2(ly2, lx2) + Math.PI / 2; l2 = ((l2 % TAU) + TAU) % TAU; const i2 = Math.floor(l2 / SEG) % N, ph = -Math.PI / 2 + (i2 + 0.5) * SEG, cp = Math.cos(ph), sp = Math.sin(ph), ex = lx2 - RC * cp, ey = ly2 - RC * sp;
      const u = Math.floor(-ex * sp + ey * cp + 8.5), v = Math.floor(-ex * cp - ey * sp + 8.5), F = FICON[i2], g = F.at(u, v);
      if (g) ic = { g, i: i2, sm: j, e: j ? 0 : (!F.at(u, v - 1) || !F.at(u - 1, v) ? 1 : !F.at(u, v + 1) || !F.at(u + 1, v) ? -1 : 0) }; }
    if (ic) { const f2 = FINL[ic.i], h2 = ic.i === lit, base = ic.g === 'a' ? 3.2 : ic.g === 'c' ? 9 : 6.8;
      if (ic.i === 0) D.px(PX, PY, 'stone', ic.g === 'c' ? 0.8 : 2); else D.px(PX, PY, f2[0], (h2 ? base + 3 + pulse : base + (ic.i === hov ? 1.5 : 0)) + ic.e * 1.4 - ic.sm * 1.2, h2 ? E : NO);
      continue; }
    const crk = tex < 0.2 && hash(Math.floor(lx + 80), Math.floor(ly + 80), 3) < 0.25;
    D.px(PX, PY, 'stone', 4.8 + (i % 2 ? -0.4 : 0) + Math.round((tex - 0.5) * 2.4) + (crk ? -2 : 0) + (hv ? 0.8 : 0) + (hot ? 2 + pulse * 0.8 : lit >= 0 ? -0.9 : 0), hot && la < 0.5 ? E : undefined);
  }
}
X.def('mb_fate', {
  size: [AW, AH], fy: 150, noFrame: 1, amb: [0.2, 0.22],
  paint(S, sc) {
    // crypt wall: big dressed blocks, darker toward the ceiling and corners
    S.lay('wall'); TX.ashlar(S, 0, 0, AW, 150, 'stone', 4, { bh: 13, bw: 26, crack: 0.2 });
    S.ao(0, 0, AW, 40, 't', 2.2); S.ao(0, 0, 40, 150, 'l', 1.6); S.ao(AW - 40, 0, 40, 150, 'r', 1.6);
    for (let k = 0; k < 7; k++) TX.crack(S, 20 + k * 41 + ((k * 13) % 17), 60 + ((k * 29) % 70), 8 + (k % 3) * 5, 'stone', 4, 'v');
    // floor: worn flagstones, a blood channel runs from the wheel's base toward us
    TX.ashlar(S, 0, 150, AW, 25, 'stone', 3.8, { bh: 5, bw: 24, crack: 0.3 }); S.ao(0, 150, AW, 6, 't', 1.4);
    S.poly([[146, 156], [154, 156], [158, 175], [142, 175]], 'red', 1.6); S.poly([[147, 156], [153, 156], [156, 175], [144, 175]], 'red', 2.2); S.vl(145, 158, 17, 'mstone', 6.5);
    // high slit window, left: night sky and a bar, the moon shaft falls across the wheel
    S.beg(); S.rect(44, 36, 9, 34, 'stone', 2); S.ell(48.5, 36, 4.5, 4.5, 'stone', 2); S.end({ none: 1 });
    for (let y = 33; y < 69; y++) for (let x = 45; x < 52; x++) { const u = (x - 48) / 3.6, inA = y >= 36 || u * u + ((y - 36) / 3.5) ** 2 < 1; if (inA) S.px(x, y, 'night', 3 + (y < 44 ? 2 : y < 54 ? 1 : 0), { e: 255 }); }
    S.px(47, 40, 'linen', 10, { e: 255 }); S.px(50, 47, 'linen', 8, { e: 255 }); S.px(46, 58, 'linen', 7, { e: 255 }); S.vl(48, 34, 35, 'iron', 3); S.hl(45, 50, 7, 'iron', 3);
    S.hl(43, 69, 11, 'stone', 7, { n: [0, -0.8] }); S.hl(43, 70, 11, 'stone', 2);
    sc.shaft({ x: 49, y0: 40, y1: 150, w0: 3, w1: 20, dx: 62, c: '#a8c0ff', i: 0.42, haze: 0.4, fade: 0.25 });
    sc.light({ x: 70, y: 70, z: 40, r: 150, i: 0.55, c: '#8ea6ff', tint: 0.35 });                               // 0 moon
    // lintel over the wheel with a band of carved names (the rule line sits on it), two columns
    S.lay('back');
    [[62, 84], [216, 238]].forEach(([a, b]) => { S.beg(); S.box(a, 30, b - a, 120, 'stone', 5, { side: 2 }); for (let x = a + 3; x < b - 2; x += 4) { S.vl(x, 34, 110, 'stone', 3.4); S.vl(x + 1, 34, 110, 'stone', 6.2); } S.box(a - 3, 26, b - a + 6, 6, 'stone', 6, { top: 1 }); S.box(a - 4, 142, b - a + 8, 8, 'stone', 5, { top: 2 }); S.noise(a, 30, b - a, 120, 1, 3, a); S.end(); });
    S.beg(); S.box(56, 12, 188, 15, 'stone', 5.4, { top: 2 }); S.noise(56, 12, 188, 15, 1, 3, 12); S.end();
    const g2 = glyphStrip(172, 3, 5); for (let x = 0; x < 172; x++) for (let y = 0; y < 3; y++) if (g2[y * 172 + x] && (x < 70 || x > 102)) S.px(64 + x, 23 + y, 'stone', 2);
    // the wheel's shadow on the wall (moon from the upper left) and its thick stone edge, seen below-right of the face
    S.lay('wall'); S.shadow([[102, 44], [206, 44], [218, 70], [222, 110], [212, 146], [120, 150], [100, 118]], 1.6);
    S.lay('back'); S.beg(); for (let y = -64; y <= 66; y++) for (let x = -64; x <= 66; x++) { const ax = x + 0.5, ay = y + 0.5, d0 = Math.hypot(ax, ay), d1 = Math.hypot(ax - 2.2, ay - 3.2); if (d1 <= FW.R + 1.2 && d0 > FW.R - 2) S.px(FW.cx + x, FW.cy + y, 'stone', d1 > FW.R ? 1.4 : 2.6 + (ax * 0.02), { n: [ax / d0 * 0.6, ay / d0 * 0.6] }); } S.end();
    // the iron A-frame that holds the axle (seen under the disc)
    S.beg(); S.line(112, 150, 146, 96, 'iron', 4, { w: 3 }); S.line(188, 150, 154, 96, 'iron', 3.4, { w: 3 }); S.hl(118, 138, 64, 'iron', 4); S.hl(118, 139, 64, 'iron', 2); S.end();
    // braziers on tripods, left and right
    [[34, 0], [266, 1]].forEach(([bx, k]) => {
      S.lay('mid'); S.beg(); S.line(bx - 9, 150, bx - 2, 116, 'iron', 4, { w: 2 }); S.line(bx + 9, 150, bx + 2, 116, 'iron', 3, { w: 2 }); S.line(bx, 150, bx, 118, 'iron', 5, { w: 1 }); S.hl(bx - 6, 132, 13, 'iron', 4);
      S.poly([[bx - 13, 104], [bx + 13, 104], [bx + 9, 114], [bx + 4, 117], [bx - 4, 117], [bx - 9, 114]], 'iron', 4.5); S.hl(bx - 13, 104, 27, 'iron', 8, { n: [0, -0.8] }); S.hl(bx - 12, 105, 25, 'iron', 2.5);
      for (let q = 0; q < 5; q++) S.px(bx - 9 + q * 4.5, 108 + (q % 2), 'iron', 7.5); S.hl(bx - 8, 112, 17, 'iron', 3); S.end();
      for (let q = 0; q < 9; q++) S.px(bx - 8 + q * 2, 103, 'fire', 3 + (q % 3), { e: 1 + k + 1 });
      sc.light({ x: bx, y: 96, z: 22, r: 104, i: 1.45, c: '#ff8a3a', fl: 'fire', ph: k * 2.3, tint: 0.26 });        // 1, 2 braziers
      sc.emit({ k: 'emb', x: bx, y: 96, w: 12, rate: 4, sp: 9, ang: 0, spread: 0.7, life: 2.4 });
    });
    // chains hanging from the ceiling, a cage with a skull on the right
    S.lay('back'); [[98, 0, 12], [204, 0, 9]].forEach(([x, y0, n]) => { for (let k = 0; k < n; k++) { S.px(x, y0 + k * 3, 'iron', 4); S.px(x, y0 + k * 3 + 1, 'iron', 6.5); S.px(x + 1, y0 + k * 3 + 2, 'iron', 3); } });
    S.lay('front'); S.beg(); for (let k = 0; k < 16; k++) { S.px(284, k * 3, 'iron', 4); S.px(284, k * 3 + 1, 'iron', 6.5); S.px(285, k * 3 + 2, 'iron', 3); }
    for (let q = 0; q < 5; q++) S.vl(277 + q * 4, 50, 16, 'iron', q === 0 ? 7 : 4.5); S.hl(276, 50, 18, 'iron', 7); S.hl(276, 66, 18, 'iron', 3); S.ell(284.5, 49, 8.5, 2, 'iron', 5); S.end();
    S.beg(); S.ell(284.5, 60, 4.5, 4, 'bone', 7, { dome: 1 }); S.rect(282, 63, 6, 3, 'bone', 6); S.px(282, 60, 'ink', 1); S.px(286, 60, 'ink', 1); S.px(283, 60, 'ink', 1); S.px(287, 60, 'ink', 1); S.px(284, 62, 'ink', 1); S.hl(283, 65, 4, 'ink', 1); S.end();
    // the base the wheel is sunk into, with a bronze name plate (the text overlay sits on it) and candles
    S.beg(); S.box(96, 136, 108, 16, 'stone', 5.8, { top: 3 }); S.noise(96, 133, 108, 19, 1, 3, 21); S.hl(96, 151, 108, 'stone', 2); S.end();
    S.beg(); S.box(124, 140, 52, 10, 'brass', 5.5); S.rect(126, 142, 48, 6, 'brass', 3.6); [[125, 141], [174, 141], [125, 148], [174, 148]].forEach(([x, y]) => S.px(x, y, 'brass', 9)); S.end();
    [[102, 136, 7], [107, 136, 5], [193, 136, 6], [198, 136, 4]].forEach(([x, y, h]) => candle(S, x, y - 3, h, 'bone', 8));
    for (let x = 99; x < 111; x++) S.px(x, 133, 'bone', 6 + (x % 2)); for (let x = 190; x < 202; x++) S.px(x, 133, 'bone', 6 + (x % 2));
    sc.light({ x: 150, y: 92, z: 20, r: 90, i: 0, c: '#ff5a4a', bake: false, tint: 0.55 });                      // 3 blood glow on the wheel
    sc.light({ x: 104, y: 124, z: 16, r: 34, i: 0.45, c: '#ffb860', fl: 'candle', ph: 1, tint: 0.4 });            // 4, 5 candles
    sc.light({ x: 196, y: 124, z: 16, r: 34, i: 0.45, c: '#ffb860', fl: 'candle', ph: 4, tint: 0.4 });
    // a skull and bones in the front corner, a pool of old wax
    S.lay('front'); S.beg(); S.ell(18, 166, 6, 5, 'bone', 6.5, { dome: 1 }); S.rect(15, 169, 7, 3, 'bone', 5.5); S.px(15, 166, 'ink', 1); S.px(16, 166, 'ink', 1); S.px(20, 166, 'ink', 1); S.px(21, 166, 'ink', 1); S.px(18, 168, 'ink', 1); S.hl(16, 171, 5, 'ink', 1); S.end();
    S.beg(); S.line(26, 172, 38, 168, 'bone', 7, { w: 2 }); S.px(25, 171, 'bone', 8); S.px(38, 167, 'bone', 8); S.end();
    sc.emit({ k: 'dust', x: 90, y: 60, w: 70, h: 60, rate: 3, sp: 2, life: 5 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const st = rs.st, fl = o.flare || 0;
    // brazier fires (roar when the wheel lands)
    D.lay('mid'); [[34, 'L'], [266, 'R']].forEach(([bx, k]) => { const f = fireSim(st[k] || (st[k] = {}), 22, 26, t, (0.9 + fl * 0.1) * (1 - 0.35 * (o.dim || 0)), 0.62 - fl * 0.3 + 0.3 * (o.dim || 0)); drawFire(D, f, 22, 26, bx - 11, 78, (o.violet || 0) > 0.5 ? 'arcane' : 'fire', (x, y) => Math.abs(x - 10.5) < 2 + y * 0.42 + (fl > 0 ? fl * 4 : 0)); if ((o.violet || 0) > 0.5) rs.dl.push({ x: bx, y: 92, z: 22, r: 100, i: 1.2 * o.violet, rgb: [160, 110, 255], tint: 0.6 }); });
    if (fl > 0) { rs.flash(1, fl * 0.5); rs.flash(2, fl * 0.5); }
    const dm = o.dim || 0; rs.mul[1] = rs.mul[2] = 1 - 0.75 * dm;
    // a tap on empty stage: a pinch of grit and dust drops from the lintel (or the ceiling) above it
    if (o.tap && o.tap.n !== st.tapN) { st.tapN = o.tap.n; const tx = clamp(o.tap.x, 4, AW - 4), ty = tx > 56 && tx < 244 ? 28 : 4; rs.burst('chip', tx, ty, 4, { sp: 10, ang: Math.PI, spread: 1.2, life: 1.2, floor: 150 }); rs.burst('dust', tx, ty + 2, 6, { sp: 6, life: 1.6, w: 8 }); }
    [[102, 126, 7], [107, 128, 5], [193, 127, 6], [198, 129, 4]].forEach(([x, y, h], i) => flame(D, x, y, 4, t, i * 1.7));
    // blood light on the wheel
    const bl = o.blood || 0; rs.mul[3] = bl > 0 ? 0.35 + 0.65 * bl * (0.8 + 0.2 * Math.sin(t * 5)) : 0; rs.flash(3, 0);
    // the disc
    D.lay('mid'); fateWheel(D, t, o, rs);
    // result light in the prize colour
    if (o.lit >= 0 && o.lit != null) { const f = FINL[o.lit], a = Math.max(0.35, 1.4 * Math.exp(-(o.litAge || 0) * 1.5)), ph = -Math.PI / 2 + (o.lit + 0.5) * TAU / 7 + (o.ang || 0); rs.dl.push({ x: FW.cx + Math.cos(ph) * 34, y: FW.cy + Math.sin(ph) * 34, z: 22, r: 110, i: a, rgb: f[1], tint: 0.6 }); }
    if (o.curse > 0) rs.dl.push({ x: FW.cx, y: FW.cy, z: 24, r: 150, i: 1.3 * o.curse, rgb: [255, 60, 60], tint: 0.7 });
    // a falling blood drop (paid): from the pointer's pivot down onto the hub
    if (o.drop > 0 && o.drop < 1) { const y = 30 + (FW.cy - 30) * o.drop * o.drop; D.lay('front'); D.px(150, y, 'red', 8, { e: 255 }); D.px(150, y - 1, 'red', 6, { e: 255 }); if (o.drop > 0.5) D.px(150, y - 2, 'red', 4, { e: 255 }); }
    if (o.drop >= 1 && !st.splat) { st.splat = 1; rs.burst('blood', 150, FW.cy - 2, 8, { sp: 30, ang: 0, spread: 2.6, life: 0.5, floor: FW.cy + 6 }); rs.flash(3, 1.2); } if (!(o.drop >= 1)) st.splat = 0;
    // the pointer: an iron tongue hanging from the lintel on a pivot, flicked by every stud
    const a = o.fl || 0, pc = Math.cos(a), ps = Math.sin(a), P = (x, y) => [150 + x * pc - y * ps, 28 + x * ps + y * pc];
    D.lay('front'); D.beg(); D.poly([P(-5, -1), P(5, -1), P(5, 3), P(3, 8), P(1.5, 12), P(0, 15), P(-1.5, 12), P(-3, 8), P(-5, 3)], 'iron', 5); D.line(...P(-3, 1), ...P(-0.8, 12), 'iron', 8.5); D.line(...P(3, 2), ...P(1, 11), 'iron', 2.6); D.line(...P(0, 0), ...P(0, 13), 'iron', 6.5);
    D.poly([P(-2, 3), P(2, 3), P(0, 7)], 'red', 5 + (bl > 0 ? 3 * bl : 0), bl > 0 ? { e: 255 } : undefined); D.end();
    D.beg(); D.rect(145, 24, 11, 6, 'brass', 5.5); D.hl(145, 24, 11, 'brass', 9); D.hl(145, 29, 11, 'brass', 3); D.px(150, 26, 'brass', 10); D.px(146, 25, 'brass', 8); D.px(154, 25, 'brass', 8); D.end();
    // sparks where the studs strike the tongue
    const cl2 = o.clicks || 0; if (cl2 !== st.cl) { if (st.cl != null && cl2 > st.cl) { const [tx, ty] = P(0, 15); rs.burst('spark', tx, ty, Math.abs(o.w || 0) > 4 ? 1 : 3, { sp: 30, ang: (o.w || 0) > 0 ? 1.8 : -1.8, spread: 1.2, life: 0.4, floor: 150 }); } st.cl = cl2; }
    // the wheel hangs on a stud: grit and sparks where it bites the pointer
    if (o.grind > 0 && R() < 0.35 * o.grind) { const [gx, gy] = P(0, 14); rs.burst('chip', gx, gy + 2, 1, { sp: 16, ang: Math.PI * 0.8, spread: 1.2, life: 0.8, floor: 150 }); if (R() < 0.4) rs.burst('spark', gx, gy, 1, { sp: 24, ang: -1.9, spread: 1, life: 0.3, floor: 150 }); }
    // a heavy landing shakes grit and dust off the lintel
    if (o.quake != null && o.quake !== st.qk) { if (st.qk != null) for (let k = 0; k < 14; k++) { const x = 64 + R() * 172; rs.burst('chip', x, 28, 1, { sp: 8, ang: Math.PI, spread: 0.8, life: 1.4, floor: 150 }); rs.burst('dust', x, 30, 2, { sp: 5, life: 2, w: 6 }); } st.qk = o.quake; }
    // the prize's relief rises off the wheel, big and glowing (when the framework has no front pass for mb_fate_rise)
    if (o.rise && o.rise.i >= 0) fateRise(D, t, rs, o.rise);
    // echo: the result keeps the air busy — dust for nothing, glints, souls, gold sparks for the best
    const tr = o.tier || 0; if (o.lit >= 0 && o.lit != null && tr > 0 && R() < 0.08 + tr * 0.1) { const k = ['mote', 'glint', 'soul', 'gold'][Math.min(3, tr - 1)]; rs.burst(k, 80 + R() * 140, 40 + R() * 100, 1, { sp: 8, life: 1.6 }); }
  },
});
// the prize's relief alone on a see-through stage (drawn over the reveal's dim and rays when the framework offers a front pass)
function fateRise(D, t, rs, r) { const F = FICON[r.i], fin = FINL[r.i], a = r.age || 0, up = 1 - Math.pow(1 - clamp(a / 0.6, 0, 1), 3), k = (r.k || 2) * (a < 0.12 ? 0.4 + a / 0.12 * 0.6 : 1) * (1 + 0.04 * Math.sin(t * 5)), cx = FW.cx, cy = FW.cy - 30 - 22 * up;
  D.lay('front'); const half = Math.ceil(8.5 * k) + 1; for (let y = -half; y <= half; y++) for (let x = -half; x <= half; x++) { const u = Math.floor(x / k + 8.5), v = Math.floor(y / k + 8.5), g = F.at(u, v); if (!g) continue; D.px(cx + x, cy + y, fin[0], g === 'a' ? 5 : g === 'c' ? 11 : 8.5, GLOW); }
  rs.dl.push({ x: cx, y: cy, z: 30, r: 90, i: 1.4, rgb: fin[1], tint: 0.6 }); if (R() < 0.5) rs.burst('glint', cx + (R() - 0.5) * 30, cy + (R() - 0.5) * 30, 1, { sp: 10, life: 0.6 }); }
X.def('mb_fate_rise', { size: [AW, AH], fy: AH, noFrame: 1, clear: 1, noFloor: 1, amb: [0.5, 0.3], paint() {}, anim(D, t, rs, o) { if (o && o.rise && o.rise.i >= 0) fateRise(D, t, rs, o.rise); } });
MB.fateGeo = FW;
})();
