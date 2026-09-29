// ==== mc-bigloot.js ====
(function () {
// Great finds get their moment (user ruling 2026-09-26: 「获得所有，传说，神话，不朽对象时，都要有仪式感，例如掉落boss专属建筑，这个时候，
// 现在直接获得了，没注意就能错过，这个不对，要充满伟大的仪式感效果」). Whatever arrives at 传说 or above — a blueprint, a boss
// statue's blueprint, 启示卷轴, a legendary unit from an event — stops the screen: it darkens, rays turn in the quality's
// colour, a card falls in face down, spins and flips with a white flash and a burst; the word (传说！ / 神话！ / 不朽！), the
// thing's picture, name, kind and its one line. It stays until the player clicks; several come one after another.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), RM = () => !!(M.PJ && M.PJ.reduced);
const eb = (t) => { t = cl(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
M.BIG_Q = 4;
const WORD = { 4: '传说！', 5: '神话！', 6: '不朽！' };
const qOfKey = (k) => { try { const I = M.itemInfo(k); return I && I.q != null ? I.q : 0; } catch (e) { return 0; } };
G.bigLoot = function (o) { if (!o || o.q < M.BIG_Q) return; (this.bigQ = this.bigQ || []).push(o); };
G.bigLootKey = function (k) { const q = qOfKey(k); if (q < M.BIG_Q) return; const I = M.itemInfo(k); this.bigLoot({ q, n: I.n, kind: I.kind || '', d: I.d || '', icon: I.icon, key: k }); };
// where they come from: a fight's haul, anything handed out (events, mini-games, rewards)
const oSettle = G.startSettle;
G.startSettle = function () { const run = this.run, n0 = run && run.loot ? run.loot.bp.length : 0; const r = oSettle.apply(this, arguments); if (run && run.loot) run.loot.bp.slice(n0).forEach(k => this.bigLootKey(k)); return r; };
const oAward = G.award;
G.award = function (list, from) {
  const r = oAward.apply(this, arguments);
  (list || []).forEach(g => { if (!g) return; if (g.k === 'bp' && g.key) this.bigLootKey(g.key); else if (g.k === 'unit' && DB[g.type] && DB[g.type].q >= M.BIG_Q) this.bigLoot({ q: DB[g.type].q, n: DB[g.type].n, kind: DB[g.type].voc + '部队', d: M.unitLine ? M.unitLine(g.type) : '', unit: g.type }); });
  return r;
};
// ───────── the show ─────────
const T_IN = 0.55, T_FLIP = 1.15, T_OPEN = 1.5, CW = 380, CH = 500;
const imgFor = (o) => { try { if (o.unit) return M.spriteCanvas(o.unit, 8); return (M.iconCanvas && M.iconCanvas(o.icon, 5)) || M.spriteCanvas(o.icon, 10); } catch (e) { return null; } };
function card(ctx, x, y, sc, o, front, T) {
  const qc = Q[o.q].c; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sc, Math.abs(sc) > 0 ? 1 : 1);
  U.R(ctx, -CW / 2 + 10, -CH / 2 + 10, CW, CH, P.ink); U.box(ctx, -CW / 2, -CH / 2, CW, CH, front ? P.night : P.abyss);
  [[-CW / 2 + 6, -CH / 2 + 6, CW - 12, 8], [-CW / 2 + 6, CH / 2 - 14, CW - 12, 8], [-CW / 2 + 6, -CH / 2 + 6, 8, CH - 12], [CW / 2 - 14, -CH / 2 + 6, 8, CH - 12]].forEach(r => U.R(ctx, r[0], r[1], r[2], r[3], qc));
  if (!front) { for (let i = 0; i < 5; i++) U.R(ctx, -60 + i * 30, -20, 18, 18, i % 2 ? qc : P.gold); U.text(ctx, '?', 0, 30, 120, qc, { outline: true }); ctx.restore(); return; }
  ctx.globalAlpha = 0.3; U.R(ctx, -CW / 2, -CH / 2, CW, CH * 0.5, qc); ctx.globalAlpha = 1;
  const im = o.img; if (im) { const f = Math.min(200 / im.width, 200 / im.height, 6); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(0, -90); ctx.scale(f, f); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); }
  U.text(ctx, Q[o.q].n, 0, 44, 30, qc, { outline: true });
  U.text(ctx, o.n, 0, 92, 38, qc, { outline: true });
  if (o.kind) U.text(ctx, o.kind, 0, 134, 24, P.lavender || '#a9a3c9');
  if (o.d) { const lines = wrap(ctx, o.d, CW - 50, 24).slice(0, 3); lines.forEach((ln, i) => U.text(ctx, ln, 0, 176 + i * 32, 24, P.cream)); }
  ctx.restore();
}
function wrap(ctx, s, max, size) { ctx.save(); ctx.font = U.font ? U.font(size) : size + 'px sans-serif'; const tw = M.trWrap && M.trWrap(ctx, s, max); if (tw) { ctx.restore(); return tw; } const out = []; let line = ''; for (const ch of String(s)) { if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); ctx.restore(); return out; }
function draw(ctx, F) {
  const T = F.t, o = F.o, qc = Q[o.q].c, still = RM(), cx = 960, cy = 560; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const out = F.out != null ? cl((T - F.out) / 0.35, 0, 1) : 0;
  U.dim(ctx, 0.9 * cl(T / 0.3, 0, 1) * (1 - out));
  // rays, faster and brighter once it has turned
  if (T > 0.2) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(still ? 0 : T * (T > T_FLIP ? 0.6 : 0.25)); ctx.globalAlpha = (T > T_FLIP ? 0.5 : 0.22) * (1 - out); for (let i = 0; i < 18; i++) { ctx.rotate(Math.PI / 9); ctx.fillStyle = i % 2 ? qc : P.butter; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-70, -1100); ctx.lineTo(70, -1100); ctx.fill(); } ctx.restore(); }
  M.glow(ctx, cx, cy, 360 + (T > T_FLIP ? 160 : 0), qc, 0.45 * (1 - out));
  // the card: falls in face down, spins faster, flips
  let y = cy, sx = 1, front = T >= T_FLIP;
  if (T < T_IN) { const q = eb(T / T_IN); y = -300 + (cy + 300) * q; }
  else if (T < T_FLIP) { const q = (T - T_IN) / (T_FLIP - T_IN); sx = still ? 1 : Math.cos(q * q * Math.PI * 5); front = false; }
  else { const q = cl((T - T_FLIP) / 0.25, 0, 1); sx = still ? 1 : 0.2 + 0.8 * eb(q); }
  if (out) { y += out * 120; }
  ctx.globalAlpha = 1 - out; ctx.save(); ctx.translate(cx, y); ctx.scale(Math.max(0.02, Math.abs(sx)), 1); card(ctx, 0, 0, 1, o, front, T); ctx.restore();
  // the flash at the flip
  if (T >= T_FLIP && T < T_FLIP + 0.3 && !still) { ctx.globalAlpha = (1 - (T - T_FLIP) / 0.3) * 0.85; U.R(ctx, 0, 0, 1920, 1080, P.white); }
  ctx.globalAlpha = 1 - out;
  if (T >= T_FLIP) { const q = eb((T - T_FLIP) / 0.4); U.text(ctx, WORD[o.q] || '', cx, 150 - (1 - q) * 60, 104, qc, { outline: true, ramp: true }); }
  if (T >= T_OPEN && F.out == null) { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点击继续', cx, 1000, 30, P.cream, { outline: true }); }
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments);
  if (!this.bigFx && this.bigQ && this.bigQ.length && !this.parade && !this.evoFx && !this.mini) { const o = this.bigQ.shift(); o.img = imgFor(o); this.bigFx = { t: 0, o, s: {} }; S.whoosh && S.whoosh(0.5); }
  const F = this.bigFx; if (!F) return r;
  const t0 = F.t; F.t += dt || 0;
  if (t0 < T_FLIP && F.t >= T_FLIP) { S.reveal ? S.reveal(F.o.q) : S.stamp && S.stamp(); S.fanfare && S.fanfare(); if (this.fx) { this.fx.kick && this.fx.kick(22); this.fx.burst && this.fx.burst(960, 560, Q[F.o.q].c, 40, { v: 800 }); this.fx.confetti && this.fx.confetti(80); } }
  if (F.out != null && F.t - F.out > 0.35) { this.bigFx = null; this.bump(); return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('bigloot: ' + e.message); this.bigFx = null; } }
  return r;
};
G.bigClick = function () { const F = this.bigFx; if (!F || F.out != null) return; if (F.t < T_OPEN) { F.t = T_OPEN; return; } F.out = F.t; S.click && S.click(); };
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.bigFx) { v.fxZ = 85; v.coverOn = true; v.coverClick = () => this.bigClick(); } return v; };
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.bigFx || oLS.apply(this, arguments); };
const oBusy = G.baseBusy; if (oBusy) G.baseBusy = function () { return !!this.bigFx || oBusy.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.bigFx = null; this.bigQ = []; return oNG.apply(this, arguments); };
})();
