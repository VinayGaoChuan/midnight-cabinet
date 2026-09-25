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
function stamp(D, spr, dx, dy) { for (let i = 0; i < spr.length; i += 7) D.put(spr[i] + dx, spr[i + 1] + dy, spr[i + 2], spr[i + 3], spr[i + 4], spr[i + 5], spr[i + 6]); }
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
// a long iron barrel with brass bands on a riveted carriage, aimed up through a brass-rimmed port; a copper boiler with a
// glowing firebox, a pressure gauge and a whistle feeds its breech through a hose; shells in a rack, a hoist hook. The gunner
// loads a shell now and then; a shot: muzzle flash in the port, the barrel kicks back, steam bursts from the breech.
const CU = [2 / Math.sqrt(5), -1 / Math.sqrt(5)], CV = [-CU[1], CU[0]], C0 = [82, 60];   // barrel axis, across it, trunnion
const cp_ = (s, p) => [C0[0] + CU[0] * s + CV[0] * p, C0[1] + CU[1] * s + CV[1] * p];
const crad = (s) => (s < -14 ? 8 : s >= 45 ? 5.5 : 6.5 - (s + 14) / 59 * 2);
let CSPR = null;
function cannonSpr() {
  return CSPR || (CSPR = bakeSpr((S) => {
    S.beg();
    rot(C0, CU, -22, 52, -10, 10, (x, y, s, p) => {
      let r = crad(s), m = s < -14 ? 'copper' : s >= 45 ? 'brass' : 'iron', t0 = s < -14 ? 6 : s >= 45 ? 6.5 : 5.6;
      if ([-13, -1, 15, 31].some(b => s >= b && s < b + 2.3)) { r += 1; m = 'brass'; t0 = 6.5; }
      if (Math.abs(p) > r) return; const q = p / r;
      let tn = t0 + (q < -0.6 ? 2.3 : q < -0.15 ? 1 : q < 0.45 ? 0 : -1.5);
      if (s < -21 || s > 50.5) tn -= 1.6;
      S.px(x, y, m, tn, { n: [CV[0] * q * 0.85, CV[1] * q * 0.85] });
    });
    // rivets on the chamber, a brass steam line along the top of the barrel
    for (let s = -20; s < -14; s += 3) [-5, 5].forEach(p => { const a = cp_(s, p); S.px(a[0], a[1], 'copper', 9); });
    for (let s = -12; s < 34; s += 0.5) { const a = cp_(s, -crad(s) - 1.6); S.px(a[0], a[1], 'brass', 7.5, { n: [0, -0.6] }); }
    [2, 20].forEach(s => { const a = cp_(s, -crad(s) - 0.8); S.px(a[0], a[1], 'iron', 3); });
    // the handwheel on the breech cap
    const hw = cp_(-23, 0); S.ell(hw[0], hw[1], 3.5, 3.5, 'crimson', 6, { ring: 1 }); S.line(hw[0] - 3, hw[1], hw[0] + 3, hw[1], 'crimson', 5); S.line(hw[0], hw[1] - 3, hw[0], hw[1] + 3, 'crimson', 5); S.px(hw[0], hw[1], 'brass', 8);
    S.end();
  }));
}
function shellSpr(D, s, p, clipS) {   // a brass shell lying along the barrel's axis, nose forward
  rot(C0, CU, s, s + 12, p - 2.6, p + 2.6, (x, y, ss, pp) => { if (clipS != null && ss > clipS) return; const q = (pp - p) / 2.6, nose = ss > s + 8; if (nose && Math.abs(pp - p) > (s + 12 - ss) * 0.7) return;
    D.px(x, y, nose ? 'iron' : 'brass', (nose ? 6 : 6.5) + (q < -0.3 ? 2 : q > 0.4 ? -1.5 : 0)); });
}
X.def('cannon', {
  amb: [0.3, 0.3],
  paint(S, sc) {
    X.shell(S, sc, 'steam');
    sc.light({ x: 21, y: 70, z: 18, r: 72, i: 1.1, c: '#ff7a30', fl: 'fire', tint: 0.5 });                  // 0 firebox
    sc.light({ x: 72, y: 17, z: 16, r: 96, i: 0.8, c: '#ffd8a0', fl: 'candle', ph: 2, tint: 0.25 });         // 1 caged bulb
    sc.light({ x: 104, y: 22, z: 6, r: 34, i: 0.6, c: '#ff3a30', fl: 'pulse', amp: 0.5, sp: 2.2, tint: 0.6 }); // 2 warning lamp
    sc.light({ x: 124, y: 38, z: 12, r: 112, i: 1, c: '#ffc070', tint: 0.5, bake: false });                   // 3 muzzle flash (dark until a shot)
    sc.light({ x: 129, y: 34, z: 3, r: 46, i: 0.45, c: '#a8b8ff', tint: 0.4 });                              // 4 night through the port
    // the port: a brass ring with bolts, iris blades drawn back, the sky beyond
    S.lay('wall');
    for (let y = 22; y < 51; y++) for (let x = 115; x < 144; x++) { const d = Math.hypot(x + 0.5 - 129, y + 0.5 - 36), a = Math.atan2(y + 0.5 - 36, x + 0.5 - 129);
      if (d < 10) S.px(x, y, 'night', 1.3 + (y - 26) / 20 * 2.2, { e: 255 });
      else if (d < 11.2) S.px(x, y, 'iron', ((a * 8 / Math.PI) % 1 + 1) % 1 < 0.5 ? 2.5 : 4);
      else if (d < 14) S.px(x, y, 'brass', 6 + (d < 12.2 ? -1.5 : 0) - Math.sin(a) * 0.8 + Math.cos(a) * 0.3, { n: [Math.cos(a) * 0.5, Math.sin(a) * 0.5] }); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; TX.rivet(S, 129 + Math.cos(a) * 12.5 - 0.5, 36 + Math.sin(a) * 12.5 - 0.5, 'brass', 6); }
    [[124, 30], [134, 29], [131, 42], [122, 39]].forEach(([x, y], i) => S.px(x, y, 'linen', i % 2 ? 8 : 6, { e: 255 }));
    S.lay('back');
    // boiler: dome, body, brass bands with rivets, whistle, firebox door that glows, gauge face (needle animated)
    S.beg(); S.cyl(19, 19, 4, 10, 'brass', 6, { rim: 1.5 }); S.box(17, 17, 8, 3, 'brass', 7); S.end();
    S.beg(); S.ell(21, 34, 13, 6, 'copper', 6, { dome: 1 }); S.cyl(8, 34, 26, 50, 'copper', 5, { rim: 2.5 });
    [40, 57, 80].forEach(y => { S.hcyl(7, y, 28, 3, 'brass', 6, { rim: 1.5 }); for (let x = 10; x < 33; x += 4) S.px(x, y + 1, 'brass', 9); });
    for (let y = 45; y < 56; y += 5) for (let x = 11; x < 32; x += 6) S.px(x + (y % 10 ? 3 : 0), y, 'copper', 8);
    S.box(5, 84, 32, 6, 'iron', 5, { top: 2 }); S.end();
    S.beg(); S.box(12, 62, 18, 16, 'iron', 4); for (let k = 0; k < 3; k++) { S.rect(14, 65 + k * 4, 14, 2, 'fire', 6 - k * 0.5, { e: 1 }); S.hl(14, 65 + k * 4, 14, 'fire', 8, { e: 1 }); } S.rect(28, 67, 2, 5, 'brass', 7); S.end();
    S.beg(); S.ell(21, 48, 6.5, 6.5, 'brass', 6, { ring: 1.4 }); S.ell(21, 48, 5, 5, 'linen', 9); for (let k = 0; k < 7; k++) { const a = Math.PI * (0.8 + k * 0.233); S.px(21 + Math.cos(a) * 4, 48 + Math.sin(a) * 4, 'ink', 1); } S.px(24, 46, 'red', 7); S.px(25, 47, 'red', 7); S.end();
    // steam main from the boiler, down to where the hose takes over
    S.beg(); S.hcyl(34, 44, 26, 4, 'brass', 5, { rim: 1.5 }); S.cyl(56, 44, 4, 9, 'brass', 5, { rim: 1.5 }); S.box(55, 52, 6, 2, 'iron', 6); S.hcyl(40, 43, 3, 6, 'brass', 7); S.ell(47, 40, 3, 3, 'crimson', 6, { ring: 1 }); S.vl(47, 41, 3, 'brass', 6); S.end();
    // shell rack behind the gunner
    S.beg(); S.box(36, 76, 10, 14, 'wood', 4, { top: 1 }); S.hl(36, 82, 10, 'wood', 6); S.end();
    [37, 41].forEach((x, i) => { S.beg(); S.cyl(x, 67 - i, 4, 9 + i, 'brass', 6.5, { rim: 1.5 }); S.poly([[x, 67 - i], [x + 2, 62 - i], [x + 4, 67 - i]], 'iron', 6); S.hl(x, 72, 4, 'brass', 4.5); S.end(); });
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
    // traverse handwheel on the cheek
    S.beg(); S.ell(94, 71, 4.5, 4.5, 'brass', 7, { ring: 1 }); S.line(90, 71, 98, 71, 'brass', 5); S.line(94, 67, 94, 75, 'brass', 5); S.px(94, 71, 'iron', 8); S.px(98, 68, 'crimson', 7); S.end();
    // a crate of shells near the eye, noses up
    S.lay('front');
    [127, 132, 137, 142].forEach((x, i) => { const y = 68 + (i % 2); S.beg(); S.cyl(x, y, 4, 9, 'brass', 7, { rim: 1.5 }); S.poly([[x, y], [x + 2, y - 5], [x + 4, y]], 'copper', 6.5); S.px(x + 1, y - 3, 'copper', 9); S.hl(x, y + 2, 4, 'brass', 4.5); S.vl(x + 1, y + 3, 4, 'brass', 9); S.end(); });
    S.beg(); S.box(125, 77, 21, 13, 'wood', 5, { top: 2 }); S.hl(125, 83, 21, 'wood', 3); S.rect(129, 79, 13, 3, 'ink', 2); for (let k = 0; k < 3; k++) S.px(131 + k * 4, 80, 'gold', 7); S.vl(127, 77, 13, 'iron', 5); S.vl(143, 77, 13, 'iron', 5); S.end();
    foot(S, 5, 37); foot(S, 36, 46, 1); foot(S, 56, 114); foot(S, 125, 146);
    sc.emit({ k: 'steam', x: 40, y: 8, rate: 0.5, sp: 4, ang: 0.3, spread: 0.6, life: 1.5 });
  },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 12); rs.mul[3] = 0;
    if (fired(rs, t)) { const m = cp_(55, 0), b = cp_(-17, -8); rs.flash(3, 2.4); rs.flash(0, 0.4); rs.flash(2, 0.6); st.swing = 1;
      rs.burst('steam', m[0], m[1], 12, { sp: 20, ang: 1.1, spread: 1, life: 1.5 }); rs.burst('spark', m[0], m[1], 12, { sp: 55, ang: 1.1, spread: 1, life: 0.6 }); rs.burst('ember', m[0], m[1], 5, { sp: 18, ang: 1.1, spread: 1.4, life: 1.2 });
      rs.burst('steam', b[0], b[1], 6, { sp: 14, ang: -0.5, spread: 0.7, life: 1.1 }); const c = cp_(-17, 8); rs.burst('steam', c[0], c[1], 5, { sp: 12, ang: 3.6, spread: 0.7, life: 1 }); }
    // recoil: back along the axis, easing home
    const kick = fa < 0.05 ? fa / 0.05 * 5 : fa < 0.9 ? 5 * Math.pow(1 - (fa - 0.05) / 0.85, 2) : 0, kx = -Math.round(CU[0] * kick), ky = -Math.round(CU[1] * kick);
    D.lay('back');
    // corrugated hose from the steam main to the breech, sagging
    const hb = cp_(-17, -9); ol(D, 50, 50, 72, 68, () => { D.beg(); for (let k = 0; k <= 10; k++) { const f = k / 10, x = 58 + (hb[0] + kx - 58) * f - Math.sin(f * Math.PI) * 3, y = 54 + (hb[1] + ky - 1 - 54) * f; D.rect(x - 1, y - 1, 3, 3, 'leather', k % 2 ? 3 : 5); D.px(x - 1, y - 1, 'leather', 7); } D.end(); });
    stamp(D, cannonSpr(), kx, ky);
    // muzzle flash
    if (fa < 0.16) { const m = cp_(55, 0), k = 1 - fa / 0.16, wob = hh(Math.floor(fa * 60), 3);
      const ray = (ux, uy, L) => { for (let i = 0; i < L; i++) { const tn = clamp(11 - i / L * 6, 5, 11); D.px(m[0] + ux * i, m[1] + uy * i, 'fire', tn, { e: 255 }); if (i < L * 0.5) D.px(m[0] + ux * i + 1, m[1] + uy * i, 'fire', tn - 1, { e: 255 }); } };
      D.ell(m[0], m[1], 4 + k * 5, 3 + k * 4, 'fire', 7, { e: 255 }); D.ell(m[0], m[1], 2.5 + k * 3.5, 2 + k * 3, 'fire', 9, { e: 255 }); D.ell(m[0], m[1], 1.5 + k * 2, 1.5 + k * 1.5, 'fire', 11, { e: 255 });
      ray(CU[0], CU[1], 10 + 12 * k + wob * 3); ray(CV[0], CV[1], 5 + 5 * k); ray(-CV[0], -CV[1], 5 + 5 * k); ray((CU[0] + CV[0]) * 0.7, (CU[1] + CV[1]) * 0.7, 6 + 5 * k * wob); ray((CU[0] - CV[0]) * 0.7, (CU[1] - CV[1]) * 0.7, 6 + 5 * k * (1 - wob)); }
    // gauge: trembles; falls at the shot and climbs back
    const pr = fa < 1.6 ? 0.25 + fa / 1.6 * 0.5 : 0.75 + Math.sin(t * 0.7) * 0.06, na = Math.PI * (0.8 + 1.4 * pr) + n1(t * 18) * 0.05;
    D.line(21, 48, 21 + Math.cos(na) * 4, 48 + Math.sin(na) * 4, 'red', 6); D.px(21, 48, 'iron', 3);
    // whistle: a thin plume, a bigger one when the pressure is let off after loading
    if (R() < 0.08) rs.burst('steam', 21, 16, 1, { sp: 6, ang: 0.2, spread: 0.5, life: 1 });
    // caged bulb, warning lamp glass
    D.rect(71, 16, 3, 3, 'lamp', 9, { e: 255 }); D.px(72, 17, 'lamp', 11, { e: 255 }); D.px(70, 17, 'iron', 3); D.px(74, 17, 'iron', 3);
    D.rect(101, 21, 7, 3, 'red', 7, { e: 3 }); D.hl(102, 21, 5, 'red', 9, { e: 3 });
    // the moment: the gunner turns to the rack, lifts a shell and pushes it into the breech; the seal hisses
    D.lay('mid');
    let pose, dir = 1, gx = 51, carry = null;
    if (fa < 0.45) pose = { aF: 2.4, eF: 0.3, aB: 0.5, lean: -0.35, lF: 0.25, lB: -0.3 };
    else if (q < 0.55) pose = { aF: 1.35, eF: -0.2, aB: 0.2, eB: -0.2, lF: 0.15, lB: -0.15, bob: Math.round(Math.sin(t * 1.4) * 0.5) };
    else if (q < 0.66) { dir = -1; pose = { aF: 0.8, eF: -0.2, aB: 0.6, lean: 0.55, lF: 0.1, lB: -0.2, kB: 0.4 }; }
    else if (q < 0.82) { const k = (q - 0.66) / 0.16; pose = { aF: 1.35, eF: -0.9, aB: 1.2, eB: -0.9, lF: 0.2, lB: -0.2, lean: 0.2 }; carry = k; }
    else pose = { aF: 1.5, eF: -0.1, aB: 1.3, eB: -0.1, lean: 0.3, lF: 0.35, lB: -0.3 };
    man(D, gx, FY, { skin: ['skin', 6], hair: ['hair', 4], top: ['leather', 5], bot: ['denim', 3], boot: ['hair', 2], apron: ['leather', 3], cap: ['brass', 7] }, pose, dir);
    if (!X.noWorkers) { D.px(gx + 1, FY - 25 + (pose.bob || 0), 'teal', 9); D.px(gx + 2, FY - 25 + (pose.bob || 0), 'brass', 8); if (carry != null) shellSpr(D, -44 + carry * 20, 0, -22); }   // goggles, the shell in his hands
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
// a carved stone column on a stepped plinth, gold claws reaching up to a floating amethyst; two rune rings turn round it,
// small shards orbit, a clock-sigil's hand crawls round the floor. Violet braziers either side, a bookshelf with books
// drifting off it, a mage at a lectern, candles on the floor. The moment: the mage lifts his hands, runes stream from the
// book to the crystal, the rings race. A shot: a beam up through the oculus, the crystal flares, a ring of force runs out.
const SC_ = [75, 36];
function crystal(D, cx, cy, fl, t) {   // a hexagonal amethyst: lit left face, front face, dark right face, pointed ends
  const hl = ((t * 0.3) % 1.8) - 0.4;
  for (let y = -21; y <= 14; y++) { const w = y < -10 ? Math.round((y + 21) / 11 * 6.4) : y <= 6 ? 6 : Math.round((14 - y) / 8 * 6.4); if (w <= 0) { if (y === -21) D.px(cx, cy + y, 'arcane', 11, { e: 255 }); continue; }
    for (let x = -w; x <= w; x++) { const face = x < -2 ? 0 : x <= 2 ? 1 : 2, top = y < -10, bot = y > 6, u = (x + 6) / 12, lit = Math.abs(u - hl) < 0.1 && !bot;
      let tn = top ? [10, 8.5, 6][face] : bot ? [7, 5, 3.5][face] : [8.5, 6.5, 4.2][face];
      if (x === -2 || (x === -3 && y < -10)) tn += 1.5; if (x === 3) tn -= 0.8; if (y === -10 && face < 2) tn += 1; if (lit) tn += 2;
      if (!top && !bot && face === 1 && ((y + 40) % 7 === 0)) tn += 0.8;
      D.px(cx + x, cy + y, 'arcane', clamp(Math.round(tn + fl), 2, 11), { e: 255 }); } }
  D.px(cx - 4, cy - 7, 'arcane', 11, { e: 255 }); D.px(cx - 4, cy - 6, 'arcane', 11, { e: 255 }); D.px(cx - 4, cy - 5, 'arcane', 10, { e: 255 });
}
// is (x, y) on the crystal drawn at (cx, cy)? (the same silhouette as crystal())
function inCrys(x, y, cx, cy) { const dy = Math.round(y) - cy; if (dy < -21 || dy > 14) return false; const w = dy < -10 ? Math.round((dy + 21) / 11 * 6.4) : dy <= 6 ? 6 : Math.round((14 - dy) / 8 * 6.4); return Math.abs(Math.round(x) - cx) <= w; }
function ringV(D, cx, cy, Rr, phi, tilt, spin, front, tn, ccy) {   // a circle turned phi about the vertical axis, tilted in the picture
  const n = Math.ceil(Rr * 7), ct = Math.cos(tilt), stl = Math.sin(tilt), ec = Math.abs(Math.cos(phi)), edge = front && ec < 0.6, dk = ec < 0.35 ? 2 : 1;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), x = Rr * c * Math.cos(phi), y = Rr * Math.sin(a), z = c * Math.sin(phi); if ((z >= 0) !== front) continue;
    const rune = (((a + spin) / (Math.PI * 2) * 9) % 1 + 1) % 1 < 0.13, X0 = cx + x * ct - y * stl, Y0 = cy + x * stl + y * ct;
    // nearly edge-on, the near half runs down the crystal's face: there it is a thin darker line, no rune ticks
    if (edge && inCrys(X0, Y0, cx, ccy)) { D.px(X0, Y0, 'arcane', tn - dk, { e: 255 }); continue; }
    D.px(X0, Y0, 'arcane', (rune ? 11 : tn) - (front ? 0 : 3), { e: 255 }); D.px(X0 + 1, Y0, 'arcane', (rune ? 10 : tn - 2) - (front ? 0 : 3), { e: 255 }); }
}
function ringH(D, cx, cy, rx, ry, spin, front, tn) {   // a flat ring seen from a little above: a bright outer band, a darker inner one
  const n = Math.ceil(rx * 7);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; if ((Math.sin(a) >= 0) !== front) continue; const rune = (((a + spin) / (Math.PI * 2) * 12) % 1 + 1) % 1 < 0.14, dk = front ? 0 : 3;
    D.px(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 'arcane', (rune ? 11 : tn) - dk, { e: 255 }); D.px(cx + Math.cos(a) * (rx - 1.3), cy + Math.sin(a) * (ry - 0.9), 'arcane', (rune ? 9 : tn - 3) - dk, { e: 255 }); }
}
const BOOKS = [];
{ const r = X.rng(311); for (let s = 0; s < 5; s++) { let x = 6; while (x < 17) { const w = 1 + (r() < 0.3 ? 1 : 0), h = 6 + Math.floor(r() * 4); BOOKS.push([x, 38 + s * 11 - h, w, h, ['crimson', 'leaf', 'tile', 'gold', 'magic', 'leather'][Math.floor(r() * 6)], 5 + r() * 2]); x += w + (r() < 0.2 ? 1 : 0); } } }
const FCAND = [[35, 83, 1.1], [39, 81, 2.3], [44, 84, 0.4]];   // on open floor between the left brazier and the plinth
X.def('spire', {
  amb: [0.24, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'magic');                                                                                        // 0 carved runes
    sc.light({ x: 75, y: 34, z: 14, r: 106, i: 1.1, c: '#9a7cff', fl: 'pulse', amp: 0.12, sp: 1.7, tint: 0.62 });   // 1 crystal
    sc.light({ x: 25, y: 42, z: 10, r: 54, i: 0.7, c: '#c090ff', fl: 'fire', tint: 0.55 });                        // 2 brazier left
    sc.light({ x: 125, y: 42, z: 10, r: 54, i: 0.7, c: '#c090ff', fl: 'fire', ph: 2.5, tint: 0.55 });              // 3 brazier right
    sc.light({ x: 106, y: 55, z: 21, r: 40, i: 0.65, c: '#ffb060', fl: 'candle', tint: 0.34 });                   // 4 lectern candle (on the flame)
    sc.light({ x: 39, y: 76, z: 22, r: 38, i: 0.6, c: '#ffb060', fl: 'candle', ph: 3, tint: 0.45 });              // 5 floor candles
    S.lay('wall');
    // oculus in the ceiling, a violet night beyond
    S.beg(); for (let y = 3; y < 10; y++) for (let x = 62; x < 89; x++) { const d = Math.abs(x + 0.5 - 75.5) / 13; if (d > 1) continue; S.px(x, y, d > 0.8 ? 'gold' : 'night', d > 0.8 ? 6 + (x < 75 ? 1 : -1) : 2 + (y - 3) * 0.3, d > 0.8 ? {} : { e: 255 }); } S.end();
    S.px(70, 5, 'linen', 9, { e: 255 }); S.px(80, 6, 'linen', 7, { e: 255 });
    // floor clock-sigil: rim, twelve marks (glows with the crystal; its hand turns in anim)
    for (let k = 0; k < 220; k++) { const a = k / 220 * Math.PI * 2; S.px(75 + Math.cos(a) * 52, 97 + Math.sin(a) * 5.2, 'arcane', 5, { e: 2 }); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.px(75 + Math.cos(a) * 47, 97 + Math.sin(a) * 4.6, 'arcane', 7, { e: 2 }); S.px(75 + Math.cos(a) * 45, 97 + Math.sin(a) * 4.4, 'arcane', 6, { e: 2 }); }
    S.lay('back');
    // bookshelf in the left corner
    S.beg(); S.box(4, 22, 16, 68, 'wood', 3.5); S.rect(6, 24, 12, 64, 'wood', 1.5); for (let s = 0; s < 6; s++) S.box(5, 38 + s * 11, 14, 2, 'wood', 5); S.end();
    BOOKS.forEach(([x, y, w, h, m, tn]) => { S.rect(x, y, w, h, m, tn); S.px(x, y, m, tn + 1.5); S.px(x, y + 2, 'gold', 7); });
    // braziers on stone pillars (violet flames are animated)
    [25, 125].forEach(x => { S.beg(); S.box(x - 5, 56, 11, 34, 'magic', 6); S.hl(x - 5, 70, 11, 'magic', 4); S.box(x - 7, 54, 15, 3, 'magic', 8, { top: 1 }); S.box(x - 6, 86, 13, 4, 'magic', 7); S.vl(x, 60, 8, 'arcane', 6, { e: 2 }); S.end();
      S.beg(); S.poly([[x - 7, 46], [x + 8, 46], [x + 5, 53], [x - 4, 53]], 'gold', 5); S.hl(x - 7, 46, 15, 'gold', 8); S.hl(x - 6, 47, 13, 'gold', 3); S.vl(x, 53, 1, 'gold', 4); S.end();
      for (let i = -5; i <= 5; i++) S.px(x + i, 45, 'arcane', 7 + (i % 2), { e: x < 75 ? 3 : 4 }); });
    // the plinth, the column with a capital, a glowing rune channel, gold claws reaching up
    S.lay('mid');
    S.beg(); S.box(48, 85, 54, 5, 'magic', 7, { top: 2 }); S.box(56, 80, 38, 5, 'magic', 8, { top: 2 }); S.hl(56, 80, 38, 'gold', 7); S.hl(48, 85, 54, 'gold', 6); S.end();
    S.beg(); S.poly([[65, 80], [85, 80], [83, 57], [67, 57]], 'magic', 6.5); S.poly([[65, 80], [68, 80], [69, 57], [67, 57]], 'magic', 9); S.poly([[82, 80], [85, 80], [83, 57], [81, 57]], 'magic', 4.2);
    [70, 79].forEach(x => S.vl(x, 60, 18, 'magic', 4.5)); for (let y = 60; y < 78; y += 3) { S.px(75, y, 'arcane', 8, { e: 2 }); S.px(75, y + 1, 'arcane', 6, { e: 2 }); if ((y / 3) % 2) S.px(74, y + 1, 'arcane', 7, { e: 2 }); else S.px(76, y + 2, 'arcane', 7, { e: 2 }); }
    S.box(63, 54, 24, 4, 'magic', 8, { top: 1 }); S.hl(63, 57, 24, 'gold', 6.5); S.box(65, 51, 20, 3, 'gold', 6); S.end();
    [[-1, 66], [1, 84]].forEach(([sg, x]) => { S.beg(); S.line(x, 51, x - sg * 3, 45, 'gold', 7, { w: 2 }); S.line(x - sg * 3, 45, x - sg * 3, 40, 'gold', 6.5, { w: 2 }); S.line(x - sg * 3, 40, x - sg * 5, 37, 'gold', 8); S.px(x - sg * 5, 36, 'gold', 10); S.end(); });
    S.beg(); S.line(75, 51, 75, 48, 'gold', 5, { w: 2 }); S.end();
    // lectern with an open book and a candle
    S.beg(); S.box(99, 71, 4, 17, 'wood', 5); S.box(95, 87, 12, 3, 'wood', 4); S.poly([[92, 68], [108, 64], [109, 67], [93, 71]], 'wood', 6); S.hl(93, 71, 15, 'wood', 3); S.end();
    S.beg(); S.poly([[93, 67], [100, 64.5], [100, 66.5], [94, 69]], 'paper', 9); S.poly([[100, 64.5], [107, 62.5], [107, 64.5], [100, 66.5]], 'paper', 8); for (let k = 0; k < 3; k++) { S.px(95 + k * 2, 67 - k * 0.8, 'paper', 5); S.px(102 + k * 2, 64.5 - k * 0.6, 'paper', 5); } S.vl(100, 64, 3, 'paper', 4); S.end();
    S.beg(); S.rect(106, 58, 2, 5, 'linen', 9); S.px(106, 62, 'linen', 7); S.hl(105, 63, 4, 'gold', 6); S.end();
    // near the eye: candles on the floor, wax pooled round them
    S.lay('front');
    FCAND.forEach(([x, y]) => { S.beg(); S.rect(x - 1, y, 3, 90 - y, 'linen', 8); S.px(x - 1, y, 'linen', 10); S.px(x + 1, y + 2, 'linen', 6); S.end(); });
    S.beg(); S.rect(32, 88, 15, 2, 'linen', 6); S.hl(33, 88, 13, 'linen', 8); S.end();
    foot(S, 48, 102, 1.1); foot(S, 4, 20); foot(S, 18, 32); foot(S, 118, 132); foot(S, 95, 107, 1); foot(S, 32, 47, 0.8);
    sc.emit({ k: 'rune', x: 75, y: 80, w: 40, rate: 1, sp: 3, ang: 0, spread: 0.5, life: 2.4 });
    sc.emit({ k: 'soul', x: 75, y: 50, w: 8, rate: 0.8, sp: 5, ang: 0, spread: 0.3, life: 2.4 });
  },
  anim(D, t, rs) {
    const st = rs.st, fa = fage(rs), q = steps(t, 10), cast = q > 0.62 && q < 0.86;
    const dt = st.lt == null ? 0 : clamp(t - st.lt, 0, 0.1); st.lt = t;
    const boost = (fa < 1.5 ? 5 * (1 - fa / 1.5) : 0) + (cast ? 2.5 : 0); st.sa = (st.sa || 0) + dt * (0.8 + boost); st.sb = (st.sb || 0) + dt * (0.55 + boost * 0.7);
    const bob = Math.sin(t * 1.4) * 1.6, cx = SC_[0], cy = Math.round(SC_[1] + bob), flare = fa < 0.3 ? 3 * (1 - fa / 0.3) : cast ? 0.8 : 0;
    if (fired(rs, t)) { rs.flash(1, 2.2); rs.flash(2, 0.4); rs.flash(3, 0.4); rs.burst('rune', cx, cy, 16, { sp: 30, life: 1.3 }); rs.burst('glint', cx, cy - 21, 4, { sp: 18, life: 0.5 }); }
    D.lay('mid');
    // back halves of the rings, shards behind, the crystal, then the front halves
    const phi = st.sb, orb = (front) => { for (let i = 0; i < 3; i++) { const a = st.sa * 0.8 + i * 2.094, z = Math.sin(a); if ((z >= 0) !== front) continue; const x = Math.round(cx + Math.cos(a) * 29), y = Math.round(cy + 4 + Math.sin(a) * 6), dk = front ? 0 : 2;
      D.px(x, y - 3, 'arcane', 10 - dk, { e: 255 }); D.rect(x - 1, y - 2, 3, 3, 'arcane', 7 - dk, { e: 255 }); D.px(x - 1, y - 2, 'arcane', 10 - dk, { e: 255 }); D.px(x + 1, y, 'arcane', 4 - dk, { e: 255 }); D.px(x, y + 1, 'arcane', 5 - dk, { e: 255 }); } };
    ringH(D, cx, cy + 4, 25, 5.5, st.sa, false, 8); ringV(D, cx, cy - 3, 19, phi, 0.35, -st.sa * 1.3, false, 8); orb(false);
    ol(D, cx - 9, cy - 24, cx + 9, cy + 17, () => { D.beg(); crystal(D, cx, cy, flare, t); D.end(); });
    ringH(D, cx, cy + 4, 25, 5.5, st.sa, true, 8); ringV(D, cx, cy - 3, 19, phi, 0.35, -st.sa * 1.3, true, 8, cy); orb(true);
    // a shot: a beam up through the oculus, a ring of force out across the floor
    if (fa < 0.35) { const w = Math.round(3 * (1 - fa / 0.35)) + 1; for (let y = 4; y < cy - 20; y++) for (let x = -w; x <= w; x++) { if (hh(Math.floor(t * 30), y * 7 + x) < 0.15 && Math.abs(x) === w) continue; D.px(cx + x, y, 'arcane', Math.abs(x) < w - 1 ? 11 : 9, { e: 255 }); } }
    if (fa < 0.7) { const rx = 14 + fa / 0.7 * 50, ry = rx * 0.1; D.lay('wall'); for (let k = 0; k < 140; k++) { const a = k / 140 * Math.PI * 2; if (hh(k, 3) < fa) continue; D.px(cx + Math.cos(a) * rx, 97 + Math.sin(a) * ry, 'arcane', 10, { e: 255 }); } D.lay('mid'); }
    // the floor clock's hand crawls round
    D.lay('wall'); const ha = t * 0.25; D.line(75, 97, 75 + Math.cos(ha) * 40, 97 + Math.sin(ha) * 4, 'arcane', 7, { e: 255 }); D.px(75, 97, 'arcane', 10, { e: 255 });
    // violet brazier flames, candles
    D.lay('back'); [[25, 'fL'], [125, 'fR']].forEach(([x, k]) => { const f = fireSim(st[k] || (st[k] = {}), 13, 13, t, 0.82, 0.42);
      for (let y = 0; y < 13; y++) for (let i = 0; i < 13; i++) { const v = f[y * 13 + i]; if (v < 5 || Math.abs(i - 6) > 1.2 + y * 0.55) continue; D.px(x - 6 + i, 33 + y, 'arcane', clamp(2.5 + v / 36 * 9, 4, 11), { e: 255 }); } });
    D.lay('mid'); flame(D, 106, 57, 3, t, 1.1);
    D.lay('front'); FCAND.forEach(([x, y, ph]) => flame(D, x, y - 1, 4, t, ph));
    // two open books drifting off the shelf, pages flapping
    D.lay('back');
    [[33, 22, 0, 'crimson'], [44, 31, 2.2, 'tile']].forEach(([x, y, ph, m]) => { const by = Math.round(y + Math.sin(t * 0.9 + ph) * 2.5), bx = Math.round(x + Math.sin(t * 0.5 + ph) * 2), fp = Math.round(Math.sin(t * 4 + ph) * 1.6);
      ol(D, bx - 8, by - 7, bx + 8, by + 5, () => { D.beg(); D.line(bx - 5, by - 1, bx, by + 1, m, 6, { w: 2 }); D.line(bx, by + 1, bx + 5, by - 1, m, 4, { w: 2 }); D.poly([[bx - 5, by - 2], [bx, by], [bx, by - 1], [bx - 4, by - 3]], 'paper', 9); D.poly([[bx, by - 1], [bx, by], [bx + 5, by - 2], [bx + 4, by - 3]], 'paper', 7);
        D.line(bx, by - 1, bx + 3, by - 3 - fp, 'paper', 10); D.px(bx - 2, by - 2, 'paper', 5); D.px(bx + 2, by - 2, 'paper', 4); D.end(); });
      if (hh(Math.floor(t * 3 + ph), 9) < 0.25) D.px(bx + Math.round(Math.sin(t * 5 + ph) * 3), by + 4, 'arcane', 9, { e: 255 }); });
    // the mage reads; at the moment lifts both hands and runes stream from the book to the crystal
    D.lay('mid');
    const pose = cast || fa < 0.4 ? { aF: 2.6, eF: 0.2, aB: 2.3, eB: 0.3, lean: 0.1 } : { aF: 2.0, eF: -0.4, aB: 1.5, eB: -0.5, lean: 0.25, bob: Math.round(Math.sin(t * 1.2) * 0.5) };
    man(D, 115, FY, { skin: ['skin', 6], hair: ['linen', 9], top: ['tile', 5], bot: ['tile', 3], boot: ['tile', 2], robe: 1, hood: ['tile', 6], beard: ['linen', 9] }, pose, -1);
    if (cast) { if (R() < 0.5) rs.burst('rune', 100 + R() * 5, 63, 1, { sp: 20, ang: -1.1, spread: 0.4, life: 1.2 }); if (!st.c && q > 0.8) { st.c = 1; rs.flash(1, 0.9); rs.burst('glint', cx, cy, 5, { sp: 20, life: 0.6 }); } } if (q < 0.5) st.c = 0;
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
  cannon: '长炮管架在铆钉炮架上，从铜圈炮口伸出去指着夜空；铜锅炉的炉门透着火光，压力表指针抖动，汽管和软管接到炮尾；炮手戴着护目镜，不时转身从弹架取一发炮弹塞进炮膛，炮膛嘶地冒汽；开火时炮口喷出一团火光、满屋一亮，炮管往后一坐，炮尾两侧喷出白汽，吊钩被震得来回摆',
  tesla: '线圈立在黑黄警示条的机柜上，底座上平盘着三圈铜管，中间的铜线绕得密密的，顶上是金属圆环和放电球，细小的电弧不停从球上窜出、在圆环上爬，不时一道电弧跳到两边的避雷杆上；左边闸刀开关偶尔冒火花，电容管里的电一格格涨，工程师拿着夹板看屏幕，地上盘着一卷黄色电缆；电容充满时两道大电弧同时打到避雷杆、满屋一白，工程师抬手挡脸；开火时电弧穿过天花板的导电口冲上地面，火花往下落，红色警示灯一闪',
  spire: '台阶上的石柱托着一块悬浮的紫水晶，金爪向上托着它，两道符环绕着它转、三块碎晶绕着飞，地上一圈钟面法阵的指针慢慢走；两边石柱的金盆里燃着满满的紫色火焰，书架边两本书飘在空中翻页，石台前的地上点着几支蜡烛，蓝袍法师在讲台前读书；法师举手时符文从书上流向水晶、符环转快；开火时一道光束从水晶冲出屋顶的圆孔，一圈力场沿地面扩散',
  armory: '一整套板甲立在石台上，双手按着插在身前的长剑，身后挂着绣交叉双剑的红旗，头顶铁格窗漏下一道淡白的光柱照在头盔上，在石台和地板上照出一块亮斑，灰尘在光里飘，白色羽饰轻轻摆；左边架子上立着长戟、长矛和三把尖头长剑，右墙挂着两面纹章盾，一面圆盾压在两把交叉的斧头上，刀刃不时闪一下；两边火把摇曳，木柱上的油灯跳着小火苗，水槽上两根木柱架着一块圆磨石，铠甲匠踩着踏板，磨石上的四道深槽跟着转，他把剑压在磨石左上边、火花飞溅；磨好后他把剑举到光下，光柱猛地大亮、地上的亮斑跟着变亮，一道亮光从头盔顺着胸甲滑到剑上，光里的灰尘打着旋，旗边轻轻一抖',
};
if (M.ROOM_D) Object.assign(M.ROOM_D, D_);
})();
