// ==== mc-pxroom-c.js ====
(function () {
// Pixel rooms, batch c (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1):
// 弩炮室 ballista · 蒸汽加农炮 cannon · 特斯拉线圈 tesla · 奥术尖塔 spire · 军械库 armory.
// The four defence rooms are manned between shots and fire while rs.fireAge is under 0.5 s (raids); each room also has
// an idle moment every ~10 s.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, n1 } = X;
const N = W * H, R = Math.random;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const hh = (a, b) => { let n = (a * 374761393 + b * 668265263) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
const ease = (a) => a * a * (3 - 2 * a);

// ───────── shared bits ─────────
// a small flame (4–7 px) in any glowing ramp, flickering
function flame(D, x, y, s, t, ph, m) {
  m = m || 'fire'; const hh2 = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh2; k++) { const q = k / hh2, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, m, clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// cellular pixel fire (as in the pilot smithy), for the brazier
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : clamp(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 3 ? 7 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = clamp(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < cool ? 1 : 0)); }
  }
  return f;
}
// a shot: true once per firing (rs.fireAge counts from the shot; the frame rate may skip its first moments)
function fired(rs, t) { const fa = rs.fireAge; if (!(fa >= 0 && fa < 0.5)) return false; const at = t - fa; if (rs.st.shotAt != null && Math.abs(rs.st.shotAt - at) < 0.05) return false; rs.st.shotAt = at; return true; }
const fage = (rs) => (rs.fireAge >= 0 ? rs.fireAge : 99);
// paint along a turned axis: origin o, unit axis u; s runs along u, p across it (p > 0 is u turned 90° clockwise);
// fn(x, y, s, p) paints each pixel whose centre falls inside [s0, s1) × [p0, p1)
function rot(o, u, s0, s1, p0, p1, fn) {
  const v = [-u[1], u[0]], cs = [[s0, p0], [s1, p0], [s1, p1], [s0, p1]].map(([s, p]) => [o[0] + u[0] * s + v[0] * p, o[1] + u[1] * s + v[1] * p]);
  const x0 = Math.floor(Math.min(cs[0][0], cs[1][0], cs[2][0], cs[3][0])), x1 = Math.ceil(Math.max(cs[0][0], cs[1][0], cs[2][0], cs[3][0])), y0 = Math.floor(Math.min(cs[0][1], cs[1][1], cs[2][1], cs[3][1])), y1 = Math.ceil(Math.max(cs[0][1], cs[1][1], cs[2][1], cs[3][1]));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - o[0], dy = y + 0.5 - o[1], s = dx * u[0] + dy * u[1], p = dx * v[0] + dy * v[1]; if (s >= s0 && s < s1 && p >= p0 && p < p1) fn(x, y, s, p); }
}
// a thing that only slides: painted once into a scratch layer, then stamped into the frame at an offset each frame
function bakeSpr(fn) {
  const mk = () => ({ z: 14, par: 0, m: new Uint8Array(N), t: new Float32Array(N), nx: new Int8Array(N), ny: new Int8Array(N), e: new Uint8Array(N), d: new Uint8Array(N), o: new Uint16Array(N), f: new Uint8Array(N) });
  const l = mk(), S = new M.PXR_Painter({ wall: l, back: l, mid: l, front: l }, 5); S.lay('mid'); fn(S);
  const out = []; for (let p = 0; p < N; p++) if (l.m[p]) out.push(p % W, (p / W) | 0, l.m[p], l.t[p], l.nx[p] / 127, l.ny[p] / 127, l.e[p]); return out;
}
function stamp(D, spr, dx, dy, add) { add = add || 0; for (let i = 0; i < spr.length; i += 7) D.put(spr[i] + dx, spr[i + 1] + dy, spr[i + 2], spr[i + 6] === 255 ? spr[i + 3] + add : spr[i + 3], spr[i + 4], spr[i + 5], spr[i + 6]); }
// outlines on the animated layers: Pn.end() writes its outline straight into the layer without adding it to the frame's
// painted list, so on the (shared) dyn layers the outline never shows and lingers. ol() clears stale pixels in a box, runs
// fn (which paints and outlines, all in the current layer), then registers what it left so the outline is lit and cleared
function ol(D, x0, y0, x1, y1, fn) {
  const L = D.c; x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W - 1, Math.ceil(x1)); y1 = Math.min(H - 1, Math.ceil(y1));
  if (L.pl) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const p = y * W + x; if (L.m[p] && L.st[p] !== L.stamp) L.m[p] = 0; }
  fn();
  if (L.pl) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const p = y * W + x; if (L.m[p] && L.st[p] !== L.stamp) { L.st[p] = L.stamp; L.pl.push(p); } }
}
// a worker with its outline showing (see ol)
function man(D, x, y, look, pose, dir) { ol(D, x - 16, y - 34, x + 16, y + 2, () => worker(D, x, y, look, pose, dir)); }
// a soft contact shadow on the floor under something standing on it
function foot(S, x0, x1, amt) { const c = S.c; S.lay('wall'); S.shadow([[x0, FY], [x1, FY], [x1 + 3, FY + 3], [x0 - 3, FY + 3]], amt || 1.3); S.shadow([[x0 + 2, FY], [x1 - 2, FY], [x1, FY + 1], [x0, FY + 1]], 0.8); S.c = c; }
// where a worker's front hand ends up (same arithmetic as PXR.worker)
function handAt(x, y, p, dir) {
  const bob = Math.round(p.bob || 0), shY = y - 21 + bob, sx = x + Math.round((p.lean || 0) * 3 * dir), ax = sx + dir, ay = shY + 2, a1 = p.aF || 0, a2 = p.eF || 0, ex = ax + Math.sin(a1) * 5 * dir, ey = ay + Math.cos(a1) * 5;
  return [Math.round(ex + Math.sin(a1 + a2) * 5 * dir), Math.round(ey + Math.cos(a1 + a2) * 5)];
}
// a few stars inside a window that flare and fade
function stars(D, pts, t) { pts.forEach(([x, y], i) => { const a = Math.sin(t * (1.1 + i * 0.37) + i * 2.3); if (a > 0.1) D.px(x, y, 'linen', a > 0.7 ? 10 : 8, { e: 255 }); if (a > 0.85) { D.px(x - 1, y, 'linen', 6, { e: 255 }); D.px(x + 1, y, 'linen', 6, { e: 255 }); D.px(x, y - 1, 'linen', 6, { e: 255 }); D.px(x, y + 1, 'linen', 6, { e: 255 }); } }); }

