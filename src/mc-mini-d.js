// ==== mc-mini-d.js ====
(function () {
// 温泉 / 地雷阵 / 招财猫 / 黑市 / 特训 / 古像 / 斗兽场 / 营火 / 招募旗, plus routing every non-battle node into its game.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, K = M.MK, MINI = M.MINI;
const { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd } = K;
const heroSp = (g) => M.HEROES[g.run.hero.cls].sprite;
const bgv = (x, top, bot) => { x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, top], [1, bot]]); x.fillRect(SX, SY, SW, SH); };
const PENTA = [392, 440, 523, 587, 659, 784, 880, 1047];

// ═════════════════════ 温泉 · hold to soak, release in the sweet spot ═════════════════════
MINI.spring = { title: '地下温泉', img: 'e_spring', col: '#6fd0ff', text: '泉水冒着热气。泡到刚刚好最舒服——泡过头会晕。',
  init(mg) { mg.heat = 0; mg.band = [0.55, 0.78]; mg.soaks = 0; },
  down(mg) { if (mg.phase === 'ready') this.miniSet('soak'); },
  up(mg) { if (mg.phase === 'soak') MINI.spring.judge.call(this, mg); },
  judge(mg) { const h = mg.heat, [a, b] = mg.band, run = this.run; let tx, col;
    if (h >= a && h <= b) { const v = this.heroHeal(0.3); tx = '刚刚好。回复 ' + v + ' 生命。'; col = '#6fd0ff'; S.heal(); }
    else if (h > b) { const v = this.heroHurt(0.05); tx = '泡太久，晕了过去，醒来时头撞破了（-' + v + '）。'; col = '#ff6a5a'; }
    else { const v = this.heroHeal(0.12); tx = '还没泡热就起来了。回复 ' + v + ' 生命。'; col = '#9ccc6a'; }
    this.miniSet('done'); this.miniSay(tx.split('。')[0], col, true); setTimeout(() => this.mini === mg && this.miniFinish(tx, col), 1100); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '领袖泡一泡', sub: '按住泡，温度到绿色区域时松手', gold: 1, fn: () => this.miniSet('ready') }, { t: '让部队泡', sub: '本局部队生命 +10%', fn: () => { this.buffRun('unitHp', 0.1, '部队生命 +10%', '#6fd0ff'); this.miniSet('troops'); setTimeout(() => this.mini === mg && this.miniFinish('部队泡得满脸通红。本局部队生命 +10%。', '#6fd0ff'), 1400); } }, { t: '装一桶泉水', sub: '支援道具', dis: this.run.items.indexOf(null) < 0, why: '道具栏满了', fn: () => this.miniFinish('你装了一桶还在冒泡的泉水。', '#6fd0ff', [K.item(this.run, mg.P)]) }];
    if (mg.phase === 'ready') return [{ t: '按住空格 / 鼠标', sub: '下水', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) { if (mg.phase === 'soak') { mg.heat = cl(mg.heat + dt * (0.22 + mg.heat * 0.25), 0, 1); if (mg.heat >= 1) MINI.spring.judge.call(this, mg); if (Math.floor(mg.heat * 10) !== mg.tk) { mg.tk = Math.floor(mg.heat * 10); S.tick(mg.tk); } } },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#12202a', '#060a0e'); for (let i = 0; i < 16; i++) K.EL(x, SX + (i * 83) % SW, SY + 80 + (i % 4) * 30, 90, 40, 'rgba(40,50,60,0.6)');
    K.EL(x, CX, FLOOR - 40, 460, 110, '#3a3a44'); K.EL(x, CX, FLOOR - 50, 430, 90, K.RG(x, CX, FLOOR - 50, 20, 430, [[0, '#8fe0ff'], [1, '#2a7ab0']]));
    const inW = mg.phase === 'soak' || mg.phase === 'done' || mg.phase === 'troops'; x.save(); x.beginPath(); x.rect(SX, SY, SW, FLOOR - 70 - SY); x.clip(); if (mg.phase === 'troops') { this.run.roster.slice(0, 5).forEach((u, i) => K.SP(x, u.type, CX - 240 + i * 120, FLOOR - 20 + Math.sin(t * 3 + i) * 4, 110)); } else K.SP(x, heroSp(this), CX, FLOOR + (inW ? 40 : -40), 180); x.restore();
    for (let i = 0; i < 26; i++) { const q = (t * 0.3 + i / 26) % 1; x.globalAlpha = (1 - q) * (0.2 + mg.heat * 0.5); K.CI(x, CX - 400 + (i * 37) % 800 + Math.sin(q * 6 + i) * 20, FLOOR - 80 - q * 380, 20 + q * 40, '#e8f4ff'); } x.globalAlpha = 1;
    if (mg.phase !== 'idle' && mg.phase !== 'troops') { const gx = SX + SW - 140, gy = SY + 130, gh = 400; K.RR(x, gx - 30, gy - 10, 60, gh + 20, 30, '#0a080c'); K.R(x, gx - 14, gy + gh * (1 - mg.band[1]), 28, gh * (mg.band[1] - mg.band[0]), 'rgba(111,255,160,0.5)'); K.R(x, gx - 14, gy + gh * (1 - mg.heat), 28, gh * mg.heat, K.LG(x, 0, gy + gh, 0, gy, [[0, '#6fd0ff'], [0.6, '#ffcc33'], [1, '#ff3a2a']])); K.CI(x, gx, gy + gh + 30, 34, mg.heat > mg.band[1] ? '#ff3a2a' : '#6fd0ff'); K.PT(x, Math.round(30 + mg.heat * 40) + '°', gx, gy + gh + 30, 26, '#0a080c'); }
    if (mg.phase === 'ready') K.PT(x, '按住下水', CX, SY + 170, 44, '#8fe0ff');
  } };

