// ==== mc-mini-c.js ====
(function () {
// The original nine encounters, rebuilt as games: 合奏 / 缝影 / 投币 / 跟脚印 / 挖墓 / 试药 / 镜像 / 献血 / 猜瓶子.
const M = window.MC, S = M.Sfx, K = M.MK, MINI = M.MINI;
const { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd } = K;
const heroSp = (g) => M.HEROES[g.run.hero.cls].sprite;
const PENTA = [392, 440, 523, 587, 659, 784, 880, 1047];
const night = (x, top, bot) => { x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, top], [1, bot]]); x.fillRect(SX, SY, SW, SH); };

// ═════════════════════ 流浪乐师 · rhythm ═════════════════════
const LANE_X = [CX - 170, CX, CX + 170], HIT_Y = FLOOR - 70, TRAVEL = 1.5;
MINI.musician = { title: '流浪乐师', img: 'musician', col: '#ffe08a', text: '没有脸的乐师拉着琴。琴声停下来，他把弓递给了你。',
  init(mg) { const n = 26; mg.notes = []; let t = 1.4, last = -1; for (let i = 0; i < n; i++) { let l = Math.floor(rnd() * 3); if (l === last && rnd() < 0.6) l = (l + 1 + Math.floor(rnd() * 2)) % 3; last = l; mg.notes.push({ t, l, m: (i * 2 + l) % 8, st: 0 }); t += [0.5, 0.5, 0.25, 0.75][Math.floor(rnd() * 4)]; } mg.end = t + 0.8; mg.score = 0; mg.combo = 0; mg.fly = []; mg.laneF = [0, 0, 0]; },
  start(mg) { this.miniSet('play'); mg.song = -0.6; S.whoosh(0.3); },
  hit(mg, l) { if (mg.phase !== 'play') return; mg.laneF[l] = 1; let best = null, bd = 0.24; mg.notes.forEach(n => { if (n.st || n.l !== l) return; const d = Math.abs(n.t - mg.song); if (d < bd) { bd = d; best = n; } });
    if (!best) { S.tone(140, 0.06, 'square', 0.04); mg.combo = 0; return; }
    best.st = bd < 0.08 ? 2 : 1; mg.score += best.st; mg.combo++; S.tone(PENTA[best.m], 0.28, 'triangle', 0.12); if (best.st === 2) S.tone(PENTA[best.m] * 2, 0.18, 'sine', 0.04);
    mg.fly.push({ x: LANE_X[l], y: HIT_Y, t: 0, txt: best.st === 2 ? '完美' : '不错', c: best.st === 2 ? '#ffe08a' : '#9cdc6a' }); if (best.st === 2) this.fx.spark(LANE_X[l], HIT_Y, '#ffe08a', 8, { dir: -Math.PI / 2, spread: 1.2, v: 500 }); },
  key(mg, k, down) { const l = { l0: 0, l1: 1, l2: 2, left: 0, down: 1, up: 1, right: 2 }[k]; if (l != null && mg.phase === 'play') { if (down) MINI.musician.hit.call(this, mg, l); return true; } },
  down(mg, px, py) { if (mg.phase !== 'play') return; const l = px < CX - 85 ? 0 : px > CX + 85 ? 2 : 1; MINI.musician.hit.call(this, mg, l); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '接过琴弓合奏', sub: '按 Q W E（或点三条音轨）跟上音符', gold: 1, fn: () => MINI.musician.start.call(this, mg) }, { t: '扔一枚硬币', sub: '免费 · 他会回赠物资', fn: () => this.miniFinish('他点点头，从琴盒里拿出一袋东西给你。', '#caa84a', [{ k: 'rsup', v: 15 }]) }, { t: '离开', leave: 1, fn: () => this.miniFinish('琴声在你背后停了。', '#8d8496') }]; },
  tick(mg, dt) {
    mg.laneF = mg.laneF.map(f => Math.max(0, f - dt * 5)); mg.fly.forEach(f => f.t += dt); mg.fly = mg.fly.filter(f => f.t < 0.7);
    if (mg.phase !== 'play') return; const prev = mg.song; mg.song += dt;
    if (Math.floor(prev * 2) !== Math.floor(mg.song * 2) && mg.song > 0) S.tone(Math.floor(mg.song * 2) % 4 ? 98 : 131, 0.08, 'sine', 0.08);
    mg.notes.forEach(n => { if (!n.st && mg.song - n.t > 0.24) { n.st = -1; mg.combo = 0; } });
    if (mg.song > mg.end) { const N = mg.notes.length, pct = mg.score / (N * 2); let tx, col, g = [];
      if (pct >= 0.8) { this.run.runBuff.mult = (this.run.runBuff.mult || 0) + 0.3; g.push({ k: 'wallet', v: M.nice(mg.P * 6) }); tx = '乐师第一次笑了（如果那算笑的话）。本局初始倍率 +0.3。'; col = '#ffcc33'; S.fanfare(); }
      else if (pct >= 0.55) { this.run.runBuff.unitAtk = (this.run.runBuff.unitAtk || 0) + 0.1; tx = '部队听得热血沸腾。本局部队攻击 +10%。'; col = '#f2c14e'; }
      else if (pct >= 0.3) { g.push({ k: 'rsup', v: 15 }); tx = '勉强能听。他还是给了你一点东西。'; col = '#caa84a'; }
      else { tx = '琴弦断了一根。他默默收起了琴。'; col = '#8d8496'; }
      this.miniFinish('合奏完成度 ' + Math.round(pct * 100) + '%。' + tx, col, g); }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#1a1030', '#0a0610'); K.GL(x, CX, SY + 200, 400, '#ffb060', 0.18);
    K.SP(x, 'musician', SX + 200, FLOOR - 20, 200); const bow = Math.sin((mg.song || t) * 8) * 20; K.LN(x, SX + 180 + bow, FLOOR - 170, SX + 260 + bow, FLOOR - 120, 3, '#e8dcc4');
    K.SP(x, heroSp(this), SX + SW - 200, FLOOR - 20, 170, true);
    LANE_X.forEach((lx, i) => { x.fillStyle = K.LG(x, 0, SY + 90, 0, HIT_Y, [[0, 'rgba(255,224,138,0)'], [1, 'rgba(255,224,138,' + (0.12 + mg.laneF[i] * 0.4) + ')']]); x.fillRect(lx - 70, SY + 90, 140, HIT_Y - SY - 60); K.R(x, lx - 70, SY + 90, 2, HIT_Y - SY - 60, 'rgba(255,224,138,0.2)'); K.R(x, lx + 68, SY + 90, 2, HIT_Y - SY - 60, 'rgba(255,224,138,0.2)');
      K.CI(x, lx, HIT_Y, 44, 'rgba(0,0,0,0.6)'); x.strokeStyle = mg.laneF[i] ? '#fff6c0' : '#ffe08a'; x.lineWidth = 5; x.beginPath(); x.arc(lx, HIT_Y, 40 + mg.laneF[i] * 8, 0, 7); x.stroke(); K.PT(x, ['Q', 'W', 'E'][i], lx, HIT_Y + 70, 32, '#ffe08a'); });
    const sp = (HIT_Y - SY - 90) / TRAVEL;
    mg.notes.forEach(n => { if (n.st > 0 || n.st === -1 && mg.song - n.t > 0.6) return; const y = HIT_Y - (n.t - (mg.song || -9)) * sp; if (y < SY + 60 || y > HIT_Y + 80) return; const col = ['#ff8ac0', '#8fe0ff', '#9cff7a'][n.l]; x.globalAlpha = n.st === -1 ? 0.3 : 1; K.GL(x, LANE_X[n.l], y, 50, col, 0.6); K.CI(x, LANE_X[n.l], y, 30, col); K.IC(x, 'e_music', LANE_X[n.l], y, 40); x.globalAlpha = 1; });
    mg.fly.forEach(f => { x.globalAlpha = 1 - f.t / 0.7; K.PT(x, f.txt, f.x, f.y - 60 - f.t * 80, 30, f.c); x.globalAlpha = 1; });
    if (mg.phase === 'play') { K.PT(x, '连击 ' + mg.combo, SX + SW - 200, SY + 140, 34, '#ffe08a'); const pct = mg.score / (mg.notes.length * 2); K.R(x, SX + 80, SY + 120, 300, 18, '#1a1418'); K.R(x, SX + 80, SY + 120, 300 * pct, 18, '#ffcc33'); [0.3, 0.55, 0.8].forEach(v => K.R(x, SX + 80 + 300 * v - 1, SY + 112, 3, 34, '#fff')); K.TX(x, '完成度', SX + 230, SY + 160, 20, '#cfc6b8'); if (mg.song < 0) K.PT(x, '准备', CX, SY + 300, 80, '#ffe08a'); }
  } };

