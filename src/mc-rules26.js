// ==== mc-rules26.js ====
(function () {
// Rules of the 2026-09-26 batch that the save check (mc-save.js, loaded right after) already needs: the base core,
// prosperity and the unlocked rings of the base, broken / repaired / demolished rooms, the wall, and the role every
// room plays in the surface town (mc-town.js) and in a 混沌来袭 (mc-siege.js). No drawing here.
const M = window.MC, B_ = M.BUILDINGS;

// ───────── the base core: 3 hearts (mc-revive.js tells the story) ─────────
M.CORE_MAX = 3;
const oDM = M.defaultMeta3;
M.defaultMeta3 = function () { const m = oDM.apply(this, arguments); m.core = M.CORE_MAX; m.prosLv = 1; m.landV = 2; m.portalV = 2; if (m.portal) m.portal.hp = M.PORTAL_BASE; M.invAdd(m, 'bbp:wall', 2); M.invAdd(m, 'bbp:ballista', 1); return m; };   // a first line of defence: the town, not the leader, holds the raids
M.coreFix = function (m) { if (typeof m.core !== 'number' || !(m.core >= 1)) { m.core = M.CORE_MAX; return true; } if (m.core > M.CORE_MAX) { m.core = M.CORE_MAX; return true; } return false; };

// ───────── the wall (user ruling 2026-09-26: walls go to the outside of the town by themselves) ─────────
B_.wall = { n: '石墙', q: 0, cat: 'defense', style: 'medieval', pw: 0, cost: 70, days: 1, wall: 1, d: '地面上的城墙，挡住来袭的怪物。' };
if (B_.michel) Object.assign(B_.michel, { wall: 1, d: '地面上的要塞城墙，主基地耐久 +60%。' });
// the other defences now stand on the surface (mc-siege.js): their words say so
const D26 = { ballista: '地面上的弩塔，守城时射箭。', cannon: '地面上的炮台，炮弹落地溅射。', tesla: '地面上的线圈塔，电弧在敌人之间跳跃。', spire: '地面上的法师塔，命中的敌人减速。', colossus: '地面上的巨像，拳头砸向来犯的怪物。', zeus: '地面上的神像，召唤落雷连锁 4 个敌人。', kotoku: '守城时 2 名武僧出城迎敌。', terracotta: '守城时 4 名陶俑士兵出城迎敌。', eiffel: '每天产出 4 灵魂碎片，所有防御塔伤害 +30%。' };
Object.keys(D26).forEach(k => { if (B_[k]) B_[k].d = D26[k]; });
// two more fighting buildings (user ruling 2026-09-27: 「战斗类建筑会被攻击，城墙，防御罩，古树」)
B_.dome = { n: '防御罩', q: 1, cat: 'defense', style: 'scifi', pw: 0, cost: 220, days: 2, shield: 1, d: '守城时罩住附近的建筑和主基地，先由护罩挨打。' };
B_.elder = { n: '守望古树', q: 1, cat: 'defense', style: 'nature', pw: 0, cost: 180, days: 2, wall: 1, elder: 1, d: '地面上的古树，挡住怪物；一阵没人打它，伤口就慢慢长好。' };
// what a room is in the town on the surface: wall (outermost, blocks), guard (sends soldiers out), tower (shoots),
// shield (a dome over the middle of the town); everything else is civil: the city behind the fighting line, which
// monsters walk past (user ruling 2026-09-27: 非战斗类建筑都是背景，不会被攻击，无法被点击)
M.townRole = function (key) { const B = B_[key]; if (!B || key === 'core') return null; if (B.wall) return 'wall'; if (B.shield) return 'shield'; if (B.fx && B.fx.defArmy) return 'guard'; if (B.weapon) return 'tower'; return 'civil'; };
M.townFights = (key) => { const r = M.townRole(key); return !!r && r !== 'civil'; };
// a weapon's reach on the surface, measured from its tower (the old "range" in rows becomes distance)
M.towerRange = (w) => 240 + (w.range || 2) * 110;
M.weaponReach = () => null;   // the old reach (surface columns covered from below) is gone
// life of the surface building: by role, then quality
const HP_ROLE = { wall: 2400, guard: 1400, tower: 1000, shield: 1200, civil: 0 };
M.townHp = function (key) { const B = B_[key], role = M.townRole(key); if (!role) return 0; return Math.round(HP_ROLE[role] * (1 + 0.6 * (B.q || 0))); };

// ───────── one of each (user question 2026-09-27: 「很多图纸都是重复的，例如医院，我手里有3张了，难道我可以建3个医院吗，效果叠加」) ─────────
// Only the fighting buildings of common and rare quality (walls, towers, barracks, the shield, the old tree) are built more
// than once — a town needs several. Everything else, and every epic, legendary or boss building, is one of a kind: no second
// blueprint of it drops, and a spare copy (old saves, a visitor's stall) turns into supplies, half its building cost.
M.bUnique = (k) => { const B = B_[k]; if (!B || k === 'core') return false; return !((B.q || 0) <= 1 && !B.boss && M.townFights(k)); };
M.bOwned = (m, k) => { let n = 0; if (!m || !m.base) return 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b === k || (x.job && x.job.kind === 'build' && x.job.key === k)) n++; } return n + ((m.inv && m.inv['bbp:' + k]) || 0); };
M.uniqFix = function (m, logs) {
  if (!m || !m.inv || !m.base) return false; let ch = false;
  Object.keys(m.inv).forEach(id => { if (!id.startsWith('bbp:')) return; const k = id.slice(4), B = B_[k], have = m.inv[id] | 0; if (!B || !M.bUnique(k) || have <= 0) return;
    const standing = M.bOwned(m, k) - have, extra = standing > 0 ? have : have - 1; if (extra <= 0) return;
    const v = Math.round((B.cost || 100) * 0.5) * extra; m.inv[id] = have - extra; if (m.inv[id] <= 0) delete m.inv[id]; m.supplies = (m.supplies || 0) + v; ch = true;
    if (logs) logs.push({ t: '多余的' + B.n + '图纸换成 ' + v + ' 物资' }); });
  return ch;
};
const oSoloU = M.soloFix;
M.soloFix = function (m) { let ch = oSoloU ? oSoloU.apply(this, arguments) : false; if (M.uniqFix(m)) ch = true; return ch; };
// no blueprint drops for a one-of-a-kind building already standing, being built or in stock, nor for a boss building owned
const oUse = M.bpUseful;
if (oUse) M.bpUseful = function (m, key) {
  if (m && key && key.startsWith('bbp:')) { const k = key.slice(4), B = B_[k]; if (B && B.boss && M.bbOwned && M.bbOwned(m, k)) return false; if (B && M.bUnique(k) && M.bOwned(m, k) > 0) return false; }
  return oUse.apply(this, arguments);
};
// a one-of-a-kind building already standing (or being built) cannot be built again
const oBO = M.buildOptions;
M.buildOptions = function (m) { const L = oBO.apply(this, arguments); return L.map(o => (M.bUnique(o.key) && M.bOwned(m, o.key) - ((m.inv && m.inv['bbp:' + o.key]) || 0) > 0 ? Object.assign({}, o, { why: o.why || '已经建了一座' }) : o)); };
// the main base holds out longer now that the town, not the leader, defends it (1000 → 2400; old saves keep their share)
M.PORTAL_BASE = 2400;
// …and grows with prosperity (user ruling 2026-09-26: 「基地生命值要随着繁荣度而增加，否则后面的敌人越来越强，摸一下基地就死」): +35% a level
M.PORTAL_PROS = 0.45;   // 2026-09-27: levels come slower now (0.35 → 0.45 keeps the main base as tough on the same day)
// Only a prosperity level raises the max, and only the max (user ruling 2026-09-27: 「繁荣升级后，血量不要自动布满，每天回血应该是
// 建筑的特性，而不是默认机制……如果基地本来就没血了，那一碰就死很正常」「只有繁荣度升级，才会增加最大血量，通过1天，不应该增加最大血量」):
// what is lost stays lost until a 修缮坊 (mc-roomset.js), a 修门石 or the torch of 自由女神像 mends it
M.portalMax = (m) => Math.round(M.PORTAL_BASE * (1 + (M.baseMods(m).portalHp || 0)) * (1 + M.PORTAL_PROS * Math.max(0, ((m && m.prosLv) || 1) - 1)));

