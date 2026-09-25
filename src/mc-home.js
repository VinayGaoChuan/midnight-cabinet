// ==== mc-home.js ====
(function () {
// Coming home, one thing at a time (user ruling 2026-09-24): the haul flies into the bar, then a fallen leader's card
// tears, then level-ups, then finished buildings, then the calendar turns — and if the new day is a raid, the raid.
// Every step waits for the one before it (a queue driven by the game tick; no overlapping timers).
// Also here: every rare find (blueprint, crystal, keepsake) is shown on its own and says what it is for.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;

// ───────── the queue ─────────
// step: { run(), wait: seconds } or { run(), until(): bool } (checked after a short minimum, capped at 30 s)
G.homeQueue = function (steps) {
  const q = this.homeQ; if (q && q.m === this.meta) { q.steps.push(...steps); return; }
  this.homeQ = { m: this.meta, steps: steps.slice(), cur: null };
};
G.homeStep = function (dt) {
  const q = this.homeQ; if (!q) return;
  if (q.m !== this.meta) { this.homeQ = null; return; }                 // the game ended (core broke): nothing more to show
  if (this.screen !== 'base' || this.raid) return;
  if (!q.cur) {
    q.cur = q.steps.shift(); if (!q.cur) { this.homeQ = null; this.bump(); return; }
    q.cur.t = 0; try { q.cur.run && q.cur.run(); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('home: ' + (e && e.message)); }
    return;
  }
  const c = q.cur; c.t += dt;
  const done = c.until ? (c.t > 0.25 && c.until()) : c.t >= (c.wait || 0);
  if (done || c.t > 30) q.cur = null;
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); this.homeStep(dt || 0); return r; };
// nothing new starts while the story of the return is still being told
const oOW = G.openWorlds;
G.openWorlds = function () { if (this.homeQ && !this.portalOn()) return; return oOW.apply(this, arguments); };
['steleDrop', 'pickWorld', 'launch'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { if (this.homeQ) return; return o.apply(this, arguments); }; });

// ───────── back to base ─────────
G.endBack = function () {
  const info = this.endInfo || {}, m = this.meta, gain = info.gain || {}; S.click();
  if (gain.msup > 0) this.hold('msup', m.supplies - gain.msup);
  if (gain.msh > 0) this.hold('msh', m.shards - gain.msh);
  if (gain.morb > 0) this.hold('morb', m.orbs - gain.morb);
  this.toBase();
  const steps = [], gifts = info.gifts || [], tiles = info.newTiles || [];
  // 1. the haul: resources and blueprints fly in, crystals land in the rock, keepsakes take effect
  steps.push({ run: () => this.lootFly(gain, { x: 960, y: 560 }), wait: (gain.msup || gain.msh || gain.morb || (gain.bp || []).length || gain.exp) ? 2.2 : 0.3 });
  tiles.forEach(t => steps.push(...this.tileReveal(t.c, t.r, t.t)));
  gifts.forEach((r, i) => steps.push({ run: () => { const p = r.cc != null ? this.cellPos(r.cc, r.cr) : r.door ? { x: 960, y: 250 } : { x: 960, y: 420 + (i % 3) * 60 }; this.fx.rays && this.fx.rays(p.x, p.y, r.col, 1.2, { r: 220 }); this.fx.pop(p.x, p.y - 40, r.n + ' · ' + r.t, r.col, 36); S.up && S.up(2); }, wait: 0.8 }));
  if (info.coreHeal) steps.push({ run: () => { const p = this.fxPos('core') || this.corePos(); this.fx.rays(p.x, p.y, '#9cff7a', 1.4, { r: 200 }); this.fx.pop(p.x, p.y + 60, '基地核心 +1', '#9cff7a', 44); S.heal(); this.pulse.core = performance.now(); }, wait: 1.0 });
  // 2. a fallen leader: the card tears (its shards already flew in above), then the core takes the blow
  if (gain.dead) steps.push({ run: () => { this.tear = { t: 0, dead: gain.dead, gain: {}, fired: false, seed: Math.random() * 100 }; S.whoosh(0.5); }, until: () => !this.tear });
  if (info.coreHit) steps.push({ run: () => { this.coreQueue = { pd: false, hp: m.core == null ? 3 : m.core }; }, until: () => !this.coreQueue && !this.coreFx });
  // 3. level-ups from the run
  if (gain.ups > 0 && gain.heroId) steps.push({ run: () => { const h = m.heroes.find(x => x.id === gain.heroId); if (!h) return; const lv0 = h.lv - gain.ups; try { M.T && M.T.ev('lvup', { src: 'run', lv: h.lv, ups: gain.ups }); } catch (e) {} this.lvUpFx(h, lv0, h.lv, M.heroPowerAt(h, m, lv0), M.heroPower(h, m)); }, until: () => !this.lvFx });
  // 4–6. the day: finished buildings, the calendar, the raid
  if (this.pendingDay) { this.pendingDay = false; steps.push({ run: () => this.passDay(), wait: 0 }); }
  this.homeQueue(steps);
};

