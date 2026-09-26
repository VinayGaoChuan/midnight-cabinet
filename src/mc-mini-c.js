// ==== mc-mini-c.js ====
(function () {
// The original nine encounters, rebuilt as games: 合奏 / 缝影 / 投币 / 跟脚印 / 挖墓 / 试药 / 镜像 / 献血 / 猜瓶子.
// 演出按 docs/design.md §7.5.1：结果在出手那一刻就定了，下面只挑怎么端出来（连击 / 评级 / 听牌 / 预兆 / 中奖四档）。
const M = window.MC, S = M.Sfx, K = M.MK, MINI = M.MINI, SHW = M.SHOW;
const { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd } = K;
const U = M.UI, C = M.PJ.PAL, T = U.T; // 画面内界面件按设计稿 §11.5（调色板色、字号阶梯）
const heroSp = (g) => M.HEROES[g.run.hero.cls].sprite;
const PENTA = [392, 440, 523, 587, 659, 784, 880, 1047];
const night = (x, top, bot) => { x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, top], [1, bot]]); x.fillRect(SX, SY, SW, SH); };

// ───────── 共用演出件 ─────────
const CB_COL = { PERFECT: C.magenta, GREAT: C.gold, GOOD: C.lime }, GT = { S: 3, A: 2, B: 1, C: 0 }, HOLD = [0.4, 1.0, 1.5, 2.2, 3.0];
// 连击读数只留最新一个：连按时不叠成一坨
function combo(g, mg, x, y, word) { const s = SHW.state(mg); s.stamps = s.stamps.filter(p => !p.cb); const n = SHW.combo(g, mg, x, y, word, CB_COL[word]); s.stamps[s.stamps.length - 1].cb = 1; return n; }
function miss(g, mg, x, y) { const s = SHW.state(mg); s.stamps = s.stamps.filter(p => !p.cb); SHW.comboBreak(mg); SHW.stamp(mg, 'MISS', x, y, C.steel, 40, 0.4); s.stamps[s.stamps.length - 1].cb = 1; g.fx.kick(1); }
// 预兆：o = { path（SH.omenPath）, at, dur }，dur 秒里一档一档亮，跨档那一下升格；返回当前亮的品质
function omen(g, mg, o, x, y) { if (mg.pt < o.at) return o.q; const i = Math.min(o.path.length - 1, Math.floor(cl((mg.pt - o.at) / o.dur, 0, 0.999) * o.path.length)); if (i !== o.i) { if (o.i == null || o.i < 0) SHW.omen(g, mg, o.path[i]); else SHW.promote(g, mg, x, y, o.path[i]); o.i = i; o.q = o.path[i]; } return o.q; }
const omK = (mg, o) => (o && o.q != null ? cl((mg.pt - o.at) / o.dur, 0.2, 1) : 0);
// 结算（四拍的后两拍）：评级章砸下 → 中奖档 → 奖励从舞台飞进计数器 → 演完才关小玩法；没中一拍带过
// o: { grade, tier, x, y, gx, gy, col, v, label, gains, heal, tx, tc, snd, done(got) }
function payout(g, mg, o) {
  if (mg.paying) return; mg.paying = 1;
  const x = o.x == null ? CX : o.x, y = o.y == null ? SY + 330 : o.y, tier = cl(o.tier | 0, 0, 4), at = o.grade && tier ? 0.4 : 0; let got = [];
  const fin = () => { mg.paying = 0; if (o.done) o.done(got); else if (g.mini === mg) g.miniFinish(o.tx + (got.length ? '\n获得：' + got.join('、') : ''), o.tc); };
  if (o.grade) SHW.grade(g, mg, o.grade, cl(o.gx == null ? x - 300 : o.gx, SX + 150, SX + SW - 150), Math.max(SY + 200, o.gy == null ? y - 110 : o.gy));
  if (!tier) { SHW.lose(g, mg); o.snd && o.snd(); if (o.gains && o.gains.length) got = g.award(o.gains, { x, y }); SHW.later(mg, HOLD[0], fin); return; }
  SHW.later(mg, at, () => { SHW.win(g, mg, tier, { x, y, col: o.col, v: o.v, label: o.label }); o.snd && o.snd(); });
  SHW.later(mg, at + (tier >= 4 ? 0.7 : tier === 3 ? 0.3 : 0.12), () => { if (o.gains && o.gains.length) got = g.award(o.gains, { x, y }); if (o.heal) { g.fly('orb', { x, y }, 'hp', '#9cff7a', null, 0); SHW.later(mg, 0.7, () => g.heroHeal(o.heal)); } });
  SHW.later(mg, at + HOLD[tier], fin);
}

// ═════════════════════ 流浪乐师 · rhythm ═════════════════════
const LANE_X = [CX - 170, CX, CX + 170], HIT_Y = FLOOR - 70, TRAVEL = 1.5;
const mTier = (p) => (p >= 0.8 ? 3 : p >= 0.55 ? 2 : p >= 0.3 ? 1 : 0);
MINI.musician = { title: '流浪乐师', img: 'musician', col: C.gold, text: '没有脸的乐师拉着琴。琴声停下来，他把弓递给了你。',
  init(mg) { const n = 26; mg.notes = []; let t = 1.4, last = -1; for (let i = 0; i < n; i++) { let l = Math.floor(rnd() * 3); if (l === last && rnd() < 0.6) l = (l + 1 + Math.floor(rnd() * 2)) % 3; last = l; mg.notes.push({ t, l, m: (i * 2 + l) % 8, st: 0 }); t += [0.5, 0.5, 0.25, 0.75][Math.floor(rnd() * 4)]; } mg.end = t + 0.8; mg.score = 0; mg.combo = 0; mg.laneF = [0, 0, 0]; mg.lastN = mg.notes[n - 1]; mg.bob = 0; },
  start(mg) { this.miniSet('play'); mg.song = -0.6; S.whoosh(0.3); },
  hit(mg, l) { if (mg.phase !== 'play') return; mg.laneF[l] = 1; let best = null, bd = 0.24; mg.notes.forEach(n => { if (n.st || n.l !== l) return; const d = Math.abs(n.t - mg.song); if (d < bd) { bd = d; best = n; } });
    if (!best) { S.mini('musician', 'miss'); mg.combo = 0; miss(this, mg, LANE_X[l], HIT_Y - 130); return; }
    best.st = bd < 0.08 ? 2 : 1; mg.score += best.st; mg.combo++; S.mini('musician', 'note', best.m); mg.bob = 1;
    const col = [C.pink, C.ice, C.lime][l]; combo(this, mg, LANE_X[l], HIT_Y - 130, bd < 0.04 ? 'PERFECT' : bd < 0.08 ? 'GREAT' : 'GOOD');
    this.fx.ring(LANE_X[l], HIT_Y, 24, 80 + best.st * 30, col, 4, 0.25); if (best.st === 2) this.fx.spark(LANE_X[l], HIT_Y, '#ffe08a', 8, { dir: -Math.PI / 2, spread: 1.2, v: 500 });
    if (best === mg.lastN) SHW.calm(mg); },
  key(mg, k, down) { const l = { l0: 0, l1: 1, l2: 2, left: 0, down: 1, up: 1, right: 2 }[k]; if (l != null && mg.phase === 'play') { if (down) MINI.musician.hit.call(this, mg, l); return true; } },
  down(mg, px, py) { if (mg.phase !== 'play') return; const l = px < CX - 85 ? 0 : px > CX + 85 ? 2 : 1; MINI.musician.hit.call(this, mg, l); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '接过琴弓合奏', sub: '按 Q W E（或点三条音轨）跟上音符', gold: 1, fn: () => MINI.musician.start.call(this, mg) }, { t: '扔一枚硬币', sub: '免费 · 他会回赠物资', fn: () => this.miniFinish('他点点头，从琴盒里拿出一袋东西给你。', '#caa84a', [{ k: 'rsup', v: 15 }]) }, { t: '离开', leave: 1, fn: () => this.miniFinish('琴声在你背后停了。', '#8d8496') }]; },
  tick(mg, dt) {
    mg.laneF = mg.laneF.map(f => Math.max(0, f - dt * 5)); mg.bob = Math.max(0, mg.bob - dt * 5);
    if (mg.phase !== 'play') return; const prev = mg.song; mg.song += dt;
    if (Math.floor(prev * 2) !== Math.floor(mg.song * 2) && mg.song > 0) S.mini('musician', 'metro');
    mg.notes.forEach(n => { if (!n.st && mg.song - n.t > 0.24) { n.st = -1; mg.combo = 0; miss(this, mg, LANE_X[n.l], HIT_Y - 130); if (n === mg.lastN) SHW.calm(mg); } });
    // 最后一个音符能改评级时：聚光罩住它那条音轨、心跳（能冲到 S 就是超级听牌）
    const L = mg.lastN; if (!mg.reached && !L.st && mg.song > L.t - 0.9 && mg.notes.every(n => n === L || n.st)) { mg.reached = 1; const N2 = mg.notes.length * 2, hi = mTier((mg.score + 2) / N2); if (hi > mTier(mg.score / N2)) SHW.reach(this, mg, { x: LANE_X[L.l], y: HIT_Y, r: 130, lv: hi >= 3 ? 2 : 1 }); }
    if (mg.song > mg.end) { this.miniSet('end'); const N = mg.notes.length, pct = mg.score / (N * 2); let tx, col, g = [], gr, ev;
      if (pct >= 0.8) { this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + 0.08; g.push({ k: 'wallet', v: M.nice(mg.P * 6) }); tx = '乐师第一次笑了（如果那算笑的话）。本局部队攻击 +8%。'; col = '#ffcc33'; gr = 'S'; ev = 'great'; }
      else if (pct >= 0.55) { this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + 0.1; tx = '部队听得热血沸腾。本局部队攻击 +10%。'; col = '#f2c14e'; gr = 'A'; ev = 'ok'; }
      else if (pct >= 0.3) { g.push({ k: 'rsup', v: 15 }); tx = '勉强能听。他还是给了你一点东西。'; col = '#caa84a'; gr = 'B'; ev = 'poor'; }
      else { tx = '琴弦断了一根。他默默收起了琴。'; col = '#8d8496'; gr = 'C'; ev = 'poor'; }
      const wv = g.find(o => o.k === 'wallet');
      payout(this, mg, { grade: gr, tier: GT[gr], x: CX, y: SY + 420, gx: CX - 330, gy: SY + 300, v: wv && wv.v, gains: g, tx: '合奏完成度 ' + Math.round(pct * 100) + '%。' + tx, tc: col, snd: () => S.mini('musician', ev) }); }
  },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever > 0 && mg.phase === 'play', beat = mg.song > 0 ? Math.max(0, 1 - ((mg.song * 2) % 1) * 3) : 0; night(x, '#1a1030', '#0a0610'); K.GL(x, CX, SY + 200, 400, '#ffb060', 0.18 + (fev ? 0.22 * beat : 0));
    const bob = Math.round(mg.bob * 12); K.SP(x, 'musician', SX + 200, FLOOR - 20 - bob, 200); const bow = Math.sin((mg.song || t) * 8) * 20; K.LN(x, SX + 180 + bow, FLOOR - 170 - bob, SX + 260 + bow, FLOOR - 120 - bob, 3, '#e8dcc4');
    K.SP(x, heroSp(this), SX + SW - 200, FLOOR - 20 - (fev ? Math.round(beat * 8) : 0), 170, true);
    LANE_X.forEach((lx, i) => { x.fillStyle = K.LG(x, 0, SY + 90, 0, HIT_Y, [[0, 'rgba(255,224,138,0)'], [1, 'rgba(255,224,138,' + (0.12 + mg.laneF[i] * 0.4 + (fev ? 0.12 * beat : 0)) + ')']]); x.fillRect(lx - 70, SY + 90, 140, HIT_Y - SY - 60); K.R(x, lx - 70, SY + 90, 2, HIT_Y - SY - 60, 'rgba(255,224,138,0.2)'); K.R(x, lx + 68, SY + 90, 2, HIT_Y - SY - 60, 'rgba(255,224,138,0.2)');
      // 判定框：方形金框，按下时亮一下、外扩一格；下面是 Q W E 键帽
      const f = mg.laneF[i], hs = 40 + Math.ceil(f * 2) * 4; K.R(x, lx - 44, HIT_Y - 44, 88, 88, 'rgba(7,6,15,0.6)'); K.RR(x, lx - hs - 3, HIT_Y - hs - 3, hs * 2 + 6, hs * 2 + 6, 0, null, f ? C.butter : fev ? C.magenta : C.gold, 6); U.key(x, ['Q', 'W', 'E'][i], lx - 24, HIT_Y + 46, { size: 24 }); });
    const sp = (HIT_Y - SY - 90) / TRAVEL;
    mg.notes.forEach(n => { if (n.st > 0 || n.st === -1 && mg.song - n.t > 0.6) return; const y = HIT_Y - (n.t - (mg.song || -9)) * sp; if (y < SY + 60 || y > HIT_Y + 80) return; const col = [C.pink, C.ice, C.lime][n.l]; x.globalAlpha = n.st === -1 ? 0.3 : 1; K.GL(x, LANE_X[n.l], y, 50 + (fev ? 16 * beat : 0), col, 0.6); K.CI(x, LANE_X[n.l], y, 30, col); K.IC(x, 'e_music', LANE_X[n.l], y, 40); x.globalAlpha = 1; });
    if (mg.phase === 'play') { K.sign(x, '连击 ' + mg.combo, SX + SW - 200, SY + 140, { kind: 'dark', size: T.btn, minW: 180 }); const pct = mg.score / (mg.notes.length * 2); U.bar(x, SX + 80, SY + 120, 300, 18, pct, { col: C.gold }); [0.3, 0.55, 0.8].forEach(v => K.R(x, SX + 80 + Math.round(300 * v) - 1, SY + 112, 3, 34, C.white)); U.text(x, '完成度', SX + 230, SY + 160, T.cap, C.lavender); if (mg.song < 0) K.big(x, '准备', CX, SY + 300, 96, C.gold, mg.pt); }
  } };

