// 裁缝老太（小游戏 NPC · G012「裁缝老太」：把你的一名部队缝进你的影子里，让伤口合上）：矮小、驼成一张弓的老裁缝——
//   灰白发髻上两根长针朝天叉开、铜框圆眼镜（时不时反光）、苔绿针织三角披肩（尖角带流苏垂在驼背上）、褪色梅紫长裙、米白袖口；
//   后手捏一小块灰蓝布片、握一把黑柄大剪刀（刃向前伸出身前），前手捏一根引着紫线的缝衣针。站在阁楼地板左边、面朝右，油灯在右上：平时右前沿一格暖色轮廓光。
// 待机 = 低头飞快缝针；移动 = 碎步挪；攻击（每缝对一针）= 针往前一刺，一根紫线从针尖绷直到目标闪一下；
// 技能（六针全中）= 举起大剪刀、紫线绕身越转越紧、脚下缝出一圈平针 → 咔嚓一剪，一圈紫线从身上向外扩开、越扩越绷直 → 放下剪刀拍拍发髻；
// 受击（漏针）= 眼镜滑到鼻尖歪掉、人一激灵；死亡（退场）= 从发髻开始一行行拆成散线落在脚边，线堆缩成一个针插（两根长针插在上面），最后化成紫线光飘散。
// 骨架用 parts.rig（hunched 改），腿、长裙、手臂、头、头发用部件库；披肩、发髻长针、眼镜、剪刀、缝衣针、紫线、布片、线堆、针插是本模块的部件。
PCD.define('ShadowSeamstress', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_PHYS, K_SPIRAL, K_EMBER, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：紫线（白 → 淡紫 → 紫 → 深紫 → 靛，共享色板里的下标）；油灯暖光只做轮廓光（1 档 = 33 暖皮色）─────
  const R_EL = fxRamp('thread', [21, 43, 24, 42, 25]), EL = FXR[R_EL];
  const LAMP = [21, 47, 33, 16, 20];

  // ───── 材质 ─────
  const PLUM = [52, 53, 54, 60];                                         // 褪色梅紫（亮部用洗旧的灰蓝）
  const M = parts.mats(E, {
    dress: PLUM, sleeve: PLUM, shawl: 'moss', cuff: 'bone', scrap: 'pale',
    skin: 'skin', hair: 'white', stock: [0, 27, 27, 28], shoe: [0, 27, 28, 29],
    brass: { r: 'gold', flat: 1 }, ink: { r: 'ink', flat: 1 }, lens: { r: [8, 59, 60, 21], flat: 1 },
    blade: [27, 29, 30, 31], grip: [27, 28, 29, 30], pin: { r: [27, 29, 30, 31], flat: 1 },
    thr: { r: [42, 42, 24, 43], flat: 1 }, thrHot: { r: [42, 43, 21, 21], flat: 1 }, thrDim: { r: [52, 52, 42, 42], flat: 1 },
    cush: 'crimson',
  });
  const BODY = { body: 'hunched', leg: 6, torso: 8, head: 6, headW: 6, hunch: 4, sw: 3, arm: 7, lw: 2, stride: 2, lift: 1, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(56, 44, 26, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 30, 16, 22], rimRamp: LAMP, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'pin', 'thr', 'thrHot', 'thrDim', 'brass', 'ink', 'lens', 'grip', 'scrap', 'blade']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const THR = [[M.thr, 3], [M.thr, 4], [M.thrHot, 3], [M.thrHot, 3], [M.thrDim, 3]];   // 紫线 5 档：待机 · 蓄力 · 蓄满 · 施放 · 熄灭
  const THC = [[EL[2], EL[1]], [EL[1], EL[1]], [EL[1], EL[0]], [EL[0], EL[0]], [EL[3], EL[3]]];   // 画在特效层的紫线：[线身, 针眼那一头]

  // ───── 姿势：前手 hx/hy 捏针（nd 针的朝向 0–7），后手 bhx/bhy 握剪刀（sd 朝向，so 张开 0–2）+ 捏布片 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, nd: 0, sd: 0, so: 0, thr: 0, scrap: 1, lean: 0, head: 0, hdn: 0, crouch: 0, bob: 0, bx: 0, jump: 0,
    step: 0, wup: 0, walk: 0, sway: 0, beard: 0, eyes: 0, flash: 0, glint: 0, gl: 0, gem: 0, rim: 0, rv: 0, pinT: 0, pat: 0, armUp: 0,
    cut: 0, heap: 0, pc: 0, drop: 0, shY: 0, gls: 0, dq: 0, dqi: 0, lying: 0, lift: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(13, -10, 8, -5);
  const K_WIND = K(9, -12, 8, -5, -1, 0);                  // 攻击：针收到下巴前
  const K_STAB = K(16, -9, 8, -5, 1, 1);                   //       往前一刺
  const K_HOLD = K(15, -9, 8, -5, 1, 0);
  const K_RAISE = K(12, -7, 15, -15, -1, -1);              // 蓄力：剪刀往前上方举高（刃朝上），针手在身前
  const K_SNIP = K(11, -7, 16, -13, 1, 1);                 // 施放：剪刀往前上方一合
  const K_PAT = K(3, -18, 8, -5, 0, 0);                    // 收招：拍发髻
  const K_HURT = K(11, -14, 7, -7, -1, -1);
  const K_SAG = K(9, -5, 6, -3, 1, 1, 2);                  // 死亡：驼得更低、手垂下
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -8, 24], ['hy', -26, 2], ['bhx', -8, 24], ['bhy', -26, 2], ['nd', 0, 7], ['sd', 0, 7], ['so', 0, 2], ['scrap', 0, 1],
    ['lean', -1, 2], ['head', -1, 1], ['hdn', 0, 1], ['crouch', 0, 3], ['bob', 0, 1], ['bx', -8, 8], ['jump', 0, 2], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1],
    ['sway', -2, 2], ['beard', -2, 2], ['eyes', 0, 1], ['flash', 0, 1], ['glint', 0, 2], ['gl', 0, 2], ['gem', 0, 4], ['rim', 0, 3], ['rv', 0, 1], ['pinT', 0, 1], ['pat', 0, 1], ['armUp', 0, 1],
    ['cut', 0, 22], ['heap', 0, 5], ['pc', 0, 3], ['drop', 0, 1], ['shY', -6, 0], ['gls', 0, 3], ['dqi', 0, 24], ['st', 0, 8]]);
  const FRINGE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  // 待机缝针：一针 4 帧 [手 x, 手 y, 针朝向, 线]（线：1 线头 · 2 从布片绷到针眼 · 3 松垂）——扎下去 → 针尖朝上抽出 → 抽到最高 → 翻过来再扎
  const STITCH = [[13, -10, 5, 3], [13, -12, 1, 2], [14, -14, 2, 2], [13, -12, 6, 3]];
  const PULL = [[15, -15, 2], [16, -17, 2], [16, -17, 2], [15, -14, 1]];           // 抻一长线
  const T_STAB = 2 / 12, T_PAT1 = 0.33, T_DROP = INCOMING + 0.34, T_GLS = INCOMING + 0.72, T_PC = INCOMING + 1.42, T_GLEAM = INCOMING + 1.8;
  const CUT0 = INCOMING + 0.45, CUT1 = INCOMING + 1.2, DQ0 = INCOMING + 2.1, DQ1 = INCOMING + 2.55, CUT_ROWS = 22, TOP_Y = -22;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.jump = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.eyes = 0; P.flash = 0; P.glint = 0; P.gl = 0; P.gem = 0; P.rim = 1;
    P.pinT = 0; P.pat = 0; P.armUp = 0; P.rv = 0; P.cut = 0; P.heap = 0; P.pc = 0; P.drop = 0; P.shY = 0; P.gls = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    P.nd = 6; P.sd = 0; P.so = 0; P.thr = 3; P.scrap = 1; P.hdn = 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FRINGE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const f = f12of(tq % DUR[IDLE]);
      if (f < 12 || (f >= 16 && f < 20)) { const c = STITCH[f & 3]; P.hx = c[0]; P.hy = c[1]; P.nd = c[2]; P.thr = c[3]; }            // 飞快缝针（一针 4 帧）
      else if (f < 16) { const c = PULL[f - 12]; P.hx = c[0]; P.hy = c[1]; P.nd = c[2]; P.thr = 2; P.beard = -1; }                    // 抻一长线
      else { P.hx = 13; P.hy = -10; P.nd = 5; P.thr = 3; if (f >= 21 && f < 25) { P.hdn = 0; P.glint = f === 22 ? 2 : f === 23 ? 1 : 0; } }   // 抬头眯一下，镜片反光
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 碎步挪：步幅 2、抬脚 1，裙摆和流苏反向甩
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq));
      P.hx = 12; P.hy = -9; P.sway = -P.step * 2 || P.sway; P.beard = -P.step; P.thr = 3; P.nd = 5; P.hdn = P.step !== 0 ? 1 : 0;   // 每落一步点一下头
      const w = walkDemo(tq, 8, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      P.nd = 0; P.hdn = 0; P.thr = 3;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < 0.2) { setK(K_STAB, K_STAB, 0); P.gem = 2; P.beard = -1; P.sway = -1; P.thr = 0; }
      else if (tq < 0.45) { setK(K_STAB, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; P.thr = 0; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); if (tq >= 0.6) { P.nd = 5; P.hdn = 1; } }
    } else if (st === CHARGE) {                                        // 举起大剪刀，刃慢慢张开，线越转越紧
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_RAISE, q);
      P.sd = q < 0.35 ? 0 : q < 0.7 ? 1 : 2; P.so = tq < 0.4 ? 0 : tq < 0.8 ? 1 : 2; P.scrap = q < 0.3 ? 1 : 0; P.hdn = 0;
      P.nd = 2; P.thr = 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.rv = 1; P.beard = -1; P.sway = tq > 1.1 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === CAST) {                                          // 咔嚓：剪刀往前上方一合
      setK(K_RAISE, K_SNIP, ease.out(clamp01(tq / 0.12))); P.sd = 1; P.so = 0; P.scrap = 0; P.hdn = 0;
      P.nd = 2; P.thr = 0; P.gem = 3; P.rim = 3; P.rv = 1; P.beard = 2; P.sway = -1;
    } else if (st === RECOVER) {                                       // 放下剪刀，前手拍两下发髻
      P.hdn = 0; P.nd = 2; P.thr = 1; P.gem = tq < 0.25 ? 2 : tq < 0.5 ? 1 : 0; P.rim = tq < 0.25 ? 2 : 1; P.rv = tq < 0.25 ? 1 : 0;
      if (tq < 0.25) { const q = ease.inOut(tq / 0.25); setK(K_SNIP, K_IDLE, q); P.sd = q < 0.5 ? 1 : 0; P.scrap = q > 0.6 ? 1 : 0; P.hx = RD(K_SNIP.hx + (K_PAT.hx - K_SNIP.hx) * q); P.hy = RD(K_SNIP.hy + (K_PAT.hy + 2 - K_SNIP.hy) * q); P.armUp = q > 0.4 ? 1 : 0; }
      else if (tq < 0.58) { setK(K_IDLE, K_IDLE, 0); const k = f12of(tq - 0.25); P.hx = K_PAT.hx; P.hy = K_PAT.hy + ((k & 1) ? 1 : 0); P.pat = (k & 1) ? 1 : 0; P.armUp = 1; P.eyes = (k & 1) ? 1 : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.58) / 0.12)); setK(K_PAT, K_IDLE, q); P.armUp = q < 0.5 ? 1 : 0; P.hdn = q < 0.5 ? 0 : 1; P.nd = q < 0.5 ? 2 : 5; }
    } else if (st === HURT) {                                          // 漏针：眼镜滑歪、一激灵
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.jump = h < 2 / 12 ? 1 : 0; P.eyes = 1; P.gl = 2; P.pinT = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.nd = 3; P.thr = 4; P.so = 1; P.hdn = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.gl = 2; P.beard = 1; P.rim = 0; P.nd = 3; P.thr = 3; P.hdn = 0; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K_HURT, K_IDLE, q); P.hx = RD(11 + (K_IDLE.hx - 11) * q); P.hy = RD(-12 + (K_IDLE.hy + 12) * q); P.gl = q < 0.5 ? 1 : 0; P.nd = q < 0.5 ? 1 : 5; P.thr = 3; P.hdn = q < 0.5 ? 0 : 1; }
    } else if (st === DEATH) {                                         // 拆线 → 线堆 → 针插 → 消散
      const d = tq - INCOMING; P.rim = 0; P.thr = 3;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.jump = d < 2 / 12 ? 1 : 0; P.eyes = 1; P.gl = 2; P.pinT = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = 1; P.nd = 3; P.thr = 4; P.hdn = 0; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_SAG, K_SAG, 0); P.bx = -1; P.eyes = 1; P.gl = 2; P.hdn = 1; P.nd = 6; P.scrap = 0; P.thr = 0; P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4;
        P.drop = d >= T_DROP - INCOMING ? 1 : 0; P.shY = P.drop ? Math.max(0, 2 - f12of(d - (T_DROP - INCOMING))) * -2 : 0;
        const c = clamp01((d - (CUT0 - INCOMING)) / (CUT1 - CUT0)); P.cut = RD(Math.pow(c, 0.6) * CUT_ROWS);   // 头和发髻拆得快，身子拆得慢
        P.heap = d < CUT0 - INCOMING ? 0 : Math.min(5, 1 + Math.floor(c * 5 + 1e-6));
        P.gls = d < T_GLS - INCOMING ? 0 : Math.min(3, 1 + f12of(d - (T_GLS - INCOMING)));
        if (d >= T_PC - INCOMING - 0.17) { P.heap = 5; P.pc = d < T_PC - INCOMING - 1 / 12 ? 1 : d < T_PC - INCOMING ? 2 : 3; }
        if (d >= T_GLEAM - INCOMING && d < T_GLEAM - INCOMING + 2 / 12) P.glint = 1;
        if (d >= DQ0 - INCOMING) P.dq = clamp01((d - (DQ0 - INCOMING)) / (DQ1 - DQ0));
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 24);
    if (P.crouch) { P.hy += Math.min(2, P.crouch); P.bhy += Math.min(2, P.crouch); }
    const f = focus(); P.gx = f[0] + P.bx; P.gy = f[1] - P.jump;
    KEY(P);
  }
  // 发光体挂点：技能里是剪刀刃中段，死后是针插，其余是针尖
  function focus() {
    if (P.st === CHARGE || P.st === CAST || (P.st === RECOVER && P.gem >= 2)) { const d = DIRS[P.sd]; return [P.bhx + d[0] * 5, P.bhy + d[1] * 5]; }
    if (P.st === DEATH && P.pc) return [0, -5];
    const d = DIRS[P.nd]; return [P.hx + d[0] * 3, P.hy + d[1] * 3];
  }
  const needleEye = () => { const d = DIRS[P.nd]; return [P.hx - d[0] * 2 + P.bx, P.hy - d[1] * 2 - P.jump]; };
  const stitchPt = () => [P.bhx + 4 + P.bx, P.bhy - 3 - P.jump];

  // ───── 画（部件从后往前）─────
  const DIRS = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]];   // 0 右 · 1 右上 · 2 上 · 3 左上 · 4 左 · 5 左下 · 6 下 · 7 右下
  const frameAt = (r0, x, y) => ({ r0, tx: x, ty: y, rot: 0, ox: 0, oy: 0 });
  const ringPts = (cx, cy) => [[cx - 1, cy - 1], [cx, cy - 1], [cx + 1, cy - 1], [cx - 1, cy], [cx + 1, cy], [cx - 1, cy + 1], [cx, cy + 1], [cx + 1, cy + 1]];
  const K3 = (a, c) => a.map((p) => [p[0], p[1], c]);
  // 候选部件：shears —— 大剪刀（朝右的横版 H、朝右上的斜版 D，按 90° 旋转出 8 个朝向；张开 0–2 档）
  //   两个黑铁指环（3×3，中间镂空的那格烘焙后是勾线色 = 指环的孔）+ 铜铆钉 + 两片长刃（上刃亮边、下刃暗面、刃尖亮）；握点 (0, 0) 是后手的位置
  //   格式：[x, y, 码]，码：k 柄 · b 刃 · B 刃亮边（技能里换成发光的紫线色）· d 刃暗面 · e 刃尖 · p 铆钉
  const SH = {
    H: [
      [...K3(ringPts(-3, -2), 'k'), ...K3(ringPts(-2, 2), 'k'), [1, -1, 'p'],
        [2, -1, 'B'], [3, -1, 'B'], [4, -1, 'B'], [5, -1, 'b'], [6, -1, 'b'], [1, 0, 'b'], [2, 0, 'b'], [3, 0, 'd'], [4, 0, 'd'], [5, 0, 'd'], [6, 0, 'd'], [7, 0, 'b'], [8, 0, 'e']],
      [...K3(ringPts(-3, -3), 'k'), ...K3(ringPts(-2, 3), 'k'), [1, -1, 'p'],
        [2, -1, 'B'], [2, -2, 'B'], [3, -2, 'B'], [4, -2, 'b'], [5, -3, 'b'], [6, -3, 'b'], [7, -4, 'e'],
        [1, 0, 'b'], [2, 0, 'd'], [3, 1, 'd'], [4, 1, 'd'], [5, 2, 'd'], [6, 2, 'b'], [7, 3, 'e']],
      [...K3(ringPts(-3, -3), 'k'), ...K3(ringPts(-2, 3), 'k'), [1, -1, 'p'],
        [2, -1, 'b'], [2, -2, 'B'], [3, -3, 'B'], [3, -2, 'b'], [4, -4, 'B'], [4, -3, 'b'], [5, -5, 'b'], [6, -6, 'e'],
        [1, 0, 'b'], [2, 1, 'd'], [3, 1, 'd'], [3, 2, 'd'], [4, 3, 'd'], [4, 2, 'b'], [5, 4, 'b'], [6, 5, 'e']],
    ],
    D: [
      [...K3(ringPts(-3, 1), 'k'), ...K3(ringPts(-1, 3), 'k'), [1, -1, 'p'],
        [2, -2, 'b'], [3, -3, 'b'], [4, -4, 'b'], [5, -5, 'b'], [6, -6, 'b'], [7, -7, 'e'], [2, -1, 'd'], [3, -2, 'd'], [4, -3, 'd'], [5, -4, 'd'], [1, -2, 'B'], [2, -3, 'B'], [3, -4, 'B'], [4, -5, 'B']],
      [...K3(ringPts(-3, 0), 'k'), ...K3(ringPts(0, 3), 'k'), [1, -1, 'p'],
        [1, -2, 'B'], [1, -3, 'B'], [2, -3, 'b'], [2, -4, 'B'], [2, -5, 'b'], [3, -6, 'b'], [3, -7, 'e'],
        [2, -1, 'b'], [3, -1, 'd'], [3, -2, 'b'], [4, -2, 'd'], [5, -2, 'd'], [6, -3, 'b'], [7, -3, 'e']],
    ],
  };
  const R0 = [0, 0, 3, 3, 2, 2, 1, 1];
  function shears(x, y, d, open, glow) {
    const T = frameAt(R0[d], x, y), set = (d & 1) ? SH.D[open ? 1 : 0] : SH.H[open];
    E.part(); for (const [a, b, c] of set) if (c === 'k') px(E, T, a, b, M.grip, 0);
    E.part();
    for (const [a, b, c] of set) {
      if (c === 'k') continue;
      if (c === 'p') px(E, T, a, b, M.brass, 4);
      else if (c === 'B') { if (glow) px(E, T, a, b, THR[glow][0], THR[glow][1]); else px(E, T, a, b, M.blade, 4); }
      else px(E, T, a, b, M.blade, c === 'd' ? 2 : c === 'e' ? 4 : 0);
    }
  }
  // 候选部件：floorShears —— 掉在地上的剪刀（平放：两个指环并排，刃贴地）
  function floorShears(x) {
    const T = parts.FREE; E.part();
    for (const p of ringPts(x - 5, -1)) px(E, T, p[0], p[1], M.grip, 0); for (const p of ringPts(x - 2, -1)) px(E, T, p[0], p[1], M.grip, 0);
    E.part(); px(E, T, x, -1, M.brass, 4); run(E, T, -1, x + 1, x + 5, M.blade, 4); run(E, T, 0, x, x + 7, M.blade, 0); px(E, T, x + 7, 0, M.blade, 4);
  }
  // 缝衣针：6 格（针眼穿着紫线 = 发光体、针尖亮一级），(x, y) 是捏针的位置（被手盖住）
  function needle(T, x, y, d, lv) {
    const [dx, dy] = DIRS[d]; E.part();
    px(E, T, x - dx * 2, y - dy * 2, THR[lv][0], THR[lv][1]); for (let k = -1; k <= 2; k++) px(E, T, x + dx * k, y + dy * k, M.pin, 3); px(E, T, x + dx * 3, y + dy * 3, M.pin, 4);
  }
  // 候选部件：knitShawl —— 针织三角披肩：包住后颈和两肩、驼峰上鼓一格，过了驼峰直直垂下；下沿从前肩斜到背后的尖角，尖角带 3 缕流苏（随 beard 摆）；
  //   前襟顺着胸口垂下一条；隔两列一道竖纹 + 起针边亮一行 = 针织。读 P.beard
  function knitShawl(R) {
    E.part(); const T = R, m = M.shawl, yS = R.yS, tip = yS + 6, b = RD(P.beard || 0);
    let backMin = 99; const rows = [];
    for (let y = yS - 1; y <= tip; y++) {
      const e = parts.edges(R, CL(y, yS, R.yHip)); let L = e[0] - 1; backMin = Math.min(backMin, L); if (y > yS + 1) L = backMin;
      let Rr;
      if (y === yS - 1) { L = e[0]; Rr = R.hx0 - 1; }
      else if (y <= yS + 2) Rr = e[1] + 1;
      else Rr = RD(L + (e[1] + 1 - L) * (tip - y) / (tip - yS - 2));                                                     // 下沿：前肩 → 背后尖角
      if (y === tip) Rr = L + 1;
      run(E, T, y, L, Rr, m, 0); rows.push([y, L, Rr]);
      if (y > yS) for (let x = L + 2; x < Rr; x++) if (((x - L) % 3) === 2) px(E, T, x, y, m, 2);                         // 竖纹
    }
    for (const [y, L, Rr] of rows) if (y === yS) for (let x = L + 1; x <= Rr - 1; x++) if (((x - L) & 1) === 1) px(E, T, x, y, m, 4);   // 起针边
    for (let y = yS + 1; y <= yS + 5; y++) { const e = parts.edges(R, y); px(E, T, e[1], y, m, 0); px(E, T, e[1] + 1, y, m, y === yS + 5 ? 2 : 0); }   // 前襟垂下的一条
    const tx = backMin;                                                                                               // 流苏：3 缕，从尖角垂下
    px(E, T, tx - 1 + (b < 0 ? -1 : 0), tip + 1, m, 3); px(E, T, tx - 1 + b, tip + 2, m, 2);
    px(E, T, tx, tip + 1, m, 3); px(E, T, tx + (b > 0 ? 1 : 0), tip + 2, m, 3); px(E, T, tx + b, tip + 3, m, 2);
    px(E, T, tx + 1, tip + 1, m, 2); px(E, T, tx + 2 + (b > 0 ? 1 : 0), tip + 2, m, 2);
  }
  // 头 + 眼镜（同一个部件：眼镜贴在脸上不压分界线）。眼镜 = 铜框菱形小圈 + 圈里的眼；gl 1 滑到鼻尖、2 滑歪；glint 镜片反光
  function headGlasses(R) {
    const h = parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'old', eye: M.ink, nose: 'big', mouth: 'line', ear: 'dot', brow: M.hair });
    if (P.gls) return;                                                                                                // 眼镜已经掉了
    const T = R, cx = h.eye[0] + (P.gl ? 1 : 0), cy = h.ey + (P.gl ? 1 : 0), tilt = P.gl === 2 ? 1 : 0;
    px(E, T, cx, cy - 1 + tilt, M.brass, P.glint ? 4 : 3); px(E, T, cx - 1, cy - tilt, M.brass, 3); px(E, T, cx + 1, cy, M.brass, 3); px(E, T, cx, cy + 1, M.brass, 3);
    px(E, T, cx, cy, P.glint ? M.lens : (P.gl || P.eyes ? M.lens : M.ink), P.glint ? 4 : P.gl || P.eyes ? 3 : 1);   // 镜片：反光白 / 滑开后是空镜片
    if (P.gl && !P.eyes) px(E, T, h.eye[0], h.ey, M.ink, 1);                                                           // 眼镜滑开后露出的眼
    px(E, T, cx - 2, cy - tilt, M.brass, 2);                                                                          // 镜腿
  }
  // 头发 + 发髻（同一个部件）：灰白短发贴头 + 后脑两列；发髻在头顶偏后（拍的时候扁一格）
  function hairBun(R) {
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
    const T = R, x0 = R.hx0, top = R.htop, sq = P.pat ? 1 : 0, m = M.hair;
    run(E, T, top - 2, x0 - 2, x0 + 2, m, 0); run(E, T, top - 3 + sq, x0 - 2, x0 + 2, m, 0); if (!sq) run(E, T, top - 4, x0 - 1, x0 + 1, m, 0);
    px(E, T, x0 - 3, top - 2 + sq, m, 0); px(E, T, x0 + 3, top - 2, m, 0);
    px(E, T, x0, top - 3 + sq, m, 2); px(E, T, x0 + 1, top - 2, m, 2); px(E, T, x0 - 1, top - 2, m, 2);                  // 盘绕纹
    px(E, T, x0 - 1, top - 4 + sq, m, 4);
  }
  // 发髻上的两根长针（朝天叉开）：后倾那根针眼挂一截紫线尾，前倾那根顶一颗铜珠；pinT 受击时往后仰一格
  function hairPins(R) {
    E.part(); const T = R, x0 = R.hx0, top = R.htop + (P.pat ? 1 : 0), b = RD(P.beard || 0), tl = P.pinT;
    for (let k = 0; k < 6; k++) px(E, T, x0 - 1 - (k >> 1) - (tl && k >= 4 ? 1 : 0), top - 3 - k, M.pin, k === 5 ? 2 : 3);           // 后倾长针
    for (let k = 0; k < 5; k++) px(E, T, x0 + 1 + (k >> 1) - (tl && k >= 3 ? 1 : 0), top - 3 - k, M.pin, 3);                      // 前倾长针
    px(E, T, x0 + 3 - tl, top - 8, M.brass, 4);                                                                      // 铜珠
    const ex = x0 - 3 - tl, ey = top - 8, lv = P.st === DEATH && P.gem === 4 ? 4 : 0;                                   // 线尾
    E.part(); px(E, T, ex - 1, ey + 1, THR[lv][0], THR[lv][1]); px(E, T, ex - 1 - (b < 0 ? 1 : 0), ey + 2, THR[lv][0], THR[lv][1]); px(E, T, ex - 1 + (b > 0 ? 1 : 0) - (b < 0 ? 1 : 0), ey + 3, THR[lv][0], THR[lv][1]);
  }
  // 布片：后手捏着的一小块灰蓝布（5×3，右下角垂下一格），中间一行紫色平针
  function scrap(bx, by) {
    E.part(); const T = parts.FREE;
    run(E, T, by - 3, bx, bx + 3, M.scrap, 0); run(E, T, by - 2, bx - 1, bx + 3, M.scrap, 0); run(E, T, by - 1, bx - 1, bx + 2, M.scrap, 0); px(E, T, bx + 3, by, M.scrap, 2);
    px(E, T, bx, by - 2, M.thr, 3); px(E, T, bx + 2, by - 2, M.thr, 3);
  }
  // 线堆（死亡）：一堆缠在一起的散线，颜色按身上的材质交错，顶上翘几个线圈
  const YARN = [M.dress, M.shawl, M.hair, M.dress, M.cuff, M.shawl];
  function yarnHeap(n, churn) {
    if (!n) return; E.part(); const T = parts.FREE, w = 4 + n, h = Math.min(5, 1 + n);
    for (let j = 0; j < h; j++) {
      const y = -j, hw = RD(w - j * (w / h) * 0.9);
      for (let x = -hw; x <= hw; x++) { const band = Math.floor((x + 12 + 2 * Math.sin((j + churn) * 1.7 + x * 0.5)) / 2.2) + j * 2 + churn; const mm = YARN[((band % 6) + 6) % 6]; px(E, T, x, y, mm, ((x + j + churn) & 3) === 0 ? 2 : ((x - j) & 3) === 1 ? 4 : 3); }
    }
    for (const [x, c] of [[-2, 0], [1, 1], [3, 2]]) if (Math.abs(x) < w - 1) { const y = -h; px(E, T, x + churn % 2, y, YARN[c], 3); px(E, T, x + 1 + churn % 2, y - (n > 3 ? 1 : 0), YARN[c], 4); }
  }
  // 针插（死亡）：酒红针插 + 苔绿蒂 + 腰上缠一圈紫线 + 发髻上那两根长针插在上面；stage 1 = 线团收拢（还是花的），2 = 针插
  function pincushion(stage) {
    const T = parts.FREE;
    if (stage === 1) { E.part(); for (let y = -4; y <= 0; y++) { const hw = y === -4 ? 2 : y === 0 ? 3 : 4; for (let x = -hw; x <= hw; x++) px(E, T, x, y, YARN[((x + y * 2 + 12) >> 1) % 6], ((x + y) & 1) ? 3 : 2); } return; }
    E.part(); const c = M.cush;
    run(E, T, -5, -2, 2, c, 0); run(E, T, -4, -3, 3, c, 0); for (let y = -3; y <= -1; y++) run(E, T, y, -4, 4, c, 0); run(E, T, 0, -3, 3, c, 0);
    for (let y = -4; y <= 0; y++) { px(E, T, y === -4 || y === 0 ? -1 : -2, y, c, 2); px(E, T, y === -4 || y === 0 ? 1 : 2, y, c, 2); }   // 两道分瓣缝
    px(E, T, -3, -4, c, 4); px(E, T, -2, -5, c, 4); px(E, T, -3, -3, c, 4);
    const lv = P.dq > 0 ? 4 : 0; for (let x = -4; x <= 4; x++) if ((x & 1) === 0) px(E, T, x, -2, THR[lv][0], THR[lv][1]);   // 缠一圈紫线
    E.part(); px(E, T, -1, -6, M.shawl, 0); px(E, T, 0, -6, M.shawl, 0); px(E, T, 1, -6, M.shawl, 0); px(E, T, 0, -7, M.shawl, 3); px(E, T, -2, -5, M.shawl, 2); px(E, T, 2, -5, M.shawl, 2);   // 蒂
    E.part(); const g = P.glint;
    for (let k = 0; k < 5; k++) px(E, T, -3 - (k >> 1), -5 - k, M.pin, k === 4 ? (g ? 4 : 2) : 3);                    // 长针 1（后倾）
    for (let k = 0; k < 4; k++) px(E, T, 2 + (k >> 1), -5 - k, M.pin, g && k === 3 ? 4 : 3); px(E, T, 3, -9, M.brass, 4);   // 长针 2 + 铜珠
    px(E, T, -4, -1, M.brass, 4); px(E, T, 3, -3, M.brass, 4);                                                        // 两颗大头针
  }
  // 地上的眼镜（n 1–2 在往下掉，3 落地）
  function floorGlasses(x, n) {
    E.part(); const T = parts.FREE, y = n >= 3 ? -1 : -1 - (3 - n) * 3;
    px(E, T, x, y - 1, M.brass, 4); px(E, T, x - 1, y, M.brass, 3); px(E, T, x + 1, y, M.brass, 3); px(E, T, x, y + 1, M.brass, 3); px(E, T, x, y, M.lens, 3); px(E, T, x - 2, y + 1, M.brass, 2);
  }
  // 拆线：本地 y 小于切口的像素删掉（切口按列参差 ±1）
  function cutTop(yc) {
    const s = hero, w = s.w, sy = yc + s.oy;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) { const j = ((x * 7 + 3) % 5 === 0) ? -1 : ((x * 3) % 4 === 1) ? 1 : 0; if (y < sy + j) s.mat[y * w + x] = 0; }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.jump);
    if (P.st === DEATH && P.pc >= 1) { endScene(); return; }
    const R = parts.rig(P, BODY);
    if (P.hdn) { R.hx += 1; R.hx0 += 1; R.hx1 += 1; R.hy += 1; R.htop += 1; R.ey += 1; }
    const lv = P.gem;
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.cuffD, grip: 'none', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'shoe', mat: M.stock, matD: M.stockD, boot: M.shoe, bootD: M.shoeD, w: 2 });
    parts.torso(E, R, P, { style: 'robe', mat: M.dress, hem: -2, flare: 2.5, flareF: 1.5 });
    if (!P.armUp) parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.cuff, grip: 'none', at: [P.hx, P.hy] });
    knitShawl(R);
    headGlasses(R);
    hairBun(R);
    hairPins(R);
    if (!P.drop) shears(P.bhx, P.bhy, P.sd, P.so, P.st === CHARGE || P.st === CAST || (P.st === RECOVER && lv >= 2) ? Math.max(1, lv) : 0);
    needle(R, P.hx, P.hy, P.nd, lv);                                                                     // 针在布片之前：扎进布里时针尖被布盖住
    if (P.scrap) scrap(P.bhx + 1, P.bhy - 1);
    parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.skinD });
    if (P.armUp) parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.cuff, grip: 'none', at: [P.hx, P.hy], elbow: P.st === RECOVER ? 'out' : undefined });   // 拍发髻：手肘往后抬，前臂从头发上面绕过去，不挡脸
    parts.hand(E, R, P, { at: [P.hx, P.hy], hand: M.skin });
    if (P.st === DEATH) {
      if (P.cut) cutTop(TOP_Y + P.cut);
      yarnHeap(P.heap, 0);
      if (P.drop) { if (P.shY) shears(14, -3 + P.shY, 0, 0, 0); else floorShears(16); }
      if (P.gls) floorGlasses(8, P.gls);
    }
  }
  function endScene() {                                                  // 线堆收拢 → 针插；剪刀、眼镜在地上
    if (P.pc === 1) { yarnHeap(5, 1); pincushion(1); } else pincushion(2);
    floorShears(16); floorGlasses(8, 3);
  }
  function bakeHero() {
    if (P.rv) { RIM.rimRamp = EL; RIM.rimR = [0, 8, 16, 22]; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    else { RIM.rimRamp = LAMP; RIM.rimR = [0, 30, 30, 30]; RIM.rx = hero.ox + 26 + P.bx; RIM.ry = hero.oy - 24; }
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let tautT = 9, tX0 = 0, tY0 = 0, tX1 = 0, tY1 = 0, castT = 9, snX = 0, snY = 0, hitDone = 1, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, xT = 9, xX = 0, xY = 0;
  const bodyC = () => [wx(2), wy(-10)];
  function onEnter(s) {
    if (s === CAST) {
      castT = 0; hitDone = 0; const d = DIRS[1]; snX = wx(K_SNIP.bhx + d[0] * 6); snY = wy(K_SNIP.bhy + d[1] * 6);
      releaseOrbit(40, 110, 0.3, 0.7); burst(snX, snY, 22, 40, 120, 0.25, 0.6, R_EL, 10); fx.cross(snX, snY, 7, R_EL, 0.25, 2);
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, snX, snY, (Math.random() - 0.3) * 50, -30 - Math.random() * 30, 0.8, R_EL, { g: 180, floor: FLOOR, age0: 0.15 });   // 剪断的线头
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STAB) {                                   // 一刺：紫线从针尖绷直到目标
      const f = focus(); tX0 = wx(f[0] + 1); tY0 = wy(f[1]); tX1 = E.DUMMY_X - 3; tY1 = HY - 15; tautT = 0;
      burst(tX0, tY0, 5, 20, 50, 0.12, 0.25, R_EL, 0); burst(tX1, tY1, 8, 30, 80, 0.15, 0.35, R_EL, 10); xT = 0; xX = tX1; xY = tY1;
      hitDummy(0); sfx('swing', { kind: 'thrust', w: 0.15 }); sfx('hit', { mat: 'magic', w: 0.15 });
    }
    if (s === CHARGE && t === 0.3) fx.circle(wx(2), FLOOR + 1, 15, 3, R_EL, DUR[CHARGE] - 0.3 + 0.2, 1, 0);
    if (s === RECOVER && t === T_PAT1) for (let i = 0; i < 3; i++) spawn(K_DUST, wx(K_PAT.hx - 1 + i), wy(K_PAT.hy - 1), (i - 1) * 8, -6 - Math.random() * 4, 0.3, FXI.dust);   // 拍发髻：拍起一点灰
    if (s === DEATH && t === T_DROP) { for (let i = 0; i < 5; i++) spawn(K_DUST, wx(16 + Math.random() * 6), HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 5, 0.3, FXI.dust); burst(wx(19), HY - 2, 4, 20, 40, 0.1, 0.2, FXI.steel, 4); }
    if (s === DEATH && t === T_PC) {                                      // 线堆收成针插
      burst(wx(0), HY - 4, 16, 30, 70, 0.25, 0.55, R_EL, 12); ring(wx(0), HY - 4, 0, R_EL);
      for (let i = 0; i < 8; i++) spawn(K_DUST, wx(-6 + Math.random() * 12), HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.35, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.1 });
    }
  }
  const EVENTS = [[], [], [T_STAB], [0.3], [], [T_PAT1], [], [T_DROP, T_PC], []];
  function impactOn() {}
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.2) {                                  // 紫色火星螺旋汇进剪刀口
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 10, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === CAST && !hitDone) {                                     // 线圈扫过目标
      const r = ringR(castT), dd = E.DUMMY_X - 5 - wx(2);
      if (r >= dd) {
        hitDone = 1; const x = E.DUMMY_X, y = HY - 15;
        burst(x, y, 24, 50, 130, 0.25, 0.6, R_EL, 14); ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.3, 2); xT = -0.2; xX = x; xY = y;
        hitDummy(1); dummyFx({ dur: 0.9, outline: R_EL }); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.2 });
      }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.1 }); if (Math.random() < 0.5) spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) {                                                  // 针尖偶尔飘一颗紫色余烬
      emberAcc += dt * 1.4; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -5 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL); }
    }
    if (state === RECOVER) { emberAcc += dt * 7; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6, R_EL); } }
    if (state === DEATH && stT > CUT0 && stT < CUT1) {                     // 切口处冒出的紫色线光
      emberAcc += dt * 14; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-5 + Math.random() * 11), wy(TOP_Y + P.cut + 1), Math.random() * 8 - 4, -6 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > DQ0 - 0.05 && stT < DQ1 + 0.1) {         // 化成紫线光飘散
      soulAcc += dt * 32; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-5 + Math.random() * 10), HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL); }
    }
    tautT += dt; castT += dt; xT += dt;
  }
  const ringR = (t) => 5 + 200 * t;
  function fxReset() { tautT = 9; castT = 9; hitDone = 1; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; xT = 9; }
  // 绕身的三股紫线（蓄力）：半径越转越小；back = 1 画身后那一半
  function orbitThreads(f12, back) {
    const q = clamp01(E.stT / DUR[CHARGE]), r = 22 - 12 * ease.inOut(q), c = bodyC();
    for (let s = 0; s < 3; s++) {
      const a0 = E.stT * (3.2 + q * 3) + s * 2.094;
      for (let k = 0; k < 14; k++) {
        const a = a0 - k * 0.09, sn = Math.sin(a); if ((sn < 0) !== !!back) continue; if (k > 9 && ((k + f12) & 1)) continue;
        put(RD(c[0] + Math.cos(a) * r), RD(c[1] + sn * r * 0.42 - (s - 1) * 4), k === 0 ? EL[0] : k < 4 ? EL[1] : k < 9 ? EL[2] : EL[3]);
      }
    }
  }
  // 施放的线圈：从身上向外扩开，起初弯弯曲曲、越扩越绷直；每隔几格一个十字针脚；back = 1 画身后那一半
  function castRing(f12, back) {
    const t = castT, r = ringR(t); if (t > 0.5 || E.state !== CAST) return;
    const c = bodyC(), amp = 3 * Math.max(0, 1 - t / 0.22), col = t < 1 / 12 ? EL[0] : t < 0.15 ? EL[1] : t < 0.3 ? EL[2] : EL[3], n = Math.ceil(r * 5);
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.2832, sn = Math.sin(a); if ((sn < 0) !== !!back) continue; if (t > 0.3 && ((k + f12) % 3) === 0) continue;
      const rr = r + amp * Math.sin(a * 9 + t * 40), x = RD(c[0] + Math.cos(a) * rr), y = RD(c[1] + sn * rr * 0.34);
      put(x, y, col);
      if ((k % 10) === 0 && t < 0.3) { put(x, y - 1, EL[1]); put(x, y + 1, EL[1]); }
    }
  }
  // 紫线（画在特效层，1 格细线）：从针眼连到布片上的针脚；1 线头 · 2 绷直 · 3 松垂 · 4 乱抖
  function threadFx() {
    if (!P.thr || P.dq >= 1) return; const a = needleEye(), C = THC[P.gem], ax = wx(a[0]), ay = wy(a[1]);
    if (P.thr === 1) { put(wx(a[0] - 1), ay + 1, C[0]); put(wx(a[0] - 2), ay + 1, C[0]); put(wx(a[0] - 3), ay + 2, C[0]); return; }
    if (P.thr === 4) { for (let k = 1; k <= 7; k++) put(wx(a[0] + 1 + k), ay + ((k >> 1) & 1 ? 1 : -1) + (k > 4 ? 1 : 0), k < 3 ? C[1] : C[0]); return; }
    const b = stitchPt(), bx = wx(b[0]), by = wy(b[1]), n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay))), sag = P.thr === 3 ? Math.min(3, n * 0.4) : 0;
    for (let k = 1; k <= n; k++) { const q = k / n; put(RD(ax + (bx - ax) * q), RD(ay + (by - ay) * q + sag * 4 * q * (1 - q)), k < 3 ? C[1] : C[0]); }
  }
  function fxBack(f12) {
    if (E.state === CHARGE || E.state === CAST || E.state === RECOVER) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) orbitThreads(f12, 1);
    castRing(f12, 1);
  }
  function fxFront(f12) {
    if (E.state === CHARGE) orbitThreads(f12, 0);
    castRing(f12, 0);
    threadFx();
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && E.state !== DEATH) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (P.glint === 2 && E.state === IDLE) { const f = headEye(); put(f[0] + 2, f[1] - 2, 21); put(f[0] + 3, f[1] - 3, 5); put(f[0] + 3, f[1] - 1, 5); put(f[0] + 1, f[1] - 3, 5); }   // 镜片反光的小星
    if (tautT < 4 / 12) {                                                 // 攻击：绷直的紫线
      const k = f12of(tautT), sag = k >= 2 ? k - 1 : 0, n = Math.max(1, Math.abs(tX1 - tX0));
      for (let i = 0; i <= n; i++) { const q = i / n; if (k >= 2 && ((i + f12) % 3) === 0) continue; const x = RD(tX0 + (tX1 - tX0) * q), y = RD(tY0 + (tY1 - tY0) * q + sag * 4 * q * (1 - q)); put(x, y, k === 0 ? (i % 3 ? EL[0] : EL[1]) : k === 1 ? EL[1] : EL[2]); }
      if (k < 2) { put(tX0, tY0 - 1, EL[k]); put(tX0, tY0 + 1, EL[k]); put(tX0 + 1, tY0, EL[0]); }
    }
    if (xT >= 0 && xT < 0.5) {                                            // 目标身上的十字针脚
      const L = xT < 0.3 ? 3 : 2, c = xT < 0.1 ? EL[0] : xT < 0.3 ? EL[1] : EL[2];
      for (let r = -L; r <= L; r++) { if (xT > 0.3 && (r & 1)) continue; put(xX + r, xY + r, c); put(xX + r, xY - r, c); }
    }
    if (E.state === CAST && castT < 2 / 12) {                             // 咔嚓：刃口交叉处的大 X
      const c = castT < 1 / 12 ? EL[0] : EL[1];
      for (let r = 1; r <= 4; r++) { put(snX + r, snY + r, c); put(snX - r, snY - r, c); put(snX + r, snY - r, c); put(snX - r, snY + r, c); }
    }
    if (E.state === DEATH && P.cut > 0 && P.cut < CUT_ROWS && !P.pc) strands(f12);
  }
  // 拆线：切口上翻起几个线圈，切口两头各垂下一股散线落到线堆两边；颜色取切口下面那一格身上材质的基色
  const BASE = new Map([[M.dress, 54], [M.sleeve, 54], [M.sleeveD, 53], [M.shawl, 36], [M.shawlD, 35], [M.hair, 17], [M.skin, 17], [M.skinD, 18], [M.cuff, 6], [M.cuffD, 7], [M.stock, 28], [M.shoe, 28]]);
  function strands(f12) {
    const s = hero, yc = TOP_Y + P.cut, sy0 = yc + s.oy, heapW = 4 + P.heap;
    const colAt = (sx) => { for (let dy = 0; dy <= 4; dy++) { const sy = sy0 + dy; if (sy < 0 || sy >= s.h) continue; const m = s.mat[sy * s.w + sx]; if (BASE.has(m)) return BASE.get(m); } return -1; };
    let xL = -1, xR = -1;
    for (let dy = 0; dy <= 2 && xL < 0; dy++) { const sy = sy0 + dy; if (sy < 0 || sy >= s.h) continue; for (let sx = 0; sx < s.w; sx++) if (BASE.has(s.mat[sy * s.w + sx])) { if (xL < 0) xL = sx; xR = sx; } }
    if (xL < 0) return;
    const lx = (sx) => sx - s.ox;
    // 两头垂下的散线：从切口外沿往外鼓一点，再落到线堆边上
    for (const [sx, dir, tx] of [[xL, -1, -heapW], [xR, 1, heapW]]) {
      const c = colAt(sx); if (c < 0) continue; const x0 = lx(sx) + dir, n = Math.max(1, -1 - yc);
      for (let k = 0; k <= n; k++) { const q = k / n, y = yc + k, x = RD(x0 + (tx - x0) * q * q + dir * 2 * Math.sin(Math.PI * q) + (((k + f12) >> 1) & 1 ? 0.4 : -0.4)); if (((k + f12) % 7) === 6) continue; put(wx(x), wy(y), c); }
    }
    // 切口上翻起的线圈（每帧换位置）
    for (let i = 0; i < 3; i++) {
      const sx = xL + 1 + ((i * 5 + f12 * 3) % Math.max(1, xR - xL - 1)), c = colAt(sx); if (c < 0) continue; const x = lx(sx), h = 1 + ((i + f12) & 1);
      put(wx(x), wy(yc - 1), c); put(wx(x + 1), wy(yc - 1 - h), c); put(wx(x + 2), wy(yc - 1), c); if (h > 1) { put(wx(x), wy(yc - 2), c); put(wx(x + 2), wy(yc - 2), c); }
    }
  }
  function headEye() { const R = parts.rig(P, BODY); return [wx(R.hx1 - 1 + (P.hdn ? 1 : 0) + P.bx), wy(R.ey + (P.hdn ? 1 : 0) - P.jump)]; }

  return {
    name: '裁缝老太', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.thr, M.thrHot], HIT_POINT: [4, -10], EVENTS, REVIVE: { dy: -10, ramp: R_EL },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'arcane', style: 'blade', w: 0.2 },
    SHEET: [[IDLE, [0, 1 / 12, 2 / 12, 3 / 12, 13 / 12, 21 / 12, 22 / 12]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
      [DEATH, [0.34, 0.5, 0.7, 0.85, 1.0, 1.2, 1.4, 1.58, 1.66, 1.75, 2.2, 2.5, 2.7]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]],
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