// ───────── 弩炮室 ballista (medieval · defence, bolt) ─────────
// a giant crossbow on a timber trestle, spanned and loaded, aimed up through an embrasure at the moonlit surface; bolts on a
// wall rack and in a barrel, a brazier, a lantern over the bow, a guard at the windlass. A shot: the arms snap forward, the
// bolt streaks out through the embrasure, the stock kicks, sparks and dust, the lantern swings; then the guard winds the
// string back and a new bolt drops in.
const BU = [2 / Math.sqrt(5), -1 / Math.sqrt(5)], BV = [-BU[1], BU[0]], B0 = [28, 74];   // stock axis (rises 1 in 2), across it, rear end
const bp = (s, p, k) => [B0[0] + BU[0] * (s - (k || 0)) + BV[0] * p, B0[1] + BU[1] * (s - (k || 0)) + BV[1] * p];
const BSTAR = [[121, 22], [118, 29], [127, 31], [130, 25]];
function hbolt(S, x, y, len) {   // a bolt lying on a rack, head to the right
  S.beg(); S.hl(x + 5, y, len - 11, 'paper', 7); S.hl(x + 5, y + 1, len - 11, 'paper', 4);
  S.poly([[x + len - 7, y - 2], [x + len, y + 0.5], [x + len - 7, y + 3]], 'iron', 7); S.hl(x + len - 6, y - 1, 4, 'iron', 10); S.px(x + len - 1, y, 'iron', 11);
  S.poly([[x, y - 3], [x + 7, y - 1], [x + 7, y], [x + 1, y]], 'crimson', 7); S.poly([[x, y + 4], [x + 7, y + 2], [x + 7, y + 1], [x + 1, y + 1]], 'crimson', 4.5); S.px(x - 1, y, 'wood', 5); S.px(x - 1, y + 1, 'wood', 3);
  S.end();
}
const BP_ = -5.5;   // the bolt lies this far above the stock's centre line
function drawBolt(D, s, k, clip) {   // a bolt on (or flying along) the stock's line, tail at s; parts past `clip` are hidden
  const P = BP_, cl = clip || 999; if (s >= cl) return;
  const e = Math.min(s + 46, cl), a = bp(s + 2, P, k), b = bp(e, P, k), a2 = bp(s + 2, P + 1, k), b2 = bp(e, P + 1, k);
  D.line(a2[0], a2[1], b2[0], b2[1], 'paper', 4.5); D.line(a[0], a[1], b[0], b[1], 'paper', 8);
  if (s + 54 < cl) { D.poly([bp(s + 45, P - 2.8, k), bp(s + 54, P + 0.5, k), bp(s + 45, P + 3.6, k)], 'iron', 7); const h1 = bp(s + 47, P - 1.2, k), h2 = bp(s + 50, P - 0.4, k); D.line(h1[0], h1[1], h2[0], h2[1], 'iron', 10); const tp = bp(s + 53, P + 0.4, k); D.px(tp[0], tp[1], 'iron', 11); }
  D.poly([bp(s, P - 4, k), bp(s + 8, P - 1, k), bp(s + 8, P, k), bp(s, P, k)], 'crimson', 7.5);
  D.poly([bp(s, P + 1, k), bp(s + 8, P + 1, k), bp(s + 8, P + 2, k), bp(s, P + 4.5, k)], 'crimson', 4.5);
}
// a light beam without the per-pixel cost of sc.shaft: its haze is worked out once and blended over the finished frame
// (post), and the wall under it is lifted in paint
function beam(o) {
  const m = [], rgb = [parseInt(o.c.slice(1, 3), 16), parseInt(o.c.slice(3, 5), 16), parseInt(o.c.slice(5, 7), 16)];
  for (let y = o.y0; y < o.y1; y++) { const k = (y - o.y0) / (o.y1 - o.y0), hw = o.w0 + (o.w1 - o.w0) * k, cx = o.x + (o.dx || 0) * k;
    for (let x = Math.max(3, Math.floor(cx - hw)); x <= Math.min(W - 4, Math.ceil(cx + hw)); x++) { const u = Math.abs(x + 0.5 - cx) / hw; if (u >= 1) continue; const v = (1 - u * u) * (o.fade ? 1 - k * o.fade : 1) * (o.fin ? Math.min(1, (y - o.y0 + 1) / o.fin) : 1); if (v > 0.05) m.push(y * W + x, v); } }
  return { m, rgb, a: o.a || 0.4 };
}
function beamLift(S, b, amt, lays) { lays.forEach(l => { S.lay(l); for (let i = 0; i < b.m.length; i += 2) { const p = b.m[i]; S.tone(p % W, (p / W) | 0, b.m[i + 1] * amt); } }); }
// skip(p): pixels the haze must leave alone (a fire the beam passes over stays its own colour)
function drawBeam(out, b, f, skip) { for (let i = 0; i < b.m.length; i += 2) { const aq = Math.min(0.45, Math.floor(b.m[i + 1] * b.a * f * 8) / 8); if (aq > 0 && !(skip && skip(b.m[i]))) X.blendPx(out, b.m[i], b.rgb, aq); } }
const BBEAM = beam({ x: 121, y0: 38, y1: 90, w0: 4, w1: 11, dx: -36, fade: 0.35, c: '#b8c4ff', a: 0.42 });
X.def('ballista', {
  amb: [0.27, 0.25],
  paint(S, sc) {
    X.shell(S, sc, 'medieval');
    sc.light({ x: 80, y: 23, z: 20, r: 84, i: 0.95, c: '#ffc070', fl: 'candle', tint: 0.4 });                 // 0 lantern over the bow
    sc.light({ x: 110, y: 56, z: 18, r: 74, i: 0.95, c: '#ff8a30', fl: 'fire', ph: 2, tint: 0.5 });          // 1 brazier
    sc.light({ x: 124, y: 30, z: 4, r: 104, i: 0.6, c: '#a8b8ff', tint: 0.4 });                              // 2 moonlight through the embrasure
    sc.light({ x: 88, y: 42, z: 18, r: 56, i: 1, c: '#ffe0a0', tint: 0.4, bake: false });                    // 3 the release (dark until a shot)
    sc.light({ x: 20, y: 40, z: 16, r: 52, i: 0.45, c: '#ffb070', fl: 'candle', ph: 4, tint: 0.3 });        // 4 the lantern's spill on the rack
    // embrasure: a round-headed opening in dressed stone, the night and the grass of the surface beyond
    S.lay('wall');
    const inO = (x, y) => (y >= 24 && y < 41 && x >= 116 && x < 132) || (y < 24 && (x + 0.5 - 124) ** 2 + (y + 0.5 - 24) ** 2 < 64);
    const inF = (x, y) => (y >= 24 && y < 44 && x >= 112 && x < 136) || (y < 24 && (x + 0.5 - 124) ** 2 + (y + 0.5 - 24) ** 2 < 144);
    for (let y = 10; y < 45; y++) for (let x = 110; x < 138; x++) { if (!inF(x, y) || inO(x, y)) continue; const a = Math.atan2(y + 0.5 - 24, x + 0.5 - 124), seam = y < 24 ? Math.abs(((a + Math.PI) / (Math.PI / 5)) % 1 - 0.5) > 0.44 : (y - 24) % 6 === 5 || (y >= 41);
      S.px(x, y, 'stone', seam ? 3 : 6 + ((x + y) % 7 === 0 ? -1 : 0) + (y < 24 && a < -1.6 ? 0.6 : 0), { n: y < 24 ? [Math.cos(a) * 0.4, Math.sin(a) * 0.4] : [0, 0] }); }
    S.rect(112, 41, 24, 3, 'stone', 7, { n: [0, -0.8] }); S.hl(112, 43, 24, 'stone', 3);
    for (let y = 14; y < 41; y++) for (let x = 116; x < 132; x++) { if (!inO(x, y)) continue; const rv = x < 118 || y > 38; S.px(x, y, rv ? 'stone' : 'night', rv ? (x < 117 || y > 39 ? 2.5 : 3.5) : 1.4 + (y - 14) / 26 * 2, rv ? {} : { e: 255 }); }
    for (let x = 118; x < 132; x++) { const g = 35 + Math.round(Math.sin(x * 0.8) * 0.8 + Math.sin(x * 0.31) * 0.8); for (let y = g; y < 39; y++) S.px(x, y, 'night', 0.6, { e: 255 }); if (x % 3 === 0) S.px(x, g - 1, 'leaf', 2, { e: 255 }); if (x % 5 === 1) S.px(x, g - 2, 'leaf', 1.5, { e: 255 }); }
    S.ell(128.5, 20.5, 2.6, 2.6, 'bone', 9, { e: 255 }); S.px(127, 19, 'bone', 10, { e: 255 }); S.px(129, 21, 'bone', 7, { e: 255 });
    // a hook in the beam for the lantern
    S.beg(); S.rect(79, 9, 3, 2, 'iron', 6); S.end();
    // bolt rack on the left wall: two posts, pegs, four bolts
    S.lay('back');
    [7, 38].forEach(x => { S.beg(); S.box(x, 14, 4, 34, 'wood', 4.5); S.end(); });
    [18, 25, 32, 39].forEach(y => { [8, 39].forEach(x => { S.px(x + 1, y + 2, 'iron', 7); S.px(x + 2, y + 2, 'iron', 4); }); hbolt(S, 5, y, 42); });
    // barrel of bolts, fletching up
    [[6, 58], [8, 55], [10, 60], [12, 56]].forEach(([x, y], i) => { S.beg(); S.vl(x, y + 4, 78 - y - 4, 'paper', 6 - (i % 2)); S.rect(x - 1, y, 1, 5, 'crimson', 6.5); S.rect(x + 1, y, 1, 5, 'crimson', 4); S.px(x, y, 'wood', 5); S.end(); });
    S.beg(); S.cyl(4, 76, 12, 14, 'wood', 5, { rim: 2.5 }); S.hcyl(4, 78, 12, 2, 'iron', 5); S.hcyl(4, 86, 12, 2, 'iron', 4); S.ell(10, 76, 6, 1.5, 'ink', 1); S.hl(5, 75, 10, 'wood', 7); S.end();
    // brazier on three legs (fire is animated), a bed of coals
    S.beg(); S.line(106, 71, 102, 89, 'iron', 4); S.line(114, 71, 118, 89, 'iron', 3); S.line(110, 72, 110, 89, 'iron', 5); S.px(101, 89, 'iron', 5); S.px(119, 89, 'iron', 4); S.end();
    S.beg(); S.poly([[101, 64], [120, 64], [116, 72], [105, 72]], 'iron', 4); S.hl(101, 64, 19, 'iron', 7); S.hl(102, 65, 17, 'iron', 2.5); [106, 110, 114].forEach(x => S.px(x, 68, 'iron', 6)); S.end();
    for (let x = 103; x < 118; x++) { S.px(x, 63, 'fire', 5 + (x % 3), { e: 2 }); if (x % 2) S.px(x, 62, 'ink', 2); }
    // the trestle: sill, splayed legs, crossbar, the iron fork at the pivot, a post under the windlass
    S.lay('mid');
    S.beg(); S.box(24, 86, 54, 4, 'wood', 4, { top: 1 }); [28, 46, 64].forEach(x => TX.rivet(S, x, 87, 'iron', 5)); S.end();
    S.beg(); S.line(53, 67, 41, 85, 'wood', 5.5, { w: 3 }); S.line(58, 67, 69, 85, 'wood', 4, { w: 3 }); S.hl(45, 77, 25, 'wood', 6.5); S.hl(45, 78, 25, 'wood', 3.5); TX.rivet(S, 47, 77, 'iron', 6); TX.rivet(S, 66, 77, 'iron', 6); S.end();
    S.beg(); S.box(51, 63, 10, 6, 'iron', 6); TX.rivet(S, 55, 65, 'iron', 6); S.end();
    S.beg(); S.box(29, 78, 6, 8, 'wood', 5); S.end();
    // crate of spare bolts, near the eye
    S.lay('front');
    [[131, 66, 0.35], [135, 64, 0.2], [139, 67, 0.45]].forEach(([x, y, a]) => { S.beg(); S.line(x, y, x - 5 * a, 80, 'wood', 7); S.rect(x - 1, y - 3, 1, 4, 'crimson', 6); S.rect(x + 1, y - 3, 1, 4, 'crimson', 4); S.end(); });
    S.beg(); S.box(126, 79, 19, 11, 'wood', 5, { top: 2 }); S.hl(126, 84, 19, 'wood', 3); S.vl(130, 79, 11, 'iron', 5); S.vl(141, 79, 11, 'iron', 5); S.px(135, 83, 'brass', 7); S.end();
    foot(S, 24, 78); foot(S, 4, 16); foot(S, 101, 120, 1); foot(S, 126, 145);
    beamLift(S, BBEAM, 1.1, ['wall', 'back']);
    sc.emit({ k: 'ember', x: 110, y: 56, w: 9, rate: 3, sp: 6, ang: 0, spread: 0.7, life: 2 });
    sc.emit({ k: 'dust', x: 100, y: 62, w: 34, h: 30, rate: 1.4, sp: 2, life: 4 });
  },
  post(out, t, s, o, I) { const fm = s.st.fm; drawBeam(out, BBEAM, clamp(I[2] / 0.6, 0, 1.2), fm ? (p) => { const x = p % W - 103, y = ((p / W) | 0) - 51; return x >= 0 && x < 15 && y >= 0 && y < 12 && fm[y * 15 + x] === 1; } : null); },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 10); rs.mul[3] = 0;
    // the shot and the reload: d = how far the string is drawn (1 spanned, 0 loose), claw position, recoil
    let d = 1, claw = 18, vib = 0, kick = 0, loaded = true, wa = 0.4;
    if (fa < 1.05) {
      d = fa < 0.05 ? 1 - fa / 0.05 : fa < 0.55 ? 0 : Math.min(1, (fa - 0.55) / 0.45);
      vib = fa > 0.03 && fa < 0.5 ? Math.sin(fa * 62) * 2.2 * (1 - (fa - 0.03) / 0.47) : 0;
      claw = fa < 0.4 ? 18 : fa < 0.55 ? 18 + (fa - 0.4) / 0.15 * 35.5 : 53.5 - d * 35.5;
      kick = fa < 0.05 ? fa / 0.05 * 3 : fa < 0.5 ? 3 * (1 - ease((fa - 0.05) / 0.45)) : 0;
      loaded = fa >= 0.98; if (fa > 0.55) wa = 0.4 + (fa - 0.55) / 0.43 * Math.PI * 5;
    } else if (q > 0.6 && q < 0.8) wa = 0.4 + (q - 0.6) / 0.2 * Math.PI * 3;   // the moment: the guard gives the windlass a few more turns
    if (fired(rs, t)) { const m = bp(66, -4); rs.flash(3, 1.7); rs.flash(0, 0.3); rs.burst('spark', m[0], m[1], 14, { sp: 46, ang: 1.1, spread: 1.6, life: 0.7 }); rs.burst('dust', 50, FY - 3, 10, { sp: 8, ang: 0, spread: 2.5, life: 1.2, w: 36 }); }
    // the moment: the guard gives the windlass a few hard turns; the arms creak further back, grit sifts down off the beam
    const creak = q > 0.6 && q < 0.8 && fa > 1.05 ? 1.6 * Math.sin((q - 0.6) / 0.2 * Math.PI) : 0, sweep = -1.5 + 11.5 * d + creak, k0 = kick;
    if (creak > 0.2 && R() < 0.3) rs.burst('dust', 58 + R() * 30, 12, 1, { sp: 3, ang: Math.PI, spread: 0.6, life: 2.2 });
    D.lay('mid');
    // arms: thick at the root, tapering to iron-capped tips; the lower one sits behind the stock
    const arm = (sg, tn) => { let prev = bp(52, sg * 6, k0); const pts = [prev]; for (let k = 1; k <= 11; k++) { const f = k / 11, p = bp(52 - sweep * f * f, sg * (6 + 22 * f), k0); D.line(prev[0], prev[1], p[0], p[1], 'wood', tn - f * 0.8, { w: f < 0.4 ? 4 : f < 0.75 ? 3 : 2 }); pts.push(p); prev = p; }
      for (let k = 1; k < 10; k++) D.px(pts[k][0], pts[k][1], 'wood', tn + 2);
      [2, 7].forEach(k => { const a = pts[k]; D.rect(a[0], a[1], 3, 2, 'iron', sg < 0 ? 7.5 : 5.5); D.px(a[0], a[1], 'iron', 9.5); });
      D.rect(Math.round(prev[0]) - 1, Math.round(prev[1]) - 1, 3, 3, 'iron', 7); D.px(prev[0] - 1, prev[1] - 1, 'iron', 9); return prev; };
    const tipS = 52 - sweep, relaxed = d < 0.02, str = (a, b) => D.line(a[0], a[1], b[0], b[1], 'paper', 6.5);
    const cp = bp(claw, -4, k0), mid = bp(tipS + vib, 0, k0);
    ol(D, 8, 20, 104, 90, () => {
    D.beg();
    const lo = arm(1, 5.2); str(lo, relaxed ? mid : cp);
    // stock: lit top face, body, dark underside, iron bands
    rot(bp(0, 0, k0), BU, -3, 70, -3.6, 3.6, (x, y, s, p) => { const band = (s > 6 && s < 8.5) || (s > 31 && s < 33.5) || s > 66; const tn = p < -2.3 ? 7.2 : p > 2.3 ? 3.2 : p < 0 ? 5.6 : 4.8;
      D.px(x, y, band ? 'iron' : 'wood', band ? tn + 0.8 : tn, { n: [0, p < -2.3 ? -0.8 : p > 2.3 ? 0.7 : 0] }); });
    // bow frame: a heavy iron-strapped timber box the arms come out of
    rot(bp(0, 0, k0), BU, 47, 57, -10, 10, (x, y, s, p) => { const ap = Math.abs(p), strap = (s < 48.6 || s > 55.4 || ap > 8.6), bolt = strap && Math.abs(ap - 5) < 0.6 && s > 55.4;
      if (bolt) D.px(x, y, 'iron', 10); else if (strap) D.px(x, y, 'iron', (p < -8.6 || s < 48.6 ? 8 : 5.5) + (p < 0 ? 0.5 : -0.5)); else D.px(x, y, 'wood', (p < 0 ? 4.6 : 3.4) + (((Math.round(s * 0.7 + p * 1.4) % 4) + 4) % 4 === 0 ? -1 : 0)); });
    D.end();
    D.beg();
    if (loaded) drawBolt(D, 18, k0);
    const up = arm(-1, 6.8); str(up, relaxed ? mid : cp);
    // claw on its slider, windlass drum with four spokes
    D.rect(Math.round(cp[0]) - 1, Math.round(cp[1]) - 1, 3, 3, 'iron', 6); D.px(cp[0] + 1, cp[1] - 1, 'iron', 9);
    const dc = bp(5, 0.5, k0); D.ell(dc[0], dc[1], 4.6, 4.6, 'wood', 5, { dome: 1 }); D.ell(dc[0], dc[1], 4.6, 4.6, 'iron', 5, { ring: 1 }); D.ell(dc[0], dc[1], 1.3, 1.3, 'iron', 8);
    for (let k = 0; k < 4; k++) { const a = wa + k * Math.PI / 2; D.line(dc[0] + Math.cos(a) * 3, dc[1] + Math.sin(a) * 3, dc[0] + Math.cos(a) * 8, dc[1] + Math.sin(a) * 8, 'wood', 6.5); D.px(dc[0] + Math.cos(a) * 8, dc[1] + Math.sin(a) * 8, 'wood', 8); }
    D.end();
    });
    // the bolt in flight: out along the stock's line and through the embrasure, a pale streak behind it
    if (fa < 0.22) { const s = 18 + fa * 460; drawBolt(D, s, 0, 102); const a = bp(Math.max(18, s - 22), BP_), b = bp(Math.min(s, 102), BP_); if (s < 102) D.line(a[0], a[1], b[0], b[1], 'linen', 8, { e: 255 }); }
    // the guard at the windlass: hands on the spokes, winding when there is winding to do
    const cr = Math.sin(wa), cc = Math.cos(wa), wind = (fa > 0.55 && fa < 0.98) || creak > 0;
    const pose = fa < 0.2 ? { aF: 2.1, eF: -0.6, aB: 1.6, eB: -0.3, lean: -0.3, lF: 0.2, lB: -0.25 } : { aF: 1.3 + (wind ? 0.3 * cr : 0), eF: -0.25 - (wind ? 0.35 * cc : 0), aB: 1.1 + (wind ? 0.3 * cc : 0), eB: -0.5, lF: 0.3, lB: -0.2, lean: wind ? 0.25 + 0.1 * cr : 0.1, bob: wind ? 0 : Math.round(Math.sin(t * 1.3) * 0.5) };
    man(D, 19, FY, { skin: ['skin', 6], hair: ['hair', 3], top: ['crimson', 6], bot: ['leather', 4], boot: ['hair', 2], hood: ['iron', 7] }, pose, 1);
    if (q > 0.8 && !st.gl && fa > 1.2) { st.gl = 1; const h = bp(70, BP_); rs.burst('glint', h[0], h[1], 2, { sp: 4, life: 0.6 }); rs.burst('dust', 32, 70, 3, { sp: 5, life: 1.5 }); } if (q < 0.5) st.gl = 0;
    // the lantern over the bow, swinging a little, harder after a shot
    D.lay('front'); const sw = 0.07 * Math.sin(t * 1.25) + (fa < 4 ? 0.3 * Math.exp(-fa * 1.3) * Math.sin(fa * 6) : 0), lx = 80 + Math.sin(sw) * 12, ly = 11 + Math.cos(sw) * 12;
    ol(D, 66, 9, 94, 34, () => { D.beg(); for (let k = 0; k < 5; k++) { const f = k / 5; D.px(80 + (lx - 80) * f + 0.5, 11 + (ly - 11) * f, 'iron', k % 2 ? 6 : 4); }
    D.rect(lx - 2, ly, 5, 1, 'iron', 7); D.rect(lx - 3, ly + 1, 7, 7, 'iron', 4); D.rect(lx - 2, ly + 2, 5, 5, 'lamp', 8, { e: 255 }); D.vl(lx, ly + 2, 5, 'iron', 4); D.rect(lx - 2, ly + 8, 5, 1, 'iron', 6); D.end({ lit: 1 }); });
    D.px(lx - 1, ly + 4, 'lamp', 10 + (n1(t * 9) > 0 ? 1 : 0), { e: 255 }); D.px(lx + 1, ly + 4, 'lamp', 10, { e: 255 });
    // brazier fire (a flame shape, not a box), the stars through the embrasure
    D.lay('back'); const f = fireSim(st, 15, 12, t, 0.85, 0.5), fm = st.fm || (st.fm = new Uint8Array(180)); fm.fill(0);   // fm: where the fire is (the moonbeam haze skips it)
    for (let y = 0; y < 12; y++) for (let x = 0; x < 15; x++) { const v = f[y * 15 + x]; if (v < 4 || Math.abs(x - 7) > 1.5 + y * 0.55) continue; D.px(103 + x, 51 + y, 'fire', clamp(v / 36 * 11.5, 1, 11), { e: 255 }); fm[y * 15 + x] = 1; }
    stars(D, BSTAR, t);
  },
});

