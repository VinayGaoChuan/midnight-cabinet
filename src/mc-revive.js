// ==== mc-revive.js ====
(function () {
// The base core is back (user ruling 2026-09-26): 3 hearts for the whole game. A lost expedition tears the leader's
// card, and the core gives one heart to mend it: a keeper walks in, lights the candles and says the rite, a red heart
// leaves the core, flies into the torn card, the halves pull together along a golden seam and the leader lives again
// with full life. Nothing to press, nothing to skip. When the core has no heart left the rite stops short, the card
// falls apart and the base goes up (game over). Clearing a world gives a heart back (never above 3).
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), eback = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!M.PJ.reduced;
// the core's data (M.CORE_MAX, a full core in a new game and in old saves) lives in mc-rules26.js

// ───────── a lost expedition: the haul is lost; the core pays a heart for the leader ─────────
M.FAIL_EXP = 0.5;
G.runFail = function () {
  const m = this.meta, run = this.run, h = run.hero, tut = !!(run.region && run.region.tut);
  // half of what the leader learned on the way stays with it (2026-09-26: a lost run still moves you on)
  const ex = tut ? 0 : Math.round(((run.loot && run.loot.exp) || 0) * M.FAIL_EXP); if (ex > 0) M.addExp(h, ex);
  const mx = M.heroMaxHp(h, m);
  const before = m.core == null ? M.CORE_MAX : m.core, after = tut ? before : Math.max(0, before - 1);
  m.core = after; h.hp = after > 0 ? mx : 1; h.relics = []; h.runs = (h.runs || 0) + 1; m.runs++;
  m.st = m.st || {}; m.st.fails = (m.st.fails || 0) + 1; if (!tut) m.st.deaths = (m.st.deaths || 0) + 1;
  if (!tut) this.pendingDay = true;
  this.save(); S.lose && S.lose();
  const card = { name: M.heroN(h), cls: h.cls, lv: h.lv, rarity: h.rarity, region: run.region.n };
  this.endInfo = { title: '探索失败', color: '#ff4a4a', sub: after > 0 ? M.heroN(h) + ' 倒在了' + run.region.n + '，这一趟的收获丢了，经验留下一半。' : '基地核心的最后一颗心保不住了。',
    tiles: [], lines: [{ k: '基地核心', v: after + ' / ' + M.CORE_MAX, c: after <= 1 ? '#ff4a4a' : '#ff8ab0' }].concat(ex > 0 ? [{ k: '经验', v: '+' + ex, c: '#9cff7a' }] : []), at: now(), gain: {}, revive: tut ? null : { card, before, after } };
  this.go('end');
};
// the rite is the first thing that happens back home
const oEB = G.endBack;
G.endBack = function () {
  const info = this.endInfo || {}, rv = info.revive; if (rv) this.coreShow = rv.before;
  oEB.apply(this, arguments);
  if (rv && this.homeQ) this.homeQ.steps.unshift({ run: () => this.reviveStart(rv), until: () => !this.rite });
};

// ───────── the rite ─────────
// 0 dim · card flies in, strains, tears · the keeper walks in, six candles light · four lines of the rite ·
// a heart leaves the core and flies into the tear · three beats stitch the halves along a golden seam · flash, 复活 ·
// the card flies home. With no heart left: the third line is the last, the card falls apart, the base goes up.
const T_IN = 0.8, T_RIP = 2.1, T_NPC = 3.0, T_LINES = 4.2, LINE = 1.45, CX = 960, CY = 500;
const lines = (rv) => {
  const cls = M.HEROES[rv.card.cls].n;
  if (rv.after <= 0) return ['长夜还没有结束，灯还亮着。', '机台记得每一个没有回来的人。', '……核心里，已经没有心了。'];
  return ['长夜还没有结束，灯还亮着。', '机台记得每一个没有回来的人。', rv.after === 1 ? '这是核心的最后一颗心。' : '以核心的一颗心，缝好你的名字。', '醒来吧，' + cls + '。'];
};
const timing = (rv) => { const L = lines(rv).length, tL = T_LINES + L * LINE, tH = tL + 0.2, tHit = tH + 1.2, tWhole = tHit + 2.1, tEnd = rv.after > 0 ? tWhole + 2.2 : tL + 2.6; return { L, tL, tH, tHit, tWhole, tEnd }; };
G.reviveStart = function (rv) {
  const st = this.fxPos('heroes') || { x: 240, y: 960 };
  this.rite = { rv, t: 0, T: timing(rv), start: st, seed: Math.random() * 100, beat: -1, lit: 0, line: -1, fired: {} };
  if (this.bv) this.bv.keepFree && this.bv.keepFree();
  S.drone && S.drone(); this.bump();
};
const once = (R, k, fn) => { if (!R.fired[k]) { R.fired[k] = 1; fn(); } };
G.riteTick = function (dt) {
  const R = this.rite; if (!R) return; R.t += dt; const t = R.t, T = R.T, rv = R.rv;
  // strain: a heartbeat that gets faster, then the rip
  if (t > T_IN && t < T_RIP) { const b = Math.floor((t - T_IN) / Math.max(0.16, 0.34 - (t - T_IN) * 0.12)); if (b !== R.beat) { R.beat = b; S.heart && S.heart(); this.fx.kick(2 + b * 0.5); } }
  if (t >= T_RIP) once(R, 'rip', () => { S.rip && S.rip(); S.shatter(); this.fx.kick(24); this.fx.flash(P.white, 0.3); for (let i = 0; i < 3; i++) this.fx.spark(CX, CY - 120 + i * 120, i % 2 ? P.cream : P.violet, 16, { dir: i % 2 ? Math.PI : 0, spread: 2.4, v: 800 }); });
  // the keeper and the candles
  if (t >= T_NPC) once(R, 'npc', () => { S.whoosh && S.whoosh(0.3); });
  const lit = Math.floor(cl((t - T_NPC - 0.5) / 0.14, 0, 6)); if (lit > R.lit) { R.lit = lit; S.tick && S.tick(lit); }
  // the rite, line by line
  const li = Math.floor((t - T_LINES) / LINE); if (t >= T_LINES && li < T.L && li !== R.line) { R.line = li; S.cast && S.cast(); }
  if (rv.after > 0) {
    // the heart leaves the core: the pip in the bar goes dark the moment it lifts off
    if (t >= T.tH) once(R, 'heart', () => { this.coreShow = null; const p = this.fxPos('core'); R.from = p || { x: 120, y: 50 }; S.whoosh && S.whoosh(0.6); this.pulse.core = now(); });
    if (t >= T.tHit) once(R, 'hit', () => { S.impact(); this.fx.kick(14); this.fx.flash('#ff2a4a', 0.25); });
    const bi = Math.floor((t - T.tHit) / 0.6); if (t > T.tHit && t < T.tWhole && bi !== R.hb) { R.hb = bi; S.heart && S.heart(); this.fx.kick(6 + bi * 3); }
    if (t >= T.tWhole) once(R, 'whole', () => { S.impact(); S.fanfare(); S.heal && S.heal(); this.fx.flash(P.white, 0.8); this.fx.kick(30); this.fx.rays(CX, CY, P.gold, 2.2, { r: 520 }); this.fx.confetti(120); });
    if (t >= T.tEnd - 0.7) once(R, 'home', () => { S.up && S.up(3); });
  } else {
    if (t >= T.tL + 0.3) once(R, 'crack', () => { this.coreShow = null; const p = this.fxPos('core') || { x: 120, y: 50 }; this.fx.explode(p.x, p.y, '#ff4a6a', 1.2); S.shatter(); this.fx.kick(20); this.pulse.core = now(); });
  }
  if (t >= T.tEnd) {
    this.rite = null; this.coreShow = null;
    if (rv.after <= 0) { if (this.homeQ) this.homeQ.steps.length = 0; this.coreQueue = { pd: false, hp: 0 }; }
    else { const p = this.fxPos('heroes'); if (p) { this.fx.pop(p.x, p.y - 90, '复活', P.gold, 44); this.fx.rays(p.x, p.y, P.gold, 1, { r: 180 }); } this.toast(rv.after === 1 ? '基地核心只剩最后 1 颗心了' : '基地核心还剩 ' + rv.after + ' 颗心', rv.after === 1 ? '#ff4a4a' : '#ff8ab0'); }
  }
  this.bump();
};

// ───────── drawing (screen space, on the fx layer) ─────────
function heartPx(x, a, b, s, c1, c2) {
  // 7×6 pixel heart, s px per cell
  const H = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  H.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '#') return; U.R(x, a + (i - 3.5) * s, b + (j - 3) * s, s, s, j < 2 && i < 3 ? c2 : c1); }));
}
function candle(x, a, b, on, t, i) {
  U.R(x, a - 9, b - 54, 18, 54, P.ink); U.R(x, a - 6, b - 51, 12, 48, P.cream); U.R(x, a - 6, b - 51, 4, 48, P.white);
  U.R(x, a - 14, b - 6, 28, 9, P.ink); U.R(x, a - 11, b - 3, 22, 3, P.brown || P.umber);
  if (!on) return;
  const fl = RM() ? 0 : Math.floor((t * 10 + i * 3) % 3) - 1;
  M.pxGlow && M.pxGlow(x, a, b - 70, 60, P.amber, 0.35);
  U.R(x, a - 6 + fl, b - 78, 12, 18, P.amber); U.R(x, a - 3 + fl, b - 72, 6, 10, P.butter); U.R(x, a - 2, b - 57, 4, 4, P.ink);
}
function runeRing(x, t, r, a, col) {
  if (a <= 0) return; x.save(); x.globalAlpha *= a; const n = 28, rot = RM() ? 0 : t * 0.35;
  for (let i = 0; i < n; i++) { const q = rot + i / n * Math.PI * 2, px = Math.round(CX + Math.cos(q) * r), py = Math.round(CY + Math.sin(q) * r * 0.9); U.R(x, px - 4, py - 4, i % 4 ? 6 : 10, i % 4 ? 6 : 10, i % 4 ? col : P.butter); }
  x.restore();
}
M.drawRite = function (x, g) {
  const R = g.rite; if (!R) return; const t = R.t, T = R.T, rv = R.rv, d = rv.card, card = M.tearCard(d), tp = R.path || (R.path = M.tearPath(R.seed));
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  const dim = t < T.tEnd - 0.6 ? cl(t / 0.5, 0, 1) : cl((T.tEnd - t) / 0.6, 0, 1);
  M.fxDim(x, 0.9 * dim);
  // floor of the rite: a dark altar strip, six candles, the rune ring behind the card
  const aA = cl((t - T_NPC) / 0.6, 0, 1) * dim;
  if (aA > 0) { x.save(); x.globalAlpha = aA; U.R(x, 360, 800, 1200, 12, P.ink); U.R(x, 360, 800, 1200, 3, P.dusk); [-3, -2, -1, 1, 2, 3].forEach((k, i) => candle(x, CX + k * 150 + (k > 0 ? -50 : 50), 800, i < R.lit, t, i)); x.restore(); }
  const whole = rv.after > 0 && t >= T.tWhole, mend = rv.after > 0 ? cl((t - T.tHit) / (T.tWhole - T.tHit), 0, 1) : 0;
  runeRing(x, t, 300, cl((t - T_LINES + 0.4) / 0.8, 0, 1) * dim * (whole ? 0 : 1), mend > 0 ? P.red : P.violet);
  // the card
  const st = R.start;
  if (t < T_RIP) {
    const q = eo(cl(t / T_IN, 0, 1)), px = st.x + (CX - st.x) * q, py = st.y + (CY - st.y) * q - Math.sin(q * Math.PI) * 160, sc = 0.35 + 0.65 * eback(cl(t / T_IN, 0, 1));
    const strain = cl((t - T_IN) / (T_RIP - T_IN), 0, 1), sh = strain * strain * 12, jig = () => (RM() ? 0 : Math.round((Math.random() - 0.5) * sh));
    x.save(); x.translate(px + jig(), py + jig()); x.scale(sc, sc); M.pxGlow && M.pxGlow(x, 0, 0, 260, U.pal(M.RARITY[d.rarity].c), 0.2 + strain * 0.3); x.drawImage(card, -150, -210);
    if (strain > 0) { const n = Math.floor(strain * tp.length); x.strokeStyle = P.white; x.lineWidth = strain > 0.6 ? 6 : 3; x.beginPath(); tp.slice(0, Math.max(2, n)).forEach(([a, b], i) => i ? x.lineTo(a - 150, b - 210) : x.moveTo(a - 150, b - 210)); x.stroke(); }
    x.restore();
  } else if (!whole) {
    // two halves hang apart; the heart pulls them back together (or, with no heart, they fall)
    const u = t - T_RIP, fall = rv.after > 0 ? 0 : cl((t - T.tL - 0.3) / 1.6, 0, 1);
    const apart = (70 + Math.min(1, u / 0.5) * 40) * (1 - eo(mend)), bob = RM() ? 0 : Math.sin(u * 2.2) * 8;
    [-1, 1].forEach(side => {
      x.save(); x.translate(CX + side * (apart + fall * 260), CY + bob * side + fall * fall * 700); x.rotate(side * (0.09 * (1 - mend) + fall * 1.2)); x.globalAlpha = 1 - fall * 0.8;
      x.beginPath(); if (side < 0) { x.moveTo(-150, -210); tp.forEach(([a, b]) => x.lineTo(a - 150, b - 210)); x.lineTo(-150, 210); } else { x.moveTo(150, -210); tp.forEach(([a, b]) => x.lineTo(a - 150, b - 210)); x.lineTo(150, 210); } x.closePath();
      x.save(); x.clip(); x.drawImage(card, -150, -210); x.fillStyle = 'rgba(7,6,15,' + (0.45 * (1 - mend)) + ')'; x.fillRect(-150, -210, 300, 420); x.restore();
      x.strokeStyle = mend > 0 ? (mend > 0.7 ? P.gold : P.red) : P.cream; x.lineWidth = 6; x.beginPath(); tp.forEach(([a, b], i) => i ? x.lineTo(a - 150 + side * 2, b - 210) : x.moveTo(a - 150 + side * 2, b - 210)); x.stroke();
      x.restore();
    });
    // red threads while mending: zigzag stitches across the gap
    if (mend > 0 && mend < 1) { x.save(); x.strokeStyle = P.red; x.lineWidth = 4; const n = 9; x.beginPath(); for (let i = 0; i <= n * mend; i++) { const [a, b] = tp[Math.min(tp.length - 1, Math.round(i / n * (tp.length - 1)))], y0 = CY + b - 210, xx = CX + a - 150; x.moveTo(xx - apart - 10, y0); x.lineTo(xx + apart + 10, y0 + 20); } x.stroke(); x.restore(); }
    // the soul lingers in the gap
    if (rv.after > 0 || fall < 1) M.pxGlow && M.pxGlow(x, CX, CY, 110 + Math.sin(t * 3) * 10, mend > 0 ? P.red : P.violet, 0.5 * (1 - fall));
  } else {
    // whole again: the card with a gold seam scar, rising, then flying home
    const u = t - T.tWhole, home = cl((u - 1.4) / 0.8, 0, 1), q = eo(home), hp = g.fxPos('heroes') || st;
    const px = CX + (hp.x - CX) * q, py = CY - Math.min(1, u / 0.4) * 30 + (hp.y - CY + 30) * q, sc = (1 + 0.08 * Math.max(0, 1 - u / 0.4)) * (1 - 0.65 * q);
    x.save(); x.translate(px, py); x.scale(sc, sc); M.pxGlow && M.pxGlow(x, 0, 0, 300, P.gold, 0.45 * (1 - q)); x.drawImage(card, -150, -210);
    x.strokeStyle = P.gold; x.lineWidth = 5; x.beginPath(); tp.forEach(([a, b], i) => i ? x.lineTo(a - 150, b - 210) : x.moveTo(a - 150, b - 210)); x.stroke(); x.restore();
  }
  // the heart: out of the core, along an arc, into the tear; three beats while it mends
  if (rv.after > 0 && t >= T.tH && !whole) {
    const f = R.from || { x: 120, y: 50 }, q = cl((t - T.tH) / (T.tHit - T.tH), 0, 1), e = q * q * (3 - 2 * q);
    const hx = f.x + (CX - f.x) * e, hy = f.y + (CY - f.y) * e - Math.sin(e * Math.PI) * 220, beat = t > T.tHit ? Math.max(0, 1 - ((t - T.tHit) % 0.6) / 0.25) : 0, s = Math.round(12 + beat * 6 + (1 - q) * 2);
    if (q < 1 && !RM()) for (let k = 1; k <= 6; k++) { const e2 = Math.max(0, e - k * 0.035); U.R(x, f.x + (CX - f.x) * e2 - 4, f.y + (CY - f.y) * e2 - Math.sin(e2 * Math.PI) * 220 - 4, 8, 8, k % 2 ? P.red : P.pink); }
    M.pxGlow && M.pxGlow(x, hx, hy, 90 + beat * 60, P.red, 0.6);
    heartPx(x, Math.round(hx), Math.round(hy), s, P.red, P.pink);
  }
  // the keeper: rises from the left of the altar, raises its hands while speaking
  if (t >= T_NPC && dim > 0) {
    const q = eo(cl((t - T_NPC) / 0.9, 0, 1)), speaking = t >= T_LINES && t < T.tL, st2 = speaking ? (Math.floor(t * 4) % 2 ? 'cast' : 'charge') : q < 1 ? 'walk' : 'idle';
    const im = M.P16 && M.P16.img('Bishop', st2, Math.floor(t * 6), null, 230);
    if (im) { x.save(); x.globalAlpha = q * dim; x.translate(Math.round(480 + (1 - q) * -160), 790); x.drawImage(im, -im.cx, -im.footY); x.restore(); M.pxGlow && M.pxGlow(x, 480, 640, 140, P.butter, 0.18 * q); }
  }
  // the rite: typed line by line under the card
  if (t >= T_LINES && dim > 0) {
    const L = lines(rv), li = Math.min(L.length - 1, Math.floor((t - T_LINES) / LINE)), u = t - T_LINES - li * LINE, s = L[li], n = Math.min(s.length, Math.floor(u / 0.05));
    const a = cl((T.tH + 0.8 - t) / 0.5, 0, 1) * (rv.after > 0 ? 1 : cl((T.tEnd - 0.4 - t) / 0.5, 0, 1));
    if (a > 0) { x.save(); x.globalAlpha = a; U.plate(x, 560, 850, 800, 110, { ring: rv.after > 0 ? P.red : P.haze }); U.text(x, s.slice(0, n), CX, 905, 40, li === L.length - 1 ? (rv.after > 0 ? P.butter : P.pink) : P.cream, { outline: true }); x.restore(); }
  }
  // titles
  if (t > 2.3 && t < T.tWhole) { const a = cl((t - 2.3) / 0.4, 0, 1) * cl((T.tWhole - t) / 0.4, 0, 1) * dim; x.save(); x.globalAlpha = a; U.text(x, '领袖倒下', CX, 196, 80, P.red, { outline: true }); x.restore(); }
  if (whole) { const u = t - T.tWhole, a = cl(u / 0.2, 0, 1) * cl((T.tEnd - 0.3 - t) / 0.4, 0, 1), sc = 1 + 0.5 * Math.max(0, 1 - u / 0.25);
    x.save(); x.globalAlpha = a; x.translate(CX, 190); x.scale(sc, sc); U.text(x, '复活', 0, 0, 104, P.gold, { outline: true, ramp: true }); x.restore();
    x.save(); x.globalAlpha = a; U.text(x, '基地核心 ' + rv.after + ' / ' + M.CORE_MAX, CX, 752, 34, rv.after === 1 ? P.red : P.pink, { outline: true }); x.restore(); }
  x.restore();
};