// ═════════════════════ 地雷阵 · minesweeper crossing ═════════════════════
const TC = 6, TR = 3, TW = 150, TH = 130;
MINI.trap = { title: '地雷阵', img: 'e_trap', col: '#ff9a4a', text: '对面有个箱子。地上的数字告诉你周围埋了几颗雷。一次走一格。',
  init(mg) { mg.mine = [...Array(TR)].map(() => Array(TC).fill(0)); let n = 0; while (n < 5) { const r = Math.floor(rnd() * TR), c = 1 + Math.floor(rnd() * (TC - 2)); if (!mg.mine[r][c]) { mg.mine[r][c] = 1; n++; } }
    mg.open = [...Array(TR)].map(() => Array(TC).fill(0)); mg.at = null; mg.hp = 0; mg.x0 = CX - TC * TW / 2; mg.y0 = SY + 170; mg.booms = []; },
  cnt(mg, r, c) { let n = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < TR && cc >= 0 && cc < TC && mg.mine[rr][cc]) n++; } return n; },
  adj(mg, r, c) { if (!mg.at) return c === 0; return Math.abs(mg.at.r - r) + Math.abs(mg.at.c - c) === 1 || (Math.abs(mg.at.r - r) === 1 && Math.abs(mg.at.c - c) === 1); },
  step(mg, r, c) { if (mg.phase !== 'idle' || !MINI.trap.adj(mg, r, c)) return; mg.at = { r, c }; mg.open[r][c] = 1; S.land(c);
    if (mg.mine[r][c]) { mg.hp++; S.boom(); this.fx.kick(24); const px = mg.x0 + c * TW + TW / 2, py = mg.y0 + r * TH + TH / 2; this.fx.explode(px, py, '#ff7a2a', 1.3); this.heroHurt(0.1); mg.booms.push({ r, c }); this.miniSay('轰！', '#ff5a4a', true); if (mg.hp >= 3) { this.miniSet('dead'); } }
    if (c === TC - 1 && mg.phase === 'idle') { this.miniSet('win'); } },
  down(mg, px, py) { const c = Math.floor((px - mg.x0) / TW), r = Math.floor((py - mg.y0) / TH); if (r >= 0 && r < TR && c >= 0 && c < TC) MINI.trap.step.call(this, mg, r, c); },
  key(mg, k, down) { if (!down || mg.phase !== 'idle') return; const a = mg.at || { r: 1, c: -1 }, d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[k]; if (d) { const r = cl(a.r + d[0], 0, TR - 1), c = a.c + d[1]; if (c >= 0 && c < TC) MINI.trap.step.call(this, mg, r, c); return true; } },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '绕路', sub: mg.at ? '已经走进来了' : '-20 本局物资', leave: 1, dis: !!mg.at && false, fn: () => { const run = this.run; const v = Math.min(20, run.loot.supplies); this.hold('rsup', run.loot.supplies); run.loot.supplies -= v; this.release('rsup'); this.miniFinish('你绕了一大圈，丢了 ' + v + ' 物资。', '#8d8496'); } }]; },
  tick(mg) {
    if (mg.phase === 'win' && mg.pt > 0.6 && !mg.fin) { mg.fin = true; S.chest(); const run = this.run; this.miniFinish(mg.hp ? '你带着一身灰摸到了箱子。' : '一颗雷都没踩！箱子里的东西全归你。', '#ff9a4a', [K.item(run, mg.P), mg.hp ? { k: 'rsup', v: 20 } : K.bp(null, 1)]); }
    if (mg.phase === 'dead' && mg.pt > 1 && !mg.fin) { mg.fin = true; this.miniFinish('第三颗雷把你炸了回来。箱子还在对面。', '#d0453c'); }
  },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#2a2218', '#0e0a06');
    for (let r = 0; r < TR; r++) for (let c = 0; c < TC; c++) { const px = mg.x0 + c * TW, py = mg.y0 + r * TH, op = mg.open[r][c], can = mg.phase === 'idle' && MINI.trap.adj(mg, r, c), hov = can && mg.mx > px && mg.mx < px + TW && mg.my > py && mg.my < py + TH;
      K.RR(x, px + 4, py + 4, TW - 8, TH - 8, 8, op ? '#3a3024' : '#5a4a34', can ? (hov ? '#ffe08a' : 'rgba(255,224,138,0.5)') : '#2a2218', can ? 3 : 2);
      if (!op) { for (let i = 0; i < 3; i++) K.R(x, px + 20 + i * 38, py + 30 + (i % 2) * 40, 18, 6, 'rgba(0,0,0,0.2)'); }
      else if (mg.mine[r][c]) { K.CI(x, px + TW / 2, py + TH / 2, 26, '#2a2a33'); K.CI(x, px + TW / 2, py + TH / 2, 8, '#ff3a2a'); }
      else { const n = MINI.trap.cnt(mg, r, c); K.PT(x, n ? String(n) : '·', px + TW / 2, py + TH / 2, 54, ['#9cff7a', '#ffe08a', '#ff9a4a', '#ff4a3a', '#ff4a3a'][n] || '#fff'); } }
    K.PT(x, '起点', mg.x0 - 60, mg.y0 + TR * TH / 2, 28, '#e8dcc4'); K.IC(x, 'chest', mg.x0 + TC * TW + 70, mg.y0 + TR * TH / 2, 90); K.GL(x, mg.x0 + TC * TW + 70, mg.y0 + TR * TH / 2, 90, '#ffcc33', 0.4 + 0.2 * Math.sin(t * 3));
    const hp = mg.at ? { x: mg.x0 + mg.at.c * TW + TW / 2, y: mg.y0 + mg.at.r * TH + TH - 10 } : { x: mg.x0 - 60, y: mg.y0 + TR * TH / 2 + 80 }; K.SP(x, heroSp(this), hp.x, hp.y, 110);
    for (let i = 0; i < 3; i++) K.IC(x, 't_heart', SX + 90 + i * 50, SY + 130, 40 * (i < 3 - mg.hp ? 1 : 0.4));
  } };

