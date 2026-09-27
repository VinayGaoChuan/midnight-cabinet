// ==== mc-mini-d.js ====
(function () {
// 温泉 / 地雷阵 / 招财猫 / 黑市 / 特训 / 古像 / 斗兽场 / 营火 / 招募旗, plus routing every non-battle node into its game.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, K = M.MK, MINI = M.MINI;
const { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd } = K;
const U = M.UI, C = M.PJ.PAL, T = U.T; // 画面内界面件按设计稿 §11.5（调色板色、字号阶梯）
const heroSp = (g) => M.HEROES[g.run.hero.cls].sprite;
const catHero = (g) => { const k = heroSp(g); return M.PCDG && M.PCDG.has(k) ? k : null; };   // the leader's pixel-cast key, when it has one
const bgv = (x, top, bot) => { x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, top], [1, bot]]); x.fillRect(SX, SY, SW, SH); };
const PENTA = [392, 440, 523, 587, 659, 784, 880, 1047];
// ───────── 演出（§7.5.1）：结果先定，演出只挑怎么端出来 ─────────
const SHOW = M.SHOW, QC = SHOW.QC;
// 奖励从舞台飞进计数器；结算框等演出收尾再出（框里照样列出获得了什么）
const give = (g, mg, gains, from) => { const got = gains && gains.length ? g.award(gains, from) : []; (mg.got = mg.got || []).push(...got); return got; };
const endIn = (g, mg, dt, text, col) => SHOW.later(mg, dt, () => { if (g.mini !== mg) return; const tx = typeof text === 'function' ? text() : text, got = mg.got || []; g.miniFinish(tx + (got.length ? '\n获得：' + got.join('、') : ''), col); });
// 回血：几颗心从舞台飞向生命条，第一颗落地时才真的加（数字和 heroHeal 算的一样，先拿来滚）
const hpPct = (g, p) => Math.round(M.heroMaxHp(g.run.hero, g.meta) * p);
const hearts = (g, from, col, onLand) => { const ic = M.iconCanvas('t_heart', 3) || 'orb'; for (let j = 0; j < 3; j++) g.fly(ic, { x: from.x + (j - 1) * 40, y: from.y }, 'hp', col || C.lime, j === 2 ? onLand : null, 0.04 + j * 0.07); };
const healFly = (g, mg, pct, from) => { hearts(g, from, C.lime); SHOW.later(mg, 0.82, () => { mg.healV = g.heroHeal(pct); }); };
// 连打的玩法每一下都算连击（音调往上爬），但字只在逢 5 下时砸，不然满屏都是字
const hitCombo = (g, mg, x, y, show, word) => { const n = SHOW.combo(g, mg, x, y, word); if (!show && n % 5) SHOW.state(mg).stamps.pop(); return n; };
// 图纸先换成最终那张（和 award 里的检查一样），预兆才亮得出真实品质
const fixBp = (g, b) => { const m = g.meta; if (b && b.k === 'bp' && M.bpUseful && m && !M.bpUseful(m, b.key)) b.key = M.usefulBp(m, b.key, g.run && g.run.theme && g.run.theme.style); return b; };
const gq = (b) => b.k === 'bp' ? M.itemInfo(b.key).q || 0 : b.k === 'item' ? b.q || 0 : b.k === 'unit' ? M.DB[b.type].q || 0 : 0;
const TIER_END = [0.9, 1.3, 1.9, 3.0];   // 揭晓后各档留多久再出结算框
const embers = (g, n, x, y) => g.fx.spark(x == null ? CX : x, y == null ? FLOOR - 50 : y, C.amber, n, { dir: -Math.PI / 2, spread: 1.1, v: 520, w: 4, life: 1.1, g: -60 });

// ═════════════════════ 温泉 · hold to soak, release in the sweet spot ═════════════════════
// 像素溶洞舞台（mc-pxroom-mini-d.js 的 mini_spring）：按住，领袖扑通下水；温度一格格涨（液柱跳、音阶爬、气泡和蒸汽越来越密、
// 池水的光从青走到琥珀再到红）；逼近绿区就听牌，之后每涨 0.05 一拍加码；松手：铜指针夹住、卡帧，按离正中多近揭晓
// GOOD（水花）/ GREAT（灯笼齐亮）/ PERFECT（池中心冲起间歇泉、雾里一道彩虹），心从蒸汽里飞向生命条；过热一拍带过
const SPG = { x: SX + SW - 140, y: SY + 130, h: 400 }, spY = (h) => Math.round(SPG.y + SPG.h * (1 - h));
const SPW = { x: CX, y: K.ly(126) }, SPOOL = { x: CX, y: K.ly(128) };   // the leader's waterline; the pool's middle
const springRip = (mg, x, y, big) => { (mg.rip = mg.rip || []).push({ x: K.ax(x), y: K.ay(y), t: mg.t, big }); if (mg.rip.length > 10) mg.rip.shift(); };
const splash = (g, mg, x, y, n, big) => { springRip(mg, x, y, big); SHOW.burst(mg, x, y, n, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [120, 360], life: [0.35, 0.7], g: 700, ang: -Math.PI / 2, spread: 1.4 }); const s = M.PXR && M.PXR.slots['_mg:mini_spring']; if (s) s.burst('drip', K.ax(x), K.ay(y) - 2, Math.round(n / 3), { sp: 40, spread: 2, life: 0.9, floor: K.ay(y) + 1 }); };
MINI.spring = { title: '地下温泉', img: 'e_spring', col: C.teal, text: '泉水冒着热气。泡到刚刚好最舒服——泡过头会晕。',
  init(mg) { mg.heat = 0; mg.band = [0.55, 0.78]; mg.soaks = 0; mg.rip = []; mg.bi = -1; },
  down(mg, px, py) { if (mg.phase === 'ready') { this.miniSet('soak'); mg.inT = mg.t; S.mini('spring', 'bubble'); S.mini('spring', 'plunge'); splash(this, mg, SPW.x, SPW.y, 26, 1); SHOW.shake(mg, 4); return; }
    if (mg.phase !== 'soak') { const inPool = ((K.ax(px) - 150) / 104) ** 2 + ((K.ay(py) - 128) / 16) ** 2 < 1; if (inPool) { splash(this, mg, px, py, 8); S.mini('spring', 'drop'); } else SHOW.tap(this, mg, px, py); } },
  up(mg) { if (mg.phase === 'soak') MINI.spring.judge.call(this, mg); },
  judge(mg) { if (mg.phase !== 'soak') return; const h = mg.heat, [a, b] = mg.band, gy = spY(h), pool = SPOOL; this.miniSet('done'); mg.lockH = h; mg.clampT = mg.t; S.mini('spring', 'clamp');
    if (h >= a && h <= b) { const d = Math.abs(h - (a + b) / 2) / ((b - a) / 2), tier = d < 0.3 ? 3 : d < 0.65 ? 2 : 1, col = '#6fd0ff'; mg.win = tier;
      // 铜指针夹住 → 卡帧 → 按档揭晓；心从蒸汽里飞向生命条
      SHOW.hitstop(mg, 0.15, SPG.x, gy, () => { S.mini('spring', 'good');
        if (tier === 3) { mg.geyserT = mg.t; S.mini('spring', 'geyser'); SHOW.reveal(this, mg, 3, { x: pool.x, y: pool.y - 60, col: C.teal }); K.pxrFlash('mini_spring', 'all', 1.4); }
        else if (tier === 2) { SHOW.reveal(this, mg, 1, { x: pool.x, y: pool.y, col: C.teal }); [1, 2, 3, 4].forEach(i => K.pxrFlash('mini_spring', i, 1.4)); splash(this, mg, pool.x, pool.y, 30, 1); }
        else { SHOW.ring(mg, SPG.x, gy, 8, 90, C.green, { life: 0.35 }); splash(this, mg, pool.x, pool.y, 18, 1); }
        if (tier < 3) SHOW.stamp(mg, tier === 2 ? 'GREAT' : 'GOOD', SPG.x - 170, gy, tier === 2 ? C.gold : C.lime, 48 + tier * 8, 1);
        SHOW.later(mg, 0.08, () => SHOW.win(this, mg, tier, { x: pool.x, y: pool.y - 20, v: hpPct(this, 0.3), col: tier >= 3 ? C.gold : C.teal, label: tier === 3 ? 'PERFECT' : '' }));
        SHOW.later(mg, 0.25, () => { healFly(this, mg, 0.3, { x: pool.x, y: pool.y - 90 }); mg.sighT = mg.t + 0.3; });
        this.miniSay('刚刚好', col, true); endIn(this, mg, [1.35, 1.6, 2.4][tier - 1], () => '刚刚好。回复 ' + mg.healV + ' 生命。', col); }); }
    else if (h > b) { const v = this.heroHurt(0.05), tx = '泡太久，晕了过去，醒来时头撞破了（-' + v + '）。'; mg.faintT = mg.t; S.mini('spring', 'hot'); SHOW.lose(this, mg); splash(this, mg, SPW.x, SPW.y, 14); this.miniSay(tx.split('。')[0], '#ff6a5a', true); endIn(this, mg, 0.6, tx, '#ff6a5a'); }
    else { const v = this.heroHeal(0.12), tx = '还没泡热就起来了。回复 ' + v + ' 生命。'; mg.coolT = mg.t; S.mini('spring', 'cool'); if (h > a - 0.08) SHOW.near(this, mg, SPG.x, spY(a), '差一点！'); else SHOW.lose(this, mg); SHOW.burst(mg, SPW.x, SPW.y - 60, 10, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [80, 200], life: [0.3, 0.5], g: 600 }); this.miniSay(tx.split('。')[0], '#9ccc6a', true); endIn(this, mg, 0.7, tx, '#9ccc6a'); } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '领袖泡一泡', sub: '按住泡，温度到绿色区域时松手', gold: 1, fn: () => this.miniSet('ready') },
    { t: '让部队泡', sub: '本局部队生命 +10%', fn: () => { this.buffRun('unitHp', 0.1, '部队生命 +10%', '#6fd0ff'); this.miniSet('troops'); mg.splashT = mg.t; splash(this, mg, SPOOL.x, SPOOL.y, 30, 1); S.mini('spring', 'plunge'); SHOW.later(mg, 0.3, () => { SHOW.win(this, mg, 1, { x: CX, y: FLOOR - 110, col: C.teal }); }); endIn(this, mg, 1.4, '部队泡得满脸通红。本局部队生命 +10%。', '#6fd0ff'); } },
    { t: '装一桶泉水', sub: '领袖回复 30% 生命', fn: () => { this.miniSet('bucket'); mg.bucketT = mg.t; S.mini('spring', 'drop'); SHOW.later(mg, 0.3, () => { splash(this, mg, K.lx(60), SPOOL.y, 12); S.mini('spring', 'bubble'); }); SHOW.later(mg, 0.55, () => { if (this.mini !== mg) return; this.heroHeal(0.3); this.miniFinish('你装了一桶还在冒泡的泉水，领袖喝了一口。', '#6fd0ff'); }); } }];
    if (mg.phase === 'ready') return [{ t: '按住空格 / 鼠标', sub: '下水', dis: 1, why: '按住画面' }]; return []; },
  tick(mg, dt) { if (mg.phase !== 'soak') return; const [a, b] = mg.band;
    mg.heat = cl(mg.heat + dt * (0.22 + mg.heat * 0.25), 0, 1); if (Math.floor(mg.heat * 10) !== mg.tk) { mg.tk = Math.floor(mg.heat * 10); S.mini('spring', 'tick', mg.heat); }
    if (!mg.rch && mg.heat >= a - 0.13) { mg.rch = 1; SHOW.reach(this, mg, { x: SPG.x, y: spY((a + b) / 2), r: 150, col: C.teal }); }
    // 听牌之后每涨 0.05 一拍：一拍比一拍重，镜头往温度计推（手上功夫的玩法不减速）
    if (mg.rch && mg.heat <= b) { const i = Math.floor((mg.heat - (a - 0.13)) / 0.05); if (i > mg.bi) { mg.bi = i; SHOW.beat(this, mg, SPG.x, spY(mg.heat), Math.min(i, 6), mg.heat >= a ? 1 : 0, false); } }
    if (!mg.zone && mg.heat >= a) { mg.zone = 1; mg.zoneT = mg.t; S.mini('spring', 'zone'); SHOW.ring(mg, SPG.x, spY(mg.heat), 10, 90, C.green, { life: 0.3 }); SHOW.flash(mg, C.teal, 0.2); }
    if (!mg.hot && mg.heat > b) { mg.hot = 1; SHOW.calm(mg); SHOW.shake(mg, 3); }
    if (mg.heat >= 1) MINI.spring.judge.call(this, mg); },
  draw(x, mg) {
    const t = mg.t, [a, b] = mg.band, over = mg.phase === 'soak' && mg.heat > b ? (mg.heat - b) / (1 - b) : 0;
    if (!K.pxr(x, 'mini_spring', 0, 0, t, { mg, t })) bgv(x, '#12202a', '#060a0e');
    const hk = catHero(this), inW = mg.phase === 'soak' || mg.phase === 'done';
    if (mg.phase === 'troops') { this.run.roster.slice(0, 5).forEach((u, i) => { const k = u.type, bob = Math.round(Math.sin(t * 3 + i) * 1) * 4; if (!M.PXR.MINI_D.cast(x, k, CX - 240 + i * 120, SPW.y + 64 + bob, 'idle', Math.floor(t * 12 + i * 5) % 12, i % 2 === 1, null, SPW.y)) K.SP(x, k, CX - 240 + i * 120, FLOOR - 20, 110); }); }
    else if (hk) {
      // 下水前站在左边的池沿上；泡着时只露出水面以上（晕了就左右晃、沉下去再冒出来，太早起来就哆嗦）
      const fT = mg.faintT != null ? t - mg.faintT : 9, cT = mg.coolT != null ? t - mg.coolT : 9, inT = mg.inT != null ? t - mg.inT : 9, sink = fT < 0.5 ? Math.sin(fT / 0.5 * Math.PI) * 60 : 0, bob = inT < 0.3 ? (1 - inT / 0.3) * -40 : 0;
      const dz = Math.round((Math.sin(t * 34) * 10 * over + (cT < 0.4 ? Math.sin(t * 90) * 6 : 0)) / 4) * 4;
      if (inW) M.PXR.MINI_D.cast(x, hk, SPW.x + dz, SPW.y + 44 + sink + bob, 'idle', Math.floor(t * 12) % 24, false, null, SPW.y);
      else M.PXR.MINI_D.cast(x, hk, K.lx(228), K.ly(150), 'idle', Math.floor(t * 12) % 24, true);   // 站在右边下水的石阶上
      if (inW) for (let k = -5; k <= 5; k++) { const yy = (Math.abs(k) + Math.floor(t * 6)) % 3 === 0 ? SPW.y - 4 : SPW.y; K.R(x, K.snap(SPW.x + dz) + k * 8, yy, 8, 4, (k + Math.floor(t * 8)) % 3 ? C.ice : C.white); }   // 水线上的一圈白沫
      // 泡过头：头顶转晕星
      if (over > 0.2 || fT < 0.6) for (let k = 0; k < 3; k++) { const a2 = t * 6 + k * 2.1; K.R(x, K.snap(SPW.x + Math.cos(a2) * 44 - 4), K.snap(SPW.y - 150 + Math.sin(a2) * 10), 8, 8, k === 1 ? C.gold : C.butter); }
      // 松手后往后一靠，头顶冒一团「呼——」的汽
      if (mg.sighT != null && t > mg.sighT && t - mg.sighT < 1.2) { const q = (t - mg.sighT) / 1.2; x.save(); x.globalAlpha = 1 - q; for (let k = 0; k < 4; k++) K.R(x, K.snap(SPW.x - 20 + k * 12), K.snap(SPW.y - 170 - q * 60 - (k % 2) * 8), 12, 8, C.cream); x.restore(); }
    } else K.SP(x, heroSp(this), CX + Math.sin(t * 34) * 10 * over, FLOOR + (inW ? 40 : -40), 180);
    // 木桶：从左下飞到池边舀一下
    if (mg.phase === 'bucket') { const q = cl((t - mg.bucketT) / 0.5, 0, 1), bx = K.lx(20) + (K.lx(60) - K.lx(20)) * eo(Math.min(1, q * 1.6)), by = K.ly(150) - Math.sin(Math.min(1, q * 1.6) * Math.PI) * 60 + (q > 0.6 ? 12 : 0); K.R(x, K.snap(bx) - 24, K.snap(by) - 24, 48, 44, C.umber); K.R(x, K.snap(bx) - 24, K.snap(by) - 24, 48, 4, C.brown); K.R(x, K.snap(bx) - 24, K.snap(by) - 12, 48, 4, C.gold); K.R(x, K.snap(bx) - 20, K.snap(by) - 20, 40, 4, q > 0.6 ? C.teal : C.ink); }
    // 温度读数：压在温度计球泡左边的清晰数字
    if (mg.phase !== 'idle' && mg.phase !== 'troops' && mg.phase !== 'bucket') { const hot = mg.heat > b, inZ = mg.heat >= a && !hot; U.text(x, Math.round(30 + mg.heat * 40) + '°', SPG.x - 70, SPG.y + SPG.h + 36, T.num, hot ? C.red : inZ ? C.lime : C.cream, { outline: true }); }
    if (mg.phase === 'ready') K.sign(x, '按住下水', CX, SY + 170, { kind: 'teal', size: T.btn });
  } };

