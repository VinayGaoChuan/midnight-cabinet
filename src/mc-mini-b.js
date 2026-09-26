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
const PB = { L: SX + 300, R: SX + SW - 300, T: SY + 110, B: FLOOR - 10 };
const SLOTS = [{ n: '图纸', ic: 'scroll', c: C.butter }, { n: '空', ic: '', c: C.slate }, { n: '积分', ic: 'coin', c: C.gold }, { n: '物资', ic: 'sack', c: C.tan }, { n: '积分', ic: 'coin', c: C.gold }, { n: '空', ic: '', c: C.slate }, { n: '道具', ic: 'gem', c: C.violet }];
// 落格的中奖档：图纸大奖、道具大赢、中间三格小中、空格没中；PROW = 进最后三排钉子的高度
const PTIER = [4, 0, 1, 1, 1, 0, 3], PROW = PB.T + 90 + 4.5 * 46;
MINI.pachinko = { title: '弹珠台', img: 'e_pachinko', col: C.gold, text: '钢珠弹过一排排钉子，落进底下的格子里。两边的格子最值钱。',
  init(mg) { mg.pegs = []; const rows = 8, W = PB.R - PB.L; for (let i = 0; i < rows; i++) { const n = i % 2 ? 9 : 10; for (let j = 0; j < n; j++) mg.pegs.push({ x: PB.L + 30 + j * (W - 60) / 9 + (i % 2 ? (W - 60) / 18 : 0), y: PB.T + 90 + i * 46, f: 0 }); }
    mg.balls = []; mg.queue = 0; mg.buys = 0; mg.won = []; mg.slotF = SLOTS.map(() => 0); mg.slotP = SLOTS.map(() => -1); mg.spawnT = 0; mg.reachB = null; mg.pend = 0; mg.launchF = 0; },
  buy(mg, n, cost) { if (!this.miniPay(cost)) return; mg.buys++; mg.queue += n; mg.launchF = 1; S.lever(); },
  // 奖励还在飞的时候不许离开（mg.pend），不然结算文字里会少东西
  btns(mg) { const busy = mg.queue > 0 || mg.balls.length > 0 || mg.pend > 0, over = mg.buys >= 2; const c3 = mg.pay, c8 = M.nice(mg.pay * 2.2);
    return [{ t: '投 3 颗', sub: c3 + ' 积分', dis: busy || over || this.run.wallet < c3, why: busy ? '钢珠还在跑' : over ? '台子关了' : '积分不够', fn: () => MINI.pachinko.buy.call(this, mg, 3, c3) }, { t: '投 8 颗', sub: c8 + ' 积分', gold: !busy && !over, dis: busy || over || this.run.wallet < c8, why: busy ? '钢珠还在跑' : over ? '台子关了' : '积分不够', fn: () => MINI.pachinko.buy.call(this, mg, 8, c8) }, { t: '离开', leave: 1, dis: busy, why: '等钢珠落完', fn: () => this.miniFinish(mg.won.length ? '弹珠台吐出了：' + mg.won.join('、') + '。' : '钢珠全掉进了空格子。', mg.won.length ? '#ffcc33' : '#8d8496') }]; },
  land(mg, i, b) {
    const s = SLOTS[i], run = this.run, sw = (PB.R - PB.L) / SLOTS.length, from = { x: PB.L + (i + 0.5) * sw, y: PB.B - 40 }, reached = mg.reachB === b; mg.slotF[i] = 1; mg.slotP[i] = 0; let g = null;
    if (reached) { mg.reachB = null; SHOW.slowmo(mg, 1, 0); }
    if (s.n === '图纸') g = K.bp(); else if (s.n === '积分') g = { k: 'wallet', v: M.nice(mg.P * 1.4) }; else if (s.n === '物资') g = { k: 'rsup', v: 10 }; else if (s.n === '道具') g = K.item(run, mg.P);
    if (g) {
      // 格子先亮 → 近处火花 → 舞台 → 奖励飞进计数器；另一颗珠子还在聚光里时，小奖只在格子上滚数字，不抢舞台
      const tier = PTIER[i], v = g.k === 'wallet' || g.k === 'rsup' ? g.v : 0, solo = !mg.reachB || tier >= 3; mg.pend++; S.mini('pachinko', 'slot');
      this.fx.spark(from.x, from.y, s.c, 8 + tier * 5, { v: 420 + tier * 120, dir: -Math.PI / 2, spread: 1.6 }); this.fx.ring(from.x, from.y, 8, 60 + tier * 24, s.c, 5, 0.3);
      SHOW.later(mg, 0.06, () => { if (solo) SHOW.win(this, mg, tier, { x: from.x, y: from.y - 40, col: s.c, v, label: WL(tier) }); else if (v) SHOW.roll(mg, v, from.x, from.y - 120, s.c, 0.4); });
      if (tier >= 3) { S.mini('pachinko', 'edge'); SHOW.later(mg, tier === 4 ? 0.75 : 0.1, () => this.miniSay(s.n + '！', s.c, true)); }
      SHOW.later(mg, tier === 4 ? 0.7 : tier === 3 ? 0.25 : 0.12, () => { mg.won.push(...this.award([g], from)); mg.pend--; });
    } else { S.tone(200, 0.12, 'sine', 0.06, -80); if (reached) { if (i === 1 || i === 5) SHOW.near(this, mg, from.x, from.y - 10, '差一点！'); else SHOW.lose(this, mg); } }
  },
  tick(mg, dt) {
    mg.slotF = mg.slotF.map(f => Math.max(0, f - dt * 2)); mg.slotP = mg.slotP.map(p => (p >= 0 ? p + dt : p)); mg.pegs.forEach(q => q.f = Math.max(0, q.f - dt * 4)); mg.launchF = Math.max(0, mg.launchF - dt * 3);
    if (mg.queue > 0) { mg.spawnT -= dt; if (mg.spawnT <= 0) { mg.spawnT = 0.32; mg.queue--; mg.launchF = 1; mg.balls.push({ x: (PB.L + PB.R) / 2 + (rnd() - 0.5) * 60, y: PB.T + 30, vx: (rnd() - 0.5) * 120, vy: 0, tr: [] }); S.mini('pachinko', 'launch'); } }
    const W = PB.R - PB.L, sw = W / SLOTS.length, br = 10, pr = 7;
    for (let s = 0; s < 4; s++) { const h = dt / 4; mg.balls.forEach(b => {
      b.vy += 1500 * h; b.x += b.vx * h; b.y += b.vy * h;
      if (b.x < PB.L + br) { b.x = PB.L + br; b.vx = Math.abs(b.vx) * 0.6; } if (b.x > PB.R - br) { b.x = PB.R - br; b.vx = -Math.abs(b.vx) * 0.6; }
      mg.pegs.forEach(q => { const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy); if (d < br + pr && d > 0) { const nx = dx / d, ny = dy / d, vn = b.vx * nx + b.vy * ny; b.x = q.x + nx * (br + pr); b.y = q.y + ny * (br + pr); if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; b.vx += (rnd() - 0.5) * 60; } if (q.f < 0.5) { q.f = 1; const hot = b === mg.reachB; if (hot) this.fx.spark(q.x, q.y, C.gold, 5, { v: 320, w: 3 }); if (hot || rnd() < 0.3) S.mini('pachinko', 'peg', Math.round((q.y - PB.T - 90) / 46)); } } });
      if (b.y > PB.B - 70) { const k = Math.floor((b.x - PB.L) / sw), x0 = PB.L + k * sw; if (b.x - x0 < br && k > 0) { b.x = x0 + br; b.vx = Math.abs(b.vx) * 0.5; } if (x0 + sw - b.x < br && k < SLOTS.length - 1) { b.x = x0 + sw - br; b.vx = -Math.abs(b.vx) * 0.5; } }
      if (b.y > PB.B - 16 && !b.done) { b.done = true; MINI.pachinko.land.call(this, mg, cl(Math.floor((b.x - PB.L) / sw), 0, SLOTS.length - 1), b); } }); }
    mg.balls = mg.balls.filter(b => !b.done);
    mg.balls.forEach(b => { b.tr.push(b.x, b.y); if (b.tr.length > 16) b.tr.splice(0, 2); });
    // 听牌：珠子进最后三排、又正好在两边的格子上方——慢动作 + 聚光跟着它；同一时间只给一颗
    if (!mg.reachB) { const b = mg.balls.find(b => !b.rc && b.vy > 0 && b.y > PROW && b.y < PB.B - 60 && (b.x < PB.L + sw * 1.25 || b.x > PB.R - sw * 1.25)); if (b) { b.rc = 1; mg.reachB = b; SHOW.reach(this, mg, { x: b.x, y: b.y, r: 110, lv: b.x < CX ? 2 : 1 }); SHOW.slowmo(mg, 0.35, 1.6); } }
    const T0 = mg.sh && mg.sh.tense; if (mg.reachB && T0) { T0.x = mg.reachB.x; T0.y = mg.reachB.y; }
  },
  draw(x, mg) {
    const t = mg.t, W = PB.R - PB.L, sw = W / SLOTS.length;
    x.fillStyle = K.RG(x, CX, SY + 350, 50, 700, [[0, '#2a1a3a'], [1, '#0a0610']]); x.fillRect(SX, SY, SW, SH);
    U.box(x, PB.L - 30, PB.T - 30, W + 60, PB.B - PB.T + 50, C.gold); K.R(x, PB.L - 18, PB.T - 18, W + 36, PB.B - PB.T + 28, K.LG(x, 0, PB.T, 0, PB.B, [[0, '#3a1a5a'], [1, '#1a0a2a']]));
    K.bulbs(x, PB.L - 24, PB.T - 24, W + 48, PB.B - PB.T + 38, t, C.gold, 36);
    K.sign(x, 'PACHINKO', CX, PB.T + 30, { kind: 'gold', size: T.btn, num: true });
    // 钉子被碰到：变白、一圈光往外扩
    mg.pegs.forEach(q => { K.CI(x, q.x, q.y + 2, 7, 'rgba(0,0,0,0.5)'); K.CI(x, q.x, q.y, 7 + q.f * 2, q.f > 0.6 ? C.white : q.f ? C.butter : C.gold); K.CI(x, q.x - 2, q.y - 2, 2.4, C.white);
      if (q.f) { K.GL(x, q.x, q.y, 24, C.gold, q.f * 0.8); x.save(); x.globalAlpha = q.f; x.strokeStyle = U.pal(C.butter); x.lineWidth = 3; x.beginPath(); x.arc(q.x, q.y, 10 + (1 - q.f) * 16, 0, 7); x.stroke(); x.restore(); } });
    SLOTS.forEach((s, i) => { const x0 = PB.L + i * sw; if (PTIER[i] >= 3) K.GL(x, x0 + sw / 2, PB.B - 40, 80, s.c, 0.22 + 0.14 * Math.sin(t * 4 + i));
      K.R(x, x0 + 2, PB.B - 70, sw - 4, 70, s.ic ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.6)'); if (mg.slotF[i]) { x.save(); x.globalAlpha = mg.slotF[i] * 0.5; K.R(x, x0 + 2, PB.B - 70, sw - 4, 70, s.ic ? C.butter : C.steel); x.restore(); } if (i) K.R(x, x0 - 3, PB.B - 70, 6, 70, C.gold);
      if (s.ic) K.IC(x, s.ic, x0 + sw / 2, PB.B - 40, 44 * (mg.slotP[i] >= 0 ? K.pop(mg.slotP[i]) : 1)); else U.text(x, '空', x0 + sw / 2, PB.B - 40, T.body, C.haze); });
    // 珠子拖一条残影；聚光里的那颗拖金色
    mg.balls.forEach(b => { const hot = b === mg.reachB, n = b.tr.length / 2; for (let k = 0; k < n - 1; k++) { x.save(); x.globalAlpha = (k + 1) / n * (hot ? 0.55 : 0.3); K.CI(x, b.tr[k * 2], b.tr[k * 2 + 1], 10 * (k + 1) / n, hot ? C.gold : C.silver); x.restore(); }
      if (hot) K.GL(x, b.x, b.y, 50, C.gold, 0.6 + 0.3 * Math.sin(t * 20)); K.CI(x, b.x, b.y + 3, 10, 'rgba(0,0,0,0.5)'); K.CI(x, b.x, b.y, 10, K.RG(x, b.x - 3, b.y - 3, 1, 12, [[0, C.white], [0.5, C.silver], [1, C.slate]])); });
    // launcher & queue
    K.RR(x, CX - 40, PB.T - 50, 80, 40, 8, C.abyss, C.gold, 3); if (mg.launchF) K.GL(x, CX, PB.T - 30, 70, C.gold, mg.launchF); for (let i = 0; i < Math.min(8, mg.queue); i++) K.CI(x, PB.R + 70, PB.B - 40 - i * 26, 10, C.silver);
    U.text(x, '待发 ' + mg.queue, PB.R + 70, PB.B + 10, T.cap, C.cream);
    mg.won.slice(-8).forEach((w, i) => U.text(x, w, SX + 150, SY + 170 + i * 40, T.cap, C.lime));
  } };

