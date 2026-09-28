// 知识古树（最终首领，第二章「精灵之森」的第二个区域）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「知识古树（树干上的脸、枝条手臂、树冠）」，竞技场 树根；被动 记忆；古根砸地、枝条横扫 → 第二阶段 知识之果（砸人数最多的那个职业）。
// 设定卡 ——
//   剪影：从盘根里长出来的一整棵老树（原点 = 树根地面），不是人形：粗壮的树干上刻着一张巨大的脸，头顶一片压得很宽的扁圆树冠，
//         两侧各伸出一条多节的枝条手臂，指头是四根细枝。识别点：树干上的大脸（厚树皮眉骨、两只琥珀色发光的眼洞、会张开的树瘤嘴、青苔胡子）
//         + 宽树冠里挂着的一颗颗发光的果子。和德鲁伊（长鹿角的人形）完全不同：没有脖子、没有腿、没有角，整棵树就是身体。
//   主色：深灰褐的老树皮、墨绿的树冠、黄绿的青苔；光源是琥珀金（眼洞、嘴里、果子、第二阶段树皮裂缝里透出来的光）。
//   招式（setMove）：rootSlam 古根砸地 · branch 枝条横扫 · fruit 知识之果 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 裂缝和果子常亮。
//     古根砸地：两条大根从地里拱出来、像蛇一样立到脸两边，双臂高举 → 大根和双臂一起砸下去（土浪、裂缝、泥块和落叶）。
//     枝条横扫：近侧的枝臂举到树冠后面、枝条越长越长、叶子往手上聚 → 一条长鞭似的横扫到最前面（绿色弧光、飞叶）。
//     知识之果：双臂伸进树冠捧起一颗越来越亮的大果子、满树的果子一起亮、嘴里念念有词 → 往天上一抛（落下来的果子由游戏画）。
//     重击：细枝指头收成一束往后拉 → 往前一戳。升起：闭着眼从盘根里一拱一拱地长出来、到一半睁眼 → 张开双臂、树冠一抖、张嘴长啸。
//     第二阶段：双臂抱住树干、闭眼，两声心跳时树皮缝里透出琥珀光 → 睁眼长啸、树冠开花，裂缝常亮。
//     死亡：张嘴哀嚎 → 叶子一下变枯黄、果子掉光、枝臂垂下来 → 整棵树沉回树根里，只剩飘落的枯叶。
PCD.define('B_tree', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP, BR = DRAMP.brass, MG = DRAMP.magma, IV = DRAMP.ivory;

  // ───── 材质（11 级，暗 → 亮）：树皮和树冠压暗，琥珀光才亮得出来 ─────
  // 色板有上限：只有树皮和叶子是自己的两条色阶（青苔借叶子的色阶往上挪一截）；枯叶和泥用共用的 hide、眼洞和嘴里的黑用 obsidian、光用 brass
  const R_BARK = ['#07060a', '#110e10', '#1b1616', '#261e1c', '#322722', '#3f3129', '#4d3b30', '#5d4838', '#6f5642', '#84674f', '#9c7b5e'];
  const R_LEAF = ['#030806', '#06120c', '#0a1c12', '#102818', '#16341c', '#1e4222', '#285228', '#34622e', '#427436', '#548840', '#6c9e4c'];
  const R_MOSS = [R_LEAF[0], R_LEAF[2], R_LEAF[3], R_LEAF[4], R_LEAF[5], R_LEAF[6], R_LEAF[7], R_LEAF[8], R_LEAF[9], R_LEAF[10], '#8cb85a'];
  const BARK = defDeep(R_BARK, { depth: 10, dark: 2, amb: 0.08 }), BARKD = defDeep(R_BARK, { depth: 5, dark: 3, amb: 0.06 });
  const ROOT = defDeep(R_BARK, { depth: 5, dark: 1, amb: 0.08 }), ROOTD = defDeep(R_BARK, { depth: 5, dark: 3, amb: 0.05 });
  const LEAF = defDeep(R_LEAF, { depth: 6, amb: 0.12 }), LEAFD = defDeep(R_LEAF, { depth: 5, dark: 2, amb: 0.08 });
  const SERE = defDeep('hide', { depth: 5, amb: 0.12 }), SERED = defDeep('hide', { depth: 4, dark: 2, amb: 0.08 });   // 死亡时的枯叶
  const MOSS = defDeep(R_MOSS, { depth: 4, amb: 0.1 }), VOIDM = defDeep(R_BARK, { depth: 3, dark: 7, amb: 0 }), SOIL = defDeep('hide', { depth: 3, dark: 3, amb: 0.08 });
  const AMB1 = defMat([BR[2], BR[4], BR[5], BR[6]], 1, 1), AMB2 = defMat([BR[4], BR[6], BR[7], BR[8]], 1, 1), AMB3 = defMat([BR[6], BR[7], BR[8], MG[9]], 1, 1);
  const BLOOM = defMat([IV[6], IV[8], IV[9], MG[9]], 1, 1);   // 第二阶段树冠上开的花
  const hero = new Sprite(220, 132, 110, 114);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { rootSlam: { 3: 1.3, 4: 0.45, 5: 0.7 }, branch: { 3: 1.4, 4: 0.45, 5: 0.7 }, fruit: { 3: 1.4, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'rootSlam', HOT = 0;   // HOT：第二阶段，树皮裂缝和果子常亮、树冠开花
  const AMBL = [BR[8], BR[7], BR[5]], ORBL = [MG[9], BR[8], BR[6]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: AMBL, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: AMBL, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: AMBL, k: 0.8 }, { x: 0, y: 0, r: 0, ramp: ORBL, k: 1 }, { x: 0, y: 0, r: 0, ramp: AMBL, k: 0.36 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.nature], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[AMB1] = RIM.skip[AMB2] = RIM.skip[AMB3] = RIM.skip[BLOOM] = RIM.skip[VOIDM] = 1;

  // 姿势：整棵树升降 / 前倾、脸的俯仰、两只枝手的落点、树冠的摆动（cw）和抬起（cs）、两条大根拱起（rt）/ 砸下（rs）、枝条伸长（ext）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'cw', 'cs', 'rt', 'rs', 'ext', 'glow', 'eyes', 'lid', 'brow', 'fr', 'fgone', 'orb', 'fist', 'spear', 'flash', 'dq', 'hot', 'breath', 'rus', 'wilt', 'sw', 'shiv'];
  const K = {
    idle: { nx: 46, ny: -30, fx2: -42, fy2: -32, lean: 0, hd: 0, cw: 0, cs: 0, rt: 0, rs: 0 },
    rootW: { nx: 38, ny: -74, fx2: -40, fy2: -72, lean: -0.08, hd: -0.25, cw: -2, cs: 1, rt: 1, rs: 0 },        // 古根砸地：双臂高举，两条大根立起来
    rootS: { nx: 62, ny: -22, fx2: -36, fy2: -20, lean: 0.14, hd: 0.3, cw: 3, cs: -1, rt: 1, rs: 1 },
    branchW: { nx: -14, ny: -72, fx2: -46, fy2: -40, lean: -0.14, hd: -0.2, cw: -3, cs: 1, rt: 0, rs: 0 },       // 枝条横扫：枝臂举到树冠后面
    branchS: { nx: 92, ny: -42, fx2: -44, fy2: -30, lean: 0.18, hd: 0.2, cw: 4, cs: 0, rt: 0, rs: 0 },
    fruitW: { nx: 22, ny: -74, fx2: -18, fy2: -74, lean: -0.08, hd: -0.35, cw: 0, cs: 2, rt: 0, rs: 0 },        // 知识之果：双手伸进树冠捧果
    fruitS: { nx: 50, ny: -88, fx2: -48, fy2: -86, lean: -0.14, hd: -0.4, cw: 0, cs: 3, rt: 0, rs: 0 },
    pokeW: { nx: 14, ny: -44, fx2: -42, fy2: -32, lean: -0.08, hd: -0.05, cw: -2, cs: 0, rt: 0, rs: 0 },         // 重击：细枝收成一束往后拉 → 往前戳
    poke: { nx: 72, ny: -36, fx2: -42, fy2: -30, lean: 0.2, hd: 0.15, cw: 3, cs: 0, rt: 0, rs: 0 },
    swipeW: { nx: 26, ny: -80, fx2: -42, fy2: -32, lean: -0.08, hd: -0.1, cw: -2, cs: 0, rt: 0, rs: 0 },        // 普攻：枝臂抡起 → 往前一扫
    swipe: { nx: 62, ny: -22, fx2: -42, fy2: -30, lean: 0.16, hd: 0.12, cw: 3, cs: 0, rt: 0, rs: 0 },
    hug: { nx: -4, ny: -26, fx2: 10, fy2: -24, lean: 0.1, hd: 0.3, cw: 0, cs: -2, rt: 0, rs: 0 },              // 第二阶段：抱住树干
    wide: { nx: 62, ny: -66, fx2: -60, fy2: -64, lean: -0.1, hd: -0.3, cw: 0, cs: 3, rt: 0.3, rs: 0 },
    climbA: { nx: 46, ny: -22, fx2: -42, fy2: -22, lean: 0.12, hd: 0.2, cw: 3, cs: -1, rt: 0.25, rs: 0 },       // 攀爬：双手撑地往上拱
    climbB: { nx: 58, ny: -50, fx2: -52, fy2: -46, lean: -0.06, hd: -0.05, cw: -2, cs: 2, rt: 0.1, rs: 0 },
    agony: { nx: 42, ny: -80, fx2: -42, fy2: -78, lean: -0.12, hd: -0.4, cw: 0, cs: 2, rt: 0, rs: 0 },
    limp: { nx: 40, ny: -20, fx2: -36, fy2: -20, lean: 0.1, hd: 0.35, cw: 0, cs: -7, rt: 0, rs: 0 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'cw', 'cs', 'rt', 'rs'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 2; P.fr = 1; P.lid = 0.22; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.cs = b; P.cw = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.4) % 6]; P.sw = P.cw; P.rus = (f12 >> 1) & 1;
      P.eyes = (f12 % 9 === 4 || f12 % 13 === 7) ? 1 : 2;                                                          // 眼洞里的光一跳一跳
      const lp = tt % DUR[IDLE];                                                                                    // 待机个性：慢慢眨一下眼，再「哼」一声抖抖树冠、掉几片叶子
      if (lp >= 1.4 && lp < 1.62) P.lid = lp < 1.48 || lp >= 1.55 ? 0.5 : 1;
      else if (lp >= 1.62 && lp < 2.1) { P.jaw = lp < 1.9 ? 1 : 0; P.shiv = 1; P.cw = (f12 & 1) ? 2 : -2; P.hd = 0.08; P.sw = -P.cw; } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3, A = f < 2 ? K.climbA : K.climbB; pose(A, A); P.by = [4, 2, 0, 1][f]; P.rus = f & 1; P.sw = P.cw; P.brow = 0.5; }
    else if (st === ATTACK) {
      if (tq < 0.17) { pose(K.idle, K.swipeW, ease.out(tq / 0.17)); P.brow = 1; }
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.brow = 1; P.fist = 1; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 2; P.glow = 2; P.brow = 1; P.sw = 2; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.25; P.lean = -0.08; P.jaw = 2; P.lid = 0.6; P.brow = 1; P.flash = h < 1 / 12 ? 1 : 0; P.cw = -3; P.nx -= 4; P.fx2 -= 3; P.shiv = 1; P.sw = 3; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.25 * (1 - q); P.lean = -0.08 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.lid = q < 0.5 ? 0.5 : 0; P.cw = Math.round(-3 * (1 - q)); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.brow = 1; P.flash = d < 1 / 12 ? 1 : 0; P.cw = (f12 & 1) ? 2 : -2; P.shiv = 1; P.fr = 2; P.sw = -P.cw; }
      else if (d < 1.5) { const q = clamp01((d - 0.7) / 0.6); pose(K.agony, K.limp, ease.in(q)); P.jaw = d < 1.0 ? 3 : 1; P.eyes = d < 1.2 ? 2 : 1; P.glow = d < 1.1 ? 2 : 1; P.wilt = q < 0.3 ? 0 : q < 0.7 ? 0.5 : 1; P.lid = q > 0.7 ? 0.5 : 0; P.fgone = q > 0.5 ? 1 : 0; P.shiv = 1; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.eyes = d < 1.9 ? 1 : 0; P.lid = 0.7; P.wilt = 1; P.fgone = 1; P.glow = 0; P.by = Math.round(ease.inOut(clamp01((d - 1.45) / 0.85)) * 40); P.dq = d > 2.05 ? Math.round(clamp01((d - 2.05) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && st !== DEATH) { if (P.glow < 2) P.glow = 2; if (P.fr < 2) P.fr = 2; }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { rootSlam: 0, branch: 1, fruit: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'rootSlam') {
      if (st === CHARGE) { pose(K.idle, K.rootW, ease.out(clamp01(q / 0.55))); P.rt = ease.out(clamp01((q - 0.15) / 0.4)); P.brow = 1; P.glow = q < 0.4 ? 2 : 3; P.fist = 1; P.jaw = q > 0.8 ? 1 : 0;
        if (q > 0.55) { P.nx += tr; P.fx2 -= tr; P.by = f12 & 1; P.cw += tr; } }
      else if (st === CAST) { pose(K.rootS, K.rootS); P.by = 3; P.jaw = 3; P.brow = 1; P.glow = 3; P.fist = 1; P.shiv = 1; }
      else { const r = ease.inOut(clamp01(tq / 0.55)); pose(K.rootS, K.idle, r); P.rt = 1 - r; P.rs = 1 - r; P.by = Math.round(3 * (1 - r)); P.brow = r < 0.6 ? 1 : 0; }
    } else if (MV === 'branch') {
      if (st === CHARGE) { pose(K.idle, K.branchW, ease.out(clamp01(q / 0.5))); P.ext = Math.round(clamp01(q / 0.9) * 4) / 4; P.brow = 1; P.lid = 0.3; P.glow = q < 0.5 ? 2 : 3; if (q > 0.5) { P.ny += tr; P.cw += tr; } }
      else if (st === CAST) { pose(K.branchS, K.branchS); P.ext = 1; P.jaw = 2; P.brow = 1; P.glow = 3; P.sw = 3; }
      else { const r = ease.inOut(clamp01(tq / 0.6)); pose(K.branchS, K.idle, r); P.ext = Math.round((1 - r) * 4) / 4; }
    } else if (MV === 'fruit') {
      if (st === CHARGE) { pose(K.idle, K.fruitW, ease.out(clamp01(q / 0.45))); P.orb = q < 0.15 ? 0 : q < 0.3 ? 1 : q < 0.45 ? 2 : q < 0.7 ? 3 : 4; P.fr = q < 0.3 ? 2 : 3; P.jaw = q > 0.3 ? ((f12 >> 1) & 1) : 0; P.glow = 3; P.brow = 0.5;
        if (q > 0.88) { P.by = 2; P.ny += 3; P.fy2 += 3; } }
      else if (st === CAST) { pose(K.fruitS, K.fruitS); P.fgone = 1; P.jaw = 3; P.glow = 3; P.fr = 3; }
      else { pose(K.fruitS, K.idle, ease.inOut(clamp01(tq / 0.6))); P.fgone = tq < 0.35 ? 1 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.5))); P.fist = 1; P.brow = 1; P.glow = q < 0.5 ? 1 : 2; if (q > 0.5) { P.nx += tr; P.by = f12 & 1; } }
      else if (st === CAST) { pose(K.poke, K.poke); P.spear = 1; P.ext = 0.5; P.jaw = 2; P.brow = 1; P.glow = 2; }
      else pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3, A = f < 2 ? K.climbA : K.climbB; pose(A, A); P.by = [4, 2, 0, 1][f]; P.rus = f & 1; P.sw = P.cw; P.lid = q < 0.55 ? 1 : q < 0.65 ? 0.5 : 0; P.eyes = q < 0.55 ? 0 : 2; P.glow = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.brow = 1; P.shiv = 1; P.cw = (f12 & 1) ? 2 : -2; P.sw = -P.cw; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：双臂抱住树干、闭眼 → 两声心跳（树皮缝一亮一亮）→ 睁眼长啸、树冠开花
      if (st === CHARGE) { pose(K.idle, K.hug, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.lid = 1; P.glow = hb ? 3 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.cs += hb ? 1 : 0; P.fr = hb ? 3 : 1; }
      else if (st === CAST) { pose(K.hug, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.hot = 1; P.brow = 1; P.fr = 3; P.shiv = 1; P.cw = (f12 & 1) ? 2 : -2; P.sw = -P.cw; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.hot = 1; P.fr = 3; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [21, -60], SHF = [-20, -62];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(3, -34, P.hd * 0.28); }                   // 脸：树干上部微微俯仰
  function crownXf() { torsoXf(); B.rot(3, -60, P.hd * 0.12); B.move(P.cw, -P.cs); }
  const RLOW = [[24, 4], [34, 6], [44, 8], [52, 9], [58, 9]], RUP = [[24, 2], [38, -18], [48, -42], [47, -60], [37, -68]], RFLAT = [[24, 2], [38, -20], [56, -30], [74, -28], [90, -22]];
  function rootPts(side) { const t = P.rt, s = P.rs, k = side < 0 ? 0.92 : 1; return RLOW.map((p, i) => { let x = p[0] + (RUP[i][0] - p[0]) * t, y = p[1] + (RUP[i][1] - p[1]) * t; x += (RFLAT[i][0] - x) * s; y += (RFLAT[i][1] - y) * s; return [x * side * k, y]; }); }
  function elbow(sh, h, l, bend) {   // 手垂着时肘往上拱（像一根弯下来的枝），手举过肩时肘往外下方撇，中间平滑过渡
    const u = clamp01((sh[1] - h[1] - 2) / 16), a = B.ik(sh, h, l, l, bend); if (!u) return a; const b = B.ik(sh, h, l, l, -bend); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(3, -46);
    headXf(); L.eyeF = B.at(-8, -52); L.eyeN = B.at(13, -52); L.mouth = B.at(3, -32);
    crownXf(); L.crown = B.at(2, -80);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    const l = 26 + 10 * P.ext; L.elN = elbow(L.shN, L.hN, l, -1); L.elF = elbow(L.shF, L.hF, 26, 1);
    L.orb = [(L.hN[0] + L.hF[0]) / 2, Math.min(L.hN[1], L.hF[1]) - 2 - P.orb];
    L.rtN = rootPts(1); L.rtF = rootPts(-1);
    P.fcx = P.orb ? L.orb[0] : L.core[0]; P.fcy = P.orb ? L.orb[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const HR = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };   // 固定的伪随机（叶子的纹理每帧一样）

  // 树冠：一团团扁圆的叶簇，每团一个部件（团与团之间压出深色分界线），后排暗、前排亮；叶簇下沿是一排锯齿叶尖
  const CB = [[-44, -75, 16, 9], [-20, -81, 18, 8], [8, -82, 20, 7], [34, -80, 18, 8], [54, -73, 13, 8], [-58, -69, 10, 7]];
  const CF = [[-38, -70, 14, 7], [-14, -75, 14, 8], [12, -76, 15, 8], [36, -71, 14, 7], [56, -66, 9, 6], [-58, -64, 8, 5], [-27, -67, 9, 4], [30, -67, 9, 4]];
  function clump(c, i, front) {
    const w = P.wilt, dead = w >= 1 || (w > 0 && (i & 1)), m = dead ? (front ? SERE : SERED) : (front ? LEAF : LEAFD);
    if (w >= 1 && front && i % 3 === 0) return;                                         // 枯了：叶子掉得稀稀拉拉
    const x = c[0] + (P.rus && (i & 1) ? (i % 3 ? 1 : -1) : 0), y = c[1] + (w >= 1 ? 2 + (i & 1) : 0), rx = c[2], ry = c[3];
    part(); B.ell(E, x, y, rx, ry, 0, m);
    for (let k = 0; k < rx * ry / 5; k++) {                                              // 叶片纹理：左上亮、右下暗的一小撮一小撮
      const u = HR(i * 31 + k * 7 + (front ? 3 : 0)) * 2 - 1, v = HR(i * 17 + k * 13 + 5) * 2 - 1; if (u * u + v * v > 0.8) continue;
      const px = x + u * rx, py = y + v * ry, t = v < -0.2 && u < 0.4 ? 8 : v > 0.35 || u > 0.6 ? 3 : 6;
      B.px(E, px, py, m, t); B.px(E, px + 1, py, m, t === 8 ? 7 : t); if (t === 3) B.px(E, px, py + 1, m, 2);
    }
    for (let dx = -rx + 2; dx <= rx - 2; dx += 3) { const e = ry * Math.sqrt(Math.max(0, 1 - (dx / rx) * (dx / rx))); B.px(E, x + dx, y + e + 1, m, 3); B.px(E, x + dx + 1, y - e - 1, m, front ? 7 : 5); }   // 下沿叶尖、上沿翘起的叶
  }
  function canopy(front) {
    crownXf(); const A = front ? CF : CB; for (let i = 0; i < A.length; i++) clump(A[i], i, front);
    if (front && P.hot && !P.wilt) { part(); for (let i = 0; i < CF.length; i++) for (let k = 0; k < 2; k++) { const c = CF[i], u = HR(i * 5 + k * 11 + 1) * 1.4 - 0.7, v = HR(i * 9 + k * 3 + 2) * 1.1 - 0.8, x = Math.round(c[0] + u * c[2]), y = Math.round(c[1] + v * c[3]);   // 第二阶段：树冠开出小花（四瓣 + 金蕊）
      B.px(E, x - 1, y, BLOOM); B.px(E, x + 1, y, BLOOM); B.px(E, x, y - 1, BLOOM); B.px(E, x, y + 1, BLOOM); B.px(E, x, y, AMB2); } }
  }
  function limbs() {   // 树干顶上分出去撑树冠的几根大枝（叶簇之间露出来）
    torsoXf(); part();
    for (const [x0, y0, x1, y1, r0] of [[-8, -70, -32, -81, 5], [2, -72, 4, -86, 5], [12, -70, 36, -81, 5], [-18, -66, -54, -69, 3.5], [22, -66, 56, -67, 3.5]]) { B.cap(E, x0, y0, x1, y1, r0, 1.6, BARK); B.ln(E, x0, y0, x1, y1, BARK, 3); }
  }
  const FRUIT = [[-32, -62], [-5, -66], [21, -66], [44, -62], [-50, -59], [57, -59], [-40, -77], [30, -77], [4, -83]];
  function fruits() {   // 知识之果：挂在叶簇下沿、一颗颗发光（蓄力时一起变大变亮）
    if (P.fgone) return; crownXf();
    for (let i = 0; i < FRUIT.length; i++) {
      const [x, y0] = FRUIT[i], hang = i < 6, y = y0 + (P.rus && (i & 1) ? 1 : 0), big = P.fr >= 3, r = (hang ? 2.2 : 1.6) + (big ? 0.8 : 0);
      part(); if (hang) B.ln(E, x, y - r - 2, x, y - r, BARKD);
      B.ell(E, x, y, r, r + 0.3, 0, P.fr >= 2 ? AMB2 : AMB1); B.px(E, x + 1, y + 1, P.fr >= 2 ? AMB1 : AMB1);
      if (P.fr >= 2) B.px(E, x - 1, y - 1, AMB3); if (big) { B.px(E, x, y - 1, AMB3); B.px(E, x - 1, y, AMB3); }
    }
  }

  function trunk() {
    part(); torsoXf();
    B.poly(E, [[-34, 6], [34, 6], [27, -2], [23, -12], [22, -26], [23, -44], [24, -60], [27, -70], [20, -76], [8, -78], [-8, -78], [-20, -76], [-26, -70], [-23, -60], [-22, -44], [-21, -26], [-23, -12], [-28, -2]], BARK);
    const wav = (x, y0, y1, t, ph) => { for (let y = y0; y > y1; y -= 4) { const a = x + ((((y + ph) >> 2) & 1) ? 1 : 0), b = x + ((((y - 4 + ph) >> 2) & 1) ? 1 : 0); B.ln(E, a, y, b, y - 4, BARK, t); } };
    for (const [x, ph] of [[-19, 0], [-15, 2]]) { wav(x, 2, -72, 3, ph); wav(x + 1, 2, -72, 7, ph); }       // 左侧的树皮沟（受光）
    for (const [x, ph] of [[18, 1], [21, 3]]) { wav(x, 2, -72, 3, ph); wav(x - 1, 2, -72, 6, ph); }         // 右侧
    for (const [x, ph] of [[-9, 0], [-2, 1], [5, 3], [12, 2]]) { wav(x, 4, -22, 3, ph); wav(x + 1, 4, -22, 7, ph); }   // 脸下面
    B.ell(E, -12, -12, 3, 4, 0, BARK, 3); B.ell(E, -12, -12, 1.4, 2, 0, BARK, 10); B.px(E, -14, -15, BARK, 8);      // 树干上的一个老树瘤
    headXf();                                                                                                  // 脸周围的木纹：一圈圈绕着眼洞和嘴
    const arc = (cx, cy, rx, ry, a0, a1, t) => { for (let a = a0; a <= a1; a += 0.12) B.px(E, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, BARK, t); };
    arc(-8, -52, 10, 8, 0.4, 3.3, 3); arc(13, -52, 11, 8, -0.2, 2.7, 3); arc(-8, -52, 12, 10, 1.2, 2.9, 7); arc(13, -52, 13, 10, 0.2, 1.9, 6);
    arc(3, -32, 13, 7, 0.2, 2.9, 3); arc(3, -32, 15, 9, 0.5, 2.6, 7);
    for (const [y, t] of [[-65, 3], [-66, 7], [-69, 3], [-70, 7]]) B.ln(E, -8, y, 14, y + (y & 1 ? 1 : 0), BARK, t);   // 额头上的老皱纹
    B.ln(E, -4, -44, -7, -36, BARK, 3); B.ln(E, 11, -44, 14, -36, BARK, 3);                                         // 法令纹
    // 额头中间一个木节：蓄力 / 第二阶段时透出光
    B.ell(E, 3, -67, 2.6, 2.2, 0, BARK, 3); B.px(E, 3, -67, P.glow >= 3 || P.hot ? AMB2 : BARK, P.glow >= 3 || P.hot ? 0 : 10);
    if (P.hot || P.glow >= 3) {   // 树皮裂缝里透出琥珀光：从眼洞和嘴往外爬
      const lit = P.glow >= 3 ? AMB2 : AMB1, V = [[[-15, -50], [-19, -42], [-18, -30], [-20, -20]], [[20, -50], [22, -40], [21, -30], [23, -18]], [[3, -24], [1, -14], [4, -4]], [[3, -69], [1, -74]], [[-3, -58], [-9, -64], [-16, -66]], [[10, -58], [17, -64], [22, -68]]];
      for (const c of V) for (let i = 1; i < c.length; i++) { B.ln(E, c[i - 1][0] + 1, c[i - 1][1], c[i][0] + 1, c[i][1], BARK, 10); B.ln(E, c[i - 1][0], c[i - 1][1], c[i][0], c[i][1], i === 1 ? lit : AMB1); }
    }
  }
  function groundRoots() {   // 竞技场：盘在地上的老根
    B.reset();
    for (const [x0, x1, y1, r] of [[-26, -76, 3, 4.6], [22, 72, 3, 4.6], [-14, -44, 6, 3.4], [12, 46, 6, 3.4], [-4, -22, 7, 2.6], [6, 28, 7, 2.6]]) {
      part(); const m = [(x0 + x1) / 2, -5]; B.strand(E, [[x0, -4 + P.by * 0], [m[0], m[1]], [x1, y1]], r, 1, ROOT); B.ln(E, x0, -6, m[0], m[1] - 2, ROOT, 7);
    }
  }
  function brow(o, i, side) {   // 厚厚的树皮眉骨：外端压低、内端随怒气往下压成八字
    const a = P.brow * 2.5, I = [i[0], i[1] + a], M = [(o[0] + I[0]) / 2, Math.min(o[1], I[1]) - 2];
    part(); B.cap(E, o[0], o[1], M[0], M[1], 3, 3.6, BARK); B.cap(E, M[0], M[1], I[0], I[1], 3.6, 2.8, BARK);
    B.ln(E, o[0], o[1] - 2.5, M[0], M[1] - 3, BARK, 8); B.ln(E, M[0], M[1] - 3, I[0], I[1] - 2.5, BARK, 7); B.ln(E, o[0], o[1] - 1.5, M[0], M[1] - 2, BARK, 6);
    B.ln(E, o[0], o[1] + 2.5, M[0], M[1] + 2.5, BARK, 1); B.ln(E, M[0], M[1] + 2.5, I[0], I[1] + 2.5, BARK, 1);
    for (let k = 1; k < 4; k++) { const q = k / 4, x = o[0] + (I[0] - o[0]) * q; B.px(E, x, o[1] + (I[1] - o[1]) * q - 2 * Math.sin(q * 3.14) - 0.5, BARK, 3); }
    B.px(E, M[0] - side, M[1] - 3, MOSS, 6); B.px(E, M[0], M[1] - 3, MOSS, 7); B.px(E, M[0] + side, M[1] - 3, MOSS, 5);   // 眉骨上一撮青苔
  }
  function eye(cx, cy, rx) {   // 眼洞：深洞里一团琥珀光（没光时只剩黑洞），眼皮是一层树皮从上往下合
    part(); B.ell(E, cx, cy, rx, 4.4, 0, VOIDM);
    if (P.eyes) { B.ell(E, cx, cy + 0.5, rx * 0.66, 3, 0, AMB1); B.ell(E, cx, cy + 0.5, rx * 0.46, 2.1, 0, P.eyes >= 2 ? AMB2 : AMB1); if (P.eyes >= 2) { B.px(E, cx, cy, AMB3); B.px(E, cx - 1, cy, AMB3); B.px(E, cx, cy + 1, AMB3); B.px(E, cx - 1, cy + 1, AMB3); if (P.glow >= 3) { B.px(E, cx + 1, cy, AMB3); B.px(E, cx - 2, cy + 1, AMB3); } } }
    if (P.lid > 0) { const h = Math.round(P.lid * 9); for (let y = 0; y < h; y++) { const yy = cy - 4.4 + y + 0.5, w = rx * Math.sqrt(Math.max(0, 1 - ((yy - cy) / 4.6) ** 2)); B.ln(E, cx - w, yy, cx + w, yy, BARK, y === h - 1 ? 10 : 5); } }
  }
  function face() {
    headXf();
    eye(-8, -52, 6); eye(13, -52, 6.5);
    brow([-19, -56], [-1, -59], -1); brow([27, -57], [7, -60], 1);
    part(); B.ell(E, -14, -41, 4.5, 3.4, 0.3, BARK); B.px(E, -15, -43, BARK, 8); B.px(E, -14, -43, BARK, 7);             // 颧骨上的树瘤
    part(); B.ell(E, 20, -42, 5, 3.8, -0.3, BARK); B.px(E, 18, -44, BARK, 8); B.px(E, 19, -44, BARK, 7);
    part(); B.poly(E, [[1, -59], [5, -59], [7, -47], [10, -42], [8, -38], [0, -38], [-2, -42], [1, -47]], BARK);         // 一长条树皮鼻梁，鼻头是个树瘤
    B.ln(E, 2, -58, 1, -46, BARK, 7); B.ln(E, 5, -57, 7, -46, BARK, 3); B.px(E, 2, -43, BARK, 8); B.px(E, 3, -44, BARK, 7); B.px(E, 1, -39, BARK, 10); B.px(E, 6, -39, BARK, 10);
    mouth();
  }
  function mouth() {   // 树瘤嘴：一圈鼓起的木唇，张开里面是黑洞，再张大就透出琥珀光；木刺当牙
    const J = P.jaw, ry = 1.2 + J * 1.5, cx = 3, cy = -32 + J * 0.5;
    part(); B.ell(E, cx, cy, 10, ry + 2.4, 0, BARK); B.ln(E, cx - 7, cy - ry - 2, cx + 7, cy - ry - 2, BARK, 8); B.ln(E, cx - 6, cy + ry + 2, cx + 6, cy + ry + 2, BARK, 3);
    part(); B.ell(E, cx, cy, 7.4, ry, 0, VOIDM);
    if (J >= 2) B.ell(E, cx, cy + 1, 4.4, Math.max(0.8, ry - 2), 0, P.glow >= 3 && J >= 3 ? AMB2 : AMB1);
    if (J) { for (const x of [-2, 1, 5, 8]) B.ln(E, x, cy - ry, x + 0.5, cy - ry + 1.5, BARK, 9); for (const x of [0, 6]) B.ln(E, x, cy + ry, x, cy + ry - 1.5, BARK, 8); }
  }
  function beard() {   // 下巴垂下来的青苔胡子，跟着树冠摆
    headXf(); const y0 = -27 + P.jaw * 1.3, s = P.sw * 0.7;
    part(); B.ell(E, 3, y0 + 1, 10, 2.6, 0, MOSS); for (let x = -5; x <= 11; x += 3) B.px(E, x, y0, MOSS, 7);          // 下巴上一片青苔
    [[-8, 7, 1.4, 0], [-5, 12, 1.8, 1], [-1, 9, 1.5, 2], [2, 14, 1.7, 0], [5, 16, 2, 1], [8, 10, 1.5, 2], [11, 12, 1.6, 0], [14, 6, 1.3, 1]].forEach(([x, len, r, g], i) => {   // 长短不一、一绺一绺往下垂，末梢打个弯
      if (g === 0 || i === 0) part(); const c = i & 1 ? 1 : -1, t = g === 1 ? 4 : 5;
      B.strand(E, [[x, y0 + 1], [x + c * 0.8 + s * 0.3, y0 + len * 0.45], [x - c * 0.6 + s * 0.7, y0 + len * 0.8], [x + c * 0.8 + s, y0 + len]], r, 0.5, MOSS, t);
      B.px(E, x - 0.5, y0 + 2, MOSS, 7); });
  }
  function arm(side) {   // 枝条手臂：两节多疙瘩的粗枝，肘上冒一枝带叶的嫩枝，手是四根细枝
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? BARKD : BARK, lf = P.wilt ? (far ? SERED : SERE) : (far ? LEAFD : LEAF);
    const nrm = (a, b, d) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * d, dx / l * d]; };
    part(); capW(sh[0], sh[1], el[0], el[1], 5.4, 4.2, m); { const n = nrm(sh, el, 1.5); lnW(sh[0] + n[0], sh[1] + n[1], el[0] + n[0], el[1] + n[1], m, 3); lnW(sh[0] - n[0] * 1.6, sh[1] - n[1] * 1.6, el[0] - n[0] * 1.6, el[1] - n[1] * 1.6, m, 7); }
    part(); dot(el[0], el[1], 4.6, m); B.pxW(E, el[0] - 1, el[1] - 2, m, 8);                                                           // 肘上的树瘤
    part(); capW(el[0], el[1], h[0], h[1], 4, 2.6, m); { const n = nrm(el, h, 1.2); lnW(el[0] + n[0], el[1] + n[1], h[0] + n[0], h[1] + n[1], m, 3); lnW(el[0] - n[0], el[1] - n[1], h[0] - n[0], h[1] - n[1], m, 7); }
    if (!far || true) { const tw = [el[0] + side * 5, el[1] - 7]; part(); capW(el[0], el[1] - 2, tw[0], tw[1], 1.3, 0.5, m); part(); B.ell(E, tw[0] + side * 2, tw[1] - 1, 3, 1.8, side * 0.5, lf); B.ell(E, tw[0] - side * 2, tw[1] + 1, 2.4, 1.5, -side * 0.6, lf); }   // 嫩枝和两片叶
    { const q = [el[0] + (h[0] - el[0]) * 0.55, el[1] + (h[1] - el[1]) * 0.55]; part(); B.ell(E, q[0], q[1] - 3, 2.6, 1.6, 0.4 * side, lf); }
    part(); dot(h[0], h[1], 3.3, m); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]);
    const fist = P.fist && !far, spear = P.spear && !far, spr = fist ? 0.3 : spear ? 0.1 : 0.42, len = fist ? 6 : spear ? 14 : 10 + (far ? 0 : 7 * P.ext), curl = fist ? 1.3 : spear ? 0 : 0.45;
    for (let i = 0; i < 4; i++) {
      const a = dir + (i - 1.5) * spr, r0 = [h[0] + Math.cos(a) * 2.6, h[1] + Math.sin(a) * 2.6], md = [r0[0] + Math.cos(a) * len * 0.55, r0[1] + Math.sin(a) * len * 0.55], a2 = a + curl * (i < 2 ? -1 : 1) * 0.6 + curl * 0.4, tp = [md[0] + Math.cos(a2) * len * 0.45, md[1] + Math.sin(a2) * len * 0.45];
      capW(r0[0], r0[1], md[0], md[1], 1.5, 1.0, m, i === 0 ? 7 : 5); capW(md[0], md[1], tp[0], tp[1], 1.0, 0.4, m, i === 0 ? 7 : 5);
      if (i === 1 && !fist && !spear) { B.pxW(E, tp[0], tp[1] - 1, lf, 6); B.pxW(E, tp[0] + 1, tp[1] - 1, lf, 5); }
    }
    if (P.ext > 0.4 && !far) for (let k = 0; k < 3; k++) { const q = 0.3 + k * 0.25, p = [el[0] + (h[0] - el[0]) * q, el[1] + (h[1] - el[1]) * q]; part(); B.ell(E, p[0], p[1] + 3, 2.2, 1.4, -0.4, lf); }   // 伸长的枝条上冒出新叶
  }
  function bigRoot(side) {   // 古根砸地的大根：从地里拱起来立成蛇形，再整条砸下去
    if (P.rt < 0.05 && P.rs < 0.05) return; const far = side < 0, m = far ? ROOTD : ROOT, pts = far ? L.rtF : L.rtN;
    B.reset(); part(); B.strand(E, pts, far ? 6.4 : 7.6, 1.8, m);
    for (let i = 1; i < pts.length - 1; i++) { B.cap(E, pts[i][0], pts[i][1], pts[i][0] + side * 5, pts[i][1] + 4, 1, 0.3, m); B.ln(E, pts[i - 1][0] - 1, pts[i - 1][1] - 2, pts[i][0] - 1, pts[i][1] - 2, m, 7); }
    if (P.glow >= 2 || P.hot) for (let i = 1; i < 4; i++) { B.ln(E, pts[i - 1][0] + 1, pts[i - 1][1] + 1, pts[i][0] + 1, pts[i][1] + 1, m, 10); B.ln(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i === 2 && P.glow >= 3 ? AMB2 : AMB1); }
    if (P.rt > 0.3) { part(); B.ell(E, pts[1][0] + side * 3, pts[1][1] - 2, 2.6, 1.8, 0, SOIL); B.ell(E, pts[2][0] - side * 2, pts[2][1] + 1, 1.8, 1.4, 0, SOIL); }   // 带出来的泥块
  }
  function orb() {   // 知识之果：双手之间越聚越大的一颗金果子，顶上一片叶
    const c = L.orb, r = 1.5 + P.orb * 1.2;
    part(); dot(c[0], c[1], r + 1, AMB1); dot(c[0], c[1], r, AMB2); dot(c[0] - 0.6, c[1] - 0.6, Math.max(0.6, r - 1.6), AMB3);
    part(); capW(c[0], c[1] - r, c[0] + 1, c[1] - r - 3, 0.8, 0.5, BARKD); B.ell(E, c[0] + 3, c[1] - r - 3, 2.4, 1.3, -0.4, LEAF);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    canopy(0); limbs(); bigRoot(-1); arm(-1); trunk(); groundRoots(); face(); beard(); canopy(1); fruits(); bigRoot(1); arm(1);
    if (P.orb) orb();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.core); RIM.ry = Y(L.core); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    const er = (P.lid >= 1 ? 0 : P.eyes >= 2 ? (P.glow >= 3 ? 13 : 10) : P.eyes ? 6 : 0) * z;
    LIGHTS[0].x = X(L.eyeF); LIGHTS[0].y = Y(L.eyeF); LIGHTS[0].r = er; LIGHTS[1].x = X(L.eyeN); LIGHTS[1].y = Y(L.eyeN); LIGHTS[1].r = er;
    LIGHTS[2].x = X(L.mouth); LIGHTS[2].y = Y(L.mouth); LIGHTS[2].r = (P.jaw >= 2 ? 6 + P.jaw * 2 : 0) * z;
    LIGHTS[3].x = X(L.orb); LIGHTS[3].y = Y(L.orb); LIGHTS[3].r = (P.orb ? 8 + P.orb * 4 : 0) * z;
    LIGHTS[4].x = X(L.core); LIGHTS[4].y = Y(L.core); LIGHTS[4].r = (P.hot ? 30 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里脸的位置（缓冲坐标）和半径：地图节点的头像从这里裁（整张脸 + 眉骨 + 下面一截树冠和果子）
  function portrait() {   // 立绘：正面，双臂半张、眉骨压低、嘴张开透光，满树果子亮着、树冠开花（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.7); P.hd = -0.05; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.fr = 2; P.brow = 0.6; P.lid = 0; P.by = 0; P.breath = 0; P.cw = 0; P.cs = 1; P.sw = 1; P.shiv = 0;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(3, -50); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 33 * 2]; return PSPR;
  }

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y, R_N = FXI.nature, R_E = FXI.earth, R_H = FXI.holy, rnd = Math.random;
  let emT = 0, lfT = 0;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'rootSlam') slamFx();
      else if (MV === 'branch') {
        const sh = L.shN; fx.slash(sx(sh[0]), sy(sh[1]), 66, -1.3, 0.7, 'nature', 0.26, 4, 2); fx.slash(sx(sh[0]), sy(sh[1]), 54, -1.1, 0.6, 'holy', 0.2, 2, 2);
        for (let i = 0; i < 26; i++) { const a = -1.3 + 2 * rnd(), r = 48 + rnd() * 20; spawnX(K_PHYS, sx(sh[0] + Math.cos(a) * r), sy(sh[1] + Math.sin(a) * r), 60 + rnd() * 120, (rnd() - 0.6) * 80, 0.8 + rnd() * 0.5, R_N, { g: 60, floor: HY + 4 }); }   // 横扫甩出去的叶子
        burst(sx(L.hN[0]), sy(L.hN[1]), 18, 60, 160, 0.25, 0.5, R_N, 10); shake(0.3, 3); flash(0.06); sfx('boss', { k: 'treeWhip', w: 1 }); sfx('swing', { kind: 'claw', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.8 });
      } else if (MV === 'fruit') {
        const o = [(L.hN[0] + L.hF[0]) / 2, Math.min(L.hN[1], L.hF[1]) - 6]; ring(sx(o[0]), sy(o[1]), 1, R_H); burst(sx(o[0]), sy(o[1]), 26, 60, 160, 0.3, 0.7, R_H, 10); fx.pillar(sx(o[0]), 0, sy(o[1]), 4, 'holy', 0.3);
        for (let i = 0; i < 8; i++) spawnX(K_PHYS, sx(o[0] + (rnd() - 0.5) * 40), sy(o[1]), (rnd() - 0.5) * 90, -150 - rnd() * 90, 0.9, R_H, { g: 120 });          // 抛上天的果子
        for (let i = 0; i < 16; i++) spawnX(K_PHYS, sx(-50 + rnd() * 100), sy(-70 - rnd() * 16), (rnd() - 0.5) * 60, -30 - rnd() * 40, 1.2, R_N, { g: 60, floor: HY + 4 });
        shake(0.25, 2); flash(0.1); sfx('boss', { k: 'throw', w: 1 }); sfx('boss', { k: 'treeChime', w: 1 });
      } else if (MV === 'poke') {
        const h = L.hN; fx.beam(sx(h[0] - 34), sy(h[1]), sx(h[0] + 12), sy(h[1]), 2, 'nature', 0.15, 2); burst(sx(h[0] + 6), sy(h[1]), 20, 60, 160, 0.2, 0.45, R_N, 0); ring(sx(h[0] + 8), sy(h[1]), 0, R_N);
        shake(0.2, 2); flash(0.05); sfx('swing', { kind: 'claw', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 1 });
      } else if (MV === 'rise' || MV === 'p2') {
        const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, R_H); ring(sx(L.crown[0]), sy(L.crown[1]), 1, R_N); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 44; i++) { const a = -Math.PI * rnd(); spawnX(K_PHYS, sx(L.crown[0] + (rnd() - 0.5) * 100), sy(L.crown[1] + (rnd() - 0.5) * 16), Math.cos(a) * (40 + rnd() * 100), Math.sin(a) * (40 + rnd() * 90), 1.0 + rnd() * 0.6, i % 3 ? R_N : R_H, { g: 90, floor: HY + 6 }); }
        sfx('boss', { k: 'treeGroan', w: 1 }); sfx('boss', { k: 'roar', w: 0.5 }); sfx('impact', { pal: 'nature', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'treeChime', w: 1 });
      }
    }
    if (s === CHARGE) {
      if (MV === 'rootSlam') { sfx('boss', { k: 'treeCreak', w: 0.8 }); sfx('boss', { k: 'growl', w: 0.4 }); }
      else if (MV === 'branch') sfx('boss', { k: 'treeCreak', w: 0.6 });
      else if (MV === 'fruit') sfx('boss', { k: 'treeChime', w: 0.5 });
      else if (MV === 'poke') sfx('boss', { k: 'treeCreak', w: 0.4 });
      else if (MV === 'rise') { sfx('boss', { k: 'treeCreak', w: 1 }); sfx('boss', { k: 'thud', w: 0.6 }); }
      else if (MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
    }
  }
  function slamFx() {   // 大根和双臂一起砸地：前面一大片、身后一小片（土浪、裂缝、泥块、落叶）
    for (const [x0, k] of [[L.rtN[4][0] - 6, 1], [L.rtF[4][0] + 6, 0.6]]) {
      const x = sx(x0), y = HY; fx.wave(x, y, 1, 44 * k, 10 * k, 'earth', 0.5, 2); fx.wave(x, y, -1, 34 * k, 8 * k, 'earth', 0.45, 2); fx.crack(x, y, 22 * k, 1, 'nature', 1.2); burst(x, y - 2, Math.round(22 * k), 60, 170, 0.35, 0.8, R_E, 50);
      for (let i = 0; i < 16 * k; i++) spawnX(K_PHYS, x + (rnd() - 0.5) * 14, y - 3, (rnd() - 0.5) * 150, -60 - rnd() * 150, 0.9 + rnd() * 0.5, i % 3 ? R_E : R_N, { g: 320, floor: HY + 2 });
    }
    ring(sx(L.rtN[4][0] - 6), HY - 2, 1, R_N); shake(0.35, 3); flash(0.08); sfx('impact', { pal: 'earth', w: 1 }); sfx('boss', { k: 'slam', w: 1 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'treeCreak', w: 0.3 });
    if (s === ATTACK && t === 3 / 12) { const h = L.hN; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 42, -0.9, 1.0, 'nature', 0.22, 3, 2); burst(sx(h[0]), sy(h[1]), 16, 50, 140, 0.25, 0.5, R_N, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'claw', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === MOVE) { burst(sx(L.hN[0]), sy(L.hN[1] + 2), 8, 30, 90, 0.2, 0.4, R_E, 60); sfx('boss', { k: 'thud', w: 0.4 }); }                    // 撑地往上拱
    if (s === HURT) { for (let i = 0; i < 10; i++) spawnX(K_PHYS, sx(-40 + rnd() * 80), sy(-70 - rnd() * 16), (rnd() - 0.5) * 60, -20 - rnd() * 30, 1.2, R_N, { g: 50, floor: HY + 4 }); sfx('boss', { k: 'treeCreak', w: 0.35 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'treeDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.8) {   // 叶子一下全枯、哗地掉下来
      for (let i = 0; i < 56; i++) spawnX(K_PHYS, sx(-62 + rnd() * 124), sy(-64 - rnd() * 26), (rnd() - 0.5) * 50, -10 - rnd() * 30, 1.4 + rnd(), i % 4 ? R_E : R_N, { g: 40, floor: HY + 4 });
      ring(sx(L.core[0]), sy(L.core[1]), 1, R_H); shake(0.3, 3); sfx('fall', { w: 1 });
    }
    if (s === DEATH && t === INCOMING + 1.9) { const x = sx(0); fx.wave(x, HY, 1, 44, 6, 'earth', 0.5, 2); fx.wave(x, HY, -1, 44, 6, 'earth', 0.5, 2); burst(x, HY - 4, 30, 40, 150, 0.4, 0.9, R_E, 60);
      for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + rnd() * 80), sy(-10 - rnd() * 40), 0, -14 - rnd() * 20, 0.9 + rnd() * 0.8, R_H); shake(0.4, 3); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === CHARGE) {
      if (MV === 'rootSlam') { for (const sd of [1, -1]) { burst(sx(sd * 30), HY - 2, 18, 50, 150, 0.3, 0.7, R_E, 60); for (let i = 0; i < 8; i++) spawnX(K_PHYS, sx(sd * (30 + rnd() * 16)), HY - 3, (rnd() - 0.5) * 90, -80 - rnd() * 110, 0.9, R_E, { g: 320, floor: HY + 2 }); }   // 大根破土
        shake(0.2, 2); sfx('boss', { k: 'thud', w: 0.8 }); sfx('hit', { mat: 'stone', w: 0.6 }); }
      else if (MV === 'branch') sfx('boss', { k: 'treeCreak', w: 0.5 });
      else if (MV === 'fruit') sfx('boss', { k: 'treeChime', w: 0.7 });
      else if (MV === 'rise') { for (const sd of [1, -1]) burst(sx(sd * (20 + rnd() * 20)), HY - 2, 14, 40, 130, 0.3, 0.6, R_E, 60); shake(0.15, 2); sfx('boss', { k: 'thud', w: 0.6 }); if (t === 1.2) sfx('boss', { k: 'treeCreak', w: 0.8 }); }
    }
  }
  const CH_EV = { rootSlam: [0.4], branch: [0.7], fruit: [0.65], poke: [], rise: [0.5, 1.2, 1.7], p2: [] };
  const EVENTS = [[], [1 / 12, 5 / 12], [1 / 12, 3 / 12], [], [], [], [INCOMING + 0.02], [INCOMING + 0.05, INCOMING + 0.8, INCOMING + 1.9], []];
  function stepFX(dt, state) {
    emT += dt; lfT += dt;
    if (lfT > (P.shiv ? 0.05 : 0.3)) { lfT = 0; spawnX(K_PHYS, sx(-56 + rnd() * 112), sy(-66 - rnd() * 16), (rnd() - 0.5) * 20, 6 + rnd() * 10, 1.6 + rnd() * 0.8, P.wilt ? R_E : R_N, { g: 14, floor: HY + 4 }); }   // 一直往下飘的落叶
    if (P.hot && emT > 0.08) { emT = 0; spawn(K_RISE, sx(-50 + rnd() * 100), sy(-70 - rnd() * 20), (rnd() - 0.5) * 8, -10 - rnd() * 10, 0.8 + rnd() * 0.6, R_H); }   // 第二阶段：树冠上飘起来的金色光尘
    if (state === CHARGE && MV === 'fruit' && P.orb && rnd() < 0.6) { const c = L.orb, a = rnd() * 6.2832, r = 12 + rnd() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + rnd() * 0.2), 0, 9, R_H, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'branch' && rnd() < 0.6) { const c = L.hN, a = rnd() * 6.2832, r = 12 + rnd() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + rnd() * 0.2), 0, 9, R_N, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'rootSlam' && P.rt > 0.3 && rnd() < 0.5) { const p = (rnd() < 0.5 ? L.rtN : L.rtF)[1 + Math.floor(rnd() * 3)]; spawnX(K_PHYS, sx(p[0]), sy(p[1]), (rnd() - 0.5) * 20, 10, 0.8, R_E, { g: 300, floor: HY + 2 }); }   // 大根上往下掉的土
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (rnd() < 0.5) spawnX(K_PHYS, sx(-30 + rnd() * 60), sy(-2), (rnd() - 0.5) * 60, -40 - rnd() * 60, 0.7, R_E, { g: 240, floor: HY + 4 }); }
  }
  function fxReset() { emT = 0; lfT = 0; }
  function fxBack(f12) { const x0 = sx(-48), x1 = sx(48); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + (f12 >> 1)) % 5) === 0) E.put(x, HY + 1, FXR[R_N][P.hot ? 2 : 3]); }   // 脚下一线青苔的微光
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'rootSlam'; EVENTS[CHARGE] = CH_EV[MV]; return MVDUR[MV]; }

  // 自己的声音（syn 里的函数和 mc-audio.js 同名同参数）
  const VOICES = {
    treeCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 72, 0.7, 0.05 + 0.04 * w, { to: 54, vib: [11, 18, 0.05], lp: 700, pan: p, rev: 0.3 }); s.nz(t, 0.6, 'bandpass', 420, 6, 0.05 * w, { pan: p }); s.crackle(t + 0.1, 0.25, 1800, 0.04 * w, { pan: p }); },   // 老木头吱嘎
    treeGroan: (s, t, w, p) => { s.tone(t, 'sawtooth', 55, 1.4, 0.08 + 0.05 * w, { to: 38, vib: [4, 30, 0.2], lp: 600, pan: p, rev: 0.6 }); s.choir(t, [31, 38], 1.5, 0.05 * w, { dark: 1, pan: p }); s.rumble(t, 1.2, 0.12 * w, { pan: p }); s.nz(t, 1.0, 'bandpass', 300, 4, 0.05, { pan: p }); },   // 古树长啸
    treeWhip: (s, t, w, p) => { s.whoosh(t, 0.3, 300, 2600, 0.08 + 0.05 * w, { pan: p }); s.nz(t + 0.05, 0.35, 'highpass', 3500, 0.7, 0.06 * w, { pan: p }); s.crackle(t + 0.12, 0.2, 2400, 0.05 * w, { pan: p }); },   // 枝条抽过去、叶子沙沙
    treeChime: (s, t, w, p) => { [72, 76, 79, 84].forEach((m, i) => s.bell(t + i * 0.07, m, 1.2, 0.04 + 0.03 * w, { pan: p })); s.riser(t, t + 0.6, 400, 3000, 0.03 * w, { pan: p }); },   // 知识之果的叮当
    treeDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 90, 2.0, 0.08 + 0.04 * w, { to: 30, vib: [6, 25, 0.1], lp: 700, pan: p, rev: 0.7 }); s.crackle(t + 0.3, 0.8, 1500, 0.1 * w, { pan: p }); s.thud(t + 1.2, 70, 30, 0.6, 0.25 * w, { pan: p }); s.nz(t + 0.9, 1.4, 'highpass', 2500, 0.7, 0.05, { pan: p }); },   // 断裂、倒下
  };

  return {
    name: '知识古树', HX, R_EL: FXI.nature, DUR, hero, P, GLOW_MATS: [AMB1, AMB2, AMB3, BLOOM], HIT_POINT: [3, -46], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'stone', how: 'dissolve', pal: 'nature', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['rootSlam', 'branch', 'fruit', 'poke', 'rise', 'p2'], MOVE_NAMES: { rootSlam: '古根砸地', branch: '枝条横扫', fruit: '知识之果（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.8, 1.2], 'rootSlam'], [CAST, [0, 2 / 12], 'rootSlam'], [RECOVER, [0.3], 'rootSlam'],
      [CHARGE, [0.3, 0.8, 1.3], 'branch'], [CAST, [0, 2 / 12], 'branch'], [RECOVER, [0.3], 'branch'],
      [CHARGE, [0.3, 0.8, 1.3], 'fruit'], [CAST, [0], 'fruit'], [RECOVER, [0.3], 'fruit'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.5, 1.4, 2.0], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 26, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 230, H: 140 });
