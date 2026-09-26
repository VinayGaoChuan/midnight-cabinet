// ==== mc-tidy.js ====
(function () {
// Layout and flow fixes (user rulings 2026-09-26):
// · 「部队放到左侧竖列显示，并自动换行，不要超出屏幕」: the army sits down the left side (map and shops alike); since
//   2026-09-27 two columns, strongest first, shrinking to fit; the shop's shelves start to the right of it.
// · 「商店里的东西如果全部购买完，并且没有刷新功能的话，要自动结束」: a shop sold out, with too few points left to
//   restock it, sends you back to the map by itself.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, now = () => performance.now();
const CARD = 104;   // a unit card and the gap under it
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.w && run) {
    // 2026-09-27 (「队伍栏只显示两列，并且按战斗力排序，并且队伍栏不要那个蓝色的底」): two columns, strongest first, no panel
    // behind it; a big army shrinks to fit above the bottom of the screen
    const list = run.roster.filter(u => !this.hideU || !this.hideU.has(u.uid));
    if (v.w.roster && v.w.roster.length === list.length) v.w.roster = list.map((u, i) => [i, M.unitPower(u.type, u)]).sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([i]) => v.w.roster[i]);
    const shop = this.screen === 'shop', top = shop ? 196 : 320, n = Math.max(1, (v.w.roster || []).length), cols = Math.min(2, n), rows = Math.ceil(n / 2);
    const fit = Math.min(1, (1080 - top - 44 - 24) / (rows * CARD));
    v.w.rosTop = top; v.w.rosFit = +(fit * (v.w.rosSc || 1)).toFixed(3);
    if (v.s && shop) { const L = 24 + cols * 86 * fit + 24; v.s.uL = Math.max(40, Math.round(L)); v.s.uW = 1880 - v.s.uL; v.s.uCols = v.s.uW > 1300 ? 4 : 3; }
  }
  return v;
};
// sold out and nothing left to restock with: leave
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), run = this.run;
  if (this.screen === 'shop' && run && run.shop && !this.reel && !this.settle) {
    const cards = [].concat(run.shop.units || [], run.shop.banners || [], run.shop.items || []), empty = cards.length > 0 && cards.every(c => c.sold);
    const stuck = empty && run.wallet < M.refreshCost(run);
    if (!stuck) this._soldOutAt = 0;
    else if (!this._soldOutAt) { this._soldOutAt = now(); this.toast('都买完了', '#ffe08a'); }
    else if (now() - this._soldOutAt > 1100) { this._soldOutAt = 0; this.leaveShop(); }
  }
  return r;
};
})();
