// ==== mc-pskill.js ====
(function () {
// Leaders have two skills.
//  · 军团技能: the old one. The player presses it while the leader commands from the sidelines; cooldown counted in map nodes.
//    Once the leader takes the field it folds away for the rest of the battle.
//  · 个人技能: cast by the leader itself on the field (and automatically in base defence), charged like a unit skill —
//    rage from blows, energy from hits, mana over time, or a cooldown in seconds. Taking the field fills it once.
const M = window.MC, G = M.Game.prototype, HEROES = M.HEROES, S = M.Sfx;
const RES = { rage: { n: '怒气', c: '#ff5a3a' }, energy: { n: '能量', c: '#ffcc33' }, mana: { n: '法力', c: '#6fa8ff' }, cd: { n: '冷却', c: '#9fd8c8' } };
const near = (list, x, y, r) => list.filter(o => Math.hypot(o.x - x, (o.y - y) * 1.3) < r);
// gain: hurt = per 1% of max life lost, hit = per landed attack, kill = per kill, t = per second. raidRate: per second in base defence.
const PS = {
  watchman: { n: '灯盾猛击', ic: 't_rage', res: 'rage', max: 100, gain: { hurt: 2.4, hit: 8 }, raidRate: 12, col: '#ffcf4a',
    d: '怒气满时，用灯盾砸向身边的敌人：2.5 倍攻击伤害并击晕 1.5 秒，自己获得 20% 生命的护盾。受伤和攻击都会积攒怒气。',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 240); b.ring(h.x, h.y - 40, 20, 240, this.col, 12, 0.45); b.shake = Math.max(b.shake, 14);
      f.forEach(o => { b.deal(h, o, h.atk * 2.5, { skill: 1, col: this.col, big: 1, pskill: 1 }); o.stun = Math.max(o.stun || 0, 1.5); }); h.shield = (h.shield || 0) + h.maxHp * 0.2; S.impact && S.impact(); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 240); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 240, t0: R.t, life: 0.45 }); f.forEach(o => { R.damage(o, e.atk * 2.5, this.col); o.t = (o.t || 0) + 1.5; o.slow = Math.max(o.slow || 0, 1.5); }); e.hp = Math.min(e.max, e.hp + e.max * 0.15); } },
  widow: { n: '致命一掷', ic: 't_crit', res: 'energy', max: 100, gain: { hit: 14 }, raidRate: 13, col: '#ffcc33',
    d: '能量满时，朝生命最高的敌人掷出一张牌：6 倍攻击伤害；如果打死了它，倍率 +0.1。每次攻击命中积攒能量。',
    cast(b, h) { const f = b.ents.filter(o => b.active(o) && o.side === 'E'); if (!f.length) return false; const tg = f.reduce((a, o) => (o.hp > a.hp ? o : a));
      b.fx.push({ k: 'beam', x1: h.x + 20, y1: h.y - 60, x2: tg.x, y2: tg.y - 40, col: this.col, t0: b.t, life: 0.35 }); b.burst(tg.x, tg.y - 40, this.col, 18);
      b.deal(h, tg, h.atk * 6, { skill: 1, col: this.col, big: 1, crit: 1, pskill: 1 }); if (!tg.alive) b.addMult(0.1, tg.x, tg.y - 140, '绝杀'); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 900); if (!f.length) return false; const tg = f.reduce((a, o) => (o.hp > a.hp ? o : a)); R.fx.push({ k: 'beam', x1: e.x, y1: e.y - 40, x2: tg.x, y2: tg.y - 40, col: this.col, w: 12, t0: R.t, life: 0.3 }); R.damage(tg, e.atk * 6, this.col); } },
  nun: { n: '圣光祷言', ic: 't_heal', res: 'mana', max: 100, gain: { t: 12 }, raidRate: 12, col: '#b8ffb0',
    d: '法力满时（约 8 秒），为自己和所有部队回复 20% 生命，并灼伤身边的敌人（1.2 倍攻击）。法力随时间回复。',
    cast(b, h) { b.ents.forEach(o => { if (o.alive && o.side === 'A' && !o.bench) { b.healE(o, o.maxHp * 0.2); b.fx.push({ k: 'pillar', x: o.x, w: 70, col: '#d8ffd0', t0: b.t, life: 0.8 }); } });
      near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 280).forEach(o => b.deal(h, o, h.atk * 1.2, { skill: 1, col: '#fff2a0', pskill: 1 })); b.ring(h.x, h.y - 40, 20, 280, this.col, 10, 0.5); S.heal && S.heal(); },
    raid(R, e) { R.ents.forEach(o => { if (o.alive && o.side === 'A') o.hp = Math.min(o.max, o.hp + o.max * 0.2); }); R.ents.forEach(o => { if (o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 280) R.damage(o, e.atk * 1.2, '#fff2a0'); }); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 280, t0: R.t, life: 0.5 }); } },
  butcherlord: { n: '剁骨旋风', ic: 't_claw', res: 'rage', max: 100, gain: { hit: 12, kill: 30, hurt: 1.5 }, raidRate: 11, col: '#ff3a3a',
    d: '怒气满时原地旋转：身边所有敌人受到 3 倍攻击伤害，每砍中一个回复 6% 生命。攻击、击杀、受伤都积攒怒气。',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 220); b.ring(h.x, h.y - 40, 30, 220, this.col, 16, 0.4); b.ring(h.x, h.y - 40, 10, 180, '#ffffff', 6, 0.3); b.shake = Math.max(b.shake, 12);
      f.forEach(o => b.deal(h, o, h.atk * 3, { skill: 1, col: this.col, big: 1, pskill: 1 })); if (f.length) b.healE(h, h.maxHp * 0.06 * f.length); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 220); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 220, t0: R.t, life: 0.4 }); f.forEach(o => R.damage(o, e.atk * 3, this.col)); e.hp = Math.min(e.max, e.hp + e.max * 0.06 * f.length); } },
  clockmaker: { n: '停摆', ic: 't_hourglass', res: 'cd', max: 7, gain: { t: 1 }, raidRate: 1, col: '#9fd8c8',
    d: '每 7 秒一次：让最近的 3 个敌人停摆 2.5 秒，并造成 2 倍攻击伤害。',
    cast(b, h) { const f = b.ents.filter(o => b.active(o) && o.side === 'E').sort((a, c) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(c.x - h.x, c.y - h.y)).slice(0, 3); if (!f.length) return false;
      f.forEach(o => { o.stun = Math.max(o.stun || 0, 2.5); b.deal(h, o, h.atk * 2, { skill: 1, col: this.col, pskill: 1 }); b.fx.push({ k: 'clock', x: o.x, y: o.y - 60, t0: b.t, life: 0.9 }); }); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E').sort((a, c) => Math.abs(a.x - e.x) - Math.abs(c.x - e.x)).slice(0, 3); if (!f.length) return false; f.forEach(o => { o.t = (o.t || 0) + 2.5; o.slow = Math.max(o.slow || 0, 2.5); R.damage(o, e.atk * 2, this.col); }); } },
  cremator: { n: '焚身', ic: 't_flame', res: 'cd', max: 6, gain: { t: 1 }, raidRate: 1, col: '#ff6a2a',
    d: '每 6 秒一次：身边燃起火浪，1.5 倍攻击伤害并点燃敌人（每秒 0.8 倍攻击，持续 3 秒）。',
    cast(b, h) { const f = near(b.ents.filter(o => b.active(o) && o.side === 'E'), h.x, h.y, 280); b.fx.push({ k: 'boom', x: h.x, y: h.y - 30, t0: b.t, life: 0.5 }); b.ring(h.x, h.y - 30, 20, 280, this.col, 14, 0.45);
      f.forEach(o => { b.deal(h, o, h.atk * 1.5, { skill: 1, col: this.col, pskill: 1 }); b.ignite(o, h.atk * 0.8, h); }); },
    raid(R, e) { const f = R.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 280); R.fx.push({ k: 'boom', x: e.x, y: e.y - 20, r: 280, t0: R.t, life: 0.5 }); f.forEach(o => R.damage(o, e.atk * 2.4, this.col)); } },
};
Object.keys(PS).forEach(k => { PS[k].resN = RES[PS[k].res].n; PS[k].resC = RES[PS[k].res].c; if (HEROES[k]) HEROES[k].pskill = PS[k]; });
M.PSKILL = PS;
M.pskillOf = (h) => PS[h.cls];
M.pskillLine = (h) => { const P = PS[h.cls]; return P ? '个人技能「' + P.n + '」（' + P.resN + '）：' + P.d : ''; };

