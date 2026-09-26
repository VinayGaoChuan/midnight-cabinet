// ==== mc-pxroom-e.js ====
(function () {
// Pixel rooms, batch e (written by the pixel-room workflow; see mc-pxroom-a.js for the pattern, docs/design.md §10.1)
// 沃尔夫斯堡工厂 wolfsburg · 威尼斯兵工厂 venice · 鲁尔区 ruhr · 埃菲尔铁塔 eiffel · 马丘比丘 machu
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, worker, stroll, n1 } = X;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;   // 0…1 phase of a repeating cycle
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
// keyframed path: keys [[phase, x, y], …] over 0…1, eased between keys
function kf(q, keys) { for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (q >= a[0] && q <= b[0]) { const k = ease((q - a[0]) / Math.max(1e-6, b[0] - a[0])); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; } } const l = keys[keys.length - 1]; return [l[1], l[2]]; }
// a round bar between two points (robot arms, cranks): lit on its upper-left side, dark on its lower-right
function capsule(D, x0, y0, x1, y1, r, m, t) {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1, ln = Math.sqrt(l2), px = -dy / ln, py = dx / ln, sgn = (px + py) > 0 ? -1 : 1;
  for (let y = Math.floor(Math.min(y0, y1) - r); y <= Math.ceil(Math.max(y0, y1) + r); y++) for (let x = Math.floor(Math.min(x0, x1) - r); x <= Math.ceil(Math.max(x0, x1) + r); x++) {
    const u = clamp(((x - x0) * dx + (y - y0) * dy) / l2, 0, 1), qx = x - (x0 + dx * u), qy = y - (y0 + dy * u), d = Math.hypot(qx, qy); if (d > r) continue;
    const s = (qx * px + qy * py) / (r || 1) * sgn;   // −1 (lit side) … 1 (shade side)
    D.px(x, y, m, t - s * 1.3 + (s < -0.5 ? 0.6 : 0), { n: [px * s * -sgn * 0.8, py * s * -sgn * 0.8] });
  }
}
// two-link arm: elbow on the upper side; returns [elbow, hand]
function ik(sx, sy, tx, ty, l1, l2) {
  const dx = tx - sx, dy = ty - sy, d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.3), a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const e1 = [sx + Math.cos(a - b) * l1, sy + Math.sin(a - b) * l1], e2 = [sx + Math.cos(a + b) * l1, sy + Math.sin(a + b) * l1], e = e1[1] < e2[1] ? e1 : e2;
  const hx = sx + Math.cos(a) * d, hy = sy + Math.sin(a) * d; return [e, [hx, hy]];
}
function flame(D, x, y, s, t, ph) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, 'fire', clamp(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// selective outline for something just painted into a dyn layer (the painter's end() outlines only reach the static
// layers): every empty pixel next to this frame's pixels in the box gets the neighbour's material, lit on top / left
function dynOutline(D, x0, y0, x1, y1) {
  const L = D.c, st = L.st, stamp = L.stamp; if (!L.pl) return; const Wd = W, add = [];
  const on = (x, y) => (x < 0 || y < 0 || x >= Wd || y >= H) ? -1 : (st[y * Wd + x] === stamp && L.m[y * Wd + x] && !L.e[y * Wd + x] ? y * Wd + x : -1);
  x0 = Math.max(0, Math.round(x0)); y0 = Math.max(0, Math.round(y0)); x1 = Math.min(Wd - 1, Math.round(x1)); y1 = Math.min(H - 1, Math.round(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const p = y * Wd + x; if (st[p] === stamp && L.m[p]) continue;
    const up = on(x, y + 1), lf = on(x + 1, y), dn = on(x, y - 1), rt = on(x - 1, y), q = up >= 0 ? up : lf >= 0 ? lf : dn >= 0 ? dn : rt; if (q < 0) continue; add.push([x, y, L.m[q], up >= 0 || lf >= 0 ? 1 : 0]); }
  add.forEach(([x, y, m, t]) => D.px(x, y, m, t));
}
function figure(D, x, y, look, pose, dir) { worker(D, x, y, look, pose, dir); dynOutline(D, x - 9, y - 31, x + 9, y + 1); }
// rim light from a hot point (a welding arc): this frame's pixels in the box whose side faces (lx, ly) turn to a glowing
// edge of `m`, brighter the closer they are — the pixel-art way to wash coloured things in a strongly coloured flash
function rimLight(D, x0, y0, x1, y1, lx, ly, rmax, m, amt) {
  const L = D.c, st = L.st, stamp = L.stamp; if (!L.pl) return; const hits = [];
  for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) { const p = y * W + x; if (st[p] !== stamp || !L.m[p] || L.e[p]) continue;
    const dx = lx - x, dy = ly - y, d = Math.hypot(dx, dy); if (d > rmax || d < 1) continue; const nx = x + Math.round(dx / d), ny = y + Math.round(dy / d), q = ny * W + nx;
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && st[q] === stamp && L.m[q]) continue; hits.push(x, y, d); }
  for (let i = 0; i < hits.length; i += 3) D.px(hits[i], hits[i + 1], m, clamp(6 + amt * 4 - hits[i + 2] / rmax * 3, 5, 11), { e: 255 });
}
// hazard stripes (gold / ink diagonals) over a box
// re-colour a polygon of the current layer: pixels of ramp `from` keep their tone on ramp `to` (a warm light pool baked in
// as a warm ramp, so the room pays no per-frame tint for it)
function remat(S, pts, from, to) {
  const Y = S.c, a = X.MI[from], b = X.MI[to]; let y0 = 1e9, y1 = -1e9; pts.forEach(q => { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(H - 1, Math.ceil(y1)); y++) { const cy = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; if ((p[1] <= cy && q[1] > cy) || (q[1] <= cy && p[1] > cy)) xs.push(p[0] + (cy - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
    xs.sort((m, n) => m - n); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) { const p = y * W + x; if (Y.m[p] === a) Y.m[p] = b; } }
}
// a polygon's filled span on row y, the same pixels S.poly fills there: [x0, x1) or null
function polySpan(pts, y) {
  const cy = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; if ((p[1] <= cy && q[1] > cy) || (q[1] <= cy && p[1] > cy)) xs.push(p[0] + (cy - p[1]) / (q[1] - p[1]) * (q[0] - p[0])); }
  if (xs.length < 2) return null; xs.sort((m, n) => m - n); return [Math.round(xs[0]), Math.round(xs[xs.length - 1])];
}
function hazard(S, x, y, w, h, t) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const k = ((xx + yy) >> 1) & 1; S.px(xx, yy, k ? 'gold' : 'ink', k ? (t || 7) : 2); } }

