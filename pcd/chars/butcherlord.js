// 屠宰场主（butcherlord，英雄族近战领袖；技能「血祭」上场动作 = 剁骨旋风）：桶形大肚右凸、比头还大的方头剁骨刀、链吊铁肉钩、光头顶迷你礼帽；
// 近战竖劈前冲 3 格；技能蓄力献祭圆吸血到刀面 → 侧 / 正 / 侧 / 背 四张图转两圈的剁骨旋风 → 血雾吸回肚子；死亡前扑、刀插地、礼帽滚走。
// 从 batch-00-pilot/butcherlord/butcherlord.html（技能模板版）转成共享引擎模块：第 3 节画法原样搬来，第 4 节特效改用引擎的粒子 / 冲击环 / 震屏 / 闪白 / 敌弹 / 复活。
PCD.define('butcherlord', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, q12, f12of, gait, walkDemo, color, fxRamp, FXR, FXI, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_BURST, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT,
    spawn, burst, ring, shake, flash, hitDummy, put, scrX, shotFloorGlow } = E;
  const fl = (x) => Math.floor(x + 1e-6);                       // 带容差取整（同 q12）：原版画法里的 Math.floor 一律换成它，整格边界不会因浮点误差少一格
  const easeInOut = ease.inOut, easeOut = ease.out;

  // ───── 颜色：原版色板 0–26 与共享色板相同；27–42 是本角色专属色，按原色逐个追加（下标变了，颜色不变）─────
  const OWN = ['#3a1414', '#7a3934', '#b86a5c', '#e39d86',       // 27–30 肉粉皮肤（勾线 / 暗 / 基 / 亮）
    '#1c100a', '#3a2214', '#5e3a22', '#82583a',                  // 31–34 褐皮围裙
    '#1e2026', '#4a4e58', '#8a909c', '#d8dce4',                  // 35–38 刀钢
    '#ffb89a', '#d8281a', '#6e0e08', '#2a0604'].map(color);      // 39–42 暗血 淡橘粉 → 猩红 → 暗血 → 凝血褐（元素 血祭）
  const pc = (i) => (i < 27 ? i : OWN[i - 27]);                 // 原版色板下标 → 本页下标
  const mat = (r, band, flat) => defMat(r.map(pc), band, flat);
  // 元素色阶：血祭 暗血（白 → 淡橘粉 → 猩红 → 暗血 → 凝血褐）· 血滴（同元素，不从白开始）· 血雾 / 魂
  const R_BLOOD = fxRamp('butcherBlood', [21, 39, 40, 41, 42].map(pc)), R_GORE = fxRamp('butcherGore', [39, 40, 40, 41, 42].map(pc)), R_BSOUL = fxRamp('butcherMist', [39, 40, 41, 42, 2].map(pc));
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust;

  // ───── 材质、缓冲、姿势 ─────
  const M_SKIN = mat([27, 28, 29, 30], 1), M_BELLY = mat([27, 28, 29, 30], 2), M_APRON = mat([31, 32, 33, 34], 2), M_STEEL = mat([35, 36, 37, 38], 1);
  const M_IRON = mat([35, 35, 36, 37], 1), M_HAT = mat([0, 8, 9, 10], 1), M_PANTS = mat([0, 8, 9, 10], 1), M_GOLD = mat([20, 19, 14, 5], 1);
  const M_WOOD = mat([0, 20, 19, 16], 1), M_BOOT = mat([0, 20, 20, 19], 1), M_INK = mat([0, 0, 0, 0], 1, 1);
  const M_STAIN = mat([42, 41, 40, 39], 1, 1), M_BRED = mat([42, 41, 40, 39], 1), M_HOT = mat([41, 40, 39, 21], 1, 1);   // 血渍 · 染血刃 · 热刃（发光体）
  const R_EL = R_BLOOD, EL = FXR[R_EL], HX = 76, DUR = DEFAULT_DUR.slice();   // 近战：竖劈前冲 3 格，刀够到 x=98 的假人
  const hero = new Sprite(64, 52, 31, 47);                      // 缓冲：脚底 = (31, 47)；放得下过顶举刀、旋风正面 / 背面两侧平举、前扑倒地 + 插地的刀 + 滚走的礼帽
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  HERO_RIM.skip[M_HOT] = HERO_RIM.skip[M_BRED] = HERO_RIM.skip[M_STEEL] = HERO_RIM.skip[M_WOOD] = HERO_RIM.skip[M_IRON] = HERO_RIM.skip[M_GOLD] = HERO_RIM.skip[M_STAIN] = 1;
  // 姿势参数：连续插值，按 12 fps 取样后取整。取整后的取值范围（缓存键按此编码，超出会串位）：
  //   hx -32..31 · hy -64..63 · a ±π（π/32 一档）· lean / head -1..2 · bob 0..1 · bhx -32..31 · bhy -48..15（后手，拿链钩）
  //   lying / sharp（磨刀：钩举到肚前）/ mouth 0..1 · lift 0..7 · spin 0..3（旋风视图：0 普通 / 1 侧面 / 2 正面 / 3 背面）
  //   hk -1..2（链钩摆角）· bel -1..2（肚子晃）· sway -1..2（围裙下摆）· gem 0..7 · glint 0..1 · rim 0..3 · bx -16..15 · crouch 0..7 · eyes / flash 0..1 · step -1..2 · wup 0..3
  //   hatX -32..31 · hatY 0..15 · hatR 0..1（礼帽滚动帧）· cv 0..3（刀脱手插地）· dq 0..1
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, bhx: 0, bhy: 0, hk: 0, bel: 0, bob: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, hatR: 0, cv: 0, sharp: 0, mouth: 0, spin: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K_IDLE = { hx: 12, hy: -26, a: -0.05, lean: 0, head: 0, bhx: -11, bhy: -10 };   // 刀竖举在头侧、肘抬到胸口高度（右凸的桶腹和肚脐整个露出来），链钩垂在身侧
  const K_SHARP = { hx: 1, hy: -19, a: 1.3, lean: 0, head: 1, bhx: 7, bhy: -9 };       // 磨刀：钩举到肚前，刀口在钩背上刮
  const K_WIND = { hx: 6, hy: -30, a: -0.7, lean: -1, head: -1, bhx: -13, bhy: -14 };    // 刀举过肩
  const K_CHOP = { hx: 15, hy: -12, a: 2.1, lean: 1, head: 1, bhx: -10, bhy: -10 };      // 竖劈到底
  const K_DRAG = { hx: 14, hy: -11, a: 2.3, lean: 1, head: 1, bhx: -10, bhy: -10 };      // 延续：刀咬进去往回拖
  const K_HOLD = { hx: 12, hy: -13, a: 2.55, lean: 0, head: 0, bhx: -10, bhy: -11 };     // 延续：拔刀
  const K_CHEST = { hx: 10, hy: -17, a: 0.7, lean: 0, head: 0, bhx: -11, bhy: -10 };     // 回位过渡：刀收到胸前
  const K_CHARGE = { hx: -12, hy: -18, a: -1.4, lean: -1, head: -1, bhx: 16, bhy: -20 };  // 向后拧：刀甩到身后平举、钩平举在身前
  const K_SPIN1 = { hx: 16, hy: -18, a: 1.57, lean: 0, head: 1, bhx: -16, bhy: -17 };    // 旋风 · 侧面：刀在前平举、钩甩在后
  const K_SPIN2 = { hx: 15, hy: -16, a: 1.9, lean: 1, head: 0, bhx: -15, bhy: -15 };     // 旋风 · 侧面（镜像那一张）：刀略压低
  const K_FRONT = { hx: -15, hy: -18, a: -1.5708, lean: 0, head: 0, bhx: 17, bhy: -18 };  // 旋风 · 正面：肚子朝镜头，刀在画面左、钩在右
  const K_BACK = { hx: 17, hy: -18, a: 1.5708, lean: 0, head: 0, bhx: -15, bhy: -18 };    // 旋风 · 背面：露出围裙带蝴蝶结，刀在右、钩在左
  const K_HURT = { hx: 10, hy: -21, a: -0.15, lean: -1, head: -1, bhx: -13, bhy: -12 };
  const K_STAG = { hx: 11, hy: -9, a: 1.9, lean: 1, head: 1, bhx: -8, bhy: -8 };          // 踉跄前倾（刀已脱手）
  function mixPose(A, B, q) { P.hx = A.hx + (B.hx - A.hx) * q; P.hy = A.hy + (B.hy - A.hy) * q; P.a = A.a + (B.a - A.a) * q; P.lean = A.lean + (B.lean - A.lean) * q; P.head = A.head + (B.head - A.head) * q; P.bhx = A.bhx + (B.bhx - A.bhx) * q; P.bhy = A.bhy + (B.bhy - A.bhy) * q; }
  const BEL_IDLE = [0, 1, 1, 0], SWAY_IDLE = [0, 1, 0, -1], HK_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_LEAN = [1, 0, -1, 0], WALK_BEL = [-1, 0, 1, 0], WALK_HK = [-1, 0, 1, 0], WALK_DIST = 10;   // 蹒跚：左右摇摆，肚子反向晃
  const GLOW_MATS = [M_HOT], HIT_POINT = [3, -16];               // 发光体 = 热刃；受击点（本地坐标）
  const CV_X = 13, CV_Y = -9;                                    // 死亡时刀插地的位置（握把，本地坐标，不随击退 / 离地移动）
  const T_FLICK = 2 / 12, T_DHIT = 3 / 12, T_SPARK = 20 / 12, T_HIT1 = 2 / 12, T_HIT2 = 4.5 / 12;   // T_DHIT：假人晚 1 帧闪白（出手帧的拖影不和白色假人叠在一起）
  const SPIN_F = 8;                                              // 旋风总帧数：施放 6 帧 + 收招前 2 帧，每帧转 90°，共两圈
  const topY = () => -22 + P.bob + P.crouch;                     // 肩线（躯干顶）
  const headX = () => P.lean + P.head;                           // 头的参考 x
  function poseAt(st, t, T) {
    const f12i = f12of(t), tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.cv = 0; P.sharp = 0; P.mouth = 0; P.spin = 0;
    P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.bel = 0; P.sway = 0; P.hk = 0; P.gem = 0; P.rim = 0;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = fl(TT * 2.5); P.bob = b & 1; P.bel = BEL_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[fl(TT * 1.25) & 3]; P.hk = HK_IDLE[(fl(TT * 1.25) + 1) & 3];
      const fi = Math.round((tq % DUR[IDLE]) * 12);             // 待机个性：磨刀 6 帧（1.5–2.0 s）——举钩 1 帧 → 刀口在钩背上来回刮 4 帧 → 放下 1 帧
      if (fi >= 18 && fi <= 23) {
        P.sharp = 1; P.hk = 0;
        if (fi === 18) mixPose(K_IDLE, K_SHARP, 0.6);
        else if (fi <= 22) { const k = fi - 19; mixPose(K_SHARP, K_SHARP, 0); P.hx += (k & 1) ? -2 : 1; P.hy += (k & 1) ? 1 : 0; P.glint = k === 1 ? 1 : 0; }
        else mixPose(K_SHARP, K_IDLE, 0.5);
      }
    };
    // 旋风一帧：侧 → 正 → 侧（镜像）→ 背，每帧转 90°；fr 0–5 在施放里，6–7 在收招开头
    const spinFrame = (fr) => {
      const v = fr & 3;
      if (v === 0) { mixPose(K_SPIN1, K_SPIN1, 0); P.spin = 1; } else if (v === 1) { mixPose(K_FRONT, K_FRONT, 0); P.spin = 2; }
      else if (v === 2) { mixPose(K_SPIN2, K_SPIN2, 0); P.spin = 1; P.flip = 1; } else { mixPose(K_BACK, K_BACK, 0); P.spin = 3; }
      P.hk = 2; P.bel = (fr & 1) ? 1 : -1; P.sway = (fr & 1) ? 1 : -1; P.mouth = 1; P.crouch = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 蹒跚重步：接触帧下沉 1 格（顿挫），身体左右摆，肚子反向晃
      mixPose(K_IDLE, K_IDLE, 0); const f = gait(tq);            // 每个步态帧正好 2 个 12 fps 刻度
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.lean = WALK_LEAN[f]; P.bel = WALK_BEL[f]; P.hk = WALK_HK[f];
      P.a = K_IDLE.a + P.step * 0.1; P.hx = K_IDLE.hx + P.step * 0.6; P.bhx = K_IDLE.bhx - P.step * 0.6;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    }
    else if (st === ATTACK) {                                   // 9 帧：预兆 2 → 出手 1 → 延续 3（咬进 / 拖刀 / 拔刀）→ 回位 3（刀收到胸前再回脸侧）
      const fr = f12i;
      if (fr < 2) { mixPose(K_IDLE, K_WIND, fr ? 1 : 0.5); P.gem = 1; P.crouch = fr; P.bel = 1; P.hk = 1; P.sway = 1; }
      else if (fr === 2) { mixPose(K_CHOP, K_CHOP, 0); P.bx = 3; P.gem = 1; P.rim = 1; P.bel = -1; P.sway = -1; P.hk = -1; P.crouch = 1; P.mouth = 1; }
      else if (fr === 3) { mixPose(K_CHOP, K_CHOP, 0); P.bx = 3; P.gem = 1; P.bel = 1; P.sway = 1; P.hk = -1; P.crouch = 1; P.mouth = 1; }
      else if (fr === 4) { mixPose(K_DRAG, K_DRAG, 0); P.bx = 3; P.gem = 1; P.bel = -1; P.hk = 0; P.crouch = 1; }
      else if (fr === 5) { mixPose(K_HOLD, K_HOLD, 0); P.bx = 3; P.bel = 0; P.hk = 1; P.sway = -1; }
      else if (fr === 6) { mixPose(K_HOLD, K_CHEST, 0.6); P.bx = 2; P.bel = 1; P.hk = 0; }
      else if (fr === 7) { mixPose(K_CHEST, K_CHEST, 0); P.bx = 1; P.bel = 0; P.hk = -1; }
      else { mixPose(K_CHEST, K_IDLE, 0.7); P.bel = -1; }
    } else if (st === CHARGE) {
      const q = easeInOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q);
      P.crouch = q > 0.5 ? 1 : 0; P.hk = q > 0.5 ? 1 : 0; P.rim = 2; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : tq > 1.1 ? 2 : ((f12 & 1) ? 2 : 1);
      if (q > 0.9) { P.bel = (f12 & 1) ? 1 : -1; P.bob = (f12 >> 1) & 1; } else P.bel = fl(TT * 2.5) & 1;   // 肚子起伏加快
      P.mouth = tq > 0.5 && (f12 % 4) < 2 ? 1 : 0;              // 呼白气
    } else if (st === CAST) {                                   // 原地旋转：侧 → 正 → 侧（镜像）→ 背 每帧换一张，0.5 s 转 1.5 圈，同时前滑 4 格
      spinFrame(f12i); P.mx = Math.round(4 * clamp01(tq / 0.42)); P.gem = 3; P.rim = 3;
    } else if (st === RECOVER) {                                // 先转完最后半圈（凑满两圈）→ 转停后晃一下站稳 → 蹒跚退回原位
      if (f12i < SPIN_F - 6) { spinFrame(6 + f12i); P.mx = 4; P.gem = 2; P.rim = 2; }
      else if (f12i < 4) { mixPose(K_SPIN1, K_SPIN1, 0); P.lean = (f12i & 1) ? -1 : 1; P.bel = (f12i & 1) ? 1 : -1; P.hk = 1; P.gem = 2; P.rim = 2; P.mx = 4; P.crouch = 1; }
      else {
        const q = easeInOut(clamp01((tq - 4 / 12) / 0.3)); mixPose(K_SPIN1, K_IDLE, q); P.gem = q < 0.4 ? 1 : 0; P.rim = q < 0.5 ? 1 : 0; P.hk = q < 0.5 ? -1 : 0;
        const r = clamp01((tq - 0.4) / 0.25); P.mx = Math.round(4 * (1 - r));
        if (r > 0 && r < 1) { const f = gait(tq, 12); P.walk = 1; P.step = -WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; }
      }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.bel = 1; P.sway = 1; P.hk = -1; P.hatY = 1; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.bel = -1; P.hk = 1; }
      else mixPose(K_HURT, K_IDLE, easeInOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.bel = 1; P.sway = 1; P.hk = -1; P.mouth = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.hatY = d < 0.15 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { mixPose(K_STAG, K_STAG, 0); P.bx = -1; P.crouch = 3; P.eyes = 1; P.bel = -1; P.hk = -1; P.mouth = 1; P.cv = 1; P.gem = 1; P.sway = -1; }   // 刀先脱手竖插进地面
      else {
        mixPose(K_STAG, K_STAG, 0); P.lying = 1; P.bx = -1; P.eyes = 1; P.cv = 1;
        P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : d < 0.74 ? 0 : d < 0.83 ? 1 : 0;   // 前扑落地，肚子着地回弹一次
        const h0 = clamp01((d - 0.66) / 0.34), h1 = clamp01((d - 1.0) / 0.3);    // 礼帽：弹起越过身体落到身后，再滚一段
        P.hatX = Math.round(-26 * h0 - 4 * h1); P.hatY = Math.round(Math.sin(h0 * Math.PI) * 10 + Math.sin(h1 * Math.PI) * 2); P.hatR = d >= 0.66 && h1 < 1 ? (f12 & 1) : 0;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1; P.sharp = 0; P.glint = 0; mixPose(K_IDLE, K_IDLE, 0);
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP; P.bhx = Math.round(P.bhx); P.bhy = Math.round(P.bhy) + P.bob;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head);
    if (P.cv) { P.gx = CV_X + 3; P.gy = -3; }                    // 插地的刀：刃面中心
    else { const sd = P.spin === 2 ? -1 : 1, dx = Math.sin(P.a), dy = -Math.cos(P.a), nx = Math.cos(P.a) * sd, ny = Math.sin(P.a) * sd; P.gx = Math.round(P.hx + dx * 8 + nx * 3) + P.bx; P.gy = Math.round(P.hy + dy * 8 + ny * 3); }   // 正面那张刀朝左、刃面仍朝下（side = -1）
    // 缓存键：任何一个取整后的参数变了才重画（k1 ≈ 1.8e13，k2 ≈ 7e13，都小于 2^53）
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 2 + P.bob; k = k * 64 + P.bhx + 32; k = k * 64 + P.bhy + 48;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 2 + P.sharp; k = k * 2 + P.mouth; k = k * 4 + P.spin; P.k1 = k;
    k = P.hk + 1; k = k * 4 + P.bel + 1; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 64 + P.hatX + 32; k = k * 16 + P.hatY; k = k * 2 + P.hatR; k = k * 4 + P.cv; k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; P.k2 = k;
  }
  // 只在某材质上点色（血渍只落在围裙上）
  // 只在某材质上点色（血渍只落在围裙上）；oX / oY = 本次 begin() 的绘制偏移
  let oX = 0, oY = 0;
  function spOn(x, y, m, t, on) { const X = Math.round(x) + oX + hero.ox, Y = Math.round(y) + oY + hero.oy; if (X < 0 || Y < 0 || X >= hero.w || Y >= hero.h || hero.mat[Y * hero.w + X] !== on) return; sp(x, y, m, t); }
  let bL = 0, bR = 0, bF = 0;
  function bellyEdges(y, yT, yB) {                               // 桶腹：肩窄 → 腹最宽（右凸）→ 胯部收回；bel 让肚子晃
    const t = clamp01((y - yT) / (yB - yT)), s = Math.sin(Math.PI * Math.pow(t, 1.45)), l = P.lean * (1 - t);   // 最宽处在 t≈0.62（肚子下垂）
    bF = s; bL = Math.round(-4 - 3.5 * Math.pow(s, 0.8) + l); bR = Math.round(4 + (8.5 + P.bel) * Math.pow(s, 0.6) + l);
  }
  // 方头剁骨刀：木柄 + 9×7 钢刃（刀背缺口、挂孔、亮刃口、血渍）；刃里嵌发光（gem 0 冷钢 / 1 刃口红线 / 2 染血 / 3 猩红发光 / 4 熄灭）
  function drawCleaver(X, Y, a, side, clipY) {
    const dx = Math.sin(a), dy = -Math.cos(a), nx = Math.cos(a) * side, ny = Math.sin(a) * side, g = P.gem;
    for (let u = -1.5; u <= 3; u += 0.5) sp(X + dx * u, Y + dy * u, M_WOOD, 0);
    sp(X - dx * 2, Y - dy * 2, M_IRON, 3);
    for (let j = -13; j <= 13; j++) for (let i = -13; i <= 13; i++) {
      if (Y + j > clipY) continue; const u = i * dx + j * dy, v = i * nx + j * ny;
      if (u < 3.5 || u >= 12.5 || v < -0.5 || v >= 6.5) continue;
      const iu = fl(u - 3.5), iv = fl(v + 0.5);
      if ((iv === 0 && iu === 6) || (iu === 7 && iv === 1)) continue;   // 刀背缺口 · 挂孔
      let m = M_STEEL, tn = iv === 6 ? 4 : 0;
      const stain = (iu === 1 && (iv === 4 || iv === 5)) || (iu === 2 && iv === 5) || (iu === 6 && iv === 4) || (iu === 2 && iv === 3);
      if (g === 1 && iv === 6) { m = M_HOT; tn = 2; }
      else if (g === 2) { if (iv === 6) { m = M_HOT; tn = 3; } else if (iv === 5 || (iv === 4 && !(iu & 1)) || (iv === 3 && iu % 3 === 1)) { m = M_HOT; tn = 2; } }   // 刃口亮粉 + 下半截染红、血往上渗成齿状，上半截仍是钢
      else if (g === 3) {                                         // 施放：刀背行 + 两端列保留钢框（缺口、挂孔照旧），只把刃面染成猩红，刃口留 1 行白
        if (iv === 0 || iu === 0 || iu === 8) { m = M_STEEL; tn = iv === 0 ? 3 : 2; }
        else if (iv === 6) { m = M_HOT; tn = 4; }
        else { m = M_HOT; tn = (iu - iv === 1 && iv <= 3) ? 3 : stain ? 1 : 2; }   // 一道斜向淡粉反光 + 几点凝血
      }
      else if (g === 4) { m = M_STEEL; tn = iv === 6 ? 3 : 2; if (stain || (iu === 4 && iv === 5)) { m = M_STAIN; tn = 1; } }
      if (g <= 1 && stain) { m = M_STAIN; tn = 2; }
      if (P.glint && iv === 6 && (iu === 4 || iu === 5)) { m = M_HOT; tn = 4; }
      sp(X + i, Y + j, m, tn);
    }
  }
  // 链钩：短链 4 节 + J 形铁肉钩；hk 摆角（2 = 旋转时甩平），up = 磨刀时钩举起（不画链，钩尖下垂）；ang 直接给链的角度（旋风正面往右甩 = -1.45）
  function drawHook(X, Y, hk, up, ang) {
    const ca = ang != null ? ang : up ? Math.PI : hk === 2 ? 1.45 : hk * 0.5, cx = -Math.sin(ca), cy = Math.cos(ca), px = -Math.cos(ca), py = -Math.sin(ca), n = up ? 0 : 4;
    for (let k = 1; k <= n; k++) sp(X + cx * (k + 1), Y + cy * (k + 1), M_IRON, (k & 1) ? 2 : 4);
    const o = n + 1, H = [[1, 0, 3], [2, 0, 3], [3, 0, 3], [4, 1, 3], [4, 2, 3], [3, 3, 3], [2, 3, 4]];
    for (const [u, v, t] of H) sp(X + cx * (o + u) + px * v, Y + cy * (o + u) + py * v, M_IRON, t);
  }
  // 粗手臂：两节（各 6.5 格）简易 IK；肘弯向 (qx, qy) 那一侧
  function limb(sx, sy, hx, hy, qx, qy, r0, r1) {
    const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, L = 6.5; let ex = (sx + hx) / 2, ey = (sy + hy) / 2;
    if (d < 2 * L) { const h = Math.sqrt(L * L - d * d / 4), px = -dy / d, py = dx / d, sg = px * qx + py * qy >= 0 ? 1 : -1; ex += px * h * sg; ey += py * h * sg; }
    const rm = (r0 + r1) / 2;
    for (let s = 0; s <= 1.001; s += 0.125) brush(sx + (ex - sx) * s, sy + (ey - sy) * s, r0 + (rm - r0) * s, M_SKIN, 0);
    for (let s = 0; s <= 1.001; s += 0.125) brush(ex + (hx - ex) * s, ey + (hy - ey) * s, rm + (r1 - rm) * s, M_SKIN, 0);
    LX = ex; LY = ey;
  }
  let LX = 0, LY = 0;
  function drawBackArm(yT, lean) {                               // 后臂（比腿粗）+ 链钩 + 手
    part(); limb(-4 + lean, yT + 3, P.bhx, P.bhy, -1, 0.3, 2, 1.6);
    part(); drawHook(P.bhx, P.bhy, P.hk, P.sharp);
    part(); rect(P.bhx - 1, P.bhy - 1, 3, 3, M_SKIN, 0); sp(P.bhx - 1, P.bhy - 1, M_SKIN, 4);
  }
  // 迷你圆顶礼帽（小到不合比例）：帽檐 4（只往前探出 1 格）+ 帽带 + 帽冠 3 + 圆顶 2 偏后（斜戴，偏在后脑勺上）；[dx, dy, 色调]，dy 向上为负
  const HAT = [[-2, 0, 0], [-1, 0, 0], [0, 0, 0], [1, 0, 3], [-2, -1, 2], [-1, -1, 2], [0, -1, 2], [-2, -2, 4], [-1, -2, 0], [0, -2, 0], [-2, -3, 4], [-1, -3, 3]];
  function drawHat(cx, cy, roll, mir) {                          // roll 1 / 2 = 侧倒（整 90° 旋转，帽冠朝左 / 朝右，都落在 cy 以上）；mir = 左右镜像（背面）
    const e = mir ? -1 : 1;
    for (const [dx, dy, t] of HAT) { const x = dx * e; if (!roll) sp(cx + x, cy + dy, M_HAT, t); else if (roll === 1) sp(cx + dy, cy + x - 1, M_HAT, t); else sp(cx - dy, cy - x - 3, M_HAT, t); }
  }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const lean = P.lean, yT = topY(), yB = -6 + (P.crouch >= 2 ? 1 : 0), hx = headX(), hy = yT - 2;
    if (!P.sharp) drawBackArm(yT, lean);
    // 腿 + 靴：短粗外八（前脚尖朝右、后脚尖朝左）。站着时前 +1、后 -5；走路时两腿交替到前面：
    //   接触 f0 前 +2 / 后 -6 → 经过 f1 两脚在 -2、后脚抬 1 格 → 接触 f2 前 -6 / 后 +2 → 经过 f3 两脚在 -2、前脚抬 1 格
    const fbx = P.walk ? Math.round(-2 + P.step * 4) : 1, bbx = P.walk ? Math.round(-2 - P.step * 4) : -5, upF = P.wup === 1 ? 1 : 0, upB = P.wup === 2 ? 1 : 0;
    part(); rect(bbx, yB, 4, -1 - upB - yB, M_PANTS, 0); sp(bbx + 1, -3 - upB, M_PANTS, 2); rect(bbx - 2, -1 - upB, 5, 2, M_BOOT, 0); if (!(P.walk && P.step < 0)) sp(bbx - 3, -upB, M_BOOT, 0);   // 后腿（远离镜头；迈到前面时不画朝后的脚尖，免得和前脚尖粘成一团）
    part(); rect(fbx, yB, 4, -1 - upF - yB, M_PANTS, 0); sp(fbx + 2, -3 - upF, M_PANTS, 2); rect(fbx, -1 - upF, 5, 2, M_BOOT, 0); sp(fbx + 5, -upF, M_BOOT, 0);     // 前腿（靠镜头，经过帧压在后腿上）
    part();                                                     // 桶腹躯干（裸肤，下垂的大肚右凸）+ 赘肉褶 + 肚脐 + 腹下的围裙带 + 金链
    for (let y = yT; y <= yB; y++) { bellyEdges(y, yT, yB); let L = bL, R = bR; if (y === yT) { L += 1; R -= 1; } run(y, L, R, M_BELLY, 0); }
    const yb = yT + 13; bellyEdges(yb, yT, yB); const L0 = bL, R0 = bR;
    run(yb, L0, R0, M_APRON, 2);
    bellyEdges(yT + 9, yT, yB); sp(bR - 3, yT + 9, M_BELLY, 2); sp(bR - 2, yT + 10, M_BELLY, 1);   // 肚脐
    bellyEdges(yT + 11, yT, yB); run(yT + 11, bL + 1, bL + 3, M_BELLY, 2); run(yb - 1, R0 - 3, R0 - 1, M_BELLY, 2);   // 赘肉褶
    sp(L0 + 1, yb + 1, M_GOLD, 3); sp(L0 + 2, yb + 2, M_GOLD, 4); sp(L0 + 3, yb + 2, M_GOLD, 3); sp(L0 + 4, yb + 2, M_GOLD, 3); sp(L0 + 5, yb + 1, M_GOLD, 3); sp(L0 + 3, yb + 3, M_GOLD, 4);
    part();                                                     // 褐皮胸围裙：颈带、被肚子撑得前鼓、下摆盖住大腿、成簇的血渍 + 淌下的血痕
    const yA = yT + 3;
    for (let y = yA; y <= -4; y++) {
      let L, R;
      if (y <= yB) { bellyEdges(y, yT, yB); const t = (y - yT) / (yB - yT); L = Math.round(-1 + lean * (1 - t) + bF * 1.2); R = Math.round(L + 5 + bF * 2.2); }
      else { L = -2 + (y === -4 ? P.sway : 0); R = 6 + P.sway; }
      run(y, L, R, M_APRON, 0);
      if (y === -4) for (let x = L + 1; x < R; x++) if (((x - P.sway) % 3) === 0) sp(x, y, 0, 0);
    }
    line(lean, yA, lean, yT, M_APRON, 2, 99); line(4 + lean, yA, 4 + lean, yT, M_APRON, 2, 99);
    const hot = P.rim >= 2, ST = [[3, 2, 3], [4, 2, 2], [4, 3, 2], [4, 4, 2], [4, 5, 1], [2, 8, 2], [3, 8, 3], [3, 9, 2], [3, 10, 1], [7, 10, 2], [6, 11, 3], [7, 11, 2], [1, 15, 2], [2, 15, 3], [2, 16, 2]];
    for (const [x, y, t] of ST) { bellyEdges(yA + y, yT, yB); spOn(x + lean + Math.round(bF * 1.2), yA + y, M_STAIN, hot ? t + 1 : t, M_APRON); }
    part();                                                     // 头：光头、双下巴、耳、粗眉骨、小眼、蒜头鼻、嘴
    run(hy - 4, hx - 1, hx + 3, M_SKIN, 0); for (let y = hy - 3; y <= hy; y++) run(y, hx - 2, hx + 4, M_SKIN, 0);
    run(hy + 1, hx - 1, hx + 5, M_SKIN, 0); run(hy + 2, hx, hx + 5, M_SKIN, 0); run(hy + 1, hx + 2, hx + 4, M_SKIN, 2);   // 双下巴 + 褶
    sp(hx + 3, hy - 4, M_SKIN, 4); sp(hx - 1, hy - 3, M_SKIN, 4); sp(hx, hy - 3, M_SKIN, 4);   // 光头高光：礼帽两侧都露出来
    sp(hx - 1, hy - 2, M_SKIN, 2); sp(hx - 1, hy - 1, M_SKIN, 2); sp(hx, hy - 1, M_SKIN, 2);   // 耳
    run(hy - 3, hx + 2, hx + 4, M_SKIN, 2);                       // 压低的粗眉骨
    if (P.eyes) run(hy - 2, hx + 2, hx + 3, M_SKIN, 1); else sp(hx + 3, hy - 2, M_INK, 1);
    sp(hx + 5, hy - 2, M_SKIN, 3); sp(hx + 5, hy - 1, M_SKIN, 3); sp(hx + 4, hy - 1, M_SKIN, 2);   // 蒜头鼻
    sp(hx + 3, hy, M_SKIN, 1); sp(hx + 4, hy, M_SKIN, 1); if (P.mouth) { sp(hx + 3, hy + 1, M_INK, 1); sp(hx + 4, hy + 1, M_INK, 1); }
    part(); drawHat(hx + 1, hy - 5 - P.hatY, 0);                 // 迷你礼帽（斜戴在后脑勺上方；受击时跳起 1 格）
    if (P.sharp) drawBackArm(yT, lean);                          // 磨刀：后臂把钩举到肚子前
    part();                                                     // 剁骨刀（或已插在地上）
    if (P.cv) drawCleaver(CV_X - P.bx, CV_Y + P.lift, Math.PI, -1, 0); else drawCleaver(P.hx, P.hy, P.a, 1, 0);
    part();                                                     // 前臂：比腿粗，两道旧刀疤
    const ssx = 3 + lean, ssy = yT + 3; limb(ssx, ssy, P.hx, P.hy, 1, 0.6, 2.1, 1.7);
    const ux = P.hx - LX, uy = P.hy - LY, ul = Math.hypot(ux, uy) || 1;
    for (const s of [0.3, 0.55]) { const cx = LX + ux * s, cy = LY + uy * s; sp(cx - uy / ul, cy + ux / ul, M_SKIN, 4); sp(cx, cy, M_SKIN, 4); }
    part(); rect(P.hx - 1, P.hy - 1, 3, 3, M_SKIN, 0); sp(P.hx - 1, P.hy - 1, M_SKIN, 4); sp(P.hx + 1, P.hy + 1, M_GOLD, 4);   // 手 + 金戒指
  }
  // 旋风的正面 / 背面两张（两臂左右平举）：back 0 = 正面（肚子正对镜头，刀在画面左、钩在右）；1 = 背面（宽背 + 腰后围裙带蝴蝶结，刀在右、钩在左）
  let fS = 0;
  function fEdge(y, yT, yB) { const t = clamp01((y - yT) / (yB - yT)); fS = Math.sin(Math.PI * Math.pow(t, 1.45)); return Math.round(4 + (7 + P.bel * 0.6) * Math.pow(fS, 0.6)); }   // 桶腹半宽：肩 4 → 腹 11
  function drawSpinView(back) {
    const yT = topY(), yB = -6, C = 1, hy = yT - 2, ay = yT + 3, cs = back ? 1 : -1;   // cs：拿刀那只手在画面哪一侧
    part();                                                     // 腿 + 靴：外八，脚尖朝外（背面看到鞋跟）；背面多一块裤座
    if (back) { rect(C - 5, yB, 11, 3, M_PANTS, 0); line(C, yB + 1, C, -3, M_PANTS, 2, 99); }
    for (const s of [-1, 1]) { const lx = s < 0 ? C - 6 : C + 3; rect(lx, yB, 4, -1 - yB, M_PANTS, 0); rect(s < 0 ? lx - 1 : lx, -1, 5, 2, M_BOOT, 0); if (!back) sp(s < 0 ? lx - 2 : lx + 5, 0, M_BOOT, 0); else sp(s < 0 ? lx + 1 : lx + 2, -1, M_BOOT, 3); }
    part();                                                     // 桶腹（正面）/ 宽背（背面）：左右对称，肚子两侧鼓出
    for (let y = yT; y <= yB; y++) { const e = fEdge(y, yT, yB); run(y, C - e + (y === yT ? 1 : 0), C + e - (y === yT ? 1 : 0), M_BELLY, 0); }
    { const y = yT + 11, e = fEdge(y, yT, yB); run(y, C - e + 1, C - e + 3, M_BELLY, 2); run(y, C + e - 3, C + e - 1, M_BELLY, 2); }   // 两侧赘肉褶
    if (!back) { run(yT + 6, C - 6, C - 4, M_BELLY, 2); run(yT + 6, C + 4, C + 6, M_BELLY, 2); }                                   // 胸下肉褶
    else { for (let y = yT + 2; y <= yT + 11; y++) sp(C, y, M_BELLY, 2); run(yT + 6, C - 5, C - 3, M_BELLY, 2); run(yT + 6, C + 3, C + 5, M_BELLY, 2); sp(C - 4, yT + 4, M_BELLY, 4); sp(C + 3, yT + 4, M_BELLY, 4); }   // 脊沟 + 肩胛
    part();
    const yb = yT + 13, eb = fEdge(yb, yT, yB);
    if (!back) {                                                // 正面：胸围裙（颈带、被肚子撑宽、下摆盖住大腿）+ 横过肚子的围裙带 + 金链 + 血渍
      const yA = yT + 3;
      for (let y = yA; y <= -4; y++) {
        let L, R; if (y <= yB) { fEdge(y, yT, yB); L = C - 3 - Math.round(fS * 1.5); R = C + 3 + Math.round(fS * 1.5); } else { L = C - 4 + (y === -4 ? P.sway : 0); R = C + 4 + P.sway; }
        run(y, L, R, M_APRON, 0); if (y === -4) for (let x = L + 1; x < R; x++) if (((x - P.sway) % 3) === 0) sp(x, y, 0, 0);
      }
      line(C - 3, yA, C - 2, yT, M_APRON, 2, 99); line(C + 3, yA, C + 2, yT, M_APRON, 2, 99);
      run(yb, C - eb, C + eb, M_APRON, 2);
      sp(C + 5, yb + 1, M_GOLD, 3); sp(C + 6, yb + 2, M_GOLD, 4); sp(C + 7, yb + 2, M_GOLD, 3); sp(C + 8, yb + 1, M_GOLD, 3); sp(C + 7, yb + 3, M_GOLD, 4);
      const hot = P.rim >= 2, ST = [[-1, 2, 3], [0, 2, 2], [0, 3, 2], [0, 4, 1], [2, 6, 2], [3, 6, 3], [3, 7, 2], [3, 8, 1], [-2, 9, 2], [-3, 10, 3], [-2, 10, 2], [1, 15, 2], [2, 15, 3], [2, 16, 2]];
      for (const [x, y, t] of ST) spOn(C + x, yA + y, M_STAIN, hot ? t + 1 : t, M_APRON);
    } else {                                                    // 背面：腰带横过后腰、正中打蝴蝶结（两个耳朵 + 结 + 两条尾巴）
      run(yb, C - eb + 1, C + eb - 1, M_APRON, 2);
      for (const s of [-1, 1]) { sp(C + 2 * s, yb - 1, M_APRON, 3); sp(C + 3 * s, yb - 1, M_APRON, 3); sp(C + 2 * s, yb, M_APRON, 3); sp(C + 3 * s, yb, M_APRON, 3); sp(C + 2 * s, yb + 1, M_APRON, 3); sp(C + 3 * s, yb + 1, M_APRON, 2); sp(C + s, yb + 2, M_APRON, 2); sp(C + 2 * s, yb + 3, M_APRON, 2); }
      sp(C, yb, M_APRON, 4); sp(C, yb - 1, M_APRON, 2); sp(C, yb + 1, M_APRON, 2); sp(C - 2, yb - 1, M_APRON, 4); spOn(C + 3, yb, M_STAIN, 2, M_APRON);
    }
    part();                                                     // 头：正面有脸（粗眉、小眼、蒜头鼻、张嘴吼）；背面是后脑 + 后颈肉褶
    run(hy - 4, C - 2, C + 2, M_SKIN, 0); for (let y = hy - 3; y <= hy + 1; y++) run(y, C - 3, C + 3, M_SKIN, 0); run(hy + 2, C - 2, C + 2, M_SKIN, 0);
    sp(C - 4, hy - 2, M_SKIN, 2); sp(C - 4, hy - 1, M_SKIN, 2); sp(C + 4, hy - 2, M_SKIN, 2); sp(C + 4, hy - 1, M_SKIN, 2);
    sp(back ? C - 2 : C + 2, hy - 4, M_SKIN, 4); sp(C - 2, hy - 3, M_SKIN, 4); sp(C - 1, hy - 3, M_SKIN, back ? 4 : 0);
    if (!back) {
      sp(C - 2, hy - 3, M_SKIN, 2); sp(C - 1, hy - 3, M_SKIN, 2); sp(C + 1, hy - 3, M_SKIN, 2); sp(C + 2, hy - 3, M_SKIN, 2);   // 压低的粗眉
      sp(C - 1, hy - 2, M_INK, 1); sp(C + 1, hy - 2, M_INK, 1); sp(C, hy - 2, M_SKIN, 3); sp(C, hy - 1, M_SKIN, 4); sp(C - 1, hy - 1, M_SKIN, 2); sp(C + 1, hy - 1, M_SKIN, 2);
      if (P.mouth) { run(hy, C - 1, C + 1, M_INK, 1); sp(C, hy + 1, M_INK, 1); } else run(hy, C - 1, C + 1, M_SKIN, 1);
      run(hy + 2, C - 1, C + 1, M_SKIN, 2);                     // 双下巴褶
    } else { run(hy + 1, C - 2, C + 2, M_SKIN, 2); sp(C - 3, hy + 2, M_SKIN, 2); sp(C + 3, hy + 2, M_SKIN, 2); }   // 后颈肉褶
    part(); drawHat(C, hy - 5, 0, back);                        // 礼帽（背面镜像：歪向他自己的同一侧）
    part(); limb(C + cs * 4, ay, P.hx, P.hy, 0, 1, 2.1, 1.7);   // 拿刀的手臂（比腿粗）+ 两道旧刀疤
    { const ux = P.hx - LX, uy = P.hy - LY, ul = Math.hypot(ux, uy) || 1; for (const s of [0.3, 0.6]) { const cx = LX + ux * s, cy = LY + uy * s; sp(cx, cy - 1, M_SKIN, 4); sp(cx + 1, cy - 1, M_SKIN, 4); } }
    part(); limb(C - cs * 4, ay, P.bhx, P.bhy, 0, 1, 2, 1.6);  // 拿钩的手臂
    part(); drawCleaver(P.hx, P.hy, P.a, cs, 0);                 // 剁骨刀：刀朝外平举，刃面朝下（刃里嵌发光）
    part(); drawHook(P.bhx, P.bhy, 0, 0, cs < 0 ? -1.45 : 1.45);  // 链钩往外甩平
    part(); rect(P.hx - 1, P.hy - 1, 3, 3, M_SKIN, 0); sp(P.hx - 1, P.hy - 1, M_SKIN, 4); sp(P.hx, P.hy + 1, M_GOLD, 4); rect(P.bhx - 1, P.bhy - 1, 3, 3, M_SKIN, 0); sp(P.bhx - 1, P.bhy - 1, M_SKIN, 4);
  }
  // 倒地姿：前扑（头朝右、脸朝下），大肚子压在地上鼓向两侧；刀插在身前，礼帽飞到身后
  function drawLying() {
    part();                                                     // 腿 + 靴（脚尖朝下，鞋跟朝上）
    rect(-16, -4, 7, 4, M_PANTS, 0); sp(-13, -4, M_PANTS, 4); sp(-11, -1, M_PANTS, 2); rect(-19, -6, 3, 6, M_BOOT, 0); sp(-20, -1, M_BOOT, 0); sp(-20, 0, M_BOOT, 0);
    part();                                                     // 链钩掉在身后
    for (let x = -8; x <= -5; x++) sp(x - 14, 0, M_IRON, (x & 1) ? 2 : 4);
    part();                                                     // 驼起的裸背 + 压扁后向两侧鼓出的肚子；背后围裙带打结
    for (let x = -11; x <= 6; x++) { const q = (x + 11) / 17, h = Math.round(1 + 8.5 * Math.pow(Math.sin(Math.PI * q), 0.6)); for (let y = -h; y <= 0; y++) sp(x, y, M_BELLY, 0); }
    run(0, -12, 7, M_BELLY, 0); run(-1, -12, 6, M_BELLY, 0);
    for (let y = -8; y <= 0; y++) sp(-6, y, M_APRON, 2); sp(-7, -9, M_APRON, 3); sp(-5, -9, M_APRON, 3); sp(-7, -10, M_APRON, 2); sp(-5, -10, M_APRON, 2);   // 腰后的围裙带 + 蝴蝶结
    run(0, -11, -7, M_APRON, 0); sp(-9, 0, M_STAIN, 2); sp(-2, -8, M_BELLY, 4); sp(-1, -8, M_BELLY, 4); sp(0, -7, M_BELLY, 4); run(-2, 1, 4, M_BELLY, 2);   // 压在地上的围裙摆、背部高光、赘肉褶
    part();                                                     // 伸向刀的前臂
    for (let s = 0; s <= 1.001; s += 0.125) brush(3 + 8 * s, -3 + 2 * s, 1.8 - s * 0.4, M_SKIN, 0);
    rect(11, -2, 2, 2, M_SKIN, 0); sp(12, -1, M_GOLD, 4);
    part();                                                     // 脸朝下的光头（头顶朝右）：后脑、耳、颈后肉褶、贴地的双下巴
    run(-6, 6, 9, M_SKIN, 0); for (let y = -5; y <= -1; y++) run(y, 5, 10, M_SKIN, 0); run(0, 6, 10, M_SKIN, 0);
    sp(5, -4, M_SKIN, 2); sp(5, -3, M_SKIN, 2); sp(7, -3, M_SKIN, 2); sp(7, -2, M_SKIN, 2); sp(7, -6, M_SKIN, 4); sp(8, -6, M_SKIN, 4); sp(6, -5, M_SKIN, 4); run(0, 7, 9, M_SKIN, 2);
    part(); if (P.hatX === 0 && P.hatY === 0) drawHat(12, -1, 2); else drawHat(10 + P.hatX, -P.hatY, P.hatR);   // 礼帽
    part(); drawCleaver(CV_X - P.bx, CV_Y + P.lift, Math.PI, -1, P.lift);   // 插地的刀（不随离地移动）
  }
  function drawHero() { oX = P.bx | 0; oY = -P.lift | 0; begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else if (P.spin >= 2) drawSpinView(P.spin === 3); else drawStanding(); }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效 ─────
  // 血滴（重力大、落地即停）和蓄力时汇向刀面、施放时被甩成血滴的定点粒子：引擎粒子池没有这种粒子，releaseOrbit 也不收定点汇聚粒子，
  // 所以这两种粒子放在本模块自己的小池里（物理、配色和原版一样，画在角色前面）；其余粒子都用引擎的。
  const DRAG = Math.exp(-3.4 * E.DT), GN = 240, G_PT = 1, G_DROP = 2;
  const gK = new Uint8Array(GN), gX = new Float32Array(GN), gY = new Float32Array(GN), gVX = new Float32Array(GN), gVY = new Float32Array(GN), gAge = new Float32Array(GN), gLife = new Float32Array(GN);
  const gA = new Float32Array(GN), gR = new Float32Array(GN), gW = new Float32Array(GN), gTX = new Float32Array(GN), gTY = new Float32Array(GN), gRamp = new Uint8Array(GN);
  let gHead = 0;
  function gSpawn(k, x, y, vx, vy, life, ramp, a, r, w) {
    let i = gHead; for (let n = 0; n < GN; n++) { const j = (gHead + n) % GN; if (gK[j] === 0) { i = j; break; } }
    gHead = (i + 1) % GN; gK[i] = k; gX[i] = x; gY[i] = y; gVX[i] = vx; gVY[i] = vy; gAge[i] = 0; gLife[i] = life; gRamp[i] = ramp; gA[i] = a || 0; gR[i] = r || 0; gW[i] = w || 0; gTX[i] = x; gTY[i] = y;
  }
  function gStep(dt) {
    for (let i = 0; i < GN; i++) {
      const k = gK[i]; if (!k) continue; gAge[i] += dt;
      if (k === G_PT) { gA[i] += gW[i] * dt; gR[i] -= gVX[i] * dt; if (gR[i] <= 3.5) { gK[i] = 0; continue; } gX[i] = gTX[i] + Math.cos(gA[i]) * gR[i]; gY[i] = gTY[i] + Math.sin(gA[i]) * gR[i] * 0.75; continue; }
      if (gAge[i] >= gLife[i]) { gK[i] = 0; continue; }
      gVX[i] *= DRAG; gVY[i] = gVY[i] * DRAG + 150 * dt; if (gY[i] >= HY && gVY[i] > 0) { gY[i] = HY; gVX[i] = 0; gVY[i] = 0; if (gAge[i] < gLife[i] - 0.15) gAge[i] = gLife[i] - 0.15; }
      gX[i] += gVX[i] * dt; gY[i] += gVY[i] * dt;
    }
  }
  function gDraw(f12) {
    for (let i = 0; i < GN; i++) {
      const k = gK[i]; if (!k) continue; const R = FXR[gRamp[i]]; let c;
      if (k === G_PT) { const s = (i + f12) % 6; c = s < 1 ? R[0] : s < 3 ? R[1] : R[2]; } else { const q = gAge[i] / gLife[i]; c = R[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]; }
      put(Math.round(gX[i]), Math.round(gY[i]), c);
    }
  }
  function drops(x, y, n, vmin, vmax, up, dir) { for (let i = 0; i < n; i++) { const a = (dir ? (dir > 0 ? -0.9 : 2.2) + Math.random() * 1.8 : i / n * 6.2832 + Math.random() * 0.4), v = vmin + Math.random() * (vmax - vmin); gSpawn(G_DROP, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.7 - up, 0.45 + Math.random() * 0.4, R_GORE); } }
  // 定点汇聚：从 (sx, sy) 沿缓弧飞向 (tx, ty)，用时 dur 秒；own = 放进本模块的小池（施放时要被甩成血滴的那些）
  function pull(sx, sy, tx, ty, dur, ramp, w, own) {
    const ddx = sx - tx, ddy = (sy - ty) / 0.75, r = Math.hypot(ddx, ddy), a = Math.atan2(ddy, ddx);
    if (own) gSpawn(G_PT, tx, ty, r / dur, 0, 9, ramp, a, r, w); else spawn(K_SPIRAL_PT, tx, ty, r / dur, 0, 9, ramp, a, r, w);
  }
  let smT = 9, smCX = 0, smCY = 0, slT = 9, sparkN = 0, chargeAcc = 0, soulAcc = 0, breathAcc = 0, dripAcc = 0, lastStep = 0;
  const SPIN_Y = -16, SPIN_R = 23, SPIN_RI = 15;                 // 旋风拖影：椭圆中心高度、外圈 / 内圈半径（本地坐标）
  const bellyX = () => HX + 4 + 5, bellyY = () => HY - 14;        // 吸回血雾的落点（前滑 4 格后的肚子）
  function hitSpin(n) {                                           // 旋风命中：两道斜切线 + 12 颗血滴 + 暗红环 + 血雾飘回肚子（回血）
    const x = DUMMY_X, y = HY - 15; hitDummy(1, 1); slT = 0; shake(0.12, 1);
    drops(x, y, 12, 40, 110, 30, 0); burst(x, y, 6, 50, 100, 0.15, 0.3, R_EL, 10); ring(x, y, 0, R_GORE);
    for (let w = 0; w < n; w++) { const ox = x - 2 + Math.random() * 5, oy = y - 5 + Math.random() * 10, bw = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()); for (let k = 0; k < 3; k++) pull(ox + k * 2, oy - k, bellyX(), bellyY(), 0.42 + k * 0.06 + w * 0.03, R_BSOUL, bw); }
  }
  function onEnter(s) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (s === CAST) {                                             // 汇聚的血滴外爆 + 甩出 30 颗血滴 + 冲击环 + 震屏 + 天空闪白
      for (let i = 0; i < GN; i++) if (gK[i] === G_PT) { const v = 40 + Math.random() * 50; gK[i] = G_DROP; gVX[i] = Math.cos(gA[i]) * v; gVY[i] = Math.sin(gA[i]) * v * 0.6 - 30; gAge[i] = 0; gLife[i] = 0.4 + Math.random() * 0.35; gRamp[i] = R_GORE; }
      drops(HX + 2, HY + SPIN_Y, 30, 70, 150, 40, 0); burst(gx, gy, 10, 60, 120, 0.2, 0.45, R_EL, 10);
      ring(HX + 2, HY + SPIN_Y, 1, R_EL); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === T_SPARK) { if ((sparkN++ & 1) === 0) spawn(K_BURST, scrX(9), HY - 14, 18 + Math.random() * 10, -22, 0.45, R_IMPACT); }   // 磨刀火星：每两个循环 1 颗
    if (s === ATTACK && t === T_FLICK) {                          // 竖劈落下（出手帧判定命中）：120° 大弧拖影、刀口命中火花 + 血滴
      smT = 0; smCX = scrX(7); smCY = HY - 18;                  // 圆心 = 出手帧的前肩（本地 4 + 前冲 3），弧的末端正好落在握刀的手上
      const x = DUMMY_X - 3, y = HY - 11; burst(x, y, 8, 40, 90, 0.15, 0.35, R_IMPACT, 10); drops(x, y, 6, 40, 90, 25, 1);
    }
    if (s === ATTACK && t === T_DHIT) hitDummy(0, 1);             // 假人晚 1 帧闪白 + 小摇（拖影最亮那一帧不和白色假人叠在一起）
    if (s === CAST && (t === T_HIT1 || t === T_HIT2)) hitSpin(t === T_HIT1 ? 3 : 2);
    if (s === RECOVER) burst(bellyX(), bellyY(), 3, 10, 25, 0.35, 0.6, R_EL, 18);   // 血雾吸回肚子：冒淡粉光点（回血）
    if ((s === HURT || s === DEATH) && t === INCOMING) drops(HX + HIT_POINT[0] - 1, HY + HIT_POINT[1], s === DEATH ? 6 : 4, 30, 70, 20, -1);   // 命中火花、震屏、闪白由引擎出；这里补血滴
    if (s === DEATH && t === INCOMING + 0.3) { for (let i = 0; i < 5; i++) spawn(K_DUST, HX + CV_X + 2 + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.2, R_DUST); }   // 刀插地
    if (s === DEATH && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) { const x = HX - 20 + Math.random() * 30; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); } shake(0.1, 1); }
    if (s === DEATH && t === INCOMING + 0.83) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 8 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_DUST); }   // 肚子回弹再落地
  }
  const EVENTS = [[T_SPARK], [], [T_FLICK, T_DHIT], [], [T_HIT1, T_HIT2], [0.17, 0.375], [INCOMING], [INCOMING, INCOMING + 0.3, INCOMING + 0.66, INCOMING + 0.83], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > 0.15) {                         // 献祭圆周地面冒出血滴，被吸向刀面
      chargeAcc += dt * (22 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832; pull(HX + Math.cos(a) * 17, FLOOR + 1 + Math.sin(a) * 3, gx, gy, 0.4 + Math.random() * 0.3, R_GORE, (Math.random() - 0.5) * 1.6, 1); }
    }
    if (state === CHARGE && P.mouth) { breathAcc += dt * 9; while (breathAcc >= 1) { breathAcc -= 1; spawn(K_EMBER, scrX(headX() + 6), HY + topY() - 1, 10 + Math.random() * 8, -4 - Math.random() * 5, 0.4 + Math.random() * 0.3, R_DUST); } }   // 呼白气
    if ((state === MOVE || (state === RECOVER && P.walk)) && P.step !== lastStep) { if (P.step !== 0) { const n = 3 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) spawn(K_DUST, scrX(P.step > 0 ? 4 : 3) + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 22, -4 - Math.random() * 7, 0.3 + Math.random() * 0.25, R_DUST); } lastStep = P.step; }   // 重步落脚 3–4 颗尘土
    if (state === IDLE || (state === RECOVER && stT < 0.55)) {    // 刀口滴血
      dripAcc += dt * (state === IDLE ? 0.8 : 7); while (dripAcc >= 1) { dripAcc -= 1; gSpawn(G_DROP, gx + Math.round(Math.random() * 4 - 2), gy + 3, 0, 4, 0.6, R_GORE); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_BSOUL); } }
    gStep(dt); smT += dt; slT += dt;
  }
  function fxReset() { smT = 9; slT = 9; chargeAcc = 0; soulAcc = 0; breathAcc = 0; dripAcc = 0; lastStep = 0; sparkN = 0; gK.fill(0); }
  // 旋风拖影：以身体为中心的扁椭圆（外圈猩红 2 格、内圈白 1 格）；拖影头和精灵同步，每个 12 fps 帧转 90°（右 → 前 → 左 → 后），
  // 施放 6 帧 + 收招前 2 帧 = 两圈，之后断续变暗消失；back = 画身后那半圈
  function spinTrail(back, f12) {
    const state = E.state, stT = E.stT; let tt, fade = 0;
    if (state === CAST) tt = stT; else if (state === RECOVER && stT < SPIN_F / 12 - DUR[CAST] + 0.16) tt = DUR[CAST] + stT; else return;
    const sweep = Math.min(tt * 12, SPIN_F) * 1.5708; if (tt * 12 > SPIN_F) fade = tt * 12 < SPIN_F + 1 ? 1 : 2;
    const cx = HX + P.mx + 2, cy = HY + SPIN_Y, head = sweep, span = Math.min(sweep, 6.2832);
    for (let s = 0; s < span; s += 0.035) {
      const ang = head - s, sn = Math.sin(ang); if ((sn < 0) !== back) continue;
      const age = s / 6.2832, cs = Math.cos(ang);
      if (fade && ((Math.round(s * 30) + f12) & 1)) continue; if (age > 0.6 && ((Math.round(s * 30) + f12) % 3) === 0) continue;
      const oc = fade === 2 ? EL[4] : fade ? EL[3] : age < 0.15 ? EL[1] : age < 0.6 ? EL[2] : EL[3], ic = fade ? EL[3] : age < 0.25 ? EL[0] : age < 0.6 ? EL[1] : EL[2];
      for (const r of [SPIN_R, SPIN_R + 1]) put(Math.round(cx + cs * r), Math.round(cy + sn * r * 0.4), oc);
      if (!fade || fade === 1) put(Math.round(cx + cs * SPIN_RI), Math.round(cy + sn * SPIN_RI * 0.4), ic);
    }
  }
  function fxBack(f12) {        // 画在角色后面：献祭圆（地面椭圆点阵 + 肉钩纹）、地面映光、敌弹映光
    const gx = scrX(P.gx), state = E.state, stT = E.stT;
    if ((state === CHARGE || state === CAST || (state === RECOVER && stT < 0.4)) && !P.lying) {
      const lit = state === CHARGE ? clamp01(stT / 0.9) : 1, n = 56, cx = HX + (state === CHARGE ? 0 : P.mx);
      for (let i = 0; i < n * lit; i++) { if (i & 1) continue; const a = i / n * 6.2832 + 1.5708, x = Math.round(cx + Math.cos(a) * 17), y = Math.round(FLOOR + 1 + Math.sin(a) * 3); put(x, y, i > n * lit - 5 ? EL[1] : ((i >> 1) + f12) % 7 === 0 ? EL[1] : state === RECOVER ? EL[3] : EL[2]); }
      if (lit > 0.5) { for (let i = 0; i < 40; i += 4) { const a = i / 40 * 6.2832, x = Math.round(cx + Math.cos(a) * 11), y = Math.round(FLOOR + 1 + Math.sin(a) * 2); put(x, y, EL[3]); } const hx = cx + 1, hy = FLOOR + 2; put(hx, hy - 1, EL[3]); put(hx, hy, EL[2]); put(hx - 1, hy + 1, EL[2]); put(hx - 2, hy + 1, EL[3]); put(hx - 3, hy, EL[2]); }   // 内圈 + 小肉钩纹
    }
    if (P.rim >= 2 && !P.lying) { const span = P.rim === 3 ? 12 : 6; for (let x = gx - span; x <= gx + span; x++) { const d = Math.abs(x - gx); if (P.rim === 3 ? d < span : ((x + f12) & 1) === 0) put(x, FLOOR, P.rim === 3 && d < 5 ? EL[1] : d < span * 0.5 ? EL[2] : EL[3]); } }
    shotFloorGlow(f12);
  }
  function fxMid(f12) { spinTrail(true, f12); }                  // 旋风拖影身后那半圈（假人前、角色后）
  function fxFront(f12) {       // 画在角色前面：旋风拖影前半圈、刀面闪光、竖劈拖影弧、斜切线、血滴
    spinTrail(false, f12);
    if (P.gem === 2 && !P.lying && ((f12 & 3) === 0)) { const x = scrX(P.gx), y = HY + P.gy; put(x, y - 3, EL[1]); put(x, y - 4, EL[2]); put(x - 1, y - 3, EL[2]); put(x + 1, y - 3, EL[2]); }   // 蓄力刀面闪光
    if (smT < 2 / 12) {                                           // 竖劈 120° 大弧（刀跟走过的路径，圆心在前肩，半径 12–14）：第 1 帧 3 格宽（白 / 粉 / 猩红，白只在弧的中段），第 2 帧 1 格断续暗血
      const f1 = smT < 1 / 12;
      for (let k = 0; k <= 36; k++) { const q = k / 36, a = 0.2 + 2.1 * q, s = Math.sin(a), c = -Math.cos(a);
        if (f1) { if (q < 0.3 && (k & 1)) continue; put(Math.round(smCX + s * 14), Math.round(smCY + c * 14), EL[2]); if (q >= 0.2) put(Math.round(smCX + s * 13), Math.round(smCY + c * 13), EL[1]); if (q >= 0.35) put(Math.round(smCX + s * 12), Math.round(smCY + c * 12), q <= 0.8 ? EL[0] : EL[1]); }
        else if ((k & 1) === 0) put(Math.round(smCX + s * 13), Math.round(smCY + c * 13), EL[3]); }
    }
    if (slT < 4 / 12) {                                           // 假人身上两道血色斜切线
      const f = f12of(slT);
      for (const o of [0, 4]) for (let k = 0; k <= 12; k++) { if (f >= 2 && ((k + f) & 1)) continue; const x = DUMMY_X - 7 + o + k, y = HY - 23 + k; put(x, y, f === 0 ? EL[0] : f === 1 ? EL[1] : f === 2 ? EL[2] : EL[3]); if (f < 2) put(x, y + 1, f === 0 ? EL[1] : EL[2]); }
    }
    gDraw(f12);
  }

  return {
    name: '屠宰场主', HX, R_EL, DUR, hero, P, GLOW_MATS, HIT_POINT, EVENTS,
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
