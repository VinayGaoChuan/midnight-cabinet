// ==== mc-drops.js ====
(function () {
// Blueprint drops, reset (user ruling 2026-09-26: 「我玩了一把低难度的场景，获得了1个白色图纸，1个专属boss建筑图纸，1个图纸3选1
// （金色），1个启示卷轴，1个战鼓。这爆率太高了。理论上低难度，应该只能有白，绿，极小概率出蓝……我现在没玩到第3天……4个蓝色建筑，2个紫色
// 建筑……每过一天好像都会给一次图纸3选1……如果你觉得不好就去掉」).
// · The quality of a blueprint follows the game's difficulty (M.BP_Q); 神话 rooms do not exist, 不朽 only as boss statues.
// · Blueprints drop half as often again (M.bpChanceK), keepsakes too (mc-bring.js), boss statues less (mc-gdiff.js).
// · The blueprint pick (图纸三选一) is gone: a 繁荣度 level brings a wonder, an area's final boss one blueprint of this
//   difficulty's quality. A pick still in the stock turns into one such blueprint.
const M = window.MC, G = M.Game.prototype, B = M.BUILDINGS, rnd = Math.random;
// [游戏难度][碑的难度 低 / 中 / 高] → 普通 / 优质 / 稀有 / 史诗 / 传说 (no 传说 room exists for now: that roll gives a 史诗 one)
M.BP_Q = [
  [[72, 26, 2, 0, 0], [55, 37, 7, 1, 0], [38, 42, 16, 4, 0]],      // 普通
  [[62, 32, 5, 1, 0], [45, 40, 12, 3, 0], [30, 40, 22, 7, 1]],      // 困难
  [[50, 36, 11, 3, 0], [35, 38, 19, 7, 1], [22, 36, 28, 11, 3]],    // 噩梦
  [[38, 38, 17, 6, 1], [26, 36, 25, 10, 3], [15, 32, 32, 15, 6]],   // 地狱
];
const cur = () => (M._g && M._g.meta) || null;
const poolQ = (m, q, cats) => Object.keys(B).filter(k => { const b = B[k]; return !b.fixed && !b.gone && !b.boss && k !== 'core' && b.q === q && (!cats || cats.includes(b.cat)) && (!m || !M.bpUseful || M.bpUseful(m, 'bbp:' + k)); });
M.bpOfQ = function (m, q, style) {
  const w = typeof style === 'string' && style.startsWith('w:') ? style.slice(2) : null, cats = w && M.WORLD_CATS ? M.WORLD_CATS[w] : null;
  for (let qq = q; qq >= 0; qq--) { let c = cats && rnd() < 0.45 ? poolQ(m, qq, cats) : []; if (!c.length) c = poolQ(m, qq); if (c.length) return 'bbp:' + c[Math.floor(rnd() * c.length)]; }
  return null;
};
const oDrop = M.dropBp;
M.dropBp = function (bias, style) {
  const k0 = oDrop.apply(this, arguments); if (!k0 || typeof k0 !== 'string' || !k0.startsWith('bbp:')) return k0;
  const m = cur(), run = M._g && M._g.run, W = M.BP_Q[Math.max(0, Math.min(3, (m && m.gd) || 0))][Math.max(0, Math.min(2, (run && run.danger) || 0))], q = M.wpick([0, 1, 2, 3, 4], i => W[i]), b0 = B[k0.slice(4)];
  if (b0 && b0.q === q && !b0.boss) return k0;
  return M.bpOfQ(m, q, style) || k0;
};
// no blueprint pick any more
const PICK = 'pick:bbp';
const oTick = G.tick;
G.tick = function (dt) {
  const m = this.meta;
  if (m && m.inv && (m.inv[PICK] || 0) > 0) { const n = m.inv[PICK]; delete m.inv[PICK]; for (let i = 0; i < n; i++) { const k = M.dropBp(0); if (k) M.invAdd(m, k, 1); } this.save && this.save(); }
  return oTick.apply(this, arguments);
};
// the merchant at the gate sells blueprints of the same table: the 低 column until day 10, 中 until day 20, then 高
M.dayBpQ = (m) => { const W = M.BP_Q[Math.max(0, Math.min(3, (m && m.gd) || 0))][Math.min(2, Math.floor(((m && m.day) || 1) / 10))]; return M.wpick([0, 1, 2, 3, 4], i => W[i]); };
const oGoods = M.dayGoods;
if (oGoods) M.dayGoods = function (g, m) {
  const out = oGoods.apply(this, arguments) || [];
  return out.map(o => { if (!o || !String(o.id).startsWith('b')) return o; const k = M.bpOfQ(m, M.dayBpQ(m)), bk = k && k.slice(4), Bd = bk && B[bk]; if (!Bd || out.some(x => x && x.id === 'b' + bk)) return o;
    return Object.assign({}, o, { id: 'b' + bk, n: Bd.n + '图纸', d: Bd.d, cost: Bd.q >= 3 ? ['sh', 20 + 20 * Bd.q] : ['sup', 90 + 40 * Bd.q], give: () => M.invAdd(m, 'bbp:' + bk, 1) }); });
};
M.oneBldBp = function (style) { for (let i = 0; i < 12; i++) { const k = M.dropBp(0, style); if (k && k.startsWith('bbp:')) return k; } return M.bpOfQ(cur(), 0, style) || 'bbp:generator'; };
})();
