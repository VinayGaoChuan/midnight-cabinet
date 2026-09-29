// ==== mc-lang.js ====
(function () {
// The language list (src/mc-i18n.js): a row in the settings — 「LANGUAGE · 语言」, the English word is there in every language so a
// player who cannot read the current one still finds it — and a panel of every language, each written in itself.
const M = window.MC, G = M.Game.prototype, I = M.I18N; if (!I) return;
const S = M.Sfx || {};
if (M.GUIDE) M.GUIDE.push({ id: 'lang', cat: '房间', icon: 'u_star', title: '语言', line: '游戏里所有文字换成这门语言；Steam 版默认跟随 Steam 的语言。', scr: [] });
{ const oTip = G.tipFor;
  G.tipFor = function (key) { if (key === 'ui-lang') return { title: '语言', c: '#bff7f0', d: '游戏里所有文字换成这门语言。' }; return oTip.apply(this, arguments); }; }
const oSV = G.settingsView;
G.settingsView = function () {
  const v = oSV ? oSV.call(this) : { set: {} };
  if (v && v.set) { v.set.langName = I.keep(I.name(I.lang)); v.set.langOpen = () => { S.click && S.click(); this.langPick = true; this.bump(); }; }
  return v;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  v.langOn = !!(this.langPick && this.settingsOpen);
  if (this.langPick) v.lp = { close: () => { S.click && S.click(); this.langPick = false; this.bump(); },
    list: I.ready().map(([code, name]) => ({ n: I.keep(name), on: code === I.lang, bg: code === I.lang ? '#47d6c1' : 'transparent', c: code === I.lang ? '#07060f' : '#bff7f0',
      pick: () => { S.click && S.click(); I.set(code, true); this.langPick = false; this.bump(); } })) };
  return v;
};
// closing the settings closes the list with it
const oCS = G.closeSettings;
G.closeSettings = function () { this.langPick = false; return oCS ? oCS.apply(this, arguments) : undefined; };
// Esc / the pad's back closes the list first
const oBack = G.backAction;
G.backAction = function () { if (this.langPick) { this.langPick = false; this.bump(); return; } return oBack ? oBack.apply(this, arguments) : undefined; };
})();
