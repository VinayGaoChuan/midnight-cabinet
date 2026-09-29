// 异形母巢（最终首领，第 7 章「星舰残骸」的孵化舱）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「异形母巢（长冠、背上的卵、甲壳）」；巢穴（紫色黏液、青柠色的光）；孵化（每 4 秒四只幼虫冲向后排）、刺穿（一条直线）→ 第二阶段 酸雨（幼虫死时溅酸）。
// 设定卡 ——
//   剪影：从紫色黏液里升起的佝偻上半身（原点 = 黏液面），脸朝右下；一颗往后上方拉得很长、弯成弧的光滑长冠头颅（识别点一），
//         没有眼睛的黑亮头壳，前端下面一张满是银色尖牙、往下滴酸的嘴，嘴里还藏着一张会弹出来的小嘴；
//         背上鼓起一整团卵囊，上面挤满十几颗发着青柠色光的卵（识别点二），几根带环纹的背管从卵堆里伸出来、管口冒绿雾；
//         一对细长的节肢手臂（三根长指 + 银爪、肘后骨刺），胸前还缩着一对小手；身后一条分节长尾，尾尖是一片骨刃。
//   主色：紫黑甲壳（自己的色阶）、黑曜石头壳（高光要亮，显得湿滑）、暗酒红的肉膜 / 黏液、橄榄绿的卵皮；光源是卵心、管口、嘴里的酸（青柠）。
//   招式（setMove）：hatch 孵化 · impale 刺穿 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 卵和甲壳上的酸脉常亮。
//     孵化：仰头嘶叫、双手撑地、背上的卵一颗颗亮到发白、卵囊颤 → 挺身，卵口的四瓣一齐张开，幼虫和黏液朝前喷出去。
//     刺穿：长尾从背后高高翘起、往后蓄、尾刃发光 → 越过肩膀笔直刺出去（一道青柠色的直线），嘴里的小嘴同时弹出。
//     重击：一只长爪往后拉 → 往前一抓。普攻：爪子收到胸前 → 横扫。
//     升起：扒着黏液爬出来 → 挺身仰头尖啸、卵全开。第二阶段：缩成一团护住卵 → 卵跳两下 → 仰天尖啸、卵全开、身上爬满酸脉。
//     死亡：尖啸 → 瘫软、卵一颗颗熄灭 → 化成绿色孢子沉回黏液。
PCD.define('B_xeno', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（暗 → 亮）：主体压暗，酸光才亮得出来。共用色阶：头壳 obsidian、肉膜 membrane、牙和骨刃 bladesteel；甲壳和卵皮是自己的 ─────
  const R_CHIT = ['#040308', '#0b0712', '#130b1d', '#1b1028', '#241533', '#2f1b41', '#3b2350', '#4a2c62', '#5c3876', '#744a8e', '#9468ac'];
  const R_EGG = ['#050804', '#0c1408', '#15200c', '#1f2e10', '#2a3e14', '#374f18', '#46621e', '#587624', '#6e8c2e', '#88a63c', '#aac458'];
  const AH = ['#0c2206', '#1e520a', '#3e8c10', '#74c21c', '#b0ec3a', '#e2ff8c', '#fbffe0'];
  const CHIT = defDeep(R_CHIT, { depth: 9, dark: 1, amb: 0.08 }), CHITD = defDeep(R_CHIT, { depth: 5, dark: 3, amb: 0.06 });
  const DOME = defDeep('obsidian', { depth: 12, dark: 2, amb: 0.04 });
  const EGG = defDeep(R_EGG, { depth: 6, dark: 1, amb: 0.1 }), GOO = defDeep(R_CHIT, { depth: 3, amb: 0.3 });
  const MEMB = defDeep('membrane', { depth: 7, amb: 0.1 }), MEMBD = defDeep('membrane', { depth: 6, dark: 3, amb: 0.06 });
  const FANG = defDeep('bladesteel', { depth: 3, amb: 0.3 });
  const AC1 = defMat(ramp([AH[0], AH[1], AH[2], AH[3]]), 1, 1), AC2 = defMat(ramp([AH[2], AH[3], AH[4], AH[5]]), 1, 1), AC3 = defMat(ramp([AH[3], AH[4], AH[5], AH[6]]), 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { hatch: { 3: 0.9, 4: 0.5, 5: 0.7 }, impale: { 3: 1.4, 4: 0.45, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'hatch', HOT = 0;   // HOT：第二阶段，卵常亮、甲壳上爬满酸脉
  const ACIDL = ramp([AH[5], AH[4], AH[3]]), GOOL = ramp([AH[4], AH[3], AH[2]]);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: ACIDL, k: 0.55 }, { x: 0, y: 0, r: 60, ramp: GOOL, k: 0.3 }, { x: 0, y: 0, r: 0, ramp: ACIDL, k: 1 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.poison], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[AC1] = RIM.skip[AC2] = RIM.skip[AC3] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、内嘴弹出（ij）、两只手、尾尖和尾巴的控制点、卵的亮度（egg）和张开（open）、胸前小手张开（ca）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'ij', 'nx', 'ny', 'fx2', 'fy2', 'tx', 'ty', 'tcx', 'tcy', 'egg', 'open', 'ca', 'glow', 'flash', 'dq', 'hot', 'drip', 'breath', 'dead', 'blade'];
  const K = {
    idle: { nx: 42, ny: -1, fx2: 27, fy2: -2, lean: 0, hd: 0, tx: -86, ty: -30, tcx: -64, tcy: 2 },
    climbA: { nx: 50, ny: -14, fx2: 26, fy2: 0, lean: 0.24, hd: 0.14, tx: -76, ty: -16, tcx: -52, tcy: 4 },
    climbB: { nx: 44, ny: 0, fx2: 34, fy2: -13, lean: 0.24, hd: 0.14, tx: -80, ty: -8, tcx: -54, tcy: 4 },
    swipeW: { nx: 8, ny: -56, fx2: 26, fy2: -2, lean: -0.12, hd: -0.14, tx: -90, ty: -44, tcx: -66, tcy: -4 },     // 普攻：爪收到胸前 → 横扫
    swipe: { nx: 68, ny: -22, fx2: 28, fy2: -1, lean: 0.26, hd: 0.12, tx: -80, ty: -20, tcx: -60, tcy: 4 },
    hatchC: { nx: 56, ny: 0, fx2: 12, fy2: 0, lean: 0.22, hd: -0.26, tx: -72, ty: -56, tcx: -74, tcy: -8 },     // 孵化：仰头、双手撑开、卵囊鼓起
    hatchX: { nx: 60, ny: -34, fx2: 10, fy2: -40, lean: -0.18, hd: -0.5, tx: -86, ty: -64, tcx: -74, tcy: -14 },
    impC1: { nx: 40, ny: -1, fx2: 24, fy2: -2, lean: -0.1, hd: -0.08, tx: -50, ty: -82, tcx: -92, tcy: -40 },    // 刺穿：尾巴高高翘起 → 往后蓄 → 越过肩膀刺出
    impC2: { nx: 38, ny: -2, fx2: 22, fy2: -4, lean: -0.2, hd: -0.12, tx: -72, ty: -80, tcx: -100, tcy: -24 },
    impX: { nx: 50, ny: -2, fx2: 30, fy2: -1, lean: 0.3, hd: 0.14, tx: 92, ty: -44, tcx: -34, tcy: -112 },
    pokeC: { nx: 4, ny: -52, fx2: 24, fy2: -2, lean: -0.14, hd: -0.06, tx: -88, ty: -40, tcx: -64, tcy: 0 },       // 重击：长爪往后拉 → 往前抓
    pokeX: { nx: 76, ny: -26, fx2: 30, fy2: -1, lean: 0.34, hd: 0.18, tx: -78, ty: -18, tcx: -58, tcy: 4 },
    hunch: { nx: 26, ny: -22, fx2: 12, fy2: -26, lean: 0.34, hd: 0.3, tx: -52, ty: -4, tcx: -62, tcy: 4 },        // 第二阶段：缩成一团护住卵
    wide: { nx: 64, ny: -52, fx2: 4, fy2: -58, lean: -0.18, hd: -0.62, tx: -60, ty: -82, tcx: -88, tcy: -30 },
    agony: { nx: 46, ny: -62, fx2: 14, fy2: -58, lean: -0.22, hd: -0.64, tx: -72, ty: -72, tcx: -86, tcy: -20 },
    limp: { nx: 36, ny: 8, fx2: 22, fy2: 8, lean: 0.46, hd: 0.36, tx: -74, ty: 8, tcx: -52, tcy: 6 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'tx', 'ty', 'tcx', 'tcy'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.egg = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; const sw = [0, 2, 4, 2, 0, -2][Math.floor(tt / 0.4) % 6]; P.ty += sw; P.tx += sw * 0.5; P.drip = f12 % 8;
      P.glow = 1 + ((f12 >> 2) & 1);
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.1) { const k = lp - 1.4; P.hd = -0.1; P.jaw = 1 + (k > 0.15 && k < 0.5 ? 1 : 0); P.ij = k < 0.15 ? 1 : k < 0.45 ? 3 : k < 0.55 ? 1 : 0; } };   // 待机个性：歪头、张嘴、内嘴弹出来又缩回去
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.drip = f12 % 8; P.jaw = f & 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { pose(K.idle, K.swipeW, ease.out(tq / 0.17)); P.jaw = 1; }
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.jaw = 2; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 3; P.ij = 2; P.glow = 3; }
      else { pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3))); P.jaw = 1; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.28; P.lean = -0.1; P.jaw = 3; P.egg = 2; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 4; P.ty -= 6; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.28 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 2 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.ij = 3; P.glow = 3; P.egg = 3 - (f12 & 1); P.flash = d < 1 / 12 ? 1 : 0; P.ca = 1; P.tx += (f12 & 1) ? 4 : -4; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 2; P.ij = d < 1.0 ? 2 : 0; P.glow = d < 1.1 ? 2 : 1; P.egg = d < 1.0 ? 2 : d < 1.3 ? 1 : 0; P.ca = 0.5; }
      else { pose(K.limp, K.limp); P.jaw = 2; P.glow = 0; P.egg = 0; P.dead = 1; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && st !== DEATH) { if (P.glow < 2) P.glow = 2; if (P.egg < 2) P.egg = 2; }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13 + f12 % 12 * 131;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { hatch: 0, impale: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'hatch') {   // 游戏只播最后 0.6 秒：前 0.3 秒是起势
      if (st === CHARGE) { pose(K.idle, K.hatchC, ease.out(clamp01(q / 0.34))); P.jaw = q > 0.3 ? 2 : 1; P.egg = q < 0.34 ? 1 : q < 0.6 ? 2 : 3; P.glow = q < 0.6 ? 2 : 3; P.by = q > 0.34 ? -((f12 & 1) + 1) : 0; if (q > 0.6) { P.tx += tr * 3; P.nx += tr; } P.ca = q > 0.6 ? 0.4 : 0; }
      else if (st === CAST) { pose(K.hatchC, K.hatchX, ease.out(clamp01(tq / 0.12))); P.egg = 3; P.open = 1; P.jaw = 3; P.ij = 1; P.glow = 3; P.ca = 1; }
      else { pose(K.hatchX, K.idle, ease.inOut(clamp01(tq / 0.6))); P.open = tq < 0.3 ? 1 : 0; P.egg = tq < 0.3 ? 3 : 2; P.jaw = tq < 0.3 ? 2 : 0; P.ca = 1 - clamp01(tq / 0.5); }
    } else if (MV === 'impale') {
      if (st === CHARGE) {
        if (q < 0.35) pose(K.idle, K.impC1, ease.out(q / 0.35));
        else if (q < 0.8) pose(K.impC1, K.impC2, ease.inOut((q - 0.35) / 0.45));
        else { pose(K.impC2, K.impC2); P.tx += tr * 2; P.ty += tr; P.jaw = 2; }
        P.blade = q < 0.35 ? 1 : q < 0.8 ? 2 : 3; P.glow = q < 0.5 ? 2 : 3; P.jaw = Math.max(P.jaw, q > 0.5 ? 1 : 0); P.by = -Math.round(4 * clamp01(q / 0.35));
      } else if (st === CAST) { pose(K.impX, K.impX); P.blade = 3; P.jaw = 3; P.ij = 3; P.glow = 3; P.by = 2; }
      else { pose(K.impX, K.idle, ease.inOut(clamp01(tq / 0.6))); P.blade = tq < 0.2 ? 2 : 0; P.jaw = tq < 0.25 ? 2 : 0; P.ij = tq < 0.15 ? 2 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeC, ease.out(clamp01(q / 0.5))); P.by = -Math.round(5 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += tr; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.jaw = q > 0.7 ? 2 : 1; }
      else if (st === CAST) { pose(K.pokeX, K.pokeX); P.by = 3; P.jaw = 3; P.ij = 2; P.glow = 3; }
      else { pose(K.pokeX, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(3 * (1 - clamp01(tq / 0.55))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f] + Math.round(14 * (1 - clamp01(q / 0.7))); P.glow = 1 + (f12 & 1); P.drip = f12 % 8; P.egg = q > 0.6 ? 2 : 1; P.jaw = f & 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.ij = 2; P.glow = 3; P.egg = 3; P.open = 1; P.ca = 1; }
      else { pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6))); P.open = tq < 0.25 ? 1 : 0; P.egg = 2; P.ca = 1 - clamp01(tq / 0.5); }
    } else {   // p2：缩成一团护住卵 → 卵跳两下 → 仰天尖啸、卵全开、酸脉爬满全身
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.egg = hb ? 3 : 1; P.glow = hb ? 3 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? -2 : 0; P.ca = 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.ij = 3; P.glow = 3; P.egg = 3; P.open = 1; P.hot = 1; P.ca = 1; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.ij = hold ? 2 : 0; P.glow = 3; P.egg = 3; P.open = hold ? 1 : 0; P.hot = 1; P.ca = hold ? 1 : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [16, -38], SHF = [-1, -41], NECK = [12, -44], TAILR = [-18, -6];
  const TUBES = [[[-6, -50], [-20, -64], [-36, -71]], [[-14, -40], [-40, -52], [-60, -52]], [[-18, -24], [-48, -30], [-68, -22]]];
  const EGGS = [[-53, -7, 6, 3], [-47, -21, 7, 1], [-41, -37, 7, 4], [-38, -4, 7, 0], [-31, -51, 6, 2], [-33, -25, 8, 5], [-20, -59, 6, 0], [-24, -10, 8, 2],
    [-22, -40, 8, 1], [-9, -54, 6, 3], [-12, -25, 7, 4], [-8, -40, 6, 5], [1, -56, 4, 1]];
  const bz = (a, c, b, q) => [(1 - q) * (1 - q) * a[0] + 2 * (1 - q) * q * c[0] + q * q * b[0], (1 - q) * (1 - q) * a[1] + 2 * (1 - q) * q * c[1] + q * q * b[1]];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.7 - P.lean * 0.6); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.sac = B.at(-26, -30); L.tr = B.at(TAILR[0], TAILR[1]); L.vents = TUBES.map((t) => B.at(t[2][0], t[2][1]));
    headXf(); const J = Math.round(P.jaw * 2); L.J = J; L.mouth = B.at(34, -46 + J); L.snout = B.at(46, -54); L.head = B.at(22, -64); L.ijp = B.at(36 + P.ij * 5, -48 + J * 0.5);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 24, 26, -1); L.elF = B.ik(L.shF, L.hF, 23, 25, -1);
    const c = [P.tcx, P.tcy + P.by], tp = [P.tx, P.ty + P.by]; L.tail = []; for (let i = 0; i <= 16; i++) L.tail.push(bz(L.tr, c, tp, i / 16)); L.tip = L.tail[16];
    const f = MV === 'hatch' ? L.sac : MV === 'impale' ? L.tip : MV === 'poke' ? L.hN : L.mouth; P.fcx = f[0]; P.fcy = f[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const nrm = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };

  // 分节长尾：从腰后面伸出来，节缝 + 背上的小刺，尾尖一片骨刃（刺穿蓄力时刃口发光）
  function tail() {
    const T = L.tail, n = T.length - 1, r = (q) => 6.2 - 4.8 * q;
    part(); for (let i = 1; i <= n; i++) capW(T[i - 1][0], T[i - 1][1], T[i][0], T[i][1], r((i - 1) / n), r(i / n), CHITD);
    for (let i = 1; i < n; i++) { const d = nrm(T[i], T[i + 1]); let no = [-d[1], d[0]]; if (no[1] > 0) no = [-no[0], -no[1]]; const rr = r(i / n);
      lnW(T[i][0] + no[0] * rr, T[i][1] + no[1] * rr, T[i][0] - no[0] * rr, T[i][1] - no[1] * rr, CHITD, 3);
      px(T[i][0] + no[0] * rr * 0.5 + d[0], T[i][1] + no[1] * rr * 0.5 + d[1], CHITD, 8);
      if (i % 3 === 1) capW(T[i][0] + no[0] * rr * 0.8, T[i][1] + no[1] * rr * 0.8, T[i][0] + no[0] * (rr + 4) - d[0] * 3, T[i][1] + no[1] * (rr + 4) - d[1] * 3, 1.2, 0.3, CHITD, 6); }
    const a = T[n - 1], b = T[n], d = nrm(a, b), no = [-d[1], d[0]];
    part(); polyW([[b[0] + no[0] * 3.6, b[1] + no[1] * 3.6], [b[0] + d[0] * 13, b[1] + d[1] * 13], [b[0] - no[0] * 3.6, b[1] - no[1] * 3.6], [b[0] - d[0] * 3, b[1] - d[1] * 3]], FANG);
    lnW(b[0] + no[0] * 3, b[1] + no[1] * 3, b[0] + d[0] * 12, b[1] + d[1] * 12, P.blade >= 2 ? AC3 : P.blade ? AC2 : FANG, P.blade ? 0 : 8);
    if (P.blade >= 2) lnW(b[0] - no[0] * 3, b[1] - no[1] * 3, b[0] + d[0] * 12, b[1] + d[1] * 12, AC2);
    L.bladeTip = [b[0] + d[0] * 13, b[1] + d[1] * 13];
  }
  // 节肢长臂：细长的上臂和前臂、肘后骨刺、三根长指带银爪
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? CHITD : CHIT;
    part(); capW(sh[0], sh[1], el[0], el[1], 4.8, 3.4, m); capW(el[0], el[1], h[0], h[1], 3.4, 2.4, m);
    const fd = nrm(el, h), ud = nrm(sh, el);
    for (const q of [0.2, 0.4, 0.6, 0.8]) { const p = [el[0] + (h[0] - el[0]) * q, el[1] + (h[1] - el[1]) * q], rr = 3.2 - q; lnW(p[0] - fd[1] * rr, p[1] + fd[0] * rr, p[0] + fd[1] * rr, p[1] - fd[0] * rr, m, 3); }   // 前臂的环节
    lnW(sh[0] + 1, sh[1] - 2, el[0], el[1] - 2, m, 8);
    capW(el[0], el[1], el[0] + ud[0] * 7 - fd[0] * 2, el[1] + ud[1] * 7 - fd[1] * 2 - 2, 2, 0.3, m, 6);   // 肘后骨刺
    part(); dot(h[0], h[1], 2.8, m); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]);
    for (let i = 0; i < 3; i++) { const a = dir + (i - 1) * 0.5, m1 = [h[0] + Math.cos(a) * 6, h[1] + Math.sin(a) * 6], a2 = a + 0.55, tip = [m1[0] + Math.cos(a2) * 6, m1[1] + Math.sin(a2) * 6];
      capW(h[0], h[1], m1[0], m1[1], 1.5, 1.1, m); capW(m1[0], m1[1], tip[0], tip[1], 1.1, 0.35, FANG, i === 0 ? 8 : 6); }
    { const a = dir - 1.4, tp = [h[0] + Math.cos(a) * 5, h[1] + Math.sin(a) * 5]; capW(h[0], h[1], tp[0], tp[1], 1.2, 0.4, FANG, 5); }
    if (h[1] > -4) { part(); B.ell(E, h[0], 1, 7, 2, 0, GOO); px(h[0] - 3, 0, AC1); }   // 手插进黏液里：一圈黏液
  }
  function chestArm(side) {   // 胸前缩着的一对小手，孵化 / 尖啸时张开
    part(); torsoXf(); const far = side < 0, m = far ? CHITD : CHIT, r = far ? [10, -30] : [19, -28], o = P.ca;
    const el = [r[0] + 3 + 5 * o, r[1] + 8 - 6 * o], hd = [r[0] + 11 + 7 * o, r[1] + 4 - 12 * o];
    B.cap(E, r[0], r[1], el[0], el[1], 2.3, 1.8, m); B.cap(E, el[0], el[1], hd[0], hd[1], 1.8, 1.3, m);
    for (const a of [-0.9, -0.2, 0.5]) B.cap(E, hd[0], hd[1], hd[0] + Math.cos(a - 0.8 * o) * 4, hd[1] + Math.sin(a - 0.8 * o) * 4, 0.9, 0.3, FANG, 7);
  }
  function sac() {   // 背上的卵囊：暗酒红的肉膜，上面的血管
    part(); torsoXf();
    B.ell(E, -24, -30, 24, 26, 0.35, MEMBD); B.ell(E, -34, -10, 21, 13, 0, MEMBD); B.ell(E, -12, -48, 12, 9, 0.3, MEMBD);
    for (const v of [[[-8, -52], [-20, -44], [-36, -40], [-48, -28]], [[-10, -36], [-24, -30], [-40, -16], [-52, -12]], [[-6, -20], [-22, -18], [-30, -4]]]) for (let i = 1; i < v.length; i++) B.ln(E, v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], P.hot ? AC1 : MEMBD, P.hot ? 0 : 3);
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-18, 4], [20, 4], [23, -8], [25, -20], [23, -31], [19, -39], [11, -47], [0, -50], [-9, -46], [-16, -32], [-20, -14]], CHIT); B.ell(E, 16, -29, 9, 11, 0.2, CHIT);
    for (const [y, l] of [[-37, 9], [-32, 12], [-27, 13], [-22, 12], [-17, 10]]) { B.ln(E, 23, y, 23 - l, y + 3, CHIT, 3); B.ln(E, 23, y - 1, 23 - l, y + 2, CHIT, 8); }   // 肋骨一样的甲壳环
    B.ln(E, 23, -39, 24, -14, CHIT, 3); for (const y of [-11, -6, -1]) B.ln(E, 2, y, 22, y - 1, CHIT, 3);                                                        // 胸骨、腹甲
    B.ln(E, -6, -42, -12, -6, CHIT, 3); B.ln(E, -4, -42, -10, -6, CHIT, 7); for (let y = -38; y < -6; y += 4) B.ln(E, -8 - (y + 42) * 0.12, y, -3 - (y + 42) * 0.12, y, CHIT, 3);   // 侧面的环纹管
    if (P.hot || P.glow >= 3) { const lit = P.glow >= 3 ? AC2 : AC1; for (const v of [[[4, -2], [9, -12], [7, -20], [13, -30], [11, -40]], [[14, -6], [18, -16]], [[-2, -30], [5, -36]]]) for (let i = 1; i < v.length; i++) { B.ln(E, v[i - 1][0], v[i - 1][1] + 1, v[i][0], v[i][1] + 1, CHIT, 10); B.ln(E, v[i - 1][0], v[i - 1][1], v[i][0], v[i][1], i === 1 ? lit : AC1); } }   // 酸脉
  }
  function tubes() {   // 从卵堆里伸出来的背管，管口冒绿光
    for (const t of TUBES) { part(); torsoXf(); B.strand(E, t, 3.4, 2.4, CHITD);
      for (let i = 1; i < t.length; i++) { const a = t[i - 1], b = t[i], d = nrm(a, b), l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 2; s < l; s += 3) { const p = [a[0] + d[0] * s, a[1] + d[1] * s]; B.ln(E, p[0] - d[1] * 3, p[1] + d[0] * 3, p[0] + d[1] * 3, p[1] - d[0] * 3, CHITD, 3); } }
      const e = t[2]; B.ell(E, e[0], e[1], 2.4, 2.4, 0, CHITD, 10); B.px(E, e[0], e[1], P.egg >= 2 || P.hot ? AC2 : AC1); }
  }
  function eggs() {   // 背上的卵：皮是橄榄绿的，顶上一个十字口；卵心的光一颗接一颗地跳，孵化时四瓣张开
    const f12 = P.drip, wave = P.st === IDLE || P.st === MOVE;
    for (let i = 0; i < EGGS.length; i++) { const [x, y, r, ph] = EGGS[i];
      part(); torsoXf();
      const lv = P.dead ? 0 : Math.min(3, P.egg + (wave && ((f12 + ph) % 6 === 0) ? 1 : 0)), op = P.open >= 1 || (P.hot && P.open === 0 && (ph === 1 || ph === 4)) ? (P.open >= 1 ? 2 : 1) : 0;
      B.ell(E, x, y, r * 0.78, r, (x + 26) * 0.006, EGG); B.ln(E, x - r * 0.5, y - r * 0.2, x - r * 0.3, y - r * 0.65, EGG, 8); B.ln(E, x + r * 0.5, y + r * 0.1, x + r * 0.2, y + r * 0.8, EGG, 3);
      if (lv >= 1) B.ell(E, x + 0.5, y + r * 0.25, r * 0.46, r * 0.55, 0, lv >= 2 ? AC2 : AC1);   // 透出来的光（下半颗更亮）
      if (lv >= 2) { B.ln(E, x, y + r * 0.6, x + 1, y - r * 0.05, lv >= 3 ? AC3 : AC2); B.ln(E, x + 1, y - r * 0.05, x + 2, y + r * 0.15, lv >= 3 ? AC3 : AC2); }   // 卵里蜷着的小东西（一道弯的亮影）
      if (op) { const k = op === 2 ? 4 : 2.5; for (const a of [-2.4, -1.9, -1.2, -0.7]) B.cap(E, x, y - r + 1, x + Math.cos(a) * k * 1.3, y - r + 1 + Math.sin(a) * k, 1.1, 0.4, EGG, 7);   // 四瓣张开
        B.ell(E, x, y - r + 2, 1.6, 1, 0, op === 2 ? AC3 : AC2); }
      else { B.ln(E, x - 2, y - r + 1, x + 2, y - r + 3, EGG, 3); B.ln(E, x + 2, y - r + 1, x - 2, y - r + 3, EGG, 3); }
    }
  }
  // 头：往后上方拉得很长的弧形长冠（黑亮、没有眼睛），前端下面银牙的嘴，张嘴里面还有一张小嘴
  const CREST = [[45, -55], [35, -60], [22, -66], [8, -72], [-6, -78], [-19, -83], [-30, -85], [-38, -84]], CR = [6.5, 9, 10.5, 10, 8.5, 6.5, 4.5, 2.4];
  function head() {
    const J = L.J;
    part(); headXf(); B.cap(E, 4, -38, 18, -50, 7.5, 6, CHIT); for (const k of [0.3, 0.55, 0.8]) B.ln(E, 4 + 14 * k - 5, -38 - 12 * k - 4, 4 + 14 * k + 4, -38 - 12 * k + 5, CHIT, 3);   // 脖子和环纹
    part(); headXf();   // 下颌（张嘴时往下掉）
    B.poly(E, [[18, -44], [43, -47 + J], [45, -45 + J], [40, -41 + J], [24, -40 + J * 0.5], [17, -41]], CHIT); B.ln(E, 22, -42 + J * 0.5, 40, -43 + J, CHIT, 7);
    if (J) { B.poly(E, [[23, -49], [44, -50], [43, -47 + J], [24, -46 + J * 0.6]], MEMB, 3); }   // 嘴里的肉
    for (let x = 28; x <= 42; x += 3) B.ln(E, x, -47 + J, x, -49 + J - (x % 2), FANG, 7);   // 下牙
    if (J >= 2) for (const x of [30, 36, 41]) B.ln(E, x, -49, x, -47 + J, AC1);                  // 牙之间拉着的酸涎
    if (P.ij) { const y = -48 + J * 0.5; B.cap(E, 24, y, 34 + P.ij * 5, y, 2, 1.6, MEMB); B.ell(E, 35 + P.ij * 5, y, 2.4, 2, 0, CHIT); for (const dy of [-1, 1]) B.ln(E, 36 + P.ij * 5, y + dy, 38 + P.ij * 5, y + dy, FANG, 8); }   // 内嘴弹出来
    part(); headXf();   // 长冠头壳
    for (let i = 1; i < CREST.length; i++) B.cap(E, CREST[i - 1][0], CREST[i - 1][1], CREST[i][0], CREST[i][1], CR[i - 1], CR[i], DOME);
    B.poly(E, [[18, -50], [26, -59], [44, -60], [48, -54], [46, -50], [24, -48]], DOME);
    for (let i = 2; i < CREST.length - 1; i++) { const a = CREST[i], b = CREST[i + 1]; B.ln(E, a[0], a[1] + CR[i] * 0.72, b[0], b[1] + CR[i + 1] * 0.72, DOME, 3); B.ln(E, a[0] + 1, a[1] - CR[i] * 0.55, b[0] + 1, b[1] - CR[i + 1] * 0.55, DOME, 8); }   // 冠下沿的阴影、冠背的一道长高光
    for (let i = 2; i < CREST.length - 1; i++) { const p = CREST[i], r = CR[i]; B.ln(E, p[0] - 2, p[1] + r * 0.2, p[0] + 1, p[1] + r * 0.75, DOME, 3); }   // 冠侧面一节节的棱
    B.ln(E, 20, -74, 34, -67, DOME, 9); B.px(E, 26, -72, DOME, 10);   // 头顶最湿亮的一块
    B.poly(E, [[30, -59], [44, -59], [47, -55], [44, -53], [30, -55]], DOME, 3); B.ln(E, 32, -58, 43, -58, DOME, 7);   // 没有眼睛的前脸：一片更暗的弧面
    B.px(E, 38, -63, DOME, 10); B.px(E, 22, -70, DOME, 10); B.px(E, 39, -63, P.egg >= 2 || P.hot ? AC2 : DOME, P.egg >= 2 || P.hot ? 0 : 9);   // 湿亮的高光点（映着卵的绿光）
    B.poly(E, [[22, -51], [46, -52], [46, -50], [24, -49]], CHIT, 3);   // 上唇
    for (let x = 25; x <= 44; x += 2) B.ln(E, x, -50, x, -48 + ((x === 29 || x === 37 || x === 43) ? 2 : 0), FANG, 7);   // 上牙一排，三根长獠牙
  }
  function drips() {   // 嘴角往下滴的酸、手上和卵囊底下拉下来的黏液
    part(); const k = P.drip;
    for (const [x, y, ph, g] of [[L.mouth[0] + 6, L.mouth[1] + 1, 0, 1], [L.mouth[0] - 2, L.mouth[1] + 1, 4, 1], [L.hN[0] - 6, L.hN[1] + 3, 2, 0], [L.sac[0] - 18, L.sac[1] + 28, 5, 0]]) {
      const d = (k + ph) % 8; if (y + d > 1) continue; if (d < 3) { lnW(x, y, x, y + d, g ? AC1 : GOO); px(x, y + d, g ? AC2 : GOO); } else px(x, y + d * 1.5, g ? AC1 : GOO); }
  }
  function goo() {   // 腰上一圈黏液
    part(); B.reset(); B.ell(E, -6, 2, 34, 4.5, 0, GOO); for (const x of [-30, -14, 4, 18]) B.ell(E, x, -1, 3, 2.4, 0, GOO, 7); for (const x of [-22, -4, 12]) B.px(E, x, 0, AC1);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    const tf = MV === 'impale' && (P.st === CAST || (P.st === RECOVER && P.blade)); if (!tf) tail();
    arm(-1); sac(); torso(); tubes(); eggs(); chestArm(-1); head(); chestArm(1); goo(); arm(1); if (tf) tail(); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.sac[0] * z + spr.ox; RIM.ry = L.sac[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.sac[0] * z + spr.ox; LIGHTS[0].y = L.sac[1] * z + spr.oy; LIGHTS[0].r = (P.dead ? 0 : [10, 16, 24, 32][P.egg | 0]) * z; LIGHTS[0].k = P.open ? 0.6 : 0.36;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 56 * z; LIGHTS[1].k = P.hot ? 0.4 : 0.28;                                                   // 黏液的绿光从下面照上来
    const bl = MV === 'impale' && P.blade && (P.st === CHARGE || P.st === CAST), c = bl ? L.tip : L.mouth;
    LIGHTS[2].x = c[0] * z + spr.ox; LIGHTS[2].y = c[1] * z + spr.oy; LIGHTS[2].r = (bl ? 6 + P.blade * 4 : P.jaw >= 2 ? 8 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：抬头张嘴、内嘴半吐、长冠整条露出来，卵全亮、一半张开，尾刃翘在身后
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.impC1, 0.35); P.hd = -0.12; P.lean = 0.02; P.jaw = 2; P.ij = 2; P.egg = 3; P.glow = 3; P.hot = 1; P.open = 0; P.ca = 0.6; P.by = 0; P.breath = 0; P.drip = 2; P.blade = 1;
    P.nx = 54; P.ny = -4; P.jaw = 3; P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(22, -62); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 34 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（嘴 + 长冠的前大半）

  // ───── 特效（舞台坐标；游戏里只画身边的，冲出去的幼虫和刺穿的直线由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0;
  function acidSpray(x, y, n, dir, sp) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + dir * (0.2 + Math.random() * 1.1); spawnX(K_PHYS, x, y, Math.cos(a) * (40 + Math.random() * sp), Math.sin(a) * (60 + Math.random() * sp), 0.7 + Math.random() * 0.5, Math.random() < 0.3 ? FXI.curse : FXI.poison, { g: 260, floor: HY + 3 }); } }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'hatch') { const c = L.sac; ring(sx(c[0]), sy(c[1]), 1, FXI.poison); burst(sx(c[0]), sy(c[1]), 24, 50, 150, 0.3, 0.7, FXI.poison, 30); acidSpray(sx(c[0]), sy(c[1] - 10), 30, 1, 150); fx.cloud(sx(c[0]), sy(c[1] - 6), 22, 'poison', 0.8, 0);
        shake(0.3, 3); flash(0.08); sfx('boss', { k: 'xenoHatch', w: 1 }); sfx('impact', { pal: 'poison', w: 0.8 }); }
      else if (MV === 'impale') { const t = L.bladeTip || L.tip; fx.beam(sx(t[0] - 40), sy(t[1]), sx(t[0] + 90), sy(t[1] + 4), 3, 'poison', 0.3, 2); fx.slash(sx(t[0] - 20), sy(t[1]), 30, 40, 120, 'poison', 0.22, 3, 2); burst(sx(t[0]), sy(t[1]), 20, 60, 180, 0.25, 0.5, FXI.poison, 20);
        ring(sx(t[0]), sy(t[1]), 1, FXI.poison); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'xenoStab', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'poke') { const h = L.hN; fx.slash(sx(h[0] - 14), sy(h[1] - 4), 26, 30, 150, 'poison', 0.22, 3, 2); burst(sx(h[0]), sy(h[1]), 18, 50, 150, 0.25, 0.5, FXI.poison, 20); ring(sx(h[0]), sy(h[1]), 1, FXI.poison); shake(0.25, 2); flash(0.06); sfx('swing', { kind: 'claw', w: 1 }); sfx('boss', { k: 'xenoHiss', w: 0.7 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth, c = L.sac; ring(sx(m[0]), sy(m[1]), 1, FXI.poison); ring(sx(c[0]), sy(c[1]), 1, FXI.curse); flash(0.12); shake(0.4, 3); acidSpray(sx(c[0]), sy(c[1] - 12), 44, 1, 170); for (const v of L.vents) fx.cloud(sx(v[0]), sy(v[1]), 12, 'poison', 0.9, 0);
        sfx('boss', { k: 'xenoScream', w: 1 }); sfx('impact', { pal: 'poison', w: 1 }); }
    }
    if (s === CHARGE && MV === 'hatch') sfx('boss', { k: 'xenoEggs', w: 0.9 });
    if (s === CHARGE && MV === 'impale') sfx('boss', { k: 'xenoRattle', w: 1 });
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'growl', w: 0.5 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'xenoGoo', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 34, 0.2, 2.6, 'poison', 0.22, 3, 2); burst(sx(L.hN[0]), sy(L.hN[1]), 16, 50, 140, 0.25, 0.5, FXI.poison, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'claw', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'xenoHiss', w: 0.5 });
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'xenoDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { const c = L.sac; burst(sx(c[0]), sy(c[1]), 40, 60, 200, 0.4, 0.9, FXI.poison, 30); ring(sx(c[0]), sy(c[1]), 1, FXI.poison); acidSpray(sx(c[0]), sy(c[1]), 24, 1, 120); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'xenoHatch', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 44; i++) spawn(K_RISE, sx(-50 + Math.random() * 90), sy(-6 - Math.random() * 56), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i & 1 ? FXI.poison : FXI.curse); sfx('boss', { k: 'sink', w: 1 }); sfx('boss', { k: 'xenoGoo', w: 0.7 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.06 : 0.13) && state !== DEATH) { emT = 0; const e = EGGS[(Math.random() * EGGS.length) | 0]; torsoXf(); const p = B.at(e[0], e[1] - e[2]); B.reset(); spawn(K_RISE, sx(p[0]), sy(p[1]), (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.7 + Math.random() * 0.6, FXI.poison); }   // 卵上一直往上飘的孢子
    if (Math.random() < (P.jaw >= 2 ? 0.35 : 0.06) && state !== DEATH) { const m = L.mouth; spawnX(K_PHYS, sx(m[0] + 2 + Math.random() * 8), sy(m[1] + 2), (Math.random() - 0.5) * 10, 10, 0.8, FXI.poison, { g: 220, floor: HY + 2 }); }   // 嘴里往下滴的酸
    if (state === CHARGE && MV === 'hatch' && Math.random() < 0.7) { const c = L.sac, a = Math.random() * 6.2832, r = 16 + Math.random() * 14; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.poison, { a, r, w: 7, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }
    if (state === CHARGE && MV === 'impale' && Math.random() < 0.6) { const c = L.tip, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.poison, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.4) { const h = L.hN; spawn(K_EMBER, sx(h[0] + (Math.random() - 0.5) * 10), sy(h[1] + 4), 0, 20, 0.4, FXI.poison); }
    if (((state === CHARGE && MV === 'rise') || state === MOVE) && Math.random() < 0.5) spawnX(K_PHYS, sx(-30 + Math.random() * 70), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.6 ? FXI.curse : FXI.poison, { g: 240, floor: HY + 4 });   // 爬出来时甩起的黏液
    if ((P.hot || (state === CHARGE && MV === 'p2')) && Math.random() < 0.15) { const v = L.vents[(Math.random() * 3) | 0]; spawn(K_RISE, sx(v[0]), sy(v[1]), 0, -18, 0.6, FXI.poison); }   // 背管冒的绿雾
  }
  function fxReset() { emT = 0; }
  function fxBack(f12) { const x0 = sx(-50), x1 = sx(44); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const k = (x + (f12 >> 1)) % 5; if (k === 0) E.put(x, HY + 1, FXR[FXI.poison][P.hot ? 2 : 3]); else if (k === 2) E.put(x, HY + 1, FXR[FXI.curse][3]); } }   // 脚下一线黏液，带青柠色的光点
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'hatch'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    xenoHiss: (s, t, w, p) => { s.nz(t, 0.55, 'highpass', 3600, 0.8, 0.1 + 0.06 * w, { pan: p, a: 0.04, hold: 0.25 }); s.nz(t, 0.4, 'bandpass', 6200, 3, 0.05 * w, { pan: p, a: 0.02 }); s.tone(t, 'sawtooth', 190, 0.35, 0.03 * w, { to: 150, lp: 700, pan: p }); },
    xenoScream: (s, t, w, p) => { s.tone(t, 'sawtooth', 640, 1.2, 0.06 + 0.04 * w, { to: 360, vib: [26, 110, 0.05], lp: 3200, pan: p, rev: 0.5 }); s.tone(t + 0.02, 'square', 950, 1.0, 0.025 * w, { to: 520, vib: [31, 80, 0.05], lp: 2600, pan: p, rev: 0.5 });
      s.nz(t, 1.1, 'bandpass', 4400, 2, 0.08 * w, { pan: p, hold: 0.5 }); s.thud(t, 96, 40, 0.5, 0.2 * w, { pan: p }); s.choir(t + 0.1, [40, 47], 1.2, 0.03 * w, { dark: 1, pan: p }); },
    xenoHatch: (s, t, w, p) => { s.nz(t, 0.3, 'lowpass', 700, 1.5, 0.16 * w, { src: 'brown', pan: p }); for (let i = 0; i < 5; i++) s.blip(t + i * 0.055, 260 + s.rnd(0, 260), 0.05 * w, { pan: p }); s.crackle(t, 0.4, 1800, 0.07 * w, { pan: p }); s.thud(t, 130, 50, 0.3, 0.18 * w, { pan: p }); },
    xenoEggs: (s, t, w, p) => { s.tone(t, 'sine', 55, 0.9, 0.12 * w, { vib: [6, 40, 0.1], pan: p }); s.nz(t, 0.9, 'lowpass', 400, 3, 0.07 * w, { src: 'brown', to: 1100, pan: p }); s.riser(t, t + 0.7, 220, 1400, 0.05 * w, { pan: p }); s.thud(t + 0.3, 70, 40, 0.2, 0.12 * w, { pan: p }); s.thud(t + 0.6, 76, 40, 0.2, 0.14 * w, { pan: p }); },
    xenoRattle: (s, t, w, p) => { for (let i = 0; i < 9; i++) s.nz(t + i * 0.12, 0.05, 'bandpass', 2600 + i * 180, 4, (0.03 + i * 0.006) * w, { pan: p }); s.riser(t, t + 1.2, 400, 3200, 0.05 * w, { pan: p }); s.nz(t + 0.8, 0.5, 'highpass', 4000, 0.8, 0.06 * w, { pan: p, a: 0.05 }); },
    xenoStab: (s, t, w, p) => { s.whoosh(t, 0.22, 700, 4200, 0.14 * w, { pan: p }); s.ring(t + 0.15, 1350, 0.35, 0.05 * w, { pan: p }); s.thud(t + 0.15, 170, 60, 0.22, 0.18 * w, { pan: p }); s.nz(t + 0.15, 0.3, 'highpass', 3000, 0.8, 0.06 * w, { pan: p }); },
    xenoGoo: (s, t, w, p) => { s.rumble(t, 1.2, 0.14 * w, { pan: p, f: 200 }); for (let i = 0; i < 7; i++) s.blip(t + 0.1 + i * 0.14 + s.rnd(0, 0.05), 150 + s.rnd(0, 180), 0.04 * w, { pan: p }); },
    xenoDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 560, 1.9, 0.07 + 0.03 * w, { to: 110, vib: [22, 90, 0.1], lp: 2400, pan: p, rev: 0.7 }); s.nz(t, 1.6, 'bandpass', 3800, 2, 0.07 * w, { pan: p, hold: 0.6, to: 900 }); s.choir(t + 0.2, [38, 45], 1.8, 0.04 * w, { dark: 1, pan: p });
      s.nz(t + 0.9, 0.8, 'lowpass', 500, 2, 0.1 * w, { src: 'brown', pan: p }); },
  };

  return {
    name: '异形母巢', HX, R_EL: FXI.poison, DUR, hero, P, GLOW_MATS: [AC1, AC2, AC3], HIT_POINT: [0, -34], EVENTS, MAX_H: 100, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'beast', how: 'dissolve', pal: 'poison', style: 'poison', w: 1, hover: 1 }, VOICES,
    MOVES: ['hatch', 'impale', 'poke', 'rise', 'p2'], MOVE_NAMES: { hatch: '孵化', impale: '刺穿', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.7]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0.3, 0.5, 0.75], 'hatch'], [CAST, [0, 2 / 12], 'hatch'], [RECOVER, [0.4], 'hatch'],
      [CHARGE, [0.3, 0.8, 1.3], 'impale'], [CAST, [0], 'impale'], [RECOVER, [0.3], 'impale'],
      [CHARGE, [0.6, 1.0], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 1.8], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 26, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