// ═════════════════════ 裁缝老太 · sew a soldier into your shadow ═════════════════════
MINI.granny = { title: '裁缝老太', img: 'old', col: C.violet, text: '她能把一名部队缝进你的影子里，让你的伤口合上。针脚越齐，伤好得越快。',
  init(mg) { mg.marks = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87].map(u => ({ u, ok: 0, gone: 0 })); mg.good = 0; },
  cards(mg) { const R = this.run.roster.slice(0, 8), n = R.length, w = 120; return R.map((u, i) => ({ u, x: CX - (n - 1) * (w + 14) / 2 + i * (w + 14), y: SY + 350 })); },
  down(mg, px, py) { if (mg.phase === 'select') { const c = MINI.granny.cards.call(this, mg).find(c => Math.abs(px - c.x) < 60 && Math.abs(py - c.y) < 80); if (c) { mg.pick = c.u; this.run.roster = this.run.roster.filter(u => u !== c.u); S.whoosh(0.4); this.fx.explode(c.x, c.y, '#d0a0ff', 1); this.miniSet('thread'); } } else if (mg.phase === 'sew') MINI.granny.stitch.call(this, mg); },
  stitch(mg) { const u = cl(mg.pt / 4, 0, 1); let best = null, bd = 0.035; mg.marks.forEach(m => { if (m.ok || m.gone) return; const d = Math.abs(m.u - u); if (d < bd) { bd = d; best = m; } }); const p = MINI.granny.path(u);
    if (best) { best.ok = 1; mg.good++; S.mini('granny', 'stitch', mg.good); this.fx.spark(p.x, p.y, '#d0a0ff', 10, { dir: -Math.PI / 2, spread: 2, v: 400 }); this.fx.ring(p.x, p.y, 12, 70, C.violet, 4, 0.25); combo(this, mg, p.x, p.y - 80, bd < 0.012 ? 'PERFECT' : bd < 0.024 ? 'GREAT' : 'GOOD'); if (best === mg.marks[5]) SHW.calm(mg); }
    else { S.mini('granny', 'miss'); mg.miss = (mg.miss || 0) + 1; this.fx.kick(3); miss(this, mg, p.x, p.y - 80); } },
  path(u) { return { x: SX + 160 + u * (SW - 320), y: SY + 360 + Math.sin(u * Math.PI * 3) * 70 }; },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sew') { MINI.granny.stitch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献出一名部队', sub: this.run.roster.length ? '然后跟着针脚下针' : '你没有部队', gold: 1, dis: !this.run.roster.length, why: '你没有部队', fn: () => this.miniSet('select') }, { t: '离开', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }];
    if (mg.phase === 'select') return [{ t: '算了', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }]; if (mg.phase === 'sew') return [{ t: '下针', sub: '空格 / 点击', gold: 1, fn: () => MINI.granny.stitch.call(this, mg) }]; return []; },
  tick(mg) { if (mg.phase === 'thread' && mg.pt > 1.2) this.miniSet('sew');
    if (mg.phase !== 'sew') return; const u = cl(mg.pt / 4, 0, 1), last = mg.marks[5];
    mg.marks.forEach(m => { if (!m.ok && !m.gone && u > m.u + 0.035) { m.gone = 1; const p = MINI.granny.path(m.u); miss(this, mg, p.x, p.y - 80); if (m === last) SHW.calm(mg); } });
    // 最后一针：聚光罩住它；前五针全中就是超级听牌
    if (!mg.reached && u > last.u - 0.12 && mg.marks.every(m => m === last || m.ok || m.gone)) { mg.reached = 1; const p = MINI.granny.path(last.u); SHW.reach(this, mg, { x: p.x, y: p.y, r: 110, lv: mg.good === 5 ? 2 : 1 }); }
    if (mg.pt > 4.1) { this.miniSet('end'); const pct = 0.15 + mg.good * 0.06, v = Math.round(M.heroMaxHp(this.run.hero, this.meta) * pct), gr = mg.good >= 6 ? 'S' : mg.good === 5 ? 'A' : mg.good >= 3 ? 'B' : 'C';
      // 回血总是有的，C 也走小中
      payout(this, mg, { grade: gr, tier: Math.max(1, GT[gr]), x: SX + SW - 220, y: FLOOR - 160, gx: CX - 120, gy: SY + 280, col: C.lime, v, heal: pct, tx: M.DB[mg.pick.type].n + ' 被缝进了你的影子。' + mg.good + ' / 6 针落在点上，回复 ' + v + ' 生命。', tc: mg.good >= 5 ? '#9ccc6a' : '#d0a0ff' }); } },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever > 0; night(x, '#2a1a2a', '#0c080c'); K.GL(x, CX, SY + 200, 360, '#ffc080', 0.2);
    K.SP(x, 'old', SX + 170, FLOOR - 10, 190); K.SP(x, heroSp(this), SX + SW - 180, FLOOR - 10, 180, true);
    const sh = SX + SW - 180; K.EL(x, sh + 40, FLOOR, 120, 20, 'rgba(0,0,0,0.6)');
    if (mg.phase === 'select' || mg.phase === 'idle') { MINI.granny.cards.call(this, mg).forEach(c => { const q = M.DB[c.u.type].q, hov = mg.phase === 'select' && Math.abs(mg.mx - c.x) < 60 && Math.abs(mg.my - c.y) < 80; K.card(x, c.x - 60, c.y - 80 - (hov ? 12 : 0), 120, 160, M.QUALITY[q].c, hov, C.abyss); K.SP(x, c.u.type, c.x, c.y + 60 - (hov ? 12 : 0), 110); }); if (mg.phase === 'select') K.sign(x, '选一名部队', CX, SY + 200, { kind: 'wine', size: T.title }); }
    if (mg.phase === 'thread') { const q = cl(mg.pt / 1.2, 0, 1); for (let i = 0; i < 20; i++) { const u = (i / 20 + q) % 1; K.CI(x, CX + (sh - CX) * u, SY + 350 + Math.sin(u * 9 + t * 5) * 40, 4, C.violet); } K.GL(x, CX + (sh - CX) * q, SY + 350, 80, C.violet, 0.7); }
    if (mg.phase === 'sew' || mg.phase === 'end') { x.strokeStyle = U.pal('rgba(208,160,255,0.35)'); x.lineWidth = 3; x.setLineDash([12, 10]); x.beginPath(); for (let u = 0; u <= 1.001; u += 0.02) { const p = MINI.granny.path(u); u ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke(); x.setLineDash([]);
      // 针脚点：方块，白 / 紫圈 + 墨边，落针后打叉；错过的变灰
      mg.marks.forEach(m => { const p = MINI.granny.path(m.u), px = Math.round(p.x), py = Math.round(p.y); U.box(x, px - 18, py - 18, 36, 36, m.ok ? C.white : m.gone ? C.slate : C.violet); K.R(x, px - 15, py - 15, 30, 30, m.ok ? C.violet : C.abyss); if (m.ok) { K.LN(x, px - 9, py - 9, px + 9, py + 9, 3, C.white); K.LN(x, px + 9, py - 9, px - 9, py + 9, 3, C.white); } });
      const u = mg.phase === 'end' ? 1 : cl(mg.pt / 4, 0, 1), p = MINI.granny.path(u); x.strokeStyle = fev ? C.gold : C.red; x.lineWidth = 3; x.beginPath(); for (let v = 0; v <= u; v += 0.01) { const q = MINI.granny.path(v); v ? x.lineTo(q.x, q.y - 4) : x.moveTo(q.x, q.y - 4); } x.stroke(); x.save(); x.translate(p.x, p.y); x.rotate(-0.8); K.IC(x, 'e_needle', 0, -20, 70); x.restore(); U.text(x, mg.good + ' / 6', CX, SY + 170, T.num, C.violet, { num: true, outline: true }); }
  } };

