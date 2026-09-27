// ==== mc-pxroom-minib-pachinko.js ====
(function () {
// 弹珠台 · a pachinko parlour at midnight. Centre stage is the one machine still lit: a chrome-and-brass cabinet ringed with
// chasing bulbs, a lacquered night-blue board with gold-leaf clouds behind glass (two diagonal reflections), brass pegs at
// exactly the physics' positions, a launch rail that runs up the left and arcs over the top into the start gate, a round-
// cornered LCD where a sleepy moon face lives (upper left) and a brass windmill medallion (upper right), seven pockets at
// the bottom (two tulips that open, three prize cups, two black out-holes), a chrome tray of waiting balls and the launch
// handle. Around it: the dark row of machines along the back wall (lights blinking out of sync), a pink neon star and 7,
// a wall clock stopped at midnight, a bar stool and a smoking pedestal ashtray on the carpet.
const M = window.MC, X = M.PXR; if (!X || !X.MINIB) return;
const MB = X.MINIB, { n1 } = X, { AW, AH, clamp, hash, mask } = MB;
const TAU = Math.PI * 2, E = { e: 255 };

// ───────── geometry (art px; the physics of MINI.pachinko converted: art = (logical − stage origin) / 4) ─────────
const PG = { L: 75, R: 225, T: 27.5, B: 145, pz: 127.5, div: 134, land: 141, br: 2.5, pr: 1.75 };
const SW = (PG.R - PG.L) / 7;
// 8 rows of pegs, same order as mg.pegs: even rows 10 pegs from x 82.5, odd rows 9 from x 90, every 15; rows 11.5 apart from y 50
const PEGS = []; for (let i = 0; i < 8; i++) { const n = i % 2 ? 9 : 10; for (let j = 0; j < n; j++) { const x = i % 2 ? 90 + 15 * j : 82.5 + 15 * j, y = 50 + 11.5 * i; PEGS.push({ x, y, row: i, px: Math.floor(x) - 1, py: Math.floor(y) - 1 }); } }
// pockets left → right: 图纸 (left tulip, jackpot) · 空 · 积分 · 物资 · 积分 · 空 · 道具 (right tulip)
const SLOTS = [{ k: 'tulip', ic: 'plan', m: 'paper' }, { k: 'out' }, { k: 'cup', ic: 'coin', m: 'gold' }, { k: 'cup', ic: 'sack', m: 'sand' }, { k: 'cup', ic: 'coin', m: 'gold' }, { k: 'out' }, { k: 'tulip', ic: 'gem', m: 'arcane' }];
SLOTS.forEach((s, i) => { s.x = PG.L + (i + 0.5) * SW; s.c = Math.round(s.x - 0.5); });
const DIVX = [1, 2, 3, 4, 5, 6].map(k => PG.L + k * SW);
// the launch rail's centre line: up the left channel (x 68.5), round the corner (centre 76.5, 38.5, r 8), along the top
// channel (y 30.5) to the start gate, then down out of the gate where the physics spawns balls (x ~150, y 35)
const RL = { x: 68.5, y0: 135.5, cx: 76.5, cy: 38.5, r: 8, y: 30.5, gx: 144 };
const RLEN = [RL.y0 - RL.cy, Math.PI / 2 * RL.r, RL.gx - RL.cx, 7.5];
function rail(u) {
  let s = clamp(u, 0, 1) * (RLEN[0] + RLEN[1] + RLEN[2] + RLEN[3]);
  if (s < RLEN[0]) return [RL.x, RL.y0 - s]; s -= RLEN[0];
  if (s < RLEN[1]) { const a = Math.PI + s / RL.r; return [RL.cx + Math.cos(a) * RL.r, RL.cy + Math.sin(a) * RL.r]; } s -= RLEN[1];
  if (s < RLEN[2]) return [RL.cx + s, RL.y]; s -= RLEN[2]; const q = s / RLEN[3]; return [RL.gx + 6 * q, RL.y + 4.5 * q * q];
}
// bulbs of the chasing ring round the glass door, clockwise from the top-left corner ([x, y] = top-left of a 2×2 bulb)
const BULBS = (() => { const a = [], T = 25, B = 146, L = 60, Rr = 238, nx = 30, ny = 20;
  for (let k = 0; k < nx; k++) a.push([L + Math.round(k * (Rr - L) / nx), T]);
  for (let k = 0; k < ny; k++) a.push([Rr, T + Math.round(k * (B - T) / ny)]);
  for (let k = 0; k < nx; k++) a.push([Rr - Math.round(k * (Rr - L) / nx), B]);
  for (let k = 0; k < ny; k++) a.push([L, B - Math.round(k * (B - T) / ny)]);
  return a.filter(([x, y]) => !(y === T && x > 136 && x < 162) && !(y === B && x > 192 && x < 210)); })();
// little bulbs under the hanging sign (the rule line sits on it)
const VBULBS = []; for (let x = 60; x <= 238; x += 6) VBULBS.push(x);
const LCD = { x: 79, y: 33, w: 39, h: 16, sx: 81, sy: 35, sw: 35, sh: 12, mx: 88, my: 40 };   // bezel, screen, the moon's centre pixel
const WM = { x: 201, y: 40 };                                                                     // windmill medallion centre pixel
const CLOCK = { x: 267, y: 24 };
// light objects the anim recolours (the engine keeps them by reference), and a ramp's bright colour as rgb
const LT = {}, LCDC = [142, 200, 255], RGBC = {};
const RGB = (m) => RGBC[m] || (RGBC[m] = (() => { const h = X.RAMPS[m][Math.min(8, X.RAMPS[m].length - 2)], n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; })());
const TRAY = { x0: 90, x1: 211, y: 152.5, spout: [203, 149] };
const HANDLE = { x: 235, y: 155, r: 6.5 };
// glass reflections: two diagonal streaks across the upper right of the glass and a short pair low on the left
const GS = new Float32Array(AW * AH);
for (let y = 28; y < 145; y++) for (let x = 64; x < 236; x++) { const u = x + 0.52 * y; let v = 0;
  if (y < 118) { const f = y < 96 ? 1 : 1 - (y - 96) / 22; if (Math.abs(u - 226) < 2.6) v = 1.6 * f; if (Math.abs(u - 226) < 0.8) v = 2.6 * f; if (Math.abs(u - 234.5) < 0.9) v = 1.4 * f; }
  if (y > 92) { const f = Math.min(1, (y - 92) / 14); if (Math.abs(u - 128) < 1.6) v = 1.3 * f; if (Math.abs(u - 134) < 0.6) v = 1 * f; }
  GS[y * AW + x] = v; }
const gsAt = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= AW || y >= AH ? 0 : GS[y * AW + x]; };

// pocket icons (backlit windows): plan = a rolled blueprint, coin, sack of supplies, gem
const ICON = {
  plan: { m: mask(['.aaaaa.', 'abbbbba', 'abcbcba', 'abbbbba', 'abccbba', 'abbbbba', '.aaaaa.']), p: { a: ['paper', 8], b: ['tile', 6], c: ['tile', 10] } },
  coin: { m: mask(['.aaa.', 'abcba', 'ac.ba', 'abbba', '.aaa.']), p: { a: ['gold', 5], b: ['gold', 8], c: ['gold', 10] } },
  sack: { m: mask(['.a.a.', '..a..', '.bcb.', 'bcdcb', 'bccbb', '.bbb.']), p: { a: ['sand', 3], b: ['sand', 5], c: ['sand', 7], d: ['sand', 9] } },
  gem: { m: mask(['.aba.', 'abcba', 'bbcbb', '.bbb.', '..b..']), p: { a: ['arcane', 9], b: ['arcane', 6], c: ['arcane', 11] } },
};
function icon(P, k, cx, cy, add, e) { const I = ICON[k], m = I.m, x0 = cx - (m.w >> 1), y0 = cy - (m.h >> 1), o = e ? E : { e: 1 };
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) { const ch = m.at(x, y); if (!ch) continue; const q = I.p[ch]; P.px(x0 + x, y0 + y, q[0], q[1] + (add || 0), o); } }

