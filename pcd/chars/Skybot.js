// 天空机器人（部队 · 虚空 · 战士 · 神话）：脉冲机器人升级成的高大悬停机甲——背后一对展开成 V 的后掠三角钢翼（后缘 4 个喷口）、两根加长的电极天线、带散热鳍和拳背喷口的活塞拳、腿换成两只喷火推进器。
// 攻击 = 俯冲冲撞（拉升后整机带着直拳撞向目标，火焰溅射）；技能 = 特性「火焰占卜 + 电磁脉冲」：俯冲直拳砸下炸开火焰 nova，再从目标身上依次扩散 3 道电青冲击环（3 层防御减益）。
// 升级线：和 Pulsebot.js 同一台机器——天线、活塞拳、紫色脉冲核心、钢盔目镜、肩甲警示条保留。
PCD.define('Skybot', (E) => {
  const { parts, Sprite, bake, begin, part, sp, run, rect, brush, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS, K_EMBER, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：电磁脉冲 · 电青（bolt：白 → 淡金 → 青 → 蓝 → 深蓝）；溅射 / 喷焰 fire，爆炸烟 dust ─────
  const R_EL = FXI.bolt, EL = FXR[R_EL], R_FIRE = FXI.fire, R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    armor: { r: 'steel', band: 2 }, steel: 'steel', polish: [27, 29, 30, 31], wing: 'steel', iron: 'iron', red: 'crimson',
    ink: { r: 'ink', flat: 1 }, core: { r: 'purple', flat: 1 }, glow: { r: [43, 43, 21, 21], flat: 1 }, eye: { r: [25, 42, 43, 21], flat: 1 },
    jetB: { r: [40, 23, 22, 21], flat: 1 }, jetO: { r: [44, 45, 46, 47], flat: 1 }, arc: { r: [40, 22, 22, 21], flat: 1 },
  });
  const BODY = { body: 'heroic', leg: 13, torso: 13, head: 5, headW: 7, sw: 8, arm: 11, lw: 3, stride: 3 };
  const HOV = 2;                                                // 悬停基准：在骨架离地高度上再抬 2 格（喷口底离地约 6 格）
  const HX = 74, DUR = DEFAULT_DUR.slice();                     // 近战：俯冲前冲 2 + 内杆 4，拳面够到 x≈95
  const hero = new Sprite(72, 62, 34, 56);                      // 脚底（悬停点正下方的地面）= (34, 56)；放得下拉升 4 格的天线、翼尖、俯冲伸出的拳
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['core', 'glow', 'eye', 'ink', 'jetB', 'jetO', 'arc', 'red']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前拳 hx / hy（内杆收回时的拳心）+ ext；lift 在悬停高度上再升降；step 推进器前后摆；flameN 火焰长度，flameC 0 蓝 · 1 橙 · 2 熄火 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ext: 0, lean: 0, crouch: 0, bob: 0, lift: 0, step: 0, wup: 0, walk: 0, head: 0, wing: 0, ant: 0,
    flameN: 0, flameC: 0, fistFire: 0, gem: 0, arc: 0, eyes: 0, flash: 0, rim: 0, dq: 0, bx: 0, st: 0, lying: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean) => ({ hx, hy, bhx, bhy, lean });
  const K_IDLE = K(12, -17, 8, -22, 1);
  const K_WIND = K(6, -24, 4, -22, -1);                         // 拉升后仰，拳收到肩后
  const K_RAM = K(12, -15, 6, -19, 2);                          // 俯冲冲撞
  const K_HOLD = K(12, -16, 7, -20, 2);
  const K_CH = K(5, -30, 7, -20, -1);                           // 蓄力：拳举到肩后上方
  const K_SLAM = K(13, -11, 6, -19, 2);                         // 施放：俯冲直拳砸下
  const K_HURT = K(9, -18, 5, -22, -1);
  const K_FALL = K(10, -14, 6, -18, 2);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 31], ['hy', -48, 7], ['bhx', -16, 31], ['bhy', -48, 7], ['ext', 0, 7], ['lean', -1, 2], ['bob', -1, 1], ['lift', -8, 8], ['step', -1, 1], ['wing', -1, 1], ['ant', -2, 2]]);
  const KEY2 = parts.keyer([['flameN', 0, 5], ['flameC', 0, 2], ['fistFire', 0, 2], ['gem', 0, 4], ['arc', 0, 2], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const WAVE = [0, 1, 0, -1];
  const G_BOB = [0, -1, 0, 1], G_FL = [3, 2, 4, 3], G_STEP = [1, 0, -1, 0], G_WING = [0, 1, 0, -1];   // 悬停推进：4 帧起伏 + 火尾长短 + 推进器前后交替 + 翼尖扑动
  const T_RAM = 2 / 12, FS = 2 / 12, T_CRASH = INCOMING + FS + 8 / 12;   // 死亡：受击 2 帧 → 坠落 8 帧（每 2 帧换一次朝向）→ 落地爆炸
  const T_RINGS = [1 / 12, 3 / 12, 5 / 12];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.ext = 0; P.bob = 0; P.lift = 0; P.step = 0; P.wing = 0; P.ant = 0; P.flameN = 2 + (f12 & 1); P.flameC = 0; P.fistFire = 0;
    P.gem = 0; P.arc = 0; P.eyes = 0; P.flash = 0; P.rim = 1; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1 ? -1 : 0; P.wing = WAVE[(b + 1) & 3]; P.ant = WAVE[b & 3]; P.gem = b & 1;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.arc = f === 1 || f === 3 ? 2 : 1; P.ant = f & 1 ? 1 : -1; P.gem = 1; }   // 个性：两根天线之间跳电弧
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {
      const f = E.gait(tq); setK(K_IDLE, K_IDLE, 0); P.lean = 2; P.bob = G_BOB[f]; P.flameN = G_FL[f]; P.step = G_STEP[f]; P.wing = G_WING[f]; P.ant = -G_WING[f];
      P.hx = K_IDLE.hx + 1; P.hy = K_IDLE.hy + 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); setK(K_IDLE, K_WIND, q); P.lift = RD(3 * q); P.flameC = 1; P.fistFire = 1; P.gem = 1; P.ant = 1; P.wing = -1; }
      else if (tq < 0.2) { setK(K_RAM, K_RAM, 0); P.lift = -4; P.bx = 2; P.ext = 4; P.flameC = 1; P.flameN = 5; P.fistFire = 2; P.gem = 2; P.rim = 2; P.ant = 2; P.wing = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_RAM, K_HOLD, q); P.lift = RD(-4 + 2 * q); P.bx = 2; P.ext = RD(4 - 2 * q); P.flameC = 1; P.fistFire = 1; P.gem = 1; P.ant = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.lift = RD(-2 * (1 - q)); P.bx = RD(2 * (1 - q)); P.ext = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 升高 4 格，喷口由蓝转橙，天线电弧越跳越密，拳背喷口点火
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CH, q); P.lift = RD(4 * q);
      P.flameC = tq < 0.7 ? 0 : 1; P.flameN = 3 + (f12 & 1); P.fistFire = tq < 0.45 ? 0 : tq < 0.9 ? 1 : 2; P.arc = (f12 & 1) ? 2 : 1; P.ant = q > 0.9 ? ((f12 & 1) ? 2 : -1) : RD(q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.wing = q > 0.5 ? ((f12 >> 1) & 1 ? 1 : 0) : 0;
    } else if (st === CAST) { const j = tq < 2 / 12; setK(K_SLAM, K_SLAM, 0); P.lift = j ? -5 : -4; P.bx = 2; P.ext = j ? 5 : 4; P.flameC = 1; P.flameN = 4 + (f12 & 1); P.fistFire = 2; P.gem = 3; P.rim = 3; P.arc = 2; P.ant = 2; P.wing = 1; }
    else if (st === RECOVER) {                                         // 喷口回蓝，拉升回原高
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.lift = RD(-4 * (1 - q)); P.bx = RD(2 * (1 - q)); P.ext = RD(4 * (1 - q));
      P.flameC = q < 0.4 ? 1 : 0; P.fistFire = q < 0.3 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.arc = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.lift = 1; P.eyes = 1; P.ant = 2; P.wing = -1; P.flameN = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.lift = 1; P.eyes = 1; P.ant = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 坠落爆炸：喷口熄火 → 每 2 帧换一次朝向（正 → 镜像 → 正 → 镜像）、前后倾 ±1 打着旋坠地 → 落地爆炸（死亡套件 burst）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < FS) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.lift = 1; P.eyes = 1; P.ant = 2; P.flameN = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < FS + 8 / 12) {
        const n = Math.min(7, Math.floor((d - FS) * 12 + 1e-6)), k = n >> 1, q = clamp01((n + 1) / 7);
        setK(K_FALL, K_FALL, 0); P.flip = k & 1; P.lean = k & 1 ? 0 : 2; P.bx = -2; P.lift = RD(1 - 9 * q * q); P.eyes = 1; P.flameC = 2;
        P.ant = k & 1 ? -2 : 2; P.wing = k & 1 ? -1 : 1; P.gem = n & 1 ? 1 : 4;
      } else { setK(K_FALL, K_FALL, 0); P.lift = -8; P.bx = -2; P.eyes = 1; P.flameC = 2; P.gem = 4; P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 2;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob; P.lean = RD(P.lean);
    const g = armGeo(parts.rig(P, BODY)); P.gx = g.fx - 3 + P.bx; P.gy = g.fy - 5 - P.lift - HOV;   // 发光体 = 拳背喷口
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const shift = (R, y) => RD(R.lean * (1 - clamp01((y - R.yS) / Math.max(1, R.yHip - R.yS))));
  const coreAt = (R) => [1 + shift(R, R.yS + 7), R.yS + 7];
  const jet = () => (P.flameC === 1 ? M.jetO : M.jetB);
  function thick(x0, y0, x1, y1, r, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) brush(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n, r, m, 0); }
  // 候选部件：后掠三角翼板——凸四边形 A(翼根前缘) → T(翼尖) → C(后缘拐点) → B(翼根后缘) 填满：亮前缘 1 格、两道翼肋、后缘锯齿，
  // 后缘上 2 个喷口（铁喷嘴 + 向翼下喷的发光体，熄火时只剩铁）；far = 远侧（暗一级）
  const lerp2 = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  function segD(px, py, a, b) { const vx = b[0] - a[0], vy = b[1] - a[1], q = clamp01(((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)); return Math.hypot(px - a[0] - vx * q, py - a[1] - vy * q); }
  function wingPlate(A, T, C, B, far) {
    const Q = [A, T, C, B], m = far ? M.wingD : M.wing, e = far ? M.wing : M.polish, j = P.flameC === 2 ? null : jet();
    const x0 = Math.floor(Math.min(A[0], T[0], C[0], B[0])), x1 = Math.ceil(Math.max(A[0], T[0], C[0], B[0]));
    const y0 = Math.floor(Math.min(A[1], T[1], C[1], B[1])), y1 = Math.ceil(Math.max(A[1], T[1], C[1], B[1]));
    let sg = 0; for (let i = 0; i < 4; i++) { const a = Q[i], b = Q[(i + 1) & 3], c = Q[(i + 2) & 3]; sg += (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); }
    const inside = (x, y) => { for (let i = 0; i < 4; i++) { const a = Q[i], b = Q[(i + 1) & 3], cr = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (cr * sg < -0.35 * Math.hypot(b[0] - a[0], b[1] - a[1])) return false; } return true; };
    part();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inside(x, y)) continue;
      const dT = Math.min(segD(x, y, B, C), segD(x, y, C, T));
      if (dT < 0.8 && ((x + 300) % 3) === 0 && segD(x, y, A, T) > 1.2) continue;   // 后缘锯齿
      sp(x, y, segD(x, y, A, T) < 0.75 ? e : m, segD(x, y, A, T) < 0.75 ? (far ? 3 : 4) : 0);
    }
    for (const [p, q] of [[lerp2(A, T, 0.3), lerp2(B, C, 0.72)], [lerp2(A, T, 0.6), lerp2(C, T, 0.3)]]) {   // 翼肋（从前缘内侧 1 格起）
      const n = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])) * 2;
      for (let s = 2; s < n - 1; s++) { const x = RD(p[0] + (q[0] - p[0]) * s / n), y = RD(p[1] + (q[1] - p[1]) * s / n); if (inside(x, y)) sp(x, y, m, 2); }
    }
    for (const p of [lerp2(B, C, 0.5), lerp2(C, T, 0.28)]) {                // 后缘喷口：铁喷嘴 2 格 + 翼下喷焰
      const x = RD(p[0]), y = RD(p[1]);
      sp(x, y, M.iron, 0); sp(x + 1, y, M.iron, 4); sp(x, y + 1, M.iron, 0); sp(x + 1, y + 1, M.iron, 0);
      if (j) { sp(x, y + 2, j, 4); sp(x + 1, y + 2, j, 3); sp(x - 1, y + 3, j, 3); if (P.flameN >= 3 || P.flameC === 1) sp(x - 1, y + 4, j, 2); }
      else sp(x, y + 2, M.iron, 1);
    }
  }
  // 两片翼：近侧翼尖指向后上方，远侧翼尖指向后方略偏下，剪影成 V（翼尖相距 ≥ 20 格）；P.wing 让两片翼尖一起上下扑 1 格
  function wings(L, yS, far) {
    const f = P.wing;
    if (far) wingPlate([-4 + L, yS + 3], [-26 + L, yS + 11 + f], [-16 + L, yS + 13 + RD(f / 2)], [-5 + L, yS + 9], 1);
    else wingPlate([-6 + L, yS + 2], [-23 + L, yS - 13 + f], [-19 + L, yS - 4 + RD(f / 2)], [-7 + L, yS + 8], 0);
  }
  // 候选部件：电极天线——1 格钢杆，尖端 2 格电极（arc 0 暗 · 1 亮 · 2 白），随 sway 甩动
  function electrode(x0, y0, h, sway, m) {
    part();
    for (let k = 0; k <= h; k++) { const q = k / h; sp(x0 - RD(sway * q * q * 1.5), y0 - k, m, k === h ? 4 : 0); }
    const tx = x0 - RD(sway * 1.5); sp(tx, y0 - h - 1, P.arc ? M.arc : M.core, P.arc === 2 ? 4 : P.arc ? 3 : 2); sp(tx, y0 - h - 2, P.arc ? M.arc : M.core, P.arc ? 3 : 1);
  }
  const tips = (R) => { const L = R.lean, s = RD(P.ant * 1.5); return [[-8 + L - s, R.yS - 3 - 13], [-4 + L - s, R.yS - 1 - 12]]; };
  // 候选部件：推进器腿——胯关节球 + 圆筒 + 外扩喷口钟 + 向下喷焰（长度 flameN，蓝 / 橙 / 熄火）；off = 喷口前后摆（步态），far = 远侧
  function thruster(hx, yH, off, far) {
    const mS = far ? M.steelD : M.steel, mI = far ? M.ironD : M.iron;
    part();
    rect(hx - 1, yH, 3, 2, mS, 0); sp(hx - 1, yH, mS, 4);
    for (let k = 0; k < 3; k++) { const x = RD(hx - 1 + off * (k + 1) / 4); run(yH + 2 + k, x, x + 3, k === 1 ? mI : mS, k === 1 ? 2 : 0); }
    const nx = hx - 1 + off; run(yH + 5, nx - 1, nx + 4, mI, 0); run(yH + 6, nx - 1, nx + 4, mI, 0); sp(nx - 1, yH + 5, mI, 4); sp(nx + 4, yH + 6, mI, 1);
    if (P.flameC === 2) return;
    part();
    const j = jet(), n = P.flameN;
    for (let k = 0; k < n; k++) { const w = k === 0 ? 3 : k < n - 1 ? 2 : 1, x0 = nx + 1 + (k === 0 ? -1 : 0) + (k >= 2 && (k & 1) ? 1 : 0); for (let i = 0; i < w; i++) sp(x0 + i, yH + 7 + k, j, k === 0 ? 4 : k < n - 1 ? 3 : 2); }
  }
  const CORE_LV = [
    [['core', 3], ['core', 2], ['core', 1]], [['core', 4], ['core', 3], ['core', 2]], [['glow', 3], ['core', 4], ['core', 3]], [['glow', 3], ['glow', 3], ['core', 4]], [['core', 1], ['core', 1], ['core', 1]],
  ];
  // 候选部件：楔形机甲躯干——宽肩上宽下窄、分缝、铆钉、腰下深红警示斜纹裙甲；胸口圆形脉冲核心（同 Pulsebot）
  function torso(R) {
    const yS = R.yS, yH = R.yHip;
    part();
    for (let y = yS; y <= yH + 1; y++) {
      const s = shift(R, y), t = clamp01((y - yS - 3) / Math.max(1, yH - yS - 3)), half = y <= yS + 3 ? 9 : RD(9 - 4 * t);
      let x0 = -half + s, x1 = half - 1 + s + (y <= yS + 3 ? 1 : 0);
      if (y === yS || y === yH + 1) { x0++; x1--; }
      for (let x = x0; x <= x1; x++) {
        let m = M.armor, tn = 0;
        if (y >= yH) { m = ((x - y) & 3) < 2 ? M.red : M.ink; tn = m === M.red ? 3 : 0; }
        else if (x === -3 + s && y > yS + 1 && y < yH - 1) tn = 2;
        else if (y === yS + 10 && x > x0 && x < x1) tn = 2;
        sp(x, y, m, tn);
      }
      if (y === yS + 11) { sp(x0 + 1, y, M.polish, 4); sp(x1 - 1, y, M.polish, 4); }
    }
    const c = coreAt(R), lv = CORE_LV[P.gem];
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const a = Math.abs(i), b = Math.abs(j); if (a === 2 && b === 2) continue;
      if (a === 2 || b === 2) { sp(c[0] + i, c[1] + j, M.steel, (i < 0 || j < 0) ? 4 : 2); continue; }
      const L = a + b === 0 ? lv[0] : a + b === 1 ? lv[1] : lv[2]; sp(c[0] + i, c[1] + j, M[L[0]], L[1]);
    }
  }
  // 候选部件：嵌肩头盔（同 Pulsebot）+ 盔顶深红短脊
  function helm(x, y) {
    part();
    for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) { if (j === -2 && (i === -3 || i === 3)) continue; sp(x + i, y + j, M.steel, 0); }
    for (let i = -1; i <= 3; i++) sp(x + i, y, M.ink, 0);
    if (!P.eyes) { sp(x + 2, y, M.eye, 3); sp(x + 3, y, M.eye, 4); }
    sp(x - 2, y + 1, M.steel, 4);
    run(y - 3, x - 2, x, M.red, 0); sp(x - 3, y - 3, M.red, 0);
  }
  function armGeo(R) {
    const Sx = 5 + R.lean, Sy = R.yS + 2, Ex = Sx + 1, Ey = Sy + 6, a = Math.atan2(P.hy - Ey, P.hx - Ex), k = RD(a / (Math.PI / 4));
    const dx = RD(Math.cos(k * Math.PI / 4)), dy = RD(Math.sin(k * Math.PI / 4));
    return { Sx, Sy, Ex, Ey, dx, dy, lx: P.hx - 4 * dx, ly: P.hy - 4 * dy, fx: P.hx + P.ext * dx, fy: P.hy + P.ext * dy };
  }
  // 候选部件：散热鳍液压臂——上臂 + 肘球 + 液压筒（3 片竖散热鳍）+ 抛光内杆
  function pistonArm(g) {
    part();
    thick(g.Sx, g.Sy, g.Ex, g.Ey, 1.2, M.steel); brush(g.Ex, g.Ey, 1.5, M.steel, 0); sp(g.Ex, g.Ey, M.steel, 4);
    thick(g.Ex, g.Ey, g.lx, g.ly, 1.3, M.steel);
    const n = Math.max(1, Math.hypot(g.lx - g.Ex, g.ly - g.Ey));
    for (let k = 0; k < 3; k++) { const q = 0.15 + k * 0.33, x = RD(g.Ex + (g.lx - g.Ex) * q), y = RD(g.Ey + (g.ly - g.Ey) * q); if (n < 2 && k) break; sp(x, y - 2, M.polish, 0); sp(x, y - 3, M.polish, 4); }
    if (P.ext > 0) for (let k = 1; k <= P.ext + 1; k++) rect(RD(g.lx + g.dx * k) - (g.dx < 0 ? 1 : 0), RD(g.ly + g.dy * k) - (g.dy < 0 ? 1 : 0), 2, 2, M.polish, 0);
  }
  // 候选部件：喷口活塞拳——7×7 钢拳 + 抛光指虎（3 道指缝）+ 深红腕带 + 拳背 2×2 喷口（fistFire 1 / 2 档向后上方喷焰）；far = 后拳（5×5，暗一级）
  function fist(x, y, far) {
    part();
    if (far) { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!(Math.abs(i) === 2 && Math.abs(j) === 2)) sp(x + i, y + j, i >= 1 ? M.polishD : M.steelD, 0); return; }
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) {
      if ((i === 3 || i === -3) && (j === -3 || j === 3)) continue;
      let m = i >= 2 ? M.polish : M.steel, t = 0;
      if (i >= 2 && (j === -1 || j === 1)) t = 1;
      if (i === -3) { m = (j & 1) ? M.red : M.ink; t = m === M.red ? 3 : 0; }
      sp(x + i, y + j, m, t);
    }
    sp(x - 1, y - 2, M.steel, 4); sp(x + 1, y + 2, M.steel, 2);
    sp(x - 2, y - 4, M.iron, 0); sp(x - 1, y - 4, M.iron, 0); sp(x - 2, y - 5, M.iron, 4);
    if (P.fistFire) { const j = M.jetO; sp(x - 3, y - 6, j, 4); sp(x - 2, y - 6, j, 3); sp(x - 4, y - 7, j, 3); if (P.fistFire > 1) { sp(x - 3, y - 7, j, 4); sp(x - 5, y - 8, j, 2); sp(x - 4, y - 8, j, 3); sp(x - 6, y - 9, j, 2); } }
  }
  // 候选部件：大肩甲——抛光高光 + 2 颗铆钉 + 下沿深红警示条
  function pauldron(R) {
    const yS = R.yS, L = R.lean;
    part();
    run(yS - 1, -1 + L, 6 + L, M.polish, 0);
    for (let y = yS; y <= yS + 3; y++) run(y, -3 + L, 8 + L, M.polish, 0);
    for (let x = -2 + L; x <= 7 + L; x++) { const g = ((x + yS) & 1) === 0; sp(x, yS + 4, g ? M.red : M.ink, g ? 3 : 0); }
    sp(-1 + L, yS + 1, M.steel, 4); sp(6 + L, yS + 1, M.steel, 4);
  }
  function drawHero() {
    const eff = P.lift + HOV; begin(hero, P.bx, -eff, eff); const R = parts.rig(P, BODY), yS = R.yS, L = R.lean;
    wings(L, yS, 1);
    electrode(-8 + L, yS - 3, 13, P.ant, M.steelD); electrode(-4 + L, yS - 1, 12, P.ant, M.steel);
    part(); thick(-2 + L, yS + 3, P.bhx, P.bhy, 1.2, M.steelD); fist(P.bhx, P.bhy, 1);
    thruster(R.hipBx, R.yHip + 1, -P.step * 2, 1);
    thruster(R.hipFx, R.yHip + 1, P.step * 2, 0);
    torso(R);
    helm(1 + L, yS - 2);
    wings(L, yS, 0);
    const g = armGeo(R); pistonArm(g);
    pauldron(R);
    fist(g.fx, g.fy, 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y - P.lift - HOV;
  let smT = 9, smX = 0, smY = 0, chargeAcc = 0, arcAcc = 0, soulAcc = 0, fireAcc = 0, lastF = -1, lastArc = 0;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function embers(x, n, spread) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x, HY - 10, (Math.random() - 0.5) * spread, -30 - Math.random() * 30, 0.5 + Math.random() * 0.3, R_FIRE, { g: 260, floor: HY }); }
  function arcBetween(dur, seed) { const R = parts.rig(P, BODY), T = tips(R); fx.bolt(wx(T[0][0] + P.bx), wy(T[0][1]), wx(T[1][0] + P.bx), wy(T[1][1]), R_EL, dur, 2, seed); }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 俯冲直拳砸下：拳头落点炸开火焰 nova
    const x = DUMMY_X - 4, y = HY - 6;
    releaseOrbit(50, 110, 0.3, 0.6, { ramp: R_FIRE });
    burst(x, y, 36, 60, 150, 0.3, 0.7, R_FIRE, 16); ring(x, y, 1, R_FIRE); fx.cross(x, y, 7, R_FIRE, 0.3); fx.crack(x, HY + 1, 8, 1, R_FIRE, 0.9); fx.crack(x - 2, HY + 1, 8, -1, R_FIRE, 0.9);
    embers(x, 8, 90); dust(x, 8, 50); hitDummy(1);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.9 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_RAM) {                                 // 冲撞：拳尖火焰溅射 + 电青小环
      const g = armGeo(parts.rig(P, BODY)), tx = wx(g.fx + 4 + P.bx), ty = wy(g.fy);
      smT = 0; smX = tx; smY = ty;
      burst(tx, ty, 14, 40, 110, 0.2, 0.45, R_FIRE, 10); embers(tx, 4, 70); ring(tx, ty, 0, R_EL); fx.cross(tx, ty, 4, R_EL, 0.2);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.85 });
    }
    if (s === CAST) {                                                  // 3 层减益：电青冲击环依次从目标扩散，每层一条短电弧锁住目标
      const i = T_RINGS.indexOf(t); if (i < 0) return;
      const cx = DUMMY_X, cy = HY - 15;
      ring(cx, cy, i === 2 ? 1 : 0, R_EL); burst(cx, cy, 8, 30, 80, 0.2, 0.4, R_EL, 6);
      const S = [[-10, -14, 6, 4], [9, -12, -5, 6], [-8, 8, 7, -6]][i]; fx.bolt(cx + S[0], cy + S[1], cx + S[2], cy + S[3], R_EL, 0.25, 2, 11 + i * 7);
      if (i === 0) dummyFx({ dur: 1.4, outline: R_EL, slow: 0.5 });
      sfx('impact', { pal: 'bolt', w: 0.5 + i * 0.1 });
    }
    if (s === DEATH && t === T_CRASH) {                                // 坠地爆炸 → 金属碎片四散
      poseAt(DEATH, T_CRASH - 1 / 12, T_CRASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('burst', { power: 1.1, fromX: 0, fromY: -10, fadeAt: 1.0, fadeDur: 0.6 });
      const x = HX - 2, y = HY - 8;
      burst(x, y, 30, 60, 150, 0.3, 0.7, R_FIRE, 20); burst(x, y, 6, 60, 130, 0.6, 0.9, FXI.steel, 30); ring(x, y, 1, R_FIRE); fx.cloud(x, y - 4, 8, 'dust', 1.3, 2); dust(x, 12, 50);
      shake(0.2, 2); sfx('fall', { w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.9 });
    }
  }
  const EVENTS = [[], [], [T_RAM], [], T_RINGS, [], [], [T_CRASH], []];
  function hurtFx(s) {
    const hx = HX + 2, hy = HY - 20; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, FXI.steel, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const R = parts.rig(P, BODY);
    if (state === CHARGE) {                                            // 电青火花螺旋收拢到拳背喷口；天线电弧越跳越密
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), HY + P.gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      arcAcc += dt; const every = 5 / 12 - 3 / 12 * clamp01(stT / 1.2); if (arcAcc >= every) { arcAcc = 0; arcBetween(0.12, 3 + Math.floor(stT * 12)); }
    } else arcAcc = 0;
    if (state === IDLE && P.arc === 2 && lastArc !== 2) arcBetween(0.1, 5);
    lastArc = P.arc;
    if ((state === MOVE || state === IDLE) && P.flameC !== 2) {        // 推进器尾焰粒子（每换一个步态帧 / 每 3 帧 1 颗）
      const f = state === MOVE ? E.gait(q12(stT)) : Math.floor(stT * 4); if (f !== lastF) { lastF = f; for (const hx of [R.hipFx, R.hipBx]) spawn(K_EMBER, wx(hx + 1 + P.bx), wy(R.yHip + 9 + P.flameN), (Math.random() - 0.5) * 6, 10 + Math.random() * 10, 0.25 + Math.random() * 0.2, state === MOVE ? R_EL : FXI.water); }
    }
    if (state === CAST || state === RECOVER) {                         // 目标周围地面余火
      fireAcc += dt * (state === CAST ? 30 : 14); while (fireAcc >= 1) { fireAcc -= 1; spawn(K_EMBER, DUMMY_X - 12 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 12, 0.3 + Math.random() * 0.4, R_FIRE); }
    }
    if (state === DEATH && stT >= INCOMING + FS && stT < T_CRASH) {      // 坠落：两只熄火的喷口各拖一串烟
      const f = Math.floor(stT * 12 + 1e-6); if (f !== lastF) { lastF = f; for (const hx of [R.hipFx, R.hipBx]) spawn(K_RISE, wx(hx + 1 + P.bx), wy(R.yHip + 8), (Math.random() - 0.5) * 6, -4 - Math.random() * 6, 0.22 + Math.random() * 0.1, FXI.dust); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt;
  }
  function fxReset() { smT = 9; chargeAcc = 0; arcAcc = 0; soulAcc = 0; fireAcc = 0; lastF = -1; lastArc = 0; }
  function fxBack(f12) {
    if (P.dq < 1) { groundShadow(wx(0), 12, 4 + P.lift + HOV); floorGlow(wx(P.gx), P.rim, EL, f12); }
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                         // 拳背喷口星芒
      const gx = wx(P.gx), gy = HY + P.gy, Lr = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= Lr; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (smT < 2 / 12) {                                                 // 俯冲速度线（2 帧）
      const c = smT < 1 / 12 ? EL[0] : EL[2];
      for (const [dy, len] of [[-12, 8], [-5, 12], [2, 9], [8, 6]]) for (let k = 12; k < 12 + len; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX - k, smY + dy - (k >> 2), c); }
    }
  }

  return {
    name: '天空机器人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.core, M.glow, M.eye, M.jetB, M.jetO, M.arc], HIT_POINT: [2, -20], EVENTS,
    deathKit: { mode: 'burst', at: T_CRASH },
    SFX: { body: 'machine', how: 'explode', pal: 'bolt', style: 'bolt', w: 0.9, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
