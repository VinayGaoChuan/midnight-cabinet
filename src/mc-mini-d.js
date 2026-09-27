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
  judge(mg) { if (mg.phase !== 'soak') return; const h = mg.heat, [a, b] = mg.band, gy = spY(h), pool = SPOOL; this.miniSet('done'); SHOW.calm(mg); mg.lockH = h; mg.clampT = mg.t; S.mini('spring', 'clamp');
    if (h >= a && h <= b) { const d = Math.abs(h - (a + b) / 2) / ((b - a) / 2), tier = d < 0.3 ? 3 : d < 0.65 ? 2 : 1, col = '#6fd0ff'; mg.win = tier;
      // 铜指针夹住 → 卡帧 → 按档揭晓；心从蒸汽里飞向生命条
      SHOW.hitstop(mg, 0.15, SPG.x, gy, () => { S.mini('spring', 'good');
        // PERFECT：间歇泉就是揭晓本身——在领袖右边冲起一根水柱，光芒和冲击环从水柱顶上放出来，不再叠一层揭晓 / 大赢的全屏特效，免得把水柱盖住
        if (tier === 3) { mg.geyserT = mg.t; const gx = K.lx(196), gt = K.ly(36); S.mini('spring', 'geyser'); S.mini('_', 'win3'); SHOW.white(mg, 0.3); SHOW.shake(mg, 12); this.fx.kick(12); K.pxrFlash('mini_spring', 'all', 1.4); splash(this, mg, gx, pool.y, 30, 1);
          SHOW.later(mg, 0.25, () => { SHOW.rays(mg, gx, gt, C.teal, { n: 16, life: 1.8, r: 560, rainbow: 1 }); SHOW.ring(mg, gx, gt, 10, 320, C.white, { w: 2, life: 0.5 }); SHOW.ring(mg, gx, gt, 10, 420, C.teal, { life: 0.7, delay: 0.08 }); SHOW.burst(mg, gx, gt, 60, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [200, 620], life: [0.5, 1.1], g: 600 }); SHOW.stamp(mg, 'PERFECT', CX - 260, SY + 250, C.gold, 104, 2); S.mini('_', 'stamp'); SHOW.roll(mg, hpPct(this, 0.3), CX - 260, SY + 360, C.lime, 1.3); SHOW.ambient(mg, 2); }); }
        else if (tier === 2) { SHOW.reveal(this, mg, 1, { x: pool.x, y: pool.y, col: C.teal }); [1, 2, 3, 4].forEach(i => K.pxrFlash('mini_spring', i, 1.4)); splash(this, mg, pool.x, pool.y, 30, 1); }
        else { SHOW.ring(mg, SPG.x, gy, 8, 90, C.green, { life: 0.35 }); splash(this, mg, pool.x, pool.y, 18, 1); }
        if (tier < 3) SHOW.stamp(mg, tier === 2 ? 'GREAT' : 'GOOD', SPG.x - 170, gy, tier === 2 ? C.gold : C.lime, 48 + tier * 8, 1);
        if (tier < 3) SHOW.later(mg, 0.08, () => SHOW.win(this, mg, tier, { x: pool.x, y: pool.y - 20, v: hpPct(this, 0.3), col: C.teal }));
        SHOW.later(mg, 0.25, () => { healFly(this, mg, 0.3, { x: pool.x, y: pool.y - 90 }); mg.sighT = mg.t + 0.3; });
        this.miniSay('刚刚好', col, true); endIn(this, mg, [1.35, 1.6, 2.4][tier - 1], () => '刚刚好。回复 ' + mg.healV + ' 生命。', col); }); }
    else if (h > b) { const v = this.heroHurt(0.05), tx = '泡太久，晕了过去，醒来时头撞破了（-' + v + '）。'; mg.faintT = mg.t; S.mini('spring', 'hot'); SHOW.lose(this, mg); splash(this, mg, SPW.x, SPW.y, 14); this.miniSay(tx.split('。')[0], '#ff6a5a', true); endIn(this, mg, 0.6, tx, '#ff6a5a'); }
    else { const v = this.heroHeal(0.12), tx = '还没泡热就起来了。回复 ' + v + ' 生命。'; mg.coolT = mg.t; S.mini('spring', 'cool'); if (h > a - 0.08) SHOW.near(this, mg, SPG.x, spY(a), '差一点！'); else SHOW.lose(this, mg); SHOW.burst(mg, SPW.x, SPW.y - 60, 10, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [80, 200], life: [0.3, 0.5], g: 600 }); this.miniSay(tx.split('。')[0], '#9ccc6a', true); endIn(this, mg, 0.7, tx, '#9ccc6a'); } },
  btns(mg) { const full = !!(M.heroFull && M.heroFull(this)); if (mg.phase === 'idle') return [{ t: '领袖泡一泡', sub: full ? '领袖已满血' : '领袖回复生命，泡得正好回得最多', gold: full ? 0 : 1, dis: full ? 1 : 0, why: full ? '领袖已满血' : '', fn: () => this.miniSet('ready') },
    { t: '让部队泡', sub: '这一趟部队生命 +10%', fn: () => { this.buffRun('unitHp', 0.1, '部队生命 +10%', '#6fd0ff'); this.miniSet('troops'); mg.splashT = mg.t; splash(this, mg, SPOOL.x, SPOOL.y, 30, 1); S.mini('spring', 'plunge'); SHOW.later(mg, 0.3, () => { SHOW.win(this, mg, 1, { x: CX, y: FLOOR - 110, col: C.teal }); }); endIn(this, mg, 1.4, '部队泡得满脸通红。这一趟部队生命 +10%。', '#6fd0ff'); } },
    { t: '装一桶泉水', sub: full ? '领袖已满血' : '领袖回复 30% 生命', dis: full ? 1 : 0, why: full ? '领袖已满血' : '', fn: () => { this.miniSet('bucket'); mg.bucketT = mg.t; S.mini('spring', 'drop'); SHOW.later(mg, 0.3, () => { splash(this, mg, K.lx(60), SPOOL.y, 12); S.mini('spring', 'bubble'); }); SHOW.later(mg, 0.55, () => { if (this.mini !== mg) return; this.heroHeal(0.3); this.miniFinish('你装了一桶还在冒泡的泉水，领袖喝了一口。', '#6fd0ff'); }); } }];
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
const trapQC = [['linen', 10, [244, 239, 224]], ['water', 9, [79, 143, 255]], ['arcane', 9, [184, 107, 255]], ['fire', 9, [255, 154, 60]]];   // the show's four steps in stage materials (M.QUALITY 普通 / 稀有 / 史诗 / 传说)
const trapSlot = () => M.PXR && M.PXR.slots['_mg:mini_trap'];
const tileC = (r, c) => ({ x: TRX0 + c * TW + TW / 2, y: TRY0 + r * TH + TH / 2 });
MINI.trap = { title: '地雷阵', img: 'e_trap', col: C.amber, text: '对面有个箱子。地上的数字告诉你周围埋了几颗雷。一次走一格。',
  init(mg) { mg.mine = [...Array(TR)].map(() => Array(TC).fill(0)); let n = 0; while (n < 5) { const r = Math.floor(rnd() * TR), c = 1 + Math.floor(rnd() * (TC - 2)); if (!mg.mine[r][c]) { mg.mine[r][c] = 1; n++; } }
    mg.open = [...Array(TR)].map(() => Array(TC).fill(0)); mg.openT = [...Array(TR)].map(() => Array(TC).fill(-9)); mg.at = null; mg.hp = 0; mg.x0 = TRX0; mg.y0 = TRY0; mg.booms = [];
    mg.cnt = (r, c) => MINI.trap.cnt(mg, r, c); mg.adjOk = (r, c) => MINI.trap.adj(mg, r, c); mg.pos = { x: TRX0 - 64, y: K.ly(146) }; },
  cnt(mg, r, c) { let n = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < TR && cc >= 0 && cc < TC && mg.mine[rr][cc]) n++; } return n; },
  adj(mg, r, c) { if (!mg.at) return c === 0; return Math.abs(mg.at.r - r) + Math.abs(mg.at.c - c) === 1 || (Math.abs(mg.at.r - r) === 1 && Math.abs(mg.at.c - c) === 1); },
  hopTo(mg, x, y, dur, back) { mg.hop = { fx: mg.pos.x, fy: mg.pos.y, tx: x, ty: y, t0: mg.t, d: dur || 0.18, back }; mg.pos = { x, y }; },
  step(mg, r, c) { if (mg.phase !== 'idle') return; if (!MINI.trap.adj(mg, r, c)) { mg.nope = { r, c, t: mg.t }; S.mini('trap', 'nope'); return; }   // stepping back onto an opened slab is allowed, as before
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
  btns(mg) { if (mg.phase !== 'idle') return []; return [{ t: '绕路', sub: mg.at ? '已经走进来了' : '-20 这一趟的物资', leave: 1, dis: !!mg.at && false, fn: () => { const run = this.run; const v = Math.min(20, run.loot.supplies); this.hold('rsup', run.loot.supplies); run.loot.supplies -= v; this.release('rsup'); this.miniFinish('你绕了一大圈，丢了 ' + v + ' 物资。', '#8d8496'); } }]; },
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
    { t: '给猫鞠个躬', sub: '免费 · 这一趟事件好运 +5%', fn: () => { this.buffRun('eventLuck', 0.05, '好运 +5%', '#ffcc33'); this.miniSet('bow'); mg.bowT = mg.t; S.mini('cat', 'bell'); const s = catSlot(); if (s) { s.flash(0, 1.2); s.burst('glint', 150, 60, 14, { sp: 24, life: 0.8, w: 40, h: 30 }); } SHOW.later(mg, 0.75, () => { if (this.mini === mg) this.miniFinish('猫眯起了眼睛。你觉得运气好了一点。', '#ffcc33'); }); } },
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
// 像素舞台（mc-pxroom-mini-d.js 的 mini_market）：雨夜桥洞，鬼火灯下的摊子，斗篷人（像素角色 BlackMarketDealer）站在桌后。
// 拍板：画面下方伸出一只手拍下铜铃，桌上的东西全跳一下，骨针颤两下停住，价格那一刻就定了；好价：慢镜头、聚光罩住秤盘、
// 价签一格格往下翻，斗篷人一拍比一拍往后缩；贵价：他金牙一亮咧嘴笑，一拍带过；再砍一次他更不耐烦。
// 成交：他把卷轴拍在桌上，卷轴逐拍加码（在品质色里抖、火漆透光）→ 卡帧 → 火漆炸开、卷轴展开、冲击波把雨推开 → 图纸逐项砸出；然后他化进黑暗，只剩两只眼
const MKD = { x: K.lx(206), y: K.ly(104) }, MKP = { x: K.lx(90), y: K.ly(113) }, MKDEAL = 'BlackMarketDealer';
const mkSlot = () => M.PXR && M.PXR.slots['_mg:mini_market'];
MINI.market = { title: '黑市', img: 'e_market', col: C.violet, text: '斗篷底下的人亮出一张高级图纸。「价钱？看你手快不快。」',
  init(mg) { mg.base = M.nice(mg.P * 14); mg.needle = 0; mg.price = 0; mg.tries = 0; mg.react = { k: 'idle', t: 0 }; },
  stop(mg) { if (mg.phase !== 'swing') return; const k = 0.4 + mg.needle * 1.4; mg.mul = k; mg.price = M.nice(mg.base * k); this.miniSet('offer'); S.mini('market', 'stamp'); S.mini('market', 'bell'); this.fx.kick(5);
    const g = k < 0.6 ? 3 : k < 0.9 ? 2 : k < 1.2 ? 1 : 0, a = Math.PI + mg.needle * Math.PI; mg.grab = g; mg.stopN = mg.needle; mg.rollD = g >= 2 ? 0.5 : 0.25; mg.stamped = 0; mg.rs = -1;
    mg.slapT = mg.t; SHOW.shake(mg, 6); K.pxrFlash('mini_market', 2, 1.4); SHOW.burst(mg, K.lx(152), K.ly(118), 10, { ramp: [C.white, C.butter, C.gold, C.amber], sp: [80, 220], life: [0.2, 0.4], ang: -Math.PI / 2, spread: 2.4 });
    SHOW.burst(mg, MKD.x + Math.cos(a) * 100, MKD.y + Math.sin(a) * 100, 6 + g * 4, { col: g ? C.lime : C.red, sp: [100, 300], life: [0.2, 0.45] });
    mg.react = { k: g >= 2 ? 'recoil' : g ? 'idle' : 'laugh', t: mg.t };
    if (g >= 2) { SHOW.slowmo(mg, g >= 3 ? 0.3 : 0.5, 0.45); SHOW.reach(this, mg, { x: MKD.x, y: MKD.y, r: 170, col: C.lime, label: '' }); }
    else if (!g) { mg.stamped = 1; S.mini('market', 'cackle'); SHOW.state(mg).gray = 0.8; SHOW.stamp(mg, 'MISS', MKD.x, MKD.y - 170, C.steel, 44, 0.6); } },
  deal(mg) { const b = fixBp(this, K.bp(null, 2)), q = cl(gq(b), 0, 3), g = mg.grab || 0, tier = Math.max(1, Math.min(4, g + (q >= 3 ? 1 : 0)));
    this.miniSet('deal'); mg.react = { k: 'present', t: mg.t }; SHOW.calm(mg);
    // 他把卷轴拍在桌上（出手那一帧卷轴才出现），然后逐拍加码
    SHOW.later(mg, 0.25, () => { mg.bq = { sk: 0, qc: trapQC[0] }; S.mini('market', 'slapScroll'); SHOW.shake(mg, 3); });
    const T = SHOW.charge(this, mg, { x: MKP.x, y: MKP.y, q, t0: 0.7, onBeat: (i, tq) => { if (!mg.bq) return; mg.bq.sk = 1 + i * 0.5; mg.bq.qc = trapQC[tq]; K.pxrFlash('mini_market', 3, 0.6 + i * 0.3); },
      onReveal: () => { mg.bq.open = mg.t; mg.bq.sk = 0; mg.bq.qc = trapQC[q]; mg.clearT = mg.t; S.mini('market', 'seal'); K.pxrFlash('mini_market', 'all', 0.8); if (g >= 3 && q >= 2) mg.hoodT = mg.t;
        SHOW.later(mg, 0.1, () => SHOW.win(this, mg, tier, { x: MKP.x + 60, y: MKP.y, col: tier >= 3 ? C.gold : QC(q), label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : '' }));
        SHOW.later(mg, tier === 4 ? 0.7 : 0.25, () => { const got = give(this, mg, [b], MKP); SHOW.items(this, mg, got.map(t2 => ({ text: t2, col: C.gold, size: 36 })), { x: CX, y: SY + 420 }); });
        SHOW.later(mg, 1.1, () => { mg.react = { k: 'leave', t: mg.t }; S.mini('market', 'fade'); }); } });
    endIn(this, mg, T + TIER_END[tier - 1] + 0.3, '你用 ' + mg.price + ' 积分买下了图纸（原价 ' + mg.base + '）。', '#9a8aff'); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'swing') { MINI.market.stop.call(this, mg); return true; } },
  down(mg, px, py) { if (mg.phase === 'swing') MINI.market.stop.call(this, mg); else SHOW.tap(this, mg, px, py); },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '开始砍价', sub: '指针越靠左越便宜', gold: 1, fn: () => { mg.tries++; this.miniSet('swing'); S.mini('market', 'swing'); } }, { t: '卖掉一名部队', sub: '按 1.5 倍价格收', dis: !this.run.roster.length, why: '你没有部队', fn: () => { const run = this.run, u = run.roster.slice().sort((a, b) => M.sellValue(run, b) - M.sellValue(run, a))[0], v = M.nice(M.sellValue(run, u) * 1.5); run.roster = run.roster.filter(o => o !== u); mg.sellT = mg.t; mg.sellK = u.type; this.miniSet('sell'); S.mini('market', 'chain'); SHOW.later(mg, 0.75, () => { S.mini('market', 'coinbag'); SHOW.shake(mg, 3); }); SHOW.later(mg, 0.9, () => { if (this.mini === mg) this.miniFinish('斗篷人牵走了 ' + M.DB[u.type].n + '，丢给你一袋钱。', '#9a8aff', [{ k: 'wallet', v }]); }); } }, { t: '离开', leave: 1, fn: () => this.miniFinish('斗篷人缩回了阴影里。', '#8d8496') }];
    if (mg.phase === 'swing') return [{ t: '拍板！', sub: '空格 / 点击', gold: 1, fn: () => MINI.market.stop.call(this, mg) }];
    if (mg.phase === 'offer') return [{ t: '成交', sub: mg.price + ' 积分', gold: 1, dis: this.run.wallet < mg.price, why: '积分不够', fn: () => { if (!this.miniPay(mg.price)) return; S.mini('market', 'deal'); MINI.market.deal.call(this, mg); } }, { t: '再砍一次', sub: '他会更不耐烦', dis: mg.tries >= 2, why: '他不跟你砍了', fn: () => { mg.tries++; SHOW.calm(mg); mg.react = { k: 'impatient', t: mg.t }; S.mini('market', 'tap'); this.miniSet('swing'); } }, { t: '算了', leave: 1, fn: () => this.miniFinish('你把图纸推了回去。', '#8d8496') }]; return []; },
  tick(mg) { if (mg.phase === 'swing') { const sp = 1.3 + mg.tries * 0.6, q = (mg.pt * sp) % 2; mg.needle = q < 1 ? q : 2 - q; const sk = Math.floor(mg.pt * sp * 3); if (sk !== mg.sk) { mg.sk = sk; S.mini('market', 'swing'); } }
    if (mg.phase === 'offer' && !mg.stamped) { const p = cl(mg.pt / mg.rollD, 0, 1), s = Math.floor(p * 6), g = mg.grab; if (g >= 2 && s !== mg.rs && p < 1) { mg.rs = s; SHOW.crawl(this, mg, s); SHOW.beat(this, mg, MKD.x, MKD.y + 150, s, g - 1, false); }
      if (p >= 1) { mg.stamped = 1; SHOW.calm(mg); SHOW.stamp(mg, ['GOOD', 'GREAT', 'PERFECT'][g - 1], MKD.x, MKD.y - 170, g >= 3 ? C.gold : C.lime, 52 + g * 10, 1.2); S.mini('market', 'grab', g); this.fx.kick(3 + g * 3); SHOW.ring(mg, MKD.x, MKD.y + 150, 10, 120 + g * 40, C.lime, { life: 0.35 }); if (g >= 3) { SHOW.white(mg, 0.4); SHOW.rays(mg, MKD.x, MKD.y + 150, C.gold, { r: 320, life: 1 }); } } } },
  draw(x, mg) {
    const t = mg.t, off = mg.phase === 'offer' ? mg.stopN + 0.04 * Math.sin(mg.pt * 38) * Math.exp(-mg.pt * 7) : mg.phase === 'deal' ? mg.stopN : mg.needle;
    mg.dialN = cl(off, 0, 1);
    if (!K.pxr(x, 'mini_market', 0, 0, t, { mg, t })) bgv(x, '#141228', '#06050c');
    // 斗篷人：站在桌后（腰以下被桌子挡住），朝左看着桌上的卷轴；反应跟着砍价走
    const R = mg.react || { k: 'idle', t: 0 }, rt = t - R.t, f = (n) => Math.floor(rt * 12) % n; let st = 'idle', fi = Math.floor(t * 12) % (mg.tries > 0 ? 48 : 24), tint = null;
    if (R.k === 'recoil') { st = 'hurt'; fi = rt < 0.5 ? 5 + Math.min(1, Math.floor(rt * 12) - 0) : 6; if (rt > 1.2) { st = 'idle'; fi = Math.floor(t * 12) % 24; } }
    else if (R.k === 'laugh') { if (rt < 0.5) { st = 'cast'; fi = f(6); } else if (rt < 1.2) { st = 'recover'; fi = Math.min(8, Math.floor((rt - 0.5) * 12)); } }
    else if (R.k === 'impatient') { st = 'idle'; fi = 36 + f(10); if (rt > 1.6) fi = Math.floor(t * 12) % 48; }
    else if (R.k === 'present') { st = 'attack'; fi = Math.min(8, Math.floor(rt * 12)); if (rt > 0.75) { st = 'idle'; fi = Math.floor(t * 12) % 24; } }
    else if (R.k === 'leave') { st = 'death'; fi = Math.min(34, 7 + Math.floor(rt * 12)); }
    const hoodPop = mg.hoodT != null && t - mg.hoodT < 0.25 ? -4 : 0;
    // 桌上的鬼火灯从下往上照着他，把他的影子放大一倍投在身后被照亮的砖墙上：人还是战斗角色那么大，影子让他压得住整个摊子
    const P = M.PCDG, sc = P && P.has(MKDEAL) ? P.bodyFrame(MKDEAL, st, fi, '#07060f', 4) : null;
    if (sc && (R.k !== 'leave' || rt < 1.4)) { x.save(); x.beginPath(); x.rect(K.lx(80), K.ly(58), K.lx(192) - K.lx(80), K.ly(120) - K.ly(58)); x.clip(); x.globalAlpha = 0.72 * (0.9 + 0.1 * Math.sin(t * 7)); x.imageSmoothingEnabled = false; x.translate(K.lx(140), K.ly(120) + hoodPop * 2); x.scale(-2, 2); x.drawImage(sc, -sc.cx, -sc.footY, sc.width, sc.height); x.restore(); }
    if (!M.PXR.MINI_D.cast(x, MKDEAL, K.lx(132), K.ly(124) + hoodPop, st, fi, true, tint, K.ly(121))) K.SP(x, 'stall', CX + 300, FLOOR - 40, 180);
    // 卖部队：一条锁链从左边暗处把部队拖走，一袋钱落在桌上
    if (mg.phase === 'sell') { const q = cl((t - mg.sellT) / 0.7, 0, 1), ux = K.lx(170) - eo(q) * 900; if (!M.PXR.MINI_D.cast(x, mg.sellK, ux, K.ly(147), 'hurt', 6, false)) K.SP(x, mg.sellK, ux, FLOOR, 120); for (let k = 0; k < 30; k++) K.R(x, K.snap(SX + k * 8), K.ly(128) + ((k & 1) ? 0 : 4), 8, 4, k % 2 ? C.steel : C.slate); }
    // 价签：挂在秤盘下，数字像翻页数字一样一格格往下翻
    if (mg.phase === 'offer' || mg.phase === 'deal') { const top = M.nice(mg.base * 1.8), p = mg.phase === 'offer' && !mg.stamped ? cl(mg.pt / mg.rollD, 0, 1) : 1, shown = p < 1 ? Math.round(top - (top - mg.price) * eo(p)) : mg.price;
      K.R(x, MKD.x - 96, MKD.y + 124, 192, 64, C.cream); K.R(x, MKD.x - 96, MKD.y + 124, 192, 4, C.white); K.R(x, MKD.x - 96, MKD.y + 184, 192, 4, C.tan); K.R(x, MKD.x - 4, MKD.y + 104, 8, 20, C.brown);
      K.big(x, shown + ' 积分', MKD.x, MKD.y + 156, T.num, mg.mul < 0.8 ? C.greenDeep : mg.mul < 1.3 ? C.amber : C.red, mg.phase === 'offer' ? mg.pt : 9); U.text(x, '原价 ' + mg.base, MKD.x, MKD.y + 212, T.cap, C.lavender); }
  } };