// ═════════════════════ 招财猫 · catch the coin rain ═════════════════════
MINI.cat = { title: '招财猫', img: 'e_cat', col: '#ffcc33', text: '猫爪一招，天上就下钱。接住金币和金条，躲开炸弹。',
  init(mg) { mg.px = CX; mg.items = []; mg.sum = 0; mg.spawn = 0; mg.left = 8; mg.bombs = 0; },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '摸摸猫爪', sub: mg.pay + ' 积分 · 8 秒接钱（鼠标 / ← →）', gold: 1, dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; this.miniSet('rain'); } }, { t: '给猫鞠个躬', sub: '免费 · 本局事件好运 +5%', fn: () => { this.buffRun('eventLuck', 0.05, '好运 +5%', '#ffcc33'); this.miniFinish('猫眯起了眼睛。你觉得运气好了一点。', '#ffcc33'); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('猫爪还在一下一下地招。', '#8d8496') }]; return []; },
  tick(mg, dt) {
    if (mg.phase !== 'rain') return; mg.left = 8 - mg.pt;
    const kb = (mg.keys.left ? -1 : 0) + (mg.keys.right ? 1 : 0); if (kb) mg.px += kb * 900 * dt; else mg.px += (cl(mg.mx, SX + 80, SX + SW - 80) - mg.px) * Math.min(1, dt * 14); mg.px = cl(mg.px, SX + 80, SX + SW - 80);
    mg.spawn -= dt; if (mg.spawn <= 0 && mg.left > 0.6) { mg.spawn = 0.16 + rnd() * 0.12; const r = rnd(); mg.items.push({ x: SX + 80 + rnd() * (SW - 160), y: SY + 60, vy: 220 + rnd() * 200 + mg.pt * 30, k: r < 0.14 ? 'bomb' : r < 0.26 ? 'bar' : 'coin', rot: rnd() * 6 }); }
    const catchY = FLOOR - 40;
    mg.items.forEach(it => { it.vy += 500 * dt; it.y += it.vy * dt; it.rot += dt * 4; if (!it.done && it.y > catchY - 30 && it.y < catchY + 20 && Math.abs(it.x - mg.px) < 80) { it.done = true; if (it.k === 'bomb') { mg.sum = Math.floor(mg.sum * 0.6); mg.bombs++; S.boom(); this.fx.kick(14); this.fx.explode(it.x, catchY, '#ff5a3a', 1); } else { const v = it.k === 'bar' ? 5 : 1; mg.sum += v; S.coin(); this.fx.spark(it.x, catchY, '#ffcc33', it.k === 'bar' ? 10 : 4, { dir: -Math.PI / 2, spread: 1.5, v: 400 }); } } });
    mg.items = mg.items.filter(it => !it.done && it.y < FLOOR + 80);
    if (mg.left <= 0 && !mg.fin) { mg.fin = true; const v = M.nice(mg.P * 0.5 * mg.sum); this.miniFinish('猫爪停了。你接住了 ' + mg.sum + ' 份钱' + (mg.bombs ? '（被炸掉了一些）' : '') + '。', v > mg.pay ? '#ffcc33' : '#caa84a', v ? [{ k: 'wallet', v }] : []); }
  },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#3a1010', '#120404'); for (let i = 0; i < 10; i++) K.R(x, SX + i * 130, SY, 6, SH, 'rgba(255,200,80,0.04)');
    const cx0 = CX, cy0 = SY + 200, paw = Math.sin(t * (mg.phase === 'rain' ? 10 : 3)) * 0.5; K.CI(x, cx0, cy0, 90, '#f5f0e8'); K.PL(x, [[cx0 - 80, cy0 - 40], [cx0 - 60, cy0 - 120], [cx0 - 20, cy0 - 70]], '#f5f0e8'); K.PL(x, [[cx0 + 80, cy0 - 40], [cx0 + 60, cy0 - 120], [cx0 + 20, cy0 - 70]], '#f5f0e8'); K.EL(x, cx0 - 32, cy0 - 5, 10, 4, '#1a1418'); K.EL(x, cx0 + 32, cy0 - 5, 10, 4, '#1a1418'); K.R(x, cx0 - 60, cy0 + 50, 120, 16, '#d0202a'); K.CI(x, cx0, cy0 + 72, 16, '#ffcc33');
    x.save(); x.translate(cx0 + 100, cy0 - 20); x.rotate(-0.4 + paw); K.RR(x, -20, -100, 40, 100, 20, '#f5f0e8'); K.CI(x, 0, -100, 26, '#f5f0e8'); x.restore();
    mg.items.forEach(it => { x.save(); x.translate(it.x, it.y); if (it.k === 'coin') { x.scale(Math.abs(Math.cos(it.rot)) * 0.8 + 0.2, 1); K.IC(x, 'e_coin', 0, 0, 44); } else if (it.k === 'bar') { x.rotate(Math.sin(it.rot) * 0.3); K.PL(x, [[-30, 12], [30, 12], [22, -12], [-22, -12]], '#e8b830'); K.R(x, -18, -10, 36, 4, '#fff2a0'); } else { K.CI(x, 0, 0, 22, '#2a2a33'); K.R(x, -4, -32, 8, 12, '#6a6a78'); K.CI(x, 6, -34, 5, Math.floor(t * 12) % 2 ? '#ffcc33' : '#ff3a2a'); } x.restore(); });
    if (mg.phase === 'rain') { const px = mg.px, py = FLOOR - 40; K.EL(x, px, py + 20, 90, 30, '#6a3a1a'); K.PL(x, [[px - 90, py + 20], [px + 90, py + 20], [px + 70, py - 20], [px - 70, py - 20]], '#8a5a2a'); K.R(x, px - 70, py - 24, 140, 8, '#caa84a');
      K.PT(x, mg.sum + ' 份', SX + 170, SY + 140, 40, '#ffcc33'); K.R(x, CX - 200, SY + 60, 400 * cl(mg.left / 8, 0, 1), 12, '#ffcc33'); }
    else K.SP(x, heroSp(this), CX - 330, FLOOR, 170);
  } };

