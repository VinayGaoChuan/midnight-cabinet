// ==== mc-pxroom-a.js ====
(function () {
// Pixel rooms, pilot set: 铁匠铺 smithy · 蒸汽工坊 generator · 医院 hospital · 招魂台 altar · 水培农场 farm · 净水池 pool.
// Each room: shell (style wall / floor), props across the depth layers, lights, emitters, and an anim that paints what moves.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, stroll, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;

// ───────── shared bits ─────────
// cellular pixel fire (the classic spreading-heat automaton) in a w×h box; heat 0…36 walks the fire ramp; run at 30 Hz
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; } st.cool = cool == null ? 0.4 : cool;
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 3 ? 6 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < st.cool ? 1 : 0)); }
  }
  return f;
}
function drawFire(D, f, w, h, x0, y0, mask) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f[y * w + x]; if (v < 4 || (mask && !mask(x, y))) continue; D.px(x0 + x, y0 + y, 'fire', clamp(v / 36 * 11.5, 1, 11), { e: 255 }); } }
// a small flame for torches and candles (4–7 px), flickering
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
function gear(D, cx, cy, R0, R1, teeth, a, m, t0) {
  const r2 = R0 * R0, n = teeth;
  for (let y = -R0 - 1; y <= R0 + 1; y++) for (let x = -R0 - 1; x <= R0 + 1; x++) {
    const d2 = x * x + y * y, d = Math.sqrt(d2); if (d > R0 + 0.5) continue; const th = Math.atan2(y, x) - a, tooth = Math.cos(th * n) > 0.15;
    if (d > R1 + 0.5 && !tooth) continue; if (d < 2.2) { D.px(cx + x, cy + y, 'iron', 2); continue; }
    const spoke = d < R1 - 2 && d > 3.2 && Math.abs(Math.sin((Math.atan2(y, x) - a) * 2)) > 0.32; if (spoke) continue;
    const rim = d > R1 - 1.5 && d <= R1 + 0.5, nx = x / (d || 1), ny = y / (d || 1);
    D.px(cx + x, cy + y, m, t0 + (rim ? 1 : 0) + (d > R1 + 0.5 ? -0.5 : 0) - (nx + ny) * 0.9, { n: [nx * 0.5, ny * 0.5] });
  }
}
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle

// ───────── 铁匠铺 smithy (medieval · forge) ─────────
X.def('smithy', {
  amb: [0.26, 0.24],
  paint(S, sc) {
    X.shell(S, sc, 'medieval');
    sc.light({ x: 33, y: 74, z: 20, r: 104, i: 1.35, c: '#ff8a30', fl: 'fire', tint: 0.55 });            // 0 forge
    sc.light({ x: 88, y: 73, z: 16, r: 36, i: 0.35, c: '#ffb050', tint: 0.5 });                           // 1 hot iron on the anvil
    sc.light({ x: 113, y: 32, z: 10, r: 62, i: 0.75, c: '#ffb060', fl: 'fire', ph: 3, tint: 0.4 });        // 2 wall torch
    // soot on the wall above the forge
    S.lay('wall'); S.shadow([[10, 9], [56, 9], [52, 56], [14, 56]], 1.2); S.noise(12, 9, 44, 46, 1, 3, 3);
    // chimney + hood
    S.lay('back'); S.beg(); TX.bricks(S, 23, 6, 21, 30, 'mstone', 4, { bw: 7, bh: 5, v: 1 }); S.end();
    S.beg(); S.poly([[13, 48], [54, 48], [45, 34], [22, 34]], 'iron', 4); for (let y = 36; y < 48; y += 4) S.hl(16 + (48 - y) * 0.5, y, 35 - (48 - y), 'iron', 3); S.box(11, 46, 45, 4, 'iron', 5); [15, 26, 41, 52].forEach(x => TX.rivet(S, x, 47, 'iron', 5)); S.end();
    // forge body: brick with a stone hearth ledge, an arched mouth
    S.beg(); TX.bricks(S, 12, 57, 43, 33, 'brick', 5, { bw: 9, bh: 5, v: 1.3, chip: 0.25 }); S.box(10, 54, 47, 4, 'mstone', 6, { top: 2 }); S.end();
    for (let y = 62; y < 86; y++) for (let x = 19; x < 48; x++) { const u = (x - 33) / 13.5, ay = 74 - 12 * Math.sqrt(Math.max(0, 1 - u * u)); if (Math.abs(u) <= 1 && y >= ay) S.px(x, y, 'ink', 1); }
    for (let x = 19; x < 48; x++) { const u = (x - 33) / 13.5; if (Math.abs(u) > 1) continue; const ay = Math.round(74 - 12 * Math.sqrt(1 - u * u)); S.px(x, ay - 1, 'brick', 8, { n: [0, -0.6] }); S.px(x, ay - 2, 'brick', 3); }
    for (let x = 20; x < 47; x++) { S.px(x, 85, 'fire', 4 + (x % 3), { e: 1 }); S.px(x, 84, 'fire', 5 + ((x * 7) % 4), { e: 1 }); if ((x * 5) % 3 === 0) S.px(x, 83, 'fire', 7, { e: 1 }); }
    S.rect(18, 86, 31, 3, 'mstone', 5); S.hl(18, 86, 31, 'mstone', 7, { n: [0, -0.8] });
    // bellows' anchor block
    S.beg(); S.box(57, 66, 4, 6, 'wood', 4); S.end();
    // tool rack: board, pegs, tongs, a hammer, horseshoes
    S.beg(); S.box(114, 20, 30, 5, 'wood', 5); [118, 126, 134, 141].forEach(x => S.px(x, 25, 'iron', 6)); S.end();
    S.beg(); S.line(118, 26, 116, 44, 'iron', 6); S.line(119, 26, 121, 44, 'iron', 5); S.px(116, 45, 'iron', 4); S.px(121, 45, 'iron', 4); S.end();
    S.beg(); S.line(126, 26, 126, 40, 'wood', 6); S.box(123, 40, 7, 4, 'iron', 7); S.end();
    [[134, 27], [141, 27]].forEach(([x, y]) => { S.beg(); S.line(x - 2, y, x - 2, y + 5, 'iron', 7); S.line(x + 2, y, x + 2, y + 5, 'iron', 6); S.hl(x - 2, y + 6, 5, 'iron', 5); S.end(); });
    // wall torch: bracket + stick (flame is animated)
    S.beg(); S.box(110, 40, 6, 3, 'iron', 5); S.line(113, 40, 113, 34, 'wood', 6, { w: 1 }); S.px(112, 34, 'wood', 4); S.px(114, 34, 'wood', 4); S.end();
    // anvil on its stump
    S.lay('mid'); S.beg(); S.cyl(81, 84, 16, 6, 'wood', 5, { rim: 2 }); S.ell(89, 84, 8, 1.2, 'wood', 7, { n: [0, -0.8] }); S.hl(82, 87, 14, 'iron', 4); S.end();
    S.beg(); S.poly([[73, 75], [101, 75], [101, 78], [96, 79], [93, 81], [97, 82], [97, 85], [80, 85], [80, 82], [84, 81], [82, 79], [77, 78]], 'iron', 5);
    S.rect(76, 75, 25, 2, 'iron', 8, { n: [0, -0.85] }); S.hl(74, 75, 2, 'iron', 7); S.rect(87, 79, 6, 2, 'iron', 3); S.end();
    // quench barrel
    S.beg(); S.cyl(124, 73, 17, 17, 'wood', 5, { rim: 2.5 }); S.hcyl(124, 76, 17, 2, 'iron', 5); S.hcyl(124, 85, 17, 2, 'iron', 4); S.ell(132.5, 73, 8.5, 1.8, 'water', 3, { n: [0, -0.9] }); S.hl(128, 73, 4, 'water', 6); S.end();
    // coal scuttle in the foreground
    S.lay('front'); S.beg(); S.poly([[3, 90], [22, 90], [20, 81], [5, 81]], 'iron', 3); S.hl(4, 81, 17, 'iron', 6); for (let i = 0; i < 9; i++) S.px(6 + i * 1.7, 79 + (i % 3 === 1 ? -1 : 0), 'ink', 2); S.px(9, 78, 'iron', 5); S.px(15, 78, 'iron', 4); S.end();
    // a chain with a hook hanging from the beam, close to the eye
    S.beg(); for (let y = 9; y < 34; y += 3) { S.px(66, y, 'iron', 4); S.px(66, y + 1, 'iron', 6); S.px(67, y + 2, 'iron', 3); } S.line(66, 34, 66, 38, 'iron', 5); S.px(67, 39, 'iron', 5); S.px(68, 38, 'iron', 4); S.end();
    sc.emit({ k: 'ember', x: 33, y: 64, w: 18, rate: 5, sp: 7, ang: 0, spread: 0.8, life: 2.6 });
  },
  anim(D, t, rs) {
    const st = rs.st;
    // bellows pump every 2.2 s: the board comes down, the fire roars
    const bp = steps(t, 2.2), squeeze = bp < 0.3 ? Math.sin(bp / 0.3 * Math.PI) : 0, open = Math.round(6 - squeeze * 4);
    D.lay('back'); D.beg(); D.poly([[60, 68], [74, 64 - open], [74, 72 + Math.round(open * 0.3)], [60, 72]], 'leather', 5); for (let k = 0; k < 3; k++) D.line(62 + k * 4, 68 - Math.round(open * k / 4), 62 + k * 4, 71, 'leather', 3);
    D.line(60, 68, 75, 63 - open, 'wood', 6, { w: 1 }); D.line(60, 72, 75, 73, 'wood', 4, { w: 1 }); D.px(76, 63 - open, 'wood', 7); D.end();
    if (squeeze > 0.6 && !st.puffed) { st.puffed = 1; rs.flash(0, 0.45); rs.burst('ember', 33, 70, 7, { sp: 16, ang: 0, spread: 1.2, life: 1.6, w: 16 }); } if (bp > 0.5) st.puffed = 0;
    // fire in the mouth
    const f = fireSim(st, 27, 22, t, 0.9 + squeeze * 0.1, 0.45 - squeeze * 0.25);
    drawFire(D, f, 27, 22, 20, 63, (x, y) => { const u = (x + 20 - 33) / 13.5; return Math.abs(u) <= 1 && y + 63 >= 74 - 12 * Math.sqrt(Math.max(0, 1 - u * u)) + 1 && y + 63 < 84; });
    // the smith: raise, strike, lift — sparks and a flash of hot light on each blow
    const hp = steps(t, 1.15), strike = hp > 0.52 && hp < 0.62;
    let aF; if (hp < 0.5) aF = 1.2 + Math.sin(hp / 0.5 * Math.PI / 2) * 1.7; else if (hp < 0.56) aF = 2.9 - (hp - 0.5) / 0.06 * 1.7; else aF = 1.2 - Math.min(1, (hp - 0.56) / 0.3) * 0.1;
    D.lay('mid'); worker(D, 108, FY, 'smith', { aF, eF: hp < 0.5 ? -0.3 : 0.1, aB: 1.2, eB: 0.6, lB: -0.2, lF: 0.25, kB: 0.1, lean: hp > 0.5 && hp < 0.7 ? 0.7 : 0.2, tool: 'hammer', ta: 0.3 }, -1);
    if (strike && !st.hit) { st.hit = 1; rs.flash(1, 1.6); rs.flash(0, 0.15); rs.burst('spark', 90, 73, 12 + Math.floor(R() * 6), { sp: 46, ang: 0, spread: 2.4, life: 0.9, floor: FY - 1 }); st.heat = 1; }
    if (hp > 0.7) st.hit = 0;
    // hot bar: white at the blow, cooling to orange
    st.heat = Math.max(0.35, (st.heat || 0.6) - 0.012); const hb = 6 + st.heat * 5;
    D.rect(85, 74, 10, 1, 'fire', hb, { e: 255 }); D.px(84, 74, 'fire', hb - 2, { e: 255 }); D.px(95, 74, 'fire', hb - 3, { e: 255 });
    // the torch
    flame(D, 113, 33, 6, t, 1.3);
    // now and then the smith's last piece hisses in the barrel
    if (steps(t, 9.5) < 0.012 && !st.q) { st.q = 1; rs.burst('steam', 132, 70, 6, { sp: 8, ang: 0, spread: 0.8, life: 2.2, w: 10 }); } if (steps(t, 9.5) > 0.2) st.q = 0;
  },
});

