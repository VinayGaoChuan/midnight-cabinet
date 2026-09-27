// ==== mc-report.js ====
(function () {
// A battle report on the victory page (2026-09-27 feedback: 「打完要知道谁有用……战中阵亡后是否恢复也不直观。改法：加简短战报：
// 伤亡是否恢复、谁输出高、谁扛伤、治疗多少」). Each fighter counts the life it took from foes (its summons count for it), the
// life it lost, and the life it gave back to its own side (the fighter whose trait, attack or skill was running when the heal
// came). The page shows the best of each among the army's own units, and how many fell — in a won fight every one of them is
// back for the next (checked in the settlement code: nobody is taken off the roster).
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, DB = M.DB;
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
  const row = (k, lab, col) => { const e = us.filter(x => (x[k] || 0) >= 1).sort((a, c) => c[k] - a[k])[0]; return e ? { lab, col, n: DB[e.kind].n, qc: M.qc(DB[e.kind].q | 0), v: M.fmt(Math.round(e[k])), img: M.spriteURL(e.kind, 4) } : null; };
  const rows = [row('stDmg', '输出最高', '#ff8a6a'), row('stTaken', '承伤最高', '#6fd0ff'), row('stHeal', '治疗最多', '#9cff7a')].filter(Boolean);
  const fell = (b.deadUids || []).length;
  return rows.length || fell ? { rows, fell: fell ? '倒下 ' + fell + ' 支 · 下一仗全部归队' : '' } : null;
};
const oSS = G.startSettle;
G.startSettle = function () { const rep = M.battleReport(this.battle), r = oSS.apply(this, arguments); if (this.settle && rep && this.settle.good) this.settle.rep = rep; return r; };
const oView = G.view;
G.view = function () {
  const v = oView.call(this), st = this.settle;
  if (v.st && st) { const rep = st.rep; v.st.repOn = !!(rep && v.st.btnOn); v.st.rep = rep ? rep.rows : []; v.st.fell = rep ? rep.fell : ''; v.st.hasFell = !!(rep && rep.fell); }
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
G.tipFor = function (key) { if (key === 'st-report') return { title: '战报', c: '#ffe08a', d: '这一仗谁出力最多；倒下的部队下一仗全部归队。' }; return oTip ? oTip.apply(this, arguments) : null; };
})();