// ═════════════════════ 地雷阵 · minesweeper crossing ═════════════════════
// 像素舞台（mc-pxroom-mini-d.js 的 mini_trap）：残墙、火把、厚石板阵、石拱门、光柱里的宝箱。
// 能走的石板缝里透光，悬停抬起一格；踩一格：领袖弧线跳过去，石板「咚」地沉下、喷灰，下面的刻痕亮起数字（连击往上爬）；
// 站在两颗雷以上：听牌，周围没踩过的石板一起抖、漏灰（不透露哪块是雷）；踩雷：咔 → 轰，焦坑冒烟，领袖被掀回半格，一拍带过；
// 走到最后一列：逐拍加码（箱子在品质色里抖、箱缝漏光，升档那拍撬开一条缝）→ 卡帧 → 箱盖飞开、品质色光柱冲天 → 奖励逐项砸出；
// 然后没踩到的雷一颗颗亮红灯，一颗都没踩就变成烟花升空
const TC = 6, TR = 3, TW = 148, TH = 128, TRX0 = K.lx(39), TRY0 = K.ly(43), TCHEST = { x: K.lx(278), y: K.ly(91) };
const trapQC = [['linen', 10, [244, 239, 224]], ['teal', 9, [71, 214, 193]], ['arcane', 9, [184, 107, 255]], ['lamp', 10, [255, 207, 74]]];
const trapSlot = () => M.PXR && M.PXR.slots['_mg:mini_trap'];
const tileC = (r, c) => ({ x: TRX0 + c * TW + TW / 2, y: TRY0 + r * TH + TH / 2 });
MINI.trap = { title: '地雷阵', img: 'e_trap', col: C.amber, text: '对面有个箱子。地上的数字告诉你周围埋了几颗雷。一次走一格。',
  init(mg) { mg.mine = [...Array(TR)].map(() => Array(TC).fill(0)); let n = 0; while (n < 5) { const r = Math.floor(rnd() * TR), c = 1 + Math.floor(rnd() * (TC - 2)); if (!mg.mine[r][c]) { mg.mine[r][c] = 1; n++; } }
    mg.open = [...Array(TR)].map(() => Array(TC).fill(0)); mg.openT = [...Array(TR)].map(() => Array(TC).fill(-9)); mg.at = null; mg.hp = 0; mg.x0 = TRX0; mg.y0 = TRY0; mg.booms = [];
    mg.cnt = (r, c) => MINI.trap.cnt(mg, r, c); mg.adjOk = (r, c) => !mg.open[r][c] && MINI.trap.adj(mg, r, c); mg.pos = { x: TRX0 - 64, y: K.ly(146) }; },
  cnt(mg, r, c) { let n = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < TR && cc >= 0 && cc < TC && mg.mine[rr][cc]) n++; } return n; },
  adj(mg, r, c) { if (!mg.at) return c === 0; return Math.abs(mg.at.r - r) + Math.abs(mg.at.c - c) === 1 || (Math.abs(mg.at.r - r) === 1 && Math.abs(mg.at.c - c) === 1); },
  hopTo(mg, x, y, dur, back) { mg.hop = { fx: mg.pos.x, fy: mg.pos.y, tx: x, ty: y, t0: mg.t, d: dur || 0.18, back }; mg.pos = { x, y }; },
  step(mg, r, c) { if (mg.phase !== 'idle') return; if (!MINI.trap.adj(mg, r, c) || mg.open[r][c]) { const p = tileC(r, c); mg.nope = { r, c, t: mg.t }; S.mini('trap', 'nope'); return; }
    const prev = mg.at, from = prev ? tileC(prev.r, prev.c) : null, p = tileC(r, c), n = MINI.trap.cnt(mg, r, c), s = trapSlot();
    mg.at = { r, c }; mg.open[r][c] = 1; mg.openT[r][c] = mg.t + 0.16; mg.stepT = mg.t + 0.16; MINI.trap.hopTo(mg, p.x, p.y + TH / 2 - 14); S.mini('trap', 'hop');
    // 落地那一下才压石板、出数字
    SHOW.later(mg, 0.16, () => { S.mini('trap', 'step'); SHOW.shake(mg, 2);
      if (mg.mine[r][c]) return;
      S.mini('trap', 'num', n); if (s) { s.burst('dust', K.ax(p.x) - 16, K.ay(p.y) + 10, 5, { sp: 14, life: 0.8, w: 4 }); s.burst('dust', K.ax(p.x) + 16, K.ay(p.y) + 10, 5, { sp: 14, life: 0.8, w: 4 }); }
      SHOW.burst(mg, p.x, p.y + 40, 10, { ramp: [C.cream, C.tan, C.brown, C.umber], sp: [60, 200], life: [0.25, 0.5], ang: -Math.PI / 2, spread: 2.6, w: 100 });
      SHOW.combo(this, mg, p.x, p.y - 86);
      if (c === TC - 1) { this.miniSet('win'); MINI.trap.chest.call(this, mg); return; }
      if (n >= 2) SHOW.reach(this, mg, { x: p.x, y: p.y, r: 110, col: n >= 3 ? C.red : C.amber, label: '' }); else SHOW.calm(mg); });
    if (mg.mine[r][c]) { this.miniSet('boom'); SHOW.later(mg, 0.16, () => { S.mini('trap', 'click'); });
      SHOW.later(mg, 0.26, () => { mg.hp++; S.mini('trap', 'boom'); this.fx.kick(14); SHOW.shake(mg, 14); SHOW.white(mg, 0.5); SHOW.burst(mg, p.x, p.y, 40, { ramp: [C.white, C.butter, C.orange, C.orangeDeep], sp: [150, 520], life: [0.3, 0.7], g: 400 }); SHOW.shock(mg, p.x, p.y, C.orange, { r: 200 }); this.fx.explode(p.x, p.y, '#ff7a2a', 0.9);
        if (s) { s.burst('spark', K.ax(p.x), K.ay(p.y), 18, { sp: 60, spread: 6.3, life: 0.7 }); s.burst('steam', K.ax(p.x), K.ay(p.y) - 4, 6, { sp: 10, life: 2 }); }
        this.heroHurt(0.1); mg.booms.push({ r, c }); mg.hitT = mg.t; SHOW.comboBreak(mg); SHOW.calm(mg); SHOW.state(mg).gray = 1; this.miniSay('轰！', '#ff5a4a', true);
        if (mg.hp >= 3) { mg.flyT = mg.t; this.miniSet('dead'); endIn(this, mg, 0.45, '第三颗雷把你炸了回来。箱子还在对面。', '#d0453c'); return; }
        // 被掀回半格
        const bx = from ? (from.x + p.x) / 2 : p.x - TW / 2, by = from ? (from.y + p.y) / 2 + TH / 2 - 14 : p.y + TH / 2 - 14; MINI.trap.hopTo(mg, p.x + (bx - p.x) * 0.5, by, 0.22, 1);
        SHOW.later(mg, 0.2, () => { if (this.mini === mg && mg.phase === 'boom') this.miniSet('idle'); }); }); } },
  chest(mg) { const run = this.run, clean = !mg.hp, cx = TCHEST.x, cy = TCHEST.y, gains = [K.item(run, mg.P), clean ? fixBp(this, K.bp(null, 1)) : { k: 'rsup', v: 20 }];
    const q = cl(Math.max(...gains.map(gq)), 0, 3), tier = clean ? (q >= 3 ? 4 : 3) : q >= 2 ? 2 : 1;
    mg.box = { sk: 0, qc: trapQC[0] }; K.pxrFlash('mini_trap', 2, 0.8);
    const T = SHOW.charge(this, mg, { x: cx, y: cy - 20, q, onBeat: (i, tq, up) => { mg.box.sk = 1 + i * 0.5; mg.box.qc = trapQC[tq]; S.mini('trap', 'rattle'); K.pxrFlash('mini_trap', 2, 0.4 + i * 0.2); },
      onReveal: () => { mg.box.open = mg.t; mg.box.sk = 0; mg.box.qc = trapQC[q]; S.mini('trap', 'box'); K.pxrFlash('mini_trap', 'all', 1);
        const s = trapSlot(); if (s) { s.burst('spark', K.ax(cx), K.ay(cy) - 8, 30, { sp: 70, spread: 3, ang: 0, life: 1 }); s.burst('glint', K.ax(cx), K.ay(cy) - 10, 12, { sp: 40, life: 0.8, w: 12, h: 12 }); }
        SHOW.later(mg, 0.08, () => SHOW.win(this, mg, tier, { x: cx - 150, y: cy, col: tier >= 3 ? C.gold : QC(q), label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : '' }));
        SHOW.later(mg, tier === 4 ? 0.7 : 0.25, () => { const got = give(this, mg, gains, { x: cx, y: cy }); SHOW.items(this, mg, got.map((g2, i) => ({ text: g2, col: i === got.length - 1 ? C.gold : C.cream, size: 36 })), { x: CX - 60, y: SY + 400, dy: 52 }); });
        // 没踩到的雷一颗颗亮红灯；一颗都没踩就升空当烟花
        mg.revealT = mg.t + 0.6; mg.fireworks = clean; SHOW.later(mg, 0.6, () => S.mini('trap', clean ? 'fireworks' : 'reveal')); } });
    endIn(this, mg, T + TIER_END[tier - 1] + 0.3, clean ? '一颗雷都没踩！箱子里的东西全归你。' : '你带着一身灰摸到了箱子。', '#ff9a4a'); },
  down(mg, px, py) { const c = Math.floor((px - TRX0) / TW), r = Math.floor((py - TRY0) / TH); if (r >= 0 && r < TR && c >= 0 && c < TC) MINI.trap.step.call(this, mg, r, c); else SHOW.tap(this, mg, px, py); },
  key(mg, k, down) { if (!down || mg.phase !== 'idle') return; const a = mg.at || { r: 1, c: -1 }, d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[k]; if (d) { const r = cl(a.r + d[0], 0, TR - 1), c = a.c + d[1]; if (c >= 0 && c < TC) MINI.trap.step.call(this, mg, r, c); return true; } },
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '绕路', sub: mg.at ? '已经走进来了' : '-20 本局物资', leave: 1, dis: !!mg.at && false, fn: () => { const run = this.run; const v = Math.min(20, run.loot.supplies); this.hold('rsup', run.loot.supplies); run.loot.supplies -= v; this.release('rsup'); this.miniFinish('你绕了一大圈，丢了 ' + v + ' 物资。', '#8d8496'); } }]; },
  draw(x, mg) {
    const t = mg.t, sh = mg.sh;
    // 悬停：能走的格子抬起一格（石板本身画在舞台里）
    const hc = Math.floor((mg.mx - TRX0) / TW), hr = Math.floor((mg.my - TRY0) / TH); mg.hov = hr >= 0 && hr < TR && hc >= 0 && hc < TC ? { r: hr, c: hc } : null;
    if (mg.hov && mg.phase === 'idle' && mg.adjOk(hr, hc) && !(mg.hovWas && mg.hovWas.r === hr && mg.hovWas.c === hc)) S.mini('_', 'hover'); mg.hovWas = mg.hov && mg.phase === 'idle' && mg.adjOk(hr, hc) ? mg.hov : null;
    if (!K.pxr(x, 'mini_trap', 0, 0, t, { mg, t })) bgv(x, '#2a2218', '#0e0a06');
    // 数字压在石板的刻痕上，站着的那格跟着心跳和落脚弹一下（用户裁定 2026-09-25：数字画在领袖上面，站在格子上也看得见）
    const numsFirst = [];
    for (let r = 0; r < TR; r++) for (let c = 0; c < TC; c++) { if (!mg.open[r][c] || mg.mine[r][c] || t < mg.openT[r][c]) continue; numsFirst.push([r, c]); }
    // 领袖：弧线跳格；被炸时白色剪影一帧、被掀回；第三颗雷转着飞出舞台
    const hk = catHero(this), H0 = mg.hop, hq = H0 ? cl((t - H0.t0) / H0.d, 0, 1) : 1, lx = H0 ? H0.fx + (H0.tx - H0.fx) * hq : mg.pos.x, ly = (H0 ? H0.fy + (H0.ty - H0.fy) * hq : mg.pos.y) - Math.sin(hq * Math.PI) * (H0 && H0.back ? 40 : 28);
    const hit = mg.hitT != null && t - mg.hitT < 0.08, fly = mg.flyT != null ? t - mg.flyT : -1;
    if (fly >= 0) { x.save(); x.translate(lx - fly * 900, ly - fly * 700 + fly * fly * 400); x.rotate(-fly * 12); if (hk) M.PXR.MINI_D.cast(x, hk, 0, 0, 'hurt', 3, false); else K.SP(x, heroSp(this), 0, 0, 110); x.restore(); }
    else if (hk) M.PXR.MINI_D.cast(x, hk, lx, ly, H0 && hq < 1 ? 'move' : 'idle', Math.floor(t * 12) % (H0 && hq < 1 ? 8 : 24), false, hit ? '#ffffff' : null);
    else K.SP(x, heroSp(this), lx, ly, 110);
    numsFirst.forEach(([r, c]) => { const p = tileC(r, c), n = MINI.trap.cnt(mg, r, c), col = [C.lime, C.gold, C.amber, C.red, C.red][n] || C.white, cur = mg.at && mg.at.r === r && mg.at.c === c;
      const beat = cur && sh && sh.tense ? Math.max(0, 1 - sh.beatT * 5) : 0, st = t - mg.openT[r][c], pop = st < 0.3 ? (st < 0.06 ? 0.35 + st / 0.06 * 0.9 : 1.25 - (st - 0.06) / 0.24 * 0.25) : 1, k = pop + 0.3 * beat;
      x.save(); x.translate(p.x, p.y - 6); x.scale(k, k); U.text(x, n ? String(n) : '·', 0, 0, T.num, col, { num: true, outline: true }); x.restore(); });
    // 不能走的格子：那块摇一下头
    if (mg.nope && t - mg.nope.t < 0.25) { const p = tileC(mg.nope.r, mg.nope.c), w = Math.round(Math.sin((t - mg.nope.t) * 60) * 2) * 4; x.save(); x.globalAlpha = 0.9; K.RR(x, p.x - TW / 2 + 8 + w, p.y - TH / 2 + 4, TW - 16, TH - 16, 0, null, C.red, 4); x.restore(); }
    for (let i = 0; i < 3; i++) K.IC(x, 't_heart', SX + 90 + i * 50, SY + 130, 40 * (i < 3 - mg.hp ? 1 : 0.4));
  } };

