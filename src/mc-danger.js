// ==== mc-danger.js ====
(function () {
// Danger and loot (user rulings 2026-09-25).
// - Every world stele of the day carries a fixed danger — 低 / 中 / 高 (day 1: one low stele; days 2–5: low + mid;
//   from day 6: low + mid + high). The danger raises the whole map's enemy level and toughness, and what it pays:
//   supplies, exp, how often blueprints drop and how good they are. A low world pays mostly common blueprints.
// - Enemies grow with the day whatever you pick, faster than before, so a player who only ever takes the low world
//   falls behind; taking mid / high worlds (and leaving by the 撤离 point after a boss) is how the curve keeps up.
// - Blueprints: only two fixed drops — clearing a world (its final boss) and holding off a 混沌来袭 — each one random
//   building blueprint. Everything else drops rarely, building and relic blueprints alike; talents (考古学), the
//   lucky star and terrain (晶簇) raise the odds.
const M = window.MC, G = M.Game.prototype, DB = M.DB, P = M.PJ && M.PJ.PAL || {};
const TIERS = [
  { n: '低', c: '#47d6c1', lv: 0,   ek: 1,    loot: 1,   exp: 1,   bp: 1,   q: [82, 15, 2.6, 0.4] },
  { n: '中', c: '#ffcf4a', lv: 0.6, ek: 1.05, loot: 1.4, exp: 1.3, bp: 1.3, q: [55, 32, 11, 2] },
  { n: '高', c: '#ff4a4a', lv: 1.2, ek: 1.1,  loot: 1.9, exp: 1.7, bp: 1.7, q: [28, 38, 25, 9] },
];
M.DANGER = TIERS;
const DAY_LV = 0.1, DAY_EK = 0.035, OLD_EK = 0.02;
// the first days ease in (2026-09-26: a lost run costs a core heart, three early losses would end the game): 85% on day 1, full from day 4
M.dayEk = (day) => { const d = Math.max(1, day || 1); return (1 + (d - 1) * DAY_EK) * Math.min(1, 0.8 + d * 0.05); };

// ───────── today's steles and their danger ─────────
M.worldShow = (m) => (m.day >= 6 ? 3 : m.day >= 2 ? 2 : 1);
const oWO = M.worldsOpen;
M.worldsOpen = function (m) {
  const list = oWO.apply(this, arguments), o = m.offers;
  if (o && o.list === list && (!Array.isArray(o.tiers) || o.tiers.length !== list.length)) o.tiers = list.map((_, i) => Math.min(2, i));
  return list;
};
M.tierOf = (m, k) => { const o = m && m.offers; if (!o || !o.list || !o.tiers) return 0; const i = o.list.indexOf(k); return i >= 0 ? (o.tiers[i] || 0) : 0; };
M.lvl0For = (W, m, t) => 0.5 + (W.diff || 0) * 0.2 + (m.day - 1) * DAY_LV + TIERS[t || 0].lv;

// ───────── the run: level, toughness and pay by danger and day ─────────
const oNR = M.newRun3;
M.newRun3 = function (meta, hero, worldKey) {
  const run = oNR.apply(this, arguments); if (!run || !run.region || run.region.tut) return run;
  const t = M.tierOf(meta, worldKey), T = TIERS[t], W = run.region, cols = (run.len && run.len.cols) || (run.map && run.map.cols) || 10;
  run.danger = t; run.dangerK = T.ek;
  run.lvl0 = M.lvl0For(W, meta, t);
  const endL = Math.min(14, 3 + (W.diff || 0) * 1.0 + cols * 0.16 + (meta.day - 1) * DAY_LV + T.lv);
  run.lvlStep = Math.max(0.12, (endL - run.lvl0) / Math.max(1, cols - 1));
  run.lootMul *= T.loot; run.mods.exp = (run.mods.exp || 0) + (T.exp - 1);
  return run;
};
// enemies: the day's growth and the danger's toughness, in battle and in every power estimate alike
const BP = M.Battle3.prototype, oInit = BP.init;
BP.init = function (run) { oInit.apply(this, arguments); if (run && !run.region.tut && run.M) this.ek *= (M.dayEk(run.M.day) / (1 + (run.M.day - 1) * OLD_EK)) * (run.dangerK || 1); };
const oSE = M.sideE;
M.sideE = function (run) { const s = oSE.apply(this, arguments); if (run && !run.region.tut && run.M) { const k = (M.dayEk(run.M.day) / (1 + (run.M.day - 1) * OLD_EK)) * (run.dangerK || 1); s.hp *= k; s.dps *= k; } return s; };

// ───────── the stele's word is its danger; the numbers say what it means for you ─────────
const AVG = (() => { let hp = 0, dps = 0, n = 0; M.SHOP_POOL.filter(k => DB[k].q === 0 && DB[k].cost >= 15 && DB[k].cost <= 60 && DB[k].ranged !== 2).forEach(k => { hp += DB[k].hp; dps += DB[k].atk * (DB[k].as || 100) / 100; n++; }); return n ? { hp: hp / n, dps: dps / n } : { hp: 300, dps: 20 }; })();
const wcache = new Map();
M.worldOdds = M.worldDanger = function (m, k) {
  const b = M.bestLeader(m), t = M.tierOf(m, k), key = [k, m.day, t, b ? b.id + ':' + b.lv + ':' + Math.round(b.hp) : '-'].join('|'); if (wcache.has(key)) return wcache.get(key);
  const W = M.WORLDS[k], T = TIERS[t], run = { region: W, regionKey: k, M: m, mods: {}, field: null, lvl0: M.lvl0For(W, m, t), lvlStep: 0.45, map: null, dangerK: T.ek };
  const avg = (type, col) => { let s = 0; for (let i = 0; i < 6; i++) s += M.powerOf(M.sideE(run, M.makeBattleCfg(run, { col, type }))); return Math.round(s / 6); };
  let mine = 0; if (b) { const H = M.HEROES[b.cls]; mine = M.powerOf({ hp: 3 * AVG.hp + b.hp, dps: 3 * AVG.dps + M.heroAtk(b, m) / (H.cd || 1) }); }
  const first = Math.round(avg('normal', 1) * (M.E_SHOW || 1)), boss = Math.round(avg('boss', 9) * (M.BOSS_SHOW || 1) * (M.E_SHOW || 1));
  const o = { lv: t, n: T.n, c: T.c, mine, first, boss, par: first };
  wcache.set(key, o); if (wcache.size > 60) wcache.delete(wcache.keys().next().value); return o;
};
const oST = G.steleTip;
G.steleTip = function (k) {
  const t = oST.apply(this, arguments), d = M.tierOf(this.meta, k), T = TIERS[d]; if (!t) return t;
  const pay = d ? '物资 ×' + T.loot + '、经验 ×' + T.exp + '，图纸更常见、品质更好' : '物资、经验照常，图纸多是普通品质';
  t.lines = [{ t: '难度' + T.n + '：' + pay, c: T.c }].concat(t.lines || []);
  return t;
};

// ───────── blueprints: how often, and how good ─────────
const cur = () => { const g = M._g; return g && g.run && !(g.run.region && g.run.region.tut) ? g.run : null; };
// quality weights: the danger of the run you are on (at the base — 混沌来袭 — the middle row), shifted up by bias
M.bpWeights = function (bias, qUp) { const run = cur(), T = TIERS[run ? run.danger || 0 : 1], k = 1 + (bias || 0) * 0.5 + (qUp || 0) * 0.8; return T.q.map((x, i) => (i === 0 ? x : x * k)); };
const BASE = { normal: 0.03, hold: 0.03, score: 0.03, holdScore: 0.03, elite: 0.08, boss: 0.12, extract: 0, chest: 0.1 };
M.bpChance = function (run, type) {
  if (!run || (run.region && run.region.tut)) return 0; const m = run.M, th = (run.theme && run.theme.loot) || {};
  return (BASE[type] || 0) * TIERS[run.danger || 0].bp * (1 + ((m && M.baseMods(m).bpLuck) || 0)) * (run.blood ? 2 : 1) * (1 + ((run.mods && run.mods.bpFind) || 0)) * (run.bpMul || 1) * (1 + (th.rbp || 0) * 5);
};
// one random building blueprint (the fixed drops)
M.oneBldBp = function (style) { for (let i = 0; i < 12; i++) { const k = M.dropBp(0, style); if (k.startsWith('bbp:')) return k; } return M.usefulBp ? M.usefulBp(M._g && M._g.meta, null, style) : 'bbp:' + M.pick(M.BLD_BP); };
})();

;
