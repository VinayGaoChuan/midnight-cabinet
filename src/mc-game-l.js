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
  (info.newTiles || []).forEach((t, i) => setTimeout(() => { const p = this.cellPos(t.c, t.r); this.fx.rays(p.x, p.y, M.TILES[t.t].c, 1.5, { r: 260 }); this.fx.pop(p.x, p.y, '新地格 · ' + M.TILES[t.t].n, M.TILES[t.t].c, 40); M.Sfx.up(2); }, 800 + i * 500));
  let wait = 900;
  if (gain.dead) { this.tear = { t: 0, dead: gain.dead, gain, fired: false, seed: Math.random() * 100 }; wait = 4200; M.Sfx.whoosh(0.5); }
  else setTimeout(() => this.lootFly(gain, { x: 960, y: 560 }), 380);
  if (this.pendingDay) { this.pendingDay = false; setTimeout(() => { this.passDay(); setTimeout(() => this.checkRaid(), 1600); }, wait + 600); }
};
// a burst of icons from one point into the bar; every counter is released when its flight lands (or after a safety delay)
G.lootFly = function (gain, from) {
  const jit = (k) => ({ x: from.x + (Math.random() - 0.5) * k, y: from.y + (Math.random() - 0.5) * k * 0.6 });
  const seq = [['sack', 'msup', P.gold, gain.msup], ['shard', 'msh', P.violet, gain.msh], ['orb', 'morb', P.lime, gain.morb]].filter(x => x[3] > 0);
  seq.forEach(([ic, k, col, v], i) => {
    const n = cl(Math.round(3 + v / 40), 3, 8), d0 = 0.1 + i * 0.3;
    for (let j = 0; j < n; j++) this.fly(ic, jit(160), k, col, j === n - 1 ? () => { if (this.held[k] != null) this.release(k); const p = this.fxPos(k); if (p) this.fx.pop(p.x, p.y + 50, '+' + M.fmt(v), col, 32, { num: 1 }); } : null, d0 + j * 0.07);
    setTimeout(() => { if (this.held[k] != null) this.release(k); }, (d0 + 2.6) * 1000);
  });
  if (gain.exp > 0 && gain.heroId) { const sel = 'hero-' + gain.heroId, d0 = 0.2 + seq.length * 0.3; for (let j = 0; j < 5; j++) this.fly('orb', jit(140), sel, P.lime, j === 4 ? () => { const p = this.fxPos(sel); if (p) { this.fx.pop(p.x, p.y - 90, gain.ups ? '升级！Lv +' + gain.ups : '经验 +' + gain.exp, P.lime, gain.ups ? 52 : 32); if (gain.ups) { this.fx.rays(p.x, p.y, P.lime, 1, { r: 180 }); M.Sfx.up(2); } } } : null, d0 + j * 0.08); }
  (gain.bp || []).forEach((k, i) => { const I = M.itemInfo(k); this.fly(I.icon === 'gem' ? 'gem' : 'scroll', jit(120), this.corePos(), I.c, i === 0 ? () => { const p = this.corePos(); this.fx.pop(p.x, p.y - 60, '图纸 +' + gain.bp.length, P.gold, 40); } : null, 0.5 + seq.length * 0.3 + i * 0.1); });
};