// ═════════ 沃尔夫斯堡工厂 wolfsburg (steam · forge · legendary) ═════════
// An indexed assembly line: chassis roll in through a strip curtain; a yellow robot arm lifts a painted body off its
// pallet and lowers it onto the chassis; a second arm welds the seams in a shower of sparks under a blue arc light;
// the car stops under the golden inspection gate, a scan line sweeps it, its headlights come on — and every third car
// comes out gilded (the building's "quality +1"), with a flash of gold, glints and the foreman cheering on the catwalk,
// and a wave of gold runs back up the line past both lamps. A row of tally lamps on the gate beam lights one lamp per
// finished car (gold for a gilded one) and starts over at six. Two green-shaded lamps throw warm pools on the line and the
// floor; the welding arc washes the arms in blue; on the floor, yellow-and-black hazard paint, a parts tug shuttling
// between stations, and the polished inspection bay mirroring the cars' lamps.
const WB = { P: 3.6, MV: 0.28, YB: 80 };   // cycle: move 28 %, dwell; stations at x 30 / 62 / 94 / 126
const WCOL = [['crimson', 7], ['denim', 7], ['linen', 8], ['leaf', 7], ['denim', 8], ['crimson', 8]];
// the little car, facing right: 20 px long; stage 0 chassis · 1 body · 2 welded (chrome) · 3 finished (lights on)
const CAR = [
  '......rrrrrr........',
  '....rrwwwrwwwr......',
  '...rbwwwwbwwwwb.....',
  '..rbbbbbbbbbbbbbr...',
  '.rbbbbbbbbbbbbbbbrr.',
  'rbbbbbbbbbbbbbbbbbbl',
  'tbbffffbbbbbbbffffbb',
  'bbf.....bbbbbbf....b',
  'xx.......dddd.....xx',
];
function carBody(D, cx, yb, mat, tn, stage, sheen, gold) {
  const x0 = Math.round(cx) - 10, y0 = yb - 12, m = gold ? 'gold' : mat, t = gold ? 7.5 : tn;
  const pal = { r: [m, t + 1.6, { n: [0, -0.8] }], b: [m, t], f: [m, t - 1.2, { n: [0, -0.5] }], d: [m, t - 2.2], w: ['glass', stage >= 3 ? 6 : 4], l: stage >= 3 ? ['lamp', 11, { e: 255 }] : ['lamp', 6], t: stage >= 3 ? ['red', 8, { e: 255 }] : ['red', 5], x: stage >= 2 ? ['iron', 9] : ['iron', 4] };
  D.spr(x0, y0, CAR, pal); D.px(x0 + 6, y0 + 2, 'glass', 9); D.px(x0 + 11, y0 + 2, 'glass', 8); D.hl(x0 + 4, y0 + 7, 1, m, t - 1);
  if (sheen != null) { for (let j = 0; j < 9; j++) for (let i = 0; i < 20; i++) { const d = i + j * 0.6 - sheen; if (d > -1 && d < 1.5 && CAR[j][i] !== '.') D.px(x0 + i, y0 + j, gold ? 'gold' : 'linen', gold ? 11 : 10, { e: 255 }); } }
}
function carChassis(D, cx, yb, stage) {
  const x = Math.round(cx);
  D.rect(x - 9, yb - 5, 19, 2, 'iron', 6); D.hl(x - 9, yb - 5, 19, 'iron', 8);
  if (stage < 1) { D.rect(x - 9, yb - 9, 5, 4, 'iron', 7); D.hl(x - 9, yb - 9, 5, 'iron', 9); D.px(x - 8, yb - 7, 'copper', 8); D.px(x - 6, yb - 7, 'copper', 8);   // engine at the back
    D.rect(x - 2, yb - 11, 2, 6, 'crimson', 5); D.hl(x - 2, yb - 11, 2, 'crimson', 7); D.rect(x - 2, yb - 7, 5, 2, 'crimson', 4); D.vl(x + 5, yb - 9, 4, 'iron', 6); D.hl(x + 4, yb - 10, 3, 'iron', 8); }
  // wheels: tyre, hubcap, a spoke that turns while the line moves
  [x - 6, x + 5].forEach(wx => { D.ell(wx + 0.5, yb - 2, 2.4, 2.4, 'ink', 1.4, { e: 255 }); D.px(wx - 1, yb - 3, 'ink', 2, { e: 255 }); D.px(wx, yb - 3, 'iron', 4); D.rect(wx, yb - 2, 1, 1, 'iron', stage >= 2 ? 9 : 6); const a = -cx / 2.2; D.px(Math.round(wx + Math.cos(a) * 1.6), Math.round(yb - 2 + Math.sin(a) * 1.6), 'iron', 5); });
}
function robot(D, sx, sy, hand, tool, open) {
  const RC = 'lamp';
  const [e, h] = ik(sx, sy, hand[0], hand[1], 17, 15), ax = e[0] - sx, ay = e[1] - sy, al = Math.hypot(ax, ay) || 1, fx = h[0] - e[0], fy = h[1] - e[1], fl = Math.hypot(fx, fy) || 1;
  // upper arm with its motor pack, elbow housing with a counter-motor behind it, forearm
  capsule(D, sx, sy, e[0], e[1], 2.7, RC, 5.6);
  capsule(D, e[0] - fx / fl * 5, e[1] - fy / fl * 5, e[0], e[1], 2.2, 'iron', 5); D.px(e[0] - fx / fl * 5, e[1] - fy / fl * 5, 'iron', 8);
  capsule(D, e[0], e[1], h[0] - fx / fl * 2, h[1] - fy / fl * 2, 1.9, RC, 6);
  D.ell(e[0], e[1], 2.4, 2.4, RC, 7, { dome: 1 }); D.px(e[0], e[1], 'ink', 2); D.px(e[0] - 1, e[1] - 1, RC, 9);
  // cable loop along the upper arm
  D.px(sx + ax * 0.5 - ay / al * 3, sy + ay * 0.5 + ax / al * 3, 'ink', 2); D.px(sx + ax * 0.3 - ay / al * 3, sy + ay * 0.3 + ax / al * 3, 'ink', 2);
  // wrist + tool (tools hang straight down)
  const hx = Math.round(h[0]), hy = Math.round(h[1]);
  D.rect(hx - 1, hy - 1, 3, 3, 'iron', 6); D.hl(hx - 1, hy - 1, 3, 'iron', 8);
  if (tool === 'grip') { const g = open ? 3 : 2; D.hl(hx - g, hy + 1, g * 2 + 1, 'iron', 5); D.vl(hx - g, hy + 1, 3, 'iron', 7); D.vl(hx + g, hy + 1, 3, 'iron', 5); }
  else { D.rect(hx, hy + 1, 2, 2, 'copper', 7); D.px(hx + 1, hy + 3, 'copper', 5); D.px(hx + 2, hy + 4, 'iron', 3); }
  // shoulder: a rocker housing on the turntable, a motor on its side
  D.poly([[sx - 5, sy + 4], [sx + 5, sy + 4], [sx + 4, sy - 2], [sx - 3, sy - 4]], RC, 5.4); D.hl(sx - 3, sy - 3, 6, RC, 7.5); D.ell(sx, sy, 2.2, 2.2, 'iron', 4, { dome: 1 }); D.px(sx - 1, sy - 1, 'iron', 8); D.rect(sx + 3, sy, 3, 3, 'iron', 6);
  return [hx, hy];
}
// the gate beam's tally lamps (x of each lens centre, y 52) and the cog badge between the two groups
const WB_LAMPS = [111, 116, 121, 131, 136, 141], COG = ['.#.#.', '#####', '##.##', '#####', '.#.#.'];
X.def('wolfsburg', {
  amb: [0.19, 0.26],
  paint(S, sc) {
    X.shell(S, sc, 'steam');
    const L = {};
    // the two green-shaded lamps: each light sits where its beam lands (the line), the cone above it is baked
    L.a = sc.light({ x: 30, y: 80, z: 22, r: 36, i: 1.2, c: '#ffd494', tint: 0.4 });                              // pool under the pallet lamp
    L.b = sc.light({ x: 74, y: 80, z: 22, r: 36, i: 1.2, c: '#ffd494', tint: 0.4 });                              // pool under the arms' lamp
    L.arc = sc.light({ x: 72, y: 54, z: 20, r: 64, i: 1.4, c: '#9ad8ff', tint: 0.7, bake: false });                  // welding arc between the arms (off at rest, kicked)
    L.gate = sc.light({ x: 126, y: 74, z: 20, r: 44, i: 0.9, c: '#ffc848', tint: 0.32 });                           // golden gate: its light bar washes the car and the bay
    L.scr = sc.light({ x: 137, y: 32, z: 8, r: 30, i: 0.6, c: '#70ffb0', fl: 'screen', tint: 0.5 });                  // foreman's console
    WB.L = L;
    // the golden reveal: a beam of gold drops through the gate when a gilded car comes out (deterministic in t)
    sc.shaft({ x: 126, y0: 58, y1: 88, w0: 7, w1: 11, i: 0.6, haze: 0.38, c: '#ffd870', f: (t) => { const n = Math.floor(t / WB.P), ph = t / WB.P - n; if ((((n - 3) % 3) + 3) % 3 || ph < 0.6) return 0; return ph < 0.66 ? (ph - 0.6) / 0.06 : Math.max(0, 1 - (ph - 0.66) / 0.3); } });
    // ── wall: a long run of steel factory windows with the night outside ──
    S.lay('wall');
    const win = (x0, w) => {
      S.beg(); S.box(x0 - 2, 12, w + 4, 28, 'iron', 6); S.end();
      S.vgrad(x0, 14, w, 24, 'night', 1.6, 3.4, { e: 255 });
      // far works: chimneys and a saw-tooth roof in silhouette, a moon glow in one pane
      for (let x = x0; x < x0 + w; x++) { const roof = 33 - ((x * 3) % 7 < 4 ? (x * 3) % 7 : 7 - (x * 3) % 7); for (let y = roof; y < 38; y++) S.px(x, y, 'night', 0.6, { e: 255 }); }
      [[x0 + 5, 20], [x0 + w - 7, 24]].forEach(([cx, top]) => { S.rect(cx, top, 3, 38 - top, 'night', 0.4, { e: 255 }); S.px(cx + 1, top + 1, 'red', 6, { e: 255 }); });
      for (let y = 14; y < 38; y += 6) S.hl(x0, y, w, 'iron', 4); for (let x = x0 + 7; x < x0 + w; x += 7) S.vl(x, 14, 24, 'iron', 4);
      S.hl(x0 - 2, 39, w + 4, 'iron', 8, { n: [0, -0.8] });
    };
    win(8, 26); win(40, 26); win(72, 20);
    // moon in the middle window, stars
    S.ell(58, 19, 3, 3, 'bone', 9, { e: 255 }); S.px(57, 18, 'bone', 10, { e: 255 }); S.px(59, 20, 'bone', 7, { e: 255 });
    [[12, 16], [27, 18], [45, 26], [66, 16], [77, 20], [86, 17]].forEach(([x, y]) => S.px(x, y, 'linen', 8, { e: 255 }));
    // lamp cones on the wall under the shades, moonlight under the windows (baked)
    S.shadow([[8, 40], [92, 40], [100, 62], [16, 62]], -0.5);
    [30, 74].forEach(x => { S.shadow([[x - 4, 23], [x + 5, 23], [x + 15, 88], [x - 14, 88]], -0.9); S.shadow([[x - 2, 23], [x + 3, 23], [x + 8, 88], [x - 7, 88]], -0.7); });
    // strip-curtain doorways, left (chassis in) and right (cars out)
    [[4, 62, 12], [138, 62, 8]].forEach(([x, y, w]) => { S.rect(x, y, w, 20, 'ink', 1); S.hl(x, y - 1, w, 'iron', 7); hazard(S, x, y - 4, w, 3); });
    // ── back: robot pedestals, the body pallet, the golden gate, the hanging lamps ──
    S.lay('back');
    [46, 80].forEach(x => { S.beg(); S.box(x - 6, 65, 12, 15, 'iron', 5); hazard(S, x - 6, 65, 12, 3); S.hcyl(x - 5, 62, 10, 3, 'iron', 7, { rim: 1.5 }); S.rect(x - 1, 71, 3, 2, 'screen', 8, { e: 255 }); S.vl(x + 4, 69, 9, 'iron', 3); S.end(); });
    // body pallet on a stand
    S.beg(); S.box(12, 60, 20, 3, 'iron', 6, { top: 1 }); S.vl(14, 63, 17, 'iron', 4); S.vl(29, 63, 17, 'iron', 4); S.end();
    // gate: posts, beam with the counter, gold trim, a light bar under it
    S.beg(); S.box(110, 56, 4, 32, 'iron', 5); S.box(138, 56, 4, 32, 'iron', 5); hazard(S, 110, 80, 4, 8); hazard(S, 138, 80, 4, 8);
    S.box(106, 48, 40, 9, 'iron', 4); S.hl(106, 48, 40, 'gold', 8); S.hl(106, 56, 40, 'gold', 6); S.end();
    // six round tally lamps in brass sockets (lit one per finished car in anim), a brass cog badge between the groups
    WB_LAMPS.forEach(x => { S.beg(); S.hl(x - 1, 50, 3, 'brass', 7); S.vl(x - 2, 51, 3, 'brass', 6); S.vl(x + 2, 51, 3, 'brass', 4); S.hl(x - 1, 54, 3, 'brass', 3.6);
      S.rect(x - 1, 51, 3, 3, 'glass', 2); S.px(x - 1, 51, 'glass', 5); S.end({ ink: 1 }); });
    for (let x = 108; x < 145; x += 5) if (!WB_LAMPS.some(l => Math.abs(l - x) < 3) && Math.abs(x - 126) > 3) TX.rivet(S, x, 51, 'iron', 4);
    S.beg(); S.spr(124, 50, COG, { '#': ['brass', 6.6] }); S.px(124, 51, 'brass', 9); S.px(125, 50, 'brass', 9); S.px(126, 52, 'ink', 0); S.end({ ink: 1 });
    S.rect(113, 57, 26, 1, 'lamp', 10, { e: L.gate + 1 }); for (let x = 114; x < 139; x += 3) S.px(x, 57, 'lamp', 11, { e: L.gate + 1 });
    // beacon housing on the gate
    S.beg(); S.box(124, 45, 5, 3, 'iron', 6); S.end();
    // overhead hanger rail (hangers move in anim)
    S.beg(); S.rect(4, 11, 94, 2, 'iron', 6); S.hl(4, 11, 94, 'iron', 8); for (let x = 10; x < 98; x += 22) S.vl(x, 8, 3, 'iron', 4); S.end();
    // hanging lamps: green enamel shades
    [30, 74].forEach(x => { S.beg(); S.vl(x, 10, 9, 'iron', 4); S.poly([[x - 5, 22], [x + 6, 22], [x + 3, 18], [x - 2, 18]], 'leaf', 5); S.hl(x - 5, 22, 11, 'leaf', 7); S.hl(x - 1, 18, 3, 'leaf', 8); S.end(); S.rect(x - 2, 23, 5, 1, 'lamp', 10, { e: 255 }); S.px(x, 24, 'lamp', 11, { e: 255 }); });
    // catwalk to the right, with the foreman's console
    S.beg(); S.box(128, 26, 16, 17, 'iron', 5, { top: 1 }); S.rect(130, 28, 12, 7, 'screen', 2, { e: 255 }); S.rect(130, 36, 5, 4, 'screen', 2, { e: 255 }); S.rect(137, 36, 5, 4, 'screen', 2, { e: 255 });
    for (let x = 131; x < 141; x += 2) S.px(x, 33 - (x % 3), 'screen', 7, { e: 255 }); S.end();
    S.lay('mid');
    S.beg(); S.box(98, 43, 48, 3, 'iron', 6, { top: 1 }); for (let x = 100; x < 146; x += 3) S.px(x, 44, 'iron', 3); S.poly([[98, 46], [104, 46], [98, 52]], 'iron', 4); S.end();
    S.beg(); S.hl(98, 34, 48, 'iron', 8); S.hl(98, 38, 48, 'iron', 6); for (let x = 99; x < 146; x += 8) S.vl(x, 34, 9, 'iron', 7); S.end();
    // ── the floor: station numbers with flow arrows, the cart lane, the polished inspection bay, the lamps' pools ──
    S.lay('wall');
    // floor paint: a yellow-and-black lane line along the conveyor, a striped stop mark under each station
    [30, 62, 94].forEach(x => hazard(S, x - 3, 90, 7, 3, 6));
    hazard(S, 4, 95, 103, 2, 6);
    // inspection bay in front of the gate: a polished brass plate edged in gold, its own station number
    S.rect(107, 90, 39, 11, 'brass', 3); S.hl(107, 90, 39, 'brass', 5, { n: [0, -0.8] }); hazard(S, 107, 90, 2, 11, 6); S.vl(109, 91, 10, 'brass', 1);
    for (let x = 110; x < 146; x += 6) S.vl(x, 91, 10, 'brass', 2);
    // the gate's light bar mirrored in the plate: broken gold streaks that breathe with the gate
    [[92, 113, 139, 3, 2, 7], [94, 116, 136, 2, 3, 6], [97, 119, 133, 2, 4, 5], [99, 122, 130, 1, 4, 4]].forEach(([y, a, b, on, off, tn]) => { for (let x = a; x < b; x++) if ((x - a) % (on + off) < on) S.px(x, y, 'lamp', tn, { e: L.gate + 1 }); });
    // light pools under the two lamps (and on the line, below): bright, warm with the lights above them
    [30, 74].forEach(x => { remat(S, [[x - 11, 90], [x + 12, 90], [x + 17, 101], [x - 16, 101]], 'iron', 'mstone'); S.shadow([[x - 11, 90], [x + 12, 90], [x + 17, 101], [x - 16, 101]], -1.2); S.shadow([[x - 6, 90], [x + 7, 90], [x + 10, 101], [x - 9, 101]], -0.6); });
    S.shadow([[108, 90], [146, 90], [146, 101], [108, 101]], -0.7);
    S.lay('mid');
    // ── mid: the conveyor ──
    S.beg(); S.rect(4, 80, 142, 8, 'iron', 3); S.hl(4, 80, 142, 'iron', 6, { n: [0, -0.8] }); S.hl(4, 81, 142, 'iron', 2); S.hl(4, 87, 142, 'iron', 5);
    for (let x = 10; x < 146; x += 24) { S.rect(x, 88, 3, 2, 'iron', 5); } S.end();
    [30, 74].forEach(x => { remat(S, [[x - 11, 80], [x + 12, 80], [x + 14, 90], [x - 13, 90]], 'iron', 'mstone'); S.shadow([[x - 13, 80], [x + 14, 80], [x + 16, 90], [x - 15, 90]], -1); });
    // ── front: a pendant control box on its cable, a yellow safety bollard, a stack of tyres by the exit ──
    S.lay('front');
    S.beg(); S.vl(9, 8, 38, 'ink', 2); S.box(6, 46, 7, 12, 'gold', 6); S.rect(8, 48, 3, 2, 'ink', 2); S.px(8, 52, 'screen', 8, { e: 255 }); S.px(10, 52, 'red', 7); S.px(8, 55, 'iron', 8); S.px(10, 55, 'iron', 8); S.end();
    S.beg(); S.cyl(15, 86, 5, 15, 'gold', 6, { rim: 2 }); for (let y = 88; y < 101; y += 4) S.rect(15, y, 5, 2, 'ink', 2); S.ell(17.5, 86, 2.5, 1, 'gold', 8); S.end();
    for (let k = 0; k < 4; k++) { S.beg(); S.rect(137, 86 - k * 4, 11, 4, 'ink', 2); S.hl(137, 86 - k * 4, 11, 'iron', 4); S.rect(140, 87 - k * 4, 5, 2, 'iron', 2); S.end(); }
  },
  anim(D, t, rs) {
    const st = rs.st, L = WB.L; rs.mul[L.arc] = 0; const P = WB.P, yb = WB.YB, n = Math.floor(t / P), ph = t / P - n, mvq = ph < WB.MV ? ease(ph / WB.MV) : 1, moving = ph < WB.MV;
    const beltOff = (n + mvq) * 32;
    // overhead hangers carry tyres past the windows (behind the lamps)
    D.lay('wall');
    for (let k = 0; k < 6; k++) { const x = ((k * 19 + t * 5) % 114) - 10; if (x < 3 || x > 96) continue; const xi = Math.round(x), sw = Math.round(Math.sin(t * 1.3 + k) * 0.6);
      // silhouettes against the night glass: unlit, cheap
      const G = { e: 255 }; D.rect(xi - 1, 12, 3, 2, 'iron', 5, G); D.vl(xi, 14, 8, 'night', 0.5, G); D.hl(xi - 2 + sw, 22, 5, 'night', 0.5, G);
      D.ell(xi + sw + 0.5, 27, 4, 4, 'ink', 0.4, { ring: 1.6, e: 255 }); D.px(xi + sw - 2, 24, 'night', 3, G); D.px(xi + sw - 3, 25, 'night', 2, G); D.px(xi + sw, 27, 'night', 1, G); }
    // rollers + cleats: turn only while the line moves
    D.lay('mid');
    for (let x = 8; x < 146; x += 8) { const a = beltOff / 2.5; D.px(x + Math.round(Math.cos(a) * 1.5), 84 + Math.round(Math.sin(a) * 1.5), 'iron', 7); D.px(x, 84, 'iron', 5); }
    for (let k = 0; k < 26; k++) { const x = 4 + ((k * 6 + beltOff) % 156); if (x < 145) D.px(x, 80, 'iron', 8); }
    // cars: car c sits at slot n − c (−1 entry … 3 gate … 4 gone)
    const X0 = (c) => 30 + 32 * (n - c - 1 + mvq);
    for (let c = n - 4; c <= n; c++) {
      const slot = n - c, x = X0(c); if (x < -12 || x > 160) continue;
      const hasBody = slot >= 2 || (slot === 1 && ph >= 0.46), welded = slot >= 3 || (slot === 2 && ph >= 0.8), done = slot >= 4 || (slot === 3 && ph >= 0.62), gold = done && ((c % 3) + 3) % 3 === 0;
      const col = WCOL[((c % 6) + 6) % 6];
      carChassis(D, x, yb, hasBody ? 1 : 0);
      if (hasBody) { const sh = slot === 3 && ph >= 0.62 && ph < 0.86 ? (ph - 0.62) / 0.24 * 32 - 6 : null; carBody(D, x, yb, col[0], col[1], done ? 3 : welded ? 2 : 1, sh, gold); }
      if (gold && slot === 4 && moving && R() < 0.35) rs.burst('glint', x - 6 + R() * 12, yb - 6 - R() * 5, 1, { sp: 6, life: 0.6 });   // a gilded car leaves a trail of glints
    }
    // pallet: the next body slides in from the hatch
    D.lay('back');
    if (ph >= 0.46 && ph < 0.87) { const k = ease((ph - 0.46) / 0.16), col = WCOL[((n % 6) + 6) % 6]; carBody(D, -8 + k * 30, 62, col[0], col[1], 1); }
    // arm A: lower the body, let go, swing to the pallet, grip, bring the next one
    const hA = kf(ph, [[0, 44, 40], [0.18, 62, 50], [0.3, 62, 50], [0.42, 62, 65], [0.5, 62, 65], [0.6, 56, 44], [0.74, 24, 38], [0.82, 22, 47], [0.9, 22, 47], [1, 44, 40]]);
    const carryA = ph < 0.46 ? n - 1 : ph >= 0.87 ? n : null;
    const pA = robot(D, 46, 58, hA, 'grip', carryA == null);
    if (carryA != null) { const col = WCOL[((carryA % 6) + 6) % 6]; D.lay('mid'); carBody(D, pA[0] + 0, pA[1] + 15, col[0], col[1], 1); D.lay('back'); }
    // arm B: the welder runs the seam
    const welding = ph > 0.37 && ph < 0.79, wq = (ph - 0.37) / 0.42;
    const hB = welding ? [87 + wq * 14 + Math.sin(t * 23) * 0.6, 69 + Math.round(Math.sin(wq * 18) * 1.5)] : kf(ph, [[0, 88, 46], [0.3, 88, 46], [0.37, 87, 69], [0.79, 101, 69], [0.9, 92, 50], [1, 88, 46]]);
    const pB = robot(D, 80, 58, hB, 'torch');
    if (welding) { const tx = pB[0] + 2, ty = pB[1] + 5; D.lay('mid'); D.px(tx, ty, 'ice', 11, { e: 255 }); D.px(tx - 1, ty, 'ice', 9, { e: 255 }); D.px(tx + 1, ty, 'ice', 9, { e: 255 }); D.px(tx, ty - 1, 'ice', 9, { e: 255 }); if (R() < 0.5) { D.px(tx - 2, ty, 'ice', 8, { e: 255 }); D.px(tx + 2, ty, 'ice', 8, { e: 255 }); }
      if (R() < 0.3) rs.burst('spark', tx, ty, 1 + (R() < 0.25 ? 2 : 0), { sp: 34, ang: (R() - 0.5) * 2.6, spread: 1, life: 0.7, floor: yb - 1 });
      // the arc flickers in hard steps (15 a second): most steps flash 0.5–1.0 and wash both arms and the car in blue
      const fk = Math.floor(t * 15), h = (a) => { const v = Math.sin(fk * 12.9898 + a * 78.233) * 43758.5453; return v - Math.floor(v); };
      const fa = rs.mul[L.arc] = h(1) < 0.72 ? 0.5 + h(2) * 0.5 : 0.12;
      if (fa > 0.45) { D.lay('mid'); rimLight(D, 60, 60, 112, 80, tx, ty, 34, 'ice', fa); D.lay('back'); rimLight(D, 34, 34, 108, 76, tx, ty - 4, 64, 'ice', fa); }
      D.lay('back'); }
    // gate: scan line, then the reveal; every third car turns to gold
    const cg = n - 3, gold = ((cg % 3) + 3) % 3 === 0;
    if (ph > 0.3 && ph < 0.6) { const q = (ph - 0.3) / 0.3, y = Math.round(58 + Math.sin(q * Math.PI) * 20); D.lay('mid'); for (let x = 114; x < 138; x++) D.px(x, y, 'teal', (x + Math.floor(t * 30)) % 4 ? 9 : 11, { e: 255 }); D.lay('back'); }
    if (ph >= 0.62 && !st.rev) { st.rev = 1; rs.burst('glint', WB_LAMPS[(((n - 4) % 6) + 6) % 6], 52, 2, { sp: 8, life: 0.45 }); if (gold) { rs.flash(L.gate, 2.2); rs.burst('glint', 126, 70, 8, { sp: 30, life: 0.8, w: 18, h: 8 }); rs.burst('spark', 126, 66, 16, { sp: 40, ang: 0, spread: 2.2, life: 1, floor: yb - 1 }); st.cheer = t; st.fa = st.fb = 0; } else rs.flash(L.gate, 0.6); }
    if (ph < 0.5) st.rev = 0;
    // a gilded car: a wave of gold runs back up the whole line — the rail flares, glints trail it, each lamp flares as it passes
    if (st.cheer != null && t - st.cheer < 0.75) { const k = (t - st.cheer) / 0.75, fx = Math.round(142 - ease(k) * 126);
      D.lay('mid'); for (let x = fx - 6; x <= fx + 6; x++) { if (x < 4 || x > 145) continue; const a = 1 - Math.abs(x - fx) / 7; D.px(x, 80, 'gold', 8 + a * 3, { e: 255 }); if (a > 0.4) D.px(x, 87, 'gold', 6 + a * 3, { e: 255 }); }
      if (R() < 0.8) rs.burst('glint', fx + (R() - 0.5) * 6, 70 + R() * 8, 1, { sp: 5, life: 0.6 });
      if (fx < 82 && !st.fb) { st.fb = 1; rs.flash(L.b, 0.8); rs.burst('glint', 74, 76, 3, { sp: 16, life: 0.6, w: 20, h: 6 }); }
      if (fx < 38 && !st.fa) { st.fa = 1; rs.flash(L.a, 0.8); rs.burst('glint', 30, 76, 3, { sp: 16, life: 0.6, w: 20, h: 6 }); } D.lay('back'); }
    // tally lamps on the gate beam: every car off the line lights the next lamp — warm white, or gold for a gilded car (every
    // third, so lamps 3 and 6 are the gold ones); the lamp that just came on is white-hot; with all six lit the row starts over.
    // A gilded car makes the whole lit row blink.
    const latest = n - 4 + (ph >= 0.62 ? 1 : 0), base = latest - ((((latest - 1) % 6) + 6) % 6), blink = st.cheer != null && t - st.cheer < 0.9 && Math.floor(t * 8) % 2;
    D.lay('back');
    WB_LAMPS.forEach((lx, i) => { const c = base + i; if (c > latest) return; const m = ((c % 3) + 3) % 3 === 0 ? 'gold' : 'lamp', fresh = c === latest && ph >= 0.62 && ph < 0.72, G = { e: 255 };
      D.rect(lx - 1, 51, 3, 3, m, blink ? 7 : 8, G); D.px(lx, 52, m, fresh ? 11 : 10, G); D.px(lx - 1, 51, m, 11, G); if (fresh) { D.px(lx, 51, m, 10, G); D.px(lx - 1, 52, m, 10, G); }
    });
    // beacon: spins while the line moves
    const ba = t * 9; D.rect(125, 43, 3, 2, 'red', moving ? 8 : 5, { e: 255 }); if (moving) { D.px(126 + Math.round(Math.cos(ba) * 2), 43, 'fire', 10, { e: 255 }); }
    // console screens: a bar graph that climbs
    for (let k = 0; k < 4; k++) { const h = 1 + ((Math.floor(t * 1.3) + k * 3) % 3); D.rect(131 + k * 3, 39 - h, 2, h, 'screen', 8, { e: 255 }); }
    // the polished bay mirrors what stands in the gate: finished cars' lamps as 1-px streaks, a gilded car whole
    D.lay('wall');
    for (let c = n - 4; c <= n - 3; c++) { const slot = n - c, x = X0(c), x0 = Math.round(x) - 10, done = slot >= 4 || (slot === 3 && ph >= 0.62), gcar = done && ((c % 3) + 3) % 3 === 0; if (!done || x0 > 145 || x0 + 19 < 109) continue;
      for (let j = 0; j < 9; j++) { const yy = 91 + (8 - j); if (yy % 2 === 0 || yy > 99) continue;
        for (let i = 0; i < 20; i++) { const ch = CAR[j][i], xx = x0 + i; if (ch === '.' || xx < 109 || xx > 145) continue;
          if (ch === 'l') D.px(xx, yy, 'lamp', 10 - j * 0.5, { e: 255 }); else if (ch === 't') D.px(xx, yy, 'red', 7, { e: 255 }); else if (gcar && ch !== 'x' && ch !== 'd') D.px(xx, yy, 'gold', ch === 'r' ? 7 : ch === 'w' ? 8 : 5, { e: 255 }); } }
      [x0 + 19, x0].forEach((lx, k) => { if (lx < 109 || lx > 145) return; for (let yy = 93; yy < 100; yy += 2) if (yy > 95 || k === 0) D.px(lx, yy, k ? 'red' : 'lamp', k ? 5 : 9 - (yy - 93) * 0.5, { e: 255 }); }); }
    // the parts cart: a yellow tug runs crates from station 1 to station 3 and back, beacon turning while it moves
    const cq = steps(t, 17); let cxp, cdir = 1, mv = 0, full = 1;
    if (cq < 0.08) cxp = 30; else if (cq < 0.46) { cxp = 30 + ease((cq - 0.08) / 0.38) * 64; mv = 1; } else if (cq < 0.56) { cxp = 94; full = cq < 0.5; } else if (cq < 0.94) { cxp = 94 - ease((cq - 0.56) / 0.38) * 64; cdir = -1; mv = 1; full = 0; } else { cxp = 30; cdir = -1; full = cq > 0.98; }
    D.lay('front'); { const x0 = Math.round(cxp) - 8, fr = cdir > 0 ? x0 + 15 : x0, bk = cdir > 0 ? x0 : x0 + 15;
      D.rect(x0, 97, 16, 3, 'gold', 6); D.hl(x0, 97, 16, 'gold', 8, { n: [0, -0.8] }); for (let i = 1; i < 15; i++) D.px(x0 + i, 99, ((i + x0) >> 1) & 1 ? 'gold' : 'ink', ((i + x0) >> 1) & 1 ? 5 : 2);
      D.px(fr, 98, 'lamp', mv ? 11 : 7, mv ? { e: 255 } : undefined); D.px(fr, 99, 'iron', 4);
      [x0 + 3, x0 + 12].forEach(wx => { D.rect(wx - 1, 100, 3, 1, 'ink', 1); D.px(wx - 1 + (((Math.floor(cxp / 2) % 3) + 3) % 3), 100, 'iron', 6); });
      D.vl(bk, 93, 4, 'iron', 6); const on = mv && Math.floor(t * 5) % 2; D.px(bk, 92, 'fire', on ? 10 : 4, on ? { e: 255 } : undefined);
      if (on) rs.dl.push({ x: bk, y: 93, z: 26, r: 11, i: 0.6, rgb: [255, 150, 60], tint: 0.6 });
      if (full) { D.rect(x0 + 3, 93, 10, 4, 'wood', 6); D.hl(x0 + 3, 93, 10, 'wood', 8, { n: [0, -0.8] }); D.vl(x0 + 7, 93, 4, 'wood', 4); D.px(x0 + 5, 92, 'copper', 8); D.px(x0 + 9, 92, 'iron', 9); D.px(x0 + 10, 92, 'iron', 7); }
      dynOutline(D, x0 - 1, 91, x0 + 16, 100); }
    // the foreman on the catwalk: walks, checks the board, cheers at a golden car
    D.lay('back');
    const cheer = st.cheer != null && t - st.cheer < 1.6, w = stroll(t, 102, 122, 8, 0.2, 2.6);
    if (cheer) { const b = Math.abs(Math.sin((t - st.cheer) * 9)); worker(D, w.x, 43, 'worker', { aF: 2.9, eF: 0.2, aB: 2.7, eB: 0.2, bob: -Math.round(b * 2) }, 1); }
    else if (w.walking) worker(D, w.x, 43, 'worker', Object.assign(w.pose, { tool: 'board', aF: 1.2, eF: -1.2 }), w.dir);
    else worker(D, w.x, 43, 'worker', { aF: 1.4, eF: -1.3, tool: 'board', lean: 0.3 }, w.dir);
  },
});