// ───────── 蒸汽工坊 steam workshop (steam · power) ─────────
// a copper boiler with a glowing firebox, a flywheel driving a piston, two meshing gears, a relief valve that blows
X.def('generator', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'steam');
    sc.light({ x: 70, y: 74, z: 18, r: 74, i: 1.15, c: '#ff7a30', fl: 'fire', tint: 0.5 });              // 0 firebox
    sc.light({ x: 26, y: 18, z: 16, r: 100, i: 0.85, c: '#ffd8a0', fl: 'candle', ph: 2, tint: 0.25 });     // 1 caged bulb
    sc.light({ x: 141, y: 17, z: 8, r: 50, i: 0.75, c: '#ff3a30', fl: 'pulse', amp: 0.7, sp: 4.5, tint: 0.6 });   // 2 warning lamp
    S.lay('back');
    // boiler: dome, bands, rivets, a pipe to the ceiling run
    S.beg(); S.cyl(67, 9, 7, 14, 'brass', 5, { rim: 2 }); S.box(65, 12, 11, 3, 'brass', 6); S.end();
    S.beg(); S.ell(70, 30, 21, 9, 'copper', 6, { dome: 1 }); S.cyl(49, 30, 43, 56, 'copper', 5, { rim: 2.5 });
    [38, 58, 76].forEach(y => { S.hcyl(48, y, 45, 3, 'brass', 6, { rim: 1.5 }); for (let x = 52; x < 90; x += 5) S.px(x, y + 1, 'brass', 9); });
    for (let y = 44; y < 56; y += 4) for (let x = 52; x < 90; x += 6) S.px(x + (y % 8 ? 3 : 0), y, 'copper', 8);
    S.box(45, 84, 51, 6, 'iron', 5, { top: 2 }); S.end();
    // firebox door with a grille that glows with the fire
    S.beg(); S.box(59, 64, 23, 17, 'iron', 4); for (let k = 0; k < 3; k++) { S.rect(62, 68 + k * 4, 17, 2, 'fire', 6 - k * 0.5, { e: 1 }); S.hl(62, 68 + k * 4, 17, 'fire', 8, { e: 1 }); } S.rect(80, 70, 2, 5, 'brass', 7); S.end();
    // gauge face (needle is animated)
    S.beg(); S.ell(70, 47, 7, 7, 'brass', 6, { ring: 1.4 }); S.ell(70, 47, 5.6, 5.6, 'linen', 9); for (let k = 0; k < 7; k++) { const a = Math.PI * (0.8 + k * 0.233); S.px(70 + Math.cos(a) * 4.4, 47 + Math.sin(a) * 4.4, 'ink', 1); } S.px(73, 45, 'red', 7); S.px(74, 46, 'red', 7); S.end();
    // relief valve on a side pipe
    S.beg(); S.hcyl(90, 30, 14, 4, 'brass', 5, { rim: 1.5 }); S.box(103, 26, 5, 9, 'iron', 6); S.ell(105.5, 24, 4, 1.5, 'crimson', 8); S.vl(105, 21, 3, 'iron', 7); S.end();
    // piston cylinder bolted to the boiler
    S.beg(); S.box(34, 69, 16, 8, 'iron', 5); S.hl(34, 72, 16, 'iron', 3); TX.rivet(S, 36, 70, 'iron', 5); TX.rivet(S, 46, 70, 'iron', 5); S.end();
    // flywheel stand
    S.beg(); S.poly([[21, 90], [31, 90], [27, 63], [25, 63]], 'iron', 4); S.end();
    // caged bulb fixture + warning lamp housing
    S.beg(); S.vl(26, 9, 5, 'iron', 4); S.rect(23, 14, 7, 2, 'iron', 6); S.end();
    S.beg(); S.box(137, 10, 9, 4, 'iron', 5); S.end();
    // gear axles
    S.lay('wall'); S.ell(121, 48, 3, 3, 'iron', 3); S.ell(136, 64, 2, 2, 'iron', 3);
    // foreground: an upright pipe with a valve wheel, a heap of coal
    S.lay('front'); S.beg(); S.cyl(141, 8, 5, 82, 'iron', 4, { rim: 1.5 }); S.hcyl(140, 30, 7, 3, 'iron', 6); S.hcyl(140, 70, 7, 3, 'iron', 6); S.end();
    S.beg(); S.ell(143, 50, 5, 5, 'crimson', 6, { ring: 1.2 }); S.line(139, 50, 147, 50, 'crimson', 5); S.line(143, 46, 143, 54, 'crimson', 5); S.end();
    S.beg(); for (let i = 0; i < 26; i++) { const x = 4 + (i * 7) % 18, y = 89 - Math.floor(i / 5) * 1.5 - ((i * 3) % 2); S.rect(x, y, 2, 2, 'ink', 2); S.px(x, y, 'iron', 5); } S.end();
    sc.emit({ k: 'steam', x: 56, y: 8, rate: 0.6, sp: 4, ang: 0.3, spread: 0.6, life: 1.6 });
    sc.emit({ k: 'steam', x: 112, y: 8, rate: 0.4, sp: 3, ang: -0.3, spread: 0.6, life: 1.4 });
  },
  anim(D, t, rs) {
    const st = rs.st, a = t * 2.2;
    // flywheel + crank + piston rod
    D.lay('back'); D.beg(); const fx = 26, fy = 63, Rw = 13;
    for (let y = -Rw; y <= Rw; y++) for (let x = -Rw; x <= Rw; x++) { const d = Math.hypot(x, y); if (d > Rw + 0.4) continue; const th = Math.atan2(y, x) - a;
      if (d > Rw - 2.2) D.px(fx + x, fy + y, 'iron', 6 - (x + y) / Rw * 1.4 + (d > Rw - 1 ? -1 : 0), { n: [x / Rw * 0.6, y / Rw * 0.6] });
      else if (d < 3) D.px(fx + x, fy + y, 'iron', d < 1.5 ? 8 : 5);
      else if (Math.abs(Math.sin(th * 3)) < 0.16) D.px(fx + x, fy + y, 'iron', 5); }
    D.end(); const px = fx + Math.cos(a) * 8, py = fy + Math.sin(a) * 8, cx = 34 - 4 + Math.cos(a) * 3;
    D.beg(); D.line(px, py, cx, 73, 'iron', 8); D.rect(Math.round(px) - 1, Math.round(py) - 1, 3, 3, 'brass', 8); D.rect(Math.round(cx) - 1, 72, 4, 3, 'brass', 7); D.end();
    // gears: 12 teeth and 8 teeth, meshing
    D.beg(); gear(D, 121, 48, 15, 12, 12, t * 0.9, 'brass', 5); D.end();
    D.beg(); gear(D, 136, 64, 9, 6, 8, -t * 0.9 * 1.5 + 0.2, 'iron', 6); D.end();
    // gauge needle: trembles, climbs, snaps back when the valve blows
    const vp = steps(t, 7.5), pr = vp < 0.85 ? vp / 0.85 : 1 - (vp - 0.85) / 0.15, na = Math.PI * (0.8 + 1.4 * (0.15 + pr * 0.75)) + n1(t * 20) * 0.05;
    D.line(70, 47, 70 + Math.cos(na) * 4.5, 47 + Math.sin(na) * 4.5, 'red', 6); D.px(70, 47, 'iron', 3);
    if (vp > 0.85 && !st.blow) { st.blow = 1; rs.burst('steam', 105, 20, 14, { sp: 26, ang: -0.2, spread: 0.5, life: 1.8, w: 2 }); rs.flash(2, 0.8); } if (vp < 0.5) st.blow = 0;
    if (vp > 0.85 && vp < 0.95 && R() < 0.5) rs.burst('steam', 105, 20, 1, { sp: 20, ang: -0.2, spread: 0.4, life: 1.2 });
    // bulb + warning lamp (glass in front of the light)
    D.rect(25, 16, 3, 3, 'lamp', 9, { e: 255 }); D.px(26, 17, 'lamp', 11, { e: 255 }); D.px(24, 17, 'iron', 3); D.px(28, 17, 'iron', 3);
    D.rect(138, 14, 7, 4, 'red', 7, { e: 3 }); D.hl(139, 14, 5, 'red', 9, { e: 3 });
    // the worker: walks the gears, stops to tighten a bolt
    D.lay('mid'); const w = stroll(t, 98, 124, 9, 0.3, 2.6);
    if (w.walking) worker(D, w.x, FY, 'worker', Object.assign(w.pose, { tool: 'wrench', ta: 0.3 }), w.dir);
    else { const k = Math.sin(t * 7); worker(D, w.x, FY, 'worker', { aF: 2.2 + k * 0.3, eF: -0.6, aB: 0.3, eB: -0.2, lF: 0.1, lB: -0.1, tool: 'wrench', ta: 0.8 }, w.dir); }
  },
});