// ───────── hooks ─────────
const oTick = G.tick;
G.tick = function (dt) { oTick.call(this, dt); if (this.rite && !this.fx.frozen) this.riteTick(Math.min(dt || 0, 0.05)); };
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) { const g = M._g, r = oD.call(this, ctx, noClear); if (g && this === g.fx && g.rite) { ctx.save(); try { M.drawRite(ctx, g); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('rite: ' + e.message); g.rite = null; g.coreShow = null; } ctx.restore(); } return r; };
const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  if (this.rite) { v.coverOn = true; v.tipOn = false; v.pnOn = false; }
  // the bar keeps showing the heart until it lifts off
  if (v.b && this.meta) { const c = this.coreShow != null ? this.coreShow : (this.meta.core == null ? M.CORE_MAX : this.meta.core); v.b.cores = [0, 1, 2].map(i => ({ img: M.iconURL(i < c ? 't_heart' : 'r_skel', 2), op: i < c ? 1 : 0.35 })); v.b.coreC = c <= 1 ? '#ff4a4a' : '#ff8ab0'; }
  return v;
};
// the rite is on screen: nothing else starts (the queue waits for it)
const oBusy = G.guideBusy;
if (oBusy) G.guideBusy = function () { return !!this.rite || oBusy.apply(this, arguments); };
// a new game or a reset never keeps a rite half-done
const oNG = G.newGame;
if (oNG) G.newGame = function () { this.rite = null; this.coreShow = null; return oNG.apply(this, arguments); };
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'b-core') { const m = this.meta, c = m.core == null ? M.CORE_MAX : m.core; return { title: '基地核心 ' + c + '/' + M.CORE_MAX, c: '#ff8ab0', icon: 't_heart', d: '探索失败时献出一颗心救回领袖；通关一个场景补回一颗。', lines: [{ t: '一颗都不剩时游戏结束', c: '#ff8a8a' }] }; }
  return oTip.apply(this, arguments);
};
})();

;