// ═════════════════════ 世界树 · pick fruit, water, or cut ═════════════════════
// q = 揭晓时按哪一档品质演（只管演出）；rv = 落地时舞台上滚的数字
const FRUITS = [
  { n: '生命果', c: C.pink, ic: 't_heart', q: 0, d: '领袖回复 40% 生命', f(g) { return '回复 ' + g.heroHeal(0.4) + ' 生命'; } },
  { n: '力量果', c: C.amber, ic: 't_sword', q: 1, d: '本局部队攻击 +12%', f(g) { return g.buffRun('unitAtk', 0.12, '部队攻击 +12%', C.amber); } },
  { n: '坚韧果', c: C.blue, ic: 't_shieldHeart', q: 1, d: '本局部队生命 +15%', f(g) { return g.buffRun('unitHp', 0.15, '部队生命 +15%', C.blue); } },
  { n: '智慧果', c: C.lime, ic: 't_orb', q: 0, rv: () => 70, d: '经验 +70', f(g, mg) { return g.giveExp(70, mg.from); } },
  { n: '灵魂果', c: C.violet, ic: 't_shard', q: 1, rv: () => 25, d: '灵魂碎片 +25', f(g, mg) { return g.giveShards(25, mg.from); } },
  { n: '黄金果', c: C.gold, ic: 't_coin', q: 2, rv: (mg) => M.nice(mg.P * 10), d: '积分 +', f(g, mg) { g.award([{ k: 'wallet', v: M.nice(mg.P * 10) }], mg.from); return '积分 +' + M.nice(mg.P * 10); } },
  { n: '幸运果', c: C.green, ic: 't_clover', q: 2, d: '本局事件好运 +10%，FEVER 好效果 +5%', f(g) { g.run.mods.tier = (g.run.mods.tier || 0) + 0.05; return g.buffRun('eventLuck', 0.1, '好运 +10%', C.green); } }];
