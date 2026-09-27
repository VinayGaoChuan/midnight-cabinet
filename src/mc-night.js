// ==== mc-night.js ====
(function () {
// Day and night, the garrison, and the over-limit evolution buildings (user rulings 2026-09-26):
//   「白天探索，晚上防守，也就是每天晚上都会有混沌来袭。如果白天有事件，就相当于白天不能探索，触发事件，然后就进入黑夜防守」
//   「防守主要靠玩家带出来的部队，所以，把所有防守类建筑要么删除，要么改成别的类型。并且处理一遍所有建筑，所有基地建筑都要
//    为探索服务，而探索带回战力，防守基地，要做好内外联系」 · 「只把单位带出，探索的时候不会再带入」
//   「合成默认能合到稀有，史诗，传说，神话都需要局外的建筑的超限合成解锁。而且超限解锁建筑，应该是唯一的。例如法师塔，法师职业
//    可以超限进化1次。这种建筑同一种只能建造一次，要想超限进化第二次，就需要建不同种类的类似建筑」
// · The day: a visitor may come in the morning, then explore (or rest) → the night: 混沌来袭 → the next day. Every night.
// · The garrison: every unit that comes home from an expedition stays at the base (it never goes out again). Three of a
//   kind there evolve too. At night the garrison fights the raid in an ordinary battle; the leader stays on the roof (its
//   skill still works). A night held: the fallen get up again. A night lost (the garrison beaten): three in ten of the
//   fallen are gone and what is left of the raid strikes the main base; at 0 the game is over.
// · Evolution goes up to 稀有 by itself. Each vocation has three over-limit buildings (old fighting buildings and new
//   halls, every one of a kind); every one of them standing lets that vocation evolve one tier further: 史诗, 传说, 神话.
//   Shops sell no tier above what the base allows.
// · The rest of the old defence serves the expeditions now; the old defence modifiers strengthen the garrison.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, DB = M.DB, B = M.BUILDINGS, S = M.Sfx, Q = M.QUALITY, now = () => performance.now();
const rnd = Math.random, cl = (v, a, b) => Math.max(a, Math.min(b, v));
M.NIGHTLY = true;

// ───────── over-limit evolution: three buildings per vocation ─────────
// [vocation, key, name, style, quality]; keys starting with ev_ are new halls (their rooms: mc-pxroom-evo.js)
const EVO = [
  ['先锋', 'wall', '石墙', 'medieval', 2], ['先锋', 'ev_van2', '破阵营', 'medieval', 3], ['先锋', 'ev_van3', '不落要塞', 'fantasy', 4],
  ['守护者', 'dome', '防御罩', 'scifi', 2], ['守护者', 'ev_gua2', '誓约大厅', 'medieval', 3], ['守护者', 'ev_gua3', '圣盾穹顶', 'magic', 4],
  ['战士', 'ev_war1', '角斗场', 'medieval', 2], ['战士', 'kotoku', '高德院', 'fantasy', 3], ['战士', 'colossus', '罗德岛巨像', 'water', 4],
  ['圣骑士', 'ev_pal1', '骑士团驻地', 'medieval', 2], ['圣骑士', 'ev_pal2', '圣光礼拜堂', 'fantasy', 3], ['圣骑士', 'michel', '圣米歇尔山', 'water', 4],
  ['射手', 'ballista', '弩炮室', 'medieval', 2], ['射手', 'cannon', '蒸汽加农炮', 'steam', 3], ['射手', 'ev_rng3', '风神箭塔', 'nature', 4],
  ['刺客', 'tesla', '特斯拉线圈', 'scifi', 2], ['刺客', 'ev_ass2', '影刃密室', 'fantasy', 3], ['刺客', 'ev_ass3', '无面者神殿', 'magic', 4],
  ['法师', 'spire', '奥术尖塔', 'magic', 2], ['法师', 'ev_mag2', '法师塔', 'magic', 3], ['法师', 'ev_mag3', '星界天文台', 'scifi', 4],
  ['牧师', 'elder', '生命古树', 'nature', 2], ['牧师', 'ev_cle2', '圣泉疗养院', 'water', 3], ['牧师', 'ev_cle3', '天使圣堂', 'fantasy', 4],
  ['祭司', 'ev_pri1', '神谕祭坛', 'magic', 2], ['祭司', 'ev_pri2', '月神殿', 'nature', 3], ['祭司', 'zeus', '奥林匹亚宙斯神像', 'fantasy', 4],
  ['召唤师', 'ev_sum1', '召唤法阵', 'magic', 2], ['召唤师', 'ev_sum2', '灵魂熔炉', 'steam', 3], ['召唤师', 'terracotta', '兵马俑', 'fantasy', 4],
  ['商人', 'ev_mer1', '跳蚤市场', 'cartoon', 2], ['商人', 'ev_mer2', '黄金交易所', 'steam', 3], ['商人', 'eiffel', '埃菲尔铁塔', 'steam', 4],
];
M.EVO_BLDS = EVO;
const COST = { 2: 200, 3: 300, 4: 420 }, DAYS = { 2: 2, 3: 3, 4: 4 }, FIGHT_F = ['weapon', 'wall', 'shield', 'elder'];
EVO.forEach(([voc, k, n, style, q]) => {
  const b = B[k] || (B[k] = { pw: 0 });
  FIGHT_F.forEach(f => { delete b[f]; });
  Object.assign(b, { n, q, cat: 'defense', style, cost: COST[q], days: DAYS[q], fx: {}, evoVoc: voc, d: voc + '部队的进化上限提高一档。' });
  if (!(b.pw >= -1)) b.pw = 0;
});
M.EVO_BASE = 3;   // 稀有: as far as evolving goes without any over-limit building
M.evoBlds = (m, voc) => { const out = []; if (!m || !m.base || !M.eachBuilt) return out; M.eachBuilt(m, (k) => { const b = B[k]; if (b && b.evoVoc === voc && !out.includes(k)) out.push(k); }); return out; };
M.vocCap = (m, voc) => Math.min(6, M.EVO_BASE + M.evoBlds(m, voc).length);
// may a unit evolve into its next tier? (a run asks its base, the garrison the base itself)
M.evoOpen = (m, type) => { const d = DB[type], n = d && d.next && DB[d.next]; if (!n) return false; if (!n.tier || !m) return true; return n.tier <= M.vocCap(m, d.voc); };
M.canMythic = (m, voc) => M.vocCap(m, voc) >= 6;
const metaOf = (host) => (host && host.M) || (M._g && M._g.meta) || null;
// the rest of the old defence: serves the expeditions now
const CONV = {
  bb_bell: { cat: 'scout', fx: { bossStun: 3 }, d: '出征的首领战，首领开场停顿 3 秒。' },
  bb_colossus: { cat: 'train', fx: { unitAtk: 0.12 }, d: '出征部队攻击 +12%。' },
  bb_jailer: { cat: 'train', fx: { startUnit: 2 }, d: '出征开局多带 2 支部队。' },
};
Object.keys(CONV).forEach(k => { const b = B[k]; if (!b) return; FIGHT_F.forEach(f => { delete b[f]; }); Object.assign(b, CONV[k]); });
// the category keeps its key; it is the evolution category now
if (M.CAT) M.CAT.defense = '进化';
if (M.CAT_COL) M.CAT_COL.defense = '#ff9a3c';
if (M.CAT_D) M.CAT_D.defense = '让一个职业的部队进化得更高：每座 +1 档。';
if (M.TAG_IC && M.TAG_IC.CAT_IC) M.TAG_IC.CAT_IC.defense = 'u_star';
// nothing fights on the surface any more, so nothing there falls in ruins; every building is one of a kind
M.townRole = function (key) { return !B[key] || key === 'core' ? null : 'civil'; };
M.townFights = () => false;
M.bUnique = (k) => !!B[k] && k !== 'core';
// the raid reward's old lean (a fighting building's blueprint): any useful building now
M.defBp = function () { const m = M._g && M._g.meta, ks = Object.keys(B).filter(k => !B[k].fixed && !B[k].gone && !B[k].boss && k !== 'core' && (!m || !M.bpUseful || M.bpUseful(m, 'bbp:' + k))); return 'bbp:' + M.wpick(ks.length ? ks : ['farm'], k => [6, 4, 2, 1, 0.4, 0][(B[k] || {}).q || 0] || 0.2); };
// the first blueprints of a new game: exploration, not walls
const oDM = M.defaultMeta3;
M.defaultMeta3 = function () { const m = oDM.apply(this, arguments); if (m && m.inv) { ['bbp:wall', 'bbp:ballista'].forEach(k => { delete m.inv[k]; }); M.invAdd(m, 'bbp:lookout', 1); } if (m) { m.garrison = []; m.nightV = 1; } return m; };
// the old defence modifiers: 驻军攻击 (defDmg) and 驻军生命 (garHp)
if (M.DIRS && M.DIRS.fort) Object.assign(M.DIRS.fort, { cats: [], styles: ['medieval'], t: '中世纪风格的建筑效果 +35%，驻军生命 +10%。', fn: (o, m, lv) => { o.garHp = (o.garHp || 0) + 0.1 * lv; } });
if (M.TALENTS && M.TALENTS.ballistics) Object.assign(M.TALENTS.ballistics, { n: '驻防术', d: (v) => '驻军攻击 +' + Math.round(v * 100) + '%。' });
if (M.REL_DOCTRINES && M.REL_DOCTRINES.potala) M.REL_DOCTRINES.potala.forEach(e => { if (e.base && e.base.defDmg) e.t = '驻军攻击 +' + Math.round(e.base.defDmg * 100) + '%。'; });
if (M.SHOPS && M.SHOPS.mercs) Object.assign(M.SHOPS.mercs, { d: '只卖优质以上的部队，价格贵一成。', pool: (k) => DB[k].q >= 1 });
if (M.SHOPS && M.SHOPS.slaver) Object.assign(M.SHOPS.slaver, { pool: (k) => DB[k].q >= 1 });

// ───────── what evolving may reach: runs, the garrison, shops, the pool ─────────
M.evoFind = function (run, hide) {
  const m = metaOf(run), g = {};
  (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d || !d.next || (hide && hide.has(u.uid)) || !M.evoOpen(m, u.type)) return; (g[u.type] = g[u.type] || []).push(u); });
  const k = Object.keys(g).find(t => g[t].length >= M.EVO_NEED);
  return k ? g[k].slice(0, M.EVO_NEED) : null;
};
// what shops and rewards hand out stays one tier below the vocation's cap: the top tier is only ever reached by evolving
// (user ruling 2026-09-26: 「前期只能进化到稀有的时候，我在游戏中竟然可以直接买到或者获得稀有单位，这就完全损失了进化乐趣」). With the
// cap at 稀有 that is 普通 and 优质; a vocation hall (cap 史诗) lets its 稀有 into the shops. A card above comes down, cheaper.
const capOf = (m, k) => { const d = DB[k]; return d && d.line && d.tier && m ? M.vocCap(m, d.voc) : 9; };
const buyCap = (m, k) => Math.max(1, capOf(m, k) - 1);
M.buyCap = buyCap;
const oUP = M.unitPool;
M.unitPool = function (run) { const L = oUP.apply(this, arguments), m = metaOf(run); if (!m || !run || !run.pool) return L; const out = L.filter(k => !DB[k] || !DB[k].tier || DB[k].tier <= buyCap(m, k)); return out.length ? out : L; };
const oRS = M.rollShop;
M.rollShop = function (run) {
  const r = oRS.apply(this, arguments), m = metaOf(run), sh = run && run.shop;
  if (m && sh && sh.units && !(run.region && run.region.tut)) sh.units.forEach(c => { const d = c && DB[c.type]; if (!d || !d.line || !d.tier) return; const cap = buyCap(m, c.type); if (d.tier <= cap) return; const k = M.lineKey(d.line, cap); if (!DB[k]) return; c.cost = Math.max(5, Math.round(c.cost * DB[k].cost / Math.max(1, d.cost))); c.type = k; c.q = DB[k].q; });
  return r;
};

