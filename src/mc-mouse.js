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
})();

;
