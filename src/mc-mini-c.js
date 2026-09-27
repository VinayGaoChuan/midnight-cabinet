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
// 曲子、伴奏、判定都在音频时钟上（mc-audio.js 的 S.song）：音符时间是玩家真正听到的时间，按键用事件自己的时间戳
const MUA = M.MCPX, MU = MUA.MUS, LANE_X = MU.lane.map(x => MUA.lx(x)), HIT_Y = MUA.ly(MU.hit);
const mTier = (p) => (p >= 0.8 ? 3 : p >= 0.55 ? 2 : p >= 0.3 ? 1 : 0);
// 完成度条：左上角，三条线就是三档奖励线，线上写评级、线下写奖励——选了合奏就摆出来，预备四拍里亮着提醒
const MBAR = { x: SX + 50, y: SY + 84, w: 480 }, MTH = [[0.3, 'B', '物资', C.teal], [0.55, 'A', '攻击 +10%', C.magenta], [0.8, 'S', '攻击 · 积分', C.gold]];
const mbx = (v) => MBAR.x + Math.round(MBAR.w * v);
const muLayer = (c) => (c >= 12 ? 4 : c >= 8 ? 3 : c >= 5 ? 2 : c >= 3 ? 1 : 0);
let lastInTs = 0; if (typeof window !== 'undefined') ['keydown', 'pointerdown'].forEach(n => window.addEventListener(n, (e) => { lastInTs = e.timeStamp; }, true));
const inTs = () => (performance.now() - lastInTs < 80 ? lastInTs : performance.now());
const muSlot = () => MUA.slot('mini_musician', 'mc_mus');
// 合奏中途关掉小游戏（离开、被打断）：曲子立刻停，地图配乐淡回
if (typeof setInterval !== 'undefined') setInterval(() => { const g = window.__mcg; if (S.song && S.song.on && !(g && g.mini && g.mini.kind === 'musician')) S.song.stop(true); }, 250);
// 现在（或 ts 那一刻）玩家听到的是曲子的第几秒；没有声音时用 performance 时钟
function songAt(mg, ts) { if (mg.useAudio) { const v = S.song.heard(ts); if (v != null) return v; } return ((ts == null ? performance.now() : ts) - mg.clock0) / 1000; }
MINI.musician = { title: '流浪乐师', img: 'musician', col: C.gold, text: '没有脸的乐师拉着琴。琴声停下来，他把弓递给了你。',
  init(mg) { const B = S.song.B; mg.B = B; mg.notes = S.song.NOTES.map(n => ({ i: n.i, t: (n.beat + 4) * B, l: n.l, st: 0 })); mg.end = 40 * B; mg.score = 0; mg.combo = 0; mg.maxCombo = 0; mg.perf = 0;
    mg.laneF = [0, 0, 0]; mg.laneG = [0, 0, 0]; mg.laneBad = [0, 0, 0]; mg.keyP = [-9, -9, -9]; mg.lastN = mg.notes[mg.notes.length - 1]; mg.layer = 0; mg.lampK = 1; mg.bulbsK = 0; mg.crowd = 0; mg.song = null; mg.cnt = -1; },
  // 选了合奏先放 1.9 秒示范（一颗虚影音符落到琴马上、中间的弦响、键帽按下去），然后才起曲子的预备四拍
  start(mg) { this.miniSet('demo'); mg.demoT = 0; S.whoosh(0.3); },
  go(mg) { this.miniSet('play'); const sg = S.song.begin(); mg.useAudio = !!sg; mg.clock0 = performance.now() + 200; mg.song = songAt(mg); },
  hit(mg, l) { if (mg.phase !== 'play') return; mg.keyP[l] = mg.t; const at = songAt(mg, inTs()); let best = null, bd = 0.24;
    mg.notes.forEach(n => { if (n.st || n.l !== l) return; const d = Math.abs(n.t - at); if (d < bd) { bd = d; best = n; } });
    const sl = muSlot(), bx = MU.lane[l], by = MU.hit - 3;
    if (!best) { mg.laneBad[l] = 1; S.song.stray(); M.MCPX.npcAct('MidnightFiddler', 'hurt'); mg.combo = 0; mg.layer = Math.max(0, mg.layer - 2); S.song.layers(mg.layer); miss(this, mg, LANE_X[l], HIT_Y - 130); return; }
    const w = bd < 0.04 ? 'PERFECT' : bd < 0.08 ? 'GREAT' : 'GOOD'; best.st = bd < 0.08 ? 2 : 1; mg.score += best.st; mg.combo++; mg.maxCombo = Math.max(mg.maxCombo, mg.combo); if (w === 'PERFECT') mg.perf++;
    S.song.hit(best.i, w === 'PERFECT'); mg.layer = Math.max(mg.layer, muLayer(mg.combo)); S.song.layers(mg.layer);
    mg.laneF[l] = 1; mg.laneG[l] = w === 'PERFECT' ? 3 : w === 'GREAT' ? 2 : 1;
    if (sl) { if (w === 'GOOD') sl.burst('rosin', bx, by, 4, { sp: 16, ang: 0, spread: 1.6, life: 0.5 }); else { sl.burst('spark', bx, by, w === 'PERFECT' ? 10 : 6, { sp: 34, ang: 0, spread: 1.4, life: 0.5, floor: MU.hit + 2 }); sl.flash(1, w === 'PERFECT' ? 1.4 : 0.7); }
      if (w === 'PERFECT') { sl.burst('notefx', bx, by - 4, 3, { sp: 20, ang: 0, spread: 0.6, life: 1.2 }); sl.burst('glint', bx, by, 2, { sp: 10, life: 0.5 }); } }
    const cn = combo(this, mg, LANE_X[l], HIT_Y - 130, w); this.fx.ring(LANE_X[l], HIT_Y - 10, 18, 60 + best.st * 30, [C.pink, C.ice, C.lime][l], 4, 0.22);
    // 乐师跟着你：狂热时抛帽狂扫弦，PERFECT 时扫一下弦
    if (cn === 5) M.MCPX.npcAct('MidnightFiddler', 'skill'); else if (w === 'PERFECT' && cn !== 5 && !mg.npcBusy) M.MCPX.npcAct('MidnightFiddler', 'attack');
    if (best === mg.lastN) SHW.calm(mg); },
  key(mg, k, down) { const l = { l0: 0, l1: 1, l2: 2, left: 0, down: 1, up: 1, right: 2 }[k]; if (l != null && mg.phase === 'play') { if (down) MINI.musician.hit.call(this, mg, l); return true; } },
  down(mg, px, py) { if (mg.phase === 'play') { const l = px < CX - 85 ? 0 : px > CX + 85 ? 2 : 1; return MINI.musician.hit.call(this, mg, l); }
    // 演奏前点舞台：水面一圈涟漪、一声曼陀林
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); const sl = muSlot(); if (sl) sl.burst('glint', MUA.ax(px), Math.max(150, Math.min(172, MUA.ay(py))), 3, { sp: 8, life: 0.6 }); S.mini('musician', 'pluck'); } },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '接过琴弓合奏', sub: '免费 · 合得越好赏得越多', gold: 1, how: { kbm: '音符落到线上时按 [Q][W][E]', touch: '{tap} 音符落到线上时点那条音轨' }, fn: () => MINI.musician.start.call(this, mg) }, { t: '听他拉完一曲', sub: '免费 · 物资 +15', fn: () => this.miniFinish('他点点头，从琴盒里拿出一袋东西给你。', '#caa84a', [{ k: 'rsup', v: 15 }]) }, { t: '离开', leave: 1, fn: () => this.miniFinish('琴声在你背后停了。', '#8d8496') }]; },
  tick(mg, dt) {
    mg.laneF = mg.laneF.map(f => Math.max(0, f - dt * 4)); mg.laneBad = mg.laneBad.map(f => Math.max(0, f - dt * 5)); mg.lampK += (1 - mg.lampK) * Math.min(1, dt * 1.5);
    mg.bulbsK = cl(mg.bulbsK + (mg.layer >= 2 ? dt * 1.2 : -dt * 3), 0, 1); mg.crowd = cl(mg.crowd + (mg.layer >= 3 ? dt * 1.5 : -dt * 2), 0, 1);
    if (mg.phase === 'tally') return MINI.musician.tally.call(this, mg, dt);
    if (mg.phase === 'demo') { mg.demoT += dt; if (!mg.demo && mg.demoT >= 1.3) { mg.demo = 1; mg.keyP[1] = mg.t; mg.laneF[1] = 1; mg.laneG[1] = 2; S.mini('musician', 'pluck'); } if (mg.demoT >= 1.9) MINI.musician.go.call(this, mg); return; }
    if (mg.phase !== 'play') return; mg.song = songAt(mg); const B = mg.B, song = mg.song;
    // 预备小节：第 2、3、4 拍砸「3」「2」「1」
    const bi = Math.floor(song / B); if (bi !== mg.cnt && bi >= 1 && bi <= 3 && song < 4 * B) { mg.cnt = bi; SHW.stamp(mg, String(4 - bi), CX, SY + 260, C.gold, 110 + bi * 10, B * 0.9); this.fx.kick(1 + bi); }
    mg.notes.forEach(n => { if (!n.st && song - n.t > 0.24) { n.st = -1; S.song.miss(n.i); M.MCPX.npcAct('MidnightFiddler', 'hurt'); mg.combo = 0; mg.layer = Math.max(0, mg.layer - 2); S.song.layers(mg.layer); mg.lampK = 0.5; miss(this, mg, LANE_X[n.l], HIT_Y - 130); if (n === mg.lastN) SHW.calm(mg); } });
    // 最后一个音符能改评级时：聚光罩住它那条音轨、心跳（能冲到 S 就是超级听牌）
    const L = mg.lastN; if (!mg.reached && !L.st && song > L.t - 0.9 && mg.notes.every(n => n === L || n.st)) { mg.reached = 1; const N2 = mg.notes.length * 2, hi = mTier((mg.score + 2) / N2); if (hi > mTier(mg.score / N2)) SHW.reach(this, mg, { x: LANE_X[L.l], y: HIT_Y, r: 130, lv: hi >= 3 ? 2 : 1 }); }
    if (song > mg.lastN.t + 2 * B && mg.lastN.st) { this.miniSet('tally'); mg.tally = { t: 0, shown: 0, cross: 0, pct: mg.score / (mg.notes.length * 2) }; }
  },
  // 结算四拍：完成度条从 0 往上滚、跨线一拍一拍加码、评级字母升格 → 卡帧 → 评级章 → 逐项砸出 → 奖励
  tally(mg, dt) { const T = mg.tally; T.t += dt; const p = Math.min(T.pct, T.t / 1.3 * Math.max(0.3, T.pct)); T.shown = p;
    if (Math.floor(p * 20) !== T.tick) { T.tick = Math.floor(p * 20); S.mini('musician', 'tick', T.tick); }
    [0.3, 0.55, 0.8].forEach((v, k) => { if (p >= v && T.cross <= k) { T.cross = k + 1; SHW.stamp(mg, 'CBAS'[k + 1], mbx(v), SY + 200, [C.teal, C.magenta, C.gold][k], 60 + k * 14, 0.9); this.fx.flash('#ffffff', 0.12 + k * 0.06); this.fx.kick(3 + k * 3); S.mini('musician', 'cross', k); } });
    if (T.t > 1.3 && !T.done) { T.done = 1; SHW.hitstop(mg, 0.15, mbx(T.pct), MBAR.y + 9, () => { MINI.musician.pay.call(this, mg);
      SHW.items(this, mg, [{ text: '完成度 ' + Math.round(T.pct * 100) + '%', col: C.cream, size: 40 }, { text: '最大连击 ' + mg.maxCombo, col: C.gold, size: 40 }, { text: 'PERFECT ' + mg.perf, col: C.magenta, size: 40 }], { x: SX + SW - 270, y: SY + 250, dy: 64, gap: 0.22, t0: 0.3 }); }); } },
  pay(mg) { const N = mg.notes.length, pct = mg.score / (N * 2); let tx, col, g = [], gr, ev;
    if (pct >= 0.8) { this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + 0.08; g.push({ k: 'wallet', v: M.nice(mg.P * 6) }); tx = '乐师第一次笑了（如果那算笑的话）。这一趟部队攻击 +8%。'; col = '#ffcc33'; gr = 'S'; ev = 'great'; }
    else if (pct >= 0.55) { this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + 0.1; tx = '部队听得热血沸腾。这一趟部队攻击 +10%。'; col = '#f2c14e'; gr = 'A'; ev = 'ok'; }
    else if (pct >= 0.3) { g.push({ k: 'rsup', v: 15 }); tx = '勉强能听。他还是给了你一点东西。'; col = '#caa84a'; gr = 'B'; ev = 'poor'; }
    else { tx = '琴弦断了一根。他默默收起了琴。'; col = '#8d8496'; gr = 'C'; ev = 'snap'; }
    const wv = g.find(o => o.k === 'wallet'); mg.after = { q: GT[gr], t: mg.t }; S.song.stop();
    payout(this, mg, { grade: gr, tier: GT[gr], x: CX, y: SY + 420, gx: CX - 330, gy: SY + 300, v: wv && wv.v, gains: g, tx: '合奏完成度 ' + Math.round(pct * 100) + '%。' + tx, tc: col, snd: () => S.mini('musician', ev) }); },
  draw(x, mg) {
    if (mg.phase === 'play') mg.song = songAt(mg);
    const song = mg.song == null ? -9 : mg.song, beat = song / (mg.B || 0.4545), bp = beat - Math.floor(beat), pulse = song > 0 ? Math.max(0, 1 - bp * 4) : 0;
    K.pxr(x, 'mini_musician', 0, 0, mg.t, { song, beat, layers: mg.layer, laneF: mg.laneF, laneG: mg.laneG, laneBad: mg.laneBad, notes: mg.phase === 'play' || mg.phase === 'tally' ? mg.notes : [], lampK: mg.lampK, bulbsK: mg.bulbsK, crowd: mg.crowd }, 'mc_mus');
    // 乐师（像素人物做好之前是剪影）和领袖：都踩着拍子
    MINI.musician.npc(x, mg, pulse); MUA.cast(x, heroSp(this), 262, 148 - (mg.phase === 'play' ? Math.round(pulse) : 0), 'idle', mg.t, true);
    // Q W E 键帽：开始合奏才亮出来（手柄是 ← ↓ →，手机直接点音轨、不画键帽）；按下先压扁再弹大
    const capL = mg.phase === 'play' || mg.phase === 'demo' ? M.byInput({ kbm: ['Q', 'W', 'E'], pad: ['←', '↓', '→'], touch: null }, this) : null;
    if (capL) for (let l = 0; l < 3; l++) { const q = (mg.t - mg.keyP[l]) / 0.2, k = q < 0.3 ? 1 - 0.1 * q / 0.3 : q < 1 ? 0.9 + 0.22 * Math.sin((q - 0.3) / 0.7 * Math.PI) * (1 - (q - 0.3) / 0.7) + 0.1 * (q - 0.3) / 0.7 : 1; x.save(); x.translate(LANE_X[l], HIT_Y + 58); x.scale(k, k); U.key(x, capL[l], -22, -14, { size: 22 }); x.restore(); }
    if (mg.phase === 'play' || mg.phase === 'tally' || mg.phase === 'demo') { const shown = mg.phase === 'tally' ? mg.tally.shown : mg.phase === 'demo' ? 0 : mg.score / (mg.notes.length * 2), pre = mg.phase === 'demo' || (mg.phase === 'play' && song < 4 * mg.B), bx = MBAR.x, by = MBAR.y;
      x.save(); x.globalAlpha *= 0.72; K.R(x, bx - 16, by - 58, MBAR.w + 32, 118, '#0d0b1e'); x.restore();
      U.text(x, '完成度', bx, by - 32, T.cap, C.lavender, { align: 'left' }); U.bar(x, bx, by, MBAR.w, 18, shown, { col: C.gold });
      MTH.forEach(([v, g, r, c]) => { const tx = mbx(v), on = shown >= v, k = pre ? 1 + 0.12 * Math.max(0, Math.sin(mg.t * 7 - v * 6)) : 1; K.R(x, tx - 1, by - 8, 3, 34, on ? c : C.white);
        x.save(); x.translate(tx, by - 30); x.scale(k, k); U.text(x, g, 0, 0, 30, c, { outline: true }); x.restore(); U.text(x, r, tx, by + 42, 18, on ? c : C.cream); });
      // 示范和预备四拍里：琴马上的判定线一闪一闪；示范时一颗虚影音符沿中间的弦落到线上
      if (pre) { const SPd = (MU.hit - MU.top) / 1.5, ay = mg.phase === 'demo' ? MU.hit - (1.3 - mg.demoT) * SPd : -1, bl = MUA.lx(MU.x(0, MU.hit) - 12), br = MUA.lx(MU.x(2, MU.hit) + 12);
        x.save(); x.globalAlpha *= 0.55 + 0.35 * Math.sin(mg.t * 10); K.R(x, bl, HIT_Y - 8, br - bl, 16, C.gold); x.restore();
        for (let k = 0; k < 4; k++) { const h = 24 - k * 6; K.R(x, bl - 28 + k * 4, HIT_Y - h / 2, 4, h, C.gold); K.R(x, br + 24 - k * 4, HIT_Y - h / 2, 4, h, C.gold); }   // ▶ … ◀ pointing at the line
        if (mg.phase === 'demo' && mg.demoT < 1.3 && ay >= MU.top) { const r = Math.round((1 + MU.k(ay) * 4) * 4) + 6, nx = MUA.lx(MU.x(1, ay)), ny = MUA.ly(ay); x.save(); x.globalAlpha *= 0.55; K.CI(x, nx, ny, r, C.cream); x.restore(); K.RR(x, nx - r, ny - r, r * 2, r * 2, 0, null, C.white, 3); U.text(x, '示范', nx + r + 36, ny, T.cap, C.cream, { outline: true }); } }
      if (mg.phase !== 'tally') K.sign(x, '连击 ' + mg.combo, SX + SW - 200, SY + 140, { kind: 'dark', size: T.btn, minW: 180 }); }
  },
  // 乐师的剪影占位：宽檐帽、苍白的脸、长大衣，踩拍子一沉一起（像素人物做好后换成 pcd 角色）
  npc(x, mg, pulse) { if (M.MCPX.npcDraw(x, 'MidnightFiddler', 40, 150, mg.t, false, mg, 1.5)) return; const bob = mg.phase === 'play' ? Math.round(pulse) : Math.round(Math.sin(mg.t * 2) * 0.5 + 0.5), ax = 44, feet = 148;
    const px = (a, b, c) => { x.fillStyle = U.pal(c); x.fillRect(MUA.lx(a), MUA.ly(b), 4, 4); };
    for (let k = 0; k < 40; k++) { const y = feet - 1 - k - (k > 6 ? bob : 0), q = k / 40; let hw = q > 0.9 ? (q > 0.95 ? 3 : 7) : q > 0.82 ? 2.5 : 4 + (1 - q) * 4; if (q > 0.82 && q <= 0.9) hw = 3;
      for (let d = -Math.round(hw); d <= Math.round(hw); d++) px(ax + d, y, d === -Math.round(hw) ? '#ffb060' : q > 0.82 && q <= 0.9 && Math.abs(d) < 3 ? '#d8d2c8' : '#12101e'); } },
};

