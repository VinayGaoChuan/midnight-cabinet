// ==== mc-vocplay.js ====
(function () {
// What a vocation does on the field, beyond its numbers (user ruling 2026-09-26: every vocation has a clear job).
// · 刺客 goes for the weakest enemy on the field — the lowest power, wherever it stands (ties: the nearest) — so
//   assassins cut down archers, casters and summons behind the enemy line; they are still fragile when they get there.
// · 法师 is the group-damage vocation: every hit of a mage also hits the enemies around its target (a quarter of the
//   damage, radius 110), and its skills are group skills (chain lightning, hail, splash).
// · 祭司 is the aura vocation: every priest carries an aura that strengthens allies or weakens enemies (mc-voc.js).
const M = window.MC, BP = M.Battle3 && M.Battle3.prototype; if (!BP) return;
const RCOL = M.RACES || {};
const SPLASH = M.MAGE_SPLASH = { k: 0.25, r: 110 };
const dist = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.2);
const voc = (e) => e && e.d && e.d.voc;

const oPick = BP.pickTarget;
BP.pickTarget = function (e) {
  if (voc(e) !== '刺客' || e.isHero) return oPick.apply(this, arguments);
  const byTrait = this.call(e, 'pick'); if (byTrait) return byTrait;   // 伏击 still goes for the shooters while hidden
  const list = this.foes(e).filter(o => !o.isHero || this.foes(e).length === 1); if (!list.length) return oPick.apply(this, arguments);
  let best = null; list.forEach(o => { if (!best || (o.pw || 0) < (best.pw || 0) || ((o.pw || 0) === (best.pw || 0) && dist(o, e) < dist(best, e))) best = o; });
  return best;
};
const oStrike = BP.strike;
BP.strike = function (e, tg, ranged) {
  const r = oStrike.apply(this, arguments);
  if (voc(e) === '法师' && e.alive && tg && !this._splash) {
    this._splash = 1;
    try { const col = RCOL[e.d.race] || '#c890ff'; this.aoe(e, tg.x, tg.y, SPLASH.r, e.atk * SPLASH.k, col, null, tg); if (M.pxRing) this.fxp({ k: 'msplash', x: tg.x, y: tg.y, col, life: 0.22 }); }
    finally { this._splash = 0; }
  }
  return r;
};
const oFx = M.drawFxPx;
M.drawFxPx = function (ctx, f, T, b) {
  if (f.k === 'msplash') { const q = (T - f.t0) / f.life; if (q >= 1) return true; ctx.save(); ctx.globalAlpha = (1 - q) * 0.8; M.pxRing(ctx, f.x, f.y, SPLASH.r * (0.5 + 0.5 * q), SPLASH.r / 1.2 * (0.5 + 0.5 * q), f.col, { dense: 0.7, w: 2 }); ctx.restore(); return true; }
  return oFx ? oFx.apply(this, arguments) : false;
};
})();