// ───────── 医院 hospital (scifi · med) ─────────
// two beds (one patient breathing), a heart monitor tracing beats, a red-cross lightbox, a buzzing ceiling tube
X.def('hospital', {
  amb: [0.36, 0.34],
  paint(S, sc) {
    X.shell(S, sc, 'scifi');
    sc.light({ x: 75, y: 12, z: 22, r: 132, i: 0.95, c: '#e0f4ff', fl: 'buzz', ph: 5, tint: 0.15 });      // 1 ceiling tube
    sc.light({ x: 75, y: 27, z: 6, r: 32, i: 0.55, c: '#ff5050', tint: 0.5 });                            // 2 lightbox
    sc.light({ x: 72, y: 49, z: 10, r: 32, i: 0.65, c: '#70ff90', fl: 'screen', tint: 0.6 });             // 3 monitor
    S.lay('back');
    // ceiling tube fixture
    S.beg(); S.box(52, 9, 46, 3, 'scifi', 8); S.rect(54, 12, 42, 2, 'linen', 10, { e: 2 }); S.end({ none: 1 });
    // red-cross lightbox
    S.beg(); S.box(66, 18, 19, 18, 'scifi', 4); S.rect(68, 20, 15, 14, 'linen', 10, { e: 255 }); S.rect(73, 21, 5, 12, 'red', 7, { e: 255 }); S.rect(69, 25, 13, 4, 'red', 7, { e: 255 }); S.hl(73, 21, 5, 'red', 9, { e: 255 }); S.end();
    // monitor on a wall arm
    S.beg(); S.box(60, 40, 25, 18, 'scifi', 5); S.rect(62, 42, 21, 13, 'screen', 1, { e: 255 }); for (let x = 62; x < 83; x += 4) S.vl(x, 42, 13, 'screen', 2, { e: 255 }); for (let y = 44; y < 55; y += 4) S.hl(62, y, 21, 'screen', 2, { e: 255 }); S.rect(79, 56, 3, 1, 'teal', 8, { e: 255 }); S.end();
    S.beg(); S.rect(71, 58, 3, 6, 'iron', 6); S.end();
    // medicine cabinet: glass doors, bottles
    S.beg(); S.box(106, 24, 34, 24, 'linen', 8); S.rect(108, 26, 30, 20, 'glass', 3); S.vl(123, 26, 20, 'linen', 7); S.hl(108, 35, 30, 'linen', 7);
    [[110, 'red'], [114, 'teal'], [118, 'gold'], [126, 'screen'], [130, 'pink'], [134, 'tile']].forEach(([x, m], i) => { S.rect(x, 30 - (i % 2), 3, 5 + (i % 2), m, 7); S.px(x + 1, 29 - (i % 2), 'linen', 9); S.rect(x, 39, 3, 5, m === 'red' ? 'gold' : 'red', 6); });
    S.line(109, 27, 114, 32, 'glass', 9); S.line(125, 27, 128, 30, 'glass', 9); S.end();
    // IV stand with a bag
    S.beg(); S.vl(8, 34, 56, 'iron', 7); S.hl(5, 34, 7, 'iron', 8); S.rect(4, 36, 6, 8, 'glass', 8); S.rect(5, 39, 4, 5, 'teal', 7); S.hl(5, 39, 4, 'teal', 9); S.vl(7, 44, 20, 'glass', 8); S.rect(5, 89, 7, 1, 'iron', 5); S.end();
    // beds: frame, mattress, pillow; left one has a patient under the blanket
    const bed = (x) => { S.beg(); S.box(x, 60, 3, 30, 'iron', 7); S.rect(x + 3, 76, 42, 2, 'iron', 6); [x + 5, x + 40].forEach(lx => S.rect(lx, 78, 2, 12, 'iron', 6)); S.box(x + 3, 70, 44, 6, 'linen', 7, { top: 2 }); S.box(x + 4, 66, 11, 5, 'linen', 9); S.end(); };
    S.lay('mid'); bed(12); bed(92);
    S.beg(); S.box(96, 71, 40, 3, 'teal', 5); S.box(118, 68, 16, 4, 'teal', 6); S.end();   // folded blanket on the empty bed
    // potted plant in the corner, near the eye
    S.lay('front'); S.beg(); S.box(135, 80, 10, 10, 'linen', 7); S.hl(135, 80, 10, 'linen', 9); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI - Math.PI; S.line(140, 80, 140 + Math.cos(a) * (5 + i % 3 * 2), 80 + Math.sin(a) * (6 + i % 4 * 2), 'leaf', 6 + (i % 3)); } S.end();
    sc.emit({ k: 'drip', x: 7, y: 64, rate: 0.7, sp: 0, life: 1.5, floor: 72 });
  },
  anim(D, t, rs) {
    const st = rs.st;
    // patient: head on the pillow, the blanket rises and falls
    D.lay('mid'); const br = Math.round(Math.sin(t * 1.7) * 0.6 + 0.4);
    D.beg(); D.rect(16, 63, 6, 5, 'skin', 6); D.rect(16, 62, 6, 2, 'hair', 4); D.px(20, 65, 'ink', 1); D.rect(22, 68 - br, 24, 3 + br, 'teal', 6); D.hl(22, 68 - br, 24, 'teal', 8); D.poly([[24, 68 - br], [36, 66 - br], [44, 68 - br]], 'teal', 7); D.end();
    // heart trace: a bright head sweeping right, a fading tail
    const sw = (t * 22) % 21, beat = (tt) => { const q = ((tt / 22) * 1.15) % 1; return q > 0.42 && q < 0.5 ? [0, -3, 5, -2, 0][Math.floor((q - 0.42) / 0.016)] || 0 : 0; };
    for (let k = 0; k < 21; k++) { const age = (sw - k + 21) % 21, tt = t * 22 - age; if (age > 18) continue; const y0 = 49 + beat(tt), y1 = 49 + beat(tt - 1), c = clamp(10 - age * 0.45, 4, 10); for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) D.px(62 + k, y, 'screen', c, { e: 255 }); if (age < 1) D.px(62 + k, y0 - 1, 'screen', 10, { e: 255 }); }
    const bpm = Math.floor(t * 1.15) % 2; D.rect(63, 43, 1, 3, 'teal', bpm ? 9 : 6, { e: 255 }); D.rect(65, 43, 2, 1, 'teal', 8, { e: 255 }); D.rect(65, 45, 2, 1, 'teal', 8, { e: 255 });
    // now and then a green cross floats up from the patient
    if (steps(t, 3.4) < 0.02 && !st.h) { st.h = 1; rs.burst('heal', 30, 64, 2, { sp: 6, ang: 0, spread: 0.6, life: 1.8, w: 14 }); } if (steps(t, 3.4) > 0.3) st.h = 0;
    // the nurse makes a round with a clipboard
    const w = stroll(t, 60, 94, 8, 0.6, 3); D.lay('mid');
    worker(D, w.x, FY, 'nurse', Object.assign(w.pose, w.walking ? { aF: 1.3, eF: -1.2, tool: 'board' } : { aF: 1.5, eF: -1.3, tool: 'board', hx: 0.5 }), w.dir);
  },
});

