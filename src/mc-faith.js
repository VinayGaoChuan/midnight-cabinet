// ==== mc-faith.js ====
(function () {
// 信仰值 (user ruling 2026-09-26: 「建造信仰类建筑会解锁，从此，常驻资源中就有信仰值了（他会有自己的用处），局内就可以
// 通过某些方法收集信仰值，而如果不建这类建筑，就不会出现信仰值」).
// · The first 信仰 room that stands unlocks it for good (m.faithOn): the bar shows it from then on. Before that it shows
//   nowhere, no 神龛 appears and nothing drops it.
// · Every 信仰 room makes some each day (fx.faithDaily; 灵脉 under one makes more).
// · On an expedition: 神龛 stops (an event kind of their own) and, now and then, a kill of the undead or the demons.
//   It comes home with the haul (and is lost with it).
// · What it is for: growing the religion (mc-religion.js, user ruling 2026-09-26). 祈福 before setting out and paying
//   the revival with faith are gone: nobody plays towards losing a fight.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, BP = M.Battle3 && M.Battle3.prototype;
const FC = '#ffe6a0', now = () => performance.now();
if (M.GUIDE) M.GUIDE.push({ id: 'faith', cat: '基地', icon: 'f_faith', title: '信仰值', line: '建了信仰类建筑才会出现；攒够了宗教就升一级。', scr: 'base', sel: '[data-fx="mfa"]' },
  { id: 'shrine', cat: '出征', icon: 'f_faith', title: '神龛', line: '有了信仰值以后，地图上会出现神龛，在那里祈祷能收集信仰值。', scr: 'world', sel: '[data-g="nothing"]' });
M.faithOn = (m) => !!(m && m.faithOn);
const unlock = (m) => { if (!m || m.faithOn || !M.hasBuilt || !M.hasBuilt(m, X => X.cat === 'faith')) return false; m.faithOn = true; m.faith = m.faith || 0; return true; };
M.faithUnlock = unlock;

// ───────── every day ─────────
const oAD = M.advanceDay;
M.advanceDay = function (m) {
  const logs = oAD.apply(this, arguments);
  if (unlock(m)) logs.push({ t: '新的资源：信仰值', faith: 1 });
  if (m.faithOn) { const f = Math.round(M.baseMods(m).faithDaily || 0); if (f > 0) { m.faith = (m.faith || 0) + f; logs.push({ t: '信仰值 +' + f }); } }
  return logs;
};

// ───────── the bar ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (m && (!this._faithChk || now() - this._faithChk > 1000)) { this._faithChk = now(); if (unlock(m)) { this.save(); this.toast('新的资源：信仰值', FC); } }
  if (v.b && v.b.res && M.faithOn(m)) v.b.res.push({ img: M.spriteURL('f_faith', 4), v: this.tv('mfa', m.faith || 0), c: FC, fx: 'mfa', sc: this.ps('mfa'), tipOn: this.tipFn(() => this.tipFor('rel-faith')) });   // the religion's level and doctrines (mc-religion.js)
  if (v.pn && v.pn.isLoadout) v.pn.blessOn = false;   // 祈福 is gone (2026-09-26)
  return v;
};

// 祈福 is gone (2026-09-26): old saves may still hold a blessing chosen for the next trip
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments); run.loot.faith = 0; if (meta) delete meta.blessNext; return run; };