MINI.tree = { title: '世界树', img: 'e_tree', col: C.green, text: '树根扎进每一个世界。它结的果子，只允许你摘一个。',
  init(mg) { const pool = FRUITS.slice().sort(() => rnd() - 0.5); mg.fr = pool.slice(0, 3).map((f, i) => ({ f, x: CX - 220 + i * 220, y: SY + 250 + (i === 1 ? -60 : 0), gone: false, vy: 0, fy: 0 })); mg.spare = pool[3]; mg.picks = 0; mg.allow = 1; mg.got = []; mg.watered = false; mg.bugs = [...Array(24)].map(() => ({ x: SX + rnd() * SW, y: SY + 100 + rnd() * 500, p: rnd() * 6 })); },
  // 摘下之前先熟透：果子鼓起来、亮预兆色，可能裂开升一档（只往上、停在真实品质），然后才掉
  pick(mg, i) { const F = mg.fr[i]; if (F.gone || mg.phase !== 'idle') return; F.gone = true; F.falling = true; mg.pickI = i; this.miniSet('fall'); S.mini('tree', 'pick');
    const q = F.f.q; F.path = SHOW.omenPath(q); F.os = 0; F.ripe = 0.4 + 0.2 * q + 0.3 * (F.path.length - 1); SHOW.omen(this, mg, F.path[0]); if (q >= 2) SHOW.reach(this, mg, { x: F.x, y: F.y, r: 120, lv: q >= 3 ? 2 : 1 }); },
  btns(mg) { if (mg.phase !== 'idle') return []; const b = mg.fr.map((F, i) => ({ t: '摘 ' + F.f.n, sub: F.f.d, dis: F.gone, why: '已经摘了', fn: () => MINI.tree.pick.call(this, mg, i) }));
    b.push({ t: '浇灌', sub: '-30 本局物资 · 再结一个，能多摘一个', dis: mg.watered || this.run.loot.supplies < 30, why: mg.watered ? '已经浇过了' : '本局物资不够 30', fn: () => { const run = this.run; this.hold('rsup', run.loot.supplies); run.loot.supplies -= 30; this.release('rsup'); mg.watered = true; mg.allow++; mg.fr.push({ f: mg.spare, x: CX, y: SY + 330, gone: false, grow: 0 }); this.miniSet('water'); S.mini('tree', 'water'); } });
    b.push({ t: '砍树枝', sub: '得到自然风格图纸，可能被诅咒', danger: 1, dis: mg.picks > 0, why: '树不再理你了', fn: () => this.miniSet('cut') });
    return b; },
  tick(mg, dt) {
    if (mg.phase === 'fall') { const F = mg.fr[mg.pickI];
      if (mg.pt < F.ripe) { const k = Math.min(F.path.length - 1, Math.floor(mg.pt / F.ripe * F.path.length)); if (k !== F.os) { F.os = k; SHOW.promote(this, mg, F.x, F.y, F.path[k]); } }
      else {
        if (!F.drop) { F.drop = 1; this.fx.spark(F.x, F.y - 40, C.lime, 8, { v: 300, w: 3 }); if (F.f.q >= 3) SHOW.slowmo(mg, 0.5, 0.9); }
        F.vy = (F.vy || 0) + 1800 * dt; F.fy = (F.fy || 0) + F.vy * dt; const T0 = mg.sh && mg.sh.tense; if (T0) T0.y = F.y + F.fy;
        if (F.y + F.fy > FLOOR - 30) { F.fy = FLOOR - 30 - F.y; F.falling = false; F.land = mg.t; mg.from = { x: F.x, y: FLOOR - 30 }; this.miniSet('land'); S.mini('tree', 'fruit');
          // 落地：果子先压扁 → 近处溅光 → 舞台按品质走中奖档 → 效果生效、奖励飞走
          const q = F.f.q, tier = q + 1, qc = QC(q), v = F.f.rv ? F.f.rv(mg) : 0;
          this.fx.spark(F.x, FLOOR - 40, qc, 10 + q * 6, { v: 520, dir: -Math.PI / 2, spread: 2.2 }); this.fx.ring(F.x, FLOOR - 30, 10, 80 + q * 30, qc, 5, 0.3);
          SHOW.later(mg, 0.07, () => SHOW.win(this, mg, tier, { x: F.x, y: FLOOR - 70, col: q ? qc : F.f.c, v, label: WL(tier) }));
          SHOW.later(mg, tier === 4 ? 0.7 : 0.16, () => { const tx = F.f.f(this, mg); mg.got.push(F.f.n + '（' + tx + '）'); this.miniSay(F.f.n + '：' + tx, F.f.c, tier >= 3); mg.picks++; mg.finD = [1, 1, 1.5, 2.2][tier - 1]; this.miniSet(mg.picks >= mg.allow ? 'done' : 'idle'); }); } } }
    if (mg.phase === 'water') { const F = mg.fr[mg.fr.length - 1]; F.grow = cl(mg.pt / 1.2, 0, 1); if (mg.pt > 1.2) { this.miniSet('idle'); this.miniSay('树又结了一个' + F.f.n, F.f.c); S.mini('tree', 'grow'); this.fx.spark(F.x, F.y, F.f.c, 12, { v: 400, w: 4 }); } }
    if (mg.phase === 'cut' && !mg.cutDone && mg.pt > 0.5) {
      // 斧子砍下 → 发光的树枝掉下来、图纸飞走（中）；被诅咒的话树皮上的眼睛一拍睁开
      mg.cutDone = true; S.mini('tree', 'cut'); this.fx.kick(8); const bx = CX + 230, by = SY + 320; this.fx.spark(bx, by, C.tan, 14, { v: 600 });
      const g = [K.bp('nature', 1)], cursed = rnd() < 0.5 - mg.luck;
      SHOW.later(mg, 0.08, () => SHOW.win(this, mg, 2, { x: bx, y: by, col: C.butter }));
      SHOW.later(mg, 0.2, () => { mg.cutGot = this.award(g, { x: bx, y: by + 80 }); });
      if (cursed) SHOW.later(mg, 0.5, () => { mg.eyes = mg.t; SHOW.lose(this, mg); this.fx.flash(C.red, 0.18); this.fx.kick(5); S.mini('tree', 'curse'); mg.hurt = this.heroHurt(0.1); });
      SHOW.later(mg, cursed ? 0.9 : 1.2, () => { if (this.mini !== mg) return; let tx = '你砍下一根发光的树枝，里面卷着一张图纸。'; if (cursed) tx += '树皮上的眼睛全睁开了。生命 -' + mg.hurt + '。'; const got = mg.cutGot || []; this.miniFinish(tx + (got.length ? '\n获得：' + got.join('、') : ''), cursed ? '#d0453c' : '#9cdc6a'); }); }
    if (mg.phase === 'done' && mg.pt > (mg.finD || 1.0) && !mg.fin) { mg.fin = true; this.miniFinish('世界树的叶子沙沙作响。你收下了：' + mg.got.join('；') + '。', '#9cdc6a'); }
    mg.bugs.forEach(b => { b.p += dt; b.x += Math.cos(b.p * 0.7) * 20 * dt; b.y += Math.sin(b.p) * 14 * dt; });
  },
  draw(x, mg) {
    const t = mg.t, sway = Math.sin(t * 0.8) * 4;
    x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, '#0a1a2a'], [0.6, '#10281e'], [1, '#081410']]); x.fillRect(SX, SY, SW, SH);
    K.GL(x, CX, SY + 260, 520, '#6affb0', 0.25);
    // trunk & roots
    x.fillStyle = K.LG(x, CX - 70, 0, CX + 70, 0, [[0, C.umber], [0.5, C.brown], [1, C.umber]]); x.beginPath(); x.moveTo(CX - 60, FLOOR); x.quadraticCurveTo(CX - 40, SY + 400, CX - 30, SY + 280); x.lineTo(CX + 30, SY + 280); x.quadraticCurveTo(CX + 40, SY + 400, CX + 60, FLOOR); x.fill();
    for (let i = 0; i < 6; i++) { const s = i < 3 ? -1 : 1, k = i % 3; x.strokeStyle = C.umber; x.lineWidth = 14 - k * 3; x.beginPath(); x.moveTo(CX + s * 40, FLOOR - 20); x.quadraticCurveTo(CX + s * (100 + k * 60), FLOOR - 10, CX + s * (160 + k * 110), FLOOR + 20); x.stroke(); }
    for (let i = 0; i < 5; i++) { const y = SY + 320 + i * 60; K.GL(x, CX, y, 26, '#8fffb0', 0.4 + 0.4 * Math.sin(t * 2 + i)); K.R(x, CX - 4, y - 8, 8, 16, '#bfffd0'); }
    // canopy
    const L = [[CX, SY + 180, 260, C.tealDeep], [CX - 190, SY + 230, 170, C.tealDeep], [CX + 190, SY + 230, 170, C.tealDeep], [CX - 90, SY + 150, 170, C.greenDeep], [CX + 100, SY + 150, 170, C.greenDeep], [CX, SY + 110, 150, C.greenDeep]]; // 树冠：调色板里的深青在后、深绿在前
    L.forEach(([a, b, rr, col], i) => K.EL(x, a + sway * (i % 2 ? 1 : -1), b, rr, rr * 0.55, col));
    for (let i = 0; i < 60; i++) { const a = i * 2.4, rr = (i * 37) % 260; K.R(x, CX + Math.cos(a) * rr * 1.1 + sway, SY + 180 + Math.sin(a) * rr * 0.4, 4, 4, i % 3 ? 'rgba(160,255,190,0.25)' : 'rgba(255,255,200,0.3)'); }
    // 诅咒：树皮上一排红眼睛睁开
    if (mg.eyes) { const o = eo((t - mg.eyes) / 0.15); [[CX - 14, SY + 330], [CX + 16, SY + 400], [CX - 10, SY + 470], [CX - 120, SY + 200], [CX + 130, SY + 190]].forEach(([ex, ey]) => { K.EL(x, ex, ey, 16, 9 * o, C.red); K.CI(x, ex, ey, 4 * o, C.ink); }); }
    // fruit
    mg.fr.forEach(F => {
      const qc = QC(F.f.q);
      if (F.gone && !F.falling) { if (F.land != null) { const u = t - F.land; if (u < 0.18) { const k = 1 - u / 0.18; K.EL(x, F.x, FLOOR - 26, 44 * k + 6, 24 * k + 4, F.f.c); } K.GL(x, F.x, FLOOR - 30, 70, qc, 0.45 + 0.1 * Math.sin(t * 3)); } return; }
      const g = F.grow == null ? 1 : F.grow, yy = F.y + (F.fy || 0), bob = F.falling ? 0 : Math.sin(t * 2 + F.x) * 5, om = F.path && mg.phase === 'fall' && mg.fr[mg.pickI] === F, rip = om ? (F.drop ? 1 : cl(mg.pt / F.ripe, 0, 1)) : 0, sw2 = 1 + 0.18 * eo(rip);
      let jx = 0, jy = 0; if (om) { const j = SHOW.aura(x, F.x, yy + bob, 80, F.path[F.os], t, 0.35 + 0.65 * rip); if (!F.drop) { jx = j.dx; jy = j.dy; } }
      if (!F.drop) K.LN(x, F.x, yy - 70, F.x, yy - 36 + bob, 3, '#3a6a2a');
      if (F.drop && F.falling) for (let k = 1; k <= 4; k++) { x.save(); x.globalAlpha = 0.4 - k * 0.08; K.CI(x, F.x, yy - k * 20, 34 - k * 5, QC(F.path[F.os])); x.restore(); }
      const fx0 = F.x + jx, fy0 = yy + bob + jy, rr = 34 * g * sw2;
      K.GL(x, fx0, fy0, 90 * g, F.f.c, 0.7); K.CI(x, fx0, fy0, rr, F.f.c); K.CI(x, fx0 - 10 * g, fy0 - 10 * g, 10 * g, 'rgba(255,255,255,0.55)'); K.IC(x, F.f.ic, fx0, fy0, 40 * g * sw2);
      if (!F.falling && mg.phase === 'idle') K.chipC(x, F.f.n, F.x, yy + 66, F.f.c); });
    mg.bugs.forEach(b => { K.GL(x, b.x, b.y, 14, '#d8ff8a', 0.5 + 0.5 * Math.sin(b.p * 3)); K.R(x, b.x - 1, b.y - 1, 3, 3, '#f0ffb0'); });
    if (mg.phase === 'cut') { const a = mg.pt < 0.5 ? -1.4 + mg.pt * 4 : 0.6; x.save(); x.translate(CX + 190, SY + 340); x.rotate(a); K.R(x, -6, -10, 12, 120, '#6a4a2a'); K.PL(x, [[6, -10], [46, -30], [46, 30], [6, 10]], '#c8d0dc'); x.restore();
      if (mg.cutDone) { const u = cl((mg.pt - 0.5) / 0.55, 0, 1), by = SY + 300 + u * u * (FLOOR - SY - 330); K.GL(x, CX + 250, by, 90, C.butter, 0.7); x.save(); x.translate(CX + 250, by); x.rotate(0.3 + u * 1.2); K.R(x, -50, -6, 100, 12, C.brown); K.R(x, -50, -6, 100, 4, C.butter); K.EL(x, 30, -12, 14, 8, C.green); x.restore(); } }
    if (mg.phase === 'water') { for (let i = 0; i < 20; i++) { const q = (mg.pt * 2 + i / 20) % 1; K.R(x, CX - 120 + i * 12, SY + 120 + q * 400, 3, 10, 'rgba(140,220,255,0.7)'); } }
  } };