// ═════════════════════ 许愿井 · hold to throw a coin ═════════════════════
const WX = SX + SW - 300, WY = SY + 400;
MINI.well = { title: '许愿井', img: 'well', col: C.teal, text: '井底有东西在回应你的脚步声。硬币扔得越准，回应越慷慨。',
  init(mg) { mg.throws = 0; mg.max = 2; mg.got = []; mg.band = 0.45 + rnd() * 0.3; mg.pow = 0; },
  down(mg) { if (mg.phase === 'ready') { this.miniSet('charge'); S.mini('well', 'charge', 0); } },
  // 松手那一刻准头就定了：先给手感章，结果在落水时端出来
  up(mg) { if (mg.phase === 'charge') { mg.shot = mg.pow; mg.acc = 1 - Math.abs(mg.shot - mg.band) / 0.32; mg.slo = 0; this.miniSet('fly'); S.mini('well', 'toss'); const sx = SX + 344, sy = FLOOR - 400; if (mg.acc > 0.2) combo(this, mg, sx, sy, mg.acc > 0.8 ? 'PERFECT' : mg.acc > 0.5 ? 'GREAT' : 'GOOD'); else miss(this, mg, sx, sy); } },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.throws >= mg.max; return [{ t: '拿出一枚硬币', sub: mg.pay + ' 积分 · 按住蓄力，松手扔出', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '井水平静了' : '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; mg.throws++; mg.band = 0.4 + rnd() * 0.38; this.miniSet('ready'); } }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.got.length ? '井底回应了你：' + mg.got.join('；') + '。' : '你没有许愿。', mg.got.length ? '#6fd0ff' : '#8d8496') }]; }
    if (mg.phase === 'ready' || mg.phase === 'charge') return [{ t: '按住空格 / 鼠标蓄力', sub: '在金色区域松手', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'charge') { const q = (mg.pt / 1.1) % 2; mg.pow = q < 1 ? q : 2 - q; if (Math.floor(mg.pt * 10) !== mg.tk) { mg.tk = Math.floor(mg.pt * 10); S.mini('well', 'charge', mg.pow); } }
    if (mg.phase === 'fly') {
      // 扔得准：硬币快到水面时放慢；准到正中还压暗、聚光罩住井口
      if (!mg.slo && mg.acc > 0.5 && mg.pt > (mg.acc > 0.8 ? 0.68 : 0.74)) { mg.slo = 1; SHW.slowmo(mg, mg.acc > 0.8 ? 0.35 : 0.55, mg.acc > 0.8 ? 0.7 : 0.4); if (mg.acc > 0.8) SHW.reach(this, mg, { x: WX, y: WY - 60, r: 180 }); }
      if (mg.pt > 0.95) MINI.well.land.call(this, mg); }
    if (mg.phase === 'answer') { omen(this, mg, mg.om, WX, WY - 20); if (mg.pt > mg.om.at + mg.om.dur + 0.1) MINI.well.pay.call(this, mg); }
    if (mg.phase === 'miss' && mg.pt > 0.4) this.miniSet('idle');
  },
  land(mg) { const acc = mg.acc, run = this.run; let tx, col, g = [], tier = 0;
    if (acc > 0.8) { g.push(rnd() < 0.5 ? K.bp(null, 1) : K.item(run, mg.P)); tx = '正中井心！金光从井底涌上来'; col = '#ffcc33'; tier = 3; }
    else if (acc > 0.5) { g.push({ k: 'wallet', v: mg.pay * 2 }, { k: 'vision', v: 1 }); tx = '扑通。井水映出了前面的路，还吐出双倍积分'; col = '#6fd0ff'; tier = 2; }
    else if (acc > 0.2) { g.push({ k: 'rsup', v: 20 }); tx = '硬币擦着井沿掉了进去，捞上来一袋物资'; col = '#caa84a'; tier = 1; }
    else { tx = '硬币弹在井沿上，滚走了'; col = '#8d8496'; }
    mg.res = { g, tx, col, tier }; mg.splT = mg.t;
    if (!tier) { S.mini('well', 'miss'); SHW.lose(this, mg); mg.got.push(tx); this.miniSay(tx, col); this.fx.spark(WX - 130, WY - 30, C.silver, 10, { v: 400 }); this.fx.kick(2); this.miniSet('miss'); return; }
    S.mini('well', 'splash'); this.fx.ring(WX, WY - 20, 12, 150 + tier * 30, C.ice, 5, 0.4); this.fx.spark(WX, WY - 20, C.ice, 10 + tier * 6, { dir: -Math.PI / 2, spread: 1.3, v: 500 + tier * 100 }); this.fx.kick(2 + tier);
    // 井的回应：水面先亮品质色，越好亮得越久，正中还可能升格
    mg.om = { path: tier === 3 ? SHW.omenPath(3) : [tier - 1], at: 0.05, dur: [0, 0.3, 0.5, 1.0][tier] }; this.miniSet('answer'); },
  pay(mg) { const r = mg.res, wv = r.g.find(o => o.k === 'wallet'); this.miniSet('paid');
    payout(this, mg, { grade: ['C', 'B', 'A', 'S'][r.tier], tier: r.tier, x: WX, y: WY - 60, gx: CX - 150, gy: SY + 250, col: SHW.QC(mg.om.q), v: wv && wv.v, gains: r.g,
      snd: () => { if (r.tier === 3) S.mini('well', 'great'); else if (r.tier === 2) S.mini('well', 'ok'); this.miniSay(r.tx, r.col, r.tier >= 3); },
      done: (got) => { mg.got.push(r.tx + (got.length ? '（' + got.join('、') + '）' : '')); this.miniSet('idle'); } }); },
  draw(x, mg) {
    const t = mg.t, wx = WX, wy = WY; night(x, '#0e1a2e', '#060a12'); K.CI(x, SX + 200, SY + 140, 40, '#f5e8c0'); K.CI(x, SX + 186, SY + 130, 36, '#0e1a2e');
    K.R(x, SX, FLOOR, SW, SH - (FLOOR - SY), '#1a2418');
    // 井的回应：一道品质色的光柱从井口升起
    const ans = (mg.phase === 'answer' || mg.phase === 'paid') && mg.om && mg.om.q != null, ak = ans ? (mg.phase === 'paid' ? 1 : omK(mg, mg.om)) : 0;
    if (ans && mg.om.q >= 1) { x.save(); x.globalAlpha = 0.15 + 0.2 * ak; K.R(x, wx - 50, SY + 110, 100, wy - 20 - SY - 110, SHW.QC(mg.om.q)); x.restore(); }
    K.RR(x, wx - 150, wy - 20, 300, FLOOR - wy + 20, 10, '#5a5a66'); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) K.RR(x, wx - 146 + c * 59 + (r % 2) * 20, wy - 14 + r * 44, 54, 38, 4, ['#6a6a78', '#5a5a68'][(r + c) % 2]); K.EL(x, wx, wy - 20, 150, 34, '#4a4a55'); K.EL(x, wx, wy - 20, 126, 24, '#050810'); K.GL(x, wx, wy - 20, 120, '#6fd0ff', 0.2 + 0.1 * Math.sin(t * 2));
    if (ans) SHW.aura(x, wx, wy - 20, 120, mg.om.q, t, ak);
    K.R(x, wx - 160, wy - 220, 12, 200, '#5a3a22'); K.R(x, wx + 148, wy - 220, 12, 200, '#5a3a22'); K.PL(x, [[wx - 190, wy - 210], [wx, wy - 290], [wx + 190, wy - 210]], C.wine);
    const hx = SX + 220; K.SP(x, heroSp(this), hx, FLOOR, 180);
    // 蓄力条：墨槽，琥珀色目标区 + 金线，青色往上涨
    const mx = hx + 110, my = FLOOR - 300, mh = 260, bY = Math.round(my + mh * (1 - mg.band)); U.box(x, mx, my, 28, mh, C.ink); K.R(x, mx, bY - Math.round(mh * 0.08), 28, Math.round(mh * 0.16), C.amber); K.R(x, mx, bY - 3, 28, 6, C.gold);
    if (mg.phase === 'charge' || mg.phase === 'ready') { const fh = Math.round(mh * mg.pow); if (fh > 0) { K.R(x, mx, my + mh - fh, 28, fh, C.teal); K.R(x, mx, my + mh - fh, 28, 3, C.ice); } K.sign(x, mg.phase === 'ready' ? '按住蓄力' : '松手！', mx + 14, my - 40, { kind: mg.phase === 'ready' ? 'indigo' : 'gold', size: T.body }); }
    // coin
    const traj = (s, q) => { const tx = hx + 60 + (wx - hx - 60) * (0.35 + s * 0.8) * q, h = 220 + s * 160; return { x: tx, y: FLOOR - 190 - Math.sin(q * Math.PI) * h + q * (wy - 40 - (FLOOR - 190)) }; };
    if (mg.phase === 'charge') { x.setLineDash([8, 10]); x.strokeStyle = U.pal('rgba(255,224,138,0.4)'); x.lineWidth = 3; x.beginPath(); for (let q = 0; q <= 1; q += 0.05) { const p = traj(mg.pow, q); q ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke(); x.setLineDash([]); }
    if (mg.phase === 'fly') { const q = cl(mg.pt / 0.95, 0, 1), p = traj(mg.shot, q); x.save(); x.translate(p.x, p.y); x.scale(Math.abs(Math.cos(mg.pt * 18)) * 0.8 + 0.2, 1); K.IC(x, 'e_coin', 0, 0, 40); x.restore(); if (mg.slo) K.GL(x, p.x, p.y, 70, C.gold, 0.5); }
    // 落空：硬币从井沿弹开滚走
    if (mg.phase === 'miss') { const q = cl(mg.pt / 0.4, 0, 1); x.save(); x.translate(Math.round(wx - 130 - q * 260), Math.round(wy - 40 - Math.sin(q * Math.PI) * 80 + q * 60)); x.rotate(q * 9); K.IC(x, 'e_coin', 0, 0, 36); x.restore(); }
    // 水花：落水后三圈往外扩
    const se = mg.splT != null ? mg.t - mg.splT : 9; if (se < 0.8 && mg.res && mg.res.tier) { for (let i = 0; i < 3; i++) { x.strokeStyle = U.pal('rgba(143,224,255,' + cl(1 - se / 0.8, 0, 1) + ')'); x.lineWidth = 3; x.beginPath(); x.ellipse(wx, wy - 20, 20 + se * 120 * (1 + i * 0.4), 6 + se * 30, 0, 0, 7); x.stroke(); } }
    for (let i = 0; i < mg.max; i++) K.IC(x, 'e_coin', SX + 80 + i * 50, SY + 130, 40 * (i < mg.max - mg.throws ? 1 : 0.5));
  } };

// ═════════════════════ 迷路的孩子 · follow the footprints ═════════════════════
MINI.child = { title: '迷路的孩子', img: 'child', col: C.butter, text: '她提着灯走在前面。每到岔口，她的脚印只亮一下。',
  init(mg) { mg.j = 0; mg.ok = 0; mg.ans = [0, 1, 2].map(() => rnd() < 0.5 ? 0 : 1); mg.walk = 0; },
  girl(mg) { const vy = SY + 280, dist = 1 - mg.ok * 0.15 + (mg.j - mg.ok) * 0.25, cy = vy + 60 + 40 / dist, cs = 110 / dist; return { dist, cy, cs, x: CX + 30, y: cy - cs * 0.7 }; },
  choose(mg, d) { if (mg.phase !== 'choose') return; const ok = d === mg.ans[mg.j], dx = CX + (d ? 300 : -300); mg.last = ok; SHW.calm(mg);
    if (ok) { mg.ok++; S.mini('child', 'step', mg.ok); this.miniSay('灯光近了一点', '#ffe08a'); combo(this, mg, dx, SY + 170, mg.pt < 0.7 ? 'PERFECT' : mg.pt < 1.5 ? 'GREAT' : 'GOOD');
      // 选对的那一边脚印一个接一个亮过去
      for (let i = 0; i < 6; i++) { const q = i / 6, px = CX + (d ? 1 : -1) * (40 + q * 240), py = FLOOR + 40 - q * 260; SHW.later(mg, i * 0.04, () => { this.fx.spark(px, py, C.butter, 4, { v: 200, g: 0 }); this.fx.ring(px, py, 6, 40, C.butter, 3, 0.25); }); } }
    else { S.mini('child', 'wrong'); this.miniSay('她的灯更远了……', '#8d8496'); miss(this, mg, dx, SY + 170); }
    mg.j++; this.miniSet(mg.j >= 3 ? 'end' : 'walk'); },
  key(mg, k, down) { if (!down || mg.phase !== 'choose') return; if (k === 'left') { MINI.child.choose.call(this, mg, 0); return true; } if (k === 'right') { MINI.child.choose.call(this, mg, 1); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '带她回家', sub: '跟着她的脚印走', gold: 1, fn: () => this.miniSet('walk') }, { t: '无视', leave: 1, fn: () => this.miniFinish('她一直看着你走远。', '#8d8496') }]; if (mg.phase === 'choose') return [{ t: '← 左边', fn: () => MINI.child.choose.call(this, mg, 0) }, { t: '右边 →', fn: () => MINI.child.choose.call(this, mg, 1) }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'walk') { mg.walk += dt; if (mg.pt > 1.3) { this.miniSet('prints'); } }
    // 前两个岔口都走对：最后一个岔口压暗、聚光、心跳
    if (mg.phase === 'prints') { if (!mg.reached && mg.j === 2 && mg.ok === 2) { mg.reached = 1; SHW.reach(this, mg, { x: CX, y: SY + 330, r: 380 }); } if (mg.pt > 1.0 + mg.j * 0.15) this.miniSet('choose'); }
    if (mg.phase === 'end') { const gp = MINI.child.girl(mg);
      // 走到头：她的灯先亮品质色（三步全对可能升格），再端出奖励；走丢了一拍带过
      if (!mg.endGo) { mg.endGo = 1; if (mg.ok >= 2) mg.om = { path: mg.ok === 3 ? SHW.omenPath(3) : [1], at: 0.1, dur: mg.ok === 3 ? 0.8 : 0.35 }; if (mg.ok === 3) SHW.reach(this, mg, { x: gp.x, y: gp.cy - gp.cs * 0.4, r: 200, label: '' }); }
      if (mg.om) omen(this, mg, mg.om, gp.x, gp.y);
      if (mg.pt > (mg.ok === 3 ? 1.05 : mg.ok === 2 ? 0.5 : 0.1) && !mg.fin) { mg.fin = true; let tx, col, g = [], gr, ev;
        if (mg.ok === 3) { g.push({ k: 'rsup', v: 30 }, K.item(this.run, mg.P)); tx = '她把你带到一个藏东西的地方，回头笑了笑，不见了。'; col = '#9ccc6a'; gr = 'S'; ev = 'found'; }
        else if (mg.ok === 2) { g.push({ k: 'rsup', v: 20 }); tx = '走丢了一次，但最后还是找到了她的家。门口放着一袋东西。'; col = '#caa84a'; gr = 'B'; ev = 'found'; }
        else if (mg.ok === 1) { tx = '一转身她就不见了。'; col = '#8d8496'; gr = 'C'; ev = 'lost'; }
        else { tx = '你迷路了。你总觉得背后有人。生命 -' + this.heroHurt(0.08) + '。'; col = '#d0453c'; gr = 'C'; ev = 'lost'; }
        payout(this, mg, { grade: gr, tier: GT[gr], x: gp.x, y: gp.y, gx: CX - 330, gy: SY + 260, col: mg.om ? SHW.QC(mg.om.q) : C.butter, gains: g, tx, tc: col, snd: () => S.mini('child', ev) }); } }
  },
  draw(x, mg) {
    const t = mg.t, fwd = mg.phase === 'walk' ? mg.pt / 1.3 : 0; night(x, '#0c0a14', '#040306');
    // corridor in perspective
    const vx = CX, vy = SY + 280; x.fillStyle = C.abyss; x.beginPath(); x.moveTo(SX, FLOOR + 110); x.lineTo(vx - 90, vy + 60); x.lineTo(vx + 90, vy + 60); x.lineTo(SX + SW, FLOOR + 110); x.fill();
    for (let i = 0; i < 8; i++) { const z = ((i + fwd) / 8), yy = vy + 60 + (FLOOR + 110 - vy - 60) * z * z; K.R(x, SX, yy, SW, 2, 'rgba(255,224,138,' + 0.06 * z + ')'); }
    x.fillStyle = C.night; x.beginPath(); x.moveTo(SX, SY); x.lineTo(vx - 90, vy - 120); x.lineTo(vx - 90, vy + 60); x.lineTo(SX, FLOOR + 110); x.fill(); x.beginPath(); x.moveTo(SX + SW, SY); x.lineTo(vx + 90, vy - 120); x.lineTo(vx + 90, vy + 60); x.lineTo(SX + SW, FLOOR + 110); x.fill();
    const fork = mg.phase === 'prints' || mg.phase === 'choose';
    if (fork) { [[-1, CX - 300], [1, CX + 300]].forEach(([s, dx]) => { K.RR(x, dx - 70, SY + 200, 140, 220, 8, C.ink, C.dusk, 3); K.GL(x, dx, SY + 310, 100, C.butter, 0.05); });
      const real = mg.ans[mg.j], vis = mg.phase === 'prints' ? cl(1 - (mg.pt - 0.5) / 0.5, 0, 1) : 0, decoy = 0.15 + mg.j * 0.12;
      [0, 1].forEach(side => { const a = side === real ? vis : Math.min(vis, decoy); for (let i = 0; i < 6; i++) { const q = i / 6, px = CX + (side ? 1 : -1) * (40 + q * 240), py = FLOOR + 40 - q * 260; x.globalAlpha = a * (side === real ? 1 : 0.9); K.EL(x, px + (i % 2 ? 10 : -10), py, 9, 14, '#ffe08a', side ? 0.4 : -0.4); K.GL(x, px, py, 26, '#ffe08a', a * 0.6); } x.globalAlpha = 1; });
      if (mg.phase === 'choose') K.sign(x, '她往哪边走了？', CX, SY + 140, { kind: 'wine', size: T.btn }); }
    // the girl & lantern ahead；走到头时灯先亮品质色
    const gp = MINI.child.girl(mg), dist = gp.dist, cy = gp.cy, cs = gp.cs;
    if (!fork) { const j = mg.phase === 'end' && mg.om && mg.om.q != null ? SHW.aura(x, gp.x, gp.y, 160 / dist, mg.om.q, t, omK(mg, mg.om)) : { dx: 0, dy: 0 }; K.GL(x, CX + 30, cy - cs * 0.7, 160 / dist, '#ffcf70', 0.6); K.SP(x, 'child', CX + j.dx, cy + j.dy, cs); }
    K.SP(x, heroSp(this), CX - 240, FLOOR + 60, 200);
    for (let i = 0; i < 3; i++) K.pip(x, SX + 90 + i * 40, SY + 140, 24, i < mg.j ? (i < mg.ok ? C.butter : C.slate) : null);
  } };

// ═════════════════════ 无名墓碑 · dig before the candle dies ═════════════════════
MINI.grave = { title: '无名墓碑', img: 'tomb', col: C.lavender, text: '墓碑上没有名字，土是新翻的。蜡烛烧完之前挖到底。',
  init(mg) { mg.need = 14 + Math.floor(rnd() * 7) - Math.round(mg.luck * 10); mg.dig = 0; mg.burn = 5.2; mg.dirt = []; mg.sw = 0; },
  shovel(mg) { if (mg.phase !== 'dig') return; mg.dig++; mg.sw = 1; S.mini('grave', 'dig'); this.fx.kick(3); for (let i = 0; i < 5; i++) mg.dirt.push({ x: CX + 40, y: FLOOR - 40, vx: 200 + rnd() * 300, vy: -300 - rnd() * 300, t: 0 });
    // 连击看手速：两铲间隔越短越高
    const gap = mg.t - (mg.lastDig == null ? -9 : mg.lastDig); mg.lastDig = mg.t; combo(this, mg, CX + 210, FLOOR - 190, gap < 0.13 ? 'PERFECT' : gap < 0.2 ? 'GREAT' : 'GOOD');
    if (mg.dig >= mg.need) { this.miniSet('coffin'); S.mini('grave', 'coffin'); MINI.grave.open.call(this, mg); } },
  // 挖到底：按剩下的烛火评级；棺材里是什么这一刻就定了（概率同原来）
  open(mg) { const lf = mg.burn / 5.2, gr = lf >= 0.45 ? 'S' : lf >= 0.25 ? 'A' : lf >= 0.1 ? 'B' : 'C'; SHW.calm(mg); SHW.grade(this, mg, gr, CX - 330, SY + 250); this.fx.explode(CX + 40, FLOOR + 90, C.tan || C.gold, 0.6);
    mg.treasure = rnd() < 0.5 + mg.luck;
    if (mg.treasure) { mg.om = { path: SHW.omenPath(3), at: 0.35, dur: 0.9 }; SHW.later(mg, 0.3, () => { S.mini('grave', 'lid'); SHW.reach(this, mg, { x: CX + 40, y: FLOOR + 100, r: 190, label: '' }); }); } },
  down(mg) { MINI.grave.shovel.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down) { MINI.grave.shovel.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '挖开', sub: '疯狂点击 / 连按空格', gold: 1, fn: () => { this.miniSet('dig'); S.mini('grave', 'candle'); } }, { t: '默哀', sub: '物资 +15', leave: 1, fn: () => this.miniFinish('你站了一会儿。墓碑后面有人留下了东西。', '#caa84a', [{ k: 'rsup', v: 15 }]) }]; if (mg.phase === 'dig') return [{ t: '挖！', sub: '点击 / 空格', gold: 1, fn: () => MINI.grave.shovel.call(this, mg) }]; return []; },
  tick(mg, dt) {
    mg.sw = Math.max(0, mg.sw - dt * 6); mg.dirt.forEach(d => { d.vy += 1600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.t += dt; }); mg.dirt = mg.dirt.filter(d => d.t < 1);
    if (mg.phase === 'dig') { mg.burn -= dt; const near = mg.dig / mg.need, per = 0.8 - near * 0.5;
      if (!SHW.tense(mg) && mg.pt - (mg.hb || 0) > per) { mg.hb = mg.pt; S.heart(); }   // 听牌以后心跳交给演出工具包
      if (mg.lastDig != null && mg.t - mg.lastDig > 0.5 && SHW.state(mg).combo) SHW.comboBreak(mg);
      // 挖得差不多、蜡烛也快烧完：聚光罩住坑口；再近一步换超级（红金频闪）
      if (!mg.rl && near >= 0.6 && mg.burn < 2.2) { mg.rl = 1; SHW.reach(this, mg, { x: CX + 40, y: FLOOR - 40, r: 210, label: '' }); }
      if (mg.rl === 1 && near >= 0.85 && mg.burn < 1.2) { mg.rl = 2; SHW.reach(this, mg, { x: CX + 40, y: FLOOR - 40, r: 210, lv: 2, label: '听牌！' }); }
      if (mg.burn <= 0) { this.miniSet('out'); S.mini('grave', 'out'); SHW.lose(this, mg); this.heroHurt(0.05); } }
    if (mg.phase === 'out' && mg.pt > 0.4 && !mg.fin) { mg.fin = true; this.miniFinish('蜡烛灭了。黑暗里有什么东西碰了碰你的手。', '#d0453c'); }
    if (mg.phase === 'coffin' && !mg.fin) {
      if (mg.treasure) { omen(this, mg, mg.om, CX + 40, FLOOR + 100); if (mg.pt > 1.35) { mg.fin = true; const wv = M.nice(mg.P * 4); payout(this, mg, { tier: 3, x: CX + 40, y: FLOOR + 60, col: C.gold, v: wv, gains: [K.bp(null, 1), { k: 'wallet', v: wv }], tx: '棺材里躺着一张图纸，还有一枚戒指。', tc: '#ffcc33', snd: () => S.mini('grave', 'treasure') }); } }
      else if (mg.pt > 0.3) { mg.fin = true; mg.hand = mg.pt; this.miniSay('土里伸出了手！', '#d0453c', true); S.mini('grave', 'hand'); SHW.lose(this, mg); this.fx.flash('#ff2a2a', 0.2); this.fx.kick(10); SHW.later(mg, 0.6, () => this.mini === mg && this.miniBattle('normal')); } }
  },
  draw(x, mg) {
    const t = mg.t, dep = cl(mg.dig / mg.need, 0, 1); night(x, '#101828', '#05070c'); K.CI(x, SX + SW - 180, SY + 150, 46, '#e8f0ff'); K.GL(x, SX + SW - 180, SY + 150, 160, '#8fb0ff', 0.25);
    K.R(x, SX, FLOOR - 40, SW, SH, '#1a1410'); for (let i = 0; i < 6; i++) K.RR(x, SX + 60 + i * 190, FLOOR - 120 - (i % 2) * 20, 70, 90, 30, '#2a2a33');
    K.RR(x, CX - 90, FLOOR - 260, 180, 230, 80, '#5a5a66'); K.RR(x, CX - 80, FLOOR - 250, 160, 220, 72, '#6a6a78'); U.text(x, '?', CX, FLOOR - 170, T.hero, C.indigo, { shadow: false });
    // hole
    K.EL(x, CX + 40, FLOOR + 10, 150, 26, '#0a0806'); K.R(x, CX - 110, FLOOR + 10, 300, dep * 150, '#0a0806'); const pile = dep * 90; K.EL(x, CX + 300, FLOOR - 10, 60 + pile, 20 + pile * 0.6, '#3a2a1a');
    if (mg.phase === 'coffin') { K.R(x, CX - 80, FLOOR + 90, 240, 60, '#3a2616');
      // 有宝：棺盖一点点撬开，缝里先透出品质色（可能升格）；是手：红光一闪，手直接伸出来
      if (mg.treasure) { const k = omK(mg, mg.om), j = k ? SHW.aura(x, CX + 40, FLOOR + 100, 150, mg.om.q, t, k) : { dx: 0, dy: 0 }, lid = eio(cl((mg.pt - 0.3) / 1.0, 0, 1)); x.save(); x.translate(Math.round(CX - 80 + j.dx), Math.round(FLOOR + 84 + j.dy - lid * 26)); x.rotate(-0.35 * lid); K.R(x, 0, 0, 240, 14, '#5a3a22'); K.R(x, 0, 0, 240, 3, '#7a5a3a'); x.restore(); }
      else { K.R(x, CX - 80, FLOOR + 84, 240, 14, '#5a3a22'); if (mg.hand) { K.GL(x, CX + 40, FLOOR + 100, 160, '#ff3a2a', 0.6); const hy = Math.round(FLOOR + 50 - eo(cl((mg.pt - mg.hand) / 0.25, 0, 1)) * 60); K.R(x, CX + 20, hy + 14, 18, 70, '#8aa074'); for (let i = 0; i < 4; i++) K.R(x, CX + 14 + i * 7, hy, 5, 18, '#8aa074'); } } }
    mg.dirt.forEach(d => K.R(x, d.x, d.y, 8, 8, '#4a3a2a'));
    K.SP(x, heroSp(this), CX - 250, FLOOR + 10, 180); x.save(); x.translate(CX - 160, FLOOR - 90); x.rotate(-0.4 + mg.sw * 1.2); K.R(x, -5, 0, 10, 120, '#6a4a2a'); K.RR(x, -22, 110, 44, 40, 6, '#9aa0aa'); x.restore();
    // candle：越烧越短，火苗越晃越凶
    const cx0 = CX + 60, cy0 = FLOOR - 270, life = cl(mg.phase === 'dig' ? mg.burn / 5.2 : mg.phase === 'out' ? 0 : 1, 0, 1), dz = mg.phase === 'dig' ? 1 - life : 0; K.R(x, cx0 - 10, cy0 - 50 * life, 20, 50 * life + 10, '#e8dcc4');
    if (life > 0) { const f = 0.8 + (0.3 + 0.4 * dz) * Math.sin(t * (20 + 24 * dz)), wob = Math.round(dz * 7 * Math.sin(t * 29)); K.GL(x, cx0 + wob, cy0 - 60 * life, 120 * life + 30, '#ffb060', 0.7); K.EL(x, cx0 + wob, cy0 - 50 * life - 14, 7 * f, 16 * f, '#ffcc33'); }
    if (mg.phase === 'dig') { U.bar(x, SX + 80, SY + 130, 320, 20, dep, { col: C.gold }); U.text(x, '深度', SX + 240, SY + 170, T.cap, C.lavender); }
    if (mg.phase === 'out') K.R(x, SX, SY, SW, SH, 'rgba(7,6,15,' + cl(mg.pt * 2.5, 0, 0.85) + ')');
  } };

