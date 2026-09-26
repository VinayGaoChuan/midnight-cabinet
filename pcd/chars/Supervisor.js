// 监工（部队 · 科技 · 祭司 · 传说 · 远程）：巫师发达以后坐进了一台黄铜双足步行椅——人胖了一圈（小肚子），穿黑色燕尾礼服、戴高礼帽，
// 静电白发从帽檐下炸开，额上的放大镜换成了单片眼镜；椅子两条粗活塞腿把他抬高 12 格；椅背上竖着秘银核心引擎：一颗银白发光球被四片黄铜护罩
// 像花瓣一样包住，两侧各立两根避雷针（承接巫师的背负发电机）；左手握一根秘银头指挥手杖，椅子右扶手伸出一条三节机械臂，末端一支铆钉枪（承接电极棒）。
// 攻击：手杖一指，机械臂铆钉枪「嗤」地射出一颗烧红的铆钉。
// 技能表现特性「秘银核心」（中范围光环，友军攻速 +15%）：护罩花瓣张开、核心越转越快，4 根避雷针依次点亮，监工起身半站、手杖高举；
// 施放时手杖向前一指 + 吹响铜哨，核心放出一圈带齿的银白齿轮环（边转边扩大），扫过的友军头顶各出现一个旋转的小齿轮 + 上升的银白粒子，最外圈落一层紫电火花。
// 死亡（瘫塌）：秘银核心闪三下熄灭 → 两条活塞腿同时折叠，椅子「咚」地坐到地上 → 监工歪倒在椅背上、礼帽滚落，护罩花瓣合拢，自上而下消散。
PCD.define('Supervisor', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_EMBER, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx, allyPoints, allyFx, fxRamp, keyer } = E;
  const RD = Math.round, px = parts.px, run = parts.run, rect = parts.rect, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：秘银 · 银白齿轮光（steel：白 → 银 → 灰蓝 → 铁 → 深铁）起手，紫电收尾（承接巫师，白 → 淡紫 → 紫 → 深紫 → 靛紫）─────
  const R_EL = FXI.steel, EL = FXR[R_EL];
  const R_V = fxRamp('wizVolt', [21, 43, 24, 42, 25]), VL = FXR[R_V];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: { r: [0, 52, 27, 28], band: 2 }, sleeve: [0, 52, 27, 28], hat: [0, 52, 27, 28],   // 黑色燕尾礼服 / 高礼帽
    shirt: 'white', trim: 'gold', skin: 'skin', hair: 'white', shoe: 'boot',
    brass: 'gold', chair: 'gold', steel: 'steel', iron: 'iron', cushion: 'crimson', cane: 'wood',
    silver: { r: [8, 59, 60, 17] }, eye: { r: [0, 0, 0, 0], flat: 1 }, glass: { r: [39, 41, 22, 21], flat: 1 },
    core: { r: [59, 60, 17, 21], flat: 1 },                       // 秘银核心（待机）
    hot: { r: [60, 17, 21, 21], flat: 1 },                        // 蓄满 / 施放 / 针尖点亮
    dead: { r: [0, 8, 9, 10], flat: 1 },                          // 熄灭
    muzzle: { r: [44, 45, 46, 47], flat: 1 },                     // 烧红的铆钉枪口
  });
  const HX = 34, DUR = DEFAULT_DUR.slice(), ALLY_X = [10, 62];
  const BODY = { body: 'fat', torso: 9, head: 7, headW: 7, sw: 4, arm: 9, belly: 2, lw: 2 };
  const hero = new Sprite(68, 58, 30, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'hair', 'core', 'hot', 'dead', 'muzzle', 'glass', 'eye', 'shirt', 'cane', 'silver', 'cushion', 'shoe']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
  const along = (x, y, d, i) => { const v = DIRS[d & 15], m = Math.max(Math.abs(v[0]), Math.abs(v[1])); return [x + RD(v[0] * i / m), y + RD(v[1] * i / m)]; };

  // ───── 姿势 ─────
  // 人：前手 hx/hy（扶手操纵杆 / 吹哨）、后手 bhx/bhy 握手杖 + 杖向 ca、lean、head、stand（起身半站 0–2）
  // 椅：sy 整体下沉（死亡折腿）、jolt 步态顿挫、lfx/lfu 近侧脚、lbx/lbu 远侧脚、petal 护罩张开 0–2、spin 核心刻线相位、lit 点亮的针尖数、mz 枪口、gunK 后坐
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ca: 0, lean: 0, head: 0, stand: 0, sy: 0, jolt: 0, lfx: 0, lfu: 0, lbx: 0, lbu: 0, petal: 0, spin: 0, lit: 0, mz: 0, gunK: 0,
    whistle: 0, tap: 0, gem: 0, rim: 0, eyes: 0, flash: 0, hatX: 0, hatY: 0, hatOff: 0, bob: 0, bx: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, mzx: 0, mzy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ca, lean, head, stand) => ({ hx, hy, bhx, bhy, ca, lean, head, stand });
  const K_IDLE = K(7, -18, 4, -22, 7, 0, 0, 0);                   // 手杖斜拄在身前、前手握扶手操纵杆
  const K_WIND = K(7, -18, 3, -25, 2, -1, -1, 0);                 // 预兆：手杖往回一扬
  const K_POINT = K(7, -18, 8, -23, 4, 1, 1, 0);                  // 手杖一指
  const K_CHARGE = K(7, -19, 2, -30, 1, 0, -1, 2);                // 蓄力：起身半站、手杖高举
  const K_CAST = K(5, -27, 9, -26, 3, 1, 0, 2);                   // 施放：手杖向前一指 + 前手把铜哨送到嘴边
  const K_HURT = K(6, -18, 2, -21, 6, -1, -1, 0);
  const K_SLUMP = K(6, -14, 2, -17, 8, -1, 1, 0);                 // 瘫在椅背上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ca', 'lean', 'head', 'stand'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = keyer([['hx', -8, 16], ['hy', -40, 0], ['bhx', -12, 16], ['bhy', -40, 0], ['ca', 0, 15], ['lean', -1, 1], ['head', -1, 1], ['stand', 0, 2], ['sy', 0, 9], ['jolt', 0, 1],
    ['lfx', -10, 8], ['lfu', 0, 4], ['lbx', -12, 8], ['lbu', 0, 4], ['bx', -8, 8]]);
  const KEY2 = keyer([['petal', 0, 2], ['spin', 0, 3], ['lit', 0, 4], ['mz', 0, 2], ['gunK', 0, 1], ['whistle', 0, 1], ['tap', 0, 1], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['hatX', -4, 20], ['hatY', 0, 5], ['hatOff', 0, 1], ['dqi', 0, 48], ['st', 0, 8]]);
  // 步行椅步态（近侧脚 x, 抬起, 远侧脚 x, 抬起, 顿挫）：接触 A → 经过 → 接触 B（两脚落点互换）→ 经过
  const WALK = [[5, 0, -9, 0, 1], [0, 0, -3, 4, 0], [-9, 0, 5, 0, 1], [-3, 4, 0, 0, 0]];
  const T_FIRE = 2 / 12, D_FOLD = 0.66, D_THUMP = 0.83;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.sy = 0; P.jolt = 0; P.lfx = 2; P.lfu = 0; P.lbx = -5; P.lbu = 0; P.petal = 1; P.spin = (f12 >> 2) & 3; P.lit = 0; P.mz = 0; P.gunK = 0;
    P.whistle = 0; P.tap = 0; P.gem = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.hatX = 0; P.hatY = 0; P.hatOff = 0; P.bob = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                               // 催工：手杖笃笃敲打拍子（每 0.4 s 一下），核心随拍子亮一次；偶尔掏出铜哨吹一声
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.tap = b & 1; P.gem = P.tap ? 0 : 1; P.bhy += P.tap ? -1 : 0;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.1) { P.hx = 5; P.hy = -26; P.whistle = 1; P.head = lp >= 1.75 && lp < 1.95 ? -1 : 0; P.eyes = lp >= 1.75 && lp < 1.95 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 步行椅踩踏：两条活塞腿一伸一缩，每步液压「嗤」一口白汽 + 顿挫 1 格
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq), w = WALK[f];
      P.lfx = w[0]; P.lfu = w[1]; P.lbx = w[2]; P.lbu = w[3]; P.jolt = w[4]; P.spin = f; P.bhy += w[4]; P.hy += w[4]; P.head = w[4] ? 1 : 0;
      const d = walkDemo(tq, 14, 1); P.mx = d.mx; P.flip = d.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.mz = 1; }
      else if (tq < 0.25) { setK(K_POINT, K_POINT, 0); P.mz = 2; P.gunK = 1; P.rim = 2; P.gem = 1; }
      else if (tq < 0.45) { setK(K_POINT, K_IDLE, ease.out((tq - 0.25) / 0.2) * 0.3); P.mz = 1; }
      else setK(K_POINT, K_IDLE, 0.3 + 0.7 * ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                        // 护罩张开、核心由慢到快转、4 根针尖依次点亮
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.petal = tq < 0.25 ? 1 : 2; const sp = tq < 0.5 ? 3 : tq < 1.0 ? 2 : 1; P.spin = Math.floor(f12 / sp) & 3;
      P.lit = tq < 0.3 ? 0 : tq < 0.55 ? 1 : tq < 0.8 ? 2 : tq < 1.05 ? 3 : 4;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.9 ? 2 : 3; P.jolt = tq > 1.05 ? f12 & 1 : 0;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.petal = 2; P.spin = f12 & 3; P.lit = 4; P.gem = 3; P.rim = 3; P.whistle = 1; }
    else if (st === RECOVER) {                                         // 护罩合拢、核心回到慢速、坐回椅子
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q);
      P.petal = q < 0.5 ? 2 : 1; P.spin = Math.floor(f12 / (q < 0.5 ? 2 : 4)) & 3; P.lit = q < 0.3 ? 4 : q < 0.6 ? 2 : 0; P.whistle = q < 0.4 ? 1 : 0;
      P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.hatY = 1; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.gem = (f12 & 1) ? 1 : 4; P.jolt = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 瘫塌：核心闪三下熄灭 → 活塞腿折叠、椅子坐到地上 → 人歪倒、礼帽滚落 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.hatY = 1; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.jolt = 1; P.gem = 2; }
      else if (d < D_FOLD) { setK(K_HURT, K_SLUMP, 0.3); P.bx = -2; P.eyes = 1; P.gem = (f12 & 1) ? 3 : 4; P.petal = d < 0.55 ? 1 : 0; }
      else {
        setK(K_SLUMP, K_SLUMP, 0); P.bx = -2; P.eyes = 1; P.gem = 4; P.petal = 0; P.spin = 0;
        P.sy = d < D_FOLD + 1 / 12 ? 4 : d < D_THUMP ? 7 : 9;
        P.lfx = 7; P.lbx = -10;
        if (d >= D_THUMP) { P.hatOff = 1; const hq = clamp01((d - D_THUMP) / 0.3); P.hatX = RD(16 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 5); }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.sy; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.sy; P.ca = ((RD(P.ca) % 16) + 16) % 16;
    P.lean = RD(P.lean); P.head = RD(P.head); P.stand = RD(P.stand); P.dqi = RD(P.dq * 48);
    const dy = P.sy + P.jolt, C = coreGeo(dy); P.gx = C.cx + P.bx; P.gy = C.cy;
    const G = gunGeo(dy, P.gunK); P.mzx = G.mx + P.bx; P.mzy = G.my;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 几何（本地坐标，y 向上为负；dy = 整体下沉）─────
  const coreGeo = (dy) => ({ cx: -10, cy: -36 + dy });
  const gunGeo = (dy, k) => ({ base: [6, -15 + dy], j1: [8, -20 + dy], j2: [10, -17 + dy], gx: 10 - k, gy: -17 + dy, mx: 17 - k, my: -17 + dy });
  const RODS = [[-16, -42], [-14, -40], [-6, -40], [-4, -42]];       // 两侧各两根避雷针：x、针尖 y（外侧更高）

  // ───── 画 ─────
  // 候选部件：mithrilCore —— 秘银核心引擎：椅背上的发光球（刻线随 spin 移动，5 档亮度）+ 四片黄铜护罩花瓣（petal 0 合拢 · 1 半开 · 2 全开）+ 两侧四根避雷针（lit 根针尖点亮）
  function mithrilCore(T, dy) {
    const { cx, cy } = coreGeo(dy), lv = P.gem, lit = P.lit;
    E.part();                                                          // 避雷针
    RODS.forEach(([x, ty]) => { for (let y = ty + dy; y <= cy + 1; y++) px(E, T, x, y, M.brass, y === ty + dy ? 4 : 0); });
    E.part();                                                          // 针尖（发光体）
    RODS.forEach(([x, ty], i) => { const on = i < lit; px(E, T, x, ty + dy - 1, on ? M.hot : M.core, on ? 4 : 2); if (on) { px(E, T, x - 1, ty + dy - 1, M.hot, 3); px(E, T, x + 1, ty + dy - 1, M.hot, 3); } });
    E.part();                                                          // 核心球
    const cm = lv === 4 ? M.dead : lv >= 2 ? M.hot : M.core;
    for (let y = -3; y <= 3; y++) { const w = y === -3 || y === 3 ? 1 : y === -2 || y === 2 ? 2 : 3; for (let x = -w; x <= w; x++) { const line = (((x + P.spin) % 3) + 3) % 3 === 0; px(E, T, cx + x, cy + y, cm, lv === 4 ? (line ? 1 : 2) : line ? (lv >= 3 ? 3 : 2) : lv >= 1 ? 4 : 3); } }
    if (lv < 4) px(E, T, cx - 1, cy - 2, cm, 4);
    E.part();                                                          // 四片护罩花瓣：左右两片包住球，上下两片小
    const o = P.petal, m = M.chair;
    for (const s of [-1, 1]) {
      const x0 = cx + s * (2 + o * 2);
      for (let y = -3; y <= 3; y++) { const bow = Math.abs(y) === 3 ? 1 : 0; run(E, T, cy + y - o, Math.min(x0 + s * bow, x0 + s * (1 + bow)), Math.max(x0 + s * bow, x0 + s * (1 + bow)), m, 0); }
      px(E, T, x0 + s * (o ? 2 : 1), cy - 4 - o, m, 4);                // 花瓣尖外翻
    }
    run(E, T, cy - 4 - o * 2, cx - 1, cx + 1, m, 0); px(E, T, cx, cy - 5 - o * 2, m, 4);   // 上瓣
    run(E, T, cy + 4, cx - 2, cx + 2, m, 0); run(E, T, cy + 5, cx - 1, cx + 1, M.iron, 0);   // 下瓣 + 底座
  }
  // 候选部件：walkerChair —— 步行椅：椅背（黄铜板 + 铆钉 + 深红靠垫）、座箱（铁边 + 前唇）、脚踏
  function chairBack(T, dy) {
    E.part(); const m = M.chair;
    for (let y = -30 + dy; y <= -13 + dy; y++) run(E, T, y, -12, -8, m, 0);
    run(E, T, -31 + dy, -11, -9, m, 0); for (let y = -28; y <= -16; y += 4) px(E, T, -11, y + dy, m, 4); run(E, T, -22 + dy, -12, -8, m, 2);
    E.part(); for (let y = -27 + dy; y <= -15 + dy; y++) run(E, T, y, -7, -6, M.cushion, 0); px(E, T, -7, -24 + dy, M.cushion, 2); px(E, T, -7, -19 + dy, M.cushion, 2);
  }
  function seat(T, dy) {
    E.part(); const m = M.chair;
    for (let y = -15 + dy; y <= -11 + dy; y++) run(E, T, y, -9, 6, m, 0);
    run(E, T, -11 + dy, -9, 6, M.iron, 0); run(E, T, -15 + dy, -9, 7, m, 4); px(E, T, 7, -14 + dy, m, 0);
    for (let x = -7; x <= 5; x += 4) px(E, T, x, -13 + dy, m, 2);
    run(E, T, -8 + dy, 5, 10, m, 0); px(E, T, 5, -9 + dy, m, 0); px(E, T, 5, -10 + dy, m, 0);   // 脚踏
  }
  // 候选部件：pistonLeg —— 活塞直腿：黄铜缸（3 格）+ 钢活塞杆 + 铁脚垫（前面两个脚趾），伸缩由脚的位置决定（dark 1 = 远侧暗一级）
  function pistonLeg(T, hx, hy, fx, fu, dark) {
    const cyl = dark ? M.chairD : M.chair, rod = dark ? M.steelD : M.steel, ft = dark ? M.ironD : M.iron, fy = -1 - fu;
    const mx = hx + (fx - hx) * 0.5, my = hy + (fy - hy) * 0.5;
    E.part(); parts.sweep(E, T, mx, my, fx, fy - 1, 0.6, 0.6, rod, 0);
    E.part(); parts.sweep(E, T, hx, hy, mx, my, 1.4, 1.2, cyl, 0); px(E, T, hx, hy, cyl, 4);
    E.part(); run(E, T, fy, fx - 2, fx + 2, ft, 0); run(E, T, fy + 1, fx - 2, fx + 3, ft, 0); px(E, T, fx + 3, fy + 1, ft, 3); px(E, T, fx - 1, fy, ft, 4);
  }
  // 候选部件：hatHair —— 从礼帽檐下炸开的静电白发（画在头之前，脑后三撮、鬓角一撮）
  function hatHair(T, R) {
    E.part(); const m = M.hair, x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey;
    for (let y = top; y <= ey + 2; y++) run(E, T, y, x0 - 1, x0 + 1, m, 0);
    parts.line(E, T, x0 - 1, top + 1, x0 - 4, top - 1, m, 0); parts.line(E, T, x0 - 1, top + 3, x0 - 5, top + 3, m, 0); parts.line(E, T, x0 - 1, ey + 2, x0 - 4, ey + 4, m, 0);
    px(E, T, x0 - 4, top - 1, m, 4); px(E, T, x0 - 5, top + 3, m, 4); px(E, T, x0 - 4, ey + 4, m, 3);
    run(E, T, top, x1 - 1, x1 + 2, m, 0); px(E, T, x1 + 2, top + 1, m, 4);
  }
  // 候选部件：seatedLegs —— 坐姿双腿：大腿平放在座上、小腿垂到脚踏
  function seatedLegs(T, R, dy) {
    for (const [dx, m, s] of [[-1, M.coatD, M.shoeD], [0, M.coat, M.shoe]]) {
      E.part(); const hy = R.yHip + 1, kx = 6 + dx;
      for (let y = hy - 1; y <= hy; y++) run(E, T, y, R.hipBx + 1 + dx, kx, m, 0);
      for (let y = hy + 1; y <= -9 + dy; y++) run(E, T, y, kx - 1, kx, m, 0);
      run(E, T, -9 + dy, kx - 1, kx + 2, s, 0); px(E, T, kx + 2, -9 + dy, s, 3);
    }
  }
  // 候选部件：cane —— 指挥手杖：墨色细杖身（16 方向吸附）+ 握点上方 2×2 秘银杖头
  function cane(T, x, y, d) {
    E.part(); for (let i = 1; i <= 11; i++) { const p = along(x, y, d, i); px(E, T, p[0], p[1], M.cane, i === 11 ? 4 : 0); }
    E.part(); const k = along(x, y, d, -2); rect(E, T, k[0] - 1, k[1] - 1, 2, 2, M.silver, 0); px(E, T, k[0] - 1, k[1] - 1, M.silver, 4);
  }
  // 候选部件：rivetArm —— 椅子右扶手伸出的三节机械臂 + 铆钉枪（枪口是发光体：0 暗 · 1 烧红 · 2 喷火）
  function rivetArm(T, dy) {
    const G = gunGeo(dy, P.gunK);
    E.part(); parts.sweep(E, T, G.base[0], G.base[1], G.j1[0], G.j1[1], 0.8, 0.8, M.chair, 0); parts.sweep(E, T, G.j1[0], G.j1[1], G.j2[0], G.j2[1], 0.7, 0.7, M.chair, 0);
    for (const j of [G.base, G.j1, G.j2]) px(E, T, j[0], j[1], M.iron, 3);
    E.part(); rect(E, T, G.gx, G.gy - 1, 5, 3, M.iron, 0); run(E, T, G.gy - 1, G.gx, G.gx + 4, M.iron, 4); px(E, T, G.gx + 1, G.gy, M.chair, 3); px(E, T, G.gx + 2, G.gy, M.chair, 3);
    run(E, T, G.gy, G.gx + 5, G.gx + 6, M.steel, 0); px(E, T, G.gx - 1, G.gy + 1, M.chair, 0); px(E, T, G.gx - 1, G.gy + 2, M.chair, 3);   // 枪管、弹匣
    E.part(); px(E, T, G.mx, G.my, M.muzzle, P.mz === 0 ? 1 : P.mz === 1 ? 3 : 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const T = parts.FREE, dy = P.sy + P.jolt;
    const R = parts.rig(P, Object.assign({}, BODY, { leg: 15 - dy + P.stand * 2 }));
    mithrilCore(T, dy); chairBack(T, dy);
    pistonLeg(T, -3, -11 + dy, P.lbx, P.lbu, 1); pistonLeg(T, 1, -11 + dy, P.lfx, P.lfu, 0);
    seat(T, dy);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.shirtD, grip: 'none' });
    seatedLegs(T, R, dy);
    parts.torso(E, R, P, { style: 'coat', mat: M.coat, collar: M.shirt, buttons: M.trim, trim: M.trim, hem: R.yHip + 1, flare: 1 });
    hatHair(R, R);
    parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.eye, brow: M.hair, nose: 'big', mouth: 'line', ear: 'dot' });
    parts.beard(E, R, P, { style: 'mustache', mat: M.hair });
    if (!P.eyes) { px(E, R, R.hx1 - 1, R.ey, M.glass, 3); px(E, R, R.hx1 - 2, R.ey, M.trim, 3); px(E, R, R.hx1 - 2, R.ey + 1, M.trim, 2); }   // 单片眼镜（和脸同一个部件）
    px(E, R, R.hx1 - 1, R.hy + 1, M.skin, 2); px(E, R, R.hx1 - 2, R.hy + 1, M.skin, 2);                                                       // 双下巴
    if (P.hatOff) parts.hat(E, R, P, { style: 'top', mat: M.hat, band: M.trim, at: [8 + P.hatX, -1 - P.hatY + (P.hatX > 10 ? 1 : 0)], rot: P.hatX > 6 && P.hatX < 14 ? 1 : 0 });
    else {
      const hr = Object.assign({}, R, { htop: R.htop - P.hatY }); parts.hat(E, hr, P, { style: 'top', mat: M.hat, band: M.trim });
      if (!P.whistle) { E.part(); px(E, R, R.hx1 + 1, R.htop - 3 - P.hatY, M.brass, 4); px(E, R, R.hx1 + 1, R.htop - 4 - P.hatY, M.brass, 3); }   // 帽带上插的铜哨
    }
    cane(R, P.bhx, P.bhy, P.ca);
    parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    E.part(); run(E, T, -17 + dy, -3, 6, M.chair, 0); px(E, T, 6, -17 + dy, M.chair, 4); px(E, T, 7, -18 + dy, M.iron, 0); px(E, T, 7, -19 + dy, M.iron, 4);   // 扶手 + 操纵杆
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.shirt, hand: M.skin });
    if (P.whistle) { E.part(); px(E, R, P.hx + 1, P.hy, M.brass, 4); px(E, R, P.hx + 2, P.hy, M.brass, 3); }
    rivetArm(T, dy);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastStep = -1, lastLit = 0, lastTap = -1, gearT = 9, markT = 9, mzT = 9, whT = 9, sparked = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const GEAR_DUR = 0.62, GEAR_R = 46;
  const gearR = (t) => 4 + GEAR_R * ease.out(clamp01(t / GEAR_DUR));
  function onEnter(s) {
    if (s === CHARGE) { fx.circle(HX - 2, HY + 1, 14, 3, R_EL, 2.3, -1, 0); lastLit = 0; }
    if (s !== CAST) return;
    const cx = wx(P.gx), cy = wy(P.gy);
    gearT = 0; markT = 9; whT = 0; sparked = 0;
    releaseOrbit(40, 100, 0.3, 0.6, { pts: 1 });
    burst(cx, cy, 20, 50, 110, 0.25, 0.55, R_EL, 6); fx.cross(cx, cy, 7, R_EL, 0.25, 2);
    allyFx({ dur: 1.15, outline: R_EL });
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                // 铆钉枪「嗤」地射出一颗烧红的铆钉
      mzT = 0; const x = wx(P.mzx), y = wy(P.mzy);
      shoot(1, x + 2, y, 200, DUMMY_X - 3, FXI.fire, 0, { trail: { every: 2, life: [0.1, 0.2], back: [10, 20], off: 2 }, glow: 3 });
      burst(x + 1, y, 5, 20, 50, 0.1, 0.25, R_EL, 4);
      sfx('swing', { kind: 'gun', w: 0.5 }); sfx('shoot', { proj: 'bullet' });
    }
    if (s === DEATH && t === INCOMING + D_THUMP) {                      // 椅子「咚」地坐到地上
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-12 + Math.random() * 24), HY, (Math.random() - 0.5) * 36, -6 - Math.random() * 12, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.85 });
    }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [INCOMING + D_THUMP], []];
  function impactOn(k, x, y) { burst(x, y, 10, 30, 90, 0.15, 0.35, FXI.fire, 8); burst(x, y, 5, 20, 60, 0.1, 0.3, R_EL, 4); hitDummy(0, 1); sfx('hit', { mat: 'metal', w: 0.5 }); }
  function drawShot(k, x, y, d, f12, R) {                             // 铆钉：白热钉头 + 烧红钉身 + 1 格钉帽
    if (k !== 1) return false;
    put(x + d, y, R[0]); put(x, y, R[1]); put(x - d, y, R[2]); put(x - 2 * d, y, R[3]); put(x - 2 * d, y - 1, R[3]); put(x - 2 * d, y + 1, R[3]);
    return true;
  }
  function stepFX(dt, state, stT) {
    const cx = wx(P.gx), cy = wy(P.gy);
    if (state === CHARGE) {                                            // 银白粒子螺旋汇向核心；针尖每点亮一根冒一个十字光
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = cx + (Math.random() - 0.5) * 44, sy = cy + 6 + Math.random() * 28, dx = sx - cx, dy = (sy - cy) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, cx, cy, r / (0.5 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), tx: cx, ty: cy, orbitR: 5 });
      }
      if (P.lit > lastLit) { const r = RODS[P.lit - 1]; fx.cross(wx(r[0] + P.bx - P.bx), wy(r[1] + P.sy + P.jolt - 1), 3, R_EL, 0.2, 2); lastLit = P.lit; }
    }
    if (state === MOVE && P.jolt !== lastStep) {                       // 活塞落地：液压白汽 + 3 颗尘土
      if (P.jolt) {
        const fx0 = wx(P.lfx < P.lbx ? P.lbx : P.lfx);
        sfx('step', { w: 0.85 });
        for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
        for (let i = 0; i < 4; i++) spawnX(K_RISE, wx(-1) + (Math.random() - 0.5) * 3, wy(-9), (Math.random() - 0.3) * 20 * (P.flip ? -1 : 1), -10 - Math.random() * 8, 0.35 + Math.random() * 0.2, R_EL, { age0: 0.1 });
      }
      lastStep = P.jolt;
    }
    if (state === IDLE) {                                              // 拍子：杖敲下去那一下，核心亮一次、杖头弹一颗小火星；吹哨时哨口冒白汽
      if (P.tap !== lastTap) { if (P.tap === 0) spawn(K_EMBER, cx, cy - 4, Math.random() * 6 - 3, -8, 0.3, R_EL); lastTap = P.tap; }
      if (P.whistle && Math.random() < dt * 14) spawn(K_RISE, wx(P.hx + 3), wy(P.hy - 1), 6 + Math.random() * 6, -6 - Math.random() * 6, 0.35, R_EL);
    }
    if (whT < 0.5 && Math.random() < dt * 30) spawn(K_RISE, wx(P.hx + 3), wy(P.hy - 1), 10 + Math.random() * 10, -8 - Math.random() * 8, 0.3, R_EL);
    if (gearT < GEAR_DUR + 0.1) {                                       // 齿轮环扫过友军：头顶挂小齿轮 + 上升银白粒子；到最外圈落一层紫电火花
      const r = gearR(gearT);
      for (const a of allyPoints()) if (Math.abs(a.x - cx) <= r && markT > 5) { markT = 0; sfx('impact', { pal: 'metal', w: 0.85 }); }
      if (!sparked && gearT >= GEAR_DUR) {
        sparked = 1; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.2832, x = cx + Math.cos(a) * r, y = Math.min(HY - 1, cy + Math.sin(a) * r * 0.55); spawnX(K_PHYS, x, y, Math.cos(a) * 20, -20 - Math.random() * 30, 0.4 + Math.random() * 0.25, R_V, { g: 160, floor: HY }); }
      }
    }
    if (markT < 1.1) { soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; const a = allyPoints()[Math.random() < 0.5 ? 0 : 1]; spawn(K_RISE, a.x - 3 + Math.random() * 6, HY - 4 - Math.random() * 10, (Math.random() - 0.5) * 4, -14 - Math.random() * 10, 0.5 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {   // 自上而下消散，银白魂光上升
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-14 + Math.random() * 26), HY - 2 - Math.random() * 20, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.6, R_EL); }
    }
    gearT += dt; markT += dt; mzT += dt; whT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastStep = -1; lastLit = 0; lastTap = -1; gearT = 9; markT = 9; mzT = 9; whT = 9; sparked = 0; }
  function fxBack(f12) { if (P.dq < 1 && P.sy === 0) floorGlow(HX - 4, P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const cx = wx(P.gx), cy = wy(P.gy);
    if (gearT < GEAR_DUR) {                                            // 带齿的银白齿轮环：环边每 3 格一个齿，边转边扩大
      const q = gearT / GEAR_DUR, r = gearR(gearT), ry = r * 0.55, n = Math.ceil(r * 5), c = q < 0.2 ? EL[0] : q < 0.5 ? EL[1] : q < 0.8 ? EL[2] : EL[3], rot = gearT * 3;
      for (let i = 0; i < n; i++) {
        if (q > 0.6 && ((i + f12) % 4) === 0) continue;
        const a = i / n * 6.2832 + rot, x = RD(cx + Math.cos(a) * r), y = RD(cy + Math.sin(a) * ry); if (y > HY) continue;
        put(x, y, c);
        if ((i % Math.max(3, RD(n / (r * 2.1)))) === 0) { const tx = RD(cx + Math.cos(a) * (r + 2)), ty = RD(cy + Math.sin(a) * (ry + 1.5)); if (ty <= HY) { put(tx, ty, c); put(RD(cx + Math.cos(a) * (r + 1)), RD(cy + Math.sin(a) * (ry + 0.8)), c); } }
      }
    }
    if (markT < 1.1 && !(markT > 0.9 && (f12 & 1))) {                  // 友军头顶的小旋转齿轮：3 帧转一圈
      const ph = f12 % 3;
      for (const a of allyPoints()) {
        const x = a.x, y = a.top - 7, c0 = markT < 0.15 ? EL[0] : EL[1];
        for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) put(x + dx, y + dy, EL[2]);
        const T3 = [[[0, -2], [2, 0], [0, 2], [-2, 0]], [[1, -2], [2, 1], [-1, 2], [-2, -1]], [[2, -1], [1, 2], [-2, 1], [-1, -2]]][ph];
        for (const [dx, dy] of T3) put(x + dx, y + dy, c0);
        put(x, y, EL[4]);
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 6 : 4 + (f12 & 1); for (let r = 5; r <= L; r++) { const c = r <= 5 ? EL[0] : EL[1]; put(cx + r, cy, c); put(cx - r, cy, c); put(cx, cy - r - 1, c); } }
    if (mzT < 2 / 12) { const x = wx(P.mzx), y = wy(P.mzy), c = mzT < 1 / 12 ? FXR[FXI.fire][0] : FXR[FXI.fire][2]; for (let r = 1; r <= 3; r++) { put(x + r, y, c); if (r < 3) { put(x + r - 1, y - r, FXR[FXI.fire][2]); put(x + r - 1, y + r, FXR[FXI.fire][2]); } } }
  }

  return {
    name: '监工', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.core, M.hot, M.muzzle], HIT_POINT: [0, -20], EVENTS, ALLIES: 'skill', ALLY_X,
    REVIVE: { ramp: R_EL, big: 1 },
    SFX: { body: 'machine', how: 'collapse', pal: 'metal', style: 'buff', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