// ═════════════════════ 裁缝老太 · sew a soldier into your shadow ═════════════════════
MINI.granny = { title: '裁缝老太', img: 'old', col: '#d0a0ff', text: '她能把一名部队缝进你的影子里，让你的伤口合上。针脚越齐，伤好得越快。',
  init(mg) { mg.marks = [0.12, 0.27, 0.42, 0.57, 0.72, 0.87].map(u => ({ u, ok: 0 })); mg.good = 0; },
  cards(mg) { const R = this.run.roster.slice(0, 8), n = R.length, w = 120; return R.map((u, i) => ({ u, x: CX - (n - 1) * (w + 14) / 2 + i * (w + 14), y: SY + 350 })); },
  down(mg, px, py) { if (mg.phase === 'select') { const c = MINI.granny.cards.call(this, mg).find(c => Math.abs(px - c.x) < 60 && Math.abs(py - c.y) < 80); if (c) { mg.pick = c.u; this.run.roster = this.run.roster.filter(u => u !== c.u); S.whoosh(0.4); this.fx.explode(c.x, c.y, '#d0a0ff', 1); this.miniSet('thread'); } } else if (mg.phase === 'sew') MINI.granny.stitch.call(this, mg); },
  stitch(mg) { const u = cl(mg.pt / 4, 0, 1); let best = null, bd = 0.035; mg.marks.forEach(m => { if (m.ok) return; const d = Math.abs(m.u - u); if (d < bd) { bd = d; best = m; } }); const p = MINI.granny.path(u);
    if (best) { best.ok = 1; mg.good++; S.tone(1200 + mg.good * 120, 0.08, 'triangle', 0.08); this.fx.spark(p.x, p.y, '#d0a0ff', 10, { dir: -Math.PI / 2, spread: 2, v: 400 }); } else { S.tone(180, 0.1, 'square', 0.05); mg.miss = (mg.miss || 0) + 1; this.fx.kick(3); } },
  path(u) { return { x: SX + 160 + u * (SW - 320), y: SY + 360 + Math.sin(u * Math.PI * 3) * 70 }; },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sew') { MINI.granny.stitch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献出一名部队', sub: this.run.roster.length ? '然后跟着针脚下针' : '你没有部队', gold: 1, dis: !this.run.roster.length, why: '你没有部队', fn: () => this.miniSet('select') }, { t: '离开', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }];
    if (mg.phase === 'select') return [{ t: '算了', leave: 1, fn: () => this.miniFinish('她继续缝着什么。', '#8d8496') }]; if (mg.phase === 'sew') return [{ t: '下针', sub: '空格 / 点击', gold: 1, fn: () => MINI.granny.stitch.call(this, mg) }]; return []; },
  tick(mg) { if (mg.phase === 'thread' && mg.pt > 1.2) this.miniSet('sew');
    if (mg.phase === 'sew' && mg.pt > 4.1) { const pct = 0.15 + mg.good * 0.06; const v = this.heroHeal(pct); this.miniFinish(M.DB[mg.pick.type].n + ' 被缝进了你的影子。' + mg.good + ' / 6 针落在点上，回复 ' + v + ' 生命。', mg.good >= 5 ? '#9ccc6a' : '#d0a0ff'); } },
  draw(x, mg) {
    const t = mg.t; night(x, '#2a1a2a', '#0c080c'); K.GL(x, CX, SY + 200, 360, '#ffc080', 0.2);
    K.SP(x, 'old', SX + 170, FLOOR - 10, 190); K.SP(x, heroSp(this), SX + SW - 180, FLOOR - 10, 180, true);
    const sh = SX + SW - 180; K.EL(x, sh + 40, FLOOR, 120, 20, 'rgba(0,0,0,0.6)');
    if (mg.phase === 'select' || mg.phase === 'idle') { MINI.granny.cards.call(this, mg).forEach(c => { const q = M.DB[c.u.type].q, hov = mg.phase === 'select' && Math.abs(mg.mx - c.x) < 60 && Math.abs(mg.my - c.y) < 80; K.RR(x, c.x - 60, c.y - 80 - (hov ? 12 : 0), 120, 160, 8, 'rgba(10,8,14,0.9)', M.QUALITY[q].c, hov ? 5 : 2); K.SP(x, c.u.type, c.x, c.y + 60 - (hov ? 12 : 0), 110); }); if (mg.phase === 'select') K.PT(x, '选一名部队', CX, SY + 200, 40, '#d0a0ff'); }
    if (mg.phase === 'thread') { const q = cl(mg.pt / 1.2, 0, 1); for (let i = 0; i < 20; i++) { const u = (i / 20 + q) % 1; K.CI(x, CX + (sh - CX) * u, SY + 350 + Math.sin(u * 9 + t * 5) * 40, 4, '#d0a0ff'); } K.GL(x, CX + (sh - CX) * q, SY + 350, 80, '#d0a0ff', 0.7); }
    if (mg.phase === 'sew') { x.strokeStyle = 'rgba(208,160,255,0.35)'; x.lineWidth = 3; x.setLineDash([12, 10]); x.beginPath(); for (let u = 0; u <= 1.001; u += 0.02) { const p = MINI.granny.path(u); u ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke(); x.setLineDash([]);
      mg.marks.forEach(m => { const p = MINI.granny.path(m.u); K.CI(x, p.x, p.y, 16, m.ok ? '#d0a0ff' : 'rgba(0,0,0,0.6)'); x.strokeStyle = m.ok ? '#fff' : '#d0a0ff'; x.lineWidth = 3; x.beginPath(); x.arc(p.x, p.y, 16, 0, 7); x.stroke(); if (m.ok) { K.LN(x, p.x - 10, p.y - 10, p.x + 10, p.y + 10, 3, '#fff'); K.LN(x, p.x + 10, p.y - 10, p.x - 10, p.y + 10, 3, '#fff'); } });
      const u = cl(mg.pt / 4, 0, 1), p = MINI.granny.path(u); x.strokeStyle = '#d0453c'; x.lineWidth = 3; x.beginPath(); for (let v = 0; v <= u; v += 0.01) { const q = MINI.granny.path(v); v ? x.lineTo(q.x, q.y - 4) : x.moveTo(q.x, q.y - 4); } x.stroke(); x.save(); x.translate(p.x, p.y); x.rotate(-0.8); K.IC(x, 'e_needle', 0, -20, 70); x.restore(); K.PT(x, mg.good + ' / 6', CX, SY + 170, 44, '#d0a0ff'); }
  } };