// ═════════════════════ 裁缝老太 · sew a soldier into your shadow ═════════════════════
// 选人是晾衣绳上的布样；剪下来的布样变成一张纸样钉进墙上领袖的影子里，针沿纸样的弧边走，六根大头针是下针点
const GRA = M.MCPX.GRANNY, grSlot = () => M.MCPX.slot('mini_granny', 'mc_granny');
const grPt = (u) => { const p = GRA.seam(u); return { x: M.MCPX.lx(p.x), y: M.MCPX.ly(p.y) }; };
function castAt(x, key, lx, ly, h, flip) { const P = M.PCDG; if (P && P.has(key)) { const c = P.bodyFrame(key, 'idle', 0, '', 2); if (c) { x.save(); x.translate(Math.round(lx), Math.round(ly)); if (flip) x.scale(-1, 1); x.imageSmoothingEnabled = false; x.drawImage(c, -c.cx, -c.footY, c.width, c.height); x.restore(); return; } } K.SP(x, key, lx, ly, h, flip); }
MINI.granny = { title: '裁缝老太', img: 'old', col: C.violet, text: '她能把一名部队缝进你的影子里，让你的伤口合上。针脚越齐，伤好得越快。',
  init(mg) { mg.marks = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87].map(u => ({ u, ok: 0, gone: 0 })); mg.good = 0; },
  cards(mg) { const R = this.run.roster.slice(0, 8), n = R.length; return R.map((u, i) => { const ax = Math.round(150 + (i - (n - 1) / 2) * 27); return { u, ax, x: M.MCPX.lx(ax), y: M.MCPX.ly(72) }; }); },
  down(mg, px, py) {
    if (mg.phase === 'select') { const c = MINI.granny.cards.call(this, mg).find(c => Math.abs(px - c.x) < 50 && Math.abs(py - c.y) < 70); if (c) { mg.pick = c.u; mg.pickAx = c.ax; this.run.roster = this.run.roster.filter(u => u !== c.u); S.mini('granny', 'snip'); SHW.later(mg, 0.15, () => S.mini('granny', 'thread')); const sl = grSlot(); if (sl) sl.burst('thread', c.ax, 56, 10, { sp: 24, life: 0.9 }); this.fx.kick(2); this.miniSet('thread'); } return; }
    if (mg.phase === 'sew') return MINI.granny.stitch.call(this, mg);
    // 点空白：墙上的影子抖一下、飘一粒布屑
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); mg.shake = mg.t; const sl = grSlot(); if (sl) sl.burst('thread', M.MCPX.ax(px), M.MCPX.ay(py), 2, { sp: 8, life: 1 }); } },
  stitch(mg) { const u = cl(mg.pt / 4, 0, 1); let best = null, bd = 0.035; mg.marks.forEach(m => { if (m.ok || m.gone) return; const d = Math.abs(m.u - u); if (d < bd) { bd = d; best = m; } }); const p = grPt(u), sp = GRA.seam(u), sl = grSlot(); mg.stabT = mg.t;
    if (best) { best.ok = 1; best.okT = mg.t; mg.good++; S.mini('granny', 'stitch', mg.good); M.MCPX.npcAct('ShadowSeamstress', 'attack'); const bp = GRA.seam(best.u); if (sl) { sl.burst('glint', bp.x, bp.y, 3, { sp: 14, life: 0.5 }); sl.burst('thread', bp.x, bp.y, 6, { sp: 26, life: 0.8 }); sl.burst('spark', bp.x, bp.y, 4, { sp: 30, life: 0.4, floor: 148 }); } mg.threadF = 1;
      this.fx.ring(p.x, p.y, 12, 70, C.violet, 4, 0.25); combo(this, mg, p.x, p.y - 80, bd < 0.012 ? 'PERFECT' : bd < 0.024 ? 'GREAT' : 'GOOD'); if (best === mg.marks[5]) SHW.calm(mg); }
    else { S.mini('granny', 'miss'); M.MCPX.npcAct('ShadowSeamstress', 'hurt'); mg.miss = (mg.miss || 0) + 1; mg.knots = (mg.knots || []).concat([{ u, t: mg.t }]); if (sl) sl.burst('thread', sp.x, sp.y, 8, { sp: 10, life: 0.6 }); this.fx.kick(3); miss(this, mg, p.x, p.y - 80); } },
  path(u) { return grPt(u); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sew') { MINI.granny.stitch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献出一名部队', sub: this.run.roster.length ? '一名部队 · 领袖回复生命' : '你没有部队', gold: 1, dis: !this.run.roster.length, why: '你没有部队', fn: () => this.miniSet('select') }, { t: '离开', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }];
    if (mg.phase === 'select') return [{ t: '算了', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }]; if (mg.phase === 'sew') return [{ t: '下针', sub: '空格 / 点击', gold: 1, fn: () => MINI.granny.stitch.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.threadF = Math.max(0, (mg.threadF || 0) - dt * 4);
    if (mg.phase === 'thread' && mg.pt > 1.2) { this.miniSet('sew'); K.how(this, mg, { kbm: '针走到大头针上时点击或按 [空格]', touch: '{tap} 针走到大头针上时点画面' }); }
    if (mg.phase === 'close') return MINI.granny.close.call(this, mg);
    if (mg.phase !== 'sew') return; const u = cl(mg.pt / 4, 0, 1), last = mg.marks[5];
    mg.marks.forEach(m => { if (!m.ok && !m.gone && u > m.u + 0.035) { m.gone = 1; const p = grPt(m.u); miss(this, mg, p.x, p.y - 80); if (m === last) SHW.calm(mg); } });
    // 最后一针：聚光罩住它；前五针全中就是超级听牌
    if (!mg.reached && u > last.u - 0.12 && mg.marks.every(m => m === last || m.ok || m.gone)) { mg.reached = 1; const p = grPt(last.u); SHW.reach(this, mg, { x: p.x, y: p.y, r: 110, lv: mg.good === 5 ? 2 : 1 }); }
    if (mg.pt > 4.1) { SHW.calm(mg); this.miniSet('close'); mg.lit = 0; } },
  // 缝完：纸样沉进影子，落了针的针脚一个接一个亮（一拍比一拍强）→ 卡帧 → 影子吸一口气 → 评级 → 治疗飞进生命条
  close(mg) { const ok = mg.marks.filter(m => m.ok), step = 0.2, sl = grSlot();
    mg.sunk = cl(mg.pt / 0.6, 0, 1);
    const k = Math.floor((mg.pt - 0.3) / step); if (k >= 0 && k < ok.length && k >= mg.lit) { mg.lit = k + 1; const m = ok[k], p = grPt(m.u); m.lightT = mg.t; S.mini('granny', 'light', k); this.fx.flash('#ffffff', 0.06 + k * 0.03); this.fx.kick(1 + k); if (sl) sl.burst('glint', GRA.seam(m.u).x, GRA.seam(m.u).y, 2 + k, { sp: 16, life: 0.6 }); }
    const tEnd = 0.3 + ok.length * step + 0.1; if (mg.pt > tEnd && !mg.closed) { mg.closed = 1; if (mg.good === 6) { S.mini('granny', 'whole'); M.MCPX.npcAct('ShadowSeamstress', 'skill'); } SHW.hitstop(mg, 0.15, CX, SY + 250, () => { mg.breathT = mg.t; MINI.granny.pay.call(this, mg); }); } },
  pay(mg) { const pct = 0.15 + mg.good * 0.06, v = Math.round(M.heroMaxHp(this.run.hero, this.meta) * pct), gr = mg.good >= 6 ? 'S' : mg.good === 5 ? 'A' : mg.good >= 3 ? 'B' : 'C'; this.miniSet('end');
    // 回血总是有的，C 也走小中
    payout(this, mg, { grade: gr, tier: Math.max(1, GT[gr]), x: SX + SW - 220, y: FLOOR - 160, gx: CX - 120, gy: SY + 280, col: C.lime, v, heal: pct, tx: M.DB[mg.pick.type].n + ' 被缝进了你的影子。' + mg.good + ' / 6 针落在点上，回复 ' + v + ' 生命。', tc: mg.good >= 5 ? '#9ccc6a' : '#d0a0ff' }); },
  draw(x, mg) {
    const t = mg.t, ph = mg.phase, sewing = ph === 'sew' || ph === 'thread' || ph === 'close' || ph === 'end', cards = ph === 'idle' || ph === 'select' ? MINI.granny.cards.call(this, mg) : [];
    const hov = ph === 'select' ? cards.findIndex(c => Math.abs(mg.mx - c.x) < 50 && Math.abs(mg.my - c.y) < 70) : -1;
    const breath = mg.breathT != null ? Math.max(0, Math.sin(cl((t - mg.breathT) / 0.9, 0, 1) * Math.PI)) : 0, shk = mg.shake != null && t - mg.shake < 0.3 ? Math.sin((t - mg.shake) * 60) * 0.6 : 0;
    const u = ph === 'sew' ? cl(mg.pt / 4, 0, 1) : ph === 'close' || ph === 'end' ? 1 : 0;
    K.pxr(x, 'mini_granny', 0, 0, mg.t, { phase: sewing ? 'sew' : 'select', u, marks: mg.marks, cards: cards.map((c, i) => ({ ax: c.ax, hov: i === hov })), breath: breath + shk, sunk: mg.sunk || 0, thread: mg.threadF, knots: mg.knots }, 'mc_granny');
    // 布样上绣着部队的像
    cards.forEach((c, i) => castAt(x, c.u.type, c.x + (i === hov ? 4 : 0), M.MCPX.ly(84), 64));
    // 穿线：选中的布样飞上墙，一根发光的紫线从它飞进针眼
    if (ph === 'thread') { const q = eo(cl(mg.pt / 0.8, 0, 1)), sx = M.MCPX.lx(mg.pickAx || 150) + (CX - M.MCPX.lx(mg.pickAx || 150)) * q, sy = M.MCPX.ly(70) + (M.MCPX.ly(80) - M.MCPX.ly(70)) * q; x.save(); x.globalAlpha = 1 - q * 0.7; castAt(x, mg.pick.type, sx, sy + 40, 64); x.restore();
      const n0 = grPt(0); for (let i = 0; i < 16; i++) { const k = i / 16, w = cl(mg.pt / 1.1, 0, 1); if (k > w) break; K.R(x, Math.round(sx + (n0.x - sx) * k), Math.round(sy + (n0.y - sy) * k - Math.sin(k * Math.PI) * 60), 6, 6, C.violet); } }
    // 老太（像素人物做好之前是剪影）和领袖
    MINI.granny.npc(x, mg); M.MCPX.cast(x, heroSp(this), 262, 148, 'idle', t, true);
    if (sewing) U.text(x, mg.good + ' / 6', CX, SY + 170, T.num, C.violet, { num: true, outline: true });
    if (ph === 'select') K.sign(x, '选一名部队', CX, SY + 150, { kind: 'wine', size: T.title });
  },
  npc(x, mg) { if (M.MCPX.npcDraw(x, 'ShadowSeamstress', 40, 148, mg.t, false, mg)) return; const bob = mg.stabT != null && mg.t - mg.stabT < 0.15 ? 1 : 0, ax = 40, feet = 148, px = (a, b, c) => { x.fillStyle = U.pal(c); x.fillRect(M.MCPX.lx(a), M.MCPX.ly(b), 4, 4); };
    for (let k = 0; k < 28; k++) { const y = feet - 1 - k + (k > 12 ? bob : 0), q = k / 28, off = q > 0.55 ? Math.round((q - 0.55) * 12) : 0; let hw = q > 0.84 ? 3 : q > 0.78 ? 2 : 6 - q * 2; for (let d = -Math.round(hw); d <= Math.round(hw); d++) px(ax + d + off, y, d === Math.round(hw) ? '#ffb860' : '#12101e'); } },
};

