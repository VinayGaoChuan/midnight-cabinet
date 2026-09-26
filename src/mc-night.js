// ==== mc-night.js ====
(function () {
// Day and night, the garrison, and the over-limit evolution buildings (user rulings 2026-09-26):
//   「白天探索，晚上防守，也就是每天晚上都会有混沌来袭。如果白天有事件，就相当于白天不能探索，触发事件，然后就进入黑夜防守」
//   「防守主要靠玩家带出来的部队，所以，把所有防守类建筑要么删除，要么改成别的类型。并且处理一遍所有建筑，所有基地建筑都要
//    为探索服务，而探索带回战力，防守基地，要做好内外联系」 · 「只把单位带出，探索的时候不会再带入」
//   「合成默认能合到稀有，史诗，传说，神话都需要局外的建筑的超限合成解锁。而且超限解锁建筑，应该是唯一的。例如法师塔，法师职业
//    可以超限进化1次。这种建筑同一种只能建造一次，要想超限进化第二次，就需要建不同种类的类似建筑」
// · The day: explore (or a visitor comes and takes the day, or rest) → the night: 混沌来袭 → the next day. Every night.
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
if (M.SHOPS && M.SHOPS.mercs) Object.assign(M.SHOPS.mercs, { d: '只卖稀有以上的部队，价格贵一成。', pool: (k) => DB[k].q >= 2 && DB[k].q <= 4 });

// ───────── what evolving may reach: runs, the garrison, shops, the pool ─────────
M.evoFind = function (run, hide) {
  const m = metaOf(run), g = {};
  (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d || !d.next || (hide && hide.has(u.uid)) || !M.evoOpen(m, u.type)) return; (g[u.type] = g[u.type] || []).push(u); });
  const k = Object.keys(g).find(t => g[t].length >= M.EVO_NEED);
  return k ? g[k].slice(0, M.EVO_NEED) : null;
};
// no tier above the vocation's cap in the pool; a shop card above it comes down to the cap, at the lower price
const capOf = (m, k) => { const d = DB[k]; return d && d.line && d.tier && m ? M.vocCap(m, d.voc) : 9; };
const oUP = M.unitPool;
M.unitPool = function (run) { const L = oUP.apply(this, arguments), m = metaOf(run); if (!m || !run || !run.pool) return L; const out = L.filter(k => !DB[k] || !DB[k].tier || DB[k].tier <= capOf(m, k)); return out.length ? out : L; };
const oRS = M.rollShop;
M.rollShop = function (run) {
  const r = oRS.apply(this, arguments), m = metaOf(run), sh = run && run.shop;
  if (m && sh && sh.units && !(run.region && run.region.tut)) sh.units.forEach(c => { const d = c && DB[c.type]; if (!d || !d.line || !d.tier) return; const cap = capOf(m, c.type); if (d.tier <= cap) return; const k = M.lineKey(d.line, cap); if (!DB[k]) return; c.cost = Math.max(5, Math.round(c.cost * DB[k].cost / Math.max(1, d.cost))); c.type = k; c.q = DB[k].q; });
  return r;
};

