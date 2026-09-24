// ==== mc-px16.js ====
(function () {
// 16-bit sprite engine, after the "animated pixel wizard" brief.
// Every unit is built procedurally from pixel runs into a material buffer; a pass then shades each part in two tones
// (plus a highlight on metal and gems), wraps the silhouette in a dark selective outline and, while the unit charges or
// casts, lights its edge with a 1px rim in its own magic colour. Poses are parameters that the rigs turn into pixels;
// they are quantised to ~10 frames a second, and every frame is cached per unit / state / frame / light / tint.
// One art pixel is ART logical pixels (2 pixels of the field layer), so sprites stay on one crisp grid.
const M = window.MC;
const ART = 4;

// ───────── palette: 5-step ramps, darkest → lightest. Every pixel the engine writes comes from here. ─────────
const RAMP = {
  ink:    ['#0b0610', '#150d1e', '#21172c', '#2e223c', '#40324f'],
  steel:  ['#161a26', '#323a4e', '#5a6680', '#909cb4', '#d4dbe6'],
  iron:   ['#120f16', '#26222e', '#3e3a48', '#5e5a6a', '#8a8698'],
  gold:   ['#301a06', '#6e4210', '#b8841e', '#f0c040', '#fff2a8'],
  brass:  ['#261808', '#5a3a14', '#946224', '#c89640', '#ecd08a'],
  wood:   ['#221408', '#46291a', '#6e4428', '#986436', '#c4904e'],
  leather:['#1e1008', '#40220f', '#6a3c1e', '#94602e', '#bc8a4c'],
  skin:   ['#3a1a12', '#7a3e28', '#b86e48', '#e2a070', '#ffd4a8'],
  skinD:  ['#1e0e0a', '#44221a', '#6e3a26', '#9a5a3a', '#c48256'],
  orc:    ['#10240e', '#244a1e', '#3e722c', '#68a242', '#a6d86c'],
  zombie: ['#18200e', '#34401e', '#56683a', '#849a5a', '#b8c888'],
  pale:   ['#141c2c', '#2e3e56', '#56708c', '#8ea8c0', '#d0e2f0'],
  bone:   ['#241f1a', '#56503e', '#948a70', '#cfc4a2', '#f6f0dc'],
  red:    ['#2a060c', '#5c101a', '#9a2026', '#dc4234', '#ff8e6c'],
  crimson:['#1e0410', '#48081e', '#7c1030', '#b82248', '#f0587a'],
  orange: ['#301004', '#6e2a0c', '#bc5416', '#f08c2c', '#ffcc68'],
  green:  ['#0a200c', '#1a4418', '#2e7026', '#56aa3c', '#a2e46c'],
  moss:   ['#121c0c', '#263a16', '#40582a', '#627c3e', '#96a864'],
  teal:   ['#062226', '#0e4a48', '#187e74', '#36bca6', '#98f6e0'],
  blue:   ['#0a0e2c', '#18265e', '#2a4aa0', '#4884dc', '#98ccff'],
  navy:   ['#080a1a', '#141a3a', '#222e5e', '#364a86', '#5a74b0'],
  purple: ['#16082a', '#321458', '#582a92', '#904ecc', '#d4a4ff'],
  pink:   ['#280822', '#541442', '#90286c', '#d0469e', '#ffa2dc'],
  void:   ['#08060e', '#16101f', '#261c34', '#3c3050', '#5e4e78'],
  cream:  ['#5a5446', '#8e8674', '#c6bca2', '#ece4cc', '#ffffff'],
  snow:   ['#3a4a5e', '#6e8298', '#a8bccc', '#dce8f0', '#ffffff'],
  fire:   ['#5a1406', '#c83a10', '#f47a1c', '#ffc040', '#fff6b0'],
  frost:  ['#0e2a4a', '#2462a0', '#4aa6e6', '#9ee0ff', '#ffffff'],
  holy:   ['#4a3a10', '#a88220', '#f0cc40', '#fff098', '#ffffff'],
  arcane: ['#2a0e4e', '#5e28a6', '#9c5af0', '#d4a4ff', '#ffffff'],
  toxic:  ['#1a3a08', '#3a7a10', '#6ec820', '#b8f050', '#f4ffc0'],
  blood:  ['#300408', '#720a14', '#c01a24', '#ff4a4a', '#ffc0b0'],
  shadow: ['#06040a', '#120c1a', '#22182e', '#3a2c4c', '#6a5a86'],
  sea:    ['#061a2a', '#0c3a5a', '#16688e', '#34a0c4', '#8ae0f4'],
};
const HEX = {}; Object.keys(RAMP).forEach(k => RAMP[k].forEach(h => { HEX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }));
const rgb = (h) => HEX[h] || (HEX[h] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
// closest ramp for an arbitrary skill colour (so particles and rim light stay on the palette)
const rampFor = (() => { const cache = {}; return (hex) => { if (!hex) return 'arcane'; if (RAMP[hex]) return hex; if (cache[hex]) return cache[hex]; const c = rgb(hex.slice(0, 7)); let best = 'arcane', bd = 1e9; Object.keys(RAMP).forEach(k => { if (k === 'ink' || k === 'iron' || k === 'shadow' || k === 'void') return; const r = rgb(RAMP[k][3]), d = (r[0] - c[0]) ** 2 * 0.3 + (r[1] - c[1]) ** 2 * 0.59 + (r[2] - c[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = k; } }); return (cache[hex] = best); }; })();

// ───────── the material buffer ─────────
// Rigs draw in art pixels relative to the feet (0,0), facing right. Materials are named slots ('skin', 'cloth', …) that
// the unit's spec maps to ramps. tone 0 = shade automatically; 1..5 = force that ramp step (eyes, gems, fold lines).
class Buf {
  constructor(w, h, ox, oy, mats) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; this.m = new Uint8Array(w * h); this.t = new Uint8Array(w * h); this.list = [null]; this.ids = {}; this.mats = mats || {}; this.focus = null; }
  id(name) { if (typeof name === 'number') return name; let i = this.ids[name]; if (i) return i; const r = this.mats[name] || name; this.list.push({ n: name, r: Array.isArray(r) ? r : RAMP[r] || RAMP.cream }); i = this.ids[name] = this.list.length - 1; return i; }
  p(x, y, mat, tone) { x = Math.round(x + this.ox); y = Math.round(y + this.oy); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (mat === 0 || mat === null) { this.m[i] = 0; return; } this.m[i] = this.id(mat); this.t[i] = tone || 0; }
  r(x, y, w, h, mat, tone) { x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, mat, tone); }
  l(x0, y0, x1, y1, mat, th, tone) { th = th || 1; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, x = x0, y = y0, o = Math.floor((th - 1) / 2);
    for (let n = 0; n < 400; n++) { for (let a = 0; a < th; a++) for (let b = 0; b < th; b++) this.p(x - o + a, y - o + b, mat, tone); if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x += sx; } if (e2 <= dx) { e += dx; y += sy; } } }
  d(cx, cy, r, mat, tone) { this.e(cx, cy, r, r, mat, tone); }
  e(cx, cy, rx, ry, mat, tone) { if (rx < 0.5 || ry < 0.5) { this.p(cx, cy, mat, tone); return; } for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) { if ((x * x) / (rx * rx + rx * 0.6) + (y * y) / (ry * ry + ry * 0.6) <= 1) this.p(cx + x, cy + y, mat, tone); } }
  // scanline polygon: pixel centres inside the polygon are filled (no anti-aliasing)
  g(pts, mat, tone) { let y0 = 1e9, y1 = -1e9; pts.forEach(q => { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const yc = y + 0.5, xs = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); } xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.p(x, y, mat, tone); } }
  // copy-mirror helper for symmetric things drawn around x = cx
  sym(cx, fn) { fn((x) => x); fn((x) => 2 * cx - x); }
  get(x, y) { x = Math.round(x + this.ox); y = Math.round(y + this.oy); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.m[y * this.w + x]; }
  at(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.m[y * this.w + x]; }
}
// shade → outline → rim → tint, straight into ImageData
function bake(B, o) {
  o = o || {}; const w = B.w, h = B.h, m = B.m, T = B.t, out = new Uint8ClampedArray(w * h * 4), col = new Array(w * h);
  const shiny = o.shiny || {}, flat = o.flat || {};
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, id = m[i]; if (!id) continue; const L = B.list[id], r = L.r; let tone = T[i] ? T[i] - 1 : -1;
    if (tone < 0) {
      if (flat[L.n]) tone = 2;
      else { const up = B.at(x, y - 1) !== id, dn = B.at(x, y + 1) !== id, lf = B.at(x - 1, y) !== id, rt = B.at(x + 1, y) !== id; tone = 2;
        if ((dn && !up) || (rt && !lf)) tone = 1; else if ((up && !dn) || (lf && !rt)) tone = 3;
        if (shiny[L.n] && up && lf && !dn) tone = 4; }
    }
    col[i] = r[Math.max(0, Math.min(4, tone))];
  }
  // selective outline: an empty pixel touching the sprite takes the darkest step of what it touches
  const inkC = RAMP.ink[1];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (m[i]) continue; let n = 0;
    if (y + 1 < h && m[i + w]) n = m[i + w]; else if (y > 0 && m[i - w]) n = m[i - w]; else if (x > 0 && m[i - 1]) n = m[i - 1]; else if (x + 1 < w && m[i + 1]) n = m[i + 1];
    if (n) col[i] = o.ink === false ? B.list[n].r[0] : (B.list[n].r[0] === RAMP.ink[0] ? inkC : B.list[n].r[0]);
  }
  // rim light from the unit's own magic (only while charging / casting): edge pixels facing the source light up
  if (o.rim && B.focus) {
    const R = RAMP[o.rimRamp] || RAMP.arcane, sx = B.focus[0] + B.ox, sy = B.focus[1] + B.oy, lv = o.rim, reach = lv >= 2 ? 40 : 22;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!m[i]) continue; let nx = 0, ny = 0;
      if (!B.at(x - 1, y)) nx -= 1; if (!B.at(x + 1, y)) nx += 1; if (!B.at(x, y - 1)) ny -= 1; if (!B.at(x, y + 1)) ny += 1; if (!nx && !ny) continue;
      const dx = sx - x, dy = sy - y, dd = Math.hypot(dx, dy); if (dd > reach || nx * dx + ny * dy <= 0) continue;
      col[i] = dd < reach * 0.45 && lv >= 2 ? R[4] : R[3];
    }
  }
  // flat tints (hit flash, rage)
  const tint = o.tint ? rgb(o.tint) : null;
  for (let i = 0; i < w * h; i++) { const c = col[i]; if (!c) continue; const v = tint && m[i] ? tint : rgb(c); out[i * 4] = v[0]; out[i * 4 + 1] = v[1]; out[i * 4 + 2] = v[2]; out[i * 4 + 3] = 255; }
  return new ImageData(out, w, h);
}

