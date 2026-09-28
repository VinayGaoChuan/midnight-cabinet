// ==== mc-tidy.js ====
(function () {
// Layout and flow fixes (user rulings 2026-09-26):
// · 「部队放到左侧竖列显示，并自动换行，不要超出屏幕」: the army sits down the left side (map and shops alike); since
//   2026-09-27 two columns, strongest first, shrinking to fit; since 2026-09-26 (later) one row along the bottom-left again.
// · 「商店里的东西如果全部购买完，并且没有刷新功能的话，要自动结束」: a shop sold out, with too few points left to
//   restock it, sends you back to the map by itself.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, now = () => performance.now();
const CARD = 104;   // a unit card and the gap under it
M.rosSort = () => (M.settings && M.settings.rosSort === 'race' ? 'race' : 'voc');
if (M.GUIDE) M.GUIDE.push({ id: 'rossort', cat: '出征', icon: 't_command', title: '队伍排列', line: '点「职业」或「种族」，队伍按它排在一起。', scr: 'world', sel: '[data-g="rossort"]' });
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.w && run) {
    // 2026-09-27 (「队伍栏只显示两列，并且按战斗力排序，并且队伍栏不要那个蓝色的底」): two columns, strongest first, no panel
    // behind it; a big army shrinks to fit above the bottom of the screen
    // 2026-09-27 (「队伍排列的时候，要有两个按钮，职业和种族，点击职业（默认）后，按照职业排列队伍。点击种族后，按照种族排列队伍，这样就能对
    // 队伍构成一目了然」): grouped by vocation (default) or by race, in the game's own order of each, the strongest first in a group
    const list = run.roster.filter(u => !this.hideU || !this.hideU.has(u.uid)), mode = M.rosSort(), KO = mode === 'race' ? M.RACE6 || [] : Object.keys(M.VOC || {});
    const grp = (u) => { const d = M.DB[u.type] || {}, i = KO.indexOf(mode === 'race' ? d.race : d.voc); return i < 0 ? 99 : i; };
    if (v.w.roster && v.w.roster.length === list.length) v.w.roster = list.map((u, i) => [i, grp(u), M.unitPower(u.type, u)]).sort((a, b) => a[1] - b[1] || b[2] - a[2] || a[0] - b[0]).map(([i]) => v.w.roster[i]);
    v.w.rosSorts = [['voc', '职业', '队伍按职业排在一起。'], ['race', '种族', '队伍按种族排在一起。']].map(([k, n, d]) => { const on = mode === k;
      return { n, c: on ? '#ffcf4a' : '#3a3040', tc: on ? '#ffe08a' : '#8d8496', onClick: () => { if (M.rosSort() === k) return; M.settings.rosSort = k; M.saveSettings && M.saveSettings(M.settings); S.click && S.click(); this.bump(); }, tipOn: this.tipFn ? this.tipFn({ title: '按' + n + '排列', c: '#ffe08a', d }) : null }; });
    // 2026-09-26 (「局内部队显示位置还放到左下角排成一排」): one row along the bottom-left, strongest first, shrinking to fit
    const shop = this.screen === 'shop', n = Math.max(1, (v.w.roster || []).length), fit = Math.min(1, 1100 / (n * 86));
    v.w.rosCols = n; v.w.rosFit = +(fit * (v.w.rosSc || 1)).toFixed(3); v.w.rosTop = Math.round(1080 - 24 - 96 * fit - 38);
    if (v.s && shop) { v.s.uL = 40; v.s.uW = 1840; v.s.uCols = Math.max(3, Math.min(5, (this.run.shop.units || []).length)); }   // the shelves have the whole width
    // the minimap folds (mc-world2.js): the button sits on its top-right corner; the area's pool moves up under the title
    const off = M.mmOff && M.mmOff(); v.w.mmBtn = off ? '▼ 小地图' : '▲ 收起'; v.w.mmBtnTop = 14; v.w.poolTop = off ? 96 : 318;
    v.mmToggle = () => { M.settings.mmOff = !off; M.saveSettings && M.saveSettings(M.settings); S.click && S.click(); this.tipData = null; this.bump(); };
  }
  return v;
};
const oTipM = G.tipFor;
G.tipFor = function (key) { if (key === 'w-mm') return { title: M.mmOff && M.mmOff() ? '展开小地图' : '收起小地图', c: '#e8dcc4', d: '整条路线的缩略图。' }; return oTipM.apply(this, arguments); };
// sold out and nothing left to restock with: leave
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), run = this.run;
  if (this.screen === 'shop' && run && run.shop && !this.reel && !this.settle) {
    const cards = [].concat(run.shop.units || [], run.shop.banners || [], run.shop.items || []), empty = cards.length > 0 && cards.every(c => c.sold);
    const stuck = empty && run.wallet < M.refreshCost(run) && !(M.gaBusy && M.gaBusy(this));   // a card pack still to draw, playing or waiting (mc-gacha.js)
    if (!stuck) this._soldOutAt = 0;
    else if (!this._soldOutAt) { this._soldOutAt = now(); this.toast('都买完了', '#ffe08a'); }
    else if (now() - this._soldOutAt > 1100) { this._soldOutAt = 0; this.leaveShop(); }
  }
  return r;
};
})();
