// ==== mc-bastion.js ====
(function () {
// 城防流: the base as a fortress (user ruling 2026-09-27: 「繁荣度增长时带来的基地的血量提升也不能太大，玩家如果想要把基地打造成堡垒
// 一样的血牛应该建造对应的建筑，例如城墙之类的」「要有一些建筑和天赋，是增强英雄在守城战中的伤害和攻速的……实际上可以给游戏增加一个流派，
// 就是基地强化流，专门强化基地的生命值和守城时的伤害，而且不同英雄，应该也有流派的偏适度」). Here:
// · the category 城防 and its rooms: 城墙, 修缮坊 (from mc-roomset.js), 箭楼, 战鼓楼, 要塞;
// · two talents for the leader on the roof, and the leaders who lean to 城防 (守夜人, 焚尸人: their trees grow more of them);
// · the leader's shot from the roof (its own attack, raised by all of the above; mc-night.js fires it, mc-town.js draws it);
// · the night's crowd drawn by each unit's own size; soul shards dropping kill by kill into the bar;
// · a room (and the main base over the 仓库) bounces when something flies into it.
const M = window.MC, G = M.Game.prototype, B = M.BUILDINGS, DB = M.DB, T_ = M.TALENTS || {}, P = M.PJ.PAL;
const now = () => performance.now();

// ───────── the category ─────────
if (M.CAT) M.CAT.fort = '城防';
if (M.CAT_COL) M.CAT_COL.fort = '#8fc8ff';
if (M.CAT_D) M.CAT_D.fort = '让主基地更结实，领袖守城打得更狠。';
if (M.CAT_ORDER && !M.CAT_ORDER.includes('fort')) M.CAT_ORDER.splice(M.CAT_ORDER.indexOf('defense') + 1, 0, 'fort');
if (M.TAG_IC && M.TAG_IC.CAT_IC) M.TAG_IC.CAT_IC.fort = 'f_defense';
if (M.WORLD_CATS) ['town', 'hell'].forEach(w => { if (M.WORLD_CATS[w] && !M.WORLD_CATS[w].includes('fort')) M.WORLD_CATS[w].push('fort'); });

// ───────── the rooms (each borrows the underground picture of an old landmark, as in mc-roomset.js) ─────────
const ROOMS = {
  rampart:    { art: 'michel', n: '城墙', cat: 'fort', q: 0, style: 'medieval', cost: 90, days: 1, fx: { portalHp: 0.3 }, d: '主基地耐久 +30%。' },
  arrowtower: { art: 'terracotta', n: '箭楼', cat: 'fort', q: 1, style: 'medieval', cost: 150, days: 1, fx: { roofDmg: 0.4 }, d: '领袖守城的伤害 +40%。' },
  wardrum:    { art: 'shaolin', n: '战鼓楼', cat: 'fort', q: 2, style: 'fantasy', cost: 200, days: 2, fx: { roofAs: 0.4 }, d: '领袖守城的攻速 +40%。' },
  citadel:    { art: 'potala', n: '要塞', cat: 'fort', q: 3, style: 'medieval', cost: 300, days: 3, fx: { portalHp: 0.6, roofDmg: 0.3, garCap: 4 }, d: '主基地耐久 +60%，领袖守城的伤害 +30%，驻军上限 +4。' },
  barrack:    { art: 'colosseum', n: '营房', cat: 'fort', q: 0, style: 'medieval', cost: 100, days: 1, fx: { garCap: 4 }, d: '驻军上限 +4。' },
  // 军需流: supplies into strength (2026-09-27: 「如果物资充分，如何转化成战斗力，例如直接用物资给部队升品之类的……这又是一个新流派」)
  quarter:    { art: 'library', n: '军需处', cat: 'train', q: 1, style: 'steam', cost: 150, days: 1, supUp: 1, d: '花物资给驻军升档。' },
};
Object.keys(ROOMS).forEach(k => { const o = ROOMS[k]; B[k] = Object.assign({ pw: 0 }, B[k], o); delete B[k].art; delete B[k].gone;
  if (M.PXR && M.PXR.defs && M.PXR.defs[o.art] && !M.PXR.has(k)) M.PXR.def(k, Object.assign({}, M.PXR.defs[o.art]));
  if (M.ROOM_D && M.ROOM_D[o.art] && !M.ROOM_D[k]) M.ROOM_D[k] = M.ROOM_D[o.art]; });
if (B.mender) B.mender.cat = 'fort';
M.FORT_ROOMS = Object.keys(ROOMS).filter(k => ROOMS[k].cat === 'fort').concat(['mender']);

// ───────── talents for the roof, and who leans to them ─────────
const TIER = M.TAL_TIER || [0, 0.7, 1, 1.35, 1.75, 2.2, 2.7], pct = (v) => Math.round(Math.abs(v) * 100) + '%';
const S_ = (b) => ({ v: (t) => Math.round(b * TIER[t] * 1000) / 1000 });
Object.assign(T_, {
  roofShot:  { n: '屋顶箭术', sc: 'self', lean: 'fort', ic: 'v_archer', ...S_(0.3), d: (v) => '混沌来袭时，本领袖在屋顶的伤害 +' + pct(v) + '。', m: (v) => ({ roofDmg: v }) },
  roofRapid: { n: '连射', sc: 'self', lean: 'fort', ic: 'e_bolt', ...S_(0.2), d: (v) => '混沌来袭时，本领袖在屋顶的攻速 +' + pct(v) + '。', m: (v) => ({ roofAs: v }) },
});
if (T_.bulwark) T_.bulwark.lean = 'fort';
if (T_.ballistics) T_.ballistics.lean = 'fort';
// 流派 of the leaders: 守夜人 and 焚尸人 lean to 城防 — their talent trees grow its talents four times as often, and they are
// better on the roof (守夜人 hits harder, 焚尸人's fire bursts among the crowd); the other four lean to the army they lead
M.LEAN = { watchman: 'fort', cremator: 'fort', widow: 'army', nun: 'army', butcherlord: 'army', clockmaker: 'army' };
M.LEAN_N = { fort: '城防', army: '部队' };
M.LEAN_ROOF = { watchman: { dmg: 0.5, d: '守城时屋顶的伤害 +50%。' }, cremator: { xs: 150, d: '守城时射出的火焰落地炸开，烧到周围的敌人。' } };
const withLean = (cls, fn) => { const o = M._talLean; M._talLean = (cls && M.LEAN[cls]) || null; try { return fn(); } finally { M._talLean = o; } };
const oNH = M.newHero;
if (oNH) M.newHero = function (meta, cls, rarity) { cls = cls || M.pick(Object.keys(M.HEROES)); return withLean(cls, () => oNH.call(this, meta, cls, rarity)); };
const oTR = M.talReset;
if (oTR) M.talReset = function (h) { return withLean(h && h.cls, () => oTR.apply(this, arguments)); };
const oSF = M.soloFix;
if (oSF) M.soloFix = function (m) { const h = m && m.heroes && m.heroes[0]; return withLean(h && h.cls, () => oSF.apply(this, arguments)); };
// the leader's tooltip: a leaning leader says what it does on the roof
const oHT = G.heroTip;
G.heroTip = function (h) {
  const t = oHT.apply(this, arguments), L = h && M.LEAN_ROOF[h.cls]; if (!t || !L) return t;
  const img = M.iconURL ? M.iconURL('f_defense', 2) : null;
  if (Array.isArray(t.brief)) t.brief.push({ parts: [{ img, t: '城防', c: '#8fc8ff' }], desc: L.d });
  return t;
};

// ───────── the leader on the roof ─────────
// its shot: its own attack (M.NIGHT.ROOF = 1) × the roof's bonuses; the 月神 god's ×1.3 (mc-gods.js) stays on top
M.roofMods = function (m, h) {
  const tm = M.talentMods ? M.talentMods(h) : {}, bm = M.baseMods(m), L = M.LEAN_ROOF[h.cls] || {};
  return { dmg: (tm.roofDmg || 0) + (bm.roofDmg || 0) + (L.dmg || 0), as: (tm.roofAs || 0) + (bm.roofAs || 0), xs: L.xs || 0 };
};
// soul shards by the kill (user ruling 2026-09-27: 「灵魂结晶可以是概率掉落的，而且杀死1个敌人，就结算1次，如果掉落结晶的话，就飞到资源栏中，
// 而不是战斗结束后，统一结算」): a monster of the crowd drops one with a chance that grows with the days (13% on night 1 … 50%),
// so a night brings about as many as the old 1.2 a kill did; an elite always drops one, a 强敌 3, a 首领 5
M.RAID_SHARD = { p0: 0.12, perDay: 0.012, max: 0.5, strong: 3, boss: 5 };
const NRB = M.NightRaid;
if (NRB) M.NightRaid = class extends NRB {
  constructor(meta) {
    super(meta);
    const R = this.roof, h = meta.heroes && meta.heroes[0], S0 = M.ROOF_SPOT;
    if (R && h && S0) { const md = M.roofMods(meta, h); R.dmg *= 1 + md.dmg; R.cd /= 1 + md.as; R.x = S0.x; R.y = S0.y - 96 * S0.k * 0.55; R.hx = 34; R.range = M.NIGHT.ROOF_R; if (md.xs) { R.xs = md.xs; R.col = '#ff8a3a'; } }
    this.shGot = 0;
  }
  damage(e, d, col, src) { const was = !!(e && e.alive), r = super.damage(e, d, col, src); if (was && !e.alive && e.side === 'E') this.dropShard(e); return r; }
  dropShard(e) {
    const C = M.RAID_SHARD, m = this.meta, n = e.champ === 'boss' ? C.boss : e.champ ? C.strong : 1, p = e.champ || e.elite ? 1 : Math.min(C.max, C.p0 + C.perDay * (m.day || 1));
    if (Math.random() >= p) return;
    this.shGot += n; const g = M._g;
    if (!g || g.raid !== this || g.meta !== m || !g.bv) { m.shards += n; return; }
    if (g.held.msh == null) g.hold('msh', m.shards);
    m.shards += n;
    const from = g.bv.toScreen(e.x, e.y - 70), img = M.spriteCanvas('shard', 6);
    g.fx.fly(img, from, g.fxPos('msh') || { x: 200, y: 90 }, { col: P.violet, s0: 0.7, s1: 0.4, dur: 0.65, onLand: () => { if (g.held.msh == null) return; g.held.msh += n; g.pulse.msh = now(); if (g.held.msh >= m.shards) g.release('msh'); } });
  }
};
// the counter never stays held once the night is over
const oRE = G.raidEnd;
G.raidEnd = function () { const r = oRE.apply(this, arguments); setTimeout(() => { if (this.held && this.held.msh != null) this.release('msh'); }, 1500); return r; };

// ───────── how big a unit stands in the night (2026-09-27: 「我方部队的体型和敌人的体型都应该大一些，现在体型都太小了，根本看不见了，
// 而且不同单位，也要拉开体型差距」) ─────────
// its own art height (a giant is taller than a goblin), × 4, × its quality for the redrawn characters (the 16-bit ones carry
// it already), × elite / 强敌 / 首领; mc-base.js draws it at that height
M.RAID_SIZE = { k: 4, elite: 1.2, strong: 1.6, boss: 2 };
const NAT = {};
const natH = (k) => { if (NAT[k] != null) return NAT[k]; let h = 22; try { const im = M.P16 && M.P16.img(k, 'idle', 0, null, 1); if (im && im.S) h = im.S; } catch (err) { /* keep the default */ } return (NAT[k] = h); };
M.raidUnitH = function (e) {
  const k = e && e.sprite; if (!k || !M.P16) return 0; const Z = M.RAID_SIZE, d = DB[k], art = M.artOf ? M.artOf(k) : k;
  const pcd = !!(window.PCD && window.PCD.has && window.PCD.has(art)), q = pcd && d ? (M.QSIZE || [1, 1.07, 1.14, 1.3, 1.5, 1.65])[d.q || 0] || 1 : 1;
  return Math.round(natH(k) * Z.k * q * (e.champ === 'boss' ? Z.boss : e.champ ? Z.strong : e.elite ? Z.elite : 1));
};

// ───────── something flies into a room: the room bounces ─────────
// (2026-09-27: 「如果有东西飞到房间中，（例如图纸之类的，会飞到仓库），那么对应的房间要弹动」) the screen points handed out for rooms
// (the core room = the 仓库, any cell) are remembered; a flight landing on one pokes that room, and the 仓库 also shakes the
// main base above it
const PTS = [];
const note = (p, c, r) => { if (p) { PTS.push({ x: p.x, y: p.y, c, r, t: now() }); if (PTS.length > 40) PTS.shift(); } return p; };
const oCP = G.corePos;
if (oCP) G.corePos = function () { return note(oCP.apply(this, arguments), M.CORE.c, M.CORE.r); };
const oCell = G.cellPos;
if (oCell) G.cellPos = function (c, r) { return note(oCell.apply(this, arguments), c, r); };
M.onFlyLand = function (to) {
  if (!to || !M.PXR) return; const T = now();
  for (let i = PTS.length - 1; i >= 0; i--) { const p = PTS[i]; if (T - p.t > 10000) continue; if (Math.abs(p.x - to.x) < 4 && Math.abs(p.y - to.y) < 4) { M.PXR.poke(p.c + ',' + p.r, 'land'); if (p.c === M.CORE.c && p.r === M.CORE.r) M._mbLand = T; return; } }
};
const oMB = M.PXR && M.PXR.mainBase, DOOR_X = M.BASE_GEO.DOOR_X;
if (oMB) M.PXR.mainBase = function (ctx) {
  const q = M._mbLand ? (now() - M._mbLand) / 550 : 1; if (!(q < 1)) return oMB.apply(this, arguments);
  const sq = Math.sin(q * Math.PI * 2.5) * (1 - q) * 0.06; ctx.save(); ctx.translate(DOOR_X, 0); ctx.scale(1 + sq * 0.6, 1 - sq); ctx.translate(-DOOR_X, 0);
  try { return oMB.apply(this, arguments); } finally { ctx.restore(); }
};

// ───────── first-time cards ─────────
if (M.GUIDE) M.GUIDE.push(
  { id: 'fort', cat: '基地', icon: 'f_defense', title: '城防', line: '这一类建筑让主基地更结实、领袖守城打得更狠。', scr: 'base' },
  { id: 'roof', cat: '基地', icon: 'v_archer', title: '屋顶的领袖', line: '混沌来袭时，领袖跳上主基地的塔顶，用自己的攻击射向敌群。', scr: 'base' });
// ───────── how many can garrison (2026-09-27: 「驻军上限，可以最多是30个，但是不应该开局就30个，应该跟据繁荣度，难易度，房间建设（或者奇迹
// 建筑）等有关，而不是固定写死30个」) ─────────
// 6 at the start, +2 a prosperity level (Lv9: 22), the difficulty +0 / 2 / 4 / 6, 营房 +4 and 要塞 +4, never above 30. A homecoming past
// the cap sends the weakest away for a third of its price in supplies (mc-parade.js).
M.GAR = { base: 6, perLv: 2, gd: [0, 2, 4, 6], max: 30 };
M.garCap = function (m) {
  if (!m) return M.GAR.max; const G_ = M.GAR, lv = Math.max(1, m.prosLv || 1), gd = G_.gd[Math.max(0, Math.min(3, m.gd || 0))] || 0;
  return Math.min(G_.max, G_.base + G_.perLv * (lv - 1) + gd + Math.round(M.baseMods(m).garCap || 0));
};
// ───────── 军需处: supplies buy a garrison unit its next tier ─────────
// no daily limit, as far as the garrison's quality cap goes (the same as the soul-shard 升档 of the evolution halls); the price is
// 1.2 times the two tiers' price gap (普通→优质 about 110, 稀有→史诗 about 1190), so supplies turn into power about 1 : 0.8
M.SUP_UP = 1.2;
M.supUpPick = (m) => (M.garrisonOf ? M.garrisonOf(m) : []).filter(u => { const d = DB[u.type]; return d && d.next && DB[d.next] && M.evoOpen(m, u.type); }).sort((a, b) => (DB[a.type].tier || 0) - (DB[b.type].tier || 0) || M.unitPower(b.type, b) - M.unitPower(a.type, a))[0] || null;
M.supUpCost = (u) => { const d = u && DB[u.type], n = d && DB[d.next]; return n ? Math.max(20, Math.round(((n.cost || 0) - (d.cost || 0)) * M.SUP_UP / 5) * 5) : 0; };
G.supUp = function () {
  const m = this.meta; if (!m) return false; const u = M.supUpPick(m); if (!u) { this.deny && this.deny('驻军里没有能升档的部队', '#8d8496'); return false; }
  const cost = M.supUpCost(u); if (m.supplies < cost) { this.deny && this.deny('物资不足', '#d0453c'); return false; }
  const from = u.type, to = DB[from].next; this.hold && this.hold('msup', m.supplies); m.supplies -= cost; this.release && this.release('msup');
  u.type = to; u.evo = (u.evo || 0) + 1; this.save && this.save();
  const Q = M.QUALITY || [], qc = (Q[DB[to].q] || {}).c || '#ffe08a', p = this.panel && this.panel.c != null && this.cellPos ? this.cellPos(this.panel.c, this.panel.r) : { x: 960, y: 500 };
  this.fx && this.fx.rays && this.fx.rays(p.x, p.y, qc, 1.2, { r: 240 }); this.fx && this.fx.pop(p.x, p.y - 50, DB[from].n + ' → ' + DB[to].n, qc, 40, { slam: 1 }); M.Sfx.up && M.Sfx.up(3); if (this.pulse) this.pulse.mgar = now(); this.bump();
  return true;
};
{ const oPVq = G.panelView;
  G.panelView = function () {
    const v = oPVq.apply(this, arguments), p = this.panel, m = this.meta, pn = v && v.pn; if (!pn || !p || p.kind !== 'room' || !m || !B[p.key] || !B[p.key].supUp) return v;
    const u = M.supUpPick(m), to = u && DB[DB[u.type].next], cost = u ? M.supUpCost(u) : 0;
    Object.assign(pn, { ruinOn: true, ruinC: '#e8dcc4', ruinTxt: u ? '驻军里的' + DB[u.type].n + '可以升成' + to.n + '。' : '驻军里没有能升档的部队。',
      repairBtn: u ? '升档 · ' + cost + ' 物资' : '没有能升档的部队', repairOp: u && m.supplies >= cost ? 1 : 0.45, onRepair: () => this.supUp() });
    return v;
  }; }
if (M.GUIDE) M.GUIDE.push({ id: 'garcap', cat: '基地', icon: 't_shield', title: '驻军上限', line: '繁荣度、难度、营房和要塞让它变多，最多 30。', scr: 'base', sel: '[data-fx="mgar"]' });
})();
