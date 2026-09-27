// ==== mc-parade.js ====
(function () {
// The homecoming parade (user ruling 2026-09-26: 「每局结束时会带回部队，这个带回部队要有伟大仪式感，现在我都不知道每次探索带回
// 了什么部队」). After the haul, before the garrison evolves: 凯旋！ comes down, and every unit that came home steps onto the
// stage as a card, one by one, weakest first and the best last — the higher its quality the longer the beat, the bigger
// the light and the sound. Each card: the unit, its name in its quality's colour, quality and vocation, its power. The
// cards stay until the player clicks (a click before that brings the rest in at once); then they march one after the
// other into the garrison on the bar, which counts them in.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (t) => 1 - Math.pow(1 - cl(t, 0, 1), 3), RM = () => !!(M.PJ && M.PJ.reduced);
const eb = (t) => { t = cl(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const imgOf = (k, s) => { try { return M.spriteCanvas(k, s); } catch (e) { return null; } };
const outC = new Map();
function outlined(img, col, w) {
  if (!img) return null; const k = col + w; let m = outC.get(img); if (!m) outC.set(img, m = {}); if (m[k]) return m[k];
  const s = document.createElement('canvas'); s.width = img.width; s.height = img.height; const sx = s.getContext('2d'); sx.drawImage(img, 0, 0); sx.globalCompositeOperation = 'source-in'; sx.fillStyle = col; sx.fillRect(0, 0, s.width, s.height);
  const c = document.createElement('canvas'); c.width = img.width + w * 2; c.height = img.height + w * 2; const x = c.getContext('2d');
  for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w]]) x.drawImage(s, w + dx, w + dy); x.drawImage(img, w, w); return (m[k] = c);
}
// the beat: the title, then one card every STEP seconds (a 史诗 or better holds the stage longer)
const T_TITLE = 0.9, STEP = 0.34, BIG = 0.7, FLY = 0.55, EACH = 0.07, CW = 220, CH = 300, GAP = 24;
G.paradeStart = function (gi) {
  const list = (gi.units || []).filter(u => u && DB[u.type]); if (!list.length) return false;
  const pw = (u) => M.unitPower(u.type, u), units = list.slice().sort((a, b) => DB[a.type].q - DB[b.type].q || pw(a) - pw(b));
  const n = units.length, rows = n > 5 ? 2 : 1, per = Math.ceil(n / rows), sc = Math.min(1, 1760 / (per * (CW + GAP)));
  let at = T_TITLE; const cards = units.map((u, i) => {
    const r = rows > 1 && i >= per ? 1 : 0, k = r ? i - per : i, inRow = r ? n - per : per, w = (CW + GAP) * sc;
    const q = DB[u.type].q, c = { u, q, x: 960 + (k - (inRow - 1) / 2) * w, y: rows > 1 ? 405 + r * (CH * sc + 36) : 560, at, img: imgOf(u.type, 6), s: 0 };
    at += q >= 3 ? BIG : STEP; return c;
  });
  const best = cards.reduce((b, c, i) => (c.q > cards[b].q ? i : b), cards.length - 1);
  this.parade = { t: 0, cards, sc, n, out: gi.out || null, allAt: at + 0.35, best, go: false };
  S.whoosh && S.whoosh(0.6); this.bump(); return true;
};
function card(ctx, c, T, sc, F) {
  const d = DB[c.u.type], qc = Q[c.q].c, u = c.u, age = T - c.at, still = RM();
  let x = c.x, y = c.y, k = sc * (still ? 1 : eb(age / 0.4)), a = 1;
  if (F.flyT != null) { const i = F.cards.indexOf(c), f = cl((T - F.flyT - i * EACH) / FLY, 0, 1), e = eo(f), to = F.dest; if (f >= 1) return; x += (to.x - x) * e; y += (to.y - y) * e - Math.sin(e * Math.PI) * 120; k *= 1 - 0.8 * e; a = 1 - 0.4 * e; }
  ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(k, k);
  // a 史诗 or better: turning rays behind it
  if (c.q >= 3 && F.flyT == null) { ctx.save(); ctx.rotate(still ? 0 : T * 0.6); ctx.globalAlpha = 0.28 * cl(age / 0.3, 0, 1); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = i % 2 ? qc : P.butter; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -330); ctx.lineTo(40, -330); ctx.fill(); } ctx.restore(); }
  M.glow(ctx, 0, 0, 200 + c.q * 30, qc, 0.3 + c.q * 0.05);
  U.R(ctx, -CW / 2 + 8, -CH / 2 + 8, CW, CH, P.ink); U.box(ctx, -CW / 2, -CH / 2, CW, CH, P.night);
  ctx.globalAlpha = a * 0.3; U.R(ctx, -CW / 2, -CH / 2, CW, CH * 0.55, qc); ctx.globalAlpha = a;
  [[-CW / 2 + 5, -CH / 2 + 5, CW - 10, 5], [-CW / 2 + 5, CH / 2 - 10, CW - 10, 5], [-CW / 2 + 5, -CH / 2 + 5, 5, CH - 10], [CW / 2 - 10, -CH / 2 + 5, 5, CH - 10]].forEach(r => U.R(ctx, r[0], r[1], r[2], r[3], qc));
  const im = c.img; if (im) { const f = Math.min(170 / im.width, 150 / im.height, 3), w = Math.max(2, Math.round(3 / f)), o = c.q > 0 ? outlined(im, qc, w) : im; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(0, -52); ctx.scale(f, f); ctx.drawImage(o, -o.width / 2, -o.height / 2); ctx.restore(); }
  U.text(ctx, d.n, 0, 62, 30, qc, { outline: true });
  U.text(ctx, Q[c.q].n + (d.voc ? ' · ' + d.voc : ''), 0, 100, 22, (M.VOCS && M.VOCS[d.voc]) || P.cream);
  U.text(ctx, '★ ' + M.unitPower(u.type, u), 0, 132, 22, P.butter);
  // the card's landing: a white flash over it
  if (age < 0.18 && !still) { ctx.globalAlpha = a * 0.8 * (1 - age / 0.18); U.R(ctx, -CW / 2, -CH / 2, CW, CH, P.white); }
  ctx.restore();
}
function draw(ctx, g, F) {
  const T = F.t; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const fade = F.flyT != null ? 1 - cl((T - F.flyT - F.n * EACH - FLY + 0.3) / 0.3, 0, 1) : cl(T / 0.3, 0, 1);
  U.dim(ctx, 0.85 * fade);
  // 凯旋！ drops in, then how many came home
  const ti = eb((T - 0.1) / 0.5), ta = cl((T - 0.1) / 0.2, 0, 1) * fade; ctx.globalAlpha = ta;
  U.text(ctx, '凯旋！', 960, 120 + (1 - ti) * -80, 96, P.gold, { outline: true, ramp: true });
  U.text(ctx, '带回 ' + F.n + ' 支部队', 960, 214, 36, P.cream, { outline: true }); ctx.globalAlpha = 1;
  F.cards.forEach(c => { if (T >= c.at) card(ctx, c, T, F.sc, F); });
  if (F.flyT == null && T >= F.allAt) {
    if (F.out) { U.text(ctx, '驻军满了：最弱的 ' + F.out.n + ' 支离开，物资 +' + F.out.sup, 960, 952, 26, '#caa84a', { outline: true }); }
    ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点击继续', 960, 1010, 30, P.cream, { outline: true }); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function finish(g, F) {
  g.parade = null; g.pulse.mgar = now(); const p = g.fxPos('mgar') || { x: 700, y: 50 };
  g.fx.pop && g.fx.pop(p.x, p.y + 70, '驻军 +' + F.n, '#ffcf4a', 40, { rise: 40 }); g.fx.burst && g.fx.burst(p.x, p.y, '#ffcf4a', 16); S.up && S.up(2); g.bump();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), F = this.parade; if (!F) return r;
  if (this.screen !== 'base') { this.parade = null; return r; }
  const t0 = F.t; F.t += dt || 0;
  // a card lands: its sound by quality, sparks in its colour; the best one shakes the screen
  F.cards.forEach((c, i) => { if (F.t >= c.at && !c.s) { c.s = 1; if (F.quick) return; if (c.q >= 2) S.reveal ? S.reveal(c.q) : S.stamp && S.stamp(); else S.land && S.land(i); if (this.fx) { this.fx.burst && this.fx.burst(c.x, c.y, Q[c.q].c, 8 + c.q * 5, { v: 300 + c.q * 80 }); if (c.q >= 3) { this.fx.kick && this.fx.kick(8 + c.q * 3); this.fx.rays && this.fx.rays(c.x, c.y, Q[c.q].c, 1, { r: 260 }); } } } });
  if (t0 < F.allAt && F.t >= F.allAt && !F.quick) S.fanfare && S.fanfare();
  if (F.flyT != null) {
    F.cards.forEach((c, i) => { const land = F.flyT + i * EACH + FLY; if (t0 < land && F.t >= land) { S.land && S.land(i % 6); this.pulse.mgar = now(); this.fx && this.fx.burst && this.fx.burst(F.dest.x, F.dest.y, Q[c.q].c, 6); } });
    if (F.t >= F.flyT + F.n * EACH + FLY + 0.1) { finish(this, F); return r; }
  }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), this, F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('parade: ' + e.message); this.parade = null; } }
  return r;
};
// a click: all the cards at once, or (once they are all up) off they march
G.paradeClick = function () {
  const F = this.parade; if (!F || F.flyT != null) return;
  if (F.t < F.allAt) { F.quick = F.t < F.allAt - 0.4; F.t = F.allAt; F.cards.forEach(c => { c.at = Math.min(c.at, F.t - 0.4); }); S.click && S.click(); return; }
  F.flyT = F.t; F.dest = this.fxPos('mgar') || { x: 700, y: 50 }; S.whoosh && S.whoosh(0.5); this.bump();
};
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.parade) { v.fxZ = 75; v.coverOn = true; v.coverClick = () => this.paradeClick(); } return v; };
const oBusy = G.baseBusy; G.baseBusy = function () { return !!this.parade || oBusy.apply(this, arguments); };
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.parade || oLS.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.parade = null; return oNG.apply(this, arguments); };
})();