// ───────── 蒸汽加农炮 steam cannon (steam · defence, shell) ─────────
// a long iron barrel with brass bands on a riveted carriage, aimed up through a brass-rimmed port. On the left the shell
// room: black round shells on an iron rack, powder kegs, and a chain hoist whose bucket rides up out of a hatch in the floor
// (the magazine's lamplight comes up through it), its steam motor puffing and its amber lamp turning while it runs. The
// moment: the gunner turns to the hoist, lifts the shell out of the bucket and pushes it into the breech; the seal hisses.
// A shot: muzzle flash in the port, the barrel kicks back, steam bursts from the breech, the hook swings.
const CU = [2 / Math.sqrt(5), -1 / Math.sqrt(5)], CV = [-CU[1], CU[0]], C0 = [82, 60];
const cp_ = (s, p) => [C0[0] + CU[0] * s + CV[0] * p, C0[1] + CU[1] * s + CV[1] * p];
const crad = (s) => (s < -14 ? 8 : s >= 45 ? 5.5 : 6.5 - (s + 14) / 59 * 2);
let CSPR = null;
function cannonSpr() {
  return CSPR || (CSPR = bakeSpr((S) => {
    S.beg();
    rot(C0, CU, -22, 52, -10, 10, (x, y, s, p) => {
      let r = crad(s), m = s < -14 ? 'iron' : s >= 45 ? 'brass' : 'iron', t0 = s < -14 ? 4.4 : s >= 45 ? 6.5 : 5.6;
      if ([-13, -1, 15, 31].some(b => s >= b && s < b + 2.3)) { r += 1; m = 'brass'; t0 = 6.5; }
      if (Math.abs(p) > r) return; const q = p / r;
      let tn = t0 + (q < -0.6 ? 2.3 : q < -0.15 ? 1 : q < 0.45 ? 0 : -1.5);
      if (s < -21 || s > 50.5) tn -= 1.6;
      S.px(x, y, m, tn, { n: [CV[0] * q * 0.85, CV[1] * q * 0.85] });
    });
    for (let s = -20; s < -14; s += 3) [-5, 5].forEach(p => { const a = cp_(s, p); S.px(a[0], a[1], 'brass', 8); });
    for (let s = -12; s < 34; s += 0.5) { const a = cp_(s, -crad(s) - 1.6); S.px(a[0], a[1], 'brass', 7.5, { n: [0, -0.6] }); }
    [2, 20].forEach(s => { const a = cp_(s, -crad(s) - 0.8); S.px(a[0], a[1], 'iron', 3); });
    const hw = cp_(-23, 0); S.ell(hw[0], hw[1], 3.5, 3.5, 'crimson', 6, { ring: 1 }); S.line(hw[0] - 3, hw[1], hw[0] + 3, hw[1], 'crimson', 5); S.line(hw[0], hw[1] - 3, hw[0], hw[1] + 3, 'crimson', 5); S.px(hw[0], hw[1], 'brass', 8);
    S.end();
  }));
}
// a round black shell: dark iron, a lit crown, a brass fuse plug on top
function ball(S, cx, cy, tn) { S.beg(); S.ell(cx, cy, 3, 3, 'iron', tn == null ? 2.6 : tn, { dome: 1 }); S.px(cx - 1.5, cy - 1.5, 'iron', 7.5); S.px(cx - 0.5, cy - 1.5, 'iron', 5); S.px(cx - 1.5, cy - 0.5, 'iron', 5); S.px(cx - 0.5, cy - 3.5, 'brass', 7); S.end(); }
const HX0 = 27, HX1 = 50, HB = 39;   // hoist frame posts, bucket centre
function hoistY(q) { return q < 0.22 ? 99 - 33 * ease(q / 0.22) : q < 0.66 ? 66 : q < 0.9 ? 66 + 33 * ease((q - 0.66) / 0.24) : 99; }
X.def('cannon', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'steam');
    sc.light({ x: 39, y: 96, z: 10, r: 44, i: 0.55, c: '#ffa850', fl: 'fire', ph: 1.4, tint: 0.55 });           // 0 the magazine lamps below, up through the hatch
    sc.light({ x: 72, y: 17, z: 16, r: 96, i: 0.8, c: '#ffd8a0', fl: 'candle', ph: 2, tint: 0.25 });         // 1 caged bulb
    sc.light({ x: 104, y: 22, z: 6, r: 34, i: 0.6, c: '#ff3a30', fl: 'pulse', amp: 0.5, sp: 2.2, tint: 0.6 }); // 2 warning lamp
    sc.light({ x: 124, y: 38, z: 12, r: 112, i: 1, c: '#ffc070', tint: 0.5, bake: false });                   // 3 muzzle flash (dark until a shot)
    sc.light({ x: 129, y: 34, z: 3, r: 46, i: 0.45, c: '#a8b8ff', tint: 0.4 });                              // 4 night through the port
    sc.light({ x: 24, y: 13, z: 8, r: 34, i: 0.7, c: '#ffb030', tint: 0.6, bake: false });                    // 5 hoist lamp (turns while the hoist runs)
    // the port: a brass ring with bolts, the sky beyond
    S.lay('wall');
    for (let y = 22; y < 51; y++) for (let x = 115; x < 144; x++) { const d = Math.hypot(x + 0.5 - 129, y + 0.5 - 36), a = Math.atan2(y + 0.5 - 36, x + 0.5 - 129);
      if (d < 10) S.px(x, y, 'night', 1.3 + (y - 26) / 20 * 2.2, { e: 255 });
      else if (d < 11.2) S.px(x, y, 'iron', ((a * 8 / Math.PI) % 1 + 1) % 1 < 0.5 ? 2.5 : 4);
      else if (d < 14) S.px(x, y, 'brass', 6 + (d < 12.2 ? -1.5 : 0) - Math.sin(a) * 0.8 + Math.cos(a) * 0.3, { n: [Math.cos(a) * 0.5, Math.sin(a) * 0.5] }); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; TX.rivet(S, 129 + Math.cos(a) * 12.5 - 0.5, 36 + Math.sin(a) * 12.5 - 0.5, 'brass', 6); }
    [[124, 30], [134, 29], [131, 42], [122, 39]].forEach(([x, y], i) => S.px(x, y, 'linen', i % 2 ? 8 : 6, { e: 255 }));
    // the hatch in the floor: an iron coaming, the magazine's lamplight coming up out of the pit
    for (let y = 90; y < 97; y++) for (let x = HX0 + 1; x < HX1 + 1; x++) { const rim = x < HX0 + 3 || x > HX1 - 2 || y === 90 || y >= 95;
      if (rim) S.px(x, y, 'iron', y >= 95 ? (y === 95 ? 8 : 4) : x < HX0 + 3 ? 6.5 : 4.5, { n: [0, -0.8] });
      else S.px(x, y, 'lamp', y === 91 ? 1.5 : y === 92 ? 2.6 : 3.4 - (Math.abs(x - HB) > 7 ? 0.8 : 0), { e: 1 }); }
    for (let x = HX0 + 4; x < HX1 - 2; x += 3) S.px(x, 93, 'iron', 3);   // a ladder rung on the far side of the pit
    for (let x = HX0 + 2; x < HX1; x += 5) TX.rivet(S, x, 95, 'iron', 6);
    S.lay('back');
    // shell rack against the wall: two shelves of black round shells
    S.beg(); S.box(3, 34, 3, 56, 'iron', 5.5); S.box(22, 34, 3, 56, 'iron', 4.5); [48, 66].forEach(y => { S.box(3, y, 22, 3, 'iron', 6.5, { top: 1 }); S.hl(5, y - 2, 18, 'iron', 4); }); S.box(2, 32, 24, 3, 'iron', 6); S.end();
    [48, 66].forEach(y => [9, 14.5, 20].forEach((x, i) => ball(S, x, y - 3.5, 2.4 + (i % 2) * 0.4)));
    // the hoist: two posts, a head beam, cross braces, the catches the bucket rests on at the top, the steam motor, the hoist lamp
    S.beg(); S.box(HX0, 12, 3, 78, 'iron', 5.5); S.box(HX1 - 2, 12, 3, 78, 'iron', 4.5); S.box(HX0 - 2, 9, HX1 - HX0 + 5, 4, 'iron', 6.5, { top: 1 });
    S.line(HX0 + 3, 26, HX1 - 3, 40, 'iron', 4); S.line(HX1 - 3, 26, HX0 + 3, 40, 'iron', 3.5); S.hl(HX0 + 3, 40, HX1 - HX0 - 5, 'iron', 6);
    [20, 50].forEach(y => { TX.rivet(S, HX0 + 1, y, 'iron', 6); TX.rivet(S, HX1 - 1, y, 'iron', 5); }); S.box(HX0 + 3, 75, 4, 2, 'iron', 7); S.box(HX1 - 6, 75, 4, 2, 'iron', 5.5); S.end();
    S.beg(); S.box(40, 12, 9, 9, 'iron', 6, { top: 1 }); S.hl(40, 15, 9, 'brass', 7); S.rect(42, 17, 5, 2, 'ink', 1.5); S.cyl(45, 4, 2, 8, 'brass', 6); S.px(45, 4, 'brass', 8); S.end();
    S.beg(); S.box(21, 11, 6, 3, 'iron', 5); S.end();
    // the steam line: down from the ceiling run to where the hose takes over; a stop valve
    S.beg(); S.cyl(56, 10, 4, 43, 'brass', 5, { rim: 1.5 }); S.box(55, 52, 6, 2, 'iron', 6); S.hcyl(55, 30, 6, 2, 'brass', 7); S.ell(58, 38, 3, 3, 'crimson', 6, { ring: 1 }); S.px(58, 38, 'brass', 8); S.end();
    // warning lamp housing, the caged bulb on its drop
    S.beg(); S.box(100, 18, 9, 3, 'iron', 5); S.end();
    S.beg(); S.vl(72, 9, 5, 'iron', 4); S.rect(69, 14, 7, 2, 'iron', 6); S.end();
    // carriage: a turntable with a brass tooth ring, riveted cheek plates with lit edges, a toothed elevation arc
    S.lay('mid');
    S.beg(); S.box(56, 84, 58, 6, 'iron', 5.5, { top: 1 }); for (let x = 57; x < 113; x += 3) { S.rect(x, 82, 2, 2, 'brass', 6.5); S.px(x, 82, 'brass', 8.5); } S.hl(56, 84, 58, 'brass', 7); for (let x = 60; x < 112; x += 8) TX.rivet(S, x, 87, 'iron', 6); S.end();
    S.beg(); S.poly([[67, 83], [101, 83], [96, 59], [81, 53], [72, 61]], 'iron', 6); S.poly([[73, 80], [96, 80], [92, 62], [81, 57], [76, 64]], 'iron', 4.5);
    S.line(67, 82, 72, 61, 'iron', 8); S.line(72, 61, 81, 53, 'iron', 8.5); S.line(81, 53, 96, 59, 'iron', 7.5); S.line(96, 59, 101, 83, 'iron', 4);
    [[70, 76], [71, 70], [74, 62], [79, 57], [86, 56], [93, 60], [96, 68], [98, 76]].forEach(([x, y]) => TX.rivet(S, x, y, 'iron', 6.5)); S.end();
    S.beg(); for (let a = 1.75; a < 2.9; a += 0.035) { const x = 82 + Math.cos(a) * 15, y = 60 + Math.sin(a) * 15; S.px(x, y, 'brass', 6); S.px(82 + Math.cos(a) * 14, 60 + Math.sin(a) * 14, 'brass', 4); if (Math.floor(a / 0.14) % 2) S.px(82 + Math.cos(a) * 16, 60 + Math.sin(a) * 16, 'brass', 7.5); } S.end();
    S.beg(); S.ell(82, 60, 3.5, 3.5, 'brass', 7, { dome: 1 }); S.px(82, 60, 'iron', 3); S.end();
    S.beg(); S.ell(94, 71, 4.5, 4.5, 'brass', 7, { ring: 1 }); S.line(90, 71, 98, 71, 'brass', 5); S.line(94, 67, 94, 75, 'brass', 5); S.px(94, 71, 'iron', 8); S.px(98, 68, 'crimson', 7); S.end();
    // near the eye: powder kegs on the left, a pyramid of shells in a tray on the right
    S.lay('front');
    const keg = (x, y, w, h, tn) => { S.beg(); const cx = x + w / 2, hw = (k) => { const v = (k + 0.5) / h * 2 - 1; return w / 2 * (0.74 + 0.26 * (1 - v * v)); };
      for (let k = 0; k < h; k++) { const r = hw(k); for (let i = Math.round(cx - r); i < Math.round(cx + r); i++) { const u = (i + 0.5 - cx) / r, stave = ((i - x) % 3) === 2; S.px(i, y + k, 'wood', tn + (u < -0.55 ? 1.5 : u < -0.1 ? 0.7 : u > 0.55 ? -1.5 : 0) - (stave ? 0.9 : 0), { n: [u * 0.9, 0] }); } }
      [2, h - 3].forEach(k => { const r = hw(k); S.hl(Math.round(cx - r), y + k, Math.round(r * 2), 'iron', 3.5); S.px(Math.round(cx - r) + 1, y + k, 'iron', 7.5); S.px(Math.round(cx - r) + 2, y + k, 'iron', 6); });
      S.ell(cx - 0.5, y, hw(0) - 0.4, 1.2, 'wood', tn + 2.4, { n: [0, -0.9] }); S.px(Math.round(cx) + 1, y, 'wood', tn - 1); S.rect(Math.round(cx) - 2, y + Math.round(h / 2) - 1, 3, 3, 'crimson', 6); S.px(Math.round(cx) - 1, y + Math.round(h / 2) - 2, 'crimson', 7.5); S.end(); };
    keg(3, 76, 12, 14, 5);
    // a keg on its side: round end with two hoops and a bung, its belly running back
    S.beg(); S.hcyl(18, 82, 8, 8, 'wood', 4.4, { rim: 2 }); S.vl(21, 82, 8, 'iron', 3.5); S.ell(17.5, 85.5, 4.6, 4.6, 'wood', 5.6); S.ell(17.5, 85.5, 4.6, 4.6, 'iron', 4.2, { ring: 0.9 }); S.ell(17.5, 85.5, 3, 3, 'wood', 6.4, { ring: 0.8 }); S.px(17, 85, 'ink', 1.5); S.px(15, 83, 'wood', 8); S.end();
    S.beg(); S.line(13, 75, 18, 68, 'brass', 7); S.rect(11, 75, 3, 2, 'brass', 5); S.px(11, 75, 'brass', 8); S.end();   // a powder scoop stuck in the keg
    S.beg(); S.box(122, 86, 24, 4, 'wood', 5, { top: 1 }); S.hl(123, 88, 22, 'wood', 3); S.end();
    [[126, 82], [132.5, 82], [139, 82], [129.3, 76.5], [135.8, 76.5], [132.5, 71]].forEach(([x, y], i) => ball(S, x, y, 2.3 + (i % 3) * 0.3));
    foot(S, 2, 25); foot(S, HX0, HX1 + 2, 0.8); foot(S, 56, 114); foot(S, 122, 146);
    sc.emit({ k: 'steam', x: 61, y: 30, rate: 0.4, sp: 4, ang: 1, spread: 0.6, life: 1.2 });   // the steam line's joint weeps a little
  },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 12); rs.mul[3] = 0;
    if (fired(rs, t)) { const m = cp_(55, 0), b = cp_(-17, -8); rs.flash(3, 2.4); rs.flash(0, 0.3); rs.flash(2, 0.6); st.swing = 1;
      rs.burst('steam', m[0], m[1], 12, { sp: 20, ang: 1.1, spread: 1, life: 1.5 }); rs.burst('spark', m[0], m[1], 12, { sp: 55, ang: 1.1, spread: 1, life: 0.6 }); rs.burst('ember', m[0], m[1], 5, { sp: 18, ang: 1.1, spread: 1.4, life: 1.2 });
      rs.burst('steam', b[0], b[1], 6, { sp: 14, ang: -0.5, spread: 0.7, life: 1.1 }); const c = cp_(-17, 8); rs.burst('steam', c[0], c[1], 5, { sp: 12, ang: 3.6, spread: 0.7, life: 1 }); }
    const kick = fa < 0.05 ? fa / 0.05 * 5 : fa < 0.9 ? 5 * Math.pow(1 - (fa - 0.05) / 0.85, 2) : 0, kx = -Math.round(CU[0] * kick), ky = -Math.round(CU[1] * kick);
    // the hoist: the bucket rides up out of the hatch with a shell, waits, goes down empty; the chain runs over the sprocket
    const by = Math.round(hoistY(q)), moving = (q < 0.22) || (q > 0.66 && q < 0.9), full = q < 0.63;
    D.lay('back');
    ol(D, HX0 - 1, 9, HX1 + 1, 99, () => {
      D.beg();
      // sprocket on the head beam (it turns as the chain runs), two chain strands: the load side down to the bucket, the return side into the pit
      const ca = -by / 4.5; for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d > 5.2) continue; const th = Math.atan2(y, x) - ca, tooth = d > 4 && Math.cos(th * 8) > 0.2;
        if (d > 4 && !tooth) continue; if (d < 1.5) { D.px(34 + x, 17 + y, 'iron', 8); continue; } const spoke = d < 3.6 && Math.abs(Math.sin(th * 2)) > 0.4; if (spoke) continue; D.px(34 + x, 17 + y, 'iron', 6.2 - (x + y) * 0.25); }
      const link = (x, y0, y1, ph) => { for (let y = y0; y < y1; y++) { const k = ((y + ph) % 5 + 5) % 5; D.px(x, y, 'iron', k === 4 ? 3 : k === 0 ? 8.5 : 6.5); if (k === 4) D.px(x + 1, y, 'iron', 6); } };
      link(HB, 18, by - 5, -by); link(29, 18, 97, by);
      if (by < 97) {
        // bail, hook, bucket (tapered, banded), the shell in it
        D.line(HB, by - 5, HB - 5, by, 'iron', 6); D.line(HB, by - 5, HB + 5, by, 'iron', 4.5); D.px(HB, by - 5, 'iron', 8);
        if (full) { D.ell(HB, by - 2, 3, 3, 'iron', 2.6, { dome: 1 }); D.px(HB - 1.5, by - 3.5, 'iron', 7.5); D.px(HB - 0.5, by - 3.5, 'iron', 5); D.px(HB - 0.5, by - 5, 'brass', 7.5); }
        D.poly([[HB - 7, by], [HB + 7, by], [HB + 6, by + 9], [HB - 6, by + 9]], 'iron', 5); D.hl(HB - 7, by, 14, 'iron', 8.4); D.hl(HB - 7, by + 1, 14, 'iron', 3.4); D.hl(HB - 6, by + 5, 12, 'brass', 5.6); D.hl(HB - 6, by + 6, 12, 'brass', 3.6); D.vl(HB - 6, by + 2, 6, 'iron', 7); D.vl(HB + 5, by + 2, 6, 'iron', 3.4);
      }
      D.end();
    });
    // the pit swallows what goes below the floor: darker inside the coaming, gone past its near edge
    { const L = D.c; for (let y = 90; y < 104; y++) for (let x = HX0 - 1; x <= HX1 + 1; x++) { const p = y * W + x; if (!L.m[p] || L.st[p] !== L.stamp) continue; if (y > 94 || x <= HX0 + 2 || x >= HX1 - 1) L.m[p] = 0; else L.t[p] = Math.max(0, L.t[p] - (y - 89) * 0.6); } }
    // the motor puffs while the hoist runs; its lamp turns
    if (moving && steps(t, 0.45) < 0.12 && st.pf !== Math.floor(t / 0.45)) { st.pf = Math.floor(t / 0.45); rs.burst('steam', 45.5, 4, 2, { sp: 7, ang: 0.3, spread: 0.6, life: 1.1 }); }
    const la = moving ? t * 9 : 0; rs.mul[5] = moving ? 0.55 + 0.45 * Math.max(0, Math.cos(la)) : 0.15;
    D.rect(22, 14, 4, 3, 'lamp', moving ? 7 + 3 * Math.max(0, Math.cos(la)) : 4, { e: 255 }); D.px(moving && Math.cos(la) < 0 ? 25 : 22, 14, 'lamp', moving ? 11 : 5, { e: 255 });
    // the shell the gunner carries: in the back layer, so the breech swallows it
    let pose, dir = 1, gx = 51, carry = -1;
    if (fa < 0.45) pose = { aF: 2.4, eF: 0.3, aB: 0.5, lean: -0.35, lF: 0.25, lB: -0.3 };
    else if (q < 0.55) pose = { aF: 1.35, eF: -0.2, aB: 0.2, eB: -0.2, lF: 0.15, lB: -0.15, bob: Math.round(Math.sin(t * 1.4) * 0.5) };
    else if (q < 0.65) { const k = ease(clamp((q - 0.55) / 0.06, 0, 1)); dir = -1; pose = { aF: 1 + k, eF: -0.2 - k * 0.2, aB: 0.9 + k * 0.9, eB: -0.3, lean: 0.2 + k * 0.3, lF: 0.1, lB: -0.2, kB: 0.3 }; }
    else if (q < 0.82) { const k = (q - 0.65) / 0.17; pose = { aF: 1.25 + k * 0.3, eF: -0.9 + k * 0.6, aB: 1.15 + k * 0.2, eB: -0.9 + k * 0.6, lF: 0.2, lB: -0.2, lean: 0.2 + k * 0.1 }; carry = k; }
    else pose = { aF: 1.5, eF: -0.1, aB: 1.3, eB: -0.1, lean: 0.3, lF: 0.35, lB: -0.3 };
    // corrugated hose from the steam line to the breech, sagging
    const hb = cp_(-17, -9); ol(D, 50, 50, 72, 68, () => { D.beg(); for (let k = 0; k <= 10; k++) { const f = k / 10, x = 58 + (hb[0] + kx - 58) * f - Math.sin(f * Math.PI) * 3, y = 54 + (hb[1] + ky - 1 - 54) * f; D.rect(x - 1, y - 1, 3, 3, 'leather', k % 2 ? 3 : 5); D.px(x - 1, y - 1, 'leather', 7); } D.end(); });
    stamp(D, cannonSpr(), kx, ky);
    // muzzle flash
    if (fa < 0.16) { const m = cp_(55, 0), k = 1 - fa / 0.16, wob = hh(Math.floor(fa * 60), 3);
      const ray = (ux, uy, L) => { for (let i = 0; i < L; i++) { const tn = clamp(11 - i / L * 6, 5, 11); D.px(m[0] + ux * i, m[1] + uy * i, 'fire', tn, { e: 255 }); if (i < L * 0.5) D.px(m[0] + ux * i + 1, m[1] + uy * i, 'fire', tn - 1, { e: 255 }); } };
      D.ell(m[0], m[1], 4 + k * 5, 3 + k * 4, 'fire', 7, { e: 255 }); D.ell(m[0], m[1], 2.5 + k * 3.5, 2 + k * 3, 'fire', 9, { e: 255 }); D.ell(m[0], m[1], 1.5 + k * 2, 1.5 + k * 1.5, 'fire', 11, { e: 255 });
      ray(CU[0], CU[1], 10 + 12 * k + wob * 3); ray(CV[0], CV[1], 5 + 5 * k); ray(-CV[0], -CV[1], 5 + 5 * k); ray((CU[0] + CV[0]) * 0.7, (CU[1] + CV[1]) * 0.7, 6 + 5 * k * wob); ray((CU[0] - CV[0]) * 0.7, (CU[1] - CV[1]) * 0.7, 6 + 5 * k * (1 - wob)); }
    // caged bulb, warning lamp glass
    D.rect(71, 16, 3, 3, 'lamp', 9, { e: 255 }); D.px(72, 17, 'lamp', 11, { e: 255 }); D.px(70, 17, 'iron', 3); D.px(74, 17, 'iron', 3);
    D.rect(101, 21, 7, 3, 'red', 7, { e: 3 }); D.hl(102, 21, 5, 'red', 9, { e: 3 });
    // the gunner: minds the breech; the moment: turns to the hoist, lifts the shell out of the bucket and loads it; the seal hisses
    D.lay('mid');
    man(D, gx, FY, { skin: ['skin', 6], hair: ['hair', 4], top: ['leather', 5], bot: ['denim', 3], boot: ['hair', 2], apron: ['leather', 3], cap: ['brass', 7] }, pose, dir);
    if (!X.noWorkers) { D.px(gx + dir, FY - 25 + (pose.bob || 0), 'teal', 9); D.px(gx + 2 * dir, FY - 25 + (pose.bob || 0), 'brass', 8);
      // the shell in his hands: lifted out of the bucket, carried round, pushed into the breech (hidden once past its face)
      let b = null; if (q > 0.63 && q < 0.65) { const h = handAt(gx, FY, pose, -1); b = [h[0] - 1, h[1] - 3]; } else if (carry >= 0) b = cp_(-32 + ease(carry) * 14, 1);
      if (b) ol(D, b[0] - 5, b[1] - 6, b[0] + 5, b[1] + 5, () => { ball(D, b[0], b[1]); const L = D.c; for (let y = Math.floor(b[1]) - 5; y <= b[1] + 4; y++) for (let x = Math.floor(b[0]) - 4; x <= b[0] + 4; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; const p = y * W + x; if (L.m[p] && L.st[p] === L.stamp && (x + 0.5 - C0[0]) * CU[0] + (y + 0.5 - C0[1]) * CU[1] > -22.3 && Math.abs((x + 0.5 - C0[0]) * CV[0] + (y + 0.5 - C0[1]) * CV[1]) < 8.5) L.m[p] = 0; } }); }
    if (q > 0.82 && !st.ld) { st.ld = 1; const b = cp_(-22, -6); rs.burst('steam', b[0], b[1], 6, { sp: 10, ang: -0.4, spread: 1, life: 1.2 }); rs.flash(2, 0.8); rs.flash(1, 0.3); } if (q < 0.5) st.ld = 0;
    // hoist hook on a chain from the pipe run, set swinging by each shot
    D.lay('front'); const sw = 0.05 * Math.sin(t * 1.2) + (fa < 4 ? 0.28 * Math.exp(-fa * 1.2) * Math.sin(fa * 5.5) : 0), hx = 68 + Math.sin(sw) * 24, hy = 10 + Math.cos(sw) * 24;
    ol(D, 50, 8, 86, 46, () => { D.beg(); for (let k = 0; k < 10; k++) { const f = k / 10, x = 68 + (hx - 68) * f, y = 10 + (hy - 10) * f; if (k % 2) { D.px(x, y, 'iron', 8); D.px(x, y + 1, 'iron', 5); } else { D.px(x - 1, y, 'iron', 7); D.px(x + 1, y, 'iron', 5); } }
    D.rect(hx - 2, hy, 5, 2, 'iron', 7); D.px(hx - 2, hy, 'iron', 9); D.line(hx, hy + 2, hx, hy + 6, 'iron', 7, { w: 2 }); D.px(hx + 2, hy + 7, 'iron', 7); D.px(hx + 3, hy + 6, 'iron', 6); D.px(hx + 3, hy + 5, 'iron', 8); D.px(hx - 1, hy + 7, 'iron', 5); D.end(); });
  },
});

