// ==== mc-boons.js ====
(function () {
// What the base gives shows in the fight (2026-09-26, from the analysis 「局内跟局外联系是否紧密」, fix 5): as a fight opens,
// every source that strengthens this army slides in on the left under the bar — the base's buildings, the 发展方向, the
// religion, the leader's talents and relics (in a 混沌来袭 also what strengthens the garrison) — one chip each with its
// icon, its name and what it does here, while the army sparkles in the colour of each chip as it lands. Three seconds,
// then the chips fade. A fight with nothing from outside shows nothing.
const M = window.MC, G = M.Game.prototype, DB = M.DB, B = M.BUILDINGS, S = M.Sfx, U = M.UI, P = M.PJ.PAL, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3);

// the battle keys and how they read (percentages unless noted)
const BN = { unitAtk: '部队攻击 +{p}%', unitHp: '部队生命 +{p}%', heroAtk: '领袖攻击 +{p}%', heroHp: '领袖生命 +{p}%', shield: '部队开局护盾 {p}%', startMult: '初始积分倍率 +{v}',
  feverStart: 'FEVER 槽开局 {p}%', feverRate: 'FEVER 槽涨得快 {p}%', skillPow: '领袖技能效果 +{p}%', vanHp: '先锋生命 +{p}%', guaHp: '守护者生命 +{p}%', warAtk: '战士攻击 +{p}%',
  palHp: '圣骑士生命 +{p}%', rngAtk: '射手攻击 +{p}%', rngAs: '射手攻速 +{p}%', assAtk: '刺客攻击 +{p}%', magAtk: '法师攻击 +{p}%', cleHp: '牧师生命 +{p}%', priAtk: '祭司攻击 +{p}%',
  priHp: '祭司生命 +{p}%', sumHp: '召唤师生命 +{p}%', sumAtk: '召唤师攻击 +{p}%', diverse: '每种职业全体生命 +{p}%', bossStun: '首领开场停顿 {v} 秒' };
const GAR = { garHp: '驻军生命 +{p}%', defDmg: '驻军攻击 +{p}%' };
const say = (tab, o) => Object.keys(tab).filter(k => o[k] > 0.0001).map(k => tab[k].replace('{p}', Math.round(o[k] * 100)).replace('{v}', Math.round(o[k] * 100) / 100));
const add = (o, x, keys) => { if (x) Object.keys(x).forEach(k => { if (keys[k] && typeof x[k] === 'number') o[k] = (o[k] || 0) + x[k]; }); return o; };
// the sources, in the order they are shown: [{ n, ic, c, t }]
M.boonsOf = function (run) {
  const m = run && run.M, h = run && run.hero, out = []; if (!m || !h || (run.region && run.region.tut)) return out;
  const keys = run.raid ? Object.assign({}, BN, GAR) : BN, tab = keys, push = (n, ic, c, o) => { const t = say(tab, o); if (t.length) out.push({ n, ic, c, t: t.slice(0, 3).join('、') }); };
  // the base's buildings
  const bo = {}; let bn = 0; if (M.eachBuilt) M.eachBuilt(m, (k) => { const b = B[k]; if (b && b.fx) { const before = JSON.stringify(bo); add(bo, b.fx, keys); if (JSON.stringify(bo) !== before) bn++; } });
  push('基地建筑 ×' + bn, 'f_train', '#ffa060', bo);
  // the 发展方向
  if (M.DIRS && m.dirs) Object.keys(m.dirs).forEach(k => { const D = M.DIRS[k], lv = M.dirLv ? M.dirLv(m, k) : 0; if (!D || !lv || !D.fn) return; const o = {}; D.fn(o, m, lv); push(M.dirName ? M.dirName(k, lv) : D.n, 'u_star', D.c || '#ffd27a', add({}, o, keys)); });
  // the religion
  if (m.rel && M.relDoc) { const o = {}; (m.rel.picks || []).forEach(p => { const d = M.relDoc(p); if (d) { add(o, d.base, keys); add(o, d.run, keys); } }); push('宗教 Lv' + ((m.rel && m.rel.lv) || 0), 'f_faith', '#ffe6a0', o); }
  // the leader: talents, relics
  if (M.talentMods) { const o = add({}, M.talentMods(h), keys); if (M.talentBase) add(o, M.talentBase(m), keys); push('天赋', 't_skill', '#9cff7a', o); }
  if (h.relics && h.relics.length && m.relics) { const o = {}; h.relics.forEach(id => { const r = m.relics.find(x => x.id === id); if (r) (r.lines || []).forEach(l => add(o, { [l.k]: l.v }, keys)); }); push('宝物 ×' + h.relics.length, 'g_scroll', '#ffcc33', o); }
  return out.slice(0, 6);
};
// a fight opens: the chips come in after the announcement
const oBB = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBB.apply(this, arguments), run = this.run, list = M.boonsOf(run);
  this.boonFx = list.length ? { t0: now() + 1100, list, b: this.battle, s: {} } : null;
  return r;
};
const icons = {}; const icon = (k) => icons[k] || (icons[k] = (M.iconCanvas && M.iconCanvas(k, 1)) || null);
const X0 = 24, Y0 = 176, CH = 56, GAP = 10, EACH = 0.2, HOLD = 3.4, OUT = 0.45;
function draw(ctx, F, T) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  F.list.forEach((c, i) => {
    const t = T - i * EACH; if (t < 0) return; const qi = eo(cl(t / 0.3, 0, 1)), fade = 1 - cl((T - HOLD - i * 0.05) / OUT, 0, 1); if (fade <= 0) return;
    const y = Y0 + i * (CH + GAP), x = X0 - (1 - qi) * 60, w = Math.min(760, 96 + U.measure(ctx, c.n, 24) + U.measure(ctx, c.t, 24));
    ctx.globalAlpha = qi * fade; U.box(ctx, x, y, w, CH, P.night); U.R(ctx, x, y, 8, CH, c.c);
    const im = icon(c.ic); if (im) { ctx.imageSmoothingEnabled = false; ctx.drawImage(im, x + 18, y + (CH - 32) / 2, 32, 32); }
    const tw = U.text(ctx, c.n, x + 62, y + CH / 2, 24, c.c, { align: 'left' }); U.text(ctx, c.t, x + 62 + tw + 16, y + CH / 2, 24, P.cream, { align: 'left' });
    if (t < 0.35) M.glow && M.glow(ctx, x + 34, y + CH / 2, 80, c.c, 0.5 * (1 - t / 0.35));
  });
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), F = this.boonFx;
  if (!F) return r;
  if (this.screen !== 'battle' || this.battle !== F.b) { this.boonFx = null; return r; }
  const T = (now() - F.t0) / 1000; if (T < 0) return r;
  // as a chip lands, the army sparkles in its colour
  F.list.forEach((c, i) => { if (T >= i * EACH + 0.15 && !F.s[i]) { F.s[i] = 1; const b = F.b; S.land && S.land(i + 1); if (b && b.burst) b.ents.forEach(e => { if (e.alive && e.side === 'A' && !e.isHero) b.burst(e.x, e.y - 40 * (e.sz || 1), c.c, 4); }); } });
  if (T > HOLD + F.list.length * 0.05 + OUT) { this.boonFx = null; return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), F, T); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('boons: ' + e.message); this.boonFx = null; } }
  return r;
};
if (M.GUIDE) M.GUIDE.push({ id: 'boons', cat: '战斗', icon: 'u_star', title: '局外加成', line: '开战时左边亮出这一仗吃到的基地、方向、宗教、天赋和宝物加成。', scr: 'battle', sel: '[data-fx="bbase"]' });
})();

;
