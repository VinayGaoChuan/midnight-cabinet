// ==== mc-passive.js ====
(function () {
// Leaders have a passive, not a skill to press (user ruling 2026-09-26: 「把局内的英雄主动技能去掉，换成被动技能，也就是说，
// 拉开英雄与英雄不同的就是英雄的这个被动技能。后续的随机天赋也可能随机出对这个被动技能进行强化的天赋」).
// · One passive per leader, always on in an expedition's fights; its number grows with the leader's level.
// · Whatever made the old skill stronger makes the passive stronger (M.skillPow, mc-spend.js): the talent 神秘术 in the
//   random trees, 布达拉宫, a relic's 技能 line, 秘法化, the doctrine 冥想.
// · Gone: the skill button in the fight, 空格, the cooldown pips, the tutorial's skill hint.
const M = window.MC, G = M.Game.prototype, HEROES = M.HEROES, S = M.Sfx;
const pct = (v) => Math.round(v * 100);
const PV = {
  watchman:    { n: '照夜', col: '#ffcf4a', v: (lv) => 1 + 0.08 * lv, d: (v) => '每 12 秒所有敌人停顿 ' + v.toFixed(1) + ' 秒' },
  widow:       { n: '豪赌', col: '#ffcc33', v: (lv) => 0.08 + 0.01 * lv, d: (v) => '部队的攻击有 ' + pct(v) + '% 的概率造成双倍伤害' },
  nun:         { n: '圣咏', col: '#b8ffb0', v: (lv) => 0.06 + 0.006 * lv, d: (v) => '每 6 秒全队回复 ' + pct(v) + '% 生命' },
  butcherlord: { n: '血祭', col: '#ff3a3a', v: (lv) => 0.06 + 0.006 * lv, d: (v) => '每倒下一支部队，其余部队攻击 +' + pct(v) + '%' },
  clockmaker:  { n: '倒带', col: '#9fd8c8', v: (lv) => 0.1 + 0.01 * lv, d: (v) => '部队攻速 +' + pct(v) + '%' },
  cremator:    { n: '火葬', col: '#ff6a2a', v: (lv) => 0.1 + 0.01 * lv, d: (v) => '部队打倒的敌人会起火，点燃身边的敌人（每秒 ' + pct(v) + '% 生命）' },
};
M.PASSIVE = PV;
Object.keys(PV).forEach(k => { if (HEROES[k]) Object.assign(HEROES[k].skill, { n: PV[k].n, v: PV[k].v, d: PV[k].d, passive: 1 }); });
M.heroSkillD = (h) => M.skillDesc(h) + '。';
M.passiveOf = (h) => (h && PV[h.cls]) || null;

// ───────── in the fight ─────────
const BP = M.Battle3.prototype, B2P = M.Battle2.prototype;
const oInit = BP.init;
BP.init = function (run, cfg) {
  const h = run && run.hero, P = h && PV[h.cls];
  this.pv = P ? { k: h.cls, v: M.skillVal(h), t: 0, P } : null; this.pvMods = null;
  const r = oInit.apply(this, arguments);
  const pv = this.pv;
  if (pv && pv.k === 'watchman') pv.t = 12 - 3;   // the first light comes 3 seconds in, once the lines have met
  return r;
};
// 照夜: every 12 seconds of fighting, every enemy on the field stands still
function nightLight(b, pv) {
  let n = 0; b.ents.forEach(e => { if (b.active(e) && e.side === 'E') { e.stun = Math.max(e.stun || 0, pv.v); n++; b.ring(e.x, e.y - 40, 10, 70, pv.P.col, 5, 0.5); } });
  if (n) { b.float(960, 150, pv.P.n, pv.P.col, 48); b.flash = Math.max(b.flash || 0, 0.25); b.flashCol = '#fff2a0'; S.bell ? S.bell() : S.impact && S.impact(); }
}
// 倒带: every unit of ours (summons too) swings faster
const oMk = BP.mk;
BP.mk = function (o) { const e = oMk.apply(this, arguments); const pv = this.pv; if (pv && pv.k === 'clockmaker' && e && e.side === 'A' && !e.isHero) e.asB = (e.asB || 0) + pv.v; return e; };
// 豪赌: our blows may land twice as hard (the fight's crit chance, for our side only)
const oStrike = BP.strike;
BP.strike = function (e) {
  const pv = this.pv; if (!(pv && pv.k === 'widow' && e && e.side === 'A')) return oStrike.apply(this, arguments);
  const m0 = this.mods; this.mods = this.pvMods || (this.pvMods = Object.assign({}, m0, { crit: (m0.crit || 0) + pv.v }));
  try { return oStrike.apply(this, arguments); } finally { this.mods = m0; }
};
// 圣咏: every 6 seconds of fighting the army heals; 照夜 keeps its own clock
const oStep = BP.step;
BP.step = function (dt) {
  const r = oStep.apply(this, arguments), pv = this.pv;
  if (pv && pv.k === 'watchman' && dt > 0 && !this.over && this.t > (this.fightT0 || 0)) { pv.t += dt; if (pv.t >= 12) { pv.t = 0; nightLight(this, pv); } }
  if (pv && pv.k === 'nun' && dt > 0 && !this.over && this.t > (this.fightT0 || 0)) {
    pv.t += dt; if (pv.t >= 6) { pv.t = 0; let n = 0;
      this.ents.forEach(o => { if (this.active(o) && o.side === 'A' && !o.bench && o.hp < o.maxHp) { this.heal(o, o.maxHp * pv.v, pv.P.col); this.ring(o.x, o.y - 30, 10, 80, pv.P.col, 4, 0.5); n++; } });
      if (n) { this.float(700, 150, pv.P.n, pv.P.col, 40); S.heal && S.heal(); } }
  }
  return r;
};
// 血祭: a unit of ours falls, the rest hit harder for the rest of the fight · 火葬: what our army brings down catches fire
const oKill = BP.kill;
BP.kill = function (e, src) {
  const was = e && e.alive, r = oKill.apply(this, arguments), pv = this.pv;
  if (!pv || !was || e.alive) return r;
  if (pv.k === 'butcherlord' && e.side === 'A' && !e.isHero && !e.summon) {
    let n = 0; this.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.isHero && o !== e) { o.atk *= 1 + pv.v; n++; } });
    if (n) { this.float(e.x, e.y - 120, pv.P.n + ' · 攻击 +' + pct(pv.v) + '%', pv.P.col, 28); this.ring(e.x, e.y - 30, 10, 160, pv.P.col, 8, 0.45); }
  }
  if (pv.k === 'cremator' && e.side === 'E' && src && src.side === 'A') {
    const R = 170, dps = (e.maxHp || 0) * pv.v; let n = 0;
    if (dps > 0) this.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.hypot(o.x - e.x, (o.y - e.y) * 1.2) < R && !(o.burn && o.burn.dps > dps && o.burn.until > this.t)) { this.ignite(o, dps, src); n++; } });
    this.ring(e.x, e.y - 20, 10, R, pv.P.col, 6, 0.4); if (n && this.burst) this.burst(e.x, e.y - 30, pv.P.col, 10);
  }
  return r;
};
// nothing to press any more
B2P.castSkill = function () { return false; };
B2P.canCast = function () { return false; };
G.castSkill = function () {};

