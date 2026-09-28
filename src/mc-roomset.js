// ==== mc-roomset.js ====
(function () {
// The rooms, reset (user ruling 2026-09-26: 「图纸建筑也要重新设计，因为把奇观去掉后，图纸房间建造系统被破坏了，这次设计种类不需要太多，
// 前期够用就行，等方向没问题了，再扩」, plan confirmed the same day). Landmarks are wonders now (mc-wonders.js); the rooms
// underground are plain trades, one job each, with plain names: 19 of them plus 22 evolution halls (a 大厅 lifts a vocation
// to 史诗, a 圣殿 to 传说; 神话 comes only with the wonder 奥林匹亚宙斯神像), and the 20 boss statues.
// A new room borrows the underground picture of an old landmark room whose look fits it (the mine for 矿车站, the cranes
// of the dock for 脚手架厂 …).
const M = window.MC, G = M.Game.prototype, B = M.BUILDINGS, now = () => performance.now();
const GONE = ['machu', 'ruhr', 'venice', 'opera', 'bigben', 'forbidden', 'artemis', 'angkor', 'taj', 'hagia', 'potala', 'gardens', 'library', 'maracana', 'shaolin', 'colosseum',
  'lighthouse', 'stonehenge', 'liberty', 'goldengate', 'pyramids', 'amundsen', 'eiffel', 'colossus', 'terracotta', 'zeus', 'michel', 'ev_van3', 'ev_gua3', 'ev_rng3', 'ev_ass3', 'ev_mag3', 'ev_cle3'];
GONE.forEach(k => { if (B[k]) B[k].gone = true; });
Object.keys(M.WONDERS || {}).forEach(k => { if (B[k]) B[k].q = 4; });   // one flag colour over every wonder on the surface
// kept, some changed
const set = (k, o) => { if (B[k]) Object.assign(B[k], o); };
set('farm', { n: '温室农场', cat: 'power', q: 3, style: 'nature', cost: 280, days: 3, fx: { supplyDaily: 50 }, d: '每天产出 50 物资。' });
set('pool', { fx: { heal: 0.15 }, d: '医院回复额外 +15%。' });
set('wolfsburg', { n: '精铸坊', q: 3, cost: 300, days: 3, d: '打造出的宝物品质 +1。' });
set('kotoku', { n: '战神殿' });
// new, each borrowing a picture
const NEW = {
  minecart:   { art: 'ruhr', n: '矿车站', cat: 'power', q: 2, style: 'steam', cost: 200, days: 2, fx: { supplyDaily: 30 }, d: '每天产出 30 物资。' },
  barracks:   { art: 'maracana', n: '兵营', cat: 'train', q: 2, style: 'medieval', cost: 220, days: 2, fx: { startUnit: 1 }, d: '出征开局多一支随机部队。' },
  watchtower: { art: 'lighthouse', n: '瞭望塔', cat: 'scout', q: 2, style: 'medieval', cost: 200, days: 2, fx: { seeElite: 1 }, d: '出征时精英和首领一开始就看得见。' },
  sappers:    { art: 'goldengate', n: '工兵营', cat: 'eng', q: 1, style: 'steam', cost: 150, days: 1, fx: { digCost: -0.5 }, d: '挖掘费用 -50%。' },
  scaffold:   { art: 'venice', n: '脚手架厂', cat: 'eng', q: 2, style: 'steam', cost: 220, days: 2, fx: { buildDays: -1 }, d: '所有建造少花 1 天（最少 1 天）。' },
  temple:     { art: 'artemis', n: '神殿', cat: 'faith', q: 2, style: 'fantasy', cost: 220, days: 2, fx: { faithDaily: 5 }, d: '每天产出 5 信仰值。' },
  bank:       { art: 'forbidden', n: '钱庄', cat: 'store', q: 1, style: 'steam', cost: 160, days: 1, fx: { startWallet: 60 }, d: '每次出征开局多带 60 积分。' },
  // the main base mends only here (user ruling 2026-09-27: 「每天回血应该是建筑的特性，而不是默认机制」); 15% a day, what the base
  // used to get for free, now for a cell of land
  mender:     { art: 'amundsen', n: '修缮坊', cat: 'eng', q: 0, style: 'steam', cost: 80, days: 1, fx: { portalRegen: 0.15 }, d: '主基地每天回复 15% 耐久。' },
};
Object.keys(NEW).forEach(k => { const o = NEW[k]; B[k] = Object.assign({ pw: 0 }, B[k], o); delete B[k].art; delete B[k].gone;
  if (M.PXR && M.PXR.defs && M.PXR.defs[o.art] && !M.PXR.has(k)) M.PXR.def(k, Object.assign({}, M.PXR.defs[o.art]));
  if (M.ROOM_D && M.ROOM_D[o.art] && !M.ROOM_D[k]) M.ROOM_D[k] = M.ROOM_D[o.art]; });
M.ROOM_NEW = Object.keys(NEW);
// 修缮坊 at work: each morning the main base gets back its share, up to the max
const oAD = M.advanceDay;
M.advanceDay = function (m) { const logs = oAD.apply(this, arguments);
  const rg = m && m.portal ? M.baseMods(m).portalRegen || 0 : 0;
  if (rg > 0) { const mx = M.portalMax(m), v = Math.round(Math.min(mx - m.portal.hp, mx * rg)); if (v > 0) { m.portal.hp += v; if (Array.isArray(logs)) logs.push({ t: '主基地耐久 +' + v }); } }
  return logs; };
// every base starts with a blueprint of it (old saves get theirs once)
const mendBp = (m) => { if (m && m.inv && !m.mendV) { M.invAdd(m, 'bbp:mender', 1); m.mendV = 1; return true; } return false; };
// 钱庄: the expedition sets out with points in hand (the answer to 「是不是应该有天赋或者建筑能够增加这个初始积分」)
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments); if (run && meta && !(run.region && run.region.tut)) { const w = Math.round(M.baseMods(meta).startWallet || 0); if (w > 0) { run.wallet += w; run.startGift = w; } } return run; };
// a new game's stock holds no blueprint for a room that is gone
const oNG = G.newGame;
G.newGame = function () { const r = oNG.apply(this, arguments), m = this.meta; mendBp(m); if (m && m.inv) { Object.keys(m.inv).forEach(k => { if (k.startsWith('bbp:') && B[k.slice(4)] && B[k.slice(4)].gone && !B[k.slice(4)].boss) delete m.inv[k]; }); m.roomV = 1; m.wonderV = 1; m.wonders = []; } return r; };
// old saves: a landmark room standing becomes its wonder on the surface; any other room that is gone is paid back, and so
// are its blueprints and its building sites
M.roomFix = function (m) {
  if (!m || m.roomV === 1 || !m.base) return false; M.wonderFix && M.wonderFix(m); let sup = 0;
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x) continue;
    const k = x.b || (x.job && x.job.kind === 'build' ? x.job.key : null), Bd = k && B[k]; if (!Bd || !Bd.gone || Bd.boss) continue;
    if (x.b && M.WONDERS && M.WONDERS[k] && !(m.wonders || []).includes(k)) m.wonders = (m.wonders || []).concat([k]); else sup += Bd.cost || 100;
    x.b = null; x.job = null; x.dug = true; x.ruin = false; }
  Object.keys(m.inv || {}).forEach(k => { const Bd = k.startsWith('bbp:') && B[k.slice(4)]; if (Bd && Bd.gone && !Bd.boss) { sup += Math.round((Bd.cost || 100) * 0.5) * (m.inv[k] || 1); delete m.inv[k]; } });
  if (sup) m.supplies += sup; m.roomV = 1; m.wonderV = 1; m.dirOwe = Math.max(0, M.prosLv(m) - 1 - (m.wonders || []).length);
  const g = M._g; if (g && g.meta === m && g.toast) setTimeout(() => g.toast('基地换新：' + ((m.wonders || []).length ? '名胜变成了地面上的奇观，' : '') + (sup ? '拆掉的房间退回 ' + sup + ' 物资' : '房间重排好了'), '#ffd970'), 1200);
  return true;
};
const oTick = G.tick;
G.tick = function (dt) { const m = this.meta; if (m && m.base && m.roomV !== 1 && M.roomFix(m)) { this.save && this.save(); if (this.townSync) this.townSync(true); } if (m && m.base && !m.mendV && mendBp(m)) this.save && this.save(); return oTick.apply(this, arguments); };
})();
