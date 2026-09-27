// ==== mc-shopcard.js ====
(function () {
// The night market's unit cards (2026-09-27 feedback: 「卡片很大，商品却很小；最醒目的按钮是离开，购买入口反而不明确……40 分和
// 130 分的治疗单位描述一样」, and the quality border read as「选中」; the plan the user approved: bigger unit, one or two key numbers so the tiers
// of a line compare, a buy button of its own, the evolution count in words, quality only in the name's colour).
// · Buying: mouse and pad buy on the first press (the card or its button); phones take two taps — the first picks the card
//   (it lifts, its tag turns into 「购买 N」), the second buys (M.twoStepBuy, user ruling 2026-09-27: 「购买在pc上还是一步，手机上2步」).
// · Key numbers: life, and the first trait's number with its name (奉献 4% → 奉献 4.75% one tier up); no trait: damage a second.
const M = window.MC, G = M.Game.prototype, DB = M.DB, now = () => performance.now();
const num = (v) => (v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
M.unitNums = function (k) {
  const d = DB[k]; if (!d) return []; const out = [{ t: '生命', v: num(d.hp) }];
  const T = (M.traitsOf ? M.traitsOf(k) : []).find(x => x && x.d && /\d/.test(x.d));
  const m = T && String(T.d).match(/(\d+(?:\.\d+)?)\s*(%|秒|点|倍)?/);
  if (m) out.push({ t: T.n, v: m[1] + (m[2] === '%' ? '%' : m[2] === '秒' ? ' 秒' : m[2] === '倍' ? ' 倍' : '') });
  else out.push({ t: '每秒伤害', v: num(d.atk * (d.as || 100) / 100) });
  return out;
};
// a buy that a phone's first tap only picked: the card stays picked until another card, a buy, or leaving the shop
const oBuy = G.buy;
G.buy = function (zone, i) { this.shopPick = null; return oBuy.apply(this, arguments); };
const oLeave = G.leaveShop;
G.leaveShop = function () { this.shopPick = null; return oLeave.apply(this, arguments); };
function press(g, i, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const run = g.run, c = run && run.shop && run.shop.units && run.shop.units[i]; if (!c || c.sold) return;
  if (M.twoStepBuy(g) && g.shopPick !== i) { g.shopPick = i; g.tipData = null; M.Sfx.click(); g.bump(); return; }
  g.buy('units', i);
}
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (!(v.s && run && run.shop && this.screen === 'shop')) { if (this.screen !== 'shop') this.shopPick = null; return v; }
  const two = M.twoStepBuy(this), have = {}; run.roster.forEach(u => { have[u.type] = (have[u.type] || 0) + 1; });
  (v.s.units || []).forEach((su, i) => {
    const c = run.shop.units[i]; if (!c) return; const d = DB[c.type], ok = run.wallet >= c.cost, picked = two && this.shopPick === i && !c.sold, n = (have[c.type] || 0) % (M.EVO_NEED || 3);
    const nums = M.unitNums(c.type);
    Object.assign(su, {
      ring: picked ? '#ffffff' : '#3a3450', dy: (su.dy || 0) - (picked ? 14 : 0),
      nums: nums.map(o => o.t + ' ' + o.v).join(' · '),
      pwN: String(M.unitPower(c.type)),
      // the tag under the card: 「购买 N」 (a phone shows only the price until the card is picked)
      buyT: !two || picked ? '购买' : '', buyK: !ok ? 'dis' : !two || picked ? 'gold' : 'dark', buyOn: !c.sold,
      onBuy: (e) => press(this, i, e), bi: i,
      // evolution in words: 已有 n/3, and the card that makes three says so in gold (no blinking ring over the card)
      evoTxt: n === (M.EVO_NEED || 3) - 1 ? '买下就进化' : '已有 ' + n + '/' + (M.EVO_NEED || 3), evoTc: n === (M.EVO_NEED || 3) - 1 ? '#ffcf4a' : '#a9a3c9', evoGo: false,
      evoPips: [0, 1, 2].map(k => ({ c: k < n ? '#ffcf4a' : '#3a3450' })),
    });
  });
  v.s.starImg = M.iconURL('u_star', 2);
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 's-power') return { title: '战斗力', c: '#ffe08a', d: '部队有多强，就是它的价格：越贵越强。' };
  if (key === 's-nums') return { title: '关键数值', c: '#bff7f0', d: '生命和它最拿手的那一项，高一档的同种部队数字更大。' };
  return oTip ? oTip.apply(this, arguments) : null;
};
})();