// ───────── static set ─────────
function room(S, sc) {
  S.lay('wall');
  // ceiling: dark acoustic tiles, a vent, a crown moulding
  S.rect(0, 0, AW, 10, 'night', 2); for (let x = 3; x < AW; x += 22) { S.vl(x, 0, 10, 'night', 1); S.vl(x + 1, 0, 10, 'night', 3); } S.hl(0, 4, AW, 'night', 1);
  S.hl(0, 10, AW, 'wood', 3.5, { n: [0, 0.5] }); S.hl(0, 11, AW, 'wood', 5.5, { n: [0, -0.4] }); S.hl(0, 12, AW, 'brass', 4); S.hl(0, 13, AW, 'wood', 1.5);
  // wallpaper: violet flock, pinstripes, little diamonds with a gold dot
  S.rect(0, 14, AW, 136, 'magic', 2.6);
  for (let x = 1; x < AW; x += 9) { S.vl(x, 14, 136, 'magic', 3.6, { n: [-0.4, 0] }); S.vl(x + 1, 14, 136, 'magic', 1.6); }
  for (let y = 19, r = 0; y < 150; y += 8, r++) for (let x = 5 + (r % 2 ? 4 : 0); x < AW; x += 9) { S.px(x + 0.5, y - 1, 'magic', 3.8); S.px(x - 0.5, y, 'magic', 3.6); S.px(x + 1.5, y, 'magic', 3.2); S.px(x + 0.5, y + 1, 'magic', 3); S.px(x + 0.5, y, 'gold', 2.6); }
  S.noise(0, 14, AW, 136, 1, 5, 17); S.ao(0, 14, AW, 16, 't', 1.8);
  for (let k = 0; k < 9; k++) { const x = 4 + ((k * 37) % 56) + (k % 2 ? 240 : 0), y = 20 + ((k * 23) % 40); S.px(x, y, 'magic', 1); S.px(x, y + 1, 'magic', 1.4); }   // stains
  // carpet: garish parlour carpet in perspective — a lattice of diamonds with gold dots, worn darker in front of the machines
  for (let y = 150; y < AH; y++) { const zz = 26 / (y - 140), sx = zz / 9; for (let x = 0; x < AW; x++) {
    const u = (x - 150) * sx, v = zz * 1.7, a = ((u + v) % 1 + 1) % 1, b = ((u - v) % 1 + 1) % 1, ln = a < 0.13 || b < 0.13, dot = Math.abs(a - 0.56) < 0.13 && Math.abs(b - 0.56) < 0.13, ring = !dot && Math.abs(a - 0.56) < 0.24 && Math.abs(b - 0.56) < 0.24;
    S.px(x, y, dot ? 'gold' : ln ? 'magic' : 'crimson', dot ? 3.6 : ln ? 2.6 : ring ? 3.4 : 2.2 + (hash(x, y, 5) < 0.1 ? -0.8 : 0)); } }
  S.noise(0, 150, AW, 25, 1, 3, 23); S.ao(0, 150, AW, 5, 't', 1.6);
  // pink neon on the upper left wall: a star and a 7 (drawn lit in anim), its transformer box and cable
  S.lay('back'); S.beg(); S.box(4, 64, 9, 6, 'iron', 3.5); S.px(6, 66, 'screen', 5); S.end(); S.line(8, 63, 11, 57, 'ink', 1); S.line(11, 57, 12, 53, 'ink', 1);
  S.beg(); S.box(286, 62, 9, 6, 'iron', 3.5); S.px(288, 64, 'screen', 5); S.end(); S.line(290, 61, 289, 58, 'ink', 1);
  NEON.clips.forEach(([x, y]) => { S.px(x, y, 'iron', 6); S.px(x, y + 1, 'iron', 2); });
  NEON.halo2.forEach(([x, y]) => S.px(x, y, 'magic', 4.4, { e: 3 }));
  // a wall clock stopped at midnight (the second hand still runs, in anim)
  const CK = CLOCK; S.beg(); S.ell(CK.x + 0.5, CK.y + 0.5, 8, 8, 'iron', 6.5, { dome: 1 }); S.ell(CK.x + 0.5, CK.y + 0.5, 6.3, 6.3, 'bone', 8.4); S.end();
  S.ell(CK.x + 0.5, CK.y + 0.5, 6.3, 6.3, 'bone', 7, { ring: 1 }); S.ao(CK.x - 6, CK.y - 6, 13, 4, 't', 1.4);
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12, r = k % 3 ? 5 : 4.6; S.px(CK.x + 0.5 + Math.cos(a) * r, CK.y + 0.5 + Math.sin(a) * r, 'bone', k % 3 ? 4.4 : 2); }
  S.vl(CK.x, CK.y - 5, 6, 'iron', 1.2); S.vl(CK.x + 1, CK.y - 3, 4, 'iron', 1.6); S.px(CK.x, CK.y, 'brass', 8); S.hl(CK.x - 2, CK.y + 9, 5, 'iron', 3);
  S.lay('wall'); S.shadow([[CK.x - 6, CK.y + 8], [CK.x + 9, CK.y + 8], [CK.x + 10, CK.y + 5], [CK.x + 9, CK.y + 10], [CK.x - 4, CK.y + 11]], 1.4);
}
// the neon tubes as pixel lists, built once: core, a halo ring, a far halo on the wall, and mounting clips. Two signs on one
// circuit: the star and the 7 on the left wall, a crescent moon and a small star on the right wall (the right one sits
// exactly 256 px to the right: the engine's baked lighting stores x in 8 bits, so light 2 lights both walls alike)
const NEON = (() => { const core = new Map(), add = (x, y) => core.set(Math.round(x) + ',' + Math.round(y), [Math.round(x), Math.round(y)]);
  const seg = (a, b) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.6); for (let i = 0; i <= n; i++) add(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n); };
  const P = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 4.8 : 11.5; P.push([19 + Math.cos(a) * r, 46 + Math.sin(a) * r]); }
  for (let k = 0; k < 10; k++) seg(P[k], P[(k + 1) % 10]);
  seg([35, 36], [47, 36]); seg([47, 36], [46, 39]); seg([46, 39], [39, 58]); seg([38, 46], [44, 46]);
  // crescent: the outer circle outside the inner one, the inner circle inside the outer one
  const oc = [282, 47, 11], ic = [287.5, 43, 9];
  for (let k = 0; k < 160; k++) { const a = k / 160 * TAU, x = oc[0] + Math.cos(a) * oc[2], y = oc[1] + Math.sin(a) * oc[2]; if (Math.hypot(x - ic[0], y - ic[1]) > ic[2] + 0.3) add(x, y);
    const x2 = ic[0] + Math.cos(a) * ic[2], y2 = ic[1] + Math.sin(a) * ic[2]; if (Math.hypot(x2 - oc[0], y2 - oc[1]) < oc[2] - 0.3) add(x2, y2); }
  seg([292, 49], [298, 49]); seg([295, 46], [295, 52]);
  const halo = new Map(), halo2 = new Map();
  core.forEach(([x, y]) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = (x + dx) + ',' + (y + dy); if (core.has(k)) continue; const d = Math.abs(dx) + Math.abs(dy); if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1) halo.set(k, [x + dx, y + dy]); else if (d <= 2) halo2.set(k, [x + dx, y + dy]); } });
  halo.forEach((v, k) => halo2.delete(k));
  return { core: [...core.values()], halo: [...halo.values()], halo2: [...halo2.values()], clips: [[19, 33], [8, 51], [30, 51], [41, 35], [41, 53], [276, 38], [278, 57], [293, 45]] }; })();

// a machine in the dim back row (78 wide, stands on the floor line) — a smaller cousin of the lit one: chrome frame with a
// dark bulb ring, a rail arc, pegs, pockets, a tray; its screen (centred at scx) glows with light 5
function backMachine(S, bx, scx, flip) {
  S.lay('back'); const x1 = bx + 78, cx = bx + 39;
  // data counter box and call lamp on top
  S.beg(); S.box(cx - 13, 65, 26, 9, 'night', 3.4); S.end(); for (let k = 0; k < 5; k++) S.rect(cx - 10 + k * 4, 68, 3, 3, 'lamp', 2 + (k % 2), { e: 6 });
  S.beg(); S.cyl(cx - 3, 58, 7, 7, 'red', 3.4, { rim: 1.5 }); S.hl(cx - 4, 64, 9, 'iron', 5); S.px(cx - 1, 59, 'red', 6); S.end();
  // body: dull chrome frame, a dark bulb ring
  S.beg(); S.box(bx, 74, 78, 76, 'iron', 3.4); S.end();
  S.vl(bx + 1, 75, 60, 'iron', 6.5); S.hl(bx + 1, 75, 76, 'iron', 6.4); S.vl(bx + 5, 78, 55, 'iron', 5.4); S.vl(x1 - 6, 78, 55, 'iron', 2.2);
  for (let x = bx + 4; x < x1 - 3; x += 4) { S.px(x, 76, 'glass', 3); S.px(x, 133, 'glass', 3); } for (let y = 80; y < 133; y += 4) { S.px(bx + 3, y, 'glass', 3); S.px(x1 - 4, y, 'glass', 3); }
  // board: dim lacquer, a gold cloud, the rail arc, a grid of pegs, pockets with two little tulips
  S.vgrad(bx + 7, 79, 64, 52, 'denim', 1.2, 2.4);
  for (let k = 0; k < 60; k++) { const a = Math.PI + k / 59 * Math.PI, x = cx + Math.cos(a) * 30, y = 111 + Math.sin(a) * 30; if (y > 79) { S.px(x, y, 'iron', 6); S.px(x, y + 1, 'iron', 2); } }
  for (let x = bx + 14; x < x1 - 14; x++) { const w = Math.round(Math.sin(x * 0.25) * 1.2); S.px(x, 108 + w, 'gold', 3); }
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) { const x = bx + 12 + c * 6 + (r % 2) * 3, y = 98 + r * 4; S.px(x, y, 'brass', 4.4); S.px(x + 1, y + 1, 'denim', 0.6); }
  for (let k = 0; k < 7; k++) { const x = bx + 10 + k * 9; S.rect(x, 126, 5, 3, 'ink', 0); S.vl(x - 1, 124, 6, 'iron', 4.5); }
  [bx + 12, x1 - 16].forEach(x => { S.px(x, 124, 'red', 4); S.px(x + 3, 124, 'red', 4); S.px(x + 1, 125, 'red', 3); S.px(x + 2, 125, 'red', 3); });
  // its screen (glows with light 5), a figure on it
  S.beg(); S.box(scx - 13, 81, 26, 14, 'iron', 5); S.end(); S.rect(scx - 11, 83, 22, 10, 'tile', 5.5, { e: 6 });
  for (let y = 83; y < 93; y++) for (let x = scx - 11; x < scx + 11; x++) { const u = x - scx, v = y - 88; if (u * u / 16 + v * v / 12 < 1) S.px(x, y, 'tile', 8.5, { e: 6 }); else if (y > 90) S.px(x, y, 'tile', 3.5, { e: 6 }); else if ((x + y) % 7 === 0) S.px(x, y, 'tile', 7, { e: 6 }); }
  // tray with a few dull balls, handle, lower panel
  S.beg(); S.box(bx + 8, 135, 62, 5, 'iron', 5.4, { top: 1 }); S.end(); for (let k = 0; k < 6; k++) { S.px(bx + 12 + k * 3, 134, 'iron', 6.5); S.px(bx + 13 + k * 3, 134, 'iron', 4); }
  const hx = flip ? bx + 6 : x1 - 7; S.beg(); S.ell(hx, 138, 3.5, 3.5, 'iron', 4, { dome: 1 }); S.end();
  S.beg(); S.box(bx + 2, 141, 74, 9, 'crimson', 2.4); S.hl(bx + 20, 144, 38, 'iron', 2); S.end();
  S.lay('wall'); S.shadow([[bx - 2, 150], [x1 + 2, 150], [x1 + 6, 153], [bx + 2, 153]], 1.5);
}
// the ball-lending unit that stands between two machines
function lender(S, x) { S.lay('back'); S.beg(); S.box(x, 78, 8, 72, 'iron', 4.6, { top: 1 }); S.rect(x + 1, 84, 6, 9, 'night', 2); S.hl(x + 2, 96, 4, 'ink', 0); S.hl(x + 2, 99, 4, 'ink', 0); S.px(x + 3, 88, 'screen', 4, { e: 255 }); S.rect(x + 2, 108, 4, 6, 'iron', 7); S.hl(x + 2, 113, 4, 'iron', 2); S.end(); }
// a mirror-clad pillar on the right (the parlour's columns are mirrors; they catch the lit machine's bulbs, in anim)
function pillar(S, x, w) { S.lay('back'); S.beg(); S.rect(x, 0, w, 150, 'glass', 2.6); S.end();
  S.vl(x, 0, 150, 'iron', 7.6, { n: [-0.7, 0] }); S.vl(x + w - 1, 0, 150, 'iron', 3, { n: [0.7, 0] });
  for (let k = 0; k < 5; k++) S.vl(x + 2 + k * 2, 0, 150, 'glass', k % 2 ? 2 : 3.4);
  for (let y = 0; y < 150; y++) { const u = x + 1 + ((y * 0.35) % (w - 2)) | 0; if (y % 23 < 12) S.px(u, y, 'glass', 5.4); }
  S.hl(x, 12, w, 'brass', 6); S.hl(x, 13, w, 'brass', 3); S.box(x - 1, 138, w + 2, 12, 'iron', 3.4, { top: 1 }); S.ao(x, 0, w, 16, 't', 1.4); }