// ═════════════════════ 许愿井 · hold to throw a coin ═════════════════════
MINI.well = { title: '许愿井', img: 'well', col: '#6fd0ff', text: '井底有东西在回应你的脚步声。硬币扔得越准，回应越慷慨。',
  init(mg) { mg.throws = 0; mg.max = 2; mg.got = []; mg.band = 0.45 + rnd() * 0.3; mg.pow = 0; },
  down(mg) { if (mg.phase === 'ready') { this.miniSet('charge'); S.tick(2); } },
  up(mg) { if (mg.phase === 'charge') { mg.shot = mg.pow; this.miniSet('fly'); S.whoosh(0.3); } },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.throws >= mg.max; return [{ t: '拿出一枚硬币', sub: mg.pay + ' 积分 · 按住蓄力，松手扔出', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '井水平静了' : '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; mg.throws++; mg.band = 0.4 + rnd() * 0.38; this.miniSet('ready'); } }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.got.length ? '井底回应了你：' + mg.got.join('；') + '。' : '你没有许愿。', mg.got.length ? '#6fd0ff' : '#8d8496') }]; }
    if (mg.phase === 'ready' || mg.phase === 'charge') return [{ t: '按住空格 / 鼠标蓄力', sub: '在金色区域松手', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'charge') { const q = (mg.pt / 1.1) % 2; mg.pow = q < 1 ? q : 2 - q; if (Math.floor(mg.pt * 10) !== mg.tk) { mg.tk = Math.floor(mg.pt * 10); S.tick(Math.round(mg.pow * 8)); } }
    if (mg.phase === 'fly' && mg.pt > 0.95 && !mg.landed) { mg.landed = true; const acc = 1 - Math.abs(mg.shot - mg.band) / 0.32, run = this.run; let tx, col, g = [];
      if (acc > 0.8) { g.push(rnd() < 0.5 ? K.bp(null, 1) : K.item(run, mg.P)); tx = '正中井心！金光从井底涌上来'; col = '#ffcc33'; S.fanfare(); this.fx.rays(SX + SW - 300, SY + 380, '#ffcc33', 1.2, { r: 300 }); }
      else if (acc > 0.5) { g.push({ k: 'wallet', v: mg.pay * 2 }, { k: 'vision', v: 1 }); tx = '扑通。井水映出了前面的路，还吐出双倍积分'; col = '#6fd0ff'; S.up(2); }
      else if (acc > 0.2) { g.push({ k: 'rsup', v: 20 }); tx = '硬币擦着井沿掉了进去，捞上来一袋物资'; col = '#caa84a'; S.land(2); }
      else { tx = '硬币弹在井沿上，滚走了'; col = '#8d8496'; S.tone(1600, 0.1, 'triangle', 0.08); }
      const got = g.length ? this.award(g, { x: SX + SW - 300, y: SY + 380 }) : []; mg.got.push(tx + (got.length ? '（' + got.join('、') + '）' : '')); this.miniSay(tx, col, acc > 0.8); mg.acc = acc; }
    if (mg.phase === 'fly' && mg.pt > 2.2) { mg.landed = false; this.miniSet('idle'); }
  },
  draw(x, mg) {
    const t = mg.t, wx = SX + SW - 300, wy = SY + 400; night(x, '#0e1a2e', '#060a12'); K.CI(x, SX + 200, SY + 140, 40, '#f5e8c0'); K.CI(x, SX + 186, SY + 130, 36, '#0e1a2e');
    K.R(x, SX, FLOOR, SW, SH - (FLOOR - SY), '#1a2418');
    K.RR(x, wx - 150, wy - 20, 300, FLOOR - wy + 20, 10, '#5a5a66'); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) K.RR(x, wx - 146 + c * 59 + (r % 2) * 20, wy - 14 + r * 44, 54, 38, 4, ['#6a6a78', '#5a5a68'][(r + c) % 2]); K.EL(x, wx, wy - 20, 150, 34, '#4a4a55'); K.EL(x, wx, wy - 20, 126, 24, '#050810'); K.GL(x, wx, wy - 20, 120, '#6fd0ff', 0.2 + 0.1 * Math.sin(t * 2));
    K.R(x, wx - 160, wy - 220, 12, 200, '#5a3a22'); K.R(x, wx + 148, wy - 220, 12, 200, '#5a3a22'); K.PL(x, [[wx - 190, wy - 210], [wx, wy - 290], [wx + 190, wy - 210]], '#6a2a2a');
    const hx = SX + 220; K.SP(x, heroSp(this), hx, FLOOR, 180);
    // power meter with golden band
    const mx = hx + 110, my = FLOOR - 300, mh = 260; K.R(x, mx - 4, my - 4, 36, mh + 8, '#0a080c'); K.R(x, mx, my, 28, mh, '#1a1418'); K.R(x, mx, my + mh * (1 - mg.band) - mh * 0.08, 28, mh * 0.16, 'rgba(255,204,51,0.45)'); K.R(x, mx, my + mh * (1 - mg.band) - 2, 28, 4, '#ffcc33');
    if (mg.phase === 'charge' || mg.phase === 'ready') { K.R(x, mx, my + mh * (1 - mg.pow), 28, mh * mg.pow, '#6fd0ff'); K.PT(x, mg.phase === 'ready' ? '按住蓄力' : '松手！', mx + 14, my - 40, 30, '#ffe08a'); }
    // coin
    const traj = (s, q) => { const tx = hx + 60 + (wx - hx - 60) * (0.35 + s * 0.8) * q, h = 220 + s * 160; return { x: tx, y: FLOOR - 190 - Math.sin(q * Math.PI) * h + q * (wy - 40 - (FLOOR - 190)) }; };
    if (mg.phase === 'charge') { x.setLineDash([8, 10]); x.strokeStyle = 'rgba(255,224,138,0.4)'; x.lineWidth = 3; x.beginPath(); for (let q = 0; q <= 1; q += 0.05) { const p = traj(mg.pow, q); q ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y); } x.stroke(); x.setLineDash([]); }
    if (mg.phase === 'fly') { const q = cl(mg.pt / 0.95, 0, 1), p = traj(mg.shot, q); if (q < 1) { x.save(); x.translate(p.x, p.y); x.scale(Math.abs(Math.cos(mg.pt * 18)) * 0.8 + 0.2, 1); K.IC(x, 'e_coin', 0, 0, 40); x.restore(); } else if (mg.acc > 0.2) { for (let i = 0; i < 3; i++) { x.strokeStyle = 'rgba(143,224,255,' + cl(1 - (mg.pt - 0.95) / 0.8, 0, 1) + ')'; x.lineWidth = 3; x.beginPath(); x.ellipse(wx, wy - 20, 20 + (mg.pt - 0.95) * 120 * (1 + i * 0.4), 6 + (mg.pt - 0.95) * 30, 0, 0, 7); x.stroke(); } } }
    for (let i = 0; i < mg.max; i++) K.IC(x, 'e_coin', SX + 80 + i * 50, SY + 130, 40 * (i < mg.max - mg.throws ? 1 : 0.5));
  } };