// ═════════════════════ 废弃医务室 · pick bottles off the shelf ═════════════════════
// q：揭晓前亮的品质色（-1 毒药不亮）；金色药水的品质看抽到的道具
const MEDS = [
  { n: '绿色药水', c: C.green, d: '回血', q: 1, f(g) { return '回复 ' + g.heroHeal(0.2) + ' 生命'; } },
  { n: '蓝色药水', c: C.blue, d: '经验', q: 1, f(g, mg) { return g.giveExp(45, mg.from); } },
  { n: '金色药水', c: C.gold, d: '宝贝', q: 3, f(g, mg) { return g.award([mg.it || K.item(g.run, mg.P)], mg.from).join(''); } },
  { n: '白色药片', c: C.white, d: '物资', q: 0, f(g, mg) { return g.award([{ k: 'rsup', v: 25 }], mg.from).join(''); } },
  { n: '红色药水', c: C.red, d: '剧毒', q: -1, f(g) { S.mini('clinic', 'bad'); return '中毒 -' + g.heroHurt(0.1); } },
  { n: '紫色药水', c: C.violet, d: '部队攻击', q: 2, f(g) { g.run.runBuff.unitAtk = (g.run.runBuff.unitAtk || 0) + 0.05; S.mini('clinic', 'mult'); return '本局部队攻击 +5%'; } }];