// ───────── prosperity (user ruling 2026-09-26) ─────────
// every standing room adds by its quality (the better, the more; the numbers are never shown). Levels open the rings of
// the base one by one: Lv1 the ring around the lift, Lv4 the whole rock.
M.PROS_Q = [10, 25, 45, 70];
// 2026-09-27 (「繁荣等级太容易提升了……直接在周围给了一圈土地，给的太多了」, then 「不要地契，每升一级，扩展几块土地。只有土地稀缺，才能让
// 玩家思考对建筑的取舍，才有追求高品质建筑的欲望」): prosperity is the base itself — its rooms by quality, and a little for every night
// held (so a bad run of blueprints never stops it for good) — and every level opens a few cells, never a whole ring. The
// thresholds are set so that filling the land a level gives with the rooms of that stage of the game just about reaches the
// next one: past that only better rooms (tear down a plain one, build a better one) move it on. Pace on 普通 (bot runs):
// Lv2 ~day 3, Lv3 ~day 5–6, Lv4 ~day 8, Lv5 ~day 11, Lv6 ~day 14; Lv7–9 are for the long difficulties. The bot builds ~0.7
// rooms a day (it is short of blueprints): the land a level gives stays at or under what a player can build, so it is the
// land, not the blueprints, that runs out first as soon as the blueprints come faster.
M.PROS_LV = [0, 30, 60, 110, 180, 260, 350, 460, 600];
M.PROS_MAX = M.PROS_LV.length; M.PROS_RINGS = M.PROS_MAX;
M.prosperity = function (m) {
  let p = 0; if (!m || !m.base) return 0;
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.b || x.b === 'core' || (x.job && x.job.kind === 'demolish')) continue; p += M.PROS_Q[(B_[x.b] || {}).q || 0] || 0; }
  return p;
};
M.prosLvOf = (p) => { let l = 1; M.PROS_LV.forEach((t, i) => { if (p >= t) l = i + 1; }); return l; };
// the level the base has reached (it never drops: a demolished room does not close the rock again)
M.prosLv = (m) => Math.max(m.prosLv || 1, 1);
M.prosNext = (m) => { const l = M.prosLv(m); return l >= M.PROS_MAX ? null : M.PROS_LV[l]; };
// ring of a cell around the lift: 1 = the cells touching it
// the land: the 20 cells around the lift (7 × 3) open in this order, nearest first — the 5 round the lift at Lv1, then two
// more a level (left and right), and the last one, straight under the lift, at Lv9 (every cell touches one opened before it,
// so it can always be dug); M.ringOf is the level that opens a cell
const LAND = [[2, 0], [4, 0], [3, 1], [2, 1], [4, 1], [1, 0], [5, 0], [2, 2], [4, 2], [1, 1], [5, 1], [0, 0], [6, 0], [1, 2], [5, 2], [0, 1], [6, 1], [0, 2], [6, 2], [3, 2]];
const LAND_N = M.LAND_N = [0, 5, 7, 9, 11, 13, 15, 17, 19, 20];
const LV_OF = {}, IDX = {}; LAND.forEach(([c, r], i) => { let lv = 1; while (LAND_N[lv] <= i) lv++; LV_OF[c + ',' + r] = lv; IDX[c + ',' + r] = i; });
M.ringOf = (c, r) => (c === M.CORE.c && r === M.CORE.r ? 0 : LV_OF[c + ',' + r] || 99);
// how much of it a game can ever open grows with the difficulty (2026-09-27: 「土地数量随着难度提高而提高，最低难度15可以，最高20」):
// 普通 15 · 困难 17 · 噩梦 19 · 地狱 20 — the land Lv6 / 7 / 8 / 9 opens, about where each difficulty's last night falls
M.LAND_MAX = [15, 17, 19, 20];
M.landCap = (m) => M.LAND_MAX[Math.max(0, Math.min(M.LAND_MAX.length - 1, (m && m.gd) | 0))];
M.landReach = (m, c, r) => (c === M.CORE.c && r === M.CORE.r) || (IDX[c + ',' + r] != null && IDX[c + ',' + r] < M.landCap(m));
// an old save keeps the cells it had already dug or built on (m.landKeep)
M.unlocked = (m, c, r) => (M.ringOf(c, r) <= M.prosLv(m) && M.landReach(m, c, r)) || !!(m && m.landKeep && m.landKeep[c + ',' + r]);
M.lockedCell = (m, c, r) => !M.unlocked(m, c, r);

