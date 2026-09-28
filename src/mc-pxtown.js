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
const PT = M.PXTOWN = { force: null, stageForce: null, EVERY: 0.1 };
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

// ───────── the buildings: PT.ART[key] = { mat, icon, col, kind, paint(S, sc, G), anim(D, t, s, o, G), show(s, o, G), sfx(d, q) } ─────────
// (mc-pxtown-kit.js builds most of them from a short spec; wonders and statues have their own files)
const once = PT.once = (s, o, id, at) => { const k = o.show.id + ':' + id; if (o.show.a >= at && !s.st[k]) { s.st[k] = 1; return true; } return false; };
const ART = PT.ART = {};
PT.H = { fireSim, drawFire, flame, plinth, win, gable, door, banner, ICON, cl, steps };

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
  const A = ART[key]; if (A.prep) A.prep(); const f = A.foot || M.townFoot(key), w = Math.round(f.w * sc / 2), h = Math.round(f.h * sc / 2), pt = PADT + (A.padt || 0);
  const W = w + PADX * 2, H = h + pt + PADB, G = { key, st: stage === 'site' ? 0 : stage, w, h, W, H, cx: W >> 1, gy: H - PADB, dk, s: sc };
  G.L = G.cx - (w >> 1); G.R = G.L + w;
  DIM[id] = G; const hz = A.wonder ? dk * 0.4 : dk;   // the wonders keep their stone pale in the haze: they are the skyline's show
  X.def(id, {
    size: [W, H], fy: H, clear: 1, noFrame: 1, noFloor: 1, amb: [0.34 * (1 - hz * 0.9), 0.3 * (1 - hz)], town: 1,
    paint(S, sc2) {
      const l0 = sc2.light; sc2.light = (o) => l0(Object.assign(o, { i: (o.i || 1) * (1 - dk * 1.1) }));
      if (stage === 'site') paintSite(S, sc2, G, A); else A.paint(S, sc2, G);
      // the back streets lie in the night haze: every step a little darker, down toward the night indigo
      if (hz) Object.keys(S.L).forEach(k => { const Y = S.L[k]; for (let p = 0; p < W * H; p++) if (Y.m[p] && Y.e[p] !== 255) Y.t[p] = Math.max(0, Y.t[p] - hz * 5); });
    },
    anim(D, t, s, o) { if (stage === 'site') animSite(D, t, s, o, G, A); else { A.anim(D, t, s, o, G); if (o.show && A.show) A.show(s, o, G); } },
  });
  return id;
}
PT.ensure = ensure; PT.dims = (id) => DIM[id];
PT.has = (key) => !!(ART[key] || (PT.auto && PT.auto(key)));

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
function coin(d, k) { snd(S => { [1568, 2093, 2637].forEach((f, i) => S.tone(f * k, 0.08, 'square', 0.035, 0, d + i * 0.06)); }); }
function chirp(d) { snd(S => { S.tone(2200, 0.07, 'sine', 0.04, 900, d); S.tone(2600, 0.06, 'sine', 0.03, 800, d + 0.09); }); }
function splash(d, k) { snd(S => { S.noise(0.3, 0.1 * k, 1400, d); S.tone(420, 0.12, 'sine', 0.05, -200, d + 0.05); }); }
function drum(d, k) { snd(S => { S.tone(70, 0.22, 'sine', 0.16 * k, -25, d); S.noise(0.08, 0.1, 300, d); }); }
function shimmer(d, k) { snd(S => { [1760, 1397, 1175, 880].forEach((f, i) => S.tone(f, 0.25, 'triangle', 0.035 * k, 0, d + i * 0.07)); S.noise(0.4, 0.04, 7000, d); }); }
function horn(d, dur) { snd(S => { S.tone(98, dur, 'sawtooth', 0.07, -6, d); S.tone(147, dur, 'sawtooth', 0.04, -8, d); }); }
PT.SND = { snd, clang, hiss, chime, bell, zap, hum, creak, thunk, whoosh, coin, chirp, splash, drum, shimmer, horn: (d, dur) => horn(d, dur) };
function riseSfx(q) { snd(S => { S.noise(0.9, 0.1, 160); S.tone(55, 0.5, 'sine', 0.12, 20, 0.1); S.tone(70, 0.3, 'sine', 0.18 + q * 0.02, -35, RISE_LAND); S.noise(0.25, 0.2, 380, RISE_LAND); }); }
function upSfx(q, st) { snd(S => { [0, 0.12, 0.24, 0.36].forEach((a, i) => S.tone(330 * Math.pow(1.26, i + st), 0.1, 'square', 0.04, 0, a)); S.tone(880 * (1 + st * 0.26), 0.35, 'triangle', 0.06, 0, UP_POP); S.noise(0.12, 0.1, 3000, UP_POP); }); }

