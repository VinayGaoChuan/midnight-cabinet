// ==== mc-vision.js ====
(function () {
// Vision on the expedition map (user ruling 2026-09-24): 2 steps by default, then moved by buildings, terrain, the
// world, the leader's talents and events. The world HUD shows it (eye badge); hovering lists where it comes from.
const M = window.MC, G = M.Game.prototype;
const BASE = 2;
// worlds that press vision down
M.WORLD_VIS = { town: -1, ward: -1, hell: -1, casino: -1 };
const WHY = { town: '雾', ward: '停电', hell: '浓烟', casino: '昏暗' };
M.visionParts = function (run) {
  const bm = M.baseMods(run.M).vision || 0, hm = (run.mods && run.mods.vision) || 0, wv = M.WORLD_VIS[run.regionKey] || 0, ev = run.visAdj || 0;
  const out = [['基础', BASE]]; if (bm) out.push(['基地', bm]); if (hm) out.push(['领袖天赋', hm]); if (wv) out.push([(M.WORLDS[run.regionKey] || {}).n + '的' + (WHY[run.regionKey] || '环境'), wv]); if (ev) out.push(['奇遇', ev]);
  return out;
};
M.visionOf = (run) => Math.max(1, M.visionParts(run).reduce((a, p) => a + p[1], 0));
// a talent that reaches further
if (M.TALENTS && M.TALENTS.luck && !M.TALENTS.luck.some(t => t.m && t.m.vision)) M.TALENTS.luck.push({ n: '鹰眼', d: '出征视野 +1', m: { vision: 1 } });
// events can move it mid-run: award { k: 'vision', v: ±1 }
const oAward = G.award;
G.award = function (list, from) {
  const run = this.run, rest = [], said = [];
  (list || []).forEach(g => { if (g && g.k === 'vision' && run) { run.visAdj = (run.visAdj || 0) + g.v; run.vision = M.visionOf(run); if (g.v > 0 && M.revealAhead && run.map) M.revealAhead(run.map, this.walker ? this.walker.node : 0, run.vision); said.push('视野 ' + (g.v > 0 ? '+' : '') + g.v); if (this.fx && from) this.fx.pop(from.x, from.y - 60, '视野 ' + (g.v > 0 ? '+' : '') + g.v, g.v > 0 ? '#9fe8ff' : '#ff8a6a', 40); } else rest.push(g); });
  const r = rest.length ? oAward.call(this, rest, from) : [];
  return (Array.isArray(r) ? r : []).concat(said);
};
// the world HUD badge and its tooltip
const oView = G.view;
G.view = function () { const v = oView.call(this); if (v.w && this.run) { v.w.vis = String(this.run.vision || M.visionOf(this.run)); v.w.visIc = M.iconURL('t_eye', 2); } return v; };
const oTF = G.tipFor;
G.tipFor = function (key) {
  if (key === 'w-vision' && this.run) { const run = this.run, parts = M.visionParts(run); return { title: '视野 ' + M.visionOf(run), c: '#9fe8ff', d: '能看清前方几步的节点。', lines: parts.map(([n, v]) => ({ t: n + '　' + (v > 0 && n !== '基础' ? '+' : '') + v, c: v < 0 ? '#ff8a6a' : '#cfc6b8' })) }; }
  return oTF.call(this, key);
};
})();

;
