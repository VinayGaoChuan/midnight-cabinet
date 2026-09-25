// ==== mc-pskill.js ====
(function () {
// A leader has ONE skill (user ruling 2026-09-24), shown as one thing everywhere. It has two halves:
//  · commanding from the sidelines: the player presses it (空格); cooldown counted in map nodes.
//  · on the field (and in base defence): it keeps working by itself, charged like a unit skill — rage from blows,
//    energy from hits, mana over time, or a cooldown in seconds — and fires only when it can actually hit (r, min).
//    No banner for it: it is not a big move.
const M = window.MC, G = M.Game.prototype, HEROES = M.HEROES, S = M.Sfx;
const RES = { rage: { n: '怒气', c: '#ff5a3a' }, energy: { n: '能量', c: '#ffcc33' }, mana: { n: '法力', c: '#6fa8ff' }, cd: { n: '冷却', c: '#9fd8c8' } };
const near = (list, x, y, r) => list.filter(o => Math.hypot(o.x - x, (o.y - y) * 1.3) < r);
// gain: hurt = per 1% of max life lost, hit = per landed attack, kill = per kill, t = per second. raidRate: per second in base defence.
const PS = {
  watchman: { n: '灯盾猛击', ic: 't_rage', r: 240, min: 1, res: 'rage', max: 100, gain: { hurt: 2.4, hit: 8 }, raidRate: 12, col: '#ffcf4a',
    d: '怒气满后，用灯盾砸晕身边的敌人',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 240); b.ring(h.x, h.y - 40, 20, 240, this.col, 12, 0.45); b.shake = Math.max(b.shake, 14);
      f.forEach(o => { b.deal(h, o, h.atk * 2.5, { skill: 1, col: this.col, big: 1, pskill: 1 }); o.stun = Math.max(o.stun || 0, 1.5); }); h.shield = (h.shield || 0) + h.maxHp * 0.2;  },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 240); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 240, t0: R.t, life: 0.45 }); f.forEach(o => { R.damage(o, e.atk * 2.5, this.col); o.t = (o.t || 0) + 1.5; o.slow = Math.max(o.slow || 0, 1.5); }); e.hp = Math.min(e.max, e.hp + e.max * 0.15); } },
  widow: { n: '致命一掷', ic: 't_crit', r: 0, min: 1, res: 'energy', max: 100, gain: { hit: 14 }, raidRate: 13, col: '#ffcc33',
    d: '能量满后，朝最肉的敌人掷出致命一牌',
    cast(b, h) { const f = b.ents.filter(o => b.active(o) && o.side === 'E'); if (!f.length) return false; const tg = f.reduce((a, o) => (o.hp > a.hp ? o : a));
      b.fx.push({ k: 'beam', x1: h.x + 20, y1: h.y - 60, x2: tg.x, y2: tg.y - 40, col: this.col, t0: b.t, life: 0.35 }); b.burst(tg.x, tg.y - 40, this.col, 18);
      b.deal(h, tg, h.atk * 6, { skill: 1, col: this.col, big: 1, crit: 1, pskill: 1 }); if (!tg.alive) b.addMult(0.1, tg.x, tg.y - 140, '绝杀'); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 900); if (!f.length) return false; const tg = f.reduce((a, o) => (o.hp > a.hp ? o : a)); R.fx.push({ k: 'beam', x1: e.x, y1: e.y - 40, x2: tg.x, y2: tg.y - 40, col: this.col, w: 12, t0: R.t, life: 0.3 }); R.damage(tg, e.atk * 6, this.col); } },
  nun: { n: '圣光祷言', ic: 't_heal', r: 280, min: 2, res: 'mana', max: 100, gain: { t: 12 }, raidRate: 12, col: '#b8ffb0',
    d: '法力满后，治疗全队并灼伤身边的敌人',
    cast(b, h) { b.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.bench) { b.healE(o, o.maxHp * 0.2); b.fx.push({ k: 'pillar', x: o.x, w: 70, col: '#d8ffd0', t0: b.t, life: 0.8 }); } });
      near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 280).forEach(o => b.deal(h, o, h.atk * 1.2, { skill: 1, col: '#fff2a0', pskill: 1 })); b.ring(h.x, h.y - 40, 20, 280, this.col, 10, 0.5);  },
    raid(R, e) { R.ents.forEach(o => { if (o.alive && o.side === 'A') o.hp = Math.min(o.max, o.hp + o.max * 0.2); }); R.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 280) R.damage(o, e.atk * 1.2, '#fff2a0'); }); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 280, t0: R.t, life: 0.5 }); } },
  butcherlord: { n: '剁骨旋风', ic: 't_claw', r: 220, min: 1, res: 'rage', max: 100, gain: { hit: 12, kill: 30, hurt: 1.5 }, raidRate: 11, col: '#ff3a3a',
    d: '怒气满后，旋转攻击周围敌人',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 220); b.ring(h.x, h.y - 40, 30, 220, this.col, 16, 0.4); b.ring(h.x, h.y - 40, 10, 180, '#ffffff', 6, 0.3); b.shake = Math.max(b.shake, 12);
      f.forEach(o => b.deal(h, o, h.atk * 3, { skill: 1, col: this.col, big: 1, pskill: 1 })); if (f.length) b.healE(h, h.maxHp * 0.06 * f.length); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 220); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 220, t0: R.t, life: 0.4 }); f.forEach(o => R.damage(o, e.atk * 3, this.col)); e.hp = Math.min(e.max, e.hp + e.max * 0.06 * f.length); } },
  clockmaker: { n: '停摆', ic: 't_hourglass', r: 400, min: 1, res: 'cd', max: 7, gain: { t: 1 }, raidRate: 1, col: '#9fd8c8',
    d: '每 7 秒，让最近的敌人停摆',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, this.r).sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y)).slice(0, 3); if (!f.length) return false;
      f.forEach(o => { o.stun = Math.max(o.stun || 0, 2.5); b.deal(h, o, h.atk * 2, { skill: 1, col: this.col, pskill: 1 }); b.fx.push({ k: 'clock', x: o.x, y: o.y - 60, t0: b.t, life: 0.9 }); }); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E').sort((a, c) => Math.abs(a.x - e.x) - Math.abs(c.x - e.x)).slice(0, 3); if (!f.length) return false; f.forEach(o => { o.t = (o.t || 0) + 2.5; o.slow = Math.max(o.slow || 0, 2.5); R.damage(o, e.atk * 2, this.col); }); } },
  cremator: { n: '焚身', ic: 't_flame', r: 280, min: 1, res: 'cd', max: 6, gain: { t: 1 }, raidRate: 1, col: '#ff6a2a',
    d: '每 6 秒，点燃身边的敌人',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 280); b.fx.push({ k: 'boom', x: h.x, y: h.y - 30, t0: b.t, life: 0.5 }); b.ring(h.x, h.y - 30, 20, 280, this.col, 14, 0.45);
      f.forEach(o => { b.deal(h, o, h.atk * 1.5, { skill: 1, col: this.col, pskill: 1 }); b.ignite(o, h.atk * 0.8, h); }); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 280); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 280, t0: R.t, life: 0.5 }); f.forEach(o => R.damage(o, e.atk * 2.4, this.col)); } },
};
Object.keys(PS).forEach(k => { PS[k].resN = RES[PS[k].res].n; PS[k].resC = RES[PS[k].res].c; if (HEROES[k]) HEROES[k].pskill = PS[k]; });
M.PSKILL = PS;
M.pskillOf = (h) => PS[h.cls];
M.pskillLine = (h) => { const P = PS[h.cls]; return P ? '亲自上场后，' + P.d : ''; };
// the one skill, in one sentence: what the button does, then what it keeps doing on the field
// the skill button (map HUD, battle): the skill itself, said straight away — no Ctrl layer
G.skillTipOf = function (h) { return h && HEROES[h.cls] ? { title: HEROES[h.cls].skill.n, c: '#ffe08a', icon: (M.SKILL_IC || {})[h.cls] || 't_skill', d: M.heroSkillD(h, this.meta) } : null; };
M.heroSkillD = (h, m) => M.skillDesc(h) + '，冷却 ' + M.skillNodeCd(h, m) + ' 个节点。';
// ready to fire on the field: enough enemies inside the skill's own reach, measured the way the cast measures it
M.psReady = function (b, h, cls) { const P = PS[cls]; if (!P) return false; const foes = b.ents.filter(o => b.active(o) && o.side === 'E'); if (!foes.length) return false;
  if (cls === 'nun') return b.ents.some(o => o.alive && o.side === 'A' && !o.bench && o.hp / o.maxHp <= 0.75) || near(foes, h.x, h.y, P.r).length >= Math.min(P.min, foes.length);
  return !P.r || near(foes, h.x, h.y, P.r).length >= Math.min(P.min, foes.length); };