// ═════════════════════ 许愿井 · hold to throw a coin ═════════════════════
// 硬币、水花、井里的月光和回应的光柱都画在舞台里（同一套灯光）；蓄力计是领袖身边刻槽的石柱
const WLA = M.MCPX.WELL, WX = M.MCPX.lx(WLA.x), WY = M.MCPX.ly(WLA.mouth), wlSlot = () => M.MCPX.slot('mini_well', 'mc_well');
const wlTraj = (s, q) => { const hx = M.MCPX.lx(WLA.hero), tx = hx + 60 + (WX - hx - 60) * (0.35 + s * 0.8) * q, h = 220 + s * 160; return { x: tx, y: FLOOR - 190 - Math.sin(q * Math.PI) * h + q * (WY - 40 - (FLOOR - 190)) }; };
MINI.well = { title: '许愿井', img: 'well', col: C.teal, text: '井底有东西在回应你的脚步声。硬币扔得越准，回应越慷慨。',
  init(mg) { mg.throws = 0; mg.max = 2; mg.got = []; mg.band = 0.45 + rnd() * 0.3; mg.pow = 0; },
  down(mg, px, py) { if (mg.phase === 'ready') { this.miniSet('charge'); S.mini('well', 'charge', 0); return; }
    // 点空白：草丛里一闪、一声轻响
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); const sl = wlSlot(); if (sl) sl.burst('firefly', M.MCPX.ax(px), Math.max(120, M.MCPX.ay(py)), 2, { sp: 10, life: 1.4 }); S.mini('well', 'flick'); } },
  // 松手那一刻准头就定了：先给手感章，结果在落水时端出来
  up(mg) { if (mg.phase === 'charge') { mg.shot = mg.pow; mg.acc = 1 - Math.abs(mg.shot - mg.band) / 0.32; mg.slo = 0; mg.relT = mg.t; this.miniSet('fly'); S.mini('well', 'toss'); S.mini('well', 'flick'); const sx = SX + 344, sy = FLOOR - 400;
      const sl = wlSlot(); if (sl) sl.burst(mg.acc > 0.8 ? 'glint' : 'spark', WLA.meter[0] + 4, WLA.meter[1] + WLA.meter[3] * (1 - mg.shot), mg.acc > 0.8 ? 6 : 3, { sp: 18, life: 0.5, floor: 148 });
      if (mg.acc > 0.2) combo(this, mg, sx, sy, mg.acc > 0.8 ? 'PERFECT' : mg.acc > 0.5 ? 'GREAT' : 'GOOD'); else miss(this, mg, sx, sy); } },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.throws >= mg.max; return [{ t: '拿出一枚硬币', sub: mg.pay + ' 积分 · 扔得越准回应越好', how: { kbm: '按住鼠标或 [空格] 蓄力，松手扔出', touch: '{hold} 按住画面蓄力，松手扔出' }, howWait: 1, gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '井水平静了' : '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; mg.throws++; mg.band = 0.4 + rnd() * 0.38; this.miniSet('ready'); } }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.got.length ? '井底回应了你：' + mg.got.join('；') + '。' : '你没有许愿。', mg.got.length ? '#6fd0ff' : '#8d8496') }]; }
    if (mg.phase === 'ready' || mg.phase === 'charge') return [{ t: '按住空格 / 鼠标蓄力', sub: '在金色区域松手', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'charge') { const q = (mg.pt / 1.1) % 2; mg.pow = q < 1 ? q : 2 - q; if (Math.floor(mg.pt * 10) !== mg.tk) { mg.tk = Math.floor(mg.pt * 10); S.mini('well', 'charge', mg.pow); } }
    if (mg.phase === 'fly') {
      // 扔得准：硬币快到水面时放慢；准到正中还压暗、聚光罩住井口
      if (!mg.slo && mg.acc > 0.5 && mg.pt > (mg.acc > 0.8 ? 0.68 : 0.74)) { mg.slo = 1; SHW.slowmo(mg, mg.acc > 0.8 ? 0.35 : 0.55, mg.acc > 0.8 ? 0.7 : 0.4); if (mg.acc > 0.8) SHW.reach(this, mg, { x: WX, y: WY - 60, r: 180 }); }
      if (mg.pt > 0.95) MINI.well.land.call(this, mg); }
    if (mg.phase === 'answer') { const q0 = mg.om.q; omen(this, mg, mg.om, WX, WY - 20); if (mg.om.q != null && mg.om.q !== q0) { S.mini('well', 'rise', mg.om.q); const sl = wlSlot(); if (sl) sl.burst('firefly', WLA.x, 60, 4, { sp: 16, life: 1.6, w: 20, h: 40 }); }
      if (mg.pt > mg.om.at + mg.om.dur + 0.1 && !mg.held) { mg.held = 1; SHW.hitstop(mg, 0.15, WX, WY - 60, () => { mg.held = 0; MINI.well.pay.call(this, mg); }); } }
    if (mg.phase === 'miss' && mg.pt > 0.4) this.miniSet('idle');
    // 余韵：回应之后萤火虫绕着井口飞一会儿
    if (mg.after && mg.t - mg.after < 3) { const sl = wlSlot(); if (sl && rnd() < 0.15) sl.burst('firefly', WLA.x + (rnd() - 0.5) * 50, 70 + rnd() * 30, 1, { sp: 8, life: 2 }); }
  },
  land(mg) { const acc = mg.acc, run = this.run; let tx, col, g = [], tier = 0;
    if (acc > 0.8) { g.push(rnd() < 0.5 ? K.bp(null, 1) : K.item(run, mg.P)); tx = '正中井心！金光从井底涌上来'; col = '#ffcc33'; tier = 3; }
    else if (acc > 0.5) { g.push({ k: 'wallet', v: mg.pay * 2 }, { k: 'vision', v: 1 }); tx = '扑通。井水映出了前面的路，还吐出双倍积分'; col = '#6fd0ff'; tier = 2; }
    else if (acc > 0.2) { g.push({ k: 'rsup', v: 20 }); tx = '硬币擦着井沿掉了进去，捞上来一袋物资'; col = '#caa84a'; tier = 1; }
    else { tx = '硬币弹在井沿上，滚走了'; col = '#8d8496'; }
    mg.res = { g, tx, col, tier }; mg.splT = mg.t; const sl = wlSlot();
    if (!tier) { S.mini('well', 'miss'); SHW.lose(this, mg); mg.got.push(tx); this.miniSay(tx, col); if (sl) sl.burst('spark', WLA.x - 34, WLA.mouth - 2, 8, { sp: 30, life: 0.5, floor: 148 }); this.fx.kick(2); this.miniSet('miss'); return; }
    S.mini('well', 'splash'); if (sl) { sl.burst('water', WLA.x, WLA.mouth, 10 + tier * 6, { sp: 40 + tier * 12, ang: 0, spread: 0.9, life: 0.9, floor: WLA.mouth + 2 }); sl.burst('glint', WLA.x, WLA.mouth, 3 + tier, { sp: 20, life: 0.6 }); } this.fx.kick(2 + tier);
    // 井的回应：水面先亮品质色，越好亮得越久，正中还可能升格
    mg.om = { path: tier === 3 ? SHW.omenPath(3) : [tier - 1], at: 0.05, dur: [0, 0.3, 0.5, 1.0][tier] }; this.miniSet('answer'); },
  pay(mg) { const r = mg.res, wv = r.g.find(o => o.k === 'wallet'); this.miniSet('paid'); mg.after = mg.t;
    payout(this, mg, { grade: ['C', 'B', 'A', 'S'][r.tier], tier: r.tier, x: WX, y: WY - 60, gx: CX - 150, gy: SY + 250, col: SHW.QC(mg.om.q), v: wv && wv.v, gains: r.g,
      snd: () => { if (r.tier === 3) S.mini('well', 'great'); else if (r.tier === 2) S.mini('well', 'ok'); this.miniSay(r.tx, r.col, r.tier >= 3); },
      done: (got) => { mg.got.push(r.tx + (got.length ? '（' + got.join('、') + '）' : '')); this.miniSet('idle'); } }); },
  draw(x, mg) {
    const t = mg.t, ph = mg.phase, ans = (ph === 'answer' || ph === 'paid') && mg.om && mg.om.q != null, ak = ans ? (ph === 'paid' ? Math.max(0, 1 - mg.pt / 2) : omK(mg, mg.om)) : 0;
    // the coin: along its arc (thrown), bouncing off the rim (missed), or spinning faster in the hand as the charge rises
    let coin = null; if (ph === 'fly') { const q = cl(mg.pt / 0.95, 0, 1), p = wlTraj(mg.shot, q); coin = { x: M.MCPX.ax(p.x), y: M.MCPX.ay(p.y), spin: mg.pt * 18, glow: mg.slo ? 1 : 0 }; }
    else if (ph === 'miss') { const q = cl(mg.pt / 0.4, 0, 1); coin = { x: WLA.x - 33 - q * 65, y: WLA.mouth - 10 - Math.sin(q * Math.PI) * 20 + q * 15, spin: q * 9 }; }
    else if (ph === 'charge' || ph === 'ready') coin = { x: WLA.hero + 10, y: 116, spin: t * (4 + mg.pow * 22) };
    K.pxr(x, 'mini_well', 0, 0, mg.t, { band: mg.band, pow: ph === 'charge' || ph === 'ready' ? mg.pow : 0, preview: ph === 'charge', q: ans ? mg.om.q : null, col: ak, coin, splT: mg.splT, tier: mg.res && mg.res.tier }, 'mc_well');
    M.MCPX.cast(x, heroSp(this), WLA.hero, 148, 'idle', t);
    if (ph === 'ready' || ph === 'charge') K.sign(x, ph === 'ready' ? '按住蓄力' : '松手！', M.MCPX.lx(WLA.meter[0] + 4), M.MCPX.ly(WLA.meter[1]) - 40, { kind: ph === 'ready' ? 'indigo' : 'gold', size: T.body });
    for (let i = 0; i < mg.max; i++) K.IC(x, 'e_coin', SX + 80 + i * 50, SY + 130, 40 * (i < mg.max - mg.throws ? 1 : 0.5));
  } };

// ═════════════════════ 迷路的孩子 · follow the footprints ═════════════════════
// 下雪的白桦林：小路在中景分岔，脚印是雪地上压实的小坑，真的一边顺着她的灯光亮一下；走的时候镜头往前推
const CHA = M.MCPX.CHILD, chSlot = () => M.MCPX.slot('mini_child', 'mc_child');
MINI.child = { title: '迷路的孩子', img: 'child', col: C.butter, text: '她提着灯走在前面。每到岔口，她的脚印只亮一下。',
  init(mg) { mg.j = 0; mg.ok = 0; mg.ans = [0, 1, 2].map(() => rnd() < 0.5 ? 0 : 1); mg.walk = 0; },
  // 她站在岔口；走丢一次就远一截、灯暗一档
  girl(mg) { const lost = mg.j - mg.ok, fade = mg.phase === 'end' && mg.ok < 2 ? cl(1 - mg.pt / 0.5, 0, 1) : 1; return { ax: 150, ay: 124 - lost * 7, h: Math.max(12, 20 - lost * 3), lk: Math.max(0.15, 1 - lost * 0.3) * fade, x: M.MCPX.lx(150), y: M.MCPX.ly(124 - lost * 7) - 40 }; },
  choose(mg, d) { if (mg.phase !== 'choose') return; const ok = d === mg.ans[mg.j], dx = CX + (d ? 300 : -300), sl = chSlot(); mg.last = ok; SHW.calm(mg); mg.pickT = mg.t; mg.pickSide = d;
    if (sl) sl.burst('snow', 150 + (d ? 40 : -40), 130, 8, { sp: 20, ang: 0, spread: 1.5, life: 1 });
    if (ok) { mg.ok++; S.mini('child', 'step', mg.ok); this.miniSay('灯光近了一点', '#ffe08a'); combo(this, mg, dx, SY + 170, mg.pt < 0.7 ? 'PERFECT' : mg.pt < 1.5 ? 'GREAT' : 'GOOD'); mg.walked = { side: d, t: mg.t };
      for (let i = 0; i < 6; i++) SHW.later(mg, 0.05 + i * 0.07, () => S.mini('child', 'step', mg.ok + i * 0.34)); }
    else { S.mini('child', 'wrong'); M.MCPX.npcAct('LanternGirl', 'hurt'); this.miniSay('她的灯更远了……', '#8d8496'); miss(this, mg, dx, SY + 170); mg.gustT = mg.t; if (sl) sl.burst('snow', 300, 90, 40, { sp: 70, ang: -Math.PI / 2, spread: 0.4, life: 1.2, h: 60 }); }
    mg.j++; this.miniSet(mg.j >= 3 ? 'end' : 'walk'); },
  key(mg, k, down) { if (!down || mg.phase !== 'choose') return; if (k === 'left') { MINI.child.choose.call(this, mg, 0); return true; } if (k === 'right') { MINI.child.choose.call(this, mg, 1); return true; } },
  down(mg, px, py) { if (mg.phase === 'choose') return MINI.child.choose.call(this, mg, px < CX ? 0 : 1);
    // 点空白：雪地上一个小坑、几片雪扬起
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); const sl = chSlot(); if (sl) sl.burst('snow', M.MCPX.ax(px), Math.max(100, M.MCPX.ay(py)), 5, { sp: 14, ang: 0, spread: 1.2, life: 0.8 }); S.mini('child', 'crunch'); } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '带她回家', sub: '免费 · 跟对了有谢礼', gold: 1, how: { kbm: '记住亮起的脚印，按 [←][→] 选岔口', touch: '{tap} 记住亮起的脚印，点左边或右边' }, fn: () => this.miniSet('walk') }, { t: '无视', leave: 1, fn: () => this.miniFinish('她一直看着你走远。', '#8d8496') }]; if (mg.phase === 'choose') return [{ t: '← 左边', fn: () => MINI.child.choose.call(this, mg, 0) }, { t: '右边 →', fn: () => MINI.child.choose.call(this, mg, 1) }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'walk') { mg.walk += dt; if (!mg.moving) { mg.moving = 1; M.MCPX.npcAct('LanternGirl', 'move'); } if (mg.pt > 1.3) { mg.moving = 0; M.MCPX.npcAct('LanternGirl', 'idle'); this.miniSet('prints'); mg.walked = null; M.MCPX.npcAct('LanternGirl', 'attack'); } if (Math.floor(mg.pt * 3) !== mg.stp) { mg.stp = Math.floor(mg.pt * 3); S.mini('child', 'crunch'); } }
    // 前两个岔口都走对：最后一个岔口压暗、聚光、心跳
    if (mg.phase === 'prints') { if (!mg.reached && mg.j === 2 && mg.ok === 2) { mg.reached = 1; SHW.reach(this, mg, { x: CX, y: SY + 480, r: 380 }); } if (mg.pt > 1.0 + mg.j * 0.15) this.miniSet('choose'); }
    if (mg.phase === 'end') { const gp = MINI.child.girl(mg);
      // 走到头：她的灯先亮品质色（三步全对可能升格），她把你带到一棵空心老树前，树洞亮起来；走丢了一拍带过
      if (!mg.endGo) { mg.endGo = 1; M.MCPX.npcAct('LanternGirl', mg.ok >= 2 ? 'skill' : 'death'); if (mg.ok >= 2) mg.om = { path: mg.ok === 3 ? SHW.omenPath(3) : [1], at: 0.1, dur: mg.ok === 3 ? 0.8 : 0.35 }; if (mg.ok === 3) SHW.reach(this, mg, { x: M.MCPX.lx(214), y: M.MCPX.ly(125), r: 200, label: '' }); }
      if (mg.om) omen(this, mg, mg.om, M.MCPX.lx(214), M.MCPX.ly(125));
      const due = mg.ok === 3 ? 1.05 : mg.ok === 2 ? 0.5 : 0.1;
      if (mg.pt > due && !mg.held) { mg.held = 1; if (mg.ok >= 2) SHW.hitstop(mg, 0.15, M.MCPX.lx(214), M.MCPX.ly(125), () => MINI.child.pay.call(this, mg)); else MINI.child.pay.call(this, mg); } }
  },
  pay(mg) { if (mg.fin) return; mg.fin = true; let tx, col, g = [], gr, ev; const hx = M.MCPX.lx(214), hy = M.MCPX.ly(125);
    if (mg.ok === 3) { g.push({ k: 'rsup', v: 30 }, K.item(this.run, mg.P)); tx = '她把你带到一个藏东西的地方，回头笑了笑，不见了。'; col = '#9ccc6a'; gr = 'S'; ev = 'found'; }
    else if (mg.ok === 2) { g.push({ k: 'rsup', v: 20 }); tx = '走丢了一次，但最后还是找到了她的家。门口放着一袋东西。'; col = '#caa84a'; gr = 'B'; ev = 'found'; }
    else if (mg.ok === 1) { tx = '一转身她就不见了。'; col = '#8d8496'; gr = 'C'; ev = 'lost'; }
    else { tx = '你迷路了。你总觉得背后有人。生命 -' + this.heroHurt(0.08) + '。'; col = '#d0453c'; gr = 'C'; ev = 'lost'; }
    mg.after = mg.ok >= 2 ? mg.t : null; payout(this, mg, { grade: gr, tier: GT[gr], x: hx, y: hy, gx: CX - 330, gy: SY + 260, col: mg.om ? SHW.QC(mg.om.q) : C.butter, gains: g, tx, tc: col, snd: () => S.mini('child', ev) }); },
  draw(x, mg) {
    const t = mg.t, ph = mg.phase, fork = ph === 'prints' || ph === 'choose', gp = MINI.child.girl(mg), real = mg.ans[Math.min(2, mg.j)];
    const vis = ph === 'prints' ? cl(1 - (mg.pt - 0.5) / 0.5, 0, 1) : 0, decoy = 0.15 + mg.j * 0.12;
    const hollow = ph === 'end' && mg.ok >= 2 ? cl(mg.pt / 0.4, 0, 1) : 0, hc = mg.om && mg.om.q != null ? SHW.QC(mg.om.q) : null;
    const o = { girl: { x: 150, y: gp.ay, lk: gp.lk }, prints: fork ? { real, vis, decoy } : { real, vis: 0, decoy: 0 }, walked: mg.walked ? { side: mg.walked.side, k: cl((t - mg.walked.t) / 0.5, 0, 1) } : null, hollow, hollowC: hollow > 0 ? hc : null };
    // 走：镜头往岔口推近一截，新的岔口出来时一下拉回
    const push = ph === 'walk' ? eio(cl(mg.pt / 1.3, 0, 1)) * 0.14 : 0; x.save(); if (push) { const fx = M.MCPX.lx(150), fy = M.MCPX.ly(124); x.translate(fx, fy); x.scale(1 + push, 1 + push); x.translate(-fx, -fy); }
    K.pxr(x, 'mini_child', 0, 0, mg.t, o, 'mc_child');
    if (!(ph === 'end' && mg.ok < 2 && mg.pt > 0.5)) MINI.child.npc(x, mg, gp);
    x.restore();
    M.MCPX.cast(x, heroSp(this), 64, 170, ph === 'walk' ? 'move' : 'idle', t);
    if (mg.gustT != null && t - mg.gustT < 0.5) { const q = (t - mg.gustT) / 0.5; x.save(); x.globalAlpha = 0.25 * (1 - q); K.R(x, SX, SY, SW, SH, '#bff7f0'); x.restore(); }
    if (ph === 'choose') K.sign(x, '她往哪边走了？', CX, SY + 140, { kind: 'wine', size: T.btn });
    for (let i = 0; i < 3; i++) K.pip(x, SX + 90 + i * 40, SY + 140, 24, i < mg.j ? (i < mg.ok ? C.butter : C.slate) : null);
  },
  // 她（像素人物做好之前是剪影）：红兜帽的尖、比头还大的提灯
  npc(x, mg, gp) { if (M.MCPX.npcDraw(x, 'LanternGirl', 150, gp.ay, mg.t, false, mg)) return; const ax = 150, feet = gp.ay, h = gp.h, px = (a, b, c) => { x.fillStyle = U.pal(c); x.fillRect(M.MCPX.lx(a), M.MCPX.ly(b), 4, 4); }, bob = Math.round(Math.sin(mg.t * 3) * 0.5 + 0.5);
    for (let k = 0; k < h; k++) { const q = k / h, hw = q > 0.9 ? 1 : q > 0.7 ? 3 : 2 + (1 - q) * 2; for (let d = -Math.round(hw); d <= Math.round(hw); d++) px(ax + d, feet - 1 - k, q > 0.62 ? (d === -Math.round(hw) ? '#ff7e68' : '#aa262e') : '#12101e'); }
    if (gp.lk > 0.05) { x.save(); x.globalAlpha = Math.min(1, gp.lk + 0.2); px(ax + 4, feet - Math.round(h * 0.5) + bob, '#ffcf4a'); px(ax + 4, feet - Math.round(h * 0.5) + 1 + bob, '#fff3b0'); x.restore(); } },
};

