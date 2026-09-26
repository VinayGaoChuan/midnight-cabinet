// ==== mc-tidy.js ====
(function () {
// Layout and flow fixes (user rulings 2026-09-26):
// · 「部队放到左侧竖列显示，并自动换行，不要超出屏幕」: the army is a column down the left side (map and shops alike) that
//   starts a new column when it reaches the bottom; the shop's shelves start to the right of it.
// · 「商店里的东西如果全部购买完，并且没有刷新功能的话，要自动结束」: a shop sold out, with too few points left to
//   restock it, sends you back to the map by itself.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, now = () => performance.now();
const CARD = 104;   // a unit card and the gap under it
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.w && run) {
    const shop = this.screen === 'shop', top = shop ? 196 : 320, rows = Math.max(3, Math.floor((1080 - top - 30 - 56) / CARD)), n = Math.max(1, (v.w.roster || []).length), cols = Math.ceil(n / rows);
    v.w.rosTop = top; v.w.rosRows = Math.min(rows, n);
    if (v.s && shop) { const L = 24 + 32 + cols * 86 + 24; v.s.uL = Math.max(40, L); v.s.uW = 1880 - v.s.uL; v.s.uCols = v.s.uW > 1300 ? 4 : 3; }
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
