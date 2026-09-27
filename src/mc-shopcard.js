// ==== mc-shopcard.js ====
(function () {
// The night market's unit cards (2026-09-27 feedback: 「卡片很大，商品却很小；最醒目的按钮是离开，购买入口反而不明确……40 分和
// 130 分的治疗单位描述一样」, and the quality border read as「选中」; the plan the user approved: bigger unit, one or two key numbers so the tiers
// of a line compare, a buy button of its own, the evolution count in words, quality only in the name's colour).
// · Buying: mouse and pad buy on the first press (the card or its button); phones take two taps — the first picks the card
//   (it lifts, its tag turns into 「购买 N」), the second buys (M.twoStepBuy, user ruling 2026-09-27: 「购买在pc上还是一步，手机上2步」).
// · The card has no numbers and no power (2026-09-27: 「部队卡上，不能显示生命值，技能之类的东西……价格就是战斗力，所以在商店中，就不会
//   额外显示战斗力了」): name in its quality colour, vocation, one line, the price on the buy key; the frame is the quality colour.
const M = window.MC, G = M.Game.prototype, DB = M.DB, now = () => performance.now();
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
    Object.assign(su, {
      // the frame is the unit's quality (2026-09-27: 「在商店中不同品质的部队卡，卡边要带上品质色，这样我能一目了然」); picked = white
      ring: picked ? '#ffffff' : M.qc(d.q | 0), dy: (su.dy || 0) - (picked ? 14 : 0),
      // the tag under the card: 「购买 N」 (a phone shows only the price until the card is picked)
      buyT: !two || picked ? '购买' : '', buyK: !ok ? 'dis' : !two || picked ? 'gold' : 'dark', buyOn: !c.sold,
      onBuy: (e) => press(this, i, e), bi: i,
      // evolution in words: 已有 n/3, and the card that makes three says so in gold (no blinking ring over the card)
      evoTxt: n === (M.EVO_NEED || 3) - 1 ? '买下就进化' : '已有 ' + n + '/' + (M.EVO_NEED || 3), evoTc: n === (M.EVO_NEED || 3) - 1 ? '#ffcf4a' : '#a9a3c9', evoGo: false,
      evoPips: [0, 1, 2].map(k => ({ c: k < n ? '#ffcf4a' : '#3a3450' })),
    });
    // the card that makes three: a gold frame and a gold banner over it (2026-09-27: 「能够3合1的单位要有提升……商店里的那个根本没有提示」)
    su.mergeOn = !c.sold && n === (M.EVO_NEED || 3) - 1 && (!M.evoOpen || M.evoOpen(run.M, c.type)); if (su.mergeOn) su.evoOn = false;
  });
  v.s.starImg = M.iconURL('u_star', 2);
  v.s.selOn = false;   // nothing is sold (2026-09-27: 「部队不允许卖，只允许替换」)
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  return oTip ? oTip.apply(this, arguments) : null;
};
})();