// ───────── a day passes: level-ups from the rooms, finished buildings, the calendar, then the raid ─────────
G.passDay = function () {
  if (this.raidPrep) { this.toast('混沌来袭：先选好守城的领袖', '#ff6a5a'); return []; }
  const m = this.meta, from = m.day, logs = M.advanceDay(m);
  m.portal.hp = Math.min(M.portalMax(m), m.portal.hp + M.portalMax(m) * 0.15); this.save();
  const ups = m._lvUps || []; m._lvUps = null; const steps = [];
  ups.forEach(u => steps.push({ run: () => { const h = m.heroes.find(x => x.id === u.id); if (!h) return; try { M.T && M.T.ev('lvup', { src: 'daily', lv: h.lv }); } catch (e) {} this.lvUpFx(h, u.lv0, h.lv, u.p0, M.heroPower(h, m)); }, until: () => !this.lvFx }));
  logs.filter(l => l.c != null).forEach(l => steps.push({ run: () => { const p = this.cellPos(l.c, l.r); this.fx.rays(p.x, p.y, '#ffd060', 1.4, { r: 300 }); this.fx.pop(p.x, p.y - 40, l.t, '#ffe08a', 50, { slam: 1 }); this.fx.explode(p.x, p.y, '#ffd060', 1.6); S.up(2); }, wait: 1.0 }));
  const news = logs.filter(l => l.c == null && !/升到 Lv/.test(l.t || ''));
  if (news.length) steps.push({ run: () => news.forEach((l, i) => setTimeout(() => this.toast(l.t, '#9ccc6a'), i * 350)), wait: 0.4 + news.length * 0.35 });
  steps.push({ run: () => this.tlStart(from, m.day), until: () => !this.tlFx });
  steps.push({ run: () => { const k = M.eventOn(m, m.day); if (k && k !== 'raid') this.dayEvent(k); }, until: () => !this.modal });
  steps.push({ run: () => this.checkRaid(), wait: 0 });
  this.homeQueue(steps);
  return logs;
};
G.restDay = function () { if (this.homeQ) return; this.closePanel(); this.passDay(); };

// ───────── once digging or building has started, the panel closes (user ruling 2026-09-24) ─────────
['doDig', 'doBuild'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function (c, r) { const x0 = M.cell(this.meta, c, r), had = !!(x0 && x0.job), res = o.apply(this, arguments), x = M.cell(this.meta, c, r); if (!had && x && x.job && this.panel) setTimeout(() => { if (this.panel) this.closePanel(); }, 450); return res; }; });

// ───────── what a find is for ─────────
M.lootTip = function (key) {
  if (!key) return null; const I = M.itemInfo(key), [kind, id] = key.split(':'); let d = I.d || '';
  if (kind === 'bbp' && M.BUILDINGS[id]) d = M.BUILDINGS[id].d;
  else if (kind === 'rbp' && M.RELICS[id]) { const L = M.RELICS[id].lines || []; d = '打造「' + M.RELICS[id].n + '」：' + L.slice(0, 2).map(l => M.statText(l.k, l.v)).join('、') + (L.length > 2 ? '，品质越高能力越多' : '') + '。'; }
  else if (kind === 'tile' && M.TILES[id]) { const T = M.TILES[id]; d = '把基地的一格变成「' + T.n + '」：' + (T.anyD || T.d) + (/[。！]$/.test(T.anyD || T.d || '') ? '' : '。'); }
  else if (kind === 'gift' && M.GIFTS && M.GIFTS[id]) d = M.GIFTS[id].d;
  return { title: I.n, c: I.c, d, pic: M.spriteURL(I.icon, 5) };
};
const oTF = G.tipFor;
G.tipFor = function (key) { const mm = /^w-loot-(\d+)$/.exec(key || ''); if (mm && this.run && this.run.loot) { const k = this.run.loot.bp[+mm[1]]; return k ? M.lootTip(k) : null; } return oTF.apply(this, arguments); };
const short = (I) => String(I.n || '').replace(/图纸$/, '').replace(/^地脉结晶·/, '');
// the map bar: each find is its own chip next to the resources (they wrap, never scroll)
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.w && run && run.loot) {
    const n = Math.min(run.loot.bp.length, Math.max(0, Math.round(this.tv ? this.tv('rbp', run.loot.bp.length) : run.loot.bp.length)));
    // the same chip as the score and supplies next to it (user ruling 2026-09-25): its tip comes by key, nothing moves on hover
    v.w.loot = run.loot.bp.slice(0, n).map((k, i) => { const I = M.itemInfo(k); return { img: M.spriteURL(I.icon, 4), c: I.c, n: short(I), tip: 'w-loot-' + i }; });
  }
  // the battle's haul and the end screen: every tile says what it is
  if (v.st && v.st.tiles && this.settle) v.st.tiles.forEach((t, i) => { const s = this.settle.tiles[i]; if (s && s.key) t.tipOn = this.tipFn(() => M.lootTip(s.key)); });
  if (v.end && v.end.tiles) v.end.tiles.forEach(t => { t.tipOn = t.key ? this.tipFn(() => M.lootTip(t.key)) : t.tip ? this.tipFn(t.tip) : null; });
  return v;
};
// tiles remember which find they are
const oLT = G.lootTiles;
if (oLT) G.lootTiles = function () { const out = oLT.apply(this, arguments), bp = (this.run && this.run.loot && this.run.loot.bp) || []; let j = 0; out.forEach(t => { if (t.icon !== 'sack' && t.icon !== 'orb' && bp[j]) { t.key = bp[j++]; t.v = ''; } }); return out; };   // the name already says what kind of find it is
})();

;