// ───────── world-space show layer (every mark on the 2-unit art grid, like the stages' 4-px grid) ─────────
// ring: a band two art px thick (light inside, main colour outside) that grows, then breaks up cell by cell and walks
// down its ramp white → light → main → dark; rays: stepped two-px dashes flying out; bits: square pixels with gravity
// walking the same ramp; crack: a glowing zigzag in the street. No smooth shapes, no alpha fades.
const RISE_PRE = 0.35, RISE_LAND = 1.0, RISE = 2.6, UP_POP = 0.45, UP = 2.2;
const g2 = (v) => Math.round(v / 2) * 2, hh = (i) => { const x = Math.sin(i * 91.7 + 17.3) * 43758.5; return x - Math.floor(x); };
function ramp(col) { const r = M.SHOW && M.SHOW.ramp ? M.SHOW.ramp(col) : null; return r ? [r[1], r[2], r[3], r[4]] : ['#ffffff', col, col, '#333']; }
PT.ramp = ramp;
function ring(ctx, f, q) {
  const r = f.r0 + (f.r1 - f.r0) * eo(q), sq = f.sq || 1, n = Math.max(16, Math.round(r * 6.3)), rp = f.rp, k = Math.min(3, Math.floor(q * 3.2)), cut = q > 0.45 ? (q - 0.45) / 0.55 : 0;
  for (let b = 0; b < 2; b++) { const rr = r - b, c = b ? rp[Math.max(0, k - 1)] : rp[Math.min(3, k + 1)]; ctx.fillStyle = c;
    let lx = 1e9, ly = 1e9; for (let i = 0; i < n; i++) { if (cut && hh(i + b * 999 + f.seed) < cut) continue; const a = i / n * Math.PI * 2, x = g2(f.x + Math.round(Math.cos(a) * rr) * 2), y = g2(f.y + Math.round(Math.sin(a) * rr * sq) * 2); if (x === lx && y === ly) continue; lx = x; ly = y; ctx.fillRect(x, y, 2, 2); } }
}
function drawFx(ctx, v, t) {
  const L = v.pfx; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i], a = t - f.t0; if (a < 0) continue; if (a > f.life) { L.splice(i, 1); continue; } const q = a / f.life, rp = f.rp;
    if (f.k === 'ring') ring(ctx, f, q);
    else if (f.k === 'rays') { for (let k = 0; k < f.n; k++) { const an = k / f.n * Math.PI * 2 + (f.rot || 0), l1 = f.r * (0.3 + 0.7 * eo(q)), len = Math.max(2, Math.round((1 - q) * f.r * 0.35));
        for (let j = 0; j < len; j++) { const r = l1 - j; if (r < 3) break; ctx.fillStyle = rp[Math.min(3, Math.floor(j / len * 3 + q * 1.5))]; ctx.fillRect(g2(f.x + Math.round(Math.cos(an) * r) * 2), g2(f.y + Math.round(Math.sin(an) * r) * 2), 2, 2); } } }
    else if (f.k === 'bits') { f.p.forEach(p => { const x = p.x + p.vx * a, y = p.y + p.vy * a + (f.g == null ? 260 : f.g) * a * a; if (y > f.floor) return; const lq = Math.min(0.999, a / p.life); if (lq >= 0.999) return; ctx.fillStyle = p.c || rp[Math.floor(lq * 4)]; ctx.fillRect(g2(x), g2(y), p.s, p.s); }); }
    else if (f.k === 'crack') { const w = Math.round(f.w * Math.min(1, a / 0.3) / 2); for (let x = -w; x <= w; x++) { const j = hh(x + 7) < 0.5 ? 0 : -1, lit = hh(x * 3 + Math.floor(a * 12)) < 0.6; ctx.fillStyle = lit ? rp[q < 0.6 ? 0 : 1] : rp[2]; ctx.fillRect(g2(f.x) + x * 2, g2(f.y) - 2 + j * 2, 2, 2); } }
    else if (f.k === 'bolt') { const x = f.x + a * 900, y = f.y - a * 1300; ctx.fillStyle = rp[0]; ctx.fillRect(g2(x), g2(y), 4, 4); for (let k = 1; k < 8; k++) { ctx.fillStyle = rp[Math.min(3, k >> 1)]; ctx.fillRect(g2(x - k * 6), g2(y + k * 9), 2, 2); } }
  }
}
function addFx(v, f) { f.seed = f.seed || Math.floor(R() * 1000); (v.pfx = v.pfx || []).push(f); }
function bits(v, t, x, y, n, rp, o) { o = o || {}; const p = []; for (let i = 0; i < n; i++) { const an = o.ang != null ? o.ang + (R() - 0.5) * (o.spread || 1) : -Math.PI * (0.08 + R() * 0.84), sp = (o.sp || 160) * (0.4 + R() * 0.8); p.push({ x: x + (R() - 0.5) * (o.w || 0), y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: (o.life || 1) * (0.6 + R() * 0.5), s: R() < 0.25 ? 4 : 2, c: o.c ? o.c[i % o.c.length] : null }); } addFx(v, { k: 'bits', t0: t, life: (o.life || 1) * 1.2, p, floor: o.floor != null ? o.floor : v.y + 2, g: o.g, rp }); }
PT.fx = { addFx, bits, ramp };
function landFx(v, t, A, q, sc, H) {
  const rp = ramp(A.col), wr = ramp('#ffffff');
  addFx(v, { k: 'ring', t0: t, x: v.x, y: v.y, r0: 4, r1: 34 + q * 10, sq: 0.3, life: 0.55, rp: wr });
  addFx(v, { k: 'ring', t0: t + 0.06, x: v.x, y: v.y - H * 0.5, r0: 8, r1: 30 + q * 10, sq: 1, life: 0.6, rp });
  addFx(v, { k: 'rays', t0: t, x: v.x, y: v.y - H * 0.5, r: 30 + q * 10, n: 8 + q * 4, life: 0.55, rp, rot: R() });
  bits(v, t, v.x, v.y - 4, 14 + q * 5, ramp('#b08a60'), { w: v.w * sc, sp: 170, life: 1, c: ['#caa27a', '#6a5040', '#8a6a4a'] });
  bits(v, t, v.x, v.y - H * 0.6, 8 + q * 5, rp, { w: v.w * sc * 0.6, sp: 120, life: 0.8, g: 60 });
}
function popFx(v, t, A, st, H) {
  const rp = ramp(A.col); addFx(v, { k: 'ring', t0: t, x: v.x, y: v.y - H * 0.55, r0: 6, r1: 28 + st * 10, sq: 1, life: 0.55, rp });
  addFx(v, { k: 'rays', t0: t, x: v.x, y: v.y - H * 0.55, r: 30 + st * 12, n: 8 + st * 4, life: 0.6, rp, rot: R() });
  bits(v, t, v.x, v.y - H * 0.6, 10 + st * 8, rp, { w: v.w * 0.6, sp: 130, life: 0.9, g: 70 });
  if (st >= 2) addFx(v, { k: 'ring', t0: t + 0.12, x: v.x, y: v.y, r0: 4, r1: 44, sq: 0.3, life: 0.5, rp: ramp('#ffffff') });
}
// the lighthouse beam: a pixel wedge in three hard bands, baked per length and drawn on the art grid
const BEAM = {};
function beamCv(len, hw) {
  const k = len + ':' + hw; if (BEAM[k]) return BEAM[k]; if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = len; c.height = hw * 2 + 1; const x = c.getContext('2d');
  [['#fff2c0', 0.28, 0.35], ['#ffe08a', 0.18, 0.7], ['#ffc860', 0.1, 1]].reverse().forEach(([col, al, wk]) => { x.globalAlpha = al; x.fillStyle = col; for (let i = 0; i < len; i++) { const hwi = Math.max(0, Math.round((1 + (hw - 1) * i / len) * wk)); if (i > len * 0.85 && (i + hwi) % 2) continue; x.fillRect(i, hw - hwi, 1, hwi * 2 + 1); } });
  return (BEAM[k] = c);
}
PT.beam = function (ctx, lx, ly, t, show, dk, grow) {
  if (RM()) return; const sp = t * (0.7 + (show ? 1.2 : 0)), c = Math.cos(sp), len = Math.round(((190 + 60 * grow) * Math.abs(c) * (1 - dk * 0.5)) / 16) * 16; if (len < 16) return;
  const cv = beamCv(len, 10 + Math.round(8 * Math.abs(Math.sin(sp)))); if (!cv) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false; ctx.translate(g2(lx), g2(ly)); if (c < 0) ctx.scale(-1, 1); ctx.globalAlpha = show ? 1 : 0.75; ctx.drawImage(cv, 0, -cv.height - 4, cv.width * 2, cv.height * 2); ctx.restore();
};

