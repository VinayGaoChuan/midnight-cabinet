// ==== mc-wonders.js ====
(function () {
// Wonders (user ruling 2026-09-26: 「不要强化和图纸了，你直接奇观2选1，然后直接造好，不占用房间空间，而是直接造在上层地图上……游戏
// 中也没有奇观图纸了，所有奇观都是通过升级繁荣度获得的。并且奇观必须要有奇观的样子，把现在地面上的主基地缩小……奇观的效果需要再设计
// 一下，不能跟普通建筑一样……但是也要一句话描述」, plan confirmed the same day).
// · Every 繁荣度 level: two wonders, pick one; it rises out of the ground on the surface at once, next to the main base, in
//   the front row — no room, no blueprint, no days. A game has at most eight (Lv2 … Lv9).
// · A wonder changes a rule, in one sentence: some fight at night by themselves (the colossus stamps, the tower's
//   searchlight, the terracotta army …), some change expeditions, some the base.
// · The 发展方向 are gone as a choice: the city takes the look of the styles of its wonders (mc-townlook.js reads m.dirs,
//   which now only says how the city looks). The blueprint pick of a level is gone too (mc-roster.js).
// · The main base on the surface is smaller, so the wonders stand out.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, B = M.BUILDINGS, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = Math.random;
const GEO = M.BASE_GEO, DOOR_X = GEO.DOOR_X, MB = M.MAIN_BASE;
// key = the landmark's art on the surface (mc-town.js) · style → the city's look · kind: night / run / base · need: part, or difficulty
const W = M.WONDERS = {
  colossus:   { n: '罗德岛巨像', style: 'water', kind: 'night', d: '夜里每 8 秒一脚踩在城门前，踩扁脚下的怪物。' },
  eiffel:     { n: '埃菲尔铁塔', style: 'steam', kind: 'night', d: '夜里探照灯锁住最强的怪物，它受到的伤害翻倍。' },
  michel:     { n: '圣米歇尔山', style: 'water', kind: 'night', d: '潮水封住左边，夜里怪物只从右边来。' },
  terracotta: { n: '兵马俑', style: 'fantasy', kind: 'night', d: '每晚城门前站出 8 个陶俑兵一起守城。' },
  liberty:    { n: '自由女神像', style: 'water', kind: 'night', d: '主基地每晚第一次掉到一半以下时，火炬点亮，耐久回满。' },
  stonehenge: { n: '巨石阵', style: 'nature', kind: 'night', d: '强敌和首领一出场就被定住 6 秒。', gd: 1 },
  colosseum:  { n: '罗马斗兽场', style: 'medieval', kind: 'run', d: '出征上场人数 +2。' },
  lighthouse: { n: '亚历山大灯塔', style: 'water', kind: 'run', d: '出征地图一开始全亮。' },
  taj:        { n: '泰姬陵', style: 'fantasy', kind: 'run', d: '出征失败时，这一趟的收获照样带回。' },
  machu:      { n: '马丘比丘', style: 'nature', kind: 'run', d: '夜市每家店多摆 2 张卡。' },
  opera:      { n: '悉尼歌剧院', style: 'cartoon', kind: 'run', d: '每场战斗的第一次 FEVER 必定是传说效果。', part: 'fever' },
  zeus:       { n: '奥林匹亚宙斯神像', style: 'fantasy', kind: 'base', d: '所有职业的进化上限 +1。' },
  pyramids:   { n: '金字塔', style: 'fantasy', kind: 'base', d: '建筑下单当天就建好。' },
  gardens:    { n: '空中花园', style: 'nature', kind: 'base', d: '凯旋时可以带回两支部队。' },
  library:    { n: '亚历山大图书馆', style: 'magic', kind: 'base', d: '领袖每一级都得天赋点（平时两级一点）。' },
  bigben:     { n: '大本钟', style: 'steam', kind: 'base', d: '每 5 天多来一个来访者。' },
  potala:     { n: '布达拉宫', style: 'magic', kind: 'base', d: '信仰值获得翻倍。', part: 'shrine' },
};
const KIND_N = { night: '守夜', run: '出征', base: '基地' };
// wonders have no ranks between them: all of them wear 不朽's dark gold (2026-09-27: 「繁荣度带来的奇观，是不是没有高下之分，如果没有，
// 那他们的颜色应该统一……都可以是不朽品质的颜色」); the kind tag says what it is for, in plain cream
const WC = () => ((M.QUALITY && M.QUALITY[6]) || { c: '#c9a24a' }).c;
const STYLE_DIR = { steam: 'industry', medieval: 'fort', water: 'market', nature: 'pastoral', fantasy: 'holy', magic: 'arcane', scifi: 'future', cartoon: 'fun' };
const wl = (m) => (m && Array.isArray(m.wonders) ? m.wonders : []);
M.wondersOf = wl;
const hasW = M.hasWonder = (m, k) => wl(m).includes(k);
const curM = () => (M._g && M._g.meta) || null;
const hasNow = (k) => hasW(curM(), k);
const eligible = (m, k) => { const w = W[k]; if (!w || hasW(m, k)) return false; if (w.part && M.hasPart && !M.hasPart(w.part)) return false; if (w.gd && M.gdOf && !(M.gdOf(m) && (m.gd || 0) >= w.gd)) return false; return true; };
M.wonderOffer = function (m) { const pool = Object.keys(W).filter(k => eligible(m, k)), out = []; for (let i = 0; i < 2 && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]); return out; };

// ───────── the direction machinery becomes the wonder pick ─────────
const D = M.DIRS || {};
Object.keys(D).forEach(k => { delete D[k].fn; D[k].cats = []; D[k].styles = []; });   // the directions no longer do anything but look
M.vocFromBase = (mods) => mods;                                                        // nor strengthen vocations (mc-roster.js)
// old saves: the levels already reached owe their wonders
const fixW = (m) => { if (!m || m.wonderV === 1) return; m.wonders = wl(m).slice(); m.dirOwe = Math.max(0, M.prosLv(m) - 1 - m.wonders.length); m.dirs = {}; m.dirOrd = []; wl(m).forEach(k => look(m, k)); m.wonderV = 1; };
M.wonderFix = fixW;
const look = (m, k) => { const d = STYLE_DIR[(W[k] || {}).style]; if (!d) return; m.dirs = Object.assign({}, m.dirs); m.dirs[d] = Math.min(M.DIR_MAX || 3, (m.dirs[d] | 0) + 1); m.dirOrd = (m.dirOrd || []).concat([d]); };
M.dirOffer = function (m) { fixW(m); return M.wonderOffer(m); };
G.dirTake = function (k) {
  const m = this.meta, P = this.dirPick; if (!P || !W[k] || now() - P.at < 500) return; fixW(m); const from = M.dirTop(m);
  m.wonders = wl(m).concat([k]); look(m, k); m.dirOwe = Math.max(0, (m.dirOwe || 1) - 1); this.dirPick = null; this.save();
  // it rises beside the main base (mc-town.js brings a new building up out of the ground); the camera goes to see it
  this.dirFx = { k: STYLE_DIR[W[k].style] || 'city', lv: 1, t0: now(), wonder: k }; if (this.town) { this.town.lookFx = { k: this.dirFx.k, from, t: 0 }; }
  if (this.bv) { this.bv.keepFree && this.bv.keepFree(); this.bv.sel = null; this.bv.tx = DOOR_X; this.bv.ty = -200; this.bv.tz = Math.max(0.5, Math.min(0.62, 1920 / ((M.townSpan || 1600) + 700))); }
  this.banner && this.banner({ kind: 'win', text: '奇观 · ' + W[k].n, col: WC(), col2: '#4a3410', sub: W[k].d, life: 2.6, y: 300 });
  S.up && S.up(3); S.fanfare && S.fanfare(); this.fx && this.fx.kick && this.fx.kick(14);
  try { M.T && M.T.ev('wonder', { k, lv: M.prosLv(m) }); } catch (e) {}
  this.bump();
};
// a picture of the wonder for its card: night sky, the ground, the landmark standing on it
const picC = {};
M.wonderPic = function (k) {
  if (picC[k]) return picC[k]; const c = document.createElement('canvas'); c.width = 520; c.height = 260; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const g = x.createLinearGradient(0, 0, 0, 260); g.addColorStop(0, '#0c0a1c'); g.addColorStop(1, '#2b2461'); x.fillStyle = g; x.fillRect(0, 0, 520, 260);
  for (let i = 0; i < 40; i++) { x.fillStyle = i % 5 ? '#6a63b4' : '#f4efe0'; x.fillRect((i * 97) % 520, (i * 53) % 150, 3, 3); }
  x.fillStyle = '#1a1640'; x.fillRect(0, 222, 520, 38); x.fillStyle = '#3d3a8c'; x.fillRect(0, 222, 520, 4);
  let im = null; try { im = M.townArt ? M.townArt(k, 0, 0, 0, '') : null; } catch (e) { im = null; }
  if (im) { const s = Math.min(236 / (im.oy || im.height), 480 / im.width, 1.4); x.save(); x.translate(260, 226); x.scale(s, s); x.drawImage(im, -im.ox, -im.oy); x.restore(); }
  return (picC[k] = c.toDataURL());
};
// the card
const oView = G.view;
G.view = function () {
  // the directions' own card code would look the wonder up among the directions: it does not see the pick at all
  const P = this.dirPick, m = this.meta; this.dirPick = null; let v; try { v = oView.call(this); } finally { this.dirPick = P; }
  v.dirOn = !!P && this.screen === 'base';
  if (v.dirOn) {
    const ready = now() - P.at > 500;
    v.dp = { title: '繁荣度 Lv' + P.lv, line: '选一座奇观', cards: P.ks.map((k, i) => { const w = W[k], st = M.tagIc ? M.tagIc('style', w.style) : null;
      return { n: w.n, c: WC(), t: w.d, tags: [{ img: '', n: KIND_N[w.kind], c: '#e8dcc4', tip: '' }].concat(st ? [{ img: st.img, n: st.n + '风格', c: st.c, tip: st.tip }] : []), hasTags: true, hasHave: false, have: '', blds: [], sub: '', hasSub: false, img: M.wonderPic(k), op: ready ? 1 : 0.6, onPick: () => this.dirTake(k), fx: 'dir' + i }; }) };
  }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  const t = oTip.apply(this, arguments), m = this.meta;
  if (key === 'b-pros' && t && m) { t.lines = (t.lines || []).filter(l => !(l.rich && l.rich[0] && /化/.test(l.rich[0].t || ''))).concat(wl(m).map(k => ({ rich: [{ t: W[k].n + '　', c: WC() }, { t: W[k].d, c: '#e8dcc4' }] }))); }
  return t;
};
if (M.GUIDE) { const i = M.GUIDE.findIndex(x => x && x.id === 'dirs'); if (i >= 0) M.GUIDE.splice(i, 1);
  M.GUIDE.push({ id: 'wonder', cat: '基地', icon: 't_pros', title: '奇观', line: '繁荣度每升一级，两座奇观选一座，当场建在地面上。', scr: 'base', sel: '[data-tip="b-pros"]', when: (g) => wl(g.meta).length > 0 && !g.dirFx }); }

// ───────── prosperity comes from holding the nights and beating bosses too (a bad run of blueprints no longer stalls it) ─────────
M.PROS_NIGHT = 15; M.PROS_BOSS = 20;
const oPros = M.prosperity;
M.prosperity = function (m) { const p = oPros.apply(this, arguments), st = (m && m.st) || {}; return p + (st.raidsWon || 0) * M.PROS_NIGHT + (st.boss || 0) * M.PROS_BOSS; };

// ───────── on the surface: the wonders in the front row beside a smaller main base ─────────
const MB_K = M.MB_K = 0.65;
if (!MB._k) { MB._k = MB_K; MB.w = Math.round(MB.w * MB_K); MB.top = Math.round(MB.top * MB_K); }
if (M.PXR && M.PXR.mainBase) {
  const oMB = M.PXR.mainBase;
  M.PXR.mainBase = function (ctx) { ctx.save(); ctx.translate(DOOR_X, 0); ctx.scale(MB_K, MB_K); ctx.translate(-DOOR_X, 0); try { return oMB.apply(this, arguments); } finally { ctx.restore(); } };
  const oAR = M.PXR.archRows; let AR = null;
  if (oAR) M.PXR.archRows = function () { if (AR) return AR; AR = oAR.apply(this, arguments).map(r => ({ y: Math.round(r.y * MB_K), x0: Math.round(r.x0 * MB_K), x1: Math.round(r.x1 * MB_K) })); return AR; };
}
const WK = 1.2;   // a wonder is drawn bigger than the same landmark ever was as a room
const oLay = M.townLayout;
M.townLayout = function (m) {
  const L = oLay.apply(this, arguments), ws = wl(m); if (!ws.length) return L;
  const E0 = MB.w / 2, cur = { L: E0 + 100, R: E0 + 40 };   // room on the left for the god's statue (mc-gods.js)
  ws.forEach((k, i) => { const sd = i % 2 ? 'R' : 'L', s = sd === 'L' ? -1 : 1, f = M.townFoot(k), w = f.w * WK;
    const o = { k: 'w:' + k, c: -1, r: -1, key: k, role: 'wonder', fight: false, front: true, fort: 0, B: Object.assign({}, B[k] || { style: W[k].style }, { q: 6 }), site: false, ruin: false, demo: false, fix: false, w: f.w, h: f.h, side: s, depth: -1, ty: -4, sc: WK, dk: 0, tx: DOOR_X + s * (cur[sd] + w / 2), wonder: 1 };
    cur[sd] += w + 36; L.items.push(o); });
  ['L', 'R'].forEach(sd => { const s = sd === 'L' ? -1 : 1, e = DOOR_X + s * (cur[sd] + 20); if (s < 0 ? e < L.edge.L : e > L.edge.R) { L.edge[sd] = e; L.guard[sd] = e + s * 24; } });
  L.span = L.edge.R - L.edge.L; return L;
};
// where a wonder stands now (for its night deeds)
const wPos = (k) => { const T = M._g && M._g.town, v = T && T.vis && T.vis['w:' + k]; return v ? { x: v.x, y: v.y, h: v.h * (v.sc || 1) } : { x: DOOR_X + 500, y: 0, h: 260 }; };

// ───────── their deeds ─────────
// 罗马斗兽场 · 宙斯 · 亚历山大灯塔 · 马丘比丘 · 悉尼歌剧院
const oCap = M.rosterCap;
if (oCap) M.rosterCap = function (run) { const c = oCap.apply(this, arguments); return run && run.M && !(run.region && run.region.tut) && hasW(run.M, 'colosseum') && c < 90 ? c + 2 : c; };
const oVC = M.vocCap;
M.vocCap = function (m, voc) { return Math.min(6, oVC.apply(this, arguments) + (hasW(m, 'zeus') ? 1 : 0)); };
const oGen = M.genMap2;
M.genMap2 = function (run) { const res = oGen.apply(this, arguments), map = res && res.nodes ? res : run && run.map; if (map && map.nodes && run && run.M && hasW(run.M, 'lighthouse') && !(run.region && run.region.tut)) map.nodes.forEach(n => { n.seen = true; }); return res; };
const oRoll = M.rollShop;
M.rollShop = function (run) { const Sh = M.SHOPS && (M.SHOPS[run.shopKind] || M.SHOPS.bazaar), add = run && run.M && hasW(run.M, 'machu') && Sh && !(run.region && run.region.tut) ? 2 : 0; if (add) Sh.units += add; try { return oRoll.apply(this, arguments); } finally { if (add) Sh.units -= add; } };
const BP = M.Battle3.prototype, oInit = BP.init;
BP.init = function (run) { const r = oInit.apply(this, arguments); if (this.fever && run && run.M && hasW(run.M, 'opera')) this.fever.q0 = Math.max(this.fever.q0 || 0, 4); return r; };
// 泰姬陵: a lost expedition still brings its haul home
const oFail = G.runFail;
G.runFail = function () {
  const run = this.run, m = this.meta, keep = run && m && !(run.region && run.region.tut) && hasW(m, 'taj'), L = keep ? JSON.parse(JSON.stringify(run.loot || {})) : null;
  const r = oFail.apply(this, arguments);
  if (keep && L) { const e = this.endInfo || {}, g = e.gain = e.gain || {};
    if (L.supplies) { m.supplies += L.supplies; g.msup = (g.msup || 0) + L.supplies; }
    if (L.shards) { m.shards += L.shards; g.msh = (g.msh || 0) + L.shards; }
    if (Array.isArray(L.bp) && L.bp.length) { L.bp.forEach(k => M.invAdd(m, k, 1)); g.bp = (g.bp || []).concat(L.bp.filter(k => !String(k).startsWith('tile:'))); }
    e.sub = (e.sub || '') + ' 泰姬陵：收获照样带回。'; this.save(); }
  return r;
};
// 金字塔: a building ordered stands the same day
const oSB = M.startBuild;
M.startBuild = function (m, c, r, key) {
  const ok = oSB.apply(this, arguments); if (!ok || !hasW(m, 'pyramids')) return ok;
  const x = M.cell(m, c, r); if (x && x.job && x.job.kind === 'build') { x.b = x.job.key; x.dug = true; x.job = null; m.st = m.st || {}; m.st.built = (m.st.built || 0) + 1; const g = M._g; if (g && g.fx && g.cellPos) { const p = g.cellPos(c, r); g.fx.pop && g.fx.pop(p.x, p.y - 40, '金字塔 · 当天建成', '#ffd970', 30); } }
  return ok;
};
// 亚历山大图书馆: one talent point more for every level
const oXP = M.addExp;
M.addExp = function (h) { const ups = oXP.apply(this, arguments); if (ups > 0 && hasNow('library')) { let add = 0; for (let l = h.lv - ups + 1; l <= h.lv; l++) if (l % 2) add++; h.points = (h.points || 0) + add; } return ups; };   // the odd levels too (a point every level)
// 大本钟: two visitors a stretch (mc-timeline.js)
M.visitN = (m) => (hasW(m, 'bigben') ? 2 : 1);
// 布达拉宫: faith twice over
const oBM = M.baseMods;
M.baseMods = function (m) { const o = oBM.apply(this, arguments); if (m && hasW(m, 'potala') && o.faithDaily) o.faithDaily *= 2; return o; };
const oWin = G.runWin;
G.runWin = function () { const run = this.run; if (run && run.loot && run.loot.faith && hasW(this.meta, 'potala')) run.loot.faith *= 2; return oWin.apply(this, arguments); };
// 空中花园: the homecoming takes two (mc-parade.js reads M.paradePicks)
M.paradePicks = (m) => (hasW(m, 'gardens') ? 2 : 1);

// ───────── the night: wonders that fight ─────────
const NR = M.NightRaid && M.NightRaid.prototype;
if (NR) {
  const NRC = M.NightRaid;
  M.NightRaid = class extends NRC {
    constructor(meta) {
      super(meta);
      const has = (k) => hasW(meta, k);
      if (has('michel')) this.list.forEach(x => { x.side = 1; });
      // the night's monsters on average (for the wonders' own blows)
      const ls = this.list.filter(x => !x.champ && DB[x.type]); this.avgHp = ls.length ? ls.reduce((a, x) => a + DB[x.type].hp * (x.elite ? 1.15 : 1) * (x.hpMul || 1), 0) / ls.length : 200;
      this.avgAtk = ls.length ? ls.reduce((a, x) => a + DB[x.type].atk * (x.elite ? 1.15 : 1) * (x.atkMul || 1), 0) / ls.length : 20;
      this.wd = { stomp: has('colossus') ? 5 : null, light: has('eiffel') ? { tg: null } : null, torch: has('liberty') ? 0 : null, henge: has('stonehenge') };
      if (has('terracotta')) { const d = DB.Pikeman || DB.FootSoldier_T1 || {}; for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, home = DOOR_X + side * (MB.w / 2 + 110 + Math.floor(i / 2) * 44), hp = this.avgHp * 1.6, atk = this.avgAtk * 1.1;
        this.ents.push({ side: 'A', guard: 1, tc: 1, sprite: DB.Pikeman ? 'Pikeman' : 'FootSoldier_T1', s: 4, tint: '#c98f5a', x: home, home, home0: home, y: -16 - (i % 3) * 8, hp, max: hp, atk, cd: 1, range: 70, spd: 150, ranged: false, t: rnd(), alive: true, face: -side }); } }
    }
    guardTarget(e, foes) { if (e.tc) { const g = e.gar; e.gar = 1; try { return super.guardTarget(e, foes); } finally { e.gar = g; } } return super.guardTarget(e, foes); }
    spawn(x) { super.spawn(x); const e = this.ents[this.ents.length - 1]; if (e && e.champ && this.wd && this.wd.henge) { e.stun = Math.max(e.stun || 0, 6); this.float(e.x, e.y - 200, '巨石阵 · 定住', '#9cff7a', 36); this.fx.push({ k: 'boom', x: e.x, y: -20, r: 160, t0: this.t, life: 0.6 }); } }
    damage(e, d, col) { if (e && e.side === 'E' && e.lit) d *= 2; return super.damage(e, d, col); }
    hitPortal(dmg) { super.hitPortal(dmg); const w = this.wd; if (w && w.torch === 0 && this.portal.hp > 0 && this.portal.hp < this.portal.max / 2) { w.torch = 1; this.portal.hp = this.portal.max; this.float(DOOR_X, -420, '自由女神像 · 火炬点亮', '#ffd970', 40); this.shake = Math.max(this.shake, 12); S.fanfare && S.fanfare(); } }
    step(dt) {
      super.step(dt); const w = this.wd; if (!w || this.over) return; const T = this.t, foes = this.ents.filter(o => o.alive && o.side === 'E');
      // 罗德岛巨像: every 8 s a stamp where the monsters crowd nearest the gate
      if (w.stomp != null) { w.stomp -= dt; if (w.stomp <= 0) { const near = foes.filter(o => Math.abs(o.x - DOOR_X) < 1100).sort((a, b) => Math.abs(a.x - DOOR_X) - Math.abs(b.x - DOOR_X))[0];
        if (near) { w.stomp = 8; const x = near.x, R = 170; foes.forEach(o => { if (Math.abs(o.x - x) < R) this.damage(o, this.avgHp * 0.9, '#ffd0a0'); }); this.fx.push({ k: 'foot', x, t0: T, life: 0.7 }); this.fx.push({ k: 'boom', x, y: -20, r: R, t0: T + 0.25, life: 0.5 }); this.shake = Math.max(this.shake, 18); S.boom && S.boom(); } else w.stomp = 0.5; } }
      // 埃菲尔铁塔: the searchlight follows the strongest monster
      if (w.light) { const L = w.light; if (!L.tg || !L.tg.alive) { if (L.tg) L.tg.lit = false; L.tg = foes.slice().sort((a, b) => b.hp - a.hp)[0] || null; if (L.tg) L.tg.lit = true; } }
    }
    draw(ctx, lights) {
      const r = super.draw(ctx, lights), w = this.wd, T = this.t; if (!w) return r;
      if (w.light && w.light.tg && w.light.tg.alive) { const p = wPos('eiffel'), tg = w.light.tg, x0 = p.x, y0 = p.y - p.h + 10; ctx.save(); ctx.globalAlpha = 0.28 + 0.06 * Math.sin(T * 6); ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.moveTo(x0 - 6, y0); ctx.lineTo(tg.x - 70, tg.y + 6); ctx.lineTo(tg.x + 70, tg.y + 6); ctx.lineTo(x0 + 6, y0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(tg.x, tg.y - 4, 70, 14, 0, 0, 7); ctx.fill(); ctx.restore(); lights && lights.push({ x: tg.x, y: tg.y - 60, r: 220, c: '#fff2b0', f: 1 }); }
      this.fx.forEach(f => { if (f.k !== 'foot') return; const q = (T - f.t0) / f.life; if (q < 0 || q > 1) return; const y = -Math.max(0, 1 - q * 2.2) * 520; ctx.save(); ctx.globalAlpha = q < 0.8 ? 1 : (1 - q) * 5; ctx.fillStyle = P.ink; ctx.fillRect(f.x - 96, y - 86, 192, 90); ctx.fillStyle = '#b87333'; ctx.fillRect(f.x - 90, y - 80, 180, 78); ctx.fillStyle = '#d8934a'; ctx.fillRect(f.x - 90, y - 80, 180, 10); ctx.fillStyle = '#7a4a22'; ctx.fillRect(f.x - 90, y - 12, 180, 10); ctx.restore(); });
      return r;
    }
  };
}
// the town draws the wonders in the front row (mc-town.js: surface phase)
M.townFront = (v) => !!(v && (v.fight || v.front));
})();
