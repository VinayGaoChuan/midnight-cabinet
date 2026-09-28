// 熔炉工头（最终首领，第五章「蒸汽铸造厂」的铁水池）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「戴着焊接面罩的工头，抡着一把铁锤」（兽人；焊接面罩、围裙、铁锤、烟囱）；高温（被动）、打铁（砸离竞技场最近的一片）、
// 铁水（四滩，地上烧 8 秒）→ 第二阶段 加班。
// 设定卡 ——
//   剪影：从铁水池里升起的兽人上半身（原点 = 铁水面），宽肩驼背、头缩在两肩中间；头上扣着一只比脸还大的黑铁焊接面罩，
//         正中一块横着发光的橙色护目镜，四周一圈铆钉，面罩下面露出往前顶的兜齿下巴和两根往上翘的獠牙，脑后一只尖耳朵
//         （识别点：黑面罩 + 一块橙光 + 两根獠牙）。背上一只小锅炉，烟囱从远侧肩后面斜着戳出来一直冒烟。
//   武器：一把锤头比脸还宽的锻锤，平时柄插在铁水里、锤头立在脸旁边；蓄力时锤头烧红 → 橙 → 发白。
//   主色：青灰的兽人皮、棕色皮围裙、麂皮色的焊工手套、深铁色的面罩、橙色领巾、黄铜扣和压力表；光源是护目镜、烧红的锤头、铁水池、锅炉炉门。
//   招式（setMove）：forge 打铁 · molten 铁水 · poke 重击 · rise 升起 · p2 第二阶段仪式（加班）；hot1 / hot0 第二阶段常亮。
//     打铁：铁水里升起一只铁砧（上面一块烧红的铁坯），锤子举到右上方越烧越亮、火星往锤头里卷 → 一锤砸在铁砧上（一大蓬铁花、火浪、地裂）。
//     铁水：远侧的手拽住锅炉上的拉链往下拽，炉门越来越亮、烟囱发白 → 烟囱往天上喷出一柱铁水（游戏画落下来的四滩）。
//     重击：锤子横收到身后 → 锤头往前一捅。
//     升起：锤子当镐扒着铁水爬出来 → 锤子举过头、烟囱喷火、吼一声。
//     第二阶段（加班）：把锤子插进铁水，一只手抓住面罩下沿，锅炉两声闷响 → 把面罩掀上去，露出一张兽人脸和两只烧红的眼，
//     拉响工厂汽笛、张开双臂怒吼；之后面罩一直掀着、锤头暗红、炉门和烟囱冒火。
//     待机：远侧的手敲两下锅炉上的压力表，烟囱噗一口。
//     死亡：仰头哀嚎 → 锤子插进铁水 → 整个人沉下去，只剩那把锤子立在铁水面上。
PCD.define('B_foreman', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, MG = DRAMP.magma;

  // ───── 材质（11 级，暗 → 亮）：主体压暗，护目镜和铁水才亮得出来。色板有上限：只有兽人皮是自己的色阶，其余都用共用的 ─────
  const R_ORC = ['#070a07', '#111812', '#1a251b', '#243225', '#2f4030', '#3b4f3a', '#485f45', '#566f51', '#667f5f', '#7a9270', '#94a888'];
  const SK = defDeep(R_ORC, { depth: 9, dark: 1, amb: 0.1 }), SKD = defDeep(R_ORC, { depth: 6, dark: 3, amb: 0.08 });
  const APR = defDeep('hide', { depth: 7, amb: 0.12 }), BELT = defDeep('hide', { depth: 3, dark: 2, amb: 0.1 }), WOOD = defDeep('hide', { depth: 3, dark: 1, amb: 0.12 });
  const GLV = defDeep('tan', { depth: 6, dark: 2, amb: 0.1 }), GLVD = defDeep('tan', { depth: 5, dark: 4, amb: 0.08 });
  const MASK = defDeep('bladesteel', { depth: 9, dark: 4, amb: 0.05 }), IRON = defDeep('bladesteel', { depth: 6, dark: 2, amb: 0.08 }), IROND = defDeep('bladesteel', { depth: 5, dark: 4, amb: 0.06 });
  const HAMR = defDeep('bladesteel', { depth: 6, dark: 2, amb: 0.1 }), SLAG = defDeep('stormcoat', { depth: 3, dark: 3, amb: 0.1 }), ANV = defDeep('obsidian', { depth: 6, dark: 1, amb: 0.08 });
  const TUSK = defDeep('ivory', { depth: 3, amb: 0.2 }), BRASS = defDeep('brass', { depth: 3, amb: 0.14 }), ORG = defDeep('magma', { depth: 4, dark: 2, amb: 0.16 });
  const MAG1 = defMat([MG[2], MG[3], MG[5], MG[6]], 1, 1), MAG2 = defMat([MG[3], MG[5], MG[7], MG[8]], 1, 1), MAG3 = defMat([MG[5], MG[7], MG[8], MG[9]], 1, 1), EMB = defMat([MG[1], MG[2], MG[3], MG[4]], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.3, 0.45, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { forge: { 3: 1.3, 4: 0.45, 5: 0.7 }, molten: { 3: 1.2, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'forge', HOT = 0;   // HOT：第二阶段，面罩掀着、锤头暗红、炉门和烟囱冒火
  const LENS = [MG[8], MG[7], MG[5]], POOL = [MG[7], MG[6], MG[4]], HEAT = [MG[9], MG[7], MG[5]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: LENS, k: 1 }, { x: 0, y: 0, r: 60, ramp: POOL, k: 0.5 }, { x: 0, y: 0, r: 0, ramp: HEAT, k: 1 }, { x: 0, y: 0, r: 0, ramp: HEAT, k: 0.85 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.fire], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[MAG1] = RIM.skip[MAG2] = RIM.skip[MAG3] = RIM.skip[EMB] = 1;
  const mag = (n) => (n >= 3 ? MAG3 : n >= 2 ? MAG2 : MAG1);

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手、锤柄朝向（ha，屏幕角度，0 朝右、π/2 朝下）和握的位置（gb，离柄尾几格）、
  // 面罩掀起（mk 0 → 1）、锤头热度、铁砧升起（anv）、锅炉炉门（boil）和拉链、烟囱喷发（erupt）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'ha', 'gb', 'mk', 'heat', 'glow', 'eyes', 'anv', 'boil', 'chain', 'erupt', 'smoke', 'hb', 'fist', 'flash', 'dq', 'hot', 'drip', 'breath', 'plant'];
  const K = {
    idle: { nx: 50, ny: -26, fx2: -28, fy2: -10, lean: 0.06, hd: 0.04, ha: -1.45, gb: 22 },
    tapUp: { nx: 50, ny: -26, fx2: -33, fy2: -52, lean: 0.02, hd: -0.06, ha: -1.45, gb: 22 },        // 待机：敲锅炉上的压力表
    forgeUp: { nx: 56, ny: -52, fx2: -26, fy2: -24, lean: -0.02, hd: -0.08, ha: -1.05, gb: 8 },     // 打铁：锤子举到右上方
    forgeBk: { nx: 52, ny: -51, fx2: -30, fy2: -30, lean: -0.1, hd: -0.16, ha: -1.25, gb: 8 },
    forgeDn: { nx: 60, ny: -58, fx2: -22, fy2: -12, lean: 0.2, hd: 0.3, ha: 1.0, gb: 18 },
    mGrab: { nx: 50, ny: -26, fx2: -36, fy2: -60, lean: 0, hd: -0.12, ha: -1.45, gb: 22 },         // 铁水：拽锅炉上的拉链
    mYank: { nx: 48, ny: -24, fx2: -32, fy2: -36, lean: 0.16, hd: 0.2, ha: -1.45, gb: 22 },
    mBlast: { nx: 52, ny: -30, fx2: -30, fy2: -40, lean: 0.2, hd: 0.26, ha: -1.45, gb: 22 },
    pokeW: { nx: 18, ny: -38, fx2: -28, fy2: -12, lean: -0.12, hd: 0, ha: 3.08, gb: 10 },          // 重击：锤子横收到身后 → 往前捅
    poke: { nx: 60, ny: -36, fx2: -26, fy2: -8, lean: 0.34, hd: 0.2, ha: 0.02, gb: 10 },
    swipeW: { nx: 40, ny: -60, fx2: -28, fy2: -10, lean: -0.1, hd: -0.05, ha: -1.3, gb: 8 },        // 普攻：锤子举起 → 斜着抡下来
    swipe: { nx: 54, ny: -30, fx2: -28, fy2: -8, lean: 0.26, hd: 0.12, ha: 0.55, gb: 8 },
    hunch: { nx: 24, ny: -46, fx2: -24, fy2: -28, lean: 0.28, hd: 0.3, ha: -1.45, gb: 22 },         // 第二阶段：抓住面罩下沿
    flip: { nx: 22, ny: -84, fx2: -26, fy2: -34, lean: -0.1, hd: -0.25, ha: -1.45, gb: 22 },
    roar: { nx: 52, ny: -56, fx2: -44, fy2: -52, lean: -0.18, hd: -0.3, ha: -1.45, gb: 22 },
    wide: { nx: 38, ny: -70, fx2: -44, fy2: -50, lean: -0.18, hd: -0.3, ha: -1.3, gb: 8 },          // 升起：锤子举过头
    climbA: { nx: 42, ny: -28, fx2: -32, fy2: -18, lean: 0.3, hd: 0.24, ha: 1.05, gb: 8 },
    climbB: { nx: 38, ny: -16, fx2: -34, fy2: -4, lean: 0.28, hd: 0.24, ha: 1.3, gb: 8 },
    agony: { nx: 40, ny: -60, fx2: -34, fy2: -62, lean: -0.2, hd: -0.4, ha: -1.6, gb: 10 },
    limp: { nx: 34, ny: -2, fx2: -24, fy2: 4, lean: 0.45, hd: 0.5, ha: -1.45, gb: 22 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ha', 'gb'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mk = HOT; P.heat = HOT ? 2 : 1; P.boil = HOT ? 2 : 1; P.fist = 1; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.glow = 1 + ((f12 >> 2) & 1); P.drip = f12 % 6; P.eyes = (f12 % 7 === 0) ? 1 : 2;
      const lp = tt % DUR[IDLE];   // 待机个性：远侧的手敲两下压力表，烟囱噗一口
      if (lp >= 1.2 && lp < 1.4) pose(K.idle, K.tapUp, ease.out((lp - 1.2) / 0.2));
      else if (lp >= 1.4 && lp < 1.8) { pose(K.tapUp, K.tapUp); const k = Math.floor((lp - 1.4) / 0.1); P.fx2 += (k & 1) ? 0 : 2; P.fy2 += (k & 1) ? 0 : 2; }
      else if (lp >= 1.8 && lp < 2.0) pose(K.tapUp, K.idle, ease.inOut((lp - 1.8) / 0.2));
      if (lp >= 1.8 && lp < 2.2) { P.smoke = 2; P.boil = 2; } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.drip = f12 % 6; P.smoke = f & 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { pose(K.idle, K.swipeW, ease.out(tq / 0.17)); P.heat = Math.max(P.heat, 1); }
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.heat = 2; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 2; P.glow = 3; P.heat = 2; }
      else { pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3))); P.heat = Math.max(P.heat, 1); }
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.28; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.glow = 0; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 3; P.ha -= 0.12; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.28 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.glow = q < 0.5 ? 3 : 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.heat = 2; P.smoke = 3; P.boil = 3; P.flash = d < 1 / 12 ? 1 : 0; P.by -= (f12 & 1); }
      else if (d < 1.5) { const q = ease.in(clamp01((d - 0.7) / 0.5)); pose(K.agony, K.limp, q); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 2 : 1; P.eyes = 1; P.heat = 1; P.plant = d >= 0.9 ? 1 : 0; P.fist = P.plant ? 0 : 1; if (P.plant) { P.nx = 38; P.ny = -8; } }
      else { pose(K.limp, K.limp); P.nx = 38; P.ny = -8; P.jaw = 1; P.plant = 1; P.fist = 0; P.heat = d < 2.2 ? 1 : 0; P.boil = 0; const s = clamp01((d - 1.5) / 1.0); P.by = Math.round(ease.in(s) * 100); P.glow = s < 0.4 ? 1 : 0; P.eyes = 0; P.drip = f12 % 6; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH && st !== HURT) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { forge: 0, molten: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'forge') {
      if (st === CHARGE) {
        P.anv = ease.out(clamp01(q / 0.35));
        if (q < 0.4) { pose(K.idle, K.forgeUp, ease.out(q / 0.4)); P.heat = Math.max(P.heat, 1 + Math.round(q / 0.4)); }
        else { pose(K.forgeUp, K.forgeBk, ease.inOut(clamp01((q - 0.4) / 0.4))); P.heat = 3; if (q > 0.7) { P.nx += tr; P.by += (f12 & 1); P.jaw = 1; } }
        P.glow = q < 0.4 ? 2 : 3; P.eyes = 2; P.smoke = q > 0.5 ? 2 : 1;
      } else if (st === CAST) { pose(K.forgeDn, K.forgeDn); P.anv = 1; P.by = 3; P.heat = 3; P.jaw = 3; P.glow = 3; P.eyes = 2; P.smoke = 3; }
      else { pose(K.forgeDn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.anv = 1 - clamp01((tq - 0.2) / 0.45); P.by = Math.round(3 * (1 - clamp01(tq / 0.55))); P.heat = Math.max(P.heat, tq < 0.35 ? 2 : 1); }
    } else if (MV === 'molten') {
      P.chain = 1;
      if (st === CHARGE) {
        if (q < 0.3) { pose(K.idle, K.mGrab, ease.out(q / 0.3)); P.boil = 1; }
        else if (q < 0.5) { pose(K.mGrab, K.mYank, ease.in((q - 0.3) / 0.2)); P.boil = 2; P.jaw = 1; }
        else { pose(K.mYank, K.mYank); P.boil = 3; P.by = (f12 & 1); P.fx2 += tr; P.jaw = 2; }
        P.smoke = q < 0.3 ? 1 : q < 0.6 ? 2 : 3; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.fist = 0;
      } else if (st === CAST) { pose(K.mBlast, K.mBlast); P.erupt = tq < 0.25 ? 2 : 1; P.boil = 3; P.smoke = 3; P.jaw = 3; P.glow = 3; P.eyes = 2; P.by = 2; P.fist = 0; }
      else { pose(K.mBlast, K.idle, ease.inOut(clamp01(tq / 0.6))); P.boil = tq < 0.3 ? 2 : 1; P.smoke = tq < 0.4 ? 2 : 0; P.chain = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.5)));  P.heat = Math.max(P.heat, q < 0.5 ? 1 : 2); if (q > 0.55) { P.nx += tr; P.by += (f12 & 1); } P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.poke, K.poke); P.by = 2; P.heat = 2; P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else { pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5))); P.heat = Math.max(P.heat, 1); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.drip = f12 % 6; P.eyes = q > 0.6 ? 2 : 1; P.smoke = f & 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.heat = 2; P.smoke = 3; P.boil = 3; }
      else { pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6))); P.smoke = tq < 0.3 ? 2 : 0; }
    } else {   // p2 加班：锤子插进铁水、抓住面罩下沿 → 锅炉两声闷响 → 掀起面罩、张臂怒吼、烟囱喷火
      P.plant = 1;
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.smoke = hb ? 3 : 0; P.boil = hb ? 3 : 1; P.heat = hb ? 2 : 1; P.by = hb ? 1 : 0; P.fist = 0; }
      else if (st === CAST) {
        if (tq < 0.17) { pose(K.hunch, K.flip, ease.out(tq / 0.17)); P.mk = ease.out(clamp01(tq / 0.17)); P.fist = 0; P.jaw = 1; }
        else { pose(K.flip, K.roar, ease.out(clamp01((tq - 0.17) / 0.12))); P.mk = 1; P.jaw = 3; }
        P.glow = 3; P.eyes = 2; P.hot = 1; P.heat = 2; P.smoke = 3; P.boil = 3;
      } else { const hold = tq < 1.0; pose(K.roar, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.mk = 1; P.heat = 2; P.smoke = hold ? 3 : 2; P.boil = 3; P.plant = tq < 1.5 ? 1 : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [21, -40], SHF = [-19, -42], NECK = [5, -44], HINGE = [-1, -66], PLANT = { nx: 50, ny: -26, ha: -1.45, gb: 22 };
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.4 - P.lean * 0.55); }
  function maskXf() { headXf(); B.rot(HINGE[0], HINGE[1], -1.2 * P.mk); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(2, -24); L.chim = B.at(-36, -76); L.door = B.at(-25, -46); L.valve = B.at(-37, -66);
    headXf(); L.eye = B.at(16, -67); L.mouth = B.at(16, -46 + P.jaw * 1.5);
    maskXf(); L.lens = P.mk >= 0.5 ? B.at(15, -86) : B.at(19, -68);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    const pl = P.plant, a = pl ? PLANT.ha : P.ha, gb = pl ? PLANT.gb : P.gb; L.grip = pl ? [PLANT.nx, PLANT.ny] : L.hN;
    L.hd = [Math.cos(a), Math.sin(a)]; L.hn = [-L.hd[1], L.hd[0]];
    L.head = [L.grip[0] + L.hd[0] * (40 - gb), L.grip[1] + L.hd[1] * (40 - gb)]; L.pom = [L.grip[0] - L.hd[0] * gb, L.grip[1] - L.hd[1] * gb];
    L.elN = B.ik(L.shN, L.hN, 20, 19, P.ny + P.by > L.shN[1] - 6 ? 1 : -1); L.elF = B.ik(L.shF, L.hF, 20, 19, 1);
    L.anvY = Math.round((1 - P.anv) * 44);
    P.fcx = P.boil >= 3 ? L.chim[0] : P.heat >= 2 ? L.head[0] : L.core[0]; P.fcy = P.boil >= 3 ? L.chim[1] : P.heat >= 2 ? L.head[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  function boiler() {   // 背上的小锅炉：一只铁罐（炉门里是火、侧面一只压力表），烟囱从远侧肩后面斜着戳出来，铁箍一道道，顶上喇叭口
    part(); torsoXf(); B.cap(E, -29, -52, -36, -72, 4.6, 4, IROND);
    for (const y of [-58, -66]) { const x = -29 - 7 * (y + 52) / -20; B.ln(E, x - 5, y + 1, x + 4, y - 1, IROND, 3); B.ln(E, x - 5, y, x + 4, y - 2, IROND, 8); }
    B.ln(E, -32, -54, -38, -70, IROND, 7);
    part(); B.poly(E, [[-44, -72], [-29, -75], [-28, -80], [-46, -77]], IRON); B.ln(E, -46, -77, -28, -80, IRON, 8); B.ln(E, -44, -73, -29, -76, IRON, 3);
    const hot = P.hot || P.smoke >= 3 || P.erupt; B.ell(E, -37, -78.5, 8.5, 1.5, -0.17, hot ? MAG2 : IROND, hot ? 0 : 10); if (hot) B.ln(E, -41, -78, -33, -79, MAG3);
    if (P.chain) { part(); B.ell(E, -37, -66, 2.4, 2.4, 0, BRASS); B.ln(E, -39, -66, -35, -66, BRASS, 8); }                              // 汽笛阀（拉链挂在这里）
    part(); B.ell(E, -24, -44, 12, 10, 0.2, IROND); B.ln(E, -34, -40, -14, -50, IROND, 3); B.ln(E, -33, -48, -18, -54, IROND, 7);          // 锅炉罐
    for (const [x, y] of [[-32, -44], [-28, -50], [-21, -53], [-16, -51]]) B.px(E, x, y, IROND, 8);
    part(); const dc = [-26, -43], lit = P.boil ? mag(P.boil) : null; B.ell(E, dc[0], dc[1], 4.4, 4.4, 0, IRON); B.ell(E, dc[0], dc[1], 3, 3, 0, IRON, 10);   // 炉门：三道栅缝，火光跟着 boil
    if (lit) for (const dy of [-2, 0, 2]) B.ln(E, dc[0] - 2, dc[1] + dy, dc[0] + 2, dc[1] + dy, dy === 0 && P.boil >= 2 ? mag(P.boil + 1) : lit);
    part(); B.ell(E, -33, -53, 3.2, 3.2, 0, BRASS); B.ell(E, -33, -53, 2, 2, 0, TUSK, 7);                                                // 压力表（第二阶段指针打到红区）
    const nd = P.hot || P.boil >= 3 ? [1.6, 0.6] : [-0.8, -1.4]; B.ln(E, -33, -53, -33 + nd[0], -53 + nd[1], P.hot || P.boil >= 3 ? MAG2 : IRON, P.hot || P.boil >= 3 ? 0 : 10);
  }
  function eruption() {   // 烟囱喷出一柱铁水（铁水招式的出手）
    if (!P.erupt) return; part(); const c = L.chim, h = P.erupt >= 2 ? 34 : 20;
    for (let i = 0; i < 6; i++) { const y0 = c[1] - 2 - i * h / 6, y1 = y0 - h / 6, w = 4.5 - i * 0.5 + (P.erupt >= 2 ? 1 : 0); capW(c[0] + (i & 1 ? 1 : -1), y0, c[0], y1, w, w - 0.4, i < 2 ? MAG3 : MAG2); }
    for (const [dx, dy, r] of [[-7, -h - 2, 2.4], [6, -h + 4, 2], [-2, -h - 9, 1.8], [9, -h - 6, 1.4]]) dot(c[0] + dx, c[1] + dy, r, MAG2);
  }
  function chain() {   // 从汽笛阀垂到远侧手上的拉链（黄铜的 T 形拉手）
    if (!P.chain) return; part(); const a = L.valve, b = P.fist ? [L.valve[0] - 1, L.valve[1] + 14] : L.hF, n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let i = 0; i <= n; i++) { const p = lerp(a, b, i / n); dot(p[0], p[1] + Math.sin(i / n * 3.14) * 1.5, 1.1, IRON, i & 1 ? 8 : 4); }
    part(); capW(b[0] - 4, b[1] - 3, b[0] + 4, b[1] - 3, 1.3, 1.3, BRASS);
  }
  function arm(side) {   // 粗胳膊 + 麂皮焊工手套（铁翻口、铁指节）
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, sk = far ? SKD : SK, gl = far ? GLVD : GLV, ir = far ? IROND : IRON;
    part(); capW(sh[0], sh[1], el[0], el[1], 7.6, 6.2, sk); const mid = lerp(sh, el, 0.45); dot(mid[0] - 1, mid[1] - 2, 2.6, sk, 7); lnW(mid[0] + 2, mid[1] + 3, el[0] + 1, el[1], sk, 3);
    part(); const b0 = lerp(el, h, 0.1), b1 = lerp(el, h, 0.88); capW(b0[0], b0[1], b1[0], b1[1], 6.2, 6, gl);
    const dv = [b1[0] - b0[0], b1[1] - b0[1]], dl = Math.hypot(dv[0], dv[1]) || 1, u = [dv[0] / dl, dv[1] / dl], n = [-u[1], u[0]];
    for (const q of [0.45, 0.62]) { const c = lerp(el, h, q); lnW(c[0] + n[0] * 5, c[1] + n[1] * 5, c[0] - n[0] * 5, c[1] - n[1] * 5, gl, 3); }
    lnW(b0[0] - n[0] * 3, b0[1] - n[1] * 3, b1[0] - n[0] * 3, b1[1] - n[1] * 3, gl, 8);
    part(); const c0 = lerp(el, h, 0.08), c1 = lerp(el, h, 0.3); capW(c0[0], c0[1], c1[0], c1[1], 7.8, 7.4, ir);                          // 铁翻口
    lnW(c1[0] + n[0] * 7, c1[1] + n[1] * 7, c1[0] - n[0] * 7, c1[1] - n[1] * 7, ir, 3); lnW(c0[0] - n[0] * 5, c0[1] - n[1] * 5, c1[0] - n[0] * 5, c1[1] - n[1] * 5, ir, 8);
    for (const s of [-4, 0, 4]) { const c = lerp(c0, c1, 0.5); px(c[0] + n[0] * s, c[1] + n[1] * s, ir, 8); }
    part(); dot(h[0], h[1], 5.4, gl);                                                                                                     // 拳头 + 铁指节
    part(); const k0 = [h[0] + u[0] * 2.5, h[1] + u[1] * 2.5]; capW(k0[0] + n[0] * 4, k0[1] + n[1] * 4, k0[0] - n[0] * 4, k0[1] - n[1] * 4, 1.8, 1.8, ir);
    lnW(k0[0] + n[0] * 4 - u[0], k0[1] + n[1] * 4 - u[1], k0[0] - n[0] * 4 - u[0], k0[1] - n[1] * 4 - u[1], ir, 8);
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-18, 4], [19, 4], [22, -12], [25, -28], [-23, -28], [-20, -12]], SK); B.ell(E, 1, -32, 26, 12, 0, SK); B.ell(E, 1, -40, 16, 6, 0, SK);
    B.ell(E, -9, -33, 6, 3.4, 0.2, SK, 7); B.ell(E, 12, -33, 6, 3.4, -0.2, SK, 7); B.ln(E, 1, -37, 2, -31, SK, 3);                       // 胸肌
    for (const y of [-24, -18]) { B.ln(E, -21, y, -17, y + 2, SK, 3); B.ln(E, 24, y, 20, y + 2, SK, 3); }
    // 皮围裙：护胸的一片 + 下摆，两根带子挂到脖子后面；口袋里插着火钳，下摆上烫出来的焦痕
    part(); B.poly(E, [[-13, -30], [16, -30], [17, -20], [21, -8], [22, 5], [-19, 5], [-17, -8], [-14, -20]], APR);
    B.ln(E, -13, -29, 16, -29, APR, 8); B.ln(E, 17, -20, 21, -8, APR, 3); B.ln(E, -14, -20, -17, -8, APR, 7);
    B.poly(E, [[-7, -22], [8, -22], [7, -12], [-6, -12]], APR, 3); B.ln(E, -7, -22, 8, -22, APR, 8); B.ln(E, 0, -22, 0, -12, APR, 2);
    B.ell(E, 12, -3, 4, 2.6, 0.5, APR, 2); B.ell(E, -11, -1, 3, 2, -0.3, APR, 2); B.px(E, 12, -3, APR, 10); B.px(E, 11, -2, APR, 10);
    if (P.hot) { B.px(E, 12, -3, MAG2); B.px(E, 11, -2, MAG1); B.px(E, -11, -1, MAG1); }
    part(); B.cap(E, -12, -30, -14, -42, 1.8, 1.6, BELT); B.cap(E, 15, -30, 17, -42, 1.8, 1.6, BELT);
    part(); for (const [x, y] of [[-12, -29], [15, -29]]) B.ell(E, x, y, 1.6, 1.6, 0, BRASS);
    part(); B.cap(E, -3, -21, -5, -26, 1.2, 1, IRON); B.cap(E, 1, -21, 0, -27, 1.2, 1, IRON);   // 口袋里露出一截火钳
    part(); B.poly(E, [[-20, -7], [22, -7], [22, -1], [-20, -1]], BELT); B.ln(E, -20, -6, 22, -6, BELT, 8); for (const x of [-15, -9, 15, 19]) B.px(E, x, -4, BELT, 3);
    part(); B.poly(E, [[1, -8], [8, -8], [8, 0], [1, 0]], BRASS); B.poly(E, [[3, -6], [6, -6], [6, -2], [3, -2]], BRASS, 10); B.ln(E, 1, -8, 8, -8, BRASS, 8);
  }
  function pauldron() {   // 近侧肩上的皮护肩，铆了一块铁片
    part(); torsoXf(); const c = [25, -38];
    B.ell(E, c[0], c[1], 10, 7, 0.35, APR); B.ln(E, c[0] - 8, c[1] + 4, c[0] + 7, c[1] + 6, APR, 3);
    part(); B.ell(E, c[0] + 1, c[1] - 2, 7.5, 4.6, 0.35, IRON); B.ln(E, c[0] - 5, c[1] - 5, c[0] + 5, c[1] - 2, IRON, 8);
    for (const [dx, dy] of [[-5, -2], [0, -5], [6, 0], [2, 2]]) B.px(E, c[0] + dx, c[1] + dy, IRON, 8);
  }
  function head() {   // 兽人头：粗脖子、橙领巾、脑后的尖耳、压低的眉骨、塌鼻子、往前顶的兜齿下巴（面罩放下时只露出下巴和獠牙）
    const J = Math.round(P.jaw * 1.5);
    part(); headXf(); B.cap(E, 4, -38, 8, -50, 9.5, 8.5, SKD); B.ln(E, -2, -42, 0, -52, SKD, 3);
    part(); B.poly(E, [[-5, -41], [21, -41], [18, -35], [9, -28], [2, -35]], ORG); B.ln(E, 3, -38, 9, -30, ORG, 3); B.ln(E, -4, -40, 20, -40, ORG, 8);   // 橙领巾
    part(); B.ell(E, -5, -39, 2.6, 2.2, 0, ORG); B.cap(E, -6, -38, -8, -33, 1.3, 0.9, ORG, 3);
    part(); B.poly(E, [[-4, -66], [-26, -80], [-20, -69], [-23, -66], [-7, -56]], SK); B.ln(E, -6, -63, -18, -72, SK, 3); B.ln(E, -6, -66, -20, -76, SK, 8);   // 往后翘的尖耳
    B.ell(E, -15, -69, 1.7, 1.7, 0, BRASS, 7);
    part(); B.ell(E, 7, -63, 16, 15, 0, SK);
    B.poly(E, [[-5, -56], [26, -56], [27, -50], [25, -48], [-4, -48]], SK);
    B.poly(E, [[-4, -73], [26, -74], [27, -68], [2, -67]], SK, 3); B.ln(E, -3, -74, 25, -75, SK, 8);                                     // 眉骨
    B.ln(E, 5, -78, 12, -60, SK, 3); B.ln(E, 6, -78, 13, -60, SK, 7);                                                                  // 伤疤
    const eye = P.eyes >= 2 ? MAG3 : P.eyes === 1 ? MAG2 : SK, et = P.eyes ? 0 : 10;
    B.ln(E, 10, -68, 14, -67, eye, et); B.ln(E, 19, -68, 23, -67, eye, et); B.ln(E, 10, -67, 14, -66, eye, et); B.ln(E, 19, -67, 23, -66, eye, et); if (P.eyes) { B.ln(E, 10, -66, 14, -65, MAG1); B.ln(E, 19, -66, 23, -65, MAG1); }
    B.ell(E, 25, -59, 4, 3, 0, SK); B.px(E, 24, -57, SK, 10); B.px(E, 27, -57, SK, 10); B.ln(E, 23, -62, 27, -62, SK, 8);             // 塌鼻子
    part(); headXf();   // 下颌（兜齿，往前顶）：张嘴时整块往下掉
    B.poly(E, [[-3, -49 + J], [28, -49 + J], [29, -44 + J], [26, -38 + J], [16, -36 + J], [1, -37 + J], [-4, -43 + J]], SK); B.ln(E, 8, -40 + J, 26, -42 + J, SK, 8); B.ln(E, 1, -37 + J, 26, -38 + J, SK, 10); B.ln(E, 0, -44 + J, 3, -39 + J, SK, 3);
    if (J) { B.poly(E, [[2, -49], [27, -49], [27, -48 + J], [2, -48 + J]], SK, 10); if (J >= 2) B.poly(E, [[7, -48], [23, -48], [22, -49 + J], [8, -49 + J]], P.hot ? MAG1 : EMB); for (const x of [10, 14, 18, 22]) B.px(E, x, -48, TUSK, 6); }
    B.ln(E, 2, -49 + J, 28, -49 + J, SK, 10);
  }
  function mask() {   // 焊接面罩：黑铁的一大块，正中一块橙光护目镜，四周铆钉，太阳穴上一颗合页螺栓；第二阶段掀上去，像帽檐一样翘在头顶、镜片朝天
    part(); headXf(); B.cap(E, -12, -72, -1, -66, 2, 2, BELT);                                                                        // 头箍（绕到后脑）
    const g = P.glow, lm = g >= 3 ? MAG3 : g >= 2 ? MAG2 : g >= 1 ? MAG1 : null;
    if (P.mk >= 0.5) {
      part(); headXf();
      B.poly(E, [[-9, -74], [-6, -83], [24, -92], [31, -86], [29, -80], [0, -73]], MASK); B.ln(E, -6, -83, 24, -92, MASK, 8); B.ln(E, 0, -74, 29, -81, MASK, 3); B.ln(E, 24, -91, 30, -86, MASK, 7);
      B.poly(E, [[5, -85], [23, -90], [25, -86], [7, -81]], MASK, 10);
      if (lm) { B.poly(E, [[6, -84], [23, -89], [24, -87], [7, -82]], lm); B.ln(E, 8, -84, 15, -86, g >= 2 ? MAG3 : MAG2); }
      for (const [x, y] of [[-4, -80], [3, -80], [14, -86], [27, -85], [12, -76], [22, -79]]) B.px(E, x, y, MASK, 8);
      B.px(E, 18, -84, EMB);
      part(); B.ell(E, HINGE[0], HINGE[1] - 8, 3, 3, 0, IRON); B.px(E, HINGE[0] - 1, HINGE[1] - 9, IRON, 8); B.px(E, HINGE[0], HINGE[1] - 8, IRON, 10);
      return;
    }
    part(); maskXf();
    B.poly(E, [[-6, -84], [18, -84], [27, -77], [29, -56], [24, -50], [4, -51], [-4, -56], [-8, -74]], MASK);
    B.ln(E, 17, -84, 21, -51, MASK, 3); B.ln(E, 16, -83, 19, -53, MASK, 7); B.ln(E, -5, -83, 17, -83, MASK, 8); B.ln(E, 5, -51, 23, -50, MASK, 3);
    B.ln(E, -6, -74, -3, -57, MASK, 7);
    B.poly(E, [[9, -75], [30, -75], [30, -61], [9, -61]], MASK, 10);                                                                // 镜框
    if (lm) { B.poly(E, [[10, -74], [29, -74], [29, -62], [10, -62]], g >= 3 ? MAG2 : MAG1); B.poly(E, [[11, -72], [29, -72], [29, -64], [11, -64]], lm); B.ln(E, 12, -73, 19, -73, g >= 2 ? MAG3 : MAG2); if (g >= 3) B.ln(E, 13, -68, 27, -68, MAG3); B.ln(E, 21, -71, 25, -71, g >= 2 ? MAG3 : MAG2); }
    else B.poly(E, [[10, -74], [29, -74], [29, -62], [10, -62]], MASK, 2);
    for (const [x, y] of [[9, -76], [30, -76], [9, -60], [30, -60]]) B.px(E, x, y, MASK, 8);
    for (const [x, y] of [[-2, -80], [6, -82], [14, -82], [23, -79], [26, -56], [15, -52], [6, -53], [-4, -63], [-5, -71]]) { B.px(E, x, y, MASK, 8); B.px(E, x, y + 1, MASK, 1); }   // 一圈铆钉
    B.px(E, 3, -58, MAG1); B.px(E, 4, -76, EMB); B.px(E, 22, -54, EMB);                                                              // 焊渣烫的点
    part(); B.ell(E, HINGE[0], HINGE[1], 3, 3, 0, IRON); B.px(E, HINGE[0] - 1, HINGE[1] - 1, IRON, 8); B.px(E, HINGE[0], HINGE[1], IRON, 10);
  }
  function tusks() {   // 两根从下颌往上翘的獠牙，压在面罩下沿前面
    const J = Math.round(P.jaw * 1.5); part(); headXf();
    B.cap(E, 9, -42 + J, 8, -55 + J, 2.4, 0.7, TUSK); B.ln(E, 8, -43 + J, 7, -53 + J, TUSK, 8);
    B.cap(E, 23, -43 + J, 25, -56 + J, 2.6, 0.7, TUSK); B.ln(E, 22, -44 + J, 24, -54 + J, TUSK, 8);
  }
  function hammer() {   // 锻锤：木柄（握把缠皮）+ 一大块铁锤头（两头铁箍）；热的时候锤面烧红 → 橙 → 整块发白
    const g = L.grip, d = L.hd, n = L.hn, hc = L.head, pm = L.pom, tl = Math.hypot(hc[0] - pm[0], hc[1] - pm[1]), top = [pm[0] + d[0] * (tl - 6), pm[1] + d[1] * (tl - 6)];
    part(); capW(pm[0], pm[1], top[0], top[1], 2, 2.3, WOOD); lnW(pm[0] - n[0], pm[1] - n[1], top[0] - n[0], top[1] - n[1], WOOD, 8);
    for (const q of [2, 4, 6]) { const c = [pm[0] + d[0] * q, pm[1] + d[1] * q]; lnW(c[0] + n[0] * 2, c[1] + n[1] * 2, c[0] - n[0] * 2, c[1] - n[1] * 2, WOOD, 2); }
    part(); { const a = [pm[0] + d[0] * (tl - 12), pm[1] + d[1] * (tl - 12)]; capW(a[0], a[1], top[0], top[1], 2.8, 2.8, HAMR); }
    const HL = 13, HT = 7, cn = (s, t) => [hc[0] + n[0] * s * HL + d[0] * t * HT, hc[1] + n[1] * s * HL + d[1] * t * HT];
    part(); polyW([cn(-1, -1), cn(1, -1), cn(1, 1), cn(-1, 1)], HAMR);
    for (const s of [-1, 1]) { const a = cn(s * 0.7, -1.1), b = cn(s * 0.7, 1.1); lnW(a[0], a[1], b[0], b[1], HAMR, 3); const e0 = cn(s, -1), e1 = cn(s, 1); lnW(e0[0], e0[1], e1[0], e1[1], HAMR, 8); }
    { const a = cn(-0.6, -1), b = cn(0.6, -1); lnW(a[0], a[1], b[0], b[1], HAMR, 8); } { const c = cn(0, 0); dot(c[0], c[1], 1.8, HAMR, 3); px(c[0] - 0.5, c[1] - 0.5, HAMR, 8); }
    if (P.heat) {   // 烧红：先是两个锤面，再到整块
      part(); const H = P.heat, m1 = mag(H), m0 = H >= 2 ? mag(H - 1) : MAG1;
      if (H >= 2) polyW([cn(-0.6, -0.7), cn(0.6, -0.7), cn(0.6, 0.7), cn(-0.6, 0.7)], m0);
      for (const s of [-1, 1]) polyW([cn(s * 0.72, -0.95), cn(s * 1.02, -0.95), cn(s * 1.02, 0.95), cn(s * 0.72, 0.95)], m1);
      if (H >= 3) { const c = cn(0, 0); dot(c[0], c[1], 2.6, MAG3); }
    }
  }
  function anvil() {   // 打铁时从铁水里升起来的铁砧，上面一块烧红的铁坯
    if (!P.anv) return; const y = L.anvY + 2, Y = (v) => v + y;
    part(); B.reset(); polyW([[58, Y(-16)], [82, Y(-16)], [85, Y(2)], [55, Y(2)]], ANV); lnW(58, Y(-15), 82, Y(-15), ANV, 8);
    part(); polyW([[63, Y(-28)], [78, Y(-28)], [75, Y(-16)], [66, Y(-16)]], ANV, 3);
    part(); polyW([[53, Y(-36)], [84, Y(-36)], [98, Y(-33)], [86, Y(-30)], [84, Y(-28)], [56, Y(-28)], [53, Y(-32)]], ANV); lnW(54, Y(-36), 90, Y(-35), ANV, 8); lnW(56, Y(-29), 84, Y(-29), ANV, 3);
    px(60, Y(-33), ANV, 10); px(64, Y(-33), ANV, 10);                                                                                    // 砧面上的方孔
    part(); polyW([[66, Y(-40)], [78, Y(-40)], [78, Y(-36)], [66, Y(-36)]], MAG2); lnW(67, Y(-40), 76, Y(-40), MAG3);                     // 铁坯
  }
  function slag() {   // 腰上浮着的一圈灰渣块，块间是亮的铁水
    part(); B.reset(); B.ell(E, 0, 1, 28, 2.2, 0, MAG1); B.ln(E, -24, 0, 24, 0, MAG2);
    part(); for (const [x, w, h] of [[-26, 5, 2.4], [-15, 4, 1.8], [-5, 6, 2.2], [9, 4, 1.8], [19, 6, 2.4]]) B.ell(E, x, 1.2, w, h, 0, SLAG);
  }
  function drips() {   // 从手套、锤头和腰上滴回池子的铁水
    if (!P.drip && P.st !== IDLE) return; part(); const k = P.drip;
    for (const [x, y, ph] of [[L.hF[0] + 3, L.hF[1] + 4, 3], [L.head[0] + 4, L.head[1] + 8, 0], [-19, -4 + P.by, 1], [21, -5 + P.by, 4]]) { const d = (k + ph) % 6; if (y + d > 0) continue; px(x, y + d, d < 2 ? MAG2 : MAG1); if (d > 0) px(x, y + d - 1, MAG1); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    const back = P.hb && !P.plant, sunk = P.plant && P.by > 40;
    anvil(); boiler(); eruption(); if (back) { hammer(); arm(1); } arm(-1); chain(); torso(); head(); mask(); tusks(); pauldron();
    if (!back) { hammer(); if (!sunk) arm(1); } slag(); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const o = (p) => [p[0] * z + spr.ox, p[1] * z + spr.oy];
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; [RIM.rx, RIM.ry] = o(L.core); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    [LIGHTS[0].x, LIGHTS[0].y] = o(L.lens); LIGHTS[0].r = (P.glow >= 3 ? 22 : P.glow >= 2 ? 16 : P.glow ? 12 : 0) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 62 * z; LIGHTS[1].k = P.hot ? 0.62 : 0.5;                          // 铁水池从下面照上来
    [LIGHTS[2].x, LIGHTS[2].y] = o(P.anv && !P.heat ? [72, -36 + L.anvY] : L.head); LIGHTS[2].r = (P.heat ? 5 + P.heat * 5 : P.anv ? 8 : 0) * z;
    const hc = P.erupt || P.boil >= 3; [LIGHTS[3].x, LIGHTS[3].y] = o(hc && !P.erupt && P.boil >= 3 ? L.door : L.chim); LIGHTS[3].r = (P.erupt ? 22 : hc ? 14 : P.hot ? 10 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：面罩放下、护目镜全亮，锤子立在脸旁边、锤头烧红，远侧的拳头攥着，炉门和烟囱冒火
    const hot = HOT; HOT = 0; poseAt(IDLE, 0, 0);
    Object.assign(P, { nx: 46, ny: -40, ha: -1.4, gb: 16, fx2: -30, fy2: -30, lean: 0.02, hd: 0.08, jaw: 1, eyes: 2, glow: 3, heat: 2, smoke: 3, boil: 3, by: 0, breath: 0, drip: 2 });
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(8, -62); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 34 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（面罩 + 獠牙 + 耳朵）

  // ───── 声音（mc-audio.js 的合成函数，参数同名同序）─────
  const VOICES = {
    foremanClang: (s, t, w, p) => { s.ring(t, 520, 1.2, 0.1 + 0.08 * w, { pan: p, rev: 0.35 }); s.ring(t, 1390, 0.5, 0.05 * w, { pan: p }); s.thud(t, 120, 48, 0.25, 0.22 * w, { pan: p }); s.crackle(t + 0.02, 0.3, 2600, 0.07 * w, { pan: p }); },   // 铁砧上一锤
    foremanTap: (s, t, w, p) => { s.ring(t, 1180, 0.25, 0.03 + 0.03 * w, { pan: p, parts: [[1, 1], [2.9, 0.4]] }); s.nz(t, 0.03, 'highpass', 4200, 0.7, 0.03, { pan: p }); },   // 敲压力表 / 面罩掀起
    foremanSteam: (s, t, w, p) => { s.nz(t, 0.8, 'highpass', 3400, 0.6, 0.05 + 0.05 * w, { pan: p, a: 0.03, hold: 0.35 }); s.thud(t, 70, 40, 0.2, 0.1 * w, { pan: p }); },   // 烟囱噗一口
    foremanBoil: (s, t, w, p) => { s.rumble(t, 1.1, 0.1 + 0.08 * w, { pan: p }); for (let k = 0; k < 5; k++) s.thud(t + k * 0.18, 90 + k * 12, 50, 0.1, 0.06 * w, { pan: p }); s.riser(t, t + 1.0, 300, 3000, 0.04 + 0.03 * w, { pan: p }); },   // 锅炉憋压
    foremanErupt: (s, t, w, p) => { s.thud(t, 90, 36, 0.4, 0.24 * w, { pan: p }); s.nz(t, 0.9, 'lowpass', 900, 0.8, 0.12 * w, { src: 'brown', pan: p, hold: 0.3 }); s.crackle(t + 0.05, 0.9, 1800, 0.09 * w, { pan: p }); s.whoosh(t, 0.7, 200, 1800, 0.07 * w, { pan: p }); },   // 烟囱喷铁水
    foremanRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 112, 1.1, 0.08 + 0.05 * w, { to: 68, vib: [7, 40, 0.1], lp: 700, pan: p, rev: 0.4 }); s.rumble(t, 1.0, 0.12 * w, { pan: p }); s.nz(t, 0.8, 'bandpass', 520, 1.2, 0.06 * w, { pan: p }); },   // 隔着面罩的闷吼
    foremanWhistle: (s, t, w, p) => { s.tone(t, 'square', 392, 1.7, 0.03 + 0.02 * w, { to: 440, slide: 0.3, lp: 1800, pan: p, rev: 0.5, hold: 1.0 }); s.tone(t, 'sawtooth', 494, 1.7, 0.025 * w, { to: 554, slide: 0.3, lp: 1600, pan: p, rev: 0.5, hold: 1.0 }); s.nz(t, 1.7, 'bandpass', 2600, 2, 0.05 * w, { pan: p, hold: 1.0 }); },   // 工厂汽笛：加班
    foremanDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 130, 1.6, 0.08, { to: 45, vib: [5, 50, 0.1], lp: 800, pan: p, rev: 0.6 }); s.nz(t + 0.2, 1.8, 'highpass', 3000, 0.6, 0.06, { pan: p, a: 0.1, hold: 0.8 }); s.ring(t + 0.6, 330, 1.5, 0.05 * w, { pan: p }); },   // 哀嚎，锅炉泄气
  };

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, smT = 0, lastT = 0, lastS = -1;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'forge') forgeFx();
      else if (MV === 'poke') { const h = L.head; burst(sx(h[0] + 8), sy(h[1]), 22, 60, 180, 0.25, 0.5, FXI.impact, 30); ring(sx(h[0] + 6), sy(h[1]), 0, FXI.fire); fx.slash(sx(h[0] - 10), sy(h[1]), 24, 1.2, 1.9, 'fire', 0.2, 3, 2); shake(0.25, 2); flash(0.05); sfx('boss', { k: 'foremanClang', w: 0.6 }); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
      else if (MV === 'molten') { const c = L.chim; ring(sx(c[0]), sy(c[1]), 0, FXI.fire); burst(sx(c[0]), sy(c[1] - 4), 26, 60, 180, 0.3, 0.7, FXI.fire, 40); for (let i = 0; i < 30; i++) spawnX(K_PHYS, sx(c[0] + (Math.random() - 0.5) * 6), sy(c[1] - 2), 40 + Math.random() * 200, -180 - Math.random() * 160, 1 + Math.random() * 0.5, FXI.fire, { g: 300, floor: HY + 4 }); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'foremanErupt', w: 1 }); sfx('boss', { k: 'throw', w: 0.8 }); }
      else if (MV === 'rise' || MV === 'p2') {
        const m = L.mouth, c = L.chim; ring(sx(m[0]), sy(m[1]), 1, FXI.fire); ring(sx(0), sy(-30), 1, FXI.fire); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 30; i++) spawnX(K_PHYS, sx(c[0] + (Math.random() - 0.5) * 6), sy(c[1]), (Math.random() - 0.5) * 60, -120 - Math.random() * 160, 0.9 + Math.random() * 0.5, FXI.fire, { g: 200, floor: HY + 6 });   // 烟囱喷火
        for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(0), sy(-2), Math.cos(a) * (60 + Math.random() * 100), Math.sin(a) * (80 + Math.random() * 120), 0.8, FXI.fire, { g: 240, floor: HY + 6 }); }
        sfx('boss', { k: 'foremanRoar', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'foremanWhistle', w: 1 }); else sfx('boss', { k: 'foremanSteam', w: 1 });
      }
    }
    if (s === CHARGE) {
      if (MV === 'forge') { sfx('boss', { k: 'lavaRise', w: 0.5 }); sfx('boss', { k: 'lavaGather', w: 0.7, dur: E.DUR[CHARGE] }); }
      else if (MV === 'molten') sfx('boss', { k: 'foremanBoil', w: 1 });
      else if (MV === 'poke') sfx('boss', { k: 'growl', w: 0.6 });
      else if (MV === 'rise') sfx('boss', { k: 'lavaRise', w: 1 });
      else if (MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
    }
  }
  function forgeFx() {   // 一锤砸在铁砧上：一大蓬往前飞的铁花、铁水里两道火浪、地裂
    const x = sx(72), y = sy(-36), X0 = sx(70);
    burst(x, y, 40, 90, 260, 0.3, 0.75, FXI.impact, 40); burst(x, y, 16, 40, 140, 0.35, 0.8, FXI.fire, 50);
    for (let i = 0; i < 26; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y, (Math.random() - 0.25) * 260, -60 - Math.random() * 200, 0.8 + Math.random() * 0.5, FXI.impact, { g: 320, floor: HY + 2 });
    fx.wave(X0, HY, 1, 44, 10, 'fire', 0.5, 2); fx.wave(X0, HY, -1, 30, 7, 'fire', 0.45, 2); fx.crack(X0, HY, 22, 1, 'fire', 1.2);
    ring(x, y, 1, FXI.fire); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'foremanClang', w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); sfx('impact', { pal: 'fire', w: 1 });
  }
  function onTime(s, t) {
    if (s === IDLE && (t === 1.4 || t === 1.6)) { sfx('boss', { k: 'foremanTap', w: 0.4 }); }
    if (s === IDLE && t === 1.8) { puff(5); sfx('boss', { k: 'foremanSteam', w: 0.3 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 38, 0.2, 2.6, 'fire', 0.22, 3, 2); burst(sx(L.head[0]), sy(L.head[1]), 18, 60, 160, 0.25, 0.5, FXI.impact, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'foremanClang', w: 0.4 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'foremanDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.9) { burst(sx(44), sy(0), 24, 40, 150, 0.3, 0.7, FXI.fire, 30); ring(sx(44), sy(-1), 0, FXI.fire); shake(0.25, 2); sfx('boss', { k: 'foremanClang', w: 0.5 }); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.5) { for (let i = 0; i < 30; i++) spawnX(K_PHYS, sx(-26 + Math.random() * 52), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 90, 0.8, FXI.fire, { g: 240, floor: HY + 4 }); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.3) { for (let i = 0; i < 20; i++) spawn(K_RISE, sx(-24 + Math.random() * 48), sy(-2 - Math.random() * 8), 0, -14 - Math.random() * 20, 1 + Math.random() * 0.8, FXI.dust); sfx('boss', { k: 'foremanSteam', w: 0.6 }); }
  }
  const EVENTS = [[1.4, 1.6, 1.8], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 0.9, INCOMING + 1.5, INCOMING + 2.3], []];
  function puff(n) { const c = L.chim; for (let i = 0; i < n; i++) spawn(K_RISE, sx(c[0] + (Math.random() - 0.5) * 8), sy(c[1] - 3), (Math.random() - 0.5) * 8 - 4, -18 - Math.random() * 14, 0.9 + Math.random() * 0.7, P.hot || P.smoke >= 3 ? FXI.fire : FXI.dust); }
  function stepFX(dt, state, stT) {
    const X = (x) => lastS === state && lastT < x && stT >= x; emT += dt; smT += dt;
    if (emT > (P.hot ? 0.05 : 0.1)) { emT = 0; spawn(K_EMBER, sx(-30 + Math.random() * 60), sy(-2 - Math.random() * 6), (Math.random() - 0.5) * 10, -14 - Math.random() * 12, 0.5 + Math.random() * 0.6, FXI.fire); }   // 铁水池上的火星
    if (P.by < 40 && smT > (P.smoke >= 3 ? 0.04 : P.smoke ? 0.12 : P.hot ? 0.14 : 0.3)) { smT = 0; puff(1); if (P.hot && Math.random() < 0.5) { const c = L.chim; spawn(K_EMBER, sx(c[0]), sy(c[1] - 1), (Math.random() - 0.5) * 20, -30 - Math.random() * 20, 0.6, FXI.fire); } }   // 烟囱一直冒烟（第二阶段冒火星）
    if (state === CHARGE && MV === 'forge' && P.heat >= 2 && Math.random() < 0.7) { const c = L.head, a = Math.random() * 6.2832, r = 12 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.impact, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }   // 火星往锤头里卷
    if (state === CHARGE && MV === 'forge' && P.anv < 1 && Math.random() < 0.6) spawnX(K_PHYS, sx(60 + Math.random() * 26), sy(-2), (Math.random() - 0.5) * 40, -40 - Math.random() * 50, 0.6, FXI.fire, { g: 240, floor: HY + 4 });   // 铁砧顶开铁水
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.3) { const c = L.head; spawn(K_EMBER, sx(c[0] + (Math.random() - 0.5) * 16), sy(c[1] + 4), 0, 24, 0.4, FXI.fire); }
    if (state === CHARGE && MV === 'molten' && P.boil >= 2 && Math.random() < 0.5) { const c = L.door; spawn(K_EMBER, sx(c[0] + (Math.random() - 0.5) * 6), sy(c[1]), (Math.random() - 0.5) * 16, -16 - Math.random() * 16, 0.4, FXI.fire); }   // 炉门往外冒火星
    if (state === CHARGE && MV === 'molten' && (X(E.DUR[CHARGE] * 0.5) || X(E.DUR[CHARGE] * 0.8))) { puff(8); shake(0.12, 1); sfx('boss', { k: 'foremanSteam', w: 0.5 }); }
    if (state === CHARGE && MV === 'rise' && Math.random() < 0.5) spawnX(K_PHYS, sx(-22 + Math.random() * 44), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.fire, { g: 240, floor: HY + 4 });
    if (state === CHARGE && MV === 'p2' && (X(0.02) || X(0.35))) { puff(10); ring(sx(L.door[0]), sy(L.door[1]), 0, FXI.fire); shake(0.2, 2); if (stT > 0.3) sfx('boss', { k: 'heartbeat', w: 1 }); }
    if (state === CAST && MV === 'p2' && X(0.1)) sfx('boss', { k: 'foremanTap', w: 1 });   // 面罩掀上去「当」的一声
    if (state === RECOVER && MV === 'forge' && P.heat >= 2 && Math.random() < 0.3) { const c = L.head; spawn(K_RISE, sx(c[0]), sy(c[1] - 4), 0, -16, 0.7, FXI.dust); }   // 锤头冒白烟
    lastT = stT; lastS = state;
  }
  function fxReset() { emT = 0; smT = 0; lastT = 0; lastS = -1; }
  function fxBack(f12) { const x0 = sx(-44), x1 = sx(44), R = FXR[FXI.fire]; for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const k = (x + f12) % 5; if (k === 0) E.put(x, HY + 1, R[P.hot ? 2 : 3]); else if (k === 2) E.put(x, HY + 1, FXR[FXI.dust][4]); } }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'forge'; return MVDUR[MV]; }

  return {
    name: '熔炉工头', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [MAG1, MAG2, MAG3, EMB], HIT_POINT: [0, -34], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'armor', how: 'dissolve', pal: 'fire', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['forge', 'molten', 'poke', 'rise', 'p2'], MOVE_NAMES: { forge: '打铁', molten: '铁水', poke: '重击', rise: '升起', p2: '第二阶段仪式（加班）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.45, 1.9]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.35, 0.7, 1.1], 'forge'], [CAST, [0, 2 / 12], 'forge'], [RECOVER, [0.3], 'forge'],
      [CHARGE, [0.2, 0.5, 1.0], 'molten'], [CAST, [0, 3 / 12], 'molten'], [RECOVER, [0.3], 'molten'],
      [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [1 / 12, 3 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.3, 1.9, 2.3, 2.7]]],
    SINK: 26, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
