// ==== mc-game-g.js ====
(function () {
// Pixel-era overrides of the screen tick loops: scenes render at art resolution, then scale up crisp.
const M = window.MC, G = M.Game.prototype;
G.battleTick = function (dt) {
  const b = this.battle; if (!b) return;
  if (!this.paused && !this.settle) b.step(dt * this.speed * (this.reel ? 0.03 : 1));
  if (b.cutin && b.cutin !== this.lastCut) { this.lastCut = b.cutin; this.banner({ kind: 'skill', text: b.cutin.text, sub: b.cutin.sub, col: b.cutin.col, img: M.spriteCanvas(b.cutin.sprite, 22), life: 1.25, y: 470 }); }
  if (this.settle) this.settleTick(dt); else if (b.over && b.overT > 1.0) this.startSettle();
  const c = this.ui.cv('field'); if (c) M.pxRender(c, 1920, 720, (x) => b.render(x, { slow: this.reel ? 1 : 0 }), 'field');
};
G.worldTick = function (dt) {
  const w = this.walker, run = this.run; if (!w) return;
  let zoom = 1, fade = 0;
  if (this.trans) { this.trans.t += dt; const q = Math.min(1, this.trans.t / 0.7);
    if (this.trans.kind === 'out') { zoom = 1 + 0.6 * q * q; fade = q; if (this.trans.t >= 0.75) { const n = this.trans.node; this.trans = null; this.beginBattle(n); return; } }
    else { zoom = 1.25 - 0.25 * (1 - Math.pow(1 - q, 3)); fade = 1 - q; if (q >= 1) this.trans = null; } }
  else if (!this.modal && !this.reel && !this.chest) w.update(dt, this.keys, (n) => this.arrive(n)); else w.follow(dt);
  if (run.tut && !w.edge && !this.modal && M.nodeAhead(run.map, w.node).length > 1) this.coachOnce('fork', '岔路！点击 ↑ 或 ↓ 箭头（或按键）选择要走的路。另一条路会就此关闭。', 960, 880);
  const c = this.ui.cv('world'); if (c) M.pxRender(c, 1920, 1080, (x) => M.drawWorld2(x, run, w, { zoom, fade, dt }), 'world');
};
})();

;