// ───────── the garrison ─────────
M.GARRISON_CAP = 30;
const garOf = (m) => { if (!m) return []; if (!Array.isArray(m.garrison)) m.garrison = []; m.garrison = m.garrison.filter(u => u && typeof u === 'object' && DB[u.type]); return m.garrison; };
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
// the army that comes home stays (copies: the run's roster goes with the run)
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, m = this.meta;
  if (run && m && run.roster && run.roster.length) {
    const g = garOf(m), n = run.roster.length; let out = null;
    run.roster.forEach(u => g.push(Object.assign({}, u, { uid: M.rid(), mana: 0 })));
    if (g.length > M.GARRISON_CAP) { g.sort((a, b) => M.unitPower(b.type, b) - M.unitPower(a.type, a)); const gone = g.splice(M.GARRISON_CAP), sup = gone.reduce((a, u) => a + Math.round(((DB[u.type] && DB[u.type].cost) || 10) * 0.3), 0); m.supplies += sup; out = { n: gone.length, sup }; }
    this._garIn = { n, out };
  }
  return oWin.apply(this, arguments);
};
const garHost = (m) => ({ roster: garOf(m), M: m, garrison: true });
M.garHost = garHost;
// mark the step that turns the day (mc-home.js queues passDay last)
const oHQ = G.homeQueue;
G.homeQueue = function (steps) { (steps || []).forEach(s => { if (s && s.run && /passDay/.test(String(s.run))) s._day = 1; }); return oHQ.apply(this, arguments); };
// the homecoming: 驻军 +N after the haul, then three of a kind evolve one after the other — before the night comes
const oEB = G.endBack;
G.endBack = function () {
  const gi = this._garIn; this._garIn = null;
  const r = oEB.apply(this, arguments), m = this.meta;
  if (gi && m) {
    const steps = [{ run: () => { const p = this.fxPos('mgar') || { x: 700, y: 50 }; this.fx.pop(p.x, p.y + 70, '驻军 +' + gi.n, '#ffcf4a', 40, { rise: 40 }); this.fx.burst && this.fx.burst(p.x, p.y, '#ffcf4a', 16); this.pulse.mgar = now(); S.up && S.up(2); if (gi.out) this.toast('驻军满了：' + gi.out.n + ' 支最弱的部队离开，物资 +' + gi.out.sup, '#caa84a'); }, wait: 0.8 },
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
// §8.2): gentle while the garrison is two or three trips deep, then climbing with what evolving brings. The last night of
// every five days is a 血月 (blood moon): 35% stronger, always with an elite, marked on the calendar. A lost night costs
// three in ten of the fallen (half made one loss snowball into the next: 2026-09-26 growth sims).
M.NIGHT = { HIT: 0.6, LOSS: 0.3, T_MAX: 240, MOON: 1.35, CURVE: [[1, 300], [3, 800], [5, 1600], [8, 3200], [10, 4600], [15, 8500], [20, 13000], [30, 22000]] };
M.bloodMoon = (d) => d > 0 && d % 5 === 0;
M.nightBase = (day) => { const C = M.NIGHT.CURVE; if (day <= C[0][0]) return C[0][1]; for (let i = 1; i < C.length; i++) if (day <= C[i][0]) { const [d0, p0] = C[i - 1], [d1, p1] = C[i]; return p0 + (p1 - p0) * (day - d0) / (d1 - d0); } const L = C[C.length - 1]; return L[1] + (day - L[0]) * 900; };
M.nightPower = (m) => { const d = Math.max(1, (m && m.day) || 1); return Math.round(M.nightBase(d) * (M.bloodMoon(d) ? M.NIGHT.MOON : 1) * (1 - ((m && m.raidWeak) || 0))); };
M.raidWaves = (m) => Math.min(4, 2 + Math.floor((((m && m.day) || 1) - 1) / 5));
const sideOf = (list) => list.reduce((s, x) => { const d = DB[x.type]; if (!d) return s; const k = x.elite ? 1.15 : 1; s.hp += d.hp * k * (x.hpMul || 1); s.dps += d.atk * k * (x.atkMul || 1) * (d.as || 100) / 100; return s; }, { hp: 0, dps: 0 });
M.makeRaidCfg = function (m) {
  const day = (m && m.day) || 1, target = M.nightPower(m), waves = M.raidWaves(m), list = [];
  for (let i = 0; i < waves; i++) M.pickWave(Math.max(60, target / waves), { elite: i === waves - 1 && (day >= 4 || M.bloodMoon(day)) }).forEach((e, j) => list.push(Object.assign(e, { spawn: i === 0 ? 0.1 + j * 0.05 : 1.6 + i * 11 + j * 0.35, y: 90 + rnd() * 540 })));
  const f = Math.max(0.05, target / Math.max(1, M.powerOf(sideOf(list)))); list.forEach(s => { s.hpMul = +f.toFixed(3); s.atkMul = +f.toFixed(3); });
  list.sort((a, b) => a.spawn - b.spawn);
  return { mode: 'hold', w: 1 + day * 0.4, type: 'raid', list, dur: 9999, budget: target, raid: 1, night: target };
};
const oCfg = M.makeBattleCfg;
M.makeBattleCfg = function (run, node) { if (run && run.raid && node && node.type === 'raid') return M.makeRaidCfg(run.M); return oCfg.apply(this, arguments); };
// an expedition-like frame for the battle: the leader (on the roof), the garrison, what the base gives the garrison
// the field: the town outside the main base at night (the backdrop draws a town's roofs for a name with 小镇)
const NIGHT_R = () => Object.assign({}, (M.WORLDS && M.WORLDS.town) || {}, { n: '小镇 · 混沌来袭', diff: 1, tut: false, final: false, loot: 1, bg: '#0c0a1c', road: '#2a2438', tile: '#16122a', light: '#ff8a6a', grade: ['#b0a0d0', '#0c0a1c'] });
function raidRun(m) {
  const h = m.heroes[0], mods = M.heroMods(h, m), bm = M.baseMods(m);
  mods.unitHp = (mods.unitHp || 0) + (bm.garHp || 0); mods.unitAtk = (mods.unitAtk || 0) + (bm.defDmg || 0);
  if (m.rel && M.relDoc) (m.rel.picks || []).forEach(p => { const d = M.relDoc(p); if (d && d.run) Object.keys(d.run).forEach(k => { mods[k] = (mods[k] || 0) + d.run[k]; }); });
  return { raid: true, M: m, hero: h, mods, regionKey: 'night', region: NIGHT_R(), len: { n: '混沌来袭', cols: 1 }, roster: garOf(m), legion: {}, runBuff: {}, items: [null, null, null], itemQ: [0, 0, 0], wallet: 0,
    loot: { supplies: 0, bp: [], exp: 0, faith: 0 }, startMult: 0, lootMul: 1, battles: 0, kills: 0, skillCd: 0, steps: 0, meta: { unlocked: [], perks: {} }, map: { nodes: [], cols: 1 }, vision: 2, lvl0: 1, lvlStep: 0.1, shop: [], lastP: 1, field: null };
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
  const logs = oPass.apply(this, arguments);
  // a visitor on the new day takes the day: after it, the night, then the next day
  const k = M.eventOn(m, m.day); if (k && k !== 'raid') this.homeQueue([{ run: () => this.passDay(), until: () => !this.night }]);
  return logs;
};
G.restDay = function () { if (this.homeQ || this.night) return; this.closePanel && this.closePanel(); this.passDay(); };
G.checkRaid = function () { return false; };   // the old every-five-days siege (M.Raid) is gone
G.startRaid = function () { const m = this.meta; if (m) m.raidPending = null; this.raidPrep = null; };
G.nightFall = function () {
  const m = this.meta; if (!m || this.night) return;
  this.panel = null;
  const g = garOf(m); S.alarm && S.alarm();
  this.night = { t: 0, day: m.day, ph: g.length ? 'dusk' : 'empty', at: 1.4 };
  const moon = M.bloodMoon(m.day);
  this.banner && this.banner({ kind: 'win', text: moon ? '血月之夜！' : '混沌来袭！', col: '#ff5a4a', col2: '#6a0a0a', sub: g.length ? '第 ' + m.day + ' 天夜里 · 驻军 ' + g.length + ' 支迎敌' : '没有驻军：怪物直冲主基地', life: 1.6, y: 440 });
  if (this.bv && this.bv.home) this.bv.home();
  this.bump();
};
// the battle opens after the alarm, or (no garrison) the raid walks straight into the main base
G.nightTick = function (dt) {
  const N = this.night, m = this.meta; if (!N || !m) return;
  N.t += dt || 0;
  if (N.ph === 'dusk' && N.t >= N.at && this.screen === 'base') { N.ph = 'fight'; this.run = raidRun(m); this.beginBattle({ type: 'raid', col: 0, id: -1, seg: 0, raid: 1 }); return; }
  if (N.ph === 'empty' && N.t >= N.at) {
    const dmg = Math.round(M.portalMax(m) * M.NIGHT.HIT); m.portal.hp = Math.max(0, m.portal.hp - dmg); m.lastRaid = m.day; m.raids = (m.raids || 0) + 1; m.raidWeak = 0; this.save();
    this.banner && this.banner({ kind: 'win', text: '主基地受到冲击', col: '#ff4a4a', col2: '#3a0000', sub: '耐久 -' + dmg, life: 2.0, y: 440 }); S.lose && S.lose(); this.fx.kick && this.fx.kick(24); this.fx.flash && this.fx.flash('#ff2a2a', 0.3); this.pulse.portal = now();
    N.ph = 'after'; N.at = N.t + 2.0; N.res = { won: false, dmg }; return;
  }
  if (N.ph === 'after' && N.t >= N.at && this.screen === 'base') this.nightOver();
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); if (this.night) this.nightTick(dt || 0); return r; };
// the battle: the leader stays on the roof; it ends when the raid is beaten or the garrison has fallen
const oInit = BP.init;
BP.init = function (run, cfg) {
  const r = oInit.apply(this, arguments);
  if (run && run.raid) { this.ek = 1; this.raidNight = 1; }
  else if (run && run.M && !(run.region && run.region.tut)) { const st = M.baseMods(run.M).bossStun || 0; if (st) this.later((this.fightT0 || 0) + 0.05, () => this.ents.forEach(e => { if (e.alive && e.side === 'E' && e.boss) { e.stun = Math.max(e.stun || 0, st); this.float && this.float(e.x, e.y - 120, '钟声 · 停顿', '#ffcf4a', 28); } })); }
  return r;
};
const oHE = BP.heroEnter; BP.heroEnter = function () { if (this.run && this.run.raid) return; return oHE.apply(this, arguments); };
const oStep = BP.step;
BP.step = function (dt) {
  const r = oStep.apply(this, arguments);
  if (this.raidNight && !this.over && this.t > (this.entryEnd || 0) + 0.3) {
    let army = 0, left = this.cfg.list.length - this.spawnI; for (const e of this.ents) { if (!e.alive) continue; if (e.side === 'A' && !e.isHero) army++; else if (e.side === 'E') left++; }
    if (left === 0) { this.finish(); this.end('clear'); }
    else if (army === 0) this.end('dead');
    else if (this.t > M.NIGHT.T_MAX) this.end('time');
  }
  return r;
};
// the announcement says what this is
const oBB = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBB.apply(this, arguments), run = this.run, B0 = this.introBanner;
  if (run && run.raid && B0) { B0.text = M.bloodMoon(run.M.day) ? '血月之夜' : '混沌来袭'; B0.col = '#ff5a4a'; B0.sub = '第 ' + run.M.day + ' 夜 · 驻军 ★' + M.garrisonPower(run.M) + ' · 敌军 ★' + ((this.cfg && this.cfg.night) || 0); }
  return r;
};
// the end of the night: no settlement screen; back on the base, the verdict there
const oSettle = G.startSettle;
G.startSettle = function () {
  const run = this.run; if (!(run && run.raid)) return oSettle.apply(this, arguments);
  const b = this.battle, m = this.meta, N = this.night || (this.night = { t: 0, day: m.day }), won = b.over === 'clear';
  const dead = new Set(b.deadUids || []), g = garOf(m), lost = won ? [] : g.filter(u => dead.has(u.uid) && rnd() < M.NIGHT.LOSS);
  m.garrison = g.filter(u => !lost.includes(u)); m.lastRaid = m.day; m.raids = (m.raids || 0) + 1; m.raidWeak = 0; m.st = m.st || {};
  let dmg = 0, sup = 0;
  if (won) { m.st.raidsWon = (m.st.raidsWon || 0) + 1; sup = Math.round(30 + m.day * 10); m.supplies += sup; if (m.day >= 15 && this.prof) { (this.prof.stats || (this.prof.stats = {})).raid15 = 1; this.saveProfile && this.saveProfile(); } this.achCheck2 && this.achCheck2(); }   // 钟表匠 unlocks on the 15th night (mc-legacy.js)
  else {
    const cost = (x) => (DB[x] && DB[x].cost) || 20, total = b.cfg.list.reduce((a, s) => a + cost(s.type), 0) || 1;
    const rest = b.ents.filter(e => e.alive && e.side === 'E').reduce((a, e) => a + cost(e.key) * cl(e.hp / Math.max(1, e.maxHp), 0, 1), 0) + b.cfg.list.slice(b.spawnI).reduce((a, s) => a + cost(s.type), 0);
    dmg = Math.round(M.portalMax(m) * M.NIGHT.HIT * cl(rest / total, 0.15, 1)); m.portal.hp = Math.max(0, m.portal.hp - dmg);
  }
  const sh = Math.round((b.kills || 0) * 1.2); m.shards += sh;
  N.res = { won, dmg, sup, sh, kills: b.kills || 0, fell: dead.size, lost: lost.length };
  this.save();
  try { M.T && M.T.ev('night', { day: m.day, won, kills: b.kills || 0, fell: dead.size, lost: lost.length, dmg, gar: m.garrison.length, secs: Math.round(b.t) }); } catch (e) {}
  this.toBase();
  if (won) { this.banner({ kind: 'win', text: '守住了！', col: '#ffd970', life: 2.2, y: 440, sub: '击退 ' + N.res.kills + ' 个敌人 · 物资 +' + sup + (sh ? ' · 灵魂碎片 +' + sh : '') }); S.fanfare && S.fanfare(); this.fx.confetti && this.fx.confetti(100); }
  else { this.banner({ kind: 'win', text: '驻军败退', col: '#ff4a4a', col2: '#3a0000', life: 2.4, y: 440, sub: (lost.length ? '阵亡 ' + lost.length + ' 支 · ' : '') + '主基地耐久 -' + dmg }); S.lose && S.lose(); this.fx.kick && this.fx.kick(24); this.fx.flash && this.fx.flash('#ff2a2a', 0.3); this.pulse.portal = now(); }
  N.ph = 'after'; N.at = N.t + 2.3;
  this.bump();
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
  if (v.b && m) { v.b.raidTxt = M.bloodMoon(m.day) ? '今晚血月' : '今晚混沌来袭'; v.b.raidC = '#ff5a4a'; v.raidTip = this.tipFn(() => this.tipFor('b-raid')); }
  // the fight's own bar: what this night is and how many are still coming
  const b = this.battle; if (v.h && b && this.run && this.run.raid) { let left = b.cfg.list.length - b.spawnI; b.ents.forEach(e => { if (e.alive && e.side === 'E') left++; }); v.h.mode = '混沌来袭'; v.h.modeColor = '#ff5a4a'; v.h.goal = '击退怪物 · 还剩 ' + left + ' 个'; }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  const m = this.meta;
  if (key === 'b-mode' && this.run && this.run.raid) return { title: '混沌来袭', c: '#ff6a5a', d: '击退所有怪物就守住了；驻军全灭，剩下的怪物打主基地。' };
  if (key === 'b-raid' && m) return { title: M.bloodMoon(m.day) ? '今晚血月' : '混沌来袭', c: '#ff6a5a', d: M.bloodMoon(m.day) ? '每 5 天的最后一晚是血月：怪物强三成多，还带一个精英。' : '每天夜里怪物攻打主基地，驻军迎敌。', lines: [M.raidOddsLine(m), { t: '主基地耐久 ' + Math.round(m.portal.hp) + ' / ' + M.portalMax(m), c: '#e8dcc4' }] };
  if (key === 'b-gar' && m) {
    const g = garOf(m), c = {}; g.forEach(u => { c[u.type] = (c[u.type] || 0) + 1; }); const ks = Object.keys(c).sort((a, b) => DB[b].q - DB[a].q || c[b] - c[a]);
    return { title: '驻军 ' + g.length + ' / ' + M.GARRISON_CAP + ' · ★' + M.garrisonPower(m), c: '#ffcf4a', d: g.length ? '出征带回来的部队，每天夜里守城。' : '出征回来的部队会留下守城。',
      lines: ks.slice(0, 10).map(k => ({ rich: [{ t: DB[k].n + (c[k] > 1 ? ' ×' + c[k] : ''), c: Q[DB[k].q].c, b: 1 }] })).concat(ks.length > 10 ? [{ t: '还有 ' + (ks.length - 10) + ' 种', c: '#a9a3c9' }] : []) };
  }
  return oTip.apply(this, arguments);
};
// the save check knows the garrison
const oTickF = G.tick;
G.tick = function (dt) { const m = this.meta; if (m && !m.nightV && M.garFix(m) && this.save) this.save(); return oTickF.apply(this, arguments); };

// ───────── words that still spoke of towers and walls ─────────
if (M.GUIDE) {
  const G2 = M.GUIDE;
  G2.push(
    { id: 'garrison', cat: '基地', icon: 't_shield', title: '驻军', line: '出征带回来的部队留在基地守夜，不会再出征；三支相同的也会进化。', scr: 'base', sel: '[data-fx="mgar"]' },
    { id: 'evobld', cat: '基地', icon: 'u_star', title: '进化建筑', line: '每座让一个职业的进化上限提高一档：史诗、传说、神话；同一种只能建一座。', scr: 'base', sel: '[data-g="bld"]' });
}
})();

;
