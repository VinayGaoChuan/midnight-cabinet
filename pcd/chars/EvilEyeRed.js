// 赤邪眼（敌人 · 混沌 · 普通 · 近战 240）：「飞行单位。虽然爪子不是很尖利，但是被抓了还是很疼。」
//   邪眼一族最小的一只：一颗直径 11 格、布满血丝的充血眼球（外圈一道红肉眼睑，剪影是个圆），离地 8 格；
//   两侧一对小小的蝙蝠膜翼扑得很急；眼球下面垂着一对三趾鸟爪（钝爪尖，垂出 5 格）。没有王冠、触须、龙角（和邪眼王、暗邪眼拉开）。
// 攻击「抓挠」：先拔高、收爪、瞳孔一缩 → 扑低，双爪向下一抓（两道血红抓痕）。
// 技能「乱抓」（没有特性，按描述做）：眼球涨红、血丝一条条变亮、翅膀扑得更快 → 扑到目标头上连抓四下（四道短斩弧交错）→
//   目标身上留下四道血红抓痕 + 小外爆，目标小摇 4 下。
// 死亡：眼球像泄了气一样皱缩，打着转坠到地上。
// 身体：B.blob 的 orb 几何（只取圆身）+ B.wing 膜翼；充血眼、钝鸟爪是本模块的候选部件。
PCD.define('EvilEyeRed', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_BURST, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, groundShadow } = E;
  const B = E.parts.beast, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质（全部取自共享色板） ─────
  const R_EL = FXI.blood, EL = FXR[R_EL];                                        // 充血 · 血红：白 21 → 淡粉 58 → 红 57 → 暗红 56 → 墨红 55
  const m = B.mats(E, {
    main: [11, 55, 56, 57],                                                     // 红肉眼睑
    wing: 'skinDark', bone: [0, 20, 19, 16], claw: 'sand',
  });
  m.scl = E.defMat([11, 63, 58, 17], 2);                                        // 充血粉红眼白（面积最大）
  m.sclR = E.defMat([11, 12, 63, 58], 2);                                       // 涨红的眼白
  m.clawF = E.defMat([20, 61, 61, 62], 1);                                      // 远侧爪暗一级
  m.vein = E.defMat([55, 56, 57, 58], 1, 1);                                    // 血丝（蓄力时变亮）
  m.iris = E.defMat([11, 12, 13, 26], 1, 1);                                    // 赤红虹膜（发光体）
  m.hot = E.defMat([13, 26, 58, 21], 1, 1);                                     // 蓄满 / 施放的虹膜
  const WSPEC = { span: 10, chord: 3, type: 'membrane', fingers: 3 };

  const HX = 78, DUR = DEFAULT_DUR.slice(), hero = new Sprite(60, 66, 30, 62);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 13], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['iris', 'hot', 'ink', 'spec', 'vein', 'claw', 'clawF']) RIM.skip[m[k]] = 1;
  const RB = 5.5, ALT = 8;

  // ───── 姿势字段 ─────
  //   alt 离地高 · sq 压扁 · sh 皱缩（泄气）· sw 涨大 · wn / wf 近 / 远翼翼姿（B.WINGS）· ix iy 看的方向 · pup 瞳孔 0 缩 / 1 常 / 2 放大 · lid 眼睑合拢 0–4
  //   vein 血丝亮度 0–2 · leg 爪 0 垂 / 1 前抓（张开）/ 2 攥紧 / 3 收起 / 4 摊软 · lie 0 飞 / 1 坠落 / 2 落地 · gem 虹膜档 0–3 · wr 皱纹
  const SPEC = [['alt', 0, 31], ['sq', 0, 2], ['sh', 0, 3], ['sw', 0, 1], ['wn', 0, 6], ['wf', 0, 6], ['ix', -3, 3], ['iy', -3, 3], ['pup', 0, 2], ['lid', 0, 4],
    ['vein', 0, 2], ['leg', 0, 4], ['lie', 0, 2], ['gem', 0, 3], ['wr', 0, 1]].concat(B.COMMON.slice(0, 5));
  const P = {};
  function reset() {
    P.alt = ALT; P.sq = 0; P.sh = 0; P.sw = 0; P.wn = 2; P.wf = 2; P.ix = 1; P.iy = 0; P.pup = 1; P.lid = 0; P.vein = 0; P.leg = 0; P.lie = 0; P.gem = 0; P.wr = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.flip = 0; P.mx = 0;
  }
  reset();
  const T_HIT = 2 / 12, SWOOP = 10;
  const S_K = [1 / 12, 2 / 12, 3 / 12, 4 / 12], PERCH = 14;                      // 技能：四下抓挠的时刻；扑到目标头上（前移 14 格）
  const DART = [[1, 0], [2, -1], [1, 1], [-1, -1], [2, 0], [0, 1], [-2, 0], [1, -1]];   // 眼珠乱转
  const SPIN = [[2, 0], [1, 2], [-1, 2], [-2, 0], [-1, -2], [1, -2]];               // 打转：虹膜绕着眼球转
  function flap(f, fast) { const k = f & 3; P.wn = B.FLAP[k]; P.wf = B.FLAP[(k + (fast ? 0 : 1)) & 3]; return B.FLAP_BOB[k]; }

  function idle(tq, f12) {
    const TT = f12 / 12, k = Math.floor(f12 / 2 + 1e-6);
    P.alt = ALT + flap(k, 1) + 1;                                                // 扑翼一颠一颠
    const d = DART[Math.floor(TT * 3.4 + 1e-6) & 7]; P.ix = d[0]; P.iy = d[1];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const d2 = DART[(f12 * 3) & 7]; P.ix = d2[0]; P.iy = d2[1]; P.pup = 2; P.leg = (f12 & 1) ? 2 : 0; }   // 待机个性：眼珠一帧一个方向乱瞄
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                     // 快速扑翼、颠着飞、上下起伏 2 格
      const f = gait(tq); flap(f, 1); P.alt = ALT + [0, 2, 1, 2][f]; P.ix = 2; P.leg = f & 1 ? 3 : 0; P.sq = f === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { P.alt = 10; P.wn = P.wf = 4; P.leg = 3; P.ix = 2; }
      else if (tq < T_HIT) { P.alt = 12; P.wn = P.wf = 1; P.leg = 3; P.pup = 0; P.ix = 2; P.gem = 1; P.rim = 1; P.bx = -1; }         // 预兆：拔高、收爪、瞳孔一缩
      else if (tq < 3 / 12) { P.alt = 6; P.mx = SWOOP; P.wn = 3; P.wf = 3; P.leg = 1; P.pup = 0; P.ix = 2; P.iy = 1; P.gem = 1; P.sq = 1; }   // 扑低，双爪一抓
      else if (tq < 0.45) { P.alt = 6; P.mx = SWOOP; P.wn = 4; P.wf = 1; P.leg = 2; P.ix = 2; P.iy = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.mx = R(SWOOP * (1 - q)); P.alt = R(6 + 2 * q); flap(f12, 1); P.leg = q < 0.6 ? 2 : 0; P.ix = 1; }
    } else if (st === CHARGE) {                                                  // 眼球涨红、血丝一条条变亮、翅膀扑得更快
      flap(tq < 0.5 ? Math.floor(f12 / 2) : f12, 1); P.alt = ALT + 1 + (tq < 0.5 ? B.FLAP_BOB[Math.floor(f12 / 2) & 3] : B.FLAP_BOB[f12 & 3]);
      P.vein = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2; P.sw = tq >= 0.7 ? 1 : 0; P.ix = 2; P.pup = tq < 0.5 ? 1 : 0; P.gem = tq < 0.5 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 1; P.leg = tq > 0.9 ? 2 : 0;
      if (tq > 1.1) P.bx = (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                                     // 扑到目标头上连抓四下
      P.vein = 2; P.sw = 1; P.gem = 3; P.rim = 2; P.pup = 0; P.ix = 2; P.iy = 2;
      if (tq < S_K[0]) { P.mx = 7; P.alt = 18; P.wn = P.wf = 5; P.leg = 3; P.iy = 1; }
      else if (tq < 5 / 12) { const k = f12of(tq) - 1; P.mx = PERCH + (k & 1); P.alt = 20 + (k & 1); P.wn = k & 1 ? 1 : 3; P.wf = k & 1 ? 3 : 1; P.leg = k & 1 ? 2 : 1; P.sq = k & 1 ? 0 : 1; }
      else { P.mx = PERCH - 3; P.alt = 18; P.wn = P.wf = 5; P.leg = 2; P.gem = 2; }
    } else if (st === RECOVER) {                                                  // 飞回原位，血丝暗下去
      const q = ease.inOut(clamp01(tq / 0.6)); P.mx = R((PERCH - 3) * (1 - q)); P.alt = R(18 - 10 * q); flap(f12, 1);
      P.vein = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.sw = q < 0.3 ? 1 : 0; P.gem = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.rim = q < 0.5 ? 1 : 0; P.leg = q < 0.5 ? 2 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.lid = 3; P.pup = 0; P.ix = -1; P.iy = 1; P.wn = P.wf = 1; P.leg = 1; P.alt = ALT + 1; }
      else if (h < 0.35) { P.bx = -1; P.lid = 2; P.pup = 0; P.wn = P.wf = 3; P.leg = 2; }
      else { P.lid = 1; flap(f12, 1); }
    } else if (st === DEATH) {                                                    // 泄气皱缩、打着转坠地
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.lid = 3; P.pup = 0; P.wn = P.wf = d < 0.15 ? 1 : 6; P.leg = 1; P.ix = -1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.66) {
        const q = (d - 0.3) / 0.36, k = f12of(d - 0.3), s = SPIN[k % 6];
        P.bx = -3; P.lie = 1; P.alt = Math.max(0, R(ALT * (1 - q * q))); P.sh = Math.min(2, 1 + (k >> 1)); P.wr = 1;
        P.ix = s[0]; P.iy = s[1]; P.wn = k & 1 ? 6 : 1; P.wf = k & 1 ? 1 : 6; P.leg = 4; P.lid = 1; P.pup = 0; P.flip = (k >> 1) & 1;
      } else {
        P.bx = -3; P.lie = 2; P.alt = 0; P.sh = 2; P.wr = 1; P.sq = d < 0.75 ? 2 : 1; P.wn = P.wf = 6; P.leg = 4; P.lid = d < 0.9 ? 3 : 4; P.ix = -1; P.iy = 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    frame();
    P.gx = R(C.x + 1.8 + P.ix * 0.7) + P.bx; P.gy = R(C.y + P.iy * 0.7);
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  const C = { x: 0, y: -13, rx: RB, ry: RB, r: RB };
  function frame() { const r = RB + P.sw - P.sh * 0.9; C.r = r; C.rx = r + P.sq * 0.6; C.ry = r - P.sq; C.x = 0; C.y = -(P.alt + C.ry); }

  // ───── 画 ─────
  // 候选部件：bloodshotEye —— 充血眼球（身体 + 眼，两个部件）：红肉眼睑一圈（外圈）+ 往前偏 0.5 格的粉红眼白 + 从边缘伸向虹膜的血丝（vein 0–2 越来越亮、涨红时眼白换色）
  //   + 皱纹（泄气）；虹膜单独一个部件（外圈压一道勾线 = 角膜缘），瞳孔 pup、湿高光，lid 上眼睑往下合
  const VEINS = [[2.6, 0.2, 1.4], [3.4, -0.25, 1.6], [4.0, 0.3, 1.2], [2.0, -0.3, 1.1], [4.7, -0.2, 1.3], [1.4, 0.35, 1.0]];   // [角度（0 朝右、+ 朝下）, 弯, 长]
  function eyeBall() {
    E.part();
    U.oval(E, C.x, C.y, C.rx, C.ry, m.body, 0);
    const sx = C.x + 0.5, rs = C.r - 1.1, mat = P.vein >= 2 ? m.sclR : m.scl;
    U.oval(E, sx, C.y + 0.2, rs + P.sq * 0.6, rs - P.sq, mat, 0);
    for (const [a0, bend, len] of VEINS) {                                     // 血丝：从眼白边缘往里伸，末端分叉
      let a = a0, x = sx + Math.cos(a) * (rs - 0.3), y = C.y + Math.sin(a) * (rs - 0.3);
      for (let k = 0; k < len * rs * 0.5; k++) { U.dot(E, x, y, m.vein, P.vein === 0 ? 2 : P.vein === 1 ? 3 : 4); x -= Math.cos(a); y -= Math.sin(a); a += bend * 0.5; }
      U.dot(E, x + Math.sin(a), y - Math.cos(a), m.vein, P.vein === 2 ? 3 : 2);
    }
    if (P.wr) for (const [u, v] of [[-3, -2], [-2, -3], [-3, 1], [-1, 3], [0, -4], [2, 3]]) U.dot(E, C.x + u * C.r / 5.5, C.y + v * C.r / 5.5, m.body, 1);   // 皱纹
    if (!P.lie || P.lie === 1) U.dot(E, C.x - C.rx * 0.5, C.y - C.ry * 0.55, m.spec, 3);
    if (P.lid) {                                                                // 上眼睑往下合
      const lt = C.y - rs - 0.5 + P.lid * (2 * rs + 1) / 4;
      for (let y = Math.floor(C.y - C.ry); y <= Math.min(lt, 0); y++) for (let x = Math.floor(C.x - C.rx); x <= Math.ceil(C.x + C.rx); x++) {
        const ex = (x - C.x) / (C.rx + 0.35), ey = (y - C.y) / (C.ry + 0.35); if (ex * ex + ey * ey > 1) continue;
        E.sp(x, y, m.body, y >= lt - 1 ? (P.lid >= 4 ? 1 : 4) : 0);
      }
    }
  }
  function iris() {
    if (P.lid >= 4) return;
    E.part();
    const ix = C.x + 1.8 + P.ix * 0.7, iy = C.y + P.iy * 0.7, ri = Math.max(1.5, 2.4 - P.sh * 0.3), mat = P.gem >= 2 ? m.hot : m.iris;
    const lt = P.lid ? C.y - (C.r - 1.1) - 0.5 + P.lid * (2 * (C.r - 1.1) + 1) / 4 : -99;
    for (let y = Math.floor(iy - ri); y <= Math.ceil(iy + ri); y++) for (let x = Math.floor(ix - ri); x <= Math.ceil(ix + ri); x++) {
      const d = Math.hypot(x - ix, y - iy); if (d > ri + 0.3 || y < lt + 0.5) continue;
      const ex = (x - C.x - 0.5) / (C.r - 0.6), ey = (y - C.y) / (C.r - 0.6); if (ex * ex + ey * ey > 1) continue;
      const pupil = P.pup === 0 ? d < 0.6 : P.pup === 1 ? d < 1.05 : d < 1.6;
      E.sp(x, y, pupil ? m.ink : mat, pupil ? 1 : d > ri * 0.6 ? 2 : P.gem >= 1 ? 4 : 3);
    }
    if (iy - 1 >= lt + 0.5) U.dot(E, ix - 1, iy - 1, m.spec, 3);
  }
  // 候选部件：bluntTalons —— 一对垂着的三趾鸟爪（每只一个部件）：细胫 + 三只钝趾（爪尖不打亮）；0 垂 / 1 前抓张开 / 2 攥紧 / 3 收起 / 4 摊软
  const TAL = [
    [[0, 1, 3], [0, 2, 2], [0, 3, 2], [1, 4, 3], [2, 5, 2], [0, 4, 2], [0, 5, 2], [-1, 4, 2], [-1, 5, 1]],     // 垂
    [[1, 1, 3], [2, 2, 3], [3, 2, 2], [4, 2, 3], [5, 2, 2], [4, 3, 2], [4, 4, 2], [3, 4, 2], [2, 4, 1], [5, 3, 1]],   // 前抓：张开
    [[1, 1, 3], [1, 2, 2], [2, 3, 2], [3, 3, 3], [3, 2, 2], [2, 4, 2], [1, 4, 1]],                              // 攥紧
    [[0, 1, 3], [1, 1, 2], [1, 2, 2], [2, 2, 3], [0, 2, 1]],                                                    // 收起
    [[1, 0, 3], [2, 0, 2], [3, -1, 2], [4, -1, 3], [4, -2, 2], [3, -2, 1]],                                      // 摊软（落地后朝前伸）
  ];
  function talon(far) {
    E.part();
    const mat = far ? m.clawF : m.claw, lie = P.lie === 2, x0 = C.x + (far ? -1.5 : 1) + (lie ? C.rx - 1 : 0), y0 = lie ? C.y + (far ? 0 : 2) : C.y + C.ry - 0.5;
    const pat = TAL[lie ? 4 : P.leg] || TAL[0], dx = far ? -1 : 0;
    for (const [u, v, tn] of pat) U.dot(E, x0 + u + dx, y0 + v, mat, far ? Math.max(1, tn - 1) : tn);
  }
  // 远翼用镜像画笔朝前张开（B.wing 只朝后画）：两侧一对翅膀都露在圆形眼球外面
  let MX = 0; const EM = { part: E.part, sp: (x, y, mm, tn) => E.sp(2 * MX - x, y, mm, tn) };
  function wing(far) {
    const y = C.y - C.ry * 0.35;
    if (far) { MX = R(C.x + 1); B.wing(EM, MX, y - 1, P.wf, WSPEC, m, 1); }
    else B.wing(E, C.x - 1.5, y, P.wn, WSPEC, m, 0);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    wing(1); talon(1); eyeBall(); iris(); talon(0); wing(0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const marks = [];                                                                // 目标身上的抓痕：[中心 x, y, 方向, 出现时刻]
  let chargeAcc = 0, soulAcc = 0, dripAcc = 0, markT = 9, nMarks = 0;
  const HEAD_X = DUMMY_X - 1, HEAD_Y = HY - 22;
  const MK = [[-2, 0, 1], [1, -2, -1], [-1, 3, 1], [2, 1, -1]];                   // 四道抓痕的偏移与方向（\ 与 / 交错）
  function scratch(k) {
    const [u, v, d] = MK[k], x = HEAD_X + u, y = HEAD_Y + v;
    fx.slash(x - d * 3, y - 1, 6, d > 0 ? 2.1 : -2.1, d > 0 ? 3.3 : -3.3, R_EL, 2 / 12, 2, 2);
    burst(x, y, 6, 20, 60, 0.15, 0.35, R_EL, 10);
    for (let i = 0; i < 2; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 40, -20 - Math.random() * 20, 0.5, R_EL, { g: 220, floor: HY });
    nMarks = k + 1; if (k === 0) markT = 0;
    hitDummy(0, 1); sfx('impact', { pal: 'blood', w: 0.25 });
  }
  function onEnter(s) {
    if (s === CAST) {
      const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(30, 70, 0.2, 0.45); burst(gx, gy, 12, 30, 80, 0.2, 0.45, R_EL, 8); ring(gx, gy, 0, R_EL);
      shake(0.28, 2); flash(0.05); nMarks = 0; markT = 9;
    }
    if (s !== CAST && s !== RECOVER) { nMarks = 0; markT = 9; }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                            // 双爪向下一抓：两道短抓痕
      const x = DUMMY_X - 5, y = HY - 13;
      fx.slash(x - 2, y - 4, 6, 2.0, 3.2, FXI.impact, 2 / 12, 2, 2); fx.slash(x + 1, y - 4, 6, 2.0, 3.2, R_EL, 2 / 12, 1, 2);
      burst(x, y, 8, 30, 80, 0.15, 0.35, FXI.impact, 10); burst(x, y, 4, 20, 50, 0.2, 0.4, R_EL, 6);
      hitDummy(0, 1); sfx('swing', { kind: 'claw', w: 0.2 }); sfx('hit', { mat: 'flesh', w: 0.2 });
    }
    if (s === CAST) { const k = S_K.indexOf(t); if (k >= 0) scratch(k); if (k === 3) { burst(HEAD_X, HEAD_Y, 18, 40, 100, 0.25, 0.55, R_EL, 12); fx.cross(HEAD_X, HEAD_Y, 5, R_EL, 0.25, 2); shake(0.12, 1); } }
    if (s === DEATH && t === INCOMING + 0.66) {                                   // 皱缩的眼球砸在地上
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, HX - 4 + Math.random() * 8, HY - 3, (Math.random() - 0.5) * 40, -30 - Math.random() * 20, 0.5, R_EL, { g: 220, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], S_K.slice(), [], [], [INCOMING + 0.66], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                     // 血雾细点螺旋汇进虹膜
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 2.5 + Math.random() * 2); }
    }
    if (state === MOVE || state === IDLE) {                                     // 身下偶尔滴一滴血
      dripAcc += dt * (state === MOVE ? 3 : 0.8);
      while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, scrX(R(Math.random() * 2)), HY - P.alt, (P.flip ? 1 : -1) * 6, 0, 0.6, R_EL, { g: 120, floor: HY, age0: 0.2 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 20; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 20, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); } }
    markT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; dripAcc = 0; markT = 9; nMarks = 0; }
  function fxBack(f12) { if (P.dq < 0.6 && P.lie !== 2) groundShadow(scrX(P.bx), 5, P.alt); }
  function fxFront(f12) {
    if (markT > 1.0) return;                                                    // 四道血红抓痕（每道三条平行爪痕），0.6 秒后闪烁褪去
    for (let k = 0; k < nMarks; k++) {
      const [u, v, d] = MK[k], age = markT - k / 12, c = age < 1 / 12 ? EL[0] : age < 0.3 ? EL[1] : age < 0.6 ? EL[2] : EL[3];
      if (age > 0.6 && (f12 & 1)) continue;
      for (let j = -1; j <= 1; j++) for (let i = -2; i <= 2; i++) put(HEAD_X + u + i + j * 2, HEAD_Y + v + d * i, j === 0 ? c : (age < 0.3 ? EL[2] : EL[3]));
    }
  }

  return {
    name: '赤邪眼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.iris, m.hot, m.vein], HIT_POINT: [2, -13], EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'blood', style: 'blade', w: 0.15, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
