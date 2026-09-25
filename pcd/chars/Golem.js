// 魔像 Golem（衍生单位 · 不死 · 先锋 · 稀有 · 近战 272）：巨人战神死亡时崩下来的三块石头之一（战神特性「小九头蛇」：死亡时召唤 3 只魔像）。
// 矮墩石块：一块圆角孔雀石大石头就是身体（占全身六成），顶上一块 4 格小石头当头、嵌一只魂火独眼；腿粗短；两只比头还大的圆石拳头垂到膝盖。
// 身上带着战神的三分之一：头顶斜插一片蓝铜矿碎壳（战神碎壳盔上的一片）、后肩一块蓝铜碎壳、胸口一颗孔雀绿魂核（战神三核之一）外围一圈蓝铜晶簇。
// 攻击：直拳（后引拳到肩后 1 帧 → 整个身体前倾，前拳直捣 4 格，拳面撞出碎石火花）。步态：双脚并跳（落地压扁 1 格、掉石屑），没有普通迈步。
// 技能（无特性的衍生单位，做符合身份的招式）：抱拳后跳 → 缩成一颗石球原地越转越快 → 弹射滚撞假人 → 反弹、半空展开、落地拍拍拳头。
// 死亡：拳头先掉到地上 → 身体从上往下塌成一堆碎石（死亡套件 chunks，小块不外爆）→ 魂核从石堆里滚出来、闪几下熄灭。
// 身体骨架用 parts.rig（child 改宽：sw 5、limb 1.6、head 4）；石身、巨石拳、碎壳、晶簇魂核、石球都在本模块里自绘（通用的标「候选部件」）。
PCD.define('Golem', (E) => {
  const { parts, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, keyer, FXI, FXR, HY, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_ORBIT_PT, K_RISE, K_DUST, K_PHYS, K_TRAIL, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, death, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：石魂 · 孔雀石绿（白 → 淡孔雀 → 孔雀绿 → 深绿 → 墨绿）；碎石屑单独一条石色色阶（落地后变暗）─────
  const R_EL = fxRamp('golemSoul', [21, '#b8f0c8', '#4ac080', '#1e7a50', '#0c3424']), EL = FXR[R_EL];
  const R_PEB = fxRamp('golemPebble', ['#5cc08a', '#2a8a5e', '#2a8a5e', '#14543c', '#08221a']);
  // ───── 材质：孔雀石绿石身、蓝铜矿碎壳（和神石 / 战神同一色阶）、苔藓、魂核（两档发光）─────
  const ROCK = ['#08221a', '#14543c', '#2a8a5e', '#5cc08a'], CU = ['#0a1438', '#1a3a8a', '#2e62c8', '#6aa0f0'];
  const M = parts.mats(E, {
    body: { r: ROCK, band: 2 }, rock: ROCK, cu: CU, moss: 'moss',
    core: { r: ['#0c3424', '#1e7a50', '#4ac080', '#b8f0c8'], flat: 1 }, hot: { r: ['#4ac080', '#b8f0c8', 21, 21], flat: 1 },
  });
  const OUT = FXR[R_PEB], CUI = CU.map((h) => E.color(h)), MOSS = E.RAMP.moss;                        // 死亡时石堆和魂核用的石色、蓝铜碎壳色

  // 体型：child 改宽——胯高 3、躯干 11（一整块石头）、头 4×4、sw 5、四肢粗 1.6、腿粗 3；头往前偏 1
  const BODY = { body: 'child', leg: 3, torso: 11, head: 4, headW: 4, sw: 5, limb: 1.6, lw: 3, arm: 7, headX: 1, stride: 0 };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(56, 46, 26, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['cu', 'core', 'hot', 'moss']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }   // 魂核光只打在石头上

  // ───── 姿势 ─────
  // 前拳中心 ffx/ffy、后拳中心 rfx/rfy（本地坐标）；lean 上半身前倾；air 离地；legs 0 站 · 1 收腿 · 2 后蹬 · 3 前伸；feet 1 = 两脚并拢；
  // ball 0 人形 · 1 半蜷 · 2 石球；spin 石球朝向（每档 90°）；hs 头缩进身体几格；hug 1 = 后拳抱在胸前；fdrop 1 拳头脱落下坠 · 2 落地
  const P = { st: 0, bob: 0, sq: 0, lean: 0, look: 0, bx: 0, air: 0, crouch: 0, ffx: 0, ffy: 0, rfx: 0, rfy: 0, legs: 0, feet: 0, ball: 0, spin: 0, hs: 0, hug: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, dq: 0, dq48: 0, fdrop: 0, sway: 0, head: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['st', 0, 8], ['bob', 0, 1], ['sq', 0, 1], ['lean', -1, 1], ['look', -1, 1], ['bx', -8, 8], ['air', 0, 12], ['crouch', 0, 3],
    ['ffx', -6, 16], ['ffy', -20, 2], ['rfx', -12, 8], ['rfy', -20, 2], ['legs', 0, 3], ['feet', 0, 1], ['ball', 0, 2], ['spin', 0, 3], ['hs', 0, 2], ['hug', 0, 1],
    ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dq48', 0, 48], ['fdrop', 0, 2], ['sway', -1, 1]]);
  const K = (ffx, ffy, rfx, rfy, lean, crouch) => ({ ffx, ffy, rfx, rfy, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -4, -9, -4);                  // 两拳垂到膝盖，一前一后伸出身体
  const K_WIND = K(0, -11, -7, -6, -1, 1);          // 前拳收到肩后、身体后坐
  const K_PUNCH = K(10, -10, -4, -7, 1, 0);         // 直拳：整个身体前倾，前拳捣出 4 格
  const K_HOLD = K(9, -9, -5, -6, 1, 0);
  const K_HUG = K(6, -7, 2, -8, 0, 1);              // 抱拳（后拳抱到胸前）
  const K_SPREAD = K(9, -10, -9, -10);              // 半空展开：两拳张开
  const K_LAND = K(9, -3, -9, -3);                  // 落地压扁：两拳撑开
  const K_CLAPO = K(8, -6, -1, -7), K_CLAPI = K(6, -6, 2, -7);   // 拍拍拳头：分开 / 合上
  const K_HURT = K(9, -7, -6, -7, -1, 0);           // 受击：身体被打退，两拳惯性往前上甩
  const FIELDS = ['ffx', 'ffy', 'rfx', 'rfy', 'lean', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B == null ? A : B, q || 0, FIELDS);
  const SW = [0, 1, 0, -1];
  // 双脚并跳（6 fps 步态帧）：0 落地压扁 · 1 蹬地起跳 · 2 空中收腿 · 3 下落伸腿
  const HOP = [
    { air: 0, bob: 1, sq: 1, legs: 0, lean: 0, k: K(9, -3, -10, -3) },
    { air: 1, bob: 0, sq: 0, legs: 2, lean: 1, k: K(6, -6, -11, -5) },
    { air: 3, bob: 0, sq: 0, legs: 1, lean: 0, k: K(10, -9, -7, -9) },
    { air: 1, bob: 0, sq: 0, legs: 3, lean: 0, k: K(9, -6, -9, -6) },
  ];
  const T_HIT = 2 / 12, T_HOP = 1 / 12, T_TOUCH = 3 / 12, T_CONTACT = 2 / 12, T_CLAP = [3 / 12, 5 / 12], T_PEBBLE = 1.75;
  const T_FISTS = INCOMING + 0.33, T_CRUMBLE = INCOMING + 0.5, T_PILE = T_CRUMBLE + 0.3, T_ROLL = T_CRUMBLE + 0.32, T_OUT = T_CRUMBLE + 1.0;
  const FADE_AT = 1.1, FADE_DUR = 0.6;
  const CH_MX = [0, -3, -6, -8];                    // 蓄力：抱拳后跳一步
  const CAST_MX = [-3, 2, 7, 4, 2, 0], CAST_AIR = [0, 0, 0, 5, 7, 3], CAST_BALL = [2, 2, 2, 2, 1, 0];   // 施放：滚撞 → 反弹 → 半空展开
  function spinCount(f) { let s = 0; for (let k = 6; k <= f; k++) { if (k < 10) { if ((k - 6) % 3 === 0) s++; } else if (k < 13) { if ((k - 10) % 2 === 0) s++; } else s++; } return s; }   // 越转越快：每 3 帧 → 2 帧 → 1 帧转 90°

  function reset(st) {
    P.st = st; P.bob = 0; P.sq = 0; P.lean = 0; P.look = 0; P.bx = 0; P.air = 0; P.crouch = 0; P.legs = 0; P.feet = 0; P.ball = 0; P.spin = 0; P.hs = 0; P.hug = 0;
    P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.dq = 0; P.fdrop = 0; P.sway = 0; P.flip = 0; P.mx = 0;
  }
  function idle(tq, f12) {
    setK(K_IDLE); const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SW[Math.floor(TT * 1.25 + 1e-6) & 3];
    P.ffx += P.sway; P.rfx += P.sway;                                           // 两拳像钟摆一样慢慢晃（和呼吸错相位）
    const lp = tq % DUR[IDLE];                                                  // 待机个性：没有脖子，整个身体转过去往后看、再转回来往前看
    if (lp >= 1.3 - 1e-6 && lp < 1.6) { P.look = -1; P.bx = -1; P.sway = 1; }
    else if (lp >= 1.6 - 1e-6 && lp < 2.0) { P.look = 1; P.bx = 1; P.sway = -1; P.glint = lp >= 1.67 && lp < 1.84 ? 1 : 0; }
    if (lp >= 0.8 - 1e-6 && lp < 0.92) P.gem = 1;                               // 魂核偶尔亮一下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset(st);
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = E.gait(tq), h = HOP[f]; setK(h.k); P.air = h.air; P.bob = h.bob; P.sq = h.sq; P.legs = h.legs; P.lean = h.lean; P.feet = 1; P.sway = f === 0 ? 1 : f === 2 ? -1 : 0;
      const w = walkDemo(Math.floor(tq * 6 + 1e-6) / 6, 12, -1); P.mx = w.mx; P.flip = w.flip;   // 只在每个步态帧换位置：一蹦一格，不滑
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { setK(K_IDLE, K_WIND, 0.5); P.bx = 0; }
      else if (tq < T_HIT - 1e-6) { setK(K_WIND); P.bx = -1; P.sway = 1; P.gem = 1; }
      else if (tq < 0.25 - 1e-6) { setK(K_PUNCH); P.bx = 4; P.sway = -1; P.gem = 2; P.rim = 2; P.glint = 1; }
      else if (tq < 0.45) { setK(K_PUNCH, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.bx = 3; P.sway = -1; P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {
      const f = f12of(tq); P.mx = CH_MX[Math.min(3, f)];
      if (f === 0) { setK(K_HUG); P.hug = 1; }
      else if (f <= 2) { setK(K_HUG); P.hug = 1; P.crouch = 0; P.air = f === 1 ? 2 : 3; P.legs = f === 1 ? 2 : 1; P.feet = 1; }
      else if (f <= 4) { setK(K_HUG); P.hug = 1; P.ball = 1; P.hs = f === 3 ? 1 : 2; P.crouch = 2; P.feet = 1; P.bob = f === 3 ? 1 : 0; P.sq = f === 3 ? 1 : 0; }
      else { setK(K_HUG); P.ball = 2; P.spin = spinCount(f) & 3; }
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = tq < 0.5 ? 1 : 2;
    } else if (st === CAST) {
      const f = Math.min(5, f12of(tq)); P.mx = CAST_MX[f]; P.air = CAST_AIR[f]; P.ball = CAST_BALL[f]; P.spin = (spinCount(16) + Math.min(f, 3) + 1) & 3;
      if (P.ball === 1) { setK(K_HUG, K_SPREAD, 0.5); P.hs = 1; P.crouch = 2; P.feet = 1; }
      else { setK(K_SPREAD); P.legs = 3; P.feet = 1; }
      P.gem = f <= 2 ? 3 : 2; P.rim = f <= 2 ? 3 : 2;
    } else if (st === RECOVER) {
      const f = f12of(tq);
      if (f === 0) { setK(K_LAND); P.bob = 1; P.sq = 1; }
      else if (f === 1) setK(K_LAND, K_CLAPO, 0.6);
      else if (f <= 5) { if (f & 1) { setK(K_CLAPI); P.hug = 1; } else setK(K_CLAPO); }   // 拍拍拳头两下（3/12、5/12）
      else setK(K_CLAPO, K_IDLE, ease.inOut(clamp01((tq - 0.5) / 0.2)));
      P.feet = f <= 1 ? 1 : 0; P.gem = tq < 0.25 ? 2 : tq < 0.5 ? 1 : 0; P.rim = tq < 0.35 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 4; }
      else if (d < 0.33 - 1e-6) {                                               // 手臂一软，两只拳头先脱落、往下掉
        setK(K_HURT); P.fdrop = 1; P.bx = -2; P.eyes = 1; P.crouch = 1; P.gem = (f12 & 1) ? 1 : 4;
        const k = d < 0.28 ? 0 : 1; P.ffx = 9 + k; P.ffy = k ? -3 : -5; P.rfx = -7 - k; P.rfy = k ? -3 : -5;
      } else if (d < 0.5 - 1e-6) {                                               // 拳头落地往外滚一格；身体下沉、头往里缩，眼和核闪
        P.fdrop = 2; P.ffx = 11; P.ffy = -2; P.rfx = -10; P.rfy = -2; P.bx = -2; P.eyes = 1; P.crouch = d < 0.42 ? 1 : 2; P.hs = d < 0.42 ? 0 : 1; P.gem = (f12 % 3) === 0 ? 1 : 4;
      } else P.dq = 1;                                                           // 身体交给死亡套件（碎块从上往下塌成一堆）
    } else if (st === REVIVE) {
      idle(tq, f12); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.ffx = RD(P.ffx); P.ffy = RD(P.ffy); P.rfx = RD(P.rfx); P.rfy = RD(P.rfy); P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    const c = coreAt(); P.gx = c[0] + P.bx; P.gy = c[1] - P.air;
    P.dq48 = RD(P.dq * 48); KEY(P);
  }

  // ───── 几何（画和特效共用）─────
  const rigOf = () => parts.rig(P, BODY);
  // 身体石块第 y 行的左右列：上宽下窄的圆角大石（最宽在肩下一行，上半超椭圆指数 3 = 平肩，下半 2.5 往下收）；前倾只推上半身
  function rowSpan(R, y) {
    const top = R.yS, bot = R.yHip, cw = top + 4, rt = cw - top + 0.5, rb = bot - cw + 1, rx = 6.4 + (P.sq ? 0.8 : 0), n = Math.max(1, bot - top);
    const t = y < cw ? (cw - y) / rt : (y - cw) / rb, p = y < cw ? 3 : 2.5; if (t > 1) return null;
    const hw = rx * Math.pow(Math.max(0, 1 - Math.pow(t, p)), 1 / p), sh = RD(P.lean * (bot - y) / n);
    return [Math.ceil(-0.5 - hw + sh - 1e-6), Math.floor(-0.5 + hw + sh + 1e-6), sh];
  }
  const rot = (i, j, r) => (r === 0 ? [i, j] : r === 1 ? [-j, i] : r === 2 ? [-i, -j] : [j, -i]);   // 顺时针 90° 一档（向右滚）
  function coreAt() {
    if (P.ball === 2) { const q = rot(2, -3, P.spin); return [q[0], -7 + q[1]]; }
    const R = rigOf(), y = R.yS + 3, s = rowSpan(R, y); return [4 + (s ? s[2] : 0), y];
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：stoneFist（圆石巨拳 5×5：圆角、左上高光、朝前的一面两道指缝）
  function stoneFist(cx, cy, m, front) {
    part();
    for (let dy = -2; dy <= 2; dy++) { const w = Math.abs(dy) === 2 ? 1 : 2; for (let dx = -w; dx <= w; dx++) sp(cx + dx, cy + dy, m, 0); }
    sp(cx - 1, cy - 1, m, 4);                                                    // 圆石高光
    if (front) { sp(cx + 1, cy - 1, m, 2); sp(cx + 2, cy - 1, m, 1); sp(cx + 1, cy + 1, m, 2); sp(cx + 2, cy + 1, m, 1); }   // 指缝
    else sp(cx + 1, cy, m, 2);
  }
  // 候选部件：stoneArm（石柱短臂：3 格粗，从肩到拳心；stub 1 = 只剩肩上一截）
  function stoneArm(sx, sy, fx, fy, m, stub) {
    part();
    const dx = fx - sx, dy = fy - sy, L = Math.hypot(dx, dy) || 1, len = stub ? 2 : Math.max(0, L - 2), n = Math.max(1, Math.ceil(len * 1.5));
    for (let s = 0; s <= n; s++) E.brush(sx + dx / L * len * s / n, sy + dy / L * len * s / n, 1.1, m, 0);
  }
  function legs(R) {
    const top = R.yHip + 1, tuck = P.legs === 1 ? 1 : 0, ext = P.legs >= 2 ? 1 : 0, dx = P.legs === 2 ? -1 : P.legs === 3 ? 1 : 0, bot = -tuck + ext;
    const col = (x0, m) => { part(); for (let y = top; y <= bot; y++) { const toe = y === bot ? 1 : 0; for (let x = x0; x <= x0 + 2 + toe; x++) sp(x, y, m, 0); } if (bot >= top) sp(x0, bot, m, 2); };
    col((P.feet ? -1 : R.hipBx - 1) + dx, M.rockD);                              // 远侧腿（暗一级）
    col((P.feet ? 1 : R.hipFx - 1) + dx, M.rock);                               // 近侧腿
  }
  // 候选部件：boulderBody（圆角大石身体：孔雀石同心纹、顶上一道裂缝、背上苔藓 + 垂下的一撮苔藓）
  function boulder(R) {
    part();
    const top = R.yS, bot = R.yHip;
    for (let y = top; y <= bot; y++) { const s = rowSpan(R, y); if (s) for (let x = s[0]; x <= s[1]; x++) sp(x, y, M.body, 0); }
    const bcx = -3, bcy = bot - 2;                                               // 孔雀石同心纹：以后下方为圆心的两道暗纹 + 一道亮纹
    for (let y = top + 1; y < bot; y++) {
      const s = rowSpan(R, y); if (!s) continue;
      for (let x = s[0] + 1; x < s[1]; x++) {
        const d = Math.hypot(x - bcx - s[2], (y - bcy) * 1.15);
        if (d >= 3.4 && d < 4.3) sp(x, y, M.body, 2);
        else if (d >= 5.4 && d < 6.1 && y < bot - 3) sp(x, y, M.body, 4);
      }
    }
    const s0 = rowSpan(R, top), s1 = rowSpan(R, top + 1), s2 = rowSpan(R, top + 2);
    sp(s0[2] + 1, top, M.body, 1); sp(s0[2] + 1, top + 1, M.body, 1); sp(s0[2], top + 2, M.body, 1); sp(s0[2] + 2, top + 2, M.body, 2);   // 顶上的裂缝
    sp(s0[0] + 1, top, M.moss, 4); sp(s0[0] + 2, top, M.moss, 3); sp(s1[0] + 1, top + 1, M.moss, 3); sp(s0[0] + 3, top, M.moss, 3);   // 背上的苔藓
    const s4 = rowSpan(R, top + 4), tx = s4[0] - 1, sw = P.sway;                 // 背后垂下的一撮苔藓（尖端会摆）
    sp(tx, top + 4, M.moss, 3); sp(tx, top + 5, M.moss, 2); sp(tx + (sw < 0 ? -1 : 0), top + 6, M.moss, 2); if (sw > 0) sp(tx + 1, top + 7, M.moss, 2);
    sp(s2[1] - 1, top + 2, M.moss, 3);
  }
  // 候选部件：shellShard（蓝铜碎壳：后肩一块、头顶斜插一片，都是战神碎壳盔 / 肩甲上掉下来的）
  function shoulderShell(R) {                                                    // 后肩：贴在背上的一块，往后鼓出 1 格
    part(); const y = R.yS + 1, s = rowSpan(R, y), x = s[0];
    sp(x, y, M.cu, 4); sp(x + 1, y, M.cu, 3);
    sp(x - 1, y + 1, M.cu, 4); sp(x, y + 1, M.cu, 3); sp(x + 1, y + 1, M.cu, 2);
    sp(x - 1, y + 2, M.cu, 3); sp(x, y + 2, M.cu, 2);
  }
  // 候选部件：soulCore（胸口魂核 2×2 + 外围一圈蓝铜晶簇：朝上、朝前、朝下三簇伸出身体 1–2 格）；gem 0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭
  const CORE_LV = [
    [[M.core, 4], [M.core, 3], [M.core, 3], [M.core, 2]],
    [[M.core, 4], [M.core, 4], [M.core, 3], [M.core, 3]],
    [[M.hot, 3], [M.core, 4], [M.core, 4], [M.core, 3]],
    [[M.hot, 3], [M.hot, 3], [M.hot, 2], [M.hot, 2]],
    [[M.core, 2], [M.core, 1], [M.core, 1], [M.core, 1]],
  ];
  const CRYSTALS = [[0, -1, 3], [1, -1, 3], [1, -2, 4], [2, -2, 3], [2, 0, 4], [2, 1, 2], [3, 0, 3], [0, 2, 2], [1, 2, 3], [2, 3, 3], [-1, 0, 2], [-1, 1, 1]];
  function soulCore(cx, cy) {
    part(); const lv = CORE_LV[P.gem];
    for (const [dx, dy, t] of CRYSTALS) sp(cx + dx, cy + dy, M.cu, t);
    sp(cx, cy, lv[0][0], lv[0][1]); sp(cx + 1, cy, lv[1][0], lv[1][1]); sp(cx, cy + 1, lv[2][0], lv[2][1]); sp(cx + 1, cy + 1, lv[3][0], lv[3][1]);
  }
  // 候选部件：pebbleHead（4×4 小石头当头：前额眉骨凸出 1 格、魂火独眼、头顶一点苔藓；hs 格以下缩进身体不画）
  function head(R) {
    part(); const x0 = R.hx0, top = R.htop + P.hs, clip = P.hs ? R.yS : 99;
    const S = (x, y, m, t) => { if (y < clip) sp(x, y, m, t); };
    for (let x = x0 + 1; x <= x0 + 3; x++) S(x, top, M.rock, 0);
    for (let y = top + 1; y <= top + 3; y++) for (let x = x0; x <= x0 + 3; x++) S(x, y, M.rock, 0);
    S(x0 + 4, top + 1, M.rock, 4); S(x0 + 3, top + 1, M.rock, 4); S(x0 + 1, top + 3, M.rock, 2); S(x0 + 2, top + 3, M.rock, 2);   // 眉骨、下颌阴影
    S(x0 + 1, top, M.moss, 3);
    const ey = top + 2, hot = P.gem >= 2 && P.gem <= 3, dead = P.gem === 4;
    const B = dead ? [M.core, 1] : hot || P.glint ? [M.hot, 3] : [M.core, 4], Mi = dead ? [M.core, 1] : hot ? [M.core, 4] : [M.core, 3];
    if (P.eyes) { S(x0 + 2, ey, M.rock, 1); S(x0 + 3, ey, M.rock, 1); }
    else if (P.look < 0) { S(x0, ey, B[0], B[1]); S(x0 + 1, ey, Mi[0], Mi[1]); S(x0 + 2, ey, M.rock, 1); }
    else { S(x0 + 1, ey, M.rock, 1); S(x0 + 2, ey, Mi[0], Mi[1]); S(x0 + 3, ey, B[0], B[1]); }   // 眼窝 + 独眼
    return [x0, top];
  }
  function headShard(x0, top) {                                                   // 头顶斜插的蓝铜碎壳，往后翘 4 格
    part();
    sp(x0 + 1, top - 1, M.cu, 4); sp(x0 + 2, top - 1, M.cu, 2);
    sp(x0, top - 2, M.cu, 4); sp(x0 + 1, top - 2, M.cu, 3);
    sp(x0 - 1, top - 3, M.cu, 4); sp(x0, top - 3, M.cu, 2);
    sp(x0 - 1, top - 4, M.cu, 3);
  }
  // 候选部件：rollBall（缩成的石球：15 格圆盘，拳、头、碎壳、苔藓、孔雀石纹贴在球面上，按 spin 每档转 90°；魂核和晶簇单独一个部件一起转）
  const FIST_RING = [[-1, -2], [0, -2], [1, -2], [-2, -1], [-2, 0], [-2, 1], [-1, 2], [0, 2]];
  function drawBall() {
    const r = P.spin, cy = -7;
    part();
    for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) if (i * i + j * j <= 52.2) sp(i, cy + j, M.body, 0);
    const T = (i, j, m, t) => { const q = rot(i, j, r); sp(q[0], cy + q[1], m, t); };
    for (const [i, j] of FIST_RING) T(2 + i, 3 + j, M.body, 1);                 // 抱在身前的拳头（缝）
    T(1, 2, M.body, 4); T(2, 2, M.body, 4); T(4, 3, M.body, 2); T(4, 4, M.body, 2);
    for (const [i, j] of FIST_RING) T(-3 + i, 2 + j, M.body, 2);                // 另一只拳头（浅缝）
    T(-4, 1, M.body, 4);
    T(-3, -4, M.body, 1); T(-2, -5, M.body, 1); T(-1, -5, M.body, 1); T(-4, -3, M.body, 1); T(-2, -4, M.body, 4);   // 缩进去的头
    T(-3, -6, M.cu, 4); T(-4, -5, M.cu, 3); T(-2, -6, M.cu, 2);                  // 碎壳贴在球面上
    T(-5, 0, M.moss, 3); T(-5, -1, M.moss, 4); T(0, 5, M.moss, 3);
    T(-1, -1, M.body, 2); T(0, -1, M.body, 2); T(1, -2, M.body, 2); T(-2, 0, M.body, 2);   // 孔雀石纹
    part(); const lv = CORE_LV[P.gem];                                          // 魂核 + 晶簇（跟着转）
    for (const [i, j, t] of [[4, -3, 3], [4, -2, 2], [2, -4, 4], [3, -4, 3], [1, -3, 2], [1, -2, 1], [2, -1, 2], [3, -1, 3]]) T(i, j, M.cu, t);
    const cq = [[2, -3], [3, -3], [2, -2], [3, -2]];
    for (let k = 0; k < 4; k++) T(cq[k][0], cq[k][1], lv[k][0], lv[k][1]);
  }
  function drawHero() {
    begin(hero, P.bx, -P.air);
    if (P.ball === 2) { drawBall(); return; }
    const R = rigOf(), sy = R.yS + 2, sFx = 1 + P.lean, sBx = -3 + P.lean, stub = P.fdrop > 0;
    stoneArm(sBx, sy, P.rfx, P.rfy, M.rockD, stub || P.hug);                   // 后臂（抱拳时只露肩上一截）
    if (!P.hug) stoneFist(P.rfx, P.rfy, M.rockD, 0);                             // 后拳
    legs(R);
    boulder(R);
    shoulderShell(R);
    const c = coreAt(); soulCore(c[0], c[1]);
    const h = head(R); headShard(h[0], h[1]);
    if (P.hug) stoneFist(P.rfx, P.rfy, M.rockD, 0);                              // 抱在胸前的后拳
    stoneArm(sFx, sy, P.ffx, P.ffy, M.rock, stub);                               // 前臂
    stoneFist(P.ffx, P.ffy, M.rock, 1);                                          // 前拳
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const sx = (x) => scrX(x + P.bx), sy = (y) => HY + y - P.air;
  const dustAt = (x, y, n, spd, life) => { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * spd, -3 - Math.random() * 8, life + Math.random() * 0.2, FXI.dust); };
  const pebbles = (x, y, n, vx, vy) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 3, y, vx + (Math.random() - 0.5) * 30, vy - Math.random() * 25, 0.55 + Math.random() * 0.3, R_PEB, { g: 300, floor: HY }); };
  let atkT = 9, atkX = 0, atkY = 0, spinAcc = 0, dustAcc = 0, trailAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -1;
  function onEnter(s) {
    if (s === CAST) {                                                            // 石球弹射出去：汇聚的魂光甩开、身后炸出一团土、震屏 2 格、天空闪白
      poseAt(CAST, 0, E.simT); const bx = scrX(0), by = HY - 7;
      releaseOrbit(40, 95, 0.3, 0.6, { pts: 1 }); burst(bx, by, 18, 50, 120, 0.25, 0.55, R_EL, 10);
      for (let i = 0; i < 12; i++) spawn(K_DUST, bx - 6 + Math.random() * 4, HY - Math.random() * 3, -30 - Math.random() * 50, -6 - Math.random() * 14, 0.4 + Math.random() * 0.3, FXI.dust);
      ring(bx - 2, by, 0, R_EL); fx.crack(bx - 4, HY, 7, -1, R_EL, 0.5); shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) {                                                         // 展开落地
      dustAt(scrX(-5), HY, 5, 30, 0.3); dustAt(scrX(5), HY, 5, 30, 0.3); pebbles(scrX(0), HY - 4, 3, 0, -30);
      sfx('step', { w: 0.6 });
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === T_PEBBLE) spawnX(K_PHYS, sx(P.ffx + 1), HY + P.ffy + 3, 8, -12, 0.9, R_PEB, { g: 260, floor: HY });   // 拳头上掉下一粒碎石
    if (s === ATTACK && t === 1 / 12) dustAt(scrX(-3), HY, 2, 12, 0.25);
    if (s === ATTACK && t === T_HIT) {                                           // 直拳捣中：拳面碎石火花
      atkT = 0; atkX = sx(P.ffx + 3); atkY = sy(P.ffy);
      burst(atkX, atkY, 10, 40, 100, 0.15, 0.35, FXI.impact, 10); pebbles(atkX, atkY, 4, 20, -35); fx.cross(atkX, atkY, 4, FXI.impact, 0.18);
      dustAt(scrX(2), HY, 3, 20, 0.3); hitDummy(0, 1);
      sfx('swing', { kind: 'thrust', w: 0.6 }); sfx('hit', { mat: 'stone', w: 0.6 });
    }
    if (s === CHARGE && t === T_HOP) dustAt(scrX(0), HY, 4, 24, 0.3);           // 抱拳后跳
    if (s === CHARGE && t === T_TOUCH) { dustAt(scrX(-4), HY, 4, 26, 0.3); dustAt(scrX(4), HY, 4, 26, 0.3); pebbles(scrX(0), HY - 5, 3, 0, -25); sfx('step', { w: 0.6 }); }
    if (s === CAST && t === T_CONTACT) {                                         // 撞上假人：碎石外爆、冲击环、一小段地裂；假人闪白大摇、击退
      const x = DUMMY_X - 5, y = HY - 7;
      burst(x, y, 22, 50, 130, 0.25, 0.6, R_EL, 14); pebbles(x, y, 10, -10, -45); ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.25);
      fx.crack(x - 2, HY, 12, 1, R_EL, 0.7); dustAt(x, HY, 8, 40, 0.4);
      hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.6 });
    }
    if (s === RECOVER && T_CLAP.includes(t)) { const x = sx(4), y = sy(-6); burst(x, y, 5, 20, 45, 0.15, 0.3, FXI.dust, 4); pebbles(x, y, 1, 0, -20); sfx('hit', { mat: 'stone', w: 0.2 }); }   // 拍拍拳头：两下碎石灰
    if (s === DEATH && t === T_FISTS) { dustAt(sx(P.ffx), HY, 6, 30, 0.35); dustAt(sx(P.rfx), HY, 6, 30, 0.35); shake(0.08, 1); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && t === T_CRUMBLE) {                                        // 身体从上往下塌：碎块往下落、原地成堆
      poseAt(DEATH, T_CRUMBLE - 1 / 12, T_CRUMBLE - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 0.3, fromX: 0, fromY: -34, fadeAt: FADE_AT, fadeDur: FADE_DUR, ramp: R_EL });
      pebbles(scrX(-2), HY - 12, 6, 0, -30); poseAt(DEATH, t, t);
    }
    if (s === DEATH && t === T_PILE) { dustAt(scrX(-2), HY, 14, 44, 0.45); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && t === T_ROLL) { burst(HX + 3, HY - 3, 6, 20, 50, 0.15, 0.3, R_EL, 8); }
    if (s === DEATH && t === T_OUT) { const x = coreScrX(T_OUT); for (let i = 0; i < 10; i++) spawn(K_RISE, x + (Math.random() - 0.5) * 3, HY - 2, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, R_EL); fx.cross(x, HY - 2, 3, R_EL, 0.2); }
  }
  const EVENTS = [[T_PEBBLE], [], [1 / 12, T_HIT], [T_HOP, T_TOUCH], [T_CONTACT], T_CLAP, [], [T_FISTS, T_CRUMBLE, T_PILE, T_ROLL, T_OUT], []];
  function hurtFx(s) {                                                           // 石头受击：火花里夹着孔雀石碎屑和石灰
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.2, 0.5, FXI.impact, 18); pebbles(hx, hy, s === DEATH ? 10 : 6, -20, -40);
    burst(hx, hy, 6, 20, 60, 0.35, 0.7, FXI.dust, 6); burst(hx, hy - 2, 4, 30, 70, 0.2, 0.4, R_EL, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  // 死亡：魂核从石堆里滚出来（碎块开始后 0.4 s 起滚 0.4 s，0.95 s 熄灭）
  const HEAP_DX = -3;                                                            // 石堆中心（倒下时身体已被打退 2 格）
  const heapW = (dd) => 5 + RD(4 * clamp01((dd - 0.1) / 0.3));
  function heapH(dd, x) { const g = clamp01((dd - 0.1) / 0.3), H = 2 + 4 * g, w = heapW(dd) + 0.5; return Math.abs(x) > w ? -1 : Math.max(1, RD(H * Math.pow(Math.max(0, 1 - (x / w) ** 2), 0.8))); }
  function coreScrX(t) { const q = clamp01((t - T_ROLL) / 0.45); return HX + HEAP_DX + 1 + RD(ease.out(q) * 13); }
  function stepFX(dt, state, stT) {
    if (state === IDLE) { emberAcc += dt * 0.9; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, scrX(P.gx), HY + P.gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL); } }
    if (state === MOVE) {                                                        // 并跳：落地掉 3 颗石屑 + 尘；起跳蹬起一点土
      const gf = E.gait(q12(stT));
      if (gf !== lastGf) {
        if (gf === 0) { pebbles(scrX(0), HY - 6, 3, 0, -20); dustAt(scrX(-3), HY, 2, 20, 0.3); dustAt(scrX(3), HY, 2, 20, 0.3); sfx('step', { w: 0.6 }); }
        else if (gf === 1) dustAt(scrX(-1), HY, 2, 14, 0.2);
        lastGf = gf;
      }
    } else lastGf = -1;
    if (state === CHARGE && stT > 0.42) {                                        // 石球越转越快：魂光绕球环转、脚下扬尘、甩出石屑
      const q = clamp01((stT - 0.42) / 0.98), bx = scrX(0), by = HY - 7;
      spinAcc += dt * (10 + 26 * q);
      while (spinAcc >= 1) {
        spinAcc -= 1; const a = Math.random() * 6.2832;
        if (Math.random() < 0.45) { const r = 13 + Math.random() * 8; spawnX(K_SPIRAL_PT, bx, by, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 3, tx: bx, ty: by }); }   // 魂光往球心汇聚
        else spawnX(K_ORBIT_PT, bx, by, 0, 0, 0.25 + Math.random() * 0.35, R_EL, { a, r: 9 + Math.random() * 1.5, tx: bx, ty: by, orbitW: 6 + 8 * q, squash: 0.8 });          // 绕球环转（顺时针，越转越快）
      }
      dustAcc += dt * (8 + 34 * q);
      while (dustAcc >= 1) { dustAcc -= 1; spawn(K_DUST, bx - 3 - Math.random() * 4, HY - Math.random() * 2, -20 - Math.random() * 40 * (0.5 + q), -4 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust); }
      if (q > 0.5 && Math.random() < dt * 6) pebbles(bx - 5, HY - 3, 1, -40, -30);
    }
    if (state === CAST && stT < T_CONTACT + 1 / 60) {                            // 滚撞：身后一串土和孔雀绿尾迹
      const bx = scrX(0), by = HY - 7; trailAcc += dt * 70;
      while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, bx - 7, by + (Math.random() - 0.5) * 10, -20 - Math.random() * 20, (Math.random() - 0.5) * 6, 0.2 + Math.random() * 0.2, R_EL); spawn(K_DUST, bx - 5, HY - Math.random() * 2, -30 - Math.random() * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 9 + Math.random() * 18, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, R_EL); } }
    atkT += dt;
  }
  function fxReset() { atkT = 9; spinAcc = 0; dustAcc = 0; trailAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -1; }
  function fxBack(f12) {
    if (P.air > 0 && P.dq < 1) groundShadow(scrX(0), 6, P.air);
    if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  // 石堆：碎块落下时在原地堆起一个小丘（在碎块后面），和碎块同时抖动消散
  function fxMid(f12) {
    const st = E.state, t = E.stT;
    if (st === CAST && t < T_CONTACT + 1 / 60) {                                 // 滚撞速度线
      const bx = scrX(0), by = HY - 7, c = t < 1 / 12 ? EL[1] : EL[2];
      for (const [dy, L] of [[-5, 6], [-1, 9], [3, 7]]) for (let k = 0; k < L; k++) if (!((k + f12) & 1) || k < 3) put(bx - 8 - k, by + dy, k < 3 ? c : EL[3]);
    }
    if (st !== DEATH || t < T_CRUMBLE + 0.1) return;
    const dd = t - T_CRUMBLE, dq = clamp01((dd - FADE_AT) / FADE_DUR), hw = heapW(dd), cx = HX + HEAP_DX;
    const px = (X, Y, c) => { if (B8[((Y + 64) & 7) * 8 + ((X + 64) & 7)] >= dq) put(X, Y, c); };
    for (let x = -hw; x <= hw; x++) {
      const h = heapH(dd, x);
      for (let j = 0; j <= h; j++) {
        const X = cx + x, Y = HY - j, off = (Math.floor(j / 2) & 1) ? 1 : 0, seam = ((X + off) % 3 + 3) % 3 === 0 || (j & 1) === 0;
        const c = j === h ? OUT[4] : j === h - 1 ? (x < 1 ? OUT[0] : OUT[1]) : seam ? OUT[3] : x < -2 && ((X + j) & 1) ? OUT[0] : OUT[1];
        px(X, Y, c);
      }
    }
    if (dd > 0.3) for (const [x, y, c] of [[-4, 2, CUI[3]], [-3, 3, CUI[2]], [3, 2, CUI[2]], [4, 1, CUI[1]], [-1, 1, MOSS[2]], [1, 3, MOSS[1]]]) if (y < heapH(dd, x)) px(cx + x, HY - y, c);   // 石堆里露出的蓝铜碎壳和苔藓
  }
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.fdrop === 0) {                 // 魂核十字光
      const gx = scrX(P.gx), gy = HY + P.gy, L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = P.gem === 3 ? (r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]) : (r <= 2 ? EL[1] : EL[2]); put(gx + r + 1, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r + 1, c); }
    }
    if (st === CHARGE && P.ball === 2 && t > 1.0) {                              // 转得最快时：球顶上一道风弧
      const bx = scrX(0), by = HY - 7;
      for (let k = 0; k < 6; k++) { const a = -2.4 + k * 0.28 + (f12 & 1) * 0.14; put(RD(bx + Math.cos(a) * 9), RD(by + Math.sin(a) * 9), k < 2 ? EL[3] : EL[2]); }
    }
    if (atkT < 2 / 12) {                                                         // 直拳拖影：拳后三道横线
      const c = atkT < 1 / 12 ? EL[1] : EL[2];
      for (const dy of [-2, 0, 2]) for (let k = 3; k <= 8; k++) { if (atkT >= 1 / 12 && (k & 1)) continue; put(atkX - k - 2, atkY + dy, k < 5 ? c : EL[3]); }
    }
    if (st === DEATH && t >= T_ROLL) {                                           // 魂核从石堆顶上滚下来，闪几下熄灭
      const dd = t - T_CRUMBLE, dq = clamp01((dd - FADE_AT) / FADE_DUR), x = coreScrX(t), rolling = t < T_ROLL + 0.45, y = HY - 2 - Math.max(0, heapH(dd, x - HX - HEAP_DX));
      const lit = t < T_OUT ? ((t < T_OUT - 0.3) || (f12 & 1)) : false, spin = f12 & 3;
      const px = (X, Y, c) => { if (B8[((Y + 64) & 7) * 8 + ((X + 64) & 7)] >= dq) put(X, Y, c); };
      for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]]) px(x + dx, y + dy, OUT[4]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) px(x + dx, y + dy, lit ? EL[2] : OUT[3]);
      px(x, y, lit ? EL[0] : OUT[2]); const h = [[-1, -1], [1, -1], [1, 1], [-1, 1]][rolling ? spin : 0]; px(x + h[0], y + h[1], lit ? EL[1] : OUT[1]);
      if (lit && !(f12 & 2)) { px(x, y - 3, EL[2]); px(x + 3, y, EL[3]); px(x - 3, y, EL[3]); }
    }
  }

  const HIT_POINT = [1, -9];
  return {
    name: '魔像', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.core, M.hot], HIT_POINT, EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    // 音色：碎石哗啦 + 石块碰撞的「咔哒」；滚撞「咕隆隆」接撞击「嗑！」；重量 0.6
    SFX: { body: 'stone', how: 'collapse', pal: 'earth', style: 'meteor', w: 0.6 },
    REVIVE: { dy: -9, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