// ═════════════════════ 招财猫 · catch the coin rain ═════════════════════
// 像素神龛舞台（mc-pxroom-mini-d.js 的 mini_cat）：猫每招一下就甩一枚金币上天；领袖头顶红漆盘跑着接。
// 接一下是连击（逢 5 砸字、5 连进狂热：猫睁眼、举起小判、身后金光转起来）；炸弹把盘里的钱炸飞一把、在地毯上滚走；
// 时间到先「称重」（盘里的钱一层层亮，拍数按评级），再砸评级章、按评级走中奖档，钱一枚枚飞进钱包
const CATY = K.FLOOR - 40, CAT_PAW = [174, 50];
const catSlot = () => M.PXR && M.PXR.slots['_mg:mini_cat'];
MINI.cat = { title: '招财猫', img: 'e_cat', col: C.gold, text: '猫爪一招，天上就下钱。接住金币和金条，躲开炸弹。',
  init(mg) { mg.px = CX; mg.items = []; mg.sum = 0; mg.spawn = 0; mg.left = 8; mg.bombs = 0; mg.pop = 0; mg.boom = 0; mg.ups = []; mg.spill = []; mg.dir = 1; mg.run = 0; },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '摸摸猫爪', sub: mg.pay + ' 积分 · 8 秒接钱（鼠标 / ← →）', gold: 1, dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; this.miniSet('rain'); mg.px = CX; mg.startT = mg.t; mg.flickT = mg.t; S.mini('cat', 'wave'); S.mini('cat', 'bell'); this.fx.kick(4); const s = catSlot(); if (s) { s.flash('all', 0.6); s.burst('glint', 150, 62, 10, { sp: 30, life: 0.6, w: 30, h: 24 }); } } },
    { t: '给猫鞠个躬', sub: '免费 · 本局事件好运 +5%', fn: () => { this.buffRun('eventLuck', 0.05, '好运 +5%', '#ffcc33'); this.miniSet('bow'); mg.bowT = mg.t; S.mini('cat', 'bell'); const s = catSlot(); if (s) { s.flash(0, 1.2); s.burst('glint', 150, 60, 14, { sp: 24, life: 0.8, w: 40, h: 30 }); } SHOW.later(mg, 0.75, () => { if (this.mini === mg) this.miniFinish('猫眯起了眼睛。你觉得运气好了一点。', '#ffcc33'); }); } },
    { t: '离开', leave: 1, fn: () => this.miniFinish('猫爪还在一下一下地招。', '#8d8496') }]; return []; },
  // 点空白（开始前）：地毯上弹起一枚铜钱
  down(mg, px, py) { if (mg.phase !== 'idle' || px < SX || px > SX + SW || py < SY || py > SY + SH) { SHOW.tap(this, mg, px, py); return; } mg.spill.push({ x: K.ax(px), y: 166, vx: (rnd() - 0.5) * 40, vy: -90, r: rnd() * 6, a: 1.4 }); S.mini('cat', 'clink'); SHOW.burst(mg, px, K.ly(166), 6, { col: C.gold, sp: [60, 160], life: [0.2, 0.4] }); },
  tick(mg, dt) {
    mg.pop = Math.max(0, mg.pop - dt * 5); mg.boom = Math.max(0, mg.boom - dt * 4);
    // 滚在地毯上的钱：抛物线落地、弹两下、滚一段、淡掉
    mg.spill.forEach(p => { p.vy += 320 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vx * dt * 0.3; if (p.y > 168) { p.y = 168; if (Math.abs(p.vy) > 30) { p.vy *= -0.42; p.vx *= 0.75; } else { p.vy = 0; p.vx *= Math.exp(-dt * 2); } p.a -= dt * 0.6; } });
    mg.spill = mg.spill.filter(p => p.a > 0 && p.x > 2 && p.x < 298); if (mg.spill.length > 40) mg.spill.splice(0, mg.spill.length - 40);
    if (mg.phase !== 'rain') return; mg.left = 8 - mg.pt;
    const x0 = mg.px, kb = (mg.keys.left ? -1 : 0) + (mg.keys.right ? 1 : 0); if (kb) mg.px += kb * 900 * dt; else mg.px += (cl(mg.mx, SX + 80, SX + SW - 80) - mg.px) * Math.min(1, dt * 14); mg.px = cl(mg.px, SX + 80, SX + SW - 80);
    const v = (mg.px - x0) / Math.max(dt, 1e-3); mg.run = Math.abs(v) > 60 ? mg.run + dt : 0; if (Math.abs(v) > 60) mg.dir = v > 0 ? 1 : -1; mg.lean = cl(-v / 1800, -1, 1);
    // 每下一枚，猫爪就甩一下：一枚金币从爪子里飞上天（天上落下来的就是它招来的）
    mg.spawn -= dt; if (mg.spawn <= 0 && mg.left > 0.6) { mg.spawn = 0.16 + rnd() * 0.12; const r = rnd(); mg.items.push({ x: SX + 80 + rnd() * (SW - 160), y: SY + 60, vy: 220 + rnd() * 200 + mg.pt * 30, k: r < 0.14 ? 'bomb' : r < 0.26 ? 'bar' : 'coin', rot: rnd() * 6 });
      mg.flickT = mg.t; mg.ups.push({ x: CAT_PAW[0], y: CAT_PAW[1], vx: (rnd() - 0.3) * 60, t: mg.t }); if (mg.ups.length > 8) mg.ups.shift(); if (rnd() < 0.35) S.mini('cat', 'flick'); }
    mg.items.forEach(it => { it.vy += 500 * dt; it.y += it.vy * dt; it.rot += dt * 4; if (!it.done && it.y > CATY - 30 && it.y < CATY + 20 && Math.abs(it.x - mg.px) < 80) { it.done = true; const s = catSlot(), [tx] = M.PXR.MINI_D.art(mg.px, CATY);
      if (it.k === 'bomb') { const lost = mg.sum - Math.floor(mg.sum * 0.6); mg.sum = Math.floor(mg.sum * 0.6); mg.bombs++; S.mini('cat', 'bomb'); if (lost > 0) SHOW.later(mg, 0.08, () => S.mini('cat', 'spill')); this.fx.kick(14); this.fx.explode(it.x, CATY, '#ff5a3a', 1); SHOW.comboBreak(mg); SHOW.state(mg).gray = 0.8; mg.boom = 1;
        // 被炸掉的那四成：一把钱从盘里飞出去，落在地毯上滚走
        for (let i = 0; i < Math.min(14, Math.max(3, Math.round(lost * 0.7))); i++) mg.spill.push({ x: tx + (rnd() - 0.5) * 10, y: 132, vx: (rnd() - 0.5) * 220, vy: -120 - rnd() * 140, r: rnd() * 6, a: 1.6 });
        if (s) { s.burst('spark', tx, 134, 14, { sp: 60, spread: 6.3, life: 0.6 }); s.burst('steam', tx, 130, 5, { sp: 10, life: 1.4, w: 8 }); } }
      else { const bar = it.k === 'bar', v2 = bar ? 5 : 1; mg.sum += v2; mg.pop = mg.popMax = bar ? 1.6 : 1; S.mini('cat', bar ? 'bar' : 'coin'); this.fx.spark(it.x, CATY, '#ffcc33', bar ? 10 : 4, { dir: -Math.PI / 2, spread: 1.5, v: 400 });
        hitCombo(this, mg, mg.px, CATY - 150, bar); this.fx.pop(it.x, CATY - 60, '+' + v2, bar ? C.gold : C.butter, bar ? 60 : 32, { num: 1, life: 0.5, rise: 70 });
        if (s) { s.flash(8, bar ? 0.9 : 0.35); s.burst('glint', tx, 130, bar ? 6 : 2, { sp: 26, life: 0.5, w: 14 }); if (bar) { s.flash('all', 0.4); S.mini('cat', 'bell'); } }
        if (bar) { this.fx.flare(it.x, CATY, 200, C.gold, 0.25); this.fx.ring(it.x, CATY, 10, 140, C.gold, 5, 0.3); this.fx.kick(4); } } } });
    // 漏掉的钱砸在地毯上弹起来滚走
    mg.items.forEach(it => { if (!it.done && it.y >= FLOOR + 80 && it.k !== 'bomb') { S.mini('cat', 'miss'); const [ax] = M.PXR.MINI_D.art(it.x, it.y); mg.spill.push({ x: ax, y: 167, vx: (rnd() - 0.5) * 80, vy: -70 - rnd() * 40, r: it.rot, a: 1 }); } });
    mg.items = mg.items.filter(it => !it.done && it.y < FLOOR + 80);
    const sec = Math.ceil(mg.left); if (mg.left < 3 && mg.left > 0 && sec !== mg.sec) { mg.sec = sec; mg.secT = mg.t; SHOW.crawl(this, mg, 4 - sec); const s = catSlot(); if (s) s.flash('all', 0.5); }
    if (mg.left <= 0 && !mg.fin) { mg.fin = true; this.miniSet('end'); const sum = mg.sum, v2 = M.nice(mg.P * 0.5 * sum), from = { x: mg.px, y: CATY - 20 }, col = v2 > mg.pay ? '#ffcc33' : '#caa84a', tx = '猫爪停了。你接住了 ' + sum + ' 份钱' + (mg.bombs ? '（被炸掉了一些）' : '') + '。';
      mg.items.forEach(it => this.fx.spark(it.x, it.y, it.k === 'bomb' ? C.slate : C.gold, 3, { v: 200 })); mg.items = [];
      // 称重：盘里的钱一层层亮，逐拍加码（拍数按评级），卡帧，揭晓砸评级章；C 一拍带过
      const gr = sum >= 45 ? 'S' : sum >= 30 ? 'A' : sum >= 16 ? 'B' : 'C', q = { S: 3, A: 2, B: 1, C: 0 }[gr], gains = v2 ? [{ k: 'wallet', v: v2 }] : [];
      if (!q) { mg.weighI = 0; S.mini('cat', 'weigh', 0); SHOW.grade(this, mg, gr, CX, SY + 250); give(this, mg, gains, from); endIn(this, mg, 0.5, tx, col); return; }
      const T = SHOW.charge(this, mg, { x: mg.px, y: CATY - 30, q, beats: q + 2, onBeat: (i) => { mg.weighI = i; S.mini('cat', 'weigh', i); K.pxrFlash('mini_cat', 8, 0.5 + i * 0.3); },
        onReveal: () => { mg.weighI = null; const tier = SHOW.grade(this, mg, gr, CX, SY + 250); if (tier >= 3) { mg.joyT = mg.t; S.mini('cat', 'bell'); K.pxrFlash('mini_cat', 'all', 1.2); const s = catSlot(); if (s) s.burst('glint', 150, 60, 24, { sp: 50, life: 1, w: 50, h: 40 }); this.fx.coins(CX, SY + 230, 30, { v: 1100 }); }
          SHOW.later(mg, 0.25, () => SHOW.win(this, mg, tier, { x: from.x, y: FLOOR - 20, v: v2, col: C.gold })); SHOW.later(mg, 0.4, () => give(this, mg, gains, from)); } });
      endIn(this, mg, T + 0.4 + TIER_END[{ S: 3, A: 2, B: 1 }[gr] - 1], tx, col); }
  },
  draw(x, mg) {
    const t = mg.t, px = M.PXR;
    if (px && px.has('mini_cat')) { K.pxr(x, 'mini_cat', 0, 0, t, { mg, t }); } else bgv(x, '#3a1010', '#120404');
    // 领袖：接钱时头顶红漆盘跑（跑步动作、朝着跑的方向），不接钱时站在一边
    const hk = catHero(this), rain = mg.phase === 'rain' || mg.phase === 'end';
    if (hk) { const f = rain && mg.run > 0 ? ['move', Math.floor(t * 12) % 8] : ['idle', Math.floor(t * 12) % 24], c = M.PCDG.bodyFrame(hk, f[0], f[1], mg.boom > 0.6 ? '#ffffff' : null);
      const hx = rain ? mg.px + Math.sin(t * 60) * 6 * mg.boom : CX - 330, fy = rain ? CATY + 18 + c.S : FLOOR + 72, flip = rain ? mg.dir < 0 : false;
      x.save(); x.imageSmoothingEnabled = false; x.translate(Math.round(hx), Math.round(fy)); if (flip) x.scale(-1, 1); x.drawImage(c, -c.cx, -c.footY, c.width, c.height); x.restore();
      if (rain) MINI.cat.tray(x, mg, hx); }
    else { K.SP(x, heroSp(this), rain ? mg.px : CX - 330, rain ? CATY + 130 : FLOOR, 170); if (rain) MINI.cat.tray(x, mg, mg.px); }
    if (rain) { U.coin(x, SX + 70, SY + 119, 42); U.text(x, mg.sum + ' 份', SX + 128, SY + 140, T.num, C.gold, { align: 'left' }); U.bar(x, SX + SW - 380, SY + 134, 300, 12, cl(mg.left / 8, 0, 1), { col: mg.left < 3 && Math.sin(t * 16) > 0 ? C.red : C.gold }); // 剩余时间条放在右上，不压说明文字
      if (mg.phase === 'rain' && mg.left < 3 && mg.secT != null) K.big(x, String(mg.sec), CX + 300, SY + 220, T.hero, C.red, t - mg.secT, { num: true }); }
  },
  // 红漆盘：金边、酒红漆身，盘里的钱越接越高（按整格画，和舞台同一个像素大小）；接到一下压一格再弹，称重时一层层亮
  tray(x, mg, hx) {
    const P = 4, pk = mg.pop / (mg.popMax || 1), dy = pk > 0.72 ? 1 + (mg.popMax > 1.2 ? 1 : 0) : pk > 0.36 ? -1 : 0, hot = pk > 0.8, lean = Math.round((mg.lean || 0) * 2), n = Math.min(28, Math.round(mg.sum * 0.6)), wk = mg.weighI;
    const ox = Math.round(hx / P) * P, oy = CATY + dy * P, R = (a, b, w, h, c) => K.R(x, ox + a * P, oy + b * P, w * P, h * P, c);
    for (let i = 0; i < n; i++) { const row = Math.floor((Math.sqrt(8 * i + 1) - 1) / 2), k = i - row * (row + 1) / 2, cx0 = -row * 2 + k * 4 + lean * (row > 1 ? 1 : 0), cy = -1 - row, lit = wk != null && wk === Math.floor(row / 1.5);
      R(cx0 - 1, cy, 3, 1, lit ? C.butter : (i % 3 ? C.gold : C.amber)); if ((i + row) % 4 === 0) R(cx0 - 1, cy, 1, 1, C.butter); }
    R(-12, 0, 24, 1, hot ? C.white : C.gold); R(-12, 0, 1, 1, C.butter); R(-11, 1, 22, 1, hot ? C.butter : C.red); R(-11, 2, 22, 1, C.wine); R(-10, 3, 20, 1, C.ink); R(-13, 0, 1, 2, C.amber); R(12, 0, 1, 2, C.amber);
    } };

