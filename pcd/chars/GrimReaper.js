// 死神（部队 · 骷髅 · 召唤师 · 神话 · 远程 1020）：死灵法师升级而来——同一个佝偻骷髅长成一座向前倾的白色高塔（约 40 格，站在地上走，不飘）。
// 灰白裹尸布拖地 4 格；死灵法师的龙颅杖长成巨型龙颅镰（骨柄 + 龙头骨镰座，冥霜白刃从龙颅口中伸出、弯过头顶 8 格）；
// 立领骨领长成一对收拢的龙翼骨架（从肩后张开，高出头 6 格）；三尖骨冠长成骨龙冠（多一对后掠龙角）；腰间魂灯换成一只魂光沙漏。
// 攻击 = 施法：镰刀抡到肩后，双手把它从身后横着绕到身前一挥（镰头只转 90°、刃朝下擦地），甩出一道弯月形的魂光镰弧贴地飞向远处目标（远程飞镰，不近身）。
// 技能 = 特性「召唤死神」（法力满后召唤骨龙）+「亡灵法术」（亡者魂光被吸来）：天空压暗，地面浮起一团团亡者魂光排成长队流进沙漏，
//        沙漏翻转、镰颅眼窝 1→3 档、骨翼领张开 → 镰刀在身前地面划出一道巨大弧形裂缝，冥霜白光喷涌 → 骨龙的头颅和脊骨一节一节从裂缝里升起。
// 死亡「解体骨雨」：裹尸布先整块塌下去堆在脚边（0.58 s 成堆），露出的骨架从上往下一段段竖直落下——龙冠 → 骨翼领 → 头骨与肋骨 → 镰——
//        全部堆在原地（脚底 ±20 格、堆高 ≤ 10 格），魂光从倒下的沙漏里炸散上升；最后整堆自上而下消散。
PCD.define('GrimReaper', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, ASTEP, B8, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, dim, fx, fall, death, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, line = parts.line, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：亡语召唤 · 冥魂青白（soul 为主；裂缝 / 刃光用 frost 前两级白、冰青）；骨灰 / 骨雨用 dust ─────
  const R_EL = FXI.soul, EL = FXR[R_EL], FR = FXI.frost, FRL = FXR[FR], ASH = FXI.dust;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    shroud: { r: 'white', band: 2 }, sleeve: 'white', sash: 'shadow', bone: 'bone', skull: 'bone', crown: 'bone', seat: 'bone', shaft: 'bone',
    wing: [8, 9, 7, 6],                                               // 骨翼领：骨色暗段
    steel: 'steel', gold: 'gold',
    edge: { r: [40, 23, 22, 21], flat: 1 },                           // 冥霜白刃（刃口最亮）
    sock: { r: [0, 0, 52, 53], flat: 1 },
    soul: { r: [3, 25, 24, 23], flat: 1 }, soulHot: { r: [24, 23, 22, 21], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 14, torso: 16, head: 8, headW: 8, hunch: 4, arm: 17, sw: 6, lw: 3, stride: 5, limb: 1.3, fall: 'front' };   // 头顶 -33、翼领 -39、刃 -42
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(104, 66, 50, 62);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'skull', 'seat', 'shaft', 'steel', 'gold', 'edge', 'sock', 'soul', 'soulHot', 'sash']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const GL = [[[M.soul, 3], [M.soul, 2]], [[M.soul, 4], [M.soul, 3]], [[M.soulHot, 3], [M.soulHot, 2]], [[M.soulHot, 4], [M.soulHot, 3]], [[M.sock, 2], [M.sock, 1]]];

  // ───── 姿势：前手 hx/hy + 镰角 a + 握点滑移 gs；后手 bk = 握在前手后面多少格的镰柄上（bfree = 1 时用 bhx/bhy）─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, gs: 0, bk: 0, bfree: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    wing: 0, hg: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lift: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, df: 0, mir: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bk, gs, lean, head, crouch) => ({ hx, hy, a, bk, gs, lean, head, crouch });
  const K_IDLE = K(16, -22, -2 * ASTEP, 8, 0, 0, 0, 0);                // 镰刀竖在身前、往后倾一档并举高 1 格：刃弧弯到骨翼领后上方，不压龙冠
  const K_WIND = K(9, -30, -0.8, 7, 0, -1, -1, 1);                     // 镰刀抡到肩后
  const K_SWEEP = K(11, -19, Math.PI / 2, 7, -8, 1, 1, 2);             // 横挥出手：双手握短（gs -8）把镰杆横在胸前，镰头在身前 ≤ 18 格，刃朝下擦地（镰头镜像翻面，只转 90° 一档）
  const K_BACK = K(16, -21, 0.6, 8, 0, 1, 1, 2);                       // 延续：镰刀往回收
  const K_FOLLOW = K(15, -20, 0.2, 8, 0, 1, 0, 1);                     // 延续：收回到身侧
  const K_CHARGE = K(13, -30, -0.2, 8, 0, -1, -1, 0);                  // 蓄力：镰刀高举
  const K_CAST = K(15, -32, 2.7, 6, 12, 2, 1, 2);                      // 施放：镰刃划进身前地面
  const K_HURT = K(13, -20, -0.3, 8, 0, -1, -1, 0);
  const K_SAG = K(15, -16, 0.35, 7, 0, 2, 1, 3);
  const FIELDS = ['hx', 'hy', 'a', 'bk', 'gs', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -40, 40], ['hy', -56, 8], ['ai', -64, 96], ['bhx', -40, 40], ['bhy', -56, 8], ['gs', -8, 15], ['df', 0, 40], ['mir', 0, 1], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['wing', 0, 2], ['hg', 0, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['lift', 0, 3], ['dqi', 0, 48], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  // 待机个性：空出后手把腰间沙漏倒过来（后手位、沙漏状态、镰颅眼窝）
  const PERS = [[10, -19, 0, 0], [7, -21, 1, 0], [7, -20, 2, 1], [9, -18, 2, 1], [12, -16, 2, 1]];
  const T_SWEEP = 2 / 12, T_HIT = 4 / 12;
  // 死亡（按 12 fps 帧号 df）：4 受击闪白 · 5–7 裹尸布塌成堆 · 从上往下每段错开 1 帧、各落 2 帧：8–9 龙冠 · 9–10 骨翼领 · 10–11 头骨与肋骨 · 12–13 镰刀倒 · 14 起静止成堆 · 2.0 s 起消散
  const DF_SLUMP = 7, DF_CROWN = 8, DF_WING = 9, DF_RIB = 10, DF_SCY = 12, DF_REST = 14, T_FADE = 2.0;
  const T_SLUMP = DF_SLUMP / 12, T_LAND = [(DF_CROWN + 2) / 12, (DF_WING + 2) / 12, (DF_RIB + 2) / 12], T_THUD = DF_REST / 12;
  const UP = 15, DN = 20;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.wing = 0; P.hg = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0;
    P.flash = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.bfree = 0; P.df = 0; P.mir = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), c = PERS[f]; P.bfree = 1; P.bhx = c[0]; P.bhy = c[1]; P.hg = c[2]; P.gem = c[3]; P.glint = f === 2 ? 1 : 0; P.head = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 巨步缓行：步子大，骨翼领随步轻摆
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq)); P.hx += P.step; P.a += P.step * 0.05;
      const w = walkDemo(tq, 10, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 预兆 2 帧（抡到肩后）→ 出手 1 帧（横挥）→ 延续 3 帧（收回身侧）→ 回待机
      const fa = f12of(tq);
      if (fa === 0) { setK(K_IDLE, K_WIND, 0.55); P.gem = 1; P.sway = 1; }
      else if (fa === 1) { setK(K_WIND, K_WIND, 0); P.gem = 2; P.sway = 1; P.rim = 2; }
      else if (fa === 2) { setK(K_SWEEP, K_SWEEP, 0); P.mir = 1; P.bx = 1; P.gem = 3; P.rim = 2; P.sway = -2; }
      else if (fa === 3) { setK(K_BACK, K_BACK, 0); P.bx = 1; P.gem = 2; P.sway = -2; }
      else if (fa <= 5) { setK(K_FOLLOW, K_FOLLOW, 0); P.gem = 1; P.sway = fa === 4 ? -1 : 0; }
      else setK(K_FOLLOW, K_IDLE, ease.inOut(clamp01((tq - 0.5) / 0.2)));
    } else if (st === CHARGE) {                                        // 沙漏翻转、骨翼领张开、镰颅眼窝 1→3
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.wing = tq < 0.35 ? 0 : tq < 0.7 ? 1 : 2; P.hg = tq < 0.5 ? 0 : tq < 0.6 ? 1 : 2;
      P.gem = tq < 0.45 ? 1 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2); P.rim = 2; P.sway = q > 0.4 ? -1 - (tq > 1.1 && (f12 & 1) ? 1 : 0) : 0;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.wing = 2; P.hg = 2; P.gem = 3; P.rim = 3; P.sway = -2; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.wing = q < 0.4 ? 2 : q < 0.75 ? 1 : 0; P.hg = 2;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.wing = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 受击 → 裹尸布塌成堆 → 骨架从上往下一段段落下堆在原地 → 消散
      const d = tq - INCOMING, fd = f12of(tq); P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (fd <= 4) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = 1; }
      else { setK(K_SAG, K_SAG, 0); P.bx = -2; P.eyes = 1; P.wing = 1; P.gem = 4; P.df = Math.min(40, fd); if (tq >= T_FADE) P.dq = clamp01((tq - T_FADE) / 0.6); }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + Math.min(3, RD(P.crouch)); P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.gs = RD(P.gs);
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    const S = scythePts();
    if (!P.bfree) { P.bhx = RD(P.hx - S.dx * P.bk); P.bhy = RD(P.hy - S.dy * P.bk); } else { P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob; }
    const r0 = S.r0, ex = r0 === 0 ? 0 : r0 === 1 ? 4 : r0 === 2 ? 0 : -4, ey = r0 === 0 ? -4 : r0 === 1 ? 0 : r0 === 2 ? 4 : 0;   // 镰颅眼窝（按镰座朝向）
    P.gx = S.tx + ex + P.bx; P.gy = S.ty + ey;
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function scythePts() { const dx = Math.sin(P.a), dy = -Math.cos(P.a), u = UP + P.gs, d = DN - P.gs - (P.mir ? 20 : 0);   // mir 横挥帧：镰杆朝镜头甩过来，身后那段透视缩短 20 格
    return { dx, dy, tx: RD(P.hx + dx * u), ty: RD(P.hy + dy * u), bx: P.hx - dx * d, by: P.hy - dy * d, r0: ((RD(P.a / (Math.PI / 2)) % 4) + 4) % 4 }; }
  const hgAt = [12, -12];
  const frm = (R, r0, x, y) => ({ r0, tx: x, ty: y, rot: R.rot, ox: R.ox, oy: R.oy });
  // 候选部件：boneWings —— 骨翼领：一对收拢的龙翼骨架从肩后竖起。近侧翼 = 两格粗臂骨 → 指节钩 → 三根指骨从臂骨上不同的点往后下方伸出（彼此隔 4 行，勾线之间留得出空隙）；
  //   远侧翼只露出指节钩和一根指骨（暗一级，比近侧高 3 格、靠后 2 格，不填进近侧指骨之间）。spread 0–2 张开，sway 随步摆
  function boneWings(R, spread, sway) {
    const sw = RD(sway * 0.5);
    { E.part(); const m = M.wingD, kx = R.sBx - 3 - spread * 2 + sw, ky = R.yS - 14 + (spread >> 1);
      line(E, R, kx + 2, ky + 5, kx, ky, m, 0); px(E, R, kx + 1, ky - 1, m, 3); px(E, R, kx + 2, ky - 1, m, 3);
      line(E, R, kx, ky, kx - 6 - spread * 2, ky + 1, m, 0); }
    E.part(); const m = M.wing, rx = R.sBx + 2, ry = R.yS + 1, kx = rx - 3 - spread * 2 + sw, ky = ry - 12 + (spread >> 1);
    line(E, R, rx, ry, rx - 1, ry - 6, m, 0); line(E, R, rx - 1, ry - 6, kx, ky, m, 0); line(E, R, rx + 1, ry - 1, rx, ry - 6, m, 2);   // 臂骨（两格粗）
    px(E, R, kx + 1, ky - 1, m, 4); px(E, R, kx + 2, ky - 1, m, 3); px(E, R, kx, ky, m, 4);                                          // 指节钩
    for (let i = 0; i < 3; i++) {                                                                                                     // 三根指骨
      const sx = kx + RD(i * (rx - 1 - kx) / 6), sy = ky + i * 4, ex = sx - 7 - spread * 2 + i, ey = sy + 2 + i;
      line(E, R, sx, sy, ex, ey, m, i === 1 ? 3 : 0); px(E, R, ex - 1, ey + 1, m, 4);
    }
  }
  // 候选部件：reaperSkull —— 8×8 大骷髅头（颅骨 + 眉骨 + 两格宽的前眼窝（魂光 2 格）+ 远侧眼窝 + 鼻孔 + 一排牙（牙缝是墨色）+ 下颌 + 颧骨凹陷）
  function reaperSkull(R, lv) {
    E.part(); const m = M.skull, x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey;
    run(E, R, top, x0 + 1, x1 - 1, m, 0); for (let y = top + 1; y <= ey + 1; y++) run(E, R, y, x0, x1 + (y === ey + 1 ? 1 : 0), m, 0);
    run(E, R, ey + 2, x0 + 1, x1 + 1, m, 0); run(E, R, ey + 3, x0 + 3, x1 + 1, m, 0); run(E, R, ey + 4, x0 + 3, x1, m, 0);
    run(E, R, ey - 1, x1 - 3, x1, m, 4);                                                               // 眉骨
    const g = P.eyes ? [M.sock, 2] : GL[lv][0];
    px(E, R, x1 - 2, ey, g[0], g[1]); px(E, R, x1 - 1, ey, g[0], g[1]); px(E, R, x1 - 2, ey + 1, M.sock, 1); px(E, R, x1 - 1, ey + 1, M.sock, 2);   // 前眼窝 2 格 + 魂光
    px(E, R, x1 - 4, ey, M.sock, 1); px(E, R, x1 - 4, ey + 1, M.sock, 1);                            // 远侧眼窝
    px(E, R, x1 + 1, ey + 2, M.sock, 1);                                                               // 鼻孔
    for (let x = x0 + 4; x <= x1 + 1; x++) px(E, R, x, ey + 3, (x & 1) ? m : M.sock, (x & 1) ? 4 : 1);   // 一排牙（牙缝墨色）
    px(E, R, x0 + 3, ey + 1, m, 2); px(E, R, x0 + 2, ey + 2, m, 2); px(E, R, x0 + 2, top + 1, m, 2); px(E, R, x0 + 3, top + 2, m, 2);   // 颧骨凹陷、颅缝
    px(E, R, x0 + 4, ey + 4, m, 2);
  }
  // 候选部件：dragonCrown —— 骨龙冠：骨箍 + 三尖（中尖最高）+ 一对从耳后往后掠的龙角（伸出头后 4 格，比骨翼领的指节低 2 格错开，远侧暗一级）
  function dragonCrown(R, x0, w, top) {
    E.part(); const m = M.crown, x1 = x0 + w - 1;
    line(E, R, x0, top + 1, x0 - 2, top, M.crownD, 2); line(E, R, x0 - 2, top, x0 - 5, top - 1, M.crownD, 3);                // 远侧龙角
    line(E, R, x0, top + 3, x0 - 2, top + 3, m, 0); line(E, R, x0 - 2, top + 3, x0 - 5, top + 2, m, 3); px(E, R, x0 - 6, top + 1, m, 4);   // 近侧龙角
    for (let x = x0 + 1; x <= x1 - 1; x++) px(E, R, x, top, m, (x & 1) ? 4 : 3);
    px(E, R, x0 + 1, top - 1, m, 3); px(E, R, x0 + 1, top - 2, m, 4);                                                          // 后尖
    const mx = x0 + RD(w / 2); for (let k = 1; k <= 3; k++) px(E, R, mx, top - k, m, 3); px(E, R, mx, top - 4, m, 4);          // 中尖
    px(E, R, x1 - 1, top - 1, m, 3); px(E, R, x1, top - 2, m, 3); px(E, R, x1 + 1, top - 3, m, 4);                            // 前尖
  }
  // 候选部件：dragonScythe —— 巨型龙颅镰：两格骨柄（骨节 + 柄尾骨刺）→ 龙头骨镰座（眼窝发光）→ 冥霜白刃从龙颅口中伸出、往后弯出一道弧（刃背钢、刃口最亮）。
  // 镰头是宽的武器头：只按 90° 换朝向（r0），中心放在真实角度的位置上；mir 1 = 镰头翻面（横挥时刃朝下擦地）；skipBlade 时刃另外先画（待机刃弧压在骨翼领后面）
  const BLADE = [[-7, -2, 3], [-8, -3, 3], [-9, -4, 3], [-10, -5, 3], [-11, -5, 3], [-12, -6, 3], [-13, -6, 2], [-14, -6, 2], [-15, -6, 2], [-16, -5, 2], [-17, -5, 2], [-18, -4, 1], [-19, -3, 1], [-20, -2, 1]];
  function scytheBlade(T, lv, X) {
    E.part(); const hp = (x, y, m, t) => px(E, T, x * X, y, m, t);
    for (const [x, y, th] of BLADE) { hp(x, y, M.steel, y <= -6 ? 4 : 3); for (let k = 1; k < th; k++) hp(x, y + k, M.edge, k === th - 1 ? 3 : 2); hp(x, y + th, M.edge, th === 1 ? 3 : 4); }
    hp(-21, -1, M.edge, 4); hp(-6, -1, M.edge, lv >= 2 && lv <= 3 ? 4 : 2);                           // 刃尖、刃根的魂光
  }
  function dragonScythe(R, S, lv, mir, skipBlade) {
    E.part(); const bx = S.bx, by = S.by;
    line(E, R, bx, by, S.tx, S.ty, M.shaft, 2); line(E, R, bx - 1, by, S.tx - 1, S.ty, M.shaft, 3);
    for (let k = 5, L = Math.hypot(S.tx - bx, S.ty - by); k < L - 2; k += 6) { const x = bx + S.dx * k, y = by + S.dy * k; px(E, R, x - 1, y, M.shaft, 4); px(E, R, x + 1, y, M.shaft, 2); }
    px(E, R, bx - S.dx * 2, by - S.dy * 2, M.shaft, 4); px(E, R, bx - S.dx, by - S.dy, M.shaft, 3);   // 柄尾骨刺
    E.part(); const T = frm(R, S.r0, S.tx, S.ty), m = M.seat, G = GL[lv], X = mir ? -1 : 1;
    const hp = (x, y, mm, t) => px(E, T, x * X, y, mm, t), hr = (y, a, b, mm, t) => { for (let x = a; x <= b; x++) hp(x, y, mm, t); };
    hp(3, -6, m, 3); hp(4, -7, m, 4); hp(5, -7, m, 3); hp(5, -8, m, 4);                               // 镰座龙颅的后掠角
    hr(-5, -1, 2, m, 0); hr(-4, -2, 3, m, 0); hr(-3, -5, 3, m, 0); hr(-2, -6, 2, m, 0);
    hr(-1, -2, 1, m, 0); hr(0, -1, 1, m, 0); hr(1, -5, 1, m, 0);                                       // 张开的口（上下颌之间伸出刃）
    hp(0, -4, G[0][0], G[0][1]); hp(1, -4, M.sock, 1); hp(-1, -5, m, 4); hp(-5, -2, M.sock, 1);       // 眼窝、眉骨、鼻孔
    hp(-3, -1, m, 4); hp(-5, 0, m, 4);                                                                 // 上下獠牙
    if (!skipBlade) scytheBlade(T, lv, X);
  }
  // 候选部件：hourglass —— 魂光沙漏：金框（上下横梁 + 两根立柱）+ 上下两个玻璃泡里的魂光；hg 0 正放（魂光在下）· 1 翻到一半（横放）· 2 刚翻过来（魂光在上、细流往下）
  function hourglass(R, cx, cy, hg, lv) {
    E.part(); const T = frm(R, hg === 1 ? 1 : 0, cx, cy), g = M.gold, G = GL[lv === 4 ? 4 : Math.max(1, lv)];
    run(E, T, -4, -2, 2, g, 0); run(E, T, 4, -2, 2, g, 0);
    for (let y = -3; y <= 3; y++) { px(E, T, -2, y, g, 2); px(E, T, 2, y, g, 3); }
    const hi = hg === 2, rows = [[-3, -1, 1], [-2, -1, 1], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, -1, 1], [3, -1, 1]];
    for (const [y, a, b] of rows) for (let x = a; x <= b; x++) {
      const up = y < 0, filled = up ? (hi ? y >= -3 : y === -1) : (hi ? y === 3 || (x === 0 && y <= 1) : y >= 2 || (y === 1 && x === 0));
      if (filled) px(E, T, x, y, (y === 0 || (up && hi) || (!up && !hi)) ? G[0][0] : G[1][0], (y === 0 || (up && hi) || (!up && !hi)) ? G[0][1] : G[1][1]);
      else px(E, T, x, y, M.sock, 3);
    }
  }
  // ───── 死亡：裹尸布塌成堆 + 骨架一段段落下堆在原地（画进精灵本身，动作表和 sprite.json 里都看得到）─────
  const SURF = new Int8Array(96);                                          // 布堆每一列的顶（本地 x + 48 → y；1 = 没有布）
  const surf = (x) => { const i = RD(x) + 48; return i >= 0 && i < 96 && SURF[i] <= 0 ? SURF[i] : 0; };
  const lay = (R, x0, x1, k, m, t) => { for (let x = x0; x <= x1; x++) px(E, R, x, surf(x) - k, m, t); };   // 沿布堆表面平躺
  // 候选部件：shroudHeap —— 塌下来的裹尸布：sl 1 塌到胯（16 高）· 2 塌到膝（10 高）· 3 堆在脚边（6 高、宽 27）；竖褶、下摆破口、身后拖地的布尾
  function shroudHeap(R, sl, cx) {
    E.part(); SURF.fill(1); const H = [0, 16, 10, 6][sl], W = [0, 9, 11, 13][sl];
    for (let y = -H; y <= 0; y++) {
      const t = (y + H) / H, half = RD(W * (0.4 + 0.6 * Math.sqrt(t))), L = cx - half - (y >= -2 ? [1, 3, 5][y + 2] : 0), Rr = cx + half;
      run(E, R, y, L, Rr, M.shroud, 0); for (let x = L; x <= Rr; x++) { const i = x + 48; if (i >= 0 && i < 96 && y < SURF[i]) SURF[i] = y; }
      if (t > 0.25) for (const fx0 of [-6, -1, 4]) if (((y + fx0) & 1) === 0 && Math.abs(fx0) < half - 1) px(E, R, cx + fx0 + RD(t * 2), y, M.shroud, 2);   // 竖褶
    }
    for (let x = cx - W - 4; x <= cx + W; x += 3) px(E, R, x, 0, M.shroud, 1);                          // 下摆破口
    px(E, R, cx - 1, -H, M.shroud, 4); px(E, R, cx + 1, -H, M.shroud, 4);
  }
  // 候选部件：ribCage —— 裹尸布下的骨架躯干：驼背的脊椎（骨节）+ 4 根往前弯下的肋骨 + 骨盆
  function ribCage(T) {
    E.part(); const nx = T.hx - 3, ny = T.hy + 2, mx = nx - 4, my = ny + 6, py = T.yHip;
    line(E, T, nx, ny, mx, my, M.bone, 3); line(E, T, mx, my, 0, py, M.bone, 3);
    for (let k = 0; k < 4; k++) { const y = my - 3 + k * 3; if (y > py - 2) break; const q = (y - my) / Math.max(1, py - my), x = y < my ? RD(nx + (mx - nx) * (y - ny) / (my - ny)) : RD(mx - mx * q);
      px(E, T, x, y, M.bone, 4); line(E, T, x + 1, y, x + 6, y + 1, M.bone, 0); line(E, T, x + 6, y + 1, x + 7, y + 3, M.bone, 2); }
    E.part(); run(E, T, py, -3, 2, M.bone, 0); px(E, T, -4, py + 1, M.bone, 2); px(E, T, 3, py + 1, M.bone, 2); px(E, T, -1, py - 1, M.bone, 4);
  }
  // 候选部件：bonePile —— 落地的骨头：按落下的顺序叠在布堆上（n 1 龙冠 · 2 骨翼领 · 3 头骨与肋骨 · 4 镰），全部沿布堆表面平躺
  function bonePile(R, n, cx) {
    if (n >= 2) { E.part(); lay(R, cx - 14, cx - 4, 1, M.wingD, 0); E.part(); lay(R, cx - 13, cx - 2, 1, M.wing, 0); lay(R, cx - 12, cx - 3, 2, M.wing, 0);   // 两截翼臂骨
      for (const fx0 of [-11, -7]) { px(E, R, cx + fx0, surf(cx + fx0) - 3, M.wing, 4); px(E, R, cx + fx0 - 1, surf(cx + fx0 - 1) - 4, M.wing, 4); } }       // 翘起的指骨
    if (n >= 3) { E.part(); for (const fx0 of [-9, -6, -3]) { px(E, R, cx + fx0, surf(cx + fx0) - 1, M.bone, 0); px(E, R, cx + fx0 + 1, surf(cx + fx0 + 1) - 2, M.bone, 4); px(E, R, cx + fx0 + 2, surf(cx + fx0 + 2) - 2, M.bone, 3); }   // 散开的肋骨弧
      lay(R, cx - 16, cx - 12, 0, M.bone, 3); lay(R, cx + 10, cx + 14, 0, M.bone, 3); }                                                  // 露在布堆两边的臂骨 / 腿骨
    if (n >= 1) { E.part(); lay(R, cx - 3, cx + 2, 1, M.crown, 0); for (const [fx0, h] of [[-2, 2], [0, 3], [2, 2]]) for (let k = 2; k <= h; k++) px(E, R, cx + fx0, surf(cx + fx0) - k, M.crown, k === h ? 4 : 3);
      px(E, R, cx - 4, surf(cx - 4) - 2, M.crownD, 3); px(E, R, cx - 5, surf(cx - 5) - 2, M.crownD, 3); }                                  // 龙冠（三尖朝上、龙角朝后）
    if (n >= 3) { E.part(); const x0 = cx + 4, y0 = surf(cx + 6);                                                                        // 头骨（侧躺在布堆前坡上）
      run(E, R, y0 - 4, x0 + 1, x0 + 4, M.skull, 0); run(E, R, y0 - 3, x0, x0 + 5, M.skull, 0); run(E, R, y0 - 2, x0, x0 + 5, M.skull, 0); run(E, R, y0 - 1, x0 + 1, x0 + 5, M.skull, 0);
      px(E, R, x0 + 3, y0 - 3, M.sock, 1); px(E, R, x0 + 4, y0 - 3, M.sock, 1); px(E, R, x0 + 5, y0 - 1, M.sock, 1); px(E, R, x0 + 4, y0 - 1, M.skull, 4); }
    if (n >= 4) { E.part(); line(E, R, cx - 17, -1, cx + 9, -2, M.shaft, 3); line(E, R, cx - 16, 0, cx + 9, -1, M.shaft, 2);               // 横躺在地上的镰：骨柄 → 龙颅镰座 → 刃尖勾起
      for (let x = cx - 12; x <= cx + 6; x += 6) px(E, R, x, x < cx - 4 ? -1 : -2, M.shaft, 4);
      E.part(); const sx = cx + 10; run(E, R, -5, sx + 1, sx + 3, M.seat, 0); run(E, R, -4, sx, sx + 5, M.seat, 0); run(E, R, -3, sx, sx + 6, M.seat, 0); run(E, R, -2, sx, sx + 5, M.seat, 0); run(E, R, -1, sx + 1, sx + 4, M.seat, 0);
      px(E, R, sx + 3, -4, M.sock, 1); px(E, R, sx + 5, -2, M.seat, 4);
      E.part(); for (const [dx, dy] of [[7, -3], [8, -2], [8, -1]]) px(E, R, sx + dx, dy, M.steel, 3); for (const [dx, dy] of [[6, -4], [7, -4], [7, -5]]) px(E, R, sx + dx, dy, M.steel, 4); }
  }
  const seg = (f, f0) => (f < f0 ? 0 : f === f0 ? 3 : f === f0 + 1 ? 10 : -1);   // 一段骨头的下落量：0 没动 · 3 / 10 下落中 · -1 已落地
  const shiftR = (R, d) => Object.assign({}, R, { ty: R.ty + d });
  function topple(a, bx) { const dx = Math.sin(a), dy = -Math.cos(a), by = 0; return { dx, dy, bx, by, tx: RD(bx + dx * (UP + DN)), ty: RD(by + dy * (UP + DN)), r0: ((RD(a / (Math.PI / 2)) % 4) + 4) % 4 }; }
  function drawDeath(R, S) {
    const f = P.df, sl = f >= DF_SLUMP ? 3 : f - 4, cx = 1, dC = seg(f, DF_CROWN), dW = seg(f, DF_WING), dR = seg(f, DF_RIB);
    const scy = f < DF_SCY ? S : f < DF_REST ? (f === DF_SCY ? topple(0.75, 8) : topple(1.25, -8)) : null, smir = f === DF_SCY + 1 ? 1 : 0, n = (dC < 0) + (dW < 0) + (dR < 0) + (f >= DF_REST);
    if (scy && scy.r0 === 0 && !smir) scytheBlade(frm(R, 0, scy.tx, scy.ty), 4, 1);
    if (dW >= 0) boneWings(shiftR(R, dW), 1, 0);
    if (dR >= 0) { const T = shiftR(R, dR); parts.arm(E, T, P, { side: 'B', sleeve: 'bare', mat: M.boneD, hand: M.boneD, grip: 'fist', at: [R.sBx + 2, R.sBy + 12] }); ribCage(T); }
    if (dR === 0) parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD, w: 3 });
    shroudHeap(R, sl, cx);
    hgAt[0] = cx + 6; hgAt[1] = -3 - (3 - sl) * 3; hourglass(R, hgAt[0], hgAt[1], sl >= 3 ? 1 : 0, 4);   // 沙漏跟着布堆滑下来，最后横倒在布堆前
    bonePile(R, n, cx);
    if (dR >= 0) reaperSkull(shiftR(R, dR), 4);
    if (dC >= 0) dragonCrown(shiftR(R, dC), R.hx0, R.hw, R.htop);
    if (scy) dragonScythe(R, scy, 4, smir, scy.r0 === 0 && !smir);          // 倒下的最后一帧柄尾往后滑、镰头翻面，刃砸到地上
    if (dR >= 0) parts.arm(E, shiftR(R, dR), P, { sleeve: 'bare', mat: M.bone, hand: M.bone, grip: 'big' });
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY), S = scythePts();
    if (P.st === DEATH && P.df >= 5) { drawDeath(R, S); return; }
    const bladeBack = S.r0 === 0 && !P.mir;                             // 刃弧朝后弯过头顶时压在骨翼领、龙冠后面
    if (bladeBack) scytheBlade(frm(R, 0, S.tx, S.ty), P.gem, 1);
    boneWings(R, P.wing, P.sway);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, grip: 'none', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD, w: 3 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.shroud, hem: -3, belt: M.sash });
    { const LL = tor.rows[0], RR = tor.rows[1], n = LL.length, L = LL[n - 1], sw = P.sway;          // 裹尸布拖地 4 格 + 缠布条（同一部件）
      run(E, R, -2, L - 1 + sw, L + 3, M.shroud, 0); run(E, R, -1, L - 3 + sw, L + 2, M.shroud, 0); run(E, R, 0, L - 4 + sw, L + 1, M.shroud, 0);
      for (let x = L - 4 + sw; x <= L + 1; x += 3) px(E, R, x, 0, M.shroud, 1);
      for (let i = 4; i < n - 3; i += 5) { const y = R.yS + i; line(E, R, LL[i] + 1, y, RR[i + 2] - 1, y + 2, M.shroud, 2); }
      for (let x = L; x <= RR[n - 1]; x++) if ((((x - sw) % 4) + 4) % 4 === 2) px(E, R, x, -2, M.shroud, 2); }
    hgAt[0] = tor.front - 2; hgAt[1] = tor.belt + 5; hourglass(R, hgAt[0], hgAt[1], P.hg, P.gem);
    reaperSkull(R, P.gem);
    dragonCrown(R, R.hx0, R.hw, R.htop);
    dragonScythe(R, S, P.gem, P.mir, bladeBack);
    parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: P.bfree ? M.bone : M.boneD, grip: 'big' });
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, hand: M.bone, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let crT = 9, recT = 9, swT = 9, chargeAcc = 0, soulAcc = 0, rainAcc = 0, wispAcc = 0, lastStep = 0, lastPers = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y, CX = DUMMY_X - 15;   // CX：裂缝 / 骨龙升起的位置（目标前方）
  const HG = () => [wx(hgAt[0] + P.bx), wy(hgAt[1])];                 // 沙漏（世界坐标；drawHero 记下的最近一次位置，只给特效用）
  function onEnter(s) {
    if (s === CHARGE) { dim(DUR[CHARGE] + 0.3); fx.circle(HX + 2, HY + 1, 18, 4, R_EL, 2.2, -0.35, 0); }
    if (s === RECOVER) recT = 0;
    if (s !== CAST) return;
    crT = 0;                                                            // 镰刀划地：巨大弧形裂缝 + 冥霜白光喷涌
    releaseOrbit(40, 100, 0.3, 0.6, { pts: 1 });
    fx.slash(CX - 8, HY - 40, 38, 3.55, 2.75, FR, 0.35, 2, 2);                 // 贴地的一道大弧
    fx.crack(CX, HY + 1, 16, 1, FR, 1.1); fx.crack(CX - 2, HY + 1, 18, -1, FR, 1.1); fx.cross(CX, HY - 2, 6, FR, 0.25);
    ring(CX, HY - 2, 1, FR); burst(CX, HY - 3, 24, 40, 120, 0.25, 0.6, FR, 30);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'frost', w: 0.8 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWEEP) {                               // 横着一挥：弯月魂光镰弧（10 宽 × 12 高）从擦地的刃口贴地飞出
      swT = 0; const x = wx(24), y = HY - 6;
      shoot(1, x, y, 170, DUMMY_X - 5, R_EL, 0, { trail: { every: 1, life: [0.15, 0.3], back: [14, 30], off: 3 }, glow: 1 });
      burst(x, y, 8, 20, 60, 0.15, 0.3, R_EL, 0); for (let i = 0; i < 4; i++) spawn(K_DUST, x - 4 + Math.random() * 6, HY - 1, (Math.random() - 0.3) * 30, -4 - Math.random() * 6, 0.35, ASH);
      sfx('swing', { kind: 'slash', w: 0.9 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_HIT) {                                   // 骨龙头颅从裂缝里升起：魂光柱 + 大冲击环 + 骨灰外爆
      fx.pillar(CX, HY - 46, HY, 4, R_EL, 0.5, 1); ring(CX, HY - 4, 1, R_EL); burst(CX, HY - 6, 36, 40, 130, 0.3, 0.8, ASH, 30); burst(CX, HY - 10, 16, 30, 90, 0.3, 0.6, R_EL, 20);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.95 });
    }
    if (s === DEATH && t === T_SLUMP) {                                 // 裹尸布塌成堆、沙漏横倒：魂光从沙漏里炸散上升
      const [hx, hy] = HG(); burst(hx, hy, 28, 40, 120, 0.4, 0.9, R_EL, 30); ring(hx, hy, 0, R_EL); shake(0.16, 2); sfx('hit', { mat: 'magic', w: 0.5 });
      for (let i = 0; i < 8; i++) spawn(K_DUST, wx(-12 + Math.random() * 26), HY - 1, (Math.random() - 0.5) * 30, -3 - Math.random() * 5, 0.4, ASH);
    }
    for (let j = 0; j < 3; j++) if (s === DEATH && t === T_LAND[j]) {  // 龙冠 / 骨翼领 / 头骨与肋骨 落在布堆上：一小团骨灰 + 骨头磕碰声
      const x = wx([1, -7, 3][j] + P.bx); for (let i = 0; i < 6 + j * 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * (8 + j * 4), HY - 6, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.35 + Math.random() * 0.2, ASH);
      if (j === 2) shake(0.08, 1); sfx('hit', { mat: 'stone', w: 0.4 + j * 0.15 });
    }
    if (s === DEATH && t === T_THUD) { for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-16 + Math.random() * 36 + P.bx), HY - 1, (Math.random() - 0.5) * 30, -4 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.95 }); }
  }
  const EVENTS = [[], [], [T_SWEEP], [], [T_HIT], [], [], [T_SLUMP, T_LAND[0], T_LAND[1], T_LAND[2], T_THUD], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 8); fx.slash(x - 2, y, 6, 0.2, 2.9, FR, 0.15, 1, 2); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.5 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy), [hx, hy] = HG();
    if (state === CHARGE) {                                             // 亡者魂光从地面浮起，排成长队流进沙漏
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const side = Math.random() < 0.6 ? 1 : -1, sx = HX + side * (14 + Math.random() * 38), sy = HY - 1 - Math.random() * 3, dx = sx - hx, dy = (sy - hy) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, hx, hy, r / (0.6 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: side * (0.4 + Math.random() * 0.4), tx: hx, ty: hy, orbitR: 1.5 });
      }
      if (Math.random() < dt * 14) spawn(K_RISE, HX + (Math.random() - 0.3) * 70, HY - 1, 0, -6 - Math.random() * 6, 0.6, R_EL);
    }
    if (state === MOVE && P.step !== lastStep) {                        // 每一步：裹尸布下摆扫出一片尘 + 震屏 1 格
      if (P.step !== 0) {
        sfx('step', { w: 0.9 }); shake(0.08, 1); const fxp = wx(P.step > 0 ? 8 : -7);
        for (let i = 0; i < 3; i++) spawn(K_DUST, fxp + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, FXI.dust);
        for (let i = 0; i < 3; i++) spawn(K_DUST, wx(-16 + Math.random() * 5), HY - 1, -(8 + Math.random() * 16) * (P.flip ? -1 : 1), -3 - Math.random() * 4, 0.45, FXI.dust);
      }
      lastStep = P.step;
    }
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 2) { spawn(K_EMBER, gx, gy - 1, 0, -10, 0.5, R_EL); spawn(K_EMBER, hx, hy - 3, 2, -8, 0.5, R_EL); } lastPers = f; }
      wispAcc += dt * 1.5; while (wispAcc >= 1) { wispAcc -= 1; spawn(K_EMBER, hx + (Math.random() - 0.5) * 3, hy - 4, (Math.random() - 0.5) * 4, -5 - Math.random() * 4, 0.6, R_EL); }
    }
    if (state === RECOVER) { wispAcc += dt * 10; while (wispAcc >= 1) { wispAcc -= 1; spawn(K_RISE, gx + (Math.random() - 0.5) * 3, gy - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6, R_EL); } }
    if (state === DEATH && stT > DF_CROWN / 12 && stT < DF_REST / 12) {    // 骨雨：正在落的那一段骨头上掉下来的碎骨，竖直落在布堆上
      const top = HY - 34 + (stT - DF_CROWN / 12) * 24;
      rainAcc += dt * 22; while (rainAcc >= 1) { rainAcc -= 1; fall(wx(-10 + Math.random() * 22 + P.bx), top + Math.random() * 6, (Math.random() - 0.5) * 6, 20 + Math.random() * 20, HY - 5 - Math.floor(Math.random() * 2), ASH, Math.random() < 0.3 ? 2 : 1); }
    }
    if (state === DEATH && stT > T_SLUMP && stT < INCOMING + 2.4) { soulAcc += dt * (stT < T_SLUMP + 0.5 ? 26 : 14); while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-12 + Math.random() * 26 + P.bx), HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 8, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    crT += dt; recT += dt; swT += dt;
  }
  function fxReset() { crT = 9; recT = 9; swT = 9; chargeAcc = 0; soulAcc = 0; rainAcc = 0; wispAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 裂缝里喷涌的冥霜白光 + 骨龙的头颅和脊骨一节一节升起
  const BONE = [8, 7, 6, 17];
  function vertebra(x, y, k, dq) {
    const c = (i) => BONE[i];
    for (let dx = -2; dx <= 1; dx++) { put(x + dx, y, dx === -2 ? c(1) : c(2)); put(x + dx, y + 1, c(1)); }
    put(x - 1, y - 1, c(3)); put(x - 2, y - 2, c(2));                                                  // 棘突
    if (k >= 2 && k <= 5) { for (const s of [-1, 1]) { put(x + s * 3, y + 1, c(2)); put(x + s * 4, y + 2, c(2)); put(x + s * 4, y + 3, c(1)); } }   // 肋骨
    put(x, y, FRL[1]);                                                                                 // 骨节里透出的冥霜光
  }
  function dragonHead(x, y) {                                          // 骨龙头颅（朝右，张口，眼窝冥霜白光）
    const B = BONE, rows = [[-6, -2, 2], [-5, -3, 4], [-4, -4, 6], [-3, -4, 8], [-2, -3, 8], [0, -2, 7], [1, -1, 5]];
    for (const [dy, a, b] of rows) for (let dx = a; dx <= b; dx++) put(x + dx, y + dy, dy === -6 || dx === a ? B[3] : dy >= 0 ? B[1] : B[2]);
    put(x + 1, y - 4, 21); put(x + 2, y - 4, FRL[1]); put(x + 7, y - 3, B[0]);                          // 眼窝、鼻孔
    for (let dx = 1; dx <= 7; dx += 2) put(x + dx, y - 1, B[3]); for (let dx = 0; dx <= 5; dx++) if (!(dx & 1)) put(x + dx, y - 1 + 1 - 1, B[3]);
    for (let dx = 0; dx <= 6; dx++) put(x + dx, y - 1, dx & 1 ? FRL[2] : B[3]);                       // 口中冥霜光 + 牙
    put(x - 3, y - 7, B[2]); put(x - 4, y - 8, B[3]); put(x - 1, y - 7, B[2]); put(x - 1, y - 8, B[3]);  // 冠角
  }
  function fxMid(f12) {
    const st = E.state; if (st !== CAST && st !== RECOVER) return;
    const t = st === CAST ? crT : DUR[CAST] + recT;
    if (t < 0.6) {                                                      // 冥霜白光从裂缝里喷涌
      const q = clamp01(t / 0.1), fade = clamp01((t - 0.3) / 0.3);
      for (let dx = -14; dx <= 14; dx++) { if ((dx & 1) && fade > 0.4) continue; const h = RD((4 + 10 * E.hash(dx + 40, f12 >> 1)) * q * (1 - fade) * (1 - Math.abs(dx) / 18)); for (let k = 0; k < h; k++) put(CX + dx, HY - k, k === 0 ? 21 : FRL[CL(RD(k / h * 3), 0, 3)]); }
    }
    if (t >= T_HIT) {
      const q = t - T_HIT, rise = clamp01(q / 0.55), dq = st === RECOVER ? clamp01((recT - 0.35) / 0.3) : 0; if (dq >= 1) return;
      const path = (s) => [RD(CX - 5 * Math.sin(Math.PI * s) + 7 * s * s), RD(HY + 2 - 34 * s)];
      const N = 8;
      for (let k = N; k >= 1; k--) { const s = rise - k * 0.11; if (s < 0.02) continue; if (dq > 0 && B8[((k * 3) & 7) * 8 + (k & 7)] < dq) continue; const [x, y] = path(s); vertebra(x, y, k, dq); }
      const [hx, hy] = path(rise); if (!(dq > 0.5 && (f12 & 1))) dragonHead(hx, hy);
      if (q < 1 / 12) { for (let k = -3; k <= 3; k++) put(hx + k, hy - 3, 21); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (swT < 2 / 12) {                                                 // 横挥拖影：从肩后绕过头顶甩到身前地面的弧，外弧（这一帧）亮、内弧（上一帧）暗，第 2 帧只剩断续的内弧
      const cx = wx(4 + P.bx), cy = wy(-20), late = swT >= 1 / 12;
      for (const [r, a0, lv] of [[20, 2.5, 0], [16, 1.9, 1]]) {
        if (late && lv === 0) continue;
        for (let a = a0, k = 0; a >= -0.95; a -= 0.05, k++) { if (late && (k & 1)) continue; const q = (a0 - a) / (a0 + 0.95), c = late ? EL[2] : q > 0.66 ? (lv ? EL[0] : FRL[0]) : q > 0.33 ? EL[lv] : EL[lv + 1];
          const x = RD(cx + Math.cos(a) * r), y = RD(cy - Math.sin(a) * r); if (y <= HY) { put(x, y, c); if (!lv && q > 0.5 && y + 1 <= HY) put(x, y + 1, EL[1]); } }
      }
    }
  }
  // 弯月魂光镰弧（10 宽 × 12 高，下尖贴地）：外沿一道白刃口，往里 冰青 → 青 → 蓝 逐层变暗，两只月牙尖往回勾；凹口里拖两道魂光尾，逐帧上下抖 1 格
  const CRES = [[-6, 0, 1], [-5, 3, 2], [-4, 5, 2], [-3, 7, 3], [-2, 8, 3], [-1, 9, 4], [0, 9, 4], [1, 8, 3], [2, 7, 3], [3, 5, 2], [4, 3, 2], [5, 0, 1]];
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1) return false;
    const w = f12 & 1, X = RD(x) - 4 * d, Y = RD(y);
    for (const [dy, xo, th] of CRES) for (let j = 0; j < th; j++) put(X + d * (xo - j), Y + dy, j === 0 ? 21 : j === 1 ? FRL[1] : j === 2 ? EL[0] : EL[1]);
    for (let k2 = 0; k2 <= 5; k2++) { put(X + d * (3 - k2), Y - 2 + w, EL[k2 < 2 ? 1 : k2 < 4 ? 2 : 3]); put(X + d * (3 - k2), Y + 1 - w, EL[k2 < 2 ? 1 : k2 < 4 ? 2 : 3]); }
    return true;
  }

  return {
    name: '死神', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.soul, M.soulHot, M.edge], HIT_POINT: [4, -22], EVENTS,
    SFX: { body: 'stone', how: 'shatter', pal: 'time', style: 'summon', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
