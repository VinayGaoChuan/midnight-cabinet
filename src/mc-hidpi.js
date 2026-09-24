// ==== mc-hidpi.js ====
(function () {
// Main stage canvases: the bitmap follows stage scale × devicePixelRatio, while every draw call keeps the 1920×1080 space.
const M = window.MC, CP = CanvasRenderingContext2D.prototype, d = (k) => Object.getOwnPropertyDescriptor(CP, k);
const SB = d('shadowBlur'), SX = d('shadowOffsetX'), SY = d('shadowOffsetY'), FL = d('filter');
const lens = (v, R) => String(v).replace(/(blur|drop-shadow)\([^)]*\)/g, (m) => m.replace(/(-?\d*\.?\d+)px/g, (_, n) => (n * R) + 'px'));
function patch(ctx) {
  if (ctx._hiP) return; ctx._hiP = 1;
  ctx.setTransform = function (a, b, c, e, f, h) { const R = this._R || 1; if (a && typeof a === 'object') return CP.setTransform.call(this, a.a * R, a.b * R, a.c * R, a.d * R, a.e * R, a.f * R); return CP.setTransform.call(this, a * R, b * R, c * R, e * R, f * R, h * R); };
  ctx.resetTransform = function () { const R = this._R || 1; CP.setTransform.call(this, R, 0, 0, R, 0, 0); };
  ctx.getTransform = function () { const m = CP.getTransform.call(this), R = this._R || 1; return new DOMMatrix([m.a / R, m.b / R, m.c / R, m.d / R, m.e / R, m.f / R]); };
  [['shadowBlur', SB], ['shadowOffsetX', SX], ['shadowOffsetY', SY]].forEach(([k, D]) => { if (D) Object.defineProperty(ctx, k, { configurable: true, get() { return D.get.call(this) / (this._R || 1); }, set(v) { D.set.call(this, v * (this._R || 1)); } }); });
  if (FL) Object.defineProperty(ctx, 'filter', { configurable: true, get() { return FL.get.call(this); }, set(v) { const R = this._R || 1; FL.set.call(this, R === 1 ? v : lens(v, R)); } });
}
M._hiPatch = patch;
M.hiCanvas = function (c, scale) {
  if (!c._lw) { c._lw = +c.getAttribute('width') || c.width; c._lh = +c.getAttribute('height') || c.height; }
  const R = Math.max(1, Math.min(2, Math.round((scale || 1) * (window.devicePixelRatio || 1) * 4) / 4)), bw = Math.round(c._lw * R), bh = Math.round(c._lh * R);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; const x = c.getContext('2d'); patch(x); x._R = R; CP.setTransform.call(x, R, 0, 0, R, 0, 0); }
  return c;
};
})();

;
