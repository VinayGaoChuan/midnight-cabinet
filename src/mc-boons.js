// ==== mc-boons.js ====
(function () {
// What the base gives shows in the fight (2026-09-26, from the analysis 「局内跟局外联系是否紧密」, fix 5): as a fight opens,
// every source that strengthens this army slides in on the left under the bar — the base's buildings, the 发展方向, the
// religion, the leader's talents and relics (in a 混沌来袭 also what strengthens the garrison) — M.boonsOf lists them, the
// battle bar (mc-bbar.js) keeps one icon each for the whole fight, and the army sparkles in the colour of each as it arrives.
const M = window.MC, G = M.Game.prototype, B = M.BUILDINGS, S = M.Sfx, now = () => performance.now();

// the battle keys and how they read (percentages unless noted)
const BN = { unitAtk: '部队攻击 +{p}%', unitHp: '部队生命 +{p}%', heroAtk: '领袖攻击 +{p}%', heroHp: '领袖生命 +{p}%', shield: '部队开局护盾 {p}%', baseScore: '击杀积分 +{p}%',
  feverStart: 'FEVER 槽开局 {p}%', feverRate: 'FEVER 槽涨得快 {p}%', skillPow: '被动技能效果 +{p}%', vanHp: '先锋生命 +{p}%', guaHp: '守护者生命 +{p}%', warAtk: '战士攻击 +{p}%',
  palHp: '圣骑士生命 +{p}%', rngAtk: '射手攻击 +{p}%', rngAs: '射手攻速 +{p}%', assAtk: '刺客攻击 +{p}%', magAtk: '法师攻击 +{p}%', cleHp: '牧师生命 +{p}%', priAtk: '祭司攻击 +{p}%',
  priHp: '祭司生命 +{p}%', sumHp: '召唤师生命 +{p}%', sumAtk: '召唤师攻击 +{p}%', diverse: '每种职业全体生命 +{p}%', bossStun: '首领开场停顿 {v} 秒' };
const GAR = { garHp: '驻军生命 +{p}%', defDmg: '驻军攻击 +{p}%' };
// every vocation's life / attack / attack speed
Object.entries({ van: '先锋', gua: '守护者', war: '战士', pal: '圣骑士', rng: '射手', ass: '刺客', mag: '法师', cle: '牧师', pri: '祭司', sum: '召唤师', mer: '商人' }).forEach(([k, n]) => { BN[k + 'Hp'] = n + '生命 +{p}%'; BN[k + 'Atk'] = n + '攻击 +{p}%'; BN[k + 'As'] = n + '攻速 +{p}%'; });
const say = (tab, o) => Object.keys(tab).filter(k => o[k] > 0.0001).map(k => tab[k].replace('{p}', Math.round(o[k] * 100)).replace('{v}', Math.round(o[k] * 100) / 100));
const add = (o, x, keys) => { if (x) Object.keys(x).forEach(k => { if (keys[k] && typeof x[k] === 'number') o[k] = (o[k] || 0) + x[k]; }); return o; };
// the sources, in the order they are shown: [{ n, ic, c, t }]
M.boonsOf = function (run) {
  const m = run && run.M, h = run && run.hero, out = []; if (!m || !h || (run.region && run.region.tut)) return out;
  const keys = run.raid ? Object.assign({}, BN, GAR) : BN, tab = keys, push = (n, ic, c, o) => { const t = say(tab, o); if (t.length) out.push({ n, ic, c, t: t.join('、') }); };
  // the base's buildings
  const bo = {}; let bn = 0; if (M.eachBuilt) M.eachBuilt(m, (k) => { const b = B[k]; if (b && b.fx) { const before = JSON.stringify(bo); add(bo, b.fx, keys); if (JSON.stringify(bo) !== before) bn++; } });
  push('基地建筑 ×' + bn, 'f_train', '#ffa060', bo);
  // the 发展方向
  if (M.DIRS && m.dirs) Object.keys(m.dirs).forEach(k => { const D = M.DIRS[k], lv = M.dirLv ? M.dirLv(m, k) : 0; if (!D || !lv || !D.fn) return; const o = {}; D.fn(o, m, lv); const ct = D.cats && M.TAG && M.TAG.cat && M.TAG.cat(D.cats[0]); push(M.dirName ? M.dirName(k, lv) : D.n, (ct && ct.icon) || 't_pros', D.c || '#ffd27a', add({}, o, keys)); });
  // the religion
  if (m.rel && M.relDoc) { const o = {}; (m.rel.picks || []).forEach(p => { const d = M.relDoc(p); if (d) { add(o, d.base, keys); add(o, d.run, keys); } }); push('宗教 Lv' + ((m.rel && m.rel.lv) || 0), 'f_faith', '#ffe6a0', o); }
  // the leader: talents, relics
  if (M.talentMods) { const o = add({}, M.talentMods(h), keys); if (M.talentBase) add(o, M.talentBase(m), keys); push('天赋', 't_skill', '#9cff7a', o); }
  if (h.relics && h.relics.length && m.relics) { const o = {}; h.relics.forEach(id => { const r = m.relics.find(x => x.id === id); if (r) (r.lines || []).forEach(l => add(o, { [l.k]: l.v }, keys)); }); push('宝物 ×' + h.relics.length, 'g_scroll', '#ffcc33', o); }
  return out;
};
// a fight opens: the chips come in after the announcement
const oBB = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBB.apply(this, arguments), run = this.run, list = M.boonsOf(run);
  this.boonFx = list.length ? { t0: now() + 1100, list, b: this.battle, s: {} } : null;
  return r;
};
const EACH = 0.2, HOLD = 3.4, OUT = 0.45;
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), F = this.boonFx;
  if (!F) return r;
  if (this.screen !== 'battle' || this.battle !== F.b) { this.boonFx = null; return r; }
  const T = (now() - F.t0) / 1000; if (T < 0) return r;
  // as a chip lands, the army sparkles in its colour
  F.list.forEach((c, i) => { if (T >= i * EACH + 0.15 && !F.s[i]) { F.s[i] = 1; const b = F.b; S.land && S.land(i + 1); if (b && b.burst) b.ents.forEach(e => { if (e.alive && e.side === 'A' && !e.isHero) b.burst(e.x, e.y - 40 * (e.sz || 1), c.c, 4); }); } });
  if (T > HOLD + F.list.length * 0.05 + OUT) { this.boonFx = null; return r; }
  // (2026-09-29: 「战斗的时候，一闪而过很多东西，实际上都没看全」 — the chips stay in the battle bar, mc-bbar.js; only the sparkles remain here)
  return r;
};
if (M.GUIDE) M.GUIDE.push({ id: 'boons', cat: '战斗', icon: 'u_star', title: '局外加成', line: '开战时左边亮出这一仗吃到的建筑、奇观、守护神、天赋、宝物和这一趟途中得到的加成。', scr: 'battle', sel: '[data-fx="bbase"]' });
})();

;
