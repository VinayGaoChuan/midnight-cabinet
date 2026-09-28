// 蒸汽巨像（最终首领，第五章「蒸汽铸造厂」的齿轮坑）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「工厂最后造出来的巨像，胸口是一座锅炉」（胸口锅炉、活塞拳、面甲）；装甲（被动）、活塞重拳（砸一片）、齿轮臂（扇形横扫）
// → 第二阶段 超压（装甲翻倍，隔一阵过热）。
// 设定卡 ——
//   剪影：从齿轮坑里升起的一台铁皮巨像上半身（原点 = 齿轮坑面），没有皮肉，全是铁和黄铜。整个胸膛就是一座桶形锅炉，
//         正中一扇圆形炉门：黄铜门框一圈铆钉，门上一排铁栅，栅缝里透出橙红的炉火（它身上最亮的光，识别点一）。
//         背后立着一只比身子还宽的大齿轮，慢慢转，齿尖从两肩和头顶外面露出来（识别点二：一个齿轮圈着一座炉子）。
//         头很小，扣在锅炉顶上：铆钉圆顶盔、黄铜眉檐下一道黑缝，缝里一排五盏灯眼，一盏亮灯来回扫（识别点三）；
//         下巴是一块带栅格的铁板，张嘴时往下掉，里面也是火。头顶一只黄铜汽笛（它的吼就是汽笛）。
//   手臂：黄铜圆肩甲（上面各一根排气管）、铁的上臂、黄铜肘球、活塞前臂（铁套筒里伸缩一根亮钢杆）、两瓣钳子手；
//         近侧手腕上套着一只黄铜齿轮（齿轮臂的那只），放招时张开变大、转成锯。胸口左上一只压力表，指针跟着憋压走。
//   主色：发蓝的深铁板（压暗）、黄铜、紫铜管；光源是炉火、灯眼、第二阶段烧红的板缝。
//   招式（setMove）：piston 活塞重拳 · gear 齿轮臂 · poke 重击 · rise 升起 · p2 第二阶段仪式（超压）；hot1 / hot0 第二阶段常亮。
//     活塞重拳：近侧手臂举到肩后、活塞杆整根缩进套筒，压力表爬进红区、肘上嘶嘶冒汽 → 活塞一下打满，一拳砸进齿轮坑（铁花、地裂、白汽）。
//     齿轮臂：近侧手臂甩到头后面，腕上的齿轮张开、越转越快、甩火星 → 贴着地面一个大横扫。
//     重击：钳子张到最大往后收，咔哒咔哒 → 往前一捅、钳口夹死。
//     升起：钳子扒着坑沿爬出来，灯眼一盏一盏亮起来 → 挺直、双臂张开、头顶汽笛长鸣、两根排气管喷汽。
//     第二阶段（超压）：双钳抱住锅炉，锅炉「咚、咚」两声闷响、压力表打到底 → 炉门崩开、白汽从全身喷出来，汽笛长鸣；
//     之后炉门一直开着、火舌往外舔，板缝烧红，背后的齿轮转得更快。
//     待机：压力表慢慢爬高 → 下巴一掉、肩上的阀「嗤」地放一口汽，头往后一扬；灯眼一直来回扫。
//     死亡：汽笛一路走调地惨叫、压力表乱转 → 灯眼一盏一盏灭掉、炉火熄成暗红 → 往前一栽，沉进齿轮坑。
PCD.define('B_colossus', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, MG = DRAMP.magma;

  // ───── 材质：铁压暗（发蓝），黄铜和紫铜是暖的，炉火最亮。色板有上限：只有紫铜是自己的色阶 ─────
  const R_COP = ['#0e0604', '#1f0d07', '#33160b', '#4a2110', '#622c14', '#7c3a19', '#96491f', '#b25c28', '#cc7436', '#e2944e', '#f4b878'];
  const IRON = defDeep('bladesteel', { depth: 14, dark: 4, amb: 0.06 }), IROND = defDeep('bladesteel', { depth: 6, dark: 5, amb: 0.06 });
  const PLATE = defDeep('bladesteel', { depth: 4, dark: 2, amb: 0.1 }), GEARM = defDeep('bladesteel', { depth: 3, dark: 5, amb: 0.1 });
  const STL = defDeep('bladesteel', { depth: 2, amb: 0.34 });
  const BRS = defDeep('brass', { depth: 5, dark: 1, amb: 0.12 }), BRSD = defDeep('brass', { depth: 4, dark: 3, amb: 0.1 });
  const COP = defDeep(R_COP, { depth: 3, dark: 1, amb: 0.14 }), COPD = defDeep(R_COP, { depth: 3, dark: 3, amb: 0.1 });
  const DIAL = defDeep('ivory', { depth: 2, amb: 0.45 });
  const MAG1 = defMat([MG[2], MG[3], MG[5], MG[6]], 1, 1), MAG2 = defMat([MG[3], MG[5], MG[7], MG[8]], 1, 1), MAG3 = defMat([MG[5], MG[7], MG[8], MG[9]], 1, 1), EMB = defMat([MG[0], MG[1], MG[2], MG[3]], 1, 1);
  const LAMP = defMat([MG[6], MG[7], MG[8], MG[9]], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.3, 0.45, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { piston: { 3: 1.3, 4: 0.45, 5: 0.7 }, gear: { 3: 1.4, 4: 0.45, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'piston', HOT = 0;   // HOT：第二阶段，炉门崩开着、板缝烧红
  const FIRE = [MG[9], MG[7], MG[5]], PIT = [MG[6], MG[5], MG[3]], LAMPL = [MG[9], MG[8], MG[6]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: FIRE, k: 1 }, { x: 0, y: 0, r: 56, ramp: PIT, k: 0.34 }, { x: 0, y: 0, r: 0, ramp: LAMPL, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: FIRE, k: 0.85 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.fire], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[MAG1] = RIM.skip[MAG2] = RIM.skip[MAG3] = RIM.skip[EMB] = RIM.skip[LAMP] = 1;

  // 姿势：身体升降 / 前倾、转头、下巴、两只钳子的落点、活塞伸出量、钳口张开、腕上齿轮、炉火 / 灯眼 / 炉门 / 压力表 / 汽笛
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'pist', 'pistF', 'claw', 'cog', 'cogA', 'gearA', 'glow', 'eyes', 'lamps', 'scan', 'door', 'gauge', 'whistle', 'steam', 'flash', 'dq', 'hot'];
  const K = {
    idle: { nx: 46, ny: -6, fx2: -44, fy2: -6, lean: 0, hd: 0, pist: 0.55, pistF: 0.55, claw: 0.35 },
    pBack: { nx: 22, ny: -80, fx2: -32, fy2: -6, lean: -0.2, hd: -0.16, pist: 0, pistF: 0.3, claw: 0 },        // 活塞重拳：拳举到肩后，活塞杆整根缩回
    pPunch: { nx: 74, ny: 3, fx2: -42, fy2: -6, lean: 0.38, hd: 0.26, pist: 1, pistF: 0.3, claw: 0 },
    gBack: { nx: -10, ny: -72, fx2: -44, fy2: -10, lean: -0.22, hd: -0.12, pist: 0.2, pistF: 0.35, claw: 0.5 },   // 齿轮臂：手臂甩到头后面
    gSweep: { nx: 82, ny: -16, fx2: -40, fy2: -4, lean: 0.3, hd: 0.14, pist: 1, pistF: 0.35, claw: 0.5 },
    pkBack: { nx: 18, ny: -36, fx2: -44, fy2: -6, lean: -0.1, hd: 0.04, pist: 0, pistF: 0.35, claw: 1 },       // 重击：钳子张到最大往后收
    pkJab: { nx: 78, ny: -28, fx2: -42, fy2: -4, lean: 0.3, hd: 0.14, pist: 1, pistF: 0.35, claw: 0 },
    atW: { nx: 26, ny: -42, fx2: -44, fy2: -6, lean: -0.08, hd: -0.04, pist: 0, pistF: 0.35, claw: 0 },        // 普攻：活塞短打
    atS: { nx: 74, ny: -32, fx2: -44, fy2: -6, lean: 0.24, hd: 0.1, pist: 1, pistF: 0.35, claw: 0 },
    hunch: { nx: 37, ny: -15, fx2: -22, fy2: -33, lean: 0.3, hd: 0.34, pist: 0.1, pistF: 0.1, claw: 0.9 },     // 超压：双钳抱住锅炉
    wide: { nx: 64, ny: -72, fx2: -62, fy2: -68, lean: -0.14, hd: -0.3, pist: 1, pistF: 1, claw: 1 },
    climbA: { nx: 48, ny: -20, fx2: -44, fy2: 0, lean: 0.3, hd: 0.3, pist: 0.7, pistF: 0.2, claw: 0.8 },
    climbB: { nx: 46, ny: 0, fx2: -46, fy2: -20, lean: 0.3, hd: 0.3, pist: 0.2, pistF: 0.7, claw: 0.8 },
    agony: { nx: 40, ny: -88, fx2: -40, fy2: -84, lean: -0.2, hd: -0.42, pist: 1, pistF: 1, claw: 1 },
    limp: { nx: 40, ny: 6, fx2: -32, fy2: 6, lean: 0.45, hd: 0.55, pist: 0, pistF: 0, claw: 0.2 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'pist', 'pistF', 'claw'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  const GP = Math.PI / 3;   // 背后大齿轮：18 齿、6 根辐条，转 60° 就回到原样
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.lamps = 5; P.cog = 0.35; P.hot = HOT; P.door = HOT; P.gauge = HOT ? 0.85 : 0.35; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.gearA = (f12 * (HOT ? 0.09 : 0.045)) % GP; P.cogA = (f12 * 0.12) % (Math.PI / 5);
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.glow = 1 + ((f12 >> 2) & 1); P.scan = [1, 2, 3, 4, 5, 4, 3, 2][(f12 >> 1) & 7];   // 灯眼来回扫
      const lp = tt % DUR[IDLE]; P.gauge = HOT ? 0.85 + ((f12 & 1) ? 0.04 : 0) : lp < 1.5 ? 0.3 + 0.35 * lp / 1.5 : 0.3;
      if (lp >= 1.5 && lp < 2.0) { P.hd = -0.1; P.lean = -0.03; P.jaw = lp < 1.75 ? 2 : 1; P.steam = 1; P.claw = 0.15; } };   // 待机个性：憋满了，掉下巴、肩阀放一口汽，头一扬
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f & 1); P.scan = 1 + (f12 % 5); P.gearA = (f12 * 0.12) % GP; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.atW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.atW, K.atW); P.glow = 2; P.steam = 1; }
      else if (tq < 0.42) { pose(K.atS, K.atS); P.jaw = 1; P.glow = 3; P.eyes = 2; }
      else pose(K.atS, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.25; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.steam = 1; P.nx -= 4; P.gauge = 0.7; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.25 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.eyes = (f12 & 1) ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.gearA = 0.2;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.whistle = 1; P.steam = 2; P.gauge = (f12 * 0.37) % 1; P.claw = (f12 & 1) ? 1 : 0.7; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 2 : 1; P.lamps = Math.max(0, 5 - Math.floor((d - 0.7) / 0.14)); P.eyes = 1; P.gauge = 1; P.steam = 1; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = 0; P.eyes = 0; P.lamps = 0; P.gauge = 0; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { piston: 0, gear: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'piston') {
      if (st === CHARGE) {
        const a = ease.out(clamp01(q / 0.5)); pose(K.idle, K.pBack, a); P.by = -Math.round(5 * a); P.gauge = 0.3 + 0.68 * q; P.glow = q < 0.35 ? 2 : 3; P.eyes = 2; P.scan = 3;
        if (q > 0.3) P.steam = 1; if (q > 0.55) { P.nx += tr; P.by += (f12 & 1); P.gauge += tr * 0.02; } P.jaw = q > 0.8 ? 1 : 0; P.gearA = (f12 * (0.06 + 0.1 * q)) % GP;
      } else if (st === CAST) { pose(K.pPunch, K.pPunch); P.by = 4; P.jaw = 2; P.glow = 3; P.eyes = 2; P.steam = 2; P.gauge = 0.3; }
      else { pose(K.pPunch, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); P.steam = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'gear') {
      if (st === CHARGE) {
        const a = ease.out(clamp01(q / 0.4)); pose(K.idle, K.gBack, a); P.by = -Math.round(4 * a); P.cog = 0.35 + 0.65 * clamp01(q / 0.45);
        P.cogA = (f12 * (0.25 + 0.5 * q)) % (Math.PI / 5); P.glow = q < 0.4 ? 2 : 3; P.eyes = 2; P.gauge = 0.3 + 0.5 * q; if (q > 0.5) { P.nx += tr; P.fy2 += (f12 & 1); }
        P.gearA = (f12 * (0.06 + 0.12 * q)) % GP;
      } else if (st === CAST) { pose(K.gSweep, K.gSweep); P.cog = 1; P.cogA = (f12 * 0.4) % (Math.PI / 5); P.jaw = 1; P.glow = 3; P.eyes = 2; P.by = 2; }
      else { pose(K.gSweep, K.idle, ease.inOut(clamp01(tq / 0.55))); P.cog = 1 - 0.65 * clamp01(tq / 0.55); P.cogA = (f12 * 0.2) % (Math.PI / 5); }
    } else if (MV === 'poke') {
      if (st === CHARGE) { const a = ease.out(clamp01(q / 0.5)); pose(K.idle, K.pkBack, a); P.by = -Math.round(3 * a); P.glow = 2; P.eyes = 2; if (q > 0.55) { P.claw = (f12 >> 1) & 1 ? 1 : 0.55; P.nx += tr; } P.jaw = q > 0.8 ? 1 : 0; }   // 钳子咔哒咔哒
      else if (st === CAST) { pose(K.pkJab, K.pkJab); P.by = 2; P.jaw = 2; P.glow = 3; P.eyes = 2; P.steam = 1; }
      else pose(K.pkJab, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.lamps = Math.min(5, Math.floor(q * 6.5)); P.eyes = q > 0.8 ? 2 : 1; P.gearA = (f12 * 0.12) % GP; P.gauge = 0.1 + 0.6 * q; }   // 灯眼一盏一盏亮起来
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.whistle = 1; P.steam = 2; P.gauge = 0.9; }
      else { pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6))); P.whistle = tq < 0.3 ? 1 : 0; }
    } else {   // p2 超压：抱住锅炉 → 咚、咚两声、压力表打到底 → 炉门崩开、全身喷汽、汽笛长鸣
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.gauge = 0.6 + 0.4 * clamp01(tq / 0.6) + (hb ? 0.03 : 0); P.door = hb ? 0.12 : HOT; P.steam = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.door = clamp01(tq / (2 / 12)); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.whistle = 1; P.steam = 2; P.gauge = 1; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.door = 1; P.whistle = tq < 0.8 ? 1 : 0; P.steam = hold ? 1 : 0; P.gauge = 0.9; P.gearA = (f12 * 0.09) % GP; }
    }
  }

  // ───── 几何（本地坐标：原点 = 齿轮坑面，面朝右，y 向上为负）─────
  const L = {};
  const SHN = [30, -46], SHF = [-30, -46], NECK = [4, -57], DOOR = [2, -27], GAUGE = [-21, -37], GC = [-2, -50];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.55 - P.lean * 0.5); }
  const fore = (p) => 16 + 5 + p * 12;   // 前臂：套筒 13 + 活塞杆 5～17 + 手腕 3
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(DOOR[0], DOOR[1]); L.gauge = B.at(GAUGE[0], GAUGE[1]);
    L.ventN = B.at(39, -68); L.ventF = B.at(-39, -68); L.gear = B.at(GC[0], GC[1]);
    headXf(); L.eye = B.at(6, -67); L.mouth = B.at(5, -58 + P.jaw * 1.5); L.whistle = B.at(4, -87);
    const hn = [P.nx, P.ny + P.by], hf = [P.fx2, P.fy2 + P.by], lN = fore(P.pist), lF = fore(P.pistF);
    L.elN = B.ik(L.shN, hn, 23, lN, -1); L.elF = B.ik(L.shF, hf, 23, lF, 1);
    const reach = (el, h, l) => { const dx = h[0] - el[0], dy = h[1] - el[1], d = Math.hypot(dx, dy) || 1; return [el[0] + dx / d * l, el[1] + dy / d * l]; };
    L.hN = reach(L.elN, hn, lN); L.hF = reach(L.elF, hf, lF);
    const cogOn = MV === 'gear' && P.cog > 0.5 && (P.st === CHARGE || P.st === CAST);
    P.fcx = cogOn ? L.hN[0] : L.core[0]; P.fcy = cogOn ? L.hN[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  // 齿轮：齿（梯形）+ 轮圈 + 辐条 + 轮毂；w = true 时坐标已是精灵本地（手上的），否则跟着身体变换
  function gearShape(cx, cy, r, n, a, m, rimW, spokes, hub, w) {
    const poly = w ? polyW : (pts, mm, t) => B.poly(E, pts, mm, t), cap = w ? capW : (x0, y0, x1, y1, r0, r1, mm, t) => B.cap(E, x0, y0, x1, y1, r0, r1, mm, t);
    const tl = Math.max(2, r * 0.13 + 1), w0 = r * Math.PI / n * 0.56, w1 = w0 * 0.62;
    for (let i = 0; i < n; i++) { const t = a + i * 2 * Math.PI / n, c = Math.cos(t), s = Math.sin(t), r0 = r - 1, r1 = r + tl;
      poly([[cx + c * r0 + s * w0, cy + s * r0 - c * w0], [cx + c * r1 + s * w1, cy + s * r1 - c * w1], [cx + c * r1 - s * w1, cy + s * r1 + c * w1], [cx + c * r0 - s * w0, cy + s * r0 + c * w0]], m); }
    if (!rimW) { if (w) dot(cx, cy, r, m); else B.ell(E, cx, cy, r, r, 0, m); return; }
    const rr = r - rimW / 2, N = Math.ceil(r * 1.3); for (let k = 0; k < N; k++) { const a0 = k / N * 2 * Math.PI, a1 = (k + 1) / N * 2 * Math.PI; cap(cx + Math.cos(a0) * rr, cy + Math.sin(a0) * rr, cx + Math.cos(a1) * rr, cy + Math.sin(a1) * rr, rimW / 2, rimW / 2, m); }
    for (let i = 0; i < spokes; i++) { const t = a + (i + 0.5) * 2 * Math.PI / spokes; cap(cx + Math.cos(t) * hub, cy + Math.sin(t) * hub, cx + Math.cos(t) * (rr - 1), cy + Math.sin(t) * (rr - 1), 2.2, 1.6, m); }
    if (w) dot(cx, cy, hub, m); else B.ell(E, cx, cy, hub, hub, 0, m);
  }
  function backGear() {   // 背后的大齿轮：从两肩和头顶外面露出一圈齿
    part(); torsoXf(); gearShape(GC[0], GC[1], 33, 18, P.gearA, GEARM, 6, 6, 7);
    for (let i = 0; i < 18; i++) { const t = P.gearA + i * 2 * Math.PI / 18; B.px(E, GC[0] + Math.cos(t) * 36, GC[1] + Math.sin(t) * 36, GEARM, 7); }   // 齿尖的高光
    for (let i = 0; i < 12; i++) { const t = P.gearA + i * Math.PI / 6 + 0.26; B.px(E, GC[0] + Math.cos(t) * 30, GC[1] + Math.sin(t) * 30, GEARM, 8); }   // 轮圈上的铆钉
  }
  function pauldron(side) {   // 黄铜圆肩甲 + 一根往外斜的排气管
    const far = side < 0, c = far ? [-31, -50] : [31, -50], m = far ? BRSD : BRS, cm = far ? COPD : COP;
    part(); torsoXf(); B.cap(E, c[0] + side * 3, c[1] - 6, c[0] + side * 8, c[1] - 17, 2.6, 2.4, cm); B.ln(E, c[0] + side * 3 - 1, c[1] - 7, c[0] + side * 8 - 1, c[1] - 16, cm, 8);
    part(); torsoXf(); B.ell(E, c[0] + side * 8, c[1] - 18, 3.8, 2, side * -0.4, m); B.ln(E, c[0] + side * 8 - 2, c[1] - 18, c[0] + side * 8 + 2, c[1] - 19, m, 10);   // 喇叭口
    part(); torsoXf(); B.ell(E, c[0], c[1], 11.5, 9, side * 0.2, m);
    B.ln(E, c[0] - 10, c[1] + 5, c[0] + 10, c[1] + 5, m, 3); B.ln(E, c[0] - 8, c[1] - 5, c[0] + 4, c[1] - 7, m, 8); B.ln(E, c[0] - 9, c[1] + 1, c[0] + 9, c[1] + 1, m, 3);
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.12 + i * 0.15), x = c[0] - Math.cos(a) * 9 * side, y = c[1] + 3 - Math.sin(a) * 6.5; B.px(E, x, y, m, 8); B.px(E, x, y + 1, m, 2); }
  }
  function arm(side) {   // 铁上臂 + 黄铜肘球 + 活塞前臂（套筒 + 亮钢杆）+ 钳子
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? IROND : IRON, bm = far ? BRSD : BRS, pm = far ? GEARM : PLATE;
    const ux = h[0] - el[0], uy = h[1] - el[1], ul = Math.hypot(ux, uy) || 1, dx = ux / ul, dy = uy / ul, nx = -dy, ny = dx;
    part(); capW(sh[0], sh[1], el[0], el[1], 5.8, 4.8, m); const u0 = [sh[0] + (el[0] - sh[0]) * 0.3, sh[1] + (el[1] - sh[1]) * 0.3]; dot(u0[0] - 1, u0[1] - 1, 2, m, 7);
    part(); const b0 = [sh[0] + (el[0] - sh[0]) * 0.68, sh[1] + (el[1] - sh[1]) * 0.68], b1 = [sh[0] + (el[0] - sh[0]) * 0.74, sh[1] + (el[1] - sh[1]) * 0.74]; capW(b0[0], b0[1], b1[0], b1[1], 5.4, 5.4, BRSD);   // 上臂的铜箍
    const s1 = [el[0] + dx * 13, el[1] + dy * 13], w0 = [h[0] - dx * 3, h[1] - dy * 3];
    part(); capW(s1[0], s1[1], w0[0], w0[1], 2.3, 2.3, STL); lnW(s1[0] + nx, s1[1] + ny, w0[0] + nx, w0[1] + ny, STL, 8);   // 活塞杆
    part(); capW(el[0] + dx * 2, el[1] + dy * 2, s1[0], s1[1], 5.4, 5, m); lnW(el[0] + dx * 3 - nx * 3, el[1] + dy * 3 - ny * 3, s1[0] - nx * 3, s1[1] - ny * 3, m, 7);
    for (const k of [5, 9]) px(el[0] + dx * k + nx * 3, el[1] + dy * k + ny * 3, m, 8);
    part(); capW(s1[0] - dx * 1.5, s1[1] - dy * 1.5, s1[0] + dx * 0.5, s1[1] + dy * 0.5, 6, 6, bm);   // 套筒口的铜环
    part(); dot(el[0], el[1], 4.4, m); dot(el[0], el[1], 1.6, bm); px(el[0] - 1, el[1] - 1, bm, 8);   // 肘关节：铁球 + 黄铜轴
    if (!far) { const k = clamp01((P.cog - 0.35) / 0.65); cog([s1[0] + (w0[0] - s1[0]) * k + dx * 3, s1[1] + (w0[1] - s1[1]) * k + dy * 3], dx, dy); }
    part(); dot(w0[0], w0[1], 3.8, m);
    const o = 0.25 + P.claw * 0.6, a0 = Math.atan2(dy, dx);
    for (const k of [-1, 1]) { const a = a0 + k * o, mid = [w0[0] + Math.cos(a) * 7, w0[1] + Math.sin(a) * 7], b = a - k * 1.15, tip = [mid[0] + Math.cos(b) * 5, mid[1] + Math.sin(b) * 5];
      part(); capW(w0[0], w0[1], mid[0], mid[1], 2.8, 2.2, pm); capW(mid[0], mid[1], tip[0], tip[1], 2.2, 0.8, pm); px(tip[0], tip[1], pm, 8); px(mid[0], mid[1], pm, 7); }
  }
  function cog(c, dx, dy) {   // 近侧手腕上的黄铜齿轮：平时小小一只，齿轮臂时张开变大、转成锯
    const r = 2.5 + P.cog * 8.5, n = P.cog > 0.6 ? 12 : 8;
    part(); gearShape(c[0] - dx * 3, c[1] - dy * 3, r, n, P.cogA, P.cog > 0.6 ? BRS : BRSD, 0, 0, 0, true);
    const cc = [c[0] - dx * 3, c[1] - dy * 3]; const cm = P.cog > 0.6 ? BRS : BRSD; dot(cc[0], cc[1], Math.max(1, r * 0.35), cm, 3); px(cc[0], cc[1], cm, 10);
    for (let i = 0; i < 4; i++) { const t = P.cogA + i * Math.PI / 2; lnW(cc[0] + Math.cos(t) * r * 0.4, cc[1] + Math.sin(t) * r * 0.4, cc[0] + Math.cos(t) * r * 0.85, cc[1] + Math.sin(t) * r * 0.85, cm, 3); }
    if (P.cog > 0.6 && P.st !== RECOVER) for (let i = 0; i < 12; i += 3) { const t = P.cogA + i * Math.PI / 6; px(cc[0] + Math.cos(t) * (r + 2), cc[1] + Math.sin(t) * (r + 2), MAG2); }   // 齿尖磨出的火
  }
  function pipes() {   // 紫铜管：脖子两边拱到肩上，远侧一根顺着锅炉往下走
    part(); torsoXf(); B.strand(E, [[-5, -55], [-14, -60], [-23, -59], [-29, -54]], 2.4, 2.4, COPD); B.strand(E, [[13, -55], [21, -60], [28, -56]], 2.4, 2.4, COP);
    B.ln(E, -14, -61, -22, -60, COPD, 8); B.ln(E, 14, -57, 21, -61, COP, 8);
    part(); torsoXf(); B.strand(E, [[-30, -40], [-34, -28], [-33, -10]], 2.6, 2.6, COPD); for (const y of [-31, -17]) B.ln(E, -37, y, -30, y, COPD, 8);
  }
  function boiler() {   // 胸口的桶形锅炉：铁板、竖缝和铆钉、两道黄铜箍
    part(); torsoXf();
    B.poly(E, [[-27, 5], [27, 5], [29, -6], [31, -20], [31, -34], [28, -44], [21, -52], [10, -56], [-10, -56], [-21, -52], [-28, -44], [-31, -34], [-31, -20], [-29, -6]], IRON);
    for (const x of [-25, 26]) { B.ln(E, x * 0.85, -52, x, -44, IRON, 3); B.ln(E, x, -44, x, 4, IRON, 3); for (let y = -40; y < 2; y += 5) { B.px(E, x + 2, y, IRON, 8); B.px(E, x + 2, y + 1, IRON, 2); } }
    B.ln(E, -12, -54, -8, -46, IRON, 3); B.ln(E, 14, -54, 11, -46, IRON, 3);   // 顶盖的板缝
    for (const [x, y] of [[-17, -51], [-6, -54], [6, -54], [17, -51]]) { B.px(E, x, y, IRON, 8); B.px(E, x, y + 1, IRON, 2); }
    B.ln(E, -31, -22, 31, -22, IRON, 3); for (let x = -28; x <= 28; x += 4) if (x < -15 || x > 19) { B.px(E, x, -24, IRON, 8); B.px(E, x, -23, IRON, 2); }   // 横缝和一排铆钉
    for (let x = -24; x <= 24; x += 6) { B.px(E, x, -2, IRON, 8); B.px(E, x, -1, IRON, 2); }
    B.ln(E, -12, -43, -6, -46, IRON, 2); B.ln(E, 14, -43, 8, -46, IRON, 2); B.ln(E, -4, -47, 8, -47, IRON, 2);   // 炉门上面熏黑的一圈
    B.ln(E, -29, -18, -26, -32, IRON, 7); B.ln(E, -25, -34, -19, -43, IRON, 7); B.ln(E, 29, -16, 29, -30, IRON, 2);   // 左上一道高光、右边压暗
    if (P.hot) { const g = P.glow >= 3 ? MAG2 : MAG1; for (const x of [-25, 26]) { B.ln(E, x, -40, x, -12, MAG1); for (let y = -38; y < -12; y += 9) B.px(E, x, y, g); } B.ln(E, -12, -54, -8, -46, MAG1); B.ln(E, 14, -54, 11, -46, MAG1); }   // 超压：板缝烧红
    part(); torsoXf(); B.ell(E, 25, -15, 4.6, 4.6, 0, BRSD); B.ell(E, 25, -15, 2.6, 2.6, 0, BRSD, 2); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; B.ln(E, 25, -15, 25 + Math.cos(a) * 4, -15 + Math.sin(a) * 4, BRSD, 7); } B.px(E, 25, -15, BRSD, 10);   // 放汽阀的手轮
    part(); torsoXf(); B.poly(E, [[-28, -43], [28, -43], [26, -48], [-26, -48]], BRS); for (let x = -24; x <= 24; x += 6) B.px(E, x, -45, BRS, 8); B.ln(E, -27, -43, 27, -43, BRS, 3);
    part(); torsoXf(); B.poly(E, [[-30, -6], [30, -6], [31, -11], [-31, -11]], BRS); for (let x = -27; x <= 27; x += 6) B.px(E, x, -8, BRS, 8); B.ln(E, -30, -6, 30, -6, BRS, 3);
  }
  function furnace() {   // 圆炉门：黄铜门框一圈铆钉、一排铁栅；第二阶段崩开，火舌往外舔
    const c = DOOR, g = P.glow, op = P.door, R = 15;
    part(); torsoXf(); B.ell(E, c[0], c[1], R + 1.5, R + 1.5, 0, BRS); B.ell(E, c[0] + 1, c[1] + 1, R - 0.5, R - 0.5, 0, BRS, 3);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI + 0.26; B.px(E, c[0] + Math.cos(a) * (R + 0.3), c[1] + Math.sin(a) * (R + 0.3), BRS, 8); }
    part(); torsoXf(); const f1 = g >= 3 ? MAG3 : g >= 2 ? MAG2 : g >= 1 ? MAG1 : EMB;
    B.ell(E, c[0], c[1], R - 2, R - 2, 0, g >= 1 ? MAG1 : EMB); B.ell(E, c[0], c[1] + 3, R - 5, R - 6.5, 0, g >= 2 ? MAG2 : g >= 1 ? MAG1 : EMB);
    if (g >= 1) { B.ell(E, c[0] - 0.5, c[1] + 6, R - 8, R - 11, 0, f1);
      for (const [x, h] of [[-7, 8], [-2, 13], [3, 10], [7, 6]]) B.poly(E, [[c[0] + x - 2.5, c[1] + 6], [c[0] + x + 2.5, c[1] + 6], [c[0] + x + 0.5, c[1] + 6 - h]], g >= 2 ? MAG2 : MAG1);   // 炉膛里的火苗
      if (g >= 2) for (const [x, h] of [[-2, 8], [3, 5]]) B.poly(E, [[c[0] + x - 1.5, c[1] + 6], [c[0] + x + 1.5, c[1] + 6], [c[0] + x, c[1] + 6 - h]], f1);
      for (let i = 0; i < 7; i++) B.px(E, c[0] - 9 + i * 3, c[1] + 10 + (i & 1), g >= 2 ? MAG3 : MAG2); }   // 炉底一排通红的煤
    if (op < 0.5) {   // 铁栅（关着 / 震着的门）
      part(); torsoXf(); const jx = op ? 1 : 0;
      for (const x of [-9, -4.5, 0, 4.5, 9]) { const hh = Math.sqrt(Math.max(0, (R - 1.5) * (R - 1.5) - x * x)); B.cap(E, c[0] + x + jx, c[1] - hh, c[0] + x + jx, c[1] + hh, 1.1, 1.1, PLATE); }
      B.cap(E, c[0] - R + 2 + jx, c[1] - 3, c[0] + R - 2 + jx, c[1] - 3, 1, 1, PLATE);
      part(); torsoXf(); B.cap(E, c[0] + R + 1, c[1] - 4, c[0] + R + 6, c[1] + 1, 1.5, 1.3, BRS); B.ln(E, c[0] + R + 1, c[1] - 5, c[0] + R + 5, c[1] - 2, BRS, 8);   // 门闩
    } else {          // 崩开的门：绕左边的铰链甩开，侧着立在门框外
      part(); torsoXf(); const hx = c[0] - R - 4; B.ell(E, hx, c[1], 3.4, R, 0, BRSD); B.ln(E, hx + 1, c[1] - R + 3, hx + 1, c[1] + R - 3, BRSD, 3); for (const y of [-9, 0, 9]) B.px(E, hx, c[1] + y, BRSD, 8);
      part(); torsoXf(); for (const [x, h] of [[-7, 8], [-2, 13], [4, 11], [9, 6]]) B.poly(E, [[c[0] + x - 3, c[1] - 9], [c[0] + x + 3, c[1] - 9], [c[0] + x + 1, c[1] - 9 - h], [c[0] + x - 0.5, c[1] - 10 - h * 0.6]], MAG2);   // 火舌从门口舔出来
      for (const [x, h] of [[-2, 8], [4, 6]]) B.poly(E, [[c[0] + x - 1.5, c[1] - 9], [c[0] + x + 1.5, c[1] - 9], [c[0] + x + 0.5, c[1] - 9 - h]], MAG3);
    }
    for (const y of [-8, 8]) { part(); torsoXf(); B.poly(E, [[c[0] - R - 4, c[1] + y - 2], [c[0] - R + 1, c[1] + y - 2], [c[0] - R + 1, c[1] + y + 2], [c[0] - R - 4, c[1] + y + 2]], BRSD); }   // 铰链
  }
  function gauge() {   // 压力表：指针跟着憋压爬，最后一段是红区
    const c = GAUGE; part(); torsoXf(); B.cap(E, c[0] + 2, c[1] - 5, c[0] + 4, c[1] - 9, 1.2, 1.2, COPD);
    part(); torsoXf(); B.ell(E, c[0], c[1], 5.6, 5.6, 0, BRS); B.px(E, c[0] - 3, c[1] - 4, BRS, 8);
    part(); torsoXf(); B.ell(E, c[0], c[1], 4, 4, 0, DIAL);
    for (let i = 0; i <= 6; i++) { const th = -2.36 + i * 0.785, red = i >= 5; B.px(E, c[0] + Math.sin(th) * 3.3, c[1] - Math.cos(th) * 3.3, red ? MAG1 : DIAL, red ? 0 : 2); }
    const th = -2.36 + clamp01(P.gauge) * 4.71, hi = P.gauge > 0.8; B.ln(E, c[0], c[1], c[0] + Math.sin(th) * 3.3, c[1] - Math.cos(th) * 3.3, hi ? MAG2 : DIAL, hi ? 0 : 10); B.px(E, c[0], c[1], DIAL, 10);
  }
  function head() {   // 小小的铆钉圆顶盔：黄铜眉檐、一道黑缝里一排五盏灯眼、带栅格的下巴、头顶一只汽笛
    part(); torsoXf(); B.ell(E, 4, -56, 10, 3.4, 0, BRSD); for (let x = -4; x <= 12; x += 4) B.px(E, x, -56, BRSD, 8);   // 脖子的铜圈
    const J = Math.round(P.jaw * 1.5);
    if (J) { part(); headXf(); B.poly(E, [[-2, -62], [13, -62], [13, -61 + J], [-2, -61 + J]], P.glow >= 3 ? MAG2 : MAG1); }   // 下巴掉下来，里面是火
    part(); headXf(); B.poly(E, [[-3, -62 + J], [14, -62 + J], [14, -59 + J], [12, -56 + J], [-1, -56 + J], [-3, -59 + J]], PLATE);
    for (const x of [0, 3, 6, 9, 12]) B.ln(E, x, -61 + J, x, -57 + J, PLATE, 3); B.ln(E, -2, -62 + J, 13, -62 + J, PLATE, 8);   // 下巴的栅格
    part(); headXf(); B.ell(E, 5, -69.5, 11.5, 10.5, 0, PLATE); B.poly(E, [[-6, -68], [16, -68], [16, -62], [-5, -62]], PLATE);
    B.ln(E, 5, -79, 5, -73, PLATE, 3); B.ln(E, -4, -76, 0, -78, PLATE, 7); B.ln(E, -6, -73, 16, -73, PLATE, 3); for (const [x, y] of [[-3, -76], [1, -78], [9, -78], [13, -76], [-1, -74], [11, -74], [-5, -64], [15, -64]]) B.px(E, x, y, PLATE, 8);
    B.poly(E, [[-6, -69], [17, -69], [17, -65], [-6, -65]], PLATE, 10);   // 灯缝
    for (let i = 0; i < 5; i++) { const x = -4 + i * 4.4, on = i < P.lamps && P.eyes > 0, hi = on && (P.eyes >= 2 || P.hot || P.scan === i + 1);
      if (!on) { B.px(E, x, -67, PLATE, 3); B.px(E, x + 1, -67, PLATE, 3); continue; }
      const top = hi ? LAMP : MAG2, bot = hi ? MAG3 : MAG1; B.px(E, x, -68, top); B.px(E, x + 1, -68, top); B.px(E, x, -67, bot); B.px(E, x + 1, -67, hi ? MAG3 : MAG1); if (hi) B.px(E, x + 2, -68, MAG2); }
    part(); headXf(); B.poly(E, [[-6, -72], [16, -72], [19, -70], [-6, -70]], BRS); B.ln(E, -5, -72, 16, -72, BRS, 8); for (const x of [-3, 4, 11]) B.px(E, x, -71, BRS, 3);   // 眉檐
    part(); headXf(); B.ell(E, -6, -64, 2.6, 2.6, 0, BRS); B.px(E, -6, -64, BRS, 10);   // 耳侧的螺栓
    part(); headXf(); B.cap(E, 4, -79, 4, -84, 2, 1.8, BRS); B.ln(E, 3, -80, 3, -83, BRS, 8);
    part(); headXf(); B.ell(E, 4, -85.5, 3.2, 1.7, 0, BRS); B.ln(E, 6, -82, 9, -83, BRS, 5); B.px(E, 9, -83, BRS, 8);   // 汽笛和拉杆
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    backGear(); pauldron(-1); arm(-1); pipes(); boiler(); furnace(); gauge(); head(); pauldron(1); arm(1);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const g = P.glow;
    RIM.rim = g >= 3 ? 2 : g >= 2 ? 1 : 0; RIM.rx = L.core[0] * z + spr.ox; RIM.ry = L.core[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.core[0] * z + spr.ox; LIGHTS[0].y = (L.core[1] + 2) * z + spr.oy; LIGHTS[0].r = (P.door > 0.5 ? 26 : g >= 3 ? 20 : g >= 2 ? 16 : g ? 12 : 0) * z;   // 炉火照亮栅、门框和四周的铁板
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 56 * z; LIGHTS[1].k = P.hot ? 0.46 : 0.34;                                  // 齿轮坑底的火光
    LIGHTS[2].x = L.eye[0] * z + spr.ox; LIGHTS[2].y = L.eye[1] * z + spr.oy; LIGHTS[2].r = (P.eyes >= 2 && P.lamps ? 10 : P.eyes && P.lamps ? 6 : 0) * z;
    const cogOn = P.cog > 0.6; LIGHTS[3].x = (cogOn ? L.hN[0] : L.mouth[0]) * z + spr.ox; LIGHTS[3].y = (cogOn ? L.hN[1] : L.mouth[1]) * z + spr.oy; LIGHTS[3].r = (cogOn && P.st !== RECOVER ? 10 : P.jaw >= 2 ? 7 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（灯眼头 + 汽笛 + 胸口炉门的上半）
  function portrait() {   // 立绘：正面挺直、双钳半张、炉火全亮、灯眼全亮、下巴微张冒火
    poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.28); P.hd = 0.06; P.jaw = 1; P.eyes = 2; P.lamps = 5; P.glow = 3; P.by = 0; P.cog = 0.55; P.gearA = 0.12; P.cogA = 0.2; P.gauge = 0.72; P.claw = 0.8;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); torsoXf(); const c = B.at(4, -57); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 34 * 2]; return PSPR;
  }

  // ───── 声音（mc-audio.js 的合成函数，参数同名同序）─────
  const VOICES = {
    colossusHiss: (s, t, w, p) => { s.nz(t, 0.7, 'highpass', 3600, 0.6, 0.04 + 0.05 * w, { pan: p, a: 0.02, hold: 0.3 }); s.nz(t, 0.5, 'bandpass', 1800, 1.5, 0.02 * w, { pan: p }); },   // 放一口汽
    colossusChuff: (s, t, w, p) => { s.thud(t, 110, 45, 0.18, 0.14 * w, { pan: p }); s.nz(t, 0.18, 'highpass', 2800, 0.7, 0.05 * w, { pan: p }); s.ring(t + 0.02, 640, 0.3, 0.04 * w, { pan: p, parts: [[1, 1], [2.4, 0.4]] }); },   // 活塞一顶
    colossusPiston: (s, t, w, p) => { s.thud(t, 80, 30, 0.45, 0.28 * w, { pan: p }); s.ring(t, 210, 1.2, 0.09 * w, { pan: p, rev: 0.4 }); s.nz(t, 0.8, 'lowpass', 700, 0.8, 0.12 * w, { src: 'brown', pan: p, hold: 0.2 }); s.nz(t + 0.03, 0.6, 'highpass', 3200, 0.6, 0.07 * w, { pan: p, hold: 0.2 }); s.crackle(t, 0.3, 2400, 0.06 * w, { pan: p }); },   // 活塞重拳砸地
    colossusBuild: (s, t, w, p) => { s.riser(t, t + 1.2, 180, 2200, 0.05 * w, { pan: p }); s.rumble(t, 1.3, 0.1 * w, { pan: p }); s.tone(t, 'sine', 48, 1.3, 0.06 * w, { to: 70, pan: p }); },   // 锅炉憋压
    colossusGear: (s, t, w, p) => { for (let k = 0; k < 14; k++) { const q = k / 14; s.ring(t + 1.3 * Math.sqrt(q), 900 + q * 700, 0.08, (0.02 + 0.03 * q) * w, { pan: p, parts: [[1, 1], [3.1, 0.4]] }); } s.riser(t, t + 1.3, 300, 2600, 0.04 * w, { pan: p }); s.tone(t, 'sawtooth', 60, 1.3, 0.03 * w, { to: 180, lp: 900, pan: p }); },   // 齿轮越转越快
    colossusSweep: (s, t, w, p) => { s.whoosh(t, 0.45, 400, 2600, 0.1 * w, { pan: p }); s.ring(t + 0.05, 330, 0.8, 0.07 * w, { pan: p }); s.crackle(t, 0.4, 3000, 0.07 * w, { pan: p }); },   // 齿轮锯横扫
    colossusClamp: (s, t, w, p) => { s.ring(t, 760, 0.35, 0.06 * w, { pan: p, parts: [[1, 1], [2.76, 0.5]] }); s.thud(t, 140, 70, 0.1, 0.1 * w, { pan: p }); },   // 钳口咔哒
    colossusClank: (s, t, w, p) => { s.ring(t, 420, 0.3, 0.04 * w, { pan: p }); s.thud(t, 100, 50, 0.12, 0.1 * w, { pan: p }); },   // 铁手扒地
    colossusKnock: (s, t, w, p) => { s.thud(t, 70, 32, 0.4, 0.3 * w, { pan: p }); s.ring(t, 150, 1.0, 0.07 * w, { pan: p, rev: 0.4 }); s.nz(t, 0.25, 'lowpass', 400, 0.8, 0.08 * w, { src: 'brown', pan: p }); },   // 锅炉里「咚」
    colossusWhistle: (s, t, w, p) => { s.tone(t, 'sawtooth', 233, 1.6, 0.05 * w, { to: 262, slide: 0.25, lp: 1500, pan: p, rev: 0.5, hold: 0.9, vib: [6, 20, 0.3] }); s.tone(t, 'square', 311, 1.6, 0.03 * w, { to: 349, slide: 0.25, lp: 1300, pan: p, rev: 0.5, hold: 0.9 }); s.tone(t, 'sawtooth', 117, 1.6, 0.05 * w, { to: 131, slide: 0.25, lp: 600, pan: p, hold: 0.9 }); s.nz(t, 1.6, 'bandpass', 2200, 1.5, 0.06 * w, { pan: p, hold: 0.9 }); s.rumble(t, 1.2, 0.1 * w, { pan: p }); },   // 汽笛：它的吼
    colossusDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 262, 2.4, 0.06, { to: 70, slide: 2.2, lp: 1200, pan: p, rev: 0.6, hold: 1.2 }); s.tone(t, 'square', 311, 2.4, 0.03, { to: 82, slide: 2.2, lp: 1000, pan: p, hold: 1.2 }); s.nz(t, 2.2, 'highpass', 3000, 0.6, 0.06, { pan: p, a: 0.1, hold: 1.0 }); for (let k = 0; k < 4; k++) s.ring(t + 0.5 + k * 0.35, 300 - k * 40, 0.6, 0.04 * w, { pan: p }); },   // 汽笛走调、漏汽、零件掉落
  };

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, smT = 0, lastT = 0, lastS = -1, vs = 0;
  function steamAt(c, n, up, spread) { for (let i = 0; i < n; i++) spawn(K_RISE, sx(c[0] + (Math.random() - 0.5) * (spread || 4)), sy(c[1] - 1), (Math.random() - 0.5) * 12, -(up || 20) - Math.random() * 16, 0.8 + Math.random() * 0.7, FXI.dust); }
  function puff(n) { vs ^= 1; steamAt(vs ? L.ventN : L.ventF, n); }
  function blowAll() { steamAt(L.ventN, 14, 40, 6); steamAt(L.ventF, 14, 40, 6); steamAt(L.whistle, 12, 50, 3); steamAt(L.mouth, 6, 20, 8); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'piston') slamFx();
      else if (MV === 'gear') { const h = L.hN; fx.slash(sx(L.shN[0]), sy(L.shN[1] + 6), 50, 0.9, 2.5, 'steel', 0.28, 3, 2); fx.slash(sx(L.shN[0]), sy(L.shN[1] + 6), 44, 1.0, 2.4, 'fire', 0.22, 2, 2);
        burst(sx(h[0]), sy(h[1]), 26, 70, 220, 0.25, 0.55, FXI.impact, 20); for (let i = 0; i < 16; i++) spawnX(K_PHYS, sx(h[0]), sy(h[1]), 80 + Math.random() * 200, -40 - Math.random() * 120, 0.7 + Math.random() * 0.4, FXI.impact, { g: 300, floor: HY + 2 });
        shake(0.3, 3); flash(0.07); sfx('boss', { k: 'colossusSweep', w: 1 }); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
      else if (MV === 'poke') { const h = L.hN; burst(sx(h[0] + 4), sy(h[1]), 20, 60, 180, 0.25, 0.5, FXI.impact, 20); ring(sx(h[0] + 4), sy(h[1]), 0, FXI.steel); fx.slash(sx(h[0] - 12), sy(h[1]), 22, 1.3, 1.85, 'steel', 0.2, 3, 2); steamAt(L.elN, 5, 16, 6);
        shake(0.25, 2); flash(0.05); sfx('boss', { k: 'colossusClamp', w: 1 }); sfx('boss', { k: 'colossusChuff', w: 0.8 }); sfx('hit', { mat: 'metal', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') {
        const c = L.core; ring(sx(L.whistle[0]), sy(L.whistle[1]), 1, FXI.dust); ring(sx(c[0]), sy(c[1]), 1, FXI.fire); flash(0.12); shake(0.4, 3); blowAll();
        for (let i = 0; i < (MV === 'p2' ? 36 : 18); i++) spawnX(K_PHYS, sx(c[0] + (Math.random() - 0.5) * 10), sy(c[1] - 4), 20 + Math.random() * 160, -60 - Math.random() * 160, 0.8 + Math.random() * 0.5, FXI.fire, { g: 240, floor: HY + 6 });   // 炉门里喷出来的火
        sfx('boss', { k: 'colossusWhistle', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); if (MV === 'p2') { sfx('boss', { k: 'colossusKnock', w: 1 }); sfx('boss', { k: 'colossusHiss', w: 1 }); }
      }
    }
    if (s === CHARGE) {
      if (MV === 'piston') { sfx('boss', { k: 'colossusBuild', w: 0.9 }); sfx('boss', { k: 'colossusHiss', w: 0.4 }); }
      else if (MV === 'gear') sfx('boss', { k: 'colossusGear', w: 1 });
      else if (MV === 'poke') sfx('boss', { k: 'colossusClamp', w: 0.5 });
      else if (MV === 'rise') { sfx('boss', { k: 'colossusBuild', w: 1 }); sfx('boss', { k: 'lavaRise', w: 0.5 }); }
    }
  }
  function slamFx() {   // 活塞一拳砸进齿轮坑：铁花、两道地浪、地裂、一团白汽
    const h = L.hN, x = sx(h[0]), y = HY;
    fx.wave(x, y, 1, 42, 9, 'steel', 0.5, 2); fx.wave(x, y, -1, 30, 7, 'steel', 0.45, 2); fx.crack(x, y, 22, 1, 'fire', 1.2); burst(x, y - 2, 30, 70, 220, 0.3, 0.7, FXI.impact, 50);
    for (let i = 0; i < 20; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 180, -60 - Math.random() * 180, 0.8 + Math.random() * 0.5, FXI.impact, { g: 320, floor: HY + 2 });
    steamAt([h[0], -4], 14, 30, 20); steamAt(L.elN, 8, 24, 6);
    ring(x, HY - 2, 1, FXI.steel); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'colossusPiston', w: 1 }); sfx('boss', { k: 'slam', w: 0.7 }); sfx('hit', { mat: 'metal', w: 1 });
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.5) { puff(6); steamAt(L.mouth, 4, 14, 6); sfx('boss', { k: 'colossusHiss', w: 0.35 }); }
    if (s === MOVE && (t === 1 / 12 || t === 5 / 12)) { const h = t < 0.2 ? L.hN : L.hF; burst(sx(h[0]), sy(0), 6, 20, 60, 0.2, 0.4, FXI.impact, 20); sfx('boss', { k: 'colossusClank', w: 0.5 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'colossusChuff', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 36, 0.6, 2.2, 'steel', 0.2, 3, 2); burst(sx(L.hN[0]), sy(L.hN[1]), 16, 50, 150, 0.25, 0.5, FXI.impact, 20); steamAt(L.elN, 4, 16, 4); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.05) { sfx('boss', { k: 'colossusDie', w: 1 }); blowAll(); }
    if (s === DEATH && t === INCOMING + 0.8) { const c = L.core; burst(sx(c[0]), sy(c[1]), 30, 50, 180, 0.3, 0.8, FXI.fire, 30); ring(sx(c[0]), sy(c[1]), 1, FXI.fire); shake(0.3, 3); sfx('boss', { k: 'colossusKnock', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.4) { for (let i = 0; i < 24; i++) spawnX(K_PHYS, sx(-26 + Math.random() * 60), sy(-10 - Math.random() * 30), (Math.random() - 0.5) * 120, -60 - Math.random() * 100, 0.9, FXI.steel, { g: 300, floor: HY + 3 }); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'colossusClank', w: 1 }); }   // 零件崩落
    if (s === DEATH && t === INCOMING + 2.1) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-30 + Math.random() * 60), sy(-4 - Math.random() * 30), 0, -14 - Math.random() * 20, 1 + Math.random() * 0.8, FXI.dust); sfx('boss', { k: 'sink', w: 1 }); sfx('boss', { k: 'colossusHiss', w: 0.6 }); }
  }
  const EVENTS = [[1.5], [1 / 12, 5 / 12], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 0.8, INCOMING + 1.4, INCOMING + 2.1], []];
  function stepFX(dt, state, stT) {
    const X = (x) => lastS === state && lastT < x && stT >= x; emT += dt; smT += dt;
    if (P.glow && emT > (P.door > 0.5 ? 0.04 : 0.14)) { emT = 0; const c = L.core; spawn(K_EMBER, sx(c[0] + (Math.random() - 0.5) * 12), sy(c[1] - (P.door > 0.5 ? 8 : 0) + (Math.random() - 0.5) * 8), (Math.random() - 0.3) * 14, -14 - Math.random() * 14, 0.5 + Math.random() * 0.5, FXI.fire); }   // 炉门往外冒火星
    if (P.dq < 0.5 && smT > (P.steam >= 2 ? 0.03 : P.steam ? 0.08 : P.hot ? 0.16 : 0.34)) { smT = 0; puff(1); }   // 两根排气管轮流冒汽
    if (P.whistle && Math.random() < 0.7) steamAt(L.whistle, 2, 50, 2);
    if (state === CHARGE && MV === 'piston' && P.steam && Math.random() < 0.5) steamAt(L.elN, 1, 14, 4);   // 肘上嘶嘶漏汽
    if (state === CHARGE && MV === 'piston' && P.glow >= 3 && Math.random() < 0.5) { const c = L.core, a = Math.random() * 6.2832, r = 14 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }
    if ((state === CHARGE || state === CAST) && MV === 'gear' && P.cog > 0.5 && Math.random() < 0.35 + 0.5 * P.cog) { const h = L.hN, a = Math.random() * 6.2832, r = 3.5 + P.cog * 7.5 + 2; spawnX(K_PHYS, sx(h[0] + Math.cos(a) * r), sy(h[1] + Math.sin(a) * r), -Math.sin(a) * 140, Math.cos(a) * 140 - 30, 0.4 + Math.random() * 0.3, FXI.impact, { g: 260, floor: HY + 2 }); }   // 齿轮锯甩火星
    if (state === CHARGE && MV === 'poke' && (X(0.7) || X(0.87) || X(1.03))) sfx('boss', { k: 'colossusClamp', w: 0.5 });
    if (state === CHARGE && MV === 'rise' && Math.random() < 0.5) spawnX(K_PHYS, sx(-26 + Math.random() * 52), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.5 ? FXI.steel : FXI.impact, { g: 260, floor: HY + 4 });
    if (state === CHARGE && MV === 'rise' && (X(0.5) || X(0.9) || X(1.3) || X(1.7))) sfx('boss', { k: 'colossusClank', w: 0.7 });
    if (state === CHARGE && MV === 'p2' && (X(0.02) || X(0.35))) { puff(10); ring(sx(L.core[0]), sy(L.core[1]), 0, FXI.fire); shake(0.2, 2); sfx('boss', { k: 'colossusKnock', w: 1 }); }
    if (P.hot && Math.random() < 0.08) spawnX(K_PHYS, sx(-30 + Math.random() * 60), sy(-1), (Math.random() - 0.5) * 30, -30 - Math.random() * 40, 0.5, FXI.impact, { g: 240, floor: HY + 3 });   // 第二阶段：齿轮坑里一直迸火星
    lastT = stT; lastS = state;
  }
  function fxReset() { emT = 0; smT = 0; lastT = 0; lastS = -1; }
  function fxBack(f12) { const x0 = sx(-46), x1 = sx(46), S = FXR[FXI.steel], F = FXR[FXI.fire]; for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const k = (x + f12) % 6; if (k < 2) E.put(x, HY + 1, S[3]); else if (k === 3) E.put(x, HY + 1, P.hot ? F[2] : F[4]); } }   // 坑面上一排转着的齿
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'piston'; return MVDUR[MV]; }

  return {
    name: '蒸汽巨像', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [MAG1, MAG2, MAG3, EMB, LAMP], HIT_POINT: [0, -34], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'armor', how: 'dissolve', pal: 'fire', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['piston', 'gear', 'poke', 'rise', 'p2'], MOVE_NAMES: { piston: '活塞重拳', gear: '齿轮臂', poke: '重击', rise: '升起', p2: '第二阶段仪式（超压）' }, setMove,
    SHEET: [[IDLE, [0, 0.5, 1.55, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.35, 0.7, 1.1], 'piston'], [CAST, [0, 2 / 12], 'piston'], [RECOVER, [0.3], 'piston'],
      [CHARGE, [0.2, 0.6, 1.1], 'gear'], [CAST, [0, 2 / 12], 'gear'], [RECOVER, [0.3], 'gear'],
      [CHARGE, [0.3, 0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.6, 1.2, 2.0], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [1 / 12, 3 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.3, 1.6, 2.0, 2.4, 2.7]]],
    SINK: 26, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
