// ==== mc-perf.js ====
(function () {
// Phones (user ruling 2026-09-27: 「出个apk包，你自己先先过下所有性能问题，能找到根因的就修复。目标是在三星glax s9+这种手机上60帧」).
// Measured with the S9+ WebView emulated (Android UA, 866×412 at DPR 2.625, main thread slowed 6×): a battle spent a
// fifth of its time re-rendering the page — every bump rebuilt the whole template and let React diff it, ~35 times a
// second in a battle, every frame in a mini-game — and most of those renders changed nothing (base 74 %, map 68 %,
// battle 40 % identical: the shake offsets alone re-rendered the page, though the tick already moves the stage).
// · Every device: a bump computes the view once and compares its data (functions, nodes and the shake left out) with the
//   last one rendered; the same → no render. A different one is handed to the render as it is (no second view()).
// · Phones (M.LOW_FX: touch devices, or any device that fell under 30 fps): at most 20 renders a second; a bump within
//   50 ms of the last waits for the next slot (merged, never dropped).
const M = window.MC, G = M.Game.prototype, now = () => performance.now();
M.UI_GAP = 50;
const SKIP = { shx: 1, shy: 1, shr: 1 };
const rep = (k, x) => (typeof x === 'function' || (x && (x.nodeType || x instanceof HTMLCanvasElement)) || SKIP[k] ? undefined : x);
const oBump = G.bump, oView = G.view;
function flush(g) {
  let v = null, sig = null;
  try { v = oView.call(g); sig = JSON.stringify(v, rep) + '|' + g.screen + '|' + !!(M.Sfx && M.Sfx.muted); } catch (e) { v = null; sig = null; }
  if (sig != null && sig === g._vsig) return;
  g._vsig = sig; g._vc = v; g._vcAt = now(); g._bumpAt = now();
  oBump.call(g);
}
G.bump = function () {
  if (!M.LOW_FX) return flush(this);
  const d = now() - (this._bumpAt || 0);
  if (d >= M.UI_GAP && !this._bumpT) return flush(this);
  if (!this._bumpT) this._bumpT = setTimeout(() => { this._bumpT = 0; flush(this); }, Math.max(0, M.UI_GAP - d));
};
// the render takes the view the bump just computed (if it is fresh), else computes its own
G.view = function () {
  const v = this._vc; if (v && now() - this._vcAt < 40) { this._vc = null; return v; }
  this._vc = null; return oView.apply(this, arguments);
};
M.uiForce = (g) => { g._vsig = null; };   // next bump renders whatever it computes
// on phones the game notes its own frame times, per screen, every 15 s (console → the test build's log): a real S9+ tells
// what the emulated one could only estimate. slow = frames over 20 ms.
const PF = { st: {}, last: 0, at: now() };
const oTick = G.tick;
G.tick = function (dt) {
  if (M.LOW_FX) {
    const t = now(), d = PF.last ? t - PF.last : 0; PF.last = t;
    if (d > 0 && d < 1000) { const k = this.screen + (this.raid ? '/raid' : ''), o = PF.st[k] || (PF.st[k] = { n: 0, sum: 0, w: 0, slow: 0 }); o.n++; o.sum += d; if (d > o.w) o.w = d; if (d > 20) o.slow++; }
    if (t - PF.at > 15000) { const L = Object.keys(PF.st).filter(k => PF.st[k].n > 30).map(k => { const o = PF.st[k]; return k + ' ' + (1000 * o.n / o.sum).toFixed(1) + 'fps slow' + Math.round(100 * o.slow / o.n) + '% worst' + Math.round(o.w) + 'ms'; });
      if (L.length) console.info('[perf] ' + L.join(' | ')); PF.st = {}; PF.at = t; }
  }
  return oTick.apply(this, arguments);
};
})();