MINI.clinic = { title: '废弃医务室', img: 'gurney', col: C.ice, text: '药柜里有六个瓶子。有两个标签被血糊住了。你最多敢试三瓶。',
  init(mg) { const pool = MEDS.slice().sort(() => rnd() - 0.5); mg.bt = pool.map((m, i) => ({ m, x: SX + 250 + i * 140, y: SY + 330, dark: false, open: 0 })); const dk = [0, 1, 2, 3, 4, 5].sort(() => rnd() - 0.5).slice(0, 2); dk.forEach(i => mg.bt[i].dark = true); mg.opened = 0; mg.got = []; },
  open(mg, i) { const b = mg.bt[i]; if (!b || b.opened || mg.phase !== 'idle' || mg.opened >= 3) return; b.opened = true; mg.opened++; mg.cur = i; S.mini('clinic', 'pick');
    mg.it = b.m.q === 3 ? K.item(this.run, mg.P) : null; b.q = b.m.q === 3 ? (mg.it.k === 'item' ? mg.it.q || 0 : 1) : b.m.q;
    // 毒药一拍带过；好药先抖、先亮品质色（糊了标签的可能先亮低一档再升格），史诗以上还压暗聚光
    if (b.q < 0) { mg.om = null; this.miniSet('uncork'); return; }
    const path = b.dark ? SHW.omenPath(b.q) : [b.q]; mg.om = { path, at: 0, dur: 0.3 + b.q * 0.2 + (path.length - 1) * 0.25 }; this.miniSet('omen');
    if (b.q >= 2) SHW.reach(this, mg, { x: b.x, y: b.y - 10, r: 120, lv: b.q >= 3 ? 2 : 1, label: '' }); },
  down(mg, px, py) { mg.bt.forEach((b, i) => { if (Math.abs(px - b.x) < 55 && Math.abs(py - b.y) < 90) MINI.clinic.open.call(this, mg, i); }); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '收手', leave: 1, gold: mg.opened >= 3, sub: '已试 ' + mg.opened + ' / 3 · 点击药瓶试喝', fn: () => this.miniFinish(mg.got.length ? '你试了：' + mg.got.join('；') + '。' : '你一瓶都没敢碰。', mg.got.length ? '#8fe0ff' : '#8d8496') }]; },
  tick(mg) {
    if (mg.phase === 'omen') { const b = mg.bt[mg.cur]; omen(this, mg, mg.om, b.x, b.y - 10); if (mg.pt > mg.om.dur + 0.12) this.miniSet('uncork'); }
    if (mg.phase === 'uncork') { const b = mg.bt[mg.cur], bad = b.q < 0, u0 = bad ? 0.15 : 0.3; b.open = cl(mg.pt / u0, 0, 1);
      if (mg.pt > u0 && !b.done) { b.done = true; mg.from = { x: b.x, y: b.y }; S.mini('clinic', 'drink'); const tx = b.m.f(this, mg); mg.got.push(b.m.n + '：' + tx); this.miniSay(b.m.n + '：' + tx, b.m.c);
        if (bad) { SHW.lose(this, mg); this.fx.spark(b.x, b.y - 40, b.m.c, 10, { v: 300 }); }
        else { const tier = b.m.q === 3 ? Math.max(2, Math.min(4, b.q + 1)) : b.m.q === 2 ? 2 : 1, n = +(String(tx).match(/\d+/) || [0])[0]; this.fx.explode(b.x, b.y - 40, b.m.c, 0.8); SHW.win(this, mg, tier, { x: b.x, y: b.y - 60, col: SHW.QC(b.q), v: b.m.q <= 1 ? n : 0 }); mg.hold = HOLD[tier]; } }
      if (mg.pt > u0 + (bad ? 0.25 : mg.hold || 0.6)) this.miniSet('idle'); } },
  draw(x, mg) {
    const t = mg.t; night(x, '#16202a', '#080c10'); K.R(x, SX + 180, SY + 150, SW - 360, 360, '#3a3028'); K.R(x, SX + 195, SY + 165, SW - 390, 330, '#1a1612'); K.R(x, SX + 195, SY + 405, SW - 390, 12, '#5a4838'); K.R(x, SX + 195, SY + 250, SW - 390, 10, '#5a4838');
    for (let i = 0; i < 3; i++) K.pip(x, SX + 80, SY + 200 + i * 50, 24, i < 3 - mg.opened ? C.ice : null);
    // legend：色块 + 一个词
    MEDS.forEach((m, i) => { U.box(x, SX + SW - 160, SY + 160 + i * 44, 20, 20, m.c); U.text(x, m.d, SX + SW - 100, SY + 170 + i * 44, T.cap, C.silver, { align: 'left' }); });
    mg.bt.forEach((b, i) => { const hov = mg.phase === 'idle' && !b.opened && Math.abs(mg.mx - b.x) < 55 && Math.abs(mg.my - b.y) < 90, lift = hov ? 14 : 0, col = b.dark && !b.done ? '#2a1a1a' : b.m.c;
      // 揭晓前：瓶子被提起一点、抖、背后亮品质色
      const cur = i === mg.cur && mg.phase === 'omen' && mg.om && mg.om.q != null, j = cur ? SHW.aura(x, b.x, b.y - 10, 90, mg.om.q, t, omK(mg, mg.om)) : { dx: 0, dy: 0 }, up = cur ? Math.round(12 * eo(cl(mg.pt / 0.2, 0, 1))) : 0;
      x.save(); x.translate(b.x + j.dx, b.y + 70 - lift - up + j.dy); if (b.done) x.globalAlpha = 0.5;
      K.RR(x, -34, -110, 68, 110, 14, 'rgba(200,230,255,0.25)', C.silver, 3); K.RR(x, -30, -70, 60, 66, 10, col); if (!b.dark || b.done) K.GL(x, 0, -40, 60, col, 0.3); K.R(x, -12, -130, 24, 22, C.brown); if (b.dark && !b.done) { K.R(x, -26, -64, 52, 30, C.wine); U.text(x, '?', 0, -50, T.item, C.cream); } K.R(x, -24, -100, 8, 60, 'rgba(255,255,255,0.35)');
      if (b.open > 0 && !b.done) { K.R(x, -12, -130 - eo(b.open) * 60, 24, 22, C.brown); } x.restore(); });
  } };