// ═════════ 威尼斯兵工厂 venice (medieval · forge · epic) ═════════
// The arsenal's basin on a foggy, moonless night, seen close: a galley fills the dock, her lateen mainsail set and lit by
// the lamp-lit fog and the stern lantern, the lion of the arsenal on it, oars shipped; the twin water-gate towers stand
// dark behind her, San Marco's bell tower lit at its belfry, the far quay's lamps shivering in the lagoon, banks of fog
// drifting past behind the ship and a low veil of it over the water in front. On the
// quay a treadwheel crane — a man walks the wheel, the jib slews out over the ship and lowers a bronze cannon through
// the waist to the sailor on deck; it drops into the hold with a gold flash and a slap of water against the hull.
const VN = { P: 12, PIV: [124, 20], JL: 44, PICK: 1.5, GW: 62, TOP: 65 };   // the jib pivots high on the crane house: the gun crosses dark sky
// the cycle: hook down to the stack, hoist, slew out over the ship, lower through the waist into the hold, unhook, hook up,
// slew back. hy = hook depth below the jib; the gun hangs 6 px under the hook (its centre)
function vnCrane(t) {
  const q = steps(t, VN.P); let th, hy, carry;
  if (q < 0.07) { th = VN.PICK; hy = 12 + ease(q / 0.07) * 27; carry = 0; }                  // hook down to the gun on the stack
  else if (q < 0.1) { th = VN.PICK; hy = 39; carry = q > 0.085; }                             // slings on
  else if (q < 0.24) { th = VN.PICK; hy = 39 - ease((q - 0.1) / 0.14) * 36; carry = 1; }     // hoist
  else if (q < 0.42) { th = VN.PICK * (1 - ease((q - 0.24) / 0.18)); hy = 3; carry = 1; }     // slew out over the ship, high in the sky
  else if (q < 0.6) { th = 0; hy = 3 + ease((q - 0.42) / 0.18) * 37; carry = 1; }            // lower through the waist into the hold
  else if (q < 0.68) { th = 0; hy = 40; carry = 0; }                                          // unhook
  else if (q < 0.8) { th = 0; hy = 40 - ease((q - 0.68) / 0.12) * 28; carry = 0; }           // hook up
  else { th = VN.PICK * ease((q - 0.8) / 0.2); hy = 12; carry = 0; }                          // slew back
  const lifting = (q > 0.1 && q < 0.24) || (q > 0.68 && q < 0.8), lowering = q < 0.07 || (q > 0.42 && q < 0.6);
  return { q, th, hy, carry, tipX: VN.PIV[0] - VN.JL * Math.cos(th), turning: lifting || lowering, dir: lifting ? 1 : -1 };
}
// a bronze gun lying left-right, muzzle to the left, 16 px: flared muzzle with a dark bore, the chase, the thicker
// reinforce with a trunnion knob, the base ring, the cascabel knob; a 1-px ink outline all round
const CAN_ROWS = ['.H......HaaaaH..', 'magaaaagaaaaaa.k', 'obgbbbbgbTtbbbnK', 'mcgccccgctdccc.k', '.d......dddddd..'];   // g: the ring grooves
const CAN_PAL = { H: 7, a: 6, b: 5, c: 4, d: 3, g: 2, m: 4, T: 8, t: 5, n: 4, K: 6, k: 4 };
const CAN = { px: [], out: [] };
{ const on = (i, r) => r >= -2 && r <= 2 && i >= -8 && i <= 7 && CAN_ROWS[r + 2][i + 8] !== '.';
  for (let r = -2; r <= 2; r++) for (let i = -8; i <= 7; i++) if (on(i, r)) CAN.px.push([i, r, CAN_ROWS[r + 2][i + 8]]);
  for (let r = -3; r <= 3; r++) for (let i = -9; i <= 8; i++) if (!on(i, r) && (on(i - 1, r) || on(i + 1, r) || on(i, r - 1) || on(i, r + 1))) CAN.out.push([i, r]); }
// clip: skip rows at or below it (lowered into the hold behind the hull)
function cannon(S, x, y, dt, clip) {
  x = Math.round(x); y = Math.round(y); dt = dt || 0; const cl = clip == null ? 999 : clip;
  for (const [i, r] of CAN.out) if (y + r < cl) S.px(x + i, y + r, 'ink', 1);
  for (const [i, r, ch] of CAN.px) if (y + r < cl) { if (ch === 'o') S.px(x + i, y + r, 'ink', 0); else S.px(x + i, y + r, 'brass', CAN_PAL[ch] + dt, { n: [0, r * 0.35] }); }
}
X.def('venice', {
  amb: [0.24, 0.26],
  paint(S, sc) {
    const L = {};
    L.sky = sc.light({ x: 40, y: 18, z: 60, r: 260, i: 0.45, c: '#c0b8e8', tint: 0.18 });                              // the lamp-lit fog overhead: a soft cool fill
    L.stern = sc.light({ x: 109, y: 36, z: 22, r: 60, i: 0.95, c: '#ffc070', fl: 'candle', tint: 0.5 });                // stern lantern
    L.bow = sc.light({ x: 17, y: 44, z: 22, r: 44, i: 0.7, c: '#ffc070', fl: 'candle', ph: 2.2, tint: 0.45 });          // bow lantern
    L.fire = sc.light({ x: 139, y: 64, z: 14, r: 50, i: 1.05, c: '#ff8a30', fl: 'fire', tint: 0.55 });                  // brazier on the quay
    L.gold = sc.light({ x: 80, y: 56, z: 22, r: 70, i: 1.6, c: '#ffe090', tint: 0.55, bake: false });                 // the landing flash (off at rest)
    L.gond = sc.light({ x: 142, y: 91, z: 28, r: 30, i: 0.8, c: '#ffc070', fl: 'candle', ph: 4.1, tint: 0.5 });          // the gondola's lantern
    VN.L = L;
    S.lay('wall'); const GL = { e: 255 }, r = S.r;
    // a misty night, no moon: whole-step bands from night indigo down to the murky violet the city's lamps leave in the fog
    const SK = [[0, 'night', 1], [10, 'night', 2], [21, 'night', 3], [32, 'lav', 3], [42, 'lav', 4], [51, 'lav', 5]], edge = (i, x) => (i ? SK[i][0] + Math.round(Math.sin(x * 0.05 + i * 2.3) * 1.3) : 0);
    for (let x = 0; x < W; x++) for (let i = 0; i < SK.length; i++) { const y1 = SK[i + 1] ? edge(i + 1, x) : 58; for (let y = edge(i, x); y < y1; y++) S.px(x, y, SK[i][1], SK[i][2], GL); }
    for (let i = 0; i < 10; i++) S.px(r() * W, r() * 22, 'linen', r() < 0.3 ? 8 : 6, GL);
    // the far lagoon, its far edge catching the glow; the near water (the floor rows) lit by the lanterns
    S.rect(0, 58, W, FY - 58, 'water', 2, GL); S.hl(0, 58, W, 'lav', 4, GL); S.hl(0, 59, W, 'water', 3, GL);
    S.vgrad(0, FY, W, H - FY, 'water', 4, 2.4);
    // Venice across the water: roofs and chimneys with lit windows, the domed church of the Salute, a row of lamps along
    // the far quay; the bell tower of San Marco on the left, its belfry lit
    for (let x = 0; x < W;) { const bw = 5 + Math.floor(r() * 8), top = 50 + Math.floor(r() * 5); S.rect(x, top, bw, 58 - top, 'lav', 2, GL); if (r() < 0.5) S.px(x + 1 + Math.floor(r() * (bw - 2)), top - 1, 'lav', 2, GL);
      for (let k = 0; k < bw / 3; k++) if (r() < 0.6) S.px(x + 1 + Math.floor(r() * (bw - 2)), top + 2 + Math.floor(r() * Math.max(1, 55 - top)), 'lamp', r() < 0.4 ? 8 : 6, GL); x += bw; }
    for (let y = 44; y <= 49; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 49.5) / 5.5) ** 2)) * 5.4); S.hl(28 - hw, y, hw * 2 + 1, 'lav', 2, GL); S.px(28 - hw, y, 'lav', 4, GL); }
    S.rect(23, 50, 11, 3, 'lav', 2, GL); S.px(23, 50, 'lav', 4, GL); S.rect(27, 41, 3, 3, 'lav', 2, GL); S.vl(28, 38, 3, 'lav', 3, GL); S.hl(27, 39, 3, 'lav', 3, GL); [25, 28, 31].forEach(x => S.px(x, 51, 'lamp', 7, GL));
    VN.lamps = [21, 36, 44, 58, 66, 74, 82, 90, 121, 131, 141];
    VN.lamps.forEach(x => { S.px(x, 57, 'night', 2, GL); S.px(x, 56, 'lamp', 9, GL); });
    { const C = (x, y, w, h, m, t) => S.rect(x, y, w, h, m, t, GL);
      C(13, 25, 6, 33, 'brick', 2); S.vl(13, 25, 33, 'brick', 3, GL); S.vl(15, 28, 28, 'brick', 1, GL); S.vl(17, 28, 28, 'brick', 1, GL);
      C(12, 18, 8, 7, 'stone', 3); C(12, 24, 8, 1, 'stone', 4); C(12, 18, 8, 1, 'stone', 4); C(13, 19, 2, 4, 'lamp', 6); C(17, 19, 2, 4, 'lamp', 6); S.px(13, 19, 'lamp', 8, GL); S.px(17, 19, 'lamp', 8, GL);
      C(13, 14, 6, 4, 'brick', 2);
      for (let k = 0; k < 8; k++) { const hw = Math.max(0, Math.round(3 - k * 0.42)); S.hl(16 - hw, 13 - k, hw * 2, 'moss', 3, GL); } S.px(15, 5, 'gold', 8, GL); S.px(15, 4, 'gold', 6, GL); }
    // the twin water-gate towers, far and dark, a bridge between them, warm slit windows
    const tower = (x, w, top) => { S.rect(x, top, w, 70 - top, 'brick', 2.4); S.noise(x, top, w, 70 - top, 1, 3, x); for (let yy = top + 3; yy < 70; yy += 4) S.hl(x, yy, w, 'brick', 1.6);
      for (let k = 0; k < w; k += 3) S.rect(x + k, top - 3, 2, 3, 'brick', 2.6); S.px(x + 1, top - 4, 'brick', 2.6); S.px(x + w - 2, top - 4, 'brick', 2.6);
      S.vl(x, top, 70 - top, 'brick', 3.6); [[top + 6, 1], [top + 16, 0], [top + 26, 1]].forEach(([yy, k]) => { S.rect(x + Math.floor(w / 2) - 1, yy, 2, 4, 'lamp', k ? 8 : 6, { e: 255 }); S.px(x + Math.floor(w / 2) - 1, yy, 'lamp', 10, { e: 255 }); }); };
    tower(44, 11, 16); tower(97, 11, 18);
    S.rect(55, 36, 42, 3, 'wood', 2.5); S.hl(55, 35, 42, 'wood', 3.5); for (let x = 56; x < 97; x += 4) S.vl(x, 32, 3, 'wood', 2.5); S.hl(55, 32, 42, 'wood', 3);
    // ── back: the quay with the crane, the sailor's deck (hidden by the hull below the rail) ──
    S.lay('back');
    S.beg(); TX.ashlar(S, 114, 76, 34, 14, 'mstone', 4.5, { bh: 5, bw: 11 }); S.hl(114, 76, 34, 'mstone', 7, { n: [0, -0.8] }); S.end();
    S.beg(); S.box(116, 26, 3, 50, 'wood', 4.5); S.box(142, 26, 3, 50, 'wood', 4); S.line(119, 70, 126, 76, 'wood', 4); S.line(141, 70, 135, 76, 'wood', 4); S.end();
    S.beg(); S.poly([[112, 27], [131, 14], [149, 27]], 'crimson', 3.5); for (let y = 16; y < 27; y += 2) S.hl(131 - (y - 14) * 1.45, y, (y - 14) * 2.9, 'crimson', 2.6); S.hl(112, 27, 36, 'wood', 6); S.end();
    S.beg(); S.ell(130, 55, 14, 14, 'wood', 5, { ring: 2 }); S.end();
    S.beg(); S.box(128, 53, 5, 5, 'iron', 5); S.end();
    // the jib's king post above the roof (the jib pivots at its foot), a pulley block on top for the topping lift
    S.beg(); S.cyl(123, 10, 2, 10, 'wood', 5.5); S.rect(122, 9, 4, 2, 'iron', 5); S.px(122, 9, 'iron', 7); S.end();
    // brazier on the quay (flames in anim)
    S.beg(); S.poly([[134, 70], [144, 70], [142, 74], [136, 74]], 'iron', 4); S.vl(136, 74, 2, 'iron', 4); S.vl(141, 74, 2, 'iron', 4); for (let x = 135; x < 144; x++) S.px(x, 69, 'fire', 7 + (x % 3), { e: L.fire + 1 }); S.end();
    // ── the galley: sails, masts and rigging stand on her centreline (back); her near side is the hull (mid) ──
    const G = VN.GW;
    // mainsail: a lateen triangle hung from its yard, lit by the fog's glow and the stern lantern, the lion of the arsenal on it
    S.beg(); S.poly([[36, 47], [99, 5], [86, 58], [70, 57], [52, 53]], 'linen', 6.6, { n: [0.1, -0.2] });
    for (let k = 0; k < 6; k++) { const x0 = 44 + k * 8; S.line(x0, 51 + k, x0 + 10 + k * 2, 36 - k * 6, 'linen', 5.6); }   // seams
    for (let x = 40; x < 86; x++) { const y = Math.round(47 + (x - 36) * 0.24 + Math.sin((x - 36) / 50 * Math.PI) * 3.5); S.px(x, y, 'linen', 4.5); }    // the foot's shade
    S.end();
    S.beg(); S.ell(75, 36, 7, 7, 'gold', 6.5, { ring: 1 }); S.ell(75, 36, 5.8, 5.8, 'crimson', 5.5);
    S.spr(71, 32, ['..gg....', '.gggg.g.', 'gggggg..', '.gggggg.', '.g.g.g..'], { g: ['gold', 8.5] }); S.end();
    S.beg(); S.line(32, 50, 100, 4, 'wood', 6, { w: 2 }); S.end();
    // foresail furled on its yard
    S.beg(); S.line(8, 50, 42, 30, 'wood', 6, { w: 1 }); for (let k = 0; k <= 28; k++) { const x = 10 + k, y = Math.round(49 - k * 20 / 34); S.px(x, y + 1, 'linen', 7 - (k % 5 === 0 ? 2 : 0)); S.px(x, y + 2, 'linen', 5.5 - (k % 5 === 0 ? 2 : 0)); } S.end();
    // masts (the mainmast runs off the top)
    S.beg(); S.cyl(61, 4, 3, G - 4, 'wood', 5.5, { rim: 1.5 }); S.rect(60, 10, 5, 3, 'wood', 4); S.end();
    S.beg(); S.cyl(28, 26, 3, G - 26, 'wood', 5.5, { rim: 1.5 }); S.end();
    [[62, 12, 48, G], [62, 12, 80, G], [29, 28, 20, G], [29, 28, 40, G], [100, 4, 110, 44]].forEach(([a, b, c, d]) => S.line(a, b, c, d, 'hair', 3));
    S.line(86, 58, 92, G, 'hair', 4);
    S.lay('mid');
    // hull: dark oak with a gilded wale, a tar band at the water, oar ports; a high stern castle with lit windows
    const hull = [[10, 57], [16, G], [92, G], [92, 44], [114, 44], [116, 48], [111, 88], [22, 88], [14, 76], [5, 67], [12, 64]];
    S.beg(); S.poly(hull, 'wood', 5);
    for (let y = G + 3; y < 88; y += 3) { const sp = polySpan(hull, y); if (sp) S.hl(sp[0], y, sp[1] - sp[0], 'wood', 3.8); }   // plank seams, only across the hull
    S.end(); S.noise(4, 44, 114, 44, 1, 4, 61, { only: 'wood' });
    S.poly([[16, 84], [112, 84], [111, 88], [22, 88]], 'ink', 2); S.hl(18, 84, 94, 'wood', 3);
    S.rect(15, 68, 98, 3, 'crimson', 4.5); S.hl(15, 68, 98, 'gold', 7.5, { n: [0, -0.8] }); S.hl(15, 70, 98, 'gold', 5.5);
    for (let x = 22; x < 90; x += 6) { S.rect(x, 74, 3, 2, 'ink', 1); S.px(x, 74, 'wood', 3); }
    S.hl(16, G, 76, 'wood', 7.5, { n: [0, -0.8] }); S.hl(16, G + 1, 76, 'wood', 6); S.hl(92, 44, 22, 'wood', 7.5, { n: [0, -0.8] }); S.vl(92, 44, 18, 'wood', 6.5);
    S.rect(94, 47, 18, 1, 'gold', 6.5); S.rect(94, 58, 18, 1, 'gold', 5.5);
    [[95, 50], [100, 50], [105, 50]].forEach(([x, y]) => { S.rect(x, y, 3, 5, 'lamp', 8, { e: L.stern + 1 }); S.px(x + 1, y, 'lamp', 10, { e: L.stern + 1 }); S.px(x + 1, y + 2, 'lamp', 6, { e: L.stern + 1 }); });
    for (let x = 16; x < 92; x += 5) S.px(x, G + 2, 'wood', 3);   // rail stanchions
    // beak with a gilded ring, a bow lantern on its staff
    S.beg(); S.line(10, 62, 3, 60, 'wood', 5.5, { w: 2 }); S.px(4, 60, 'gold', 8); S.end();
    S.beg(); S.vl(16, 46, 14, 'wood', 5); S.hl(14, 45, 4, 'iron', 6); S.box(15, 46, 5, 6, 'iron', 4); S.rect(16, 47, 3, 4, 'lamp', 9, { e: L.bow + 1 }); S.px(17, 48, 'lamp', 11, { e: L.bow + 1 }); S.end();
    // stern lantern on the taffrail
    S.beg(); S.vl(109, 34, 10, 'wood', 5); S.hl(107, 33, 5, 'iron', 6); S.box(107, 34, 5, 7, 'iron', 4); S.rect(108, 35, 3, 5, 'lamp', 9, { e: L.stern + 1 }); S.px(109, 36, 'lamp', 11, { e: L.stern + 1 }); S.end();
    // oars shipped at a slant into the water
    for (let k = 0; k < 12; k++) { const x = 25 + k * 6; S.line(x, 75, x - 8, 90, 'wood', 6); S.rect(x - 10, 90, 3, 1, 'wood', 7); }
    // guns on the quay: one on its wooden skid with wedges (the crane takes the gun laid on top of it)
    cannon(S, 123, 71, -2);   // a step darker: the brazier and the stern lantern light it up
    S.beg(); S.rect(113, 74, 20, 2, 'wood', 4.5); S.hl(113, 74, 20, 'wood', 6.5, { n: [0, -0.8] }); S.vl(116, 74, 2, 'wood', 3); S.vl(129, 74, 2, 'wood', 3);
    S.poly([[113, 74], [115, 71], [115, 74]], 'wood', 6); S.poly([[131, 74], [131, 71], [133, 74]], 'wood', 4.5); S.end();
    // ── front: a striped mooring pole, a moored gondola's iron comb in the corner ──
    S.lay('front');
    S.beg(); for (let y = 40; y < 104; y++) { const k = Math.floor((y + 8) / 4) % 2, x = 4; S.rect(x, y, 3, 1, k ? 'crimson' : 'linen', k ? 6 : 7); S.px(x, y, k ? 'crimson' : 'linen', k ? 7.5 : 9); S.px(x + 2, y, k ? 'crimson' : 'linen', k ? 4.5 : 5.5); } S.rect(4, 39, 3, 1, 'gold', 8); S.end();
    S.line(7, 60, 12, 63, 'hair', 3);
    // the gondola: a black hull whose sheer catches the light, a gold trim, rising to its stem at the left
    S.beg(); S.poly([[123, 105], [148, 105], [148, 98], [137, 99], [130, 98], [126, 96], [124, 93], [122, 94], [122, 99]], 'ink', 1.5);
    [[124, 93], [125, 94], [125, 95], [126, 96], [127, 96], [128, 97], [129, 97]].forEach(([x, y]) => S.px(x, y, 'iron', 5.5)); S.hl(130, 98, 7, 'iron', 5); S.hl(137, 99, 11, 'iron', 4.5);
    S.hl(128, 99, 9, 'gold', 5.5); S.hl(137, 100, 11, 'gold', 5); S.end();
    // its ferro on the stem: a bright iron blade, four teeth forward and one back, a curled crest
    S.beg(); S.vl(122, 83, 11, 'iron', 8.5); S.hl(119, 81, 4, 'iron', 10); S.px(118, 82, 'iron', 9); S.px(122, 82, 'iron', 9.5);
    for (let k = 0; k < 4; k++) S.hl(118, 85 + k * 2, 4, 'iron', 9 - (k % 2) * 0.8); S.px(123, 89, 'iron', 7.5); S.px(123, 90, 'iron', 7); S.end();
    // a lantern on a post at the gondola's stern
    S.beg(); S.vl(144, 90, 9, 'iron', 5); S.hl(141, 88, 5, 'iron', 6); S.box(140, 89, 5, 6, 'iron', 4); S.end();
    S.rect(141, 90, 3, 4, 'lamp', 9, { e: L.gond + 1 }); S.px(142, 91, 'lamp', 11, { e: L.gond + 1 }); S.px(141, 90, 'lamp', 10, { e: L.gond + 1 });
    // what stands in front of the far water (the fog bank only drifts where nothing nearer does)
    { const LL = S.L; VN.mask = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) VN.mask[p] = LL.back.m[p] || LL.mid.m[p] || LL.front.m[p] ? 1 : 0; }
    sc.emit({ k: 'ember', x: 139, y: 64, w: 6, rate: 2.2, sp: 7, ang: -0.1, spread: 0.6, life: 1.8 });
  },
  anim(D, t, rs) {
    const st = rs.st, L = VN.L, c = vnCrane(t), P = VN.PIV, G = VN.GW; rs.mul[L.gold] = 0;
    // water: rolling dashes, lantern streaks, ripples along the hull; the far quay's lamps shiver in the lagoon
    X.sea(D, t, 90, 104);
    for (const x of VN.lamps) for (let y = 59; y < 63; y++) if (Math.sin(t * 2.4 + y * 1.9 + x) > -0.4) D.px(x + Math.round(Math.sin(t * 1.7 + y + x) * 0.8), y, 'lamp', 8 - (y - 59), { e: 255 });
    for (let y = 91; y < 103; y += 2) { const w = Math.round(Math.sin(t * 2 + y) * 1.5); D.hl(108 + w, y, 3, 'lamp', ((y + Math.floor(t * 6)) % 4) ? 7 : 9, { e: 255 }); D.hl(16 + w, y, 2, 'lamp', ((y + Math.floor(t * 5)) % 3) ? 6 : 8, { e: 255 }); D.hl(138 + w, y, 3, 'fire', ((y + Math.floor(t * 7)) % 3) ? 6 : 8, { e: 255 }); }
    for (let x = 20; x < 112; x += 2) if (Math.sin(x * 0.6 + t * 3) > 0.2) D.px(x, 89, 'water', 9, { e: 255 });
    // the sail and the stern windows shimmer in the water
    for (let y = 91; y < 104; y++) { const k = y - 90; for (let x = 44 + k; x < 96 - k * 2; x += 1) { const w = Math.sin(x * 0.9 + y * 2.3 - t * 3.2) + Math.sin(x * 0.31 - t * 1.4 + y); if (w > 1.25) D.px(x, y, 'linen', 5 - k * 0.2, { e: 255 }); } }
    // sail: the leech flutters
    D.lay('back'); for (let k = 0; k < 8; k++) { const y = 10 + k * 6, x = Math.round(98 - k * 1.55 + Math.sin(t * 6 + k) * 0.8); D.px(x, y, 'linen', 7.5); D.px(x - 1, y + 1, 'linen', 5.5); }
    // brazier flames
    flame(D, 137, 69, 5, t, 0.4); flame(D, 141, 69, 6, t, 2.1);
    // the treadwheel: the rope winds on its axle, so the wheel's angle follows the hook depth (continuous in t); the man inside walks it
    const ang = -c.hy / 6;
    D.lay('back'); for (let k = 0; k < 8; k++) { const a = ang + k * Math.PI / 4; D.line(130, 55, 130 + Math.cos(a) * 12, 55 + Math.sin(a) * 12, 'wood', 4); }
    for (let k = 0; k < 20; k++) { const a = ang + k * Math.PI / 10; D.px(130 + Math.cos(a) * 13, 55 + Math.sin(a) * 13, 'wood', 7.5); }
    D.rect(129, 54, 3, 3, 'iron', 7);
    const ph = t * 7; if (c.turning) worker(D, 130, 68, 'worker', { lF: Math.sin(ph) * 0.5, lB: -Math.sin(ph) * 0.5, kF: Math.max(0, -Math.sin(ph)) * 0.5, kB: Math.max(0, Math.sin(ph)) * 0.5, aF: 0.9, eF: -0.6, aB: 1, eB: -0.8, lean: 0.4, bob: -Math.abs(Math.cos(ph)) + 0.4 }, c.dir);
    else worker(D, 130, 68, 'worker', { aF: 0.9, eF: -0.6, aB: 1, eB: -0.8 }, 1);
    // the sailor on deck (behind the rail): reaches up for the gun as it comes down, guides it into the hatch
    const reach = c.carry && c.q > 0.44 && c.q < 0.6, sx = 70;
    worker(D, sx, G + 12, { skin: ['skin', 6], hair: ['hair', 3], top: ['linen', 7], bot: ['denim', 4], boot: ['hair', 2], cap: ['crimson', 6] }, reach ? { aF: 2.5, eF: 0.4, aB: 2.2, eB: 0.3, lean: 0.1 } : { aF: 0.4 + Math.sin(t * 1.2) * 0.1, eF: -0.5, aB: 0.2, eB: -0.3 }, 1);
    // the banner of the arsenal on the mainmast head: red with a gold lion, streaming clear of the crane
    for (let k = 0; k < 12; k++) { const x = 64 + k, wv = Math.sin(t * 5 - k * 0.7), w = Math.round(wv * (k / 11) * 1.6), dk = wv > 0.4 ? 1 : 0;
      for (let y = 0; y < 7; y++) D.px(x, 6 + y + w, 'crimson', (y === 0 ? 8 : y === 6 ? 5 : 6) - dk); if (k > 3 && k < 9) D.px(x, 8 + w, 'gold', 8 - dk); if (k > 4 && k < 8) D.px(x, 9 + w, 'gold', 7 - dk); if (k === 7) D.px(x, 10 + w, 'gold', 7 - dk); }
    // jib (foreshortened as it slews), its topping lift to the king post, the pulley block, rope, hook, slings and gun
    D.lay('mid'); const tx = Math.round(c.tipX), ty = P[1];
    D.line(P[0], P[1], tx, ty, 'wood', 6.5, { w: 2 }); D.line(P[0], P[1] + 2, tx, ty + 2, 'wood', 3.5); dynOutline(D, Math.min(tx, P[0]) - 1, ty - 1, Math.max(tx, P[0]) + 1, ty + 3);
    D.line(124, 10, tx, ty - 1, 'hair', 4); D.rect(tx - 1, ty + 1, 3, 2, 'iron', 5); D.px(tx - 1, ty + 1, 'iron', 7);
    const sw = c.carry && c.q > 0.24 && c.q < 0.48 ? Math.sin(t * 3.1) * 1.3 * Math.sin(clamp((c.q - 0.24) / 0.24, 0, 1) * Math.PI) : 0, hx = Math.round(tx + sw), hy = ty + Math.round(c.hy), gy = hy + 6;
    D.line(tx, ty + 3, hx, hy, 'hair', 5); D.px(hx, hy, 'iron', 8); D.px(hx + 1, hy + 1, 'iron', 6);
    if (c.carry) { cannon(D, hx, gy, tx > 104 ? -1.5 : 0, tx < 100 ? G : null); D.line(hx, hy + 1, hx - 4, hy + 4, 'hair', 4); D.line(hx, hy + 1, hx + 4, hy + 4, 'hair', 4); }
    if (c.q < 0.085 || c.q > 0.6) cannon(D, Math.round(P[0] - VN.JL * Math.cos(VN.PICK)), VN.TOP, -1.5);   // the next gun lies ready on the skid
    // the moment the gun touches the gunwale: a thump of dust and sparks, a gold flash over the whole ship, water slaps both sides
    if (c.carry && c.th === 0 && gy + 3 >= G && !st.land) { st.land = 1; st.lt = t; rs.flash(L.gold, 1.3); rs.flash(L.stern, 0.5);
      rs.burst('dust', hx, G - 2, 10, { sp: 16, life: 0.9, w: 16, h: 3 }); rs.burst('spark', hx, G - 1, 12, { sp: 38, ang: 0, spread: 2.6, life: 0.7, floor: G });
      rs.burst('glint', hx, G - 5, 7, { sp: 20, life: 0.7, w: 16, h: 5 });
      rs.burst('drip', 24, 88, 10, { sp: 34, ang: -0.3, spread: 1, life: 0.7, floor: 90 }); rs.burst('drip', 106, 88, 10, { sp: 34, ang: 0.3, spread: 1, life: 0.7, floor: 90 }); }
    if (c.q < 0.4) st.land = 0;
    // the slap: foam runs out along the waterline from both ends of the hull
    if (st.lt != null && t - st.lt >= 0 && t - st.lt < 0.7) { const k = (t - st.lt) / 0.7, n = Math.round(4 + k * 14), tn = 10 - k * 4;
      for (let i = 0; i < n; i++) { if (i % 3 === 2) continue; D.px(22 - i, 89, 'linen', tn, { e: 255 }); D.px(110 + i, 89, 'linen', tn, { e: 255 }); if (i > n - 5) { D.px(22 - i, 90, 'water', tn, { e: 255 }); D.px(110 + i, 90, 'water', tn, { e: 255 }); } } }
    X.twinkle(D, t, 4, 22, 12);
  },
  // fog: a bank drifting over the lagoon, the towers and the city behind the ship, and a low veil over the water in front
  // drifting the other way — a cool lilac wash in two hard steps, never a gradient
  post(out, t) {
    const mask = VN.mask, C = [168, 162, 210];
    for (let y = 44; y < 64; y++) { const env = 1 - Math.abs(y - 55) / 10; for (let x = 3; x < W - 3; x++) { const p = y * W + x; if (mask[p]) continue; const d = X.vnoise(x * 0.06 - t * 0.3, y * 0.28, 5) * env, a = d > 0.48 ? 0.34 : d > 0.32 ? 0.18 : 0; if (a) X.blendPx(out, p, C, a); } }
    for (let y = 86; y < 102; y++) { const env = 1 - Math.abs(y - 93) / 9; for (let x = 3; x < W - 3; x++) { const d = X.vnoise(x * 0.05 + t * 0.22, y * 0.32, 9) * env, a = d > 0.5 ? 0.28 : d > 0.34 ? 0.14 : 0; if (a) X.blendPx(out, y * W + x, C, a); } }
  },
});