// ═════════════════════ 无名墓碑 · dig before the candle dies ═════════════════════
// 山坡上的墓园；碑顶的蜡烛是计时器也是唯一的暖光——越烧越短、光圈越小、雾越浓。每挖过四分之一是一次「破层」
const GVA = M.MCPX.GRAVE, gvSlot = () => M.MCPX.slot('mini_grave', 'mc_grave'), PIT = { x: M.MCPX.lx(160), y: M.MCPX.ly(154) };
MINI.grave = { title: '无名墓碑', img: 'tomb', col: C.lavender, text: '墓碑上没有名字，土是新翻的。蜡烛烧完之前挖到底。',
  init(mg) { mg.need = 14 + Math.floor(rnd() * 7) - Math.round(mg.luck * 10); mg.dig = 0; mg.burn = 5.2; mg.sw = 0; },
  shovel(mg) { if (mg.phase !== 'dig') return; mg.dig++; mg.sw = 1; S.mini('grave', 'dig', mg.dig / mg.need); this.fx.kick(3); const sl = gvSlot();
    if (sl) { sl.burst('dirt', 150 + rnd() * 20, 152, 5, { sp: 60, ang: 0.9, spread: 0.7, life: 1.1, floor: 150 }); sl.burst('spark', 108, 152, 1, { sp: 30, life: 0.3, floor: 152 }); }
    // 破层：每挖过四分之一深度一声闷响、一大把土、震屏
    const layer = Math.floor(mg.dig / mg.need * 4); if (layer > (mg.layer || 0) && mg.dig < mg.need) { mg.layer = layer; S.mini('grave', 'break', layer); this.fx.kick(6 + layer * 2); if (sl) sl.burst('dirt', 160, 158, 14, { sp: 80, ang: 0.3, spread: 1.6, life: 1.2, floor: 150 }); SHW.shake(mg, 4 + layer * 2); }
    // 连击看手速：两铲间隔越短越高
    const gap = mg.t - (mg.lastDig == null ? -9 : mg.lastDig); mg.lastDig = mg.t; combo(this, mg, CX + 210, FLOOR - 190, gap < 0.13 ? 'PERFECT' : gap < 0.2 ? 'GREAT' : 'GOOD');
    if (mg.dig >= mg.need) { this.miniSet('coffin'); S.mini('grave', 'coffin'); MINI.grave.open.call(this, mg); } },
  // 挖到底：按剩下的烛火评级；棺材里是什么这一刻就定了（概率同原来）
  open(mg) { const lf = mg.burn / 5.2, gr = lf >= 0.45 ? 'S' : lf >= 0.25 ? 'A' : lf >= 0.1 ? 'B' : 'C'; SHW.calm(mg); SHW.grade(this, mg, gr, CX - 330, SY + 250); this.fx.explode(PIT.x, PIT.y + 60, C.tan || C.gold, 0.6);
    mg.treasure = rnd() < 0.5 + mg.luck;
    // 铁锹「咚」地碰到木头：卡帧，看见棺材盖
    SHW.hitstop(mg, 0.15, PIT.x, PIT.y + 40);
    if (mg.treasure) { mg.om = { path: SHW.omenPath(3), at: 0.35, dur: 0.9 }; SHW.later(mg, 0.3, () => { S.mini('grave', 'lid'); SHW.reach(this, mg, { x: PIT.x, y: PIT.y + 60, r: 190, label: '' }); }); } },
  down(mg, px, py) { if (mg.phase === 'dig') return MINI.grave.shovel.call(this, mg);
    // 挖之前点空白：墓碑前的土抖一下
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); const sl = gvSlot(); if (sl) sl.burst('dirt', M.MCPX.ax(px), Math.max(146, M.MCPX.ay(py)), 3, { sp: 20, ang: 0, spread: 1, life: 0.6, floor: 150 }); } },
  key(mg, k, down) { if (k === 'act' && down) { MINI.grave.shovel.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '挖开', sub: '免费 · 棺材里有东西', gold: 1, how: {kbm: '狂点鼠标或连按 [空格]', touch: '{tap} 狂点画面'}, fn: () => { this.miniSet('dig'); S.mini('grave', 'candle'); } }, { t: '默哀', sub: '物资 +15', leave: 1, fn: () => this.miniFinish('你站了一会儿。墓碑后面有人留下了东西。', '#caa84a', [{ k: 'rsup', v: 15 }]) }]; if (mg.phase === 'dig') return [{ t: '挖！', gold: 1, fn: () => MINI.grave.shovel.call(this, mg) }]; return []; },
  tick(mg, dt) {
    mg.sw = Math.max(0, mg.sw - dt * 6);
    if (mg.phase === 'dig') { mg.burn -= dt; const near = mg.dig / mg.need, per = 0.8 - near * 0.5;
      if (!SHW.tense(mg) && mg.pt - (mg.hb || 0) > per) { mg.hb = mg.pt; S.heart(); }   // 听牌以后心跳交给演出工具包
      if (mg.lastDig != null && mg.t - mg.lastDig > 0.5 && SHW.state(mg).combo) SHW.comboBreak(mg);
      // 挖得差不多、蜡烛也快烧完：聚光罩住坑口；再近一步换超级（红金频闪）
      if (!mg.rl && near >= 0.6 && mg.burn < 2.2) { mg.rl = 1; SHW.reach(this, mg, { x: PIT.x, y: PIT.y, r: 210, label: '' }); }
      if (mg.rl === 1 && near >= 0.85 && mg.burn < 1.2) { mg.rl = 2; SHW.reach(this, mg, { x: PIT.x, y: PIT.y, r: 210, lv: 2, label: '听牌！' }); }
      if (mg.burn <= 0) { this.miniSet('out'); S.mini('grave', 'out'); SHW.lose(this, mg); this.heroHurt(0.05); } }
    if (mg.phase === 'out' && mg.pt > 0.4 && !mg.fin) { mg.fin = true; this.miniFinish('蜡烛灭了。黑暗里有什么东西碰了碰你的手。', '#d0453c'); }
    if (mg.phase === 'coffin' && !mg.fin) {
      if (mg.treasure) { omen(this, mg, mg.om, PIT.x, PIT.y + 60); if (mg.pt > 1.35) { mg.fin = true; const wv = M.nice(mg.P * 4); payout(this, mg, { tier: 3, x: PIT.x, y: PIT.y + 20, col: C.gold, v: wv, gains: [K.bp(null, 1), { k: 'wallet', v: wv }], tx: '棺材里躺着一张图纸，还有一枚戒指。', tc: '#ffcc33', snd: () => S.mini('grave', 'treasure') }); } }
      else if (mg.pt > 0.3) { mg.fin = true; mg.hand = mg.pt; this.miniSay('土里伸出了手！', '#d0453c', true); S.mini('grave', 'hand'); SHW.lose(this, mg); this.fx.flash('#ff2a2a', 0.2); this.fx.kick(10); const sl = gvSlot(); if (sl) sl.burst('dirt', 160, 166, 20, { sp: 90, ang: 0, spread: 1.4, life: 1, floor: 150 }); SHW.later(mg, 0.6, () => this.mini === mg && this.miniBattle('normal')); } }
  },
  draw(x, mg) {
    const t = mg.t, ph = mg.phase, dep = cl(mg.dig / mg.need, 0, 1), life = cl(ph === 'dig' ? mg.burn / 5.2 : ph === 'out' ? 0 : ph === 'idle' ? 1 : Math.max(0.05, mg.burn / 5.2), 0, 1);
    const k = ph === 'coffin' && mg.treasure ? omK(mg, mg.om) : 0, lid = ph === 'coffin' && mg.treasure ? eio(cl((mg.pt - 0.3) / 1.0, 0, 1)) : 0;
    K.pxr(x, 'mini_grave', 0, 0, mg.t, { life, dep: ph === 'coffin' ? 1 : dep, wob: ph === 'dig' ? 1 - life : 0, sw: mg.sw, coffin: ph === 'coffin', lid, coffinC: k > 0 ? SHW.QC(mg.om.q == null ? 0 : mg.om.q) : null, coffinK: k, hand: mg.hand != null ? eo(cl((t - mg.hand) / 0.25, 0, 1)) : 0 }, 'mc_grave');
    M.MCPX.cast(x, heroSp(this), GVA.hero, 152 + (mg.sw > 0.6 ? 1 : 0), 'idle', t);
    if (ph === 'dig') { U.bar(x, SX + 80, SY + 130, 320, 20, dep, { col: C.gold }); [0.25, 0.5, 0.75].forEach(v => K.R(x, SX + 80 + Math.round(320 * v) - 1, SY + 124, 3, 32, C.white)); U.text(x, '深度', SX + 240, SY + 170, T.cap, C.lavender); }
    if (ph === 'out') K.R(x, SX, SY, SW, SH, 'rgba(7,6,15,' + cl(mg.pt * 2.5, 0, 0.85) + ')');
  } };