// ───────── the garrison ─────────
M.GARRISON_CAP = 30;
// cleaned in place: the evolution (mc-evo.js) holds on to this very array while it plays; a fresh copy each call left it
// merging into a stale list, and the same three evolved again and again (2026-09-26 bug: 「局外3合1的时候，好像死循环了」)
const garOf = (m) => { if (!m) return []; if (!Array.isArray(m.garrison)) m.garrison = []; const g = m.garrison; for (let i = g.length - 1; i >= 0; i--) { const u = g[i]; if (!(u && typeof u === 'object' && DB[u.type])) g.splice(i, 1); } return g; };
M.garrisonOf = garOf;
M.garFix = function (m) {
  if (!m) return false; let ch = false;
  if (!Array.isArray(m.garrison)) { m.garrison = []; ch = true; }
  const n0 = m.garrison.length; garOf(m); if (m.garrison.length !== n0) ch = true;
  m.garrison.forEach(u => { if (!u.uid) { u.uid = M.rid(); ch = true; } });
  if (m.raidPending) { m.raidPending = null; ch = true; }
  if (!m.nightV) { m.nightV = 1; ch = true; }
  return ch;
};
// one unit comes home and stays (user ruling 2026-09-26: 「每次凯旋只能带回一只部队……带回来的那只部队应该是战斗力最高的3个里面玩家
// 自己选1个」): the army is copied for the homecoming (mc-parade.js), which lets the player pick among the three strongest and
// puts that one into the garrison; the run's roster goes with the run
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, m = this.meta;
  if (run && m && run.roster && run.roster.length) this._garIn = { n: 1, units: run.roster.map(u => Object.assign({}, u)) };
  return oWin.apply(this, arguments);
};
const garHost = (m) => ({ roster: garOf(m), M: m, garrison: true });
M.garHost = garHost;
// mark the step that turns the day (mc-home.js queues passDay last)
const oHQ = G.homeQueue;
G.homeQueue = function (steps) { (steps || []).forEach(s => { if (s && s.run && /passDay/.test(String(s.run))) s._day = 1; }); return oHQ.apply(this, arguments); };
// the homecoming: the parade of what came home after the haul (mc-parade.js), then three of a kind evolve one after the
// other — before the night comes
const oEB = G.endBack;
G.endBack = function () {
  const gi = this._garIn; this._garIn = null;
  const r = oEB.apply(this, arguments), m = this.meta;
  if (gi && m) {
    const steps = [{ run: () => { if (!(this.paradeStart && this.paradeStart(gi))) { const best = gi.units.slice().sort((a, b) => M.unitPower(b.type, b) - M.unitPower(a.type, a))[0]; if (best) garOf(m).push(Object.assign({}, best, { uid: M.rid(), mana: 0 })); this.pulse.mgar = now(); } }, until: () => !this.parade },
      { run: () => this.garEvo(), until: () => !this.evoFx && !this.garEvo() }];
    const q = this.homeQ;
    if (q && q.m === m) { const i = q.steps.findIndex(s => s && s._day); if (i >= 0) q.steps.splice(i, 0, ...steps); else q.steps.push(...steps); } else this.homeQueue(steps);
  }
  return r;
};
// start the next evolution in the garrison, if any (true: one started)
G.garEvo = function () {
  const m = this.meta; if (!m || this.evoFx || this.screen !== 'base') return false;
  const host = garHost(m), three = M.evoFind(host); if (!three) return false;
  this.evoStart(three, M.evoTarget(host, three[0].type), host); return true;
};

