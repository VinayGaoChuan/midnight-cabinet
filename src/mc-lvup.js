// ==== mc-lvup.js ====
(function () {
// Levelling up deserves a ceremony. The hero page has a 升级 button (exp orbs go straight in, the training room makes
// them count for more); every level gained — by that button, by coming home from an expedition, or by the daily exp of
// the meditation rooms — plays LEVEL UP and the combat power roll-up. Also: rooms that feed leaders every day.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, B = M.BUILDINGS;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - p, 3), eback = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };

// ───────── rooms that grow leaders ─────────
Object.assign(B, {
  meditation: { n: '冥想室', q: 0, cat: 'train', style: 'magic', pw: -1, cost: 90, days: 1, fx: { expDaily: 15 }, d: '每天所有领袖获得 15 经验。' },
  armory:     { n: '军械库', q: 1, cat: 'train', style: 'medieval', pw: -1, cost: 180, days: 2, fx: { heroAtk: 0.12 }, d: '所有领袖攻击 +12%。' },
  shaolin:    { n: '少林寺', q: 2, cat: 'train', style: 'fantasy', pw: -2, cost: 300, days: 4, fx: { expDaily: 45, heroHp: 0.1 }, d: '每天所有领袖获得 45 经验，领袖生命 +10%。' },
  colosseum:  { n: '罗马斗兽场', q: 2, cat: 'train', style: 'medieval', pw: -2, cost: 320, days: 4, fx: { heroAtk: 0.12, heroHp: 0.2 }, d: '所有领袖攻击 +12%、生命 +20%。' },
});

// ───────── combat power ─────────
M.heroPower = function (h, m) { if (!h) return 0; const taken = Object.values(h.taken || {}).reduce((a, b) => a + b, 0); return Math.round(M.heroAtk(h, m) * 6 + M.heroMaxHp(h, m) * 0.5 + taken * 40 + (h.relics || []).length * 60); };
M.heroPowerAt = (h, m, lv) => M.heroPower(Object.assign({}, h, { lv }), m);
M.lvOrbs = function (h, m) { if (h.lv >= 10) return 0; const mul = 1 + (M.baseMods(m).orbMul || 0); return Math.max(1, Math.ceil((M.expNeed(h.lv) - h.exp) / mul)); };
G.heroLvUp = function (id) {
  const m = this.meta, h = m.heroes.find(x => x.id === id); if (!h) return;
  if (h.lv >= 10) { this.toast('已经满级了', '#8d8496'); return; }
  const need = M.lvOrbs(h, m); if (m.orbs < need) { this.toast('经验球不够：升级要 ' + need + ' 个（现有 ' + m.orbs + '）', '#d0453c'); return; }
  const mul = 1 + (M.baseMods(m).orbMul || 0), lv0 = h.lv, p0 = M.heroPower(h, m), mx0 = M.heroMaxHp(h, m);
  this.hold('morb', m.orbs); m.orbs -= need; this.release('morb');
  M.addExp(h, need * mul); h.hp = Math.min(M.heroMaxHp(h, m), h.hp + (M.heroMaxHp(h, m) - mx0)); this.save();
  if (h.lv > lv0) { this.lvUpFx(h, lv0, h.lv, p0, M.heroPower(h, m)); try { M.T && M.T.ev('lvup', { src: 'button', lv: h.lv, orbs: need }); } catch (e) {} }
};

// ───────── the ceremony ─────────
G.lvUpFx = function (h, lv0, lv1, p0, p1) {
  const H = M.HEROES[h.cls], item = { h, lv0, lv1, p0, p1, name: M.heroN(h), col: M.qc(h.rarity), img: M.spriteCanvas(H.sprite, 16) };
  this.lvQ = this.lvQ || []; this.lvQ.push(item); if (!this.lvFx) this.lvNext();
};
G.lvNext = function () {
  const it = this.lvQ && this.lvQ.shift(); if (!it) { this.lvFx = null; return; }
  this.lvFx = Object.assign(it, { t0: now(), sounds: {}, parts: [] });
  S.whoosh && S.whoosh(0.4);
};
const DUR = 3.6;
// Pixel Juice（docs/design.md §11.5）：墨色压暗、硬边光芒、Silkscreen 绿色色带大字、机箱面板里的战斗力
const U = M.UI, P = M.PJ.PAL, RM = () => !!M.PJ.reduced, stepT = (t, f) => (RM() ? t : Math.floor(t * f) / f), st4 = (v) => Math.round(cl(v, 0, 1) * 4) / 4;
const seq = (A, d, dt) => (RM() || d >= A.length * dt ? A[A.length - 1] : A[Math.max(0, Math.floor(d / dt))]), POP = [1.45, 0.9, 1.06, 1];
// 竖向硬边色带：cols = [[起点, 颜色]…]
const bands = (x, y0, y1, cols) => { const g = x.createLinearGradient(0, y0, 0, y1); cols.forEach(([p, c], i) => { g.addColorStop(p, c); g.addColorStop(i + 1 < cols.length ? cols[i + 1][0] - 0.001 : 1, c); }); return g; };
const GREEN = [[0, P.white], [0.22, P.lime], [0.5, P.green], [0.78, P.greenDeep]];
// 领袖像素半身像（M.PJ.BUSTS，64×64）：没有 → false，还在解码 → null
const BI = {};
const bustImg = (k) => { const u = M.PJ.on !== false && k && M.PJ.BUSTS && M.PJ.BUSTS[k]; if (!u || typeof Image === 'undefined') return false; let im = BI[k]; if (!im) { im = BI[k] = new Image(); im.src = u; } return im.complete && im.naturalWidth ? im : null; };
setTimeout(() => Object.keys(M.PJ.BUSTS || {}).forEach(bustImg), 0); // 先解码，免得第一次用时闪一下精灵
const drawLv = function (ctx, g) {
  const L = g.lvFx; if (!L) return; const t = (now() - L.t0) / 1000;
  if (t > DUR) { g.lvNext(); if (g.pulse) g.pulse.heroPower = now(); return; }
  const snd = (k, at, fn) => { if (t >= at && !L.sounds[k]) { L.sounds[k] = 1; try { fn(); } catch (e) {} } };
  snd('boom', 0.12, () => { S.impact && S.impact(); g.fx.flash && g.fx.flash(P.white, 0.5); g.fx.confetti && g.fx.confetti(120, { x: 960, y: 380, cols: [P.lime, P.gold, P.white] }); });
  snd('fan', 0.35, () => S.fanfare && S.fanfare());
  snd('lv', 0.7, () => S.up && S.up(3));
  snd('pw', 1.35, () => S.sparkle && S.sparkle());
  snd('pw2', 2.3, () => { S.coin && S.coin(); g.fx.rays && g.fx.rays(960, 760, P.gold, 1.4, { r: 420 }); });
  const fin = t > DUR - 0.45 ? st4((DUR - t) / 0.45) : 1, a0 = st4(eo(cl(t / 0.25, 0, 1))) * fin;
  ctx.save();
  // veil and light: 墨色压暗 + 纯色光芒（转角一格一格走）+ 4 段硬边光晕
  M.fxDim(ctx, 0.95 * a0);
  const cx = 960, cy = 380, rs = stepT(t, 8) * 0.5;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) { const a = rs + i * Math.PI / 9, w = 0.07; ctx.fillStyle = i % 2 ? P.lime : P.gold; ctx.globalAlpha = 0.14 * a0; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 1300, a - w, a + w); ctx.closePath(); ctx.fill(); }
  ctx.globalAlpha = 1; ctx.fillStyle = U.rg(ctx, cx, cy, 10, 420, [[0, 'rgba(182,242,138,' + (0.55 * a0).toFixed(2) + ')'], [1, 'rgba(182,242,138,0)']], 4); ctx.beginPath(); ctx.arc(cx, cy, 420, 0, Math.PI * 2); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // the leader jumps in: 有半身像就放进品质色框（夜色底、3px 墨框、6px 品质色内圈、9px 硬投影），没有就用精灵
  const hq = seq([0.4, 0.8, 1.12, 0.96, 1], t - 0.05, 0.09), bob = RM() ? 0 : Math.floor(t * 2.5) % 2 ? -6 : 0;
  const bi = bustImg((M.HEROES[L.h.cls] || {}).sprite), qc = U.pal(L.col);
  if (bi) {
    const F = 256, S0 = F + 18, by = 240 + S0 / 2; ctx.save(); ctx.globalAlpha = a0; ctx.translate(cx, by); ctx.scale(hq, hq);
    const x0 = -S0 / 2, y0 = -S0 / 2; U.R(ctx, x0 + 6, y0 + 6, S0 + 6, S0 + 6, P.ink); U.box(ctx, x0, y0, S0, S0, P.night);
    ctx.save(); ctx.beginPath(); ctx.rect(x0 + 9, y0 + 9, F, F); ctx.clip(); ctx.imageSmoothingEnabled = false; ctx.drawImage(bi, x0 + 9, y0 + 9 + bob, F, F); ctx.restore();
    [[x0, y0, S0, 6], [x0, y0 + S0 - 9, S0, 9], [x0, y0, 6, S0], [x0 + S0 - 6, y0, 6, S0]].forEach(([a, b, w, h]) => U.R(ctx, a, b, w, h, qc));
    [[x0 + 6, y0 + 6, S0 - 12, 3], [x0 + 6, y0 + S0 - 12, S0 - 12, 3], [x0 + 6, y0 + 6, 3, S0 - 18], [x0 + S0 - 9, y0 + 6, 3, S0 - 18]].forEach(([a, b, w, h]) => U.R(ctx, a, b, w, h, P.ink));
    ctx.restore();
  } else if (L.img) { const s = hq, w = L.img.width * s, hh = L.img.height * s; ctx.globalAlpha = a0; ctx.imageSmoothingEnabled = false; ctx.drawImage(L.img, Math.round(cx - w / 2), Math.round(cy + 120 - hh + bob), w, hh); ctx.globalAlpha = 1; }
  // LEVEL UP：Silkscreen 120，绿色硬边色带 + 八向墨描边；分 5 格砸下来，站稳后逐字跳
  const tq = t - 0.12, ts = seq([2.2, 1.7, 1.3, 0.94, 1.06, 1], tq, 0.08);
  if (tq >= 0) {
    ctx.save(); ctx.translate(cx, 150); ctx.scale(ts, ts); ctx.globalAlpha = (tq < 0.08 ? 0.5 : 1) * fin;
    const ch = [...'LEVEL UP'], cw = ch.map(c => U.measure(ctx, c, 120, true)), tw = cw.reduce((a, c) => a + c, 0) + 4 * (ch.length - 1), wave = tq > 0.48 && !RM();
    let px = -tw / 2; ch.forEach((c, i) => { const ph = (t * 1.25 + (ch.length - i) * 0.12) % 1, dy = wave ? [0, -9, 0, 3][Math.floor(ph * 4)] : 0; U.text(ctx, c, px + cw[i] / 2, dy, 120, bands(ctx, dy - 60, dy + 60, GREEN), { outline: true, num: true }); px += cw[i] + 4; });
    ctx.restore();
  }
  // name and level
  const lq = cl((t - 0.6) / 0.3, 0, 1);
  if (lq > 0) {
    ctx.globalAlpha = (lq < 0.34 ? 0.5 : 1) * fin;
    U.text(ctx, L.name, cx, 560, 40, P.butter);
    const ls = seq(POP, t - 0.7, 0.06);
    ctx.save(); ctx.translate(cx, 640); ctx.scale(ls, ls); U.text(ctx, 'Lv ' + L.lv0 + '  →  Lv ' + L.lv1, 0, 0, 52, P.gold, { num: true, outline: true }); ctx.restore();
    ctx.globalAlpha = 1;
  }
  // combat power rolls up: 机箱面板 + 「战斗力」标题牌，数字滚动时白、停下变金并弹一下，绿色分格条
  const pq = cl((t - 1.3) / 1.0, 0, 1), x0 = cx - 380, y0 = 712, pw = 760, ph = 150;
  let bw = 0;
  if (t > 1.2) {
    const pa = (t < 1.3 ? 0.5 : 1) * fin, v = Math.round(L.p0 + (L.p1 - L.p0) * eo(pq)), d = L.p1 - L.p0;
    ctx.globalAlpha = pa; U.plate(ctx, x0, y0, pw, ph); U.tab(ctx, '战斗力', x0 + 36, y0 - 24, { size: 30 });
    const ns = pq < 1 ? (RM() || Math.floor(t * 15) % 2 ? 1 : 1.06) : seq(POP, t - 2.3, 0.06);
    ctx.save(); ctx.translate(x0 + 40, y0 + 62); ctx.scale(ns, ns); U.text(ctx, M.fmt(v), 0, 0, 52, pq >= 1 ? P.gold : P.white, { num: true, align: 'left', outline: true }); ctx.restore();
    U.text(ctx, '▲ +' + M.fmt(Math.round(d * eo(pq))), x0 + pw - 40, y0 + 62, 40, P.lime, { num: true, align: 'right' });
    const frac = cl(L.p1 ? v / L.p1 : 1, 0, 1); bw = Math.round(680 * frac); U.bar(ctx, x0 + 40, y0 + 102, 680, 24, frac, { col: P.green, hi: P.lime, lo: P.greenDeep, seg: 36 });
    if (pq < 1 && Math.random() < 0.7) L.parts.push({ x: x0 + 40 + bw, y: y0 + 114, vx: (Math.random() - 0.3) * 300, vy: -200 - Math.random() * 300, t0: t });
    ctx.globalAlpha = 1;
  }
  L.parts = L.parts.filter(p => t - p.t0 < 0.7); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = P.butter;
  L.parts.forEach(p => { const k = t - p.t0; ctx.globalAlpha = st4(1 - k / 0.7); ctx.fillRect(Math.round(p.x + p.vx * k), Math.round(p.y + p.vy * k + 500 * k * k), 6, 6); });
  ctx.restore();
};
const oTick = G.tick;
G.tick = function (dt) { oTick.call(this, dt); if (this.lvFx) { const fc = this.ui && this.ui.cv('fx'); if (fc) drawLv(fc.getContext('2d'), this); } };