// ───────── drawing (called by mc-town.js / mc-wonders.js in place of the old art) ─────────
const zoomOf = () => (M._g && M._g.bv && M._g.bv.z) || 0.6;
PT.draw = function (ctx, v, t, lights, meta) {
  if (!PT.on()) return false; const A = ART[v.key] || (PT.auto && PT.auto(v.key)); if (!A) return false; if (A.prep) A.prep();
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
      if (!v.popped || v.popped !== v.upT) { v.popped = v.upT; popFx(v, t, A, st, G.h * 2); } }
  }
  if (G.fired && G.fired !== v.firedId) { v.firedId = G.fired; addFx(v, { k: 'bolt', t0: t, x: v.x + (G.fx ? (G.fx.x - G.cx) * 2 : 0), y: v.y + (G.fx ? (G.fx.y - G.gy) * 2 : -G.h * 2), life: 0.5, rp: ramp('#ffe08a') }); }
  // draw: the canvas's bottom centre stands on the street
  const X0 = v.x - G.cx * 2, Y0 = v.y - G.gy * 2;
  ctx.save();
  if (rising) { ctx.beginPath(); ctx.rect(X0 - 40, Y0 - 400, G.W * 2 + 80, G.gy * 2 + 400); ctx.clip(); }
  if (kx !== 1 || ky !== 1 || jit || dy) { ctx.translate(v.x + jit, v.y + dy); ctx.scale(kx, ky); ctx.translate(-v.x, -v.y); }
  // a background building redraws about ten times a second (its lights and fire still flicker; staggered), every frame in a show
  const sl = X.slots[slotId], z = zoomOf();
  if (sl && sl.key === id && sl.cv && !o.show && !rising && !up && !v.site && t >= sl.lr && t - sl.lr < PT.EVERY + (sl.seed || 0) * 0.04) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = z < 0.9; ctx.drawImage(sl.cv, X0, Y0, G.W * 2, G.H * 2); ctx.imageSmoothingEnabled = sm; }
  else X.draw(ctx, X0, Y0, id, t, o, slotId, z);
  if (white > 0 && X.slots[slotId] && X.slots[slotId].cv) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, white * (0.8 + q * 0.1)); ctx.drawImage(X.slots[slotId].cv, X0, Y0, G.W * 2, G.H * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
  if (A.beam && !v.site && G.lamp) PT.beam(ctx, v.x + (G.lamp.x - G.cx) * 2, v.y + (G.lamp.y - G.gy) * 2 + dy, t, !!o.show, dk, shown);
  drawFx(ctx, v, t);
  // the building's glow on the ground and the haze (the town's light pass)
  if (lights && !v.site) lights.push({ x: v.x, y: v.y - G.h * 0.9, r: (G.w * 2 + 60) * (1 - dk), c: A.col, f: 0.4 + 0.05 * Math.sin(t * 2 + (v.c || 0)) + white * 0.6 });
  if (lights && white > 0) lights.push({ x: v.x, y: v.y - G.h, r: 260 + q * 40, c: A.col, f: white });
  return true;
};
// a demolished building sinks back into the ground
PT.gone = function (ctx, gv, t) {
  if (!PT.on()) return false; const A = ART[gv.key] || (PT.auto && PT.auto(gv.key)); if (!A) return false;
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