// ═════════════════════ 迷路的孩子 · follow the footprints ═════════════════════
MINI.child = { title: '迷路的孩子', img: 'child', col: '#ffe08a', text: '她提着灯走在前面。每到岔口，她的脚印只亮一下。',
  init(mg) { mg.j = 0; mg.ok = 0; mg.ans = [0, 1, 2].map(() => rnd() < 0.5 ? 0 : 1); mg.walk = 0; },
  choose(mg, d) { if (mg.phase !== 'choose') return; const ok = d === mg.ans[mg.j]; mg.last = ok; if (ok) { mg.ok++; S.up(1); this.miniSay('灯光近了一点', '#ffe08a'); } else { S.tone(160, 0.3, 'sine', 0.1, -60); this.miniSay('她的灯更远了……', '#8d8496'); } mg.j++; this.miniSet(mg.j >= 3 ? 'end' : 'walk'); },
  key(mg, k, down) { if (!down || mg.phase !== 'choose') return; if (k === 'left') { MINI.child.choose.call(this, mg, 0); return true; } if (k === 'right') { MINI.child.choose.call(this, mg, 1); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '带她回家', sub: '跟着她的脚印走', gold: 1, fn: () => this.miniSet('walk') }, { t: '无视', leave: 1, fn: () => this.miniFinish('她一直看着你走远。', '#8d8496') }]; if (mg.phase === 'choose') return [{ t: '← 左边', fn: () => MINI.child.choose.call(this, mg, 0) }, { t: '右边 →', fn: () => MINI.child.choose.call(this, mg, 1) }]; return []; },
  tick(mg, dt) {
    if (mg.phase === 'walk') { mg.walk += dt; if (mg.pt > 1.3) { this.miniSet('prints'); } }
    if (mg.phase === 'prints' && mg.pt > 1.0 + mg.j * 0.15) this.miniSet('choose');
    if (mg.phase === 'end' && mg.pt > 1.2 && !mg.fin) { mg.fin = true; const h = this.run.hero; let tx, col, g = [];
      if (mg.ok === 3) { g.push({ k: 'rsup', v: 30 }, K.item(this.run, mg.P)); tx = '她把你带到一个藏东西的地方，回头笑了笑，不见了。'; col = '#9ccc6a'; }
      else if (mg.ok === 2) { g.push({ k: 'rsup', v: 20 }); tx = '走丢了一次，但最后还是找到了她的家。门口放着一袋东西。'; col = '#caa84a'; }
      else if (mg.ok === 1) { tx = '一转身她就不见了。'; col = '#8d8496'; }
      else { tx = '你迷路了。你总觉得背后有人。生命 -' + this.heroHurt(0.08) + '。'; col = '#d0453c'; }
      this.miniFinish(tx, col, g); }
  },
  draw(x, mg) {
    const t = mg.t, fwd = mg.phase === 'walk' ? mg.pt / 1.3 : 0; night(x, '#0c0a14', '#040306');
    // corridor in perspective
    const vx = CX, vy = SY + 280; x.fillStyle = '#16121c'; x.beginPath(); x.moveTo(SX, FLOOR + 110); x.lineTo(vx - 90, vy + 60); x.lineTo(vx + 90, vy + 60); x.lineTo(SX + SW, FLOOR + 110); x.fill();
    for (let i = 0; i < 8; i++) { const z = ((i + fwd) / 8), yy = vy + 60 + (FLOOR + 110 - vy - 60) * z * z; K.R(x, SX, yy, SW, 2, 'rgba(255,224,138,' + 0.06 * z + ')'); }
    x.fillStyle = '#1e1826'; x.beginPath(); x.moveTo(SX, SY); x.lineTo(vx - 90, vy - 120); x.lineTo(vx - 90, vy + 60); x.lineTo(SX, FLOOR + 110); x.fill(); x.beginPath(); x.moveTo(SX + SW, SY); x.lineTo(vx + 90, vy - 120); x.lineTo(vx + 90, vy + 60); x.lineTo(SX + SW, FLOOR + 110); x.fill();
    const fork = mg.phase === 'prints' || mg.phase === 'choose';
    if (fork) { [[-1, CX - 300], [1, CX + 300]].forEach(([s, dx]) => { K.RR(x, dx - 70, SY + 200, 140, 220, 8, '#050408', '#3a3040', 4); K.GL(x, dx, SY + 310, 100, '#ffe08a', 0.05); });
      const real = mg.ans[mg.j], vis = mg.phase === 'prints' ? cl(1 - (mg.pt - 0.5) / 0.5, 0, 1) : 0, decoy = 0.15 + mg.j * 0.12;
      [0, 1].forEach(side => { const a = side === real ? vis : Math.min(vis, decoy) + (side !== real && mg.phase === 'prints' ? 0 : 0); for (let i = 0; i < 6; i++) { const q = i / 6, px = CX + (side ? 1 : -1) * (40 + q * 240), py = FLOOR + 40 - q * 260; x.globalAlpha = a * (side === real ? 1 : 0.9); K.EL(x, px + (i % 2 ? 10 : -10), py, 9, 14, '#ffe08a', side ? 0.4 : -0.4); K.GL(x, px, py, 26, '#ffe08a', a * 0.6); } x.globalAlpha = 1; });
      if (mg.phase === 'choose') K.PT(x, '她往哪边走了？', CX, SY + 140, 40, '#ffe08a'); }
    // the girl & lantern ahead
    const dist = 1 - mg.ok * 0.15 + (mg.j - mg.ok) * 0.25, cy = vy + 60 + 40 / dist, cs = 110 / dist;
    if (!fork) { K.GL(x, CX + 30, cy - cs * 0.7, 160 / dist, '#ffcf70', 0.6); K.SP(x, 'child', CX, cy, cs); }
    K.SP(x, heroSp(this), CX - 240, FLOOR + 60, 200);
    for (let i = 0; i < 3; i++) K.CI(x, SX + 90 + i * 40, SY + 140, 12, i < mg.j ? (i < mg.ok ? '#ffe08a' : '#4a4050') : 'rgba(255,255,255,0.15)');
  } };

