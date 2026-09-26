// 充能塔（自然 · 商人 · 稀有）：一截中空老树干做成的瘦高固定塔。底部一圈盘根、树干上一圈圈年轮刻线（充能刻度）、中段两扇小窗、
// 右侧铜边投币口和一只小铜铃、塔顶四根弯树枝像爪子一样托着一颗六角琥珀充能晶。
// 攻击 = 晶体充能一闪，射出一道折线琥珀电弧打向远处；技能 = 特性「美味」（死亡后获得积分）表现成「存钱罐塔」：
// 投币口吸进一串金币、年轮刻线像进度条一样亮满、铜铃摇响 → 晶体「叮」地爆亮，塔顶喷出一道琥珀币喷泉落在塔周地面上弹跳。
// 移动 = 根须挪移（塔身不动，盘根一左一右蠕动，微微前倾后仰）；死亡 = 倾倒：塔身从中间裂开，上半截带着晶体向后倒下摔断，散出铜币。
// 身体不用现成骨架：盘根、树干塔身、爪枝、六角晶、投币口、铜铃都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('ChargeTower', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const BARK = E.ramp(['#1a0e06', '#3e2410', '#6a4220', '#9a6a3a']);          // 老树皮
  const AMB = E.ramp(['#3a1a02', '#a05a0a', '#f0a020', '#ffe08a']);           // 琥珀
  const M_BARK = defMat(BARK, 2), M_TWIG = defMat(BARK, 1);                    // 塔身（大面积 band 2）/ 爪枝、铃枝（小块 band 1）
  const M_ROOT = defMat([BARK[0], BARK[1], 20, 19], 1), M_ROOT_D = defMat([BARK[0], BARK[1], BARK[1], 20], 1);   // 盘根深褐（远侧暗一级）
  const M_CU = defMat([20, 19, 32, 14], 1), M_BELL = defMat('gold', 1), M_INK = defMat('ink', 1, 1);           // 铜边投币口 / 铜铃 / 窗洞与投币缝
  const M_AMB = defMat(AMB, 1, 1), M_HOT = defMat([AMB[0], AMB[3], 21, 21], 1, 1), M_RING = defMat(AMB, 1, 1);   // 琥珀晶 / 晶体白热 / 发光刻线
  const R_EL = FXI.coin, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(68, 42, 38, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const m of [M_ROOT, M_ROOT_D, M_CU, M_BELL, M_INK, M_AMB, M_HOT, M_RING]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  // ring：亮起的年轮刻线数（从下往上）；gem：晶体档位 0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭；win：窗 0 暗 · 1 亮 · 2 闭（受击）；
  // fL / fR：左右盘根根尖的前后偏移，uL / uR：抬起；rock：塔身前倾（+1）/ 后仰（-1）；tilt：死亡倾倒 0 站 · 1 · 2 斜 · 3 躺；cx / cy：摔断的晶体滚开
  const P = { bob: 0, crouch: 0, rock: 0, ring: 0, gem: 0, glint: 0, bell: 0, win: 0, fL: 0, fR: 0, uL: 0, uR: 0, crack: 0, tilt: 0, lift: 0, cx: 0, cy: 0,
    bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['bob', 0, 1], ['crouch', 0, 2], ['rock', -1, 1], ['ring', 0, 6], ['gem', 0, 4], ['glint', 0, 1], ['bell', -1, 1], ['win', 0, 2],
    ['fL', -2, 2], ['fR', -2, 2], ['uL', 0, 1], ['uR', 0, 1], ['crack', 0, 2], ['tilt', 0, 3], ['lift', 0, 3], ['cx', -8, 0], ['cy', 0, 4],
    ['bx', -4, 4], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const T_REL = 2 / 12, T_REL2 = 3 / 12, T_SPLIT = INCOMING + 0.3, T_LAND = INCOMING + 0.66;
  const W_F = [1, 0, -1, 0], W_UL = [0, 1, 0, 0], W_UR = [0, 0, 0, 1], W_ROCK = [1, 0, -1, 0], W_CR = [1, 0, 1, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bob = 0; P.crouch = 0; P.rock = 0; P.ring = 0; P.gem = 0; P.glint = 0; P.bell = 0; P.win = 0; P.fL = 0; P.fR = 0; P.uL = 0; P.uR = 0;
    P.crack = 0; P.tilt = 0; P.lift = 0; P.cx = 0; P.cy = 0; P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {
      const TT = f12 / 12, b = Math.floor(TT * 2.5); P.bob = b & 1; P.bell = [0, 1, 0, -1][(b + 1) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.2 && lp < 2.0) {                                                        // 待机个性：充能脉动——刻线从下往上一圈圈亮到晶体，晶体闪一下
        if (lp < 1.65) P.ring = Math.min(6, 1 + Math.floor((lp - 1.2) * 12 + 1e-6));
        else if (lp < 1.84) { P.ring = 6; P.gem = 2; P.glint = 1; P.win = 1; P.rim = 2; }
        else { P.gem = 1; P.win = 1; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                  // 根须挪移：盘根一左一右蠕动，塔身微微前倾后仰
      const f = gait(tq); P.fL = W_F[f]; P.fR = W_F[f]; P.uL = W_UL[f]; P.uR = W_UR[f]; P.rock = W_ROCK[f]; P.crouch = W_CR[f]; P.bell = -W_ROCK[f];
      const w = walkDemo(tq, 6, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                              // 充能 → 一闪放电 → 余电 → 回位
      if (tq < 0.12) { P.gem = 1; P.ring = 3; P.rock = -1; P.win = 1; P.rim = 2; }
      else if (tq < 0.2) { P.gem = 3; P.ring = 6; P.rock = 1; P.bell = -1; P.win = 1; P.rim = 3; P.glint = 1; }
      else if (tq < 0.45) { P.gem = 2; P.ring = Math.max(0, 6 - Math.floor((tq - 0.2) * 12 + 1e-6) * 2); P.rock = 1; P.bell = 1; P.win = 1; P.rim = 2; }
      else { P.gem = tq < 0.6 ? 1 : 0; P.bell = tq < 0.6 ? -1 : 0; }
    } else if (st === CHARGE) {                                                              // 攒钱：投币口吸金币，刻线像进度条一样亮满，铜铃摇响
      const q = ease.inOut(clamp01(tq / 0.7)); P.crouch = q > 0.5 ? 1 : 0; P.rim = 2; P.win = 1;
      P.ring = Math.min(6, Math.floor(tq / 0.2 + 1e-6)); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      if (tq > 0.9) P.bell = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {                                                                // 「叮」：晶体爆亮，塔身挺直
      P.gem = 3; P.ring = 6; P.rim = 3; P.win = 1; P.bell = (f12 & 1) ? 1 : -1; P.glint = tq < 0.2 ? 1 : 0; P.rock = tq < 0.12 ? -1 : 0;
    } else if (st === RECOVER) {                                                             // 刻线从上往下依次暗掉
      const q = ease.inOut(clamp01(tq / 0.6)); P.ring = Math.max(0, 6 - Math.floor(tq * 12 + 1e-6));
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.win = q < 0.6 ? 1 : 0; P.bell = tq < 0.3 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.rock = -1; P.win = 2; P.bell = 1; P.gem = 4; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.win = 2; P.bell = -1; P.gem = 1; P.rim = 0; }
      else { P.bell = 1; }
    } else if (st === DEATH) {                                                               // 裂开 → 上半截向后倒 → 摔断在地 → 晶体滚开熄灭 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.bx = -2; P.rock = -1; P.win = 2; P.bell = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crack = d < 0.15 ? 1 : 2; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 4; }
      else if (d < 0.5) { P.bx = -2; P.crack = 2; P.tilt = d < 0.42 ? 1 : 2; P.win = 2; P.gem = (f12 & 1) ? 1 : 4; P.bell = -1; }
      else {
        P.bx = -2; P.tilt = 3; P.crack = 2; P.win = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.66) / 0.25); P.cx = RD(-5 * hq); P.cy = RD(Math.sin(hq * Math.PI) * 3);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.dq48 = RD(P.dq * 48);
    if (P.tilt === 3) { P.gx = TPX_LIE - 15 + P.cx + P.bx; P.gy = TPY_LIE - P.lift - P.cy; }
    else { P.gx = (P.tilt ? -2 * P.tilt : P.rock) + P.bx; P.gy = -28 + P.crouch - P.bob; }
    KEY(P);
  }

  // ───── 画 ─────
  // 上半截的落笔变换：TM 0 原位（整体按 rock 前倾 / 后仰）· 1 斜切（向后倒到一半）· 2 转 90°（躺在地上，塔顶朝左）
  const BRK = -12, TPX_LIE = -8, TPY_LIE = -5;
  let TM = 0, TS = 0, TOX = 0, TOY = 0, LEAN = 0, YO = 0;
  function S(x, y, m, t) {
    y += YO;
    if (TM === 0) x += RD(-y * LEAN / 28);
    else if (TM === 1) x += RD((y - BRK) * TS);
    else { const dx = x, dy = y - BRK; x = TPX_LIE + dy + TOX; y = TPY_LIE - dx + TOY - P.lift; }
    sp(x, y, m, t);
  }
  const R = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) S(x, y, m, t); };
  const bez = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;
  // 候选部件：盘根须（塔基 → 贴地根尖的拱形曲线，根部 2 格粗、梢 1 格；up 抬起格数）
  function rootT(x0, y0, x1, up, arch, m) {
    part(); const y1 = -up, cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - arch, n = 14;
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(x0, cx, x1, q)), y = RD(bez(y0, cy, y1, q)); sp(x, y, m, 0); if (q < 0.6) sp(x, y + 1, m, 0); }
    sp(x1 + Math.sign(x1 - x0), y1, m, up ? 2 : 0);
  }
  const hwAt = (y) => (y >= -2 ? 7 : y === -3 ? 6 : 4 + RD((y + 22) / 9));
  const RING_Y = [-5, -8, -11, -14, -17, -20];
  // 候选部件：年轮树干塔身（中空老树干，上窄下宽；年轮刻线 = 充能刻度，lit 圈从下往上发光；y 范围 [ya, yb]）
  function trunk(ya, yb) {
    for (let y = ya; y <= yb; y++) {
      const hw = hwAt(y);
      if (y === -23) { for (const x of [-4, -3, 3, 4, 5]) S(x, y, M_BARK, 0); continue; }                  // 断口的毛边
      R(y, -hw, hw, M_BARK, 0);
      if (y === -22) R(y, -2, 2, M_INK, 0);                                                                  // 中空的树洞口
      else if (y !== -1 && y < -2 && ((y * 7 + 40) % 5) < 2) for (const gx of [-3, 0, 3]) if (!RING_Y.includes(y) && Math.abs(gx) < hw - 1) S(gx + ((y & 2) ? 0 : 1), y, M_BARK, 2);   // 竖向树皮纹
    }
    for (let k = 0; k < RING_Y.length; k++) {                                                                // 年轮刻线：两端上翘 1 格的弧
      const y = RING_Y[k]; if (y < ya || y > yb) continue; const hw = hwAt(y), lit = k < P.ring;
      for (let x = -hw + 1; x <= hw - 1; x++) { const yy = y - (Math.abs(x) >= hw - 1 ? 1 : 0); if (lit) S(x, yy, M_RING, k === P.ring - 1 ? 4 : 3); else S(x, yy, M_BARK, 1); }
    }
    if (-16 >= ya && -15 <= yb) {                                                                             // 两扇小窗（像一双眼）
      for (const wx of [-2, 1]) {
        S(wx, -17, M_BARK, 4); S(wx + 1, -17, M_BARK, 4);
        if (P.win === 2) { S(wx, -16, M_BARK, 2); S(wx + 1, -16, M_BARK, 2); S(wx, -15, M_INK, 0); S(wx + 1, -15, M_INK, 0); }
        else if (P.win === 1) { S(wx, -16, M_RING, 4); S(wx + 1, -16, M_RING, 3); S(wx, -15, M_RING, 3); S(wx + 1, -15, M_RING, 2); }
        else { S(wx, -16, M_INK, 0); S(wx + 1, -16, M_INK, 0); S(wx, -15, M_RING, 2); S(wx + 1, -15, M_INK, 0); }
      }
    }
    if (P.crack) {                                                                                            // 死亡裂纹：沿断口横向裂开
      const C = [[-5, -12], [-4, -11], [-3, -12], [-2, -12], [-1, -13], [0, -12], [1, -11], [2, -12], [3, -12], [4, -13], [5, -12]];
      for (let i = 0; i < C.length; i++) if (P.crack >= 2 || (i > 2 && i < 8)) { const [x, y] = C[i]; if (y >= ya && y <= yb) S(x, y, M_BARK, 1); }
    }
  }
  // 候选部件：铜边投币口（4×4 铜框 + 一道横缝，伸出塔身 2 格）
  function coinSlot() {
    part(); R(-10, 5, 8, M_CU, 4); S(5, -9, M_CU, 0); S(8, -9, M_CU, 0); S(6, -9, M_INK, 0); S(7, -9, M_INK, 0); R(-8, 5, 8, M_CU, 0); R(-7, 6, 8, M_CU, 2);
  }
  // 候选部件：挂在小枝上的铜铃（摆动 b：铃身偏移，铃舌反向）
  function bell(b) {
    part(); R(-19, 5, 7, M_TWIG, 0); S(8, -20, M_TWIG, 4);
    part(); const bx = 7 + b; S(7, -18, M_BELL, 1); S(bx, -17, M_BELL, 4); R(-16, bx - 1, bx + 1, M_BELL, 0); R(-15, bx - 1, bx + 1, M_BELL, 0); S(bx - b, -14, M_BELL, 2);
  }
  // 候选部件：六角充能晶（8 格高、6 格宽，三个棱面按档位直接写色调）
  const HEX = [[0, 1], [-1, 2], [-2, 3], [-2, 3], [-2, 3], [-2, 3], [-1, 2], [0, 1]];
  const GEM_LV = [   // [左面, 中面, 右面, 尖] → [材质, 色调]
    [[M_AMB, 4], [M_AMB, 3], [M_AMB, 2], [M_AMB, 4]],
    [[M_AMB, 4], [M_AMB, 4], [M_AMB, 3], [M_HOT, 2]],
    [[M_HOT, 2], [M_HOT, 3], [M_AMB, 4], [M_HOT, 3]],
    [[M_HOT, 3], [M_HOT, 3], [M_HOT, 2], [M_HOT, 3]],
    [[M_AMB, 2], [M_AMB, 2], [M_AMB, 1], [M_AMB, 2]],
  ];
  function crystal(y0) {
    part(); const L = GEM_LV[P.gem];
    for (let r = 0; r < 8; r++) { const [a, b] = HEX[r]; for (let x = a; x <= b; x++) { const f = r === 0 ? L[3] : x <= -1 ? L[0] : x <= 1 ? L[1] : L[2]; S(x, y0 + r, f[0], f[1]); } }
    if (P.gem < 4) S(-1, y0 + 2, M_HOT, P.gem >= 2 ? 3 : 2);                                                  // 左上棱的高光
    if (P.glint) S(-1, y0 + 1, M_HOT, 3);
  }
  // 候选部件：爪枝（1 格粗的弯树枝折线，梢头亮一级）
  const CLAW_BL = [[-4, -23], [-5, -24], [-5, -25], [-5, -26], [-4, -27], [-4, -28], [-3, -29], [-3, -30], [-2, -31]];
  const CLAW_BR = [[5, -23], [6, -24], [6, -25], [6, -26], [5, -27], [5, -28], [4, -29], [4, -30], [3, -31]];
  const CLAW_FL = [[-2, -23], [-3, -24], [-3, -25], [-2, -26]], CLAW_FR = [[3, -23], [4, -24], [4, -25], [3, -26]];
  function claw(pts) { part(); for (let i = 0; i < pts.length; i++) S(pts[i][0], pts[i][1], M_TWIG, i === pts.length - 1 ? 4 : 0); }
  function crown() {
    claw(CLAW_BL); claw(CLAW_BR);
    const sv = TOX, sw = TOY; if (TM === 2) { TOX = P.cx; TOY = -P.cy; }
    YO -= P.bob; crystal(-31); YO += P.bob;
    TOX = sv; TOY = sw;
    claw(CLAW_FL); claw(CLAW_FR);
  }
  function drawHero() {
    begin(hero, P.bx, 0); TM = 0; TS = 0; TOX = 0; TOY = 0; LEAN = P.rock; YO = 0;
    const cr = P.crouch;
    rootT(-2, -4 + cr, -7 + P.fL, 0, 1, M_ROOT_D);                                                           // 远侧盘根
    rootT(2, -4 + cr, 8 + P.fR, 0, 1, M_ROOT_D);
    YO = cr; part(); trunk(-23, -1);
    YO = 0;
    rootT(-4, -3 + cr, -10 + P.fL, P.uL, 2, M_ROOT);                                                         // 近侧盘根：左、右、正前一根短的
    rootT(4, -3 + cr, 10 + P.fR, P.uR, 2, M_ROOT);
    rootT(1, -2 + cr, 4 + P.fR, 0, 0, M_ROOT);
    YO = cr; coinSlot();
    bell(P.bell); crown();
  }
  function drawBroken() {
    begin(hero, P.bx, 0); TM = 0; TS = 0; TOX = 0; TOY = 0; LEAN = 0; YO = 0;
    rootT(-2, -4, -7, 0, 1, M_ROOT_D); rootT(2, -4, 8, 0, 1, M_ROOT_D);
    YO = P.crouch; part(); trunk(BRK + 1, -1);                                                                // 树桩（断口以下）
    for (const x of [-5, -3, 0, 2, 4]) S(x, BRK, M_BARK, 4);                                                  // 断口的木茬
    YO = 0; rootT(-4, -3, -10, 0, 2, M_ROOT); rootT(4, -3, 10, 0, 2, M_ROOT); rootT(1, -2, 4, 0, 0, M_ROOT);
    coinSlot();
    if (P.tilt === 3) TM = 2; else { TM = 1; TS = P.tilt === 1 ? 0.16 : 0.42; }                                // 上半截：斜切后倒 / 转 90° 躺倒
    part(); trunk(-23, BRK); bell(P.tilt === 3 ? 0 : -1); crown();
  }
  function hero_() { if (P.tilt) drawBroken(); else drawHero(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 金币（2×2 面 / 1×2 侧面翻转，落地弹一下再平躺）：预分配，stepFX 推进，fxFront 画
  const CN = 24, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN),
    cAge = new Float32Array(CN), cLife = new Float32Array(CN), cB = new Uint8Array(CN), cW = new Uint8Array(CN), cRest = new Uint8Array(CN);
  function coin(x, y, vx, vy, life, w) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = vx; cVY[i] = vy; cAge[i] = 0; cLife[i] = life; cB[i] = 0; cW[i] = w; cRest[i] = 0; }
  const CG = 500;
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, landOnce = 0, glT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy), top = gy - 5;
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1, up: 8 });
    for (let i = 0; i < 12; i++) { const side = i < 5 ? -1 : 1, k = side < 0 ? i : i - 5, n = side < 0 ? 5 : 7; coin(gx + side, top, side * (14 + 30 * (k + Math.random() * 0.6) / n), -120 - Math.random() * 40, 1.35, 1); }   // 琥珀币喷泉：5 颗落向身后、7 颗落向身前
    burst(gx, top, 20, 40, 110, 0.25, 0.6, R_EL, 14); fx.cross(gx, gy, 7, R_EL, 0.3); ring(gx, gy, 1, R_EL); landOnce = 0;
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'coin' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                                     // 一闪放电：折线琥珀电弧打到远处
      const gx = wx(P.gx), gy = wy(P.gy), tx = DUMMY_X - 1, ty = HY - 17;
      fx.bolt(gx + 2, gy, tx, ty, R_EL, 0.25, 2, 11); fx.cross(gx, gy, 5, R_EL, 0.17);
      burst(tx, ty, 12, 30, 90, 0.15, 0.4, R_EL, 8); burst(tx, ty, 5, 20, 60, 0.2, 0.4, FXI.bolt, 4); hitDummy(0);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('hit', { mat: 'magic', w: 0.35 });
    }
    if (s === ATTACK && t === T_REL2) { fx.bolt(wx(P.gx) + 2, wy(P.gy), DUMMY_X - 2, HY - 15, R_EL, 0.12, 2, 23); }   // 余电再噼啪一下
    if (s === DEATH && Math.abs(t - T_SPLIT) < 1e-9) { burst(wx(0), wy(BRK), 10, 20, 70, 0.3, 0.6, FXI.earth, 14); shake(0.1, 1); }   // 断口崩出的木屑
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                                      // 上半截摔在地上：扬尘 + 散出铜币
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 26 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      for (let i = 0; i < 7; i++) coin(wx(-10 + i * 2), wy(-6), (Math.random() - 0.4) * 70, -70 - Math.random() * 50, 1.6, 2);
      shake(0.12, 1); sfx('fall', { w: 0.6 });
    }
  }
  const EVENTS = [[], [], [T_REL, T_REL2], [], [], [], [], [T_SPLIT, T_LAND], []];
  function hurtFx(s) {                                                                     // 木头受击：火花里夹着木屑，震下一两颗琥珀光点
    const hx = HX + 1, hy = HY - 15; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, FXI.impact, 20); burst(hx, hy, s === DEATH ? 10 : 6, 30, 80, 0.3, 0.6, FXI.earth, 12);
    burst(hx, hy - 12, 3, 20, 40, 0.2, 0.4, R_EL, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE) {                                                                // 投币口定点吸入一串金币
      chargeAcc += dt * (18 + 22 * clamp01(t / 1.2));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 9; spawn(K_SPIRAL_PT, wx(6.5), wy(-9 + P.crouch), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if ((state === IDLE && P.gem === 2) || state === RECOVER) {                            // 嗡鸣：晶体上飘起琥珀光点
      emberAcc += dt * (state === IDLE ? 14 : 6);
      while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(P.gx) + RD(Math.random() * 4 - 2), wy(P.gy) - 4, Math.random() * 8 - 4, -8 - Math.random() * 8, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === MOVE && P.crouch !== lastStep) {                                         // 根尖落地：两三颗土屑
      if (P.crouch) { sfx('step', { w: 0.6 }); const fx0 = wx(P.fL > 0 ? 10 : -10); for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); spawnX(K_PHYS, fx0, HY - 1, (Math.random() - 0.5) * 16, -16, 0.45, FXI.earth, { g: 160, floor: HY }); }
      lastStep = P.crouch;
    }
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 24 + Math.random() * 30, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; cAge[i] += dt;
      if (!cRest[i]) {
        cVY[i] += CG * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
        if (cY[i] >= HY - 1 && cVY[i] > 0) {
          cY[i] = HY - 1;
          if (cB[i] === 0) {                                                               // 第一次落地：金色「+」小闪光
            fx.cross(RD(cX[i]), HY - 2, 2, R_EL, 0.25); burst(cX[i], HY - 1, 3, 10, 30, 0.1, 0.3, R_EL, 8);
            if (cW[i] === 1 && !landOnce) { landOnce = 1; glT = 0; ring(wx(0), HY - 1, 1, R_EL); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.6 }); }
          }
          if (cB[i] < 1) { cVY[i] *= -0.4; cVX[i] *= 0.6; cB[i]++; } else { cVY[i] = 0; cVX[i] = 0; cRest[i] = 1; }
        }
      }
      if (cAge[i] >= cLife[i]) cOn[i] = 0;
    }
    glT += dt;
  }
  function fxReset() { cOn.fill(0); chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; landOnce = 0; glT = 9; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.tilt) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (glT < 0.45) { const cx = wx(0), span = 22; for (let x = cx - span; x <= cx + span; x++) { const d = Math.abs(x - cx); if (glT > 0.25 && ((x + f12) & 1)) continue; put(x, FLOOR, d < 8 ? EL[1] : d < 15 ? EL[2] : EL[3]); } }   // 地面映光一圈
  }
  function fxFront(f12) {
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; const x = RD(cX[i]), y = RD(cY[i]), fade = clamp01((cAge[i] - (cLife[i] - 0.35)) / 0.35);
      if (fade > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < fade) continue;
      if (cRest[i]) { put(x, y, 14); put(x + 1, y, ((f12 + i) % 8) === 0 ? 21 : 5); }        // 平躺在地上，偶尔闪一下
      else if (((cAge[i] * 12) | 0) % 3 === 2) { put(x, y - 1, 14); put(x, y, 61); }         // 侧面
      else { put(x, y - 1, 5); put(x + 1, y - 1, 14); put(x, y, 14); put(x + 1, y, 61); }     // 正面
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.tilt) {                                    // 晶体星芒（蓄满 / 施放）
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 5; r <= L + 2; r++) { const c = r <= 5 ? EL[0] : r <= 6 ? EL[1] : EL[2]; put(gx, gy - r, c); put(gx + r - 1, gy, c); put(gx - r + 1, gy, c); }
    }
  }

  return {
    name: '充能塔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_AMB, M_HOT, M_RING], HIT_POINT: [1, -15], EVENTS,
    SFX: { body: 'stone', how: 'topple', pal: 'coin', style: 'coin', w: 0.6 },
    poseAt, drawHero: hero_, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