// ───────── specs, rigs, frames ─────────
const RIGS = {};        // name → fn(B, spec, pose) : draws the unit, sets B.focus
const SPECS = {};       // unit key → spec
const cache = new Map();
M.P16 = { ART, RAMP, RIGS, SPECS, Buf, bake, rampFor, rgb, cache };
// pose for a state/frame: generic numbers the rigs read (each rig interprets them for its body)
const POSE = {
  idle:    [{ bob: 0, sway: 0 }, { bob: 1, sway: 1 }],
  walk:    [{ step: 1, bob: 0 }, { step: 0, bob: 1 }, { step: -1, bob: 0 }, { step: 0, bob: 1 }],
  atk:     [{ atk: -1, lean: -1 }, { atk: 1, lean: 1 }, { atk: 2, lean: 1 }],
  charge:  [{ raise: 1, glow: 0, bob: 0 }, { raise: 1, glow: 1, bob: 1 }],
  cast:    [{ thrust: 1, glow: 2, lean: 1 }, { thrust: 1, glow: 1, lean: 0 }],
  recover: [{ raise: 0.5, lean: 0 }],
  hurt:    [{ hurt: 1, lean: -1 }],
  dead:    [{ hurt: 1, lean: -2, down: 1 }],
};
M.P16.POSE = POSE;
M.P16.size = (spec) => spec.S || 22;
function frame(key, st, f, o) {
  o = o || {}; let spec = M.P16.spec(key); if (!spec) return null;
  const P = POSE[st] || POSE.idle, fi = ((f % P.length) + P.length) % P.length, rim = o.rim || 0, tint = o.tint || '';
  // a unit can be drawn bigger than its spec (elites, bosses): the rig is rebuilt at that size, never scaled
  if (o.S && o.S !== spec.S) spec = Object.assign({}, spec, { S: o.S, W: 0, H: 0 });
  const ck = key + '|' + spec.S + '|' + st + '|' + fi + '|' + rim + '|' + tint; let c = cache.get(ck); if (c) return c;
  const S = spec.S, W = spec.W || Math.ceil(S * 2.6), H = spec.H || Math.ceil(S * 1.75), B = new Buf(W, H, Math.round(W / 2), H - 2, spec.mat);
  const pose = Object.assign({ st, f: fi, bob: 0, sway: 0, step: 0, atk: 0, lean: 0, raise: 0, thrust: 0, glow: 0, hurt: 0, down: 0 }, P[fi]);
  (RIGS[spec.rig] || RIGS.hum)(B, spec, pose);
  const img = bake(B, { rim, rimRamp: spec.magic, tint, shiny: spec.shiny || { metal: 1, gem: 1, gold: 1, steel: 1 }, flat: spec.flat });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.getContext('2d').putImageData(img, 0, 0);
  c = M.asPx(cv, ART); c._img = img; c.footY = B.oy * ART; c.cx = B.ox * ART; c.S = S * ART; c.focus = B.focus ? [B.focus[0] * ART, B.focus[1] * ART] : [0, -S * ART * 0.6]; c.artW = W; c.artH = H;
  if (cache.size > 6000) cache.clear();
  cache.set(ck, c); return c;
}
M.P16.frame = frame;
// which state / frame an entity shows right now (10 fps pose clock)
M.P16.animOf = function (e, T) {
  const f10 = Math.floor(T * 10);
  if (e.casting) { const q = (T - e.casting.t0) / Math.max(0.01, e.casting.until - e.casting.t0); return { st: 'charge', f: Math.floor(T * 8), rim: q > 0.5 ? 2 : 1 }; }
  if (e.castPose != null && T - e.castPose < 0.28) return { st: 'cast', f: T - e.castPose < 0.12 ? 0 : 1, rim: 2 };
  if (e.castPose != null && T - e.castPose < 0.45) return { st: 'recover', f: 0, rim: 1 };
  if (e.kb != null && T - e.kb < 0.12) return { st: 'hurt', f: 0, rim: 0 };
  if (e.lunge != null && T - e.lunge < 0.3) { const q = (T - e.lunge) / 0.3; return { st: 'atk', f: q < 0.25 ? 0 : q < 0.6 ? 1 : 2, rim: 0 }; }
  if (e.stun > 0) return { st: 'hurt', f: 0, rim: 0 };
  const moving = e.walk && e._lastWalk !== e.walk; e._lastWalk = e.walk;
  if (moving || (e._walkT && T - e._walkT < 0.12)) { if (moving) e._walkT = T; return { st: 'walk', f: Math.floor((e.walk || 0) / 18), rim: 0 }; }
  return { st: 'idle', f: Math.floor(T * 2.5 + (e.id || 0) * 0.37), rim: 0 };
};