// ═════════════════════ 黑市 · stop the price needle ═════════════════════
MINI.market = { title: '黑市', img: 'e_market', col: '#9a8aff', text: '斗篷底下的人亮出一张高级图纸。「价钱？看你手快不快。」',
  init(mg) { mg.base = M.nice(mg.P * 14); mg.needle = 0; mg.price = 0; mg.tries = 0; },
  stop(mg) { if (mg.phase !== 'swing') return; const k = 0.4 + mg.needle * 1.4; mg.mul = k; mg.price = M.nice(mg.base * k); this.miniSet('offer'); S.stamp(); this.fx.kick(5); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'swing') { MINI.market.stop.call(this, mg); return true; } },
  down(mg) { if (mg.phase === 'swing') MINI.market.stop.call(this, mg); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '开始砍价', sub: '指针越靠左越便宜', gold: 1, fn: () => { mg.tries++; this.miniSet('swing'); } }, { t: '卖掉一名部队', sub: '按 1.5 倍价格收', dis: !this.run.roster.length, why: '你没有部队', fn: () => { const run = this.run, u = run.roster.slice().sort((a, b) => M.sellValue(run, b) - M.sellValue(run, a))[0], v = M.nice(M.sellValue(run, u) * 1.5); run.roster = run.roster.filter(o => o !== u); this.miniFinish('斗篷人牵走了 ' + M.DB[u.type].n + '，丢给你一袋钱。', '#9a8aff', [{ k: 'wallet', v }]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('斗篷人缩回了阴影里。', '#8d8496') }];
    if (mg.phase === 'swing') return [{ t: '拍板！', sub: '空格 / 点击', gold: 1, fn: () => MINI.market.stop.call(this, mg) }];
    if (mg.phase === 'offer') return [{ t: '成交', sub: mg.price + ' 积分', gold: 1, dis: this.run.wallet < mg.price, why: '积分不够', fn: () => { if (!this.miniPay(mg.price)) return; this.miniFinish('你用 ' + mg.price + ' 积分买下了图纸（原价 ' + mg.base + '）。', '#9a8aff', [K.bp(null, 2)]); } }, { t: '再砍一次', sub: '他会更不耐烦', dis: mg.tries >= 2, why: '他不跟你砍了', fn: () => { mg.tries++; this.miniSet('swing'); } }, { t: '算了', leave: 1, fn: () => this.miniFinish('你把图纸推了回去。', '#8d8496') }]; return []; },
  tick(mg) { if (mg.phase === 'swing') { const sp = 1.3 + mg.tries * 0.6, q = (mg.pt * sp) % 2; mg.needle = q < 1 ? q : 2 - q; } },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#141228', '#06050c'); K.SP(x, 'stall', CX + 300, FLOOR - 40, 180); K.GL(x, CX + 300, FLOOR - 200, 160, '#9a8aff', 0.25);
    K.RR(x, CX - 460, SY + 150, 300, 380, 10, '#f5ead4'); K.R(x, CX - 440, SY + 170, 260, 340, '#2a4a8a'); for (let i = 0; i < 6; i++) K.R(x, CX - 420, SY + 200 + i * 44, 220 - (i % 3) * 40, 4, 'rgba(255,255,255,0.5)'); K.IC(x, 'scroll', CX - 310, SY + 420, 90); K.PT(x, '高级图纸', CX - 310, SY + 480, 28, '#ffe08a');
    const gx = CX + 20, gy = SY + 420, R = 200; x.lineWidth = 36; [[Math.PI, Math.PI * 1.33, '#9cff7a'], [Math.PI * 1.33, Math.PI * 1.66, '#ffcc33'], [Math.PI * 1.66, Math.PI * 2, '#ff5a4a']].forEach(([a, b, c]) => { x.strokeStyle = c; x.beginPath(); x.arc(gx, gy, R, a, b); x.stroke(); });
    [0.4, 1, 1.8].forEach((k, i) => K.TX(x, '×' + k, gx + Math.cos(Math.PI + i * Math.PI / 2) * (R + 50), gy + Math.sin(Math.PI + i * Math.PI / 2) * (R + 50), 22, '#e8dcc4'));
    const a = Math.PI + mg.needle * Math.PI; K.LN(x, gx, gy, gx + Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10), 6, '#fff'); K.CI(x, gx, gy, 16, '#caa84a');
    if (mg.phase === 'offer') { K.PT(x, mg.price + ' 积分', gx, gy + 70, 48, mg.mul < 0.8 ? '#9cff7a' : mg.mul < 1.3 ? '#ffcc33' : '#ff6a5a'); K.TX(x, '原价 ' + mg.base, gx, gy + 120, 22, '#a89ca8'); }
  } };

// ═════════════════════ 特训 · mash to train a soldier ═════════════════════
MINI.trainer = { title: '地下拳馆', img: 'e_trainer', col: '#ff8a3a', text: '教练叼着烟：「交钱，挑个人，打沙袋。打得越狠，练得越壮。」',
  init(mg) { mg.hits = 0; mg.bag = 0; },
  cards(mg) { const R = this.run.roster.slice(0, 8), n = R.length, w = 120; return R.map((u, i) => ({ u, x: CX - (n - 1) * (w + 14) / 2 + i * (w + 14), y: SY + 380 })); },
  punch(mg) { if (mg.phase !== 'mash') return; mg.hits++; mg.bag = 1; S.hit(); this.fx.kick(2 + Math.min(8, mg.hits / 4)); this.fx.spark(CX + 170, SY + 330, '#ffe08a', 4, { dir: 0, spread: 1, v: 400 }); },
  down(mg, px, py) { if (mg.phase === 'select') { const c = MINI.trainer.cards.call(this, mg).find(c => Math.abs(px - c.x) < 60 && Math.abs(py - c.y) < 80); if (c) { if (!this.miniPay(mg.pay)) return; mg.u = c.u; this.miniSet('count'); } } else MINI.trainer.punch.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'mash') { MINI.trainer.punch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '挑一名部队', sub: mg.pay + ' 积分 · 4 秒疯狂出拳', gold: 1, dis: !this.run.roster.length || this.run.wallet < mg.pay, why: this.run.roster.length ? '积分不够' : '你没有部队', fn: () => this.miniSet('select') }, { t: '离开', leave: 1, fn: () => this.miniFinish('教练把烟头弹进了沙袋里。', '#8d8496') }];
    if (mg.phase === 'select') return [{ t: '算了', leave: 1, fn: () => this.miniFinish('教练把烟头弹进了沙袋里。', '#8d8496') }]; if (mg.phase === 'mash') return [{ t: '出拳！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.trainer.punch.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.bag = Math.max(0, mg.bag - dt * 6); if (mg.phase === 'count' && mg.pt > 1.5) this.miniSet('mash');
    if (mg.phase === 'mash' && mg.pt > 4 && !mg.fin) { mg.fin = true; const u = mg.u, k = Math.min(0.6, mg.hits * 0.018), D = M.DB[u.type]; u.bHp = (u.bHp || 0) + Math.round(D.hp * k); u.bAtk = (u.bAtk || 0) + Math.round(D.atk * k); if (mg.hits >= 26) u.lv = (u.lv || 1) + 1; S.up(3); this.miniFinish(mg.hits + ' 拳！' + D.n + ' 生命、攻击各 +' + Math.round(k * 100) + '%' + (mg.hits >= 26 ? '，等级 +1' : '') + '。', '#ff8a3a'); } },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#2a1a10', '#0c0806'); K.GL(x, CX, SY + 120, 300, '#ffd080', 0.3); K.LN(x, CX, SY, CX, SY + 120, 3, '#8a8a9a');
    if (mg.phase === 'select' || mg.phase === 'idle') { MINI.trainer.cards.call(this, mg).forEach(c => { const hov = mg.phase === 'select' && Math.abs(mg.mx - c.x) < 60 && Math.abs(mg.my - c.y) < 80; K.RR(x, c.x - 60, c.y - 80 - (hov ? 12 : 0), 120, 160, 8, 'rgba(10,8,14,0.9)', M.QUALITY[M.DB[c.u.type].q].c, hov ? 5 : 2); K.SP(x, c.u.type, c.x, c.y + 60 - (hov ? 12 : 0), 110); }); if (mg.phase === 'select') K.PT(x, '选一名部队', CX, SY + 200, 40, '#ff8a3a'); return; }
    const bx = CX + 170, sw = Math.sin(mg.bag * Math.PI) * 0.3; K.LN(x, bx, SY + 90, bx + Math.sin(sw) * 200, SY + 200, 4, '#8a8a9a'); x.save(); x.translate(bx, SY + 90); x.rotate(-sw); K.RR(x, -50, 110, 100, 240, 40, '#8a2a1a'); K.R(x, -50, 150, 100, 10, '#5a1a10'); K.R(x, -50, 300, 100, 10, '#5a1a10'); x.restore();
    K.SP(x, mg.u.type, CX - 80 + mg.bag * 30, FLOOR, 200);
    if (mg.phase === 'count') K.PT(x, String(Math.max(1, 3 - Math.floor(mg.pt * 2))), CX, SY + 250, 120, '#ffe08a');
    if (mg.phase === 'mash') { K.PT(x, mg.hits + ' 拳', CX - 300, SY + 200, 70, '#ffe08a'); K.R(x, CX - 200, SY + 80, 400 * cl(1 - mg.pt / 4, 0, 1), 14, '#ff8a3a'); K.R(x, CX - 200 + 400 * 26 / 40, SY + 70, 3, 34, '#fff'); }
  } };

