// ==== mc-pxroom-kit.js ====
(function () {
// Room shells for the pixel rooms (mc-pxroom.js): the wall, ceiling and floor of each of the 9 styles, the rock around
// the base and the dug-out empty room. A room calls PXR.shell(S, sc, style) first, then paints its own things.
const M = window.MC, X = M.PXR; if (!X) return;
const { W, H, FY, TX, vnoise } = X;

const SH = {
  // stone keep: dressed stone, an oak ceiling beam with joists, plank floor, a darker plinth course
  medieval(S) {
    TX.ashlar(S, 0, 0, W, FY, 'mstone', 5, { bh: 10, bw: 18, crack: 0.22 }); S.noise(0, 0, W, FY, 1, 7, 11);
    S.rect(0, FY - 4, W, 4, 'mstone', 3.5); S.hl(0, FY - 4, W, 'mstone', 5, { n: [0, -0.8] }); for (let x = 9; x < W; x += 21) S.vl(x, FY - 3, 3, 'mstone', 1.5);
    S.beg(); S.box(0, 3, W, 6, 'wood', 4); S.end({ none: 1 }); for (let x = 12; x < W; x += 32) { S.beg(); S.box(x, 9, 5, 3, 'wood', 3.5); S.end(); }
    TX.planks(S, 0, FY, W, H - FY, 'wood', 4.5, { ph: 3, pw: 30 });
  },
  // boiler room: riveted iron plates, copper trim course, a brass pipe run under the ceiling, diamond-plate floor
  steam(S) {
    TX.panels(S, 0, 0, W, FY, 'iron', 5, { pw: 25, ph: 21, streak: 1 }); S.noise(0, 0, W, FY, 1, 9, 21);
    S.box(0, 46, W, 4, 'copper', 5); for (let x = 6; x < W; x += 12) TX.rivet(S, x, 47, 'copper', 5);
    S.beg(); S.hcyl(0, 5, W, 5, 'brass', 5, { rim: 2 }); for (let x = 18; x < W; x += 38) { S.box(x, 4, 4, 7, 'brass', 6); } S.end();
    S.rect(0, FY - 3, W, 3, 'iron', 3); S.hl(0, FY - 3, W, 'iron', 6, { n: [0, -0.8] });
    TX.grate(S, 0, FY, W, H - FY, 'iron', 4);
  },
  // lab module: blue-grey panels with seams and vents, a glowing teal strip, glossy floor tiles
  scifi(S, sc) {
    TX.panels(S, 0, 0, W, FY, 'scifi', 7, { pw: 30, ph: 22, rivets: false, v: 1 });
    for (let x = 0; x < W; x += 30) { for (let k = 0; k < 3; k++) S.hl(x + 8, 60 + k * 3, 14, 'scifi', 2.5); S.hl(x + 8, 61, 14, 'scifi', 8); }
    S.rect(0, 13, W, 2, 'teal', 7, { e: 255 }); S.hl(0, 12, W, 'scifi', 4); S.hl(0, 15, W, 'scifi', 4);
    S.beg(); S.box(0, 3, W, 7, 'scifi', 5); S.end({ none: 1 }); for (let x = 10; x < W; x += 20) S.hl(x, 6, 8, 'scifi', 2.5);
    S.rect(0, FY - 3, W, 3, 'scifi', 4); S.hl(0, FY - 3, W, 'teal', 6, { e: 255 });
    TX.tiles(S, 0, FY, W, H - FY, 'scifi', 6, { s: 10, grout: 'scifi', gt: 3, v: 0.6 });
    sc.light({ x: 75, y: 14, z: 3, r: 140, i: 0.35, c: '#6af0e0', tint: 0.25 });
  },
  // crypt of the arcane: violet brick, a band of carved runes that breathe, flagstone floor
  magic(S, sc) {
    TX.bricks(S, 0, 0, W, FY, 'magic', 5, { bw: 14, bh: 7, v: 1.4, chip: 0.2 }); S.noise(0, 0, W, FY, 1, 8, 31);
    const runes = ['010111010', '111010010', '101010111', '110011010', '011110011', '100111001'];
    for (let x = 8, i = 0; x < W - 6; x += 17, i++) { const g = runes[i % runes.length]; S.rect(x - 1, 22, 5, 5, 'magic', 2.5); for (let k = 0; k < 9; k++) if (g[k] === '1') S.px(x + (k % 3), 23 + Math.floor(k / 3), 'arcane', 7, { e: 1 }); }
    S.beg(); S.box(0, 3, W, 6, 'magic', 4); S.end({ none: 1 });
    TX.ashlar(S, 0, FY, W, H - FY, 'magic', 4, { bh: 5, bw: 20, crack: 0.1 });
    sc.light({ x: 75, y: 24, z: 2, r: 1, c: '#9a7cff', fl: 'pulse', amp: 0.6, sp: 1.3, tint: 0 });   // light 0 of magic rooms: lights nothing, the carved runes (glow e: 1) breathe with it
  },
  // burrow: packed earth, roots breaking through, moss, a floor of trodden soil and grass
  nature(S) {
    S.rect(0, 0, W, FY, 'earth', 5); S.noise(0, 0, W, FY, 2, 6, 41); S.noise(0, 0, W, FY, 1, 2.5, 42);
    const r = S.r; for (let i = 0; i < 18; i++) { const cx = r() * W, cy = 10 + r() * (FY - 20), rx = 2 + r() * 4; S.beg(); S.ell(cx, cy, rx, rx * 0.7, 'stone', 5 + r() * 2, { dome: 1 }); S.end(); }
    for (let i = 0; i < 6; i++) { let x = 8 + i * 25 + r() * 10, y = 3; const len = 20 + r() * 40; S.beg(); for (let k = 0; k < len; k++) { S.rect(x, y, k < len * 0.5 ? 2 : 1, 1, 'wood', 5 - k / len * 1.5); y++; if (r() < 0.35) x += r() < 0.5 ? -1 : 1; } S.end(); }
    for (let i = 0; i < 9; i++) { const cx = r() * W, cy = 4 + r() * 20; for (let k = 0; k < 18; k++) S.px(cx + (r() - 0.5) * 12, cy + r() * 5, 'moss', 4 + r() * 3); }
    S.beg(); S.box(0, 3, W, 4, 'earth', 3); S.end({ none: 1 });
    S.rect(0, FY, W, H - FY, 'earth', 6); S.noise(0, FY, W, H - FY, 1, 3, 43);
    for (let x = 0; x < W; x++) { if (r() < 0.55) S.px(x, FY, 'leaf', 6 + r() * 3); if (r() < 0.25) S.px(x, FY - 1, 'leaf', 7 + r() * 3); }
  },
  // pump house: small glazed tiles, a band of big tiles, wet tile floor
  water(S) {
    TX.tiles(S, 0, 0, W, 58, 'tile', 8, { s: 6, gt: 5, v: 1 });
    TX.tiles(S, 0, 58, W, FY - 58, 'tile', 5, { s: 11, gt: 2.5, v: 1.2, off: 1 }); S.box(0, 56, W, 3, 'tile', 9);
    S.beg(); S.box(0, 3, W, 5, 'iron', 4); S.end({ none: 1 });
    TX.tiles(S, 0, FY, W, H - FY, 'tile', 5, { s: 9, gt: 2, v: 0.8 });
  },
  // gilded hall: crimson damask, gold pilasters, dark boards with a carpet runner
  fantasy(S) {
    S.rect(0, 0, W, FY, 'crimson', 4);
    for (let y = 6; y < FY; y += 12) for (let x = ((y / 12) % 2) * 9; x < W; x += 18) { S.poly([[x, y - 4], [x + 4, y], [x, y + 4], [x - 4, y]], 'crimson', 5.5); S.px(x, y, 'gold', 7); }
    [4, W - 12].forEach(x => { S.beg(); S.cyl(x, 8, 8, FY - 12, 'gold', 5, { rim: 2 }); S.box(x - 2, 6, 12, 3, 'gold', 6); S.box(x - 2, FY - 6, 12, 3, 'gold', 5); S.end(); });
    S.beg(); S.box(0, 3, W, 4, 'gold', 5); S.end({ none: 1 });
    TX.planks(S, 0, FY, W, H - FY, 'wood', 3, { ph: 3, nails: false });
    S.rect(20, FY + 1, W - 40, H - FY - 3, 'crimson', 5); S.hl(20, FY + 1, W - 40, 'gold', 7); S.hl(20, H - 3, W - 40, 'gold', 5);
  },
  // toy room: lavender stripes with candy dots, candy wainscot, checker floor
  cartoon(S) {
    for (let x = 0; x < W; x += 10) S.rect(x, 0, 5, FY, 'lav', 6), S.rect(x + 5, 0, 5, FY, 'lav', 5);
    for (let y = 8; y < FY - 22; y += 11) for (let x = ((y / 11) % 2) * 5 + 2; x < W; x += 10) { S.rect(x, y, 2, 2, 'candy', 7); S.px(x, y, 'candy', 9); }
    S.beg(); TX.vplanks(S, 0, FY - 20, W, 20, 'candy', 5, { pw: 7 }); S.box(0, FY - 22, W, 3, 'candy', 7); S.end({ none: 1 });
    S.beg(); S.box(0, 3, W, 4, 'lav', 4); S.end({ none: 1 });
    for (let y = FY; y < H; y += 3) for (let x = ((y - FY) / 3 % 2) * 6; x < W; x += 12) { S.rect(x, y, 6, 3, 'linen', 8); S.rect(x + 6, y, 6, 3, 'lav', 5); }
  },
  // the shaft house: stone blocks and steel
  core(S) {
    TX.bricks(S, 0, 0, W, FY, 'stone', 5, { bw: 15, bh: 7 }); S.noise(0, 0, W, FY, 1, 8, 51);
    S.beg(); S.box(0, 3, W, 6, 'iron', 5); S.end({ none: 1 });
    TX.grate(S, 0, FY, W, H - FY, 'iron', 4);
  },
};
// shell: the style's wall, ceiling and floor, then baked occlusion under the ceiling, down the corners and along the floor
X.shell = function (S, sc, style, o) {
  o = o || {}; S.lay('wall'); (SH[style] || SH.medieval)(S, sc);
  S.ao(0, 8, W, 16, 't', o.aoTop == null ? 2.2 : o.aoTop); S.ao(0, FY - 14, W, 14, 'b', 1.4);
  S.ao(0, 0, 16, H, 'l', o.aoSide == null ? 2 : o.aoSide); S.ao(W - 16, 0, 16, H, 'r', o.aoSide == null ? 2 : o.aoSide);
  S.ao(0, FY, W, 5, 't', 1.8);
};
X.SHELLS = SH;

// ───────── outdoors: the wonder rooms that show a landmark under the sky ─────────
// sky(S, sc, o): o.horizon (art y where the far land meets the sky, default 64), o.dusk (sunset ramp instead of night),
// o.moon [x, y, r] or o.sun [x, y, r], o.far 'hills' | 'city' | 'dunes' | 'peaks' | 'sea' | 'trees' | 'none',
// o.floor 'grass' | 'sand' | 'snow' | 'stone' | 'water' | 'dirt'. The sky is glow (e: 255): lights never dim it.
X.sky = function (S, sc, o) {
  o = o || {}; const hz = o.horizon || 64, r = S.r, dusk = !!o.dusk, far = o.far || 'hills';
  S.lay('wall');
  if (dusk) S.vgrad(0, 0, W, FY, 'dusk', 1.3, 8.6, { e: 255 }); else S.vgrad(0, 0, W, FY, 'night', 0.8, 4.4, { e: 255 });
  for (let i = 0; i < (dusk ? 12 : 46); i++) { const x = r() * W, y = r() * hz * (dusk ? 0.45 : 0.8), b = r(); S.px(x, y, 'linen', b < 0.2 ? 10 : 6 + b * 3, { e: 255 }); if (b < 0.06) { S.px(x - 1, y, 'linen', 5, { e: 255 }); S.px(x + 1, y, 'linen', 5, { e: 255 }); } }
  if (o.moon) { const [mx, my, mr] = o.moon; for (let k = 3; k >= 1; k--) S.ell(mx, my, mr + k * 2.5, mr + k * 2.5, dusk ? 'dusk' : 'night', (dusk ? 7 : 3.4) + (4 - k) * 0.55, { e: 255 });
    S.ell(mx, my, mr, mr, 'bone', 9, { e: 255 }); S.ell(mx + mr * 0.25, my - mr * 0.2, mr * 0.75, mr * 0.75, 'bone', 10, { e: 255 });
    [[-0.3, 0.2, 0.28], [0.35, 0.35, 0.2], [0.05, -0.4, 0.16]].forEach(([a, b, c]) => S.ell(mx + a * mr, my + b * mr, Math.max(1, c * mr), Math.max(1, c * mr), 'bone', 7, { e: 255 }));
    sc.light({ x: mx, y: my, z: 70, r: 280, i: dusk ? 0.35 : 0.55, c: '#c8d0ff', tint: 0.22 }); }
  if (o.sun) { const [sx, sy, sr] = o.sun; for (let k = 4; k >= 1; k--) S.ell(sx, sy, sr + k * 3, sr + k * 2.2, 'dusk', 7.6 + (4 - k) * 0.7, { e: 255 });
    S.ell(sx, sy, sr, sr, 'lamp', 10, { e: 255 }); S.ell(sx - sr * 0.2, sy - sr * 0.2, sr * 0.6, sr * 0.6, 'lamp', 11, { e: 255 });
    sc.light({ x: sx, y: sy, z: 70, r: 300, i: 0.75, c: '#ffb070', tint: 0.4 }); }
  // far land against the sky
  const band = (base, amp, fr, m, t, ph, jag) => { for (let x = 0; x < W; x++) { const h = base - Math.abs(Math.sin(x * fr + ph)) * amp - Math.sin(x * fr * 2.7 + ph * 1.7) * amp * 0.3 - (jag ? (h2x(x, ph) < 0.3 ? 1 : 0) : 0); for (let y = Math.round(h); y < FY; y++) S.px(x, y, m, t + (y - h < 1 ? 1 : 0), { e: 255 }); } };   // far land is a flat silhouette: lights never touch it
  const h2x = (x, s2) => { const v = Math.sin(x * 12.9898 + s2 * 78.233) * 43758.5453; return v - Math.floor(v); };
  const fm = dusk ? 'dusk' : 'night';
  if (far === 'hills' || far === 'trees') { band(hz + 2, 10, 0.035, fm, dusk ? 2.4 : 1.6, 1.1); band(hz + 10, 7, 0.06, fm, dusk ? 1.4 : 1, 2.3); }
  if (far === 'trees') for (let i = 0; i < 26; i++) { const x = r() * W, hh = 6 + r() * 10; for (let k = 0; k < hh; k++) S.rect(x - Math.floor(k * 0.35), hz + 12 - hh + k, 1 + Math.floor(k * 0.7), 1, fm, 1, { e: 255 }); }
  if (far === 'peaks') { band(hz, 26, 0.045, fm, dusk ? 2.2 : 1.8, 0.4, 1); band(hz + 12, 8, 0.07, fm, 1, 2.9); }   // snow caps are the room's to paint
  if (far === 'dunes') { band(hz + 4, 6, 0.03, 'sand', 3, 0.7); band(hz + 12, 5, 0.05, 'sand', 4, 1.9); }
  if (far === 'city') { for (let x = 0; x < W;) { const bw = 5 + Math.floor(r() * 9), bh = 5 + Math.floor(r() * 16); S.rect(x, hz + 10 - bh, bw, FY - (hz + 10 - bh), fm, 1.2, { e: 255 }); for (let k = 0; k < bw * bh / 14; k++) if (r() < 0.5) S.px(x + 1 + Math.floor(r() * (bw - 2)), hz + 12 - bh + Math.floor(r() * (bh - 2)), 'lamp', 8, { e: 255 }); x += bw + Math.floor(r() * 2); } }
  if (far === 'sea') S.vgrad(0, hz + 6, W, FY - hz - 6, 'water', 2.2, 3.6, { e: 255 });
  // ground (the floor rows)
  const fl = o.floor || 'grass';
  if (fl === 'grass') { S.rect(0, FY, W, H - FY, 'leaf', 3); S.noise(0, FY, W, H - FY, 1, 3, 71); for (let x = 0; x < W; x++) { S.px(x, FY, 'leaf', 5 + (x * 7 % 3)); if (r() < 0.3) S.px(x, FY - 1, 'leaf', 4 + r() * 2); } }
  else if (fl === 'sand') { S.rect(0, FY, W, H - FY, 'sand', 6); S.noise(0, FY, W, H - FY, 1, 4, 72); }
  else if (fl === 'snow') { S.rect(0, FY, W, H - FY, 'ice', 8); S.noise(0, FY, W, H - FY, 1, 5, 73); }
  else if (fl === 'stone') { X.TX.ashlar(S, 0, FY, W, H - FY, 'stone', 5, { bh: 5, bw: 16, crack: 0.1 }); }
  else if (fl === 'water') { S.vgrad(0, FY, W, H - FY, 'water', 4, 2.4); }
  else { S.rect(0, FY, W, H - FY, 'earth', 5); S.noise(0, FY, W, H - FY, 1, 3, 74); }
};
// twinkling stars (anim): a few stars flare and fade
X.twinkle = function (D, t, n, hz, seed) { const r = X.rng(seed || 5); for (let i = 0; i < (n || 8); i++) { const x = Math.floor(r() * W), y = Math.floor(r() * (hz || 50)), a = Math.sin(t * (1.3 + r() * 2) + r() * 7); if (a > 0.55) { D.px(x, y, 'linen', 10, { e: 255 }); if (a > 0.85) { D.px(x - 1, y, 'linen', 7, { e: 255 }); D.px(x + 1, y, 'linen', 7, { e: 255 }); D.px(x, y - 1, 'linen', 7, { e: 255 }); D.px(x, y + 1, 'linen', 7, { e: 255 }); } } } };
// moonlit water band (anim): rolling highlight dashes over rows y0…y1, brighter under the moon's x
X.sea = function (D, t, y0, y1, mx) { for (let y = y0; y < y1; y++) { const k = (y - y0) / Math.max(1, y1 - y0); for (let x = 0; x < W; x += 1) { const w = Math.sin(x * 0.45 - t * 1.6 + y * 1.3) + Math.sin(x * 0.17 + t * 0.9 - y * 0.7); if (w > 1.35) D.px(x, y, 'water', 7 + (mx != null && Math.abs(x - mx) < 10 + k * 16 ? 3 : 0) + k, { e: 255 }); } } };

// ───────── the rock around the base (three variants, static) ─────────
function rockPaint(S, v) {
  S.lay('wall'); const r = S.r;
  for (let y = 0; y < H; y++) { const band = Math.round(Math.sin(y * 0.16 + v * 2.1) * 0.8 + (vnoise(v, y * 0.07, v) - 0.5) * 3); for (let x = 0; x < W; x++) S.px(x, y, 'rock', 4 + band); }
  S.noise(0, 0, W, H, 1, 4, v * 7 + 1); S.noise(0, 0, W, H, 1, 1.6, v * 7 + 2);
  for (let i = 0; i < 30; i++) { const cx = r() * W, cy = r() * H, rx = 2.5 + r() * 8, ry = rx * (0.5 + r() * 0.35); S.beg(); S.ell(cx, cy, rx, ry, 'rock', 5 + Math.round(r() * 3), { dome: 1 }); S.end(); }
  for (let i = 0; i < 7; i++) TX.crack(S, Math.floor(r() * W), Math.floor(r() * H), 6 + Math.floor(r() * 14), 'rock', 5, r() < 0.5 ? 'v' : 'h');
  for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H; S.px(x, y, 'rock', 9, { n: [-0.6, -0.6] }); if (r() < 0.3) S.px(x + 1, y, 'rock', 7); }
  for (let i = 0; i < 4; i++) { const x = r() * W, y = r() * H; S.px(x, y, 'stone', 9); S.px(x + 1, y + 1, 'stone', 7); }
}
[0, 1, 2].forEach(v => X.def('_rock' + v, { noFrame: 1, noFloor: 1, amb: [0.5, 0.42], paint: (S) => rockPaint(S, v + 1) }));
const rockC = {};
X.rock = (v) => rockC[v] || (rockC[v] = (() => { const src = X.snapshot('_rock' + v, 0), c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(src, 0, 0); return c; })());

// ───────── a dug-out room: hewn rock, mine timbers, a bulb on a cord that swings ─────────
// the bulb's light is five fixed samples along its arc, crossfaded by the swing (cheap, and still moves the shadows)
const ARC = [-0.34, -0.17, 0, 0.17, 0.34], CORD = 26, PIV = [75, 9];
X.def('_empty', {
  amb: [0.3, 0.26],
  paint(S, sc) {
    S.lay('wall'); rockPaint(S, 9); S.noise(0, 0, W, FY, 1, 3, 91);
    const r = S.r; for (let i = 0; i < 40; i++) { const x = 8 + r() * (W - 16), y = 12 + r() * (FY - 20); S.px(x, y, 'rock', 2); S.px(x + 1, y + 1, 'rock', 7); }   // pick marks
    S.rect(0, FY, W, H - FY, 'earth', 4); S.noise(0, FY, W, H - FY, 1, 2.5, 92);
    // timbers: two posts, a lintel, braces
    [[12, 6], [W - 18, 6]].forEach(([x]) => { S.beg(); S.box(x, 9, 6, FY - 9, 'wood', 4.5); S.end(); });
    S.beg(); S.box(6, 5, W - 12, 5, 'wood', 5); S.end();
    [[18, 10, 30, 22], [W - 18, 10, W - 30, 22]].forEach(([a, b, c, d]) => { S.beg(); S.line(a, b, c, d, 'wood', 4, { w: 2 }); S.end(); });
    // rubble, a leaning pick, a crate
    for (let i = 0; i < 14; i++) { const x = 24 + r() * 100, s2 = 1.5 + r() * 3; S.beg(); S.ell(x, FY + 1 - s2 * 0.3, s2, s2 * 0.65, 'rock', 6 + r() * 2, { dome: 1 }); S.end(); }
    S.lay('mid'); S.beg(); S.line(112, FY - 1, 121, FY - 22, 'wood', 6, { w: 1 }); S.poly([[116, FY - 22], [127, FY - 25], [126, FY - 23], [118, FY - 20]], 'iron', 7); S.end();
    S.beg(); S.box(26, FY - 10, 13, 10, 'wood', 5, { top: 2 }); S.hl(26, FY - 6, 13, 'wood', 3); S.end();
    // cobwebs in the top corners
    S.lay('front'); [[18, 10, 1], [W - 19, 10, -1]].forEach(([x, y, d]) => { for (let k = 0; k < 7; k++) S.px(x + k * d, y + k, 'linen', 6); for (let k = 0; k < 5; k++) S.px(x + k * d + 3 * d, y, 'linen', 5); S.px(x + 2 * d, y + 4, 'linen', 5); S.px(x + 4 * d, y + 2, 'linen', 5); });
    ARC.forEach((a, i) => sc.light({ x: PIV[0] + Math.sin(a) * CORD, y: PIV[1] + Math.cos(a) * CORD + 2, z: 16, r: 92, i: 1.05, c: '#ffcf8a', fl: 'candle', ph: 1.1, tint: 0.35, bake: false }));
  },
  anim(D, t, rs) {
    const a = Math.sin(t * 1.1) * 0.3 + Math.sin(t * 2.7) * 0.03, bx = PIV[0] + Math.sin(a) * CORD, by = PIV[1] + Math.cos(a) * CORD;
    // crossfade the five arc samples
    const f = (a - ARC[0]) / (ARC[1] - ARC[0]); ARC.forEach((_, i) => { rs.mul[i] = Math.max(0, 1 - Math.abs(f - i)); });
    D.lay('mid'); D.beg(); D.line(PIV[0], PIV[1], bx, by - 2, 'hair', 2); D.rect(bx - 1, by - 3, 3, 2, 'iron', 6); D.end({ none: 1 });
    D.rect(bx - 1, by - 1, 3, 3, 'lamp', 9, { e: 255 }); D.px(bx, by, 'lamp', 11, { e: 255 }); D.px(bx, by + 2, 'lamp', 8, { e: 255 });
    // a moth circling the bulb
    const ma = t * 3.1, mx = bx + Math.cos(ma) * 7, my = by + Math.sin(ma * 1.3) * 4; D.px(mx, my, 'paper', Math.sin(t * 30) > 0 ? 8 : 5);
    if (Math.random() < 0.02) rs.burst('dust', bx + (Math.random() - 0.5) * 30, by + 5, 1, { life: 3, sp: 2 });
  },
});

// special terrain cells and the undiscovered vein, when a pixel version exists (PXR.def('_tile_<kind>') / PXR.def('_vein')):
// drawn like rooms (no frame), and they still light the dark around them the way the old art did
X.tileCell = function (ctx, key, X0, Y0, t, lights, id, zoom) { const T = M.TILES[key]; X.draw(ctx, X0, Y0, '_tile_' + key, t, {}, 'tile:' + id, zoom); const pu = 0.5 + 0.5 * Math.sin(t * 2 + X0 * 0.01); if (lights && T) lights.push({ x: X0 + 150, y: Y0 + 105, r: 170 + 30 * pu, c: T.c, f: 0.55 + 0.25 * pu }); };
X.veinCell = function (ctx, X0, Y0, t, lights, id, zoom) { X.draw(ctx, X0, Y0, '_vein', t, {}, 'vein:' + id, zoom); if (lights) lights.push({ x: X0 + 150, y: Y0 + 105, r: 140, c: '#cfc6ff', f: 0.45 + 0.15 * Math.sin(t * 2) }); };
// clicking a room focuses it: the room answers with a flash and a pop
if (M.BaseView) { const of = M.BaseView.prototype.focus; M.BaseView.prototype.focus = function (c, r) { of.call(this, c, r); X.poke(c + ',' + r, 'sel'); }; }
})();
