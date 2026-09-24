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
    if (!isObj(h) || !M.HEROES[h.cls] || !intIn(h.rarity, 0, 3) || !intIn(h.lv, 1, 10) || !isNum(h.exp) || !isNum(h.hp) || typeof h.name !== 'string') return false;
    if (!isObj(h.tree) || !isObj(h.taken)) return false;
    for (const b of ['atk', 'def', 'luck']) { const t = h.tree[b]; if (!Array.isArray(t) || t.some(x => !isObj(x) || !isObj(x.m))) return false; if (!intIn(h.taken[b], 0, t.length)) return false; }
    return true;
  };
  const TAL_SWAP = { fire: 'rngAtk', beastAs: 'warAs', shortRed: 'vanHp' }, TAL_BY = {}; Object.keys(M.TALENTS).forEach(b => M.TALENTS[b].forEach(t => { TAL_BY[Object.keys(t.m)[0]] = t; }));
  relics.forEach(r => { if (r.lines.some(l => l.k === 'shortRed')) { r.lines = M.relicLines(r.key, r.q); mig = true; } });
  const heroes = m.heroes.filter(okHero);
  if (heroes.length < m.heroes.length) note('领袖', m.heroes.length - heroes.length);
  heroes.forEach(h => {
    if (!intIn(h.points, 0, 20)) h.points = 0;
    // personalities and personal names were removed from the design: drop them without reporting damage
    if ('quirks' in h || h.name !== M.heroN(h) || (isObj(h.status) && h.status.kind === 'sanitarium')) mig = true;
    // talents: refresh words from the table, replace the ones whose effect no longer exists (火 / 兽 tags, score targets)
    Object.keys(h.tree).forEach(b => h.tree[b].forEach(t => { const k0 = Object.keys(t.m)[0], k = TAL_SWAP[k0] || k0, T = TAL_BY[k]; if (!T) return; if (t.n !== T.n || t.d !== T.d || k !== k0) { t.n = T.n; t.d = T.d; t.m = Object.assign({}, T.m); mig = true; } }));
    delete h.quirks; h.name = M.heroN(h); if (isObj(h.status) && h.status.kind === 'sanitarium') h.status = null;
    h.relics = (Array.isArray(h.relics) ? h.relics : []).filter(id => rid.has(id));
    if (h.status != null && !isObj(h.status)) h.status = null; if (!isNum(h.runs)) h.runs = 0;
  });
  m.heroes = heroes.length ? heroes : D.heroes;
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
const CARD = { w: 620, x: 650, y: 250 };
const drawSave = function (ctx, g) {
  const F = g.saveFx; if (!F) return; const t = (now() - F.t0) / 1000, R = F.rep, all = R.rows, wipeAll = !all.some(r => r.state === 'ok' || r.state === 'cut') && R.wiped;
  const rowH = 58, h = 150 + all.length * rowH, x0 = CARD.x, y0 = 540 - h / 2, T_SCAN = 0.5, T_TEAR = 0.6 + all.length * 0.22 + 0.3, T_END = T_TEAR + 3.4;
  if (t > T_END) { g.saveFx = null; if (M.saveReport) M.saveReport.done = true; return; }
  const snd = (k, at, fn) => { if (t >= at && !F.s[k]) { F.s[k] = 1; try { fn(); } catch (e) {} } };
  const fin = t > T_END - 0.5 ? cl((T_END - t) / 0.5, 0, 1) : 1;
  ctx.save(); ctx.fillStyle = 'rgba(3,2,6,' + (0.82 * cl(t / 0.3, 0, 1) * fin) + ')'; ctx.fillRect(0, 0, 1920, 1080);
  // title
  ctx.globalAlpha = fin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = "700 40px 'Noto Serif SC',serif"; ctx.fillStyle = '#e8dcc4'; ctx.fillText(t < T_TEAR ? '正在检测存档……' : wipeAll ? '存档与当前版本不兼容，已粉碎' : '不兼容的部分已粉碎，其余存档保留', 960, y0 - 70);
  // the card, row by row; broken rows are torn off and shattered
  const slide = eo(cl(t / 0.4, 0, 1)), cx = x0, cy = y0 + (1 - slide) * 80;
  const split = wipeAll ? eo(cl((t - T_TEAR) / 0.5, 0, 1)) : 0;
  const drawRow = (r, i, dx, dy, rot, alpha) => {
    const ry = cy + 110 + i * rowH; ctx.save(); ctx.globalAlpha = alpha * fin; ctx.translate(cx + CARD.w / 2 + dx, ry + rowH / 2 + dy); ctx.rotate(rot);
    const scanned = t > T_SCAN + i * 0.22, bad = scanned && r.state !== 'ok';
    ctx.fillStyle = bad ? '#2a1014' : '#1a1520'; ctx.fillRect(-CARD.w / 2 + 20, -rowH / 2 + 4, CARD.w - 40, rowH - 8);
    ctx.textAlign = 'left'; ctx.font = "600 26px 'Noto Serif SC',serif"; ctx.fillStyle = bad ? '#ff8a8a' : '#e8dcc4'; ctx.fillText(r.n, -CARD.w / 2 + 40, 0);
    ctx.textAlign = 'right'; ctx.font = "600 22px 'Noto Serif SC',serif"; ctx.fillStyle = !scanned ? '#6b6570' : bad ? '#ff4a5a' : '#9cff7a'; ctx.fillText(!scanned ? '……' : bad ? '✘ ' + (r.why || '不兼容') : '✔ 正常', CARD.w / 2 - 40, 0);
    ctx.restore();
  };
  // card body (halves when the whole save goes)
  const body = (dx, rot, clipL) => { ctx.save(); ctx.globalAlpha = fin * (1 - (wipeAll ? cl((t - T_TEAR - 0.6) / 0.2, 0, 1) : 0)); ctx.translate(cx + CARD.w / 2 + dx, cy + h / 2); ctx.rotate(rot); ctx.beginPath(); if (clipL != null) { const zig = []; for (let k = 0; k <= 12; k++) zig.push([(k % 2 ? 14 : -14), -h / 2 + k * h / 12]); if (clipL) { ctx.moveTo(-CARD.w / 2, -h / 2); zig.forEach(([zx, zy]) => ctx.lineTo(zx, zy)); ctx.lineTo(-CARD.w / 2, h / 2); } else { ctx.moveTo(CARD.w / 2, -h / 2); zig.forEach(([zx, zy]) => ctx.lineTo(zx, zy)); ctx.lineTo(CARD.w / 2, h / 2); } ctx.closePath(); ctx.clip(); }
    const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, '#2e2436'); gr.addColorStop(1, '#100c14'); ctx.fillStyle = gr; ctx.fillRect(-CARD.w / 2, -h / 2, CARD.w, h);
    ctx.strokeStyle = '#c8a060'; ctx.lineWidth = 4; ctx.strokeRect(-CARD.w / 2 + 6, -h / 2 + 6, CARD.w - 12, h - 12);
    ctx.textAlign = 'center'; ctx.font = "900 44px 'Cinzel','Noto Serif SC',serif"; ctx.fillStyle = '#ffe08a'; ctx.fillText('午夜机台 · 存档', 0, -h / 2 + 60); ctx.restore(); };
  if (!wipeAll || split < 1) { if (wipeAll && split > 0) { body(-split * 140, -split * 0.12, true); body(split * 140, split * 0.12, false); } else body(0, 0, null); }
  // scan line
  if (t > T_SCAN && t < T_TEAR) { const sy = cy + 110 + ((t - T_SCAN) / (T_TEAR - T_SCAN - 0.3)) * all.length * rowH; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(120,220,255,0.35)'; ctx.fillRect(cx + 10, sy - 3, CARD.w - 20, 6); ctx.globalCompositeOperation = 'source-over'; }
  all.forEach((r, i) => {
    const bad = r.state !== 'ok'; const tt = t - T_TEAR - i * 0.12;
    if (!bad || tt < 0) { if (!(wipeAll && split > 0)) drawRow(r, i, 0, 0, 0, 1); else drawRow(r, i, (i % 2 ? 1 : -1) * split * 140, 0, (i % 2 ? 1 : -1) * split * 0.12, 1 - cl((t - T_TEAR - 0.6) / 0.2, 0, 1)); return; }
    // tear: the strip jerks sideways, then bursts into shards
    if (!F.s['tear' + i]) { F.s['tear' + i] = 1; try { S.whoosh && S.whoosh(0.25); } catch (e) {} }
    if (tt < 0.35) { const k = eo(tt / 0.35); drawRow(r, i, (i % 2 ? 1 : -1) * k * 60, -k * 20, (i % 2 ? 1 : -1) * k * 0.2, 1); return; }
    if (!F.shards[i]) { F.shards[i] = []; const ry = cy + 110 + i * rowH + rowH / 2; for (let k = 0; k < 46; k++) F.shards[i].push({ x: cx + 40 + Math.random() * (CARD.w - 80), y: ry + (Math.random() - 0.5) * rowH, vx: (Math.random() - 0.5) * 900, vy: -300 - Math.random() * 600, s: 6 + Math.random() * 16, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, col: Math.random() < 0.5 ? '#ff4a5a' : Math.random() < 0.5 ? '#2e2436' : '#c8a060', t0: t }); try { S.shatter && S.shatter(); } catch (e) {} if (g.fx && g.fx.kick) g.fx.kick(10); }
  });
  if (wipeAll && split >= 1 && !F.shards.all) { F.shards.all = []; for (let k = 0; k < 220; k++) F.shards.all.push({ x: cx + Math.random() * CARD.w, y: cy + Math.random() * h, vx: (Math.random() - 0.5) * 1400, vy: -500 - Math.random() * 700, s: 8 + Math.random() * 22, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: ['#2e2436', '#c8a060', '#ffe08a', '#ff4a5a', '#100c14'][k % 5], t0: t }); try { S.impact && S.impact(); S.shatter && S.shatter(); } catch (e) {} if (g.fx && g.fx.flash) g.fx.flash('#ff2a4a', 0.5); if (g.fx && g.fx.kick) g.fx.kick(26); }
  Object.values(F.shards).forEach(list => (list || []).forEach(p => { const k = t - p.t0; if (k > 2.4) return; ctx.save(); ctx.globalAlpha = cl(1 - k / 2.4, 0, 1) * fin; ctx.translate(p.x + p.vx * k, p.y + p.vy * k + 1400 * k * k); ctx.rotate(p.rot + p.vr * k); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(-p.s / 2, -p.s / 3); ctx.lineTo(p.s / 2, -p.s / 2); ctx.lineTo(p.s / 3, p.s / 2); ctx.closePath(); ctx.fill(); ctx.restore(); }));
  // verdict
  if (t > T_TEAR + 1) { const q = eo(cl((t - T_TEAR - 1) / 0.4, 0, 1)); ctx.globalAlpha = q * fin; ctx.textAlign = 'center'; ctx.font = "700 30px 'Noto Serif SC',serif"; ctx.fillStyle = '#cfc6b8'; ctx.fillText(wipeAll ? '不影响游戏：直接开始新的一局就好。' : '修好的存档可以继续玩。', 960, y0 + h + 70); }
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
