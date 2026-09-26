// ==== mc-bossbld.js ====
(function () {
// Boss buildings (user ruling 2026-09-26: 「不一定非要是专属宝物，可以是boss的专属建筑，例如精灵女王雕像之类的」 — the loot
// of this game is blueprints). Every area's final boss has a building of its own. Only that boss drops its blueprint
// (a chance on every kill: 普通 10% · 噩梦 16% · 地狱 24%, doubled under 老兵; never once you own it), which is the reason
// to go back to the same boss again and again. Each belongs to one category and does a little more than a legendary room
// of that category. The room below and the town above show the boss as a statue: its own sprite in stone or bronze.
// Loaded before mc-save.js (the save check keeps only rooms it knows).
const M = window.MC, B = M.BUILDINGS;
const BB = (boss, n, cat, style, mat, cost, days, fx, d, extra) => Object.assign({ n, q: 3, cat, style, pw: -2, cost, days, fx, d, boss, statue: boss, mat }, extra || {});
const LIST = {
  bb_bell: BB('FB_bell', '午夜钟楼', 'defense', 'medieval', 'stone', 380, 4, { raidStun: 3 }, '混沌来袭开始时钟声响起，第一波怪物停顿 3 秒。'),
  bb_grave: BB('FB_grave', '守墓人的墓园', 'faith', 'medieval', 'stone', 360, 4, { faithDaily: 4, failExp: 0.5 }, '每天产出 4 信仰值；出征失败时经验全部留下。'),
  bb_druid: BB('FB_druid', '德鲁伊石环', 'med', 'nature', 'stone', 380, 4, { healAll: 1, unitHp: 0.08 }, '领袖每天回满生命；出征部队生命 +8%。'),
  bb_tree: BB('FB_tree', '古树之苗', 'train', 'nature', 'bronze', 400, 4, { exp: 0.6, expDaily: 40 }, '领袖出征得到的经验 +60%，每天获得 40 经验。'),
  bb_queen: BB('FB_queen', '精灵女王雕像', 'faith', 'nature', 'bronze', 400, 4, { faithDaily: 4, startMult: 0.3 }, '每天产出 4 信仰值；每场战斗初始积分倍率 +0.3。'),
  bb_doll: BB('FB_doll', '旋转木马', 'store', 'cartoon', 'bronze', 360, 4, { startItem: 1, startItemQ: 1 }, '出征开局多带 2 个支援道具，其中一个第一次用至少转出「史诗」效果。'),
  bb_clown: BB('FB_clown', '马戏大棚', 'store', 'cartoon', 'stone', 380, 4, { startMult: 0.5 }, '每场战斗初始积分倍率 +0.5。'),
  bb_captain: BB('FB_captain', '沉船', 'power', 'water', 'bronze', 380, 4, { supplyDaily: 60 }, '每天产出 60 物资。'),
  bb_maw: BB('FB_maw', '深海之灯', 'scout', 'water', 'stone', 380, 4, { tower: 1, vision: 2 }, '出征地图一开始就全亮，视野 +2。'),
  bb_foreman: BB('FB_foreman', '不熄的熔炉', 'forge', 'steam', 'bronze', 420, 4, { craftCost: -0.3 }, '打造宝物，品质 +1，打造费用 -30%。', { forge: { qUp: 1 } }),
  bb_colossus: BB('FB_colossus', '巨像残骸', 'defense', 'steam', 'bronze', 400, 4, { defDmg: 0.4, bowRate: 1 }, '所有防御塔伤害 +40%，主基地两翼的弩攻速翻倍。'),
  bb_nurse: BB('FB_nurse', '护士站', 'med', 'scifi', 'stone', 360, 4, { postHeal: 0.08 }, '出征时领袖每打完一场仗回复 8% 生命。'),
  bb_surgeon: BB('FB_surgeon', '手术室', 'train', 'scifi', 'stone', 400, 4, { unitAtk: 0.08, unitHp: 0.08 }, '出征部队攻击和生命 +8%。'),
  bb_mech: BB('FB_mech', '舰桥终端', 'eng', 'scifi', 'bronze', 380, 4, { buildDays: -1, digCost: -0.3 }, '所有建造少花 1 天，挖掘费用 -30%。'),
  bb_xeno: BB('FB_xeno', '孵化池', 'train', 'scifi', 'stone', 400, 4, { startUnit: 1 }, '出征开局多一支随机部队。'),
  bb_jailer: BB('FB_jailer', '地狱之门', 'defense', 'fantasy', 'stone', 420, 4, { portalHp: 0.8, defArmy: 4 }, '主基地耐久 +80%，守城时 4 名狱卒出城迎敌。'),
  bb_ferry: BB('FB_ferry', '摆渡船', 'faith', 'fantasy', 'stone', 380, 4, { faithDaily: 4, shardDaily: 3 }, '每天产出 4 信仰值和 3 灵魂碎片。'),
  bb_demon: BB('FB_demon', '魔王王座', 'train', 'fantasy', 'bronze', 440, 4, { heroAtk: 0.25, heroHp: 0.25 }, '领袖攻击和生命 +25%。'),
  bb_croupier: BB('FB_croupier', '赌桌', 'store', 'fantasy', 'bronze', 400, 4, { lootSup: 0.5, bpLuck: 0.3 }, '出征带回的物资 +50%，图纸掉率 +30%。'),
  bb_dealer: BB('FB_dealer', '庄家金库', 'power', 'fantasy', 'bronze', 460, 5, { supplyDaily: 100, shardDaily: 5 }, '每天产出 100 物资和 5 灵魂碎片。'),
};
Object.assign(B, LIST);
M.BOSS_BLD = {}; Object.keys(LIST).forEach(k => { M.BOSS_BLD[LIST[k].boss] = k; });
// owned: built, being built, or its blueprint waiting at home
M.bbOwned = (m, key) => !!m && ((m.inv && m.inv['bbp:' + key] > 0) || m.base.cells.some(row => row.some(x => x && (x.b === key || (x.job && x.job.key === key)))));   // a ruined one still counts

// ───────── what they do beyond the usual keys ─────────
// raidStun / bowRate: mc-siege.js · failExp: mc-revive.js · postHeal: mc-terrain.js (with the other leader keys)
const oNR = M.newRun3;
M.newRun3 = function (meta) {
  const run = oNR.apply(this, arguments), n = Math.round(M.baseMods(meta).startUnit || 0);
  if (n > 0 && !(run.region && run.region.tut)) { const pool = (M.SHOP_POOL || []).filter(k => M.DB[k] && M.DB[k].q <= 1 && M.DB[k].ranged !== 2); for (let i = 0; i < n && pool.length; i++) M.addUnit(run, M.pick(pool)); }
  return run;
};

// ───────── the statue: the boss's own sprite, in stone or bronze ─────────
// The titan's idle frame (mc-titan.js) above its arena line, fitted into maxW×maxH art pixels: coverage decides the
// silhouette, brightness the tone on the material's ramp, the edge one step darker, the upper-left edge one lighter.
const SC = {};
M.statueGrid = function (boss, maxW, maxH) {
  const ck = boss + '|' + maxW + '|' + maxH; if (SC[ck]) return SC[ck];
  const T = M.TITAN; if (!T || !T.frame) return null;
  const fr = T.frame(boss, 'idle', 0), bw = fr && fr.bw, bh = fr && fr.bh; if (!bw) return null;
  const oy = Math.min(bh, Math.round(fr.footY * bw / fr.width)), d = fr.getContext('2d').getImageData(0, 0, bw, bh).data;
  let x0 = bw, x1 = -1, y0 = bh, y1 = -1;
  for (let y = 0; y < oy; y++) for (let x = 0; x < bw; x++) if (d[(y * bw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const sw = x1 - x0 + 1, sh = y1 - y0 + 1, k = Math.min(maxW / sw, maxH / sh), tw = Math.max(1, Math.round(sw * k)), th = Math.max(1, Math.round(sh * k));
  const on = new Uint8Array(tw * th), lum = new Float32Array(tw * th); let lo = 1, hi = 0;
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    const ax = x0 + tx / k, bx = x0 + (tx + 1) / k, ay = y0 + ty / k, by = y0 + (ty + 1) / k; let n = 0, a = 0, L = 0;
    for (let y = Math.floor(ay); y < Math.max(Math.floor(ay) + 1, Math.ceil(by)); y++) for (let x = Math.floor(ax); x < Math.max(Math.floor(ax) + 1, Math.ceil(bx)); x++) {
      n++; if (x < 0 || y < 0 || x >= bw || y >= oy) continue; const i = (y * bw + x) * 4; if (d[i + 3] > 40) { a++; L += (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255; } }
    const p = ty * tw + tx; if (a / Math.max(1, n) >= 0.34) { on[p] = 1; lum[p] = L / a; lo = Math.min(lo, lum[p]); hi = Math.max(hi, lum[p]); }
  }
  const tone = new Int8Array(tw * th).fill(-1);
  for (let p = 0; p < tw * th; p++) {
    if (!on[p]) continue; const x = p % tw, y = (p / tw) | 0;
    const edge = x === 0 || y === 0 || x === tw - 1 || !on[p - 1] || !on[p + 1] || !on[p - tw] || (y < th - 1 && !on[p + tw]);
    let t = 2 + Math.round((lum[p] - lo) / Math.max(0.05, hi - lo) * 6.5);
    if (edge) t = Math.max(1, t - 2); else if (y > 0 && x > 0 && !on[p - tw - 1]) t = Math.min(10, t + 1);
    tone[p] = t;
  }
  return (SC[ck] = { w: tw, h: th, tone });
};
const RAMP = (mat) => M.PXR && M.PXR.RAMPS && M.PXR.RAMPS[mat === 'bronze' ? 'brass' : 'stone'];
// a canvas of the statue, px screen pixels per art pixel (the town above)
const CC = {};
M.statueCanvas = function (boss, mat, maxW, maxH, px) {
  const ck = [boss, mat, maxW, maxH, px].join('|'); if (CC[ck]) return CC[ck];
  const g = M.statueGrid(boss, maxW, maxH), R = RAMP(mat); if (!g || !R) return null;
  const c = document.createElement('canvas'); c.width = g.w * px; c.height = g.h * px; const x = c.getContext('2d');
  for (let p = 0; p < g.w * g.h; p++) { const t = g.tone[p]; if (t < 0) continue; x.fillStyle = R[t]; x.fillRect((p % g.w) * px, ((p / g.w) | 0) * px, px, px); }
  return (CC[ck] = c);
};
// the town: a plinth with the statue on it (mc-town.js asks for it)
M.statueArt = function (x, k, key, w, h) {
  const Bd = B[key]; k.Bk(-w / 2 + 16, -34, w - 32, 34, '#5b5260'); k.Bk(-w / 2 + 30, -52, w - 60, 20, '#7a7080'); k.R(-w / 2 + 30, -52, w - 60, 4, '#a6a2b5');
  const c = M.statueCanvas(Bd.statue, Bd.mat, 64, 62, 3); if (c) x.drawImage(c, -Math.round(c.width / 2), -52 - c.height);
};
// the room: the category's usual shell, a plinth in the middle, the statue under a cold (stone) or warm (bronze) light
const X = M.PXR;
if (X) Object.keys(LIST).forEach(key => { const Bd = LIST[key]; X.def(key, {
  amb: [0.28, 0.24],
  paint(S, sc) {
    X.shell(S, sc, Bd.style);
    sc.light({ x: 75, y: 16, z: 40, r: 120, i: 0.95, c: Bd.mat === 'bronze' ? '#ffd890' : '#dfe8ff', tint: 0.35 });
    sc.light({ x: 75, y: 88, z: 12, r: 46, i: 0.35, c: Bd.mat === 'bronze' ? '#ffb050' : '#9fb8ff', tint: 0.5 });
    S.lay('mid'); S.beg(); S.box(50, 81, 50, 11, 'mstone', 5, { top: 2 }); S.box(56, 75, 38, 7, 'mstone', 6, { top: 1 }); S.end();
    const g = M.statueGrid(Bd.statue, 90, 62); if (!g) return;
    const x0 = Math.round(75 - g.w / 2), y0 = 75 - g.h, mat = Bd.mat === 'bronze' ? 'brass' : 'stone';
    S.beg(); for (let p = 0; p < g.w * g.h; p++) { const t = g.tone[p]; if (t >= 0) S.px(x0 + p % g.w, y0 + ((p / g.w) | 0), mat, t); } S.end();
  },
}); });
})();