// ═════════════════════ 黑市 · stop the price needle ═════════════════════
// 拍板那一刻价格就定了；好价：慢镜头、聚光罩住表盘、价签一格一格往下滚，最后砸 GOOD / GREAT / PERFECT；
// 成交时图纸先亮品质色（手快才可能升格），再揭晓走中奖档；贵价一拍带过
const MKD = { x: CX + 20, y: SY + 420 }, MKP = { x: CX - 310, y: SY + 340 };
MINI.market = { title: '黑市', img: 'e_market', col: C.violet, text: '斗篷底下的人亮出一张高级图纸。「价钱？看你手快不快。」',
  init(mg) { mg.base = M.nice(mg.P * 14); mg.needle = 0; mg.price = 0; mg.tries = 0; },
  stop(mg) { if (mg.phase !== 'swing') return; const k = 0.4 + mg.needle * 1.4; mg.mul = k; mg.price = M.nice(mg.base * k); this.miniSet('offer'); S.mini('market', 'stamp'); this.fx.kick(5);
    const g = k < 0.6 ? 3 : k < 0.9 ? 2 : k < 1.2 ? 1 : 0, a = Math.PI + mg.needle * Math.PI; mg.grab = g; mg.stopN = mg.needle; mg.rollD = g >= 2 ? 0.5 : 0.25; mg.stamped = 0; mg.rs = -1;
    this.fx.spark(MKD.x + Math.cos(a) * 180, MKD.y + Math.sin(a) * 180, g ? C.lime : C.red, 6 + g * 4, { v: 500 });
    if (g >= 2) { SHOW.slowmo(mg, g >= 3 ? 0.3 : 0.5, 0.45); SHOW.reach(this, mg, { x: MKD.x, y: MKD.y - 60, r: 250, col: C.lime, label: '' }); }
    else if (!g) { mg.stamped = 1; SHOW.state(mg).gray = 0.8; SHOW.stamp(mg, 'MISS', MKD.x, MKD.y - 250, C.steel, 44, 0.6); } },
  deal(mg) { const b = fixBp(this, K.bp(null, 2)), q = gq(b), g = mg.grab || 0, path = g >= 3 ? SHOW.omenPath(q) : [q], tier = Math.max(1, Math.min(4, g + (q >= 3 ? 1 : 0))), open = 0.35 + 0.15 * q + (path.length - 1) * 0.4;
    this.miniSet('deal'); mg.bq = { s: path[0], q, t0: mg.t, open: 0 }; SHOW.omen(this, mg, path[0]); if (tier >= 3) SHOW.reach(this, mg, { x: MKP.x, y: MKP.y, r: 230, col: QC(path[0]), lv: tier >= 4 ? 2 : 1, label: '' });
    path.slice(1).forEach((pq, i) => SHOW.later(mg, 0.45 + i * 0.4, () => { mg.bq.s = pq; SHOW.promote(this, mg, MKP.x, MKP.y, pq); }));
    SHOW.later(mg, open, () => { mg.bq.open = mg.t; this.fx.explode(MKP.x, MKP.y, QC(q), 0.8 + 0.3 * q);
      SHOW.later(mg, 0.08, () => SHOW.win(this, mg, tier, { x: MKP.x + 60, y: MKP.y, col: tier >= 3 ? C.gold : QC(q), label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : '' }));
      SHOW.later(mg, tier === 4 ? 0.7 : 0.2, () => give(this, mg, [b], MKP)); });
    endIn(this, mg, open + TIER_END[tier - 1], '你用 ' + mg.price + ' 积分买下了图纸（原价 ' + mg.base + '）。', '#9a8aff'); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'swing') { MINI.market.stop.call(this, mg); return true; } },
  down(mg) { if (mg.phase === 'swing') MINI.market.stop.call(this, mg); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '开始砍价', sub: '指针越靠左越便宜', gold: 1, fn: () => { mg.tries++; this.miniSet('swing'); } }, { t: '卖掉一名部队', sub: '按 1.5 倍价格收', dis: !this.run.roster.length, why: '你没有部队', fn: () => { const run = this.run, u = run.roster.slice().sort((a, b) => M.sellValue(run, b) - M.sellValue(run, a))[0], v = M.nice(M.sellValue(run, u) * 1.5); run.roster = run.roster.filter(o => o !== u); this.miniFinish('斗篷人牵走了 ' + M.DB[u.type].n + '，丢给你一袋钱。', '#9a8aff', [{ k: 'wallet', v }]); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('斗篷人缩回了阴影里。', '#8d8496') }];
    if (mg.phase === 'swing') return [{ t: '拍板！', sub: '空格 / 点击', gold: 1, fn: () => MINI.market.stop.call(this, mg) }];
    if (mg.phase === 'offer') return [{ t: '成交', sub: mg.price + ' 积分', gold: 1, dis: this.run.wallet < mg.price, why: '积分不够', fn: () => { if (!this.miniPay(mg.price)) return; S.mini('market', 'deal'); MINI.market.deal.call(this, mg); } }, { t: '再砍一次', sub: '他会更不耐烦', dis: mg.tries >= 2, why: '他不跟你砍了', fn: () => { mg.tries++; SHOW.calm(mg); this.miniSet('swing'); } }, { t: '算了', leave: 1, fn: () => this.miniFinish('你把图纸推了回去。', '#8d8496') }]; return []; },
  tick(mg) { if (mg.phase === 'swing') { const sp = 1.3 + mg.tries * 0.6, q = (mg.pt * sp) % 2; mg.needle = q < 1 ? q : 2 - q; const sk = Math.floor(mg.pt * sp * 3); if (sk !== mg.sk) { mg.sk = sk; S.mini('market', 'swing'); } }
    if (mg.phase === 'offer' && !mg.stamped) { const p = cl(mg.pt / mg.rollD, 0, 1), s = Math.floor(p * 6), g = mg.grab; if (g >= 2 && s !== mg.rs && p < 1) { mg.rs = s; SHOW.crawl(this, mg, s); }
      if (p >= 1) { mg.stamped = 1; SHOW.calm(mg); SHOW.stamp(mg, ['GOOD', 'GREAT', 'PERFECT'][g - 1], MKD.x, MKD.y - 250, g >= 3 ? C.gold : C.lime, 52 + g * 10, 1.2); S.mini('market', 'grab', g); this.fx.kick(3 + g * 3); this.fx.ring(MKD.x, MKD.y + 70, 10, 120 + g * 40, C.lime, 5, 0.35); if (g >= 3) { this.fx.flash('#ffffff', 0.2); this.fx.rays(MKD.x, MKD.y + 70, C.gold, 1, { r: 320 }); } } } },
  draw(x, mg) {
    const t = mg.t, B = mg.bq; bgv(x, '#141228', '#06050c'); K.SP(x, 'stall', CX + 300, FLOOR - 40, 180); K.GL(x, CX + 300, FLOOR - 200, 160, C.violet, 0.25);
    // 图纸：米色纸 + 墨边 + 9px 硬投影，名字是金色小签；成交后先在品质色里抖，揭晓时鼓一下
    let jd = { dx: 0, dy: 0 }; if (B && !B.open) jd = SHOW.aura(x, MKP.x, MKP.y, 230, B.s, t, cl((t - B.t0) / 1.0, 0.25, 1));
    x.save(); x.translate(jd.dx, jd.dy); if (B && B.open) { const k = 1 + 0.12 * Math.exp(-(t - B.open) * 7); K.GL(x, MKP.x, MKP.y, 320, QC(B.q), 0.5 + 0.15 * Math.sin(t * 5)); x.translate(MKP.x, MKP.y); x.scale(k, k); x.translate(-MKP.x, -MKP.y); }
    K.R(x, CX - 454, SY + 156, 306, 386, C.ink); U.box(x, CX - 460, SY + 150, 300, 380, C.cream); K.R(x, CX - 440, SY + 170, 260, 340, C.blueDeep); for (let i = 0; i < 6; i++) K.R(x, CX - 420, SY + 200 + i * 44, 220 - (i % 3) * 40, 4, 'rgba(255,255,255,0.5)'); K.IC(x, 'scroll', CX - 310, SY + 420, 90); K.chipC(x, '高级图纸', CX - 310, SY + 480, C.gold); x.restore();
    // 价格表盘：墨底弧 + 绿 / 金 / 红三段，倍数品红；指针扫过绿段时绿段亮一下
    const gx = MKD.x, gy = MKD.y, R = 200; if (mg.phase === 'swing' && mg.needle < 1 / 7) K.GL(x, gx - R * 0.8, gy - 60, 120, C.green, 0.4);
    x.lineCap = 'butt'; x.lineWidth = 42; x.strokeStyle = C.ink; x.beginPath(); x.arc(gx, gy, R, Math.PI, Math.PI * 2); x.stroke(); x.lineWidth = 36; [[Math.PI, Math.PI * 1.33, C.green], [Math.PI * 1.33, Math.PI * 1.66, C.gold], [Math.PI * 1.66, Math.PI * 2, C.red]].forEach(([a, b, c]) => { x.strokeStyle = c; x.beginPath(); x.arc(gx, gy, R, a, b); x.stroke(); });
    [0.4, 1, 1.8].forEach((k, i) => U.text(x, '×' + k, gx + Math.cos(Math.PI + i * Math.PI / 2) * (R + 50), gy + Math.sin(Math.PI + i * Math.PI / 2) * (R + 50), T.cap, C.magenta));
    // 拍板后指针颤一下再停（只是画，价格早定了）
    const nd = mg.phase === 'offer' ? mg.stopN + 0.04 * Math.sin(mg.pt * 38) * Math.exp(-mg.pt * 7) : mg.phase === 'deal' ? mg.stopN : mg.needle, a = Math.PI + cl(nd, 0, 1) * Math.PI; K.LN(x, gx, gy, gx + Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10), 12, C.ink); K.LN(x, gx, gy, gx + Math.cos(a) * (R - 10), gy + Math.sin(a) * (R - 10), 6, C.white); U.box(x, gx - 12, gy - 12, 24, 24, C.gold);
    if (mg.phase === 'offer' || mg.phase === 'deal') { const top = M.nice(mg.base * 1.8), p = mg.phase === 'offer' && !mg.stamped ? cl(mg.pt / mg.rollD, 0, 1) : 1, shown = p < 1 ? Math.round(top - (top - mg.price) * eo(p)) : mg.price;
      K.big(x, shown + ' 积分', gx, gy + 70, T.num, mg.mul < 0.8 ? C.lime : mg.mul < 1.3 ? C.gold : C.red, mg.phase === 'offer' ? mg.pt : 9); U.text(x, '原价 ' + mg.base, gx, gy + 120, T.cap, C.lavender); }
  } };