// ═════════ 鲁尔区 ruhr (steam · power · epic) ═════════
// A pit yard at night under a sky lit red by the works: a rust-red winding tower whose two sheaves spin as the cage
// rises out of the shaft; a miner with a lamp on his helmet pushes the full coal tub out and tips it down the chute;
// across the yard a blast furnace burns, a gas flare on its top — every twelve seconds, while the cage is down the shaft, its
// keeper lances the taphole and molten iron runs down the trough into the ladle in a spray of sparks and a wash of orange light.
// one 12 s cycle for both stories: the cast (tq 0.1…0.5) runs while the tub is still down in the cage (q 0.88…0.28), so the
// yard's tub and the furnace's ladle never share the stage; the tub stops at STOP, 6 px clear of the ladle car
const RU = { P: 12, TP: 12, TOFF: 2.64, CAGE: [56, 70], LAND: 89, STOP: 77 };
function ruCycle(t) {
  const q = steps(t, RU.P); let cy, cx = 63, mx, mdir = 1, pose = 'idle', tilt = 0, full = 1, spin = 0;
  if (q < 0.18) { cy = RU.LAND + 36 * (1 - ease(q / 0.18)); spin = 1; mx = 44; }
  else if (q < 0.24) { cy = RU.LAND; mx = 44; }
  else if (q < 0.3) { cy = RU.LAND; mx = 44 + (q - 0.24) / 0.06 * 8; pose = 'walk'; }
  else if (q < 0.5) { cy = RU.LAND; cx = 63 + ease((q - 0.3) / 0.2) * (RU.STOP - 63); mx = cx - 12; pose = 'push'; }
  else if (q < 0.6) { cy = RU.LAND; cx = RU.STOP; mx = RU.STOP - 12; tilt = Math.sin((q - 0.5) / 0.1 * Math.PI); pose = 'tip'; full = q < 0.54 ? 1 : 0; }
  else if (q < 0.8) { cy = RU.LAND; cx = RU.STOP - ease((q - 0.6) / 0.2) * (RU.STOP - 63); mx = cx + 12; mdir = -1; pose = 'push'; full = 0; }
  else if (q < 0.86) { cy = RU.LAND; cx = 63; mx = 75 - (q - 0.8) / 0.06 * 31; mdir = -1; pose = 'walk'; full = 0; }
  else { cy = RU.LAND + 36 * ease((q - 0.86) / 0.14); spin = -1; cx = 63; mx = 44; full = 0; }
  return { q, cy, cx, mx, mdir, pose, tilt, full, spin, inCage: q < 0.3 || q >= 0.8 };
}
function tub(D, x, yb, full, tilt, clip) {   // a coal tub 13 px long on two small wheels; tilt 0…1 tips it forward (right)
  x = Math.round(x); const cl = clip == null ? 999 : clip, P = (xx, yy, m, tt, o) => { if (yy < cl) D.px(xx, yy, m, tt, o); }, lift = Math.round(tilt * 3);
  for (let j = 0; j < 7; j++) { const y = yb - 3 - j, inset = j > 4 ? 0 : j > 1 ? 1 : 1; for (let i = -6 + (j < 2 ? 1 : 0); i <= 6 - (j < 2 ? 1 : 0); i++) { const dy = Math.round(i * tilt * 0.35) - (i > 0 ? 0 : lift); P(x + i, y + (tilt ? dy + lift : 0), 'iron', (j === 6 ? 7 : j === 0 ? 3 : 5) + (i === -6 + (j < 2 ? 1 : 0) ? 0.8 : 0) + (i === 6 - (j < 2 ? 1 : 0) ? -1 : 0) + ((i + j) % 5 === 0 ? -0.8 : 0)); } }
  P(x - 3, yb - 6, 'brick', 4); P(x + 2, yb - 5, 'brick', 4); P(x + 4, yb - 7, 'brick', 3.5);   // rust
  if (full) for (let i = -5; i <= 5; i++) { const h = 1 + ((i * 7 + 3) % 3 === 0 ? 1 : 0) + (Math.abs(i) < 3 ? 1 : 0); for (let k = 0; k < h; k++) P(x + i, yb - 10 - k, 'ink', 1 + ((i + k) % 3 === 0 ? 1 : 0)); if ((i * 5) % 4 === 1) P(x + i, yb - 10 - h + 1, 'iron', 8); }
  [x - 4, x + 4].forEach(wx => { P(wx - 1, yb - 2, 'ink', 1.5); P(wx, yb - 2, 'iron', 6); P(wx + 1, yb - 2, 'ink', 1.5); P(wx, yb - 1, 'ink', 1.5); P(wx - 1, yb - 1, 'ink', 1); P(wx + 1, yb - 1, 'ink', 1); });
}
X.def('ruhr', {
  amb: [0.24, 0.24],
  paint(S, sc) {
    const L = {};
    L.hearth = sc.light({ x: 116, y: 80, z: 16, r: 62, i: 1.1, c: '#ff7a30', fl: 'fire', tint: 0.55 });              // hearth / taphole glow
    L.pour = sc.light({ x: 102, y: 78, z: 20, r: 54, i: 0.7, c: '#ffb040', tint: 0.3, bake: false });                  // the cast (off at rest): a warm lift, the stream's own glow carries it
    L.lamp = sc.light({ x: 64, y: 32, z: 18, r: 62, i: 0.8, c: '#ffdca0', tint: 0.3 });                                // work lamp on the tower
    L.flare = sc.light({ x: 110, y: 12, z: 10, r: 40, i: 0.8, c: '#ff9a40', fl: 'fire', ph: 3, tint: 0.5 });           // gas flare on the furnace top
    L.sky = sc.light({ x: 80, y: 62, z: 60, r: 150, i: 0.35, c: '#ff5a50', tint: 0.35 });                              // the red sky over the yard
    RU.L = L;
    // ── sky: night above, the works' red glow below, in whole-step bands ──
    S.lay('wall');
    [[0, 'night', 1], [16, 'night', 2], [28, 'night', 3], [38, 'dusk', 2], [46, 'dusk', 3], [54, 'dusk', 4], [62, 'dusk', 5], [70, 'dusk', 6]].forEach(([y, m, t], i, a) => S.rect(0, y, W, (a[i + 1] ? a[i + 1][0] : FY) - y, m, t, { e: 255 }));
    const r = S.r; for (let i = 0; i < 26; i++) S.px(r() * W, r() * 30, 'linen', 6 + r() * 3, { e: 255 });
    // smoke clouds lit from below
    [[20, 34, 30], [70, 26, 38], [120, 40, 30], [100, 50, 20]].forEach(([cx, cy, w]) => { for (let x = -w / 2; x < w / 2; x++) { const hh = Math.round(3 + Math.sin((x + cx) * 0.4) * 1.5 + Math.cos(x / w * Math.PI) * 3); for (let k = 0; k < hh; k++) S.px(cx + x, cy - k, 'night', k === 0 ? 3.6 : 1.4, { e: 255 }); S.px(cx + x, cy + 1, 'dusk', 5, { e: 255 }); } });
    // far works in silhouette: sheds, a gasometer, chimneys with red lights, lit windows
    for (let x = 0; x < W; x++) { const saw = 72 - ((x % 9) < 6 ? (x % 9) : 0); for (let y = saw; y < FY; y++) S.px(x, y, 'night', 0.6, { e: 255 }); }
    // the gasholder: a tank risen inside its guide frame, its dome and left flank caught by the red sky, a warning lamp on top
    { const G = { e: 255 }; S.rect(79, 61, 15, 29, 'night', 1, G); S.hl(80, 60, 13, 'night', 1, G); S.hl(82, 59, 9, 'night', 1, G);
      for (let y = 66; y < 90; y += 6) S.hl(79, y, 15, 'night', 2, G);
      S.hl(82, 58, 9, 'dusk', 5, G); S.px(81, 59, 'dusk', 5, G); S.px(80, 60, 'dusk', 4, G); S.px(91, 59, 'dusk', 4, G); S.px(92, 60, 'dusk', 3, G); S.vl(79, 61, 10, 'dusk', 3, G); S.vl(79, 71, 8, 'dusk', 2, G);
      [78, 86, 94].forEach(x => { S.vl(x, 53, 37, 'night', 3, G); S.px(x, 53, 'night', 4, G); });
      S.hl(77, 52, 19, 'night', 3, G); for (let y = 64; y < 90; y += 12) S.hl(78, y, 17, 'night', 3, G);
      S.rect(85, 50, 3, 2, 'night', 2, G); S.px(86, 49, 'red', 5, G); }
    [[86, 22, 3], [93, 34, 2], [143, 30, 3]].forEach(([x, top, w]) => { S.rect(x, top, w, FY - top, 'night', 0.8, { e: 255 }); S.hl(x, top + 3, w, 'night', 2, { e: 255 }); });
    for (let i = 0; i < 30; i++) S.px(r() * W, 74 + r() * 14, 'lamp', 7 + r() * 2, { e: 255 });
    // the yard: packed coal-dust earth, rails, sleepers; the chute in the ground
    S.rect(0, FY, W, H - FY, 'earth', 3.5); S.noise(0, FY, W, H - FY, 1, 3, 81);
    for (let x = 0; x < W; x += 5) S.rect(x, 91, 3, 2, 'wood', 3);
    S.hl(0, 90, W, 'iron', 8, { n: [0, -0.8] }); S.hl(0, 91, W, 'iron', 4);
    S.rect(RU.STOP, 90, 8, 5, 'ink', 1); S.hl(RU.STOP, 90, 8, 'gold', 6); S.px(RU.STOP + 8, 90, 'ink', 2);   // the chute, under the tub's front lip
    // ── back: the winding house, the tower and its strut, the blast furnace ──
    S.lay('back');
    S.beg(); TX.bricks(S, 3, 60, 18, 30, 'brick', 3.5, { bw: 6, bh: 4, v: 1 }); S.poly([[2, 60], [12, 53], [22, 60]], 'brick', 2.5); S.end();
    [[6, 66], [14, 66]].forEach(([x, y]) => { S.rect(x, y, 3, 6, 'lamp', 7, { e: 255 }); S.px(x + 1, y, 'lamp', 9, { e: 255 }); S.hl(x, y + 3, 3, 'lamp', 5, { e: 255 }); });
    // the strut (the tower leans on it toward the winding house)
    const strut = (x0, y0, x1, y1) => S.line(x0, y0, x1, y1, 'brick', 5.5, { w: 2 });
    S.beg(); strut(50, 27, 18, 88); strut(56, 27, 25, 88); for (let k = 1; k < 8; k++) { const f0 = k / 8, f1 = (k + 0.5) / 8; S.line(50 - 32 * f0, 27 + 61 * f0, 56 - 31 * f1 + 1, 27 + 61 * f1, 'brick', 4.5); } S.end();
    // the tower: two legs, ties, X-braces, the sheave deck
    S.beg(); S.box(51, 25, 3, 65, 'brick', 5.5); S.box(72, 25, 3, 65, 'brick', 5);
    for (let y = 34; y < 88; y += 12) { S.hl(54, y, 18, 'brick', 5); S.line(54, y + 1, 71, y + 11, 'brick', 4); S.line(71, y + 1, 54, y + 11, 'brick', 4); }
    S.box(47, 23, 32, 3, 'brick', 6); for (let x = 48; x < 79; x += 3) S.px(x, 22, 'brick', 4); S.hl(47, 19, 32, 'brick', 4); S.end();
    S.beg(); S.box(55, 18, 4, 5, 'iron', 5); S.box(67, 18, 4, 5, 'iron', 5); S.end();
    // sheave rims (spokes turn in anim)
    S.beg(); S.ell(57, 16, 7, 7, 'brick', 6, { ring: 1.4 }); S.end(); S.beg(); S.ell(69, 16, 7, 7, 'brick', 6, { ring: 1.4 }); S.end();
    // ropes from the winding house up the strut, over the sheaves; the second rope drops beside the leg
    S.line(18, 62, 51, 10, 'iron', 7); S.line(19, 63, 63, 10, 'iron', 6); S.vl(76, 17, 73, 'iron', 6);
    // work lamp and a red signal lamp on the deck
    S.beg(); S.box(61, 27, 5, 3, 'iron', 5); S.end(); S.rect(62, 30, 3, 1, 'lamp', 10, { e: 255 });
    S.beg(); S.box(76, 20, 3, 3, 'iron', 4); S.end();
    // blast furnace: a riveted shaft swelling to its belly, a bustle pipe, glowing tuyeres, the hearth and taphole
    const fw = (y) => y < 30 ? 10 : y < 60 ? 10 + (y - 30) / 30 * 7 : y < 72 ? 17 - (y - 60) / 12 * 2 : 15;
    S.beg(); for (let y = 24; y < 90; y++) { const hw = Math.round(fw(y)); for (let x = -hw; x <= hw; x++) { const u = x / hw; S.px(122 + x, y, 'iron', 4.6 - Math.pow(Math.abs(u), 3) * 1.6 + (u < -0.5 ? 0.8 : 0) + (y % 7 === 0 ? 1.2 : 0), { n: [u * 0.9, 0] }); } }
    for (let y = 28; y < 88; y += 7) for (let x = -Math.round(fw(y)) + 2; x < Math.round(fw(y)) - 1; x += 4) S.px(122 + x, y + 1, 'iron', 7);
    for (let k = 0; k < 5; k++) S.vl(112 + k * 5, 30 + (k % 2) * 9, 8, 'brick', 4);   // rust runs
    S.end();
    // the hearth below the tuyeres: firebrick banded with iron hoops (the fire light warms brick instead of washing plate iron pink)
    TX.bricks(S, 107, 73, 31, 17, 'brick', 3, { bw: 6, bh: 3, v: 0.8, pits: 1 }); S.ao(107, 73, 8, 17, 'l', 1.2); S.ao(130, 73, 8, 17, 'r', 1.8);
    [75, 83].forEach(y => { S.hl(107, y, 31, 'iron', 5, { n: [0, -0.5] }); S.hl(107, y + 1, 31, 'iron', 3); });
    S.beg(); S.hcyl(103, 60, 38, 4, 'copper', 5.5, { rim: 1.5 }); S.end();
    for (let k = 0; k < 6; k++) { const x = 108 + k * 5; S.line(x, 64, x, 70, 'copper', 4); S.rect(x - 1, 70, 3, 2, 'fire', 7, { e: L.hearth + 1 }); }
    S.rect(110, 78, 5, 4, 'ink', 1); S.rect(111, 79, 3, 2, 'fire', 8, { e: L.hearth + 1 });
    // the trough from the taphole down to the ladle
    S.beg(); S.poly([[96, 82], [111, 80], [111, 83], [96, 85]], 'brick', 4); S.line(96, 82, 111, 80, 'brick', 6); S.end();
    // top: charging platform with a rail, gas uptakes arching over into the downcomer, the flare stack
    S.beg(); S.box(106, 20, 32, 4, 'iron', 5, { top: 1 }); for (let x = 107; x < 138; x += 4) S.vl(x, 15, 5, 'iron', 6); S.hl(106, 15, 32, 'iron', 7); S.end();
    S.beg(); S.cyl(115, 8, 4, 12, 'iron', 5, { rim: 1.5 }); S.cyl(128, 10, 4, 10, 'iron', 5, { rim: 1.5 }); S.hcyl(128, 8, 12, 4, 'iron', 5.5, { rim: 1.5 }); S.cyl(138, 8, 4, 82, 'iron', 4.5, { rim: 1.5 }); S.end();
    S.beg(); S.cyl(109, 9, 2, 11, 'iron', 6); S.rect(108, 8, 4, 1, 'iron', 7); S.end();
    // ladle car on the rails (molten level in anim)
    S.beg(); for (let y = 76; y < 87; y++) { const k = (y - 76) / 10, hw = 8 - k * k * 3.5; for (let x = -Math.round(hw); x <= Math.round(hw); x++) { const u = x / hw; S.px(97 + x, y, 'iron', 4.8 - Math.pow(Math.abs(u), 3) * 1.8 + (u < -0.4 ? 0.7 : 0) + (y === 79 || y === 83 ? 1.1 : 0), { n: [u * 0.8, 0] }); } }
    S.hl(89, 76, 17, 'iron', 7.5, { n: [0, -0.8] }); S.hl(90, 77, 15, 'iron', 2.5); S.rect(88, 78, 1, 3, 'iron', 6); S.rect(106, 78, 1, 3, 'iron', 5); S.px(94, 81, 'brick', 4); S.px(100, 84, 'brick', 4);
    S.rect(90, 87, 15, 1, 'iron', 3); S.rect(90, 88, 3, 2, 'iron', 5); S.rect(102, 88, 3, 2, 'iron', 5); S.end();
    // ── mid: the shaft collar the cage rises through ──
    S.lay('mid');
    S.beg(); S.rect(50, 89, 27, 3, 'iron', 5); S.hl(50, 89, 27, 'gold', 6); for (let x = 51; x < 77; x += 4) S.px(x, 90, 'ink', 2); S.end();
    // ── front: a coal heap, a stack of pig iron ──
    S.lay('front');
    S.beg(); for (let i = 0; i < 70; i++) { const x = 4 + r() * 22, h = 10 * Math.sin((x - 4) / 22 * Math.PI) * (0.6 + r() * 0.4), y = 103 - r() * h; S.rect(x, y, 2, 2, 'ink', 1 + (r() < 0.3 ? 1 : 0)); if (r() < 0.2) S.px(x, y, 'iron', 7); } S.end();
    for (let k = 0; k < 4; k++) { S.beg(); S.box(126 + (k % 2) * 3, 99 - k * 3, 17, 3, 'iron', 4.5 + (k % 2) * 0.6); S.hl(127 + (k % 2) * 3, 99 - k * 3, 15, 'brick', 4); S.end(); }
    sc.emit({ k: 'ember', x: 110, y: 6, w: 3, rate: 1.4, sp: 6, ang: 0.2, spread: 0.6, life: 1.6 });
  },
  anim(D, t, rs) {
    const st = rs.st, L = RU.L; rs.mul[L.pour] = 0; const c = ruCycle(t);
    // sheaves turn with the rope: however far the cage travels, that far the rim turns (angle from the cage height, continuous in t)
    const sa = c.cy / 5.5;
    D.lay('back'); [[57, 16, 1], [69, 16, -1]].forEach(([x, y, s2]) => { for (let k = 0; k < 6; k++) { const a = sa * s2 + k * Math.PI / 3; D.line(x, y, x + Math.cos(a) * 5.5, y + Math.sin(a) * 5.5, 'brick', 4.5); } D.rect(x - 1, y - 1, 3, 3, 'iron', 7); });
    // the cage on its rope, rising out of the shaft (clipped at the collar)
    const cy = Math.round(c.cy), top = cy - 19;
    if (top < 89) { D.vl(63, 17, Math.max(0, top - 17), 'iron', 7);
      for (let y = top; y < Math.min(90, cy + 1); y++) { const rim = y === top || y === cy || y === top + 1; for (let x = 55; x <= 71; x++) { if (rim || x === 55 || x === 71) D.px(x, y, 'iron', rim ? (y === top ? 8 : 5.5) : x === 55 ? 6.5 : 4.5); else if ((x - 55) % 4 === 0) D.px(x, y, 'iron', 5); } }
      if (top + 1 < 90) D.px(63, top - 1, 'iron', 8); }
    // signal lamp: red while the cage runs, then green
    D.rect(76, 20, 3, 2, c.spin ? 'red' : 'screen', c.spin ? (Math.floor(t * 4) % 2 ? 9 : 6) : 8, { e: 255 });
    // the tub: in the cage while it runs (clipped), then out along the rail to the chute
    D.lay('mid'); const tx = c.inCage ? 63 : c.cx, ty = c.inCage ? cy + 1 : RU.LAND + 1;   // in the cage it rides on the cage floor (down the shaft it is clipped away)
    tub(D, tx, ty, c.full, c.tilt, c.inCage ? 89 : null);
    // tipping: lumps of coal tumble off the lip into the chute and a cloud of coal dust rolls up out of it
    if (c.pose === 'tip' && c.tilt > 0.3) for (let k = 0; k < 7; k++) { const f = ((t * 2.6 + k / 7) % 1 + 1) % 1, x = Math.round(RU.STOP + 5 - f * 4 + (k % 3) - 1), y = Math.round(83 + f * f * 8);
      D.px(x, y, 'ink', 1); if (k % 2) { D.px(x + 1, y, 'ink', 1); D.px(x, y - 1, 'iron', 6); } }
    if (c.q > 0.52 && c.q < 0.66) { const a0 = (c.q - 0.52) / 0.14; D.lay('mid');
      [[0, RU.STOP + 1, 0], [0.18, RU.STOP - 3, 1], [0.34, RU.STOP + 3, 2]].forEach(([d0, x0, i]) => { const a = (a0 - d0) / 0.66; if (a <= 0 || a >= 1) return; const r = 1.5 + a * 3.2, cx = x0 + a * (i - 1) * 1.5, cy = 89 - a * 9, cut = a > 0.55 ? (a - 0.55) * 1.8 : 0;
        for (let yy = Math.floor(cy - r); yy <= Math.ceil(cy + r); yy++) for (let xx = Math.floor(cx - r * 1.2); xx <= Math.ceil(cx + r * 1.2); xx++) { const u = (xx + 0.5 - cx) / (r * 1.2), v = (yy + 0.5 - cy) / r, d = u * u + v * v; if (d > 1 || yy > 89) continue;
          if (cut && X.vnoise(xx / 2.2, yy / 2.2, 7 + i) < cut) continue; D.px(xx, yy, 'earth', v < -0.35 ? 7 : d > 0.6 ? 5 : 6, { n: [u * 0.6, v * 0.6] }); } });
      if (!st.dust && a0 > 0.1) { st.dust = 1; rs.burst('dust', RU.STOP + 2, 86, 5, { sp: 8, ang: 0, spread: 2, life: 1.4, w: 8, h: 4 }); } }
    if (c.q < 0.5) st.dust = 0;
    // the miner: a lamp on his helmet lights his way
    const ph = t * (c.pose === 'push' ? 6 : 8), walk = c.pose === 'walk' || c.pose === 'push', lk = { skin: ['skin', 6], hair: ['hair', 3], top: ['denim', 3.5], bot: ['denim', 2.5], boot: ['hair', 2], cap: ['linen', 8] };
    const mp = c.pose === 'push' ? { aF: 1.5, eF: -0.3, aB: 1.3, eB: -0.3, lean: 0.8, lF: Math.sin(ph) * 0.5, lB: -Math.sin(ph) * 0.5, kF: Math.max(0, -Math.sin(ph)) * 0.6, kB: Math.max(0, Math.sin(ph)) * 0.6, bob: -Math.abs(Math.cos(ph)) + 0.4 }
      : c.pose === 'tip' ? { aF: 1.9 + c.tilt * 0.5, eF: -0.5, aB: 1.6 + c.tilt * 0.5, eB: -0.4, lean: 0.6 + c.tilt * 0.4, lF: 0.4, lB: -0.4 }
      : walk ? { lF: Math.sin(ph) * 0.55, lB: -Math.sin(ph) * 0.55, kF: Math.max(0, -Math.sin(ph)) * 0.6, kB: Math.max(0, Math.sin(ph)) * 0.6, aF: -Math.sin(ph) * 0.4, aB: Math.sin(ph) * 0.4, eF: -0.3, eB: -0.3, bob: -Math.abs(Math.cos(ph)) + 0.4 }
      : { aF: 0.3, eF: -1.4, aB: 0.2, eB: -1.2, lean: -0.1 };
    const mx = Math.round(c.mx); figure(D, mx, FY, lk, mp, c.mdir);
    const hlx = mx + Math.round((mp.lean || 0) * 3 * c.mdir) + 2 * c.mdir, hly = FY - 28 + Math.round(mp.bob || 0);
    if (!X.noWorkers) { D.px(hlx, hly, 'lamp', 11, { e: 255 }); D.px(hlx + c.mdir, hly, 'lamp', 9, { e: 255 });
      rs.dl.push({ x: hlx + c.mdir * 6, y: hly + 6, z: 20, r: 18, i: 0.55, rgb: [255, 236, 190], tint: 0 }); }
    // furnace: the flare on its stack, the cast every twelve seconds (locked to the cage: the tub is down the shaft meanwhile)
    flame(D, 110, 7, 6, t, 0.7); flame(D, 109, 7, 4, t, 2.2);
    const tq = steps(t + RU.TOFF, RU.TP), lance = tq < 0.12, pour = tq > 0.1 && tq < 0.5, thin = tq > 0.42 ? 1 - (tq - 0.42) / 0.08 : 1;
    // the keeper and his lance
    const kx = 126, lunge = lance ? Math.sin(tq / 0.12 * Math.PI) : 0;
    figure(D, kx, FY, { skin: ['skin', 6], hair: ['hair', 3], top: ['iron', 3], bot: ['hair', 3], boot: ['hair', 2], apron: ['leather', 2], cap: ['iron', 7] }, { aF: 1.5 - lunge * 0.2, eF: -0.2, aB: 1.3, eB: -0.2, lean: 0.3 + lunge * 0.6, lF: 0.3, lB: -0.3, kB: 0.2 }, -1);
    const hx0 = kx - 6 - Math.round(lunge * 2), hy0 = FY - 15; if (!X.noWorkers) { D.line(hx0, hy0, 114 + Math.round(lunge * -2), 80, 'iron', 7.5); D.line(hx0, hy0 + 1, 114 + Math.round(lunge * -2), 81, 'iron', 4); }
    if (tq > 0.1 && !st.tap) { st.tap = 1; rs.flash(L.pour, 1.6); rs.flash(L.hearth, 0.6); rs.burst('spark', 112, 80, 18, { sp: 44, ang: -0.6, spread: 1.6, life: 1, floor: FY - 1 }); }
    if (tq < 0.05) st.tap = 0;
    // molten iron runs down the trough and falls into the ladle; the ladle fills and slowly cools
    if (pour) { rs.flash(L.pour, 0.75 + R() * 0.35); const w = thin > 0.5 ? 2 : 1;
      for (let x = 97; x <= 111; x++) { const y = Math.round(81 - (x - 97) * 2 / 14) - 1, g = (x * 3 - Math.floor(t * 24)) % 5; D.px(x, y, 'fire', g ? 10 : 11, { e: 255 }); if (w > 1) D.px(x, y - 1, 'fire', g ? 8 : 10, { e: 255 }); }
      for (let y = 82; y < 86; y++) D.px(96 - (y > 83 ? 1 : 0), y, 'fire', (y + Math.floor(t * 20)) % 2 ? 11 : 9, { e: 255 });
      if (R() < 0.45) rs.burst('spark', 96, 82, 1 + (R() < 0.25 ? 1 : 0), { sp: 30, ang: -0.5 + (R() - 0.5), spread: 1.4, life: 0.8, floor: FY - 1 });
      if (R() < 0.25) rs.burst('ember', 97, 76, 1, { sp: 8, ang: 0, spread: 0.8, life: 1.4, w: 10 }); }
    const fill = tq < 0.1 ? Math.max(0, 1 - tq / 0.08) : tq < 0.5 ? (tq - 0.1) / 0.4 : 1, heat = tq < 0.1 ? 0.25 : tq < 0.5 ? 1 : Math.max(0.25, 1 - (tq - 0.5) / 0.5 * 0.75);   // the old, cooled charge drains while he lances
    // the mouth glows over the molten iron inside (it keeps the ladle a pot when the pour lights it up), dimming as it cools
    const mg = heat * Math.min(1, fill * 2); if (mg > 0.1) for (let x = 90; x < 105; x++) D.px(x, 77, 'fire', 3 + mg * 6.5 + ((x + Math.floor(t * 5)) % 5 ? 0 : 1), { e: 255 });
    const lv = Math.round(84 - fill * 6); if (fill > 0.05) for (let x = 91; x < 104; x++) { D.px(x, lv, 'fire', 5 + heat * 5 + ((x + Math.floor(t * 6)) % 4 ? 0 : 1), { e: 255 }); if (lv < 83) D.px(x, lv + 1, 'fire', 3 + heat * 4, { e: 255 }); }
    // smoke rolls off the far chimneys, lit red from below (glow pixels: the sky does not take light)
    D.lay('wall'); [[87.5, 21, 0], [94, 33, 3], [144.5, 29, 6]].forEach(([x0, y0, ph2]) => { for (let k = 0; k < 4; k++) { const q = steps(t * 0.22 + k / 4 + ph2 * 0.1, 1), px = x0 + q * 22, py = y0 - 2 - q * 12, rr = 1.5 + q * 3.5;
      for (let yy = -Math.ceil(rr); yy <= Math.ceil(rr); yy++) for (let xx = -Math.ceil(rr * 1.3); xx <= Math.ceil(rr * 1.3); xx++) { const d = (xx * xx) / (rr * rr * 1.69) + (yy * yy) / (rr * rr); if (d > 1) continue; D.px(px + xx, py + yy, 'dusk', yy > rr * 0.35 ? 4.4 - q * 1.2 : 2.4 - q, { e: 255 }); } } });
    // red lights on the far chimneys
    if (Math.floor(t * 1.2) % 2) { D.px(87, 22, 'red', 9, { e: 255 }); D.px(144, 30, 'red', 9, { e: 255 }); } else { D.px(94, 34, 'red', 9, { e: 255 }); D.px(86, 49, 'red', 10, { e: 255 }); D.px(85, 49, 'red', 6, { e: 255 }); D.px(87, 49, 'red', 6, { e: 255 }); }
    X.twinkle(D, t, 6, 26, 21);
  },
});