// ───────── 特斯拉线圈 tesla coil (scifi · defence, chain) ─────────
// a coil on a hazard-striped cabinet: a flat spiral copper primary, a tall finely wound secondary, a polished toroid and a
// discharge ball (the coil, the rods and every arc sit on the mid layer, in front of the wall kit);
// streamers crackle off it and every so often an arc jumps to one of the two strike rods. Capacitor jars charge on the left,
// an engineer watches from the console. The moment: the jars fill, the coil hums, a double arc to both rods whites the room.
// A shot: arcs through the ceiling port to the surface, sparks rain down, the red beacon flares.
const TB = [75, 25], TL = [27, 43], TR = [124, 43];
function arcLine(D, x0, y0, x1, y1, seed, rough, core, br, halo) {
  let pts = [[x0, y0], [x1, y1]]; const r = X.rng(seed * 2654435761 + 7), L0 = Math.hypot(x1 - x0, y1 - y0), lv = L0 > 34 ? 4 : L0 > 14 ? 3 : 2;
  for (let l = 0; l < lv; l++) { const np = [pts[0]]; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, off = (r() - 0.5) * L * rough; np.push([(a[0] + b[0]) / 2 - dy / L * off, (a[1] + b[1]) / 2 + dx / L * off], b); } pts = np; }
  if (halo) for (let i = 0; i + 1 < pts.length; i++) { D.line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1], 'ice', 7, { e: 255 }); D.line(pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, 'ice', 6, { e: 255 }); }
  for (let i = 0; i + 1 < pts.length; i++) D.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'ice', core, { e: 255 });
  for (let b = 0; b < (br || 0); b++) { const k = 1 + Math.floor(r() * (pts.length - 2)), p = pts[k], a = Math.atan2(y1 - y0, x1 - x0) + (r() - 0.5) * 2.4, len = 4 + r() * Math.min(16, L0 * 0.35); arcLine(D, p[0], p[1], p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len, seed * 13 + b + 1, 0.7, core - 2, 0, false); }
  return pts;
}
X.def('tesla', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'scifi');                                                                                    // 0 teal strip
    sc.light({ x: 75, y: 27, z: 16, r: 128, i: 0.9, c: '#a0e0ff', tint: 0.5 });                              // 1 the discharge
    sc.light({ x: 107, y: 42, z: 8, r: 34, i: 0.6, c: '#60ffa0', fl: 'screen', tint: 0.6 });                 // 2 console screen
    sc.light({ x: 138, y: 19, z: 6, r: 48, i: 0.6, c: '#ff4040', fl: 'pulse', amp: 0.6, sp: 4, tint: 0.6 }); // 3 beacon
    sc.light({ x: 12, y: 70, z: 10, r: 40, i: 0.55, c: '#60f0e0', fl: 'pulse', amp: 0.25, sp: 1.6, tint: 0.55 }); // 4 capacitor tubes
    S.lay('wall');
    // ceiling port the big arcs go up through: a copper collar round a dark throat
    S.beg(); S.box(62, 3, 26, 8, 'scifi', 3); S.rect(66, 4, 18, 5, 'ink', 1); for (let x = 67; x < 84; x += 3) S.vl(x, 4, 5, 'scifi', 2); S.hcyl(62, 9, 26, 3, 'copper', 6.5, { rim: 1.5 }); for (let x = 64; x < 87; x += 4) S.px(x, 10, 'copper', 9); S.end();
    // cable trays under the ceiling, both sides
    [[4, 58], [92, 146]].forEach(([a, b]) => { S.beg(); S.box(a, 18, b - a, 2, 'scifi', 6); for (let x = a; x < b; x++) { S.px(x, 20, 'ink', 2); S.px(x, 21, x % 7 ? 'ink' : 'red', x % 7 ? 1.5 : 5); } for (let x = a + 4; x < b; x += 12) S.vl(x, 17, 5, 'scifi', 8); S.end(); });
    // high-voltage sign
    S.beg(); S.poly([[43, 49], [51, 64], [35, 64]], 'gold', 8); S.poly([[43, 52], [49, 62.5], [37, 62.5]], 'gold', 7); S.poly([[44, 54], [41, 59], [43, 59], [42, 62], [46, 57], [44, 57], [45, 54]], 'ink', 1); S.end();
    // floor: a hazard line round the coil
    for (let x = 48; x < 102; x++) for (let y = 91; y < 93; y++) S.px(x, y, ((x + y) >> 1) % 2 ? 'gold' : 'ink', ((x + y) >> 1) % 2 ? 6.5 : 1.5);
    S.lay('back');
    // knife switch on the left wall: copper clips, a blade on a hinge, a red grip
    S.beg(); S.box(4, 31, 18, 20, 'scifi', 4); S.rect(6, 33, 14, 16, 'scifi', 2.5); [8, 16].forEach(x => { S.rect(x - 1, 34, 3, 3, 'copper', 7); S.px(x - 1, 34, 'copper', 9); S.rect(x - 1, 46, 3, 2, 'copper', 5.5); S.vl(x, 36, 11, 'copper', 8); S.vl(x + 1, 37, 9, 'copper', 5); }); S.end();
    S.beg(); S.rect(8, 40, 10, 2, 'ink', 2); S.hl(8, 40, 10, 'scifi', 5); S.rect(12, 36, 3, 4, 'red', 7); S.px(12, 36, 'red', 9); S.rect(12, 35, 3, 1, 'red', 5); S.end();
    // capacitor tubes (charge animated)
    S.beg(); S.box(4, 54, 18, 3, 'scifi', 6, { top: 1 }); S.box(4, 86, 18, 4, 'scifi', 5); S.end();
    [5, 13].forEach(x => { S.beg(); S.cyl(x, 57, 7, 29, 'glass', 4, { rim: 2.2 }); S.hcyl(x, 57, 7, 2, 'copper', 7); S.hcyl(x, 83, 7, 3, 'copper', 5); S.vl(x + 3, 59, 24, 'copper', 5); S.vl(x + 1, 59, 23, 'glass', 9); S.end(); });
    // wall monitor over the console (trace animated)
    S.beg(); S.box(96, 33, 23, 17, 'scifi', 5); S.rect(98, 35, 19, 12, 'screen', 1, { e: 255 }); for (let x = 98; x < 117; x += 4) S.vl(x, 35, 12, 'screen', 2, { e: 255 }); S.hl(98, 41, 19, 'screen', 2, { e: 255 }); S.rect(113, 48, 3, 1, 'teal', 8, { e: 255 }); S.end();
    // console desk
    S.beg(); S.box(96, 70, 24, 20, 'scifi', 4, { top: 3, tt: 2 }); S.rect(99, 74, 18, 1, 'scifi', 2); [100, 104, 108].forEach((x, i) => S.rect(x, 68, 2, 1, ['red', 'gold', 'screen'][i], 8, { e: 255 })); S.box(112, 62, 2, 6, 'iron', 7); S.rect(111, 60, 4, 2, 'red', 7); for (let k = 0; k < 3; k++) S.hl(100, 79 + k * 3, 16, 'scifi', 2.5); S.end();
    // beacon housing
    S.beg(); S.box(134, 15, 9, 3, 'iron', 5); S.end();
    // the coil stands out on the floor, in front of the wall kit (mid layer): strike rods first
    S.lay('mid');
    // strike rods: insulator stacks, iron rods, copper balls
    [TL, TR].forEach(([x, y]) => { S.beg(); S.vl(x, y + 2, 72 - y - 2, 'iron', 7.5); S.vl(x + 1, y + 2, 72 - y - 2, 'iron', 4); for (let k = 0; k < 6; k++) S.ell(x + 0.5, 73 + k * 3, 3.6, 1.3, 'linen', k % 2 ? 4.5 : 6.5, { n: [0, -0.5] }); S.box(x - 4, 88, 10, 2, 'iron', 5); S.ell(x + 0.5, y, 3, 3, 'copper', 7, { dome: 1 }); S.px(x - 1, y - 1, 'copper', 10); S.end(); });
    // the coil: cabinet with hazard band and vents, a flat spiral primary, the secondary winding, a toroid (ball animated)
    S.beg(); S.box(55, 76, 40, 14, 'scifi', 5, { top: 2 }); for (let x = 56; x < 94; x++) for (let y = 80; y < 83; y++) S.px(x, y, ((x + y) >> 1) % 2 ? 'gold' : 'ink', ((x + y) >> 1) % 2 ? 7.5 : 1.5);
    for (let k = 0; k < 3; k++) S.hl(60, 85 + k * 2, 12, 'scifi', 2.5); S.rect(84, 85, 3, 2, 'screen', 9, { e: 255 }); S.rect(88, 85, 3, 2, 'red', 7, { e: 255 }); S.end();
    // primary: a spiral of three copper turns on a dark deck, each turn a little higher than the one outside it, 1-px dark
    // gaps between them; the near halves are painted again over the secondary's foot
    const PT = [[19.5, 5.6, 70.3], [15.5, 4.4, 69.5], [11.5, 3.3, 68.7]], ein = (x, y, rx, ry, cy) => { const u = (x + 0.5 - 75) / rx, v = (y + 0.5 - cy) / ry; return u * u + v * v <= 1; };
    const prim = (y0) => { for (let y = y0; y <= 77; y++) for (let x = 53; x <= 97; x++) { if (!ein(x, y, 21, 6.4, 70.4)) continue; let hit = -1;
        for (let i = 0; i < 3; i++) { const [rx, ry, cy] = PT[i]; if (ein(x, y, rx, ry, cy) && !ein(x, y, rx - 1.9, ry - 1.05, cy)) { hit = i; break; } }
        if (hit < 0) { S.px(x, y, 'scifi', y > 72 ? 1.2 : 2); continue; }
        const [rx, ry, cy] = PT[hit], nearS = y + 0.5 >= cy, top = !ein(x, y - 1, rx, ry, cy), bot = !ein(x, y + 1, rx, ry, cy) || (nearS && ein(x, y + 1, rx - 1.9, ry - 1.05, cy));
        S.px(x, y, 'copper', (nearS ? (top ? 7.4 : bot ? 4.4 : 6) : (top ? 6.6 : 5)) - hit * 0.3, { n: [0, top ? -0.8 : bot ? 0.6 : -0.2] }); } };
    S.beg(); prim(63); S.end();
    S.beg(); for (let y = 41; y < 69; y++) S.cyl(70, y, 11, 1, 'copper', y % 2 ? 6.5 : 4.5, { rim: 2.5 }); S.hcyl(69, 40, 13, 2, 'linen', 7); S.hcyl(69, 67, 13, 2, 'linen', 6); S.end();
    S.beg(); prim(69); PT.forEach(([rx, ry, cy]) => S.px(73, Math.floor(cy + ry - 0.5), 'copper', 9)); S.line(94, 71, 95, 75, 'copper', 6); S.px(95, 76, 'copper', 4); S.end({ none: 1 });
    // toroid: a ring seen from a little above — lit top rim, the far side of the tube past a dark hole, the near tube rounding off
    S.beg();
    for (let y = 30; y <= 42; y++) for (let x = 57; x <= 93; x++) { const u = (x + 0.5 - 75) / 17.5, v = (y + 0.5 - 36) / 5.6; if (u * u + v * v > 1) continue;
      const hu = (x + 0.5 - 75) / 9.5, hv = (y + 0.5 - 34.6) / 1.9, inH = hu * hu + hv * hv < 1, out = (dy) => { const vv = (y + dy + 0.5 - 36) / 5.6; return u * u + vv * vv > 1; };
      if (inH) { S.px(x, y, 'ink', hv > 0.45 ? 2.4 : 1.5); continue; }
      let tn; if (out(-1)) tn = 10; else if (out(1)) tn = 3; else if (out(2)) tn = 4.2; else if (Math.abs(hu) < 1 && y < 34.6) tn = 7.6; else if (Math.abs(hu) < 1) tn = y < 37 ? 9 : y < 39 ? 7.4 : 6; else tn = v < -0.35 ? 8.4 : v < 0.25 ? 7 : 5.6;
      S.px(x, y, 'iron', tn, { n: [u * 0.6, v * 0.8] }); }
    S.px(64, 33, 'iron', 11); S.vl(75, 28, 7, 'iron', 7); S.px(76, 29, 'iron', 4); S.end();
    // near the eye: a coil of hazard-yellow cable on the floor, its end trailing off to a plug; a toolbox
    S.lay('front');
    S.beg(); S.ell(15, 86.6, 8.5, 2.9, 'ink', 1);
    [[15, 88, 9.5], [14, 86.4, 8.8], [16, 84.9, 8.2]].forEach(([cx, cy, rx], k) => { const ry = 2.7; for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, ui = (x + 0.5 - cx) / (rx - 1.8), vi = (y + 0.5 - cy) / (ry - 1.1); if (u * u + v * v > 1 || ui * ui + vi * vi < 1) continue;
      const vv = (y - 0.5 - cy) / ry, topEdge = u * u + vv * vv > 1 || (v > 0 && ui * ui + vv * vv / ((ry - 1.1) / ry) ** 2 < 1);
      S.px(x, y, 'gold', v < 0 ? (topEdge ? 7 : 5.4) : (topEdge ? 5.8 : 3.6) - k * 0.2, { n: [0, v < 0 ? -0.7 : 0.6] }); } });
    for (let x = 24; x < 38; x++) { const y = 89 + Math.round((x - 24) / 5); S.px(x, y, 'gold', 6, { n: [0, -0.7] }); S.px(x, y + 1, 'gold', 3.4); }
    S.rect(38, 90, 4, 3, 'ink', 2); S.hl(38, 90, 4, 'scifi', 6); S.hl(42, 90, 2, 'copper', 8); S.hl(42, 92, 2, 'copper', 5); S.end();
    S.beg(); S.box(130, 82, 15, 8, 'red', 6, { top: 2 }); S.hl(130, 85, 15, 'red', 4); S.box(135, 77, 5, 2, 'iron', 7); S.end();
    foot(S, 55, 95); foot(S, 96, 120); foot(S, 4, 22); foot(S, 23, 33, 1); foot(S, 120, 130, 1); foot(S, 130, 145);
  },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 10), k = Math.floor(t * 15), charge = q > 0.55 && q < 0.9 ? (q - 0.55) / 0.35 : 0, big = q >= 0.9 && q < 0.95, shot = fa < 0.45;
    let act = 0.2;
    D.lay('mid');   // the discharge lives with the coil, in front of the wall kit
    // streamers off the ball, redrawn fifteen times a second, more and longer as the tubes charge
    const ns = 3 + Math.floor(hh(k, 1) * 2.5 + charge * 3);
    for (let i = 0; i < ns; i++) { const a = -Math.PI / 2 + (hh(k, 10 + i) - 0.5) * 3.8, len = 9 + hh(k, 20 + i) * (16 + charge * 10), br = hh(k, 30 + i) < 0.5;
      arcLine(D, TB[0] + Math.cos(a) * 3, TB[1] + Math.sin(a) * 3, TB[0] + Math.cos(a) * len, TB[1] + Math.sin(a) * len * 0.8, k * 31 + i, 0.75, br ? 11 : 10, len > 14 ? 1 : 0, br || len > 18); act += 0.1; }
    // arcs crawling over the toroid
    for (let i = 0; i < 2; i++) { const a0 = hh(k, 40 + i) * Math.PI * 2, a1 = a0 + 0.5 + hh(k, 42 + i) * 0.6; arcLine(D, 75 + Math.cos(a0) * 16, 36 + Math.sin(a0) * 5, 75 + Math.cos(a1) * 16, 36 + Math.sin(a1) * 5, k * 17 + i, 0.9, 9, 0, false); }
    // now and then an arc jumps to a strike rod
    const strike = hh(k, 2) < 0.14 + charge * 0.2 && !shot, side = hh(k, 3) < 0.5 ? TL : TR;
    if (strike) { arcLine(D, side === TL ? 59 : 91, 36, side[0] + 0.5, side[1] - 2, k * 7 + 3, 0.5, 11, 2, true); act += 0.8; D.ell(side[0] + 0.5, side[1], 3.6, 3.6, 'ice', 9, { e: 255 }); D.px(side[0], side[1] - 1, 'ice', 11, { e: 255 }); if (st.sk !== k) { st.sk = k; rs.flash(1, 0.5); rs.burst('spark', side[0], side[1], 3, { sp: 24, life: 0.5 }); } }
    // the moment: both rods at once; the room goes white; the engineer shields his face
    if (big) { [TL, TR].forEach((p, i) => { arcLine(D, i ? 91 : 59, 36, p[0] + 0.5, p[1] - 2, k * 5 + i, 0.5, 11, 3, true); D.ell(p[0] + 0.5, p[1], 4.2, 4.2, 'ice', 10, { e: 255 }); }); act += 1.6;
      if (!st.big) { st.big = 1; rs.flash(1, 2.2); rs.flash(4, 1); [TL, TR].forEach(p => rs.burst('spark', p[0], p[1], 8, { sp: 34, life: 0.8 })); } } else if (q < 0.5) st.big = 0;
    // a shot: arcs up through the ceiling port to the surface, and out to both rods
    if (shot) { for (let i = 0; i < 3; i++) arcLine(D, TB[0], TB[1] - 3, 67 + i * 8 + hh(k, 50 + i) * 3, 8, k * 11 + i, 0.6, 11, 2, true); arcLine(D, 59, 36, TL[0] + 0.5, TL[1] - 2, k * 3 + 9, 0.5, 11, 1, true); arcLine(D, 91, 36, TR[0] + 0.5, TR[1] - 2, k * 3 + 8, 0.5, 11, 1, true); D.lay('wall'); D.rect(66, 4, 18, 5, 'ice', 7 + (k % 2) * 2, { e: 255 }); D.lay('mid'); act += 2.2; [TL, TR].forEach(p => D.ell(p[0] + 0.5, p[1], 3.6, 3.6, 'ice', 10, { e: 255 })); }
    if (fired(rs, t)) { rs.flash(1, 3); rs.flash(3, 1.2); rs.flash(2, 0.6); rs.burst('spark', 75, 11, 18, { sp: 30, ang: Math.PI, spread: 2.6, life: 1.1, w: 18 }); rs.burst('glint', 75, 22, 4, { sp: 26, life: 0.5 }); }
    rs.mul[1] = 0.45 + act * 0.45 + charge * 0.4;
    // the ball: a hot white core in a ring of blue
    const gb = clamp(8 + act * 1.5 + charge, 8, 11); D.ell(TB[0], TB[1], 4, 4, 'ice', gb - 1.5, { e: 255 }); D.ell(TB[0] - 0.5, TB[1] - 0.5, 2.6, 2.6, 'ice', gb, { e: 255 }); D.px(TB[0] - 1, TB[1] - 2, 'ice', 11, { e: 255 });
    // the tubes: the charge climbs in the glass
    D.lay('back');
    const lvl = shot || big ? 0.15 : 0.35 + 0.65 * charge;
    [5, 13].forEach((x, i) => { const n = Math.round(lvl * 24) + i; for (let yy = 0; yy < n; yy++) { const y = 82 - yy; D.px(x + 2, y, 'teal', yy === n - 1 ? 11 : 8, { e: 5 }); D.px(x + 4, y, 'teal', yy === n - 1 ? 10 : 6.5, { e: 5 }); } });
    rs.mul[4] = 0.7 + charge * 1.8;
    // knife switch: the clips spit a spark now and then
    if (hh(k, 60) < 0.04 + charge * 0.1) { D.px(8, 35, 'ice', 11, { e: 255 }); D.px(7, 36, 'ice', 9, { e: 255 }); D.px(16, 35, 'ice', 10, { e: 255 }); if (st.ks !== k) { st.ks = k; rs.burst('spark', 8, 35, 1, { sp: 16, life: 0.4 }); } }
    // monitor: charge bar and a trace
    const lv = Math.round((shot || big ? 0.1 : 0.3 + 0.7 * charge) * 17); D.rect(99, 44, lv, 2, lv > 13 ? 'red' : 'screen', lv > 13 ? 8 : 9, { e: 255 });
    for (let x = 0; x < 19; x++) { const y = 38 + Math.round(Math.sin(x * 0.9 - t * 7) * (1 + charge * 1.5) + (hh(k, x) < 0.1 ? -1 : 0)); D.px(98 + x, y, 'screen', 9, { e: 255 }); }
    // beacon glass
    D.rect(135, 18, 7, 3, 'red', 7, { e: 4 }); D.hl(136, 18, 5, 'red', 9, { e: 4 });
    // the engineer: watches with a clipboard, notes something down, shields his face at a big discharge
    D.lay('mid'); const fl = big || shot;
    const pose = fl ? { aF: 2.6, eF: 0.4, aB: 1.8, eB: 0.6, lean: -0.4, lF: 0.3, lB: -0.35, tool: 'board' } : q > 0.25 && q < 0.4 ? { aF: 1.4, eF: -1.3, aB: 1.2, eB: -1.1, hx: 0.5, tool: 'board' } : { aF: 1.3, eF: -1.2, aB: 0.2, eB: -0.2, tool: 'board', bob: Math.round(Math.sin(t * 1.3) * 0.5) };
    man(D, 106, FY, { skin: ['skin', 6], hair: ['hair', 2], top: ['linen', 8], bot: ['scifi', 4], boot: ['ink', 2], cap: ['gold', 8] }, pose, -1);
  },
});

