// 混沌士兵（敌人 · 混沌 · 史诗 · 近战 · batch-07）：被混沌改造过的步兵——盔甲是从身体里长出来的骨白甲壳，身体微微不对称：
//   右臂（前手）整条变异成比左臂粗一倍、长 3 格的骨甲大臂，握一柄锯齿骨刃胡子斧；左臂（后手）挎一面巨型甲虫背壳做的骨盾（盾面一只混沌紫眼纹）；
//   骨甲盔额顶长出两根后弯骨角、后脑一排骨刺；暗紫灰皮肤，腰间血红缠布。
// 攻击 = 劈（盾在前，右臂从肩后斜劈而下）；技能 = 没有特性，按「数量稀少但是十分强力」做「破阵斩」：盾撞前冲 5 格 → 从上到下一记大劈，地裂。
// 死亡：前扑倒地，骨盾压在背上，斧子甩飞。
PCD.define('ChaosSoldier', (E) => {
  const { parts, Sprite, bake, part, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_RISE, K_BURST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, copySprite, blitShape, sfx } = E;
  const RD = Math.round, px = parts.px, HALF = Math.PI / 2, FREE = parts.FREE;

  // ───── 元素：破阵 · 刀锋银（steel：白 → 银 → 灰蓝 → 铁 → 深铁）─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    carapace: { r: 'bone', band: 2 },                               // 骨白甲壳甲（主材质，大面积）
    bone: 'bone',                                                    // 小块骨甲：盔、角、刺、胫甲
    mutant: [8, 7, 18, 17],                                          // 变异大臂和大肩甲：偏冷的灰紫骨（暖灰暗段 → 灰紫 → 骨白），和奶白躯干分开
    skin: [0, 53, 54, 60],                                           // 暗紫灰皮肤（shadow 亮段 → 苍灰）
    shell: { r: 'sand', band: 2 },                                   // 甲虫背壳盾面（沙褐壳，和骨白身体拉开）
    cloth: 'blood', haft: 'iron', steel: 'steel',
    eye: { r: [0, 0, 43, 43], flat: 1 },                             // 盔下的混沌紫眼
    curse: { r: [25, 42, 24, 43], flat: 1 },                         // 盾面眼纹
    ink: { r: 'ink', flat: 1 },
    glow: { r: [29, 30, 31, 21], flat: 1 },                          // 斧刃刃光（发光体）
  });
  const BODY = { body: 'heroic', fall: 'front', head: 7 };
  const ARM_L = 13;                                                  // 变异大臂：比 heroic 的 10 长 3 格
  const HX = 72, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 64, 38, 58);                           // 脚底 (38, 58)：放得下举过头顶的斧、前扑倒地（头在右）、飞出去的斧
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'eye', 'curse', 'ink', 'skin', 'haft', 'cloth']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 斧（hx hy a），后手 = 盾（盾心 = 后手 + (1, 1)）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, axP: 0, axX: 0, axY: 0, axR: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -17, 0, 10, -8);                              // 盾护身前，爪手在胸口高度握斧、斧柄在 x10 竖起（斧头高出盔顶、不挡脸）
  const K_AWIND = K(-4, -25, -0.8, 10, -15, -1, 0, 1);               // 盾顶在前，斧举到肩后
  const K_ACHOP = K(11, -11, 2.2, 8, -13, 1, 1);                     // 斜劈而下
  const K_AHOLD = K(10, -9, 2.4, 8, -13, 1);
  const K_CHG = K(-5, -28, -0.5, 9, -17, -1, 0, 1);                   // 蓄力：盾举在前，斧高举过肩
  const K_BASH = K(-4, -25, -0.6, 10, -14, 2, 1, 0);                 // 施放①：盾撞
  const K_LIFT = K(2, -30, 0, 9, -13, 0, 0, 0);                      // 施放②：斧举过头顶
  const K_CHOP = K(13, -10, 2.5, 5, -12, 2, 1, 2);                   // 施放③：大劈定格
  const K_HURT = K(4, -7, 1.6, 5, -15, -1, -1);
  const K_STAG = K(8, -12, 2.0, 9, -12, 2, 1, 4);                    // 踉跄前跪
  const K_LIE = K(3, -11, 0, -2, -12);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['axP', 0, 2], ['axX', -32, 31], ['axY', 0, 15], ['axR', 0, 3]]);
  const SWAY = [0, 1, 0, -1];
  const TAP = [[0, 0, 0.9], [-1, 1, 2.3], [0, 0, 0.9], [-1, 1, 2.3], [0, 0, 0.3]];   // 待机个性：斧头往下一磕，斧背「咚咚」敲两下盾沿（手 dx dy、斧角）
  const T_CHOP = 2 / 12, T_BASH = 1 / 12, T_SKCHOP = 3 / 12, T_LAND = INCOMING + 0.66, T_AXLAND = INCOMING + 0.62;
  const AXE_LEN = 7, AXE_BACK = 3, DASH = 5;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.axP = 0; P.axX = 0; P.axY = 0; P.axR = 0;
    const idle = () => {                                              // 呼吸 2 帧、缠布错相位摆；循环末尾斧背敲盾两下
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), k = TAP[f]; P.hx += k[0]; P.hy += k[1]; P.a = k[2]; P.glint = k[2] > 0.5 ? 1 : 0; P.beard = k[2] > 0.5 ? -1 : 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 持盾行军：盾稳在胸前，斧随步子一点一点
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.a += P.step * 0.12; P.hx += P.step;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_AWIND, ease.out(tq / 0.12)); P.beard = 1; P.sway = 1; P.gem = 1; }
      else if (tq < 0.2) { setK(K_ACHOP, K_ACHOP, 0); P.bx = 4; P.beard = -2; P.sway = -2; P.gem = 2; P.rim = 1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_ACHOP, K_AHOLD, q); P.bx = RD(4 - q); P.beard = -1; P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_AHOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                       // 盾举在前、斧高举过肩，斧刃逐帧亮银
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.45 ? 1 : 2; if (tq > 1.1) P.glint = f12 & 1;
    } else if (st === CAST) {                                         // 盾撞前冲 5 格 → 斧举过头顶 → 大劈定格
      if (tq < T_BASH) { setK(K_BASH, K_BASH, 0); P.bx = 3; }
      else if (tq < 2 / 12) { setK(K_BASH, K_BASH, 0); P.bx = DASH; }
      else if (tq < T_SKCHOP) { setK(K_LIFT, K_LIFT, 0); P.bx = DASH; P.glint = 1; }
      else { setK(K_CHOP, K_CHOP, 0); P.bx = DASH; }
      P.beard = -2; P.sway = -2; P.gem = 3; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CHOP, K_IDLE, q); P.bx = RD(DASH * (1 - ease.inOut(clamp01(tq / 0.45))));
      P.beard = -RD(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 前扑：踉跄前跪、斧脱手甩飞 → 前扑倒地（骨盾压在背上）→ 斧落地弹一下 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        P.eyes = 1; P.gem = 4; axeFly(d);
        if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = -1; P.beard = -2; P.sway = -1; }
        else { setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -7; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = Math.min(3, RD(P.crouch)) + (P.lying ? 0 : P.bob);
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.axP) { P.gx = P.axX; P.gy = -P.axY - 2; }
    else { const c = axeHeadAt(P.hx, P.hy, P.a); P.gx = c[0] + P.bx; P.gy = c[1] - P.lift; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  // 斧脱手：0.35 s 从手里甩出 → 抛物线往前飞、翻转 → 0.62 s 落地 → 弹 1 格 → 躺平（精灵坐标：axX 横向、axY 离地高、axR 翻转档）
  function axeFly(d) {
    if (d < 0.35) return;
    const q = clamp01((d - 0.35) / 0.27);
    if (q < 1) { P.axP = 1; P.axX = RD(10 + 8 * q); P.axY = RD(14 * (1 - q) + Math.sin(q * Math.PI) * 6); P.axR = Math.floor(q * 6) & 3; }
    else { const b = d - 0.62; P.axP = 2; P.axX = 18 + (b < 0.16 ? RD(b * 10) : 2); P.axY = b < 0.16 ? RD(Math.sin(b / 0.16 * Math.PI) * 2) : 0; P.axR = 0; }
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：sawAxe 锯齿骨刃胡子斧——直柄 + 90° 斧头（行从远端到套口；M 骨刃、m 骨刃暗面、E 钢刃口、T 铁箍）。
  //   胡子斧的剪影（上半实心、刃口沿柄往下垂成长胡子、胡子和柄之间留空），刃口每 3 行多伸出 1 格 = 锯齿（齿间 2 格平刃，不像梳子）。
  //   刃口是发光体（lv 0 钢 / 1–3 刃光 / 4 熄灭），和斧头同一部件；最外一列刃口用钢色阶最亮一级
  const AXE_ROWS = ['..MME', '.MMMMEE', 'mMMMMME', '.MMMMME', '.MMMMMEE', '.M.MMME', '.M..MME', '.M..MMEE', '.M...ME', '.M...E', '.T.....'], AXE_ANCHOR = [1, 10], AXE_CENTER = [4, 4];
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  function rot4(q, u, v) { return q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]; }
  function axeHeadAt(gx, gy, a) { const ax = RD(gx + Math.sin(a) * AXE_LEN), ay = RD(gy - Math.cos(a) * AXE_LEN), c = rot4(quad(a), AXE_CENTER[0] - AXE_ANCHOR[0], AXE_CENTER[1] - AXE_ANCHOR[1]); return [ax + c[0], ay + c[1]]; }
  function sawAxe(T, gx, gy, a, lv) {
    const dx = Math.sin(a), dy = -Math.cos(a), ax = RD(gx + dx * AXE_LEN), ay = RD(gy + dy * AXE_LEN), q = quad(a);
    part(); parts.line(E, T, gx - dx * AXE_BACK, gy - dy * AXE_BACK, ax, ay, M.haft, 3); px(E, T, gx - dx * AXE_BACK, gy - dy * AXE_BACK, M.bone, 4);   // 铁柄 + 骨柄头
    part();
    const eM = lv >= 1 && lv <= 3 ? M.glow : M.steel, eT = lv === 4 ? 2 : lv === 3 ? 4 : lv === 2 ? 4 : lv === 1 ? 3 : 4, eT2 = lv === 4 ? 1 : lv >= 2 ? 3 : lv === 1 ? 2 : 4;
    for (let r = 0; r < AXE_ROWS.length; r++) for (let c = 0; c < AXE_ROWS[r].length; c++) {
      const ch = AXE_ROWS[r][c]; if (ch === '.') continue;
      const d = rot4(q, c - AXE_ANCHOR[0], r - AXE_ANCHOR[1]), X = ax + d[0], Y = ay + d[1];
      if (ch === 'M') px(E, T, X, Y, M.bone, (r + c) % 4 === 0 ? 2 : 0);
      else if (ch === 'm') px(E, T, X, Y, M.bone, 2);
      else if (ch === 'T') px(E, T, X, Y, M.haft, 0);
      else px(E, T, X, Y, eM, c === AXE_ROWS[r].length - 1 ? eT : eT2);
    }
    if (P.glint && lv < 4) { const c = rot4(q, AXE_CENTER[0] - AXE_ANCHOR[0] + 2, AXE_CENTER[1] - AXE_ANCHOR[1] - 1); px(E, T, ax + c[0], ay + c[1], M.glow, 4); }
  }
  // 候选部件：mutantArm 变异骨甲大臂——比另一条臂粗一倍（4 格）、长 3 格：两段 IK（肩 → 肘 → 手），肩点比常规前移 2 格（变异的肩膀往前鼓），
  //   上臂短、前臂长（upper = 上臂占比，默认 0.5），上臂、前臂各自一个部件（互相压出分界线）；肘尖永远往「前上 / 下」自然弯（打分 x + 0.5y 选侧，不会翻到头顶上）；
  //   骨甲每段中间一道露出紫灰皮肉的分节缝（和纯骨白的躯干一眼分开），前臂下沿一排暗段（和躯干、盾分开），肘外侧一根骨刺；大骨肩甲压在躯干前面、两根刺朝上伸出肩线 2 格；
  //   手是 3×3 的暗紫爪 + 1 格骨爪尖。读 P.hx / hy；o = { mat, skin, len, fwd 肩点前移 }
  function mutantArm(R, o) {
    const T = R, sx0 = R.sFx + (o.fwd || 0), sy0 = R.sFy, hx = P.hx, hy = P.hy, L = o.len;
    let sx = sx0, sy = sy0; { const qx = hx - sx0, qy = hy - sy0, q = Math.hypot(qx, qy); if (q > L - 0.5) { const k = (q - L + 0.5) / q; sx += qx * k; sy += qy * k; } }
    const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, L1 = L * (o.upper || 0.5), L2 = L - L1;   // 上臂 L1、前臂 L2（变异前臂更长）
    const ux = dx / d, uy = dy / d, nx = -uy, ny = ux, ka = clamp01((L1 * L1 - L2 * L2 + d * d) / (2 * d) / L1) * L1;
    let ex = sx + ux * ka, ey = sy + uy * ka;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - ka * ka)), s = (nx + ny * 0.5) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    const seams = (ax, ay, bx, by) => { const L2 = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L2, uy = (by - ay) / L2;
      const s = RD(L2 * 0.5); if (L2 >= 4) for (let k = -1; k <= 1; k++) px(E, T, ax + ux * s - uy * k, ay + uy * s + ux * k, o.skin, k ? 3 : 4); };
    part();                                                                                // 上臂（最粗）
    parts.sweep(E, T, sx, sy, ex, ey, 2, 1.9, o.mat, 0); seams(sx, sy, ex, ey);
    part();                                                                                // 大骨肩甲（压在躯干和上臂前面，两根刺朝上伸出肩线 2 格；前臂抬起时压在它前面）
    const pt = R.yS;
    parts.run(E, T, pt, sx0 - 1, sx0 + 2, o.mat, 4); parts.run(E, T, pt + 1, sx0 - 3, sx0 + 3, o.mat, 0); parts.run(E, T, pt + 2, sx0 - 2, sx0 + 3, o.mat, 2);
    px(E, T, sx0, pt - 1, o.mat, 3); px(E, T, sx0, pt - 2, o.mat, 4); px(E, T, sx0 + 2, pt - 1, o.mat, 3); px(E, T, sx0 + 3, pt - 2, o.mat, 4);
    part();                                                                                // 前臂：下沿一排暗段
    const fx = hx - dx / d * 1.2, fy = hy - dy / d * 1.2, fl = Math.hypot(fx - ex, fy - ey) || 1, fux = (fx - ex) / fl, fuy = (fy - ey) / fl;
    parts.sweep(E, T, ex, ey, fx, fy, 2.1, 1.6, o.mat, 0); seams(ex, ey, hx, hy);
    const bn = fux >= 0 ? [-fuy, fux] : [fuy, -fux];                                      // 前臂朝下的那一侧
    for (let s = 0; s <= fl; s += 0.5) px(E, T, ex + fux * s + bn[0] * 1.8, ey + fuy * s + bn[1] * 1.8, o.mat, 2);
    const en = Math.hypot(ex - sx + (ex - hx), ey - sy + (ey - hy)) || 1, spx = (ex - sx + (ex - hx)) / en, spy = (ey - sy + (ey - hy)) / en;   // 肘尖朝外的方向
    px(E, T, ex + spx * 2, ey + spy * 2, o.mat, 3); px(E, T, ex + spx * 3, ey + spy * 3, o.mat, 4);
    part();                                                                                // 爪手 3×3 + 骨爪尖
    parts.rect(E, T, hx - 1, hy - 1, 3, 3, o.skin, 0); px(E, T, hx - 1, hy - 1, o.skin, 4); px(E, T, hx + 2, hy + 1, M.bone, 4); px(E, T, hx + 1, hy + 2, M.bone, 3);
  }
  // 候选部件：beetleShield 甲虫背壳骨盾——椭圆 11×13 的甲虫背壳：骨边一圈、中缝（鞘翅分界）、左右边缘每 2 行伸出 1 格锯齿，盾心一只混沌紫眼纹（眼眶 → 眼白 → 竖瞳）。
  //   back 1 = 倒地时侧看压在背上的一条（3 格厚 + 外沿锯齿），跟着 rig 转；T = 落笔变换，(cx, cy) 盾心
  function beetleShield(T, cx, cy) {
    part(); const rx = 5, ry = 6;
    for (let y = -ry; y <= ry; y++) {
      const w = RD(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.4) * (ry + 0.4)))));
      for (let x = -w; x <= w; x++) {
        const edge = Math.abs(x) === w || Math.abs(y) === ry;
        px(E, T, cx + x, cy + y, edge ? M.bone : M.shell, edge ? (x < 0 || y < 0 ? 4 : 2) : 0);
      }
      if ((y & 1) === 0 && Math.abs(y) < ry - 1) { px(E, T, cx - w - 1, cy + y, M.bone, 3); px(E, T, cx + w + 1, cy + y, M.bone, 2); }   // 锯齿
    }
    for (let y = -ry + 1; y <= ry - 1; y++) if (Math.abs(y) > 2) px(E, T, cx, cy + y, M.shell, 1);                                       // 鞘翅中缝
    px(E, T, cx - 3, cy - 4, M.shell, 4); px(E, T, cx - 2, cy - 5, M.shell, 4);                                                         // 壳面高光
    const c = M.curse;                                                                     // 眼纹：外眶 5×3 → 眼白 → 竖瞳
    parts.run(E, T, cy - 2, cx - 1, cx + 1, c, 2); parts.run(E, T, cy + 2, cx - 1, cx + 1, c, 2);
    px(E, T, cx - 2, cy - 1, c, 2); px(E, T, cx + 2, cy - 1, c, 2); px(E, T, cx - 3, cy, c, 2); px(E, T, cx + 3, cy, c, 2); px(E, T, cx - 2, cy + 1, c, 2); px(E, T, cx + 2, cy + 1, c, 2);
    parts.run(E, T, cy - 1, cx - 1, cx + 1, c, 4); parts.run(E, T, cy, cx - 2, cx + 2, c, 4); parts.run(E, T, cy + 1, cx - 1, cx + 1, c, 4);
    px(E, T, cx, cy - 1, M.ink, 1); px(E, T, cx, cy, M.ink, 1); px(E, T, cx, cy + 1, M.ink, 1);
  }
  function beetleShieldBack(R) {                                                          // 倒地时压在背上的一条
    part(); const T = R;
    for (let y = R.yS - 1; y <= R.yHip - 1; y++) {
      const e = parts.edges(R, Math.min(y, R.yHip)); for (let k = 1; k <= 3; k++) px(E, T, e[0] - k, y, k === 3 ? M.bone : M.shell, k === 3 ? 3 : 0);
      if (((y - R.yS) & 1) === 0) px(E, T, e[0] - 4, y, M.bone, 4);
    }
    const e = parts.edges(R, R.yS); px(E, T, e[0] - 2, R.yS - 2, M.bone, 3); const e2 = parts.edges(R, R.yHip); px(E, T, e2[0] - 2, R.yHip, M.bone, 2);
  }
  // 候选部件：carapaceHelm 骨甲盔——从头皮里长出来的骨壳：头顶圆盖、额前 1 格眉骨往前探（压着眼）、脑后和颊侧包住，
  //   后脑一排 3 根往后斜的骨刺；角另用 parts.horns（back 后弯）。H = 头饰坐标（u = 0 头中线、v = 1 头顶那一行）
  function carapaceHelm(R) {
    const H = { r0: 0, tx: R.hx, ty: R.htop - 1, rot: R.rot, ox: R.ox, oy: R.oy }, a = R.hx0 - R.hx, b = R.hx1 - R.hx, ey = R.ey - R.htop + 1, m = M.bone;
    part();
    parts.run(E, H, 0, a + 1, b - 1, m, 0); parts.run(E, H, 1, a, b, m, 0); parts.run(E, H, 2, a - 1, b + 1, m, 0);
    px(E, H, b + 1, 2, m, 4); px(E, H, a + 1, 0, m, 4); px(E, H, 0, 1, m, 4);
    parts.run(E, H, 3, a - 1, b + 1, m, 2); px(E, H, b + 1, 3, m, 3);                    // 眉骨：整行压在眼睛上方、前沿探出 1 格（面罩缝朝右）
    for (let v = 4; v <= R.hh - 1; v++) { parts.run(E, H, v, a - 1, a + 1, m, 2); }
    parts.run(E, H, R.hh - 1, a - 1, a + 1, m, 2);                                       // 颊甲下沿
    // 面罩缝朝右：脸和盔同一个部件画（不被盔压出一圈黑边）——眉骨下 2 格混沌紫眼、两行暗紫脸、1 行暗紫方下巴
    for (let v = ey; v < R.hh; v++) parts.run(E, H, v, a + 2, b, M.skin, v === ey ? 3 : 0);
    if (P.eyes) { px(E, H, b - 1, ey, M.skin, 1); px(E, H, b - 2, ey, M.skin, 1); } else { px(E, H, b - 1, ey, M.eye, 4); px(E, H, b - 2, ey, M.eye, 4); }
    parts.run(E, H, R.hh, a + 1, b, M.skin, 2); px(E, H, b, R.hh, M.skin, 3);
    for (const [v, L] of [[4, 3], [6, 2]]) for (let k = 1; k <= L; k++) px(E, H, a - 1 - k, v + (v === 6 ? RD(k * 0.5) : 0), m, k === L ? 4 : 3);   // 后脑骨刺（横着往后）
    return ey;
  }
  // 腰：血红缠布腰带 + 前面垂一块破布（下摆锯齿、随 sway 摆）
  function waistCloth(R) {
    part(); const yH = R.yHip, e = parts.edges(R, yH), sw = RD(P.sway || 0);
    parts.run(E, R, yH - 1, e[0], e[1] + 1, M.cloth, 0); parts.run(E, R, yH, e[0] + 1, e[1] + 1, M.cloth, 2);
    for (let k = 1; k <= 4; k++) { const s = k >= 3 ? RD(sw * 0.5) : 0; for (let x = e[1] - 3; x <= e[1]; x++) { if (k === 4 && (x & 1)) continue; px(E, R, x + s, yH + k, M.cloth, x === e[1] - 3 ? 2 : 0); } }
    px(E, R, e[0] - 1, yH - 1, M.cloth, 3); px(E, R, e[0] - 2 + (sw > 0 ? 1 : 0), yH, M.cloth, 2); px(E, R, e[0] - 2 + sw, yH + 1, M.cloth, 2);   // 后面的结 + 布尾
  }
  // 躯干上长出来的甲壳：背脊三根往后上的骨刺 + 胸前两道弧形骨板缝（和躯干同一部件，紧跟 torso 画）
  function carapaceRidge(R) {
    for (const [dy, L] of [[4, 3], [7, 2]]) { const y = R.yS + dy, e = parts.edges(R, y); for (let k = 1; k <= L; k++) px(E, R, e[0] - k, y - RD(k * 0.6), M.carapace, k === L ? 4 : 3); }
    for (const dy of [2, 4]) { const y = R.yS + dy, e = parts.edges(R, y); parts.run(E, R, y, e[1] - 3, e[1] - 1, M.carapace, 2); px(E, R, e[1] - 4, y - 1, M.carapace, 2); }
    const e = parts.edges(R, R.yS + 1); px(E, R, e[1] - 1, R.yS + 1, M.carapace, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.skinD, cuff: M.boneD, cuffStyle: 'bracer', grip: 'none', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'greave', mat: M.bone, matD: M.boneD, boot: M.skin, bootD: M.skinD, bootH: 2, w: 3 });
    parts.torso(E, R, P, { style: 'plate', mat: M.carapace }); carapaceRidge(R);
    waistCloth(R);
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.eye, eyeStyle: 'glow', nose: 'none', mouth: 'wide', ear: 'none' });
    carapaceHelm(R);
    parts.horns(E, R, P, { mat: M.bone, size: 7, curve: 'back', y: 0 });
    if (R.lie) beetleShieldBack(R);
    else beetleShield(R, P.bhx + 1, P.bhy + 1);
    if (P.axP) sawAxe(FREE, P.axX - P.bx, -P.axY + P.lift - (P.axP === 2 ? 1 : 3), P.axP === 2 ? -HALF : P.axR * HALF + 0.3, 4);
    else if (!R.lie) sawAxe(R, P.hx, P.hy, P.a, P.gem);
    mutantArm(R, { mat: M.mutant, skin: M.skin, len: ARM_L, fwd: 2, upper: 0.42 });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let chargeAcc = 0, soulAcc = 0, dustAcc = 0, lastStep = 0, lastTap = -1, bashT = 9, ghostX = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function onEnter(s) {
    if (s !== CAST) return;
    releaseOrbit(40, 90, 0.25, 0.5); dust(wx(-2), 8, 40);                               // 蓄力时聚在刃上的银屑散开，蹬地起尘
    poseAt(CHARGE, 1.4 - 1 / 12, 1.4 - 1 / 12); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; ghostX = HX + P.mx; bashT = 0;   // 前冲残影 = 蓄力姿
    poseAt(CAST, 0, 0);
  }
  function onTime(s, t) {
    const at = (T) => Math.abs(t - T) < 1e-9;
    if (s === ATTACK && at(T_CHOP)) {                                // 劈：从肩后到身前的斜弧拖影，命中火花
      const cx = wx(R0x() + 4), cy = wy(-18);
      fx.slash(cx, cy, 14, K_AWIND.a, K_ACHOP.a, R_EL, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, wy(-14), 12, 40, 110, 0.15, 0.35, R_IMP, 10); burst(DUMMY_X - 4, wy(-14), 6, 30, 80, 0.2, 0.4, R_EL, 10); fx.cross(DUMMY_X - 4, wy(-14), 4, R_EL, 0.2);
      sfx('swing', { kind: 'slash', w: 0.7 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CAST && at(T_BASH)) {                                  // 盾撞：小冲击环 + 假人小摇
      const x = Math.min(wx(P.bhx + 1 + 6), DUMMY_X - 5), y = wy(P.bhy + 1);
      ring(x, y, 0, R_EL); burst(x, y, 10, 30, 80, 0.15, 0.35, R_IMP, 6); hitDummy(0); shake(0.1, 1);
      sfx('impact', { pal: 'metal', w: 0.5 });
    }
    if (s === CAST && at(T_SKCHOP)) {                                // 大劈：180° 斩击弧（宽 2 格）→ steel 大外爆 + 地裂 + 击退 1 格 + 震屏 2 格
      const cx = wx(R0x() + 3), cy = wy(-19), hx = DUMMY_X - 4, hy = wy(-12);
      fx.slash(cx, cy, 16, -0.4, 2.75, R_EL, 0.3, 2, 2);
      burst(hx, hy, 36, 60, 160, 0.3, 0.75, R_EL, 18); ring(hx, hy, 1, R_EL); fx.cross(hx, hy, 7, R_EL, 0.3, 2);
      fx.crack(wx(12), FLOOR, 16, 1, R_EL, 0.9); fx.crack(wx(10), FLOOR, 6, -1, R_EL, 0.7);
      dust(hx - 4, 8, 40); hitDummy(1, 1); shake(0.28, 2); flash(0.05);
      sfx('impact', { pal: 'metal', w: 0.8 });
    }
    if (s === DEATH && at(T_AXLAND)) { dust(wx(18), 4, 20); sfx('hit', { mat: 'metal', w: 0.3 }); }
    if (s === DEATH && at(T_LAND)) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(8) + (Math.random() - 0.5) * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.75 });
    }
  }
  const R0x = () => P.lean + 3 + P.bx;                                // 前肩（斩击弧的圆心）
  const EVENTS = [[], [], [T_CHOP], [], [T_BASH, T_SKCHOP], [], [], [T_AXLAND, T_LAND], []];
  function hurtFx(s) {                                                // 骨甲：火花里夹着骨屑
    const hx = HX + 2, hy = HY - 16; burst(hx, hy, s === DEATH ? 24 : 16, 50, 140, 0.2, 0.5, R_IMP, 18);
    for (let i = 0; i < 6; i++) spawnX(K_PHYS, hx + (Math.random() - 0.5) * 6, hy, (Math.random() - 0.5) * 50, -20 - Math.random() * 30, 0.5 + Math.random() * 0.3, FXI.dust, { g: 140, floor: HY });
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                           // 银屑沿刃口汇聚；脚下扬尘
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, wx(P.gx - P.bx), wy(P.gy), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 4); }
      dustAcc += dt * (stT > 0.5 ? 10 : 4); while (dustAcc >= 1) { dustAcc -= 1; spawn(K_DUST, wx(-3 + Math.random() * 10), HY, (Math.random() - 0.5) * 20, -3 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); dust(wx(P.step > 0 ? 5 : -4), 3, 18); } lastStep = P.step; }
    if (state === IDLE) {                                             // 斧背敲盾：两下火星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastTap) { if (f === 1 || f === 3) burst(wx(P.bhx + 5), wy(P.bhy - 3), 4, 20, 50, 0.1, 0.25, R_IMP, 10); lastTap = f; }
    }
    if (state === RECOVER && Math.random() < dt * 8) spawn(K_RISE, wx(P.gx), wy(P.gy), (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.5, R_EL);
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-4) + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    bashT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; dustAcc = 0; lastStep = 0; lastTap = -1; bashT = 9; }
  function fxBack(f12) { if (P.dq < 1 && !P.axP) floorGlow(wx(P.gx - P.bx) + P.bx, P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (bashT < 0.25) blitShape(ghost, ghostX, HY, 0, bashT < 1 / 12 ? EL[2] : EL[3], clamp01(bashT / 0.25)); }   // 盾撞前冲的残影
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.axP) {            // 刃光星芒
      const gx = wx(P.gx - P.bx) + P.bx, gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '混沌士兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow, M.eye], HIT_POINT: [2, -16], EVENTS,
    SFX: { body: 'armor', how: 'topple', pal: 'metal', style: 'blade', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