// ───────── rock: only the unlocked rings can be dug; terrain shows as soon as its ring opens ─────────
const oCD = M.canDig;
M.canDig = function (m, c, r) { if (!M.unlocked(m, c, r)) return false; return oCD.apply(this, arguments); };
M.tileHidden = function (m, c, r) { return !M.unlocked(m, c, r); };
// where a vein crystal lands (user ruling 2026-09-26): never in the dark. Empty rooms first, then open rock; with neither
// left, a room already built — one the terrain fits first, else any
M.tileSpot = function (m, tk) {
  const empty = [], rock = [], fit = [], built = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) {
    if (!M.unlocked(m, c, r)) continue; const x = m.base.cells[r][c]; if (x.b === 'core' || x.job) continue;
    if (x.b) { if (x.tile === tk) continue; (tk && M.tileFits && M.tileFits(tk, x.b) ? fit : built).push([c, r]); continue; }
    if (x.tile) continue; (x.dug ? empty : rock).push([c, r]);
  }
  const pool = empty.length ? empty : rock.length ? rock : fit.length ? fit : built; return pool.length ? M.pick(pool) : null;
};

// ───────── broken and demolished rooms ─────────
// a surface building knocked down in a 混沌来袭 leaves its room without effect until it is repaired (x.ruin); a room
// being demolished stops working at once
const off = (x) => !!(x.ruin || (x.job && x.job.kind === 'demolish'));
M.roomOff = off;
M.eachBuilt = function (m, fn) { for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.b && !off(x)) fn(x.b, c, r, x); } };
M.hasBuilt = (m, pred) => { let f = null; M.eachBuilt(m, (b, c, r) => { if (!f && pred(B_[b], b)) f = { key: b, c, r }; }); return f; };
const oWS = M.weaponStats;
M.weaponStats = function (m, c, r) { const x = M.cell(m, c, r); if (!x || off(x)) return null; return oWS.apply(this, arguments); };
M.repairCost = (key) => Math.max(30, Math.round((B_[key] || {}).cost * 0.4 || 30));
M.DEMOLISH_COST = 50;
M.startRepair = function (m, c, r) { const x = M.cell(m, c, r); if (!x || !x.b || !x.ruin || x.job) return false; const cost = M.repairCost(x.b); if (m.supplies < cost) return false; m.supplies -= cost; x.job = { kind: 'repair', key: x.b, days: 1, total: 1 }; return true; };
M.canDemolish = (m, c, r) => { const x = M.cell(m, c, r); return !!(x && x.b && x.b !== 'core' && !x.job); };
M.startDemolish = function (m, c, r) { if (!M.canDemolish(m, c, r) || m.supplies < M.DEMOLISH_COST) return false; const x = M.cell(m, c, r); m.supplies -= M.DEMOLISH_COST; x.job = { kind: 'demolish', key: x.b, days: 1, total: 1 }; return true; };
// overnight: repairs and demolitions finish before anything else looks at the rooms; then prosperity is counted
const oAD = M.advanceDay;
M.advanceDay = function (m) {
  const mine = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.job && (x.job.kind === 'repair' || x.job.kind === 'demolish')) { mine.push([c, r, x.job]); x.job = null; } }
  const logs = oAD.apply(this, arguments);
  mine.forEach(([c, r, j]) => {
    const x = m.base.cells[r][c], B = B_[j.key]; j.days--;
    if (j.days > 0) { x.job = j; return; }
    if (j.kind === 'repair') { x.ruin = false; logs.push({ t: B.n + ' 修好了', c, r, repaired: j.key }); }
    else { x.b = null; x.ruin = false; M.invAdd(m, 'bbp:' + j.key, 1); logs.push({ t: B.n + ' 拆掉了 · 图纸收回', c, r, demolished: j.key }); }
  });
  M.uniqFix(m, logs);   // spare copies of one-of-a-kind buildings (a visitor's stall, old saves)
  const l0 = M.prosLv(m), l1 = M.prosLvOf(M.prosperity(m));
  if (l1 > l0) { m.prosLv = l1; m.prosUp = { from: l0, to: l1 }; }   // mc-prosper.js opens the ring on screen
  return logs;
};