// ───────── words and screens ─────────
G.skillTipOf = function (h) { const P = M.passiveOf(h); return P ? { title: P.n, c: P.col, icon: (M.SKILL_IC || {})[h.cls] || 't_skill', kind: '被动', d: M.heroSkillD(h) } : null; };
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run, h = run && run.hero, P = M.passiveOf(h);
  if (v.h) v.h.skOn = false;   // the battle's skill panel is gone
  if (v.w && P) { v.w.skill = P.n; v.w.skillTxt = '被动'; v.w.skillC = P.col; v.w.pips = []; }
  return v;
};
// what used to speak of the leader's skill speaks of the passive
const re = (s) => (typeof s === 'string' ? s.replace(/领袖技能/g, '领袖被动技能') : s);
if (M.TALENTS && M.TALENTS.mystic) M.TALENTS.mystic.d = (v) => '本领袖的被动技能效果 +' + v * 20 + '%。';
if (M.STATS && M.STATS.skillCd) M.STATS.skillCd.d = '被动技能效果 +{v}%';
if (M.BUILDINGS && M.BUILDINGS.potala) M.BUILDINGS.potala.d = re(M.BUILDINGS.potala.d);
if (M.DIRS && M.DIRS.arcane) M.DIRS.arcane.t = re(M.DIRS.arcane.t);
if (M.REL_DOCTRINES) Object.values(M.REL_DOCTRINES).forEach(list => (list || []).forEach(e => { if (e && e.t) e.t = re(e.t); }));
})();
