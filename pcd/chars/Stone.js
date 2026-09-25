// 神石 Stone（部队 · 不死 · 先锋 · 史诗 · 固定物，远程 0）：一颗埋在碎石断骨窝里的蓝铜矿巨蛋。
// 上尖下圆、壳面是一块块晶面（左上几个刻面凸出 1 格成棱角），孔雀石绿纹蜿蜒；壳顶一条锯齿裂缝，缝口在前上方豁开，里面一只魂火独眼（以后就是巨人战神和魔像的独眼）。
// 不会走、不会打：移动 = 左右摇晃着往前蹦；攻击 = 特性「蓝铜矿外壳」反弹——敌弹撞在壳上，被击中的晶面闪白，一道蓝铜光刺沿原路射回；
// 技能 = 特性「孵化」：心跳越来越快、裂纹从顶往下蔓延、石窝的光点汇进裂缝 → 壳顶崩飞、独眼睁开、光柱冲天 → 碎壳落在假人头上 → 裂纹暗下、结出新晶面；
// 死亡 = 特性「蛋炸」：裂纹全亮 → 白闪一帧 → 炸成蓝铜碎块（死亡套件 burst）+ 大冲击环，只剩石窝，熄灭的独眼滚出来。
PCD.define('Stone', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, clamp01, q12, f12of, gait, walkDemo, keyer, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 颜色：元素「孵化 · 蓝铜孔雀」（白 → 淡孔雀绿 → 蓝铜 → 深蓝铜 → 墨蓝）；蓝铜矿壳、孔雀石纹 ─────
  const R_EL = fxRamp('azurite', [21, '#c8f5e0', '#5a8cf0', '#2a48b8', '#121c5a']), EL = FXR[R_EL];
  const AZ = E.ramp(['#0a1438', '#1a3a8a', '#2e62c8', '#6aa0f0']), MAL = E.ramp(['#0c2a1e', '#1a6a48', '#36a878', '#7ad8a8']);
  const PALE = EL[1], DEEP = EL[4];
  const M_SHELL = defMat(AZ, 2);                                 // 蓝铜矿壳（大面积 band 2）
  const M_VEIN = defMat(MAL, 1);                                 // 孔雀石纹（和壳同一个部件）
  const M_XTAL = defMat([AZ[0], AZ[2], AZ[3], PALE], 1);         // 晶刺（反伤时伸出）
  const M_NEW = defMat([AZ[0], AZ[3], PALE, 21], 1);             // 收招时新结的晶面
  const M_CRK = defMat([AZ[0], DEEP, PALE, 21], 1, 1);           // 裂缝：tone 1 暗缝 · 2 墨蓝 · 3 透光 · 4 白热
  const M_EYE = defMat([DEEP, MAL[2], MAL[3], PALE], 1, 1);      // 魂火独眼（发光体）：tone 1 熄灭 · 2 暗 · 3 常亮 · 4 亮
  const M_INK = defMat([0, 0, 0, 0], 1, 1), M_WHITE = defMat([21, 21, 21, 21], 1, 1);
  const M_ROCK = defMat([0, 9, 10, 7], 1), M_ROCKD = defMat('stone', 1, 0, 1), M_BONE = defMat('bone', 1), M_BONED = defMat('bone', 1, 0, 1);

  const HX = 40, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(60, 40, 30, 34);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 8, 12], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [M_EYE, M_CRK, M_INK, M_ROCK, M_ROCKD, M_BONE, M_BONED, M_WHITE, M_VEIN]) RIM.skip[m] = 1;

  // ───── 姿势字段（全部取整）─────
  // tilt 蛋身倾斜 -1..1 · ex / ey 蛋在窝里的平移 · sq 落地压扁 · kick 胎动鼓包（-1 后 / 1 前）· ix 独眼看向 · lid 眼睑 0 睁 / 1 半 / 2 闭
  // gem 独眼档（0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）· spk 晶刺 0 缩 / 1 半出 / 2 全出 · hitF 被击中的晶面闪白 · crack 裂纹段数 0–6 · lit 裂纹亮度 0–3
  // cap 壳顶 0 完好 / 1 崩飞 / 2 新晶面 · rem 蛋炸后只剩石窝 · eyeX / eyeY / eyeR 滚出来的独眼 · eggOnly 只画蛋（交给死亡套件炸开）
  const P = { tilt: 0, ex: 0, ey: 0, sq: 0, kick: 0, ix: 0, lid: 0, gem: 0, spk: 0, hitF: 0, crack: 0, lit: 0, cap: 0, glint: 0, flash: 0, rim: 0, rem: 0,
    eyeX: 0, eyeY: 0, eyeR: 0, dq: 0, dq48: 0, eggOnly: 0, st: 0, step: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['tilt', -1, 1], ['ex', -3, 2], ['ey', -2, 1], ['sq', 0, 1], ['kick', -1, 1], ['ix', -1, 1], ['lid', 0, 2], ['gem', 0, 4], ['spk', 0, 2], ['hitF', 0, 1],
    ['crack', 0, 6], ['lit', 0, 3], ['cap', 0, 2], ['glint', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['rem', 0, 1], ['eyeX', -2, 20], ['eyeY', -16, 1], ['eyeR', 0, 3], ['dq48', 0, 48], ['eggOnly', 0, 1]]);
  const LOOK = [1, 0, 1, -1];                                    // 待机：独眼每 0.6 s 转一下
  const BEATS = [0.08, 0.5, 0.83, 1.08, 1.25, 1.33];            // 蓄力心跳：鼓包间隔 0.4 → 0.15 s
  const T_HIT = 2 / 12, T_CAP = 0.34, T_BURST_D = 5 / 12, T_BURST = INCOMING + T_BURST_D, T_LAND = T_BURST + 0.45;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.tilt = 0; P.ex = 0; P.ey = 0; P.sq = 0; P.kick = 0; P.ix = 1; P.lid = 0; P.gem = 0; P.spk = 0; P.hitF = 0; P.crack = 0; P.lit = 0; P.cap = 0; P.glint = 0;
    P.flash = 0; P.rim = 1; P.rem = 0; P.eyeX = 0; P.eyeY = 0; P.eyeR = 0; P.dq = 0; P.step = 0; P.mx = 0; P.flip = 0;
    const idle = () => {
      P.ey = -(Math.floor(TT * 2.5 + 1e-6) & 1);                 // 呼吸：每 0.4 s 蛋身从窝里浮起 1 格
      const lp = tq % DUR[IDLE]; P.ix = LOOK[Math.floor(lp / 0.6 + 1e-6) & 3];
      if (lp >= 1.42 - 1e-6 && lp < 1.58) { P.kick = -1; P.tilt = 1; P.gem = 1; }          // 胎动：先往后鼓、蛋身往前一摇
      else if (lp >= 1.58 - 1e-6 && lp < 1.67) { P.gem = 1; }
      else if (lp >= 1.67 - 1e-6 && lp < 1.83) { P.kick = 1; P.tilt = -1; P.gem = 1; }     // 再往前鼓、往后一摇
      if (lp >= 1.83 - 1e-6 && lp < 1.92) P.lid = 1; else if (lp >= 1.92 - 1e-6 && lp < 2.0) P.lid = 2; else if (lp >= 2.0 - 1e-6 && lp < 2.08) P.lid = 1;   // 独眼眨一下
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                      // 摇晃着蹦：后倾（着地）→ 蹦起 1 格 → 前倾（落地）→ 压扁回正
      const f = gait(tq); P.tilt = [-1, 0, 1, 0][f]; P.ey = [0, -1, 0, 0][f]; P.sq = f === 3 ? 1 : 0; P.step = [1, 0, -1, 0][f]; P.ix = 1;
      const w = walkDemo(tq, 5, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                  // 反弹：迎弹（晶刺半出、眯眼、往前顶）→ 被击中的晶面闪白、光刺射回 → 晶刺全出保持 → 缩回
      if (tq < T_HIT - 1e-6) { P.spk = 1; P.gem = 1; P.lid = 1; P.tilt = tq < 1 / 12 ? 0 : 1; }
      else if (tq < T_HIT + 1 / 12 - 1e-6) { P.spk = 2; P.hitF = 1; P.tilt = -1; P.ex = -1; P.gem = 3; P.rim = 2; }
      else if (tq < 0.45) { P.spk = 2; P.gem = 2; P.rim = 2; P.tilt = tq < 0.33 ? -1 : 0; }
      else { P.spk = tq < 0.6 ? 1 : 0; P.gem = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                  // 孵化蓄力：心跳越来越快、裂纹每 2 帧往下长一段、缝里透光
      P.crack = Math.min(6, Math.floor(tq * 6 + 1e-6)); P.lit = 2; P.rim = 2; P.ix = 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      for (let i = 0; i < BEATS.length; i++) if (tq >= BEATS[i] - 1e-6 && tq < BEATS[i] + 1 / 12 - 1e-6) { P.kick = (i & 1) ? 1 : -1; P.tilt = (i & 1) ? -1 : 1; }
      if (tq > 1.15 && !P.kick) P.ex = (f12 & 1) ? 0 : -1;
    } else if (st === CAST) {                                    // 壳顶崩飞，独眼完全睁开
      P.crack = 6; P.lit = 3; P.cap = 1; P.gem = 3; P.rim = 3; P.ix = 0; P.ey = tq < 2 / 12 ? -1 : 0;
    } else if (st === RECOVER) {                                 // 裂纹一条条暗下去，缺口结出新晶面
      const q = clamp01(tq / 0.6); P.crack = Math.max(0, 6 - Math.floor(tq * 12 + 1e-6)); P.lit = q < 0.5 ? 2 : 1;
      P.cap = tq < 0.3 ? 1 : 2; P.glint = tq >= 0.3 && tq < 0.45 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
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
        P.spk = 2; P.lid = k === 0 ? 2 : 0; P.gem = (f12 & 1) ? 3 : 2; P.rim = k >= 1 ? 3 : 0; P.flash = k === 0 || k === 4 ? 1 : 0;
      } else {
        P.rem = 1; const e = d - T_BURST_D;
        if (e < 0.25) { const q = e / 0.25; P.eyeX = RD(1 + 5 * q); P.eyeY = RD(-14 + 13 * q - 7 * Math.sin(Math.PI * q)); }
        else if (e < 0.6) { const q = (e - 0.25) / 0.35; P.eyeX = RD(6 + 8 * q); P.eyeY = e >= 0.33 && e < 0.42 ? -2 : -1; }
        else { P.eyeX = 14; P.eyeY = -1; }
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
    else { P.gx = 2 + P.ex + RD(P.tilt * 1.25 * 16 / 26); P.gy = -16 + P.ey; }
    P.dq48 = RD(P.dq * 48); KEY(P);
  }

  // ───── 形状表（本地坐标：脚底中点为原点，面朝右）─────
  // 蛋的外形：左右两条折线（刻面），左上几个顶点往外凸 1 格成棱角；约 16 宽 × 21 高，底下 3 行埋在石窝里
  const LV = [[-21, 0], [-19, -2], [-18, -4], [-16, -4], [-14, -6], [-12, -6], [-10, -8], [-5, -8], [-2, -7], [-1, -6]];
  const RV = [[-21, 1], [-20, 2], [-18, 3], [-16, 5], [-13, 6], [-10, 7], [-5, 7], [-2, 6], [-1, 5]];
  const interp = (V, y) => { for (let i = 0; i < V.length - 1; i++) { const a = V[i], b = V[i + 1]; if (y >= a[0] && y <= b[0]) return a[1] + (b[1] - a[1]) * (y - a[0]) / Math.max(1, b[0] - a[0]); } return V[V.length - 1][1]; };
  const EGG_L = [], EGG_R = []; for (let y = -21; y <= -1; y++) { EGG_L.push(RD(interp(LV, y))); EGG_R.push(RD(interp(RV, y))); }
  const eggRow = (y) => [EGG_L[y + 21], EGG_R[y + 21]];
  // 壳顶锯齿裂缝：第 x 列的缝在哪一行；缝以上（和第 -19 行以上）是会崩飞的壳顶，约 8×4
  const SEAM = { '-4': -17, '-3': -18, '-2': -17, '-1': -18, 0: -17, 1: -18, 2: -17 };
  const seamAt = (x) => (SEAM[x] == null ? -99 : SEAM[x]);
  const inCapAt = (x, y) => y < seamAt(x) || y < -18;
  const NOTCH = [[3, -18], [3, -17], [4, -17], [4, -16], [5, -16]];          // 裂口：缝在前上方豁开的缺口
  const isNotch = (x, y) => NOTCH.some((n) => n[0] === x && n[1] === y);
  const EYE_IRIS = [[2, -16], [3, -16], [2, -15], [3, -15]], EYE_RING = [[1, -16], [1, -15], [4, -15], [2, -14], [3, -14]];   // 缺口里的独眼：2×2 虹膜 + 一圈魂火
  const inEye = (x, y) => EYE_IRIS.some((w) => w[0] === x && w[1] === y) || EYE_RING.some((w) => w[0] === x && w[1] === y);
  // 往下蔓延的裂纹（每段一条折线），蓄力时每 2 帧多一段
  const CRACKS = [
    [[-3, -16], [-3, -15], [-4, -14], [-4, -13]],
    [[0, -16], [0, -15], [1, -14], [1, -13], [0, -12]],
    [[-4, -12], [-5, -11], [-5, -10], [-6, -9], [-6, -8]],
    [[4, -14], [5, -13], [5, -12], [6, -11], [5, -10]],
    [[0, -11], [-1, -10], [-1, -9], [0, -8], [0, -7], [-1, -6]],
    [[5, -9], [4, -8], [4, -7], [5, -6], [-6, -7], [-5, -6], [-5, -5], [-6, -4]],
  ];
  // 晶面：按最近的种子点分块（Voronoi），左上的块亮、右边的块暗，块与块之间压一道棱线
  const SEEDS = [[-1, -19, 4], [2, -18, 3], [-3, -14, 4], [1, -14, 3], [5, -12, 2], [-5, -9, 3], [0, -9, 3], [4, -6, 2], [-3, -4, 3]];
  const CELL = {}; for (let y = -21; y <= -1; y++) { const [L, R] = eggRow(y); for (let x = L - 1; x <= R + 1; x++) { let bi = 0, bd = 1e9; for (let i = 0; i < SEEDS.length; i++) { const d = (x - SEEDS[i][0]) ** 2 + ((y - SEEDS[i][1]) * 0.85) ** 2; if (d < bd) { bd = d; bi = i; } } CELL[x + ',' + y] = bi; } }
  const cellAt = (x, y) => CELL[x + ',' + y];
  const VEINS = [[[4, -12], [3, -12], [2, -12], [1, -11], [0, -10], [-1, -9], [-2, -8], [-2, -7], [-3, -6], [-4, -5]],   // 孔雀石纹：两条蜿蜒的绿纹
    [[6, -9], [5, -8], [5, -7], [4, -6], [3, -5], [3, -4]], [[-6, -13], [-5, -12], [-6, -11], [-7, -10]]];
  const SPIKES = [[[6, -13], 1, -1], [[7, -9], 1, 0], [[7, -6], 1, 1]];        // 晶刺：[根, dx, dy]
  const HITF = [[6, -11], [7, -11], [6, -10], [7, -10], [5, -10], [6, -12]];  // 迎弹的那块晶面

  // ───── 画：石窝后半 → 蛋（壳 + 晶面 + 纹 + 裂纹 + 晶刺 + 独眼）→ 石窝前半 ─────
  function rock(cx, cy, rx, ry, m, hi) {
    part(); const X = Math.ceil(rx), Y = Math.ceil(ry);
    for (let j = -Y; j <= Y; j++) for (let i = -X; i <= X; i++) if ((i * i) / (rx * rx + 0.2) + (j * j) / (ry * ry + 0.2) <= 1 && cy + j <= 0) sp(cx + i, cy + j, m, 0);
    if (hi) sp(cx - RD(rx * 0.4), cy - RD(ry * 0.5), m, 4);
  }
  function bone(x0, y0, x1, y1, m) {                            // 断骨：一根骨杆 + 一头骨节，另一头折断
    part(); E.line(x0, y0, x1, y1, m, 0);
    sp(x0 - 1, y0, m, 0); sp(x0, y0 + 1, m, 0); sp(x0 - 1, y0 - 1, m, 4); sp(x1, y1 - 1, m, 2);
  }
  function nestBack() {
    rock(-10, -2, 2.6, 2.0, M_ROCKD, 0); rock(9, -2, 2.4, 2.0, M_ROCKD, 0);
    bone(-10, -3, -14, -7, M_BONED);                             // 一根断骨斜插在窝后，戳出轮廓
  }
  function nestFront() {
    rock(-11, 0, 1.9, 1.3, M_ROCK, 1); rock(-7, -1, 3.1, 1.9, M_ROCK, 1); rock(-2, 0, 2.6, 1.6, M_ROCK, 1); rock(3, -1, 2.7, 1.9, M_ROCK, 1); rock(8, -1, 2.6, 1.6, M_ROCK, 1); rock(12, 0, 1.6, 1.1, M_ROCK, 0);
    bone(-4, -2, 0, -3, M_BONE);                                 // 窝前横着一截断股骨
    part(); sp(5, -3, M_BONE, 0); sp(6, -4, M_BONE, 4); sp(7, -4, M_BONE, 0); sp(8, -3, M_BONE, 2);   // 一根弯肋骨
  }
  function drawEgg() {
    const ox = P.ex, oy = P.ey; E.setShear(P.tilt * 1.25);
    const Y = (y) => y + oy + (P.sq && y < -9 ? 1 : 0);
    const bulge = (y) => y >= -12 && y <= -6;
    const shell = (x, y) => { if (y < -21 || y > -1) return false; let [L, R] = eggRow(y); if (bulge(y)) { if (P.kick < 0 || P.sq) L -= 1; if (P.kick > 0 || P.sq) R += 1; } return x >= L && x <= R && !isNotch(x, y) && !(inCapAt(x, y) && P.cap === 1); };
    part();
    for (let y = -21; y <= -1; y++) {
      const [L, R] = eggRow(y);
      for (let x = L - 1; x <= R + 1; x++) {
        if (!shell(x, y)) continue;
        const newCap = inCapAt(x, y) && P.cap === 2;
        let t = 0;
        if (!newCap) {                                           // 晶面：亮块 / 暗块，块与块之间一道棱（左半亮棱、右半暗缝）
          const c = cellAt(x, y), cr = cellAt(x + 1, y), cd = cellAt(x, y + 1), tn = SEEDS[c == null ? 0 : c][2];
          const edge = (shell(x + 1, y) && cr !== c) || (shell(x, y + 1) && cd !== c);
          if (edge) t = x < 1 ? 4 : 2; else if (tn === 4) t = 4; else if (tn === 2 && shell(x - 1, y) && shell(x, y - 1)) t = 2;
        }
        sp(x + ox, Y(y), newCap ? M_NEW : M_SHELL, t);
      }
    }
    for (const v of VEINS) for (let k = 0; k < v.length; k++) { const [x, y] = v[k]; if (shell(x, y) && !inEye(x, y)) sp(x + ox, Y(y), M_VEIN, k % 4 === 1 ? 4 : 3); }
    if (P.cap === 2) { sp(-1 + ox, Y(-20), M_NEW, 4); sp(0 + ox, Y(-19), M_NEW, 4); if (P.glint) { sp(0 + ox, Y(-21), M_WHITE, 3); sp(-2 + ox, Y(-19), M_NEW, 4); } }
    if (P.hitF) for (const [x, y] of HITF) sp(x + ox, Y(y), M_WHITE, 3);
    // 裂纹：壳顶的锯齿缝一直在（暗缝），蓄力 / 死亡时往下长、透光
    const lt = P.lit === 0 ? 1 : P.lit === 1 ? 2 : 3, hot = P.lit === 3;
    for (let x = -4; x <= 2; x++) { const y = seamAt(x); if (!shell(x, y) || inEye(x, y)) continue; sp(x + ox, Y(y), M_CRK, P.cap === 1 ? 3 : P.cap === 2 ? 2 : hot && ((x + y) & 1) ? 4 : lt); }   // 平时暗缝；崩开后是断口亮边；新晶面下是愈合线
    for (let i = 0; i < P.crack; i++) for (let k = 0; k < CRACKS[i].length; k++) { const [x, y] = CRACKS[i][k]; if (shell(x, y) && !inEye(x, y)) sp(x + ox, Y(y), M_CRK, hot && ((k + i) & 1) ? 4 : lt); }
    // 晶刺：平时是 1 格小凸起，反伤时伸出 2–3 格
    for (const [[bx, by], dx, dy] of SPIKES) { const n = P.spk + 1; for (let k = 1; k <= n; k++) sp(bx + dx * k + ox, Y(by + dy * k), M_XTAL, k === n ? 4 : 3); if (P.spk === 2) sp(bx + dx * 2 + ox + (dy ? 1 : 0), Y(by + dy * 2) + (dy ? 0 : -1), M_XTAL, 2); }
    drawEye(ox, Y);
    E.setShear(0);
  }
  // 独眼：缺口里 2×2 的淡孔雀绿虹膜 + 一圈绿魂火 + 竖瞳；lid 1 半闭 / 2 闭成暗缝；壳顶崩飞后完全睁开成 3×3、白芯
  const EYE_TONE = [[4, 2], [4, 3], [4, 3], [4, 4], [1, 1]];      // gem 档 → [虹膜, 魂火圈]
  function drawEye(ox, Y) {
    const [ti, to] = EYE_TONE[P.gem];
    if (P.cap === 1) {
      for (let y = -17; y <= -15; y++) for (let x = 1; x <= 3; x++) sp(x + ox, Y(y), M_EYE, 4);
      for (const [x, y] of [[0, -16], [4, -16], [4, -15], [2, -14], [0, -15]]) sp(x + ox, Y(y), M_EYE, 3);
      sp(2 + ox, Y(-16), M_WHITE, 3); sp(2 + P.ix + ox, Y(-17), M_INK, 1); sp(2 + P.ix + ox, Y(-15), M_INK, 1);
      return;
    }
    if (P.lid === 2) { for (const [x, y] of EYE_IRIS.concat(EYE_RING)) sp(x + ox, Y(y), M_CRK, y === -15 ? 2 : 1); return; }
    for (const [x, y] of EYE_RING) if (P.gem >= 2) sp(x + ox, Y(y), M_EYE, to); else sp(x + ox, Y(y), M_CRK, 2);   // 平时眼眶是墨蓝暗缝，蓄满后一圈魂火
    for (const [x, y] of EYE_IRIS) sp(x + ox, Y(y), M_EYE, ti);
    if (P.lid === 1) { sp(2 + ox, Y(-16), M_CRK, 1); sp(3 + ox, Y(-16), M_CRK, 1); }
    if (P.gem !== 4) sp((P.ix > 0 ? 3 : 2) + ox, Y(P.lid ? -15 : -16), M_INK, 1);   // 竖瞳（随视线挪一格）
    if (P.gem >= 2 && P.lid === 0) sp((P.ix > 0 ? 2 : 3) + ox, Y(-15), M_WHITE, 3);
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
      const [x, y] = eyeScr(); capT = 0; capX0 = x; capY0 = y - 3;
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
      fx.pillar(x, 0, y - 2, 1, R_EL, 0.45, 2); burst(x, y - 3, 16, 50, 110, 0.3, 0.6, R_EL, 18); ring(x, y - 2, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_HIT) < 1e-6) {           // 反弹：被击中的晶面闪白，一道蓝铜光刺沿原路射回
      const x = scrX(8), y = HY - 10; mzT = 0; mzX = x; mzY = y;
      burst(x, y, 8, 40, 90, 0.12, 0.3, R_EL, 6); burst(x, y, 4, 30, 70, 0.1, 0.25, FXI.impact, 4);
      shoot(1, x + 2, y, 220, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.1, 0.25], back: [10, 30] } });
      sfx('hit', { mat: 'stone', w: 0.5 }); sfx('swing', { kind: 'thrust', w: 0.6 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CAST && Math.abs(t - T_CAP) < 1e-6) {             // 碎壳砸在假人头上碎开：冲击环、成长光点从石窝往上飘
      const x = CAP_X1, y = CAP_Y1 + 2; capT = 9;
      burst(x, y, 20, 50, 130, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL);
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
  const EVENTS = [[], [], [T_HIT], [], [T_CAP], [], [], [T_BURST, T_LAND], []];
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
    if (state === MOVE && P.step !== lastStep) {                // 每次落地掉 2 颗石屑
      if (P.step !== 0) { sfx('step', { w: 0.5 }); for (let i = 0; i < 2; i++) spawnX(K_PHYS, scrX((P.step > 0 ? -9 : 8) + (Math.random() - 0.5) * 3), HY - 3, (Math.random() - 0.5) * 24, -20 - Math.random() * 16, 0.5, FXI.dust, { g: 200, floor: HY }); }
      lastStep = P.step;
    }
    if (state === CHARGE) {                                      // 石窝里冒出蓝铜光点，定点汇进裂缝；裂缝往外渗光
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.PI * (0.3 + Math.random() * 0.4), r = 14 + Math.random() * 5; spawn(K_SPIRAL_PT, ex, ey, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 1.5); }
      if (Math.random() < dt * 8) spawn(K_EMBER, ex + (Math.random() - 0.5) * 8, ey + Math.random() * 6, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL);
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.4 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, ex + RD(Math.random() * 2 - 1), ey - 1, Math.random() * 6 - 3, -6 - Math.random() * 7, 0.6 + Math.random() * 0.6, R_EL); } }
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
  // 崩飞的壳顶：6×4 的刻面碎块，每 3 帧转 90°
  const CAP_PIX = ['.1223.', '122332', '223321', '.2211.'];
  const CAP_COL = { 1: AZ[1], 2: AZ[2], 3: AZ[3] };
  function fxFront(f12) {
    if (capT < T_CAP) {
      const [cx, cy] = capPos(capT), r = Math.floor(f12 / 3) & 3;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { const ch = CAP_PIX[j][i]; if (ch === '.') continue; let u = i - 3, v = j - 2; for (let k = 0; k < r; k++) { const t = u; u = -v; v = t; } put(RD(cx + u), RD(cy + v), CAP_COL[ch]); }
      put(RD(cx - 4), RD(cy + 1), EL[2]); put(RD(cx - 5), RD(cy + 2), EL[3]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, 21); }
    if (P.cap === 1 && !P.rem && P.dq < 1) { const [x, y] = eyeScr(); const L = E.state === CAST && E.stT < 0.2 ? 5 : 3; for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); } }
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
