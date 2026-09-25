// ==== mc-show.js ====
(function () {
// 小玩法演出工具包（docs/design.md §7.5.1）：结果先定，演出后挑。
// 听牌 reach · 慢动作 slowmo · 预兆 aura / 升格 promote · 中奖四档 win · 没中 lose · 差一点 near · 连击 combo · 评级 grade · 计数器 roll · 大字章 stamp
// 状态都挂在 mg.sh 上；舞台的压暗 / 聚光 / 推镜头 / 灯珠联动在 M.drawMini 和 K.bulbs 里读它。
const M = window.MC, G = M.Game.prototype, S = M.Sfx, K = M.MK, U = M.UI, C = M.PJ.PAL;
const cl = K.cl, eo = K.eo, eb = K.eb, rnd = Math.random;
const SH = M.SHOW = {};
const RM = () => !!(M.PJ && M.PJ.reduced);
const snd = (ev, x) => { try { S.mini && S.mini('_', ev, x); } catch (e) {} };
const QC = (q) => (M.QUALITY[cl(q | 0, 0, 3)] || M.QUALITY[0]).c;
const TIER_C = [C.lime, C.gold, C.gold, C.gold];
SH.QC = QC;

function st(mg) { return mg.sh || (mg.sh = { clock: 0, q: [], tense: null, tLv: 0, beatT: 9, beatN: 0, stamps: [], rolls: [], gray: 0, black: 0, slow: 1, slowT: 0, lamp: null, combo: 0, fever: 0, feverT: 0, near: null }); }
SH.state = st;
// 排一件事到 dt 时钟上（跟着快进一起加速，不用 setTimeout）
function later(mg, dt, fn) { const s = st(mg); s.q.push({ at: s.clock + dt, fn }); }
SH.later = later;

// ───────── 听牌：压暗 + 聚光 + 推镜头 + 心跳 + 牌子 ─────────
// o: { x, y, r 聚光半径, col, lv 1 普通 / 2 超级, label }
SH.reach = function (g, mg, o) {
  const s = st(mg), lv = (o && o.lv) || 1;
  s.tense = Object.assign({ x: K.CX, y: K.SY + 350, r: 190, col: lv >= 2 ? C.red : C.gold, lv, label: lv >= 2 ? '超级听牌' : '听牌！', t: 0 }, o);
  s.beatT = 9; snd('reach', lv); g.fx.kick(3 + 3 * lv);
  if (!RM()) { g.fx.ring(s.tense.x, s.tense.y, s.tense.r * 1.6, s.tense.r, s.tense.col, 6, 0.35); }
};
SH.calm = function (mg) { const s = st(mg); s.tense = null; };
SH.tense = (mg) => !!(mg.sh && mg.sh.tense);
// 慢动作：之后 dur 秒（真实时间）里小玩法按 k 倍速走
SH.slowmo = function (mg, k, dur) { const s = st(mg); s.slow = k; s.slowT = dur; };
SH.slowK = (mg) => (mg.sh && mg.sh.slowT > 0 ? mg.sh.slow : 1);
// 一格一格挪：每跨过一格响一下、灯珠跟着跳；i = 第几格（越往后音调越高）
SH.crawl = function (g, mg, i) { const s = st(mg); snd('crawl', i); s.beatT = Math.min(s.beatT, 0.12); g.fx.kick(0.6 + Math.min(3, i * 0.4)); };

// ───────── 大字章 / 计数器 ─────────
SH.stamp = function (mg, text, x, y, col, size, life) { st(mg).stamps.push({ text, x, y, col: col || C.gold, size: size || 72, t: 0, life: life || 1.4, rot: (rnd() - 0.5) * 0.16 }); };
SH.roll = function (mg, v, x, y, col, dur) { st(mg).rolls.push({ v, x, y, col: col || C.gold, t: 0, dur: dur || 0.8, n: -1 }); };

// ───────── 中奖四档 ─────────
// tier 1 小中 · 2 中 · 3 大赢 · 4 大奖；o: { x, y, col, v 数字（滚计数器）, label 章上的字 }
SH.win = function (g, mg, tier, o) {
  o = o || {}; const s = st(mg), x = o.x == null ? K.CX : o.x, y = o.y == null ? K.SY + 330 : o.y, col = o.col || TIER_C[tier - 1] || C.gold, fx = g.fx;
  tier = cl(tier | 0, 1, 4); SH.calm(mg); s.gray = 0; s.near = null;
  const rollDur = [0.4, 0.8, 1.3, 2.2][tier - 1];
  if (tier === 4) {
    // 黑场 0.2 秒 → 聚光 → 「大」「奖」逐字砸下 → 金币雨、彩纸 → 计数器越滚越快
    s.black = 1; snd('win4'); fx.kick(4);
    later(mg, 0.2, () => { s.black = 0; fx.flash('#ffffff', 0.6); fx.explode(x, y, col, 2.4); fx.rays(x, y, col, 2.4, { r: 900, n: 20 }); fx.kick(20); s.lamp = { t: 2.8, col, strobe: 1, sp: 6 }; });
    const word = [...(o.label || '大奖')];
    word.forEach((ch, i) => later(mg, 0.32 + i * 0.2, () => { SH.stamp(mg, ch, K.CX + (i - (word.length - 1) / 2) * 150, K.SY + 250, C.gold, 150, 2.4 - i * 0.2); snd('stamp'); fx.kick(10); }));
    later(mg, 0.5, () => { fx.confetti(180); fx.coins(x, y, 60, { v: 1500, spread: 1.9, spreadT: 0.9 }); });
    if (o.v) later(mg, 0.6, () => SH.roll(mg, o.v, K.CX, K.SY + 430, col, rollDur));
    return;
  }
  snd('win' + tier);
  if (o.v) SH.roll(mg, o.v, x, y - 100, col, rollDur);
  fx.ring(x, y, 10, 120 + tier * 60, col, 6, 0.3 + tier * 0.05); fx.spark(x, y, col, 8 + tier * 8, { v: 500 + tier * 200, w: 3 + tier });
  if (tier >= 2) { fx.explode(x, y, col, tier === 2 ? 0.9 : 1.6); s.lamp = { t: tier === 2 ? 1.2 : 2, col, sp: 4, strobe: tier >= 3 ? 1 : 0 }; }
  if (tier === 3) { fx.flash('#ffffff', 0.35); fx.rays(x, y, col, 1.6, { r: 600 }); fx.coins(x, y, 26, { v: 1100 }); later(mg, 0.08, () => { SH.stamp(mg, o.label || '大赢', x, y - 190, col, 110, 1.8); snd('stamp'); fx.kick(12); }); }
  else if (o.label) SH.stamp(mg, o.label, x, y - 170, col, tier === 2 ? 64 : 52, 1.2);
};
// 没中：舞台灰一下 0.25 秒、一声轻响，马上可以再来
SH.lose = function (g, mg) { const s = st(mg); SH.calm(mg); s.gray = 1; snd('lose'); };
// 差一点：落空但离大奖只差一格——那一格在线外抖一下，打个小章；同样一拍带过
SH.near = function (g, mg, x, y, text) { const s = st(mg); SH.calm(mg); s.gray = 0.6; s.near = { x, y, t: 0 }; SH.stamp(mg, text || '差一点！', x, y - 70, C.pink, 44, 0.9); snd('near'); g.fx.kick(2); };

// ───────── 预兆与升格（揭晓前东西先亮品质色） ─────────
// 画在要揭晓的东西后面：k 0~1 强度（越接近揭晓越强）；q 品质 0~3。返回这一帧该抖多少，给东西本身用
SH.aura = function (x, cx, cy, r, q, t, k) {
  if (!(k > 0)) return { dx: 0, dy: 0 };
  const c = QC(q), a = cl(k, 0, 1), pul = 0.75 + 0.25 * Math.sin(t * (6 + q * 3));
  K.GL(x, cx, cy, r * (1 + 0.25 * a) * pul, c, 0.35 + 0.35 * a);
  if (q >= 1) { x.save(); x.globalAlpha *= 0.5 * a; x.globalCompositeOperation = 'lighter'; x.fillStyle = U.pal(c); for (let i = 0; i < 6 + q * 4; i++) { const ph = (t * (0.6 + q * 0.25) + i * 0.137) % 1, px = cx + Math.sin(i * 2.3 + t) * r * 0.8, py = cy + r * 0.6 - ph * r * 1.6, s2 = q >= 3 ? 9 : 6; x.fillRect(Math.round(px - s2 / 2), Math.round(py), s2, s2); } x.restore(); }
  const amp = RM() ? 0 : a * (1 + q * 2);
  return { dx: Math.round((rnd() - 0.5) * amp), dy: Math.round((rnd() - 0.5) * amp) };
};
SH.omen = function (g, mg, q) { snd('omen', q); };
// 升格：白光一闪、一圈裂纹、颜色跳到 q
SH.promote = function (g, mg, x, y, q) { const c = QC(q); g.fx.flash('#ffffff', 0.25); g.fx.explode(x, y, c, 1 + q * 0.2); g.fx.ring(x, y, 20, 220, c, 8, 0.4); SH.stamp(mg, '升格！', x, y - 150, c, 56, 1); snd('promote', q); g.fx.kick(6 + q * 2); };
// 预兆的升格路线：真实品质 q，先亮哪一档、在哪一档升上去（只会往上升）
SH.omenPath = function (q) { if (q <= 0) return [0]; const r = rnd(); if (q >= 3) return r < 0.45 ? [1, 3] : r < 0.75 ? [2, 3] : r < 0.9 ? [1, 2, 3] : [3]; if (q === 2) return r < 0.5 ? [1, 2] : [2]; return r < 0.3 ? [0, 1] : [1]; };

// ───────── 连击与评级 ─────────
SH.combo = function (g, mg, x, y, word, col) {
  const s = st(mg); s.combo++; const n = s.combo;
  SH.stamp(mg, (word || (n >= 8 ? 'PERFECT' : n >= 4 ? 'GREAT' : 'GOOD')) + (n >= 2 ? ' ×' + n : ''), x, y, col || (n >= 8 ? C.magenta : n >= 4 ? C.gold : C.lime), 40 + Math.min(24, n * 3), 0.7);
  snd('combo', n); if (n === 5) { s.fever = 1; snd('fever'); g.fx.flash(C.gold, 0.15); } g.fx.kick(1 + Math.min(4, n * 0.4));
  return n;
};
SH.comboBreak = function (mg) { const s = st(mg); s.combo = 0; s.fever = 0; };
// 评级章：S / A / B / C，返回对应的中奖档（S 大奖要看玩法，这里给 3）
SH.grade = function (g, mg, grade, x, y) { const col = { S: C.gold, A: C.magenta, B: C.teal, C: C.steel }[grade] || C.steel; SH.stamp(mg, grade, x == null ? K.CX : x, y == null ? K.SY + 300 : y, col, 180, 1.8); snd('stamp'); g.fx.kick(grade === 'S' ? 16 : 8); return { S: 3, A: 2, B: 1, C: 0 }[grade] || 0; };

// ───────── 推进 ─────────
SH.tick = function (g, mg, dt) {
  const s = st(mg); s.clock += dt;
  if (s.q.length) { const due = s.q.filter(e => e.at <= s.clock); s.q = s.q.filter(e => e.at > s.clock); due.forEach(e => { try { e.fn(); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('show: ' + err.message); } }); }
  s.tLv += ((s.tense ? (s.tense.lv >= 2 ? 1 : 0.75) : 0) - s.tLv) * Math.min(1, dt * (s.tense ? 5 : 9));
  if (s.tense) { s.tense.t += dt; s.beatT += dt; const iv = 0.8 - 0.45 * s.tLv - Math.min(0.2, s.tense.t * 0.05); if (s.beatT >= iv) { s.beatT = 0; s.beatN++; snd('heart', s.tLv); } } else s.beatT = 9;
  if (s.slowT > 0) s.slowT -= dt;
  s.gray = Math.max(0, s.gray - dt * 4); s.black = s.black > 0 && s.black < 1 ? Math.max(0, s.black - dt * 6) : s.black;
  s.stamps.forEach(p => p.t += dt); s.stamps = s.stamps.filter(p => p.t < p.life);
  s.rolls.forEach(r => { r.t += dt; const p = cl(r.t / r.dur, 0, 1), n = Math.floor(p * 14); if (n !== r.n && p < 1) { r.n = n; snd('roll', p); } }); s.rolls = s.rolls.filter(r => r.t < r.dur + 0.9);
  if (s.near) { s.near.t += dt; if (s.near.t > 0.9) s.near = null; }
  if (s.lamp) { s.lamp.t -= dt; if (s.lamp.t <= 0) s.lamp = null; }
  s.feverT += dt * (s.fever ? 1 : 0);
  // 灯珠联动：紧张越高跑得越快，中奖时换成奖的颜色、大赢频闪
  K.lampFx = s.lamp ? { sp: s.lamp.sp || 4, col: s.lamp.col, strobe: s.lamp.strobe } : s.tLv > 0.05 ? { sp: 1 + 3.5 * s.tLv, col: s.tense && s.tense.lv >= 2 && Math.floor(s.clock * 8) % 2 ? C.red : null } : null;
};
// 推镜头：绕聚光点放大 6%～10%
SH.push = function (mg) { const s = mg.sh; if (!s || !s.tense || RM()) return null; const k = 1 + (s.tense.lv >= 2 ? 0.1 : 0.06) * s.tLv * (1 + 0.015 * Math.max(0, 1 - s.beatT * 6)); return { x: s.tense.x, y: s.tense.y, k }; };

// ───────── 画：压暗 / 聚光 / 心跳 / 狂热边框 / 章 / 计数器 / 灰 / 黑场（画在小玩法舞台上面） ─────────
SH.draw = function (x, mg) {
  const s = mg.sh; if (!s) return; const X0 = K.SX, Y0 = K.SY, W = K.SW, H = K.SH;
  if (s.gray > 0) { x.save(); x.globalAlpha = 0.9 * s.gray; x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(X0, Y0, W, H); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.25 * s.gray; x.fillStyle = U.pal(C.ink); x.fillRect(X0, Y0, W, H); x.restore(); }
  const T = s.tense || (s.tLv > 0.02 ? s.lastT : null); if (s.tense) s.lastT = s.tense;
  if (T && s.tLv > 0.02) {
    const beat = Math.max(0, 1 - s.beatT * 5), r = T.r * (1 + 0.05 * beat), a = s.tLv;
    // 聚光外面分三段硬边压暗（不用模糊）
    [[1.9, 0.28], [1.35, 0.22], [1, 0.2]].forEach(([k, al]) => { x.save(); x.globalAlpha = al * a * (1 + 0.3 * beat); x.fillStyle = U.pal(C.ink); x.beginPath(); x.rect(X0, Y0, W, H); x.arc(T.x, T.y, r * k, 0, Math.PI * 2, true); x.fill('evenodd'); x.restore(); });
    x.save(); x.globalAlpha = a * (0.55 + 0.45 * beat); x.strokeStyle = U.pal(T.col); x.lineWidth = 6; x.beginPath(); x.arc(T.x, T.y, Math.round(r), 0, 7); x.stroke(); x.lineWidth = 3; x.strokeStyle = U.pal(C.ink); x.beginPath(); x.arc(T.x, T.y, Math.round(r + 6), 0, 7); x.stroke(); x.restore();
    if (T.lv >= 2 && !RM()) { const on = Math.floor(s.clock * 10) % 2; x.save(); x.globalAlpha = a; [[X0, Y0, W, 9], [X0, Y0 + H - 9, W, 9], [X0, Y0, 9, H], [X0 + W - 9, Y0, 9, H]].forEach(([a1, b1, w1, h1]) => K.R(x, a1, b1, w1, h1, on ? C.red : C.gold)); x.restore(); }
    if (T.label && s.tense) { const q = eb(cl(T.t / 0.25, 0, 1)), ly = Math.max(Y0 + 150, T.y - r - 56); x.save(); x.translate(T.x, ly); x.scale(q * (1 + 0.06 * beat), q * (1 + 0.06 * beat)); K.sign(x, T.label, 0, 0, { kind: T.lv >= 2 ? 'red' : 'gold', size: 40, minW: 220 }); x.restore(); }
  }
  if (s.fever > 0 && !RM()) { const ph = s.feverT * 4, cols = [C.gold, C.magenta, C.teal, C.lime]; x.save(); x.globalAlpha = 0.55 + 0.25 * Math.sin(ph * Math.PI); for (let i = 0; i < 4; i++) { const c = cols[(i + Math.floor(ph)) % 4]; if (i === 0) K.R(x, X0, Y0, W, 12, c); if (i === 1) K.R(x, X0 + W - 12, Y0, 12, H, c); if (i === 2) K.R(x, X0, Y0 + H - 12, W, 12, c); if (i === 3) K.R(x, X0, Y0, 12, H, c); } x.restore(); }
  if (s.near) { const p = s.near.t / 0.9, w = Math.round(Math.sin(s.near.t * 40) * 8 * (1 - p)); x.save(); x.globalAlpha = 1 - p; x.strokeStyle = U.pal(C.pink); x.lineWidth = 6; x.strokeRect(Math.round(s.near.x - 70 + w), Math.round(s.near.y - 60), 140, 120); x.restore(); }
  if (s.black > 0) { x.save(); x.globalAlpha = s.black; K.R(x, X0, Y0, W, H, C.ink); x.restore(); }
  s.rolls.forEach(r => { const p = cl(r.t / r.dur, 0, 1), v = Math.round(r.v * (1 - Math.pow(1 - p, 2.2))), done = r.t >= r.dur, bump = done ? 1 + 0.25 * Math.exp(-(r.t - r.dur) * 10) : 1 + 0.04 * Math.sin(r.t * 40); x.save(); x.globalAlpha = cl((r.dur + 0.9 - r.t) / 0.3, 0, 1); x.translate(Math.round(r.x), Math.round(r.y - (done ? (r.t - r.dur) * 30 : 0))); x.scale(bump, bump); U.text(x, '+' + M.fmt(v), 0, 0, 64, r.col, { num: true, outline: true }); x.restore(); });
  s.stamps.forEach(p => { const q = p.t / 0.14, k = q < 1 ? 2.4 - 1.4 * eb(q) : 1, al = cl((p.life - p.t) / 0.3, 0, 1); x.save(); x.globalAlpha = al; x.translate(Math.round(p.x), Math.round(p.y)); x.rotate(p.rot); x.scale(k, k); U.text(x, p.text, 0, 0, p.size, p.col, { outline: true }); x.restore(); });
};
})();