// ═════════════════════ 特训 · mash to train a soldier ═════════════════════
// 每一拳都是连击（逢 5 砸字、5 连进狂热），沙袋越打晃得越凶；最后一秒一格一响；时间到砸评级，按评级走中奖档
MINI.trainer = { title: '地下拳馆', img: 'e_trainer', col: C.amber, text: '教练叼着烟：「交钱，上来打沙袋。打得越狠，练得越壮。」',
  // the leader steps in itself (user ruling 2026-09-25): no picking a unit, the gain is the leader's
  init(mg) { mg.hits = 0; mg.bag = 0; mg.bagK = 0.4; },
  punch(mg) { if (mg.phase !== 'mash') return; mg.hits++; mg.bag = 1; mg.bagK = Math.min(1.2, 0.4 + mg.hits / 30); S.mini('trainer', 'punch', mg.hits); this.fx.kick(2 + Math.min(8, mg.hits / 4)); this.fx.spark(CX + 170, SY + 330, '#ffe08a', 4 + Math.min(8, mg.hits >> 2), { dir: 0, spread: 1, v: 400 + Math.min(400, mg.hits * 12) });
    const n = hitCombo(this, mg, CX + 170 + (rnd() - 0.5) * 120, SY + 190, false); if (n % 10 === 0) { this.fx.ring(CX + 170, SY + 330, 10, 150, C.gold, 5, 0.3); this.fx.flare(CX + 170, SY + 330, 160, C.gold, 0.2); } },
  down(mg) { MINI.trainer.punch.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'mash') { MINI.trainer.punch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '领袖上场', sub: mg.pay + ' 积分 · 4 秒疯狂出拳', gold: 1, dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; this.miniSet('count'); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('教练把烟头弹进了沙袋里。', '#8d8496') }];
    if (mg.phase === 'mash') return [{ t: '出拳！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.trainer.punch.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.bag = Math.max(0, mg.bag - dt * 6);
    if (mg.phase === 'count') { const n = Math.floor(mg.pt * 2); if (n !== mg.cn && n < 3) { mg.cn = n; SHOW.crawl(this, mg, n); } if (mg.pt > 1.5) { this.miniSet('mash'); S.mini('trainer', 'bell'); this.fx.flash(C.gold, 0.12); this.fx.kick(6); } }
    if (mg.phase === 'mash' && mg.pt > 3 && mg.pt <= 4) { const q = Math.floor((mg.pt - 3) / 0.25); if (q !== mg.cq) { mg.cq = q; SHOW.crawl(this, mg, 2 + q); } }
    if (mg.phase === 'mash' && mg.pt > 4 && !mg.fin) { mg.fin = true; const run = this.run, h = run.hero, k = Math.min(0.3, mg.hits * 0.009), mx = M.heroMaxHp(h, run.M), heal = Math.round(mx * k);
      run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + k; this.hold && this.hold('hp', Math.round(h.hp)); h.hp = Math.min(mx, h.hp + heal); S.mini('trainer', 'done'); this.miniSet('end');
      mg.bag = 1; mg.bagK = 1.6; const tier = SHOW.grade(this, mg, mg.hits >= 34 ? 'S' : mg.hits >= 24 ? 'A' : mg.hits >= 14 ? 'B' : 'C', CX, SY + 280), from = { x: CX - 80, y: FLOOR - 130 };
      if (tier) SHOW.later(mg, 0.3, () => SHOW.win(this, mg, tier, { x: from.x, y: from.y, v: Math.round(k * 100), col: C.amber, label: tier === 3 ? '大赢' : '' }));
      SHOW.later(mg, tier ? 0.4 : 0.1, () => hearts(this, from, C.lime, () => { if (this.held && this.held.hp != null) this.release('hp'); }));
      endIn(this, mg, tier ? 0.4 + TIER_END[tier - 1] + 0.1 : 1.0, mg.hits + ' 拳！领袖本局攻击 +' + Math.round(k * 100) + '%，回复 ' + heal + ' 生命。', '#ff8a3a'); } },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever; bgv(x, '#2a1a10', '#0c0806'); K.GL(x, CX, SY + 120, 300, '#ffd080', 0.3 + (fev ? 0.15 * Math.sin(t * 14) : 0)); K.LN(x, CX, SY, CX, SY + 120, 3, '#8a8a9a');
    // 沙袋：越打晃得越凶，挨一拳压扁一下
    const bx = CX + 170, sw = Math.sin(mg.bag * Math.PI) * (0.15 + 0.25 * mg.bagK), sq = 1 + 0.08 * mg.bag; K.LN(x, bx, SY + 90, bx + Math.sin(sw) * 200, SY + 200, 4, '#8a8a9a'); x.save(); x.translate(bx, SY + 90); x.rotate(-sw); x.scale(2 - sq, sq); U.box(x, -50, 110, 100, 240, C.wine); K.R(x, -50, 150, 100, 10, C.umber); K.R(x, -50, 300, 100, 10, C.umber); x.restore();
    if (fev) K.GL(x, CX - 80, FLOOR - 20, 180, C.gold, 0.3 + 0.15 * Math.sin(t * 16));
    K.SP(x, heroSp(this), CX - 80 + mg.bag * 30, FLOOR, 200);
    // 倒数每跳一个数弹一下；出拳数每打一拳弹一下
    if (mg.phase === 'count') K.big(x, String(Math.max(1, 3 - Math.floor(mg.pt * 2))), CX, SY + 250, 120, C.gold, mg.pt % 0.5, { num: true });
    if (mg.phase === 'mash' || mg.phase === 'end') { K.big(x, mg.hits + ' 拳', CX - 300, SY + 200, T.hero, C.gold, mg.bag > 0 ? (1 - mg.bag) / 6 : 9); U.bar(x, CX - 450, SY + 262, 300, 14, cl(1 - mg.pt / 4, 0, 1), { col: mg.phase === 'mash' && mg.pt > 3 && Math.sin(t * 18) > 0 ? C.red : C.amber }); K.R(x, CX - 450 + 300 * 26 / 40, SY + 252, 3, 34, C.white); } // 时间条放在拳数下面，不压说明文字
  } };

