// ==== mc-endone.js ====
(function () {
// One page for the end of an expedition (user ruling 2026-09-27: 「胜利/失败和结算应该同一个页面，播放伟大的胜利效果的同时，播放结算的效果」).
// The last fight of an expedition (the chapter's last boss, the extraction, or the fall) no longer shows a victory / defeat
// page of its own before the expedition's settlement: a breath after the last blow it goes straight to the settlement,
// and the great victory show (the word dropping in letter by letter, flash, rays, sparks — red and without the brass and
// the confetti for a fall) plays on that page as its title, while the cards land under it.
const M = window.MC, G = M.Game.prototype, now = () => performance.now();
const isFinal = (g, st) => !!(st && (st.final || (g.run && g.run.tut && g.node && g.node.final)));
const oSS = G.startSettle;
G.startSettle = function () {
  const r = oSS.apply(this, arguments), st = this.settle; if (!isFinal(this, st)) return r;
  this.banners = this.banners.filter(b => !(b.kind === 'victory' || (b.kind === 'win' && b.text === st.title)));   // the settlement page carries the show
  this._endGo = { st, at: now() + 800 };
  return r;
};
const oTick = G.tick;
G.tick = function (dt) {
  const E = this._endGo;
  if (E && now() >= E.at) { this._endGo = null; const st = E.st; if (this.settle === st) { st.t = Math.max(st.t, 9); st.shown = (st.tiles || st.lines || []).length; this._mergeEnd = 1; try { this.settleNext(); } finally { this._mergeEnd = 0; } } }
  return oTick.apply(this, arguments);
};
function titleShow(g, fail) {
  const e = g.endInfo; if (!e) return; e.merged = 1; e.at = now(); e.fail = !!fail;
  g.banners = []; g.toastData = null;   // nothing left over from the map or the fight over the page
  g.banners.push({ kind: 'victory', text: e.title, col: fail ? '#ff4a5a' : (e.color || '#ffd970'), t: 0, life: 1e6, y: 420, stay: 1, quiet: 1, fail: !!fail, alive: () => g.screen === 'end' && g.endInfo === e });
}
const oWin = G.runWin;
G.runWin = function () { const merge = this._mergeEnd, r = oWin.apply(this, arguments); if (merge) titleShow(this, false); return r; };
const oFail = G.runFail;
G.runFail = function () { const merge = this._mergeEnd, r = oFail.apply(this, arguments); if (merge) titleShow(this, true); return r; };
// on the page: the word is the title (the page's own one steps aside), the cards come after the word has risen, and the
// effects layer sits over the page
const oView = G.view;
G.view = function () {
  const v = oView.call(this), e = this.endInfo;
  if (v.end && e && e.merged && this.screen === 'end') {
    v.end.title = ''; v.fxZ = 70;
    const t = (now() - (e.at || 0)) / 1000;
    (v.end.tiles || []).forEach((tl, i) => { const q = Math.max(0, Math.min(1, (t - 1.2 - i * 0.14) / 0.35)); tl.op = q; tl.sc = (0.2 + 0.8 * q).toFixed(3); });
  }
  return v;
};
const oBack = G.endBack;
G.endBack = function () { const e = this.endInfo; if (e && e.merged && (now() - (e.at || 0)) < 1400) return; this.banners = this.banners.filter(b => b.kind !== 'victory'); return oBack.apply(this, arguments); };
})();
