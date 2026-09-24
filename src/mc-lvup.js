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
const drawLv = function (ctx, g) {
  const L = g.lvFx; if (!L) return; const t = (now() - L.t0) / 1000;
  if (t > DUR) { g.lvNext(); if (g.pulse) g.pulse.heroPower = now(); return; }
  const snd = (k, at, fn) => { if (t >= at && !L.sounds[k]) { L.sounds[k] = 1; try { fn(); } catch (e) {} } };
  snd('boom', 0.12, () => { S.impact && S.impact(); g.fx.flash && g.fx.flash('#ffffff', 0.5); g.fx.confetti && g.fx.confetti(120, { x: 960, y: 380, cols: ['#9cff7a', '#ffe08a', '#ffffff'] }); });
  snd('fan', 0.35, () => S.fanfare && S.fanfare());
  snd('lv', 0.7, () => S.up && S.up(3));
  snd('pw', 1.35, () => S.sparkle && S.sparkle());
  snd('pw2', 2.3, () => { S.coin && S.coin(); g.fx.rays && g.fx.rays(960, 760, '#ffcc33', 1.4, { r: 420 }); });
  const fin = t > DUR - 0.45 ? cl((DUR - t) / 0.45, 0, 1) : 1, a0 = eo(cl(t / 0.25, 0, 1)) * fin;
  ctx.save();
  // veil and light
  ctx.fillStyle = 'rgba(4,2,8,' + (0.78 * a0) + ')'; ctx.fillRect(0, 0, 1920, 1080);
  const cx = 960, cy = 380;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) { const a = t * 0.5 + i * Math.PI / 9, w = 0.07; ctx.fillStyle = 'rgba(' + (i % 2 ? '156,255,122' : '255,224,138') + ',' + (0.14 * a0) + ')'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 1300, a - w, a + w); ctx.closePath(); ctx.fill(); }
  const gl = ctx.createRadialGradient(cx, cy, 10, cx, cy, 420); gl.addColorStop(0, 'rgba(200,255,170,' + (0.55 * a0) + ')'); gl.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gl; ctx.fillRect(cx - 420, cy - 420, 840, 840);
  ctx.globalCompositeOperation = 'source-over';
  // the leader jumps in
  const hq = eback(cl((t - 0.05) / 0.45, 0, 1)), bob = Math.sin(t * 5) * 6;
  if (L.img) { const s = 0.4 + 0.6 * hq, w = L.img.width * s, hh = L.img.height * s; ctx.globalAlpha = a0; ctx.imageSmoothingEnabled = false; ctx.drawImage(L.img, cx - w / 2, cy + 120 - hh + bob, w, hh); ctx.globalAlpha = 1; }
  // LEVEL UP
  const tq = eback(cl((t - 0.12) / 0.4, 0, 1)), ts = 2.2 - 1.2 * tq;
  ctx.save(); ctx.translate(cx, 150); ctx.scale(ts, ts); ctx.globalAlpha = cl((t - 0.12) / 0.15, 0, 1) * fin;
  ctx.font = "900 150px 'Cinzel','Noto Serif SC',serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 14; ctx.strokeStyle = '#0a1a08'; ctx.strokeText('LEVEL UP', 0, 0);
  const tg = ctx.createLinearGradient(0, -70, 0, 70); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.45, '#d8ffb0'); tg.addColorStop(1, '#5fd04a'); ctx.fillStyle = tg; ctx.fillText('LEVEL UP', 0, 0);
  ctx.restore();
  // name and level
  const lq = cl((t - 0.6) / 0.3, 0, 1);
  if (lq > 0) {
    ctx.globalAlpha = lq * fin; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "700 44px 'Noto Serif SC',serif"; ctx.fillStyle = L.col; ctx.fillText(L.name, cx, 560);
    const ls = 1 + 0.4 * Math.exp(-Math.max(0, t - 0.7) * 8);
    ctx.save(); ctx.translate(cx, 640); ctx.scale(ls, ls); ctx.font = "900 72px 'Cinzel','Noto Serif SC',serif"; ctx.lineWidth = 10; ctx.strokeStyle = '#000';
    const txt = 'Lv ' + L.lv0 + '  →  Lv ' + L.lv1; ctx.strokeText(txt, 0, 0); ctx.fillStyle = '#ffe08a'; ctx.fillText(txt, 0, 0); ctx.restore();
    ctx.globalAlpha = 1;
  }
  // combat power rolls up
  const pq = cl((t - 1.3) / 1.0, 0, 1);
  if (t > 1.2) {
    const pa = cl((t - 1.2) / 0.2, 0, 1) * fin, v = Math.round(L.p0 + (L.p1 - L.p0) * eo(pq)), d = L.p1 - L.p0;
    ctx.globalAlpha = pa; ctx.fillStyle = 'rgba(12,9,15,0.92)'; ctx.fillRect(cx - 380, 700, 760, 150); ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3; ctx.strokeRect(cx - 380, 700, 760, 150);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = "700 36px 'Noto Serif SC',serif"; ctx.fillStyle = '#a89ca8'; ctx.fillText('战斗力', cx - 350, 745);
    const ns = 1 + (pq < 1 ? 0.06 * Math.sin(t * 40) : 0.25 * Math.exp(-(t - 2.3) * 7));
    ctx.save(); ctx.translate(cx - 200, 745); ctx.scale(ns, ns); ctx.font = "900 64px 'Cinzel','Noto Serif SC',serif"; ctx.fillStyle = pq >= 1 ? '#ffe08a' : '#ffffff'; ctx.fillText(M.fmt(v), 0, 0); ctx.restore();
    ctx.textAlign = 'right'; ctx.font = "900 48px 'Cinzel','Noto Serif SC',serif"; ctx.fillStyle = '#9cff7a'; ctx.fillText('▲ +' + M.fmt(Math.round(d * eo(pq))), cx + 350, 745);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 350, 800, 700, 18); const bw = 700 * cl(L.p1 ? v / L.p1 : 1, 0, 1); const bg = ctx.createLinearGradient(cx - 350, 0, cx + 350, 0); bg.addColorStop(0, '#5fd04a'); bg.addColorStop(1, '#ffe08a'); ctx.fillStyle = bg; ctx.fillRect(cx - 350, 800, bw, 18);
    if (pq < 1 && Math.random() < 0.7) L.parts.push({ x: cx - 350 + bw, y: 809, vx: (Math.random() - 0.3) * 300, vy: -200 - Math.random() * 300, t0: t });
    ctx.globalAlpha = 1;
  }
  L.parts = L.parts.filter(p => t - p.t0 < 0.7); ctx.globalCompositeOperation = 'lighter';
  L.parts.forEach(p => { const k = t - p.t0; ctx.fillStyle = 'rgba(255,230,140,' + (1 - k / 0.7) + ')'; ctx.fillRect(p.x + p.vx * k, p.y + p.vy * k + 500 * k * k, 6, 6); });
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
      Object.assign(pn, { powerTxt: M.fmt(M.heroPower(h, m)), powerSc: (1 + 0.3 * pp).toFixed(3), powerC: pp > 0 ? '#9cff7a' : '#ffe08a',
        lvTxt: h.lv >= 10 ? '已满级' : can ? '升级 · ' + need + ' 经验球' : '升级需要 ' + need + ' 经验球（现有 ' + m.orbs + '）',
        lvBg: can ? 'linear-gradient(180deg,#b8ff9a,#3a9a2a)' : '#15111a', lvColor: can ? '#08200a' : '#6b6570', lvBorder: can ? '#e8ffd8' : '#3a3040',
        lvAnim: can ? 'talPulse 1.1s ease-in-out infinite' : 'none', lvUp: () => { M.Sfx.click(); this.heroLvUp(h.id); } });
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