// ───────── the night ─────────
// how strong a night is (power, the measure of the map's fights), by the day; calibrated with tools/prog.js (docs/design.md
// §8.2): gentle while the garrison is two or three trips deep, then climbing with what evolving brings. Every fifth night a
// 强敌 (strong foe) comes with the monsters, every tenth a 首领 (a small boss by its own name) — user ruling 2026-09-26:
// 「每5天一个强敌来袭，每10天1个boss来袭，并且要加预警」. Such a night is stronger as a whole and the foe carries a share of
// it; the calendar marks it, the morning before and the morning of show a warning. A lost night costs three in ten of
// the fallen (half made one loss snowball into the next: 2026-09-26 growth sims).
M.NIGHT = { HIT: 0.6, LOSS: 0.3, T_MAX: 240, STRONG: 1.25, BOSS: 1.45, SHARE: { strong: [0.3, 0.1], boss: [0.4, 0.1] }, SLAM: 2.5, SLAM_R: 190, SLAM_CD: 7, SLAM_WIND: 1.3,
  CURVE: [[1, 120], [2, 210], [3, 340], [4, 460], [5, 720], [8, 1560], [10, 2200], [15, 4200], [20, 6600], [30, 11200]] };   // provisional ×0.4 (one unit a homecoming), fitted below   // 2026-09-26 on the base map: the battle-screen curve ×1.3 held 31 nights without a scratch, ×2.2 broke the main base by night 2–5