// chrome cylinder rail, vertical (2 px wide) — tone and normals so the lights run a highlight along it
const vrail = (S, x, y, h, t) => { S.vl(x, y, h, 'iron', t + 1.6, { n: [-0.6, 0] }); S.vl(x + 1, y, h, 'iron', t - 1.4, { n: [0.6, 0] }); };
const hrail = (S, x, y, w, t) => { S.hl(x, y, w, 'iron', t + 1.6, { n: [0, -0.6] }); S.hl(x, y + 1, w, 'iron', t - 1.4, { n: [0, 0.6] }); };
// one side column of the glass door, from the outer edge inward (dir 1 left column, −1 right): edge, bevel, bulb strip,
// chrome, groove, outer rail, rail channel, inner rail, brass lip
function column(S, x0, dir) {
  const X0 = (k) => (dir > 0 ? x0 + k : x0 - k), y = 24, h = 125;
  S.vl(X0(0), y, h, 'iron', 3, { n: [-0.8 * dir, 0] }); S.vl(X0(1), y, h, 'iron', 9.4, { n: [-0.5 * dir, 0] }); S.vl(X0(2), y, h, 'iron', 1.4); S.vl(X0(3), y, h, 'iron', 1.4);
  S.vl(X0(4), y, h, 'iron', 7.6); S.vl(X0(5), y, h, 'iron', 2.4);
  S.vl(X0(6), y, h, 'iron', dir > 0 ? 9 : 6, { n: [-0.6, 0] }); S.vl(X0(7), y, h, 'iron', dir > 0 ? 6 : 8.6, { n: [0.6, 0] });
  for (let k = 8; k <= 12; k++) S.vl(X0(k), y, h, 'iron', k === 8 || k === 12 ? 1 : 1.6);
  S.vl(X0(13), 38, 111, 'iron', dir > 0 ? 9 : 6, { n: [-0.6, 0] }); S.vl(X0(14), 38, 111, 'iron', dir > 0 ? 6 : 8.6, { n: [0.6, 0] });
  S.vl(X0(15), 38, 111, 'brass', dir > 0 ? 7.5 : 4.4, { n: [-0.5 * dir, 0] }); S.vl(X0(16), 38, 111, 'brass', dir > 0 ? 4.6 : 6.4, { n: [0.5 * dir, 0] });
}
// a corner of the rail: radial bands round (cx, 38.5) matching the column strip; sx −1 = left corner
function corner(S, cx, sx) {
  for (let y = 27; y < 39; y++) for (let x = Math.round(cx) - 13; x <= Math.round(cx) + 13; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - 38.5; if (dx * sx < 0 || dy > 0) continue; if (sx < 0 ? x < 64 : x > 235) continue;
    const d = Math.hypot(dx, dy), o = d - 8, nx = dx / (d || 1), ny = dy / (d || 1);
    if (o > 4.5) { S.px(x, y, 'brass', 5.4 + (o > 5.5 && o < 6.5 ? 1.5 : 0), { n: [nx * 0.3, ny * 0.3] }); continue; }
    if (o > 2.5) { S.px(x, y, 'iron', o > 3.5 ? 8.8 : 6.2, { n: [nx * (o > 3.5 ? -0.6 : 0.6), ny * (o > 3.5 ? -0.6 : 0.6)] }); continue; }
    if (o >= -2.5) { S.px(x, y, 'iron', Math.abs(o) > 2 ? 1 : 1.6); continue; }
    if (o >= -4.5) { S.px(x, y, 'iron', o < -3.5 ? 6.4 : 8.8, { n: [nx * (o > -3.5 ? -0.6 : 0.6), ny * (o > -3.5 ? -0.6 : 0.6)] }); continue; }
    if (o >= -6.5) { S.px(x, y, 'brass', o > -5.5 ? 7.2 : 4.6); continue; }
  }
  const rv = sx < 0 ? 66 : 233; S.px(rv, 29, 'brass', 9); S.px(rv + (sx < 0 ? 1 : -1), 30, 'brass', 3);   // rivet in the spandrel
}
// round-cornered bezel: chrome outer line, brass inner line, the screen / recess left dark
function bezel(S, x, y, w, h) {
  S.beg();
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const ex = Math.min(xx - x, x + w - 1 - xx), ey = Math.min(yy - y, y + h - 1 - yy); if (ex + ey < 2) continue;
    const ring = Math.min(ex, ey) + (ex < 3 && ey < 3 ? (ex + ey === 2 ? -1 : 0) : 0);
    if (ring <= 0) S.px(xx, yy, 'iron', yy - y < 2 || xx - x < 2 ? 9.6 : 4.4, { n: [xx - x < 2 ? -0.6 : x + w - 1 - xx < 2 ? 0.6 : 0, yy - y < 2 ? -0.6 : y + h - 1 - yy < 2 ? 0.6 : 0] });
    else if (ring === 1) S.px(xx, yy, 'brass', yy - y < 3 || xx - x < 3 ? 8 : 4.6);
    else S.px(xx, yy, 'ink', 0); }
  S.end();
}
function spiral(S, cx, cy, r, turns, m, t, dir) { const n = Math.ceil(turns * 40); for (let i = 0; i <= n; i++) { const q = i / n, a = q * turns * TAU * (dir || 1), rr = r * q; S.px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, m, t); } }
// a gold-leaf cloud: lobes over a flat bottom, a gold outline, scallops where lobes overlap, a curl, leaf flecks inside
function cloud(S, lobes, yb, seed) {
  const inside = (x, y) => y + 0.5 <= yb && lobes.some(([cx, cy, r]) => Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9; lobes.forEach(([cx, cy, r]) => { x0 = Math.min(x0, Math.floor(cx - r)); x1 = Math.max(x1, Math.ceil(cx + r)); y0 = Math.min(y0, Math.floor(cy - r)); });
  for (let y = y0; y <= yb; y++) for (let x = x0; x <= x1; x++) { if (!inside(x, y)) continue; const top = !inside(x, y - 1), edge = top || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y + 1);
    if (edge) S.px(x, y, 'gold', top ? 4.4 : !inside(x, y + 1) ? 2.2 : 3.2, { n: [0, top ? -0.5 : 0] }); else { S.tone(x, y, 0.6); if (hash(x, y, seed) < 0.07) S.px(x, y, 'gold', 3.6 + Math.floor(hash(y, x, seed) * 2)); } }
  lobes.forEach(([cx, cy, r], k) => { if (!k) return; for (let q = 0; q < 72; q++) { const a = q / 72 * TAU; if (Math.sin(a) > 0.25) continue; const x = Math.floor(cx + Math.cos(a) * r), y = Math.floor(cy + Math.sin(a) * r);
    if (!inside(x, y) || !inside(x, y - 1) || !inside(x - 1, y) || !inside(x + 1, y)) continue; const [px, py, pr] = lobes[k - 1]; if (Math.hypot(x + 0.5 - px, y + 0.5 - py) > pr) continue; S.px(x, y, 'gold', 2.8); } });
  const big = lobes.reduce((a, b) => (b[2] > a[2] ? b : a)); spiral(S, big[0] - 0.5, big[1] + 0.3, big[2] * 0.52, 1.25, 'gold', 3.4, seed % 2 ? 1 : -1);
}
// 青海波: overlapping fans of gold rings, drawn row by row (each row laps the one above), clipped to the board
function seigaiha(S, x0, x1, y0, y1) {
  const R = 5.5, DX = 11, DY = 3;
  for (let r = 0; y0 + r * DY <= y1 + R; r++) { const cy = y0 + r * DY + R, off = r % 2 ? DX / 2 : 0;
    for (let cx = x0 - DX + off; cx < x1 + DX; cx += DX) for (let y = Math.floor(cy - R); y < cy; y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      if (x < x0 || x > x1 || y < y0 || y > y1) continue; const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > R) continue;
      const ring = d > R - 1 ? 0 : d > 3.2 && d < 4.2 ? 1 : d > 1.2 && d < 2.2 ? 2 : -1, dk = (y - y0) / (y1 - y0);
      if (ring === 0) S.px(x, y, d > R - 0.6 && y < cy - 2 ? 'gold' : 'denim', d > R - 0.6 && y < cy - 2 ? 2.6 - dk * 0.8 : 3.6 - dk, { n: [0, -0.4] }); else if (ring > 0) S.px(x, y, 'denim', 3 - dk * 0.8 - (ring === 2 ? 0.4 : 0)); else S.px(x, y, 'denim', 1.8 - dk * 0.6); } }
}
const PEGT = [6, 8.6, 6.4, 8.2, 10, 5.6, 4.6, 4.2, 3], PEGO = PEGT.map((v, q) => ({ n: [((q % 3) - 1) * 0.6, (((q / 3) | 0) - 1) * 0.6] }));