// ───────── coming home with levels ─────────
const oBack = G.endBack;
G.endBack = function () {
  const info = this.endInfo || {}, gain = info.gain || {}, m = this.meta; oBack.apply(this, arguments);
  if (gain.ups > 0 && gain.heroId) { const h = m.heroes.find(x => x.id === gain.heroId); if (h) { const lv0 = h.lv - gain.ups; try { M.T && M.T.ev('lvup', { src: 'run', lv: h.lv, ups: gain.ups }); } catch (e) {} setTimeout(() => this.lvUpFx(h, lv0, h.lv, M.heroPowerAt(h, m, lv0), M.heroPower(h, m)), 2600); } }
};

// ───────── daily exp from the meditation rooms ─────────
const oAD = M.advanceDay;
M.advanceDay = function (m) {
  const logs = oAD.apply(this, arguments), xd = Math.round(M.baseMods(m).expDaily || 0); if (!xd) return logs;
  const ups = [];
  m.heroes.forEach(h => { if (h.lv >= 10) return; const lv0 = h.lv, p0 = M.heroPower(h, m); M.addExp(h, xd); if (h.lv > lv0) ups.push({ id: h.id, lv0, p0 }); });
  logs.push({ t: '冥想：所有领袖经验 +' + xd });
  ups.forEach(u => { const h = m.heroes.find(x => x.id === u.id); logs.push({ t: h.name + ' 升到 Lv ' + h.lv + '！' }); });
  m._lvUps = ups; return logs;
};
const oPass = G.passDay;
G.passDay = function () {
  const r = oPass.apply(this, arguments), m = this.meta, ups = m._lvUps || []; m._lvUps = null;
  ups.forEach((u, i) => { const h = m.heroes.find(x => x.id === u.id); try { M.T && h && M.T.ev('lvup', { src: 'daily', lv: h.lv }); } catch (e) {} if (h) setTimeout(() => this.lvUpFx(h, u.lv0, h.lv, u.p0, M.heroPower(h, m)), 1500 + i * 200); });
  return r;
};

