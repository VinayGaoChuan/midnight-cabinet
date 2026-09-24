// ==== mc-terrain.js ====
(function () {
// Terrain (special tiles) worth digging for: 22 kinds, all of one standing (no quality tiers).
// Every tile helps ANY room built on it, and gives a big extra (often a brand-new ability) to the room type it fits.
// Deep veins (row 4 and 5) stay unidentified until a neighbouring cell is dug: you see a glow, not the name.
const M = window.MC, G = M.Game.prototype, Q = M.QUALITY, B_ = M.BUILDINGS, TILES = M.TILES;

// ───────── icons ─────────
const IC = M.IC;
const C = (x, col) => { x.fillStyle = col; };
const circ = (x, cx, cy, r, col) => { C(x, col); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const ell = (x, cx, cy, rx, ry, col) => { C(x, col); x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); };
const rect = (x, a, b, w, h, col) => { C(x, col); x.fillRect(a, b, w, h); };
const poly = (x, pts, col) => { C(x, col); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const line = (x, a, b, c, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
const arc = (x, cx, cy, r, a0, a1, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
IC.l_geo = (x) => { poly(x, [[16, 2], [25, 16], [22, 28], [10, 28], [7, 16]], '#ff7a3a'); poly(x, [[16, 11], [21, 19], [19, 27], [13, 27], [11, 19]], '#ffd060'); rect(x, 4, 27, 24, 3, '#7a3a1a'); };
IC.l_clay = (x) => { poly(x, [[9, 6], [23, 6], [21, 10], [26, 18], [22, 28], [10, 28], [6, 18], [11, 10]], '#c8845a'); rect(x, 8, 15, 16, 3, '#8a4a2a'); rect(x, 11, 4, 10, 3, '#e0a070'); };
IC.l_mole = (x) => { ell(x, 16, 24, 13, 6, '#8a6a40'); ell(x, 16, 16, 8, 7, '#6a5a50'); circ(x, 13, 14, 1.4, '#1a1418'); circ(x, 19, 14, 1.4, '#1a1418'); ell(x, 16, 19, 3, 2, '#ff9aa8'); line(x, 4, 8, 9, 13, 2.4, '#b0b8c4'); };
IC.l_amber = (x) => { poly(x, [[16, 3], [26, 10], [26, 22], [16, 29], [6, 22], [6, 10]], '#e89a2a'); poly(x, [[16, 7], [22, 11], [22, 20], [16, 24], [10, 20], [10, 11]], '#ffcc5a'); line(x, 13, 13, 18, 19, 2, '#8a5a10'); circ(x, 19, 13, 1.6, '#8a5a10'); };
IC.l_mint = (x) => { poly(x, [[4, 26], [9, 12], [18, 6], [28, 14], [26, 27]], '#5a4a40'); rect(x, 9, 15, 5, 5, '#ffd650'); rect(x, 17, 11, 6, 6, '#ffe08a'); rect(x, 15, 20, 5, 4, '#ffd650'); };
IC.l_wind = (x) => { arc(x, 14, 12, 7, 3.4, 7.2, 3, '#bfefff'); line(x, 4, 19, 24, 19, 3, '#bfefff'); arc(x, 20, 23, 5, -1.2, 2.2, 3, '#8fd8ff'); line(x, 6, 26, 18, 26, 3, '#8fd8ff'); };
IC.l_dragon = (x) => { poly(x, [[4, 22], [12, 8], [20, 6], [28, 12], [22, 14], [16, 22]], '#efe6da'); circ(x, 19, 10, 1.8, '#ff5a3a'); poly(x, [[8, 26], [26, 18], [24, 24], [10, 30]], '#c8b8a8'); line(x, 12, 8, 8, 2, 2.4, '#efe6da'); };
IC.l_heart = (x) => { C(x, '#ff6a8a'); x.beginPath(); x.moveTo(16, 28); x.bezierCurveTo(-2, 16, 6, 2, 16, 10); x.bezierCurveTo(26, 2, 34, 16, 16, 28); x.fill(); poly(x, [[16, 12], [20, 16], [16, 24], [12, 16]], '#8a2a4a'); circ(x, 11, 11, 2, '#ffd0dc'); };
IC.l_star = (x) => { ell(x, 16, 23, 13, 6, '#3a3048'); ell(x, 16, 22, 9, 3.5, '#1a1428'); poly(x, [[16, 2], [19, 9], [26, 9], [20, 14], [22, 21], [16, 17], [10, 21], [12, 14], [6, 9], [13, 9]], '#9fb8ff'); circ(x, 16, 12, 2.4, '#ffffff'); };
IC.l_storm = (x) => { circ(x, 16, 16, 12, '#2a3a5a'); poly(x, [[18, 3], [9, 18], [15, 18], [12, 29], [24, 12], [17, 12]], '#8ff6ff'); circ(x, 16, 16, 12.5, 'rgba(0,0,0,0)'); };
IC.l_bones = (x) => { line(x, 7, 25, 25, 7, 4, '#e8e0ff'); line(x, 7, 7, 25, 25, 4, '#e8e0ff'); circ(x, 16, 13, 6, '#f5f0ff'); circ(x, 14, 13, 1.6, '#3a2a5a'); circ(x, 18, 13, 1.6, '#3a2a5a'); rect(x, 13, 17, 6, 3, '#f5f0ff'); };
IC.l_hourglass = (x) => { rect(x, 7, 3, 18, 3, '#caa84a'); rect(x, 7, 26, 18, 3, '#caa84a'); poly(x, [[9, 6], [23, 6], [17, 16], [23, 26], [9, 26], [15, 16]], '#fff2c0'); poly(x, [[12, 21], [20, 21], [22, 26], [10, 26]], '#ffcc33'); poly(x, [[11, 8], [21, 8], [16, 13]], '#ffcc33'); };
IC.l_dream = (x) => { poly(x, [[14, 2], [19, 11], [15, 14], [20, 22], [16, 30], [12, 21], [16, 17], [11, 9]], '#ff3aa0'); circ(x, 23, 8, 3, '#ffd0f0'); circ(x, 8, 22, 2.4, '#ffd0f0'); rect(x, 21, 20, 6, 8, '#e8d8b0'); rect(x, 22, 22, 4, 1.4, '#8a6a3a'); };
IC.l_ygg = (x) => { circ(x, 16, 11, 9, '#4aa84a'); circ(x, 10, 13, 5, '#7aff9a'); circ(x, 22, 12, 5, '#6ad07a'); rect(x, 14, 16, 4, 8, '#8a5a30'); line(x, 16, 24, 6, 30, 2.6, '#8a5a30'); line(x, 16, 24, 26, 30, 2.6, '#8a5a30'); line(x, 16, 24, 16, 31, 2.6, '#8a5a30'); };
IC.l_crown = (x) => { poly(x, [[4, 12], [10, 18], [16, 6], [22, 18], [28, 12], [25, 26], [7, 26]], '#ffcc33'); rect(x, 7, 23, 18, 3, '#b08a20'); circ(x, 16, 17, 2.4, '#ff4a6a'); circ(x, 10, 21, 1.6, '#6fa8dc'); circ(x, 22, 21, 1.6, '#6fa8dc'); };
IC.l_unknown = (x) => { poly(x, [[4, 26], [8, 10], [18, 4], [28, 12], [27, 27]], '#4a4050'); C(x, '#ffffff'); x.font = 'bold 20px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', 16, 17); };

// ───────── the table ─────────
// fit(B, key) says whether this room type "fits" the vein; fitFx(B) is what it adds on top of the "any room" effect.
const isW = (B) => !!B.weapon, st = (...s) => (B) => s.includes(B.style), cat = (...s) => (B) => s.includes(B.cat);
const noPw = (B) => (B.pw < 0 ? { pw: -B.pw } : {});
const DEF = {
  geo:     { n: '地热', hue: '#ff7a3a', any: { pw: 3 }, anyD: '这个房间 +3 电力', fitN: '电力', fit: cat('power'), fitFx: () => ({ pw: 5 }), fitD: '再 +5 电力' },
  fossil:  { n: '化石层', hue: '#d8c8a0', any: { supplyDaily: 25 }, anyD: '基地每天 +25 物资', fitN: '后勤', fit: (B) => B.cat === 'store' && !!B.fx, fitFx: () => ({ prodMul: 1 }), fitD: '这个房间自己的效果 ×2' },
  clay:    { n: '陶土层', hue: '#c8845a', any: { portalHp: 0.3 }, anyD: '传送门耐久 +30%', fitN: '防守', fit: cat('defense'), fitFx: () => ({ defArmy: 3 }), fitD: '守城时 3 名陶土守卫加入战斗' },
  ruin:    { n: '古遗迹', hue: '#e8c070', any: { halfDays: 1, refund: 0.3 }, anyD: '建造时间减半，建成返还 30% 物资', fitN: '奇观', fit: (B) => B.q > 0, fitFx: () => ({ refund: 0.5 }), fitD: '返还提高到 80%' },
  spring:  { n: '地下泉', hue: '#6fd0ff', any: { healAll: 0.15 }, anyD: '所有领袖每天回复 15% 生命（不需要医院）', fitN: '医疗 / 水域', fit: (B) => B.cat === 'med' || B.style === 'water', fitFx: (B) => (B.weapon ? { heal: 0.3, range: 1 } : { heal: 0.3 }), fitD: '医院回复 +30%；水域武器射程 +1' },
  mole:    { n: '松软土层', hue: '#b89a70', any: { digCost: -0.4 }, anyD: '挖掘费用 -40%', fitN: '特殊', fit: cat('misc'), fitFx: () => ({ buildDays: -1 }), fitD: '所有建造少花 1 天' },
  crystal: { n: '晶簇', hue: '#7fe0ff', any: { noPw: 1, pw: 1 }, anyD: '这个房间不耗电，还多发 1 电', fitN: '科幻', fit: st('scifi'), fitFx: () => ({ pw: 3 }), fitD: '再发电 +3' },
  ley:     { n: '灵脉', hue: '#b86bff', any: { shardDaily: 2, deathShards: 0.3 }, anyD: '基地每天 +2 灵魂碎片，领袖阵亡的碎片 +30%', fitN: '招募 / 魔法', fit: (B) => B.cat === 'recruit' || B.style === 'magic' || B.style === 'fantasy', fitFx: (B) => Object.assign({ recruitMin: 1 }, noPw(B)), fitD: '不耗电；招募的领袖至少为「稀有」' },
  amber:   { n: '琥珀层', hue: '#ffb03a', any: { orbDaily: 30 }, anyD: '基地每天 +30 经验球', fitN: '训练', fit: cat('train'), fitFx: () => ({ orbMul: 1 }), fitD: '经验球效率 +100%' },
  mint:    { n: '金脉', hue: '#ffd650', any: { lootSup: 0.25 }, anyD: '出征带回的物资 +25%', fitN: '运势', fit: cat('luck'), fitFx: () => ({ lootSup: 0.3, startMult: 0.2 }), fitD: '物资再 +30%，每场战斗初始倍率 +0.2' },
  rift:    { n: '裂隙', hue: '#9cff7a', any: { defDmg: 0.2 }, anyD: '所有武器房间伤害 +20%', fitN: '武器', fit: isW, fitFx: () => ({ range: 1, wcd: 0.5 }), fitD: '射程 +1，攻速 +50%' },
  ore:     { n: '富矿脉', hue: '#e0904a', any: { craftCost: -0.3 }, anyD: '宝物打造费用 -30%', fitN: '锻造 / 武器', fit: (B) => !!B.forge || !!B.weapon, fitFx: (B) => (B.forge ? { forgeLuck: 0.6 } : { dmg: 0.5 }), fitD: '锻造：60% 概率品质 +1；武器：伤害 +50%' },
  wind:    { n: '风穴', hue: '#bfefff', any: { vision: 1, startMult: 0.1 }, anyD: '出征视野 +1，初始倍率 +0.1', fitN: '运势 / 特殊', fit: cat('luck', 'misc'), fitFx: () => ({ tower: 1, startMult: 0.1 }), fitD: '出征地图一开始就全亮，倍率再 +0.1' },
  dragon:  { n: '龙骨', hue: '#ff5a3a', any: { unitAtk: 0.1 }, anyD: '出征部队攻击 +10%', fitN: '训练', fit: cat('train'), fitFx: () => ({ orbMul: 0.6, newHeroLv: 1 }), fitD: '经验球效率 +60%，新领袖多 1 级' },
  heart:   { n: '大地之心', hue: '#ff6a8a', any: { unitHp: 0.12 }, anyD: '出征部队生命 +12%', fitN: '医疗', fit: cat('med'), fitFx: () => ({ heal: 0.3, healAll: 0.1 }), fitD: '医院回复 +30%，所有领袖每天再回 10%' },
  star:    { n: '陨星坑', hue: '#9fb8ff', any: { startMult: 0.25 }, anyD: '每场战斗初始倍率 +0.25', fitN: '锻造', fit: (B) => !!B.forge, fitFx: () => ({ forgeQUp: 1 }), fitD: '打造的宝物品质必定 +1' },
  storm:   { n: '雷暴核心', hue: '#8ff6ff', any: { heroAtk: 0.12 }, anyD: '所有领袖攻击 +12%', fitN: '武器', fit: isW, fitFx: () => ({ xChain: 3, dmg: 0.2 }), fitD: '伤害 +20%，每次攻击放出连锁闪电（跳 3 个敌人）' },
  bones:   { n: '英灵冢', hue: '#e8e0ff', any: { heroHp: 0.15, deathShards: 0.3 }, anyD: '所有领袖生命 +15%，阵亡的碎片 +30%', fitN: '招募', fit: cat('recruit'), fitFx: () => ({ recruitMin: 2 }), fitD: '招募的领袖至少为「史诗」' },
  hourglass: { n: '时之沙', hue: '#ffe08a', any: { skillNodeCd: -1 }, anyD: '所有领袖军团技能冷却 -1 个节点', fitN: '运势', fit: cat('luck'), fitFx: () => ({ startItemQ: 1 }), fitD: '出征开局多带 1 个「史诗」道具' },
  dream:   { n: '梦境裂隙', hue: '#ff3aa0', any: { bpLuck: 0.4 }, anyD: '图纸掉率 +40%', fitN: '锻造', fit: (B) => !!B.forge, fitFx: () => ({ forgeTwice: 0.4 }), fitD: '打造时 40% 概率多得一件' },
  ygg:     { n: '世界树根', hue: '#7aff9a', any: { supplyDaily: 15, orbDaily: 15 }, anyD: '基地每天 +15 物资、+15 经验球', fitN: '后勤 / 自然', fit: (B) => (B.cat === 'store' || B.style === 'nature') && !!B.fx, fitFx: () => ({ prodMul: 1 }), fitD: '这个房间自己的效果 ×2' },
  crown:   { n: '王座遗骸', hue: '#ffcc33', any: { relicSlot: 1 }, anyD: '每名领袖出征多带 1 件宝物', fitN: '防守', fit: cat('defense'), fitFx: (B) => (B.weapon ? { dmg: 0.4, xSplash: 130, xSlow: 1 } : { defArmy: 3 }), fitD: '武器：伤害 +40%，命中溅射并减速；其它：再多 3 名守卫' },
};
// room-local keys; everything else is a base-wide modifier summed over the whole base
const LOCAL = ['pw', 'noPw', 'halfDays', 'refund', 'forgeLuck', 'forgeQUp', 'forgeTwice', 'dmg', 'range', 'wcd', 'xChain', 'xSlow', 'xSplash', 'prodMul'];
const NO_X2 = ['noPw', 'halfDays', 'refund', 'tower', 'xSlow', 'recruitMin', 'forgeQUp', 'skillNodeCd', 'relicSlot', 'startItemQ'];
Object.keys(TILES).forEach(k => delete TILES[k]);
Object.keys(DEF).forEach(k => {
  const D = DEF[k], T = Object.assign({}, D);
  T.key = k; T.base = D.n; T.n = D.n; T.c = D.hue; T.q = null; T.ic = 'l_' + k;
  T.d = '任何房间：' + D.anyD + '。契合「' + D.fitN + '」：' + D.fitD + '。';
  // the fitting bonus stacks on top of the any-room effect (same keys add up)
  T.mod = (B) => { const o = Object.assign({}, D.any); if (D.fit(B)) { const f = D.fitFx(B); Object.keys(f).forEach(k => { o[k] = (o[k] || 0) + f[k]; }); } return o; };
  TILES[k] = T;
});
M.TILE_DEPTH = ['地表', '浅层', '中层', '深层', '最深层'];
// terrain whose whole effect happens while the room is built: gone once the room stands
M.TILE_ONCE = { ruin: 1 };
// what a terrain still does for the room standing on it: only the effects that keep working (the fitting one only if it fits)
M.tileActive = function (m, c, r, bkey) { const x = M.cell(m, c, r); if (!x || !x.tile || !TILES[x.tile] || M.TILE_ONCE[x.tile]) return []; const T = TILES[x.tile], out = [T.anyD]; if (bkey && M.tileFits(x.tile, bkey)) out.push(T.fitD); return out; };

// ───────── rolling veins: all kinds are equal; a base never repeats one ─────────
const ALL = () => Object.keys(TILES);
M.rollTile = function (r, avoid) { const ks = ALL(), fresh = ks.filter(k => !(avoid || []).includes(k)); return M.pick(fresh.length ? fresh : ks); };
// 地脉结晶 found on expeditions
M.dropTile = () => M.pick(ALL());
M.newBase = function () {
  const cells = [], BC = M.BCOLS, BR = M.BROWS, CO = M.CORE;
  for (let r = 0; r < BR; r++) { cells[r] = []; for (let c = 0; c < BC; c++) cells[r][c] = { dug: false, tile: null, b: null, job: null }; }
  cells[CO.r][CO.c] = { dug: true, tile: null, b: 'core', job: null };
  const per = [1, 2, 2, 2, 2], used = [];
  for (let r = 0; r < BR; r++) {
    const spots = []; for (let c = 0; c < BC; c++) if (!(r === CO.r && Math.abs(c - CO.c) <= 1) && !(r === CO.r + 1 && c === CO.c)) spots.push(c);
    spots.sort(() => Math.random() - 0.5).slice(0, per[r] || 0).forEach(c => { const k = M.rollTile(r, used); used.push(k); cells[r][c].tile = k; });
  }
  return { cells };
};
// where a vein brought home lands: never under a room or a room being built.
// Empty dug rooms first (usable at once), then rock next to the dug area, then any rock.
M.tileSpot = function (m) {
  const empty = [], edge = [], rock = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b || x.job || x.tile) continue; (x.dug ? empty : M.canDig(m, c, r) ? edge : rock).push([c, r]); }
  const pool = empty.length ? empty : edge.length ? edge : rock; return pool.length ? M.pick(pool) : null;
};

// ───────── modifiers ─────────
const x2On = (m) => !!M.hasBuilt(m, B => B.fx && B.fx.tileX2);
M.tileMod = function (m, c, r, bkey, x2) {
  const x = M.cell(m, c, r); if (!x || !x.tile || !TILES[x.tile] || !B_[bkey]) return {};
  const B = B_[bkey], o = TILES[x.tile].mod(B), k = (x2 == null ? x2On(m) : x2) ? 2 : 1, out = {};
  Object.keys(o).forEach(key => { out[key] = NO_X2.includes(key) ? o[key] : o[key] * k; });
  if (out.noPw) { if (B.pw < 0) out.pw = (out.pw || 0) - B.pw; delete out.noPw; }
  return out;
};
M.tileFits = (tileKey, bkey) => !!(TILES[tileKey] && B_[bkey] && TILES[tileKey].fit(B_[bkey], bkey));
// the base-wide half of every occupied vein flows into the usual base modifier channel
const oBM = M.baseMods;
M.baseMods = function (m, raw) {
  const o = oBM.call(this, m, raw); if (raw || !m || !m.base) return o;
  const x2 = x2On(m);
  M.eachBuilt(m, (b, c, r) => {
    const t = M.tileMod(m, c, r, b, x2), B = B_[b];
    Object.keys(t).forEach(k => { if (LOCAL.includes(k) || k === 'heal' || k === 'supplyDaily') return; o[k] = (o[k] || 0) + t[k]; });
    if (t.prodMul && B.fx) Object.keys(B.fx).forEach(k => { if (typeof B.fx[k] === 'number' && k !== 'tileX2') o[k] = (o[k] || 0) + B.fx[k] * t.prodMul; });
  });
  if (o.craftCost) o.craftCost = Math.max(-0.8, o.craftCost);
  if (o.digCost) o.digCost = Math.max(-0.8, o.digCost);
  return o;
};
// leaders and the expedition army feel the veins too
const oHM = M.heroMods;
M.heroMods = function (h, meta) {
  const o = oHM.call(this, h, meta); if (!meta || !meta.base) return o;
  const bm = M.baseMods(meta); ['unitAtk', 'unitHp', 'heroAtk', 'heroHp'].forEach(k => { if (bm[k]) o[k] = (o[k] || 0) + bm[k]; });
  return o;
};
// weapons: attack speed, chain lightning, splash, slow
const oWS = M.weaponStats;
M.weaponStats = function (m, c, r) {
  const w = oWS.call(this, m, c, r); if (!w) return w; const x = M.cell(m, c, r), t = M.tileMod(m, c, r, x.b);
  if (t.wcd) w.cd = w.cd / (1 + t.wcd);
  if (t.xChain) w.xChain = t.xChain; if (t.xSplash) w.xSplash = t.xSplash; if (t.xSlow) w.xSlow = 1;
  return w;
};
// forges: guaranteed quality and twins
const oFO = G.forgeOf;
G.forgeOf = function (c, r) {
  const f = oFO.call(this, c, r), x = M.cell(this.meta, c, r), t = M.tileMod(this.meta, c, r, x.b);
  if (t.forgeQUp) f.qUp = (f.qUp || 0) + t.forgeQUp; if (t.forgeTwice) f.twice = Math.min(0.95, (f.twice || 0) + t.forgeTwice);
  return f;
};

// ───────── what happens overnight ─────────
const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
M.tileHidden = function (m, c, r) {
  const x = M.cell(m, c, r); if (!x || !x.tile || x.dug || x.b || r < 3) return false;
  return !nb.some(([dc, dr]) => { const y = M.cell(m, c + dc, r + dr); return y && (y.dug || y.b); });
};
const oAD = M.advanceDay;
M.advanceDay = function (m) {
  const hid = [], done = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (M.tileHidden(m, c, r)) hid.push([c, r]); if (x.job && x.job.kind === 'build' && x.job.days <= 1 && x.tile) done.push([c, r, x.job.key]); }
  const logs = oAD.call(this, m), bm = M.baseMods(m);
  done.forEach(([c, r, key]) => {
    const x = M.cell(m, c, r); if (x.b !== key) return; const T = TILES[x.tile], fit = M.tileFits(x.tile, key);
    logs.push({ t: '占领地脉 · ' + T.n + (fit ? ' · 契合！' : ''), c, r });
    const t = M.tileMod(m, c, r, key); if (t.refund) { const v = Math.round(B_[key].cost * t.refund); m.supplies += v; logs.push({ t: T.base + '返还物资 +' + v }); }
    if (M.TILE_ONCE[x.tile]) x.tile = null;
  });
  hid.forEach(([c, r]) => { if (!M.tileHidden(m, c, r)) logs.push({ t: '勘明地脉 · ' + TILES[M.cell(m, c, r).tile].n, c, r }); });
  const sh = Math.round(bm.shardDaily || 0), ob = Math.round(bm.orbDaily || 0);
  if (sh) { m.shards += sh; logs.push({ t: '地脉产出灵魂碎片 +' + sh }); }
  if (ob) { m.orbs += ob; logs.push({ t: '地脉产出经验球 +' + ob }); }
  if (bm.healAll) { let n = 0; m.heroes.forEach(h => { const mx = M.heroMaxHp(h, m); if (h.hp > 0 && h.hp < mx) { h.hp = Math.min(mx, h.hp + mx * bm.healAll); n++; } }); if (n) logs.push({ t: '地脉滋养：领袖回复 ' + Math.round(bm.healAll * 100) + '% 生命' }); }
  return logs;
};

// ───────── words ─────────
const dimC = '#8d8496', okC = '#9cff7a';
// tooltip for a vein, optionally judged against the room built (or being chosen) on it
M.tileTip = function (m, c, r, bkey) {
  const x = M.cell(m, c, r); if (!x || !x.tile) return null; const T = TILES[x.tile];
  if (M.tileHidden(m, c, r)) return { title: '未勘明的地脉', c: '#cfc6b8', d: '挖开旁边一格就能看清。', ctx: 'bld' };
  const k = bkey || x.b, fit = k ? M.tileFits(x.tile, k) : null;
  const lines = [{ t: '任何房间：' + T.anyD, c: k ? okC : '#e8dcc4' }, { t: '契合「' + T.fitN + '」：' + T.fitD + (k ? (fit ? '　✔' : '　✘') : ''), c: k ? (fit ? okC : dimC) : '#ffe08a' }];
  return { title: T.n, c: T.c, icon: T.ic, lines, ctx: 'bld' };
};
const tileLines = (m, c, r, bkey) => { const x = M.cell(m, c, r), T = x && x.tile && TILES[x.tile]; return T ? M.tileActive(m, c, r, bkey).map(s => ({ t: s + '　✔', c: okC })) : []; };
// rock tooltips: hide what is unidentified, spell out the two halves otherwise
const oCT = G.cellTip;
G.cellTip = function (p) {
  const t = oCT.call(this, p), m = this.meta, x = p && !p.door && M.cell(m, p.c, p.r); if (!t || !x || !x.tile || x.b) return t;
  const tt = M.tileTip(m, p.c, p.r), days = M.digDays ? M.digDays(m, p.c, p.r) : 1;
  // rock that is terrain: named and explained as the terrain; digging it is 开垦 with the terrain's own days
  if (!x.dug && !x.job) { const hid = M.tileHidden(m, p.c, p.r); return Object.assign(tt, { d: hid ? tt.d : M.canDig(m, p.c, p.r) ? '开垦：' + M.digCost(m) + ' 物资，' + days + ' 天。' : '' }); }
  if (x.job && x.job.kind === 'dig') return Object.assign(tt, { title: '开垦中 · ' + tt.title, d: '还需 ' + x.job.days + ' 天。' });
  t.lines = (tt.lines || []).map(l => Object.assign({}, l)); t.lines.unshift({ t: tt.title, c: tt.c });
  return t;
};
const oBT = G.bldTip;
G.bldTip = function (key, c, r) {
  const t = oBT.call(this, key, c, r); if (c == null || !t) return t; const x = M.cell(this.meta, c, r); if (!x || !x.tile) return t;
  t.lines = (t.lines || []).filter(l => !/^地格加成 · /.test(l.t || '')).concat(tileLines(this.meta, c, r, key));
  return t;
};
// hovering a vein badge on the base
const oMove = G.baseMove;
G.baseMove = function (sx, sy) {
  oMove.call(this, sx, sy); const bv = this.bv; if (!bv || !bv.hoverIc || bv.hoverIc.k !== 't') return;
  const tp = M.tileTip(this.meta, bv.hoverIc.c, bv.hoverIc.r); if (tp) this.tipData = tp;
};
// panels: dig, build and room
const oView = G.view;
G.view = function () {
  const v = oView.call(this), pn = v.pn, p = this.panel, m = this.meta; if (!pn || !p || p.c == null) return v;
  const x = M.cell(m, p.c, p.r); if (!x || !x.tile) return v; const T = TILES[x.tile];
  if (pn.isDig) {
    const hid = M.tileHidden(m, p.c, p.r), days = M.digDays(m, p.c, p.r);
    pn.title = hid ? '未勘明的地脉' : T.n; pn.titleColor = hid ? '#cfc6b8' : T.c; pn.digBtn = '开垦 · ' + M.digCost(m) + ' 物资 · ' + days + ' 天';
    pn.tileTxt = hid ? '挖开旁边一格就能看清。' : '任何房间：' + T.anyD + '　·　契合「' + T.fitN + '」：' + T.fitD; pn.tileC = hid ? '#cfc6b8' : '#e8dcc4';
  }
  if (pn.isBuild) {
    pn.tileTxt = '任何房间：' + T.anyD + '　·　契合「' + T.fitN + '」：' + T.fitD;
    const opts = M.buildOptions(m, p.c, p.r); (pn.opts || []).forEach((o, i) => { const q = opts[i]; if (q) o.bonus = M.tileFits(x.tile, q.key) ? '★ 契合地格' : '☆ 地格通用效果'; });
  }
  if (pn.isRoom && x.b) {
    const act = M.tileActive(m, p.c, p.r, x.b); pn.hasTileRow = false; pn.hasTile = false;
    pn.tileAct = act.map((t, i) => ({ t, hasImg: i === 0, img: M.iconURL(T.ic, 2), tip: 'tag-tile-' + x.tile })); pn.hasTileAct = act.length > 0;
    pn.chips = (pn.chips || []).filter(ch => !/^地格/.test(ch.t || ''));
  }
  return v;
};
})();

;