// ───────── 神龛 on the expedition map ─────────
if (M.EVENTS) M.EVENTS.shrine = { n: '神龛', sprite: 'candle', text: '路边的小神龛里点着一盏长明灯。在这里祈祷，能收集信仰值。' };
const oGen = M.genMap2;
M.genMap2 = function (run, meta) {
  const map = oGen.apply(this, arguments), m = meta || run.M, nodes = map && map.nodes;
  if (!nodes || !M.faithOn(m) || (run.region && run.region.tut)) return map;
  // about one 神龛 every other segment, in place of a 奇遇
  const bySeg = {}; nodes.forEach(n => { if (n.type === 'event' && n.ev !== 'shrine') (bySeg[n.seg || 0] = bySeg[n.seg || 0] || []).push(n); });
  Object.keys(bySeg).forEach(s => { if (Math.random() < 0.5) { const n = M.pick(bySeg[s]); n.ev = 'shrine'; } });
  return map;
};
const oIcon = M.nodeIcon;
M.nodeIcon = (n) => (n && n.seen && n.type === 'event' && n.ev === 'shrine' ? 'f_faith' : oIcon(n));
M.shrineGain = (run) => 4 + Math.round((M.chapterIndex ? Math.max(0, M.chapterIndex(run.regionKey)) : 0) * 0.5);
const oOpen = G.openEvent;
G.openEvent = function (n) {
  if (!n || n.ev !== 'shrine') return oOpen.apply(this, arguments);
  const run = this.run, g0 = M.shrineGain(run), g1 = g0 * 3, C = (t, sub, fn) => ({ t, sub, fn });
  const give = (v, txt) => { run.loot.faith = (run.loot.faith || 0) + v; S.up && S.up(2); const p = this.fxPos('hp') || { x: 960, y: 400 }; this.fx.pop && this.fx.pop(960, 420, '信仰值 +' + v, FC, 44); this.evResult(txt + '信仰值 +' + v + '（带回基地才算数）。', FC); };
  return this.evModal('神龛', 'candle', M.EVENTS.shrine.text, [
    C('祈祷', '信仰值 +' + g0, () => give(g0, '灯火跳了一下。')),
    C('献上鲜血', '领袖 -15% 生命，信仰值 +' + g1, () => { this.heroHurt(0.15); give(g1, '血滴进灯油里，火苗变成了金色。'); }),
    C('离开', '', () => this.finishNode()),
  ], 2, FC);
};

// ───────── the undead and the demons sometimes leave a little faith ─────────
const FAITH_RACES = ['不死', '骷髅', '僵尸', '恶魔'];
if (BP) {
  const oKill = BP.kill;
  BP.kill = function (e, src) {
    const was = e && e.alive, r = oKill.apply(this, arguments), run = this.run;
    if (was && e && !e.alive && e.side === 'E' && run && run.loot && !(run.region && run.region.tut) && M.faithOn(run.M) && FAITH_RACES.includes(e.d && e.d.race) && Math.random() < (e.boss ? 1 : e.elite ? 0.3 : 0.06)) {
      const v = e.boss ? 3 : 1; run.loot.faith = (run.loot.faith || 0) + v; this.float(e.x, e.y - 90 * (e.sz || 1), '信仰 +' + v, FC, 30);
    }
    return r;
  };
}

// ───────── home with the haul ─────────
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, m = this.meta, f = (run && run.loot && run.loot.faith) || 0;
  const r = oWin.apply(this, arguments), e = this.endInfo;
  if (f > 0 && M.faithOn(m)) { m.faith = (m.faith || 0) + f; this.save(); if (e) { e.gain = e.gain || {}; e.gain.mfa = f; (e.tiles = e.tiles || []).push({ img: M.spriteURL('f_faith', 6), n: '信仰值', v: '+' + f, c: FC, icon: 'f_faith' }); } }
  return r;
};
const oBack = G.endBack;
G.endBack = function () { const e = this.endInfo, gain = e && e.gain; if (gain && gain.mfa > 0) this.hold('mfa', (this.meta.faith || 0) - gain.mfa); return oBack.apply(this, arguments); };
const oFly = G.lootFly;
G.lootFly = function (gain, from) {
  const r = oFly.apply(this, arguments), v = gain && gain.mfa;
  if (v > 0) { const n = Math.max(3, Math.min(6, 2 + Math.round(v / 5))); for (let j = 0; j < n; j++) this.fly('f_faith', { x: from.x + (Math.random() - 0.5) * 150, y: from.y + (Math.random() - 0.5) * 90 }, 'mfa', FC, j === n - 1 ? () => { this.release('mfa'); const p = this.fxPos('mfa'); if (p) this.fx.pop(p.x, p.y + 50, '+' + v, FC, 32, { num: 1 }); } : null, 0.9 + j * 0.08); setTimeout(() => { if (this.held.mfa != null) this.release('mfa'); }, 3600); }
  return r;
};
})();
