// 守夜人（近战领袖 · 英雄）：宽檐平顶帽、竖在肩后的长戟、身前带笼灯的圆顶塔盾、及膝斗篷；近战直刺；技能「灯盾猛击」；场外「照夜」（按 7）。
// 由 batch-00-pilot/watchman/watchman.html 转成共享引擎模块：第 3 节（角色）画法、姿势、时间线原样保留，第 4 节（特效）改用引擎的粒子 / 震屏 / 闪白 / 假人。
PCD.define('watchman', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, mix, q12, f12of, gait, walkDemo, color, fxRamp, FXR, FXI, B8, W, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_BURST, K_EMBER, K_RISE, K_DUST,
    spawn, burst, shake, flash, hitDummy, dummyFx, put, scrX, shotFloorGlow, sfx } = E;

  // ───── 颜色：0–26 与共享色板相同；原版追加的 27–39 用 pc(原下标) 取本页下标 ─────
  const OWN = ['#0e130b', '#1f2a16', '#36472a', '#56693b',     // 27–30 夜巡斗篷 墨橄榄绿（勾线 / 暗 / 基 / 亮）
    '#15161c', '#2e3038', '#4e525c', '#7c8290',                 // 31–34 灯盾铁（勾线 / 暗 / 基 / 亮）
    '#8a5a1e',                                                  // 35 暗铜（黄铜镶边暗部，亮部借 14 金）
    '#fff2a0', '#ffcf4a', '#c8701e', '#4a2410'].map(color);     // 36–39 照夜琥珀灯火：烛黄 → 琥珀 → 焦橙 → 暗褐
  const pc = (i) => (i < 27 ? i : OWN[i - 27]), mat = (a, band, flat) => defMat(a.map(pc), band, flat);
  const R_EL = fxRamp('amber', [21, 36, 37, 38, 39].map(pc)), EL = FXR[R_EL];   // 照夜 · 琥珀灯火
  const R_FILL = fxRamp('amberFill', [EL[1], EL[1], EL[1], EL[1], EL[1]]);     // 被照到的第 1 帧：假人整片烛黄

  // ───── 材质、缓冲、姿势 ─────
  // 材质 [勾线, 暗, 基, 亮]：斗篷 / 短披肩 = 墨橄榄绿，外套暗一档；帽、靴 = 黑毡；灯盾 = 铁 + 黄铜镶边；灯罩 = 琥珀灯火（发光体）
  const M_CLOAK = mat([27, 28, 29, 30], 2), M_CAPE = mat([27, 28, 29, 30], 1), M_COAT = mat([27, 28, 28, 29], 1);
  const M_SKIN = mat([20, 16, 15, 15], 1), M_HAIR = mat([0, 20, 20, 19], 1), M_EYE = mat([0, 6, 36, 21], 1, 1);
  const M_HAT = mat([0, 8, 9, 10], 1), M_BOOT = mat([0, 8, 9, 10], 1), M_PANTS = mat([0, 20, 19, 19], 1), M_LEATHER = mat([0, 20, 19, 16], 1);
  const M_IRON = mat([31, 32, 33, 34], 1), M_BRASS = mat([20, 35, 14, 5], 1), M_RIM = mat([20, 35, 35, 14], 1), M_STEEL = mat([31, 33, 34, 17], 1), M_WOOD = mat([0, 20, 19, 16], 1);
  const M_LAMP = mat([39, 38, 37, 36], 1, 1), M_LGLOW = mat([36, 36, 21, 21], 1, 1);
  const HX = 78, DUR = DEFAULT_DUR.slice();                      // 近战：前冲 4 格后矛尖到 x=98
  const hero = new Sprite(80, 52, 50, 47);                       // 缓冲：脚底 = (50, 47)；放得下举过头顶的盾、后收的长戟、倒地后滚远的帽子
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_LAMP] = HERO_RIM.skip[M_LGLOW] = HERO_RIM.skip[M_WOOD] = HERO_RIM.skip[M_EYE] = 1;
  // 姿势参数（取整后的取值范围，缓存键按此编码）：
  //   hx -32..31 · hy -64..63 · a ±π（π/32 一档）· lean / head -1..2 · crouch 0..7（≥4 = 单膝跪）· bob 0..1 · hmode 0..2 · sx -8..7 · sy -32..31（灯盾相对默认位置的偏移）
  //   sway -1..2（斗篷下摆）· bend 0..3（下摆被吹向后）· beard -3..4（钥匙串摆）· gem 0..7（灯档）· glint / door 0..1 · rim 0..3 · bx -16..15 · eyes 0..3（1 闭 2 反光）
  //   flash 0..1 · step -1..2 · wup 0..3 · lying 0..1 · lift 0..7 · hatX -16..15 · hatY 0..15 · hatR 0..1（倒扣）· halB 0..3（倒地长戟弹起）· dq 0..1
  //   hmode 1 = 放开长戟（戟杆插地），双手持盾；hmode 2 = 跪地时前手按在立地的盾沿上
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, crouch: 0, bob: 0, hmode: 0, sx: 0, sy: 0, sway: 0, bend: 0, beard: 0, gem: 0, glint: 0, door: 0, rim: 0, gx: 0, gy: 0, bx: 0, eyes: 0, flash: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, hatR: 0, halB: 0, dq: 0, ddir: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const HALF = Math.PI / 2;
  // 关键帧：后手（握戟）位置 hx/hy、戟角 a、前倾、头、下蹲、灯盾偏移 sx/sy
  const K_IDLE = { hx: -9, hy: -16, a: 0, lean: 0, head: 0, crouch: 0, sx: 0, sy: 0 };
  const K_WIND = { hx: -9, hy: -17, a: HALF, lean: -1, head: 0, crouch: 1, sx: -1, sy: 0 };
  const K_STRIKE = { hx: -2, hy: -18, a: HALF, lean: 1, head: 1, crouch: 0, sx: 1, sy: 2 };
  const K_HOLD = { hx: -3, hy: -18, a: HALF, lean: 1, head: 1, crouch: 0, sx: 1, sy: 2 };
  const K_CHARGE = { hx: -9, hy: -16, a: 0, lean: 0, head: 0, crouch: 0, sx: -4, sy: -23 };
  const K_CAST = { hx: -9, hy: -16, a: 0, lean: 1, head: 1, crouch: 3, sx: 3, sy: 4 };
  const K_HURT = { hx: -10, hy: -15, a: -0.1, lean: -1, head: -1, crouch: 0, sx: -1, sy: 1 };
  const K_KNEEL = { hx: -7, hy: -10, a: -0.3, lean: 1, head: 1, crouch: 5, sx: 2, sy: 2 };
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch', 'sx', 'sy'];
  const mixPose = (A, B, q) => mix(P, A, B, q, FIELDS);
  const KEY_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_KEY = [0, -1, 0, 1], WALK_DIST = 14;   // 行军步：接触 → 经过 → 接触 → 经过
  const T_FLICK = 2 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.halB = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0;
    P.bob = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.rim = 1; P.hmode = 0; P.door = 0;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = KEY_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                  // 待机个性：举灯张望——盾抬 1 格让灯照向前方，头先向后转、再向前转；灯火两次摇曳
      if (lp >= 1.24 && lp < 2.16) { P.sy = -1; P.sx = 1; }
      if (lp >= 1.41 && lp < 1.74) P.head = -1; else if (lp >= 1.74 && lp < 2.08) P.head = 1;
      if ((lp >= 0.58 && lp < 0.66) || (lp >= 1.83 && lp < 1.91)) P.glint = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 行军步：盾始终在身前，前脚落地时盾前晃 1 格，戟杆反向晃
      mixPose(K_IDLE, K_IDLE, 0); const f = gait(tq);
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_KEY[f];
      P.a = -P.step * ASTEP; P.hx = K_IDLE.hx + P.step * 0.6; P.sx = P.step > 0 ? 1 : 0; P.glint = f & 1;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    }
    else if (st === ATTACK) {                                   // 戟后收 1 帧 → 前冲 4 格直刺定格 → 延续 → 收回
      if (tq < 0.12) { const q = ease.out(tq / 0.12); mixPose(K_IDLE, K_WIND, q); P.bx = q > 0.5 ? -1 : 0; P.sway = q > 0.5 ? 1 : 0; }
      else if (tq < 0.2) { mixPose(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.step = 1; P.sway = -1; P.beard = -2; P.bend = 1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); mixPose(K_STRIKE, K_HOLD, q); P.bx = 4 - q; P.step = 1; P.sway = -1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); mixPose(K_HOLD, K_IDLE, q); P.bx = 3 * (1 - q); P.step = q < 0.5 ? 1 : 0; P.beard = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                 // 放开长戟（插地），双手把灯盾举过头顶；灯 0 → 2；眼睛反光；下摆被吹向后
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q); P.hmode = 1;
      P.bend = Math.round(q * 2) + (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = tq > 1.1 ? ((f12 & 1) ? -1 : 0) : 0; P.beard = q > 0.5 ? -1 : 0;
      P.gem = tq < 0.25 ? 0 : tq < 0.6 ? 1 : tq < 1.0 ? ((f12 & 1) ? 2 : 1) : 2; P.rim = 2; P.eyes = tq >= 0.6 ? 2 : 0;
      if (tq > 1.15) P.sy -= 1;                                  // 最后几帧再往上一举：砸下前的预备
    } else if (st === CAST) {                                   // 盾底猛砸地面，定格；灯门弹开
      mixPose(K_CAST, K_CAST, 0); P.hmode = 1; P.gem = 3; P.rim = 3; P.door = 1; P.eyes = 2;
      if (tq < 1 / 12) { P.sway = 2; P.beard = 2; } else if (tq < 0.25) { P.sway = 1; P.beard = -1; } else { P.crouch = 2; P.beard = 0; }
    } else if (st === RECOVER) {                                // 抬盾回到身前，重新握住长戟；灯 2 → 1 → 0
      const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q); P.crouch = Math.min(P.crouch, 2);
      P.hmode = q < 0.55 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.door = q < 0.2 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatY = 1; P.glint = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                  // 跪倒：踉跄 → 单膝跪地、以盾拄地 → 灯火闪 3 次熄灭 → 侧歪仰倒 → 帽子滚落、长戟弹一下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatY = 1; P.flash = d < 1 / 12 ? 1 : 0; if (d >= 0.1) { P.crouch = 1; P.bx = -3; P.hatY = 0; } P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.28) { mixPose(K_HURT, K_KNEEL, 0.5); P.crouch = 2; P.bx = -3; P.eyes = 1; P.beard = 1; P.sway = 1; P.gem = 1; }
      else if (d < 0.7) { mixPose(K_KNEEL, K_KNEEL, 0); P.hmode = 2; P.bx = -3; P.eyes = 1; P.sway = 0; const k = Math.floor((d - 0.28) * 12 + 1e-6); P.gem = [2, 4, 2, 4, 1, 4][Math.min(5, k)]; P.beard = k < 2 ? -1 : 0; }
      else {
        mixPose(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -3; P.eyes = 1; P.gem = 4;
        if (d < 0.78) { P.lift = 3; P.hatX = -1; P.hatY = 5; P.hatR = 1; }
        else if (d < 0.86) { P.lift = 1; P.hatX = -2; P.hatY = 3; }
        else { const hq = clamp01((d - 0.86) / 0.42); P.hatX = Math.round(-3 - 5 * hq); P.hatY = Math.round(Math.abs(Math.sin(hq * Math.PI * 2)) * 2.4 * (1 - hq)); P.hatR = hq < 1 ? (Math.floor(d * 12 + 1e-6) & 1) : 0; P.halB = d < 0.9 ? 0 : d < 0.98 ? 2 : d < 1.06 ? 1 : 0; }
        if (d >= 1.7) P.dq = clamp01((d - 1.7) / 0.75);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 1 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.crouch = Math.round(P.crouch); P.sx = Math.round(P.sx); P.sy = Math.round(P.sy); P.bx = Math.round(P.bx);
    if (P.lying) { P.gx = 13 + P.bx; P.gy = -5 - P.lift; }
    else { P.gx = 3 + P.sx + P.lean + 6 + P.bx; P.gy = -18 + P.crouch + P.bob + P.sy + 6; }   // 灯罩中心 = 盾左上 + (6, 6)
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 8 + P.crouch; k = k * 2 + P.bob; k = k * 4 + P.hmode; k = k * 16 + P.sx + 8; k = k * 64 + P.sy + 32; P.k1 = k;
    k = P.sway + 1; k = k * 4 + P.bend; k = k * 8 + P.beard + 3; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 2 + P.door; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 4 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 2 + P.hatR; k = k * 4 + P.halB; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }

  // ───── 画：部件工具 ─────
  function limb(x0, y0, x1, y1, r, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; brush(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, r, m, 0); } }
  function glove(x, y) { rect(x - 1, y - 1, 2, 2, M_LEATHER, 0); sp(x - 1, y - 1, M_LEATHER, 4); }
  // 长戟：u 沿杆（手 → 矛尖为正），v 垂直于杆（竖直时向右为正）；戟头的像素按 u / v 摆，整 90° 时无损
  let hbX = 0, hbY = 0, hbDX = 0, hbDY = 0, hbVX = 0, hbVY = 0;
  function hp(u, v, m, t) { const y = hbY + hbDY * u + hbVY * v; if (Math.round(y) <= 0) sp(hbX + hbDX * u + hbVX * v, y, m, t); }
  function drawHalberd(hx, hy, a) {
    hbX = hx; hbY = hy; hbDX = Math.sin(a); hbDY = -Math.cos(a); hbVX = Math.cos(a); hbVY = Math.sin(a);
    part(); line(hx - hbDX * 15, hy - hbDY * 15, hx + hbDX * 10, hy + hbDY * 10, M_WOOD, 3, 0);                                   // 木杆
    part();
    hp(11, 0, M_IRON, 0); hp(12, 0, M_IRON, 0); hp(11, -1, M_IRON, 0); hp(11, -2, M_IRON, 2);                                        // 銎 + 后刺
    hp(8, 2, M_STEEL, 0); hp(9, 1, M_STEEL, 0); hp(9, 2, M_STEEL, 0); hp(10, 1, M_STEEL, 0); hp(11, 1, M_STEEL, 0); hp(11, 2, M_STEEL, 0); hp(12, 2, M_STEEL, 4);   // 小月牙刃（两角朝外）
    hp(13, 0, M_STEEL, 0); for (let u = 14; u <= 15; u++) for (let v = -1; v <= 1; v++) hp(u, v, M_STEEL, 0); hp(16, 0, M_STEEL, 0); hp(17, 0, M_STEEL, 0); hp(18, 0, M_STEEL, 4);   // 叶形矛尖
  }
  // 灯盾：7×12 圆顶塔盾（黄铜镶边 + 铁面 + 铆钉）；笼灯 5×6 嵌在盾心偏前，灯罩凸出盾面 2 格
  const SHR = [2, 4, 1, 5, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 0, 6, 1, 5];
  function drawShield(X, Y) {
    part();
    for (let r = 0; r < 12; r++) { const a = SHR[r * 2], b = SHR[r * 2 + 1]; for (let c = a; c <= b; c++) sp(X + c, Y + r, r === 0 || r === 11 || c === a || c === b ? M_RIM : M_IRON, 0); }
    sp(X + 1, Y + 2, M_BRASS, 3); sp(X + 1, Y + 9, M_BRASS, 3); sp(X + 3, Y + 1, M_BRASS, 3);                                      // 铆钉
    sp(X + 2, Y + 3, M_IRON, 4); sp(X + 2, Y + 4, M_IRON, 4); sp(X + 2, Y + 6, M_IRON, 2); sp(X + 2, Y + 7, M_IRON, 2);             // 铁面上的冷光 / 凹痕
  }
  const LAMP_PX = [5, 5, 6, 5, 7, 5, 5, 6, 6, 6, 7, 6, 5, 7, 6, 7, 7, 7];   // 灯罩 3×3：角 / 边 / 芯
  const LAMP_LV = [                                             // 每格 [材质, 色调]；十字形的亮芯 = 火苗，四角暗一档
    [M_LAMP, 2, M_LAMP, 3, M_LAMP, 2, M_LAMP, 3, M_LAMP, 4, M_LAMP, 3, M_LAMP, 2, M_LAMP, 3, M_LAMP, 2],             // 0 待机微亮
    [M_LAMP, 3, M_LAMP, 4, M_LAMP, 3, M_LAMP, 4, M_LGLOW, 3, M_LAMP, 4, M_LAMP, 3, M_LAMP, 4, M_LAMP, 3],            // 1 蓄力
    [M_LAMP, 4, M_LGLOW, 1, M_LAMP, 4, M_LGLOW, 1, M_LGLOW, 3, M_LGLOW, 1, M_LAMP, 4, M_LGLOW, 1, M_LAMP, 4],        // 2 蓄满（白热芯）
    [M_LGLOW, 1, M_LGLOW, 3, M_LGLOW, 1, M_LGLOW, 3, M_LGLOW, 3, M_LGLOW, 3, M_LGLOW, 1, M_LGLOW, 3, M_LGLOW, 1],    // 3 施放（整罩白热）
    [M_LAMP, 1, M_LAMP, 1, M_LAMP, 1, M_LAMP, 1, M_LAMP, 2, M_LAMP, 1, M_LAMP, 1, M_LAMP, 1, M_LAMP, 1],             // 4 熄灭
  ];
  function drawLantern(X, Y) {
    part();
    run(Y + 3, X + 5, X + 7, M_IRON, 0); run(Y + 4, X + 4, X + 8, M_IRON, 0); run(Y + 8, X + 4, X + 8, M_IRON, 0); sp(X + 6, Y + 2, M_BRASS, 0);   // 灯帽、灯座、提环
    for (let y = Y + 5; y <= Y + 7; y++) { sp(X + 4, y, M_IRON, 0); if (P.door) sp(X + 8, y, M_LGLOW, 1); else sp(X + 8, y, M_IRON, 0); }             // 两侧铁框（灯门弹开时前框变成漏出的光）
    const lv = LAMP_LV[P.gem]; for (let i = 0; i < 9; i++) sp(X + LAMP_PX[i * 2], Y + LAMP_PX[i * 2 + 1], lv[i * 2], lv[i * 2 + 1]);
    if (P.glint && P.gem < 3) { sp(X + 5, Y + 6, M_LAMP, 4); sp(X + 6, Y + 6, M_LAMP, 3); sp(X + 5, Y + 5, M_LAMP, 4); sp(X + 6, Y + 7, M_LAMP, 2); }   // 摇曳：火苗往后上方一歪
    if (P.door) { sp(X + 9, Y + 4, M_IRON, 0); sp(X + 10, Y + 4, M_IRON, 0); sp(X + 10, Y + 3, M_IRON, 4); }                                   // 弹开的灯门
  }
  // 斗篷后片：从肩后垂到膝，下摆外张；开衩把下摆分成两片，随步伐 / 受力摆动
  function drawCloak(yS, cr, L) {
    const top = yS + 1, hem = Math.min(-1, -6 + cr), span = Math.max(1, hem - top);
    for (let y = top; y <= hem; y++) {
      const t = (y - top) / span, s = P.sway * t * t;
      const xR = Math.round(-1 + L * (1 - t) + s * 0.5), xL = Math.round(-5 + L * (1 - t) - 3.4 * Math.pow(t, 1.1) + s - P.bend * t * 1.4);
      run(y, xL, xR, M_CLOAK, 0);
      if (y >= hem - 2) { const cx = Math.round(xL + 3 + s * 0.5); sp(cx, y, 0, 0); if (y === hem) { sp(cx + 1, y, 0, 0); sp(xL, y, 0, 0); } }   // 开衩 + 下摆角
    }
    for (let y = top + 4; y <= hem - 2; y++) { const t = (y - top) / span; sp(Math.round(-4 + L * (1 - t) - 1.8 * t + P.sway * t * t - P.bend * t * 0.6), y, M_CLOAK, 2); }   // 一道竖褶
  }
  function legCol(hx_, hy_, fx, up, kn) {
    const yb = -up; let c = fx;
    for (let y = hy_; y <= yb; y++) { const t = (y - hy_) / Math.max(1, yb - hy_); c = Math.round(hx_ + (fx - hx_) * t + kn * Math.sin(t * Math.PI)); const boot = y >= yb - 5; run(y, c - 1, c + 1, boot ? M_BOOT : M_PANTS, 0); if (y === yb - 5) sp(c + 2, y, M_BOOT, 4); }
    sp(c + 2, yb, M_BOOT, 0); sp(c + 2, yb - 1, M_BOOT, 0);   // 靴尖
  }
  function drawLegs(yB, cr) {
    const hipY = yB + 1;
    if (cr >= 4) {                                              // 单膝跪：后腿膝盖着地、小腿贴地向后；前腿大腿水平、小腿竖直
      part(); for (let y = hipY; y <= 0; y++) run(y, -3, -1, M_PANTS, 0); run(-1, -7, -4, M_BOOT, 0); run(0, -8, -4, M_BOOT, 0); sp(-4, -2, M_BOOT, 4);
      part(); for (let y = hipY; y <= hipY + 2; y++) run(y, 0, 4, M_PANTS, 0); for (let y = hipY + 3; y <= 0; y++) run(y, 3, 5, M_BOOT, 0); sp(6, hipY + 3, M_BOOT, 4); sp(6, 0, M_BOOT, 0); sp(6, -1, M_BOOT, 0);
      return;
    }
    const kn = cr * 0.9, ff = P.step > 0 ? 3 : P.step < 0 ? -4 : 1, bf = P.step > 0 ? -4 : P.step < 0 ? 3 : -2;   // 接触帧两脚前后分开 7 格（哪只在前交替），经过帧收回站位
    part(); legCol(-2, hipY, bf, P.wup === 2 ? 1 : 0, kn);
    part(); legCol(1, hipY, ff, P.wup === 1 ? 1 : 0, kn);
  }
  function drawHat(cx, by, down) {                              // 宽檐平顶帽：12 格平直帽檐 + 平顶帽身 + 皮帽带 + 铜帽徽；down = 倒扣
    if (!down) { run(by, cx - 5, cx + 6, M_HAT, 0); run(by - 1, cx - 2, cx + 3, M_LEATHER, 2); run(by - 2, cx - 2, cx + 3, M_HAT, 0); run(by - 3, cx - 2, cx + 3, M_HAT, 0); sp(cx + 2, by - 1, M_BRASS, 4); }
    else { run(by, cx - 2, cx + 3, M_HAT, 0); run(by - 1, cx - 2, cx + 3, M_HAT, 0); run(by - 2, cx - 2, cx + 3, M_LEATHER, 2); run(by - 3, cx - 5, cx + 6, M_HAT, 0); sp(cx - 1, by - 2, M_BRASS, 4); }
  }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const L = P.lean, cr = P.crouch, bb = P.bob;
    const yS = -20 + cr + bb, yB = -12 + cr + bb, fy = yS - 5, hx0 = L + P.head;
    const SX = 3 + P.sx + L, SY = -18 + cr + bb + P.sy;           // 灯盾左上角
    const two = P.hmode === 1, thrust = !two && P.a > 0.8;
    const fsx = 2 + L, fsy = yS + 2, bsx = -3 + L, bsy = yS + 2;   // 前肩 / 后肩
    const over = two && SY < -26, prop = P.hmode === 2;
    let bhx = P.hx, bhy = P.hy, fhx = SX + 2, fhy = SY + 5;
    if (two) { const lo = over ? 10 : 1; bhx = SX - 1; bhy = SY + lo; fhx = SX + 7; fhy = SY + lo; }   // 双手持盾：举过头顶握下沿两侧，砸地时握上沿两侧
    if (prop) { fhx = SX + 3; fhy = SY; }                                                              // 跪地：前手按在盾顶
    part(); drawCloak(yS, cr, L);                                // 斗篷后片
    if (!thrust) { drawHalberd(P.hx, P.hy, P.a); part(); if (over) { limb(bsx, bsy, bsx - 2, bsy - 6, 1, M_COAT); limb(bsx - 2, bsy - 6, bhx, bhy, 1, M_COAT); } else limb(bsx, bsy, bhx, bhy, 1, M_COAT); if (!two) { part(); glove(bhx, bhy); } }   // 长戟竖在肩后 + 后臂握杆中段（举盾时后臂绕到头后）
    drawLegs(yB, cr);                                            // 后腿 → 前腿
    part();                                                     // 外套：躯干 + 短下摆 + 交叉皮带 + 铜扣 + 腰带
    for (let y = yS + 1; y <= yB + 2; y++) { const t = (y - yS) / (yB + 2 - yS), sh = Math.round(L * (1 - t)), sk = y > yB ? 1 : 0; run(y, -4 + sh - sk, 3 + sh, M_COAT, 0); }
    line(-3 + L, yS + 3, 1, yB - 1, M_LEATHER, 3, 99); line(2 + L, yS + 3, -2, yB - 1, M_LEATHER, 3, 99);
    const my = Math.round((yS + 3 + yB - 1) / 2); sp(-1 + (L > 0 ? 1 : 0), my, M_BRASS, 4); sp(0 + (L > 0 ? 1 : 0), my, M_BRASS, 3);
    run(yB, -4, 3, M_LEATHER, 0); sp(0, yB, M_BRASS, 4); sp(1, yB, M_BRASS, 3);
    sp(2, yB + 2, M_COAT, 2);
    part();                                                     // 铜钥匙串：环 + 两把钥匙，尖端随动作摆
    const kx = -3, ky = yB + 1; sp(kx, ky, M_BRASS, 4); sp(kx - 1, ky + 1, M_BRASS, 0); sp(kx + 1, ky + 1, M_BRASS, 0);
    line(kx - 1, ky + 2, kx - 1 + P.beard * 0.5, ky + 4, M_BRASS, 3, 99); line(kx + 1, ky + 2, kx + 1 + P.beard * 0.5, ky + 3, M_BRASS, 2, 99);
    part();                                                     // 头：帽檐阴影压住上半脸，只露出两点反光的眼睛；鼻、髭、胡茬、耳、脑后发
    for (let y = fy; y <= fy + 4; y++) run(y, hx0 - 2 + (y === fy + 4 ? 1 : 0), hx0 + 3 - (y === fy + 4 ? 1 : 0), M_SKIN, 0);
    run(fy, hx0 - 1, hx0 + 3, M_SKIN, 1); run(fy + 1, hx0 - 1, hx0 + 3, M_SKIN, 1);
    for (let y = fy; y <= fy + 3; y++) sp(hx0 - 2, y, M_HAIR, 0); sp(hx0 - 1, fy + 3, M_HAIR, 0); sp(hx0 - 1, fy + 2, M_SKIN, 2);
    const ex = P.head < 0 ? -1 : P.head > 0 ? 1 : 0;
    if (P.eyes !== 1) { sp(hx0 + 2 + ex, fy + 1, M_EYE, P.eyes === 2 ? 4 : 3); sp(hx0 + ex, fy + 1, M_EYE, P.eyes === 2 ? 3 : 2); }
    if (P.head >= 0) sp(hx0 + 4, fy + 2, M_SKIN, 3);
    run(fy + 3, hx0 + 1, hx0 + 3, M_HAIR, 0); sp(hx0 + 1, fy + 4, M_SKIN, 2); sp(hx0 - 1, fy + 4, M_SKIN, 2);
    part();                                                     // 短披肩：领口 + 铜领扣 + 锯齿下摆
    run(yS, -3 + L, 2 + L, M_CAPE, 0); run(yS + 1, -5 + L, 4 + L, M_CAPE, 0); run(yS + 2, -6 + L - (P.bend > 1 ? 1 : 0), 5 + L, M_CAPE, 0); run(yS + 3, -6 + L - (P.bend > 0 ? 1 : 0), 5 + L, M_CAPE, 0);
    for (let x = -6 + L; x <= 5 + L; x++) if (((x - P.sway + 30) % 3) === 0) sp(x, yS + 4, M_CAPE, 2);
    sp(2 + L, yS, M_BRASS, 4); sp(-1 + L, yS + 2, M_CAPE, 2); sp(-2 + L, yS + 3, M_CAPE, 2);
    part(); drawHat(hx0, fy - 1 - P.hatY, 0);                    // 宽檐平顶帽
    part(); if (over) { limb(fsx + 2, fsy, fsx + 4, fsy - 6, 1, M_COAT); limb(fsx + 4, fsy - 6, fhx, fhy, 1, M_COAT); } else limb(fsx, fsy, fhx, fhy, 1, M_COAT);   // 前臂（袖）：握盾后把手 / 举盾时肘向外绕开脸 / 跪地按盾
    if (thrust) { drawHalberd(P.hx, P.hy, P.a); part(); limb(bsx, bsy, bhx, bhy, 1, M_COAT); part(); glove(bhx, bhy); }   // 直刺：戟从盾顶一侧刺出
    drawShield(SX, SY); drawLantern(SX, SY);                     // 灯盾 + 笼灯（发光体）
    if (two) { part(); glove(bhx, bhy); glove(fhx, fhy); } else if (prop) { part(); glove(fhx, fhy); }
  }
  // 倒地姿：侧歪后仰、屈膝躺倒（头在左）；长戟倒在身后、戟头朝左；灯盾面朝上倒在前方，灯已熄；帽子滚到一边
  function drawLying() {
    const d = P.halB * ASTEP, a = -HALF + d; drawHalberd(-8 - Math.cos(d) * 15, -1 - Math.sin(d) * 15, a);
    part(); run(0, -15, 0, M_CLOAK, 0); run(-1, -17, -3, M_CLOAK, 0); sp(-18, 0, M_CLOAK, 0); sp(-8, 0, 0, 0); sp(-11, -1, M_CLOAK, 2);                 // 斗篷铺在身下
    part(); limb(-2, -2, 2, -6, 1, M_PANTS); limb(2, -6, 5, -2, 1, M_BOOT); rect(5, -1, 2, 1, M_BOOT, 0);                                                 // 后腿（屈膝）
    part(); limb(-1, -3, 3, -7, 1, M_PANTS); limb(3, -7, 6, -3, 1, M_BOOT); rect(6, -2, 2, 2, M_BOOT, 0); sp(4, -8, M_BOOT, 4);                         // 前腿
    part();                                                     // 躯干（外套）+ 腰带 + 交叉皮带
    for (let y = -5; y <= -1; y++) run(y, -10, -2, M_COAT, 0); for (let y = -5; y <= -1; y++) sp(-3, y, M_LEATHER, 0); sp(-3, -3, M_BRASS, 4);
    line(-9, -5, -5, -1, M_LEATHER, 3, 99); line(-9, -1, -5, -5, M_LEATHER, 3, 99); sp(-7, -3, M_BRASS, 4);
    part(); sp(-2, 0, M_BRASS, 4); sp(-1, 0, M_BRASS, 3); sp(0, -1, M_BRASS, 0);                                                                     // 摊开的钥匙
    part(); run(-6, -12, -10, M_CAPE, 0); for (let y = -5; y <= -1; y++) run(y, -13, -10, M_CAPE, 0); sp(-10, -6, M_BRASS, 4); sp(-9, -6, M_CAPE, 2);   // 短披肩
    part(); limb(-9, -6, -5, -8, 1, M_COAT); sp(-4, -9, M_LEATHER, 0); sp(-4, -8, M_LEATHER, 0);                                                     // 搭在胸前的手
    part();                                                     // 仰面的头：闭眼、鼻朝上、髭
    for (let y = -5; y <= -1; y++) run(y, -18, -14, M_SKIN, 0); for (let y = -5; y <= -1; y++) sp(-18, y, M_HAIR, 0); run(-1, -17, -15, M_HAIR, 0);
    sp(-16, -5, M_SKIN, 1); sp(-15, -5, M_SKIN, 1); sp(-15, -6, M_SKIN, 3); sp(-14, -5, M_HAIR, 0); sp(-14, -4, M_HAIR, 0); sp(-17, -3, M_SKIN, 2);
    drawLyingShield(); drawLyingHat();
  }
  function drawLyingShield() {                                   // 面朝上倒下的灯盾（整 90° 旋转）：盾身 3 行厚、两端圆，笼灯朝上凸出（已熄）
    part(); run(-2, 9, 18, M_RIM, 0); run(-1, 8, 19, M_IRON, 0); run(0, 9, 18, M_RIM, 0); sp(8, -1, M_RIM, 0); sp(19, -1, M_RIM, 0); sp(10, -1, M_BRASS, 3); sp(17, -1, M_BRASS, 3);
    part(); run(-3, 11, 15, M_IRON, 0); run(-7, 11, 15, M_IRON, 0); run(-8, 12, 14, M_IRON, 0); sp(13, -9, M_BRASS, 0);
    for (let y = -6; y <= -4; y++) { sp(11, y, M_IRON, 0); sp(15, y, M_IRON, 0); for (let x = 12; x <= 14; x++) sp(x, y, M_LAMP, x === 13 && y === -5 ? 2 : 1); }
  }
  function drawLyingHat() { part(); drawHat(-18 + P.hatX, -P.hatY, P.hatR); }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效：照夜 · 琥珀灯火 ─────
  // 直刺拖影（水平直线）、砸地扁椭圆光环、灯位光柱、假人定格（琥珀剪影 + 转星）、场外照夜（按 7）
  let smT = 9, smX0 = 0, smX1 = 0, smY = 0;
  let grT = 9, grX = 0, grY = 0, colT = 9, colX = 0, colY = 0, frzT = 9, frzOn = 0, frzHit = 0, starT = 9;
  let ofT = 9, ofFrz = 9, ofHit = 0, dumMode = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  const GR_LIFE = 0.42, grRX = (t) => 3 + 95 * t;                  // 砸地光环：横半径随时间扩大，纵半径 = 横半径 × 0.22（贴地的扁椭圆）
  const LAMP_CAST_X = HX + 3 + K_CAST.sx + K_CAST.lean + 6, LAMP_CAST_Y = HY - 18 + K_CAST.crouch + K_CAST.sy + 6;   // 砸地时灯的位置
  const LAMP_KNEEL_X = HX - 3 + 3 + K_KNEEL.sx + K_KNEEL.lean + 6, LAMP_KNEEL_Y = HY - 18 + K_KNEEL.crouch + K_KNEEL.sy + 6;
  // 蓄力光点：沿 8 个固定方向直线向灯汇聚（不是螺旋），离灯越近越亮。引擎没有这种粒子，模块自己管一个小池子，施放时交给引擎变成外爆粒子
  const RAYN = 128, rOn = new Uint8Array(RAYN), rX = new Float32Array(RAYN), rY = new Float32Array(RAYN), rA = new Float32Array(RAYN), rR = new Float32Array(RAYN), rV = new Float32Array(RAYN), rR0 = new Float32Array(RAYN), rQ = new Float32Array(RAYN);
  let rHead = 0;
  function rayIn(a, r, v) { let i = rHead; for (let n = 0; n < RAYN; n++) { const j = (rHead + n) % RAYN; if (!rOn[j]) { i = j; break; } } rHead = (i + 1) % RAYN; rOn[i] = 1; rA[i] = a; rR[i] = r; rV[i] = v; rR0[i] = r; }
  function onEnter(s) {
    if (s === CAST) {                                           // 盾底砸地：汇聚光点外爆 + 24 颗琥珀 + 扬尘；贴地光环；灯位光柱；震屏 2 格；天空闪白
      for (let i = 0; i < RAYN; i++) if (rOn[i]) { const v = 45 + Math.random() * 55; spawn(K_BURST, rX[i], rY[i], Math.cos(rA[i]) * v, Math.sin(rA[i]) * v * 0.75 - 10, 0.3 + Math.random() * 0.35, R_EL); rOn[i] = 0; }
      burst(LAMP_CAST_X, LAMP_CAST_Y, 24, 60, 140, 0.3, 0.7, R_EL, 16);
      for (let i = 0; i < 8; i++) spawn(K_DUST, LAMP_CAST_X - 6 + Math.random() * 12, HY, (Math.random() - 0.5) * 50, -8 - Math.random() * 14, 0.35 + Math.random() * 0.3, FXI.dust);
      grT = 0; grX = LAMP_CAST_X; grY = HY; colT = 0; colX = LAMP_CAST_X; colY = LAMP_CAST_Y - 3; frzOn = 0; frzHit = 0; frzT = 9; starT = 9;
      shake(0.28, 2); flash(0.05);
      sfx('impact', { pal: 'fire', w: 0.9 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                        // 直刺出手帧：水平直线拖影；出手即命中：impact 7 颗 + 2 颗琥珀光点，假人小摇
      const tipW = HX - 1 + K_WIND.hx + 18, tipS = HX + 4 + K_STRIKE.hx + 18;
      smT = 0; smX0 = tipW; smX1 = tipS - 5; smY = HY + K_STRIKE.hy;
      hitDummy(0, 1); burst(tipS, smY, 7, 40, 100, 0.15, 0.35, FXI.impact, 10);
      for (let i = 0; i < 2; i++) spawn(K_BURST, tipS - 1, smY - 1 + i * 2, 25 + Math.random() * 25, (i ? 1 : -1) * (12 + Math.random() * 12), 0.45 + Math.random() * 0.2, R_EL);
      sfx('swing', { kind: 'thrust', w: 0.55 }); sfx('hit', { mat: 'metal', w: 0.55 });
    }
    if (s === DEATH && t === INCOMING + 0.28) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 5 + Math.random() * 4, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }   // 膝盖着地
    if (s === DEATH && t === INCOMING + 0.7) { for (let i = 0; i < 4; i++) spawn(K_EMBER, LAMP_KNEEL_X + Math.random() * 2 - 1, LAMP_KNEEL_Y - 3, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.8 + Math.random() * 0.5, FXI.dust); }   // 灯熄的一缕烟
    if (s === DEATH && t === INCOMING + 0.86) { for (let i = 0; i < 16; i++) { const x = HX - 24 + Math.random() * 32; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); } shake(0.1, 1); sfx('fall', { w: 0.6 }); }
  }
  const EVENTS = [[], [], [T_FLICK], [], [], [], [], [INCOMING + 0.28, INCOMING + 0.7, INCOMING + 0.86], []];
  // 假人被琥珀光罩住：第 1 帧整片烛黄，之后按原色亮度映射成琥珀单色；不摇、不褪（到点直接解除）
  function syncDummy() {
    const frozen = frzOn && !frzHit, off = ofFrz < 2.5, m = frozen || off ? ((frozen ? frzT : ofFrz) < 1 / 12 ? 1 : 2) : 0;
    if (m !== dumMode) { dumMode = m; dummyFx(m ? { dur: 99, tint: m === 1 ? R_FILL : R_EL } : { dur: 1e-4 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > 0.2) { chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const k = Math.floor(Math.random() * 8); if (k === 2) continue; const a = k * 0.7854 + (Math.random() - 0.5) * 0.1, r = 11 + Math.random() * 7; rayIn(a, r, 18 + Math.random() * 16); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.55 }); } if (P.step !== 0) for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); lastStep = P.step; }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 0.7 : 8); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 3, Math.random() * 6 - 3, -7 - Math.random() * 7, 0.6 + Math.random() * 0.6, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.7 && stT < INCOMING + 2.45) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 28, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < RAYN; i++) if (rOn[i]) { rR[i] -= rV[i] * dt; if (rR[i] <= 3) { rOn[i] = 0; continue; } rX[i] = gx + Math.cos(rA[i]) * rR[i]; rY[i] = gy + Math.sin(rA[i]) * rR[i]; rQ[i] = 0.9 * clamp01((rR[i] - 3) / Math.max(1, rR0[i] - 3)); }
    // 技能命中：光环扫到假人 → 琥珀剪影定格 0.4 秒（不摇）→ 才闪白 + 大摇 + 击退 1 格
    if (grT < GR_LIFE && !frzOn && grX + grRX(grT) >= DUMMY_X - 6) { frzOn = 1; frzT = 0; }
    if (frzOn && !frzHit && frzT >= 0.4) { frzHit = 1; hitDummy(1, 1); shake(0.12, 1); burst(DUMMY_X - 2, HY - 16, 14, 40, 100, 0.25, 0.5, R_EL, 12); starT = 0; sfx('impact', { pal: 'fire', w: 0.7 }); }
    // 场外照夜：压暗 → 闪暖白 → 探照光带向右扫 → 扫到的敌人定格 2.5 秒
    if (ofT < 0.1 && ofT + dt >= 0.1) flash(0.05);
    if (!ofHit && ofT >= 0.1 && ofT < 2 && HX + (ofT - 0.1) * 240 >= DUMMY_X - 6) { ofHit = 1; ofFrz = 0; }
    smT += dt; grT += dt; colT += dt; starT += dt; ofT += dt; ofFrz += dt; if (frzOn) frzT += dt;
    syncDummy();
  }
  // 场外「照夜」：游戏里是领袖不在场时按空格的全场效果（查看页按 7）
  function offField() { ofT = 0; ofHit = 0; ofFrz = 9; }
  function fxReset() { smT = 9; grT = 9; colT = 9; frzT = 9; frzOn = 0; frzHit = 0; starT = 9; ofT = 9; ofFrz = 9; ofHit = 0; dumMode = 0; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; rOn.fill(0); }
  const RAY_R0 = [4, 4, 0, 0, 8, 9, 8, 5];                        // 每个方向的光芒线起点（0 = 不画）：避开灯盾本身和下方的脸
  function grRing(front, f12) { // 贴地扁椭圆光环：后半弧（front = 0）画在人物后面，前半弧画在人物前面
    if (grT >= GR_LIFE) return; const rx = grRX(grT), ry = rx * 0.22, c = grT < 0.07 ? EL[0] : grT < 0.16 ? EL[1] : grT < 0.28 ? EL[2] : EL[3], n = Math.ceil(rx * 4.2);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.2832, s = Math.sin(a); if ((s >= 0) !== !!front) continue; if (grT > 0.2 && ((i + f12) & 3) === 3) continue;
      const x = Math.round(grX + Math.cos(a) * rx), y = Math.round(grY + s * ry); put(x, y, c); if (grT < 0.16) put(x, y + (s >= 0 ? 1 : -1), EL[2]);
    }
  }
  function stars(cx, cy, t) {    // 头顶 3 颗小星绕圈（十字 5 像素）
    for (let k = 0; k < 3; k++) { const a = t * 7 + k * 2.0944, x = Math.round(cx + Math.cos(a) * 6), y = Math.round(cy + Math.sin(a) * 2); put(x, y, EL[0]); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[2]); }
  }
  function fxBack(f12) {        // 画在角色后面：场外照夜的探照光带、地面映光圈、砸地光环后半弧
    if (ofT >= 0.1 && ofT < 1.2) {
      const front = Math.min(W + 4, HX + Math.round((ofT - 0.1) * 240)), fade = clamp01((ofT - 0.5) / 0.7), y0 = HY - 30, y1 = HY - 4;
      for (let y = y0; y <= y1; y++) for (let x = HX; x < Math.min(W, front); x++) { const edge = front - x; if (edge <= 2) put(x, y, edge === 0 ? EL[0] : EL[1]); else if (((x + y) & 1) === 0 && B8[(y & 7) * 8 + (x & 7)] >= fade) put(x, y, y === y0 || y === y1 ? EL[2] : edge < 8 ? EL[2] : EL[3]); }
    }
    if (P.lying) return;
    const cx = scrX(P.gx), state = E.state, stT = E.stT;
    if (state === CHARGE) { const q = clamp01(stT / DUR[CHARGE]), span = Math.round(3 + 10 * q); for (let x = cx - span; x <= cx + span; x++) { const d = Math.abs(x - cx); if (d < span * 0.35 || ((x + f12) & 1) === 0) put(x, FLOOR, d < span * 0.35 ? EL[2] : EL[3]); if (q > 0.5 && d < span * 0.6 && ((x + f12) & 1)) put(x, FLOOR + 1, EL[3]); } }
    else if (state === CAST || (state === RECOVER && stT < 0.3)) { const span = state === CAST ? 16 : 9; for (let x = LAMP_CAST_X - span; x <= LAMP_CAST_X + span; x++) { const d = Math.abs(x - LAMP_CAST_X); if (state === RECOVER && ((x + f12) & 1)) continue; put(x, FLOOR, d < 5 ? EL[1] : d < 10 ? EL[2] : EL[3]); if (d < 8) put(x, FLOOR + 1, EL[3]); } }
    grRing(0, f12);
    shotFloorGlow(f12);
  }
  function fxMid(f12) {         // 画在假人前、角色后：被照住的假人头顶的转星（场外版再挂一盏小灯）；假人的琥珀剪影由引擎 dummyFx 画
    const frozen = frzOn && !frzHit, off = ofFrz < 2.5;
    if (frozen || (frzHit && starT < 0.25)) stars(DUMMY_X, HY - 34, frozen ? frzT : 0.4 + starT);
    if (off) { const lx = DUMMY_X, ly = HY - 40, c2 = pc(32), c3 = pc(33); put(lx, ly - 2, c3); put(lx - 1, ly - 1, c2); put(lx, ly - 1, c2); put(lx + 1, ly - 1, c2); put(lx - 1, ly, c2); put(lx, ly, ((f12 >> 1) & 1) ? EL[1] : EL[0]); put(lx + 1, ly, c2); put(lx - 1, ly + 1, c2); put(lx, ly + 1, c2); put(lx + 1, ly + 1, c2); stars(lx, ly + 5, ofFrz); }
  }
  function fxFront(f12) {       // 画在角色前面：蓄力光芒线、施放光柱 / 速度线 / 十字星芒、光环前半弧、直刺拖影、汇聚光点
    const gx = scrX(P.gx), gy = HY + P.gy, state = E.state, stT = E.stT;
    if (state === CHARGE && stT > 0.25 && P.dq < 1) {            // 辐射形光芒线：6 条（右、右下、左、左上、上、右上），从盾缘外起、逐帧变长；不画向下压脸的两条
      const n = Math.floor((stT - 0.25) * 12), grow = Math.min(9, 2 + n * 0.6);
      for (let k = 0; k < 8; k++) { const r0 = RAY_R0[k]; if (!r0) continue; const a = k * 0.7854, L = r0 + ((k & 1) ? grow * 0.7 : grow); for (let r = r0; r <= L; r++) { if (r > L - 2 && ((r + f12) & 1)) continue; const q = (r - r0) / Math.max(1, L - r0), c = q < 0.3 ? (P.gem >= 2 ? EL[0] : EL[1]) : q < 0.65 ? EL[2] : EL[3]; put(gx + Math.round(Math.cos(a) * r), gy + Math.round(Math.sin(a) * r), c); } }
    }
    if (P.gem === 3 && !P.lying && state === CAST && stT < 2 / 12) { for (let r = 3; r <= 6; r++) { const c = r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy - 2, EL[1]); }
    if (colT < 2 / 12) {                                        // 灯位向上短光柱：第 1 帧 3 格宽全亮，第 2 帧 1 格断续；第 1 帧盾上方 3 道下砸速度线
      const first = colT < 1 / 12;
      for (let y = colY - 24; y <= colY; y++) { if (first) { put(colX - 1, y, EL[1]); put(colX, y, EL[0]); put(colX + 1, y, EL[1]); } else if (((y + f12) & 1) === 0 && y > colY - 18) put(colX, y, EL[2]); }
      if (first) for (let dx = -5; dx <= 1; dx += 3) for (let y = colY - 16; y <= colY - 7; y++) if ((y & 1) === 0) put(colX + dx, y, y > colY - 11 ? EL[2] : EL[3]);
    }
    grRing(1, f12);
    if (smT < 2 / 12) {                                         // 直刺拖影：第 1 帧 2 格宽（前端白），第 2 帧 1 格宽断续
      const first = smT < 1 / 12;
      for (let x = smX0; x <= smX1; x++) { if (first) { put(x, smY, x > smX1 - 4 ? EL[0] : EL[1]); put(x, smY - 1, x > smX1 - 6 ? EL[1] : EL[2]); } else if (((x + f12) & 1) === 0) put(x, smY, x > smX1 - 6 ? EL[2] : EL[3]); }
    }
    for (let i = 0; i < RAYN; i++) if (rOn[i]) { const q = rQ[i]; put(Math.round(rX[i]), Math.round(rY[i]), EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]); }   // 汇聚光点：离灯越近越亮
  }

  return {
    name: '守夜人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_LAMP, M_LGLOW], HIT_POINT: [5, -21], EVENTS,
    // 音效声明：布衣肉身受击、跪倒仰面倒下；灯盾猛击 = 琥珀灯火（fire）+ 盾击花样，重砸
    SFX: { body: 'flesh', how: 'topple', pal: 'fire', style: 'shield', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront, offField,
  };
});