// ═════════════════════ 塔罗 / 砸金蛋 · pick from covered things ═════════════════════
const TAROT = [
  { n: '太阳', c: C.gold, ic: 'u_star', good: 1, q: 3, f(g) { return g.buffRun('mult', 0.3, '积分倍率 +0.3', C.magenta); } },
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
MINI.tarot = { title: '占卜摊', img: 'e_card', col: C.violet, text: '蒙着眼的占卜师把三张牌扣在桌上。「只能翻一张。」',
  init(mg) { pickInit(mg, TAROT, 3); this.miniSet('deal'); S.mini('tarot', 'shuffle'); },
  // 牌早就定了；翻开之前它先悬起来亮预兆（越好亮得越久、抖得越厉害，可能裂开升格），坏牌一拍就翻
  choose(mg, i) { if (mg.phase !== 'idle') return; const it = mg.items[i]; it.picked = true; mg.cur = i; const q = it.f.good ? it.f.q : -1;
    mg.path = q >= 0 ? SHOW.omenPath(q) : null; mg.os = 0; mg.omenD = q < 0 ? 0.12 : 0.45 + 0.22 * q + 0.35 * (mg.path.length - 1); mg.revAt = null; mg.flipS = 0;
    this.miniSet('flip'); S.mini('tarot', 'lift'); if (q >= 0) SHOW.omen(this, mg, mg.path[0]); if (q >= 2) SHOW.reach(this, mg, { x: it.x, y: it.y - 70, r: 200, lv: q >= 3 ? 2 : 1 }); },
  btns(mg) { if (mg.phase === 'idle') return mg.items.map((it, i) => ({ t: ['左边', '中间', '右边'][i], sub: '翻开这张', fn: () => MINI.tarot.choose.call(this, mg, i) })); if (mg.phase === 'shown') return [{ t: '离开', leave: 1, gold: 1, fn: () => this.miniFinish('你翻开了「' + mg.items[mg.cur].f.n + '」：' + mg.got[0] + '。另外两张是「' + mg.items.filter((_, i) => i !== mg.cur).map(o => o.f.n).join('」「') + '」。', mg.items[mg.cur].f.c) }]; return []; },
  down(mg, px, py) { if (mg.phase !== 'idle') return; mg.items.forEach((it, i) => { if (Math.abs(px - it.x) < 110 && Math.abs(py - it.y) < 160) MINI.tarot.choose.call(this, mg, i); }); },
  tick(mg) {
    if (mg.phase === 'deal' && mg.pt > 0.9) this.miniSet('idle');
    if (mg.phase === 'flip') { const it = mg.items[mg.cur], D = mg.omenD, q = it.f.good ? it.f.q : -1;
      if (mg.path && mg.pt < D) { const k = Math.min(mg.path.length - 1, Math.floor(mg.pt / D * mg.path.length)); if (k !== mg.os) { mg.os = k; SHOW.promote(this, mg, it.x, it.y - 70, mg.path[k]); } }
      if (mg.pt >= D && !mg.flipS) { mg.flipS = 1; S.mini('tarot', 'flip'); }
      it.open = cl((mg.pt - D) / 0.2, 0, 1);
      // 翻过来的一瞬间砸回桌面 → 近处火花 → 舞台中奖档 → 效果生效
      if (it.open >= 1 && !it.done) { it.done = true; mg.slamT = mg.t; mg.from = { x: it.x, y: it.y };
        if (q >= 0) { const tier = q + 1, qc = QC(q), v = it.f.rv ? it.f.rv(mg) : 0; S.mini('tarot', 'good'); this.fx.kick(3 + q * 2); this.fx.spark(it.x, it.y, qc, 12 + q * 6, { v: 600 }); this.fx.ring(it.x, it.y, 20, 180, it.f.c, 5, 0.3);
          SHOW.later(mg, 0.07, () => SHOW.win(this, mg, tier, { x: it.x, y: it.y, col: q ? qc : it.f.c, v, label: WL(tier) }));
          SHOW.later(mg, tier === 4 ? 0.7 : 0.15, () => { const tx = it.f.f(this, mg); mg.got.push(tx); this.miniSay('「' + it.f.n + '」' + tx, it.f.c, true); });
          mg.revAt = mg.pt + [0.8, 1.0, 1.6, 2.6][tier - 1]; }
        else { const tx = it.f.f(this, mg); mg.got.push(tx); this.miniSay('「' + it.f.n + '」' + tx, it.f.c, true); S.mini('tarot', 'bad'); this.fx.kick(6); this.fx.flash(C.red, 0.12); SHOW.lose(this, mg); mg.revAt = mg.pt + 0.45; } }
      if (mg.revAt != null && mg.pt > mg.revAt) this.miniSet('reveal'); }
    if (mg.phase === 'reveal') { mg.items.forEach((it, i) => { if (i !== mg.cur) it.open = cl((mg.pt - i * 0.2) / 0.4, 0, 1); }); if (mg.pt > 1.2) this.miniSet('shown'); }
  },
  draw(x, mg) {
    const t = mg.t; x.fillStyle = K.RG(x, CX, SY + 350, 40, 700, [[0, '#2a1440'], [1, '#08040e']]); x.fillRect(SX, SY, SW, SH);
    K.EL(x, CX, FLOOR + 40, 560, 110, '#3a1a2a'); K.EL(x, CX, FLOOR + 30, 540, 96, '#5a2a3a');
    for (let i = 0; i < 3; i++) { const cx0 = [SX + 110, SX + SW - 110, CX][i]; K.GL(x, cx0, FLOOR - 120, 60, '#ffb060', 0.6 + 0.2 * Math.sin(t * 7 + i)); K.R(x, cx0 - 8, FLOOR - 110, 16, 60, '#e8dcc4'); K.EL(x, cx0, FLOOR - 124 + Math.sin(t * 9 + i), 6, 12, '#ffcc33'); }
    K.SP(x, 'old', CX, SY + 190, 150); K.GL(x, CX, SY + 120, 120, '#c890ff', 0.3);
    mg.items.forEach((it, i) => { const q = mg.phase === 'deal' ? eb((mg.pt - i * 0.15) / 0.5) : 1; const ax = CX + (it.x - CX) * q, ay = it.y + (1 - q) * 300, sx = Math.abs(Math.cos(it.open * Math.PI)), face = it.open > 0.5, hov = mg.phase === 'idle' && Math.abs(mg.mx - it.x) < 110 && Math.abs(mg.my - it.y) < 160;
      // 选中的牌：悬起来、亮预兆、发抖；翻开时砸回桌面
      const sel = it.picked && mg.cur === i, om = sel && mg.phase === 'flip' && !it.done, lift = om ? eo(mg.pt / 0.25) * 70 : sel && mg.slamT != null ? 70 * (1 - eo((t - mg.slamT) / 0.12)) : 0, pop = sel && mg.slamT != null ? K.pop(t - mg.slamT) : 1, gq = it.f.good ? it.f.q : -1;
      let jx = 0, jy = 0; if (om && mg.path) { const j = SHOW.aura(x, ax, ay - lift, 170, mg.path[mg.os], t, 0.3 + 0.7 * cl(mg.pt / mg.omenD, 0, 1)); jx = j.dx * 1.5; jy = j.dy * 1.5; }
      if (sel && it.done && gq >= 0) K.GL(x, ax, ay, 230, QC(gq), 0.35 + 0.15 * Math.sin(t * 5));
      x.save(); x.translate(ax + jx, ay - (hov ? 16 : 0) - lift + Math.sin(t * 2 + i) * 4 + jy); x.scale(Math.max(0.02, sx) * pop, pop); if (hov) K.GL(x, 0, 0, 200, C.violet, 0.5);
      // 牌：金框 + 3px 墨边 + 9px 硬投影；牌面米色，牌背靛蓝
      K.R(x, -94, -144, 206, 306, C.ink); U.box(x, -100, -150, 200, 300, C.gold); K.R(x, -92, -142, 184, 284, face ? K.LG(x, 0, -142, 0, 142, [[0, C.cream], [1, C.butter]]) : C.indigo);
      if (face) { K.GL(x, 0, -20, 110, it.f.c, 0.5); K.IC(x, it.f.ic, 0, -30, 110); U.text(x, it.f.n, 0, 100, T.title, it.f.good ? C.umber : C.wine, { shadow: false }); if (it.picked) K.RR(x, -99, -149, 198, 298, 0, null, C.gold, 6); else K.R(x, -92, -142, 184, 284, 'rgba(7,6,15,0.45)'); }
      else { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.3; K.LN(x, Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 70, Math.sin(a) * 70, 3, C.gold); } K.CI(x, 0, 0, 26, C.gold); K.CI(x, 0, 0, 14, C.indigo); K.CI(x, 0, 0, 7, C.butter);
        if (om && mg.path && mg.os > 0) CRK.slice(0, Math.min(4, mg.os * 2)).forEach(pts => crack(x, pts, QC(mg.path[mg.os]))); }
      x.restore(); });
  } };
