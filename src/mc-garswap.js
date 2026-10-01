// ==== mc-garswap.js ====
(function () {
// A garrison past its cap asks who leaves (user ruling 2026-09-27: 「如果超过上限，不能直接替换，而是应该玩家自己选择，替换哪个」): the
// whole garrison is laid out in a grid (the newcomer marked 新), the player picks one — the newcomer too, if it is the one to
// go — it takes a red 离开 stamp and falls away, the rest fly back to the garrison row. The one who leaves turns into a third
// of its price in supplies, as before. Nothing else moves on the base while it is up.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (t) => 1 - Math.pow(1 - cl(t, 0, 1), 3);
const CW = 150, CH = 208, GAP = 14, COLS = 10, T_IN = 0.45, T_OUT = 0.55, T_PACK = 0.6;
const imgC = new Map(); const img = (k) => { if (imgC.has(k)) return imgC.get(k); let c = null; try { c = M.spriteCanvas(k, 6); } catch (e) { /* no picture */ } imgC.set(k, c); return c; };
const garOf = (m) => (M.garrisonOf ? M.garrisonOf(m) : (m && m.garrison) || []);
const capOf = (m) => (M.garCap ? M.garCap(m) : 30);
// m.garOut: how many must leave (a homecoming past the cap adds one; a garrison already past it never has to shrink below that)
M.garOver = (m) => !!(m && (m.garOut || 0) > 0);
const busy = (g) => !!(g.parade || g.rite || g.evoFx || g.modal || g.storyFx || g.homeQ || g.night || g.raid || g.settingsOpen || g.rulesOpen || g.swapFx);
G.garSwapStart = function () {
  const m = this.meta, gar = garOf(m).slice(), n = gar.length, cols = Math.min(COLS, n), rows = Math.ceil(n / cols);
  const k = Math.min(1, 1700 / (cols * (CW + GAP)), 700 / (rows * (CH + GAP))), from = this.fxPos('garrow') || { x: 300, y: 1000 };
  const cards = gar.map((u, i) => { const c = i % cols, r = Math.floor(i / cols); return { u, isNew: (m.garNewIds || []).includes(u.uid), x: 960 + (c - (cols - 1) / 2) * (CW + GAP) * k, y: 560 + (r - (rows - 1) / 2) * (CH + GAP) * k, at: 0.05 + i * 0.02 }; });
  this.garSwapFx = { t: 0, cards, sc: k, ph: 'in', chosen: -1, hov: Math.max(0, cards.findIndex(c => c.isNew)), box: from, last: now() };
  this.tipData = null; S.whoosh && S.whoosh(0.5); this.bump();
};
G.garSwapPick = function (i) {
  const F = this.garSwapFx; if (!F || F.ph !== 'pick' || i < 0 || i >= F.cards.length) return;
  F.chosen = i; F.ph = 'out'; F.t0 = F.t; S.stamp ? S.stamp() : S.click && S.click(); this.bump();
};
function release(g, F) {
  const m = g.meta, u = F.cards[F.chosen].u, gar = garOf(m), i = gar.indexOf(u); if (i >= 0) gar.splice(i, 1);
  const sup = Math.round(((DB[u.type] && DB[u.type].cost) || 10) * 0.3); m.supplies += sup; m.garOut = Math.max(0, (m.garOut || 0) - 1); if (!m.garOut) m.garNewIds = [];
  g.fx && g.fx.pop && g.fx.pop(F.box.x + 80, F.box.y - 80, DB[u.type].n + ' 离开 · +' + sup + ' 物资', Q[DB[u.type].q].c, 30, { rise: 40 }); g.save && g.save();
}
const hit = (F, x, y) => F.cards.findIndex(c => Math.abs(x - c.x) < CW * F.sc / 2 + 5 && Math.abs(y - c.y) < CH * F.sc / 2 + 5);
const ptr = { x: 960, y: 540 };
window.addEventListener('pointermove', (e) => { const g = M._g; if (!g || !g.garSwapFx || !g.miniPt) return; const p = g.miniPt(e.clientX, e.clientY); ptr.x = p.x; ptr.y = p.y; const F = g.garSwapFx; if (F.ph === 'pick') { const i = hit(F, p.x, p.y); if (i >= 0) F.hov = i; } });
G.garSwapClick = function (e) { const F = this.garSwapFx; if (!F) return; if (F.ph === 'in') { F.t = T_IN + 1; return; } if (F.ph !== 'pick') return; const p = e && e.clientX != null && this.miniPt ? this.miniPt(e.clientX, e.clientY) : ptr, i = hit(F, p.x, p.y); if (i >= 0) this.garSwapPick(i); };
const oKey = G.handleKey;
G.handleKey = function (ev) {
  const F = this.garSwapFx;
  if (F && ev) { if (ev.type === 'keydown' && F.ph === 'pick') { const k = ev.code || ev.key, cols = Math.min(COLS, F.cards.length);
      if (/ArrowLeft|KeyA/.test(k)) F.hov = Math.max(0, F.hov - 1); else if (/ArrowRight|KeyD/.test(k)) F.hov = Math.min(F.cards.length - 1, F.hov + 1);
      else if (/ArrowUp|KeyW/.test(k)) F.hov = Math.max(0, F.hov - cols); else if (/ArrowDown|KeyS/.test(k)) F.hov = Math.min(F.cards.length - 1, F.hov + cols); else if (/Enter|Space/.test(k)) this.garSwapPick(F.hov); }
    ev.preventDefault && ev.preventDefault(); return; }
  return oKey ? oKey.apply(this, arguments) : undefined;
};
function card(g, c, x, y, k, a, hot, chosen) {
  const d = DB[c.u.type]; if (!d) return; const q = d.q || 0, qc = Q[q].c;
  g.save(); g.globalAlpha = a; g.translate(Math.round(x), Math.round(y)); g.scale(k, k);
  if (hot) { g.globalAlpha = a * 0.5; U.R(g, -CW / 2 - 10, -CH / 2 - 10, CW + 20, CH + 20, P.butter); g.globalAlpha = a; }
  U.R(g, -CW / 2 + 6, -CH / 2 + 6, CW, CH, P.ink); U.box(g, -CW / 2, -CH / 2, CW, CH, P.night);
  g.globalAlpha = a * 0.28; U.R(g, -CW / 2, -CH / 2, CW, CH * 0.5, qc); g.globalAlpha = a;
  [[-CW / 2 + 4, -CH / 2 + 4, CW - 8, 4], [-CW / 2 + 4, CH / 2 - 8, CW - 8, 4], [-CW / 2 + 4, -CH / 2 + 4, 4, CH - 8], [CW / 2 - 8, -CH / 2 + 4, 4, CH - 8]].forEach(r => U.R(g, r[0], r[1], r[2], r[3], hot ? P.butter : qc));
  const im = img(c.u.type); if (im) { const f = Math.min(116 / im.width, 100 / im.height, 3); g.save(); g.imageSmoothingEnabled = false; g.translate(0, -40); g.scale(f, f); g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }
  U.text(g, d.n, 0, 34, 22, qc, { outline: true });
  U.text(g, (d.voc || ''), 0, 62, 18, P.cream);
  U.text(g, '★ ' + M.unitPower(c.u.type, c.u), 0, 86, 18, P.butter);
  // the tab is as wide as its word: 「新」 in Chinese, longer in other languages (src/mc-i18n.js)
  if (c.isNew) { const lb = M.tr ? M.tr('新') : '新', tw = Math.max(52, Math.ceil(U.measure(g, lb, 20)) + 18); U.R(g, -CW / 2, -CH / 2 - 14, tw, 28, P.gold); U.text(g, lb, -CW / 2 + tw / 2, -CH / 2, 20, P.ink, { shadow: false }); }
  if (chosen) { g.save(); g.rotate(-0.25); U.R(g, -64, -26, 128, 52, P.ink); U.box(g, -60, -22, 120, 44, P.red); U.text(g, '离开', 0, 0, 30, P.cream, { outline: true }); g.restore(); }
  g.restore();
}
function draw(ctx, g, F) {
  const T = F.t; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const packQ = F.ph === 'pack' ? cl((T - F.t0) / T_PACK, 0, 1) : 0, fade = F.ph === 'pack' ? 1 - cl((packQ - 0.6) / 0.4, 0, 1) : cl(T / 0.25, 0, 1);
  U.dim(ctx, 0.84 * fade);
  ctx.globalAlpha = fade; U.text(ctx, '驻军满了：选一支离开', 960, 120, 46, P.gold, { outline: true }); U.text(ctx, '驻军 ' + F.cards.length + ' / ' + capOf(g.meta), 960, 172, 26, P.cream, { outline: true }); ctx.globalAlpha = 1;
  F.cards.forEach((c, i) => {
    let x = c.x, y = c.y, k = F.sc, a = 1;
    if (F.ph === 'in') { const q = eo((T - c.at) / 0.35); if (q <= 0) return; x = F.box.x + (c.x - F.box.x) * q; y = F.box.y + (c.y - F.box.y) * q - Math.sin(q * Math.PI) * 100; k = F.sc * (0.3 + 0.7 * q); }
    if (F.ph === 'pick' && i === F.hov) y -= 12 + 3 * Math.sin(T * 5);
    if (F.ph === 'out' && i === F.chosen) { const q = cl((T - F.t0) / T_OUT, 0, 1); y += q * q * 360; a = 1 - q; }
    if (F.ph === 'pack') { if (i === F.chosen) return; const q = eo(cl((T - F.t0) / (T_PACK * 0.8), 0, 1)); x = c.x + (F.box.x - c.x) * q; y = c.y + (F.box.y - c.y) * q; k = F.sc * (1 - 0.7 * q); a = 1 - q * 0.6; }
    card(ctx, c, x, y, k, a, F.ph === 'pick' && i === F.hov, F.ph !== 'in' && i === F.chosen);
  });
  if (F.ph === 'pick') { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点一张', 960, 1010, 28, P.cream, { outline: true }); ctx.globalAlpha = 1; }
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  const F = this.garSwapFx;
  if (!F) { if (m && this.screen === 'base' && M.garOver(m) && !busy(this)) this.garSwapStart(); return r; }
  const t1 = now(); F.t += Math.min(0.05, (t1 - F.last) / 1000); F.last = t1;
  if (F.ph === 'in' && F.t >= T_IN + 0.1 + F.cards.length * 0.02) { F.ph = 'pick'; this.bump(); }
  if (F.ph === 'out' && F.t - F.t0 >= T_OUT) { release(this, F); F.ph = 'pack'; F.t0 = F.t; S.whoosh && S.whoosh(0.4); this.bump(); }
  if (F.ph === 'pack' && F.t - F.t0 >= T_PACK) { this.garSwapFx = null; S.land && S.land(3); if (this.pulse) this.pulse.mgar = now(); this.bump(); return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), this, F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('garswap: ' + e.message); } }
  return r;
};
// nothing else starts on the base while it is up (the day, the portal, a room)
const oBusy = G.baseBusy; G.baseBusy = function () { return !!this.garSwapFx || (oBusy ? oBusy.apply(this, arguments) : false); };
// ending the day or setting off waits for the choice (the homecoming queue asks for it before the night, mc-night.js)
['restDay', 'openWorlds'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { if (this.garSwapFx || (this.meta && M.garOver(this.meta) && this.screen === 'base')) { if (!this.garSwapFx && !busy(this)) this.garSwapStart(); return; } return o.apply(this, arguments); }; });
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.garSwapFx) { v.fxZ = 82; v.coverOn = true; v.coverClick = (e) => this.garSwapClick(e); v.tipOn = false; } return v; };
})();