// ───────── the torn card ─────────
const T_FLY = 0.7, T_HOLD = 1.9, T_RIP = 2.0, T_END = 3.8;
// Pixel Juice（docs/design.md §11.5）：卡片 = 机箱风格的卡（夜色底、3px 墨框、品质色内圈、9px 硬投影），有像素半身像就用
const U = M.UI, P = M.PJ.PAL, RM = () => !!M.PJ.reduced;
const bustImg = (k) => M.UI.bust(k);
const cards = {};
function cardCanvas(d) {
  const k = d.cls + '|' + d.rarity + '|' + d.name + '|' + d.lv; if (cards[k]) return cards[k];
  const Rc = M.RARITY[d.rarity], qc = U.pal(Rc.c), w = 300, h = 420, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  // 卡身 285×405（外 3px 墨框），右下 9px 硬投影都画在 300×420 里
  const bx = 3, by = 3, bw = 285, bh = 405, sp = M.HEROES[d.cls].sprite, bi = bustImg(sp);
  U.R(x, bx + 6, by + 6, bw + 6, bh + 6, P.ink); U.box(x, bx, by, bw, bh, P.night);
  if (bi) { x.imageSmoothingEnabled = false; x.drawImage(bi, bx + 15, by + 15, 256, 256); }
  else { const sc = M.spriteCanvas(sp, 10); if (sc) { x.imageSmoothingEnabled = false; const s = Math.min(220 / sc.width, 230 / sc.height); x.drawImage(sc, Math.round(bx + bw / 2 - sc.width * s / 2), Math.round(284 - sc.height * s), sc.width * s, sc.height * s); } }
  // 品质色内圈 6px（底边 9px）+ 3px 墨线
  [[bx, by, bw, 6], [bx, by + bh - 9, bw, 9], [bx, by, 6, bh], [bx + bw - 6, by, 6, bh]].forEach(([a, b, ww, hh]) => U.R(x, a, b, ww, hh, qc));
  [[bx + 6, by + 6, bw - 12, 3], [bx + 6, by + bh - 12, bw - 12, 3], [bx + 6, by + 6, 3, bh - 18], [bx + bw - 9, by + 6, 3, bh - 18]].forEach(([a, b, ww, hh]) => U.R(x, a, b, ww, hh, P.ink));
  // 名牌：深渊色凹槽 + 品质色名字 + 等级
  U.box(x, bx + 18, 290, bw - 36, 96, P.abyss); U.R(x, bx + 18, 290, bw - 36, 6, P.ink);
  U.text(x, M.HEROES[d.cls].n, bx + bw / 2, 328, 40, qc, { outline: true }); U.text(x, 'Lv ' + d.lv, bx + bw / 2, 366, 26, P.cream, { num: true });
  if (bi !== null) cards[k] = c; // 半身像还在解码：这一帧先不缓存
  return c;
}
function tearPath(seed) { const pts = []; for (let i = 0; i <= 14; i++) { const y = i / 14 * 420; pts.push([150 + Math.sin(seed + i * 2.7) * 16 + ((i * 7919 + seed * 13) % 17 - 8) * 1.6, y]); } pts[0][1] = -2; pts[14][1] = 422; return pts; }
M.drawTear = function (ctx, g) {
  const T = g.tear; if (!T) return;
  const t = T.t, d = T.dead, card = cardCanvas(d), CX = 960, CY = 500, st = T.start || (T.start = g.fxPos('heroes') || { x: 240, y: 960 });
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dim = t < T_END - 0.6 ? cl(t / 0.4, 0, 1) : cl((T_END - t) / 0.6, 0, 1);
  M.fxDim(ctx, 0.88 * Math.round(dim * 4) / 4);
  // title: 红色像素大字 + 八向墨描边，副行薰衣草色
  if (t > 0.4 && t < T_END - 0.3) { const a = cl((t - 0.4) / 0.3, 0, 1) * cl((T_END - 0.3 - t) / 0.4, 0, 1); ctx.globalAlpha = Math.round(a * 4) / 4; U.text(ctx, '领袖阵亡', CX, 150, 96, P.red, { outline: true }); U.text(ctx, d.name + ' 永远留在了' + d.region, CX, 232, 30, P.lavender); ctx.globalAlpha = 1; }
  const tp = T.path || (T.path = tearPath(T.seed));
  if (t < T_RIP) {
    // fly in, then strain: the card trembles harder and a crack runs down it
    const q = eo(cl(t / T_FLY, 0, 1)), x = st.x + (CX - st.x) * q, y = st.y + (CY - st.y) * q - Math.sin(q * Math.PI) * 160, sc = 0.35 + 0.65 * eback(cl(t / T_FLY, 0, 1));
    const strain = cl((t - T_FLY) / (T_HOLD - T_FLY), 0, 1), sh = strain * strain * 12, rot = (1 - q) * -0.5 + (Math.random() - 0.5) * strain * 0.05;
    const jig = () => (RM() ? 0 : Math.round((Math.random() - 0.5) * sh / 3) * 3);
    ctx.translate(x + jig(), y + jig()); ctx.rotate(rot); ctx.scale(sc, sc);
    M.pxGlow && M.pxGlow(ctx, 0, 0, 260, U.pal(M.RARITY[d.rarity].c), 0.25 + strain * 0.3);
    ctx.drawImage(card, -150, -210);
    // 裂缝：3px 白色硬线（绷得越紧越粗，到 6px），不发光
    if (strain > 0) { const n = Math.floor(strain * tp.length); ctx.strokeStyle = P.white; ctx.lineWidth = strain > 0.6 ? 6 : 3; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.beginPath(); tp.slice(0, Math.max(2, n)).forEach(([a, b], i) => i ? ctx.lineTo(a - 150, b - 210) : ctx.moveTo(a - 150, b - 210)); ctx.stroke(); }
  } else {
    // two halves fly apart with a ragged paper edge
    const u = t - T_RIP, fall = u * u * 900;
    [-1, 1].forEach(side => {
      ctx.save(); ctx.translate(CX + side * (u * 520 + u * u * 120), CY + fall * 0.55 - u * 180); ctx.rotate(side * (u * 1.6 + u * u * 0.8)); ctx.globalAlpha = cl(1 - (u - 0.9) / 0.9, 0, 1);
      ctx.beginPath(); if (side < 0) { ctx.moveTo(-150, -210); tp.forEach(([a, b]) => ctx.lineTo(a - 150, b - 210)); ctx.lineTo(-150, 210); } else { ctx.moveTo(150, -210); tp.forEach(([a, b]) => ctx.lineTo(a - 150, b - 210)); ctx.lineTo(150, 210); } ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(card, -150, -210); ctx.restore();
      ctx.strokeStyle = P.cream; ctx.lineWidth = 6; ctx.beginPath(); tp.forEach(([a, b], i) => i ? ctx.lineTo(a - 150 + side * 2, b - 210) : ctx.moveTo(a - 150 + side * 2, b - 210)); ctx.stroke();
      ctx.restore();
    });
    // the soul lingers where the card was, then scatters into shards and orbs
    if (u < 1.3) { const a = cl(1 - u / 1.3, 0, 1); M.pxGlow && M.pxGlow(ctx, CX, CY - u * 60, 120 + u * 80, P.violet, 0.7 * a); }
  }
  ctx.restore();
};
S.rip = function () { S.noise(0.12, 0.35, 5000); S.noise(0.35, 0.3, 2400, 0.05); S.noise(0.5, 0.2, 900, 0.12); S.tone(120, 0.3, 'sawtooth', 0.08, -60); };
G.tearTick = function (dt) {
  const T = this.tear; if (!T) return; T.t += dt;
  const beat = Math.floor((T.t - T_FLY) / 0.32); if (T.t > T_FLY && T.t < T_RIP && beat !== T.beat) { T.beat = beat; S.heart(); this.fx.kick(2 + beat); }
  if (!T.fired && T.t >= T_RIP) {
    T.fired = true; S.rip(); S.shatter(); this.fx.kick(26); this.fx.flash(P.white, 0.35);
    const tp = T.path || [], col = M.RARITY[T.dead.rarity].c;
    for (let i = 0; i < 3; i++) this.fx.spark(960, 330 + i * 150, i % 2 ? P.cream : col, 18, { dir: i % 2 ? Math.PI : 0, spread: 2.4, v: 900 });
    this.fx.explode(960, 500, P.violet, 1.3); this.fx.confetti && this.fx.confetti(40);
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