// ═════════════════════ 古像 · rotate the rings to wake the statue ═════════════════════
// 像素舞台（mc-pxroom-mini-d.js 的 mini_statue）：藤蔓吞掉的神殿，暖色石雕坐像，胸口是三圈石环表盘，脚下 8 根蜡烛就是剩余次数。
// 悬停的那圈浮起一格；点一圈：转四分之一（过冲、回位、掉灰），灭一根蜡烛；转正一圈：刻槽从铜牙开始一圈亮成青色、咔地锁住、
// 身上亮起两道裂纹；两圈正了听牌，石像眼皮缝跟着心跳透光；第三圈锁住：三拍加码（三圈刻槽由外到内全亮），卡帧，
// 双眼睁开爆出青光、全身落灰落苔、抬头点头，地上的符文一圈圈亮开，两项加成逐项砸出；转不动了一拍带过
const STR = [168, 112, 56], STC = { x: CX, y: K.ly(98) }, STEYE = K.ly(37);
const stRing = (px, py) => { const d = Math.hypot(px - STC.x, py - STC.y); return d < STR[2] ? 2 : d < STR[1] ? 1 : d < STR[0] ? 0 : -1; };
MINI.statue = { title: '沉睡的古像', img: 'e_statue', col: C.teal, text: '石像胸口有三圈刻纹。把图案转正，它就会醒过来。只能转八次。',
  init(mg) { mg.rot = [1 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 3), Math.floor(rnd() * 4)]; if (mg.rot.every(v => v % 4 === 0)) mg.rot[0] = 2; mg.moves = 8; mg.anim = [0, 0, 0]; mg.lk = [0, 0, 0]; },
  turn(mg, i) { if (mg.phase !== 'idle' || mg.moves <= 0) return; const was = mg.rot.slice(), cy = STC.y; mg.rot[i] = (mg.rot[i] + 1) % 4; if (i < 2) mg.rot[i + 1] = (mg.rot[i + 1] + (i === 0 ? 0 : 1)) % 4; mg.moves--; mg.anim[i] = 1; if (i === 1) mg.anim[2] = 1; S.mini('statue', 'turn'); S.mini('statue', 'snuff'); if (mg.rot[i] === 0) S.mini('statue', 'align', i);
    SHOW.shake(mg, 3); SHOW.burst(mg, CX, cy + STR[i] - 8, 8, { ramp: [C.cream, C.tan, C.brown, C.umber], sp: [40, 160], life: [0.3, 0.6], g: 500, w: STR[i] });
    const al = mg.rot.filter(v => v === 0).length;
    mg.rot.forEach((v, j) => { if (v === 0 && was[j] !== 0) { mg.lk[j] = 1; SHOW.crawl(this, mg, al); SHOW.ring(mg, CX, cy, STR[j] - 20, STR[j] + 20, C.teal, { life: 0.35, w: 2 }); SHOW.burst(mg, CX, cy - STR[j] + 10, 12, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [80, 240], life: [0.3, 0.6] }); SHOW.flash(mg, C.teal, 0.12); if (al < 3) SHOW.stamp(mg, al >= 2 ? 'GREAT' : 'GOOD', CX + 340, cy - 60, al >= 2 ? C.gold : C.lime, 52, 0.9); } });
    if (al === 3) { this.miniSet('waking'); S.mini('statue', 'wake'); MINI.statue.wake.call(this, mg); }
    else if (mg.moves <= 0) { this.miniSet('sleep'); S.mini('statue', 'fail'); const j = mg.rot.findIndex(v => v !== 0); SHOW.shake(mg, 4); if (al === 2) SHOW.near(this, mg, CX, cy - STR[j] + 30, '差一点！'); else SHOW.lose(this, mg); endIn(this, mg, 0.45, '刻纹卡住了。石像没有醒。', '#8d8496'); }
    else if (al === 2) { if (!SHOW.tense(mg)) SHOW.reach(this, mg, { x: CX, y: cy, r: 190, col: C.teal }); } else SHOW.calm(mg); },
  // 三拍加码（三圈刻槽由外到内全亮、镜头往脸上推）→ 卡帧 → 睁眼揭晓 → 两项加成逐项砸出
  wake(mg) { SHOW.calm(mg);
    const T = SHOW.charge(this, mg, { x: CX, y: STC.y - 60, q: 2, beats: 3, reveal: false, onBeat: (i) => { mg.lk[2 - i] = 1; S.mini('statue', 'align', 2 - i); K.pxrFlash('mini_statue', 3, 1 + i * 0.6); },
      onReveal: () => { this.miniSet('wake'); S.mini('statue', 'eyes'); SHOW.reveal(this, mg, 2, { x: CX, y: STEYE, col: C.teal }); K.pxrFlash('mini_statue', 'all', 1.2); SHOW.stamp(mg, '大赢', CX, STEYE + 150, C.teal, 110, 1.8);
        const s = M.PXR && M.PXR.slots['_mg:mini_statue']; if (s) s.burst('dust', 150, 60, 40, { sp: 20, life: 1.6, w: 100, h: 30 });
        SHOW.later(mg, 0.7, () => { this.buffRun('unitAtk', 0.1, '部队攻击 +10%', '#8fe0ff'); this.run.mods.unitHp = (this.run.mods.unitHp || 0) + 0.1; SHOW.items(this, mg, [{ text: '部队攻击 +10%', col: C.ice, size: 40 }, { text: '部队生命 +10%', col: C.gold, size: 40 }], { x: CX, y: SY + 560, dy: 58 }); SHOW.ambient(mg, 2); }); } });
    endIn(this, mg, T + 2.4, '石像睁开了眼睛，向你的部队点了点头。本局部队攻击、生命各 +10%。', '#8fe0ff'); },
  btns(mg) { if (mg.phase !== 'idle') return []; return [0, 1, 2].map(i => ({ t: ['转外圈', '转中圈（会带动内圈）', '转内圈'][i], sub: '剩 ' + mg.moves + ' 次', fn: () => MINI.statue.turn.call(this, mg, i) })).concat([{ t: '离开', leave: 1, fn: () => this.miniFinish('石像继续睡着。', '#8d8496') }]); },
  down(mg, px, py) { const i = stRing(px, py); if (i >= 0) MINI.statue.turn.call(this, mg, i); else SHOW.tap(this, mg, px, py); },
  tick(mg, dt) { mg.anim = mg.anim.map(a => Math.max(0, a - dt * 4)); mg.lk = mg.lk.map(a => Math.max(0, a - dt * 3)); },
  draw(x, mg) {
    const t = mg.t, i = mg.phase === 'idle' ? stRing(mg.mx, mg.my) : -1; if (i !== mg.hovRing && i >= 0) S.mini('_', 'hover'); mg.hovRing = i;
    if (!K.pxr(x, 'mini_statue', 0, 0, t, { mg, t })) bgv(x, '#1a2230', '#06080c');
    // 醒来：双眼往下打出两道光，扫过地面
    const wk = mg.phase === 'wake', eye = wk ? cl((mg.pt - 0.12) / 0.4, 0, 1) : 0;
    if (eye) { const sw = Math.sin(t * 1.6) * 60; x.save(); x.globalAlpha = eye * (0.4 + 0.15 * Math.sin(t * 9)); [-1, 1].forEach(s => { for (let k = 0; k < 24; k++) { const q = k / 24, px = K.snap(CX + s * 32 + (s * 180 + sw) * q), py = K.snap(STEYE + (FLOOR + 40 - STEYE) * q); K.R(x, px - 4, py - 4, 8 + Math.round(q * 3) * 4, 8, k % 2 ? C.teal : C.ice); } }); x.restore(); }
  } };

