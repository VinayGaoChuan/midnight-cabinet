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
  if (!Array.isArray(cells) || cells.length !== BR || cells.some(row => !Array.isArray(row) || row.length !== BC)) { m.base = D.base; note('基地布局'); }
  else for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++) {
    let x = cells[r][c]; if (!isObj(x)) { cells[r][c] = x = { dug: false, tile: null, b: null, job: null }; note('基地房间'); }
    if (x.b === 'sanitarium') { x.b = null; m.supplies += 90; mig = true; }
    if (x.b && x.tile === 'ruin') { x.tile = null; mig = true; }   // the ruin's effect is spent once the room stands   // the 疗养室 was removed with the personalities: refund it
    if (isObj(x.job) && x.job.key === 'sanitarium') { x.job = null; m.supplies += 90; mig = true; }
    if (x.b != null && !M.BUILDINGS[x.b]) { x.b = null; note('基地房间'); }
    if (x.tile != null && !M.TILES[x.tile]) { x.tile = null; note('地格'); }
    if (x.job != null && !(isObj(x.job) && (x.job.kind === 'dig' || (x.job.kind === 'build' && M.BUILDINGS[x.job.key])) && isNum(x.job.days))) { x.job = null; note('工程'); }
    x.dug = !!(x.dug || x.b);
  }
  const co = m.base.cells[M.CORE.r][M.CORE.c]; if (co.b !== 'core') { Object.assign(co, { b: 'core', dug: true, job: null }); note('基地核心房间'); }
  // relics
  const relics = m.relics.filter(r => isObj(r) && M.RELICS[r.key] && intIn(r.q, 0, 3) && r.id != null);
  if (relics.length < m.relics.length) note('宝物', m.relics.length - relics.length);
  relics.forEach(r => { if (!Array.isArray(r.lines)) r.lines = M.relicLines(r.key, r.q); }); m.relics = relics;
  const rid = new Set(relics.map(r => r.id));
  // leaders
  const okHero = (h) => {
    if (!isObj(h) || !M.HEROES[h.cls] || !intIn(h.rarity, 0, 3) || !intIn(h.lv, 1, M.LV_MAX || 20) || !isNum(h.exp) || !isNum(h.hp) || typeof h.name !== 'string') return false;
    return true;   // talents: a broken or old-style tree is replaced below, not a reason to drop the leader
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
const rows = [], rep = { rows, wiped: false, fixed: false };
const addRow = (n, state, why) => rows.push({ n, state, why });
OLD.forEach(k => { if (get(k) != null) { del(k); addRow('旧版本存档', 'wipe', '和当前版本不兼容'); rep.wiped = true; } });
const rm = get(K_META);
if (rm != null) {
  const r = checkMeta(rm);
  if (r.wipe) { del(K_META); addRow('局内存档', 'wipe', r.wipe); rep.wiped = true; }
  else { const ks = Object.keys(r.cut); if (ks.length) { put(K_META, r.m); ks.forEach(k => addRow(k, 'cut', r.cut[k] + ' 处不兼容，已清掉')); rep.fixed = true; } else { if (r.mig) put(K_META, r.m); addRow('局内存档 · 第 ' + r.m.day + ' 天', 'ok'); } }
}
const rp = get(K_PROF);
if (rp != null) {
  const r = checkProfile(rp);
  if (r.wipe) { del(K_PROF); addRow('局外房间', 'wipe', r.wipe); rep.wiped = true; }
  else { const ks = Object.keys(r.cut); if (ks.length) { put(K_PROF, r.p); ks.forEach(k => addRow('局外 · ' + k, 'cut', r.cut[k] + ' 处不兼容，已清掉')); rep.fixed = true; } else addRow('局外房间', 'ok'); }
}
const rs = get(K_SET);
if (rs != null) { let s = null; try { s = JSON.parse(rs); } catch (e) {} if (!isObj(s)) { del(K_SET); addRow('设置', 'wipe', '设置文件损坏'); rep.wiped = true; M.settings = M.loadSettings(); } }
// the page may evaluate this script more than once while it boots: the first pass already repaired the save, so the
// report is parked in storage until the shredding has been shown
const K_REP = 'midnight-cabinet-savecheck';
if (rep.wiped || rep.fixed) put(K_REP, rep);
let parked = null; try { parked = JSON.parse(get(K_REP)); } catch (e) {}
M.saveReport = (rep.wiped || rep.fixed) ? rep : (parked && parked.rows ? parked : null);
M.saveCheck = { checkMeta, checkProfile };

// ───────── the shredding ─────────
// Pixel Juice（docs/design.md §11.5）：存档卡 = 机台维修模式的小屏（石板色机框、深渊色屏幕、青色字、扫描线）
const U = M.UI, P = M.PJ.PAL, RM = () => !!M.PJ.reduced, stepT = (t) => t, st4 = (v) => cl(v, 0, 1);
const frame = (x, a, b, w, h, k, c) => { U.R(x, a, b, w, k, c); U.R(x, a, b + h - k, w, k, c); U.R(x, a, b, k, h, c); U.R(x, a + w - k, b, k, h, c); };
const CARD = { w: 620, x: 650, y: 250 };
const drawSave = function (ctx, g) {
  const F = g.saveFx; if (!F) return; const t = (now() - F.t0) / 1000, R = F.rep, all = R.rows, wipeAll = !all.some(r => r.state === 'ok' || r.state === 'cut') && R.wiped;
  const rowH = 58, h = 150 + all.length * rowH, x0 = CARD.x, y0 = 540 - h / 2, T_SCAN = 0.5, T_TEAR = 0.6 + all.length * 0.22 + 0.3, T_END = T_TEAR + 3.4;
  if (t > T_END) { g.saveFx = null; if (M.saveReport) M.saveReport.done = true; return; }
  const snd = (k, at, fn) => { if (t >= at && !F.s[k]) { F.s[k] = 1; try { fn(); } catch (e) {} } };
  const fin = t > T_END - 0.5 ? st4((T_END - t) / 0.5) : 1, ts = stepT(t, 12);
  ctx.save(); M.fxDim(ctx, st4(t / 0.3) * fin);
  // title
  ctx.globalAlpha = fin; U.text(ctx, t < T_TEAR ? '正在检测存档……' : wipeAll ? '存档与当前版本不兼容，已粉碎' : '不兼容的部分已粉碎，其余存档保留', 960, y0 - 70, 40, P.cream);
  // the card, row by row; broken rows are torn off and shattered
  const slide = eo(cl(ts / 0.4, 0, 1)), cx = x0, cy = y0 + Math.round((1 - slide) * 80);
  const split = wipeAll ? eo(cl((ts - T_TEAR) / 0.5, 0, 1)) : 0;
  const drawRow = (r, i, dx, dy, rot, alpha) => {
    const ry = cy + 110 + i * rowH; ctx.save(); ctx.globalAlpha = alpha * fin; ctx.translate(cx + CARD.w / 2 + dx, ry + rowH / 2 + dy); ctx.rotate(rot);
    const scanned = t > T_SCAN + i * 0.22, bad = scanned && r.state !== 'ok', rw = CARD.w - 80, rh = rowH - 14;
    // 行 = 凹槽：深渊色底 + 3px 圈（正常深青、坏的红）+ 顶上 3px 墨影
    U.box(ctx, -rw / 2, -rh / 2, rw, rh, P.abyss, bad ? P.red : P.tealDeep); U.R(ctx, -rw / 2, -rh / 2, rw, 3, P.ink);
    U.text(ctx, r.n, -rw / 2 + 18, 0, 26, bad ? P.pink : P.teal, { align: 'left', shadow: false });
    U.text(ctx, !scanned ? '……' : bad ? '✘ ' + (r.why || '不兼容') : '✔ 正常', rw / 2 - 18, 0, 22, !scanned ? P.haze : bad ? P.red : P.lime, { align: 'right', shadow: false });
    ctx.restore();
  };
  // card body (halves when the whole save goes): 石板色机框（钢色上沿、靛蓝下沿、铆钉、12px 硬投影）+ 屏幕（6px 墨边、3px 深青内圈）
  const body = (dx, rot, clipL) => { ctx.save(); ctx.globalAlpha = fin * (1 - (wipeAll ? cl((t - T_TEAR - 0.6) / 0.2, 0, 1) : 0)); ctx.translate(cx + CARD.w / 2 + dx, cy + h / 2); ctx.rotate(rot); ctx.beginPath(); if (clipL != null) { const zig = []; for (let k = 0; k <= 12; k++) zig.push([(k % 2 ? 14 : -14), -h / 2 + k * h / 12]); if (clipL) { ctx.moveTo(-CARD.w / 2, -h / 2); zig.forEach(([zx, zy]) => ctx.lineTo(zx, zy)); ctx.lineTo(-CARD.w / 2, h / 2); } else { ctx.moveTo(CARD.w / 2, -h / 2); zig.forEach(([zx, zy]) => ctx.lineTo(zx, zy)); ctx.lineTo(CARD.w / 2, h / 2); } ctx.closePath(); ctx.clip(); }
    const W2 = CARD.w / 2, H2 = h / 2; U.plate(ctx, -W2, -H2, CARD.w, h, { fill: P.slate, hi: P.steel, lo: P.indigo });
    U.R(ctx, -W2 + 24, -H2 + 24, CARD.w - 48, h - 48, P.ink); U.R(ctx, -W2 + 30, -H2 + 30, CARD.w - 60, h - 60, P.abyss); frame(ctx, -W2 + 30, -H2 + 30, CARD.w - 60, h - 60, 3, P.tealDeep);
    // 标题：冰青像素字 + 3px 深青影，下面一条深青虚线
    U.text(ctx, '午夜机台 · 存档', 3, -H2 + 63, 40, P.tealDeep, { shadow: false }); U.text(ctx, '午夜机台 · 存档', 0, -H2 + 60, 40, P.ice, { shadow: false });
    for (let k = -W2 + 48; k < W2 - 57; k += 15) U.R(ctx, k, -H2 + 92, 9, 3, P.tealDeep);
    ctx.restore(); };
  if (!wipeAll || split < 1) { if (wipeAll && split > 0) { body(-split * 140, -split * 0.12, true); body(split * 140, split * 0.12, false); } else body(0, 0, null); }
  all.forEach((r, i) => {
    const bad = r.state !== 'ok'; const tt = t - T_TEAR - i * 0.12;
    if (!bad || tt < 0) { if (!(wipeAll && split > 0)) drawRow(r, i, 0, 0, 0, 1); else drawRow(r, i, (i % 2 ? 1 : -1) * split * 140, 0, (i % 2 ? 1 : -1) * split * 0.12, 1 - cl((t - T_TEAR - 0.6) / 0.2, 0, 1)); return; }
    // tear: the strip jerks sideways, then bursts into shards
    if (!F.s['tear' + i]) { F.s['tear' + i] = 1; try { S.whoosh && S.whoosh(0.25); } catch (e) {} }
    if (tt < 0.35) { const k = eo(stepT(tt, 12) / 0.35); drawRow(r, i, (i % 2 ? 1 : -1) * k * 60, -k * 20, (i % 2 ? 1 : -1) * k * 0.2, 1); return; }
    if (!F.shards[i]) { F.shards[i] = []; const ry = cy + 110 + i * rowH + rowH / 2; for (let k = 0; k < 46; k++) F.shards[i].push({ x: cx + 40 + Math.random() * (CARD.w - 80), y: ry + (Math.random() - 0.5) * rowH, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 600, s: 6 + Math.random() * 16, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, col: Math.random() < 0.5 ? P.red : Math.random() < 0.5 ? P.abyss : P.tealDeep, t0: t }); try { S.shatter && S.shatter(); } catch (e) {} if (g.fx && g.fx.kick) g.fx.kick(10); }
  });
  // scan line: 3px 冰青硬条 + 3px 青色余光，按 3px 一格往下走
  if (t > T_SCAN && t < T_TEAR) { const sy = Math.min(cy + h - 36, Math.round((cy + 110 + ((t - T_SCAN) / (T_TEAR - T_SCAN - 0.3)) * all.length * rowH) / 3) * 3); ctx.globalAlpha = 0.8 * fin; U.R(ctx, cx + 30, sy - 3, CARD.w - 60, 3, P.ice); ctx.globalAlpha = 0.4 * fin; U.R(ctx, cx + 30, sy, CARD.w - 60, 3, P.teal); ctx.globalAlpha = fin; }
  // CRT 扫描线：每 6px 一条 3px 墨色横纹，两格跳
  if (!(wipeAll && split > 0)) { const off = RM() ? 0 : 1.5 - 1.5 * Math.cos(t * 5 * Math.PI); ctx.save(); ctx.globalAlpha = 0.3 * fin; ctx.fillStyle = P.ink; for (let yy = cy + 30 + off; yy < cy + h - 33; yy += 6) ctx.fillRect(cx + 30, yy, CARD.w - 60, 3); ctx.restore(); }
  if (wipeAll && split >= 1 && !F.shards.all) { F.shards.all = []; for (let k = 0; k < 220; k++) F.shards.all.push({ x: cx + Math.random() * CARD.w, y: cy + Math.random() * h, vx: (Math.random() - 0.5) * 1400, vy: -500 - Math.random() * 700, s: 8 + Math.random() * 22, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: [P.slate, P.steel, P.teal, P.red, P.abyss][k % 5], t0: t }); try { S.impact && S.impact(); S.shatter && S.shatter(); } catch (e) {} if (g.fx && g.fx.flash) g.fx.flash(P.red, 0.5); if (g.fx && g.fx.kick) g.fx.kick(26); }
  Object.values(F.shards).forEach(list => (list || []).forEach(p => { const k = t - p.t0; if (k > 2.4) return; ctx.save(); ctx.globalAlpha = st4(1 - k / 2.4) * fin; ctx.translate(p.x + p.vx * k, p.y + p.vy * k + 1400 * k * k); ctx.rotate(p.rot + p.vr * k); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-p.s / 2, -p.s / 3); ctx.lineTo(p.s / 2, -p.s / 2); ctx.lineTo(p.s / 3, p.s / 2); ctx.closePath(); ctx.fill(); ctx.restore(); }));
  // verdict
  if (t > T_TEAR + 1) { ctx.globalAlpha = st4(eo(cl((t - T_TEAR - 1) / 0.4, 0, 1))) * fin; U.text(ctx, wipeAll ? '不影响游戏：直接开始新的一局就好。' : '修好的存档可以继续玩。', 960, y0 + h + 70, 30, P.cream); }
  ctx.restore();
  snd('scan', 0.1, () => S.whoosh && S.whoosh(0.3));
};
// the effects layer sits under the intro scene by default; lift it while the shredding plays
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.saveFx) v.fxZ = 60; return v; };
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt); const fc = this.ui && this.ui.cv('fx');
  // the page can build a throwaway game instance while booting: whichever instance is still ticking on a live canvas owns
  // the shredding, and takes it over if the previous owner stopped ticking
  const R = M.saveReport;
  if (R && !R.done && fc && fc.isConnected && (!R.owner || R.owner === this || now() - (R.ownerT || 0) > 400)) {
    if (R.owner !== this) { if (!R.shown) { try { M.T && M.T.ev('savecheck', { wiped: R.wiped, fixed: R.fixed, rows: R.rows.map(x => [x.n, x.state]) }); } catch (e) {} } R.owner = this; R.shown = 1; del(K_REP); this.saveFx = { t0: now() + 300, rep: R, s: {}, shards: {} }; }
    R.ownerT = now();
  }
  if (this.saveFx && R && R.owner === this && now() >= this.saveFx.t0 && fc) drawSave(fc.getContext('2d'), this);
};
})();

;
