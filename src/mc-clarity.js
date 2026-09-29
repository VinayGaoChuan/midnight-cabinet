// ==== mc-clarity.js ====
(function () {
// Saying plainly what things are (a player's review, checked against the game 2026-09-27; the plan confirmed by the user:
// 「你前面说的没问题，按照你前面说的改」). What lives here is behaviour; the words themselves were corrected where they are
// written (the help cards, the events' buttons, 「本局」 → 「这一趟」 everywhere).
// · A healing choice with the leader at full life says 「领袖已满血」 and steps aside (the camp, the hot spring).
// · 「结束白天」 (was 休整一天: it goes straight into tonight's 混沌来袭) carries tonight's odds under it.
// · A chest shows one card per kind of reward (it used to show 「积分 87」 and 「积分 +45」 side by side).
// · The settlement says the points stay behind: 「积分 N · 不带回基地」.
// · What an expedition picked up on the way (events' buffs) is remembered on its own, so the fight's opening chips can show
//   it next to the base's; the chips also show the wonders and the patron god now (they still read the old 发展方向 and
//   宗教, which are gone).
// · A caption (toast) shows only on the screen that raised it.
const M = window.MC, G = M.Game.prototype;
M.heroFull = (g) => { const run = g && g.run, h = run && run.hero; if (!h) return false; const mx = M.heroMaxHp ? M.heroMaxHp(h, run.M) : h.maxHp; return mx > 0 && h.hp >= mx - 0.5; };
// 结束白天
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  v.restSub = ''; v.restC = '#e8dcc4';
  if (m && this.screen === 'base' && M.nightPower && M.garrisonPower) { try { const e = M.nightPower(m), a = M.garrisonPower(m); v.restSub = '今晚 ★' + e + ' · 驻军 ★' + a; v.restC = a && M.oddsCol ? M.oddsCol(a, e) : '#ff6a5a'; } catch (err) {} }
  // the map: what this trip picked up on the way, always in sight (2026-09-27 feedback: 「事件结束后，不容易找到刚拿到的加成……
  // 地图加“本次出征加成”，列出效果、数值和何时消失」); the tip says they end when the trip does
  const run = this.run;
  if (v.w && run && this.screen === 'world') { const tl = run.region && run.region.tut ? [] : M.tripLines(run); v.w.tbOn = tl.length > 0; v.w.tbTxt = tl.join(' · '); v.w.tbImg = v.w.tbImg || M.iconURL('e_path', 2); }
  // a caption belongs to the screen it was raised on: the map's departure line does not follow into a shop or an event
  if (this.toastData && this.toastData.scr && this.toastData.scr !== this.screen) v.toastOn = false;
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'w-trip' && this.run) return { title: '这一趟的加成', c: '#5fd0c0', d: '途中奇遇、营火给的加成，回到基地时清空。', lines: M.tripLines(this.run).map(t => ({ t, c: '#bff7f0' })) };
  return oTip ? oTip.apply(this, arguments) : null;
};
// before leaving: how many come home (2026-09-27 feedback: 「通关后才出现三选一，容易以为买过的兵都能留下……出征前说清本次能带回几支」)
const oST = G.steleTip;
if (oST) G.steleTip = function () { const t = oST.apply(this, arguments), n = M.paradePicks ? M.paradePicks(this.meta) : 1; if (t) t.lines = (t.lines || []).concat([{ t: '这一趟最后只带回' + (n > 1 ? '两' : '一') + '支部队，留在基地守夜。', c: '#5fd0c0' }]); return t; };
// phones: a long-press shows what a thing is — said once, on the first touch on the base, the map or a shop, unless a
// long-press came first (the plan's 「第一次用触屏时提示一次长按看说明」)
const K_LP = 'midnight-cabinet-lphint', LP_SCR = { base: 1, world: 1, shop: 1 };
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return; const g = M._g; if (!g || !LP_SCR[g.screen]) return;
  let seen = null; try { seen = localStorage.getItem(K_LP); } catch (err) { return; } if (seen) return; try { localStorage.setItem(K_LP, '1'); } catch (err) {}
  setTimeout(() => { if (!g.touchTipAt && LP_SCR[g.screen]) g.toast('长按任何东西，看它是什么', '#bff7f0'); }, 1600);
}, true);
const oToast = G.toast;
G.toast = function () { const r = oToast.apply(this, arguments); if (this.toastData) this.toastData.scr = this.screen; return r; };
// one card per kind in a chest
const oCO = G.chestOpen;
if (oCO) G.chestOpen = function (items, col, onClose, o) {
  if (Array.isArray(items) && items.length > 1) {
    const out = [], by = {};
    items.forEach(it => {
      const a = it && it.award, k = a && (a.k === 'wallet' || a.k === 'rsup') && typeof a.v === 'number' ? a.k : null;
      if (!k) { out.push(it); return; }
      if (by[k]) { by[k].award.v += a.v; by[k].n = (k === 'wallet' ? '积分 +' : '物资 +') + by[k].award.v; return; }
      by[k] = Object.assign({}, it, { award: Object.assign({}, a), n: (k === 'wallet' ? '积分 +' : '物资 +') + a.v }); out.push(by[k]);
    });
    items = out;
  }
  return oCO.call(this, items, col, onClose, o);
};
// the points stay behind
const oWin = G.runWin;
G.runWin = function () {
  const run = this.run, w = run && !(run.region && run.region.tut) ? Math.round(run.wallet || 0) : 0, r = oWin.apply(this, arguments);
  if (w > 0 && this.endInfo) this.endInfo.lines = (this.endInfo.lines || []).concat([{ k: '积分 ' + M.fmt(w), v: '不带回基地', c: '#ffcc33' }]);
  return r;
};
// what the way gave
const oBR = G.buffRun;
if (oBR) G.buffRun = function (k, v) { const run = this.run; if (run && k !== 'unitAtk' && k !== 'heroAtk' && k !== 'mult') { run.gotMods = run.gotMods || {}; run.gotMods[k] = (run.gotMods[k] || 0) + v; } return oBR.apply(this, arguments); };
const TRIP_TX = { unitAtk: '部队攻击 +{p}%', heroAtk: '领袖攻击 +{p}%', unitHp: '部队生命 +{p}%', mult: '积分倍率 +{p}%', feverStart: 'FEVER 槽开局 +{p}%', eventLuck: '奇遇好运 +{p}%', baseScore: '击杀积分 +{p}%' };
M.tripLines = (run) => { const tb = M.tripBuffs(run); return Object.keys(TRIP_TX).filter(k => tb[k] > 0.0001).map(k => TRIP_TX[k].replace('{p}', Math.round(tb[k] * 100))); };
M.tripBuffs = (run) => { const o = {}; if (!run) return o; [run.runBuff, run.gotMods].forEach(x => { if (x) Object.keys(x).forEach(k => { if (typeof x[k] === 'number' && x[k]) o[k] = (o[k] || 0) + x[k]; }); }); return o; };
// the fight's opening chips: wonders, the god, the way
const oBoons = M.boonsOf;
if (oBoons) M.boonsOf = function (run) {
  const out = oBoons.apply(this, arguments), m = run && run.M; if (!m || (run.region && run.region.tut)) return out;
  const W = M.WONDERS || {}, ws = (m.wonders || []).filter(k => W[k] && W[k].kind === (run.raid ? 'night' : 'run'));
  if (ws.length) out.push({ n: '奇观 ×' + ws.length, ic: 't_pros', c: '#ffd970', t: ws.map(k => W[k].n).join('、') });
  const god = M.GODS && m.god && M.GODS[m.god], lv = m.godLv || 0;
  if (god && lv > 0) out.push({ n: god.n + ' Lv' + lv, ic: 'f_faith', c: god.c || '#ffe6a0', t: String((god.lv[lv - 1] || {}).t || '').replace(/。$/, '') });
  const tt = M.tripLines(run);
  if (tt.length && !run.raid) out.push({ n: '这一趟途中', ic: 'e_path', c: '#5fd0c0', t: tt.join('、') });
  return out;
};
})();