// ═════════════════════ 斗兽场 · bet, then cheer ═════════════════════
// 加油是连击（逢 5 砸字，喊停了就断）；决定胜负的那一击：慢镜头 + 聚光罩住挨打的那头 + KO；押中走中 / 大赢（险胜是大赢），押错一拍带过
MINI.arena = { title: '斗兽场', img: 'e_arena', col: C.red, text: '两头怪物被推进场子。押一边，然后给它加油——喊得越响它打得越狠。',
  init(mg) { const a = M.pickUnitQ(this.run); let b = M.pickUnitQ(this.run); for (let i = 0; i < 8 && b === a; i++) b = M.pickUnitQ(this.run); mg.b = [a, b].map((k, i) => ({ k, hp: 1, x: i ? CX + 260 : CX - 260, hit: 0, pw: 0.8 + rnd() * 0.4 })); mg.cheer = 0; },
  bet(mg, i) { if (!this.miniPay(mg.pay)) return; mg.side = i; this.miniSet('fight'); S.mini('arena', 'bet'); S.mini('arena', 'open'); },
  down(mg) { if (mg.phase === 'fight' && !mg.ko) { mg.cheer = Math.min(1, mg.cheer + 0.12); S.mini('arena', 'cheer'); hitCombo(this, mg, CX + (rnd() - 0.5) * 200, SY + 175, false); } },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'fight') { MINI.arena.down.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return mg.b.map((b, i) => ({ t: '押' + ['左边', '右边'][i] + '的 ' + M.DB[b.k].n, sub: mg.pay + ' 积分 · 赢了 ×2.2', dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => MINI.arena.bet.call(this, mg, i) })).concat([{ t: '离开', leave: 1, fn: () => this.miniFinish('人群的吼声在你背后炸开。', '#8d8496') }]); if (mg.phase === 'fight' && !mg.ko) return [{ t: '加油！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.arena.down.call(this, mg) }]; return []; },
  // 这一击已经定了会打死对面：先慢下来、聚光、攻击的那头慢慢扑上去，落下去再判
  ko(mg, who, dmg) { const tgt = mg.b[1 - who], win = who === mg.side; mg.ko = { who, t: 0 }; SHOW.slowmo(mg, 0.3, 0.7); SHOW.reach(this, mg, { x: tgt.x, y: FLOOR - 100, r: 170, col: win ? C.gold : C.red, label: '' }); S.mini('arena', 'roar');
    SHOW.later(mg, 0.55, () => { tgt.hp -= dmg; tgt.hit = 1; S.mini('arena', 'hit'); S.mini('arena', 'ko'); this.fx.explode(tgt.x, FLOOR - 100, '#ff5a3a', 1.2); this.fx.kick(18); SHOW.stamp(mg, 'KO', tgt.x, FLOOR - 320, C.red, 130, 1.2); MINI.arena.result.call(this, mg); }); },
  result(mg) { mg.fin = true; const dead = mg.b.findIndex(b => b.hp <= 0), W = mg.b[1 - dead], win = 1 - dead === mg.side; S.mini('arena', win ? 'win' : 'lose'); mg.winner = 1 - dead;
    if (win) { const v = M.nice(mg.pay * 2.2), tier = W.hp < 0.3 ? 3 : 2, from = { x: W.x, y: FLOOR - 140 }; SHOW.later(mg, 0.1, () => SHOW.win(this, mg, tier, { x: W.x, y: FLOOR - 120, v, col: C.gold, label: tier === 3 ? '大赢' : '' })); SHOW.later(mg, 0.25, () => give(this, mg, [{ k: 'wallet', v }], from)); endIn(this, mg, 0.25 + TIER_END[tier - 1], M.DB[W.k].n + ' 赢了！你押对了。', '#ffcc33'); }
    else { SHOW.lose(this, mg); endIn(this, mg, 0.4, M.DB[W.k].n + ' 赢了。你押的那头倒下了。', '#8d8496'); } },
  tick(mg, dt) {
    mg.cheer = Math.max(0, mg.cheer - dt * 0.35); mg.b.forEach(b => b.hit = Math.max(0, b.hit - dt * 4)); if (mg.ko) mg.ko.t += dt;
    if (mg.phase !== 'fight' || mg.ko) return; if (mg.cheer < 0.15 && mg.sh && mg.sh.combo) SHOW.comboBreak(mg);
    const [A, B] = mg.b; const gap = 120; A.x = Math.min(A.x + 200 * dt, CX - gap / 2); B.x = Math.max(B.x - 200 * dt, CX + gap / 2);
    if (A.x >= CX - gap / 2 - 1) { mg.cd = (mg.cd || 0) - dt; if (mg.cd <= 0) { mg.cd = 0.45; const who = rnd() < 0.5 ? 0 : 1, boost = who === mg.side ? mg.cheer : 0, dmg = (0.06 + rnd() * 0.06) * mg.b[who].pw * (who === mg.side ? 1 + mg.cheer * 0.9 : 1); const tgt = mg.b[1 - who];
      if (tgt.hp - dmg <= 0) { MINI.arena.ko.call(this, mg, who, dmg); return; }
      tgt.hp -= dmg; tgt.hit = 1; S.mini('arena', 'hit'); this.fx.kick(5 + boost * 4); this.fx.spark(tgt.x, FLOOR - 90, '#ff5a3a', 8 + Math.round(boost * 12), { dir: who ? Math.PI : 0, spread: 1, v: 500 + boost * 300 }); if (boost > 0.6) this.fx.ring(tgt.x, FLOOR - 90, 10, 110, C.gold, 4, 0.25); } }
  },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever; bgv(x, '#2a1a10', '#0a0604'); for (let r = 0; r < 3; r++) for (let i = 0; i < 26; i++) { const j = mg.phase === 'fight' ? Math.abs(Math.sin(t * (fev ? 12 : 8) + i + r)) * 6 * (0.4 + mg.cheer + (fev ? 0.6 : 0)) : 0; K.CI(x, SX + 30 + i * 46, SY + 110 + r * 40 - j, 12, ['#4a3a30', '#5a4a3a', '#3a2e26'][(i + r) % 3]); }
    K.EL(x, CX, FLOOR + 10, 560, 90, '#8a6a3a'); K.EL(x, CX, FLOOR, 540, 76, '#b08a50');
    mg.b.forEach((b, i) => { const ko = mg.ko && mg.ko.who === i ? 50 * eb(cl(mg.ko.t / 0.16, 0, 1)) * (i ? -1 : 1) : 0, hop = mg.fin && mg.winner === i ? -Math.abs(Math.sin(t * 9)) * 14 : 0, lunge = mg.phase === 'fight' && !mg.fin ? Math.sin(t * 9 + i * 3) * 8 : 0;
      if (i === mg.side && mg.phase === 'fight') K.GL(x, b.x, FLOOR - 90, 140 + 60 * mg.cheer, C.gold, 0.1 + 0.35 * mg.cheer);
      x.save(); if (b.hit) x.globalAlpha = 0.6 + 0.4 * Math.sin(t * 60); K.SP(x, b.k, b.x + (i ? -lunge : lunge) + ko, FLOOR + hop, 180, i === 1); x.restore();
      U.bar(x, b.x - 70, FLOOR - 230, 140, 14, cl(b.hp, 0, 1), { col: i === mg.side ? C.gold : C.red }); K.chipC(x, M.DB[b.k].n, b.x, FLOOR - 256, i === mg.side ? C.gold : C.silver); });
    if (mg.phase === 'fight' && !mg.fin) { if (mg.cheer > 0.7) K.GL(x, CX, SY + 258, 200, C.gold, 0.25 + 0.15 * Math.sin(t * 16)); U.bar(x, CX - 150, SY + 250, 300, 16, mg.cheer, { col: C.gold }); K.chipC(x, '加油', CX, SY + 222, C.gold); }
  } };

// ═════════════════════ 营火 · rest through the night, or sharpen on the beat ═════════════════════
// 安静、暖：歇完火星往上飘、小中一档、心飞向生命条；磨刀每一刀下在点上是连击，火星一刀比一刀多
MINI.camp = { title: '营火', img: 'e_camp', col: C.amber, text: '火堆还温着。歇一夜，或者就着火光把刀磨快。',
  init(mg) { mg.hits = 0; mg.strokes = 0; mg.spark = 0; },
  stroke(mg) { if (mg.phase !== 'sharpen') return; const q = (mg.pt * 1.1) % 1, e = Math.abs(q - 0.5), ok = e < 0.09; mg.strokes++; mg.spark = 1;
    if (ok) { mg.hits++; S.tone(1800, 0.12, 'triangle', 0.1); this.fx.spark(CX + 80, SY + 250, '#ffe08a', 14, { dir: -Math.PI / 2, spread: 2, v: 700 });
      const n = SHOW.combo(this, mg, CX, SY + 190, e < 0.03 ? 'PERFECT' : null); this.fx.spark(CX + 80, SY + 250, C.amber, 4 * n, { dir: -Math.PI / 2, spread: 2.4, v: 500 + n * 120 }); if (n >= 3) this.fx.flare(CX + 80, SY + 250, 120 + n * 20, C.butter, 0.18); }
    else { S.tone(300, 0.08, 'square', 0.05); SHOW.comboBreak(mg); SHOW.stamp(mg, 'MISS', CX, SY + 190, C.steel, 40, 0.5); }
    if (mg.strokes >= 5) { this.miniSet('sharpDone'); MINI.camp.sharpEnd.call(this, mg); } },
  sharpEnd(mg) { const run = this.run, k = 0.05 + mg.hits * 0.04, tier = mg.hits >= 5 ? 2 : mg.hits ? 1 : 0; run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + k; S.mini('camp', 'sharpen');
    if (tier) SHOW.later(mg, 0.35, () => { SHOW.win(this, mg, tier, { x: CX + 80, y: SY + 280, v: Math.round(k * 100), col: C.amber, label: tier === 2 ? 'PERFECT' : '' }); embers(this, 12 + tier * 10); });
    else SHOW.state(mg).gray = 0.6;
    endIn(this, mg, tier ? 0.35 + TIER_END[tier - 1] + 0.1 : 0.6, mg.hits + ' / 5 刀磨在点上。本局领袖攻击 +' + Math.round(k * 100) + '%。', '#f2c14e'); },
  down(mg) { MINI.camp.stroke.call(this, mg); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sharpen') { MINI.camp.stroke.call(this, mg); return true; } },
  btns(mg) { const run = this.run; if (mg.phase === 'idle') return [{ t: '休息', sub: '领袖回复 ' + (run.mods.campHalf ? 12 : 30) + '% 生命', gold: 1, fn: () => { this.miniSet('rest'); S.mini('camp', 'rest'); } }, { t: '磨刀', sub: '火星飞到正中时下刀 · 5 次', fn: () => this.miniSet('sharpen') }];
    if (mg.phase === 'sharpen') return [{ t: '下刀', sub: '空格 / 点击 · ' + mg.strokes + ' / 5', gold: 1, fn: () => MINI.camp.stroke.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.spark = Math.max(0, mg.spark - dt * 4); const run = this.run;
    if (mg.phase === 'rest' && mg.pt > 2.2 && !mg.fin) { mg.fin = true; const pct = run.mods.campHalf ? 0.12 : 0.3, from = { x: CX - 220, y: FLOOR - 110 }; embers(this, 26); this.fx.ring(CX, FLOOR - 50, 10, 200, C.amber, 4, 0.6);
      SHOW.win(this, mg, 1, { x: from.x, y: from.y, v: hpPct(this, pct), col: C.lime }); healFly(this, mg, pct, from); endIn(this, mg, 1.25, () => '你在火边睡了一夜。回复 ' + mg.healV + ' 生命。', '#9ccc6a'); } },
  draw(x, mg) {
    const t = mg.t, rest = mg.phase === 'rest', nq = rest ? cl(mg.pt / 2.6, 0, 1) : 0; bgv(x, rest ? '#0a0c20' : '#12101e', '#040306');
    const ma = Math.PI + nq * Math.PI; K.CI(x, CX + Math.cos(ma) * 480, SY + 330 + Math.sin(ma) * 220, 34, '#f5e8c0'); for (let i = 0; i < 30; i++) K.R(x, SX + (i * 97) % SW, SY + 70 + (i * 53) % 260, 2, 2, 'rgba(255,255,255,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')');
    const warm = mg.fin && rest ? 0.2 : 0, fev = mg.sh && mg.sh.fever ? 0.15 : 0;
    K.R(x, SX, FLOOR, SW, SH, '#141008'); const fx0 = CX, fy0 = FLOOR - 10; K.GL(x, fx0, fy0 - 60, 360 + 120 * (warm + fev), '#ff8a3a', 0.5 + warm + fev + 0.1 * Math.sin(t * 9)); K.LN(x, fx0 - 60, fy0 + 10, fx0 + 60, fy0 - 10, 12, C.brown); K.LN(x, fx0 - 60, fy0 - 10, fx0 + 60, fy0 + 10, 12, C.umber);
    for (let i = 0; i < 3; i++) { const f = (0.8 + 0.25 * Math.sin(t * 13 + i * 2)) * (1 + warm + fev); x.fillStyle = [C.amber, C.gold, C.butter][i]; x.beginPath(); x.moveTo(fx0 - 40 + i * 12, fy0); x.quadraticCurveTo(fx0 - 30 + i * 10, fy0 - 60 * f, fx0 + Math.sin(t * 7 + i) * 8, fy0 - (120 - i * 30) * f); x.quadraticCurveTo(fx0 + 30 - i * 10, fy0 - 60 * f, fx0 + 40 - i * 12, fy0); x.fill(); }
    for (let i = 0; i < 10; i++) { const q = (t * 0.6 + i / 10) % 1; K.R(x, fx0 + Math.sin(i * 3 + q * 5) * 40, fy0 - 60 - q * 300, 3, 3, 'rgba(255,200,90,' + (1 - q) + ')'); }
    // 睡觉的 Z：冰蓝像素字，边往上飘边淡掉
    if (rest) { K.SP(x, heroSp(this), CX - 220, FLOOR + 10, 150); for (let i = 0; i < 3; i++) { const q = (t * 0.5 + i / 3) % 1; x.save(); x.globalAlpha *= 1 - q; U.text(x, 'Z', Math.round((CX - 200 + q * 60)), Math.round((FLOOR - 170 - q * 90)), [T.cap, T.btn, T.title][i], C.ice, { num: true }); x.restore(); } }
    else { K.SP(x, heroSp(this), CX - 230, FLOOR, 180); }
    // 磨刀条：石板槽 + 琥珀目标区 + 奶油中线，火星是方块
    if (mg.phase === 'sharpen' || mg.phase === 'sharpDone') { const q = (mg.pt * 1.1) % 1, bx = Math.round(CX - 260 + q * 520); U.box(x, CX - 280, SY + 300, 560, 40, C.slate); K.R(x, CX - 42, SY + 300, 84, 40, C.amber); K.R(x, CX - 3, SY + 296, 6, 48, C.butter);
      if (mg.phase === 'sharpen') { K.GL(x, bx, SY + 320, 40, C.butter, 0.8); U.box(x, bx - 9, SY + 311, 18, 18, C.white); } x.save(); x.translate(CX + 80, SY + 250); x.rotate(-0.3 - mg.spark * 0.3); if (fev) K.GL(x, 0, 0, 160, C.butter, 0.3 + 0.2 * Math.sin(t * 14)); K.PL(x, [[-160, -8], [60, -14], [80, 0], [60, 14], [-160, 8]], C.silver); K.R(x, -200, -10, 40, 20, C.brown); x.restore(); U.text(x, mg.hits + ' / ' + mg.strokes, CX, SY + 390, T.title, C.gold, { num: true }); }
  } };

// ═════════════════════ 招募旗 · curtains lift one by one ═════════════════════
// the three figures are about equally strong (power = price): the choice is which vocation, not which is best
// (user ruling 2026-09-25); within ±15 % of the first, widening only if the pool has nothing that close
M.recruitTrio = function (run) {
  const a = M.pickUnitQ(run), c0 = M.DB[a].cost, out = [a];
  for (const w of [0.15, 0.25, 0.4, 9]) {
    const near = M.SHOP_POOL.filter(k => M.DB[k] && !out.includes(k) && Math.abs(M.DB[k].cost - c0) <= c0 * w).sort(() => Math.random() - 0.5);
    near.sort((x, y) => (out.some(o => M.DB[o].voc === M.DB[x].voc) ? 1 : 0) - (out.some(o => M.DB[o].voc === M.DB[y].voc) ? 1 : 0));
    while (out.length < 3 && near.length) out.push(near.shift());
    if (out.length >= 3) break;
  }
  return out;
};
// 掀帘前每个人影先在帘子后亮品质色（越好亮得越久、抖得越凶），三个里最好的那个可能升格；帘子一下掀上去；
// 选中的那张砸一下，按品质走中奖档（传说 4 · 史诗 3 · 稀有 2 · 普通 1），人飞进队伍栏
MINI.recruit = { title: '招募旗', img: 'e_flag', col: C.blue, text: '旗子下面站着三个人影。帘子一掀开，只有一个能跟你走。',
  init(mg) { const run = this.run; if (this.node) run.lastL = M.levelAt(run, this.node); mg.pool = M.recruitTrio(run); mg.cards = mg.pool.map((k, i) => ({ k, x: CX - 330 + i * 330, y: SY + 380, lift: 0, q: M.DB[k].q | 0, s: -1 }));
    const best = Math.max(...mg.cards.map(c => c.q)), bi = mg.cards.findIndex(c => c.q === best); let t0 = 0.45;
    mg.cards.forEach((c, i) => { c.path = i === bi ? SHOW.omenPath(c.q) : [c.q]; c.t0 = t0; c.od = 0.3 + 0.18 * c.q + (c.path.length - 1) * 0.32; c.la = t0 + c.od; t0 = c.la + 0.12; }); },
  take(mg, i) { if (mg.phase !== 'idle') return; const c = mg.cards[i], run = this.run; if (!M.canAdd(run, c.k)) { S.mini('recruit', 'full'); this.deny('队伍满了', '#d0453c'); return; } mg.cur = i; this.miniSet('take'); S.up(2); this.fx.rays(c.x, c.y - 60, M.QUALITY[M.DB[c.k].q].c, 1, { r: 260 });
    const tier = c.q + 1, from = { x: c.x, y: c.y - 40 }, fly = tier === 4 ? 0.8 : 0.3; mg.cards.forEach((o, j) => { if (o.la > mg.t) o.la = mg.t + (j === i ? 0 : 0.1); });   // 还没掀开的帘子：选中的马上掀
    this.fx.kick(4 + tier * 2); this.fx.ring(c.x, c.y, 20, 200, QC(c.q), 6, 0.3);
    SHOW.later(mg, 0.1, () => SHOW.win(this, mg, tier, { x: c.x, y: c.y - 20, col: tier >= 3 ? C.gold : QC(c.q), label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : '' }));
    SHOW.later(mg, fly, () => { c.gone = mg.t; give(this, mg, [{ k: 'unit', type: c.k }], from); });
    endIn(this, mg, fly + [0.6, 0.9, 1.5, 2.3][tier - 1], M.DB[c.k].n + ' 跟上了你。', QC(c.q)); },
  down(mg, px, py) { mg.cards.forEach((c, i) => { if (Math.abs(px - c.x) < 130 && Math.abs(py - c.y) < 190) MINI.recruit.take.call(this, mg, i); }); },
  btns(mg) { if (mg.phase !== 'idle') return []; return mg.cards.map((c, i) => ({ t: '选 ' + M.DB[c.k].n, sub: (M.DB[c.k].voc || '') + ' · 战力 ' + M.unitPower(c.k), dis: !M.canAdd(this.run, c.k), why: '队伍满了', fn: () => MINI.recruit.take.call(this, mg, i) })).concat([{ t: '都不要', leave: 1, fn: () => this.miniFinish('旗子在风里响了一会儿。', '#8d8496') }]); },
  tick(mg) {
    mg.cards.forEach(c => { const k = mg.t - c.t0;
      if (k >= 0 && mg.t < c.la) { const s = Math.min(c.path.length - 1, Math.floor(k / (c.od / c.path.length))); if (s !== c.s) { if (c.s < 0) SHOW.omen(this, mg, c.path[s]); else SHOW.promote(this, mg, c.x, c.y - 40, c.path[s]); c.s = s; } }
      c.lift = cl((mg.t - c.la) / 0.28, 0, 1);
      if (mg.t >= c.la && !c.snd) { c.snd = 1; const last = c.path.length - 1; if (c.s >= 0 && c.s < last) SHOW.promote(this, mg, c.x, c.y - 40, c.path[last]); c.s = last; c.pop = mg.t;
        S.mini('recruit', 'curtain'); S.mini('recruit', 'reveal'); const col = QC(c.q); this.fx.burst(c.x, c.y - 180, col, 10 + 6 * c.q); this.fx.kick(2 + c.q * 2); if (c.q >= 3) this.fx.rays(c.x, c.y - 40, col, 0.8, { r: 200 + 40 * c.q }); } }); },
  draw(x, mg) {
    const t = mg.t; bgv(x, '#141a2a', '#06080e'); K.R(x, SX, FLOOR - 20, SW, 140, '#2a2018');
    mg.cards.forEach((c, i) => { const D = M.DB[c.k], Q = M.QUALITY[D.q], hov = mg.phase === 'idle' && Math.abs(mg.mx - c.x) < 130 && Math.abs(mg.my - c.y) < 190, sel = mg.phase === 'take' && mg.cur === i, dim = mg.phase === 'take' && mg.cur !== i;
      x.save(); if (dim) x.globalAlpha = 0.35; const slam = sel ? 30 * Math.max(0, 1 - mg.pt / 0.18) : 0, y = c.y - (hov || sel ? 16 : 0) + slam, pk = c.pop != null ? 1 + 0.08 * Math.exp(-(t - c.pop) * 8) : 1;
      x.translate(c.x, y); x.scale(pk, pk); x.translate(-c.x, -y);
      // 卡：品质色框 + 墨边 + 9px 硬投影；名字是品质色签；帘子酒红，杆子金色
      K.card(x, c.x - 130, y - 200, 260, 380, Q.c, hov || sel, C.abyss); K.GL(x, c.x, y + 20, 200, Q.c, 0.3 * c.lift);
      if (!c.gone) K.SP(x, c.k, c.x, y + 110, 210); else { x.save(); x.globalAlpha *= cl(1 - (t - c.gone) / 0.2, 0, 1); K.SP(x, c.k, c.x, y + 110, 210); x.restore(); }
      const tv = M.TAG.voc(D.voc); if (tv) K.IC(x, tv.icon, c.x + 100, y - 170, 44);
      K.chipC(x, D.n, c.x, y + 150, Q.c, T.body);
      // 帘子后面的人影在品质色里亮、帘子跟着抖，底边漏出一道光；掀的时候一下弹上去
      const cu = 1 - eo(c.lift); if (cu > 0) { const om = c.s >= 0 && mg.t < c.la + 0.28, oq = om ? c.path[c.s] : 0, ok = om ? cl((t - c.t0) / c.od, 0.2, 1) : 0; let jd = { dx: 0, dy: 0 };
        x.save(); if (om) { jd = SHOW.aura(x, c.x, y - 10, 150, oq, t, ok); x.translate(jd.dx, jd.dy); }
        const ch = Math.round(372 * cu); K.R(x, c.x - 126, y - 196, 252, ch, K.LG(x, c.x - 126, 0, c.x + 126, 0, [[0, C.umber], [0.5, C.wine], [1, C.umber]])); for (let k = 0; k < 6; k++) K.R(x, c.x - 120 + k * 42, y - 196, 4, ch, 'rgba(0,0,0,0.25)');
        if (om) { x.save(); x.globalAlpha *= 0.35 + 0.35 * ok; K.R(x, c.x - 126, y - 196 + ch - 8, 252, 8, QC(oq)); x.restore(); K.GL(x, c.x, y - 10, 110, QC(oq), 0.25 * ok); }
        U.box(x, c.x - 130, y - 206, 260, 14, C.gold); x.restore(); }
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