// ───────── 奥术尖塔 arcane spire (magic · defence, arcane) ─────────
// an arcane gun: a long amethyst barrel in brass collars on a swivel yoke, aimed up through a splayed gun port in the corner
// of the vault (night and the moon's edge beyond; the sill furred with frost, icicles hanging off it). Rune rings turn round
// the barrel and one floats in front of the muzzle. On the left a charge coil — a violet core in a glass tube wound with
// brass, two rune rings riding up and down it — feeds the turret through a conduit. A technician stands to the side with the
// rite book; spare crystals are racked on the wall, talismans hang from the vault. The moment: he reads the rite aloud,
// runes stream to the breech, the rings draw tight and the crystal hums, cold mist breathes out of the muzzle. A shot: the
// rings snap in and race up the barrel, a violet-blue beam goes out through the port, frost shards shake off the sill.
const SU = [Math.cos(-0.63), Math.sin(-0.63)], SV = [-SU[1], SU[0]], SP = [62, 60];   // barrel axis (up to the right), across it, the trunnion
const spp = (s, p) => [SP[0] + SU[0] * s + SV[0] * p, SP[1] + SU[1] * s + SV[1] * p];
const sAt = (x, y) => { const dx = x + 0.5 - SP[0], dy = y + 0.5 - SP[1]; return [dx * SU[0] + dy * SU[1], dx * SV[0] + dy * SV[1]]; };
const PO = 50, PW = 13, SW = 4.6;   // the port: its frame starts this far up the axis, this wide either side; the slit of sky
const pfun = (s) => (s < PO + 2 ? 0 : s < PO + 12 ? 11 - (s - PO - 2) * (11 - SW) / 10 : SW);   // the splay: the reveals narrow to the slit
// a ring of runes round the barrel, edge-on to it: its near half in front of the crystal, its far half behind
function barRing(D, s, R, spin, front, bright) {
  const c = spp(s, 0), n = Math.ceil(R * 8.5);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, z = Math.sin(a); if ((z >= 0) !== front) continue; const cc = Math.cos(a), rune = (((a + spin) / (Math.PI * 2) * 6) % 1 + 1) % 1 < 0.17;
    const x = c[0] + R * cc * SV[0] + R * z * 0.36 * SU[0], y = c[1] + R * cc * SV[1] + R * z * 0.36 * SU[1], tn = (rune ? 11 : 8.4 + bright) - (front ? 0 : 3.2);
    D.px(x, y, 'arcane', tn, { e: 255 }); D.px(x + SU[0] * 1.1, y + SU[1] * 1.1, 'arcane', tn - 2.2, { e: 255 }); }
}
function ringH(D, cx, cy, rx, ry, spin, front, tn) {   // a flat ring seen from a little above
  const n = Math.ceil(rx * 7);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if ((Math.sin(a) >= 0) !== front) continue; const rune = (((a + spin) / (Math.PI * 2) * 10) % 1 + 1) % 1 < 0.15, dk = front ? 0 : 3;
    D.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 'arcane', (rune ? 11 : tn) - dk, { e: 255 }); D.px(cx + Math.cos(a) * (rx - 1.3), cy + Math.sin(a) * (ry - 0.9), 'arcane', (rune ? 9 : tn - 3) - dk, { e: 255 }); }
}
const SSTAR = [[121, 16], [127, 6], [133, 13], [117, 22]], SRING = [2.5, 17];
const SBEAM = beam({ x: 140.6, y0: 3, y1: 38, w0: 7, w1: 7, dx: -47.4, fade: 0.3, c: '#b0a4ff', a: 0.55 });
const LIP = []; for (let s = PO + 2; s < 110; s += 1) { const a = spp(s, PW + 0.5); if (a[0] < W - 4 && a[1] > 4) LIP.push(a); }   // the port's lower outer edge
X.def('spire', {
  amb: [0.24, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'magic');                                                                                        // 0 carved runes
    sc.light({ x: 74, y: 52, z: 16, r: 100, i: 1.05, c: '#9a7cff', fl: 'pulse', amp: 0.1, sp: 1.7, tint: 0.6 });   // 1 the crystal barrel
    sc.light({ x: 20, y: 50, z: 12, r: 58, i: 0.85, c: '#8a86ff', fl: 'pulse', amp: 0.25, sp: 2.6, tint: 0.55 });  // 2 the charge coil
    sc.light({ x: 124, y: 18, z: 4, r: 80, i: 0.6, c: '#a8c0ff', tint: 0.45 });                                    // 3 the night through the port
    sc.light({ x: 96, y: 36, z: 14, r: 110, i: 1, c: '#b8a8ff', tint: 0.6, bake: false });                         // 4 the shot (dark until it fires)
    sc.light({ x: 112, y: 45, z: 14, r: 50, i: 0.7, c: '#ffb060', fl: 'candle', ph: 1.7, tint: 0.4 });            // 5 the candle sconce
    // the gun port: dressed voussoirs with a gold edge round a splayed opening, the lit upper reveal, the frosted lower one,
    // a slit of night with the moon's edge in it
    S.lay('wall');
    for (let y = 3; y < 48; y++) for (let x = 88; x < W - 3; x++) { const [s, p] = sAt(x, y), ap = Math.abs(p); if (s < PO || ap > PW) continue; const fw = pfun(s);
      if (ap > fw || s < PO + 2) {   // the stone frame
        const joint = ((s - PO) % 6.5) < 0.9 || ap > PW - 1, lo = p > 0;
        if (ap > PW - 1) S.px(x, y, lo ? 'ice' : 'gold', lo ? 8.6 : 7.2, lo ? {} : { n: [-0.4, -0.6] });
        else S.px(x, y, 'magic', joint ? 3 : (lo ? 5.4 : 6.6) + (ap > PW - 2.2 ? 0.8 : 0), { n: [SV[0] * Math.sign(p) * 0.4, SV[1] * Math.sign(p) * 0.4] }); continue; }
      if (ap > SW) { if (p < 0) S.px(x, y, 'magic', 8.6 - (s - PO) * 0.12, { n: [0.3, 0.5] }); else S.px(x, y, 'ice', p > fw - 1.1 ? 9.6 : 6.4 + (((s * 1.7) | 0) % 3 === 0 ? 1 : 0), { n: [-0.3, -0.5] }); continue; }
      S.px(x, y, 'night', 1.3 + (y - 3) / 36 * 2.4, { e: 255 }); }
    for (let y = 3; y < 16; y++) for (let x = 128; x < W - 3; x++) { const [s, p] = sAt(x, y); if (s < PO + 12 || Math.abs(p) >= SW) continue; const d = Math.hypot(x + 0.5 - 138, y + 0.5 - 9.5); if (d < 3.6) S.px(x, y, 'bone', d < 2.4 ? (x < 138 && y < 9 ? 10 : 9) : 7.5, { e: 255 }); }
    // icicles off the port's lower edge
    for (let s = PO + 3.5; s < 108; s += 3.7) { const a = spp(s, PW + 0.8); if (a[0] > W - 5 || a[1] < 4) continue; const L = 2 + Math.floor(hh(Math.round(s * 3), 5) * 5);
      S.beg(); for (let k = 0; k < L; k++) S.px(a[0], a[1] + k, 'ice', 9.4 - k * 0.8); if (L > 3) S.px(a[0] + 1, a[1], 'ice', 7); S.end({ none: 1 }); }
    S.lay('back');
    // the charge coil: a stone foot, a brass frame, a violet core in a glass tube wound with brass
    S.beg(); S.box(7, 85, 26, 5, 'magic', 7, { top: 2 }); S.hl(7, 85, 26, 'gold', 6.5); S.box(10, 79, 20, 6, 'magic', 8, { top: 1 }); S.end();
    S.beg(); S.box(10, 31, 3, 48, 'brass', 6); S.box(27, 31, 3, 48, 'brass', 4.5); S.box(8, 27, 24, 4, 'brass', 6.5, { top: 1 }); S.box(8, 75, 24, 4, 'brass', 5.5); S.hl(9, 29, 22, 'arcane', 6, { e: 3 }); S.end();
    S.beg(); for (let y = 31; y < 75; y++) { S.px(13, y, 'glass', 5); S.px(14, y, 'glass', 3); for (let x = 15; x < 25; x++) { const u = (x - 19.5) / 5; S.px(x, y, 'arcane', Math.abs(u) < 0.45 ? 8.6 : u < 0 ? 7.4 : 5.4, { e: 3 }); } S.px(25, y, 'glass', 2.5); S.px(26, y, 'glass', 4); }
      for (let y = 33; y < 74; y += 5) { S.line(13, y + 2, 26, y - 1, 'brass', 7.6); S.line(13, y + 3, 26, y, 'brass', 4.2); } S.end();
    // the turret's far yoke arm (behind the barrel)
    S.beg(); S.poly([[59, 79], [72, 79], [69, 57], [64, 57]], 'brass', 3.2); S.ell(66.5, 56, 3.4, 3.4, 'brass', 4, { dome: 1 }); S.end();
    // spare crystals racked in brass cups on the right wall (they glow with the barrel), a candle sconce
    S.beg(); S.box(118, 68, 27, 3, 'wood', 5.5, { top: 1 }); S.box(120, 71, 2, 5, 'wood', 4); S.box(141, 71, 2, 5, 'wood', 4); S.end();
    [124, 131.5, 139].forEach((x, i) => { S.beg(); const h = 13 - (i % 2) * 2; for (let y = 0; y < h; y++) { const w = y < 3 ? y + 1 : 3; for (let k = -w + 1; k < w; k++) S.px(x + k, 66 - h + y, 'arcane', (k < 0 ? 8.4 : k > 0 ? 5.2 : 7) + (y < 3 ? 1 : 0), { e: 2 }); } S.rect(x - 3, 64, 6, 4, 'brass', 6); S.hl(x - 3, 64, 6, 'brass', 8); S.end(); });
    S.beg(); S.box(109, 49, 7, 2, 'iron', 6); S.vl(112, 51, 4, 'iron', 5); S.rect(111, 46, 3, 3, 'linen', 9); S.px(113, 47, 'linen', 6); S.hl(110, 49, 5, 'brass', 7); S.end();
    // the conduit from the coil's foot to the turret, a glass window where the charge runs; the turret's drum and turntable
    S.lay('mid'); S.beg(); S.hcyl(30, 85, 12, 4, 'brass', 5, { rim: 1.5 }); S.rect(32, 86, 8, 2, 'arcane', 2.5, { e: 255 }); S.end();
    S.beg(); S.box(40, 84, 46, 6, 'magic', 7, { top: 2 }); S.hl(40, 84, 46, 'gold', 6.5); for (let x = 44; x < 84; x += 8) TX.rivet(S, x, 87, 'gold', 5); S.end();
    S.beg(); S.box(45, 79, 36, 3, 'brass', 5.5, { top: 1 }); for (let x = 46; x < 80; x += 2) S.px(x, 81, 'brass', 3); S.end();
    // the barrel: a brass breech drum wound with a glowing coil, then the amethyst in three brass collars, claws at the muzzle
    const shade = (p, r, t0) => { const q = p / r; return t0 + (q < -0.55 ? 2 : q < -0.1 ? 1 : q < 0.45 ? 0 : -1.5); };
    S.beg();
    rot(SP, SU, -21, 39, -8, 8, (x, y, s, p) => {
      const ap = Math.abs(p), o = { n: [SV[0] * p / 8, SV[1] * p / 8] };
      if (s < -18.5) { if (ap <= 6) S.px(x, y, 'brass', shade(p, 6, 3.6), o); return; }
      if (s < -8) { if (ap > 7) return; const coil = ((s + 18.5) % 3) < 1.3 && s > -17 && s < -9.5; if (coil) S.px(x, y, 'arcane', shade(p, 7, 5.5), { e: 2 }); else S.px(x, y, 'brass', shade(p, 7, 5), o); return; }
      if (s < -5 || (s >= 9 && s < 12) || (s >= 24 && s < 27.5)) { if (ap <= 6) S.px(x, y, 'brass', shade(p, 6, 5.5) + (s >= 24 ? 0.5 : 0), o); return; }
      if (s >= 27.5 && s < 32 && ap > 3 && ap <= 6 - (s - 27.5) * 0.7) { S.px(x, y, 'brass', shade(p, 6, 6), o); return; }   // the muzzle claws
      const r = s < 28 ? 4.5 : 4.5 * (38 - s) / 10; if (ap > r) return;
      const face = p < -1.6 ? 0 : p < 1.6 ? 1 : 2; let tn = [9, 7, 4.8][face]; if (p >= -2.4 && p < -1.4) tn = 10.4; if (s >= 28) tn += 0.8;
      if (face === 1 && ((Math.floor(s) + 40) % 7 === 0)) tn += 0.9;
      S.px(x, y, 'arcane', tn, { e: 2 });
    });
    { const tp = spp(37.4, -0.3); S.px(tp[0], tp[1], 'arcane', 11, { e: 255 }); const r0 = spp(-15, -8.6); S.ell(r0[0], r0[1], 1.7, 1.7, 'brass', 7, { ring: 0.9 }); const r1 = spp(-15, -7.2); S.px(r1[0], r1[1], 'brass', 5); }
    S.end();
    // near the eye: the yoke's near arm over the barrel, a heap of fallen frost under the port
    S.lay('front');
    S.beg(); S.line(54, 79, 59, 63, 'brass', 6.2, { w: 3 }); S.line(55, 79, 60, 63, 'brass', 7.8); S.line(68, 79, 63, 63, 'brass', 4.4, { w: 3 }); S.line(70, 79, 65, 63, 'brass', 3);
    S.box(57, 71, 11, 3, 'brass', 5.6); TX.rivet(S, 58, 72, 'brass', 6); TX.rivet(S, 65, 72, 'brass', 5); S.box(52, 78, 20, 2, 'brass', 6);
    S.ell(62, 60, 4.4, 4.4, 'brass', 6.4, { dome: 1 }); S.ell(62, 60, 1.8, 1.8, 'iron', 4); S.px(60, 58, 'brass', 10); S.px(62, 60, 'iron', 7); S.end();
    S.beg(); S.ell(134, 89.5, 13, 2.6, 'ice', 6.6, { n: [0, -0.8] }); S.hl(123, 88, 22, 'ice', 8.4); S.end();
    [[124, 5, 0.25], [128, 9, -0.35], [132, 12, 0.12], [136.5, 8, 0.4], [141, 6, -0.2]].forEach(([x, h, l]) => { S.beg();
      for (let k = 0; k < h; k++) { const cx = x + l * k, w = k > h - 3 ? 0.6 : 1.6; for (let i = Math.round(-w); i <= Math.round(w); i++) S.px(cx + i, 88 - k, 'ice', i < 0 ? 9.6 : i > 0 ? 5.4 : 7.6); }
      S.px(x + l * h, 88 - h, 'ice', 10.8); S.end(); });
    foot(S, 7, 33); foot(S, 40, 86, 1.1); foot(S, 118, 146, 0.9);
    sc.emit({ k: 'rune', x: 20, y: 24, w: 8, rate: 0.7, sp: 3, ang: 0, spread: 0.4, life: 2.2 });
    sc.emit({ k: 'mist', x: 124, y: 26, w: 20, rate: 0.6, sp: 3, ang: 3.4, spread: 0.6, life: 2.4 });
  },
  post(out, t, s) { const fa = s.fireAge; if (fa >= 0 && fa < 0.45) drawBeam(out, SBEAM, fa < 0.1 ? 1 : 1 - (fa - 0.1) / 0.35); },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 10), cast = q > 0.58 && q < 0.86, dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t;
    // charge: it builds while the technician reads the rite; a shot drives it to the top at once
    const ch = fa < 1.4 ? (fa < 0.08 ? 1 : Math.max(0, 1 - (fa - 0.08) / 1.1)) : cast ? ease(clamp((q - 0.58) / 0.22, 0, 1)) * 0.7 * (q > 0.8 ? 1 - (q - 0.8) / 0.06 : 1) : 0;
    st.sa = (st.sa || 0) + dt * (1.1 + ch * 7); st.sb = (st.sb || 0) + dt * 0.9;
    rs.mul[1] = 1 + ch * 0.7; rs.mul[2] = 0.9 + ch * 0.8;
    if (fired(rs, t)) { const m = spp(39, 0); rs.flash(4, 2.6); rs.flash(1, 1.6); rs.flash(3, 1.2); rs.flash(2, 0.5); rs.burst('glint', m[0], m[1], 4, { sp: 20, life: 0.5 }); rs.burst('rune', m[0], m[1], 8, { sp: 26, ang: 0.95, spread: 1.4, life: 1 });
      st.fs = st.fs || []; for (let i = 0; i < 18 && st.fs.length < 30; i++) { const a = LIP[Math.floor(R() * LIP.length)]; st.fs.push({ x: a[0], y: a[1] + 1, vx: (R() - 0.5) * 16, vy: R() * 8, fl: 87 + Math.floor(R() * 4), age: -R() * 0.2, o: R() < 0.5 ? 1 : -1 }); }
      for (let i = 0; i < 4; i++) { const a = LIP[Math.floor(R() * LIP.length)]; rs.burst('mist', a[0], a[1] + 2, 1, { sp: 6, ang: Math.PI, spread: 1, life: 1.8 }); } }
    // the rings round the barrel turn; charging draws them tight; a shot snaps them in and throws them up the barrel, and
    // throws the floating muzzle ring out through the port (it grows back)
    const Rr = 8.4 - ch * 2.8, slide = fa < 0.9 ? 7 * Math.sin(Math.min(1, fa / 0.9) * Math.PI) * (fa < 0.08 ? fa / 0.08 : 1) : 0, br = ch * 1.5;
    const fs = fa < 0.35 ? 45 + fa / 0.35 * 34 : 45 + Math.sin(t * 1.3) * 0.8, fr = fa < 0.35 ? 5.8 * (1 - fa / 0.35 * 0.5) : fa < 1.4 ? 5.8 * clamp((fa - 0.35) / 1, 0.05, 1) : 5.8 - ch * 1.5;
    D.lay('back'); SRING.forEach((s, i) => barRing(D, s + slide * (0.6 + i * 0.3), Rr, st.sa * (i % 2 ? -1 : 1) + i, false, br)); if (fr > 0.6) barRing(D, fs, fr, st.sa * 1.4, false, br);
    D.lay('mid'); SRING.forEach((s, i) => barRing(D, s + slide * (0.6 + i * 0.3), Rr, st.sa * (i % 2 ? -1 : 1) + i, true, br)); if (fr > 0.6) barRing(D, fs, fr, st.sa * 1.4, true, br);
    // a glint runs up the crystal
    const gs = -4 + ((t * 10) % 70); if (gs < 30 && !(gs > 8 && gs < 12.5) && !(gs > 23 && gs < 28)) rot(SP, SU, gs, gs + 1.6, -4.4, -1.3, (x, y) => D.px(x, y, 'arcane', 11, { e: 255 }));
    // the turntable's teeth creep round as the mount holds its aim
    for (let x = 46; x < 80; x += 4) { const xx = 46 + ((x - 46 + Math.floor(t * 1.5)) % 34 + 34) % 34; D.px(xx, 79, 'brass', 8.5); }
    // the shot: a violet-blue beam out of the muzzle and up through the port, a spiral of frost light round it
    if (fa < 0.42) { const k = fa < 0.06 ? 1 : 1 - (fa - 0.06) / 0.36, wc = 0.6 + 2.2 * k, m = spp(38, 0);
      rot(SP, SU, 36, 125, -wc - 2.4, wc + 2.4, (x, y, s, p) => { const ap = Math.abs(p); if (ap < wc) D.px(x, y, 'arcane', 11, { e: 255 }); else if (ap < wc + 1.2) D.px(x, y, 'arcane', 9, { e: 255 }); else if (hh(Math.floor(s / 3), Math.floor(fa * 40)) > 0.25) D.px(x, y, 'ice', 9, { e: 255 }); });
      for (let s = 38; s < 125; s += 0.7) { const p = (wc + 3) * Math.sin(s * 0.42 - fa * 50), a = spp(s, p); D.px(a[0], a[1], 'ice', 10.5, { e: 255 }); }
      D.ell(m[0], m[1], 2 + k * 4, 2 + k * 4, 'arcane', 9, { e: 255 }); D.ell(m[0], m[1], 1 + k * 2.5, 1 + k * 2.5, 'arcane', 11, { e: 255 }); }
    // the frost the shot knocks off the sill: blue-white slivers tumble down and lie glinting on the heap, then melt
    if (st.fs && st.fs.length) { D.lay('front'); for (let i = st.fs.length - 1; i >= 0; i--) { const f = st.fs[i]; f.age += dt; if (f.age < 0) continue; if (f.age > 2.4) { st.fs.splice(i, 1); continue; }
        if (f.y < f.fl) { f.vy += 150 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y >= f.fl) { f.y = f.fl; if (R() < 0.3) rs.burst('glint', f.x, f.y - 1, 1, { sp: 2, life: 0.4 }); } }
        const land = f.y >= f.fl, tn = land ? 10.5 - Math.max(0, f.age - 1.2) * 4 : 11, fl2 = Math.floor(f.age * 12 + i) % 2 ? f.o : -f.o; if (tn < 5) continue;
        D.px(f.x, f.y, 'ice', tn, { e: 255 }); D.px(f.x + (land ? 1 : fl2), f.y - (land ? 0 : 1), 'ice', tn - 1.5, { e: 255 }); if (!land) D.px(f.x - fl2, f.y + 1, 'ice', tn - 3, { e: 255 }); } }
    // the port: stars; now and then a drop off an icicle
    D.lay('wall'); stars(D, SSTAR, t);
    if (steps(t, 3.7) < 0.02 && st.dr !== Math.floor(t / 3.7)) { st.dr = Math.floor(t / 3.7); const a = spp(PO + 8 + hh(st.dr, 3) * 36, PW + 5); rs.burst('drip', a[0], a[1], 1, { sp: 0, life: 1.2, floor: FY + 1 }); }
    // the charge coil: a bright band climbs its core; two rune rings ride up and down round it; a shard floats over it
    D.lay('back'); const cy = 74 - ((t * (14 + ch * 30)) % 44); for (let x = 15; x < 25; x++) for (let y = Math.floor(cy); y < cy + 2; y++) { const w = (((y - 33) % 5) + 5) % 5, wl = 2 - (x - 13) * 3 / 13; if (Math.abs(w - wl) < 1.2 || Math.abs(w - wl - 1) < 0.6) continue; D.px(x, y, 'arcane', 11, { e: 255 }); }
    const fy = 20 + Math.round(Math.sin(t * 1.6) * 1.2); D.poly([[20, fy - 5], [23, fy], [20, fy + 5], [17, fy]], 'arcane', 8, { e: 255 }); D.poly([[20, fy - 5], [20, fy + 5], [17, fy]], 'arcane', 10, { e: 255 }); D.px(20, fy - 4, 'arcane', 11, { e: 255 });
    const ya = 47 + Math.round(Math.sin(st.sb) * 12), yb = 60 - Math.round(Math.sin(st.sb) * 12);
    D.lay('wall'); ringH(D, 20, ya, 13, 3.2, st.sa * 0.8, false, 8); ringH(D, 20, yb, 12, 3, -st.sa * 0.7, false, 8);
    D.lay('back'); ringH(D, 20, ya, 13, 3.2, st.sa * 0.8, true, 8); ringH(D, 20, yb, 12, 3, -st.sa * 0.7, true, 8);
    // charge running along the conduit into the turret
    D.lay('mid'); for (let x = 32; x < 40; x++) { const v = ((x - t * (10 + ch * 30)) % 5 + 5) % 5; if (v < 1.5) D.px(x, 86, 'arcane', 10, { e: 255 }); if (v < 0.8) D.px(x, 87, 'arcane', 8, { e: 255 }); }
    // the candle
    D.lay('back'); flame(D, 112, 45, 4, t, 0.6);
    // the technician: reads the aiming rite from his book; the moment: he lifts it and runes stream to the breech coil
    D.lay('mid'); const gx = 104, rd = cast && q < 0.84, brace = fa < 0.45;
    const pose = brace ? { aF: 1.5, eF: -1, aB: 2.5, eB: 0.4, lean: -0.3, lF: 0.25, lB: -0.3 } : rd ? { aF: 1.95, eF: -0.9, aB: 1.8, eB: -0.8, lean: 0.1 } : { aF: 1.2, eF: -1.15, aB: 1.05, eB: -1.05, bob: Math.round(Math.sin(t * 1.2) * 0.5), hx: 0.4 };
    man(D, gx, FY, { skin: ['skin', 6], hair: ['hair', 5], top: ['lav', 7], bot: ['iron', 4], boot: ['leather', 3], cap: ['brass', 7] }, pose, -1);
    if (!X.noWorkers) { D.px(gx - 1, FY - 25 + (pose.bob || 0), 'arcane', 10, { e: 255 });   // a lens over one eye
      const h = handAt(gx, FY, pose, -1), bx = h[0] - 4, by = h[1] - 3, flip = Math.floor(t / 3.1) % 2 && steps(t, 3.1) < 0.12;
      ol(D, bx - 2, by - 3, bx + 9, by + 5, () => { D.beg(); D.rect(bx, by + 2, 9, 2, 'crimson', 4.5); D.hl(bx, by + 2, 9, 'crimson', 6); D.rect(bx, by, 4, 3, 'paper', 9); D.rect(bx + 5, by, 4, 3, 'paper', 8); D.vl(bx + 4, by, 3, 'paper', 5);
        D.hl(bx + 1, by + 1, 2, rd ? 'arcane' : 'paper', rd ? 11 : 5, rd ? { e: 255 } : undefined); D.hl(bx + 6, by + 1, 2, 'paper', 5); if (flip) { D.px(bx + 5, by - 1, 'paper', 10); D.px(bx + 4, by - 2, 'paper', 10); } D.end(); });
      if (rd && q > 0.62 && R() < 0.45) { const b = spp(-14, -2); rs.burst('rune', bx + 4, by - 1, 1, { sp: 34, ang: Math.atan2(b[0] - bx, -(b[1] - by)), spread: 0.35, life: 1.3 }); } }
    if (cast && q > 0.8 && !st.c) { st.c = 1; const m = spp(38, 0), v = spp(29, 0); rs.flash(1, 0.9); rs.flash(2, 0.6); rs.burst('glint', m[0], m[1], 3, { sp: 12, life: 0.5 }); rs.burst('mist', v[0], v[1], 3, { sp: 8, life: 1.4 }); } if (q < 0.5) st.c = 0;
    // paper talismans hanging from the vault, stirred by each shot
    D.lay('front'); const push = fa < 3 ? 0.5 * Math.exp(-fa * 1.6) * Math.sin(fa * 7) : 0;
    [[36, 15, 0], [41, 21, 1.3], [46, 12, 2.6]].forEach(([x, L, ph]) => { const a = 0.06 * Math.sin(t * 1.3 + ph) + push * (0.8 + ph * 0.1), ex = x + Math.sin(a) * L, ey = 9 + Math.cos(a) * L;
      ol(D, x - 6, 9, x + 8, ey + 11, () => { D.beg(); D.line(x, 9, ex, ey, 'hair', 3); D.rect(ex - 1, ey, 4, 9, 'paper', 8.6); D.vl(ex + 2, ey, 9, 'paper', 6.2); D.hl(ex - 1, ey, 4, 'paper', 10); D.px(ex, ey + 2, 'crimson', 7); D.px(ex + 1, ey + 3, 'crimson', 7); D.px(ex, ey + 4, 'crimson', 6); D.px(ex + 1, ey + 6, 'arcane', 9, { e: 1 }); D.end(); }); });
  },
});

