// 护士长（最终首领，第六章「深夜医院」的急诊走廊）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「护士长（口罩、护士帽、大针筒、吊瓶）」；无菌服（技能伤害 −35%）、扎针（法力最多的四个法力清零、6 秒不能放技能）、针雨 → 查房时间。
// 设定卡 ——
//   剪影：从血池里升起的瘦长上半身（原点 = 血面），一顶比脸还宽的白护士帽、正中一个红十字（识别点一）；帽下乱蓬蓬的黑长发垂过肩，
//         一张灰白的死人脸，下半张脸被一只浅青的外科口罩捂住（识别点二，口罩上渗着血），青黑的眼圈里两点病态的红光。
//   武器：一支比她身子还长的玻璃针筒（识别点三）：金属推杆和指托、玻璃筒里是发光的红药水（她身上最亮的光）、一根细长的针。
//   身后：一根吊瓶架从血里立起来，挂着一袋血，输液管接进她远侧的手臂。脏白的护士服、腰带、胸袋里的笔、挂表，全身溅着血。
//   主色：脏白（stormcoat）、灰白皮、黑发、浅青口罩和玻璃；光是药水的红（眼睛、针筒、帽上的十字）。
//   招式（setMove）：needle 扎针 · needleRain 针雨 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 第二阶段的样子常亮。
//     扎针：针筒往后一拉像拉弓，远手把推杆抽满、药水越灌越亮，针筒上方一根根浮起四根发光的针 → 往前一捅、推杆推到底，四根针飞出去。
//     针雨：针尖朝天、推杆抽满，针尖鼓起一滴越来越大的血珠 → 推杆一推到底，针和血往天上喷成一道泉。
//     重击：针筒举过肩、针尖朝前下 → 整支扎进血池（血浪、飞溅）。普攻：针筒往前一戳。
//     待机个性：脖子咔地往一边折一下；再把针筒竖到眼前端详，拇指推一下推杆，针尖滋出一小股（护士排气泡）。
//     升起：拿针筒当镐扎进血里，一把一把爬出来 → 挺直、仰头尖叫。第二阶段：捂住口罩、两声心跳脖子抽两下 → 一把扯下口罩（挂在一只耳朵上晃），
//     露出缝死的嘴裂开到耳根、一嘴针一样的牙，眼里流血泪，帽上的十字和药水常亮。
//     死亡：尖叫、针筒举高 → 玻璃筒炸碎、药水泼一身 → 头一歪瘫下去，吊瓶架倒进血里，整个人沉回血池化掉。
PCD.define('B_nurse', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP;

  // ───── 材质（11 级，暗 → 亮）：护士服用共用的 stormcoat（发青的脏白）、黑发和橡胶用 obsidian、金属用 bladesteel、血渍用 hellhide；
  //       自己的只有灰白的死人皮、浅青（口罩 / 玻璃 / 输液管共用一条）和发光的红药水 ─────
  const R_SKIN = ['#08080c', '#16161c', '#24262c', '#34373e', '#464a50', '#5a5f64', '#70767a', '#888e90', '#a2a8a8', '#bec2c0', '#dadcd6'];
  const R_TEAL = ['#050c10', '#0c1a20', '#142a32', '#1e3c44', '#2a5058', '#38666c', '#4a7e82', '#629898', '#80b2ae', '#a4ccc4', '#cce6de'];
  const R_WHITE = ['#0a0a14', '#20263a', '#3a4460', '#5c6a8a', '#7282a2', '#8c9cbc', '#aab8d4', '#cad6ea', '#e2e8f2', '#f4f6fa'];   // 脏白：stormcoat 往亮端再补两级
  const G = ramp(['#1e0204', '#4a040c', '#7c0a14', '#b41420', '#e4262c', '#ff5440', '#ff9270', '#ffd0b8', '#fff6ee']);
  const UNI = defDeep(R_WHITE, { depth: 8, dark: 1, amb: 0.16 }), UNID = defDeep(R_WHITE, { depth: 5, dark: 3, amb: 0.1 }), CAP = defDeep(R_WHITE, { depth: 4, amb: 0.3 });
  const SKIN = defDeep(R_SKIN, { depth: 5, amb: 0.14 }), SKIND = defDeep(R_SKIN, { depth: 4, dark: 3, amb: 0.1 });
  const HAIR = defDeep('obsidian', { depth: 5, dark: 4, amb: 0.02 }), RUB = defDeep('obsidian', { depth: 3, dark: 2, amb: 0.06 });
  const MASK = defDeep(R_TEAL, { depth: 5, amb: 0.24 }), GLASS = defDeep(R_TEAL, { depth: 3, dark: 1, amb: 0.3 });
  const STEEL = defDeep('bladesteel', { depth: 4, amb: 0.12 }), STEELD = defDeep('bladesteel', { depth: 3, dark: 3, amb: 0.08 }), BLD = defDeep('hellhide', { depth: 3, dark: 3, amb: 0.08 });
  const BL1 = defMat([G[1], G[2], G[3], G[4]], 1, 1), BL2 = defMat([G[2], G[3], G[4], G[5]], 1, 1), BL3 = defMat([G[3], G[5], G[6], G[7]], 1, 1), BL4 = defMat([G[5], G[6], G[7], G[8]], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { needle: { 3: 1.1, 4: 0.5, 5: 0.7 }, needleRain: { 3: 1.4, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'needle', HOT = 0;   // HOT：第二阶段（查房时间），口罩扯下、血泪、十字和药水常亮
  const SYR = [G[5], G[4], G[3]], EYEL = [G[7], G[5], G[3]], POOL = [DRAMP.hellhide[7], DRAMP.hellhide[5], DRAMP.hellhide[3]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: SYR, k: 1 }, { x: 0, y: 0, r: 60, ramp: POOL, k: 0.4 }, { x: 0, y: 0, r: 0, ramp: EYEL, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: SYR, k: 0.9 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.blood], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[BL1] = RIM.skip[BL2] = RIM.skip[BL3] = RIM.skip[BL4] = 1;

  // 姿势：身体升降 / 前倾、低头仰头（hd）、歪脖子（tilt）、张嘴、近手 = 握针筒的地方（nx, ny）、针筒角度（sa，屏幕角度，0 朝右）、
  //       推杆抽出多少（sp 0 推到底 → 1 抽满）、远手（fx2, fy2），fp 远手按在推杆上的程度（0 → 1 插值）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'tilt', 'jaw', 'nx', 'ny', 'sa', 'sp', 'fx2', 'fy2', 'fp', 'grab', 'glow', 'eyes', 'fan', 'orb', 'sq', 'shat', 'pole', 'mask', 'flash', 'dq', 'hot', 'drip', 'breath', 'sway'];
  const K = {
    idle: { nx: 31, ny: -40, sa: 0.18, sp: 0.55, fx2: -24, fy2: -22, fp: 0, lean: 0.04, hd: 0, tilt: 0.06 },
    inspect: { nx: 30, ny: -45, sa: -0.85, sp: 0.5, fx2: 0, fy2: 0, fp: 1, lean: 0, hd: -0.12, tilt: 0.24 },        // 把针筒竖到眼前端详
    aim: { nx: 12, ny: -46, sa: -0.12, sp: 1, fx2: 0, fy2: 0, fp: 1, lean: -0.14, hd: -0.04, tilt: -0.1 },         // 扎针：往后拉满，像拉弓
    thrust: { nx: 45, ny: -40, sa: 0.04, sp: 0, fx2: 0, fy2: 0, fp: 1, lean: 0.3, hd: 0.14, tilt: 0 },
    rainW: { nx: 22, ny: -44, sa: -1.05, sp: 0.85, fx2: 0, fy2: 0, fp: 1, lean: -0.12, hd: -0.16, tilt: -0.08 },    // 针雨：针尖朝天，推杆往下抽
    rainC: { nx: 27, ny: -50, sa: -1.18, sp: 0, fx2: 0, fy2: 0, fp: 1, lean: -0.1, hd: -0.42, tilt: -0.12 },
    pokeW: { nx: 6, ny: -64, sa: 0.62, sp: 0.55, fx2: 22, fy2: -30, fp: 0, lean: -0.16, hd: -0.08, tilt: 0.1 },     // 重击：举过肩、针尖朝前下
    stab: { nx: 42, ny: -26, sa: 1.05, sp: 0.55, fx2: 24, fy2: -18, fp: 0, lean: 0.36, hd: 0.22, tilt: 0.04 },
    jabW: { nx: 14, ny: -44, sa: 0.0, sp: 0.55, fx2: -20, fy2: -30, fp: 0, lean: -0.08, hd: 0, tilt: 0 },            // 普攻：往前一戳
    jab: { nx: 46, ny: -38, sa: 0.08, sp: 0.55, fx2: -16, fy2: -26, fp: 0, lean: 0.26, hd: 0.1, tilt: 0 },
    climbA: { nx: 36, ny: -18, sa: 1.25, sp: 0.55, fx2: -26, fy2: -4, fp: 0, lean: 0.3, hd: 0.25, tilt: 0.1 },       // 拿针筒当镐往上爬
    climbB: { nx: 34, ny: -4, sa: 1.2, sp: 0.55, fx2: -26, fy2: -22, fp: 0, lean: 0.32, hd: 0.25, tilt: -0.06 },
    wide: { nx: 40, ny: -62, sa: -0.72, sp: 0.55, fx2: -36, fy2: -60, fp: 0, lean: -0.16, hd: -0.36, tilt: -0.12 },  // 仰头尖叫、两手张开
    hunch: { nx: 30, ny: -30, sa: 0.5, sp: 0.55, fx2: 0, fy2: 0, fp: 0, lean: 0.3, hd: 0.36, tilt: 0.16 },           // 第二阶段：捂住口罩
    agony: { nx: 34, ny: -62, sa: -1.0, sp: 0.55, fx2: -30, fy2: -64, fp: 0, lean: -0.2, hd: -0.45, tilt: -0.15 },
    limp: { nx: 30, ny: -4, sa: 1.3, sp: 0.55, fx2: -22, fy2: -2, fp: 0, lean: 0.5, hd: 0.5, tilt: 0.5 },
  };
  const KF = ['nx', 'ny', 'sa', 'sp', 'fx2', 'fy2', 'fp', 'lean', 'hd', 'tilt'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mask = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.sway = (f12 >> 2) % 4;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.drip = f12 % 6; P.glow = 1 + ((f12 >> 3) & 1); P.eyes = (f12 % 9 === 0 || f12 % 13 === 0) ? 2 : 1;   // 眼里的红光一跳一跳
      const lp = tt % DUR[IDLE];
      if (lp >= 0.55 && lp < 0.8) P.tilt = lp < 0.64 ? 0.34 : 0.22;                                        // 脖子咔地折到一边
      if (lp >= 1.2 && lp < 2.2) {                                                                          // 竖起针筒端详、推一下推杆排气
        const qi = lp < 1.95 ? ease.inOut(clamp01((lp - 1.2) / 0.25)) : 1 - ease.inOut(clamp01((lp - 1.95) / 0.25));
        pose(K.idle, K.inspect, qi); P.eyes = 2;
        if (lp >= 1.62 && lp < 1.95) { P.sp = 0.36; P.sq = lp < 1.8 ? 1 : 0; }
      }
    };
    const climb = (tt) => { const f = Math.floor(tt * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.drip = f12 % 6; };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { climb(tq); P.glow = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.jabW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.jabW, K.jabW); P.glow = 2; P.eyes = 2; }
      else if (tq < 0.42) { pose(K.jab, K.jab); P.jaw = 1; P.glow = 3; P.eyes = 2; }
      else pose(K.jab, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12, climb);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.3; P.tilt = -0.22; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 4; P.ny -= 3; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.tilt = 0.06 - 0.28 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.flash = d < 1 / 12 ? 1 : 0; P.tilt += (f12 & 1) ? 0.05 : -0.05; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.shat = 1; P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.0 ? 3 : 1; P.eyes = d < 1.2 ? 2 : 1; P.pole = -Math.round(clamp01((d - 1.1) / 0.4) * 6) / 12; }
      else { pose(K.limp, K.limp); P.shat = 1; P.jaw = 1; P.glow = 0; P.eyes = d < 1.8 ? 1 : 0; P.by = Math.round(ease.in(clamp01((d - 1.5) / 1.1)) * 46);
        P.pole = -0.5 - Math.round(ease.in(clamp01((d - 1.5) / 0.45)) * 11) / 12; P.dq = d > 2.2 ? Math.round(clamp01((d - 2.2) / 0.4) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = L.fluid[0]; P.gy = L.fluid[1];
  }
  const MVI = { needle: 0, needleRain: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12, climb) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'needle') {
      if (st === CHARGE) { pose(K.idle, K.aim, ease.out(clamp01(q / 0.35))); P.sp = K.idle.sp + (1 - K.idle.sp) * ease.inOut(clamp01((q - 0.1) / 0.55));
        P.fan = Math.min(4, Math.floor(clamp01((q - 0.3) / 0.5) * 4) + (q >= 0.3 ? 1 : 0)); P.glow = q < 0.4 ? 2 : 3; P.eyes = q > 0.5 ? 2 : 1; P.by = 0;
        if (q > 0.8) { P.nx += tr; P.by += (f12 & 1); P.jaw = 1; } }
      else if (st === CAST) { pose(K.thrust, K.thrust); P.jaw = 2; P.glow = 3; P.eyes = 2; P.by = 1; }
      else pose(K.thrust, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else if (MV === 'needleRain') {
      if (st === CHARGE) { pose(K.idle, K.rainW, ease.out(clamp01(q / 0.3))); P.sp = K.idle.sp + (K.rainW.sp - K.idle.sp) * ease.inOut(clamp01((q - 0.1) / 0.4));
        P.orb = Math.round(clamp01((q - 0.3) / 0.6) * 4); P.glow = q < 0.4 ? 2 : 3; P.eyes = q > 0.4 ? 2 : 1; P.by = 0; P.hd -= 0.12 * clamp01((q - 0.3) / 0.6);
        if (q > 0.8) { P.nx += tr; P.by += (f12 & 1); P.jaw = 1; } }
      else if (st === CAST) { pose(K.rainC, K.rainC); P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else pose(K.rainC, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.45))); P.by = 0; if (q > 0.6) { P.nx += tr; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.stab, K.stab); P.by = 3; P.jaw = 2; P.glow = 3; P.eyes = 2; }
      else { pose(K.stab, K.idle, ease.inOut(clamp01(tq / 0.5))); P.by = Math.round(3 * (1 - clamp01(tq / 0.5))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { climb(tq); P.by += Math.round(22 * (1 - ease.inOut(q)) / 2) * 2; P.glow = 1 + (f12 & 1); P.eyes = q > 0.6 ? 2 : (q > 0.3 ? 1 : 0); }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; if (tq < 0.1) P.tilt = 0.3; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：捂住口罩 → 两声心跳、脖子抽两下 → 一把扯下口罩、仰头尖叫
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); P.grab = tq >= 0.12 ? 1 : 0; P.mask = 0; const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47);
        P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; if (hb) P.tilt += tq < 0.12 ? 0.22 : -0.22; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.mask = 1; P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.mask = 1; P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [16, -47], SHF = [-13, -47], NECK = [3, -52];
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q], add = (a, d, k) => [a[0] + d[0] * k, a[1] + d[1] * k];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5 + P.tilt); }
  // 头整体放大 1.15 倍（绕脖子）：护士帽、脸和口罩要占剪影的大头
  const HS = 1.15, hsx = (x) => NECK[0] + (x - NECK[0]) * HS, hsy = (y) => NECK[1] + (y - NECK[1]) * HS;
  const H = { ell: (e, cx, cy, rx, ry, a, m, t) => B.ell(e, hsx(cx), hsy(cy), rx * HS, ry * HS, a, m, t), poly: (e, pts, m, t) => B.poly(e, pts.map((p) => [hsx(p[0]), hsy(p[1])]), m, t),
    ln: (e, x0, y0, x1, y1, m, t) => B.ln(e, hsx(x0), hsy(y0), hsx(x1), hsy(y1), m, t), px: (e, x, y, m, t) => B.px(e, hsx(x), hsy(y), m, t), at: (x, y) => B.at(hsx(x), hsy(y)),
    save: () => B.save(), restore: () => B.restore(), rot: (x, y, a) => B.rot(hsx(x), hsy(y), a) };
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.chest = B.at(2, -32);
    headXf(); L.eye = H.at(7, -71); L.eyeN = H.at(12, -71); L.eyeF = H.at(1, -71); L.mouth = H.at(9, -59); L.mask = H.at(8, -61); L.cross = H.at(7, -83); L.earF = H.at(-5, -65); L.head = H.at(6, -74);
    const d = [Math.cos(P.sa), Math.sin(P.sa)]; L.d = d; L.n = [-d[1], d[0]]; L.up = [d[1], -d[0]];
    const g = L.hN = [P.nx, P.ny + P.by]; L.back = add(g, d, -10); L.front = add(g, d, 26); L.hub = add(g, d, 31); L.tip = add(g, d, 51);
    const s = 2 + (1 - P.sp) * 28; L.stop = add(L.back, d, s); L.disc = add(L.back, d, s - 30); L.fluid = lerp(L.stop, L.front, 0.5);
    if (P.shat) L.tip = add(g, d, 4);
    const free = P.grab ? [L.mask[0] - 2, L.mask[1] + 1] : [P.fx2, P.fy2 + P.by];
    L.hF = lerp(free, L.disc, P.grab ? 0 : P.fp);
    L.elN = B.ik(L.shN, L.hN, 19, 19, -1); L.elF = B.ik(L.shF, L.hF, 20, 21, 1); L.iv = lerp(L.elF, L.hF, 0.28);
  }
  const capW = (a, b, r0, r1, m, t) => B.capW(E, a[0], a[1], b[0], b[1], r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (p, r, m, t) => B.dotW(E, p[0], p[1], r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (a, b, m, t) => B.lnW(E, a[0], a[1], b[0], b[1], m, t);

  function ivStand() {   // 吊瓶架：从血里立起的细杆、顶上的横杆和挂钩，挂着一袋血，输液管垂下来接进远侧的手臂
    B.reset(); const base = [-38, 8], a = P.pole, up = [Math.sin(a), -Math.cos(a)], rt = [Math.cos(a), Math.sin(a)], top = add(base, up, 98);
    part(); capW(base, top, 1.3, 1.1, STEELD); lnW(add(add(base, rt, 0.6), up, 20), add(top, rt, 0.6), STEELD, 8);
    capW(add(top, rt, -7), add(top, rt, 7), 1, 1, STEELD); for (const k of [-7, 7]) { const h = add(top, rt, k); capW(h, add(add(h, up, -3), rt, k > 0 ? -1 : 1), 0.8, 0.5, STEELD); }
    part(); const bc = add(add(top, rt, 5), up, -13), bw = 6, bh = 9;
    polyW([add(add(bc, rt, -bw), up, bh - 1), add(add(bc, rt, bw), up, bh - 1), add(add(bc, rt, bw), up, -bh + 3), add(add(bc, rt, 1.5), up, -bh), add(add(bc, rt, -1.5), up, -bh), add(add(bc, rt, -bw), up, -bh + 3)], GLASS);
    const lv = add(bc, up, 2 - (P.glow >= 3 ? 0 : 1));
    polyW([add(add(lv, rt, -bw + 1.2), up, 0), add(add(lv, rt, bw - 1.2), up, 0), add(add(bc, rt, bw - 1.2), up, -bh + 3), add(add(bc, rt, -bw + 1.2), up, -bh + 3)], P.glow >= 3 ? BL2 : BL1);
    polyW([add(add(bc, rt, -3), up, 5), add(add(bc, rt, 3), up, 5), add(add(bc, rt, 3), up, 1), add(add(bc, rt, -3), up, 1)], CAP);   // 标签
    px(bc[0] - 0.5, bc[1] - 3, BL2); px(bc[0] - 1.5, bc[1] - 3, BL2); px(bc[0] + 0.5, bc[1] - 3, BL2); px(bc[0] - 0.5, bc[1] - 4, BL2); px(bc[0] - 0.5, bc[1] - 2, BL2);
    lnW(add(add(bc, rt, -bw + 1), up, bh - 2), add(add(bc, rt, -bw + 1), up, -bh + 4), GLASS, 8); capW(add(top, rt, 5), add(add(top, rt, 5), up, -4), 0.6, 0.6, GLASS, 8);
    if (P.dq) return;
    part(); const b0 = add(bc, up, -bh - 1), ch = add(b0, up, -4); capW(b0, ch, 1.4, 1.4, GLASS, 7); px(ch[0], ch[1] - 1, P.drip < 3 ? BL3 : BL1);   // 滴壶
    const mid = [(ch[0] + L.iv[0]) / 2 + 3, Math.max(ch[1], L.iv[1]) + 10 + P.sway], pts = B.bez(ch, mid, L.iv, 14);
    for (let i = 1; i < pts.length; i++) lnW(pts[i - 1], pts[i], GLASS, 8);
    for (let i = 1; i < pts.length; i++) if ((i + P.drip) % 3 === 0) px(pts[i][0], pts[i][1], BL1);   // 管子里一段段往下走的血
  }
  function hairBack() {   // 乱蓬蓬的黑长发：先是后脑一团，再一缕缕垂过肩
    part(); headXf(); H.ell(E, 1, -72, 14.5, 13.5, 0, HAIR); H.ell(E, -4, -64, 10, 8, 0, HAIR);
    const roots = [[-11, -78], [-13, -72], [-13, -66], [-11, -60], [-7, -57], [15, -72], [17, -66]].map((p) => H.at(p[0], p[1])); B.reset();
    const sw = [0, 1, 1, 0][P.sway];
    roots.forEach((r, i) => { const near = i >= 5, s = near ? 1 : -1, len = near ? 20 + i : 26 + (i % 3) * 5, j = ((i * 7) % 3) - 1;
      const pts = [r, [r[0] + s * (2 + j), r[1] + len * 0.3], [r[0] + s * (1 - j) + sw, r[1] + len * 0.62], [r[0] + s * (3 + j) + sw, r[1] + len]];
      B.strand(E, pts, near ? 3 : 3.6, 1, HAIR); B.ln(E, pts[1][0], pts[1][1], pts[2][0], pts[2][1], HAIR, 3); });
    B.ln(E, roots[1][0] - 1, roots[1][1] + 4, roots[1][0] - 3, roots[1][1] + 14, HAIR, 7);
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, sk = far ? SKIND : SKIN, un = far ? UNID : UNI;
    part(); capW(sh, el, 3.4, 2.8, sk); capW(el, h, 2.8, 2.2, sk);                                              // 细长的灰白手臂
    const m1 = lerp(el, h, 0.25), m2 = lerp(el, h, 0.7); lnW([m1[0] + 0.5, m1[1] + 1], [m2[0] - 0.5, m2[1] + 0.5], sk, 3);   // 青筋
    part(); const s1 = lerp(sh, el, 0.6), rs = far ? 4.4 : 5.2; capW(sh, s1, rs, rs - 0.8, un); const cf = lerp(sh, el, 0.54); capW(cf, s1, rs - 0.8, rs - 0.8, un, 3);   // 短袖
    if (!far) { const c = lerp(sh, el, 0.3); px(c[0], c[1], BL2); px(c[0] - 1, c[1], BL2); px(c[0] + 1, c[1], BL2); px(c[0], c[1] - 1, BL2); px(c[0], c[1] + 1, BL2); }   // 袖上的红十字臂章
    if (far && !P.dq) { const v = L.iv; capW([v[0] - 2, v[1] - 1], [v[0] + 2, v[1] + 1], 1, 1, CAP, 7); }                                                                // 输液的胶布
  }
  function hand(side) {
    const far = side < 0, h = far ? L.hF : L.hN, sk = far ? SKIND : SKIN, el = far ? L.elF : L.elN;
    part();
    if (!far && !P.shat) {   // 握着针筒：四根指头绕过玻璃筒
      const d = L.d, n = L.n; dot(add(h, n, 3), 3, sk);
      for (let i = 0; i < 4; i++) { const b = add(h, d, i * 2.2 - 3.3); capW(add(b, n, 3), add(b, n, -5.5), 1.1, 0.9, sk, i === 0 ? 7 : 0); px(...add(b, n, -6), RUB); }
      return;
    }
    const dir = Math.atan2(h[1] - el[1], h[0] - el[0]); dot(h, 2.8, sk);
    if (far && P.fp > 0.6 && !P.grab) { capW(h, add(h, L.d, 3), 1.2, 1, sk, 7); return; }   // 拇指按在推杆上
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * 0.36, r0 = [h[0] + Math.cos(a) * 2.2, h[1] + Math.sin(a) * 2.2], tip = [r0[0] + Math.cos(a + 0.4 * side) * 6, r0[1] + Math.sin(a + 0.4 * side) * 6];
      capW(r0, tip, 1, 0.5, sk, i === 0 ? 7 : 0); px(tip[0], tip[1], RUB); }                                        // 长手指、黑指甲
  }
  function neck() { part(); torsoXf(); B.cap(E, 2, -46, 4, -57, 4.4, 4, SKIN); B.ln(E, 0, -48, 2, -56, SKIN, 3); B.ln(E, 5, -48, 6, -55, SKIN, 3); }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-11, 6], [11, 6], [10, -12], [12, -20], [15, -30], [17, -41], [15, -47], [5, -51], [-6, -51], [-14, -47], [-16, -41], [-13, -30], [-10, -20], [-10, -12]], UNI);
    B.ell(E, -5, -34, 6, 4.5, 0.2, UNI, 7); B.ell(E, 9, -34, 6, 4.5, -0.2, UNI, 7); B.ln(E, -12, -30, -1, -28, UNI, 3); B.ln(E, 4, -28, 15, -30, UNI, 3);   // 胸
    B.ln(E, 2, -44, 2, 6, UNI, 3); B.ln(E, 3, -44, 3, -15, UNI, 8); for (const y of [-40, -33, -26, -19]) { B.px(E, 1, y, STEEL, 7); }                   // 前襟和扣子
    B.ln(E, 7, -30, 13, -30, UNI, 3); B.ln(E, 7, -30, 7, -25, UNI, 3); B.ln(E, 13, -30, 13, -25, UNI, 3); B.ln(E, 7, -25, 13, -25, UNI, 3);               // 胸袋
    B.ln(E, 9, -30, 9, -34, STEEL, 7); B.ln(E, 11, -30, 11, -33, BL1); B.px(E, 11, -34, BL2);                                                           // 袋里的笔（一支红笔）
    B.ell(E, -8, -39, 1.8, 1.8, 0, STEEL, 7); B.px(E, -8, -39, STEEL, 3); B.ln(E, -8, -41, -5, -45, STEEL, 3);                                         // 胸前的挂表
    B.poly(E, [[-10, -16], [11, -16], [10, -12], [-10, -12]], RUB); B.poly(E, [[0, -17], [5, -17], [5, -11], [0, -11]], STEEL); B.px(E, 2, -14, STEEL, 3);   // 腰带
    for (const x of [-8, -3, 7]) B.ln(E, x, -9, x + (x > 0 ? 1 : -1), 6, UNI, 3);                                                                       // 裙褶
    B.ln(E, -15, -38, -13, -20, UNI, 3); B.ln(E, 16, -38, 14, -18, UNI, 3);
    // 血：胸口一片溅射、往下淌，腰下一大块；第二阶段更多
    B.ell(E, 6, -40, 2.4, 1.6, 0.4, BLD); B.px(E, 9, -42, BLD); B.px(E, 10, -38, BLD); B.px(E, 4, -44, BLD); B.ln(E, 6, -39, 6, -35, BLD); B.ln(E, 5, -38, 5, -32, BLD);
    B.ell(E, -6, -5, 4, 3, 0.3, BLD); B.px(E, -10, -8, BLD); B.px(E, -2, -9, BLD); B.ln(E, -5, -2, -5, 4, BLD);
    B.px(E, -9, -24, BLD); B.px(E, -10, -23, BLD); B.px(E, 12, -20, BLD);
    if (P.hot) { B.ell(E, 10, -19, 3, 4, 0.2, BLD); B.ln(E, 10, -16, 11, -9, BLD); B.ell(E, -8, -31, 2.5, 2, 0, BLD); B.ln(E, -8, -29, -9, -21, BLD); B.px(E, 2, -46, BLD); }
    part(); torsoXf();   // 尖领子：V 领里露一点灰白的皮
    B.poly(E, [[-6, -51], [5, -51], [2, -42]], SKIN); B.ln(E, -4, -50, 2, -43, SKIN, 3);
    B.poly(E, [[-7, -52], [1, -42], [-8, -44], [-13, -49]], UNI); B.ln(E, -7, -52, -13, -49, UNI, 8);
    B.poly(E, [[6, -52], [3, -42], [11, -44], [15, -49]], UNI); B.ln(E, 6, -52, 15, -49, UNI, 8); B.px(E, 1, -42, UNI, 10);
  }
  function head() {   // 灰白的脸：青黑的眼圈里两点红光，下半张脸是口罩
    part(); headXf(); const J = P.jaw;
    H.ell(E, 6, -69, 11, 12.5, 0, SKIN); H.poly(E, [[-4, -68], [17, -68], [17, -61], [13, -56], [7, -54], [1, -56], [-3, -61]], SKIN);
    H.ln(E, 16, -70, 16, -64, SKIN, 3); H.ln(E, 9, -70, 10, -66, SKIN, 7);                                               // 凹下去的颊、鼻梁
    for (const [x, rx] of [[1, 3.2], [12, 3.8]]) { H.ell(E, x, -71, rx, 3, 0, SKIN, 3); H.ell(E, x, -71.2, rx - 1, 1.8, 0, SKIN, 10); H.ln(E, x - rx + 1, -68, x + rx - 1, -68, SKIN, 3); }   // 青黑的眼圈
    if (P.eyes) { const em = P.eyes >= 2 ? BL3 : BL2; for (const x of [1, 12]) { H.ln(E, x - 1.5, -71, x + 1.5, -71, P.eyes >= 2 ? BL2 : BL1); H.px(E, x, -71, em); if (P.eyes >= 2) H.px(E, x, -72, BL4); } }
    if (P.hot) for (const x of [1, 12]) { H.ln(E, x, -69, x + 0.4, -64, BL1); H.px(E, x, -69, BL2); }                          // 血泪
    if (!P.mask) {   // 口罩：鼻梁上一道压条、三道褶、两根耳绳，嘴的位置渗着血
      part(); headXf();
      H.poly(E, [[-4, -65], [4, -67], [10, -68.5], [13, -67.5], [18.5, -65.5], [19, -60], [15, -55 + J], [8, -53 + J], [1, -55 + J], [-3.5, -60]], MASK);
      H.ln(E, -3, -65.5, 18, -66, MASK, 8); H.ell(E, 12, -65.5, 2, 1.2, 0, MASK, 7);
      for (const y of [-63, -60, -57]) { const yy = y + (y > -62 ? J * 0.5 : 0); H.ln(E, -2.5, yy, 18, yy - 0.5, MASK, 3); H.ln(E, -2, yy + 1, 17.5, yy + 0.5, MASK, 7); }
      if (J) H.ell(E, 9, -58 + J * 0.5, 3.5, 0.8 + J * 0.6, 0, MASK, 3);                                              // 张嘴时口罩被吸进去
      H.ell(E, 9, -58.5 + J * 0.5, 3, 1.4, 0, BLD); H.ln(E, 8, -57.5 + J * 0.5, 8, -54 + J, BLD); H.px(E, 11, -56 + J * 0.5, BLD); H.px(E, 6, -59, BLD);   // 口罩上的血
      H.ln(E, -4, -64, -6, -68, MASK, 8); H.ln(E, -3.5, -59, -6, -64, MASK, 8);
    } else {         // 口罩扯掉了：缝死的嘴裂到耳根，一嘴针牙；口罩挂在一只耳朵上晃
      part(); headXf(); const oy = J * 1.3;
      H.ln(E, 0, -60, 17, -61, SKIN, 10); H.ln(E, 17, -61, 19, -64, SKIN, 10); H.ln(E, 0, -60, -2, -62, SKIN, 10); H.px(E, 19, -64, BLD);
      if (J) { H.poly(E, [[0, -60], [17, -61], [15, -59 + oy], [8, -57.5 + oy], [2, -58.5 + oy]], BLD); H.ell(E, 8.5, -59.5 + oy * 0.5, 3, 0.6 + oy * 0.4, 0, BL1);
        for (let x = 1; x <= 16; x += 2) { H.ln(E, x, -60.5, x + 0.3, -59.4, STEEL, 8); H.ln(E, x + 1, -58.6 + oy, x + 1, -59.6 + oy, STEEL, 8); } }
      for (const x of [2, 5, 8, 11, 14]) { H.ln(E, x, -62, x + 0.5, -60.5, SKIN, 10); H.ln(E, x + 0.5, -59 + oy, x, -57.5 + oy, SKIN, 10); }   // 缝线（张嘴时断成上下两截）
      part(); headXf(); H.save(); H.rot(-5, -64, 1.15 + (P.sway & 1) * 0.1);
      H.poly(E, [[-4, -65], [6, -67], [13, -66], [14, -60], [8, -56], [0, -57], [-3.5, -60]], MASK); H.ln(E, -3, -64.5, 13, -65.5, MASK, 8);
      for (const y of [-63, -60]) H.ln(E, -2.5, y, 13, y - 0.5, MASK, 3); H.ell(E, 6, -60, 2.5, 1.5, 0, BLD); H.restore();
      H.ln(E, -4, -64, -6, -68, MASK, 8);
    }
  }
  function fringe() {   // 帽子下面乱糟糟的刘海，一缕垂过远侧的眼角
    part(); headXf(); H.poly(E, [[-10, -80], [21, -80], [20, -77], [17, -78.5], [15, -76], [12, -78], [9, -76.5], [6, -78.5], [3, -76], [0, -78], [-3, -75], [-6, -77], [-10, -72]], HAIR, 10);
    H.ln(E, 3, -75, 4, -70, HAIR); H.ln(E, 4, -70, 3, -67, HAIR); H.ln(E, -2, -78, 3, -76, HAIR, 7); H.ln(E, 10, -79, 14, -77, HAIR, 7);
  }
  function cap() {   // 护士帽：比脸还宽的白帽子，正中一个红十字（第二阶段发亮）
    part(); headXf(); H.poly(E, [[-11, -84], [-7, -91], [4, -93], [16, -92.5], [23, -88], [22, -84]], CAP); H.ln(E, -7, -91, 16, -92.5, CAP, 8); H.ln(E, -9, -86, 21, -87, CAP, 3);
    part(); headXf(); H.poly(E, [[-10, -77], [21, -78], [25, -88], [-13, -87]], CAP);
    H.ln(E, -13, -87, 25, -88, CAP, 8); H.ln(E, -10, -78, 21, -79, CAP, 3); H.poly(E, [[-13, -87], [-9, -87], [-10, -80]], CAP, 3); H.poly(E, [[25, -88], [21, -88], [21, -80]], CAP, 3);
    const cm = BL2;
    H.poly(E, [[3, -84.5], [11.5, -84.5], [11.5, -81.5], [3, -81.5]], cm); H.poly(E, [[5.8, -87], [8.6, -87], [8.6, -79.3], [5.8, -79.3]], cm);
    if (P.hot) { H.px(E, 7, -83, BL4); H.px(E, 7, -84, BL4); } else if (P.glow >= 3) H.px(E, 7, -83, BL3);
    H.px(E, -9, -82, BLD); H.px(E, -8, -81, BLD); H.px(E, 19, -80, BLD);                                                 // 帽上溅的血点
  }
  function hairFront() {   // 近侧一缕长发从脸边垂到胸前
    headXf(); const r = H.at(17, -76), r2 = H.at(18, -68); B.reset(); const sw = [0, 1, 1, 0][P.sway];
    part(); B.strand(E, [r, [r[0] + 3, r[1] + 9], [r2[0] + 3 + sw, r2[1] + 10], [r2[0] + 4 + sw, r2[1] + 22], [r2[0] + 2 + sw, r2[1] + 30]], 2.6, 0.9, HAIR);
    B.ln(E, r[0] + 3, r[1] + 9, r2[0] + 3 + sw, r2[1] + 10, HAIR, 7);
  }
  function syringe() {   // 大针筒：推杆和指托（钢）、玻璃筒里发光的红药水和黑橡胶塞、刻度、针座、细长的针
    const d = L.d, n = L.n, up = L.up, back = L.back, front = L.front, hub = L.hub, tip = L.tip, stop = L.stop, disc = L.disc;
    part(); capW(disc, back, 1.6, 1.6, STEEL); capW(add(disc, n, -5.5), add(disc, n, 5.5), 1.5, 1.5, STEEL); lnW(add(add(disc, n, -5), d, -1), add(add(disc, n, 5), d, -1), STEEL, 8);
    if (P.shat) {   // 玻璃筒炸了：只剩后面一截参差的碎口
      part(); const e = add(back, d, 11); capW(back, e, 6, 6, GLASS); for (const [k, l] of [[-4, 4], [-1, 7], [2, 3], [4.5, 6]]) capW(add(e, n, k), add(add(e, n, k), d, l), 1.2, 0.3, GLASS, 8);
      capW(add(back, d, 1.5), add(back, d, 5), 4.6, 4.6, RUB); lnW(add(add(back, n, -4.5), d, 1), add(add(e, n, -4.5), d, 2), GLASS, 8);
      part(); capW(add(back, n, -10), add(back, n, 10), 1.8, 1.8, STEEL); return;
    }
    part(); capW(back, front, 6.2, 6.2, GLASS);
    lnW(add(back, d, 1), stop, STEEL, 3);                                                                                // 筒里没药的那段看得见推杆
    const fm = P.glow >= 2 ? BL2 : BL1, fh = P.glow >= 3 ? BL4 : P.glow >= 2 ? BL3 : BL2;
    if (Math.hypot(front[0] - stop[0], front[1] - stop[1]) > 3) { capW(add(stop, d, 1.5), add(front, d, -1.8), 4.4, 4.4, fm); lnW(add(add(stop, d, 2.5), up, 1.5), add(add(front, d, -3), up, 1.5), fh);
      for (let k = 0; k < 3; k++) { const b = lerp(stop, front, 0.25 + k * 0.25); px(b[0] + up[0] * (k - 1), b[1] + up[1] * (k - 1), fh); } }                  // 药水里的气泡 / 亮点
    capW(add(stop, n, -4.6), add(stop, n, 4.6), 1.5, 1.5, RUB); lnW(add(add(stop, n, -4), d, -1), add(add(stop, n, 4), d, -1), RUB, 7);   // 橡胶塞
    for (let k = 4; k < 34; k += 4) { const b = add(back, d, k); lnW(add(b, n, 3.2), add(b, n, k % 8 ? 4.6 : 2.2), GLASS, 10); }           // 刻度
    lnW(add(add(back, up, 4.4), d, 1), add(add(front, up, 4.4), d, -2), GLASS, 8); lnW(add(add(back, up, 3.4), d, 3), add(add(back, up, 3.4), d, 9), GLASS, 8);   // 玻璃的反光
    part(); capW(add(back, n, -10.5), add(back, n, 10.5), 1.9, 1.9, STEEL); lnW(add(add(back, n, -10), d, -1.5), add(add(back, n, 10), d, -1.5), STEEL, 8);   // 指托
    part(); capW(front, hub, 5.2, 2.2, STEEL); lnW(add(front, up, 3.5), add(hub, up, 1.6), STEEL, 8);
    part(); capW(hub, tip, 1.1, 0.45, STEEL, 7); lnW(add(hub, up, 0.6), add(tip, d, -2), STEEL, 8); px(tip[0], tip[1], P.glow >= 3 ? BL4 : STEEL, 8);
    if (P.orb) { part(); const c = add(tip, d, 1 + P.orb * 0.8), r = 1 + P.orb * 1.1; dot(c, r + 1, BL1); dot(c, r, BL2); dot([c[0] - 0.5, c[1] - 0.5], Math.max(0.6, r - 1.4), BL3); if (P.orb >= 3) px(c[0] - 1, c[1] - 1, BL4); }
  }
  function needles() {   // 扎针的蓄力：针筒上方一根根浮起来的发光的针
    if (!P.fan) return; const d = L.d, up = L.up, g = L.hN;
    for (let i = 0; i < P.fan; i++) { part(); const c = add(add(g, d, 12 + i * 5), up, 12 + i * 6 + ((P.sway + i) & 1)), a = add(c, d, -7), b = add(c, d, 7);
      capW(a, b, 0.9, 0.4, STEEL, 8); px(a[0], a[1], BL2); px(a[0] - d[0], a[1] - d[1], BL1); px(b[0], b[1], P.glow >= 3 ? BL4 : BL3); }
  }
  function drips() {   // 针尖和筒口往下滴血
    if (P.shat || P.dq) return; const k = P.drip; if (!k && P.st !== IDLE && P.st !== MOVE) return; part();
    for (const [p, ph] of [[L.tip, 0], [add(L.front, L.n, 5), 3]]) { const dd = (k + ph) % 6; if (p[1] + dd > 0 || (ph && P.sa < -0.3)) continue; px(p[0], p[1] + 1 + dd, dd < 2 ? BL2 : BL1); if (dd > 0) px(p[0], p[1] + dd, BL1); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    ivStand(); hairBack(); if (P.fp < 0.5 || P.grab) { arm(-1); hand(-1); }
    neck(); torso(); head(); fringe(); cap(); hairFront();
    if (P.grab) { arm(-1); hand(-1); }
    else if (P.fp >= 0.5) arm(-1);
    syringe(); if (P.fp >= 0.5 && !P.grab) hand(-1); arm(1); hand(1); needles(); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const f = L.fluid, e = L.eye;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = f[0] * z + spr.ox; RIM.ry = f[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = f[0] * z + spr.ox; LIGHTS[0].y = f[1] * z + spr.oy; LIGHTS[0].r = (P.shat ? 0 : P.glow >= 3 ? 22 : P.glow >= 2 ? 16 : P.glow ? 11 : 0) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 16 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.52 : 0.4;          // 血池从下面映上来
    LIGHTS[2].x = e[0] * z + spr.ox; LIGHTS[2].y = e[1] * z + spr.oy; LIGHTS[2].r = (P.eyes >= 2 ? 6 : P.eyes ? 3 : 0) * z;
    const o = P.orb ? L.tip : add(add(L.hN, L.d, 20), L.up, 20);
    LIGHTS[3].x = o[0] * z + spr.ox; LIGHTS[3].y = o[1] * z + spr.oy; LIGHTS[3].r = (P.orb ? 8 + P.orb * 3 : P.fan ? 8 + P.fan * 3 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：把针筒竖到脸边端详、歪着头，口罩戴着，眼睛、十字、药水全亮
    const hot = HOT; HOT = 0; poseAt(IDLE, 0, 0); pose(K.idle, K.inspect, 0.9); P.tilt = 0.16; P.hd = -0.04; P.eyes = 2; P.glow = 3; P.sp = 0.62; P.by = 0; P.breath = 0; P.drip = 2; P.sway = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = H.at(6, -75); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 30 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连护士帽和口罩）

  // ───── 特效（舞台坐标；游戏里只画身边的，扎到部队身上的针由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, dpT = 0;
  const needleFly = (p, vx, vy, life) => { for (let k = 0; k < 5; k++) spawnX(K_PHYS, sx(p[0]) - k * Math.sign(vx) * 1.5, sy(p[1]) - k * vy / Math.max(1, Math.abs(vx)) * 1.5, vx, vy, life, k === 0 ? FXI.blood : FXI.steel, { g: 40 }); };
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'needle') { const t = L.tip; ring(sx(t[0]), sy(t[1]), 0, FXI.blood); fx.beam(sx(t[0]), sy(t[1]), sx(t[0] + 40), sy(t[1] + 2), 1, 'blood', 0.22, 1); fx.cross(sx(t[0]), sy(t[1]), 6, 'blood', 0.25, 1);
        burst(sx(t[0]), sy(t[1]), 14, 40, 120, 0.25, 0.5, FXI.blood, 10); for (let i = 0; i < 4; i++) needleFly(add(add(L.hN, L.d, 14 + i * 5), L.up, 12 + i * 6), 240 + i * 20, -40 - i * 25, 0.7);
        shake(0.35, 3); flash(0.08); sfx('boss', { k: 'nurseInject', w: 1 }); sfx('swing', { w: 1 }); }
      else if (MV === 'needleRain') { const t = L.tip; ring(sx(t[0]), sy(t[1]), 1, FXI.blood); ring(sx(t[0]), sy(t[1]), 0, FXI.steel); fx.beam(sx(t[0]), sy(t[1]), sx(t[0] + 16), sy(t[1] - 70), 2, 'blood', 0.3, 1);
        for (let i = 0; i < 14; i++) needleFly(t, 20 + Math.random() * 90, -260 - Math.random() * 120, 0.6 + Math.random() * 0.3);
        for (let i = 0; i < 26; i++) spawnX(K_PHYS, sx(t[0]), sy(t[1]), (Math.random() - 0.3) * 120, -120 - Math.random() * 200, 0.8 + Math.random() * 0.5, FXI.blood, { g: 360, floor: HY + 2 });
        shake(0.35, 3); flash(0.1); sfx('boss', { k: 'nurseRain', w: 1 }); }
      else if (MV === 'poke') { const x = sx(Math.min(L.tip[0], 78)), y = HY; fx.wave(x, y, 1, 36, 8, 'blood', 0.5, 2); fx.wave(x, y, -1, 28, 6, 'blood', 0.45, 2); fx.crack(x, y + 1, 18, 1, 'blood', 1.0);
        burst(x, y - 2, 22, 60, 170, 0.3, 0.7, FXI.blood, 50); for (let i = 0; i < 18; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 150, -60 - Math.random() * 170, 0.9 + Math.random() * 0.5, FXI.blood, { g: 340, floor: HY + 2 });
        ring(x, HY - 2, 1, FXI.blood); shake(0.35, 3); flash(0.06); sfx('boss', { k: 'nurseSplash', w: 1 }); sfx('boss', { k: 'slam', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, FXI.blood); ring(sx(2), sy(-34), 1, FXI.blood); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 34; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(m[0]), sy(m[1]), Math.cos(a) * (50 + Math.random() * 120), Math.sin(a) * (80 + Math.random() * 130), 0.8 + Math.random() * 0.5, FXI.blood, { g: 240, floor: HY + 6 }); }
        if (MV === 'p2') { const k = L.mask; burst(sx(k[0]), sy(k[1]), 16, 40, 110, 0.25, 0.5, FXI.blood, 20); }
        sfx('boss', { k: 'nurseScream', w: 1 }); sfx('impact', { pal: 'blood', w: 1 }); }
    }
    if (s === CHARGE && (MV === 'needle' || MV === 'needleRain')) sfx('boss', { k: 'nurseDraw', w: MV === 'needleRain' ? 1 : 0.8, dur: E.DUR[CHARGE] });
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'nurseHiss', w: 0.9 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'nurseGurgle', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function onTime(s, t) {
    if (s === IDLE && t === 0.56) sfx('boss', { k: 'nurseCrack', w: 0.6 });
    if (s === IDLE && t === 1.3) sfx('boss', { k: 'nurseFlick', w: 0.5 });
    if (s === IDLE && t === 1.66) { const p = L.tip; for (let i = 0; i < 5; i++) spawnX(K_PHYS, sx(p[0]), sy(p[1]), L.d[0] * (50 + i * 12), L.d[1] * (50 + i * 12) - 20, 0.6, FXI.blood, { g: 260, floor: HY + 2 }); sfx('boss', { k: 'nurseSquirt', w: 0.5 }); }
    if (s === MOVE) { for (let i = 0; i < 6; i++) spawnX(K_PHYS, sx(L.tip[0] - 10 + Math.random() * 10), sy(-1), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.6, FXI.blood, { g: 260, floor: HY + 3 }); sfx('boss', { k: 'nurseSplash', w: 0.35 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'nurseHiss', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { const p = L.tip; fx.beam(sx(p[0] - 14), sy(p[1]), sx(p[0] + 8), sy(p[1]), 1, 'steel', 0.15, 1); burst(sx(p[0]), sy(p[1]), 14, 50, 130, 0.25, 0.5, FXI.blood, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'nurseDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.7) { const b = add(L.back, L.d, 14); burst(sx(b[0]), sy(b[1]), 24, 60, 190, 0.3, 0.7, FXI.frost, 20); burst(sx(b[0]), sy(b[1]), 24, 40, 150, 0.4, 0.9, FXI.blood, 40); ring(sx(b[0]), sy(b[1]), 1, FXI.blood); flash(0.1); shake(0.3, 3); sfx('boss', { k: 'nurseShatter', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.6) { burst(sx(-50), HY - 2, 16, 40, 120, 0.3, 0.6, FXI.blood, 40); sfx('fall', { w: 1 }); sfx('boss', { k: 'nurseSplash', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-36 + Math.random() * 72), sy(-4 - Math.random() * 20), 0, -10 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.blood); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[0.56, 1.3, 1.66], [1 / 12, 5 / 12], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 0.7, INCOMING + 1.6, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt; dpT += dt;
    if (emT > (P.hot ? 0.09 : 0.2)) { emT = 0; spawn(K_RISE, sx(-30 + Math.random() * 60), sy(-1), 0, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, FXI.blood); }   // 血面冒的小泡
    if (dpT > (P.hot ? 0.25 : 0.5) && !P.shat && state !== DEATH) { dpT = 0; const p = L.tip; if (p[1] < -3) spawnX(K_PHYS, sx(p[0]), sy(p[1] + 1), 0, 10, 0.8, FXI.blood, { g: 300, floor: HY + 2 });   // 针尖滴血
      if (P.hot && P.mask) for (const e of [L.eyeF, L.eyeN]) spawnX(K_PHYS, sx(e[0]), sy(e[1] + 6), 0, 6, 0.7, FXI.blood, { g: 260, floor: HY + 2 }); }                             // 血泪
    if (state === CHARGE && MV === 'needle' && P.fan && Math.random() < 0.6) { const c = add(add(L.hN, L.d, 20), L.up, 20), a = Math.random() * 6.2832, r = 12 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.blood, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }
    if (state === CHARGE && MV === 'needleRain' && Math.random() < 0.6) { const c = L.tip, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.blood, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.35) { const p = L.tip; spawn(K_EMBER, sx(p[0]), sy(p[1] + 2), 0, 22, 0.4, FXI.blood); }
    if (state === CHARGE && MV === 'rise' && Math.random() < 0.5) spawnX(K_PHYS, sx(-20 + Math.random() * 50), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 70, 0.7, FXI.blood, { g: 260, floor: HY + 4 });
    if (state === IDLE && P.sq && Math.random() < 0.7) { const p = L.tip; spawnX(K_PHYS, sx(p[0]), sy(p[1]), L.d[0] * 60, L.d[1] * 60 - 10, 0.5, FXI.blood, { g: 260, floor: HY + 2 }); }
    if (state === CAST && MV === 'p2' && Math.random() < 0.5) { const m = L.mouth; spawnX(K_PHYS, sx(m[0]), sy(m[1]), 20 + Math.random() * 40, -20 - Math.random() * 40, 0.6, FXI.blood, { g: 260, floor: HY + 4 }); }
  }
  function fxReset() { emT = 0; dpT = 0; }
  function fxBack(f12) { const x0 = sx(-46), x1 = sx(46); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + (f12 >> 1)) % 3) === 0) E.put(x, HY + 1, FXR[FXI.blood][P.hot ? 2 : 3]); }   // 脚下一线血面
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'needle'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    nurseFlick: (s, t, w, p) => { for (const [dt, f] of [[0, 2300], [0.14, 2500]]) { s.ring(t + dt, f, 0.14, 0.03 + 0.04 * w, { pan: p, parts: [[1, 1], [1.52, 0.4], [2.7, 0.2]] }); s.nz(t + dt, 0.02, 'highpass', 5000, 0.7, 0.03 * w, { pan: p }); } },
    nurseSquirt: (s, t, w, p) => { s.nz(t, 0.2, 'bandpass', 3400, 2, 0.05 + 0.04 * w, { to: 1500, pan: p }); s.blip(t + 0.12, 900, 0.04 * w, { pan: p }); s.blip(t + 0.2, 700, 0.03 * w, { pan: p }); },
    nurseCrack: (s, t, w, p) => { s.crackle(t, 0.07, 2600, 0.12 * w, { pan: p }); s.crackle(t + 0.07, 0.05, 2000, 0.1 * w, { pan: p }); s.thud(t, 150, 70, 0.08, 0.07 * w, { pan: p }); },
    nurseDraw: (s, t, w, p) => { s.tone(t, 'square', 540, 0.5, 0.02 * w, { to: 380, lp: 1600, vib: [18, 40, 0.05], pan: p }); for (let i = 0; i < 6; i++) s.blip(t + 0.12 + i * 0.13, 260 + i * 55, 0.04 * w, { pan: p }); s.riser(t, t + 1.0, 400, 2400, 0.03 + 0.03 * w, { pan: p }); s.choir(t + 0.2, [68, 69], 1.0, 0.025 * w, { pan: p }); },
    nurseInject: (s, t, w, p) => { s.nz(t, 0.35, 'bandpass', 4200, 1.2, 0.09 * w, { to: 1800, pan: p }); s.whoosh(t, 0.3, 800, 3200, 0.08 * w, { pan: p }); s.ring(t, 1800, 0.25, 0.05, { pan: p }); s.thud(t, 180, 70, 0.15, 0.12 * w, { pan: p }); },
    nurseRain: (s, t, w, p) => { s.whoosh(t, 0.6, 400, 4200, 0.1 * w, { pan: p }); s.nz(t, 0.4, 'bandpass', 3800, 1.4, 0.06 * w, { to: 2000, pan: p }); for (let i = 0; i < 10; i++) s.ring(t + 0.2 + i * 0.05 + s.rnd(0, 0.03), s.rnd(2200, 4600), 0.15, 0.025, { pan: p, parts: [[1, 1], [1.5, 0.4]] }); s.thud(t, 200, 80, 0.2, 0.1 * w, { pan: p }); },
    nurseHiss: (s, t, w, p) => { s.nz(t, 0.6, 'bandpass', 2400, 0.8, 0.05 * w, { a: 0.15, pan: p }); s.nz(t, 0.6, 'lowpass', 600, 0.7, 0.03 * w, { a: 0.2, pan: p }); },
    nurseGurgle: (s, t, w, p) => { for (let i = 0; i < 9; i++) s.blip(t + i * 0.16 + s.rnd(0, 0.06), s.rnd(150, 320), 0.05 * w, { pan: p }); s.rumble(t, 1.6, 0.08 * w, { pan: p, f: 220 }); },
    nurseSplash: (s, t, w, p) => { s.nz(t, 0.25, 'bandpass', 900, 0.8, 0.07 * w, { to: 400, pan: p }); s.blip(t + 0.05, 420, 0.04 * w, { pan: p }); s.blip(t + 0.11, 300, 0.03 * w, { pan: p }); },
    nurseScream: (s, t, w, p) => { s.tone(t, 'sawtooth', 880, 1.3, 0.05 + 0.04 * w, { to: 620, vib: [7, 45, 0.1], lp: 2600, pan: p, rev: 0.5 }); s.tone(t, 'sawtooth', 1310, 1.1, 0.025, { to: 900, vib: [6.3, 60, 0.1], lp: 3000, pan: p, rev: 0.5 });
      s.choir(t, [69, 70], 1.4, 0.05 * w, { pan: p }); s.nz(t, 0.9, 'bandpass', 2800, 1.5, 0.05 * w, { a: 0.05, to: 1800, pan: p }); },
    nurseShatter: (s, t, w, p) => { for (let i = 0; i < 8; i++) s.ring(t + i * 0.025, s.rnd(2400, 5200), s.rnd(0.1, 0.35), 0.04, { pan: p, parts: [[1, 1], [1.41, 0.5], [2.3, 0.3]] }); s.nz(t, 0.3, 'highpass', 3500, 0.7, 0.1 * w, { pan: p }); s.thud(t, 120, 60, 0.1, 0.08 * w, { pan: p }); },
    nurseDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 720, 1.8, 0.06 + 0.03 * w, { to: 180, vib: [6, 70, 0.2], lp: 2000, pan: p, rev: 0.7 }); s.choir(t, [64, 65], 1.6, 0.04, { pan: p }); for (let i = 0; i < 5; i++) s.blip(t + 1.2 + i * 0.15, s.rnd(160, 280), 0.04 * w, { pan: p }); },
  };

  return {
    name: '护士长', HX, R_EL: FXI.blood, DUR, hero, P, GLOW_MATS: [BL1, BL2, BL3, BL4], HIT_POINT: [2, -36], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'blood', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['needle', 'needleRain', 'poke', 'rise', 'p2'], MOVE_NAMES: { needle: '扎针', needleRain: '针雨', poke: '重击', rise: '升起', p2: '第二阶段仪式（查房时间）' }, setMove,
    SHEET: [[IDLE, [0, 0.6, 1.4, 1.7, 2.05]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.35, 0.7, 1.0], 'needle'], [CAST, [0, 2 / 12], 'needle'], [RECOVER, [0.3], 'needle'],
      [CHARGE, [0.2, 0.7, 1.1, 1.35], 'needleRain'], [CAST, [0, 2 / 12], 'needleRain'], [RECOVER, [0.3], 'needleRain'],
      [CHARGE, [0.5, 1.0], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.8, 1.6, 2.1], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.2, 1.5, 1.9, 2.3, 2.7]]],
    SINK: 32, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