// ═════════════════════ 无名墓碑 · dig before the candle dies ═════════════════════
MINI.grave = { title: '无名墓碑', img: 'tomb', col: '#9ab0c8', text: '墓碑上没有名字，土是新翻的。蜡烛烧完之前挖到底。',
  init(mg) { mg.need = 14 + Math.floor(rnd() * 7) - Math.round(mg.luck * 10); mg.dig = 0; mg.burn = 5.2; mg.dirt = []; mg.sw = 0; },
  shovel(mg) { if (mg.phase !== 'dig') return; mg.dig++; mg.sw = 1; S.dig(); this.fx.kick(3); for (let i = 0; i < 5; i++) mg.dirt.push({ x: CX + 40, y: FLOOR - 40, vx: 200 + rnd() * 300, vy: -300 - rnd() * 300, t: 0 }); if (mg.dig >= mg.need) { this.miniSet('coffin'); S.creak(); } },
  down(mg) { MINI.grave.shovel.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down) { MINI.grave.shovel.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '挖开', sub: '疯狂点击 / 连按空格', gold: 1, fn: () => this.miniSet('dig') }, { t: '默哀', sub: '物资 +15', leave: 1, fn: () => this.miniFinish('你站了一会儿。墓碑后面有人留下了东西。', '#caa84a', [{ k: 'rsup', v: 15 }]) }]; if (mg.phase === 'dig') return [{ t: '挖！', sub: '点击 / 空格', gold: 1, fn: () => MINI.grave.shovel.call(this, mg) }]; return []; },
  tick(mg, dt) {
    mg.sw = Math.max(0, mg.sw - dt * 6); mg.dirt.forEach(d => { d.vy += 1600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.t += dt; }); mg.dirt = mg.dirt.filter(d => d.t < 1);
    if (mg.phase === 'dig') { mg.burn -= dt; const near = mg.dig / mg.need, per = 0.8 - near * 0.5; if (mg.pt - (mg.hb || 0) > per) { mg.hb = mg.pt; S.heart(); } if (mg.burn <= 0) { this.miniSet('out'); S.tone(90, 0.8, 'sine', 0.2, -40); } }
    if (mg.phase === 'out' && mg.pt > 1.2 && !mg.fin) { mg.fin = true; this.heroHurt(0.05); this.miniFinish('蜡烛灭了。黑暗里有什么东西碰了碰你的手。', '#d0453c'); }
    if (mg.phase === 'coffin' && mg.pt > 1.4 && !mg.fin) { mg.fin = true; if (rnd() < 0.5 + mg.luck) { S.chest(); this.miniFinish('棺材里躺着一张图纸，还有一枚戒指。', '#ffcc33', [K.bp(null, 1), { k: 'wallet', v: M.nice(mg.P * 4) }]); } else { mg.hand = 1; this.miniSay('土里伸出了手！', '#d0453c', true); setTimeout(() => this.mini === mg && this.miniBattle('normal'), 900); } }
  },
  draw(x, mg) {
    const t = mg.t, dep = cl(mg.dig / mg.need, 0, 1); night(x, '#101828', '#05070c'); K.CI(x, SX + SW - 180, SY + 150, 46, '#e8f0ff'); K.GL(x, SX + SW - 180, SY + 150, 160, '#8fb0ff', 0.25);
    K.R(x, SX, FLOOR - 40, SW, SH, '#1a1410'); for (let i = 0; i < 6; i++) K.RR(x, SX + 60 + i * 190, FLOOR - 120 - (i % 2) * 20, 70, 90, 30, '#2a2a33');
    K.RR(x, CX - 90, FLOOR - 260, 180, 230, 80, '#5a5a66'); K.RR(x, CX - 80, FLOOR - 250, 160, 220, 72, '#6a6a78'); K.PT(x, '?', CX, FLOOR - 170, 60, '#3a3a44');
    // hole
    K.EL(x, CX + 40, FLOOR + 10, 150, 26, '#0a0806'); K.R(x, CX - 110, FLOOR + 10, 300, dep * 150, '#0a0806'); const pile = dep * 90; K.EL(x, CX + 300, FLOOR - 10, 60 + pile, 20 + pile * 0.6, '#3a2a1a');
    if (mg.phase === 'coffin') { K.R(x, CX - 80, FLOOR + 90, 240, 60, '#3a2616'); if (mg.pt > 0.6) K.GL(x, CX + 40, FLOOR + 100, 160, mg.hand ? '#ff3a2a' : '#ffcc33', 0.6); if (mg.hand) { K.R(x, CX + 20, FLOOR + 20 - mg.pt * 30, 18, 70, '#8aa074'); for (let i = 0; i < 4; i++) K.R(x, CX + 14 + i * 7, FLOOR + 6 - mg.pt * 30, 5, 18, '#8aa074'); } }
    mg.dirt.forEach(d => K.R(x, d.x, d.y, 8, 8, '#4a3a2a'));
    K.SP(x, heroSp(this), CX - 250, FLOOR + 10, 180); x.save(); x.translate(CX - 160, FLOOR - 90); x.rotate(-0.4 + mg.sw * 1.2); K.R(x, -5, 0, 10, 120, '#6a4a2a'); K.RR(x, -22, 110, 44, 40, 6, '#9aa0aa'); x.restore();
    // candle
    const cx0 = CX + 60, cy0 = FLOOR - 270, life = cl(mg.phase === 'dig' ? mg.burn / 5.2 : mg.phase === 'out' ? 0 : 1, 0, 1); K.R(x, cx0 - 10, cy0 - 50 * life, 20, 50 * life + 10, '#e8dcc4'); if (life > 0) { const f = 0.8 + 0.3 * Math.sin(t * 20); K.GL(x, cx0, cy0 - 60 * life, 120 * life + 30, '#ffb060', 0.7); K.EL(x, cx0, cy0 - 50 * life - 14, 7 * f, 16 * f, '#ffcc33'); }
    if (mg.phase === 'dig') { K.R(x, SX + 80, SY + 130, 320, 20, '#1a1418'); K.R(x, SX + 80, SY + 130, 320 * dep, 20, '#caa84a'); K.TX(x, '深度', SX + 240, SY + 170, 22, '#cfc6b8'); }
    if (mg.phase === 'out') { x.fillStyle = 'rgba(0,0,0,' + cl(mg.pt, 0, 0.85) + ')'; x.fillRect(SX, SY, SW, SH); }
  } };

// ═════════════════════ 废弃医务室 · pick bottles off the shelf ═════════════════════
const MEDS = [
  { n: '绿色药水', c: '#4ad07a', d: '回血', f(g) { return '回复 ' + g.heroHeal(0.2) + ' 生命'; } },
  { n: '蓝色药水', c: '#4a8aff', d: '经验', f(g, mg) { return g.giveExp(45, mg.from); } },
  { n: '金色药水', c: '#ffcc33', d: '宝贝', f(g, mg) { return g.award([K.item(g.run, mg.P)], mg.from).join(''); } },
  { n: '白色药片', c: '#e8e8f0', d: '物资', f(g, mg) { return g.award([{ k: 'rsup', v: 25 }], mg.from).join(''); } },
  { n: '红色药水', c: '#ff3a3a', d: '剧毒', f(g) { return '中毒 -' + g.heroHurt(0.1); } },
  { n: '紫色药水', c: '#b86bff', d: '倍率', f(g) { g.run.runBuff.mult = (g.run.runBuff.mult || 0) + 0.2; return '本局初始倍率 +0.2'; } }];
