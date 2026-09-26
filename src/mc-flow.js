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
  M.Sfx.init(); M.Sfx.coinInsert(); M.Sfx.screenDive(); this.menuDive = { t: 0 }; this.bump();   // 投币、镜头推进屏幕（房间的雨声由音效导演按场景收掉）
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
  this.toast('重新开始了 · 第 1 天 · 序章奖励已送到', '#ffe08a');
};

// 序章的结算奖励 (user ruling 2026-09-24): every new game after the tutorial starts with what the tutorial paid out
// (supplies, shards, orbs, the leader's experience, the blueprints it found), and the tavern the tutorial has you build
// already stands next to the core. What the tutorial actually paid is kept in the profile; older profiles get the usual amount.
const oWinT = G.runWin;
G.runWin = function (kind) {
  const tut = !!(this.run && this.run.region && this.run.region.tut), r = oWinT.apply(this, arguments);
  try { const g = tut && this.endInfo && this.endInfo.gain; if (g && this.prof) { this.prof.tutGift = { sup: Math.max(0, g.msup || 0), sh: Math.max(0, g.msh || 0), orb: Math.max(0, g.morb || 0), exp: Math.max(0, g.exp || 0), bp: (g.bp || []).filter(k => k !== 'bbp:tavern') }; this.saveProfile(); } } catch (e) {}
  return r;
};
// the tavern the tutorial pays for stands next to the core
M.preTavern = function (m) { const x = M.cell(m, M.CORE.c - 1, M.CORE.r); if (x && !x.b) { x.dug = true; x.b = 'hospital'; x.job = null; if (x.tile === 'ruin') x.tile = null; return true; } return false; };
M.tutGift = function (m, g) {
  g = g || { sup: 100, sh: 0, orb: 0, exp: 100, bp: [M.dropBp()] };
  m.supplies += g.sup || 0; m.shards += g.sh || 0; if (g.orb && m.heroes[0]) M.addExp(m.heroes[0], g.orb);
  (g.bp || []).forEach(k => { if (k) M.invAdd(m, k, 1); });
  const h = m.heroes[0]; if (h && g.exp) { M.addExp(h, g.exp); h.hp = M.heroMaxHp(h, m); }
  M.preTavern(m);
};
const oNew = G.newGame;
const oRestart = G.restart;
if (oRestart) G.restart = function () { const r = oRestart.apply(this, arguments); if (this.meta && this.meta.tutDone) { M.tutGift(this.meta, this.prof && this.prof.tutGift); this.save(); } return r; };
if (oNew) G.newGame = function () { const r = oNew.apply(this, arguments), m = this.meta; if (m && m.tutDone) { M.tutGift(m, this.prof && this.prof.tutGift); this.save(); } return r; };

// the room's own explanation cards have nothing to point at while the room is off
if (!M.META_ROOM && M.GUIDE) for (let i = M.GUIDE.length - 1; i >= 0; i--) if (M.GUIDE[i].cat === '房间') M.GUIDE.splice(i, 1);
})();

;

// ───────── no onboarding for now (user ruling 2026-09-24: it was too busy; it will be designed again) ─────────
// No coach bubbles (tutorial hints, base steps, "building ready" notes), no base tutorial, no first-time cards popping up.
// The 序章 is still the first expedition, without hints; the tavern it used to have you build is built for you.
(function () {
  const M = window.MC, G = M.Game.prototype;
  G.coach = function () {}; G.coachOnce = function () {};
  G.baseTutStep = function () { const m = this.meta; if (m && m.tutDone && m.baseTut !== 99) { m.baseTut = 99; this.save(); } };
  const oWin = G.runWin;
  G.runWin = function (kind) {
    const tut = !!(this.run && this.run.region && this.run.region.tut), r = oWin.apply(this, arguments), m = this.meta;
    if (tut && m) {
      if (m.inv['bbp:tavern']) M.invAdd(m, 'bbp:tavern', -1);
      M.preTavern(m); m.baseTut = 99; this.save();
      const e = this.endInfo; if (e && e.tiles) e.tiles = e.tiles.map(t => t.n === '酒馆图纸' ? Object.assign({}, t, { n: '酒馆', v: '已建好', img: M.spriteURL('b_tavern', 7) || t.img, tip: { title: '酒馆', c: '#ffe08a', d: M.BUILDINGS.tavern.d } }) : t);
    }
    return r;
  };
})();
