// 巨人战神 GiantGodOfWar（部队 · 不死 · 先锋 · 传说 · 近战 352）：神石孵出来的石巨人（神石「孵化」：活过两场战斗后进化成巨人战神）。
// 骨灰色岩石身躯，驼背前压、胸膛和手臂像石柱，腿短粗像两根墩柱；头小、陷在两块肩甲之间，戴着神石上半截的碎壳当头盔（多面体蓝铜矿、锯齿盔沿），
// 正面一个洞露出那只魂火独眼；双肩各一块翘起的大碎壳片当肩甲（锯齿冠往后上方翘）；胸口竖排三颗孔雀绿魂核（将来分裂出的三只魔像）；腰间一圈碎壳片裙甲；
// 双手的方尖碑巨槌：槌头是一整块刻纹的蓝铜矿方尖石（8×12，尖头插进骨套、宽底是砸人的那头），柄是一根断骨。
// 攻击：双手过顶砸——先把巨槌从地上抬起（1 帧）→ 抡到背后、举过头顶（2 帧）→ 竖直砸下，方尖石平拍在地上，地裂、碎石外爆。
// 技能：特性「小九头蛇」——巨槌拄地、三核自上而下依次点亮、脚下蓝铜召唤法阵 → 抡起砸地，法阵里升起三只小魔像剪影（垂着两只大石拳）→ 依次冲向假人撞碎（三段）。
// 死亡：一分为三——躯干连同头沿两道绿光裂缝切成三块实心石块（上块带头盔和上核、前块带中核和前臂、后块带下核和裙甲），
//       断面描 1 格孔雀绿光边；三块向上、前、后走抛物线、按 90° 翻滚，落地横躺；腿塌成一堆碎石；三颗核依次熄灭；最后碎成石块（死亡套件 chunks）消散。
PCD.define('GiantGodOfWar', (E) => {
  const { parts, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, fxRamp, defMat, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, PI = Math.PI;

  // ───── 颜色：元素「小九头蛇 · 蓝铜孔雀」（和神石同一条色阶）；骨灰岩、蓝铜矿碎壳、孔雀绿魂核 ─────
  const R_EL = fxRamp('azurite', [21, '#c8f5e0', '#5a8cf0', '#2a48b8', '#121c5a']), EL = FXR[R_EL];
  const ROCK = ['#1c1a20', '#46424c', '#74707a', '#a6a2aa'], AZ = ['#0a1438', '#1a3a8a', '#2e62c8', '#6aa0f0'], MAL = ['#0c2a1e', '#1a6a48', '#36a878', '#7ad8a8'];
  const HI = '#b4d4ff';
  const M = parts.mats(E, {
    rock: { r: ROCK, band: 2 }, limb: ROCK, shell: AZ, bone: 'bone',
    hi: [AZ[0], HI, HI, HI],                                      // 碎壳刻面之间的亮棱
    eye: { r: [EL[4], MAL[2], MAL[3], EL[1]], flat: 1 },          // 魂火独眼：tone 1 熄灭 · 2 暗 · 3 常亮 · 4 亮
    core: { r: MAL, flat: 1 },                                    // 魂核：tone 1 灭 · 2 暗 · 3 常亮 · 4 亮
    hot: { r: [MAL[3], EL[1], 21, 21], flat: 1 },                 // 魂核 / 独眼烧白
    seam: { r: [MAL[0], MAL[1], MAL[2], EL[1]], flat: 1 },        // 石身里透绿光的裂缝
    rune: { r: [AZ[0], MAL[1], MAL[2], EL[1]], flat: 1 },         // 方尖石上的刻纹
    ink: { r: [0, 0, 0, 0], flat: 1 },
  });
  // 体型：giant 加粗——胯高 12、躯干 19、头 6 宽 7 高（盔下只露下巴，头身比约 1:7）、sw 7、四肢粗 2.0、腿粗 6、驼背 3、收腰 1.5、头往前探 2、脖子 2（头顶出两块肩甲之间）
  const BODY = { body: 'giant', leg: 12, torso: 19, head: 7, headW: 6, sw: 7, limb: 2.0, arm: 14, lw: 6, stride: 3, hunch: 3, waist: 1.5, headX: 4, neck: 2, lift: 2, fall: 'front' };
  const HX = 62, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(112, 84, 52, 76);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 8, 11], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'core', 'hot', 'seam', 'rune', 'bone', 'boneD', 'shell', 'shellD', 'hi', 'ink']) RIM.skip[M[k]] = 1;

  // ───── 姿势 ─────
  // hx hy 前手 · bhx bhy 后手 · wx wy 巨槌握点（由 grip 决定）· ma 巨槌角度（ASTEP 档，0 朝上、顺时针为正；指的是「握点 → 槌头」方向）· ml 握点到骨套的距离 · mbt 握点到柄尾
  // grip 0 前手握 / 1 后手握（拖地）/ 2 双手 / 3 脱手（掉在地上）· mb 1 = 巨槌画在身后 · mg 1 = 槌头贴地（底边压在地面线上）
  // c1 c2 c3 三颗魂核 0 灭 / 1 暗 / 2 常亮 / 3 亮 / 4 烧白 · ev 独眼 0–4 · rune 刻纹 0–3 · crack 死亡裂缝 0–3 · split 裂成三块后的帧号（0 = 没裂）· dropA 掉落的巨槌 0 在手 / 1 倒下中 / 2 躺地
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, wx: 0, wy: 0, ma: 0, ml: 5, mbt: 3, grip: 0, mb: 0, mg: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0,
    sway: 0, beard: 0, c1: 2, c2: 2, c3: 2, ev: 0, rune: 0, crack: 0, split: 0, dropA: 0, rim: 0, eyes: 0, flash: 0, dq: 0, dq48: 0, noMaul: 0, lying: 0, lift: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  // 缓存键：巨槌握点 wx wy 由 grip / dropA 和两只手的位置决定，不单独进键
  const KEY = keyer([['hx', -30, 40], ['hy', -56, 2], ['bhx', -30, 40], ['bhy', -56, 2], ['ma', -64, 64], ['ml', 0, 16], ['mbt', 0, 12],
    ['grip', 0, 3], ['mb', 0, 1], ['mg', 0, 1], ['lean', -2, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2],
    ['c1', 0, 4], ['c2', 0, 4], ['c3', 0, 4], ['ev', 0, 4], ['rune', 0, 3], ['crack', 0, 3], ['split', 0, 40], ['dropA', 0, 2], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq48', 0, 48]]);
  const K = (hx, hy, bhx, bhy, lean, head, crouch, ma, ml, mbt) => ({ hx, hy, bhx, bhy, lean, head, crouch, ma, ml, mbt });
  // 关键帧（ma 是弧度；握点 → 槌头：π = 朝下立在地上，−π/2 = 朝后，π/2 = 朝前）
  const K_IDLE = K(15, -20, -4, -13, 1, 0, 1, PI, 8, 3);           // 方尖石立在身前地上，前手按在骨柄头上，后手垂着
  const K_LIFT = K(14, -24, 10, -22, 0, 0, 1, 2.55, 5, 4);         // 攻击第 0 帧：双手把巨槌从地上抬起，方尖石吊在身前、离地
  const K_WIND = K(-1, -29, -3, -27, -1, -1, 1, -1.35, 5, 4);      // 巨槌抡到背后（槌头横在脑后）
  const K_OVER = K(9, -41, 7, -39, -1, -1, 0, -0.2, 5, 4);         // 举过头顶（方尖石竖在头顶上方）
  const K_SMASH = K(17, -12, 14, -14, 2, 1, 4, 1.85, 4, 4);        // 竖直砸下：方尖石平拍在身前地上（出手定格）
  const K_HOLD = K(17, -13, 14, -15, 2, 1, 3, 1.85, 4, 4);
  const K_CHARGE = K(15, -23, 13, -21, 2, 1, 2, PI, 8, 2);        // 巨槌拄地，双手叠按在骨柄头上，上身前压
  const K_SLAM = K(17, -19, 15, -17, 2, 1, 3, PI, 8, 2);          // 技能：抡起、把方尖石竖着砸进地里
  const K_HURT = K(18, -23, -7, -15, -2, -1, 0, PI + 0.3, 9, 3);  // 受击：上身后仰 2、头往后一甩，前手还攥着骨柄，槌柄往前倾一档
  const K_DOWN = K(12, -18, -3, -12, 1, 1, 3, PI, 9, 3);           // 死亡：裂开前僵住
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'ma', 'ml', 'mbt'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_STRIKE = 3 / 12, T_SLAM = 1 / 12, T_GOLEM = [0.28, 0.53, 0.78], T_SPLIT_D = 0.5, T_SPLIT = INCOMING + T_SPLIT_D, T_CRUMBLE = INCOMING + 1.6;
  const T_CORE_OFF = [1.45, 1.25, 1.08], CORE_LIGHT = [0.35, 0.7, 1.05];   // 熄灭顺序跟落地顺序走：后块（下核）→ 前块（中核）→ 上块（上核）

  // 待机个性「三核心跳」：循环第 18–25 帧屏住气，三颗核自上而下各亮一次（烧白 1 帧 → 亮 1 帧），独眼每过一颗核亮一档，第三颗之后烧白一下再暗回去
  const IDLE_BEAT = { 18: [4, 2, 2, 0], 19: [3, 2, 2, 1], 20: [2, 4, 2, 1], 21: [2, 3, 2, 2], 22: [2, 2, 4, 2], 23: [2, 2, 3, 3], 24: [2, 2, 2, 2], 25: [2, 2, 2, 1] };
  function idle(tq, f12) {
    setK(K_IDLE, K_IDLE, 0); P.grip = 0; P.mg = 1; const TT = f12 / 12; P.bob = Math.floor(TT * 2.5 + 1e-6) & 1;   // 缓慢深呼吸：胸膛起伏 1 格
    const b = IDLE_BEAT[f12of(tq % DUR[IDLE])];
    if (b) { P.c1 = b[0]; P.c2 = b[1]; P.c3 = b[2]; P.ev = b[3]; P.bob = 0; }                                       // 心跳的时候屏住气
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.bob = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.dq = 0; P.mx = 0; P.flip = 0;
    P.c1 = 2; P.c2 = 2; P.c3 = 2; P.ev = 0; P.rune = 0; P.crack = 0; P.split = 0; P.dropA = 0; P.grip = 0; P.mb = 0; P.mg = 0; P.noMaul = 0; P.lying = 0; P.lift = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                      // 巨人跺步：后臂垂到身后，2×2 石拳攥住骨柄末端，方尖石贴地拖在身后；接触帧顿挫 1 格
      const f = gait(tq); setK(K_IDLE, K_IDLE, 0); parts.gait(P, f); P.bob = P.step !== 0 ? 1 : 0; P.crouch = 1; P.lean = 1;
      P.grip = 1; P.mb = 1; P.mg = 1; P.bhx = -11 - (P.wup === 2 ? 1 : 0); P.bhy = -10 + P.bob; P.ma = -2.05; P.ml = 9; P.mbt = 1;   // 拳在身体后沿外 2 格、y −10；经过帧被槌拖后 1 格
      P.hx = 12 + P.step * 2; P.hy = -14 - (P.wup === 1 ? 1 : 0) + P.bob;                                 // 前手握拳随步子前后摆
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12 - 1e-6) { setK(K_LIFT, K_LIFT, 0); P.grip = 2; }                                   // 过渡帧：先把巨槌从地上抬起来
      else if (tq < 2 / 12 - 1e-6) { setK(K_WIND, K_WIND, 0); P.grip = 2; P.mb = 1; P.ev = 1; }
      else if (tq < T_STRIKE - 1e-6) { setK(K_OVER, K_OVER, 0); P.grip = 2; P.mb = 1; P.ev = 1; P.rune = 1; }
      else if (tq < 5 / 12 - 1e-6) { setK(K_SMASH, K_SMASH, 0); P.grip = 2; P.mg = 1; P.bx = 3; P.ev = 2; P.rune = 2; P.rim = 2; }
      else if (tq < 0.5) { setK(K_SMASH, K_HOLD, 1); P.grip = 2; P.mg = 1; P.bx = 3; P.ev = 1; P.rune = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K_HOLD, K_IDLE, q); P.grip = q < 0.5 ? 2 : 0; P.mg = 1; P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                  // 巨槌拄地、双手按柄；三核每 0.35 s 点亮一颗；独眼 2 档
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_CHARGE, q); P.grip = q > 0.5 ? 2 : 0; P.mg = 1; P.rim = 2; P.ev = tq < 0.45 ? 1 : 2; P.rune = tq < 0.7 ? 1 : 2;
      const lv = (k) => (tq < CORE_LIGHT[k] - 1e-6 ? 1 : tq < CORE_LIGHT[k] + 2 / 12 - 1e-6 ? 4 : (tq > 1.15 && (f12 & 1)) ? 4 : 3);
      P.c1 = lv(0); P.c2 = lv(1); P.c3 = lv(2);
    } else if (st === CAST) {                                    // 抡起 → 竖着砸进地里；三核烧白
      if (tq < T_SLAM - 1e-6) { setK(K_OVER, K_OVER, 0); P.mb = 1; } else { setK(K_SLAM, K_SLAM, 0); P.mg = 1; }
      P.grip = 2; P.c1 = P.c2 = P.c3 = 4; P.ev = 3; P.rune = 3; P.rim = 3; P.bx = tq >= T_SLAM - 1e-6 ? 2 : 0;
    } else if (st === RECOVER) {                                 // 三核暗回待机亮度，拄着的巨槌收回前手
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.grip = q < 0.5 ? 2 : 0; P.mg = 1; P.bx = RD(2 * (1 - q));
      const c = q < 0.3 ? 4 : q < 0.7 ? 3 : 2; P.c1 = P.c2 = P.c3 = c; P.ev = q < 0.5 ? 2 : 0; P.rune = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.25) { setK(K_HURT, K_HURT, 0); P.mg = 1; P.bx = -2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.c2 = (f12 & 1) ? 4 : 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.mg = 1; P.bx = -1; P.eyes = 1; P.rim = 0; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.mg = 1; }
    } else if (st === DEATH) {                                   // 受击 → 僵住、两道绿光裂缝爬满全身、巨槌脱手 → 一分为三 → 三核依次熄灭 → 碎成石块
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.mg = 1; P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.c2 = (f12 & 1) ? 4 : 1; }
      else if (d < T_SPLIT_D - 1e-6) {
        setK(K_DOWN, K_DOWN, 0); P.bx = (f12 & 1) ? -2 : -1; P.crack = d < 0.33 ? 1 : d < 0.42 ? 2 : 3; P.grip = 3; P.dropA = d < 0.33 ? 1 : 2;
        P.c1 = P.c2 = P.c3 = (f12 & 1) ? 4 : 3; P.ev = (f12 & 1) ? 2 : 4; P.rim = 2;
      } else {
        setK(K_DOWN, K_DOWN, 0); P.grip = 3; P.dropA = 2; P.split = Math.min(40, 1 + Math.floor((d - T_SPLIT_D) * 12 + 1e-6)); P.ev = 4;
        P.c1 = d < T_CORE_OFF[0] ? 3 : 0; P.c2 = d < T_CORE_OFF[1] ? 3 : 0; P.c3 = d < T_CORE_OFF[2] ? 3 : 0;
        if (d < 0.62) P.c1 = P.c2 = P.c3 = 4;
        if (d >= 1.6 - 1e-6) P.dq = 1;                            // 碎成石块之后由死亡套件画
      }
    } else if (st === REVIVE) {
      idle(tq, f12); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.ev = 2;
    }
    // 巨槌握点：前手 / 后手 / 掉落
    if (P.grip === 1) { P.wx = P.bhx; P.wy = P.bhy; }
    else if (P.grip === 3) { if (P.dropA === 1) { P.wx = 11; P.wy = -15; P.ma = 2.4; P.ml = 3; P.mbt = 4; P.mg = 0; } else { P.wx = 0; P.wy = -4; P.ma = PI / 2; P.ml = 3; P.mbt = 5; P.mg = 1; } }   // 倒在脚前（让出前块的落点）
    else { P.wx = P.hx; P.wy = P.hy; }
    for (const f of ['hx', 'hy', 'bhx', 'bhy', 'wx', 'wy', 'lean', 'head', 'crouch', 'ml', 'mbt']) P[f] = RD(P[f]);
    P.ma = RD(P.ma / ASTEP);
    const R = parts.rig(P, BODY), cc = coreAt(R, 1); P.gx = cc[0] + P.bx; P.gy = cc[1];
    P.dq48 = RD(P.dq * 48); KEY(P);
  }

  // ───── 本角色的部件（通用的标「候选部件」）─────
  // 躯干轮廓：parts.edges 再加一个桶形胸膛（上半截前沿往外鼓 2 格），腰收窄——上宽下窄的石柱身子
  function tEdges(R, y) {
    const e = parts.edges(R, y), t = clamp01((y - R.yS) / Math.max(1, R.yHip - R.yS));
    return [e[0], e[1] + (t > 0.05 && t < 0.62 ? RD(2 * Math.sin(PI * (t - 0.05) / 0.57)) : 0) - (t > 0.7 ? 1 : 0)];
  }
  // 三颗魂核的位置（胸膛最鼓处往里 6 格，竖排一列、间隔 4 行，躲开搭在身前的前臂和前肩甲）
  function coreAt(R, k) { const e = tEdges(R, R.yS + 9); return [e[1] - 6, R.yS + 5 + k * 4]; }
  const CORE_T = [[1, 1, 1, 1], [2, 2, 2, 1], [4, 3, 3, 2], [4, 4, 4, 3], [4, 4, 4, 4]];   // 档 → 2×2 四格的 tone（左上、右上、左下、右下）

  // 候选部件：方尖碑巨槌 obeliskMaul —— 骨柄（2 格粗、柄尾骨节）插进骨套，骨套套住方尖石的金字塔尖；石身往远端变宽，宽底是砸人的那头。
  //   槌头只按 90° 换朝向（中心放在真实角度上），受光面永远在上 / 左；读 P.wx wy（握点）ma ml mbt mg rune
  const ALONG = [[0, -1], [1, 0], [0, 1], [-1, 0]], ACROSS = [[1, 0], [0, 1], [1, 0], [0, 1]];
  const OB_W = [3, 2, 4, 6, 6, 6, 7, 7, 7, 8, 8, 8];                  // v 0 骨套 · 1–3 金字塔尖 · 4–11 石身（远端最宽）
  const RUNE = [[5, 1], [6, 1], [6, 2], [7, 1], [9, 1], [9, 2], [10, 2], [10, 1]];   // [v, u]：背光面上两个刻纹符号
  function maulGeo() {
    const a = P.ma * ASTEP, dx = Math.sin(a), dy = -Math.cos(a), q = ((Math.round(a / (PI / 2)) % 4) + 4) % 4, al = ALONG[q], ac = ACROSS[q];
    const L = P.ml + 6; let C = [RD(P.wx + dx * L), RD(P.wy + dy * L)];
    if (P.mg) {                                                   // 槌头贴地：最低的那一格压在地面线上
      let lo = -99; for (let v = 0; v < 12; v++) { const w = OB_W[v], u0 = -Math.floor(w / 2); for (const u of [u0, u0 + w - 1]) { const y = ac[1] * u + al[1] * (v - 6); if (y > lo) lo = y; } }
      C = [C[0], -lo];
    }
    const pt = (v, u) => [C[0] + ac[0] * u + al[0] * (v - 6), C[1] + ac[1] * u + al[1] * (v - 6)];
    return { a, dx, dy, q, al, ac, C, pt, sock: pt(-1, 0), butt: [RD(P.wx - dx * P.mbt), RD(P.wy - dy * P.mbt)], base: pt(11, 0) };
  }
  function obeliskMaul() {
    const G = maulGeo(), vert = G.q === 0 || G.q === 2;
    part();                                                       // 断骨柄：2 格粗，柄尾一个骨节，另一头插进骨套
    const ox = vert ? 1 : 0, oy = 1 - ox;
    E.line(G.butt[0], G.butt[1], G.sock[0], G.sock[1], M.bone, 0); E.line(G.butt[0] + ox, G.butt[1] + oy, G.sock[0] + ox, G.sock[1] + oy, M.bone, 0);
    for (let j = -1; j <= 2; j++) for (let i = -1; i <= 1; i++) if (!(Math.abs(i) === 1 && (j === -1 || j === 2))) sp(G.butt[0] + (vert ? j : i) + (vert ? 0 : 0), G.butt[1] + (vert ? i : j), M.bone, i === -1 && j === 0 ? 4 : 0);   // 柄尾骨节
    part();                                                       // 槌头
    for (let v = 0; v < 12; v++) {
      const w = OB_W[v], u0 = -Math.floor(w / 2), lit = u0 + Math.ceil(w * 0.4);
      for (let u = u0; u < u0 + w; u++) {
        const [x, y] = G.pt(v, u);
        if (v === 0) { sp(x, y, M.bone, u === u0 ? 4 : 2); continue; }                                   // 骨套
        let t = u < lit ? 4 : 3;                                                                            // 受光面 / 背光面
        if (v <= 3) t = u < lit ? 4 : 2;                                                                    // 金字塔尖：受光面亮、背光面暗
        if (u === lit - 1 && v >= 4) { sp(x, y, M.hi, 3); continue; }                                       // 两个面之间的棱
        if (u === u0 + w - 1 && v >= 4) t = 2;                                                              // 背光的外沿
        if (v === 11) t = u < lit ? 3 : 2;                                                                  // 远端底面暗一圈
        if (v === 4 && u >= lit) t = 2;                                                                     // 尖和石身之间的一道分界
        sp(x, y, M.shell, t);
      }
    }
    for (const [v, u] of RUNE) { const [x, y] = G.pt(v, u); sp(x, y, M.rune, [2, 3, 4, 4][P.rune]); }
    if (P.rune === 3) { const [x, y] = G.pt(2, 0); sp(x, y, M.hot, 3); }
  }

  // 候选部件：碎壳头盔 shellHelm —— 神石的上半截蛋壳扣在头上：尖顶多面体、壳顶一道锯齿缝、锯齿盔沿；正面一个洞露出独眼
  //   stamp 列 = hx0 − 1 + 列号，行 = 眼睛那一行 − 4 + 行号；'_' 是眼洞（不画，露出后面的脸和独眼），洞前面还有 2 格盔
  //   连尖顶和盔沿齿一共 7 行（头小：盔下只露两行方下巴）
  const HELM = [
    '..HL....',
    '.HLcBBD.',
    'HLLLBBBD',
    'HLB___BD',
    'HLB___BD',
    'BvBvBBvB',
    'v...v...',
  ];
  const HCELL = { H: [M.hi, 3], L: [M.shell, 4], B: [M.shell, 3], D: [M.shell, 2], c: [M.shell, 1], v: [M.shell, 2] };
  function shellHelm(R) {                                                                                  // 和石头脑袋同一个部件（紧跟 stoneHead 画，盔和下巴之间不压分界线）
    for (let r = 0; r < HELM.length; r++) for (let c = 0; c < 8; c++) {
      const ch = HELM[r][c], x = R.hx0 - 1 + c, y = R.ey - 4 + r; if (ch === '.') continue;
      if (ch === '_') { if (!(y === R.ey && (x === R.hx1 - 1 || x === R.hx1 - 2))) px(E, R, x, y, M.limb, 1); continue; }   // 眼洞：洞里是暗的，只剩独眼
      const [m, t] = HCELL[ch]; px(E, R, x, y, m, t);
    }
    px(E, R, R.hx0 + 1, R.ey - 2, M.core, 3);                                                             // 壳上残留的一点孔雀石纹
  }
  // 候选部件：碎壳肩甲 shellPauldron —— 一块大碎壳扣在肩头，锯齿外沿翘出肩线 4 格；刻面、亮棱、下沿碎齿（stamp 左 = 背后，不镜像）
  //   后肩 11×10（列 = 后肩 x − 7 + 列号，行 = 后肩 y − 8 + 行号）：三根往后上方翘的锯齿冠，高出背顶 4 格，下半截藏在驼背后面
  //   前肩 11×7（列 = 前肩 x − 4 + 列号，行 = 前肩 y − 2 + 行号）：圆顶压在肩上，外沿往前翘出躯干前沿 4 格；顶上和盔沿之间隔着一行压暗的下巴
  const PAUL_B = [
    'H.....H....',
    'HL....HL..H',
    '.HL..HLL.HL',
    '.HLL.HLLBHL',
    '..HLLLLBBBD',
    '..HLLLBBBBD',
    '.HLLLBBBBDD',
    'HLLLBBBBDD.',
    'BvBvBBBDD..',
    'v.v.v......',
  ];
  const PAUL_F = [
    '...HLLB...H',
    '..HLLLBB.HL',
    '.HLLLBBBHLD',
    'HLLLBBBBBD.',
    'HLLBBBBBDD.',
    'BvBvBBBDD..',
    'v.v.v......',
  ];
  function shellPauldron(R, side) {
    part(); const B = side === 'B', S = B ? PAUL_B : PAUL_F, W = S[0].length, x0 = B ? R.sBx - 7 : R.sFx - 4, y0 = B ? R.sBy - 8 : R.sFy - 2;
    for (let r = 0; r < S.length; r++) for (let c = 0; c < W; c++) {
      const ch = S[r][c]; if (ch === '.') continue;
      let [m, t] = HCELL[ch]; if (B) { m = ch === 'H' ? M.shell : M.shellD; t = ch === 'H' ? 4 : t; }
      px(E, R, x0 + c, y0 + r, m, t);
    }
    if (!B) { px(E, R, x0 + 3, y0 + 3, M.core, 3); px(E, R, x0 + 4, y0 + 4, M.core, 2); }                  // 孔雀石纹
  }
  // 候选部件：碎壳裙甲 shellFaulds —— 腰间一圈锁在一起的碎壳片：每片 3 格宽、片间暗缝，下沿尖齿长短相间
  function shellFaulds(R) {
    part(); const y0 = R.yHip - 1, e = tEdges(R, R.yHip), L = e[0] - 1, Rr = e[1] + 1;
    for (let x = L; x <= Rr; x++) {
      const k = x - L, len = (k % 3 === 1) ? 4 : (k % 3 === 0 ? 3 : 2);
      for (let j = 0; j < len && y0 + j <= 0; j++) px(E, R, x, y0 + j, M.shell, j === 0 ? (k % 3 === 2 ? 3 : 4) : (k % 3 === 2 ? 2 : k % 3 === 0 ? 3 : 3));
      if (k % 3 === 2) px(E, R, x, y0 + 1, M.shell, 1);
    }
    run(E, R, y0 - 1, L + 1, Rr - 1, M.shell, 2);                                                           // 锁扣的横带
    for (let x = L + 2; x < Rr; x += 4) px(E, R, x, y0 - 1, M.hi, 3);
  }
  // 候选部件：岩石躯干 rockTorso —— 按 parts.edges 的轮廓填满，再压几道石缝、崩口、两道透绿光的细裂缝（不画胸肌腹肌）
  function rockTorso(R) {
    part();
    for (let y = R.yS; y <= R.yHip; y++) { const [L, Rr] = tEdges(R, y); run(E, R, y, L, Rr, M.rock, 0); }
    const at = (t, dx) => { const y = RD(R.yS + t * (R.yHip - R.yS)), e = tEdges(R, y); return [e[0] + dx, y]; };
    for (const [t, dx, len] of [[0.2, 2, 5], [0.62, 2, 4]]) {                                              // 背上两道横向石缝（上沿一格亮，像石块叠起来的缝）
      const [x, y] = at(t, dx); for (let k = 0; k < len; k++) px(E, R, x + k, y + (k >= len - 2 ? 1 : 0), M.rock, 2); px(E, R, x, y - 1, M.rock, 4); px(E, R, x + 1, y - 1, M.rock, 4);
    }
    { const [x, y] = at(0.4, 1); px(E, R, x, y, M.rock, 4); px(E, R, x + 1, y + 1, M.rock, 4); }         // 背上的崩口
    { const y = R.yS + 3 + 9, e = tEdges(R, y); for (let k = 0; k < 3; k++) px(E, R, e[1] - 1 - k, y + 2 + (k >> 1), M.rock, 2); }   // 胸膛下沿的一道弧（桶形胸和腰分开）
    const c1 = coreAt(R, 1);                                                                               // 一道透绿光的细裂缝：中核 → 后肩
    for (const [x, y] of [[-2, -1], [-3, -2], [-4, -2], [-5, -3], [-6, -3], [-7, -4]]) px(E, R, c1[0] + x, c1[1] + y, M.seam, 2);
  }
  function drawCores(R) {
    const lv = [P.c1, P.c2, P.c3];
    for (let k = 0; k < 3; k++) {
      const [x, y] = coreAt(R, k), T = CORE_T[lv[k]], hot = lv[k] >= 4, m = hot ? M.hot : M.core, tt = hot ? [3, 3, 2, 2] : T;
      for (const [i, j] of [[-1, 0], [-1, 1], [2, 0], [2, 1], [0, -1], [1, -1], [0, 2], [1, 2]]) px(E, R, x + i, y + j, M.rock, 1);   // 嵌在石里的核窝
      px(E, R, x, y, m, tt[0]); px(E, R, x + 1, y, m, tt[1]); px(E, R, x, y + 1, m, tt[2]); px(E, R, x + 1, y + 1, m, tt[3]);
    }
  }
  // 候选部件：石拳 stoneFist —— 4×4 圆角石块，左上高光、朝前一面两道指缝
  function stoneFist(R, x, y, m) { part(); for (let j = -2; j <= 1; j++) for (let i = -2; i <= 1; i++) if (!((i === -2 || i === 1) && (j === -2 || j === 1))) px(E, R, x + i, y + j, m, 0); px(E, R, x - 1, y - 2, m, 4); px(E, R, x + 1, y - 1, m, 2); px(E, R, x + 1, y + 1, m, 2); }
  // 拖槌的后手：2×2 石拳攥住骨柄末端（压在柄上，柄尾骨节从拳后冒出来）
  function dragFist(R, x, y, m) { part(); px(E, R, x - 1, y - 1, m, 4); px(E, R, x, y - 1, m, 3); px(E, R, x - 1, y, m, 3); px(E, R, x, y, m, 2); }
  // 石头脑袋：6 宽 7 高的方块，盔沿下面露出方下巴和一道嘴缝；独眼 2 格（后暗前亮）
  function stoneHead(R) {
    part();
    for (let y = R.htop; y <= R.hy; y++) run(E, R, y, R.hx0 + (y === R.hy ? 1 : 0), R.hx1 + (y >= R.hy - 1 ? 1 : 0), M.limb, 0);
    px(E, R, R.hx1, R.hy - 1, M.limb, 1); px(E, R, R.hx1 + 1, R.hy - 1, M.limb, 1); px(E, R, R.hx1 - 1, R.hy - 1, M.limb, 2);   // 嘴缝
    px(E, R, R.hx0 + 2, R.hy, M.limb, 2); px(E, R, R.hx1 - 1, R.hy - 2, M.limb, 4);                                               // 下颌的阴影和颧骨高光
  }
  function soulEye(R) {                                                                                     // 盔洞里的魂火独眼（发光体，最后画）
    const ex = R.hx1 - 1, ey = R.ey;
    if (P.eyes || P.ev === 4) { px(E, R, ex, ey, M.eye, 1); px(E, R, ex - 1, ey, M.eye, 1); return; }
    const m = P.ev === 3 ? M.hot : M.eye; px(E, R, ex, ey, m, [4, 4, 4, 3][P.ev]); px(E, R, ex - 1, ey, m, [2, 3, 4, 2][P.ev]); if (P.ev >= 2) px(E, R, ex, ey - 1, m, 2);
  }
  // 死亡时的两道绿光裂缝（贯穿全身，最后画）：上缝在第 1、2 颗核之间，下缝在第 2、3 颗核之间
  function crackY(R, k, x) { return k === 0 ? R.yS + 6 + RD(x * 0.15) : R.yS + 10 - RD(x * 0.12); }
  let curSpr = hero, curBx = 0;                                                                               // 正在画的缓冲（裂缝只画在身体像素上）
  function deathCracks(R) {
    part(); const n = P.crack;
    for (let k = 0; k < 2; k++) {
      if (k === 1 && n < 2) break;
      for (let x = -14; x <= 20; x++) {
        const S = curSpr, y = crackY(R, k, x) + ((((x * 7 + k * 3) % 5) + 5) % 5 === 0 ? 1 : 0), i = (y + S.oy) * S.w + (x + S.ox + curBx);
        if (i < 0 || i >= S.mat.length || !S.mat[i]) continue;
        E.sp(x, y, M.seam, n >= 3 ? (((x + k) & 1) ? 4 : 3) : 3);
      }
    }
  }
  // ───── 画（部件从后往前）─────
  function drawBody() {
    const R = parts.rig(P, BODY), th = P.grip === 2;
    const drag = P.grip === 1;
    if (P.mb && !P.noMaul && !drag) obeliskMaul();                                                            // 巨槌在身后（抡到背后 / 举过头顶）
    const bh = parts.arm(E, drag ? Object.assign({}, R, { limb: 1.5 }) : R, P, { side: 'B', at: [P.bhx, P.bhy], sleeve: 'bare', mat: M.limbD, grip: 'none' });   // 拖槌时后臂从后肩垂到身后，前臂收细一点接 2×2 拳
    if (drag) { if (!P.noMaul) obeliskMaul(); dragFist(R, bh.hx, bh.hy, M.limb); }                           // 拖槌：骨柄压在手腕上、石拳攥住柄尾，槌头贴地拖在身后（仍在腿和躯干后面）
    else if (!th) stoneFist(R, bh.hx, bh.hy, M.limbD);
    shellPauldron(R, 'B');
    const lg = parts.legs(E, R, P, { style: 'bare', mat: M.limb, matD: M.limbD, w: 6 });
    if (!R.kneel) { const kx = RD((R.legFx + lg.fx) / 2) - 2, ky = RD((R.yHip + 1 - lg.fUp) / 2); px(E, R, kx, ky, M.limb, 4); px(E, R, kx + 1, ky, M.limb, 4); px(E, R, kx + 1, ky + 1, M.limb, 2); px(E, R, kx + 2, ky + 1, M.limb, 2); px(E, R, kx - 1, -2, M.limb, 2); px(E, R, kx - 1, -1, M.limb, 2); }   // 近侧腿：膝盖崩口 + 小腿一道石缝
    rockTorso(R); drawCores(R);
    shellFaulds(R);
    stoneHead(R); shellHelm(R); soulEye(R);
    if (!P.mb && P.grip !== 3 && !P.noMaul) obeliskMaul();
    if (th) stoneFist(R, P.bhx, P.bhy, M.limb);
    parts.arm(E, R, P, { side: 'F', at: [P.hx, P.hy], sleeve: 'bare', mat: M.limb, grip: 'none' });
    stoneFist(R, P.hx, P.hy, M.limb);
    shellPauldron(R, 'F');
    if (P.crack) deathCracks(R);
    if (P.grip === 3 && !P.noMaul) obeliskMaul();                                                             // 脱手倒在身前的巨槌
  }

  // ───── 死亡：一分为三（躯干连同头切成三块实心石块，每块带一颗核；腿塌成一堆碎石）─────
  // 碎块按「还长在身上时」的朝向画，中心在 stamp 中点；翻滚只按 90° 一档（parts.px 的内旋），明暗在烘焙时按落地后的朝向重算，永远左上受光。
  //   R 骨灰岩（自动明暗，挨着魂核的一圈压成核窝）· l 崩口高光 · k 石缝 · g 断面的孔雀绿光边（只在断开的那一侧，1 格）· C 魂核 2×2 的左上格（c 其余三格）
  //   H L B D v 碎壳（盔 / 裙甲 F f d）· e 眼洞 · E 熄灭的独眼 · A 前臂 · X 石拳（x 高光）
  const CHUNK = [
    [                                   // 0 上块：头盔 + 上核，断面在下沿（9×13）
      '...HL....',
      '..HLcBBD.',
      '.HLLLBBBD',
      '.HLBeeeBD',
      '.HLBeEEBD',
      '.BvBvBBvB',
      'RRRRRRRRR',
      'RlRRRRRRR',
      'RRRRRCcRR',
      'RRRRRccRk',
      'gRRRRRRRg',
      '.ggRRgggg',
      '...gg....',
    ],
    [                                   // 1 前块：中核 + 垂下的前臂和石拳，断面在后沿（9×13）
      'gRRRRRR..',
      'gRRRRRRR.',
      'gRlRRRRRR',
      'gRRRCcRRR',
      'gRRRccRRR',
      '.gRRRRRRk',
      '..ggRRRR.',
      '....AAA..',
      '....AaA..',
      '....AAA..',
      '...xXXX..',
      '...XXXX..',
      '....XX...',
    ],
    [                                   // 2 后块：下核 + 腰间一截碎壳裙甲，断面在前沿（10×8）
      '.RRRRRRRg.',
      'RlRRRRRRRg',
      'RRRRCcRRRg',
      'RRRRccRRRg',
      'kRRRRRRRg.',
      'RRRRRRRRRg',
      'FfdFfdFfdg',
      'F.dF.dF...',
    ],
  ];
  const CH_CLS = { R: 0, l: 0, k: 0, g: 0, C: 0, c: 0, H: 1, L: 1, B: 1, D: 1, v: 1, e: 1, E: 1, F: 1, f: 1, d: 1, A: 2, a: 2, X: 3, x: 3 };   // 石块 → 碎壳 → 前臂 → 石拳（各一个部件）
  const CHC = { l: [M.rock, 4], k: [M.rock, 2], H: [M.hi, 3], L: [M.shell, 4], B: [M.shell, 3], D: [M.shell, 2], v: [M.shell, 2], e: [M.limb, 1], E: [M.eye, 1],
    F: [M.shell, 4], f: [M.shell, 3], d: [M.shell, 2], A: [M.limb, 0], a: [M.limb, 2], X: [M.limb, 0], x: [M.limb, 4] };
  const rot = (u, v, r) => (r === 0 ? [u, v] : r === 1 ? [-v, u] : r === 2 ? [-u, -v] : [v, -u]);   // 和 parts.px 的内旋同一个方向
  function drawChunk(k, X, Y, r, lv) {
    const S = CHUNK[k], h = S.length, w = S[0].length, cx = w >> 1, cy = h >> 1, T = { r0: r & 3, tx: X, ty: Y, rot: 0, ox: 0, oy: 0 };
    const at = (c, j) => (j >= 0 && j < h && c >= 0 && c < w ? S[j][c] : '.'), isCore = (ch) => ch === 'C' || ch === 'c';
    const seamT = lv >= 4 ? 4 : lv >= 2 ? 3 : 2;                                                             // 断面光边跟着这块的核亮 / 暗
    for (let pass = 0; pass < 4; pass++) {
      let open = false;
      for (let j = 0; j < h; j++) for (let c = 0; c < w; c++) {
        const ch = S[j][c]; if (CH_CLS[ch] !== pass) continue;
        if (!open) { part(); open = true; }
        const u = c - cx, v = j - cy;
        if (ch === 'c') continue;
        if (ch === 'C') { const hot = lv >= 4, m = hot ? M.hot : M.core, tt = hot ? [3, 3, 2, 2] : CORE_T[lv]; px(E, T, u, v, m, tt[0]); px(E, T, u + 1, v, m, tt[1]); px(E, T, u, v + 1, m, tt[2]); px(E, T, u + 1, v + 1, m, tt[3]); continue; }
        if (ch === 'R') { px(E, T, u, v, M.rock, isCore(at(c - 1, j)) || isCore(at(c + 1, j)) || isCore(at(c, j - 1)) || isCore(at(c, j + 1)) ? 1 : 0); continue; }
        if (ch === 'g') { px(E, T, u, v, M.seam, seamT); continue; }
        const [m, t] = CHC[ch]; px(E, T, u, v, m, t);
      }
    }
  }
  // 三块的抛物线：x0 y0 裂开时的中心（本地坐标）、初速度（格/秒）、翻滚档数 n（奇数档落地横躺；后块 10×8 本来就是横的，翻 2 档）、方向
  const G_HALF = 200;                                                                                         // 重力的一半（格/秒²）
  const PV = [
    { x0: 7, y0: -30, vx: -34, vy: -115, n: 3, dir: 1 },            // 上块：往上飞、翻 3 档，落在身后横躺（头盔朝后、断面朝碎石堆）
    { x0: 7, y0: -19, vx: 31, vy: -60, n: 1, dir: 1 },              // 前块：往前抛、翻 1 档，横躺在槌头前面（断面朝上）
    { x0: -4, y0: -16, vx: -75, vy: -45, n: 2, dir: -1 },           // 后块：往后抛、翻 2 档，裙甲朝天
  ];
  for (let k = 0; k < 3; k++) {                                                                              // 预先算好落地时刻、落点、落地朝向和核的位置
    const V = PV[k], S = CHUNK[k], cx = S[0].length >> 1, cy = S.length >> 1; V.rf = (((V.dir * V.n) % 4) + 4) % 4; V.maxV = -99;
    for (let j = 0; j < S.length; j++) for (let c = 0; c < S[0].length; c++) { if (S[j][c] === '.') continue; const q = rot(c - cx, j - cy, V.rf); if (q[1] > V.maxV) V.maxV = q[1]; if (S[j][c] === 'C') V.core = [c - cx, j - cy]; }
    const c0 = V.y0 + V.maxV; V.tl = (-V.vy + Math.sqrt(V.vy * V.vy - 4 * G_HALF * c0)) / (2 * G_HALF); V.xl = V.x0 + V.vx * V.tl;
  }
  const splitT = (n) => (n - 0.5) / 12;                                                                        // 裂开后第 n 帧（P.split）对应的飞行时间
  function pieceAt(k, t) {                                                                                   // 第 k 块在飞行时间 t 的 [中心 x, 中心 y, 朝向]
    const V = PV[k];
    if (t >= V.tl) return [RD(V.xl), -V.maxV, V.rf];
    const r = (((V.dir * Math.min(V.n, Math.floor(V.n * t / V.tl + 0.5))) % 4) + 4) % 4;
    return [RD(V.x0 + V.vx * t), RD(V.y0 + V.vy * t + G_HALF * t * t), r];
  }
  function coreOf(k, t) { const [x, y, r] = pieceAt(k, t), q = rot(PV[k].core[0], PV[k].core[1], r); return [x + q[0], y + q[1]]; }
  // 候选部件：碎石堆 rubbleHeap —— 几块圆角石头从后往前摞成一个矮堆（每块一个部件，分界线把石头分开），夹两片碎壳
  const HEAP = [[-8, 8, 5], [0, 7, 4], [-11, 4, 2], [-4, 8, 3], [5, 4, 2]];                                    // [左 x, 宽, 高]，底边压在地面线上
  function rubbleHeap() {
    const R0 = parts.FREE;
    for (const [x, w, h] of HEAP) { part(); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!(j === 0 && (i === 0 || i === w - 1))) px(E, R0, x + i, j - h + 1, M.limb, 0); px(E, R0, x + 1, -h + 1, M.limb, 4); }
    part(); for (const [x, y, t] of [[-3, -5, 4], [-2, -5, 3], [-1, -6, 4], [3, -4, 3], [4, -4, 2]]) px(E, R0, x, y, M.shell, t);   // 肩甲碎片
  }
  // 裂开后的下半身：第 1 帧两根墩柱腿还站着（断口一圈绿光），第 2 帧跪塌，之后是一堆碎石
  function lowerBody() {
    if (P.split >= 3) { rubbleHeap(); return; }
    const LP = { crouch: P.split === 1 ? 3 : 5, lean: 0, bob: 0, step: 0, wup: 0, head: 0, lying: 0, walk: 0, lift: 0 }, R = parts.rig(LP, BODY);
    parts.legs(E, R, LP, { style: 'bare', mat: M.limb, matD: M.limbD, w: 6 });
    part(); for (let x = -7; x <= 6; x++) { px(E, R, x, R.yHip, M.rock, 0); if ((x + 9) % 5) px(E, R, x, R.yHip - 1, M.seam, 3); }   // 胯上的断口
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0); curSpr = hero; curBx = P.bx;
    if (P.split) {
      lowerBody(); if (P.grip === 3) obeliskMaul();
      const t = splitT(P.split), lv = [P.c1, P.c2, P.c3];
      for (const k of [2, 0, 1]) { const [x, y, r] = pieceAt(k, t); drawChunk(k, x, y, r, lv[k]); }
      return;
    }
    drawBody();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let gT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, prevSplitN = 0;
  const GX = [-17, -29, -41];                                                                                 // 三只小魔像在法阵（身后那半圈）里升起的位置（本地 x）
  // 小魔像剪影 11×8：头顶一片碎壳、小头独眼、圆石身子、短腿；两侧垂着两只大石拳（F，和身子之间隔一道暗缝）；胸口一点魂核光（和魔像 Golem 同一个样子）
  const GOLEM = ['.....s.....', '....XeX....', '..XXXXXXX..', '.FXXXcXXXF.', 'FFF.XXX.FFF', 'FFF.XXX.FFF', '.F..X.X..F.', '...XX.XX...'];
  const G_START = [0.14, 0.39, 0.64], G_RUSH = 0.14;
  function golemPos(i, t) {                                                                                   // → [x, 离地高, 状态, 残影 x]
    const x0 = scrX(GX[i]), x1 = DUMMY_X - 6, s = G_START[i];
    if (t < 0.06) return null;
    if (t < 0.16) return [x0, -RD(8 * (1 - (t - 0.06) / 0.1)), 1];
    if (t < s) return [x0, 0, 1];
    if (t < s + G_RUSH) { const q = (t - s) / G_RUSH; return [RD(x0 + (x1 - x0) * q), RD(4 * Math.sin(PI * q)), 2, RD(x0 + (x1 - x0) * Math.max(0, q - 0.3))]; }
    return null;
  }
  const GW = 11, GH = GW >> 1, gAt = (i, j) => i >= 0 && i < GW && j >= 0 && j < 8 && GOLEM[j][i] !== '.', gF = (i, j) => gAt(i, j) && GOLEM[j][i] === 'F';
  function drawGolem(x, h, f12, ghost) {                                                                      // 单色剪影：深蓝铜身、左上亮边、墨蓝外圈、一点孔雀绿核光；冲刺时身后留一道暗影
    const y0 = HY - 7 - h;
    if (ghost != null) for (let j = 0; j < 8; j++) for (let i = 0; i < GW; i++) if (gAt(i, j) && ((i + j + f12) & 1) && y0 + j <= HY) put(ghost - GH + i, y0 + j, EL[4]);
    for (let j = -1; j <= 8; j++) for (let i = -1; i <= GW; i++) { if (gAt(i, j) || !(gAt(i - 1, j) || gAt(i + 1, j) || gAt(i, j - 1) || gAt(i, j + 1)) || y0 + j > HY) continue; put(x - GH + i, y0 + j, EL[4]); }
    for (let j = 0; j < 8; j++) for (let i = 0; i < GW; i++) {
      const ch = GOLEM[j][i], y = y0 + j; if (ch === '.' || y > HY) continue;
      const c = ch === 'c' || ch === 's' ? EL[1] : ch === 'e' ? ((f12 & 1) ? 21 : EL[1])
        : ch === 'F' ? ((!gF(i - 1, j) || !gF(i, j - 1)) && j >= 4 ? EL[2] : EL[3])                         // 石拳：左上一圈亮边，读得出一团拳头
        : (!gAt(i - 1, j) || !gAt(i, j - 1) || gF(i - 1, j)) ? EL[2] : EL[3];
      put(x - GH + i, y, c);
    }
  }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(scrX(-19), HY, 29, 3, R_EL, 2.3, 0.6, 0);                                    // 脚下缓慢旋转的蓝铜召唤法阵（罩住身后升起魔像的那半圈）
    if (s === CAST) gT = 0;
  }
  const golemEv = (i) => (T_GOLEM[i] < DUR[CAST] - 1e-6 ? [CAST, T_GOLEM[i]] : [RECOVER, T_GOLEM[i] - DUR[CAST]]);   // 撞击时刻落在施放段还是收招段
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-6) {                                                       // 砸地：拖影弧、地裂冲向假人、碎石外爆
      const G = maulGeo(), x = scrX(G.base[0] + P.bx), sx = scrX(parts.rig(P, BODY).sFx + P.bx), sy = HY - 30;
      fx.slash(sx, sy, 24, -0.25, PI * 0.72, R_EL, 2 / 12, 2, 2);
      fx.crack(x + 2, HY + 1, Math.max(2, DUMMY_X - x), 1, 'earth', 0.8, 0);
      burst(x, HY - 2, 10, 40, 100, 0.2, 0.45, FXI.dust, 30); burst(x, HY - 3, 6, 50, 110, 0.15, 0.3, FXI.impact, 20);
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, HY - 2, (Math.random() - 0.3) * 70, -40 - Math.random() * 50, 0.7, FXI.dust, { g: 260, floor: HY });
      hitDummy(0); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'stone', w: 1 });
    }
    if (s === CAST && Math.abs(t - T_SLAM) < 1e-6) {                                                           // 砸地：法阵里三块蓝铜碎石破土、震屏、天空闪白
      const G = maulGeo(), x = scrX(G.C[0] + P.bx);
      fx.crack(x + 4, HY + 1, 16, 1, 'earth', 0.7, 0); fx.crack(x - 4, HY + 1, 14, -1, 'earth', 0.7, 0); burst(x, HY - 2, 12, 40, 110, 0.25, 0.5, FXI.dust, 26);
      for (const g of GX) { burst(scrX(g), HY - 1, 6, 30, 70, 0.25, 0.5, R_EL, 30); spawnX(K_PHYS, scrX(g), HY - 2, (Math.random() - 0.5) * 30, -60, 0.6, FXI.dust, { g: 260, floor: HY }); }
      ring(x, HY - 4, 0, R_EL); shake(0.28, 2); flash(0.05);
    }
    for (let i = 0; i < 3; i++) {
      const [st, tt] = golemEv(i);
      if (s === st && Math.abs(t - tt) < 1e-6) {                                                                // 小魔像撞碎在假人身上（三段，第三段大冲击环）
        const x = DUMMY_X - 5, y = HY - 6, big = i === 2 ? 1 : 0;
        burst(x, y, 12 + big * 10, 40, 110 + big * 30, 0.25, 0.5 + big * 0.2, R_EL, 14); burst(x, y + 2, 6, 30, 80, 0.2, 0.45, FXI.dust, 16); ring(x, y - 2, big, R_EL);
        for (let k = 0; k < 3; k++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 0.8, R_EL, { g: 260, floor: HY });
        hitDummy(big, 1); if (big) shake(0.12, 1); sfx('impact', { pal: 'earth', w: big ? 0.95 : 0.6 });
      }
    }
    if (s === DEATH && Math.abs(t - T_SPLIT) < 1e-6) {                                                         // 裂开：三块各带一颗核外爆一团绿光，腰间炸出石屑
      for (let k = 0; k < 3; k++) { const c = coreOf(k, splitT(1)); burst(scrX(c[0]), HY + c[1], 8, 30, 80, 0.2, 0.45, R_EL, 10); }
      burst(scrX(0), HY - 12, 12, 40, 100, 0.25, 0.5, FXI.dust, 20);
      flash(0.04); shake(0.12, 1);
    }
    if (s === DEATH && Math.abs(t - T_CRUMBLE) < 1e-6) {                                                       // 碎成石块
      poseAt(DEATH, T_CRUMBLE - 1 / 12, T_CRUMBLE - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 5, power: 0.35, fromX: 0, fromY: -4, push: 0, fadeAt: 0.35, fadeDur: 0.5, ramp: 'soul' });
      poseAt(DEATH, t, t);
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_SLAM], [], [], [T_SPLIT, T_CRUMBLE], []];
  for (let i = 0; i < 3; i++) { const [st, tt] = golemEv(i); EVENTS[st].push(tt); }
  function hurtFx(s) {                                                                                         // 受击：石屑 + 灰尘，碎壳上迸出几点蓝铜光
    const hx = HX + 6, hy = HY - 22;
    burst(hx, hy, s === DEATH ? 22 : 14, 40, 110, 0.25, 0.55, FXI.dust, 20); burst(hx, hy - 2, s === DEATH ? 8 : 4, 50, 120, 0.2, 0.4, R_EL, 12);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) {                                                               // 巨人跺步：4 颗尘 + 震屏 1 格；拖在身后的方尖石划地冒火星
      if (P.step !== 0) {
        sfx('step', { w: 1 }); shake(0.08, 1);
        const R = parts.rig(P, BODY), fx0 = P.step > 0 ? R.footFx : R.footBx;
        for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(fx0 + 2) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 26, -5 - Math.random() * 9, 0.4 + Math.random() * 0.25, FXI.dust);
        const G = maulGeo(); for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(G.base[0]) + (Math.random() - 0.5) * 3, HY, (P.flip ? 1 : -1) * (6 + Math.random() * 10), -3 - Math.random() * 4, 0.35, FXI.dust);
        spawn(K_EMBER, scrX(G.base[0]), HY - 1, (Math.random() - 0.5) * 20, -12, 0.25, FXI.impact);
      }
      lastStep = P.step;
    }
    if (state === CHARGE) {                                                                                   // 法阵里升起蓝铜光点，汇向正在点亮的魂核
      const R = parts.rig(P, BODY), k = stT < CORE_LIGHT[1] ? 0 : stT < CORE_LIGHT[2] ? 1 : 2, c = coreAt(R, k), tx = scrX(c[0] + P.bx), ty = HY + c[1];
      chargeAcc += dt * (10 + 16 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = PI * (0.25 + Math.random() * 0.5), r = 14 + Math.random() * 6; spawn(K_SPIRAL_PT, tx, ty, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 2); }
      for (let i = 0; i < 3; i++) if (stT - dt < CORE_LIGHT[i] && stT >= CORE_LIGHT[i]) { const cc = coreAt(R, i); burst(scrX(cc[0] + P.bx), HY + cc[1], 6, 20, 50, 0.15, 0.3, R_EL, 4); fx.cross(scrX(cc[0] + P.bx), HY + cc[1], 4, R_EL, 0.2); sfx('impact', { pal: 'earth', w: 0.3 }); }   // 每亮一颗核一声低音鼓「咚」
    }
    if (state === DEATH) {                                                                                    // 腿塌成碎石堆、三块落地：扬尘 + 震屏；三核熄灭时各冒一缕绿魂
      const d = q12(stT) - INCOMING, n = d >= T_SPLIT_D - 1e-6 && d < 1.6 - 1e-6 ? Math.min(40, 1 + f12of(d - T_SPLIT_D)) : 0;
      if (n > prevSplitN) {
        if (prevSplitN < 3 && n >= 3) { for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-12 + Math.random() * 22), HY - Math.random() * 3, (Math.random() - 0.5) * 34, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.9 }); }
        for (let k = 0; k < 3; k++) if (splitT(prevSplitN) < PV[k].tl && splitT(n) >= PV[k].tl) {
          const x = scrX(PV[k].xl); for (let i = 0; i < 8; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 12, HY, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
          shake(0.1, 1); sfx('fall', { w: k === 0 ? 1 : 0.7 });
        }
        prevSplitN = n;
      }
      for (let k = 0; k < 3; k++) { const dd = stT - INCOMING; if (dd - dt < T_CORE_OFF[k] && dd >= T_CORE_OFF[k]) { const c = coreOf(k, splitT(1 + f12of(T_CORE_OFF[k] - T_SPLIT_D))); for (let i = 0; i < 6; i++) spawn(K_RISE, scrX(c[0]), HY + c[1], (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL); } }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 30 + Math.random() * 60, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    if (state === IDLE && Math.random() < dt * 1.2) { const c = coreAt(parts.rig(P, BODY), 1); spawn(K_EMBER, scrX(c[0] + P.bx), HY + c[1], (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.6, R_EL); }
    gT += dt;
  }
  function fxReset() { gT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; prevSplitN = 0; }
  function fxBack(f12) { if (!P.split && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    for (let i = 0; i < 3; i++) { const g = golemPos(i, gT); if (g) drawGolem(g[0], g[1], f12, g[2] === 2 ? g[3] : null); }   // 三只小魔像剪影
    if (P.ev === 3 && !P.split && P.dq < 1) { const R = parts.rig(P, BODY), x = scrX(R.hx1 - 1 + P.bx), y = HY + R.ey; for (let r = 2; r <= (P.st === IDLE ? 2 : 4); r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x, y - r, c); } }   // 独眼烧白的星芒（待机的心跳只闪一点）
  }

  return {
    name: '巨人战神', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.core, M.hot, M.seam, M.rune], HIT_POINT: [6, -22], EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    SFX: { body: 'stone', how: 'shatter', pal: 'earth', style: 'summon', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, hurtFx, stepFX, fxReset, fxBack, fxFront,
  };
});
