// ==== mc-bring.js ====
(function () {
// What an expedition can bring home is not only supplies, blueprints, exp and shards. Keepsakes ('gift:<kind>' in
// run.loot.bp) each change the base in their own way: a new leader, a free dig, builders, portal repairs, a talent point,
// a tempered relic, calmer minds, a quieter raid, a free recruit, more power, a packed bag for the next trip.
// Relics and buildings themselves never come home — only their blueprints. Everything is lost if the leader dies.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();

// ───────── icons (sprites fall back to the vector icon library) ─────────
const IC = M.IC;
const C = (x, col) => { x.fillStyle = col; };
const circ = (x, cx, cy, r, col) => { C(x, col); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
const rect = (x, a, b, w, h, col) => { C(x, col); x.fillRect(a, b, w, h); };
const poly = (x, pts, col) => { C(x, col); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const line = (x, a, b, c, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
IC.g_gate = (x) => { rect(x, 6, 6, 5, 22, '#8a8090'); rect(x, 21, 6, 5, 22, '#8a8090'); rect(x, 4, 3, 24, 5, '#caa84a'); rect(x, 11, 9, 10, 19, '#5fd0c0'); circ(x, 16, 16, 3, '#e0fff5'); };
IC.g_scroll = (x) => { rect(x, 7, 5, 18, 22, '#f0e0b0'); rect(x, 5, 3, 22, 4, '#b09a6a'); rect(x, 5, 25, 22, 4, '#b09a6a'); line(x, 10, 12, 22, 12, 2, '#8a6a3a'); line(x, 10, 17, 22, 17, 2, '#8a6a3a'); circ(x, 16, 22, 3, '#ffcc33'); };
IC.g_anvil = (x) => { poly(x, [[4, 11], [26, 11], [28, 8], [22, 8], [22, 6], [8, 6], [8, 9], [4, 9]], '#9aa0aa'); rect(x, 11, 12, 10, 8, '#6a707a'); rect(x, 7, 20, 18, 5, '#4a505a'); circ(x, 20, 4, 2.4, '#ff8a3a'); circ(x, 25, 3, 1.6, '#ffcc33'); };
IC.g_incense = (x) => { rect(x, 8, 22, 16, 6, '#8a5a30'); line(x, 12, 22, 12, 8, 2, '#c8a060'); line(x, 20, 22, 20, 10, 2, '#c8a060'); C(x, 'rgba(220,220,255,0.8)'); x.beginPath(); x.arc(13, 5, 3, 0, 7); x.arc(19, 4, 2.4, 0, 7); x.fill(); };
IC.g_powder = (x) => { poly(x, [[10, 12], [22, 12], [25, 27], [7, 27]], '#6a5a8a'); rect(x, 12, 7, 8, 6, '#4a3a6a'); circ(x, 8, 7, 2, '#c8b0ff'); circ(x, 24, 6, 2.4, '#c8b0ff'); circ(x, 27, 12, 1.6, '#c8b0ff'); };
IC.g_letter = (x) => { rect(x, 4, 8, 24, 17, '#f5ead4'); poly(x, [[4, 8], [28, 8], [16, 18]], '#d8c8a8'); circ(x, 16, 18, 3.4, '#d0453c'); };
IC.g_battery = (x) => { rect(x, 8, 6, 16, 22, '#3a4050'); rect(x, 12, 3, 8, 4, '#8a8f99'); rect(x, 11, 10, 10, 15, '#9cff7a'); poly(x, [[17, 11], [13, 18], [16, 18], [15, 24], [19, 16], [16, 16]], '#ffffff'); };
IC.g_pack = (x) => { rect(x, 7, 9, 18, 18, '#8a5a30'); rect(x, 9, 5, 14, 6, '#6a4020'); rect(x, 9, 15, 14, 3, '#caa84a'); rect(x, 13, 18, 6, 5, '#caa84a'); };
IC.g_miner = (x) => { circ(x, 16, 14, 7, '#f0bf96'); rect(x, 9, 6, 14, 5, '#ffcc33'); circ(x, 16, 8, 2, '#ffffff'); rect(x, 10, 21, 12, 8, '#6a5a50'); line(x, 22, 28, 29, 17, 2.4, '#8a5a30'); line(x, 26, 16, 31, 20, 2.6, '#b0b8c4'); };
IC.g_mason = (x) => { circ(x, 16, 14, 7, '#e0b890'); rect(x, 9, 6, 14, 4, '#c85a3a'); rect(x, 10, 21, 12, 8, '#4a5a7a'); line(x, 4, 28, 12, 18, 3, '#8a5a30'); rect(x, 9, 15, 7, 5, '#9aa0aa'); };
const oSU = M.spriteURL, oSC = M.spriteCanvas;
M.spriteURL = function (k, s) { if (M.SP && !M.SP[k] && IC[k]) return M.iconURL(k, Math.max(2, Math.round((s || 4) * 0.6))); return oSU.apply(this, arguments); };
M.spriteCanvas = function (k, s) { if (M.SP && !M.SP[k] && IC[k]) return M.iconCanvas(k, Math.max(2, Math.round((s || 4) * 0.6))); return oSC.apply(this, arguments); };

// ───────── the keepsakes ─────────
const ok = (t, extra) => Object.assign({ t }, extra || {});
const GIFTS = {
  hero:   { n: '流浪领袖', ic: 'r_hero', c: '#ffe08a', w: 8, d: '一名流浪领袖加入；满员时留下 15 灵魂碎片。',
    apply(g, m) { if (m.heroes.length >= M.heroCap(m)) { m.shards += 15; return ok('领袖满员，他留下 15 灵魂碎片'); } const rar = M.wpick([0, 1, 2, 3], i => [58, 30, 10, 2][i]); const h = M.newHero(m, null, rar); m.heroes.push(h); return ok(M.qn(h.name, rar) + ' 加入了基地', { hero: h.id, col: M.qc(rar) }); } },
  miner:  { n: '矿工队', ic: 'g_miner', c: '#ffd060', w: 10, d: '回基地后免费挖通一格岩层（优先有地脉的格子）。',
    apply(g, m) { const cand = []; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { if (M.canDig(m, c, r)) cand.push([c, r, M.cell(m, c, r).tile ? 0 : 1]); } if (!cand.length) { m.supplies += 50; return ok('没有能挖的岩层，矿工留下 50 物资'); } cand.sort((a, b) => a[2] - b[2] || Math.random() - 0.5); const [c, r] = cand[0], x = M.cell(m, c, r); x.dug = true; x.job = null; return ok('挖通了第 ' + (r + 1) + ' 层的一格' + (x.tile ? '，露出「' + M.TILES[x.tile].n + '」' : ''), { cc: c, cr: r }); } },
  mason:  { n: '工匠', ic: 'g_mason', c: '#ff9a6a', w: 10, d: '在建工程推进 2 天。',
    apply(g, m) { let n = 0, done = 0, at = null; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.job) continue; n++; at = at || { cc: c, cr: r }; x.job.days -= 2;
        if (x.job.days <= 0) { if (x.job.kind === 'dig') x.dug = true; else { x.b = x.job.key; x.dug = true; } x.job = null; done++; } }
      if (!n) { m.buildBoost = (m.buildBoost || 0) + 2; return ok('下一项工程少 2 天'); } return ok(n + ' 项工程各推进 2 天' + (done ? '，' + done + ' 项当场完工' : ''), at); } },
  portal: { n: '修门石', ic: 'g_gate', c: '#5fd0c0', w: 9, d: '主基地耐久 +300（不超过上限）。',
    apply(g, m) { const mx = M.portalMax(m), v = Math.min(300, mx - m.portal.hp); m.portal.hp += Math.max(0, v); return ok(v > 0 ? '主基地耐久 +' + Math.round(v) : '传送门本来就是满的', { door: 1 }); } },
  talent: { n: '启示卷轴', ic: 'g_scroll', c: '#ffcf4a', w: 9, d: '带着它回来的领袖获得 1 个天赋点。',
    apply(g, m, run) { const h = (run && m.heroes.includes(run.hero)) ? run.hero : M.pick(m.heroes); if (!h) return ok('没有领袖可以读它'); h.points++; return ok(M.heroN(h) + ' 天赋点 +1', { hero: h.id }); } },
  temper: { n: '淬火石', ic: 'g_anvil', c: '#ff8a3a', w: 8, d: '最差的一件宝物品质 +1。',
    apply(g, m) { const r = m.relics.filter(x => x.q < 3).sort((a, b) => a.q - b.q)[0]; if (!r) { const k = 'rbp:' + M.pick(Object.keys(M.RELICS)); M.invAdd(m, k, 1); return ok('没有可淬火的宝物，换成「' + M.itemInfo(k).n + '」'); } r.q++; r.lines = M.relicLines(r.key, r.q); return ok(M.qn(M.RELICS[r.key].n, r.q) + ' 升了一档', { col: M.qc(r.q) }); } },
  calm:   { n: '安神香', ic: 'g_incense', c: '#c8c8ff', w: 8, d: '所有领袖回复 25% 生命。',
    apply(g, m) { m.heroes.forEach(h => { h.hp = Math.min(M.heroMaxHp(h, m), h.hp + M.heroMaxHp(h, m) * 0.25); }); return ok('全员回复 25% 生命'); } },
  decoy:  { n: '迷踪粉', ic: 'g_powder', c: '#c8b0ff', w: 8, d: '下一次混沌来袭的怪物减少 30%。',
    apply(g, m) { m.raidWeak = Math.min(0.6, (m.raidWeak || 0) + 0.3); return ok('下一次混沌来袭的怪物 -' + Math.round(m.raidWeak * 100) + '%', { door: 1 }); } },
  letter: { n: '引荐信', ic: 'g_letter', c: '#f5ead4', w: 8, d: '下一次招募免费，而且至少为「稀有」。',
    apply(g, m) { m.freeRecruit = (m.freeRecruit || 0) + 1; return ok('下一次招募免费，至少「稀有」'); } },
  cell:   { n: '补给箱', ic: 'g_battery', c: '#9cff7a', w: 7, d: '物资 +120。',
    apply(g, m) { m.supplies += 120; return ok('物资 +120'); } },
  kit:    { n: '行军包', ic: 'g_pack', c: '#caa84a', w: 9, d: '下次出征开局多带 1 个支援道具。',
    apply(g, m) { m.nextKit = Math.min(3, (m.nextKit || 0) + 1); return ok('下次出征多带 ' + m.nextKit + ' 个支援道具'); } },
};
M.GIFTS = GIFTS;
M.dropGift = () => 'gift:' + M.wpick(Object.keys(GIFTS), k => GIFTS[k].w);
const oInfo = M.itemInfo;
M.itemInfo = function (key) {
  if (key && key.startsWith('gift:')) { const K = GIFTS[key.slice(5)]; if (K) return { n: K.n, icon: K.ic, c: K.c, q: 1, kind: '带回基地', d: K.d, sub: '带回基地后生效' }; }
  return oInfo.apply(this, arguments);
};

// ───────── where they come from ─────────
const oSettle = G.startSettle;
G.startSettle = function () {
  oSettle.apply(this, arguments); const st = this.settle, run = this.run, n = this.node; if (!st || !st.good || !run || run.tut || !n) return;
  const ch = n.type === 'boss' ? 1 : n.type === 'extract' ? 0.5 : n.type === 'elite' ? 0.35 : 0.06; if (Math.random() >= ch) return;
  const k = M.dropGift(), I = M.itemInfo(k); this.hold('rbp', run.loot.bp.length); run.loot.bp.push(k); st.tiles.push({ icon: I.icon, v: 1, c: I.c, to: 'rbp', n: I.n, key: k });
};
const oChest = G.openChest;
G.openChest = function (items, col, done) {
  const run = this.run; if (run && !run.tut && Math.random() < 0.18) { const k = M.dropGift(), I = M.itemInfo(k); items.push({ n: I.n, sub: '带回基地', c: I.c, img: M.spriteCanvas(I.icon, 12), award: { k: 'bp', key: k } }); }
  return oChest.call(this, items, col, done);
};

// ───────── coming home ─────────
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, gifts = run ? run.loot.bp.filter(k => k.startsWith('gift:')) : [];
  if (run) run.loot.bp = run.loot.bp.filter(k => !k.startsWith('gift:'));
  oWin.apply(this, arguments); if (!gifts.length) return;
  const m = this.meta, res = [];
  gifts.forEach(k => { const K = GIFTS[k.slice(5)]; if (!K) return; const r = K.apply(this, m, run) || ok(''); r.n = K.n; r.icon = K.ic; r.col = r.col || K.c; r.key = k; res.push(r); });
  this.save(); try { M.T && M.T.ev('gift', { kinds: gifts.map(k => k.slice(5)) }); } catch (e) {}
  if (this.endInfo) { this.endInfo.tiles = (this.endInfo.tiles || []).concat(res.map(r => ({ img: M.spriteURL(r.icon, 7), n: r.n, v: '带回', c: r.col, icon: r.icon, key: r.key }))); const shown = res.slice(0, 4).map(r => ({ k: r.n, v: r.t, c: r.col })); if (res.length > 4) shown.push({ k: '还有 ' + (res.length - 4) + ' 项', v: res.slice(4).map(r => r.n).join('、') + '（回基地时逐个显示）', c: '#a89ca8' }); this.endInfo.lines = (this.endInfo.lines || []).concat(shown); this.endInfo.gifts = res; }
};
const oBack = G.endBack;
G.endBack = function () {
  const gifts = (this.endInfo && this.endInfo.gifts) || []; oBack.apply(this, arguments);
  gifts.forEach((r, i) => setTimeout(() => {
    const p = r.cc != null ? this.cellPos(r.cc, r.cr) : r.door ? { x: 960, y: 250 } : { x: 960, y: 420 + (i % 3) * 60 };
    this.fx.rays && this.fx.rays(p.x, p.y, r.col, 1.2, { r: 220 }); this.fx.pop(p.x, p.y - 40, r.n + ' · ' + r.t, r.col, 36); S.up && S.up(2);
  }, 1800 + i * 700));
};

// ───────── lasting effects in the base ─────────
const oPow = M.power;
M.power = function (m) { const p = oPow.apply(this, arguments); if (m && m.bonusPw) { p.made += m.bonusPw; p.free += m.bonusPw; } return p; };
const oSB = M.startBuild;
M.startBuild = function (m, c, r, key) { const ok2 = oSB.apply(this, arguments); if (ok2 && m.buildBoost) { const x = M.cell(m, c, r); if (x.job) { x.job.days = Math.max(1, x.job.days - m.buildBoost); x.job.total = Math.max(x.job.days, x.job.total - m.buildBoost); } m.buildBoost = 0; } return ok2; };
const oNR = M.newRun3;
M.newRun3 = function (meta, hero, worldKey, relicIds) {
  const run = oNR.apply(this, arguments);
  for (let i = 0; i < (meta.nextKit || 0); i++) { const s = run.items.indexOf(null); if (s < 0) break; run.items[s] = M.pick(Object.keys(M.ITEMS)); run.itemQ[s] = 0; }
  meta.nextKit = 0; return run;
};
const oSR = G.startRaid;
G.startRaid = function () {
  const had = this.raid; oSR.apply(this, arguments); const R = this.raid, m = this.meta;
  if (R && R !== had && m.raidWeak) { const n = Math.max(1, Math.ceil(R.list.length * (1 - m.raidWeak))); R.list = R.list.slice(0, n); R.total = R.list.length; m.raidWeak = 0; this.toast('迷踪粉起效：这次来的怪物少了', '#c8b0ff'); }
};
const oBM = M.baseMods;
M.baseMods = function (m, raw) { const o = oBM.apply(this, arguments); if (m && m.recruitMinOnce) o.recruitMin = Math.max(o.recruitMin || 0, 1); return o; };
const oRec = G.recruit;
G.recruit = function () {
  const m = this.meta; if (!(m.freeRecruit > 0)) return oRec.apply(this, arguments);
  const cost = M.recruitCost(m), s0 = m.supplies; m.supplies += cost; m.recruitMinOnce = 1;
  try { oRec.apply(this, arguments); } finally { m.recruitMinOnce = 0; }
  if (m.supplies === s0 + cost) { m.supplies = s0; return; }      // nothing happened (full roster)
  m.freeRecruit--; m.supplies = s0; this.save();
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (v.pn && v.pn.isRecruit && m && m.freeRecruit > 0) v.pn.recBtn = '免费招募领袖（至少稀有）';
  return v;
};
})();

;
