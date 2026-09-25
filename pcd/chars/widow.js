// 赌徒寡妇（远程领袖 · 英雄）：宽檐矮冠丧帽 + 后翘黑羽、钟形及地长裙、身前五张牌扇、斜伸的细长烟嘴；远程飞牌；技能「致命一掷」；场外「梭哈」（按 7）。
// 由 batch-00-pilot/widow/widow.html 转成共享引擎模块：第 3 节（角色）画法、姿势、时间线原样保留，第 4 节（特效）改用引擎的粒子 / 弹道 / 震屏 / 闪白。
PCD.define('widow', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, bake, ease, clamp01, mix, q12, f12of, gait, walkDemo, color, fxRamp, FXR, FXI, B8, DT, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_BURST, K_TRAIL, K_RISE, K_DUST,
    spawn, burst, shoot, shake, flash, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;

  // ───── 颜色：0–26 与共享色板相同；原版追加的 27–36 用 pc(原下标) 取本页下标 ─────
  const OWN = ['#08060c', '#17101f', '#2a1d3a', '#45335e',     // 27–30 丧服黑紫（勾线 / 暗 / 基 / 亮）
    '#c49a92', '#f2d8cc',                                       // 31–32 苍白肤（暗 / 基）
    '#34082a', '#8a1860', '#f048a8', '#ffd0ec'].map(color);     // 33–36 桃红（墨紫红 / 酒紫红 / 桃红 / 淡粉）
  const pc = (i) => (i < 27 ? i : OWN[i - 27]), mat = (a, band, flat) => defMat(a.map(pc), band, flat);
  const R_EL = fxRamp('peach', [21, 36, 35, 34, 33].map(pc)), EL = FXR[R_EL];   // 梭哈 · 桃红牌光（白 → 淡粉 → 桃红 → 酒紫红 → 墨紫红）
  const R_IMPACT = FXI.impact, R_DUST = FXI.dust;

  // ───── 材质、缓冲、姿势 ─────
  const M_DRESS = mat([27, 28, 29, 30], 2), M_CLOTH = mat([27, 28, 29, 30], 1), M_HAT = mat([27, 28, 29, 30], 1), M_FEATHER = mat([27, 27, 28, 30], 1);
  const M_HAIR = mat([27, 27, 28, 29], 1), M_LACE = mat([0, 0, 8, 8], 1, 1), M_SKIN = mat([27, 31, 32, 32], 1), M_RED = mat([33, 34, 35, 36], 1, 1);
  const M_GOLD = mat([20, 19, 14, 5], 1), M_CARD = mat([27, 18, 17, 21], 1), M_LIT = mat([27, 36, 21, 21], 1), M_BACK = mat([33, 33, 34, 35], 1);
  const M_CGOLD = mat([27, 19, 14, 5], 1);                      // 牌面上的金色内框：勾线用墨 27（不让暖褐 20 在牌边围一圈）
  const M_SLEEVE = mat([27, 28, 29, 30], 1), M_HAND = mat([27, 31, 32, 32], 1);   // 出牌手的前臂和手（颜色同丧服 / 苍白肤，单独成材质，出手帧的轮廓光只打在它们身上）
  const M_CUFF = mat([7, 18, 17, 17], 1), M_HOLD = mat([27, 18, 18, 17], 1), M_EMBER = mat([33, 34, 35, 36], 1, 1), M_INK = mat([0, 0, 0, 0], 1, 1);
  const HX = 34, DUR = DEFAULT_DUR.slice();                      // 远程：站在左边，假人在 x=98
  const hero = new Sprite(64, 52, 30, 46);                       // 缓冲：脚底 = (30, 46)；要放得下塌落的裙摊 + 滚出的烟嘴 + 甩牌最远伸展 + 羽毛
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: null };
  // 不吃轮廓光：烟嘴、烟头、点亮的牌、面纱、墨点、桃红点缀、羽毛（细长部件），以及长裙（光源在胸口以上，裙前沿整列变桃红会像条纹）
  const SKIP_BASE = new Uint8Array(256), SKIP_ARM = new Uint8Array(256).fill(1);   // 攻击出手帧：只有出牌手（袖子、白袖口、手）吃轮廓光，胸衣、帽檐、面纱不吃
  SKIP_BASE[M_HOLD] = SKIP_BASE[M_EMBER] = SKIP_BASE[M_LIT] = SKIP_BASE[M_LACE] = SKIP_BASE[M_INK] = SKIP_BASE[M_RED] = SKIP_BASE[M_FEATHER] = SKIP_BASE[M_DRESS] = 1;
  SKIP_ARM[M_SLEEVE] = SKIP_ARM[M_HAND] = SKIP_ARM[M_CUFF] = 0;
  // 姿势参数：连续插值，按 12 fps 取样后取整。取整后的取值范围（缓存键按此编码，超出会串位）：
  //   hx -32..31 · hy -64..63（出牌手）· fx -16..15 · fy -32..31（牌扇手）· a ±π（牌扇中轴角，π/32 一档）· lean / head -1..2 · bob 0..1
  //   fan 0..3（牌扇张开度）· lit 0..10（蓄力翻亮：lit/2 张已亮，奇数 = 下一张正在翻面）· card 0..3（右手：0 空 · 1 小牌 · 3 红心 A）· roll 0..2（指间翻牌：0 正面 · 1 侧面 · 2 背面）
  //   beard -3..4（面纱下摆摆动）· sway -1..2（裙摆）· bend 0..3（羽毛尾段后甩）· gem 0..3（红心 A / 出手光）· glint / eyes / flash / lying 0..1 · rim 0..3 · bx -16..15 · crouch 0..7（塌落）
  //   emb 0..3（烟头：0 暗 · 1 常亮 · 2 亮 · 3 熄）· sink 0..3（裙摊高度）· hatX -16..15 · hatY 0..15（飘落的帽子）· holdX 0..15（滚出的烟嘴）· wph 0..3（下摆波相位）· dq 0..1
  //   rimArm 0..1（1 = 轮廓光只打在出牌手上）
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, ddir: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, k1: 0, k2: 0,
    fx: 0, fy: 0, fan: 3, lit: 0, card: 1, roll: 0, emb: 1, sink: 0, holdX: 0, wph: 0, rimArm: 0 };
  // 关键帧：hx/hy 右手（近侧前臂，出牌手）；fx/fy 左手（远侧后臂，伸到身前举牌扇，枢轴在手心）；a 牌扇中轴角（0 = 朝上，π/2 = 朝前）
  const K_IDLE = { hx: 2, hy: -7, fx: 7, fy: -7, a: 0.785, lean: 0, head: 0 };                // 牌扇中轴朝右上 45°，五张牌吸附到 竖 · 1:2 · 45° · 2:1 · 横
  const K_WIND = { hx: -6, hy: -16, fx: 6, fy: -7, a: 0.785, lean: -1, head: -1 };   // 后引到肩（牌扇手只跟着身体挪，扇形不变）
  const K_FLICK = { hx: 10, hy: -18, fx: 7, fy: -7, a: 0.785, lean: 1, head: 1 };      // 甩腕出牌
  const K_HOLD = { hx: 9, hy: -14, fx: 7, fy: -7, a: 0.785, lean: 1, head: 0 };
  const K_DRAW = { hx: 8, hy: -18, fx: 6, fy: -7, a: 0.75, lean: 0, head: 0 };        // 蓄力：右手伸到扇顶抽牌
  const K_CHARGE = { hx: 11, hy: -21, fx: 7, fy: -6, a: 0.75, lean: -1, head: -1 };   // 红心 A 举到面纱前方（让开烟嘴）；牌扇略放低，让出抬起的右臂
  const K_CAST1 = { hx: 13, hy: -19, fx: -4, fy: -12, a: -0.55, lean: 2, head: 1 };    // 施放第 1 帧：甩腕到底，出牌手前伸并压低；牌扇手反向甩到背后（扇子在身后张开）
  const K_CAST = { hx: 12, hy: -18, fx: -3, fy: -11, a: -0.35, lean: 1, head: 1 };      // 施放保持
  const K_HURT = { hx: 1, hy: -12, fx: 5, fy: -7, a: 0.65, lean: -1, head: -1 };
  const K_SINK = { hx: 3, hy: -5, fx: 6, fy: -5, a: 1.0, lean: 1, head: 1 };           // 塌进裙摆
  const FIELDS = ['hx', 'hy', 'fx', 'fy', 'a', 'lean', 'head'];
  const mixPose = (A, B, q) => mix(P, A, B, q, FIELDS);
  const VEIL_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], ROLL_SEQ = [1, 2, 1, 0];
  // 滑行：身体不起伏；下摆最下 3 行波浪，裙撑一侧的后摆滞后 1 帧反向摆；接触帧（0、2）面纱 / 羽毛向后甩得更远
  const GLIDE_SWAY = [-1, 0, -1, 0], GLIDE_VEIL = [-3, -2, -3, -2], GLIDE_BEND = [3, 2, 3, 2], GLIDE_FAN = [0, 1, 0, -1], HEM_WAVE = [0, 1, 0, -1], WALK_DIST = 14;
  const FAN_STEP = [0, 0.13, 0.26, 0.39], CARD_LEN = [11, 10, 10, 9, 10], EMB_T = [2, 3, 4, 1];
  const T_FLICK = 2 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, k12 = f12of(t);
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.ddir = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 0;
    P.back = 0; P.bend = 1; P.fan = 3; P.lit = 0; P.card = 1; P.roll = 0; P.emb = 1; P.sink = 0; P.holdX = 0; P.wph = 0; P.rimArm = 0;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = VEIL_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.bend = 1 + (b & 1);
      const lp = tq % DUR[IDLE];                                  // 待机个性：收拢牌扇 → 刷地展开；指间翻牌（正 → 侧 → 背 → 侧 → 正）
      if (lp >= 0.7 && lp < 1.0) P.fan = lp < 0.78 ? 2 : lp < 0.86 ? 1 : 0;
      else if (lp >= 1.0 && lp < 1.09) { P.fan = 3; P.fy -= 1; P.fx += 1; P.glint = 1; }
      if (lp >= 1.4 && lp < 2.07) P.roll = ROLL_SEQ[Math.floor((lp - 1.4) * 6 + 1e-6) & 3];
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 滑行：裙摆遮脚，身体不起伏；下摆波浪 4 帧（每 2 个 12 fps 刻度换一帧），面纱 / 羽毛向后飘
      mixPose(K_IDLE, K_IDLE, 0); const f = gait(tq);
      P.walk = 1; P.wph = f; P.sway = GLIDE_SWAY[f]; P.beard = GLIDE_VEIL[f]; P.bend = GLIDE_BEND[f]; P.fx = K_IDLE.fx + (GLIDE_FAN[f] < 0 ? 1 : 0); P.fy = K_IDLE.fy + (f === 1 ? 1 : 0); P.hy = K_IDLE.hy + (f === 3 ? -1 : 0);
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    }
    else if (st === ATTACK) {                                   // 投：后引到肩 → 甩腕定格 → 延续 → 指尖变出新牌
      if (tq < 0.12) { mixPose(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.bend = 1; P.beard = 1; }
      else if (tq < 0.2) { mixPose(K_FLICK, K_FLICK, 0); P.card = 0; P.rim = 2; P.rimArm = 1; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { mixPose(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.card = 0; P.beard = -1; P.bend = 2; }
      else { mixPose(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.card = tq < 0.55 ? 0 : 1; P.roll = tq < 0.63 ? 1 : 0; }
    } else if (st === CHARGE) {                                 // 蓄力：牌扇举到胸前逐张翻亮；右手抽出红心 A 举到面纱前方
      if (tq < 0.35) mixPose(K_IDLE, K_DRAW, ease.inOut(tq / 0.35));
      else if (tq < 0.7) mixPose(K_DRAW, K_CHARGE, ease.inOut((tq - 0.35) / 0.35));
      else mixPose(K_CHARGE, K_CHARGE, 0);
      const q = clamp01(tq / 0.7), shiver = tq > 1.1 && (f12 & 1);
      P.card = tq < 0.17 ? 1 : tq < 0.42 ? 0 : 3;
      P.lit = Math.max(0, Math.min(10, k12 - 2));
      P.gem = tq < 0.7 ? 1 : tq >= 1.1 ? 2 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.12 ? 0 : tq < 0.35 ? 1 : 2; P.emb = tq < 0.5 ? 1 : 2;   // 轮廓光 0 → 1 → 2 缓入
      P.beard = -Math.round(q * 2) + (shiver ? 1 : 0); P.bend = (tq > 0.5 ? 3 : 2) - (shiver ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {                                   // 施放：甩腕定格 1 帧（前倾 2、头前探、面纱 / 羽毛甩到极限）→ 手臂前伸保持
      if (tq < 1 / 12) { mixPose(K_CAST1, K_CAST1, 0); P.beard = -3; P.bend = 3; P.sway = -1; }
      else { mixPose(K_CAST1, K_CAST, clamp01((tq - 1 / 12) / (1 / 12))); P.beard = -2; P.bend = 3; P.sway = -1; }
      P.card = 0; P.lit = 10; P.gem = 3; P.rim = 3; P.emb = 2; P.fan = 2;   // 甩到背后的牌扇半开（张开度 2），牌与牌的直角边都看得出来，不成一片翅膀
    } else if (st === RECOVER) {                                // 收招：牌光熄、收拢牌扇、吹一口烟、再刷地展开
      const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q);
      P.lit = Math.max(0, 10 - k12 * 3); P.fan = tq < 0.16 ? 2 : tq < 0.24 ? 1 : tq < 0.5 ? 0 : 3;
      P.card = tq < 0.5 ? 0 : 1; P.roll = tq < 0.58 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0; P.emb = tq < 0.3 ? 2 : 1;
      if (tq >= 0.3 && tq < 0.5) P.head = -1;
      P.beard = -Math.round(1 - q); P.bend = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.fan = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.bend = 0; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                  // 塌落：受击 → 身体塌进裙摆 → 裙摆摊成一圈 → 帽子和面纱最后飘落盖上 → 烟嘴滚出 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle();
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.fan = 1; P.card = 0; P.emb = (f12 & 1) ? 2 : 1; }
      else if (d < 0.5) { const q = clamp01((d - 0.3) / 0.2); mixPose(K_HURT, K_SINK, q); P.bx = -2; P.crouch = 3 + Math.round(q * 3); P.eyes = 1; P.beard = 1; P.bend = 1; P.fan = 0; P.card = 0; }
      else {
        mixPose(K_SINK, K_SINK, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.fan = 0; P.card = 0;
        P.sink = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.5) / 0.5); P.hatY = Math.round(11 * (1 - hq * hq)); P.hatX = hq < 1 ? Math.round(Math.sin(hq * 9) * 1.6) : 0;
        P.holdX = Math.round(9 * ease.out(clamp01((d - 0.66) / 0.4)));
        P.emb = d < 0.9 ? ((f12 & 1) ? 1 : 0) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 0) : 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ddir = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.emb = tq > 0.85 ? 2 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.fx = Math.round(P.fx); P.fy = Math.round(P.fy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head);
    // 发光体 / 焦点（轮廓光光源、特效挂点）：红心 A > 出牌手 > 牌扇 > 烟头（烟嘴末端 = 头 + (9, -3)）
    const hxh = P.lean + P.head, hyh = -20 + P.bob + P.crouch; let gx, gy;
    if (P.lying) { gx = 12 + P.holdX; gy = 0; }
    else if (P.card === 3) { gx = P.hx + 2; gy = P.hy - 4; }
    else if (st === CAST || (st === ATTACK && tq >= 0.12 && tq < 0.45)) { gx = P.hx + 1; gy = P.hy - 1; }
    else if (st === CHARGE) { gx = P.fx + 3; gy = P.fy - 5; }
    else { gx = hxh + 9; gy = hyh - 3; }
    P.gx = gx + P.bx; P.gy = gy;
    // 缓存键：任何一个取整后的参数变了才重画
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 2 + P.bob; k = k * 32 + P.fx + 16; k = k * 64 + P.fy + 32; k = k * 4 + P.fan; k = k * 16 + P.lit; k = k * 4 + P.card; k = k * 4 + P.roll; k = k * 2 + P.rimArm; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 2 + P.lying; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY;
    k = k * 128 + Math.round(P.dq * 48) + P.ddir * 64; k = k * 4 + P.emb; k = k * 4 + P.sink; k = k * 16 + P.holdX; k = k * 4 + P.wph; k = k * 4 + P.bend; P.k2 = k;
  }

  // ───── 画：部件工具 ─────
  let skL = 0, skR = 0;
  function skirtEdges(y, wy, sway, spread) {                     // 钟形长裙：前摆外鼓，后腰裙撑隆起（t 0 腰 → 1 下摆）
    const t = (y - wy) / Math.max(1, -wy), bust = 3.4 * Math.exp(-Math.pow((t - 0.2) / 0.17, 2)), s = sway * t * t;
    skL = Math.round(-2 - 5.8 * Math.pow(t, 0.95) - bust - (t > 0.05 && t < 0.36 ? 1 : 0) + s - spread * t);   // 后腰裙撑：上段再多凸 1 格
    skR = Math.round(2 + 5.2 * Math.pow(t, 0.8) + s + spread * t);
  }
  function arm(x0, y0, x1, y1, m2) {                              // 2 格粗的窄袖；m2：前臂（后半段）换成这个材质（出手帧让轮廓光只打在前臂上）
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))), horiz = Math.abs(dx) >= Math.abs(dy);
    for (let i = 0; i <= n; i++) { const x = x0 + dx * i / n, y = y0 + dy * i / n, m = m2 && i * 2 >= n ? m2 : M_CLOTH; sp(x, y, m, 0); if (horiz) sp(x, y + 1, m, 0); else sp(x + 1, y, m, 0); }
  }
  function cuff(x0, y0, x1, y1) {                                 // 白色「哭袖」（维多利亚丧服的白袖口），在手腕处
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, cx = x1 - dx / l * 1.6, cy = y1 - dy / l * 1.6;
    sp(cx, cy, M_CUFF, 0); sp(cx - dy / l, cy + dx / l, M_CUFF, 0); sp(cx + dy / l, cy - dx / l, M_CUFF, 0);
  }
  // 一张牌（像素画的斜牌画法）：牌的方向吸附到像素画常用的 5 个斜率（竖 · 1:2 · 45° · 2:1 · 横，四个象限对称），
  //   偏竖的牌画成每行 3 格、逐行错位的平行四边形（错位从远端往回数，远端两行对齐），远端是水平的一行；偏横的牌每列 3 格、逐列错位，远端是竖直的一列——远端永远是 3 格宽的平头。
  //   枢轴在手心，L = 远端到枢轴的距离，牌根藏在手心里。远端最外一行 / 列是牌面 17 / 21（外侧勾线墨 27）；往里 1 格是金色内框 14
  //   （像真扑克的内框，不描侧边；高光 5 只点在最上两张的 1 格）；再往里 1 格正中是花色点（红心 35 / 黑桃 0，每张 1 格）。
  //   st 0 正面 · 1 侧面（翻面中，只露 1 格宽的金边）· 2 点亮（牌面 21，内框淡粉 36，勾线仍是墨 27）
  const SNAP = [0, Math.atan(0.5), Math.PI / 4, Math.atan(2), Math.PI / 2], SNAP_R = [0, 0.5, 1, 0.5, 0];
  const CG = { up: true, r: 0, n: 0, R: 0, da: 0, db: 0 };
  function cardGeo(A, L) {                                        // 吸附后的牌：up 偏竖 / 偏横，r 错位斜率，n 远端离枢轴几行 / 列，R 远端的错位量，da 主方向，db 错位方向
    const s = Math.sin(A), c = Math.cos(A), th = Math.atan2(Math.abs(s), Math.abs(c));
    let j = 0; for (let q = 1; q < 5; q++) if (Math.abs(th - SNAP[q]) < Math.abs(th - SNAP[j]) - 1e-9) j = q;
    CG.up = j <= 2; CG.r = SNAP_R[j]; CG.n = Math.round(L / Math.hypot(1, CG.r)); CG.R = Math.round(CG.n * CG.r);
    CG.da = CG.up ? (c >= 0 ? -1 : 1) : (s >= 0 ? 1 : -1); CG.db = CG.up ? (s >= 0 ? 1 : -1) : (c >= 0 ? -1 : 1);
    return CG;
  }
  function cardLen(i) { return P.fan === 0 ? 7 + (4 - i) * 0.4 : CARD_LEN[i]; }   // 收拢成一叠时牌码齐变短（后面的牌略露出一点）
  function cardHead(i) {                                          // 第 i 张牌远端正中（相对枢轴），给特效挂点用
    const g = cardGeo(P.a + (i - 2) * FAN_STEP[P.fan], cardLen(i));
    return g.up ? [g.db * g.R, g.da * g.n] : [g.da * g.n, g.db * g.R];
  }
  function card(px, py, A, L, st, i) {
    const { up, r, n, R, da, db } = cardGeo(A, L);
    for (let k = 2; k <= n; k++) {                                // k = 离枢轴第几行 / 列（1 以内藏在手心里）
      const off = db * (R - Math.floor((n - k) * r + 1e-9)), head = k === n, band = k === n - 1, pipRow = k === n - 2;
      for (let w = -1; w <= 1; w++) {
        if (st === 1 && w !== 0) continue;
        const x = up ? off + w : da * k, y = up ? da * k : off + w;
        let m = st === 2 ? M_LIT : st === 1 ? M_CGOLD : M_CARD, tn = 0;
        if (st === 1) tn = head ? 4 : 3;
        else if (head) tn = 3;
        else if (band) { if (st === 2) tn = 2; else { m = M_CGOLD; tn = w === -1 && i < 2 ? 4 : 3; } }
        else if (pipRow && w === 0) { m = (i & 1) && st === 0 ? M_INK : M_RED; tn = 3; }
        sp(px + x, py + y, m, tn);
      }
    }
  }
  function drawFan() {                                            // 左手五张牌扇：每张牌一个部件，从后往前画，后一张盖住前一张，牌与牌之间自动压出墨色分界线
    const step = FAN_STEP[P.fan], half = P.lit >> 1, flipping = P.lit & 1;
    for (let i = 0; i < 5; i++) { part(); card(P.fx, P.fy, P.a + (i - 2) * step, cardLen(i), i < half ? 2 : (i === half && flipping) ? 1 : 0, i); }
  }
  function drawHeld(x, y, roll) {                                 // 右手指间的小牌（立在指尖右上）：0 正面（红心点）· 1 侧面（金边）· 2 背面（酒红）
    part();
    if (roll === 0) { rect(x + 1, y - 3, 2, 3, M_CARD, 0); sp(x + 1, y - 3, M_RED, 3); }
    else if (roll === 1) { for (let k = 1; k <= 3; k++) sp(x + 1, y - k, M_GOLD, 3); }
    else { rect(x + 1, y - 3, 2, 3, M_BACK, 0); sp(x + 2, y - 2, M_RED, 4); }
  }
  function drawAce(x, y) {                                        // 红心 A：5×6 大牌，(x, y) 为左下角；gem 2–3 时点亮
    part(); const m = P.gem >= 2 ? M_LIT : M_CARD;
    rect(x, y - 5, 5, 6, m, 0);
    const ht = P.gem >= 3 ? 4 : 3; sp(x + 1, y - 4, M_RED, ht); sp(x + 3, y - 4, M_RED, ht); run(y - 3, x + 1, x + 3, M_RED, ht); sp(x + 2, y - 2, M_RED, ht);
    sp(x + 2, y - 3, M_RED, P.gem >= 2 ? 4 : 3);
    part(); sp(x - 1, y, M_SKIN, 0); sp(x, y + 1, M_SKIN, 0); sp(x - 1, y + 1, M_SKIN, 0);   // 捏着牌角的指尖
  }
  // 黑鸵羽：1 格粗的细长弧，从帽带后端侧面插出，先向后上拱起（最高点比帽顶高 4 格、在帽冠后方）再向后下垂；
  // 羽轴两侧隔一格长 1 格羽枝；尾段按 bend 摆（0 受击回卷 · 1 常态下垂 · 2 被吹向后 · 3 甩到最后）。与帽冠之间始终空出 1 格
  const FEA_BASE = [[-4, -7], [-5, -8], [-6, -9], [-7, -10], [-7, -11], [-8, -12]];
  const FEA_TAIL = [
    [[-9, -12], [-10, -12], [-11, -11], [-11, -10], [-10, -9]],
    [[-9, -12], [-10, -11], [-11, -10], [-12, -9], [-12, -8]],
    [[-9, -12], [-10, -12], [-11, -11], [-12, -10], [-13, -9]],
    [[-9, -12], [-10, -12], [-11, -12], [-12, -11], [-13, -11], [-14, -10]]];
  function drawFeather(hx, hy, bend) {
    part();
    const pts = FEA_BASE.concat(FEA_TAIL[bend]), n = pts.length;
    for (let k = 0; k < n; k++) {
      const x = pts[k][0], y = pts[k][1]; sp(hx + x, hy + y, M_FEATHER, k === 5 || k === 7 ? 4 : 3);
      if (k >= 2 && k < n - 1 && (k & 1) === 0) {                 // 羽枝：隔一格长 1 格，垂直于羽轴，左右两侧交替
        const ddx = pts[k + 1][0] - pts[k - 1][0], ddy = pts[k + 1][1] - pts[k - 1][1], l = Math.hypot(ddx, ddy) || 1, sd = (k & 2) ? 1 : -1, ox = Math.round(-ddy / l) * sd, oy = Math.round(ddx / l) * sd;
        sp(hx + x + ox, hy + y + oy, M_FEATHER, k & 2 ? 4 : 2);
      }
    }
  }
  // 宽檐丧帽：宽帽檐（略向后戴：后端下垂、前端上翘 1 格，让开烟嘴）+ 宽而矮的平顶帽冠（8 格宽、2 格高：酒红帽带 + 帽顶）+ 帽带后端插羽毛的金别针
  function drawHat(hx, hy) {
    part();
    run(hy - 5, hx - 7, hx + 5, M_HAT, 0); sp(hx - 8, hy - 4, M_HAT, 0);
    run(hy - 6, hx - 5, hx + 7, M_HAT, 0);
    run(hy - 7, hx - 3, hx + 4, M_RED, 2); run(hy - 8, hx - 3, hx + 4, M_HAT, 0);
    sp(hx - 3, hy - 7, M_GOLD, 3);
  }
  // 面纱下的脸（列 -1..4，行 -4..0，相对 hx / hy）：整张脸罩在蕾丝面纱里——墨 0 与暗肤 k 交替的棋盘格；
  // 透出亮一点的眼光 E（32，旁边暗肤作眼窝）和红唇 l / L（34 / 35）；第 4 列是垂在脸前的面纱帘边，下摆垂到下巴下一格
  const FACE = ['0k0k0k', 'k0kE0k', '0k0k0k', 'k0lL.0', '0k0k0k'];
  function drawStanding() {
    const lean = P.lean, cr = P.crouch, wy = -12 + cr, yT = -18 + P.bob + cr, hx = lean + P.head, hy = yT - 2, spread = cr > 2 ? cr - 2 : 0;
    // 后臂（左手，远侧）：藏在身后，从胸前伸出 → 白袖口（牌扇和手在胸衣之后画，压在身前）
    const bsx = -1 + lean, bsy = yT + 1;
    const fanBehind = P.fx < 2;                                   // 施放时牌扇手甩到背后：扇子和手画在身体后面
    part(); arm(bsx, bsy, P.fx, P.fy);
    part(); cuff(bsx, bsy, P.fx, P.fy);
    if (fanBehind) { drawFan(); part(); rect(P.fx - 1, P.fy - 1, 2, 2, M_SKIN, 0); }
    // 钟形及地长裙 + 裙撑 + 蕾丝波浪下摆 + 褶
    part();
    for (let y = wy; y <= 0; y++) {
      skirtEdges(y, wy, P.sway, spread); let L = skL, R = skR;
      if (y >= -2) {                                              // 下摆波浪：待机最下 2 行；滑行扩到最下 3 行，裙撑一侧的后摆滞后 1 帧反向摆
        const r = -y;
        if (P.walk) { R += HEM_WAVE[(P.wph + r) & 3]; L -= HEM_WAVE[(P.wph + 3 + r) & 3]; }
        else if (y >= -1) { const w = HEM_WAVE[(P.wph + (y & 1)) & 3]; L -= w; R += (y === 0 ? -w : w); }
      }
      run(y, L, R, M_DRESS, 0);
      if (y === 0) for (let x = L + 1; x < R; x++) if (((x - P.wph) & 3) === 0) sp(x, y, 0, 0);
      if (y === -1) for (let x = L + 1; x < R; x++) if (((x - P.wph) & 3) === 2) sp(x, y, M_DRESS, 4);
    }
    for (let y = wy + 3; y <= -2; y++) { const t = (y - wy) / -wy, s = P.sway * t * t; sp(-1 - 2.6 * t + s, y, M_DRESS, 2); if (t > 0.4) sp(2.4 + 2 * t + s, y, M_DRESS, 2); if (t > 0.3 && t < 0.92) sp(0.4 + 0.2 * t + s, y, M_DRESS, 4); }
    for (let x = -6; x <= -2; x++) sp(x, wy + 2 + (x > -4 ? 1 : 0), M_DRESS, 2);        // 裙撑上的垂褶
    // 胸衣：窄肩细腰 + 高领 + 胸前红色沙漏徽（黑寡妇标记）
    part();
    const BOD = [[-1, 1], [-2, 2], [-2, 3], [-2, 3], [-2, 2], [-1, 2]], nR = wy - yT;
    for (let k = 0; k < nR; k++) { const row = BOD[Math.min(5, Math.round(k * 5 / Math.max(1, nR - 1)))], sh = Math.round(lean * (1 - k / Math.max(1, nR))); run(yT + k, row[0] + sh, row[1] + sh, M_CLOTH, 0); }
    run(yT - 1, hx - 1, hx + 1, M_CLOTH, 0);
    if (nR >= 4) { const s = lean; run(yT + 1, s, s + 2, M_RED, 2); sp(s + 1, yT + 2, M_RED, 3); run(yT + 3, s, s + 2, M_RED, 2); }
    // 腰间一串金筹码（单独部件，压在胸衣和裙子前面）：每枚 2 格（高光 5 + 金 14），枚与枚之间 1 格暗金 19；前侧垂下 3 枚
    part();
    skirtEdges(wy, wy, 0, 0);
    for (let x = skL - 1; x <= skR + 1; x++) { const k = (x - skL + 1) % 3; sp(x, wy, M_GOLD, k === 0 ? 4 : k === 1 ? 3 : 2); }
    sp(0, wy + 1, M_GOLD, 3); sp(0, wy + 2, M_GOLD, 4); sp(-1, wy + 3, M_GOLD, 3);
    // 牌扇 → 左手（伸到身前）
    if (!fanBehind) { drawFan(); part(); rect(P.fx - 1, P.fy - 1, 2, 2, M_SKIN, 0); }
    // 头：脑后发髻 + 金簪；整张脸罩在棋盘格面纱里，透出眼光和红唇
    part();
    for (let y = hy - 4; y <= hy - 1; y++) sp(hx - 2, y, M_HAIR, 0);
    rect(hx - 4, hy - 3, 2, 3, M_HAIR, 0); sp(hx - 3, hy - 4, M_HAIR, 0); sp(hx - 5, hy - 2, M_GOLD, 3);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
      let ch = FACE[r][c]; const x = hx - 1 + c, y = hy - 4 + r;
      if (P.eyes && ch === 'E') ch = '0'; if (P.eyes && ch === 'L') ch = '0';
      if (ch === '0') sp(x, y, M_LACE, 1); else if (ch === 'k') sp(x, y, M_SKIN, 2); else if (ch === 'E') sp(x, y, M_SKIN, 3);
      else if (ch === 'l') sp(x, y, M_RED, 2); else if (ch === 'L') sp(x, y, M_RED, 3);
    }
    const vs = P.beard > 0 ? 1 : P.beard < 0 ? -1 : 0;                                  // 面纱下摆：垂到下巴下一格，随动作摆
    sp(hx + vs, hy + 1, M_LACE, 1); sp(hx + 2 + vs, hy + 1, M_LACE, 1); sp(hx + 4 + vs, hy + 1, M_LACE, 1);
    if (P.beard >= 1) sp(hx + 5, hy, M_LACE, 1); if (P.beard >= 2) sp(hx + 5, hy - 2, M_LACE, 1);
    if (P.beard <= -2) sp(hx - 1, hy + 1, M_LACE, 1); if (P.beard <= -3) sp(hx - 2, hy, M_LACE, 1);
    // 黑鸵羽（插在帽带后端，画在帽子后面）→ 宽檐丧帽
    drawFeather(hx, hy, P.bend);
    drawHat(hx, hy);
    // 细长烟嘴：从唇边向前上方斜伸（象牙 + 金箍），伸出脸前沿 5 格 → 烟头（发光体）
    part(); sp(hx + 3, hy - 1, M_HOLD, 4); sp(hx + 4, hy - 1, M_HOLD, 4); sp(hx + 5, hy - 2, M_GOLD, 3); run(hy - 2, hx + 6, hx + 8, M_HOLD, 4);
    part(); sp(hx + 9, hy - 3, M_EMBER, EMB_T[P.emb]); if (P.emb === 2) sp(hx + 10, hy - 3, M_EMBER, 3);
    // 前臂（右手，近侧，出牌手）→ 白袖口 → 指间的牌 → 手 → 红心 A
    const fsx = 2 + lean, fsy = yT + 1;
    part(); arm(fsx, fsy, P.hx, P.hy, P.rimArm ? M_SLEEVE : 0);
    part(); cuff(fsx, fsy, P.hx, P.hy);
    if (P.card === 1) drawHeld(P.hx, P.hy, P.roll);
    part(); rect(P.hx - 1, P.hy - 1, 2, 2, M_HAND, 0);
    if (P.card === 3) drawAce(P.hx, P.hy - 1);
  }
  // 最终姿：塌落成一圈摊开的裙摆，帽子和面纱最后飘落盖在上面，烟嘴滚出
  function drawLying() {
    const s = P.sink;
    part(); run(0, -18, -17, M_CARD, 0); sp(-17, 0, M_RED, 3); run(0, -15, -14, M_BACK, 0);   // 地上散落的牌
    const hX = 8 + P.holdX;                                     // 滚出的烟嘴 + 烟头
    part(); sp(hX, 0, M_HOLD, 4); sp(hX + 1, 0, M_GOLD, 3); sp(hX + 2, 0, M_HOLD, 4); sp(hX + 3, 0, M_HOLD, 4);
    part(); sp(hX + 4, 0, M_EMBER, EMB_T[P.emb]);
    part();                                                     // 摊成一圈的裙摆
    const PL = [[-12, 11], [-11, 10], [-10, 8], [-9, 6], [-7, 4], [-4, 2], [-2, 1]], rows = 5 + (s >= 1 ? 1 : 0) + (s >= 3 ? 1 : 0);
    for (let k = 0; k < rows; k++) run(-k, PL[k][0], PL[k][1], M_DRESS, 0);
    run(-3, -11, -9, M_DRESS, 0); run(-4, -10, -8, M_DRESS, 0);                         // 裙撑隆起（后侧）
    for (let x = -11; x <= 10; x++) if (((x + 1) & 3) === 0) sp(x, 0, 0, 0);            // 蕾丝波浪下摆
    line(-2, -4, -8, -1, M_DRESS, 2, 99); line(1, -4, 5, -1, M_DRESS, 2, 99); line(-4, -3, -9, -1, M_DRESS, 4, 99);
    part(); sp(-1, -rows + 1, M_GOLD, 4); sp(1, -rows + 2, M_GOLD, 3); sp(-6, -1, M_GOLD, 4); sp(-5, -1, M_GOLD, 3);   // 散开的筹码腰链
    part(); rect(-3, -rows - 1, 5, 2, M_CLOTH, 0); sp(-1, -rows, M_RED, 2);              // 塌下的上身
    part(); rect(0, -rows - 3, 3, 3, M_HAIR, 0); sp(-1, -rows - 2, M_HAIR, 0); sp(3, -rows - 1, M_SKIN, 2);   // 垂下的头（发髻朝上）
    part(); sp(6, -2, M_CUFF, 0); sp(7, -2, M_CUFF, 0);                                   // 摊在裙边的手
    part(); rect(10, -2, 5, 2, M_CARD, 0); sp(14, -2, M_CARD, 3); sp(14, -1, M_CARD, 3); sp(13, -2, M_CGOLD, 3); sp(13, -1, M_CGOLD, 3); sp(12, -1, M_RED, 3);   // 合拢的牌扇滑落在手边（平头 + 金色内框 + 红心）
    part(); sp(8, -2, M_SKIN, 0); sp(9, -2, M_SKIN, 0); sp(9, -1, M_SKIN, 0);
    const cx = 1 + P.hatX, cy = -8 - P.hatY;                    // 最后飘落的帽子 + 面纱（cy = 帽檐行；帽子与站姿同一套画法，羽毛尾段下垂）
    drawFeather(cx, cy + 5, P.hatY > 0 ? 2 : 1);
    drawHat(cx, cy + 5);
    for (let y = cy + 1; y <= cy + 3; y++) for (let x = cx + 2; x <= cx + 5; x++) if (((x + y) & 1) === 0) sp(x, y, M_LACE, y === cy + 3 ? 1 : 3);   // 面纱垂在帽檐前
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() {
    HERO_RIM.skip = P.rimArm ? SKIP_ARM : SKIP_BASE; HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq;
    bake(hero, HERO_RIM);
  }

  // ───── 特效：梭哈 · 桃红牌光 ─────
  let smT = 9, smCX = 0, smCY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, smokeAcc = 0, soulAcc = 0, lastLit = 0;
  let xsT = 9, xsX = 0, xsY = 0, stickT = 9, stickX = 0, stickY = 0;   // 致命一牌命中：X 形交叉切线、钉在假人身上的牌
  let bigOn = 0, bigX = 0, bigY = 0, bigTX = 0;                         // 飞行中的致命一牌（跟着引擎弹道同步走，给它加第二道拖尾）
  // 本角色的粒子（引擎没有的运动方式，模块自己管一个小池子）：1 汇聚光点（直线汇向红心 A，施放时外爆）· 2 烟（慢拖曳 + 左右飘）· 3 烟圈（慢拖曳）
  const QN = 160, qK = new Uint8Array(QN), qX = new Float32Array(QN), qY = new Float32Array(QN), qVX = new Float32Array(QN), qVY = new Float32Array(QN), qAge = new Float32Array(QN), qLife = new Float32Array(QN), qA = new Float32Array(QN), qR = new Float32Array(QN), qW = new Float32Array(QN), qTX = new Float32Array(QN), qTY = new Float32Array(QN);
  let qHead = 0;
  const Q_IN = 1, Q_SMOKE = 2, Q_PUFF = 3, SDRAG = Math.exp(-1.6 * DT);
  function qSpawn(k, x, y, vx, vy, life, a, r, w) {
    let i = qHead; for (let n = 0; n < QN; n++) { const j = (qHead + n) % QN; if (!qK[j]) { i = j; break; } }
    qHead = (i + 1) % QN; qK[i] = k; qX[i] = x; qY[i] = y; qVX[i] = vx; qVY[i] = vy; qAge[i] = 0; qLife[i] = life; qA[i] = a || 0; qR[i] = r || 0; qW[i] = w || 0; qTX[i] = x; qTY[i] = y;
  }
  // 纸牌 / 筹码碎片：比 1 格粒子大一点的小物件（2 格），自己的小池子
  const DN = 64, dbK = new Uint8Array(DN), dbX = new Float32Array(DN), dbY = new Float32Array(DN), dbVX = new Float32Array(DN), dbVY = new Float32Array(DN), dbAge = new Float32Array(DN), dbLife = new Float32Array(DN), dbV = new Uint8Array(DN), dbRest = new Uint8Array(DN);
  let dbHead = 0;
  function debris(k, x, y, vx, vy, life, v) {   // k 1 纸牌（飘落翻转，落地后躺平）2 筹码（下坠，弹一下）；v bit0 = 桃红牌 bit1 = 黑桃
    let i = dbHead; for (let n = 0; n < DN; n++) { const j = (dbHead + n) % DN; if (dbK[j] === 0) { i = j; break; } }
    dbHead = (i + 1) % DN; dbK[i] = k; dbX[i] = x; dbY[i] = y; dbVX[i] = vx; dbVY[i] = vy; dbAge[i] = 0; dbLife[i] = life; dbV[i] = v || 0; dbRest[i] = 0;
  }
  // 蓄力时身侧上下弹跳的 7 枚金筹码（竖直小抛，不是螺旋）：相对 HX 的 x、弹跳高度、角频率
  const CHIP_X = [-17, -12, -9, 11, 14, 18, 21], CHIP_H = [6, 8, 5, 7, 9, 5, 7], CHIP_W = [8.5, 7, 9.5, 7.5, 6.5, 9, 8];
  function fanTip(i, out) { const [x, y] = cardHead(i), ox = CG.up ? 0 : CG.da * out, oy = CG.up ? CG.da * out : 0; return [scrX(P.fx + P.bx + x + ox), HY + P.fy + y + oy]; }   // 第 i 张牌平头远端的正中，再往外 out 格
  function mouthXY() { return [scrX(P.lean + P.head + 2 + P.bx), HY - 21 + P.bob + P.crouch]; }   // 红唇（头 + (2, -1)）
  function emberXY() { return [scrX(P.lean + P.head + 9 + P.bx), HY - 23 + P.bob + P.crouch]; }   // 烟头（头 + (9, -3)，烟嘴末端）
  function onEnter(s) {
    if (s === CAST) {                                            // 甩腕掷出致命一牌：出手处 16 颗金筹码 + 桃红星芒 + 震屏 2 格 + 天空闪白
      const hx = scrX(K_CAST1.hx + 1), hy = HY + K_CAST1.hy;
      for (let i = 0; i < QN; i++) if (qK[i] === Q_IN) { const a = Math.random() * 6.2832, v = 40 + Math.random() * 50; spawn(K_BURST, qX[i], qY[i], Math.cos(a) * v, Math.sin(a) * v * 0.75 - 10, 0.3 + Math.random() * 0.3, R_EL); qK[i] = 0; }
      burst(hx, hy, 16, 40, 115, 0.4, 0.85, R_IMPACT, 30); burst(hx, hy, 12, 60, 130, 0.2, 0.45, R_EL, 6);
      for (let i = 0; i < CHIP_X.length; i++) debris(2, HX + CHIP_X[i], HY - 2, Math.sign(CHIP_X[i]) * (14 + Math.random() * 22), -70 - Math.random() * 40, 0.9 + Math.random() * 0.3, 0);
      shoot(2, hx + 3, hy, 150, DUMMY_X - 4); bigOn = 1; bigX = Math.fround(hx + 3); bigY = hy; bigTX = DUMMY_X - 4;
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.0) { const [x, y] = fanTip(4, 0); burst(x, y, 4, 15, 35, 0.15, 0.3, R_EL, 6); }   // 牌扇刷地展开的一闪
    if (s === ATTACK && t === T_FLICK) {                         // 甩腕那一帧：拖影弧、出手金光、飞出小牌
      smCX = HX + 2 + K_FLICK.lean; smCY = HY - 17; smT = 0;
      mzT = 0; mzX = HX + K_FLICK.hx + 1; mzY = HY + K_FLICK.hy - 1; shoot(1, mzX + 1, mzY, 170, DUMMY_X - 3);
    }
    if (s === ATTACK && t === 0.55) burst(scrX(P.hx), HY + P.hy - 3, 3, 10, 25, 0.12, 0.25, R_EL, 4);   // 指尖变出新牌
    if (s === RECOVER && t === 0.33) {                           // 吹一口烟：一个烟圈往前飘 + 几缕散烟
      const [x, y] = mouthXY(), [ex, ey] = emberXY();
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; qSpawn(Q_PUFF, ex + 3 + Math.cos(a) * 1.3, ey - 1 + Math.sin(a) * 2, 22, -5, 0.9 + Math.random() * 0.2); }
      for (let i = 0; i < 5; i++) qSpawn(Q_SMOKE, x + 1 + (i & 1), y + 1, 10 + Math.random() * 14, -2 - Math.random() * 5, 0.8 + Math.random() * 0.5);
    }
    if (s === DEATH && t === INCOMING) for (let i = 0; i < 16; i++) {   // 牌雨：一叠牌从两边袖口四散飞出（命中火花、震屏、闪白由引擎画）
      const L = i & 1, x0 = HX - 2 + (L ? 6 : 2), y0 = HY + (L ? -12 : -9);
      debris(1, x0, y0, (L ? 1 : -1) * (8 + Math.random() * 40) + (Math.random() - 0.5) * 20, -45 - Math.random() * 55, 1.95 - Math.random() * 0.1, (Math.random() < 0.3 ? 1 : 0) | (Math.random() < 0.5 ? 2 : 0));
    }
    if (s === DEATH && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) { const x = HX - 16 + Math.random() * 28; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 34, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, R_DUST); } shake(0.1, 1); }
    if (s === DEATH && t === INCOMING + 1.0) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 1 + (i & 1 ? 8 : -8) + Math.random() * 2, HY - 8, (i & 1 ? 1 : -1) * (6 + Math.random() * 8), -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, R_DUST); }   // 帽子轻轻落下
    if (s === DEATH && t === INCOMING + 1.3) { for (let i = 0; i < 4; i++) qSpawn(Q_SMOKE, scrX(P.gx), HY - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 5, 0.9 + Math.random() * 0.5); }   // 烟头熄灭的一缕烟
  }
  const EVENTS = [[1.0], [], [T_FLICK, 0.55], [], [], [0.33], [], [INCOMING, INCOMING + 0.66, INCOMING + 1.0, INCOMING + 1.3], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); }
    else if (k === 2) {                                          // 牌钉进假人：X 形交叉切线 + 30 颗桃红外爆 + 头顶一小股金筹码喷泉（积分倍率）
      xsT = 0; xsX = Math.round(x); xsY = Math.round(y); stickT = 0; stickX = Math.round(x); stickY = Math.round(y);
      burst(x, y, 30, 60, 150, 0.3, 0.7, R_EL, 14);
      for (let i = 0; i < 12; i++) spawn(K_BURST, DUMMY_X + (Math.random() - 0.5) * 4, HY - 31, (Math.random() - 0.5) * 34, -80 - Math.random() * 45, 0.6 + Math.random() * 0.45, R_IMPACT);
      hitDummy(1, 1); shake(0.12, 1);
    }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      if (stT > 0.65) { chargeAcc += dt * (12 + 16 * clamp01((stT - 0.65) / 0.75)); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; qSpawn(Q_IN, gx, gy, r / (0.3 + Math.random() * 0.25), 0, 9, a, r, (Math.random() < 0.5 ? -1 : 1) * 0.8); } }   // 桃红光点直线汇向红心 A
      const lit = P.lit >> 1; if (lit > lastLit) { const [x, y] = fanTip(lit - 1, 0); burst(x, y, 3, 12, 30, 0.15, 0.3, R_EL, 8); } lastLit = lit;   // 每翻亮一张牌闪一下
    } else lastLit = 0;
    if (!P.lying && (state === IDLE || state === MOVE || state === ATTACK || state === REVIVE || (state === HURT && stT < INCOMING))) {   // 烟头冒一缕烟（滑行时向后飘）
      smokeAcc += dt * (state === MOVE ? 4 : 2.2); const [ex, ey] = emberXY();
      while (smokeAcc >= 1) { smokeAcc -= 1; qSpawn(Q_SMOKE, ex, ey - 1, state === MOVE ? (P.flip ? 10 : -10) : (Math.random() - 0.5) * 2, -6 - Math.random() * 5, 1.0 + Math.random() * 0.6); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < QN; i++) {
      const k = qK[i]; if (!k) continue; qAge[i] += dt;
      if (k === Q_IN) { qA[i] += qW[i] * dt; qR[i] -= qVX[i] * dt; if (qR[i] <= 2.5) { qK[i] = 0; continue; } qX[i] = qTX[i] + Math.cos(qA[i]) * qR[i]; qY[i] = qTY[i] + Math.sin(qA[i]) * qR[i] * 0.75; continue; }
      if (qAge[i] >= qLife[i]) { qK[i] = 0; continue; }
      if (k === Q_SMOKE) { qVX[i] = qVX[i] * SDRAG + Math.sin(qAge[i] * 5 + i) * 7 * dt; qVY[i] *= SDRAG; }
      else { qVX[i] *= SDRAG; qVY[i] *= SDRAG; }
      qX[i] += qVX[i] * dt; qY[i] += qVY[i] * dt;
    }
    if (bigOn) {                                                 // 致命一牌：引擎画 1 道拖尾，这里补上后面第 2 道（2 格桃红拖尾）
      bigX = Math.fround(bigX + 150 * dt);
      spawn(K_TRAIL, bigX - 5, bigY + (Math.random() < 0.5 ? -1 : 1), -(10 + Math.random() * 14), Math.random() * 6 - 3, 0.2 + Math.random() * 0.2, R_EL);
      if (bigX >= bigTX) bigOn = 0;
    }
    for (let i = 0; i < DN; i++) {
      if (!dbK[i]) continue; dbAge[i] += dt; if (dbAge[i] >= dbLife[i]) { dbK[i] = 0; continue; } if (dbRest[i]) continue;
      if (dbK[i] === 1) { const dr = Math.exp(-2.4 * dt); dbVX[i] = dbVX[i] * dr + Math.sin(dbAge[i] * 9 + i) * 34 * dt; dbVY[i] = dbVY[i] * dr + 70 * dt; }
      else dbVY[i] += 190 * dt;
      dbX[i] += dbVX[i] * dt; dbY[i] += dbVY[i] * dt;
      if (dbY[i] >= HY && dbVY[i] > 0) { dbY[i] = HY; if (dbK[i] === 2 && dbVY[i] > 45) { dbVY[i] *= -0.35; dbVX[i] *= 0.5; } else dbRest[i] = 1; }
    }
    stepOff(dt);
    smT += dt; mzT += dt; xsT += dt; stickT += dt;
  }

  // ───── 场外「梭哈」（查看页按 7，播放 8 秒；游戏里是领袖在场外按空格的全场效果）─────
  //   屏幕上方洒下桃红扑克牌与金筹码雨；右上角翻开一张大 A 牌并亮 8 秒；每击杀一个敌人，敌人处弹出一枚金筹码飞向积分栏，飞行中带「+0.1」桃红闪光
  let offT = 99, offAcc = 0, offStack = 0, cfT = 9, cfSX = 0, cfSY = 0, plusT = 9;
  const OFF_DUR = 8, OFF_KILLS = [1.4, 3.1, 4.8, 6.4], SCORE_X = 4, SCORE_Y = 18;
  function offField() { offT = 0; offAcc = 0; offStack = 0; cfT = 9; plusT = 9; }
  function stepOff(dt) {
    if (offT >= OFF_DUR) return; const prev = offT; offT += dt;
    if (offT < 2.4) { offAcc += dt * 18; while (offAcc >= 1) { offAcc -= 1; const c = Math.random() < 0.62; debris(c ? 1 : 2, 2 + Math.random() * 124, -2, (Math.random() - 0.5) * 12, c ? 8 + Math.random() * 12 : 14, c ? 3.4 : 2.6, c ? (1 | (Math.random() < 0.4 ? 2 : 0)) : 0); } }
    for (const k of OFF_KILLS) if (prev < k && offT >= k) { hitDummy(1, 1); cfT = 0; cfSX = DUMMY_X; cfSY = HY - 31; burst(DUMMY_X, HY - 16, 10, 40, 90, 0.2, 0.45, R_EL, 10); }
    if (cfT < 0.6) { cfT += dt; const [x, y] = chipFly(); spawn(K_TRAIL, x + 1, y, 0, 0, 0.25, R_EL); if (cfT >= 0.6) { plusT = 0; offStack++; burst(SCORE_X + 3, SCORE_Y, 8, 20, 50, 0.2, 0.4, R_EL, 0); } }
    plusT += dt;
  }
  function chipFly() { const q = clamp01(cfT / 0.6), e = q * q * (3 - 2 * q); return [Math.round(cfSX + (SCORE_X + 2 - cfSX) * e), Math.round(cfSY + (SCORE_Y - cfSY) * e - Math.sin(q * Math.PI) * 16)]; }
  const GLYPH = { '+': 0b000010111010000, '0': 0b111101101101111, '.': 0b000000000000010, '1': 0b010110010010111, 'A': 0b010101111101101 };
  function glyphs(str, x, y, c) { for (const ch of str) { const g = GLYPH[ch], w = ch === '.' ? 1 : 3; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if ((g >> (14 - r * 3 - q)) & 1) put(x + (w === 1 ? 0 : q), y + r, c); x += w + 1; } }
  function drawOff(f12) {
    if (offT >= OFF_DUR) return;
    const fade = offT > OFF_DUR - 0.5 ? (offT - (OFF_DUR - 0.5)) / 0.5 : 0, ax = 111, ay = 3;   // 右上角的大 A 牌：先翻面，再亮 8 秒
    const w = offT < 0.1 ? 1 : offT < 0.2 ? 5 : 11, x0 = ax + ((11 - w) >> 1), glow = (Math.floor(offT * 4) & 1) ? pc(36) : pc(35);
    for (let y = ay - 1; y <= ay + 14; y++) for (let x = x0 - 1; x <= x0 + w; x++) {
      if (fade && B8[(y & 7) * 8 + (x & 7)] < fade) continue;
      const edge = y === ay - 1 || y === ay + 14 || x === x0 - 1 || x === x0 + w, gold = !edge && (y === ay || y === ay + 13 || x === x0 || x === x0 + w - 1);
      put(x, y, edge ? glow : gold ? 14 : (w < 11 ? 17 : 21));
    }
    if (w === 11 && !fade) {
      glyphs('A', ax + 2, ay + 1, pc(35));
      const hx = ax + 5, hy = ay + 8; for (const [dx, dy] of [[-2, -1], [-1, -1], [1, -1], [2, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3]]) put(hx + dx, hy + dy, (dx === -2 && dy === 0) || (dx === -1 && dy === -1) ? pc(36) : pc(35));
    }
    for (let k = 0; k < offStack; k++) { const y = SCORE_Y + 4 - k * 2; put(SCORE_X, y, 19); put(SCORE_X + 1, y, 5); put(SCORE_X + 2, y, 14); put(SCORE_X + 3, y, 14); put(SCORE_X + 4, y, 19); }   // 积分栏旁堆起的筹码
    if (cfT < 0.6) { const [x, y] = chipFly(); put(x, y, 5); put(x + 1, y, 14); glyphs('+0.1', x - 6, y - 7, (f12 & 1) ? pc(36) : pc(35)); }
    if (plusT < 0.5) glyphs('+0.1', SCORE_X + 7, SCORE_Y - 2 - Math.floor(plusT * 8), plusT < 0.15 ? 21 : plusT < 0.3 ? pc(36) : pc(35));
  }

  // ───── 绘制钩子 ─────
  function fxReset() {
    qK.fill(0); dbK.fill(0); bigOn = 0; smT = 9; mzT = 9; chargeAcc = 0; smokeAcc = 0; soulAcc = 0; lastLit = 0;
    xsT = 9; stickT = 9; offT = 99; offAcc = 0; offStack = 0; cfT = 9; plusT = 9;
  }
  function drawChips(front) {   // 蓄力：身侧金筹码上下弹跳（顶点露侧面，落地是 2 格金币）
    if (E.state !== CHARGE) return; const t = q12(E.stT);
    for (let i = 0; i < CHIP_X.length; i++) {
      if ((CHIP_X[i] > 0) !== front) continue; const t0 = 0.2 + i * 0.07; if (t < t0) continue;
      const amp = CHIP_H[i] * Math.min(1, (t - t0) / 0.4), ph = Math.abs(Math.sin((t - t0) * CHIP_W[i])), x = HX + CHIP_X[i], y = HY - Math.round(amp * ph);
      if (t - t0 < 1 / 12) { put(x, y, 21); put(x + 1, y, 21); continue; }
      if (ph > 0.88) put(x, y, 19); else { put(x, y, 5); put(x + 1, y, 14); if (y === HY) put(x + 1, y + 1, 19); }
    }
  }
  function fxBack(f12) {        // 画在角色后面：地面映光、弹道映光、身后的筹码
    if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
    drawChips(false);
  }
  function fxFront(f12) {       // 画在角色前面：红心 A 星芒、出手星芒、甩腕拖影、出手金光、X 形切线、钉住的牌、筹码与纸牌碎片、本角色粒子、场外预览
    const gx = scrX(P.gx), gy = HY + P.gy, state = E.state, stT = E.stT;
    if ((state === CHARGE && P.card === 3 && P.gem >= 2) || state === CAST) {
      const big = state === CAST && stT < 0.25, L = big ? 6 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = big ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
      if (big) { put(gx + 2, gy + 2, EL[1]); put(gx - 2, gy - 2, EL[1]); put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy + 2, EL[1]); put(gx, gy, EL[0]); }
    }
    if (P.glint && state === IDLE) { const [x, y] = fanTip(4, 2); put(Math.round(x), Math.round(y), EL[0]); put(Math.round(x) + 1, Math.round(y), EL[1]); put(Math.round(x), Math.round(y) - 1, EL[1]); }
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[1] : EL[2]; for (let k = 0; k <= 10; k++) { if ((k & 1) && smT >= 1 / 12) continue; const a = -0.8 + 0.72 * k / 10, r = 8; put(Math.round(smCX + Math.cos(a) * r), Math.round(smCY + Math.sin(a) * r), c); } }   // 甩腕拖影弧（肩前上方 → 正前）
    if (mzT < 2 / 12) { const R = FXR[R_IMPACT], c = mzT < 1 / 12 ? R[0] : R[2]; put(mzX, mzY, c); put(mzX + 1, mzY, R[2]); put(mzX - 1, mzY, R[2]); put(mzX, mzY - 1, R[2]); put(mzX, mzY + 1, R[2]); if (mzT < 1 / 12) put(mzX + 2, mzY, R[1]); }   // 出手处 1 颗金光
    if (stickT < 0.9 && (state === CAST || state === RECOVER)) { const x = stickX, y = stickY; put(x - 3, y - 1, 17); put(x - 2, y - 1, 21); put(x - 1, y - 1, 17); put(x - 3, y, 17); put(x - 2, y, pc(35)); put(x - 1, y, 17); put(x - 4, y, 14); put(x - 4, y - 1, 14); }   // 钉在假人身上的牌
    if (xsT < 4 / 12) { const f = Math.floor(xsT * 12), cA = EL[f], cB = EL[f + 1]; for (let i = -7; i <= 7; i++) { if (f >= 2 && ((i + f) & 1)) continue; const c = Math.abs(i) < 3 ? cA : cB; put(xsX + i, xsY + i, c); put(xsX + i, xsY - i, c); } }   // X 形两道交叉切线（桃红 → 暗）
    drawChips(true);
    for (let i = 0; i < DN; i++) {
      if (!dbK[i]) continue; const x = Math.round(dbX[i]), y = Math.round(dbY[i]), q = dbAge[i] / dbLife[i];
      if (q > 0.72 && B8[(y & 7) * 8 + (x & 7)] < (q - 0.72) / 0.28) continue;
      if (dbK[i] === 1) { const face = (dbV[i] & 1) ? pc(36) : 17, pip = (dbV[i] & 1) ? pc(35) : (dbV[i] & 2) ? 0 : pc(35); if (dbRest[i] || ((f12 + i) & 1)) { put(x, y, face); put(x + 1, y, pip); } else { put(x, y - 1, face); put(x, y, pip); } }
      else if (!dbRest[i] && ((f12 + i) % 3) === 0) put(x, y, 19); else { put(x, y, 5); put(x + 1, y, 14); }
    }
    for (let i = 0; i < QN; i++) {                               // 本角色粒子：汇聚光点按序号闪烁，烟 / 烟圈按寿命走 dust 色阶
      const k = qK[i]; if (!k) continue; let c;
      if (k === Q_IN) { const s = (i + f12) % 6; c = s < 1 ? EL[0] : s < 3 ? EL[1] : EL[2]; }
      else { const q = qAge[i] / qLife[i], R = FXR[R_DUST]; c = R[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]; }
      put(Math.round(qX[i]), Math.round(qY[i]), c);
    }
    drawOff(f12);
  }
  function drawShot(k, x, y, d, f12) {   // 弹道外形：1 小飞牌（1×3 白边 + 红点，横竖交替）· 2 致命一牌（金边菱形 ↔ 金边白牌面 + 红心，两帧交替旋转）；敌弹用引擎默认外形
    if (k === 1) { if (f12 & 1) { put(x, y - 1, 21); put(x, y, pc(35)); put(x, y + 1, 17); } else { put(x - 1, y, 21); put(x, y, pc(35)); put(x + 1, y, 17); } return true; }
    if (k === 2) {
      if (f12 & 1) { for (let j = -2; j <= 2; j++) { const w = 2 - Math.abs(j); for (let i = -w; i <= w; i++) put(x + i, y + j, Math.abs(i) + Math.abs(j) === 2 ? 14 : 21); } put(x, y, pc(35)); put(x + 2 * d, y, 5); }
      else {
        for (let i = -3; i <= 3; i++) { put(x + i, y - 2, 14); put(x + i, y + 1, 14); }
        for (let j = -1; j <= 0; j++) { put(x - 3, y + j, 14); put(x + 3, y + j, 14); for (let i = -2; i <= 2; i++) put(x + i, y + j, 21); }
        put(x - 1, y - 1, pc(35)); put(x + 1, y - 1, pc(35)); put(x, y - 1, pc(36)); put(x, y, pc(35)); put(x + 3 * d, y - 2, 5);
      }
      return true;
    }
    return false;
  }

  return {
    name: '赌徒寡妇', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_LIT, M_EMBER], HIT_POINT: [1, -16], EVENTS,
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot, offField,
  };
});
