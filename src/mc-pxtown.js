// ==== mc-pxtown.js ====
(function () {
// Pixel town (user ruling 2026-09-28: 「基地内城镇还是老的演示效果……需要与我们做的局内小游戏的风格和水平拉平……升级不同基地，表演效果
// 也不同，反馈也不同」). Every building on the surface becomes a pixel room of its own (mc-pxroom.js, drawn the way the main base
// is: see-through canvas, no frame, no floor), so it has the rooms' ramps, lights that flicker every frame, glowing
// windows, particles, smoke, fire. It wears what its room underground holds (the smithy's forge, the hospital's teal
// and cross, the altar's violet flame) in the same materials.
// Pixel size is the same everywhere: one art px = 2 world units, on every street. A back street is not a shrunk picture:
// each street paints the building again at its own size (its footprint × the street's scale), fixed-size details
// (bricks, windows, a sign) and proportional layout, so far buildings are smaller with fewer bricks, never blurred.
// Stages: the city's 繁荣 level upgrades every building (Lv3 → stage 1, Lv5 → stage 2): it grows parts, trim, light.
// Shows: rising (a pause with the ground cracking, the climb, a slam, then its own flourish) and upgrading (charge,
// pop to the new look, its own flourish), bigger by quality and stage, each with its sound on the beats.
// Pilot (2026-09-28): six buildings behind a switch (?pxtown=1 or M.DEV.pxtown), off until the whole town is done.
const M = window.MC, X = M.PXR; if (!X) return;
const { TX, n1 } = X;
const cl = (v, a, b) => (v < a ? a : v > b ? b : v), R = Math.random;
const steps = (t, per) => ((t % per) + per) % per / per;
const eo = (q) => 1 - Math.pow(1 - q, 3), eob = (q) => { const c = 1.9; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);
const PT = M.PXTOWN = { force: null, stageForce: null };
PT.on = function () {
  if (PT.force != null) return !!PT.force;
  try { return !!(M.DEV && M.DEV.pxtown) || (typeof location !== 'undefined' && /[?&]pxtown=1\b/.test(location.search || '')); } catch (e) { return false; }
};
// the city's level → each building's stage (0 plain · 1 grown · 2 finest)
const stageOf = PT.stageOf = (m) => { if (PT.stageForce != null) return PT.stageForce; const lv = m && M.prosLv ? M.prosLv(m) : 1; return lv >= 5 ? 2 : lv >= 3 ? 1 : 0; };

// ───────── shared bits (art px; canvas x right, y down; G.gy = the street row, G.L … G.R = the footprint) ─────────
function fireSim(st, w, h, t, heat, cool) {
  if (!st.f || st.f.length !== w * h) { st.f = new Uint8Array(w * h); st.ft = t - 1; }
  const f = st.f; let n = Math.min(4, Math.floor((t - st.ft) * 30)); if (n < 0) { st.ft = t; n = 0; } st.ft += n / 30;
  while (n-- > 0) {
    for (let x = 0; x < w; x++) { const edge = Math.min(x, w - 1 - x); f[(h - 1) * w + x] = edge < 1 ? 0 : cl(Math.round(36 * heat * (0.85 + R() * 0.15) - (edge < 2 ? 6 : 0)), 0, 36); }
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) { const s = y * w + x, v = f[s]; if (!v) { f[s - w] = 0; continue; } const r = Math.floor(R() * 4), d = cl(x - r + 1, 0, w - 1); f[(y - 1) * w + d] = Math.max(0, v - (r & 1) - (R() < (cool == null ? 0.4 : cool) ? 1 : 0)); }
  }
  return f;
}
function drawFire(D, f, w, h, x0, y0, m) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f[y * w + x]; if (v < 4) continue; D.px(x0 + x, y0 + y, m || 'fire', cl(v / 36 * 11.5, 1, 11), { e: 255 }); } }
function flame(D, x, y, s, t, ph, m) {
  const hh = Math.round(s * (0.8 + 0.25 * n1(t * 9 + ph))), sw = Math.round(n1(t * 5 + ph * 2) * 0.8);
  for (let k = 0; k < hh; k++) { const q = k / hh, w = Math.max(1, Math.round((1 - q * q) * s * 0.45)), cx = x + Math.round(sw * q); for (let i = -w + 1; i < w; i++) D.px(cx + i, y - k, m || 'fire', cl(11 - q * 6 - Math.abs(i) * 2.2, 3, 11), { e: 255 }); }
}
// cobbled plinth under the footprint
function plinth(S, G, m) { S.lay('wall'); S.beg(); S.box(G.L - 1, G.gy, G.w + 2, 2, m || 'stone', 5, { top: 1 }); for (let x = G.L; x < G.R; x += 3) S.px(x, G.gy + 1, m || 'stone', 3); S.end(); }
// a window: frame, glass that glows with its own light (flickers), a mullion, a sill
function win(S, sc, x, y, w, h, o) {
  o = o || {}; const lit = o.lit !== false, gm = o.glass || 'lamp';
  const li = lit ? sc.light({ x: x + w / 2, y: y + h / 2, z: 7, r: o.r || 12 + w, i: o.i || 0.55, c: o.c || '#ffb060', fl: o.fl || 'candle', ph: x * 0.7 + y, tint: 0.5 }) : -1;
  S.beg(); S.rect(x - 1, y - 1, w + 2, h + 2, o.fm || 'wood', o.ft || 3);
  for (let k = 0; k < h; k++) S.rect(x, y + k, w, 1, lit ? gm : 'glass', lit ? cl(9 - Math.floor(k / h * 3), 6, 10) : 3, lit ? { e: li + 1 } : null);
  if (w >= 4) S.vl(x + (w >> 1), y, h, o.fm || 'wood', 4); if (h >= 5) S.hl(x, y + (h >> 1), w, o.fm || 'wood', 4);
  if (o.sill !== false) S.hl(x - 1, y + h + 1, w + 2, 'stone', 7, { n: [0, -0.8] });
  S.end(); return li;
}
// a gable roof of tile rows, ridge lit, eaves in shade
function gable(S, x, y, w, rh, m, t) {
  S.beg(); const cx = x + w / 2;
  for (let k = 0; k <= rh; k++) { const yy = y - k, hw = Math.max(0, (w / 2 + 1) * (1 - k / (rh + 0.5))); if (hw < 0.5) continue;
    S.rect(cx - hw, yy, hw, 1, m, t + (k % 3 === 0 ? -1.5 : 0.8), { n: [-0.5, -0.6] }); S.rect(cx, yy, hw, 1, m, t - 1 + (k % 3 === 0 ? -1.5 : 0), { n: [0.5, -0.6] }); }
  S.hl(x - 1, y, w + 2, m, t - 2.5); S.end();
}
function door(S, x, y, w, h, m) { S.beg(); S.rect(x, y, w, h, m || 'wood', 3); for (let i = 1; i < w; i += 2) S.vl(x + i, y + 1, h - 1, m || 'wood', 4.5); S.hl(x, y, w, 'stone', 6); S.px(x + w - 2, y + (h >> 1), 'brass', 9); S.end(); }
function banner(S, x, y, w, h, m, t, icon) { S.beg(); S.rect(x, y, w, h, m, t); S.vl(x, y, h, m, t + 1.5); S.vl(x + w - 1, y, h, m, t - 1.5); S.px(x + (w >> 1), y + h, m, t - 1); S.hl(x - 1, y - 1, w + 2, 'wood', 5); if (icon) icon(S, x + (w >> 1), y + (h >> 1)); S.end(); }
// icons (5–7 px) for signs, banners and the building-site fence
const ICON = {
  anvil(S, x, y) { S.hl(x - 2, y - 1, 5, 'iron', 9); S.hl(x - 1, y, 3, 'iron', 7); S.hl(x - 2, y + 1, 5, 'iron', 6); },
  cross(S, x, y) { S.vl(x, y - 2, 5, 'red', 9, { e: 255 }); S.hl(x - 2, y, 5, 'red', 9, { e: 255 }); },
  flame(S, x, y) { S.px(x, y - 2, 'arcane', 10, { e: 255 }); S.hl(x - 1, y - 1, 3, 'arcane', 8, { e: 255 }); S.hl(x - 1, y, 3, 'arcane', 7, { e: 255 }); S.px(x, y + 1, 'arcane', 6, { e: 255 }); },
  bolt(S, x, y) { S.line(x + 1, y - 2, x - 1, y, 'lamp', 10, { e: 255 }); S.line(x - 1, y, x + 1, y, 'lamp', 10, { e: 255 }); S.line(x + 1, y, x - 1, y + 2, 'lamp', 10, { e: 255 }); },
  arrow(S, x, y) { S.line(x - 2, y + 2, x + 2, y - 2, 'wood', 8); S.px(x + 2, y - 2, 'iron', 10); S.px(x + 1, y - 2, 'iron', 9); S.px(x + 2, y - 1, 'iron', 9); },
  sun(S, x, y) { S.ell(x + 0.5, y + 0.5, 1.6, 1.6, 'gold', 9, { e: 255 }); [[0, -3], [0, 3], [-3, 0], [3, 0]].forEach(([a, b]) => S.px(x + a, y + b, 'gold', 8, { e: 255 })); },
};

// ───────── the six pilot buildings ─────────
// each: mat (its main wall material, for the building site), icon, paint(S, sc, G), anim(D, t, s, o, G), show(s, o, G) —
// o.show = { k: 'rise' | 'up', a: seconds since the landing / the pop, q: 0…3 (quality), st }
const once = (s, o, id, at) => { const k = o.show.id + ':' + id; if (o.show.a >= at && !s.st[k]) { s.st[k] = 1; return true; } return false; };
const ART = PT.ART = {};

