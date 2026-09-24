// ==== mc-tele.js ====
(function () {
// Play telemetry for balance analysis. Every notable moment becomes a small event; events are batched and
//  - uploaded to the Claude artifact store (collection "tele", one document per batch) when the game runs as an artifact,
//  - always archived in localStorage so the GitHub Pages build can export them (settings → 复制数据 / 下载数据),
//  - optionally POSTed to an HTTP endpoint stored in localStorage["mc-tele-endpoint"].
// Schema version: 1. Analyse with tools/tele_analyze.py. Gameplay data only — no personal information.
const M = window.MC, G = M.Game.prototype, B3P = M.Battle3 && M.Battle3.prototype;
const BUILD = window.MC_BUILD || 'dev';
const K_DID = 'mc-tele-did', K_Q = 'mc-tele-queue', K_A = 'mc-tele-archive', K_N = 'mc-tele-sent', K_EP = 'mc-tele-endpoint';
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } } };
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const did = ls.get(K_DID, null) || (() => { const d = 'd' + rid(); ls.set(K_DID, d); return d; })();
const T = M.T = { v: 1, build: BUILD, did, sid: 's' + rid(), seq: 0, t0: Date.now(), buf: [], db: null, sink: 'local', sent: ls.get(K_N, { batches: 0, events: 0 }), lastFlush: Date.now(), on: true };
const r2 = (x) => Math.round(x * 100) / 100;
T.ev = function (k, data) {
  if (!T.on) return; const g = M._g, m = g && g.meta, e = Object.assign({ k, t: Date.now() - T.t0 }, data || {});
  if (m && e.day == null) e.day = m.day; if (m && m.gameNo) e.g = m.gameNo; if (g && g.screen) e.s = g.screen;
  T.buf.push(e); if (T.buf.length >= 160) T.flush('size');
};
T.flush = function (why) {
  if (!T.buf.length) return; T.lastFlush = Date.now();
  const b = { v: 1, build: BUILD, did: T.did, sid: T.sid, seq: T.seq++, at: Date.now(), why: why || '', ev: T.buf.splice(0) };
  // bounded local archive (oldest batches drop first)
  const arc = ls.get(K_A, []); arc.push(b); let s = JSON.stringify(arc); while (s.length > 1400000 && arc.length > 1) { arc.shift(); s = JSON.stringify(arc); } ls.set(K_A, s);
  const q = ls.get(K_Q, []); q.push(b); ls.set(K_Q, q.slice(-150)); T.pump();
};
T.docId = (b) => b.did + '_' + b.sid + '_' + String(b.seq).padStart(4, '0');
T.pump = async function () {
  if (T.pumping) return; T.pumping = true;
  try {
    let q = ls.get(K_Q, []); const ep = ls.get(K_EP, '');
    while (q.length && (T.db || ep)) {
      const b = q[0];
      if (T.db) await T.db.collection('tele').doc(T.docId(b)).set(b);
      else await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), keepalive: true });
      q.shift(); ls.set(K_Q, q); T.sent.batches++; T.sent.events += b.ev.length; T.sent.last = Date.now(); ls.set(K_N, T.sent);
    }
  } catch (e) { T.err = (e && (e.code || e.message)) || 'error'; if (e && /quota_exceeded|revoked|not_granted|capability/.test(e.code || '')) T.db = null; }
  T.pumping = false;
};
// inside a Claude artifact the store is reachable; anywhere else this resolves null / is absent
(async () => { try { if (window.claude && typeof window.claude.use === 'function') { const db = await window.claude.use('db'); if (db) { T.db = db; T.sink = 'claude'; T.pump(); } } } catch (e) {} })();
if (ls.get(K_EP, '')) T.sink = 'http';
window.addEventListener('pagehide', () => { T.ev('session_end', { dur: Math.round((Date.now() - T.t0) / 1000) }); T.flush('pagehide'); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') T.flush('hidden'); });
T.exportObj = () => { const arc = ls.get(K_A, []), q = ls.get(K_Q, []), seen = new Set(arc.map(T.docId)); return { v: 1, build: BUILD, did: T.did, exported: Date.now(), batches: arc.concat(q.filter(b => !seen.has(T.docId(b)))).concat(T.buf.length ? [{ v: 1, build: BUILD, did: T.did, sid: T.sid, seq: -1, at: Date.now(), why: 'unflushed', ev: T.buf.slice() }] : []) }; };
T.exportText = () => JSON.stringify(T.exportObj());
T.status = () => { const n = ls.get(K_A, []).reduce((a, b) => a + b.ev.length, 0) + T.buf.length; return T.sink === 'claude' ? '自动上传到 Claude · 已上传 ' + T.sent.batches + ' 批 / ' + T.sent.events + ' 条' + (T.err ? ' · 上次出错：' + T.err : '') : T.sink === 'http' ? '自动上传到自定义地址 · 已上传 ' + T.sent.batches + ' 批' : '只在本机记录 · ' + n + ' 条事件（可复制或下载后发给开发者）'; };

// ───────── snapshots ─────────
const heroS = (h, m) => h && ({ cls: h.cls, lv: h.lv, r: h.rarity, hp: r2(h.hp / Math.max(1, M.heroMaxHp(h, m))), q: (h.quirks || []).length, tal: h.taken ? h.taken.atk + h.taken.def + h.taken.luck : 0 });
const rooms = (m) => { const o = []; M.eachBuilt(m, (b) => o.push(b)); return o; };
const tilesS = (m) => { const o = []; M.eachBuilt(m, (b, c, r, x) => { if (x.tile) o.push({ t: x.tile, q: M.TILES[x.tile] ? M.TILES[x.tile].q : null, b, fit: M.tileFits ? M.tileFits(x.tile, b) : null }); }); return o; };
const metaS = (m) => ({ sup: m.supplies, sh: m.shards, orb: m.orbs, core: m.core, portal: r2(m.portal.hp / Math.max(1, M.portalMax(m))), heroes: m.heroes.map(h => heroS(h, m)), rooms: rooms(m), pw: M.power(m), bpInv: Object.keys(m.inv).filter(k => /^(bbp|rbp):/.test(k)).reduce((a, k) => a + m.inv[k], 0), relics: m.relics.length, tiles: tilesS(m) });
const rosterS = (run) => run.roster.map(u => [u.type, (M.DB[u.type] || {}).q, u.lv || 1]);
const gainS = (list) => (list || []).map(g => g.k === 'bp' ? ['bp', g.key] : g.k === 'unit' ? ['unit', g.type] : g.k === 'item' ? ['item', g.key, g.q] : [g.k, g.v]);
const wrap = (obj, name, before, after) => { const o = obj[name]; if (typeof o !== 'function') return; obj[name] = function () { let ctx; try { ctx = before && before.apply(this, arguments); } catch (e) {} const r = o.apply(this, arguments); try { after && after.call(this, ctx, r, arguments); } catch (e) {} return r; }; };

// ───────── session & game ─────────
let started = false;
wrap(G, 'tick', null, function () {
  if (!started) { started = true; const p = this.prof || {}; T.ev('session', { plat: M.platform, input: M.inputMode ? M.inputMode(this) : '', w: innerWidth, h: innerHeight, lang: navigator.language, host: location.hostname || 'file', prof: { games: (p.stats || {}).games || 0, tokens: p.tokens || 0, furn: p.furn || {}, ach: Object.keys(p.ach || {}).length }, save: { day: this.meta.day, tut: !!this.meta.tutDone } }); }
  const errs = window.__mcErrs || []; if (errs.length > (T.errN || 0)) { errs.slice(T.errN || 0).forEach(e => T.ev('error', { msg: String(e).slice(0, 300) })); T.errN = errs.length; }
  T.frames = (T.frames || 0) + 1; const now = Date.now(); if (!T.perfT) T.perfT = now; if (now - T.perfT > 30000) { T.ev('perf', { fps: Math.round(T.frames * 1000 / (now - T.perfT)) }); T.frames = 0; T.perfT = now; }
  if (now - T.lastFlush > 45000) T.flush('timer');
});
wrap(G, 'go', function (s) { return this.screen; }, function (from, r, a) { if (from !== a[0]) T.ev('screen', { from, to: a[0] }); });
wrap(G, 'newGame', null, function (_, r, a) { const m = this.meta; T.ev('game_start', { kits: a[0] || [], moon: m.moon, hard: !!m.hard, perks: Object.keys(M.perks ? M.perks() : {}), meta: metaS(m) }); T.flush('game_start'); });
wrap(G, 'gameOver', function (reason) { const m = this.meta; return { reason, st: m.st || {}, day: m.day, cleared: Object.keys(m.cleared), rows: M.settleRows ? M.settleRows(m) : null, meta: metaS(m), graves: m.graveyard.length }; }, function (c) { T.ev('game_over', { reason: c.reason, day: c.day, st: c.st, cleared: c.cleared, tokens: c.rows && c.rows.total, meta: c.meta, graves: c.graves }); T.flush('game_over'); });
wrap(G, 'passDay', null, function () { T.ev('day', metaS(this.meta)); });

// ───────── expeditions ─────────
const oNR = M.newRun3;
M.newRun3 = function (meta, hero, worldKey, relicIds) { const run = oNR.apply(this, arguments); try { T.ev('run_start', { world: worldKey, tut: !!run.tut || !!(run.region && run.region.tut), len: run.len && run.len.n, cols: run.map && run.map.cols, hero: heroS(hero, meta), relics: (relicIds || []).length, roster: rosterS(run), drink: !!run.drink, moon: meta.moon, hard: !!meta.hard, nodes: run.map ? run.map.nodes.reduce((o, n) => (o[n.type] = (o[n.type] || 0) + 1, o), {}) : null }); } catch (e) {} return run; };
wrap(G, 'arrive', null, function (_, r, a) { const n = a[0]; T.ev('node', { type: n.type, ev: n.ev || '', col: n.col, final: !!n.final }); });
const runEnd = (g, kind) => { const run = g.run; if (!run) return null; return { kind, world: run.regionKey, tut: !!(run.region && run.region.tut), loot: { sup: run.loot.supplies, exp: run.loot.exp, sh: run.loot.shards || 0, bp: run.loot.bp.slice() }, wallet: run.wallet, battles: run.battles, steps: run.steps, hero: heroS(run.hero, g.meta), roster: rosterS(run) }; };
wrap(G, 'runWin', function (kind) { return runEnd(this, kind); }, function (c) { if (c) { T.ev('run_end', c); T.flush('run_end'); } });
wrap(G, 'runFail', function () { const c = runEnd(this, 'fail'); if (c && (this.meta.catSaves || 0) > 0) c.kind = 'cat'; return c; }, function (c) { if (c) { c.core = this.meta.core; T.ev('run_end', c); T.flush('run_end'); } });

// ───────── battles ─────────
wrap(G, 'beginBattle', null, function (_, r, a) {
  const b = this.battle, n = a[0], run = this.run; if (!b || !run) return; const cfg = this.cfg || b.cfg || {};
  b.tst = { t0: Date.now(), dmg: { A: 0, E: 0 }, by: {}, kills: {}, casts: { A: 0, E: 0 }, items: 0, heroHp0: r2(run.hero.hp / Math.max(1, M.heroMaxHp(run.hero, this.meta))) };
  const foes = {}; (cfg.list || []).forEach(s => foes[s.type] = (foes[s.type] || 0) + 1);
  T.ev('battle_start', { node: n.type, final: !!n.final, world: run.regionKey, w: r2(cfg.w || 0), mode: cfg.mode, foes, s0: Math.round(cfg.S0 || 0), roster: rosterS(run), hero: heroS(run.hero, this.meta), mult0: run.startMult || 0, buff: run.runBuff || {} });
});
if (B3P) {
  wrap(B3P, 'deal', function (src, tg) { return { src, tg, h: tg ? tg.hp : 0 }; }, function (c) { const s = this.tst; if (!s || !c.tg) return; const d = Math.max(0, c.h - Math.max(0, c.tg.hp)); if (!d) return; const side = c.src ? c.src.side : c.tg.side === 'A' ? 'E' : 'A'; s.dmg[side] = (s.dmg[side] || 0) + d; if (side === 'A' && c.src) { const k = c.src.isHero ? 'HERO' : (c.src.key || c.src.kind || '?'); s.by[k] = (s.by[k] || 0) + d; } });
  wrap(B3P, 'kill', function (e, src) { return { e, src }; }, function (c) { const s = this.tst; if (!s || !c.src || c.src.side !== 'A') return; const k = c.src.isHero ? 'HERO' : (c.src.key || c.src.kind || '?'); s.kills[k] = (s.kills[k] || 0) + 1; });
  wrap(B3P, 'beginCast', function (e) { return e; }, function (e) { const s = this.tst; if (s && e) s.casts[e.side] = (s.casts[e.side] || 0) + 1; });
}
wrap(G, 'useSlot', function (i) { const run = this.run; return run ? { key: run.items[i], q: run.itemQ[i] } : null; }, function (c) { if (c && c.key) { T.ev('item_use', c); if (this.battle && this.battle.tst) this.battle.tst.items++; } });
wrap(G, 'castSkill', function () { const b = this.battle; return b ? { used: b.skillUsed, t: b.t } : null; }, function (c) { const b = this.battle; if (c && b && !c.used && b.skillUsed) T.ev('hero_skill', { t: r2(b.t) }); });
wrap(G, 'startSettle', function () { return this.run ? this.run.loot.bp.length : 0; }, function (n0) {
  const b = this.battle, st = this.settle, run = this.run, n = this.node; if (!b || !st || !run) return; const s = b.tst || { dmg: {}, by: {}, kills: {}, casts: {} };
  const allies = b.ents.filter(e => e.side === 'A' && !e.isHero && !e.summon), top = Object.entries(s.by).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v), s.kills[k] || 0]);
  T.ev('battle_end', { node: n && n.type, final: !!(n && n.final), world: run.regionKey, win: !!st.good, dur: r2(b.t), real: Math.round((Date.now() - (s.t0 || Date.now())) / 1000), kills: b.kills, score: b.score, base: Math.round(b.base), mult: r2(b.mult),
    hero: { hp0: s.heroHp0, hp1: r2(Math.max(0, b.hero.hp) / Math.max(1, b.hero.maxHp)), entered: b.hero.enterT != null, alive: !!b.hero.alive },
    allies: { n: allies.length, alive: allies.filter(e => e.alive).length }, foesLeft: b.ents.filter(e => e.side === 'E' && e.alive).length, dmgA: Math.round(s.dmg.A || 0), dmgE: Math.round(s.dmg.E || 0), casts: s.casts, items: s.items || 0, top,
    bp: run.loot.bp.slice(n0), wallet: run.wallet });
});