MINI.clinic = { title: '废弃医务室', img: 'gurney', col: '#8fe0ff', text: '药柜里有六个瓶子。有两个标签被血糊住了。你最多敢试三瓶。',
  init(mg) { const pool = MEDS.slice().sort(() => rnd() - 0.5); mg.bt = pool.map((m, i) => ({ m, x: SX + 250 + i * 140, y: SY + 330, dark: false, open: 0 })); const dk = [0, 1, 2, 3, 4, 5].sort(() => rnd() - 0.5).slice(0, 2); dk.forEach(i => mg.bt[i].dark = true); mg.opened = 0; mg.got = []; },
  open(mg, i) { const b = mg.bt[i]; if (!b || b.opened || mg.phase !== 'idle' || mg.opened >= 3) return; b.opened = true; mg.opened++; mg.cur = i; this.miniSet('uncork'); S.pop(); },
  down(mg, px, py) { mg.bt.forEach((b, i) => { if (Math.abs(px - b.x) < 55 && Math.abs(py - b.y) < 90) MINI.clinic.open.call(this, mg, i); }); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '收手', leave: 1, gold: mg.opened >= 3, sub: '已试 ' + mg.opened + ' / 3 · 点击药瓶试喝', fn: () => this.miniFinish(mg.got.length ? '你试了：' + mg.got.join('；') + '。' : '你一瓶都没敢碰。', mg.got.length ? '#8fe0ff' : '#8d8496') }]; },
  tick(mg) { if (mg.phase === 'uncork') { const b = mg.bt[mg.cur]; b.open = cl(mg.pt / 0.5, 0, 1); if (mg.pt > 0.5 && !b.done) { b.done = true; mg.from = { x: b.x, y: b.y }; const tx = b.m.f(this, mg); mg.got.push(b.m.n + '：' + tx); this.miniSay(b.m.n + '：' + tx, b.m.c); this.fx.explode(b.x, b.y - 40, b.m.c, 0.8); } if (mg.pt > 1.0) this.miniSet('idle'); } },
  draw(x, mg) {
    const t = mg.t; night(x, '#16202a', '#080c10'); K.R(x, SX + 180, SY + 150, SW - 360, 360, '#3a3028'); K.R(x, SX + 195, SY + 165, SW - 390, 330, '#1a1612'); K.R(x, SX + 195, SY + 405, SW - 390, 12, '#5a4838'); K.R(x, SX + 195, SY + 250, SW - 390, 10, '#5a4838');
    for (let i = 0; i < 3; i++) K.CI(x, SX + 80, SY + 200 + i * 50, 12, i < 3 - mg.opened ? '#8fe0ff' : '#2a3040');
    // legend
    MEDS.forEach((m, i) => { K.CI(x, SX + SW - 150, SY + 170 + i * 44, 12, m.c); K.TX(x, m.d, SX + SW - 100, SY + 170 + i * 44, 20, '#cfc6b8', { al: 'left' }); });
    mg.bt.forEach(b => { const hov = mg.phase === 'idle' && !b.opened && Math.abs(mg.mx - b.x) < 55 && Math.abs(mg.my - b.y) < 90, lift = hov ? 14 : 0, col = b.dark && !b.opened ? '#2a1a1a' : b.m.c;
      x.save(); x.translate(b.x, b.y + 70 - lift); if (b.opened) x.globalAlpha = 0.5;
      K.RR(x, -34, -110, 68, 110, 14, 'rgba(200,230,255,0.25)', '#dfe6f0', 2); K.RR(x, -30, -70, 60, 66, 10, col); if (!b.dark || b.opened) K.GL(x, 0, -40, 60, col, 0.3); K.R(x, -12, -130, 24, 22, '#8a6a3a'); if (b.dark && !b.opened) { K.R(x, -26, -64, 52, 30, '#6a1010'); K.PT(x, '?', 0, -50, 28, '#e8dcc4'); } K.R(x, -24, -100, 8, 60, 'rgba(255,255,255,0.35)');
      if (b.open > 0 && !b.done) { K.R(x, -12, -130 - b.open * 60, 24, 22, '#8a6a3a'); } x.restore(); });
  } };

// ═════════════════════ 落地镜 · repeat the reflection's moves ═════════════════════
const ARW = { up: '↑', down: '↓', left: '←', right: '→' };
MINI.mirror = { title: '落地镜', img: 'mirror', col: '#8fb0ff', text: '镜子里的你慢了半拍才动。它在示范什么——跟着做一遍。',
  init(mg) { mg.round = 0; mg.got = []; },
  begin(mg) { mg.round++; mg.seq = [...Array(3 + mg.round)].map(() => M.pick(['up', 'down', 'left', 'right'])); mg.inp = []; this.miniSet('show'); },
  input(mg, d) { if (mg.phase !== 'input') return; mg.inp.push(d); mg.pose = { d, t: 0 }; const i = mg.inp.length - 1; if (mg.seq[i] !== d) { S.shatter(); this.miniSet('fail'); return; } S.tone(PENTA[i % 8], 0.15, 'triangle', 0.1); if (mg.inp.length === mg.seq.length) { S.up(2); this.miniSet('win'); } },
  key(mg, k, down) { if (down && mg.phase === 'input' && ARW[k]) { MINI.mirror.input.call(this, mg, k); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '凝视镜子', sub: '记住它的动作，再做一遍', gold: 1, fn: () => MINI.mirror.begin.call(this, mg) }, { t: '打碎镜子', sub: '得到道具，领袖受伤', danger: 1, dis: this.run.items.indexOf(null) < 0, why: '道具栏满了', fn: () => { this.heroHurt(0.1); S.shatter(); this.miniFinish('碎片划伤了你。镜框里藏着东西。', '#d0453c', [K.item(this.run, mg.P)]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('你背对着镜子离开。它还在看你。', '#8d8496') }];
    if (mg.phase === 'input') return ['up', 'down', 'left', 'right'].map(d => ({ t: ARW[d], sub: '点击或方向键', fn: () => MINI.mirror.input.call(this, mg, d) }));
    if (mg.phase === 'won') return [{ t: '再来一轮', sub: '更长的动作 · 赢了再得一件宝贝', gold: 1, dis: mg.round >= 2, why: '镜子不肯了', fn: () => MINI.mirror.begin.call(this, mg) }, { t: '见好就收', leave: 1, fn: () => this.miniFinish('镜子里走出了：' + mg.got.join('、') + '。', '#8fb0ff') }]; return []; },
  tick(mg, dt) {
    if (mg.pose) mg.pose.t += dt;
    if (mg.phase === 'show') { const i = Math.floor((mg.pt - 0.5) / 0.7); if (i >= 0 && i < mg.seq.length && mg.si !== i) { mg.si = i; mg.mpose = { d: mg.seq[i], t: 0 }; S.tone(PENTA[i % 8] / 2, 0.2, 'sine', 0.1); } if (mg.mpose) mg.mpose.t += dt; if (mg.pt > 0.5 + mg.seq.length * 0.7 + 0.3) { mg.si = -1; mg.mpose = null; this.miniSet('input'); } }
    if (mg.phase === 'win' && mg.pt > 0.6 && !mg.paid) { mg.paid = true; const run = this.run, u = M.pick(run.roster); let tx; if (mg.round === 1 && u && M.canAdd(run, u.type)) { this.award([{ k: 'unit', type: u.type }], { x: CX + 200, y: SY + 400 }); tx = '另一个' + M.DB[u.type].n; } else { tx = this.award([K.item(run, mg.P)], { x: CX + 200, y: SY + 400 }).join(''); } mg.got.push(tx); this.miniSay('镜子里走出了 ' + tx, '#8fb0ff', true); this.fx.rays(CX + 200, SY + 380, '#8fb0ff', 1, { r: 260 }); }
    if (mg.phase === 'win' && mg.pt > 1.4) { mg.paid = false; this.miniSet('won'); }
    if (mg.phase === 'fail' && mg.pt > 1.2 && !mg.fin) { mg.fin = true; const run = this.run, u = M.pick(run.roster); if (u) { run.roster = run.roster.filter(v => v !== u); this.award([{ k: 'vision', v: -1 }]); this.miniFinish('动作错了。镜子里的你停住了——' + M.DB[u.type].n + ' 走进了镜子，没有回来。雾从镜子里漫了出来，视野 -1。' + (mg.got.length ? '（之前得到：' + mg.got.join('、') + '）' : ''), '#d0453c'); } else { this.heroHurt(0.1); this.miniFinish('动作错了。镜子里的你伸手掐住了你。', '#d0453c'); } }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#1a1a2a', '#08080e'); const mx = CX + 200, my = SY + 380;
    K.RR(x, mx - 170, my - 260, 340, 460, 150, '#caa84a'); K.RR(x, mx - 150, my - 240, 300, 420, 136, K.LG(x, 0, my - 240, 0, my + 180, [[0, '#2a3a5a'], [1, '#0e1420']]));
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; K.CI(x, mx + Math.cos(a) * 172, my - 30 + Math.sin(a) * 240, 8, '#e8c060'); }
    const pose = (p, bx, by, flip, tint) => { let dx = 0, dy = 0, sx = 1, sy = 1, rot = 0; if (p) { const q = Math.sin(cl(p.t / 0.5, 0, 1) * Math.PI); if (p.d === 'up') dy = -60 * q; if (p.d === 'down') { sy = 1 - 0.35 * q; sx = 1 + 0.2 * q; } if (p.d === 'left') { dx = -40 * q; rot = -0.25 * q; } if (p.d === 'right') { dx = 40 * q; rot = 0.25 * q; } }
      x.save(); x.translate(bx + dx * (flip ? -1 : 1), by + dy); x.rotate(rot * (flip ? -1 : 1)); x.scale(sx, sy); if (tint) x.globalAlpha = 0.7; K.SP(x, heroSp(this), 0, 0, 190, flip); x.restore(); };
    x.save(); K.RR(x, mx - 150, my - 240, 300, 420, 136); x.clip(); pose(mg.mpose || (mg.phase === 'input' || mg.phase === 'win' ? mg.pose : null), mx, my + 150, true, 1); x.fillStyle = 'rgba(80,120,200,0.25)'; x.fillRect(mx - 150, my - 240, 300, 420); if (mg.phase === 'fail') { x.fillStyle = 'rgba(200,30,30,' + cl(mg.pt, 0, 0.5) + ')'; x.fillRect(mx - 150, my - 240, 300, 420); } x.restore();
    if (mg.mpose && mg.mpose.t < 0.6) K.PT(x, ARW[mg.mpose.d], mx, my - 300, 70, '#8fb0ff');
    pose(mg.phase === 'show' ? null : mg.pose, CX - 280, FLOOR, false, 0);
    if (mg.seq) { mg.seq.forEach((d, i) => { const done = mg.inp && i < mg.inp.length; K.RR(x, SX + 70 + i * 64, SY + 110, 54, 54, 8, done ? '#8fb0ff' : 'rgba(0,0,0,0.5)', '#8fb0ff', 2); K.PT(x, done || mg.phase === 'fail' ? ARW[d] : '?', SX + 97 + i * 64, SY + 137, 34, done ? '#0a0a14' : '#8fb0ff'); }); }
    if (mg.phase === 'input') K.PT(x, '轮到你了', CX - 280, SY + 200, 36, '#ffe08a');
    if (mg.phase === 'fail') { for (let i = 0; i < 8; i++) K.LN(x, mx, my - 30, mx + Math.cos(i * 0.8) * 200, my - 30 + Math.sin(i * 0.8) * 260, 2, 'rgba(255,255,255,0.7)'); }
  } };

