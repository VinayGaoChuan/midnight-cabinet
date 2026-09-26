// 水战士（部队 · 不死 · 刺客 · 优质）：溺亡的尸体。瘦削伏低（常驻 crouch 2），一头湿海草长发从后脑垂到腰后、再往身后拖出几绺；
// 背脊竖着一道半透明鱼背鳍（锯齿边）；双手反握鱼颌骨短刃，刃贴着前臂伸出肘外；颈侧三道腮裂，眼窝两点水碧魂火。
// 攻击 = 伏身前冲，反握双刃交叉连斩两道斜弧（前手向下斜、后手向上斜）。
// 技能 = 特性「伏击」：脚下渗出一滩水，他按列沉进水面，只剩头发在水面漂转一圈 → 假人脚下鼓起水面、水柱冲起，他从假人身后跃出 → 剪刀式合斩成 X。
// 死亡 = 融化：从脚往上按列塌成一滩水（死亡套件 melt），两把短刃落在水滩里，最后水滩蒸发成上升的水碧粒子。
// 升级成「不朽蓝魔」（ImmortalBlueDemon.js）：同一个溺尸被深渊魔化——湿发变飘动的长鬃、背鳍变大带刺、鱼骨刃长成月牙弯刃。
PCD.define('WaterWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, fxRamp, color, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_BURST, K_PHYS, K_STILL, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：伏击 · 溺潭碧（白 → 水白 → 碧蓝 → 深碧 → 墨潭）─────
  const R_EL = fxRamp('drownpool', [21, '#b0f0ff', '#4ab8d8', '#1e6a8a', '#0c2a3e']), EL = FXR[R_EL], R_IMP = FXI.impact;
  const HAIR = ['#0c140a', '#1e2e16', '#34482a', '#54683e'], HC = HAIR.map((h) => color(h));

  // ───── 材质（名字D = 暗一级，远侧腿 / 后臂 / 后手刃用）─────
  const M = parts.mats(E, {
    skin: ['#1a2420', '#3c5248', '#6a8a76', '#a4c2a8'],              // 苍绿泡水尸肤
    hair: HAIR,                                                      // 墨绿褐海草发
    fin: ['#1e3a40', '#3a6a70', '#6aa0a4', '#a0d0d0'],               // 淡青半透背鳍
    bone: 'bone', rope: ['#1c1814', '#3e362c', '#6a5c48', '#8c7c62'], rag: 'stone',   // 鱼骨刃 · 烂渔网绳（灰褐）· 烂布条
    eye: { r: [EL[4], EL[3], EL[2], EL[1]], flat: 1 },               // 水碧魂火（发光体）
  });
  const BODY = { body: 'slim', arm: 11, sw: 3, lw: 2, stride: 3, hunch: 1, head: 7, headW: 6, fall: 'front' };
  const HX = 78, DUR = DEFAULT_DUR.slice(), BLADE = 8;
  const hero = new Sprite(64, 56, 30, 50);
  const drop = new Sprite(34, 8, 17, 6);                             // 死亡时落在水滩里的两把短刃（融化时单独画，不跟着塌）
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'eye', 'rope']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = hx / hy / a（前手刃），后手 = bhx / bhy / ba（后手刃）；刃角 0 朝上、顺时针为正；反握时刃指向肘后 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, sink: 0, gill: 0, drop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, ba, lean, head, crouch });
  // a / ba = 手腕偏转：刃默认贴着前臂（手 → 肘）伸出肘外，偏转让刃和前臂张开一点
  const K_IDLE = K(12, -14, 0.1, 2, -9, -1.3, 2, 0, 3);            // 伏低：前手平伸在胸前，刃贴在前臂下、伸出肘外；后手收在胯前，刃往后下斜出身后
  const K_SNEAK = K(12, -12, 0.1, 1, -8, -1.3, 2, 1, 3);            // 潜行小跑：更低、更前倾
  const K_WIND = K(2, -20, 0.2, 0, -10, -1.2, 0, 0, 3);             // 攻击预兆：前手举到头侧
  const K_CUT1 = K(13, -9, 0.5, 2, -10, -1.2, 2, 1, 3);             // 第一斩：前手向下斜
  const K_CUT2 = K(9, -10, 0.4, 12, -18, 0.3, 2, 1, 2);             // 第二斩：后手向上斜
  const K_HOLD = K(9, -10, 0.4, 11, -17, 0.3, 1, 0, 2);
  const K_SQUAT = K(10, -9, 0.2, 2, -8, -1.2, 2, 1, 3);             // 蓄力：蹲进水里
  const K_LEAP = K(6, -18, 0.3, 0, -19, -0.3, 1, -1, 3);            // 从水柱里跃出
  const K_XWIND = K(3, -21, 0.3, 1, -8, -1.2, 0, 0, 3);             // 合斩预备：前刃在上、后刃在下
  const K_XCUT = K(12, -8, 0.5, 11, -20, 0.3, 2, 1, 3);             // 剪刀合斩：两刃交成 X
  const K_LAND = K(11, -12, 0.2, 2, -9, -1.2, 2, 1, 3);
  const K_HURT = K(7, -15, 0.2, -1, -12, -1.0, -1, -1, 1);
  const K_SLUMP = K(8, -5, 0.2, 2, -4, -0.8, 2, 1, 4);              // 跪倒，手垂到地
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['sink', 0, 31], ['gill', 0, 1], ['drop', 0, 1], ['lying', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WHIP = [[1, 2, 1], [-1, -3, 0], [-1, -2, 0], [0, -1, 1], [0, 0, 1]];   // 待机个性「甩水」：[头, 发, 前倾]
  const SINK = [0, 0, 0, 0, 0, 3, 6, 9, 12, 15, 18, 21, 24, 30, 30, 30, 30];  // 蓄力逐帧下沉的行数（贴地截断）
  const T_CUT1 = 2 / 12, T_CUT2 = 4 / 12, T_X = 4 / 12, T_MELT = INCOMING + 0.42, T_SPLAT = T_MELT + 0.55;
  const MX_B = DUMMY_X + 13 - HX;                                    // 伏击：从假人身后跃出（镜像朝左）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, fr = RD(tq * 12);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.sink = 0; P.gill = 0; P.drop = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.gill = (b >> 1) & 1;
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 1.9) { const w = WHIP[Math.floor((lp - 1.5) * 12 + 1e-6)]; P.head = w[0]; P.beard = w[1]; P.lean = w[2]; P.gill = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 伏身潜行小跑：贴地、小步快跑，头发和背鳍往后拖
      setK(K_SNEAK, K_SNEAK, 0); parts.gait(P, E.gait(tq)); P.beard = P.beard - 2;
      P.hx += P.step; P.bhx -= P.step;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.gem = 1; }
      else if (tq < T_CUT2 - 1e-6) { setK(K_CUT1, K_CUT1, 0); P.bx = 5; P.beard = -2; P.sway = -1; P.gem = 2; P.glint = fr === 2 ? 1 : 0; }
      else if (tq < 0.45) { setK(K_CUT2, K_HOLD, ease.out((tq - T_CUT2) / 0.12)); P.bx = 5; P.beard = -3; P.sway = -1; P.gem = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(5 * (1 - q)); P.beard = q < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 蹲下 → 按列沉进水面 → 只剩头发漂着 → 连头发一起没入
      setK(K_IDLE, K_SQUAT, ease.inOut(clamp01(tq / 0.35))); P.sink = SINK[Math.min(16, fr)];
      P.beard = -1 + (fr > 6 && (f12 & 1) ? 1 : 0); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.gill = 1;
    } else if (st === CAST) {                                          // 水柱里跃出（假人身后，镜像朝左）→ 空中举刃 → 剪刀合斩 → 落地
      P.mx = MX_B; P.flip = 1; P.gem = 3; P.rim = 3; P.beard = -2;
      if (fr < 1) { setK(K_LEAP, K_LEAP, 0); P.dq = 1; }
      else if (fr < 2) { setK(K_LEAP, K_LEAP, 0); P.lift = 6; P.flash = 1; P.beard = -3; }
      else if (fr < 4) { setK(K_XWIND, K_XWIND, 0); P.lift = fr === 2 ? 10 : 7; P.beard = fr === 2 ? -3 : 1; P.sway = 1; }
      else if (fr < 5) { setK(K_XCUT, K_XCUT, 0); P.lift = 2; P.beard = 2; P.sway = -1; P.glint = 1; }
      else { setK(K_XCUT, K_LAND, 0.4); P.beard = 1; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                       // 落地甩水 → 沉进身后的水洼 → 从原位的水潭里冒出来，缩回伏低
      if (fr < 3) { setK(K_LAND, K_LAND, 0); P.mx = MX_B; P.flip = 1; P.gem = 2; P.rim = 1; P.beard = fr === 1 ? -3 : fr === 2 ? 1 : -1; P.head = fr === 1 ? -1 : fr === 2 ? 1 : 0; }
      else if (fr < 5) { setK(K_LAND, K_SQUAT, 0.6); P.mx = MX_B; P.flip = 1; P.sink = fr === 3 ? 10 : 22; P.gem = 1; P.rim = 1; }
      else { setK(K_SQUAT, K_IDLE, ease.out(clamp01((fr - 5) / 3))); P.sink = [18, 11, 5, 0][Math.min(3, fr - 5)]; P.gem = fr < 7 ? 1 : 0; P.beard = fr < 8 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.gill = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 命中 → 踉跄 → 跪倒 → 融化成一滩水（之后由死亡套件接管）
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = 3; P.gem = (f12 & 1) ? 1 : 4; }
      else { setK(K_SLUMP, K_SLUMP, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.gem = 4; if (d >= T_MELT - INCOMING - 1e-6) { P.dq = 1; P.drop = 1; } }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.a = RD(P.a / ASTEP) * ASTEP; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const R = parts.rig(P, BODY); P.gx = R.hx1 - 1 + P.bx; P.gy = R.ey - P.lift + P.sink;   // 发光体 = 眼窝魂火
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：wetHair 湿长发（后层）——从后脑垂到腰后，再往身后拖出三绺，发梢下坠（湿、沉）。o = { mat, len 往后拖的格数 }
  //   读 P.beard：< 0 往后飘直、拖得更长；> 0 甩起（发梢上翘）。头顶那一层用 parts.hair 'short' 另画（压在头上）
  //   发束分三绺（外绺最长、到腰后；中绺到背中；内绺最短），往后拖的那段各自 1 格细、相位错开：飘直时一绺往下弯、一绺往上挑，不会并成一块板
  function wetHair(R, o) {
    const T = R, m = o.mat, b = P.beard, x0 = R.hx0, hy = R.hy, yW = R.yWaist, ph = (P.sway || 0) + (P.step || 0);
    E.part();
    for (let y = R.htop + 1; y <= hy; y++) { parts.px(E, T, x0 - 1, y, m, ((y - R.htop) % 3) === 2 ? 2 : 0); if (y > R.htop + 2) parts.px(E, T, x0 - 2, y, m, y & 1 ? 2 : 3); }   // 后脑：贴着头皮垂下的一片
    const END = [yW + 1, yW - 2, R.yS + 3], LEN = [o.len, o.len - 1, 2], OUT = [0, 1, 2], BEND = [1, -1, 0];
    for (let s = 0; s < 3; s++) {
      const y1 = END[s], n = Math.max(1, y1 - hy); let x = x0 - 2;
      for (let k = 1; k <= n; k++) {                                                                     // 顺着背垂下来（外绺贴得最远）
        const y = hy + k, q = k / n, e = parts.edges(R, y)[0];
        x = Math.min(x0 - 2, e - 1) - RD(OUT[s] * q + q * q * (0.6 + Math.max(0, -b) * 0.5)) + (b > 0 ? RD(b * q * 0.6) : 0);
        parts.px(E, T, x, y, m, (k % 3) === 1 ? 2 : s === 0 ? 3 : 2); if (s === 0 && k > 1) parts.px(E, T, x + 1, y, m, 2);
      }
      const L = LEN[s] + Math.max(0, -b);                                                                // 往身后拖：垂着时发梢下坠，飘直时波浪错相，甩起时上翘；梢头亮一格 = 湿光
      let lx = x, ly = y1;
      for (let i = 1; i <= L; i++) {
        const qi = i / L;
        const dy = b > 0 ? -RD(b * qi * 1.3) : b < 0 ? RD(BEND[s] * qi * (1 + qi) + Math.sin(qi * 3.4 + ph * 1.3 + s * 2.1) * 0.8 * qi) : RD(qi * qi * (1.6 + s * 0.4));
        const X = x - i, Y = y1 + dy; parts.line(E, T, lx, ly, X, Y, m, 3); if (s === 0 && i <= 2) parts.px(E, T, X + 1, Y + 1, m, 2);
        lx = X; ly = Y;
      }
      parts.px(E, T, lx, ly, m, 4);
    }
  }
  // 候选部件：dorsalFin 背鳍——沿背脊（后颈 → 胯）竖起 n 根鳍棘，往后上方斜，棘间是隔点镂空的鳍膜（透出后面的发 / 勾线色 = 半透明），膜的外沿比棘低 = 锯齿。
  //   o = { mat, h 棘长, n 棘数, y0 / y1 起止行, spike 刺材质（棘尖再冒 1 格骨刺，魔化后的大鳍用）}；读 P.beard（< -1 时往后倒 1 格）
  function dorsalFin(R, o) {
    const T = R, m = o.mat, y0 = o.y0 != null ? o.y0 : R.yS, y1 = o.y1 != null ? o.y1 : R.yHip - 1, n = o.n || 3, back = P.beard < -1 ? 1 : 0;
    E.part();
    const tip = [];
    for (let i = 0; i < n; i++) { const yr = RD(y0 + (y1 - y0) * (i + 0.3) / n), L = o.h + (i === 0 ? 1 : 0) - (i === n - 1 ? 1 : 0) + back; tip.push([yr, L]); }
    for (let y = y0; y <= y1; y++) {                                                           // 鳍膜：外沿在两根棘之间凹下去
      let w = 1; for (const [yr, L] of tip) w = Math.max(w, L - 1 - Math.abs(y - yr));
      const e = parts.edges(R, y)[0];
      for (let i = 1; i <= w; i++) { const x = e - i; if (i < w && ((x + y) & 1)) continue; parts.px(E, T, x, y, m, i === w ? 4 : 3); }
    }
    for (const [yr, L] of tip) {                                                               // 鳍棘：往后上方斜，棘尖最亮
      const e = parts.edges(R, yr)[0];
      for (let k = 1; k <= L; k++) parts.px(E, T, e - k, yr - FL2(k * 0.6), m, k === L ? 4 : 2);
      if (o.spike) parts.px(E, T, e - L - 1, yr - FL2((L + 1) * 0.6) - 1, o.spike, 4);
    }
  }
  const FL2 = (v) => Math.floor(v + 1e-6);
  // 候选部件：boneBlade 反握鱼颌骨短刃——刃从拳的小指一侧伸出、贴着前臂往肘后伸；刃脊在受光一侧，刃口一侧隔格缺一格 = 锯齿；柄缠海草。
  //   T 落笔变换（身体 R 或 parts.FREE），gx / gy 手心，a 刃的朝向（吸附 16 向），len 刃长；一个部件
  function boneBlade(T, gx, gy, a, m, wrap, len0, glint) {
    const di = parts.snapDir(a), sg = parts.cell(di, 0, 0, 2), sx = sg[0] < 0 ? gx - 1 : gx, sy = sg[1] < 0 ? gy - 1 : gy;
    const c12 = parts.cell(di, 0, 0, 12), len = Math.max(3, RD(len0 * 12 / Math.hypot(c12[0], c12[1])));   // 斜放时按主轴步数折算，长度不变
    E.part();
    parts.bar(di, sx, sy, -2, -2, 1, (k, j, X, Y) => parts.px(E, T, X, Y, m, 4));                  // 柄头骨节
    parts.bar(di, sx, sy, -1, 0, 1, (k, j, X, Y) => parts.px(E, T, X, Y, wrap, 2));                 // 海草缠柄（被手盖住）
    parts.bar(di, sx, sy, 1, len, 2, (k, j, X, Y) => {
      if (k === len && j !== 0) return; if (j === 1 && (k >= len - 1 || ((k & 1) === 0 && k > 1))) return;   // 刃尖收成 1 格；刃口锯齿
      parts.px(E, T, X, Y, m, j === 0 ? (k === len || k === 2 ? 4 : 3) : (k === 1 ? 2 : 4));
    });
    if (glint) { const c = parts.cell(di, sx, sy, len + 1); parts.px(E, T, c[0], c[1], m, 4); }
  }
  // 反握：刃沿「手 → 肘」的方向贴着前臂，伸出肘外 3 格；off = 手腕偏转（刃和前臂张开的角度）
  function armBlade(R, arm, off, m, wrap, glint) {
    const dx = arm.ex - arm.hx, dy = arm.ey - arm.hy, L = Math.hypot(dx, dy) || 1, flat = Math.abs(dx) >= Math.abs(dy);
    boneBlade(R, arm.hx + (flat ? 0 : 1), arm.hy + (flat ? 1 : 0), Math.atan2(dx, -dy) + off, m, wrap, Math.min(9, Math.max(6, L + 3)), glint);   // 刃贴在前臂外下侧
  }
  // 腮裂：颈侧三道（和脸同一个部件），张开 = 深缝 + 下沿亮边，合上 = 浅缝
  function gills(R, hd) {
    const x = hd.x0 + 1, open = P.gill && !P.eyes;
    for (let k = 0; k < 3; k++) { const y = hd.ey + 2 + k; parts.px(E, R, x + 1 + (k === 1 ? 1 : 0), y, M.skin, open && k !== 1 ? 1 : 2); if (open) parts.px(E, R, x + 2 + (k === 1 ? 1 : 0), y, M.skin, 4); }
  }
  function drawHero() {
    E.begin(hero, P.bx, P.sink - P.lift, P.sink > 0 ? -P.sink : undefined);          // 沉入水面：整身下移，地面以下截掉
    const R = parts.rig(P, BODY), sk = M.skin, skD = M.skinD, eyeOn = P.gem < 4;
    wetHair(R, { mat: M.hair, len: 4 });
    dorsalFin(R, { mat: M.fin, h: 3, n: 3 });
    const armB = parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: skD, cuff: M.ropeD, grip: 'none' });
    if (!P.drop) armBlade(R, armB, P.ba, M.boneD, M.hairD, 0);
    parts.hand(E, R, P, { side: 'B', hand: skD });
    parts.legs(E, R, P, { style: 'bare', mat: sk, matD: skD });
    const tor = parts.torso(E, R, P, { style: 'bare', mat: sk, belt: M.rope, cloth: M.rag });
    { const c = tor.chest; parts.px(E, R, c[0] - 2, c[1] + 2, sk, 2); parts.px(E, R, c[0] - 1, c[1] + 3, sk, 2); parts.px(E, R, c[0] - 2, c[1] + 4, sk, 2);   // 肋骨
      for (let y = R.yS + 1; y < tor.belt; y++) { const e = parts.edges(R, y), t = (y - R.yS) / Math.max(1, tor.belt - R.yS), x = RD(e[0] + 1 + (e[1] - e[0] - 1) * t);   // 斜挎的一条破渔网：两根绳 + 网眼结
        parts.px(E, R, x, y, M.rope, 3); if (((y - R.yS) & 1) === 0) { parts.px(E, R, x - 2, y, M.rope, 2); parts.px(E, R, x - 1, y + 1, M.rope, 4); } }
      const by = tor.belt, bx = parts.edges(R, by)[0] + 1, sw = P.sway;                                                                                        // 腰后垂下一条破布
      parts.px(E, R, bx, by + 1, M.rag, 3); parts.px(E, R, bx - (sw < 0 ? 1 : 0), by + 2, M.rag, 2); parts.px(E, R, bx - 1 - (sw < 0 ? 1 : 0), by + 3, M.rag, 3); }
    const hd = parts.head(E, R, P, { mat: sk, face: 'gaunt', eye: eyeOn ? M.eye : 0, eyeStyle: 'glow', nose: 'small', mouth: 'line', ear: 'none' });
    gills(R, hd);
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
    parts.px(E, R, R.hx1, R.htop + 1, M.hair, 2); parts.px(E, R, R.hx1 - 1, R.htop, M.hair, 3); parts.px(E, R, R.hx0 + 3, R.htop - 1, M.hair, 4);   // 贴在额前的一绺湿发 + 头顶一点湿光
    const armF = parts.arm(E, R, P, { sleeve: 'tight', mat: sk, cuff: M.rope, grip: 'none' });
    if (!P.drop) armBlade(R, armF, P.a, M.bone, M.hair, P.glint);
    parts.hand(E, R, P, { hand: sk });
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq;
    if (P.st === CHARGE) { RIM.rx = hero.ox; RIM.ry = hero.oy + 2; }                  // 蓄力：光从脚下的水潭照上来
    else if (P.st === CAST || P.st === RECOVER) { RIM.rx = hero.ox + 14; RIM.ry = hero.oy - 14; }   // 施放：光从身前的水柱来
    else { RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    bake(hero, RIM);
  }
  // 死亡时掉在水滩里的两把短刃（一次画好）
  E.begin(drop, 0, 0); boneBlade(parts.FREE, -3, -1, -PI / 2, M.boneD, M.hairD, BLADE, 0); boneBlade(parts.FREE, 4, 0, PI / 2 + 0.2, M.bone, M.hair, BLADE, 0);
  bake(drop, { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 });

  // ───── 特效 ─────
  // 水珠（自己养的小池：落地时溅开）
  const DN = 16, dX = new Float32Array(DN), dY = new Float32Array(DN), dVX = new Float32Array(DN), dVY = new Float32Array(DN), dOn = new Uint8Array(DN);
  function drip(x, y, vx, vy) { for (let i = 0; i < DN; i++) if (!dOn[i]) { dOn[i] = 1; dX[i] = x; dY[i] = y; dVX[i] = vx; dVY[i] = vy; return; } }
  // 水面涟漪（扁椭圆，3 个槽）
  const RPN = 4, rpT = new Float32Array(RPN).fill(9), rpX = new Float32Array(RPN), rpBig = new Uint8Array(RPN);
  function ripple(x, big) { let o = 0; for (let k = 0; k < RPN; k++) if (rpT[k] > rpT[o]) o = k; rpT[o] = 0; rpX[o] = x; rpBig[o] = big ? 1 : 0; }
  let gyT = 9, xT = 9, chargeAcc = 0, soulAcc = 0, dripAcc = 0, lastStep = 0, lastWhip = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function splash(x, y, n, spd, up) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * spd, -up * (0.5 + Math.random() * 0.7), 0.5 + Math.random() * 0.4, R_EL, { g: 260, floor: HY + 1 }); }
  function puddle(x) { spawnX(K_STILL, x, HY + 1, 0, 0, 0.3, R_EL, { age0: 0.3 }); spawnX(K_STILL, x + 1, HY + 1, 0, 0, 0.3, R_EL, { age0: 0.35 }); }
  function onEnter(s) {
    if (s === CAST) {                                                  // 原位水面消失；假人脚下鼓起水面，水柱冲起
      gyT = 0; splash(HX, HY, 6, 30, 30); ripple(DUMMY_X, 1);
      burst(DUMMY_X, HY - 2, 18, 40, 110, 0.3, 0.6, R_EL, 40); ring(DUMMY_X, HY - 4, 0, R_EL);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'water', w: 0.6 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_CUT1 || t === T_CUT2)) {             // 两道斜弧：前手向下斜、后手向上斜
      const R = parts.rig(P, BODY), first = t === T_CUT1, sx = wx((first ? R.sFx : R.sBx) + P.bx), sy = wy(R.sFy);
      if (first) fx.slash(sx, sy, 11, -0.3, 2.4, R_EL, 0.17, 2, 2); else fx.slash(sx, sy, 11, 2.9, 0.5, R_EL, 0.17, 2, 2);
      const hx = DUMMY_X - 3, hy = HY - (first ? 11 : 17);
      hitDummy(0, 1); burst(hx, hy, 8, 30, 80, 0.15, 0.35, R_IMP, 8); splash(hx, hy, 4, 50, 40);
      sfx('swing', { kind: 'slash', w: 0.35 }); sfx('hit', { mat: 'flesh', w: 0.35 });
    }
    if (s === CHARGE && t === 1.25) {                                   // 头发也没入：咕咚一声，两圈同心小环
      ripple(HX, 0); ring(HX, HY - 1, 0, R_EL); splash(HX, HY, 5, 20, 45);
    }
    if (s === CAST && t === T_X) {                                      // 剪刀合斩：两道弧在假人身上交成 X
      xT = 0; const cx = DUMMY_X, cy = HY - 15;
      ring(cx, cy, 1, R_EL); burst(cx, cy, 10, 50, 120, 0.2, 0.5, R_EL, 14);
      for (let i = 0; i < 24; i++) spawnX(K_PHYS, cx + (Math.random() - 0.5) * 8, cy + (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 110, -30 - Math.random() * 70, 0.6 + Math.random() * 0.4, R_EL, { g: 260, floor: HY + 1, sz: i < 4 ? 2 : 1 });
      hitDummy(1, -1); shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.8 });
    }
    if (s === RECOVER && t === 0.1) for (let i = 0; i < 4; i++) drip(wx(-3 - i), wy(-18 + i), 20 + i * 12, -40 - i * 8);   // 落地甩水（镜像时往身后甩）
    if (s === RECOVER && t === 0.25) { ripple(wx(0), 0); splash(wx(0), HY, 6, 30, 50); }
    if (s === RECOVER && t === 5 / 12) { ripple(HX, 1); splash(HX, HY, 6, 30, 50); }
    if (s === DEATH && t === T_MELT) {                                  // 融化：先画好没有短刃的最后一帧，交给死亡套件按列塌成水
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); P.drop = 1; P.dq = 0; P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.5, fadeDur: 0.6 }); splash(HX, HY - 4, 6, 40, 30);
    }
    if (s === DEATH && t === T_SPLAT) { ripple(HX, 1); ripple(HX - 2, 0); splash(HX, HY, 8, 60, 40); shake(0.1, 1); sfx('fall', { w: 0.35 }); }
  }
  const EVENTS = [[], [], [T_CUT1, T_CUT2], [1.25], [T_X], [0.1, 0.25, 5 / 12], [], [T_MELT, T_SPLAT], []];
  function hurtFx(s) {                                                   // 溺尸挨打：火花里夹着溅出的水
    const hx = HX - 1, hy = HY - 12; burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.2, 0.45, R_IMP, 16); splash(hx, hy, s === DEATH ? 12 : 8, 80, 50);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT < 1.2) {                               // 水从四周贴着地面旋进脚下的水潭
      chargeAcc += dt * (16 + 26 * clamp01(stT / 1.0));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 8; spawnX(K_SPIRAL_PT, HX, HY + 1, r / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 3, tx: HX, ty: HY + 1, squash: 0.22 }); }
    }
    if (state === MOVE && P.step !== lastStep) {                       // 湿脚掌：每个脚印留 1 格水渍，不扬尘
      if (P.step !== 0) { const R = parts.rig(P, BODY); puddle(wx(P.step > 0 ? R.footFx + 1 : R.footBx + 1)); sfx('step', { w: 0.25 }); if (Math.random() < 0.5) drip(wx(-6), wy(-9), -10, 0); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                              // 甩水：发梢甩出 3–4 滴；平时发梢偶尔滴水
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.5 && lp < 1.9 ? Math.floor((lp - 1.5) * 12 + 1e-6) : -1;
      if (f !== lastWhip) { if (f === 1) for (let i = 0; i < 4; i++) drip(wx(-4 - i * 2), wy(-14 + i * 2), -25 - i * 15, -45 + i * 10); lastWhip = f; }
      dripAcc += dt * 1.2; if (dripAcc >= 1) { dripAcc -= 1; drip(wx(-7), wy(-9), 0, 0); }
    }
    if (state === DEATH && stT > T_MELT + 1.45 && stT < T_MELT + 2.1) { soulAcc += dt * 34; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, HX - 13 + Math.random() * 26, HY - Math.random() * 3, (Math.random() - 0.5) * 6, -12 - Math.random() * 16, 0.8 + Math.random() * 0.6, R_EL, { age0: 0.15 }); } }
    for (let i = 0; i < DN; i++) {
      if (!dOn[i]) continue; dVY[i] += 240 * dt; dX[i] += dVX[i] * dt; dY[i] += dVY[i] * dt;
      if (dY[i] >= HY) { dOn[i] = 0; puddle(RD(dX[i])); for (let k = 0; k < 3; k++) spawn(K_BURST, dX[i], HY, (k - 1) * 18, -22 - k * 4, 0.22, R_EL); }
    }
    gyT += dt; xT += dt; for (let k = 0; k < RPN; k++) rpT[k] += dt;
  }
  function fxReset() { gyT = 9; xT = 9; chargeAcc = 0; soulAcc = 0; dripAcc = 0; lastStep = 0; lastWhip = -1; dOn.fill(0); rpT.fill(9); }

  // 水面：地面上碧色隔点的扁椭圆，外沿一圈亮
  function pool(cx, rx, f12, bright) {
    if (rx < 1) return; const X = Math.ceil(rx);
    for (let dx = -X; dx <= X; dx++) for (let dy = 0; dy <= 1; dy++) {
      const e = (dx * dx) / (rx * rx) + ((dy - 0.3) * (dy - 0.3)) / 1.6; if (e > 1) continue;
      const x = cx + dx, y = FLOOR + dy;
      if (e > 0.62) put(x, y, dy === 0 ? (bright ? EL[1] : EL[2]) : EL[3]);
      else if (((x + y + (f12 >> 1)) & 1) === 0) put(x, y, bright ? EL[2] : EL[3]);
    }
  }
  function fxBack(f12) {
    const s = E.state, t = E.stT;
    if (s === CHARGE) pool(HX, 3 + 7 * ease.out(clamp01(t / 0.35)), f12, t > 0.45 && (f12 & 1));
    if (s === CAST) pool(DUMMY_X, t < 0.08 ? 10 * t / 0.08 : t < 0.4 ? 10 : 10 * (1 - (t - 0.4) / 0.1), f12, t < 0.2);
    if (s === RECOVER) { if (t >= 0.2 && t < 0.42) pool(wx(0), 6, f12, 0); if (t >= 5 / 12) pool(HX, 8 * (1 - (t - 5 / 12) / 0.3), f12, 0); }
    if (s === DEATH && t >= T_MELT) { const d = t - T_MELT; pool(HX, d < 0.6 ? 4 + 10 * d / 0.6 : d < 1.5 ? 14 : 14 * (1 - (d - 1.5) / 0.6), f12, 0); }   // 融化：身下的水滩越摊越大，最后蒸发
    for (let k = 0; k < RPN; k++) {                                    // 涟漪：扁椭圆一圈圈往外扩
      const q = rpT[k] / (rpBig[k] ? 0.5 : 0.4); if (q >= 1) continue; const rx = 2 + q * (rpBig[k] ? 16 : 11), ry = Math.max(1, rx * 0.2), n = Math.ceil(rx * 4), c = q < 0.3 ? EL[1] : q < 0.65 ? EL[2] : EL[3];
      for (let i = 0; i < n; i++) { if (q > 0.5 && ((i + f12) & 1)) continue; const a = i / n * 6.2832; put(RD(rpX[k] + Math.cos(a) * rx), RD(FLOOR + 0.5 + Math.sin(a) * ry), c); }
    }
    shotFloorGlow(f12);
  }
  function fxMid(f12) {
    const s = E.state, t = E.stT;
    if (s === CHARGE && t >= 1.0 && t < 1.25) {                        // 只剩头发在水面上漂转一圈
      const base = (t - 1.0) / 0.25 * 6.2832;
      for (let k = 0; k < 8; k++) { const a = base + k * 0.55, r = 1 + k * 0.6, x = RD(HX + Math.cos(a) * r * 1.5), y = RD(HY - 1 + Math.sin(a) * r * 0.3); put(x, y, k < 2 ? HC[3] : k < 5 ? HC[2] : HC[1]); if (k < 4) put(x, y + 1, HC[0]); }
    }
  }
  function stroke(x0, y0, x1, y1, bulge, q, f12) {                     // 一道带弧度的斩痕：前 2 帧 2 格宽白芯，之后 1 格断续变暗
    const n = RD(Math.hypot(x1 - x0, y1 - y0)), nx = -(y1 - y0) / n, ny = (x1 - x0) / n;
    for (let k = 0; k <= n; k++) {
      const s = k / n, b = Math.sin(PI * s) * bulge, x = x0 + (x1 - x0) * s + nx * b, y = y0 + (y1 - y0) * s + ny * b;
      if (q < 0.45) { put(RD(x), RD(y), Math.abs(s - 0.5) < 0.1 ? EL[0] : s < 0.2 || s > 0.8 ? EL[1] : EL[2]); put(RD(x + nx), RD(y + ny), EL[3]); }   // 碧蓝芯 + 深碧边：压在闪白的假人上也看得清
      else if (((k + f12) & 1) === 0) put(RD(x), RD(y), q < 0.7 ? EL[2] : EL[3]);
    }
  }
  function fxFront(f12) {
    if (gyT < 0.34) {                                                  // 水柱：从地面往上冲起，顶上一圈水花，0.2 s 后塌回去（合斩前落完）
      const t = gyT, h = t < 0.2 ? RD(34 * ease.out(clamp01(t / 0.1))) : RD(34 * (1 - ease.in((t - 0.2) / 0.14))), cx = DUMMY_X;
      for (let j = 0; j <= h; j++) {
        const y = HY - j, top = j > h - 3, w = top ? 3 : 2;
        for (let dx = -w; dx <= w; dx++) {
          const ad = Math.abs(dx); if (t > 0.2 && ad >= 1 && ((j + dx + f12) & 1)) continue; if (ad === w && ((j + f12) % 3) === 0) continue;
          put(cx + dx + (top && ((j + f12) & 1) ? 1 : 0), y, t < 1 / 12 ? EL[ad < 2 ? 0 : 1] : ad === 0 ? EL[0] : ad === 1 ? EL[1] : EL[2]);
        }
      }
      if (h > 4 && t < 0.24) for (let k = -4; k <= 4; k += 2) put(cx + k, HY - h - 1 - (Math.abs(k) === 2 ? 1 : 0), EL[1]);
    }
    if (xT < 0.35) { const q = xT / 0.35, cx = DUMMY_X, cy = HY - 15; stroke(cx - 11, cy - 12, cx + 11, cy + 12, 2, q, f12); stroke(cx - 11, cy + 12, cx + 11, cy - 12, -2, q, f12); }
    for (let i = 0; i < DN; i++) if (dOn[i]) { const x = RD(dX[i]), y = RD(dY[i]); put(x, y, EL[1]); if (dVY[i] > 50) put(x, y - 1, EL[2]); }
    if (E.state === DEATH && E.stT >= T_MELT + 0.3 && E.stT < T_MELT + 2.0) {   // 塌下去的尸身表面泛起水光（一行隔点的水碧色）
      const d = E.stT - T_MELT, w = RD(d < 0.9 ? 6 + 6 * d / 0.9 : 12), y = HY - (d < 0.9 ? RD(3 * (1 - d / 0.9)) + 1 : 1);
      for (let x = -w; x <= w; x++) if (((x + (f12 >> 1)) % 3) === 0) put(HX + x, y, Math.abs(x) < w * 0.4 ? EL[1] : EL[2]);
    }
    if (E.state === DEATH && E.stT >= T_MELT) {                        // 两把短刃落在水滩里，最后随水滩一起消散
      const d = E.stT - T_MELT, fq = clamp01(d / 0.15), yo = d < 0.15 ? -RD(7 * (1 - fq * fq)) : d < 0.22 ? -1 : 0, dq = clamp01((d - 1.5) / 0.6), o = drop.out;
      for (let y = 0; y < drop.h; y++) for (let x = 0; x < drop.w; x++) { const c = o[y * drop.w + x]; if (c === 255 || B8[(y & 7) * 8 + (x & 7)] < dq) continue; put(HX - 2 + x - drop.ox, HY + y - drop.oy + yo, c); }
    }
  }

  return {
    name: '水战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye], HIT_POINT: [1, -12], EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    // 音色：滴水声 + 湿脚掌的「啪嗒」；标志：沉入水中的「咕咚」，接着破水而出的「哗啦」水柱声；重量 0.35
    SFX: { body: 'flesh', how: 'collapse', pal: 'water', style: 'shadow', w: 0.35 },
    REVIVE: { ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
