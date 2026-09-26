// 舞蛇（衍生单位 · 野兽 · 战士 · 普通 · 远程 600）：巫毒神父召唤的眼镜蛇。暗赭金蛇鳞，背上墨黑人字环带。
//   剪影从下往上四层：压扁的两圈盘身（6 格高）→ 露在外面的细立颈（骨白腹鳞梯）→ 盾形宽兜帽（后上角一个圆肩包住后脑；背面后半边（后脑左边）一副斜着错开的骨白空心眼镜纹 + 中线一道墨黑人字环带 + 紫黑涂边）→ 扁楔形小头（3 行高、2 行厚的钝吻、荧绿竖瞳；张嘴才露骨白毒牙）。
//   尾尖从盘身后面翘起，绑一撮红短羽和两颗骨珠（召唤者一族的红羽 / 骨白呼应）。
// 攻击：立颈后仰、兜帽一振，头往前一弹，吐出一团 2×2 荧绿毒液弹，低弧线飞向目标；盘身不动，像炮座。
// 技能（没有特性，按名字表现「舞」）：立颈跳 8 字蛇舞蓄满毒液（毒滴从盘身四周螺旋汇进嘴里、兜帽眼纹逐级亮成荧绿），
//   最后高高昂起，猛地甩头扇形连吐三团毒液，落在目标头顶、身上和脚前，留下一滩冒泡的毒洼。
// 死亡：兜帽合拢 → 立颈后仰倒下、头先着地 → 盘身松开成贴地的 S 形、翻出骨白腹鳞 → 尾尖红羽脱落飘开 → 从头到尾褪成灰白蛇蜕 → 消散。
// 身体：盘身、立颈、盾形兜帽、尾尖羽饰、扁楔形头都是本模块的部件（serpent 画不出盘圈和盾形兜帽，serpent.head 的鼓顶读成鸭头，第 1 轮返修改成自画 wedgeHead）。
PCD.define('DancingSnake', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_PHYS, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, keyer } = E;
  const B = E.parts.beast, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.poison, EL = FXR[R_EL], CURSE = FXR[FXI.curse];                    // 巫毒蛇毒 · 荧绿；点缀 curse 第 3 级紫
  const GOLD = E.ramp(['#1e1406', '#4a3410', '#8a6420', '#c29a3e']);                   // 暗赭金蛇鳞（自建）
  const m = B.mats(E, { main: GOLD, eye: [0, 48, 50, 38], teeth: 'bone', tongue: 'blood', glow: [34, 49, 50, 38] });
  const M = {
    belly: E.defMat('bone', 1),                    // 腹鳞（立颈的腹鳞梯、翻肚后的腹面）
    pat: E.defMat('bone', 1, 1),                   // 兜帽背面的眼镜纹（平涂）
    eg1: E.defMat([0, 49, 49, 49], 1, 1), eg2: E.defMat([0, 50, 50, 50], 1, 1), eg3: E.defMat([0, 38, 38, 38], 1, 1),   // 眼纹亮起 1–3 档
    edgeDot: E.defMat([0, 24, 24, 24], 1, 1),      // 亮纹时兜帽涂边上隔格的 curse 紫点（curse 第 2 级，比涂边的 42 亮一级）；眼圈圈心一直是兜帽金色
    edge: E.defMat([0, 52, 42, 54], 1),            // 兜帽紫黑涂边
    feather: E.defMat('crimson', 1), bead: E.defMat('bone', 1),
    shed: E.defMat([8, 7, 18, 17], 2),             // 褪成灰白的蛇蜕
  };
  const EYE_LV = [M.pat, M.eg1, M.eg2, M.eg3];
  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 40, 30, 35);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.glow, m.ink, m.teeth, m.tongue, M.belly, M.pat, M.eg1, M.eg2, M.eg3, M.edgeDot, M.feather, M.bead]) RIM.skip[k] = 1;
  const HM = { limb: m.limb, eye: m.eye }, HM_SHED = { limb: M.shed, eye: M.shed };      // 头的材质（褪成蛇蜕后换灰白）

  // ───── 姿势字段（取整后的范围） ─────
  // rise 立颈伸长 · lean 颈顶前后（- 后仰）· sway 蛇舞左右摆 · hood 兜帽宽档 0 合拢 5 / 1 半收 8 / 2 收 9 / 3 张开 11 / 4 振开 13（施放第 1 帧）· strike 头前弹 · sb 立颈中段 S 弯
  // jaw 张嘴 · tongue 吐信 · eyes 闭眼 · glow 口里毒液 / 眼发光 · eyeLv 兜帽眼纹亮档 · tail 尾尖姿 0 翘起 / 1、3 拖在后面 / 2 抖 · crest 盘身拱峰位置（-1 无）
  // tight 盘身收紧 · tilt 歪头 · lie 死亡姿 0 站 / 1 后仰 / 2 将着地 / 3 头着地 / 4 盘身松开 / 5 贴地 S 形 · shed 褪色列数档 · fdrop / fdx / fdy 尾羽脱落
  const KEY = keyer([['bx', -8, 8], ['rise', -2, 6], ['lean', -4, 2], ['sway', -2, 2], ['hood', 0, 4], ['strike', 0, 4], ['jaw', 0, 3], ['tongue', 0, 2], ['eyes', 0, 1],
    ['glow', 0, 3], ['eyeLv', 0, 3], ['tail', 0, 3], ['crest', -1, 3], ['tight', 0, 1], ['tilt', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq48', 0, 48],
    ['lie', 0, 5], ['shed', 0, 8], ['fdrop', 0, 2], ['fdx', 0, 10], ['fdy', 0, 10], ['sb', -1, 1]]);
  const P = { gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0, gf: -1, dq: 0 };
  function reset() {
    P.bx = 0; P.rise = 0; P.lean = 0; P.sway = 0; P.hood = 3; P.strike = 0; P.jaw = 0; P.tongue = 0; P.eyes = 0; P.glow = 0; P.eyeLv = 0; P.tail = 0; P.crest = -1;
    P.tight = 0; P.tilt = 0; P.flash = 0; P.rim = 0; P.dq = 0; P.lie = 0; P.shed = 0; P.fdrop = 0; P.fdx = 0; P.fdy = 0; P.mx = 0; P.flip = 0; P.gf = -1; P.sb = 0;
  }
  reset();
  const HIT_POINT = [1, -13];

  // ───── 几何（站姿） ─────
  // 头心在兜帽中线偏右 2 格：填色 3 行（y −20..−18），画在兜帽之后；后脑压在兜帽后上角的圆肩上，吻尖伸出兜帽前沿勾线 3 格（张开档兜帽整体在立颈后面）
  const HEAD_X = 2, HEAD_Y = -19, HOOD_BOT = -11;                                      // 头心（中间那行）、兜帽下沿（填色行；勾线在 -10）
  const neckTop = () => P.lean + P.sway;
  function headAt() { const nx = neckTop(); return { x: HEAD_X + nx + P.strike, y: HEAD_Y - P.rise, a: P.tilt ? -0.3 : 0 }; }
  const mouthOf = (H) => U.toW(H.x, H.y, H.a, 4, 1);

  // ───── 姿势 ─────
  const SW = [0, 1, 0, -1];
  function idle(tq, T) {
    const TT = f12of(T) / 12, b = Math.floor(TT * 2.5 + 1e-6), c = Math.floor(TT * 1.25 + 1e-6);
    P.rise = b & 1;                                                                     // 起伏 1 格（每 0.4 s）
    P.hood = (c & 1) ? 2 : 3;                                                           // 兜帽呼吸：11 ↔ 9 格（每 0.8 s）
    P.sway = SW[(c + 1) & 3];                                                           // 立颈带着兜帽左右摆 1 格
    P.sb = P.sway ? -P.sway : (c & 2 ? -1 : 1);                                         // 立颈中段反向错 1 格：S 弯，不是直杆
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.tilt = k < 2 ? 1 : 0; P.tongue = [1, 2, 0, 1, 2][k] || 0; P.tail = [2, 0, 2, 0, 0][k] || 0; P.sway = 0; P.jaw = P.glow = P.tongue ? 1 : 0; }   // 待机个性：歪头、连吐两次信子（吐信时张嘴、口里毒液亮）、尾羽抖两下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset();
    if (st === IDLE) idle(tq, T);
    else if (st === MOVE) {                                                             // 盘身滑行：拱峰沿外沿逐帧往前推
      const f = gait(tq); P.gf = f; P.crest = f; P.rise = f & 1; P.tail = (f & 1) ? 3 : 1; P.hood = 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const k = Math.min(8, f12of(tq));
      P.lean = [0, -1, 1, 1, 0, 0, 0, 0, 0][k]; P.rise = [0, 1, 0, 0, 0, 0, 0, 0, 0][k]; P.strike = [0, 0, 2, 2, 1, 1, 0, 0, 0][k];
      P.jaw = [0, 1, 2, 1, 1, 0, 0, 0, 0][k]; P.hood = [3, 2, 3, 3, 3, 3, 3, 3, 3][k]; P.glow = [0, 0, 2, 1, 0, 0, 0, 0, 0][k]; P.rim = [0, 0, 2, 1, 0, 0, 0, 0, 0][k];   // 只在出手帧口里毒液亮
    } else if (st === CHARGE) {                                                         // 8 字蛇舞蓄毒 → 最后 0.3 s 立颈后仰拉长到峰值
      P.hood = 3; P.tight = tq >= 0.25 ? 1 : 0; P.rim = tq < 0.3 ? 0 : tq < 0.45 ? 1 : 2;
      P.eyeLv = Math.max(0, Math.min(3, Math.floor((tq - 0.2) / 0.3) + 1));
      if (tq < 1.1) {
        const ph = tq / 0.7 * 2 * Math.PI, q = clamp01(tq / 0.2);
        P.sway = R(2 * Math.sin(ph) * q); P.rise = 1 + R((Math.sin(2 * ph) * 0.5 + 0.5) * q); P.tail = (f12 >> 1) & 1 ? 2 : 0;
        P.jaw = tq >= 0.3 ? 1 : 0; P.glow = tq < 0.45 ? (P.jaw ? 1 : 0) : ((f12 & 1) ? 2 : 1);
      } else { P.rise = tq < 1.2 ? 3 : 5; P.lean = -2; P.jaw = 2; P.glow = (f12 & 1) ? 2 : 1; P.tail = 0; }
    } else if (st === CAST) {                                                           // 猛地甩头往前，扇形连吐三团
      const k = Math.min(5, f12of(tq));
      P.lean = 1; P.rise = 2; P.hood = 3; P.eyeLv = 3; P.rim = 3; P.glow = 3; P.tight = 1;
      P.strike = [4, 3, 1, 3, 1, 2][k]; P.jaw = [3, 2, 3, 2, 3, 1][k]; if (!k) P.hood = 4;   // 第 1 帧猛地甩头（前探 4 格）、兜帽振开 1 帧
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6));
      P.rise = R(2 * (1 - q)); P.lean = R(1 - q); P.strike = R(2 * (1 - q)); P.hood = q < 0.5 ? 3 : 2; P.jaw = q < 0.4 ? 1 : 0;
      P.glow = q < 0.35 ? 2 : q < 0.7 ? 1 : 0; P.eyeLv = R(3 * (1 - q)); P.rim = !P.glow ? 0 : q < 0.5 ? 2 : 1; P.tight = q < 0.5 ? 1 : 0;
      P.tail = tq >= 0.42 && tq < 0.58 ? ((f12 & 1) ? 2 : 0) : 0;                        // 尾尖羽饰抖一下
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, T);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.lean = -1; P.hood = 2; P.jaw = 2; P.tail = 2; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.hood = 2; P.jaw = 1; P.tail = 2; P.rim = 0; }
      else idle(tq, T);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, T);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.lean = -1; P.jaw = 2; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.hood = d < 1 / 12 ? 2 : 0; }   // 兜帽啪地合拢
      else if (d < 0.5) { P.bx = -2; P.eyes = 1; P.lean = -3; P.rise = -1; P.hood = 0; P.jaw = 1; P.tail = 2; }   // 往后仰
      else {
        P.bx = -2; P.eyes = 1; P.jaw = 1; P.hood = 0;
        P.lie = d < 0.58 ? 1 : d < 0.66 - 1e-6 ? 2 : d < 0.78 - 1e-6 ? 3 : d < 0.9 - 1e-6 ? 4 : 5;
        P.tongue = P.lie === 5 ? 1 : 0;
        const fd = B.dropAt(d, { at: 0.78, dur: 0.5, dx: 8, hop: 7 }); P.fdrop = fd[0]; P.fdx = fd[1]; P.fdy = fd[2];
        if (d >= 1.0 - 1e-6) P.shed = Math.min(8, Math.floor((d - 1.0) / 0.5 * 8) + 1);   // 从头到尾按鳞列褪成灰白
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, T); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    const f = focus(); P.gx = f[0] + P.bx; P.gy = f[1];
    KEY(Object.assign(P, { dq48: R(P.dq * 48) }));
  }
  function focus() {                                                                    // 嘴（毒液、发光体）；倒地后在头上
    if (P.lie) { const L = LIE[P.lie]; return [R(L.head[0] - 3), R(L.head[1])]; }
    const H = headAt(), mo = mouthOf(H); return [R(mo[0]), R(mo[1])];
  }

  // ───── 画：部件 ─────
  // 候选部件：tailTuft（尾尖羽饰）—— 盘身后面翘起的尾尖，前 3 点 2 格粗，其余 1 格；两颗骨珠串在尾上；尾尖绑一撮 2–3 根的短羽，羽尖亮
  const TAILS = [
    { pts: [[-7, -3], [-8, -4], [-8, -5], [-9, -6], [-9, -7], [-9, -8], [-9, -9]], beads: [3, 5], fth: [[[-9, -10], [-9, -11], [-10, -12]], [[-10, -10], [-11, -11], [-12, -11]], [[-10, -9], [-11, -9]]] },
    { pts: [[-8, -2], [-9, -3], [-10, -3], [-11, -4], [-12, -4], [-13, -5]], beads: [2, 4], fth: [[[-14, -6], [-15, -7]], [[-14, -5], [-15, -5], [-16, -6]], [[-13, -6], [-14, -7]]] },
    { pts: [[-7, -3], [-8, -4], [-8, -5], [-8, -6], [-8, -7], [-7, -8], [-7, -9]], beads: [3, 5], fth: [[[-7, -10], [-6, -11], [-6, -12]], [[-8, -10], [-8, -11], [-9, -12]], [[-6, -9], [-5, -10]]] },
    { pts: [[-8, -2], [-9, -3], [-10, -3], [-11, -3], [-12, -4], [-13, -4]], beads: [2, 4], fth: [[[-14, -4], [-15, -4], [-16, -3]], [[-14, -5], [-15, -6]], [[-13, -5], [-14, -6], [-14, -7]]] },
  ];
  function tailTuft(pose, feathers) {
    part(); const T = TAILS[pose];
    T.pts.forEach(([x, y], i) => { const mat = T.beads.includes(i) ? M.bead : m.limb; sp(x, y, mat, 0); if (i < 3) sp(x + 1, y, m.limb, 0); if (T.beads.includes(i)) sp(x - 1, y, M.bead, 4); });
    if (!feathers) return;
    T.fth.forEach((fs, j) => fs.forEach(([x, y], k) => sp(x, y, M.feather, k === fs.length - 1 ? 4 : j === 1 ? 2 : 3)));
  }
  // 候选部件：flatCoil（压扁的盘身）—— 两圈盘身各 3 行：上圈（后半圈）先画、下圈（前半圈）压在上面，中间自动一道分界线；
  //   两圈的上下角各切 1 格读成圆管；每 5 列一道斜 2 行的墨黑人字环带（顶点墨黑、一腿墨黑一腿暗鳞），下圈贴地一行是骨白腹鳞；
  //   crest = 拱峰位置（移动时逐帧往前推，上圈顶边拱 1 格；下圈两端错半个波相往外拱 1 格），tight = 收紧 1 格
  const COIL_B = [[-5, -5, 2], [-4, -6, 3], [-3, -6, 3]], COIL_A = [[-2, -8, 5], [-1, -9, 6], [0, -8, 5]];
  const CRESTS = [[-8], [-4], [0], [5]], LOW_ARCH = [[1, 0], [0, 0], [0, 1], [0, 0]];   // 下圈两端的拱（左、右）
  function chevron(x, y, mat) { sp(x, y, m.ink, 0); sp(x - 1, y + 1, m.ink, 0); sp(x + 1, y + 1, mat, 2); }
  function coilBack(dx) {
    part(); const t = P.tight;
    for (const [y, x0, x1] of COIL_B) for (let x = x0 + t + dx; x <= x1 - t + dx; x++) sp(x, y, m.body, y === -5 ? 4 : y === -4 ? 3 : 0);
    for (const x of [-3, 2]) chevron(x + dx, -4, m.body);
  }
  function coilFront() {
    part(); const t = P.tight, la = P.crest >= 0 ? LOW_ARCH[(P.crest + 2) & 3] : [0, 0];
    for (const [y, x0, x1] of COIL_A) {
      const a0 = x0 + t - (y === -1 || y === -2 ? la[0] : 0), a1 = x1 - t + (y === -1 || y === -2 ? la[1] : 0);
      for (let x = a0; x <= a1; x++) { const bel = y === 0 && x > a0 && x < a1; sp(x, y, bel ? M.belly : m.body, bel ? ((x & 3) === 0 ? 2 : 3) : y === -2 ? 4 : y === -1 ? 3 : 0); }
    }
    if (P.crest >= 0) { const c = CRESTS[P.crest][0]; for (let x = c - 1; x <= c + 1; x++) sp(x, -3, m.body, 0); if (P.crest === 0 || P.crest === 3) sp(c, -4, m.body, 0); }
    for (const x of [-5, 0, 4]) chevron(x, -2, m.body);
  }
  // 立颈：3 格粗，后两列鳞、前一列骨白腹鳞梯（逐行亮暗）；从盘身里伸出，按颈顶偏移平滑弯过去，上段藏在兜帽后面
  function neck() {
    part(); const nx = neckTop(), yTop = HOOD_BOT - 2 - P.rise, ym = -8 - (P.rise >> 1);
    for (let y = -3; y >= yTop; y--) {
      const s = clamp01((-y - 5) / Math.max(1, (-yTop - 5))), o = R(nx * s * s * (3 - 2 * s)) + (y === ym ? P.sb : 0);
      sp(o - 1, y, m.body, 0); sp(o, y, m.body, 0); sp(o + 1, y, M.belly, (y & 1) ? 4 : 2);
    }
  }
  // 候选部件：shieldHood（盾形宽兜帽，背面朝镜头）—— 倒水滴盾形，逐行 [左, 右] 表；后上角往上长一个圆肩（包在后脑后面）；
  //   外圈紫黑涂边；背面后半边（后脑左边）一副骨白眼镜纹：两只 3×3 空心眼圈并排相连（圈心一直是兜帽金色），不压在头和下颌下面；
  //   下面中线偏后一道墨黑人字环带；eyeLv 让两只圈从骨白逐级亮成荧绿，同时涂边上每 2 格亮一个 curse 紫点（一副纹样，不是一对瞳孔）；
  //   宽档 0 合拢 / 1 半收 / 2 收 / 3 张开 / 4 振开。张开档（2–4，第 4 轮）整体往后移：前沿只到立颈顶右 2 格，头的吻尖和下颌伸出前沿 3 格；
  //   圆肩（前两行）不动，下尖在立颈顶左边，立颈（-1..1）的上端接在下尖偏右。行序从圆肩顶（yb − 10）到下沿（yb），null = 这一行没有
  const HOOD_ROWS = [
    [null, [-2, 0], [-2, 1], [-2, 1], [-2, 2], [-2, 2], [-2, 2], [-1, 1], [-1, 1], [-1, 1], [-1, 1]],
    [[-3, -1], [-4, -1], [-4, 1], [-4, 2], [-4, 3], [-4, 3], [-4, 3], [-3, 2], [-2, 1], [-1, 0], [-1, 0]],
    [[-3, -1], [-4, -1], [-7, 0], [-7, 1], [-7, 1], [-7, 1], [-7, 1], [-6, 0], [-5, 0], [-4, 0], [-4, 0]],
    [[-4, -1], [-5, -1], [-7, 1], [-7, 2], [-7, 2], [-7, 2], [-7, 2], [-6, 1], [-5, 0], [-4, 0], [-4, 0]],
    [[-4, -1], [-6, -1], [-8, 2], [-9, 3], [-9, 3], [-9, 3], [-9, 3], [-8, 2], [-6, 1], [-4, 0], [-4, 0]],
  ];
  // 各宽档：两只圈的 [起始列（相对立颈顶；圈宽 3）, 上沿所在行]、人字环带顶点的 [列, 行]。
  //   张开档：左圈高、右圈低 2 行，斜着一前一后错开（不并排成一双眼睛），右圈上沿比下颌低 2 行；呼吸时只有前沿收 1 格，眼纹不跟着跳
  const OPEN_PAT = { ring: [[-6, 3], [-3, 5]], cv: [-2, 9] };
  const HOOD_PAT = [null, { ring: [[-3, 3], [1, 3]], cv: [0, 7] }, OPEN_PAT, OPEN_PAT, OPEN_PAT];
  function hood() {
    part(); const RW = HOOD_ROWS[P.hood], cx = neckTop(), yb = HOOD_BOT - P.rise, y0 = yb - RW.length + 1;
    const inRow = (i, x) => { const r = RW[i]; return !!r && x >= cx + r[0] && x <= cx + r[1]; };
    const edges = [];
    for (let i = 0; i < RW.length; i++) {
      const r = RW[i]; if (!r) continue;
      for (let x = cx + r[0]; x <= cx + r[1]; x++) {
        const e = x === cx + r[0] || x === cx + r[1] || !inRow(i - 1, x);
        sp(x, y0 + i, e ? M.edge : m.body, 0); if (e) edges.push([x, y0 + i]);
      }
    }
    const pm = EYE_LV[P.eyeLv];
    if (!P.hood) { for (let y = yb - 8; y <= yb - 2; y += 2) sp(cx, y, pm, 3); return; }   // 合拢：只剩中线一串骨白
    const H = HOOD_PAT[P.hood], inner = (i, x) => inRow(i, x) && inRow(i, x - 1) && inRow(i, x + 1) && inRow(i - 1, x);   // 只画在涂边以内
    for (const [a, r0] of H.ring) for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
      const x = cx + a + dx, i = r0 + dy; if (!inner(i, x) || (dx === 1 && dy === 1)) continue;   // 圈心留兜帽金色
      sp(x, y0 + i, pm, dy === 0 && dx === 0 ? 4 : 3);                                // 圈身一色（左上角高光），读成空心圈而不是横条
    }
    const [[a0, q0], [a1, q1]] = H.ring;
    if (q0 === q1 && a1 - a0 > 3 && inner(q0 + 1, cx + a0 + 3)) sp(cx + a0 + 3, y0 + q0 + 1, pm, 3);   // 半收档两圈并排分开时，中间 1 格鼻梁
    const c = cx + H.cv[0], yc = y0 + H.cv[1]; sp(c, yc, m.ink, 0); sp(c - 1, yc + 1, m.ink, 0); sp(c + 1, yc + 1, m.ink, 0);   // 一道墨黑人字环带
    if (P.eyeLv) {                                                                       // 亮纹：沿涂边一圈每 2 格点一个 curse 紫
      const ox = cx + (RW[5][0] + RW[5][1]) / 2, oy = y0 + 5.5;
      edges.sort((p, q) => Math.atan2(p[1] - oy, p[0] - ox) - Math.atan2(q[1] - oy, q[0] - ox));
      edges.forEach(([x, y], k) => { if (!(k & 1)) sp(x, y, M.edgeDot, 3); });
    }
  }
  // 候选部件：wedgeHead（扁楔形蛇头）—— 3 行高；顶行 u −2..3、中行 u −3..3，吻尖是 2 行厚的钝头（u = 3），闭嘴时下颌 u −3..1（u 1 是吻角），比吻尖缩后 2 格，吻尖下面露出背景；
  //   闭嘴只在吻角留 1 格暗色；张嘴时下颌按 jaw 往下掰开，口里是毒液光（glow）或暗色，上颚挂两颗骨白毒牙；
  //   吐信（tongue）只在张嘴时，分叉红信子；H.a 旋转（歪头、死亡倒地），逆映射取最近格，眼 / 牙 / 信子正向落点
  function headCell(u, v, j) {                                                          // 0 空 · 1 顶行 · 2 中行 · 3 下颌 · 4 吻角 · 5 口内
    if (v === -1) return u >= -2 && u <= 3 ? 1 : 0;
    if (v === 0) return u >= -3 && u <= 3 ? 2 : 0;
    if (u < -3 || u > 3) return 0;
    if (!j || u < 0) return v === 1 && u <= 1 ? (!j && u === 1 ? 4 : 3) : 0;
    const d = Math.min(j, Math.max(1, Math.round(j * (u + 1) / 4)));
    return v >= 1 && v <= d ? 5 : v === d + 1 ? 3 : 0;
  }
  function head(H, hm) {
    part(); const j = P.jaw | 0, ca = Math.cos(H.a), sa = Math.sin(H.a), hx = R(H.x), hy = R(H.y);
    const TONE = [0, 4, 3, 2, 1];
    for (let y = hy - 6; y <= hy + 6; y++) for (let x = hx - 6; x <= hx + 6; x++) {
      const dx = x - H.x, dy = y - H.y, c = headCell(R(dx * ca + dy * sa), R(-dx * sa + dy * ca), j);
      if (!c) continue;
      if (c === 5) U.dot(E, x, y, P.glow ? m.glow : m.ink, P.glow ? (P.glow >= 3 ? 4 : 3) : 0);
      else U.dot(E, x, y, hm.limb, TONE[c]);
    }
    const at = (u, v, mat, t) => { const p = U.toW(H.x, H.y, H.a, u, v); U.dot(E, p[0], p[1], mat, t); };
    if (P.eyes) at(1, -1, hm.limb, 1); else at(1, -1, hm.eye, 3);                        // 荧绿竖瞳（顶行）/ 闭眼
    if (!j) return;
    at(3, 1, m.teeth, 3); if (j >= 2) at(1, 1, m.teeth, 3);                              // 毒牙挂在上颚
    const tg = P.tongue | 0;
    if (tg) { for (let k = 0; k <= tg; k++) at(4 + k, 1, m.tongue, 3); at(5 + tg, 0, m.tongue, 3); at(5 + tg, 2, m.tongue, 3); }   // 分叉红信子
  }
  function drawStanding() {
    tailTuft(P.tail, 1);
    coilBack(0);
    neck();
    coilFront();
    hood();
    head(headAt(), HM);
  }

  // ───── 画：死亡倒地（后仰 → 头着地 → 盘身松开 → 贴地 S 形翻肚） ─────
  const LIE = [null,
    { head: [-8, -15], a: -2.25, neck: [[0, -4], [-3, -9], [-6, -12]], hood: [[-3, -9], [-6, -13]] },
    { head: [-12, -7], a: 3.0, neck: [[0, -4], [-5, -7], [-9, -6]], hood: [[-5, -7], [-9, -7]] },
    { head: [-15, -2], a: Math.PI, neck: [[-1, -3], [-6, -2], [-12, -2]], hood: [[-8, -3], [-12, -3]] },
    { head: [-15, -2], a: Math.PI, spine: 1 },
    { head: [-15, -2], a: Math.PI, spine: 2 },
  ];
  const shedX = () => (P.shed ? -19 + P.shed * 4.2 : -99);
  const mm = (x, mat) => (x < shedX() ? M.shed : mat);
  function taperM(x0, y0, x1, y1, r0, r1, mat) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n, r = r0 + (r1 - r0) * k / n; U.disc(E, x, y, r, mm(x, mat), 0); } }
  function polyTube(pts, r0, r1, mat) { const n = pts.length - 1; for (let i = 0; i < n; i++) taperM(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n, mat); }
  // 候选部件：bellyUpS（翻肚贴地的 S 形蛇身）—— 沿正弦脊线画渐细的管，脊线以上是骨白腹鳞（每 2 列一片亮暗）、以下是鳞背 + 墨黑环带；amp / x1 控制松开程度
  function bellyUpS(amp, x1) {
    part(); const x0 = -12;
    for (let x = x0; x <= x1; x++) {
      const s = (x - x0) / (x1 - x0), yc = -1.7 + amp * Math.sin(s * 2 * Math.PI), r = 1.8 - 1.2 * Math.pow(s, 1.4);
      for (let y = Math.floor(yc - r); y <= Math.ceil(yc + r); y++) {
        if (y > 0 || Math.abs(y - yc) > r + 0.3) continue;
        const up = y < yc - 0.2; sp(x, y, mm(x, up ? M.belly : m.body), up ? (((x >> 1) & 1) ? 3 : 4) : (((x + 40) % 4) === 0 ? 1 : 0));
      }
    }
  }
  function featherLoose() {                                                             // 脱落的尾羽（飞行中 / 落地）
    part(); const x = 10 + P.fdx, y = -4 - P.fdy;
    if (P.fdrop === 2) { for (const [dx, dy, t] of [[0, 0, 3], [1, 0, 3], [2, 0, 4], [0, -1, 2], [1, -1, 3], [-1, 0, 0]]) sp(x + dx, dy, dx === -1 ? M.bead : M.feather, t); return; }
    const s = P.fdrop === 1 && (P.fdx & 1) ? 1 : 0;
    for (const [dx, dy, t] of [[0, 0, 3], [0, -1, 3], [s, -2, 4], [1, 0, 2], [2, -1, 4], [-1, 1, 0]]) sp(x + dx, y + dy, dx === -1 ? M.bead : M.feather, t);
  }
  function drawLying() {
    const L = LIE[P.lie];
    if (P.lie <= 3) {
      tailTuft(0, 1);
      coilBack(P.lie === 3 ? 3 : 0);
      part(); polyTube(L.neck, 1.3, 1.1, m.body);                                         // 倒下的颈
      coilFront();
      part(); taperM(L.hood[0][0], L.hood[0][1], L.hood[1][0], L.hood[1][1], 1.5, 1.2, M.edge);   // 合拢的兜帽（只看得到涂边）
    } else {
      if (P.lie === 4) { part(); for (const [y, x0, x1] of COIL_A) for (let x = x0 + 3; x <= x1 - 1; x++) sp(x, y, mm(x, y === 0 ? M.belly : m.body), 0); }   // 还没松开的半圈
      bellyUpS(P.lie === 4 ? 1.6 : 1.0, P.lie === 4 ? 9 : 13);
      part(); polyTube([[-13, -2], [-11, -2], [-12, -2]], 1.4, 1.4, M.belly);
      if (P.lie === 4 && !P.fdrop) { part(); for (const [x, y] of [[10, -4], [11, -5], [11, -6], [12, -5]]) sp(x, y, M.feather, 3); }
    }
    const H = { x: L.head[0], y: L.head[1], a: L.a };
    head(H, P.shed && H.x < shedX() ? HM_SHED : HM);
    if (P.fdrop) featherLoose();
  }
  function drawHero() { begin(hero, P.bx, 0); if (P.lie) drawLying(); else drawStanding(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：毒液弹（自己管轨迹：低弧线） ─────
  const BN = 4, bOn = new Uint8Array(BN), bX0 = new Float32Array(BN), bY0 = new Float32Array(BN), bX1 = new Float32Array(BN), bY1 = new Float32Array(BN),
    bT = new Float32Array(BN), bDur = new Float32Array(BN), bArc = new Float32Array(BN), bKind = new Uint8Array(BN), bIdx = new Uint8Array(BN), bN = new Uint16Array(BN);
  function spit(kind, idx, x0, y0, x1, y1, arc, dur) { let i = 0; for (; i < BN - 1 && bOn[i]; i++); bOn[i] = 1; bX0[i] = x0; bY0[i] = y0; bX1[i] = x1; bY1[i] = y1; bT[i] = 0; bDur[i] = dur; bArc[i] = arc; bKind[i] = kind; bIdx[i] = idx; bN[i] = 0; }
  const bPos = (i) => { const s = clamp01(bT[i] / bDur[i]); return [bX0[i] + (bX1[i] - bX0[i]) * s, bY0[i] + (bY1[i] - bY0[i]) * s - bArc[i] * 4 * s * (1 - s)]; };
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  let pdT = 9, mzT = 9, chargeAcc = 0, soulAcc = 0, lastGf = -9, dripDone = 0;
  const SK_T = [[DUMMY_X - 1, HY - 30, 12], [DUMMY_X - 3, HY - 17, 7], [DUMMY_X - 5, HY - 1, 3]];   // 三团：头顶 / 身上 / 脚前（落点 x、y、弧高）
  function blobHit(i, x, y) {
    if (bKind[i] === 0) {                                                               // 普通攻击：小溅
      burst(x, y, 6, 20, 60, 0.12, 0.3, R_EL, 8);
      for (let k = 0; k < 4; k++) spawnX(K_PHYS, x, y, Math.random() * 40 - 20, -20 - Math.random() * 30, 0.6 + Math.random() * 0.3, R_EL, { g: 220, floor: HY, age0: 0.1 });
      hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.2 });
      return;
    }
    const k = bIdx[i];                                                                  // 技能：每团溅开 8 颗毒滴，最后一团炸环 + 毒洼
    fx.cross(x, y, 4, R_EL, 0.2, 2); burst(x, y, 6, 25, 70, 0.12, 0.3, R_EL, 6);
    for (let n = 0; n < 8; n++) spawnX(K_PHYS, x, y, Math.cos(n / 8 * 6.28) * (25 + Math.random() * 25), -25 - Math.random() * 35, 0.7 + Math.random() * 0.4, R_EL, { g: 240, floor: HY, age0: 0.05 });
    hitDummy(k === 2 ? 1 : 0, 1); shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.25 });
    if (k === 2) { ring(x, HY - 2, 0, R_EL); pdT = 0; dummyFx({ dur: 1.8, tint: 'poison' }); hitDummy(1, 1); }
  }
  function spitSkill(k) { const [x, y] = mouthScr(), T = SK_T[k]; spit(1, k, x + 1, y, T[0], T[1], T[2], 0.3); fx.cross(x + 2, y, k === 0 ? 7 : 5, R_EL, 2 / 12, 2); burst(x + 1, y, 5, 20, 50, 0.1, 0.25, R_EL, 0); sfx('shoot', { proj: 'water' }); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [x, y] = mouthScr();
      releaseOrbit(30, 70, 0.2, 0.4, { pts: 1, to: [DUMMY_X - 6, HY - 16, 2.5] });
      burst(x + 1, y, 12, 30, 80, 0.15, 0.35, R_EL, 6); shake(0.28, 2); flash(0.05);
      spitSkill(0);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 2 / 12) {
      const [x, y] = mouthScr(); spit(0, 0, x + 1, y, DUMMY_X - 3, HY - 16, 5, 0.28); mzT = 0;
      fx.cross(x + 2, y, 3, R_EL, 2 / 12, 2); burst(x + 1, y, 4, 20, 40, 0.1, 0.2, R_EL, 0);
      sfx('swing', { kind: 'bite', w: 0.25 }); sfx('shoot', { proj: 'water' });
    }
    if (s === CAST && (t === 2 / 12 || t === 4 / 12)) spitSkill(t === 2 / 12 ? 1 : 2);
    if (s === DEATH && t === INCOMING + 0.70) {                                        // 头先着地（第 12 帧，头碰到地面线）
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-15 + Math.random() * 8), HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
    if (s === DEATH && t === INCOMING + 0.9) for (let i = 0; i < 8; i++) spawn(K_DUST, scrX(-8 + Math.random() * 20), HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);   // 盘身摊平
  }
  const EVENTS = [[], [], [2 / 12], [], [2 / 12, 4 / 12], [], [], [INCOMING + 0.70, INCOMING + 0.9], []];
  function stepFX(dt, state, stT) {
    for (let i = 0; i < BN; i++) {
      if (!bOn[i]) continue; bT[i] += dt; const [x, y] = bPos(i);
      if ((bN[i]++ & 1) === 0) spawnX(K_PHYS, x - 1, y, -8 + Math.random() * 6, 4, 0.22 + Math.random() * 0.1, R_EL, { g: 90, age0: 0.25 });   // 滴落的尾迹
      if (bT[i] >= bDur[i]) { bOn[i] = 0; blobHit(i, R(x), R(y)); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.2 }); lastGf = P.gf; }   // 拱峰落地（不扬尘）
    if (state === CHARGE && stT > 0.15 && stT < 1.3) {                                  // 毒滴从盘身四周螺旋升起，汇进张开的嘴
      chargeAcc += dt * (16 + 24 * clamp01(stT / 1.1)); const [mx, my] = mouthScr();
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 7, a = 0.25 * Math.PI + Math.random() * 0.75 * Math.PI; spawnX(K_SPIRAL_PT, mx, my, (r - 3.5) / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 2.5, tx: mx, ty: my, squash: 1 }); }
    }
    if (state === RECOVER && !dripDone && stT >= 0.25) { dripDone = 1; const [mx, my] = mouthScr(); spawnX(K_PHYS, mx - 1, my + 1, 0, 0, 1.0, R_EL, { g: 160, floor: HY, age0: 0.1 }); }   // 嘴角挂着的一滴落地
    if (state !== RECOVER) dripDone = 0;
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, scrX(-16 + Math.random() * 28), HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL, { age0: 0.35 }); } }   // 魂光荧绿偏暗
    pdT += dt; mzT += dt;
  }
  function fxReset() { bOn.fill(0); pdT = 9; mzT = 9; chargeAcc = 0; soulAcc = 0; lastGf = -9; dripDone = 0; }
  function fxBack(f12) { if (!P.lie && P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 毒洼：目标脚下 2 格厚，每 0.2 s 冒一个泡，泡顶点缀 curse 紫；1.2 s 后抖动褪去
  function fxMid(f12) {
    if (pdT >= 1.8) return;
    const fade = clamp01((pdT - 1.2) / 0.6), grow = clamp01(pdT / 0.15), hw = R(4 + 5 * grow);
    for (let x = DUMMY_X - hw; x <= DUMMY_X + hw - 2; x++) {
      if (E.bayer(x, f12) < fade) continue; const e = x === DUMMY_X - hw || x === DUMMY_X + hw - 2;
      put(x, HY, e ? EL[4] : ((x + f12) % 5 === 0 ? EL[1] : EL[2])); put(x, HY + 1, e ? EL[4] : EL[3]);
    }
    if (fade > 0.5) return;
    const k = Math.floor(pdT / 0.2), ph = pdT - k * 0.2, bx = DUMMY_X - 5 + R(E.hash(k, 7) * 9);
    if (ph < 0.08) put(bx, HY - 1, EL[1]);
    else if (ph < 0.15) { put(bx, HY - 2, EL[1]); put(bx - 1, HY - 1, EL[2]); put(bx + 1, HY - 1, EL[2]); put(bx, HY - 3, CURSE[2]); }
    else { put(bx, HY - 3, CURSE[2]); put(bx - 1, HY - 2, EL[3]); put(bx + 1, HY - 2, EL[3]); }
  }
  function fxFront(f12) {
    for (let i = 0; i < BN; i++) {
      if (!bOn[i]) continue; const [fx0, fy0] = bPos(i), x = R(fx0), y = R(fy0);
      if (bKind[i] === 1) {                                                             // 技能毒弹：3×3 核心（白芯），比普攻大一档，外缘一圈暗色 + 甩出的尾滴
        for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) put(x + k, y + j, !j && !k ? EL[0] : j < 0 || k > 0 ? EL[1] : EL[2]);
        put(x + 2, y, EL[1]); put(x, y - 2, EL[2]); put(x - 2, y, EL[2]); put(x, y + 2, EL[3]); put(x - 3, y + ((f12 & 1) ? 1 : 0), EL[3]);
      } else { put(x - 1, y, EL[2]); put(x, y, EL[1]); put(x + 1, y, EL[0]); put(x, y + 1, EL[1]); put(x + 1, y + 1, EL[1]); }
    }
  }

  return {
    name: '舞蛇', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow, M.eg1, M.eg2, M.eg3], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'poison', style: 'poison', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
