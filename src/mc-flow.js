// ==== mc-flow.js ====
(function () {
// The flow without the room (M.META_ROOM off): intro → title menu (开始游戏 / 继续) → the base, which is the outer loop;
// expeditions are the inner one. The base top bar carries 放弃: a confirmed full restart from day 1.
const M = window.MC, G = M.Game.prototype;

// title menu: start a new game or continue the one in progress
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta, p = this.prof;
  if (v.isMenu && !M.META_ROOM) {
    const on = !!(p && p.active) && m && m.tutDone;
    v.menuStart = on ? '继续' : '开始游戏';
    v.menuSub = on ? '第 ' + m.day + ' 天 · ' + m.heroes.length + ' 名领袖' : (m && m.tutDone ? '新的一局' : '从序章开始');
  }
  v.abandon = () => { M.Sfx.click(); this.askAbandon(); };
  return v;
};

// starting a game closes the last game's summary if it is still up
const oStart = G.startGame;
G.startGame = function () { if (this.modal && this.modal.over) this.modal = null; return oStart.apply(this, arguments); };

// 放弃: everything of this game is wiped (base, leaders, rooms, stock, day); the tutorial stays done, settings stay
G.askAbandon = function () {
  if (this.raid || this.coreFx || this.tear) return;
  this.modal = { title: '放弃这一局？', text: '基地、领袖、建筑、物资全部清空，从第 1 天重新开始。', border: '#d0453c', img: 'skull', back: () => { this.modal = null; this.bump(); },
    choices: [{ t: '放弃，重新开始', danger: 1, fn: () => { this.modal = null; this.abandon(); } }, { t: '再想想', fn: () => { this.modal = null; this.bump(); } }] };
  this.bump();
};
G.abandon = function () {
  const tut = !!(this.meta && this.meta.tutDone);
  this.panel = null; this.raidPrep = null; this.raidGo = false; this.run = null; this.battle = null; this.raid = null; this.tipData = null; this.guide = null;
  if (this.prof) { this.prof.active = false; this.prof.carry = null; this.prof.pending = null; this.saveProfile && this.saveProfile(); }
  this.meta = M.resetMeta3(); this.meta.tutDone = tut; this.meta.baseTut = tut ? 99 : 0; this.save();
  this.startGame();
  this.toast('重新开始了 · 第 1 天', '#ffe08a');
};

// the room's own explanation cards have nothing to point at while the room is off
if (!M.META_ROOM && M.GUIDE) for (let i = M.GUIDE.length - 1; i >= 0; i--) if (M.GUIDE[i].cat === '房间') M.GUIDE.splice(i, 1);
})();

;