function cabinet(S, sc) {
  S.lay('mid');
  // silhouette (one object, so it gets its outline against the room), the side face on the right
  S.beg(); S.rect(58, 24, 184, 147, 'iron', 4); S.rect(242, 26, 3, 145, 'iron', 2.4, { n: [0.86, 0] }); S.end();
  for (let y = 30; y < 168; y += 9) S.px(243, y, 'iron', 4.5);
  // the lacquered board: night blue in hard bands, lighter toward the bottom; gold-leaf clouds, flecks and stars
  S.vgrad(75, 33, 150, 82, 'denim', 1.2, 3.6); S.rect(75, 133, 150, 12, 'denim', 1);
  seigaiha(S, 75, 224, 113, 132);
  cloud(S, [[160, 60, 4], [167, 56, 6], [176, 58, 5], [183, 61, 3.5]], 64, 1);
  cloud(S, [[85, 90, 3.5], [92, 85.5, 5.5], [101, 87, 5], [108, 90.5, 3.5]], 93, 2);
  cloud(S, [[177, 110, 4], [185, 104.5, 6.5], [195, 106.5, 5.5], [203, 110.5, 4]], 114, 3);
  cloud(S, [[124, 119, 3], [130, 115.5, 4.5], [137, 117.5, 3.5]], 121.5, 4);
  cloud(S, [[98, 60, 3], [104, 56.5, 4.5], [111, 59, 3.5]], 62.5, 5);
  cloud(S, [[140, 83, 3], [146, 80, 4], [152, 82, 3]], 85.5, 6);
  for (let k = 0; k < 80; k++) { const x = 76 + Math.floor(hash(k, 1, 41) * 148), y = 37 + Math.floor(hash(k, 2, 41) * 94); if (y > 110 || S.at(x, y) !== X.MI.denim) continue; S.px(x, y, hash(k, 3, 41) < 0.55 ? 'gold' : 'lamp', 3 + Math.floor(hash(k, 4, 41) * 2.5)); }
  [[128, 42], [171, 70], [118, 100], [207, 124], [160, 96], [187, 80], [92, 124]].forEach(([x, y], i) => { S.px(x, y, 'lamp', 7); S.px(x - 1, y, 'lamp', 3.6); S.px(x + 1, y, 'lamp', 3.6); S.px(x, y - 1, 'lamp', 3.6); S.px(x, y + 1, 'lamp', 3.6); if (i % 2) { S.px(x, y - 2, 'lamp', 2.4); S.px(x, y + 2, 'lamp', 2.4); } });
  S.ao(75, 33, 150, 6, 't', 1.4); S.ao(75, 33, 6, 112, 'l', 1.2); S.ao(219, 33, 6, 112, 'r', 1.2);
  // pocket shelf: a dark recess behind a gold rope trim, dividers, the seven pockets
  for (let x = 75; x < 225; x++) { S.px(x, 133, 'gold', x % 3 === 0 ? 2 : 4.6, { n: [0, -0.5] }); S.px(x, 134, 'denim', 0.6); }
  S.ao(75, 134, 150, 5, 't', 1);
  DIVX.forEach(d => { const x = Math.round(d) - 1; vrail(S, x, 134, 11, 7); S.px(x, 133, 'brass', 9); S.px(x + 1, 133, 'brass', 6); S.px(x - 1, 133, 'brass', 4); S.px(x + 2, 133, 'brass', 3); });
  SLOTS.forEach((s, i) => { const c = s.c;
    if (s.k === 'out') { S.beg(); S.ell(c + 0.5, 140, 6, 3.6, 'iron', 7.5); S.end(); S.ell(c + 0.5, 140.4, 4.8, 2.6, 'ink', 0); S.ell(c + 0.5, 140.4, 4.8, 2.6, 'magic', 2.2, { ring: 1 }); S.hl(c - 3, 137, 7, 'iron', 10); S.hl(c - 2, 143, 5, 'iron', 3); }
    else if (s.k === 'cup') { S.beg(); S.poly([[c - 6, 135], [c + 7, 135], [c + 5, 138], [c - 4, 138]], 'brass', 6); S.hl(c - 6, 135, 13, 'brass', 9.5); S.end(); S.hl(c - 3, 136, 7, 'ink', 0.5);
      S.beg(); S.box(c - 4, 138, 9, 7, 'iron', 6); S.end(); S.rect(c - 3, 139, 7, 5, 'night', 2, { e: 1 }); icon(S, s.ic, c, 141, -1.5); }
    else { for (let k = 0; k <= 20; k++) { const a = Math.PI + k / 20 * Math.PI, x = c + 0.5 + Math.cos(a) * 7.5, y = 141 + Math.sin(a) * 7; S.px(x, y, 'brass', k % 5 ? 6.4 : 9, { n: [Math.cos(a) * 0.5, Math.sin(a) * 0.5] }); S.px(x - Math.cos(a) * 0.9, y - Math.sin(a) * 0.9 + 0.5, 'brass', 3); }
      S.beg(); S.poly([[c - 5, 144], [c + 6, 144], [c + 5, 140], [c - 4, 140]], 'brass', 6); S.hl(c - 4, 140, 9, 'brass', 9); S.hl(c - 5, 143, 11, 'brass', 3.4); S.end(); S.px(c - 1, 142, 'red', 7); S.px(c + 1, 142, 'red', 7); }
  });
  // brass pegs (3 px nail heads lit from the upper left), each with a small shadow on the lacquer
  PEGS.forEach(p => { const x = p.px, y = p.py; [[3, 1], [3, 2], [1, 3], [2, 3], [3, 3]].forEach(([i, j]) => S.tone(x + i, y + j, -1.3));
    PEGT.forEach((v, q) => S.px(x + (q % 3), y + ((q / 3) | 0), 'brass', v, PEGO[q])); });
  // the glass door: side columns, top strip, corners of the rail, bottom strip
  column(S, 58, 1); column(S, 241, -1);
  S.hl(58, 24, 184, 'iron', 10.2, { n: [0, -0.8] }); S.rect(60, 25, 180, 2, 'iron', 1.4); S.hl(60, 27, 180, 'iron', 7.8, { n: [0, 0.4] });
  S.rect(76, 28, 148, 5, 'iron', 1.5); S.hl(76, 28, 148, 'iron', 1); S.hl(76, 32, 148, 'iron', 1);
  corner(S, 76.5, -1); corner(S, 223.5, 1);
  hrail(S, 76, 33, 63, 7.4); hrail(S, 161, 33, 63, 7.4); S.hl(76, 35, 63, 'brass', 7.2); S.hl(76, 36, 63, 'brass', 4.4); S.hl(161, 35, 63, 'brass', 7.2); S.hl(161, 36, 63, 'brass', 4.4);
  S.hl(58, 145, 184, 'iron', 8.4, { n: [0, -0.6] }); S.rect(60, 146, 180, 2, 'iron', 1.4); S.hl(58, 148, 184, 'iron', 9, { n: [0, 0.3] }); S.hl(58, 149, 184, 'iron', 2.6);
  // the launcher at the foot of the rail: a spring block
  S.beg(); S.rect(65, 139, 7, 6, 'iron', 6); S.hl(65, 139, 7, 'iron', 9); for (let y = 140; y < 145; y += 2) S.hl(66, y, 5, 'iron', 3); S.px(68, 138, 'red', 6); S.end();
  // bulb sockets (unlit glass; anim lights them)
  const BT = [4.2, 3, 2.6, 1.4], BN = [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]];
  BULBS.forEach(([x, y]) => [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j], q) => S.px(x + i, y + j, 'glass', BT[q], { n: BN[q] })));
  // the LCD (screen drawn in anim) and the windmill medallion with its brass scrollwork wings
  bezel(S, LCD.x, LCD.y, LCD.w, LCD.h); S.px(LCD.sx, LCD.sy, 'glass', 9); S.px(LCD.sx + 1, LCD.sy, 'glass', 6); S.px(LCD.sx, LCD.sy + 1, 'glass', 6);
  S.beg(); S.ell(WM.x + 0.5, WM.y + 0.5, 8, 8, 'brass', 6.4, { dome: 1 }); S.end(); S.ell(WM.x + 0.5, WM.y + 0.5, 6.2, 6.2, 'night', 1.2);
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12; S.px(WM.x + 0.5 + Math.cos(a) * 7.2, WM.y + 0.5 + Math.sin(a) * 7.2, 'brass', k % 2 ? 9.5 : 3.6); }
  [[-1, 191], [1, 211]].forEach(([s, x]) => { S.beg(); for (let k = 0; k < 9; k++) { const xx = x + s * k; S.px(xx, 40 + Math.round(Math.sin(k * 0.7) * 1.2), 'brass', 7.5); S.px(xx, 41 + Math.round(Math.sin(k * 0.7) * 1.2), 'brass', 4); }
    spiral(S, x + s * 10, 38.5, 2.8, 1.1, 'brass', 8, s); S.px(x + s * 4, 36, 'brass', 7); S.px(x + s * 5, 35, 'brass', 8); S.px(x + s * 4, 45, 'brass', 5); S.px(x + s * 5, 46, 'brass', 6); S.end(); });
  // start gate: a brass crest in the top strip with a jewel lamp, a hood and a wedge that turns the ball down, two fins
  S.beg(); S.poly([[139, 28], [141, 25], [146, 24], [153, 24], [158, 25], [160, 28]], 'brass', 6.4); S.hl(142, 24, 16, 'brass', 9.6); S.hl(139, 28, 22, 'brass', 3.6); S.end();
  S.beg(); S.poly([[147, 29], [153, 29], [150, 33]], 'brass', 7); S.px(149, 29, 'brass', 10); S.end();
  [[139, 1], [159, -1]].forEach(([x]) => { S.beg(); S.rect(x, 32, 2, 5, 'brass', 6); S.px(x, 32, 'brass', 9); S.px(x + 1, 36, 'brass', 3); S.end(); });
  S.rect(141, 33, 18, 3, 'denim', 0.6);
  // the glass: reflections brighten whatever sits behind them
  for (let y = 28; y < 145; y++) for (let x = 64; x < 236; x++) { const g = GS[y * AW + x]; if (g) S.tone(x, y, g); }
  // below the glass: the tray panel with two buttons, the lower panel (speaker grilles, lower tray), plinth
  S.beg(); S.box(58, 150, 184, 10, 'crimson', 3.6); S.end(); S.noise(58, 150, 184, 10, 1, 3, 51);
  [[70, 'tile'], [80, 'red']].forEach(([x, m]) => { S.beg(); S.ell(x, 155, 3, 3, 'iron', 7, { dome: 1 }); S.ell(x, 155, 2, 2, m, 6, { dome: 1 }); S.end(); S.px(x - 1, 154, m, 9); });
  S.beg(); S.box(58, 160, 184, 8, 'crimson', 2.8); S.end();
  [[64, 44], [192, 44]].forEach(([x, w]) => { S.beg(); S.box(x, 161, w, 6, 'iron', 3); S.end(); for (let y = 162; y < 166; y++) for (let xx = x + 1; xx < x + w - 1; xx += 2) S.px(xx + (y % 2), y, 'ink', 0.4); });
  S.beg(); S.box(118, 161, 64, 6, 'iron', 5.6); S.rect(121, 162, 58, 4, 'iron', 1.6); S.end(); for (let k = 0; k < 7; k++) { S.px(124 + k * 5 + (k % 2), 163, 'iron', 6); S.px(125 + k * 5 + (k % 2), 164, 'iron', 3.6); }
  S.beg(); S.rect(57, 168, 189, 3, 'iron', 2.2); S.hl(57, 168, 189, 'iron', 5); S.end();
  S.lay('wall'); S.shadow([[54, 171], [250, 171], [256, 175], [48, 175]], 1.8);
  // front: the tray (上皿) with its payout spout, the launch handle's mount
  S.lay('front');
  S.beg(); S.box(198, 144, 11, 5, 'iron', 7.4); S.rect(200, 147, 7, 2, 'ink', 0); S.hl(198, 144, 11, 'iron', 10.4); S.end();
  S.beg(); S.hl(TRAY.x0, 149, TRAY.x1 - TRAY.x0, 'iron', 8.6, { n: [0, -0.8] }); S.rect(TRAY.x0, 150, TRAY.x1 - TRAY.x0, 5, 'iron', 2);
  S.hcyl(TRAY.x0 - 2, 155, TRAY.x1 - TRAY.x0 + 4, 4, 'iron', 6.4, { rim: 3 }); S.hl(TRAY.x0 - 1, 155, TRAY.x1 - TRAY.x0 + 2, 'iron', 10.6, { n: [0, -0.7] }); S.hl(TRAY.x0 - 2, 159, TRAY.x1 - TRAY.x0 + 4, 'iron', 2);
  S.vl(TRAY.x0 - 2, 150, 5, 'iron', 7.5); S.vl(TRAY.x1 + 1, 150, 5, 'iron', 4); S.end();
  S.ao(TRAY.x0, 150, TRAY.x1 - TRAY.x0, 3, 't', 1.2);
  S.beg(); S.ell(HANDLE.x + 0.5, HANDLE.y + 0.5, 7.5, 7.5, 'iron', 5.5, { dome: 1 }); S.rect(HANDLE.x - 2, HANDLE.y + 6, 5, 4, 'iron', 4); S.end();
  S.beg(); S.ell(229, 149, 2, 1.6, 'red', 6, { dome: 1 }); S.end();
}

