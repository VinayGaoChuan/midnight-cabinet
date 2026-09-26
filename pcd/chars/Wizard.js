// 巫师（部队 · 科技 · 祭司 · 优质 · 远程）：疯狂电学家——高个细长、弓着背往前探的「怪博士」，深紫实验长褂拖到小腿，
// 背上一台黄铜手摇发电机（圆铜壳 + 侧面曲柄），顶上立两根铜避雷针高出头 6 格；一头静电炸毛的白发把头撑宽到 12 格，额上一副单片放大镜；
// 两手各握一根铜电极棒，平时交叉在身前。
// 攻击：两根电极棒并拢指向目标，棒头之间拉出一道折线紫电弧打过去。
// 技能表现特性「充能」（中范围光环，友军攻速 +10%）：反手疯狂摇曲柄（越摇越快），避雷针之间的电弧由细变粗，白发全部竖直；
// 施放时两根电极棒举过头顶交叉，避雷针向四周射出 5 道折线电弧（两道连到身边友军），落点炸紫火花；
// 命中：地面一圈紫色点阵环向外扩散 3 次、一次比一次快，友军站位上跳起小电火花。
// 死亡（化灰）：被自己的发电机反噬，全身紫白闪两帧僵直 → 冒黑烟变成焦黑剪影 → 从头到脚化灰塌落，两根避雷针最后倒下。
// 升级线：巫师 → 监工（发电机变成步行椅的秘银核心引擎、炸毛白发留着、电极棒变成铆钉枪电极与手杖）。
PCD.define('Wizard', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_EMBER, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx, allyPoints, allyFx, fxRamp, keyer } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：充能 · 紫电（白 → 淡紫 → 紫 → 深紫 → 靛紫，全部是共享色）─────
  const R_EL = fxRamp('wizVolt', [21, 43, 24, 42, 25]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: { r: [25, 52, 42, 54], band: 2 },                       // 深紫实验长褂（大面积 band 2；亮部用灰紫 54，亮紫 24 只点在左上肩和两道褶上）
    coatHi: [25, 52, 42, 24],                                     // 长褂上仅有的几格亮紫：左上肩 + 两道褶
    sleeve: [25, 52, 42, 54], cuff: [0, 0, 52, 28],               // 袖子；烫焦的袖口
    pants: 'stone', shoe: 'boot', skin: 'skin', hair: 'white', collar: 'white',
    brass: 'gold', rod: 'gold', strap: 'leather', vent: 'iron', knob: 'wood',
    eye: { r: [0, 0, 0, 0], flat: 1 }, glass: { r: [39, 41, 22, 21], flat: 1 },
    ball: { r: [20, 19, 14, 5], flat: 1 },                        // 电极铜球（待机）
    hot: { r: [25, 24, 43, 21], flat: 1 },                        // 充电的铜球 / 针尖（发光体）
  });
  const ZAP = E.defMat([25, 24, 43, 21], 1), CHAR = E.defMat([10, 0, 52, 28], 1);   // 反噬紫白 / 焦黑剪影（外沿一圈灰烬色 10，夜空里看得出轮廓）
  const MZ = {}, MC = {}; for (const k in M) { MZ[k] = ZAP; MC[k] = CHAR; }
  const BODY = { body: 'tall', sw: 3, lw: 2, arm: 12, stride: 3, lift: 2 };   // 高个细长：腿 11 + 身 10 + 头 6 ≈ 28 格，炸毛 + 避雷针到 34
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(66, 54, 32, 49);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'hair', 'ball', 'hot', 'glass', 'eye', 'rod', 'knob', 'collar']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 电极棒方向（16 档，0 朝上、顺时针；斜向吸附 1:2 / 45° / 2:1）─────
  const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
  const along = (x, y, d, i) => { const v = DIRS[d & 15], m = Math.max(Math.abs(v[0]), Math.abs(v[1])); return [x + RD(v[0] * i / m), y + RD(v[1] * i / m)]; };
  const ROD = 11;                                                   // 电极杆长（握点到杆头；铜球中心在 ROD + 2）

  // ───── 姿势：前手 hx/hy + 前电极方向 ra；后手 bhx/bhy + 后电极方向 rb ─────
  const P = { hx: 0, hy: 0, ra: 0, bhx: 0, bhy: 0, rb: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    hair: 0, crank: 0, gem: 0, rim: 0, eyes: 0, flash: 0, skin: 0, rods: 0, pile: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, t1x: 0, t1y: 0, t2x: 0, t2y: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, ra, bhx, bhy, rb, lean, head) => ({ hx, hy, ra, bhx, bhy, rb, lean, head });
  const K_IDLE = K(2, -9, 17, 4, -14, 11, 1, 0);                  // 两根电极棒在胸前交叉成 X（前棒陡、后棒缓，交点在后手拳上）：前手的朝前上（铜球伸出身前），后手的朝后下（铜球伸出长褂后沿、在发电机下面）
  const K_RUB = K(3, -10, 17, 5, -15, 11, 1, 0);                  // 搓电极棒（交叉握法不变，两手来回错一格）
  const K_WIND = K(3, -15, 16, 1, -14, 16, 0, -1);                // 预兆：两棒竖起收到胸前
  const K_ZAP = K(9, -16, 20, 8, -14, 20, 2, 1);                  // 出手：两棒并拢平指目标
  const K_HOLD = K(8, -15, 20, 7, -13, 21, 2, 0);
  const K_CHARGE = K(6, -25, 16, -9, -15, 24, 0, -1);             // 蓄力：前手举棒朝天，后手反手摇曲柄
  const K_CAST = K(4, -28, 14, 1, -28, 18, 0, -1);                // 施放：两棒举过头顶交叉
  const K_HURT = K(2, -12, 11, -1, -12, 13, -1, -1);
  const K_STIFF = K(9, -19, 19, -4, -25, 15, -1, -1);             // 反噬：僵直，两臂张开
  const FIELDS = ['hx', 'hy', 'ra', 'bhx', 'bhy', 'rb', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = keyer([['hx', -16, 24], ['hy', -40, 0], ['ra', 0, 15], ['bhx', -20, 20], ['bhy', -40, 0], ['rb', 0, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8]]);
  const KEY2 = keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['bend', 0, 3], ['hair', 0, 3], ['crank', 0, 3], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['skin', 0, 2], ['rods', 0, 2], ['pile', 0, 3], ['dqi', 0, 48], ['st', 0, 8]]);
  const T_ZAP = 2 / 12, D_CRUMB = 1.3, D_ROD = 1.5;

  // 发电机几何（rig 本地坐标）：圆铜壳中心、曲柄轴、两根避雷针的针尖
  const CRANK = [[0, -3], [-3, 0], [0, 3], [3, 0]];
  function dynGeo(R) {
    const bx = parts.edges(R, R.yS + 3)[0], cx = bx - 4, cy = R.yS + 4, tip = R.htop - 6;
    return { cx, cy, hub: [cx - 5, cy + 1], r1: cx - 3, r2: cx + 2, top: cy - 5, tip };
  }
  const knob = (G, c) => [G.hub[0] + CRANK[c & 3][0], G.hub[1] + CRANK[c & 3][1]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.crouch = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.hair = 0; P.crank = 0; P.gem = 0; P.rim = 1;
    P.eyes = 0; P.flash = 0; P.skin = 0; P.rods = 0; P.pile = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    let crankHand = 0;                                               // 1 = 后手握在曲柄把手上（位置跟着曲柄转）
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      P.gem = (f12 % 8) === 5 ? 1 : 0;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.1 - 1e-6 && lp < 1.8) { crankHand = 1; P.crank = f12of(lp - 1.1) & 3; P.hair = lp >= 1.4 ? 1 : 0; P.head = -1; P.gem = lp >= 1.55 && lp < 1.7 ? 2 : 1; }   // 待机个性：反手摇几圈曲柄，炸毛更竖、针尖跳电弧
      else if (lp >= 1.8 - 1e-6 && lp < 2.2) { setK(K_RUB, K_RUB, 0); if (f12 & 1) { P.hx += 1; P.bhx -= 1; } P.hair = 1; }            // 然后满意地搓搓电极棒
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 踮脚急走：上身前探，长褂下摆两片后甩
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq)); P.lean = 2; P.bend = P.wup ? 2 : 1;
      P.hx += P.step; P.bhx -= P.step; P.hy += P.wup ? -1 : 0; P.ra += P.step; P.rb -= P.step < 0 ? 1 : 0;   // 交叉握法不变，两根棒随步子摆一档角度 P.hair = P.wup ? 1 : 0;
      const w = walkDemo(tq, 16, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < 0.25) { setK(K_ZAP, K_ZAP, 0); P.gem = 3; P.rim = 2; P.hair = 1; P.sway = -1; P.bend = 1; }
      else if (tq < 0.45) { setK(K_ZAP, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.gem = 2; P.hair = 1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.gem = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                      // 越摇越快：前 0.5 s 每 3 帧一档，之后每 2 帧，最后 0.4 s 每帧
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_CHARGE, q);
      const sp = tq < 0.5 ? 3 : tq < 1.0 ? 2 : 1; P.crank = Math.floor(f12 / sp) & 3; crankHand = q > 0.55 ? 1 : 0;
      P.hair = tq < 0.35 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.bend = tq > 0.7 ? 1 + (f12 & 1) : 0; P.bob = tq > 1.0 ? f12 & 1 : 0;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.hair = 2; P.crank = f12 & 3; P.bend = 3; }
    else if (st === RECOVER) {                                        // 收招：曲柄慢下来，头发塌回一半
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q);
      P.crank = tq < 0.45 ? Math.floor(f12 / 3) & 3 : 0; P.hair = q < 0.6 ? 1 : 0; P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.hair = 3; P.sway = 2; P.bend = 2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.hair = 3; P.sway = 1; P.eyes = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 化灰：受击 → 反噬紫白闪两帧僵直 → 焦黑剪影冒黑烟 → 从头到脚塌成一堆灰，避雷针最后倒下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 1 / 6 - 1e-6) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.hair = 3; P.sway = 2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gem = 2; }
      else {
        setK(K_STIFF, K_STIFF, 0); P.bx = -2; P.eyes = 1; P.hair = 2; P.crank = 1;
        if (d < 1 / 3 - 1e-6) { if (f12 & 1) P.flash = 1; else P.skin = 1; P.gem = 3; }   // 紫白两帧
        else {
          P.skin = 2; P.gem = 4;
          if (d >= D_CRUMB) { P.dq = clamp01((d - D_CRUMB) / 1.0); P.pile = P.dq < 0.2 ? 1 : P.dq < 0.45 ? 2 : 3; }
          P.rods = d < D_ROD - 0.1 ? 0 : d < D_ROD - 1e-6 ? 1 : 2;
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob;
    P.lean = RD(P.lean); P.head = RD(P.head);
    const R = parts.rig(P, BODY), G = dynGeo(R);
    if (crankHand) { const k = knob(G, P.crank); P.bhx = k[0]; P.bhy = k[1] - yo; P.rb = 24; }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ra = ((RD(P.ra) % 16) + 16) % 16; P.rb = ((RD(P.rb) % 16) + 16) % 16; P.dqi = RD(P.dq * 48);
    const g = along(P.hx, P.hy, P.ra, ROD + 2); P.gx = g[0] + P.bx; P.gy = g[1];
    P.t1x = G.r1 + P.bx; P.t2x = G.r2 + P.bx; P.t1y = P.t2y = G.tip - 1;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：dynamoPack —— 背负手摇发电机：圆铜壳（铆钉 + 墨色散热栅）、侧面曲柄（4 个角度）、壳顶两根铜避雷针（针尖是发光体）
  function dynamo(T, R, Q, crank, rods, lv) {
    const G = dynGeo(R), { cx, cy } = G;
    if (rods === 0 || rods === 1) {                                    // 避雷针（先画，根部压在铜壳下）
      E.part();
      for (const x of [G.r1, G.r2]) {
        if (rods === 0) { for (let y = G.tip; y <= G.top; y++) px(E, T, x, y, M.rod, y === G.tip ? 4 : 0); px(E, T, x - 1, G.tip + 2, M.rod, 3); }
        else for (let k = 0; k <= 9; k++) px(E, T, x - k, G.top - 1 - k, M.rod, k === 9 ? 4 : 0);   // 倒下途中：往后斜 45°
      }
      E.part();
      const tips = rods === 0 ? [[G.r1, G.tip - 1], [G.r2, G.tip - 1]] : [[G.r1 - 10, G.top - 11], [G.r2 - 10, G.top - 11]];
      for (const [x, y] of tips) px(E, T, x, y, lv >= 1 && lv <= 3 ? M.hot : M.ball, lv >= 2 && lv <= 3 ? 4 : 3);
    }
    E.part();                                                          // 圆铜壳
    const W = [3, 4, 5, 5, 5, 5, 5, 4, 3];
    for (let k = 0; k < 9; k++) { const y = cy - 4 + k; run(E, T, y, cx - W[k] + 1, cx + W[k] - 1, Q.brass, 0); }
    run(E, T, cy - 2, cx - 3, cx + 2, Q.brass, 2); run(E, T, cy + 2, cx - 3, cx + 2, Q.brass, 2); px(E, T, cx - 2, cy - 3, Q.brass, 4); px(E, T, cx - 1, cy - 3, Q.brass, 4);   // 两道箍 + 高光
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x += 2) px(E, T, x + (y & 1), y, Q.vent, 1);   // 散热栅
    px(E, T, cx - 4, cy, Q.brass, 4); px(E, T, cx + 4, cy, Q.brass, 2); px(E, T, cx, cy - 4, Q.brass, 4);    // 铆钉
    E.part();                                                          // 曲柄（轴 + 臂 + 木把手）
    const h = G.hub, k = knob(G, crank);
    px(E, T, h[0], h[1], Q.vent, 3); parts.line(E, T, h[0], h[1], k[0], k[1], Q.brass, 3); px(E, T, k[0] + (crank === 1 ? -1 : 0), k[1] + (crank === 0 ? -1 : 0), Q.knob, 3);
    return G;
  }
  // 候选部件：staticHair —— 静电炸毛：画在头之前的一团白发，四面竖起的发尖把头部轮廓撑宽（up 0 平时 · 1 更竖 · 2 全竖 · 3 被打得往后甩）
  const SPIKES = [[-150, 3], [-115, 4], [-80, 4], [-50, 3], [-20, 3], [15, 3], [45, 2]];
  function staticHair(T, R, Q, up) {
    E.part(); const m = Q.hair, x0 = R.hx0, x1 = R.hx1, top = R.htop, cx = (x0 + x1) / 2 - 0.5, cy = top + 2.2;
    for (let y = top - 1; y <= R.hy - 1; y++) run(E, T, y, x0 - 2 + (y > R.ey + 1 ? 1 : 0), x1 - (y >= top + 1 ? 3 : 0), m, 0);   // 发团
    run(E, T, top - 2, x0, x1 - 1, m, 0);
    for (const [a0, L0] of SPIKES) {
      const a = (a0 + (up === 2 ? (a0 < 0 ? 18 : -18) : up === 3 ? -22 : 0)) * Math.PI / 180, L = L0 + (up === 1 ? 1 : up === 2 ? 2 : 0) + (up === 3 && a0 < 0 ? 1 : 0);
      const rx = Math.abs(Math.sin(a)) > 0.7 ? 3.6 : 3.0, sx = cx + Math.sin(a) * rx, sy = cy - Math.cos(a) * 3.2, ex = sx + Math.sin(a) * L, ey = sy - Math.cos(a) * L;
      parts.line(E, T, sx, sy, ex, ey, m, 0); px(E, T, ex, ey, m, 4);
    }
    px(E, T, x0 - 1, top, m, 2); px(E, T, x0, R.ey, m, 2);
  }
  // 候选部件：electrode —— 铜电极棒：1 格铜杆（16 方向吸附）+ 杆尾电线头；杆头铜球是发光体（5 档：待机 / 充电 / 蓄满 / 施放 / 熄灭），单独一个部件
  function electrode(T, Q, hx, hy, d, lv) {
    E.part();
    for (let i = -1; i <= ROD; i++) { const p = along(hx, hy, d, i); px(E, T, p[0], p[1], i === -1 ? Q.vent : Q.rod, i === -1 ? 2 : 0); }   // 杆尾是电线头
    const c = along(hx, hy, d, ROD + 2); ball(T, Q, c[0], c[1], lv); return c;
  }
  function ball(T, Q, x, y, lv) {
    E.part();
    const hot = Q === M ? M.hot : Q.hot, b = Q === M ? M.ball : Q.ball;
    const core = lv === 0 ? [b, 3] : lv === 1 ? [hot, 3] : lv === 4 ? [b, 1] : [hot, 4];
    const edge = lv === 0 ? [b, 2] : lv === 1 ? [b, 3] : lv === 2 ? [hot, 3] : lv === 3 ? [hot, 4] : [b, 1];
    px(E, T, x, y, core[0], core[1]); for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(E, T, x + ax, y + ay, edge[0], ax < 0 || ay < 0 ? edge[1] : Math.max(1, edge[1] - (lv === 3 ? 0 : 1)));
    if (lv === 0) px(E, T, x - 1, y - 1, b, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const Q = P.skin === 1 ? MZ : P.skin === 2 ? MC : M, R = parts.rig(P, BODY), lv = P.gem;
    const G = dynamo(R, R, Q, P.crank, P.rods, lv);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: Q.sleeveD, cuff: Q.cuffD, grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: Q.pants, matD: Q.pantsD, boot: Q.shoe, bootD: Q.shoeD, w: 2 });
    parts.torso(E, R, P, { style: 'coat', mat: Q.coat, collar: Q.collar, buttons: Q.brass, strap: Q.strap, hem: -4, flare: 2.5 });
    { const y0 = R.yS + 1, L = parts.edges(R, y0)[0], L2 = parts.edges(R, R.yHip - 2)[0];   // 同一个部件里点亮紫：左上肩一小段 + 后片两道 2–3 格的褶
      px(E, R, L + 1, y0, Q.coatHi, 4); px(E, R, L + 2, y0, Q.coatHi, 4); px(E, R, L + 1, y0 + 1, Q.coatHi, 4);
      for (let k = 0; k < 3; k++) px(E, R, L2 + 2, R.yHip - 2 + k, Q.coatHi, 4); for (let k = 0; k < 2; k++) px(E, R, L2 + 4, R.yHip + 1 + k, Q.coatHi, 4); }
    staticHair(R, R, Q, P.hair);
    parts.head(E, R, P, { mat: Q.skin, face: 'gaunt', age: 'old', eye: Q.eye, brow: Q.hair, nose: 'long', mouth: 'line', ear: 'dot' });
    { const x1 = R.hx1, top = R.htop; run(E, R, top, R.hx0 + 1, x1 - 2, Q.strap, 2); px(E, R, x1 - 1, top, Q.brass, 4); px(E, R, x1, top, Q.glass, 3); px(E, R, x1 + 1, top, Q.brass, 3); px(E, R, x1, top - 1, Q.brass, 4); }   // 额上单片放大镜（和脸同一个部件）
    if (P.skin === 2) { E.part(); const b = P.pile; if (b) for (let k = 0; k < b; k++) run(E, parts.FREE, -k, -3 - b * 2 + k * 2, 3 + b * 2 - k * 2, CHAR, k === b - 1 ? 3 : 0); }   // 脚边的灰堆
    electrode(R, Q, P.bhx, P.bhy, P.rb, lv);
    parts.hand(E, R, P, { side: 'B', hand: Q.skinD });
    electrode(R, Q, P.hx, P.hy, P.ra, lv);
    parts.arm(E, R, P, { sleeve: 'loose', mat: Q.sleeve, cuff: Q.cuff, hand: Q.skin });
    if (P.rods === 2) {                                                // 倒在身后地上的两根避雷针（黄铜没被烧黑）
      E.part(); const T = parts.FREE, x0 = G.cx - 6;
      run(E, T, -1, x0 - 10, x0, M.rod, 0); run(E, T, -3, x0 - 8, x0 + 1, M.rod, 0); px(E, T, x0 - 11, -1, M.ball, 3); px(E, T, x0 - 9, -3, M.ball, 3); px(E, T, x0 - 9, -4, M.ball, 4);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let sparkAcc = 0, chargeAcc = 0, smokeAcc = 0, ashAcc = 0, hopAcc = 0, lastStep = 0, lastCrank = -1, arcT = 9, mzT = 9, pulseT = 9, lastRing = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const RINGS = [[0.05, 0.46], [0.42, 0.32], [0.66, 0.2]];            // 地面紫环：起点、时长（一次比一次快）
  function tips() { return [[wx(P.t1x), wy(P.t1y)], [wx(P.t2x), wy(P.t2y)]]; }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX - 2, HY + 1, 11, 3, R_EL, 2.2, 2, 0);
    if (s !== CAST) return;
    const T = tips(), sx = RD((T[0][0] + T[1][0]) / 2), sy = T[0][1] - 1, A = allyPoints();
    const ends = [[A[0].x, A[0].top + 2], [A[1].x, A[1].top + 2], [HX - 30, HY], [HX + 26, HY], [HX - 6, 4]];
    ends.forEach(([x, y], i) => { fx.bolt(sx, sy, x, y, R_EL, 0.3, 2, 11 + i * 7); burst(x, y, 8, 25, 70, 0.15, 0.4, R_EL, 8); });
    for (const a of A) fx.link(sx, sy, a.x, a.top + 2, R_EL, 1.0, 1);
    releaseOrbit(40, 90, 0.25, 0.55, { pts: 1 });
    fx.cross(sx, sy, 6, R_EL, 0.25, 2);
    allyFx({ dur: 1.15, outline: R_EL });
    pulseT = 0; lastRing = -1;
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'bolt', w: 0.35 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_ZAP) {                                 // 两棒并拢，棒头拉出一道折线紫电弧打到目标
      mzT = 0; const x = wx(P.gx), y = wy(P.gy);
      fx.bolt(x + 1, y, DUMMY_X - 2, HY - 15, R_EL, 0.22, 2, 5); fx.cross(x + 1, y, 3, R_EL, 0.15, 2);
      burst(DUMMY_X - 3, HY - 15, 10, 30, 80, 0.15, 0.4, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('hit', { mat: 'magic', w: 0.3 });
    }
    if (s === DEATH && t === INCOMING + D_ROD) {                       // 避雷针最后倒下：叮当两声 + 几点火星
      const x = wx(-18);
      for (let i = 0; i < 6; i++) spawn(K_DUST, x + Math.random() * 10, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
      burst(x + 2, HY - 2, 5, 15, 40, 0.1, 0.3, R_EL, 6); sfx('fall', { w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_ZAP], [], [], [], [], [INCOMING + D_ROD], []];
  function impactOn() {}
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy), T = tips();
    if (state === CHARGE) {                                            // 电火花从四周汇向两根针尖
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const tp = T[Math.random() < 0.5 ? 0 : 1], sx = tp[0] + (Math.random() - 0.5) * 36, sy = tp[1] + 4 + Math.random() * 22, dx = sx - tp[0], dy = (sy - tp[1]) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, tp[0], tp[1], r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), tx: tp[0], ty: tp[1], orbitR: 2 });
      }
    }
    if ((state === CAST || state === RECOVER) && pulseT < 1.0) {        // 命中：三圈地面环扩散时，友军站位上跳起小电火花
      const k = RINGS.findIndex(([s0, d0]) => pulseT >= s0 && pulseT < s0 + d0);
      if (k >= 0 && k !== lastRing) {
        lastRing = k;
        for (const a of allyPoints()) for (let i = 0; i < 4; i++) spawnX(K_PHYS, a.x - 4 + Math.random() * 8, HY - 2 - Math.random() * 12, (Math.random() - 0.5) * 30, -45 - Math.random() * 25, 0.45 + Math.random() * 0.2, R_EL, { g: 220, floor: HY });
      }
    }
    if (state === MOVE && P.step !== lastStep) {                       // 碎步：只有接触 A 那一步带起 1 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.25 }); if (P.step > 0) spawn(K_DUST, wx(4), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if ((state === IDLE || state === CHARGE || state === CAST) && P.crank !== lastCrank) { if (state !== IDLE || P.hair) spawn(K_EMBER, T[(P.crank & 1)][0], T[0][1] - 1, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.3, R_EL); lastCrank = P.crank; }
    if (state === DEATH) {
      const d = stT - INCOMING;
      if (d > 0.35 && d < D_CRUMB + 0.3) { smokeAcc += dt * 20; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_RISE, wx(-6 + Math.random() * 12), wy(-8 - Math.random() * 22), (Math.random() - 0.5) * 6, -8 - Math.random() * 10, 0.7 + Math.random() * 0.5, FXI.dust, { age0: 0.5 }); } }
      if (d > 0.35 && d < D_CRUMB) {                                  // 焦黑剪影静止时：沿外沿不时升起一颗紫电火星，轮廓在夜空里不丢
        sparkAcc += dt * 9; while (sparkAcc >= 1) { sparkAcc -= 1; const y = -4 - Math.random() * 28, side = Math.random() < 0.5 ? -1 : 1, x = side < 0 ? -8 - (y < -18 ? 5 : 0) : 5 + (y < -20 ? 2 : 0); spawn(K_RISE, wx(x + RD(Math.random() * 2) * side) - 2, wy(y), side * (2 + Math.random() * 4), -10 - Math.random() * 10, 0.5 + Math.random() * 0.3, R_EL); }
      }
      if (d > D_CRUMB && d < D_CRUMB + 1.0) {                          // 化灰：消散线上落下灰屑、升起紫色魂光
        const yl = -34 + 34 * clamp01((d - D_CRUMB) / 1.0);
        ashAcc += dt * 40; while (ashAcc >= 1) { ashAcc -= 1; const x = wx(-7 + Math.random() * 14), y = wy(yl + Math.random() * 3); if (Math.random() < 0.7) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 16, 4 + Math.random() * 10, 0.6 + Math.random() * 0.4, FXI.dust, { g: 60, floor: HY, age0: 0.4 }); else spawn(K_RISE, x, y, (Math.random() - 0.5) * 8, -14 - Math.random() * 12, 0.7 + Math.random() * 0.5, R_EL); }
      }
    }
    arcT += dt; mzT += dt; pulseT += dt;
    if (state === IDLE && P.gem === 2 && arcT > 0.2) arcT = 0;
  }
  function fxReset() { sparkAcc = 0; chargeAcc = 0; smokeAcc = 0; ashAcc = 0; hopAcc = 0; lastStep = 0; lastCrank = -1; arcT = 9; mzT = 9; pulseT = 9; lastRing = -1; }
  // 避雷针之间的电弧：从针尖往上拱的一道折线（thick 1 细 · 2 粗双行），每帧抖动
  function arc(f12, thick, c0, c1) {
    const T = tips(), x0 = T[0][0], x1 = T[1][0], y0 = T[0][1], lo = Math.min(x0, x1), hi = Math.max(x0, x1);
    for (let x = lo; x <= hi; x++) {
      const q = (x - lo) / Math.max(1, hi - lo), bow = RD(Math.sin(q * Math.PI) * 2), j = E.hash(x, f12) < 0.5 ? 0 : 1, y = y0 - bow - j;
      put(x, y, c0); if (thick > 1) put(x, y - 1, c1);
    }
    put(lo, y0, c0); put(hi, y0, c0);
  }
  function fxBack(f12) {
    if (P.dq < 1 && P.skin === 0) floorGlow(HX + 2, P.rim, EL, f12);
    if (pulseT < 1.0) for (const [s0, d0] of RINGS) {                  // 地面紫色点阵环（以巫师为中心，向外扩散）
      const q = (pulseT - s0) / d0; if (q < 0 || q >= 1) continue;
      const r = 4 + 34 * ease.out(q), ry = r * 0.24, n = Math.ceil(r * 3.2), c = q < 0.25 ? EL[0] : q < 0.55 ? EL[1] : q < 0.8 ? EL[2] : EL[3], cx = HX + 1;
      for (let i = 0; i < n; i++) { if ((i & 1) || (q > 0.6 && ((i >> 1) + f12) % 3 === 0)) continue; const a = i / n * 6.2832; put(RD(cx + Math.cos(a) * r), RD(HY + Math.sin(a) * ry), c); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy), st = E.state, t = E.stT;
    if (P.dq < 1 && P.skin === 0 && P.rods === 0) {
      if (st === CHARGE) { const q = t / DUR[CHARGE]; if (q > 0.6 || (q > 0.25 ? (f12 & 1) === 0 : f12 % 3 === 0)) arc(f12, q > 0.6 ? 2 : 1, q > 0.6 ? EL[0] : EL[1], EL[2]); }
      else if (st === CAST) arc(f12, 2, EL[0], EL[1]);
      else if (st === RECOVER && t < 0.35 && (f12 & 1)) arc(f12, 1, EL[2], EL[3]);
      else if (arcT < 0.17) arc(f12, 1, EL[1], EL[2]);
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.skin === 0) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2]; for (let r = 1; r <= 3; r++) { put(gx + 1 + r, gy, c); put(gx + 1, gy - r, EL[2]); put(gx + 1, gy + r, EL[2]); } }
  }

  return {
    name: '巫师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.hot], HIT_POINT: [1, -15], EVENTS, ALLIES: 'skill',
    REVIVE: { ramp: R_EL },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'bolt', style: 'buff', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
