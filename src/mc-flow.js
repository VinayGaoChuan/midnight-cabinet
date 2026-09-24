// ==== mc-flow.js ====
(function () {
// The flow without the room (M.META_ROOM off): intro → the cabinet's screen shows 开始游戏 / 继续 → the base, which is the
// outer loop; expeditions are the inner one. The base top bar carries 放弃: a confirmed full restart from day 1.
const M = window.MC, G = M.Game.prototype;

// title menu: no page of its own. The intro's camera stops on the cabinet and the buttons sit on its screen;
// 开始游戏 pushes the camera into the screen, then the game starts.
const DIVE = 0.95;
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta, p = this.prof;
  if (v.isMenu && !M.META_ROOM) {
    const on = !!(p && p.active) && m && m.tutDone;
    v.menuStart = on ? '继续' : '开始游戏';
    v.menuSub = on ? '第 ' + m.day + ' 天 · ' + m.heroes.length + ' 名领袖' : (m && m.tutDone ? '新的一局' : '从序章开始');
    const r = M.cabScreen(), fade = Math.min(1, (this.menuT || 0) / 0.35), d = this.menuDive;
    v.mn = { on: true, x: r.x, y: r.y, w: r.w, h: r.h, pb: 26, op: (d ? Math.max(0, 1 - d.t / 0.2) : fade).toFixed(2) };
    v.menuGo = () => this.menuGo();
  } else v.mn = { on: false };
  v.abandon = () => { M.Sfx.click(); this.askAbandon(); };
  return v;
};
G.menuGo = function () {
  if (this.menuDive || this.modal) return;
  M.Sfx.init(); M.Sfx.click(); M.Sfx.whoosh && M.Sfx.whoosh(0.8); this.menuDive = { t: 0 }; this.bump();
};
const oGo = G.go;
G.go = function (s) { if (s === 'menu') { this.menuT = 0; this.menuDive = null; } return oGo.apply(this, arguments); };
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt);
  if (this.screen !== 'menu' || M.META_ROOM) return;
  this.menuT = (this.menuT || 0) + dt; const d = this.menuDive;
  if (d) { d.t += dt; if (d.t >= DIVE) { this.menuDive = null; this.startGame(); return; } }
  const c = this.ui && this.ui.cv('intro'); if (c) M.drawCabinet(c.getContext('2d'), this.menuT, d ? d.t / DIVE : 0);
  if (d || this.menuT < 0.5) this.bump();
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
