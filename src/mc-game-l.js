// ==== mc-game-l.js ====
(function () {
// Coming home: every gain flies into its slot on the base bar; a fallen leader's card is torn in front of you first.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - p, 3), eback = M.ease.eback;

// ───────── record exactly what the run added, so the base bar can count it up on landing ─────────
const snap = (g) => { const m = g.meta; return { sup: m.supplies, sh: m.shards, orb: m.orbs }; };
const oldWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, h = run && run.hero, s0 = snap(this), lv0 = h ? h.lv : 0, bp = run ? run.loot.bp.slice() : [];
  oldWin.call(this, kind);
  const s1 = snap(this); if (this.endInfo) this.endInfo.gain = { msup: s1.sup - s0.sup, msh: s1.sh - s0.sh, morb: s1.orb - s0.orb, exp: run.loot.exp, heroId: h && h.id, ups: h ? h.lv - lv0 : 0, bp: bp.filter(k => !k.startsWith('tile:')) };
};
const oldFail = G.runFail;
G.runFail = function () {
  const run = this.run, h = run.hero, s0 = snap(this), dead = { name: M.heroN(h), cls: h.cls, lv: h.lv, rarity: h.rarity, region: run.region.n };
  oldFail.call(this);
  const s1 = snap(this); if (this.endInfo) this.endInfo.gain = { msup: s1.sup - s0.sup, msh: s1.sh - s0.sh, morb: s1.orb - s0.orb, dead };
};

// ───────── back to base ─────────
G.endBack = function () {
  const info = this.endInfo || {}, m = this.meta, gain = info.gain || {}; M.Sfx.click();
  // the bar keeps showing the old numbers until each flight lands
  if (gain.msup > 0) this.hold('msup', m.supplies - gain.msup);
  if (gain.msh > 0) this.hold('msh', m.shards - gain.msh);
  if (gain.morb > 0) this.hold('morb', m.orbs - gain.morb);
  this.toBase();
  (info.newTiles || []).forEach((t, i) => setTimeout(() => { const p = this.cellPos(t.c, t.r); this.fx.rays(p.x, p.y, M.TILES[t.t].c, 1.5, { r: 260 }); this.fx.pop(p.x, p.y, '新地格 · ' + M.TILES[t.t].n, M.TILES[t.t].c, 44); M.Sfx.up(2); }, 800 + i * 500));
  let wait = 900;
  if (gain.dead) { this.tear = { t: 0, dead: gain.dead, gain, fired: false, seed: Math.random() * 100 }; wait = 4200; M.Sfx.whoosh(0.5); }
  else setTimeout(() => this.lootFly(gain, { x: 960, y: 560 }), 380);
  if (this.pendingDay) { this.pendingDay = false; setTimeout(() => { this.passDay(); setTimeout(() => this.checkRaid(), 1600); }, wait + 600); }
};
// a burst of icons from one point into the bar; every counter is released when its flight lands (or after a safety delay)
G.lootFly = function (gain, from) {
  const jit = (k) => ({ x: from.x + (Math.random() - 0.5) * k, y: from.y + (Math.random() - 0.5) * k * 0.6 });
  const seq = [['sack', 'msup', '#caa84a', gain.msup], ['shard', 'msh', '#d8a0ff', gain.msh], ['orb', 'morb', '#b8ff9a', gain.morb]].filter(x => x[3] > 0);
  seq.forEach(([ic, k, col, v], i) => {
    const n = cl(Math.round(3 + v / 40), 3, 8), d0 = 0.1 + i * 0.3;
    for (let j = 0; j < n; j++) this.fly(ic, jit(160), k, col, j === n - 1 ? () => { if (this.held[k] != null) this.release(k); const p = this.fxPos(k); if (p) this.fx.pop(p.x, p.y + 50, '+' + M.fmt(v), col, 34, { num: 1 }); } : null, d0 + j * 0.07);
    setTimeout(() => { if (this.held[k] != null) this.release(k); }, (d0 + 2.6) * 1000);
  });
  if (gain.exp > 0 && gain.heroId) { const sel = 'hero-' + gain.heroId, d0 = 0.2 + seq.length * 0.3; for (let j = 0; j < 5; j++) this.fly('orb', jit(140), sel, '#9cff7a', j === 4 ? () => { const p = this.fxPos(sel); if (p) { this.fx.pop(p.x, p.y - 90, gain.ups ? '升级！Lv +' + gain.ups : '经验 +' + gain.exp, '#9cff7a', gain.ups ? 50 : 34); if (gain.ups) { this.fx.rays(p.x, p.y, '#9cff7a', 1, { r: 180 }); M.Sfx.up(2); } } } : null, d0 + j * 0.08); }
  (gain.bp || []).forEach((k, i) => { const I = M.itemInfo(k); this.fly(I.icon === 'gem' ? 'gem' : 'scroll', jit(120), this.corePos(), I.c, i === 0 ? () => { const p = this.corePos(); this.fx.pop(p.x, p.y - 60, '图纸 +' + gain.bp.length, '#ffe08a', 36); } : null, 0.5 + seq.length * 0.3 + i * 0.1); });
};

// ───────── the torn card ─────────
const T_FLY = 0.7, T_HOLD = 1.9, T_RIP = 2.0, T_END = 3.8;
const cards = {};
function cardCanvas(d) {
  const k = d.cls + '|' + d.rarity + '|' + d.name + '|' + d.lv; if (cards[k]) return cards[k];
  const R = M.RARITY[d.rarity], w = 300, h = 420, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a2030'); g.addColorStop(1, '#0c0a10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = R.c; x.fillRect(0, 0, w, 8); x.fillRect(0, h - 8, w, 8); x.fillRect(0, 0, 8, h); x.fillRect(w - 8, 0, 8, h);
  x.fillStyle = '#0a080c'; x.fillRect(8, 8, w - 16, 4); x.strokeStyle = M.shade(R.c, -0.35); x.lineWidth = 2; x.strokeRect(18, 18, w - 36, h - 36);
  const rg = x.createRadialGradient(w / 2, 170, 10, w / 2, 170, 150); rg.addColorStop(0, 'rgba(255,210,140,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, w, h);
  const sp = M.spriteCanvas(M.HEROES[d.cls].sprite, 10); if (sp) { x.imageSmoothingEnabled = false; const s = Math.min(220 / sp.width, 230 / sp.height); x.drawImage(sp, w / 2 - sp.width * s / 2, 290 - sp.height * s, sp.width * s, sp.height * s); }
  x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(18, 300, w - 36, 100);
  if (M.pxText) { M.pxText(x, M.HEROES[d.cls].n, w / 2, 332, 40, R.c); M.pxText(x, 'Lv ' + d.lv, w / 2, 374, 24, '#cfc6b8'); }
  return (cards[k] = c);
}
function tearPath(seed) { const pts = []; for (let i = 0; i <= 14; i++) { const y = i / 14 * 420; pts.push([150 + Math.sin(seed + i * 2.7) * 16 + ((i * 7919 + seed * 13) % 17 - 8) * 1.6, y]); } pts[0][1] = -2; pts[14][1] = 422; return pts; }
M.drawTear = function (ctx, g) {
  const T = g.tear; if (!T) return;
  const t = T.t, d = T.dead, card = cardCanvas(d), CX = 960, CY = 500, st = T.start || (T.start = g.fxPos('heroes') || { x: 240, y: 960 });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dim = t < T_END - 0.6 ? cl(t / 0.4, 0, 1) : cl((T_END - t) / 0.6, 0, 1);
  ctx.fillStyle = 'rgba(4,2,8,' + (0.72 * dim) + ')'; ctx.fillRect(0, 0, 1920, 1080);
  // title
  if (t > 0.4 && t < T_END - 0.3) { const a = cl((t - 0.4) / 0.3, 0, 1) * cl((T_END - 0.3 - t) / 0.4, 0, 1); ctx.globalAlpha = a; M.pxText(ctx, '领袖阵亡', CX, 150, 92, '#ff4a4a'); M.pxText(ctx, d.name + ' 永远留在了' + d.region, CX, 228, 34, '#cfc6b8'); ctx.globalAlpha = 1; }
  const tp = T.path || (T.path = tearPath(T.seed));
  if (t < T_RIP) {
    // fly in, then strain: the card trembles harder and a crack runs down it
    const q = eo(cl(t / T_FLY, 0, 1)), x = st.x + (CX - st.x) * q, y = st.y + (CY - st.y) * q - Math.sin(q * Math.PI) * 160, sc = 0.35 + 0.65 * eback(cl(t / T_FLY, 0, 1));
    const strain = cl((t - T_FLY) / (T_HOLD - T_FLY), 0, 1), sh = strain * strain * 12, rot = (1 - q) * -0.5 + (Math.random() - 0.5) * strain * 0.05;
    ctx.translate(x + (Math.random() - 0.5) * sh, y + (Math.random() - 0.5) * sh); ctx.rotate(rot); ctx.scale(sc, sc);
    M.pxGlow && M.pxGlow(ctx, 0, 0, 260, M.RARITY[d.rarity].c, 0.25 + strain * 0.3);
    ctx.drawImage(card, -150, -210);
    if (strain > 0) { const n = Math.floor(strain * tp.length); ctx.strokeStyle = '#fff3e0'; ctx.lineWidth = 3 + strain * 3; ctx.shadowColor = '#ff6a3a'; ctx.shadowBlur = 14; ctx.beginPath(); tp.slice(0, Math.max(2, n)).forEach(([a, b], i) => i ? ctx.lineTo(a - 150, b - 210) : ctx.moveTo(a - 150, b - 210)); ctx.stroke(); ctx.shadowBlur = 0; }
  } else {
    // two halves fly apart with a ragged paper edge
    const u = t - T_RIP, fall = u * u * 900;
    [-1, 1].forEach(side => {
      ctx.save(); ctx.translate(CX + side * (u * 520 + u * u * 120), CY + fall * 0.55 - u * 180); ctx.rotate(side * (u * 1.6 + u * u * 0.8)); ctx.globalAlpha = cl(1 - (u - 0.9) / 0.9, 0, 1);
      ctx.beginPath(); if (side < 0) { ctx.moveTo(-150, -210); tp.forEach(([a, b]) => ctx.lineTo(a - 150, b - 210)); ctx.lineTo(-150, 210); } else { ctx.moveTo(150, -210); tp.forEach(([a, b]) => ctx.lineTo(a - 150, b - 210)); ctx.lineTo(150, 210); } ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(card, -150, -210); ctx.restore();
      ctx.strokeStyle = '#f5ead4'; ctx.lineWidth = 5; ctx.beginPath(); tp.forEach(([a, b], i) => i ? ctx.lineTo(a - 150 + side * 2, b - 210) : ctx.moveTo(a - 150 + side * 2, b - 210)); ctx.stroke();
      ctx.restore();
    });
    // the soul lingers where the card was, then scatters into shards and orbs
    if (u < 1.3) { const a = cl(1 - u / 1.3, 0, 1); M.pxGlow && M.pxGlow(ctx, CX, CY - u * 60, 120 + u * 80, '#c890ff', 0.7 * a); }
  }
  ctx.restore();
};
S.rip = function () { S.noise(0.12, 0.35, 5000); S.noise(0.35, 0.3, 2400, 0.05); S.noise(0.5, 0.2, 900, 0.12); S.tone(120, 0.3, 'sawtooth', 0.08, -60); };
G.tearTick = function (dt) {
  const T = this.tear; if (!T) return; T.t += dt;
  const beat = Math.floor((T.t - T_FLY) / 0.32); if (T.t > T_FLY && T.t < T_RIP && beat !== T.beat) { T.beat = beat; S.heart(); this.fx.kick(2 + beat); }
  if (!T.fired && T.t >= T_RIP) {
    T.fired = true; S.rip(); S.shatter(); this.fx.kick(26); this.fx.flash('#ffffff', 0.35);
    const tp = T.path || [], col = M.RARITY[T.dead.rarity].c;
    for (let i = 0; i < 3; i++) this.fx.spark(960, 330 + i * 150, i % 2 ? '#f5ead4' : col, 18, { dir: i % 2 ? Math.PI : 0, spread: 2.4, v: 900 });
    this.fx.explode(960, 500, '#c890ff', 1.3); this.fx.confetti && this.fx.confetti(40);
    setTimeout(() => this.lootFly(T.gain, { x: 960, y: 480 }), 650);
  }
  if (T.t >= T_END) this.tear = null;
  this.bump();
};

// ───────── hooks ─────────
const oldTick = G.tick;
G.tick = function (dt) { oldTick.call(this, dt); if (this.tear && !this.fx.frozen) this.tearTick(Math.min(dt, 0.05)); };
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) { const g = M._g; if (g && this === g.fx && (g.tear || g.mini)) { ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); if (g.mini && M.drawMini) M.drawMini(ctx, g); if (g.tear) M.drawTear(ctx, g); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('overlay: ' + e.message); if (g.tear) g.tear = null; } ctx.restore(); } return oD.call(this, ctx, noClear); };
const oldView = G.view;
G.view = function () { const v = oldView.call(this); if (this.tear) { v.coverOn = true; v.tipOn = false; } return v; };
})();

;