// ───────── 招魂台 summoning altar (magic · recruit) ─────────
// a dais under a beam of violet light, a floating crystal, a turning magic circle, candelabras, souls rising
X.def('altar', {
  amb: [0.24, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'magic');
    sc.light({ x: 75, y: 52, z: 14, r: 100, i: 1.15, c: '#9a7cff', fl: 'pulse', amp: 0.12, sp: 2.1, tint: 0.62 });   // 1 crystal
    sc.light({ x: 34, y: 55, z: 10, r: 44, i: 0.6, c: '#ffb060', fl: 'candle', tint: 0.45 });                     // 2 candles left
    sc.light({ x: 116, y: 55, z: 10, r: 44, i: 0.6, c: '#ffb060', fl: 'candle', ph: 2, tint: 0.45 });             // 3 candles right
    sc.shaft({ x: 75, y0: 9, y1: 82, w0: 5, w1: 14, i: 0.5, haze: 0.75, c: '#c0a8ff', f: (t) => 0.75 + 0.25 * Math.sin(t * 2.1) });
    // banners
    S.lay('back'); [[13, 1], [121, -1]].forEach(([x]) => { S.beg(); S.hcyl(x - 2, 10, 20, 2, 'gold', 6); S.vgrad(x, 12, 16, 36, 'crimson', 5, 4); S.vl(x, 12, 36, 'crimson', 6); S.vl(x + 15, 12, 36, 'crimson', 3);
      for (let k = 0; k < 16; k += 2) { S.px(x + k, 48, 'crimson', 4); S.px(x + k + 1, 49, 'gold', 6); }
      S.ell(x + 7.5, 28, 5, 3, 'gold', 7, { ring: 1 }); S.rect(x + 7, 27, 2, 2, 'arcane', 8, { e: 1 }); S.hl(x + 3, 36, 10, 'gold', 6); S.end(); });
    // candelabras
    [34, 116].forEach(x => { S.beg(); S.vl(x, 60, 30, 'iron', 6); S.rect(x - 3, 88, 7, 2, 'iron', 5); S.hl(x - 6, 60, 13, 'iron', 7); S.vl(x - 6, 57, 3, 'iron', 6); S.vl(x + 6, 57, 3, 'iron', 6);
      [[x - 6, 53], [x, 52], [x + 6, 53]].forEach(([cx, cy]) => { S.rect(cx - 1, cy, 3, 57 - cy + 3 - 3, 'linen', 9); S.px(cx - 1, cy + 3, 'linen', 7); }); S.end(); });
    // dais and altar
    S.lay('mid'); S.beg(); S.box(42, 85, 66, 5, 'magic', 7, { top: 2 }); S.box(52, 80, 46, 5, 'magic', 8, { top: 2 }); S.end();
    S.beg(); S.box(61, 69, 28, 11, 'magic', 7, { top: 2 }); S.rect(64, 71, 22, 7, 'magic', 5); S.rect(73, 72, 4, 5, 'arcane', 7, { e: 2 }); S.px(74, 74, 'arcane', 10, { e: 2 }); S.end();
    sc.emit({ k: 'soul', x: 75, y: 70, w: 10, rate: 1.6, sp: 4, ang: 0, spread: 0.3, life: 3 });
    sc.emit({ k: 'rune', x: 75, y: 80, w: 60, rate: 1.2, sp: 3, ang: 0, spread: 0.5, life: 2.4 });
  },
  anim(D, t, rs) {
    const st = rs.st, cp = steps(t, 6), cast = cp > 0.7 && cp < 0.92;
    // magic circle on the floor: an ellipse with turning rune ticks
    D.lay('wall'); for (let k = 0; k < 96; k++) { const a = k / 96 * Math.PI * 2, x = 75 + Math.cos(a) * 46, y = 96 + Math.sin(a) * 4.5; D.px(x, y, 'arcane', 6 + (cast ? 2 : 0), { e: 255 }); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * 0.5, x = 75 + Math.cos(a) * 40, y = 96 + Math.sin(a) * 3.2; D.px(x, y, 'arcane', 9, { e: 255 }); D.px(x + 1, y, 'arcane', 7, { e: 255 }); }
    // floating crystal: a faceted diamond, a highlight that rolls round it
    D.lay('mid'); const cy = 51 + Math.round(Math.sin(t * 1.6) * 2), ph = (t * 1.3) % 1;
    D.beg(); for (let y = -7; y <= 7; y++) { const hw = Math.round((7 - Math.abs(y)) * 0.62); for (let x = -hw; x <= hw; x++) { const f = (x / (hw + 1) + 1) / 2, lit = Math.abs(f - ph) < 0.2; D.px(75 + x, cy + y, 'arcane', (y < 0 ? 8 : 6) + (lit ? 2.5 : 0) - (x > 0 ? 1 : 0), { e: 255 }); } } D.px(74, cy - 4, 'arcane', 11, { e: 255 }); D.end({ none: 1 });
    // candle flames
    [[28, 52], [34, 51], [40, 52], [110, 52], [116, 51], [122, 52]].forEach(([x, y], i) => flame(D, x, y, 4, t, i * 1.7));
    // the summoner: stands, then raises the staff; the crystal flares and runes burst
    worker(D, 50, 85, 'mage', cast ? { aF: 2.7, eF: 0.2, aB: 2.4, eB: 0.3, tool: 'staff' } : { aF: 0.5, eF: -0.4, aB: 0.2, eB: -0.2, tool: 'staff', bob: Math.round(Math.sin(t * 1.5) * 0.5) }, 1);
    if (cast && !st.c) { st.c = 1; rs.flash(1, 1.2); rs.burst('rune', 75, 55, 14, { sp: 28, life: 1.4 }); rs.burst('glint', 75, 51, 6, { sp: 22, life: 0.6 }); } if (!cast) st.c = 0;
  },
});

