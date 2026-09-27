// ==== mc-mouse.js ====
(function () {
// Mouse players are first-class: anything that looks pressable can be clicked, and the right button means "back" (same as Esc).
const M = window.MC, G = M.Game.prototype;

// ───────── right click = Esc ─────────
G.backAction = function () {
  if (this.mini) { if (this.handleKey) this.handleKey({ type: 'keydown', code: 'Escape', key: 'Escape', repeat: false, preventDefault() {}, stopPropagation() {} }); return; }
  if (this.settingsOpen && this.closeSettings) return this.closeSettings();
  if (this.modal && this.modal.back) { this.modal.back(); this.bump && this.bump(); return; }
  this.closePanel();
};
// ───────── Android back key / back gesture (packaged app) ─────────
// the Android shell asks window.__wgpBack() before leaving; true = the game used the press. Anything open closes exactly
// like Esc / right click; on a bare screen the first press only warns and a second one within 2 s leaves the app.
const openSig = (g) => [g.guide, g.rulesOpen, g.settingsOpen, g.modal, g.panel, g.portalOn && g.portalOn(), g.coachData].map(v => v ? 1 : 0).join('');
window.__wgpBack = function () {
  const g = window.__mcg || M._g; if (!g) return false;
  if (g.mini) { g.backAction(); return true; }
  const was = openSig(g); g.backAction(); if (openSig(g) !== was) return true;
  const t = Date.now(); if (g.exitArmed && t - g.exitArmed < 2000) return false;
  g.exitArmed = t; g.toast('再按一次返回键退出游戏', '#f4efe0'); return true;
};
// the page evaluates the bundle twice, so this listener exists twice: only the first one acts on a given click
window.addEventListener('contextmenu', (ev) => { const g = M._g; if (!g || ev.defaultPrevented) return; ev.preventDefault();
  if (ev.ctrlKey && ev.button !== 2) return; /* macOS turns Ctrl + click into a context menu: while Ctrl shows details, that is not "back" */ if (g.rebind) return; g.lastInput = 'kbm'; g.backAction(); });

// ───────── world map: the next stops, their labels and the glowing arrows all take a click ─────────
const STUB = 130;
G.worldHit = function (sx, sy) {
  const w = this.walker, run = this.run; if (!w || w.edge || this.modal || this.reel || this.chest || this.mini) return null;
  const map = run.map, n = map.nodes[w.node], toS = (x, y) => ({ x: 960 + (x - w.camX), y: 560 + (y - w.camY) });
  let pick = null, bd = 1e9;
  M.nodeAhead(map, w.node).forEach(e => {
    const hx = e.dir === 'right' ? n.x + 270 : n.x + STUB, hy = e.dir === 'right' ? n.y - 4 : n.y + (e.dir === 'up' ? -150 : 150), a = toS(hx, hy), t = map.nodes[e.b], tp = toS(t.x, t.y);
    // arrow box, the stop itself (icon and label under it), and the road between here and there
    const dA = Math.hypot(a.x - sx, a.y - sy), dN = Math.hypot(tp.x - sx, (tp.y - 20) - sy) * 0.8;
    const c0 = toS(n.x, n.y), vx = tp.x - c0.x, vy = tp.y - c0.y, L2 = vx * vx + vy * vy, q = L2 ? Math.max(0, Math.min(1, ((sx - c0.x) * vx + (sy - c0.y) * vy) / L2)) : 0, dR = Math.hypot(c0.x + vx * q - sx, c0.y + vy * q - sy) + (q < 0.25 ? 60 : 0);
    const d = Math.min(dA < 70 ? dA : 1e9, dN < 110 ? dN : 1e9, dR < 55 ? dR + 30 : 1e9);
    if (d < bd) { bd = d; pick = e.dir; }
  });
  return pick;
};
G.worldTap = function (sx, sy) { const dir = this.worldHit(sx, sy); if (!dir) return false; this.tapDir = dir; this.tapAt = performance.now(); M.Sfx.click(); return true; };
const oMove = G.worldMove;
G.worldMove = function (sx, sy) {
  oMove.call(this, sx, sy); const dir = this.worldHit(sx, sy);
  if (dir !== this.worldHot) { this.worldHot = dir; if (dir) M.Sfx.hover && M.Sfx.hover(); }
  if (this.walker) this.walker.hot = dir;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this); v.worldCursor = this.screen === 'world' && this.worldHot && this.walker && !this.walker.edge ? 'pointer' : 'default';
  if (this.screen === 'world' && this.lastInput !== 'pad' && this.lastInput !== 'touch' && v.worldHint != null && !/点击/.test(v.worldHint)) v.worldHint = '点击箭头或下一站前进（也可以按 → ↑ ↓） · 右键 / Esc 返回 · 走过的路不能回头 · 鼠标悬浮节点查看详情';
  return v;
};

// ───────── dragging the map (2026-09-27: 「点住地图，拖拽后，要能拖动地图，以前是不让拖动地图，错了」) ─────────
// press on the map and move more than a few pixels: the view follows the pointer (within the map); letting go keeps it there and
// swallows the click, so a drag never sets off. Setting off eases the view back onto the explorer (mc-world2.js follow).
{
  let D = null;
  const onMap = (e) => e.target && e.target.closest && e.target.closest('[data-g="worldcv"]');
  window.addEventListener('pointerdown', (e) => { const g = M._g; if (!g || g.screen !== 'world' || !g.walker || e.button > 0 || !onMap(e) || !g.miniPt) return; const p = g.miniPt(e.clientX, e.clientY); D = { x: p.x, y: p.y, px: g.walker.panX || 0, py: g.walker.panY || 0, on: false, id: e.pointerId }; }, true);
  window.addEventListener('pointermove', (e) => {
    const g = M._g; if (!D || !g || g.screen !== 'world' || !g.walker || e.pointerId !== D.id) return; const p = g.miniPt(e.clientX, e.clientY), dx = p.x - D.x, dy = p.y - D.y;
    if (!D.on && Math.hypot(dx, dy) < 14) return; D.on = true; const w = g.walker, map = g.run && g.run.map; w.dragging = true;
    const xs = map ? map.nodes.map(n => n.x) : [w.x], ys = map ? map.nodes.map(n => n.y) : [w.y], base = w.x + 260;
    const px = Math.max(Math.min(...xs) - base, Math.min(Math.max(...xs) - base, D.px - dx)), py = Math.max(Math.min(...ys) - 200 - w.y, Math.min(Math.max(...ys) + 200 - w.y, D.py - dy));
    w.camX += px - (w.panX || 0); w.camY += py - (w.panY || 0); w.panX = px; w.panY = py; g.tipData = null; g.bump();
  }, true);
  const up = (e) => { const g = M._g; if (!D) return; if (D.on && g) { g.swallowClick = performance.now(); if (g.walker) g.walker.dragging = false; } D = null; };
  window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
}
})();

;
