// 钟表匠（clockmaker，英雄 · 远程领袖；领袖技能「倒带」）：佝偻老工匠，背上落地钟箱 + 发条钥匙、脑门长镜筒护目镜、身前平端的喇叭口发条铳；
// 攻击射黄铜小齿轮；技能举怀表逆时针点亮 12 刻度 → 八齿大齿轮让目标停摆定格；死亡停摆散架、齿轮弹簧崩飞；场外「倒带」= 大钟面倒转 + 快进残影（查看页按 7）。
// 从 batch-00-pilot/clockmaker/clockmaker.html（技能模板版）转成共享引擎模块：第 3 节画法原样搬来，第 4 节特效改用引擎的粒子 / 冲击环 / 震屏 / 闪白 / 敌弹 / 复活。
PCD.define('clockmaker', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, brush, bake, ease, clamp01, q12, f12of, color, fxRamp, FXR, FXI, H, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, ring, shake, flash, hitDummy, put, blitShape, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const fl = (x) => Math.floor(x + 1e-6);                       // 带容差取整（同 q12）：原版画法里的 Math.floor 一律换成它，整格边界不会因浮点误差少一格
  const easeInOut = ease.inOut, easeOut = ease.out;

  // ───── 颜色：原版色板 0–26 与共享色板相同；27–37 是本角色专属色，按原色逐个追加（下标变了，颜色不变）─────
  const OWN = ['#0a1c21', '#163842', '#265a63', '#41868c',       // 27–30 铜绿青工装（勾线 / 暗 / 基 / 亮）
    '#3e2608', '#8a5a1e', '#ffd98a',                             // 31–33 黄铜（勾线 / 暗 / 亮；基色借 14 金）
    '#cff6ee', '#9fd8c8', '#3a8f86', '#13403f'].map(color);      // 34–37 元素「倒带 · 时光青」：淡青 → 青薄荷 → 铜绿 → 墨青
  const pc = (i) => (i < 27 ? i : OWN[i - 27]);                 // 原版色板下标 → 本页下标
  const mat = (r, band, flat) => defMat(r.map(pc), band, flat);
  const R_TIME = fxRamp('clockTime', [21, 34, 35, 36, 37].map(pc)), R_BRASS = fxRamp('clockBrass', [21, 33, 14, 32, 31].map(pc));   // 倒带 · 时光青（元素）· 黄铜碎屑
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust, R_SOUL = FXI.soul;

  // ───── 材质、缓冲、姿势 ─────
  // 材质 [勾线, 暗, 基, 亮]：工装 铜绿青（主材质）· 黄铜 · 皮 · 黑漆钟箱 · 钟面 · 白发须 · 肤 · 靴 · 木托 · 红点缀 · 墨 · 镜片 · 怀表面（发光体）
  const M_SUIT = mat([27, 28, 29, 30], 2), M_SLEEVE = mat([27, 28, 29, 30], 1), M_LEG = mat([27, 28, 28, 29], 1);
  const M_BRASS = mat([31, 32, 14, 33], 1), M_LEATHER = mat([0, 20, 19, 16], 1), M_CASE = mat([0, 8, 9, 10], 1), M_FACE = mat([7, 6, 5, 17], 1);
  const M_HAIR = mat([7, 18, 17, 21], 1), M_SKIN = mat([20, 16, 15, 15], 1), M_BOOT = mat([0, 20, 19, 16], 1), M_WOOD = mat([0, 20, 19, 16], 1), M_RED = mat([11, 12, 13, 26], 1);
  const M_LEG_B = mat([27, 27, 28, 28], 1), M_BOOT_B = mat([0, 20, 20, 19], 1);   // 远侧腿、远侧靴暗一档（近侧靴用浅一档的皮色）：走路时前后脚交替读得出来
  const M_HAND = mat([20, 16, 15, 15], 1);                       // 手（和肤色同色阶；不吃轮廓光，举表时握表的手不会被描成青边）
  const M_INK = mat([0, 0, 0, 0], 1, 1), M_LENS = mat([37, 35, 34, 21], 1, 1), M_WATCH = mat([37, 36, 35, 34], 1, 1), M_GLOW = mat([34, 34, 21, 21], 1, 1);
  const R_EL = R_TIME, EL = FXR[R_EL], BR = FXR[R_BRASS], HX = 34, DUR = DEFAULT_DUR.slice();   // 远程站位
  const hero = new Sprite(84, 56, 38, 50);                        // 缓冲：脚底 = (38, 50)；放得下背箱钥匙、平端的铳、侧翻倒地 + 滑落的护目镜
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_HAND] = HERO_RIM.skip[M_WATCH] = HERO_RIM.skip[M_GLOW] = HERO_RIM.skip[M_LENS] = HERO_RIM.skip[M_INK] = HERO_RIM.skip[M_FACE] = 1;
  // 姿势参数：连续插值，按 12 fps 取样后取整。取值范围（缓存键按此编码，超出会串位）：
  //   hx -32..31 · hy -64..63（铳的握把 = 右手扳机位）· a ±π（铳的角度，0 = 平端，正 = 铳口朝下，π/32 一档）· lean / head -1..2 · back / bend 0..3（bend：惯性件 1 后甩 2 前甩）· bob 0..1
  //   fx -8..23 · fy -32..31（back = 1 时左手相对握把的位置：取表、举表、前指）· watch 0..2（0 挂腰间 1 手里合着 2 打开）· tap 0..1 · key 0..3（发条钥匙转角）· hand 0..7（背箱分针方向）
  //   pend -1..1（摆锤）· crank 0..3（铳上曲柄）· broken 0..1（钟面碎裂）
  //   beard -3..4（八字胡尖）· sway -1..2 · gem 0..7 · rim 0..3 · bx -16..15 · crouch 0..7 · lift 0..7 · hatX -16..15 · hatY 0..15（护目镜滑落）· step -1..2 · wup 0..3 · dq 0..1
  //   需要新参数时：加进 P、在 poseAt 开头重置、编进 k1 / k2（每个键的乘积必须小于 2^53，放不下就加 k3 并在 render 里一起比较），并在这里写明范围
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, k1: 0, k2: 0,
    fx: 0, fy: 0, watch: 0, tap: 0, key: 0, hand: 0, pend: 0, crank: 0, broken: 0, mzx: 0, mzy: 0 };
  // back：0 = 左手（远侧）托铳管；1 = 左手离开铳管拿怀表，位置 = 握把 + (fx, fy)。右手（近侧）始终握扳机，铳托夹在右腋下
  const K_IDLE = { hx: 5, hy: -12, a: 0.15, lean: 0, head: 0, back: 0, bend: 0, fx: 0, fy: 0 };
  const K_PEEK = { hx: 5, hy: -12, a: 0.45, lean: 0, head: 1, back: 1, bend: 0, fx: 13, fy: -4 };    // 待机个性：左手把怀表举到镜筒尖前面，铳口下垂
  const K_AIM = { hx: 5, hy: -13, a: 0.0, lean: 1, head: 1, back: 0, bend: 0, fx: 0, fy: 0 };       // 低头贴镜筒瞄准
  const K_FIRE = { hx: 4, hy: -13, a: -0.2, lean: 0, head: 0, back: 0, bend: 1, fx: 0, fy: 0 };     // 后坐 1 格、铳口上跳
  const K_CHARGE = { hx: 4, hy: -11, a: 0.45, lean: -1, head: -1, back: 1, bend: 0, fx: 7, fy: -17 }; // 左手把怀表举过头顶
  const K_CAST = { hx: 4, hy: -11, a: 0.4, lean: 1, head: 1, back: 1, bend: 2, fx: 16, fy: -3 };     // 怀表朝前一指：前臂从下巴下面伸出，表离开头部轮廓
  const K_HURT = { hx: 3, hy: -13, a: -0.3, lean: -1, head: -1, back: 0, bend: 1, fx: 0, fy: 0 };
  const K_SAG1 = { hx: 4, hy: -11, a: 0.3, lean: 1, head: 1, back: 0, bend: 0, fx: 0, fy: 0 };      // 发条走完：逐级下沉
  const K_SAG2 = { hx: 4, hy: -10, a: 0.5, lean: 1, head: 2, back: 0, bend: 0, fx: 0, fy: 0 };
  const K_SAG3 = { hx: 4, hy: -9, a: 0.7, lean: 2, head: 2, back: 0, bend: 2, fx: 0, fy: 0 };
  function mixPose(A, B, q) { P.hx = A.hx + (B.hx - A.hx) * q; P.hy = A.hy + (B.hy - A.hy) * q; P.a = A.a + (B.a - A.a) * q; P.lean = A.lean + (B.lean - A.lean) * q; P.head = A.head + (B.head - A.head) * q; P.back = A.back + (B.back - A.back) * q; P.bend = A.bend + (B.bend - A.bend) * q; P.fx = A.fx + (B.fx - A.fx) * q; P.fy = A.fy + (B.fy - A.fy) * q; }
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, -1, 0, 1], WALK_DIST = 14;   // 行走循环：接触 → 经过 → 接触 → 经过
  const GAIT_F = [0, 0, 0, 1, 1, 2, 2, 2, 3, 3], GAIT_C = [0, 1, 1, 2, 3, 4, 5, 5, 6, 7];   // 发条顿步：每个 0.8 s 半程 = 10 个 12 fps 刻度 → 接触A 3 · 经过 2 · 接触B 3 · 经过 2；接触帧多停 1 帧，停的那一拍不前进（GAIT_C 为累计前进刻度）
  const GLOW_MATS = [M_WATCH, M_GLOW], HIT_POINT = [2, -14];     // 发光体材质（怀表面）、受击点（本地坐标）
  const WAIST_X = -1, WAIST_Y = -7;                               // 腰间怀表中心
  const T_FIRE = 2 / 12, T_SHATTER = INCOMING + 0.7, T_LAND = INCOMING + 0.95;
  const DIR8 = [0, -1, 1, -1, 1, 0, 1, 1, 0, 1, -1, 1, -1, 0, -1, -1];   // 钟面指针 8 个方向（0 = 12 点，顺时针）
  function poseAt(st, t, T) {
    const tq = q12(t), fs = f12of(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 0;
    P.fx = 0; P.fy = 0; P.watch = 0; P.tap = 0; P.key = 0; P.hand = 0; P.pend = 0; P.crank = 0; P.broken = 0;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = fl(TT * 2.5); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[fl(TT * 1.25) & 3]; P.pend = (b & 1) ? 1 : -1;
      const li = Math.round((tq % DUR[IDLE]) * 12);             // 待机个性：取出怀表、举到镜筒前、弹开、敲两下、合上放回
      if (li === 7) P.glint = 1;                                 // 护目镜镜筒尖反光一帧
      if (li >= 14 && li <= 25) {
        if (li === 14 || li === 25) { P.back = 1; P.fx = -4; P.fy = 2; P.a = 0.3; }   // 左手到腰间解下 / 挂回怀表
        else if (li === 15 || li === 24) mixPose(K_IDLE, K_PEEK, 0.55);
        else mixPose(K_PEEK, K_PEEK, 0);
        P.watch = li >= 17 && li <= 22 ? 2 : 1;
        P.gem = P.watch === 2 ? 1 : 0; P.rim = P.watch === 2 ? 1 : 0; P.tap = li === 20 || li === 22 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 发条顿步：迈一步停一拍，钥匙每步转 1/4 圈
      mixPose(K_IDLE, K_IDLE, 0);
      const half = DUR[MOVE] / 2, back = tq >= half, fi = Math.min(9, fl((back ? tq - half : tq) * 12 + 1e-6)), f = GAIT_F[fi];
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f];
      P.a = K_IDLE.a + P.step * ASTEP; P.pend = P.step; P.key = ((fi >= 5 ? 1 : 0) + (back ? 2 : 0)) & 3;   // 第二次接触时钥匙转 1/4 圈
      const q = GAIT_C[fi] / GAIT_C[9]; if (!back) P.mx = Math.round(WALK_DIST * q); else { P.flip = 1; P.mx = Math.round(WALK_DIST * (1 - q)); }
    }
    else if (st === ATTACK) {
      if (tq < 0.12) { mixPose(K_IDLE, K_AIM, easeOut(tq / 0.12)); P.crank = fs; }
      else if (tq < 0.2) { mixPose(K_FIRE, K_FIRE, 0); P.bx = -1; P.beard = -1; P.sway = -1; P.crank = 2; }
      else if (tq < 0.45) { mixPose(K_FIRE, K_AIM, easeOut((tq - 0.2) / 0.25)); P.bx = tq < 0.3 ? -1 : 0; P.crank = 3; P.beard = -1; }
      else { mixPose(K_AIM, K_IDLE, easeInOut(clamp01((tq - 0.45) / 0.3))); }
    } else if (st === CHARGE) {
      const tt = fs === 5 || fs === 9 ? tq - 2 / 12 : tq;         // 倒放感：第 5、9 帧动作回跳 2 帧
      const q = easeInOut(clamp01(tt / 0.7)); mixPose(K_IDLE, K_CHARGE, q);
      P.watch = fs < 1 ? 0 : q > 0.3 ? 2 : 1; P.back = P.watch ? 1 : 0; P.gem = tq < 0.3 ? 0 : tq < 0.5 ? 1 : tq < 1.15 ? ((f12 & 1) ? 2 : 1) : 2; P.rim = tq < 0.3 ? 1 : 2;
      P.hand = (8 - (fs % 8)) & 7; P.key = (4 - (fs & 3)) & 3; P.pend = (fs & 1) ? 1 : -1;   // 背箱分针飞速倒转、钥匙倒拧、摆锤急摆
      P.beard = q > 0.9 && (f12 & 1) ? -1 : 0; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {
      if (tq < 1 / 12) mixPose(K_CHARGE, K_CAST, 0.5); else mixPose(K_CAST, K_CAST, 0);
      P.watch = 2; P.gem = 3; P.rim = 3; P.beard = -1; P.sway = -1; P.hand = 0; P.key = 0;   // 停摆：背箱分针停在 12 点
    } else if (st === RECOVER) {
      const q = easeInOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q);
      P.watch = tq < 0.25 ? 2 : q < 0.8 ? 1 : 0; P.back = P.watch ? 1 : 0; P.gem = tq < 0.17 ? 2 : tq < 0.25 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
      P.hand = fs & 7; P.key = fs & 3; P.pend = (fs & 1) ? -1 : 1; P.beard = q < 0.5 ? -1 : 0;   // 快进：分针顺时针快转、钥匙正拧
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.sway = 1; P.pend = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = -1; P.pend = -1; }
      else mixPose(K_HURT, K_IDLE, easeInOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                  // 停摆散架：逐帧变慢 → 定格 → 钟面碎裂 → 侧翻倒地 → 护目镜滑落 → 怀表熄灭 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.25) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.key = 1; P.hand = 3; P.pend = 1; }
      else if (d < 0.33) { mixPose(K_SAG1, K_SAG1, 0); P.bx = -2; P.eyes = 1; P.crouch = 1; P.key = 2; P.hand = 2; P.pend = -1; P.sway = -1; }
      else if (d < 0.5) { mixPose(K_SAG2, K_SAG2, 0); P.bx = -2; P.eyes = 1; P.crouch = 2; P.key = 3; P.hand = 1; P.pend = 0; }
      else if (d < 0.78) { mixPose(K_SAG3, K_SAG3, 0); P.bx = -2; P.eyes = 1; P.crouch = 3; P.key = 3; P.hand = 1; P.pend = 0; P.broken = d >= 0.66 ? 1 : 0; }
      else {
        mixPose(K_SAG3, K_SAG3, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.broken = 1; P.lift = d < 0.83 ? 3 : d < 0.9 ? 1 : 0;
        const hq = clamp01((d - 0.95) / 0.25); P.hatX = Math.round(4 * hq); P.hatY = Math.round(Math.sin(hq * Math.PI) * 2);
        P.gem = d < 1.0 ? 2 : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP; P.fx = Math.round(P.fx); P.fy = Math.round(P.fy);
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    // 发光体（怀表面）与铳口的位置
    if (P.lying) { P.gx = 5 + P.bx; P.gy = -2 - P.lift; P.mzx = 0; P.mzy = 0; }
    else {
      if (P.watch) { P.gx = P.hx + P.fx + 1 + P.bx; P.gy = P.hy + P.fy - 4; } else { P.gx = WAIST_X + P.bx; P.gy = WAIST_Y + P.crouch; }
      const ca = Math.cos(P.a), sa = Math.sin(P.a), ox = P.hx + sa, oy = P.hy - ca; P.mzx = Math.round(ox + ca * 11.5) + P.bx; P.mzy = Math.round(oy + sa * 11.5 - 0.5);
    }
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.back; k = k * 4 + P.bend; k = k * 2 + P.bob;
    k = k * 32 + P.fx + 8; k = k * 64 + P.fy + 32; k = k * 4 + P.watch; k = k * 2 + P.tap; k = k * 4 + P.key; k = k * 8 + P.hand; k = k * 4 + P.pend + 1; k = k * 4 + P.crank; k = k * 2 + P.broken; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }
  // ───── 绘制小工具：两段式 IK、细肢、袖子、铳的局部坐标 ─────
  let IKX = 0, IKY = 0;
  function ik(sx, sy, ex, ey, L1, L2, px0, py0) {             // 关节（肘 / 膝）朝 (px0, py0) 一侧弯
    const dx = ex - sx, dy = ey - sy, d = Math.hypot(dx, dy) || 1;
    if (d >= L1 + L2 - 0.01) { IKX = sx + dx * L1 / (L1 + L2); IKY = sy + dy * L1 / (L1 + L2); return; }
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    let px = -dy / d, py = dx / d; if (px * px0 + py * py0 < 0) { px = -px; py = -py; }
    IKX = sx + dx * a / d + px * h; IKY = sy + dy * a / d + py * h;
  }
  function limb2(x0, y0, x1, y1, m, t) {                        // 2 格粗的细腿
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2)), hor = Math.abs(dx) > Math.abs(dy);
    for (let i = 0; i <= n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n; sp(x, y, m, t); if (hor) sp(x, y + 1, m, t); else sp(x + 1, y, m, t); }
  }
  function sleeve(x0, y0, x1, y1, r0, r1, m) { for (let s = 0; s <= 1.001; s += 0.125) brush(x0 + (x1 - x0) * s, y0 + (y1 - y0) * s, r0 + (r1 - r0) * s, m, 0); }
  let GCA = 1, GSA = 0, GOX = 0, GOY = 0;
  function gunFrame() { GCA = Math.cos(P.a); GSA = Math.sin(P.a); GOX = P.hx + GSA; GOY = P.hy - GCA; }   // 铳的中轴线从握把上方 1 格穿过
  function gp(u, v, m, t) { sp(GOX + GCA * u - GSA * v, GOY + GSA * u + GCA * v, m, t); }
  function gRect(u0, u1, v0, v1, m, t) { for (let u = u0; u <= u1 + 0.001; u += 0.5) for (let v = v0; v <= v1 + 0.001; v += 0.5) gp(u, v, m, t); }
  // 驼背上身：[行（相对肩线）, 左, 右]（lean 时上面的行前移）
  const TORSO = [-3, -3, -1, -2, -4, 1, -1, -4, 3, 0, -4, 5, 1, -4, 5, 2, -4, 5, 3, -4, 5, 4, -4, 4, 5, -3, 4, 6, -3, 4, 7, -3, 3, 8, -3, 3, 9, -3, 3];
  const APRON = [2, 2, 5, 3, 1, 5, 4, 1, 5, 5, 0, 5, 6, 0, 5, 7, 0, 4, 8, -1, 4, 9, -1, 4];   // 皮围裙：[行, 左, 右]，胯线以下另画到 y = -7
  const HEADD = [0, -1, 0, 0, 1, 1, 1, 2];                         // head -1..2 → 头的 [dx, dy]
  const KEYB = [                                                   // 发条钥匙 4 个转角：每相位 3 行 [行, 左, 右, ...]
    [-3, -3, -2, -3, 2, 3, -2, -3, 3, -1, -1, 1],
    [-3, -3, -2, -3, 2, 2, -2, -3, 2, -1, -1, 1],
    [-3, -1, 0, -2, -1, 0, -1, 0, 0],
    [-3, -2, -2, -3, 2, 3, -2, -2, 3, -1, -1, 1],
  ];
  function drawKey(X, Y) {                                         // (X, Y) = 钥匙杆底部
    sp(X, Y, M_BRASS, 2); const b = KEYB[P.key], tilt = P.bend === 1 ? -1 : P.bend === 2 ? 1 : 0;
    for (let i = 0; i < b.length; i += 3) run(Y + b[i], X + b[i + 1] + (b[i] === -3 ? tilt : 0), X + b[i + 2] + (b[i] === -3 ? tilt : 0), M_BRASS, 0);
    sp(X + (P.key === 2 ? 0 : -2) + tilt, Y - 3, M_BRASS, 4);
  }
  function drawDial(X, Y, hand, broken) {                          // 7×7 钟面：铜圈、奶白面、刻度、分针 / 时针、中心轴
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d2 = i * i + j * j; if (d2 <= 10) sp(X + i, Y + j, d2 >= 7 ? M_BRASS : M_FACE, 0); }
    sp(X, Y - 2, M_FACE, 1); sp(X + 2, Y, M_FACE, 1); sp(X, Y + 2, M_FACE, 1); sp(X - 2, Y, M_FACE, 1);
    const hx = DIR8[hand * 2], hy = DIR8[hand * 2 + 1]; sp(X + hx, Y + hy, M_INK, 1); sp(X + 2 * hx, Y + 2 * hy, M_INK, 1);   // 分针：从中心出发 2 格
    let hr = (hand + 2) & 7; if (DIR8[hr * 2] === -hx && DIR8[hr * 2 + 1] === hy) hr = (hr + 1) & 7;                  // 时针 1 格：落后分针 90°，和分针关于竖轴对称时再错一格（不能像一对眼睛）
    sp(X + DIR8[hr * 2], Y + DIR8[hr * 2 + 1], M_INK, 1); sp(X, Y, M_BRASS, 4);
    if (broken) { sp(X - 1, Y - 2, M_CASE, 2); sp(X - 1, Y - 1, M_CASE, 2); sp(X - 2, Y, M_CASE, 2); sp(X - 1, Y + 1, M_CASE, 2); sp(X - 1, Y + 2, M_CASE, 2); sp(X - 2, Y - 1, M_HAIR, 4); }   // 玻璃裂：左半边一条折线裂纹 + 1 格反光
  }
  function drawCase(X, Y) {                                        // 落地钟式发条背箱：(X, Y) = 钟面中心
    part();
    run(Y - 5, X - 3, X + 3, M_CASE, 0); for (let y = Y - 4; y <= Y + 4; y++) run(y, X - 4, X + 4, M_CASE, 0);   // 圆拱顶 + 钟头
    run(Y + 5, X - 4, X + 4, M_BRASS, 0);                                                                         // 腰线铜条
    for (let y = Y + 6; y <= Y + 12; y++) run(y, X - 3, X + 3, M_CASE, 0);                                        // 箱身
    run(Y + 13, X - 4, X + 4, M_CASE, 0); sp(X - 4, Y + 13, M_BRASS, 3); sp(X + 4, Y + 13, M_BRASS, 2); run(Y + 14, X - 4, X + 4, M_CASE, 0);   // 底座（黑漆，两角铜包角）
    sp(X - 3, Y - 5, M_BRASS, 3); sp(X + 3, Y - 5, M_BRASS, 3); sp(X - 4, Y - 4, M_BRASS, 3); sp(X + 4, Y - 4, M_BRASS, 2);   // 拱顶铜角
    for (let y = Y + 7; y <= Y + 11; y++) run(y, X - 1, X + 1, M_CASE, 1);                                         // 摆锤窗
    sp(X, Y + 7, M_BRASS, 2); sp(X + (P.pend > 0 ? 1 : 0), Y + 8, M_BRASS, 2); sp(X + P.pend, Y + 9, M_BRASS, 2); sp(X + P.pend, Y + 10, M_BRASS, 4);   // 摆锤
    drawDial(X, Y, P.hand, P.broken);
    if (P.broken) { sp(X - 4, Y - 4, M_BRASS, 4); sp(X - 5, Y - 5, M_BRASS, 3); sp(X - 4, Y - 6, M_BRASS, 4); sp(X - 5, Y - 7, M_BRASS, 3); sp(X - 6, Y - 8, M_BRASS, 4); }   // 崩出的弹簧
    if (P.broken) sp(X, Y - 6, M_BRASS, 2); else drawKey(X, Y - 6);   // 散架时钥匙崩飞，只剩钥匙杆
  }
  function drawGun() {                                            // 黄铜发条铳：木托、机匣（小钟面 + 曲柄）、两道箍、铳管、喇叭口
    part(); gunFrame();
    gRect(-5, -1, 0, 1, M_WOOD, 0); gp(-5, -1, M_WOOD, 0);
    gRect(-1, 3, -1, 1, M_BRASS, 0); gRect(4, 8.5, -1, 0, M_BRASS, 0);
    gRect(9, 9, -1.5, 0.5, M_BRASS, 0); gRect(10, 10, -2.5, 1.5, M_BRASS, 0); gp(10, -0.5, M_BRASS, 2);
    gp(5.5, -1, M_BRASS, 2); gp(5.5, 0, M_BRASS, 2); gp(7.5, -1, M_BRASS, 2); gp(7.5, 0, M_BRASS, 2);
    gp(1, -1, M_FACE, 0); gp(2, -1, M_FACE, 0); gp(1, 0, M_FACE, 0); gp(2, 0, M_FACE, 0); gp(1, -1, M_INK, 1);
    gp(0, -2, M_BRASS, 2); const CK = [-1, -2, 0, -3, 1, -2, 0, -2]; gp(CK[P.crank * 2], CK[P.crank * 2 + 1], M_BRASS, 4);
  }
  function drawChain(hx, hy) {                                    // 表链：从腰带扣到怀表顶（画在后臂那一层，被身体挡住的部分自然看不见）
    const bx0 = 0, by0 = -10 + P.crouch, ex = hx, ey = hy - 5, n = Math.max(1, Math.round(Math.hypot(ex - bx0, ey - by0)));
    for (let i = 1; i < n; i += 2) { const q = i / n; sp(bx0 + (ex - bx0) * q + Math.sin(q * 3.1416) * 1.5, by0 + (ey - by0) * q, M_BRASS, 3); }
  }
  function drawWatch() {                                          // 怀表（发光体）；最后画
    part(); const c = P.crouch;
    if (!P.watch) {                                               // 挂在腰间：3×3 合着的表 + 表冠 + 腰带扣
      const X = WAIST_X + P.sway, Y = WAIST_Y + c;
      sp(0, -10 + c, M_BRASS, 3); sp(X, Y - 2, M_BRASS, 3); rect(X - 1, Y - 1, 3, 3, M_BRASS, 0); sp(X - 1, Y - 1, M_BRASS, 2); sp(X + 1, Y + 1, M_BRASS, 2); sp(X, Y, M_BRASS, 4);
      return;
    }
    const hx = P.hx + P.fx, hy = P.hy + P.fy, X = hx - 1, Y = hy - 5;   // 左手（2×2）在表下面托着，整只手露出来
    sp(X + 1, Y - 1, M_BRASS, 3);
    run(Y, X + 1, X + 2, M_BRASS, 0); run(Y + 1, X, X + 3, M_BRASS, 0); run(Y + 2, X, X + 3, M_BRASS, 0); run(Y + 3, X + 1, X + 2, M_BRASS, 0);
    if (P.watch === 2) {
      sp(X - 1, Y, M_BRASS, 4); sp(X - 2, Y + 1, M_BRASS, 3); sp(X - 2, Y + 2, M_BRASS, 3); sp(X - 1, Y + 3, M_BRASS, 2);   // 弹开的表盖
      const L = WATCH_LV[P.gem]; sp(X + 1, Y + 1, L[0], L[1]); sp(X + 2, Y + 1, L[2], L[3]); sp(X + 1, Y + 2, L[4], L[5]); sp(X + 2, Y + 2, L[6], L[7]);
      if (P.gem < 3) sp(X + 1, Y + 1, M_INK, 1);                 // 表针
    } else { sp(X + 1, Y + 1, M_BRASS, 4); sp(X + 2, Y + 2, M_BRASS, 2); }
    if (P.tap) sp(X + 2, Y + 1, M_HAND, 0); else sp(X + 3, Y + 3, M_HAND, 0);   // 敲表的拇指
  }
  const WATCH_LV = [
    [M_WATCH, 2, M_WATCH, 2, M_WATCH, 1, M_WATCH, 1],
    [M_WATCH, 4, M_WATCH, 3, M_WATCH, 3, M_WATCH, 2],
    [M_GLOW, 3, M_WATCH, 4, M_WATCH, 4, M_WATCH, 3],
    [M_GLOW, 3, M_GLOW, 3, M_GLOW, 3, M_WATCH, 4],
    [M_WATCH, 1, M_WATCH, 1, M_WATCH, 2, M_WATCH, 1],             // 熄灭
  ];
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const lean = P.lean, c = P.crouch, bob = P.bob, yS = -18 + bob + c, yH = -9 + c;
    drawCase(-7 + Math.round(lean * 0.5), -23 + bob + c);         // 背箱：压在驼背上，下半截被身体挡住
    gunFrame();
    const hold = P.back === 1, bhx = hold ? P.hx + P.fx : Math.round(GOX + GCA * 6 - GSA * 1.5), bhy = hold ? P.hy + P.fy : Math.round(GOY + GSA * 6 + GCA * 1.5);
    part();                                                     // 后臂（左手）：托铳管，或拿着怀表（手臂从头和身体后面过）
    const bsx = lean, bsy = -17 + bob + c; ik(bsx, bsy, bhx, bhy, 5, 7, hold ? 0.3 : -0.3, 1);
    sleeve(bsx, bsy, IKX, IKY, 1, 0.9, M_SLEEVE); sleeve(IKX, IKY, bhx - 1, bhy, 0.9, 0.9, M_SLEEVE);
    if (hold) { rect(bhx - 1, bhy - 1, 2, 2, M_HAND, 0); if (P.watch) drawChain(bhx, bhy); } else rect(bhx - 1, bhy, 2, 2, M_HAND, 0);
    // 走路：两腿对称摆幅，接触A 近侧 +1 / 远侧 -5，接触B 远侧 +1 / 近侧 -5，经过帧并到 -2 并抬起一只脚；待机保持原站姿（近侧 0 / 远侧 -4）
    const fbx = P.walk ? Math.round(-2 + P.step * 3) : 0, bbx = P.walk ? Math.round(-2 - P.step * 3) : -4, upF = P.wup === 1 ? 1 : 0, upB = P.wup === 2 ? 1 : 0;
    part();                                                     // 后腿：细、微屈
    ik(-2, yH, bbx + 1, -2 - upB, 4, 4.5, 1, 0); limb2(-2, yH, IKX, IKY, M_LEG_B, 0); limb2(IKX, IKY, bbx + 1, -2 - upB, M_LEG_B, 0);
    rect(bbx, -1 - upB, 3, 2, M_BOOT_B, 0); sp(bbx + 3, -upB, M_BOOT_B, 0);
    part();                                                     // 前腿
    ik(0, yH, fbx + 1, -2 - upF, 4, 4.5, 1, 0); limb2(0, yH, IKX, IKY, M_LEG, 0); limb2(IKX, IKY, fbx + 1, -2 - upF, M_LEG, 0);
    rect(fbx, -1 - upF, 3, 2, M_BOOT, 0); sp(fbx + 3, -upF, M_BOOT, 0);
    part();                                                     // 驼背上身：工装、背带（斜过肩 + 铜扣）、后背缝线、腰带、红领巾
    for (let i = 0; i < TORSO.length; i += 3) { const r = TORSO[i], xs = Math.round(lean * (9 - r) / 10), y = yS + r - (r > 4 ? bob : 0); run(y, TORSO[i + 1] + xs, TORSO[i + 2] + xs, M_SUIT, 0); }
    for (let i = 0; i < STRAP.length; i += 2) { const r = STRAP[i], xs = Math.round(lean * (9 - r) / 10); sp(STRAP[i + 1] + xs, yS + r, M_LEATHER, 0); }
    sp(1 + Math.round(lean * 0.9), yS + 1, M_BRASS, 4);
    for (let y = yS + 3; y <= yH - 2; y += 2) sp(-2, y, M_SUIT, 2);
    run(yH - 1, -4, 0, M_LEATHER, 0);
    sp(4 + lean, yS, M_RED, 0); sp(5 + lean, yS, M_RED, 0); sp(5 + lean, yS + 1, M_RED, 2);
    part();                                                     // 皮围裙：胸兜、口袋、螺丝刀、缝线、下摆
    for (let i = 0; i < APRON.length; i += 3) { const r = APRON[i], xs = Math.round(lean * (9 - r) / 10), y = yS + r - (r > 4 ? bob : 0); run(y, APRON[i + 1] + xs, APRON[i + 2] + xs, M_LEATHER, 0); }
    for (let y = yH + 1; y <= -7; y++) { const s = y === -7 ? P.sway : 0; run(y, -1 + s, 4 + s, M_LEATHER, 0); if (y === -7) for (let x = 0; x <= 3; x++) if (((x + P.sway) & 1) === 0) sp(x + s, y, M_LEATHER, 2); }
    for (let y = yS + 4; y <= yH; y += 2) sp(Math.round(lean * (9 - (y - yS)) / 10) + (y - yS > 5 ? 0 : 1), y, M_LEATHER, 2);
    run(yH - 1, 1, 3, M_LEATHER, 1); sp(1, yH, M_LEATHER, 2); sp(3, yH, M_LEATHER, 2); run(yH + 1, 1, 3, M_LEATHER, 2);
    sp(2, yH - 2, M_RED, 0); sp(2, yH - 3, M_RED, 4);
    const hd = P.head + 1, hl = 4 + lean + HEADD[hd * 2], hb = yS + 1 + HEADD[hd * 2 + 1];
    part();                                                     // 头（同一部件里画须和护目镜，小脸上不压分界线）：秃顶、一圈白发、耳、浓眉、眼、大鼻头、八字胡、护目镜
    for (let y = hb - 5; y <= hb; y++) run(y, hl + (y === hb - 5 || y === hb ? 1 : 0), hl + 5 - (y === hb - 5 ? 1 : 0), M_SKIN, 0);
    sp(hl + 2, hb - 5, M_FACE, 3);
    run(hb - 3, hl - 1, hl + 1, M_HAIR, 0); run(hb - 2, hl, hl + 1, M_HAIR, 0); run(hb - 1, hl, hl + 1, M_HAIR, 0); sp(hl + 1, hb - 4, M_HAIR, 3); sp(hl - 1, hb - 3, M_HAIR, 3);
    sp(hl + 2, hb - 3, M_SKIN, 1); sp(hl + 3, hb - 2, M_SKIN, 2);
    run(hb - 4, hl + 3, hl + 6, M_HAIR, 4);
    if (P.eyes) { sp(hl + 4, hb - 3, M_SKIN, 1); sp(hl + 5, hb - 3, M_SKIN, 1); } else { sp(hl + 4, hb - 3, M_INK, 1); sp(hl + 5, hb - 3, M_SKIN, 4); }
    sp(hl + 6, hb - 3, M_SKIN, 3); sp(hl + 6, hb - 2, M_SKIN, 3); sp(hl + 7, hb - 2, M_SKIN, 3); sp(hl + 7, hb - 3, M_SKIN, 2);
    const bt = P.beard;                                         // 翘起的白色八字胡：近侧往后翘，远侧从鼻前翘出；尖端随动作摆
    run(hb - 1, hl + 3, hl + 7, M_HAIR, 0); run(hb, hl + 4, hl + 6, M_HAIR, 2);
    sp(hl + 2, hb - 1 - (bt > 0 ? 1 : 0), M_HAIR, 3); sp(hl + 8, hb - 2 - (bt > 0 ? 1 : 0) + (bt < 0 ? 1 : 0), M_HAIR, 4); sp(hl + 8, hb - 1, M_HAIR, 3);
    const tb = P.bend === 1 ? -1 : P.bend === 2 ? 1 : 0;       // 护目镜：绑带、镜杯 + 小副镜片、向前伸 3 格的长镜筒（惯性：尖端上甩 / 下垂）
    sp(hl + 1, hb - 6, M_LEATHER, 0); sp(hl + 2, hb - 6, M_LEATHER, 0); sp(hl, hb - 5, M_LEATHER, 0); sp(hl - 1, hb - 4, M_LEATHER, 0);
    rect(hl + 3, hb - 7, 3, 3, M_BRASS, 0); sp(hl + 4, hb - 6, M_LENS, P.glint ? 4 : 3); sp(hl + 3, hb - 8, M_BRASS, 0); sp(hl + 4, hb - 8, M_LENS, 2);
    for (let i = 6; i <= 10; i++) { const d = i >= 9 ? tb : 0; sp(hl + i, hb - 7 + d, M_BRASS, i === 8 ? 2 : 0); sp(hl + i, hb - 6 + d, M_BRASS, i === 8 ? 2 : 0); }   // 长镜筒：比鼻尖多伸出 3 格，中间一道箍
    sp(hl + 11, hb - 7 + tb, M_LENS, P.glint ? 4 : 3); sp(hl + 11, hb - 6 + tb, M_LENS, 2);
    drawGun();
    part();                                                     // 前臂（右手）→ 皮护腕 → 握扳机的手；铳托夹在腋下
    const fsx = 2 + lean, fsy = -17 + bob + c, hx = P.hx, hy = P.hy;
    ik(fsx, fsy, hx, hy, 5, 6.5, -0.4, 1);
    const ux = hx - IKX, uy = hy - IKY, ul = Math.hypot(ux, uy) || 1, wx = hx - ux / ul * 1.6, wy = hy - uy / ul * 1.6;
    sleeve(fsx, fsy, IKX, IKY, 1.1, 0.95, M_SLEEVE); sleeve(IKX, IKY, wx, wy, 0.95, 0.9, M_SLEEVE);
    part(); brush(wx, wy, 0.9, M_LEATHER, 0);
    part(); rect(hx - 1, hy - 1, 2, 2, M_HAND, 0);
    drawWatch();
  }
  const STRAP = [-3, -2, -2, -1, -1, 0, 0, 1, 1, 1, 2, 2, 3, 2, 4, 3];   // 背带：[行, x]，从驼峰斜过肩到胸前
  // 倒地姿：像上完发条的玩偶整个向前侧翻——脚在左、头在右、背箱压在背上（钟面碎、弹簧崩出、钥匙已崩飞），铳掉在身前，怀表摔开在身下，护目镜滑落
  function drawLying() {
    part();                                                     // 掉在身前地上的铳
    rect(19, -2, 5, 2, M_WOOD, 0); rect(23, -3, 5, 3, M_BRASS, 0); rect(28, -3, 5, 2, M_BRASS, 0); run(-4, 33, 33, M_BRASS, 0); rect(33, -3, 1, 3, M_BRASS, 0); rect(34, -4, 1, 5, M_BRASS, 0);
    sp(25, -3, M_FACE, 0); sp(26, -3, M_FACE, 0); sp(25, -3, M_INK, 1); sp(30, -3, M_BRASS, 2); sp(30, -2, M_BRASS, 2);
    part();                                                     // 两条细腿：膝盖朝下弯，靴底朝左
    limb2(1, -6, -3, -5, M_LEG, 0); limb2(-3, -5, -6, -7, M_LEG, 0); rect(-8, -9, 2, 3, M_BOOT, 0); sp(-7, -6, M_BOOT, 0);
    part();
    limb2(1, -3, -2, -1, M_LEG, 0); limb2(-2, -1, -6, -3, M_LEG, 0); rect(-8, -4, 2, 3, M_BOOT, 0); sp(-7, -1, M_BOOT, 0);
    part();                                                     // 侧躺的上身（背朝上）+ 围裙露在下沿
    run(-7, 3, 8, M_SUIT, 0); for (let y = -6; y <= -2; y++) run(y, 0, 10, M_SUIT, 0); run(-1, 1, 10, M_SUIT, 0);
    run(-1, 2, 9, M_LEATHER, 0); run(-2, 3, 8, M_LEATHER, 2); sp(5, -1, M_RED, 0);
    run(-5, 1, 1, M_LEATHER, 0); run(-4, 1, 1, M_LEATHER, 0); sp(4, -4, M_SUIT, 2); sp(6, -4, M_SUIT, 2);
    part(); sleeve(7, -4, 10, -1, 1, 0.9, M_SLEEVE); rect(10, -1, 2, 2, M_SKIN, 0);      // 压在身下的手臂
    part();                                                     // 脸朝下的头：秃顶朝右，白发朝上，八字胡贴地
    for (let y = -6; y <= -1; y++) run(y, 10, 15 - (y === -6 || y === -1 ? 1 : 0), M_SKIN, 0);
    run(-6, 11, 13, M_HAIR, 0); run(-5, 11, 12, M_HAIR, 0); sp(15, -4, M_FACE, 3); sp(12, -4, M_SKIN, 2);
    sp(13, -2, M_SKIN, 1); sp(14, -2, M_SKIN, 1); run(-3, 13, 15, M_HAIR, 4); sp(14, 0, M_SKIN, 3);
    part(); run(-1, 10, 13, M_HAIR, 0); run(0, 11, 13, M_HAIR, 0); sp(9, -1, M_HAIR, 3);    // 八字胡
    part();                                                     // 压在背上的背箱：底座在左、钟头在右，钟面碎裂、弹簧崩出、钥匙朝右
    for (let x = -1; x <= 16; x++) { const hood = x >= 8; for (let y = hood ? -15 : -14; y <= (hood ? -7 : -8); y++) sp(x, y, x === -1 || x === 7 ? M_BRASS : M_CASE, 0); }
    sp(17, -14, M_CASE, 0); for (let y = -13; y <= -9; y++) sp(17, y, M_CASE, 0);
    for (let x = 1; x <= 5; x++) { sp(x, -12, M_CASE, 1); sp(x, -11, M_CASE, 1); } sp(3, -11, M_BRASS, 4); sp(2, -11, M_BRASS, 2);
    drawDial(12, -11, 2, 1);
    sp(10, -15, M_BRASS, 4); sp(9, -16, M_BRASS, 3); sp(10, -17, M_BRASS, 4); sp(9, -18, M_BRASS, 3); sp(10, -19, M_BRASS, 4);   // 弹簧
    sp(18, -11, M_BRASS, 2);                                    // 钥匙已经崩飞（落在身后地上），只剩钥匙杆，头和护目镜上方空出来
    part();                                                     // 滑落的护目镜
    const gx = 15 + P.hatX, gy = -5 + Math.round(P.hatX * 0.75) - P.hatY;
    sp(gx - 1, gy + 1, M_LEATHER, 0); rect(gx, gy - 1, 3, 3, M_BRASS, 0); sp(gx + 1, gy, M_LENS, 3); run(gy - 1, gx + 3, gx + 4, M_BRASS, 0); run(gy, gx + 3, gx + 4, M_BRASS, 0); sp(gx + 5, gy - 1, M_LENS, 3); sp(gx + 5, gy, M_LENS, 2);
    part();                                                     // 摔开的怀表（发光体：闪烁后熄灭）
    const L = WATCH_LV[P.gem]; run(-3, 4, 5, M_BRASS, 0); run(-2, 3, 6, M_BRASS, 0); run(-1, 3, 6, M_BRASS, 0); run(0, 4, 5, M_BRASS, 0);
    sp(4, -2, L[0], L[1]); sp(5, -2, L[2], L[3]); sp(4, -1, L[4], L[5]); sp(5, -1, L[6], L[7]); sp(2, -3, M_BRASS, 3); sp(2, -4, M_BRASS, 4);
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效 ─────
  // 蓄力汇聚粒子：螺旋逆时针收进怀表后也逆时针环绕（引擎的环绕粒子只会顺时针转），所以放在本模块的小池里，施放时逐颗换成引擎的外爆粒子
  const SN = 120, S_SPIRAL = 1, S_ORBIT = 2, sK = new Uint8Array(SN), sX = new Float32Array(SN), sY = new Float32Array(SN), sV = new Float32Array(SN), sA = new Float32Array(SN), sR = new Float32Array(SN), sW = new Float32Array(SN);
  let sHead = 0;
  function sSpawn(x, y, v, a, r, w) { let i = sHead; for (let n = 0; n < SN; n++) { const j = (sHead + n) % SN; if (sK[j] === 0) { i = j; break; } } sHead = (i + 1) % SN; sK[i] = S_SPIRAL; sX[i] = x; sY[i] = y; sV[i] = v; sA[i] = a; sR[i] = r; sW[i] = w; }
  function sStep(dt, gx, gy) {
    for (let i = 0; i < SN; i++) {
      if (!sK[i]) continue;
      if (sK[i] === S_SPIRAL) { sA[i] += sW[i] * dt; sR[i] -= sV[i] * dt; if (sR[i] <= 3.5) { sK[i] = S_ORBIT; sR[i] = 3 + (i % 3); } }
      else sA[i] -= 8.5 * dt;
      sX[i] = gx + Math.cos(sA[i]) * sR[i]; sY[i] = gy + Math.sin(sA[i]) * sR[i] * 0.75;
    }
  }
  function sDraw(f12) { for (let i = 0; i < SN; i++) if (sK[i]) { const s = (i + f12) % 6; put(Math.round(sX[i]), Math.round(sY[i]), s < 1 ? EL[0] : s < 3 ? EL[1] : EL[2]); } }
  // 自己的弹道：1 黄铜小齿轮（没有拖尾粒子）· 2 八齿大齿轮（拖尾偏后 4 格、地面映光用暗一级）。引擎弹道总带拖尾、映光取色阶第 3 级，所以两种齿轮在本模块里飞
  const GN = 3, gOn = new Uint8Array(GN), gK = new Uint8Array(GN), gX = new Float32Array(GN), gY = new Float32Array(GN), gVX = new Float32Array(GN), gTX = new Float32Array(GN);
  function gShoot(k, x, y, vx, tx) { let i = 0; for (; i < GN - 1 && gOn[i]; i++); gOn[i] = 1; gK[i] = k; gX[i] = x; gY[i] = y; gVX[i] = vx; gTX[i] = tx; }
  function gStep(dt) {
    for (let i = 0; i < GN; i++) {
      if (!gOn[i]) continue; gX[i] += gVX[i] * dt; const k = gK[i];
      if (k === 2) spawn(K_TRAIL, gX[i] - Math.sign(gVX[i]) * 4, gY[i] + Math.random() * 2 - 1, -Math.sign(gVX[i]) * (12 + Math.random() * 20), Math.random() * 10 - 5, 0.15 + Math.random() * 0.25, R_EL);
      if ((gVX[i] > 0 && gX[i] >= gTX[i]) || (gVX[i] < 0 && gX[i] <= gTX[i])) { gOn[i] = 0; impactOn(k, gX[i], gY[i]); }
    }
  }
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  // 钟表匠专属：停摆定格、散架碎片、场外「倒带」
  const FREEZE = 0.6, OFF_DUR = 2.6, TCX = HX + 1, TCY = HY - 15, TRX = 19, TRY = 16;   // 蓄力刻度圆：中心、半径
  let frzT = 9, frzX = 0, frzY = 0, offT = 9;
  const DBN = 4, dbOn = new Uint8Array(DBN), dbK = new Uint8Array(DBN), dbX = new Float32Array(DBN), dbY = new Float32Array(DBN), dbVX = new Float32Array(DBN), dbVY = new Float32Array(DBN), dbS = new Float32Array(DBN);
  function debris(i, k, x, y, vx, vy) { dbOn[i] = 1; dbK[i] = k; dbX[i] = x; dbY[i] = y; dbVX[i] = vx; dbVY[i] = vy; dbS[i] = 0; }
  // 停摆定格要沿假人剪影描边：引擎不导出假人精灵，这里按引擎的假人画法画一份静止的剪影（定格时假人不摇）
  const dummy = new Sprite(28, 36, 14, 33);
  (function dummyMask() {
    const D_WOOD = defMat('wood'), D_SACK = defMat([20, 7, 6, 5], 1), D_STRAW = defMat('gold'), D_RED = defMat('crimson'), D_INK = defMat('ink', 1, 1);
    begin(dummy, 0, 0);
    part(); rect(-4, -1, 9, 2, D_WOOD, 2); rect(-1, -26, 2, 25, D_WOOD, 0);
    part(); rect(-8, -20, 17, 2, D_WOOD, 0); sp(-9, -20, D_STRAW, 0); sp(-9, -19, D_STRAW, 0); sp(9, -20, D_STRAW, 0); sp(9, -19, D_STRAW, 0); sp(-10, -18, D_STRAW, 3); sp(10, -21, D_STRAW, 3);
    part(); for (let y = -21; y <= -9; y++) { const q = (y + 15) / 7, w = Math.round(5.2 * Math.sqrt(Math.max(0, 1 - q * q * 0.45))); run(y, -w, w, D_SACK, 0); }
    run(-20, -4, 4, D_WOOD, 2); run(-10, -4, 4, D_WOOD, 2);
    for (let y = -18; y <= -12; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y + 15); if (d <= 3.3 && d > 2.2) sp(x, y, D_RED, 0); else if (d <= 1.1) sp(x, y, D_RED, 3); }
    for (const x of [-4, -2, 1, 3]) { sp(x, -8, D_STRAW, 0); sp(x + (x & 1), -7, D_STRAW, 3); }
    part(); for (let y = -28; y <= -22; y++) { const w = y === -28 || y === -22 ? 2 : 3; run(y, -w, w, D_SACK, 0); } run(-22, -1, 1, D_WOOD, 2);
    sp(-2, -26, D_INK); sp(-1, -25, D_INK); sp(-2, -24, D_INK); sp(1, -26, D_INK); sp(2, -25, D_INK); sp(1, -24, D_INK); run(-23, -1, 1, D_INK); sp(-2, -29, D_STRAW, 3); sp(0, -30, D_STRAW, 4); sp(2, -29, D_STRAW, 3);
    bake(dummy, { rim: 0, flash: 0, dq: 0 });
  })();
  function onEnter(s) {
    if (s === CAST) {
      const wx = HX + K_CAST.hx + K_CAST.fx + 1, wy = HY + K_CAST.hy + K_CAST.fy - 4;
      for (let i = 0; i < SN; i++) if (sK[i]) { const v = 40 + Math.random() * 40; spawn(K_BURST, sX[i], sY[i], Math.cos(sA[i]) * v, Math.sin(sA[i]) * v * 0.75 - 10, 0.3 + Math.random() * 0.3, R_EL); sK[i] = 0; }   // 汇聚的青光外爆
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832, x = TCX + Math.cos(a) * TRX, y = TCY + Math.sin(a) * TRY, v = 55 + Math.random() * 35; spawn(K_BURST, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8, 0.35 + Math.random() * 0.3, R_EL); }   // 刻度圆外爆成 16 颗青光
      burst(wx, wy, 10, 30, 70, 0.2, 0.4, R_EL, 6);
      gShoot(2, wx + 3, wy, 120, DUMMY_X - 4); ring(wx, wy, 0, R_EL); shake(0.28, 2); flash(0.05);
    } else if (s === REVIVE) dbOn.fill(0);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                          // 后坐那一帧：铳口喷青色蒸汽，射出小齿轮
      mzT = 0; mzX = scrX(P.mzx); mzY = HY + P.mzy; gShoot(1, mzX + 2, mzY, 170, DUMMY_X - 3);
      for (let i = 0; i < 7; i++) spawn(K_EMBER, mzX + Math.random() * 3 - 1, mzY + Math.random() * 2 - 1, 8 + Math.random() * 22, -5 - Math.random() * 12, 0.3 + Math.random() * 0.3, R_EL);
      sfx('swing', { kind: 'gun', w: 0.4 }); sfx('shoot', { proj: 'bullet' });
    }
    if (s === DEATH && t === T_SHATTER) {                        // 钟面玻璃碎裂：黄铜火花 + 金属火星 + 玻璃屑，齿轮和弹簧崩飞
      const x = HX + P.bx - 7 + Math.round(P.lean * 0.5), y = HY - 23 + P.bob + P.crouch;
      burst(x, y, 14, 50, 120, 0.3, 0.7, R_BRASS, 30); burst(x, y, 6, 90, 150, 0.2, 0.4, R_IMPACT, 20); burst(x, y, 6, 30, 70, 0.3, 0.5, R_EL, 10);
      debris(0, 0, x - 2, y - 2, -16, -70); debris(1, 0, x + 2, y - 1, 32, -80); debris(2, 1, x, y - 3, -8, -95); debris(3, 2, x, y - 8, -30, -85); shake(0.12, 1);   // 发条钥匙往身后崩飞
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) { const x = HX - 10 + Math.random() * 30; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); } shake(0.1, 1); sfx('fall', { w: 0.6 }); }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [T_SHATTER, T_LAND], []];   // 受击 / 死亡的命中火花、震屏、闪白和复活收尾由引擎出
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 4, 40, 90, 0.3, 0.5, R_BRASS, 24); burst(x, y, 3, 20, 50, 0.12, 0.25, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'metal', w: 0.3 }); }   // 齿轮碎成 4 颗黄铜碎屑
    else if (k === 2) { frzT = 0; frzX = x; frzY = y; burst(x, y, 6, 20, 45, 0.15, 0.3, R_EL, 0); sfx('impact', { pal: 'time', w: 0.5 }); }                              // 齿轮嵌进假人：停摆定格开始
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; sSpawn(gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), a, r, -(4 + Math.random() * 3)); } }   // 逆时针收进怀表
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { spawn(K_DUST, scrX(P.step > 0 ? 2 : -3) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, R_DUST); sfx('step', { w: 0.4 }); } lastStep = P.step; }
    if ((state === IDLE && P.watch === 2) || (state === RECOVER && P.watch)) { emberAcc += dt * (state === IDLE ? 3 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 30, HY - 1 - Math.random() * 12, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); } }
    if (frzT < 9) {
      const was = frzT; frzT += dt;
      if (was < 0.25 && frzT >= 0.25) { burst(DUMMY_X, HY - 38, 4, 15, 30, 0.12, 0.25, R_EL, 0); sfx('impact', { pal: 'time', w: 0.3 }); }                                   // 表盘指针「咔」地停住
      if (was < FREEZE && frzT >= FREEZE) { hitDummy(1, 1); burst(frzX, frzY, 20, 60, 140, 0.3, 0.7, R_EL, 14); ring(frzX, frzY, 1, R_EL); shake(0.12, 1); sfx('impact', { pal: 'time', w: 0.9 }); frzT = 9; }   // 定格结束：闪白 + 大摇 + 击退
    }
    for (let i = 0; i < DBN; i++) {
      if (!dbOn[i]) continue; dbVY[i] += 300 * dt; dbX[i] += dbVX[i] * dt; dbY[i] += dbVY[i] * dt; dbS[i] += dt * Math.abs(dbVX[i]) * 0.4;
      if (dbY[i] >= HY - 1) { dbY[i] = HY - 1; if (dbVY[i] > 30) { dbVY[i] *= -0.4; dbVX[i] *= 0.6; } else { dbVY[i] = 0; dbVX[i] *= 0.7; } }
    }
    if (offT < 9) offT += dt;
    sStep(dt, gx, gy); gStep(dt); mzT += dt;
  }
  function fxReset() { mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; frzT = 9; offT = 9; dbOn.fill(0); sK.fill(0); gOn.fill(0); }
  function offField() { offT = 0; }                              // 场外「倒带」：角色保持待机，大钟面 + 快进残影自己计时 OFF_DUR 秒
  function fxBack(f12) {        // 地面映光（怀表 / 大齿轮经过）、蓄力刻度圆的暗色虚线圈
    const state = E.state, stT = E.stT;
    if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (state === CHARGE && stT >= 0.1) for (let i = 0; i < 96; i++) { if (i % 3) continue; const a = i / 96 * 6.2832; put(Math.round(TCX + Math.cos(a) * TRX), Math.round(TCY + Math.sin(a) * TRY), EL[4]); }
    for (let i = 0; i < GN; i++) if (gOn[i] && gK[i] !== 1) for (let x = Math.round(gX[i]) - 3; x <= Math.round(gX[i]) + 3; x++) if (((x + f12) & 1) === 0) put(x, FLOOR, EL[3]);
    shotFloorGlow(f12);
  }
  function dOn(x, y) { return x >= 0 && y >= 0 && x < dummy.w && y < dummy.h && dummy.out[y * dummy.w + x] !== 255; }
  function bigGear(x, y, f, spin) {   // 5×5 八齿大齿轮：齿在两组位置间切换（转 22.5°），轮毂辐条每帧转 45°
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const d2 = i * i + j * j; if (d2 > 5) continue; put(x + i, y + j, d2 === 0 ? EL[0] : d2 <= 2 ? EL[1] : EL[2]); }
    const T = (f & 1) ? GEAR_B : GEAR_A; for (let n = 0; n < 16; n += 2) put(x + T[n], y + T[n + 1], EL[3]);
    if (spin) { const k = f & 7, dx = DIR8[k * 2], dy = DIR8[k * 2 + 1]; put(x + dx, y + dy, EL[3]); if (!(dx && dy)) put(x + 2 * dx, y + 2 * dy, EL[4]); }
  }
  const GEAR_A = [3, 0, 2, 2, 0, 3, -2, 2, -3, 0, -2, -2, 0, -3, 2, -2], GEAR_B = [3, 1, 1, 3, -1, 3, -3, 1, -3, -1, -1, -3, 1, -3, 3, -1];
  function fxMid(f12) {         // 假人前、角色后：停摆定格（描边 + 嵌入的齿轮 + 头顶小表盘）、快进残影
    const state = E.state, stT = E.stT;
    if (frzT < FREEZE) {
      const x0 = DUMMY_X - dummy.ox, y0 = HY - dummy.oy, c = frzT < 1 / 12 ? EL[0] : EL[1];
      for (let y = -1; y <= dummy.h; y++) for (let x = -1; x <= dummy.w; x++) {
        if (dOn(x, y)) { if (((x + y) & 3) === 0) put(x0 + x, y0 + y, EL[3]); continue; }
        if (dOn(x + 1, y) || dOn(x - 1, y) || dOn(x, y + 1) || dOn(x, y - 1)) put(x0 + x, y0 + y, c);
      }
      bigGear(Math.round(frzX), Math.round(frzY), 0, 0);
      const dx = DUMMY_X, dy = HY - 38;
      for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const d2 = i * i + j * j; if (d2 > 10) continue; put(dx + i, dy + j, d2 >= 7 ? (frzT < 1 / 12 ? EL[0] : EL[2]) : EL[4]); }
      put(dx, dy - 2, EL[3]); put(dx + 2, dy, EL[3]); put(dx, dy + 2, EL[3]); put(dx - 2, dy, EL[3]);
      const k = frzT < 0.25 ? (f12 * 3) & 7 : 0, hx = DIR8[k * 2], hy = DIR8[k * 2 + 1], hc = frzT >= 0.25 && frzT < 0.33 ? EL[0] : EL[1];
      put(dx, dy, EL[0]); put(dx + hx, dy + hy, hc); if (!(hx && hy)) put(dx + 2 * hx, dy + 2 * hy, hc);
    }
    if (state === RECOVER && stT < 0.42) { const q = stT / 0.42, o = f12 & 1, d = P.flip ? 1 : -1; blitShape(hero, HX + P.mx + d * (8 + o), HY, P.flip, EL[3], 0.25 + q * 0.75); blitShape(hero, HX + P.mx + d * (4 + o), HY, P.flip, EL[2], q * 0.9); }
    if (offT > 0.5 && offT < OFF_DUR && !P.lying) { const o = f12 & 1, d = P.flip ? 1 : -1, fade = clamp01((offT - OFF_DUR + 0.5) / 0.5); blitShape(hero, HX + P.mx + d * (8 + o), HY, P.flip, EL[3], 0.35 + fade * 0.65); blitShape(hero, HX + P.mx + d * (4 + o), HY, P.flip, EL[2], 0.15 + fade * 0.85); }
  }
  const RING8 = [3, 0, 2, 2, 0, 3, -2, 2, -3, 0, -2, -2, 0, -3, 2, -2];
  function fxFront(f12) {       // 角色前面：怀表光、蓄力刻度圆、铳口蒸汽、散架碎片、场外倒带钟面、汇聚粒子、齿轮弹道
    const gx = scrX(P.gx), gy = HY + P.gy, state = E.state, stT = E.stT;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) {
      if (P.gem === 2) { for (let i = 0; i < 8; i++) if (((i + f12) & 1) === 0) put(gx + RING8[i * 2], gy + RING8[i * 2 + 1], (i & 2) ? EL[2] : EL[1]); }
      else { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; put(Math.round(gx + Math.cos(a) * 5), Math.round(gy + Math.sin(a) * 5), (i % 3) === 0 ? EL[0] : EL[2]); } for (let r = 1; r <= 4; r++) put(gx, gy - r, r < 3 ? EL[0] : EL[1]); for (let r = 1; r <= 3; r++) put(gx - r, gy, r < 2 ? EL[0] : EL[1]); }
    }
    if (state === CHARGE) {       // 身周 12 个表盘刻度点，从 12 点起逆时针逐个点亮
      for (let i = 0; i < 12; i++) {
        const lt = 0.12 + i * 0.09, a = -Math.PI / 2 - i * Math.PI / 6, x = Math.round(TCX + Math.cos(a) * TRX), y = Math.round(TCY + Math.sin(a) * TRY);
        if (stT < 0.1) continue; let c;
        if (stT < lt) c = EL[4]; else if (stT - lt < 1 / 12) c = EL[0]; else c = stT > 1.2 ? (((i + f12) % 3) === 0 ? EL[0] : EL[1]) : EL[2];
        put(x, y, c); if (stT >= lt) put(Math.round(TCX + Math.cos(a) * (TRX - 1.5)), Math.round(TCY + Math.sin(a) * (TRY - 1.5)), c);   // 点亮后成短刻度
        if (i % 3 === 0) { put(Math.round(TCX + Math.cos(a) * (TRX + 1.2)), Math.round(TCY + Math.sin(a) * (TRY + 1.2)), c); if (stT >= lt) put(Math.round(TCX + Math.cos(a) * (TRX - 3)), Math.round(TCY + Math.sin(a) * (TRY - 3)), c === EL[4] ? EL[4] : EL[2]); }   // 12/3/6/9 点为长刻度
      }
    }
    if (mzT < 2 / 12) {           // 铳口青色蒸汽：第 1 帧 3×3 白芯 + 一圈淡青 / 青薄荷（5×5）+ 上冒的两团；第 2 帧散成断续的大环
      const cx = mzX + 1, cy = mzY;
      if (mzT < 1 / 12) {
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(cx + i, cy + j, EL[0]);
        for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { if (Math.abs(i) < 2 && Math.abs(j) < 2) continue; if (Math.abs(i) === 2 && Math.abs(j) === 2) continue; put(cx + i, cy + j, i + j < 0 ? EL[1] : EL[2]); }
        put(cx + 3, cy, EL[1]); put(cx - 1, cy - 3, EL[2]); put(cx + 1, cy - 3, EL[1]); put(cx + 2, cy - 3, EL[2]);
      } else {
        for (let i = 0; i < 16; i++) { if ((i + f12) & 1) continue; const a = i / 16 * 6.2832; put(Math.round(cx + Math.cos(a) * 4), Math.round(cy - 1 + Math.sin(a) * 3), i < 8 ? EL[2] : EL[1]); }
        put(cx, cy - 1, EL[1]); put(cx + 1, cy - 1, EL[2]); put(cx, cy, EL[2]); put(cx - 1, cy - 4, EL[3]); put(cx + 2, cy - 5, EL[2]); put(cx + 1, cy - 5, EL[3]);
      }
    }
    if (state === DEATH) for (let i = 0; i < DBN; i++) {        // 崩飞的齿轮和弹簧
      if (!dbOn[i]) continue; const x = Math.round(dbX[i]), y = Math.round(dbY[i]), dq = P.dq;
      if (dbK[i] === 0) { const sd = Math.floor(dbS[i]) & 1; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (B8[((y + j) & 7) * 8 + ((x + k) & 7)] >= dq) put(x + k, y + j, j === 0 && k === 0 ? BR[4] : j + k < 0 ? BR[1] : BR[2]); if (B8[(y & 7) * 8 + (x & 7)] >= dq) { if (sd) { put(x + 2, y, BR[3]); put(x - 2, y, BR[3]); put(x, y + 2, BR[3]); put(x, y - 2, BR[3]); } else { put(x + 2, y + 2, BR[3]); put(x - 2, y - 2, BR[3]); put(x + 2, y - 2, BR[3]); put(x - 2, y + 2, BR[3]); } } }
      else if (dbK[i] === 1) { if (B8[(y & 7) * 8 + (x & 7)] >= dq) { put(x, y, BR[1]); put(x + 1, y - 1, BR[2]); put(x, y - 2, BR[1]); put(x + 1, y - 3, BR[2]); put(x, y - 4, BR[1]); } }
      else if (B8[(y & 7) * 8 + (x & 7)] >= dq) {                // 发条钥匙：空中竖 / 横翻滚，落地后横躺
        const lay = dbVY[i] === 0 || (Math.floor(dbS[i]) & 1), K = lay ? KEY_LAY : KEY_UP, yy = y - 2;
        for (let n = 0; n < K.length; n += 3) put(x + K[n], yy + K[n + 1], BR[K[n + 2]]);
      }
    }
    if (offT < OFF_DUR) drawOffField(f12);
    sDraw(f12);
    for (let i = 0; i < GN; i++) if (gOn[i]) drawGear(gK[i], Math.round(gX[i]), Math.round(gY[i]), gVX[i] > 0 ? 1 : -1, f12);
  }
  const KEY_UP = [0, 0, 1, 0, 1, 2, 0, 2, 3, -1, -1, 2, -2, -1, 3, 1, -1, 2, 2, -1, 3, -2, -2, 2, 2, -2, 2], KEY_LAY = [0, 0, 1, -1, 0, 2, -2, 0, 3, 1, -1, 2, 1, -2, 3, 1, 1, 2, 1, 2, 3, 2, -2, 2, 2, 2, 2];   // 崩飞的发条钥匙 [dx, dy, 黄铜档]
  // 场外「倒带」：中央隔点大钟面，指针先逆时针飞转一圈、再顺时针加速。原版第 1 帧还有一道隔行扫描线错位（要读帧缓冲，引擎没开放，暂缺，见 engineRequests）
  function drawOffField(f12) {
    const t = offT, cx = 64, cy = 40, R = 22, fade = t > OFF_DUR - 0.4 ? (f12 & 1) : 0;
    if (fade) return;
    for (let i = 0; i < 120; i++) { const a = i / 120 * 6.2832, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R * 0.9); if (((x + y) & 1) === 0) put(x, y, EL[2]); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 - Math.PI / 2; for (let r = R - 4; r <= R - 2; r++) { if (i % 3 && r < R - 3) continue; put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), i % 3 ? EL[2] : EL[1]); } }
    const th = t < 0.7 ? -6.2832 * (t / 0.7) : 6.2832 * 1.6 * Math.pow((t - 0.7) / 1.2, 2);
    for (let r = 2; r <= R - 5; r++) { const a = th - Math.PI / 2; if ((r & 1) === 0) put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), r > R - 8 ? EL[0] : EL[1]); }
    for (let r = 2; r <= R - 11; r++) { const a = th / 12 - Math.PI / 2; if ((r & 1) === 0) put(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), EL[1]); }
    put(cx, cy, EL[0]); put(cx + 1, cy, EL[1]); put(cx, cy + 1, EL[1]);
  }
  function drawGear(k, x, y, d, f12) {   // 齿轮弹道外形：1 = 3×3 黄铜小齿轮（齿在正 / 斜两组位置间切换）+ 1 格青色拖尾；2 = 八齿大齿轮
    if (k === 1) {
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + i, y + j, i === 0 && j === 0 ? BR[3] : i + j < 0 ? BR[1] : BR[2]);
      if (f12 & 1) { put(x + 2, y, BR[2]); put(x - 2, y, BR[2]); put(x, y + 2, BR[2]); put(x, y - 2, BR[2]); } else { put(x + 2, y + 2, BR[2]); put(x - 2, y - 2, BR[2]); put(x + 2, y - 2, BR[2]); put(x - 2, y + 2, BR[2]); }
      put(x - 3 * d, y, EL[2]);
    } else bigGear(x, y, f12, 1);
  }

  return {
    name: '钟表匠', HX, R_EL, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS,
    // 音效声明：老工匠血肉之躯、停摆后向前侧翻；技能元素「倒带 · 时光青」→ time，逆时针螺旋收进怀表 → spiral；背箱发条铳偏重（charge / release / hurt / death 由引擎自动发）
    SFX: { body: 'flesh', how: 'topple', pal: 'time', style: 'spiral', w: 0.7 },
    SHEET: [[IDLE, [0, 0.4, 0.8, 1.2, 1.7, 1.85]], [MOVE, [0, 3.5 / 12, 5.5 / 12, 8.5 / 12]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'], [DEATH, [0.34, 0.42, 0.6, 0.7, 0.9, 1.1, 1.3, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]],
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront, offField,
  };
});