// ───────── battle ─────────
const BP = M.Battle3.prototype;
BP.psInit = function () { if (this.ps) return this.ps; const P = PS[this.run.hero.cls]; this.ps = P ? { P, v: 0, n: 0 } : null; return this.ps; };
BP.psGain = function (k, amt) { const s = this.psInit(); if (!s || this.hero.bench || !this.hero.alive || this.over) return; const g = s.P.gain[k]; if (g) s.v = Math.min(s.P.max, s.v + g * (amt == null ? 1 : amt)); };
BP.psCast = function () {
  const s = this.ps, h = this.hero, P = s.P; if (P.cast(this, h) === false) return; s.v = 0; s.n++;
  const first = s.n === 1; this.float(h.x, h.y - 150 * (h.sz || 1), (first ? '上场 · ' : '') + P.n, P.col, first ? 46 : 34);
  if (first) this.cutin = { at: performance.now(), text: '上场 · ' + P.n, sub: P.d, col: P.col, sprite: HEROES[this.run.hero.cls].sprite };
  if (S.cast) S.cast();
};
const oStep = BP.step;
BP.step = function (dt) {
  oStep.call(this, dt); const s = this.psInit(), h = this.hero; if (!s || h.bench || !h.alive || this.over || dt <= 0) return;
  if (!s.full) { s.full = 1; s.v = s.P.max; }                          // taking the field charges it once
  if (s.P.gain.t) s.v = Math.min(s.P.max, s.v + s.P.gain.t * dt);
  if (s.v >= s.P.max && this.active(h) && this.ents.some(o => this.active(o) && o.side === 'E')) this.psCast();
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
    if (e.ps >= P.max && this.ents.some(o => o.alive && o.side === 'E' && Math.abs(o.x - e.x) < 900)) { if (P.raid.call(P, this, e) !== false) { e.ps = 0; this.float(e.x, e.y - 130, P.n, P.col, 32); if (S.cast) S.cast(); } }
  });
};