// ───────── hero page: combat power + the level-up button ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), p = this.panel, m = this.meta, pn = v.pn; if (this.lvFx) v.fxZ = 60;
  if (pn && pn.isHero && p && p.kind === 'hero') {
    const h = m.heroes.find(x => x.id === p.id);
    if (h) {
      const need = M.lvOrbs(h, m), can = h.lv < 10 && m.orbs >= need, pp = this.pulse && this.pulse.heroPower ? cl(1 - (now() - this.pulse.heroPower) / 600, 0, 1) : 0;
      Object.assign(pn, { powerTxt: M.fmt(M.heroPower(h, m)), powerSc: (1 + 0.3 * pp).toFixed(3), powerC: pp > 0 ? P.lime : P.gold,
        lvTxt: h.lv >= 10 ? '已满级' : can ? '升级 · ' + need + ' 经验球' : '升级需要 ' + need + ' 经验球（现有 ' + m.orbs + '）',
        lvBg: can ? P.green : P.night, lvColor: can ? P.ink : P.haze, lvBorder: can ? P.lime : P.dusk,
        lvAnim: can ? 'talPulse 1s steps(2) infinite' : 'none', lvUp: () => { M.Sfx.click(); this.heroLvUp(h.id); } });
    }
  }
  return v;
};
const oTF = G.tipFor;
G.tipFor = function (key) {
  const p = this.panel, m = this.meta, h = p && p.kind === 'hero' && m && m.heroes.find(x => x.id === p.id);
  if (h && key === 'hs-power') return { title: '战斗力 ' + M.fmt(M.heroPower(h, m)), c: '#ffe08a', d: '由攻击、生命、天赋和宝物折算。', icon: 't_sword' };
  if (h && key === 'hs-lvup') { const mul = 1 + (M.baseMods(m).orbMul || 0); return { title: h.lv >= 10 ? '已满级' : '升到 Lv ' + (h.lv + 1), c: '#9cff7a', d: '花经验球升一级。', lines: [{ t: '当前经验球效率 ×' + mul.toFixed(1) + '（训练场、图书馆、琥珀层能提高）', c: '#a89ca8' }, { t: '现有经验球 ' + m.orbs, c: '#b8ff9a' }], icon: 't_orb' }; }
  return oTF.call(this, key);
};
})();

;
