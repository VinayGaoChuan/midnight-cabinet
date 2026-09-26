// 地龙王加贡（敌人 · 混沌 · 不朽 · 迷你首领 · 远程 1200）：「迷你首领单位。一只赤色巨型四爪章鱼。」
//   深朱红的球形外套膜被四条粗触臂撑离地面 10 格（两前两后，远侧暗一级），每条臂端一只三趾墨黑巨爪；外套膜顶上一圈玄武岩尖冠（5 根岩尖，岩缝透火）；
//   背后一根金箍虹吸管伸出轮廓（和铁地龙同款，更大、铁箍换金箍）；吻下垂着一排短触须；金色横瞳。
// 攻击「投岩」：近侧前臂的爪抠进地里撬出一块巨岩 → 高举过岩冠 → 往前一甩，巨岩抛物线远投砸在目标身上。
// 技能「首领单位（防御 +30%）」：四爪抠地、身体下沉 2 格，岩屑从地面定点汇进外套膜，岩冠的岩缝一根根亮起 →
//   四爪一撑，四块岩板从地下立起围住身体（四向地裂），震屏 2 格 → 岩板合成土色点阵护盾，外套膜浮出岩石甲纹，闪白一次。
// 死亡：四臂往外一摊，身体砸落压扁，岩冠滚落到身后。
// 身体：B.blob（orb、alt 10、tent n 4 只取臂根位置）+ 本模块的候选部件 clawArm / basaltCrown / goldSiphon / chinFringe。
PCD.define('EarthDragonKingGargon', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, L = B.blob, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质（全部取自共享色板） ─────
  const R_EL = FXI.earth, EL = FXR[R_EL];                                        // 地龙 · 岩土：奶油 5 → 沙 62 → 暗沙 61 → 木 19 → 深木 20
  const m = B.mats(E, {
    main: [11, 55, 56, 57],                                                     // 深朱红肉皮（勾线酒红 → 血暗 → 朱红 → 亮红）
    pink: 'pink', claw: [0, 0, 27, 28], rock: 'stone', gold: 'gold', dirt: 'sand',
  });
  m.lava = E.defMat([44, 45, 46, 47], 1, 1);                                    // 岩缝里的火（发光体）
  m.iris = E.defMat([20, 19, 14, 5], 1, 1);                                     // 金色横瞳
  const o = L.shape({ r: 11, alt: 10, shape: 'orb', eye: null, tent: { n: 4, len: 14 }, m });

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(76, 64, 36, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['lava', 'iris', 'claw', 'ink', 'gold', 'rock', 'pink']) RIM.skip[m[k]] = 1;

  // ───── 姿势字段 ─────
  //   bob / sq / lift / lie：blob 身体（lie 1 时 lift = 离地高）· tph 触须相位 · curl 短触须卷起（位掩码 0–31）
  //   两对脚（前臂 fx / fu、后臂 bx2 / bu）相对站位的偏移 / 抬起（一对的近、远两只一起动）；近侧前臂的手 ahx / ahy（绝对坐标，攻击时用）· amd 爪形 0 撑地 / 1 抠地 / 2 握岩 / 3 张开
  //   rock 近前爪里的岩 0 无 / 1 握着 / 2 半埋在土里 · dig 四爪抠地 · flat 臂摊平 · cl 亮起的岩尖数 · clv 岩缝亮度 0–3 · arm 岩甲纹 0–2 · eyes 闭眼 · sip 虹吸管甩
  //   crn 岩冠 0 戴着 / 1 飞出 / 2 落地 · cx cy 掉落岩冠位置 · crot 岩冠翻转 0–3
  const SPEC = [['bob', -2, 2], ['sq', -2, 2], ['lift', 0, 31], ['lie', 0, 2], ['tph', 0, 7], ['curl', 0, 31],
    ['fx', -8, 12], ['fu', 0, 6], ['bx2', -8, 12], ['bu', 0, 6],
    ['ahx', -12, 34], ['ahy', -52, 0], ['amd', 0, 4], ['rock', 0, 2], ['dig', 0, 1], ['flat', 0, 1], ['cl', 0, 5], ['clv', 0, 3], ['arm', 0, 2], ['eyes', 0, 1], ['sip', -1, 1],
    ['crn', 0, 2], ['cx', -30, 4], ['cy', -44, 0], ['crot', 0, 3]].concat(B.COMMON.slice(0, 5));   // 不用掉落物钩子，只取 bx flash dq48 ddir rim
  const P = {};
  function reset() {
    L.reset(P); P.sq = -1; P.curl = 0; P.fx = 0; P.fu = 0; P.bx2 = 0; P.bu = 0;
    P.ahx = 0; P.ahy = 0; P.amd = 0; P.rock = 0; P.dig = 0; P.flat = 0; P.cl = 0; P.clv = 1; P.arm = 0; P.eyes = 0; P.sip = 0;
    P.crn = 0; P.cx = 0; P.cy = 0; P.crot = 0; P.rim = 1; P.flip = 0; P.mx = 0;
  }
  reset();
  // 臂根（相对身体中心的 x）和站位的脚（本地 x）：前近、前远、后近、后远；远侧整体往后错 3 格
  const ARMS = { fn: { rx: 3, fx: 17, d: 1, far: 0 }, ff: { rx: 0, fx: 13, d: 1, far: 1 }, bn: { rx: -4, fx: -15, d: -1, far: 0 }, bf: { rx: -7, fx: -19, d: -1, far: 1 } };
  let rig = L.rig(P, o);
  const HIT_POINT = [2, -22];

  // ───── 姿势 ─────
  const SW = [0, 1, 0, -1];
  const setFeet = (f, b) => { P.fx = f[0]; P.fu = f[1]; P.bx2 = b[0]; P.bu = b[1]; };
  // 步态：两条前臂一起迈、两条后臂跟上（接触 A 前臂前伸 → 经过 后臂抬起前移 → 接触 B 后臂落下 → 经过 前臂抬起）
  const GAIT = [
    { f: [5, 0], b: [-3, 0], bob: 1 },
    { f: [3, 0], b: [2, 5], bob: -1 },
    { f: [-1, 0], b: [5, 0], bob: 1 },
    { f: [3, 5], b: [1, 0], bob: -1 },
  ];
  // 攻击：近前臂的手（绝对坐标）· 爪形 · 岩 · 身体前后
  const T_THROW = 4 / 12, T_LAND = 7 / 12, FLY = T_LAND - T_THROW;
  const ATK = [
    [17, -1, 0, 0, 0, 0],     // 0 站
    [20, -1, 1, 2, 1, 1],     // 1 抠地：爪扎进土里，岩半埋
    [19, -9, 2, 1, 1, 0],     // 2 撬出：岩在爪里，土块飞
    [6, -47, 2, 1, -1, -1],   // 3 高举过岩冠（预兆）
    [25, -33, 3, 0, 1, 0],    // 4 甩出（出手定格）
    [24, -25, 3, 0, 1, 0],    // 5 延续
    [22, -15, 0, 0, 0, 0],    // 6 收回
  ];
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6);
    P.bob = b & 1 ? -1 : 0; P.tph = Math.floor(TT * 10 / 3 + 1e-6) & 7; P.sip = SW[Math.floor(TT * 1.25 + 1e-6) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.1) { const k = f12of(lp - 1.6); P.curl = [1, 3, 7, 15, 31, 30][Math.min(5, k)]; }   // 待机个性：短触须一根根卷起又放下
    else if (lp >= 2.1 - 1e-6 && lp < 2.3) P.curl = 24;
  }
  function deathPose(d, f12) {
    P.lie = 1; P.eyes = 1; P.flat = d > 0.45 ? 1 : 0;
    const q = ease.out(clamp01((d - 0.3) / 0.22));                               // 四臂往外一摊
    setFeet([R(6 * q), 0], [R(-6 * q), 0]);
    P.lift = d < 0.4 ? 10 : d < 0.47 ? 7 : d < 0.53 ? 3 : d < 0.58 ? 1 : 0;       // 砸落：离地 10 → 3 → 1 → 0
    P.sq = d < 0.53 ? -1 : d < 0.66 ? 2 : 1;                                     // 压扁（落地那一下最扁，回弹一点）
    P.clv = d < 1.0 ? ((f12 & 1) ? 1 : 0) : 0; P.cl = 0;
    if (d >= 0.58) {                                                             // 岩冠滚落到身后：翻着跟头飞出 → 落地摆正
      const c = clamp01((d - 0.58) / 0.3);
      if (c < 1) { P.crn = 1; P.cx = R(-19 * c); P.cy = R(-36 + 30 * c - Math.sin(c * PI) * 8); P.crot = f12of(d - 0.58) & 3; }
      else { P.crn = 2; P.cx = -19; P.cy = 0; P.crot = 0; }
    }
    if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = gait(tq), G = GAIT[f]; setFeet(G.f, G.b); P.bob = G.bob; P.tph = (f * 2 + 1) & 7; P.sip = [1, 0, -1, 0][f];
      P.sq = f & 1 ? -2 : -1;
      const w = walkDemo(tq, 10, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const i = Math.min(6, f12of(tq)), A = tq < 0.5 ? ATK[i] : ATK[6];
      P.ahx = A[0]; P.ahy = A[1]; P.amd = A[2]; P.rock = A[3]; P.bx = A[4]; P.bob = A[5];
      if (tq >= 0.5) { const q = ease.inOut(clamp01((tq - 0.5) / 0.2)); P.ahx = R(22 - 5 * q); P.ahy = R(-15 + 14 * q); P.amd = 0; P.bx = 0; P.bob = 0; }
      if (i === 3) { P.sip = -1; P.tph = 2; } else if (i === 4 || i === 5) { P.sip = 1; P.tph = 6; }
      P.clv = i >= 3 && i <= 4 ? 2 : 1; P.rim = i === 3 || i === 4 ? 2 : 1;
    } else if (st === CHARGE) {                                                  // 四爪抠进地里、身体下沉 2 格、岩缝一根根亮起
      const q = ease.inOut(clamp01(tq / 0.7));
      setFeet([R(2 * q), 0], [R(-2 * q), 0]);
      P.dig = q > 0.3 ? 1 : 0; P.bob = R(2 * q); P.sq = q > 0.5 ? 0 : -1;
      P.cl = Math.min(5, Math.floor(tq / 0.22 + 1e-6)); P.clv = tq < 0.45 ? 2 : ((f12 & 1) ? 3 : 2); P.rim = 2; P.curl = q > 0.5 ? 31 : 0; P.tph = 1;
      if (tq > 1.1) P.bob = (f12 & 1) ? 2 : 1;                                    // 最后 0.3 秒：抖
    } else if (st === CAST) {                                                    // 四爪一撑：身体弹起 1 格
      setFeet([1, 0], [-1, 0]); P.bob = tq < 1 / 12 ? 0 : -1; P.sq = tq < 1 / 12 ? -2 : -1;
      P.cl = 5; P.clv = 3; P.rim = 3; P.sip = 1; P.tph = 5;
      P.arm = tq >= 3 / 12 - 1e-6 ? 2 : 0; P.flash = tq >= 3 / 12 - 1e-6 && tq < 4 / 12 - 1e-6 ? 1 : 0;   // 岩板合拢：浮出岩甲纹，闪白一次
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6));
      P.arm = q < 0.45 ? 2 : q < 0.8 ? 1 : 0; P.cl = Math.max(0, 5 - Math.floor(tq / 0.1 + 1e-6)); P.clv = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1;
      P.bob = q < 0.3 ? -1 : 0; P.sip = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.sip = 1; P.tph = 6; P.curl = 5; P.sq = 0; P.bob = 1; setFeet([-1, 0], [1, 0]); P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.sip = 1; P.tph = 5; P.rim = 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.sip = (f12 & 1) ? 1 : -1; P.tph = f12 & 7; P.curl = 31; P.sq = 0; P.bob = 1; P.rim = 0; P.clv = (f12 & 1) ? 2 : 1; }
      else { P.bx = -2; P.rim = 0; deathPose(d, f12); }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = L.rig(P, o);
    const C = rig.C; P.gx = R(C.x) + P.bx; P.gy = R(C.y - C.ry) - 4;
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  const bodyY = (x) => { const C = rig.C, u = (x - C.x) / C.rx; return C.y + C.ry * Math.sqrt(Math.max(0, 1 - u * u)); };
  // 候选部件：clawArm —— 粗触臂 + 臂端三趾巨爪（一个部件）：根 → 端按二次曲线由粗到细；脚落在地上时往外上方拱起再落地（像腿），
  //   手举高时往前鼓出去再弯上来；近侧臂内沿一排粉吸盘。爪形 0 撑地（前趾长、后趾短，贴地）/ 1 抠地 / 2 握岩 / 3 张开 / 4 摊软
  function toes(x, y, d, a, spec, far) {
    for (const [th, len] of spec) {
      const dx = d * Math.cos(a + th), dy = Math.sin(a + th);
      for (let k = 1; k <= len; k++) { U.dot(E, x + dx * k, y + dy * k, m.claw, k === len ? (far ? 3 : 4) : k === 1 ? 2 : 3); if (k === 1) U.dot(E, x + dx * k, y + dy * k + 1, m.claw, 2); }
    }
  }
  function clawArm(key, hand) {
    const A = ARMS[key], C = rig.C, far = A.far, mat = far ? m.far : m.limb, d = A.d;
    const x0 = C.x + A.rx, y0 = bodyY(x0) - 2;
    let x1, y1, mode;
    if (hand) { x1 = P.ahx; y1 = P.ahy; mode = P.amd; }
    else { const fr = key[0] === 'f'; x1 = A.fx + (fr ? P.fx : P.bx2); y1 = -1 - (fr ? P.fu : P.bu); mode = P.flat ? 4 : P.dig ? 1 : 0; }
    let cx, cy;
    if (y1 > -12) { cx = x0 + (x1 - x0) * 0.78; cy = Math.min(y0, y1) - (P.flat ? 1 : 6); }
    else { cx = Math.max(x0, x1) + 13; cy = (y0 + y1) / 2 + 9; }
    E.part();
    const n = Math.max(8, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.6)), r0 = far ? 2.3 : 2.7, r1 = far ? 1.2 : 1.4, suck = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t, x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1, r = r0 + (r1 - r0) * t;
      U.disc(E, x, y, r, mat, 0);
      if (!far && k % 2 === 0 && t > 0.15 && t < 0.9) {
        const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), l = Math.hypot(tx, ty) || 1;
        let nx = -ty / l, ny = tx / l; if (ny < -0.2 || (Math.abs(ny) <= 0.2 && nx * d > 0)) { nx = -nx; ny = -ny; }
        suck.push(x + nx * (r - 0.4), y + ny * (r - 0.4));
      }
    }
    for (let k = 0; k < suck.length; k += 2) U.dot(E, suck[k], suck[k + 1], m.pink, k % 4 ? 3 : 2);
    if (!far) { const ta = Math.atan2(y1 - cy, x1 - cx); for (let k = 2; k < 5; k += 2) { const t = 0.3 + k * 0.08, x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1; U.dot(E, x - Math.sin(ta) * 0.3, y - 1, mat, 4); } }   // 臂背亮点
    // 爪 / 岩
    const ta = Math.atan2(y1 - cy, (x1 - cx)) ;
    if (mode === 0) toes(x1, y1, d, 0, [[0.25, 4], [0.9, 3], [PI - 0.4, 2]], far);
    else if (mode === 1) { toes(x1, y1, d, 0, [[1.1, 2], [1.45, 2], [2.2, 2]], far); for (const [u, v] of [[2, 0], [3, 0], [-2, 0], [-3, 0], [1, -1]]) U.dot(E, x1 + d * u, v, m.dirt, v ? 4 : 3); }
    else if (mode === 4) toes(x1, y1, d, 0, [[0.05, 3], [0.3, 3], [PI - 0.1, 2]], far);
    else {
      const ux = Math.cos(ta), uy = Math.sin(ta);
      if (P.rock === 1) boulder(x1 + ux * 4, y1 + uy * 4);
      const spec = mode === 2 ? [[-1.2, 4], [0.05, 3], [1.2, 4]] : [[-0.95, 3], [0, 3], [0.95, 3]];
      for (const [th, len] of spec) { const dx = Math.cos(ta + th), dy = Math.sin(ta + th); for (let k = 1; k <= len; k++) U.dot(E, x1 + dx * k, y1 + dy * k, m.claw, k === len ? 4 : k === 1 ? 2 : 3); }
    }
    if (hand && P.rock === 2) { for (const [u, v, tn] of [[-2, -1, 3], [-1, -2, 3], [0, -2, 4], [1, -2, 3], [2, -1, 2], [-1, -1, 2], [0, -1, 2], [1, -1, 2]]) U.dot(E, x1 + 2 + u, v, m.rock, tn); }   // 半埋的岩
  }
  // 巨岩（握在爪里，和臂同一个部件）：6×6 圆块，左上亮、右下暗，一道裂纹
  function boulder(x, y) {
    x = R(x); y = R(y);
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const dd = i * i + j * j; if (dd > 10) continue; U.dot(E, x + i, y + j, m.rock, i + j < -2 ? 4 : i + j > 2 ? 2 : 3); }
    U.dot(E, x, y - 1, m.rock, 1); U.dot(E, x + 1, y, m.rock, 1); U.dot(E, x - 2, y + 1, m.dirt, 3);
  }
  // 身体：B.blob orb + 紧跟着画的肉疣 / 斑点（同一个部件）；arm ≥ 1 时浮出岩石甲纹（1 = 只有甲缝，2 = 上半身整片岩甲）
  const SPOTS = [[-5, -6, 2], [-2, -8, 4], [-7, 0, 2], [3, -7, 2], [-4, 3, 2], [1, -3, 4], [-8, -4, 4]];
  function body() {
    L.body(E, rig, P, o);
    const C = rig.C, sx = C.rx / 10, sy = C.ry / 12;
    for (const [u, v, tn] of SPOTS) U.dot(E, C.x + u * sx, C.y + v * sy, m.body, tn);
    if (!P.arm) return;
    const x0 = Math.floor(C.x - C.rx), x1 = Math.ceil(C.x + C.rx), y0 = Math.floor(C.y - C.ry), y1 = Math.min(0, Math.ceil(C.y + C.ry));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ex = (x - C.x) / (C.rx + 0.35), ey = (y - C.y) / (C.ry + 0.35); if (ex * ex + ey * ey > 0.82) continue;
      if (P.arm === 1 && ey > 0.35) continue;
      const yy = y - R(C.y) + 40, xx = x - R(C.x) + 40 + ((yy >> 2) & 1) * 3, seam = (yy & 3) === 0 || xx % 6 === 0;
      if (seam) E.sp(x, y, m.rock, 1);
      else if (P.arm === 2 && ey < 0.45) E.sp(x, y, m.rock, ey < -0.35 || ex < -0.4 ? 4 : 3);
    }
  }
  // 候选部件：basaltCrown —— 玄武岩尖冠（一个部件）：顺着外套膜顶弯下的 2 行冠带 + 5 根岩尖（中间最高 6 格，往外微张）；
  //   每根岩尖中间一道岩缝透火（cl 根亮起、clv 亮度 0–3）；rot 0–3 按 90° 翻转（滚落时用），(bx, by) = 冠带底边中心
  const CR_U = [-6, -3, 0, 3, 6], CR_H = [4, 5, 6, 5, 4];
  function basaltCrown(bx, by, rot) {
    E.part();
    const pt = (u, v) => { let a = u, b = v + 3; for (let k = 0; k < rot; k++) { const t = a; a = -b; b = t; } return [R(bx + a), R(by - 3 + b)]; };
    const dotC = (u, v, mat, tn) => { const [x, y] = pt(u, v); U.dot(E, x, y, mat, tn); };
    const bend = (u) => (rot ? 0 : R((u / 7) * (u / 7) * 2));
    for (let u = -7; u <= 7; u++) { const b = bend(u); dotC(u, -1 + b, m.rock, u < 0 ? 3 : 2); dotC(u, b, m.rock, 2); if ((u + 7) % 4 === 2) dotC(u, b, m.lava, P.clv >= 1 ? P.clv : 1); }
    CR_U.forEach((u0, k) => {
      const h = CR_H[k], b = bend(u0), lit = k < P.cl, s = Math.sign(u0);
      for (let j = 1; j <= h; j++) {
        const lx = u0 + R(s * j * 0.25), v = -1 + b - j, wide = j <= h * 0.45;
        if (wide) { dotC(lx - 1, v, m.rock, 3); dotC(lx + 1, v, m.rock, 2); }
        const crack = j >= 1 && j <= h - 2 && ((j + k) % 2 === 0 || lit);
        if (crack) dotC(lx, v, m.lava, lit ? (P.clv >= 3 ? 4 : 3) : Math.max(1, Math.min(P.clv, 2)));
        else dotC(lx, v, m.rock, j === h ? 4 : 3);
      }
    });
  }
  // 候选部件：octoEye —— 章鱼眼（一个部件）：凸起的眉棱、3 格宽金色虹膜、横条瞳孔、左上湿高光；闭眼 = 一道缝
  function octoEye() {
    E.part();
    const C = rig.C, ex = R(C.x + C.rx * 0.55), ey = R(C.y + C.ry * 0.12);
    for (let k = -2; k <= 2; k++) U.dot(E, ex + k, ey - 2, m.body, k === 2 ? 3 : 4);
    if (P.eyes) { for (let k = -2; k <= 2; k++) U.dot(E, ex + k, ey, m.body, 1); U.dot(E, ex - 1, ey + 1, m.body, 2); return; }
    for (let k = -1; k <= 1; k++) { U.dot(E, ex + k, ey - 1, m.iris, 3); U.dot(E, ex + k, ey + 1, m.iris, 2); U.dot(E, ex + k, ey, m.ink, 1); }
    U.dot(E, ex - 2, ey, m.iris, 2); U.dot(E, ex + 2, ey, m.iris, 3); U.dot(E, ex - 1, ey - 1, m.iris, 4);
  }
  // 候选部件：goldSiphon —— 金箍虹吸管（一个部件）：从外套膜后下方伸出、往后下方翘的粗管，两道金箍，管口一圈亮边 + 墨色孔；sip 甩动
  function goldSiphon() {
    E.part();
    const C = rig.C, x0 = C.x - C.rx * 0.7, y0 = C.y + C.ry * 0.35, x1 = C.x - C.rx - 6, y1 = C.y + C.ry * 0.25 - 2 + P.sip;
    const n = 8;
    for (let k = 0; k <= n; k++) { const t = k / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * PI) * 1.2, r = 1.9 - 0.2 * t; U.disc(E, x, y, r, m.limb, 0); if (k === 3 || k === 6) { for (let j = -2; j <= 2; j++) U.dot(E, x, y + j, m.gold, j < 0 ? 4 : j > 0 ? 2 : 3); } }
    U.dot(E, x1 - 1, y1 - 1, m.limb, 4); U.dot(E, x1 - 1, y1 + 1, m.limb, 2); U.dot(E, x1 - 2, y1, m.ink, 1); U.dot(E, x1 - 1, y1, m.ink, 1);
  }
  // 候选部件：chinFringe —— 吻下垂着的一排短触须（一个部件）：4 根，根在外套膜前下沿，随 tph 摆；curl 位掩码 = 哪几根卷起（尖端往前上卷）
  const FR = [[4.5, 5], [6, 6], [7.5, 5], [9, 4]];
  function chinFringe() {
    E.part();
    const C = rig.C;
    FR.forEach(([dx, len], i) => {
      const x0 = C.x + dx * C.rx / 10, y0 = bodyY(x0) - 0.5, curled = (P.curl >> i) & 1, ph = P.tph * PI / 4 + i * 1.4;
      const Ln = curled ? len - 2 : len; let x = x0, y = y0;
      for (let k = 0; k <= Ln; k++) { U.dot(E, x, y, m.limb, k === Ln ? 2 : 0); if (k < 2) U.dot(E, x + 1, y, m.limb, 0); x += Math.sin(ph - k * 0.6) * 0.45 - (P.bx < 0 ? 0.25 : 0); y += 1; }
      if (curled) { U.dot(E, x + 1, y - 1, m.limb, 3); U.dot(E, x + 1, y - 2, m.limb, 4); }
    });
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const C = rig.C;
    clawArm('bf'); clawArm('ff');
    body();
    if (!P.crn) basaltCrown(R(C.x), R(C.y - C.ry) + 2, 0);
    octoEye(); goldSiphon(); chinFringe();
    clawArm('bn');
    if (P.ahx || P.ahy) clawArm('fn', 1); else clawArm('fn');                  // 攻击时近前臂按「手」画（其余状态 ahx / ahy 都是 0）
    if (P.crn) basaltCrown(P.cx - P.bx, P.cy, P.crot);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, rockT = 9, rockX0 = 0, rockY0 = 0, slabT = 9, domeOn = 0;
  const RX1 = DUMMY_X - 3, RY1 = HY - 16;                                          // 巨岩落点（假人胸口）
  const SLABS = [[-25, 12], [-15, 17], [15, 17], [25, 12]];                        // 岩板：本地 x、高
  function rockPos(t) { const q = clamp01(t / FLY); return [R(rockX0 + (RX1 - rockX0) * q), R(rockY0 + (RY1 - rockY0) * q - 18 * 4 * q * (1 - q))]; }
  function onEnter(s) {
    if (s === CAST) {                                                              // 四爪一撑，四块岩板从地下立起
      slabT = 0; domeOn = 0;
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
      const cx = scrX(0), cy = HY + P.gy + 8;
      ring(cx, cy, 1, R_EL); fx.cross(scrX(P.gx), HY + P.gy - 2, 6, R_EL, 0.25, 2);
      for (const [x] of SLABS) {
        const sx = scrX(x), dir = x > 0 ? 1 : -1;
        fx.crack(sx, FLOOR, 7, dir, R_EL, 0.9); fx.crack(sx, FLOOR, 4, -dir, FXI.dust, 0.7);
        burst(sx, HY - 2, 8, 30, 80, 0.2, 0.5, R_EL, 30);
        for (let i = 0; i < 3; i++) spawnX(K_PHYS, sx + (Math.random() - 0.5) * 4, HY - 3, (Math.random() - 0.5) * 40, -50 - Math.random() * 40, 0.7, FXI.dust, { g: 260, floor: HY, sz: 2 });
      }
      shake(0.28, 2); flash(0.05);
    }
    if (s !== CAST && s !== RECOVER) { slabT = 9; domeOn = 0; }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) {                                             // 爪抠进土里
      const x = scrX(20); for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
    }
    if (s === ATTACK && t === 2 / 12) {                                             // 撬出巨岩：土块飞
      const x = scrX(21); burst(x, HY - 2, 8, 30, 70, 0.2, 0.4, R_EL, 30);
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, x, HY - 4, (Math.random() - 0.5) * 50, -50 - Math.random() * 30, 0.6, R_EL, { g: 240, floor: HY });
    }
    if (s === ATTACK && t === T_THROW) {                                            // 甩出：抛物线远投
      rockT = 0; rockX0 = scrX(28); rockY0 = HY - 37;
      fx.slash(scrX(14), HY - 30, 13, -0.3, 1.25, R_EL, 2 / 12, 2, 2);
      burst(rockX0, rockY0, 6, 20, 50, 0.15, 0.3, FXI.dust, 0);
      sfx('swing', { kind: 'throw', w: 1 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === ATTACK && t === T_LAND) {                                             // 巨岩砸中：碎石 + 土爆 + 地裂
      rockT = 9;
      burst(RX1, RY1, 16, 40, 110, 0.2, 0.5, R_EL, 10); burst(RX1, RY1, 8, 40, 90, 0.15, 0.35, FXI.impact, 10); fx.cross(RX1, RY1, 5, FXI.impact, 0.2, 2);
      for (let i = 0; i < 7; i++) spawnX(K_PHYS, RX1 + (Math.random() - 0.5) * 4, RY1, (Math.random() - 0.5) * 70, -40 - Math.random() * 40, 0.8, FXI.dust, { g: 260, floor: HY, sz: i < 3 ? 2 : 1 });
      fx.crack(DUMMY_X, FLOOR, 6, 1, FXI.dust, 0.6);
      hitDummy(1, 1); sfx('hit', { mat: 'stone', w: 1 });
    }
    if (s === CAST && t === 3 / 12) {                                               // 岩板合成土色点阵护盾（作用在自己身上）
      domeOn = 1; const cx = scrX(0);
      fx.dome(cx, HY, 29, 44, R_EL, DUR[CAST] - 3 / 12 + DUR[RECOVER] * 0.8, 2);
      for (const [x, h] of SLABS) burst(scrX(x), HY - h / 2, 6, 20, 50, 0.2, 0.45, R_EL, 0);
      burst(cx, HY - 22, 14, 30, 70, 0.2, 0.5, FXI.dust, 0);
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 1 });
    }
    if (s === IDLE && t === 1.9) {                                                  // 岩冠掉下几粒碎石
      for (let i = 0; i < 3; i++) spawnX(K_PHYS, scrX(-4 + i * 4), HY + P.gy + 3, (Math.random() - 0.5) * 16, -10 - Math.random() * 10, 0.9, FXI.dust, { g: 200, floor: HY });
    }
    if (s === DEATH && t === INCOMING + 0.58) {                                      // 身体砸落
      for (let i = 0; i < 22; i++) spawn(K_DUST, HX - 22 + Math.random() * 44, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      fx.crack(scrX(0), FLOOR, 10, 1, FXI.dust, 0.8); fx.crack(scrX(0), FLOOR, 10, -1, FXI.dust, 0.8);
      shake(0.14, 1); sfx('fall', { w: 1 });
    }
    if (s === DEATH && t === INCOMING + 0.88) {                                      // 岩冠落地
      const x = scrX(-19); for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 12, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
      sfx('hit', { mat: 'stone', w: 0.5 });
    }
  }
  const EVENTS = [[1.9], [], [1 / 12, 2 / 12, T_THROW, T_LAND], [], [3 / 12], [], [], [INCOMING + 0.58, INCOMING + 0.88], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                         // 岩屑从地面定点汇进外套膜
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      const tx = scrX(0), ty = HY + R(rig.C.y);
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = tx + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 20);
        spawnX(K_SPIRAL_PT, sx, HY - Math.random() * 2, 0, 0, 9, R_EL, { tx, ty, a: Math.random() * 6.28, r: Math.abs(sx - tx), w: 2 + Math.random() * 2, squash: 0.6 });
      }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) {
        if (f === 0 || f === 2) {
          const xs = f === 0 ? [22, 18] : [-10, -14];
          for (const x of xs) for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(x) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
          shake(0.06, 1); sfx('step', { w: 1 });
        }
        lastGf = f;
      }
    }
    if (rockT < FLY) {                                                              // 巨岩拖尘
      const [x, y] = rockPos(rockT); if (Math.random() < 0.6) spawn(K_TRAIL, x - 2, y + (Math.random() - 0.5) * 2, -20 - Math.random() * 20, Math.random() * 10 - 5, 0.25, FXI.dust);
    }
    if (state === RECOVER && stT < 0.5 && Math.random() < dt * 20) spawn(K_EMBER, scrX(-6 + Math.random() * 12), HY + P.gy + 2, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6, R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 40, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, Math.random() < 0.3 ? R_EL : FXI.soul); } }
    rockT += dt; slabT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; rockT = 9; slabT = 9; domeOn = 0; }
  // 岩板：从地下立起（2 帧长满），合拢后在 1 帧里碎成点阵护盾
  function drawSlab(x0, h, f12) {
    const x = R(x0);
    for (let j = 0; j < h; j++) for (let i = -2; i <= 2; i++) {
      const y = HY - j, top = j >= h - 1 - (Math.abs(i) === 2 ? 1 : 0), edge = Math.abs(i) === 2 || top;
      if (Math.abs(i) === 2 && j >= h - 1) continue;
      put(x + i, y, edge ? 0 : (i < 0 ? 10 : i > 0 ? 8 : ((j + f12) % 5 === 2 ? EL[2] : 9)));
    }
  }
  function fxBack(f12) {
    if (P.rim >= 2 && P.dq < 1 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (slabT < 3 / 12) { const g = clamp01((slabT + 1 / 12) / (2 / 12)); for (const [x, h] of SLABS) if (Math.abs(x) < 20) drawSlab(scrX(x), R(h * g), f12); }
  }
  function fxFront(f12) {
    if (slabT < 3 / 12) { const g = clamp01((slabT + 1 / 12) / (2 / 12)); for (const [x, h] of SLABS) if (Math.abs(x) >= 20) drawSlab(scrX(x), R(h * g), f12); }
    if (rockT < FLY) {                                                              // 飞行中的巨岩（逐帧翻滚）
      const [x, y] = rockPos(rockT), fl = f12 & 1;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const dd = i * i + j * j; if (dd > 10) continue; const ii = fl ? -i : i; put(x + i, y + j, dd > 6 ? 0 : ii + j < -1 ? 10 : ii + j > 1 ? 8 : 9); }
      put(x + (fl ? 1 : -1), y, 8); put(x, y + (fl ? -1 : 1), 62);
    }
  }

  return {
    name: '地龙王加贡', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.lava, m.iris], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'earth', style: 'shield', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
