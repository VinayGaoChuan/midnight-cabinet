// 镰刃虫（部队 · 兽人 · 先锋 · 普通；由赤蠕虫升级）：还是那条赤蠕虫——赤红的头和一张满圈白牙的圆口、两根触须（更长，往后扫）、背上的麻布袋（更大，袋口插着一块紫色秘晶）——
// 前段像螳螂一样直直竖起守着阵地（比赤蠕虫高 5 格）；胸前一对骨质镰肢（收起时月牙刃竖在圆口前、两把交叉成 X）；背上一片片锈褐甲壳，每片一根向后勾的淡锈倒刺，赤红只留在甲缝、头和腹部。
// 攻击 = 双镰高举、前冲交叉下劈；技能 = 特性「倒刺」生效的样子：缩低、双镰交叉护住圆口、倒刺逐节竖起，敌弹撞在镰刃上的一瞬，背上 6 根倒刺沿来路扇形射回、一根接一根钉进目标。
// 死亡 = 翻肚蜷缩：后仰 → 翻身肚皮朝上撑在倒刺上 → 镰肢蜷起抽搐两下 → 倒刺一根根伏平 → 宝袋滚开、秘晶掉出闪一下 → 消散 + 魂光。
// 身体用 parts-beast 的 serpent 骨架（rig + body）；竖起的胸节、镰肢、倒刺、甲缝、宝袋、圆口头、翻肚的身体是本模块自己画的（见「候选部件」注释）。
PCD.define('SickleWorm', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, ramp, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, shoot } = E;
  const B = E.parts.beast, S = B.serpent, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const CARA = ramp(['#1a0c06', '#4a2410', '#7a4020', '#b06a38']);                        // 锈褐甲壳
  const R_EL = fxRamp('rustThorn', [21, '#f0c8a0', '#c87a3a', '#7a3a1a', '#3a1408']), EL = FXR[R_EL];   // 倒刺 · 锈棘：白 → 淡锈 → 锈橙 → 锈褐 → 焦锈
  const R_IMP = FXI.impact, R_ENEMY = FXI.enemy;
  const m = B.mats(E, { main: CARA, belly: 'pink', flesh: 'blood', lip: 'pink', teeth: 'white', sack: 'sand', rope: 'leather', gold: 'gold', bone: 'bone', gem: 'purple' });
  m.body = E.defMat(CARA, 1);                                                              // 甲壳：身体只有 8 格粗，暗边 1 格
  m.cap = E.defMat(CARA, 1);                                                               // 头上的甲盖（和头同一个部件，材质不同 → 交界处自动明暗）
  m.edge = E.defMat([8, 17, 21, 21], 1, 1);                                                // 镰刃刃口（平涂白）
  m.throat = E.defMat([55, 55, 56, 56], 1, 1);
  m.spark = E.defMat([21, 21, 21, 21], 1, 1);                                              // 倒刺挨打闪白
  m.ember = E.defMat([EL[4], EL[3], EL[3], EL[2]], 1, 1);                                  // 甲缝透出的锈光（平涂锈褐）
  m.ember2 = E.defMat([EL[3], EL[2], EL[2], EL[1]], 1, 1);                                 // 甲缝透光最亮档（平涂锈橙）
  m.gemGlow = E.defMat([43, 43, 21, 21], 1, 1);                                            // 秘晶亮芯
  m.thorn = E.defMat([CARA[0], EL[2], EL[1], EL[1]], 1);                                  // 倒刺：锈橙刺根 + 淡锈刺身，压在深褐甲壳和夜空上都看得出

  // ───── 形体：竖起蠕虫档，贴地身长 18 + 竖起的胸节 10；胸节粗（r 4 → 3.3）、尾尖细（1.2）─────
  const BASE = { n: 24, r: 4, rTail: 1.2, waves: 1.2, rise: 10, neck: 1, head: 'worm', hl: 6, hh: 6, bands: 0, belly: 0, scales: 0, spikes: 0, m };
  const OS = [0.6, 1.3, 2.2].map((a) => S.shape(Object.assign({}, BASE, { arch: a })));
  const X0 = -BASE.n * 0.62, X1 = BASE.n * 0.2;
  let NG = 0; for (let x = X0; x <= X1 + 0.01; x += 1) NG++;                                 // 贴地段脊点数（serpent.rig：尾尖 → 颈根每格一个）
  const HEAD = { rx: 3.3, ry: 3.5, md: 2.5, antN: 5, antF: 4 };
  const BAND = 4, SACK_X = -12.5, DROP = { at: 0.5, dur: 0.3, dx: -11, hop: 5 };

  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 60, 46, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 7, 9], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['teeth', 'edge', 'spark', 'throat', 'ink', 'ember', 'ember2', 'gem', 'gemGlow', 'rope', 'gold', 'belly', 'lip', 'flesh', 'sack']) RIM.skip[m[k]] = 1;

  // ───── 镰肢姿势表（相对肩点 S）：[肘 ex, ey, 刃尖 tx, ty（相对肘；G = 1 时 tx 相对肩、刃尖插在地上）, 刃弯 bx, by（弦中点往外凸的偏移）, G] ─────
  const LIMB = [
    [4.5, 0, -1.5, -6.5, 1.6, 0.3],       //  0 收起（近）：股节往前平伸，月牙刃从肘往上竖起、刃尖勾向圆口（护在圆口前）
    [2, -0.5, 5, -6, -0.6, -0.8],         //  1 收起（远）：刃从后下斜到前上，和近侧在圆口前交叉成 X
    [5, -3, 3.5, -3.5, 1.2, 1.2],         //  2 张开（近）：抖刺个性里镰肢张开
    [3, -5, 2, -4.5, 1.2, 1],             //  3 张开（远）
    [2.5, -8.5, 1.5, -6, 1.6, 0.4],       //  4 高举（近）：双镰举过头顶，刃尖朝上
    [1, -8, -1, -6.5, 1.2, -0.8],         //  5 高举（远）
    [7, -3, 3.5, 7, 1.6, -1.2],           //  6 下劈（近）：股节前伸，刃往前下劈
    [6, -5.5, 5, 6.5, 1.5, -1.5],         //  7 下劈（远）
    [4, -2, -2, -6.5, 1.4, 0.4],          //  8 交叉护身（近）：刃竖在圆口前
    [2, -2.5, 6, -7, -0.6, -0.9],         //  9 交叉护身（远）：和近侧在圆口前交叉成 X
    [5.5, -2.5, 3, -6.5, 1.6, 0.6],       // 10 施放张开（近）：刃往前上甩开
    [3, -5, 1, -7, 1.3, 0.4],             // 11 施放张开（远）
    [4, -2, 8, 0, 1.4, -1, 1],            // 12 步行：往前插地
    [2.5, -1, 4, 0, 1.2, -0.8, 1],        // 13 步行：插在地上往后拖
    [3.5, -4.5, 2, 4.5, 1.6, -0.6],       // 14 步行：抬起
    [5, -3.5, 3.5, 3, 1.6, -1],           // 15 步行：往前伸
    [1, -6, -4, -2, -0.3, -1.5],          // 16 受击：往后甩
    [1.5, -3, -2.5, 1.5, -0.2, -1],       // 17 死：蜷起
    [2, -4, -1.5, 2.5, 0.2, -1],          // 18 死：抽搐
  ];
  const WALK_N = [12, 13, 14, 15], WALK_F = [14, 15, 12, 13];

  // ───── 姿势字段 ─────
  //   arch 拱起档 · ant 触须 -1 后贴 / 0 / 1 竖起 / 2 前抖 · nL / fL 近 / 远镰肢姿势（LIMB 下标）· lean 胸节后仰 0–3
  //   spk 倒刺基础档 0 伏平 – 3 竖到最高 · spc 蓄力时从尾到头竖起的进度 0–4 · spw 待机抖刺的波浪 0 无 / 1–4 · spf 死亡时从尾到头伏平的根数 0–8
  //   gone 倒刺 0 在 / 1 射出去了 / 2 新长出 1 格 · sflash 倒刺闪白 · gg 甲缝透光 0–2 · bup 翻肚 · plift 翻肚撑起高度 0–5 · cry 秘晶 0 袋里 / 1 飞出 / 2 落地闪 / 3 落地
  const MINE = [['arch', 0, 2], ['ant', -1, 2], ['nL', 0, 18], ['fL', 0, 18], ['lean', 0, 3], ['spk', 0, 3], ['spc', 0, 4], ['spw', 0, 4], ['spf', 0, 8],
    ['gone', 0, 2], ['sflash', 0, 1], ['gg', 0, 2], ['bup', 0, 1], ['plift', 0, 5], ['cry', 0, 3]];
  const SPEC = S.KEYS.concat(B.COMMON, MINE);
  const P = {};
  function reset() {
    S.reset(P); P.gf = 1; P.arch = 1; P.ant = 0; P.nL = 0; P.fL = 1; P.lean = 0; P.spk = 1; P.spc = 0; P.spw = 0; P.spf = 0;
    P.gone = 0; P.sflash = 0; P.gg = 0; P.bup = 0; P.plift = 0; P.cry = 0; P.gx = 0; P.gy = 0;
  }
  reset();
  let rig = null, tipN = [0, 0], tipF = [0, 0], shoulder = [0, 0], mouth = [0, 0], back = [0, 0];
  const T_HIT = 2 / 12, T_SHOT = 0.85, T_BLOCK = 1.02, T_LAND = INCOMING + 0.66;

  const WAVE = [[1, 2, 3], [2, 2, 3], [3, 0, 1], [4, 0, 1], [0, 0, 1]];                     // 抖刺个性（1.6–2.0 s）：[spw, nL（2 = 张开）, fL]
  function idle(tq, f12) {
    const lp = S.anim.idle(P, tq, f12, DUR[IDLE]); P.tongue = 0;
    const b = Math.floor((f12 / 12) * 2.5 + 1e-6); P.arch = b & 1 ? 1 : 0; P.ant = b & 1 ? 0 : 1;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), w = WAVE[k]; P.spw = w[0]; P.nL = w[1]; P.fL = w[2]; P.ant = 1; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                // 镰步：两把镰刃交替插地把身体往前拖，后段拱起跟上
      S.anim.walk(P, tq); P.rise -= 2; P.strike = 0; P.arch = 2; P.nL = WALK_N[P.gf]; P.fL = WALK_F[P.gf]; P.ant = [0, 1, 0, -1][P.gf];
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { P.nL = 4; P.fL = 5; P.rise = 1; P.bx = -1; P.ant = -1; P.arch = 2; P.jaw = 1; }   // 双镰高举
      else if (tq < 0.25) { P.nL = 6; P.fL = 7; P.bx = 3; P.rise = -1; P.jaw = 2; P.ant = 2; P.arch = 0; }   // 前冲交叉下劈
      else if (tq < 0.45) { P.nL = 6; P.fL = 7; P.bx = 2; P.rise = -2; P.jaw = 1; P.arch = 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(2 * (1 - q)); P.rise = -R(1 - q); P.nL = q < 0.5 ? 15 : 0; P.fL = q < 0.5 ? 14 : 1; }
    } else if (st === CHARGE) {                                            // 缩低、双镰交叉护住圆口，倒刺从尾到头竖到最高，甲缝透出锈橙光
      const q = ease.inOut(clamp01(tq / 0.7));
      P.rise = -R(2 * q); P.nL = q < 0.5 ? 0 : 8; P.fL = q < 0.5 ? 1 : 9; P.rim = 2; P.ant = -1; P.arch = 1;
      P.spc = tq < 0.2 ? 0 : Math.min(4, Math.floor((tq - 0.2) / 0.16) + 1); P.gg = tq < 0.5 ? 0 : 1;
      if (tq >= T_BLOCK && tq < T_BLOCK + 0.17) { P.sflash = 1; P.bx = tq < T_BLOCK + 1 / 12 ? -1 : 0; P.gg = 2; }   // 敌弹撞上镰刃：倒刺闪白、身子一顿
      else if (tq > 1.2) P.gg = (f12 & 1) ? 2 : 1;
    } else if (st === CAST) {                                              // 全身一震，倒刺齐射，镰肢张开（定格 1 帧）
      P.nL = 10; P.fL = 11; P.gone = 1; P.rim = 3; P.rise = -1; P.jaw = 2; P.ant = 2; P.gg = 2; P.bx = tq < 1 / 12 ? -1 : 0; P.arch = 1;
    } else if (st === RECOVER) {                                           // 镰肢收回交叉，甲壳里重新长出新刺，倒刺伏平再竖回
      const q = ease.inOut(clamp01(tq / 0.6));
      P.rise = -R(1 - q); P.nL = tq < 0.2 ? 8 : 0; P.fL = tq < 0.2 ? 9 : 1; P.gone = tq < 0.3 ? 2 : 0; P.spk = tq < 0.5 ? 0 : 1; P.gg = tq < 0.2 ? 1 : 0;
      P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.rise = 1; P.lean = 1; P.jaw = 2; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 3; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.lean = 1; P.jaw = 1; P.nL = 15; P.fL = 14; P.ant = -1; P.spk = 2; }
    } else if (st === DEATH) {                                             // 翻肚蜷缩
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.rise = 2; P.lean = 1; P.jaw = 2; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 3; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.5) { P.bx = -3; P.rise = 1; P.lean = d < 0.42 ? 2 : 3; P.jaw = 1; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 2; }   // 胸节往后仰倒
      else {
        P.bx = -3; P.bup = 1; P.lie = 2; P.jaw = 1; P.ant = -1; P.spk = 2;
        const tw = (d >= 0.75 && d < 0.83) || (d >= 0.92 && d < 1.0); P.nL = tw ? 18 : 17; P.fL = tw ? 17 : 18;   // 镰肢蜷起，抽搐两下
        P.spf = d < 1.0 ? 0 : Math.min(8, Math.floor((d - 1.0) / 0.04) + 1);                                      // 倒刺一根根伏平
        P.plift = d < 0.58 ? 5 : d < 0.66 ? 3 : P.spf < 3 ? 2 : P.spf < 6 ? 1 : 0;                               // 撑在倒刺上 → 慢慢落平
        P.cry = d < 1.1 ? 0 : d < 1.25 ? 1 : d < 1.5 ? 2 : 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0) { const dr = B.dropAt(d, DROP); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2]; }                  // 宝袋滚开
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = S.rig(P, OS[P.arch]); reshape(rig);
    P.gx = R(mouth[0]) + P.bx; P.gy = R(mouth[1]);
    B.key(P, SPEC);
  }

  // rig 的后处理：重排竖起的胸节（螳螂式直立、胸前微凸）、胸节后仰、翻肚撑起，脊线弧长 / 背侧法线，肩点、镰刃尖、圆口
  // 候选部件：serpentThorax（serpent 的颈换成直立粗胸节：二次曲线从颈根直上到头，半径 r → 0.82 r）
  function reshape(g) {
    const p = g.pts, n = p.length / 3, nn = n - NG, o = g.o;
    const b0x = X1, b0y = -o.r, hx = g.neckTop[0], hy = g.neckTop[1], cx = b0x + (g.lie ? 1 : 1.8), cy = (b0y + hy) / 2;
    for (let i = 1; i <= nn; i++) {
      const t = i / nn, it = 1 - t, k = NG + i - 1;
      p[3 * k] = it * it * b0x + 2 * it * t * cx + t * t * hx; p[3 * k + 1] = it * it * b0y + 2 * it * t * cy + t * t * hy; p[3 * k + 2] = o.r * (1 - 0.18 * t);
    }
    g.head = { x: hx + 1.3, y: hy - 0.7, a: 0 };
    if (P.lean) {                                                          // 胸节绕颈根往后仰
      const a = -P.lean * 0.34, c = Math.cos(a), s = Math.sin(a);
      for (let k = NG; k < n; k++) { const x = p[3 * k] - b0x, y = p[3 * k + 1] - b0y; p[3 * k] = b0x + x * c - y * s; p[3 * k + 1] = b0y + x * s + y * c; }
      const x = g.head.x - b0x, y = g.head.y - b0y; g.head = { x: b0x + x * c - y * s, y: b0y + x * s + y * c, a: 0 };
    }
    if (P.bup) { for (let k = 0; k < n; k++) p[3 * k + 1] -= P.plift; g.head = { x: p[3 * n - 3] + 1.5, y: p[3 * n - 2] - 0.5, a: 0 }; }
    g.len = new Float32Array(n); g.nx = new Float32Array(n); g.ny = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      if (k) g.len[k] = g.len[k - 1] + Math.hypot(p[3 * k] - p[3 * k - 3], p[3 * k + 1] - p[3 * k - 2]);
      const a = Math.max(0, k - 2), b = Math.min(n - 1, k + 2); const tx = p[3 * b] - p[3 * a], ty = p[3 * b + 1] - p[3 * a + 1], l = Math.hypot(tx, ty) || 1;
      g.nx[k] = ty / l; g.ny[k] = -tx / l;                                  // 背侧法线（贴地段朝上，竖起段朝后）
      if (P.bup) { g.nx[k] = -g.nx[k]; g.ny[k] = -g.ny[k]; }               // 翻肚：甲壳那一面朝下
    }
    let ks = 0; for (let k = 0; k < NG; k++) if (p[3 * k] <= SACK_X) ks = k; g.kSack = ks;
    const H = g.head; mouth = [H.x + HEAD.md, H.y];
    if (P.bup) shoulder = [H.x - 4, p[3 * n - 2] - p[3 * n - 1] + 0.5];
    else { const k = NG + R(nn * 0.36) - 1, r = p[3 * k + 2]; shoulder = [p[3 * k] - g.nx[k] * (r - 1), p[3 * k + 1] - g.ny[k] * (r - 1)]; }
    tipN = limbGeo(LIMB[P.nL]).T; tipF = limbGeo(LIMB[P.fL]).T;
    { const k = NG - 3; back = [p[3 * k] + P.bx, p[3 * k + 1] - p[3 * k + 2] - 1]; }                  // 轮廓光的光源：背上倒刺那一排（技能的发光处）
  }
  function limbGeo(L) {
    const Sx = shoulder[0], Sy = shoulder[1], Ex = Sx + L[0], Ey = Sy + L[1];
    const Tx = L[6] ? Sx + L[2] : Ex + L[2], Ty = L[6] ? 0 : Ey + L[3];
    return { S: [Sx, Sy], E: [Ex, Ey], T: [Tx, Ty], C: [(Ex + Tx) / 2 + L[4], (Ey + Ty) / 2 + L[5]] };
  }

  // ───── 画（从后往前：远镰肢 → 倒刺 → 身体 → 宝袋 → 秘晶 → 头 → 近镰肢）─────
  // 候选部件：sickleLimb（螳螂式镰肢：甲壳股节 2 格粗 + 骨质月牙刃（二次曲线，刃背 2 格、刃尖 1 格），凹侧一道白刃口；far 1 用暗一级材质、不画刃口）
  function drawSickle(idx, far) {
    part();
    const g = limbGeo(LIMB[idx]), fm = far ? m.far : m.limb, bm = far ? m.boneFar : m.bone;
    U.seg(E, g.S[0], g.S[1], g.E[0], g.E[1], 2, fm, 0);                                     // 股节
    const mx = (g.E[0] + g.T[0]) / 2, my = (g.E[1] + g.T[1]) / 2; let ox = g.C[0] - mx, oy = g.C[1] - my; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
    const len = Math.hypot(g.T[0] - g.E[0], g.T[1] - g.E[1]) + ol, N = Math.max(6, Math.ceil(len * 3));
    const bez = (t) => { const it = 1 - t; return [it * it * g.E[0] + 2 * it * t * g.C[0] + t * t * g.T[0], it * it * g.E[1] + 2 * it * t * g.C[1] + t * t * g.T[1]]; };
    if (!far) for (let i = 0; i <= N; i++) { const t = i / N; if (t < 0.25 || t > 0.85) continue; const [x, y] = bez(t); U.dot(E, x - ox, y - oy, m.edge, 0); }   // 刃口（凹侧）
    if (!far) for (let i = 0; i <= N; i++) { const t = i / N; if (t > 0.6) continue; const [x, y] = bez(t); U.dot(E, x + ox * 0.9, y + oy * 0.9, bm, 0); }      // 刃背（凸侧，前 60% 加厚；远侧只画 1 格粗）
    for (let i = 0; i <= N; i++) { const t = i / N, [x, y] = bez(t); U.dot(E, x, y, bm, t > 0.88 ? 4 : 0); }                                                       // 刃身 + 亮刃尖
    U.dot(E, g.E[0], g.E[1], fm, 4);                                                        // 肘关节亮点
  }
  // 候选部件：serpentSpikes（沿背线的倒刺：贴地段每 4 列一根朝上、胸节背后一根朝后上，画在身体后面、从背线最外那一格往外长；档位 0 伏平 – 3 竖到最高，刺尖往尾巴方向勾 1 格）
  function inBody(X, Y) {                                                  // 身体遮罩：和 serpent.body 同一个画法（每个脊点一个圆盘，圆心取整）
    if (Y > 0) return false; const p = rig.pts, n = p.length / 3;
    for (let k = 0; k < n; k++) { const i = X - R(p[3 * k]), j = Y - R(p[3 * k + 1]), r = p[3 * k + 2]; if (i * i + j * j <= r * r + 0.35) return true; }
    return false;
  }
  function spikeList() {                                                   // [{ x, y 刺根, nx, ny 朝外, hx, hy 往尾巴勾 }]，从尾到头
    const p = rig.pts, n = p.length / 3, nn = n - NG, out = [];
    if (P.bup) {                                                           // 翻肚：甲壳朝下，刺从肚子底下伸出来撑地
      for (let X = R(X1) + 2; X >= R(X0) + 2; X -= 4) { let Y = -40; while (Y < 0 && !inBody(X, Y)) Y++; if (Y >= 0) continue; while (Y < 0 && inBody(X, Y + 1)) Y++; out.unshift({ x: X, y: Y, nx: 0, ny: 1, hx: -1, hy: 0 }); }
      return out;
    }
    const sx = R(p[3 * rig.kSack]);
    for (let X = R(X1) - 6; X >= R(X0) + 2; X -= 4) {                        // 贴地段：每 4 列一根，被宝袋盖住的不画
      if (P.drop === 0 && Math.abs(X - sx) < 4.5) continue;
      let Y = -40; while (Y < 0 && !inBody(X, Y)) Y++; if (Y >= 0) continue;
      out.unshift({ x: X, y: Y, nx: 0, ny: -1, hx: -1, hy: 0 });
    }
    for (const t of [0.72]) {                                              // 胸节背后：朝后上方斜伸，刺尖往后勾
      const k = NG + R(nn * t) - 1, Y = R(p[3 * k + 1]); let X = R(p[3 * k]) - 8; while (X < 20 && !inBody(X, Y)) X++;
      out.push({ x: X, y: Y, nx: -1, ny: -1, hx: -1, hy: 0 });
    }
    return out;
  }
  function spikeLv(i, N) {
    let lv = P.spk;
    if (P.spc && i < N * P.spc / 4) lv = 3;
    if (P.spw && Math.floor(i * 4 / N) === P.spw - 1) lv = 3;
    if (P.spw && Math.floor(i * 4 / N) === P.spw - 2) lv = 2;
    if (P.bup) lv = i < P.spf ? 0 : 2;                                  // 翻肚后从尾到头一根根伏平
    return lv;
  }
  function drawSpikes() {
    part();
    const list = spikeList(), N = list.length;
    for (let i = 0; i < N; i++) {
      const s = list[i], x = s.x, y = s.y, nx = s.nx, ny = s.ny, hx = s.hx, hy = s.hy;
      if (P.gone) { U.dot(E, x + nx, y + ny, m.thorn, 2); if (P.gone === 2) U.dot(E, x + 2 * nx, y + 2 * ny, m.thorn, 4); continue; }   // 刺射出去了只剩刺座 / 新刺冒头 1 格
      const lv = spikeLv(i, N), mat = P.sflash ? m.spark : m.thorn;
      U.dot(E, x, y, mat, 2); U.dot(E, x + hx, y + hy, mat, 2);                              // 刺根 2 格宽（往尾巴那边多 1 格）
      if (lv === 0) { U.dot(E, x + nx + 2 * hx, y + ny + 2 * hy, mat, 3); continue; }       // 伏平：贴着背往后倒
      const L = lv + 3;                                                    // 伸出背线的格数：1 档 3 格、2 档 4 格、3 档 5 格（画在身体后面，贴背线那 1 格压成深色刺座）
      for (let j = 1; j < L; j++) U.dot(E, x + nx * j, y + ny * j, mat, 3);
      if (lv === 3) U.dot(E, x + nx * L, y + ny * L, mat, 4);                                // 竖到最高：笔直
      else U.dot(E, x + nx * (L - 1) + hx, y + ny * (L - 1) + hy, mat, 4);                  // 刺尖往后勾
    }
  }
  // 身体：serpent.body 画甲壳圆盘，紧跟着画腹侧的赤肉 + 浅粉腹线、甲缝（赤肉 / 蓄力时透光）、甲片后沿高光、尾刺（同一个部件）
  function drawBody() {
    const o = OS[P.arch], p = rig.pts, n = p.length / 3;
    S.body(E, rig, P, o);
    const gapM = P.gg >= 2 ? m.ember2 : P.gg ? m.ember : m.flesh;
    for (let k = 0; k < n; k++) {
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2], nx = rig.nx[k], ny = rig.ny[k];
      if (r >= 1.2) U.dot(E, x - nx * (r - 0.4), y - ny * (r - 0.4), m.belly, 0);                                   // 浅粉腹线
      if (k >= NG - 1 && r >= 2.6) U.dot(E, x - nx * (r - 1.4), y - ny * (r - 1.4), m.flesh, 0);                  // 胸节正面一行赤肉（赤蠕虫的肉身还露在胸前）
      const L = rig.len[k], ph = (L + 1) % BAND, step = k ? L - rig.len[k - 1] : 1;
      if (k > 1 && k < n - 3 && r >= 1.6 && ph < step) {                                                             // 甲缝：赤肉（蓄力时透出锈橙光）+ 后一片甲的后沿高光
        for (let q = -0.2; q <= 0.95; q += 1 / Math.max(2, r)) U.dot(E, x + nx * q * (r - 0.5), y + ny * q * (r - 0.5), gapM, gapM === m.flesh ? 2 : 0);
        const k2 = Math.max(0, k - 1); U.dot(E, p[3 * k2] + rig.nx[k2] * (r - 1), p[3 * k2 + 1] + rig.ny[k2] * (r - 1), m.body, 4);
      }
    }
    const tx = p[0], ty = p[1], ux = p[3] - p[0], uy = p[4] - p[1], ul = Math.hypot(ux, uy) || 1;                    // 尾尖（赤蠕虫的绒毛长成一根短尾刺）
    U.dot(E, tx - ux / ul, ty - uy / ul, m.body, 4); U.dot(E, tx - 2 * ux / ul, ty - 2 * uy / ul - 0.5, m.body, 4);
  }
  // 候选部件：serpentBellyUp（翻肚的身体：肚皮朝上的浅粉软腹 + 赤红环节褶，底下两行是甲壳边）
  function drawFlipped() {
    part();
    const p = rig.pts, n = p.length / 3;
    for (let k = 0; k < n; k++) U.disc(E, p[3 * k], p[3 * k + 1], p[3 * k + 2], m.belly, 0);
    for (let k = 0; k < n; k++) {
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2];
      if (r >= 1.5) { U.dot(E, x, y + r, m.body, 0); U.dot(E, x, y + r - 1, m.body, 0); }
      const L = rig.len[k], ph = (L + 1) % BAND, step = k ? L - rig.len[k - 1] : 1;
      if (k > 1 && k < n - 2 && r >= 1.6 && ph < step) for (let j = R(-r + 1); j <= R(r - 2); j++) U.dot(E, x, y + j, m.flesh, 0);
    }
  }
  // 候选部件：serpentPack（背上的麻布袋；镰刃虫是 big 的宝袋：更大、袋口插着一块紫色秘晶）
  function sackAt(sx, sy, flat) {
    part();
    const rx = 3.9, ry = flat ? 2.2 : 3;
    U.oval(E, sx, sy, rx, ry, m.sack, 0);
    U.dot(E, sx - 2, sy + 1, m.sack, 2); U.dot(E, sx - 3, sy + 1, m.sack, 2); U.dot(E, sx - 2, sy, m.sack, 2);          // 补丁
    U.dot(E, sx + 1, sy - 1, m.sack, 2); U.dot(E, sx + 1, sy + 1, m.sack, 2); U.dot(E, sx + 2, sy + 2, m.sack, 2);   // 缝线
    U.dot(E, sx + 4, sy, m.gold, 4); U.dot(E, sx + 4, sy + 1, m.gold, 3);                                            // 缝里露出的金币（赤蠕虫时就有）
    if (flat) return;
    U.dot(E, sx - 1, sy - 3, m.rope, 3); U.dot(E, sx, sy - 3, m.rope, 4); U.dot(E, sx + 1, sy - 3, m.rope, 3); U.dot(E, sx + 2, sy - 2, m.rope, 2);
    U.dot(E, sx - 2, sy - 4, m.sack, 4); U.dot(E, sx + 1, sy - 4, m.sack, 3); U.dot(E, sx - 3, sy - 5, m.sack, 4); U.dot(E, sx + 2, sy - 5, m.sack, 3);
  }
  const GEM = [[0, 0, 1], [-1, 0, 2], [0, -1, 1], [-1, -1, 3], [-1, -2, 2], [-2, -2, 1], [-2, -3, 3]];   // 秘晶：斜插的 2 格宽晶片（x, y, 色档；3 = 亮芯）
  function crystal(x, y, lv, lying) {
    part();
    for (const [dx, dy, t] of GEM) { const X = lying ? x - dy - 3 : x + dx, Y = lying ? y + dx : y + dy; if (t === 3) U.dot(E, X, Y, lv ? m.gemGlow : m.gem, lv ? 0 : 4); else U.dot(E, X, Y, m.gem, t + 1); }
  }
  // 候选部件：wormMaw（同赤蠕虫：赤红的头、正对前方的圆口 = 粉唇 + 一圈白牙 + 深喉，张开时唇瓣外翻；镰刃虫头顶多一片甲盖，触须更长、往后扫）
  function drawHead() {
    part();
    const H = rig.head, hx = H.x, hy = H.y, j = P.jaw | 0, bup = P.bup;
    U.oval(E, hx, hy, HEAD.rx, HEAD.ry, m.flesh, 0);
    for (let y = Math.floor(hy - HEAD.ry - 1); y <= Math.ceil(hy + HEAD.ry); y++) for (let x = Math.floor(hx - HEAD.rx - 1); x <= Math.ceil(hx + HEAD.rx); x++) {   // 甲盖：盖住头顶和后脑
      const u = (x - hx) / (HEAD.rx + 0.35), v = (y - hy) / (HEAD.ry + 0.35); if (u * u + v * v > 1) continue;
      const dx = x - hx, dy = y - hy, capOn = bup ? (dx < -0.5 && dy > -2) || dx < -1.5 : dy < -0.8 - 0.35 * dx && dx < 1.6;
      if (capOn) U.dot(E, x, y, m.cap, 0);
    }
    if (!bup) { U.dot(E, hx - 1, hy - HEAD.ry + 1, m.cap, 4); U.dot(E, hx - 2, hy - HEAD.ry + 2, m.cap, 4); }         // 甲盖高光
    const AN = { '-1': [[-1, -0.5], [-1, 0.2]], 0: [[-0.7, -1], [-1, -0.3]], 1: [[-0.2, -1], [-0.8, -0.8]], 2: [[0.6, -1], [1, -0.2]], b: [[-1, 0.4], [-1, 0.8]] };   // 触须两节的走向（近侧）
    const AF = { '-1': [[-1, 0], [-1, 0.4]], 0: [[-1, -0.6], [-1, 0]], 1: [[-0.8, -1], [-1, -0.4]], 2: [[0.2, -1], [0.8, -0.6]], b: [[-1, 0.1], [-1, 0.5]] };     // 远侧往后压低，两根分开
    const ant = (AD, bx, by, L, tone) => { let x = bx, y = by; for (let i = 0; i < L; i++) { const a = AD[i < L / 2 ? 0 : 1]; x += a[0]; y += a[1]; U.dot(E, x, y, i === L - 1 ? m.lip : m.flesh, i === L - 1 ? 4 : tone); } };
    const ak = bup ? 'b' : P.ant;
    ant(AF[ak], hx - 2, hy - HEAD.ry + 1.5, HEAD.antF, 2);                                                          // 远侧触须（暗）
    ant(AN[ak], hx + 0.3, hy - HEAD.ry + 0.4, HEAD.antN, 3);                                                       // 近侧触须
    const Mx = R(hx + HEAD.md), My = R(hy + 0.4), au = 1.35 + 0.35 * j, av = 2.5 + 0.35 * j, inner = 0.2 + 0.1 * j;
    for (let y = My - 7; y <= My + 7; y++) for (let x = Mx - 7; x <= Mx + 7; x++) {
      const u = x - Mx, v = y - My, e = (u / au) ** 2 + (v / av) ** 2;
      if (e > 1) continue;
      if (e <= inner) U.dot(E, x, y, m.ink, 0);
      else if (e <= 0.64) { const g = Math.floor((Math.atan2(v, u) / (2 * Math.PI) + 1) * 12) & 1; U.dot(E, x, y, g ? m.throat : m.teeth, 0); }   // 牙一颗隔一颗
      else U.dot(E, x, y, m.lip, 0);
    }
    if (j >= 2) for (const a of [-1.4, -0.7, 0, 0.7, 1.4]) {                                                       // 张大时唇瓣外翻，瓣尖是牙
      const cu = Math.cos(a), sv = Math.sin(a), L = j - 1;
      for (let s = 1; s <= L; s++) U.dot(E, Mx + (au + s) * cu, My + (av + s) * sv, s === L ? m.teeth : m.lip, s === L ? 0 : 4);
    }
  }
  function sackPos() { const p = rig.pts, k = rig.kSack; return [R(p[3 * k]), R(p[3 * k + 1] - p[3 * k + 2] - 2)]; }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.bup) {
      drawSpikes(); drawFlipped(); drawHead(); drawSickle(P.fL, 1); drawSickle(P.nL, 0);
    } else {
      drawSickle(P.fL, 1); drawSpikes(); drawBody();
      if (!P.drop) { const [sx, sy] = sackPos(); sackAt(sx, sy, 0); crystal(sx, sy - 4, P.gg >= 2 ? 1 : 0, 0); }
      drawHead(); drawSickle(P.nL, 0);
    }
    if (P.drop) {                                                          // 滚开的宝袋，秘晶从袋口掉出来
      const bx = SACK_X + P.dsx, landed = P.drop === 2, by = landed ? -2 : -9 - P.dsy;
      sackAt(bx, by, landed ? 1 : 0);
      if (!P.cry) crystal(bx, by - 3, 0, landed);
      else if (P.cry === 1) crystal(bx - 3, by - 4, 1, 0);
      else crystal(bx - 6, -1, P.cry === 2 ? 1 : 0, 1);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = back[0] + hero.ox; RIM.ry = back[1] + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let soulAcc = 0, emberAcc = 0, lastGf = -9, lastWave = -1, nails = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const guardX = () => { const g = limbGeo(LIMB[8]); return [g.E[0] + 1, g.E[1] + 3]; };   // 交叉护身时 X 的交点（敌弹撞上的地方）
  function barbFan(k0, k1) {                                               // 背上的倒刺离体，沿敌弹来的方向扇形射回（1×3 锈刺，拖尾）
    const list = spikeList(), N = list.length;
    for (let i = k0; i < k1; i++) {
      const s = list[Math.min(N - 1, Math.floor(i * N / 6))], x0 = wx(s.x + s.nx * 3 + P.bx), y0 = wy(s.y + s.ny * 3);
      const tx = DUMMY_X - 4 + (i % 2), ty = HY - 25 + i * 3.4, vx = [190, 160, 130][i % 3], vy = (ty - y0) * vx / Math.max(8, tx - x0);
      shoot(1, x0, y0, vx, tx, R_EL, vy, { trail: { every: 1, life: [0.12, 0.25], back: [10, 26], off: 2 }, glow: -1 });
      burst(x0, y0, 3, 20, 50, 0.1, 0.25, R_EL, 8);
    }
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CHARGE, DUR[CHARGE] - 1 / 60, E.simT);                        // 用蓄力末帧（倒刺还竖着）的位置发射
      barbFan(0, 3); nails = 0;
      ring(wx(back[0] - P.bx), wy(back[1]), 1, R_EL); fx.cross(wx(P.gx), wy(P.gy), 4, R_EL, 0.2);
      shake(0.28, 2); flash(0.05);
      poseAt(CAST, 0, E.simT);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                     // 双镰交叉下劈：两道交叉的弧形拖影
      const gn = limbGeo(LIMB[6]), gf = limbGeo(LIMB[7]);
      fx.slash(wx(gn.S[0] + 4 + P.bx), wy(gn.S[1] - 2), 10, -0.3, 2.5, R_EL, 0.17, 2, 2);
      fx.slash(wx(gf.S[0] + 6 + P.bx), wy(gf.S[1] - 3), 9, 0.4, 2.9, R_EL, 0.17, 2, 1);
      const hx = DUMMY_X - 4, hy = HY - 10;
      burst(hx, hy, 12, 40, 100, 0.15, 0.35, R_IMP, 10); burst(hx, hy, 5, 30, 70, 0.2, 0.4, R_EL, 6); fx.cross(hx, hy, 3, R_EL, 0.15); hitDummy(0, 1);
      for (let i = 0; i < 2; i++) spawn(K_DUST, wx(-8) + Math.random() * 6, HY, -10 - Math.random() * 14, -4 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'slash', w: 0.45 }); sfx('hit', { mat: 'flesh', w: 0.45 });
    }
    if (s === CHARGE && Math.abs(t - T_SHOT) < 1e-9) { const [gx, gy] = guardX(); shoot(3, 136, wy(gy), -300, wx(gx), R_ENEMY); }   // 一颗敌弹从假人方向飞来
    if (s === CHARGE && Math.abs(t - T_BLOCK) < 1e-9) {                     // 撞在交叉的镰刃上：火花 + 倒刺闪白
      const [gx, gy] = guardX(), x = wx(gx), y = wy(gy); burst(x, y, 12, 40, 110, 0.15, 0.35, R_IMP, 8); burst(x, y, 6, 30, 80, 0.15, 0.3, R_ENEMY, 4); fx.cross(x, y, 3, R_IMP, 0.15);
      sfx('hit', { mat: 'metal', w: 0.4 });
    }
    if (s === CAST && Math.abs(t - 0.1) < 1e-9) { poseAt(CHARGE, DUR[CHARGE] - 1 / 60, E.simT); barbFan(3, 6); poseAt(CAST, t, E.simT); }
    if (s === RECOVER && Math.abs(t - 0.1) < 1e-9) { for (const g of spikeList()) spawn(K_EMBER, wx(g.x + g.nx + P.bx), wy(g.y + g.ny) - 1, 0, -8, 0.3, R_EL); }   // 新刺冒头
    if (s === HURT && Math.abs(t - INCOMING) < 1e-9) burst(wx(2), wy(-10), 5, 30, 70, 0.2, 0.4, R_EL, 10);           // 甲屑
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 18 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
    if (s === DEATH && Math.abs(t - (INCOMING + 1.25)) < 1e-9) { const x = wx(SACK_X + DROP.dx - 7 + P.bx), y = wy(-2); burst(x, y, 8, 20, 60, 0.2, 0.45, FXI.curse, 6); fx.cross(x, y, 4, FXI.curse, 0.25); }   // 秘晶落地闪一下
  }
  const EVENTS = [[], [], [T_HIT], [T_SHOT, T_BLOCK], [0.1], [0.1], [INCOMING], [T_LAND, INCOMING + 1.25], []];
  function impactOn(k, x, y) {                                            // 倒刺一根接一根钉进假人
    if (k !== 1) return;
    nails++;
    burst(x, y, 6, 30, 80, 0.12, 0.3, R_IMP, 6);
    for (let i = 0; i < 3; i++) spawnX(K_PHYS, x, y, -10 - Math.random() * 20, -20 - Math.random() * 20, 0.5, R_EL, { g: 240, floor: HY });   // 锈屑
    if (nails >= 6) { fx.cross(x, y, 6, R_EL, 0.3); ring(x, y, 1, R_EL); hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.6 }); }
    else { hitDummy(0, 1); sfx('impact', { pal: 'metal', w: 0.25 }); }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                 // 锈色刺弹：1×3 + 往后勾的刺根
    if (k !== 1) return false;
    put(x + d, y, Rr[0]); put(x, y, Rr[1]); put(x - d, y, Rr[2]); put(x - d, y - 1, Rr[3]); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                                // 镰尖落地扬 1 颗尘（接触帧 0 / 2）
      if (P.gf === 0 || P.gf === 2) { const tp = P.gf === 0 ? tipN : tipF; spawn(K_DUST, wx(tp[0] + P.bx), HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.35, FXI.dust); sfx('step', { w: 0.3 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                   // 抖刺个性里镰刃一合，刃口擦出 1 颗火星
      if (P.spw !== lastWave) { if (P.spw === 3) spawn(K_EMBER, wx(tipN[0] + P.bx), wy(tipN[1]) - 1, 6, -14, 0.35, R_EL); lastWave = P.spw; }
    }
    if (state === CHARGE && stT > 0.5) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; const list = spikeList(); if (!list.length) break; const g = list[Math.floor(Math.random() * list.length)]; spawn(K_EMBER, wx(g.x + g.nx * 3 + P.bx), wy(g.y + g.ny * 3), (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { soulAcc = 0; emberAcc = 0; lastGf = -9; lastWave = -1; nails = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.bup) floorGlow(wx(back[0] - P.bx), P.rim, EL, f12); shotFloorGlow(f12); }

  return {
    name: '镰刃虫', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.gemGlow, m.ember, m.ember2], HIT_POINT: [5, -9], EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'metal', style: 'blade', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, drawShot,
  };
});
