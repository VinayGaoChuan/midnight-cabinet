// ==== mc-report.js ====
(function () {
// A battle report on the victory page (2026-09-27 feedback: 「打完要知道谁有用……战中阵亡后是否恢复也不直观。改法：加简短战报：
// 伤亡是否恢复、谁输出高、谁扛伤、治疗多少」). Each fighter counts the life it took from foes (its summons count for it), the
// life it lost, and the life it gave back to its own side (the fighter whose trait, attack or skill was running when the heal
// came). The page shows the best of each among the army's own units, and how many fell — in a won fight every one of them is
// back for the next (checked in the settlement code: nobody is taken off the roster). The page shows one MVP with a stamp; the
// numbers of every unit are in the panel behind the chart button.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, DB = M.DB, S = M.Sfx;
const who = (e) => (e && e.owner ? e.owner : e);
const acting = (name) => { const o = BP[name]; if (!o) return; BP[name] = function (e) { const p = this._actor; this._actor = e; try { return o.apply(this, arguments); } finally { this._actor = p; } }; };
['call', 'attack', 'strike', 'sigTick'].forEach(acting);
const oDeal = BP.deal;
BP.deal = function (src, tg) {
  const before = tg && tg.alive ? tg.hp : 0, r = oDeal.apply(this, arguments);
  if (before > 0) { const lost = before - Math.max(0, tg.hp); if (lost > 0) { tg.stTaken = (tg.stTaken || 0) + lost; const s = who(src || this._actor); if (s && s.side !== tg.side) s.stDmg = (s.stDmg || 0) + lost; } }
  return r;
};
const oHeal = BP.heal;
BP.heal = function (o) {
  const before = o && o.alive ? o.hp : null, r = oHeal.apply(this, arguments);
  if (before != null && o.hp > before) { const h = who(this._actor); if (h && h.side === o.side && !h.isHero) h.stHeal = (h.stHeal || 0) + (o.hp - before); }
  return r;
};
const oSum = BP.summon;
BP.summon = function (key, side, x, y, life, src) { const e = oSum.apply(this, arguments); if (e && src && src.side === side) e.owner = who(src); return e; };
M.battleReport = function (b) {
  if (!b || !b.ents) return null;
  const us = b.ents.filter(e => e.side === 'A' && !e.isHero && !e.summon && DB[e.kind]);
  // the MVP (2026-09-27: 「不要列这些，因为已经有战报面板了……而是应该给一个MVP单位，并且要一个跟盖章一样的伟大的MVP效果」): the most done in
  // the fight — damage dealt and life given back count in full, damage taken for the others counts half; its line is its own biggest
  const sc = (e) => (e.stDmg || 0) + (e.stHeal || 0) + 0.5 * (e.stTaken || 0), best = us.filter(e => sc(e) >= 1).sort((a, c) => sc(c) - sc(a))[0];
  let mvp = null;
  if (best) { const parts = [['输出', best.stDmg || 0, '#ff8a6a'], ['治疗', best.stHeal || 0, '#9cff7a'], ['承伤', 0.5 * (best.stTaken || 0), '#6fd0ff']].sort((a, c) => c[1] - a[1]), top = parts[0], raw = top[0] === '承伤' ? best.stTaken : top[1];
    mvp = { k: best.kind, n: DB[best.kind].n, qc: M.qc(DB[best.kind].q | 0), img: M.spriteURL(best.kind, 6), stat: top[0] + ' ' + M.fmt(Math.round(raw)), sc: top[2] }; }
  // every unit's numbers, for the panel behind the chart button
  const all = us.map(e => ({ k: e.kind, n: DB[e.kind].n, qc: M.qc(DB[e.kind].q | 0), img: M.spriteURL(e.kind, 4), dmg: Math.round(e.stDmg || 0), taken: Math.round(e.stTaken || 0), heal: Math.round(e.stHeal || 0), fell: !e.alive }));
  return mvp ? { mvp, all } : null;
};
const oSS = G.startSettle;
G.startSettle = function () { const rep = M.battleReport(this.battle), r = oSS.apply(this, arguments); this.repPanel = null; if (this.settle && rep && this.settle.good) this.settle.rep = rep; return r; };
// the chart button's icon: three bars
if (M.IC) M.IC.u_bars = (x) => { x.fillStyle = '#07060f'; x.fillRect(3, 27, 26, 3); [[5, 16, '#ff8a6a'], [13, 7, '#6fd0ff'], [21, 12, '#9cff7a']].forEach(([X, Y, c]) => { x.fillStyle = '#07060f'; x.fillRect(X - 1, Y - 1, 8, 28 - Y); x.fillStyle = c; x.fillRect(X, Y, 6, 27 - Y); }); };
// the panel (2026-09-27: 「战报需要一个面板，里面显示了每个角色的进度条，输出，承伤，治疗，要能排序……入口就是一个类似柱状图的UI图标，
// 在继续前进右边」): shut by default; every unit a row with three bars, a column header sorts by it (again: the other way)
const COLS = [['dmg', '输出', '#ff8a6a'], ['taken', '承伤', '#6fd0ff'], ['heal', '治疗', '#9cff7a']];
const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
G.repOpen = function (e) { stop(e); const st = this.settle; if (!st || !st.rep) return; this.repPanel = { sort: 'dmg', desc: true }; M.Sfx.click && M.Sfx.click(); this.tipData = null; this.bump(); };
G.repClose = function (e) { stop(e); this.repPanel = null; M.Sfx.click && M.Sfx.click(); this.bump(); };
G.repSort = function (k, e) { stop(e); const P = this.repPanel; if (!P) return; if (P.sort === k) P.desc = !P.desc; else { P.sort = k; P.desc = true; } M.Sfx.click && M.Sfx.click(); this.bump(); };
const MVP_HIT = 740;   // ms after the card shows: the stamp's CSS fall (template: mvpSlam, 0.52 s delay) lands here
const oTickM = G.tick;
G.tick = function (dt) {
  const r = oTickM.apply(this, arguments), st = this.settle;
  if (st && st.mvpT != null && !st.mvpHit && performance.now() - st.mvpT > MVP_HIT) { st.mvpHit = 1;
    const R = this.guideRect ? this.guideRect({ sel: '[data-g="mvp-stamp"]' }) : null, x = R ? R.x + R.w / 2 : 1100, y = R ? R.y + R.h / 2 : 820;
    S.stamp && S.stamp(); S.impact && S.impact(); this.fx.kick && this.fx.kick(16); this.fx.flash && this.fx.flash('#ffe6d8', 0.25);
    if (this.fx.ring) { this.fx.ring(x, y, 20, 260, '#e8434f', 14, 0.45); this.fx.ring(x, y, 10, 180, '#ffcf4a', 8, 0.35, 0.06); }
    if (this.fx.burst) { this.fx.burst(x, y, '#e8434f', 26); this.fx.burst(x, y, '#ffcf4a', 16); }
    if (this.fx.rays) this.fx.rays(x, y, '#ffcf4a', 1.2, { r: 360 }); }
  return r;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), st = this.settle;
  if (v.st && st) { const rep = st.rep; v.st.repOn = !!(rep && v.st.btnOn); v.st.repIc = M.iconURL('u_bars', 2); v.st.repGo = (e) => this.repOpen(e);
    v.st.mvp = rep ? Object.assign({}, rep.mvp, { tipOn: this.tipFn(() => M.unitTip(rep.mvp.k)) }) : { n: '', img: '', qc: '#fff', stat: '', sc: '#fff' };
    if (v.st.repOn && st.mvpT == null) st.mvpT = performance.now(); }
  const P = this.repPanel, rep = st && st.rep; v.rpOn = !!(P && rep);
  if (v.rpOn) {
    const mx = {}; COLS.forEach(([k]) => { mx[k] = Math.max(1, ...rep.all.map(r => r[k])); });
    const rows = rep.all.slice().sort((a, b) => (P.desc ? b[P.sort] - a[P.sort] : a[P.sort] - b[P.sort]));
    v.rp = { close: (e) => this.repClose(e), keep: stop,
      heads: COLS.map(([k, n, c]) => ({ n: n + (P.sort === k ? (P.desc ? ' ▼' : ' ▲') : ''), c: P.sort === k ? c : '#a9a3c9', go: (e) => this.repSort(k, e) })),
      rows: rows.map(r => ({ img: r.img, n: r.n, qc: r.qc, op: r.fell ? 0.6 : 1, tipOn: this.tipFn(() => M.unitTip(r.k)), cells: COLS.map(([k, , c]) => ({ w: Math.round(200 * r[k] / mx[k]), c, v: M.fmt(r[k]) })) })) };
  } else v.rp = { heads: [], rows: [] };
  return v;
};
// what a fight on the map brings (the plan's 「悬浮战斗节点时显示敌人特点，例如群攻、治疗、厚甲、远程」; 2026-09-27 feedback:
// 「主要靠战力数字判断，阵容搭配缺少依据」): the node's own rolled fight (M.makeBattleCfg keeps it), its enemies' traits sorted
// into a few kinds, with how many enemies have each
const KIND = { heal: '治疗', aura_heal: '治疗', aura_blood: '治疗', revive: '复活', guard: '厚甲', aura_guard: '厚甲', thorns: '反伤', stealth: '隐身', fire: '群攻', blade: '群攻', bolt: '群攻', leap: '群攻', venom: '群攻', aura_frost: '减速', summon: '召唤', growth: '召唤', rage: '强攻', arcane: '强攻', speed: '强攻', aura_atk: '强攻', aura_speed: '强攻', curse: '削弱', aura_weak: '削弱', skull: '亡语' };
M.foeKinds = function (run, n) {
  let cfg = null; try { cfg = M.makeBattleCfg(run, n); } catch (e) { return []; } const list = (cfg && cfg.list) || [], cnt = {};
  list.forEach(s => { const d = DB[s.type]; if (!d) return; const ks = new Set(); if (d.ranged === 1) ks.add('远程'); (d.tr || []).forEach(t => { const a = M.TRAIT_AW && M.TRAIT_AW[t]; if (a && KIND[a[0]]) ks.add(KIND[a[0]]); }); ks.forEach(k => { cnt[k] = (cnt[k] || 0) + 1; }); });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 5).map(k => k + ' ×' + cnt[k]);
};
const FIGHT = { normal: 1, elite: 1, boss: 1, hold: 1, extract: 1 };
const oWM = G.worldMove;
G.worldMove = function () { const r = oWM.apply(this, arguments), n = M._tipNode, run = this.run;
  if (n && run && this.tipData && n.seen && FIGHT[n.type] && !(run.region && run.region.tut)) { const ks = M.foeKinds(run, n); if (ks.length) this.tipData = Object.assign({}, this.tipData, { lines: (this.tipData.lines || []).concat([{ t: '敌人：' + ks.join(' · '), c: '#ff9a8a' }]) }); }
  return r; };
const oTip = G.tipFor;
G.tipFor = function (key) { if (key === 'st-report') return { title: 'MVP', c: '#ffe08a', d: '这一仗出力最多的部队。' }; if (key === 'st-stats') return { title: '战报详情', c: '#ffe08a', d: '每支部队的输出、承伤和治疗。' }; return oTip ? oTip.apply(this, arguments) : null; };
})();
