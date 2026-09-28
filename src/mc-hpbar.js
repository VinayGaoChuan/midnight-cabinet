// ==== mc-hpbar.js ====
(function () {
// Life bars like League of Legends' (user ruling 2026-09-27: 「血条都换成类似英雄联盟里的那种血条，首先有刻度，然后是双层血条，第一层先掉血，
// 然后底下那层再追的效果」): the bar is two layers — the front one drops the moment a blow lands, the pale one behind it waits a
// moment and then runs down after it, so the size of every hit shows. Ticks mark fixed amounts of life (1 / 2 / 5 × 10ⁿ, the
// smallest that leaves them at least 4 pixels apart), every fifth one taller, so a thick bar of ticks reads as "a lot of life"
// at a glance. Every fighting bar uses it: the battle's units and leader, the night's units, its 强敌 / 首领, the buildings and
// the main base, the big boss bar.
const M = window.MC, PP = M.PJ.PAL;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
M.HPBAR = { hold: 0.35, rate: 4, minRate: 0.3, gap: 4, trail: '#fff0c8' };   // the pale layer waits `hold` s, then closes rate×gap a second (at least minRate of the bar)
const STEPS = [1, 2, 5];
M.hpTick = function (max, w) { const need = (M.HPBAR.gap * max) / Math.max(1, w); let e = Math.pow(10, Math.floor(Math.log10(Math.max(1, need)))); for (let g = 0; g < 12; g++) { for (const s of STEPS) if (s * e >= need) return s * e; e *= 10; } return 0; };
// e: anything that keeps its own trail (a unit, a building, the main base); o: { hp, max, col, hi, lo, T (seconds), frame, ink, slot, trail }
M.hpBar = function (ctx, x, y, w, h, e, o) {
  o = o || {}; const hp = Math.max(0, o.hp != null ? o.hp : e.hp || 0), mx = Math.max(1, o.max || e.maxHp || e.max || 1), T = o.T != null ? o.T : performance.now() / 1000;
  const f = cl(hp / mx, 0, 1), C = M.HPBAR, S = e && typeof e === 'object' ? (e._hb || (e._hb = { tr: f, f, t: T, hit: -9 })) : { tr: f, f, t: T, hit: -9 };
  const dt = cl(T - S.t, 0, 0.1); S.t = T;
  if (f < S.f - 1e-6) S.hit = T; S.f = f;
  if (f >= S.tr) S.tr = f; else if (T - S.hit > C.hold) S.tr = Math.max(f, S.tr - Math.max(C.minRate, (S.tr - f) * C.rate) * dt);
  const ink = o.ink || PP.ink, R = (a, b, c, d, col) => { if (c > 0 && d > 0) { ctx.fillStyle = col; ctx.fillRect(a, b, c, d); } };
  if (o.frame !== false) R(x - 2, y - 2, w + 4, h + 4, ink);
  R(x, y, w, h, o.slot || PP.abyss);
  if (S.tr > f) R(x + w * f, y, w * (S.tr - f), h, o.trail || C.trail);   // the life just lost, still showing
  const fw = w * f, hb = Math.max(1, Math.round(h * 0.3));
  R(x, y, fw, h, o.col || PP.green); if (o.hi) R(x, y, fw, hb, o.hi); if (o.lo) R(x, y + h - hb, fw, hb, o.lo);
  const st = M.hpTick(mx, w); if (st) for (let v = st, i = 1; v < mx - 1e-6; v += st, i++) { const tx = Math.round(x + w * v / mx), big = i % 5 === 0; R(tx, y, 1, big ? h : Math.max(1, Math.ceil(h * 0.55)), ink); }
  if (o.shield > 0) R(x, y, w * cl(o.shield / mx, 0, 1), Math.max(1, Math.round(h * 0.3)), PP.ice);
};
})();