// ═════════════════════ 特训 · mash to train a soldier ═════════════════════
// 像素舞台（mc-pxroom-mini-d.js 的 mini_gym）：地下拳馆，教练（像素角色 PitCoach）站在拳台角柱边。
// 交钱：倒数 3-2-1（教练竖手指）→「铛」开打（教练吹哨）；每一拳：领袖出手、沙袋压扁晃起来、冲击星、吊灯晃一下、计数板多划一道，
// 连击往上爬，教练挥拳喊「上！」；狂热：沙袋裂口漏沙、教练把毛巾甩上天；最后一秒吊灯红闪。时间到：铃响两声 → 领袖自动蓄一记
// 终结拳（慢动作、聚光）→ 卡帧 → 按已算好的评级打出去：S 铁链崩断、沙袋飞出去撞墙；A 沙袋荡到横着；B 重拳大幅荡回；C 软绵绵一下
const GYB = { x: K.lx(186), y: K.ly(118) }, GYH = { x: K.lx(170), y: K.ly(148) }, GYC = { x: K.lx(262), y: K.ly(148) }, COACH = 'PitCoach';
MINI.trainer = { title: '地下拳馆', img: 'e_trainer', col: C.amber, text: '教练叼着烟：「交钱，上来打沙袋。打得越狠，练得越壮。」',
  // the leader steps in itself (user ruling 2026-09-25): no picking a unit, the gain is the leader's
  init(mg) { mg.hits = 0; mg.bag = 0; mg.bagK = 0.4; mg.bagAng = 0; mg.bagV = 0; mg.lampSw = 0; mg.coach = { k: 'idle', t: 0 }; },
  punch(mg) { if (mg.phase !== 'mash') return; mg.hits++; mg.bag = 1; mg.bagK = Math.min(1.2, 0.4 + mg.hits / 30); mg.bagV += 0.45 + mg.bagK * 0.45; mg.lampSw = Math.min(0.5, mg.lampSw + 0.06); mg.punchT = mg.t;
    S.mini('trainer', 'punch', mg.hits); this.fx.kick(2 + Math.min(8, mg.hits / 4)); SHOW.shake(mg, 2 + Math.min(6, mg.hits / 5));
    SHOW.burst(mg, GYB.x - 30, GYB.y, 6 + Math.min(10, mg.hits >> 2), { ramp: [C.white, C.butter, C.gold, C.amber], sp: [160, 360 + Math.min(300, mg.hits * 10)], life: [0.15, 0.35], ang: Math.PI / 2 + 0.3, spread: 1.4 });
    if (mg.hits % 6 === 0) mg.coach = { k: 'shout', t: mg.t };
    const n = hitCombo(this, mg, GYB.x + (rnd() - 0.5) * 120, SY + 190, false); if (n % 10 === 0) { SHOW.ring(mg, GYB.x, GYB.y, 10, 150, C.gold, { life: 0.3 }); SHOW.flash(mg, C.gold, 0.12); }
    if (n === 5) { mg.coach = { k: 'fever', t: mg.t }; S.mini('trainer', 'whistle'); } },
  down(mg, px, py) { if (mg.phase === 'mash') MINI.trainer.punch.call(this, mg); else SHOW.tap(this, mg, px, py); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'mash') { MINI.trainer.punch.call(this, mg); return true; } },
  btns(mg) { if (mg.phase === 'idle') return [{ t: '领袖上场', sub: mg.pay + ' 积分 · 4 秒疯狂出拳', gold: 1, dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => { if (!this.miniPay(mg.pay)) return; this.miniSet('count'); mg.coach = { k: 'count', t: mg.t }; } }, { t: '离开', leave: 1, fn: () => this.miniFinish('教练把烟头弹进了沙袋里。', '#8d8496') }];
    if (mg.phase === 'mash') return [{ t: '出拳！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.trainer.punch.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.bag = Math.max(0, mg.bag - dt * 6); mg.lampSw = Math.max(0, mg.lampSw - dt * 0.25);
    // the bag's swing: a damped pendulum kicked by every punch (the harder the combo, the higher it goes)
    if (mg.flyT == null) { mg.bagV += -mg.bagAng * 26 * dt; mg.bagV *= Math.exp(-dt * 2.4); mg.bagAng = cl(mg.bagAng + mg.bagV * dt, -0.4, mg.phase === 'end' ? 1.3 : 0.55); }
    if (mg.phase === 'count') { const n = Math.floor(mg.pt * 2); if (n !== mg.cn && n < 3) { mg.cn = n; SHOW.crawl(this, mg, n); SHOW.shake(mg, 3); } if (mg.pt > 1.5) { this.miniSet('mash'); mg.bellT = mg.t; mg.coach = { k: 'whistle', t: mg.t }; S.mini('trainer', 'bell'); SHOW.white(mg, 0.3); SHOW.shake(mg, 6); K.pxrFlash('mini_gym', 1, 1); } }
    if (mg.phase === 'mash' && mg.pt > 3 && mg.pt <= 4) { const q = Math.floor((mg.pt - 3) / 0.25); if (q !== mg.cq) { mg.cq = q; SHOW.crawl(this, mg, 2 + q); } }
    if (mg.phase === 'mash' && mg.pt > 4 && !mg.fin) { mg.fin = true; const run = this.run, h = run.hero, k = Math.min(0.3, mg.hits * 0.009), mx = M.heroMaxHp(h, run.M), heal = Math.round(mx * k);
      run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + k; this.hold && this.hold('hp', Math.round(h.hp)); h.hp = Math.min(mx, h.hp + heal); S.mini('trainer', 'done'); this.miniSet('end'); mg.bellT = mg.t; S.mini('trainer', 'bell');
      const gr = mg.hits >= 34 ? 'S' : mg.hits >= 24 ? 'A' : mg.hits >= 14 ? 'B' : 'C', from = { x: GYH.x, y: GYH.y - 130 };
      // 终结拳：蓄力（慢动作、聚光）→ 卡帧 → 按评级打出去
      mg.windT = mg.t; SHOW.reach(this, mg, { x: GYB.x - 40, y: GYB.y, r: 150, col: gr === 'S' ? C.red : C.gold, lv: gr === 'S' ? 2 : 1, label: '' }); S.mini('trainer', 'windup'); SHOW.slowmo(mg, 0.5, 0.5);
      SHOW.later(mg, 0.55, () => SHOW.hitstop(mg, 0.15, GYB.x - 30, GYB.y, () => { mg.finT = mg.t; mg.punchT = mg.t; SHOW.calm(mg); S.mini('trainer', 'finisher', gr === 'S' ? 3 : gr === 'A' ? 2 : 1); mg.bag = 1;
        if (gr === 'S') { mg.flyT = mg.t; mg.bagV = 0; SHOW.reveal(this, mg, 3, { x: GYB.x, y: GYB.y, col: C.gold }); S.mini('trainer', 'snap'); }
        else if (gr === 'A') { mg.bagV = 9; SHOW.reveal(this, mg, 2, { x: GYB.x, y: GYB.y, col: C.gold }); }
        else if (gr === 'B') { mg.bagV = 5; SHOW.ring(mg, GYB.x, GYB.y, 10, 160, C.amber, { life: 0.35 }); SHOW.shake(mg, 8); }
        else { mg.bagV = 0.8; }
        mg.coach = { k: gr === 'S' || gr === 'A' ? 'thumbs' : gr === 'C' ? 'facepalm' : 'idle', t: mg.t };
        const tier = SHOW.grade(this, mg, gr, CX, SY + 280);
        if (tier) SHOW.later(mg, 0.3, () => SHOW.win(this, mg, tier, { x: from.x, y: from.y, v: Math.round(k * 100), col: C.amber, label: tier === 3 ? '大赢' : '' }));
        SHOW.later(mg, tier ? 0.4 : 0.1, () => hearts(this, from, C.lime, () => { if (this.held && this.held.hp != null) this.release('hp'); }));
        endIn(this, mg, tier ? 0.4 + TIER_END[tier - 1] + 0.1 : 0.6, mg.hits + ' 拳！领袖这一趟攻击 +' + Math.round(k * 100) + '%，回复 ' + heal + ' 生命。', '#ff8a3a'); })); } },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever;
    if (!K.pxr(x, 'mini_gym', 0, 0, t, { mg, t })) bgv(x, '#2a1a10', '#0c0806');
    // 教练：按节奏换动作（倒数竖手指、吹哨、挥拳喊、甩毛巾、竖拇指 / 捂脸）
    const C0 = mg.coach || { k: 'idle', t: 0 }, ct = t - C0.t, f12 = Math.floor(ct * 12); let cs = 'idle', cf = Math.floor(t * 12) % 36;
    if (C0.k === 'count') { cs = 'charge'; cf = Math.min(16, Math.floor(ct / 1.5 * 16)); }
    else if (C0.k === 'whistle' && ct < 0.5) { cs = 'cast'; cf = Math.min(5, f12); }
    else if (C0.k === 'shout' && ct < 0.75) { cs = 'attack'; cf = Math.min(8, f12); }
    else if (C0.k === 'fever' && ct < 1.2) { if (ct < 0.5) { cs = 'cast'; cf = Math.min(5, f12); } else { cs = 'recover'; cf = Math.min(8, Math.floor((ct - 0.5) * 12)); } }
    else if (C0.k === 'thumbs') { cs = 'recover'; cf = Math.min(8, f12); }
    else if (C0.k === 'facepalm') { cs = 'hurt'; cf = ct < 0.2 ? 5 : 5; }
    else if (mg.phase === 'mash') { cs = 'attack'; cf = Math.floor(t * 12) % 9; }
    if (!M.PXR.MINI_D.cast(x, COACH, GYC.x, GYC.y, cs, cf, true)) { /* no coach module: the stage still works */ }
    // 领袖：蓄力帧和出手帧快速交替（一阵拳雨）；终结拳先慢慢后拉再打出去
    const hk = catHero(this), b = hk && M.PCDG.body(hk), sf = b ? Math.max(1, Math.round(b.strike * 12)) : 2, pt = mg.punchT != null ? t - mg.punchT : 9, wind = mg.windT != null && mg.finT == null;
    let hs = 'idle', hf = Math.floor(t * 12) % 24; if (mg.phase === 'mash' || mg.phase === 'end') { hs = 'attack'; hf = pt < 0.07 ? sf : pt < 0.2 ? sf + 1 : Math.max(0, sf - 1); } if (wind) { hs = 'attack'; hf = 0; } if (mg.finT != null && t - mg.finT < 0.4) { hs = 'attack'; hf = sf + Math.min(3, Math.floor((t - mg.finT) * 12)); }
    const lean = mg.bag > 0.5 ? 8 : 0, glow = wind && Math.floor(t * 16) % 2;
    if (hk) M.PXR.MINI_D.cast(x, hk, GYH.x + lean - (wind ? 8 : 0), GYH.y, hs, hf, false, glow ? '#ffffff' : null); else K.SP(x, heroSp(this), CX - 80 + mg.bag * 30, FLOOR, 200);
    if (fev) { x.save(); x.globalAlpha = 0.35 + 0.2 * Math.sin(t * 16); K.R(x, K.snap(GYH.x - 60), K.snap(GYH.y + 4), 120, 8, C.gold); x.restore(); }
    // 倒数：数字弹簧砸下；拳数压在粉笔计数板上；时间条在拳数下面
    if (mg.phase === 'count') K.big(x, String(Math.max(1, 3 - Math.floor(mg.pt * 2))), CX, SY + 250, 120, C.gold, mg.pt % 0.5, { num: true });
    if (mg.phase === 'mash' || mg.phase === 'end') { K.big(x, mg.hits + ' 拳', K.lx(46), K.ly(58), T.hero, C.gold, mg.bag > 0 ? (1 - mg.bag) / 6 : 9); U.bar(x, K.lx(16), K.ly(90), 240, 14, cl(1 - mg.pt / 4, 0, 1), { col: mg.phase === 'mash' && mg.pt > 3 && Math.sin(t * 18) > 0 ? C.red : C.amber }); K.R(x, K.lx(16) + 240 * 26 / 40, K.ly(88), 4, 22, C.white); }
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
    endIn(this, mg, T + 2.4, '石像睁开了眼睛，向你的部队点了点头。这一趟部队攻击、生命各 +10%。', '#8fe0ff'); },
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
// 像素舞台（mc-pxroom-mini-d.js 的 mini_arena）：看台坐满像素观众，两边铁栅门，包厢、红旗、火把、铜锣、一排火盆（加油表）。
// 两头怪物是游戏里真的像素角色：押注前关在栅门后面走动；押注：钱袋落在沙地上、锣响、栅门升起、它们冲进场（跑步动作）；
// 对打时播它们自己的攻击、受击动作；加油：你那边的观众跳起来挥金旗、火盆一个个点亮；决定胜负的一击：慢动作、聚光、全场观众
// 定格、攻击的那头慢慢扑上去 → 命中：KO 章、锣、挨打的那头播死亡动作；押中：看台往场子里扔金币，赢的那头跳；押错：一片嘘声、灰一下
const ARG = [K.lx(29), K.lx(271)], ARF = K.ly(150);
MINI.arena = { title: '斗兽场', img: 'e_arena', col: C.red, text: '两头怪物被推进场子。押一边，然后给它加油——喊得越响它打得越狠。',
  init(mg) { const a = M.pickUnitQ(this.run); let b = M.pickUnitQ(this.run); for (let i = 0; i < 8 && b === a; i++) b = M.pickUnitQ(this.run); mg.b = [a, b].map((k, i) => ({ k, hp: 1, x: ARG[i], hit: 0, pw: 0.8 + rnd() * 0.4, atkT: -9 })); mg.cheer = 0; mg.anT = 0; },
  bet(mg, i) { if (!this.miniPay(mg.pay)) return; mg.side = i; this.miniSet('fight'); S.mini('arena', 'bet'); S.mini('arena', 'open'); mg.gateT = mg.t + 0.35; mg.gongT = mg.t + 0.2; mg.bagT = mg.t; SHOW.later(mg, 0.2, () => { S.mini('arena', 'gong'); SHOW.shake(mg, 5); }); SHOW.later(mg, 0.35, () => S.mini('arena', 'gate')); },
  down(mg, px, py) { if (mg.phase === 'fight' && !mg.ko) { mg.cheer = Math.min(1, mg.cheer + 0.12); S.mini('arena', 'cheer'); hitCombo(this, mg, CX + (rnd() - 0.5) * 200, SY + 175, false); const sx = mg.side ? K.lx(220) : K.lx(80); SHOW.burst(mg, sx + (rnd() - 0.5) * 300, K.ly(40), 8, { rainbow: 1, sp: [60, 200], life: [0.5, 0.9], g: 200, ang: -Math.PI / 2, spread: 1.6 }); } else SHOW.tap(this, mg, px, py); },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'fight') { MINI.arena.down.call(this, mg, CX, SY + 300); return true; } },
  btns(mg) { if (mg.phase === 'idle') return mg.b.map((b, i) => ({ t: '押' + ['左边', '右边'][i] + '的 ' + M.DB[b.k].n, sub: mg.pay + ' 积分 · 赢了 ×2.2', dis: this.run.wallet < mg.pay, why: '积分不够', fn: () => MINI.arena.bet.call(this, mg, i) })).concat([{ t: '离开', leave: 1, fn: () => this.miniFinish('人群的吼声在你背后炸开。', '#8d8496') }]); if (mg.phase === 'fight' && !mg.ko) return [{ t: '加油！', sub: '连点 / 连按空格', gold: 1, fn: () => MINI.arena.down.call(this, mg, CX, SY + 300) }]; return []; },
  // 这一击已经定了会打死对面：先慢下来、聚光、全场定格，攻击的那头慢慢扑上去，落下去再判
  ko(mg, who, dmg) { const tgt = mg.b[1 - who], win = who === mg.side; mg.ko = { who, t: 0 }; mg.b[who].atkT = mg.anT; SHOW.slowmo(mg, 0.3, 0.7); SHOW.reach(this, mg, { x: tgt.x, y: FLOOR - 100, r: 170, col: win ? C.gold : C.red, label: '' }); S.mini('arena', 'roar'); S.mini('arena', 'hush');
    SHOW.later(mg, 0.55, () => SHOW.hitstop(mg, 0.12, tgt.x, FLOOR - 100, () => { tgt.hp -= dmg; tgt.hit = 1; tgt.dieT = mg.anT; mg.gongT = mg.t; S.mini('arena', 'hit'); S.mini('arena', 'ko'); S.mini('arena', 'gong'); this.fx.kick(18); SHOW.shake(mg, 16); SHOW.white(mg, 0.6);
      SHOW.burst(mg, tgt.x, FLOOR - 90, 40, { ramp: [C.white, C.butter, C.orange, C.red], sp: [150, 520], life: [0.3, 0.7], g: 300 }); SHOW.shock(mg, tgt.x, FLOOR - 40, C.gold, { r: 260 }); SHOW.stamp(mg, 'KO', tgt.x, FLOOR - 320, C.red, 130, 1.2);
      const s = M.PXR && M.PXR.slots['_mg:mini_arena']; if (s) s.burst('dust', K.ax(tgt.x), 146, 30, { sp: 30, spread: 3, ang: 0, life: 1.4, w: 20 }); MINI.arena.result.call(this, mg); })); },
  result(mg) { mg.fin = true; const dead = mg.b.findIndex(b => b.hp <= 0), W = mg.b[1 - dead], win = 1 - dead === mg.side; S.mini('arena', win ? 'win' : 'lose'); mg.winner = 1 - dead;
    if (win) { const v = M.nice(mg.pay * 2.2), tier = W.hp < 0.3 ? 3 : 2, from = { x: W.x, y: FLOOR - 140 };
      // 看台往场子里扔金币：从你那边的看台划弧线落到赢家脚边
      mg.toss = []; for (let i = 0; i < 14; i++) { const sx = (mg.side ? 170 : 20) + rnd() * 110; mg.toss.push({ x: sx, y: 32 + rnd() * 20, vx: (K.ax(W.x) - sx) / 1.1 + (rnd() - 0.5) * 30, vy: 90 + rnd() * 40, fy: 140 + rnd() * 12, t: mg.t + 0.2 + i * 0.05 }); }
      SHOW.later(mg, 0.3, () => S.mini('arena', 'toss'));
      SHOW.later(mg, 0.1, () => SHOW.win(this, mg, tier, { x: W.x, y: FLOOR - 120, v, col: C.gold, label: tier === 3 ? '大赢' : '' })); SHOW.later(mg, 1.1, () => give(this, mg, [{ k: 'wallet', v }], from)); endIn(this, mg, 1.1 + TIER_END[tier - 1], M.DB[W.k].n + ' 赢了！你押对了。', '#ffcc33'); }
    else { SHOW.lose(this, mg); S.mini('arena', 'boo'); endIn(this, mg, 0.4, M.DB[W.k].n + ' 赢了。你押的那头倒下了。', '#8d8496'); } },
  tick(mg, dt) {
    mg.anT += dt; mg.cheer = Math.max(0, mg.cheer - dt * 0.35); mg.b.forEach(b => b.hit = Math.max(0, b.hit - dt * 4)); if (mg.ko) mg.ko.t += dt;
    if (mg.phase !== 'fight' || mg.ko) return; if (mg.cheer < 0.15 && mg.sh && mg.sh.combo) SHOW.comboBreak(mg); if (mg.gateT != null && mg.t < mg.gateT + 0.3) return;
    const [A, B] = mg.b; const gap = 120; A.walk = A.x < CX - gap / 2 - 1; B.walk = B.x > CX + gap / 2 + 1; A.x = Math.min(A.x + 200 * dt, CX - gap / 2); B.x = Math.max(B.x - 200 * dt, CX + gap / 2);
    if (A.x >= CX - gap / 2 - 1) { mg.cd = (mg.cd || 0) - dt; if (mg.cd <= 0) { mg.cd = 0.45; const who = rnd() < 0.5 ? 0 : 1, boost = who === mg.side ? mg.cheer : 0, dmg = (0.06 + rnd() * 0.06) * mg.b[who].pw * (who === mg.side ? 1 + mg.cheer * 0.9 : 1); const tgt = mg.b[1 - who];
      if (tgt.hp - dmg <= 0) { MINI.arena.ko.call(this, mg, who, dmg); return; }
      mg.b[who].atkT = mg.anT; SHOW.later(mg, 0.12, () => { tgt.hp -= dmg; tgt.hit = 1; S.mini('arena', 'hit'); this.fx.kick(5 + boost * 4); SHOW.shake(mg, 3 + boost * 4); SHOW.burst(mg, tgt.x, FLOOR - 90, 8 + Math.round(boost * 12), { ramp: [C.white, C.butter, C.orange, C.red], sp: [150, 400 + boost * 300], life: [0.2, 0.4], ang: who ? -Math.PI / 2 - 0.9 : Math.PI / 2 - 0.6, spread: 1.2 }); if (boost > 0.6) SHOW.ring(mg, tgt.x, FLOOR - 90, 10, 110, C.gold, { life: 0.25 }); if (tgt === mg.b[mg.side]) S.mini('arena', 'ooh'); }); } }
  },
  draw(x, mg) {
    const t = mg.t, fev = mg.sh && mg.sh.fever;
    if (!K.pxr(x, 'mini_arena', 0, 0, t, { mg, t })) bgv(x, '#2a1a10', '#0a0604');
    // 两头怪物：押注前在栅门后面走动（栅栏压在它们身上），押注后冲进场、对打、倒下、赢家跳
    mg.b.forEach((b, i) => { const at = mg.anT - b.atkT, flip = i === 1; let st = 'idle', fi = Math.floor(mg.anT * 12 + i * 7) % 24, x0 = b.x, hop = 0;
      if (mg.phase === 'idle') { x0 = ARG[i] + Math.round(Math.sin(t * 0.8 + i * 2) * 8) * 4; st = 'move'; fi = Math.floor(t * 12) % 8; }
      else if (b.dieT != null) { st = 'death'; fi = Math.min(34, Math.floor((mg.anT - b.dieT) * 12) + 3); }
      else if (at < 0.75) { st = 'attack'; fi = Math.min(8, Math.floor(at * 12)); }
      else if (b.hit > 0.3) { st = 'hurt'; fi = 5; }
      else if (b.walk) { st = 'move'; fi = Math.floor(mg.anT * 12) % 8; }
      if (mg.fin && mg.winner === i) hop = -Math.round(Math.abs(Math.sin(t * 9)) * 3) * 4;
      if (i === mg.side && mg.phase === 'fight' && mg.cheer > 0.4) { x.save(); x.globalAlpha = 0.5 * mg.cheer; K.R(x, K.snap(x0 - 48), ARF + 4, 96, 8, C.gold); x.restore(); }
      if (!M.PXR.MINI_D.cast(x, b.k, x0, ARF + hop, st, fi, flip, b.hit > 0.8 ? '#ffffff' : null)) K.SP(x, b.k, x0, FLOOR + hop, 180, flip);
      if (mg.phase === 'idle') { for (let k = -3; k <= 3; k++) K.R(x, K.snap(ARG[i] + k * 16) - 4, K.ly(70), 8, K.ly(146) - K.ly(70), C.slate); for (let y = K.ly(74); y < K.ly(146); y += 32) K.R(x, ARG[i] - 60, y, 120, 8, C.steel); }
      if (mg.phase !== 'idle') { U.bar(x, b.x - 70, FLOOR - 230, 140, 14, cl(b.hp, 0, 1), { col: i === mg.side ? C.gold : C.red }); K.chipC(x, M.DB[b.k].n, b.x, FLOOR - 256, i === mg.side ? C.gold : C.silver); } });
    // 押注：一袋钱从你那边扔进场子
    if (mg.bagT != null && t - mg.bagT < 0.6) { const q = (t - mg.bagT) / 0.35, bx = CX + (mg.side ? 160 : -160), by = K.ly(40) + Math.min(1, q) * (FLOOR - K.ly(40) - 20) - Math.sin(Math.min(1, q) * Math.PI) * 60; K.R(x, K.snap(bx) - 16, K.snap(by) - 20, 32, 28, C.tan); K.R(x, K.snap(bx) - 8, K.snap(by) - 28, 16, 8, C.brown); K.R(x, K.snap(bx) - 4, K.snap(by) - 8, 8, 8, C.gold); }
  } };