// ───────── 军械库 armory (medieval · train, rare) ─────────
// a suit of plate armour on a plinth under a pale shaft of light from a ceiling grate (it rims the helm and lands as a
// pool on the plinth and the boards), a crimson banner behind; a rack of polearms and swords, heraldic shields, a buckler
// over crossed axes, torches either side. An armourer grinds a blade on a grooved stone wheel carried on two posts over a
// water trough, worked by a treadle and crank, an oil lamp on the post, sparks spraying; the moment: he lifts the finished
// sword, the shaft and its pool blaze, a glint runs down the armour to the planted sword, motes swirl and the banner stirs.
function armorSuit(S) {
  S.beg();
  // legs: cuisses, knee cops, greaves, sabatons
  [[71, -1], [80, 1]].forEach(([x, sg]) => { S.cyl(x - 2, 70, 5, 12, 'iron', 7, { rim: 2.2 }); S.hl(x - 2, 73, 5, 'iron', 5); S.ell(x + 0.5, 75.5, 2.8, 1.8, 'iron', 8, { dome: 1 }); S.px(x, 75, 'iron', 10); S.box(x - 2 + sg, 81, 5, 2, 'iron', 6); S.px(x - 2 + sg + (sg > 0 ? 4 : 0), 82, 'iron', 4); });
  // tassets: three lames stepping out below the waist
  for (let k = 0; k < 3; k++) { S.hcyl(69 - k, 64 + k * 2, 14 + k * 2, 2, 'iron', 7 - k * 0.4, { rim: 1.2 }); S.px(69 - k, 64 + k * 2, 'iron', 8.6); }
  S.hl(69, 64, 14, 'gold', 7);
  // breastplate: a rounded shell narrowing to the waist, a lit ridge, gold trim at the neck
  S.poly([[67, 51], [85, 51], [84, 58], [82, 64], [70, 64], [68, 58]], 'iron', 6.6); S.ell(76, 56, 7.5, 6.5, 'iron', 7.2, { dome: 1 });
  for (let y = 51; y < 63; y++) S.px(76, y, 'iron', y < 58 ? 10.4 : 9); for (let y = 53; y < 61; y++) S.px(77, y, 'iron', 6);
  S.px(71, 54, 'iron', 10.6); S.px(72, 53, 'iron', 9.6); S.hl(70, 51, 12, 'gold', 8); S.hl(71, 52, 10, 'gold', 5.6);
  // gorget, pauldrons with lames, arms bending in to gauntlets on the pommel
  S.box(72, 48, 9, 3, 'iron', 7.6); S.hl(72, 48, 9, 'iron', 9.4);
  S.line(64, 55, 65, 61, 'iron', 7.2, { w: 3 }); S.line(66, 61, 71, 64, 'iron', 7.6, { w: 3 }); S.line(87, 55, 86, 61, 'iron', 5.6, { w: 3 }); S.line(85, 61, 80, 64, 'iron', 6, { w: 3 });
  S.ell(65.5, 60.5, 1.8, 1.5, 'iron', 9, { dome: 1 }); S.ell(87, 60.5, 1.8, 1.5, 'iron', 7, { dome: 1 });
  [[65.5, 1], [87, -1]].forEach(([x, sg]) => { S.ell(x, 51.5, 5, 4, 'iron', sg > 0 ? 7.6 : 6.2, { dome: 1 }); S.hl(x - 4, 53, 9, 'iron', sg > 0 ? 5.6 : 4.4); S.hl(x - 4, 55, 8, 'gold', sg > 0 ? 7 : 5.6); S.px(x - 2 * sg, 49, 'iron', 10.4); });
  S.end();
  // the sword planted in front: pommel under the gauntlets, grip, gold guard, a long blade down to the plinth
  S.beg(); S.rect(75, 69, 3, 13, 'iron', 7.6); S.vl(76, 69, 12, 'iron', 10.4); S.px(76, 82, 'iron', 7); S.box(70, 67, 13, 2, 'gold', 7); S.px(70, 67, 'gold', 9); S.rect(75, 64, 3, 3, 'leather', 4); S.rect(74, 62, 5, 2, 'gold', 8); S.end();
  S.beg(); S.rect(71, 63, 4, 3, 'iron', 8); S.px(71, 63, 'iron', 10); S.rect(78, 63, 4, 3, 'iron', 6.4); S.hl(71, 66, 4, 'iron', 4.6); S.end();
  // great helm: flat top, a dark eye slit, breaths, a lit ridge (the plume is animated)
  S.beg(); S.cyl(71, 38, 11, 10, 'iron', 7.4, { rim: 2.2 }); S.hl(71, 38, 11, 'iron', 9.4, { n: [0, -0.8] }); S.hl(72, 42, 9, 'ink', 1); S.hl(72, 43, 9, 'iron', 4.4); S.vl(76, 38, 10, 'iron', 10); S.px(79, 45, 'ink', 2); S.px(79, 47, 'ink', 2); S.px(81, 46, 'ink', 2); S.hl(71, 47, 11, 'gold', 6.4); S.end();
}
// a sword standing point-up in the rack: a 4-px point (1 → 2 → 3 wide), a lit edge, a dark fuller, a shaded edge, a 5-px gold
// guard with bright ends, a leather grip and a gold pommel resting on the lower rail (its top face is row 78)
function rackSword(S, c, y0, gy) {
  S.beg();
  S.px(c, y0, 'iron', 10.6); S.px(c, y0 + 1, 'iron', 10); S.px(c - 1, y0 + 2, 'iron', 10); S.px(c, y0 + 2, 'iron', 8);
  S.vl(c - 1, y0 + 3, gy - y0 - 3, 'iron', 9.6); S.vl(c, y0 + 3, gy - y0 - 3, 'iron', 7.6); S.vl(c + 1, y0 + 3, gy - y0 - 3, 'iron', 6.4);
  S.vl(c, y0 + 5, gy - y0 - 8, 'iron', 4); S.px(c - 1, y0 + 3, 'iron', 10.6);
  S.hl(c - 2, gy, 5, 'gold', 7); S.px(c - 2, gy, 'gold', 10); S.px(c + 2, gy, 'gold', 9);
  for (let y = gy + 1; y < 77; y++) S.px(c, y, 'leather', (y - gy) % 2 ? 5 : 3.4);
  S.hl(c - 1, 77, 3, 'gold', 6); S.px(c - 1, 77, 'gold', 9);
  S.end();
}
const AGLINT = [[23, 10], [21, 18], [31, 12], [34, 56], [39, 52], [44, 57], [124, 38], [140, 38], [131, 48], [136, 71], [71, 49], [85, 49]];
const ABEAM = beam({ x: 76, y0: 11, y1: 90, w0: 3, w1: 10, fin: 8, c: '#d8e0ff', a: 0.32 });   // a pale shaft from the grate onto the helm; it blazes at the moment
// where the shaft lands: a pool on the plinth top and on the boards in front, two hard steps (inner 1 / outer 0), brighter with the grate light
const APOOL = (() => { const o = [], rows = [[82, 67, 86, 72, 81], [83, 66, 87, 71, 82], [90, 64, 89, 69, 84], [91, 62, 91, 67, 86], [92, 63, 90, 68, 85], [93, 66, 87, 72, 81]];
  rows.forEach(([y, a, b, c, d]) => { for (let x = a; x <= b; x++) o.push(y * W + x, x >= c && x <= d ? 1 : 0); }); return o; })();
