// ==== mc-lines-art.js ====
(function () {
// A line unit (mc-lines.js) is drawn with its line's character: every look-up of a unit's picture — the shop card's
// animation, the roster, the pool, the battle (mc-battle3 hands the art key over already) — goes to the base character.
// Loaded last, outside the pixel-character layer (mc-pcd-game.js), so the base character's own renderer answers.
// The tier shows in its quality colour (names, card borders), its size (quality sizes in battle) and, in battle, one
// diamond per evolution over its head.
const M = window.MC, DB = M.DB, P16 = M.P16;
const artOf = (k) => { const d = k && DB[k]; return d && d.art && d.art !== k && DB[d.art] ? d.art : k; };
M.artOf = artOf;
if (P16) {
  const oSpec = P16.spec; if (oSpec) P16.spec = function (k) { return oSpec.call(this, artOf(k)); };
  const oFrame = P16.frame; if (oFrame) P16.frame = function (k) { const a = [].slice.call(arguments); a[0] = artOf(k); return oFrame.apply(this, a); };
  const oImg = P16.img; if (oImg) P16.img = function (k) { const a = [].slice.call(arguments); a[0] = artOf(k); return oImg.apply(this, a); };
}
const oSC = M.spriteCanvas; if (oSC) M.spriteCanvas = function (k) { const a = [].slice.call(arguments); a[0] = artOf(k); return oSC.apply(this, a); };
const oSU = M.spriteURL; if (oSU) M.spriteURL = function (k) { const a = [].slice.call(arguments); a[0] = artOf(k); return oSU.apply(this, a); };
// the old units' skill looks and one-line sentences (mc-awaken.js) serve their strengthened copies too
if (M.TRAIT_AW) Object.keys(M.TDB).forEach(k => { const b = M.TDB[k].base; if (b && M.TRAIT_AW[b] && !M.TRAIT_AW[k]) M.TRAIT_AW[k] = M.TRAIT_AW[b]; });
// battle: one diamond per evolution over an evolved unit of ours, in its quality colour (world pass only, mc-omen.js)
const Q = M.QUALITY, oHud = M.drawBattleHudPx;
M.drawBattleHudPx = function (ctx, b, T) {
  if (oHud) oHud.apply(this, arguments);
  const U = M.bUI; if (!U || !M.uiWorld || !M.uiWorld()) return;
  b.ents.forEach(e => {
    if (!e.alive || e.side !== 'A' || !(e.tier >= 2) || T < (e.entryT || 0) + 0.5) return;
    const n = e.tier - 1, H0 = 88 * (e.sz || 1), y = U.g2(Math.max(4, e.y - H0 - 44 - (e.air ? e.air.z : 0))), c = (Q[e.tier - 1] || Q[0]).c;
    ctx.save();
    for (let i = 0; i < n; i++) { const x = e.x + (i - (n - 1) / 2) * 18; ctx.save(); ctx.translate(Math.round(x), y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#07060f'; ctx.fillRect(-8, -8, 16, 16); ctx.fillStyle = c; ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }
    ctx.restore();
  });
};
})();

;