// ═════════════════════ 血祭坛 · hold to pour ═════════════════════
MINI.altar = { title: '血祭坛', img: 'candle', col: '#d0453c', text: '一滴血，一分运。倒得越多，倍率越高——但蜡烛随时可能被血浇灭。',
  init(mg) { mg.poured = 0; mg.th = 0.14 + rnd() * 0.26 + mg.luck * 0.2; mg.gain = 0; },
  down(mg) { if (mg.phase === 'ready' || mg.phase === 'pour') { this.miniSet('pour'); } },
  up(mg) { if (mg.phase === 'pour') MINI.altar.stop.call(this, mg); },
  stop(mg) { const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), lost = Math.round(mx * mg.poured); this.fx.flash('#ff2a2a', 0.2); const p = this.fxPos('hp'); if (p) this.fx.pop(p.x, p.y - 30, '-' + lost, '#ff5a4a', 40, { num: 1 }); this.pulse.hp = performance.now();
    if (mg.out) { this.miniSet('done'); this.miniSay('蜡烛灭了', '#8d8496', true); setTimeout(() => this.mini === mg && this.miniFinish('血太多了，蜡烛被浇灭。祭坛什么也没给你。你流了 ' + lost + ' 点血。', '#8d8496'), 1200); return; }
    mg.gain = Math.floor(mg.poured / 0.04) * 0.1; this.run.runBuff.mult = (this.run.runBuff.mult || 0) + mg.gain; S.mult(); this.miniSet('done'); this.miniSay('本局倍率 +' + mg.gain.toFixed(1), '#ffcc33', true);
    setTimeout(() => this.mini === mg && this.miniFinish(mg.gain ? '蜡烛亮了一截。你流了 ' + lost + ' 点血，本局初始倍率 +' + mg.gain.toFixed(1) + '。' : '你只滴了几滴，祭坛没有理你。', mg.gain ? '#ffcc33' : '#8d8496'), 1100); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '献血', sub: '按住倒血，松手停下', danger: 1, fn: () => this.miniSet('ready') }, { t: '离开', leave: 1, fn: () => this.miniFinish('烛火跟着你晃了一下。', '#8d8496') }]; if (mg.phase === 'ready') return [{ t: '按住空格 / 鼠标', sub: '倒血', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) {
    if (mg.phase !== 'pour') return; const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), step = 0.1 * dt; if (h.hp - mx * step <= 1) return MINI.altar.stop.call(this, mg); h.hp -= mx * step; mg.poured += step;
    if (Math.floor(mg.poured / 0.04) !== mg.lv) { mg.lv = Math.floor(mg.poured / 0.04); S.tone(300 + mg.lv * 60, 0.1, 'triangle', 0.08); }
    if (mg.poured > mg.th) { mg.out = true; S.tone(120, 0.6, 'sine', 0.15, -60); MINI.altar.stop.call(this, mg); }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#2a0a0a', '#080202'); K.GL(x, CX, SY + 300, 420, '#ff3a2a', 0.15);
    K.RR(x, CX - 260, FLOOR - 140, 520, 140, 10, '#3a2020'); K.R(x, CX - 280, FLOOR - 150, 560, 20, '#5a2a2a');
    const gx = CX, gy = FLOOR - 150; K.PL(x, [[gx - 70, gy - 140], [gx + 70, gy - 140], [gx + 40, gy - 60], [gx - 40, gy - 60]], '#caa84a'); K.R(x, gx - 8, gy - 60, 16, 44, '#caa84a'); K.EL(x, gx, gy - 10, 50, 12, '#caa84a');
    const lvl = cl(mg.poured / 0.4, 0, 1); x.save(); x.beginPath(); x.moveTo(gx - 66, gy - 136); x.lineTo(gx + 66, gy - 136); x.lineTo(gx + 40, gy - 62); x.lineTo(gx - 40, gy - 62); x.clip(); K.R(x, gx - 70, gy - 62 - lvl * 76, 140, lvl * 80, '#9a0a0a'); x.restore();
    const cx0 = CX + 180, near = cl((mg.poured / mg.th - 0.55) / 0.45, 0, 1), fl = mg.out ? 0 : 1 + near * 0.5 * Math.sin(t * 40), wob = near * 8 * Math.sin(t * 31);
    K.R(x, cx0 - 14, FLOOR - 250, 28, 100, '#e8dcc4'); if (!mg.out) { K.GL(x, cx0 + wob, FLOOR - 270, 140 * fl, '#ff8a3a', 0.6); K.EL(x, cx0 + wob, FLOOR - 272, 9 * fl, 22 * fl, '#ffcc33'); K.EL(x, cx0 + wob, FLOOR - 268, 4 * fl, 10 * fl, '#fff6c0'); } else K.LN(x, cx0, FLOOR - 255, cx0 + 10, FLOOR - 320, 3, 'rgba(160,160,170,0.5)');
    const hx = CX - 330; K.SP(x, heroSp(this), hx, FLOOR, 190);
    if (mg.phase === 'pour') { x.strokeStyle = '#b01010'; x.lineWidth = 6; x.beginPath(); x.moveTo(hx + 50, FLOOR - 110); x.quadraticCurveTo(gx - 120, gy - 260, gx, gy - 130); x.stroke(); for (let i = 0; i < 4; i++) K.CI(x, gx + Math.sin(t * 20 + i) * 8, gy - 140 + i * 10, 4, '#d01a1a'); }
    K.PT(x, '倍率 +' + (Math.floor(mg.poured / 0.04) * 0.1).toFixed(1), CX, SY + 160, 56, '#ffcc33'); K.TX(x, '已流血 ' + Math.round(mg.poured * 100) + '%', CX, SY + 215, 26, '#ff8a8a');
    if (mg.phase === 'ready') K.PT(x, '按住倒血', CX, SY + 280, 40, '#ff8a8a');
  } };