// ───────── 水培农场 hydroponic farm (nature · store) ─────────
// two shelves of troughs under magenta grow lights, raised beds on the floor, drips, a mister, a farmer watering
const PLANTS = []; { const r = X.rng(77); for (let i = 0; i < 44; i++) PLANTS.push({ x: 0, h: 5 + Math.floor(r() * 7), s: r() * 7, f: r() < 0.35, v: r() }); }
// a plant: stem and leaves are baked (static layer); only the top few pixels sway (anim), so a shelf of them stays cheap
function plantBase(S, x, y, h, fruit, m) {
  for (let k = 0; k < h - 3; k++) { S.px(x, y - k, 'leaf', 4 + k / h * 2); if (k > 1 && k % 2 === 0) { S.px(x - 1, y - k, 'leaf', 6 + (k % 3)); S.px(x + 1, y - k - 1, 'leaf', 7 + (k % 2)); if (k > h / 2) { S.px(x - 2, y - k - 1, 'leaf', 8); S.px(x + 2, y - k, 'leaf', 6); } } }
  if (fruit) { S.px(x + 2, y - h + 4, m || 'red', 7); S.px(x + 2, y - h + 5, m || 'red', 5); S.px(x - 2, y - h + 6, m || 'red', 8); }
}
function plantTip(D, x, y, h, t, ph) {
  const sw = Math.round(Math.sin(t * 1.4 + ph) * 0.9);
  for (let k = h - 3; k < h; k++) { const xx = x + (k >= h - 2 ? sw : 0); D.px(xx, y - k, 'leaf', 5 + k / h * 2); if (k === h - 2) { D.px(xx - 1, y - k, 'leaf', 8); D.px(xx + 1, y - k, 'leaf', 7); } }
  D.px(x + sw, y - h, 'leaf', 9); D.px(x + sw - 1, y - h + 1, 'leaf', 8); D.px(x + sw + 1, y - h + 1, 'leaf', 7);
}
const SHELF = []; for (let i = 0; i < 18; i++) { const p = PLANTS[i]; SHELF.push([13 + i * 7 + (i % 3), 39, p.h, p.s, p.f && i % 2, 'red']); } for (let i = 0; i < 18; i++) { const p = PLANTS[i + 18]; SHELF.push([14 + i * 7 + (i % 2), 67, p.h - 1, p.s, p.f, 'gold']); }
for (let i = 0; i < 6; i++) SHELF.push([13 + i * 7, 79, 9 + (i % 3) * 2, i * 1.3, true, 'red', 1]);
X.def('farm', {
  amb: [0.3, 0.28],
  paint(S, sc) {
    X.shell(S, sc, 'nature');
    // grow bars are long: three lights along each (0–2 upper, 3–5 lower), then a warm fill over the floor (6)
    [21, 49].forEach(y => [30, 75, 120].forEach(x => sc.light({ x, y, z: 9, r: 50, i: 0.8, c: '#ff60d0', tint: 0.75 })));
    sc.light({ x: 75, y: 70, z: 22, r: 70, i: 0.5, c: '#ffe0a0', tint: 0.2 });
    S.lay('back');
    // frame posts
    [7, 73, 141].forEach(x => { S.beg(); S.box(x, 16, 3, 74, 'iron', 5); S.end(); });
    // grow light bars and troughs
    [18, 46].forEach(y => { S.beg(); S.box(9, y, 132, 3, 'iron', 6); S.rect(11, y + 3, 128, 1, 'pink', 10, { e: 255 }); for (let x = 12; x < 138; x += 3) S.px(x, y + 3, 'pink', 8, { e: 255 }); S.end({ none: 1 }); });
    [40, 68].forEach(y => { S.beg(); S.box(9, y, 132, 5, 'iron', 4, { top: 1 }); S.hl(10, y, 130, 'teal', 7); S.hl(10, y + 2, 130, 'iron', 2); for (let x = 16; x < 140; x += 18) S.rect(x, y + 5, 1, 2, 'iron', 4); S.end(); });
    // raised beds on the floor
    S.lay('mid'); [[8, 48], [100, 44]].forEach(([x, w]) => { S.beg(); TX.planks(S, x, 81, w, 9, 'wood', 5, { ph: 3, pw: 12 }); S.rect(x + 1, 80, w - 2, 1, 'earth', 5); S.end(); });
    // sprinkler head on the ceiling
    S.lay('back'); S.beg(); S.vl(40, 7, 4, 'iron', 6); S.rect(38, 11, 5, 2, 'brass', 7); S.end();
    SHELF.forEach(([x, y, h, ph, f, m, front]) => { S.lay(front ? 'mid' : 'back'); plantBase(S, x, y, h, f, m); });
    S.lay('mid'); for (let i = 0; i < 5; i++) { const x = 106 + i * 8; S.beg(); S.ell(x, 77, 3.5, 2.5, 'leaf', 7 + (i % 2), { dome: 1 }); S.px(x - 1, 76, 'leaf', 10); S.px(x, 78, 'leaf', 5); S.end(); }
    sc.emit({ k: 'drip', x: 30, y: 46, rate: 0.5, life: 1, floor: 68 });
    sc.emit({ k: 'drip', x: 110, y: 74, rate: 0.4, life: 1, floor: 89 });
  },
  anim(D, t, rs) {
    const st = rs.st;
    SHELF.forEach(([x, y, h, ph, f, m, front]) => { D.lay(front ? 'mid' : 'back'); plantTip(D, x, y, h, t, ph); });
    D.lay('mid');
    // mister: every 8 s a cloud drifts down over the top shelf
    if (steps(t, 8) < 0.2) { if (R() < 0.6) rs.burst('mist', 40, 13, 1, { sp: 10, ang: Math.PI, spread: 1.6, life: 1.6 }); }
    // the farmer waters the beds
    const w = stroll(t, 58, 94, 7, 0.1, 2.4);
    if (w.walking) worker(D, w.x, FY, 'farmer', Object.assign(w.pose, { aF: 0.7, eF: -0.9, tool: 'can' }), w.dir);
    else { worker(D, w.x, FY, 'farmer', { aF: 1.3, eF: -0.4, aB: 0.2, lF: 0.15, lB: -0.1, lean: 0.4, tool: 'can' }, w.dir); if (R() < 0.35) rs.burst('drip', w.x + w.dir * 12, 76, 1, { sp: 6, ang: w.dir * 2, spread: 0.4, life: 0.6, floor: 80 }); }
  },
});