// ───────── battle ─────────
const BP = M.Battle3.prototype;
BP.psInit = function () { if (this.ps) return this.ps; const P = PS[this.run.hero.cls]; this.ps = P ? { P, v: 0, n: 0 } : null; return this.ps; };
BP.psGain = function (k, amt) { const s = this.psInit(); if (!s || this.hero.bench || !this.hero.alive || this.over) return; const g = s.P.gain[k]; if (g) s.v = Math.min(s.P.max, s.v + g * (amt == null ? 1 : amt) * this.psRate()); };
// 领袖技能冷却 -x% (talent 迅捷咏唱, weapon relics): the bar fills that much faster
BP.psRate = function () { return 1 / Math.max(0.4, 1 + ((this.mods && this.mods.skillCd) || 0)); };
BP.psCast = function () {
  const s = this.ps, h = this.hero, P = s.P; if (P.cast(this, h) === false) return; s.v = 0; s.n++;
  this.float(h.x, h.y - 150 * (h.sz || 1), HEROES[this.run.hero.cls].skill.n, P.col, 30);
  // 个人技能的声音由配方出（mc-px16-fx.js 的 castFx → Sfx.skillFx）
};
const oStep = BP.step;
BP.step = function (dt) {
  oStep.call(this, dt); const s = this.psInit(), h = this.hero; if (!s || h.bench || !h.alive || this.over || dt <= 0) return;
  if (!s.full) { s.full = 1; s.v = s.P.max; }                          // taking the field charges it once
  if (s.P.gain.t) s.v = Math.min(s.P.max, s.v + s.P.gain.t * dt * this.psRate());
  // a full bar waits until the skill can hit (M.psReady), checked a few times a second
  if (s.v >= s.P.max && this.active(h) && this.t - (s.trT || -1) >= 0.1) { s.trT = this.t; if (M.psReady(this, h, this.run.hero.cls)) this.psCast(); }
};
const oDeal = BP.deal;
BP.deal = function (src, tg, amt, o = {}) {
  const hp0 = tg && tg.hp, d = oDeal.call(this, src, tg, amt, o); const h = this.hero;
  if (d > 0 && h && !h.bench) { if (src === h && !o.pskill) this.psGain('hit'); if (tg === h) this.psGain('hurt', Math.min(hp0, d) / h.maxHp * 100); }
  return d;
};
const oKill = BP.kill;
BP.kill = function (e, src) { const was = e && e.alive; const r = oKill.call(this, e, src); if (was && src && src === this.hero && e.side === 'E') this.psGain('kill'); return r; };
// ───────── base defence: leaders cast on their own ─────────
const RP = M.Raid.prototype, oRStep = RP.step;
RP.step = function (dt) {
  oRStep.call(this, dt); if (this.over || dt <= 0) return;
  this.ents.forEach(e => {
    if (!e.hero || !e.alive) return; const P = PS[e.hero.cls]; if (!P) return;
    if (e.ps == null) e.ps = P.max * 0.6;
    e.ps += P.raidRate * dt; if (P.res === 'rage' && e.hp < e.psHp) e.ps += (e.psHp - e.hp) / e.max * 100 * (P.gain.hurt || 0); e.psHp = e.hp;
    const inR = this.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < (P.r || 900)).length;
    if (e.ps >= P.max && inR >= 1 && (e.hero.cls !== 'nun' || inR >= 2 || this.ents.some(o => o.alive && o.side === 'A' && o.hp < o.max * 0.75))) { if (P.raid.call(P, this, e) !== false) { e.ps = 0; this.float(e.x, e.y - 130, HEROES[e.hero.cls].skill.n, P.col, 30); if (S.cast) S.cast(); } }
  });
};

