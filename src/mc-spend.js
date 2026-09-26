// ==== mc-spend.js ====
(function () {
// Things are there to be used (user question 2026-09-26: 「道具不舍得用，技能不舍得用，有钱也不会去买道具和战旗，只会买部队。
// 局外……建筑不舍得建，因为要找合适的地形」 — the rules made holding back the right play).
// · The leader's skill is ready at the start of every fight, once per fight (no cooldown carried across the map), so a
//   normal fight never costs you the boss's skill. What shortened the cooldown now makes the skill stronger.
// (items and banners are gone since, and terrain with them: mc-fever.js, mc-dirs.js — user ruling 2026-09-26)
const M = window.MC, G = M.Game.prototype, S = M.Sfx, P = M.PJ.PAL, B_ = M.BUILDINGS, now = () => performance.now();
const B2P = M.Battle2 && M.Battle2.prototype;

// ───────── the skill: every fight ─────────
if (B2P) { const oCast = B2P.castSkill; B2P.castSkill = function () { const r = oCast.apply(this, arguments); if (this.run) this.run.skillCd = 0; return r; }; }
// what used to shorten the cooldown (布达拉宫, 时之沙, 神秘术, a relic's 技能 line) now makes the skill stronger
M.skillPow = function (h, m) {
  m = m || (M._g && M._g.meta); if (!h || !m) return 0;
  const hm = M.heroMods(h, m), bm = M.baseMods(m);
  return Math.max(0, 0.2 * (-(bm.skillNodeCd || 0) - (hm.skillNode || 0)) + Math.max(0, -(hm.skillCd || 0)) + (bm.skillPow || 0));   // + 秘法化 (mc-dirs.js)
};
const oSV = M.skillVal; M.skillVal = (h) => oSV(h) * (1 + M.skillPow(h));
M.heroSkillD = (h) => M.skillDesc(h) + '，每场战斗一开始就能用。';
if (M.STATS && M.STATS.skillCd) M.STATS.skillCd.d = '领袖技能效果 +{v}%';
if (M.TALENTS && M.TALENTS.mystic) M.TALENTS.mystic.d = (v) => '领袖技能效果 +' + v * 20 + '%。';
if (B_.potala) B_.potala.d = '每天产出 3 信仰值；领袖技能效果 +20%。';
const oView0 = G.view;
G.view = function () { const v = oView0.call(this); if (v.w && this.run) { v.w.skillTxt = '每场 1 次'; v.w.skillC = '#ffcf4a'; v.w.pips = []; } return v; };

// ───────── small bosses whose body fights harder than its power says (M.BOSS_TRUE, mc-scenes.js) ─────────
const oSideE = M.sideE;
if (oSideE) M.sideE = function (run, cfg) { const s = oSideE.apply(this, arguments), b = cfg && cfg.mb && cfg.list && cfg.list.find(x => x.boss), k = b && M.BOSS_TRUE && M.BOSS_TRUE[b.type]; if (k && s) { s.hp *= k; s.dps *= k; } return s; };

})();