function props(S, sc) {
  // the hanging sign over the row (the rule line sits on it): dark lacquer in a brass frame, rods to the ceiling
  S.lay('back'); [70, 229].forEach(x => { S.vl(x, 0, 14, 'iron', 7, { n: [-0.5, 0] }); S.vl(x + 1, 0, 14, 'iron', 4); });
  S.beg(); S.box(56, 14, 188, 10, 'night', 3.2); S.end(); S.hl(56, 14, 188, 'brass', 7.6, { n: [0, -0.7] }); S.hl(56, 15, 188, 'brass', 4.2); S.hl(56, 23, 188, 'brass', 3.4);
  S.noise(57, 16, 186, 6, 1, 6, 61); [[60, -1], [239, 1]].forEach(([x]) => { S.beg(); S.ell(x + 0.5, 18.5, 3, 3, 'brass', 6.6, { dome: 1 }); S.px(x, 18, 'red', 7); S.end(); });
  VBULBS.forEach(x => { S.px(x, 22, 'glass', 3); });
  lender(S, 49);
  // the stool (front right): a red vinyl seat on a chrome column, foot ring, round base
  S.lay('front');
  S.beg(); S.ell(277.5, 170, 11, 2.6, 'iron', 5.6, { dome: 1 }); S.end();
  S.beg(); S.cyl(276, 134, 4, 36, 'iron', 6.6, { rim: 3 }); S.end();
  S.beg(); S.ell(277.5, 153, 10, 2.6, 'iron', 7.4, { ring: 1 }); S.end();
  S.beg(); S.hcyl(264, 128, 28, 6, 'crimson', 5.6, { rim: 2.4 }); S.ell(278, 127.5, 14, 3.6, 'crimson', 7.4, { n: [0, -0.85] }); S.hl(264, 134, 28, 'iron', 8.6); S.hl(265, 135, 26, 'iron', 3); S.end();
  S.px(270, 126, 'crimson', 9.4); S.px(271, 126, 'crimson', 9); S.hl(283, 129, 4, 'crimson', 3.4); S.px(286, 131, 'crimson', 3);   // a seam, a split in the vinyl
  S.lay('wall'); S.shadow([[264, 171], [292, 171], [296, 174], [262, 174]], 1.6);
  // the pedestal ashtray (front left): a chrome bowl of sand on a column, a cigarette on the rim
  S.lay('front');
  S.beg(); S.ell(29.5, 170, 10, 2.6, 'iron', 5.4, { dome: 1 }); S.end();
  S.beg(); S.cyl(28, 130, 3, 40, 'iron', 6.6, { rim: 2.5 }); S.end();
  S.beg(); S.ell(29.5, 123.5, 10, 2.6, 'iron', 8.8, { n: [0, -0.8] }); S.hcyl(20, 124, 20, 5, 'iron', 6.4, { rim: 2.8 }); S.poly([[21, 128], [38, 128], [33, 131], [26, 131]], 'iron', 4.4); S.end();
  S.ell(29.5, 123.3, 8.2, 1.6, 'sand', 4.6); for (let k = 0; k < 6; k++) S.px(24 + k * 2 + (k % 2), 123 + (k % 2), 'sand', 2.6 + (k % 3));
  S.hl(25, 122, 3, 'linen', 8); S.px(24, 123, 'bone', 5);   // a stubbed-out butt
  S.line(32, 122, 37, 120, 'linen', 9.4); S.px(32, 122, 'sand', 6);
  S.lay('wall'); S.shadow([[18, 171], [42, 171], [45, 174], [16, 174]], 1.6);
  // strays on the carpet: two balls, a butt, a token
  S.lay('front'); [[244, 172], [58, 174]].forEach(([x, y]) => { S.px(x, y, 'iron', 10); S.px(x + 1, y, 'iron', 6); S.px(x, y + 1, 'iron', 5); S.px(x + 1, y + 1, 'iron', 3); });
  S.hl(98, 173, 3, 'linen', 7); S.px(101, 173, 'sand', 5); S.px(190, 173, 'gold', 7); S.px(191, 173, 'gold', 5); S.px(190, 174, 'gold', 4);
}