// ───────── old saves: a core, a prosperity level that keeps everything already dug in the light ─────────
M.prosFix = function (m) {
  let ch = false, ring = 1;
  // the land v2 (2026-09-27): the level is counted again under the new rules (it may go down, once); cells already dug, built or
  // being worked on stay open; opened but untouched ones close again until their level
  if (m.landV !== 2) { m.landV = 2; m.landKeep = {}; m.prosLv = M.prosLvOf(M.prosperity(m)); for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if ((x.dug || x.b || x.job) && M.ringOf(c, r) > m.prosLv) m.landKeep[c + ',' + r] = 1; } ch = true; }
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (x.ruin != null && typeof x.ruin !== 'boolean') { x.ruin = !!x.ruin; ch = true; } if (x.ruin && x.b && !M.townFights(x.b)) { x.ruin = false; ch = true; } }   // only fighting buildings fall now
  const want = Math.min(M.PROS_MAX, Math.max(ring, M.prosLvOf(M.prosperity(m))));   // ring stays 1: land no longer lifts the level
  if (typeof m.prosLv !== 'number' || m.prosLv < want || m.prosLv > M.PROS_MAX) { m.prosLv = want; ch = true; }
  if (m.prosUp && typeof m.prosUp !== 'object') { delete m.prosUp; ch = true; }
  if (m.portal && !m.portalV) { m.portal.hp = Math.round((m.portal.hp || 0) * M.PORTAL_BASE / 1000); m.portalV = 2; ch = true; }
  return ch;
};
})();

;
