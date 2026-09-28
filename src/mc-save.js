// ==== mc-save.js ====
(function () {
// Save check on start-up. Every local save is read in full before the game touches it: anything this version cannot use
// is cut out on its own (a bad leader, a broken room, an unknown blueprint…); a save that cannot be trusted at all, or
// one from an older version, is deleted. Either way the player sees the save card being torn and shredded, then plays on.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (p) => 1 - Math.pow(1 - p, 3);
const K_META = 'midnight-cabinet-meta-v4', K_PROF = 'midnight-cabinet-profile-v1', K_SET = 'midnight-cabinet-settings-v1';
const OLD = ['midnight-cabinet-meta-v1', 'midnight-cabinet-meta-v2', 'midnight-cabinet-meta-v3'];
const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const del = (k) => { try { localStorage.removeItem(k); } catch (e) {} };
const isNum = (v) => typeof v === 'number' && isFinite(v);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const intIn = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;

// ───────── the game save (局内) ─────────
function checkMeta(raw) {
  let m; try { m = JSON.parse(raw); } catch (e) { return { wipe: '存档文件损坏，无法读取' }; }
  if (!isObj(m)) return { wipe: '存档内容为空' };
  if (m.v !== 4) return { wipe: '旧版本的存档（v' + m.v + '）' };
  const D = M.defaultMeta3(), cut = {}; const note = (k, n) => { cut[k] = (cut[k] || 0) + (n || 1); }; let mig = false;   // mig: silent design migrations, saved without a report
  // numbers and containers
  [['day', 1], ['supplies', 0], ['shards', 0], ['orbs', 0], ['runs', 0], ['raids', 0]].forEach(([k, min]) => { if (!isNum(m[k]) || m[k] < min) { m[k] = D[k] == null ? min : D[k]; note('数值'); } });
  ['inv', 'cleared', 'seenWorlds'].forEach(k => { if (!isObj(m[k])) { m[k] = {}; note('数值'); } });
  ['relics', 'heroes', 'graveyard', 'log'].forEach(k => { if (!Array.isArray(m[k])) { m[k] = []; note('数值'); } });
  if (!isObj(m.portal) || !isNum(m.portal.hp) || m.portal.hp < 0) { m.portal = { hp: 1000 }; note('传送门'); }
  if (m.core != null && !intIn(m.core, 0, 3)) { m.core = 3; note('基地核心'); }
  ['raidWeak', 'freeRecruit', 'bonusPw', 'nextKit', 'buildBoost'].forEach(k => { if (m[k] != null && (!isNum(m[k]) || m[k] < 0)) { delete m[k]; note('带回的效果'); } });
  // the base grid
  const cells = m.base && m.base.cells, BR = M.BROWS, BC = M.BCOLS;
  // the rock lost its two bottom rows (2026-09-27, 5 → 3 rows): what stood or was being built there goes back to the inventory as its
  // blueprint — a design migration, not damage
  while (Array.isArray(cells) && cells.length > BR && cells.length <= 5) { const gone = cells.pop(); (Array.isArray(gone) ? gone : []).forEach(x => { if (!isObj(x)) return; const k = x.b && x.b !== 'core' ? x.b : isObj(x.job) && x.job.kind === 'build' ? x.job.key : null; if (k && M.BUILDINGS[k] && !M.BUILDINGS[k].fixed) { m.inv = isObj(m.inv) ? m.inv : {}; m.inv['bbp:' + k] = (m.inv['bbp:' + k] | 0) + 1; } }); mig = true; }
  if (!Array.isArray(cells) || cells.length !== BR || cells.some(row => !Array.isArray(row) || row.length !== BC)) { m.base = D.base; note('基地布局'); }
  else for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) {
    let x = cells[r][c]; if (!isObj(x)) { cells[r][c] = x = { dug: false, tile: null, b: null, job: null }; note('基地房间'); }
    if (x.b === 'sanitarium') { x.b = null; m.supplies += 90; mig = true; }
    if (x.b && x.tile === 'ruin') { x.tile = null; mig = true; }   // the ruin's effect is spent once the room stands   // the 疗养室 was removed with the personalities: refund it
    if (isObj(x.job) && x.job.key === 'sanitarium') { x.job = null; m.supplies += 90; mig = true; }
    if (x.b != null && !M.BUILDINGS[x.b]) { x.b = null; note('基地房间'); }
    if (x.tile != null && !M.TILES[x.tile]) { x.tile = null; note('地格'); }
    if (x.job != null && !(isObj(x.job) && (x.job.kind === 'dig' || ((x.job.kind === 'build' || x.job.kind === 'repair' || x.job.kind === 'demolish') && M.BUILDINGS[x.job.key])) && isNum(x.job.days))) { x.job = null; note('工程'); }   // repairs and demolitions survive a reload (2026-09-27)
    if (x.fort != null && !(isNum(x.fort) && x.fort >= 0 && x.fort <= 3)) { x.fort = 0; note('加固'); }
    x.dug = !!(x.dug || x.b);
  }
  const co = m.base.cells[M.CORE.r][M.CORE.c]; if (co.b !== 'core') { Object.assign(co, { b: 'core', dug: true, job: null }); note('基地核心房间'); }
  // relics
  const relics = m.relics.filter(r => isObj(r) && M.RELICS[r.key] && intIn(r.q, 0, 5) && r.id != null);
  if (relics.length < m.relics.length) note('宝物', m.relics.length - relics.length);
  relics.forEach(r => { if (!Array.isArray(r.lines)) r.lines = M.relicLines(r.key, r.q); }); m.relics = relics;
  const rid = new Set(relics.map(r => r.id));
  // leaders
  const okHero = (h) => {
    if (!isObj(h) || !M.HEROES[h.cls] || !intIn(h.rarity, 0, 3) || !intIn(h.lv, 1, Math.max(40, M.LV_MAX || 20)) || !isNum(h.exp) || !isNum(h.hp) || typeof h.name !== 'string') return false;
    return true;   // talents: a broken or old-style tree is replaced below, not a reason to drop the leader
    // (the level bound is the highest any difficulty allows, 40: M.LV_MAX is still 20 while this runs, before the save says which
    // difficulty is open — a leader past Lv 20 used to fail here and the whole save was shredded on every start, 2026-09-27:
    // 「粉碎存档后，必定复现」)
  };
  relics.forEach(r => { if (r.lines.some(l => l.k === 'shortRed')) { r.lines = M.relicLines(r.key, r.q); mig = true; } });
  const heroes = m.heroes.filter(okHero);
  if (heroes.length < m.heroes.length) note('领袖', m.heroes.length - heroes.length);
  heroes.forEach(h => {
    if (!intIn(h.points, 0, 40)) h.points = 0;
    // personalities and personal names were removed from the design: drop them without reporting damage
    if ('quirks' in h || h.name !== M.heroN(h) || (isObj(h.status) && h.status.kind === 'sanitarium')) mig = true;
    // talents (2026-09-25): the three-branch trees became one random layered tree per leader; an old or broken tree
    // is grown again for the leader's quality and every point it had comes back
    if (!M.talValid(h)) {
      const old = !Array.isArray(h.tree), back = old ? (isObj(h.taken) ? ['atk', 'def', 'luck'].reduce((a, b) => a + (intIn(h.taken[b], 0, 20) ? h.taken[b] : 0), 0) : 0) : (Array.isArray(h.taken) ? h.taken.length : 0), pts = h.points;
      M.talReset(h); h.points = Math.min(20, pts + back); if (old) mig = true; else note('天赋');
    }
    delete h.quirks; h.name = M.heroN(h); if (isObj(h.status) && h.status.kind === 'sanitarium') h.status = null;
    h.relics = (Array.isArray(h.relics) ? h.relics : []).filter(id => rid.has(id));
    if (h.status != null && !isObj(h.status)) h.status = null; if (!isNum(h.runs)) h.runs = 0;
  });
  m.heroes = heroes.length ? heroes : D.heroes;
  // one leader, no exp orbs, no core lives, no recruiting rooms (2026-09-25, mc-solo.js)
  if (M.soloFix && M.soloFix(m)) mig = true;
  if (M.coreFix && M.coreFix(m)) mig = true;   // the base core came back (2026-09-26)
  if (M.prosFix && M.prosFix(m)) mig = true;   // prosperity and the unlocked rings (2026-09-26)
  // inventory: only blueprints and vein crystals this version knows
  if (m.inv['bbp:sanitarium']) { delete m.inv['bbp:sanitarium']; mig = true; }
  m.graveyard.forEach(g => { if (isObj(g) && M.HEROES[g.cls] && g.name !== M.HEROES[g.cls].n) { g.name = M.HEROES[g.cls].n; mig = true; } });
  Object.keys(m.inv).forEach(k => { const [kind, id] = k.split(':'), n = m.inv[k]; const known = kind === 'bbp' ? !!M.BUILDINGS[id] && !M.BUILDINGS[id].fixed : kind === 'rbp' ? !!M.RELICS[id] : kind === 'tile' ? !!M.TILES[id] : false; if (!known || !intIn(n, 1, 999)) { delete m.inv[k]; note('仓库物品'); } });
  Object.keys(m.cleared).forEach(k => { if (!M.WORLDS[k]) { delete m.cleared[k]; note('世界进度'); } });
  // last word: run the systems that read the save; if any of them throws, the save is not usable
  try { M.baseMods(m); M.power(m); M.invList(m); m.heroes.forEach(h => { M.heroMaxHp(h, m); M.heroAtk(h, m); M.skillNodeCd(h, m); }); M.buildOptions(m, 0, 0); }
  catch (e) { return { wipe: '存档和当前版本的系统对不上（' + String(e && e.message || e).slice(0, 40) + '）' }; }
  return { m, cut, mig };
}

// ───────── the room outside the cabinet (局外) ─────────
function checkProfile(raw) {
  let p; try { p = JSON.parse(raw); } catch (e) { return { wipe: '局外存档损坏，无法读取' }; }
  if (!isObj(p)) return { wipe: '局外存档为空' };
  if (p.v !== 1) return { wipe: '旧版本的局外存档' };
  const cut = {}; const note = (k, n) => { cut[k] = (cut[k] || 0) + (n || 1); };
  if (!isNum(p.tokens) || p.tokens < 0) { p.tokens = 0; note('代币'); }
  if (!isObj(p.furn)) { p.furn = {}; note('家具'); }
  const FB = {}; (M.FURN || []).forEach(f => { FB[f.k] = f; });
  Object.keys(p.furn).forEach(k => { const f = FB[k]; if (!f || !intIn(p.furn[k], 0, (f.lv || []).length)) { delete p.furn[k]; note('家具'); } });
  if (!isObj(p.ach)) { p.ach = {}; note('成就'); }
  Object.keys(p.ach).forEach(k => { if (!(M.ACH_BY && M.ACH_BY[k])) { delete p.ach[k]; note('成就'); } });
  if (!isObj(p.stats)) { p.stats = {}; note('统计'); }
  if (!Array.isArray(p.hist)) { p.hist = []; note('统计'); }
  if (!Array.isArray(p.kit)) { p.kit = []; note('卡带'); }
  const KB = new Set((M.KITS || []).map(k => k.k)); const k0 = p.kit.length; p.kit = p.kit.filter(k => KB.has(k)); if (p.kit.length < k0) note('卡带', k0 - p.kit.length);
  if (p.carry != null && !isObj(p.carry)) { p.carry = null; note('存钱罐'); }
  if (p.pending != null && !isObj(p.pending)) { p.pending = null; note('结算'); }
  return { p, cut };
}

// ───────── run the check now, before the game reads anything ─────────
// 2026-09-27 (user ruling: 「发现文档不匹配，不能兼容，那就直接全撕掉，但是给个补偿……按照上一个文档的时候，直接给他按结算算……补偿也不能
// 太多」): a save that does not match this version is no longer patched piece by piece — the whole document goes, and the
// cabinet pays something back. A torn game is settled as if it had ended that day, half of it, 30…300 tokens; a torn
// cabinet profile gives back half its tokens, at most 300; both together at most 500. Design migrations (mig) are not
// incompatibilities and keep the save. A broken settings file just goes back to the defaults, without a show.
const rows = [], rep = { rows, wiped: false, fixed: false, comp: null };
const addRow = (n, state, why) => rows.push({ n, state, why });
const K_COMP = 'midnight-cabinet-comp';
const snapOf = (m) => isObj(m) ? { day: isNum(m.day) ? m.day : 1, cleared: isObj(m.cleared) ? m.cleared : {}, st: isObj(m.st) ? m.st : {}, gd: intIn(m.gd, 0, 3) ? m.gd : 0, goalDone: !!m.goalDone, hard: !!m.hard, moon: m.moon || null } : null;
const parse = (raw) => { try { return JSON.parse(raw); } catch (e) { return null; } };
const whyOf = (r) => r.wipe || (Object.keys(r.cut).slice(0, 2).join('、') + '和当前版本对不上');
let comp = null;
OLD.forEach(k => { const raw = get(k); if (raw != null) { const m0 = parse(raw); del(k); addRow('旧版本存档' + (isObj(m0) && isNum(m0.day) ? ' · 第 ' + m0.day + ' 天' : ''), 'wipe', '和当前版本不兼容'); rep.wiped = true; if (!comp) comp = {}; if (!comp.game) comp.game = snapOf(m0) || { day: 1 }; } });
const rm = get(K_META);
if (rm != null) {
  const r = checkMeta(rm);
  if (r.wipe || Object.keys(r.cut).length) { const m0 = parse(rm); del(K_META); addRow('局内存档' + (isObj(m0) && isNum(m0.day) ? ' · 第 ' + m0.day + ' 天' : ''), 'wipe', whyOf(r)); rep.wiped = true; comp = comp || {}; comp.game = snapOf(m0) || { day: 1 }; }
  else { if (r.mig) put(K_META, r.m); addRow('局内存档 · 第 ' + r.m.day + ' 天', 'ok'); }
}
const rp = get(K_PROF);
if (rp != null) {
  const r = checkProfile(rp);
  if (r.wipe || Object.keys(r.cut).length) { const p0 = parse(rp); del(K_PROF); addRow('机台（局外）', 'wipe', whyOf(r)); rep.wiped = true; comp = comp || {}; comp.prof = isObj(p0) && isNum(p0.tokens) && p0.tokens > 0 ? p0.tokens : 0; }
  else addRow('机台（局外）', 'ok');
}
const rs = get(K_SET);
if (rs != null) { let s = null; try { s = JSON.parse(rs); } catch (e) {} if (!isObj(s)) { del(K_SET); M.settings = M.loadSettings(); } }
if (comp) { rep.comp = comp; put(K_COMP, comp); }
// what the cabinet pays back (computed when shown: the settlement's own rules, difficulty included)
M.saveCompN = function (c) {
  if (!c) return 0; let n = 0;
  if (c.game) { let t = 0; try { t = M.settleRows(Object.assign({ cleared: {}, st: {} }, c.game)).total || 0; } catch (e) { t = 20 * (c.game.day || 1); } n += Math.min(300, Math.max(30, Math.round(t * 0.5))); }
  if (c.prof) n += Math.min(300, Math.round(c.prof * 0.5));
  return Math.min(500, n);
};
// the page may evaluate this script more than once while it boots: the first pass already repaired the save, so the
// report is parked in storage until the shredding has been shown
const K_REP = 'midnight-cabinet-savecheck';
if (rep.wiped || rep.fixed) put(K_REP, rep);
let parked = null; try { parked = JSON.parse(get(K_REP)); } catch (e) {}
M.saveReport = (rep.wiped || rep.fixed) ? rep : (parked && parked.rows ? parked : null);
M.saveCheck = { checkMeta, checkProfile };

// ───────── the shredding ─────────
// 2026-09-27 (user ruling: 「要做一个伟大的撕卡效果……撕碎文件，粉碎文件……爽感，震撼感」). The save drops in as a sheet of paper
// and is scanned row by row; a huge red 「不兼容」 stamp slams onto it; it is ripped in half top to bottom, each half ripped
// again; a shredder rises from the bottom of the screen and eats the four pieces one by one, spitting strips; a last
// crunch bursts the confetti; then the cabinet spits the compensation, coin by coin, into a counter. Click to go on.
const U = M.UI, P = M.PJ.PAL, RM = () => !!M.PJ.reduced, st4 = (v) => cl(v, 0, 1), ei = (p) => p * p * p;
const snd = (F, k, fn) => { if (!F.s[k]) { F.s[k] = 1; if (F.hush && now() < F.hush) return; try { fn(); } catch (e) {} } };   // a skip hushes the blows it jumped over
const PW = 520, PH = 640, PX0 = 960, PY0 = 470;                 // the sheet, and where it rests
const SLOT_Y = 790, T = { drop: 0.45, scan0: 0.6, scan1: 1.45, stamp: 1.55, hit: 1.78, tear: 2.15, split: 2.7, tear2: 3.05, shUp: 3.2, feed: 3.75, crunch: 5.05, coin: 5.5 };
function paperOf(F) {
  if (F.paper) return F.paper;
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const x = c.getContext('2d');
  U.R(x, 0, 0, PW, PH, '#f2e8cf'); U.R(x, 0, 0, PW, 10, '#fffaf0'); U.R(x, 0, PH - 12, PW, 12, '#d8c8a2');
  for (let yy = 150; yy < PH - 40; yy += 34) U.R(x, 30, yy, PW - 60, 2, '#e0d2b0');
  U.text(x, '午夜机台 · 存档', PW / 2, 70, 38, P.ink, { shadow: false }); U.R(x, 40, 104, PW - 80, 4, P.ink);
  F.rows.forEach((r, k) => { const y = 160 + k * 70; U.R(x, 36, y, PW - 72, 56, '#e8dcbc'); U.text(x, r.n, 56, y + 28, 26, P.ink, { align: 'left', shadow: false }); });
  return (F.paper = c);
}
// the tear lines: one jagged cut top to bottom, and two jagged cuts across its halves (the four pieces)
function cutsOf(F) {
  if (F.cuts) return F.cuts; const V = [], HL = [], HR = [], j = (a) => (Math.random() - 0.5) * a;
  for (let y = 0; y <= PH; y += 32) V.push([PW / 2 + j(36), y]);
  const vm = V[10];
  for (let x = 0; x <= vm[0]; x += 26) HL.push([x, 320 + j(28)]); HL.push([vm[0], vm[1]]);
  for (let x = vm[0]; x <= PW; x += 26) HR.push([x, 320 + j(28)]); HR.push([PW, 320 + j(20)]); HR[0] = [vm[0], vm[1]];
  const top = V.slice(0, 11), bot = V.slice(10);
  const polys = {
    L: [[0, 0]].concat(V, [[0, PH]]), R: [[PW, 0]].concat(V, [[PW, PH]]),
    LT: [[0, 0]].concat(top, HL.slice().reverse()), LB: HL.concat(bot, [[0, PH]]), RT: [[PW, 0]].concat(top, HR), RB: bot.concat([[PW, PH]], HR.slice().reverse())
  };
  const cen = (pl) => pl.reduce((a, q) => [a[0] + q[0] / pl.length, a[1] + q[1] / pl.length], [0, 0]);
  Object.keys(polys).forEach(k => { polys[k] = { pl: polys[k], c: cen(polys[k]) }; });
  return (F.cuts = { V, polys });
}
function piece(ctx, F, poly, x, y, rot, sc, clipY) {
  const c = poly.c; ctx.save();
  if (clipY != null) { ctx.beginPath(); ctx.rect(0, 0, 1920, clipY); ctx.clip(); }
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-c[0], -c[1]);
  ctx.beginPath(); poly.pl.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath();
  ctx.save(); ctx.fillStyle = 'rgba(8,6,12,0.45)'; ctx.translate(10, 12); ctx.fill(); ctx.restore();
  ctx.clip(); ctx.drawImage(paperOf(F), 0, 0); if (F.stamped) stampOn(ctx, 1);
  ctx.restore();
}
function stampOn(ctx, k) {   // the red stamp, in paper space
  ctx.save(); ctx.translate(PW / 2, 330); ctx.rotate(-0.22); ctx.scale(k, k); ctx.globalAlpha *= 0.92;
  const w = 380, h = 150; U.R(ctx, -w / 2, -h / 2, w, 10, P.red); U.R(ctx, -w / 2, h / 2 - 10, w, 10, P.red); U.R(ctx, -w / 2, -h / 2, 10, h, P.red); U.R(ctx, w / 2 - 10, -h / 2, 10, h, P.red);
  U.text(ctx, '不兼容', 0, 4, 96, P.red, { shadow: false }); ctx.restore();
}
function shredder(ctx, F, t) {
  const up = eo(st4((t - T.shUp) / 0.45)), jig = F.jig > 0 && !RM() ? (Math.random() - 0.5) * F.jig : 0, y0 = SLOT_Y - 30 + (1 - up) * 420 + jig, x0 = 960 - 380 + jig;
  if (up <= 0) return;
  U.R(ctx, x0 + 14, y0 + 14, 760, 330, 'rgba(0,0,0,0.5)');
  U.plate(ctx, x0, y0, 760, 330, { fill: P.slate, hi: P.steel, lo: P.indigo });
  for (let k = 0; k < 760; k += 40) U.R(ctx, x0 + k, y0, 20, 14, k % 80 ? P.ink : (P.butter || '#ffd84a'));
  U.R(ctx, x0 + 110, y0 + 30, 540, 26, P.ink);                                   // the mouth
  if (F.jig > 0.5) { ctx.save(); ctx.globalAlpha *= Math.min(1, F.jig / 10); ctx.globalCompositeOperation = 'lighter'; U.R(ctx, x0 + 100, y0 + 20, 560, 46, 'rgba(255,74,58,0.55)'); ctx.restore(); }   // red-hot while it chews
  const tt = (t * 30) | 0; for (let k = 0; k < 27; k++) U.R(ctx, x0 + 116 + k * 20, y0 + 38 + ((k + tt) % 2) * 6, 12, 8, P.steel);   // teeth
  const hot = t > T.feed && t < T.crunch + 0.3, lamp = t > T.crunch + 0.3 ? (P.lime || '#9cff7a') : hot && (t * 8 | 0) % 2 ? P.red : '#6a2230';
  U.R(ctx, x0 + 40, y0 + 90, 40, 40, P.ink); U.R(ctx, x0 + 46, y0 + 96, 28, 28, lamp);
  U.text(ctx, '碎 纸 机', 960, y0 + 140, 40, P.cream, { outline: true });
  for (let k = 0; k < 6; k++) U.R(ctx, x0 + 180 + k * 70, y0 + 200, 44, 90, P.indigo);
}
const drawSave = function (ctx, g) {
  const F = g.saveFx; if (!F) return; const t = (now() - F.t0) / 1000;
  if (F.out != null && t - F.out > 0.45) { g.saveFx = null; if (M.saveReport) M.saveReport.done = true; g.bump && g.bump(); return; }
  if (t > T.coin + 2.6) F.out = F.out == null ? t : F.out;   // leaves by itself soon after the coins
  const out = F.out != null ? st4((t - F.out) / 0.45) : 0, wipe = F.rep.wiped;
  ctx.save(); ctx.globalAlpha = 1; M.fxDim(ctx, st4(t / 0.3) * (1 - out)); ctx.globalAlpha = 1 - out;
  // the screen shakes with the blows
  F.shk = Math.max(0, (F.shk || 0) - 1.2); F.jig = Math.max(0, (F.jig || 0) - 0.6);
  if (F.shk > 0 && !RM()) ctx.translate((Math.random() - 0.5) * F.shk, (Math.random() - 0.5) * F.shk);
  const title = (txt, col) => U.text(ctx, txt, 960, 104, 64, col, { outline: true, ramp: true });
  // 1 · the sheet drops in, is scanned row by row
  if (t < T.tear || !wipe) {
    const q = st4(t / T.drop), y = -500 + (PY0 + 500) * (q < 1 ? ei(q) : 1), sq = t > T.drop && t < T.drop + 0.12 ? 1 - Math.sin((t - T.drop) / 0.12 * Math.PI) * 0.06 : 1;
    if (t >= T.drop) snd(F, 'land', () => { S.land && S.land(2); F.shk = 10; });
    ctx.save(); ctx.translate(PX0, y + PH / 2); ctx.scale(1 + (1 - sq), sq); ctx.translate(-PW / 2, -PH);
    U.R(ctx, 14, 16, PW, PH, 'rgba(8,6,12,0.45)'); ctx.drawImage(paperOf(F), 0, 0);
    F.rows.forEach((r, k) => { const at = T.scan0 + (k + 1) * (T.scan1 - T.scan0) / (F.rows.length + 1); if (t < at) return; snd(F, 'row' + k, () => S.saveRow && S.saveRow(r.state === 'ok'));
      U.text(ctx, r.state === 'ok' ? '✔' : '✘', PW - 60, 160 + k * 70 + 28, 34, r.state === 'ok' ? '#2f8a3a' : P.red, { shadow: false }); });
    if (t > T.scan0 && t < T.scan1) { const sy = ((t - T.scan0) / (T.scan1 - T.scan0)) * PH; U.R(ctx, 0, sy - 3, PW, 6, P.ice); ctx.globalAlpha *= 0.25; U.R(ctx, 0, sy - 40, PW, 40, P.teal); ctx.globalAlpha = 1 - out; }
    if (wipe && t >= T.stamp) { const k = st4((t - T.stamp) / (T.hit - T.stamp)), sc = 2.4 - 1.4 * ei(k); if (t >= T.hit) { F.stamped = 1; snd(F, 'stamp', () => { S.stamp && S.stamp(); S.impact && S.impact(); F.shk = 26; F.flash = 1; for (let n = 0; n < 40; n++) F.ink.push({ x: PX0 + (Math.random() - 0.5) * 360, y: PY0 + 330 - PH / 2 + (Math.random() - 0.5) * 140, vx: (Math.random() - 0.5) * 900, vy: (Math.random() - 0.7) * 700, s: 4 + Math.random() * 10, t0: t }); }); }
      if (!F.stamped) { ctx.globalAlpha = (1 - out) * k; stampOn(ctx, sc); ctx.globalAlpha = 1 - out; } else stampOn(ctx, 1); }
    ctx.restore();
    title(t < T.hit ? '正在检测存档……' : wipe ? '不兼容！' : '存档正常', t < T.hit ? P.cream : wipe ? P.red : P.lime);
    if (!wipe && t > 2.2 && F.out == null) F.out = t;
  }
  // 2 · ripped in half, top to bottom; then each half across
  if (wipe && t >= T.tear) {
    const C = cutsOf(F), p = st4((t - T.tear) / (T.split - T.tear)), top = PY0 - PH / 2, left = PX0 - PW / 2;
    if (t < T.split) {
      snd(F, 'rip1', () => { S.rip && S.rip(0.6); S.tear && S.tear(1); });
      ctx.save(); ctx.translate(left, top); ctx.drawImage(paperOf(F), 0, 0); stampOn(ctx, 1);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 6; ctx.beginPath(); C.V.forEach((q, i) => { if (q[1] > p * PH) return; i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.restore();
      const fy = top + p * PH, fx = left + PW / 2; if (!RM()) for (let n = 0; n < 3; n++) F.fib.push({ x: fx + (Math.random() - 0.5) * 30, y: fy, vx: (Math.random() - 0.5) * 500, vy: -Math.random() * 300, s: 3 + Math.random() * 5, t0: t });
      F.shk = Math.max(F.shk, 5);
      title('撕！', P.red);
    } else {
      const k = eo(st4((t - T.split) / 0.35)), k2 = eo(st4((t - T.tear2) / 0.3)), gone = F.gone || {};
      snd(F, 'rip2', () => { S.shatter && S.shatter(); F.shk = 18; F.flash = 0.6; });
      if (t >= T.tear2) snd(F, 'rip3', () => { S.rip && S.rip(0.4); S.tear && S.tear(2); F.shk = 14; });
      const pcs = F.pcs || (F.pcs = [['LT', -1, -1], ['LB', -1, 1], ['RT', 1, -1], ['RB', 1, 1]].map(([k0, sx, sy], n) => ({ k: k0, sx, sy, n })));
      pcs.forEach(pc => {
        const po = C.polys[pc.k], half = pc.sx < 0 ? C.polys.L : C.polys.R;
        let x = left + half.c[0] + pc.sx * 200 * k, y = top + half.c[1], rot = pc.sx * 0.22 * k;
        if (t >= T.tear2) { x = left + po.c[0] + pc.sx * (200 + 50 * k2); y = top + po.c[1] + pc.sy * 55 * k2 + 30 * k2; rot = pc.sx * 0.22 + pc.sy * 0.22 * k2 * pc.sx; }
        // 3 · fed to the shredder, one piece after another
        const f0 = T.feed + pc.n * 0.3, fq = st4((t - f0) / 0.4);
        if (fq > 0) { const e2 = ei(fq); x += (960 - x) * e2; y += (SLOT_Y + 120 - y) * e2; rot += (0 - rot) * e2; if (fq >= 0.62) snd(F, 'eat' + pc.n, () => { S.glitch && S.glitch(); S.rip && S.rip(0.3); F.shk = 12; F.jig = 10; for (let n = 0; n < 34; n++) F.strips.push({ x: 960 + (Math.random() - 0.5) * 420, y: SLOT_Y - 10, vx: (Math.random() - 0.5) * 1200, vy: -500 - Math.random() * 900, w: 8 + Math.random() * 6, h: 26 + Math.random() * 40, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 18, t0: t }); }); }
        if (fq < 1) piece(ctx, F, t >= T.tear2 ? po : half, x, y, rot, 1 - 0.3 * ei(fq), fq > 0 ? SLOT_Y + 8 : null);
      });
      title(t < T.feed ? '撕！' : t < T.crunch ? '粉碎！' : '', P.red);
    }
  }
  if (wipe) shredder(ctx, F, t);
  // 4 · the last crunch
  if (wipe && t >= T.crunch) snd(F, 'crunch', () => { S.boom && S.boom(); S.impact && S.impact(); F.shk = 30; F.flash = 1; F.jig = 16; for (let n = 0; n < 160; n++) F.strips.push({ x: 960 + (Math.random() - 0.5) * 520, y: SLOT_Y, vx: (Math.random() - 0.5) * 1800, vy: -900 - Math.random() * 1100, w: 6 + Math.random() * 8, h: 14 + Math.random() * 36, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, t0: t, col: n % 7 === 0 ? P.red : null }); });
  if (wipe && t >= T.crunch && t < T.crunch + 0.6) { const q = (t - T.crunch) / 0.6; ctx.save(); ctx.globalAlpha = (1 - q) * (1 - out); ctx.strokeStyle = P.cream; ctx.lineWidth = 12 * (1 - q) + 2; ctx.beginPath(); ctx.ellipse(960, SLOT_Y, 80 + q * 900, 30 + q * 300, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  // flying bits: ink, fibres, strips
  const phys = (a, life, draw) => { for (let n = a.length - 1; n >= 0; n--) { const o = a[n], k = t - o.t0; if (k > life) { a.splice(n, 1); continue; } draw(o, k); } };
  phys(F.ink, 1.2, (o, k) => { ctx.globalAlpha = (1 - k / 1.2) * (1 - out); U.R(ctx, o.x + o.vx * k, o.y + o.vy * k + 900 * k * k, o.s, o.s, P.red); });
  phys(F.fib, 0.8, (o, k) => { ctx.globalAlpha = (1 - k / 0.8) * (1 - out); U.R(ctx, o.x + o.vx * k, o.y + o.vy * k + 1200 * k * k, o.s, o.s, '#f2e8cf'); });
  phys(F.strips, 2.6, (o, k) => { ctx.save(); ctx.globalAlpha = st4(1 - k / 2.6) * (1 - out); ctx.translate(o.x + o.vx * k, o.y + o.vy * k + 1500 * k * k); ctx.rotate(o.rot + o.vr * k); U.R(ctx, -o.w / 2, -o.h / 2, o.w, o.h, o.col || '#f2e8cf'); U.R(ctx, -o.w / 2, -o.h / 2 + o.h * 0.3, o.w, 2, P.ink); ctx.restore(); });
  ctx.globalAlpha = 1 - out;
  // 5 · the compensation: coins out of the machine into the counter
  if (wipe && t >= T.coin) {
    const N = F.N, q = st4((t - T.coin - 0.2) / 1.4), shown = Math.round(N * eo(q)), cy = 330;
    if (N > 0) {
      snd(F, 'c0', () => { S.coinRoll && S.coinRoll(); });
      if (!RM() && q < 1 && Math.random() < 0.8) F.coins.push({ x: 960 + (Math.random() - 0.5) * 300, y: SLOT_Y - 20, t0: t, tx: 960 + (Math.random() - 0.5) * 120, dur: 0.55 + Math.random() * 0.25 });
      phys(F.coins, 0.8, (o, k) => { if (k > o.dur) return; const u = k / o.dur, x = o.x + (o.tx - o.x) * u, y = o.y + (cy - o.y) * u - Math.sin(u * Math.PI) * 220; const im = M.spriteCanvas && M.spriteCanvas('coin', 4); if (im) ctx.drawImage(im, x - 20, y - 20, 40, 40); else U.R(ctx, x - 12, y - 12, 24, 24, P.gold); if (u > 0.9) snd(F, 'tk' + ((k * 20) | 0) % 6, () => {}); });
      if (q < 1 && ((t * 14) | 0) !== F.lastTick) { F.lastTick = (t * 14) | 0; try { S.numTick && S.numTick(q); } catch (e) {} }
      if (q >= 1) snd(F, 'cdone', () => { S.coin && S.coin(3); F.shk = 8; });
      const pop = q >= 1 ? 1 + 0.12 * Math.max(0, 1 - (t - T.coin - 1.6) / 0.25) : 1;
      ctx.save(); ctx.translate(960, cy); ctx.scale(pop, pop); U.box(ctx, -300, -70, 600, 140, P.abyss, P.gold);
      U.text(ctx, '机台补偿', 0, -28, 34, P.cream, { shadow: false }); U.text(ctx, '+' + shown + ' 代币', 0, 30, 64, P.gold, { outline: true, ramp: true }); ctx.restore();
    }
    title('', P.cream);
    U.text(ctx, '存档和当前版本对不上，已整份粉碎。', 960, 480, 32, P.cream, { outline: true });
    if (t > T.coin + 1.8) { ctx.globalAlpha = (1 - out) * (0.55 + 0.45 * Math.abs(Math.sin(t * 3))); U.text(ctx, N > 0 ? '代币已放进机台 · 点击继续' : '点击继续', 960, 560, 28, P.lavender || '#a9a3c9', { outline: true }); ctx.globalAlpha = 1 - out; }
  }
  if (F.flash > 0 && !RM()) { ctx.globalAlpha = F.flash * 0.7 * (1 - out); U.R(ctx, -40, -40, 2000, 1160, '#fffaf0'); F.flash = Math.max(0, F.flash - 0.12); }
  ctx.restore();
};
// the effects layer sits under the intro scene by default; lift it while the shredding plays, and take the clicks
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.saveFx) { v.fxZ = 90; v.coverOn = true; v.coverClick = () => { const F = this.saveFx; if (!F) return; const t = (now() - F.t0) / 1000;
    // a click never waits (2026-09-27: 「粉碎存档……卡很久」): during the shredding it jumps to the coins, after that it goes on
    if (F.rep.wiped && t < T.coin) { F.t0 -= (T.coin - t) * 1000; F.hush = now() + 120; S.click && S.click(); return; } if (F.out == null) { F.out = t; S.click && S.click(); } }; } return v; };
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt); const fc = this.ui && this.ui.cv('fx');
  // the page can build a throwaway game instance while booting: whichever instance is still ticking on a live canvas owns
  // the shredding, and takes it over if the previous owner stopped ticking
  const R = M.saveReport;
  if (R && !R.done && fc && fc.isConnected && (!R.owner || R.owner === this || now() - (R.ownerT || 0) > 400)) {
    if (R.owner !== this) {
      if (!R.shown) { try { M.T && M.T.ev('savecheck', { wiped: R.wiped, rows: R.rows.map(x => [x.n, x.state]) }); } catch (e) {} }
      R.owner = this; R.shown = 1; del(K_REP);
      // the compensation goes into the cabinet once, by the instance that shows it
      let N = 0; const c = (() => { try { return JSON.parse(get(K_COMP)); } catch (e) { return null; } })();
      if (c) { N = M.saveCompN(c); if (N > 0 && this.prof) { this.prof.tokens = (this.prof.tokens || 0) + N; this.saveProfile(); } del(K_COMP); R.compN = N; } else N = R.compN || 0;
      this.saveFx = { t0: now() + 300, rep: R, rows: R.rows, s: {}, ink: [], fib: [], strips: [], coins: [], N };
    }
    R.ownerT = now();
  }
  if (this.saveFx && R && R.owner === this && now() >= this.saveFx.t0 && fc) drawSave(fc.getContext('2d'), this);
};
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.saveFx || oLS.apply(this, arguments); };
})();