const AWX = 101, AWY = 76, AWR = 8;   // the grindstone: centre, radius (it stands on two posts over the trough; the blade rests on its upper-left rim)
// the stone face-on: a dark rim, a lit arc upper left, a flat face darker than the wall, four dark grooves turning with it, an iron hub
function grindWheel(D, a) {
  const wx = AWX, wy = AWY, R = AWR;
  for (let y = wy - R; y < wy + R; y++) for (let x = wx - R; x < wx + R; x++) { const dx = x + 0.5 - wx, dy = y + 0.5 - wy, d = Math.hypot(dx, dy); if (d > R) continue;
    const edge = d > R - 2, s = dx + dy; D.px(x, y, 'stone', d > R - 1 ? 2.5 : edge && s < -R * 0.5 ? 9 : edge && s > R * 0.5 ? 4.5 : 5.5); }
  for (let k = 0; k < 4; k++) { const b = a + k * Math.PI / 2; rot([wx, wy], [Math.cos(b), Math.sin(b)], 2.4, R - 2, -1, 1, (x, y) => D.px(x, y, 'stone', 2.5)); }
  D.ell(wx, wy, 2.6, 2.6, 'iron', 2); D.ell(wx, wy, 1.6, 1.6, 'iron', 8, { dome: 1 });
}
X.def('armory', {
  amb: [0.22, 0.24],
  paint(S, sc) {
    X.shell(S, sc, 'medieval');
    sc.light({ x: 50, y: 28, z: 10, r: 54, i: 0.85, c: '#ffb060', fl: 'fire', tint: 0.42 });                  // 0 torch left
    sc.light({ x: 101, y: 28, z: 10, r: 54, i: 0.85, c: '#ffb060', fl: 'fire', ph: 2.3, tint: 0.42 });       // 1 torch right
    sc.light({ x: 76, y: 20, z: 18, r: 88, i: 0.8, c: '#c8d4ff', fl: 'pulse', amp: 0.06, sp: 0.8, tint: 0.2 }); // 2 ceiling grate (a light tint: the crimson banner stays crimson)
    sc.light({ x: 93, y: 65, z: 16, r: 40, i: 0.85, c: '#ffc060', tint: 0.5, bake: false });                     // 3 grinding sparks
    sc.light({ x: 27, y: 55, z: 14, r: 46, i: 0.6, c: '#ffc070', fl: 'candle', ph: 1.7, tint: 0.4 });       // 4 lantern on the rack
    sc.light({ x: 91, y: 66, z: 16, r: 34, i: 0.7, c: '#ffc070', fl: 'candle', ph: 0.6, tint: 0.35 });      // 5 oil lamp on the grindstone's post
    // grate in the ceiling beam, pale sky through the bars
    S.lay('wall'); S.beg(); S.box(67, 3, 19, 7, 'iron', 4); S.rect(69, 4, 15, 5, 'night', 4, { e: 255 }); for (let x = 70; x < 84; x += 3) S.vl(x, 4, 5, 'iron', 5); S.hl(69, 6, 15, 'iron', 3); S.end();
    // banner behind the armour: gold rod, crimson field, border, crossed swords over a shield, swallowtail hem
    S.lay('back');
    S.beg(); S.hcyl(58, 10, 37, 2, 'gold', 7); S.px(57, 10, 'gold', 9); S.px(95, 10, 'gold', 6); S.vgrad(62, 12, 29, 42, 'crimson', 5.8, 4.4);
    S.poly([[62, 54], [91, 54], [91, 62], [76.5, 55], [62, 62]], 'crimson', 4.4); S.vl(62, 12, 50, 'crimson', 6.6); S.vl(90, 12, 50, 'crimson', 3.4);
    S.vl(64, 14, 40, 'gold', 6.6); S.vl(88, 14, 40, 'gold', 5.4); S.hl(64, 14, 25, 'gold', 7.6);
    S.line(68, 18, 85, 35, 'iron', 9); S.line(85, 18, 68, 35, 'iron', 8.6); S.line(67, 19, 70, 16, 'gold', 7); S.line(86, 19, 83, 16, 'gold', 7); S.px(67, 15, 'gold', 8); S.px(86, 15, 'gold', 8);
    S.poly([[71, 22], [82, 22], [82, 29], [76.5, 34], [71, 29]], 'gold', 6.6); S.poly([[73, 24], [80, 24], [80, 28], [76.5, 31], [73, 28]], 'crimson', 6.6); S.px(76, 26, 'gold', 9);
    [[62, 62], [91, 62]].forEach(([x, y]) => { S.px(x, y, 'gold', 7); S.px(x, y + 1, 'gold', 5); }); S.end();
    // torches
    [50, 101].forEach(x => { S.beg(); S.box(x - 3, 34, 7, 3, 'iron', 5); S.line(x, 34, x, 29, 'wood', 6); S.px(x - 1, 29, 'wood', 4); S.px(x + 1, 29, 'wood', 4); S.end(); });
    // weapon rack: posts and rails; halberd, spear, glaive standing, three swords point-up in the lower rail
    S.beg(); S.box(7, 44, 3, 46, 'wood', 4.4); S.box(49, 44, 3, 46, 'wood', 4.4); S.end();
    S.beg(); S.vl(14, 15, 72, 'wood', 5.6); S.poly([[15, 18], [21, 16], [22, 25], [15, 26]], 'iron', 7); S.vl(21, 17, 8, 'iron', 10); S.poly([[13, 20], [10, 22], [13, 23]], 'iron', 6); S.poly([[13, 11], [15, 11], [14, 16]], 'iron', 8); S.end();
    S.beg(); S.vl(23, 17, 70, 'wood', 6); S.poly([[23, 9], [25.5, 13], [23, 19], [20.5, 13]], 'iron', 8); S.vl(23, 10, 8, 'iron', 10.4); S.hl(21, 18, 5, 'crimson', 6); S.end();
    S.beg(); S.vl(31, 20, 67, 'wood', 5); S.poly([[31, 10], [35, 14], [34, 21], [31, 21]], 'iron', 7.4); S.line(32, 12, 34, 20, 'iron', 10); S.end();
    S.beg(); S.box(6, 46, 47, 3, 'wood', 5.6, { top: 1 }); S.box(6, 79, 47, 4, 'wood', 5, { top: 1 }); for (let x = 12; x < 50; x += 8) S.px(x, 47, 'iron', 7); S.end();
    [[35, 52, 73], [40, 49, 71], [45, 53, 73]].forEach(([c, y0, gy]) => rackSword(S, c, y0, gy));   // after the rails: the pommels sit on the lower one
    S.beg(); S.vl(27, 49, 3, 'iron', 5); S.rect(25, 52, 5, 1, 'iron', 7); S.rect(24, 53, 7, 6, 'iron', 4); S.rect(25, 54, 5, 4, 'lamp', 8, { e: 5 }); S.vl(27, 54, 4, 'iron', 4); S.rect(25, 59, 5, 1, 'iron', 6); S.end();
    // shields on the right wall: a crimson heater with a gold chevron, a blue one with a white cross, a round buckler, crossed axes
    S.beg(); S.poly([[104, 14], [119, 14], [119, 25], [111.5, 34], [104, 25]], 'crimson', 6); S.poly([[104, 24], [111.5, 17], [119, 24], [119, 27], [111.5, 20], [104, 27]], 'gold', 7.4); S.hl(104, 14, 15, 'gold', 8); S.vl(104, 14, 12, 'gold', 7); S.vl(118, 14, 12, 'gold', 5); S.end();
    S.beg(); S.poly([[125, 14], [140, 14], [140, 25], [132.5, 34], [125, 25]], 'tile', 5); S.rect(131, 15, 3, 16, 'linen', 9); S.rect(126, 20, 14, 3, 'linen', 9); S.hl(125, 14, 15, 'iron', 8); S.vl(125, 14, 12, 'iron', 7); S.vl(139, 14, 12, 'iron', 5); S.end();
    // (a trophy right of the armourer, so the wall behind his lifted sword stays clear: the buckler over two crossed axes)
    S.beg(); S.line(125, 40, 139, 58, 'wood', 6); S.poly([[123, 38], [128, 36], [129, 43]], 'iron', 8); S.px(124, 38, 'iron', 10); S.line(139, 40, 125, 58, 'wood', 5); S.poly([[141, 38], [136, 36], [135, 43]], 'iron', 7); S.end();
    S.beg(); S.ell(132, 49, 6, 6, 'wood', 5.6, { dome: 1 }); S.ell(132, 49, 6, 6, 'iron', 6, { ring: 1 }); S.ell(132, 49, 2.2, 2.2, 'iron', 8, { dome: 1 }); S.px(131, 48, 'iron', 11); S.end();
    // the plinth and the armour
    S.lay('mid');
    S.beg(); S.box(60, 84, 33, 6, 'mstone', 6, { top: 2 }); S.hl(60, 86, 33, 'gold', 6); S.end();
    armorSuit(S);
    // where the shaft lands: a 1-px rim on the helm's crown and the pauldrons' inner shoulders
    for (let x = 72; x <= 80; x++) S.px(x, 38, 'iron', x === 75 || x === 76 ? 11 : 10.2, { n: [0, -0.8] });
    [[65.5, 67, 70], [87, 82, 85]].forEach(([cx, a, b]) => { for (let x = a; x <= b; x++) { const u = (x + 0.5 - cx) / 5; S.px(x, Math.round(51.5 - 4 * Math.sqrt(Math.max(0, 1 - u * u))), 'iron', 10.2, { n: [0, -0.8] }); } });
    // grindstone: two posts carry the axle in iron bearings over a trough of water (the wheel, crank and treadle are animated)
    S.lay('back'); [90, 109].forEach(x => { S.beg(); S.rect(x, 72, 3, 13, 'wood', 5.2); S.vl(x, 72, 13, 'wood', 6.6); S.vl(x + 2, 72, 13, 'wood', 3.8); S.hl(x, 72, 3, 'wood', 7.4);
      S.rect(x - 1, 75, 5, 3, 'iron', 5); S.hl(x - 1, 75, 5, 'iron', 8); S.px(x - 1, 76, 'iron', 7); S.px(x + 1, 76, 'iron', 2); S.end(); });
    S.beg(); S.rect(89, 70, 5, 2, 'brass', 6); S.hl(89, 70, 5, 'brass', 8.4); S.px(93, 71, 'brass', 4); S.px(88, 70, 'brass', 5); S.end();   // the oil lamp (its flame is animated)
    S.lay('mid'); S.beg(); S.box(89, 85, 25, 5, 'wood', 4.6, { top: 1 }); S.hl(89, 87, 25, 'wood', 3.4); TX.rivet(S, 91, 86, 'iron', 6); TX.rivet(S, 111, 86, 'iron', 6);
    for (let x = 91; x <= 111; x++) S.px(x, 84, 'water', x % 6 === 1 ? 7 : 4.6); S.end();
    // near the eye: a barrel of arrows, a strongbox with a kettle helm on it
    S.lay('front');
    [[5, 64], [7, 62], [9, 65], [11, 63], [13, 66]].forEach(([x, y]) => { S.beg(); S.vl(x, y + 3, 78 - y - 3, 'wood', 6); S.px(x - 1, y, 'linen', 8); S.px(x + 1, y, 'linen', 7); S.px(x - 1, y + 1, 'linen', 6); S.px(x + 1, y + 1, 'linen', 5); S.end(); });
    S.beg(); S.cyl(3, 76, 13, 14, 'wood', 5, { rim: 2.5 }); S.hcyl(3, 78, 13, 2, 'iron', 5); S.hcyl(3, 86, 13, 2, 'iron', 4); S.ell(9.5, 76, 6.5, 1.3, 'ink', 1); S.end();
    S.beg(); S.box(130, 80, 16, 10, 'wood', 4.4, { top: 3 }); S.vl(133, 77, 13, 'iron', 6); S.vl(142, 77, 13, 'iron', 6); S.rect(136, 82, 3, 3, 'gold', 8); S.end();
    S.beg(); S.ell(138, 74, 7, 1.6, 'iron', 6.6); S.ell(138, 72, 4, 3, 'iron', 7.4, { dome: 1 }); S.px(136, 71, 'iron', 10); S.end();
    foot(S, 60, 93); foot(S, 6, 52); foot(S, 89, 114, 1); foot(S, 130, 146); foot(S, 3, 16);
    beamLift(S, ABEAM, 0.9, ['wall', 'back']);
    // the pool of light on the plinth top and the boards in front of it (the pale wash over it follows the grate light, in post)
    S.lay('mid'); for (let i = 0; i < APOOL.length; i += 2) { const p = APOOL[i]; S.tone(p % W, (p / W) | 0, APOOL[i + 1] ? 1.3 : 0.7); }
    S.lay('wall'); for (let i = 0; i < APOOL.length; i += 2) { const p = APOOL[i]; S.tone(p % W, (p / W) | 0, APOOL[i + 1] ? 2.2 : 1.4); }
    sc.emit({ k: 'dust', x: 76, y: 50, w: 18, h: 60, rate: 2, sp: 2, life: 4 });
  },
  post(out, t, s, o, I) {
    // the shaft and its pool follow the grate light; at the moment they blaze to the cap within 0.15 s, hold, then settle over a second
    const st = s.st, gT = st.gt != null ? t - st.gt : 99, env = gT < 0 ? 0 : gT < 0.15 ? gT / 0.15 : gT < 0.7 ? 1 : gT < 1.7 ? 1.7 - gT : 0;
    const base = clamp(I[2] / 0.8, 0, 3), f = Math.max(base, Math.min(base, 1) * (1 + env * 2.4)), gp = st.gp;
    drawBeam(out, ABEAM, f, gp && gp.length ? (p) => gp.indexOf(p) >= 0 : null);   // the running glint stays on top
    const ai = Math.min(0.5, Math.floor(0.28 * f * 8) / 8), ao = Math.min(0.375, Math.floor(0.16 * f * 8) / 8);
    for (let i = 0; i < APOOL.length; i += 2) { const a = APOOL[i + 1] ? ai : ao; if (a > 0) X.blendPx(out, APOOL[i], ABEAM.rgb, a); }
  },
  anim(D, t, rs) {
    const st = rs.st, q = steps(t, 9), lift = q > 0.66 && q < 0.92, grind = !lift && q < 0.62; rs.mul[3] = 0;
    // grindstone: the stone turns (counter-clockwise, so its rim runs away from the armourer and the sparks fly left), fast
    // while he treads, coasting while he lifts; in front, the hub's crank and the rod down to the treadle (mid)
    const dt = st.wt == null ? 0 : clamp(t - st.wt, 0, 0.1); st.wt = t; st.wv = (st.wv || 0) + ((grind ? 7 : 2) - (st.wv || 0)) * (1 - Math.exp(-dt * 3));
    st.wa = ((st.wa || 0) - st.wv * dt) % (Math.PI * 2); const a = st.wa, wx = AWX, wy = AWY;
    D.lay('back'); grindWheel(D, a);
    D.lay('mid'); const ca = Math.cos(a), sa = Math.sin(a), pin = [Math.floor(wx + ca * 4.6), Math.floor(wy + sa * 4.6)], tr = sa * 1.6;
    ol(D, 86, 84, 124, 91, () => { D.beg(); D.line(95, 89, 117, 88 + Math.round(tr), 'wood', 6); D.px(95, 89, 'iron', 5); D.end(); });
    // the crank on the axle end and the thin rod down to the treadle (no outline: the stone's face stays clean)
    D.line(Math.floor(wx + ca * 1.8), Math.floor(wy + sa * 1.8), pin[0], pin[1], 'iron', 8.4); D.px(pin[0], pin[1], 'iron', 10.4); D.line(pin[0], pin[1] + 1, 105, 88 + Math.round(tr * 0.4), 'wood', 4.4);
    D.px(99 + Math.round(n1(t * 2) * 2), 84, 'water', 8);   // the stone's wet bottom stirs the water
    // the armourer: grinding (the blade laid on the stone's upper-left rim), then lifting the blade to the light
    const sx = 119, pose = lift ? { aF: 2.9, eF: -0.4, aB: 2.5, eB: -0.4, lean: -0.1, lF: 0.1, lB: -0.1 } : { aF: 2.2 + Math.sin(t * 3.2) * 0.06, eF: 0.4, aB: 2.0, eB: 0.3, lean: 0.35, lF: 0.25, lB: -0.3, kF: grind ? Math.max(0, Math.sin(a)) * 0.3 : 0 };
    man(D, sx, FY, 'smith', pose, -1);
    const hd = handAt(sx, FY, pose, -1), hands = !X.noWorkers;
    // grinding: the blade runs from the hand along the upper tangent to the stone and just past it; T is where it touches
    let T = null;
    if (hands && !lift) { const hx = hd[0] + 0.5, hy = hd[1] + 1, cx = wx - hx, cy = wy - hy, dd = Math.hypot(cx, cy), rr = AWR + 0.5, al = Math.asin(Math.min(1, rr / dd)), b0 = Math.atan2(cy, cx) + al, u = [Math.cos(b0), Math.sin(b0)], L = Math.sqrt(Math.max(0, dd * dd - rr * rr));
      T = [hx + u[0] * L, hy + u[1] * L]; st.bl = { hx, hy, u, L }; }
    if (hands) ol(D, hd[0] - 22, hd[1] - 24, hd[0] + 6, hd[1] + 8, () => { D.beg();
      if (lift) { const bx = hd[0], by = hd[1]; D.rect(bx, by - 1, 1, 3, 'leather', 4); D.hl(bx - 2, by - 2, 5, 'gold', 7); D.rect(bx, by - 18, 2, 16, 'iron', 8); D.vl(bx, by - 18, 16, 'iron', 10); D.px(bx, by - 19, 'iron', 11); }
      else { const { hx, hy, u, L } = st.bl, n = [u[1], -u[0]];
        for (let k = 1.5; k <= L + 2; k += 0.5) { const x = Math.floor(hx + u[0] * k), y = Math.floor(hy + u[1] * k); D.px(x, y, 'iron', k > L - 1 ? 11 : 10); D.px(x, y + 1, 'iron', 7); }
        for (let j = -2; j <= 2; j++) D.px(Math.floor(hx + u[0] * 1.5 + n[0] * j), Math.floor(hy + u[1] * 1.5 + n[1] * j), 'gold', Math.abs(j) === 2 ? 9 : 7);
        D.px(Math.floor(hx - u[0] * 2.5), Math.floor(hy - u[1] * 2.5), 'gold', 8); }
      D.end(); });
    if (lift && hands) { const g = (q - 0.66) / 0.26, gy = Math.round(hd[1] - 3 - g * 15); D.px(hd[0], gy, 'linen', 11, { e: 255 }); D.px(hd[0] + 1, gy, 'linen', 9, { e: 255 });
      if (q > 0.84 && !st.gl) { st.gl = 1; st.gt = t; rs.burst('glint', hd[0], hd[1] - 19, 3, { sp: 6, life: 0.7 }); rs.flash(2, 1.8); rs.flash(0, 0.6); rs.flash(1, 0.6);
        rs.burst('glint', 76, 58, 3, { sp: 8, life: 1, w: 10, h: 34 }); rs.burst('dust', 76, 56, 6, { sp: 9, life: 2.2, w: 12, h: 38 }); } }
    if (q < 0.5) st.gl = 0;
    // the moment lands: the shaft blazes and a glint runs down the armour's lit edges — helm ridge, breastplate, the planted sword
    const gT = st.gt != null ? t - st.gt : 99, gpx = st.gp || (st.gp = []); gpx.length = 0;
    if (gT >= 0.08 && gT < 0.48) { const PATH = [[38, 47], [51, 62], [69, 81]], L = 32; let s2 = (gT - 0.08) / 0.4 * L, gy = 81;
      for (const [y0, y1] of PATH) { if (s2 <= y1 - y0) { gy = Math.round(y0 + s2); break; } s2 -= y1 - y0; }
      [[0, 0, 11], [0, -1, 10], [0, -2, 8], [-1, 0, 10], [1, 0, 10], [-2, 0, 8], [2, 0, 8], [0, 1, 10], [0, 2, 8]].forEach(([dx, dy, tn]) => { D.px(76 + dx, gy + dy, 'linen', tn, { e: 255 }); gpx.push((gy + dy) * W + 76 + dx); }); }
    if (gT >= 0.46 && gT < 0.56 && !st.gs) { st.gs = 1; rs.burst('glint', 76, 81, 2, { sp: 6, life: 0.6 }); } if (gT > 1) st.gs = 0;
    // sparks off the wheel where the blade meets it
    if (grind && T) { if (R() < 0.85) rs.burst('spark', T[0] - 1, T[1], 1 + (R() < 0.4 ? 1 : 0), { sp: 34, ang: -1.55, spread: 0.6, life: 0.55, floor: 83 }); rs.mul[3] = 0.55 + 0.45 * R(); }
    // the plume on the helm sways; a glint slides down the breastplate now and then
    const sw = Math.sin(t * 1.1) * 1.2; for (let k = 0; k < 9; k++) { const f = k / 9, x = Math.round(76 + f * 8 + sw * f), y = Math.round(37 - Math.sin(f * 2.4) * 5 + f * 3); D.rect(x, y, 2, 2, 'linen', Math.round(9 - f * 3)); D.px(x, y, 'linen', Math.round(10 - f * 2)); if (k > 5) D.px(x + 1, y + 2, 'linen', 5); }
    const gp = steps(t, 5.5); if (gp < 0.25) { const gy = Math.round(51 + gp / 0.25 * 12); D.px(73, gy, 'linen', 11, { e: 255 }); D.px(73, gy - 1, 'iron', 11); }
    D.lay('back'); D.px(26, 56, 'lamp', 10 + (n1(t * 8) > 0.2 ? 1 : 0), { e: 255 }); D.px(28, 56, 'lamp', 10, { e: 255 });
    // the banner stirs in the rush of light: a 1-px ripple runs down its edges and along the swallowtail hem
    if (gT >= 0 && gT < 1.4) { const env = 1 - gT / 1.4, T = gT * 15;
      for (let y = 14; y < 62; y++) { const w = Math.sin(y * 0.55 - T) * env; if (w > 0.4) { D.px(61, y, 'crimson', 5.4); D.px(91, y, 'crimson', 3); } else if (w < -0.4) D.px(62, y, 'crimson', 8); }
      for (let x = 62; x <= 91; x++) { const ye = x <= 76 ? 62 - (x - 62) / 14.5 * 7 : 55 + (x - 76.5) / 14.5 * 7, w = Math.sin(x * 0.7 - T) * env; if (w > 0.35) D.px(x, Math.round(ye), 'crimson', 3.6); else if (w < -0.35) D.px(x, Math.round(ye) - 1, 'crimson', 6.4); } }
    // now and then a blade on the racks or the walls catches the light
    const gk = Math.floor(t / 1.7); if (st.gk !== gk) { st.gk = gk; const g = AGLINT[Math.floor(hh(gk, 7) * AGLINT.length)]; rs.burst('glint', g[0], g[1], 1, { sp: 1, life: 0.6 }); }
    // torches
    D.lay('back'); flame(D, 50, 28, 6, t, 0.7); flame(D, 101, 28, 6, t, 2.9); flame(D, 91, 69, 4, t, 1.3);
  },
});