// ═════════ 埃菲尔铁塔 eiffel (steam · power · legendary) ═════════
// Paris at the blue hour, from the near quay: a rose-and-violet sky, a low deck of cloud drifting on the evening wind, the
// tower over the Seine glowing gold from within, its platforms ringed with lamps. Lift cabins climb and drop along its legs
// (their lamps light the girders as they pass); a searchlight on the top sweeps round and lights up the clouds it crosses.
// A glass-roofed tour boat glides down the river, windows lit, a floodlight washing the far embankment, foam in its wake
// and its windows broken up in the water; the tower's lamps hang in the river as wavering columns of gold; car lamps run
// along the far bank under the lit windows of the city; a plane blinks across. The moment, every twelve seconds: the light
// show — white sparkles pour down the tower from the top and dance all over it, a second beam lights up opposite the
// first, both rake the clouds, the river columns glitter white, and the painter at his easel turns to watch.
const EF = { cx: 75, base: 80, SP: 12, BY: 11, BP: 46 };
const efWo = (y) => 2 + 23 * Math.exp(-(EF.base - y) / 19);                       // outer half-width
const efWi = (y) => y < 47 ? 0 : y < 64 ? efWo(y) - (3 + (y - 47) / 17 * 2) : efWo(y) - (5 + (y - 64) / 16 * 4);   // leg inner half-width
// low clouds: [x at t 0, flat base y, length, height, drift px/s], wrapping round a 230-px loop
const EF_CL = [[0, 13, 32, 5, 1.1], [58, 19, 44, 6, 0.75], [104, 9, 24, 4, 1.3], [150, 22, 36, 5, 0.9], [196, 15, 28, 4, 1.0], [132, 27, 22, 3, 0.6]];
// the light show and the searchlight beams at this moment: the main beam turns all the time; in the show a twin beam
// lights up opposite it (amp fades the show in and out)
function efShow(t) {
  const sq = steps(t, EF.SP), on = sq < 0.3, amp = !on ? 0 : sq < 0.03 ? sq / 0.03 : sq > 0.25 ? (0.3 - sq) / 0.05 : 1, beams = [];
  [0, 1].forEach(k => { if (k && amp < 0.3) return; const a = t * 0.75 + k * Math.PI, sx = Math.sin(a); beams.push({ dir: sx > 0 ? 1 : -1, len: Math.abs(sx) * 160, toward: Math.cos(a), g: k ? amp : 1 + amp * 0.25 }); });
  return { sq, on, amp, beams };
}
// how hard the beams hit a pixel of cloud: 3 the core, 2 inside the beam, 1 its spill, 0 clear
function efHit(beams, x, y) {
  let v = 0; for (const b of beams) { const d = (x - EF.cx) * b.dir; if (d < 3 || d > b.len) continue; const yc = EF.BY - 1 + d * 0.06, hw = Math.min(4, 0.6 + d * 0.04), u = Math.abs(y + 0.5 - yc), w = u <= 1.2 ? 3 : u <= hw + 1.5 ? 2 : u <= hw + 4 ? 1 : 0; if (w > v) v = w; }
  return v;
}
// the cloud deck: flat rose-lit undersides, violet bodies, darker crowns; where a beam passes, the cloud blazes cream and white
function efClouds(D, t, beams) {
  const G = { e: 255 };
  EF_CL.forEach(([x0, y, len, hh, sp], k) => { const x = ((x0 + t * sp) % 230 + 230) % 230 - 45;
    for (let i = 0; i < len; i++) { const xx = Math.round(x + i); if (xx < 3 || xx > W - 4) continue;
      const f = i / (len - 1), top = Math.max(1, Math.round(hh * Math.pow(Math.sin(f * Math.PI), 0.7) + Math.sin(i * 0.8 + k * 2.1) * 0.9)), bot = ((i + k * 3) % 9 === 0 || f < 0.06 || f > 0.94) ? 1 : 0;
      for (let j = bot; j < top; j++) { const yy = y - j, hit = efHit(beams, xx, yy); let m = 'dusk', tn = j === bot ? 7 : j === bot + 1 ? 5 : j === top - 1 && top - bot > 2 ? 3 : 4;
        if (hit === 3) { m = 'linen'; tn = 10; } else if (hit === 2) { m = 'bone'; tn = j === bot ? 9 : 8; } else if (hit === 1) tn = Math.min(7, tn + 2);
        D.px(xx, yy, m, tn, G); } } });
}
// the Seine: the tower's lamps as wavering columns of gold (white glitter in the show), the embankment lamps' streaks,
// the rose sky and dark ripples rolling across
function efRiver(D, t, show) {
  const G = { e: 255 }, col = EF.col;
  for (let y = 81; y < 90; y++) { const k = y - 80, wob = Math.round(Math.sin(t * 2.1 + y * 1.3) * (0.5 + k * 0.12));
    for (let x = 3; x < W - 3; x++) { const w = Math.sin(x * 0.5 + y * 2.1 - t * 2.6) + 0.6 * Math.sin(x * 0.17 - t * 1.2 + y * 0.9), c = col[x];
      if (c > 0.12 && w > 0.9 - c * 1.4 + k * 0.1) { const sp = show && R() < 0.07; D.px(x + wob, y, sp ? 'linen' : 'lamp', sp ? 11 : clamp(Math.round(9.4 - k * 0.45 + c), 5, 11), G); continue; }
      if (w > 1.3) D.px(x, y, k < 4 ? 'dusk' : 'water', k < 4 ? 5 : 4, G); } }
  for (let x = 3; x < W - 3; x += 9) { if (Math.abs(x - EF.cx) < 27) continue; for (let y = 81; y < 86; y++) if (Math.sin(t * 3 + y * 1.7 + x) > -0.3) D.px(x + Math.round(Math.sin(t * 2.3 + y * 1.1)), y, 'lamp', 9 - (y - 81), G); }
}
// the tour boat heading downstream (left): hull, lit glass cabin with passengers, wheelhouse, tricolour, wake and reflections
function efBoat(D, t, rs) {
  const q = steps(t + 9, EF.BP), bx = Math.round(178 - q * 212); if (bx < -26 || bx > 176) return;
  const G = { e: 255 }, x0 = bx - 20;   // bow at x0, stern at x0 + 40
  D.lay('wall');
  // the wake: churned foam under the stern that breaks up and spreads toward us as it falls behind
  for (let i = 0; i < 32; i++) { const x = x0 + 41 + i; if (x < 3 || x > W - 4) continue; const f = (k) => Math.sin(i * 1.3 - t * 9 + k) + Math.sin(i * 0.37 + t * 2.1 + k * 2) > i / 32 * 1.6 - 0.5;
    if (f(0)) D.px(x, 87, i < 8 ? 'linen' : i < 18 ? 'linen' : 'water', i < 8 ? 9 : i < 18 ? 7 : 7, G);
    if (i > 4 && f(1.7)) D.px(x, 88, i < 14 ? 'linen' : 'water', 6, G);
    if (i > 12 && f(3.1)) D.px(x, 89, 'water', 6, G); }
  for (let i = 0; i < 3; i++) D.px(x0 - 3 - i, 87, 'linen', 9 - i * 2, G);
  for (let x = x0 + 6; x < x0 + 35; x++) { const w = Math.round(Math.sin(t * 2.6 + x * 0.4)); if (Math.sin(x * 0.9 - t * 3.1) > -0.3 && (x - x0) % 3 !== 2) D.px(x + w, 88, 'lamp', 7, G);
    if ((x + Math.floor(t * 4)) % 4 === 0) D.px(x - w, 89, 'lamp', 5, G); if ((x * 3) % 5 === 0) D.px(x, 87, 'linen', 5, G); }
  D.lay('mid');
  D.poly([[x0 - 2, 83], [x0 + 41, 83], [x0 + 41, 87], [x0 + 3, 87]], 'linen', 7);
  D.hl(x0 - 1, 83, 42, 'linen', 9, { n: [0, -0.8] }); D.hl(x0 + 1, 85, 40, 'denim', 4); D.hl(x0 + 3, 86, 38, 'linen', 5);
  D.rect(x0 + 5, 79, 31, 4, 'linen', 6); D.hl(x0 + 5, 82, 31, 'linen', 8);
  for (let i = 0; i < 10; i++) { const wx = x0 + 6 + i * 3; D.rect(wx, 80, 2, 2, 'lamp', (i + 1) % 4 ? 9 : 8, G); if ((i * 5 + 2) % 7 < 3) D.px(wx + (i % 2), 81, 'ink', 1); }
  D.hl(x0 + 5, 78, 31, 'glass', 7, { n: [0, -0.8] }); for (let x = x0 + 7; x < x0 + 35; x += 5) D.px(x, 78, 'glass', 10);
  D.rect(x0 + 33, 75, 6, 3, 'linen', 7); D.hl(x0 + 33, 75, 6, 'linen', 9); D.rect(x0 + 34, 76, 3, 1, 'lamp', 7, G);
  const fw = Math.round(Math.sin(t * 6) * 0.6); D.vl(x0 + 40, 73, 10, 'iron', 6);
  D.px(x0 + 41, 73, 'denim', 6); D.px(x0 + 42, 73 + fw, 'linen', 9); D.px(x0 + 43, 73 + fw, 'red', 6); D.px(x0 + 41, 74, 'denim', 5); D.px(x0 + 42, 74 + fw, 'linen', 8); D.px(x0 + 43, 74 + fw, 'red', 5);
  D.vl(x0 + 8, 76, 3, 'iron', 6); D.px(x0 + 8, 75, 'linen', 11, G); D.px(x0 - 1, 84, 'red', 9, G);
  dynOutline(D, x0 - 3, 72, x0 + 44, 87);
  rs.dl.push({ x: x0 + 2, y: 76, z: 6, r: 24, i: 0.9, rgb: [255, 236, 200], tint: 0.25 });   // its floodlight washes the far embankment
}
// lift cabins: two ride the legs from the ground to the second floor (in turn), one climbs the top from there;
// each lamp lights the girders round it
function efLifts(D, t, rs) {
  const G = { e: 255 }, u = (ph, per) => { const q = steps(t + ph, per); return q < 0.4 ? ease(q / 0.4) : q < 0.5 ? 1 : q < 0.9 ? 1 - ease((q - 0.5) / 0.4) : 0; };
  const cab = (x, y, big) => { const hid = (yy) => (yy >= 62 && yy <= 64) || yy === 45 || yy === 46 || yy === 15 || yy === 16;
    const P = (xx, yy, m, tn, o) => { if (!hid(yy)) D.px(xx, yy, m, tn, o); };
    if (big) { for (let i = -1; i <= 1; i++) { P(x + i, y - 3, 'iron', 7); P(x + i, y - 2, 'lamp', 9, G); P(x + i, y - 1, 'lamp', i ? 9 : 11, G); P(x + i, y, 'iron', 4); } }
    else { P(x, y - 2, 'iron', 7); P(x, y - 1, 'lamp', 11, G); P(x + 1, y - 1, 'lamp', 9, G); P(x, y, 'iron', 4); }
    rs.dl.push({ x, y: y - 1, z: 8, r: big ? 11 : 8, i: 0.7, rgb: [255, 214, 150], tint: 0.4 }); };
  [[-1, 0], [1, 5]].forEach(([sd, ph]) => { const y = Math.round(78 - u(ph, 10) * 31), wo = efWo(y), wi = Math.max(efWi(y), wo - 5); cab(Math.round(EF.cx + sd * (wo + wi) / 2), y, 1); });
  cab(EF.cx, Math.round(43 - u(2.5, 13) * 25), 0);
}
X.def('eiffel', {
  amb: [0.26, 0.26],
  paint(S, sc) {
    const L = {};
    L.flood = sc.light({ x: 75, y: 50, z: 8, r: 52, i: 1, c: '#ffc060', tint: 0.45 });                                 // floodlights on the tower: they reach its legs and the far bank, not this side
    L.beacon = sc.light({ x: 75, y: 10, z: 14, r: 26, i: 0.8, c: '#fff0c0', fl: 'pulse', amp: 0.3, sp: 3.5, tint: 0.4 });
    L.lamp = sc.light({ x: 15, y: 82, z: 24, r: 40, i: 1.05, c: '#ffc878', fl: 'candle', ph: 1.3, tint: 0.8 });          // street lamp: its light falls on the quay below it
    L.spark = sc.light({ x: 75, y: 40, z: 24, r: 76, i: 1, c: '#e8f0ff', tint: 0.3, bake: false });                    // the light show (off at rest)
    L.dusk = sc.light({ x: 75, y: 62, z: 34, r: 150, i: 0.3, c: '#ff8aa0', tint: 0.18 });                              // the rose afterglow in the west
    EF.L = L;
    S.lay('wall'); const r = S.r, G = { e: 255 };
    // sky: whole-step bands from night indigo through violet and rose to a salmon glow on the horizon, their edges gently waved
    const SK = [[0, 'night', 2], [8, 'dusk', 2], [17, 'dusk', 3], [27, 'dusk', 4], [38, 'dusk', 5], [49, 'dusk', 6], [59, 'dusk', 7]], edge = (i, x) => (i ? SK[i][0] + Math.round(Math.sin(x * 0.045 + i * 1.7) * 1.4) : 0);
    for (let x = 0; x < W; x++) for (let i = 0; i < SK.length; i++) { const y1 = SK[i + 1] ? edge(i + 1, x) : FY; for (let y = edge(i, x); y < y1; y++) S.px(x, y, SK[i][1], SK[i][2], G); }
    for (let i = 0; i < 14; i++) S.px(r() * W, r() * 15, 'linen', r() < 0.3 ? 9 : 7, G);
    // far Paris in the haze: a violet band of roofs along the horizon, a few lights
    for (let x = 0; x < W;) { const bw = 4 + Math.floor(r() * 7), top = 64 + Math.floor(r() * 5); S.rect(x, top, bw, 80 - top, 'dusk', 5, G); S.hl(x, top, bw, 'dusk', 6, G); if (r() < 0.6) S.px(x + 1 + Math.floor(r() * Math.max(1, bw - 2)), top + 2 + Math.floor(r() * 3), 'lamp', 7, G); x += bw; }
    // nearer Paris in silhouette: mansard roofs with chimney pots and many lit windows, the hill of the white basilica
    for (let x = 0; x < W; x++) { const hill = Math.round(8 * Math.exp(-((x - 24) * (x - 24)) / 300)); for (let y = 72 - hill; y < 80; y++) S.px(x, y, 'night', 1, G); }
    for (let x = 0; x < W;) { const bw = 7 + Math.floor(r() * 8), bh = 4 + Math.floor(r() * 7), top = 75 - bh; S.rect(x, top + 2, bw, 80 - top, 'night', 1, G); S.rect(x + 1, top, bw - 2, 2, 'night', 1, G);
      for (let k = 0; k < bw / 4; k++) S.px(x + 1 + Math.floor(r() * (bw - 2)), top - 1, 'night', 1, G);
      for (let k = 0; k < bw * bh / 8; k++) if (r() < 0.7) S.px(x + 1 + Math.floor(r() * (bw - 2)), top + 3 + Math.floor(r() * (bh - 2)), 'lamp', r() < 0.3 ? 9 : 7, G); x += bw; }
    // the white basilica on its hill, floodlit: a big dome with its lantern, two small domes, the bell tower behind (whole steps: no dither)
    { const B = (x, y, t) => S.px(x, y, 'bone', t, G);
      S.rect(18, 62, 14, 4, 'bone', 6, G); S.hl(18, 62, 14, 'bone', 7, G); S.vl(31, 62, 4, 'bone', 5, G);
      for (let y = 57; y <= 61; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 61.5) / 4.5) ** 2)) * 3.4); for (let x = -hw; x <= hw; x++) B(24 + x, y, x < 0 ? 7 : x > 1 ? 5 : 6); }
      S.vl(24, 54, 3, 'bone', 7, G); B(24, 53, 8); S.hl(23, 56, 3, 'bone', 6, G);
      [[20, 61], [28, 61]].forEach(([x, y]) => { S.hl(x - 1, y, 3, 'bone', 6, G); B(x - 1, y, 7); B(x, y - 1, 7); B(x + 1, y, 5); B(x, y - 2, 7); });
      S.rect(33, 55, 2, 11, 'bone', 5, G); S.vl(33, 55, 11, 'bone', 6, G); B(33, 54, 6); B(34, 54, 5); B(33, 53, 7);
      [[20, 63], [24, 63], [28, 63], [33, 58]].forEach(([x, y]) => S.px(x, y, 'night', 2, G)); }
    // the gilded dome of the Invalides between the far trees: a ribbed gold dome on a floodlit stone drum, lantern and spire
    { for (let y = 61; y <= 65; y++) { const hw = Math.sqrt(Math.max(0, 1 - ((y - 65.5) / 4.6) ** 2)) * 4.6; for (let x = 95; x <= 104; x++) { const u = (x + 0.5 - 100) / hw; if (Math.abs(u) > 1) continue; S.px(x, y, 'gold', u < -0.45 ? 7 : u > 0.4 ? 4 : 6, G); } }
      [98, 101].forEach(x => S.vl(x, 62, 4, 'gold', 4, G)); S.px(97, 62, 'gold', 8, G);
      S.rect(96, 66, 8, 4, 'bone', 5, G); S.hl(96, 66, 8, 'bone', 6, G); [97, 99, 101].forEach(x => S.vl(x, 67, 2, 'night', 2, G)); S.vl(103, 66, 4, 'bone', 4, G);
      S.rect(93, 70, 14, 5, 'night', 2, G); S.hl(93, 70, 14, 'bone', 4, G);
      S.rect(99, 59, 2, 2, 'gold', 6, G); S.px(99, 59, 'gold', 8, G); S.vl(99, 55, 4, 'gold', 7, G); S.px(99, 54, 'gold', 10, G); }
    // the Seine: the rose horizon on its far edge, dark water toward us
    S.rect(0, 80, W, 10, 'water', 2, G); S.hl(0, 80, W, 'dusk', 4, G); S.rect(0, 84, W, 6, 'water', 1, G);
    // far embankment: a stone wall with a row of lamps on posts along the road on top
    S.rect(0, 77, W, 3, 'stone', 3); S.hl(0, 77, W, 'stone', 5, { n: [0, -0.8] }); for (let x = 3; x < W; x += 9) { S.px(x, 75, 'night', 3, G); S.px(x, 76, 'night', 3, G); S.px(x, 74, 'lamp', 10, G); }
    // the near quay: flagstones, the parapet edge
    TX.ashlar(S, 0, FY, W, H - FY, 'stone', 5, { bh: 5, bw: 16, crack: 0.1 });
    S.hl(0, 90, W, 'stone', 7, { n: [0, -0.8] }); S.hl(0, 91, W, 'stone', 4);
    // the street lamp's pool on the quay flags: the flags under it turn warm (same tones on the warm stone ramp) and brighter
    { const Y = S.c, from = X.MI.stone, to = X.MI.mstone; for (let y = 90; y < 102; y++) { const x1 = Math.round(27 + (y - 90) * 0.55 - Math.abs(y - 95) * 0.3); for (let x = 0; x < x1; x++) { const p = y * W + x; if (Y.m[p] === from) Y.m[p] = to; } } }
    S.shadow([[0, 90], [30, 90], [36, 101], [0, 101]], -0.8); S.shadow([[3, 91], [22, 91], [26, 101], [0, 101]], -0.6);
    // ── back: the tower ──
    S.lay('back'); const cx = EF.cx, pts = [];
    for (let y = 9; y <= EF.base; y++) { const wo = efWo(y), wi = efWi(y), a = Math.round(wo), thick = y > 47 ? 2 : 1;
      for (let x = -a; x <= a; x++) { const ax = Math.abs(x), edgeO = ax > a - thick, edgeI = wi > 0 && Math.abs(ax - Math.round(wi)) < 0.5, inLeg = ax >= wi - 0.5;
        const X0 = cx + x; let on = 0, m = 'brass', t = 5.5, e = 0;
        if (!inLeg) { // the opening between the legs: lattice above the great arch, sky below it
          if (y >= 64) { const k = ax / Math.max(1, efWi(78)), ay = 67 + 11 * k * k; if (y < ay - 0.5 && ((X0 + y) % 4 === 0 || (X0 - y) % 4 === 0)) { on = 1; m = 'lamp'; t = 5; e = L.flood + 1; } }
          else if ((X0 + y) % 5 === 0 || (X0 - y) % 5 === 0) { on = 1; m = 'lamp'; t = 4.6; e = L.flood + 1; } }
        else if (edgeO) { on = 1; t = ax === a ? (x < 0 ? 7.4 : 5.4) : 6.4; }
        else if (edgeI) { on = 1; t = 5.2; }
        else if ((X0 + y) % 4 === 0 || (X0 - y) % 4 === 0) { on = 1; m = 'lamp'; t = 6 - (EF.base - y) / 90; e = L.flood + 1; }
        if (on) { S.px(X0, y, m, t, { n: [x < 0 ? -0.5 : 0.5, 0], e }); pts.push(X0, y); } } }
    // the great arch between the legs
    { const wi78 = efWi(78); let px0 = null; for (let x = -Math.round(wi78); x <= Math.round(wi78); x++) { const k = Math.abs(x) / wi78, ay = Math.round(67 + 11 * k * k); if (px0) { S.line(px0[0], px0[1], cx + x, ay, 'brass', 7.2); S.line(px0[0], px0[1] + 1, cx + x, ay + 1, 'brass', 4.5); } px0 = [cx + x, ay]; } }
    // platforms, ringed with lamps (the lamps join the sparkle points)
    const plat = (y, h, ext) => { const a = Math.round(efWo(y)) + ext; S.beg(); S.rect(cx - a, y, a * 2 + 1, h, 'brass', 5.5); S.hl(cx - a, y, a * 2 + 1, 'brass', 7.5, { n: [0, -0.8] }); S.end(); for (let x = cx - a + 1; x < cx + a; x += 2) { S.px(x, y + h - 1, 'lamp', 9, { e: L.flood + 1 }); pts.push(x, y + h - 1); } };
    plat(62, 3, 3); plat(45, 2, 2); plat(15, 2, 1);
    for (let x = cx - Math.round(efWo(63)) - 2; x < cx + Math.round(efWo(63)) + 3; x += 3) S.px(x, 63, 'brass', 3.5);   // the first floor's arcade
    // lantern room, antenna
    S.beg(); S.rect(cx - 2, 10, 5, 5, 'brass', 5); S.rect(cx - 1, 11, 3, 3, 'lamp', 9, { e: 255 }); S.vl(cx, 4, 6, 'iron', 7); S.px(cx, 3, 'red', 8, { e: 255 }); S.end();
    EF.pts = pts;
    // how much tower stands over each column (its reflection in the river)
    EF.col = new Float32Array(W); for (let i = 0; i < pts.length; i += 2) if (pts[i + 1] >= 40) EF.col[pts[i]]++;
    { let mx = 1; for (let x = 0; x < W; x++) mx = Math.max(mx, EF.col[x]); for (let x = 0; x < W; x++) EF.col[x] /= mx; }
    // ── mid: trees along the far bank, the gardens at the tower's feet ──
    S.lay('mid');
    const tree = (x, y, rr) => { S.beg(); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, bx = x + Math.cos(a) * rr * 0.55, by = y + Math.sin(a) * rr * 0.35; S.ell(bx, by, rr * 0.55, rr * 0.45, 'moss', Math.sin(a) < 0 ? 5 : 3, { dome: 1 }); } S.ell(x, y, rr * 0.7, rr * 0.5, 'moss', 4, { dome: 1 }); S.end(); S.rect(x - 1, y + rr * 0.4, 2, 77 - y - rr * 0.4, 'wood', 3); S.px(x - 1, Math.round(y + rr * 0.4), 'wood', 2); };
    [[6, 68, 9], [19, 71, 7], [114, 71, 9], [130, 69, 10], [145, 70, 8]].forEach(([x, y, rr]) => tree(x, y, rr));
    S.noise(0, 58, W, 20, 1, 2.5, 91, { only: 'moss' });
    // ── front: a Paris street lamp, an overhanging chestnut bough, the painter's easel ──
    S.lay('front');
    S.beg(); S.rect(10, 48, 3, 55, 'moss', 2.5); S.px(10, 48, 'moss', 4); S.rect(8, 94, 7, 3, 'moss', 3); S.rect(7, 97, 9, 6, 'moss', 2.5); S.hl(7, 97, 9, 'moss', 4.5); S.rect(9, 60, 5, 2, 'moss', 3.5);
    S.poly([[7, 44], [16, 44], [14, 36], [9, 36]], 'lamp', 7, { e: L.lamp + 1 }); S.vl(8, 40, 4, 'lamp', 6, { e: L.lamp + 1 }); S.vl(14, 40, 4, 'lamp', 5, { e: L.lamp + 1 }); S.rect(8, 35, 7, 1, 'moss', 3); S.px(11, 33, 'moss', 3); S.px(11, 34, 'moss', 4); S.rect(7, 44, 9, 2, 'moss', 3); S.end();
    S.rect(10, 38, 3, 5, 'lamp', 10, { e: L.lamp + 1 }); S.px(11, 39, 'lamp', 11, { e: L.lamp + 1 }); S.px(9, 40, 'lamp', 8, { e: L.lamp + 1 }); S.px(13, 40, 'lamp', 8, { e: L.lamp + 1 });
    S.beg(); for (let i = 0; i < 90; i++) { const u = r(), x = 150 - u * 42, y = 4 + u * u * 16 + r() * (8 - u * 5); S.rect(x, y, 2, 1, 'leaf', 2 + r() * 2.5); } S.line(149, 5, 110, 14, 'wood', 2.5); S.end();
    // easel with a canvas: a rose-and-violet evening already laid in (the tower on it is painted in anim)
    S.beg(); S.line(131, 102, 135, 66, 'wood', 5); S.line(141, 102, 137, 66, 'wood', 4.5); S.line(136, 70, 136, 102, 'wood', 3.5); S.hl(129, 87, 14, 'wood', 5); S.end();
    S.beg(); S.rect(128, 68, 15, 9, 'dusk', 3); S.rect(128, 77, 15, 5, 'dusk', 5); S.rect(128, 82, 15, 4, 'water', 3); S.rect(128, 68, 15, 1, 'paper', 8); S.vl(128, 68, 18, 'paper', 7); S.vl(142, 68, 18, 'paper', 5); S.hl(128, 85, 15, 'paper', 5); S.end();
    S.beg(); S.rect(144, 98, 3, 5, 'iron', 5); S.px(145, 97, 'crimson', 7); S.px(146, 97, 'gold', 8); S.end();   // paint pot
    // the see-through mask for the searchlight (sky pixels only)
    const LL = S.L; EF.mask = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) EF.mask[p] = (LL.back.m[p] || LL.mid.m[p] || LL.front.m[p] || p >= 76 * W) ? 1 : 0;
  },
  anim(D, t, rs) {
    const st = rs.st, L = EF.L, s = efShow(t), G = { e: 255 }; rs.mul[L.spark] = 0;
    // sky: a plane blinking across, behind the drifting cloud deck (lit where a beam crosses it), the first stars
    D.lay('wall');
    const pq = steps(t + 3, 21); if (pq < 0.55) { const x = Math.round(-4 + pq / 0.55 * 158), y = 6 + Math.round(pq * 5); D.hl(x - 1, y, 3, 'night', 1, G); D.px(x, y - 1, 'night', 1, G); if (Math.floor(t * 2.2) % 2) D.px(x + 1, y, 'linen', 11, G); else D.px(x - 1, y, 'red', 8, G); }
    efClouds(D, t, s.beams);
    X.twinkle(D, t, 6, 14, 31);
    // car lamps along the far embankment: white heading right, red tail lamps heading left
    [[0, 1, 9], [70, 1, 6.5], [30, -1, 8], [110, -1, 10], [150, 1, 7.5]].forEach(([x0, dr, sp]) => { const q = ((x0 + t * sp) % 180 + 180) % 180, x = Math.round(dr > 0 ? q - 15 : W + 15 - q); if (x < 4 || x > W - 5) return;
      if (dr > 0) { D.px(x, 76, 'lamp', 11, G); D.px(x - 1, 76, 'lamp', 9, G); D.px(x + 1, 76, 'lamp', 6, G); } else { D.px(x, 76, 'red', 8, G); D.px(x + 1, 76, 'red', 7, G); } });
    efRiver(D, t, s.on);
    if (R() < (s.on ? 0.3 : 0.07)) rs.burst('glint', EF.cx + Math.round((R() - 0.5) * 44), 82 + Math.floor(R() * 7), 1, { sp: 1, life: 0.5 });   // glints on the gold in the water
    efBoat(D, t, rs);
    D.lay('back'); efLifts(D, t, rs);
    // the light show: white sparkles pour down from the top, then dance over the whole tower; the tower and the quay flash
    if (s.on) { const P = EF.pts, cut = s.sq < 0.05 ? 8 + s.sq / 0.05 * 74 : 99; rs.flash(L.spark, 0.5 * s.amp); rs.flash(L.flood, 0.25 * s.amp);
      for (let k = 0; k < 130 * s.amp; k++) { const j = Math.floor(R() * P.length / 2) * 2, x = P[j], y = P[j + 1]; if (y > cut) continue; D.px(x, y, 'linen', 11, G); if (R() < 0.2) { D.px(x - 1, y, 'ice', 9, G); D.px(x + 1, y, 'ice', 9, G); D.px(x, y - 1, 'ice', 9, G); D.px(x, y + 1, 'ice', 9, G); } }
      if (!st.sp) { st.sp = 1; rs.burst('glint', EF.cx, 12, 6, { sp: 18, life: 0.8, w: 6, h: 6 }); }
      if (R() < 0.35 * s.amp) { const j = Math.floor(R() * P.length / 2) * 2; if (P[j + 1] < cut) rs.burst('glint', P[j], P[j + 1], 1, { sp: 2, life: 0.5 }); } } else st.sp = 0;
    // the painter: short strokes, a step back to look at his tower — and in the show he turns and points his brush at it
    D.lay('front'); const pq2 = steps(t, 7), look = pq2 > 0.72, strk = Math.sin(t * 9), lk = { skin: ['skin', 6], hair: ['hair', 4], top: ['lav', 7], bot: ['denim', 3], boot: ['hair', 2], cap: ['ink', 2], beard: ['hair', 4] };
    if (s.on && s.sq > 0.02) figure(D, 121, 101, lk, { aF: 2.3, eF: 0.2, aB: 0.3, eB: -0.4, lean: -0.3 }, -1);
    else figure(D, 122, 101, lk, look ? { aF: 0.6, eF: -1.6, aB: 0.3, eB: -0.3, lean: -0.3 } : { aF: 1.6 + strk * 0.12, eF: -0.5 + strk * 0.2, aB: 0.9, eB: -1.4, lean: 0.25 }, 1);
    if (!look && !s.on && !X.noWorkers) D.px(131 + Math.round(strk), 80 - Math.round(strk * 2), 'gold', 8);
    // on the canvas: a little gold tower on the evening sky, filling in as he works
    const prog = steps(t, 40); for (let y = 0; y < 14; y++) { const hw = Math.round(1 + (13 - y) * 0.42); for (let x = -hw; x <= hw; x++) { const s2 = (y * 7 + x * 13) % 17 / 17; if (s2 < prog * 1.2 && (Math.abs(x) >= hw || (x + y) % 3 === 0)) D.px(135 + x, 70 + y, 'gold', 7 + (x < 0 ? 1 : 0)); } }
    // moths round the street lamp, now and then a chestnut leaf lets go of the bough
    const ma = t * 3.3; D.px(11 + Math.round(Math.cos(ma) * 6), 40 + Math.round(Math.sin(ma * 1.4) * 4), 'paper', Math.sin(t * 31) > 0 ? 8 : 5); D.px(11 + Math.round(Math.cos(-ma * 0.8 + 2) * 8), 42 + Math.round(Math.sin(ma * 0.9 + 1) * 5), 'paper', Math.sin(t * 27) > 0 ? 7 : 4);
    if (R() < 0.012) rs.burst('leaf', 114 + R() * 32, 15, 1, { sp: 3, ang: Math.PI, spread: 1.2, life: 5, floor: 101 });
  },
  // the searchlight(s) on the top: a narrow warm-white beam that sweeps round; it only lights the sky, fades in hard steps with
  // distance (a bright 1–2 px core in the lamp's own colours, a thin haze on each side) and flares when it faces us
  post(out, t) {
    const s = efShow(t), bx = EF.cx, by = EF.BY, mask = EF.mask, CORE = EF.CORE || (EF.CORE = [[255, 246, 222], [255, 234, 184], [238, 214, 170]]), HALO = [255, 226, 168];
    s.beams.forEach(b => { const back = b.toward < 0 ? 0.6 : 1, g = b.g;
      if (b.len > 6) for (let d = 3; d < b.len; d++) { const x = bx + b.dir * d; if (x < 3 || x > W - 4) break; const hw = Math.min(4, 0.6 + d * 0.04), yc = by - 1 + d * 0.06, sg = d < 34 ? 0 : d < 80 ? 1 : 2;
        const ca = Math.min(0.95, [0.88, 0.7, 0.5][sg] * back * g), ha = [0.3, 0.2, 0.12][sg] * back * g;
        for (let y = Math.floor(yc - hw); y <= Math.ceil(yc + hw); y++) { if (y < 3 || y >= 76) continue; const p = y * W + x; if (mask[p]) continue; const u = Math.abs(y + 0.5 - yc); if (u > hw) continue;
          if (u <= 0.75) X.blendPx(out, p, CORE[sg], ca); else X.blendPx(out, p, HALO, ha); } }
      // facing us: the lamp flares into a star
      if (b.toward > 0.82) { const c = CORE[0], k = Math.round((b.toward - 0.82) / 0.18 * 6); for (let i = -k; i <= k; i++) { const f = 0.85 - Math.abs(i) / (k + 1) * 0.6; X.blendPx(out, by * W + bx + i, c, f); X.blendPx(out, (by + i) * W + bx, c, f); } } });
  },
});

