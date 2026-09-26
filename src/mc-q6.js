// ==== mc-q6.js ====
(function () {
// Six qualities (user ruling 2026-09-26: 「整个游戏的品质，修改一下，普通白色，优质绿色，稀有蓝色，史诗紫色，传说橙色，神话红色。所有品质都
// 改成对应这六档，图纸重排品质，fever也改成这套品质，该补效果补效果」). The table itself is M.QUALITY (mc-data3.js); this file,
// loaded after every table that carries a quality, moves the old four (普通 / 稀有 / 史诗 / 传说 = 0–3) onto the six
// (0 / 2 / 3 / 4) and re-ranks the blueprints: every building gets its place on the six, the boss buildings are 神话.
// The evolution lines (mc-lines.js) are six-quality already.
const M = window.MC, DB = M.DB, B = M.BUILDINGS, OLD = [0, 2, 3, 4];
M.Q_OLD = OLD;
// units and enemies of the old tables (not the lines)
Object.keys(DB).forEach(k => { const d = DB[k]; if (d && !d.line && typeof d.q === 'number' && d.q >= 0 && d.q <= 3) d.q = OLD[d.q]; });
// keepsakes, banners
(M.GIFTS ? Object.values(M.GIFTS) : []).forEach(g => { if (typeof g.q === 'number' && g.q <= 3) g.q = OLD[g.q]; });
(M.LEGION ? Object.values(M.LEGION) : []).forEach(g => { if (typeof g.q === 'number' && g.q <= 3) g.q = OLD[g.q]; });
// the blueprints, re-ranked by what they cost and do (boss buildings: 神话)
const RANK = {
  0: 'farm pool generator storage wall lookout meditation training smithy hospital',
  1: 'vault ballista cannon spire tesla armory goldengate elder',
  2: 'dome kotoku angkor artemis bigben machu lighthouse stonehenge opera',
  3: 'michel taj ruhr pyramids venice gardens hagia potala library maracana shaolin',
  4: 'colosseum liberty colossus zeus eiffel terracotta amundsen wolfsburg forbidden',
};
Object.keys(RANK).forEach(q => RANK[q].split(' ').forEach(k => { if (B[k]) B[k].q = +q; }));
Object.keys(B).forEach(k => { const b = B[k]; if (!b || k === 'core') return; if (b.boss) b.q = 5; else if (!Object.values(RANK).some(s => s.split(' ').includes(k)) && typeof b.q === 'number' && b.q <= 3) b.q = OLD[b.q]; });
// days to build follow the quality (as before: one more day a step), except the rooms with days of their own
const DAYS = [1, 1, 2, 3, 4, 5];
Object.keys(B).forEach(k => { const b = B[k]; if (b && k !== 'core' && !b.fixed && !b.specialDays && !b.boss) b.days = DAYS[b.q] || b.days; });
// 繁荣度 and soul shards by quality
M.PROS_Q = [10, 16, 25, 45, 70, 100];
M.buildShards = (b) => (b ? [0, 0, 0, 30, 60, 90][b.q] || 0 : 0);
// blueprint quality by difficulty (mc-danger.js): six weights
if (M.DANGER) { const Q6 = [[70, 16, 9, 3.6, 1.2, 0.2], [42, 24, 18, 10, 5, 1], [18, 20, 26, 21, 11, 4]]; M.DANGER.forEach((T, i) => { T.q = Q6[i] || T.q; }); }
// shops and pickers: six weights, 优质 between 普通 and 稀有, 神话 never sold
const oQW = M.shopQW;
M.shopQW = function (run) { const w = oQW.apply(this, arguments); if (w.length >= 6) return w; const a = Math.max(0, w[0]), b = Math.max(0, w[1]); return [a, (a + b) * 0.45, b, Math.max(0, w[2]), Math.max(0, w[3]), 0]; };
// relics: 普通 1 line … 传说 4 lines; 优质 is 普通 made stronger, 神话 传说 made stronger
const RL = [[1, 1], [1, 1.35], [2, 1], [3, 1], [4, 1], [4, 1.35]];
M.relicLines = (key, q) => { const R = M.RELICS && M.RELICS[key], s = RL[Math.max(0, Math.min(5, q | 0))]; return R ? R.lines.slice(0, s[0]).map(l => ({ k: l.k, v: Math.round(l.v * s[1] * 1000) / 1000 })) : []; };
const oCR = M.craftRelic3;
M.craftRelic3 = function (meta, key, forge) {
  const res = oCR.apply(this, arguments), f = forge || {};
  // the roll again on the six: 普通 44 / 优质 24 / 稀有 18 / 史诗 10 / 传说 3.6 / 神话 0.4, then the forge's bonuses
  let q = M.wpick([0, 1, 2, 3, 4, 5], i => [44, 24, 18, 10, 3.6, 0.4][i]); if (f.luck && Math.random() < f.luck) q++; q = Math.min(5, q + (f.qUp || 0)); if (f.minQ) q = Math.max(q, f.minQ);
  [res && res.r, res && res.twin].forEach(x => { if (x) { x.q = q; x.lines = M.relicLines(key, q); } });
  if (res) res.landQ = q; return res;
};
// FEVER: the roll climbs through six (神话 is very rare); the buildings that promise a floor keep what they promised
M.rollTier2 = function (run, minQ) { const luck = (run && run.mods && run.mods.tier) || 0, ch = [0.6, 0.5, 0.4, 0.25, 0.12].map(c => c + luck); let t = 0; while (t < 5 && Math.random() < ch[t]) t++; return Math.max(t, minQ || 0); };
[['hagia', 2], ['bb_doll', 3]].forEach(([k, q]) => { if (B[k] && B[k].fx && B[k].fx.feverQ) B[k].fx.feverQ = q; });
// old saves: relics carried the old four
M.q6Fix = function (m) { if (!m || m.q6) return; (m.relics || []).forEach(r => { if (typeof r.q === 'number' && r.q <= 3) { r.q = OLD[r.q]; if (r.key && M.RELICS && M.RELICS[r.key]) r.lines = M.relicLines(r.key, r.q); } }); m.q6 = 1; };
const G = M.Game && M.Game.prototype, oTick = G && G.tick;
if (oTick) G.tick = function (dt) { if (this.meta && !this.meta.q6) { M.q6Fix(this.meta); this.save && this.save(); } return oTick.apply(this, arguments); };
})();

;
