// 驱魔修女（远程领袖 · 英雄）：海鸥翼白头巾、前举的长柄银十字架、垂到膝下的念珠；远程十字光矢；技能「圣咏」（上场版）；场外「圣咏」（按 7）。
// 由 batch-00-pilot/nun/nun.html 转成共享引擎模块：第 3 节（角色）画法、姿势、时间线原样保留，第 4 节（特效）改用引擎的粒子 / 弹道 / 震屏 / 闪白。
PCD.define('nun', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, mix, q12, f12of, gait, walkDemo, color, fxRamp, FXR, FXI, DT, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST,
    spawn, burst, shoot, shake, flash, hitDummy, put, scrX, shotFloorGlow, sfx } = E;

  // ───── 颜色：0–26 与共享色板相同；原版追加的 27–40 用 pc(原下标) 取本页下标 ─────
  const OWN = ['#12161f', '#2e3647', '#4f5b73', '#7c89a2',     // 27–30 鸽灰蓝修女袍（勾线 / 暗 / 基 / 亮）
    '#6d6a78', '#b9b6c4', '#e6e4ee',                            // 31–33 白亚麻头巾（勾线 / 暗 / 基，亮借 21）
    '#3a4050', '#8a93a4', '#c9d2de',                            // 34–36 银十字架与念珠（勾线 / 暗 / 基，亮借 21）
    '#e4ffd8', '#b8ffb0', '#4cc46a', '#1a5a34'].map(color);     // 37–40 圣疗薄荷 淡绿白 → 薄荷 → 翠绿 → 深绿
  const pc = (i) => (i < 27 ? i : OWN[i - 27]), mat = (a, band, flat) => defMat(a.map(pc), band, flat);
  const R_EL = fxRamp('mint', [21, 37, 38, 39, 40].map(pc)), EL = FXR[R_EL];     // 圣咏 · 圣疗薄荷（白 → 淡绿白 → 薄荷 → 翠绿 → 深绿）
  const R_BEAD = fxRamp('bead', [21, 36, 35, 34, 27].map(pc));                  // 断线的银念珠
  const R_DUST = FXI.dust;

  // ───── 材质、缓冲、姿势 ─────
  // 材质 [勾线, 暗, 基, 亮]：鸽灰蓝修女袍 · 白亚麻头巾 / 方领 / 袖口 · 银十字架与念珠 · 小金十字 / 书扣 · 肤 · 黑鞋 · 皮腰带 · 圣书 · 圣水 · 眼 · 圣石
  const M_ROBE = mat([27, 28, 29, 30], 1), M_SLEEVE = mat([27, 28, 29, 30], 1), M_LINEN = mat([31, 32, 33, 21], 1), M_WING = mat([31, 32, 33, 21], 1);
  const M_SILVER = mat([34, 35, 36, 21], 1), M_BEAD = mat([34, 35, 36, 21], 1), M_GOLD = mat([20, 19, 14, 5], 1), M_SKIN = mat([20, 16, 15, 15], 1);
  const M_SHOE = mat([0, 8, 9, 10], 1), M_BELT = mat([27, 20, 20, 19], 1), M_BOOK = mat([20, 20, 19, 16], 1), M_WATER = mat([34, 39, 38, 37], 1);
  const M_FACE = mat([20, 16, 15, 15], 1), M_INK = mat([0, 0, 0, 0], 1, 1), M_STONE = mat([40, 39, 38, 37], 1, 1), M_SGLOW = mat([38, 38, 37, 21], 1, 1);
  const HX = 34, DUR = DEFAULT_DUR.slice();                      // 远程站位
  const hero = new Sprite(66, 46, 33, 40);                       // 缓冲：脚底 = (33, 40)；放得下高举的十字架、上抛的十字架、倒地 + 飘落的头巾翼
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_STONE] = HERO_RIM.skip[M_SGLOW] = HERO_RIM.skip[M_SILVER] = HERO_RIM.skip[M_BEAD] = 1;   // 细长的银件不吃轮廓光
  HERO_RIM.skip[M_FACE] = 1;                                     // 脸不吃轮廓光：捧十字架祷唱时圣石就在脸前，轮廓光会把闭眼的脸前沿染成绿色
  // 姿势参数：连续插值，按 12 fps 取样后取整。取整后的取值范围（缓存键按此编码，超出会串位）：
  //   hx -32..31 · hy -64..63 · a ±π（π/32 一档，十字架倾角，0 = 竖直、正 = 向前倾）· lean -1..2 · head -1..2（-1 仰头、1 低头默祷）
  //   back 0..3（后手：0 垂在后腰握念珠、1 双手捧十字架、2 甩到身后）· bend 0..3（≥ 2 时整顶头巾被托起 1 行；倒地时 = 飘落的倾斜 0/1/2）
  //   bob / glint / eyes / flash / lying / walk / cf / rb 0..1 · wing -1..2（翼端扇动：-1 下沉 1 行，1 上扬 1 行）· bead 0..3（念珠滑过的相位）
  //   beard -3..4（念珠末端摆动）· sway -1..2 · gem 0..7 · rim 0..3 · bx -16..15 · crouch 0..7 · lift 0..7 · hatX -16..15 · hatY 0..15（头巾翼飘落）
  //   step -1..2 · wup 0..3 · dq 0..1 · cx -16..47 · cy -63..0 · cr 0..3（死亡时抛飞的十字架：圣石位置与 90° 朝向）
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0,
    wing: 0, bead: 0, cf: 0, cx: 0, cy: 0, cr: 0, rb: 0, k1: 0, k2: 0 };
  const K_IDLE = { hx: 7, hy: -7, a: 0.3, lean: 0, head: 1, back: 0, bend: 0 };      // 默祷：低头闭眼，十字架贴在胸前、十字头探出身前（离头巾翼和脸各空 1 格，剪影里认得出「+」）
  const K_READY = { hx: 7, hy: -8, a: 0.35, lean: 0, head: 0, back: 0, bend: 0 };    // 行走：抬头，右手把十字架前举
  const K_WIND = { hx: 3, hy: -6, a: 0.1, lean: -1, head: 0, back: 1, bend: 1 };      // 攻击预兆：十字架收回胸前
  const K_PUSH = { hx: 9, hy: -12, a: 0.5, lean: 1, head: 0, back: 2, bend: 1 };     // 出手：前推十字架，后手甩开
  const K_HOLD = { hx: 8, hy: -11, a: 0.4, lean: 1, head: 0, back: 2, bend: 0 };
  const K_CHARGE = { hx: 6, hy: -5, a: 0.05, lean: 0, head: 1, back: 1, bend: 2 };  // 蓄力：双手捧十字架于胸前，闭眼祷唱
  const K_CAST = { hx: 9, hy: -19, a: 0.1, lean: -1, head: -1, back: 2, bend: 3 };   // 施放：高举十字架仰望，后手张开（十字头离远侧翼尖 ≥ 2 格、勾线之间隔 1 行，是剪影的最高点）
  const K_HURT = { hx: 5, hy: -7, a: -0.2, lean: -1, head: -1, back: 2, bend: 2 };
  const K_REEL = { hx: 2, hy: -11, a: 0, lean: -1, head: -1, back: 2, bend: 2 };     // 死亡踉跄后仰（十字架已脱手）
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'back', 'bend'];
  const mixPose = (A, B, q) => mix(P, A, B, q, FIELDS);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  // 碎步：每秒 8 帧（接触帧停 2 个 12 fps 刻度、经过帧 1 个，袍摆一跳一跳），步幅 ±2、两脚换位；落脚（接触帧）时翼端随身体一沉、经过帧回弹
  // 两只鞋的左端 x：[前脚 A, 后脚 B] × 站立 / 接触（A 在前）/ 经过（B 抬起过前）/ 接触（B 在前）/ 经过（A 抬起过前）；步幅 ±2
  const FEET = [0, -3, 1, -4, -2, 0, -3, 0, 0, -2];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, 1, 0, -1], WALK_WING = [-1, 0, -1, 0], WALK_DIST = 14;
  const T_FLICK = 2 / 12;
  const D_CROSS_LAND = 0.78;                                      // 死亡：十字架落地时刻（受击后秒数）
  function crossFly(d) {                                          // 十字架脱手 → 向上抛起（每 0.13 s 转 90°，转 5 次正好横躺）→ 落在身前 → 弹一下 → 横躺
    if (d < D_CROSS_LAND) {
      const q = d / D_CROSS_LAND; P.cx = Math.round(2 + 16 * q);
      P.cy = Math.round(d < 0.3 ? -26 + 13 * Math.pow((0.3 - d) / 0.3, 2) : -26 + 23 * Math.pow((d - 0.3) / (D_CROSS_LAND - 0.3), 2)); P.cr = Math.min(5, Math.floor(d / 0.13 + 1e-6)) & 3;
    } else if (d < D_CROSS_LAND + 0.17) { P.cx = 18; P.cy = -3 - Math.round(2 * Math.sin(Math.PI * (d - D_CROSS_LAND) / 0.17)); P.cr = 1; }
    else { P.cx = 18; P.cy = -3; P.cr = 1; }
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1;
    P.wing = 0; P.bead = 0; P.cf = 0; P.cx = 0; P.cy = 0; P.cr = 0; P.rb = 0;
    const idle = () => {                                          // 默祷：念珠每拍（0.4 s）滑过一颗；每个循环抬眼一次，圣石回应一闪
      mixPose(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.bead = b & 3;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { P.head = 0; P.wing = lp < 1.75 ? -1 : 0; P.glint = lp >= 1.75 && lp < 1.92 ? 1 : 0; P.gem = P.glint; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                       // 碎步（每秒 8 帧）：走出去半程，转身（镜像）走回来
      mixPose(K_READY, K_READY, 0); const f = gait(tq, 8);
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f]; P.wing = WALK_WING[f]; P.bead = f;
      P.a = K_READY.a + P.step * 0.1; P.hx = K_READY.hx + P.step * 0.5;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    }
    else if (st === ATTACK) {                                     // 收十字架 → 前推定格 → 回到默祷
      if (tq < 0.12) { mixPose(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < 0.2) { mixPose(K_PUSH, K_PUSH, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.wing = -1; }
      else if (tq < 0.45) { mixPose(K_PUSH, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; }
      else mixPose(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                   // 捧十字架祷唱：头巾翼被上升气流托起并抖动，圣石 0 → 1 → 1/2 闪 → 2
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q); P.eyes = 1;
      P.wing = q > 0.5 ? ((f12 & 1) ? -1 : 0) : 0; P.beard = q > 0.9 && (f12 & 1) ? 1 : 0; P.sway = q > 0.4 ? ((f12 & 1) ? 1 : 0) : 0; P.bead = Math.floor(tq * 5 + 1e-6) & 3;
      P.gem = tq < 0.35 ? 0 : tq < 0.8 ? 1 : tq < 1.15 ? ((f12 & 1) ? 2 : 1) : 2; P.rim = 2;
    } else if (st === CAST) { mixPose(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.beard = 3; P.sway = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q); P.beard = Math.round(2 * (1 - q)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.wing = -1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }   // 头巾整顶被甩起 1 行、翼端被震得压平
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                    // 后仰：十字架脱手上抛 → 仰面倒下 → 念珠断线 → 头巾翼最后缓缓飘落
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else {
        P.cf = 1; crossFly(d); P.gem = (f12 & 1) ? 1 : 0;
        if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.wing = -1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
        else if (d < 0.5) { mixPose(K_REEL, K_REEL, 0); P.bx = -3; P.crouch = 2; P.eyes = 1; P.beard = -2; P.sway = -1; }
        else {
          mixPose(K_REEL, K_REEL, 0); P.lying = 1; P.bx = -3; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.rb = d >= 0.66 ? 1 : 0; P.bend = 0;
          if (d < 0.74) { const q = clamp01((d - 0.5) / 0.24); P.hatX = Math.round(-1 * q); P.hatY = Math.round(9 * ease.out(q)); }
          else if (d < 1.5) { const q = (d - 0.74) / 0.76, c = Math.cos(q * Math.PI * 3); P.hatY = Math.round(9 * (1 - q)); P.hatX = Math.round(-1 - 5 * q + 2 * Math.sin(q * Math.PI * 3)); P.bend = c > 0.35 ? 1 : c < -0.35 ? 2 : 0; }
          else { P.hatX = -6; P.hatY = 0; }
          if (d >= D_CROSS_LAND) P.gem = d < 0.95 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    if (P.lying || P.cf) { P.gx = P.cx; P.gy = P.cy; }
    else { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.gx = Math.round(P.hx + dx * 6) + P.bx; P.gy = Math.round(P.hy + dy * 6); }
    // 缓存键：任何一个取整后的参数变了才重画（k1 约 2^48，k2 约 2^45）
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.back; k = k * 4 + P.bend; k = k * 2 + P.bob;
    k = k * 4 + P.wing + 1; k = k * 4 + P.bead; k = k * 2 + P.cf; k = k * 64 + P.cx + 16; k = k * 64 - P.cy; k = k * 4 + P.cr; k = k * 2 + P.rb; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }

  // ───── 画：部件工具 ─────
  let robeL = 0, robeR = 0;
  function robeEdges(y, yT, sway, lean) { const t = (y - yT) / (-2 - yT), s = sway * t * t, l = lean * (1 - t); robeL = Math.round(-2 - 2.3 * Math.pow(t, 1.1) + s + l); robeR = Math.round(2 + 1.4 * t + s + l); }
  // 头巾翼：从头顶两侧向外伸出的上浆白亚麻翼（海鸥翼）。dir 1 = 远侧翼（向前，根部藏在头后）、-1 = 近侧翼（向后）
  // 顶边：翼根到第 4 列与帽冠齐平，只有最外 1 列高 1 行；翼下沿从根部向翼端斜收（根部 4 行 → 第 4、5 列各 2 行）
  // 末端两列都是 2 行高、最外一列错上 1 行：翼端是一条向外上方斜出的扁尖，勾线之后纯黑剪影里不再是 2 列宽的圆疙瘩（熊耳 / 鼠耳）
  const WING_TOP = [-2, -2, -2, -2, -3], WING_BOT = [1, 1, 0, -1, -2];
  // 托起：整顶头巾（帽冠 + 两翼）一起上移 1 行，形状不变（drawStanding 里的 cy）；扇动 flap：只动最外 1 列，-1 下沉 1 行（和第 4 列齐平，翼端压平）
  // 这样任何状态下翼尖最多比帽冠高 1 行，剪影不会变成竖起的兔耳 / 尖角
  function drawWing(x0, y0, dir, flap) {
    for (let k = 0; k <= 4; k++) {
      const up = k >= 4 ? flap : 0, x = x0 + dir * k;
      for (let y = y0 + WING_TOP[k] - up; y <= y0 + WING_BOT[k] - up; y++) sp(x, y, M_WING, 0);
    }
    sp(x0 + dir, y0 - 1, M_WING, 2); sp(x0 + dir * 2, y0 - 1, M_WING, 2);   // 折痕：翼根两列的上浆折线（翼端两列只有 2 行，靠自动明暗的暗下沿）
  }
  // 头：局部坐标 u 向前、v 向下，(0,0) = 下巴那一行；rot = 1 时整体转 90°（仰躺：头顶朝左、脸朝上）
  let hRot = 0, hAX = 0, hAY = 0;
  function hp(u, v, m, t) { if (hRot) sp(hAX + v, hAY - u, m, t); else sp(hAX + u, hAY + v, m, t); }
  function drawHead(ax, ay, rot, closed) {
    hRot = rot; hAX = ax; hAY = ay;
    for (let v = -4; v <= -1; v++) for (let u = -1; u <= 3; u++) if (!(u === 3 && (v === -4 || v === -1))) hp(u, v, M_FACE, 0);   // 圆脸（脸单独一个材质：和手同色，但不吃轮廓光）
    for (let v = -5; v <= 0; v++) { if (v > -5 && v < 0) hp(-3, v, M_LINEN, 0); hp(-2, v, M_LINEN, 0); }                         // 包住后脑的白头巾（圆角）
    for (let u = -1; u <= 2; u++) hp(u, -5, M_LINEN, 0);                                                                        // 额前白带
    for (let u = -1; u <= 2; u++) hp(u, 0, M_LINEN, 0);                                                                         // 下巴下的白巾
    hp(-2, -2, M_LINEN, 2);                                                                                                       // 耳旁褶
    for (let u = -1; u <= 1; u++) hp(u, -1, M_FACE, 3);                                                                         // 下巴那一行强制基色：底边不自动取暗，免得读成胡子
    hp(2, -2, M_FACE, 3);                                                                                                         // 下颌前角也用基色：暗色只留在侧脸前沿 1 格和小嘴 1 格
    hp(2, -1, M_FACE, 2);                                                                                                         // 小嘴：下巴行只有这 1 格暗色
    if (rot) { hp(3, -5, M_LINEN, 0); hp(3, -4, M_LINEN, 0); hp(3, 0, M_LINEN, 0); }                                              // 仰躺：白头巾包到额前角，头顶一侧整列是白亚麻，不露肤色勾线
    // 侧脸只画一只眼（u = 1）；脸前沿 u = 3 不画任何深色，否则墨色勾线会在脸前伸出一条黑横杠
    if (closed) { hp(0, -3, M_FACE, 2); hp(1, -3, M_FACE, 1); }                                                                 // 闭眼：下垂的眼睑线（暗 16 + 勾线 20）
    else if (!rot) { hp(1, -3, M_INK, 1); hp(1, -4, M_FACE, 2); hp(0, -3, M_FACE, 3); }                                           // 睁眼：1 格墨眼 + 眉影（眼后那格保持基色，墨眼只有 1 格）
  }
  // 银十字架：长柄 + 十字头，中心嵌薄荷圣石（同一部件）。(cx, cy) = 圣石中心，a = 倾角（0 竖直，π/2 头朝右）
  const STONE = [0, 0, -1, 0, 1, 0, 0, -1, 0, 1];
  const STONE_LV = [
    [M_STONE, 3, M_STONE, 2, M_STONE, 2, M_STONE, 3, M_STONE, 2],   // 0 待机
    [M_SGLOW, 3, M_STONE, 3, M_STONE, 3, M_SGLOW, 3, M_STONE, 3],   // 1 蓄力 1
    [M_SGLOW, 4, M_SGLOW, 3, M_SGLOW, 3, M_SGLOW, 3, M_SGLOW, 3],   // 2 蓄力 2
    [M_SGLOW, 4, M_SGLOW, 4, M_SGLOW, 4, M_SGLOW, 4, M_SGLOW, 3],   // 3 施放
    [M_STONE, 1, M_STONE, 1, M_STONE, 1, M_STONE, 2, M_STONE, 1],   // 4 熄灭
  ];
  function drawCross(cx, cy, a) {
    const dx = Math.sin(a), dy = -Math.cos(a), px = Math.cos(a), py = Math.sin(a);
    const X = (u, v) => cx + px * u - dx * v, Y = (u, v) => cy + py * u - dy * v;   // u 横向，v 沿柄向下
    line(X(0, 2), Y(0, 2), X(0, 8), Y(0, 8), M_SILVER, 0, 0);                        // 长柄
    sp(X(0, 8), Y(0, 8), M_SILVER, 2); sp(X(0, 5), Y(0, 5), M_SILVER, 2);            // 柄尾、缠柄银箍
    // 十字头：1 格粗的上臂 + 左右横臂，各伸出圣石 2 格（臂长 3）；四角留出 2×2 的空，勾线之后纯黑剪影里仍是清楚的「+」
    sp(X(0, -2), Y(0, -2), M_SILVER, 0); sp(X(0, -3), Y(0, -3), M_SILVER, 4);
    sp(X(-2, 0), Y(-2, 0), M_SILVER, 0); sp(X(-3, 0), Y(-3, 0), M_SILVER, 4); sp(X(2, 0), Y(2, 0), M_SILVER, 0); sp(X(3, 0), Y(3, 0), M_SILVER, 2);
    const lv = STONE_LV[P.gem], sx = Math.round(cx), sy = Math.round(cy);
    for (let i = 0; i < 5; i++) sp(sx + STONE[i * 2], sy + STONE[i * 2 + 1], lv[i * 2], lv[i * 2 + 1]);
    if (P.glint) sp(sx + 1, sy - 2, M_SGLOW, 4);
  }
  // 念珠：从手里垂下，每两格一颗珠（珠与珠之间被分界线压成深色的线），亮珠随 bead 往下滑；末端小银十字
  function drawRosary(x0, y0, n, swing) {
    let x = x0, y = y0;
    for (let k = 0; k < n; k++) { const q = (k + 1) / n; x = Math.round(x0 + swing * q * q); y = y0 + k; const ph = (k + 8 - P.bead) & 3; if (!(ph & 1)) sp(x, y, M_BEAD, ph === 0 ? 4 : 3); }
    sp(x, y + 1, M_BEAD, 3); sp(x - 1, y + 2, M_BEAD, 3); sp(x, y + 2, M_BEAD, 4); sp(x + 1, y + 2, M_BEAD, 3); sp(x, y + 3, M_BEAD, 2);
  }
  function sleeve(sx, sy, hx, hy, r0, r1) { const ux = hx - sx, uy = hy - sy, ul = Math.hypot(ux, uy) || 1, ex = hx - ux / ul * 1.6, ey = hy - uy / ul * 1.6; for (let s = 0; s <= 1.001; s += 0.125) brush(sx + (ex - sx) * s, sy + (ey - sy) * s, r0 + s * (r1 - r0), M_SLEEVE, 0); return [ex, ey]; }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const lean = P.lean, yT = -12 + P.bob + P.crouch, hx = lean + (P.head < 0 ? P.head : 0), hy = yT - 1 + (P.head > 0 ? 1 : 0), cy = hy - 5 - (P.bend >= 2 ? 1 : 0), flap = Math.max(-1, Math.min(1, P.wing));
    const closed = P.eyes || P.head > 0;
    part(); drawWing(hx + 3, cy, 1, flap);                                          // 远侧头巾翼：根部藏在头后，向前伸出、翼端微翘
    if (P.back !== 1) {                                                            // 后手在身体后面：0 垂在后腰、2 甩开到身后；手离袍边空 1 格，念珠从手下垂出、露在轮廓外摆动
      const up = P.back === 2, bhx = up ? -6 + lean : -5 + lean, bhy = up ? yT + 3 : yT + 6;
      part(); const [ex, ey] = sleeve(-2 + lean, yT + 2, bhx, bhy, 1, up ? 1.5 : 1.2);
      part(); brush(ex, ey, 0.9, M_LINEN, 0);
      part(); rect(bhx - 1, bhy - 1, 2, 2, M_SKIN, 0);
      part(); sp(bhx - 1, bhy + 1, M_BEAD, 3); drawRosary(bhx - 1, bhy + 2, up ? 4 : Math.max(1, -4 - bhy), -(P.beard + Math.sign(P.beard)));
    }
    part();                                                                        // 鸽灰蓝修女袍：窄肩、A 字下摆、袍摆随步一跳一跳
    for (let y = yT; y <= -2; y++) { robeEdges(y, yT, P.sway, lean); run(y, robeL, robeR, M_ROBE, 0); if (y === -2) for (let x = robeL + 1; x < robeR; x++) if ((((x - P.sway) % 3) + 3) % 3 === 0) sp(x, y, M_ROBE, 2); }
    for (let y = yT + 8; y <= -3; y++) { const t = (y - yT) / (-2 - yT), s = P.sway * t * t; sp(-1 + s - t * 0.8, y, M_ROBE, 2); }   // 袍褶
    robeEdges(yT, yT, 0, lean); run(yT, robeL, robeR, M_LINEN, 0); robeEdges(yT + 1, yT, 0, lean); run(yT + 1, robeL, robeR, M_LINEN, 0); run(yT + 2, lean - 1, lean + 2, M_LINEN, 0);   // 白色方领
    for (let y = yT + 3; y <= yT + 5; y++) sp(lean - 1, y, M_GOLD, 3); sp(lean - 2, yT + 4, M_GOLD, 3); sp(lean, yT + 4, M_GOLD, 3);   // 胸前小金十字：竖臂 3 格 + 横臂两端各 1 格，统一金 14；放在胸口正中（x = lean - 1），不贴着前袖的肩头
    const by = yT + 6; robeEdges(by, yT, P.sway, lean); const bL = robeL; run(by, robeL, robeR, M_BELT, 0);   // 皮腰带
    part();                                                                        // 腰间挂件：扣铜扣的小圣书（前腰）+ 圣水瓶（后腰）
    robeEdges(by + 2, yT, P.sway, lean); const bR = robeR;
    rect(bR - 1, by + 1, 3, 3, M_BOOK, 0); sp(bR - 1, by + 1, M_BOOK, 2); sp(bR - 1, by + 2, M_BOOK, 2); sp(bR - 1, by + 3, M_BOOK, 2); sp(bR + 1, by + 2, M_GOLD, 3);   // 圣书挂在前腰、探出袍边
    sp(bL, by + 1, M_SILVER, 3); sp(bL, by + 2, M_WATER, 4); sp(bL, by + 3, M_WATER, 2);                                                                                  // 圣水瓶挂在后腰袍边
    // 黑鞋：画在袍摆和挂件前面（鞋面整块露出，袍摆底边自动压分界线）。碎步 4 帧两脚真正换位（FEET 表），领先的脚带 1 格亮色鞋尖、画在另一只脚之后
    const wf = P.step > 0 ? 1 : P.step < 0 ? 3 : P.wup === 2 ? 2 : P.wup === 1 ? 4 : 0, fa = FEET[wf * 2], fb = FEET[wf * 2 + 1], upA = P.wup === 1 ? 1 : 0, upB = P.wup === 2 ? 1 : 0;
    const shoe = (x, u, toe) => { if (toe) { rect(x, -1 - u, 3, 2, M_SHOE, 0); sp(x + 3, -u, M_SHOE, 4); } else { run(-1 - u, x, x + 2, M_SHOE, 3); run(-u, x, x + 2, M_SHOE, 2); } };   // 后面那只鞋整体暗一级：鞋面 9、鞋底 8、没有亮鞋尖
    if (fb > fa) { part(); shoe(fa, upA, 0); part(); shoe(fb, upB, 1); }          // 后脚迈到前面：画在前脚之后
    else { part(); shoe(fb, upB, 0); part(); shoe(fa, upA, 1); }
    part(); drawHead(hx, hy, 0, closed);                                          // 头：圆脸 + 白头巾包住额头、后脑、下巴
    part();                                                                        // 头巾帽冠（两行，延到两侧翼根，顶边和翼连成一条线，不留缺口）+ 近侧翼（向后）
    for (let y = cy - 2; y <= hy - 6; y++) run(y, hx - 2, hx + 2, M_WING, 0); drawWing(hx - 3, cy, -1, flap);   // 翼展 15 格（翼尖到翼尖）
    if (P.back === 1) {                                                           // 双手捧十字架：后手的前臂袖 → 白袖口 → 手 → 缠在手上的念珠
      const bhx = P.hx - 1, bhy = P.hy + 1;
      part(); const [ex, ey] = sleeve(-1 + lean, yT + 2, bhx, bhy, 1, 1.4);
      part(); brush(ex, ey, 0.9, M_LINEN, 0);
      part(); rect(bhx - 1, bhy - 1, 2, 2, M_SKIN, 0);
      part(); sp(bhx - 1, bhy, M_BEAD, 3); drawRosary(bhx - 1, bhy + 2, Math.max(1, -4 - bhy), P.beard);
    }
    if (!P.cf) { part(); const dx = Math.sin(P.a), dy = -Math.cos(P.a); drawCross(P.hx + dx * 6, P.hy + dy * 6, P.a); }   // 银十字架（圣石嵌在十字中心）
    part(); const [fx, fy] = sleeve(1 + lean, yT + 2, P.hx, P.hy, 0.6, 1.7);      // 前袖（喇叭袖，肩头只有 1 格、越往袖口越宽）→ 白袖口 → 握十字架的手；肩头比方领低 1 行，和下巴之间隔着整行白巾
    part(); brush(fx, fy, 1.0, M_LINEN, 0);
    part(); rect(P.hx - 1, P.hy - 1, 2, 2, M_SKIN, 0);
    if (P.cf) { part(); drawCross(P.cx - P.bx, P.cy, P.cr * Math.PI / 2); }       // 脱手上抛的十字架
  }
  // 飘落的头巾翼：和戴着时同一个轮廓的缩小版（11 格宽）——3 格帽冠（比两翼低垂 1 行，是包头的那一圈）+ 两翼各 4 列，末端 2 列钝头、上翘 1 行；tilt 1/2 = 左 / 右倾
  function drawCornette(cx, cy, tilt) {
    const tl = tilt === 1 ? 1 : tilt === 2 ? -1 : 0;
    for (let y = cy - 1; y <= cy + 1; y++) run(y, cx - 1, cx + 1, M_WING, 0); sp(cx, cy + 1, M_WING, 2);
    for (const s of [-1, 1]) {
      const o = s < 0 ? -tl : tl;
      for (let k = 0; k < 4; k++) { const x = cx + s * (2 + k), up = k >= 2 ? 1 : 0; sp(x, cy - 1 - up + o, M_WING, 0); sp(x, cy - up + o, M_WING, k === 1 ? 2 : 0); }
    }
  }
  // 倒地姿：仰面后倒（头在左、脸朝上），十字架横躺在身前，念珠已断，头巾翼飘到头边
  function drawLying() {
    part(); drawCross(P.cx - P.bx, P.cy + P.lift, P.cr * Math.PI / 2);          // 横躺的十字架（位置与躯体无关）
    part(); rect(3, -4, 2, 2, M_SHOE, 0); sp(4, -5, M_SHOE, 0); rect(3, -2, 2, 2, M_SHOE, 0);   // 鞋底朝右、鞋尖朝上
    part();                                                                        // 平躺的修女袍：胸口朝上，下摆在右
    for (let x = -11; x <= 2; x++) { const top = x <= -8 ? -4 : x <= -3 ? -4 : x <= 0 ? -3 : -3; for (let y = top; y <= 0; y++) sp(x, y, M_ROBE, 0); }
    run(-5, -9, -6, M_ROBE, 0); sp(1, -2, M_ROBE, 2); sp(2, -1, M_ROBE, 2); run(-1, -3, 0, M_ROBE, 2);
    for (let y = -4; y <= 0; y++) { sp(-11, y, M_LINEN, 0); sp(-10, y, M_LINEN, 0); }   // 白方领
    sp(-8, -5, M_GOLD, 4); sp(-7, -5, M_GOLD, 3);                                   // 胸前小金十字
    for (let y = -4; y <= 0; y++) sp(-5, y, M_BELT, 0);                             // 腰带竖着横过身体
    part(); drawHead(-12, -3, 1, 1);                                               // 仰面的头：闭眼
    part(); const [ex, ey] = sleeve(-9, -4, -3, -6, 1, 1.3); part(); brush(ex, ey, 0.9, M_LINEN, 0); part(); rect(-3, -7, 2, 2, M_SKIN, 0);   // 搭在腹上的手臂
    if (!P.rb) { part(); for (let k = 0; k < 4; k++) sp(-1 + k, -5 + (k & 1), M_BEAD, 3); }   // 断线前的念珠
    part(); drawCornette(-17 + P.hatX, -1 - P.hatY, P.bend);                        // 头巾翼：脱出、上弹、左右摇摆缓缓飘落
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() {
    HERO_RIM.skip[M_WING] = P.rim < 2 ? 1 : 0;                   // 待机的弱轮廓光不打在白头巾翼上（否则翼下沿成一道绿线）；蓄力 / 施放才照亮
    HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq;
    bake(hero, HERO_RIM);
  }

  // ───── 特效：圣咏 · 圣疗薄荷 ─────
  // 本角色的粒子（引擎没有的运动方式，模块自己管一个小池子）：1 十字光点（5 颗同速粒子组成「中心 + 上下左右」，臂先暗；只拖曳竖直速度）· 2 断线念珠（重力 + 落地弹跳）
  const QN = 320, qK = new Uint8Array(QN), qX = new Float32Array(QN), qY = new Float32Array(QN), qVX = new Float32Array(QN), qVY = new Float32Array(QN), qAge = new Float32Array(QN), qLife = new Float32Array(QN);
  let qHead = 0;
  const Q_PLUS = 1, Q_BEAD = 2, PLUS_DRAG = Math.exp(-1.1 * DT), BEAD_DRAG = Math.exp(-0.9 * DT);
  function qSpawn(k, x, y, vx, vy, life, age) {
    let i = qHead; for (let n = 0; n < QN; n++) { const j = (qHead + n) % QN; if (!qK[j]) { i = j; break; } }
    qHead = (i + 1) % QN; qK[i] = k; qX[i] = x; qY[i] = y; qVX[i] = vx; qVY[i] = vy; qAge[i] = age || 0; qLife[i] = life;
  }
  const PLUS_OFF = [0, 0, -1, 0, 1, 0, 0, -1, 0, 1];
  function plusMote(x, y, vy, life) { x = Math.round(x); y = Math.round(y); for (let k = 0; k < 5; k++) qSpawn(Q_PLUS, x + PLUS_OFF[k * 2], y + PLUS_OFF[k * 2 + 1], 0, vy, life, k ? life * 0.2 : 0); }   // 十字光点：臂比中心早一级变暗、早消失
  let smT = 9, psX0 = 0, psX1 = 0, psY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, stepCnt = 0;
  // 技能专属：光柱（施放开始计时）、两道贴地圣焰波（wvT）、假人身上的圣焰灼烧（burnT）
  let pilT = 9, wvT = 9, wvHit = 1, wvHitT = 0, burnT = 9;
  const WV_SPD = 170, PIL_X = HX + 1;
  const CAST_GX = HX + Math.round(K_CAST.hx + Math.sin(Math.round(K_CAST.a / ASTEP) * ASTEP) * 6), CAST_GY = HY + Math.round(K_CAST.hy - Math.cos(Math.round(K_CAST.a / ASTEP) * ASTEP) * 6);   // 高举时圣石的屏幕位置
  function onEnter(s) {
    if (s === CAST) {                                             // 高举十字架：圣石外爆、光柱从天而降罩住自己、两道圣焰波贴地向左右喷出
      pilT = 0; wvT = -1 / 12; wvHit = 0;
      burst(CAST_GX, CAST_GY, 22, 50, 120, 0.3, 0.6, R_EL, 12);
      for (let i = 0; i < 6; i++) plusMote(PIL_X - 2 + Math.random() * 4, HY - 3 - Math.random() * 18, -40 - Math.random() * 30, 0.45 + Math.random() * 0.3);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                          // 前推那一帧：十字形枪口光、前推拖影、射出十字光矢
      const gx = scrX(P.gx), gy = HY + P.gy;
      mzT = 0; mzX = gx; mzY = gy; smT = 0; psX0 = HX + Math.round(K_WIND.hx + Math.sin(K_WIND.a) * 6); psX1 = gx - 3; psY = gy;
      shoot(1, gx + 3, gy, 160, DUMMY_X - 3); burst(gx, gy, 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.25 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === DEATH && t === INCOMING + 0.66) {                   // 仰面落地：尘土 + 念珠断线，珠子四散弹跳
      for (let i = 0; i < 16; i++) { const x = HX - 20 + Math.random() * 24; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); }
      for (let i = 0; i < 16; i++) qSpawn(Q_BEAD, HX - 6 + Math.random() * 5, HY - 5 - Math.random() * 2, (Math.random() - 0.5) * 100, -35 - Math.random() * 45, 0.9 + Math.random() * 0.6);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
    if (s === DEATH && t === INCOMING + D_CROSS_LAND + 0.01) {    // 十字架落地：银色火星 + 少量尘
      const x = HX + 18; burst(x, HY - 2, 6, 20, 50, 0.2, 0.35, R_BEAD, 22);
      for (let i = 0; i < 4; i++) spawn(K_DUST, x - 6 + Math.random() * 12, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_DUST);
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [], [], [], [INCOMING + 0.66, INCOMING + D_CROSS_LAND + 0.01], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.25 }); }
  }
  function waveFront(dir) { const d = WV_SPD * Math.max(0, wvT); return dir > 0 ? Math.min(HX + 3 + d, DUMMY_X - 3) : Math.max(HX - 3 - d, HX - 30); }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (5 + 6 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; plusMote(HX - 11 + Math.random() * 23, HY - Math.random() * 3, -15 - Math.random() * 14, 0.8 + Math.random() * 0.5); } }   // 脚下不断上升的十字光点
    if (state === CAST) { chargeAcc += dt * 14; while (chargeAcc >= 1) { chargeAcc -= 1; plusMote(PIL_X - 2 + Math.random() * 4, HY - Math.random() * 8, -45 - Math.random() * 25, 0.45 + Math.random() * 0.25); } }
    if (state === RECOVER) { chargeAcc += dt * 7; while (chargeAcc >= 1) { chargeAcc -= 1; plusMote(HX - 8 + Math.random() * 17, HY - 2 - Math.random() * 12, -14 - Math.random() * 10, 0.6 + Math.random() * 0.4); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.2 }); stepCnt++; if (!(stepCnt & 1)) spawn(K_DUST, scrX(P.step > 0 ? 2 : 1) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, R_DUST); } lastStep = P.step; }   // 每 2 步 1 颗尘
    if (state === IDLE) { emberAcc += dt * 1.6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 2, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    if (pilT < 9) { pilT += dt; if (pilT > 1.3) pilT = 9; }
    offStep(dt);
    if (wvT < 9) {
      wvT += dt;
      if (wvT > 0) {
        const fr = waveFront(1), fl = waveFront(-1);
        if (wvT < 0.3 && Math.random() < dt * 40) spawn(K_EMBER, fl, HY - 2, -8 - Math.random() * 8, -10 - Math.random() * 10, 0.3 + Math.random() * 0.2, R_EL);
        if (!wvHit) {
          if (Math.random() < dt * 50) spawn(K_EMBER, fr, HY - 2, 8 + Math.random() * 8, -10 - Math.random() * 10, 0.3 + Math.random() * 0.2, R_EL);
          if (fr >= DUMMY_X - 6) { wvHit = 1; wvHitT = wvT; burnT = 0; burst(DUMMY_X - 1, HY - 12, 24, 50, 130, 0.3, 0.7, R_EL, 16); hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.7 }); }   // 圣焰波推到假人脚下：灼烧
        }
      }
      if (wvT > 0.9) wvT = 9;
    }
    if (burnT < 9) { burnT += dt; if (burnT < 0.8) { if (Math.random() < dt * 14) spawn(K_EMBER, DUMMY_X - 4 + Math.random() * 8, HY - 8 - Math.random() * 14, Math.random() * 6 - 3, -10 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL); } else burnT = 9; }
    for (let i = 0; i < QN; i++) {
      const k = qK[i]; if (!k) continue; qAge[i] += dt; if (qAge[i] >= qLife[i]) { qK[i] = 0; continue; }
      if (k === Q_PLUS) qVY[i] *= PLUS_DRAG;
      else { qVX[i] *= BEAD_DRAG; qVY[i] += 170 * dt; if (qY[i] + qVY[i] * dt >= HY && qVY[i] > 0) { qVY[i] = qVY[i] > 22 ? -qVY[i] * 0.45 : 0; qVX[i] *= 0.7; qY[i] = HY; continue; } }
      qX[i] += qVX[i] * dt; qY[i] += qVY[i] * dt;
    }
    smT += dt; mzT += dt;
  }
  function fxReset() { qK.fill(0); smT = 9; mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; stepCnt = 0; pilT = 9; wvT = 9; wvHit = 1; wvHitT = 0; burnT = 9; offT = 9; offAcc = 0; offHit.fill(0); }
  // 脚下椭圆点阵法阵：每 2 格一点，按角度（从正前方起）逐点亮起；上半圈画在角色后、下半圈画在角色前
  const CIRC = [], CIRC_Q = [];
  for (let dx = -12; dx <= 12; dx += 2) { const h = Math.round(3 * Math.sqrt(1 - (dx / 12) * (dx / 12))); for (const y of h ? [-h, h] : [0]) { CIRC.push(dx, y); CIRC_Q.push(((Math.atan2(y / 3, dx / 12) - Math.PI / 2) / 6.2832 + 2) % 1); } }
  function drawCircle(front, f12) {
    const state = E.state, stT = E.stT; let prog = 0, mode = 0;
    if (state === CHARGE) { prog = clamp01((stT - 0.1) / 0.9); mode = 0; } else if (state === CAST) { prog = 1; mode = 1; } else if (state === RECOVER && stT < 0.45) { prog = 1; mode = stT < 0.2 ? 2 : 3; } else return;
    const cx = HX, cy = FLOOR;
    for (let i = 0; i < CIRC_Q.length; i++) {
      const y = CIRC[i * 2 + 1]; if (front ? y <= 0 : y > 0) continue; const q = CIRC_Q[i]; if (q > prog) continue;
      let c;
      if (mode === 0) c = q > prog - 0.08 ? EL[0] : ((i + (f12 >> 1)) % 3 === 0 ? EL[1] : EL[2]);
      else if (mode === 1) c = (i + f12) % 4 === 0 ? EL[0] : EL[1];
      else if (mode === 2) c = EL[2]; else { if ((i + f12) & 1) continue; c = EL[3]; }
      put(cx + CIRC[i * 2], cy + y, c);
    }
  }
  // 光柱：3 格宽，从天顶落下（0.06 s 到地），施放期间罩住她，收招时从上往下断开。drawPillarAt 也给场外「圣咏」用（每个己方单位一道）
  function drawPillar(front, f12) { drawPillarAt(PIL_X, pilT, front, f12); }
  function drawPillarAt(X, t, front, f12) {
    if (t < 0 || t >= 0.85) return;
    const bot = Math.min(HY, Math.round(t / 0.06 * HY)), top = t > 0.5 ? Math.round((t - 0.5) / 0.32 * HY) : 0; if (top >= bot) return;
    const hot = t < 2 / 12, brk = t > 0.5;
    if (!front) {
      for (let y = top; y <= bot; y++) {
        if (brk && ((y >> 2) & 1) && ((y + f12) & 1)) continue;   // 断开时断续
        const core = hot ? EL[0] : brk ? EL[1] : ((y + f12) % 5 === 0 ? EL[0] : EL[1]);
        put(X, y, core); put(X - 1, y, hot ? EL[0] : brk ? EL[2] : EL[1]); put(X + 1, y, hot ? EL[0] : brk ? EL[2] : EL[1]);
        if (((y + f12) & 1) === 0) { put(X - 2, y, brk ? EL[3] : EL[2]); put(X + 2, y, brk ? EL[3] : EL[2]); }
        if (!brk && ((y + f12 * 2) % 6) === 0) { put(X - 3, y, EL[3]); put(X + 3, y, EL[3]); }
      }
      if (!brk) for (let x = X - 9; x <= X + 9; x++) { const d = Math.abs(x - X); if (d < 4 || ((x + f12) & 1) === 0) put(x, FLOOR, d < 3 ? EL[0] : d < 6 ? EL[1] : EL[2]); }   // 柱脚映光
    } else if (t < 0.5) {                                          // 罩在身上的一层稀疏光
      for (let y = Math.max(top, HY - 24); y <= bot; y++) for (let x = X - 1; x <= X + 1; x++) if (((x * 2 + y + f12) % 4) === 0) put(x, y, hot ? EL[0] : EL[1]);
    }
  }
  // 圣焰波：2 格高的火舌列贴地向外推进（不是圆环）：前沿最高最亮、火舌尖朝前卷，尾部变矮变暗、断续；右侧推到假人脚下后熄灭，左侧推出一段后熄灭
  function drawWave(dir, f12) {
    if (wvT >= 9 || wvT <= 0) return;
    const front = Math.round(waveFront(dir)); let dim = 0;
    if (dir > 0 && wvHit) dim = Math.floor((wvT - wvHitT) / 0.05); else if (dir < 0) dim = Math.max(0, Math.floor((wvT - 0.14) / 0.06));
    if (dim > 3) return;
    const len = 12 - dim * 3;
    for (let k = 0; k < len; k++) {
      const x = front - dir * k, hsh = (x * 7 + f12 * 5 + k * 3) & 7;
      if (k > 5 && hsh < 2) continue;
      const hh = Math.max(1, (k < 2 ? 3 : k < 8 ? 2 : 1) - (k > 1 && hsh === 3 ? 1 : 0) + (k < 2 && (f12 & 1) ? 1 : 0)), base = k === 0 ? 0 : k < 3 ? 1 : k < 6 ? 2 : 3;
      for (let j = 0; j < hh; j++) put(x + (j >= 2 ? dir : 0), HY - j, EL[Math.min(4, base + dim + (j >= 2 ? 1 : 0))]);
    }
  }
  // 假人身上的圣焰：4 簇小火苗（深绿火根 → 翠绿 → 淡绿白 → 白色焰尖），持续 0.8 s，后 0.3 s 变小变暗
  const BURN = [-3, -9, 0, 2, -14, 1, -1, -19, 2, 3, -24, 3];
  function drawBurn(f12) {
    if (burnT >= 0.8) return; const late = burnT > 0.5 ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      if (late && i === 3) continue;
      const x = DUMMY_X + BURN[i * 3], y = HY + BURN[i * 3 + 1], ph = (f12 + BURN[i * 3 + 2]) & 3, sw = ph === 1 ? 1 : ph === 3 ? -1 : 0;
      put(x - 1, y, EL[4]); put(x, y, EL[3]); put(x + 1, y, EL[4]);
      put(x - 1, y - 1, EL[3 + late]); put(x, y - 1, EL[2 + late]); put(x + 1, y - 1, EL[3 + late]);
      put(x + (sw > 0 ? 1 : 0), y - 2, EL[1 + late * 2]); put(x + (sw > 0 ? 0 : -1), y - 2, EL[3]);
      if (!late) { put(x + sw, y - 3, EL[ph === 2 ? 1 : 0]); if (ph === 0) put(x + sw, y - 4, EL[2]); }
    }
  }

  // ───── 场外「圣咏」（查看页按 7）：游戏里是全场效果，不在任何状态里 ─────
  // 每个己方单位头顶各降下一道光柱（同上场版的 drawPillar，按从左到右错开 0.08 s）、身上升起十字光点、头顶冒出薄荷色回血数字「+35%」，
  // 天空缓缓飘落白色羽毛 2 秒。演示页没有己方部队，用两个暗色占位剪影（x = 12、58）和修女自己代表「每个己方单位」
  const OFF_X = [12, HX + 1, 58], OFF_D = [0, 0.08, 0.16], OFF_TOP = [HY - 22, HY - 32, HY - 22], OFF_DUR = 2.2;
  let offT = 9, offAcc = 0; const offHit = new Uint8Array(3);
  function offField() { offT = 0; offAcc = 0; offHit.fill(0); flash(0.05); }
  function offStep(dt) {
    if (offT >= 9) return; offT += dt; if (offT > OFF_DUR) { offT = 9; return; }
    for (let k = 0; k < 3; k++) { const lt = offT - OFF_D[k]; if (!offHit[k] && lt >= 0.06) { offHit[k] = 1; burst(OFF_X[k], HY - 2, 10, 30, 70, 0.25, 0.45, R_EL, 14); } }
    offAcc += dt * 27; while (offAcc >= 1) { offAcc -= 1; const k = Math.floor(Math.random() * 3), lt = offT - OFF_D[k]; if (lt > 0.06 && lt < 0.75) plusMote(OFF_X[k] - 3 + Math.random() * 6, HY - Math.random() * 10, -30 - Math.random() * 25, 0.5 + Math.random() * 0.3); }
  }
  // 占位剪影：7 × 14 的暗色小兵（石色 9，左侧亮边 10）
  const PAWN = ['..###..', '.#####.', '.#####.', '..###..', '...#...', '.#####.', '#######', '#######', '.#####.', '.#####.', '.#####.', '.##.##.', '.##.##.', '.##.##.'];
  function drawPawn(cx) { for (let r = 0; r < 14; r++) for (let c = 0; c < 7; c++) if (PAWN[r][c] === '#') put(cx - 3 + c, HY - 13 + r, c === 0 || PAWN[r][c - 1] !== '#' ? 10 : 9); }
  // 回血数字「+35%」：3 × 5 像素字，薄荷 38 + 深绿 40 描边；出现的前 2 帧是淡绿白 37，最后 0.25 s 褪成翠绿 39、去掉描边
  const GLY = ['000010111010000', '111001011001111', '111100111001111', '101001010100101'];
  function drawHealNum(cx, y, lt) {
    const fade = lt > 0.85, fill = lt < 2 / 12 ? EL[1] : fade ? EL[3] : EL[2], x0 = cx - 7;
    for (let pass = fade ? 1 : 0; pass < 2; pass++) for (let g = 0; g < 4; g++) for (let i = 0; i < 15; i++) {
      if (GLY[g][i] !== '1') continue; const x = x0 + g * 4 + (i % 3), yy = y + Math.floor(i / 3);
      if (pass === 0) { put(x - 1, yy, EL[4]); put(x + 1, yy, EL[4]); put(x, yy - 1, EL[4]); put(x, yy + 1, EL[4]); } else put(x, yy, fill);
    }
  }
  // 白色羽毛：12 片，按固定表错开出发（x0, 延迟, 摆动相位），每片 1.3 s，左右摆 ±3 格、3 格长的羽片随摆向转向；最后 0.3 s 变灰消失
  const FEA = [8, 0.0, 0.3, 22, 0.25, 2.1, 40, 0.1, 4.0, 52, 0.4, 1.2, 66, 0.05, 5.1, 80, 0.3, 2.8, 30, 0.6, 0.9, 72, 0.7, 3.6, 16, 0.5, 4.7, 60, 0.65, 1.9, 46, 0.2, 5.9, 88, 0.45, 0.4];
  function drawFeathers() {
    const tq = q12(offT);
    for (let i = 0; i < FEA.length; i += 3) {
      const t = tq - FEA[i + 1]; if (t < 0 || t >= 1.3) continue;
      const ph = FEA[i + 2] + t * 4, x = Math.round(FEA[i] + 3 * Math.sin(ph)), y = Math.round(2 + t * 36), c = Math.cos(ph), late = t > 1.0;
      const cs = late ? pc(33) : 21, cv = late ? pc(32) : pc(33), ct = late ? pc(31) : pc(32), o = Math.abs(c) < 0.35 ? 0 : c > 0 ? 1 : -1;
      put(x, y, cs); put(x + (o === 0 ? -1 : o), y + (o === 0 ? 0 : -1), cv); put(x - (o === 0 ? -1 : o), y + (o === 0 ? 0 : 1), ct);
    }
  }
  function fxOffBack(f12) { if (offT >= 9) return; drawPawn(OFF_X[0]); drawPawn(OFF_X[2]); for (let k = 0; k < 3; k++) drawPillarAt(OFF_X[k], offT - OFF_D[k], 0, f12); }
  function fxOffFront(f12) {
    if (offT >= 9) return;
    for (let k = 0; k < 3; k++) { drawPillarAt(OFF_X[k], offT - OFF_D[k], 1, f12); const lt = offT - OFF_D[k] - 0.08; if (lt >= 0 && lt < 1.1) drawHealNum(OFF_X[k], OFF_TOP[k] - Math.round(lt * 10), lt); }
    drawFeathers();
  }

  // ───── 绘制钩子 ─────
  function fxBack(f12) {        // 画在角色后面：场外演示的占位剪影与光柱、法阵后半圈、光柱、柱脚映光、弹道映光
    fxOffBack(f12); drawCircle(0, f12); drawPillar(0, f12);
    shotFloorGlow(f12);
  }
  function fxMid(f12) { drawWave(1, f12); drawWave(-1, f12); }   // 假人前、角色后：两道圣焰波
  function fxFront(f12) {       // 画在角色前面：法阵前半圈、身上的光、圣石十字星芒、前推拖影、枪口光、假人身上的圣焰、场外演示、本角色粒子
    drawCircle(1, f12); drawPillar(1, f12);
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && !P.cf && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } if (P.gem === 3) { put(gx + 2, gy + 2, EL[1]); put(gx - 2, gy - 2, EL[1]); put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy + 2, EL[1]); } }
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[1] : EL[2]; for (let x = psX0; x <= psX1; x++) { if (smT >= 1 / 12 && (x & 1)) continue; put(x, psY - 3, c); put(x, psY + 3, c); if (x > psX1 - 3) put(x, psY, EL[0]); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { const cc = r === 1 ? c : r === 2 ? EL[1] : EL[2]; put(mzX + r, mzY, cc); put(mzX - r, mzY, cc); put(mzX, mzY - r, cc); put(mzX, mzY + r, cc); } put(mzX, mzY, EL[0]); }
    drawBurn(f12); fxOffFront(f12);
    for (let i = 0; i < QN; i++) {                               // 本角色粒子：十字光点走薄荷色阶，念珠走银色色阶
      const k = qK[i]; if (!k) continue; const q = qAge[i] / qLife[i], R = FXR[k === Q_PLUS ? R_EL : R_BEAD];
      put(Math.round(qX[i]), Math.round(qY[i]), R[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]);
    }
  }
  function drawShot(k, x, y, d) {   // 十字光矢：3×3 十字 + 1 格拖尾；敌弹用引擎默认外形
    if (k !== 1) return false;
    put(x, y, EL[0]); put(x + d, y, EL[0]); put(x - d, y, EL[1]); put(x, y - 1, EL[1]); put(x, y + 1, EL[1]); put(x - 2 * d, y, EL[2]); return true;
  }

  return {
    name: '驱魔修女', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_STONE, M_SGLOW], HIT_POINT: [1, -10], EVENTS,
    // 音效声明：布袍娇小的修女、仰面后倒；圣咏 = 圣光治疗（自建薄荷色阶，所以写 pal）
    SFX: { body: 'flesh', how: 'topple', pal: 'holy', style: 'heal', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot, offField,
  };
});