// what each pixel room shows, in words (docs/effects.md §R is generated from M.ROOM_D)
const D_ = {
  ballista: '巨型弩炮架在木架上，弦已上好、大箭已搭上，斜指墙上的射口，射口外是月夜和地面的草；墙上的架子挂着一排大箭，桶里插着箭，吊灯在弩臂上方轻轻晃，火盆火苗翻动，月光从射口斜照进来、灰尘在光里飘；守卫扶着绞盘，不时使劲再绞几圈，弩臂吱呀往后一弯，梁上落下细灰；开火时弩臂猛地弹回，大箭拖着白光从射口飞出，木架一震、火花和尘土四起、吊灯被震得直晃，守卫再把弦绞回去',
  cannon: '长炮管架在铆钉炮架上，从铜圈炮口伸出去指着夜空；左边铁架上排着两层黑色圆弹，链条吊斗从地板口把炮弹一发发吊上来，地板口下透出弹药库的灯光，吊机顶上的汽机一边拉链一边冒汽、琥珀灯跟着转；炮手守着炮尾，不时转身从吊斗里抱出一发炮弹塞进炮膛，炮膛嘶地冒汽；前面摆着火药桶和一堆码成金字塔的炮弹；开火时炮口喷出一团火光、满屋一亮，炮管往后一坐，炮尾两侧喷出白汽，吊钩被震得来回摆',
  tesla: '线圈立在黑黄警示条的机柜上，底座上平盘着三圈铜管，中间的铜线绕得密密的，顶上是金属圆环和放电球，细小的电弧不停从球上窜出、在圆环上爬，不时一道电弧跳到两边的避雷杆上；左边闸刀开关偶尔冒火花，电容管里的电一格格涨，工程师拿着夹板看屏幕，地上盘着一卷黄色电缆；电容充满时两道大电弧同时打到避雷杆、满屋一白，工程师抬手挡脸；开火时电弧穿过天花板的导电口冲上地面，火花往下落，红色警示灯一闪',
  spire: '黄铜转台上架着一根紫水晶炮管，斜指墙角的射击口，口外是月夜和半个月亮，口沿结着冰凌、不时滴水；两道符环套在炮管上转，炮口前还悬着一道，一道亮光不停沿水晶往上跑；左边的充能线圈里紫光一路往上涌，两道符环绕着它上下转，能量顺着地上的导管流进炮座；技师戴着镜片、捧着书站在一旁，墙上架着备用水晶，烛台摇曳，头顶挂着几张符纸；技师举书念咒时符文飞向炮尾、符环收紧、水晶一亮、炮口冒出冷雾；开火时符环猛地收紧往前冲，一道紫蓝光束从射击口射出，口沿震落一片蓝白冰晶，冷雾涌进来',
  armory: '一整套板甲立在石台上，双手按着插在身前的长剑，身后挂着绣交叉双剑的红旗，头顶铁格窗漏下一道淡白的光柱照在头盔上，在石台和地板上照出一块亮斑，灰尘在光里飘，白色羽饰轻轻摆；左边架子上立着长戟、长矛和三把尖头长剑，右墙挂着两面纹章盾，一面圆盾压在两把交叉的斧头上，刀刃不时闪一下；两边火把摇曳，木柱上的油灯跳着小火苗，水槽上两根木柱架着一块圆磨石，铠甲匠踩着踏板，磨石上的四道深槽跟着转，他把剑压在磨石左上边、火花飞溅；磨好后他把剑举到光下，光柱猛地大亮、地上的亮斑跟着变亮，一道亮光从头盔顺着胸甲滑到剑上，光里的灰尘打着旋，旗边轻轻一抖',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
