// ==== mc-recruit.js ====
(function () {
// Recruiting (user ruling 2026-09-24): no slot reel. One card is drawn; it charges up — cracks spread, its glow climbs
// through the qualities up to the one it holds — then shatters and shows the leader's true face, which flies into the
// leader bar. Recruit rooms also sell room for more leaders (扩建: leader cap +1).
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (p) => 1 - Math.pow(1 - p, 3), eb = (p) => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const now = () => performance.now();
const CW = 300, CH = 420, CX = 960, CY = 480, T_IN = 0.55, T_CHARGE = 1.75, T_REVEAL = 3.0, T_END = 3.7;

// ───────── leader cap: 扩建 ─────────
M.CAP_MAX = 4;
M.capCost = (m) => 200 * (1 + (m.capBuy || 0));
G.buyCap = function () {
  const m = this.meta, cost = M.capCost(m); if ((m.capBuy || 0) >= M.CAP_MAX) return;
  if (m.supplies < cost) { this.toast('物资不足', '#d0453c'); return; }
  this.hold('msup', m.supplies); m.supplies -= cost; this.release('msup'); m.capBuy = (m.capBuy || 0) + 1; m.heroCapBonus = (m.heroCapBonus || 0) + 1; this.save();
  M.Sfx.up && M.Sfx.up(2); this.pulse.heroes = now(); this.toast('领袖上限 +1（' + M.heroCap(m) + '）', '#ffe08a');
};

// ───────── the draw ─────────
// called by G.recruit (mc-meta-a.js) once the new leader exists
G.recruitCard = function (h, rar, done) {
  const shards = [], n = 8, k = 11;
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) { const x0 = -CW / 2 + i * CW / n, y0 = -CH / 2 + j * CH / k, w = CW / n, hh = CH / k, cx = x0 + w / 2, cy = y0 + hh / 2, a = Math.atan2(cy, cx), sp = 500 + Math.random() * 700;
    [[[x0, y0], [x0 + w, y0], [x0, y0 + hh]], [[x0 + w, y0], [x0 + w, y0 + hh], [x0, y0 + hh]]].forEach(tri => shards.push({ tri, vx: Math.cos(a) * sp * (0.6 + Math.random() * 0.6), vy: Math.sin(a) * sp * 0.8 - 300 - Math.random() * 300, vr: (Math.random() - 0.5) * 12, cx, cy })); }
  const cracks = []; for (let i = 0; i < 9; i++) { let a = i / 9 * 6.283 + Math.random() * 0.4, x = 0, y = 0; const pts = [[0, 0]]; for (let s = 0; s < 7; s++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 26; y += Math.sin(a) * 26; pts.push([x, y]); } cracks.push(pts); }
  const idx = this.meta.heroes.indexOf(h), to = { x: 24 + Math.max(0, idx) * 122 + 56, y: 1080 - 24 - 66 };
  this.cardFx = { t: 0, h, rar, done, shards, cracks, to, img: M.spriteCanvas(M.HEROES[h.cls].sprite, 16), ic: M.iconCanvas('c_' + h.cls, 4), boom: false, ticks: 0 };
  S.whoosh && S.whoosh(0.5); this.bump();
};
const RC = () => M.RARITY.map(r => r.c);
function cardBack(x, t, glowC, glowA) {
  const g = x.createLinearGradient(0, -CH / 2, 0, CH / 2); g.addColorStop(0, '#34143e'); g.addColorStop(1, '#12081a'); x.fillStyle = g; x.fillRect(-CW / 2, -CH / 2, CW, CH);
  x.strokeStyle = '#caa84a'; x.lineWidth = 8; x.strokeRect(-CW / 2 + 4, -CH / 2 + 4, CW - 8, CH - 8); x.strokeStyle = 'rgba(202,168,74,0.5)'; x.lineWidth = 2; x.strokeRect(-CW / 2 + 22, -CH / 2 + 22, CW - 44, CH - 44);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { x.fillStyle = '#caa84a'; x.beginPath(); x.moveTo(sx * (CW / 2 - 22), sy * (CH / 2 - 22)); x.lineTo(sx * (CW / 2 - 52), sy * (CH / 2 - 22)); x.lineTo(sx * (CW / 2 - 22), sy * (CH / 2 - 52)); x.fill(); });
  x.save(); x.rotate(t * 0.6); x.strokeStyle = glowC; x.globalAlpha = 0.5 + 0.5 * glowA; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 70, 0, 7); x.stroke(); for (let i = 0; i < 6; i++) { x.rotate(Math.PI / 3); x.beginPath(); x.moveTo(0, -70); x.lineTo(0, -92); x.stroke(); } x.restore();
  x.globalAlpha = 1; x.fillStyle = glowC; x.beginPath(); x.moveTo(0, -46); x.lineTo(12, -12); x.lineTo(46, 0); x.lineTo(12, 12); x.lineTo(0, 46); x.lineTo(-12, 12); x.lineTo(-46, 0); x.lineTo(-12, -12); x.fill(); x.fillStyle = '#fff6e0'; x.beginPath(); x.arc(0, 0, 9, 0, 7); x.fill();
}
function drawCard(ctx, F) {
  const t = F.t, cols = RC(), rc = cols[F.rar] || '#ffffff', H = M.HEROES[F.h.cls];
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // the room goes dark
  const dim = t < T_REVEAL ? cl(t / 0.3, 0, 1) : 1 - cl((t - T_REVEAL) / (T_END - T_REVEAL), 0, 1); ctx.fillStyle = 'rgba(4,2,8,' + (0.78 * dim).toFixed(3) + ')'; ctx.fillRect(0, 0, 1920, 1080);
  // the glow climbs through the qualities it passes on the way to its own
  const tier = t < T_IN ? 0 : Math.min(F.rar, Math.floor((t - T_IN) / ((T_CHARGE - T_IN) / (F.rar + 1)))), glowC = cols[tier];
  if (t < T_CHARGE) {
    const qi = eo(cl(t / T_IN, 0, 1)), qc = cl((t - T_IN) / (T_CHARGE - T_IN), 0, 1), shake = qc * qc * (6 + F.rar * 5);
    const x = 960 + (CX - 960) * qi + (Math.random() - 0.5) * shake, y = 1000 + (CY - 1000) * qi + (Math.random() - 0.5) * shake, s = 0.3 + 0.7 * eb(qi);
    if (qc > 0) { const r = 180 + 260 * qc; const g = ctx.createRadialGradient(x, y, 20, x, y, r); g.addColorStop(0, glowC); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.4 * qc; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * Math.max(0.08, Math.abs(Math.cos((1 - qi) * Math.PI * 2))), s); ctx.rotate((1 - qi) * 0.4); cardBack(ctx, t, glowC, qc);
    // cracks spread from the centre, white-hot
    if (qc > 0.05) { ctx.globalCompositeOperation = 'lighter'; F.cracks.forEach(p => { const nq = Math.floor(qc * (p.length - 1)) + 1; ctx.strokeStyle = glowC; ctx.lineWidth = 7; ctx.globalAlpha = 0.6; ctx.beginPath(); p.slice(0, nq + 1).forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.globalAlpha = 1; ctx.stroke(); }); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }
  // the shatter
  if (t >= T_CHARGE && !F.boom) { F.boom = true; S.boom && S.boom(); S.fanfare && S.fanfare(); if (F.g) { F.g.fx.kick(22 + F.rar * 6); F.g.fx.rays && F.g.fx.rays(CX, CY, rc, 2.2); } }
  if (t >= T_CHARGE) {
    const d = t - T_CHARGE;
    if (d < 0.35) { ctx.globalAlpha = 0.85 * (1 - d / 0.35); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
    if (d < 0.7) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - d / 0.7; ctx.strokeStyle = rc; ctx.lineWidth = 16 * (1 - d / 0.7) + 2; ctx.beginPath(); ctx.ellipse(CX, CY, 60 + d * 1400, 40 + d * 800, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (d < 1.3) F.shards.forEach(p => { ctx.save(); ctx.globalAlpha = cl(1 - d / 1.3, 0, 1); ctx.translate(CX + p.cx + p.vx * d, CY + p.cy + p.vy * d + 900 * d * d); ctx.rotate(p.vr * d); ctx.translate(-p.cx, -p.cy); ctx.fillStyle = (p.cx + p.cy) % 3 > 1 ? '#2a1034' : '#3e1a48'; ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.beginPath(); p.tri.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    // the true face: rays, the leader, its emblem and name — then it flies to the leader bar
    const fl = cl((t - T_REVEAL) / (T_END - T_REVEAL - 0.1), 0, 1), q = eo(fl), rv = eb(cl(d / 0.5, 0, 1));
    const x = CX + (F.to.x - CX) * q, y = CY + (F.to.y - CY) * q - Math.sin(q * Math.PI) * 160, sc = (1 - 0.8 * q) * rv;
    if (fl < 1) {
      if (q < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(CX, CY); ctx.rotate(t * 0.5); ctx.globalAlpha = (1 - q * 2) * 0.55; for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? rc : '#ffffff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -700); ctx.lineTo(30, -700); ctx.fill(); } ctx.restore(); }
      if (F.img) { const w = F.img.width * 1.1 * sc, hh = F.img.height * 1.1 * sc; ctx.save(); ctx.imageSmoothingEnabled = false; if (M.glow) M.glow(ctx, x, y, 220 * sc, rc, 0.6); ctx.drawImage(F.img, x - w / 2, y - hh / 2, w, hh); ctx.restore(); }
      if (q < 0.15) { const a = 1 - q / 0.15; ctx.save(); ctx.globalAlpha = a * cl(d / 0.4, 0, 1); ctx.textAlign = 'center'; ctx.font = "700 72px 'Noto Serif SC', serif"; ctx.lineWidth = 8; ctx.strokeStyle = '#0a0610'; ctx.strokeText(H.n, CX, CY + 270); ctx.fillStyle = rc; ctx.fillText(H.n, CX, CY + 270);
        if (F.ic) { const s2 = 72; ctx.imageSmoothingEnabled = false; ctx.drawImage(F.ic, CX - s2 / 2, CY - 300, s2, s2); } ctx.restore(); }
    }
  }
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt); const F = this.cardFx; if (!F) return; F.g = this; F.t += dt;
  const fc = this.ui && this.ui.cv('fx'); if (fc) drawCard(fc.getContext('2d'), F);
  if (F.t >= T_END) { this.cardFx = null; this.pulse.heroes = now(); if (this.fx) this.fx.burst && this.fx.burst(F.to.x, F.to.y, M.RARITY[F.rar].c, 20); S.land && S.land(2 + F.rar); if (F.done) F.done(); }
  this.bump();
};
// nothing else is clicked while the card plays
['baseClick', 'openPanel'].forEach(k => { const o = G[k]; if (o) G[k] = function () { if (this.cardFx) return; return o.apply(this, arguments); }; });
// the recruit panel: the draw button, and 扩建
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta, pn = v.pn;
  if (this.cardFx) v.fxZ = 60;   // the draw plays above every panel
  if (pn && pn.isRecruit && m) { const n = m.capBuy || 0, cost = M.capCost(m); pn.capOn = n < M.CAP_MAX; pn.capBtn = '扩建：花 ' + cost + ' 物资，领袖上限 +1'; pn.capOk = m.supplies >= cost; pn.capOp = pn.capOk ? 1 : 0.5; pn.buyCap = () => { M.Sfx.click(); this.buyCap(); }; }
  return v;
};
})();

;