// 铁匠铺: stone ground storey with the forge's arched mouth, timber-framed upper storey, red tiles, a brick chimney;
// the anvil at the door. 1: an iron stack spitting sparks, a dormer, a tool rack. 2: a foundry: brass ridge, a cupola, an anvil banner, lanterns
ART.smithy = {
  mat: 'mstone', icon: 'anvil',
  paint(S, sc, G) {
    const { L, gy, w, h, st } = G, bw = Math.round(w * 0.84), x0 = L + Math.round(w * 0.08), t1 = gy - Math.round(h * 0.44), t2 = gy - Math.round(h * 0.7), rh = Math.round(h * 0.3);
    const mw = Math.max(9, Math.round(bw * 0.3)), mx = x0 + 3, mh = Math.round((gy - t1) * 0.7);
    G.forge = { x: mx, y: gy - mh, w: mw, h: mh };
    G.lf = sc.light({ x: mx + mw / 2, y: gy - mh / 2, z: 10, r: 26 + mw, i: 1.35, c: '#ff8a30', fl: 'fire', tint: 0.6 });
    plinth(S, G, 'mstone');
    S.lay('wall'); S.beg(); TX.ashlar(S, x0, t1, bw, gy - t1, 'mstone', 5, { bh: 5 }); S.end();
    // the forge mouth: an arch of brick voussoirs round a black hollow (the fire is animated)
    S.beg(); for (let y = gy - mh; y < gy; y++) for (let x = mx; x < mx + mw; x++) { const u = (x + 0.5 - mx - mw / 2) / (mw / 2), ay = gy - mh + Math.round((mw / 2) * (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 0.8); if (y >= ay) S.px(x, y, 'ink', 1); }
    for (let x = mx - 1; x <= mx + mw; x++) { const u = (x + 0.5 - mx - mw / 2) / (mw / 2 + 1), ay = gy - mh + Math.round((mw / 2) * (1 - Math.sqrt(Math.max(0, 1 - Math.min(1, u * u)))) * 0.8); S.px(x, ay - 1, 'brick', 7 + (x % 2), { n: [0, -0.6] }); S.px(x, ay - 2, 'brick', 4); } S.end();
    // upper storey: plaster between dark beams, with braces
    S.beg(); S.rect(x0 + 1, t2, bw - 2, t1 - t2, 'sand', 8); S.noise(x0 + 1, t2, bw - 2, t1 - t2, 1, 3, 4);
    S.hl(x0, t1 - 1, bw, 'wood', 3); S.hl(x0, t2, bw, 'wood', 4); for (let x = x0; x < x0 + bw; x += 8) { S.vl(x, t2, t1 - t2, 'wood', 4); if (x + 8 < x0 + bw) S.line(x + 1, t1 - 2, x + 7, t2 + 1, 'wood', 3); } S.ao(x0 + 1, t2 + 1, bw - 2, 3, 't', 2); S.end();
    win(S, sc, x0 + Math.round(bw * 0.62), t2 + 3, 5, Math.max(4, t1 - t2 - 7));
    // chimney then roof
    const chx = x0 + Math.round(bw * 0.72); S.beg(); TX.bricks(S, chx, t2 - rh - (st >= 2 ? 10 : 6), 6, rh + 6, 'brick', 5, { bw: 4, bh: 2, v: 1 }); S.box(chx - 1, t2 - rh - (st >= 2 ? 11 : 7), 8, 2, 'mstone', 6); S.end();
    sc.emit({ k: 'steam', x: chx + 3, y: t2 - rh - (st >= 2 ? 12 : 8), rate: 1.6, sp: 5, ang: 0.2, spread: 0.5, life: 2.6, w: 2 });
    gable(S, x0 - 2, t2, bw + 4, rh, 'brick', 5);
    if (st >= 2) { S.beg(); S.hl(x0 + bw / 2 - rh * 0.3, t2 - rh, Math.max(3, rh * 0.6), 'brass', 9); S.end(); S.beg(); S.box(x0 + bw / 2 - 3, t2 - rh - 5, 6, 5, 'copper', 6, { top: 1 }); S.px(x0 + bw / 2, t2 - rh - 7, 'gold', 9); S.end(); }
    // door to the right of the forge, the anvil at it, a sign on a bracket
    const dx = mx + mw + Math.max(3, Math.round(bw * 0.12)); door(S, dx, gy - Math.round((gy - t1) * 0.72), 6, Math.round((gy - t1) * 0.72));
    S.beg(); S.hl(dx + 7, t1 + 2, 5, 'iron', 6); S.vl(dx + 11, t1 + 3, 2, 'iron', 5); S.box(dx + 8, t1 + 5, 7, 5, 'wood', 6); ICON.anvil(S, dx + 11, t1 + 7); S.end();
    S.lay('front'); S.beg(); S.cyl(dx + 9, gy - 3, 5, 3, 'wood', 5, { rim: 2 }); S.hl(dx + 8, gy - 5, 8, 'iron', 8, { n: [0, -0.8] }); S.hl(dx + 9, gy - 4, 5, 'iron', 5); S.px(dx + 7, gy - 5, 'iron', 7); S.end();
    S.beg(); S.cyl(x0 + bw - 5, gy - 6, 5, 6, 'wood', 5, { rim: 2 }); S.hl(x0 + bw - 5, gy - 4, 5, 'iron', 5); S.hl(x0 + bw - 4, gy - 6, 3, 'water', 6); S.end();
    G.anvil = { x: dx + 11, y: gy - 6 };
    if (st >= 1) {
      // an iron stack at the left, its rim glowing
      const sx = x0 - 1, sh = rh + (st >= 2 ? 18 : 12); S.lay('back'); S.beg(); S.cyl(sx, t2 - sh + 4, 4, sh, 'iron', 5, { rim: 2 }); for (let y = t2 - sh + 8; y < t2 + 4; y += 5) S.hl(sx, y, 4, 'iron', 7); S.hl(sx - 1, t2 - sh + 4, 6, 'fire', 8, { e: 255 }); S.end();
      G.stack = { x: sx + 2, y: t2 - sh + 3 };
      sc.emit({ k: 'ember', x: sx + 2, y: t2 - sh + 3, rate: st >= 2 ? 3 : 1.5, sp: 12, ang: 0, spread: 0.6, life: 1.4, w: 2 });
      // a dormer on the roof
      S.lay('wall'); const drx = x0 + Math.round(bw * 0.3); S.beg(); S.rect(drx, t2 - Math.round(rh * 0.55), 7, Math.round(rh * 0.55), 'linen', 5); S.end(); win(S, sc, drx + 2, t2 - Math.round(rh * 0.55) + 2, 3, 3, { sill: false });
      gable(S, drx - 1, t2 - Math.round(rh * 0.55), 9, 3, 'brick', 6);
      // tongs and hammers on a rack by the door
      S.lay('back'); S.beg(); S.hl(x0 + bw - 12, t1 + 3, 6, 'wood', 5); [0, 2, 4].forEach(i => S.vl(x0 + bw - 11 + i, t1 + 4, 4, 'iron', 6 - i * 0.5)); S.end();
    }
    if (st >= 2) {
      S.lay('back'); banner(S, x0 + Math.round(bw * 0.12), t2 + 2, 5, t1 - t2 - 2, 'crimson', 6, (S2, x, y) => ICON.anvil(S2, x, y));
      [x0 - 2, x0 + bw + 1].forEach((lx, i) => { const li = sc.light({ x: lx, y: t1 + 3, z: 8, r: 16, i: 0.7, c: '#ffc070', fl: 'candle', ph: i * 3, tint: 0.5 }); S.beg(); S.hl(lx - 1, t1, 3, 'iron', 5); S.rect(lx - 1, t1 + 1, 3, 3, 'lamp', 9, { e: li + 1 }); S.hl(lx - 1, t1 + 4, 3, 'iron', 4); S.end(); });
    }
  },
  anim(D, t, s, o, G) {
    const st = s.st, f = G.forge, heat = 0.75 + (st.roar || 0) * 0.5;
    const ff = fireSim(st, f.w - 2, Math.max(4, f.h - 2), t, heat, 0.45); drawFire(D, ff, f.w - 2, Math.max(4, f.h - 2), f.x + 1, f.y + 2);
    st.roar = Math.max(0, (st.roar || 0) - 0.02);
    // the smith's hammer at the door: a flash on each blow and a spray of sparks off the anvil
    const hp = steps(t, 1.3); if (hp < 0.08 && !st.hit) { st.hit = 1; s.flash(G.lf, 0.35); s.burst('spark', G.anvil.x, G.anvil.y, 5, { sp: 26, ang: 0, spread: 2.2, life: 0.6, floor: G.gy - 1 }); } if (hp > 0.5) st.hit = 0;
  },
  show(s, o, G) {
    const q = o.show.q, n = 1 + (o.show.st || 0);
    if (once(s, o, 'w', 0)) { s.st.roar = 1.4; s.flash(G.lf, 2); s.burst('ember', G.forge.x + G.forge.w / 2, G.forge.y, 18 + q * 6, { sp: 30, ang: 0, spread: 1.4, life: 1.6, w: G.forge.w }); }
    [0.2, 0.5, 0.8].forEach((at, i) => { if (once(s, o, 'c' + i, at)) { s.flash(G.lf, 1 + i * 0.4); s.burst('spark', G.anvil.x, G.anvil.y, 10 + i * 6 + q * 4, { sp: 44 + i * 10, ang: 0, spread: 2.6, life: 0.9, floor: G.gy - 1 }); if (G.stack) s.burst('ember', G.stack.x, G.stack.y, 8 * n, { sp: 26, ang: 0, spread: 0.8, life: 1.5 }); } });
  },
  sfx: (d, q, k) => { hiss(0.5, 0.1, 900, d); [0.2, 0.5, 0.8].forEach((a, i) => clang(d + a, 1 + i * 0.12 + q * 0.04)); },
  col: '#ff9a3c',
};

// 医院: a clean white block with teal bands, rows of cool windows, a glass entrance, the red cross glowing on the roof.
// 1: a taller wing with an antenna and its red beacon. 2: a glass dome of green light on the roof, healing motes rising
ART.hospital = {
  mat: 'linen', icon: 'cross',
  paint(S, sc, G) {
    const { L, gy, w, h, st } = G, bw = Math.round(w * 0.78), x0 = L + Math.round(w * 0.04), top = gy - Math.round(h * 0.66);
    plinth(S, G, 'stone'); S.lay('wall');
    const wx = x0 + bw - 2, wt = gy - Math.round(h * (st >= 1 ? 0.9 : 0.74)), ww = w - bw - Math.round(w * 0.06) + 2;
    S.beg(); TX.panels(S, wx, wt, ww, gy - wt, 'linen', 6, { pw: 8, ph: 6, v: 1 }); S.box(wx - 1, wt - 1, ww + 2, 2, 'teal', 6); S.end();
    for (let y = wt + 4; y < gy - 6; y += 6) win(S, sc, wx + 2, y, ww - 4, 3, { glass: 'teal', c: '#8af0e0', fl: 'screen', fm: 'scifi', ft: 5, sill: false });
    S.beg(); TX.panels(S, x0, top, bw, gy - top, 'linen', 7, { pw: 10, ph: 7, v: 1 }); S.box(x0 - 1, top - 2, bw + 2, 3, 'linen', 8, { top: 1 }); S.end();
    const fl = Math.max(2, Math.floor((gy - top - 10) / 8));
    for (let k = 0; k < fl; k++) { const y = top + 3 + k * 8; S.beg(); S.hl(x0, y + 6, bw, 'teal', 6); S.end(); for (let x = x0 + 3, j = 0; x + 4 < x0 + bw - 2; x += 7, j++) { const on = X.rng(k * 31 + j * 7 + 3)() < 0.7; win(S, sc, x, y, 4, 4, { lit: on, glass: (j + k) % 3 ? 'ice' : 'lamp', c: (j + k) % 3 ? '#c8f0ff' : '#ffd890', fl: 'screen', fm: 'scifi', ft: 6, i: 0.55, sill: false }); } }
    // the entrance: glass doors that glow teal, a canopy, the cross above it
    const ex = x0 + Math.round(bw / 2) - 5, li = sc.light({ x: ex + 5, y: gy - 4, z: 10, r: 26, i: 0.9, c: '#6ae0c8', fl: 'screen', tint: 0.5 });
    S.beg(); S.rect(ex, gy - 8, 10, 8, 'teal', 8, { e: li + 1 }); S.vl(ex + 5, gy - 8, 8, 'scifi', 6); S.hl(ex, gy - 8, 10, 'teal', 10, { e: li + 1 }); S.end();
    S.lay('back'); S.beg(); S.box(ex - 3, gy - 11, 16, 2, 'scifi', 7, { top: 1 }); S.end();
    // the cross on the roof, glowing
    G.lc = sc.light({ x: x0 + bw / 2, y: top - 6, z: 10, r: 30, i: 1, c: '#ff5a60', fl: 'pulse', amp: 0.12, sp: 2, tint: 0.5 });
    const cx = x0 + Math.round(bw / 2), cy = top - 7; G.cross = { x: cx, y: cy };
    if (st >= 1) { const ln = sc.light({ x: x0 + bw / 2, y: top - 1, z: 6, r: bw * 0.6, i: 0.5, c: '#6ae0c8', fl: 'screen', tint: 0.5 }); S.beg(); S.hl(x0, top - 1, bw, 'teal', 10, { e: ln + 1 }); S.end(); }
    S.lay('wall'); S.beg(); S.box(cx - 5, cy - 5, 11, 11, 'linen', 9); S.rect(cx - 1, cy - 4, 3, 9, 'red', 9, { e: G.lc + 1 }); S.rect(cx - 4, cy - 1, 9, 3, 'red', 9, { e: G.lc + 1 }); S.end();
    if (st >= 1) {
      const ax = wx + (ww >> 1); S.beg(); S.vl(ax, wt - 12, 11, 'iron', 7); S.hl(ax - 2, wt - 8, 5, 'iron', 6); S.end(); G.beacon = { x: ax, y: wt - 13 };
      G.lb = sc.light({ x: ax, y: wt - 13, z: 8, r: 14, i: 0.1, c: '#ff4040', tint: 0.4 });
    }
    if (st >= 2) {
      // a glass dome with plants under it on the left of the roof
      const dx = x0 + Math.round(bw * 0.22), dr = Math.max(5, Math.round(bw * 0.15)), ld = sc.light({ x: dx, y: top - dr / 2, z: 8, r: dr * 3, i: 0.8, c: '#78dc72', fl: 'pulse', amp: 0.1, sp: 1.2, tint: 0.55 });
      S.beg(); S.ell(dx, top - 1, dr, dr, 'glass', 6, { dome: 1 }); for (let i = -dr + 2; i < dr - 1; i += 2) S.vl(dx + i, top - 3 - ((i * 3) & 3), 3, 'screen', 6, { e: ld + 1 }); S.hl(dx - dr, top - 1, dr * 2, 'teal', 7); S.end();
      S.beg(); S.rect(dx - dr, top - 1, dr * 2 + 1, 2, 'teal', 7); S.end();
      sc.emit({ k: 'heal', x: dx, y: top - dr, rate: 1.2, sp: 5, ang: 0, spread: 0.6, life: 1.6, w: dr * 2 });
      banner(S, x0 + 3, top + 3, 4, 10, 'teal', 6, (S2, x, y) => ICON.cross(S2, x, y));
    }
  },
  anim(D, t, s, o, G) {
    if (G.beacon) { const on = steps(t, 1.6) < 0.18; D.lay('front'); D.px(G.beacon.x, G.beacon.y, 'red', on ? 11 : 4, { e: 255 }); s.mul[G.lb] = on ? 9 : 0; }
  },
  show(s, o, G) {
    const q = o.show.q;
    if (once(s, o, 'x', 0)) { s.flash(G.lc, 2.5); s.burst('heal', G.cross.x, G.cross.y, 12 + q * 5, { sp: 18, ang: 0, spread: 3, life: 1.8, w: 6 }); }
    [0.3, 0.6].forEach((at, i) => { if (once(s, o, 'h' + i, at)) { s.flash(G.lc, 1.4); s.burst('heal', G.cx, G.gy - 6, 8 + q * 3, { sp: 14, ang: 0, spread: 1, life: 1.6, w: G.w * 0.8 }); } });
  },
  sfx: (d, q) => { [523, 659, 784, 1047, 1319].slice(0, 3 + Math.min(2, q)).forEach((f, i) => chime(f, d + i * 0.11, 0.07)); chime(1568, d + 0.62, 0.04); },
  col: '#6fe0a0',
};

// 招魂台 (the town's shrine): stone steps, columns under a pediment, the violet flame on the altar, a bell in a small belfry.
// 1: braziers with violet fire, a rose window. 2: a spire with a gold star, rune stones circling, a faint pillar of light
ART.altar = {
  mat: 'stone', icon: 'flame',
  paint(S, sc, G) {
    const { L, R: Rx, cx, gy, w, h, st } = G, bw = Math.round(w * 0.74), x0 = cx - (bw >> 1), top = gy - Math.round(h * 0.52), ph = Math.round(h * 0.14);
    plinth(S, G, 'stone'); S.lay('wall');
    // steps
    S.beg(); for (let k = 0; k < 3; k++) S.box(x0 - 3 + k * 2, gy - 2 - k * 2, bw + 6 - k * 4, 2, 'stone', 6 - k * 0.5, { top: 1 }); S.end();
    // the cella behind the columns (dark, violet glow)
    G.la = sc.light({ x: cx, y: gy - 12, z: 12, r: 34 + bw * 0.3, i: 1.2, c: '#9a7cff', fl: 'fire', tint: 0.6 });
    S.beg(); TX.ashlar(S, x0 + 2, top + 2, bw - 4, gy - top - 8, 'magic', 4, { bh: 4 }); S.end();
    // the altar and its flame (animated)
    S.lay('back'); S.beg(); S.box(cx - 4, gy - 11, 9, 5, 'stone', 7, { top: 1 }); S.hl(cx - 4, gy - 9, 9, 'gold', 8); S.end(); G.fl = { x: cx, y: gy - 13 };
    // columns
    const nc = bw > 40 ? 4 : 3; for (let i = 0; i < nc; i++) { const x = x0 + 1 + Math.round(i * (bw - 5) / (nc - 1)); S.lay('mid'); S.beg(); S.cyl(x, top + 2, 3, gy - top - 8, 'stone', 7, { rim: 2 }); S.box(x - 1, top + 1, 5, 2, 'stone', 8); S.box(x - 1, gy - 7, 5, 1, 'stone', 6); S.end(); }
    // entablature + pediment
    S.lay('wall'); S.beg(); S.box(x0 - 2, top - 2, bw + 4, 4, 'stone', 7, { top: 1 }); S.hl(x0 - 2, top + 1, bw + 4, 'gold', 7); S.end();
    S.beg(); S.poly([[x0 - 3, top - 2], [cx + 0.5, top - 2 - ph], [x0 + bw + 3, top - 2]], 'stone', 6); S.poly([[x0 + 2, top - 3], [cx + 0.5, top - ph], [x0 + bw - 2, top - 3]], 'stone', 4); S.end();
    ICON.sun(S, cx, top - 2 - Math.round(ph * 0.4));
    // belfry with the bell
    const by = top - 2 - ph, bh = Math.round(h * 0.14); S.beg(); S.box(cx - 5, by - bh, 2, bh, 'stone', 7); S.box(cx + 4, by - bh, 2, bh, 'stone', 5); S.poly([[cx - 6, by - bh], [cx + 0.5, by - bh - 5], [cx + 7, by - bh]], 'crimson', 5); S.end();
    G.bell = { x: cx, y: by - bh + 1 };
    if (st >= 1) {
      [x0 - 5, x0 + bw + 4].forEach((bx, i) => { const lb = sc.light({ x: bx, y: gy - 12, z: 10, r: 22, i: 0.8, c: '#b89cff', fl: 'fire', ph: 3 + i, tint: 0.55 }); S.lay('front'); S.beg(); S.vl(bx, gy - 9, 7, 'iron', 5); S.box(bx - 2, gy - 11, 5, 2, 'iron', 6); S.end(); (G.bra = G.bra || []).push({ x: bx, y: gy - 12, li: lb }); });
      const rr = Math.max(2, Math.round(ph * 0.35)), lr = sc.light({ x: cx, y: top - 2 - ph * 0.45, z: 6, r: 16, i: 0.6, c: '#c0a0ff', fl: 'candle', tint: 0.5 });
      S.lay('wall'); S.beg(); S.ell(cx + 0.5, top - 1.5 - ph * 0.42, rr + 1, rr + 1, 'stone', 3); S.ell(cx + 0.5, top - 1.5 - ph * 0.42, rr, rr, 'arcane', 8, { e: lr + 1 }); S.px(cx, top - 2 - Math.round(ph * 0.42), 'gold', 10, { e: 255 }); S.end();
    }
    if (st >= 2) {
      S.lay('wall'); S.beg(); S.poly([[cx - 2, by - bh - 4], [cx + 0.5, by - bh - 16], [cx + 3, by - bh - 4]], 'magic', 7); S.end();
      S.beg(); S.px(cx, by - bh - 18, 'gold', 11, { e: 255 }); S.hl(cx - 1, by - bh - 17, 3, 'gold', 9, { e: 255 }); S.vl(cx, by - bh - 19, 3, 'gold', 9, { e: 255 }); S.end();
    }
    // the pillar of light: a faint one at stage 2, a bright one in a show (G.pillar)
    G.pillar = 0; const Gp = G; sc.shaft({ x: cx, y0: 0, y1: gy - 12, w0: 2, w1: 5, i: 0.9, haze: 0.8, c: '#e0d0ff', f: () => Gp.pillar + (st >= 2 ? 0.25 : 0) });
  },
  anim(D, t, s, o, G) {
    D.lay('back'); flame(D, G.fl.x, G.fl.y, 7, t, 1, 'arcane'); flame(D, G.fl.x - 2, G.fl.y + 1, 4, t, 3, 'arcane'); flame(D, G.fl.x + 2, G.fl.y + 1, 4, t, 5, 'arcane');
    (G.bra || []).forEach((b, i) => { D.lay('front'); flame(D, b.x, b.y, 5, t, i * 2, 'arcane'); });
    // the bell: swings when rung (st.ring), hangs still otherwise
    const rg = s.st.ring || 0, sw = Math.round(Math.sin(t * 9) * rg * 1.6); s.st.ring = Math.max(0, rg - 0.012);
    D.lay('mid'); D.beg(); D.px(G.bell.x, G.bell.y, 'iron', 5); D.poly([[G.bell.x - 2 + sw, G.bell.y + 4], [G.bell.x - 1 + sw * 0.5, G.bell.y + 1], [G.bell.x + 2 + sw * 0.5, G.bell.y + 1], [G.bell.x + 3 + sw, G.bell.y + 4]], 'brass', 7); D.hl(G.bell.x - 2 + sw, G.bell.y + 4, 5, 'brass', 9); D.end();
    if (G.st >= 2) for (let i = 0; i < 3; i++) { const a = t * 0.9 + i * 2.1, x = G.cx + Math.round(Math.cos(a) * G.w * 0.42), y = G.gy - Math.round(G.h * 0.45) + Math.round(Math.sin(a) * 4); D.lay(Math.sin(a) > 0 ? 'front' : 'back'); D.rect(x - 1, y - 1, 2, 3, 'magic', 7); D.px(x, y, 'arcane', 10, { e: 255 }); }
    G.pillar = Math.max(0, G.pillar - 0.01);
  },
  show(s, o, G) {
    const q = o.show.q, a = o.show.a;
    if (a >= 0 && a < 1.6) G.pillar = Math.max(G.pillar, a < 0.15 ? a / 0.15 * 1.6 : 1.6 * (1 - (a - 0.15) / 1.45));
    if (once(s, o, 'b0', 0.05)) { s.st.ring = 1; s.flash(G.la, 2.2); s.burst('soul', G.fl.x, G.fl.y, 10 + q * 5, { sp: 16, ang: 0, spread: 1.6, life: 2, w: 8 }); }
    if (once(s, o, 'b1', 0.75)) { s.st.ring = 1; s.flash(G.la, 1.4); s.burst('glint', G.bell.x, G.bell.y + 2, 4 + q, { sp: 20, ang: 0, spread: 6.3, life: 0.6 }); }
  },
  sfx: (d, q) => { bell(d + 0.05, 1 + q * 0.1); bell(d + 0.75, 0.8 + q * 0.1); },
  col: '#b89cff',
};

// 蒸汽工坊: a brick shed under a sawtooth roof, a riveted copper boiler with its firebox, the flywheel through an arched
// window, brass pipes and a gauge, the iron stack. 1: a second stack, a pole of humming bulbs. 2: two coils on the roof arcing
ART.generator = {
  mat: 'brick', icon: 'bolt',
  paint(S, sc, G) {
    const { L, gy, w, h, st } = G, bx = L + Math.round(w * 0.3), bw = Math.round(w * 0.64), top = gy - Math.round(h * 0.6);
    plinth(S, G, 'stone'); S.lay('wall');
    S.beg(); TX.bricks(S, bx, top, bw, gy - top, 'brick', 5, { bw: 5, bh: 3, v: 1.1 }); S.end();
    // sawtooth roof
    S.beg(); const nT = Math.max(2, Math.round(bw / 12)), tw = bw / nT; for (let i = 0; i < nT; i++) { const a = bx + i * tw; S.poly([[a, top], [a + tw, top], [a + tw, top - 7]], 'iron', 5); S.vl(Math.round(a + tw) - 1, top - 6, 6, 'glass', 7); } S.hl(bx - 1, top, bw + 2, 'iron', 3); S.end();
    // arched window with the flywheel behind it (animated)
    const wr = Math.max(5, Math.round(Math.min(bw * 0.2, (gy - top) * 0.3))), wx = bx + Math.round(bw * 0.62), wy = gy - wr - 6;
    G.lw = sc.light({ x: wx, y: wy, z: 4, r: wr * 3, i: 0.8, c: '#ffc070', fl: 'buzz', tint: 0.5 });
    S.beg(); S.ell(wx + 0.5, wy + 0.5, wr + 1, wr + 1, 'stone', 6); S.ell(wx + 0.5, wy + 0.5, wr, wr, 'lamp', 5, { e: G.lw + 1 }); S.end(); G.wheel = { x: wx, y: wy, r: wr - 1 };
    door(S, bx + 4, gy - 10, 7, 10, 'iron');
    // the boiler on the left, the firebox under it
    const kx = L + 2, kw = Math.round(w * 0.3), kh = Math.round(h * 0.38), ky = gy - kh - 5;
    G.lf = sc.light({ x: kx + kw / 2, y: gy - 3, z: 10, r: 24, i: 1.1, c: '#ff8a30', fl: 'fire', tint: 0.55 });
    S.lay('back'); S.beg(); S.hcyl(kx, ky, kw, kh, 'copper', 6, { rim: 2 }); for (let x = kx + 2; x < kx + kw; x += 4) { TX.rivet(S, x, ky + 1, 'copper', 8); TX.rivet(S, x, ky + kh - 2, 'copper', 5); } S.ell(kx + 0.5, ky + kh / 2, 1.5, kh / 2, 'copper', 4); S.end();
    S.beg(); S.box(kx + 1, gy - 5, kw - 2, 5, 'iron', 4); S.rect(kx + 3, gy - 4, kw - 6, 3, 'fire', 7, { e: G.lf + 1 }); S.end(); G.fire = { x: kx + 3, y: gy - 4, w: kw - 6 };
    // gauge + pipes
    const gx = kx + (kw >> 1), gy2 = ky - 3, lg = sc.light({ x: gx, y: gy2, z: 6, r: 8, i: 0.4, c: '#fff0b0', tint: 0.3 }); S.beg(); S.ell(gx + 0.5, gy2 + 0.5, 2.5, 2.5, 'brass', 7); S.ell(gx + 0.5, gy2 + 0.5, 1.5, 1.5, 'paper', 9, { e: lg + 1 }); S.end(); G.gauge = { x: gx, y: gy2 };
    S.beg(); S.line(kx + kw, ky + 3, bx + 2, ky + 3, 'brass', 7); S.line(kx + kw - 2, ky, kx + kw - 2, top - 2, 'brass', 6); S.end();
    // the stack
    const sx = bx + bw - 7, sh = Math.round(h * 0.34); S.lay('back'); S.beg(); S.cyl(sx, top - sh, 5, sh, 'iron', 5, { rim: 2 }); S.hl(sx - 1, top - sh, 7, 'iron', 8); S.hl(sx, top - sh + 4, 5, 'brass', 7); S.end();
    sc.emit({ k: 'steam', x: sx + 2.5, y: top - sh - 1, rate: 2.5, sp: 7, ang: 0.3, spread: 0.4, life: 2.4, w: 3 }); G.stk = [{ x: sx + 2.5, y: top - sh - 1 }];
    if (st >= 1) {
      const s2 = bx + Math.round(bw * 0.4), h2 = Math.round(h * 0.26); S.beg(); S.cyl(s2, top - h2 - 4, 4, h2, 'iron', 5, { rim: 2 }); S.hl(s2 - 1, top - h2 - 4, 6, 'iron', 8); S.end();
      sc.emit({ k: 'steam', x: s2 + 2, y: top - h2 - 5, rate: 1.6, sp: 6, ang: 0.3, spread: 0.4, life: 2.2, w: 2 }); G.stk.push({ x: s2 + 2, y: top - h2 - 5 });
      // a pole of bulbs along the street
      const px = G.R + 3, lp = sc.light({ x: px, y: gy - 20, z: 10, r: 18, i: 0.6, c: '#ffe080', fl: 'buzz', ph: 2, tint: 0.5 });
      S.lay('front'); S.beg(); S.vl(px, gy - 22, 22, 'wood', 5); S.hl(px - 3, gy - 21, 7, 'wood', 6); S.end(); S.beg(); S.line(px - 3, gy - 20, bx + bw, top + 4, 'ink', 2); S.end();
      [[px - 3, gy - 19], [px + 3, gy - 19]].forEach(([x, y]) => { S.beg(); S.px(x, y, 'lamp', 10, { e: lp + 1 }); S.px(x, y + 1, 'lamp', 8, { e: lp + 1 }); S.end(); });
    }
    if (st >= 2) {
      G.coils = [bx + Math.round(bw * 0.15), bx + Math.round(bw * 0.62)].map((x, i) => { S.lay('mid'); S.beg(); S.cyl(x, top - 13, 3, 12, 'copper', 6, { rim: 2 }); for (let y = top - 12; y < top - 1; y += 2) S.hl(x, y, 3, 'copper', 8); S.ell(x + 1.5, top - 15, 2.5, 2.5, 'brass', 8, { dome: 1 }); S.end(); return { x: x + 1, y: top - 16 }; });
      G.la = sc.light({ x: (G.coils[0].x + G.coils[1].x) / 2, y: top - 18, z: 10, r: 40, i: 0.2, c: '#9ad8ff', tint: 0.6 });
    }
  },
  anim(D, t, s, o, G) {
    // the flywheel turning behind its window
    const wl = G.wheel, a = t * 2.4; D.lay('wall'); for (let k = 0; k < 4; k++) { const an = a + k * Math.PI / 4; for (let r = -wl.r; r <= wl.r; r++) D.px(wl.x + Math.round(Math.cos(an) * r), wl.y + Math.round(Math.sin(an) * r), 'iron', 3); }
    D.ell(wl.x + 0.5, wl.y + 0.5, wl.r, wl.r, 'iron', 4, { ring: 1 }); D.px(wl.x, wl.y, 'brass', 8);
    // the firebox breathes, the gauge needle quivers
    D.lay('back'); for (let x = 0; x < G.fire.w; x++) D.px(G.fire.x + x, G.fire.y + (n1(t * 6 + x) > 0.3 ? 0 : 1), 'fire', 9 + Math.round(n1(t * 8 + x * 1.7)), { e: 255 });
    const na = -2.2 + 0.4 * n1(t * 3) + (s.st.surge || 0) * 2; D.px(G.gauge.x + Math.round(Math.cos(na) * 1.4), G.gauge.y + Math.round(Math.sin(na) * 1.4), 'red', 7);
    // the relief valve blows now and then
    if (steps(t, 7.5) < 0.02 && !s.st.v) { s.st.v = 1; G.stk.forEach(p => s.burst('steam', p.x, p.y, 5, { sp: 14, ang: 0, spread: 0.5, life: 1.6 })); } if (steps(t, 7.5) > 0.2) s.st.v = 0;
    // arcs between the coils: a jagged line re-drawn a few times a second, flashing the roof
    const zap = s.st.zap || 0; s.st.zap = Math.max(0, zap - 0.03); s.st.surge = Math.max(0, (s.st.surge || 0) - 0.01);
    if (G.coils && (zap > 0 || steps(t, 2.3) < 0.12)) { const [p, q] = G.coils, sd = Math.floor(t * 20); D.lay('front'); let y = p.y; for (let x = p.x; x <= q.x; x++) { y = cl(y + ((X.rng(sd * 97 + x)() * 3) | 0) - 1, p.y - 4, p.y + 2); D.px(x, y, 'ice', 11, { e: 255 }); if (zap > 0.3) D.px(x, y - 1, 'arcane', 9, { e: 255 }); } s.mul[G.la] = 4 + zap * 10; } else if (G.la != null) s.mul[G.la] = 0.2;
  },
  show(s, o, G) {
    const q = o.show.q;
    if (once(s, o, 's', 0)) { s.st.surge = 1; s.flash(G.lw, 2); s.flash(G.lf, 1.6); G.stk.forEach(p => s.burst('steam', p.x, p.y, 10 + q * 4, { sp: 20, ang: 0, spread: 0.7, life: 2 })); s.burst('steam', G.fire.x, G.fire.y - 6, 8, { sp: 16, ang: -1.2, spread: 0.6, life: 1.2 }); }
    [0.25, 0.45, 0.7].forEach((at, i) => { if (once(s, o, 'z' + i, at)) { s.st.zap = 1; s.flash(G.lw, 1.2); s.burst('spark', G.wheel.x, G.wheel.y - G.wheel.r, 6 + q * 2, { sp: 30, ang: 0, spread: 2.4, life: 0.5 }); } });
  },
  sfx: (d, q) => { hiss(0.8, 0.12, 2600, d); [0.25, 0.45, 0.7].forEach((a, i) => zap(d + a, 0.8 + i * 0.15 + q * 0.05)); hum(d + 0.1, 1.2); },
  col: '#9ad8ff',
};

// 弩炮室: a squat stone tower with arrow slits, a timber fighting platform with merlons, the ballista on top, a banner.
// 1: shields on the merlons, a hoarding, a bolt rack. 2: an iron-and-brass ballista, a watch-fire, gold trim
ART.ballista = {
  mat: 'stone', icon: 'arrow',
  paint(S, sc, G) {
    const { cx, gy, w, h, st } = G, tw = Math.round(w * 0.5), x0 = cx - (tw >> 1), top = gy - Math.round(h * 0.62);
    plinth(S, G, 'stone'); S.lay('wall');
    S.beg(); TX.ashlar(S, x0, top, tw, gy - top, 'stone', 6, { bh: 5 }); S.rect(x0 - 1, gy - 5, tw + 2, 5, 'stone', 5); S.end();
    S.beg(); for (let y = top + 5; y < gy - 10; y += 9) [x0 + 4, x0 + tw - 6].forEach(x => { S.rect(x, y, 2, 5, 'ink', 1); S.px(x, y + 5, 'stone', 8); }); S.end();
    door(S, cx - 3, gy - 9, 6, 9);
    const li = sc.light({ x: cx, y: top + 8, z: 8, r: 18, i: 0.6, c: '#ffb060', fl: 'candle', tint: 0.5 }); S.beg(); S.rect(cx - 1, top + 6, 2, 4, 'lamp', 9, { e: li + 1 }); S.end();
    // the fighting platform: beams out over the tower, merlons
    const pw = tw + 12, px = cx - (pw >> 1); S.beg(); S.box(px, top - 3, pw, 3, 'wood', 5, { top: 1 }); for (let x = px + 1; x < px + pw; x += 4) S.line(x, top, x + 2, top + 3, 'wood', 3); S.end();
    S.beg(); for (let x = px; x < px + pw - 2; x += 5) S.box(x, top - 7, 3, 4, 'stone', 7, { top: 1 }); S.end();
    if (st >= 2) { S.beg(); for (let x = px; x < px + pw - 2; x += 5) S.hl(x, top - 7, 3, 'gold', 9); S.end(); }
    if (st >= 1) { S.lay('back'); for (let x = px + 1, i = 0; x < px + pw - 3; x += 10, i++) { S.beg(); S.ell(x + 1.5, top - 1, 2, 2.5, i % 2 ? 'crimson' : 'tile', 6); S.px(x + 1, top - 2, 'gold', 9); S.end(); }
      S.lay('front'); S.beg(); S.box(G.R - 5, gy - 12, 4, 12, 'wood', 5); for (let y = gy - 11; y < gy - 1; y += 3) S.hl(G.R - 7, y, 8, 'iron', 7); S.end(); }
    // the ballista on top (drawn in anim: it cocks and shoots in a show), its mount here
    G.bal = { x: cx, y: top - 10 };
    S.lay('mid'); S.beg(); S.box(cx - 2, top - 8, 5, 5, 'wood', 4); S.end();
    // banner on a pole
    G.flag = { x: px + pw - 1, y: top - 22, c: st >= 2 ? 'gold' : 'crimson' }; S.lay('back'); S.beg(); S.vl(px + pw - 1, top - 22, 19, 'wood', 6); S.px(px + pw - 1, top - 23, 'gold', 9); S.end();
    if (st >= 2) { G.lb = sc.light({ x: px + 1, y: top - 12, z: 10, r: 26, i: 1, c: '#ff9a40', fl: 'fire', tint: 0.55 }); S.lay('mid'); S.beg(); S.box(px - 1, top - 10, 5, 3, 'iron', 6); S.end(); G.brz = { x: px + 1, y: top - 11 }; }
  },
  anim(D, t, s, o, G) {
    // flag: a waving strip, column by column
    const f = G.flag; D.lay('back'); for (let i = 0; i < 9; i++) { const dy = Math.round(Math.sin(t * 5 - i * 0.7) * (i / 9) * 1.6); for (let k = 0; k < 5; k++) D.px(f.x + 1 + i, f.y + k + dy, f.c, (k === 0 ? 8 : k === 4 ? 4 : 6) + (dy < 0 ? 1 : 0)); }
    if (G.brz) { D.lay('mid'); flame(D, G.brz.x, G.brz.y, 6, t, 2); }
    // the ballista: stock along the platform, bow arms bent back by the drawn string (st.draw 0…1), a bolt loaded
    const dr = s.st.draw || 0, b = G.bal, m = G.st >= 2 ? 'iron' : 'wood', am = G.st >= 2 ? 'brass' : 'iron';
    D.lay('mid'); D.beg(); D.hl(b.x - 7, b.y + 2, 15, 'wood', 6); D.hl(b.x - 7, b.y + 3, 15, 'wood', 4);
    const bend = Math.round(dr * 3); D.line(b.x + 4, b.y + 2, b.x + 2 - bend, b.y - 5, m, 7); D.line(b.x + 4, b.y + 3, b.x + 2 - bend, b.y + 9, m, 5); D.px(b.x + 2 - bend, b.y - 6, am, 9); D.px(b.x + 2 - bend, b.y + 10, am, 9);
    const sx = b.x - 2 - Math.round(dr * 4); D.line(b.x + 2 - bend, b.y - 5, sx, b.y + 2, 'linen', 8); D.line(sx, b.y + 2, b.x + 2 - bend, b.y + 9, 'linen', 7);
    if (!s.st.shot) { D.hl(sx, b.y + 1, 12, 'wood', 8); D.px(sx + 12, b.y + 1, 'iron', 10); D.px(sx + 11, b.y, 'iron', 9); D.px(sx + 11, b.y + 2, 'iron', 9); }
    D.end(); if (s.st.shot) s.st.shot = Math.max(0, s.st.shot - 0.01);
  },
  show(s, o, G) {
    const a = o.show.a; s.st.draw = a < 0.55 ? cl(a / 0.5, 0, 1) : Math.max(0, 1 - (a - 0.55) * 8);
    if (once(s, o, 'f', 0.55)) { s.st.shot = 1; s.burst('dust', G.bal.x - 4, G.bal.y + 2, 8, { sp: 16, ang: -1.5, spread: 1, life: 0.8 }); if (G.lb != null) s.flash(G.lb, 1.5); G.fired = o.show.id; }
  },
  sfx: (d, q) => { creak(d, 0.5); thunk(d + 0.55, 1 + q * 0.1); whoosh(d + 0.58, 0.5); },
  col: '#ffcf4a',
};

// 亚历山大灯塔: three stacked tiers of pale stone (square, octagonal, round), a fire bowl at the top with a bronze mirror,
// the beam sweeping the night. 0: two tiers, the fire on the second. 1: the round top tier and the mirror. 2: a gold statue
ART.lighthouse = {
  mat: 'bone', icon: 'sun', padt: 30,
  paint(S, sc, G) {
    const { cx, gy, w, h, st } = G, t1 = gy - Math.round(h * 0.42), t2 = gy - Math.round(h * 0.7), t3 = gy - Math.round(h * 0.84);
    plinth(S, G, 'stone'); S.lay('wall');
    const w1 = Math.round(w * 0.78), w2 = Math.round(w * 0.5), w3 = Math.round(w * 0.32);
    S.beg(); TX.ashlar(S, cx - (w1 >> 1), t1, w1, gy - t1, 'bone', 7, { bh: 6 }); S.box(cx - (w1 >> 1) - 2, t1 - 2, w1 + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = t1 + 7; y < gy - 18; y += 15) [cx - Math.round(w1 * 0.28), cx + Math.round(w1 * 0.28) - 2].forEach(x => win(S, sc, x, y, 3, 6, { i: 0.4, sill: false, fm: 'bone', ft: 4 }));
    door(S, cx - 4, gy - 14, 8, 14);
    S.beg(); for (let x = cx - (w1 >> 1) - 2; x < cx + (w1 >> 1) + 2; x += 4) S.box(x, t1 - 5, 2, 3, 'bone', 8); S.end(); S.beg(); S.hl(cx - (w1 >> 1), t1 + 3, w1, 'gold', 6); S.end();
    const top2 = st >= 1 ? t2 : t2, w2b = w2; S.beg(); for (let y = top2; y < t1 - 2; y++) { S.rect(cx - (w2b >> 1), y, 3, 1, 'bone', 6, { n: [-0.6, 0] }); S.rect(cx - (w2b >> 1) + 3, y, w2b - 6, 1, 'bone', 7.5); S.rect(cx + (w2b >> 1) - 3, y, 3, 1, 'bone', 5, { n: [0.6, 0] }); } S.noise(cx - (w2b >> 1), top2, w2b, t1 - top2, 1, 3, 5); S.box(cx - (w2b >> 1) - 2, top2 - 2, w2b + 4, 3, 'bone', 8, { top: 1 }); S.end();
    for (let y = top2 + 8; y < t1 - 8; y += 16) win(S, sc, cx - 1, y, 3, 6, { i: 0.45, sill: false, fm: 'bone', ft: 4 });
    let fy = top2 - 3;
    if (st >= 1) { S.beg(); S.cyl(cx - (w3 >> 1), t3, w3, top2 - t3 - 2, 'bone', 7, { rim: 2 }); S.box(cx - (w3 >> 1) - 2, t3 - 2, w3 + 4, 3, 'bone', 8, { top: 1 }); S.end(); fy = t3 - 3; }
    // the fire bowl and (1+) the bronze mirror behind it
    G.lf = sc.light({ x: cx, y: fy - 5, z: 14, r: 44, i: 1.5, c: '#ffb050', fl: 'fire', tint: 0.6 });
    S.lay('mid'); S.beg(); S.poly([[cx - 6, fy - 3], [cx + 7, fy - 3], [cx + 4, fy + 1], [cx - 3, fy + 1]], 'brass', 7); S.hl(cx - 6, fy - 3, 13, 'brass', 10); S.end(); G.fire = { x: cx, y: fy - 4 };
    if (st >= 1) { S.lay('back'); S.beg(); S.ell(cx + 0.5, fy - 9, 6, 7, 'brass', 8, { dome: 1 }); S.ell(cx + 0.5, fy - 9, 4, 5, 'gold', 9); S.end(); }
    if (st >= 2) { const sy = fy - 18; S.lay('back'); S.beg(); S.rect(cx - 1, sy - 12, 3, 10, 'gold', 7); S.px(cx, sy - 14, 'gold', 9); S.rect(cx - 1, sy - 13, 3, 2, 'gold', 8); S.line(cx + 1, sy - 11, cx + 4, sy - 15, 'gold', 8); S.vl(cx + 4, sy - 18, 8, 'gold', 9); S.hl(cx + 3, sy - 18, 3, 'gold', 10); S.end(); }
    G.lamp = { x: cx, y: fy - 6 };
  },
  anim(D, t, s, o, G) {
    const st = s.st, f = fireSim(st, 13, 13, t, 0.95 + (st.roar || 0) * 0.4, 0.4); D.lay('mid'); drawFire(D, f, 13, 13, G.fire.x - 6, G.fire.y - 12);
    st.roar = Math.max(0, (st.roar || 0) - 0.015);
  },
  show(s, o, G) {
    const q = o.show.q; if (once(s, o, 'i', 0)) { s.st.roar = 1.5; s.flash(G.lf, 2.5); s.burst('ember', G.fire.x, G.fire.y - 4, 16 + q * 6, { sp: 30, ang: 0, spread: 1.2, life: 1.8, w: 8 }); }
  },
  beam: true,
  sfx: (d, q) => { horn(d, 1.4); [784, 988, 1175].forEach((f, i) => chime(f, d + 0.35 + i * 0.14, 0.05)); },
  col: '#ffd06a',
};

// the building site: foundation, scaffold, a crane; the walls climb course by course in the building's own material
// as the work gets done (o.prog), a builder's torch flashes; the fence carries the building's sign
function paintSite(S, sc, G, A) {
  const { L, R: Rr, gy, w, h } = G, top = gy - Math.round(h * 0.95);
  plinth(S, G, 'stone');
  G.lw = sc.light({ x: G.cx, y: gy - 10, z: 12, r: 30, i: 0.2, c: '#fff0c0', tint: 0.4 });
  S.lay('back'); S.beg(); for (let x = L + 2; x < Rr - 1; x += Math.max(8, Math.round(w / 5))) S.vl(x, top, gy - top, 'wood', 6); S.vl(Rr - 2, top, gy - top, 'wood', 5);
  for (let y = gy - 8; y > top; y -= 9) { S.hl(L + 1, y, w - 2, 'wood', 7, { n: [0, -0.6] }); S.hl(L + 1, y + 1, w - 2, 'wood', 4); }
  S.line(L + 2, gy - 1, L + 10, top + 8, 'wood', 4); S.end();
  // crane: mast, jib, the hook (animated)
  const cx = Rr - 4; S.beg(); for (let y = top - 14; y < gy; y += 3) { S.px(cx, y, 'iron', 7); S.px(cx + 2, y, 'iron', 5); S.px(cx + 1, y + 1, 'iron', 6); } S.hl(cx - Math.round(w * 0.5), top - 14, Math.round(w * 0.5) + 6, 'iron', 7); S.box(cx + 2, top - 13, 4, 3, 'iron', 4); S.end();
  G.hook = { x: cx - Math.round(w * 0.4), y: top - 13 };
  S.lay('front'); S.beg(); S.rect(L, gy - 5, w, 5, 'wood', 5); for (let x = L; x < Rr; x += 3) S.vl(x, gy - 5, 5, 'wood', 3); S.end();
  S.beg(); S.box(G.cx - 5, gy - 11, 11, 8, 'paper', 8); if (ICON[A.icon]) ICON[A.icon](S, G.cx, gy - 7); S.end();
}
function animSite(D, t, s, o, G, A) {
  const q = cl(o.prog || 0, 0, 1), top = G.gy - 5 - Math.round((G.h * 0.9 - 5) * q), bw = Math.round(G.w * 0.8), x0 = G.cx - (bw >> 1);
  D.lay('wall'); for (let y = G.gy - 1; y >= top; y--) { const row = G.gy - 1 - y, c = Math.floor(row / 3); for (let x = x0; x < x0 + bw; x++) D.px(x, y, A.mat, row % 3 === 2 ? 4 : (x + (c % 2) * 3) % 6 === 0 ? 5 : y === top ? 10 : 8 - (row % 3)); }
  // the hook swings with a pallet of stone
  const sw = Math.round(Math.sin(t * 1.3) * 2), hy = G.hook.y + 12; D.lay('mid'); D.vl(G.hook.x, G.hook.y + 1, 11, 'ink', 2); D.box(G.hook.x - 3 + sw, hy, 7, 3, 'wood', 6); D.hl(G.hook.x - 2 + sw, hy - 1, 5, A.mat, 7);
  // a builder's torch at the top of the wall
  if (steps(t, 1.7) < 0.1) { if (!s.st.w) { s.st.w = 1; s.burst('spark', x0 + bw * 0.6, top, 5, { sp: 22, ang: 0, spread: 2.6, life: 0.5, floor: G.gy - 1 }); } s.mul[G.lw] = 6; } else { s.st.w = 0; s.mul[G.lw] = 1; }
}

// ───────── defs: one per building × street size × stage (built on first use) ─────────
const PADX = 10, PADT = 16, PADB = 3, DIM = {};
function ensure(key, sc, dk, stage) {
  const id = '_tw:' + key + ':' + Math.round(sc * 100) + ':' + Math.round(dk * 100) + ':' + stage; if (X.has(id)) return id;
  const A = ART[key], f = M.townFoot(key), w = Math.round(f.w * sc / 2), h = Math.round(f.h * sc / 2), pt = PADT + (A.padt || 0);
  const W = w + PADX * 2, H = h + pt + PADB, G = { key, st: stage === 'site' ? 0 : stage, w, h, W, H, cx: W >> 1, gy: H - PADB, dk, s: sc };
  G.L = G.cx - (w >> 1); G.R = G.L + w;
  DIM[id] = G;
  X.def(id, {
    size: [W, H], fy: H, clear: 1, noFrame: 1, noFloor: 1, amb: [0.34 * (1 - dk * 0.9), 0.3 * (1 - dk)], town: 1,
    paint(S, sc2) {
      const l0 = sc2.light; sc2.light = (o) => l0(Object.assign(o, { i: (o.i || 1) * (1 - dk * 1.1) }));
      if (stage === 'site') paintSite(S, sc2, G, A); else A.paint(S, sc2, G);
      // the back streets lie in the night haze: every step a little darker, down toward the night indigo
      if (dk) Object.keys(S.L).forEach(k => { const Y = S.L[k]; for (let p = 0; p < W * H; p++) if (Y.m[p] && Y.e[p] !== 255) Y.t[p] = Math.max(0, Y.t[p] - dk * 5); });
    },
    anim(D, t, s, o) { if (stage === 'site') animSite(D, t, s, o, G, A); else { A.anim(D, t, s, o, G); if (o.show && A.show) A.show(s, o, G); } },
  });
  return id;
}
PT.ensure = ensure; PT.dims = (id) => DIM[id];
PT.has = (key) => !!ART[key];

// ───────── sounds, on the show's beats (seconds from the start of the show) ─────────
const S_ = () => M.Sfx;
const snd = (fn) => { try { const S = S_(); if (S && S.tone && M._g && (M._g.screen === 'base' || M._g.screen === 'raid')) fn(S); } catch (e) { /* no audio */ } };
function clang(d, k) { snd(S => { S.tone(1320 * k, 0.18, 'square', 0.05, -200, d); S.tone(2640 * k, 0.12, 'triangle', 0.03, 0, d); S.noise(0.05, 0.08, 5000, d); }); }
function hiss(dur, v, f, d) { snd(S => S.noise(dur, v, f, d)); }
function chime(f, d, v) { snd(S => { S.tone(f, 0.5, 'sine', v, 0, d); S.tone(f * 2, 0.3, 'sine', v * 0.4, 0, d); }); }
function bell(d, k) { snd(S => { S.tone(392, 1.6, 'sine', 0.1 * k, 0, d); S.tone(784 * 1.01, 1.1, 'sine', 0.05 * k, 0, d); S.tone(1175, 0.7, 'triangle', 0.03 * k, 0, d); }); }
function zap(d, k) { snd(S => { S.tone(90, 0.14, 'sawtooth', 0.06 * k, 900, d); S.noise(0.08, 0.1 * k, 6000, d); }); }
function hum(d, dur) { snd(S => { S.tone(60, dur, 'sawtooth', 0.04, 0, d); S.tone(120, dur, 'square', 0.02, 0, d); }); }
function creak(d, dur) { snd(S => { S.tone(140, dur, 'sawtooth', 0.04, 60, d); S.noise(dur, 0.04, 400, d); }); }
function thunk(d, k) { snd(S => { S.tone(110, 0.16, 'square', 0.09 * k, -60, d); S.noise(0.06, 0.12, 900, d); }); }
function whoosh(d, dur) { snd(S => S.noise(dur, 0.08, 2200, d)); }
function horn(d, dur) { snd(S => { S.tone(98, dur, 'sawtooth', 0.07, -6, d); S.tone(147, dur, 'sawtooth', 0.04, -8, d); }); }
function riseSfx(q) { snd(S => { S.noise(0.9, 0.1, 160); S.tone(55, 0.5, 'sine', 0.12, 20, 0.1); S.tone(70, 0.3, 'sine', 0.18 + q * 0.02, -35, RISE_LAND); S.noise(0.25, 0.2, 380, RISE_LAND); }); }
function upSfx(q, st) { snd(S => { [0, 0.12, 0.24, 0.36].forEach((a, i) => S.tone(330 * Math.pow(1.26, i + st), 0.1, 'square', 0.04, 0, a)); S.tone(880 * (1 + st * 0.26), 0.35, 'triangle', 0.06, 0, UP_POP); S.noise(0.12, 0.1, 3000, UP_POP); }); }

// ───────── world-space show layer: rings, rays, debris, the lighthouse beam (snapped to the 2-unit art grid) ─────────
const RISE_PRE = 0.35, RISE_LAND = 1.0, RISE = 2.6, UP_POP = 0.45, UP = 2.2;
const g2 = (v) => Math.round(v / 2) * 2;
function ramp(col) { const r = M.SHOW && M.SHOW.ramp ? M.SHOW.ramp(col) : null; return r ? [r[1], r[2], r[3], r[4]] : ['#ffffff', col, col, '#333']; }
function ring(ctx, x, y, r, sq, w, c) { const n = Math.max(12, Math.round(r * 6.3)); ctx.fillStyle = c; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; ctx.fillRect(g2(x + Math.cos(a) * r * 2), g2(y + Math.sin(a) * r * 2 * sq), 2 * w, 2 * w); } }
function drawFx(ctx, v, t) {
  const L = v.pfx; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i], a = t - f.t0; if (a < 0) continue; if (a > f.life) { L.splice(i, 1); continue; } const q = a / f.life, rp = f.rp;
    if (f.k === 'ring') ring(ctx, f.x, f.y, f.r0 + (f.r1 - f.r0) * eo(q), f.sq || 1, q < 0.3 ? 2 : 1, rp[Math.min(3, Math.floor(q * 4))]);
    else if (f.k === 'rays') { ctx.fillStyle = rp[Math.min(3, Math.floor(q * 4))]; for (let k = 0; k < f.n; k++) { const an = k / f.n * Math.PI * 2 + a * 0.6, l1 = f.r * (0.25 + 0.55 * eo(q)), l0 = l1 - 3 - 5 * (1 - q); for (let r = l0; r < l1; r += 1) ctx.fillRect(g2(f.x + Math.cos(an) * r * 2), g2(f.y + Math.sin(an) * r * 2), 2, 2); } }
    else if (f.k === 'deb') { f.p.forEach(p => { const x = p.x + p.vx * a, y = p.y + p.vy * a + 260 * a * a; if (y > f.floor) return; ctx.fillStyle = p.c; ctx.fillRect(g2(x), g2(y), p.s, p.s); }); }
    else if (f.k === 'crack') { ctx.fillStyle = rp[q < 0.5 ? 0 : 1]; const w = f.w * Math.min(1, a / 0.3); for (let x = -w; x <= w; x += 2) { const j = ((x * 7) & 6) - 3; ctx.fillRect(g2(f.x + x), g2(f.y - 2 + (Math.abs(j) > 2 ? -2 : 0)), 2, 2); } }
    else if (f.k === 'bolt') { const x = f.x + a * 900, y = f.y - a * 1300; ctx.fillStyle = rp[0]; ctx.fillRect(g2(x), g2(y), 4, 4); ctx.fillStyle = rp[2]; for (let k = 1; k < 8; k++) ctx.fillRect(g2(x - k * 6), g2(y + k * 9), 2, 2); }
  }
}
function addFx(v, f) { (v.pfx = v.pfx || []).push(f); }
function landFx(v, t, A, q, sc, H) {
  const rp = ramp(A.col), base = { t0: t };
  addFx(v, Object.assign({ k: 'ring', x: v.x, y: v.y, r0: 6, r1: 40 + q * 14, sq: 0.3, life: 0.5, rp: ramp('#ffffff') }, base));
  addFx(v, Object.assign({ k: 'ring', x: v.x, y: v.y - H * 0.5, r0: 10, r1: 50 + q * 16, sq: 1, life: 0.6, rp }, base, { t0: t + 0.05 }));
  if (q >= 1) addFx(v, Object.assign({ k: 'rays', x: v.x, y: v.y - H * 0.5, r: 50 + q * 12, n: 8 + q * 4, life: 0.7, rp }, base));
  const p = []; for (let i = 0; i < 14 + q * 4; i++) { const an = -Math.PI * (0.1 + R() * 0.8); p.push({ x: v.x + (R() - 0.5) * v.w * sc, y: v.y - 4, vx: Math.cos(an) * (60 + R() * 140), vy: Math.sin(an) * (120 + R() * 180), c: i % 3 ? '#6a5040' : '#caa27a', s: R() < 0.3 ? 4 : 2 }); }
  addFx(v, { k: 'deb', t0: t, life: 1.1, p, floor: v.y + 2, rp });
}