// ═════════ 马丘比丘 machu (nature · power · rare) ═════════
// Dawn in the Andes: the sun has just cleared the ridge on the right and peeps between the sugarloaf of Huayna Picchu and
// the cliff; below the stone city a sea of cloud fills the valleys, far ranges standing out of it in blue haze, the tallest
// with snow the first light catches. Green terraces step down into the cloud and wisps of it climb them; granite houses
// with trapezoid doors, two with steep thatch, breakfast smoke seeping out; the carved sun stone on its knoll gives off
// motes of gold; two rays of sun fan across the valley; billows roll slowly along the cloud sea; a waterfall pours off
// the right cliff; a farmer hoes the lowest terrace, a llama grazes in front, small clouds drift across the sun, and
// every twelve seconds a condor rides the morning air across the sky and the sun stone flashes.
const MP = { sun: [122, 20, 4], CP: 12 };
// a llama, 17 px long, ~21 px to the ears: head up chewing, or down in the grass (two hand-drawn poses), facing left
const LLAMA_UP = [
  '.ee.............',
  '.hhh............',
  'ohhhh...........',
  '.hhnn...........',
  '..nn............',
  '..nn............',
  '..nn............',
  '..nnw...........',
  '..nwwwwwwwwwww..',
  '..wwbbbbbbbwwwt.',
  '..wwbgbgbgbwwwt.',
  '..wwbbbbbbbwwww.',
  '...wwwwwwwwwww..',
  '...ww.w...ww.w..',
  '...ll.l...ll.l..',
  '...ll.l...ll.l..',
  '...ll.l...ll.l..',
  '...ff.f...ff.f..',
];
const LLAMA_DOWN = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....wwwwwwwwww..',
  '...wwwwwwwwwwww.',
  '..nwwbbbbbbbwwwt',
  '.nnwwbgbgbgbwwwt',
  '.nn.wbbbbbbbwwww',
  'nn...wwwwwwwwww.',
  'hh...ww.w..ww.w.',
  'hhh..ll.l..ll.l.',
  'hhhh.ll.l..ll.l.',
  '.ee..ll.l..ll.l.',
  '.....ff.f..ff.f.',
];
function llama(D, x, y, t) {
  const g = steps(t, 9), graze = g < 0.42, chew = !graze && Math.sin(t * 7) > 0, ear = steps(t, 3.7) < 0.06;
  const rows = graze ? LLAMA_DOWN : LLAMA_UP, pal = { w: ['linen', 7.4], n: ['linen', 7], h: ['linen', 7.8, { n: [-0.3, -0.5] }], e: ['linen', 6.5], o: ['linen', 5.5], b: ['crimson', 6], g: ['gold', 7.5], t: ['linen', 6], l: ['linen', 6], f: ['ink', 2] };
  D.beg(); D.spr(x, y - rows.length + 1, rows, pal); D.end();
  const hy = y - rows.length + 1;
  if (!graze) { D.px(x + 1, hy + 2, 'ink', 1); if (chew) D.px(x, hy + 3, 'linen', 5); if (ear) D.px(x + 1, hy - 1, 'linen', 6.5); for (let i = 5; i < 13; i++) D.px(x + i, hy + 8, 'linen', 8.6); }
  else { D.px(x + 1, hy + 15, 'ink', 1); }
}
X.def('machu', {
  amb: [0.32, 0.28],
  paint(S, sc) {
    const L = {}, [sx, sy, sr] = MP.sun, G = { e: 255 };
    L.sun = sc.light({ x: sx, y: sy, z: 60, r: 300, i: 0.85, c: '#ffe6b8', tint: 0.35 });                                // the morning sun, just up on the right
    L.fire = sc.light({ x: 46, y: 80, z: 12, r: 34, i: 0.8, c: '#ff9040', fl: 'fire', tint: 0.5 });                    // breakfast fire in a hut
    L.stone = sc.light({ x: 76, y: 50, z: 12, r: 30, i: 0.6, c: '#ffd870', fl: 'pulse', amp: 0.4, sp: 1.6, tint: 0.55 });   // the sun stone
    L.sky = sc.light({ x: 24, y: 8, z: 50, r: 220, i: 0.3, c: '#a8d0ff', tint: 0.15 });                                // cool light off the open sky
    MP.L = L;
    // two rays of the rising sun fan down across the valley and the city: which pixels each covers, and how deep (1 edge,
    // 2 core), worked out once here; post washes them in, each breathing on its own
    MP.ray = []; [[120, 25, 2, 8, -44], [118, 26, 2, 7, -86]].forEach(([rx, y0, w0, w1, dx], i) => { for (let y = y0; y < FY; y++) { const k = (y - y0) / (FY - y0), hw = w0 + (w1 - w0) * k, cx = rx + dx * k;
      for (let x = Math.max(3, Math.floor(cx - hw)); x <= Math.min(W - 4, Math.ceil(cx + hw)); x++) { const u = Math.abs(x + 0.5 - cx) / hw; if (u < 1) MP.ray.push(y * W + x, i, u < 0.45 ? 2 : 1); } } });
    S.lay('wall'); const r = S.r, Y = S.c;
    // sky: whole-step bands of morning blue paling toward the cloud sea, their edges gently waved; the sun in hard rings of light
    const SK = [[0, 'ice', 5], [10, 'ice', 6], [21, 'ice', 7], [32, 'ice', 8], [43, 'ice', 9], [53, 'paper', 9]], edge = (i, x) => (i ? SK[i][0] + Math.round(Math.sin(x * 0.05 + i * 1.9) * 1.3) : 0);
    for (let x = 0; x < W; x++) for (let i = 0; i < SK.length; i++) { const y1 = SK[i + 1] ? edge(i + 1, x) : FY; for (let y = edge(i, x); y < y1; y++) S.px(x, y, SK[i][1], SK[i][2], G); }
    [[10, 8], [7, 9], [4.5, 10]].forEach(([rr, tn]) => S.ell(sx, sy, sr + rr, sr + rr, 'ice', tn, G));
    S.ell(sx, sy, sr + 1.5, sr + 1.5, 'lamp', 10, G); S.ell(sx, sy, sr, sr, 'lamp', 11, G);
    const m0 = Uint8Array.from(Y.m), t0 = Float32Array.from(Y.t);   // the bare sky: small clouds drift only over it
    // far ranges standing out of the cloud sea in blue haze; the tallest wears snow that the sun catches on its right side
    [[30, 27, 0.95, 0.8, 6, 11], [72, 36, 0.7, 0.85, 6, 5], [6, 43, 0.55, 0.6, 5, 0], [47, 47, 0.6, 0.7, 5, 0]].forEach(([ax, ay, sl, sr2, tn, snow]) => {
      for (let x = 0; x < W; x++) { const top = Math.round(ay + (x < ax ? (ax - x) * sl : (x - ax) * sr2) + Math.sin(x * 0.7 + ax) * 0.6); if (top >= 66) continue;
        for (let y = top; y < 66; y++) { const lit = x > ax, sn = snow && y < ay + snow - Math.abs(x - ax) * 0.25 + (Math.sin(x * 1.3) > 0.3 ? 1 : 0);
          S.px(x, y, sn ? 'linen' : 'glass', sn ? (lit ? 10 : 7) : tn + (lit ? 1 : 0) + (y === top ? 1 : 0), G); } } });
    // Huayna Picchu, the sugarloaf: jungle-dark, its sunward flank lit, a bright rim where the sun grazes its edge
    for (let y = 12; y < FY; y++) { const k = (y - 12) / 66, hw = 3 + Math.pow(k, 0.7) * 34 + (y > 70 ? (y - 70) * 1.5 : 0), cx = 100 - k * 4, x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
      for (let x = x0; x <= x1; x++) { const u = (x - cx) / hw; S.px(x, y, u > 0.45 ? 'leaf' : 'moss', x >= x1 - (y < 44 ? 1 : 0) ? 9 : u > 0.45 ? 6 + Math.round((u - 0.45) * 2.4) : u < -0.55 ? 2 : 3, G); } }
    S.noise(60, 12, 90, 56, 1, 2.2, 101, { only: 'moss' }); S.noise(60, 12, 90, 56, 1, 2.2, 102, { only: 'leaf' });
    [[19, 0.5], [24, 0.45], [30, 0.4]].forEach(([y, f]) => { const k = (y - 12) / 66, hw = 3 + Math.pow(k, 0.7) * 34, x0 = Math.round(100 - k * 4 - hw * 0.1); S.hl(x0, y, Math.round(hw * f), 'stone', 5, G); S.hl(x0, y - 1, Math.round(hw * f), 'leaf', 5, G); S.px(x0 + Math.round(hw * f) - 1, y, 'stone', 7, G); });   // terraces clinging to the summit
    // the sea of cloud filling the valleys: a sunlit crest, a creamy body, rolls of billows with blue-shadowed undersides
    MP.cs = new Int8Array(W);
    for (let x = 0; x < W; x++) { const s0 = 63 + Math.round(Math.sin(x * 0.08 + 0.4) * 1.6 + Math.sin(x * 0.21 + 1.1) * 0.8); MP.cs[x] = s0;
      for (let y = s0; y < FY; y++) S.px(x, y, 'linen', y === s0 ? 10 : y < s0 + 3 ? 9 : 8, G);
      [70, 77, 84].forEach((yb, j) => { const top = yb - Math.round(Math.abs(Math.sin(x * 0.17 + j * 1.9)) * 2.4); if (top - 1 <= s0 + 2) return; S.px(x, top - 1, 'ice', 9, G); S.px(x, top, 'linen', 10, G); S.px(x, top + 1, 'linen', 9, G); }); }
    MP.sky = new Uint8Array(W * H); for (let p = 0; p < W * 60; p++) MP.sky[p] = Y.m[p] === m0[p] && Y.t[p] === t0[p] ? 1 : 0;
    // the right cliff (back layer) the waterfall pours from
    S.lay('back');
    S.beg(); for (let y = 18; y < FY; y++) { const x0 = Math.round(128 + Math.sin(y * 0.3) * 2 + (y < 30 ? (30 - y) * 0.6 : 0)); for (let x = x0; x < W; x++) S.px(x, y, 'rock', 4 + (x === x0 ? 2 : 0) + ((x * 3 + y * 5) % 11 === 0 ? 1.5 : 0), { n: [x === x0 ? -0.7 : 0, 0] }); } S.end();
    S.noise(126, 18, 24, 72, 1, 3, 111, { only: 'rock' }); for (let i = 0; i < 40; i++) S.px(127 + r() * 20, 18 + r() * 70, 'moss', 4 + r() * 3);
    S.rect(134, 28, 7, 2, 'rock', 2);   // the lip the water leaves
    S.beg(); S.ell(137, 88, 9, 2.5, 'water', 5, { n: [0, -0.9] }); S.end();
    // the stone city: terraces stepping down the left slope into the cloud, houses on the saddle
    const stoneWall = (x, y, w, h, t) => { S.rect(x, y, w, h, 'stone', t); for (let yy = y + 2; yy < y + h; yy += 2) for (let xx = x + ((yy / 2) % 2 ? 0 : 2); xx < x + w; xx += 4) S.px(xx, yy, 'stone', t - 1.6); S.hl(x, y, w, 'stone', t + 1.2, { n: [0, -0.8] }); };
    for (let k = 0; k < 7; k++) { const y = 56 + k * 5, x0 = 56 - k * 8; S.beg(); stoneWall(x0, y + 2, 76 - x0, 3, 5); S.hl(x0, y, 76 - x0, 'leaf', 6.5, { n: [0, -0.8] }); S.hl(x0, y + 1, 76 - x0, 'leaf', 5); S.end(); }
    S.lay('mid');
    const house = (x, y, w, h, roof) => { S.beg(); stoneWall(x, y - h, w, h, 5.5); S.poly([[x, y - h], [x + w / 2, y - h - (roof ? 0 : 5)], [x + w, y - h]], 'stone', 5.5);
      const dw = 3, dx = Math.round(x + w / 2 - 1.5); S.poly([[dx, y], [dx + dw, y], [dx + dw - 0.6, y - 5], [dx + 0.6, y - 5]], 'ink', 1);
      if (w > 12) { S.poly([[x + 2, y - 5], [x + 4, y - 5], [x + 3.6, y - 8], [x + 2.4, y - 8]], 'ink', 1.5); S.poly([[x + w - 4, y - 5], [x + w - 2, y - 5], [x + w - 2.4, y - 8], [x + w - 3.6, y - 8]], 'ink', 1.5); }
      if (roof) { S.poly([[x - 2, y - h + 1], [x + w / 2, y - h - 9], [x + w + 2, y - h + 1]], 'sand', 6); for (let k = 0; k < 4; k++) S.line(x + w / 2, y - h - 9 + k, x - 1 + k, y - h + 1, 'sand', 4.5 + (k % 2)); S.hl(x - 2, y - h + 1, w + 4, 'sand', 4); }
      S.end(); };
    // the plaza lawn on its retaining wall, the sun-stone knoll
    S.beg(); S.rect(62, 76, 64, 6, 'leaf', 5.5); S.hl(62, 76, 64, 'leaf', 7, { n: [0, -0.8] }); stoneWall(62, 82, 64, 8, 4.5); S.end();
    S.beg(); S.poly([[68, 62], [74, 54], [80, 54], [86, 62]], 'stone', 5); stoneWall(66, 60, 22, 4, 5); S.end();
    S.beg(); S.poly([[75, 54], [79, 54], [79, 50], [77, 48], [75, 50]], 'stone', 7); S.px(76, 49, 'stone', 8); S.end();
    house(90, 68, 12, 7, 1); house(104, 70, 16, 8, 0); house(68, 76, 14, 7, 0); house(112, 80, 12, 6, 1); house(40, 86, 13, 7, 1);
    // the hut's breakfast fire glows in its doorway
    S.rect(45, 81, 3, 5, 'fire', 5, { e: L.fire + 1 }); S.px(46, 84, 'fire', 8, { e: L.fire + 1 });
    // ── floor: the near lawn and the lowest terrace wall ──
    S.lay('wall'); S.rect(0, FY, W, H - FY, 'leaf', 4); S.noise(0, FY, W, H - FY, 1, 3, 121); for (let x = 0; x < W; x++) { S.px(x, FY, 'leaf', 6 + (x * 7 % 3)); if (r() < 0.3) S.px(x, FY - 1, 'leaf', 5 + r() * 2); }
    S.lay('front');
    S.beg(); stoneWall(0, 92, 44, 5, 5); S.hl(0, 91, 44, 'leaf', 6.5); S.hl(0, 90, 44, 'leaf', 5); S.end();
    for (let i = 0; i < 16; i++) { const x = 46 + r() * 100, y = 100 + r() * 4; S.px(x, y, 'leaf', 7); S.px(x + 1, y - 1, 'leaf', 8); S.px(x - 1, y - 1, 'leaf', 6); }
    [[52, 101, 'pink'], [58, 103, 'gold'], [96, 102, 'pink'], [141, 100, 'gold']].forEach(([x, y, m]) => { S.px(x, y - 1, m, 8); S.px(x, y, 'leaf', 6); S.px(x + 1, y - 2, m, 7); });
    sc.emit({ k: 'mist', x: 137, y: 86, w: 8, rate: 3, sp: 5, ang: 0, spread: 1.6, life: 1.6 });
    sc.emit({ k: 'glint', x: 77, y: 48, w: 4, rate: 0.9, sp: 4, ang: 0, spread: 0.5, life: 1.2, h: 2 });
    sc.emit({ k: 'steam', x: 46, y: 71, rate: 0.7, sp: 3, ang: 0.35, spread: 0.5, life: 2.6 });   // smoke seeping out of the thatch
  },
  anim(D, t, rs) {
    const st = rs.st, L = MP.L, G = { e: 255 };
    // small clouds drift over the sky (and across the sun): white, with a blue-grey underside
    D.lay('wall'); [[0, 24, 26, 0.9], [60, 36, 34, 0.6], [110, 13, 22, 1.2]].forEach(([x0, y, w, sp]) => { const x = ((x0 + t * sp) % (W + w + 20)) - w - 10;
      for (let k = 0; k < w; k++) { const xx = Math.round(x + k), hh = k < 3 || k > w - 4 ? 1 : k < 7 || k > w - 8 ? 2 : 3; if (xx < 0 || xx >= W) continue;
        for (let j = 0; j < hh; j++) if (MP.sky[(y - j) * W + xx]) D.px(xx, y - j, j === 0 ? 'ice' : 'linen', j === 0 ? 8 : j === hh - 1 ? 10 : 9, G); } });
    // the cloud sea: billows roll slowly along its top, lit on the sun's side, shaded on the other
    for (let x = 3; x < W - 3; x++) { const q = (x - t * 0.8) * 0.15, b = Math.round(Math.max(0, Math.sin(q)) * 2.2), s0 = MP.cs[x]; if (!b) continue;
      for (let k = 1; k < b; k++) D.px(x, s0 - k, 'linen', 9, G); const sh = Math.cos(q) > 0.35; D.px(x, s0 - b, sh ? 'ice' : 'linen', sh ? 9 : 10, G); }
    // the waterfall: streaks run down the fall, a bright lip, foam at the foot
    D.lay('back'); for (let y = 30; y < 87; y++) { const spread = y > 70 ? 1 : 0; for (let x = 135 - spread; x < 140 + spread; x++) { const v = ((y - t * 42 + (x - 135) * 11) % 9 + 9) % 9, w0 = Math.round(Math.sin(y * 0.2) * 0.6); D.px(x + w0, y, 'water', v < 2 ? 11 : v < 5 ? 9 : v < 7 ? 8 : 6, G); } }
    D.hl(134, 29, 7, 'water', 10, G); for (let k = 0; k < 8; k++) D.px(130 + ((k * 5 + Math.floor(t * 9)) % 15), 86 + (k % 2), 'linen', 10, G);
    // the farmer hoes the lowest terrace: raise, strike, a puff of earth
    D.lay('mid'); const hq = steps(t, 1.6), up = hq < 0.55, aF = up ? 0.6 + hq / 0.55 * 2.2 : 2.8 - Math.min(1, (hq - 0.55) / 0.12) * 2.4;
    figure(D, 24, FY, 'farmer', { aF, eF: -0.3, aB: aF - 0.3, eB: -0.3, lean: up ? 0.05 : 0.5, lF: 0.35, lB: -0.25, kB: 0.2 }, 1);
    const hx = 24 + Math.round(Math.sin(aF) * 7) + 1, hy = FY - 19 + Math.round(Math.cos(aF) * 7);
    if (!X.noWorkers) { D.line(hx, hy, hx + Math.round(Math.sin(aF + 0.2) * 10), hy + Math.round(Math.cos(aF + 0.2) * 10), 'wood', 6); D.rect(hx + Math.round(Math.sin(aF + 0.2) * 10) - 1, hy + Math.round(Math.cos(aF + 0.2) * 10), 3, 2, 'iron', 7); }
    if (!X.noWorkers && !up && hq > 0.65 && !st.hoe) { st.hoe = 1; rs.burst('dust', 34, FY - 1, 3, { sp: 8, life: 0.8 }); rs.burst('leaf', 34, FY - 2, 1, { sp: 12, ang: 0.4, life: 0.9 }); } if (hq < 0.3) st.hoe = 0;
    // the llama in front
    D.lay('front'); llama(D, 98, 101, t);
    // the condor: every twelve seconds it rides the morning air across the sky, a few slow beats; the sun stone flashes as it passes
    const cq = steps(t + 5, MP.CP); if (cq < 0.5) { const k = cq / 0.5, x = Math.round(-24 + k * 196), y = Math.round(36 - Math.sin(k * Math.PI) * 14 + Math.sin(t * 1.3) * 1.5), beat = k > 0.15 && k < 0.4 ? Math.sin(t * 4.2) : 0.15;
      D.lay('wall');
      // body, white ruff, bald head; broad wings with a silver band and splayed finger tips — slow beats, then a long glide
      D.hl(x - 4, y, 9, 'ink', 1, G); D.hl(x - 3, y + 1, 7, 'ink', 1, G); D.hl(x - 5, y + 1, 2, 'ink', 2, G); D.px(x - 6, y + 2, 'ink', 1, G);
      D.px(x + 5, y - 1, 'linen', 9, G); D.px(x + 4, y - 1, 'linen', 7, G); D.px(x + 6, y - 1, 'skin', 3, G); D.px(x + 7, y - 1, 'skin', 4, G); D.px(x + 7, y, 'bone', 6, G);
      for (let i = 1; i <= 15; i++) { const lift = Math.round(-beat * i * 0.45 + (i > 10 ? (i - 10) * 0.35 : 0)), th = i < 5 ? 3 : i < 11 ? 2 : 1;
        [x - 1 - i, x + 1 + i].forEach(wx => { for (let j = 0; j < th; j++) D.px(wx, y - 1 + lift + j, i > 4 && i < 12 && j === 0 ? 'linen' : 'ink', i > 4 && i < 12 && j === 0 ? 6 : 1, G); if (i > 12 && i % 2) D.px(wx, y + lift + 1, 'ink', 1, G); }); }
      if (!st.cd && k > 0.3) { st.cd = 1; rs.flash(L.stone, 0.8); rs.burst('glint', 77, 48, 6, { sp: 14, life: 1, w: 6 }); } } else st.cd = 0;
  },
  // the sun's rays (a warm wash, two hard steps, each ray breathing), then wisps of cloud climbing the lower terraces out of
  // the cloud sea (a white wash in two hard steps, thinning toward the city)
  post(out, t) {
    const RC = [255, 244, 208], f = [0.8 + 0.2 * Math.sin(t * 0.45), 0.7 + 0.3 * Math.sin(t * 0.33 + 2)], A = MP.ray;
    for (let i = 0; i < A.length; i += 3) { const a = Math.floor((A[i + 2] === 2 ? 0.26 : 0.13) * f[A[i + 1]] * 8) / 8; if (a > 0) X.blendPx(out, A[i], RC, a); }
    const C = [238, 242, 250];
    for (let y = 64; y < 90; y++) { const env = Math.min(1, (y - 63) / 6) * Math.min(1, (90 - y) / 8); for (let x = 36; x < 76; x++) { const d = X.vnoise(x * 0.07 + t * 0.18, y * 0.22 - t * 0.12, 13) * env * Math.min(1, (x - 35) / 8, (76 - x) / 16), a = d > 0.5 ? 0.3 : d > 0.34 ? 0.15 : 0; if (a) X.blendPx(out, y * W + x, C, a); } }
  },
});