// ───────── 净水池 water pool (water · med) ─────────
// a glass-fronted pool lit from below, caustics dancing on the wall, a pump with a spinning impeller, a koi
X.def('pool', {
  amb: [0.32, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'water');
    sc.light({ x: 58, y: 76, z: 16, r: 96, i: 1.05, c: '#50c0ff', fl: 'pulse', amp: 0.08, sp: 1.4, tint: 0.55 });   // 0 pool light
    sc.light({ x: 128, y: 14, z: 16, r: 92, i: 0.8, c: '#e8f4ff', tint: 0.15 });                                  // 1 ceiling lamp
    sc.light({ x: 131, y: 62, z: 6, r: 20, i: 0.5, c: '#60ff90', fl: 'pulse', amp: 0.4, sp: 3, tint: 0.6 });      // 2 pump lamp
    // caustics on the wall above the water: bright threads that wander
    sc.field({ x0: 10, y0: 14, x1: 108, y1: 58, lay: 'wall', fn: (x, y, t) => { const k = 1 - (y - 14) / 44, a = Math.abs(Math.sin(x * 0.21 + t * 1.3 + Math.sin(y * 0.19 - t * 0.9) * 2.1)), b = Math.abs(Math.sin(y * 0.33 - t * 1.1 + Math.sin(x * 0.13 + t * 0.7) * 1.8)); const v = Math.max(0, 0.26 - Math.min(a, b)) * 5.5; return v * (1 - k * 0.6); } });
    S.lay('back');
    // pool: tiled rim, glass front
    S.beg(); S.box(14, 55, 92, 4, 'linen', 9, { top: 2 }); S.box(14, 59, 4, 31, 'tile', 8); S.box(102, 59, 4, 31, 'tile', 8); S.box(14, 86, 92, 4, 'tile', 7); S.end();
    S.rect(18, 59, 84, 27, 'water', 5); S.vgrad(18, 62, 84, 24, 'water', 6, 3.5);
    for (let k = 0; k < 6; k++) S.line(24 + k * 14, 62, 20 + k * 14, 85, 'water', 6.5);
    S.rect(18, 59, 84, 1, 'glass', 10); S.line(22, 62, 28, 70, 'glass', 10); S.line(24, 62, 32, 72, 'glass', 9);
    // pump: body, round window, dials, pipe over into the pool
    S.beg(); S.box(111, 52, 32, 38, 'iron', 5, { top: 2 }); S.ell(124, 71, 8, 8, 'iron', 7, { ring: 1.5 }); S.ell(124, 71, 6.5, 6.5, 'water', 3); S.rect(135, 56, 5, 3, 'ink', 1); S.rect(131, 61, 3, 3, 'screen', 8, { e: 3 }); S.box(113, 82, 28, 3, 'iron', 7); S.end();
    S.beg(); S.hcyl(94, 44, 22, 5, 'iron', 6, { rim: 1.5 }); S.cyl(112, 44, 6, 9, 'iron', 6, { rim: 1.5 }); S.cyl(94, 44, 5, 11, 'iron', 6, { rim: 1.5 }); S.box(92, 54, 9, 3, 'iron', 7); S.end();
    // ceiling lamp
    S.beg(); S.vl(128, 8, 3, 'iron', 5); S.poly([[123, 11], [133, 11], [131, 14], [125, 14]], 'iron', 7); S.end();
    // towel rack in the foreground, a bucket
    S.lay('front'); S.beg(); S.box(3, 80, 8, 10, 'iron', 6, { top: 1 }); S.hl(3, 83, 8, 'tile', 8); S.end();
  },
  anim(D, t, rs) {
    const st = rs.st;
    // water surface: a wavy bright line with foam, the level just under the rim
    D.lay('back'); for (let x = 18; x < 102; x++) { const y = 62 + Math.round(Math.sin(x * 0.35 + t * 2.6) * 0.8 + Math.sin(x * 0.13 - t * 1.7) * 0.6); D.px(x, y, 'water', 10, { e: 255 }); D.px(x, y + 1, 'water', 8, { e: 255 }); for (let yy = 60; yy < y; yy++) D.px(x, yy, 'tile', 7); }
    // koi: swims left and right, tail flicks
    const kp = steps(t, 14), kd = kp < 0.5 ? 1 : -1, kx = 30 + (kp < 0.5 ? kp * 2 : (1 - kp) * 2) * 58, ky = 74 + Math.round(Math.sin(t * 0.9) * 3), tail = Math.round(Math.sin(t * 9));
    D.beg(); D.rect(kx - 3, ky, 7, 3, 'fire', 8); D.hl(kx - 3, ky, 7, 'fire', 10); D.px(kx + 3 * kd, ky + 1, 'linen', 10); D.px(kx - 1, ky, 'linen', 10); D.rect(kx - 5 * kd - (kd < 0 ? 1 : 0), ky + tail, 2, 2, 'fire', 7); D.px(kx + 2 * kd, ky + 1, 'ink', 1); D.end({ none: 1 });
    if (R() < 0.05) rs.burst('bubble', 20 + R() * 80, 84, 1, { sp: 3, ang: 0, spread: 0.3, life: 1.8, floor: 62 });
    // stream from the pipe into the pool, splashing
    for (let y = 57; y < 63; y++) { D.px(96, y, 'water', ((y + Math.floor(t * 20)) % 3) ? 9 : 11, { e: 255 }); D.px(97, y, 'water', 8, { e: 255 }); }
    if (R() < 0.4) rs.burst('drip', 96 + R() * 3, 61, 1, { sp: 14, ang: (R() - 0.5) * 2.4, spread: 0.6, life: 0.4, floor: 63 });
    // impeller behind the pump window
    const a = t * 7; for (let k = 0; k < 3; k++) { const b = a + k * 2.094; D.line(124, 71, 124 + Math.cos(b) * 5, 71 + Math.sin(b) * 5, 'tile', 9); } D.px(124, 71, 'iron', 8);
    // keeper mops along the pool
    D.lay('mid'); const w = stroll(t, 26, 86, 6, 0.8, 2);
    worker(D, w.x, FY, 'keeper', Object.assign(w.pose, { aF: 0.9 + Math.sin(t * 5) * 0.3, eF: -0.5, aB: 0.8, eB: -0.3, tool: 'mop' }), w.dir);
  },
});

