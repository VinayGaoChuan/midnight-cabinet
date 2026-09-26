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
  if (this.screen !== 'base' || this.raid || this.lvPick) return;   // a talent page opened by a level-up holds the rest
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

// ───────── while a base animation plays, the base can't be clicked (user ruling 2026-09-26) ─────────
// 「动效播放的时候，是不能点击基地的其他地方的」: a transparent lock sits over the whole base (z 70, above the bars and the
// calendar, under guides and tips); a click on it only speeds the show up (§11.6). Anything the show asks the player to
// answer (an event, choosing a talent, picking the raid leader) lifts the lock while it waits.
G.baseBusy = function () {
  if (this.screen !== 'base' || this.raid || this.modal || this.raidPrep || this.lvPick || this.visit) return false;   // a visit has its own dim layer
  return !!(this.homeQ || this.lvFx || this.tlFx || this.expand || this.coreFx || this.coreQueue || this.tear || this.rite || this.dayFx || this.cardFx || this.saveFx);
};
const oBaseClick = G.baseClick;
if (oBaseClick) G.baseClick = function () { if (this.baseBusy()) { this.hurry && this.hurry(); return; } return oBaseClick.apply(this, arguments); };
const oViewL = G.view;
G.view = function () {
  const v = oViewL.call(this); v.lockOn = this.baseBusy();
  if (v.lockOn) { v.tipOn = false; v.lockClick = () => { if (this.hurry) this.hurry(); }; }
  v.pickOn = this.pickShown(); if (v.pickOn) { v.pnZ = 65; v.pickCancel = () => { S.click(); this.closePanel(); }; }   // the page over the dimmed base and bars
  return v;
};

// ───────── a level-up opens the talent page (user ruling 2026-09-26) ─────────
// 「英雄升级后，应该直接弹出升级选择技能的页面，如果解锁新技能了，那就播放解锁新技能的效果。如果玩家不想现在就选择天赋，
// 可以点击取消，如果选择完了，没有天赋点了，或者没有可用天赋了，那也算取消，然后继续推进其他结算效果」
// The ceremony plays first (LEVEL UP, the power roll-up, a new talent layer lighting up node by node), then the leader's
// talent page opens by itself over a dimmed base while there is a point to spend and a talent to take. 取消 (or ✕ / Esc)
// closes it; the last point spent, or nothing left to take, closes it too. Whatever else the homecoming has waits for it.
if (M.GUIDE) M.GUIDE.push({ id: 'lvpick', cat: '领袖', icon: 't_skill', title: '升级选天赋', line: '领袖升级后直接打开天赋页，可以当场学，也可以取消以后再学。', scr: 'base', sel: '[data-g="pick"]' });
M.talAny = (h) => !!h && h.points > 0 && Array.isArray(h.tree) && h.tree.some((n, i) => M.talCan(h, i));
G.pickShown = function () { const P = this.lvPick; return !!(P && this.panel && this.panel.kind === 'hero' && this.panel.id === P.id); };
const oLvNext = G.lvNext;
G.lvNext = function () {
  const L = this.lvFx;
  if (L && L.h && !L.asked) {
    L.asked = 1; const m = this.meta, h = m && m.heroes.find(x => x.id === L.h.id), onPage = !!(h && this.panel && this.panel.kind === 'hero' && this.panel.id === h.id);
    if (h && this.screen === 'base' && !this.raid && !onPage && M.talAny(h)) { this.lvFx = null; this.lvPick = { id: h.id }; this.openPanel({ kind: 'hero', id: h.id }); return; }
  }
  if (this.lvPick) return;   // the next leader's ceremony waits for this page
  return oLvNext.apply(this, arguments);
};
const oTake = G.takeTalent;
G.takeTalent = function (id) {
  const r = oTake.apply(this, arguments), P = this.lvPick, h = this.meta && this.meta.heroes.find(x => x.id === id);
  if (P && P.id === id && !M.talAny(h)) P.doneAt = performance.now() + 900;   // the node's burst plays out, then the page closes
  return r;
};
const oTickP = G.tick;
G.tick = function (dt) {
  const r = oTickP.apply(this, arguments), P = this.lvPick;
  if (P) {
    if (P.doneAt && performance.now() > P.doneAt && this.pickShown()) { P.doneAt = 0; this.closePanel(); }
    if (!this.pickShown()) { this.lvPick = null; this.lvNext(); this.bump && this.bump(); }   // closed, cancelled or replaced: go on
  }
  return r;
};

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
  gifts.forEach((r, i) => steps.push({ run: () => { const p = r.cc != null ? this.cellPos(r.cc, r.cr) : r.door ? { x: 960, y: 250 } : { x: 960, y: 420 + (i % 3) * 60 }; this.fx.rays && this.fx.rays(p.x, p.y, r.col, 1.2, { r: 220 }); this.fx.pop(p.x, p.y - 40, r.n + ' · ' + r.t, r.col, 36); S.up && S.gain('relic'); }, wait: 0.8 }));
  if (info.coreHeal) steps.push({ run: () => { const p = this.fxPos('core') || this.corePos(); this.fx.rays(p.x, p.y, '#9cff7a', 1.4, { r: 200 }); this.fx.pop(p.x, p.y + 60, '基地核心 +1', '#9cff7a', 44); S.heal(); this.pulse.core = performance.now(); }, wait: 1.0 });
  // 2. a fallen leader: the card tears (its shards already flew in above), then the core takes the blow
  if (gain.dead) steps.push({ run: () => { this.tear = { t: 0, dead: gain.dead, gain: {}, fired: false, seed: Math.random() * 100 }; S.tear('in'); }, until: () => !this.tear });
  if (info.coreHit) steps.push({ run: () => { this.coreQueue = { pd: false, hp: m.core == null ? 3 : m.core }; }, until: () => !this.coreQueue && !this.coreFx });
  // 3. level-ups from the run
  if (gain.ups > 0 && gain.heroId) steps.push({ run: () => { const h = m.heroes.find(x => x.id === gain.heroId); if (!h) return; const lv0 = h.lv - gain.ups; try { M.T && M.T.ev('lvup', { src: 'run', lv: h.lv, ups: gain.ups }); } catch (e) {} this.lvUpFx(h, lv0, h.lv, M.heroPowerAt(h, m, lv0), M.heroPower(h, m)); }, until: () => !this.lvFx });
  // 4–6. the day: finished buildings, the calendar, the raid
  if (this.pendingDay) { this.pendingDay = false; steps.push({ run: () => this.passDay(), wait: 0 }); }
  this.homeQueue(steps);
};