// ───────── moving things ─────────
const SMOKE = { n: [0, 0] };
const HALO = [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]];
const BALLT = [-1, 9.4, 10.4, 9.4, -1, 9.4, 11, 11, 9.4, 7.6, 8.6, 10.4, 9.6, 7.6, 5.6, 7.6, 8.6, 7.6, 5.6, 4.4, -1, 5.6, 4.6, 3.4, -1];
const BALLO = BALLT.map((v, q) => ({ n: [((q % 5) - 2) / 2.7, (Math.floor(q / 5) - 2) / 2.7] }));
// a steel ball (5 px): chrome with a top-left highlight, a dark lower right, one pixel of bulb colour; g adds glass sheen
function ball(D, x, y, g, rm, rt) {
  const x0 = Math.round(x - 2.5), y0 = Math.round(y - 2.5);
  for (let q = 0; q < 25; q++) { const v = BALLT[q]; if (v < 0) continue; D.px(x0 + (q % 5), y0 + ((q / 5) | 0), 'iron', v + g, BALLO[q]); }
  D.px(x0 + 1, y0 + 1, 'iron', 11, E);   // the specular glint stays white whatever the room light
  if (rm) D.px(x0 + 3, y0 + 3, rm, rt || 7, E);
}
function lcdFace(D, mx, my, eyes, mouth, gray, t, rim) {
  const m = gray ? 'bone' : 'lamp', R0 = 5.3;
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const d = Math.hypot(x, y); if (d > R0) { if (d <= 6.3 && my + y >= LCD.sy && my + y < LCD.sy + LCD.sh) D.px(mx + x, my + y, rim ? 'brass' : 'tile', rim ? 1.4 : 4.6, E); continue; }
    const cr = (x === 2 && y === -3) || (x === -3 && y === 2) || (x === 3 && y === 2) || (x === 1 && y === 3);
    D.px(mx + x, my + y, m, (gray ? 6 : 9) + (x + y < -4 ? 1 : 0) - (x > 3 || d > 4.8 && x > 0 ? 1.5 : 0) - (cr ? 1 : 0), E); }
  const ink = (x, y) => D.px(mx + x, my + y, 'brass', 1, E);
  if (eyes === 'open') { ink(-2, -1); ink(-2, 0); ink(2, -1); ink(2, 0); }
  else if (eyes === 'shut') { ink(-3, 0); ink(-2, 0); ink(2, 0); ink(3, 0); }
  else if (eyes === 'sleepy') { ink(-3, 0); ink(-2, 0); ink(2, 0); ink(3, 0); ink(-2, -1); ink(2, -1); }
  else if (eyes === 'wide') { [-3, 2].forEach(x => { ink(x, -1); ink(x + 1, -1); ink(x, 0); ink(x + 1, 0); D.px(mx + x, my - 1, 'lamp', 11, E); }); ink(-3, -3); ink(-2, -3); ink(2, -3); ink(3, -3); }
  else if (eyes === 'happy') { ink(-3, 0); ink(-2, -1); ink(-1, 0); ink(1, 0); ink(2, -1); ink(3, 0); }
  else if (eyes === 'sad') { ink(-2, 0); ink(2, 0); ink(-3, -2); ink(-2, -2); ink(2, -2); ink(3, -2); }
  if (mouth === 'smile') { ink(-1, 2); ink(0, 3); ink(1, 2); }
  else if (mouth === 'yawn') { const o = 0.5 + 0.5 * Math.sin(t); ink(-1, 2); ink(0, 2); ink(1, 2); ink(-1, 3); ink(1, 3); ink(-1, 4); ink(0, 4); ink(1, 4); D.px(mx, my + 3, 'red', 3 + o * 2, E); }
  else if (mouth === 'o') { ink(0, 2); ink(0, 3); ink(-1, 3); ink(1, 3); }
  else if (mouth === 'grin') { for (let x = -3; x <= 3; x++) ink(x, 2); for (let x = -2; x <= 2; x++) D.px(mx + x, my + 3, 'red', 6, E); ink(-2, 4); ink(-1, 4); ink(0, 4); ink(1, 4); ink(2, 4); }
  else if (mouth === 'frown') { ink(-1, 3); ink(0, 2); ink(1, 3); }
  if (!gray && eyes !== 'wide') { D.px(mx - 4, my + 1, 'pink', 7, E); D.px(mx + 4, my + 1, 'pink', 7, E); }
}
// the LCD: idle (a sleepy moon that blinks and yawns under stars), reach (red/gold strobe, speed lines, eyes wide),
// win (fireworks, a grin), lose (grey, a frown), off (the picture collapses to a line, then a dot, like an old TV)
function lcd(D, t, mode, lt) {
  const { sx, sy, sw, sh, mx, my } = LCD, g = (x, y) => GS[y * AW + x] * 0.8;
  if (mode === 'off') {
    const p = lt; if (p > 0.7) return; for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const vy = Math.abs(y - 5.5), vx = Math.abs(x - 17);
      if (p < 0.18) { const hh = 6 * (1 - p / 0.18) + 0.5; if (vy < hh) D.px(sx + x, sy + y, 'linen', 9 + (vy < 1 ? 1 : 0), E); }
      else if (p < 0.34) { const ww = 17.5 * (1 - (p - 0.18) / 0.16) + 1; if (vy < 1 && vx < ww) D.px(sx + x, sy + y, 'linen', 10, E); }
      else if (vy < 1 && vx < 1) D.px(sx + x, sy + y, 'linen', 10 - (p - 0.34) * 22, E); }
    return; }
  const reach = mode === 'reach', win = mode === 'win', lose = mode === 'lose', fl = Math.floor(t * 8) % 2, shk = reach ? (Math.floor(t * 30) % 2) : 0;
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const X1 = sx + x, Y1 = sy + y; let m = 'tile', v;
    if (reach) { const a = Math.atan2(y - (my - sy), x - (mx - sx)), ln = ((a / TAU * 10 + t * 3) % 1 + 1) % 1 < 0.4; m = fl ? 'red' : 'gold'; v = (fl ? 5 : 4.6) + (ln ? 2.6 : 0) - (y % 3 === 2 ? 1 : 0); }
    else if (win) { v = (y < 4 ? 2 : y < 8 ? 3 : 4) + (lt < 0.25 ? 6 : 0) - (y % 3 === 2 ? 1 : 0); if (lt < 0.25) m = 'gold'; }
    else if (lose) { v = 1 + (y > 8 ? 1 : 0) - (y % 3 === 2 ? 1 : 0); if (lt < 0.3 && hash(x, y, Math.floor(t * 30)) < 0.4) { m = 'linen'; v = 3 + Math.floor(hash(y, x, Math.floor(t * 30)) * 6); } }
    else { v = (y < 4 ? 2 : y < 8 ? 3 : 4) - (y % 3 === 2 ? 1 : 0); if (y >= 9) { const hill = 10 + Math.round(Math.sin(x * 0.35) * 1 + Math.sin(x * 0.13 + 1) * 0.8); if (y >= hill) { m = 'night'; v = 2; } } }
    D.px(X1, Y1, m, Math.max(0, v) + g(X1, Y1), E); }
  if (!reach && !lose) {   // stars (idle) or fireworks (win)
    if (win) [[103, 38, 'gold', 0], [110, 43, 'pink', 0.37], [98, 44, 'arcane', 0.73], [112, 37, 'screen', 0.5]].forEach(([cx, cy, m, off], k) => {
      const p = (((lt + off) / 1.1) % 1); if (p > 0.85) return; const r = 1 + p * 5.5, tn = 11 - p * 7;
      for (let q = 0; q < 10; q++) { const a = q * TAU / 10 + k, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r * 0.9); if (x >= sx && x < sx + sw && y >= sy && y < sy + sh) D.px(x, y, m, tn, E);
        const x2 = Math.round(cx + Math.cos(a) * (r - 1.5)), y2 = Math.round(cy + Math.sin(a) * (r - 1.5) * 0.9); if (p > 0.15 && x2 >= sx && x2 < sx + sw && y2 >= sy && y2 < sy + sh) D.px(x2, y2, m, tn - 3, E); }
      if (p < 0.12) D.px(cx, cy, 'lamp', 11, E); });
    else [[100, 37, 0], [107, 40, 1.3], [113, 36, 2.1], [104, 44, 3.3], [111, 45, 0.7], [97, 42, 2.6]].forEach(([x, y, ph]) => { const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + ph * 2.4); D.px(x, y, 'lamp', 5 + tw * 5, E); if (tw > 0.85) { D.px(x - 1, y, 'lamp', 5, E); D.px(x + 1, y, 'lamp', 5, E); } });
    if (!win) { const cx = sx + sw + 4 - ((t * 3.2) % (sw + 14)); for (let k = 0; k < 7; k++) { const x = Math.round(cx + k - 3), y = sy + 3 + (k > 1 && k < 5 ? 0 : 1); if (x >= sx && x < sx + sw) D.px(x, y, 'linen', k > 1 && k < 5 ? 7 : 5, E); if (k > 0 && k < 6 && x >= sx && x < sx + sw) D.px(x, y + 1, 'linen', 5, E); } }
  }
  // the moon face
  let eyes = 'open', mouth = 'smile';
  if (reach) { eyes = 'wide'; mouth = 'o'; } else if (win) { eyes = 'happy'; mouth = 'grin'; } else if (lose) { eyes = 'sad'; mouth = 'frown'; }
  else { const c = t % 9.5, b = t % 3.7; if (c > 7.6) { eyes = 'shut'; mouth = 'yawn'; } else if (b > 3.52) eyes = 'shut'; else if (c > 7.1 || c < 0.4) eyes = 'sleepy'; }
  lcdFace(D, mx + shk, my, eyes, mouth, lose, t * 6, reach || win);
  if (reach) for (let k = 0; k < 3; k++) { D.px(mx + 7, my - 3 + k * 3, fl ? 'gold' : 'red', 10, E); }   // shock marks by the moon
}
function windmill(D, t, spd) {
  const a = t * spd, cx = WM.x, cy = WM.y;
  for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) { const r = Math.hypot(x, y); if (r > 5.8) continue; const g = GS[(cy + y) * AW + cx + x] * 0.8;
    if (r < 1.3) { D.px(cx + x, cy + y, 'brass', (x + y < 0 ? 10 : 7) + g); continue; }
    let th = Math.atan2(y, x) - a; th = ((th % TAU) + TAU) % TAU; const s = th * 4 / TAU, b = Math.floor(s), f = s - b;
    if (f < 0.16 + r * 0.055) { const lead = f < 0.12, even = b % 2 === 0; D.px(cx + x, cy + y, even ? 'red' : 'gold', (even ? 6 : 7.5) + (lead ? 2 : 0) - (r > 5 ? 1 : 0) + g); } }
}
// a tulip: two petals on pivots either side of the prize, open 0…1; lit when its pocket flashes
function tulip(D, s, open, f, t) {
  const c = s.c, m = s.ic === 'plan' ? 'red' : 'pink', e = f > 0.05 || open > 0.8, ease = open * open * (3 - 2 * open);
  icon(D, s.ic, c, 137, e ? 2 + f * 2 : 0, e);
  if (e) { D.px(c - 4, 136, s.m, 10, E); D.px(c + 4, 136, s.m, 10, E); }
  [[-1, c - 2], [1, c + 3]].forEach(([sd, px]) => { const a = sd * (-0.34 + ease * 1.45), ca = Math.cos(a), sa = Math.sin(a), P = (x, y) => [px + x * ca - y * sa, 141 + x * sa + y * ca];
    D.beg(); D.poly([P(-1.6, 0), P(1.6, 0), P(1.9, -3.2), P(0.4, -7.2), P(-1.1, -6.4), P(-1.9, -3)].map(p => [p[0], p[1]]), m, e ? 7.5 : 5.6, e ? E : undefined);
    D.line(...P(-1, -1), ...P(-0.4, -5.6), m, e ? 10 : 8); D.line(...P(1.2, -1), ...P(1.1, -3), m, e ? 5 : 3); D.px(...P(0.4, -7), 'gold', e ? 10 : 8, e ? E : undefined); D.end(); });
}
function trayBalls(D, t, o, rs) {
  const q = Math.max(0, o.queue || 0), pay = o.payout || 0, n = Math.min(66, Math.round(q + pay * 40)), jo = o.jolt || 0, rm = X.RAMPS[(o.lamps || {}).mat] ? o.lamps.mat : 'lamp';
  const per = [23, 22, 21]; let k = 0;
  for (let row = 0; row < 3 && k < n; row++) for (let i = 0; i < per[row] && k < n; i++, k++) {
    const x = TRAY.x0 + 3.5 + i * 5 + row * 2.5 + (hash(k, 1, 7) - 0.5) * 0.8, hop = jo ? jo * 2.4 * Math.abs(Math.sin(k * 1.7 + t * 24)) : 0, y = TRAY.y - row * 3.4 - hop;
    ball(D, x, y, row === 0 ? 0 : 0.4, hash(k, 2, 7) < 0.4 ? rm : null, 6); }
  const endX = TRAY.x0 + 3.5 + Math.min(n, 23) * 5;
  // balls pouring from the spout (bought, or paid out: heavier, and at the top of the payout they spill onto the floor)
  const pour = o.pour > 0 && o.pour < 1 ? Math.sin(o.pour * Math.PI) : 0, flow = Math.max(pour, pay > 0 && pay < 1 ? 0.6 + pay * 0.4 : 0);
  if (flow > 0) for (let i = 0; i < 9; i++) { const ph = ((t * 3.4 + i / 9) % 1); if (hash(i, Math.floor(t * 3.4 + i / 9), 3) > flow + 0.1) continue;
    let x, y; if (ph < 0.22) { x = TRAY.spout[0]; y = TRAY.spout[1] + ph / 0.22 * 3.5; } else { const r2 = (ph - 0.22) / 0.78; x = TRAY.spout[0] - r2 * Math.max(4, TRAY.spout[0] - endX); y = TRAY.y - Math.abs(Math.sin(r2 * 9)) * 2 * (1 - r2); }
    ball(D, x, y, 0.5, null); }
  if (pay > 0.55) { const s = (pay - 0.55) / 0.45, nf = Math.round(s * 16);
    for (let i = 0; i < 7; i++) { const ph = ((t * 2.3 + i / 7) % 1); if (hash(i, Math.floor(t * 2.3 + i / 7), 9) > 0.35 + s) continue; ball(D, 186 + i * 3 + ph * 5, 156 + ph * ph * 16, 0.4, null); }
    for (let i = 0; i < nf; i++) { const x = 150 + hash(i, 3, 5) * 95 + Math.sin(t * 1.3 + i) * 2 * (1 - s * 0.5), y = 172.5 + Math.floor(hash(i, 4, 5) * 2); ball(D, x, y, 0, null); }
    if (!rs.st.spill || t - rs.st.spill > 0.12) { rs.st.spill = t; rs.burst('glint', 186 + Math.random() * 24, 170 + Math.random() * 3, 1, { sp: 6, life: 0.4 }); } }
}
function handleKnob(D, t, o) {
  const { x: cx, y: cy } = HANDLE, tw = o.handle || 0, a = -2.2 + (o.turn || 0) * 1.7 + tw * 0.4 * Math.sin(t * 70);
  for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { const r = Math.hypot(x, y); if (r > 6.3) continue; const nx = x / (r || 1), ny = y / (r || 1); let th = Math.atan2(y, x) - a; th = ((th % TAU) + TAU) % TAU;
    if (r > 4.3) { const notch = Math.cos(th * 7) > 0.55; D.px(cx + x, cy + y, 'iron', notch ? 6.4 : 2.6 + (ny < 0 ? 1 : 0), { n: [nx * 0.7, ny * 0.7] }); }
    else if (r > 3.3) D.px(cx + x, cy + y, 'iron', 9.4, { n: [nx * 0.5, ny * 0.5] });
    else D.px(cx + x, cy + y, 'iron', 6.4 + (x + y < -1 ? 2.4 : 0), { n: [nx * 0.4, ny * 0.4] }); }
  for (let k = 1; k <= 3; k++) D.px(cx + Math.cos(a) * k, cy + Math.sin(a) * k, 'red', 8, E);
}

