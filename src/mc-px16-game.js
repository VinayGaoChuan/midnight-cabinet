// ==== mc-px16-game.js ====
(function () {
// Puts the 16-bit cast into the game: battle units animate through idle / walk / attack / charge / cast / recover /
// hurt at 10 fps on the ART grid, light up with their own magic while casting, and throw pooled pixel particles
// (sparks spiral in while charging, burst out on the cast, spark on heavy hits). Every other place that asks for a
// unit picture (cards, portraits, raids, the world map) gets the same sprite at an integer scale.
const M = window.MC, P16 = M.P16, ART = P16.ART, G = M.Game.prototype;
const snap = (v) => Math.round(v / ART) * ART;
const QS = M.QSIZE || [1, 1.14, 1.3, 1.5];

// ───────── any-size picture of a unit (integer upscale of its canonical sprite) ─────────
const ui = new Map();
P16.img = function (key, st, f, tint, H) {
  const spec = P16.spec(key); if (!spec) return null;
  const k = Math.max(1, Math.round((H || spec.S * 3) / spec.S)), ck = key + '|' + st + '|' + f + '|' + (tint || '') + '|' + k;
  let c = ui.get(ck); if (c) return c;
  const fr = P16.frame(key, st, f, { tint }); if (!fr) return null;
  // crop to the drawn pixels (one pixel of air) so cards and portraits show the character, not the empty frame; anchors move with the crop
  const im = fr._img, W = im.width, Hh = im.height, d = im.data; let x0 = W, y0 = Hh, x1 = -1, y1 = -1;
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = Hh - 1; } x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(Hh - 1, y1 + 1);
  const cv = document.createElement('canvas'); cv.width = x1 - x0 + 1; cv.height = y1 - y0 + 1; cv.getContext('2d').putImageData(im, -x0, -y0);
  c = M.asPx(cv, k); c.footY = (fr.footY / ART - y0) * k; c.cx = (fr.cx / ART - x0) * k; c.S = spec.S * k; c.focus = [fr.focus[0] / ART * k, fr.focus[1] / ART * k];
  if (ui.size > 3000) ui.clear(); ui.set(ck, c); return c;
};
const oHD = M.hdCanvas;
M.hdCanvas = function (D, H, tint, pose) {
  if (!D || !P16.spec(D.key)) return oHD.apply(this, arguments);
  return P16.img(D.key, pose === 2 ? 'cast' : pose === 1 ? 'atk' : 'idle', pose === 1 ? 1 : 0, tint, H);
};
// cards, portraits, banners and flying icons: the cropped sprite at the height the old painted art filled
const oSC = M.spriteCanvas;
M.spriteCanvas = function (key, s, tint) {
  const D = M.hdDef && M.hdDef(key); if (!D || !P16.spec(key)) return oSC.apply(this, arguments);
  return P16.img(key, 'idle', 0, tint, (s || 4) * 13 * (QS[D.q] || 1) * 0.8 * 1.45);
};

// ───────── battle ─────────
const BP = M.Battle3.prototype;
P16.battleS = (e, spec) => Math.max(10, Math.round((spec.S0 || 22) * (spec.big || 1) * (e.sz || 1)));
P16.entImg = function (e, T) {
  const key = e.hd && e.hd.key, spec = key && P16.spec(key); if (!spec) return null;
  const a = P16.animOf(e, T), tint = !e.alive && e.dieT != null && T - e.dieT < 0.15 ? '#ff4a4a' : e.flash > 0 && e.alive ? '#ffffff' : e.raging && Math.floor(T * 8) % 2 ? '#ff4a4a' : '';
  const fr = P16.frame(key, a.st, a.f, { rim: a.rim, tint, S: P16.battleS(e, spec) }); if (fr) { e._fr = fr; e._magic = spec.magic; }
  return fr;
};
// world position of what the unit casts from (staff gem, maw, eye…)
P16.focusOf = function (e) { const fr = e._fr; if (!fr) return [e.x, e.y - 44 * (e.sz || 1)]; const fl = M.faceOf ? M.faceOf(e) : (e.side === 'E' ? -1 : 1); return [e.x + fr.focus[0] * fl, e.y + fr.focus[1]]; };
const rampOf = (e, col) => (col ? P16.rampFor(col) : null) || e._magic || 'arcane';
const poolOf = (b) => b.p16 || (b.p16 = new P16.Pool());
// charging: sparks spiral in to the focus; casting: a burst out of it, a few motes rising
const oBegin = BP.beginCast;
BP.beginCast = function (e, o) {
  const r = oBegin.apply(this, arguments); if (!e.casting || (P16.fxFor && P16.fxFor(e))) return r;
  const P = poolOf(this), ramp = rampOf(e, e.casting.sp && e.casting.sp.col), [fx, fy] = P16.focusOf(e), n = 10 + (e.casting.sp ? e.casting.sp.tier : 0) * 6, dur = Math.max(0.3, e.casting.until - e.casting.t0);
  for (let i = 0; i < n; i++) P.add(2, fx, fy, 0, 0, dur * (0.6 + Math.random() * 0.4), ramp, { tx: fx, ty: fy, ang: Math.random() * 7, rad: 60 + Math.random() * 70 });
  e._sparkT = this.t; return r;
};
const oFire = BP.fireCast;
BP.fireCast = function (e) {
  const sp = e.casting && e.casting.sp, P = poolOf(this), ramp = rampOf(e, sp && sp.col), [fx, fy] = P16.focusOf(e), tier = sp ? sp.tier : 0;
  const r = oFire.apply(this, arguments); this.shake = Math.max(this.shake || 0, 1 + tier);
  if (P16.fxFor && P16.fxFor(e)) return r;
  for (let i = 0; i < 14 + tier * 10; i++) { const a = Math.random() * Math.PI * 2, v = 220 + Math.random() * 420 * (1 + tier * 0.3); P.add(1, fx, fy, Math.cos(a) * v, Math.sin(a) * v - 120, 0.45 + Math.random() * 0.35, ramp, { sz: Math.random() < 0.25 ? 2 : 1 }); }
  for (let i = 0; i < 6 + tier * 2; i++) P.add(3, fx + (Math.random() - 0.5) * 60, fy + (Math.random() - 0.5) * 30, 0, -60 - Math.random() * 60, 0.6 + Math.random() * 0.4, ramp);
  this.shake = Math.max(this.shake || 0, 1 + tier);   // 1–2 art px of screen shake on top of the existing kick
  return r;
};
const oStep = BP.step;
BP.step = function (dt) {
  oStep.apply(this, arguments); const P = this.p16; if (!P || dt <= 0) return; P.step(dt);
  // while charging, keep feeding sparks around the focus
  for (const e of this.ents) { if (!e.casting || !e.alive) continue; if (this.t - (e._sparkT || 0) < 0.05) continue; e._sparkT = this.t; const [fx, fy] = P16.focusOf(e); P.add(4, fx, fy, 0, 0, 0.35, rampOf(e, e.casting.sp && e.casting.sp.col), { tx: fx, ty: fy, ang: Math.random() * 7, rad: 22 + Math.random() * 18 }); }
};
const oDeal = BP.deal;
BP.deal = function (src, tg, amt, o = {}) {
  const d = oDeal.apply(this, arguments);
  if (d > 0 && tg && (o.crit || o.big || (o.skill && Math.random() < 0.35))) { const P = poolOf(this), ramp = o.crit ? 'holy' : src ? rampOf(src, o.col) : 'cream', y = tg.y - 40 * (tg.sz || 1); for (let i = 0; i < (o.crit ? 8 : 4); i++) { const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 200; P.add(1, tg.x, y, Math.cos(a) * v, Math.sin(a) * v - 80, 0.3 + Math.random() * 0.2, ramp); } }
  return d;
};
P16.drawPool = function (ctx, b) { if (b.p16) b.p16.draw(ctx); };
// pixel ellipse (outline or filled) on the ART grid: shadows and quality rings under units
P16.ellipse = function (ctx, cx, cy, rx, ry, col, ring) {
  const ax = Math.round(rx / ART), ay = Math.max(1, Math.round(ry / ART)); ctx.fillStyle = col; cx = snap(cx); cy = snap(cy);
  for (let y = -ay; y <= ay; y++) { const w = Math.round(ax * Math.sqrt(Math.max(0, 1 - (y * y) / (ay * ay + 0.4)))); if (ring) { ctx.fillRect(cx - w * ART, cy + y * ART, ART, ART); ctx.fillRect(cx + w * ART, cy + y * ART, ART, ART); if (y === -ay || y === ay) ctx.fillRect(cx - w * ART, cy + y * ART, (2 * w + 1) * ART, ART); } else ctx.fillRect(cx - w * ART, cy + y * ART, (2 * w + 1) * ART, ART); }
};
P16.snap = snap;

// ───────── raid (base defence) and the world map walker ─────────
P16.raidState = function (e, T) {
  if (!e.alive) return ['dead', 0];
  if (e.lunge != null && T - e.lunge < 0.3) { const q = (T - e.lunge) / 0.3; return ['atk', q < 0.25 ? 0 : q < 0.6 ? 1 : 2]; }
  if (e.flash && T - e.flash < 0.08) return ['hurt', 0];
  const mv = e.walk !== e._lw; e._lw = e.walk; if (mv) e._wt = T;
  if (e._wt && T - e._wt < 0.15) return ['walk', Math.floor((e.walk || 0) / 16)];
  return ['idle', Math.floor(T * 2.5 + (e.x || 0) * 0.01)];
};
})();

;
