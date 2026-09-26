// ==== mc-spend.js ====
(function () {
// Things are there to be used (user question 2026-09-26: 「道具不舍得用，技能不舍得用，有钱也不会去买道具和战旗，只会买部队。
// 局外……建筑不舍得建，因为要找合适的地形」 — the rules made holding back the right play).
// · The leader's skill is ready at the start of every fight, once per fight (no cooldown carried across the map), so a
//   normal fight never costs you the boss's skill. What shortened the cooldown now makes the skill stronger.
// · 支援道具 the expedition carries come back: every shop right before a boss fills the slots you emptied, so an item
//   used on the way is not missed at the boss. An emptied slot shows the item faintly until then.
// · The night market says what a banner is worth to the army you have (战力 +N), like a unit says its own power.
// · A built room can move (搬迁): 30 supplies, at once, to any empty room — building now and moving it onto the right
//   vein later loses nothing.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, P = M.PJ.PAL, B_ = M.BUILDINGS, now = () => performance.now();
const B2P = M.Battle2 && M.Battle2.prototype;

// ───────── the skill: every fight ─────────
if (B2P) { const oCast = B2P.castSkill; B2P.castSkill = function () { const r = oCast.apply(this, arguments); if (this.run) this.run.skillCd = 0; return r; }; }
// what used to shorten the cooldown (布达拉宫, 时之沙, 神秘术, a relic's 技能 line) now makes the skill stronger
M.skillPow = function (h, m) {
  m = m || (M._g && M._g.meta); if (!h || !m) return 0;
  const hm = M.heroMods(h, m), bm = M.baseMods(m);
  return Math.max(0, 0.2 * (-(bm.skillNodeCd || 0) - (hm.skillNode || 0)) + Math.max(0, -(hm.skillCd || 0)));
};
const oSV = M.skillVal; M.skillVal = (h) => oSV(h) * (1 + M.skillPow(h));
M.heroSkillD = (h) => M.skillDesc(h) + '，每场战斗一开始就能用。';
if (M.STATS && M.STATS.skillCd) M.STATS.skillCd.d = '领袖技能效果 +{v}%';
if (M.TALENTS && M.TALENTS.mystic) M.TALENTS.mystic.d = (v) => '领袖技能效果 +' + v * 20 + '%。';
if (B_.potala) B_.potala.d = '每天产出 3 信仰值；领袖技能效果 +20%。';
const HG = M.TILES && M.TILES.hourglass; if (HG) { HG.anyD = '领袖技能效果 +20%'; HG.d = '任何房间：' + HG.anyD + '。契合「' + HG.fitN + '」：' + HG.fitD + '。'; }
const oView0 = G.view;
G.view = function () { const v = oView0.call(this); if (v.w && this.run) { v.w.skillTxt = '每场 1 次'; v.w.skillC = '#ffcf4a'; v.w.pips = []; } return v; };

// ───────── 支援道具 come back before every boss ─────────
M.itemPrice = () => 70;   // worth more now that it comes back
const own = (run) => run.itemOwn || (run.itemOwn = [null, null, null]);
M.itemSync = (run) => { if (!run || !run.items) return; const o = own(run); run.items.forEach((k, i) => { if (k) o[i] = k; }); };
M.itemRefill = function (run) {
  if (!run || !run.items) return []; M.itemSync(run); const o = own(run), back = [];
  run.items.forEach((k, i) => { if (!k && o[i] && M.ITEMS[o[i]]) { run.items[i] = o[i]; run.itemQ[i] = 0; back.push(i); } });
  return back;
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); if (this.run) M.itemSync(this.run); return r; };
const oShop = G.openShop;
G.openShop = function (n) {
  const r = oShop.apply(this, arguments), run = this.run;
  if (n && n.preBoss && run && !(run.region && run.region.tut)) {
    const back = M.itemRefill(run);
    if (back.length) { setTimeout(() => { back.forEach((i, j) => { const p = this.fxPos('items') || { x: 960, y: 980 }; this.fx.pop && this.fx.pop(p.x + (j - (back.length - 1) / 2) * 90, p.y - 70, M.ITEMS[run.items[i]] ? M.ITEMS[run.items[i]].name : '', M.ITEM_C || '#c9a24a', 30); }); this.pulse.items = now(); S.gain ? S.gain('item') : S.up && S.up(2); this.toast('道具补满了', M.ITEM_C || '#c9a24a'); }, 450); }
  }
  return r;
};
const oTip = G.itemTip;
G.itemTip = function (key) {
  const t = oTip.apply(this, arguments); if (!t || !this.run) return t;
  t.lines = (t.lines || []).concat([{ t: '用掉以后，首领前的店里补回来', c: '#a9a3c9' }]); return t;
};
const oView1 = G.view;
G.view = function () {
  const v = oView1.call(this), run = this.run;
  if (v.w && v.w.items && run) { const o = own(run); v.w.items.forEach((it, i) => { const k = o[i]; if (!run.items[i] && k && M.ITEMS[k]) { it.ghost = true; it.gimg = M.spriteURL(M.ITEMS[k].icon, 5); it.tipOn = this.tipFn({ title: M.ITEMS[k].name, c: M.ITEM_C, d: '用掉了，首领前的店里补回来。' }); } else it.ghost = false; }); }
  // the night market: what a banner adds to the army you have
  if (v.s && v.s.banners && run && run.shop && run.shop.banners) {
    const base = M.runPower(run), L0 = run.legion;
    v.s.banners.forEach((b, i) => { const c = run.shop.banners[i]; if (!c) return; let d = 0; run.legion = Object.assign({}, L0, { [c.key]: true }); try { d = Math.max(0, M.runPower(run) - base); } catch (e) {} finally { run.legion = L0; }
      b.pw = d > 0 ? '战力 +' + M.fmt(d) : '现有部队用不上'; b.pwC = d > 0 ? '#9cff7a' : '#8d8496'; });
  }
  return v;
};

// ───────── 搬迁: a built room moves to any empty room ─────────
M.MOVE_COST = 30;
const canMove = (m, c, r) => { const x = M.cell(m, c, r); return !!(x && x.b && x.b !== 'core' && !x.ruin && !x.job && !(B_[x.b] && B_[x.b].fixed)); };
const target = (m, c, r) => { const x = M.cell(m, c, r); return !!(x && x.dug && !x.b && !x.job && (!M.unlocked || M.unlocked(m, c, r))); };
const oPV = G.panelView;
G.panelView = function () {
  const v = oPV.apply(this, arguments), p = this.panel, m = this.meta, pn = v && v.pn; if (!pn || !p) return v;
  if (p.kind === 'room' && canMove(m, p.c, p.r)) {
    const ok = m.supplies >= M.MOVE_COST;
    Object.assign(pn, { moveOn: true, moveBtn: '搬迁 · ' + M.MOVE_COST + ' 物资', moveC: ok ? '#9fe8ff' : '#6a6394',
      onMove: () => { if (!ok) { this.deny('物资不够：搬迁要 ' + M.MOVE_COST, '#d0453c'); return; } S.click(); this.closePanel(); this.moveSel = { c: p.c, r: p.r, key: p.key, at: now() }; this.toast('选一个空房间', '#9fe8ff'); this.bump(); } });
  }
  return v;
};
G.moveTo = function (c, r) {
  const s = this.moveSel, m = this.meta; this.moveSel = null; if (!s || !canMove(m, s.c, s.r) || !target(m, c, r) || m.supplies < M.MOVE_COST) return false;
  const from = M.cell(m, s.c, s.r), to = M.cell(m, c, r), B = B_[s.key];
  this.hold('msup', m.supplies); m.supplies -= M.MOVE_COST; this.release('msup');
  to.b = from.b; from.b = null; this.save();
  if (M.PXR) M.PXR.poke(c + ',' + r, 'built');
  const p = this.cellPos(c, r); this.fx.rays(p.x, p.y, '#9fe8ff', 1.2, { r: 260 }); this.fx.pop(p.x, p.y - 40, B.n, '#9fe8ff', 40); this.fx.kick && this.fx.kick(8); S.build ? S.build() : S.up && S.up(2);
  if (M.fitsAt && M.fitsAt(m, c, r, s.key)) setTimeout(() => { const q = this.cellPos(c, r); this.fx.pop(q.x, q.y + 30, '★ 契合地格', '#ffcf4a', 34); }, 350);
  this.bump(); return true;
};
const oBC = G.baseClick;
G.baseClick = function (sx, sy) {
  const s = this.moveSel; if (!s) return oBC.apply(this, arguments);
  const pk = this.bv && this.bv.pick(sx, sy);
  if (pk && pk.c != null && !pk.door && target(this.meta, pk.c, pk.r)) { this.moveTo(pk.c, pk.r); return; }
  this.moveSel = null; S.click(); this.bump();   // anywhere else: never mind
};
const oClose = G.closePanel;
G.closePanel = function () { if (this.moveSel && !this.panel && now() - this.moveSel.at > 150) { this.moveSel = null; this.bump(); } return oClose.apply(this, arguments); };   // Esc cancels too
// while choosing: the room being moved outlined, every empty room it can go to framed in blue, a ★ where its vein fits
if (M.BASE_HOOKS) M.BASE_HOOKS.push(function (ctx, meta, bv, lights, phase) {
  const g = M._g, s = g && g.moveSel; if (!s || phase !== 'cells' || g.meta !== meta) return;
  const CW = M.BASE_GEO.CW, CH = M.BASE_GEO.CH, TOP = M.BASE_GEO.TOP, t = now() / 1000, pulse = 0.55 + 0.45 * Math.sin(t * 5);
  ctx.save(); ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff'; ctx.strokeRect(s.c * CW + 6, TOP + s.r * CH + 6, CW - 12, CH - 12);
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) {
    if (!target(meta, c, r)) continue; const x = c * CW, y = TOP + r * CH, fit = M.fitsAt && M.fitsAt(meta, c, r, s.key);
    ctx.globalAlpha = pulse; ctx.strokeStyle = fit ? P.gold : '#9fe8ff'; ctx.setLineDash([18, 12]); ctx.strokeRect(x + 10, y + 10, CW - 20, CH - 20); ctx.setLineDash([]);
    if (fit && M.UI) { ctx.globalAlpha = 1; M.UI.text(ctx, '★', x + CW / 2, y + CH / 2, 64, P.gold, { outline: true }); }
  }
  ctx.restore();
});
const oNG = G.newGame; if (oNG) G.newGame = function () { this.moveSel = null; return oNG.apply(this, arguments); };

if (M.GUIDE) M.GUIDE.push({ id: 'move', cat: '房间', icon: 'u_hammer', title: '搬迁', line: '建好的房间可以搬到别的空房间（30 物资，立刻完成）：先建起来，挖到契合的地形再搬过去。', scr: 'base', sel: '[data-g="move"]' },
  { id: 'refill', cat: '出征', img: () => M.spriteURL && M.spriteURL('bell', 4), title: '道具补满', line: '出征带的支援道具用掉以后，每个首领前的店里都会补回来。', scr: 'world', sel: '[data-g="nothing"]' });
})();