const EGGS = [
  { n: '满满的积分', c: C.gold, ic: 'e_coin', q: 2, rv: (mg) => M.nice(mg.P * 12), f(g, mg) { const v = M.nice(mg.P * 12); g.award([{ k: 'wallet', v }], mg.from); return '积分 +' + v; } },
  { n: 'FEVER 预热', c: C.violet, ic: 'gem', q: 1, f(g) { g.run.mods.feverStart = (g.run.mods.feverStart || 0) + 0.15; return '本局每场战斗开局 FEVER 槽 +15%'; } },
  { n: '一张图纸', c: C.butter, ic: 'scroll', q: 3, f(g, mg) { return g.award([K.bp()], mg.from).join(''); } },
  { n: '一只雏鸟', c: C.green, ic: 'r_beast', q: 1, f(g, mg) { const t = M.pickUnitQ(g.run); if (!M.canAdd(g.run, t)) return '它飞走了'; g.award([{ k: 'unit', type: t }], mg.from); return M.DB[t].n + ' 认你做了主人'; } },
  { n: '空的', c: C.lavender, ic: 'u_mask', q: -1, f() { return '什么也没有'; } },
  { n: '一条蛇', c: C.red, ic: 'r_demon', q: -1, f(g) { return '咬了领袖一口 ' + g.heroHurt(0.08); } }];
const HS = 0.13; // 锤子落下要多久（和 eggs.hammer 的声音对齐）
MINI.eggs = { title: '砸金蛋', img: 'e_egg', col: C.gold, text: '三只金蛋在台子上微微发烫。第一锤要钱，第二锤要双倍。',
  init(mg) { pickInit(mg, EGGS, 3); mg.smash = 0; mg.hammer = null; },
  cost(mg) { return mg.smash ? mg.pay * 2 : mg.pay; },
  // 付一次钱，锤几下由里面是什么决定：空的和蛇一锤就碎；好东西先裂几道缝、缝里漏出预兆色（可能升格），最后一锤才碎
  hit(mg, i) { const it = mg.items[i]; if (mg.phase !== 'idle' || it.picked || mg.smash >= 2) return; if (!this.miniPay(MINI.eggs.cost(mg))) return; mg.smash++; it.picked = true; mg.cur = i;
    const q = it.f.q; it.path = q >= 0 ? SHOW.omenPath(q) : null; it.n = q >= 0 ? 1 + it.path.length : 1; it.k = 0; it.cr = 0;
    mg.st = [0]; for (let j = 1; j < it.n; j++) mg.st.push(mg.st[j - 1] + 0.34 + 0.08 * j + (j === it.n - 1 && q >= 2 ? 0.3 : 0)); mg.sw = 1; mg.idleAt = null;
    this.miniSet('smash'); S.mini('eggs', 'hammer'); },
  btns(mg) { if (mg.phase !== 'idle') return []; const b = mg.smash < 2 ? mg.items.map((it, i) => ({ t: '砸' + ['左', '中', '右'][i] + '蛋', sub: MINI.eggs.cost(mg) + ' 积分', dis: it.picked || this.run.wallet < MINI.eggs.cost(mg), why: it.picked ? '已经砸开了' : '积分不够', fn: () => MINI.eggs.hit.call(this, mg, i) })) : [];
    b.push({ t: '离开', leave: 1, gold: mg.smash >= 2, fn: () => this.miniFinish(mg.got.length ? '蛋壳里是：' + mg.got.join('；') + '。' : '你没舍得砸。', mg.got.length ? '#ffcc33' : '#8d8496') }); return b; },
  down(mg, px, py) { mg.items.forEach((it, i) => { if (Math.abs(px - it.x) < 110 && Math.abs(py - it.y) < 150) MINI.eggs.hit.call(this, mg, i); }); },
  impact(mg, it, j) {
    const q = it.f.q; it.hitT = mg.t;
    if (j < it.n - 1) { // 裂一道：蛋一缩、壳屑飞、缝里透出预兆色；最后一锤前停得最久
      it.cr = j + 1; const qn = it.path[j]; this.fx.kick(3 + j * 2); this.fx.spark(it.x, it.y, C.gold, 6, { v: 380, w: 4 }); this.fx.spark(it.x, it.y, QC(qn), 6 + j * 4, { v: 300, w: 3 });
      if (j === 0) SHOW.omen(this, mg, qn); else SHOW.promote(this, mg, it.x, it.y, qn);
      if (j === it.n - 2 && q >= 2) SHOW.reach(this, mg, { x: it.x, y: it.y + 20, r: 150, lv: q >= 3 ? 2 : 1 });
      return; }
    it.done = true; it.open = 1; it.openT = mg.t; mg.from = { x: it.x, y: it.y }; S.mini('eggs', 'crack'); const good = q >= 0, qc = good ? QC(q) : C.gold;
    it.shards = [...Array(good ? 14 + q * 8 : 10)].map(() => ({ x: it.x, y: it.y, vx: (rnd() - 0.5) * (700 + q * 200), vy: -300 - rnd() * (500 + q * 150), r: rnd() * 6, c: good && rnd() < 0.35 ? qc : C.gold }));
    if (good) { const tier = q + 1, v = it.f.rv ? it.f.rv(mg) : 0; this.fx.kick(4 + q * 3); this.fx.spark(it.x, it.y, qc, 14 + q * 8, { v: 700 }); this.fx.ring(it.x, it.y, 20, 160 + q * 40, qc, 6, 0.3);
      SHOW.later(mg, 0.07, () => SHOW.win(this, mg, tier, { x: it.x, y: it.y, col: q ? qc : it.f.c, v, label: WL(tier) }));
      SHOW.later(mg, tier === 4 ? 0.7 : 0.15, () => { const tx = it.f.f(this, mg); mg.got.push(it.f.n + '：' + tx); this.miniSay(it.f.n + '！', it.f.c, true); S.mini('eggs', 'prize'); });
      mg.idleAt = mg.pt + [0.7, 0.9, 1.5, 2.6][tier - 1]; }
    else { const tx = it.f.f(this, mg); mg.got.push(it.f.n + '：' + tx); this.miniSay(it.f.n + '！', it.f.c, true); if (it.f.n === '一条蛇') { S.mini('eggs', 'snake'); this.fx.flash(C.red, 0.15); this.fx.kick(5); } else this.fx.kick(2); SHOW.lose(this, mg); mg.idleAt = mg.pt + 0.4; }
  },
  tick(mg, dt) {
    if (mg.phase === 'smash') { const it = mg.items[mg.cur];
      while (mg.sw < it.n && mg.pt >= mg.st[mg.sw]) { mg.sw++; S.mini('eggs', 'hammer'); }
      while (it.k < it.n && mg.pt >= mg.st[it.k] + HS) MINI.eggs.impact.call(this, mg, it, it.k++);
      if (mg.idleAt != null && mg.pt > mg.idleAt) this.miniSet('idle'); }
    mg.items.forEach(it => (it.shards || []).forEach(s => { s.vy += 1600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 8; }));
  },
  draw(x, mg) {
    const t = mg.t; x.fillStyle = K.RG(x, CX, SY + 360, 40, 700, [[0, '#4a1a10'], [1, '#100604']]); x.fillRect(SX, SY, SW, SH);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + t * 0.1; x.fillStyle = U.pal('rgba(255,200,80,0.05)'); x.beginPath(); x.moveTo(CX, SY + 330); x.arc(CX, SY + 330, 900, a, a + 0.12); x.fill(); }
    mg.items.forEach((it, i) => { K.RR(x, it.x - 90, it.y + 110, 180, 40, 6, C.wine, C.gold, 3); U.box(x, it.x - 70, it.y + 90, 140, 24, C.red);
      const hov = mg.phase === 'idle' && !it.picked && Math.abs(mg.mx - it.x) < 110 && Math.abs(mg.my - it.y) < 150, wob = hov ? Math.sin(t * 20) * 0.05 : Math.sin(t * 2 + i) * 0.02;
      if (!it.open) { const cr = it.cr || 0, hit = it.hitT != null ? Math.exp(-(t - it.hitT) * 14) : 0, qn = cr && it.path ? it.path[cr - 1] : 0; let jx = 0, jy = 0;
        if (cr) { const j = SHOW.aura(x, it.x, it.y + 20, 120, qn, t, cr / (it.n - 1)); jx = j.dx; jy = j.dy; }
        x.save(); x.translate(it.x + jx, it.y + 20 + jy); x.rotate(wob); x.scale(1 + 0.1 * hit, 1 - 0.1 * hit); K.GL(x, 0, 0, 160, '#ffcc33', hov ? 0.7 : 0.35); K.EL(x, 0, 0, 72, 92, '#c8900a'); K.EL(x, -4, -4, 66, 86, K.RG(x, -20, -30, 5, 90, [[0, '#fff2a0'], [0.4, '#ffcc33'], [1, '#b87a10']])); K.EL(x, -22, -34, 14, 24, 'rgba(255,255,255,0.55)', -0.3); for (let k = 0; k < 5; k++) K.CI(x, -40 + k * 20, 20 + (k % 2) * 8, 4, '#e04040');
        if (cr) CRK.slice(0, Math.min(4, Math.ceil(cr * 4 / (it.n - 1)))).forEach(pts => crack(x, pts, QC(qn)));
        x.restore(); }
      else { const pop = it.openT != null ? K.pop(t - it.openT) : 1; if (it.f.q >= 0) K.GL(x, it.x, it.y, 200, QC(it.f.q), 0.3 + 0.15 * Math.sin(t * 5)); K.GL(x, it.x, it.y, 160, it.f.c, 0.6); K.EL(x, it.x, it.y + 70, 72, 30, '#c8900a'); K.PL(x, [[it.x - 72, it.y + 60], [it.x - 50, it.y + 40], [it.x - 30, it.y + 62], [it.x - 10, it.y + 38], [it.x + 12, it.y + 62], [it.x + 32, it.y + 40], [it.x + 50, it.y + 62], [it.x + 72, it.y + 60], [it.x + 60, it.y + 96], [it.x - 60, it.y + 96]], '#ffcc33'); K.IC(x, it.f.ic, it.x, it.y - 20 - Math.sin(t * 3) * 6, 100 * pop); K.chipC(x, it.f.n, it.x, it.y - 110, it.f.c); }
      (it.shards || []).forEach(s => { x.save(); x.translate(s.x, s.y); x.rotate(s.r); K.PL(x, [[-10, -8], [12, -4], [4, 10]], s.c || '#ffcc33'); x.restore(); }); });
    // 锤子：每一锤加速砸下，裂了就抬起来再砸；最后一锤砸碎后停一下收走
    if (mg.phase === 'smash' && mg.st) { const it = mg.items[mg.cur]; let j = 0; while (j + 1 < mg.st.length && mg.pt >= mg.st[j + 1]) j++; const u = (mg.pt - mg.st[j]) / HS, fin = j === mg.st.length - 1, a = u < 1 ? -1.6 + 2.2 * u * u : fin ? 0.6 : 0.6 - 2.2 * eo((mg.pt - mg.st[j] - HS) / 0.22);
      if (!(fin && mg.pt - mg.st[j] > HS + 0.35)) { x.save(); x.translate(it.x + 140, it.y - 130); x.rotate(a); K.R(x, -8, 0, 16, 150, '#8a5a2a'); K.RR(x, -50, -30, 100, 50, 8, '#c8d0dc', '#4a4a55', 3); x.restore(); } }
  } };