if (M.ROOM_D) Object.assign(M.ROOM_D, {
  venice: '起雾的夜里的兵工厂船坞，没有月亮，远处的灯火把雾映成淡紫：一艘带桨的大帆船占满船坞，三角主帆上画着金狮、边缘在风里抖，船头船尾的灯笼摇曳、船尾窗户透着灯光，主桅顶上红底金狮旗在飘；后面是两座城门塔的黑影，左边圣马可钟楼的钟亭亮着灯，对岸屋顶的窗户和岸边一排路灯亮着，灯影在水里晃；薄雾一团团从船后和水面上飘过；岸上木吊车里一个人踩着大轮子走，高高的吊臂从岸边的木架上吊起一门铜炮，转过夜空，放进船舱，甲板上的水手伸手去接；炮一碰到船舷，火星和尘土一溅、金光照亮整条船，两边水花拍船；岸边火盆冒火星，前面有红白条纹的系船桩和一条黑色贡多拉，翘起的船头上立着银色的铁梳，船尾挂着一盏灯笼',
  ruhr: '夜里的矿场，天空被工厂映成暗红，远处是厂房、顶上亮着红灯的储气罐和冒烟的烟囱：锈红色的井架上两只天轮跟着绳子转，罐笼载着煤车从井口升上来；戴头灯的矿工把满满一车煤推出来倒进溜槽，煤块滚下去，扬起一团煤灰；对面高炉顶上烧着火炬，每隔一会儿穿灰罩衣的炉前工用长铁杆捅开出铁口，铁水顺着槽流进铁水罐，火花四溅、橙光一亮，罐口透着红光，罐里的铁水慢慢变暗',
  eiffel: '巴黎的黄昏，天空从深蓝过渡到紫色和粉橘，一层低云被晚风吹着慢慢飘：铁塔立在塞纳河对岸，镂空的钢架透出金光，平台亮着一圈灯，亮灯的电梯厢沿着塔腿上上下下；塔顶探照灯转着扫过天空，扫到哪片云，哪片云就被照亮；河面上铁塔的灯光拉成一根根晃动的金色光柱，一艘玻璃顶游船亮着一排窗慢慢驶过，船灯照亮对岸石堤，船尾拖着白色浪花；对岸车灯来来往往，远处屋顶亮着窗、树丛间有金顶、山上有白教堂，一架飞机闪着灯飞过；每隔一会儿灯光秀开始：白色闪光从塔尖往下铺满全塔，第二道探照灯亮起，两道光一起扫过云层，河里的光柱也闪起白光，画家转身举起画笔看；近处路灯照着河岸石板，飞蛾绕着灯飞，栗树枝上不时飘下一片叶子',
  machu: '安第斯山的清晨：太阳刚从右边山脊升起，夹在尖尖的华纳比丘山和悬崖之间，两道阳光斜斜照过山谷；石头城下面是一片云海，远处的雪山和蓝色山峰从云里露出来，云海表面的云团慢慢翻滚；绿色梯田一层层往下没进云里，一缕缕云雾顺着梯田往上爬；花岗岩房子开着梯形的门，两座盖着陡陡的草顶，草顶里冒出做早饭的烟，小山包上的拴日石冒着金色的光点；右边悬崖上一道瀑布落下；小片白云飘过太阳，农夫在最低一层梯田上锄地，前面一头披着花毯的羊驼低头吃草、抬头嚼嚼，每隔一会儿一只秃鹰滑翔着飞过天空，拴日石跟着一亮',
  wolfsburg: '夜里的汽车厂，流水线一站一停：车架从门帘里开进来，橙色机械臂从托盘上夹起车壳落到车架上，另一只机械臂沿车缝焊接，火花四溅，蓝色焊光一闪一闪照亮两只机械臂；两盏绿罩吊灯在流水线和地面上照出暖黄的光圈；小车停在金色检测门下，扫描线扫过、车灯亮起，门前光亮的钢板地面映出车灯的倒影；门梁上一排圆指示灯，每下线一辆车就多亮一盏，满六盏重新开始；每三辆就有一辆整辆变成金色，亮起的是金灯，一道金光落下，再顺着流水线一路扫回去，两盏吊灯跟着一亮，亮着的指示灯一起闪，天桥上的工长举手欢呼；地上刷着黄黑相间的警示线，一辆黄色零件小车闪着灯慢慢来回运零件；挂着轮胎的吊架从窗前慢慢移过',
});
})();
