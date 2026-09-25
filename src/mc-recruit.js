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
  if (m.supplies < cost) { this.deny('物资不足', '#d0453c'); return; }
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
  S.rc('in'); this.bump();
};
const RC = () => M.RARITY.map(r => r.c);
const U = M.UI, P = M.PJ.PAL, RM = () => !!M.PJ.reduced, st = (t) => (RM() ? 0 : t);   // continuous (user ruling 2026-09-24: no frame-stepped motion)
// 卡背（设计稿卡片）：酒红夜色色带底 + 墨框 + 金色硬边内框 + 四角铆钉；中间像素菱形徽记，外圈刻度按步转
function cardBack(x, t, glowC, glowA) {
  x.fillStyle = U.lg(x, 0, -CH / 2, 0, CH / 2, [[0, P.wine], [1, P.night]], 4); x.fillRect(-CW / 2, -CH / 2, CW, CH);
  U.R(x, -CW / 2 - 3, -CH / 2 - 3, CW + 6, 3, P.ink); U.R(x, -CW / 2 - 3, CH / 2, CW + 6, 3, P.ink); U.R(x, -CW / 2 - 3, -CH / 2, 3, CH, P.ink); U.R(x, CW / 2, -CH / 2, 3, CH, P.ink);
  U.R(x, -CW / 2 + 6, -CH / 2 + 6, CW - 12, 6, P.gold); U.R(x, -CW / 2 + 6, CH / 2 - 12, CW - 12, 6, P.gold); U.R(x, -CW / 2 + 6, -CH / 2 + 6, 6, CH - 12, P.gold); U.R(x, CW / 2 - 12, -CH / 2 + 6, 6, CH - 12, P.gold);
  U.R(x, -CW / 2 + 24, -CH / 2 + 24, CW - 48, 3, P.amber); U.R(x, -CW / 2 + 24, CH / 2 - 27, CW - 48, 3, P.amber); U.R(x, -CW / 2 + 24, -CH / 2 + 24, 3, CH - 48, P.amber); U.R(x, CW / 2 - 27, -CH / 2 + 24, 3, CH - 48, P.amber);
  U.rivet(x, -CW / 2 + 33, -CH / 2 + 33); U.rivet(x, CW / 2 - 42, -CH / 2 + 33); U.rivet(x, -CW / 2 + 33, CH / 2 - 42); U.rivet(x, CW / 2 - 42, CH / 2 - 42);
  const gc = U.pal(glowC); x.save(); x.globalAlpha = 0.5 + 0.5 * glowA; x.rotate(st(t, 6) * 0.6);
  for (let i = 0; i < 12; i++) { x.rotate(Math.PI / 6); U.R(x, -3, -96, 6, 18, gc); } x.restore();
  x.globalAlpha = 1;
  for (let k = -8; k <= 8; k++) { const r = 8 - Math.abs(k); U.R(x, -r * 6 - 3, k * 6 - 3, r * 12 + 6, 6, P.ink); }
  for (let k = -7; k <= 7; k++) { const r = 7 - Math.abs(k); U.R(x, -r * 6, k * 6, r * 12, 6, k < -3 ? P.butter : gc); }
  U.R(x, -6, -6, 12, 12, P.white);
}
function drawCard(ctx, F) {
  const t = F.t, cols = RC(), rc = U.pal(cols[F.rar] || '#ffffff'), H = M.HEROES[F.h.cls];
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 压暗：墨色 + 网点，分 4 档进出
  const dim = t < T_REVEAL ? cl(t / 0.3, 0, 1) : 1 - cl((t - T_REVEAL) / (T_END - T_REVEAL), 0, 1); U.dim(ctx, dim);
  // 光一档档爬过经过的品质，停在自己的品质
  const tier = t < T_IN ? 0 : Math.min(F.rar, Math.floor((t - T_IN) / ((T_CHARGE - T_IN) / (F.rar + 1)))), glowC = U.pal(cols[tier]);
  // 声音逐拍跟着 F.t 走（可以点击快进）：蓄力开始、光每爬一档品质一声、碎开、飞走、落地
  const sb = (k, at, fn) => { const s = F._s || (F._s = {}); if (t >= at && !s[k]) { s[k] = 1; fn(); } };
  sb('ch', T_IN, () => S.rc('charge', { dur: T_CHARGE - T_IN, rar: F.rar })); if (t >= T_IN && t < T_CHARGE && tier !== F._tier) { F._tier = tier; S.rc('tier', tier); }
  sb('fly', T_REVEAL, () => S.rc('fly'));
  if (t < T_CHARGE) {
    const qi = eo(cl(t / T_IN, 0, 1)), qc = cl((t - T_IN) / (T_CHARGE - T_IN), 0, 1), shake = qc * qc * (6 + F.rar * 5);
    const x = Math.round(960 + (CX - 960) * qi + (Math.random() - 0.5) * shake), y = Math.round(1000 + (CY - 1000) * qi + (Math.random() - 0.5) * shake), s = 0.3 + 0.7 * eb(qi);
    if (qc > 0) { const r = Math.round(180 + 260 * qc); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + 0.35 * qc; ctx.fillStyle = U.rg(ctx, x, y, 20, r, [[0, glowC], [1, 'rgba(0,0,0,0)']], 4); ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.translate(x, y); ctx.scale(s * Math.max(0.08, Math.abs(Math.cos((1 - qi) * Math.PI * 2))), s); ctx.rotate((1 - qi) * 0.4); cardBack(ctx, t, glowC, qc);
    // 裂纹从中心往外爬：6px 方头硬线，外面一圈墨
    if (qc > 0.05) F.cracks.forEach(p => { const nq = Math.floor(qc * (p.length - 1)) + 1, pts = p.slice(0, nq + 1); ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
      [[12, P.ink], [6, glowC], [2, P.white]].forEach(([lw, c]) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke(); }); });
    ctx.restore();
  }
  // 碎开
  if (t >= T_CHARGE && !F.boom) { F.boom = true; S.rc('shatter', F.rar); if (F.g) { F.g.fx.kick(22 + F.rar * 6); F.g.fx.rays && F.g.fx.rays(CX, CY, rc, 2.2); } }
  if (t >= T_CHARGE) {
    const d = t - T_CHARGE;
    if (d < 0.35) { ctx.globalAlpha = 0.85 * (1 - d / 0.35); ctx.fillStyle = P.white; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
    if (d < 0.7) { const e = eo(d / 0.7), rw = Math.round((60 + e * 1400)), rh = Math.round((40 + e * 800)), lw = e < 0.5 ? 12 : 6; ctx.lineWidth = lw; ctx.strokeStyle = P.ink; ctx.beginPath(); ctx.ellipse(CX, CY, rw + lw, rh + lw, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = rc; ctx.beginPath(); ctx.ellipse(CX, CY, rw, rh, 0, 0, 7); ctx.stroke(); }
    if (d < 1.3) F.shards.forEach(p => { ctx.save(); ctx.globalAlpha = cl(1 - d / 1.3, 0, 1); ctx.translate(Math.round(CX + p.cx + p.vx * d), Math.round(CY + p.cy + p.vy * d + 900 * d * d)); ctx.rotate(p.vr * d); ctx.translate(-p.cx, -p.cy); ctx.fillStyle = (p.cx + p.cy) % 3 > 1 ? P.night : P.wine; ctx.strokeStyle = rc; ctx.lineWidth = 3; ctx.lineJoin = 'miter'; ctx.beginPath(); p.tri.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); });
    // 真容：光束、领袖像素半身像（没有就用精灵）、职业徽记和名字——然后飞进领袖栏
    const fl = cl((t - T_REVEAL) / (T_END - T_REVEAL - 0.1), 0, 1), q = eo(fl), rv = eb(cl(d / 0.5, 0, 1));
    const x = Math.round(CX + (F.to.x - CX) * q), y = Math.round(CY + (F.to.y - CY) * q - Math.sin(q * Math.PI) * 160), sc = (1 - 0.8 * q) * rv;
    if (fl < 1) {
      if (q < 0.5) { ctx.save(); ctx.translate(CX, CY); ctx.rotate(st(t) * 0.5); ctx.globalAlpha = (1 - q * 2) * 0.5; for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? rc : P.butter; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -700); ctx.lineTo(30, -700); ctx.fill(); } ctx.restore(); }
      const bi = U.bust(H.sprite);
      if (bi) { const w = Math.round(256 * sc), hh = w; ctx.save(); ctx.imageSmoothingEnabled = false; U.R(ctx, x - w / 2 + 9 * sc, y - hh / 2 + 9 * sc, w + 6, hh + 6, P.ink); U.box(ctx, x - w / 2, y - hh / 2, w, hh, P.indigo); ctx.drawImage(bi, x - w / 2, y - hh / 2, w, hh); U.R(ctx, x - w / 2, y + hh / 2 - 6, w, 6, rc); ctx.restore(); }
      else if (F.img) { const w = F.img.width * 1.1 * sc, hh = F.img.height * 1.1 * sc; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(F.img, x - w / 2, y - hh / 2, w, hh); ctx.restore(); }
      if (q < 0.15) { const a = Math.ceil((1 - q / 0.15) * cl(d / 0.4, 0, 1) * 4) / 4; ctx.save(); ctx.globalAlpha = a; U.text(ctx, H.n, CX, CY + 250, 64, rc, { outline: true });
        if (F.ic) { const s2 = 72; ctx.imageSmoothingEnabled = false; U.box(ctx, CX - s2 / 2 - 6, CY - 318, s2 + 12, s2 + 12, P.abyss); ctx.drawImage(F.ic, CX - s2 / 2, CY - 312, s2, s2); } ctx.restore(); }
    }
  }
  ctx.restore();
}
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt); const F = this.cardFx; if (!F) return; F.g = this; F.t += dt;
  const fc = this.ui && this.ui.cv('fx'); if (fc) drawCard(fc.getContext('2d'), F);
  if (F.t >= T_END) { this.cardFx = null; this.pulse.heroes = now(); if (this.fx) this.fx.burst && this.fx.burst(F.to.x, F.to.y, M.RARITY[F.rar].c, 20); S.rc('land', F.rar); if (F.done) F.done(); this.bump(); }   // 卡画在特效画布上：只在开始和结束时重画界面
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

// ───────── 点一下就快进（§11.6）：长演出里点击不会白点——回家的一串、招募碎卡、升级、转盘、胜利、阵亡卡都加速到 3 倍 ─────────
// 这是最外层的 tick 包装，要留在所有 tick 包装之后（本文件在 _order.txt 里排在它们后面）
G.longShow = function () { const st = this.settle; return !!(this.homeQ || this.cardFx || this.lvFx || this.reel || this.tlFx || this.tear || this.coreFx || (st && st.t < 1.8)); };
G.hurry = function () { if (!this.longShow()) return false; if (!(this.rushUntil > now())) { if (!(M.Sfx.cue && M.Sfx.cue('ui_rush'))) M.Sfx.tick(8); } this.rushUntil = now() + 1200; return true; };
const oTickR = G.tick;
G.tick = function (dt) { if (this.rushUntil > now() && this.screen !== 'battle' && this.longShow()) dt = (dt || 0) * 3; else if (this.rushUntil > now() && this.reel) dt = (dt || 0) * 3; return oTickR.call(this, dt); };
const oPress = G.uiPress;
G.uiPress = function (t, x, y) { this.hurry(); return oPress.apply(this, arguments); };
})();

;