// ═════════════════════ 骰子对决 ═════════════════════
const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
K.die = (x, a, b, s, v, rot, col) => { x.save(); x.translate(a, b); x.rotate(rot || 0); K.RR(x, -s / 2, -s / 2, s, s, s * 0.18, col || C.cream, C.ink, 3); (pips[v] || []).forEach(([i, j]) => K.CI(x, i * s * 0.26, j * s * 0.26, s * 0.09, v === 1 ? C.red : C.ink)); x.restore(); };
MINI.dice = { title: '骰子对决', img: 't_dice', col: C.cream, text: '一个戴高帽的影子把两颗骨骰推到你面前。「比大小，三局。」',
  init(mg) { mg.round = 0; mg.max = 3; mg.net = 0; mg.wins = 0; mg.me = [3, 4]; mg.him = [5, 2]; mg.dice = []; },
  roll(mg, big) { const stake = big ? M.nice(mg.pay * 2.5) : mg.pay; if (!this.miniPay(stake)) return; mg.stake = stake; mg.round++; mg.net -= stake; SHOW.calm(mg);
    const r = () => 1 + Math.floor(rnd() * 6); mg.me = [r(), r()]; mg.him = [r(), r()]; if (mg.luck && rnd() < mg.luck && mg.me[0] + mg.me[1] <= mg.him[0] + mg.him[1]) mg.me = [r(), r()];
    // 点数这一刻就定了。他的两颗先停，你的第一颗再停；第二颗能决定胜负时，它多翻几面、在棱上打转 0.6 秒再倒——
    // 棱的另一面正好是「差一点就……」的那一面（赢的时候是会输的那面，输的时候是会赢的那面）
    const a0 = mg.me[0], b = mg.him[0] + mg.him[1], need = b - a0 + 1; mg.dec = a0 + 1 <= b && a0 + 6 > b; mg.tw = a0 + mg.me[1] > b ? need - 1 : need;
    mg.ST = [1.15, 1.45, 0.75, 0.95]; mg.res = 0; mg.idleAt = null; mg.rw = 0;
    mg.dice = [0, 1, 2, 3].map(i => ({ sx: i < 2 ? SX + 200 : SX + SW - 200, sy: i < 2 ? FLOOR - 40 : SY + 200, tx: CX + (i % 2 ? 60 : -60) + (rnd() - 0.5) * 30, ty: i < 2 ? SY + 480 : SY + 290, face: 1, rot: 0 }));
    if (mg.dec) { let tt = mg.ST[1], f = r(); mg.ft = []; mg.fl = [f]; for (let k = 0; k < 4; k++) { tt += 0.12 + 0.05 * k; mg.ft.push(tt); let n2 = r(); while (n2 === f) n2 = r(); mg.fl.push(f = n2); } mg.tee0 = tt + 0.16; mg.tee1 = mg.tee0 + 0.6; mg.resAt = mg.tee1 + 0.2; }
    else mg.resAt = mg.ST[1] + 0.2;
    this.miniSet('roll'); S.mini('dice', 'roll'); },
  btns(mg) { if (mg.phase !== 'idle') return []; const over = mg.round >= mg.max, big = M.nice(mg.pay * 2.5);
    return [{ t: '小注', sub: mg.pay + ' 积分 · 赢了拿双倍', dis: over || this.run.wallet < mg.pay, why: over ? '三局打完了' : '积分不够', fn: () => MINI.dice.roll.call(this, mg, false) }, { t: '大注', sub: big + ' 积分 · 赢了拿双倍', gold: !over, dis: over || this.run.wallet < big, why: over ? '三局打完了' : '积分不够', fn: () => MINI.dice.roll.call(this, mg, true) }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.net > 0 ? '影子把 ' + M.fmt(mg.net) + ' 积分推给了你，然后消失了。' : mg.net < 0 ? '影子收走了你 ' + M.fmt(-mg.net) + ' 积分。' : '你们握了握手。影子的手是冰的。', mg.net > 0 ? '#ffcc33' : '#8d8496') }]; },
  settle(mg, d, k) { d.set = 1; d.sq = mg.t; S.mini('dice', 'clack'); this.fx.kick(k); this.fx.spark(d.x, d.gy + 36, C.tan, 5 + k, { v: 220, w: 3, dir: -Math.PI / 2, spread: 2.4 }); },
  // 第二颗：一面一面慢慢翻（每翻一面响一下），然后立在棱上左右晃，最后倒向真实的那一面
  teeter(mg, d) { const u = mg.pt, PI = Math.PI;
    if (u < mg.tee0) { let k = 0; while (k < mg.ft.length && u >= mg.ft[k]) k++; if (k !== d.k) { d.k = k; if (k) { SHOW.crawl(this, mg, k); S.mini('dice', 'clack'); } } const t0 = k ? mg.ft[k - 1] : mg.ST[1], hp = cl((u - t0) / 0.14, 0, 1); d.face = mg.fl[k]; d.rot = (k + eo(hp)) * PI / 2; d.y = d.gy - Math.sin(hp * PI) * (22 - k * 3); return; }
    if (u < mg.tee1) { const w = (u - mg.tee0) / (mg.tee1 - mg.tee0), up = eo(w / 0.15), wob = Math.sin(w * PI * 5 + PI) * 0.2 * up, f = wob >= 0 ? mg.tw : mg.me[1]; if (f !== d.face) { d.face = f; d.tc = (d.tc || 4) + 1; SHOW.crawl(this, mg, d.tc); } d.rot = PI / 4 * up + wob; d.y = d.gy - 16 * up; return; }
    const p2 = cl((u - mg.tee1) / 0.12, 0, 1); d.face = mg.me[1]; d.rot = PI / 4 * (1 - p2 * p2); d.y = d.gy - 16 * (1 - p2 * p2); if (p2 >= 1 && !d.set) MINI.dice.settle.call(this, mg, d, 5); },
  tick(mg) {
    if (mg.phase !== 'roll') return; const b = mg.him[0] + mg.him[1];
    mg.dice.forEach((d, i) => { const T1 = mg.ST[i], p = cl(mg.pt / T1, 0, 1); d.gy = d.sy + (d.ty - d.sy) * eo(p); d.x = d.sx + (d.tx - d.sx) * eo(p); d.y = d.gy - Math.abs(Math.sin(p * Math.PI * 3)) * 70 * (1 - p);
      if (p < 1) { d.rot = (1 - p) * 12 + i * 0.3; d.face = 1 + Math.floor((mg.pt * 17 + i * 3) % 6); if (Math.floor(mg.pt * 10) !== d.tk) { d.tk = Math.floor(mg.pt * 10); if (i === 0) S.mini('dice', 'clack'); } }
      else if (i === 1 && mg.dec) MINI.dice.teeter.call(this, mg, d);
      else if (!d.set) { d.rot = (i - 1.5) * 0.08; d.face = i < 2 ? mg.me[i] : mg.him[i - 2]; MINI.dice.settle.call(this, mg, d, 2);
        if (i === 0 && mg.dec) SHOW.reach(this, mg, { x: mg.dice[1].tx, y: mg.dice[1].ty, r: 110, lv: mg.me[0] === 6 && b < 12 ? 2 : 1 }); } });
    if (mg.pt >= mg.resAt && !mg.res) { mg.res = 1; mg.resT = mg.t; const a = mg.me[0] + mg.me[1], d1 = mg.dice[1]; let v = 0, tier = 0;
      if (a > b) { const dbl = mg.me[0] === 6 && mg.me[1] === 6; v = mg.stake * (dbl ? 3 : 2); tier = dbl ? 2 : 1; mg.wins++; mg.rw = 1; this.miniSay((dbl ? '双六！×3 ' : '赢了！') + a + ' 比 ' + b, '#ffcc33', true); S.mini('dice', 'win'); this.fx.ring(CX, SY + 480, 10, 120, C.gold, 5, 0.3);
        SHOW.later(mg, 0.06, () => SHOW.win(this, mg, tier, { x: CX, y: SY + 480, col: C.gold, v, label: dbl ? '×3' : '' })); }
      else if (a === b) { v = mg.stake; this.miniSay('平局，退回赌注', '#e8dcc4'); S.mini('dice', 'tie'); if (mg.dec) SHOW.near(this, mg, d1.x, d1.y, '差一点！'); else SHOW.calm(mg); }
      else { this.miniSay('输了 ' + a + ' 比 ' + b, '#ff6a5a'); S.mini('dice', 'lose'); if (mg.dec) SHOW.near(this, mg, d1.x, d1.y, '差一点！'); else SHOW.lose(this, mg); }
      if (v) { mg.net += v; SHOW.later(mg, tier ? 0.14 : 0, () => this.award([{ k: 'wallet', v }], { x: CX, y: SY + 480 })); }
      mg.idleAt = mg.pt + (tier ? 0.3 : 0.15);
      // 三局打完还赚着：评级章砸下，再按全胜 / 小胜走中奖档，滚一遍总盈利
      if (mg.round >= mg.max && mg.net > 0) { const gr = mg.wins >= 3 ? 'S' : mg.wins >= 2 ? 'A' : 'B'; mg.idleAt = mg.pt + 1.0;
        SHOW.later(mg, 0.6, () => { SHOW.grade(this, mg, gr, SX + SW - 190, SY + 330); SHOW.win(this, mg, gr === 'S' ? 3 : 2, { x: CX, y: SY + 400, col: C.gold, v: mg.net, label: gr === 'S' ? '大赢' : '' }); }); } }
    if (mg.idleAt != null && mg.pt >= mg.idleAt) this.miniSet('idle');
  },
  draw(x, mg) {
    const t = mg.t; x.fillStyle = K.RG(x, CX, SY + 380, 40, 700, [[0, '#1a3a2a'], [1, '#06100a']]); x.fillRect(SX, SY, SW, SH);
    K.EL(x, CX, SY + 390, 470, 230, C.umber); K.EL(x, CX, SY + 385, 450, 212, K.RG(x, CX, SY + 380, 30, 450, [[0, '#2a6a3a'], [1, '#12301a']]));
    K.SP(x, 'musician', CX, SY + 190, 150); K.GL(x, CX - 20, SY + 90, 40, '#ff4a4a', 0.5 + 0.3 * Math.sin(t * 3)); K.GL(x, CX + 20, SY + 90, 40, '#ff4a4a', 0.5 + 0.3 * Math.sin(t * 3));
    const show = mg.dice.length ? mg.dice : [{ x: CX - 60, y: SY + 480, face: mg.me[0] }, { x: CX + 60, y: SY + 480, face: mg.me[1] }, { x: CX - 60, y: SY + 290, face: mg.him[0] }, { x: CX + 60, y: SY + 290, face: mg.him[1] }];
    // 骰子：地上一块影子（跳得越高越小），落地压扁一下；这一局赢了你的两颗发金光
    show.forEach((d, i) => { const gy = d.gy == null ? d.y : d.gy, h = gy - d.y, sq = d.sq != null ? Math.exp(-(t - d.sq) * 16) : 0;
      K.EL(x, d.x, gy + 42, Math.max(12, 40 - h * 0.25), 9, 'rgba(0,0,0,0.4)');
      if (i < 2 && mg.rw && mg.res && t - mg.resT < 2.5) K.GL(x, d.x, d.y, 90, C.gold, 0.45 + 0.25 * Math.sin(t * 8));
      x.save(); x.translate(d.x, d.y + 38); x.scale(1 + 0.14 * sq, 1 - 0.14 * sq); K.die(x, 0, -38, 76, d.face, d.rot || 0, i < 2 ? C.cream : C.silver); x.restore(); });
    // 点数：大号数码，揭晓时弹一下；你 / 他 是签；局数小牌；盈亏金色，亏了红色
    if ((mg.phase !== 'roll' || mg.res) && mg.round) { const pt = t - (mg.resT || 0); K.big(x, String(mg.me[0] + mg.me[1]), CX + 170, SY + 480, T.num, C.gold, pt, { num: true }); K.big(x, String(mg.him[0] + mg.him[1]), CX + 170, SY + 290, T.num, C.pink, pt, { num: true }); }
    K.chipC(x, '你', CX - 170, SY + 480, C.gold, T.item); K.chipC(x, '他', CX - 170, SY + 290, C.pink, T.item);
    K.sign(x, '第 ' + Math.min(mg.max, Math.max(1, mg.round)) + ' / ' + mg.max + ' 局', SX + 150, SY + 150, { kind: 'indigo', size: T.body }); U.text(x, (mg.net >= 0 ? '+' : '') + M.fmt(mg.net), SX + SW - 150, SY + 150, T.title, mg.net >= 0 ? C.gold : C.red, { num: true });
  } };