// ═════════════════════ 营火 · rest through the night, or sharpen on the beat ═════════════════════
// 像素舞台（mc-pxroom-mini-d.js 的 mini_camp）：林间空地，帐篷、原木、营火和吊锅、萤火虫、架在两个树桩上的长磨刀石。
// 休息：领袖钻进帐篷，月亮在 2.2 秒里划过夜空、火烧成余烬、东边天空亮成黎明，心从炊烟里飞向生命条。
// 磨刀：刀在磨刀石上来回滑，刀身上那一点小亮点正好在石头中间的旧磨痕上时下刀：一大把火花、营火蹿一下、刀刃烧红一格，连击往上；
// 没在点上：钝响、几颗暗火星。前四刀全中时第五刀听牌；第五刀之后卡帧揭晓：全中时刀光从刀根扫到刀尖、营火蹿起火柱
const CPS = { x: K.lx(226), y: K.ly(142) }, CPF = { x: K.lx(128), y: K.ly(140) };
MINI.camp = { title: '营火', img: 'e_camp', col: C.amber, text: '火堆还温着。歇一夜，或者就着火光把刀磨快。',
  init(mg) { mg.hits = 0; mg.strokes = 0; mg.spark = 0; mg.flare = 0; mg.q = 0.5; },
  stroke(mg) { if (mg.phase !== 'sharpen') return; const q = (mg.pt * 1.1) % 1, e = Math.abs(q - 0.5), ok = e < 0.09; mg.strokes++; mg.spark = 1; mg.strokeT = mg.t; const s = M.PXR && M.PXR.slots['_mg:mini_camp'], tipX = K.ax(CPS.x) + (q - 0.5) * 60;
    if (ok) { mg.hits++; mg.flare = 1; S.tone(1800, 0.12, 'triangle', 0.1); S.mini('camp', 'clang', mg.hits); if (s) { s.burst('spark', tipX, 140, 16 + mg.hits * 4, { sp: 60, ang: 0, spread: 1.6, life: 0.9, floor: 146 }); s.flash(0, 0.6); }
      const n = SHOW.combo(this, mg, CPS.x, CPS.y - 200, e < 0.03 ? 'PERFECT' : null); SHOW.burst(mg, K.lx(tipX), CPS.y - 12, 6 + n * 3, { ramp: [C.white, C.butter, C.gold, C.amber], sp: [200, 520], life: [0.2, 0.5], ang: -Math.PI / 2, spread: 1.6, g: 600 }); SHOW.shake(mg, 2 + n);
      if (mg.hits === 4 && mg.strokes === 4) SHOW.reach(this, mg, { x: CPS.x, y: CPS.y - 10, r: 120, col: C.gold, label: '' }); }
    else { S.tone(300, 0.08, 'square', 0.05); S.mini('camp', 'scrape'); SHOW.comboBreak(mg); SHOW.calm(mg); SHOW.stamp(mg, 'MISS', CPS.x, CPS.y - 200, C.steel, 40, 0.5); if (s) s.burst('spark', tipX, 140, 3, { sp: 20, ang: 0, spread: 1, life: 0.3 }); }
    if (mg.strokes >= 5) { this.miniSet('sharpDone'); mg.doneT = mg.t; MINI.camp.sharpEnd.call(this, mg); } },
  sharpEnd(mg) { const run = this.run, k = 0.05 + mg.hits * 0.04, tier = mg.hits >= 5 ? 2 : mg.hits ? 1 : 0; run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + k; S.mini('camp', 'sharpen'); SHOW.calm(mg);
    if (tier) SHOW.hitstop(mg, 0.12, CPS.x, CPS.y - 12, () => { if (tier >= 2) { mg.flare = 2; SHOW.reveal(this, mg, 2, { x: CPS.x, y: CPS.y - 20, col: C.gold }); } SHOW.later(mg, 0.2, () => { SHOW.win(this, mg, tier, { x: CPS.x, y: CPS.y - 60, v: Math.round(k * 100), col: C.amber, label: tier === 2 ? 'PERFECT' : '' }); embers(this, 12 + tier * 10, CPF.x, CPF.y); SHOW.items(this, mg, [{ text: '领袖攻击 +' + Math.round(k * 100) + '%', col: C.gold, size: 40 }], { x: CX, y: SY + 420 }); }); });
    else SHOW.state(mg).gray = 0.6;
    endIn(this, mg, tier ? 0.47 + TIER_END[tier - 1] + 0.1 : 0.6, mg.hits + ' / 5 刀磨在点上。这一趟领袖攻击 +' + Math.round(k * 100) + '%。', '#f2c14e'); },
  down(mg, px, py) { if (mg.phase === 'sharpen') MINI.camp.stroke.call(this, mg); else { SHOW.tap(this, mg, px, py); const s = M.PXR && M.PXR.slots['_mg:mini_camp']; if (s) s.burst('ember', 128, 134, 4, { sp: 16, ang: 0, spread: 0.8, life: 1.2 }); S.mini('camp', 'pop'); } },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'sharpen') { MINI.camp.stroke.call(this, mg); return true; } },
  btns(mg) { const run = this.run, full = !!(M.heroFull && M.heroFull(this)); if (mg.phase === 'idle') return [{ t: '休息', sub: full ? '领袖已满血' : '领袖回复 ' + (run.mods.campHalf ? 12 : 30) + '% 生命', gold: full ? 0 : 1, dis: full ? 1 : 0, why: full ? '领袖已满血' : '', fn: () => { this.miniSet('rest'); S.mini('camp', 'rest'); } }, { t: '磨刀', sub: '这一趟领袖攻击 +5%～25%', gold: full ? 1 : 0, fn: () => this.miniSet('sharpen') }];
    if (mg.phase === 'sharpen') return [{ t: '下刀', sub: '空格 / 点击 · ' + mg.strokes + ' / 5', gold: 1, fn: () => MINI.camp.stroke.call(this, mg) }]; return []; },
  tick(mg, dt) { mg.spark = Math.max(0, mg.spark - dt * 4); mg.flare = Math.max(0, mg.flare - dt * 2.5); if (mg.phase === 'sharpen') mg.q = (mg.pt * 1.1) % 1; const run = this.run;
    if (mg.phase === 'rest' && mg.pt > 2.2 && !mg.fin) { mg.fin = true; const pct = run.mods.campHalf ? 0.12 : 0.3, from = { x: K.lx(44), y: K.ly(110) }; embers(this, 26, CPF.x, CPF.y); SHOW.ring(mg, CPF.x, CPF.y, 10, 200, C.amber, { life: 0.6 });
      SHOW.win(this, mg, 1, { x: from.x, y: from.y, v: hpPct(this, pct), col: C.lime }); healFly(this, mg, pct, from); endIn(this, mg, 1.25, () => '你在火边睡了一夜。回复 ' + mg.healV + ' 生命。', '#9ccc6a'); } },
  draw(x, mg) {
    const t = mg.t, rest = mg.phase === 'rest';
    if (!K.pxr(x, 'mini_camp', 0, 0, t, { mg, t })) bgv(x, '#12101e', '#040306');
    const hk = catHero(this);
    // 领袖：坐在原木边烤火；休息时走进帐篷（帐篷口飘出 Z）；磨刀时站在磨刀石右端，每一刀出手一下
    if (rest) { const q = cl(mg.pt / 0.8, 0, 1), lx = K.lx(96) - q * (K.lx(96) - K.lx(46)); if (q < 1 && hk) { x.save(); x.globalAlpha = 1 - q * 0.9; M.PXR.MINI_D.cast(x, hk, lx, K.ly(146), 'move', Math.floor(t * 12) % 8, true); x.restore(); }
      for (let i = 0; i < 3; i++) { const z = (t * 0.5 + i / 3) % 1; if (mg.pt < 0.8) continue; x.save(); x.globalAlpha = 1 - z; U.text(x, 'Z', K.snap(K.lx(50) + z * 60), K.snap(K.ly(104) - z * 90), [T.cap, T.btn, T.title][i], C.ice, { num: true }); x.restore(); } }
    else if (mg.phase === 'sharpen' || mg.phase === 'sharpDone') { const st = mg.strokeT != null ? t - mg.strokeT : 9, b = hk && M.PCDG.body(hk), sf = b ? Math.max(1, Math.round(b.strike * 12)) : 2; if (hk) M.PXR.MINI_D.cast(x, hk, K.lx(288), K.ly(150), st < 0.2 ? 'attack' : 'idle', st < 0.2 ? sf : Math.floor(t * 12) % 24, true); }
    else if (hk) M.PXR.MINI_D.cast(x, hk, K.lx(96), K.ly(146), 'idle', Math.floor(t * 12) % 24, false); else K.SP(x, heroSp(this), CX - 230, FLOOR, 180);
    if (mg.phase === 'sharpen' || mg.phase === 'sharpDone') U.text(x, mg.hits + ' / ' + mg.strokes, CPS.x, CPS.y + 70, T.title, C.gold, { num: true });
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
// 像素舞台（mc-pxroom-mini-d.js 的 mini_recruit）：十字路口的募兵站，大战旗下三个皮影棚。和夜市抽卡分开：这里没有卡牌，是面试——
// 帆布上映着应征者自己的剪影；棚后的油灯逐拍亮起品质色（拍数 = 3 + 品质，一拍比一拍快、剪影一拍比一拍抖得凶），升档那一拍
// 灯芯蹿高、帆布边烧焦；卡帧 → 幕布落下 → 应征者当场亮一手（它自己的攻击动作，史诗以上再接施放）→ 名字、职业、战斗力逐项砸出。
// 选中：它往前一步，另外两棚的灯暗下去，它跑进队伍栏
const RBX = [K.lx(68), K.lx(150), K.lx(232)], RBF = K.ly(138), RBTOP = K.ly(44), RBBOT = K.ly(140);
const showQ = (q) => q <= 1 ? 0 : q === 2 ? 1 : q === 3 ? 2 : 3;   // M.QUALITY (6 steps) → the show's 4 steps
MINI.recruit = { title: '招募旗', img: 'e_flag', col: C.blue, text: '旗子下面站着三个人影。帘子一掀开，只有一个能跟你走。',
  init(mg) { const run = this.run; if (this.node) run.lastL = M.levelAt(run, this.node); mg.pool = M.recruitTrio(run); mg.cards = mg.pool.map((k, i) => ({ k, x: RBX[i], y: SY + 380, lift: 0, q: showQ(M.DB[k].q | 0), s: -1, shake: 0, lampK: 0 }));
    const best = Math.max(...mg.cards.map(c => c.q)), bi = mg.cards.findIndex(c => c.q === best); let t0 = 0.5;
    mg.cards.forEach((c, i) => { c.path = i === bi ? SHOW.omenPath(c.q) : [c.q]; c.t0 = t0; c.od = 0.55 + 0.25 * c.q + (c.path.length - 1) * 0.35; c.la = t0 + c.od; t0 = c.la + 0.35;
      const n = 3 + c.q; c.beats = []; for (let k = 0; k < n; k++) c.beats.push(c.t0 + c.od * (1 - Math.pow(0.78, k + 1)) / (1 - Math.pow(0.78, n))); c.bi = 0; }); },
  take(mg, i) { if (mg.phase !== 'idle') return; const c = mg.cards[i], run = this.run; if (!M.canAdd(run, c.k)) { S.mini('recruit', 'full'); c.nope = mg.t; this.deny('队伍满了', '#d0453c'); return; } mg.cur = i; this.miniSet('take'); S.up(2);
    const tier = c.q + 1, from = { x: c.x, y: RBF - 60 }, fly = tier === 4 ? 0.8 : 0.4; mg.cards.forEach((o, j) => { if (j !== i) o.dim = 1; if (o.la > mg.t) o.la = mg.t + (j === i ? 0 : 0.1); });   // 还没掀开的帘子：选中的马上掀
    c.stepT = mg.t; this.fx.kick(4 + tier * 2); SHOW.white(mg, 0.25); SHOW.ring(mg, c.x, from.y, 20, 200, QC(c.q), { life: 0.3 }); S.mini('recruit', 'salute');
    SHOW.later(mg, 0.1, () => SHOW.win(this, mg, tier, { x: c.x, y: from.y, col: tier >= 3 ? C.gold : QC(c.q), label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : '' }));
    SHOW.later(mg, fly, () => { c.gone = mg.t; give(this, mg, [{ k: 'unit', type: c.k }], from); });
    endIn(this, mg, fly + [0.6, 0.9, 1.5, 2.3][tier - 1], M.DB[c.k].n + ' 跟上了你。', QC(c.q)); },
  down(mg, px, py) { let hit = false; mg.cards.forEach((c, i) => { if (Math.abs(px - c.x) < 124 && py > RBTOP - 30 && py < RBBOT + 60) { hit = true; MINI.recruit.take.call(this, mg, i); } }); if (!hit) SHOW.tap(this, mg, px, py); },
  btns(mg) { if (mg.phase !== 'idle') return []; return mg.cards.map((c, i) => ({ t: '选 ' + M.DB[c.k].n, sub: (M.DB[c.k].voc || '') + ' · 战力 ' + M.unitPower(c.k), dis: !M.canAdd(this.run, c.k), why: '队伍满了', fn: () => MINI.recruit.take.call(this, mg, i) })).concat([{ t: '都不要', leave: 1, fn: () => { mg.cards.forEach(c => { c.dim = 1; }); S.mini('recruit', 'none'); this.miniSet('none'); SHOW.later(mg, 0.4, () => { if (this.mini === mg) this.miniFinish('旗子在风里响了一会儿。', '#8d8496'); }); } }]); },
  tick(mg, dt) {
    mg.cards.forEach(c => { c.shake = Math.max(0, c.shake - dt * 3); c.lampK = Math.max(0, c.lampK - dt * 3);
      // 逐拍加码：灯一拍比一拍亮、剪影一拍比一拍抖，拍到升档那一拍：灯芯蹿高、帆布边烧焦
      while (c.bi < c.beats.length && mg.t >= c.beats[c.bi] && mg.t < c.la) { const k = c.bi++, n = c.beats.length, s = Math.min(c.path.length - 1, Math.floor(k * c.path.length / n)), up = s > c.s && c.s >= 0;
        if (c.s < 0) SHOW.omen(this, mg, c.path[s]); c.s = s; c.shake = 1 + k * 0.5; c.lampK = 0.6 + k * 0.25; SHOW.beat(this, mg, c.x, RBF - 150, k, c.path[s], up); S.mini('recruit', 'lamp', c.path[s]);
        if (up) { c.scorch = 1; c.flareT = mg.t; S.mini('recruit', 'flare'); } }
      c.lift = cl((mg.t - c.la) / 0.28, 0, 1);
      if (mg.t >= c.la && !c.snd) { c.snd = 1; c.s = c.path.length - 1; const cc = c;
        SHOW.hitstop(mg, 0.12, c.x, RBF - 150, () => { cc.dropT = mg.t; cc.showT = mg.t; S.mini('recruit', 'curtain'); S.mini('recruit', 'reveal'); SHOW.reveal(this, mg, cc.q, { x: cc.x, y: RBF - 110 });
          const s2 = M.PXR && M.PXR.slots['_mg:mini_recruit']; if (s2) s2.burst('dust', K.ax(cc.x), 138, 14, { sp: 18, spread: 3, ang: 0, life: 1.2, w: 50 });
          const D = M.DB[cc.k]; SHOW.items(this, mg, [{ text: D.n, col: QC(cc.q), size: 34 }, { text: (D.voc || '') + ' · 战力 ' + M.unitPower(cc.k), col: C.cream, size: 26 }], { x: cc.x, y: SY + 600, dy: 40, gap: 0.16 });
          if (mg.cards.every(o => o.dropT != null)) SHOW.ambient(mg, Math.max(...mg.cards.map(o => o.q))); }); } }); },
  draw(x, mg) {
    const t = mg.t;
    if (!K.pxr(x, 'mini_recruit', 0, 0, t, { mg, t })) bgv(x, '#141a2a', '#06080e');
    mg.cards.forEach((c, i) => { const D = M.DB[c.k], hov = mg.phase === 'idle' && Math.abs(mg.mx - c.x) < 124 && mg.my > RBTOP - 30 && mg.my < RBBOT + 60, sel = mg.phase === 'take' && mg.cur === i;
      if (hov && !c.hovWas) S.mini('_', 'hover'); c.hovWas = hov; if (hov) c.lampK = Math.max(c.lampK, 0.3);
      const rev = c.dropT != null, st2 = rev ? t - c.showT : 0, nope = c.nope != null && t - c.nope < 0.3 ? Math.round(Math.sin((t - c.nope) * 50) * 2) * 4 : 0;
      if (c.gone != null && t - c.gone > 0.2) return;
      x.save(); if (c.dim && !sel) x.globalAlpha = 0.45; if (c.gone != null) x.globalAlpha *= cl(1 - (t - c.gone) / 0.2, 0, 1);
      if (!rev) { // 剪影：它自己的像素剪影映在帆布上，悬停时往前凑
        const jx = Math.round(Math.sin(t * 60 + i) * c.shake) * 4, lit = c.s >= 0; x.save(); x.beginPath(); x.rect(c.x - 120, RBTOP, 240, RBBOT - RBTOP); x.clip(); x.globalAlpha *= lit ? 0.9 : 0.55;
        if (!M.PXR.MINI_D.cast(x, c.k, c.x + jx, RBF - (hov ? 4 : 0), 'idle', Math.floor(t * 12 + i * 5) % 24, false, '#0d0b1e')) K.SP(x, c.k, c.x, RBF, 180, false, '#0d0b1e'); x.restore(); }
      else { // 亮一手：攻击动作一遍（史诗以上再接施放），然后待机；选中的往前一步
        let s = 'idle', fi = Math.floor(t * 12 + i * 5) % 24; if (st2 < 0.75) { s = 'attack'; fi = Math.min(8, Math.floor(st2 * 12)); } else if (c.q >= 2 && st2 < 1.25) { s = 'cast'; fi = Math.min(5, Math.floor((st2 - 0.75) * 12)); }
        const fwd = sel ? Math.min(1, (t - c.stepT) / 0.2) * 24 : 0; if (sel && t - c.stepT < 0.2) { s = 'move'; fi = Math.floor(t * 12) % 8; }
        if (!M.PXR.MINI_D.cast(x, c.k, c.x + nope, RBF + fwd, s, fi, false, st2 < 0.05 ? '#ffffff' : null)) K.SP(x, c.k, c.x, RBF + fwd, 180); }
      x.restore();
      const tv = M.TAG.voc(D.voc); K.chipC(x, D.n, c.x, RBBOT + 56, QC(c.q), T.body); if (tv) K.IC(x, tv.icon, c.x + 96, RBBOT + 56, 40); });
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