// ───────── a day passes: level-ups from the rooms, finished buildings, the calendar, then the raid ─────────
G.passDay = function () {
  if (this.raidPrep) { this.deny('混沌来袭：先选好守城的领袖', '#ff6a5a'); return []; }
  const m = this.meta, from = m.day, logs = M.advanceDay(m);
  m.portal.hp = Math.min(M.portalMax(m), m.portal.hp + M.portalMax(m) * 0.15); this.save();
  const ups = m._lvUps || []; m._lvUps = null; const steps = [];
  ups.forEach(u => steps.push({ run: () => { const h = m.heroes.find(x => x.id === u.id); if (!h) return; try { M.T && M.T.ev('lvup', { src: 'daily', lv: h.lv }); } catch (e) {} this.lvUpFx(h, u.lv0, h.lv, u.p0, M.heroPower(h, m)); }, until: () => !this.lvFx }));
  logs.filter(l => l.c != null).forEach(l => steps.push({ run: () => { const p = this.cellPos(l.c, l.r); if (M.PXR) M.PXR.poke(l.c + ',' + l.r, 'built'); this.fx.rays(p.x, p.y, '#ffd060', 1.4, { r: 300 }); this.fx.pop(p.x, p.y - 40, l.t, '#ffe08a', 50, { slam: 1 }); this.fx.explode(p.x, p.y, '#ffd060', 1.6); if (/挖掘/.test(l.t)) S.digDone(); else S.buildDone(); }, wait: 1.0 }));
  const news = logs.filter(l => l.c == null && !/升到 Lv/.test(l.t || ''));
  if (news.length) steps.push({ run: () => news.forEach((l, i) => setTimeout(() => this.toast(l.t, '#9ccc6a'), i * 350)), wait: 0.4 + news.length * 0.35 });
  steps.push({ run: () => this.tlStart(from, m.day), until: () => !this.tlFx });
  steps.push({ run: () => { const k = M.eventOn(m, m.day); if (k && k !== 'raid') this.dayEvent(k); }, until: () => !this.modal && !this.visit });
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
  if (v.st && v.st.tiles && this.settle) v.st.tiles.forEach((t, i) => { const s = this.settle.tiles[i]; if (s && s.key && i < this.settle.shown) t.tipOn = this.tipFn(() => M.lootTip(s.key)); });
  if (v.end && v.end.tiles) v.end.tiles.forEach(t => { t.tipOn = t.key ? this.tipFn(() => M.lootTip(t.key)) : t.tip ? this.tipFn(t.tip) : null; });
  return v;
};
// tiles remember which find they are
const oLT = G.lootTiles;
if (oLT) G.lootTiles = function () { const out = oLT.apply(this, arguments), bp = (this.run && this.run.loot && this.run.loot.bp) || []; let j = 0; out.forEach(t => { if (t.icon !== 'sack' && t.icon !== 'orb' && bp[j]) { t.key = bp[j++]; t.v = ''; } }); return out; };   // the name already says what kind of find it is
})();

;