// ═════════════════════ 命运之轮 · pay in blood, spin the reel ═════════════════════
// the wheel is a wheel (user ruling 2026-09-25): the stone disc itself spins, slows down and stops with a sector under
// the pointer — no slot reel. Each sector says what it gives.
const FATE = [{ n: '空', c: C.haze, w: 16 }, { n: '积分倍率 +0.4', c: C.magenta, w: 16 }, { n: '部队', c: C.blue, w: 16 }, { n: 'FEVER', c: C.violet, w: 14 }, { n: '图纸', c: C.tan, w: 12 }, { n: '积分', c: C.gold, w: 16 }, { n: '诅咒', c: C.red, w: 10 }];
const SEG = Math.PI * 2 / FATE.length, FTA = 2.6;
// 每格的中奖档（0 = 没中）；倍率和图纸是「金格」
const FT = [0, 3, 2, 2, 3, 2, 0], TOPF = (k) => FT[k] >= 3;
MINI.fate = { title: '命运之轮', img: 'e_fate', col: C.red, text: '石头做的轮盘上刻满了名字。转动它的代价，是血。',
  init(mg) { mg.ang = 0; mg.spin = null; mg.fl = 0; mg.flv = 0; },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '以血转动', sub: '领袖 -12% 生命', danger: 1, fn: () => MINI.fate.spin.call(this, mg) }, { t: '离开', leave: 1, fn: () => this.miniFinish('你没有碰它。石轮自己转了半圈。', '#8d8496') }]; },
  spin(mg) {
    this.heroHurt(0.12); this.miniSet('spin'); S.mini('fate', 'cost'); S.mini('fate', 'spin');
    const idx = FATE.indexOf(M.wpick(FATE, o => o.w)), N = FATE.length;
    // 结果已定，下面只挑停在格子里的哪个位置：前一格是金格就「擦过」它、停在刚过线处；后一格是金格就停在线前
    const scrape = TOPF((idx + 1) % N) && !TOPF(idx), short = TOPF((idx + N - 1) % N) && !TOPF(idx), u = scrape ? 0.1 + rnd() * 0.06 : short ? 0.84 + rnd() * 0.06 : 0.5 + (rnd() - 0.5) * 0.6;
    // 指针下的格子 = floor(-角度/SEG)；角度的小数部分 u 就是停在格子里的位置；至少转 5 圈
    const base = mg.ang - (mg.ang % (Math.PI * 2)); let a1 = base + Math.PI * 2 * 6 + (u - idx - 1) * SEG; if (a1 < mg.ang + Math.PI * 8) a1 += Math.PI * 2;
    // 最后几格一格一格挪：每格之间停得越来越久，倒数第二格前多停一拍；擦过金格的最后一格慢慢蹭过去
    const n = TOPF(idx) || scrape ? 6 : 5, aC = a1 - n * SEG, steps = []; let tt = 0;
    for (let k = 0; k < n; k++) { const last = k === n - 1, sc = last && scrape, d = sc ? 1.0 : 0.16 + 0.035 * k + (last ? 0.1 : 0); steps.push({ t0: tt, d, a: aC + k * SEG, sc }); tt += d + (last ? 0 : 0.05 + 0.07 * k + (k === n - 2 ? 0.3 : 0)); }
    mg.spin = { a0: mg.ang, aC, a1, u, tt: 0, steps, end: FTA + tt, idx, scrape, lastSeg: Math.floor(mg.ang / SEG), k: -1, ci: 0 };
  },
  beat(mg, k) { const sp = mg.spin, n = sp.steps.length;
    if ((TOPF(sp.idx) || sp.scrape) && k === n - 2) SHOW.reach(this, mg, { x: CX, y: SY + 160, r: 130, lv: 1 });
    if (k === n - 1) { if (TOPF(sp.idx)) SHOW.slowmo(mg, 0.45, 0.9); if (sp.scrape) SHOW.slowmo(mg, 0.5, 1.2); } },
  // 停下：指针下那格先亮 → 近处火花 → 舞台中奖档 → 奖励从指针飞走 → 结算；没中一拍带过
  land(mg) { const sp = mg.spin, idx = sp.idx, o = FATE[idx], tier = FT[idx], py = SY + 150; mg.hitT = mg.t; S.mini('fate', 'stop'); this.fx.kick(tier ? 4 + tier : 3);
    if (tier) { this.fx.spark(CX, py + 20, o.c, 10 + tier * 5, { v: 600 }); this.fx.ring(CX, py, 10, 120, o.c, 5, 0.3);
      SHOW.later(mg, 0.07, () => SHOW.win(this, mg, tier, { x: CX, y: SY + 380, col: o.c, v: idx === 5 ? M.nice(mg.P * 16) : 0, label: WL(tier) }));
      SHOW.later(mg, 0.2, () => MINI.fate.resolve.call(this, mg, idx)); SHOW.later(mg, tier >= 3 ? 2.0 : 1.3, () => MINI.fate.finish.call(this, mg)); }
    else { if (sp.scrape) SHOW.near(this, mg, CX, py + 40, '差一点！'); else SHOW.lose(this, mg); if (idx === 6) this.fx.flash(C.red, 0.15); MINI.fate.resolve.call(this, mg, idx); SHOW.later(mg, 0.45, () => MINI.fate.finish.call(this, mg)); } },
  resolve(mg, idx) {
    const run = this.run, P = mg.P; let tx = '', col = FATE[idx].c; const g = [];
    if (idx === 0) tx = '石轮停在空白处。血白流了。';
    if (idx === 1) { run.runBuff.mult = (run.runBuff.mult || 0) + 0.4; tx = '本局初始积分倍率 +0.4。'; }
    if (idx === 2) { const t = M.pickUnitQ(run); if (M.canAdd(run, t)) { g.push({ k: 'unit', type: t }); tx = '石轮上走下来一个 ' + M.DB[t].n + '。'; } else { g.push({ k: 'wallet', v: M.nice(P * 6) }); tx = '队伍满了，名字化成了积分。'; } }
    if (idx === 3) { run.mods.feverStart = (run.mods.feverStart || 0) + 0.2; tx = '石轮发烫。本局每场战斗开局 FEVER 槽 +20%。'; }
    if (idx === 4) { g.push(K.bp(null, 1)); tx = '一张刻在石片上的图纸。'; }
    if (idx === 5) { g.push({ k: 'wallet', v: M.nice(P * 16) }); tx = '血变成了金子。'; }
    if (idx === 6) { tx = '石轮记住了你的名字。生命 -' + this.heroHurt(0.15) + '。'; }
    const got = g.length ? this.award(g, { x: CX, y: SY + 200 }) : []; mg.fin = [tx + (got.length ? '\n获得：' + got.join('、') : ''), col];
  },
  finish(mg) { if (this.mini === mg && mg.fin) this.miniFinish(mg.fin[0], mg.fin[1]); },
  tick(mg, dt) {
    const sp = mg.spin;
    if (!sp) mg.ang += dt * 0.2;
    else if (!sp.done) { sp.tt += dt;
      if (sp.tt < FTA) mg.ang = sp.a0 + (sp.aC - sp.a0) * eo(sp.tt / FTA);
      else { const tc = sp.tt - FTA; let k = 0; while (k + 1 < sp.steps.length && tc >= sp.steps[k + 1].t0) k++; const st = sp.steps[k], p = cl((tc - st.t0) / st.d, 0, 1);
        if (k !== sp.k) { sp.k = k; MINI.fate.beat.call(this, mg, k); }
        // 蹭过金格：慢慢挪到钉子前几乎停住、指针被顶弯，然后一下滑过去；停在线前的不用回弹，免得越线
        const e2 = st.sc ? (p < 0.8 ? (0.97 - sp.u) * (1 - Math.pow(1 - p / 0.8, 2)) : (0.97 - sp.u) + (sp.u + 0.03) * eo((p - 0.8) / 0.2)) : sp.u < 0.8 ? eb(p) : eo(p);
        mg.ang = st.a + SEG * e2; }
      const seg = Math.floor(mg.ang / SEG); if (seg !== sp.lastSeg) { sp.lastSeg = seg; S.mini('fate', 'click'); if (sp.tt >= FTA) SHOW.crawl(this, mg, ++sp.ci); }
      if (sp.tt >= sp.end) { mg.ang = sp.a1; sp.done = true; MINI.fate.land.call(this, mg); } }
    // 指针：每一格的钉子转过来时把它往右顶，过去后弹回来晃两下
    const uu = ((mg.ang / SEG) % 1 + 1) % 1, push = uu > 0.78 ? -(uu - 0.78) / 0.22 * 0.55 : 0;
    if (push < mg.fl) { mg.fl = push; mg.flv = 0; } else { mg.flv += (-mg.fl * 300 - mg.flv * 16) * dt; mg.fl += mg.flv * dt; }
  },
  draw(x, mg) {
    const t = mg.t, sp = mg.spin; x.fillStyle = K.RG(x, CX, SY + 380, 40, 700, [[0, '#3a1010'], [1, '#0a0404']]); x.fillRect(SX, SY, SW, SH);
    const wx = CX, wy = SY + 380, R = 240; K.CI(x, wx, wy + 16, R + 30, 'rgba(0,0,0,0.5)'); K.CI(x, wx, wy, R + 24, C.slate);
    x.save(); x.translate(wx, wy); x.rotate(mg.ang);
    // sectors, each in its outcome's colour with its name along the radius; 金格外圈闪一道白，停中的那格一跳一跳地亮
    FATE.forEach((o, i) => { const a = -Math.PI / 2 + i * SEG; x.fillStyle = i % 2 ? '#2a2632' : '#1e1a26'; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a, a + SEG); x.closePath(); x.fill();
      if (sp && sp.done && i === sp.idx && FT[i]) { x.save(); x.globalAlpha = 0.25 + 0.2 * Math.sin((t - mg.hitT) * 10); x.fillStyle = U.pal(o.c); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, a, a + SEG); x.closePath(); x.fill(); x.restore(); }
      x.fillStyle = o.c; x.beginPath(); x.arc(0, 0, R, a, a + SEG); x.arc(0, 0, R - 22, a + SEG, a, true); x.closePath(); x.fill();
      if (TOPF(i)) { x.save(); x.globalAlpha = 0.35 + 0.3 * Math.sin(t * 5 + i); x.strokeStyle = U.pal(C.white); x.lineWidth = 4; x.beginPath(); x.arc(0, 0, R - 11, a + 0.04, a + SEG - 0.04); x.stroke(); x.restore(); }
      x.strokeStyle = C.ink; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * R, Math.sin(a) * R); x.stroke();
      K.R(x, Math.round(Math.cos(a) * (R + 8)) - 8, Math.round(Math.sin(a) * (R + 8)) - 8, 16, 16, C.ink); K.R(x, Math.round(Math.cos(a) * (R + 8)) - 5, Math.round(Math.sin(a) * (R + 8)) - 5, 10, 10, C.gold);
      x.save(); x.rotate(a + SEG / 2 + Math.PI / 2); M.UI.text(x, o.n, 0, -R * 0.6, o.n.length > 3 ? 20 : 26, o.c, { outline: true }); x.restore(); });
    K.CI(x, 0, 0, 50, C.dusk); K.CI(x, 0, 0, 26, C.red); x.restore();
    for (let i = 0; i < 8; i++) { const q = (t * 0.4 + i / 8) % 1; K.CI(x, wx - 300 + i * 80, SY + 120 + q * 500, 4, 'rgba(208,69,60,' + (1 - q) + ')'); }
    // the pointer at the top hangs from a pivot and gets flicked by each stud; the sector under it glows once the wheel has stopped
    x.save(); x.translate(wx, wy - R - 42); x.rotate(mg.fl); K.PL(x, [[-26, -2], [26, -2], [0, 52]], C.ink); K.PL(x, [[-20, 2], [20, 2], [0, 46]], C.red); K.CI(x, 0, 0, 8, C.gold); x.restore();
    if (sp && sp.done) { const o = FATE[sp.idx]; K.big(x, o.n, wx, wy + R + 60, 40, o.c, t - mg.hitT, { outline: true }); }
  } };
})();

;
