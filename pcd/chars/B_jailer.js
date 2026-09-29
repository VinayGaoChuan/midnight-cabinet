// 狱卒（最终首领，第八章「地狱之门」的岩浆）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「戴着铁面罩的狱卒，锁链缠满了双臂」「铁面罩、角、锁链、流星锤」；门后的锁链一头拴着狱卒，另一头拴着所有进来的人；
// 锁链（把挨得最近的几个锁在一起）、镣铐砸地 → 第二阶段 门开了（锁链从天上砸在被锁的人身上）。
// 设定卡 ——
//   剪影：从岩浆里升起的公牛一样的上半身（原点 = 岩浆面）：头压得很低、往前探，身后隆起一座背峰和几撮粗鬃；
//         头就是一只比肩还宽的铁桶面罩（识别点）：平顶上三颗短钉、一圈带铆钉的眉箍，脸是一扇铁栅门，栅栏后面两只烧得通红的眼。
//         面罩下半扇栅门是活的，「门开了」时往下一翻，里面是一嘴烧红的牙。没有翼、没有大角（和深渊魔王的羊角蝠翼分开）。
//   身上：灰褐的厚皮、鞭痕；脖子一圈铁项圈，前面挂一把大挂锁（锁孔透红光），侧面挂一串铜钥匙；胸前斜挎一条铁链；
//         两条胳膊从肘到腕缠满锁链、手腕扣着铁镣：近手的镣铐拖着一截链子，末端一只带刺的流星锤；远手的链子一直垂进岩浆（拴在门上）。
//   主色：铁灰 + 铁锈 + 灰褐皮，全部压暗；光源是余烬橙红（眼睛、锁孔、嘴里、第二阶段烧红的链子）和脚下的岩浆。
//   招式（setMove）：chains 锁链 · shackle 镣铐砸地 · gateOpen 门开了 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 链子常红。
//     锁链：近手举过头，流星锤在头顶越抡越快、链子越抡越红 → 往前一甩，链子拉成一条直线（火花、锁扣声）。
//     镣铐砸地：两只镣铐在头顶并到一起、中间的链子绷紧 → 双拳砸进岩浆（岩浆浪、裂纹、链子乱响）。
//     门开了：从钥匙串里抽出一把烧红的大钥匙举在身前，一格一格拧三下，面罩的栅门跟着一格一格往下翻 → 双臂张开，锁链从岩浆里冲上天。
//     重击：流星锤甩到肩后 → 过头砸下来。普攻：缠链的前臂横扫、锤子跟着甩出去。
//     升起：拽着拴在岩浆里的链子一把一把爬出来 → 张开双臂，栅门翻开，吼。第二阶段：双手扣住面罩 → 两声心跳 → 扯开栅门、仰头吼，链子烧红。
//     死亡：抱住面罩哀嚎 → 瘫软 → 眼睛熄灭，拴在门上的链子把他拖回岩浆，化成火星。
PCD.define('B_jailer', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, MG = DRAMP.magma;

  // ───── 材质（11 级，暗 → 亮）：铁和皮都压暗，余烬的光才亮得出来 ─────
  // 色板有上限：钥匙用共用的 brass、栅栏里的黑用 obsidian、牙用 ivory、皮带用 hide；只有铁、灰褐皮、铁锈是自己的
  const R_IRON = ['#050507', '#0e0d10', '#18161a', '#221f23', '#2d292d', '#393438', '#474144', '#575053', '#6b6365', '#847b7b', '#a59c98'];
  const R_HIDE = ['#080605', '#120d0b', '#1b1411', '#251c17', '#30251e', '#3b2e25', '#48382d', '#564336', '#665041', '#7a604e', '#927460'];
  const R_RUST = ['#140604', '#2a0e06', '#441808', '#5e240c', '#7a3410', '#944616', '#ac5c20', '#c47834'];
  const MASK = defDeep(R_IRON, { depth: 10, dark: 1, amb: 0.1 }), IRON = defDeep(R_IRON, { depth: 5, dark: 1, amb: 0.1 }), IROND = defDeep(R_IRON, { depth: 4, dark: 3, amb: 0.08 });
  const CHAIN = defDeep(R_IRON, { depth: 2, amb: 0.18 }), CHAIND = defDeep(R_IRON, { depth: 2, dark: 2, amb: 0.12 });
  const SKIN = defDeep(R_HIDE, { depth: 9, dark: 1, amb: 0.1 }), SKIND = defDeep(R_HIDE, { depth: 6, dark: 3, amb: 0.08 });
  const RUST = defDeep(R_RUST, { depth: 3, amb: 0.12 }), LEATH = defDeep('hide', { depth: 4, dark: 3, amb: 0.08 }), KEYM = defDeep('brass', { depth: 3, dark: 2, amb: 0.1 });
  const OB = DRAMP.obsidian, VOIDM = defMat([OB[0], OB[0], OB[1], OB[2]], 1, 1), TOOTH = defDeep('ivory', { depth: 2, dark: 1, amb: 0.2 });
  const MAG1 = defMat([MG[2], MG[3], MG[5], MG[6]], 1, 1), MAG2 = defMat([MG[3], MG[5], MG[7], MG[8]], 1, 1), MAG3 = defMat([MG[5], MG[7], MG[8], MG[9]], 1, 1);
  const EMB = defMat([MG[1], MG[2], MG[3], MG[4]], 1, 1), HOTC = defMat([MG[1], MG[3], MG[4], MG[5]], 1, 1);   // 暗红的余烬、烧红的链节
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.3, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { chains: { 3: 1.3, 4: 0.5, 5: 0.7 }, shackle: { 3: 1.3, 4: 0.45, 5: 0.7 }, gateOpen: { 3: 1.4, 4: 0.5, 5: 0.8 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'chains', HOT = 0;   // HOT：第二阶段，链子和栅栏常红
  const EYE = [MG[8], MG[6], MG[4]], LAVA = [MG[8], MG[6], MG[4]], EMBR = [MG[7], MG[5], MG[3]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: EYE, k: 1 }, { x: 0, y: 0, r: 60, ramp: LAVA, k: 0.46 }, { x: 0, y: 0, r: 0, ramp: EMBR, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: EYE, k: 1 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.fire], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[MAG1] = RIM.skip[MAG2] = RIM.skip[MAG3] = RIM.skip[EMB] = RIM.skip[HOTC] = RIM.skip[VOIDM] = 1;

  // 姿势：身体升降 / 前倾、转头、栅门下翻（jaw）、两只手、流星锤（ca 屏幕角度 0 朝右 π/2 朝下、cl 链长、spin 头顶抡圈的相位）、
  //       钥匙（key 拿在手上、ka 拧的角度）、链子烧红（heat）、钥匙串晃（jing）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'ca', 'cl', 'spin', 'taut', 'lash', 'key', 'ka', 'heat', 'jing', 'fist', 'bind', 'glow', 'eyes', 'flash', 'dq', 'hot', 'drip', 'breath'];
  const K = {
    idle: { nx: 36, ny: -22, fx2: -30, fy2: -12, lean: 0.06, hd: 0.04, ca: 1.35, cl: 22 },
    tug: { nx: 30, ny: -38, fx2: -30, fy2: -14, lean: 0.02, hd: -0.08, ca: 0.95, cl: 22 },        // 待机：拽一下链子，钥匙串哗啦响
    spinUp: { nx: 40, ny: -70, fx2: -26, fy2: -22, lean: -0.14, hd: -0.12, ca: -1.57, cl: 20 },   // 锁链：流星锤在头顶抡圈
    spinBack: { nx: 30, ny: -64, fx2: -24, fy2: -26, lean: -0.24, hd: -0.18, ca: 3.3, cl: 22 },
    lash: { nx: 58, ny: -40, fx2: -30, fy2: -8, lean: 0.32, hd: 0.14, ca: -0.06, cl: 46 },
    overhead: { nx: 30, ny: -80, fx2: 10, fy2: -82, lean: -0.18, hd: -0.06, ca: 2.3, cl: 16 },     // 镣铐砸地：两只镣铐在头顶并到一起
    slam: { nx: 38, ny: -2, fx2: 20, fy2: -2, lean: 0.42, hd: 0.3, ca: 0.3, cl: 22 },
    keyUp: { nx: 42, ny: -56, fx2: -34, fy2: -34, lean: -0.06, hd: -0.08, ca: 1.6, cl: 20 },     // 门开了：钥匙举在身前拧
    gate: { nx: 52, ny: -70, fx2: -46, fy2: -64, lean: -0.2, hd: -0.3, ca: 1.3, cl: 22 },
    pokeW: { nx: 4, ny: -60, fx2: -30, fy2: -14, lean: -0.16, hd: -0.06, ca: 3.9, cl: 22 },       // 重击：锤子甩到肩后 → 过头砸下
    poke: { nx: 54, ny: -30, fx2: -30, fy2: -10, lean: 0.34, hd: 0.2, ca: 0.45, cl: 30 },
    swipeW: { nx: 6, ny: -46, fx2: -30, fy2: -12, lean: -0.08, hd: -0.04, ca: 2.8, cl: 22 },      // 普攻：缠链的前臂横扫
    swipe: { nx: 52, ny: -26, fx2: -30, fy2: -12, lean: 0.24, hd: 0.1, ca: 0.1, cl: 26 },
    grip: { nx: 28, ny: -56, fx2: 2, fy2: -62, lean: 0.28, hd: 0.3, ca: 1.6, cl: 22 },           // 第二阶段：双手扣住面罩
    wide: { nx: 54, ny: -60, fx2: -46, fy2: -58, lean: -0.18, hd: -0.34, ca: 1.1, cl: 22 },
    climbA: { nx: 38, ny: -30, fx2: -26, fy2: -2, lean: 0.28, hd: 0.24, ca: 1.6, cl: 22 },
    climbB: { nx: 36, ny: -4, fx2: -28, fy2: -30, lean: 0.28, hd: 0.24, ca: 1.6, cl: 22 },
    agony: { nx: 26, ny: -62, fx2: 0, fy2: -66, lean: -0.2, hd: -0.4, ca: 1.5, cl: 22 },
    limp: { nx: 32, ny: 4, fx2: -26, fy2: 4, lean: 0.48, hd: 0.5, ca: 1.6, cl: 22 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ca', 'cl'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.heat = HOT; P.mx = 0; P.flip = 0; }
  const shiver = (f12) => { P.nx += (f12 & 1) ? 1 : -1; P.by += (f12 & 1); };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.ca = 1.35 + [0, 0.06, 0.12, 0.06, 0, -0.06][Math.floor(tt / 0.4) % 6];
      P.glow = 1 + ((f12 >> 2) & 1); P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 1 : 2; P.jing = Math.floor(tt / 0.4) % 3; P.drip = f12 % 6;   // 栅栏后的眼一跳一跳
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.0) { const q = lp < 1.6 ? ease.out((lp - 1.4) / 0.2) : 1 - ease.inOut((lp - 1.6) / 0.4); pose(K.idle, K.tug, q); P.jing = 3 + (f12 & 1); P.eyes = 2; P.taut = lp < 1.7 ? 1 : 0; P.fist = 1; } };   // 待机个性：拽链子、钥匙哗啦响
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.taut = 1; P.fist = 1; P.drip = f12 % 6; P.jing = f; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swipeW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.eyes = 2; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 1; P.glow = 3; P.eyes = 2; P.taut = 1; P.fist = 1; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.28; P.lean = -0.1; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 4; P.ca = 0.9; P.jing = 4; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.28 * (1 - q); P.lean = -0.1 * (1 - q); P.eyes = q < 0.5 ? 1 : 2; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.fist = 1; P.jing = f12 & 3; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 2; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 - (f12 & 1) : 1; }
      else { pose(K.limp, K.limp); P.jaw = 2; P.glow = d < 2 ? 1 : 0; P.eyes = 0; P.taut = 1; P.heat = 0; P.hot = 0; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { chains: 0, shackle: 1, gateOpen: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'chains') {
      if (st === CHARGE) {
        if (q < 0.25) { pose(K.idle, K.spinUp, ease.out(q / 0.25)); if (q > 0.12) P.spin = 1 + tq * 9; }
        else if (q < 0.8) { pose(K.spinUp, K.spinUp); P.spin = 1 + tq * (9 + 9 * q); P.heat = q > 0.5 ? 1 : HOT; P.by = -2 - (f12 & 1); }   // 越抡越快、越抡越红
        else if (q < 0.9) { pose(K.spinUp, K.spinBack, ease.in((q - 0.8) / 0.1)); P.heat = 1; }
        else { pose(K.spinBack, K.spinBack); shiver(f12); P.heat = 1; P.fist = 1; }
        P.glow = q < 0.3 ? 2 : 3; P.eyes = 2; P.fist = 1;
      } else if (st === CAST) { pose(K.lash, K.lash); P.lash = 1; P.taut = 1; P.heat = 1; P.jaw = 1; P.glow = 3; P.eyes = 2; P.lean += tq < 0.1 ? 0.04 : 0; }
      else { const r = ease.inOut(clamp01(tq / 0.6)); pose(K.lash, K.idle, r); P.heat = r < 0.5 ? 1 : HOT; }
    } else if (MV === 'shackle' || MV === 'poke') {
      const two = MV === 'shackle', up = two ? K.overhead : K.pokeW, dn = two ? K.slam : K.poke;
      if (st === CHARGE) { const r = ease.out(clamp01(q / 0.5)); pose(K.idle, up, r); P.by = -Math.round(6 * r); if (q > 0.5) shiver(f12); P.fist = 1; P.bind = two && q > 0.35 ? 1 : 0; P.heat = two && q > 0.6 ? 1 : HOT; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(dn, dn); P.by = 4; P.fist = 1; P.bind = two ? 1 : 0; P.jaw = 2; P.glow = 3; P.eyes = 2; P.taut = !two ? 1 : 0; P.heat = two ? 1 : HOT; }
      else { pose(dn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); P.bind = two && tq < 0.2 ? 1 : 0; }
    } else if (MV === 'gateOpen') {   // 钥匙一格一格拧三下，面罩的栅门跟着一格一格往下翻
      if (st === CHARGE) {
        P.key = q > 0.1 ? 1 : 0; P.fist = 1; P.eyes = 2;
        if (q < 0.3) { pose(K.idle, K.keyUp, ease.out(q / 0.3)); P.glow = 2; }
        else { pose(K.keyUp, K.keyUp); const k = Math.min(3, Math.floor((q - 0.3) / 0.16) + 1); P.ka = k / 3 * Math.PI / 2; P.jaw = k; P.glow = 3; P.heat = k >= 2 ? 1 : HOT; P.fy2 -= k * 3; if (q > 0.85) shiver(f12); }
      } else if (st === CAST) { pose(K.keyUp, K.gate, ease.out(clamp01(tq / 0.12))); P.key = 1; P.ka = Math.PI / 2; P.jaw = 3; P.glow = 3; P.eyes = 2; P.heat = 1; P.fist = 1; }
      else { const r = ease.inOut(clamp01(tq / 0.7)); pose(K.gate, K.idle, r); P.key = r < 0.6 ? 1 : 0; P.ka = Math.PI / 2; P.jaw = Math.round(3 * (1 - r)); P.heat = r < 0.5 ? 1 : HOT; P.fist = 1; }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.taut = 1; P.fist = 1; P.glow = 1 + (f12 & 1); P.drip = f12 % 6; P.eyes = q > 0.6 ? 2 : 1; P.jing = f; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.jing = 4; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：双手扣住面罩 → 两声心跳 → 扯开栅门、仰头吼，链子烧红
      if (st === CHARGE) { pose(K.idle, K.grip, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.fist = 1; P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.heat = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.jaw = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.grip, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.heat = 1; P.jing = 4; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.heat = 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [24, -40], SHF = [-20, -42], NECK = [8, -46];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.45 - P.lean * 0.5); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.lock = B.at(16, -33); L.ringC = B.at(-10, -35); L.bd0 = B.at(-16, -45); L.bd1 = B.at(27, -13);
    headXf(); L.eyeN = B.at(23, -61); L.eyeF = B.at(11, -61); L.eye = B.at(17, -61); L.mouth = B.at(17, -52); L.head = B.at(13, -62);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 22, 22, -1); L.elF = B.ik(L.shF, L.hF, 22, 22, 1);
    const wr = (el, h) => [el[0] + (h[0] - el[0]) * 0.8, el[1] + (h[1] - el[1]) * 0.8];
    L.wrN = wr(L.elN, L.hN); L.wrF = wr(L.elF, L.hF);
    if (P.spin) L.ball = [L.hN[0] + Math.cos(P.spin) * 21, L.hN[1] - 2 + Math.sin(P.spin) * 6];
    else if (P.lash) L.ball = [L.wrN[0] + 50, L.wrN[1] + 2];
    else L.ball = [L.wrN[0] + Math.cos(P.ca) * P.cl, L.wrN[1] + Math.sin(P.ca) * P.cl];
    L.ballBack = P.spin ? Math.sin(P.spin) < 0 : (L.ball[0] < 10 && L.ball[1] < -40);
    const ka = -1.15; L.kd = [Math.cos(ka), Math.sin(ka)]; L.keyTip = [L.hN[0] + L.kd[0] * 30, L.hN[1] + L.kd[1] * 30];
    L.anchor = [L.wrF[0] - 8, 10];
    if (P.key) { P.fcx = L.keyTip[0]; P.fcy = L.keyTip[1]; } else if (P.spin || MV === 'chains') { P.fcx = L.ball[0]; P.fcy = L.ball[1]; } else { P.fcx = L.head[0]; P.fcy = L.head[1]; }
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const bar = (x0, y0, x1, y1, m, t) => { B.ln(E, x0, y0, x1, y1, m, t); if (B.Z() > 1) B.ln(E, x0 + 0.5, y0, x1 + 0.5, y1, m, t); };   // 立绘里栅栏也是两格粗

  // 链子：沿一条下垂的弧一节一节画，平放的环（中间有孔）和侧立的环交替；烧红时一节暗一节亮
  function chain(a, b, sag, far, heat, r) {
    B.reset(); r = r || 1; const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(d / (3.4 * r)));
    const pts = B.bez(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], b, n);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[i + 1], c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const m = heat ? (i % 2 ? EMB : HOTC) : far ? CHAIND : CHAIN;
      part(); if (i % 2 === 0) { B.ell(E, c[0], c[1], 2.4 * r, 1.5 * r, ang, m); B.px(E, c[0], c[1], m, 10); }
      else { B.cap(E, p[0], p[1], q[0], q[1], 0.9 * r, 0.9 * r, m, 7); }
    }
  }
  function wraps(a, b, m, qs, w) {   // 缠在胳膊上的几圈链子：斜着横过胳膊的一串环
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], nr = [-u[1], u[0]];
    B.reset();
    for (const q of qs) { const c = [a[0] + dx * q, a[1] + dy * q]; part();
      for (let k = -1; k <= 1; k++) { const p = [c[0] + nr[0] * k * w + u[0] * k * 2.2, c[1] + nr[1] * k * w + u[1] * k * 2.2], ang = Math.atan2(nr[1] + u[1] * 0.45, nr[0] + u[0] * 0.45);
        if (k & 1) B.ell(E, p[0], p[1], 2.3, 1.4, ang, m); else { B.ell(E, p[0], p[1], 2.4, 1.5, ang + 1.3, m); B.px(E, p[0], p[1], m, 10); } } }
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, wr = far ? L.wrF : L.wrN, m = far ? SKIND : SKIN, ir = far ? IROND : IRON;
    const cm = far ? CHAIND : CHAIN;
    part(); capW(sh[0], sh[1], el[0], el[1], 8, 6.5, m); capW(el[0], el[1], h[0], h[1], 6.5, 6, m);
    const mid = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; dot(mid[0] - 1, mid[1] - 2, 3, m, 7);                 // 二头肌高光
    lnW(el[0], el[1], h[0], h[1], m, 3); lnW(mid[0] + 2, mid[1] + 3, el[0], el[1] + 1, m, 3);
    wraps(sh, el, cm, [0.7], 5.5); wraps(el, h, cm, [0.18, 0.48], 4.6);                                        // 肘上一圈、前臂两圈
    part(); const dx = h[0] - el[0], dy = h[1] - el[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l];       // 铁镣：一截粗铁箍
    capW(wr[0] - u[0] * 2.5, wr[1] - u[1] * 2.5, wr[0] + u[0] * 2.5, wr[1] + u[1] * 2.5, 6.6, 6.6, ir);
    lnW(wr[0] - u[0] * 2.5 - u[1] * 6, wr[1] - u[1] * 2.5 + u[0] * 6, wr[0] - u[0] * 2.5 + u[1] * 6, wr[1] - u[1] * 2.5 - u[0] * 6, ir, 8);
    lnW(wr[0] + u[0] * 2.5 - u[1] * 6, wr[1] + u[1] * 2.5 + u[0] * 6, wr[0] + u[0] * 2.5 + u[1] * 6, wr[1] + u[1] * 2.5 - u[0] * 6, ir, 3);
    px(wr[0] - u[1] * 4, wr[1] + u[0] * 4, ir, 9); px(wr[0] + u[1] * 4, wr[1] - u[0] * 4, ir, 9);                 // 铆钉
    dot(wr[0] + u[1] * 3 - u[0], wr[1] - u[0] * 3 - u[1], 1.4, RUST);                                             // 锈
    part(); dot(h[0] + u[0] * 2, h[1] + u[1] * 2, 5.4, m);                                                        // 拳头：指节、黑指甲
    const nr = [-u[1] * side, u[0] * side];
    for (let i = 0; i < 4; i++) { const k = (i - 1.5) * 2.2, p = [h[0] + u[0] * 5 + nr[0] * k, h[1] + u[1] * 5 + nr[1] * k];
      if (P.fist) { dot(p[0], p[1], 1.5, m, 7); px(p[0] + u[0], p[1] + u[1], m, 3); }
      else { capW(p[0], p[1], p[0] + u[0] * 4, p[1] + u[1] * 4, 1.4, 0.8, m, 6); px(p[0] + u[0] * 5, p[1] + u[1] * 5, VOIDM); } }
  }
  function torso() {
    part(); torsoXf();
    B.ell(E, -9, -46, 19, 12, -0.25, SKIN);                                                                       // 公牛一样的背峰
    B.poly(E, [[-13, 4], [15, 4], [19, -12], [26, -26], [22, -41], [-16, -47], [-24, -30], [-17, -12]], SKIN); B.ell(E, 2, -30, 24, 13, 0, SKIN); B.ell(E, 1, -12, 16, 10, 0, SKIN);
    for (const [x0, y0, x1, y1] of [[-19, -18, -14, -6], [21, -18, 16, -6]]) B.ln(E, x0, y0, x1, y1, SKIN, 3);                  // 腰两侧收进去
    for (const [x0, y0, x1, y1] of [[-12, -54, -19, -63], [-6, -56, -9, -64], [-18, -51, -27, -57], [-22, -46, -31, -49]]) B.cap(E, x0, y0, x1, y1, 2.2, 0.4, SKIN, 3);   // 背峰上的粗鬃
    B.ln(E, -22, -42, -9, -53, SKIN, 7); B.ln(E, -24, -36, -14, -42, SKIN, 3);                                     // 背峰的高光和沟
    B.ln(E, -19, -26, -8, -20, SKIN, 3); B.ln(E, -8, -20, 0, -21, SKIN, 3); B.ln(E, 4, -21, 13, -20, SKIN, 3); B.ln(E, 13, -20, 24, -26, SKIN, 3);   // 胸肌下沿
    B.ell(E, -8, -31, 7, 3.5, 0.2, SKIN, 7); B.ell(E, 13, -31, 7, 3.5, -0.2, SKIN, 7); B.ell(E, -9, -32, 3, 1.5, 0.2, SKIN, 8); B.ell(E, 12, -32, 3, 1.5, -0.2, SKIN, 8);
    for (const [x, y] of [[1, -38], [3, -35], [0, -32], [3, -29], [1, -26]]) { B.ln(E, x, y, x + 1, y + 2, SKIN, 2); B.px(E, x + 2, y + 1, SKIN, 3); }   // 胸口的粗毛
    B.ln(E, 2, -19, 2, 2, SKIN, 3); for (const y of [-14, -8, -2]) { B.ln(E, -7, y, 0, y + 1, SKIN, 3); B.ln(E, 4, y + 1, 11, y, SKIN, 3); }
    for (const [x0, y0, x1, y1] of [[16, -36, 22, -25], [-15, -28, -5, -22], [7, -16, 14, -8]]) { B.ln(E, x0, y0, x1, y1, SKIN, 2); B.ln(E, x0 + 1, y0, x1 + 1, y1, SKIN, 8); }   // 鞭痕
    part(); B.poly(E, [[-16, -10], [18, -10], [19, -2], [-15, -2]], LEATH); B.ln(E, -15, -10, 18, -10, LEATH, 8); B.ln(E, -15, -3, 18, -3, LEATH, 3);   // 宽皮腰带、铁扣
    for (const x of [-12, -6, 10, 15]) B.px(E, x, -6, IRON, 9); B.poly(E, [[-1, -11], [6, -11], [6, -1], [-1, -1]], IRON); B.poly(E, [[1, -9], [4, -9], [4, -3], [1, -3]], LEATH, 3); B.ln(E, -1, -11, 6, -11, IRON, 8);
  }
  function pauldron(side) {   // 一块生锈的圆铁肩甲，没有刺
    part(); torsoXf(); const far = side < 0, c = far ? [-21, -42] : [24, -41], m = far ? IROND : IRON;
    B.ell(E, c[0], c[1], far ? 8 : 10, far ? 6 : 7, side * 0.35, m); B.ln(E, c[0] - 8, c[1] + 4, c[0] + 8, c[1] + 4, m, 3); B.ln(E, c[0] - 7, c[1] - 4, c[0] + 5, c[1] - 6, m, 8);
    for (const dx of [-5, 0, 5]) B.px(E, c[0] + dx, c[1] + 2, m, 9);
    B.ell(E, c[0] + side * 3, c[1] - 1, 2.5, 1.5, 0.3, RUST); B.px(E, c[0] + side * 4, c[1] + 1, RUST, 3);
  }
  function collar() {   // 铁项圈 + 挂在侧面的钥匙串
    part(); torsoXf(); B.poly(E, [[-16, -49], [28, -47], [30, -41], [26, -38], [-13, -40], [-18, -44]], IRON);
    B.ln(E, -15, -49, 28, -47, IRON, 8); B.ln(E, -13, -40, 26, -38, IRON, 3); for (const x of [-12, -6, 20, 26]) { B.px(E, x, -44, IRON, 9); B.px(E, x, -43, IRON, 3); }
    B.ell(E, -4, -45, 2, 1.2, 0.2, RUST);
    const c = L.ringC, j = [0, 0.12, -0.1, 0.2, -0.2][P.jing | 0] || 0;
    part(); B.reset(); for (let a = 0; a < 16; a++) { const an = a / 16 * 6.2832; px(c[0] + Math.cos(an) * 4, c[1] + Math.sin(an) * 4, KEYM, a < 8 ? 5 : 7); }
    for (let i = 0; i < 5; i++) { const an = 1.1 + i * 0.28 + j * (i & 1 ? -1 : 1), s = [c[0] + Math.cos(an) * 4, c[1] + Math.sin(an) * 4], e = [s[0] + Math.cos(an) * 8, s[1] + Math.sin(an) * 8], m = i & 1 ? IRON : KEYM;
      part(); dot(s[0], s[1], 1.5, m); capW(s[0], s[1], e[0], e[1], 0.8, 0.8, m, 6); px(e[0] + Math.cos(an + 1.57) * 1.2, e[1] + Math.sin(an + 1.57) * 1.2, m, 7); px(e[0] - Math.cos(an) * 2 + Math.cos(an + 1.57) * 1.2, e[1] - Math.sin(an) * 2 + Math.sin(an + 1.57) * 1.2, m, 5); }
  }
  function padlock() {   // 项圈前面挂的大挂锁，锁孔透红光
    part(); torsoXf(); B.cap(E, 13, -38, 13, -41, 1, 1, IRON, 7); B.cap(E, 19, -38, 19, -41, 1, 1, IRON, 7); B.cap(E, 13, -41, 19, -41, 1, 1, IRON, 7);
    part(); B.poly(E, [[11, -38], [21, -38], [22, -30], [20, -28], [12, -28], [10, -30]], IRON); B.ln(E, 11, -37, 21, -37, IRON, 8); B.ln(E, 12, -29, 20, -29, IRON, 3);
    const k = P.glow >= 3 || P.hot ? MAG2 : P.glow >= 2 ? MAG1 : EMB; B.px(E, 16, -35, k); B.px(E, 16, -34, k); B.px(E, 16, -33, k === MAG2 ? MAG1 : EMB); B.px(E, 15, -35, EMB); B.px(E, 17, -35, EMB);
    B.px(E, 12, -31, RUST); B.px(E, 20, -33, RUST, 3);
  }
  function head() {   // 铁桶面罩：平顶三颗短钉、眉箍一圈铆钉，脸是一扇铁栅门，栅栏后面两只烧红的眼；下半扇栅门会往下翻
    const J = Math.round(P.jaw), D = J * 2 + (J >= 3 ? 1 : 0);
    part(); headXf(); for (const x of [8, 15, 22]) B.cap(E, x, -76, x + 0.6, -84, 2.2, 0.5, MASK, 6);
    part(); headXf();
    B.poly(E, [[-3, -71], [0, -76], [6, -78], [14, -79], [22, -78], [28, -75], [30, -70], [30, -46], [28, -43], [4, -43], [-1, -45], [-4, -52], [-4, -64]], MASK);
    B.ln(E, 3, -77, 20, -78, MASK, 8); B.ln(E, 16, -74, 19, -73, MASK, 3); B.ln(E, 16, -75, 19, -74, MASK, 7);                 // 顶上的高光、一道凹痕
    B.poly(E, [[-4, -71], [30, -71], [30, -66], [-4, -66]], MASK, 6); B.ln(E, -3, -71, 30, -71, MASK, 8); B.ln(E, -3, -65, 30, -65, MASK, 3);   // 眉箍
    for (const x of [0, 6, 12, 18, 24, 28]) { B.px(E, x, -69, MASK, 9); B.px(E, x, -68, MASK, 3); }
    B.ln(E, 5, -64, 5, -44, MASK, 3); B.ln(E, 4, -64, 4, -44, MASK, 7); for (const y of [-61, -55, -49]) B.px(E, 1, y, MASK, 9);   // 侧面的接缝和铆钉
    for (const [x, y] of [[-1, -58], [-2, -56], [-1, -54]]) B.px(E, x, y, MASK, 10);                                         // 透气孔
    B.ell(E, 0, -67, 2.5, 1.4, 0.3, RUST); B.ell(E, 24, -76, 3, 1.2, -0.1, RUST); B.px(E, -2, -50, RUST, 3);
    B.poly(E, [[-3, -47], [30, -47], [30, -43], [28, -42], [4, -42], [-1, -44]], MASK, 6); B.ln(E, -2, -47, 30, -47, MASK, 8); for (const x of [2, 9, 16, 23, 29]) B.px(E, x, -45, MASK, 9);   // 下沿的箍
    // 眼缝：一道横着的黑缝，中间一根鼻梁铁条把它分成两个眼洞，两只斜着烧的眼（第二阶段火从缝里往上舔）
    part(); B.poly(E, [[7, -64], [28, -64], [28, -59], [7, -59]], VOIDM);
    const e = P.eyes, hotE = P.hot || P.glow >= 3;
    if (e >= 2) { B.ell(E, 11, -61.5, 3.6, 2.2, 0.3, MAG1); B.ell(E, 23.5, -61.5, 4.2, 2.4, -0.3, MAG1); }
    if (e >= 1) { B.ell(E, 11, -61.5, 2.6, 1.2, 0.3, MAG2); B.ell(E, 23.5, -61.5, 3.2, 1.4, -0.3, MAG2); B.ln(E, 10, -62, 12, -61, MAG3); B.ln(E, 22, -61, 25, -62, MAG3); }
    else { B.ln(E, 10, -61, 12, -61, EMB); B.ln(E, 22, -61, 25, -61, EMB); }
    if (e >= 2 && hotE) { const fl = (P.k1 >> 3) & 3; for (const [x, y] of [[10, -65], [12, -65 - (fl & 1)], [23, -65], [24, -66 - (fl >> 1)], [25, -65]]) B.px(E, x, y, MAG1); B.px(E, 24, -65, MAG2); }
    // 下半扇翻开以后：一嘴烧红的牙
    if (D) { B.poly(E, [[7, -57], [28, -57], [28, -57 + D], [7, -57 + D]], MAG1); B.poly(E, [[10, -57], [25, -57], [24, -57 + D], [11, -57 + D]], J >= 3 ? MAG3 : MAG2);
      for (const x of [8, 11, 14, 17, 20, 23, 26]) B.ln(E, x, -57, x + 0.5, -55, TOOTH, 7); for (const x of [9, 13, 19, 25]) B.ln(E, x, -57 + D, x, -59 + D, TOOTH, 5); }
    // 眼缝下沿的横梁 + 鼻梁铁条（T 形面甲，钉死在面罩上）
    part(); B.poly(E, [[6, -59], [29, -59], [29, -57], [6, -57]], MASK, 6); B.ln(E, 6, -59, 29, -59, MASK, 8);
    B.poly(E, [[16, -65], [19, -65], [19, -57], [16, -57]], MASK, 6); B.ln(E, 16, -65, 16, -58, MASK, 8); B.px(E, 17, -58, MASK, 9); B.px(E, 17, -63, MASK, 9);
    if (hotE) { B.px(E, 15, -61, EMB); B.px(E, 20, -61, EMB); }                                                              // 被眼里的火烤红的鼻梁
    // 下半扇栅门（合页在下沿）：关着是一扇铁栅，往下一翻就缩短、往下掉
    part(); const y0 = -57 + D, y1 = Math.max(y0 + 2, -46 + D - J);
    B.poly(E, [[6, y0], [29, y0], [29, y1], [6, y1]], VOIDM);
    for (const x of [9, 13, 17, 21, 25]) { bar(x, y0, x, y1, MASK, 6); B.px(E, x, y0, MASK, 8); }
    B.ln(E, 6, y1, 29, y1, MASK, 6); B.ln(E, 6, y0, 6, y1, MASK, 6); B.ln(E, 29, y0, 29, y1, MASK, 5); B.ln(E, 7, Math.round((y0 + y1) / 2), 28, Math.round((y0 + y1) / 2), MASK, 5);
    if (!D) { B.px(E, 11, -55, RUST); B.px(E, 11, -53, RUST, 3); B.px(E, 23, -55, RUST); B.px(E, 23, -54, RUST); B.px(E, 22, -51, RUST, 3); }                 // 眼下流下来的锈泪
  }
  function flail() {   // 近手铁镣拖出来的链子和带刺的流星锤
    const a = L.wrN, b = L.ball, sag = P.spin || P.lash || P.taut ? 0 : 4;
    chain(a, b, sag, 0, P.heat);
    part(); B.reset(); const r = 5.2, m = IRON;
    for (let i = 0; i < 8; i++) { const an = i / 8 * 6.2832 + 0.2, s = [b[0] + Math.cos(an) * (r - 1), b[1] + Math.sin(an) * (r - 1)], e = [b[0] + Math.cos(an) * (r + 3.5), b[1] + Math.sin(an) * (r + 3.5)]; capW(s[0], s[1], e[0], e[1], 1.5, 0.4, P.heat ? HOTC : m, 6); }
    part(); dot(b[0], b[1], r, m); dot(b[0] - 1.5, b[1] - 1.5, 1.6, m, 8); dot(b[0] + 1.5, b[1] + 2, 1.2, RUST);
    if (P.heat) { dot(b[0], b[1], 2, EMB); px(b[0], b[1], HOTC); }
  }
  function keyDraw() {   // 门开了：一把烧红的大钥匙（拧的时候齿从一边转到另一边）
    const h = L.hN, d = L.kd, tip = L.keyTip, nr = [-d[1], d[0]], w = 7 * Math.cos(P.ka), g = P.glow >= 3 ? MAG2 : MAG1;
    part(); const bc = [h[0] - d[0] * 4, h[1] - d[1] * 4]; dot(bc[0], bc[1], 5.5, KEYM); dot(bc[0], bc[1], 2.6, VOIDM); px(bc[0] - 3, bc[1] - 3, KEYM, 8);   // 钥匙柄的大环
    part(); capW(h[0], h[1], tip[0], tip[1], 2.2, 1.8, KEYM); lnW(h[0] - nr[0], h[1] - nr[1], tip[0] - nr[0], tip[1] - nr[1], KEYM, 8);
    for (const s of [0.45, 0.6]) { const p = [h[0] + (tip[0] - h[0]) * s, h[1] + (tip[1] - h[1]) * s]; capW(p[0] - nr[0] * 3, p[1] - nr[1] * 3, p[0] + nr[0] * 3, p[1] + nr[1] * 3, 1, 1, KEYM, 6); }   // 杆上的两道箍
    part(); for (const [s, k] of [[1, 1], [4.5, 0.6], [8, 0.9]]) { const p = [tip[0] - d[0] * s, tip[1] - d[1] * s]; capW(p[0], p[1], p[0] + nr[0] * w * k, p[1] + nr[1] * w * k, 1.8, 1.5, g); }   // 烧红的齿
    dot(tip[0], tip[1], 1.8, MAG3);
  }
  function binds() {   // 镣铐砸地：两只镣铐之间的一截链子
    if (!P.bind) return; chain(L.wrN, L.wrF, 2, 0, P.heat, 0.9);
  }
  function drips() {   // 从镣铐、锤子上滴回岩浆的熔滴
    if (!P.drip && P.st !== IDLE) return; const k = P.drip;
    for (const [x, y, ph] of [[L.wrN[0], L.wrN[1] + 6, 0], [L.ball[0], L.ball[1] + 5, 2], [L.wrF[0], L.wrF[1] + 6, 4], [-14, -2 + P.by, 1]]) { const d = (k + ph) % 6; if (y + d > 0) continue; part(); px(x, y + d, d < 2 ? MAG2 : MAG1); if (d > 0) px(x, y + d - 1, EMB); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    chain(L.wrF, L.anchor, P.taut ? 0 : 4, 1, P.heat);                         // 远手的链子一直垂进岩浆（拴在门上）
    arm(-1); torso(); pauldron(-1); chain(L.bd0, L.bd1, 3, 0, P.heat);          // 胸前斜挎的铁链
    collar(); padlock(); if (L.ballBack) flail(); head(); pauldron(1);
    if (P.key) keyDraw(); arm(1); binds(); if (!L.ballBack) flail(); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.head[0] * z + spr.ox; RIM.ry = L.head[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.eye[0] * z + spr.ox; LIGHTS[0].y = L.eye[1] * z + spr.oy; LIGHTS[0].r = (P.eyes >= 2 ? (P.hot ? 12 : 10) : P.eyes ? 7 : 0) * z;       // 栅栏后面的眼照亮栅栏
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.52 : 0.4;                                           // 岩浆从下面照上来
    const src = P.key ? L.keyTip : P.heat ? L.ball : L.lock, r2 = P.key ? 12 : P.heat ? 11 : P.glow >= 2 ? 7 : 5;
    LIGHTS[2].x = src[0] * z + spr.ox; LIGHTS[2].y = src[1] * z + spr.oy; LIGHTS[2].r = r2 * z;
    LIGHTS[3].x = L.mouth[0] * z + spr.ox; LIGHTS[3].y = L.mouth[1] * z + spr.oy; LIGHTS[3].r = (P.jaw ? 6 + P.jaw * 4 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、头压低，栅栏后面两只眼烧得最亮，双臂半张、链子烧红、流星锤垂在身前（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.tug, 1); P.nx = 42; P.ny = -32; P.fx2 = -34; P.fy2 = -18; P.lean = 0.04; P.hd = 0.08; P.jaw = 0; P.eyes = 2; P.glow = 3; P.hot = 1; P.heat = 1; P.by = 0; P.breath = 0; P.drip = 2; P.fist = 1; P.ca = 1.45; P.cl = 20; P.jing = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(13, -63); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 30 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（面罩 + 顶钉 + 挂锁）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, wT = 0, lastK = 0;
  function roarFx() {   // 吼：栅门里喷出火光，两道环
    const e = L.mouth; ring(sx(e[0]), sy(e[1]), 1, FXI.fire); ring(sx(L.head[0]), sy(L.head[1]), 0, FXI.fire); flash(0.12); shake(0.4, 3);
    burst(sx(e[0]), sy(e[1]), 24, 50, 150, 0.35, 0.7, FXI.fire, 20);
    for (let i = 0; i < 30; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(e[0]), sy(e[1]), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (60 + Math.random() * 120), 0.8 + Math.random() * 0.5, i & 1 ? FXI.fire : FXI.steel, { g: 220, floor: HY + 6 }); }
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'chains') { const h = L.wrN, b = L.ball; fx.link(sx(h[0]), sy(h[1]), sx(b[0]) + 24, sy(b[1]), 'steel', 0.35); fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 0.1, 2.2, 'fire', 0.2, 2, 2);
        burst(sx(b[0]), sy(b[1]), 22, 60, 170, 0.25, 0.5, FXI.steel, 10); burst(sx(b[0]), sy(b[1]), 12, 40, 120, 0.3, 0.6, FXI.fire, 20); ring(sx(b[0]), sy(b[1]), 0, FXI.fire); shake(0.3, 3); flash(0.06);
        sfx('boss', { k: 'jailerChain', w: 1 }); sfx('boss', { k: 'throw', w: 0.8 }); sfx('boss', { k: 'jailerLock', w: 0.8 }); }
      else if (MV === 'shackle') slamFx([L.hN, L.hF], 1);
      else if (MV === 'poke') slamFx([L.ball], 0);
      else if (MV === 'gateOpen') { roarFx(); for (const x of [-44, -16, 20, 52, 80]) { const dx = (Math.random() - 0.5) * 20; fx.link(sx(x), HY, sx(x + dx), sy(-150), 'steel', 0.55); fx.pillar(sx(x), sy(-150), HY, 2, 'fire', 0.3); burst(sx(x), HY - 2, 10, 40, 140, 0.3, 0.6, FXI.fire, 60); }
        const k = L.keyTip; fx.cross(sx(k[0]), sy(k[1]), 16, 'fire', 0.3); sfx('boss', { k: 'jailerGate', w: 1 }); sfx('boss', { k: 'jailerChain', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { roarFx(); sfx('boss', { k: 'jailerRoar', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); if (MV === 'p2') { sfx('boss', { k: 'jailerLock', w: 1 }); sfx('boss', { k: 'jailerChain', w: 0.8 }); } }
    }
    if (s === CHARGE) { wT = 0; lastK = 0; }
    if (s === CHARGE && MV === 'chains') sfx('boss', { k: 'jailerChain', w: 0.5 });
    if (s === CHARGE && MV === 'shackle') { sfx('boss', { k: 'jailerChain', w: 0.8 }); sfx('boss', { k: 'lavaGather', w: 0.6, dur: E.DUR[CHARGE] }); }
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'growl', w: 0.6 });
    if (s === CHARGE && MV === 'gateOpen') sfx('boss', { k: 'jailerKeys', w: 1 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'lavaRise', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function slamFx(pts, big) {   // 砸进岩浆：火浪往两边推、裂纹、岩浆块飞起来、链子乱响
    for (const h of pts) { const x = sx(h[0]), y = HY; fx.wave(x, y, 1, big ? 40 : 28, big ? 9 : 7, 'fire', 0.5, 2); fx.wave(x, y, -1, big ? 30 : 20, big ? 7 : 5, 'fire', 0.45, 2); fx.crack(x, y, big ? 20 : 14, 1, 'fire', 1.2);
      burst(x, y - 2, big ? 22 : 14, 60, 180, 0.35, 0.8, FXI.fire, 50); burst(x, y - 4, 10, 50, 140, 0.2, 0.4, FXI.steel, 20);
      for (let i = 0; i < (big ? 16 : 10); i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 150, -60 - Math.random() * 160, 0.9 + Math.random() * 0.5, FXI.fire, { g: 320, floor: HY + 2 }); }
    ring(sx(pts[0][0]), HY - 2, big ? 1 : 0, FXI.fire); shake(big ? 0.35 : 0.28, 3); flash(big ? 0.08 : 0.05);
    sfx('impact', { pal: 'fire', w: 1 }); sfx('boss', { k: 'slam', w: big ? 1 : 0.7 }); sfx('boss', { k: 'jailerChain', w: big ? 1 : 0.6 }); sfx('hit', { mat: 'metal', w: 1 });
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.45) sfx('boss', { k: 'jailerKeys', w: 0.35 });
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { const b = L.ball; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 36, 0.2, 2.6, 'fire', 0.22, 3, 2); burst(sx(b[0]), sy(b[1]), 14, 50, 140, 0.25, 0.5, FXI.steel, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); sfx('boss', { k: 'jailerChain', w: 0.4 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'jailerChain', w: 0.3 });
    if (s === RECOVER && t === 0.25 && MV === 'gateOpen') ring(sx(L.head[0]), sy(L.head[1]), 0, FXI.fire);
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'jailerDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(L.head[0]), sy(L.head[1]), 30, 50, 170, 0.4, 0.8, FXI.fire, 30); ring(sx(L.head[0]), sy(L.head[1]), 1, FXI.fire); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'jailerChain', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 40; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-10 - Math.random() * 60), 0, -16 - Math.random() * 24, 0.9 + Math.random() * 0.8, i & 1 ? FXI.fire : FXI.shadow); fx.wave(sx(0), HY, 1, 36, 6, 'fire', 0.5, 2); fx.wave(sx(0), HY, -1, 36, 6, 'fire', 0.5, 2); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[1.45], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt; wT += dt;
    if (emT > (P.hot ? 0.05 : 0.11)) { emT = 0; const x = sx(-30 + Math.random() * 60), y = sy(-4 - Math.random() * 40); spawn(K_EMBER, x, y, (Math.random() - 0.5) * 10, -14 - Math.random() * 12, 0.6 + Math.random() * 0.6, FXI.fire);   // 身边一直往上飘的火星
      if (P.heat && Math.random() < 0.5) { const b = L.bd0, c = L.bd1, q = Math.random(); spawn(K_EMBER, sx(b[0] + (c[0] - b[0]) * q), sy(b[1] + (c[1] - b[1]) * q), 0, -10, 0.4, FXI.fire); } }   // 烧红的链子冒火星
    if (state === CHARGE && MV === 'chains' && P.spin) { const b = L.ball; if (Math.random() < 0.7) spawn(K_EMBER, sx(b[0]), sy(b[1]), (Math.random() - 0.5) * 30, -6 - Math.random() * 20, 0.35, P.heat ? FXI.fire : FXI.steel);
      if (wT > 0.3) { wT = 0; sfx('boss', { k: 'jailerWhirl', w: 0.4 + 0.4 * clamp01(stT / E.DUR[CHARGE]) }); } }
    if (state === CHARGE && MV === 'shackle' && P.bind && Math.random() < 0.6) { const c = [(L.wrN[0] + L.wrF[0]) / 2, (L.wrN[1] + L.wrF[1]) / 2], a = Math.random() * 6.2832, r = 12 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.4) { const b = L.ball; spawn(K_EMBER, sx(b[0] + (Math.random() - 0.5) * 8), sy(b[1]), 0, -10, 0.4, FXI.fire); }
    if (state === CHARGE && MV === 'gateOpen') { if (P.key && Math.random() < 0.6) { const c = L.keyTip, a = Math.random() * 6.2832, r = 12 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
      const k = P.jaw | 0; if (k !== lastK) { lastK = k; if (k > 0) { sfx('boss', { k: 'jailerLock', w: 0.35 + 0.2 * k }); burst(sx(L.keyTip[0]), sy(L.keyTip[1]), 8, 30, 90, 0.2, 0.4, FXI.fire, 10); shake(0.1 + 0.05 * k, 1); } }   // 拧一格响一声
      if (P.jaw && Math.random() < 0.4) spawn(K_RISE, sx(L.mouth[0] + (Math.random() - 0.5) * 14), sy(L.mouth[1]), 0, -18, 0.5, FXI.fire); }
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-24 + Math.random() * 60), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.fire, { g: 240, floor: HY + 4 }); }   // 爬的时候带起来的岩浆
    if (state === CHARGE && MV === 'p2' && P.glow >= 3 && Math.random() < 0.6) spawn(K_EMBER, sx(L.head[0] + (Math.random() - 0.5) * 30), sy(L.head[1] + (Math.random() - 0.5) * 24), 0, -20, 0.4, FXI.fire);
    if (state === IDLE && P.breath && Math.random() < 0.25) spawn(K_RISE, sx(L.mouth[0] + 4 + Math.random() * 6), sy(L.mouth[1] + 2), 4, -10, 0.6, FXI.dust);   // 栅栏缝里呼出来的烟
  }
  function fxReset() { emT = 0; wT = 0; lastK = 0; }
  function fxBack(f12) { const x0 = sx(-44), x1 = sx(44); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + f12) % 3) === 0) E.put(x, HY + 1, FXR[FXI.fire][P.hot ? 2 : 3]); }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'chains'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    jailerChain: (s, t, w, p) => { for (let i = 0; i < 8; i++) { const tt = t + i * 0.034 + s.rnd(0, 0.014); s.ring(tt, s.rnd(1700, 3100), 0.12, (0.025 + 0.03 * w) * (1 - i / 10), { pan: p, parts: [[1, 1], [1.47, 0.5], [2.31, 0.3]] }); }
      s.nz(t, 0.3, 'bandpass', 4200, 1.2, 0.05 * w, { pan: p }); s.thud(t, 140, 70, 0.1, 0.06 * w, { pan: p }); },
    jailerLock: (s, t, w, p) => { s.thud(t, 120, 45, 0.25, 0.22 * w, { pan: p }); s.nz(t, 0.05, 'bandpass', 1800, 2, 0.12 * w, { pan: p }); s.ring(t + 0.02, 420, 0.5, 0.06 * w, { pan: p, parts: [[1, 1], [2.76, 0.4], [5.4, 0.2]] }); s.nz(t + 0.09, 0.04, 'highpass', 3500, 0.7, 0.07 * w, { pan: p }); },
    jailerKeys: (s, t, w, p) => { s.coins(t, 4 + Math.round(4 * w), 0.025 + 0.03 * w, { gap: 0.05 }); s.nz(t, 0.25, 'highpass', 6000, 0.7, 0.02 * w, { pan: p }); },
    jailerWhirl: (s, t, w, p) => { s.whoosh(t, 0.22, 300, 1400, 0.05 + 0.05 * w, { pan: p }); s.ring(t + 0.1, s.rnd(2000, 2800), 0.08, 0.02 * w, { pan: p }); },
    jailerGate: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 1.4, 0.05 + 0.04 * w, { to: 52, vib: [7, 40, 0.2], lp: 700, pan: p, rev: 0.6 }); s.tone(t + 0.1, 'square', 180, 0.9, 0.02 * w, { to: 120, vib: [11, 80, 0.1], lp: 1200, pan: p });
      s.rumble(t, 1.6, 0.2 * w, { f: 120, pan: p }); s.ring(t + 0.9, 73, 2.5, 0.12 * w, { pan: p, rev: 0.7, parts: [[1, 1], [2.4, 0.4], [3.9, 0.2]] }); s.thud(t + 0.9, 90, 35, 0.5, 0.25 * w, { pan: p }); },
    jailerRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 95, 1.2, 0.08 + 0.05 * w, { to: 60, vib: [6, 50, 0.1], lp: 650, pan: p, rev: 0.5 }); s.tone(t, 'square', 48, 1.1, 0.05 * w, { to: 40, lp: 300, pan: p });
      s.ring(t, 310, 0.9, 0.04 * w, { pan: p, parts: [[1, 1], [1.5, 0.5]] }); s.rumble(t, 1.0, 0.15 * w, { f: 200, pan: p }); s.nz(t, 0.8, 'bandpass', 900, 1.5, 0.05 * w, { pan: p }); },
    jailerDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 120, 1.8, 0.07 + 0.03 * w, { to: 42, vib: [5, 60, 0.1], lp: 700, pan: p, rev: 0.7 }); s.ring(t, 260, 1.2, 0.03, { pan: p, parts: [[1, 1], [1.5, 0.4]] });
      for (let i = 0; i < 6; i++) s.ring(t + 0.6 + i * 0.12 + s.rnd(0, 0.04), s.rnd(1500, 2600), 0.15, 0.03 * w, { pan: p }); s.ring(t + 1.3, 65, 3, 0.1 * w, { pan: p, rev: 0.7, parts: [[1, 1], [2.4, 0.4]] }); },
  };

  return {
    name: '狱卒', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [MAG1, MAG2, MAG3, EMB, HOTC], HIT_POINT: [0, -36], EVENTS, MAX_H: 104, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'armor', how: 'dissolve', pal: 'fire', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['chains', 'shackle', 'gateOpen', 'poke', 'rise', 'p2'], MOVE_NAMES: { chains: '锁链', shackle: '镣铐砸地', gateOpen: '门开了（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0.2, 0.5, 0.8, 1.1, 1.25], 'chains'], [CAST, [0], 'chains'], [RECOVER, [0.3], 'chains'],
      [CHARGE, [0.3, 0.8, 1.2], 'shackle'], [CAST, [0, 2 / 12], 'shackle'], [RECOVER, [0.3], 'shackle'],
      [CHARGE, [0.3, 0.6, 0.85, 1.1, 1.3], 'gateOpen'], [CAST, [2 / 12], 'gateOpen'], [RECOVER, [0.4], 'gateOpen'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 28, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