// ───────── words ─────────
const oHT = G.heroTip;
G.heroTip = function (h) {
  const t = oHT.call(this, h); if (!t || !h) return t; const H = HEROES[h.cls], P = PS[h.cls];
  t.d = H.skill.n + '：' + M.heroSkillD(h, this.meta);
  return t;
};
const oTF = G.tipFor;
G.tipFor = function (key) {
  const p = this.panel, m = this.meta, h = p && p.kind === 'hero' && m && m.heroes.find(x => x.id === p.id);
  const t = oTF.call(this, key);
  if (h && key === 'tal-root' && t) { t.title = M.HEROES[h.cls].skill.n; t.kind = ''; t.d = M.heroSkillD(h, m); t.lines = []; }
  return t;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), p = this.panel, m = this.meta;
  // battle HUD: the folded legion bar shows the personal skill charging
  const b = this.battle; if (v.h && b && this.run) { const s = b.psInit && b.psInit(); v.h.psOn = false; /* the on-field skill is only for show (user ruling 2026-09-24): no bar, no name */ if (s) Object.assign(v.h, { psName: HEROES[this.run.hero.cls].skill.n, psRes: s.P.res === 'cd' ? Math.max(0, Math.ceil(s.P.max - s.v)) + ' 秒' : s.P.resN, psW: Math.round(s.v / s.P.max * 100) + '%', psC: s.P.col });  }
  return v;
};
})();

;
