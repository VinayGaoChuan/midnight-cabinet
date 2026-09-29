// ==== mc-resume.js ====
(function () {
// An expedition survives a reload (QA 2026-09-29: 「第8站后刷新并重开，点“继续”回到出征前基地；再出征回第1站，资源和队伍重置」—
// 「节点结算后保存站点、队伍、资源和事件状态，继续时恢复出征」; user 2026-09-29: 「要保留这个功能，防止玩家觉得打不过，就重开，
// 无限刷」; accepted when the same stop, after a reload or closing the page, shows the same progress and resources and pays
// nothing twice).
// While an expedition is on, each time a stop is settled and nothing is open over the map, the game save (meta) and then the
// expedition are written, the same moment (also while walking on: the stop it set out from is the one saved). 继续 on the
// menu puts the player back at that stop: the stop is not entered again, so nothing on it is paid again, and leaving the page
// no longer throws an expedition away to start a fresh one. A run that ends (back at the base, a new game) takes its save
// with it; a save that belongs to another day or another run is ignored.
const M = window.MC, G = M.Game.prototype, KEY = 'midnight-cabinet-run-v1';
const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
const put = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); return true; } catch (e) { return false; } };
const del = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
// which run of which game this is: the day and the number of runs finished (it only grows when a run ends), and the leader
const fp = (m, run) => [m.day, m.runs, run && run.hero && run.hero.id].join(':');

// nothing open over the map: no fight, no settlement, no event, no mini-game, no chest, no pick
const busy = (g) => !!(g.battle || g.settle || g.modal || g.mini || g.chest || g.reel || g.swapFx || g.garSwapFx || g.evoFx || g.storyFx || g.bigFx || g.parade || g.replace || g.trans || (g.storyQ && g.storyQ.length) || (g.gaActive && g.gaActive()));
function sig(g) { const run = g.run, w = g.walker; return [w.node, run.map.nodes.filter(n => n.done).length, Math.round(run.wallet || 0), run.roster.map(u => u.type + '*' + (u.star || 0)).join(','), (run.items || []).join(','), run.hero && Math.round(run.hero.hp)].join('|'); }
function pack(g) {
  const run = g.run;
  const body = JSON.stringify(run, function (k, v) { if (this === run) { if (k === 'M' || k === 'amb' || k === '_poolRaces') return undefined; if (k === 'hero') return { __hero: v && v.id }; } return v; });
  return { v: 1, fp: fp(g.meta, run), node: g.walker.node, run: body, at: Date.now() };
}
function save(g) { g.save(); if (!put(pack(g))) (window.__mcErrs = window.__mcErrs || []).push('resume: the expedition save did not fit'); }

const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), run = this.run, w = this.walker;
  if (run && !(run.region && run.region.tut) && this.screen === 'world' && w && w.map === run.map && (!w.node || (run.map.nodes[w.node] || {}).done) && !busy(this)) {
    const s = sig(this); if (s !== this._rsSig) { this._rsSig = s; try { save(this); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('resume: ' + e.message); } }
  }
  return r;
};

// the menu's 继续: an expedition saved for this game goes on where it stopped
function resume(g, s) {
  const run = JSON.parse(s.run), m = g.meta, hid = run.hero && run.hero.__hero, h = m.heroes.find(x => x.id === hid);
  if (!h || h.hp <= 0 || !run.map || !run.map.nodes || !run.map.nodes[s.node]) return false;
  run.M = m; run.hero = h; if (run.pool && run.pool.races) run._poolRaces = run.pool.races;
  run.grant = 0; run.startGift = 0;   // the opening points were counted when the run began: no second show
  if (fp(m, run) !== s.fp) return false;
  const w = new M.Walker2(run.map), n = run.map.nodes[s.node]; Object.assign(w, { node: s.node, x: n.x, y: n.y, camX: n.x + 260, camY: n.y });
  g.run = run; g.walker = w; g._rsSig = sig(g); g.enterWorld();
  g.toast && g.toast('继续出征 · ' + (run.region ? run.region.n : '') + ' · 第 ' + (s.node + 1) + ' 站', '#f2c14e');
  return true;
}
const oStart = G.startGame;
G.startGame = function () {
  const s = get();
  if (s && s.v === 1 && this.meta && this.prof && this.prof.active && this.meta.tutDone) {
    try { M.Sfx.init && M.Sfx.init(); if (resume(this, s)) return; } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('resume: ' + e.message); }
    del();
  }
  return oStart.apply(this, arguments);
};
// a run that ends takes its save with it
['toBase', 'newGame'].forEach(k => { const o = G[k]; if (!o) return; G[k] = function () { del(); return o.apply(this, arguments); }; });
M.runSaved = () => { const s = get(); return !!(s && s.v === 1); };
})();