// ───────── pooled particles: preallocated, reused, palette-stepped (white → magic → dark), snapped to the art grid ─────────
const PN = 900;
const Pool = function () { this.x = new Float32Array(PN); this.y = new Float32Array(PN); this.vx = new Float32Array(PN); this.vy = new Float32Array(PN); this.age = new Float32Array(PN); this.life = new Float32Array(PN); this.kind = new Uint8Array(PN); this.ramp = new Array(PN); this.tx = new Float32Array(PN); this.ty = new Float32Array(PN); this.ang = new Float32Array(PN); this.rad = new Float32Array(PN); this.sz = new Uint8Array(PN); this.n = 0; this.head = 0; };
// kinds: 1 burst (drag + gravity), 2 spiral in to (tx,ty), 3 rise, 4 orbit around (tx,ty)
Pool.prototype.add = function (k, x, y, vx, vy, life, ramp, o) {
  let i = -1; for (let n = 0; n < PN; n++) { const j = (this.head + n) % PN; if (this.life[j] <= 0 || this.age[j] >= this.life[j]) { i = j; break; } } if (i < 0) i = this.head; this.head = (i + 1) % PN;
  this.kind[i] = k; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.age[i] = 0; this.life[i] = life; this.ramp[i] = RAMP[ramp] || RAMP.arcane; this.sz[i] = (o && o.sz) || 1;
  this.tx[i] = o && o.tx != null ? o.tx : x; this.ty[i] = o && o.ty != null ? o.ty : y; this.ang[i] = o && o.ang != null ? o.ang : 0; this.rad[i] = o && o.rad != null ? o.rad : 0; return i;
};
Pool.prototype.step = function (dt) {
  for (let i = 0; i < PN; i++) {
    if (this.life[i] <= 0 || this.age[i] >= this.life[i]) continue; this.age[i] += dt; const k = this.kind[i];
    if (k === 1) { this.vx[i] *= Math.pow(0.04, dt); this.vy[i] = this.vy[i] * Math.pow(0.04, dt) + 380 * dt; this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; }
    else if (k === 2 || k === 4) { const q = this.age[i] / this.life[i]; this.ang[i] += (k === 2 ? 7 : 4) * dt; const r = k === 2 ? this.rad[i] * (1 - q) : this.rad[i]; this.x[i] = this.tx[i] + Math.cos(this.ang[i]) * r; this.y[i] = this.ty[i] + Math.sin(this.ang[i]) * r * 0.7; }
    else { this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; }
  }
};
Pool.prototype.draw = function (ctx) {
  const g = ART;
  for (let i = 0; i < PN; i++) {
    if (this.life[i] <= 0 || this.age[i] >= this.life[i]) continue; const q = this.age[i] / this.life[i], R = this.ramp[i];
    const c = q < 0.12 ? '#ffffff' : q < 0.4 ? R[4] : q < 0.7 ? R[3] : q < 0.88 ? R[2] : R[1], s = this.sz[i] * g;
    ctx.fillStyle = c; ctx.fillRect(Math.round(this.x[i] / g) * g, Math.round(this.y[i] / g) * g, s, s);
  }
};
Pool.prototype.clear = function () { this.life.fill(0); };
M.P16.Pool = Pool;
})();

;
