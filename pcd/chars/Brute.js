// 蛮兵 Brute（敌人 · 野兽 · 普通 · 近战）：前倾猿形 + 过膝长臂指节撑地 + 背脊竖鬃与两根骨刺 + 身后倒拖钉头骨棒 + 短尾后翘；
// 攻击「砸」单手竖向下砸；技能「重击」（特性：攻击减慢目标攻速）双手过顶猛砸，落点方形诅咒符印，假人缠上点阵锁链、下沉、摇晃放慢。
// 从 batch-00-pilot/Brute/Brute.html（按技能模板写的单文件）转成共享引擎模块：画法、姿势、时间线、特效逻辑原样保留。
PCD.define('Brute', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, brush, bake, ease, clamp01, q12, f12of, gait, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_BURST, K_TRAIL, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, shake, flash, hitDummy, dummyFx, put, scrX, shotFloorGlow, sfx } = E;
  const fl = (x) => Math.floor(x + 1e-6);                        // 姿势 / 画法里的取整都带容差（同 q12）

  // ───── 颜色：原版第 1 节末尾追加的 27–43 号，精确同色 ─────
  const XC = ['#240d08', '#4d1d10', '#7c341c', '#a8562f',        // 27–30 锈红褐鬃毛皮（勾线 / 暗 / 基 / 亮）
    '#5a4038', '#8a6a5a',                                         // 31–32 口鼻 / 掌心 / 脚掌 灰褐
    '#4a4036', '#8c7f6c', '#c7b89c', '#ece0c4',                   // 33–36 骨白（骨棒、獠牙、骨刺）
    '#1e2026', '#4a4e58', '#8a909c',                              // 37–39 镣铐 / 铁钉
    '#d8ccf0', '#8a74b8', '#463668', '#1a1228'].map(E.color);     // 40–43 诅咒 淡紫灰 → 灰紫 → 暗紫 → 墨紫
  const oc = (i) => (i < 27 ? i : XC[i - 27]);                   // 原版色板下标 → 本页下标（0–26 与共享色板相同）
  const om = (a) => a.map(oc);

  // ───── 材质、缓冲、姿势 ─────
  // 前倾猿形：驼背短颈、头低于肩线，前臂又长又粗（左手指节撑地），后腿短；背脊一排竖鬃 + 两根骨刺；右手倒拖钉头骨棒；短尾后翘
  const M_FUR = defMat(om([27, 28, 29, 30]), 2), M_LIMB = defMat(om([27, 28, 29, 30]), 1), M_MANE = defMat(om([27, 28, 28, 30]), 1), M_MUZ = defMat(om([27, 31, 32, 7]), 1);
  const M_BONE = defMat(om([33, 34, 35, 36]), 1), M_CLUB = defMat(om([33, 34, 35, 36]), 1), M_IRON = defMat(om([0, 37, 38, 39]), 1), M_EYE = defMat([0, 0, 14, 5], 1, 1);
  const M_INK = defMat([0, 0, 0, 0], 1, 1), M_RUNE = defMat(om([43, 43, 42, 41]), 1, 1), M_RGLOW = defMat(om([42, 41, 40, 21]), 1, 1);
  // 特效色阶：诅咒灰紫（本角色元素）· 诅咒（沉：汇聚粒子只在 2–3 级闪）· 白气 · 毛屑
  const R_CURSE = E.fxRamp('bruteCurse', om([21, 40, 41, 42, 43])), R_HEAVY = E.fxRamp('bruteCurseHeavy', om([40, 41, 41, 42, 43]));
  const R_BREATH = E.fxRamp('bruteBreath', [21, 17, 18, 10, 9]), R_FUR = E.fxRamp('bruteFur', om([30, 30, 29, 28, 27]));
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust, R_SOUL = FXI.soul;
  const R_EL = R_CURSE, EL = FXR[R_EL];                          // 本角色的元素色阶：重击 · 诅咒灰紫（轮廓光、拖影、符印、锁链、滴落粒子都用它）
  const hero = new Sprite(84, 50, 48, 45);                       // 缓冲：脚底 = (48, 45)；左边放得下身后拖着的骨棒和倒地后滚开的骨棒，上边放得下举过头顶的骨棒
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_RUNE] = HERO_RIM.skip[M_RGLOW] = HERO_RIM.skip[M_CLUB] = HERO_RIM.skip[M_IRON] = HERO_RIM.skip[M_EYE] = HERO_RIM.skip[M_INK] = 1;
  const HX = 80, DUR = DEFAULT_DUR.slice();                      // 近战：长臂 + 骨棒，前冲后够到 x=98 的假人
  // 姿势参数（本角色的语义）：hx/hy 右手（握棒）位置 · a 骨棒角度 · bhx/bhy 左手（指节撑地 / 双手握棒时的后手）位置
  //   lean 上身前探 · head 头（-1 抬 / 1 低 / 2 垂）· back 下颚张开 0..2 · bend 背鬃竖起 0..3（倒地时 = 尾巴抬起 0..2）
  //   beard 尾尖摆动 · sway 鬃尖 / 断链摆动 · gem 诅咒纹档位（0 暗 · 1–4 逐格亮起 · 5 全亮 · 6 熄灭）· glint 待机耸肩
  //   hatX/hatY 倒地后骨棒滚开的位移 / 弹起高度 · drag 骨棒拖地（按手高算角度）· cf 骨棒画在最前层
  // 取整后的取值范围（缓存键按此编码，超出会串位）：
  //   hx -32..31 · hy -64..63 · a ±π（π/32 一档）· lean / head -1..2 · back / bend 0..3 · bob / glint / eyes / flash / lying / walk 0..1
  //   bhx -32..31 · bhy -64..63 · beard -3..4 · sway -1..2 · gem 0..7 · rim 0..3 · bx -16..15 · crouch 0..7 · lift 0..7 · hatX -16..15 · hatY 0..15 · step -1..2 · wup 0..3 · dq 0..1
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bhx: 0, bhy: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, drag: 0, cf: 0, k1: 0, k2: 0 };
  const CLEN = 12.5;                                             // 手到棒头着地点的距离：拖棒时按手的高度算角度，让棒头贴着地面
  const dragA = (hy) => -Math.acos(Math.max(-1, Math.min(1, (hy + 1.5) / CLEN)));
  const K_IDLE = { hx: -3, hy: -4, a: dragA(-4), lean: 0, head: 0, back: 0, bend: 1, bhx: 10, bhy: -1 };
  const K_WIND = { hx: 0, hy: -23, a: -0.6, lean: -1, head: -1, back: 1, bend: 2, bhx: 10, bhy: -1 };     // 单手举棒过顶
  const K_SMASH = { hx: 5, hy: -26, a: 2.2, lean: 2, head: 1, back: 2, bend: 2, bhx: 12, bhy: -1 };     // 竖向砸下（命中帧）
  const K_HOLD = { hx: 8, hy: -8, a: 2.25, lean: 2, head: 1, back: 1, bend: 2, bhx: 12, bhy: -1 };      // 棒头砸到假人脚下
  const K_CHARGE = { hx: 0, hy: -22, a: -0.35, lean: -1, head: -1, back: 1, bend: 3, bhx: 1, bhy: -19 };  // 双手高举过头
  const K_CAST = { hx: 7, hy: -8, a: 2.1, lean: 2, head: 1, back: 2, bend: 3, bhx: 4, bhy: -10 };       // 双手过顶猛砸，棒头落地
  const K_CAST2 = { hx: 7, hy: -9, a: 2.0, lean: 1, head: 0, back: 1, bend: 3, bhx: 4, bhy: -10 };
  const K_HURT = { hx: -6, hy: -5, a: dragA(-5), lean: -1, head: -1, back: 1, bend: 2, bhx: 7, bhy: -6 };
  const K_STAG = { hx: -6, hy: -8, a: -2.2, lean: -1, head: 2, back: 1, bend: 0, bhx: 6, bhy: -16 };     // 踉跄半转身：左臂乱抓，骨棒脱手
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'back', 'bend', 'bhx', 'bhy'];
  const mixPose = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const TAIL_IDLE = [0, 1, 0, -1], MANE_IDLE = [0, 1, 0, -1];
  // 指节撑地猿步：接触（前腿在前、左拳撑地）→ 经过（后腿抬起、身体荡过拳头）→ 接触（后腿在前、拳头离地）→ 经过（前腿抬起、拳头往前甩）
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_TAIL = [0, -1, 0, 1], WALK_LEAN = [1, 1, 0, 0];
  const WALK_BHX = [12, 9, 8, 11], WALK_BHY = [-1, -1, -3, -3], WALK_HX = [0, 1, 0, -1], WALK_DIST = 14;
  const GLOW_MATS = [M_RUNE, M_RGLOW], HIT_POINT = [3, -12];     // 发光体材质（棒头诅咒纹）、受击点（胸口）
  const T_FLICK = 2 / 12;
  const LY_CX = -17;                                             // 倒地时骨棒柄端的位置（滚开前）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 0; P.drag = 0; P.cf = 0;   // 诅咒纹平时是暗的，不发光，所以默认没有轮廓光
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); P.drag = 1; const b = fl(TT * 2.5); P.bob = b & 1; P.beard = TAIL_IDLE[(b + 1) & 3]; P.sway = MANE_IDLE[fl(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE];                                  // 待机个性：粗喘耸肩一下、喷鼻息，骨棒在地上来回蹭一下，尾巴一甩
      if (lp >= 1.6 && lp < 1.75) { P.glint = 1; P.bob = 0; P.back = 1; P.hx -= 1; P.beard = 3; }
      else if (lp >= 1.75 && lp < 1.92) { P.hx += 1; P.beard = -2; P.sway = 1; P.gem = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {
      mixPose(K_IDLE, K_IDLE, 0); P.drag = 1; const f = gait(tq);
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_TAIL[f]; P.lean = WALK_LEAN[f];
      P.bhx = WALK_BHX[f]; P.bhy = WALK_BHY[f]; P.hx = K_IDLE.hx + WALK_HX[f];
      // 近战站得离假人近：先转身走开，再走回来（保留原版取整：-round(x)；walkDemo 的 round(-x) 在 x.5 时差 1 格）
      const half = DUR[MOVE] / 2; if (tq < half) { P.flip = 1; P.mx = -Math.round(WALK_DIST * tq / half); } else P.mx = -Math.round(WALK_DIST * (1 - (tq - half) / half));
    }
    else if (st === ATTACK) {
      if (tq < 0.12) { mixPose(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.drag = tq < 0.05 ? 1 : 0; P.cf = tq < 0.05 ? 0 : 1; P.beard = 1; }
      else if (tq < 0.2) { mixPose(K_SMASH, K_SMASH, 0); P.cf = 1; P.bx = 4; P.gem = 2; P.rim = 1; P.sway = 2; P.beard = 4; }
      else if (tq < 0.45) { mixPose(K_SMASH, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.cf = 1; P.bx = 3; P.gem = 1; P.sway = 1; P.beard = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); mixPose(K_HOLD, K_IDLE, q); P.cf = q < 0.55 ? 1 : 0; P.bx = Math.round(3 * (1 - q)); }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q); P.crouch = Math.round(q * 2); P.rim = 2; P.beard = Math.round(q * 3);
      P.gem = tq < 0.3 ? 0 : tq < 0.55 ? 1 : tq < 0.8 ? 2 : tq < 1.05 ? 3 : ((f12 & 1) ? 5 : 4);
      if ((tq >= 0.45 && tq < 0.75) || (tq >= 1.0 && tq < 1.3)) P.back = 2;      // 两声低吼
      P.sway = tq > 0.8 ? ((f12 & 1) ? 1 : -1) : q > 0.4 ? -1 : 0;                   // 断镣叮当晃、背鬃抖
      if (tq < 0.2) P.drag = 1; P.cf = tq < 0.25 ? 0 : 1;
    } else if (st === CAST) {
      if (tq < 0.25) { mixPose(K_CAST, K_CAST, 0); P.gem = 5; P.sway = 2; }         // 砸地定格
      else { mixPose(K_CAST, K_CAST2, ease.out(clamp01((tq - 0.25) / 0.2))); P.gem = 4; P.sway = 1; }
      P.bx = 3; P.crouch = 1; P.rim = 3; P.beard = 3; P.cf = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST2, K_IDLE, q); P.bx = Math.round(3 * (1 - q)); P.crouch = q < 0.5 ? 1 : 0;
      P.gem = q < 0.35 ? 4 : q < 0.75 ? 2 : 0; P.rim = q < 0.5 ? 2 : q < 0.75 ? 1 : 0; P.bob = (f12 >> 1) & 1; P.back = Math.max(1, Math.round(P.back)); P.beard = q < 0.6 ? 2 : 0;
      if (q > 0.95) P.drag = 1; P.cf = q < 0.55 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.drag = 1; P.bx = -2; P.eyes = 1; P.beard = 4; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.drag = 1; P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = 1; P.rim = 0; }
      else { mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.drag = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle();
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.drag = 1; P.bx = -2; P.eyes = 1; P.beard = 4; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { mixPose(K_STAG, K_STAG, 0); P.bx = -3; P.crouch = 2; P.eyes = 1; P.beard = -2; P.sway = 2; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        mixPose(K_IDLE, K_IDLE, 0); P.lying = 1; P.bx = -3; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.66) / 0.35); P.hatX = Math.round(-6 * hq); P.hatY = Math.round(Math.sin(clamp01(hq * 1.6) * Math.PI) * 2);
        P.bend = d < 0.9 ? 2 : d < 1.0 ? 1 : 0;                  // 尾巴最后落下
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 6) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 6) : 6;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 0;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy); P.bhx = Math.round(P.bhx); P.bhy = Math.round(P.bhy);
    if (P.drag) P.a = dragA(P.hy);
    P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.min(2, Math.round(P.back)); P.bend = Math.round(P.bend);
    if (P.lying) { P.gx = LY_CX + P.hatX - 9 + P.bx; P.gy = -2 - P.hatY - P.lift; }
    else { P.gx = Math.round(P.hx + Math.sin(P.a) * 9.5) + P.bx; P.gy = Math.round(P.hy - Math.cos(P.a) * 9.5); }
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.back; k = k * 4 + P.bend; k = k * 2 + P.bob; k = k * 64 + P.bhx + 32; k = k * 128 + P.bhy + 64; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; k = k * 2 + P.cf; P.k2 = k;
  }

  // ───── 部件画法 ─────
  function spc(x, y, m, t) { if (Math.round(y) <= 0) sp(x, y, m, t); }                     // 不画进地面以下
  function brushC(x, y, r, m, t) { x = Math.round(x); y = Math.round(y); const R = Math.ceil(r); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r + 0.35 && y + j <= 0) sp(x + i, y + j, m, t); }
  let EX = 0, EY = 0, WX = 0, WY = 0, WDX = 0, WDY = 1, HCX = 0, HCY = 0;
  const ARM_U = 5.5, ARM_F = 7.5;
  function ik(sx, sy, hx, hy, sgn) {                             // 两段手臂：给定肩和手，求肘（sgn 选肘朝哪边）
    const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, dd = Math.min(d, ARM_U + ARM_F - 0.01);
    const c = (ARM_U * ARM_U + dd * dd - ARM_F * ARM_F) / (2 * ARM_U * dd), an = Math.acos(Math.max(-1, Math.min(1, c))) * sgn, ca = Math.cos(an), sa = Math.sin(an);
    EX = sx + (ux * ca - uy * sa) * ARM_U; EY = sy + (ux * sa + uy * ca) * ARM_U;
  }
  function drawArm(sx, sy, hx, hy, sgn) {                        // 上臂细，前臂又长又粗；记下手腕位置和前臂方向给镣铐用
    ik(sx, sy, hx, hy, sgn);
    for (let s = 0; s <= 1.001; s += 0.125) brushC(sx + (EX - sx) * s, sy + (EY - sy) * s, 1.1, M_LIMB, 0);
    const fx = hx - EX, fy = hy - EY, fl2 = Math.hypot(fx, fy) || 1; WDX = fx / fl2; WDY = fy / fl2;
    for (let s = 0; s <= 1.001; s += 0.1) brushC(EX + fx * s, EY + fy * s, s < 0.65 ? 1.3 + s * 1.1 : 2.0 - (s - 0.65) * 1.4, M_LIMB, 0);
    WX = hx - WDX * 2.2; WY = hy - WDY * 2.2;
  }
  function drawManacle(chain) {                                  // 手腕上的断镣：铁箍 2 行 + 刻着的诅咒纹 + 垂下的断链
    const nx = -WDY, ny = WDX;
    for (let k = -2; k <= 2; k++) for (let j = 0; j <= 1; j++) sp(WX + nx * k - WDX * j, WY + ny * k - WDY * j, M_IRON, 0);
    const lit = P.gem >= 1 && P.gem <= 5; sp(WX - WDX * 0.5, WY - WDY * 0.5, lit ? M_RGLOW : M_RUNE, lit ? 3 : 3);
    if (chain) { const e = ny > 0.05 ? 1 : ny < -0.05 ? -1 : (nx > 0 ? 1 : -1), cx = WX + nx * 2 * e, cy = WY + ny * 2 * e; for (let i = 1; i <= 3; i++) spc(cx + Math.round(P.sway * i * 0.45), cy + i, M_IRON, (i & 1) ? 3 : 2); }
  }
  function drawFist(x, y) { rect(x - 1, y - 1, 3, 3, M_MUZ, 0); sp(x, y, M_MUZ, 2); sp(x + 1, y - 1, M_MUZ, 4); }   // 拳：指缝 + 指节高光
  function drawLeg(hx, hy, fx, up) {                             // 短粗后腿：粗大腿 → 膝 → 小腿 → 宽脚掌 + 趾
    const kx = hx + 1 + P.crouch * 0.4, ky = hy + 2.5 - P.crouch * 0.3 - up;
    for (let s = 0; s <= 1.001; s += 0.2) brush(hx + (kx - hx) * s, hy + (ky - hy) * s, 1.5, M_LIMB, 0);
    for (let s = 0; s <= 1.001; s += 0.25) brush(kx + (fx + 1 - kx) * s, ky + (-2 - up - ky) * s, 1.1, M_LIMB, 0);
    rect(fx, -1 - up, 4, 2, M_MUZ, 0); sp(fx + 4, -up, M_MUZ, 0); sp(fx + 2, -up, M_MUZ, 2);
  }
  function drawTailTo(x, y, tx, ty) {                            // 短粗尾：根粗尖细，尖上一撮深色毛
    for (let s = 0; s <= 1.001; s += 0.2) brushC(x + (tx - x) * s, y + (ty - y) * s, 1.1 - 0.5 * s, M_LIMB, 0);
    const dx = Math.sign(tx - x), dy = Math.sign(ty - y); spc(tx + dx, ty + dy, M_MANE, 0); spc(tx, ty + dy, M_MANE, 0); spc(tx + dx, ty, M_MANE, 3);
  }
  function topY(x, C) { let t = 99; for (let i = 0; i < C.length; i += 3) { const dx = x - C[i], r = C[i + 2]; if (Math.abs(dx) <= r) { const y = C[i + 1] - Math.sqrt(r * r - dx * dx); if (y < t) t = y; } } return Math.round(t); }
  function spike(x, y, h, lean) { for (let k = 0; k < h; k++) { const w = k < 2 ? 2 : 1, xo = -Math.round(k * lean); run(y - k, x + xo, x + xo + w - 1, M_BONE, k === h - 1 ? 4 : 0); } }
  function drawMane(C, x0, x1, dirx, diry, len) {                // 背脊竖鬃（画在身体后面，只露出伸出轮廓的部分）
    for (let x = x0; x <= x1; x += 2) { const y0 = topY(x, C); if (y0 > 90) continue; const L = len - (x === x0 || x >= x1 - 1 ? 1 : 0); for (let k = 0; k <= L; k++) { const px = x + Math.round(dirx * k), py = y0 + 1 + Math.round(diry * k); sp(px, py, M_MANE, k === L ? 4 : 0); if (k <= 1) sp(px + 1, py, M_MANE, 0); } }
  }
  const RUNE_S = [6.5, 8, 9.5, 11], NAIL = [[7, 1], [8.5, -1], [10, 1], [11.5, -1], [14.2, 0]];
  function drawClub(X, Y, a, lv, flipN) {                        // 钉头骨棒：细柄（缠两道）→ 粗骨身 → 骨节棒头；铁钉伸出轮廓；棒身四道诅咒纹
    const dx = Math.sin(a), dy = -Math.cos(a), sg = flipN ? -1 : 1, nx = -dy * sg, ny = dx * sg;
    for (let s = -2; s <= 11.51; s += 0.5) brushC(X + dx * s, Y + dy * s, s < 4.5 ? 0.5 : s < 6 ? 0.9 : s < 10 ? 1.5 : 2.0, M_CLUB, 0);
    spc(X + dx * 2, Y + dy * 2, M_CLUB, 2); spc(X + dx * 3.5, Y + dy * 3.5, M_CLUB, 2);
    for (const [s, side] of NAIL) { const off = side === 0 ? 0 : (s < 10 ? 2.5 : 3) * side; spc(X + dx * s + nx * off, Y + dy * s + ny * off, M_IRON, 3); }
    for (let i = 0; i < 4; i++) {
      let m = M_RUNE, t = 3;
      if (lv === 6) t = 1; else if (lv === 5) { m = M_RGLOW; t = (i & 1) ? 3 : 4; } else if (lv >= 1 && i < lv) { m = M_RGLOW; t = i === lv - 1 ? 4 : 3; } else if (lv === 0 && P.glint) t = 4;
      const s = RUNE_S[i], o = (i & 1) ? 1 : -1; spc(X + dx * s, Y + dy * s, m, t); spc(X + dx * s + nx * o, Y + dy * s + ny * o, m, t === 4 ? 3 : t);
    }
  }
  function headAt() { HCX = 8 + P.lean + (P.head > 0 ? 1 : 0); HCY = -12 + P.bob + P.crouch - P.glint + (P.head < 0 ? -1 : P.head); }
  function drawHead(cx, cy, j, shut) {                           // 头：压低的额、突出的眉骨、豆眼、灰褐口鼻、前突下颚 + 两根上翘獠牙、小耳
    part();
    run(cy - 3, cx - 2, cx + 1, M_LIMB, 0); run(cy - 2, cx - 3, cx + 2, M_LIMB, 0); run(cy - 1, cx - 3, cx + 1, M_LIMB, 0); run(cy, cx - 3, cx + 1, M_LIMB, 0); run(cy + 1, cx - 2, cx + 1, M_LIMB, 0);
    sp(cx - 3, cy - 3, M_LIMB, 3); sp(cx - 2, cy - 4, M_LIMB, 4);                                   // 小耳尖
    run(cy - 2, cx, cx + 3, M_LIMB, 4);                                                             // 眉骨（往前突出 1 格）
    sp(cx + 1, cy - 1, M_LIMB, 1); if (shut) sp(cx + 2, cy - 1, M_LIMB, 1); else sp(cx + 2, cy - 1, M_EYE, 3);   // 眼窝 + 豆眼
    run(cy - 1, cx + 3, cx + 4, M_MUZ, 0); run(cy, cx + 2, cx + 5, M_MUZ, 0); run(cy + 1, cx + 2, cx + 5, M_MUZ, 0);   // 口鼻
    sp(cx + 3, cy - 1, M_MUZ, 4); sp(cx + 5, cy, M_MUZ, 1);                                         // 鼻梁高光、鼻孔
    for (let k = 0; k < j; k++) run(cy + 2 + k, cx + 1, cx + 5, M_INK, 0);                          // 张嘴
    run(cy + 2 + j, cx - 1, cx + 6, M_LIMB, 0); run(cy + 3 + j, cx, cx + 5, M_LIMB, 2);             // 前突下颚
    if (!j) { sp(cx + 2, cy + 2, M_LIMB, 1); sp(cx + 3, cy + 2, M_LIMB, 1); }                        // 嘴缝
    part();                                                      // 獠牙：从下颚往上翘，近的一根伸出轮廓
    sp(cx + 6, cy + 1 + j, M_BONE, 0); sp(cx + 6, cy + j, M_BONE, 0); sp(cx + 6, cy - 1 + j, M_BONE, 4); sp(cx + 4, cy + 1 + j, M_BONE, 3);
  }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const ux = P.lean, uy = P.bob + P.crouch - P.glint, cr = P.crouch >> 1;
    const rX = -5, rY = -9 + cr, wX = -1.5 + ux * 0.4, wY = -10.5 + (uy + cr) * 0.5, cX = 2 + ux, cY = -14 + uy;
    const C = [rX, rY, 3.6, wX, wY, 4.2, cX, cY, 5];
    headAt();
    part(); drawTailTo(rX - 3, rY - 1, rX - 8 + P.beard * 0.7, rY - 5 - Math.abs(P.beard) * 0.3 + (P.beard < 0 ? 1 : 0));   // 短尾后翘
    part(); drawArm(2 + ux, cY - 1, P.hx, P.hy, 1);              // 远侧手臂：握棒（拖棒 / 单手砸 / 双手握棒的前手）
    if (!P.cf) { part(); drawClub(P.hx, P.hy, P.a, P.gem, 0); }  // 拖在身后的骨棒：在腿和身体后面
    part(); drawManacle(0);
    part(); drawFist(P.hx, P.hy);
    part(); drawLeg(-6, rY + 3, -9 - P.step * 2, P.wup === 2 ? 1 : 0);   // 远侧后腿
    part(); drawLeg(-3, rY + 3, -4 + P.step * 2, P.wup === 1 ? 1 : 0);   // 近侧后腿
    part();                                                      // 背鬃 + 两根骨刺（在身体后面冒出来）
    drawMane(C, Math.round(rX - 2), Math.round(cX + 3), -0.55 + P.sway * 0.22, -1, 3 + P.bend);
    const s1 = Math.round(rX + 1), s2 = Math.round(cX - 1); spike(s1, topY(s1, C) + 1, 5, 0.4); spike(s2, topY(s2, C) + 1, 6, 0.35);
    part();                                                      // 躯干：臀 + 腰 + 隆起的肩背，毛纹
    brush(rX, rY, 3.6, M_FUR, 0); brush(wX, wY, 4.2, M_FUR, 0); brush(cX, cY, 5, M_FUR, 0);
    const FS = [[cX - 3, cY - 2], [cX - 2, cY - 1], [cX, cY - 3], [cX + 1, cY + 1], [cX + 2, cY + 2], [wX - 2, wY - 1], [wX - 1, wY], [rX, rY - 1], [rX + 1, rY]];
    for (const [x, y] of FS) sp(x, y, M_FUR, 2);
    part(); drawArm(4 + ux, cY + 1, P.bhx, P.bhy, 1);            // 近侧长臂：指节撑地的柱子（在头后面、身体前面）
    part(); drawManacle(1);
    drawHead(HCX, HCY, P.back, P.eyes);
    if (P.cf) { part(); drawClub(P.hx, P.hy, P.a, P.gem, 0); }   // 抡起 / 砸下的骨棒：在最前面
    part(); drawFist(P.bhx, P.bhy);
  }
  // 倒地姿：侧倒，头枕在伸出的长臂上；骨棒脱手滚到身后；尾巴最后落地
  function drawLying() {
    part(); drawClub(LY_CX + P.hatX, -2 - P.hatY, -Math.PI / 2, P.gem, (P.hatX & 1) !== 0);
    part(); const tt = P.bend >= 2 ? [-13, -9] : P.bend === 1 ? [-15, -6] : [-16, -1]; drawTailTo(-10, -4, tt[0], tt[1]);
    part(); for (let s = 0; s <= 1.001; s += 0.25) brushC(-8 + (-11 + 8) * s, -3 + (-3 + 3) * s, 1.4, M_LIMB, 0); rect(-14, -3, 2, 3, M_MUZ, 0); sp(-14, -2, M_MUZ, 2);
    part(); for (let s = 0; s <= 1.001; s += 0.25) brushC(-6 + (-10 + 6) * s, -2 + (-1 + 2) * s, 1.3, M_LIMB, 0); rect(-13, -1, 3, 2, M_MUZ, 0); sp(-12, 0, M_MUZ, 2);
    const C = [-7, -3.5, 3.4, -3, -4, 3.8, 2, -4.5, 4.2];
    part(); drawMane(C, -9, 4, -0.9, -0.5, 2); spike(-3, topY(-3, C) + 1, 3, 0.7); spike(1, topY(1, C) + 1, 4, 0.6);
    part(); brushC(-7, -3.5, 3.4, M_FUR, 0); brushC(-3, -4, 3.8, M_FUR, 0); brushC(2, -4.5, 4.2, M_FUR, 0);
    sp(-4, -5, M_FUR, 2); sp(-3, -4, M_FUR, 2); sp(1, -6, M_FUR, 2); sp(2, -5, M_FUR, 2); sp(-8, -4, M_FUR, 2);
    part();                                                      // 伸在地上的长臂（头枕在上面）
    for (let s = 0; s <= 1.001; s += 0.125) brushC(4 + 5 * s, -4 + 1.5 * s, 1.1, M_LIMB, 0);
    for (let s = 0; s <= 1.001; s += 0.1) brushC(9 + 6 * s, -2.5 + 1 * s, 1.3 + s * 0.5, M_LIMB, 0);
    WX = 13; WY = -2; WDX = 1; WDY = 0; part(); drawManacle(0); spc(14, 0, M_IRON, 3); spc(15, 0, M_IRON, 2); spc(16, 0, M_IRON, 3);
    part(); rect(15, -2, 3, 2, M_MUZ, 0); sp(18, -1, M_MUZ, 2); sp(17, -2, M_MUZ, 4);   // 摊开的手掌
    drawHead(8, -6, 1, 1);
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效 ─────
  // 滴落颗粒：只受重力往下沉、落地留一点，出生时寿命已走过 q0（以第 3–5 级为主）。引擎粒子池没有这种粒子（自定义重力 + 贴地 + 初始年龄），
  // 先在模块里单独管理，画在角色前面；引擎支持后改回 spawn。
  const DN = 160, drX = new Float32Array(DN), drY = new Float32Array(DN), drVX = new Float32Array(DN), drVY = new Float32Array(DN), drAge = new Float32Array(DN), drLife = new Float32Array(DN), drOn = new Uint8Array(DN);
  let drHead = 0;
  function drip(x, y, vx, vy, life, q0) {
    let i = drHead; for (let n = 0; n < DN; n++) { const j = (drHead + n) % DN; if (!drOn[j]) { i = j; break; } }
    drHead = (i + 1) % DN; drOn[i] = 1; drX[i] = x; drY[i] = y; drVX[i] = vx; drVY[i] = vy; drLife[i] = life; drAge[i] = life * q0;
  }
  function stepDrips(dt) {
    for (let i = 0; i < DN; i++) {
      if (!drOn[i]) continue; drAge[i] += dt; if (drAge[i] >= drLife[i]) { drOn[i] = 0; continue; }
      drVY[i] += 120 * dt; drX[i] += drVX[i] * dt; drY[i] += drVY[i] * dt;
      if (drY[i] > FLOOR) { drY[i] = FLOOR; drVY[i] = 0; drVX[i] = 0; }   // 落地后留一小点，走完色阶
    }
  }
  function drawDrips() { for (let i = 0; i < DN; i++) if (drOn[i]) { const q = drAge[i] / drLife[i]; put(Math.round(drX[i]), Math.round(drY[i]), EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]); } }
  // 竖弧拖影（攻击 / 施放）：沿棒头轨迹画弧，第 1 帧 2 格宽亮，第 2 帧 1 格断续暗
  let smT = 9, smCX = 0, smCY = 0, smA0 = 0, smA1 = 0, smR0 = 0, smR1 = 0;
  function setSmear(K0, bx0, K1, bx1, pvx, pvy) {
    const t0x = K0.hx + bx0 + Math.sin(K0.a) * 12 - pvx, t0y = K0.hy - Math.cos(K0.a) * 12 - pvy, t1x = K1.hx + bx1 + Math.sin(K1.a) * 12 - pvx, t1y = K1.hy - Math.cos(K1.a) * 12 - pvy;
    smCX = HX + pvx; smCY = HY + pvy; smA0 = Math.atan2(t0x, -t0y); smA1 = Math.atan2(t1x, -t1y); smR0 = Math.hypot(t0x, t0y); smR1 = Math.hypot(t1x, t1y); smT = 0;
  }
  // 小符点（攻击命中）：3×3 空心方块，往下沉并走完色阶
  const GN = 4, glX = new Float32Array(GN), glY = new Float32Array(GN), glT = new Float32Array(GN).fill(9);
  function glyph(x, y) { let o = 0; for (let k = 0; k < GN; k++) if (glT[k] > glT[o]) o = k; glX[o] = x; glY[o] = y; glT[o] = 0; }
  // 方形诅咒符印（施放落点）、假人身上的点阵锁链（技能命中；假人下沉、摇晃放慢交给 dummyFx）
  const SG_LIFE = 1.0, CH_LIFE = 1.1, WOB_B = [3, -2, 2, -1, 1, 0];
  let sgT = 9, sgX = 0, chT = 9, chargeAcc = 0, chargeN = 0, dripAcc = 0, chDripAcc = 0, soulAcc = 0, lastStep = 0;
  function puff(n, big, mouth) {                                 // 鼻孔 / 嘴里喷白气（往前下方喷，牛一样打响鼻）
    headAt(); const d = P.flip ? -1 : 1, x = scrX(HCX + 6 + P.bx), y = HY + HCY + (mouth ? 2 + P.back : 0);
    for (let i = 0; i < n; i++) spawn(K_TRAIL, x + d * Math.random() * 1.5, y + 1 + Math.round(Math.random()), d * (5 + Math.random() * (big ? 16 : 9)), 5 + Math.random() * (big ? 12 : 7), 0.35 + Math.random() * (big ? 0.45 : 0.25), R_BREATH);
  }
  function scrape(n) {                                           // 骨棒刮地扬尘
    const x = scrX(P.hx + P.bx + Math.sin(P.a) * 12.5), d = P.flip ? -1 : 1;
    for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY, -d * (6 + Math.random() * 14), -3 - Math.random() * 6, 0.3 + Math.random() * 0.25, R_DUST);
  }
  function onEnter(s) {
    if (s === CHARGE) chargeN = 0;
    else if (s === CAST) {                                       // 双手过顶猛砸：棒头落地炸出方形符印 + 扬尘 12 + 蓄的诅咒外爆 + 震屏 2 + 天空闪白
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx);
      releaseOrbit(0, 0, 0, 0);                                  // 蓄的诅咒粒子从落点往上溅起：先让汇聚 / 环绕的粒子当场消失，再在落点按原数量溅起
      for (let i = 0; i < chargeN; i++) { const v = 40 + Math.random() * 50, an = Math.random() * 3.1416; spawn(K_BURST, gx + (Math.random() - 0.5) * 4, FLOOR - 2, Math.cos(an) * v, -Math.sin(an) * v * 0.9, 0.4 + Math.random() * 0.4, R_HEAVY); }
      chargeN = 0;
      burst(gx, FLOOR - 2, 16, 50, 120, 0.3, 0.7, R_EL, 40);
      for (let i = 0; i < 12; i++) spawn(K_DUST, gx - 9 + Math.random() * 18, FLOOR - 1, (Math.random() - 0.5) * 50, -10 - Math.random() * 22, 0.4 + Math.random() * 0.4, R_DUST);
      sgT = 0; sgX = Math.round(gx);
      setSmear(K_CHARGE, 0, K_CAST, 3, 8, -13); shake(0.28, 2); flash(0.05);
      sfx('impact', { pal: 'curse', w: 0.9 });
    }
  }
  function onTime(s, t) {
    if (s === IDLE) { if (t === 1.67) { puff(5, 1, 0); scrape(3); } else if (t === 1.83) scrape(2); else puff(2, 0, 0); }
    if (s === ATTACK && t === T_FLICK) {                         // 竖向下砸命中：竖弧拖影 + impact 火花 + 假人小摇
      setSmear(K_WIND, 0, K_SMASH, 4, 5, -16);
      burst(DUMMY_X - 3, HY - 18, 8, 40, 90, 0.15, 0.35, R_IMPACT, 10); hitDummy(0, 1);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'wood', w: 0.7 });
    }
    if (s === ATTACK && t === 0.25) {                            // 棒头砸到地上：尘土 + 2 颗灰紫小符点
      const x = scrX(P.hx + P.bx + Math.sin(P.a) * 11);
      for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 36, -6 - Math.random() * 12, 0.3 + Math.random() * 0.3, R_DUST);
      glyph(DUMMY_X - 3, HY - 17); glyph(DUMMY_X + 2, HY - 11);
    }
    if (s === CHARGE) puff(4, 1, 1);                             // 低吼：嘴里喷白气
    if (s === CAST && t === 0.12) {                              // 命中：假人缠上两圈锁链并下沉 1 格，摇晃放慢一半；20 impact + 10 灰紫外爆；震屏 1
      chT = 0; hitDummy(1, 1); dummyFx({ dur: CH_LIFE, slow: 0.5, sink: 1 });
      burst(DUMMY_X - 2, HY - 14, 20, 50, 130, 0.25, 0.55, R_IMPACT, 20); burst(DUMMY_X, HY - 14, 10, 40, 90, 0.35, 0.7, R_EL, 0); shake(0.12, 1);
      sfx('impact', { pal: 'curse', w: 0.6 });
    }
    if (s === RECOVER) puff(3, 0, 1);                            // 收招喘气
    if ((s === HURT || s === DEATH) && t === INCOMING) {         // 引擎已放 impact 火花 + 震屏（死亡加闪白）；这里加毛屑
      const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1]; burst(hx, hy, s === DEATH ? 8 : 5, 30, 70, 0.3, 0.6, R_FUR, 10);
    }
    if (s === DEATH && t === INCOMING + 0.2) scrape(3);          // 骨棒脱手
    if (s === DEATH && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) { const x = HX - 16 + Math.random() * 30; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); } shake(0.1, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.04) { const x = HX - 19; for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_DUST); }   // 尾巴拍地
  }
  const EVENTS = [[0.4, 1.2, 1.67, 1.83, 2.0], [], [T_FLICK, 0.25], [0.5, 1.05], [0.12], [0.2, 0.45], [INCOMING], [INCOMING, INCOMING + 0.2, INCOMING + 0.66, INCOMING + 1.04], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      const q = clamp01(stT / DUR[CHARGE]);
      chargeAcc += dt * (7 + 15 * q); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.5 + Math.random() * 0.4), 0, 9, R_HEAVY, a, r, 3 + Math.random() * 2); chargeN++; }
      if (stT > 0.3) { dripAcc += dt * (10 + 26 * q); while (dripAcc >= 1) { dripAcc -= 1; drip(gx + Math.round(Math.random() * 6 - 3), gy + 1 + Math.random() * 3, (Math.random() - 0.5) * 3, 4 + Math.random() * 8, 1.1 + Math.random() * 0.4, 0.3); } }
    }
    if (state === RECOVER && stT < 0.45) { dripAcc += dt * 10; while (dripAcc >= 1) { dripAcc -= 1; drip(gx + Math.round(Math.random() * 2 - 1), gy + 1, 0, 3, 0.8, 0.45); } }
    if (chT < 0.8) { chDripAcc += dt * 22; while (chDripAcc >= 1) { chDripAcc -= 1; const lx = Math.round(Math.random() * 12 - 6), ly = Math.random() < 0.5 ? -15 : -9; drip(DUMMY_X + lx, HY + 1 + ly, 0, 5 + Math.random() * 6, 0.7 + Math.random() * 0.4, 0.3); } }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { const fx = P.step > 0 ? 0 : -6; for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(fx) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_DUST); scrape(2); sfx('step', { w: 0.7 }); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); } }
    stepDrips(dt);
    smT += dt; sgT += dt; chT += dt; for (let i = 0; i < GN; i++) glT[i] += dt;
  }
  function fxReset() { glT.fill(9); drOn.fill(0); smT = 9; sgT = 9; chT = 9; chargeAcc = 0; chargeN = 0; dripAcc = 0; chDripAcc = 0; soulAcc = 0; lastStep = 0; }
  function dither(x, y, dq) { return dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq; }
  function drawSigil(f12) {                                      // 方形诅咒符印：地面上的点阵方框（近宽远窄）+ 中心十字 + 四角亮点
    const t = sgT, cx = sgX, y0 = FLOOR, y1 = FLOOR + 4, ym = FLOOR + 2, hw = t < 1 / 12 ? 4 : t < 2 / 12 ? 7 : 9;
    const cF = t < 1 / 12 ? EL[0] : t < 0.25 ? EL[1] : t < 0.55 ? EL[2] : t < 0.8 ? EL[3] : EL[4], cC = t < 0.25 ? EL[0] : t < 0.55 ? EL[1] : t < 0.8 ? EL[2] : EL[3];
    const dq = t < 0.7 ? 0 : (t - 0.7) / 0.3, ph = (f12 >> 1) & 1, solid = t < 2 / 12;
    const pp = (x, y, c) => { if (!dither(x, y, dq)) put(x, y, c); };
    for (let y = y0; y <= y1; y++) { const w = hw + Math.round((y - y0) * 0.5); if (y === y0 || y === y1) { for (let x = cx - w; x <= cx + w; x++) if (solid || ((x + ph) & 1) === 0) pp(x, y, cF); } else { pp(cx - w, y, cF); pp(cx + w, y, cF); } }
    for (let x = cx - 3; x <= cx + 3; x++) pp(x, ym, cC); pp(cx, ym - 1, cC); pp(cx, ym + 1, cC);
    pp(cx - hw, y0, cC); pp(cx + hw, y0, cC); pp(cx - hw - 2, y1, cC); pp(cx + hw + 2, y1, cC);
  }
  function fxBack(f12) {        // 画在角色后面：蓄力时地上的诅咒污点、施放落点的方形符印、敌弹经过的地面映光
    if (E.state === CHARGE && E.stT > 0.3) { const cx = scrX(P.gx), span = 1 + Math.round(6 * clamp01((E.stT - 0.3) / 1.1)); for (let x = cx - span; x <= cx + span; x++) if (((x + f12) & 1) === 0) put(x, FLOOR, Math.abs(x - cx) <= (span >> 1) ? EL[3] : EL[4]); }
    if (sgT < SG_LIFE) drawSigil(f12);
    shotFloorGlow(f12);
  }
  function fxMid(f12) {         // 画在假人前、角色后：被诅咒的假人身上两圈点阵锁链（跟着 dummyFx 的下沉和放慢的摇晃）
    if (chT >= CH_LIFE) return;
    const qd = chT / CH_LIFE, sk = Math.round(qd < 0.15 ? qd / 0.15 : qd > 0.8 ? (1 - qd) / 0.2 : 1);
    const df = Math.floor(chT * 12 * 0.5), wob = df < WOB_B.length ? WOB_B[df] : 0, dk = df < 3 ? 1 : 0;
    const t = chT, rx0 = t < 0.1 ? 12 - 50 * t : 7, dq = t < 0.8 ? 0 : (t - 0.8) / (CH_LIFE - 0.8);
    const at = (lx, ly, c) => { const X = DUMMY_X + lx + dk + Math.round(wob * -ly / 26), Y = HY + sk + ly; if (!dither(X, Y, dq)) put(X, Y, c); };
    for (const [ly, sc] of [[-17, 1], [-11, 0.85]]) {
      const rx = rx0 * sc, R = Math.round(rx);
      for (let lx = -R; lx <= R; lx++) {
        const yy = ly + Math.round(2 * Math.sqrt(Math.max(0, 1 - (lx / rx) * (lx / rx)))), link = (lx + 30) % 3;   // 链环 2 格高：亮环 · 暗环 · 墨色接缝
        const hi = t < 0.06 ? EL[0] : t > 0.6 ? EL[3] : EL[2], lo = t < 0.06 ? EL[1] : t > 0.6 ? EL[4] : EL[3];
        if (link === 2) at(lx, yy, EL[4]); else { at(lx, yy, link === 0 ? hi : lo); at(lx, yy + 1, link === 0 ? lo : EL[4]); }
      }
      at(-R - 1, ly - 1, EL[3]); at(R + 1, ly - 1, EL[3]);
    }
    for (let k = 1; k <= 3; k++) at(Math.round(rx0 * 0.85) + (k > 1 ? 1 : 0), -11 + k, k & 1 ? EL[2] : EL[4]);   // 垂下的锁链头
  }
  function fxFront(f12) {       // 画在角色前面：竖弧拖影、小符点、蓄满时棒头的斜十字闪、滴落颗粒
    if (smT < 2 / 12) {
      const first = smT < 1 / 12, n = Math.ceil(Math.abs(smA1 - smA0) * Math.max(smR0, smR1));
      for (let k = 0; k <= n; k++) { if (!first && (k & 1)) continue; const q = k / n, an = smA0 + (smA1 - smA0) * q, r = smR0 + (smR1 - smR0) * q, x = Math.round(smCX + Math.sin(an) * r), y = Math.round(smCY - Math.cos(an) * r); if (y > FLOOR - 1) continue; put(x, y, first ? (q > 0.6 ? EL[0] : EL[1]) : EL[2]); if (first) { const x2 = Math.round(smCX + Math.sin(an) * (r - 1)), y2 = Math.round(smCY - Math.cos(an) * (r - 1)); if (y2 <= FLOOR - 1) put(x2, y2, q > 0.6 ? EL[1] : EL[2]); } }
    }
    for (let i = 0; i < GN; i++) { const t = glT[i]; if (t >= 0.6) continue; const x = Math.round(glX[i]), y = Math.round(glY[i]) + Math.floor(t / 0.12), c = t < 0.1 ? EL[1] : t < 0.3 ? EL[2] : t < 0.45 ? EL[3] : EL[4]; for (let j = -1; j <= 1; j++) { put(x + j, y - 1, c); put(x + j, y + 1, c); } put(x - 1, y, c); put(x + 1, y, c); if (t < 0.1) put(x, y, EL[0]); }
    if (E.state === CHARGE && P.gem >= 4) { const tx = scrX(P.hx + Math.sin(P.a) * 13.5), ty = HY + Math.round(P.hy - Math.cos(P.a) * 13.5), L = P.gem === 5 ? 3 : 2; for (let r = 2; r <= L; r++) { const c = r === 2 ? EL[1] : EL[2]; put(tx + r, ty - r, c); put(tx - r, ty - r, c); put(tx + r, ty + r, c); put(tx - r, ty + r, c); } }
    drawDrips();
  }

  return {
    name: '蛮兵', HX, R_EL, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'curse', style: 'spiral', w: 0.9 },   // 野兽皮毛身体、侧倒；诅咒灰紫、蓄力螺旋汇聚到棒头、双手猛砸很重
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
