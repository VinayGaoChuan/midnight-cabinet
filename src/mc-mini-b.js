// ==== mc-mini-b.js ====
(function () {
// Event icons + 弹球 / 世界树 / 塔罗 / 砸金蛋 / 骰子对决 / 命运之轮.
const M = window.MC, S = M.Sfx, K = M.MK, MINI = M.MINI, IC = M.IC;
const { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd } = K;
const U = M.UI, C = M.PJ.PAL, T = U.T; // 画面内界面件按设计稿 §11.5（调色板色、字号阶梯）
// ───────── icons for the new event nodes (32x32 vector space) ─────────
const c = (x, a, b, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); };
const r = (x, a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
const p = (x, pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
const l = (x, a, b, cc, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(cc, d); x.stroke(); };
const e = (x, a, b, rx, ry, col, rot) => { x.fillStyle = col; x.beginPath(); x.ellipse(a, b, rx, ry, rot || 0, 0, 7); x.fill(); };
IC.e_wheel = (x) => { c(x, 16, 16, 14, '#caa84a'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#c0302a' : '#1a1418'; x.beginPath(); x.moveTo(16, 16); x.arc(16, 16, 12, i * Math.PI / 4, (i + 1) * Math.PI / 4); x.fill(); } c(x, 16, 16, 4, '#ffe08a'); p(x, [[13, 0], [19, 0], [16, 6]], '#ff4a3a'); };
IC.e_fruit = (x) => { l(x, 10, 14, 16, 3, 2.4, '#3a8a3a'); l(x, 22, 16, 16, 3, 2.4, '#3a8a3a'); e(x, 19, 4, 5, 2.4, '#5ab04a', -0.4); c(x, 10, 21, 7, '#d0202a'); c(x, 22, 23, 7, '#e0303a'); c(x, 8, 18, 2, '#ff9a9a'); c(x, 20, 20, 2, '#ff9a9a'); };
IC.e_claw = (x) => { r(x, 14, 0, 4, 10, '#c8d0dc'); r(x, 9, 9, 14, 6, '#caa84a'); l(x, 11, 15, 6, 24, 3, '#dfe6f0'); l(x, 6, 24, 10, 29, 3, '#dfe6f0'); l(x, 21, 15, 26, 24, 3, '#dfe6f0'); l(x, 26, 24, 22, 29, 3, '#dfe6f0'); c(x, 16, 25, 5, '#ff8ac0'); };
IC.e_pachinko = (x) => { r(x, 4, 2, 24, 28, '#3a2a4a'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3 + (i % 2); j++) c(x, 8 + j * 6 + (i % 2 ? -3 : 0) + 3, 7 + i * 5, 1.4, '#ffcc33'); c(x, 19, 13, 3, '#dfe6f0'); for (let i = 0; i < 4; i++) r(x, 5 + i * 6.5, 25, 1.5, 5, '#ffcc33'); };
IC.e_tree = (x) => { r(x, 13, 18, 6, 12, '#6a4a2a'); l(x, 16, 26, 8, 30, 2, '#6a4a2a'); l(x, 16, 26, 24, 30, 2, '#6a4a2a'); c(x, 16, 12, 11, '#2a7a3a'); c(x, 10, 15, 7, '#3a9a4a'); c(x, 22, 15, 7, '#3a9a4a'); c(x, 16, 8, 7, '#5ac05a'); c(x, 10, 12, 2.4, '#ffcc33'); c(x, 22, 11, 2.4, '#ff6a8a'); c(x, 17, 17, 2.4, '#8fe0ff'); };
IC.e_card = (x) => { r(x, 7, 3, 18, 26, '#caa84a'); r(x, 9, 5, 14, 22, '#3a1a5a'); c(x, 16, 14, 5, '#ffe08a'); c(x, 16, 14, 2.4, '#3a1a5a'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; l(x, 16 + Math.cos(a) * 6, 14 + Math.sin(a) * 6, 16 + Math.cos(a) * 8, 14 + Math.sin(a) * 8, 1, '#ffe08a'); } };
IC.e_egg = (x) => { e(x, 16, 18, 10, 12, '#e8b830'); e(x, 12, 13, 3, 5, '#fff2a0', -0.3); l(x, 8, 18, 12, 15, 1.4, '#8a5a1a'); l(x, 12, 15, 15, 19, 1.4, '#8a5a1a'); l(x, 15, 19, 19, 15, 1.4, '#8a5a1a'); };
IC.e_fate = (x) => { c(x, 16, 16, 14, '#6a6070'); c(x, 16, 16, 11, '#8a8090'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; l(x, 16, 16, 16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, 2, '#4a4050'); } c(x, 16, 16, 4, '#d0453c'); c(x, 16, 4, 2.4, '#ff6a5a'); };
IC.e_spring = (x) => { e(x, 16, 24, 14, 6, '#4aa8d0'); e(x, 16, 23, 10, 3, '#8fe0ff'); for (let i = 0; i < 3; i++) { x.strokeStyle = '#e8f4ff'; x.lineWidth = 2; x.beginPath(); x.moveTo(9 + i * 7, 18); x.quadraticCurveTo(6 + i * 7, 12, 10 + i * 7, 8); x.quadraticCurveTo(13 + i * 7, 4, 10 + i * 7, 1); x.stroke(); } };
IC.e_trap = (x) => { e(x, 16, 24, 14, 5, '#4a4a55'); for (let i = 0; i < 7; i++) p(x, [[5 + i * 3.6, 22], [7 + i * 3.6, 12], [9 + i * 3.6, 22]], '#c8d0dc'); c(x, 16, 24, 3, '#d0453c'); };
IC.e_cat = (x) => { c(x, 16, 18, 11, '#f5f0e8'); p(x, [[6, 12], [8, 2], [13, 9]], '#f5f0e8'); p(x, [[26, 12], [24, 2], [19, 9]], '#f5f0e8'); c(x, 12, 17, 1.6, '#1a1418'); c(x, 20, 17, 1.6, '#1a1418'); r(x, 9, 24, 14, 3, '#d0202a'); c(x, 16, 28, 3, '#ffcc33'); l(x, 26, 14, 30, 6, 3, '#f5f0e8'); };
IC.e_market = (x) => { p(x, [[6, 12], [26, 12], [28, 29], [4, 29]], '#6a4a2a'); l(x, 11, 12, 11, 6, 2, '#caa84a'); l(x, 21, 12, 21, 6, 2, '#caa84a'); l(x, 11, 6, 21, 6, 2, '#caa84a'); c(x, 16, 20, 4, '#ffcc33'); r(x, 15, 17, 2, 6, '#8a5a1a'); };
IC.e_trainer = (x) => { r(x, 4, 14, 24, 4, '#8a8a9a'); r(x, 2, 9, 5, 14, '#3a3a44'); r(x, 25, 9, 5, 14, '#3a3a44'); r(x, 7, 11, 3, 10, '#5a5a66'); r(x, 22, 11, 3, 10, '#5a5a66'); };
IC.e_statue = (x) => { r(x, 8, 24, 16, 6, '#8a8a90'); p(x, [[11, 24], [21, 24], [19, 12], [13, 12]], '#b8b8c0'); c(x, 16, 9, 5, '#c8c8d0'); c(x, 14, 8, 1, '#4af0ff'); c(x, 18, 8, 1, '#4af0ff'); };
IC.e_arena = (x) => { l(x, 6, 6, 26, 26, 3, '#dfe6f0'); l(x, 26, 6, 6, 26, 3, '#dfe6f0'); r(x, 4, 22, 8, 3, '#caa84a'); r(x, 20, 22, 8, 3, '#caa84a'); c(x, 16, 16, 5, '#d0453c'); };
IC.e_music = (x) => { r(x, 11, 5, 3, 18, '#ffe08a'); r(x, 22, 3, 3, 18, '#ffe08a'); p(x, [[11, 5], [25, 3], [25, 8], [11, 10]], '#ffe08a'); e(x, 9, 23, 5, 4, '#ffe08a', -0.4); e(x, 20, 21, 5, 4, '#ffe08a', -0.4); };
IC.e_needle = (x) => { l(x, 6, 26, 26, 6, 2.4, '#dfe6f0'); c(x, 24, 8, 2.6, '#1a1418'); x.strokeStyle = '#d0453c'; x.lineWidth = 2; x.beginPath(); x.moveTo(24, 8); x.bezierCurveTo(30, 16, 14, 20, 20, 28); x.stroke(); };
IC.e_bottle = (x) => { r(x, 13, 3, 6, 6, '#8a6a3a'); p(x, [[12, 9], [20, 9], [26, 18], [26, 29], [6, 29], [6, 18]], '#9ad0ff'); p(x, [[7, 20], [25, 20], [25, 28], [7, 28]], '#4ad07a'); r(x, 9, 12, 3, 12, 'rgba(255,255,255,0.5)'); };
IC.e_cups = (x) => { for (let i = 0; i < 3; i++) p(x, [[3 + i * 9, 26], [11 + i * 9, 26], [10 + i * 9, 12], [4 + i * 9, 12]], i === 1 ? '#d0453c' : '#8a5a3a'); c(x, 16, 29, 2.4, '#ffcc33'); };
IC.e_coin = (x) => { c(x, 16, 16, 12, '#e8a820'); c(x, 15, 15, 10, '#ffd650'); r(x, 14, 9, 3, 13, '#e8a820'); };
IC.e_camp = (x) => { l(x, 6, 28, 26, 22, 3, '#6a4a2a'); l(x, 6, 22, 26, 28, 3, '#6a4a2a'); p(x, [[10, 24], [16, 4], [22, 24]], '#ff7a2a'); p(x, [[13, 24], [16, 12], [19, 24]], '#ffe08a'); };
IC.e_flag = (x) => { r(x, 6, 3, 3, 27, '#6a4a2a'); p(x, [[9, 4], [28, 8], [9, 17]], '#6fa8dc'); c(x, 16, 10, 2.4, '#ffe08a'); };
IC.e_path = (x) => { for (let i = 0; i < 4; i++) { e(x, 10 + (i % 2) * 10, 27 - i * 7, 3, 4.5, '#ffe08a', 0.2); } };


// ───────── 演出（docs/design.md §7.5.1）：结果先定，演出后挑 ─────────
const SHOW = M.SHOW, QC = SHOW.QC;
const WL = (tier) => (tier === 4 ? '大奖' : tier === 3 ? '大赢' : '');
// 裂纹（局部坐标，蛋和牌背共用）：粗的一道预兆色 + 白芯，像光从缝里漏出来
const CRK = [[[-6, -80], [4, -58], [-12, -40], [6, -20], [-4, 0]], [[40, -50], [26, -30], [44, -12], [30, 10]], [[-50, -10], [-30, 6], [-46, 26], [-26, 44]], [[10, 20], [-6, 40], [14, 58], [0, 78]]];
const crack = (x, pts, col) => { x.lineCap = 'square'; x.lineJoin = 'miter'; [[9, col], [3, C.white]].forEach(([w, c2]) => { x.strokeStyle = U.pal(c2); x.lineWidth = w; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); }); };

// ═════════════════════ 弹球 · pachinko ═════════════════════
// Pixel stage mb_pachinko (mc-pxroom-minib-pachinko.js): a chrome-and-brass machine in a midnight parlour; the brass pegs sit
// exactly where the physics has them. Bought balls pour into the tray, each one runs up the launch rail and drops in at the
// gate (the physics starts there as before); a ball that reaches the last rows over an edge pocket is the reach — its every
// row is a beat, the LCD's moon face goes wide-eyed, the tulips twitch open; the tulip snaps shut on it, the machine strobes
// in the prize colour, the LCD shows fireworks and the payout spout spills balls.
const PB = { L: SX + 300, R: SX + SW - 300, T: SY + 110, B: FLOOR - 10 };
const SLOTS = [{ n: '图纸', ic: 'scroll', c: C.butter, m: 'gold' }, { n: '空', ic: '', c: C.slate }, { n: '积分', ic: 'coin', c: C.gold, m: 'gold' }, { n: '物资', ic: 'sack', c: C.tan, m: 'sand' }, { n: '积分', ic: 'coin', c: C.gold, m: 'gold' }, { n: '空', ic: '', c: C.slate }, { n: '道具', ic: 'gem', c: C.violet, m: 'arcane' }];
// 落格的中奖档：图纸大奖、道具大赢、中间三格小中、空格没中；PROW = 进最后三排钉子的高度
const PTIER = [4, 0, 1, 1, 1, 0, 3], PROW = PB.T + 90 + 4.5 * 46, PRAIL = 0.3;
const PKG = () => M.PXR && M.PXR.MINIB && M.PXR.MINIB.pachinko;
MINI.pachinko = { title: '弹珠台', img: 'e_pachinko', col: C.gold, text: '钢珠弹过一排排钉子，落进底下的格子里。两边的格子最值钱。',
  init(mg) { mg.pegs = []; const rows = 8, W = PB.R - PB.L; for (let i = 0; i < rows; i++) { const n = i % 2 ? 9 : 10; for (let j = 0; j < n; j++) mg.pegs.push({ x: PB.L + 30 + j * (W - 60) / 9 + (i % 2 ? (W - 60) / 18 : 0), y: PB.T + 90 + i * 46, f: 0 }); }
    mg.balls = []; mg.rail = []; mg.queue = 0; mg.buys = 0; mg.won = []; mg.spent = 0; mg.gW = 0; mg.gS = 0; mg.slotF = SLOTS.map(() => 0); mg.slotP = SLOTS.map(() => -1); mg.spawnT = 0; mg.reachB = null; mg.pend = 0; mg.launchF = 0;
    mg.tulip = [0, 0]; mg.tulT = [-9, -9]; mg.lcd = { mode: 'idle', t0: 0 }; mg.lamps = { mode: 'idle', mat: 'lamp', t0: 0 }; mg.pourT = null; mg.pourN = 0; mg.payT = null; mg.jolt = 0; mg.beatN = 0; },
  lcd(mg, mode) { if (mg.lcd.mode !== mode) mg.lcd = { mode, t0: mg.t }; },
  lamps(mg, mode, mat) { mg.lamps = { mode, mat: mat || 'lamp', t0: mg.t }; },
  // 投币：出珠口哗啦倒进一把钢珠（托盘里一颗颗落下），把手拧一格，整圈灯珠亮一下
  buy(mg, n, cost) { if (!this.miniPay(cost)) return; mg.spent += cost; mg.buys++; mg.queue += n; mg.pourT = mg.t; mg.pourN = n; mg.launchF = 1; mg.spawnT = 0.5; S.lever(); S.mini('pachinko', 'pour', n);
    MINI.pachinko.lamps(mg, 'chase'); K.pxrFlash('mb_pachinko', 0, 0.9); const G = PKG(); if (G) { const x = K.lx((G.tray.x0 + G.tray.x1) / 2), y = K.ly(G.tray.y0 + 5); SHOW.burst(mg, x, y, 14, { col: C.silver, sp: [80, 220], ang: -Math.PI / 2, spread: 1.6, life: [0.25, 0.5], w: 200 }); SHOW.ring(mg, x, y, 8, 120, C.gold, { life: 0.35 }); } SHOW.shake(mg, 4); },
  // 奖励还在飞的时候不许离开（mg.pend），不然结算文字里会少东西
  btns(mg) { if (mg.phase === 'leave') return []; const busy = mg.queue > 0 || mg.rail.length > 0 || mg.balls.length > 0 || mg.pend > 0, over = mg.buys >= 2; const c3 = mg.pay, c8 = M.nice(mg.pay * 2.2);
    return [{ t: '投 3 颗', sub: c3 + ' 积分', dis: busy || over || this.run.wallet < c3, why: busy ? '钢珠还在跑' : over ? '台子关了' : '积分不够', fn: () => MINI.pachinko.buy.call(this, mg, 3, c3) }, { t: '投 8 颗', sub: c8 + ' 积分', gold: !busy && !over, dis: busy || over || this.run.wallet < c8, why: busy ? '钢珠还在跑' : over ? '台子关了' : '积分不够', fn: () => MINI.pachinko.buy.call(this, mg, 8, c8) },
      { t: '离开', leave: 1, dis: busy, why: '等钢珠落完', fn: () => { this.miniSet('leave'); MINI.pachinko.lamps(mg, 'off'); MINI.pachinko.lcd(mg, 'off'); S.mini('pachinko', 'off'); SHOW.ambient(mg, null); } }]; },
  // the settlement in one line (user ruling 2026-09-26: 「把相同的合并一下再显示，例如赚了还是赔了多少积分」): what went in, what came
  // back, won or lost on the score, then the other things counted by kind
  sum(mg) {
    const net = mg.gW - mg.spent, n = {}; mg.won.forEach(w => { n[w] = (n[w] || 0) + 1; });
    const rest = Object.keys(n).map(k => k + (n[k] > 1 ? ' ×' + n[k] : '')), parts = ['投了 ' + mg.spent + ' 积分，赢回 ' + mg.gW + ' 积分，' + (net >= 0 ? '净赚 ' + net : '净赔 ' + -net)];
    if (mg.gS) parts.push('物资 +' + mg.gS); if (rest.length) parts.push('还有 ' + rest.join('、'));
    return { t: parts.join('；') + '。', c: net >= 0 || rest.length ? '#ffcc33' : '#8d8496' };
  },
  land(mg, i, b) {
    const s = SLOTS[i], run = this.run, sw = (PB.R - PB.L) / SLOTS.length, from = { x: PB.L + (i + 0.5) * sw, y: PB.B - 40 }, reached = mg.reachB === b; mg.slotF[i] = 1; mg.slotP[i] = 0; let g = null;
    if (reached) { mg.reachB = null; SHOW.slowmo(mg, 1, 0); }
    if (s.n === '图纸') g = K.bp(); else if (s.n === '积分') g = { k: 'wallet', v: M.nice(mg.P * 1.4) }; else if (s.n === '物资') g = { k: 'rsup', v: 10 }; else if (s.n === '道具') g = K.item(run, mg.P);
    if (g) {
      // 格子先亮 → 近处火花 → 舞台 → 奖励飞进计数器；另一颗珠子还在聚光里时，小奖只在格子上滚数字，不抢舞台
      const tier = PTIER[i], v = g.k === 'wallet' || g.k === 'rsup' ? g.v : 0, solo = !mg.reachB || tier >= 3; mg.pend++; S.mini('pachinko', 'slot');
      this.fx.spark(from.x, from.y, s.c, 8 + tier * 5, { v: 420 + tier * 120, dir: -Math.PI / 2, spread: 1.6 }); this.fx.ring(from.x, from.y, 8, 60 + tier * 24, s.c, 5, 0.3);
      if (tier >= 3) {   // a tulip: it snaps open on the ball and shut again, the whole machine strobes in the prize colour, the LCD fireworks, the spout pays out
        const k = i ? 1 : 0; mg.tulip[k] = 1; mg.tulT[k] = mg.t; MINI.pachinko.lcd(mg, 'win'); MINI.pachinko.lamps(mg, 'strobe', s.m); mg.payT = mg.t + 0.2; S.mini('pachinko', 'tulip'); S.mini('pachinko', 'edge'); SHOW.later(mg, 0.25, () => S.mini('pachinko', 'payout'));
        K.pxrFlash('mb_pachinko', 0, 1.4); }
      else if (mg.lamps.mode !== 'strobe') MINI.pachinko.lamps(mg, 'chase', s.m);
      SHOW.later(mg, 0.06, () => { if (solo) SHOW.win(this, mg, tier, { x: from.x, y: from.y - 40, col: s.c, v, label: WL(tier) }); else if (v) SHOW.roll(mg, v, from.x, from.y - 120, s.c, 0.4); });
      SHOW.later(mg, tier === 4 ? 0.7 : tier === 3 ? 0.25 : 0.12, () => { const got = this.award([g], from); if (g.k === 'wallet') mg.gW += g.v; else if (g.k === 'rsup') mg.gS += g.v; else mg.won.push(...got); mg.pend--;
        if (tier >= 3) SHOW.items(this, mg, [{ text: s.n, col: C.cream, size: 44 }].concat(got.map(t2 => ({ text: t2, col: s.c, size: 36 }))), { x: CX, y: SY + 440, dy: 50, gap: 0.2, t0: tier === 4 ? 0.5 : 0 }); });
    } else { S.mini('pachinko', 'out'); SHOW.burst(mg, from.x, from.y + 10, 8, { ramp: [C.lavender, C.haze, C.slate, C.indigo], sp: [40, 120], ang: -Math.PI / 2, spread: 1.4, life: [0.2, 0.4] });
      if (reached) { MINI.pachinko.lcd(mg, 'lose'); if (i === 1 || i === 5) SHOW.near(this, mg, from.x, from.y - 10, '差一点！'); else SHOW.lose(this, mg); } }
  },
  // 点玻璃：玻璃上一圈反光涟漪、托盘里的钢珠一震；点在机台外面走框架的波纹
  down(mg, px, py) { const G = PKG(), ax = K.ax(px), ay = K.ay(py); if (G && ax > G.glass.x0 && ax < G.glass.x1 && ay > G.glass.y0 && ay < G.glass.y1) { mg.ripple = { x: ax, y: ay, t0: mg.t }; mg.jolt = 0.9; S.mini('pachinko', 'peg', 2); SHOW.tap(this, mg, px, py); return; } return false; },
  tick(mg, dt) {
    const t = mg.t, G = PKG();
    mg.slotF = mg.slotF.map(f => Math.max(0, f - dt * 2)); mg.slotP = mg.slotP.map(p => (p >= 0 ? p + dt : p)); mg.pegs.forEach(q => q.f = Math.max(0, q.f - dt * 4)); mg.launchF = Math.max(0, mg.launchF - dt * 3); mg.jolt = Math.max(0, mg.jolt - dt * 2);
    [0, 1].forEach(k => { if (t - mg.tulT[k] > 0.9) mg.tulip[k] = Math.max(0, mg.tulip[k] - dt * 3); });
    if (mg.lcd.mode === 'win' && t - mg.lcd.t0 > 3) MINI.pachinko.lcd(mg, 'idle'); if (mg.lcd.mode === 'lose' && t - mg.lcd.t0 > 0.6) MINI.pachinko.lcd(mg, 'idle');
    if (mg.lamps.mode !== 'idle' && mg.lamps.mode !== 'off' && t - mg.lamps.t0 > (mg.lamps.mode === 'strobe' ? 2.6 : 1.4) && !mg.balls.length && !mg.rail.length && !mg.queue) MINI.pachinko.lamps(mg, 'idle');
    if (mg.phase === 'leave') { if (mg.pt > 0.9 && !mg.left) { mg.left = 1; const r = MINI.pachinko.sum(mg); this.miniFinish(r.t, r.c); } return; }
    // hovering the tray: its balls hop (a tick when the cursor comes onto it)
    if (G) { const ax = K.ax(mg.mx), ay = K.ay(mg.my), on = ax > G.tray.x0 && ax < G.tray.x1 && ay > G.tray.y0 - 2 && ay < G.tray.y1 + 2; if (on) mg.jolt = Math.max(mg.jolt, 0.5); if (on && !mg.trayHov) S.mini('_', 'hover'); mg.trayHov = on; }
    // 发射：把手一抖、「叮」，钢珠沿左边轨道冲上去，从顶上的入口掉进钉阵（进钉阵的位置和速度跟以前一样）
    if (mg.queue > 0) { mg.spawnT -= dt; if (mg.spawnT <= 0) { mg.spawnT = 0.32; mg.queue--; mg.launchF = 1; mg.rail.push({ u: 0 }); S.mini('pachinko', 'launch'); } }
    mg.rail.forEach(q => q.u += dt / PRAIL); mg.rail = mg.rail.filter(q => { if (q.u < 1) return true; mg.balls.push({ x: (PB.L + PB.R) / 2 + (rnd() - 0.5) * 60, y: PB.T + 30, vx: (rnd() - 0.5) * 120, vy: 0, tr: [] }); S.mini('pachinko', 'peg', 0); return false; });
    const W = PB.R - PB.L, sw = W / SLOTS.length, br = 10, pr = 7;
    for (let s = 0; s < 4; s++) { const h = dt / 4; mg.balls.forEach(b => {
      b.vy += 1500 * h; b.x += b.vx * h; b.y += b.vy * h;
      if (b.x < PB.L + br) { b.x = PB.L + br; b.vx = Math.abs(b.vx) * 0.6; } if (b.x > PB.R - br) { b.x = PB.R - br; b.vx = -Math.abs(b.vx) * 0.6; }
      mg.pegs.forEach(q => { const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy); if (d < br + pr && d > 0) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = q.x + nx * (br + pr); b.y = q.y + ny * (br + pr); if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vx += (rnd() - 0.5) * 60; } if (q.f < 0.5) { q.f = 1; const hot = b === mg.reachB; if (hot) this.fx.spark(q.x, q.y, C.gold, 5, { v: 320, w: 3 }); if (hot || rnd() < 0.3) S.mini('pachinko', 'peg', Math.round((q.y - PB.T - 90) / 46)); } } });
      // the dividers start below the last row of pegs: a ball sitting on a peg inside them was pinned there for good (2026-09-26)
      if (b.y > PB.B - 44) { const k = Math.floor((b.x - PB.L) / sw), x0 = PB.L + k * sw; if (b.x - x0 < br && k > 0) { b.x = x0 + br; b.vx = Math.abs(b.vx) * 0.5; } if (x0 + sw - b.x < br && k < SLOTS.length - 1) { b.x = x0 + sw - br; b.vx = -Math.abs(b.vx) * 0.5; } }
      // never at rest anywhere but the slots: a ball that has stopped gets a nudge
      if (Math.abs(b.vx) + Math.abs(b.vy) < 40) { b.still = (b.still || 0) + h; if (b.still > 0.4) { b.still = 0; b.vx = (rnd() < 0.5 ? -1 : 1) * (90 + rnd() * 60); b.vy = 60; } } else b.still = 0;
      if (b.y > PB.B - 16 && !b.done) { b.done = true; MINI.pachinko.land.call(this, mg, cl(Math.floor((b.x - PB.L) / sw), 0, SLOTS.length - 1), b); } }); }
    mg.balls = mg.balls.filter(b => !b.done);
    mg.balls.forEach(b => { b.tr.push(b.x, b.y); if (b.tr.length > 16) b.tr.splice(0, 2); });
    // 听牌：珠子进最后三排、又正好在两边的格子上方——慢动作 + 聚光跟着它；同一时间只给一颗。液晶屏里的月亮脸瞪大眼、两边的郁金香微微张开
    if (!mg.reachB) { const b = mg.balls.find(b => !b.rc && b.vy > 0 && b.y > PROW && b.y < PB.B - 60 && (b.x < PB.L + sw * 1.25 || b.x > PB.R - sw * 1.25)); if (b) { b.rc = 1; b.row = 5; mg.reachB = b; mg.beatN = 0; SHOW.reach(this, mg, { x: b.x, y: b.y, r: 110, lv: b.x < CX ? 2 : 1 }); SHOW.slowmo(mg, 0.35, 1.6); MINI.pachinko.lcd(mg, 'reach'); MINI.pachinko.lamps(mg, 'chase', 'red'); S.mini('pachinko', 'reach'); } }
    const hb = mg.reachB, T0 = mg.sh && mg.sh.tense; if (hb && T0) { T0.x = hb.x; T0.y = hb.y; }
    // the reach ball: every row it drops through is a beat — a ring, a harder shake, the camera leans in, a higher tick
    if (hb) { const row = Math.floor((hb.y - PB.T - 90 + 23) / 46); if (row > hb.row) { hb.row = row; const i = mg.beatN++; SHOW.ring(mg, hb.x, hb.y, 6, 50 + i * 12, C.gold, { life: 0.35 }); SHOW.shake(mg, 2 + i * 2); SHOW.zoom(mg, 0.012 + i * 0.006, hb.x, hb.y); S.mini('_', 'beat', { i, tier: 1 + i, up: i >= 2 }); }
      [0, 1].forEach(k => { if (t - mg.tulT[k] > 0.9) mg.tulip[k] = Math.max(mg.tulip[k], 0.35 + 0.1 * Math.sin(t * 18)); }); }
  },
  draw(x, mg) {
    const t = mg.t, G = PKG(), A = (v, i) => (i % 2 ? K.ay(v) : K.ax(v));
    const o = { balls: mg.balls.map(b => ({ x: K.ax(b.x), y: K.ay(b.y), hot: b === mg.reachB ? 1 : 0, tr: b.tr.map(A) })), pegF: mg.pegs.map(q => q.f), slotF: mg.slotF, tulip: mg.tulip, queue: mg.queue, handle: mg.launchF, turn: mg.queue || mg.rail.length ? 0.8 : 0,
      pour: mg.pourT != null && t - mg.pourT < 0.8 ? cl((t - mg.pourT) / 0.5, 0, 1) : 0, payout: mg.payT != null && t > mg.payT ? cl((t - mg.payT) / 1.2, 0, 1) : 0, lcd: { mode: mg.lcd.mode, t: t - mg.lcd.t0 }, lamps: { mode: mg.lamps.mode, mat: mg.lamps.mat, t: t - mg.lamps.t0 },
      jolt: mg.jolt, ripple: mg.ripple ? { x: mg.ripple.x, y: mg.ripple.y, age: t - mg.ripple.t0 } : null };
    if (G) mg.rail.forEach(q => { const tr = []; for (let k = 5; k >= 1; k--) tr.push(...G.rail(q.u - k * 0.03)); const [rx, ry] = G.rail(q.u); o.balls.push({ x: rx, y: ry, tr }); });
    if (!K.pxr(x, 'mb_pachinko', 0, 0, t, o)) { K.R(x, SX, SY, SW, SH, '#0a0610'); return; }
    // the tray's count on its chrome lip
    if (G && mg.queue) U.text(x, '×' + mg.queue, K.lx(G.tray.x0) - 34, K.ly((G.tray.y0 + G.tray.y1) / 2), T.cap, C.cream, { num: true });
  } };

// ═════════════════════ 世界树 · pick fruit, water, or cut ═════════════════════
// Pixel stage mb_tree (mc-pxroom-minib-tree.js): a giant tree in a cavern at the root of the worlds (its root hollows show a snowy
// night, a lava field, a galaxy, a windy meadow), sap veins beating upward, seven fruits each drawn as its own sprite.
// Picking: the fruit ripens beat by beat (SHOW.charge: its omen colour climbs to its true quality, a crack of light when it steps
// up), a frozen instant, the stem snaps, it falls, squashes, bursts into juice in its colour; an epic fruit sets every vein of
// the trunk burning gold and gold leaves fall. Watering: the sap climbs, a bud flowers, a fourth fruit swells. Cutting: the axe
// bites, a glowing branch falls and unrolls a blueprint; cursed, the bark knots open into red eyes.
// q = 揭晓时按哪一档品质演（只管演出）；rv = 落地时舞台上滚的数字
const FRUITS = [
  { n: '生命果', c: C.pink, ic: 't_heart', q: 0, d: '领袖回复 40% 生命', f(g) { return '回复 ' + g.heroHeal(0.4) + ' 生命'; } },
  { n: '力量果', c: C.amber, ic: 't_sword', q: 1, d: '本局部队攻击 +12%', f(g) { return g.buffRun('unitAtk', 0.12, '部队攻击 +12%', C.amber); } },
  { n: '坚韧果', c: C.blue, ic: 't_shieldHeart', q: 1, d: '本局部队生命 +15%', f(g) { return g.buffRun('unitHp', 0.15, '部队生命 +15%', C.blue); } },
  { n: '智慧果', c: C.lime, ic: 't_orb', q: 0, rv: () => 70, d: '经验 +70', f(g, mg) { return g.giveExp(70, mg.from); } },
  { n: '灵魂果', c: C.violet, ic: 't_shard', q: 1, rv: () => 25, d: '灵魂碎片 +25', f(g, mg) { return g.giveShards(25, mg.from); } },
  { n: '黄金果', c: C.gold, ic: 't_coin', q: 2, rv: (mg) => M.nice(mg.P * 10), d: '积分 +', f(g, mg) { g.award([{ k: 'wallet', v: M.nice(mg.P * 10) }], mg.from); return '积分 +' + M.nice(mg.P * 10); } },
  { n: '幸运果', c: C.green, ic: 't_clover', q: 2, d: '本局事件好运 +10%，FEVER 好效果 +5%', f(g) { g.run.mods.tier = (g.run.mods.tier || 0) + 0.05; return g.buffRun('eventLuck', 0.1, '好运 +10%', C.green); } }];
const TRG = () => M.PXR && M.PXR.MINIB && M.PXR.MINIB.tree;
const TREE_HANG = [[95, 62.5], [150, 47.5], [205, 62.5], [150, 82.5]], TREE_LAND = 140;
MINI.tree = { title: '世界树', img: 'e_tree', col: C.green, text: '树根扎进每一个世界。它结的果子，只允许你摘一个。',
  init(mg) { const pool = FRUITS.slice().sort(() => rnd() - 0.5); mg.fr = pool.slice(0, 3).map((f, i) => ({ f, k: FRUITS.indexOf(f), x: K.lx(TREE_HANG[i][0]), y: K.ly(TREE_HANG[i][1]), gone: false, vy: 0, fy: 0, q: 0, crack: 0 }));
    mg.spare = pool[3]; mg.picks = 0; mg.allow = 1; mg.got = []; mg.watered = false; mg.hovI = -1; },
  // 摘：果子一缩再鼓起、叶子抖落一把，然后一拍一拍熟透（预兆色往上走，升一档那拍果皮裂开透光）→ 卡帧 → 果柄断、掉下来
  pick(mg, i) { const F = mg.fr[i]; if (!F || F.gone || mg.phase !== 'idle') return; F.gone = true; F.falling = true; F.ripeT = mg.t; mg.pickI = i; this.miniSet('ripen'); S.mini('tree', 'pick'); SHOW.press(this, mg, 'fruit', F.x, F.y, F.f.c); F.beat = mg.t;
    const q = F.f.q; SHOW.omen(this, mg, 0);
    F.ripeD = SHOW.charge(this, mg, { x: F.x, y: F.y, q, reveal: false, onBeat: (b, tq, up) => { F.q = tq; F.beat = mg.t; S.mini('tree', 'ripe', b); if (up) { F.crack = Math.min(1, F.crack + 0.5 + 0.5 * (tq >= q ? 1 : 0)); SHOW.stamp(mg, '升格！', F.x, F.y - 110, QC(tq), 44, 0.9); } },
      onReveal: () => { F.drop = mg.t; F.q = q; S.mini('tree', 'snap'); this.miniSet('fall'); SHOW.burst(mg, F.x, F.y - 30, 12, { ramp: [C.lime, C.green, C.greenDeep, C.ink], sp: [80, 220], life: [0.3, 0.6] }); } }); },
  water(mg) { const run = this.run; this.hold('rsup', run.loot.supplies); run.loot.supplies -= 30; this.release('rsup'); mg.watered = true; mg.allow++;
    mg.fr.push({ f: mg.spare, k: FRUITS.indexOf(mg.spare), x: K.lx(TREE_HANG[3][0]), y: K.ly(TREE_HANG[3][1]), gone: false, grow: 0, q: 0, crack: 0 }); this.miniSet('water'); S.mini('tree', 'water'); SHOW.ring(mg, CX, K.ly(146), 10, 260, C.teal, { life: 0.5 }); },
  btns(mg) { if (mg.phase !== 'idle') return []; const b = mg.fr.map((F, i) => ({ t: '摘 ' + F.f.n, sub: F.f.d, dis: F.gone, why: '已经摘了', fn: () => MINI.tree.pick.call(this, mg, i) }));
    b.push({ t: '浇灌', sub: '-30 本局物资 · 再结一个，能多摘一个', dis: mg.watered || this.run.loot.supplies < 30, why: mg.watered ? '已经浇过了' : '本局物资不够 30', fn: () => MINI.tree.water.call(this, mg) });
    b.push({ t: '砍树枝', sub: '得到自然风格图纸，可能被诅咒', danger: 1, dis: mg.picks > 0, why: '树不再理你了', fn: () => { this.miniSet('cut'); S.mini('tree', 'swing'); } });
    return b; },
  // a fruit under the cursor or the pointer: click to pick it; anywhere else the fireflies scatter
  down(mg, px, py) { const i = mg.fr.findIndex(F => !F.gone && (F.grow == null || F.grow >= 1) && Math.hypot(px - F.x, py - F.y) < 48); if (i >= 0 && mg.phase === 'idle') { MINI.tree.pick.call(this, mg, i); return; } mg.tap = { x: K.ax(px), y: K.ay(py), t0: mg.t }; S.mini('tree', 'rustle'); return false; },
  tick(mg, dt) {
    const t = mg.t;
    // hover: the branch dips, the fruit swells and brightens, a wind chime (one note per fruit)
    if (mg.phase === 'idle') { const h = mg.fr.findIndex(F => !F.gone && (F.grow == null || F.grow >= 1) && Math.hypot(mg.mx - F.x, mg.my - F.y) < 48); if (h !== mg.hovI) { mg.hovI = h; if (h >= 0) { S.mini('tree', 'chime', mg.fr[h].k); SHOW.hover(this, mg, 'fruit' + h, true); } } } else mg.hovI = -1;
    if (mg.phase === 'fall') { const F = mg.fr[mg.pickI];
      if (F.f.q >= 2 && !F.slow) { F.slow = 1; SHOW.slowmo(mg, 0.5, 0.7); }
      F.vy = (F.vy || 0) + 1800 * dt; F.fy = (F.fy || 0) + F.vy * dt;
      if (F.y + F.fy > FLOOR - 30) { F.fy = FLOOR - 30 - F.y; F.falling = false; F.land = mg.t; mg.from = { x: F.x, y: FLOOR - 30 }; this.miniSet('land'); S.mini('tree', 'fruit'); S.mini('tree', 'splat');
        // 落地：果子压扁 → 果汁溅成品质色的像素花 → 舞台按品质走中奖档 → 效果生效、奖励飞走、逐项砸出
        const q = F.f.q, tier = q + 1, qc = QC(q), v = F.f.rv ? F.f.rv(mg) : 0;
        this.fx.spark(F.x, FLOOR - 40, qc, 10 + q * 6, { v: 520, dir: -Math.PI / 2, spread: 2.2 }); SHOW.shock(mg, F.x, FLOOR - 30, qc, { r: 160 + q * 60 }); SHOW.shake(mg, 6 + q * 4);
        if (q >= 2) { mg.flareT = mg.t; S.mini('tree', 'bloom'); }
        SHOW.later(mg, 0.07, () => SHOW.win(this, mg, tier, { x: F.x, y: FLOOR - 70, col: q ? qc : F.f.c, v, label: WL(tier) }));
        SHOW.later(mg, tier >= 3 ? 0.5 : 0.16, () => { const tx = F.f.f(this, mg); mg.got.push(F.f.n + '（' + tx + '）'); SHOW.items(this, mg, [{ text: F.f.n, col: C.cream, size: 40 }, { text: tx, col: F.f.c, size: 34 }], { x: CX, y: SY + 420, dy: 48, gap: 0.2 });
          mg.picks++; mg.finD = [1.4, 1.5, 2, 2.6][tier - 1]; this.miniSet(mg.picks >= mg.allow ? 'done' : 'idle'); }); } }
    // watering: the glowing water climbs the veins (1.2 s), the bud flowers (1.2 s), the new fruit swells (0.8 s)
    if (mg.phase === 'water') { const F = mg.fr[mg.fr.length - 1], u = mg.pt; F.grow = cl((u - 2.0) / 0.8, 0, 1);
      if (u > 1.0 && !mg.bloomS) { mg.bloomS = 1; S.mini('tree', 'grow'); }
      if (u > 2.8) { this.miniSet('idle'); this.miniSay('树又结了一个' + F.f.n, F.f.c); S.mini('tree', 'fruit'); SHOW.pop(mg, 'fruit' + (mg.fr.length - 1)); SHOW.burst(mg, F.x, F.y, 16, { col: F.f.c, sp: [100, 300], life: [0.3, 0.6] }); SHOW.ring(mg, F.x, F.y, 10, 120, F.f.c, { life: 0.4 }); } }
    if (mg.phase === 'cut' && !mg.cutDone && mg.pt > 0.5) {
      // 斧子砍下 → 发光的树枝掉下来、图纸展开飞走（中）；被诅咒的话树皮上的眼睛一个个睁开
      mg.cutDone = true; S.mini('tree', 'cut'); this.fx.kick(8); SHOW.shake(mg, 10); const G = TRG(), cx0 = G ? K.lx(G.cut.x) : CX + 230, cy0 = G ? K.ly(G.cut.y) : SY + 320; this.fx.spark(cx0, cy0, C.tan, 14, { v: 600 });
      SHOW.burst(mg, cx0, cy0, 18, { ramp: [C.cream, C.tan, C.brown, C.umber], sp: [120, 360], life: [0.3, 0.7], g: 500 });
      const g = [K.bp('nature', 1)], cursed = rnd() < 0.5 - mg.luck; mg.cutCursed = cursed;
      SHOW.later(mg, 0.55, () => { SHOW.win(this, mg, 2, { x: cx0, y: K.ly(120), col: C.butter }); mg.cutGot = this.award(g, { x: cx0, y: K.ly(130) }); if (mg.cutGot.length) SHOW.items(this, mg, [{ text: mg.cutGot.join('、'), col: C.butter, size: 36 }], { x: CX, y: SY + 440 }); });
      if (cursed) SHOW.later(mg, 1.0, () => { mg.eyesT = mg.t; SHOW.lose(this, mg); SHOW.flash(mg, C.red, 0.4); SHOW.shake(mg, 8); this.fx.kick(5); S.mini('tree', 'curse'); mg.hurt = this.heroHurt(0.1); });
      SHOW.later(mg, cursed ? 1.6 : 1.8, () => { if (this.mini !== mg) return; let tx = '你砍下一根发光的树枝，里面卷着一张图纸。'; if (cursed) tx += '树皮上的眼睛全睁开了。生命 -' + mg.hurt + '。'; const got = mg.cutGot || []; this.miniFinish(tx + (got.length ? '\n获得：' + got.join('、') : ''), cursed ? '#d0453c' : '#9cdc6a'); }); }
    if (mg.phase === 'done' && mg.pt > (mg.finD || 1.0) && !mg.fin) { mg.fin = true; this.miniFinish('世界树的叶子沙沙作响。你收下了：' + mg.got.join('；') + '。', '#9cdc6a'); }
  },
  draw(x, mg) {
    const t = mg.t, fr = mg.fr.map((F, i) => { const xf = SHOW.xf(mg, 'fruit' + i), land = F.land != null ? t - F.land : -1;
      return { k: F.k, x: K.ax(F.x), y: K.ay(F.y), grow: F.grow == null ? 1 : F.grow, gone: land > 1.3, fy: F.fy / 4, ripe: F.ripeT != null && F.drop == null ? cl((t - F.ripeT) / (F.ripeD || 1.8), 0, 1) : F.drop != null ? 1 : 0,
        q: F.q || 0, crack: F.crack || 0, hov: i === mg.hovI ? 1 : xf.k > 1.02 ? 0.5 : 0, land, beat: F.beat != null && t - F.beat < 0.6 ? t - F.beat : -1 }; });
    const wu = mg.phase === 'water' ? mg.pt : mg.watered ? 9 : -1;
    const o = { fruits: fr, sap: wu >= 0 ? (wu < 2.2 ? cl(wu / 1.2, 0, 1) : cl(1 - (wu - 2.2) / 1.2, 0, 1)) : 0, bloom: wu >= 0 ? cl((wu - 1.0) / 1.2, 0, 1) : 0,
      cut: mg.phase === 'cut' ? { a: cl(mg.pt / 0.5, 0, 1) ** 2, hit: mg.pt >= 0.5, branch: cl((mg.pt - 0.5) / 0.55, 0, 1) } : null, eyes: mg.eyesT != null ? cl((t - mg.eyesT) / 0.6, 0, 1) : 0,
      flare: mg.flareT != null ? cl(1 - (t - mg.flareT) / 1.6, 0, 1) : 0, tier: mg.picks ? 2 : 0, dim: mg.phase === 'done' ? cl((mg.pt - (mg.finD || 1) + 0.6) / 0.6, 0, 1) : 0,
      tap: mg.tap ? { x: mg.tap.x, y: mg.tap.y, age: t - mg.tap.t0 } : null };
    if (!K.pxr(x, 'mb_tree', 0, 0, t, o)) K.R(x, SX, SY, SW, SH, '#081410');
    if (mg.phase === 'idle') mg.fr.forEach((F, i) => { if (!F.gone && (F.grow == null || F.grow >= 1)) K.chipC(x, F.f.n, F.x, F.y + 58, F.f.c); });
  } };

// ═════════════════════ 塔罗 / 砸金蛋 · pick from covered things ═════════════════════
const TAROT = [
  { n: '太阳', c: C.gold, ic: 'u_star', good: 1, q: 3, f(g) { return g.buffRun('unitAtk', 0.08, '本局部队攻击 +8%', C.gold); } },
  { n: '月亮', c: C.ice, ic: 't_eye', good: 1, q: 1, f(g) { return g.buffRun('eventLuck', 0.15, '事件好运 +15%', C.ice); } },
  { n: '星星', c: C.violet, ic: 'gem', good: 1, q: 2, f(g, mg) { const got = g.award([K.item(g.run, mg.P)], mg.from); return got.join(''); } },
  { n: '力量', c: C.amber, ic: 't_sword', good: 1, q: 1, f(g) { return g.buffRun('unitAtk', 0.1, '部队攻击 +10%', C.amber); } },
  { n: '隐者', c: C.lime, ic: 't_orb', good: 1, q: 0, rv: () => 50, f(g, mg) { return g.giveExp(50, mg.from); } },
  { n: '魔术师', c: C.magenta, ic: 't_shard', good: 1, q: 1, rv: () => 20, f(g, mg) { return g.giveShards(20, mg.from); } },
  { n: '命运之轮', c: C.butter, ic: 'e_wheel', good: 1, q: 2, rv: (mg) => M.nice(mg.P * 9), f(g, mg) { const v = M.nice(mg.P * 9); g.award([{ k: 'wallet', v }], mg.from); return '积分 +' + v; } },
  { n: '恋人', c: C.pink, ic: 't_heart', good: 1, q: 1, f(g, mg) { const u = M.pick(g.run.roster); if (!u || !M.canAdd(g.run, u.type)) return '没有人可以相爱'; g.award([{ k: 'unit', type: u.type }], mg.from); return M.DB[u.type].n + ' 多了一个伴'; } },
  { n: '高塔', c: C.red, ic: 'r_demon', good: 0, f(g) { return '领袖受伤 ' + g.heroHurt(0.15); } },
  { n: '死神', c: C.steel, ic: 'r_skel', good: 0, f(g, mg) { const u = M.pick(g.run.roster); if (u) g.run.roster = g.run.roster.filter(x => x !== u); g.award([K.bp()], mg.from); return (u ? M.DB[u.type].n + ' 被带走了，' : '') + '留下一张图纸'; } }];
function pickInit(mg, pool, n) { const s = pool.slice().sort(() => rnd() - 0.5); mg.items = s.slice(0, n).map((f, i) => ({ f, x: CX - (n - 1) * 150 + i * 300, y: SY + 330, open: 0, picked: false })); mg.done = 0; mg.got = []; }
// a pixel-cast NPC (pcd module) on the stage: anchor (where it meets the table line) at art (ax, ay), 4× like the stage.
// st = state name, u = seconds into it; idle and move loop, the others play once and hold their last frame.
const NPC_ST = ['idle', 'move', 'attack', 'charge', 'cast', 'recover', 'hurt', 'death'];
// o (optional): { f0 first frame, loop [a, b] frames to cycle once played through, frames [..] an explicit cycle }
function npcFrame(key, st, u, o) {
  const P = M.PCDG; if (!P || !P.has(key)) return null; o = o || {}; const b = P.body(key), si = Math.max(0, NPC_ST.indexOf(st)), d = (b.dur && b.dur[si]) || 1, n = Math.max(1, Math.ceil(d * 12 - 1e-6)), f = Math.floor(u * 12) + (o.f0 || 0);
  let fi; if (o.frames) fi = o.frames[Math.floor(u * 6) % o.frames.length]; else if (st === 'idle' || st === 'move') fi = f % n; else if (o.loop && f > o.loop[1]) fi = o.loop[0] + (f - o.loop[0]) % (o.loop[1] - o.loop[0] + 1); else fi = Math.min(n - 1, f);
  return P.bodyFrame(key, st, fi, o.tint || '', K.ART);
}
function npcDraw(x, c, ax, ay) { if (!c) return false; const sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false; x.drawImage(c, Math.round(K.lx(ax) - c.cx), Math.round(K.ly(ay) - c.footY), c.width, c.height); x.imageSmoothingEnabled = sm; return true; }
function npc(x, key, ax, ay, st, u, o) { return npcDraw(x, npcFrame(key, st, u, o), ax, ay); }
// Pixel stage mb_tarot (+ mb_tarot_fg in front of her): a fortune teller's velvet tent — star lanterns throwing star spots on the
// curtains, a crystal ball, a black cat, three tarot cards floating over the round table. She (pcd module 'teller') sits between the
// two halves. Choosing a card: it squeezes and lifts, she raises her hands, the omen charges beat by beat (SHOW.charge: the card
// trembles, its aura climbs through the quality colours, a crack of light when it steps up, the crystal ball and the star spots
// with it), a frozen instant, then it flips — more turns the better it is — and slams down face up; she recoils at a good card and
// grins at a bad one. The other two turn over after. Leaving: the cards fly back to her hands and she dissolves into smoke.
const TRC = [[90, 106], [150, 106], [210, 106]], TRY = K.ly(106), TRX = (i) => K.lx(TRC[i][0]), TELLER = [150, 126];
const TRP = () => M.PXR && M.PXR.MINIB && M.PXR.MINIB.tarot;
MINI.tarot = { title: '占卜摊', img: 'e_card', col: C.violet, text: '蒙着眼的占卜师把三张牌扣在桌上。「只能翻一张。」',
  init(mg) { pickInit(mg, TAROT, 3); mg.items.forEach((it, i) => { it.x = TRX(i); it.y = TRY; it.flip = 0; it.q = -1; it.crack = 0; }); mg.hovI = -1; mg.tel = { st: 'attack', t0: 0 }; this.miniSet('deal'); S.mini('tarot', 'shuffle'); },
  tel(mg, st) { mg.tel = { st, t0: mg.t }; },
  // 牌早就定了；翻开之前它先悬起来，按预兆一拍一拍加码（可能裂开升格），坏牌一拍就翻
  choose(mg, i) { if (mg.phase !== 'idle') return; const it = mg.items[i]; it.picked = true; mg.cur = i; const q = it.f.good ? it.f.q : -1; it.liftT = mg.t;
    this.miniSet('omen'); S.mini('tarot', 'lift'); SHOW.press(this, mg, 'card' + i, it.x, it.y, C.gold); MINI.tarot.tel(mg, 'charge');
    if (q < 0) { SHOW.later(mg, 0.2, () => MINI.tarot.flip.call(this, mg)); return; }
    SHOW.omen(this, mg, 0); it.q = 0;
    SHOW.charge(this, mg, { x: it.x, y: it.y - 56, q, reveal: false, id: 'card' + i, onBeat: (b, tq, up) => { it.q = tq; mg.beatT = mg.t; S.mini('tarot', 'omen', b); if (up) it.crack = Math.min(1, it.crack + 0.5); },
      onReveal: () => MINI.tarot.flip.call(this, mg) }); },
  // the flip: it turns over (1 half-turn, epic 3, legendary 5) while it falls back to the cloth, then slams down face up
  flip(mg) { const it = mg.items[mg.cur], q = it.f.good ? it.f.q : -1; it.flipT = mg.t; it.flipN = q < 0 ? 1 : [1, 1, 3, 5][q]; it.flipD = 0.2 + 0.1 * (it.flipN - 1); this.miniSet('flip'); S.mini('tarot', 'flip'); MINI.tarot.tel(mg, 'cast'); },
  land(mg) {
    const it = mg.items[mg.cur], q = it.f.good ? it.f.q : -1; it.done = true; it.open = 1; mg.slamT = mg.t; mg.from = { x: it.x, y: it.y }; SHOW.shake(mg, 6);
    if (q >= 0) { const tier = q + 1, qc = QC(q), v = it.f.rv ? it.f.rv(mg) : 0; S.mini('tarot', 'good'); it.glowT = mg.t; MINI.tarot.tel(mg, 'hurt');
      SHOW.win(this, mg, tier, { x: it.x, y: it.y - 20, col: q ? qc : it.f.c, v, label: WL(tier), id: 'card' + mg.cur });
      SHOW.later(mg, tier === 4 ? 0.7 : 0.2, () => { const tx = it.f.f(this, mg); mg.got.push(tx); SHOW.items(this, mg, [{ text: '「' + it.f.n + '」', col: C.cream, size: 40 }, { text: tx, col: it.f.c, size: 34 }], { x: CX, y: SY + 600, dy: 44, gap: 0.2 }); });
      mg.revAt = mg.pt + [0.9, 1.1, 1.7, 2.7][tier - 1]; }
    else { const tx = it.f.f(this, mg); mg.got.push(tx); this.miniSay('「' + it.f.n + '」' + tx, it.f.c, true); S.mini('tarot', 'bad'); this.fx.kick(6); SHOW.flash(mg, C.red, 0.35); SHOW.shake(mg, 8); SHOW.lose(this, mg); it.badT = mg.t; MINI.tarot.tel(mg, 'recover'); mg.revAt = mg.pt + 0.45; }
  },
  btns(mg) { if (mg.phase === 'idle') return mg.items.map((it, i) => ({ t: ['左边', '中间', '右边'][i], sub: '翻开这张', fn: () => MINI.tarot.choose.call(this, mg, i) }));
    if (mg.phase === 'shown') return [{ t: '离开', leave: 1, gold: 1, fn: () => { this.miniSet('leave'); MINI.tarot.tel(mg, 'death'); S.mini('tarot', 'leave'); SHOW.ambient(mg, null); } }]; return []; },
  down(mg, px, py) { const i = mg.items.findIndex(it => Math.abs(px - it.x) < 84 && Math.abs(py - it.y) < 124); if (i >= 0 && mg.phase === 'idle') { MINI.tarot.choose.call(this, mg, i); return; } mg.tap = { x: K.ax(px), y: K.ay(py), n: (mg.tap ? mg.tap.n : 0) + 1 }; return false; },
  tick(mg) {
    const t = mg.t;
    if (mg.phase === 'deal') { if (mg.pt > 1.1) { this.miniSet('idle'); MINI.tarot.tel(mg, 'idle'); } }
    if (mg.phase === 'idle') { const h = mg.items.findIndex(it => Math.abs(mg.mx - it.x) < 84 && Math.abs(mg.my - it.y) < 124); if (h !== mg.hovI) { mg.hovI = h; if (h >= 0) { S.mini('tarot', 'hover', h); SHOW.hover(this, mg, 'card' + h, true); } } } else mg.hovI = -1;
    if (mg.phase === 'flip') { const it = mg.items[mg.cur], u = t - it.flipT; it.flip = Math.min(it.flipN, it.flipN * eo(u / it.flipD)); if (u >= it.flipD && !it.done) MINI.tarot.land.call(this, mg); }
    if (mg.phase === 'flip' && mg.revAt != null && mg.pt > mg.revAt) { this.miniSet('reveal'); if (mg.tel.st !== 'recover') MINI.tarot.tel(mg, 'idle'); }
    if (mg.phase === 'reveal') { mg.items.forEach((it, i) => { if (i === mg.cur) return; const j = i < mg.cur ? i : i - 1, k = cl((mg.pt - j * 0.2) / 0.4, 0, 1); if (k > 0 && !it.flipS) { it.flipS = 1; S.mini('tarot', 'flip'); } it.flip = eo(k); if (k >= 1 && !it.done) { it.done = true; it.open = 1; it.glowT = t; SHOW.pop(mg, 'card' + i, { k0: 0.8 }); } });
      if (mg.pt > 1.2) { this.miniSet('shown'); MINI.tarot.tel(mg, 'idle'); } }
    if (mg.phase === 'leave' && mg.pt > 1.4 && !mg.left) { mg.left = 1; const it = mg.items[mg.cur]; this.miniFinish('你翻开了「' + it.f.n + '」：' + mg.got[0] + '。另外两张是「' + mg.items.filter((_, i) => i !== mg.cur).map(o => o.f.n).join('」「') + '」。', it.f.c); }
  },
  draw(x, mg) {
    const t = mg.t, TP = TRP(), cards = mg.items.map((it, i) => { const xf = SHOW.xf(mg, 'card' + i), sel = mg.cur === i && it.picked;
      let lift = 0; if (sel && it.liftT != null) { const u = t - it.liftT; lift = !it.done ? 14 * eo(u / 0.25) : 14 * (1 - eo((t - mg.slamT) / 0.12)); } else if (mg.hovI === i) lift = 4;
      return { face: TAROT.indexOf(it.f), flip: it.flip || 0, lift, hov: mg.hovI === i ? 1 : 0, lean: mg.hovI === i ? cl((mg.mx - it.x) / 84, -1, 1) : 0, press: xf.white, pop: xf.k - 1,
        q: sel && !it.done ? it.q : sel && it.done && it.f.good ? it.f.q : -1, omen: sel && !it.done && it.q >= 0 ? 0.4 + 0.6 * cl((t - it.liftT) / 1.6, 0, 1) : 0, shake: sel && !it.done && it.q >= 0 ? 0.3 + 0.2 * it.q : 0, crack: it.crack || 0,
        glow: it.glowT != null ? (i === mg.cur ? 0.6 + 0.4 * Math.max(0, 1 - (t - it.glowT)) : 0.3) : 0, dealt: mg.phase === 'deal' ? cl((mg.pt - i * 0.15) / 0.5, 0, 1) : mg.phase === 'leave' ? 1 - cl((mg.pt - i * 0.12) / 0.4, 0, 1) : 1 }; });
    const it = mg.cur != null ? mg.items[mg.cur] : null, charging = mg.phase === 'omen' && it && it.q >= 0;
    const o = { cards, ball: charging ? 0.35 + 0.6 * cl((t - it.liftT) / 1.6, 0, 1) : it && it.done && it.f.good ? Math.max(0.6, 1 - (t - mg.slamT) * 0.5) : 0.25,
      stars: charging ? { spin: 0.6, q: it.q } : it && it.done && it.f.good ? { spin: 0.5, q: it.f.q } : { spin: 0.2, q: -1 }, cat: mg.hovI >= 0 || (mg.tap && mg.tap.n) ? 1 : 0.3,
      tier: it && it.done && it.f.good ? it.f.q + 1 : 0, dim: SHOW.frozen(mg) ? 1 : 0, tap: mg.tap, frontI: mg.frontOK && mg.cur != null && mg.phase !== 'leave' ? mg.cur : undefined }; mg.tarO = o;
    if (!K.pxr(x, 'mb_tarot', 0, 0, t, o)) { K.R(x, SX, SY, SW, SH, '#08040e'); return; }
    // the fortune teller sits between the tent and the table (pcd module 'teller'; her dissolve is her death state)
    const ts = mg.tel.st, tu = t - mg.tel.t0;
    if (ts === 'idle' && mg.hovI >= 0) npc(x, 'teller', TELLER[0], TELLER[1], 'move', tu, { frames: [mg.hovI * 2, mg.hovI * 2 + 1] });   // she leans toward the card under the cursor
    else npc(x, 'teller', TELLER[0], TELLER[1], ts, tu, ts === 'charge' ? { loop: [12, 15] } : ts === 'hurt' ? { f0: 5 } : ts === 'death' ? { f0: 5 } : null);
    K.pxr(x, 'mb_tarot_fg', 0, 0, t, o, 'tarot_fg');
    // the name on the plate of each face-up card
    if (TP) mg.items.forEach((c, i) => { if (i === o.frontI) return; MINI.tarot.plate(x, c, cards[i]); });
  },
  plate(x, c, cd) { if (!(Math.round(cd.flip) % 2) || Math.abs(Math.cos(cd.flip * Math.PI)) < 0.8 || cd.dealt < 1 || Math.abs(cd.pop || 0) > 0.04) return; U.text(x, c.f.n, c.x, c.y + 96 - cd.lift * 4, 22, c.f.good ? C.umber : C.wine, { shadow: false }); },
  // the card being revealed, above the show's dim and rays
  front(x, mg) { mg.frontOK = true; const o = mg.tarO; if (!o || o.frontI == null) return; K.pxr(x, 'mb_tarot_card', 0, 0, mg.t, o, 'tarot_card'); MINI.tarot.plate(x, mg.items[o.frontI], o.cards[o.frontI]); } };

const EGGS = [
  { n: '满满的积分', c: C.gold, ic: 'e_coin', q: 2, rv: (mg) => M.nice(mg.P * 12), f(g, mg) { const v = M.nice(mg.P * 12); g.award([{ k: 'wallet', v }], mg.from); return '积分 +' + v; } },
  { n: 'FEVER 预热', c: C.violet, ic: 'gem', q: 1, f(g) { g.run.mods.feverStart = (g.run.mods.feverStart || 0) + 0.15; return '本局每场战斗开局 FEVER 槽 +15%'; } },
  { n: '一张图纸', c: C.butter, ic: 'scroll', q: 3, f(g, mg) { return g.award([K.bp()], mg.from).join(''); } },
  { n: '一只雏鸟', c: C.green, ic: 'r_beast', q: 1, f(g, mg) { const t = M.pickUnitQ(g.run); if (!M.canAdd(g.run, t)) return '它飞走了'; g.award([{ k: 'unit', type: t }], mg.from); return M.DB[t].n + ' 认你做了主人'; } },
  { n: '空的', c: C.lavender, ic: 'u_mask', q: -1, f() { return '什么也没有'; } },
  { n: '一条蛇', c: C.red, ic: 'r_demon', q: -1, f(g) { return '咬了领袖一口 ' + g.heroHurt(0.08); } }];
const HS = 0.13; // 锤子落下要多久（和 eggs.hammer 的声音对齐）
// Pixel stage mb_eggs (mc-pxroom-minib-eggs.js): a temple-fair night stage — red velvet, festoon bulbs, lanterns, a gong, three
// embossed gold eggs on lacquer drums. The golden hammer follows the cursor; over an egg it rises and the egg rocks. Each blow is a
// beat (SHOW.beat: harder each time, the omen colour leaking through the cracks, a tint flash on the blow that steps it up); the last
// blow freezes a moment, then the shell bursts — the top half spins away, a pillar of light, confetti, the prize pops out spinning;
// the gong rings for a big win, firecrackers go off for the blueprint. Empty and snake: one blow, one beat.
const EGGY = K.ly(92), EGGX = (i) => CX - 300 + i * 300;
const EGD = () => M.PXR && M.PXR.MINIB && M.PXR.MINIB.eggs;
MINI.eggs = { title: '砸金蛋', img: 'e_egg', col: C.gold, text: '三只金蛋在台子上微微发烫。第一锤要钱，第二锤要双倍。',
  init(mg) { pickInit(mg, EGGS, 3); mg.items.forEach((it, i) => { it.x = EGGX(i); it.y = EGGY; it.hitT = -9; }); mg.smash = 0; mg.hovI = -1; mg.bulbs = { mode: 'idle', q: 0 }; },
  EGGS, cost(mg) { return mg.smash ? mg.pay * 2 : mg.pay; },
  // 付一次钱，锤几下由里面是什么决定：空的和蛇一锤就碎；好东西先裂几道缝、缝里漏出预兆色（可能升格），最后一锤才碎
  hit(mg, i) { const it = mg.items[i]; if (mg.phase !== 'idle' || it.picked || mg.smash >= 2) return; if (!this.miniPay(MINI.eggs.cost(mg))) return; mg.smash++; it.picked = true; mg.cur = i;
    const q = it.f.q; it.path = q >= 0 ? SHOW.omenPath(q) : null; it.n = q >= 0 ? 1 + it.path.length : 1; it.k = 0; it.cr = 0; it.q = it.path ? it.path[0] : 0;
    mg.st = [0]; for (let j = 1; j < it.n; j++) mg.st.push(mg.st[j - 1] + 0.34 + 0.08 * j + (j === it.n - 1 && q >= 2 ? 0.3 : 0)); mg.sw = 1; mg.idleAt = null; mg.bulbs = { mode: 'chase', q: 0 };
    this.miniSet('smash'); S.mini('eggs', 'hammer', 0); SHOW.press(this, mg, 'egg' + i, it.x, it.y - 40, C.gold); },
  btns(mg) { if (mg.phase !== 'idle') return []; const b = mg.smash < 2 ? mg.items.map((it, i) => ({ t: '砸' + ['左', '中', '右'][i] + '蛋', sub: MINI.eggs.cost(mg) + ' 积分', dis: it.picked || this.run.wallet < MINI.eggs.cost(mg), why: it.picked ? '已经砸开了' : '积分不够', fn: () => MINI.eggs.hit.call(this, mg, i) })) : [];
    b.push({ t: '离开', leave: 1, gold: mg.smash >= 2, fn: () => { this.miniSet('leave'); mg.bulbs = { mode: 'off', q: 0 }; S.mini('eggs', 'leave'); SHOW.ambient(mg, null); } }); return b; },
  down(mg, px, py) { const i = mg.items.findIndex(it => Math.abs(px - it.x) < 90 && Math.abs(py - it.y) < 110); if (i >= 0) { MINI.eggs.hit.call(this, mg, i); return; } mg.tap = { x: K.ax(px), n: (mg.tap ? mg.tap.n : 0) + 1 }; S.mini('eggs', 'tap'); return false; },
  impact(mg, it, j) {
    const q = it.f.q, i = mg.cur; it.hitT = mg.t;
    if (j < it.n - 1) { // 裂一道：蛋一缩、壳屑飞、缝里透出预兆色；一锤比一锤重，升一档那锤染色闪 + 白环
      const qn = it.path[j], up = j > 0 && qn > it.path[j - 1]; it.cr = (j + 1) / (it.n - 1); it.q = qn; S.mini('eggs', 'hammer', j + 1);
      SHOW.beat(this, mg, it.x, it.y - 30, j, qn, up || j === 0, 'egg' + i); this.fx.spark(it.x, it.y - 40, C.gold, 6, { v: 380, w: 4 });
      if (j === 0) SHOW.omen(this, mg, qn);
      if (j === it.n - 2 && q >= 2) SHOW.reach(this, mg, { x: it.x, y: it.y, r: 150, lv: q >= 3 ? 2 : 1 });
      return; }
    const good = q >= 0;
    const burst = () => { it.done = true; it.open = 1; it.openT = mg.t; it.cr = 1; it.q = good ? q : 0; mg.from = { x: it.x, y: it.y }; S.mini('eggs', 'crack'); SHOW.calm(mg);
      if (good) { const tier = q + 1, qc = QC(q), v = it.f.rv ? it.f.rv(mg) : 0; S.mini('eggs', 'burst', q); mg.bulbs = { mode: 'strobe', q }; mg.confT = mg.t; if (tier >= 3) mg.gongT = mg.t; if (tier >= 4) mg.popT = mg.t;
        this.fx.kick(4 + q * 3); SHOW.later(mg, 0.02, () => { SHOW.win(this, mg, tier, { x: it.x, y: tier >= 4 ? it.y - 20 : it.y - 60, col: q ? qc : it.f.c, v: tier >= 4 ? v : 0, label: WL(tier) }); if (v && tier < 4) SHOW.roll(mg, v, it.x, it.y + 110, q ? qc : it.f.c, [0.4, 0.8, 1.3][tier - 1]); });   // the stamp sits above the floating prize, the number rolls under it
        SHOW.later(mg, tier === 4 ? 0.7 : 0.25, () => { const tx = it.f.f(this, mg); mg.got.push(it.f.n + '：' + tx); S.mini('eggs', 'prize'); SHOW.items(this, mg, [{ text: it.f.n, col: C.cream, size: 40 }, { text: tx, col: it.f.c, size: 34 }], { x: CX, y: SY + 540, dy: 46, gap: 0.2 }); });
        mg.idleAt = mg.pt + [0.9, 1.2, 1.8, 2.8][tier - 1]; }
      else { const tx = it.f.f(this, mg); mg.got.push(it.f.n + '：' + tx); this.miniSay(it.f.n + '！' + (it.f.n === '一条蛇' ? tx : ''), it.f.c, true); mg.bulbs = { mode: 'idle', q: 0 };
        if (it.f.n === '一条蛇') { S.mini('eggs', 'snake'); SHOW.flash(mg, C.red, 0.4); SHOW.shake(mg, 8); this.fx.kick(5); } else { S.mini('eggs', 'empty'); SHOW.burst(mg, it.x, it.y - 30, 14, { ramp: [C.cream, C.lavender, C.haze, C.indigo], sp: [40, 140], ang: -Math.PI / 2, spread: 1.6, life: [0.4, 0.8] }); this.fx.kick(2); }
        SHOW.lose(this, mg); mg.idleAt = mg.pt + 0.4; } };
    // 最后一锤：好东西先卡帧（全场压黑，只剩蛋），再碎开；空的和蛇直接碎
    if (good) SHOW.hitstop(mg, 0.15, it.x, it.y - 20, burst); else burst();
  },
  tick(mg, dt) {
    const t = mg.t;
    if (mg.phase === 'idle') { const h = mg.items.findIndex(it => !it.picked && Math.abs(mg.mx - it.x) < 90 && Math.abs(mg.my - it.y) < 110); if (h !== mg.hovI) { mg.hovI = h; if (h >= 0) { S.mini('_', 'hover'); SHOW.hover(this, mg, 'egg' + h, true); } } } else mg.hovI = -1;
    if (mg.phase === 'smash') { const it = mg.items[mg.cur];
      while (mg.sw < it.n && mg.pt >= mg.st[mg.sw]) { mg.sw++; S.mini('eggs', 'swing'); }
      while (it.k < it.n && mg.pt >= mg.st[it.k] + HS) MINI.eggs.impact.call(this, mg, it, it.k++);
      if (mg.idleAt != null && mg.pt > mg.idleAt) { this.miniSet('idle'); if (mg.bulbs.mode === 'strobe') mg.bulbs = { mode: 'chase', q: mg.bulbs.q }; } }
    if (mg.phase === 'leave' && mg.pt > 1.3 && !mg.left) { mg.left = 1; this.miniFinish(mg.got.length ? '蛋壳里是：' + mg.got.join('；') + '。' : '你没舍得砸。', mg.got.length ? '#ffcc33' : '#8d8496'); }
  },
  // the hammer: follows the cursor; over an egg it rises; during a smash it winds up and falls (accelerating, smeared), springs back
  // between blows and flies up out of the light after the last
  hammer(mg) {
    const G = EGD(), t = mg.t; if (!G) return { show: false };
    const idleP = { x: K.ax(mg.mx) + 6, y: K.ay(mg.my) + 14, a: 0.3, show: mg.phase !== 'leave' };
    if (mg.phase === 'idle') { if (mg.hovI >= 0) return Object.assign({ show: true }, G.raise(mg.hovI)); return idleP; }
    if (mg.phase !== 'smash') return idleP;
    const it = mg.items[mg.cur], R = G.raise(mg.cur), Kp = G.strike(mg.cur); let j = 0; while (j + 1 < mg.st.length && mg.pt >= mg.st[j + 1]) j++;
    const u = mg.pt - mg.st[j], last = j === mg.st.length - 1;
    if (u < HS) { const p = (u / HS) * (u / HS); return { x: R.x + (Kp.x - R.x) * p, y: R.y + (Kp.y - R.y) * p, a: R.a + (Kp.a - R.a) * p, smear: p > 0.3 ? 1 : 0, w: -1, show: true }; }
    if (!last) { const p = eo((u - HS) / 0.22); return { x: Kp.x + (R.x - Kp.x) * p, y: Kp.y + (R.y - Kp.y) * p, a: Kp.a + (R.a - Kp.a) * p, show: true }; }
    const p = eo((u - HS) / 0.28); return { x: Kp.x + (R.x + 26 - Kp.x) * p, y: Kp.y + (R.y - 30 - Kp.y) * p, a: Kp.a + (R.a + 0.6 - Kp.a) * p, show: u - HS < 0.5 };
  },
  draw(x, mg) {
    const t = mg.t, eggs = mg.items.map((it, i) => { const xf = SHOW.xf(mg, 'egg' + i); return { cr: it.cr || 0, q: it.q || 0, hit: Math.max(0, Math.exp(-(t - it.hitT) * 14)), wob: mg.hovI === i ? Math.sin(t * 20) * 0.6 : undefined, hov: mg.hovI === i ? 1 : xf.white > 0.1 ? 0.5 : 0,
      open: !!it.open, openAge: it.openT != null ? t - it.openT : 0, prize: Math.max(0, EGGS.indexOf(it.f)) }; });
    const o = { eggs, hammer: MINI.eggs.hammer(mg), bulbs: mg.bulbs, gong: mg.gongT != null ? cl(1 - (t - mg.gongT) / 2, 0, 1) : 0, pop: mg.popT != null ? cl(1 - (t - mg.popT) / 1.6, 0, 1) : 0, confetti: mg.confT != null ? cl(1 - (t - mg.confT) / 2.5, 0, 1) : 0,
      tier: mg.got.length && mg.bulbs.mode !== 'idle' ? 2 : 0, leave: mg.phase === 'leave' ? cl(mg.pt / 1.2, 0, 1) : 0, tap: mg.tap, front: !!mg.frontOK };
    mg.eggO = o; if (!K.pxr(x, 'mb_eggs', 0, 0, t, o)) K.R(x, SX, SY, SW, SH, '#100604');
  },
  // drawn after the show's dim and rays: the opened egg's pillar of light and its prize stay the brightest thing on stage
  front(x, mg) { mg.frontOK = true; if (mg.eggO && mg.items.some(it => it.open)) K.pxr(x, 'mb_eggs_front', 0, 0, mg.t, mg.eggO, 'eggs_front');
  } };

// ═════════════════════ 骰子对决 ═════════════════════
const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
K.die = (x, a, b, s, v, rot, col) => { x.save(); x.translate(a, b); x.rotate(rot || 0); K.RR(x, -s / 2, -s / 2, s, s, s * 0.18, col || C.cream, C.ink, 3); (pips[v] || []).forEach(([i, j]) => K.CI(x, i * s * 0.26, j * s * 0.26, s * 0.09, v === 1 ? C.red : C.ink)); x.restore(); };
// Pixel stage mb_dice (+ mb_dice_fg in front of him): an underground gambling den — the portrait whose eyes follow you, a clock at a
// minute to midnight, bottles, a green-shaded lamp swinging over an oval felt table, chip stacks that follow your winnings. The dice
// are real 3D bone cubes (MB.dice.orient / rot / teeter). He (pcd module 'tophat') sits between the halves. A round: your chips slide
// to the pot, he shakes his cup and slams it; his dice show when it lifts; yours are thrown from your side and bounce (each bounce a
// beat) — when your second die decides the round it rolls over a few more faces and teeters on an edge under the lamp he pulls over,
// a frozen instant, then it falls on the real face. Win: the pot avalanches to you and he recoils; lose: he rakes it in, grinning.
const DG = () => M.PXR && M.PXR.MINIB && M.PXR.MINIB.dice, DPRE = 0.55, TOPHAT = [150, 62], DCUPY = 73;   // DCUPY: where his cup's mouth meets the felt when he slams it
const DTG = [[135, 84], [165, 84], [134, 128], [165, 128]], DFROM = [50, 150], DYAW = [0.4, -0.3, -0.5, 0.35];
const dadj = (a, b) => a !== b && a + b !== 7;
MINI.dice = { title: '骰子对决', img: 't_dice', col: C.cream, text: '一个戴高帽的影子把两颗骨骰推到你面前。「比大小，三局。」',
  init(mg) { mg.round = 0; mg.max = 3; mg.net = 0; mg.wins = 0; mg.me = [3, 4]; mg.him = [5, 2]; mg.chips = { mine: 12, his: 14, pot: 0 }; mg.slide = null; mg.tel = { st: 'idle', t0: 0 }; mg.hovC = false; },
  tel(mg, st, o) { mg.tel = { st, t0: mg.t, o }; },
  slide(mg, from, to, n, dur) { mg.slide = { from, to, n, t0: mg.t, d: dur || 0.5 }; S.mini('dice', 'chips', n); },
  roll(mg, big) { const stake = big ? M.nice(mg.pay * 2.5) : mg.pay; if (!this.miniPay(stake)) return; mg.stake = stake; mg.round++; mg.net -= stake; SHOW.calm(mg);
    const r = () => 1 + Math.floor(rnd() * 6); mg.me = [r(), r()]; mg.him = [r(), r()]; if (mg.luck && rnd() < mg.luck && mg.me[0] + mg.me[1] <= mg.him[0] + mg.him[1]) mg.me = [r(), r()];
    mg.bigBet = big; MINI.dice.plan.call(this, mg); },
  // 点数这一刻就定了。他的两颗先停，你的第一颗再停；第二颗能决定胜负时，它多翻几面、在棱上打转 0.6 秒再倒——
  // 棱的另一面正好是「差一点就……」的那一面（赢的时候是会输的那面，输的时候是会赢的那面）
  plan(mg) {
    const r = () => 1 + Math.floor(rnd() * 6), big = mg.bigBet, a0 = mg.me[0], b = mg.him[0] + mg.him[1], need = b - a0 + 1; mg.dec = a0 + 1 <= b && a0 + 6 > b; mg.tw = a0 + mg.me[1] > b ? need - 1 : need;
    if (mg.dec && !dadj(mg.tw, mg.me[1])) mg.dec = false;   // the near-miss face is the real face's opposite: no edge between them to teeter on
    mg.ST = [1.15, 1.45, 0.75, 0.95].map(v => v + DPRE); mg.res = 0; mg.idleAt = null; mg.rw = 0; mg.beatN = 0;
    // the faces the deciding die rolls over (each next to the one before), ending on the near-miss face it teeters from
    if (mg.dec) { let tt = mg.ST[1]; mg.ft = []; mg.fl = [mg.tw]; for (let k = 0; k < 3; k++) { let f; do f = r(); while (!dadj(f, mg.fl[0])); mg.fl.unshift(f); }
      for (let k = 0; k < 3; k++) { tt += 0.12 + 0.05 * k; mg.ft.push(tt); } mg.tee0 = tt + 0.16; mg.tee1 = mg.tee0 + 0.6; mg.resAt = mg.tee1 + 0.2; }
    else mg.resAt = mg.ST[1] + 0.2;
    const n = big ? 5 : 3; mg.bet = n; mg.chips.mine = Math.max(0, mg.chips.mine - n); MINI.dice.slide(mg, 'me', 'pot', n, 0.45);
    this.miniSet('roll'); S.mini('dice', 'shake'); MINI.dice.tel(mg, 'attack', { f0: 1 }); SHOW.press(this, mg, 'bet', K.lx(70), K.ly(140), C.gold); },
  btns(mg) { if (mg.phase === 'leave') return []; if (mg.phase !== 'idle') return []; const over = mg.round >= mg.max, big = M.nice(mg.pay * 2.5);
    return [{ t: '小注', sub: mg.pay + ' 积分 · 赢了拿双倍', dis: over || this.run.wallet < mg.pay, why: over ? '三局打完了' : '积分不够', fn: () => MINI.dice.roll.call(this, mg, false) }, { t: '大注', sub: big + ' 积分 · 赢了拿双倍', gold: !over, dis: over || this.run.wallet < big, why: over ? '三局打完了' : '积分不够', fn: () => MINI.dice.roll.call(this, mg, true) },
      { t: '离开', leave: 1, gold: over, fn: () => { this.miniSet('leave'); MINI.dice.tel(mg, 'death', { f0: 4 }); S.mini('dice', 'leave'); SHOW.ambient(mg, null); } }]; },
  down(mg, px, py) { mg.puff = { x: K.ax(px), y: K.ay(py), t0: mg.t }; if (mg.phase === 'idle') MINI.dice.tel(mg, 'move'); S.mini('dice', 'tap'); return false; },
  // the pose of die i this frame (the real 3D cube): his come out from under the cup, yours fly and tumble in, the deciding one rolls
  // over its faces, teeters, falls. Returns { x, y, h, m, glow } in art px, or null while it is hidden
  die(mg, i) {
    const D = DG(); if (!D) return null; const u = mg.pt, T = mg.ST, fin = i < 2 ? mg.him[i] : mg.me[i - 2], glow = i >= 2 && mg.rw && mg.me[0] === 6 && mg.me[1] === 6 ? 1 : 0;
    if (mg.phase !== 'roll') return { x: DTG[i][0], y: DTG[i][1], h: 0, m: D.orient(fin, DYAW[i]), glow };
    if (i < 2) return u >= T[2] ? { x: DTG[i][0], y: DTG[i][1], h: 0, m: D.orient(fin, DYAW[i]) } : null;
    const k = i - 2, p = cl((u - DPRE) / (T[k] - DPRE), 0, 1);
    if (u < DPRE) return { x: DTG[i][0], y: DTG[i][1], h: 0, m: D.orient(k ? mg.prev1 || 4 : mg.prev0 || 3, DYAW[i]), hidden: 1 };
    const x = DFROM[0] + (DTG[i][0] - DFROM[0]) * eo(p), y = DFROM[1] + (DTG[i][1] - DFROM[1]) * eo(p), h = Math.abs(Math.sin(p * Math.PI * 3)) * 18 * (1 - p);
    const face0 = i === 3 && mg.dec ? mg.fl[0] : fin;
    if (p < 1) return { x, y, h, m: D.rot(D.orient(face0, DYAW[i]), [0.6, 1, 0.3 + k * 0.2], (1 - p) * 16) };
    if (i !== 3 || !mg.dec) return { x, y, h: 0, m: D.orient(fin, DYAW[i]), glow };
    if (u < mg.tee0) { let j = 0; while (j < mg.ft.length && u >= mg.ft[j]) j++; const t0 = j ? mg.ft[j - 1] : T[1], nx = mg.ft[j] == null ? mg.tee0 : mg.ft[j], hp = cl((u - t0) / Math.min(0.14, nx - t0), 0, 1);
      return { x, y, h: 0, m: j < mg.fl.length - 1 ? D.teeter(mg.fl[j], mg.fl[j + 1], DYAW[i], -1 + 2 * eo(hp)) : D.orient(mg.fl[mg.fl.length - 1], DYAW[i]) }; }
    if (u < mg.tee1) { const w = (u - mg.tee0) / (mg.tee1 - mg.tee0), up = eo(w / 0.15), wob = Math.sin(w * Math.PI * 5 + Math.PI) * 0.28 * up; return { x, y, h: 0, m: D.teeter(mg.tw, fin, DYAW[i], -1 + up + wob) }; }
    const p2 = cl((u - mg.tee1) / 0.12, 0, 1); return { x, y, h: 0, m: D.teeter(mg.tw, fin, DYAW[i], p2 * p2), glow };
  },
  tick(mg) {
    const t = mg.t, u = mg.pt, D = DG(), sl = mg.slide;
    // a stream of chips arrives: the stack it went to grows
    if (sl && t - sl.t0 >= sl.d) { if (sl.to === 'me') mg.chips.mine = Math.min(20, mg.chips.mine + sl.n); else if (sl.to === 'him') mg.chips.his = Math.min(20, mg.chips.his + sl.n); else if (sl.to === 'pot') mg.chips.pot += sl.n; mg.slide = null; }
    if (mg.phase === 'idle') { const on = K.ay(mg.my) > 118 && K.ax(mg.mx) < 120; if (on && !mg.hovC) S.mini('_', 'hover'); mg.hovC = on; if (on && mg.tel.st === 'idle') MINI.dice.tel(mg, 'move'); else if (!on && mg.tel.st === 'move' && t - mg.tel.t0 > 0.8) MINI.dice.tel(mg, 'idle'); }
    if (mg.phase === 'leave') { if (mg.pt > 1.6 && !mg.left) { mg.left = 1; this.miniFinish(mg.net > 0 ? '影子把 ' + M.fmt(mg.net) + ' 积分推给了你，然后消失了。' : mg.net < 0 ? '影子收走了你 ' + M.fmt(-mg.net) + ' 积分。' : '你们握了握手。影子的手是冰的。', mg.net > 0 ? '#ffcc33' : '#8d8496'); } return; }
    if (mg.phase !== 'roll') return; const b = mg.him[0] + mg.him[1];
    // his cup: shaken while the chips slide, slammed down, lifted when his dice settle
    if (u >= DPRE - 0.25 && !mg.slammed) { mg.slammed = 1; MINI.dice.tel(mg, 'cast'); S.mini('dice', 'slam'); SHOW.shake(mg, 6); mg.puff = { x: TOPHAT[0] - 13, y: DCUPY + 3, t0: t }; }
    if (u >= mg.ST[2] - 0.2 && !mg.lifted) { mg.lifted = 1; MINI.dice.tel(mg, 'recover', { f0: 1 }); S.mini('dice', 'clack'); }   // his lift frame (3) lands as his dice show
    // your dice: every time one comes down on the felt it is a beat (a thud, a puff, a little harder each time)
    [2, 3].forEach(i => { const k = i - 2, p = cl((u - DPRE) / (mg.ST[k] - DPRE), 0, 1), bounce = Math.floor(p * 3); const key = 'bn' + i; if (u > DPRE && p < 1 && bounce > (mg[key] || 0)) { mg[key] = bounce; const d = MINI.dice.die(mg, i); if (d) { mg.puff = { x: d.x, y: d.y, t0: t }; const n = mg.beatN++; S.mini('dice', 'bounce', n); SHOW.shake(mg, 1 + n); SHOW.ring(mg, K.lx(d.x), K.ly(d.y), 4, 34 + n * 6, C.cream, { life: 0.25 }); } } });
    [0, 1, 2, 3].forEach(i => { const key = 'st' + i, at = i < 2 ? mg.ST[i + 2] : i === 3 && mg.dec ? mg.tee1 + 0.12 : mg.ST[i - 2]; if (u >= at && !mg[key]) { mg[key] = 1; const d = MINI.dice.die(mg, i); if (!d) return; S.mini('dice', 'clack'); SHOW.shake(mg, i === 3 && mg.dec ? 6 : 2); mg.puff = { x: d.x, y: d.y, t0: t };
      if (i === 2 && mg.dec) { SHOW.reach(this, mg, { x: K.lx(DTG[3][0]), y: K.ly(DTG[3][1]), r: 110, lv: mg.me[0] === 6 && b < 12 ? 2 : 1 }); mg.lampTo = DTG[3]; } } });
    // the deciding die: each face it rolls over is a beat; on the edge the heartbeat; the frozen instant before it falls
    if (mg.dec) { let j = 0; while (j < mg.ft.length && u >= mg.ft[j]) j++; if (j !== mg.fj) { mg.fj = j; if (j) { SHOW.crawl(this, mg, j); S.mini('dice', 'clack'); } }
      if (u >= mg.tee1 && !mg.froze) { mg.froze = 1; SHOW.hitstop(mg, 0.15, K.lx(DTG[3][0]), K.ly(DTG[3][1])); } }
    if (u >= mg.resAt && !mg.res) { mg.res = 1; mg.resT = t; const a = mg.me[0] + mg.me[1]; let v = 0, tier = 0; mg.lampTo = null; const dx = K.lx(150), dy = K.ly(128);
      if (a > b) { const dbl = mg.me[0] === 6 && mg.me[1] === 6; v = mg.stake * (dbl ? 3 : 2); tier = dbl ? 2 : 1; mg.wins++; mg.rw = 1; S.mini('dice', 'win'); MINI.dice.tel(mg, 'hurt', { f0: 4 }); mg.flareT = t;
        mg.chips.his = Math.max(0, mg.chips.his - mg.bet * (dbl ? 2 : 1)); MINI.dice.slide(mg, 'pot', 'me', mg.bet * (dbl ? 3 : 2), 1.2); mg.chips.pot = 0;
        SHOW.later(mg, 0.06, () => SHOW.win(this, mg, tier, { x: dx, y: dy, col: C.gold, v, label: dbl ? '×3' : '' })); SHOW.later(mg, 0.2, () => SHOW.items(this, mg, [{ text: a + ' 比 ' + b, col: C.gold, size: 44 }], { x: CX, y: SY + 300 })); }
      else if (a === b) { v = mg.stake; S.mini('dice', 'tie'); MINI.dice.slide(mg, 'pot', 'me', mg.bet, 0.5); mg.chips.pot = 0; SHOW.items(this, mg, [{ text: a + ' 比 ' + b + '，平局', col: C.cream, size: 40 }], { x: CX, y: SY + 300 }); if (mg.dec) SHOW.near(this, mg, K.lx(DTG[3][0]), K.ly(DTG[3][1]), '差一点！'); else SHOW.calm(mg); }
      else { S.mini('dice', 'lose'); MINI.dice.tel(mg, 'recover', { f0: 4, loop: [5, 8] }); mg.rakeT = t; MINI.dice.slide(mg, 'pot', 'him', mg.bet, 0.5); mg.chips.pot = 0; SHOW.items(this, mg, [{ text: a + ' 比 ' + b, col: C.red, size: 40 }], { x: CX, y: SY + 300 }); if (mg.dec) SHOW.near(this, mg, K.lx(DTG[3][0]), K.ly(DTG[3][1]), '差一点！'); else SHOW.lose(this, mg); }
      if (v) { mg.net += v; SHOW.later(mg, tier ? 0.14 : 0, () => this.award([{ k: 'wallet', v }], { x: dx, y: dy })); }
      mg.idleAt = mg.pt + (tier ? 1.2 : 0.6);
      // 三局打完还赚着：评级章砸下，再按全胜 / 小胜走中奖档，滚一遍总盈利；全胜时他散成一缕烟，只剩帽子
      if (mg.round >= mg.max && mg.net > 0) { const gr = mg.wins >= 3 ? 'S' : mg.wins >= 2 ? 'A' : 'B'; mg.idleAt = mg.pt + 1.8;
        SHOW.later(mg, 0.8, () => { SHOW.grade(this, mg, gr, SX + SW - 190, SY + 330); SHOW.win(this, mg, gr === 'S' ? 3 : 2, { x: CX, y: SY + 400, col: C.gold, v: mg.net, label: gr === 'S' ? '大赢' : '' }); if (gr === 'S') MINI.dice.tel(mg, 'death', { f0: 4 }); }); } }
    if (mg.idleAt != null && mg.pt >= mg.idleAt) { this.miniSet('idle'); ['bn2', 'bn3', 'st0', 'st1', 'st2', 'st3', 'slammed', 'lifted', 'froze', 'fj'].forEach(k => { mg[k] = 0; }); mg.prev0 = mg.me[0]; mg.prev1 = mg.me[1]; if (mg.tel.st !== 'death') MINI.dice.tel(mg, 'idle'); }
  },
  draw(x, mg) {
    const t = mg.t, D = DG(), u = mg.pt, sl = mg.slide, sp = sl ? cl((t - sl.t0) / sl.d, 0, 1) : 1;
    const roll = mg.phase === 'roll', cupShake = roll && u < DPRE - 0.25;
    // his cup sits by his elbow until his hands hold it: then its mouth follows the frame's focus (the hands); let go, it hops back
    const th = npcFrame('tophat', mg.tel.st, t - mg.tel.t0, mg.tel.o), f = th && th.focus && [th.focus[0] / K.ART, th.focus[1] / K.ART], hold = !!(f && f[1] > -15), rest = D ? { x: D.cup[0], y: D.cup[1], lift: 0 } : null;
    let cup = null; if (D) { const tg = hold ? { x: TOPHAT[0] + f[0], y: DCUPY, lift: cl((DCUPY - TOPHAT[1] - f[1]) / 26, 0, 1) } : rest;
      if (hold !== !!mg.cupH) { mg.cupH = hold; mg.cupFrom = mg.cupNow || rest; mg.cupT = t; }
      const cp = eo(cl((t - (mg.cupT || 0)) / (hold ? 0.08 : 0.3), 0, 1)), cf = mg.cupFrom || rest;
      cup = { x: cf.x + (tg.x - cf.x) * cp, y: cf.y + (tg.y - cf.y) * cp, lift: cf.lift + (tg.lift - cf.lift) * cp + (hold ? 0 : Math.sin(Math.PI * cp) * 0.25), shake: cupShake ? 1 : 0, tilt: cupShake ? 0.15 * Math.sin(t * 38) : 0 }; mg.cupNow = cup; }
    const o = { dice: D ? [0, 1, 2, 3].map(i => MINI.dice.die(mg, i)).filter(d => d && !d.hidden) : [], cup,
      chips: { mine: mg.chips.mine, his: mg.chips.his, pot: mg.chips.pot, hov: mg.phase === 'idle' && mg.hovC ? 1 : 0, slide: sl && sp < 1 ? { from: sl.from, to: sl.to, n: sl.n, p: sp } : null }, rake: mg.rakeT != null && t - mg.rakeT < 0.8 ? (t - mg.rakeT < 0.25 ? eo((t - mg.rakeT) / 0.25) : 1 - eo((t - mg.rakeT - 0.25) / 0.5)) : 0,
      lamp: { to: mg.lampTo ? { x: mg.lampTo[0], y: mg.lampTo[1] } : null, flare: mg.flareT != null ? cl(1 - (t - mg.flareT) * 0.8, 0, 1) : 0 }, eyes: { x: K.ax(mg.mx), y: K.ay(mg.my) },
      puff: mg.puff ? { x: mg.puff.x, y: mg.puff.y, age: t - mg.puff.t0 } : null, tier: mg.rw && mg.res && t - mg.resT < 3 ? 2 : 0 };
    if (!K.pxr(x, 'mb_dice', 0, 0, t, o)) { K.R(x, SX, SY, SW, SH, '#06100a'); return; }
    // he sits between the room and the table (pcd module 'tophat'; three rounds lost or you leaving: his dissolve)
    npcDraw(x, th, TOPHAT[0], TOPHAT[1]);
    K.pxr(x, 'mb_dice_fg', 0, 0, t, o, 'dice_fg');
    // the sums beside each pair, popping in when the round is decided; the round and the running net on the wall
    if ((mg.phase !== 'roll' || mg.res) && mg.round) { const pt = t - (mg.resT || 0); K.big(x, String(mg.me[0] + mg.me[1]), K.lx(196), K.ly(128), T.num, C.gold, pt, { num: true }); K.big(x, String(mg.him[0] + mg.him[1]), K.lx(196), K.ly(82), T.num, C.pink, pt, { num: true }); }
    K.sign(x, '第 ' + Math.min(mg.max, Math.max(1, mg.round)) + ' / ' + mg.max + ' 局', SX + 150, SY + 150, { kind: 'indigo', size: T.body }); U.text(x, (mg.net >= 0 ? '+' : '') + M.fmt(mg.net), SX + SW - 150, SY + 150, T.title, mg.net >= 0 ? C.gold : C.red, { num: true });
  } };

// ═════════════════════ 命运之轮 · pay in blood, spin the stone wheel ═════════════════════
// A real stone wheel (pixel stage mb_fate, mc-pxroom-minib.js): the disc itself turns, slows down like something heavy and stops
// with a sector under the pointer (user ruling 2026-09-25; 2026-09-27: 「最后转那几下应该制造悬念，慢慢停止，然后根据大奖给不同的反馈」).
// The result is drawn when you pay; the show only picks how the wheel comes to rest:
//   a gold sector — it creeps up to the stud in front of it, hangs there with the pointer bent (spotlight, heartbeat), then tips over;
//   just short of gold — it hangs on that stud and rolls back;  just past gold — it crawls through the gold sector and slips off its
//   far end;  anything else — a plain slow stop. Each stud in the last stretch is a beat; then every prize has its own reveal.
const FATE = [{ n: '空', c: C.haze, w: 16 }, { n: '部队攻击 +8%', c: C.magenta, w: 16 }, { n: '部队', c: C.blue, w: 16 }, { n: 'FEVER', c: C.violet, w: 14 }, { n: '图纸', c: C.tan, w: 12 }, { n: '积分', c: C.gold, w: 16 }, { n: '诅咒', c: C.red, w: 10 }];
const SEG = Math.PI * 2 / FATE.length, FN = FATE.length;
// 每格的中奖档（0 = 没中）；部队攻击和图纸是「金格」
const FT = [0, 3, 2, 2, 3, 2, 0], TOPF = (k) => FT[k] >= 3;
// where things are on the stage (logical px): the pointer's tip, the hub, the sector under the pointer, the bronze name plate
const FPT = { x: K.lx(150), y: K.ly(43) }, FHUB = { x: K.lx(150), y: K.ly(92) }, FSEC = { x: K.lx(150), y: K.ly(62) }, FPL = { x: K.lx(150), y: K.ly(145) };
// the spin: 1.7 s of blood price (drop 0.55 · grooves fill 0.5 · names light 0.4 · the wheel leans back 0.25), 0.4 s to full speed,
// then friction: velocity falls smoothly to nothing ((1 − p)², so the last sector or so goes by at a crawl), then the ending
const FPRE = 1.7, FUP = 0.4, FW0 = 18, FSTUD = 0.02;
const fSector = (a) => ((Math.floor(-a / SEG) % FN) + FN) % FN;
function fatePlan(a0, idx) {
  const kind = TOPF(idx) ? 'gold' : TOPF((idx + FN - 1) % FN) ? 'short' : TOPF((idx + 1) % FN) ? 'scrape' : 'plain';
  const edge = (j) => -(j + 1) * SEG;   // the angle (mod 2π) at which sector j comes under the pointer (the disc turns forward)
  let stop, fin;
  if (kind === 'gold') { stop = edge(idx) - FSTUD; fin = edge(idx) + (0.2 + rnd() * 0.15) * SEG; }
  else if (kind === 'short') { stop = edge((idx + FN - 1) % FN) - FSTUD; fin = stop - (0.18 + rnd() * 0.05) * SEG; }
  else if (kind === 'scrape') { stop = edge(idx) - FSTUD; fin = edge(idx) + (0.05 + rnd() * 0.04) * SEG; }
  else { stop = edge(idx) + (0.3 + rnd() * 0.4) * SEG; fin = stop; }
  const a1 = a0 + FW0 * FUP / 2, T = Math.PI * 2, dec = stop + T * Math.ceil((a1 + 22 - stop) / T), L = dec - a1, Td = 3 * L / FW0;
  const hold = kind === 'gold' ? 0.85 : kind === 'short' ? 0.7 : kind === 'scrape' ? 0.5 : 0, move = kind === 'gold' ? 0.3 : kind === 'short' ? 0.5 : kind === 'scrape' ? 0.35 : 0;
  return { idx, kind, a0, a1, dec, fin: dec + (fin - stop), L, Td, hold, move, t3: FPRE + FUP + Td, end: FPRE + FUP + Td + hold + move, s: 0, done: false, beat: 0, reach: false, lastSeg: Math.floor(a0 / SEG) };
}
function fateAngle(P, s) {
  if (s < FPRE) { const q = (s - (FPRE - 0.25)) / 0.25; return P.a0 - (q > 0 ? 0.07 * Math.sin(Math.PI * Math.min(1, q)) : 0); }
  if (s < FPRE + FUP) { const u = s - FPRE; return P.a0 + FW0 * u * u / (2 * FUP); }
  if (s < P.t3) { const p = (s - FPRE - FUP) / P.Td; return P.a1 + P.L * (1 - Math.pow(1 - p, 3)); }
  const e = s - P.t3;
  if (P.kind === 'plain') return P.dec;
  if (e < P.hold) return P.dec - Math.abs(Math.sin(e * 90)) * 0.004 * (1 - e / P.hold);   // hangs on the stud, grinding
  const k = cl((e - P.hold) / P.move, 0, 1);
  if (P.kind === 'short') return P.dec + (P.fin - P.dec) * eio(k) + Math.sin(k * Math.PI) * -0.012;   // rolls back
  return P.dec + (P.fin - P.dec) * (P.kind === 'gold' ? eb(k) : eo(k));                               // tips over / slips off
}
MINI.fate = { title: '命运之轮', img: 'e_fate', col: C.red, text: '石头做的轮盘上刻满了名字。转动它的代价，是血。',
  init(mg) { mg.ang = 0; mg.w = 0; mg.spin = null; mg.fl = 0; mg.flv = 0; mg.blood = 0; mg.drop = -1; mg.runes = 0; mg.lit = -1; mg.hov = -1; mg.quake = 0; },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '以血转动', sub: '领袖 -12% 生命', danger: 1, fn: () => MINI.fate.spin.call(this, mg) }, { t: '离开', leave: 1, fn: () => { mg.leaveA = mg.ang; this.miniSet('leave'); S.mini('fate', 'creak'); } }]; },
  spin(mg) {
    this.heroHurt(0.12); this.miniSet('spin'); S.mini('fate', 'cost'); SHOW.flash(mg, C.red, 0.25);
    const idx = FATE.indexOf(M.wpick(FATE, o => o.w)); mg.hov = -1; mg.spin = fatePlan(mg.ang, idx);
  },
  // a click on the wheel or the room: grit falls from the lintel, and the stage's own ripple
  down(mg, px, py) { mg.tap = { x: K.ax(px), y: K.ay(py), n: (mg.tap ? mg.tap.n : 0) + 1 }; SHOW.tap(this, mg, px, py); },
  // one stud in the last stretch: the pointer's tip flashes, a ring in the colour of the sector coming under it, a shake that
  // grows with every beat, the camera leans in; a gold sector coming under the pointer adds a tint flash and a white ring
  beat(mg, j) {
    const sp = mg.spin, i = sp.beat++, col = FATE[j].c, gold = TOPF(j);
    SHOW.shake(mg, 2 + i * 1.6 + (gold ? 5 : 0)); SHOW.zoom(mg, 0.01 + i * 0.004 + (gold ? 0.016 : 0), FPT.x, FPT.y + 40);
    SHOW.ring(mg, FPT.x, FPT.y + 12, 8, 56 + i * 14, col, { life: 0.4 }); SHOW.burst(mg, FPT.x, FPT.y + 12, 6 + i * 3, { col, sp: [100, 260], life: [0.2, 0.5] });
    if (gold) { SHOW.flash(mg, col, 0.22); SHOW.ring(mg, FPT.x, FPT.y + 12, 8, 150, C.white, { w: 2, life: 0.45, delay: 0.04 }); }
    S.mini('_', 'beat', { i, tier: gold ? 3 : FT[j] ? 1 : 0, up: gold }); this.fx.kick(0.8 + i * 0.5);
  },
  tick(mg, dt) {
    const sp = mg.spin;
    if (mg.phase === 'idle') { mg.ang += dt * 0.2 * (0.55 + 0.45 * Math.sin(mg.t * 0.8)); mg.w = 0.2; }
    else if (mg.phase === 'leave') { const k = cl(mg.pt / 1.6, 0, 1); mg.ang = mg.leaveA + Math.PI * eio(k); mg.w = Math.PI / 1.6 * (1 - Math.abs(1 - 2 * k)) * 1.5; mg.dim = cl(mg.pt / 1.2, 0, 1); if (mg.pt > 1.8 && !mg.left) { mg.left = 1; this.miniFinish('你没有碰它。石轮自己转了半圈。', '#8d8496'); } }
    else if (sp && !sp.done) {
      const s0 = sp.s; sp.s += dt; const s = sp.s, at = (x) => s0 < x && s >= x;
      // the blood price: a drop falls onto the hub's jewel, runs out along the grooves, the ring of names lights, the wheel leans back
      mg.drop = cl(s / 0.55, 0, 1); mg.blood = cl((s - 0.55) / 0.5, 0, 1); mg.runes = cl((s - 1.05) / 0.4, 0, 1);
      if (at(0.55)) { S.mini('fate', 'drip'); SHOW.ring(mg, FHUB.x, FHUB.y, 6, 70, C.red, { life: 0.35 }); SHOW.burst(mg, FHUB.x, FHUB.y, 10, { col: C.red, sp: [80, 220], life: [0.2, 0.45] }); SHOW.shake(mg, 3); }
      if (at(0.6)) S.mini('fate', 'flow'); if (at(1.05)) S.mini('fate', 'rune'); if (at(FPRE - 0.25)) S.mini('fate', 'creak');
      if (at(FPRE)) { S.mini('fate', 'spin', FUP + sp.Td * 0.75); SHOW.shake(mg, 8); SHOW.zoom(mg, 0.03, FHUB.x, FHUB.y); SHOW.burst(mg, FHUB.x, K.ly(150), 16, { ramp: [C.cream, C.lavender, C.haze, C.indigo], sp: [80, 220], ang: -Math.PI / 2, spread: 2.4, life: [0.4, 0.8], w: 300 }); mg.quake++; }
      mg.ang = fateAngle(sp, s); mg.w = (fateAngle(sp, s + 0.02) - fateAngle(sp, s - 0.02)) / 0.04;
      // studs: a click each; in the last stretch (slower than 5.5 rad/s) each one is a beat
      const seg = Math.floor(mg.ang / SEG); if (seg !== sp.lastSeg) { const fwd = seg > sp.lastSeg; sp.lastSeg = seg; S.mini('fate', 'click', sp.beat); if (fwd && s > FPRE + FUP && Math.abs(mg.w) < 5.5) MINI.fate.beat.call(this, mg, fSector(mg.ang + 0.001)); }
      // a stall is coming: the spotlight falls on the pointer a sector ahead of it (超级听牌 when the gold one is the blueprint)
      if (sp.kind !== 'plain' && !sp.reach && s < sp.t3 && sp.dec - mg.ang < SEG * 1.15) { sp.reach = true; const g2 = sp.kind === 'gold' ? sp.idx : sp.kind === 'short' ? (sp.idx + FN - 1) % FN : (sp.idx + 1) % FN; mg.reachLv = g2 === 4 ? 2 : 1; SHOW.reach(this, mg, { x: FPT.x, y: FPT.y + 30, r: 120, lv: mg.reachLv, col: FATE[g2].c, label: '' }); }
      mg.grind = s >= sp.t3 && s < sp.t3 + sp.hold ? 1 : 0;
      if (at(sp.t3) && sp.kind !== 'plain') { S.mini('fate', 'creak'); SHOW.shake(mg, 6); }
      if (at(sp.t3 + sp.hold) && sp.kind !== 'plain') { S.mini('fate', sp.kind === 'short' ? 'back' : 'slip'); SHOW.shake(mg, sp.kind === 'short' ? 3 : 9); if (sp.kind !== 'short') SHOW.ring(mg, FPT.x, FPT.y + 12, 8, 120, C.white, { life: 0.3 }); }
      if (s >= sp.end) { mg.ang = sp.fin; mg.w = 0; sp.done = true; MINI.fate.stop.call(this, mg); } }
    if (mg.lit >= 0) mg.litAge = mg.t - mg.litT;
    // 指针：每一格的钉子转过来时把它往一边顶，过去后弹回来晃两下
    const uu = ((mg.ang / SEG) % 1 + 1) % 1, push = uu > 0.78 ? -(uu - 0.78) / 0.22 * 0.55 : 0;
    if (push < mg.fl) { mg.fl = push; mg.flv = 0; } else { mg.flv += (-mg.fl * 300 - mg.flv * 16) * dt; mg.fl += mg.flv * dt; }
  },
  // stopped: the spotlight lets go; a win freezes a moment first (SHOW.win's big win carries its own freeze), a loss goes by in a beat
  stop(mg) {
    const idx = mg.spin.idx, tier = FT[idx]; SHOW.calm(mg); S.mini('fate', 'stop'); mg.quake++;
    if (!tier) { MINI.fate.land.call(this, mg); return; }
    if (tier >= 3) MINI.fate.land.call(this, mg); else SHOW.hitstop(mg, 0.15, FSEC.x, FSEC.y, () => MINI.fate.land.call(this, mg));
  },
  land(mg) {
    const idx = mg.spin.idx, o = FATE[idx], tier = FT[idx]; mg.hitT = mg.t;
    if (!tier) {   // nothing / the curse: one beat and out
      MINI.fate.resolve.call(this, mg, idx);
      if (idx === 6) { mg.curseT = mg.t; S.mini('fate', 'eye'); SHOW.flash(mg, C.red, 0.55); SHOW.shake(mg, 12); SHOW.burst(mg, FHUB.x, FHUB.y, 36, { ramp: [C.pink, C.red, C.wine, C.ink], sp: [160, 460], life: [0.3, 0.7], g: 700 }); SHOW.calm(mg); this.fx.kick(8); }
      else { mg.drainT = mg.t; SHOW.lose(this, mg); if (mg.spin.kind === 'scrape') SHOW.near(this, mg, FSEC.x, FSEC.y, '差一点！'); }
      this.miniSay(mg.fin[0].split('。')[0] + '。', mg.fin[1], idx === 6); SHOW.later(mg, idx === 6 ? 0.8 : 0.6, () => MINI.fate.finish.call(this, mg)); return; }
    // a win: the sector burns in its colour, the braziers roar, the relief rises; then each prize its own way
    mg.lit = idx; mg.litT = mg.t; mg.rise = { i: idx, t0: mg.t, k: tier >= 3 ? 2.4 : 1.6 };
    const v = idx === 5 ? M.nice(mg.P * 16) : 0;
    SHOW.win(this, mg, tier, { x: FSEC.x, y: FSEC.y, col: o.c, v, label: WL(tier) });
    if (idx === 5) { mg.goldT = mg.t; S.mini('fate', 'gold'); this.fx.coins(FSEC.x, FSEC.y, 30, { v: 900 }); }
    if (idx === 3) { mg.violetT = mg.t; [K.lx(34), K.lx(266)].forEach(bx => SHOW.burst(mg, bx, K.ly(86), 24, { col: C.violet, sp: [120, 340], ang: -Math.PI / 2, spread: 1.2, life: [0.4, 0.9] })); }
    if (idx === 2) SHOW.burst(mg, FSEC.x, FSEC.y, 30, { ramp: [C.white, C.ice, C.blue, C.indigo], sp: [40, 140], ang: -Math.PI / 2, spread: 1, life: [0.8, 1.6], g: -120 });
    SHOW.later(mg, tier >= 3 ? 0.55 : 0.25, () => { MINI.fate.resolve.call(this, mg, idx); mg.itemsT = mg.t; SHOW.items(this, mg, mg.items.map((s2, i) => ({ text: s2, col: i === mg.items.length - 1 ? o.c : C.cream, size: i ? 36 : 40 })), { x: FPL.x, y: FPL.y - 2, dy: 46, gap: 0.22 }); });
    SHOW.later(mg, tier >= 3 ? 2.6 : 1.8, () => MINI.fate.finish.call(this, mg));
  },
  resolve(mg, idx) {
    const run = this.run, P = mg.P; let tx = '', col = FATE[idx].c; const g = [];
    if (idx === 0) tx = '石轮停在空白处。血白流了。';
    if (idx === 1) { run.runBuff.unitAtk = (run.runBuff.unitAtk || 0) + 0.08; tx = '本局部队攻击 +8%。'; }
    if (idx === 2) { const t = M.pickUnitQ(run); if (M.canAdd(run, t)) { g.push({ k: 'unit', type: t }); tx = '石轮上走下来一个 ' + M.DB[t].n + '。'; } else { g.push({ k: 'wallet', v: M.nice(P * 6) }); tx = '队伍满了，名字化成了积分。'; } }
    if (idx === 3) { run.mods.feverStart = (run.mods.feverStart || 0) + 0.2; tx = '石轮发烫。本局每场战斗开局 FEVER 槽 +20%。'; }
    if (idx === 4) { g.push(K.bp(null, 1)); tx = '一张刻在石片上的图纸。'; }
    if (idx === 5) { g.push({ k: 'wallet', v: M.nice(P * 16) }); tx = '血变成了金子。'; }
    if (idx === 6) { tx = '石轮记住了你的名字。生命 -' + this.heroHurt(0.15) + '。'; }
    const got = g.length ? this.award(g, { x: FSEC.x, y: FSEC.y }) : []; mg.fin = [tx + (got.length ? '\n获得：' + got.join('、') : ''), col];
    mg.items = [FATE[idx].n].concat(got.length ? got : idx === 1 ? ['本局部队攻击 +8%'] : idx === 3 ? ['开局 FEVER 槽 +20%'] : []);
  },
  finish(mg) { if (this.mini === mg && mg.fin) this.miniFinish(mg.fin[0], mg.fin[1]); },
  draw(x, mg) {
    const t = mg.t, sp = mg.spin;
    // the sector under the cursor (idle only): its strip and relief brighten, the plate turns to its name
    if (mg.phase === 'idle') { const dx = K.ax(mg.mx) - 150, dy = K.ay(mg.my) - 92, r = Math.hypot(dx, dy); let h = -1; if (r < 58 && r > 11) { let lt = Math.atan2(dy, dx) - mg.ang + Math.PI / 2; lt = ((lt % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); h = Math.floor(lt / SEG) % FN; }
      if (h !== mg.hov) { mg.hov = h; if (h >= 0) S.mini('_', 'hover'); } }
    const o = { ang: mg.ang, w: mg.w, fl: mg.fl, blood: mg.drainT != null ? cl(1 - (t - mg.drainT) / 0.35, 0, 1) : mg.blood, drop: mg.drop, runes: mg.drainT != null ? 0 : mg.runes, lit: mg.lit, litAge: mg.litAge || 0, hov: mg.hov,
      clicks: sp ? sp.lastSeg : 0, flare: mg.lit >= 0 ? cl(1 - (t - mg.litT) * 0.9, 0, 1) : 0, dim: mg.dim || 0, curse: mg.curseT != null ? cl((t - mg.curseT) / 0.12, 0, 1) : 0, tap: mg.tap, grind: mg.grind || 0,
      gold: mg.goldT != null ? cl((t - mg.goldT) / 0.3, 0, 1) : 0, violet: mg.violetT != null ? 1 : 0, rise: mg.rise && !mg.frontOK ? MINI.fate.rise(mg) : null, quake: mg.quake, tier: mg.lit >= 0 ? FT[mg.lit] + 1 : 0 };
    if (!K.pxr(x, 'mb_fate', 0, 0, t, o)) { K.R(x, SX, SY, SW, SH, '#0a0404'); return; }
    // the bronze plate under the wheel: the name of the sector under the pointer (a blur of names at speed; the result pops)
    const j = mg.hov >= 0 ? mg.hov : fSector(mg.ang), fast = Math.abs(mg.w) > 6, landed = sp && sp.done && mg.hitT != null, name = fast ? '· · ·' : FATE[j].n;
    if (mg.itemsT == null) { const k = landed ? K.pop(t - mg.hitT) : 1; x.save(); x.translate(FPL.x, FPL.y); x.scale(k, k); U.text(x, name, 0, 0, landed ? 26 : 22, landed ? FATE[j].c : fast ? C.haze : mg.hov >= 0 ? C.butter : C.cream, { shadow: true }); x.restore(); }
    // the stall's sign sits on the left wall, so the pointer and the stud it hangs on stay in sight
    if (SHOW.tense(mg)) { const T0 = mg.sh.tense, q = eb(cl(T0.t / 0.25, 0, 1)), beat = Math.max(0, 1 - mg.sh.beatT * 5), k = q * (1 + 0.06 * beat); x.save(); x.translate(K.lx(44), K.ly(58)); x.scale(k, k); K.sign(x, mg.reachLv >= 2 ? '超级听牌' : '听牌！', 0, 0, { kind: mg.reachLv >= 2 ? 'red' : 'gold', size: 36, minW: 180 }); x.restore(); }
  },
  rise(mg) { return { i: mg.rise.i, age: mg.t - mg.rise.t0, k: mg.rise.k }; },
  // drawn after the show's dim and rays (when the framework offers it): the prize's relief stays the brightest thing on stage
  front(x, mg) { if (!mg.rise) return; mg.frontOK = true; K.pxr(x, 'mb_fate_rise', 0, 0, mg.t, { rise: MINI.fate.rise(mg), noBoot: 1 }, 'fate_rise'); } };
})();

;
