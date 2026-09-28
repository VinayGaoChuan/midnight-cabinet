// 木马公主（最终首领，第三章「废弃游乐园」的旋转木马）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「裂了缝的瓷娃娃、条纹顶棚」；旋转木马台；近战扎堆 · 怕远程；转圈（身边一大圈 3 秒持续伤害，最后把近战甩开）、跺脚 → 第二阶段 木马坠落（砸人最密的三处）。
// 设定卡 ——
//   剪影：从旋转木马台正中升起的巨大瓷娃娃上半身（原点 = 木马台面）：一颗比身子还宽的圆瓷脸，金色螺旋卷发垂到肩上，
//         一侧一个大红蝴蝶结、头顶一顶小金冠；手里一把「旋转木马顶棚」做的阳伞（红白条纹、金流苏、一圈灯泡），平时搭在肩上罩在头后；
//         身后两匹插在金杆上的木马，一上一下地起伏（识别点：大圆瓷脸 + 裂缝里的紫光 + 条纹顶棚阳伞 + 两匹木马）。
//   脸：玻璃珠一样的蓝眼睛、长睫毛、两团腮红、一点红嘴；一道裂缝从额头穿过近侧的眼睛裂到下巴，缝里漏出虚空的紫光；
//       嘴两边是木偶的铰链线，张嘴时整块下巴往下掉，里面是紫光。第二阶段裂缝爬满半张脸，近侧的眼睛整个变成紫光。
//   主色：暗玫瑰色的蓬蓬裙（membrane）、酒红的蝴蝶结和条纹（hellhide）、金（brass）、冷白的瓷；光源是裂缝和手里的虚空紫、顶棚灯泡的暖金。
//   招式（setMove）：spin 转圈 · stomp 跺脚 · horses 木马坠落 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 裂缝常亮。
//     转圈：张开双臂、歪头、木马开始绕着她转 → 阳伞举过头飞转、两匹木马绕着她一圈圈转（从身前转到身后），3 秒后双臂一甩把近战甩开。
//     跺脚：双手握住伞杆往上提、整个人拔高 → 伞杆像木桩一样砸进木马台（金色地浪、裂纹、灯泡全亮）。
//     木马坠落：远手高举、手心聚起紫光，两匹木马抖着从金杆上脱开浮起来 → 一挥手射上天（游戏画砸下来的木马），收招时新的木马从台子里升回来。
//     重击：伞杆往后收 → 往前一捅。升起：扒着台面爬出来、闭着眼 → 眼睛猛地睁开、下巴掉下来尖叫「别走」。
//     第二阶段：双手捂脸 → 两声心跳、裂缝一次比一次长 → 张开双臂仰头，下巴掉到底、瓷片崩飞，紫光从裂缝里涌出来。
//     死亡：尖叫、裂缝整个崩开掉下瓷片 → 像被剪断线的木偶一样歪头瘫下，眼睛还睁着 → 音乐盒的曲子越放越慢，沉回木马台。
PCD.define('B_doll', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, BR = DRAMP.brass, SM = DRAMP.stormmane;

  // ───── 材质（暗 → 亮）：裙子、条纹、金、头发都用共用色阶，只有瓷和虚空紫是自己的 ─────
  const R_PORC = ['#100a12', '#241a26', '#3a2e3c', '#554652', '#72606a', '#927e84', '#b09ea0', '#cabbba', '#e0d4d0', '#f0e8e2', '#fcf8f4'];
  const PORC = defDeep(R_PORC, { depth: 12, amb: 0.5 }), PORCD = defDeep(R_PORC, { depth: 6, dark: 1, amb: 0.3 }), LACE = defDeep(R_PORC, { depth: 3, dark: 1, amb: 0.2 });
  const HORSE = defDeep(R_PORC, { depth: 7, amb: 0.3 }), HORSED = defDeep(R_PORC, { depth: 5, dark: 2, amb: 0.16 });
  const DRESS = defDeep('membrane', { depth: 9, amb: 0.14 }), DRESSD = defDeep('membrane', { depth: 5, dark: 2, amb: 0.1 });
  const RED = defDeep('hellhide', { depth: 5, dark: 1, amb: 0.12 }), REDD = defDeep('hellhide', { depth: 4, dark: 3, amb: 0.08 });
  const GOLD = defDeep('brass', { depth: 5, amb: 0.12 }), GOLDD = defDeep('brass', { depth: 4, dark: 3, amb: 0.08 });
  const HAIR = defDeep('brass', { depth: 7, dark: 1, amb: 0.1 }), HAIRD = defDeep('brass', { depth: 6, dark: 3, amb: 0.06 });
  const VOIDM = defDeep('obsidian', { depth: 4, dark: 3, amb: 0.05 });
  const IRIS = defMat([SM[0], SM[3], SM[5], SM[6]], 1, 1), IRISH = defMat([SM[1], SM[5], SM[7], SM[7]], 1, 1);
  const BLUSH = defMat(ramp(['#a04860', '#d87890', '#eca0b0', '#f8c4cc']), 1, 1);
  const VO1 = defMat(ramp(['#1a0630', '#3c0c6a', '#7020c0', '#a850f0']), 1, 1), VO2 = defMat(ramp(['#3c0c6a', '#7020c0', '#a850f0', '#d8a0ff']), 1, 1), VO3 = defMat(ramp(['#7020c0', '#a850f0', '#d8a0ff', '#ffffff']), 1, 1);
  const BULB = defMat([BR[5], BR[7], BR[8], ramp(['#ffffff'])[0]], 1, 1), BULB0 = defMat([BR[1], BR[2], BR[3], BR[4]], 1, 1);
  const VOIDX = fxRamp('dollVoid', ['#ffffff', '#d8a0ff', '#a850f0', '#7020c0', '#3c0c6a']);                 // 特效：白 → 虚空紫 → 暗
  const PINKX = fxRamp('dollPink', ['#ffffff', '#ffd0e0', '#ff8ab0', '#d04a78', '#6a1838']);                 // 转圈的粉（和游戏里转圈的圈同色）
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { spin: { 3: 1.0, 4: 0.5, 5: 2.8 }, stomp: { 3: 1.3, 4: 0.45, 5: 0.7 }, horses: { 3: 1.5, 4: 0.5, 5: 0.9 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'spin', HOT = 0;   // HOT：第二阶段，裂缝爬满半张脸、常亮
  const VL = ramp(['#d8a0ff', '#a850f0', '#7020c0']), WARM = [BR[7], BR[6], BR[4]], FLOOR = [BR[6], BR[4], BR[2]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: VL, k: 0.9 }, { x: 0, y: 0, r: 60, ramp: FLOOR, k: 0.3 }, { x: 0, y: 0, r: 0, ramp: VL, k: 1 }, { x: 0, y: 0, r: 0, ramp: WARM, k: 0.55 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[VOIDX], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  for (const m of [VO1, VO2, VO3, BULB, BULB0, BLUSH, IRIS, IRISH, VOIDM]) RIM.skip[m] = 1;

  // 姿势：身体升降 / 前倾、歪头、下巴、两只手、阳伞（pa 伞的朝向，屏幕角度；gp 手到伞面的距离）、木马转到的角度 rot、木马离杆 hl
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'pa', 'gp', 'rot', 'hl', 'glow', 'eyes', 'crack', 'orb', 'flash', 'dq', 'hot', 'breath', 'bob', 'spinP', 'bulb', 'flare', 'shard', 'curl'];
  const K = {
    idle: { nx: 10, ny: -35, fx2: -14, fy2: -28, lean: 0, hd: 0.04, pa: -2.36, gp: 47 },
    swipeW: { nx: 2, ny: -50, fx2: -14, fy2: -30, lean: -0.12, hd: -0.1, pa: -2.75, gp: 38 },          // 普攻：伞收到身后 → 横扫到身前
    swipe: { nx: 38, ny: -40, fx2: -18, fy2: -34, lean: 0.22, hd: 0.14, pa: -0.3, gp: 38 },
    spinW: { nx: 36, ny: -50, fx2: -36, fy2: -48, lean: -0.04, hd: 0.18, pa: -1.2, gp: 28 },            // 转圈：张开双臂、歪头
    spin: { nx: 34, ny: -48, fx2: -38, fy2: -42, lean: 0, hd: -0.18, pa: -1.57, gp: 26 },
    fling: { nx: 48, ny: -32, fx2: -46, fy2: -30, lean: 0.08, hd: 0.12, pa: -0.35, gp: 30 },
    stompUp: { nx: 20, ny: -53, fx2: 18, fy2: -41, lean: -0.12, hd: -0.18, pa: -1.57, gp: 8 },          // 跺脚：双手握杆往上提
    stompDn: { nx: 26, ny: -34, fx2: 22, fy2: -24, lean: 0.3, hd: 0.34, pa: -1.57, gp: 8 },
    horsesW: { nx: 30, ny: -30, fx2: -26, fy2: -72, lean: -0.14, hd: -0.3, pa: -0.6, gp: 30 },       // 木马坠落：远手高举聚光
    horsesT: { nx: 34, ny: -64, fx2: -8, fy2: -84, lean: -0.2, hd: -0.38, pa: -0.9, gp: 40 },
    pokeW: { nx: 6, ny: -42, fx2: -16, fy2: -34, lean: -0.1, hd: 0, pa: -3.0, gp: 20 },                // 重击：伞杆往后收 → 往前捅
    poke: { nx: 44, ny: -38, fx2: -18, fy2: -32, lean: 0.3, hd: 0.18, pa: -3.05, gp: 20 },
    hunch: { nx: 12, ny: -64, fx2: -6, fy2: -66, lean: 0.22, hd: 0.15, pa: -3.05, gp: 36 },          // 第二阶段：双手捂脸
    wide: { nx: 42, ny: -58, fx2: -40, fy2: -56, lean: -0.16, hd: -0.3, pa: -1.1, gp: 36 },
    climbA: { nx: 32, ny: -12, fx2: -30, fy2: 2, lean: 0.3, hd: 0.34, pa: -2.7, gp: 30 },
    climbB: { nx: 30, ny: 2, fx2: -28, fy2: -12, lean: 0.3, hd: 0.34, pa: -2.7, gp: 30 },
    agony: { nx: 36, ny: -70, fx2: -32, fy2: -66, lean: -0.2, hd: -0.35, pa: -1.3, gp: 36 },
    limp: { nx: 28, ny: 2, fx2: -24, fy2: 2, lean: 0.4, hd: 0.75, pa: -2.95, gp: 30 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'pa', 'gp'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  const ROT0 = 0.08;
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.crack = HOT ? 2 : 0; P.rot = ROT0; P.mx = 0; P.flip = 0; }
  const BOB = [0, -1, -2, -3, -2, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bob = Math.floor(TT / 0.2) % 6; P.bulb = (f12 >> 1) & 1; P.curl = (f12 >> 2) & 1;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.glow = 1 + ((f12 >> 2) & 1); P.eyes = (f12 % 29 === 0) ? 0 : 1;
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.1) { P.hd = lp < 1.5 ? 0.16 : lp < 1.9 ? 0.34 : 0.08; P.eyes = lp >= 1.55 && lp < 1.65 ? 0 : 1; P.jaw = lp >= 1.6 && lp < 1.85 ? 1 : 0; P.glow = 2; } };   // 待机个性：头猛地歪到一边、眨一下眼、咯咯笑一声，再弹回来
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swipeW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 1; P.glow = 3; P.eyes = 2; P.spinP = 1; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.3; P.lean = -0.1; P.jaw = 1; P.eyes = 2; P.glow = 3; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 4; P.crack = Math.max(P.crack, 1); }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.crack = d > 0.35 ? 3 : 2; P.hd += (f12 & 1) ? 0.06 : 0; P.bulb = 2; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 2; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; P.crack = 3; P.bulb = (f12 & 1) ? 3 : 1; }
      else { pose(K.limp, K.limp); P.jaw = 2; P.glow = d < 2 ? 1 : 0; P.eyes = 1; P.crack = 3; P.bulb = 3; P.hl = -clamp01((d - 1.5) / 0.8); P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { spin: 0, stomp: 1, horses: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), jit = (f12 & 1) ? 1 : -1;
    if (MV === 'spin') {
      if (st === CHARGE) { pose(K.idle, K.spinW, ease.out(clamp01(q / 0.5))); P.rot = ROT0 + q * q * 1.3; P.flare = Math.round(q * 3); P.spinP = Math.floor(tq * 6); P.by = -Math.round(3 * q); P.glow = 2; P.eyes = q > 0.6 ? 2 : 1; P.jaw = q > 0.8 ? 1 : 0; P.bulb = (f12 & 1) ? 1 : 0; }
      else if (st === CAST) { pose(K.spinW, K.spin, ease.out(clamp01(tq / 0.15))); P.rot = ROT0 + 1.3 + tq * 9; P.flare = 5; P.spinP = f12; P.jaw = 1; P.glow = 3; P.eyes = 2; P.hd += (f12 >> 1) & 1 ? 0.2 : -0.1; P.bulb = f12 & 1; P.by = -3; }
      else if (tq < 2.5) { pose(K.spin, K.spin); P.rot = ROT0 + 1.3 + (0.5 + tq) * 9; P.flare = 5; P.spinP = f12; P.jaw = (f12 >> 2) & 1; P.glow = 3; P.eyes = 2; P.hd += (f12 >> 2) & 1 ? 0.22 : -0.12; P.ny += ((f12 >> 1) & 1) * 3; P.fy2 += ((f12 >> 1) & 1) ? 0 : 3; P.bulb = f12 & 1; P.by = -3; }
      else { const q2 = (tq - 2.5) / 0.3; pose(K.fling, K.idle, ease.inOut(clamp01((q2 - 0.33) / 0.67))); P.jaw = q2 < 0.5 ? 2 : 0; P.glow = q2 < 0.5 ? 3 : 2; P.eyes = 2; P.flare = q2 < 0.5 ? 4 : 1; P.bulb = 2; }
    } else if (MV === 'stomp') {
      if (st === CHARGE) { const u = ease.out(clamp01(q / 0.45)); pose(K.idle, K.stompUp, u); P.by = -Math.round(6 * ease.out(clamp01(q / 0.5))); if (q > 0.55) { P.nx += jit; P.fx2 += jit; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.eyes = q > 0.5 ? 2 : 1; P.jaw = q > 0.85 ? 1 : 0; P.bulb = q > 0.5 ? (f12 & 1) : P.bulb; }
      else if (st === CAST) { pose(K.stompDn, K.stompDn); P.by = 4; P.jaw = 2; P.glow = 3; P.eyes = 2; P.bulb = 2; P.flare = 2; }
      else { const u = clamp01(tq / 0.55); pose(K.stompDn, K.idle, ease.inOut(u)); P.by = Math.round(4 * (1 - u)); }
    } else if (MV === 'horses') {
      if (st === CHARGE) { pose(K.idle, K.horsesW, ease.out(clamp01(q / 0.4))); P.orb = Math.round(clamp01(q / 0.7) * 4); P.hl = clamp01((q - 0.25) / 0.75) * 0.55; P.eyes = 2; P.glow = q < 0.4 ? 2 : 3; P.jaw = q > 0.8 ? 1 : 0; P.by = -Math.round(4 * q); P.bulb = 0; }
      else if (st === CAST) { pose(K.horsesW, K.horsesT, ease.out(clamp01(tq / 0.12))); P.hl = 3; P.jaw = 3; P.glow = 3; P.eyes = 2; P.by = -4; P.bulb = 2; }
      else { pose(K.horsesT, K.idle, ease.inOut(clamp01(tq / 0.6))); P.hl = tq < 0.3 ? 3 : -1 + clamp01((tq - 0.3) / 0.5); P.glow = 2; P.jaw = tq < 0.2 ? 2 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.5))); P.by = -3; if (q > 0.5) { P.nx += jit; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.eyes = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { pose(K.poke, K.poke); P.jaw = 1; P.glow = 3; P.eyes = 2; }
      else pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f] + 2 * Math.round(9 * (1 - clamp01(q / 0.9))); P.eyes = q > 0.8 ? 1 : 0; P.glow = 1 + (f12 & 1); P.hl = -1 + clamp01(q / 0.85); P.rot = ROT0; P.bulb = q > 0.5 ? (f12 & 1) : 3; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.bulb = 2; P.flare = 3; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：双手捂脸 → 两声心跳、裂缝一次比一次长 → 张开双臂仰头，下巴掉到底、瓷片崩飞
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.2))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 0; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.crack = tq < 0.35 ? 1 : 2; P.bulb = hb ? 2 : 3; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.crack = 2; P.shard = 1; P.bulb = 2; P.flare = 3; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.hd += hold ? ((f12 >> 2) & 1 ? 0.12 : -0.06) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.crack = 2; P.bulb = f12 & 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [14, -45], SHF = [-13, -45], NECK = [1, -52], PLEN = 64;
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.8 - P.lean * 0.5); }   // 娃娃歪头的幅度大
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(0, -40);
    headXf(); L.eye = H.at(9, -71); L.crackC = H.at(10, -73); L.mouth = H.at(3, -59); L.head = H.at(2, -70);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 16, 17, -1); L.elF = B.ik(L.shF, L.hF, 16, 17, 1);
    const d = [Math.cos(P.pa), Math.sin(P.pa)]; L.pd = d; L.can = [L.hN[0] + d[0] * P.gp, L.hN[1] + d[1] * P.gp]; L.tip = [L.hN[0] - d[0] * (PLEN - P.gp), L.hN[1] - d[1] * (PLEN - P.gp)];
    L.orb = [L.hF[0] - 1, L.hF[1] - 8 - P.orb];
    P.fcx = P.orb ? L.orb[0] : L.crackC[0]; P.fcy = P.orb ? L.orb[1] : L.crackC[1];
  }
  const HS = 1.3, hx = (x) => 2 + (x - 2) * HS, hy = (y) => -66 + (y + 70) * HS;   // 头按 1.3 倍画（大头娃娃的比例），线和点仍是一格
  const H = { ell: (cx, cy, rx, ry, a, m, t) => B.ell(E, hx(cx), hy(cy), rx * HS, ry * HS, a, m, t), poly: (pts, m, t) => B.poly(E, pts.map((p) => [hx(p[0]), hy(p[1])]), m, t), at: (x, y) => B.at(hx(x), hy(y)),
    cap: (x0, y0, x1, y1, r0, r1, m, t) => B.cap(E, hx(x0), hy(y0), hx(x1), hy(y1), r0 * HS, r1 * HS, m, t), ln: (x0, y0, x1, y1, m, t) => B.ln(E, hx(x0), hy(y0), hx(x1), hy(y1), m, t), px: (x, y, m, t) => B.px(E, hx(x), hy(y), m, t) };
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const glowM = () => (P.glow >= 3 ? VO3 : P.glow >= 2 ? VO2 : VO1);

  // 旋转木马的木马：金杆穿过身子，白漆木马、红鞍、金鬃金尾（远的暗一圈、小一圈）
  function horsePos(i) {
    const a = P.rot + i * Math.PI, z = Math.sin(a), s = (1 - 0.14 * z) * 1.4, f = -Math.sign(z || 1);
    let dy = i ? -3 - BOB[P.bob] : BOB[P.bob]; if (P.st !== IDLE && P.st !== MOVE && !(P.st === DEATH && P.hl === 0)) dy = Math.round(dy * 0.5);
    const lift = P.hl > 0 ? -P.hl * 38 : -P.hl * 40;
    return { x: 68 * Math.cos(a), y: -42 + dy + lift, z, s, f };
  }
  function horses(front) {
    for (let i = 0; i < 2; i++) {
      const hp = horsePos(i), isF = hp.z < -0.2; if (isF !== front) continue;
      const far = hp.z > 0.5; B.reset();
      part(); capW(hp.x, 6, hp.x, -84, 1.3, 1.3, far ? GOLDD : GOLD); for (let y = -80; y < 4; y += 5) lnW(hp.x - 1, y, hp.x + 1, y - 2, far ? GOLDD : GOLD, 8);   // 金杆上的螺旋纹
      part(); dot(hp.x, -85, 2.2, far ? GOLDD : GOLD); px(hp.x - 1, -86, GOLD, 9);
      if (P.hl < 2) horse(hp.x + (P.hl > 0 && P.st === CHARGE ? ((P.bob & 1) ? 1 : -1) : 0), hp.y, hp.f, hp.s, far, i);
    }
  }
  function horse(cx, cy, f, s, far, i) {   // 腾跃的木马：前腿抬起、长脸朝下、金鬃金尾、红鞍红鞍毯
    const m = far ? HORSED : HORSE, g = far ? GOLDD : GOLD, r = far ? REDD : RED, hr = far ? HAIRD : HAIR;
    const X = (dx) => cx + dx * f * s, Y = (dy) => cy + dy * s, w = (v) => v * s, leg = (pts, t) => { part(); for (let k = 1; k < pts.length; k++) capW(X(pts[k - 1][0]), Y(pts[k - 1][1]), X(pts[k][0]), Y(pts[k][1]), w(k === 1 ? 1.9 : 1.3), w(k === 1 ? 1.4 : 1.1), m, t); const e = pts[pts.length - 1]; px(X(e[0]), Y(e[1]), g); };
    leg([[5, 3], [8, 8], [7, 12.5]], 3); leg([[-5, 3], [-8, 8], [-6, 12.5]], 3);                                   // 远侧的两条腿（暗）
    part(); B.strand(E, [[X(-9), Y(-2)], [X(-14), Y(-1)], [X(-17), Y(4)], [X(-16), Y(9)], [X(-13), Y(11)]], w(2.8), w(1), hr); lnW(X(-12), Y(-1), X(-16), Y(6), hr, 3); lnW(X(-11), Y(-2), X(-15), Y(1), hr, 8);   // 金尾
    part(); B.ell(E, cx, cy, w(10.5), w(5.4), -0.1 * f, m); lnW(X(-7), Y(4), X(5), Y(4.5), m, 3); lnW(X(-6), Y(-4), X(4), Y(-4.5), m, 7);
    part(); capW(X(5), Y(-2), X(9.5), Y(-12), w(4.2), w(3.2), m); lnW(X(7), Y(-3), X(10.5), Y(-10), m, 3);                  // 脖子
    part(); dot(X(10.5), Y(-13), w(3.1), m); capW(X(11), Y(-13), X(16.5), Y(-8), w(2.9), w(2), m); px(X(17), Y(-7.5), m, 3); px(X(16), Y(-9), m, 8);   // 长脸、口鼻
    part(); capW(X(9.5), Y(-15), X(9), Y(-19), w(1.1), w(0.3), m); capW(X(11), Y(-15), X(11.5), Y(-18.5), w(1), w(0.3), m, 3);   // 耳
    const ey = P.hot || (P.hl > 0 && P.st === CHARGE) || (MV === 'horses' && P.st === CAST); px(X(12), Y(-12), ey ? VO3 : m, ey ? 0 : 10); if (ey) px(X(13), Y(-12), VO2);
    lnW(X(16.5), Y(-8), X(11), Y(-10), g, 7); lnW(X(11), Y(-10), X(10), Y(-14), g, 6); px(X(11), Y(-10), r);                // 金缰绳 + 红扣
    part(); B.strand(E, [[X(8.5), Y(-17)], [X(6.5), Y(-13)], [X(4), Y(-8)], [X(1.5), Y(-4)]], w(2.8), w(1.4), hr); for (let k = 0; k < 4; k++) { px(X(7.5 - k * 2), Y(-14.5 + k * 3), hr, 8); px(X(5.5 - k * 2), Y(-13 + k * 3), hr, 3); } px(X(11), Y(-16), hr);   // 金鬃 + 额发
    part(); polyW([[X(-5.5), Y(-4)], [X(3.5), Y(-4)], [X(2.5), Y(3)], [X(-4.5), Y(3)]], r); lnW(X(-4.5), Y(3), X(2.5), Y(3), g, 7); lnW(X(-5), Y(0), X(3), Y(0), r, 3);   // 红鞍毯 + 金边
    part(); B.ell(E, X(-1), Y(-5.5), w(4.8), w(2), 0, r); lnW(X(-5), Y(-4.5), X(3.5), Y(-4.5), g, 8); px(X(-1), Y(4.5), g); px(X(-1), Y(5.5), g, 7);   // 鞍 + 马镫
    part(); lnW(X(5), Y(-2), X(8), Y(2), g, 6); px(X(7), Y(0), BLUSH);                                                     // 胸前的金带和一朵小花
    leg([[6, 2], [11, 0], [12.5, 5]], 0); leg([[-7, 3], [-11, 8], [-11, 13]], 0);                                            // 近侧：前腿抬起、后腿蹬地
  }
  // 旋转木马顶棚做的阳伞：伞杆是扭金杆，伞面红白相间的条纹，边上一圈金流苏和灯泡（转圈时条纹跟着转）
  function parasol() {
    const d = L.pd, nrm = [-d[1], d[0]], c = L.can, tip = L.tip, apex = [c[0] + d[0] * 11, c[1] + d[1] * 11], HW = 27;
    part(); capW(tip[0], tip[1], c[0], c[1], 1.5, 1.5, GOLD); for (let k = 4; k < PLEN; k += 4) { const p = [tip[0] + d[0] * k, tip[1] + d[1] * k]; px(p[0], p[1], GOLD, (k >> 2) & 1 ? 8 : 3); }
    part(); dot(tip[0], tip[1], 2, GOLD); px(tip[0] - d[0] * 2, tip[1] - d[1] * 2, GOLD, 8);
    if (!pFront()) {   // 搭在肩上、罩在头后：伞面正对着看，是一整圈放射的红白条纹（旋转木马的顶棚），扇边一圈金流苏和灯泡
      const R = 27, N = 12, ph = (P.spinP & 3) * Math.PI / 24, at = (a, r) => [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.92];
      for (let i = 0; i < N; i++) { part(); const a0 = ph + i / N * 6.2832, a1 = ph + (i + 1) / N * 6.2832, red = (i & 1) === 0; polyW([c, at(a0, R), at(a1, R)], red ? RED : LACE); lnW(c[0], c[1], at(a0, R)[0], at(a0, R)[1], red ? RED : LACE, 3); const mq = at((a0 + a1) / 2, R * 0.55); px(mq[0], mq[1], red ? RED : LACE, 8); }
      part(); for (let i = 0; i < N; i++) { const m = at(ph + (i + 0.5) / N * 6.2832, R + 1.5); dot(m[0], m[1], 2.3, GOLD); }
      for (let i = 0; i < N; i++) { const b = at(ph + i / N * 6.2832, R + 0.5), on = P.bulb >= 2 || (P.bulb < 2 && ((i + P.bulb) & 1) === 0); px(b[0], b[1], on ? (P.hot && (i & 1) ? VO3 : BULB) : BULB0); }
      part(); dot(c[0], c[1], 3, GOLD); px(c[0] - 1, c[1] - 1, GOLD, 9); for (let i = 0; i < 4; i++) { const b = at(i * 1.5708 + 0.78, 5); px(b[0], b[1], GOLD, 7); }
      return;
    }
    const N = 8, rim = []; for (let i = 0; i <= N; i++) { const u = -1 + 2 * i / N; rim.push([c[0] + nrm[0] * HW * u - d[0] * 3 * (1 - u * u), c[1] + nrm[1] * HW * u - d[1] * 3 * (1 - u * u)]); }
    for (let i = 0; i < N; i++) { part(); const red = ((i + P.spinP) & 1) === 0; polyW([apex, rim[i], rim[i + 1]], red ? RED : LACE); lnW(apex[0], apex[1], rim[i][0], rim[i][1], red ? RED : LACE, 3); }
    part(); for (let i = 0; i < N; i++) { const a = rim[i], b = rim[i + 1], m = [(a[0] + b[0]) / 2 - d[0] * 2.4, (a[1] + b[1]) / 2 - d[1] * 2.4]; dot(m[0], m[1], 2.3, GOLD); }   // 金流苏的扇边
    for (let i = 0; i < N; i++) { const a = rim[i], b = rim[i + 1]; lnW(a[0], a[1], b[0], b[1], GOLD, 8); }
    for (let i = 0; i <= N; i++) { const on = P.bulb >= 2 || (P.bulb < 2 && ((i + P.bulb) & 1) === 0 && P.bulb !== 3); px(rim[i][0], rim[i][1], on ? (P.hot && (i & 1) ? VO3 : BULB) : BULB0); }   // 一圈灯泡，一闪一闪地跑
    part(); dot(apex[0], apex[1], 2.2, GOLD); capW(apex[0], apex[1], apex[0] + d[0] * 6, apex[1] + d[1] * 6, 1, 0.3, GOLD, 7);   // 顶上的金球和尖
    polyW([[apex[0] + d[0] * 5, apex[1] + d[1] * 5], [apex[0] + d[0] * 5 + nrm[0] * 5 + d[0], apex[1] + d[1] * 5 + nrm[1] * 5 + d[1]], [apex[0] + d[0] * 3, apex[1] + d[1] * 3]], RED);   // 小三角旗
  }
  const pFront = () => Math.cos(P.pa) > -0.45 || P.gp < 25;
  function hairBack() {
    part(); headXf(); H.ell(1, -72, 19.5, 17, 0, HAIRD); H.ell(1, -62, 18, 8, 0, HAIRD);
    for (const x of [-16, -12, 14, 18]) H.cap(x, -66, x + (x < 0 ? -1 : 1), -50, 4, 3, HAIRD);   // 头后面垂下来的长发
  }
  function ringlets(side, front) {   // 两侧的金色螺旋卷发：一圈圈叠起来的小椭圆，下缘压暗
    part(); headXf(); const x0 = side > 0 ? (front ? 17 : 21) : (front ? -14 : -18), m = front ? HAIR : HAIRD, sw = P.curl ? 0.6 : -0.6;
    for (let j = 0; j < 6; j++) { const y = -66 + j * 3.6, x = x0 + Math.sin(j * 1.3) * 1.3 + sw * j * 0.3, r = 3.4 - j * 0.28; H.ell(x, y, r, 2.3, side * 0.25, m); H.ln(x - r + 1, y + 1.5, x + r - 1, y + 1.5, m, 3); H.px(x - 1, y - 1, m, 8); }
  }
  function arm(side) {   // 瓷手臂：球形关节，手腕有一圈蕾丝
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? PORCD : PORC;
    const dd = [el[0] - sh[0], el[1] - sh[1]], dl = Math.hypot(dd[0], dd[1]) || 1, s0 = [sh[0] + dd[0] / dl * 5, sh[1] + dd[1] / dl * 5];
    part(); capW(s0[0], s0[1], el[0], el[1], 3, 2.6, m);
    part(); capW(el[0], el[1], h[0], h[1], 2.6, 2.1, m);
    part(); dot(el[0], el[1], 3.1, m); px(el[0] - 1, el[1] - 1, m, 8); lnW(el[0] - 2, el[1] + 2, el[0] + 2, el[1] + 2, m, 3);   // 肘上的球关节
    const hd = [h[0] - el[0], h[1] - el[1]], hl = Math.hypot(hd[0], hd[1]) || 1, u = [hd[0] / hl, hd[1] / hl], cf = [h[0] - u[0] * 2.5, h[1] - u[1] * 2.5];
    part(); capW(cf[0] - u[1] * 2.6, cf[1] + u[0] * 2.6, cf[0] + u[1] * 2.6, cf[1] - u[0] * 2.6, 1.3, 1.3, far ? LACE : LACE, far ? 3 : 0);   // 袖口蕾丝
    part(); dot(h[0], h[1], 2.6, m); const a0 = Math.atan2(u[1], u[0]);
    for (let i = 0; i < 3; i++) { const a = a0 + (i - 1) * 0.4, r0 = [h[0] + Math.cos(a) * 2, h[1] + Math.sin(a) * 2]; capW(r0[0], r0[1], r0[0] + Math.cos(a + 0.4 * side) * 3, r0[1] + Math.sin(a + 0.4 * side) * 3, 0.9, 0.6, m, i === 0 ? 7 : 5); }
  }
  function sleeve(side) {   // 泡泡袖
    part(); torsoXf(); const far = side < 0, c = far ? [-14, -44] : [15, -44], m = far ? DRESSD : DRESS;
    B.ell(E, c[0], c[1], 7, 6.5, side * 0.3, m); for (const k of [-3, 0, 3]) B.ln(E, c[0] + k, c[1] - 5, c[0] + k * 1.2, c[1] + 5, m, 3); B.ln(E, c[0] - 4, c[1] - 4, c[0] + 1, c[1] - 6, m, 8);
    part(); for (let k = -2; k <= 2; k++) B.ell(E, c[0] + k * 2.6, c[1] + 6, 1.8, 1.4, 0, LACE, far ? 3 : 0);
  }
  function skirt() {
    part(); torsoXf(); const fl = P.flare;
    B.poly(E, [[-10, -30], [10, -30], [24 + fl, 3], [-24 - fl, 3]], DRESS);
    for (let k = -3; k <= 3; k++) { B.ln(E, k * 3, -29, k * (7 + fl * 0.3) + (P.spinP & 1), 2, DRESS, 3); B.ln(E, k * 3 + 1, -28, k * (7 + fl * 0.3) + 2, 2, DRESS, 7); }   // 褶
    part(); for (let x = -24 - fl; x <= 24 + fl; x += 4) B.ell(E, x, 0, 2.6, 2.2, 0, LACE);                                                // 衬裙的蕾丝边
  }
  function bodice() {
    part(); torsoXf();
    B.poly(E, [[-10, -27], [10, -27], [14, -39], [14, -48], [-13, -48], [-14, -39]], DRESS); B.ell(E, 0, -41, 13.5, 8, 0, DRESS);
    B.ln(E, -8, -34, -4, -30, DRESS, 3); B.ln(E, 8, -34, 4, -30, DRESS, 3); B.ell(E, -5, -42, 4, 3, 0.2, DRESS, 7); B.ell(E, 6, -42, 4, 3, -0.2, DRESS, 7);
    part(); B.poly(E, [[-3.5, -28], [3.5, -28], [5, -47], [-5, -47]], LACE, 0);                                                           // 前襟
    for (let y = -45; y <= -31; y += 3.5) { B.ln(E, -3, y, 3, y + 2.5, RED, 0); B.ln(E, 3, y, -3, y + 2.5, RED, 0); }                    // 红色的系带
    part(); B.poly(E, [[-11, -25], [11, -25], [11, -30], [-11, -30]], RED); B.ln(E, -11, -29, 11, -29, RED, 8); B.ln(E, -11, -25, 11, -25, RED, 3);   // 腰带
    part(); B.ell(E, -4, -27, 3.4, 2.2, 0.3, RED); B.ell(E, 5, -27, 3.4, 2.2, -0.3, RED); B.cap(E, 0, -26, -3, -19, 1.2, 0.8, RED); B.cap(E, 1, -26, 4, -19, 1.2, 0.8, RED); B.ell(E, 0.5, -27, 1.6, 1.6, 0, RED, 8);   // 腰上的蝴蝶结
  }
  function collar() {   // 下巴下面一圈蕾丝领
    part(); torsoXf(); for (let k = -5; k <= 5; k++) { const x = k * 2.6, y = -49 + Math.abs(k) * 0.35; B.ell(E, x, y, 2.4, 2.8, 0, LACE); B.px(E, x, y + 2, LACE, 3); }
    B.ln(E, -12, -51, 13, -51, LACE, 8); part(); B.ell(E, 1, -48, 2, 1.8, 0, VO2); B.px(E, 0, -49, VO3);   // 领口的一颗紫宝石
  }
  function head() {   // 大圆瓷脸：玻璃珠眼、长睫毛、腮红、红嘴，木偶铰链下巴
    part(); headXf(); H.cap(1, -55, 2, -60, 3.6, 3.4, PORC);
    part(); headXf(); const J = P.jaw >= 3 ? 7 : P.jaw >= 2 ? 4 : P.jaw ? 2 : 0;
    H.ell(2, -70, 15.5, 14.5, 0, PORC); H.ell(2, -60, 11, 5, 0, PORC);
    H.ell(-6, -64, 3, 2, 0, PORC, 7); H.ell(-3, -79, 5, 2.5, -0.2, PORC, 8);
    // 下巴：两道木偶铰链线，张嘴时整块往下掉，里面是紫光
    if (J) { H.poly([[-0.5, -61], [6.5, -61], [6.5, -61 + J], [-0.5, -61 + J]], VOIDM); H.poly([[0.5, -60.5], [5.5, -60.5], [5.5, -60 + J - 1], [0.5, -60 + J - 1]], J >= 4 ? VO3 : glowM());
      part(); H.poly([[-0.5, -60 + J], [6.5, -60 + J], [6.5, -56 + J], [4.5, -54.5 + J], [1.5, -54.5 + J], [-0.5, -56 + J]], PORC); H.ln(-0.5, -60 + J, 6.5, -60 + J, PORC, 10); part(); headXf(); }
    H.ln(-1, -61, -1, -56 + J, PORC, 3); H.ln(7, -61, 7, -56 + J, PORC, 3);
    // 嘴：一点红（张嘴时上唇留着）
    H.ln(1, -61, 5, -61, RED, J ? 7 : 5); H.px(3, -62, RED, 3); if (!J) { H.ln(2, -60, 4, -60, RED, 7); }
    H.px(4, -66, PORC, 3); H.px(5, -66, PORC, 4);                                                                                    // 鼻头
    part(); H.ell(-7, -64, 2.8, 1.5, 0, BLUSH); H.ell(12.5, -64, 2.6, 1.5, 0, BLUSH); part(); headXf();
    eye(-4, -71, 0); eye(9, -71, 1);
    H.ln(-8, -77, -2, -78, HAIRD, 0); H.ln(6, -78, 12, -77, HAIRD, 0);                                                                // 细细的高眉
    crack();
  }
  function eye(x, y, near) {
    const voidEye = near && (P.hot || P.crack >= 2), open = P.eyes > 0;
    if (!open) { H.ln(x - 3, y + 1, x + 3, y + 1, VOIDM, 0); for (const k of [-2, 0, 2]) H.px(x + k, y + 2, VOIDM, 0); H.px(x + (near ? 4 : -4), y, VOIDM, 0); return; }
    part(); H.ell(x, y, 3.8, 3.4, 0, LACE, 9);
    const im = voidEye ? (P.glow >= 3 ? VO3 : VO2) : P.eyes >= 2 && P.glow >= 3 ? IRISH : IRIS; H.ell(x + 0.5, y + 0.4, 2.7, 3, 0, im);
    H.px(x + 0.5, y + 0.5, voidEye ? VO3 : P.eyes >= 2 ? VO2 : VOIDM, 0); H.px(x + 1, y + 1, voidEye ? VO3 : VOIDM, 0);             // 瞳孔（发狠时里面一点紫光）
    H.px(x - 1, y - 1, LACE, 9); H.px(x, y - 2, LACE, 9); H.px(x + 2, y + 2, LACE, 8);                                          // 玻璃珠的高光
    H.ln(x - 4, y - 3, x + 4, y - 3, VOIDM, 0); H.ln(x - 3, y - 4, x + 3, y - 4, VOIDM, 0);                                        // 上眼线
    const o = near ? 1 : -1; H.ln(x + o * 4, y - 3, x + o * 6, y - 5, VOIDM, 0); H.ln(x + o * 3, y - 4, x + o * 4, y - 6, VOIDM, 0); H.px(x, y - 5, VOIDM, 0);   // 长睫毛
    for (const k of [-2, 0, 2]) H.px(x + k, y + 4, PORC, 3);                                                                              // 下睫毛
  }
  const CR = [[12, -85], [9, -81], [11, -78], [8, -75], [11, -72], [8, -68], [10, -64], [7, -60], [9, -57]];
  const CR1 = [[[9, -81], [5, -83], [2, -86]], [[10, -64], [14, -62], [17, -63]], [[8, -75], [4, -74]]];
  const CR2 = [[[5, -83], [0, -80], [-3, -77], [-7, -76]], [[14, -62], [16, -58], [15, -54]], [[11, -72], [15, -73], [17, -76]], [[9, -57], [6, -54]]];
  function crack() {   // 从额头穿过近侧眼睛裂到下巴的一道缝：先压一道勾线色，再在旁边填紫光
    part(); headXf(); const lit = glowM(), seg = (c, m) => { for (let i = 1; i < c.length; i++) { H.ln(c[i - 1][0], c[i - 1][1], c[i][0], c[i][1], PORC, 10); H.ln(c[i - 1][0] + 1, c[i - 1][1], c[i][0] + 1, c[i][1], m); } };
    seg(CR, lit); if (P.crack >= 1 || P.hot) for (const c of CR1) seg(c, VO1); if (P.crack >= 2) for (const c of CR2) seg(c, P.glow >= 3 ? VO2 : VO1);
    if (P.crack >= 3) { H.poly([[9, -81], [5, -83], [2, -80], [5, -76], [8, -75]], VOIDM); H.poly([[6, -79], [4, -80], [5, -78]], VO3); H.poly([[14, -62], [17, -63], [17, -58], [15, -57]], VOIDM); H.px(16, -60, VO2); }   // 崩掉的瓷片，露出里面的虚空
  }
  function bang() {   // 刘海、小金冠、侧边的大红蝴蝶结
    part(); headXf(); H.poly([[-14, -72], [-13, -80], [-8, -86], [2, -88.5], [12, -86.5], [17, -81], [18, -73], [15, -77], [12, -76], [9, -79], [6, -76.5], [3, -79], [0, -76.5], [-3, -79], [-6, -76.5], [-9, -79], [-12, -75]], HAIR);
    for (const x of [-9, -3, 3, 9]) H.ln(x, -86, x + 1, -79, HAIR, 3); H.ln(-6, -85, 6, -87, HAIR, 8); H.ln(-10, -83, -6, -85, HAIR, 7);
    H.cap(-14, -75, -15, -62, 2.2, 1.4, HAIR); H.cap(17.5, -75, 18.5, -62, 2.2, 1.4, HAIR);                                   // 鬓角
    part(); H.poly([[-4, -86], [-4.5, -90], [-1.5, -88], [2, -92], [5.5, -88], [8.5, -90], [8, -86]], GOLD); H.ln(-4, -87, 8, -87, GOLD, 8);
    H.px(-4.5, -91, GOLD, 9); H.px(8.5, -91, GOLD, 9); H.px(2, -93, GOLD, 9); H.ell(2, -88.5, 1.3, 1.3, 0, P.hot ? VO3 : VO2);   // 金冠，中间一颗紫宝石
    part(); H.ell(-21, -86, 5.5, 3.4, -0.7, RED); H.ln(-24, -88, -19, -85, RED, 3); part(); headXf(); H.ell(-22, -75, 5, 3.2, 0.6, RED); H.ln(-25, -74, -20, -76, RED, 3);
    part(); headXf(); H.cap(-19, -79, -24, -66, 1.6, 1, REDD); H.cap(-18, -78, -20, -64, 1.6, 1, RED);                     // 缎带尾巴
    part(); headXf(); H.ell(-17.5, -80, 2.4, 2.8, 0, RED); H.px(-18, -81, RED, 8);
  }
  function orb(c, n) {   // 远手手心里聚起来的虚空紫光
    part(); const r = 1.5 + n * 1.3; dot(c[0], c[1], r + 1, VO1); dot(c[0], c[1], r, VO2); dot(c[0] - 0.5, c[1] - 0.5, Math.max(0.6, r - 1.6), VO3);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    horses(false); const pf = pFront(); if (!pf) parasol();
    hairBack(); arm(-1); sleeve(-1); skirt(); bodice(); sleeve(1); collar();
    ringlets(-1, false); ringlets(1, false); head(); bang(); ringlets(-1, true); ringlets(1, true);
    if (pf) parasol(); arm(1);
    horses(true); if (P.orb) orb(L.orb, P.orb);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.crackC); RIM.ry = Y(L.crackC); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.crackC); LIGHTS[0].y = Y(L.crackC); LIGHTS[0].r = (P.glow >= 3 ? 15 : P.glow >= 2 ? 9 : 5) * (P.hot || P.crack >= 2 ? 1.25 : 1) * z;   // 裂缝里的紫光照亮半张脸
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = 0.3;                                                           // 木马台的暖灯从下面照上来
    LIGHTS[2].x = X(L.orb); LIGHTS[2].y = Y(L.orb); LIGHTS[2].r = (P.orb ? 8 + P.orb * 4 : 0) * z;
    LIGHTS[3].x = X(L.can); LIGHTS[3].y = Y(L.can); LIGHTS[3].r = (P.bulb === 3 ? 0 : P.bulb === 2 ? 20 : 12) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、微微歪头、双臂半张、阳伞罩在头后，裂缝爬满半张脸（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.3); P.pa = -2.36; P.gp = 47; P.nx = 10; P.ny = -36; P.hd = 0.14; P.jaw = 0; P.eyes = 2; P.glow = 2; P.hot = 1; P.crack = 2; P.by = 0; P.breath = 0; P.bob = 1; P.bulb = 0; P.flare = 2;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = H.at(1, -76); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 34 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连金冠和蝴蝶结）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'spin') { const c = L.core; ring(sx(c[0]), sy(c[1]), 1, PINKX); ring(sx(0), HY - 2, 1, FXI.coin); burst(sx(c[0]), sy(c[1]), 24, 60, 160, 0.3, 0.6, PINKX, 10); fx.slash(sx(0), sy(-40), 46, 0, 6.28, 'dollPink', 0.3, 3, 2); shake(0.35, 3); flash(0.08);
        sfx('boss', { k: 'dollBox', w: 1 }); sfx('boss', { k: 'dollLaugh', w: 0.8 }); sfx('swing', { kind: 'blunt', w: 1 }); }
      else if (MV === 'stomp') stompFx();
      else if (MV === 'horses') { for (let i = 0; i < 2; i++) { const hp = horsePos(i), x = sx(hp.x); for (let k = 0; k < 14; k++) spawn(K_RISE, x + (Math.random() - 0.5) * 16, sy(-40 - Math.random() * 20), (Math.random() - 0.5) * 20, -150 - Math.random() * 120, 0.5 + Math.random() * 0.3, VOIDX); burst(x, sy(-42), 16, 50, 140, 0.25, 0.5, VOIDX, 0); fx.pillar(x, 0, sy(-42), 5, 'dollVoid', 0.3); }
        const o = L.hF; ring(sx(o[0]), sy(o[1]), 0, VOIDX); shake(0.25, 2); flash(0.06); sfx('boss', { k: 'neigh', w: 0.8 }); sfx('boss', { k: 'throw', w: 1 }); sfx('boss', { k: 'dollLaugh', w: 1 }); }
      else if (MV === 'poke') { const t = L.tip; burst(sx(t[0]), sy(t[1]), 16, 50, 150, 0.25, 0.5, FXI.coin, 10); fx.cross(sx(t[0]), sy(t[1]), 10, 'coin', 0.2); ring(sx(t[0]), sy(t[1]), 0, PINKX); hitDummy(1, 1); shake(0.25, 3); flash(0.05); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'wood', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const e = L.mouth, hd = L.head; ring(sx(e[0]), sy(e[1]), 1, VOIDX); ring(sx(0), sy(-40), 1, PINKX); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 34; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(MV === 'p2' ? L.crackC[0] : 0), sy(MV === 'p2' ? L.crackC[1] : -4), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (60 + Math.random() * 120), 0.8 + Math.random() * 0.5, MV === 'p2' ? (i & 1 ? FXI.dust : VOIDX) : FXI.coin, { g: 220, floor: HY + 6 }); }
        if (MV === 'p2') burst(sx(hd[0]), sy(hd[1]), 30, 60, 170, 0.35, 0.7, VOIDX, 0);
        sfx('boss', { k: 'dollShriek', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'dollCrack', w: 1 }); else sfx('boss', { k: 'dollBox', w: 0.7 }); }
    }
    if (s === CHARGE && MV === 'spin') sfx('boss', { k: 'dollBox', w: 0.5 });
    if (s === CHARGE && MV === 'stomp') sfx('boss', { k: 'dollCreak', w: 1 });
    if (s === CHARGE && MV === 'horses') { sfx('boss', { k: 'dollGather', w: 1, dur: E.DUR[CHARGE] }); sfx('boss', { k: 'dollCreak', w: 0.6 }); }
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'dollCreak', w: 0.5 });
    if (s === CHARGE && MV === 'rise') { sfx('boss', { k: 'dollCreak', w: 1 }); sfx('boss', { k: 'lavaRise', w: 0.5 }); }
    if (s === CHARGE && MV === 'p2') { sfx('boss', { k: 'heartbeat', w: 1 }); sfx('boss', { k: 'dollCrack', w: 0.5 }); }
  }
  function stompFx() {   // 伞杆像木桩一样砸进木马台：金色地浪往两边推、台面裂开一道紫缝、木屑飞起来
    const x = sx(L.tip[0]), y = HY;
    fx.wave(x, y, 1, 42, 8, 'coin', 0.5, 2); fx.wave(x, y, -1, 34, 7, 'dollPink', 0.45, 2); fx.crack(x, y, 22, 1, 'dollVoid', 1.2); fx.crack(x, y, 14, -1, 'dollVoid', 1);
    burst(x, y - 2, 22, 60, 170, 0.3, 0.7, FXI.coin, 50);
    for (let i = 0; i < 16; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 150, -60 - Math.random() * 160, 0.9 + Math.random() * 0.5, i & 1 ? PINKX : FXI.dust, { g: 320, floor: HY + 2 });
    ring(x, HY - 2, 1, FXI.coin); shake(0.35, 3); flash(0.07);
    sfx('boss', { k: 'slam', w: 1 }); sfx('boss', { k: 'dollCreak', w: 0.6 }); sfx('hit', { mat: 'wood', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'dollLaugh', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 0.2, 2.6, 'dollPink', 0.22, 3, 2); const c = L.can; burst(sx(c[0]), sy(c[1]), 14, 50, 140, 0.25, 0.5, FXI.coin, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'wood', w: 1 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'dollCrack', w: 0.3 });
    if (s === RECOVER && MV === 'spin' && t === 2.5) { ring(sx(0), sy(-36), 1, PINKX); ring(sx(0), HY - 2, 1, FXI.coin); fx.wave(sx(0), HY, 1, 48, 7, 'dollPink', 0.5, 2); fx.wave(sx(0), HY, -1, 48, 7, 'dollPink', 0.5, 2); burst(sx(0), sy(-36), 30, 80, 220, 0.3, 0.6, PINKX, 0); shake(0.35, 3); flash(0.06); sfx('swing', { kind: 'blunt', w: 1 }); sfx('boss', { k: 'dollLaugh', w: 1 }); sfx('boss', { k: 'slam', w: 0.5 }); }
    if (s === RECOVER && MV === 'horses' && t === 0.3) sfx('boss', { k: 'dollCreak', w: 0.5 });
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'dollShriek', w: 0.8 });
    if (s === DEATH && t === INCOMING + 0.4) { const c = L.crackC; burst(sx(c[0]), sy(c[1]), 30, 50, 160, 0.4, 0.8, VOIDX, 20); for (let i = 0; i < 14; i++) spawnX(K_PHYS, sx(c[0] + (Math.random() - 0.5) * 10), sy(c[1]), (Math.random() - 0.5) * 120, -40 - Math.random() * 100, 1.0, FXI.dust, { g: 300, floor: HY + 2 }); shake(0.3, 3); sfx('boss', { k: 'dollCrack', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.2) { sfx('boss', { k: 'dollDie', w: 1 }); sfx('fall', { w: 1 }); shake(0.2, 2); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 40; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-10 - Math.random() * 60), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i & 1 ? VOIDX : PINKX); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.3, 2.5], [INCOMING], [INCOMING + 0.05, INCOMING + 0.4, INCOMING + 1.2, INCOMING + 1.9], []];
  let mbT = 0;
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.06 : 0.13)) { emT = 0; const c = L.crackC;   // 裂缝里一直往上漏的紫光；顶棚灯泡偶尔掉下一点金光
      if (Math.random() < 0.7) spawn(K_EMBER, sx(c[0] - 2 + Math.random() * 5), sy(c[1] - 6 + Math.random() * 14), (Math.random() - 0.5) * 8, -10 - Math.random() * 10, 0.5 + Math.random() * 0.5, VOIDX);
      else spawn(K_EMBER, sx(L.can[0] - 20 + Math.random() * 40), sy(L.can[1]), 0, 10 + Math.random() * 8, 0.5, FXI.coin); }
    if ((state === CAST || state === RECOVER) && MV === 'spin' && stT < 2.5 + (state === CAST ? 0 : 0) && Math.random() < 0.8) { const a = Math.random() * 6.2832, r = 30 + Math.random() * 22; spawnX(K_SPIRAL_PT, sx(0) + Math.cos(a) * r, sy(-36) + Math.sin(a) * r * 0.4, 0, 0, 0.6, Math.random() < 0.5 ? PINKX : FXI.coin, { a, r, w: -9, tx: sx(0), ty: sy(-36), orbitR: r }); }   // 转圈：粉和金的彩带绕着她转
    if (state === CHARGE && MV === 'spin' && Math.random() < 0.4) { const a = Math.random() * 6.2832; spawn(K_EMBER, sx(Math.cos(a) * 40), sy(-30 + Math.sin(a) * 10), 0, -6, 0.4, PINKX); }
    if (state === CHARGE && MV === 'horses' && P.orb && Math.random() < 0.7) { const c = L.orb, a = Math.random() * 6.2832, r = 10 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, VOIDX, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'horses' && P.hl > 0 && Math.random() < 0.5) { const hp = horsePos(Math.random() < 0.5 ? 0 : 1); spawn(K_RISE, sx(hp.x + (Math.random() - 0.5) * 20), sy(hp.y + 8), 0, -16, 0.5, VOIDX); }
    if (state === CHARGE && (MV === 'stomp' || MV === 'poke') && Math.random() < 0.35) { const t = MV === 'stomp' ? L.tip : L.can; spawn(K_EMBER, sx(t[0] + (Math.random() - 0.5) * 8), sy(t[1]), 0, 12, 0.4, FXI.coin); }
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-30 + Math.random() * 60), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.5 ? FXI.dust : PINKX, { g: 240, floor: HY + 4 }); }   // 爬的时候扒下来的彩漆木屑
    if (state === IDLE && P.jaw && Math.random() < 0.3) spawn(K_EMBER, sx(L.mouth[0]), sy(L.mouth[1]), 4, -10, 0.4, VOIDX);
    if (state === RECOVER && MV === 'spin' && stT < 2.5) { mbT += dt; if (mbT > 1.05) { mbT = 0; sfx('boss', { k: 'dollBox', w: 0.35 }); } }   // 转圈的时候音乐盒一直放
  }
  function fxReset() { emT = 0; mbT = 0; }
  function fxBack(f12) { const x0 = sx(-46), x1 = sx(46), sp = P.flare >= 5 ? f12 * 3 : f12 >> 1; for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const k = (x + sp) % 8; if (k === 0) E.put(x, HY + 1, FXR[FXI.coin][P.hot ? 1 : 2]); else if (k === 4) E.put(x, HY + 1, FXR[PINKX][3]); } }   // 脚下木马台的边：金灯和红白条一直在转
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'spin'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const VOICES = {
    // 音乐盒：走了调的一小段华尔兹
    dollBox: (s, t, w, p) => { const N = [84, 88, 91, 88, 86, 83, 84, 79]; N.forEach((m, i) => { s.ring(t + i * 0.13, mf(m) * 0.985, 0.7, (0.03 + 0.03 * w) * (i === 0 ? 1.3 : 1), { pan: p, rev: 0.5, parts: [[1, 1], [3.01, 0.25], [5.2, 0.1]] }); }); s.ring(t, mf(60) * 0.99, 1.2, 0.03 * w, { pan: p, rev: 0.5, parts: [[1, 1], [2, 0.3]] }); },
    // 小孩的咯咯笑
    dollLaugh: (s, t, w, p) => { for (let i = 0; i < 5; i++) { const tt = t + i * 0.1; s.tone(tt, 'triangle', 980 - i * 50, 0.07, 0.035 * w, { to: 760 - i * 40, vib: [22, 60, 0.01], pan: p, rev: 0.5 }); s.nz(tt, 0.05, 'bandpass', 2600, 4, 0.02 * w, { pan: p }); } },
    // 瓷裂：一声脆响、一串细碎的咔啦
    dollCrack: (s, t, w, p) => { s.nz(t, 0.04, 'highpass', 5000, 0.7, 0.08 * w, { pan: p }); s.ring(t, 1850, 0.45, 0.06 * w, { pan: p, parts: [[1, 1], [1.41, 0.6], [2.76, 0.3]] }); s.ring(t + 0.05, 2640, 0.3, 0.03 * w, { pan: p }); s.crackle(t + 0.02, 0.25, 3200, 0.08 * w, { pan: p }); },
    // 旋转木马的木头和齿轮吱嘎
    dollCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 72, 0.55, 0.05 * w, { to: 54, vib: [11, 30, 0.05], lp: 700, pan: p }); s.nz(t, 0.45, 'bandpass', 900, 8, 0.04 * w, { to: 600, pan: p }); s.thud(t + 0.4, 120, 60, 0.15, 0.08 * w, { pan: p }); },
    // 尖叫「别走」：孩子的尖声 + 一个不和谐的音乐盒和弦
    dollShriek: (s, t, w, p) => { s.tone(t, 'sawtooth', 640, 1.0, 0.06 * w, { to: 470, vib: [7, 40, 0.1], lp: 2600, pan: p, rev: 0.6 }); s.tone(t, 'square', 1280, 0.8, 0.018 * w, { to: 900, lp: 3200, pan: p, rev: 0.6 }); s.choir(t, [60, 66], 1.2, 0.04 * w, { dark: 1, pan: p });
      for (const m of [84, 85, 91]) s.ring(t, mf(m), 1.4, 0.03 * w, { pan: p, rev: 0.6, parts: [[1, 1], [3.01, 0.2]] }); s.thud(t, 90, 40, 0.4, 0.14 * w, { pan: p }); },
    // 手心聚光：一串往上走的铃音
    dollGather: (s, t, w, p) => { for (let i = 0; i < 6; i++) s.ring(t + i * 0.16, mf(76 + i * 3) * 0.99, 0.4, 0.025 * w, { pan: p, rev: 0.5 }); s.riser(t, t + 1.2, 200, 1800, 0.035 * w, { pan: p }); },
    // 死亡：音乐盒的发条走完，曲子越放越慢、越来越低
    dollDie: (s, t, w, p) => { const N = [84, 88, 91, 88, 86, 83, 84, 79, 76]; let tt = t; N.forEach((m, i) => { s.ring(tt, mf(m) * Math.pow(0.975, i), 0.9, 0.045 * w, { pan: p, rev: 0.6, parts: [[1, 1], [3.01, 0.2]] }); tt += 0.14 * Math.pow(1.3, i); }); s.thud(tt, 80, 40, 0.3, 0.1 * w, { pan: p }); },
  };

  return {
    name: '木马公主', HX, R_EL: VOIDX, DUR, hero, P, GLOW_MATS: [VO1, VO2, VO3, BULB], HIT_POINT: [0, -40], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'stone', how: 'dissolve', pal: 'curse', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['spin', 'stomp', 'horses', 'poke', 'rise', 'p2'], MOVE_NAMES: { spin: '转圈', stomp: '跺脚', horses: '木马坠落（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.45, 1.6, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0.2, 0.6, 0.9], 'spin'], [CAST, [0, 3 / 12], 'spin'], [RECOVER, [1.0, 1.25, 2.55], 'spin'],
      [CHARGE, [0.3, 0.8, 1.2], 'stomp'], [CAST, [0, 2 / 12], 'stomp'], [RECOVER, [0.3], 'stomp'],
      [CHARGE, [0.3, 0.8, 1.3], 'horses'], [CAST, [2 / 12], 'horses'], [RECOVER, [0.5], 'horses'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.8, 2.0], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [0.6], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 30, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
