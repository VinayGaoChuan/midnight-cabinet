// ==== mc-bp.js ====
(function () {
// Only blueprints that would do something drop. Judged from the rooms already BUILT (blueprints still in the inventory
// don't count): an add-on needs something to boost, a one-off switch is useless twice, relic blueprints need a forge.
const M = window.MC, G = M.Game.prototype;
const has = (m, pred) => !!M.hasBuilt(m, pred);
M.bpUseful = function (m, key) {
  if (!m || !key || key.startsWith('tile:')) return true;
  if (key.startsWith('rbp:')) return has(m, B => !!B.forge);
  if (!key.startsWith('bbp:')) return true;
  const k = key.slice(4), B = M.BUILDINGS[k]; if (!B || B.fixed) return false; const fx = B.fx || {};
  if (k === 'pool') return has(m, X => X.cat === 'med' && X.fx && X.fx.heal >= 0.35);            // boosts a hospital
  if (fx.bank || fx.relicSlot) return has(m, X => !!X.forge) || (m.relics || []).length > 0;       // protects / carries relics
  if (fx.heroCap || fx.deathShards) return has(m, X => !!X.recruit);                                // more leaders / shards to recruit with
  if (fx.tileX2) { let on = false; M.eachBuilt(m, (b, c, r, x) => { if (x.tile) on = true; }); return on; } // doubles tiles under rooms
  if (k === 'lookout') return !has(m, X => X.fx && X.fx.tower);                                     // the map is already revealed
  if (k === 'smithy') return !has(m, X => !!X.forge);                                               // any forge already crafts
  if (k === 'altar') return !has(m, (X, kk) => kk === k);                    // a second copy adds nothing
  return true;
};
// a useful replacement of similar standing (same kind first, then any building)
M.usefulBp = function (m, like, style) {
  const B0 = like && like.startsWith('bbp:') ? M.BUILDINGS[like.slice(4)] : null, q0 = B0 ? B0.q : 0;
  const ks = Object.keys(M.BUILDINGS).filter(k => !M.BUILDINGS[k].fixed && !M.BUILDINGS[k].boss && M.bpUseful(m, 'bbp:' + k));
  const pool = ks.filter(k => M.BUILDINGS[k].q === q0 && (!style || M.BUILDINGS[k].style === style));
  const pool2 = pool.length ? pool : ks.filter(k => M.BUILDINGS[k].q === q0);
  return 'bbp:' + M.pick(pool2.length ? pool2 : ks);
};
const cur = () => M._g && M._g.meta;
const oDrop = M.dropBp;
M.dropBp = function (bias, style, qUp) {
  const m = cur(); if (!m) return oDrop.apply(this, arguments);
  for (let i = 0; i < 16; i++) { const k = oDrop.call(this, bias, style, qUp); if (M.bpUseful(m, k)) return k; }
  return M.usefulBp(m, null, style);
};
// every other path (fixed relic picks, events) is checked where the blueprint is handed out
const oAward = G.award;
G.award = function (list, from) { const m = this.meta; (list || []).forEach(g => { if (g && g.k === 'bp' && !M.bpUseful(m, g.key)) g.key = M.usefulBp(m, g.key, this.run && this.run.theme && this.run.theme.style); }); return oAward.call(this, list, from); };
const oSettle = G.startSettle;
G.startSettle = function () {
  const run = this.run, n0 = run ? run.loot.bp.length : 0; oSettle.call(this); const st = this.settle; if (!st || !run) return;
  const m = this.meta, style = run.theme && run.theme.style; let changed = false;
  for (let i = n0; i < run.loot.bp.length; i++) { const k = run.loot.bp[i]; if (!M.bpUseful(m, k)) { run.loot.bp[i] = M.usefulBp(m, k, style); changed = true; } }
  if (changed) { const keep = st.tiles.filter(t => t.to !== 'rbp' || (t.key || '').startsWith('tile:') || (t.icon === 'gem' && !t.key)); st.tiles = keep.concat(run.loot.bp.slice(n0).filter(k => !k.startsWith('tile:')).map(k => { const I = M.itemInfo(k); return { icon: I.icon, v: 1, c: I.c, to: 'rbp', n: I.n, key: k }; })); }
};
})();

;