// ═════════════════════ 古像 · rotate the rings to wake the statue ═════════════════════
MINI.statue = { title: '沉睡的古像', img: 'e_statue', col: '#8fe0ff', text: '石像胸口有三圈刻纹。把图案转正，它就会醒过来。只能转八次。',
  init(mg) { mg.rot = [1 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 3), Math.floor(rnd() * 4)]; if (mg.rot.every(v => v % 4 === 0)) mg.rot[0] = 2; mg.moves = 8; mg.anim = [0, 0, 0]; },
  turn(mg, i) { if (mg.phase !== 'idle' || mg.moves <= 0) return; mg.rot[i] = (mg.rot[i] + 1) % 4; if (i < 2) mg.rot[i + 1] = (mg.rot[i + 1] + (i === 0 ? 0 : 1)) % 4; mg.moves--; mg.anim[i] = 1; S.creak(); S.tick(i * 3);
    if (mg.rot.every(v => v === 0)) { this.miniSet('wake'); S.portal(); } else if (mg.moves <= 0) this.miniSet('sleep'); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [0, 1, 2].map(i => ({ t: ['转外圈', '转中圈（会带动内圈）', '转内圈'][i], sub: '剩 ' + mg.moves + ' 次', fn: () => MINI.statue.turn.call(this, mg, i) })).concat([{ t: '离开', leave: 1, fn: () => this.miniFinish('石像继续睡着。', '#8d8496') }]); },
  down(mg, px, py) { const d = Math.hypot(px - CX, py - (SY + 350)); if (d < 60) MINI.statue.turn.call(this, mg, 2); else if (d < 120) MINI.statue.turn.call(this, mg, 1); else if (d < 180) MINI.statue.turn.call(this, mg, 0); },
  tick(mg, dt) { mg.anim = mg.anim.map(a => Math.max(0, a - dt * 4));
    if (mg.phase === 'wake' && mg.pt > 1.6 && !mg.fin) { mg.fin = true; this.buffRun('unitAtk', 0.1, '部队攻击 +10%', '#8fe0ff'); this.run.mods.unitHp = (this.run.mods.unitHp || 0) + 0.1; this.miniFinish('石像睁开了眼睛，向你的部队点了点头。本局部队攻击、生命各 +10%。', '#8fe0ff'); }
    if (mg.phase === 'sleep' && mg.pt > 0.8 && !mg.fin) { mg.fin = true; this.miniFinish('刻纹卡住了。石像没有醒。', '#8d8496'); } },
  draw(x, mg) {
    const t = mg.t, cy = SY + 350; bgv(x, '#1a2230', '#06080c'); K.PL(x, [[CX - 240, FLOOR], [CX + 240, FLOOR], [CX + 180, SY + 110], [CX - 180, SY + 110]], '#4a4a55'); K.CI(x, CX, SY + 90, 90, '#5a5a66'); const eye = mg.phase === 'wake' ? cl(mg.pt, 0, 1) : 0; K.CI(x, CX - 34, SY + 90, 12, eye ? '#4af0ff' : '#2a2a33'); K.CI(x, CX + 34, SY + 90, 12, eye ? '#4af0ff' : '#2a2a33'); if (eye) K.GL(x, CX, SY + 90, 200, '#4af0ff', eye * 0.6);
    [[180, 0], [120, 1], [60, 2]].forEach(([rr, i]) => { const a = (mg.rot[i] - mg.anim[i] * 1) * Math.PI / 2; K.CI(x, CX, cy, rr, ['#6a6a78', '#7a7a88', '#8a8a98'][i]); x.strokeStyle = '#2a2a33'; x.lineWidth = 4; x.beginPath(); x.arc(CX, cy, rr, 0, 7); x.stroke();
      x.save(); x.translate(CX, cy); x.rotate(a); const w = rr - (i === 2 ? 0 : 60) * 0.5; x.fillStyle = mg.phase === 'wake' ? '#4af0ff' : '#caa84a'; if (i === 2) { K.PL(x, [[0, -44], [14, -10], [-14, -10]], x.fillStyle); K.CI(x, 0, 10, 12, x.fillStyle); } else { K.PL(x, [[-12, -rr + 6], [12, -rr + 6], [0, -rr + 50]], x.fillStyle); K.R(x, -4, rr - 50, 8, 40, x.fillStyle); } x.restore(); });
    K.PL(x, [[CX - 14, cy - 200], [CX + 14, cy - 200], [CX, cy - 180]], '#ffe08a');
    for (let i = 0; i < 8; i++) K.CI(x, SX + 90 + i * 34, SY + 130, 10, i < mg.moves ? '#8fe0ff' : '#2a3040');
  } };