// ───────── shop, events, chests ─────────
wrap(G, 'openShop', null, function () { const sh = this.run && this.run.shop; if (!sh) return; T.ev('shop', { units: (sh.units || []).map(c => [c.type, c.cost]), banners: (sh.banners || []).map(c => [c.key, c.cost]), items: (sh.items || []).map(c => [c.key, c.cost]), wallet: this.run.wallet }); });
wrap(G, 'buy', function (zone, i) { const sh = this.run && this.run.shop, c = sh && sh[zone] && sh[zone][i]; return c ? { zone, c, sold: c.sold, w: this.run.wallet } : null; }, function (c) { if (c && !c.sold && c.c.sold) T.ev('buy', { zone: c.zone, key: c.c.type || c.c.key, cost: c.c.cost, q: c.c.q, wallet: c.w }); });
wrap(G, 'refresh', function () { return this.run ? this.run.wallet : 0; }, function (w) { if (this.run && this.run.wallet < w) T.ev('shop_refresh', { cost: w - this.run.wallet }); });
wrap(G, 'sellSel', function () { const u = this.run && this.run.roster.find(x => x.uid === this.sel); return u ? { type: u.type, lv: u.lv || 1, w: this.run.wallet } : null; }, function (c) { if (c) T.ev('sell', { type: c.type, lv: c.lv, v: this.run.wallet - c.w }); });
wrap(G, 'leaveShop', null, function () { if (this.run) T.ev('shop_leave', { wallet: this.run.wallet, roster: this.run.roster.length }); });
wrap(G, 'miniStart', function (kind) { return { kind, w: this.run ? this.run.wallet : 0 }; }, function (c, ok) { if (ok && this.mini) { this.mini._tele = { t0: Date.now(), w: c.w, hp: this.run ? r2(this.run.hero.hp / Math.max(1, M.heroMaxHp(this.run.hero, this.meta))) : 0 }; T.ev('mini_start', { kind: c.kind }); } });
wrap(G, 'miniFinish', function (text, col, gains) { const mg = this.mini; return mg ? { kind: mg.kind, x: mg._tele || {}, text: String(text || '').slice(0, 60), gains: gainS(gains), phase: mg.phase } : null; }, function (c) { if (!c) return; const run = this.run; T.ev('mini_end', { kind: c.kind, dur: Math.round((Date.now() - (c.x.t0 || Date.now())) / 1000), text: c.text, gains: c.gains, spent: run ? Math.max(0, (c.x.w || 0) - run.wallet) : 0, dWallet: run ? run.wallet - (c.x.w || 0) : 0, hp0: c.x.hp, hp1: run ? r2(run.hero.hp / Math.max(1, M.heroMaxHp(run.hero, this.meta))) : 0 }); });
wrap(G, 'miniBattle', function () { return this.mini && this.mini.kind; }, function (kind) { T.ev('mini_end', { kind, battle: true }); });
wrap(G, 'openChest', function (items) { return (items || []).map(it => it.award ? gainS([it.award])[0] : null).filter(Boolean); }, function (items) { T.ev('chest', { items }); });