// ═════════════════════ 废弃医务室 · pick bottles off the shelf ═════════════════════
// q：揭晓前亮的品质色（-1 毒药不亮）；金色药水的品质看抽到的道具
const MEDS = [
  { n: '绿色药水', c: C.green, d: '回血', q: 1, f(g) { return '回复 ' + g.heroHeal(0.2) + ' 生命'; } },
  { n: '蓝色药水', c: C.blue, d: '经验', q: 1, f(g, mg) { return g.giveExp(45, mg.from); } },
  { n: '金色药水', c: C.gold, d: '宝贝', q: 3, f(g, mg) { return g.award([mg.it || K.item(g.run, mg.P)], mg.from).join(''); } },
  { n: '白色药片', c: C.white, d: '物资', q: 0, f(g, mg) { return g.award([{ k: 'rsup', v: 25 }], mg.from).join(''); } },
  { n: '红色药水', c: C.red, d: '剧毒', q: -1, f(g) { S.mini('clinic', 'bad'); return '中毒 -' + g.heroHurt(0.1); } },
  { n: '紫色药水', c: C.violet, d: '部队攻击', q: 2, f(g) { g.run.runBuff.unitAtk = (g.run.runBuff.unitAtk || 0) + 0.05; S.mini('clinic', 'mult'); return '这一趟部队攻击 +5%'; } }];
