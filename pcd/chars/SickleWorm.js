// 镰刃虫（部队 · 兽人 · 先锋 · 普通；由赤蠕虫升级）：还是那条赤蠕虫——圆口白牙、两根触须（更长）、背上的麻布袋（更大，袋口露出一块紫色秘晶）——
// 前三节长粗、像螳螂一样竖起守着阵地；第一节两侧长出一对骨质镰肢（收起时交叉护在圆口前）；背上一片片锈褐甲壳，每片一根向后勾的倒刺，赤红只留在甲缝和腹部。
// 攻击 = 双镰高举、前冲交叉下劈；技能 = 特性「倒刺」生效的样子：缩低交叉护身、倒刺逐节竖起，敌弹撞在甲壳上的一瞬，背上 6 根倒刺沿来路扇形射回、一根接一根钉进目标。
// 死亡 = 翻肚蜷缩：后仰 → 翻身肚皮朝上撑在倒刺上 → 镰肢蜷起抽搐两下 → 倒刺一根根伏平 → 宝袋滚开、秘晶掉出闪一下 → 消散 + 魂光。
// 身体用 parts-beast 的 serpent 骨架（rig + body）；镰肢、倒刺、甲缝、宝袋、圆口头、翻肚的身体是本模块自己画的（见「候选部件」注释）。
PCD.define('SickleWorm', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, ramp, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, shoot } = E;
  const B = E.parts.beast, S = B.serpent, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const CARA = ramp(['#1a0c06', '#4a2410', '#7a4020', '#b06a38']);                        // 锈褐甲壳
  const R_EL = fxRamp('rustThorn', [21, '#f0c8a0', '#c87a3a', '#7a3a1a', '#3a1408']), EL = FXR[R_EL];   // 倒刺 · 锈棘：白 → 淡锈 → 锈橙 → 锈褐 → 焦锈
  const R_IMP = FXI.impact, R_ENEMY = FXI.enemy;
  const m = B.mats(E, { main: CARA, belly: 'pink', flesh: 'blood', lip: 'pink', teeth: 'white', sack: 'sand', rope: 'leather', gold: 'gold', bone: 'bone', gem: 'purple' });
  m.body = E.defMat(CARA, 1);
  m.edge = E.defMat([8, 17, 21, 21], 1, 1);                                                  // 镰刃刃口（平涂白）
  m.throat = E.defMat([55, 55, 56, 56], 1, 1);
  m.spark = E.defMat([21, 21, 21, 21], 1, 1);                                                // 倒刺挨打闪白
  m.ember = E.defMat([EL[3], EL[2], EL[2], EL[1]], 1, 1);                                     // 甲缝透出的锈橙光（平涂）
  m.ember2 = E.defMat([EL[2], EL[1], EL[1], EL[0]], 1, 1);
  m.gemGlow = E.defMat([43, 43, 21, 21], 1, 1);                                             // 秘晶亮芯
  m.thorn = E.defMat([CARA[0], CARA[3], EL[1], EL[1]], 1);                                 // 倒刺：锈橙刺根 + 淡锈刺身，压在深褐甲壳上一眼看得出

  // ───── 形体：竖起蠕虫档，身长约 26、前段竖起约 15 格；前三节粗（r 4）、尾尖细（1.2）─────
  const BASE = { n: 25, r: 4, rTail: 1.2, waves: 1.2, rise: 11, neck: 1, head: 'worm', hl: 7.5, hh: 6, bands: 0, belly: 0, scales: 0, spikes: 0, m };
  const OS = [0.6, 1.3, 2.4].map((a) => S.shape(Object.assign({}, BASE, { arch: a })));
  const NG = Math.floor(BASE.n * 0.82 + 0.01) + 1;                                           // 贴地段脊点数（serpent.rig：尾尖 → 颈根每格一个）
  const HEAD = { rx: 3.8, ry: 4.2, md: 3, antN: 5, antF: 4 };
  const BAND = 4.5, SACK_X = -9, DROP = { at: 0.5, dur: 0.3, dx: -11, hop: 5 };

  const HX = 67, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 60, 46, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['teeth', 'edge', 'spark', 'throat', 'ink', 'ember', 'ember2', 'gem', 'gemGlow', 'rope', 'gold', 'belly', 'lip']) RIM.skip[m[k]] = 1;

  // ───── 镰肢姿势表（相对肩点 S）：[肘 ex, ey, 刃尖 tx, ty（相对肘；G = 1 时是相对肩的 x、刃尖落在地上）, 刃弯 cx, cy（凸出方向）, G] ─────
  const LIMB = [
    [5, -3, 3, 9, 2.2, -1],            //  0 收起（近）：肘举到圆口下方，弯刃往前下垂（月牙形）
    [7, -1, -4, 7, -1.5, -1],          //  1 收起（远）：肘更靠前，弯刃往后下斜，和近侧在胸前交叉成 X
    [7, -5, 4, -3, 0.5, -1.5],         //  2 张开（近）
    [5, -7, 3, -4, 0.5, -1.5],         //  3 张开（远）
    [2, -9, -4, -4, 1, -1.5],          //  4 高举（近）
    [0, -9, -3, -5, 1, -1.5],          //  5 高举（远）
    [7, -3, 5, 7, 1.5, -1],            //  6 下劈（近）
    [6, -5, 6, 6, 1.5, -1],            //  7 下劈（远）
    [6, -7, -4, 8, 1.2, 0.4],          //  8 交叉护身（近）：X 抬到圆口前
    [3, -8, 4, 8, 1.2, -0.4],          //  9 交叉护身（远）
    [6, -6, 6, -2, 0.5, -1.5],         // 10 施放张开（近）
    [2.5, -8, 3, -5, 0, -1.5],         // 11 施放张开（远）
    [5, -2, 8, 0, 1, -1, 1],           // 12 步行：往前插地
    [3, -1, 3.5, 0, 1, -1, 1],         // 13 步行：插在地上往后拖
    [4, -5, 3, 4, 1.5, -0.5],          // 14 步行：抬起
    [6, -4, 4, 3, 1.5, -1],            // 15 步行：往前伸
    [2, -6, -4, -2, 0, -1.5],          // 16 受击：往后甩
    [1, -3, -2.5, 1, 0, -1],           // 17 死：蜷起
    [2, -4, -1.5, 2, 0, -1],           // 18 死：抽搐
  ];
  const WALK_N = [12, 13, 14, 15], WALK_F = [14, 15, 12, 13];

  // ───── 姿势字段 ─────
  //   arch 拱起档 · aim 圆口 0 前 / 1 斜上 · ant 触须 -1..2 · nL / fL 近 / 远镰肢姿势（LIMB 下标）· lean 前段后仰 0–3
  //   spk 倒刺基础档 0 伏平 – 3 竖到最高 · spc 蓄力时从尾到头竖起的进度 0–4 · spw 待机抖刺的波浪 0 无 / 1–4 · spf 死亡时从尾到头伏平的根数 0–8
  //   gone 倒刺 0 在 / 1 射出去了 / 2 新长出 1 格 · sflash 倒刺闪白 · gg 甲缝透光 0–2 · bup 翻肚 · plift 翻肚撑起高度 0–5 · cry 秘晶 0 袋里 / 1 飞出 / 2 落地闪 / 3 落地
  const MINE = [['arch', 0, 2], ['aim', 0, 1], ['ant', -1, 2], ['nL', 0, 18], ['fL', 0, 18], ['lean', 0, 3], ['spk', 0, 3], ['spc', 0, 4], ['spw', 0, 4], ['spf', 0, 8],
    ['gone', 0, 2], ['sflash', 0, 1], ['gg', 0, 2], ['bup', 0, 1], ['plift', 0, 5], ['cry', 0, 3]];
  const SPEC = S.KEYS.concat(B.COMMON, MINE);
  const P = {};
  function reset() {
    S.reset(P); P.gf = 1; P.arch = 1; P.aim = 0; P.ant = 0; P.nL = 0; P.fL = 1; P.lean = 0; P.spk = 1; P.spc = 0; P.spw = 0; P.spf = 0;
    P.gone = 0; P.sflash = 0; P.gg = 0; P.bup = 0; P.plift = 0; P.cry = 0; P.gx = 0; P.gy = 0;
  }
  reset();
  let rig = null, tipN = [0, 0], tipF = [0, 0], shoulder = [0, 0], mouth = [0, 0], back = [0, 0];
  const T_HIT = 2 / 12, T_SHOT = 0.8, T_BLOCK = 1.02, T_LAND = INCOMING + 0.66;

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
      if (tq < 0.12) { P.nL = 4; P.fL = 5; P.rise = 1; P.bx = -1; P.ant = 1; P.arch = 2; }             // 双镰高举
      else if (tq < 0.25) { P.nL = 6; P.fL = 7; P.bx = 3; P.rise = -1; P.jaw = 2; P.ant = 2; P.arch = 0; }   // 前冲交叉下劈
      else if (tq < 0.45) { P.nL = 6; P.fL = 7; P.bx = 2; P.rise = -1; P.jaw = 1; P.arch = 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(2 * (1 - q)); P.nL = q < 0.5 ? 15 : 0; P.fL = q < 0.5 ? 14 : 1; }
    } else if (st === CHARGE) {                                            // 缩低、双镰交叉护住圆口，倒刺从尾到头竖到最高，甲缝透出锈橙光
      const q = ease.inOut(clamp01(tq / 0.7));
      P.rise = -R(3 * q); P.nL = q < 0.5 ? 0 : 8; P.fL = q < 0.5 ? 1 : 9; P.rim = 2; P.ant = 1; P.arch = 1;
      P.spc = tq < 0.2 ? 0 : Math.min(4, Math.floor((tq - 0.2) / 0.16) + 1); P.gg = tq < 0.5 ? 0 : tq < 1.0 ? 1 : (f12 & 1) ? 2 : 1;
      if (tq >= T_BLOCK && tq < T_BLOCK + 0.17) { P.sflash = 1; P.bx = tq < T_BLOCK + 1 / 12 ? -1 : 0; P.ant = -1; }   // 敌弹撞上甲壳：倒刺闪白、身子一顿
    } else if (st === CAST) {                                              // 全身一震，倒刺齐射，镰肢张开（定格 1 帧）
      P.nL = 10; P.fL = 11; P.gone = 1; P.rim = 3; P.rise = -1; P.jaw = 2; P.ant = 2; P.gg = 2; P.bx = tq < 1 / 12 ? -1 : 0; P.arch = 1;
    } else if (st === RECOVER) {                                           // 镰肢收回交叉，甲壳里重新长出新刺，倒刺伏平
      const q = ease.inOut(clamp01(tq / 0.6));
      P.rise = -R(1 - q); P.nL = tq < 0.2 ? 8 : 0; P.fL = tq < 0.2 ? 9 : 1; P.gone = tq < 0.3 ? 2 : 0; P.spk = tq < 0.5 ? 0 : 1; P.gg = tq < 0.2 ? 1 : 0;
      P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.rise = 1; P.lean = 1; P.jaw = 2; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.lean = 1; P.jaw = 1; P.nL = 15; P.fL = 14; P.ant = -1; }
    } else if (st === DEATH) {                                             // 翻肚蜷缩
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.rise = 2; P.lean = 1; P.jaw = 2; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 2; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.5) { P.bx = -3; P.rise = 1; P.lean = d < 0.42 ? 2 : 3; P.jaw = 1; P.nL = 16; P.fL = 16; P.ant = -1; P.spk = 2; }   // 前段往后仰倒
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

  // rig 的后处理：前段后仰（颈绕颈根往后转）、翻肚撑起，脊线弧长 / 背侧法线，肩点、镰刃尖、圆口
  function reshape(g) {
    const p = g.pts, n = p.length / 3;
    if (P.lean) {
      const px = p[3 * NG - 3], py = p[3 * NG - 2], a = -P.lean * 0.32, c = Math.cos(a), s = Math.sin(a);
      for (let k = NG; k < n; k++) { const x = p[3 * k] - px, y = p[3 * k + 1] - py; p[3 * k] = px + x * c - y * s; p[3 * k + 1] = py + x * s + y * c; }
      const x = g.head.x - px, y = g.head.y - py; g.head = { x: px + x * c - y * s, y: py + x * s + y * c, a: g.head.a };
    }
    if (P.bup) { for (let k = 0; k < n; k++) p[3 * k + 1] -= P.plift; g.head = { x: g.head.x, y: p[3 * n - 2] - 1, a: 0 }; }
    g.len = new Float32Array(n); g.nx = new Float32Array(n); g.ny = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      if (k) g.len[k] = g.len[k - 1] + Math.hypot(p[3 * k] - p[3 * k - 3], p[3 * k + 1] - p[3 * k - 2]);
      const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1); let tx = p[3 * b] - p[3 * a], ty = p[3 * b + 1] - p[3 * a + 1]; const l = Math.hypot(tx, ty) || 1;
      g.nx[k] = ty / l; g.ny[k] = -tx / l;
      if (P.bup) { g.nx[k] = -g.nx[k]; g.ny[k] = -g.ny[k]; }                   // 翻肚：甲壳那一面朝下
    }
    let ks = 0; for (let k = 0; k < n; k++) if (p[3 * k] <= SACK_X) ks = k; g.kSack = ks;
    const H = g.head, d = P.aim ? [0.71, -0.71] : [1, 0]; mouth = [H.x + d[0] * HEAD.md, H.y + d[1] * HEAD.md];
    if (P.bup) shoulder = [H.x - 4, p[3 * n - 2] - p[3 * n - 1] + 0.5];
    else { const k = n - 9, r = p[3 * k + 2]; shoulder = [p[3 * k] - g.nx[k] * (r - 1), p[3 * k + 1] - g.ny[k] * (r - 1)]; }
    tipN = limbGeo(LIMB[P.nL]).T; tipF = limbGeo(LIMB[P.fL]).T;
    { const k = NG - 2; back = [p[3 * k] + P.bx, p[3 * k + 1] - p[3 * k + 2] - 1]; }                  // 轮廓光的光源：背上倒刺那一排（技能的发光处）
  }
  function limbGeo(L) {
    const Sx = shoulder[0], Sy = shoulder[1], Ex = Sx + L[0], Ey = Sy + L[1];
    const Tx = L[6] ? Sx + L[2] : Ex + L[2], Ty = L[6] ? 0 : Ey + L[3];
    return { S: [Sx, Sy], E: [Ex, Ey], T: [Tx, Ty], C: [(Ex + Tx) / 2 + L[4], (Ey + Ty) / 2 + L[5]], bl: [L[4], L[5]] };
  }

  // ───── 画（从后往前：远镰肢 → 倒刺 → 身体 → 宝袋 → 秘晶 → 头 → 近镰肢）─────
  // 候选部件：sickleLimb（螳螂式镰肢：甲壳股节 2 格粗 + 骨质弯刃，刃根 2 格、刃尖 1 格，凹侧一道白刃口；far 1 用暗一级材质）
  function drawSickle(idx, far) {
    part();
    const g = limbGeo(LIMB[idx]), fm = far ? m.far : m.limb, bm = far ? m.boneFar : m.bone;
    U.seg(E, g.S[0], g.S[1], g.E[0], g.E[1], 2, fm, 0);                                     // 股节
    const bl = Math.hypot(g.bl[0], g.bl[1]) || 1, ox = g.bl[0] / bl, oy = g.bl[1] / bl, len = Math.hypot(g.T[0] - g.E[0], g.T[1] - g.E[1]), N = Math.max(4, Math.ceil(len * 2));
    for (let i = 0; i <= N; i++) {                                                          // 弯刃：二次贝塞尔（肘 → 弯 → 尖）
      const t = i / N, it = 1 - t, x = it * it * g.E[0] + 2 * it * t * g.C[0] + t * t * g.T[0], y = it * it * g.E[1] + 2 * it * t * g.C[1] + t * t * g.T[1];
      U.dot(E, x, y, bm, t > 0.85 ? 4 : 0);
      if (t < 0.5) U.dot(E, x + ox, y + oy, bm, 0);
      if (t > 0.15 && t < 0.9 && !far) U.dot(E, x - ox * 0.8, y - oy * 0.8, m.edge, 0);
    }
    U.dot(E, g.E[0], g.E[1], bm, 4);                                                        // 关节
  }
  // 倒刺（一个部件，画在身体之前：根部压一道深色分界线）：每片甲壳一根向后勾的尖刺，按档位决定竖起角度和长度
  const SP_A = [1.35, 0.7, 0.45, 0.2], SP_L = [2.6, 3.8, 4.4, 5];
  function spikeList(g) {
    const p = g.pts, n = p.length / 3, tot = g.len[n - 1], out = [];
    let k = 0;
    for (let L = 2.5; L < tot - 2.5; L += 4) {
      while (k < n - 1 && g.len[k] < L) k++;
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2];
      if (r < 1.8 || (!P.bup && P.drop === 0 && Math.abs(x - p[3 * g.kSack]) < 4 && k < NG)) continue;
      out.push(k);
    }
    return out;
  }
  function spikeLv(i, N) {
    let lv = P.spk;
    if (P.spc && i < N * P.spc / 4) lv = 3;
    if (P.spw && Math.floor(i * 4 / N) === P.spw - 1) lv = 3;
    if (P.spw && Math.floor(i * 4 / N) === P.spw - 2) lv = 2;
    if (P.bup) lv = i < P.spf ? 0 : 2;
    return lv;
  }
  function drawSpikes() {
    part();
    const p = rig.pts, list = spikeList(rig), N = list.length;
    for (let i = 0; i < N; i++) {
      const k = list[i], x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2], n = p.length / 3, ka = Math.max(0, k - 4), kb = Math.min(n - 1, k + 4);
      let tx = p[3 * kb] - p[3 * ka], ty = p[3 * kb + 1] - p[3 * ka + 1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;   // 刺的朝向用平滑过的脊线方向（竖起段是 S 形，逐点法线会扭进身体里）
      const sg = P.bup ? -1 : 1, nx = ty * sg, ny = -tx * sg, bx = -tx, by = -ty;                                                    // (nx, ny) 甲壳朝外，(bx, by) 往尾巴的方向
      const s0x = x + nx * (r - 0.3), s0y = y + ny * (r - 0.3);
      if (P.gone) { U.dot(E, s0x + nx, s0y + ny, m.thorn, P.gone === 2 ? 3 : 2); if (P.gone === 2) U.dot(E, s0x + nx * 1.8 + bx * 0.6, s0y + ny * 1.8 + by * 0.6, m.thorn, 4); continue; }
      const lv = spikeLv(i, N), a = SP_A[lv] * (k >= NG && !P.bup ? 0.6 : 1), L = SP_L[lv], mat = P.sflash ? m.spark : m.thorn;   // 竖起段的刺更朝外，不贴着身子
      for (let s = 0; s <= L; s += 0.5) {
        const aa = s > L - 1.1 ? a + 0.6 : a, dx = nx * Math.cos(aa) + bx * Math.sin(aa), dy = ny * Math.cos(aa) + by * Math.sin(aa);
        const hx = s > L - 1.1 ? (nx * Math.cos(a) + bx * Math.sin(a)) * (L - 1.1) + dx * (s - L + 1.1) : dx * s, hy = s > L - 1.1 ? (ny * Math.cos(a) + by * Math.sin(a)) * (L - 1.1) + dy * (s - L + 1.1) : dy * s;
        U.dot(E, s0x + hx, s0y + hy, mat, s < 1 ? 2 : s > L - 0.6 ? 4 : 3);
        if (s < 1.6) U.dot(E, s0x + hx + bx, s0y + hy + by, mat, s < 1 ? 2 : 3);
      }
    }
  }
  // 身体：serpent.body 画甲壳圆盘，紧跟着画甲缝（赤肉 / 透光）、甲片前沿高光、浅粉腹线（同一个部件）
  function drawBody() {
    const o = OS[P.arch], p = rig.pts, n = p.length / 3;
    S.body(E, rig, P, o);
    const gapM = P.gg >= 2 ? m.ember2 : P.gg ? m.ember : m.flesh;
    for (let k = 0; k < n; k++) {
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2], nx = rig.nx[k], ny = rig.ny[k];
      if (r >= 1.2) U.dot(E, x - nx * (r - 0.4), y - ny * (r - 0.4), m.belly, 0);                                   // 浅粉腹线
      const L = rig.len[k], ph = (L + BAND / 2 - 3) % BAND, step = k ? L - rig.len[k - 1] : 1;
      if (k > 1 && k < n - 4 && r >= 1.6 && ph < step) {                                                             // 甲缝：赤肉（蓄力时透出锈橙光）+ 下一片甲的前沿高光
        for (let q = -0.75; q <= 1.001; q += 1 / Math.max(2, r)) U.dot(E, x + nx * q * (r - 0.6), y + ny * q * (r - 0.6), gapM, 0);
        const k2 = Math.min(n - 1, k + 1); U.dot(E, p[3 * k2] + nx * (r - 1), p[3 * k2 + 1] + ny * (r - 1), m.body, 4);
      }
      if (k === n - 4 && !P.bup) for (let q = -1; q <= 1.001; q += 0.25) U.dot(E, x + nx * q * (r - 0.4), y + ny * q * (r - 0.4), gapM, 0);   // 头下一圈颈褶（把头和竖起的前段分开）
    }
    const tx = p[0], ty = p[1], ux = p[3] - p[0], uy = p[4] - p[1], ul = Math.hypot(ux, uy) || 1;                    // 尾尖（赤蠕虫的绒毛长成一根短尾刺）
    U.dot(E, tx - ux / ul, ty - uy / ul, m.body, 4); U.dot(E, tx - 2 * ux / ul, ty - 2 * uy / ul - 0.5, m.body, 4);
  }
  // 翻肚的身体（候选部件：serpentBellyUp）：肚皮朝上的浅粉软腹 + 赤红环节褶，底下两行是甲壳边
  function drawFlipped() {
    part();
    const p = rig.pts, n = p.length / 3;
    for (let k = 0; k < n; k++) U.disc(E, p[3 * k], p[3 * k + 1], p[3 * k + 2], m.belly, 0);
    for (let k = 0; k < n; k++) {
      const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2];
      if (r >= 1.5) { U.dot(E, x, y + r, m.body, 0); U.dot(E, x, y + r - 1, m.body, 0); }
      const L = rig.len[k], ph = (L + BAND / 2 - 3) % BAND, step = k ? L - rig.len[k - 1] : 1;
      if (k > 1 && k < n - 3 && r >= 1.6 && ph < step) for (let j = R(-r + 1); j <= R(r - 2); j++) U.dot(E, x, y + j, m.flesh, 0);
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
  // 候选部件：wormMaw（同赤蠕虫：正对前方的圆口 = 粉唇 + 一圈白牙 + 深喉，张开时唇瓣外翻；镰刃虫的触须更长）
  function drawHead() {
    part();
    const H = rig.head, hx = H.x, hy = H.y, j = P.jaw | 0, d = P.aim ? [0.71, -0.71] : [1, 0], px = -d[1], py = d[0];
    U.oval(E, hx, hy, HEAD.rx, HEAD.ry, m.limb, 0);
    U.dot(E, hx - 2, hy - 1, m.limb, 4); U.dot(E, hx - 1, hy - 2, m.limb, 4);                                        // 头壳高光
    const AD = P.bup ? [[-1, 0.3], [-1, 0.6]] : { '-1': [[-1, -0.4], [-1, 0.2]], 0: [[0.5, -1], [1, -0.5]], 1: [[0.3, -1], [0.5, -1]], 2: [[1, -0.8], [1, -0.1]] }[P.ant];
    const ant = (bx, by, L, tone) => { let x = bx, y = by; for (let i = 0; i < L; i++) { const a = AD[i < L / 2 ? 0 : 1]; x += a[0]; y += a[1]; U.dot(E, x, y, i === L - 1 ? m.lip : m.limb, i === L - 1 ? 4 : tone); } };
    ant(hx - 1, hy - HEAD.ry + 1, HEAD.antF, 2);
    ant(hx + 0.6, hy - HEAD.ry + 0.6, HEAD.antN, 4);
    const Mx = R(hx + d[0] * HEAD.md), My = R(hy + d[1] * HEAD.md), au = 1.35 + 0.35 * j, av = 2.5 + 0.35 * j, inner = 0.2 + 0.1 * j;
    for (let y = My - 7; y <= My + 7; y++) for (let x = Mx - 7; x <= Mx + 7; x++) {
      const u = (x - Mx) * d[0] + (y - My) * d[1], v = (x - Mx) * px + (y - My) * py, e = (u / au) ** 2 + (v / av) ** 2;
      if (e > 1) continue;
      if (e <= inner) U.dot(E, x, y, m.ink, 0);
      else if (e <= 0.64) { const g = Math.floor((Math.atan2(v, u) / (2 * Math.PI) + 1) * 12) & 1; U.dot(E, x, y, g ? m.throat : m.teeth, 0); }   // 牙一颗隔一颗
      else U.dot(E, x, y, m.lip, 0);
    }
    if (j >= 2) for (const a of [-1.4, -0.7, 0, 0.7, 1.4]) {
      const cu = Math.cos(a), sv = Math.sin(a), L = j - 1;
      for (let s = 1; s <= L; s++) { const u = (au + s) * cu, v = (av + s) * sv; U.dot(E, Mx + u * d[0] + v * px, My + u * d[1] + v * py, s === L ? m.teeth : m.lip, s === L ? 0 : 4); }
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
  function barbFan(k0, k1) {                                               // 背上的倒刺离体，沿敌弹来的方向扇形射回（1×3 锈刺，拖尾）
    const list = spikeList(rig), p = rig.pts, N = list.length;
    for (let i = k0; i < k1; i++) {
      const k = list[Math.min(N - 1, Math.floor(i * N / 6))], x0 = wx(p[3 * k]), y0 = wy(p[3 * k + 1] - p[3 * k + 2] - 2);
      const tx = DUMMY_X - 4 + (i % 2), ty = HY - 25 + i * 3.4, vx = [190, 160, 130][i % 3], vy = (ty - y0) * vx / Math.max(8, tx - x0);
      shoot(1, x0, y0, vx, tx, R_EL, vy, { trail: { every: 1, life: [0.12, 0.25], back: [10, 26], off: 2 }, glow: -1 });
      burst(x0, y0, 3, 20, 50, 0.1, 0.25, R_EL, 8);
    }
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CHARGE, DUR[CHARGE] - 1 / 60, E.simT);                        // 用蓄力末帧（倒刺还竖着）的位置发射
      barbFan(0, 3); nails = 0;
      const bx = wx(-2), by = wy(-12); ring(bx, by, 1, R_EL); fx.cross(wx(P.gx), wy(P.gy), 4, R_EL, 0.2);
      shake(0.28, 2); flash(0.05);
      poseAt(CAST, 0, E.simT);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                     // 双镰交叉下劈：两道交叉的弧形拖影
      const gn = limbGeo(LIMB[6]), gf = limbGeo(LIMB[7]);
      fx.slash(wx(gn.E[0] + P.bx), wy(gn.E[1]), 8, -0.3, 2.5, R_EL, 0.17, 2, 2);
      fx.slash(wx(gf.E[0] + P.bx) - 1, wy(gf.E[1]), 8, 0.4, 2.9, R_EL, 0.17, 2, 1);
      const hx = DUMMY_X - 4, hy = HY - 12;
      burst(hx, hy, 12, 40, 100, 0.15, 0.35, R_IMP, 10); burst(hx, hy, 5, 30, 70, 0.2, 0.4, R_EL, 6); fx.cross(hx, hy, 3, R_EL, 0.15); hitDummy(0, 1);
      for (let i = 0; i < 2; i++) spawn(K_DUST, wx(-8) + Math.random() * 6, HY, -10 - Math.random() * 14, -4 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'slash', w: 0.45 }); sfx('hit', { mat: 'flesh', w: 0.45 });
    }
    if (s === CHARGE && Math.abs(t - T_SHOT) < 1e-9) shoot(3, 136, wy(-9), -300, wx(9), R_ENEMY);   // 一颗敌弹从假人方向飞来
    if (s === CHARGE && Math.abs(t - T_BLOCK) < 1e-9) {                     // 撞在甲壳上：火花 + 倒刺闪白
      const x = wx(9), y = wy(-9); burst(x, y, 12, 40, 110, 0.15, 0.35, R_IMP, 8); burst(x, y, 6, 30, 80, 0.15, 0.3, R_ENEMY, 4); fx.cross(x, y, 3, R_IMP, 0.15);
      sfx('hit', { mat: 'metal', w: 0.4 });
    }
    if (s === CAST && Math.abs(t - 0.1) < 1e-9) { poseAt(CHARGE, DUR[CHARGE] - 1 / 60, E.simT); barbFan(3, 6); poseAt(CAST, t, E.simT); }
    if (s === RECOVER && Math.abs(t - 0.1) < 1e-9) { const list = spikeList(rig), p = rig.pts; for (const k of list) spawn(K_EMBER, wx(p[3 * k]), wy(p[3 * k + 1] - p[3 * k + 2] - 1), 0, -8, 0.3, R_EL); }   // 新刺冒头
    if (s === HURT && Math.abs(t - INCOMING) < 1e-9) burst(wx(1), wy(-9), 5, 30, 70, 0.2, 0.4, R_EL, 10);            // 甲屑
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
    if (state === CHARGE && stT > 0.5) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; const p = rig.pts, n = p.length / 3, k = Math.floor(Math.random() * (n - 4)); spawn(K_EMBER, wx(p[3 * k]), wy(p[3 * k + 1] - p[3 * k + 2]), (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { soulAcc = 0; emberAcc = 0; lastGf = -9; lastWave = -1; nails = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.bup) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }

  return {
    name: '镰刃虫', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.gemGlow, m.ember, m.ember2], HIT_POINT: [2, -8], EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'metal', style: 'blade', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, drawShot,
  };
});