// ───────── base ─────────
wrap(G, 'doDig', function (c, r) { return { s0: this.meta.supplies, c, r }; }, function (x) { if (this.meta.supplies < x.s0) { const cl = M.cell(this.meta, x.c, x.r) || {}, TT = cl.tile && M.TILES[cl.tile]; T.ev('dig', { cost: x.s0 - this.meta.supplies, row: x.r, tile: cl.tile || null, tq: TT ? TT.q : null }); } });
wrap(G, 'doBuild', function (c, r, key) { return { s0: this.meta.supplies, key, c, r }; }, function (x) { if (this.meta.supplies < x.s0) { const B = M.BUILDINGS[x.key]; const cl = M.cell(this.meta, x.c, x.r) || {}; T.ev('build', { key: x.key, q: B.q, cost: x.s0 - this.meta.supplies, style: B.style, cat: B.cat, row: x.r, tile: cl.tile || null, fit: cl.tile && M.tileFits ? M.tileFits(cl.tile, x.key) : null }); } });
const oCraft = M.craftRelic3; M.craftRelic3 = function (meta, key, forge) { const r = oCraft.apply(this, arguments); try { const rel = r && r.key ? r : meta.relics[meta.relics.length - 1]; T.ev('craft', { key, q: rel && rel.q, forge: forge || {} }); } catch (e) {} return r; };
const oNH = M.newHero; M.newHero = function (meta, cls, rarity) { const h = oNH.apply(this, arguments); try { T.ev('hero_new', { cls: h.cls, r: h.rarity, lv: h.lv }); } catch (e) {} return h; };
wrap(G, 'train', function (id) { return this.meta.orbs; }, function (o0, r, a) { const h = this.meta.heroes.find(x => x.id === a[0]); if (this.meta.orbs < o0) T.ev('train', { orbs: o0 - this.meta.orbs, lv: h && h.lv }); });
wrap(G, 'quickHeal', null, function () { T.ev('quick_heal', {}); });
wrap(G, 'sanit', function (id, q) { return q; }, function (q) { T.ev('sanit', { quirk: q }); });
wrap(G, 'takeTalent', function (id, b) { const h = this.meta.heroes.find(x => x.id === id); return h ? { cls: h.cls, b, i: h.taken[b], lv: h.lv, pts: h.points } : null; }, function (c) { if (c) T.ev('talent', c); });
wrap(G, 'talUp', function () { const c = this.talCharge; return c ? (Date.now() / 1000 - c.t0) : null; }, function (held) { if (held != null && held < 0.75) T.ev('talent_short', { held: r2(held) }); });
wrap(G, 'startRaid', null, function () { const r = this.raid; if (!r || r._t0) return; T.ev('raid_start', { foes: r.list.length, portal: Math.round(r.portal.hp), heroes: r.ents.filter(e => e.hero).map(e => heroS(e.hero, this.meta)), bench: this.meta.heroes.length - r.ents.filter(e => e.hero).length, weapons: r.turrets.length }); r._t0 = Date.now(); });
wrap(G, 'raidEnd', function () { const r = this.raid; return r ? { res: r.over, portal: r2(r.portal.hp / Math.max(1, r.portal.max)), kills: r.kills, total: r.total, dur: r2(r.t) } : null; }, function (c) { if (c) { const R = this.raid && this.raid.result; if (R) Object.assign(c, R); T.ev('raid_end', c); T.flush('raid_end'); } });

