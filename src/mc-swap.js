// ==== mc-swap.js ====
(function () {
// An army past its size lets one go (user ruling 2026-09-27: 「如果队伍中没有位置了，那么不是不能选，而是选完之后，必须替换，才能继续游戏。
// 抽卡也一样。其他的获取部队的方式都一样，先获取，再替换，然后才能继续推进。而且替换的时候要把队伍摆开，替换完成后，要有一个把队伍放回
// 卡盒的动画效果。而且离队不能换钱」). Every way a unit arrives (a shop, a pack, a recruit flag, an event, a reward) puts it in
// the army first; when the army is over its size and nothing is left to merge, the game stops for this:
// · the card box at the army bar opens and the whole army flies out and fans into a row of cards (the new ones marked 新);
// · the player picks one (click, or ← → and Enter) — it takes a red 离队 stamp and falls away; its copies go back to the pool
//   (mc-pool.js), no money;
// · the rest fly back into the box, the lid snaps shut, and the game goes on.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (t) => 1 - Math.pow(1 - cl(t, 0, 1), 3);
const eb = (t) => { t = cl(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const CW = 180, CH = 250, GAP = 18, CY = 560, T_IN = 0.55, T_OUT = 0.6, T_PACK = 0.75;
const imgC = new Map(); const img = (k) => { if (imgC.has(k)) return imgC.get(k); let c = null; try { c = M.spriteCanvas(k, 6); } catch (e) {} imgC.set(k, c); return c; };
const tutOf = (run) => !!(run && ((run.region && run.region.tut) || run.tut));
const over = (g) => { const run = g.run; return !!(run && !tutOf(run) && !run.raid && run.roster && run.roster.length > M.rosterCap(run)); };
// anything that must finish first: a merge that would free the place, a show, a window
const waitFor = (g) => !!(g.evoFx || g.mini || g.modal || g.chest || g.reel || g.settle || g.cardFx || g.storyFx || g.parade || g.trans || g.guide || g.rulesOpen || g.settingsOpen || (g.gaActive && g.gaActive()) || (g.battle && g.screen === 'battle') || (g.run && M.evoFind && M.evoFind(g.run)) || (M._tu && M._tu.step && M._tu.demoOn));
M.swapNeeded = (g) => over(g);
G.swapStart = function () {
  const run = this.run, cap = M.rosterCap(run), list = run.roster.slice(), n = list.length;
  const w = Math.min(1, 1760 / (n * (CW + GAP))), from = this.fxPos('roster') || { x: 150, y: 960 };
  const cards = list.map((u, i) => ({ u, isNew: i >= cap, x: 960 + (i - (n - 1) / 2) * (CW + GAP) * w, y: CY, at: 0.1 + i * 0.05 }));
  this.swapFx = { t: 0, cards, sc: w, ph: 'in', chosen: -1, hov: cards.findIndex(c => c.isNew), box: from, last: now() };
  this.tipData = null; S.whoosh && S.whoosh(0.5); this.bump();
};
G.swapPick = function (i) {
  const F = this.swapFx; if (!F || F.ph !== 'pick' || i < 0 || i >= F.cards.length) return;
  F.chosen = i; F.ph = 'out'; F.t0 = F.t; S.stamp ? S.stamp() : S.click && S.click(); this.bump();
};
// the army leaves the table: the chosen one goes, its copies back to the pool (nothing paid)
function release(g, F) {
  const run = g.run, u = F.cards[F.chosen].u; run.roster = run.roster.filter(x => x !== u); if (g.sel === u.uid) g.sel = null;
  g.fx && g.fx.pop && g.fx.pop(F.box.x + 60, F.box.y - 60, DB[u.type].n + ' 离队', Q[DB[u.type].q].c, 30, { rise: 40 });
}
const hit = (F, x, y) => F.cards.findIndex(c => Math.abs(x - c.x) < CW * F.sc / 2 + 6 && Math.abs(y - c.y) < CH * F.sc / 2 + 6);
const ptr = { x: 960, y: 540 };
window.addEventListener('pointermove', (e) => { const g = M._g; if (!g || !g.swapFx || !g.miniPt) return; const p = g.miniPt(e.clientX, e.clientY); ptr.x = p.x; ptr.y = p.y; const F = g.swapFx; if (F.ph === 'pick') { const i = hit(F, p.x, p.y); if (i >= 0 && i !== F.hov) { F.hov = i; S.hover && S.hover(); } } }, true);
G.swapClick = function (e) { const F = this.swapFx; if (!F) return; if (F.ph === 'in') { F.t = T_IN + 0.5; return; } if (F.ph !== 'pick') return; const p = e && e.clientX != null && this.miniPt ? this.miniPt(e.clientX, e.clientY) : ptr, i = hit(F, p.x, p.y); if (i >= 0) this.swapPick(i); };
const oKey = G.handleKey;
G.handleKey = function (ev) {
  const F = this.swapFx;
  if (F && ev) { if (ev.type === 'keydown' && F.ph === 'pick') { const k = ev.code || ev.key;
      if (/ArrowLeft|KeyA/.test(k)) F.hov = Math.max(0, F.hov - 1); else if (/ArrowRight|KeyD/.test(k)) F.hov = Math.min(F.cards.length - 1, F.hov + 1); else if (/Enter|Space/.test(k)) this.swapPick(F.hov); }
    ev.preventDefault && ev.preventDefault(); return; }
  return oKey ? oKey.apply(this, arguments) : undefined;
};
// ───────── drawing ─────────
function box(g, x, y, open) {   // the card box: a lacquered case, its lid lifted by `open` (0…1)
  const W = 120, H = 70; g.save(); g.translate(Math.round(x), Math.round(y));
  U.R(g, -W / 2 + 6, -H / 2 + 6, W, H, P.ink); U.box(g, -W / 2, -H / 2, W, H, P.wine); U.R(g, -W / 2, -H / 2, W, 5, P.red); U.R(g, -8, -6, 16, 12, P.gold);
  g.save(); g.translate(-W / 2, -H / 2); g.rotate(-open * 1.1); U.R(g, 0, -18, W, 18, P.red); U.R(g, 0, -18, W, 4, P.pink); g.restore();
  g.restore();
}
function card(g, c, x, y, k, a, hot, chosen) {
  const d = DB[c.u.type]; if (!d) return; const q = d.q || 0, qc = Q[q].c;
  g.save(); g.globalAlpha = a; g.translate(Math.round(x), Math.round(y)); g.scale(k, k);
  if (hot) { g.globalAlpha = a * 0.5; U.R(g, -CW / 2 - 10, -CH / 2 - 10, CW + 20, CH + 20, P.butter); g.globalAlpha = a; }
  U.R(g, -CW / 2 + 6, -CH / 2 + 6, CW, CH, P.ink); U.box(g, -CW / 2, -CH / 2, CW, CH, P.night);
  g.globalAlpha = a * 0.28; U.R(g, -CW / 2, -CH / 2, CW, CH * 0.5, qc); g.globalAlpha = a;
  [[-CW / 2 + 4, -CH / 2 + 4, CW - 8, 4], [-CW / 2 + 4, CH / 2 - 8, CW - 8, 4], [-CW / 2 + 4, -CH / 2 + 4, 4, CH - 8], [CW / 2 - 8, -CH / 2 + 4, 4, CH - 8]].forEach(r => U.R(g, r[0], r[1], r[2], r[3], hot ? P.butter : qc));
  const im = img(c.u.type); if (im) { const f = Math.min(140 / im.width, 120 / im.height, 3); g.save(); g.imageSmoothingEnabled = false; g.translate(0, -48); g.scale(f, f); g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }
  U.text(g, d.n, 0, 40, 26, qc, { outline: true });
  const tg = d.race && M.tagIc ? M.tagIc('race', d.race) : null; U.text(g, (d.race || '') + ' · ' + (d.voc || ''), 0, 74, 18, tg ? tg.c : P.cream);
  U.text(g, '★ ' + M.unitPower(c.u.type, c.u), 0, 100, 20, P.butter);
  if (c.isNew) { U.R(g, -CW / 2, -CH / 2 - 14, 58, 30, P.gold); U.text(g, '新', -CW / 2 + 29, -CH / 2 + 1, 22, P.ink, { shadow: false }); }
  if (chosen) { g.save(); g.rotate(-0.25); U.R(g, -70, -28, 140, 56, P.ink); U.box(g, -66, -24, 132, 48, P.red); U.text(g, '离队', 0, 0, 34, P.cream, { outline: true }); g.restore(); }
  g.restore();
}
function draw(ctx, g, F) {
  const T = F.t; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const packQ = F.ph === 'pack' ? cl((T - F.t0) / T_PACK, 0, 1) : 0, fade = F.ph === 'pack' ? 1 - cl((packQ - 0.6) / 0.4, 0, 1) : cl(T / 0.25, 0, 1);
  U.dim(ctx, 0.82 * fade);
  ctx.globalAlpha = fade; U.text(ctx, '队伍满了：选一支离队', 960, 250, 48, P.gold, { outline: true }); ctx.globalAlpha = 1;
  const open = F.ph === 'in' ? cl(T / 0.2, 0, 1) : F.ph === 'pack' ? 1 - cl((packQ - 0.75) / 0.2, 0, 1) : 1;
  box(ctx, F.box.x + 40, F.box.y - 40, open);
  F.cards.forEach((c, i) => {
    let x = c.x, y = c.y, k = F.sc, a = 1;
    if (F.ph === 'in') { const q = eo((T - c.at) / 0.4); if (q <= 0) return; x = F.box.x + 40 + (c.x - F.box.x - 40) * q; y = F.box.y - 40 + (c.y - F.box.y + 40) * q - Math.sin(q * Math.PI) * 120; k = F.sc * (0.3 + 0.7 * q); }
    if (F.ph === 'pick' && i === F.hov) y -= 18 + 4 * Math.sin(T * 5);
    if (F.ph === 'out' && i === F.chosen) { const q = cl((T - F.t0) / T_OUT, 0, 1); y += q * q * 380; a = 1 - q; k = F.sc * (1 + 0.15 * (1 - q)); }
    if (F.ph === 'pack') { if (i === F.chosen) return; const q = eo(cl((T - F.t0 - Math.abs(i - (F.cards.length - 1) / 2) * 0.04) / (T_PACK * 0.8), 0, 1)); x = c.x + (F.box.x + 40 - c.x) * q; y = c.y + (F.box.y - 40 - c.y) * q - Math.sin(q * Math.PI) * 90; k = F.sc * (1 - 0.8 * q); a = 1 - cl((q - 0.85) / 0.15, 0, 1); }
    card(ctx, c, x, y, k, a, F.ph === 'pick' && i === F.hov, F.ph !== 'in' && i === F.chosen);
  });
  if (F.ph === 'pick') { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点一张', 960, 900, 30, P.cream, { outline: true }); ctx.globalAlpha = 1; }
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments);
  const F = this.swapFx;
  if (!F) { if (over(this) && (this.screen === 'world' || this.screen === 'shop') && !waitFor(this)) this.swapStart(); return r; }
  const t1 = now(); F.t += Math.min(0.05, (t1 - F.last) / 1000); F.last = t1;
  if (F.ph === 'in' && F.t >= T_IN + 0.1 + F.cards.length * 0.05) { F.ph = 'pick'; this.bump(); }
  if (F.ph === 'out' && F.t - F.t0 >= T_OUT) { release(this, F); F.ph = 'pack'; F.t0 = F.t; S.whoosh && S.whoosh(0.4); this.bump(); }
  if (F.ph === 'pack' && F.t - F.t0 >= T_PACK) { this.swapFx = null; S.land && S.land(3); this.pulse && (this.pulse.roster = now()); this.bump(); if (over(this)) this.swapStart(); return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), this, F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('swap: ' + e.message); } }
  return r;
};
// nothing moves on while the army is over its size
const oLS = G.longShow; G.longShow = function () { return !!this.swapFx || (oLS ? oLS.apply(this, arguments) : false); };
['worldMove', 'worldClick', 'leaveShop', 'refresh', 'gachaPull', 'buy'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { if (this.swapFx) return; return o.apply(this, arguments); }; });
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.swapFx) { v.fxZ = 82; v.coverOn = true; v.coverClick = (e) => this.swapClick(e); v.tipOn = false; } return v; };
})();
