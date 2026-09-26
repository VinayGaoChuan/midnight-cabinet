// 神石 Stone（部队 · 不死 · 先锋 · 史诗 · 固定物，远程 0）：一颗埋在碎石断骨窝里的蓝铜矿巨蛋。
// 上尖下圆的多面体蛋：左上几块刻面受光、刻面之间压一道亮棱，左上三个顶点凸出 1 格成棱角；孔雀石绿纹从眼下蜿蜒到蛋底；
// 壳顶一圈锯齿裂缝，缝口在前上方豁开成一道眼窗，里面一只魂火独眼（以后就是巨人战神和魔像的独眼）；前侧三根小晶刺，反伤时伸出。
// 不会走、不会打：移动 = 左右摇晃着往前蹦；攻击 = 特性「蓝铜矿外壳」反弹——敌弹撞在壳上，被击中的晶面闪白，一道蓝铜光刺沿原路射回；
// 技能 = 特性「孵化」：心跳越来越快、裂纹从顶往下蔓延、石窝里的光点汇进裂缝 → 壳顶崩飞、独眼睁开、光柱冲天 → 碎壳落在假人头上 → 裂纹暗下、结出新晶面；
// 死亡 = 特性「蛋炸」：裂纹全亮 → 白闪一帧 → 炸成蓝铜碎块（死亡套件 burst）+ 大冲击环，只剩石窝，熄灭的独眼滚出来。
PCD.define('Stone', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, clamp01, q12, f12of, gait, keyer, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 颜色：元素「孵化 · 蓝铜孔雀」（白 → 淡孔雀绿 → 蓝铜 → 深蓝铜 → 墨蓝）；蓝铜矿壳、晶面高光、孔雀石纹 ─────
  const R_EL = fxRamp('azurite', [21, '#c8f5e0', '#5a8cf0', '#2a48b8', '#121c5a']), EL = FXR[R_EL];
  const AZ = E.ramp(['#0a1438', '#1a3a8a', '#2e62c8', '#6aa0f0']), HI = E.color('#b4d4ff'), MAL = E.ramp(['#0c2a1e', '#1a6a48', '#36a878', '#7ad8a8']);
  const PALE = EL[1], DEEP = EL[4];
  const M_SH = defMat(AZ, 1);                                    // 蓝铜矿壳：tone 1 棱缝 · 2 背光刻面 · 3 基面 · 4 受光刻面（整张图都是手定的色调）
  const M_SHD = defMat([AZ[0], DEEP, AZ[1], AZ[2]], 1);          // 蓄力 / 施放时壳暗一级（光都聚进了壳里，裂缝才亮得出来）
  const M_HI = defMat([AZ[0], HI, HI, HI], 1);                   // 刻面之间受光的亮棱
  const M_VEIN = defMat(MAL, 1);                                 // 孔雀石纹：2 暗 · 3 基 · 4 亮
  const M_XTAL = defMat([AZ[0], AZ[3], HI, 21], 1);              // 晶刺 / 收招时新结的晶面：2 蓝 · 3 淡蓝 · 4 白
  const M_CRK = defMat([AZ[0], DEEP, PALE, 21], 1, 1);           // 裂缝：tone 1 墨缝 · 2 暗缝 · 3 透光（色阶第 2 级）· 4 白热
  const M_EYE = defMat([DEEP, MAL[2], MAL[3], PALE], 1, 1);      // 魂火独眼（发光体）：tone 1 熄灭 · 2 魂火圈 · 3 亮圈 · 4 虹膜
  const M_INK = defMat([0, 0, 0, 0], 1, 1), M_WHITE = defMat([21, 21, 21, 21], 1, 1);
  const ASH = E.ramp(['#1c1a20', '#46424c', '#74707a', '#a6a2aa']);   // 石窝碎石：骨灰岩（和孵出来的巨人战神同一种石头）
  const M_ROCK = defMat(ASH, 1), M_ROCKD = defMat(ASH, 1, 0, 1), M_BONE = defMat('bone', 1), M_BONED = defMat('bone', 1, 0, 1);

  const HX = 38, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 44, 32, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 6, 9], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [M_EYE, M_CRK, M_INK, M_ROCK, M_ROCKD, M_BONE, M_BONED, M_WHITE, M_VEIN, M_XTAL]) RIM.skip[m] = 1;

  // ───── 姿势字段（全部取整）─────
  // tilt 蛋身倾斜 -1..1 · ex / ey 蛋在窝里的平移 · sq 1 落地压扁 / -1 蹬起拉长 · kick 胎动鼓包（-1 后 / 1 前）· ix 独眼看向 -1..1 · lid 眼睑 0 睁 / 1 半 / 2 闭
  // gem 独眼档（0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）· spk 晶刺 0 缩 / 1 半出 / 2 全出 · hitF 被击中的晶面闪白 · crack 裂纹段数 0–6 · lit 裂纹亮度 0–3
  // cap 壳顶 0 完好 / 1 崩飞 / 2 新晶面 · glint 新晶面闪光 · dim 壳暗一级（蓄力、施放、蛋炸前） · rem 蛋炸后只剩石窝 · eyeX / eyeY / eyeR 滚出来的独眼 · eggOnly 只画蛋（交给死亡套件炸开）
  const P = { tilt: 0, ex: 0, ey: 0, sq: 0, kick: 0, ix: 0, lid: 0, gem: 0, spk: 0, hitF: 0, crack: 0, lit: 0, cap: 0, glint: 0, dim: 0, flash: 0, rim: 0, rem: 0,
    eyeX: 0, eyeY: 0, eyeR: 0, dq: 0, dq48: 0, eggOnly: 0, st: 0, step: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['tilt', -2, 2], ['ex', -3, 2], ['ey', -2, 1], ['sq', -1, 1], ['kick', -1, 1], ['ix', -1, 1], ['lid', 0, 2], ['gem', 0, 4], ['spk', 0, 2], ['hitF', 0, 1],
    ['crack', 0, 6], ['lit', 0, 3], ['cap', 0, 2], ['glint', 0, 1], ['dim', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['rem', 0, 1], ['eyeX', -2, 22], ['eyeY', -18, 1], ['eyeR', 0, 3], ['dq48', 0, 48], ['eggOnly', 0, 1]]);
  const LOOK = [1, 0, 1, -1];                                    // 待机：独眼每 0.6 s 转一下（前 · 正 · 前 · 往后上瞟）
  const BEATS = [1 / 12, 6 / 12, 10 / 12, 13 / 12, 15 / 12, 16 / 12];   // 蓄力心跳：鼓包间隔 5 → 4 → 3 → 2 → 1 帧（0.42 → 0.08 s）
  const HOP_MX = [0, 2, 2, 4, 4];                                // 移动：每个腾空帧往前挪 2 格，一共挪 4 格
  const HOP_TILT = [-2, 0, 2, 0], HOP_EY = [0, 0, 0, -1], HOP_SQ = [1, -1, 1, 0], HOP_STEP = [1, 0, -1, 0];   // 后倾落地（压扁）→ 蹬起拉长 → 前倾落地（压扁）→ 整个腾空
  const T_HIT = 2 / 12, T_CAP = 0.34, T_BURST_D = 5 / 12, T_BURST = INCOMING + T_BURST_D, T_LAND = T_BURST + 0.45;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.tilt = 0; P.ex = 0; P.ey = 0; P.sq = 0; P.kick = 0; P.ix = 1; P.lid = 0; P.gem = 0; P.spk = 0; P.hitF = 0; P.crack = 0; P.lit = 0; P.cap = 0; P.glint = 0; P.dim = 0;
    P.flash = 0; P.rim = 1; P.rem = 0; P.eyeX = 0; P.eyeY = 0; P.eyeR = 0; P.dq = 0; P.step = 0; P.mx = 0; P.flip = 0;
    const idle = () => {
      P.ey = -(Math.floor(TT * 2.5 + 1e-6) & 1);                 // 呼吸：每 0.4 s 蛋身从窝里浮起 1 格
      const lp = tq % DUR[IDLE]; P.ix = LOOK[Math.floor(lp / 0.6 + 1e-6) & 3];
      if (lp >= 1.42 - 1e-6 && lp < 1.58) { P.kick = -1; P.tilt = 1; P.gem = 1; }          // 胎动：壳里的东西往后一踢，后半边鼓出 1 格、蛋身往前一摇
      else if (lp >= 1.58 - 1e-6 && lp < 1.67) { P.gem = 1; }
      else if (lp >= 1.67 - 1e-6 && lp < 1.83) { P.kick = 1; P.tilt = -1; P.gem = 1; }     // 再往前一踢，前半边鼓出、往后一摇
      if (lp >= 1.83 - 1e-6 && lp < 1.92) P.lid = 1; else if (lp >= 1.92 - 1e-6 && lp < 2.0) P.lid = 2; else if (lp >= 2.0 - 1e-6 && lp < 2.08) P.lid = 1;   // 独眼眨一下
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                      // 摇晃着蹦：后倾着地（压扁）→ 蹦起、挪 2 格 → 前倾着地（压扁）→ 蹦起、挪 2 格；去程朝右，回程镜像
      const f = gait(tq), half = DUR[MOVE] / 2, back = tq >= half - 1e-6, k = Math.min(4, Math.floor(((back ? tq - half : tq)) * 6 + 1e-6));
      P.tilt = HOP_TILT[f]; P.ey = HOP_EY[f]; P.sq = HOP_SQ[f]; P.step = HOP_STEP[f]; P.ix = 1;
      P.mx = back ? 4 - HOP_MX[k] : HOP_MX[k]; P.flip = back ? 1 : 0;
    } else if (st === ATTACK) {                                  // 反弹：迎弹（晶刺半出、眯眼、往前顶）→ 被击中的晶面闪白、光刺射回 → 晶刺全出保持 → 缩回
      if (tq < T_HIT - 1e-6) { P.spk = 1; P.gem = 1; P.lid = 1; P.tilt = tq < 1 / 12 ? 0 : 1; }
      else if (tq < T_HIT + 1 / 12 - 1e-6) { P.spk = 2; P.hitF = 1; P.tilt = -1; P.ex = -1; P.gem = 3; P.rim = 2; }
      else if (tq < 0.45) { P.spk = 2; P.gem = 2; P.rim = 2; P.tilt = tq < 0.33 ? -1 : 0; }
      else { P.spk = tq < 0.6 ? 1 : 0; P.gem = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                  // 孵化蓄力：心跳越来越快、裂纹每 2 帧往下长一段、缝里透光
      P.crack = Math.min(6, Math.floor(tq * 6 + 1e-6)); P.lit = 2; P.rim = 2; P.dim = tq >= 0.25 ? 1 : 0; P.ix = 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      for (let i = 0; i < BEATS.length; i++) if (tq >= BEATS[i] - 1e-6 && tq < BEATS[i] + 1 / 12 - 1e-6) { P.kick = (i & 1) ? 1 : -1; P.tilt = (i & 1) ? -1 : 1; }
      if (tq > 1.15 && !P.kick) P.ex = (f12 & 1) ? 0 : -1;       // 最后发抖
    } else if (st === CAST) {                                    // 壳顶崩飞，独眼完全睁开
      P.crack = 6; P.lit = 2; P.cap = 1; P.gem = 3; P.rim = 3; P.dim = 1; P.ix = 0; P.ey = tq < 2 / 12 ? -1 : 0;
    } else if (st === RECOVER) {                                 // 裂纹一条条暗下去，缺口结出新晶面
      const q = clamp01(tq / 0.6); P.crack = Math.max(0, 6 - Math.floor(tq * 12 + 1e-6)); P.lit = q < 0.5 ? 2 : 1;
      P.dim = tq < 0.25 ? 1 : 0; P.cap = tq < 0.3 ? 1 : 2; P.glint = tq >= 0.3 && tq < 0.45 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.ix = q < 0.6 ? 0 : 1;
    } else if (st === HURT) {                                    // 受击：蛋在窝里被打得往后一歪，晶刺弹出反伤
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.ex = -2; P.tilt = -1; P.lid = 2; P.spk = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.ex = -1; P.lid = 1; P.spk = 1; P.rim = 0; }
    } else if (st === DEATH) {                                   // 蛋炸：裂纹全亮、发抖 → 白闪一帧 → 炸开（死亡套件）→ 只剩石窝，熄灭的独眼滚出来 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < T_BURST_D - 1e-6) {
        const k = Math.floor(d * 12 + 1e-6); P.crack = [2, 4, 6, 6, 6][k]; P.lit = k >= 2 ? 3 : 2; P.ex = (k & 1) ? -1 : -2; P.tilt = (k & 1) ? 1 : -1;
        P.spk = 2; P.lid = k === 0 ? 2 : 0; P.gem = (f12 & 1) ? 3 : 2; P.dim = k >= 1 ? 1 : 0; P.rim = k >= 1 ? 3 : 0; P.flash = k === 0 || k === 4 ? 1 : 0; P.ix = 0;
      } else {
        P.rem = 1; const e = d - T_BURST_D;
        if (e < 0.25) { const q = e / 0.25; P.eyeX = RD(2 + 5 * q); P.eyeY = RD(-16 + 15 * q - 7 * Math.sin(Math.PI * q)); }
        else if (e < 0.6) { const q = (e - 0.25) / 0.35; P.eyeX = RD(7 + 9 * q); P.eyeY = e >= 0.33 && e < 0.42 ? -2 : -1; }
        else { P.eyeX = 16; P.eyeY = -1; }
        P.eyeR = e < 0.6 ? Math.floor(e * 6 + 1e-6) & 3 : 1;
        P.gem = e < 0.5 ? ((f12 & 1) ? 2 : 4) : e < 0.8 ? ((f12 % 3) === 0 ? 2 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.ey = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    if (P.rem) { P.gx = P.eyeX; P.gy = P.eyeY - 1; }
    else { P.gx = 3 + P.ex + RD(P.tilt * 0.8); P.gy = -16 + P.ey + P.sq; }
    P.dq48 = RD(P.dq * 48); KEY(P);
  }

  // ───── 蛋：手定的刻面图（x = 列 − 8，y = 行 − 21；脚底中点为原点，面朝右）─────
  // H 亮棱 · L 受光刻面 · B 基面 · D 背光刻面 · K 棱缝 · G g k 孔雀石纹（亮 / 基 / 暗）· c 裂缝 / 眼睑 · e 眼窗（交给 drawEye）
  // 壳顶（y ≤ −18）是技能里崩飞的那块；左上三个顶点（y −20、−18、−14）各凸出 1 格成棱角
  const EGG = [
    '......HL........',   // -21
    '....HHLLB.......',   // -20
    '....HLLHBB......',   // -19
    '..HHcLLcBBc.....',   // -18 壳顶最后一行（锯齿缝的上齿）
    '...cLccLcccc....',   // -17 锯齿裂缝 + 上眼睑
    '..HLLLcLceeee...',   // -16 眼窗
    '..HLLLLHceeeeD..',   // -15 眼窗
    'HHLLLLHBBccccDD.',   // -14 下眼睑
    '.HLLLHBBBBgBBDD.',
    'HLLLHBBBBgBBDDDD',
    'HLLHBBBBgBBBDDDD',
    'HLHBBBBgBBBBDDDD',
    'LHLBBBBGBBBDDDDD',
    'LLLHBBBBgBBDDDDD',
    'LLLLHHBBBgBDDDDD',
    'BGLLLLHHBBgDDDD.',
    '.BgLLLLLHDDkDDD.',
    '.BBgGBBBLDDkDD..',
    '..BBBgBBBDkDDD..',
    '..DBBBBBDkDDD...',
    '...DDDDDDDDDD...',   // -1
  ];
  const CELL = { H: [M_HI, 3], L: [M_SH, 4], B: [M_SH, 3], D: [M_SH, 2], K: [M_SH, 1], G: [M_VEIN, 4], g: [M_VEIN, 3], k: [M_VEIN, 2] };
  const CELL_DIM = { H: [M_SH, 4], L: [M_SHD, 4], B: [M_SHD, 3], D: [M_SHD, 2], K: [M_SH, 1], G: [M_VEIN, 3], g: [M_VEIN, 2], k: [M_VEIN, 2] };
  const CAP_Y = -18;                                             // y ≤ −18 是壳顶
  // 往下蔓延的裂纹（从壳顶那圈缝往下，每段一条折线），蓄力时每 2 帧多一段；死亡时全部白热
  const CRACKS = [
    [[-3, -16], [-4, -15], [-4, -14], [-5, -13]],
    [[0, -15], [-1, -14], [-1, -13], [0, -12], [0, -11]],
    [[-5, -12], [-6, -11], [-6, -10], [-7, -9]],
    [[5, -13], [5, -12], [6, -11], [5, -10], [6, -9]],
    [[0, -10], [-1, -9], [-1, -8], [0, -7], [0, -6], [-1, -5]],
    [[4, -9], [3, -8], [3, -7], [4, -6], [4, -5], [-6, -8], [-5, -7], [-5, -6], [-6, -5]],
  ];
  const SPIKES = [[[5, -13], 1, -1], [[7, -10], 1, 0], [[7, -7], 1, 1]];      // 晶刺：[根, dx, dy]，平时露 1 格
  const HITF = [[5, -11], [6, -11], [4, -10], [5, -10], [6, -10], [7, -10], [5, -9], [6, -9]];   // 迎弹的那块晶面
  // 眼窗 4×2（x 1..4，y −16..−15）：两侧一圈魂火、中间 2×2 淡孔雀绿虹膜、1 格墨色瞳孔（随视线挪）
  const PUPIL = { '-1': [2, -16], 0: [2, -15], 1: [3, -15] };

  function drawEgg() {
    const ox = P.ex, oy = P.ey; E.setShear(P.tilt * 1.25);   // tilt ±1 顶上歪 1 格，±2 歪 2 格
    const cx = (x, y) => {                                       // 胎动鼓包：y −12..−6 这几行，后半 / 前半往外鼓 1 格
      if (y < -12 || y > -6) return [x];
      if (P.kick < 0) return x < 0 ? (x === -1 ? [x - 1, x] : [x - 1]) : [x];
      if (P.kick > 0) return x > 0 ? (x === 1 ? [x, x + 1] : [x + 1]) : [x];
      return [x];
    };
    const Y = (y) => y + oy + (y < -8 ? P.sq : 0);                // 落地压扁：上半截往下压 1 格；蹬起拉长：上半截往上抬 1 格
    const put1 = (x, y, m, t) => { for (const X of cx(x, y)) { sp(X + ox, Y(y), m, t); if (P.sq < 0 && y === -9) sp(X + ox, y + oy, m, t); } };
    const lt = P.lit === 0 ? 2 : P.lit === 1 ? 2 : 3, hot = P.lit === 3;
    part();
    for (let r = 0; r < EGG.length; r++) {
      const y = r - 21, row = EGG[r];
      if (P.sq > 0 && y === -9) continue;                        // 压扁时这一行被上半截盖住
      for (let c = 0; c < row.length; c++) {
        const ch = row[c], x = c - 8; if (ch === '.') continue;
        if (y <= CAP_Y && P.cap === 1) continue;                  // 壳顶崩飞了
        if (y <= CAP_Y && P.cap === 2) { put1(x, y, M_XTAL, ch === 'H' || ch === 'L' ? 3 : ch === 'B' ? 2 : 2); continue; }   // 新结的晶面：更亮更蓝
        if (ch === 'e') continue;                                  // 眼窗交给 drawEye
        if (ch === 'c') { put1(x, y, M_CRK, P.cap === 1 && y === -17 ? 3 : hot && ((x + y) & 1) ? 4 : lt === 3 && y === -17 ? 3 : 2); continue; }
        const [m, t] = (P.dim ? CELL_DIM : CELL)[ch]; put1(x, y, m, t);
      }
    }
    if (P.cap === 2) { put1(-2, -21, M_XTAL, 4); put1(-3, -19, M_XTAL, 4); if (P.glint) { put1(-2, -22, M_WHITE, 3); put1(-1, -20, M_XTAL, 4); put1(-4, -19, M_WHITE, 3); } }
    if (P.hitF) for (const [x, y] of HITF) put1(x, y, M_WHITE, 3);
    for (let i = 0; i < P.crack; i++) for (let k = 0; k < CRACKS[i].length; k++) { const [x, y] = CRACKS[i][k]; put1(x, y, M_CRK, hot && ((k + i) & 1) ? 4 : lt); }
    for (const [[bx, by], dx, dy] of SPIKES) {                   // 晶刺：平时是 1 格小凸起，反伤时伸出 2–3 格
      const n = P.spk + 1; for (let k = 1; k <= n; k++) put1(bx + dx * k, by + dy * k, M_XTAL, P.spk === 0 ? 2 : k === n ? 4 : k === 1 ? 2 : 3);
      if (P.spk === 2) put1(bx + dx * 2 + (dy ? 0 : 0), by + dy * 2 + (dy ? 0 : -1) + (dx && dy ? 1 : 0), M_XTAL, 2);
    }
    drawEye(put1);
    E.setShear(0);
  }
  // 独眼：lid 1 上半闭成暗缝 / 2 整个闭成暗缝；壳顶崩飞后完全睁开（虹膜长高一行、白芯）
  const EYE_TONE = [[4, 2], [4, 3], [4, 3], [4, 4], [1, 1]];      // gem 档 → [虹膜, 魂火圈]
  function drawEye(put1) {
    const [ti, to] = EYE_TONE[P.gem];
    if (P.cap === 1) {
      for (let x = 1; x <= 4; x++) put1(x, -17, M_EYE, x === 1 || x === 4 ? 3 : 4);
      for (let y = -16; y <= -15; y++) for (let x = 1; x <= 4; x++) put1(x, y, M_EYE, x === 1 || x === 4 ? 3 : 4);
      put1(2, -16, M_WHITE, 3); put1(3, -16, M_WHITE, 3); put1(3, -15, M_INK, 1);
      return;
    }
    if (P.lid === 2) { for (let x = 1; x <= 4; x++) { put1(x, -16, M_CRK, 2); put1(x, -15, M_CRK, 1); } return; }
    for (const y of [-16, -15]) { put1(1, y, M_EYE, to); put1(4, y, M_EYE, to); for (let x = 2; x <= 3; x++) put1(x, y, M_EYE, ti); }
    if (P.lid === 1) for (let x = 1; x <= 4; x++) put1(x, -16, M_CRK, 2);
    if (P.gem !== 4) { const p = PUPIL[P.ix]; put1(p[0], P.lid ? -15 : p[1], M_INK, 1); }
    if (P.gem >= 2 && P.lid === 0) put1(P.ix > 0 ? 2 : 3, -16, M_WHITE, 3);
  }

  // ───── 石窝（窝后两块碎石 + 一根斜插的断骨 → 蛋 → 窝前一排碎石、横着的断股骨、半埋的小骷髅）─────
  // 候选部件：碎石块 rubbleRock —— 一块椭圆碎石（每块一个部件，块与块之间压分界线），左上一格亮点；不画进地面以下
  function rock(cx, cy, rx, ry, m, hi) {
    part(); const X = Math.ceil(rx), Y = Math.ceil(ry);
    for (let j = -Y; j <= Y; j++) for (let i = -X; i <= X; i++) if ((i * i) / (rx * rx + 0.2) + (j * j) / (ry * ry + 0.2) <= 1 && cy + j <= 0) sp(cx + i, cy + j, m, 0);
    if (hi) sp(cx - RD(rx * 0.4), cy - RD(ry * 0.5), m, 4);
  }
  // 候选部件：断骨 brokenBone —— 一根 1 格骨杆，一头骨节（3 格 + 亮点），另一头折断（暗一格）
  function bone(x0, y0, x1, y1, m) {
    part(); E.line(x0, y0, x1, y1, m, 0);
    const sx = Math.sign(x1 - x0) || 1; sp(x1 + sx, y1, m, 0); sp(x1, y1 - 1, m, 4); sp(x1 + sx, y1 - 1, m, 0); sp(x0, y0 + 1, m, 2);
  }
  // 候选部件：小骷髅 skullBit —— 5×4 正面骷髅：圆顶、两个眼窝、一排牙
  const SKULL = ['.ooo.', 'oOOOo', 'oKoKo', '.o.o.'];
  function skull(x0, y0) { part(); for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { const ch = SKULL[j][i]; if (ch === '.') continue; sp(x0 + i, y0 + j, ch === 'K' ? M_INK : M_BONE, ch === 'O' ? 4 : ch === 'K' ? 1 : 3); } }
  function nestBack() {
    rock(-10, -2, 2.6, 2.2, M_ROCKD, 0); rock(9, -2, 2.4, 2.0, M_ROCKD, 0);
    bone(-10, -3, -13, -7, M_BONED);                             // 一根断骨斜插在窝后，戳出轮廓
  }
  // 窝前那一圈碎石（手定的图，一个部件，石块之间用 k 压一道墨缝）：x = 列 − 12，y = 行 − 3；S 亮 · s 基 · t 暗 · k 墨缝
  const RUBBLE = [
    '.....SSSs...........SSs..',
    'SSs.SsssssttSst.....Sssst.',
    'sst.ssssstkksst.....ssssstS',
    'ttt.tttttttkttkSssstktttttt',
  ];
  const RTONE = { S: 4, s: 3, t: 2, k: 1 };
  function nestFront() {
    part(); for (let r = 0; r < RUBBLE.length; r++) for (let c = 0; c < RUBBLE[r].length; c++) { const ch = RUBBLE[r][c]; if (ch !== '.') sp(c - 12, r - 3, M_ROCK, RTONE[ch]); }
    bone(-4, -3, 0, -4, M_BONE);                                 // 窝前横着一截断股骨
    skull(2, -4);                                                // 半埋在碎石里的小骷髅
  }
  // 蛋炸后滚出来的独眼：3×3 小球，瞳孔随滚动转一圈
  const PUP = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  function drawRollEye() {
    part(); const x = P.eyeX, y = P.eyeY, t = P.gem === 4 ? 1 : 2;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sp(x + i, y + j, M_EYE, i && j ? 1 : (i + j < 0 ? t + 1 : t));
    const p = PUP[P.eyeR]; sp(x + p[0], y + p[1], M_INK, 1);
  }
  function drawHero() {
    begin(hero, 0, 0);
    if (P.rem) { nestBack(); nestFront(); drawRollEye(); return; }
    if (!P.eggOnly) nestBack();
    drawEgg();
    if (!P.eggOnly) nestFront();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let capT = 9, capX0 = 0, capY0 = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, mzT = 9, mzX = 0, mzY = 0;
  const CAP_X1 = DUMMY_X, CAP_Y1 = HY - 28;
  const eyeScr = () => [scrX(P.gx), HY + P.gy];
  function capPos(t) { const q = clamp01(t / T_CAP); return [capX0 + (CAP_X1 - capX0) * q, capY0 + (CAP_Y1 - capY0) * q - 22 * Math.sin(Math.PI * q)]; }
  function onEnter(s) {
    if (s === ATTACK) shoot(3, DUMMY_X - 6, HY - 10, -258, HX + 9, FXI.enemy);   // 敌弹从假人那边打来，正好在第 2 帧撞上壳
    if (s === CAST) {                                            // 壳顶崩飞、光柱冲天、碎壳外爆
      const [x, y] = eyeScr(); capT = 0; capX0 = x - 1; capY0 = y - 4;
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
      fx.pillar(x, 0, y - 2, 1, R_EL, 0.45, 2); burst(x - 1, y - 4, 16, 50, 110, 0.3, 0.6, R_EL, 18); ring(x, y - 3, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === CHARGE && BEATS.some((b) => Math.abs(t - b) < 1e-6)) sfx('impact', { pal: 'earth', w: 0.25 });   // 壳里的心跳「咚…咚…」，越来越快
    if (s === ATTACK && Math.abs(t - T_HIT) < 1e-6) {           // 反弹：被击中的晶面闪白，一道蓝铜光刺沿原路射回
      const x = scrX(8), y = HY - 10; mzT = 0; mzX = x; mzY = y;
      burst(x, y, 8, 40, 90, 0.12, 0.3, R_EL, 6); burst(x, y, 4, 30, 70, 0.1, 0.25, FXI.impact, 4);
      shoot(1, x + 2, y, 220, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.1, 0.25], back: [10, 30] } });
      sfx('swing', { kind: 'thrust', w: 0.6 }); sfx('hit', { mat: 'stone', w: 0.5 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CAST && Math.abs(t - T_CAP) < 1e-6) {             // 碎壳砸在假人头上碎开：冲击环、成长光点从石窝往上飘
      const x = CAP_X1, y = CAP_Y1 + 2; capT = 9;
      burst(x, y, 20, 50, 130, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL); fx.cross(x, y, 5, R_EL, 0.2);
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.8, R_EL, { g: 260, floor: HY });
      for (let i = 0; i < 12; i++) spawn(K_EMBER, scrX(-9 + Math.random() * 18), HY - 2 - Math.random() * 3, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.8 + Math.random() * 0.6, R_EL);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.8 });
    }
    if (s === DEATH && Math.abs(t - T_BURST) < 1e-6) {          // 蛋炸：只把蛋交给死亡套件炸开，石窝留在原地
      poseAt(DEATH, T_BURST - 1 / 12, T_BURST - 1 / 12); P.flash = 0; P.eggOnly = 1; KEY(P); drawHero(); bakeHero();
      death.start('burst', { chunk: 3, power: 0.75, fromX: 0, fromY: -10, fadeAt: 0.95, fadeDur: 0.55, ramp: 'soul' });
      P.eggOnly = 0; hero.k1 = hero.k2 = -1;
      const x = scrX(0), y = HY - 10;
      ring(x, y, 1, R_EL); burst(x, y, 24, 60, 150, 0.3, 0.7, R_EL, 20); burst(x, y - 2, 10, 40, 100, 0.3, 0.6, FXI.dust, 10);
      flash(0.06); shake(0.25, 2); sfx('impact', { pal: 'earth', w: 0.9 });
      poseAt(DEATH, t, t);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-6) {           // 碎块落地，独眼滚停
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-12 + Math.random() * 24), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('fall', { w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_HIT], BEATS.slice(), [T_CAP], [], [], [T_BURST, T_LAND], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 8); hitDummy(0); sfx('hit', { mat: 'stone', w: 0.4 }); } }
  function hurtFx(s) {                                            // 受击：碎石屑 + 蓝铜碎光；受击时晶刺弹出、一道小光刺反弹回去（反伤）
    const hx = HX + 7, hy = HY - 10;
    burst(hx, hy, s === DEATH ? 16 : 10, 40, 110, 0.25, 0.5, FXI.dust, 18); burst(hx, hy, s === DEATH ? 12 : 6, 50, 120, 0.2, 0.45, R_EL, 12);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04);
    if (s === HURT) shoot(1, hx + 3, hy, 200, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.1, 0.2], back: [10, 20] } });
    return true;
  }
  function stepFX(dt, state, stT) {
    const [ex, ey] = eyeScr();
    if (state === MOVE && P.step !== lastStep) {                // 每次落地：闷响 + 掉 2 颗石屑
      if (P.step !== 0) { sfx('step', { w: 0.5 }); for (let i = 0; i < 2; i++) spawnX(K_PHYS, scrX((P.step > 0 ? -9 : 8) + (Math.random() - 0.5) * 3), HY - 3, (Math.random() - 0.5) * 24, -20 - Math.random() * 16, 0.5, FXI.dust, { g: 200, floor: HY }); }
      lastStep = P.step;
    }
    if (state === CHARGE) {                                      // 石窝里冒出蓝铜光点，定点汇进裂缝；裂缝往外渗光
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.PI * (0.3 + Math.random() * 0.4), r = 14 + Math.random() * 5; spawn(K_SPIRAL_PT, ex - 1, ey - 1, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 1.5); }
      if (Math.random() < dt * 8) spawn(K_EMBER, ex + (Math.random() - 0.5) * 8, ey + Math.random() * 6, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL);
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.4 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, ex + RD(Math.random() * 2 - 1), ey - 2, Math.random() * 6 - 3, -6 - Math.random() * 7, 0.6 + Math.random() * 0.6, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-12 + Math.random() * 26), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    capT += dt; mzT += dt;
  }
  function fxReset() { capT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; mzT = 9; }
  function fxBack(f12) { if (!P.rem && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxMid() {                                             // 死亡套件接管画面时，引擎不画角色：石窝和滚出来的独眼在这里自己贴上
    if (!(death.active && P.rem)) return;
    const s = hero, X = E.HX + P.mx, x0 = X - s.ox, y0 = HY - s.oy;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = s.out[y * s.w + x]; if (c !== 255) put(P.flip ? X + s.ox - x : x0 + x, y0 + y, c); }
  }
  // 崩飞的壳顶：6×4 的刻面碎块（亮面 / 基面 / 暗面），每 3 帧转 90°
  const CAP_PIX = ['.HLLB.', 'HLLBBD', 'LLBBDD', '.BBDD.'];
  const CAP_COL = { H: HI, L: AZ[3], B: AZ[2], D: AZ[1] };
  function fxFront(f12) {
    if (capT < T_CAP) {
      const [cx, cy] = capPos(capT), r = Math.floor(f12 / 3) & 3;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const ch = CAP_PIX[j][i]; if (ch === '.') continue; let u = i - 3, v = j - 2; for (let k = 0; k < r; k++) { const t = u; u = -v; v = t; } put(RD(cx + u), RD(cy + v), CAP_COL[ch]); }
      put(RD(cx - 4), RD(cy + 1), EL[2]); put(RD(cx - 5), RD(cy + 2), EL[3]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, 21); }
    if (P.cap === 1 && !P.rem && P.dq < 1) { const [x, y] = eyeScr(); const L = E.state === CAST && E.stT < 0.2 ? 5 : 3; for (let r = 3; r <= L + 1; r++) { const c = r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(x + r, y - 1, c); put(x - r - 1, y - 1, c); put(x, y - r - 1, c); } }
  }
  function drawShot(k, x, y, d, f12, R) {                         // 反弹的蓝铜光刺：2×5 菱形，白尖
    if (k !== 1) return false;
    put(x + d, y, 21); put(x, y, R[0]); put(x - d, y, R[1]); put(x - 2 * d, y, R[2]); put(x - 3 * d, y, R[3]);
    put(x, y + 1, R[1]); put(x - d, y + 1, R[1]); put(x - 2 * d, y + 1, R[2]);
    return true;
  }

  return {
    name: '神石', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_CRK], HIT_POINT: [7, -10], EVENTS,
    deathKit: { mode: 'burst', at: T_BURST },
    SFX: { body: 'stone', how: 'explode', pal: 'earth', style: 'buff', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