// ───────── drawing (called by mc-town.js / mc-wonders.js in place of the old art) ─────────
const zoomOf = () => (M._g && M._g.bv && M._g.bv.z) || 0.6;
PT.draw = function (ctx, v, t, lights, meta) {
  const A = ART[v.key]; if (!A || !PT.on()) return false;
  const m = meta || (M._g && M._g.meta), sc = v.sc || 1, dk = v.dk || 0, q = Math.min(3, (v.B && v.B.q) || 0), st = stageOf(m);
  const age = v.riseT != null ? t - v.riseT : 99, rising = age >= 0 && age < RISE;
  // a new stage: the upgrade show, the nearest to the main base first
  if (v.pxSt == null || v.site) v.pxSt = st;
  else if (st !== v.pxSt) { if (st > v.pxSt && !rising) { v.upT = t + Math.min(2.4, Math.abs(v.x - M.BASE_GEO.DOOR_X) / 900); v.upFrom = v.pxSt; v.upSnd = 0; } v.pxSt = st; }
  const ua = v.upT != null ? t - v.upT : 99, up = ua >= 0 && ua < UP, shown = v.site ? 'site' : up && ua < UP_POP ? v.upFrom : st;
  const id = ensure(v.key, sc, dk, shown), G = DIM[id], slotId = 'tw:' + (v.k || v.key) + ':' + shown;
  // the shows: rise (the ground cracks, it climbs, slams down, then its flourish) · up (a squeeze, the pop, its flourish)
  let dy = 0, jit = 0, kx = 1, ky = 1, white = 0, o = { prog: v.prog || 0 };
  if (rising && !v.site) {
    if (!v.riseSnd) { v.riseSnd = 1; riseSfx(q); if (A.sfx) A.sfx(RISE_LAND, q, 'rise'); addFx(v, { k: 'crack', t0: t, life: RISE_LAND, x: v.x, y: v.y, w: v.w * sc * 0.55, rp: ramp(A.col) }); }
    if (age < RISE_PRE) { ctx.save(); drawFx(ctx, v, t); ctx.restore(); return true; }
    const c = cl((age - RISE_PRE) / (RISE_LAND - RISE_PRE), 0, 1); dy = (1 - eo(c)) * (G.h + 10) * 2; jit = c < 1 && !RM() ? Math.round((R() - 0.5) * 3) * 2 : 0;
    const la = age - RISE_LAND; if (la >= 0 && la < 0.3) { ky = 1 - 0.08 * Math.sin(la / 0.3 * Math.PI); kx = 1 + 0.05 * Math.sin(la / 0.3 * Math.PI); } white = la >= 0 && la < 0.18 ? 1 - la / 0.18 : 0;
    if (la >= 0 && !v.landed) { v.landed = 1; landFx(v, t, A, q, sc, G.h * 2); try { X.poke(slotId, 'built'); } catch (e) { /* first frame */ } if (M._g && M._g.fx && M._g.fx.kick) M._g.fx.kick(3 + q * 1.5); }
    if (la >= 0) o.show = { k: 'rise', a: la, q, st, id: 'r' + v.riseT };
  } else if (v.riseT != null && !rising) v.riseSnd = v.landed = 0;
  if (up && !v.site) {
    if (!v.upSnd) { v.upSnd = 1; upSfx(q, st); if (A.sfx) A.sfx(UP_POP, q + st, 'up'); }
    if (ua < UP_POP) { const c = ua / UP_POP; ky = 1 - 0.07 * eo(c); kx = 1 + 0.04 * eo(c); jit = !RM() && c > 0.4 ? Math.round((R() - 0.5) * 2) * 2 : 0; }
    else { const pa = ua - UP_POP; if (pa < 0.35) { ky = 1 + 0.1 * Math.sin(pa / 0.35 * Math.PI) * (1 - pa / 0.35); kx = 1 - 0.04 * Math.sin(pa / 0.35 * Math.PI); } white = pa < 0.2 ? 1 - pa / 0.2 : 0; o.show = { k: 'up', a: pa, q: Math.min(3, q + st), st, id: 'u' + v.upT };
      if (!v.popped || v.popped !== v.upT) { v.popped = v.upT; const rp = ramp(A.col); addFx(v, { k: 'ring', t0: t, x: v.x, y: v.y - G.h, r0: 8, r1: 44 + st * 16, sq: 1, life: 0.55, rp }); addFx(v, { k: 'rays', t0: t, x: v.x, y: v.y - G.h, r: 40 + st * 16, n: 8 + st * 4, life: 0.6, rp }); if (st >= 2) addFx(v, { k: 'ring', t0: t + 0.12, x: v.x, y: v.y, r0: 6, r1: 60, sq: 0.3, life: 0.5, rp: ramp('#ffffff') }); } }
  }
  if (v.key === 'ballista') { if (G.fired && G.fired !== v.firedId) { v.firedId = G.fired; addFx(v, { k: 'bolt', t0: t, x: v.x + 20 * sc, y: v.y - G.h * 2 + 10, life: 0.5, rp: ramp('#ffe08a') }); } }
  // draw: the canvas's bottom centre stands on the street
  const X0 = v.x - G.cx * 2, Y0 = v.y - G.gy * 2;
  ctx.save();
  if (rising) { ctx.beginPath(); ctx.rect(X0 - 40, Y0 - 400, G.W * 2 + 80, G.gy * 2 + 400); ctx.clip(); }
  if (kx !== 1 || ky !== 1 || jit || dy) { ctx.translate(v.x + jit, v.y + dy); ctx.scale(kx, ky); ctx.translate(-v.x, -v.y); }
  X.draw(ctx, X0, Y0, id, t, o, slotId, zoomOf());
  if (white > 0 && X.slots[slotId] && X.slots[slotId].cv) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, white * (0.8 + q * 0.1)); ctx.drawImage(X.slots[slotId].cv, X0, Y0, G.W * 2, G.H * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  // the lighthouse beam sweeps the night (a flat 3-band wedge; its length is the turning: long to the sides, short when it faces us)
  if (A.beam && !v.site && G.lamp) { const lx = v.x + (G.lamp.x - G.cx) * 2, ly = v.y + (G.lamp.y - G.gy) * 2 + dy, sp = t * (0.7 + (o.show ? 1.2 : 0)), c = Math.cos(sp), len = (380 + 120 * shown) * Math.abs(c) * (1 - dk * 0.5), sd = c > 0 ? 1 : -1;
    if (len > 30 && !RM()) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; [[1, 0.1], [0.65, 0.12], [0.35, 0.16]].forEach(([wk, al]) => { const hw = (18 + 22 * Math.abs(Math.sin(sp))) * wk; ctx.globalAlpha = al * (o.show ? 1.8 : 1); ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.moveTo(lx, ly - 4); ctx.lineTo(lx + sd * len, ly - hw - 10); ctx.lineTo(lx + sd * len, ly + hw - 10); ctx.closePath(); ctx.fill(); }); ctx.restore(); } }
  drawFx(ctx, v, t);
  // the building's glow on the ground and the haze (the town's light pass)
  if (lights && !v.site) lights.push({ x: v.x, y: v.y - G.h * 0.9, r: (G.w * 2 + 60) * (1 - dk), c: A.col, f: 0.4 + 0.05 * Math.sin(t * 2 + (v.c || 0)) + white * 0.6 });
  if (lights && white > 0) lights.push({ x: v.x, y: v.y - G.h, r: 260 + q * 40, c: A.col, f: white });
  return true;
};
// a demolished building sinks back into the ground
PT.gone = function (ctx, gv, t) {
  const A = ART[gv.key]; if (!A || !PT.on()) return false;
  const st = gv.pxSt != null ? gv.pxSt : 0, id = ensure(gv.key, gv.sc || 1, gv.dk || 0, gv.site ? 'site' : st), G = DIM[id], q = (t - gv.goneT) / 1.4, X0 = gv.x - G.cx * 2, Y0 = gv.y - G.gy * 2;
  ctx.save(); ctx.beginPath(); ctx.rect(X0 - 20, Y0 - 200, G.W * 2 + 40, G.gy * 2 + 200); ctx.clip(); ctx.translate(RM() ? 0 : Math.round((R() - 0.5) * 3) * 2, q * q * (G.h + 20) * 2);
  X.draw(ctx, X0, Y0, id, t, {}, 'tw:' + (gv.k || gv.key) + ':' + (gv.site ? 'site' : st), zoomOf()); ctx.restore(); return true;
};
// headless / tools: one frame of a building at a stage, with an optional show moment → { u32, W, H }
PT.frame = function (key, o) {
  o = o || {}; const id = ensure(key, o.sc || 0.84, o.dk || 0, o.stage == null ? 0 : o.stage), G = DIM[id], sid = '_twf:' + id + ':' + (o.tag || '');
  const t0 = o.t || 2, show = o.show; let px = null;
  for (let k = 0; k <= 30; k++) { const tt = t0 - 1 + k / 30, oo = { prog: o.prog || 0 }; if (show) { const a = show.a - 1 + k / 30; if (a >= 0) oo.show = { k: show.k, a, q: show.q || 0, st: o.stage || 0, id: 'f' + (o.tag || '') }; } px = X.pixels(id, tt, oo, sid); }
  return { u32: new Uint32Array(px), W: G.W, H: G.H };
};
})();