const PXA = M.MCPX, CLI = PXA.CLINIC, clX = (i) => PXA.lx(CLI.x[i]), clY = PXA.ly(CLI.y);
const clSlot = () => PXA.slot('mini_clinic', 'mc_clinic');
const clHit = (mg, px, py) => mg.bt.findIndex((b, i) => !b.opened && Math.abs(px - clX(i)) < 46 && py < clY + 10 && py > clY - 150);
// liquid vapour puffs in each med's own colour ramp (PXR particles walk the ramp as they fade)
['screen', 'water', 'gold', 'bone', 'red', 'arcane'].forEach(m => { M.PXR.PK['vap_' + m] = { g: -12, drag: 1.3, puff: 1, ramp: [m, [10, 9, 8, 7, 6, 5]], grow: 4 }; });
MINI.clinic = { title: '废弃医务室', img: 'gurney', col: C.ice, text: '药柜里有六个瓶子。有两个标签被血糊住了。你最多敢试三瓶。',
  init(mg) { K.how(this, mg, { kbm: '点药瓶试喝，最多 3 瓶', touch: '{tap} 点药瓶试喝，最多 3 瓶' }, 0, 0.6); const pool = MEDS.slice().sort(() => rnd() - 0.5); mg.bt = pool.map((m, i) => ({ m, liq: MEDS.indexOf(m), dark: false, open: 0, lift: 0, sy: 1, dx: 0, dy: 0, glow: 0, lvl: 0.7 })); const dk = [0, 1, 2, 3, 4, 5].sort(() => rnd() - 0.5).slice(0, 2); dk.forEach(i => mg.bt[i].dark = true); mg.opened = 0; mg.got = []; mg.hov = -1; },
  open(mg, i) { const b = mg.bt[i]; if (!b || b.opened || mg.phase !== 'idle' || mg.opened >= 3) return; b.opened = true; mg.opened++; mg.cur = i; b.pressT = mg.t; S.mini('clinic', 'pick'); S.mini('clinic', 'hover', i);
    const sl = clSlot(); if (sl) sl.burst('dust', CLI.x[i], CLI.y - 2, 6, { sp: 14, life: 0.8, w: 10 });
    mg.it = b.m.q === 3 ? K.item(this.run, mg.P) : null; b.q = b.m.q === 3 ? (mg.it.k === 'item' ? mg.it.q || 0 : 1) : b.m.q;
    // 毒药一拍带过；好药先抖、先亮品质色（糊了标签的可能先亮低一档再升格），史诗以上还压暗聚光
    if (b.q < 0) { mg.om = null; this.miniSet('uncork'); return; }
    const path = b.dark ? SHW.omenPath(b.q) : [b.q]; mg.om = { path, at: 0.15, dur: 0.3 + b.q * 0.2 + (path.length - 1) * 0.25 }; this.miniSet('omen');
    if (b.q >= 2) SHW.reach(this, mg, { x: clX(i), y: clY - 70, r: 130, lv: b.q >= 3 ? 2 : 1, label: '' }); },
  down(mg, px, py) { if (mg.phase !== 'idle') return; const i = clHit(mg, px, py); if (i >= 0) return MINI.clinic.open.call(this, mg, i);
    // 点空白：瓷砖墙一声回响、一小撮灰落下
    SHW.tap(this, mg, px, py); const sl = clSlot(); if (sl) sl.burst('dust', PXA.ax(px), Math.min(PXA.ay(py), 140), 5, { sp: 10, life: 1.2, w: 4 }); S.mini('clinic', 'hover', 5); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '收手', leave: 1, gold: mg.opened >= 3, sub: '已试 ' + mg.opened + ' / 3', fn: () => this.miniFinish(mg.got.length ? '你试了：' + mg.got.join('；') + '。' : '你一瓶都没敢碰。', mg.got.length ? '#8fe0ff' : '#8d8496') }]; },
  tick(mg, dt) {
    const sl = clSlot();
    // 悬停：瓶子被提起一点、朝鼠标歪，一声这个瓶子自己的玻璃音
    const hv = mg.phase === 'idle' ? clHit(mg, mg.mx, mg.my) : -1; if (hv !== mg.hov) { if (hv >= 0) { S.mini('clinic', 'hover', hv); if (sl) sl.burst('glint', CLI.x[hv] - 4, CLI.y - 18, 1, { sp: 3, life: 0.4 }); } mg.hov = hv; }
    mg.bt.forEach((b, i) => { const act = i === mg.cur && (mg.phase === 'omen' || mg.phase === 'uncork') && !b.done, tgt = act ? 14 : i === hv ? 4 : 0; b.lift += (tgt - b.lift) * Math.min(1, dt * (act ? 10 : 14));
      b.dx = i === hv ? Math.sign(mg.mx - clX(i)) : 0; b.dy = 0;
      const q = b.pressT == null ? 9 : (mg.t - b.pressT) / 0.3; b.sy = q < 0.25 ? 1 - 0.1 * q / 0.25 : q < 0.6 ? 0.9 + 0.22 * eo((q - 0.25) / 0.35) : q < 1 ? 1.12 - 0.12 * eo((q - 0.6) / 0.4) : 1; });
    if (mg.phase === 'omen') { const b = mg.bt[mg.cur], q0 = mg.om.q; omen(this, mg, mg.om, clX(mg.cur), clY - 60);
      const k = omK(mg, mg.om); b.glow = k; b.gc = SHW.QC(mg.om.q == null ? 0 : mg.om.q);
      const sh = Math.round((rnd() - 0.5) * (1 + (mg.om.q || 0)) * k * 1.6); b.dx = sh; b.dy = Math.round((rnd() - 0.5) * k);
      // 糊了血的瓶子：升格那一下血痂一片片裂开掉下来
      if (b.dark) { const n = mg.om.path.length, stage = mg.om.i == null ? 0 : mg.om.i; b.crack = n > 1 ? stage / (n - 1) * 0.85 + 0.15 * k : 0.2 * k; if (sl && rnd() < 0.3 * k) sl.burst('blood', CLI.x[mg.cur] + (rnd() - 0.5) * 10, CLI.y - b.lift - 12, 1, { sp: 10, life: 0.5, floor: CLI.y }); }
      if (mg.pt > mg.om.at + mg.om.dur + 0.12 && !mg.held) { mg.held = 1; SHW.hitstop(mg, 0.15, clX(mg.cur), clY - 60, () => { mg.held = 0; this.miniSet('uncork'); }); } }
    if (mg.phase === 'uncork') { const b = mg.bt[mg.cur], bad = b.q < 0, u0 = bad ? 0.15 : 0.3, x0 = CLI.x[mg.cur], yb = CLI.y - b.lift;
      if (!b.popped && mg.pt > 0.02) { b.popped = 1; S.mini('clinic', 'pop'); if (b.dark) { b.crack = 1; b.dark = false; } if (sl) sl.burst('vap_' + LIQS[b.liq], x0, yb - 30, 10, { sp: 18, ang: 0, spread: 1.4, life: 1.1 }); }
      b.open = cl(mg.pt / u0, 0, 1);
      if (mg.pt > u0 && !b.done) { b.done = true; mg.from = { x: clX(mg.cur), y: clY - 60 }; S.mini('clinic', 'drink'); const tx = b.m.f(this, mg); mg.got.push(b.m.n + '：' + tx); this.miniSay(b.m.n + '：' + tx, b.m.c);
        if (bad) { SHW.lose(this, mg); b.sick = 1; mg.sickT = mg.t; S.mini('clinic', 'crack'); S.mini('clinic', 'fizz'); if (sl) { sl.burst('vap_screen', x0, yb - 20, 14, { sp: 22, life: 1.2 }); sl.burst('vap_arcane', x0, yb - 20, 10, { sp: 18, life: 1.2 }); sl.burst('shard', x0, yb - 12, 8, { sp: 40, life: 0.8, floor: CLI.y }); } this.fx.kick(3); }
        else { const tier = b.m.q === 3 ? Math.max(2, Math.min(4, b.q + 1)) : b.m.q === 2 ? 2 : 1, n = +(String(tx).match(/\d+/) || [0])[0], col = SHW.QC(b.q);
          if (tier >= 2) this.fx.flash('#ffffff', 0.3); if (sl) { sl.flash('all', 0.6 + tier * 0.35); sl.burst('glint', x0, yb - 16, 6 + tier * 4, { sp: 30 + tier * 10, life: 0.9 }); sl.burst(['heal', 'soul', 'glint', 'dust', 'glint', 'rune'][b.liq], x0, yb - 20, 8 + tier * 3, { sp: 16, ang: 0, spread: 1.2, life: 1.4 }); }
          SHW.win(this, mg, tier, { x: clX(mg.cur), y: clY - 90, col, v: b.m.q <= 1 ? n : 0 }); mg.hold = HOLD[tier]; mg.after = { q: b.q, t: mg.t, x: x0 }; } }
      if (b.done) { b.lvl = Math.max(0.1, (b.lvl == null ? 0.7 : b.lvl) - dt * 2); if (sl && !b.sick && rnd() < 0.4) sl.burst('bubble', x0 + (rnd() - 0.5) * 4, yb - 6, 1, { sp: 4, life: 0.6 }); }
      if (mg.pt > u0 + (bad ? 0.25 : mg.hold || 0.6)) { this.miniSet('idle'); mg.cur = -1; } }
    // 余韵：好药之后柜子里飘一会儿闪点，档位越高越多
    if (mg.after && sl && mg.t - mg.after.t < 3 && rnd() < 0.05 + 0.08 * mg.after.q) sl.burst('glint', 80 + rnd() * 140, 50 + rnd() * 70, 1, { sp: 4, life: 0.8 });
  },
  draw(x, mg) {
    K.pxr(x, 'mini_clinic', 0, 0, mg.t, mg, 'mc_clinic');
    // 图例：墙上病历表的六行字（小瓶子图标是画在纸上的）
    const [cx0, cy0] = CLI.chart; MEDS.forEach((m, r) => U.text(x, m.d, PXA.lx(cx0 + 11), PXA.ly(cy0 + 11 + Math.round(r * 7.6)), 20, r === 4 ? C.red : '#3a2c28', { align: 'left', shadow: false }));
    // 毒药：舞台染一下病绿
    if (mg.sickT != null && mg.t - mg.sickT < 0.4) { x.save(); x.globalAlpha = 0.28 * (1 - (mg.t - mg.sickT) / 0.4); K.R(x, SX, SY, SW, SH, '#6fd46a'); x.restore(); }
  } };
const LIQS = ['screen', 'water', 'gold', 'bone', 'red', 'arcane'];

// ═════════════════════ 落地镜 · repeat the reflection's moves ═════════════════════
// 旧卧室里的镀金落地镜：镜面里是左右颠倒、更冷的屋子和领袖的倒影；示范时倒影自己动，照做时倒影慢半拍才跟
const MRA = M.MCPX.MIRROR, ARW = { up: '↑', down: '↓', left: '←', right: '→' }, MRX = M.MCPX.lx(200), MRY = M.MCPX.ly(92);
const mrSlot = () => M.MCPX.slot('mini_mirror', 'mc_mirror');
// 领袖做一个动作：跳、蹲、左倾、右倾（像素角色整体位移 / 缩放，按 4 像素取整）
function heroPose(x, key, lx, ly, p, flip, t) { const P = M.PCDG; let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0; if (p) { const q = Math.sin(cl(p.t / 0.5, 0, 1) * Math.PI); if (p.d === 'up') dy = -60 * q; if (p.d === 'down') { sy = 1 - 0.3 * q; sx = 1 + 0.15 * q; } if (p.d === 'left') { dx = -36 * q; rot = -0.2 * q; } if (p.d === 'right') { dx = 36 * q; rot = 0.2 * q; } }
  if (!P || !P.has(key)) { x.save(); x.translate(lx + dx * (flip ? -1 : 1), ly + dy); x.rotate(rot * (flip ? -1 : 1)); x.scale(sx, sy); K.SP(x, key, 0, 0, 170, flip); x.restore(); return; }
  const b = P.body(key), c = P.bodyFrame(key, 'idle', Math.floor(t * 12) % b.nIdle, '', 4); x.save(); x.translate(K.snap(lx + dx * (flip ? -1 : 1)), K.snap(ly + dy)); x.rotate(rot * (flip ? -1 : 1)); x.scale(sx * (flip ? -1 : 1), sy); x.imageSmoothingEnabled = false; x.drawImage(c, -c.cx, -c.footY, c.width, c.height); x.restore(); }
