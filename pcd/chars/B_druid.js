// 德鲁伊（最终首领，第二章「精灵之森」的第一站）：照 pcd/run/boss-standard.md §8 做的最终首领模块，结构抄 B_demon.js / B_grave.js。
// 依据：附录 G「德鲁伊（鹿角、苔藓胡子、法杖）· 荆棘丛」；K('FB_druid')：召唤树人 treants、荆棘穿地 thorns、根须震地 druidSlam，第二阶段 森林之怒。
// 设定卡：
// · 剪影：从荆棘丛里升起的上半身（原点 = 荆棘丛的土面）。头上一副比肩还宽的枝状大鹿角（主干往两边平伸，一排枝杈朝天，挂着苔藓和新叶）占剪影的大头；
//   鹿角下一张风吹日晒的粗脸，眉骨压着两道绿光的眼，一大把橄榄色的苔藓胡子垂到胸口（编着骨珠、缠着叶子）；
//   左半边（远侧）已经是树：远侧的脸长了树皮、胸口半边是树皮和一个发光的树瘤（生命之心），远侧的手臂是一根带叶的树枝、手指是分叉的细枝，
//   肩后长出一丛带叶的枝冠；右手（近侧）握一根扭曲的木杖，杖头卷成一个钩、钩里包着一颗发光的种子。——「鹿角 + 半身是树 + 木杖」，和魔王（羊角蝠翼）、
//   守墓人（兜帽铁锹墓碑）、守钟人（背上大钟）都不撞。
// · 主色：暗青绿的长袍、冷灰褐的树皮、橄榄苔藓、深绿的叶、晒黑的皮、骨白的鹿角；点缀：粉色的小花、秋叶橙、琥珀色的萤火。
//   光色：玉绿的生命之光（眼睛、胸口的树瘤、杖头的种子、第二阶段树皮裂缝和鹿角上开的花）。
// · 招式：treants 召唤树人（木杖举起、树手掌心朝天、叶子旋进种子 → 一杖插进土里，根须和树苗往外长）·
//   thorns 荆棘穿地（树手往前下方伸、指尖长出带刺的根往土里钻 → 猛地往上一扯，地刺往前一路穿出来）·
//   druidSlam 根须震地（双臂连杖举过头顶 → 一起砸进土里，根须震浪）· poke 重击（木杖扛到肩后 → 往前劈下）·
//   rise 升起（拄着木杖、树手扒着土往上爬 → 张开双臂怒吼）· p2 森林之怒（抱住胸口的树瘤两声心跳 → 仰天怒吼、鹿角开花、树皮裂缝全亮）。
// · 死亡：仰天哀嚎 → 往前一瘫 → 整个人变成木头、叶子变黄 → 沉回荆棘丛，化成落叶和绿色的光点。
PCD.define('B_druid', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 色阶（11 级，暗 → 亮；主体压暗，玉绿的光才跳得出来）─────
  const RBARK = ['#060505', '#100c0b', '#1a1512', '#251e19', '#312820', '#3e3328', '#4c3f31', '#5b4c3b', '#6c5c48', '#817058', '#9a896e'];   // 冷灰褐树皮
  const RROBE = ['#03070a', '#060f12', '#0a181b', '#0f2125', '#142b2f', '#1a363a', '#214246', '#294f52', '#335d5f', '#3f6c6d', '#4e7d7c'];   // 暗青绿长袍
  const RMOSS = ['#090b04', '#141807', '#1e240b', '#29310f', '#353f13', '#424e18', '#505e1e', '#606f25', '#72812e', '#879539', '#a0ab4a'];   // 橄榄苔藓（胡子、头发）
  const RLEAF = ['#02100a', '#051c10', '#082a16', '#0d3a1d', '#134c24', '#1a5f2b', '#237333', '#2e883b', '#3c9d43', '#50b44c', '#6ccb58'];   // 叶
  const BARK = defDeep(RBARK, { depth: 7, dark: 1, amb: 0.1 }), BARKD = defDeep(RBARK, { depth: 6, dark: 3, amb: 0.08 }), STAFF = defDeep(RBARK, { depth: 2, amb: 0.2 });
  const ROBE = defDeep(RROBE, { depth: 8, dark: 1, amb: 0.1 }), ROBED = defDeep(RROBE, { depth: 6, dark: 3, amb: 0.08 });
  const MOSS = defDeep(RMOSS, { depth: 5, dark: 1, amb: 0.12 }), MOSSD = defDeep(RMOSS, { depth: 4, dark: 3, amb: 0.1 });
  const LEAF = defDeep(RLEAF, { depth: 3, amb: 0.18 }), LEAFD = defDeep(RLEAF, { depth: 3, dark: 3, amb: 0.1 });
  const SKIN = defDeep('tan', { depth: 6, dark: 2, amb: 0.12 }), SKIND = defDeep('tan', { depth: 5, dark: 4, amb: 0.08 });
  const ANT = defDeep('ivory', { depth: 3, amb: 0.16 }), ANTD = defDeep('ivory', { depth: 3, dark: 3, amb: 0.1 });
  const LF = ramp(['#04241a', '#0a4a34', '#10805a', '#22c088', '#6af0b8', '#c8ffe6', '#ffffff']);                                           // 玉绿的生命之光
  const GL1 = defMat([LF[1], LF[2], LF[3], LF[4]], 1, 1), GL2 = defMat([LF[2], LF[3], LF[4], LF[5]], 1, 1), GL3 = defMat([LF[3], LF[4], LF[5], LF[6]], 1, 1);
  const AUT = defMat(ramp(['#2a1206', '#7a3212', '#c8641c', '#f0a040']), 1, 0), FLW = defMat(ramp(['#4a1028', '#a83462', '#ec7aa8', '#ffd2e6']), 1, 0);   // 秋叶 / 小花
  const FFY = defMat(ramp(['#7a3212', '#c8641c', '#f0a040', '#fff4b0']), 1, 1);                                                             // 萤火
  const LIFE = fxRamp('druid', ['#ffffff', '#c8ffe6', '#6af0b8', '#22c088', '#0a4a34']);                                                    // 特效：白 → 玉绿 → 暗
  const THR = fxRamp('druidThorn', ['#a0ab4a', '#879539', '#606f25', '#353f13', '#141807']);                                               // 荆棘
  const POL = fxRamp('druidPollen', ['#ffffff', '#fff4b0', '#f0a040', '#c8641c', '#7a3212']);                                              // 萤火 / 花粉
  const hero = new Sprite(226, 142, 113, 126);
  const HX = 115, DUR = [2.4, 2 / 3, 0.75, 1.2, 0.45, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { treants: { 3: 1.0, 4: 0.45, 5: 0.7 }, thorns: { 3: 1.2, 4: 0.45, 5: 0.7 }, druidSlam: { 3: 1.3, 4: 0.45, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'treants', HOT = 0;   // HOT：第二阶段「森林之怒」，树皮裂缝和鹿角上的花常亮
  const CORE = [LF[5], LF[4], LF[3]], GLO = [LF[4], LF[3], LF[2]], DIM = [LF[3], LF[2], LF[1]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: CORE, k: 1 }, { x: 0, y: 0, r: 0, ramp: GLO, k: 0.8 }, { x: 0, y: 0, r: 0, ramp: CORE, k: 0.95 }, { x: 0, y: 0, r: 0, ramp: DIM, k: 0.4 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[LIFE], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(256) };
  RIM.skip[GL1] = RIM.skip[GL2] = RIM.skip[GL3] = RIM.skip[FFY] = 1;

  // ───── 姿势 ─────
  // nx,ny 近手（握杖）/ sa 杖的朝向（握手 → 杖头）/ fx2,fy2 远侧的树手；seed 杖头种子聚光 0–3、vine 指尖长出的荆棘根 0–3、claw 树手指头收拢、bloom 鹿角开花、wood 死亡时变成木头
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'sa', 'fx2', 'fy2', 'glow', 'eyes', 'flash', 'dq', 'hot', 'breath', 'sway', 'seed', 'vine', 'claw', 'bloom', 'wood', 'fly', 'thump'];
  const S = (nx, ny, sa, fx2, fy2, lean, hd) => ({ nx, ny, sa, fx2, fy2, lean, hd });
  const K = {
    idle: S(36, -30, -1.4, -30, -16, 0, 0),             // 木杖拄在身旁，树手垂着、指头扎进土里
    swingW: S(-2, -36, 3.05, -32, -20, -0.1, -0.1),      // 普攻：木杖往后拉平
    swing: S(40, -32, -0.05, -26, -22, 0.24, 0.12),      // → 横着扫出去
    grow: S(26, -48, -1.3, -46, -54, -0.14, -0.1),     // 召唤树人：木杖举起、树手掌心朝天
    plant: S(40, -16, -1.6, 2, -14, 0.34, 0.3),          // → 一杖插进土里
    reach: S(16, -42, -2.3, 30, -28, 0.26, 0.3),         // 荆棘穿地：树手往前下方伸、指尖生根
    rip: S(44, -46, -0.5, -38, -64, -0.12, -0.14),       // → 猛地往上一扯
    heave: S(18, -72, -2.8, -32, -70, -0.2, -0.04),       // 根须震地：双臂连杖举过头
    smash: S(44, -6, 0.1, 14, -12, 0.42, 0.3),           // → 一起砸进土里
    coil: S(8, -52, -2.3, -30, -20, -0.14, -0.06),       // 重击：木杖扛到肩后
    chop: S(46, -38, 0.5, -26, -20, 0.3, 0.2),           // → 往前劈下
    climbA: S(38, -8, -1.45, -20, -10, 0.3, 0.3), climbB: S(36, -20, -1.45, -24, -20, 0.3, 0.3),
    wide: S(46, -58, -1.25, -42, -58, -0.15, -0.26),
    hunch: S(14, -34, -1.2, 6, -36, 0.35, 0.4),
    agony: S(32, -70, -0.9, -30, -74, -0.2, -0.42),
    limp: S(32, 0, -0.2, 0, -8, 0.5, 0.55),
  };
  const KF = ['nx', 'ny', 'sa', 'fx2', 'fy2', 'lean', 'hd'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.bloom = HOT; P.mx = 0; P.flip = 0; }
  const MVI = { treants: 0, thorns: 1, druidSlam: 2, poke: 3, rise: 4, p2: 5 };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12; P.fly = f12 % 24; P.sway = [0, 1, 1, 0, -1, -1][Math.floor(TT / 0.25) % 6];
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.glow = 1 + ((f12 >> 2) & 1);
      P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 1 : 2;                                                                                       // 眼里的绿光一跳一跳
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.1) { const k = Math.floor((lp - 1.4) * 12);                                          // 待机个性：提起木杖往土里一顿，种子一亮、低头看一眼
        P.ny -= [2, 4, 5, 5, 0, 0, 0, 0, 0][k] || 0; P.thump = k === 4 ? 1 : 0; P.seed = k >= 4 && k < 7 ? 2 : k >= 2 ? 1 : 0; P.hd = [0, 0.05, 0.1, 0.12, 0.16, 0.14, 0.1, 0.05, 0][k] || 0; P.by += k === 4 ? 1 : 0; } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.claw = f < 2 ? 1 : 0; P.jaw = f & 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swingW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swingW, K.swingW); P.glow = 2; P.eyes = 2; P.seed = 1; }
      else if (tq < 0.42) { pose(K.swing, K.swing); P.jaw = 2; P.glow = 3; P.eyes = 2; P.seed = 2; }
      else pose(K.swing, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.4; P.lean = -0.12; P.jaw = 2; P.eyes = (f12 & 1) ? 2 : 0; P.flash = h < 1 / 12 ? 1 : 0; P.sway = -1; P.nx -= 3; P.fx2 -= 3; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.4 * (1 - q); P.lean = -0.12 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.claw = 0; P.sway = (f12 & 1) ? 1 : -1; }
      else if (d < 1.4) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; P.claw = 1; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.wood = 1; P.glow = 0; P.eyes = 0; P.hot = 0; P.bloom = 0; P.claw = 1; P.by = Math.round(ease.in(clamp01((d - 1.6) / 0.9)) * 70); P.dq = d > 2.1 ? Math.round(clamp01((d - 2.1) / 0.45) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    P.eyes = 2;
    if (MV === 'treants') {
      if (st === CHARGE) { pose(K.idle, K.grow, ease.out(clamp01(q / 0.4))); P.by = -Math.round(2 * ease.out(clamp01(q / 0.4))); P.seed = Math.min(3, Math.floor(q * 4)); P.glow = q < 0.4 ? 2 : 3; P.bloom = q > 0.5 ? 1 : HOT; P.sway = tr;
        if (q > 0.6) { P.nx += tr; P.fx2 -= tr; P.by += (f12 & 1); } P.jaw = q > 0.75 ? 1 : 0; }
      else if (st === CAST) { pose(K.grow, K.plant, ease.out(clamp01(tq / 0.08))); P.by = 4; P.jaw = 3; P.glow = 3; P.seed = tq < 0.1 ? 3 : 1; P.claw = 1; }
      else { const k = clamp01((tq - 0.2) / 0.45); pose(K.plant, K.idle, ease.inOut(k)); P.by = Math.round(4 * (1 - k)); P.glow = 2; P.claw = k < 0.5 ? 1 : 0; }
    } else if (MV === 'thorns') {
      if (st === CHARGE) { pose(K.idle, K.reach, ease.out(clamp01(q / 0.35))); P.vine = Math.min(3, Math.floor(q * 4.5)); P.claw = 1; P.glow = q < 0.5 ? 2 : 3; if (q > 0.5) { P.fx2 += tr; P.by = (f12 & 1); } P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.reach, K.rip, ease.out(clamp01(tq / 0.08))); P.jaw = 3; P.glow = 3; P.seed = 2; P.sway = 1; }
      else pose(K.rip, K.idle, ease.inOut(clamp01(tq / 0.55)));
    } else if (MV === 'druidSlam') {
      if (st === CHARGE) { pose(K.idle, K.heave, ease.out(clamp01(q / 0.5))); P.by = -Math.round(3 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += tr; P.fx2 -= tr; P.by += (f12 & 1); } P.claw = 1; P.glow = q < 0.5 ? 2 : 3; P.seed = q > 0.5 ? 2 : 1; P.jaw = q > 0.8 ? 2 : 0; }
      else if (st === CAST) { pose(K.smash, K.smash); P.by = 4; P.jaw = 3; P.glow = 3; P.claw = 1; P.sway = 1; }
      else { const k = clamp01((tq - 0.15) / 0.5); pose(K.smash, K.idle, ease.inOut(k)); P.by = Math.round(4 * (1 - k)); P.claw = 1; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.coil, ease.out(clamp01(q / 0.5))); P.by = -Math.round(3 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += tr; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.seed = q > 0.5 ? 2 : 1; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.coil, K.chop, ease.out(clamp01(tq / 0.08))); P.by = 3; P.jaw = 3; P.glow = 3; P.seed = 2; }
      else { pose(K.chop, K.idle, ease.inOut(clamp01(tq / 0.5))); P.by = Math.round(3 * (1 - clamp01(tq / 0.5))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.eyes = q > 0.6 ? 2 : 1; P.claw = f < 2 ? 1 : 0; P.jaw = f & 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.seed = 2; P.sway = 1; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2 森林之怒：抱住胸口的树瘤 → 两声心跳（树瘤一亮一亮）→ 仰天怒吼、双臂张开、鹿角开花、树皮裂缝全亮
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.claw = 1; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.hot = 1; P.bloom = 1; P.seed = 3; P.sway = 1; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.hot = 1; P.bloom = 1; P.seed = hold ? 2 + (f12 & 1) : 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [17, -42], SHF = [-16, -42], NECK = [3, -47], HS = 1.35;   // HS：头（脸 + 鹿角 + 胡子）按 1.35 倍的像素画，大头一眼认出
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); const nw = B.at(NECK[0], NECK[1]), k = (1 - HS) / HS; B.reset(); B.move(nw[0] * k, nw[1] * k); B.move(0, P.by); B.rot(0, 0, P.lean); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.8); }
  const hAt = (x, y) => { headXf(); const q = B.at(x, y); return [q[0] * HS, q[1] * HS]; };
  const bpx = (x, y, m, t) => { const p = B.at(x, y), Z = B.Z(), n = Math.max(1, Math.floor(Z + 0.01)), x0 = Math.round(p[0] * Z), y0 = Math.round(p[1] * Z); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) E.sp(x0 + i, y0 + j, m, t); };
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(-9, -39);
    L.eye = hAt(12, -65); L.mouth = hAt(12, -55 + P.jaw); L.head = hAt(7, -74);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    const c = Math.cos(P.sa), s = Math.sin(P.sa); L.d = [c, s]; L.n = [-s, c];
    L.top = [L.hN[0] + c * 34, L.hN[1] + s * 34]; L.butt = [L.hN[0] - c * 30, L.hN[1] - s * 30]; L.seed = [L.top[0] + c * 5, L.top[1] + s * 5];
    L.elN = B.ik(L.shN, L.hN, 19, 20, 1); L.elF = B.ik(L.shF, L.hF, 19, 20, 1);
    const fd = Math.atan2(L.hF[1] - L.elF[1], L.hF[0] - L.elF[0]); L.fd = fd; L.tips = [];
    for (let i = 0; i < 5; i++) { const a = fd + (i - 2) * (P.claw ? 0.24 : 0.4), r0 = [L.hF[0] + Math.cos(a) * 3, L.hF[1] + Math.sin(a) * 3], ln = P.claw ? 7 : 10; L.tips.push([r0, [r0[0] + Math.cos(a) * ln, r0[1] + Math.sin(a) * ln], a]); }
    const foc = MV === 'thorns' && P.vine ? L.hF : P.seed >= 2 ? L.seed : L.core; P.fcx = foc[0]; P.fcy = foc[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const glowM = () => (P.glow >= 3 ? GL3 : P.glow >= 2 ? GL2 : GL1);
  const leafM = () => (P.wood ? AUT : LEAF), leafD = () => (P.wood ? AUT : LEAFD);
  function leafW(x, y, a, ln, m, t) {   // 一片叶子（世界坐标）：叶柄在 (x, y)，朝 a 方向长 ln
    const c = Math.cos(a), s = Math.sin(a), w = ln * 0.3, mx = x + c * ln * 0.45, my = y + s * ln * 0.45;
    polyW([[x, y], [mx - s * w, my + c * w], [x + c * ln, y + s * ln], [mx + s * w, my - c * w]], m, t); lnW(x + c, y + s, x + c * ln * 0.8, y + s * ln * 0.8, m, 3);
  }
  function clump(x, y, r) {   // 一团叶冠：暗的底 + 几团亮叶 + 一圈往外戳的叶片
    const m = leafM(), md = leafD();
    dot(x, y + r * 0.2, r, md);
    for (const [dx, dy, k] of [[-0.45, -0.35, 0.5], [0.35, -0.45, 0.45], [0.5, 0.15, 0.4], [-0.5, 0.3, 0.4], [0, -0.05, 0.5]]) dot(x + dx * r, y + dy * r, r * k, m, dy < -0.2 ? 6 : 4);
    for (let i = 0; i < 7; i++) { const a = -2.9 + i * 0.95 + (x & 3) * 0.1, rr = r * 0.75; leafW(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9, a, 4 + (i & 1), i & 1 ? m : md, i < 4 ? 6 : 4); }
    for (const [dx, dy] of [[-0.3, -0.5], [0.2, -0.2], [-0.5, 0.1]]) px(x + dx * r, y + dy * r, m, 9);
    if (P.bloom && !P.wood) { px(x - r * 0.3, y - r * 0.55, FLW, 7); px(x + r * 0.45, y - r * 0.1, FLW, 6); if (P.hot) px(x - r * 0.3, y - r * 0.55 + 1, GL2); }
  }

  // 肩后长出来的枝冠（半身已经是树）：几根带叶的枝，跟着风摆
  function crown() {
    torsoXf(); B.save(); B.rot(-17, -44, P.sway * 0.035);
    part(); B.strand(E, [[-17, -42], [-24, -51], [-30, -60], [-33, -68]], 3.6, 1.2, BARKD); B.strand(E, [[-20, -42], [-30, -47], [-41, -52], [-49, -54]], 3, 1, BARKD);
    B.strand(E, [[-26, -50], [-36, -56], [-43, -63]], 1.8, 0.7, BARKD); B.strand(E, [[-38, -50], [-45, -46], [-54, -45]], 1.4, 0.6, BARKD);
    B.ln(E, -24, -50, -30, -59, BARKD, 7); B.ln(E, -30, -47, -40, -51, BARKD, 7);
    for (const [x, y, r] of [[-54, -47, 5], [-46, -63, 6], [-50, -55, 6.5], [-33, -71, 6.5], [-40, -60, 4]]) { part(); const p = B.at(x, y); clump(p[0], p[1], r); }
    B.restore();
  }
  function antler(side) {   // 枝状大鹿角：主干往外平伸、一排枝杈朝天，挂苔藓、冒新叶（第二阶段枝尖开花发光）
    const z0 = B.Z(); B.zoom(z0 * HS); part(); headXf(); const far = side < 0, m = P.wood ? BARKD : far ? ANTD : ANT, bx = far ? 2 : 13, by0 = -73, k = far ? 0.88 : 1;
    const o = (dx, dy) => [bx + side * dx * k, by0 + dy * k];
    const beam = [o(0, 0), o(4, -2), o(9, -3), o(14, -4), o(19, -4), o(24, -5), o(29, -6), o(33, -8), o(36, -10)];
    B.strand(E, beam, far ? 2.3 : 2.7, 0.9, m);
    const tines = [[2, 0, -5], [3, 1, -6], [4, 1, -5], [5, 2, -5], [6, 2, -4], [7, 3, -2]], tops = [];
    for (const [i, dx, dy] of tines) { const p = beam[i], t = [p[0] + side * dx * k, p[1] + dy * k]; B.strand(E, [p, [p[0] + side * dx * 0.3 * k, p[1] + dy * 0.6 * k], t], 1.3, 0.5, m); tops.push(t); }
    for (const i of [1, 3]) { const p = beam[tines[i][0]], t = tops[i], mid = [(p[0] + t[0]) / 2, (p[1] + t[1]) / 2]; B.strand(E, [mid, [mid[0] + side * 2.2 * k, mid[1] - 1.6 * k]], 0.8, 0.4, m); }   // 小分叉
    for (let i = 1; i < beam.length - 1; i++) B.px(E, beam[i][0], beam[i][1] - 1, m, 8);                                                                  // 主干背上的高光
    for (const t of tops) B.px(E, t[0], t[1], m, 9);
    part(); for (const [i, h] of [[3, 4], [5, 5], [7, 3]]) { const p = beam[i]; B.strand(E, [[p[0], p[1] + 1], [p[0] + side * 0.5, p[1] + h * 0.6], [p[0] - side * 0.5, p[1] + h]], 1, 0.4, far ? MOSSD : MOSS); }   // 挂着的苔藓
    part(); const lm = P.wood ? AUT : far ? LEAFD : LEAF;
    for (const [i, a] of [[1, -2.1], [3, -1.0], [5, -0.5], [0, -1.9], [4, -1.6]]) { const t = tops[i], aa = side < 0 ? -Math.PI - a : a, c = Math.cos(aa), s = Math.sin(aa); B.ell(E, t[0] + c * 1.8, t[1] + s * 1.8, 2.2, 1.1, aa, lm); }   // 枝尖上冒的新叶
    if (P.bloom && !P.wood) { part(); for (const i of [0, 2, 4]) { const t = tops[i]; B.px(E, t[0] - 1, t[1] - 1, FLW, 7); B.px(E, t[0] + 1, t[1] - 1, FLW, 6); B.px(E, t[0], t[1] - 2, FLW, 7); B.px(E, t[0], t[1] - 1, P.hot ? GL3 : FLW, P.hot ? 0 : 9); } }   // 枝尖开花
    B.zoom(z0);
  }
  function treeArm() {   // 远侧的手臂已经是一根树枝：树皮、树瘤、缠着的藤、长叶的细枝手指（荆棘穿地时指尖长出带刺的根）
    const sh = L.shF, el = L.elF, h = L.hF;
    part(); capW(sh[0], sh[1], el[0], el[1], 6.2, 5, BARKD); capW(el[0], el[1], h[0], h[1], 5, 3.6, BARKD);
    for (const k of [-1.6, 1.6]) { const dx = el[0] - sh[0], dy = el[1] - sh[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l * k, dx / l * k]; lnW(sh[0] + n[0], sh[1] + n[1], el[0] + n[0], el[1] + n[1], BARKD, k > 0 ? 3 : 7); }
    { const dx = h[0] - el[0], dy = h[1] - el[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l, dx / l]; lnW(el[0] + n[0] * 1.5, el[1] + n[1] * 1.5, h[0] + n[0], h[1] + n[1], BARKD, 3); lnW(el[0] - n[0] * 2, el[1] - n[1] * 2, h[0] - n[0] * 1.5, h[1] - n[1] * 1.5, BARKD, 7); }
    const mu = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; dot(mu[0], mu[1], 1.6, BARKD, 10); px(mu[0] - 1, mu[1] - 2, BARKD, 8);                              // 树瘤
    if (P.hot) { lnW(mu[0] + 1, mu[1] + 1, el[0], el[1] - 1, GL1); px(el[0], el[1] - 1, GL2); }
    part(); dot(h[0], h[1], 3.2, BARKD);
    for (const [r0, tip, a] of L.tips) { capW(r0[0], r0[1], tip[0], tip[1], 1.4, 0.5, BARKD, 5); const f = [r0[0] + (tip[0] - r0[0]) * 0.55, r0[1] + (tip[1] - r0[1]) * 0.55], fa = a + 0.7; capW(f[0], f[1], f[0] + Math.cos(fa) * 3.5, f[1] + Math.sin(fa) * 3.5, 0.8, 0.4, BARKD, 6); }
    part(); for (const [q, s] of [[0.25, 1], [0.5, -1], [0.75, 1]]) { const p = [el[0] + (h[0] - el[0]) * q, el[1] + (h[1] - el[1]) * q]; leafW(p[0], p[1], L.fd + s * 1.3, 5, leafD()); }   // 小臂上长的叶
    { const t = L.tips[0][1]; leafW(t[0], t[1], L.tips[0][2] - 0.6, 4, leafM()); const t2 = L.tips[4][1]; leafW(t2[0], t2[1], L.tips[4][2] + 0.6, 4, leafM()); }
    part(); { const at = (q) => (q < 0.5 ? [sh[0] + (el[0] - sh[0]) * q * 2, sh[1] + (el[1] - sh[1]) * q * 2] : [el[0] + (h[0] - el[0]) * (q - 0.5) * 2, el[1] + (h[1] - el[1]) * (q - 0.5) * 2]);   // 缠着的藤
      for (let i = 0; i < 6; i++) { const a = at(i / 6), b = at((i + 1) / 6), s = (i & 1) ? 3.5 : -3.5; lnW(a[0] + s * 0.4, a[1] - s * 0.6, b[0] - s * 0.4, b[1] + s * 0.6, leafM(), 5); } }
    if (P.vine) {   // 指尖长出带刺的根，往土里钻
      part(); for (const i of [1, 2, 3]) { const t = L.tips[i][1], len = P.vine * 6 + 2, g = [t[0] + (i - 2) * 3, Math.min(t[1] + len, 6)];
        const mid = [(t[0] + g[0]) / 2 + (i - 2) * 2 + 1, (t[1] + g[1]) / 2]; capW(t[0], t[1], mid[0], mid[1], 1.1, 0.9, BARKD); capW(mid[0], mid[1], g[0], g[1], 0.9, 0.5, BARKD);
        for (let k = 1; k <= P.vine; k++) { const q = k / (P.vine + 1), p = [t[0] + (g[0] - t[0]) * q, t[1] + (g[1] - t[1]) * q]; px(p[0] + (k & 1 ? 1 : -1) * 1.5, p[1], BARK, 8); }
        if (P.vine >= 2) px(g[0], g[1] - 1, GL1); }
    }
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-17, 6], [17, 6], [18, -10], [21, -26], [22, -37], [17, -44], [8, -48], [-6, -48], [-16, -45], [-22, -38], [-21, -26], [-18, -10]], ROBE);
    B.ln(E, 14, -30, 15, 4, ROBE, 3); B.ln(E, 8, -22, 7, 4, ROBE, 3); B.ln(E, 19, -36, 18, -14, ROBE, 7); B.ln(E, 12, -26, 11, -8, ROBE, 8);
    for (const [x, y] of [[20, -30], [19, -22], [18, -14]]) B.px(E, x, y, ROBE, 9);                                                                     // 袍子的滚边
    // 远侧半边已经是树皮：边缘参差，纵向的树皮纹，裂缝里第二阶段透出绿光
    part(); B.poly(E, [[-22, -38], [-16, -45], [-6, -48], [-1, -46], [1, -41], [-2, -36], [2, -30], [-1, -23], [2, -16], [-1, -9], [2, 6], [-17, 6], [-18, -10], [-21, -26]], BARK);
    for (const [x0, y0, x1, y1] of [[-19, -38, -18, -14], [-14, -44, -14, -30], [-7, -46, -6, -41], [-5, -30, -5, -4], [-16, -20, -15, 4], [-10, -28, -11, 2]]) B.ln(E, x0, y0, x1, y1, BARK, 3);
    for (const [x0, y0, x1, y1] of [[-17, -42, -17, -32], [-11, -45, -12, -40], [-3, -28, -3, -12], [-13, -14, -13, 2]]) B.ln(E, x0, y0, x1, y1, BARK, 7);
    const gm = P.hot ? glowM() : BARK, gt = P.hot ? 0 : 10;
    for (const c of [[[-9, -39], [-14, -43], [-16, -46]], [[-9, -39], [-15, -34], [-19, -28]], [[-9, -39], [-5, -33], [-6, -24], [-3, -16]], [[-9, -39], [-4, -44]]]) for (let i = 1; i < c.length; i++) B.ln(E, c[i - 1][0], c[i - 1][1], c[i][0], c[i][1], i === 1 || P.hot ? gm : BARK, i === 1 || P.hot ? gt : 10);
    part(); B.ell(E, -9, -39, 4, 3.4, 0, BARK, 7); B.ell(E, -9, -39, 2.8, 2.4, 0, BARK, 10);                                                          // 生命之心：胸口的树瘤
    part(); if (P.wood) B.ell(E, -9, -39, 1.6, 1.4, 0, BARK, 2); else { B.ell(E, -9, -39, 2, 1.7, 0, P.glow >= 2 ? GL2 : GL1); B.px(E, -9, -39, glowM()); if (P.glow >= 3) { B.px(E, -10, -40, GL3); B.px(E, -8, -39, GL3); } }
    part(); for (const [x, y, rx, ry] of [[-19, -41, 2.6, 1.4], [-20, -24, 1.4, 2.6], [-6, -14, 2, 1.2]]) B.ell(E, x, y, rx, ry, 0.2, MOSS);             // 树皮上的苔藓
    part(); for (let i = 0; i <= 10; i++) { const q = i / 10, x = 20 - 21 * q, y = -44 + 32 * q + Math.sin(q * 9) * 2; B.px(E, x, y, leafM(), i & 1 ? 4 : 6); B.px(E, x + 1, y, leafM(), 3); }   // 斜挎的藤
    for (const [x, y, a] of [[15, -38, -0.4], [7, -28, 2.6], [0, -18, -0.9]]) { const p = B.at(x, y); leafW(p[0], p[1], a + P.lean, 4, leafM()); }
    { const p = B.at(11, -33); px(p[0], p[1], FLW, 7); px(p[0] + 1, p[1], FLW, 5); px(p[0], p[1] + 1, FLW, 5); px(p[0] - 1, p[1], FLW, 6); px(p[0], p[1] - 1, FLW, 8); px(p[0], p[1], AUT, 8); }   // 藤上的小花
    part(); B.cap(E, -18, -8, 18, -9, 2, 2, BARK); for (let x = -16; x < 17; x += 3) B.px(E, x, -8.5, BARK, 3);                                        // 树根编的腰带
    part(); for (const [x, y, a, r] of [[-15, 4, 2.6, 3], [-5, 6, 1.9, 2.4], [10, 6, 1.3, 2.4], [16, 3, 0.4, 3]]) B.cap(E, x, y, x + Math.cos(a) * 9, y + Math.sin(a) * 4 + 3, r, 1, BARKD);   // 下身扎进土里的根
  }
  function mantle() {   // 肩上一层叶片（每片一个部件，叶与叶之间压一道缝）：远侧是绿叶，近侧夹几片秋叶
    torsoXf(); const lv = [[-22, -41, 2.3], [-18, -45, 2.0], [-12, -47, 1.8], [-6, -48, 1.7], [22, -41, 0.8], [18, -45, 1.1], [13, -47, 1.3]];
    for (const [x, y, a] of lv) { part(); const p = B.at(x, y), aa = a + P.lean; leafW(p[0], p[1], aa, 8, x === 18 ? AUT : leafM(), 5); }
  }
  function head() {   // 风吹日晒的粗脸：远侧太阳穴长了树皮，眉骨压着两道绿光，鹰钩鼻，一大把苔藓胡子分三绺垂到胸口；额上一圈叶冠、红浆果
    const z0 = B.Z(); B.zoom(z0 * HS); const J = Math.round(P.jaw * 1.5), sk = P.wood ? BARK : SKIN, skd = P.wood ? BARKD : SKIND;
    part(); headXf(); B.cap(E, 4, -46, 6, -55, 4.5, 4, skd);
    part(); headXf();
    B.ell(E, 8, -68, 9.5, 8.5, 0, sk); B.poly(E, [[-1, -69], [18, -70], [20, -64], [19, -58], [15, -54 + J], [5, -54 + J], [0, -58]], sk);          // 颅、宽下颌
    B.ell(E, 5, -61, 1.8, 1.2, 0.3, sk, 6); B.ln(E, 0, -66, 1, -58, sk, 3);                                                                // 颧骨高光
    B.ln(E, 4, -74, 13, -75, sk, 3); B.ln(E, 5, -73, 12, -74, sk, 7); B.ln(E, 12, -62, 13, -58, sk, 3); B.ln(E, 1, -63, 2, -59, sk, 3);               // 额头的皱、法令纹
    part(); headXf(); B.poly(E, [[-2, -76], [2, -78], [4, -74], [3, -70], [4, -66], [3, -62], [4, -58], [1, -57], [-1, -60], [-2, -66]], P.wood ? BARKD : BARK);                      // 远侧太阳穴已经长了树皮
    B.ln(E, 0, -76, 0, -60, BARK, 3); B.ln(E, 2, -73, 2, -64, BARK, 7); B.ln(E, 1, -68, 3, -66, BARK, 3); B.px(E, 2, -61, MOSS, 6); B.px(E, 1, -75, MOSS, 7);
    if (P.hot) { B.ln(E, 1, -70, 0, -64, GL1); bpx(1, -66, GL2); }
    B.strand(E, [[-1, -76], [-4, -80], [-7, -80]], 1, 0.4, BARK);                                                                                       // 太阳穴上冒的小枝
    part(); headXf();
    B.poly(E, [[0, -71], [19, -72], [20, -68], [14, -67], [10, -68], [6, -67], [1, -68]], sk, 3); B.ln(E, 1, -72, 19, -73, sk, 8);                   // 压低的眉骨
    B.ell(E, 6, -65.5, 2.4, 1.5, 0, sk, 10); B.ell(E, 13.5, -65.5, 2.6, 1.6, 0, sk, 10);                                                             // 眼窝
    const e = P.eyes >= 2 ? GL3 : P.eyes === 1 ? GL2 : 0;
    if (e) { bpx(13, -66, e); bpx(14, -66, e); bpx(15, -66, GL2); bpx(12, -66, GL1); bpx(6, -66, e); bpx(7, -66, GL2); bpx(5, -66, GL1); }
    if (P.eyes >= 2) { bpx(16, -67, GL2); bpx(17, -68, GL1); bpx(4, -67, GL1); bpx(13, -65, GL1); bpx(14, -65, GL1); bpx(6, -65, GL1); }             // 眼光往后上方拖
    part(); headXf(); B.poly(E, [[14, -68], [19, -63], [22, -59], [21, -57], [17, -57], [14, -59]], sk, 7); B.ln(E, 14, -60, 17, -57, sk, 3); B.ln(E, 15, -67, 20, -61, sk, 9); bpx(21, -60, sk, 9); bpx(18, -58, sk, 10); bpx(19, -58, sk, 4);   // 鹰钩鼻
    part(); headXf(); B.cap(E, 1, -72, 9, -71, 1.5, 1.2, MOSS); B.cap(E, 11, -72, 20, -71, 1.5, 1.2, MOSS); B.cap(E, 19, -71, 23, -74, 1.1, 0.4, MOSS); B.cap(E, 1, -72, -2, -74, 1.1, 0.4, MOSS);   // 两道往上翘的乱眉
    B.ln(E, 12, -73, 19, -72, MOSS, 8); B.ln(E, 2, -73, 8, -72, MOSS, 8);
    // 胡子：一大把，下面分三绺（中间一绺编成辫子挂骨珠），缠着叶子；张嘴时胡子跟着下巴往下
    part(); headXf();
    B.poly(E, [[-1, -62], [2, -57], [8, -55], [15, -56], [20, -61], [23, -57], [22, -53 + J], [23, -49 + J], [20, -46 + J], [19, -42 + J], [16, -40 + J], [14, -43 + J], [12, -37 + J], [9, -42 + J], [6, -39 + J], [5, -44 + J], [2, -45 + J], [2, -49 + J * 0.5], [-1, -51], [-3, -55]], MOSS);
    for (const [x0, y0, x1, y1, t] of [[3, -55, 5, -44, 3], [8, -53, 9, -44, 3], [14, -53, 14, -45, 3], [18, -55, 18, -47, 3], [1, -57, 3, -50, 8], [6, -53, 6, -42, 7], [11, -53, 12, -41, 8], [16, -53, 17, -43, 7], [20, -56, 20, -51, 8]]) B.ln(E, x0, y0, x1, y1 + J, MOSS, t);
    for (const y of [-43, -40]) B.ln(E, 11, y + J, 13, y + 1 + J, MOSS, 3);
    part(); headXf(); B.poly(E, [[7, -55], [12, -55], [14, -52 + J], [13, -47 + J], [10, -44 + J], [8, -48 + J], [6, -52 + J * 0.5]], MOSS, 6); B.ln(E, 9, -54, 10, -46 + J, MOSS, 8); B.ln(E, 12, -54, 12, -48 + J, MOSS, 3);   // 下巴正中一绺亮一点的胡子
    bpx(12, -37 + J, ANT, 7); bpx(13, -37 + J, ANT, 5); bpx(12, -36 + J, ANT, 4);                                                                      // 辫子上的骨珠
    for (const [x, y, a] of [[4, -50, 2.2], [19, -50, 0.9], [9, -46, 2.7]]) { const p = hAt(x, y + J); B.zoom(z0); leafW(p[0], p[1], a, 4, leafM()); B.zoom(z0 * HS); headXf(); }   // 胡子里缠的叶子
    if (J) { B.poly(E, [[9, -57], [17, -57], [16, -55 + J], [10, -55 + J]], sk, 10); if (J >= 2 && !P.wood) B.ln(E, 11, -56 + (J >> 1), 15, -56 + (J >> 1), J >= 4 ? GL2 : GL1); for (const x of [11, 15]) bpx(x, -57, ANT, 6); }   // 张嘴：黑的嘴，里面一口绿光
    part(); headXf(); B.strand(E, [[16, -58], [12, -56], [9, -54], [7, -50]], 1.8, 0.8, MOSS); B.strand(E, [[17, -58], [20, -56], [22, -52]], 1.6, 0.7, MOSS);   // 两撇胡子
    B.ln(E, 15, -58, 10, -55, MOSS, 8); B.ln(E, 18, -58, 21, -55, MOSS, 8);
    part(); headXf(); const lw = P.wood ? AUT : LEAF;                                                                                                   // 额上的叶冠 + 红浆果
    for (const [x, y, a] of [[1, -75, -2.3], [4, -77, -1.9], [8, -78, -1.55], [12, -78, -1.25], [16, -76, -0.9]]) B.ell(E, x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8, 2.4, 1.1, a, lw);
    for (const [x, y] of [[6, -77], [14, -77]]) { bpx(x, y, AUT, 8); bpx(x + 1, y, AUT, 6); }
    B.zoom(z0);
  }
  function staff() {   // 扭曲的木杖：疙瘩、断枝、叶；杖头卷成一个钩，钩里包着一颗发光的种子；钩下挂一根羽毛和骨珠
    const d = L.d, n = L.n, t = L.top, b = L.butt;
    part(); const pts = []; for (let i = 0; i <= 6; i++) { const q = i / 6, w = [0, 1.2, -0.8, 0.6, -1, 0.7, 0][i]; pts.push([b[0] + (t[0] - b[0]) * q + n[0] * w, b[1] + (t[1] - b[1]) * q + n[1] * w]); }
    for (let i = 1; i < pts.length; i++) capW(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2.4 - i * 0.07, 2.3 - i * 0.07, STAFF);
    for (let i = 1; i < pts.length; i++) lnW(pts[i - 1][0] - n[0], pts[i - 1][1] - n[1], pts[i][0] - n[0], pts[i][1] - n[1], STAFF, 7);
    for (const i of [2, 4]) { const p = pts[i]; dot(p[0], p[1], 2.9, STAFF); px(p[0], p[1], STAFF, 10); px(p[0] - 1, p[1] - 1, STAFF, 8); }                   // 疙瘩
    { const p = pts[3], a = Math.atan2(d[1], d[0]) - 0.8; capW(p[0], p[1], p[0] + Math.cos(a) * 6, p[1] + Math.sin(a) * 6, 1.1, 0.5, STAFF); leafW(p[0] + Math.cos(a) * 6, p[1] + Math.sin(a) * 6, a - 0.5, 4, leafM()); }   // 断枝和一片叶
    part(); const C = L.seed, a0 = Math.atan2(-d[1], -d[0]), cur = [t];
    for (let k = 0; k <= 7; k++) { const a = a0 + 0.5 + k * 0.78, r = 6 - k * 0.3; cur.push([C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]); }
    for (let i = 1; i < cur.length; i++) capW(cur[i - 1][0], cur[i - 1][1], cur[i][0], cur[i][1], 2.2 - i * 0.14, 2.1 - i * 0.14, STAFF);
    for (let i = 2; i < 6; i++) px(cur[i][0], cur[i][1], STAFF, 8);
    part(); const sr = 2.3 + P.seed * 0.7; if (P.wood) dot(C[0], C[1], 2.4, STAFF, 3); else { dot(C[0], C[1], sr + 0.8, GL1); dot(C[0], C[1], sr, P.seed >= 1 ? GL2 : GL1); dot(C[0] - 0.5, C[1] - 0.5, Math.max(0.6, sr - 1.5), P.seed >= 1 || P.glow >= 2 ? GL3 : GL2); }
    part(); for (const [i, a] of [[2, -0.9], [4, -2.4]]) leafW(cur[i][0], cur[i][1], a, 5, leafM());
    part(); const hk = cur[4], hy = hk[1] + 3; for (let y = hk[1] + 1; y < hy + 3; y++) px(hk[0], y, BARK, 6); px(hk[0], hy + 3, ANT, 7); px(hk[0], hy + 4, ANT, 5);   // 挂绳、骨珠
    capW(hk[0], hy + 5, hk[0] - 1, hy + 11, 1.3, 0.4, AUT); lnW(hk[0], hy + 5, hk[0] - 1, hy + 10, AUT, 3);                                          // 一根秋叶色的羽毛
  }
  function arm() {   // 近侧的手还是人：暗青的宽袖、晒黑的小臂缠着藤镯（第二阶段有发光的螺旋纹身）、握杖的拳头
    const sh = L.shN, el = L.elN, h = L.hN, sk = P.wood ? BARK : SKIN;
    part(); capW(el[0], el[1], h[0], h[1], 3.8, 3.2, sk); lnW(el[0], el[1] + 1, h[0], h[1] + 1, sk, 3);
    const w = [el[0] + (h[0] - el[0]) * 0.72, el[1] + (h[1] - el[1]) * 0.72], dx = h[0] - el[0], dy = h[1] - el[1], dl = Math.hypot(dx, dy) || 1, nn = [-dy / dl, dx / dl];
    lnW(w[0] + nn[0] * 3.5, w[1] + nn[1] * 3.5, w[0] - nn[0] * 3.5, w[1] - nn[1] * 3.5, leafM(), 6); px(w[0] + nn[0] * 2, w[1] + nn[1] * 2, AUT, 7);        // 藤镯和一颗浆果
    if (P.hot && !P.wood) { const m = [(el[0] + w[0]) / 2, (el[1] + w[1]) / 2]; px(m[0], m[1], GL2); px(m[0] + 1, m[1] - 1, GL1); px(m[0] - 1, m[1] + 1, GL1); px(m[0] + nn[0] * 1.5, m[1] + nn[1] * 1.5, GL1); }
    part(); capW(sh[0], sh[1], el[0], el[1], 5.4, 4.6, ROBE); const um = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; dot(um[0] - 1, um[1] - 2, 2.2, ROBE, 7); lnW(um[0] + 2, um[1] + 2, el[0], el[1] + 1, ROBE, 3);
    const u = [(el[0] - sh[0]), (el[1] - sh[1])], ul = Math.hypot(u[0], u[1]) || 1; u[0] /= ul; u[1] /= ul;
    polyW([[el[0] - u[1] * 5, el[1] + u[0] * 5], [el[0] + u[1] * 5, el[1] - u[0] * 5], [el[0] + u[0] * 3 + u[1] * 6, el[1] + u[1] * 3 + 7], [el[0] + u[0] * 2 - u[1] * 3, el[1] + 8]], ROBE);   // 垂下来的宽袖口
    lnW(el[0] - u[1] * 4.6, el[1] + u[0] * 4.6, el[0] + u[1] * 4.6, el[1] - u[0] * 4.6, ROBE, 9);
    part(); { const p = [sh[0] + 1, sh[1] - 1]; for (const [a, l] of [[-0.3, 8], [0.4, 8], [1.1, 7], [-1.0, 6]]) leafW(p[0] - Math.cos(a) * 2, p[1] - Math.sin(a) * 2, a, l, a > 1 ? AUT : leafM(), 5); }   // 近侧肩头的叶片肩饰
    part(); dot(h[0], h[1], 3.5, sk); for (const k of [-1, 0, 1]) px(h[0] + L.d[0] * k * 2 + L.n[0] * 2, h[1] + L.d[1] * k * 2 + L.n[1] * 2, sk, 7); px(h[0] - L.n[0] * 2, h[1] - L.n[1] * 2, sk, 3);
  }
  function fireflies() {   // 绕着鹿角飞的三只萤火
    const c = L.head; for (let i = 0; i < 3; i++) { const a = P.fly * 0.26 + i * 2.1, x = c[0] + Math.cos(a) * (30 + i * 5), y = c[1] - 6 + Math.sin(a * 1.6 + i) * 8; if (P.wood) continue; part(); px(x, y, FFY, (P.fly + i * 5) % 6 < 3 ? 9 : 6); }
  }
  function thicket() {   // 荆棘丛的土沿（不跟身体走：死的时候人沉下去，丛还在）
    part(); polyW([[-58, 9], [-54, 1], [-44, -3], [-34, -1], [-26, -5], [-14, -2], [-2, -5], [10, -2], [22, -5], [34, -2], [46, -5], [56, -1], [62, 3], [64, 9]], MOSSD);
    for (const [x, y, r] of [[-44, -2, 2.4], [-26, -4, 2], [-2, -4, 2.6], [22, -4, 2], [46, -4, 2.2]]) dot(x, y, r, MOSSD, 7);
    part(); for (const [p0, p1, p2] of [[[-60, 4], [-44, -12], [-24, 2]], [[-30, 4], [-14, -10], [4, 3]], [[0, 5], [20, -11], [38, 3]], [[30, 4], [46, -10], [62, 2]], [[-50, 3], [-34, -8], [-18, 4]]]) {   // 带刺的藤弯
      const pts = B.bez(p0, p1, p2, 8); for (let i = 1; i < pts.length; i++) capW(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1.3, 1.1, BARKD);
      for (let i = 1; i < pts.length - 1; i += 2) { const p = pts[i]; px(p[0], p[1] - 2, BARK, 8); px(p[0] + 1, p[1] + 1, BARK, 6); } }
    part(); for (const [x, y, a] of [[-52, -3, -2.2], [-38, -7, -1.2], [-20, -5, -2.4], [-6, -6, -0.8], [12, -7, -2.0], [26, -6, -1.0], [42, -7, -2.3], [54, -4, -0.6]]) leafW(x, y, a, 5, LEAF);
    part(); for (const [x, y] of [[-40, -8], [-8, -6], [30, -8]]) { px(x, y, AUT, 8); px(x + 1, y, AUT, 6); px(x, y + 1, AUT, 4); }                       // 红浆果
    part(); capW(16, 0, 16, -4, 0.8, 0.8, ANT); polyW([[12, -4], [20, -4], [18, -7], [14, -7]], FLW, 3); px(15, -6, FLW, 8); px(17, -5, ANT, 8);        // 一朵毒蘑菇
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    const sb = Math.cos(P.sa) < -0.55;   // 杖抡到身后时画在身体后面
    const fr = P.fx2 > -6;   // 树手伸到身前（荆棘、抱胸、砸地）时画在身体前面
    crown(); antler(-1); if (!fr) treeArm(); if (sb) staff(); torso(); mantle(); if (fr) treeArm();
    head(); antler(1); if (!sb) staff(); arm(); fireflies(); thicket();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy, W = P.wood ? 0 : 1;
    RIM.rim = P.glow >= 3 ? 1 : 0; RIM.rx = X(L.core); RIM.ry = Y(L.core); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.core); LIGHTS[0].y = Y(L.core); LIGHTS[0].r = (P.glow >= 3 ? 14 : P.glow >= 2 ? 10 : 7) * z * W;
    LIGHTS[1].x = X(L.eye); LIGHTS[1].y = Y(L.eye); LIGHTS[1].r = 0;
    LIGHTS[2].x = X(L.seed); LIGHTS[2].y = Y(L.seed); LIGHTS[2].r = (10 + P.seed * 5 + (P.hot ? 4 : 0)) * z * W;
    LIGHTS[3].x = spr.ox; LIGHTS[3].y = spr.oy + 16 * z; LIGHTS[3].r = (P.hot ? 60 : 0) * z * W; LIGHTS[3].k = 0.4;                                     // 第二阶段：荆棘丛里泛上来的绿光
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连鹿角）
  function portrait() {   // 立绘：正面、头略低、张嘴、眼光全亮，木杖立在身旁、种子全亮，鹿角开花（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.18); P.hd = 0.06; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.bloom = 1; P.seed = 2; P.by = 0; P.breath = 0; P.fly = 5; P.sway = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; const c = hAt(7, -70); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 38 * 2]; return PSPR;
  }

  // ───── 特效（舞台坐标；只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y, R = Math.random;
  let emT = 0, pS = -1, pT = 0, pTh = 0;
  const groundX = () => { const d = L.d, h = L.hN; return h[0] + (d[1] ? -d[0] * (h[1] / d[1]) : 0); };   // 木杖往下延长碰到地面的地方
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'treants') { const x = sx(groundX()), y = HY;
        fx.circle(x, y, 26, 7, 'druid', 0.8, 1); fx.crack(x, y, 26, 1, 'druid', 1.2); fx.crack(x, y, 20, -1, 'druid', 1.0); fx.wave(x, y, 1, 36, 7, 'nature', 0.5, 2); fx.wave(x, y, -1, 26, 6, 'nature', 0.45, 2);
        ring(x, y - 2, 1, LIFE); burst(x, y - 4, 20, 40, 140, 0.4, 0.8, FXI.nature, 40); for (let i = 0; i < 16; i++) spawn(K_RISE, x + (R() - 0.5) * 60, y - R() * 4, 0, -24 - R() * 30, 0.8 + R() * 0.5, LIFE);
        shake(0.3, 3); flash(0.06); sfx('boss', { k: 'druidRoots', w: 1 }); sfx('impact', { pal: 'nature', w: 1 }); }
      else if (MV === 'thorns') { const x = sx(12), y = HY, f = L.hF;
        fx.wave(x, y, 1, 64, 12, 'druidThorn', 0.6, 2); fx.wave(x + 10, y, 1, 40, 8, 'druidThorn', 0.45, 2); fx.crack(x, y, 40, 1, 'druidThorn', 1.2); fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 2.2, 0.4, 'druid', 0.24, 3, 2);
        burst(sx(f[0]), sy(f[1]), 16, 40, 130, 0.3, 0.6, THR, 30); for (let i = 0; i < 18; i++) spawnX(K_PHYS, x + R() * 60, y - 2, 20 + R() * 80, -60 - R() * 140, 0.8 + R() * 0.4, R() < 0.5 ? THR : FXI.earth, { g: 320, floor: HY + 2 });
        shake(0.3, 3); flash(0.06); sfx('boss', { k: 'druidThorn', w: 1 }); sfx('impact', { pal: 'nature', w: 0.8 }); }
      else if (MV === 'druidSlam') slamFx();
      else if (MV === 'poke') { const t = L.seed; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 46, -0.3, 2.0, 'druid', 0.26, 3, 2); burst(sx(t[0]), sy(t[1]), 18, 50, 150, 0.25, 0.5, LIFE, 20); burst(sx(t[0]), sy(t[1]), 10, 40, 100, 0.3, 0.6, FXI.nature, 10);
        shake(0.3, 3); flash(0.06); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'thud', w: 0.8 }); sfx('impact', { pal: 'nature', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, LIFE); ring(sx(L.core[0]), sy(L.core[1]), 1, LIFE); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 40; i++) { const a = -Math.PI * R(); spawnX(K_PHYS, sx(L.core[0]), sy(L.core[1]), Math.cos(a) * (60 + R() * 120), Math.sin(a) * (80 + R() * 140), 0.9 + R() * 0.6, i & 1 ? FXI.nature : LIFE, { g: 160, floor: HY + 6 }); }
        for (let i = 0; i < 18; i++) spawn(K_RISE, sx(-50 + R() * 110), sy(-4 - R() * 8), 0, -30 - R() * 30, 0.9 + R() * 0.6, LIFE);   // 荆棘丛里冒上来的光点
        sfx('boss', { k: 'druidRoar', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'druidGrow', w: 1 }); sfx('impact', { pal: 'nature', w: 1 }); }
    }
    if (s === CHARGE && MV === 'treants') sfx('boss', { k: 'druidGrow', w: 0.9 });
    if (s === CHARGE && MV === 'thorns') sfx('boss', { k: 'druidCreak', w: 1 });
    if (s === CHARGE && MV === 'druidSlam') { sfx('boss', { k: 'growl', w: 0.6 }); sfx('boss', { k: 'druidCreak', w: 0.7 }); }
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'growl', w: 0.7 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'druidClimb', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function slamFx() {
    const pts = [L.hN, L.hF];
    for (const h of pts) { const x = sx(h[0]), y = HY; fx.wave(x, y, 1, 44, 9, 'druidThorn', 0.5, 2); fx.wave(x, y, -1, 30, 7, 'earth', 0.45, 2); fx.crack(x, y, 24, 1, 'druid', 1.3); fx.cloud(x, y - 6, 12, 'dust', 0.8, 2);
      burst(x, y - 2, 20, 60, 180, 0.35, 0.8, FXI.earth, 50); for (let i = 0; i < 14; i++) spawnX(K_PHYS, x + (R() - 0.5) * 14, y - 3, (R() - 0.5) * 160, -60 - R() * 170, 0.9 + R() * 0.5, i & 1 ? FXI.nature : FXI.earth, { g: 320, floor: HY + 2 }); }
    ring(sx(L.hN[0]), HY - 2, 1, LIFE); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'slam', w: 1 }); sfx('boss', { k: 'druidRoots', w: 0.8 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 42, 0.7, 2.4, 'druid', 0.22, 3, 2); burst(sx(L.seed[0]), sy(L.seed[1]), 14, 50, 140, 0.25, 0.5, LIFE, 20); burst(sx(L.seed[0]), sy(L.seed[1]), 8, 40, 100, 0.3, 0.6, FXI.nature, 20);
      hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'druidDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(0), sy(-30), 30, 50, 160, 0.4, 0.9, FXI.nature, 30); ring(sx(L.core[0]), sy(L.core[1]), 1, LIFE); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'druidCreak', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.7) { for (let i = 0; i < 36; i++) spawnX(K_PHYS, sx(-50 + R() * 100), sy(-30 - R() * 60), (R() - 0.5) * 30, 5 + R() * 15, 1.4 + R() * 0.8, i & 1 ? FXI.nature : POL, { g: 30, floor: HY + 2 }); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + R() * 80), sy(-6 - R() * 50), (R() - 0.5) * 10, -24 - R() * 30, 1.0 + R() * 0.8, LIFE); ring(sx(0), sy(-20), 1, LIFE); sfx('boss', { k: 'fade', w: 1 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.7, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    emT += dt; const D = E.DUR[CHARGE], cr = (q) => state === CHARGE && pS === CHARGE && pT < D * q && stT >= D * q;
    if (emT > (P.hot ? 0.06 : 0.13) && !P.wood) { emT = 0;
      if (R() < 0.55) spawnX(K_PHYS, sx(-56 + R() * 70), sy(-50 - R() * 30), (R() - 0.5) * 16, 4 + R() * 10, 1.4 + R() * 0.8, R() < 0.2 ? POL : FXI.nature, { g: 18, floor: HY + 2 });   // 枝冠上一直往下飘的落叶
      else spawn(K_EMBER, sx(-40 + R() * 90), sy(-30 - R() * 60), (R() - 0.5) * 8, -6 - R() * 8, 0.8 + R() * 0.8, R() < 0.6 ? POL : LIFE); }              // 萤火 / 花粉
    if (P.hot && R() < 0.25) spawn(K_RISE, sx(-50 + R() * 110), sy(-2), 0, -18 - R() * 20, 0.8 + R() * 0.5, LIFE);                                         // 第二阶段：荆棘丛里一直冒光点
    if (state === CHARGE && MV === 'treants' && R() < 0.7) { const c = L.seed, a = R() * 6.2832, r = 12 + R() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + R() * 0.2), 0, 9, R() < 0.5 ? LIFE : FXI.nature, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (cr(0.4) && MV === 'treants') { fx.cross(sx(L.seed[0]), sy(L.seed[1]), 8, 'druid', 0.35, 2); ring(sx(L.seed[0]), sy(L.seed[1]), 0, LIFE); }
    if (state === CHARGE && MV === 'thorns' && P.vine && R() < 0.6) { const t = L.tips[1 + ((R() * 3) | 0)][1]; spawnX(K_PHYS, sx(t[0] + (R() - 0.5) * 8), sy(-1), (R() - 0.5) * 40, -20 - R() * 40, 0.5, FXI.earth, { g: 260, floor: HY + 2 }); if (R() < 0.4) spawn(K_RISE, sx(t[0]), sy(t[1]), 0, -12, 0.5, THR); }
    if (cr(0.3) && MV === 'thorns') { fx.crack(sx(L.hF[0]), HY, 14, 1, 'druidThorn', 1.0); sfx('boss', { k: 'druidRoots', w: 0.4 }); }
    if (state === CHARGE && MV === 'druidSlam' && stT > D * 0.3 && R() < 0.5) { const h = R() < 0.5 ? L.hN : L.hF; spawnX(K_PHYS, sx(h[0] + (R() - 0.5) * 10), sy(h[1] + 3), (R() - 0.5) * 20, 10, 0.6, R() < 0.5 ? FXI.nature : FXI.earth, { g: 200, floor: HY + 2 }); }
    if (state === CHARGE && MV === 'druidSlam' && stT > D * 0.5 && R() < 0.5) { const c = L.seed, a = R() * 6.2832, r = 10 + R() * 8; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + R() * 0.2), 0, 9, LIFE, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'poke' && stT > D * 0.5 && R() < 0.4) spawn(K_EMBER, sx(L.seed[0] + (R() - 0.5) * 6), sy(L.seed[1]), 0, -10, 0.4, LIFE);
    if (state === CHARGE && MV === 'rise' && R() < 0.5) spawnX(K_PHYS, sx(-30 + R() * 70), sy(-2), (R() - 0.5) * 60, -40 - R() * 60, 0.7, R() < 0.5 ? FXI.nature : FXI.earth, { g: 240, floor: HY + 4 });
    if (state === MOVE && R() < 0.3) spawnX(K_PHYS, sx(L.hF[0]), sy(-1), (R() - 0.5) * 40, -30 - R() * 30, 0.5, FXI.earth, { g: 240, floor: HY + 4 });
    if (state === IDLE && P.thump && !pTh) { const x = sx(groundX()); burst(x, HY - 2, 8, 20, 60, 0.3, 0.5, FXI.nature, 60); spawn(K_RISE, sx(L.seed[0]), sy(L.seed[1]), 0, -14, 0.6, LIFE); ring(sx(L.seed[0]), sy(L.seed[1]), 0, LIFE); }   // 一顿杖：脚下扬起几片叶，种子冒一点光
    pS = state; pT = stT; pTh = P.thump;
  }
  function fxReset() { emT = 0; pS = -1; pT = 0; pTh = 0; }
  function fxBack(f12) { const x0 = sx(-56), x1 = sx(62); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + f12) % 3) === 0) E.put(x, HY + 1, P.hot && ((x >> 2) & 1) ? FXR[LIFE][3] : FXR[FXI.nature][4]); }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'treants'; return MVDUR[MV]; }

  // 自己的声音（mc-bossart.js 注册进 BOSSV；syn 的函数和 mc-audio.js 同名同参数）
  const VOICES = {
    druidCreak: (syn, t, w, p) => { syn.tone(t, 'sawtooth', 68, 0.55, 0.05 + 0.04 * w, { to: 96, lin: 1, vib: [22, 260, 0.03], lp: 900, pan: p }); syn.nz(t, 0.5, 'bandpass', 700, 5, 0.04 + 0.03 * w, { to: 1100, pan: p });
      syn.tone(t + 0.3, 'sawtooth', 90, 0.3, 0.03 + 0.02 * w, { to: 60, vib: [30, 300, 0.02], lp: 700, pan: p }); },                                            // 老树干吱呀一声
    druidGrow: (syn, t, w, p) => { syn.riser(t, t + 0.9, 200, 1600, 0.05 + 0.03 * w, { pan: p }); for (let i = 0; i < 8; i++) syn.nz(t + i * 0.1 + syn.rnd(0, 0.04), 0.06, 'bandpass', syn.rnd(1500, 3200), 2, 0.025 + 0.02 * w, { pan: p });
      syn.bell(t + 0.8, 79, 0.9, 0.03 + 0.01 * w, { pan: p }); syn.bell(t + 0.86, 86, 0.8, 0.02, { pan: p }); },                                            // 叶子沙沙往上长，最后两声清亮的铃
    druidRoots: (syn, t, w, p) => { syn.thud(t, 120, 40, 0.4, 0.2 + 0.1 * w, { pan: p }); syn.rumble(t, 0.9, 0.1 + 0.06 * w, { f: 140 }); for (let i = 0; i < 6; i++) syn.crackle(t + i * 0.06, 0.08, 1200 + i * 200, 0.04 + 0.02 * w, { pan: p });
      syn.tone(t + 0.05, 'sawtooth', 55, 0.6, 0.04, { to: 80, vib: [16, 200, 0.05], lp: 600, pan: p }); },                                                  // 一杖插进土：闷响 + 根须噼啪往外钻
    druidThorn: (syn, t, w, p) => { syn.whoosh(t, 0.25, 400, 2400, 0.05 + 0.03 * w, { pan: p }); for (let i = 0; i < 5; i++) { syn.nz(t + 0.08 + i * 0.05, 0.07, 'highpass', 2500, 0.8, 0.05 + 0.03 * w, { pan: p }); syn.thud(t + 0.08 + i * 0.05, 300, 90, 0.06, 0.05, { pan: p }); } },   // 地刺一根根穿出来
    druidRoar: (syn, t, w, p) => { syn.tone(t, 'sawtooth', 88, 1.3, 0.1 + 0.05 * w, { to: 62, vib: [6, 70, 0.2], lp: 800, pan: p, rev: 0.5 }); syn.tone(t + 0.03, 'square', 131, 1.1, 0.035, { to: 92, vib: [7, 90, 0.2], lp: 1000, pan: p, rev: 0.5 });
      syn.nz(t, 1.1, 'bandpass', 500, 2.5, 0.07, { to: 260, pan: p, rev: 0.4 }); syn.rumble(t, 1.2, 0.1 + 0.08 * w, { f: 120 }); for (let i = 0; i < 10; i++) syn.nz(t + 0.2 + i * 0.07, 0.08, 'bandpass', syn.rnd(1800, 3600), 2, 0.02, { pan: p }); },   // 吼声 + 满林子的叶子响
    druidClimb: (syn, t, w, p) => { syn.rumble(t, 2.2, 0.08 + 0.06 * w, { f: 100 }); for (let i = 0; i < 6; i++) { syn.nz(t + i * 0.34, 0.16, 'lowpass', 420, 0.8, 0.06 + 0.03 * w, { src: 'brown', pan: p }); syn.tone(t + i * 0.34 + 0.05, 'sawtooth', 70, 0.3, 0.03, { to: 95, vib: [20, 240, 0.03], lp: 700, pan: p }); } },
    druidDie: (syn, t, w, p) => { syn.tone(t, 'sawtooth', 100, 1.6, 0.09 + 0.05 * w, { to: 40, vib: [5, 90, 0.15], lp: 800, pan: p, rev: 0.6 }); syn.tone(t + 0.8, 'sawtooth', 60, 1.2, 0.05, { to: 45, vib: [18, 260, 0.03], lp: 600, pan: p });
      for (let i = 0; i < 14; i++) syn.nz(t + 0.6 + i * 0.08 + syn.rnd(0, 0.04), 0.08, 'bandpass', syn.rnd(1600, 3400), 2, 0.02 + 0.01 * w, { pan: p, rev: 0.4 }); },   // 哀嚎变成木头的吱呀，叶子落了一地
  };

  return {
    name: '德鲁伊', HX, R_EL: LIFE, DUR, hero, P, GLOW_MATS: [GL1, GL2, GL3, FFY], HIT_POINT: [2, -44], EVENTS, MAX_H: 110, OWN_MAX: 80, SHEET_K: 2, SINK: 33, VOICES,
    SFX: { body: 'beast', how: 'dissolve', pal: 'nature', style: 'summon', w: 1, hover: 1 },
    MOVES: ['treants', 'thorns', 'druidSlam', 'poke', 'rise', 'p2'], MOVE_NAMES: { treants: '召唤树人', thorns: '荆棘穿地', druidSlam: '根须震地', poke: '重击', rise: '升起', p2: '森林之怒（第二阶段仪式）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.75]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0.1, 0.4, 0.8], 'treants'], [CAST, [0, 2 / 12], 'treants'], [RECOVER, [0.35], 'treants'],
      [CHARGE, [0.2, 0.6, 1.0], 'thorns'], [CAST, [1 / 12], 'thorns'], [RECOVER, [0.3], 'thorns'],
      [CHARGE, [0.3, 0.9, 1.2], 'druidSlam'], [CAST, [0, 2 / 12], 'druidSlam'], [RECOVER, [0.35], 'druidSlam'],
      [CHARGE, [0.3, 0.9], 'poke'], [CAST, [1 / 12], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0.05, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.5, 1.9, 2.2, 2.5]]],
    portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 232, H: 148 });
