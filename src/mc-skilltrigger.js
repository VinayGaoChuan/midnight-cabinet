// ==== mc-skilltrigger.js ====
(function () {
// Skills fire when they make sense, not on a timer. The army takes the field with every skill ready (a full bar);
// a ready skill waits until its trigger holds — a healer waits for someone to get hurt, a whirl for enemies around it,
// a volley for a cluster to hit — and the unit keeps fighting normally meanwhile. Enemies fill their bars as before
// and use the same triggers. Leaders' skills on the field follow the same idea (M.psReady).
const M = window.MC, P = M.Battle3.prototype;
const RS = 125, RM = 195, RL = 330;
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.2);
const foesOf = (b, e) => b.foes(e);
const need = (n, alive) => Math.max(1, Math.min(n, alive));
const reach = (e) => (e.range || 150) + 100;
const tgOf =(b, e) => (e.target && b.active(e.target) && e.target.side !== e.side ? e.target : b.nearestFoe(e, 3000));
// trigger kinds: test(b, e) → true when the skill should fire now; d: how it reads to players (tooltips, docs)
const T = {
  hurt: (p) => ({ d: '有友军生命低于 ' + Math.round(p * 100) + '%', test: (b, e) => b.allies(e).some(o => o.hp / o.maxHp <= p) }),
  near: (r, n) => ({ d: n > 1 ? '身边有 ' + n + ' 个以上敌人（只剩更少时也放）' : '有敌人贴到身边（' + r + ' 以内）', test: (b, e) => { const f = foesOf(b, e); return f.filter(o => dist(o, e) <= r * (e.sz || 1)).length >= need(n, f.length); } }),
  cluster: (r, n) => ({ d: '射程内的目标附近有 ' + n + ' 个以上敌人扎堆（只剩更少时也放）', test: (b, e) => { const tg = tgOf(b, e); if (!tg || dist(tg, e) > reach(e)) return false; const f = foesOf(b, e); return f.filter(o => dist(o, tg) <= r).length >= need(n, f.length); } }),
  count: (n) => ({ d: '攻击范围内有 ' + n + ' 个以上敌人（只剩更少时也放）', test: (b, e) => { const f = foesOf(b, e); return f.length > 0 && f.filter(o => dist(o, e) <= reach(e)).length >= need(n, f.length); } }),
  leap: (r) => ({ d: '最近的敌人进入 ' + r + ' 距离', test: (b, e) => !!b.nearestFoe(e, r) }),
  engage: (m) => ({ d: '敌人进入攻击范围', test: (b, e) => !!b.nearestFoe(e, (e.range || 150) + (m || 60)) }),
  approach: (r) => ({ d: '有敌人逼近到 ' + r + ' 以内', test: (b, e) => !!b.nearestFoe(e, r) }),
  allyFight: () => ({ d: '攻击最高的友军开始交战', test: (b, e) => { const a = b.allies(e).filter(o => o !== e).sort((x, y) => y.atk - x.atk)[0]; return !!(a && b.nearestFoe(a, (a.range || 150) + 60)); } }),
  bigTarget: (p) => ({ d: '射程内的目标生命还多（≥ ' + Math.round(p * 100) + '%，只剩 1 个敌人时也放）', test: (b, e) => { const tg = b.nearestFoe(e, (e.range || 150) + 200); if (!tg) return false; return tg.hp / tg.maxHp >= p || foesOf(b, e).length === 1; } }),
  hurtAndSelf: (p, self) => ({ d: '有友军生命低于 ' + Math.round(p * 100) + '%，且自己生命高于 ' + Math.round(self * 100) + '%', test: (b, e) => e.hp / e.maxHp >= self && b.allies(e).some(o => o !== e && o.hp / o.maxHp <= p) }),
  costly: (hp, r) => ({ d: '有敌人逼近到 ' + r + ' 以内，且自己生命够扣（> ' + hp * 2 + '）', test: (b, e) => e.hp > hp * 2 && !!b.nearestFoe(e, r) }),
  any: () => ({ d: '场上有敌人', test: (b, e) => foesOf(b, e).length > 0 }),
};
// every castable skill: a unit's own mana trait, by class (without Summon…Trait)
const TRIG = {
  ChainHeal: T.hurt(0.7), SkullStew: T.hurt(0.6), LifeExchange: T.hurtAndSelf(0.6, 0.5), SoulTransfer: T.hurtAndSelf(0.6, 0.5),
  ShellShock: T.cluster(RS, 2), IronHail: T.cluster(RS, 2), SwordRain: T.cluster(RS, 2), BladeStorm: T.cluster(RS, 2),
  LightningStrike: T.count(3), ForbiddenFruit: T.near(RM + 60, 3),
  InvigorateSuper: T.engage(), SolarFlare: T.engage(), SolarFlareSuper: T.engage(), RapidFire: T.engage(), Aegis: T.engage(), FinalJudgment: T.engage(),
  MindWarp: T.allyFight(),
  WaterSpoutNew: T.bigTarget(0.4), Asteroid: T.bigTarget(0.4), EnergySurge: T.bigTarget(0.4),
  HoundSummoning: T.approach(600), Hellhound: T.approach(600), Dragon: T.approach(600), Thanatos: T.approach(600), SummonCrabling: T.approach(600), SummonPincer: T.approach(600), SlimePropagation: T.approach(600), SummonFroggo: T.approach(600),
  DimensionalRift: T.costly(400, 600), DimensionalChasm: T.costly(1040, 600),
};
const DEF = T.engage();
M.SKILL_TRIG = TRIG;
const H = M.TRAIT_H, GROWTH = new Set(['JuniorFisherman', 'EliteFisherman', 'SpiritOffering']);
const castKey = (e) => { const t = e.traits.find(x => H[x.cls] && H[x.cls].full); return t ? t.cls.replace(/^Summon|Trait$/g, '') : null; };
M.skillTrig = (e) => TRIG[castKey(e)] || DEF;
// the same trigger by unit key (tooltips, docs): the first castable trait of the unit
M.unitTrigger = function (k) {
  const s = M.unitSkill && M.unitSkill(k); if (!s) return null;
  const t = (M.DB[k].tr || []).find(x => (M.TDB[x] || {}).n === s.n), key = t && t.replace(/^Summon|Trait$/g, '');
  return (key && TRIG[key]) || DEF;
};

// a ready skill fires only while its trigger holds (checked a few times a second)
const oCan = P.canSkill;
P.canSkill = function (e, ignoreTrigger) {
  if (!oCan.call(this, e)) return false; if (ignoreTrigger) return true;
  if (e._trT != null && this.t - e._trT < 0.1) return e._trV;
  e._trT = this.t; e._trV = !!M.skillTrig(e).test(this, e); return e._trV;
};
// ───────── leaders: personal skills wait for their moment too ─────────
// leaders: on the field their skill fires only when it can hit — see M.psReady in mc-pskill.js
})();

;