X.def('mb_pachinko', {
  size: [AW, AH], fy: 150, noFrame: 1, amb: [0.17, 0.2],
  // o (read-only, art px / seconds / 0…1):
  //   balls   [{ x, y, hot, tr: [x0, y0, x1, y1, …] }]  balls in play (board or rail) — centres; tr = recent trail, oldest first;
  //           hot = the ball in reach (gold trail + its own light)
  //   pegF    [76] flash 0…1 per peg, row by row as mg.pegs (rows of 10, 9, 10, …); a rise spawns a spark
  //   slotF   [7]  pocket flash 0…1 (cups flood their prize colour, out-holes flash grey, tulips light up)
  //   tulip   [left, right] 0…1 open
  //   queue   balls waiting in the tray;  jolt 0…1 tray balls hop (hover on the tray, tap on the glass)
  //   handle  0…1 launch twitch (1 at a launch, decays);  turn 0…1 how far the handle is turned
  //   lcd     { mode: 'idle' | 'reach' | 'win' | 'lose' | 'off', t: s in this mode }
  //   lamps   { mode: 'idle' | 'chase' | 'strobe' | 'off', mat: ramp name (prize colour; default 'lamp'), t: s in this mode }
  //   pour    0…1 balls pouring into the tray (buy);  payout 0…1 balls paid out (≥ 0.55 they spill onto the carpet)
  //   ripple  { x, y, age s } a tap on the glass
  // prize colours for lamps.mat: 图纸 'gold' (jackpot), 道具 'arcane', 积分 'gold', 物资 'sand', reach 'red'. Positions the
  // game needs (pegs, pockets, rail(u) for a launch, tray, handle, glass rect for taps) are in MB.pachinko below.
  paint(S, sc) {
    // The bulbs', the screen's and the flood's colours follow the game state (anim recolours those light objects).
    LT.bulb = sc.lights[sc.light({ x: 150, y: 84, z: 60, r: 185, i: 0.6, c: '#ffc878', tint: 0.3 })];           // 0 the cabinet's bulbs
    LT.lcd = sc.lights[sc.light({ x: 98, y: 41, z: 10, r: 54, i: 0.6, c: '#8ec8ff', fl: 'screen', tint: 0.45 })]; // 1 LCD
    sc.light({ x: 27, y: 46, z: 12, r: 56, i: 0.72, c: '#ff4ad0', tint: 0.55 });                                  // 2 neon (anim flickers it; 7 is its twin sign)
    sc.light({ x: 150, y: -6, z: 46, r: 120, i: 0.4, c: '#ffe2b8', tint: 0.12 });                                // 3 ceiling downlight
    sc.light({ x: 37, y: 120, z: 12, r: 7, i: 0.5, c: '#ff7a30', fl: 'candle', ph: 2, tint: 0.5 });              // 4 the cigarette
    sc.light({ x: 9, y: 88, z: 8, r: 32, i: 0.4, c: '#5a8cff', fl: 'screen', ph: 2, tint: 0.5 });                // 5 back machine's screen (left; 8 is the right one)
    LT.flood = sc.lights[sc.light({ x: 150, y: 96, z: 84, r: 205, i: 1, c: '#ffcc50', bake: false, tint: 0.5 })]; // 6 flood in the prize colour
    sc.light({ x: 283, y: 46, z: 12, r: 56, i: 0.72, c: '#ff4ad0', tint: 0.55 });                                 // 7 the twin neon (crescent + star), flickers with 2
    sc.light({ x: 265, y: 88, z: 8, r: 32, i: 0.4, c: '#5a8cff', fl: 'screen', ph: 5, tint: 0.5 });               // 8 right back machine's screen
    room(S, sc); backMachine(S, -30, 9, 0); backMachine(S, 256, 267, 1); pillar(S, 245, 11); props(S, sc); cabinet(S, sc);
    sc.emit({ k: 'dust', x: 150, y: 70, w: 200, h: 90, rate: 2, sp: 2, life: 5 });
  },
  anim(D, t, rs, o) {
    o = o || {}; const st = rs.st, lm = o.lamps || {}, mode = lm.mode || 'idle', mat = X.RAMPS[lm.mat] ? lm.mat : 'lamp', lt = lm.t || 0;
    const lc = o.lcd || {}, lmode = lc.mode || 'idle', lct = lc.t || 0, strobe = mode === 'strobe', sOn = Math.floor(t * 14) % 2;
    // lights: the bulbs' glow and the flood take the lamps' colour, the screen's light takes the screen's colour
    rs.mul[0] = strobe ? (sOn ? 1.6 : 0.4) : mode === 'chase' ? 1.2 : mode === 'off' ? Math.max(0.05, 1 - lt / 1.2) : 1;
    rs.mul[6] = strobe ? (sOn ? 1.3 : 0) : mode === 'chase' && mat !== 'lamp' ? 0.3 : lmode === 'reach' ? (Math.floor(t * 8) % 2 ? 0.45 : 0.15) : 0;
    rs.mul[1] = lmode === 'off' ? Math.max(0, 1 - lct / 0.35) : lmode === 'reach' ? 1.9 : lmode === 'win' ? 1.8 : lmode === 'lose' ? 0.5 : 1;
    if (LT.bulb) { LT.bulb.rgb = RGB(mode === 'idle' ? 'lamp' : mat); LT.flood.rgb = RGB(lmode === 'reach' && !strobe && mode !== 'chase' ? 'red' : mat);
      LT.lcd.rgb = lmode === 'reach' ? RGB(Math.floor(t * 8) % 2 ? 'red' : 'gold') : lmode === 'win' ? RGB('gold') : lmode === 'lose' ? [120, 130, 170] : LCDC; }
    const nc = t % 7.3, nOff = nc > 6.6 && ((nc * 20) | 0) % 3 === 0, nDim = nc > 6.6 && !nOff; rs.mul[2] = rs.mul[7] = nOff ? 0.12 : nDim ? 0.7 : 1;
    // neon tube (the lit glass is painted here so it can go out)
    D.lay('back'); NEON.halo.forEach(([x, y]) => D.px(x, y, 'pink', nOff ? 2 : nDim ? 4 : 6, E)); NEON.core.forEach(([x, y]) => D.px(x, y, 'pink', nOff ? 3 : nDim ? 8 : 10, E));
    // the back row: bulbs that blink out of sync, the lenders' LEDs, the clock's second hand
    for (let k = 0; k < 24; k++) { const side = k % 2, j = k >> 1, x = side ? 256 + j * 4 : j * 4, y = 76, r2 = 0.6 + hash(k, 1, 3) * 1.6; if (x > 297 || (!side && x > 46)) continue;
      if (hash(k, Math.floor(t * r2 + hash(k, 2, 3) * 9), 4) < 0.28) D.px(x, y, hash(k, 5, 3) < 0.5 ? 'lamp' : 'pink', 8, E); }
    for (let k = 0; k < 12; k++) { const side = k % 2, j = k >> 1, y = 80 + j * 8, x = side ? 255 : 44; if (hash(k, Math.floor(t * 0.9 + k), 8) < 0.25) D.px(x, y, 'lamp', 7, E); }
    D.px(52, 88, 'screen', Math.floor(t * 1.2) % 2 ? 9 : 4, E); D.px(248, 88, 'red', Math.floor(t * 0.8 + 0.5) % 2 ? 9 : 4, E);
    const sa = (t % 60) / 60 * TAU - Math.PI / 2; for (let k = 1; k <= 5; k++) D.px(CLOCK.x + 0.5 + Math.cos(sa) * k, CLOCK.y + 0.5 + Math.sin(sa) * k, 'red', 6);
    // the valance's little bulbs chase with the machine
    VBULBS.forEach((x, k) => { const q = ((k - t * (mode === 'chase' ? 14 : 4)) % 6 + 6) % 6, on = mode === 'off' ? 0 : strobe ? sOn : q < 1 ? 1 : 0; if (on) D.px(x, 22, mat, 9, E); });
    // cigarette ember
    D.lay('front'); D.px(37, 120, 'fire', 8 + 3 * (0.5 + 0.5 * n1(t * 3)), E); D.px(36, 121, 'bone', 3);
    // a wisp of smoke: one thread that sways, splits in two and breaks up as it rises (lit by the room, so it takes the neon's pink)
    for (let k = 1; k < 40; k++) { const q = k / 40, sw = Math.sin(k * 0.21 - t * 1.6) * k * 0.13 + Math.sin(k * 0.07 + t * 0.5) * 2 * q, x = 37.5 + sw + k * 0.12, y = 119 - k;
      if (hash(k, Math.floor(t * 5 + k * 0.1), 17) < q * 0.9) continue; D.px(x, y, 'linen', 7.4 - q * 3.6, SMOKE);
      if (k > 14 && hash(k, Math.floor(t * 4), 19) > q) D.px(x + 1.5 + Math.sin(k * 0.35 + t * 1.1) * (k - 14) * 0.12, y - 1, 'linen', 6.2 - q * 3.2, SMOKE); }
    // ── the cabinet ──
    D.lay('mid');
    // chasing bulbs round the glass
    const nb = BULBS.length, refl = [];
    for (let k = 0; k < nb; k++) { let lv;
      if (mode === 'idle') { const q = ((k - t * 9) % 12 + 12) % 12; lv = q < 1.5 ? 2 : q < 4 ? 1 : 0.5; }
      else if (mode === 'chase') { const q = ((k - t * 34) % 5 + 5) % 5; lv = q < 2 ? 2 : 1; }
      else if (strobe) lv = sOn ? 2 : k % 2 ? 1 : 0;
      else lv = k / nb > lt / 1.1 ? 1 : 0;
      if (!lv) continue; const [x, y] = BULBS[k], m = mode === 'idle' && lv < 2 ? 'lamp' : mat, b = lv === 2 ? 9.6 : lv === 1 ? 7 : 5;
      if (lv === 2) { HALO.forEach(([i, j]) => D.px(x + i, y + j, m, 3.4, E)); if (x === 238) refl.push(y); }
      D.px(x, y, m, b + 1.4, E); D.px(x + 1, y, m, b, E); D.px(x, y + 1, m, b, E); D.px(x + 1, y + 1, m, b - 1.6, E); }
    D.lay('back'); refl.forEach(y => { D.px(249, y, mat, 6, E); D.px(250, y + 1, mat, 4.4, E); D.px(252, y + 2, mat, 3, E); }); D.lay('mid');
    // start gate jewel (flashes at each launch)
    const gj = 5 + (o.handle || 0) * 6 + (strobe && sOn ? 3 : 0); D.px(149, 25, 'red', gj + 1, E); D.px(150, 25, 'red', gj, E); D.px(149, 26, 'red', gj - 1, E); D.px(150, 26, 'red', gj - 2, E);
    lcd(D, t, lmode, lct);
    windmill(D, t, strobe ? 16 : mode === 'chase' ? 9 : mode === 'off' ? Math.max(0, 1.5 - lt) : 1.5);
    D.px(WM.x, WM.y - 8, 'red', 5 + (strobe ? sOn * 5 : 2 * (0.5 + 0.5 * Math.sin(t * 3))), E);
    // pegs: flash white, a spark the moment they are struck
    const pf = o.pegF || [], pp = st.pf || (st.pf = new Float32Array(PEGS.length));
    for (let i = 0; i < PEGS.length; i++) { const f = pf[i] || 0, p = PEGS[i]; if (f > pp[i] + 0.3) rs.burst('spark', p.x, p.y, 1 + (f > 0.9 ? 1 : 0), { sp: 26, life: 0.35, floor: 146 }); pp[i] = f; if (f < 0.05) continue;
      const w = f > 0.6, x = p.px, y = p.py, m = w ? 'lamp' : 'brass'; for (let j = 0; j < 9; j++) D.px(x + (j % 3), y + ((j / 3) | 0), m, (w ? 9 : 8) + f * 2 + (j === 4 ? 1 : j === 8 ? -2 : 0), E);
      if (f > 0.5) { const r = f > 0.8 ? 2 : 3; D.px(x + 1, y - r + 1, 'lamp', 7, E); D.px(x + 1, y + r + 1, 'lamp', 7, E); D.px(x - r + 1, y + 1, 'lamp', 7, E); D.px(x + r + 1, y + 1, 'lamp', 7, E); } }
    // pockets: tulips open, cups flood, out-holes flash grey
    const sf = o.slotF || [], tu = o.tulip || [0, 0];
    const sp2 = st.sf || (st.sf = new Float32Array(7));
    SLOTS.forEach((s, i) => { const f = sf[i] || 0, c = s.c;
      if (f > sp2[i] + 0.5 && s.k !== 'out') rs.burst('gold', s.x, 137, s.k === 'tulip' ? 14 : 6, { sp: s.k === 'tulip' ? 60 : 38, ang: 0, spread: 1.5, life: 0.9, floor: 146 }); sp2[i] = f;
      if (s.k === 'tulip') { tulip(D, s, i ? tu[1] || 0 : tu[0] || 0, f, t);
        for (let k = 0; k < 5; k++) { const a = Math.PI + (k + 0.5) / 5 * Math.PI, on = strobe ? sOn : f > 0.05 || ((k + (i ? 4 - k : 0) * 0 - t * 5) % 5 + 5) % 5 < 1.2; if (on) D.px(c + 0.5 + Math.cos(a) * 7.5, 141 + Math.sin(a) * 7, strobe ? mat : s.m === 'arcane' ? 'arcane' : 'lamp', 10, E); } }
      else if (f > 0.03) { if (s.k === 'cup') { for (let y = 139; y < 144; y++) for (let x = c - 3; x <= c + 3; x++) D.px(x, y, s.m, 5 + f * 5, E); icon(D, s.ic, c, 141, 1 + f * 3, 1); D.hl(c - 6, 135, 13, 'lamp', 8 + f * 3, E); }
        else for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; D.px(c + 0.5 + Math.cos(a) * 5.4, 140.4 + Math.sin(a) * 3.2, 'stone', 4 + f * 6, E); } }
      if (f > 0.05) rs.dl.push({ x: s.x, y: 138, z: 10, r: 18, i: f * 0.9, rgb: s.k === 'out' ? [150, 150, 170] : s.m === 'arcane' ? [180, 140, 255] : [255, 210, 110], tint: 0.6 }); });
    // balls in play (on the board or on the rail); the ball in reach trails gold and carries its own light
    (o.balls || []).forEach(b => { const tr = b.tr || [], n = tr.length >> 1;
      if (b.hot && n > 1) { for (let k = 1; k < n; k++) { const q = k / n; D.line(tr[k * 2 - 2], tr[k * 2 - 1], tr[k * 2], tr[k * 2 + 1], 'gold', 4 + q * 6.5, E); } }
      else if (n > 1) { const k = n - 1; D.px(tr[k * 2 - 2], tr[k * 2 - 1], 'iron', 4); }
      ball(D, b.x, b.y, gsAt(b.x, b.y), b.hot ? 'gold' : mat, b.hot ? 10 : 7);
      if (b.hot) rs.dl.push({ x: b.x, y: b.y, z: 14, r: 16, i: 0.8, rgb: [255, 200, 90], tint: 0.6 }); });
    // ── front: tray, handle, glass ripple ──
    D.lay('front'); trayBalls(D, t, o, rs); handleKnob(D, t, o);
    const rp = o.ripple; if (rp && rp.age < 0.7) { const a = 1 - rp.age / 0.7; [0, 5].forEach((lag, w) => { const rr = 1.5 + Math.max(0, rp.age * 60 - lag), n = Math.max(12, Math.round(rr * 5));
      for (let k = 0; k < n; k++) { const th = k / n * TAU, x = Math.round(rp.x + Math.cos(th) * rr), y = Math.round(rp.y + Math.sin(th) * rr); if (x < 64 || x > 235 || y < 28 || y > 144 || X.bayer(x, y) > a * (w ? 0.6 : 1)) continue; D.px(x, y, 'glass', 9 + a * 2.5 - w * 2, E); } }); }
  },
});
MB.pachinko = {
  board: { L: PG.L, R: PG.R, T: PG.T, B: PG.B }, pocketY: PG.pz, dividerY: PG.div, landY: PG.land, ballR: PG.br, pegR: PG.pr,
  pegs: PEGS.map(p => [p.x, p.y]), slots: SLOTS.map(s => ({ x: s.x, kind: s.k, prize: s.ic || null })), dividers: DIVX,
  rail, spawn: { x0: 142.5, x1: 157.5, y: 35 }, gate: { x: 150, y: 30 }, lcd: { x: LCD.x, y: LCD.y, w: LCD.w, h: LCD.h }, windmill: { x: WM.x + 0.5, y: WM.y + 0.5, r: 8 },
  tray: { x0: TRAY.x0, x1: TRAY.x1, y0: 147, y1: 160 }, spout: { x: TRAY.spout[0], y: TRAY.spout[1] }, handle: { x: HANDLE.x + 0.5, y: HANDLE.y + 0.5, r: HANDLE.r },
  glass: { x0: 64, y0: 28, x1: 236, y1: 145 }, bulbs: BULBS.length,
  toArt: (x, y) => [(x - 360) / 4, (y - 110) / 4], toStage: (x, y) => [360 + 4 * x, 110 + 4 * y],
};
})();