MINI.mirror = { title: '落地镜', img: 'mirror', col: C.blue, text: '镜子里的你慢了半拍才动。它在示范什么——跟着做一遍。',
  init(mg) { mg.round = 0; mg.got = []; },
  begin(mg) { mg.round++; mg.seq = [...Array(3 + mg.round)].map(() => M.pick(['up', 'down', 'left', 'right'])); mg.inp = []; mg.perf = 0; mg.lastIn = 0; mg.om = null; this.miniSet('show'); },
  input(mg, d) { if (mg.phase !== 'input') return; mg.inp.push(d); mg.pose = { d, t: 0 }; const i = mg.inp.length - 1, sx = M.MCPX.lx(MRA.hero), sy = FLOOR - 250;
    if (mg.seq[i] !== d) { S.mini('mirror', 'wrong'); miss(this, mg, sx, sy); SHW.lose(this, mg); this.miniSet('fail'); return; }
    S.mini('mirror', 'tone', ['up', 'down', 'left', 'right'].indexOf(d));
    const gap = mg.pt - mg.lastIn, w = gap < 0.45 ? 'PERFECT' : gap < 0.9 ? 'GREAT' : 'GOOD'; mg.lastIn = mg.pt; if (w === 'PERFECT') mg.perf++; combo(this, mg, sx, sy, w); this.fx.ring(MRX, MRY - 30, 20, 140, C.blue, 4, 0.25); const sl = mrSlot(); if (sl) { sl.burst('glint', 200, 92, w === 'PERFECT' ? 6 : 3, { sp: 20, life: 0.6, w: 40, h: 60 }); sl.burst('ember', 170 + mg.inp.length * 12, 26, 3, { sp: 10, ang: 0, spread: 0.6, life: 0.8 }); }
    // 只差最后一个动作：聚光罩住镜子；第二轮是超级听牌
    if (mg.inp.length === mg.seq.length - 1) SHW.reach(this, mg, { x: MRX, y: MRY - 30, r: 250, lv: mg.round >= 2 ? 2 : 1 });
    if (mg.inp.length === mg.seq.length) { S.mini('mirror', 'pass'); MINI.mirror.win.call(this, mg); } },
  // 做完就定下镜子里走出什么；镜面先亮它的品质色，再端出来
  win(mg) { this.miniSet('win'); SHW.calm(mg); const sl = mrSlot(); if (sl) sl.burst('glint', 200, 92, 10, { sp: 26, life: 0.9, w: 50, h: 80 }); const run = this.run, u = M.pick(run.roster);
    mg.rw = mg.round === 1 && u && M.canAdd(run, u.type) ? { k: 'unit', type: u.type } : K.item(run, mg.P);
    const q = mg.rw.k === 'unit' ? M.DB[mg.rw.type].q || 0 : mg.rw.k === 'item' ? mg.rw.q || 0 : 0, gr = mg.perf >= mg.seq.length ? 'S' : mg.perf * 2 >= mg.seq.length ? 'A' : 'B';
    mg.rtx = mg.rw.k === 'unit' ? '另一个' + M.DB[mg.rw.type].n : mg.rw.k === 'item' ? M.ITEMS[mg.rw.key].name : '积分 +' + M.fmt(mg.rw.v);
    mg.tier = Math.max(q >= 3 ? 4 : 0, Math.min(3, (mg.round >= 2 ? 3 : 2) + (gr === 'S' ? 1 : 0))); mg.paid = false; mg.om = { path: SHW.omenPath(q), at: 0.1, dur: 0.7 }; SHW.grade(this, mg, gr, CX - 280, SY + 250); },
  key(mg, k, down) { if (down && mg.phase === 'input' && ARW[k]) { MINI.mirror.input.call(this, mg, k); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '凝视镜子', sub: '免费 · 跟对了得一名部队', gold: 1, how: { kbm: '记住它的动作，再按 [↑][↓][←][→] 做一遍', touch: '记住它的动作，再点下面的箭头做一遍' }, fn: () => MINI.mirror.begin.call(this, mg) }, { t: '打碎镜子', sub: '领袖受伤 · 镜框里的东西', danger: 1, fn: () => { this.heroHurt(0.1); S.mini('mirror', 'wrong'); this.miniFinish('碎片划伤了你。镜框里藏着东西。', '#d0453c', [K.item(this.run, mg.P)]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('你背对着镜子离开。它还在看你。', '#8d8496') }];
    if (mg.phase === 'input') return ['up', 'down', 'left', 'right'].map(d => ({ t: ARW[d], fn: () => MINI.mirror.input.call(this, mg, d) }));
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
    const t = mg.t, ph = mg.phase, [gx, gy, gw, gh] = MRA.glass, win = ph === 'win' || ph === 'won', k = ph === 'win' && mg.om && mg.om.q != null ? omK(mg, mg.om) : ph === 'won' ? 0.3 : 0;
    const lit = win ? (mg.seq ? mg.seq.length : 0) : mg.inp ? mg.inp.length : 0, crack = ph === 'fail' ? cl(mg.pt * 2.5, 0, 1) : 0;
    K.pxr(x, 'mini_mirror', 0, 0, mg.t, { moves: mg.seq ? mg.seq.length : 5, lit, ripple: ph === 'win' ? k : 0, omenK: k, omenC: k > 0 && mg.om && mg.om.q != null ? SHW.QC(mg.om.q) : null, crack }, 'mc_mirror');
    // 倒影：示范时自己做动作；照做时慢半拍才跟；做错时停住
    const key = heroSp(this), rp = mg.mpose || (ph === 'input' || win ? (mg.pose && mg.pose.t > 0.25 ? { d: mg.pose.d, t: mg.pose.t - 0.25 } : null) : null);
    x.save(); x.beginPath(); x.rect(M.MCPX.lx(gx), M.MCPX.ly(gy), gw * 4, gh * 4); x.clip(); x.globalAlpha = 0.85; heroPose(x, key, MRX, M.MCPX.ly(146), ph === 'fail' ? null : rp, true, t); x.globalAlpha = 1;
    if (ph === 'fail') { x.globalAlpha = cl(mg.pt * 2.5, 0, 0.5); K.R(x, M.MCPX.lx(gx), M.MCPX.ly(gy), gw * 4, gh * 4, C.red); } x.restore();
    if (mg.mpose && mg.mpose.t < 0.6) K.big(x, ARW[mg.mpose.d], MRX, MRY - 170, 96, C.blue, mg.mpose.t); // 示范的方向：大箭头压在镜面上沿
    heroPose(x, key, M.MCPX.lx(MRA.hero), M.MCPX.ly(148), ph === 'show' ? null : mg.pose, false, t);
    // 动作序列：顶上一排小镜片，做对的映出箭头
    if (mg.seq) { mg.seq.forEach((d, i) => { const done = mg.inp && i < mg.inp.length, bx = SX + 70 + i * 64; U.box(x, bx, SY + 110, 54, 54, done ? C.blue : C.abyss); if (!done) K.RR(x, bx, SY + 110, 54, 54, 0, null, C.blue, 3); U.text(x, done || ph === 'fail' ? ARW[d] : '?', bx + 27, SY + 137, T.btn, done ? C.ink : C.blue, { shadow: !done }); }); }
    if (ph === 'input') K.sign(x, '轮到你了', M.MCPX.lx(MRA.hero), SY + 200, { kind: 'gold', size: T.btn });
  } };

// ═════════════════════ 血祭坛 · hold to pour ═════════════════════
// 地下礼拜堂：红玫瑰窗、黑石祭坛、金圣杯；高高的白蜡烛就是风险表。每倒满一档，地上的符文圈亮一格
const ALA = M.MCPX.ALTAR, alSlot = () => M.MCPX.slot('mini_altar', 'mc_altar'), CUP = { x: M.MCPX.lx(ALA.cup[0]), y: M.MCPX.ly(ALA.cup[1] - 20) };
MINI.altar = { title: '血祭坛', img: 'candle', col: C.red, text: '一滴血，一分力。倒得越多，这一趟部队的攻击越高——但蜡烛随时可能被血浇灭。',
  init(mg) { mg.poured = 0; mg.th = 0.14 + rnd() * 0.26 + mg.luck * 0.2; mg.gain = 0; mg.fire = 0; },
  down(mg, px, py) { if (mg.phase === 'ready' || mg.phase === 'pour') { if (mg.phase === 'ready') { SHW.press(this, mg, 'cup', CUP.x, CUP.y, C.red); const sl = alSlot(); if (sl) sl.burst('blood', ALA.hero + 12, 118, 6, { sp: 30, ang: 0.6, spread: 0.8, life: 0.5 }); } this.miniSet('pour'); return; }
    // 点空白：烛火一歪
    if (mg.phase === 'idle') { SHW.tap(this, mg, px, py); mg.nudge = mg.t; } },
  up(mg) { if (mg.phase === 'pour') MINI.altar.stop.call(this, mg); },
  stop(mg) { const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), lost = Math.round(mx * mg.poured); this.fx.flash('#ff2a2a', 0.2); const p = this.fxPos('hp'); if (p) this.fx.pop(p.x, p.y - 30, '-' + lost, '#ff5a4a', 40, { num: 1 }); this.pulse.hp = performance.now();
    if (mg.out) { this.miniSet('done'); this.miniSay('蜡烛灭了', '#8d8496', true); SHW.lose(this, mg); SHW.later(mg, HOLD[0], () => this.mini === mg && this.miniFinish('血太多了，蜡烛被浇灭。祭坛什么也没给你。你流了 ' + lost + ' 点血。', '#8d8496')); return; }
    const lv = Math.floor(mg.poured / 0.04), tier = lv >= 6 ? 3 : lv >= 3 ? 2 : lv >= 1 ? 1 : 0;
    mg.gain = lv * 0.02; this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + mg.gain; this.miniSet('done');
    if (!tier) { S.mini('altar', 'flicker'); SHW.lose(this, mg); SHW.later(mg, HOLD[0], () => this.mini === mg && this.miniFinish('你只滴了几滴，祭坛没有理你。', '#8d8496')); return; }
    // 松手：卡帧 → 圣杯一亮、血槽里的血烧成红金色的火往上窜，倍率越高演得越响
    SHW.hitstop(mg, 0.15, CUP.x, CUP.y, () => { S.mini('altar', 'win'); mg.fire = 1; mg.fireT = mg.t; K.pxrFlash('mc_altar', 4, 1.5); const sl = alSlot(); if (sl) { sl.burst('ember', ALA.cup[0], ALA.cup[1] - 20, 14 + tier * 8, { sp: 40, ang: 0, spread: 1, life: 1.4 }); sl.burst('glint', ALA.cup[0], ALA.cup[1] - 22, 6, { sp: 20, life: 0.7 }); }
      this.miniSay('这一趟部队攻击 +' + Math.round(mg.gain * 100) + '%', '#ffcc33', true); SHW.win(this, mg, tier, { x: CX, y: FLOOR - 300, col: tier >= 3 ? C.gold : C.magenta, id: 'cup' });
      SHW.later(mg, HOLD[tier], () => this.mini === mg && this.miniFinish('蜡烛亮了一截。你流了 ' + lost + ' 点血，这一趟部队攻击 +' + Math.round(mg.gain * 100) + '%。', '#ffcc33')); }); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献血', sub: '领袖生命 · 这一趟部队攻击', danger: 1, how: { kbm: '按住鼠标或 [空格] 倒血，松手停下', touch: '{hold} 按住画面倒血，松手停下' }, howWait: 1, fn: () => this.miniSet('ready') }, { t: '离开', leave: 1, fn: () => this.miniFinish('烛火跟着你晃了一下。', '#8d8496') }]; return []; },
  tick(mg, dt) {
    mg.fire = Math.max(0, mg.fire - dt * 0.5);
    if (mg.phase !== 'pour') return; const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), step = 0.1 * dt; if (h.hp - mx * step <= 1) return MINI.altar.stop.call(this, mg); h.hp -= mx * step; mg.poured += step;
    if (Math.floor(mg.poured / 0.04) !== mg.lv) { mg.lv = Math.floor(mg.poured / 0.04); S.mini('altar', 'pour', cl(mg.poured / 0.4, 0, 1)); if (mg.lv > 0) { SHW.crawl(this, mg, mg.lv); S.mini('altar', 'rune', mg.lv); const sl = alSlot(); if (sl) sl.burst('ember', 150 + Math.cos(mg.lv / 12 * Math.PI * 2) * 78, 161 + Math.sin(mg.lv / 12 * Math.PI * 2) * 9, 6, { sp: 18, ang: 0, spread: 0.8, life: 0.9 }); } }
    // 越倒越紧：倒到两档聚光 + 心跳，倒到五档换超级（红金频闪、心跳更急）
    if (!mg.rl && mg.lv >= 2) { mg.rl = 1; SHW.reach(this, mg, { x: CX + 90, y: FLOOR - 220, r: 240, label: '' }); }
    if (mg.rl === 1 && mg.lv >= 5) { mg.rl = 2; SHW.reach(this, mg, { x: CX + 90, y: FLOOR - 220, r: 240, lv: 2, label: '' }); }
    if (mg.poured > mg.th) { mg.out = true; S.mini('altar', 'out'); const sl = alSlot(); if (sl) sl.burst('steam', ALA.candle[0], 76, 8, { sp: 10, ang: 0, spread: 0.4, life: 1.6 }); MINI.altar.stop.call(this, mg); }
  },
  draw(x, mg) {
    const t = mg.t, lvl = cl(mg.poured / 0.4, 0, 1), near = cl((mg.poured / mg.th - 0.55) / 0.45, 0, 1), nudge = mg.nudge != null && t - mg.nudge < 0.4 ? 0.6 : 0;
    K.pxr(x, 'mini_altar', 0, 0, mg.t, { lvl, lv: Math.floor(mg.poured / 0.04), near: Math.max(near, nudge, mg.phase === 'pour' ? lvl * 0.4 : 0), out: !!mg.out, pour: mg.phase === 'pour', fire: mg.fire }, 'mc_altar');
    M.MCPX.cast(x, heroSp(this), ALA.hero, 148 + (mg.phase === 'pour' ? Math.round(Math.sin(t * 20) * 0.5 + 0.5) : 0), 'idle', t);
    // 部队攻击读数：品红大字，每涨一档弹一下；流血量红字
    K.big(x, '部队攻击 +' + (Math.floor(mg.poured / 0.04) * 2) + '%', CX, SY + 180, T.num, C.magenta, mg.phase === 'pour' ? (mg.poured % 0.04) / 0.1 : 9); U.text(x, '已流血 ' + Math.round(mg.poured * 100) + '%', CX, SY + 232, T.body, C.red);
  } };