// ───────── meta ─────────
wrap(G, 'buyFurn', function (k) { return { k, lv: (this.prof.furn || {})[k] || 0, tok: this.prof.tokens }; }, function (c) { const lv = (this.prof.furn || {})[c.k] || 0; if (lv > c.lv) T.ev('furn', { k: c.k, lv, cost: c.tok - this.prof.tokens }); });
wrap(G, 'achCheck', null, function (_, got) { (got || []).forEach(a => T.ev('ach', { k: a.k })); });
wrap(G, 'roomEnter', null, function () { T.ev('coin_in', { active: !!this.prof.active }); });

// ───────── export (settings) ─────────
T.copy = async function (g) { const text = T.exportText(); try { await navigator.clipboard.writeText(text); g.toast('已复制 ' + Math.round(text.length / 1024) + ' KB 游戏数据，粘贴发给开发者即可', '#9cff7a'); } catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:0;top:0;width:10px;height:10px;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); g.toast('已复制游戏数据', '#9cff7a'); } catch (e2) { g.toast('复制失败，请用「下载数据」', '#ff6a5a'); } ta.remove(); } };
T.download = function (g) { try { const blob = new Blob([T.exportText()], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'midnight-cabinet-data-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); g.toast('数据文件已下载', '#9cff7a'); } catch (e) { g.toast('这个环境不能下载，请用「复制数据」', '#ff6a5a'); } };
const oSV = G.settingsView;
G.settingsView = function () { const v = oSV.call(this); if (v && v.set) { v.set.tele = T.status(); v.set.teleCopy = () => { M.Sfx.click(); T.flush('export'); T.copy(this); }; v.set.teleSave = () => { M.Sfx.click(); T.flush('export'); T.download(this); }; } return v; };
})();

;