// ───────── 升降井 the shaft room under the main base (core, legendary) ─────────
// The treasury at the foot of the portal shaft: the portal's teal light pours down the shaft (dust drifting in it),
// runes on the shaft frame breathe with it, the lift cage rides up and down with its lamp, a winch's great gear turns
// as it goes. On the left the stores: shelves of crates, a glass case of three glowing relics, a heap of gold,
// a blueprint glowing on the quartermaster's table while he writes; a porter carries the cage's loads to the shelves.
const LIFT = [22, 40, 58, 76];   // lamp samples down the shaft (crossfaded as the cage moves)
function liftY(t) { const q = steps(t, 13); return q < 0.22 ? -40 + (q / 0.22) * 88 : q < 0.6 ? 48 : q < 0.85 ? 48 - (q - 0.6) / 0.25 * 88 : -40; }
const CRUNE = [['101', '010', '111'], ['110', '011', '010'], ['111', '100', '110']];
X.def('core', {
  amb: [0.32, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'core');
    LIFT.forEach(y => sc.light({ x: 121, y, z: 14, r: 64, i: 0.95, c: '#ffd08a', tint: 0.35, bake: false }));   // 0–3 cage lamp
    sc.light({ x: 34, y: 14, z: 18, r: 100, i: 1, c: '#ffe0b0', fl: 'candle', ph: 4, tint: 0.25 });                // 4 ceiling lamp
    sc.light({ x: 100, y: 50, z: 6, r: 22, i: 0.5, c: '#60ff90', fl: 'pulse', amp: 0.5, sp: 3, tint: 0.6 });         // 5 call light
    sc.light({ x: 122, y: 8, z: 14, r: 96, i: 0.85, c: '#5fd0c0', fl: 'pulse', amp: 0.12, sp: 1.6, tint: 0.55 });   // 6 portal light from above
    sc.light({ x: 74, y: 70, z: 12, r: 34, i: 0.7, c: '#b58cff', fl: 'pulse', amp: 0.2, sp: 2.3, tint: 0.55 });      // 7 relics
    sc.light({ x: 43, y: 76, z: 12, r: 30, i: 0.6, c: '#6aa8ff', fl: 'screen', tint: 0.5 });                       // 8 blueprint
    sc.shaft({ x: 121, y0: 3, y1: 90, w0: 11, w1: 15, i: 0.35, haze: 0.45, c: '#7fe0d0', f: (t) => 0.8 + 0.2 * Math.sin(t * 1.6) });
    // the shaft: a dark opening up through the ceiling, rails, rune-cut frame posts
    S.lay('wall'); S.rect(106, 3, 31, FY - 3, 'ink', 1); for (let y = 3; y < FY; y += 6) S.hl(106, y, 31, 'iron', 2); S.rect(108, 3, 2, FY - 3, 'iron', 4); S.rect(133, 3, 2, FY - 3, 'iron', 4);
    S.lay('back'); S.beg(); S.box(102, 3, 4, FY - 3, 'stone', 6); S.box(137, 3, 4, FY - 3, 'stone', 6); S.end();
    [12, 30, 48, 66].forEach((y, i) => [102, 137].forEach(x => { const g = CRUNE[(i + x) % 3]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (g[b][a] === '1') S.px(x + (a > 1 ? 1 : a), y + b, 'teal', 7.5, { e: 7 }); }));
    S.beg(); S.box(99, 44, 3, 9, 'iron', 5); S.rect(100, 46, 1, 2, 'screen', 9, { e: 6 }); S.rect(100, 49, 1, 1, 'red', 7); S.end();
    // winch frame (the gear and drum turn in anim)
    S.beg(); S.box(86, 74, 16, 16, 'iron', 4, { top: 1 }); TX.rivet(S, 88, 76, 'iron', 4); TX.rivet(S, 98, 76, 'iron', 4); S.end();
    // shelves along the back wall: crates, sacks, blueprint tubes
    S.beg(); [6, 55].forEach(x => S.box(x, 14, 3, 64, 'iron', 5)); [30, 52, 74].forEach(y => S.box(6, y, 52, 3, 'iron', 6, { top: 1 })); S.end();
    const crate = (x, y, w, h, tn) => { S.beg(); S.box(x, y - h, w, h, 'wood', tn, { top: 1 }); S.hl(x + 1, y - Math.round(h / 2), w - 2, 'wood', tn - 2); S.line(x + 1, y - h + 1, x + w - 2, y - 2, 'wood', tn - 1.5); S.end(); };
    crate(10, 30, 12, 10, 6); crate(23, 30, 10, 8, 5); crate(34, 30, 13, 11, 6); crate(48, 30, 7, 6, 5);
    [[13, 52], [20, 52]].forEach(([x, y]) => { S.beg(); S.ell(x, y - 4, 4, 5, 'sand', 6, { dome: 1 }); S.px(x, y - 9, 'leather', 4); S.end(); });
    S.beg(); for (let k = 0; k < 6; k++) { S.cyl(27 + k * 3, 41, 2, 11, 'paper', 7); S.px(27 + k * 3, 40, k % 2 ? 'tile' : 'crimson', 8); } S.end();
    crate(46, 52, 10, 9, 6); crate(10, 74, 14, 11, 5); crate(26, 74, 11, 8, 6); crate(39, 74, 15, 12, 5);
    // ceiling lamp
    S.beg(); S.vl(34, 9, 3, 'iron', 5); S.poly([[29, 12], [39, 12], [37, 14], [31, 14]], 'iron', 7); S.end(); S.rect(32, 14, 5, 1, 'lamp', 10, { e: 5 }); S.px(34, 15, 'lamp', 11, { e: 5 });
    // glass case of relics on crimson velvet
    S.lay('mid'); S.beg(); S.box(62, 80, 24, 10, 'wood', 4, { top: 1 }); S.rect(62, 60, 24, 20, 'glass', 2.2); S.rect(63, 72, 22, 4, 'crimson', 4); S.hl(63, 72, 22, 'crimson', 6);
    S.rect(62, 59, 24, 2, 'brass', 7); S.vl(62, 60, 20, 'brass', 6); S.vl(85, 60, 20, 'brass', 4); S.line(64, 62, 69, 67, 'glass', 9); S.line(65, 62, 71, 68, 'glass', 7); S.end();
    S.poly([[67, 71], [69, 66], [71, 71]], 'arcane', 9, { e: 8 }); S.px(69, 67, 'arcane', 11, { e: 8 });                                    // gem
    S.beg(); S.rect(73, 69, 6, 3, 'gold', 8); S.px(73, 68, 'gold', 9); S.px(75, 67, 'gold', 10); S.px(78, 68, 'gold', 9); S.px(75, 70, 'red', 8); S.end();   // crown
    S.ell(82, 69.5, 2.2, 2.2, 'teal', 9, { e: 8, dome: 1 }); S.px(81, 68, 'teal', 11, { e: 8 });                                        // orb
    // heap of gold on the floor
    S.beg(); for (let y = 0; y < 8; y++) { const hw = Math.round(9 - y * 1.1); for (let x = -hw; x <= hw; x++) S.px(14 + x, FY - 1 - y, 'gold', 5.5 + ((x + y) % 3 === 0 ? 2 : 0) + (y > 5 ? 1 : 0) - (x > hw - 2 ? 1.5 : 0)); } S.end();
    for (let k = 0; k < 5; k++) S.px(6 + k * 4, FY + 1 + (k % 2), 'gold', 7);
    // blueprint table: the drawing glows faintly
    S.beg(); S.box(27, 78, 30, 3, 'wood', 6, { top: 1 }); [29, 53].forEach(x => S.rect(x, 81, 2, 9, 'wood', 4)); S.end();
    S.rect(31, 76, 22, 2, 'tile', 5, { e: 9 }); for (let x = 32; x < 52; x += 3) S.px(x, 76, 'tile', 9, { e: 9 }); S.px(40, 77, 'tile', 10, { e: 9 }); S.px(33, 75, 'paper', 8); S.px(52, 75, 'paper', 8);
    // a hand truck near the eye
    S.lay('front'); S.beg(); S.line(144, 62, 139, 88, 'iron', 6, { w: 1 }); S.hl(134, 88, 8, 'iron', 7); S.ell(140, 88, 2, 2, 'iron', 3); S.end();
    sc.emit({ k: 'dust', x: 121, y: 30, w: 24, h: 50, rate: 1.4, sp: 2, life: 3.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, cy = Math.round(liftY(t)), f = (cy + 17 - LIFT[0]) / (LIFT[1] - LIFT[0]);
    LIFT.forEach((_, i) => { rs.mul[i] = cy < -30 ? 0 : Math.max(0, 1 - Math.abs(f - i)); });
    // cables and the cage
    D.lay('back'); if (cy > -40) { D.vl(116, 3, cy - 3, 'iron', 6); D.vl(126, 3, cy - 3, 'iron', 6); }
    const q = steps(t, 13), carry = q > 0.1 && q < 0.7, glowLoad = Math.floor(t / 13) % 3 === 2;
    D.beg(); D.box(109, cy, 24, 36, 'iron', 5); D.rect(111, cy + 3, 20, 31, 'ink', 1); for (let x = 113; x < 131; x += 4) D.vl(x, cy + 3, 31, 'iron', 6); D.hl(109, cy + 18, 24, 'iron', 7);
    D.rect(120, cy + 4, 3, 2, 'lamp', 10, { e: 255 }); if (carry) { if (glowLoad) { D.rect(114, cy + 26, 10, 8, 'tile', 4); D.hl(114, cy + 29, 10, 'tile', 9, { e: 255 }); D.px(118, cy + 27, 'tile', 10, { e: 255 }); } else { D.box(114, cy + 26, 10, 8, 'wood', 6); D.hl(114, cy + 30, 10, 'wood', 4); } } D.end({ none: 1 });
    // winch: the gear turns while the cage moves
    const dv = liftY(t + 0.05) - liftY(t); st.wa = (st.wa || 0) + dv * 0.25; const wa = st.wa;
    D.beg(); for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y); if (d > 9.4) continue; const th = Math.atan2(y, x) - wa, tooth = Math.cos(th * 10) > 0.2;
      if (d > 7.5 && !tooth) continue; if (d < 2) { D.px(94 + x, 64 + y, 'iron', 2); continue; } if (d < 6 && d > 2.8 && Math.abs(Math.sin((Math.atan2(y, x) - wa) * 2)) > 0.35) continue; D.px(94 + x, 64 + y, 'brass', 6 - (x + y) / 9 * 1.2 + (d > 7.5 ? -0.6 : 0)); } D.end();
    D.line(94, 64, 116, 8, 'iron', 5);
    // the quartermaster writes in his ledger at the blueprint table
    D.lay('back'); const wq = Math.sin(t * 5); worker(D, 43, 90, { skin: ['skin', 6], hair: ['linen', 7], top: ['crimson', 4], bot: ['hair', 2], boot: ['hair', 2], beard: ['linen', 7] }, { aF: 1.3 + wq * 0.12, eF: -0.9, aB: 1.1, eB: -1, lean: 0.4 }, 1);
    // sparkle on the relics and the gold
    if (R() < 0.05) rs.burst('glint', 64 + R() * 20, 64 + R() * 8, 1, { sp: 0, life: 0.5 }); if (R() < 0.04) rs.burst('glint', 8 + R() * 14, FY - 2 - R() * 6, 1, { sp: 0, life: 0.5 });
    // porter: fetches the load from the cage while it rests, carries it to the shelves
    D.lay('mid');
    if (q > 0.22 && q < 0.6) { const k = (q - 0.22) / 0.38, x = Math.round(k < 0.5 ? 118 - k * 2 * 58 : 60 + (k - 0.5) * 2 * 58), dir = k < 0.5 ? -1 : 1, ph = t * 9;
      worker(D, x, FY, 'worker', { lF: Math.sin(ph) * 0.5, lB: -Math.sin(ph) * 0.5, kF: Math.max(0, -Math.sin(ph)) * 0.5, kB: Math.max(0, Math.sin(ph)) * 0.5, aF: 1.2, eF: -1.2, aB: 1, eB: -1, tool: k < 0.5 ? 'box' : null, bob: -Math.abs(Math.cos(ph)) + 0.4 }, dir); }
    else { const w = stroll(t, 62, 98, 7, 0.4, 3); worker(D, w.x, FY, 'worker', w.pose, w.dir); }
  },
});

