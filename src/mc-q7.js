// ==== mc-q7.js ====
(function () {
// 不朽 (user ruling 2026-09-26: 「英雄，精英和boss单位，都视为比神话更高一级的不朽单位，而且只有这3类单位是不朽，boss专属图纸也是
// 不朽（暗金），给英雄加天赋点的那个掉落物也是不朽，其他的就没有不朽品质的东西了」): a seventh quality in dark gold above 神话.
// Only these are 不朽: the leaders, elite and boss enemies, the boss buildings and their blueprints, and 启示卷轴. The
// FEVER reel and everything rolled on qualities stay on the six (M.TIERS is the six, mc-data3.js).
const M = window.MC, Q = M.QUALITY, B = M.BUILDINGS, U = M.UI, BP = M.Battle3 && M.Battle3.prototype;
const IMM = 6, IC = '#c9a24a';
if (Q.length === 6) Q.push({ n: '不朽', c: IC, m: 6 });
M.Q_IMMORTAL = IMM;
if (U && U.Q && U.Q.length === 6) U.Q.push([IC, '#f0dc9a', '#7a5a1c']);
if (M.QSIZE && M.QSIZE.length === 6) M.QSIZE.push(1.8);
// boss buildings (and so their blueprints)
Object.keys(B).forEach(k => { if (B[k] && B[k].boss) B[k].q = IMM; });
if (Array.isArray(M.PROS_Q) && M.PROS_Q.length === 6) M.PROS_Q.push(140);
M.buildShards = (b) => (b ? [0, 0, 0, 30, 60, 90, 120][b.q] || 0 : 0);
// leaders: every one is 不朽 to look at (their rarity still sets the talent tree and the numbers, unseen)
(M.RARITY || []).forEach(r => { r.c = IC; r.n = '不朽'; });
// elites and bosses in a fight: 不朽 (their own copy of the unit's data, so the table stays as it is)
if (BP) {
  const oSp = BP.spawnEnemy;
  BP.spawnEnemy = function (s) { const e = oSp.apply(this, arguments); if (e && (e.elite || e.boss)) e.d = Object.assign({}, e.d, { q: IMM, g: '不朽' }); return e; };
  const oInit = BP.init;
  BP.init = function () { const r = oInit.apply(this, arguments); if (this.hero && this.hero.d) this.hero.d = Object.assign({}, this.hero.d, { q: IMM, g: '不朽' }); return r; };
}
// old saves: relic lines that raised the score multiplier (gone since 2026-09-26) raise the kills' score instead
M.multFix = function (m) { if (!m || m.noMult) return false; (m.relics || []).forEach(r => (r.lines || []).forEach(l => { if (l.k === 'startMult') { l.k = 'baseScore'; l.v = Math.round(l.v * 50) / 100; } })); m.noMult = 1; return true; };
const G = M.Game && M.Game.prototype, oTick = G && G.tick;
if (oTick) G.tick = function () { if (this.meta && !this.meta.noMult && M.multFix(this.meta) && this.save) this.save(); return oTick.apply(this, arguments); };
})();

;