// ═════════════════════ 斗兽场 · bet, then cheer ═════════════════════
MINI.arena = { title: '斗兽场', img: 'e_arena', col: '#ff6a5a', text: '两头怪物被推进场子。押一边，然后给它加油——喊得越响它打得越狠。',
  init(mg) { const a = M.pickUnitQ(this.run); let b = M.pickUnitQ(this.run); for (let i = 0; i < 8 && b === a; i++) b = M.pickUnitQ(this.run); mg.b = [a, b].map((k, i) => ({ k, hp: 1, x: i ? CX + 260 : CX - 260, hit: 0, pw: 0.8 + rnd() * 0.4 })); mg.cheer = 0; },
  bet(mg, i) { if (!this.miniPay(mg.pay)) return; mg.side = i; this.miniSet('fight'); S.alarm(); },
  down(mg) { if (mg.phase === 'fight') { mg.cheer = Math.min(1, mg.cheer + 0.12); S.tone(600 + mg.cheer * 400, 0.05, 'square', 0.04); } },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'fight') { MINI.arena.down.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return mg.b.map((b, i) => ({ t: '押' + ['左边', '右边'][i] + '的 ' + M.DB[b.k].n, sub: mg.pay + ' 积分 · 赢了 ×2.2', dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => MINI.arena.bet.call(this, mg, i) })).concat([{ t: '离开', leave: 1, fn: () => this.miniFinish('人群的吼声在你背后炸开。', '#8d8496') }]); if (mg.phase === 'fight') return [{ t: '加油！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.arena.down.call(this, mg) }]; return []; },
  tick(mg, dt) {
    mg.cheer = Math.max(0, mg.cheer - dt * 0.35); mg.b.forEach(b => b.hit = Math.max(0, b.hit - dt * 4));
    if (mg.phase !== 'fight') return; const [A, B] = mg.b; const gap = 120; A.x = Math.min(A.x + 200 * dt, CX - gap / 2); B.x = Math.max(B.x - 200 * dt, CX + gap / 2);
    if (A.x >= CX - gap / 2 - 1) { mg.cd = (mg.cd || 0) - dt; if (mg.cd <= 0) { mg.cd = 0.45; const who = rnd() < 0.5 ? 0 : 1, dmg = (0.06 + rnd() * 0.06) * mg.b[who].pw * (who === mg.side ? 1 + mg.cheer * 0.9 : 1); const tgt = mg.b[1 - who]; tgt.hp -= dmg; tgt.hit = 1; S.hit(); this.fx.kick(5); this.fx.spark(tgt.x, FLOOR - 90, '#ff5a3a', 8, { dir: who ? Math.PI : 0, spread: 1, v: 500 }); } }
    const dead = mg.b.findIndex(b => b.hp <= 0); if (dead >= 0 && !mg.fin) { mg.fin = true; const win = 1 - dead === mg.side; S.kill(); if (win) { const v = M.nice(mg.pay * 2.2); S.fanfare(); this.miniFinish(M.DB[mg.b[1 - dead].k].n + ' 赢了！你押对了。', '#ffcc33', [{ k: 'wallet', v }]); } else this.miniFinish(M.DB[mg.b[1 - dead].k].n + ' 赢了。你押的那头倒下了。', '#8d8496'); }
  },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#2a1a10', '#0a0604'); for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) { const j = mg.phase === 'fight' ? Math.abs(Math.sin(t * 8 + i + r)) * 6 * (0.4 + mg.cheer) : 0; K.CI(x, SX + 30 + i * 46, SY + 110 + r * 40 - j, 12, ['#4a3a30', '#5a4a3a', '#3a2e26'][(i + r) % 3]); }
    K.EL(x, CX, FLOOR + 10, 560, 90, '#8a6a3a'); K.EL(x, CX, FLOOR, 540, 76, '#b08a50');
    mg.b.forEach((b, i) => { const lunge = mg.phase === 'fight' ? Math.sin(t * 9 + i * 3) * 8 : 0; x.save(); if (b.hit) x.globalAlpha = 0.6 + 0.4 * Math.sin(t * 60); K.SP(x, b.k, b.x + (i ? -lunge : lunge), FLOOR, 180, i === 1); x.restore();
      K.R(x, b.x - 70, FLOOR - 230, 140, 14, '#1a1418'); K.R(x, b.x - 70, FLOOR - 230, 140 * cl(b.hp, 0, 1), 14, i === mg.side ? '#ffcc33' : '#ff5a4a'); K.TX(x, M.DB[b.k].n, b.x, FLOOR - 256, 22, i === mg.side ? '#ffcc33' : '#e8dcc4'); });
    if (mg.phase === 'fight') { K.R(x, CX - 150, SY + 250, 300, 16, '#1a1418'); K.R(x, CX - 150, SY + 250, 300 * mg.cheer, 16, '#ffcc33'); K.PT(x, '加油', CX, SY + 222, 30, '#ffe08a'); }
  } };

// ═════════════════════ 营火 · rest through the night, or sharpen on the beat ═════════════════════
MINI.camp = { title: '营火', img: 'e_camp', col: '#ffb03a', text: '火堆还温着。歇一夜，或者就着火光把刀磨快。',
  init(mg) { mg.hits = 0; mg.strokes = 0; mg.spark = 0; },
  stroke(mg) { if (mg.phase !== 'sharpen') return; const q = (mg.pt * 1.1) % 1, ok = Math.abs(q - 0.5) < 0.09; mg.strokes++; mg.spark = 1; if (ok) { mg.hits++; S.tone(1800, 0.12, 'triangle', 0.1); this.fx.spark(CX + 80, SY + 250, '#ffe08a', 14, { dir: -Math.PI / 2, spread: 2, v: 700 }); } else S.tone(300, 0.08, 'square', 0.05); if (mg.strokes >= 5) this.miniSet('sharpDone'); },
  down(mg) { MINI.camp.stroke.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sharpen') { MINI.camp.stroke.call(this, mg); return true; } },
  btns(mg) { const run = this.run; if (mg.phase === 'idle') return [{ t: '休息', sub: '领袖回复 ' + (run.mods.campHalf ? 12 : 30) + '% 生命', gold: 1, fn: () => this.miniSet('rest') }, { t: '磨刀', sub: '火星飞到正中时下刀 · 5 次', fn: () => this.miniSet('sharpen') }];
    if (mg.phase === 'sharpen') return [{ t: '下刀', sub: '空格 / 点击 · ' + mg.strokes + ' / 5', gold: 1, fn: () => MINI.camp.stroke.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.spark = Math.max(0, mg.spark - dt * 4); const run = this.run;
    if (mg.phase === 'rest' && mg.pt > 2.6 && !mg.fin) { mg.fin = true; const v = this.heroHeal(run.mods.campHalf ? 0.12 : 0.3); this.miniFinish('你在火边睡了一夜。回复 ' + v + ' 生命。', '#9ccc6a'); }
    if (mg.phase === 'sharpDone' && mg.pt > 0.6 && !mg.fin) { mg.fin = true; const k = 0.05 + mg.hits * 0.04; run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + k; S.up(2); this.miniFinish(mg.hits + ' / 5 刀磨在点上。本局领袖攻击 +' + Math.round(k * 100) + '%。', '#f2c14e'); } },
  draw(x, mg) {
    const t = mg.t, rest = mg.phase === 'rest', nq = rest ? cl(mg.pt / 2.6, 0, 1) : 0; bgv(x, rest ? '#0a0c20' : '#12101e', '#040306');
    const ma = Math.PI + nq * Math.PI; K.CI(x, CX + Math.cos(ma) * 480, SY + 330 + Math.sin(ma) * 220, 34, '#f5e8c0'); for (let i = 0; i < 30; i++) K.R(x, SX + (i * 97) % SW, SY + 70 + (i * 53) % 260, 2, 2, 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')');
    K.R(x, SX, FLOOR, SW, SH, '#141008'); const fx0 = CX, fy0 = FLOOR - 10; K.GL(x, fx0, fy0 - 60, 360, '#ff8a3a', 0.5 + 0.1 * Math.sin(t * 9)); K.LN(x, fx0 - 60, fy0 + 10, fx0 + 60, fy0 - 10, 12, '#5a3a22'); K.LN(x, fx0 - 60, fy0 - 10, fx0 + 60, fy0 + 10, 12, '#4a2e1a');
    for (let i = 0; i < 3; i++) { const f = 0.8 + 0.25 * Math.sin(t * 13 + i * 2); x.fillStyle = ['#ff5a1a', '#ffb030', '#fff2a0'][i]; x.beginPath(); x.moveTo(fx0 - 40 + i * 12, fy0); x.quadraticCurveTo(fx0 - 30 + i * 10, fy0 - 60 * f, fx0 + Math.sin(t * 7 + i) * 8, fy0 - (120 - i * 30) * f); x.quadraticCurveTo(fx0 + 30 - i * 10, fy0 - 60 * f, fx0 + 40 - i * 12, fy0); x.fill(); }
    for (let i = 0; i < 10; i++) { const q = (t * 0.6 + i / 10) % 1; K.R(x, fx0 + Math.sin(i * 3 + q * 5) * 40, fy0 - 60 - q * 300, 3, 3, 'rgba(255,200,90,' + (1 - q) + ')'); }
    if (rest) { K.SP(x, heroSp(this), CX - 220, FLOOR + 10, 150); for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; K.PT(x, 'Z', CX - 200 + q * 60, FLOOR - 170 - q * 90, 24 + i * 8, 'rgba(200,220,255,' + (1 - q) + ')'); } }
    else { K.SP(x, heroSp(this), CX - 230, FLOOR, 180); }
    if (mg.phase === 'sharpen' || mg.phase === 'sharpDone') { const q = (mg.pt * 1.1) % 1, bx = CX - 260 + q * 520; K.RR(x, CX - 280, SY + 300, 560, 40, 8, '#5a5a66'); K.R(x, CX - 42, SY + 300, 84, 40, 'rgba(255,224,138,0.35)'); K.R(x, CX - 3, SY + 296, 6, 48, '#ffe08a');
      if (mg.phase === 'sharpen') { K.GL(x, bx, SY + 320, 40, '#ffe08a', 0.8); K.CI(x, bx, SY + 320, 10, '#fff6c0'); } x.save(); x.translate(CX + 80, SY + 250); x.rotate(-0.3 - mg.spark * 0.3); K.PL(x, [[-160, -8], [60, -14], [80, 0], [60, 14], [-160, 8]], '#dfe6f0'); K.R(x, -200, -10, 40, 20, '#6a4a2a'); x.restore(); K.PT(x, mg.hits + ' / ' + mg.strokes, CX, SY + 390, 40, '#ffe08a'); }
  } };

// ═════════════════════ 招募旗 · curtains lift one by one ═════════════════════
MINI.recruit = { title: '招募旗', img: 'e_flag', col: '#6fa8dc', text: '旗子下面站着三个人影。帘子一掀开，只有一个能跟你走。',
  init(mg) { const run = this.run; if (this.node) run.lastL = M.levelAt(run, this.node); mg.pool = []; for (let i = 0; i < 16 && mg.pool.length < 3; i++) { const t = M.pickUnitQ(run); if (!mg.pool.includes(t)) mg.pool.push(t); } mg.cards = mg.pool.map((k, i) => ({ k, x: CX - 330 + i * 330, y: SY + 380, lift: 0 })); },
  take(mg, i) { if (mg.phase !== 'idle') return; const c = mg.cards[i], run = this.run; if (!M.canAdd(run, c.k)) { this.toast('队伍满了', '#d0453c'); return; } mg.cur = i; this.miniSet('take'); S.up(2); this.fx.rays(c.x, c.y - 60, M.QUALITY[M.DB[c.k].q].c, 1, { r: 260 }); },
  down(mg, px, py) { mg.cards.forEach((c, i) => { if (Math.abs(px - c.x) < 130 && Math.abs(py - c.y) < 190) MINI.recruit.take.call(this, mg, i); }); },
  btns(mg) { if (mg.phase !== 'idle') return []; return mg.cards.map((c, i) => ({ t: '选 ' + M.DB[c.k].n, sub: (M.DB[c.k].voc || '') + ' · 战力 ' + M.unitPower(c.k), dis: !M.canAdd(this.run, c.k), why: '队伍满了', fn: () => MINI.recruit.take.call(this, mg, i) })).concat([{ t: '都不要', leave: 1, fn: () => this.miniFinish('旗子在风里响了一会儿。', '#8d8496') }]); },
  tick(mg) { if (mg.phase === 'idle' || mg.phase === 'take') mg.cards.forEach((c, i) => c.lift = cl((mg.t - 0.5 - i * 0.45) / 0.5, 0, 1)); mg.cards.forEach((c, i) => { if (c.lift > 0.5 && !c.snd) { c.snd = 1; S.whoosh(0.2); S.land(i + M.DB[c.k].q); } });
    if (mg.phase === 'take' && mg.pt > 0.8 && !mg.fin) { mg.fin = true; const c = mg.cards[mg.cur]; this.miniFinish(M.DB[c.k].n + ' 跟上了你。', M.QUALITY[M.DB[c.k].q].c, [{ k: 'unit', type: c.k }]); } },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#141a2a', '#06080e'); K.R(x, SX, FLOOR - 20, SW, 140, '#2a2018');
    mg.cards.forEach((c, i) => { const D = M.DB[c.k], Q = M.QUALITY[D.q], hov = mg.phase === 'idle' && Math.abs(mg.mx - c.x) < 130 && Math.abs(mg.my - c.y) < 190, sel = mg.phase === 'take' && mg.cur === i, dim = mg.phase === 'take' && mg.cur !== i;
      x.save(); if (dim) x.globalAlpha = 0.35; const y = c.y - (hov || sel ? 16 : 0);
      K.RR(x, c.x - 130, y - 200, 260, 380, 10, '#0c0a10', Q.c, hov || sel ? 6 : 3); K.GL(x, c.x, y + 20, 200, Q.c, 0.3 * c.lift); K.SP(x, c.k, c.x, y + 110, 210);
      const tv = M.TAG.voc(D.voc); if (tv) K.IC(x, tv.icon, c.x + 100, y - 170, 44);
      K.PT(x, D.n, c.x, y + 150, 30, Q.c);
      const cu = 1 - c.lift; if (cu > 0) { K.R(x, c.x - 126, y - 196, 252, 372 * cu, K.LG(x, c.x - 126, 0, c.x + 126, 0, [[0, '#5a1a2a'], [0.5, '#8a2a3a'], [1, '#5a1a2a']])); for (let k = 0; k < 6; k++) K.R(x, c.x - 120 + k * 42, y - 196, 4, 372 * cu, 'rgba(0,0,0,0.25)'); K.R(x, c.x - 130, y - 206, 260, 14, '#caa84a'); }
      x.restore(); });
  } };

// ───────── node metadata for the new events (map icon, label, blurb) ─────────
Object.assign(M.EVENTS, {
  mine: { n: '废弃矿坑', sprite: 'u_pick', text: MINI.mine.text }, roulette: { n: '午夜转盘', sprite: 'e_wheel', text: MINI.roulette.text }, fruit: { n: '水果机', sprite: 'e_fruit', text: MINI.fruit.text },
  claw: { n: '抓娃娃机', sprite: 'e_claw', text: MINI.claw.text }, pachinko: { n: '弹珠台', sprite: 'e_pachinko', text: MINI.pachinko.text }, tree: { n: '世界树', sprite: 'e_tree', text: MINI.tree.text },
  tarot: { n: '占卜摊', sprite: 'e_card', text: MINI.tarot.text }, eggs: { n: '砸金蛋', sprite: 'e_egg', text: MINI.eggs.text }, dice: { n: '骰子对决', sprite: 't_dice', text: MINI.dice.text },
  fate: { n: '命运之轮', sprite: 'e_fate', text: MINI.fate.text }, spring: { n: '地下温泉', sprite: 'e_spring', text: MINI.spring.text }, trap: { n: '地雷阵', sprite: 'e_trap', text: MINI.trap.text },
  cat: { n: '招财猫', sprite: 'e_cat', text: MINI.cat.text }, market: { n: '黑市', sprite: 'e_market', text: MINI.market.text }, trainer: { n: '地下拳馆', sprite: 'e_trainer', text: MINI.trainer.text },
  statue: { n: '沉睡的古像', sprite: 'e_statue', text: MINI.statue.text }, arena: { n: '斗兽场', sprite: 'e_arena', text: MINI.arena.text } });
// where each encounter feels at home (weights by world; everything can appear anywhere)
const HOME = { casino: ['roulette', 'fruit', 'dice', 'pachinko', 'cat', 'claw', 'eggs'], park: ['claw', 'pachinko', 'fruit', 'eggs', 'arena'], forest: ['tree', 'spring', 'tarot', 'child'], town: ['musician', 'granny', 'well', 'child', 'market'], harbor: ['well', 'market', 'mirror', 'dice'], foundry: ['mine', 'trainer', 'trap', 'market'], ward: ['clinic', 'mirror', 'grave', 'altar'], starship: ['trap', 'statue', 'fate', 'mine'], hell: ['altar', 'fate', 'arena', 'grave', 'trap'], corridor: ['musician'] };
const oldGen = M.genMap2;
M.genMap2 = function (run, meta) {
  const res = oldGen.apply(this, arguments), map = res && res.nodes ? res : run.map; if (!map || !map.nodes || run.tut || (run.region && run.region.tut)) return res;
  const nodes = map.nodes; nodes.forEach(n => { if (n.type === 'normal' && n.col >= 2 && rnd() < 0.3) n.type = 'event'; });
  const home = HOME[run.regionKey] || [], keys = Object.keys(M.EVENTS).filter(k => MINI[k]), used = new Set();
  nodes.filter(n => n.type === 'event').forEach(n => { const pool = keys.filter(k => !used.has(k)); const k = M.wpick(pool.length ? pool : keys, k => home.includes(k) ? 4 : 1); used.add(k); n.ev = k; });
  return res;
};
// every non-battle stop opens its game
const oldOpen = G.openEvent, OLD = ['musician', 'granny', 'well', 'child', 'grave', 'clinic', 'mirror', 'altar', 'peddler'];
G.openEvent = function (n) {
  const k = n.type === 'camp' ? 'camp' : n.type === 'recruit' ? 'recruit' : n.type === 'event' && MINI[n.ev] ? n.ev : null;
  if (!k) return oldOpen.call(this, n);
  if (this.run.tut && k === 'musician') this.coachOnce('ev', '路上会遇到各种奇遇。每一个都是一个小游戏——试试看。', 960, 900);
  if (this.miniStart(k)) return;
  // a game that fails to start never blocks the road: fall back to the classic choice, or just move on
  if (n.type !== 'event' || OLD.includes(n.ev)) return oldOpen.call(this, n);
  this.finishNode();
};
})();

;