// ═════════════════════ 货郎 · shell game with bottles ═════════════════════
MINI.peddler = { title: '货郎', img: 'stall', col: '#b86bff', text: '货郎掀开布：「三个瓶子，一个有货。眼睛跟得上，东西归你。」',
  init(mg) { mg.slot = [0, 1, 2]; mg.prize = Math.floor(rnd() * 3); mg.rounds = 0; mg.lift = [0, 0, 0]; mg.got = []; },
  sx(i) { return CX - 240 + i * 240; },
  start(mg) { if (!this.miniPay(mg.pay)) return; mg.rounds++; mg.prize = Math.floor(rnd() * 3); mg.slot = [0, 1, 2]; mg.swaps = [...Array(6 + mg.rounds * 2)].map(() => { const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b++; return [a, b]; }); mg.si = 0; this.miniSet('show'); },
  guess(mg, s) { if (mg.phase !== 'guess') return; mg.pick = s; this.miniSet('reveal'); S.creak(); },
  down(mg, px, py) { if (mg.phase !== 'guess') return; for (let s = 0; s < 3; s++) if (Math.abs(px - MINI.peddler.sx(s)) < 90 && Math.abs(py - (SY + 380)) < 120) MINI.peddler.guess.call(this, mg, s); },
  btns(mg) { if (mg.phase === 'idle') { const over = mg.rounds >= 2, buy = M.nice(mg.pay * 1.5); return [{ t: '押一局', sub: mg.pay + ' 积分 · 猜中得支援道具', gold: !over, dis: over || this.run.wallet < mg.pay || this.run.items.indexOf(null) < 0, why: over ? '货郎不跟你玩了' : this.run.items.indexOf(null) < 0 ? '道具栏满了' : '积分不够', fn: () => MINI.peddler.start.call(this, mg) }, { t: '直接买', sub: buy + ' 积分 · 随机道具', dis: this.run.wallet < buy || this.run.items.indexOf(null) < 0, why: '积分不够或道具栏满了', fn: () => { if (!this.miniPay(buy)) return; this.miniFinish('货郎把瓶子塞到你手里。', '#b86bff', [K.item(this.run, mg.P)]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish(mg.got.length ? '你赢走了：' + mg.got.join('、') + '。' : '货郎把布盖了回去。', mg.got.length ? '#b86bff' : '#8d8496') }]; }
    if (mg.phase === 'guess') return ['左', '中', '右'].map((n, s) => ({ t: n, sub: '选这个瓶子', fn: () => MINI.peddler.guess.call(this, mg, s) })); return []; },
  tick(mg, dt) {
    if (mg.phase === 'show') { mg.lift[mg.slot.indexOf(mg.prize)] = Math.sin(cl(mg.pt / 1.2, 0, 1) * Math.PI); if (mg.pt > 1.3) { mg.lift = [0, 0, 0]; this.miniSet('shuffle'); } }
    if (mg.phase === 'shuffle') { const D = Math.max(0.16, 0.36 - mg.si * 0.02); if (mg.pt >= D) { const [a, b] = mg.swaps[mg.si]; const t0 = mg.slot[a]; mg.slot[a] = mg.slot[b]; mg.slot[b] = t0; mg.si++; mg.pt = 0; S.tick(mg.si % 8); if (mg.si >= mg.swaps.length) this.miniSet('guess'); } }
    if (mg.phase === 'reveal') { mg.lift[mg.pick] = Math.sin(cl(mg.pt / 0.8, 0, 0.5) * Math.PI); if (mg.pt > 0.5) mg.lift[mg.slot.indexOf(mg.prize)] = Math.sin(cl(mg.pt / 0.8, 0, 0.5) * Math.PI);
      if (mg.pt > 0.6 && !mg.judged) { mg.judged = true; if (mg.slot[mg.pick] === mg.prize) { const run = this.run, it = { k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: Math.min(3, M.rollTier2(run) + 1) }; mg.got.push(...this.award([it], { x: MINI.peddler.sx(mg.pick), y: SY + 360 })); this.miniSay('猜中了！', '#ffcc33', true); S.fanfare(); } else { this.miniSay('空的。货郎咧嘴笑了', '#8d8496'); S.lose(); } }
      if (mg.pt > 1.8) { mg.judged = false; mg.lift = [0, 0, 0]; this.miniSet('idle'); } }
  },
  draw(x, mg) {
    const t = mg.t; night(x, '#1e1628', '#08060c'); K.SP(x, 'stall', CX, SY + 250, 150); K.R(x, CX - 380, SY + 440, 760, 30, '#6a4a2a'); K.R(x, CX - 360, SY + 470, 20, 160, '#4a3220'); K.R(x, CX + 340, SY + 470, 20, 160, '#4a3220'); K.R(x, CX - 380, SY + 430, 760, 14, '#8a2a3a');
    // positions: slot s holds cup id; animate the current swap
    const pos = { 0: 0, 1: 1, 2: 2 }; const cupX = {}; mg.slot.forEach((id, s) => cupX[id] = MINI.peddler.sx(s)); let arc = {};
    if (mg.phase === 'shuffle' && mg.si < mg.swaps.length) { const [a, b] = mg.swaps[mg.si], D = Math.max(0.16, 0.36 - mg.si * 0.02), q = eio(mg.pt / D), ia = mg.slot[a], ib = mg.slot[b]; cupX[ia] = MINI.peddler.sx(a) + (MINI.peddler.sx(b) - MINI.peddler.sx(a)) * q; cupX[ib] = MINI.peddler.sx(b) + (MINI.peddler.sx(a) - MINI.peddler.sx(b)) * q; arc[ia] = -Math.sin(q * Math.PI) * 40; arc[ib] = Math.sin(q * Math.PI) * 30; }
    [0, 1, 2].forEach(id => { const s = mg.slot.indexOf(id), lx = cupX[id], ly = SY + 430 + (arc[id] || 0), lift = mg.lift[s] || 0, hov = mg.phase === 'guess' && Math.abs(mg.mx - lx) < 90 && Math.abs(mg.my - (SY + 380)) < 120;
      if (id === mg.prize && lift > 0.1) { K.GL(x, lx, ly - 30, 90, '#ffcc33', 0.7); K.IC(x, 'gem', lx, ly - 34, 56); }
      x.save(); x.translate(lx, ly - lift * 120 - (hov ? 10 : 0)); K.PL(x, [[-60, 0], [60, 0], [40, -150], [-40, -150]], '#5a2a6a'); K.PL(x, [[-50, -10], [-20, -10], [-24, -140], [-34, -140]], 'rgba(255,255,255,0.15)'); K.R(x, -20, -176, 40, 30, '#8a6a3a'); K.RR(x, -62, -8, 124, 12, 4, '#b86bff'); if (hov) K.GL(x, 0, -80, 140, '#b86bff', 0.4); x.restore(); });
    if (mg.phase === 'guess') K.PT(x, '在哪个瓶子里？', CX, SY + 150, 42, '#ffe08a');
  } };
})();

;