M.nightKind = (d) => (d > 0 && d % 10 === 0 ? 'boss' : d > 0 && d % 5 === 0 ? 'strong' : null);
M.bloodMoon = (d) => !!M.nightKind(d);   // older callers: "is this night a special one"
const NK = { strong: { n: '强敌来袭', c: '#ff7a3a', who: '强敌' }, boss: { n: '首领来袭', c: '#ff2a4a', who: '首领' } };
M.NIGHT_KIND = NK;
// who comes on such a night: rolled once, kept on the save so the warning and the night agree
const MB_NAME = {}; const mbNames = () => { if (!Object.keys(MB_NAME).length) Object.values(M.MINI_BOSSES || {}).forEach(a => a.forEach(([k, n]) => { if (DB[k]) MB_NAME[k] = n; })); return MB_NAME; };
M.nightFoe = function (m, d) {
  const k = M.nightKind(d); if (!k || !m) return null; mbNames();
  const F = m.nightFoes = (m.nightFoes && typeof m.nightFoes === 'object') ? m.nightFoes : {};
  let t = F[d];
  if (!t || !DB[t] || (k === 'boss' && !MB_NAME[t])) {
    if (k === 'boss') { const all = Object.keys(MB_NAME), seen = Object.values(F); const fresh = all.filter(x => !seen.includes(x)); t = (fresh.length ? fresh : all)[Math.floor(rnd() * (fresh.length || all.length))]; }
    else { const pool = (M.ENEMY_POOL || []).filter(x => DB[x] && (DB[x].q || 0) >= 2 && !DB[x].boss && !MB_NAME[x]); const top = pool.sort((a, b) => DB[b].hp - DB[a].hp).slice(0, 14); t = top.length ? top[Math.floor(rnd() * top.length)] : 'OgreEnemy'; }
    F[d] = t; Object.keys(F).forEach(x => { if (+x < (m.day || 1) - 10) delete F[x]; });
  }
  return { k, type: t, n: (k === 'boss' ? MB_NAME[t] : null) || DB[t].n, who: NK[k].who, title: NK[k].n, c: NK[k].c };
};
M.nightBase = (day) => { const C = M.NIGHT.CURVE; if (day <= C[0][0]) return C[0][1]; for (let i = 1; i < C.length; i++) if (day <= C[i][0]) { const [d0, p0] = C[i - 1], [d1, p1] = C[i]; return p0 + (p1 - p0) * (day - d0) / (d1 - d0); } const L = C[C.length - 1]; return L[1] + (day - L[0]) * 900; };
M.nightPower = (m) => { const d = Math.max(1, (m && m.day) || 1), k = M.nightKind(d); return Math.round(M.nightBase(d) * (k === 'boss' ? M.NIGHT.BOSS : k === 'strong' ? M.NIGHT.STRONG : 1) * (1 - ((m && m.raidWeak) || 0))); };
M.raidWaves = (m) => Math.min(4, 2 + Math.floor((((m && m.day) || 1) - 1) / 5));
const sideOf = (list) => list.reduce((s, x) => { const d = DB[x.type]; if (!d) return s; const k = x.elite ? 1.15 : 1; s.hp += d.hp * k * (x.hpMul || 1); s.dps += d.atk * k * (x.atkMul || 1) * (d.as || 100) / 100; return s; }, { hp: 0, dps: 0 });
M.makeRaidCfg = function (m) {
  const day = (m && m.day) || 1, target = M.nightPower(m), waves = M.raidWaves(m), list = [], foe = M.nightFoe(m, day);
  // the foe's share of the night's life and of its blows: a lot of the life, less of the blows (2026-09-26 night sims: a boss
  // with 40% of a day-20 night's damage broke every garrison, even one 1.3 times as strong as the night)
  const [hs, ds] = foe ? M.NIGHT.SHARE[foe.k] : [0, 0], rest = Math.sqrt((1 - hs) * (1 - ds));
  for (let i = 0; i < waves; i++) M.pickWave(Math.max(60, target * rest / waves), { elite: i === waves - 1 && day >= 4 }).forEach((e, j) => list.push(Object.assign(e, { spawn: i === 0 ? 0.1 + j * 0.05 : 1.6 + i * 11 + j * 0.35, y: 90 + rnd() * 540 })));
  const f = Math.max(0.05, target * rest / Math.max(1, M.powerOf(sideOf(list)))); list.forEach(s => { s.hpMul = +f.toFixed(3); s.atkMul = +f.toFixed(3); });
  if (foe) {
    const all = sideOf(list), d = DB[foe.type], dps = d.atk * 1.15 * (d.as || 100) / 100;
    list.push({ type: foe.type, elite: true, champ: foe.k, nm: foe.n, spawn: 1.6 + (waves - 1) * 11 + 3, y: 390, hpMul: +(all.hp * hs / (1 - hs) / (d.hp * 1.15)).toFixed(3), atkMul: +(all.dps * ds / (1 - ds) / dps).toFixed(3) });
  }
  list.sort((a, b) => a.spawn - b.spawn);
  return { mode: 'hold', w: 1 + day * 0.4, type: 'raid', list, dur: 9999, budget: target, raid: 1, night: target, foe };
};
// the garrison's modifiers as an expedition would have them: the leader's, the base's, the religion's, the 发展方向's
// the field: the town outside the main base at night (the backdrop draws a town's roofs for a name with 小镇)
const NIGHT_R = () => Object.assign({}, (M.WORLDS && M.WORLDS.town) || {}, { n: '小镇 · 混沌来袭', diff: 1, tut: false, final: false, loot: 1, bg: '#0c0a1c', road: '#2a2438', tile: '#16122a', light: '#ff8a6a', grade: ['#b0a0d0', '#0c0a1c'] });
function raidRun(m) {
  const h = m.heroes[0], mods = M.heroMods(h, m), bm = M.baseMods(m);
  mods.unitHp = (mods.unitHp || 0) + (bm.garHp || 0); mods.unitAtk = (mods.unitAtk || 0) + (bm.defDmg || 0);
  if (m.rel && M.relDoc) (m.rel.picks || []).forEach(p => { const d = M.relDoc(p); if (d && d.run) Object.keys(d.run).forEach(k => { mods[k] = (mods[k] || 0) + d.run[k]; }); });
  if (M.vocFromBase) M.vocFromBase(mods, m);   // 发展方向's vocation bonuses (mc-roster.js)
  const run = { raid: true, M: m, hero: h, mods, regionKey: 'night', region: NIGHT_R(), len: { n: '混沌来袭', cols: 1 }, roster: garOf(m), legion: {}, runBuff: {}, items: [null, null, null], itemQ: [0, 0, 0], wallet: 0,
    loot: { supplies: 0, bp: [], exp: 0, faith: 0 }, startMult: 0, lootMul: 1, battles: 0, kills: 0, skillCd: 0, steps: 0, meta: { unlocked: [], perks: {} }, map: { nodes: [], cols: 1 }, vision: 2, lvl0: 1, lvlStep: 0.1, shop: [], lastP: 1, field: null };
  return run;
}
M.raidRun = raidRun;
M.garrisonPower = (m) => { if (!m || !m.heroes || !m.heroes.length || !garOf(m).length) return 0; const r = raidRun(m); r.hero = null; return M.powerOf(M.sideA(r)); };
M.nextRaid = (m) => m.day;
M.raidOddsLine = (m) => { const e = M.nightPower(m), a = M.garrisonPower(m); return { t: '今晚敌军 ★' + e + ' · 驻军 ★' + a, c: a ? M.oddsCol(a, e) : '#ff6a5a' }; };
// the night comes before the day turns: a passDay first plays the night, then turns the day
const nightDue = (m) => !!(m && m.tutDone && m.heroes && m.heroes.length && m.lastRaid !== m.day);
const oPass = G.passDay;
G.passDay = function () {
  const m = this.meta;
  if (!m || this.raidPrep) return oPass.apply(this, arguments);
  if (nightDue(m)) { this.nightFall(); return []; }
  // a visitor comes in the morning and leaves the day as it was: the expedition still goes out, the night comes after it
  // (user ruling 2026-09-26: 「事件结束后还是继续去探索，探索完，才进入晚上，事件不自动推进时间了」)
  return oPass.apply(this, arguments);
};
G.restDay = function () { if (this.homeQ || this.night) return; this.closePanel && this.closePanel(); this.passDay(); };
G.checkRaid = function () { return false; };   // the old every-five-days siege (M.Raid) is gone
G.startRaid = function () { const m = this.meta; if (m) m.raidPending = null; this.raidPrep = null; };
G.nightFall = function () {
  const m = this.meta; if (!m || this.night) return;
  this.panel = null;
  const g = garOf(m); S.alarm && S.alarm();
  this.night = { t: 0, day: m.day, ph: 'dusk', at: 1.4 };
  const foe = M.nightFoe(m, m.day);
  this.banner && this.banner({ kind: 'win', text: foe ? foe.title + '！' : '混沌来袭！', col: foe ? foe.c : '#ff5a4a', col2: '#6a0a0a', sub: foe ? foe.who + ' · ' + foe.n + ' 带着怪物攻城' : g.length ? '第 ' + m.day + ' 天夜里 · 驻军 ' + g.length + ' 支迎敌' : '没有驻军：只有领袖在屋顶', life: foe ? 2 : 1.6, y: 440 });
  if (this.bv && this.bv.home) this.bv.home();
  this.bump();
};
// the fight is on the base map (user ruling 2026-09-26: 「混沌来袭，是要在基地地图上战斗，不是切成局内的那种战斗方式」「英雄站在
// 基地上进行远程攻击」): the town siege (mc-siege.js) with the garrison as the defenders in front of the main base and the
// leader shooting from its roof; the monsters are the night's (makeRaidCfg), coming in from both ends of the town
const DOOR_X = M.BASE_GEO.DOOR_X, MB = M.MAIN_BASE, Siege = M.Raid;
const RANGED_V = { 射手: 1, 法师: 1, 牧师: 1, 祭司: 1, 召唤师: 1 };
M.NightRaid = class extends Siege {
  constructor(meta) {
    super(meta);
    this.night = 1; this.mbBows = []; this.bell = 0;
    const run = raidRun(meta), md = run.mods;
    garOf(meta).forEach((u, i) => {
      const d = DB[u.type]; if (!d) return; const V = M.vocMods(md, d), ek = u.ek || 1, side = i % 2 ? 1 : -1, k = Math.floor(i / 2), ranged = d.ranged === 1 || !!RANGED_V[d.voc];
      const hp = (d.hp + (u.bHp || 0)) * ek * (1 + (md.unitHp || 0) + V.hp), atk = (d.atk + (u.bAtk || 0)) * ek * (1 + (md.unitAtk || 0) + V.atk);
      const home = DOOR_X + side * (MB.w / 2 + (ranged ? 50 : 150) + (k % 6) * 40);
      this.ents.push({ side: 'A', guard: 1, gar: u.uid, sprite: u.type, s: 4, x: home, home, home0: home, y: -18 - (k % 3) * 10, hp, max: hp, atk, cd: 100 / Math.max(20, (d.as || 100) * (1 + V.as)), range: ranged ? 320 : 70, spd: 170, ranged, t: Math.random() * 0.5, alive: true, face: -side });
    });
    const h = meta.heroes[0], H = h && M.HEROES[h.cls];
    this.roof = h && H ? { x: DOOR_X, y: MB.top - 70, dmg: M.heroAtk(h, meta) * M.NIGHT.ROOF, cd: H.cd || 1, range: M.NIGHT.ROOF_R, t: 0.6 } : null;
    const cfg = M.makeRaidCfg(meta);
    this.list = cfg.list.map((x, i) => ({ t: 1 + x.spawn * 1.2, type: x.type, elite: x.elite, champ: x.champ, nm: x.nm, hpMul: x.hpMul, atkMul: x.atkMul, side: x.champ ? (rnd() < 0.5 ? -1 : 1) : i % 2 ? 1 : -1 })).sort((a, b) => a.t - b.t);
    this.spawnI = 0; this.total = this.list.length; this.target = cfg.night; this.foe = cfg.foe; this.zones = [];
  }
  // the garrison sees the whole field (user ruling 2026-09-26: 「每个单位的警戒范围……应该都是全屏才对」): the nearest monster on
  // its own side of the main base, else the nearest anywhere
  guardTarget(e, foes) {
    if (!e.gar) return null; const mine = (e.home0 == null ? e.home : e.home0) < DOOR_X; let best = null, bd = 1e9, any = null, ad = 1e9;
    for (const o of foes) { const d = Math.abs(o.x - e.x); if (d < ad) { ad = d; any = o; } if ((o.x < DOOR_X) === mine && d < bd) { bd = d; best = o; } }
    return best || any;
  }
  spawn(x) {
    const d = DB[x.type]; if (!d) return; const k = x.elite ? 1.15 : 1, hp = d.hp * k * (x.hpMul || 1), boss = x.champ === 'boss';
    const e = { side: 'E', kind: x.type, sprite: x.type, s: boss ? 8 : x.champ ? 6.5 : x.elite ? 5 : 4, x: x.side < 0 ? this.edgeL - 420 - Math.random() * 80 : this.edgeR + 420 + Math.random() * 80, y: x.champ ? -12 : -18 - Math.random() * 16,
      hp, max: hp, atk: d.atk * k * (x.atkMul || 1), cd: 100 / Math.max(20, d.as || 100), range: d.ranged === 1 ? 260 : boss ? 110 : 80, spd: x.champ ? 80 : 95 + Math.random() * 30, ranged: d.ranged === 1 && !boss, t: Math.random(), alive: true, face: -x.side, elite: !!x.elite };
    if (x.champ) {
      Object.assign(e, { champ: x.champ, boss, nm: x.nm || d.n, slamAt: this.t + 4 });
      const K = NK[x.champ]; this.champ = e; this.shake = Math.max(this.shake, boss ? 22 : 14); S.alarm && S.alarm(); S.impact && S.impact();
      this.float(e.x > DOOR_X ? e.x - 700 : e.x + 700, -520, K.who + ' · ' + e.nm, K.c, boss ? 60 : 48);
    }
    this.ents.push(e);
  }
  // a boss's 砸地: only when something of ours already stands where it would land (user ruling 2026-09-26: 「这个技能的释放条件
  // 是，已经有敌人进入攻击范围了，否则放空技能太傻了」); a red mark fills on the ground, then only what is inside it is hit
  slamTick(e) {
    const T = this.t, N = M.NIGHT, R = N.SLAM_R;
    if (e.wind) {
      const w = e.wind; if (T < w.until) return; e.wind = null; e.slamAt = T + N.SLAM_CD; this.zones = this.zones.filter(z => z !== w);
      const dmg = e.atk * N.SLAM; let n = 0;
      this.ents.forEach(o => { if (o.alive && o.side === 'A' && Math.abs(o.x - w.x) < R) { this.damage(o, dmg, '#ff6a6a'); n++; } });
      Object.values(this.bld).forEach(b => { if (b.hp > 0 && Math.abs(b.x - w.x) < R + b.w / 2) this.hitBld(b, dmg * M.SIEGE_K.bldAtk); });
      if (Math.abs(DOOR_X - w.x) < R + MB.w / 2) this.hitPortal(dmg * M.SIEGE_K.bldAtk);
      this.fx.push({ k: 'boom', x: w.x, y: -20, r: R, t0: T, life: 0.5 }); this.shake = Math.max(this.shake, 20); e.lunge = T; S.boom && S.boom(); S.impact && S.impact();
      for (let i = 0; i < 16; i++) { const a = -Math.PI * Math.random(), v = 200 + Math.random() * 360; this.fx.push({ k: 'pt', x: w.x + (Math.random() - 0.5) * R, y: -10, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: i % 2 ? '#8a6a50' : '#ffd0a0', t0: T, life: 0.7 }); }
      return;
    }
    if (T < e.slamAt || e.stun > 0) return;
    const dir = Math.sign(DOOR_X - e.x) || 1, cx = e.x + dir * (R * 0.8);
    const some = this.ents.some(o => o.alive && o.side === 'A' && Math.abs(o.x - cx) < R) || Object.values(this.bld).some(b => b.hp > 0 && Math.abs(b.x - cx) < R + b.w / 2) || Math.abs(DOOR_X - cx) < R + MB.w / 2;
    if (!some) { e.slamAt = T + 0.3; return; }
    const w = { x: cx, t0: T, until: T + N.SLAM_WIND }; e.wind = w; e.stun = N.SLAM_WIND; e.face = dir; this.zones.push(w);
    this.float(e.x, e.y - 260, '砸地', '#ff5a4a', 40); S.bossWind ? S.bossWind('slam') : S.alarm && S.alarm();
  }
  step(dt) {
    // a side with no monsters left sends its garrison to the other side (user ruling 2026-09-26: 「一边敌人被清干净后，应该去帮
    // 另外一边防守」); when monsters come again on its own side, it goes back
    if (!this.over) { let l = 0, r = 0; for (const e of this.ents) if (e.alive && e.side === 'E') { if (e.x < DOOR_X) l++; else r++; }
      for (const e of this.ents) { if (!e.alive || !e.gar || e.home0 == null) continue; const left = e.home0 < DOOR_X, mine = left ? l : r, other = left ? r : l; e.home = !mine && other ? 2 * DOOR_X - e.home0 : e.home0; } }
    super.step(dt);
    if (!this.over) this.ents.forEach(e => { if (e.boss && e.champ && e.alive) this.slamTick(e); else if (e.wind && !e.alive) { this.zones = this.zones.filter(z => z !== e.wind); e.wind = null; } });
    const R = this.roof; if (!R || this.over) return;
    R.t -= dt; if (R.t > 0) return;
    const tg = this.ents.filter(o => o.alive && o.side === 'E' && Math.abs(o.x - R.x) <= R.range).sort((a, b) => Math.abs(a.x - DOOR_X) - Math.abs(b.x - DOOR_X))[0];
    if (!tg) return; R.t = R.cd; R.fireT = this.t; this.proj.push({ k: 'bolt', x: R.x, y: R.y, tg, dmg: R.dmg, col: '#ffcf4a', speed: 1600 }); S.shoot && S.shoot();
  }
  // the boss's marks on the ground, under everything
  draw(ctx, lights) {
    const T = this.t;
    (this.zones || []).forEach(w => { const q = cl((T - w.t0) / (w.until - w.t0), 0, 1), R = M.NIGHT.SLAM_R; ctx.save(); ctx.globalAlpha = 0.22 + 0.2 * q; ctx.fillStyle = '#ff3a3a'; ctx.beginPath(); ctx.ellipse(w.x, -6, R * q, 26 * q, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(w.x, -6, R, 26, 0, 0, 7); ctx.stroke(); ctx.restore(); lights && lights.push({ x: w.x, y: -10, r: R * 1.2, c: '#ff3a3a', f: 0.5 + 0.5 * q }); });
    return super.draw(ctx, lights);
  }
  drawHud(ctx) {
    const U = M.UI, PP = M.PJ.PAL; if (!U) return; ctx.setTransform(1, 0, 0, 1, 0, 0);
    const left = this.total - this.spawnI + this.ents.filter(e => e.alive && e.side === 'E').length, gar = this.ents.filter(e => e.alive && e.side === 'A').length, K = this.foe && NK[this.foe.k];
    U.plate(ctx, 610, 110, 700, 104, { ring: K ? K.c : PP.red });
    U.text(ctx, (K ? K.n : '混沌来袭') + ' · 第 ' + this.meta.day + ' 夜', 960, 146, U.T.title, K ? K.c : PP.red, { outline: true });
    U.text(ctx, '剩余敌人 ' + left + '　·　驻军 ' + gar + '　·　主基地 ' + Math.max(0, Math.round(this.portal.hp)) + ' / ' + this.portal.max, 960, 190, U.T.body, PP.cream);
    // the foe's own bar under the plate, once it is on the field
    const e = this.champ; if (e && e.alive) { const W = 700, X = 610, Y = 238, k = cl(e.hp / e.max, 0, 1); U.text(ctx, K.who + ' · ' + e.nm, 960, Y - 4, U.T.body, K.c, { outline: true }); U.R(ctx, X - 4, Y + 16, W + 8, 26, PP.ink); U.R(ctx, X, Y + 20, W, 18, PP.abyss); U.R(ctx, X, Y + 20, W * k, 18, PP.red); U.R(ctx, X, Y + 20, W * k, 4, PP.pink); }
  }
};
// 午夜钟楼: a boss stands still for a moment at the start of an expedition's boss fight
const oInitB = BP.init;
BP.init = function (run) {
  const r = oInitB.apply(this, arguments), st = run && run.M && !(run.region && run.region.tut) ? M.baseMods(run.M).bossStun || 0 : 0;
  if (st) this.later((this.fightT0 || 0) + 0.05, () => this.ents.forEach(e => { if (e.alive && e.side === 'E' && e.boss) { e.stun = Math.max(e.stun || 0, st); this.float && this.float(e.x, e.y - 120, '钟声 · 停顿', '#ffcf4a', 28); } }));
  return r;
};
// the leader's shot from the roof hits like a heavy crossbow; its reach covers the ground in front of the town
Object.assign(M.NIGHT, { ROOF: 1.5, ROOF_R: 1000 });
// monsters that reach the main base hit it at half strength: a night lost to a thin garrison hurts, it does not end the
// game at once (2026-09-26 sims: the base fell in 40 s on night 2 with three units out)
if (M.SIEGE_K) M.SIEGE_K.bldAtk = 0.5;
G.nightTick = function (dt) {
  const N = this.night, m = this.meta; if (!N || !m) return;
  N.t += dt || 0;
  if (N.ph === 'dusk' && N.t >= N.at && this.screen === 'base') { N.ph = 'fight'; this.panel = null; this.coachData = null; this.bv.raidCam && this.bv.raidCam(); this.raid = new M.NightRaid(m); this.go('raid'); return; }
  if (N.ph === 'after' && N.t >= N.at && this.screen === 'base') this.nightOver();
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); if (this.night) this.nightTick(dt || 0); return r; };
// the end: the main base stood (the fallen garrison gets up again) or it fell (the game is over)
const oRE = G.raidEnd;
G.raidEnd = function () {
  const r = this.raid; if (!(r && r.night)) return oRE.apply(this, arguments);
  const m = this.meta, N = this.night || (this.night = { t: 0, day: m.day }), won = r.over === 'win';
  r.done = true; m.portal.hp = Math.max(0, Math.round(r.portal.hp)); m.lastRaid = m.day; m.raids = (m.raids || 0) + 1; m.raidWeak = 0; m.st = m.st || {};
  const fell = r.ents.filter(e => e.side === 'A' && e.gar && !e.alive).length;
  let sup = 0; const sh = Math.round((r.kills || 0) * 1.2);
  if (won) { m.st.raidsWon = (m.st.raidsWon || 0) + 1; sup = Math.round(30 + m.day * 10); m.supplies += sup; if (m.day >= 15 && this.prof) { (this.prof.stats || (this.prof.stats = {})).raid15 = 1; this.saveProfile && this.saveProfile(); } this.achCheck2 && this.achCheck2(); }
  m.shards += sh;
  N.res = { won, dmg: Math.round(r.portal.max - r.portal.hp), portal: +(Math.max(0, r.portal.hp) / Math.max(1, r.portal.max)).toFixed(2), sup, sh, kills: r.kills || 0, fell, secs: Math.round(r.t) };
  this.save();
  try { M.T && M.T.ev('night', { day: m.day, won, kills: r.kills || 0, fell, gar: garOf(m).length, portal: N.res.portal, secs: N.res.secs }); } catch (e) {}
  if (won) { this.banner({ kind: 'win', text: '守住了！', col: '#ffd970', life: 2.2, y: 440, sub: '击退 ' + (r.kills || 0) + ' 个敌人 · 物资 +' + sup + (sh ? ' · 灵魂碎片 +' + sh : '') }); S.fanfare && S.fanfare(); this.fx.confetti && this.fx.confetti(100); }
  else { this.banner({ kind: 'win', text: '主基地被攻破', col: '#ff4a4a', col2: '#3a0000', life: 2.4, y: 440 }); S.lose && S.lose(); }
  setTimeout(() => { if (this.raid !== r) return; this.raid = null; this.go('base'); this.bv.home(); N.ph = 'after'; N.at = N.t + 0.4; this.bump(); }, 2200);
};
G.nightOver = function () {
  const m = this.meta; this.night = null;
  if (m && m.portal.hp <= 0) { this.overSum = '第 ' + m.day + ' 天夜里，混沌冲垮了主基地。'; this.go('over'); return; }
  this.passDay();
};
// nothing starts on the base while the night plays
const oBusy = G.baseBusy;
G.baseBusy = function () { if (this.night && this.screen === 'base') return true; return oBusy.apply(this, arguments); };
['openWorlds', 'steleDrop', 'pickWorld', 'launch'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { if (this.night) return; return o.apply(this, arguments); }; });
const oNG = G.newGame; if (oNG) G.newGame = function () { this.night = null; this._garIn = null; return oNG.apply(this, arguments); };

