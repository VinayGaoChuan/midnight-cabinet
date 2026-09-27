// ==== mc-tutor.js ====
(function () {
// The new-player guide (user ruling 2026-09-27: 「新手引导这一块，要强制引导，以动效，指示为主，文字一定要简练，每个点只能一句话，
// 能不说话的就不说话……新手引导中，复杂的理解，可以在屏幕中央播放操作动画，并附上说明」). It replaces the old coach bubbles, which
// were switched off on 2026-09-24 (too busy).
// · A step lights one thing: the rest of the screen dims, a gold frame pulses round it, a gold arrow bobs over it and one short
//   sentence sits beside it. While a step is forced, a press anywhere outside the frame does nothing (keys still work).
// · No animations (2026-09-27: 「你的教学示例视频，都是抽象的，这种不行……如果做不好，就不要这个功能了，引导的时候，直接强制引导操作就
//   完了」, then 「引导视频都删了吧，就用强制引导挺好」): every step is the frame, the arrow and its one sentence.
// · A step is done once its situation has passed (it was shown and its condition no longer holds); a step whose target
//   cannot be found for 5 s is skipped, and 「跳过引导」 in the corner switches the whole guide off — nobody gets stuck.
// · It runs once per player (the profile remembers each step), through the 序章, the first day at the base and the first
//   chapter map.
const M = window.MC, G = M.Game.prototype, now = () => performance.now();
const tutRun = (g) => !!(g.run && g.run.region && g.run.region.tut);
const busy = (g) => !!(g.guideBusy && g.guideBusy()) || !!(g.parade || g.evoFx || g.storyFx || g.homeQ || g.night || g.dirPick || g.relPick || g.lvFx || g.bpPick || g.trans || g.replace || g.tipLock || g.swapFx) || !!(g.baseBusy && g.screen === 'base' && g.baseBusy());
const stageRect = (g, sel) => { const els = document.querySelectorAll(sel); let el = null; for (const e of els) { const r = e.getBoundingClientRect(); if (r.width > 2 && r.height > 2) { el = e; break; } } if (!el) return null;
  const st = g.ui && g.ui.stage && g.ui.stage(); if (!st) return null; const s = g.ui.scale(), sr = st.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s }; };
// the world's glowing arrows (where mc-world2.js draws them), all of them joined
function arrowsRect(g) {
  const w = g.walker, run = g.run; if (!w || w.edge || !run) return null; const map = run.map, n = map.nodes[w.node], outs = M.nodeAhead(map, w.node); if (!outs.length) return null;
  const toS = (x, y) => ({ x: 960 + (x - w.camX), y: 560 + (y - w.camY) }); let a = null;
  outs.forEach(e => { const p = toS(e.dir === 'right' ? n.x + 270 : n.x + 130, e.dir === 'right' ? n.y - 4 : n.y + (e.dir === 'up' ? -150 : 150)), r = { x: p.x - 40, y: p.y - 36, w: 80, h: 72 };
    a = a ? { x: Math.min(a.x, r.x), y: Math.min(a.y, r.y), w: Math.max(a.x + a.w, r.x + r.w) - Math.min(a.x, r.x), h: Math.max(a.y + a.h, r.y + r.h) - Math.min(a.y, r.y) } : r; });
  return a;
}
function digRect(g) {
  const m = g.meta, bv = g.bv, G2 = M.BASE_GEO; if (!m || !bv || !G2 || !M.canDig) return null; const z = bv.z || 1;
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { if (!M.canDig(m, c, r)) continue; const p = bv.toScreen(c * G2.CW + G2.CW / 2, G2.TOP + r * G2.CH + G2.CH / 2); if (p.x < 60 || p.x > 1150 || p.y < 150 || p.y > 1000) continue; return { x: p.x - G2.CW * z / 2, y: p.y - G2.CH * z / 2, w: G2.CW * z, h: G2.CH * z }; }
  return null;
}
function portalRect(g) { const bv = g.bv, G2 = M.BASE_GEO; if (!bv || !G2) return null; const z = bv.z || 1, d = bv.toScreen(G2.DOOR_X, -130); return { x: d.x - 100 * z, y: d.y - 120 * z, w: 200 * z, h: 240 * z }; }
function steleRect(g) { const s = g.bv && g.bv.steles && g.bv.steles[0]; return s && g.portalOn && g.portalOn() ? { x: s.x, y: s.y, w: s.w, h: s.h } : null; }
// the card the first shop points at: one that makes three of a kind, else the cheapest one the wallet reaches
function buyIdx(g) {
  const run = g.run, us = run && run.shop && run.shop.units; if (!us) return -1; const have = {}; run.roster.forEach(u => { have[u.type] = (have[u.type] || 0) + 1; });
  let best = -1; us.forEach((c, i) => { if (c.sold || run.wallet < c.cost) return; if ((have[c.type] || 0) % 3 === 2) best = i; });
  if (best < 0) us.forEach((c, i) => { if (!c.sold && run.wallet >= c.cost && (best < 0 || c.cost < us[best].cost)) best = i; });
  return best;
}
const shopSold = (g) => !!(g.run && g.run.shop && g.run.shop.units && g.run.shop.units.some(c => c.sold));
// the steps, in order; say = one short sentence
const STEPS = [
  { id: 'walk', say: '点箭头往前走', force: 1, when: (g) => g.screen === 'world' && tutRun(g) && g.walker && !g.walker.edge && g.run.map.nodes[g.walker.node].col === 0, at: arrowsRect },
  { id: 'settle', say: '收下，继续前进', force: 1, free: 1, when: (g) => g.screen === 'battle' && tutRun(g) && g.settle && g.settle.t > 1.9 && !g.settle.final, at: (g) => stageRect(g, '[data-g="st-next"]') },
  { id: 'fork', say: '选一条路', force: 1, when: (g) => g.screen === 'world' && tutRun(g) && g.walker && !g.walker.edge && M.nodeAhead(g.run.map, g.walker.node).length > 1, at: arrowsRect },
  { id: 'buy', say: '买下它', force: 1, when: (g) => g.screen === 'shop' && tutRun(g) && !shopSold(g) && buyIdx(g) >= 0, at: (g) => stageRect(g, '[data-g="buy"][data-bi="' + buyIdx(g) + '"]') },
  { id: 'leave', say: '离开夜市', when: (g) => g.screen === 'shop' && tutRun(g) && shopSold(g), at: (g) => stageRect(g, '[data-g="shop-leave"]') },
  { id: 'dig', say: '点这块岩层', force: 1, when: (g) => g.screen === 'base' && g.meta && g.meta.tutDone && !g.panel && !(g.portalOn && g.portalOn()) && !anyJob(g), at: digRect },
  { id: 'digGo', say: '挖开', force: 1, when: (g) => g.screen === 'base' && g.panel && g.panel.kind === 'dig', at: (g) => stageRect(g, '[data-g="dig"]') },
  { id: 'rest', say: '结束白天', force: 1, when: (g) => g.screen === 'base' && g.meta && g.meta.tutDone && !g.panel && anyJob(g) && !(g.meta.raids > 0), at: (g) => stageRect(g, '[data-tip="b-rest"]') },
  { id: 'portal', say: '从这里出征', force: 1, when: (g) => g.screen === 'base' && g.meta && g.meta.raids > 0 && !g.panel && !(g.portalOn && g.portalOn()), at: portalRect },
  { id: 'stele', say: '选一个世界', force: 1, when: (g) => g.screen === 'base' && g.portalOn && g.portalOn() && !g.panel, at: steleRect },
  { id: 'launch', say: '出发', force: 1, when: (g) => g.screen === 'base' && g.panel && g.panel.kind === 'loadout', at: (g) => stageRect(g, '[data-g="launch"]') },
];
function anyJob(g) { const m = g.meta; if (!m || !m.base) return false; return m.base.cells.some(row => row.some(x => x && x.job)); }
M.TUTOR = STEPS;
// only new players get it: a profile that already has a game past its first day starts with the guide off
const prof = (g) => { const p = g.prof; if (!p) return null; if (!p.tutor) { const m = g.meta, old = !!(m && m.tutDone && ((m.raids || 0) > 0 || (m.day || 1) > 2)); p.tutor = { done: {}, off: old ? 1 : 0 }; } return p.tutor; };
const save = (g) => { try { g.saveProfile && g.saveProfile(); } catch (e) {} };
const TU = { step: null, since: 0, seenAt: 0, missSince: 0, rect: null };
M.tutorOff = (g) => { const p = prof(g); if (p) { p.off = 1; save(g); } TU.step = null; g.bump(); };
M.tutorReset = (g) => { const p = prof(g); if (p) { p.done = {}; p.off = 0; save(g); } };
function finish(g, st) { const p = prof(g); if (p && st) { p.done[st.id] = 1; save(g); } TU.step = null; TU.rect = null; }
G.tutorTick = function () {
  const p = prof(this); if (!p || p.off) { if (TU.step) TU.step = null; return; }
  const t = now(), cur = TU.step;
  if (cur) {
    // its situation passed: done; still here: follow the target (skip it if it has been gone 5 s)
    if (!cur.when(this)) { finish(this, cur); this.bump(); return; }
    if (!cur.at) { finish(this, cur); return; }
    const r = cur.at(this); if (r) { TU.rect = r; TU.missSince = 0; } else { if (!TU.missSince) TU.missSince = t; if (t - TU.missSince > 5000) { finish(this, cur); this.bump(); } TU.rect = null; }
    return;
  }
  for (const st of STEPS) {
    if (p.done[st.id] || !st.when(this)) continue; if (!st.free && busy(this)) return;
    TU.step = st; TU.since = t; TU.missSince = 0; TU.rect = st.at ? st.at(this) : null; this.bump(); return;
  }
};
const oTick = G.tick;
G.tick = function () {
  const r = oTick.apply(this, arguments);
  try { this.tutorTick(); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('tutor: ' + e.message); TU.step = null; }
  // the frame follows its target smoothly; a new position is a new render (tickless while it stands still)
  if (TU.step && TU.rect) { const k = [TU.rect.x, TU.rect.y, TU.rect.w, TU.rect.h].map(Math.round).join(','); if (k !== TU.key) { TU.key = k; this.bump(); } }
  return r;
};
// a forced step: presses outside its frame (and the skip key) do nothing
const inside = (r, x, y, pad) => r && x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
const SKIP = { x: 860, y: 1030, w: 200, h: 46 };   // 「跳过引导」, bottom middle
['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click', 'touchstart'].forEach(type => window.addEventListener(type, (e) => {
  const g = M._g, st = TU.step; if (!g || !st || !st.force) return; if (e.target && e.target.closest && e.target.closest('[data-g="tutor-skip"]')) return;
  const pt = e.touches && e.touches[0] ? e.touches[0] : e; if (pt.clientX == null) return; const p = g.miniPt(pt.clientX, pt.clientY);
  if (inside(TU.rect, p.x, p.y, 14) || inside(SKIP, p.x, p.y, 0)) return;
  e.stopPropagation(); e.preventDefault && e.cancelable && e.preventDefault();
}, true));
// the look: dim with a hole, a gold frame, a bobbing arrow, one sentence
try { const st = document.createElement('style'); st.textContent = '@keyframes tuBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}@keyframes tuPulse{0%,100%{outline-color:#ffcf4a}50%{outline-color:#fff3b0}}'; document.head.appendChild(st); } catch (e) {}
const oView = G.view;
G.view = function () {
  const v = oView.call(this), st = TU.step, p = prof(this);
  M._tu = TU;
  if (p && !p.off && v.worldHint) v.worldHint = '';   // the guide shows the way; the old how-to line under the map goes
  v.tuSkipOn = !!(st && p && !p.off); v.tuSkip = (e) => { if (e && e.stopPropagation) e.stopPropagation(); M.Sfx.click(); M.tutorOff(this); };
  const r = TU.rect; v.tuOn = !!(st && r && st.say);
  if (v.tuOn) {
    const pad = 10, x = Math.round(r.x - pad), y = Math.round(r.y - pad), w = Math.round(r.w + pad * 2), h = Math.round(r.h + pad * 2), above = y > 170;
    v.tu = { x, y, w, h, dim: st.force ? 0.62 : 0.35, ax: Math.round(x + w / 2 - 24), ay: above ? y - 70 : y + h + 10, rot: above ? 0 : 180, say: st.say,
      sx: Math.round(Math.max(20, Math.min(1920 - 520, x + w / 2 - 260))), sy: above ? Math.max(8, y - 150) : Math.min(1080 - 70, y + h + 80) };
  }
  return v;
};
})();
