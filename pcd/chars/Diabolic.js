// 恶魔（衍生单位 · 骷髅 · 射手 · 普通 · 远程 600；desc「恶魔法术师宠物」；特性「召唤小鬼」：召唤一只小鬼（魔法 / 奥术））：
//   一只盘腿飘在半空的焦红小骷髅——孩童比例、大圆颅骨（骨白牙、鼻骨点、紫光眼窝）、细骨四肢，骨头被魔焰熏成红褐；头顶一对分开的、先竖后往后弯的恶魔角（老猎犬头上是同款小角），
//   身后一对暗紫破膜小骨蝠翼，一条细长尾巴在身后卷成问号、末端是箭头尾尖（老猎犬的尾尖同款）；双掌之间托着一团奥术紫火球（发光体）。
// 攻击 = 射（徒手施法）：把火球收到胸前，双手一推，扔出一颗直飞的紫色火弹。
// 技能 = 特性「召唤小鬼」：火球在两掌间越搓越大、面前地上展开紫色五芒星法阵、尾巴竖直翼张开 → 举过头顶往法阵上一砸，
//   紫色冲击环炸开、五芒星竖起成一扇星门、天空闪白 → 小鬼（就是那只叼骨头的老猎犬）先以紫色剪影从星门里蹦出来，落地变成实体，紫火外爆 + 一串上升小火星，星门收拢。
// 死亡 = 沉入星门：挨打失去浮力坠到地上瘫着，身下展开五芒星法阵，身体从下往上慢慢被吸进阵里，最后一缕紫烟冒出、法阵熄灭。
// 上半身用 parts.rig（child 比例）做骨架，翅膀用 parts-beast 的 B.wing（membrane）；骷髅颅、肋骨架、盘腿、骨臂、弯角、箭头尾、火球、召唤出来的小鬼是本模块的候选部件。
// 设定卡见 pcd/batch-16/Diabolic/design.md。
PCD.define('Diabolic', (E) => {
  const { parts, Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow } = E;
  const B = parts.beast, U = B.util, RD = Math.round, PX = parts.px, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 元素：奥术召唤 · 星辉紫（magic：白 → 青 → 蓝 → 紫 → 深紫），火球外焰点缀 fire 第 2 级 ─────
  const R_EL = FXI.magic, EL = FXR[R_EL], FIRE2 = FXR[FXI.fire][1];
  const R_ASH = E.fxRamp('diabolicAsh', [47, 45, 44, 20, 8]);                                 // 受击迸出的焦骨火星

  // ───── 材质 ─────
  const M = parts.mats(E, {
    bone: [0, 44, 19, 45],                              // 焦红骨（fire 暗段：被魔焰熏成红褐）
    tail: [0, 44, 44, 45],                              // 尾（fire 暗段）
    horn: [0, 52, 54, 18],                              // 角 / 箭头尾尖（shadow，亮面提到灰紫，夜空里看得见）
    ink: { r: 'ink', flat: 1 },
    eyeG: { r: [25, 24, 43, 21], flat: 1 },             // 眼窝紫光（发光体，5 档）
    ball: { r: [25, 24, 43, 21], flat: 1 },             // 掌间火球（发光体）
    fire: { r: [44, 45, 46, 47], flat: 1 },             // 火球外焰的一点橙
    tooth: { r: [0, 19, 6, 17], flat: 1 },              // 牙和鼻骨：没被熏黑的骨白（让大红颅一眼读成骷髅）
  });
  const WM = { wing: E.defMat([0, 52, 54, 43], 1), wingFar: E.defMat([0, 52, 53, 54], 1), bone: M.bone, boneFar: M.boneD, claw: M.horn };   // 暗紫破膜 + 焦骨翼指
  const BODY = { body: 'child', leg: 3, torso: 6, head: 8, headW: 8, sw: 3, arm: 7, lw: 1 };
  const WSPEC = { span: 11, chord: 3, type: 'membrane', fingers: 3 };
  const HX = 34, ALT = 5, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(54, 46, 25, 41);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 3, 7, 11], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['ink', 'eyeG', 'ball', 'fire', 'horn', 'hornD', 'tooth']) RIM.skip[M[k]] = 1;
  const GX = HX + 26, IMP_X = GX + 12;                                                          // 法阵 / 星门的位置，小鬼落地的位置（屏幕 x）

  // ───── 姿势 ─────
  // hx/hy 前手 · bhx/bhy 后手 · fx/fy 火球中心 · fr 火球半径 0–3 · wing 翼姿（B.WINGS）· tail 尾摆 · tl 尾形（0 问号 · 1 竖直 · 2 垂落）
  // eyeG 眼光档 · jaw 张嘴 · fl 飘动 · dy 下沉（坠落 / 沉入星门）· st 状态
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, fx: 0, fy: 0, fr: 0, lean: 0, head: 0, wing: 1, tail: 0, tl: 0, eyeG: 0, jaw: 0, eyes: 0, flash: 0, rim: 0, fl: 0, dy: 0, bx: 0, dq: 0, dq48: 0, st: 0,
    bob: 0, crouch: 0, step: 0, wup: 0, walk: 0, lying: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -8, 16], ['hy', -30, 2], ['bhx', -8, 16], ['bhy', -30, 2], ['fx', -8, 16], ['fy', -30, 2], ['fr', 0, 3], ['lean', -1, 1], ['head', -1, 1],
    ['wing', 0, 6], ['tail', -2, 2], ['tl', 0, 2], ['eyeG', 0, 4], ['jaw', 0, 2], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['fl', -2, 2], ['dy', -2, 40], ['bx', -8, 8], ['dq48', 0, 48], ['st', 0, 8]]);
  const K = (hx, hy, bhx, bhy, fx, fy, fr, lean) => ({ hx, hy, bhx, bhy, fx, fy, fr, lean });
  const K_IDLE = K(6, -7, 2, -7, 4, -8, 1, 0);
  const K_WIND = K(3, -9, 0, -9, 2, -10, 1, -1);           // 火球收到胸前
  const K_PUSH = K(10, -8, 9, -9, 11, -9, 0, 1);           // 双手一推（火球已扔出）
  const K_HOLD = K(9, -8, 8, -9, 11, -9, 0, 1);
  const K_RUB = K(9, -9, 1, -9, 5, -9, 3, 1);              // 蓄力：两掌间搓大火球
  const K_UP = K(4, -21, 1, -21, 3, -24, 3, 0);            // 举过头顶
  const K_SLAM = K(10, -5, 9, -6, 11, -6, 0, 1);           // 往前下方一砸
  const K_HURT = K(4, -9, 0, -10, 2, -10, 1, -1);
  const K_SLUMP = K(6, -3, 1, -3, 4, -3, 0, 0);            // 瘫在地上，两手垂下
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'fx', 'fy', 'fr', 'lean'];
  const setK = (A, Bk, q) => E.mix(P, A, Bk, q, FIELDS);
  const T_PUSH = 2 / 12, T_SLAM = 3 / 12, T_POP = 3 / 12, T_IMPL = 5 / 12, T_LAND = INCOMING + 0.66, T_PUFF = INCOMING + 2.35;
  const FLAP = [1, 4, 3, 4];                                              // 扑翼：上扬 → 半收 → 下压 → 半收（不用平展 2：小膜翼平展时侧看只剩一条横线）
  // 待机个性「抛接火球」：[火球 x, y, 后手 y, 前手 y]：后手往上一抛 → 弧线 → 前手接住
  const JUGGLE = [[2, -9, -9, -7], [3, -12, -10, -7], [4, -14, -8, -8], [5, -11, -7, -9], [6, -8, -7, -8]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.head = 0; P.wing = 1; P.tail = 0; P.tl = 0; P.eyeG = 0; P.jaw = 0; P.eyes = 0; P.flash = 0; P.rim = 0; P.fl = 0; P.dy = 0; P.dq = 0; P.mx = 0; P.flip = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); P.wing = FLAP[(f12 >> 1) & 3]; P.fl = (Math.floor(TT * 2.5 + 1e-6) & 1) ? -1 : 0; P.tail = [0, 1, 0, -1][Math.floor(TT * 2.5 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const j = JUGGLE[Math.min(4, f12of(lp - 1.6))]; P.fx = j[0]; P.fy = j[1]; P.bhy = j[2]; P.hy = j[3]; P.tail = (f12 & 1) ? 2 : -2; P.jaw = 1; P.eyeG = 1; P.head = -1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 飘浮：翅膀快扇，身体上下飘 2 格，不落地
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); P.wing = FLAP[f]; P.fl = [0, -1, -2, -1][f]; P.tail = [2, 1, -2, -1][f]; P.lean = 1;   // 两个半收帧靠尾巴甩向区分
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.wing = 4; P.eyeG = 1; P.tail = 1; }
      else if (tq < 0.2) { setK(K_PUSH, K_PUSH, 0); P.wing = 5; P.eyeG = 2; P.rim = 2; P.jaw = 2; P.tail = -2; P.bx = -1; }
      else if (tq < 0.45) { setK(K_PUSH, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.wing = 3; P.eyeG = 1; P.jaw = 1; P.tail = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.fr = q > 0.5 ? 1 : 0; P.wing = FLAP[(f12 >> 1) & 3]; }
    } else if (st === CHARGE) {                                          // 搓火球：半径 1 → 3，尾巴竖直、翼张开
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RUB, q);
      P.fr = tq < 0.35 ? 1 : tq < 0.8 ? 2 : 3; P.hy += (f12 & 1) ? -1 : 0; P.bhy += (f12 & 1) ? 0 : -1;    // 两掌上下错开地搓
      P.tl = q > 0.5 ? 1 : 0; P.wing = q > 0.4 ? 5 : FLAP[(f12 >> 1) & 3]; P.eyeG = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.jaw = tq > 1.1 ? 2 : 1;
      if (tq > 1.1) P.fl = (f12 & 1) ? -1 : 0;
    } else if (st === CAST) {                                            // 举过头顶 → 往法阵上一砸
      if (tq < 1 / 12) { setK(K_UP, K_UP, 0); P.wing = 5; P.head = -1; }
      else { setK(K_SLAM, K_SLAM, 0); P.wing = 3; P.head = 1; P.bx = 1; }
      P.tl = 1; P.eyeG = 3; P.rim = 3; P.jaw = 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.fr = tq < 0.35 ? 0 : 1;
      P.wing = tq < 0.2 ? 4 : FLAP[(f12 >> 1) & 3]; P.eyeG = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.jaw = tq < 0.3 ? 2 : 1; P.tl = tq < 0.2 ? 1 : 0;   // 咧嘴笑
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 2; P.wing = 5; P.tail = 2; P.head = -1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.fl = -1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.jaw = 1; P.wing = 4; P.tail = 1; P.rim = 0; }
      else idle();
    } else if (st === DEATH) {                                           // 坠地瘫住 → 沉入星门
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 2; P.wing = d < 0.15 ? 5 : 0; P.tail = 2; P.head = -1; P.flash = d < 1 / 12 ? 1 : 0; P.eyeG = (f12 & 1) ? 1 : 4; }
      else if (d < T_LAND - INCOMING) { const q = (d - 0.3) / (T_LAND - INCOMING - 0.3); setK(K_HURT, K_SLUMP, q); P.bx = -2; P.eyes = 1; P.jaw = 2; P.tl = 2; P.head = 1; P.wing = 0; P.dy = RD(ALT * q * q); P.eyeG = 4; }
      else {
        setK(K_SLUMP, K_SLUMP, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.wing = 0; P.tl = 2; P.head = 1; P.eyeG = d < 0.9 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        P.dy = ALT + (d < T_SINK ? 0 : RD(24 * ease.in(clamp01((d - T_SINK) / 1.0)) + 1));      // 从下往上被吸进阵里
      }
    } else if (st === REVIVE) { idle(); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.eyeG = tq > 0.85 ? 2 : 0; }
    for (const f of FIELDS) P[f] = RD(P[f]);
    const yo = yOff(); P.gx = (P.fr ? P.fx : P.hx) + P.bx; P.gy = (P.fr ? P.fy : P.hy) + yo;
    P.dq48 = RD(P.dq * 48); KEY(P);
  }
  const T_SINK = 1.3;                                                     // 死亡内秒数：开始下沉
  const yOff = () => -ALT + P.fl + P.dy;                                  // 身体按「盘腿坐在地上」的坐标画，整体抬高 ALT 格

  // ───── 画 ─────
  // 候选部件：boneArm —— 骷髅细臂：1 格上臂 + 前臂（肘往后下弯）+ 肘节高光 + 2×2 骨手（Summoner 同画法，无袖）
  function boneArm(T, sx, sy, hx, hy, bm) {
    const L = BODY.arm, L1 = L / 2; let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    if (d > L) { const k = (d - L) / d; sx += dx * k; sy += dy * k; dx = hx - sx; dy = hy - sy; d = L; }
    let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    E.part(); parts.line(E, T, sx, sy, ex, ey, bm, 0); parts.line(E, T, ex, ey, hx, hy, bm, 0); PX(E, T, ex, ey, bm, 4);
    parts.rect(E, T, hx - 1, hy - 1, 2, 2, bm, 0); PX(E, T, hx - 1, hy - 1, bm, 4); PX(E, T, hx + 1, hy - 1, bm, 3);   // 爪尖
  }
  // 候选部件：ribCage —— 骷髅孩童的肋骨架：后沿一列脊椎、锁骨一行、三根肋骨（肋间 1 行空隙，烘焙时成暗缝）、胸骨、骨盆
  function ribCage(T, R) {
    E.part(); const m = M.bone, yS = R.yS, yH = R.yHip;
    for (let y = yS; y <= yH; y++) { const [L, Rr] = parts.edges(R, y); PX(E, T, L + 1, y, m, (y & 1) ? 2 : 3); }         // 脊椎
    { const [L, Rr] = parts.edges(R, yS); parts.run(E, T, yS, L + 1, Rr, m, 0); PX(E, T, Rr, yS, m, 4); }                     // 锁骨
    for (const dy of [2, 4]) { const y = yS + dy, [L, Rr] = parts.edges(R, y); parts.run(E, T, y, L + 1, Rr, m, 0); PX(E, T, L + 2, y, m, 4); }   // 肋骨
    { const y = yS + 5, [L, Rr] = parts.edges(R, y); parts.run(E, T, y, L + 2, Rr - 1, m, 2); }                                  // 最下一根短肋
    for (let y = yS + 1; y <= yS + 4; y++) { const Rr = parts.edges(R, y)[1]; PX(E, T, Rr, y, m, y === yS + 1 ? 4 : 3); }       // 胸骨
    const [L, Rr] = parts.edges(R, yH); parts.run(E, T, yH, L, Rr, m, 0); PX(E, T, L, yH, m, 4); PX(E, T, L + 2, yH, M.ink, 0);   // 骨盆 + 闭孔
  }
  // 候选部件：crossLegs —— 盘起来的两条细骨腿（悬浮不落地）：大腿往前平伸、小腿折回来在胯下交叉，脚掌 2 格
  function crossLegs(T, R) {
    const y0 = R.yHip + 1;
    E.part(); parts.line(E, T, R.hipBx, y0, R.hipFx + 3, y0 + 1, M.boneD, 0); parts.line(E, T, R.hipFx + 3, y0 + 1, R.hipBx + 1, y0 + 2, M.boneD, 0); PX(E, T, R.hipBx, y0 + 2, M.boneD, 2);
    E.part(); parts.line(E, T, R.hipFx - 1, y0, R.hipFx + 4, y0, M.bone, 0); PX(E, T, R.hipFx + 4, y0, M.bone, 4); parts.line(E, T, R.hipFx + 4, y0 + 1, R.hipFx - 1, y0 + 2, M.bone, 0);
    parts.run(E, T, y0 + 2, R.hipFx - 3, R.hipFx - 2, M.bone, 3);
  }
  // 候选部件：impHorn —— 恶魔弯角：(x, y) 是角根左格（压在颅顶那一行，颅骨后画会盖住，颅骨的分界线还会吃掉上面一行）；
  //   2 格宽的角根先竖直长上去，再往后（-x）弯 2–3 格、收成往后平伸的 1 格粗尖。near 亮面（horn 3 / 前缘与尖 4），far 暗一级（hornD）且矮一格、
  //   弯得更早，两角之间的空隙往上越开越大（勾线后中间仍留空，剪影里是两只角而不是一撮毛）。老猎犬的小角用同一画法缩小。
  const HORN_NEAR = [[0, 0, 2], [0, -1, 2], [0, -2, 2], [0, -3, 2], [-1, -4, 2], [-3, -5, 2]];
  const HORN_FAR = [[0, 0, 2], [0, -1, 2], [0, -2, 2], [-1, -3, 2], [-3, -4, 2]];
  function impHorn(T, x, y, mat, far) {
    E.part(); const pts = far ? HORN_FAR : HORN_NEAR, n = pts.length - 1;
    pts.forEach(([dx, dy, w], i) => { for (let j = 0; j < w; j++) PX(E, T, x + dx + j, y + dy, mat, i === n ? (j === 0 ? 4 : 3) : j === w - 1 ? 4 : 3); });
  }
  // 候选部件：demonSkull —— 孩童大圆颅（headW × head）：圆颅顶、眉骨一行亮面；2 × 2 墨色眼窝里 1–2 格紫光（5 档）、
  //   鼻腔 1 格墨 + 上方 1 格骨白鼻骨点；一排骨白尖牙（牙缝是墨色，嘴角上翘，恶作剧的笑）；jaw 0–2 下颌张开露下排牙
  const EYE_T = [2, 3, 3, 4, 1];
  function demonSkull(T, R) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, m = M.bone, jw = P.jaw | 0;
    for (let y = top; y <= bot - 2; y++) { let a = x0, b = x1; if (y === top) { a += 2; b -= 1; } else if (y === top + 1) a += 1; parts.run(E, T, y, a, b, m, 0); }
    PX(E, T, x0 + 2, top + 1, m, 4); PX(E, T, x0 + 3, top + 1, m, 4); PX(E, T, x0 + 1, top + 2, m, 4);                           // 颅顶高光
    PX(E, T, x0 + 2, ey + 1, m, 2); PX(E, T, x0 + 3, ey + 2, m, 2);                                                               // 太阳穴凹
    const sx = x1 - 3;
    parts.run(E, T, ey - 1, sx - 1, x1, m, 4);                                                                                    // 眉骨
    if (P.eyes) { parts.run(E, T, ey + 1, sx, sx + 1, M.ink, 0); PX(E, T, sx, ey, m, 2); PX(E, T, sx + 1, ey, m, 2); }
    else { parts.rect(E, T, sx, ey, 2, 2, M.ink, 0); PX(E, T, sx + 1, ey, M.eyeG, EYE_T[P.eyeG]); if (P.eyeG === 3 || P.eyeG === 2) PX(E, T, sx, ey + 1, M.eyeG, 2); }
    PX(E, T, x1 - 1, ey + 1, m, 4);                                                                                               // 颧骨
    PX(E, T, x1, ey + 1, M.ink, 0); PX(E, T, x1, ey, M.tooth, 3);                                                                 // 鼻腔 + 鼻骨点
    const my = bot - 2; for (let x = x0 + 3; x <= x1; x++) PX(E, T, x, my, ((x - x0) & 1) ? M.tooth : M.ink, ((x - x0) & 1) ? (x === x1 ? 4 : 3) : 0);   // 上排尖牙（牙缝墨色）
    PX(E, T, x0 + 2, my - 1, M.ink, 0);                                                                                           // 嘴角上翘
    for (let y = my + 1; y < my + 1 + jw; y++) parts.run(E, T, y, x0 + 3, x1, M.ink, 0);                                           // 张嘴
    const jy = my + 1 + jw; parts.run(E, T, jy, x0 + 2, x1, m, 0); parts.run(E, T, jy + 1, x0 + 3, x1 - 1, m, 2);                 // 下颌
    if (jw) for (let x = x0 + 4; x <= x1; x += 2) PX(E, T, x, jy, M.tooth, 3);                                                    // 下排牙
  }
  // 候选部件：arrowTail —— 细长尾：从尾椎往后，卷成问号（tl 0）/ 竖直（1）/ 垂落（2），末端 3 格宽的箭头尾尖（角的材质）；P.tail 甩动上半截
  const TAILS = [
    [[-1, 0], [-2, 1], [-3, 1], [-4, 1], [-5, 0], [-6, -1], [-6, -2], [-6, -3], [-6, -4], [-5, -5], [-4, -6], [-3, -6]],
    [[-1, 0], [-2, 0], [-3, -1], [-3, -2], [-3, -3], [-3, -4], [-3, -5], [-3, -6], [-3, -7], [-3, -8], [-3, -9], [-3, -10]],
    [[-1, 0], [-2, 1], [-3, 2], [-4, 2], [-5, 2], [-6, 2], [-7, 1], [-7, 0], [-6, -1]],     // 垂落：软塌塌地垂到胯下，末端往回卷一个小钩
  ];
  const TAIL_TIP = [[1, 0], [0, -1], [1, 0]];
  function arrowTail(T, R) {
    E.part(); const pts = TAILS[P.tl], n = pts.length, sw = P.tail | 0, x0 = parts.edges(R, R.yHip)[0], y0 = R.yHip;
    let lx = 0, ly = 0;
    for (let k = 0; k < n; k++) { const q = k / (n - 1), off = P.tl === 1 ? RD(sw * q * q) : P.tl === 0 ? RD(sw * q * q * 1.5) : 0; lx = x0 + pts[k][0] + off; ly = y0 + pts[k][1]; PX(E, T, lx, ly, M.tail, k < 3 ? 0 : (k & 1) ? 2 : 0); }
    const [dx, dy] = TAIL_TIP[P.tl], nx = -dy, ny = dx, ax = lx + dx, ay = ly + dy;
    PX(E, T, ax, ay, M.horn, 3); PX(E, T, ax + nx, ay + ny, M.horn, 4); PX(E, T, ax - nx, ay - ny, M.horn, 2); PX(E, T, ax + dx, ay + dy, M.horn, 4);
  }
  // 候选部件：fireOrb —— 掌间的奥术火球（发光体，一个部件）：半径 1 十字 · 2 圆团 · 3 大团（白芯 → 淡紫 → 紫 → 深紫边），顶上一格橙色外焰按帧跳
  function fireOrb(T, cx, cy, r) {
    if (!r) return; E.part(); const fk = (P.hy + P.bhy + P.fl) & 1;
    if (r === 1) { PX(E, T, cx, cy, M.ball, 4); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) PX(E, T, cx + a, cy + b, M.ball, 3); PX(E, T, cx, cy - 2, M.fire, 4); return; }
    const rr = r === 2 ? 1.6 : 2.6;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > rr) continue; PX(E, T, cx + x, cy + y, M.ball, d < rr * 0.35 ? 4 : d < rr * 0.7 ? 3 : 2); }
    PX(E, T, cx - 1, cy - 1, M.ball, 4); PX(E, T, cx + fk, cy - r - 1, M.fire, 4); PX(E, T, cx - 1 + fk * 2, cy - r, M.fire, 3);
  }
  function drawHero() {
    begin(hero, P.bx, yOff(), -yOff());                                   // 贴地截断：沉进地面的部分不画
    const R = parts.rig(P, BODY), T = R;
    B.wing(E, R.sBx + 1, R.yS - 2, P.wing, WSPEC, WM, 1);                 // 远翼（错开、暗一级）
    arrowTail(T, R);
    boneArm(T, R.sBx, R.sBy, P.bhx, P.bhy, M.boneD);
    crossLegs(T, R);
    ribCage(T, R);
    B.wing(E, R.sBx - 1, R.yS - 1, P.wing, WSPEC, WM, 0);                     // 近翼
    impHorn(T, R.hx0, R.htop, M.hornD, 1);                                // 远角在后脑；角画在颅骨之前：根部压在颅顶下，不在脸上压分界线
    impHorn(T, R.hx0 + 5, R.htop, M.horn, 0);                             // 近角在眼窝上方，两角根之间隔 3 格
    demonSkull(T, R);
    fireOrb(T, P.fx, P.fy, P.fr);
    boneArm(T, R.sFx, R.sFy, P.hx, P.hy, M.bone);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 召唤出来的小鬼：一只叼骨头、长垂耳、小弯角、箭头尾的小老猎犬（17 × 9，脚底在最后一行）─────
  const IMP = [
    '..........H.H....',
    'A.........HLLL...',
    'At.......dLFEFF..',
    '.t......ddFFFFFF.',
    '..t.....dLLFFwWWB',
    '...tLLLLFFFFdd...',
    '...dFFFFFFFFd....',
    '...F.d.FF.dF.F...',
    '...F..F...F..F...',
  ];
  const IMP_C = { H: 53, A: 54, t: 20, L: 33, F: 19, d: 20, E: 43, w: 6, W: 17, B: 43 };
  const IW = IMP[0].length + 2, IH = IMP.length + 2, impPix = new Int16Array(IW * IH).fill(-1);   // 带 1 格勾线的小图：-1 空 · 0 勾线 · 其余色板下标
  IMP.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (IMP_C[row[x]] != null) impPix[(y + 1) * IW + x + 1] = IMP_C[row[x]]; });
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { if (impPix[y * IW + x] > 0) continue; const on = (a, b) => a >= 0 && b >= 0 && a < IW && b < IH && impPix[b * IW + a] > 0; if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) impPix[y * IW + x] = 0; }
  function drawImp(cx, by, mode, dq) {                                    // mode 0 紫色剪影 · 1 实体；dq 消散
    const x0 = RD(cx) - (IW >> 1), y0 = RD(by) - IH + 2;
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
      const c = impPix[y * IW + x]; if (c < 0 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq) || y0 + y > HY + 1) continue;
      put(x0 + x, y0 + y, mode ? c : c === 0 ? EL[4] : ((x + y) & 3) === 0 ? EL[2] : EL[3]);
    }
  }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, upX = 0, upY = 0;
  const ballScr = () => [scrX(P.gx), HY + P.gy];
  const castT = () => (E.state === CAST ? E.stT : E.state === RECOVER ? DUR[CAST] + E.stT : -1);
  function onEnter(s) {
    if (s === CHARGE) fx.circle(GX, HY - 1, 12, 3, R_EL, DUR[CHARGE] + 0.1, 0.4, 0);
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); [upX, upY] = ballScr();
      releaseOrbit(40, 90, 0.3, 0.6); burst(upX, upY, 20, 50, 120, 0.3, 0.6, R_EL, 10); ring(upX, upY, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_PUSH) {                                  // 双手一推：紫色火弹直飞
      mzT = 0; mzX = scrX(12); mzY = HY + yOff() - 9;
      shoot(1, mzX + 1, mzY, 180, DUMMY_X - 3, R_EL); burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.2 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && t === T_SLAM) {                                    // 火球砸在法阵上：紫色冲击环炸开，五芒星竖成星门
      ring(GX, HY - 2, 1, R_EL); burst(GX, HY - 3, 26, 50, 130, 0.3, 0.7, R_EL, 16); fx.cross(GX, HY - 6, 6, R_EL, 0.3); shake(0.2, 2); flash(0.04);
      for (let i = 0; i < 6; i++) spawn(K_DUST, GX - 8 + Math.random() * 16, HY, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.4, FXI.dust);
      sfx('impact', { pal: 'arcane', w: 0.25 });
    }
    if (s === CAST && t === T_IMPL) {                                    // 小鬼落地：变成实体，紫火外爆 + 一串上升小火星
      burst(IMP_X, HY - 4, 16, 30, 90, 0.25, 0.5, R_EL, 10); fx.cross(IMP_X, HY - 5, 4, R_EL, 0.2);
      for (let i = 0; i < 10; i++) spawn(K_EMBER, IMP_X - 6 + Math.random() * 12, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.6 + Math.random() * 0.5, R_EL);
      spawn(K_EMBER, IMP_X, HY - 8, 0, -16, 0.5, FXI.fire);
      sfx('impact', { pal: 'arcane', w: 0.15 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 8 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.08, 1); sfx('fall', { w: 0.2 }); }
    if (s === DEATH && t === T_PUFF) { fx.cloud(HX, HY - 4, 5, R_EL, 0.8); for (let i = 0; i < 12; i++) spawn(K_RISE, HX - 3 + Math.random() * 6, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.8 + Math.random() * 0.6, R_EL); }
  }
  const EVENTS = [[], [], [T_PUSH], [], [T_SLAM, T_IMPL], [], [], [T_LAND, T_PUFF], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;
    burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 10); spawn(K_EMBER, x, y - 2, 0, -12, 0.4, FXI.fire); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.2 });
  }
  function hurtFx(s) {                                                    // 焦骨火星 + 一点紫
    const hx = HX + 1, hy = HY - ALT - 9; burst(hx, hy, s === DEATH ? 20 : 12, 40, 120, 0.2, 0.5, R_ASH, 16); burst(hx, hy, 5, 30, 70, 0.2, 0.45, R_EL, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = ballScr();
    if (state === CHARGE) {                                               // 紫粒子螺旋汇进火球；法阵上冒火星
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.3 && Math.random() < dt * 10) spawn(K_EMBER, GX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL);
    }
    if (state === MOVE) { const f = gait(q12(stT)); if (f !== lastGf) { spawn(K_EMBER, scrX(-1), HY + yOff() + 1, (P.flip ? 1 : -1) * (6 + Math.random() * 6), 4, 0.45, R_EL); lastGf = f; } }   // 身下 1 颗紫火星拖尾
    if (state === IDLE && P.fr && Math.random() < dt * 2.5) spawn(K_EMBER, gx, gy - 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.6, R_EL);
    const ct = castT();
    if (ct >= 0 && ct < RECOVER_GATE && ct > T_SLAM) { emberAcc += dt * 16; while (emberAcc >= 1) { emberAcc -= 1; const a = Math.random() * 6.2832; spawn(K_EMBER, GX + Math.cos(a) * 4, HY - 10 + Math.sin(a) * 9, 0, -6 - Math.random() * 6, 0.35, R_EL); } }
    if (state === DEATH && stT > INCOMING + T_SINK && stT < T_PUFF) {    // 下沉处冒紫光
      soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 7 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.6 + Math.random() * 0.6, R_EL); }
    }
    mzT += dt;
  }
  const RECOVER_GATE = DUR[CAST] + 0.3;
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; mzT = 9; }
  // 候选部件（特效）：pentagram —— 透视压扁的地面五芒星：外椭圆点阵 + 五个角点两两隔一个连成星（虚线），lit 0–1 按笔画逐段亮起
  function pentagram(cx, cy, rx, ry, lit, f12, c0, c1) {
    const n = Math.ceil(rx * 5);
    for (let k = 0; k < n; k++) { if ((k + f12) & 1) continue; const a = k / n * 6.2832; put(RD(cx + Math.cos(a) * rx), RD(cy + Math.sin(a) * ry), c1); }
    const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566 + f12 * 0.02; pts.push([cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85]); }
    const strokes = Math.floor(lit * 5 + 1e-6);
    for (let s = 0; s < Math.min(5, strokes + 1); s++) {
      const A = pts[(s * 2) % 5], Bp = pts[(s * 2 + 2) % 5], part_ = s < strokes ? 1 : lit * 5 - strokes, L = Math.ceil(Math.hypot(Bp[0] - A[0], Bp[1] - A[1]));
      for (let k = 0; k <= L * part_; k++) { if ((k + f12) % 3 === 2) continue; put(RD(A[0] + (Bp[0] - A[0]) * k / L), RD(A[1] + (Bp[1] - A[1]) * k / L), c0); }
    }
    for (const p of pts) put(RD(p[0]), RD(p[1]), EL[0]);
  }
  function fxBack(f12) {
    if (P.dy < ALT + 2 && P.dq < 0.6) groundShadow(scrX(1 + P.bx), 6, Math.max(0, ALT - P.dy - P.fl));
    if (E.state === CHARGE) {                                             // 身下一个小五芒星（先亮）+ 面前将要开星门的大法阵
      pentagram(scrX(1), HY - 1, 6, 2, clamp01(E.stT / 0.6), f12, EL[2], EL[3]);
      pentagram(GX, HY - 1, 12, 3, clamp01((E.stT - 0.15) / 0.9), f12, EL[2], EL[3]);
    }
    if (E.state === DEATH) { const d = E.stT - INCOMING; if (d > 0.7 && d < T_PUFF - INCOMING + 0.15) pentagram(HX, HY - 1, 10, 3, clamp01((d - 0.7) / 0.35), f12, d > T_PUFF - INCOMING ? EL[4] : EL[2], EL[3]); }
    if (P.rim >= 2 && P.dy === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function fxMid(f12) {
    const ct = castT(); if (ct < 0) return;
    if (ct >= T_SLAM && ct < RECOVER_GATE) {                              // 星门：竖直椭圆点阵（开 2 帧 → 保持 → 收拢），门里隔点透出紫光
      const open = clamp01((ct - T_SLAM) / (2 / 12)), close = clamp01((RECOVER_GATE - ct) / 0.2), ry = RD(10 * Math.min(open, close)), rx = Math.max(1, RD(4 * Math.min(open, close))), cy = HY - 1 - ry;
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) { const q = (x * x) / ((rx + 0.4) ** 2) + (y * y) / ((ry + 0.4) ** 2); if (q <= 1 && ((x + y + f12) & 1) === 0 && q < 0.7) put(GX + x, cy + y, q < 0.3 ? EL[2] : EL[3]); }
      const n = Math.max(6, ry * 4); for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + ct * 3; put(RD(GX + Math.cos(a) * rx), RD(cy + Math.sin(a) * ry), (k & 3) === 0 ? EL[0] : EL[1]); }
    }
  }
  function fxFront(f12) {
    const ct = castT();
    if (ct >= 1 / 12 && ct < T_SLAM) {                                    // 大火球往法阵上砸（2 帧）
      const q = (ct - 1 / 12) / (T_SLAM - 1 / 12), x = RD(lerp(upX, GX, q)), y = RD(lerp(upY, HY - 3, q * q));
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d = Math.hypot(i, j); if (d <= 2.8) put(x + i, y + j, d < 1 ? 21 : d < 2 ? 43 : 24); }
      for (let k = 1; k <= 5; k++) put(x - RD(k * (GX - upX) / 8), y - k, k < 3 ? EL[1] : EL[2]); put(x, y - 4, FIRE2);
    }
    if (ct >= T_POP && ct < DUR[CAST] + 0.7) {                            // 小鬼：剪影蹦出星门 → 落地变实体 → 收招末尾消散
      if (ct < T_IMPL) { const q = (ct - T_POP) / (T_IMPL - T_POP); drawImp(lerp(GX, IMP_X, q), HY - 3 - Math.sin(Math.PI * q) * 9 + q * 3, 0, 0); }
      else drawImp(IMP_X, HY, 1, clamp01((ct - DUR[CAST] - 0.45) / 0.25));
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (P.fr === 3 && E.state === CHARGE && E.stT > 1.0) {                // 蓄满：火球十字星芒
      const [gx, gy] = ballScr(), L = 5 + (f12 & 1); for (let r = 4; r <= L; r++) { const c = r === 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }
  // 火弹：2×2 白芯 + 淡紫 / 紫外焰，身后一条跳动的火舌，顶上一格橙
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 1) return false;
    put(x, y, 21); put(x + d, y, 21); put(x, y - 1, 43); put(x + d, y - 1, 43); put(x + 2 * d, y, 43); put(x, y + 1, 24); put(x + d, y + 1, 24); put(x - d, y, 43); put(x - d, y - 1, 24);
    const w = f12 & 1; put(x - 2 * d, y - w, 24); put(x - 3 * d, y - 1 + w, 25); put(x - 2 * d, y + 1, 25); put(x + d, y - 2, FIRE2);
    return true;
  }

  return {
    name: '恶魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eyeG, M.ball, M.fire], HIT_POINT: [1, -ALT - 8], EVENTS,
    SFX: { body: 'stone', how: 'dissolve', pal: 'arcane', style: 'summon', w: 0.2, hover: 1 },
    REVIVE: { dy: -ALT - 10, ramp: FXI.magic },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot, hurtFx,
  };
});
