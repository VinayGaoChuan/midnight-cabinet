// ==== mc-solo.js ====
(function () {
// One leader (user ruling 2026-09-25). The game has a single leader — the player's avatar — with no quality and a level
// cap. A lost expedition sends it home with 1 life and costs the haul, never the leader, its relics or a base core
// (there are no core lives any more; only the main base falling in a 混沌来袭 ends the game). Exp is not an item: what
// the leader earns it gets at once (no exp orbs, no level-up button). Everything that only made sense with many
// mortal leaders is gone or reworked: recruiting, leader caps, death payouts, "every leader" wording. Soul shards now
// come mainly from the monsters killed in a 混沌来袭. A new game starts with a random class and a plain hospital.
// Loaded before mc-save.js: the save check calls M.soloFix.
const M = window.MC, G = M.Game.prototype, B = M.BUILDINGS, now = () => performance.now();
M.LV_MAX = 20;
M.SOLO_R = 3;                                               // the one leader grows the tallest talent tree
if (M.RARITY && M.RARITY[3]) M.RARITY[3].stat = 1.15;
M.addExp = function (h, amt) {
  let ups = 0; h.exp += Math.round(amt);
  while (h.lv < M.LV_MAX && h.exp >= M.expNeed(h.lv)) { h.exp -= M.expNeed(h.lv); h.lv++; h.points++; ups++; }
  if (h.lv >= M.LV_MAX) h.exp = Math.min(h.exp, M.expNeed(M.LV_MAX));
  return ups;
};
// talent layers open every third level (layer k at Lv 3k − 1: 2, 5, 8, 11, 14, 17) so the long climb keeps giving
M.talLvFor = (L) => 3 * L - 1;
M.talShownAt = (h, lv) => Math.max(0, Math.min(M.talHeight(h), Math.floor((lv + 1) / 3)));
M.talShown = (h) => M.talShownAt(h, h.lv);

// ───────── a new leader: always the one tree shape ─────────
const oNH = M.newHero;
M.newHero = function (meta, cls) { return oNH.call(this, meta, cls, M.SOLO_R); };
const CLS = () => Object.keys(M.HEROES);
const oDM = M.defaultMeta3;
M.defaultMeta3 = function () { const m = oDM.apply(this, arguments); m.heroes = [M.newHero(m, M.pick(CLS()))]; m.orbs = 0; delete m.core; return m; };

// ───────── buildings: recruiting is gone, death / cap / orb effects become exp and supplies ─────────
const setB = (k, o) => { if (B[k]) Object.assign(B[k], o); };
['altar', 'tavern'].forEach(k => setB(k, { fixed: 1, gone: 1 }));   // never offered again; old ones become hospitals
setB('training',   { cat: 'train', fx: { exp: 0.25 }, d: '领袖出征得到的经验 +25%。' });
setB('library',    { cat: 'train', fx: { exp: 0.5, expDaily: 20 }, d: '领袖出征得到的经验 +50%，每天获得 20 经验。' });
setB('vault',      { cat: 'store', fx: { lootSup: 0.15 }, d: '出征带回的物资 +15%。' });
setB('taj',        { cat: 'misc', fx: { shardDaily: 3 }, d: '每天产出 3 灵魂碎片。' });
setB('angkor',     { cat: 'train', recruit: undefined, fx: { expDaily: 30 }, d: '领袖每天获得 30 经验。' });
setB('stonehenge', { cat: 'luck', recruit: undefined, fx: { vision: 1, startItem: 1 }, d: '出征视野 +1，开局多带 1 个支援道具。' });
setB('machu',      { fx: { supplyDaily: 15, expDaily: 20 }, d: '每天产出 15 物资，领袖每天获得 20 经验。' });
setB('hospital',   { d: '领袖每天回复 35% 生命。' });
// the old underground core is now the lift up to the main base on the surface
setB('core', { n: '升降井', d: '连着地面上的主基地（仓库和传送门）。' });
setB('meditation', { d: '领袖每天获得 15 经验。' });
setB('shaolin',    { d: '领袖每天获得 45 经验，生命 +10%。' });
setB('armory',     { d: '领袖攻击 +12%。' });
setB('colosseum',  { d: '领袖攻击 +12%、生命 +20%。' });
setB('forbidden',  { d: '出征可以多带 1 件宝物。' });
setB('potala',     { d: '领袖技能冷却少 1 个节点。' });
// exp orbs are gone: whatever still says "orbs per day" feeds the leader directly
const oBM = M.baseMods;
M.baseMods = function (m, raw) { const o = oBM.apply(this, arguments); if (o.orbDaily) { o.expDaily = (o.expDaily || 0) + o.orbDaily; delete o.orbDaily; } delete o.heroCap; delete o.recruitMin; delete o.newHeroLv; delete o.bank; delete o.deathShards; delete o.orbMul; return o; };

// ───────── terrain: the same clean-up ─────────
const T_ = M.TILES, reT = (k, o) => { const T = T_[k]; if (!T) return; Object.assign(T, o); T.d = '任何房间：' + T.anyD + '。契合「' + T.fitN + '」：' + T.fitD + '。'; T.mod = (Bd) => { const r = Object.assign({}, T.any); if (T.fit(Bd)) { const f = T.fitFx(Bd); Object.keys(f).forEach(x => { r[x] = (r[x] || 0) + f[x]; }); } return r; }; };
const isCat = (c) => (Bd) => !!Bd && Bd.cat === c, isSty = (s) => (Bd) => !!Bd && Bd.style === s;
reT('geo',       { any: { expDaily: 15 }, anyD: '领袖每天获得 15 经验' });
reT('amber',     { any: { expDaily: 30 }, anyD: '领袖每天获得 30 经验', fitD: '领袖出征得到的经验 +30%', fitFx: () => ({ exp: 0.3 }) });
reT('ygg',       { any: { supplyDaily: 15, expDaily: 15 }, anyD: '基地每天 +15 物资，领袖每天获得 15 经验' });
reT('ley',       { any: { shardDaily: 3 }, anyD: '基地每天 +3 灵魂碎片', fitN: '魔法', fit: isSty('magic'), fitD: '基地每天再 +2 灵魂碎片', fitFx: () => ({ shardDaily: 2 }) });
reT('bones',     { any: { heroHp: 0.15 }, anyD: '领袖生命 +15%', fitN: '训练', fit: isCat('train'), fitD: '领袖攻击 +15%', fitFx: () => ({ heroAtk: 0.15 }) });
reT('dragon',    { fitD: '领袖出征得到的经验 +40%', fitFx: () => ({ exp: 0.4 }) });
reT('spring',    { anyD: '领袖每天回复 15% 生命（不需要医院）' });
reT('heart',     { fitD: '医院回复 +30%，领袖每天再回 10%' });
reT('storm',     { anyD: '领袖攻击 +12%' });
reT('hourglass', { anyD: '领袖技能冷却少 1 个节点' });
reT('crown',     { anyD: '出征多带 1 件宝物' });

// ───────── keepsakes and calendar events that recruited or healed "every leader" ─────────
if (M.GIFTS) { ['hero', 'letter'].forEach(k => { if (M.GIFTS[k]) M.GIFTS[k].w = 0; }); if (M.GIFTS.calm) M.GIFTS.calm.d = '领袖回复 25% 生命。'; }
if (M.DAYEV && M.DAYEV.recruit) M.DAYEV.recruit.w = 0;
if (M.DAYEV && M.DAYEV.plague) M.DAYEV.plague.d = '领袖病倒了：花物资治疗，或者失去 30% 生命。';

// ───────── talents: no death payouts, no caps, no "every leader" twins of the army talents ─────────
['martyr', 'legacy', 'vault', 'command', 'tactics', 'drill', 'logistics', 'rally', 'alchemy'].forEach(k => delete M.TALENTS[k]);   // 炼金术 made exp orbs: with orbs gone it would only repeat 教导术
Object.keys(M.TALENTS).forEach(k => { const F = M.TALENTS[k], od = F.d; F.d = (...a) => od(...a).replace('本领袖出征时，', '出征时，').replace(/本领袖/g, '领袖').replace('基地里的每名领袖', '领袖').replace('给每名领袖', '给领袖'); });
if (M.TAL_SC && M.TAL_SC.base) M.TAL_SC.base.n = '基地';

// ───────── a lost expedition: home with 1 life; the haul is lost, the leader and its relics are not ─────────
G.runFail = function () {
  const m = this.meta, run = this.run, h = run.hero, mx = M.heroMaxHp(h, m);
  h.hp = 1; h.relics = []; h.runs = (h.runs || 0) + 1; m.runs++; m.st = m.st || {}; m.st.fails = (m.st.fails || 0) + 1;
  if (!run.region.tut) this.pendingDay = true;
  this.save(); M.Sfx.lose && M.Sfx.lose();
  this.endInfo = { title: '探索失败', color: '#ff4a4a', sub: M.heroN(h) + ' 带着 1 点生命逃回了基地，这一趟的收获都丢了。', tiles: [], lines: [{ k: '领袖生命', v: '1 / ' + mx, c: '#ff8a8a' }], at: now(), gain: {} };
  this.go('end');
};
const oWin = G.runWin;
G.runWin = function () { const r = oWin.apply(this, arguments), e = this.endInfo; if (e) { delete e.coreHeal; e.lines = (e.lines || []).filter(l => !/核心/.test(l.k || '')); if (e.gain) e.gain.morb = 0; e.tiles = (e.tiles || []).filter(t => t.icon !== 'orb' || t.n === '经验'); } return r; };
// a leader falling in a 混沌来袭 gets up with 1 life when it is over
M.raidFall = function (m, h) { h.hp = 1; return { h, sh: 0, orb: 0 }; };

// ───────── old saves: one leader, no orbs, no cores, no recruiting rooms ─────────
M.soloFix = function (m) {
  let ch = false;
  if (Array.isArray(m.heroes) && m.heroes.length) {
    if (m.heroes.length > 1) { m.heroes.sort((a, b) => (b.lv - a.lv) || ((b.exp || 0) - (a.exp || 0))); m.heroes = m.heroes.slice(0, 1); ch = true; }
    const h = m.heroes[0];
    if (h.rarity !== M.SOLO_R) { const back = Array.isArray(h.taken) ? h.taken.length : 0; h.rarity = M.SOLO_R; h.tree = M.talentTree(M.SOLO_R); h.taken = []; h.points = Math.min(30, (h.points || 0) + back); ch = true; }
    if ((m.orbs || 0) > 0) { M.addExp(h, m.orbs); ch = true; }
  }
  if (m.orbs) { m.orbs = 0; ch = true; }
  if (m.core != null) { delete m.core; ch = true; }
  ['freeRecruit', 'recruitMinOnce'].forEach(k => { if (m[k]) { delete m[k]; ch = true; } });
  if (m.base && m.base.cells) m.base.cells.forEach(row => row.forEach(x => { if (x && (x.b === 'altar' || x.b === 'tavern')) { x.b = 'hospital'; ch = true; } if (x && x.job && x.job.kind === 'build' && (x.job.key === 'altar' || x.job.key === 'tavern')) { x.job.key = 'hospital'; ch = true; } }));
  if (m.inv) ['altar', 'tavern'].forEach(k => { if (m.inv['bbp:' + k]) { m.supplies = (m.supplies || 0) + 60 * m.inv['bbp:' + k]; delete m.inv['bbp:' + k]; ch = true; } });
  return ch;
};
})();

;