// ═════════════════════ 货郎 · shell game with gourds ═════════════════════
// 夜市角落的货郎摊：「三个瓶子」画成三只倒扣的葫芦；货郎站在摊子后面（背景和前景之间）
// 选中的葫芦先只抬起一条缝（猜中的话缝里先透出品质色），最后一下才整个掀开
const PDA = M.MCPX.PEDDLER, pdSlot = () => M.MCPX.slot('mini_peddler_fg', 'mc_ped_fg');
const pedLift = (pt) => (pt < 0.75 ? 0.05 * eo(pt / 0.75) : 0.05 + 0.95 * eb(cl((pt - 0.75) / 0.2, 0, 1)));
MINI.peddler = { title: '货郎', img: 'stall', col: C.violet, text: '货郎掀开布：「三个瓶子，一个有货。眼睛跟得上，东西归你。」',
  init(mg) { mg.slot = [0, 1, 2]; mg.prize = Math.floor(rnd() * 3); mg.rounds = 0; mg.lift = [0, 0, 0]; mg.got = []; },
  sx(i) { return M.MCPX.lx(PDA.x[i]); },
  start(mg) { if (!this.miniPay(mg.pay)) return; mg.rounds++; mg.prize = Math.floor(rnd() * 3); mg.slot = [0, 1, 2]; mg.swaps = [...Array(6 + mg.rounds * 2)].map(() => { const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b++; return [a, b]; }); mg.si = 0; mg.judged = false; this.miniSet('show'); M.MCPX.npcAct('GourdPeddler', 'skill'); },
  guess(mg, s) { if (mg.phase !== 'guess') return; mg.pick = s; mg.right = mg.slot[s] === mg.prize; mg.it = { k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: Math.min(3, M.rollTier2(this.run) + 1) }; mg.om = mg.right ? { path: SHW.omenPath(mg.it.q), at: 0.3, dur: 0.45 } : null; this.miniSet('reveal'); S.mini('peddler', 'lift');
    SHW.press(this, mg, 'g' + s, MINI.peddler.sx(s), M.MCPX.ly(PDA.top - 20), C.gold);
    SHW.reach(this, mg, { x: MINI.peddler.sx(s), y: M.MCPX.ly(PDA.top - 20), r: 150, lv: mg.right && mg.it.q >= 3 ? 2 : 1, label: '' }); },
  down(mg, px, py) { if (mg.phase === 'guess') { for (let s = 0; s < 3; s++) if (Math.abs(px - MINI.peddler.sx(s)) < 70 && Math.abs(py - M.MCPX.ly(PDA.top - 18)) < 90) return MINI.peddler.guess.call(this, mg, s); }
    // 点空白：绒布上一圈褶子、铜铃一响
    SHW.tap(this, mg, px, py); S.mini('peddler', 'bell'); },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.rounds >= 2; return [{ t: '押一局', sub: mg.pay + ' 积分 · 猜中赢积分', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '货郎不跟你玩了' : '积分不够', fn: () => MINI.peddler.start.call(this, mg) }, { t: '离开', leave: 1, fn: () => this.miniFinish(mg.got.length ? '你赢走了：' + mg.got.join('、') + '。' : '货郎把布盖了回去。', mg.got.length ? '#b86bff' : '#8d8496') }]; }
    if (mg.phase === 'guess') return ['左', '中', '右'].map((n, s) => ({ t: n, sub: '选这个瓶子', fn: () => MINI.peddler.guess.call(this, mg, s) })); return []; },
  tick(mg, dt) {
    if (mg.phase === 'show') { mg.lift[mg.slot.indexOf(mg.prize)] = Math.sin(cl(mg.pt / 1.2, 0, 1) * Math.PI); if (mg.pt > 1.3) { mg.lift = [0, 0, 0]; this.miniSet('shuffle'); } }
    // 洗牌时灯珠跟着越跑越快
    if (mg.phase === 'shuffle') { SHW.state(mg).lamp = { t: 0.2, col: mg.si % 2 ? C.violet : C.gold, sp: 3 + mg.si * 0.6 }; const D = Math.max(0.16, 0.36 - mg.si * 0.02); if (mg.pt >= D) { const [a, b] = mg.swaps[mg.si]; const t0 = mg.slot[a]; mg.slot[a] = mg.slot[b]; mg.slot[b] = t0; mg.si++; mg.pt = 0; S.mini('peddler', 'shuffle', mg.si); M.MCPX.npcAct('GourdPeddler', 'attack'); if (mg.si >= mg.swaps.length) this.miniSet('guess'); } }
    if (mg.phase === 'reveal') { const ps = mg.slot.indexOf(mg.prize), px = MINI.peddler.sx(mg.pick);
      if (!mg.judged) { mg.lift[mg.pick] = pedLift(mg.pt); if (mg.om) omen(this, mg, mg.om, px, M.MCPX.ly(PDA.top - 20));
        if (mg.pt > 0.95) { mg.judged = true; mg.jt = mg.pt;
          if (mg.right) { const it = mg.it; M.MCPX.npcAct('GourdPeddler', 'hurt'); SHW.hitstop(mg, 0.15, px, M.MCPX.ly(PDA.top - 30), () => { const sl = pdSlot(); if (sl) sl.burst('glint', PDA.x[mg.pick], PDA.top - 8, 10, { sp: 30, life: 0.8 }); payout(this, mg, { tier: Math.min(4, it.q + 1), x: px, y: M.MCPX.ly(PDA.top - 40), col: SHW.QC(it.q), gains: [it], snd: () => { this.miniSay('猜中了！', '#ffcc33', true); S.mini('peddler', 'win'); }, done: (got) => { mg.got.push(...got); mg.judged = false; mg.lift = [0, 0, 0]; this.miniSet('idle'); } }); }); }
          // 猜错：有货的那个瓶子马上弹起来；就在隔壁的话打「差一点！」
          else { this.miniSay('空的。货郎咧嘴笑了', '#8d8496'); S.mini('peddler', 'lose'); if (Math.abs(mg.pick - ps) === 1) SHW.near(this, mg, MINI.peddler.sx(ps), M.MCPX.ly(PDA.top - 20), '差一点！'); else SHW.lose(this, mg); } } }
      else if (!mg.right) { mg.lift[ps] = eo(cl((mg.pt - mg.jt) / 0.12, 0, 1)); if (mg.pt > mg.jt + 0.4) { mg.judged = false; mg.lift = [0, 0, 0]; this.miniSet('idle'); } } }
  },
  draw(x, mg) {
    const t = mg.t, ph = mg.phase;
    // positions: slot s holds gourd id; animate the current swap (arc over / under, a speed for the afterimages)
    const gx = {}, arc = {}, vel = {}; mg.slot.forEach((id, s) => gx[id] = PDA.x[s]);
    if (ph === 'shuffle' && mg.si < mg.swaps.length) { const [a, b] = mg.swaps[mg.si], D = Math.max(0.16, 0.36 - mg.si * 0.02), p = mg.pt / D, q = eio(p), ia = mg.slot[a], ib = mg.slot[b], dx = PDA.x[b] - PDA.x[a]; gx[ia] = PDA.x[a] + dx * q; gx[ib] = PDA.x[b] - dx * q; arc[ia] = -Math.sin(q * Math.PI) * 10; arc[ib] = Math.sin(q * Math.PI) * 2;
      const v = (eio(Math.min(1, p + 0.05)) - eio(Math.max(0, p - 0.05))) / 0.1 * dx / D; vel[ia] = v; vel[ib] = -v; }
    const hov = ph === 'guess' ? [0, 1, 2].findIndex(s => Math.abs(mg.mx - MINI.peddler.sx(s)) < 70 && Math.abs(mg.my - M.MCPX.ly(PDA.top - 18)) < 90) : -1;
    const gourds = [0, 1, 2].map(id => { const s = mg.slot.indexOf(id), sel = ph === 'reveal' && s === mg.pick && !mg.judged, k = sel && mg.om && mg.om.q != null ? omK(mg, mg.om) : 0, lift = (mg.lift[s] || 0) * 30 + (s === hov ? 2 : 0);
      return { x: gx[id] + (sel ? Math.round(Math.sin(t * 47)) : 0), lift, dy: Math.round(arc[id] || 0), vx: vel[id] || 0, prize: id === mg.prize, gem: mg.right && ph === 'reveal' ? ['linen', 'teal', 'arcane', 'gold'][mg.it.q] : 'gold', gemC: mg.right && ph === 'reveal' ? SHW.QC(mg.it.q) : '#ffcf4a', crackC: k > 0 ? SHW.QC(mg.om.q) : null, hov: s === hov }; });
    const revK = ph === 'reveal' && mg.om && mg.om.q != null ? omK(mg, mg.om) : 0;
    K.pxr(x, 'mini_peddler', 0, 0, mg.t, { revK }, 'mc_ped');
    MINI.peddler.npc(x, mg);
    K.pxr(x, 'mini_peddler_fg', 0, 0, mg.t, { gourds, revK, revC: revK ? SHW.QC(mg.om.q) : null, revX: PDA.x[mg.pick || 0] }, 'mc_ped_fg');
    if (ph === 'guess') K.sign(x, '在哪个瓶子里？', CX, SY + 600, { kind: 'wine', size: T.btn }); // 放在桌下，不挡货郎
  },
  // 货郎（像素人物做好之前是剪影）：斗笠、咧嘴、两只长手；洗牌时手按着葫芦来回
  npc(x, mg) { if (M.MCPX.npcDraw(x, 'GourdPeddler', 180, 124, mg.t, false, mg)) return; const ax = 150, feet = 124, px = (a, b, c) => { x.fillStyle = U.pal(c); x.fillRect(M.MCPX.lx(a), M.MCPX.ly(b), 4, 4); }, sh = mg.phase === 'shuffle' ? Math.round(Math.sin(mg.t * 30)) : 0;
    for (let k = 0; k < 60; k++) { const y = feet - 1 - k, q = k / 60; let hw = q > 0.93 ? 12 - (q - 0.93) * 120 : q > 0.9 ? 12 : q > 0.8 ? 4 : 9; if (q > 0.97) hw = 2; for (let d = -Math.round(hw); d <= Math.round(hw); d++) px(ax + d + (q > 0.8 ? sh : 0), y, d === -Math.round(hw) ? '#ff9a48' : q > 0.8 && q < 0.86 && Math.abs(d) < 3 && d !== 0 ? '#fff3b0' : '#12101e'); } },
};
})();

;