// ───────── words ─────────
const oHT = G.heroTip;
G.heroTip = function (h) {
  const t = oHT.call(this, h); if (!t || !h) return t; const H = HEROES[h.cls], P = PS[h.cls];
  t.d = '军团技能「' + H.skill.n + '」（点击释放）：' + M.skillDesc(h) + '，冷却 ' + M.skillNodeCd(h, this.meta) + ' 个节点。';
  if (P) t.lines = [{ t: '个人技能「' + P.n + '」（上场后自动 · ' + P.resN + '）：' + P.d, c: P.col }].concat(t.lines || []);
  return t;
};
const oTF = G.tipFor;
G.tipFor = function (key) {
  const p = this.panel, m = this.meta, h = p && p.kind === 'hero' && m && m.heroes.find(x => x.id === p.id);
  if (h && key === 'hs-ps') { const P = PS[h.cls]; return { title: '个人技能「' + P.n + '」', c: P.col, kind: '上场后自动释放 · ' + P.resN, d: P.d, icon: P.ic, lines: [{ t: '部队全灭、领袖亲自上场时会先放一次；守城战里也会自动释放。', c: '#a89ca8' }, { t: '伤害随领袖攻击力（等级、品质、天赋）提升。', c: '#a89ca8' }] }; }
  const t = oTF.call(this, key);
  if (h && key === 'tal-root' && t) { t.kind = '军团技能 · 点击释放'; t.lines = [{ t: '领袖在场外指挥时，点下方按钮释放。冷却 ' + M.skillNodeCd(h, m) + ' 个节点，每场最多 1 次。', c: '#a89ca8' }, { t: '领袖亲自上场后收起，改由个人技能作战。', c: '#a89ca8' }]; }
  return t;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), p = this.panel, m = this.meta;
  // hero page: the personal skill sits next to rarity / level / points
  if (v.pn && v.pn.isHero && p && p.kind === 'hero') { const h = m.heroes.find(x => x.id === p.id), P = h && PS[h.cls]; if (P && v.pn.heads) v.pn.heads = v.pn.heads.concat([{ tip: 'hs-ps', ic: M.iconURL(P.ic, 2), t: P.n, c: P.col, hasBar: false, bar: '0%', anim: 'none' }]); }
  // battle HUD: the folded legion bar shows the personal skill charging
  const b = this.battle; if (v.h && b && this.run) { const s = b.psInit && b.psInit(); v.h.psOn = !!(s && !b.hero.bench); if (s) Object.assign(v.h, { psName: s.P.n, psRes: s.P.res === 'cd' ? Math.max(0, Math.ceil(s.P.max - s.v)) + ' 秒' : s.P.resN, psW: Math.round(s.v / s.P.max * 100) + '%', psC: s.P.col }); if (v.h.skillSub && b.canCast && b.canCast()) v.h.skillSub = '军团技能 · ' + v.h.skillSub; }
  return v;
};
})();

;