// ───────── the base shows it: the garrison on the bar, tonight's raid ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (v.b && v.b.res && m && m.tutDone) {
    const g = garOf(m);
    v.b.res.push({ img: M.iconURL ? M.iconURL('t_shield', 2) : M.spriteURL('sack', 4), v: this.tv('mgar', g.length), c: '#ffcf4a', fx: 'mgar', sc: this.ps('mgar'), hasSub: true, sub: '/' + M.GARRISON_CAP, tipOn: this.tipFn(() => this.tipFor('b-gar')) });
  }
  // the garrison beside the leader's card (user ruling 2026-09-26: 「现在基地中有哪些部队，要跟英雄头像显示在一排」): one tile a kind, best first
  if (v.b && m && m.tutDone) { const c = {}; garOf(m).forEach(u => { c[u.type] = (c[u.type] || 0) + 1; });
    v.b.gar = Object.keys(c).sort((a, b) => DB[b].q - DB[a].q || c[b] - c[a]).slice(0, 16).map(k => ({ img: M.spriteURL(k, 3), c: Q[DB[k].q].c, n: c[k], nOn: c[k] > 1, tipOn: this.tipFn(() => { const t = M.unitTip ? M.unitTip(k, null, null) : { title: DB[k].n }; return Object.assign({}, t, { title: (t.title || DB[k].n) + (c[k] > 1 ? ' ×' + c[k] : ''), c: Q[DB[k].q].c }); }) })); }
  if (v.b && m) { const k = M.nightKind(m.day), k2 = M.nightKind(m.day + 1); v.b.raidTxt = k ? '今晚' + NK[k].n : k2 ? '明晚' + NK[k2].n : '今晚混沌来袭'; v.b.raidC = k ? NK[k].c : '#ff5a4a'; v.raidTip = this.tipFn(() => this.tipFor('b-raid')); }
  // the fight's own bar: what this night is and how many are still coming
  const b = this.battle; if (v.h && b && this.run && this.run.raid) { let left = b.cfg.list.length - b.spawnI; b.ents.forEach(e => { if (e.alive && e.side === 'E') left++; }); v.h.mode = '混沌来袭'; v.h.modeColor = '#ff5a4a'; v.h.goal = '击退怪物 · 还剩 ' + left + ' 个'; }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  const m = this.meta;
  if (key === 'b-mode' && this.run && this.run.raid) return { title: '混沌来袭', c: '#ff6a5a', d: '击退所有怪物就守住了；驻军全灭，剩下的怪物打主基地。' };
  if (key === 'b-raid' && m) { const f = M.nightFoe(m, m.day); return { title: f ? '今晚' + f.title : '混沌来袭', c: f ? f.c : '#ff6a5a', d: f ? f.who + '「' + f.n + '」今晚带着怪物攻城。' : '每天夜里怪物攻打主基地，驻军迎敌。', lines: [M.raidOddsLine(m), { t: '主基地耐久 ' + Math.round(m.portal.hp) + ' / ' + M.portalMax(m), c: '#e8dcc4' }] }; }
  if (key === 'b-gar' && m) {
    const g = garOf(m), c = {}; g.forEach(u => { c[u.type] = (c[u.type] || 0) + 1; }); const ks = Object.keys(c).sort((a, b) => DB[b].q - DB[a].q || c[b] - c[a]);
    return { title: '驻军 ' + g.length + ' / ' + M.GARRISON_CAP + ' · ★' + M.garrisonPower(m), c: '#ffcf4a', d: g.length ? '出征带回来的部队，每天夜里守城。' : '出征回来的部队会留下守城。',
      lines: ks.slice(0, 10).map(k => ({ rich: [{ t: DB[k].n + (c[k] > 1 ? ' ×' + c[k] : ''), c: Q[DB[k].q].c, b: 1 }] })).concat(ks.length > 10 ? [{ t: '还有 ' + (ks.length - 10) + ' 种', c: '#a9a3c9' }] : []) };
  }
  return oTip.apply(this, arguments);
};
// the warning (预警): the morning before such a night and the morning of it, once the day has settled
const oTickW = G.tick;
G.tick = function (dt) {
  const r = oTickW.apply(this, arguments), m = this.meta;
  if (m && m.tutDone && m.warnD !== m.day && this.screen === 'base' && !this.night && !this.raid && !this.tlFx && !this.homeQ && !this.modal && !this.evoFx && !this.lvFx && !this.coreFx && !this.coreQueue && !this.guide && !(m.tlWin != null && M.tlWinStart && M.tlWinStart(m) > m.tlWin)) {
    m.warnD = m.day; const now_ = M.nightFoe(m, m.day), next = !now_ && M.nightFoe(m, m.day + 1), f = now_ || next;
    if (f) { this.banner && this.banner({ kind: 'win', text: '预警 · ' + (now_ ? '今晚' : '明晚') + f.title, col: f.c, col2: '#3a0000', sub: f.who + ' · ' + f.n, life: 2.2, y: 440 }); S.alarm && S.alarm(); this.save && this.save(); }
  }
  return r;
};
// the save check knows the garrison
const oTickF = G.tick;
G.tick = function (dt) { const m = this.meta; if (m && !m.nightV && M.garFix(m) && this.save) this.save(); return oTickF.apply(this, arguments); };

// ───────── words that still spoke of towers and walls ─────────
if (M.GUIDE) {
  const G2 = M.GUIDE;
  G2.push(
    { id: 'garrison', cat: '基地', icon: 't_shield', title: '驻军', line: '每趟出征最后带回一支部队，留在基地守夜，不再出征；三支相同的也会进化。', scr: 'base', sel: '[data-fx="mgar"]' },
    { id: 'evobld', cat: '基地', icon: 'u_star', title: '进化建筑', line: '每座让一个职业的进化上限提高一档：一座到史诗，两座到传说；同一种只能建一座。', scr: 'base', sel: '[data-g="bld"]' });
}
})();

;