// ═════════════════════ 落地镜 · repeat the reflection's moves ═════════════════════
const ARW = { up: '↑', down: '↓', left: '←', right: '→' }, MRX = CX + 200, MRY = SY + 380;
MINI.mirror = { title: '落地镜', img: 'mirror', col: C.blue, text: '镜子里的你慢了半拍才动。它在示范什么——跟着做一遍。',
  init(mg) { mg.round = 0; mg.got = []; },
  begin(mg) { mg.round++; mg.seq = [...Array(3 + mg.round)].map(() => M.pick(['up', 'down', 'left', 'right'])); mg.inp = []; mg.perf = 0; mg.lastIn = 0; mg.om = null; this.miniSet('show'); },
  input(mg, d) { if (mg.phase !== 'input') return; mg.inp.push(d); mg.pose = { d, t: 0 }; const i = mg.inp.length - 1, sx = CX - 280, sy = FLOOR - 250;
    if (mg.seq[i] !== d) { S.mini('mirror', 'wrong'); miss(this, mg, sx, sy); SHW.lose(this, mg); this.miniSet('fail'); return; }
    S.mini('mirror', 'tone', ['up', 'down', 'left', 'right'].indexOf(d));
    const gap = mg.pt - mg.lastIn, w = gap < 0.45 ? 'PERFECT' : gap < 0.9 ? 'GREAT' : 'GOOD'; mg.lastIn = mg.pt; if (w === 'PERFECT') mg.perf++; combo(this, mg, sx, sy, w); this.fx.ring(MRX, MRY - 30, 20, 140, C.blue, 4, 0.25);
    // 只差最后一个动作：聚光罩住镜子；第二轮是超级听牌
    if (mg.inp.length === mg.seq.length - 1) SHW.reach(this, mg, { x: MRX, y: MRY - 30, r: 250, lv: mg.round >= 2 ? 2 : 1 });
    if (mg.inp.length === mg.seq.length) { S.mini('mirror', 'pass'); MINI.mirror.win.call(this, mg); } },
  // 做完就定下镜子里走出什么；镜面先亮它的品质色，再端出来
  win(mg) { this.miniSet('win'); SHW.calm(mg); const run = this.run, u = M.pick(run.roster);
    mg.rw = mg.round === 1 && u && M.canAdd(run, u.type) ? { k: 'unit', type: u.type } : K.item(run, mg.P);
    const q = mg.rw.k === 'unit' ? M.DB[mg.rw.type].q || 0 : mg.rw.k === 'item' ? mg.rw.q || 0 : 0, gr = mg.perf >= mg.seq.length ? 'S' : mg.perf * 2 >= mg.seq.length ? 'A' : 'B';
    mg.rtx = mg.rw.k === 'unit' ? '另一个' + M.DB[mg.rw.type].n : mg.rw.k === 'item' ? M.ITEMS[mg.rw.key].name : '积分 +' + M.fmt(mg.rw.v);
    mg.tier = Math.max(q >= 3 ? 4 : 0, Math.min(3, (mg.round >= 2 ? 3 : 2) + (gr === 'S' ? 1 : 0))); mg.paid = false; mg.om = { path: SHW.omenPath(q), at: 0.1, dur: 0.7 }; SHW.grade(this, mg, gr, CX - 280, SY + 250); },
  key(mg, k, down) { if (down && mg.phase === 'input' && ARW[k]) { MINI.mirror.input.call(this, mg, k); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '凝视镜子', sub: '记住它的动作，再做一遍', gold: 1, fn: () => MINI.mirror.begin.call(this, mg) }, { t: '打碎镜子', sub: '得到积分，领袖受伤', danger: 1, fn: () => { this.heroHurt(0.1); S.mini('mirror', 'wrong'); this.miniFinish('碎片划伤了你。镜框里藏着东西。', '#d0453c', [K.item(this.run, mg.P)]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('你背对着镜子离开。它还在看你。', '#8d8496') }];
    if (mg.phase === 'input') return ['up', 'down', 'left', 'right'].map(d => ({ t: ARW[d], sub: '点击或方向键', fn: () => MINI.mirror.input.call(this, mg, d) }));
    if (mg.phase === 'won') return [{ t: '再来一轮', sub: '更长的动作 · 赢了再得一件宝贝', gold: 1, dis: mg.round >= 2, why: '镜子不肯了', fn: () => MINI.mirror.begin.call(this, mg) }, { t: '见好就收', leave: 1, fn: () => this.miniFinish('镜子里走出了：' + mg.got.join('、') + '。', '#8fb0ff') }]; return []; },
  tick(mg, dt) {
    if (mg.pose) mg.pose.t += dt;
    if (mg.phase === 'show') { const i = Math.floor((mg.pt - 0.5) / 0.7); if (i >= 0 && i < mg.seq.length && mg.si !== i) { mg.si = i; mg.mpose = { d: mg.seq[i], t: 0 }; S.mini('mirror', 'tone', ['up', 'down', 'left', 'right'].indexOf(mg.seq[i])); } if (mg.mpose) mg.mpose.t += dt; if (mg.pt > 0.5 + mg.seq.length * 0.7 + 0.3) { mg.si = -1; mg.mpose = null; this.miniSet('input'); } }
    if (mg.phase === 'win') { omen(this, mg, mg.om, MRX, MRY - 30);
      if (mg.pt > 0.85 && !mg.paid) { mg.paid = true; const tx = mg.rtx;
        payout(this, mg, { tier: mg.tier, x: MRX, y: MRY - 20, col: SHW.QC(mg.om.q), gains: [mg.rw], snd: () => { mg.got.push(tx); this.miniSay('镜子里走出了 ' + tx, '#8fb0ff', true); this.fx.rays(MRX, SY + 380, '#8fb0ff', 1, { r: 260 }); }, done: () => { mg.paid = false; this.miniSet('won'); } }); } }
    if (mg.phase === 'fail' && mg.pt > 0.4 && !mg.fin) { mg.fin = true; const run = this.run, u = M.pick(run.roster); if (u) { run.roster = run.roster.filter(v => v !== u); this.award([{ k: 'vision', v: -1 }]); this.miniFinish('动作错了。镜子里的你停住了——' + M.DB[u.type].n + ' 走进了镜子，没有回来。雾从镜子里漫了出来，视野 -1。' + (mg.got.length ? '（之前得到：' + mg.got.join('、') + '）' : ''), '#d0453c'); } else { this.heroHurt(0.1); this.miniFinish('动作错了。镜子里的你伸手掐住了你。', '#d0453c'); } }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#1a1a2a', '#08080e'); const mx = MRX, my = MRY;
    // 镜框：金框 + 墨边，框上一圈方灯珠（跟着演出跑）
    U.box(x, mx - 170, my - 260, 340, 460, C.gold); K.R(x, mx - 150, my - 240, 300, 420, K.LG(x, 0, my - 240, 0, my + 180, [[0, '#2a3a5a'], [1, '#0e1420']]));
    K.bulbs(x, mx - 160, my - 250, 320, 440, 0, C.gold, 14);
    const pose = (p, bx, by, flip, tint) => { let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0; if (p) { const q = Math.sin(cl(p.t / 0.5, 0, 1) * Math.PI); if (p.d === 'up') dy = -60 * q; if (p.d === 'down') { sy = 1 - 0.35 * q; sx = 1 + 0.2 * q; } if (p.d === 'left') { dx = -40 * q; rot = -0.25 * q; } if (p.d === 'right') { dx = 40 * q; rot = 0.25 * q; } }
      x.save(); x.translate(bx + dx * (flip ? -1 : 1), by + dy); x.rotate(rot * (flip ? -1 : 1)); x.scale(sx, sy); if (tint) x.globalAlpha = 0.7; K.SP(x, heroSp(this), 0, 0, 190, flip); x.restore(); };
    // 镜面裁剪：K.RR 现在只画硬边矩形、不留路径，这里自己建矩形路径
    x.save(); x.beginPath(); x.rect(mx - 150, my - 240, 300, 420); x.clip(); pose(mg.mpose || (mg.phase === 'input' || mg.phase === 'win' ? mg.pose : null), mx, my + 150, true, 1); K.R(x, mx - 150, my - 240, 300, 420, 'rgba(80,120,200,0.25)');
    if (mg.phase === 'win' && mg.om && mg.om.q != null) SHW.aura(x, mx, my - 30, 160, mg.om.q, t, omK(mg, mg.om));
    if (mg.phase === 'fail') K.R(x, mx - 150, my - 240, 300, 420, 'rgba(232,67,79,' + cl(mg.pt * 2.5, 0, 0.5) + ')'); x.restore();
    if (mg.mpose && mg.mpose.t < 0.6) K.big(x, ARW[mg.mpose.d], mx, my - 170, 96, C.blue, mg.mpose.t); // 示范的方向：大箭头压在镜面上沿，不和说明文字叠在一起
    pose(mg.phase === 'show' ? null : mg.pose, CX - 280, FLOOR, false, 0);
    // 动作序列：小方格，做对的格子填满
    if (mg.seq) { mg.seq.forEach((d, i) => { const done = mg.inp && i < mg.inp.length, bx = SX + 70 + i * 64; U.box(x, bx, SY + 110, 54, 54, done ? C.blue : C.abyss); if (!done) K.RR(x, bx, SY + 110, 54, 54, 0, null, C.blue, 3); U.text(x, done || mg.phase === 'fail' ? ARW[d] : '?', bx + 27, SY + 137, T.btn, done ? C.ink : C.blue, { shadow: !done }); }); }
    if (mg.phase === 'input') K.sign(x, '轮到你了', CX - 280, SY + 200, { kind: 'gold', size: T.btn });
    if (mg.phase === 'fail') { for (let i = 0; i < 8; i++) K.LN(x, mx, my - 30, mx + Math.cos(i * 0.8) * 200, my - 30 + Math.sin(i * 0.8) * 260, 3, 'rgba(255,255,255,0.7)'); }
  } };

// ═════════════════════ 血祭坛 · hold to pour ═════════════════════
MINI.altar = { title: '血祭坛', img: 'candle', col: C.red, text: '一滴血，一分力。倒得越多，这一趟部队的攻击越高——但蜡烛随时可能被血浇灭。',
  init(mg) { mg.poured = 0; mg.th = 0.14 + rnd() * 0.26 + mg.luck * 0.2; mg.gain = 0; },
  down(mg) { if (mg.phase === 'ready' || mg.phase === 'pour') { this.miniSet('pour'); } },
  up(mg) { if (mg.phase === 'pour') MINI.altar.stop.call(this, mg); },
  stop(mg) { const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), lost = Math.round(mx * mg.poured); this.fx.flash('#ff2a2a', 0.2); const p = this.fxPos('hp'); if (p) this.fx.pop(p.x, p.y - 30, '-' + lost, '#ff5a4a', 40, { num: 1 }); this.pulse.hp = performance.now();
    if (mg.out) { this.miniSet('done'); this.miniSay('蜡烛灭了', '#8d8496', true); SHW.lose(this, mg); SHW.later(mg, HOLD[0], () => this.mini === mg && this.miniFinish('血太多了，蜡烛被浇灭。祭坛什么也没给你。你流了 ' + lost + ' 点血。', '#8d8496')); return; }
    const lv = Math.floor(mg.poured / 0.04), tier = lv >= 6 ? 3 : lv >= 3 ? 2 : lv >= 1 ? 1 : 0;
    mg.gain = lv * 0.02; this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + mg.gain; S.mini('altar', mg.gain ? 'win' : 'flicker'); this.miniSet('done'); this.miniSay('本局部队攻击 +' + Math.round(mg.gain * 100) + '%', '#ffcc33', true);
    // 倍率越高演得越响：倒到六成以上是大赢；一滴没到数一拍带过
    if (tier) SHW.win(this, mg, tier, { x: CX, y: FLOOR - 300, col: tier >= 3 ? C.gold : C.magenta }); else SHW.lose(this, mg);
    SHW.later(mg, HOLD[tier], () => this.mini === mg && this.miniFinish(mg.gain ? '蜡烛亮了一截。你流了 ' + lost + ' 点血，本局部队攻击 +' + Math.round(mg.gain * 100) + '%。' : '你只滴了几滴，祭坛没有理你。', mg.gain ? '#ffcc33' : '#8d8496')); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献血', sub: '按住倒血，松手停下', danger: 1, fn: () => this.miniSet('ready') }, { t: '离开', leave: 1, fn: () => this.miniFinish('烛火跟着你晃了一下。', '#8d8496') }]; if (mg.phase === 'ready') return [{ t: '按住空格 / 鼠标', sub: '倒血', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) {
    if (mg.phase !== 'pour') return; const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), step = 0.1 * dt; if (h.hp - mx * step <= 1) return MINI.altar.stop.call(this, mg); h.hp -= mx * step; mg.poured += step;
    if (Math.floor(mg.poured / 0.04) !== mg.lv) { mg.lv = Math.floor(mg.poured / 0.04); S.mini('altar', 'pour', cl(mg.poured / 0.4, 0, 1)); if (mg.lv > 0) { SHW.crawl(this, mg, mg.lv); this.fx.spark(CX, FLOOR - 290, C.magenta, 6 + mg.lv, { v: 300, dir: -Math.PI / 2, spread: 1.4 }); } }
    // 越倒越紧：倒到两档聚光 + 心跳，倒到五档换超级（红金频闪、心跳更急）
    if (!mg.rl && mg.lv >= 2) { mg.rl = 1; SHW.reach(this, mg, { x: CX + 90, y: FLOOR - 220, r: 240, label: '' }); }
    if (mg.rl === 1 && mg.lv >= 5) { mg.rl = 2; SHW.reach(this, mg, { x: CX + 90, y: FLOOR - 220, r: 240, lv: 2, label: '' }); }
    if (mg.poured > mg.th) { mg.out = true; S.mini('altar', 'out'); MINI.altar.stop.call(this, mg); }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#2a0a0a', '#080202'); K.GL(x, CX, SY + 300, 420, '#ff3a2a', 0.15);
    U.box(x, CX - 260, FLOOR - 140, 520, 140, C.wine); U.box(x, CX - 280, FLOOR - 150, 560, 20, C.red);
    const gx = CX, gy = FLOOR - 150; K.PL(x, [[gx - 70, gy - 140], [gx + 70, gy - 140], [gx + 40, gy - 60], [gx - 40, gy - 60]], '#caa84a'); K.R(x, gx - 8, gy - 60, 16, 44, '#caa84a'); K.EL(x, gx, gy - 10, 50, 12, '#caa84a');
    const lvl = cl(mg.poured / 0.4, 0, 1); x.save(); x.beginPath(); x.moveTo(gx - 66, gy - 136); x.lineTo(gx + 66, gy - 136); x.lineTo(gx + 40, gy - 62); x.lineTo(gx - 40, gy - 62); x.clip(); K.R(x, gx - 70, gy - 62 - lvl * 76, 140, lvl * 80, C.red); x.restore();
    // 烛火：离熄灭越近越抖（原本的提示），倒得越多也越晃
    const cx0 = CX + 180, near = cl((mg.poured / mg.th - 0.55) / 0.45, 0, 1), risk = mg.phase === 'pour' ? lvl : 0, fl = mg.out ? 0 : 1 + (near * 0.5 + risk * 0.25) * Math.sin(t * (40 + risk * 20)), wob = (near * 8 + risk * 5) * Math.sin(t * 31);
    K.R(x, cx0 - 14, FLOOR - 250, 28, 100, '#e8dcc4'); if (!mg.out) { K.GL(x, cx0 + wob, FLOOR - 270, 140 * fl, '#ff8a3a', 0.6); K.EL(x, cx0 + wob, FLOOR - 272, 9 * fl, 22 * fl, '#ffcc33'); K.EL(x, cx0 + wob, FLOOR - 268, 4 * fl, 10 * fl, '#fff6c0'); } else K.LN(x, cx0, FLOOR - 255, cx0 + 10, FLOOR - 320, 3, 'rgba(160,160,170,0.5)');
    const hx = CX - 330; K.SP(x, heroSp(this), hx, FLOOR, 190);
    if (mg.phase === 'pour') { x.strokeStyle = C.red; x.lineWidth = 6; x.beginPath(); x.moveTo(hx + 50, FLOOR - 110); x.quadraticCurveTo(gx - 120, gy - 260, gx, gy - 130); x.stroke(); for (let i = 0; i < 4; i++) K.CI(x, gx + Math.sin(t * 20 + i) * 8, gy - 140 + i * 10, 4, '#d01a1a'); }
    // 部队攻击读数：品红大字，每涨一档弹一下；流血量红字
    K.big(x, '部队攻击 +' + (Math.floor(mg.poured / 0.04) * 2) + '%', CX, SY + 160, T.num, C.magenta, mg.phase === 'pour' ? (mg.poured % 0.04) / 0.1 : 9); U.text(x, '已流血 ' + Math.round(mg.poured * 100) + '%', CX, SY + 215, T.body, C.red);
    if (mg.phase === 'ready') K.sign(x, '按住倒血', CX, SY + 272, { kind: 'red', size: T.btn });
  } };

