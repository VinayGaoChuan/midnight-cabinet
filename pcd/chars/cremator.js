// 焚尸人（cremator，英雄 · 近战领袖；技能「火葬」）：矮壮火化炉工，方箱铁面罩、比人还长的火铲、背上冒烟的骨灰坛、拳头比头还宽的防火手套；
// 近战低位横扫；技能铲起炭火 → 抡铲扬出 7 块燃烧炭块，地面窜火苗柱、假人挂火苗冒黑烟；死亡从脚往上化灰、塌成灰堆、面罩掉在灰堆上。
// 从 batch-00-pilot/cremator/cremator.html（技能模板版）转成共享引擎模块：第 3 节画法原样搬来，第 4 节特效改用引擎的粒子 / 冲击环 / 震屏 / 闪白 / 敌弹 / 复活。
PCD.define('cremator', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, q12, f12of, gait, walkDemo, color, fxRamp, FXR, FXI, W, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, shake, flash, hitDummy, put, scrX, shotFloorGlow, sfx } = E;
  const fl = (x) => Math.floor(x + 1e-6);                       // 带容差取整（同 q12）：原版画法里的 Math.floor 一律换成它，整格边界不会因浮点误差少一格
  const easeInOut = ease.inOut, easeOut = ease.out;

  // ───── 颜色：原版色板 0–26 与共享色板相同；27–42 是本角色专属色，按原色逐个追加（下标变了，颜色不变）─────
  const OWN = ['#0f0d0e', '#221e1f', '#393334', '#65534a',       // 27–30 炭灰罩袍（勾线 / 暗 / 基 / 亮；亮部偏暖）
    '#1a1412', '#3d2d25', '#66493a', '#8f6a52',                  // 31–34 锈铁（面罩、铲头、铁钳）
    '#3a2c24', '#6e5a4a', '#a08a74', '#cbb89e',                  // 35–38 陶骨色（骨灰坛）
    '#ffe08a', '#ff8a2a', '#c83a12', '#4a1206'].map(color);      // 39–42 炉火 淡黄 → 橙 → 红橙 → 焦红
  const pc = (i) => (i < 27 ? i : OWN[i - 27]);                 // 原版色板下标 → 本页下标
  const mat = (r, band, flat) => defMat(r.map(pc), band, flat);
  const R_FIRE = fxRamp('cremFire', [21, 39, 40, 41, 42].map(pc)), R_SMOKE = fxRamp('cremSmoke', [7, 30, 29, 28, 27].map(pc));   // 火葬 · 炉火（元素）；黑烟（坛口、被点燃的目标头顶）
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust, R_SOUL = FXI.soul;

  // ───── 材质、缓冲、姿势 ─────
  const M_ROBE = mat([27, 28, 29, 30], 2), M_HOOD = mat([27, 28, 29, 30], 1), M_PANTS = mat([27, 28, 28, 29], 1);
  const M_IRON = mat([31, 32, 33, 34], 1), M_GLOVE = mat([0, 20, 19, 6], 1), M_APRON = mat([31, 32, 32, 32], 1), M_BOOT = mat([31, 20, 20, 19], 1), M_STRAP = mat([31, 20, 19, 19], 1);
  const M_WOOD = mat([31, 20, 19, 19], 1), M_URN = mat([35, 36, 37, 38], 1), M_ASH = mat([27, 30, 7, 6], 1);
  const M_EMBER = mat([42, 41, 40, 39], 1, 1), M_GLOW = mat([39, 39, 21, 21], 1, 1), M_INK = mat([0, 0, 0, 0], 1, 1);
  const R_EL = R_FIRE, EL = FXR[R_EL], HX = 76, DUR = DEFAULT_DUR.slice();   // 近战：站在 76，前踏 2 格后铲头扫到 x≈98 的假人
  const hero = new Sprite(72, 48, 32, 42);                      // 缓冲：脚底 = (32, 42)；放得下抡过头顶的火铲、倒地的铲和侧倒的骨灰坛
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 13, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_EMBER] = HERO_RIM.skip[M_GLOW] = HERO_RIM.skip[M_WOOD] = HERO_RIM.skip[M_INK] = 1;
  // 姿势参数（取整后的范围，缓存键按此编码）：
  //   hx -32..31 · hy -64..63（前手 = 靠近铲头的那只手）· a ±π：铲头方向（0 = 朝下，正 = 朝前，π/32 一档）· lean / head -1..2 · back / bend 0..3（bend = 骨灰坛倾斜）· bob / glint / eyes / flash / lying / walk 0..1
  //   beard -3..4（兜帽尾摆）· sway -1..2 · gem 0..4（铲面炭火：0 待机暗红 / 1 橙 / 2 黄 / 3 白热 / 4 熄灭）· rim 0..3 · bx -16..15 · crouch 0..7 · lift 0..7（倒地后 = 灰堆高度）
  //   hatX -16..15 · hatY 0..15（掉落的铁面罩）· step -1..2 · wup 0..3 · dq 0..1
  //   新增：slit 0..4（面罩观察缝火光：0 熄灭 / 1 焦红 / 2 红橙 / 3 橙 / 4 白热）· ash 0..15（化灰进度，从脚往上）· pile 0..1（铲面堆起的炭）——都编进 k1
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, slit: 0, ash: 0, pile: 0, k1: 0, k2: 0 };
  const K_IDLE = { hx: 11, hy: -14, a: 0.1, lean: -1, head: 0, back: 0, bend: 0 };      // 拄铲：铲斗立在身前地上，前手（下）握柄、后手（上）在柄后
  const K_WIND = { hx: 2, hy: -9, a: -1.1, lean: -1, head: 0, back: 1, bend: 1 };      // 攻击预兆：铲头后引到身后低位
  const K_SWEEP = { hx: 9, hy: -10, a: 1.75, lean: 1, head: 1, back: 0, bend: 2 };     // 出手：低位横扫到身前
  const K_FOLLOW = { hx: 8, hy: -13, a: 2.2, lean: 1, head: 0, back: 0, bend: 2 };     // 延续：铲头顺势扬起
  const K_CHARGE = { hx: 6, hy: -9, a: 0.7, lean: 1, head: 1, back: 0, bend: 1 };      // 蓄力：铲头插进身前地面铲炭
  const K_CAST = { hx: 8, hy: -21, a: 2.75, lean: 0, head: -1, back: 1, bend: 3 };     // 施放：向前上方抡铲定格
  const K_HURT = { hx: 9, hy: -14, a: 0.1, lean: -1, head: -1, back: 1, bend: 3 };
  const K_KNEEL = { hx: 7, hy: -8, a: 0.95, lean: 1, head: 1, back: 0, bend: 1 };      // 跪倒：火铲前倾滑脱
  const K_DRAG = { hx: -4, hy: -8, a: -1.0, lean: 1, head: 0, back: 0, bend: 1 };      // 拖铲步：铲斗拖在身后地上
  function mixPose(A, B, q) { P.hx = A.hx + (B.hx - A.hx) * q; P.hy = A.hy + (B.hy - A.hy) * q; P.a = A.a + (B.a - A.a) * q; P.lean = A.lean + (B.lean - A.lean) * q; P.head = A.head + (B.head - A.head) * q; P.back = A.back + (B.back - A.back) * q; P.bend = A.bend + (B.bend - A.bend) * q; }
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, -1, 0, 1], WALK_DIST = 14, WALK_STRIDE = 4;   // 行走循环：接触 → 经过 → 接触 → 经过；两脚绕中线 ±4 格交换（第二个接触帧后脚真正迈到前脚前面）
  const GLOW_MATS = [M_EMBER, M_GLOW], HIT_POINT = [0, -13];   // 发光体材质（铲面炭火、观察缝、坛口）、受击点（本地坐标）
  const T_FLICK = 2 / 12;
  const D_ASH0 = 0.45, D_ASH1 = 0.85, D_MASK = 1.0, D_FADE = 1.82;   // 死亡（来袭之后）：开始化灰 / 塌成灰堆 / 面罩落到灰堆上 / 开始消散
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1;
    P.slit = 2; P.ash = 0; P.pile = 0; let handBob = 1;
    const idle = () => {                                         // 拄铲看火：身体呼吸，铲子不动；观察缝一明一暗
      mixPose(K_IDLE, K_IDLE, 0); handBob = 0; const b = fl(TT * 2.5); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[fl(TT * 1.25) & 3];
      P.slit = (fl(TT * 1.25) & 1) ? 3 : 2;
      const lp = tq % DUR[IDLE];                                  // 待机个性：抬铲 → 铲尖敲地，溅起两颗火星
      if (lp >= 1.6 && lp < 1.75) { P.hy -= 2; P.head = 1; }
      else if (lp >= 1.75 && lp < 1.92) { P.glint = 1; P.head = 1; P.slit = 3; P.bob = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 拖铲步：走出去半程，转身（镜像）走回来；步伐每秒 6 帧
      mixPose(K_DRAG, K_DRAG, 0); const f = gait(tq);
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f]; P.bend = WALK_BOB[f] ? 2 : 1;
      P.a = K_DRAG.a + P.step * 0.05; P.hx = K_DRAG.hx + P.step * 0.6; P.gem = 0;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    }
    else if (st === ATTACK) {
      if (tq < 0.16) { mixPose(K_IDLE, K_WIND, tq < 0.08 ? 0.6 : 1); P.crouch = 1; P.gem = 1; P.slit = 3; P.beard = 1; }
      else if (tq < 0.25) { mixPose(K_SWEEP, K_SWEEP, 0); P.bx = 2; P.step = 1; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.slit = 3; }
      else if (tq < 0.45) { mixPose(K_SWEEP, K_FOLLOW, easeOut((tq - 0.25) / 0.2)); P.bx = 2; P.step = 1; P.gem = 1; P.beard = -1; P.slit = 3; }
      else { const q = easeInOut(clamp01((tq - 0.45) / 0.3)); mixPose(K_FOLLOW, K_IDLE, q); P.bx = Math.round(2 * (1 - q)); P.step = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {
      const q = easeInOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q); P.crouch = Math.round(q * 2);
      P.beard = -Math.round(q * 2) + (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.rim = 2; P.pile = tq >= 0.6 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : tq < 0.95 ? ((f12 & 1) ? 2 : 1) : ((f12 & 1) ? 3 : 2);
      P.slit = tq < 0.5 ? 3 : tq < 1.0 ? 4 : ((f12 & 1) ? 4 : 3); if (tq > 1.1) P.bend = 1 + (f12 & 1);
      if (tq >= 0.6) P.hy -= tq >= 0.7 ? 2 : 1;                     // 铲起：插进地里的铲斗带着一铲炭火抬出地面
    } else if (st === CAST) {
      if (tq < 1 / 12) { mixPose(K_CHARGE, K_CAST, 0.45); P.crouch = 1; P.pile = 1; } else { mixPose(K_CAST, K_CAST, 0); P.beard = (f12 & 1) ? -2 : -3; }
      if (tq < 1 / 12) P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.slit = 4;
    }
    else if (st === RECOVER) { const q = easeInOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q); P.beard = -Math.round(2 * (1 - q)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.slit = q < 0.5 ? 4 : 3; if (q > 0.8) handBob = 0; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.bend = 2; P.rim = 0; }
      else { mixPose(K_HURT, K_IDLE, easeInOut(clamp01((h - 0.35) / 0.15))); handBob = 0; }
    } else if (st === DEATH) {                                   // 化灰：命中 → 踉跄 → 跪倒（观察缝熄灭）→ 从脚往上化灰 → 塌成灰堆 + 面罩落下弹一下 → 静止 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 4; P.slit = (f12 & 1) ? 3 : 1; }
      else if (d < D_ASH1) {
        mixPose(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.crouch = 4; P.beard = 1; P.gem = 4; P.slit = d < 0.38 ? 1 : 0;
        if (d >= D_ASH0) P.ash = Math.min(15, 1 + Math.round((d - D_ASH0) / (D_ASH1 - D_ASH0 - 1 / 12) * 14));
      } else {
        P.lying = 1; P.bx = -2; P.lift = d < D_ASH1 + 0.08 ? 3 : d < D_MASK ? 1 : 0; P.gem = d < 1.3 ? ((f12 & 1) ? 1 : 2) : d < 1.6 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d < D_MASK) { const q = (d - D_ASH1) / (D_MASK - D_ASH1); P.hatY = Math.round(9 * (1 - q * q)); }
        else if (d < D_MASK + 0.2) { const q = (d - D_MASK) / 0.2; P.hatY = Math.round(Math.sin(q * Math.PI) * 3); P.hatX = Math.round(-2 * q); }
        else P.hatX = -2;
        if (d >= D_FADE) P.dq = clamp01((d - D_FADE) / 0.6);     // 面罩 1.2 s 落稳 → 静止 0.62 s → 消散
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0; P.slit = tq > 0.85 ? 4 : 2;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + (handBob ? P.bob : 0); P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    if (P.lying) { P.gx = -1 + P.bx; P.gy = -3; }
    else { const dx = Math.sin(P.a), dy = Math.cos(P.a); P.gx = Math.round(P.hx + dx * BLADE_C) + P.bx; P.gy = Math.min(0, Math.round(P.hy + dy * BLADE_C)); }
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.back; k = k * 4 + P.bend; k = k * 2 + P.bob;
    k = k * 8 + P.slit; k = k * 16 + P.ash; k = k * 2 + P.pile; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }
  // ───── 部件 ─────
  let robeL = 0, robeR = 0, UMX = 0, UMY = 0;
  function robeEdges(y, yT, hem, sway, lean) { const t = (y - yT) / Math.max(1, hem - yT), s = Math.round(sway * t * t), l = Math.round(lean * (1 - t)); robeL = -6 - Math.round(t * 1.4) + s + l; robeR = 5 + Math.round(t * 1.4) + s + l; if (y === yT) { robeL += 1; robeR -= 1; } }
  const UW = [1, 1, 2, 2, 2, 2, 2, 2, 1];                          // 骨灰坛逐行半宽：坛口、坛颈、鼓肩、坛身、坛底
  const URN_X = -9, URN_Y = -2;                                    // 骨灰坛相对肩线的位置（往下、往后挪开，让面罩左上直角露出来）
  function urnShift(k) { return -Math.round(P.bend * (8 - k) / 8 * 0.7); }
  function urnTop() { UMX = URN_X + P.lean + urnShift(0); UMY = -17 + P.bob + P.crouch + URN_Y - 1; }   // 坛口上方（本地坐标，不含 bx）：黑烟、火星从这里冒
  function seg(x0, y0, x1, y1, r, m) { for (let s = 0; s <= 1.001; s += 0.125) brush(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, r, m, 0); }
  function glove(x, y, sx, sy, cuff) {                            // 超大石棉防火手套：朝肩膀一侧的喇叭护腕 + 8×6 拳头（比 7 格宽的面罩还宽）+ 指节缝
    const vx = sx - x, vy = sy - y, l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
    if (cuff) brush(x + ux * 3.6, y + uy * 3.6, 2.6, M_GLOVE, 0);   // 护腕（后手的护腕藏在拳头和身体后面，不画）
    for (let j = -3; j <= 2; j++) for (let i = -4; i <= 3; i++) if (!((j === -3 || j === 2) && (i === -4 || i === 3))) sp(x + i, y + j, M_GLOVE, 0);
    const kx = ux > 0.35 ? -2 : 1, fx = ux > 0.35 ? -3 : 2;       // 指节缝在背离手腕的一侧
    for (let j = -2; j <= 1; j++) sp(x + kx, y + j, M_GLOVE, 1);  // 指节缝：一格深色线
    sp(x + fx, y - 1, M_GLOVE, 2); sp(x + fx, y + 1, M_GLOVE, 2); // 手指分缝
    if (cuff) for (let k = -2; k <= 2; k++) sp(x + ux * 5 - uy * k, y + uy * 5 + ux * k, M_GLOVE, 2);   // 护腕缝
  }
  function handSpan(a) { const s = Math.abs(Math.sin(a)), c = Math.abs(Math.cos(a)); return Math.min(10.5, Math.min(s > 0.02 ? 8 / s : 99, c > 0.02 ? 6 / c : 99) + 2); }   // 两只手套之间至少露出 2 格铲柄
  // 火铲：木柄从前手往后伸 16 格（比站姿身高还长）；铲斗只按整 90° 转（像素不走样），中心跟随真实角度
  //   铲斗（沿柄方向 u、横向 v，整数格）：铁套口 u 9–10（3 宽）→ 后沿 u 11（5 宽，band 1 压线，两角收成铲肩）→ 铲面 u 12–13（7 宽）→ 刃口 u 14（7 宽一整排直线高光 band 4，两角 band 3）
  //   两侧铲沿 v ±3、铲面 v ±2 自动明暗（左上受光）；炭火只在中间 3×2（u 12–13, v −1..1），不盖铲沿和刃口
  const BLADE_C = 12.5;                                            // 铲斗中心到前手的距离（发光体、特效挂点）
  const COAL_LV = [                                                // 铲面中间 3×2 炭火，5 档：[材质, 色调] × 6（后排 v −1/0/1，前排 v −1/0/1）
    [M_EMBER, 1, M_EMBER, 2, M_EMBER, 1, M_EMBER, 1, M_EMBER, 2, M_EMBER, 1],   // 0 待机：暗红闷烧
    [M_EMBER, 2, M_EMBER, 3, M_EMBER, 2, M_EMBER, 2, M_EMBER, 3, M_EMBER, 2],   // 1 橙
    [M_EMBER, 3, M_EMBER, 4, M_EMBER, 3, M_EMBER, 3, M_EMBER, 4, M_EMBER, 3],   // 2 黄
    [M_EMBER, 4, M_GLOW, 3, M_EMBER, 4, M_GLOW, 3, M_GLOW, 3, M_GLOW, 3],       // 3 白热
    [M_IRON, 2, M_IRON, 1, M_IRON, 2, M_IRON, 1, M_IRON, 2, M_IRON, 1],         // 4 熄灭
  ];
  const QUX = [0, 1, 0, -1], QUY = [1, 0, -1, 0];                  // 铲斗朝向：下 / 前 / 上 / 后
  function drawShovel(hx, hy, a, gem, pile, glint) {
    const dx = Math.sin(a), dy = Math.cos(a), q = ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4, ux = QUX[q], uy = QUY[q], nx = uy, ny = -ux;
    const rx = Math.round(hx + dx * 12), ry = Math.round(hy + dy * 12), lv = COAL_LV[gem === 4 ? 4 : Math.min(3, gem + (pile ? 1 : 0))];
    const cell = (u, v, m, t) => { const x = rx + ux * u + nx * v, y = ry + uy * u + ny * v; if (y <= 0) sp(x, y, m, t); };   // u、v 相对 u=12；地面以下不画（插进地里）
    line(hx - dx * 16, hy - dy * 16, rx - ux * 3, ry - uy * 3, M_WOOD, 3, 0);   // 木柄：一直伸进铁套口
    for (let u = -3; u <= -2; u++) for (let v = -1; v <= 1; v++) cell(u, v, M_IRON, 0);   // 铁套口
    for (let v = -2; v <= 2; v++) cell(-1, v, M_IRON, 1);                                 // 后沿：压一道深色线
    for (let u = 0; u <= 1; u++) for (let v = -3; v <= 3; v++) {
      const av = Math.abs(v);
      if (av <= 1) { const k = (u * 3 + v + 1) * 2; cell(u, v, lv[k], lv[k + 1]); }     // 炭火
      else cell(u, v, M_IRON, 0);                                                          // 铲面 + 两侧铲沿
    }
    for (let v = -3; v <= 3; v++) { const av = Math.abs(v); if (glint && av === 0) cell(2, v, M_EMBER, 4); else cell(2, v, M_IRON, av === 3 ? 3 : 4); }   // 刃口直线高光
  }
  function drawMask(x0, top, slit, look) {                       // 方箱铁面罩：7×7，铆钉 4 颗（右下压影，鼓出来），前后板接缝，一道横向观察缝
    for (let y = top; y <= top + 6; y++) run(y, x0 - 3, x0 + 3, M_IRON, 0);
    for (let y = top + 1; y <= top + 5; y++) sp(x0 - 1, y, M_IRON, 2);
    run(top + 6, x0 - 2, x0 + 3, M_IRON, 2);
    for (let r = 0; r < 4; r++) { const x = x0 + (r & 1 ? 2 : -2), y = top + (r & 2 ? 5 : 1); sp(x + 1, y, M_IRON, 1); sp(x, y + 1, M_IRON, 1); sp(x, y, M_IRON, 4); }
    const sy = top + 3 + look;
    for (let x = x0; x <= x0 + 3; x++) {
      const front = x >= x0 + 2;
      if (slit === 0) sp(x, sy, M_INK, 1);
      else if (slit === 4) sp(x, sy, front ? M_GLOW : M_EMBER, front ? 3 : 4);
      else sp(x, sy, M_EMBER, slit + (front ? 1 : 0) > 4 ? 4 : slit + (front ? 1 : 0));
    }
  }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const lean = P.lean, cr = P.crouch, yT = -17 + P.bob + cr, hem = -5 + Math.min(cr, 3), hx0 = lean, mT = yT - 7;
    const dx = Math.sin(P.a), dy = Math.cos(P.a), hs = handSpan(P.a), h2x = Math.round(P.hx - dx * hs), h2y = Math.round(P.hy - dy * hs), f1 = P.hx >= h2x;
    const fX = f1 ? P.hx : h2x, fY = f1 ? P.hy : h2y, bX = f1 ? h2x : P.hx, bY = f1 ? h2y : P.hy;   // 前臂握 x 更靠前的那只手
    const sbx = -4 + lean, sfx = 3 + lean, shy = yT + 2;
    part();                                                     // 背上的骨灰坛：坛口、坛颈、鼓肩、两道皮带、坛口炭火
    const ux = URN_X + lean, uy = yT + URN_Y;
    for (let k = 0; k < 9; k++) { const y = uy + k, s = urnShift(k); run(y, ux + s - UW[k], ux + s + UW[k], M_URN, k === 1 ? 2 : 0); if (k === 3 || k === 6) run(y, ux + s - 2, ux + s + 2, M_URN, 1); }
    sp(ux + urnShift(0), uy, P.gem === 4 ? M_URN : M_EMBER, P.gem === 4 ? 1 : P.gem >= 2 ? 4 : 3);
    part(); seg(sbx, shy, bX, bY, 1.8, M_ROBE);                  // 后臂（粗袖）
    part();                                                     // 裤腿：短、粗
    const fbx = Math.round(P.walk ? -2 + P.step * WALK_STRIDE : 1 + P.step * 1.5), bbx = Math.round(P.walk ? -2 - P.step * WALK_STRIDE : -5 - P.step * 1.5), upF = P.wup === 1 ? 1 : 0, upB = P.wup === 2 ? 1 : 0;   // 走路时两脚绕中线对称交换：第二个接触帧后脚在前
    for (let y = hem; y <= -3 - upB; y++) run(y, bbx, bbx + 2, M_PANTS, 0);
    for (let y = hem; y <= -3 - upF; y++) run(y, fbx, fbx + 2, M_PANTS, 0);
    part();                                                     // 皮靴：前靴铁包头
    rect(bbx, -2 - upB, 4, 3, M_BOOT, 0); sp(bbx + 4, -upB, M_BOOT, 0); run(-upB, bbx, bbx + 4, M_BOOT, 2);
    rect(fbx, -2 - upF, 4, 3, M_BOOT, 0); run(-upF, fbx, fbx + 3, M_BOOT, 2); sp(fbx + 4, -upF, M_IRON, 0); sp(fbx + 4, -1 - upF, M_IRON, 0);
    part();                                                     // 炭灰厚罩袍：方块身形，锯齿烧焦下摆，破洞，褶，斜挎皮带，腰带铁扣
    for (let y = yT; y <= hem; y++) { robeEdges(y, yT, hem, P.sway, lean); if (y < hem) run(y, robeL, robeR, M_ROBE, 0); else for (let x = robeL; x <= robeR; x++) if (x === robeL || x === robeR || (((x - P.sway) % 3) + 3) % 3 !== 0) sp(x, y, M_ROBE, 0); }
    for (let y = yT + 6; y < hem; y++) { const t = (y - yT) / (hem - yT); sp(-3 + Math.round(P.sway * t * t) - Math.round(t), y, M_ROBE, 2); }
    line(-6 + lean, yT + 1, 1 + lean, yT + 7, M_STRAP, 3, 99);  // 背坛皮带
    const by = yT + 9; robeEdges(by, yT, hem, P.sway, lean); run(by, robeL, robeR, M_STRAP, 2); sp(-4 + lean, by, M_IRON, 4);
    sp(-4 + lean, yT + 4, M_ROBE, 1); sp(-3 + lean, yT + 4, M_ROBE, 1); sp(-4 + lean, yT + 5, M_ROBE, 1); sp(-3 + lean, yT + 6, M_ROBE, 4);   // 烧焦破洞
    robeEdges(hem - 2, yT, hem, P.sway, lean); sp(robeL + 2, hem - 2, M_ROBE, 1); sp(robeL + 2, hem - 1, M_ROBE, 1);
    part();                                                     // 皮围裙（暗皮，只有挂脖带一条亮线）：焦痕
    const aB = Math.min(hem + 1, -3);
    for (let y = yT + 3; y <= aB; y++) { const t = (y - yT) / Math.max(1, hem - yT); robeEdges(Math.min(y, hem), yT, hem, P.sway, lean); const x0 = 1 + Math.round(lean * (1 - t)) + Math.round(P.sway * t * t * 0.5); for (let x = x0; x <= robeR; x++) if (!(y === aB && aB > hem && x === x0 + 2)) sp(x, y, M_APRON, 0); }
    line(1 + lean, yT + 3, 0 + lean, yT, M_STRAP, 4, 99);
    sp(3 + lean, yT + 6, M_APRON, 1); sp(4 + lean, yT + 7, M_APRON, 1); sp(2, hem - 1, M_APRON, 1);
    part();                                                     // 腰间铁钳
    const tx = -1 + lean, ty = by + 1;
    sp(tx, ty - 1, M_IRON, 4); line(tx, ty, tx - 1, Math.min(hem + 2, -1), M_IRON, 3, 99); line(tx + 1, ty, tx + 1, Math.min(hem + 2, -1), M_IRON, 2, 99);
    part(); glove(bX, bY, sbx, shy, 0);                           // 后手套：在身体前、铲柄后（和头重叠时被面罩挡住）
    part();                                                     // 兜帽：面罩后面、脖子上的厚领，脑后垂下的帽尾（2 格宽，尖端会摆）
    for (let y = mT + 3; y <= yT; y++) run(y, hx0 - 5, hx0 - 2, M_HOOD, 0);   // 从面罩第 4 行才开始，面罩左上直角露在剪影里
    run(yT, hx0 - 5, hx0 + 3, M_HOOD, 0); run(yT - 1, hx0 - 5, hx0 - 2, M_HOOD, 0);
    for (let k = 0; k < 4; k++) { const x = hx0 - 6 + Math.round(P.beard * (k + 1) / 4), y = mT + 3 + k; sp(x, y, M_HOOD, k === 3 ? 3 : 0); sp(x - 1, y, M_HOOD, k === 3 ? 3 : 0); }
    part(); drawMask(hx0, mT, P.eyes ? 1 : P.slit, P.head > 0 ? 1 : P.head < 0 ? -1 : 0);   // 铁面罩
    part(); drawShovel(P.hx, P.hy, P.a, P.gem, P.pile, P.glint);  // 火铲（发光体嵌在铲里，同一个 part）
    part(); seg(sfx, shy, fX, fY, 2, M_ROBE);                    // 前臂（粗袖）
    part(); glove(fX, fY, sfx, shy, 1);                           // 前手套
  }
  // 化灰：站姿画好后，从脚往上把材质换成炭灰，交界一行是炭火；铁（面罩、铲）、木、陶坛不化
  function ashOver() {
    if (!P.ash) return; const lim = 1 - Math.round(P.ash * 27 / 15);
    for (let by = 0; by < hero.h; by++) { const y = by - hero.oy; if (y < lim) continue; for (let bx = 0; bx < hero.w; bx++) { const i = by * hero.w + bx, m = hero.mat[i]; if (!m || m === M_IRON || m === M_WOOD || m === M_URN || m === M_INK) continue; if (y === lim) { hero.mat[i] = M_EMBER; hero.tone[i] = (bx & 1) ? 3 : 2; } else { hero.mat[i] = M_ASH; hero.tone[i] = 0; } } }
  }
  // 最终姿：一堆灰（高度 = lift），火铲倒在身前，骨灰坛侧倒在灰堆后面，铁面罩掉在灰堆上（hatX / hatY）
  function drawLying() {
    part(); line(-4, 0, 21, 0, M_WOOD, 3, 0); rect(22, -1, 2, 2, M_IRON, 0);   // 火铲倒在身前：长柄 + 铁套口
    for (let y = -3; y <= 0; y++) { sp(24, y, M_IRON, 1); sp(25, y, M_IRON, y === -3 ? 1 : 2); sp(26, y, M_IRON, y === -3 ? 1 : (y & 1) ? 2 : 1); sp(27, y, M_IRON, y === -3 ? 3 : 4); }   // 侧立的铲斗：后沿、熄灭的铲面、刃口高光
    part(); for (let k = 0; k < 9; k++) for (let j = -UW[k]; j <= UW[k]; j++) sp(-16 + k, -2 + j, M_URN, (k === 3 || k === 6) ? 1 : k === 1 ? 2 : 0);   // 侧倒的骨灰坛
    sp(-16, -2, M_URN, 1);
    part(); const H = 4 + P.lift;                                // 灰堆：塌下来后逐渐矮下去
    for (let r = 0; r < H; r++) { const half = Math.max(1, Math.round(8.5 * (1 - Math.pow(r / H, 1.5)))); run(-r, -1 - half, -1 + half, M_ASH, 0); }
    for (let r = 1; r < H - 1; r++) for (let x = -8; x <= 6; x++) if (((x * 5 + r * 3) % 7) === 0) sp(x, -r, M_ASH, 2 + ((x + r) & 1) * 2);
    if (P.gem !== 4) { const tn = P.gem === 2 ? 3 : 2; sp(-5, -1, M_EMBER, tn); sp(2, -1, M_EMBER, tn + 1 > 4 ? 4 : tn + 1); sp(-1, -2, M_EMBER, tn); sp(4, 0, M_EMBER, 2); }
    part(); drawMask(-1 + P.hatX, -H - 5 - P.hatY, 0, 0);       // 熄灭的铁面罩
  }
  function drawHero() { begin(hero, P.bx, P.lying ? 0 : -P.lift); if (P.lying) drawLying(); else { drawStanding(); ashOver(); } }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效 ─────
  // 蓄力时地面炭火定点汇聚到铲头、施放时向外炸开：releaseOrbit 只收环绕粒子，不收定点汇聚粒子，所以这批放在本模块的小池里，施放时逐颗换成引擎的外爆粒子
  const SN = 120, sOn = new Uint8Array(SN), sX = new Float32Array(SN), sY = new Float32Array(SN), sV = new Float32Array(SN), sA = new Float32Array(SN), sR = new Float32Array(SN), sW = new Float32Array(SN), sTX = new Float32Array(SN), sTY = new Float32Array(SN);
  let sHead = 0;
  function sSpawn(tx, ty, v, a, r, w) { let i = sHead; for (let n = 0; n < SN; n++) { const j = (sHead + n) % SN; if (!sOn[j]) { i = j; break; } } sHead = (i + 1) % SN; sOn[i] = 1; sX[i] = tx; sY[i] = ty; sTX[i] = tx; sTY[i] = ty; sV[i] = v; sA[i] = a; sR[i] = r; sW[i] = w; }
  function sStep(dt) { for (let i = 0; i < SN; i++) { if (!sOn[i]) continue; sA[i] += sW[i] * dt; sR[i] -= sV[i] * dt; if (sR[i] <= 3.5) { sOn[i] = 0; continue; } sX[i] = sTX[i] + Math.cos(sA[i]) * sR[i]; sY[i] = sTY[i] + Math.sin(sA[i]) * sR[i] * 0.75; } }
  function sDraw(f12) { for (let i = 0; i < SN; i++) if (sOn[i]) { const s = (i + f12) % 6; put(Math.round(sX[i]), Math.round(sY[i]), s < 1 ? EL[0] : s < 3 ? EL[1] : EL[2]); } }
  let smT = 9, smA0 = 0, smA1 = 0, smCX = 0, smCY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  // ───── 焚尸人专属：燃烧炭块（2×2，受重力）、火苗柱、假人身上的小火苗、坛口黑烟、地平线泛橙 ─────
  const CN = 8, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cX0 = new Float32Array(CN), cY0 = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cE = new Float32Array(CN), cT = new Float32Array(CN), cDum = new Uint8Array(CN);
  const COAL = [[-9, 0.24, 0, 0], [-5, 0.27, 0, 0], [-2, 0.29, 1, -14], [1, 0.32, 1, -20], [3, 0.35, 1, -9], [6, 0.40, 0, 0], [11, 0.45, 0, 0]];   // [落点相对假人 x, 飞行秒数, 落在假人身上?, 落点高度]
  const G_COAL = 360;
  const PLN = 6, plT = new Float32Array(PLN).fill(9), plX = new Int16Array(PLN), plH = new Uint8Array(PLN);
  const DFN = 5, dfT = new Float32Array(DFN).fill(9), dfX = new Int16Array(DFN), dfY = new Int16Array(DFN), dfL = new Float32Array(DFN).fill(1);
  let skyT = 0, smokeAcc = 0, smokeN = 0, ashAcc = 0, dsAcc = 0, dumLit = 0;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;   // 和引擎舞台同一张 4×4 有序抖动表
  const SKY_EMBER = pc(42);
  function fling(x0, y0) {
    dumLit = 0;
    for (let i = 0; i < COAL.length; i++) { const c = COAL[i], tx = DUMMY_X + c[0], ty = c[2] ? HY + c[3] : FLOOR - 1, T = c[1]; cOn[i] = 1; cX0[i] = cX[i] = x0 + (i % 3) - 1; cY0[i] = cY[i] = y0; cVX[i] = (tx - cX0[i]) / T; cVY[i] = (ty - y0 - 0.5 * G_COAL * T * T) / T; cE[i] = 0; cT[i] = T; cDum[i] = c[2]; }
  }
  function pillar(x, h) { let o = 0; for (let k = 0; k < PLN; k++) if (plT[k] > plT[o]) o = k; plT[o] = 0; plX[o] = Math.round(x); plH[o] = h; }
  function dflame(x, y, life) { let o = 0; for (let k = 0; k < DFN; k++) if (dfT[k] - dfL[k] > dfT[o] - dfL[o]) o = k; dfT[o] = 0; dfX[o] = x; dfY[o] = y; dfL[o] = life; }
  function landCoal(i) {
    const x = cX[i], y = cY[i]; burst(x, y, 6, 20, 55, 0.2, 0.4, R_EL, 18); sfx('impact', { pal: 'fire', w: cDum[i] && !dumLit ? 0.8 : 0.4 });
    if (cDum[i]) { dflame(Math.round(x), Math.round(y), 1.0); if (!dumLit) { dumLit = 1; hitDummy(1, 1); shake(0.12, 1); burst(x, y, 10, 40, 100, 0.2, 0.45, R_IMPACT, 14); skyT = 0.8; } }
    else { pillar(x, 3 + (i % 3)); for (let k = 0; k < 2; k++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, FLOOR - 1, (Math.random() - 0.5) * 14, -5 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_DUST); }
  }
  // 施放定格时铲头的屏幕位置（与第 3 节 K_CAST 一致）
  function castBladeX() { return HX + Math.round(K_CAST.hx + Math.sin(K_CAST.a) * BLADE_C); }
  function castBladeY() { return HY + Math.round(K_CAST.hy + Math.cos(K_CAST.a) * BLADE_C); }
  function onEnter(s) {
    if (s === CAST) {                                          // 汇聚到铲头的炭火先向外炸开
      for (let i = 0; i < SN; i++) if (sOn[i]) { const v = 30 + Math.random() * 40; spawn(K_BURST, sX[i], sY[i], Math.cos(sA[i]) * v, Math.sin(sA[i]) * v * 0.75 - 14, 0.25 + Math.random() * 0.3, R_EL); sOn[i] = 0; }
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.76) { const gx = scrX(P.gx); for (let i = 0; i < 2; i++) spawn(K_BURST, gx + i, HY - 1, (i ? 1 : -1) * (10 + Math.random() * 14), -34 - Math.random() * 14, 0.35 + Math.random() * 0.15, R_EL); }   // 铲尖敲地溅两颗火星
    if (s === ATTACK && t === T_FLICK) {                        // 低位横扫：拖影弧（外缘火星）→ 命中火花 + 目标身上一簇小火苗
      smA0 = K_WIND.a; smA1 = K_SWEEP.a; smCX = HX + K_SWEEP.hx + 2; smCY = HY + K_SWEEP.hy; smT = 0;
      for (let i = 0; i < 6; i++) { const a = smA0 + (smA1 - smA0) * (0.25 + i * 0.13), x = smCX + Math.sin(a) * 14.5, y = Math.min(FLOOR - 1, smCY + Math.cos(a) * 14.5 * 0.55 + 1); spawn(K_BURST, x, y, Math.cos(a) * 30 + 10, -Math.sin(a) * 20 - 12, 0.2 + Math.random() * 0.2, R_EL); }
      const hx = DUMMY_X - 4, hy = HY - 12; burst(hx, hy, 10, 40, 100, 0.15, 0.35, R_IMPACT, 10); burst(hx, hy, 6, 25, 60, 0.2, 0.4, R_EL, 16); hitDummy(0, 1); dflame(DUMMY_X - 3, HY - 11, 0.6);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === CAST && t === 1 / 12) {                          // 抡铲定格：扬出 7 块燃烧炭块 + 一团骨灰；震屏 2 格 + 天空闪白
      const x = castBladeX(), y = castBladeY(); fling(x, y); sfx('shoot', { proj: 'fire' });
      burst(x, y, 14, 40, 110, 0.25, 0.6, R_EL, 18);
      for (let i = 0; i < 18; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 4, 8 + Math.random() * 36, -18 - Math.random() * 30, 0.5 + Math.random() * 0.45, R_DUST);
      shake(0.28, 2); flash(0.05);
    }
    if ((s === HURT || s === DEATH) && t === INCOMING) { urnTop(); for (let i = 0; i < 4; i++) spawn(K_BURST, scrX(UMX + P.bx), HY + UMY, -10 - Math.random() * 25, -20 - Math.random() * 25, 0.3 + Math.random() * 0.3, R_EL); }   // 命中火花、震屏、闪白由引擎出；这里补坛口震出的火星
    if (s === DEATH && t === INCOMING + D_ASH1) {             // 塌成一堆灰：骨灰扬起 + 余烬 + 震屏 1 格
      for (let i = 0; i < 22; i++) spawn(K_DUST, scrX(-10 + Math.random() * 18 + P.bx), HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 34, -8 - Math.random() * 20, 0.5 + Math.random() * 0.4, R_DUST);
      for (let i = 0; i < 8; i++) spawn(K_EMBER, scrX(-7 + Math.random() * 12 + P.bx), HY - 2 - Math.random() * 3, Math.random() * 8 - 4, -12 - Math.random() * 12, 0.5 + Math.random() * 0.5, R_EL);
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === INCOMING + D_MASK) { const x = scrX(-1 + P.bx), y = HY - 5; burst(x, y, 5, 25, 55, 0.15, 0.3, R_IMPACT, 12); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, y + 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_DUST); }   // 面罩落在灰堆上
  }
  const EVENTS = [[1.76], [], [T_FLICK], [], [1 / 12], [], [INCOMING], [INCOMING, INCOMING + D_ASH1, INCOMING + D_MASK], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy, dying = state === DEATH && stT > INCOMING + 0.3, stepN = Math.round(E.simT / E.DT);
    // 坛口黑烟：待机细、蓄力越冒越粗并夹带火星、收招变细
    if (!P.lying && !dying && !(state === REVIVE && stT < 0.85)) {
      const rate = state === CHARGE ? 4 + 12 * clamp01(stT / DUR[CHARGE]) : state === CAST ? 16 : state === RECOVER ? 16 - 13 * clamp01(stT / 0.6) : state === MOVE ? 4 : 3;
      smokeAcc += dt * rate;
      while (smokeAcc >= 1) {
        smokeAcc -= 1; smokeN++; urnTop(); const x = scrX(UMX + P.bx), y = HY + UMY, back = P.flip ? 1 : -1;
        if ((state === CHARGE || state === CAST) && smokeN % 3 === 0) spawn(K_EMBER, x, y, back * (2 + Math.random() * 6), -16 - Math.random() * 12, 0.5 + Math.random() * 0.4, R_EL);
        else spawn(K_EMBER, x + (rate > 9 ? Math.round(Math.random() * 2 - 1) : 0), y, back * Math.random() * 5, -8 - Math.random() * 7, 0.9 + Math.random() * 0.6, R_SMOKE);
      }
    }
    // 蓄力：地面的炭火从四周定点汇聚到铲头
    if (state === CHARGE) { chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 9, a = 3.3 + Math.random() * 2.8; sSpawn(gx, gy - 1, (r - 3) / (0.35 + Math.random() * 0.3), a, r, (Math.random() - 0.5) * 2); } }
    // 拖铲步：落脚尘土 + 余烬脚印（0.3 s 走完色阶）+ 铲尖刮地火星
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) {
        const fx = scrX(P.step > 0 ? 3 : -3), tip = scrX(Math.round(P.hx + Math.sin(P.a) * 14)), dir = P.flip ? -1 : 1;
        for (let i = 0; i < 2; i++) spawn(K_DUST, fx + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_DUST);
        spawn(K_TRAIL, fx, FLOOR, 0, 0, 0.3, R_EL); sfx('step', { w: 0.6 });
        for (let i = 0; i < 2; i++) spawn(K_BURST, tip, HY - 1, -dir * (12 + Math.random() * 22), -10 - Math.random() * 16, 0.2 + Math.random() * 0.15, R_EL);
      }
      lastStep = P.step;
    }
    if ((state === IDLE || state === RECOVER) && !P.lying) { emberAcc += dt * (state === IDLE ? 1.2 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 2, Math.random() * 6 - 3, -6 - Math.random() * 8, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH) {
      const d = stT - INCOMING;
      if (d > D_ASH0 && d < D_ASH1) { ashAcc += dt * 14; while (ashAcc >= 1) { ashAcc -= 1; const lim = 1 - Math.round(P.ash * 27 / 15); spawn(K_EMBER, scrX(-6 + Math.random() * 12 + P.bx), HY + lim, Math.random() * 6 - 3, -10 - Math.random() * 8, 0.4 + Math.random() * 0.4, R_EL); } }
      if (d > D_ASH1 + 0.05 && d < D_FADE + 0.6) { emberAcc += dt * 9; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, scrX(-7 + Math.random() * 12 + P.bx), HY - 2 - Math.random() * 3, Math.random() * 6 - 3, -10 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL); } }
      if (d > D_FADE && d < D_FADE + 0.6) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-9 + Math.random() * 16 + P.bx), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); } }
    }
    // 燃烧炭块：抛物线飞行（解析解，每次结果一致），落地 / 落在假人身上
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; cE[i] += dt; const e = Math.min(cE[i], cT[i]);
      cX[i] = cX0[i] + cVX[i] * e; cY[i] = cY0[i] + cVY[i] * e + 0.5 * G_COAL * e * e;
      if ((stepN & 1) === 0) spawn(K_TRAIL, cX[i] - Math.sign(cVX[i]), cY[i], -cVX[i] * 0.2, -(cVY[i] + G_COAL * e) * 0.15, 0.12 + Math.random() * 0.12, R_EL);
      if (cE[i] >= cT[i]) { cOn[i] = 0; landCoal(i); }
    }
    let burning = 0; for (let k = 0; k < DFN; k++) { dfT[k] += dt; if (dfT[k] < dfL[k]) burning = 1; }
    for (let k = 0; k < PLN; k++) plT[k] += dt;
    if (burning) { dsAcc += dt * 12; while (dsAcc >= 1) { dsAcc -= 1; spawn(K_RISE, DUMMY_X + Math.round(Math.random() * 4 - 2), HY - 30, (Math.random() - 0.5) * 4, -8 - Math.random() * 7, 0.8 + Math.random() * 0.5, R_SMOKE); if (Math.random() < 0.3) spawn(K_BURST, DUMMY_X + Math.round(Math.random() * 8 - 4), HY - 12, (Math.random() - 0.5) * 10, 4, 0.3 + Math.random() * 0.2, R_EL); } }
    if (skyT > 0) skyT -= dt;
    sStep(dt); smT += dt;
  }
  const SM_FLAT = 0.55;   // 横扫拖影弧压扁成贴地的月牙（3/4 视角下的水平横扫）
  function fxReset() { smT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; sOn.fill(0); cOn.fill(0); plT.fill(9); dfT.fill(9); dfL.fill(1); skyT = 0; smokeAcc = 0; smokeN = 0; ashAcc = 0; dsAcc = 0; dumLit = 0; }
  function fxBack(f12) {        // 画在角色后面：地平线泛橙、地面映光、火苗柱的焦痕、敌弹映光
    const state = E.state;
    if (skyT > 0) { const dens = 0.36 * Math.min(1, skyT / 0.3); for (let x = 0; x < W; x++) { const ridge = Math.round(69 + 3 * Math.sin(x * 0.07 + 1) + 2 * Math.sin(x * 0.19)); for (let y = ridge; y < FLOOR; y++) if (bayer(x, y) < dens * (y - ridge + 1) / (FLOOR - ridge)) put(x, y, SKY_EMBER); } }   // 远山映出火光：只铺在山脊线以下（那里全是远山色），有序抖动，越近地面越密
    const gx = scrX(P.gx);
    if ((state === CHARGE || state === CAST) && !P.lying) {
      const span = state === CAST ? 12 : 7;
      for (let x = gx - span; x <= gx + span; x++) { const d = Math.abs(x - gx); if (state === CAST ? d < span : ((x + f12) & 1) === 0) put(x, FLOOR, d < 3 ? EL[1] : d < span * 0.6 ? EL[2] : EL[3]); }
      const fx = scrX(P.bx); for (let x = fx - 8; x <= fx + 8; x++) if (((x + f12) & 1) === 1) put(x, FLOOR, Math.abs(x - fx) < 5 ? EL[3] : EL[4]);   // 脚下映光
    } else if (!P.lying && P.gem < 4 && P.gy >= -2) { put(gx, FLOOR, EL[3]); put(gx - 1, FLOOR, EL[4]); put(gx + 1, FLOOR, EL[4]); }
    for (let k = 0; k < PLN; k++) if (plT[k] < 0.7) { const c = plT[k] < 0.35 ? EL[2] : EL[3]; put(plX[k] - 1, FLOOR, c); put(plX[k], FLOOR, plT[k] < 0.35 ? EL[1] : EL[2]); put(plX[k] + 1, FLOOR, c); put(plX[k] + 2, FLOOR, EL[4]); }
    shotFloorGlow(f12);
  }
  function fxMid(f12) {         // 画在假人前、角色后：假人身上的小火苗（逐帧闪烁，最后变暗缩小）
    for (let k = 0; k < DFN; k++) {
      const t = dfT[k]; if (t >= dfL[k]) continue; const x = dfX[k], y = dfY[k], f = f12of(t) + k, o = t / dfL[k] > 0.7 ? 1 : 0;
      put(x - 1, y, EL[3 + o]); put(x, y, EL[1 + o]); put(x + 1, y, EL[2 + o]);
      put(x, y - 1, (f % 3) === 0 && !o ? EL[0] : EL[1 + o]); if (f & 1) put(x + 1, y - 1, EL[2 + o]); else put(x - 1, y - 1, EL[2 + o]);
      put(x + ((f & 1) ? 1 : 0), y - 2, EL[2 + o]); if (!o && (f % 3) !== 2) put(x + ((f & 1) ? 0 : 1), y - 3, EL[3]);
    }
  }
  const EDGE_C = new Uint8Array(256); for (const c of [0, 27, 31, 35]) EDGE_C[pc(c)] = 1;   // 勾线 / 铲沿色：十字光不画在它们上面
  function glowPut(x, y, c) { const X = HX + P.mx, bx = P.flip ? X + hero.ox - x : x - X + hero.ox, by = y - HY + hero.oy; if (bx >= 0 && by >= 0 && bx < hero.w && by < hero.h) { const o = hero.out[by * hero.w + bx]; if (o !== 255 && EDGE_C[o]) return; } put(x, y, c); }
  function fxFront(f12) {       // 画在角色前面：铲头白热十字光、横扫拖影弧、燃烧炭块、火苗柱、汇聚的炭火
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) {   // 铲面白热十字光：臂长 2–3 格，不压铲沿和勾线（铲形保持完整）
      const L = P.gem === 3 ? 3 : 2; if (P.gem === 3 || (f12 & 1)) for (let r = 2; r <= L; r++) { const c = P.gem === 3 ? (r <= 2 ? EL[0] : EL[1]) : EL[1]; glowPut(gx + r, gy, c); glowPut(gx - r, gy, c); glowPut(gx, gy - r, c); if (gy + r < FLOOR) glowPut(gx, gy + r, c); }
    }
    if (smT < 2 / 12) {
      const first = smT < 1 / 12;
      for (let k = 0; k <= 32; k++) {
        if (!first && (k & 1)) continue; const a = smA0 + (smA1 - smA0) * k / 32, sa = Math.sin(a), ca = Math.cos(a);
        if (first) { const x1 = Math.round(smCX + sa * 12.5), y1 = Math.round(smCY + ca * 12.5 * SM_FLAT), x2 = Math.round(smCX + sa * 14), y2 = Math.round(smCY + ca * 14 * SM_FLAT) + 1; if (y1 < FLOOR) put(x1, y1, EL[1]); if (y2 < FLOOR) put(x2, y2, EL[2]); }
        else { const x = Math.round(smCX + sa * 13.5), y = Math.round(smCY + ca * 13.5 * SM_FLAT); if (y < FLOOR) put(x, y, EL[3]); }
      }
    }
    for (let i = 0; i < CN; i++) if (cOn[i]) { const x = Math.round(cX[i]), y = Math.round(cY[i]); put(x, y, ((f12 + i) & 1) ? EL[0] : EL[1]); put(x + 1, y, EL[1]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[3]); }
    for (let k = 0; k < PLN; k++) {
      const t = plT[k]; if (t >= 0.5) continue; const f = f12of(t), x = plX[k], h = plH[k] - ((f & 1) && f > 0 ? 1 : 0), cut = t > 0.2 ? Math.floor((t - 0.2) * 12 * 1.4) + 1 : 0, base = f === 0 ? 0 : Math.min(3, Math.floor(t / 0.5 * 4));
      for (let r = cut; r < h; r++) { const y = FLOOR - 1 - r, lv = f === 0 ? (r < h - 1 ? 0 : 1) : Math.min(4, base + Math.floor(r * 2 / h)); put(x + (r === h - 1 && (f & 1) ? 1 : 0), y, EL[lv]); if (r < 2) put(x + 1, y, EL[Math.min(4, lv + 1)]); }
    }
    sDraw(f12);
  }

  return {
    name: '焚尸人', HX, R_EL, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS,
    // 音效声明：厚罩袍下的肉身、化灰倒塌、炉火元素（fxRamp 自建色阶，必须写 pal）、铲炭蓄力、重铲扬炭（charge / release / hurt / death 由引擎自动发）
    SFX: { body: 'flesh', how: 'dissolve', pal: 'fire', style: 'fire', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