// what each pixel room shows, in words: replaces the old scene's line in M.ROOM_D (docs/effects.md §R is generated from it)
const D_ = {
  core: '传送门的青光从井口泻下来，光里浮尘飘动，井架上的符文跟着呼吸；吊笼带着灯上下，绞盘的大齿轮跟着转；左边是宝库：货架、金币堆、玻璃柜里三件发光的宝物，军需官在发蓝光的图纸桌前记账，搬运工把吊笼运来的货搬上货架',
  generator: '铜锅炉的炉门透着火光；压力表指针爬到头，安全阀喷一团汽、警示灯把墙照红；飞轮带动活塞，两只齿轮咬合转动，工人拿着工具修管子',
  smithy: '砖造的锻炉里像素火焰翻涌、火星上飘，风箱一压炉火一亮；铁匠抡锤，每一下火花四溅、满屋一亮，砧上的铁由白转橙；火把摇曳，淬火桶不时冒汽',
  hospital: '病人的被子随呼吸起伏，不时飘起绿色十字；心电屏扫出心跳，红十字灯箱发光，顶灯偶尔闪一下，护士拿着夹板查房',
  altar: '紫色光柱落在祭坛上，悬浮水晶转着高光，灵魂顺着光柱上升；地上法阵转动，两侧烛火摇曳；召魂者举杖时水晶一亮、符文四散',
  farm: '两层种植槽在品红补光灯下，叶子被照成紫粉色、随风轻摆、结着果子；槽底滴水，喷头定时喷雾，农夫提着水壶浇地',
  pool: '玻璃池里的水从下往上发光，墙上水纹光影流动，红鱼游来游去；水泵叶片转，水管往池里注水溅起水花，管理员拖地',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