// ═════════════════════ 货郎 · shell game with bottles ═════════════════════
// 选中的瓶子先只抬起一条缝（猜中的话缝里先透出品质色），最后一下才整个掀开
const pedLift = (pt) => (pt < 0.75 ? 0.05 * eo(pt / 0.75) : 0.05 + 0.95 * eb(cl((pt - 0.75) / 0.2, 0, 1)));
MINI.peddler = { title: '货郎', img: 'stall', col: C.violet, text: '货郎掀开布：「三个瓶子，一个有货。眼睛跟得上，东西归你。」',
  init(mg) { mg.slot = [0, 1, 2]; mg.prize = Math.floor(rnd() * 3); mg.rounds = 0; mg.lift = [0, 0, 0]; mg.got = []; },
  sx(i) { return CX - 240 + i * 240; },
  start(mg) { if (!this.miniPay(mg.pay)) return; mg.rounds++; mg.prize = Math.floor(rnd() * 3); mg.slot = [0, 1, 2]; mg.swaps = [...Array(6 + mg.rounds * 2)].map(() => { const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b++; return [a, b]; }); mg.si = 0; mg.judged = false; this.miniSet('show'); },
  guess(mg, s) { if (mg.phase !== 'guess') return; mg.pick = s; mg.right = mg.slot[s] === mg.prize; mg.it = { k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: Math.min(3, M.rollTier2(this.run) + 1) }; mg.om = mg.right ? { path: SHW.omenPath(mg.it.q), at: 0.3, dur: 0.45 } : null; this.miniSet('reveal'); S.mini('peddler', 'lift');
    SHW.reach(this, mg, { x: MINI.peddler.sx(s), y: SY + 360, r: 150, lv: mg.right && mg.it.q >= 3 ? 2 : 1, label: '' }); },
  down(mg, px, py) { if (mg.phase !== 'guess') return; for (let s = 0; s < 3; s++) if (Math.abs(px - MINI.peddler.sx(s)) < 90 && Math.abs(py - (SY + 380)) < 120) MINI.peddler.guess.call(this, mg, s); },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.rounds >= 2, buy = M.nice(mg.pay * 1.5); return [{ t: '押一局', sub: mg.pay + ' 积分 · 猜中赢积分', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '货郎不跟你玩了' : '积分不够', fn: () => MINI.peddler.start.call(this, mg) }, { t: '离开', leave: 1, fn: () => this.miniFinish(mg.got.length ? '你赢走了：' + mg.got.join('、') + '。' : '货郎把布盖了回去。', mg.got.length ? '#b86bff' : '#8d8496') }]; }
    if (mg.phase === 'guess') return ['左', '中', '右'].map((n, s) => ({ t: n, sub: '选这个瓶子', fn: () => MINI.peddler.guess.call(this, mg, s) })); return []; },
  tick(mg, dt) {
    if (mg.phase === 'show') { mg.lift[mg.slot.indexOf(mg.prize)] = Math.sin(cl(mg.pt / 1.2, 0, 1) * Math.PI); if (mg.pt > 1.3) { mg.lift = [0, 0, 0]; this.miniSet('shuffle'); } }
    // 洗牌时灯珠跟着越跑越快
    if (mg.phase === 'shuffle') { SHW.state(mg).lamp = { t: 0.2, col: mg.si % 2 ? C.violet : C.gold, sp: 3 + mg.si * 0.6 }; const D = Math.max(0.16, 0.36 - mg.si * 0.02); if (mg.pt >= D) { const [a, b] = mg.swaps[mg.si]; const t0 = mg.slot[a]; mg.slot[a] = mg.slot[b]; mg.slot[b] = t0; mg.si++; mg.pt = 0; S.mini('peddler', 'shuffle'); if (mg.si >= mg.swaps.length) this.miniSet('guess'); } }
    if (mg.phase === 'reveal') { const ps = mg.slot.indexOf(mg.prize), px = MINI.peddler.sx(mg.pick);
      if (!mg.judged) { mg.lift[mg.pick] = pedLift(mg.pt); if (mg.om) omen(this, mg, mg.om, px, SY + 330);
        if (mg.pt > 0.95) { mg.judged = true; mg.jt = mg.pt;
          if (mg.right) { const it = mg.it; payout(this, mg, { tier: Math.min(4, it.q + 1), x: px, y: SY + 300, col: SHW.QC(it.q), gains: [it], snd: () => { this.miniSay('猜中了！', '#ffcc33', true); S.mini('peddler', 'win'); }, done: (got) => { mg.got.push(...got); mg.judged = false; mg.lift = [0, 0, 0]; this.miniSet('idle'); } }); }
          // 猜错：有货的那个瓶子马上弹起来；就在隔壁的话打「差一点！」
          else { this.miniSay('空的。货郎咧嘴笑了', '#8d8496'); S.mini('peddler', 'lose'); if (Math.abs(mg.pick - ps) === 1) SHW.near(this, mg, MINI.peddler.sx(ps), SY + 355, '差一点！'); else SHW.lose(this, mg); } } }
      else if (!mg.right) { mg.lift[ps] = eo(cl((mg.pt - mg.jt) / 0.12, 0, 1)); if (mg.pt > mg.jt + 0.4) { mg.judged = false; mg.lift = [0, 0, 0]; this.miniSet('idle'); } } }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#1e1628', '#08060c'); K.SP(x, 'stall', CX, SY + 250, 150); K.R(x, CX - 380, SY + 440, 760, 30, '#6a4a2a'); K.R(x, CX - 360, SY + 470, 20, 160, '#4a3220'); K.R(x, CX + 340, SY + 470, 20, 160, '#4a3220'); K.R(x, CX - 380, SY + 430, 760, 14, '#8a2a3a');
    K.bulbs(x, CX - 370, SY + 446, 740, 22, t, C.gold, 28);
    // positions: slot s holds cup id; animate the current swap
    const cupX = {}, arc = {}, vel = {}; mg.slot.forEach((id, s) => cupX[id] = MINI.peddler.sx(s));
    if (mg.phase === 'shuffle' && mg.si < mg.swaps.length) { const [a, b] = mg.swaps[mg.si], D = Math.max(0.16, 0.36 - mg.si * 0.02), p = mg.pt / D, q = eio(p), ia = mg.slot[a], ib = mg.slot[b], dx = MINI.peddler.sx(b) - MINI.peddler.sx(a); cupX[ia] = MINI.peddler.sx(a) + dx * q; cupX[ib] = MINI.peddler.sx(b) - dx * q; arc[ia] = -Math.sin(q * Math.PI) * 40; arc[ib] = Math.sin(q * Math.PI) * 30;
      const v = (eio(Math.min(1, p + 0.05)) - eio(Math.max(0, p - 0.05))) / 0.1 * dx / D; vel[ia] = v; vel[ib] = -v; }
    const cup = (hov) => { K.PL(x, [[-60, 0], [60, 0], [40, -150], [-40, -150]], C.violetDeep); K.PL(x, [[-50, -10], [-20, -10], [-24, -140], [-34, -140]], 'rgba(255,255,255,0.15)'); K.R(x, -20, -176, 40, 30, C.brown); U.box(x, -62, -8, 124, 12, C.violet); if (hov) K.GL(x, 0, -80, 140, C.violet, 0.4); };
    [0, 1, 2].forEach(id => { const s = mg.slot.indexOf(id), lx = cupX[id], ly = SY + 430 + (arc[id] || 0), lift = mg.lift[s] || 0, hov = mg.phase === 'guess' && Math.abs(mg.mx - lx) < 90 && Math.abs(mg.my - (SY + 380)) < 120, vx = vel[id] || 0;
      // 洗牌的速度线和残影：越快拖得越长
      if (vx) { const sp = Math.min(1, Math.abs(vx) / 2400), dir = Math.sign(vx), len = Math.round(40 + 120 * sp); x.save(); for (let k = 1; k <= 3; k++) { x.globalAlpha = 0.28 * sp / k; x.save(); x.translate(Math.round(lx - dir * k * 26 * sp), Math.round(ly)); cup(false); x.restore(); } x.globalAlpha = 0.7 * sp; for (let k = 0; k < 4; k++) K.R(x, Math.round(dir > 0 ? lx - 70 - len - k * 10 : lx + 70 + k * 10), Math.round(ly - 30 - k * 34), len, 4, C.lavender); x.restore(); }
      // 选中的瓶子：抖，猜中的话缝里先透出品质色（可能升格）
      let j = { dx: 0, dy: 0 }; const sel = mg.phase === 'reveal' && s === mg.pick && !mg.judged; if (sel) { if (mg.om && mg.om.q != null) j = SHW.aura(x, lx, ly - 10, 90, mg.om.q, t, omK(mg, mg.om)); j.dx += Math.round(Math.sin(t * 47) * 2); }
      if (id === mg.prize && lift > 0.1) { K.GL(x, lx, ly - 30, 90, mg.phase === 'reveal' && mg.right ? SHW.QC(mg.it.q) : '#ffcc33', 0.7); K.IC(x, 'gem', lx, ly - 34, 56); }
      x.save(); x.translate(Math.round(lx + j.dx), Math.round(ly - lift * 120 - (hov ? 10 : 0) + j.dy)); cup(hov); x.restore(); });
    if (mg.phase === 'guess') K.sign(x, '在哪个瓶子里？', CX, SY + 560, { kind: 'wine', size: T.btn }); // 放在桌下，不挡货郎
  } };
})();

;
