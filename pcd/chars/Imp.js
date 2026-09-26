// 小鬼（敌人 · 野兽 · 优质 · 近战 256）：desc「派遣时额外召唤一个小鬼。造成高额伤害。」；特性「恶魔二人组：小鬼成对出现」（fx 召唤）。
//   一只孩童比例的品红紫小恶魔：7×7 大圆头、往脑后支棱的大尖耳、四肢细、小肚子微鼓，背后一对紫色小蝠翼快速扑动、离地 2 格悬停；
//   头顶两只弯弯的小羊角，身后细尾末端是箭头尾尖，双手握一柄比自己还高的小三叉叉（铁叉头 + 木杆，叉尖暗紫火是发光体）。
// 攻击 = 刺：往前俯冲 4 格，三叉连戳三下。
// 技能 = 特性「恶魔二人组」：转身用叉尖在身后地面画一个转动的五芒小法阵（中心冒暗紫火苗，角和叉尖亮起）→ 法阵裂开，
//   第二只小鬼（同款复制体）先以带亮边的暗紫剪影从阵里蹦出、落地变成实体 → 两只一起举叉，叉尖各射出一颗暗紫火花打在假人身上（双击）→
//   收招搭档蹦到身边两只击掌，搭档化成暗烟融回法阵。
// 待机个性：空中翻个跟头（只有倒立 / 侧翻两帧）、搓手嘿嘿坏笑、回头朝身后（搭档方向）招手；尾巴一直甩。
// 死亡 = 化烟：挨打后失衡下坠，「噗」地炸成一团紫黑烟，三叉掉地，烟里弹出一对小角落地，随后化灰。
// 身体用 parts.rig（child 比例）+ parts 的腿 / 手臂 / 手；头（含尖耳）、羊角、蝠翼、躯干、箭头尾、三叉、地面五芒阵、搭档复制体是本模块的候选部件。
// 设定卡见 pcd/batch-13/Imp/design.md。
PCD.define('Imp', (E) => {
  const { parts, Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, blitShape } = E;
  const B = parts.beast, RD = Math.round, PX = parts.px;

  // ───── 元素：恶魔二人组 · 暗影紫焰（shadow：淡紫 → 紫 → 深紫 → 墨紫 → 墨）─────
  const R_EL = FXI.shadow, EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: [11, '#6e1f63', '#a8388f', 63],               // 品红紫小恶魔皮（酒红墨勾线 → 暗品红 → 品红 → 粉），band 1：大块基色 + 左上亮边
    horn: 'bone', hornG: { r: [52, 54, 43, 21], flat: 1 },   // 小羊角；蓄力时角亮起（暗紫 → 淡紫 → 白）
    cloth: 'shadow', inner: { r: 'pink', flat: 1 },     // 墨紫缠腰布；耳内粉
    wood: 'wood', iron: 'steel',
    eye: { r: [20, 14, 47, 51], flat: 1 },              // 金色发光眼
    tine: { r: [52, 53, 54, 43], flat: 1 },             // 叉尖暗紫火（发光体）
    tineHot: { r: [54, 43, 21, 21], flat: 1 },          // 蓄满 / 施放：淡紫 → 白
    ink: { r: 'ink', flat: 1 }, tooth: { r: [7, 18, 17, 21], flat: 1 },
  });
  // 蝠翼：近翼膜 勾线 53 / 暗 53 / 基 54 / 亮 43（夜空前看得见）；远翼暗一级 勾线 52 / 基 53 / 亮 54
  const WING = E.defMat([53, 53, 54, 43], 1), WING_F = E.defMat([52, 52, 53, 54], 1);
  const BODY = { body: 'child', leg: 5, torso: 5, head: 7, headW: 7, sw: 3, arm: 9, lw: 1, belly: 1, limb: 0.8, stride: 2 };
  const HX = 76, ALT = 2, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 50, 32, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'iron', 'tine', 'tineHot', 'eye', 'ink', 'tooth', 'horn', 'hornG', 'cloth', 'inner']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  RIM.skip[WING] = 1; RIM.skip[WING_F] = 1;
  const CX = HX - 26, CX2 = CX, TXC = HX - 16;     // 法阵中心（转身后画在身后）· 搭档落地的位置 · 击掌时搭档蹦到的位置（屏幕 x）

  // ───── 姿势 ─────
  // hx/hy 前手 · bhx/bhy 后手 · td 三叉朝向（0 上 · 1 右上 · 2 右 · 3 右下 · … · 7 左上）· tb 1 = 三叉握在后手
  // wing 翼姿（0 收拢 · 1 上扬 · 2 平展 · 3 下压 · 4 回收 · 5 张开 · 6 垂落）· tail 尾摆 · tl 尾形（0 垂下上卷 · 1 甩直 · 2 耷拉）· ear 1 耳朵后贴 · jaw 咧嘴 0–2 · eyeG 眼光档 · gem 叉尖档 · hg 角亮
  // look 1 = 回头（头镜像）· rot 翻跟头的 90° 档 · fl 悬停起伏 · dy 下降（+）/ 上升（-）· gone 1 = 已化烟（只剩掉在地上的三叉和小角）
  const Z = { hx: 0, hy: 0, bhx: 0, bhy: 0, td: 0, tb: 0, lean: 0, head: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, wing: 1, tail: 0, tl: 0, ear: 0, jaw: 0, eyes: 0, eyeG: 0,
    gem: 0, hg: 0, look: 0, rot: 0, flash: 0, rim: 0, fl: 0, dy: 0, bx: 0, dq: 0, dq48: 0, st: 0, gone: 0, hornX: 0, hornY: 0, triY: 0, lying: 0, lift: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const P = Object.assign({}, Z);
  const KEY = keyer([['hx', -12, 16], ['hy', -24, 4], ['bhx', -12, 16], ['bhy', -24, 4], ['td', 0, 7], ['tb', 0, 1], ['lean', -1, 1], ['head', -1, 1], ['crouch', 0, 3],
    ['step', -1, 1], ['wing', 0, 6], ['tail', -2, 2], ['tl', 0, 2], ['ear', 0, 1], ['jaw', 0, 2], ['eyes', 0, 1], ['eyeG', 0, 4], ['gem', 0, 4], ['hg', 0, 1], ['look', 0, 1], ['rot', 0, 3],
    ['flash', 0, 1], ['rim', 0, 3], ['fl', -3, 3], ['dy', -3, 4], ['bx', -8, 8], ['dq48', 0, 48], ['st', 0, 8], ['gone', 0, 1], ['hornX', -12, 4], ['hornY', 0, 14], ['triY', 0, 12]]);
  const K = (hx, hy, bhx, bhy, td, lean) => ({ hx, hy, bhx, bhy, td, lean });
  const K_IDLE = K(9, -8, 9, -4, 0, 0);              // 叉竖在身前（离头 ≥ 5 格），双手一上一下握杆
  const K_WIND = K(4, -9, 1, -9, 2, -1);             // 叉平端后引
  const K_POKE = K(10, -8, 6, -8, 2, 1);             // 戳出
  const K_BACK = K(7, -8, 3, -8, 2, 0);              // 收回
  const K_DRAW = K(6, -11, -3, -5, 3, 1);            // 蓄力（转身后）：叉尖朝前下方抵地画阵，后手张开
  const K_RAISE = K(9, -12, 9, -8, 0, 0);            // 施放：高举三叉
  const K_FIVE = K(9, -8, -6, -16, 0, 0);            // 收招：后手举到头后上方和搭档击掌
  const K_HURT = K(8, -8, 7, -5, 1, -1);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean'];
  const setK = (A, Bk, q) => { E.mix(P, A, Bk, q, FIELDS); P.td = q < 0.5 ? A.td : Bk.td; };
  const FLAP = B.FLAP, FLIPC = [[0, 0], [-9, -9], [0, -18], [9, -9]];
  const T_POKE = [2 / 12, 4 / 12, 6 / 12], T_LANDTW = 3 / 12, T_ZAP = 4 / 12, T_CLAP = 2 / 12, T_MELT = 3 / 12;
  const T_POOF = INCOMING + 0.5, T_TRI = INCOMING + 0.66, T_HORN = INCOMING + 0.83;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, i12 = f12of(t);
    for (const k of ['bx', 'head', 'crouch', 'bob', 'step', 'wup', 'walk', 'tail', 'tl', 'ear', 'jaw', 'eyes', 'eyeG', 'gem', 'hg', 'look', 'rot', 'flash', 'fl', 'dy', 'dq', 'gone', 'hornX', 'hornY', 'triY', 'mx', 'flip', 'tb']) P[k] = 0;
    P.st = st; P.rim = 1; P.wing = 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); P.wing = FLAP[(f12 >> 1) & 3];
      const b = Math.floor(TT * 2.5 + 1e-6); P.fl = (b & 1) ? -1 : 0; P.tail = [0, 1, 0, -1][b & 3];
      P.gem = ((f12 >> 3) % 5) === 4 ? 1 : 0;
      const i = f12of(tq % DUR[IDLE] + 1e-9);
      if (i >= 10 && i <= 13) {                                       // 翻跟头：收身 → 倒立 → 侧翻 → 落回（只有两个转过的朝向）
        const k = i - 10; P.rot = [0, 2, 1, 0][k]; P.crouch = k <= 2 ? 2 : 0; P.fl = [-1, -3, -2, 0][k]; P.wing = k === 3 ? 5 : 0;
        P.hx = 8; P.hy = -8; P.bhx = 7; P.bhy = -6; P.jaw = k === 3 ? 2 : 1; P.eyes = k === 1 || k === 2 ? 1 : 0; P.tail = k & 1 ? 2 : -2;
      } else if (i >= 16 && i <= 20) {                                // 搓手嘿嘿笑：后手在前手上来回搓，尾巴左右猛甩
        P.bhx = (i & 1) ? 8 : 9; P.bhy = (i & 1) ? -9 : -7; P.jaw = (i & 1) ? 2 : 1; P.tail = (i & 1) ? 2 : -2; P.eyeG = 1; P.head = (i & 1) ? 1 : 0;
      } else if (i >= 22 && i <= 27) {                                // 回头朝身后招手
        P.look = 1; P.bhx = (i & 1) ? -4 : -3; P.bhy = (i & 1) ? -16 : -17; P.jaw = 1; P.tail = (i & 1) ? -1 : 1;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 扑翼飞行：不落地，翅膀 4 帧扑动，身体一颠一颠，两腿交替蹬
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); P.wing = FLAP[f]; P.fl = [0, -1, -2, -1][f]; P.tail = [1, 0, -1, 0][f]; P.step = [1, 0, -1, 0][f]; P.lean = 1; P.hx += [0, 1, 0, -1][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_POKE[0]) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.1))); P.td = i12 < 1 ? 1 : 2; P.wing = 1; P.dy = -1; P.gem = 1; P.jaw = 1; P.tail = 1; P.ear = 1; }
      else if (tq < 7 / 12) {                                          // 俯冲 4 格，三叉连戳三下（戳 · 收 · 戳 · 收 · 戳）
        const i = i12 - 2, poke = !(i & 1); setK(poke ? K_POKE : K_BACK, poke ? K_POKE : K_BACK, 0); P.hx += poke && i ? 1 : 0;
        P.bx = 4 + (i ? 1 : 0); P.wing = poke ? 3 : 2; P.dy = 1; P.gem = poke ? 2 : 1; P.rim = poke ? 2 : 1; P.jaw = 2; P.tail = poke ? -2 : -1; P.tl = 1; P.ear = 1;
      } else { const q = ease.inOut(clamp01((tq - 7 / 12) / (1.5 / 12))); setK(K_BACK, K_IDLE, q); P.bx = RD(5 * (1 - q)); P.wing = FLAP[(f12 >> 1) & 3]; P.jaw = 1; P.tail = 1; P.td = q < 0.4 ? 2 : q < 0.9 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 转身、下降到贴地，叉尖在身后地面画阵
      const q = ease.inOut(clamp01((tq - 0.1) / 0.5)); setK(K_IDLE, K_DRAW, q); P.flip = tq >= 2 / 12 ? 1 : 0; P.dy = RD(2 * q); P.wing = q < 1 ? 4 : FLAP[(f12 >> 2) & 3];
      if (tq >= 0.6) { P.hx += (f12 & 1) ? 1 : 0; P.hy += (f12 & 2) ? 1 : 0; }   // 叉尖来回划地
      P.gem = tq < 0.7 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.hg = tq >= 0.7 ? 1 : 0; P.jaw = tq > 1.0 ? 2 : 1; P.eyeG = tq < 0.7 ? 1 : 2; P.tail = (f12 >> 1) & 1 ? 1 : -1;
    } else if (st === CAST) {                                          // 转回来、升起，高举三叉；张翅之后翅膀压低扑动，不挡身后搭档举起的叉
      setK(K_RAISE, K_RAISE, 0); P.wing = tq < 2 / 12 ? 5 : [2, 3][(f12 >> 1) & 1]; P.fl = -1; P.gem = 3; P.rim = 3; P.hg = 1; P.jaw = 2; P.eyeG = 3; P.tail = -2; P.tl = tq < 2 / 12 ? 1 : 0;
    } else if (st === RECOVER) {
      if (tq < 3 / 12) { setK(K_RAISE, K_FIVE, ease.out(clamp01(tq / (1.5 / 12)))); P.jaw = 2; P.eyeG = 2; P.wing = 0; P.gem = 2; P.rim = 2; P.tail = 2; }   // 击掌（翅膀收拢，给搭档让位）
      else { const q = ease.inOut(clamp01((tq - 3 / 12) / 0.4)); setK(K_FIVE, K_IDLE, q); P.wing = q < 0.6 ? 0 : FLAP[(f12 >> 1) & 3]; P.jaw = q < 0.6 ? 1 : 0; P.gem = q < 0.4 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.fl = (f12 >> 2) & 1 ? -1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.jaw = 2; P.wing = 5; P.tail = 2; P.tl = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.fl = -1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.ear = 1; P.jaw = 1; P.wing = 4; P.tail = 1; P.rim = 0; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.wing = FLAP[(f12 >> 1) & 3]; }
    } else if (st === DEATH) {                                         // 失衡下坠 → 「噗」化烟 → 三叉掉地、小角弹出落地 → 静止 → 化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.jaw = 2; P.wing = d < 0.15 ? 5 : 6; P.tail = 2; P.tl = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5 - 1e-6) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.jaw = 1; P.wing = 6; P.crouch = 2; P.dy = d < 0.4 ? 1 : 2; P.head = 1; P.tl = 2; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        P.gone = 1; P.bx = -2;
        const tq2 = clamp01((d - 0.5) / (T_TRI - T_POOF)); P.triY = RD(9 * (1 - tq2 * tq2));
        const hq = clamp01((d - 0.5) / (T_HORN - T_POOF)); P.hornX = RD(-8 * hq); P.hornY = d < T_HORN - INCOMING ? RD(10 * (1 - hq) + Math.sin(hq * Math.PI) * 4) : d < T_HORN - INCOMING + 0.1 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { setK(K_IDLE, K_IDLE, 0); P.wing = FLAP[(f12 >> 1) & 3]; P.fl = (Math.floor(TT * 2.5 + 1e-6) & 1) ? -1 : 0; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.eyeG = tq > 0.85 ? 2 : 0; }
    for (const f of FIELDS) P[f] = RD(P[f]);
    if (P.gone) { P.gx = 11 + P.bx; P.gy = -2 - P.triY; }
    else { const tp = tipOf(P); P.gx = tp[0] + P.bx; P.gy = tp[1] + yOff(P); }
    P.dq48 = RD(P.dq * 48); KEY(P);
  }
  const yOff = (Q) => -ALT + Q.fl + Q.dy;

  // ───── 画 ─────
  const DIRS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const tridentLen = (di) => { const d = DIRS[di], dg = d[0] !== 0 && d[1] !== 0; return { d, dn: dg ? 5 : 7, up: dg ? 6 : 9, pl: 2 }; };
  function tipOf(Q) {
    const G = tridentLen(Q.td), a = Q.tb ? [Q.bhx, Q.bhy] : [Q.hx, Q.hy], n = G.up + G.pl + 3;
    if (Q.rot) { const c = FLIPC[Q.rot]; return [c[0] * 0.3, -9]; }
    return [a[0] + G.d[0] * n, a[1] + G.d[1] * n];
  }
  // 候选部件：trident —— 小三叉叉（8 个朝向，斜向按 45° 逐格错位）：木杆 + 杆尾铁箍 + 铁横档（5 格）+ 三根直齿（中齿长 2 格），齿尖 1 格是发光体
  //   gem 0 待机 · 1 亮 · 2 蓄满 · 3 施放 · 4 熄灭；齿尖和叉头同一个部件（嵌在武器里的发光体）
  function trident(T, ax, ay, di, gem) {
    const { d, dn, up, pl } = tridentLen(di), dx = d[0], dy = d[1], nx = -dy, ny = dx;
    E.part();
    for (let k = -dn; k <= up; k++) PX(E, T, ax + dx * k, ay + dy * k, M.wood, k === -dn ? 2 : (k & 3) === 1 ? 4 : 0);
    PX(E, T, ax - dx * (dn + 1), ay - dy * (dn + 1), M.iron, 3);
    const cx = ax + dx * (up + 1), cy = ay + dy * (up + 1), W = 2;
    for (let j = -W; j <= W; j++) PX(E, T, cx + nx * j, cy + ny * j, M.iron, j === -W ? 4 : j === W ? 2 : 0);
    const tm = gem >= 2 && gem <= 3 ? M.tineHot : gem === 4 ? M.iron : M.tine, tt = gem === 0 ? 2 : gem === 1 ? 3 : gem === 2 ? 3 : gem === 3 ? 4 : 2;
    for (const j of [-W, 0, W]) {
      const L = j === 0 ? pl + 2 : pl, bx0 = cx + nx * j, by0 = cy + ny * j;
      for (let k = 1; k <= L; k++) PX(E, T, bx0 + dx * k, by0 + dy * k, k === L ? tm : M.iron, k === L ? tt : j < 0 ? 4 : 0);
    }
  }
  // 候选部件：impHead —— 孩童小恶魔 7×7 大圆头（整块一个部件，脸上只有眼、眉、嘴）：金色发光大眼、往前压的坏眉、翘鼻、咧嘴坏笑（一颗尖牙，jaw 张嘴），
  //   脑后一只往后上方支棱的大尖耳（伸出头轮廓 5 格，耳内粉；ear 1 后贴），和头同一个部件，不压分界线；look 1 = 整个头左右镜像（回头看身后）
  const HEADR = [[-2, 2], [-3, 3], [-3, 3], [-3, 3], [-3, 4], [-3, 3], [-2, 2]];
  const EAR = [[[5, -4, -4], [4, -6, -4], [3, -7, -5], [2, -8, -7]], [[5, -5, -4], [4, -8, -4], [3, -9, -8]]];
  function impHead(T, R, Q) {
    const cx = R.hx, top = R.htop, lk = Q.look, m = M.skin;
    const hp = (x, y, mm, t) => PX(E, T, lk ? 2 * cx - x : x, y, mm, t);
    E.part();
    HEADR.forEach(([a, b], dy) => { for (let x = a; x <= b; x++) hp(cx + x, top + dy, m, 0); });
    for (const [dy, a, b] of EAR[Q.ear]) for (let x = a; x <= b; x++) hp(cx + x, top + dy, m, x === a ? 4 : 0);
    hp(cx - 5, top + 4, M.inner, 0); if (!Q.ear) hp(cx - 6, top + 3, M.inner, 0);                             // 耳内粉
    const ey = top + 3;
    hp(cx + 1, ey - 1, m, 2); hp(cx + 2, ey - 1, m, 1);                                                        // 往前压的坏眉
    if (Q.eyes) { hp(cx + 1, ey, m, 1); hp(cx + 2, ey, m, 1); }
    else if (Q.eyeG === 4) { hp(cx + 1, ey, m, 1); hp(cx + 2, ey, M.ink, 0); }
    else { const g = Q.eyeG | 0; hp(cx + 1, ey, M.eye, g >= 2 ? 4 : 3); hp(cx + 2, ey, M.eye, g >= 1 ? 4 : 3); if (g >= 3) hp(cx + 3, ey, M.eye, 3); }
    const my = top + 5, jw = Q.jaw | 0;                                                                         // 咧嘴坏笑 + 尖牙
    hp(cx, my - 1, M.ink, 0); hp(cx + 1, my, M.ink, 0); hp(cx + 2, my, M.tooth, 3); hp(cx + 3, my, M.ink, 0);
    if (jw >= 1) hp(cx + 2, my + 1, M.ink, 0);
    if (jw >= 2) { hp(cx + 1, my + 1, M.ink, 0); for (let x = 0; x <= 2; x++) hp(cx + x, my + 2, m, 0); }
  }
  // 候选部件：ramHorns —— 一对弯弯的小羊角（2 格粗，从头顶往上长 4 行再往后卷；远侧那只暗一级、错后 3 格）；画在头之前，根部压在头顶下
  const HORN_N = [[0, -1], [1, -1], [0, -2], [1, -2], [-1, -3], [0, -3], [-2, -4], [-1, -4]], HORN_F = [[-3, -1], [-2, -1], [-3, -2], [-4, -3]];
  function ramHorns(T, R, Q) {
    const cx = R.hx, top = R.htop, lk = Q.look, hp = (x, y, mm, t) => PX(E, T, lk ? 2 * cx - x : x, y, mm, t);
    E.part();
    HORN_F.forEach(([x, y], i) => hp(cx + x, top + y, Q.hg ? M.hornG : M.hornD, Q.hg ? 3 : i === HORN_F.length - 1 ? 3 : 0));
    HORN_N.forEach(([x, y], i) => hp(cx + x, top + y, Q.hg ? M.hornG : M.horn, Q.hg ? (i >= 4 ? 4 : 3) : i === 6 ? 4 : 0));
  }
  // 候选部件：batWing —— 小蝠翼（一个部件）：膜 = 多边形（臂骨 → 腕 → 翼尖 → 扇贝凹边 → 翼指 → … → 贴背），臂骨亮、翼指暗、腕上一颗骨爪。
  //   翼姿都画在身体轮廓外：上扬时翼尖在头顶上方 ≥ 5 格、身后 ≥ 10 格，前缘和耳朵之间留 ≥ 3 格；
  //   远翼 = 近翼往左上错开（离翼根越远错得越多，最多 (-2, -3)），在近翼后上方露出一圈翼尖和前缘
  //   翼姿点 = 默认骨架的本地坐标（跟着后肩平移）：[根, 腕, 翼尖 1, 凹, 翼尖 2, 凹, 翼尖 3, 凹, 贴背]
  const WP = [
    [[-3, -7], [-6, -9], [-8, -11], [-8, -9], [-10, -8], [-9, -6], [-8, -4], [-6, -4], [-4, -3]],                    // 0 收拢
    [[-3, -7], [-11, -10], [-14, -24], [-15, -18], [-18, -20], [-17, -14], [-19, -11], [-13, -7], [-5, -4]],          // 1 上扬
    [[-3, -6], [-11, -8], [-19, -11], [-17, -9], [-19, -7], [-16, -6], [-15, -3], [-11, -4], [-5, -3]],               // 2 平展
    [[-3, -7], [-10, -6], [-16, -1], [-14, -2], [-12, 0], [-10, -2], [-7, 0], [-6, -2], [-4, -3]],                    // 3 下压
    [[-3, -7], [-11, -10], [-13, -20], [-14, -16], [-16, -17], [-16, -13], [-17, -10], [-13, -7], [-5, -3]],          // 4 回收
    [[-3, -7], [-12, -11], [-15, -26], [-16, -20], [-20, -22], [-19, -16], [-22, -12], [-14, -7], [-5, -3]],          // 5 张开
    [[-3, -6], [-8, -4], [-12, 0], [-10, -1], [-8, 0], [-7, -1], [-5, 0], [-4, -1], [-3, -3]],                        // 6 垂落
  ];
  function inPoly(p, x, y) {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
    return c;
  }
  function batWing(T, R, pose, far) {
    const W = WP[pose | 0], ox = R.sBx + 2, oy = R.yS + 10, r0 = W[0], m = far ? WING_F : WING;
    const p = W.map(([x, y]) => { const k = far ? Math.min(1, Math.hypot(x - r0[0], y - r0[1]) / 10) : 0; return [RD(x - 2 * k) + ox, RD(y - 3 * k) + oy]; });
    let x0 = 99, x1 = -99, y0 = 99, y1 = -99; for (const [x, y] of p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    E.part();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inPoly(p, x + 0.01, y + 0.01)) PX(E, T, x, y, m, 0);
    const w = p[1];
    for (const i of [4, 6]) { const q = p[i]; parts.line(E, T, w[0], w[1], RD(w[0] + (q[0] - w[0]) * 0.75), RD(w[1] + (q[1] - w[1]) * 0.75), m, 2); }   // 翼指（暗）
    parts.line(E, T, p[0][0], p[0][1], w[0], w[1], m, 4);                                                                                           // 臂骨（亮）
    PX(E, T, w[0], w[1], far ? M.hornD : M.horn, 3);                                                                                                 // 腕上的骨爪
  }
  // 候选部件：impTorso —— 孩童赤膊小肚子（一个部件）：大块基色 + 左上亮边，只在胯下压一条墨紫缠腰布，不画胸腹肌暗线
  function impTorso(T, R) {
    E.part();
    for (let y = R.yS; y <= R.yHip; y++) { const [a, b] = parts.edges(R, y); parts.run(E, T, y, a, b, y === R.yHip ? M.cloth : M.skin, 0); }
    const [a, b] = parts.edges(R, R.yHip); parts.run(E, T, R.yHip + 1, b - 2, b, M.cloth, 0); PX(E, T, b - 1, R.yHip + 2, M.cloth, 2);
    PX(E, T, a + 1, R.yS + 1, M.skin, 4);
  }
  // 候选部件：arrowTail —— 细尾（1 格）+ 3 格宽的箭头尾尖：tl 0 垂下后往上卷 · 1 甩直 · 2 耷拉；tail 甩后半截
  const TAILS = [
    [[0, 0], [-1, 1], [-2, 2], [-3, 3], [-4, 3], [-5, 3], [-6, 2], [-7, 1], [-8, 0], [-8, -1]],
    [[0, 0], [-1, 0], [-2, 0], [-3, -1], [-4, -1], [-5, -1], [-6, -1], [-7, -1], [-8, -2], [-9, -2]],
    [[0, 0], [-1, 1], [-2, 2], [-3, 3], [-3, 4], [-4, 4]],
  ];
  function arrowTail(T, R, Q) {
    E.part(); const pts = TAILS[Q.tl], n = pts.length, sw = Q.tail | 0, x0 = parts.edges(R, R.yHip)[0] + 1, y0 = R.yHip;
    let lx = 0, ly = 0;
    for (let k = 0; k < n; k++) { const q = k / (n - 1), off = Q.tl === 2 ? 0 : RD(sw * q * q * 1.4); lx = x0 + pts[k][0] + (Q.tl === 1 ? 0 : off); ly = y0 + pts[k][1] + (Q.tl === 1 ? off : 0); PX(E, T, lx, ly, M.skinD, 0); }
    const c = M.skin;
    if (Q.tl === 0) { PX(E, T, lx, ly - 1, c, 3); PX(E, T, lx - 1, ly - 1, c, 4); PX(E, T, lx + 1, ly - 1, c, 3); PX(E, T, lx, ly - 2, c, 4); }
    else if (Q.tl === 1) { PX(E, T, lx - 1, ly, c, 3); PX(E, T, lx - 1, ly - 1, c, 4); PX(E, T, lx - 1, ly + 1, c, 3); PX(E, T, lx - 2, ly, c, 4); }
    else { PX(E, T, lx, ly + 1, c, 3); PX(E, T, lx - 1, ly + 1, c, 4); PX(E, T, lx + 1, ly + 1, c, 3); PX(E, T, lx, ly + 2, c, 3); }
  }
  function drawImp(spr, Q) {
    if (Q.gone) { begin(spr, Q.bx, 0); return drawDropped(Q); }
    begin(spr, Q.bx, yOff(Q));
    const R = parts.rig(Q, BODY), T = R;
    if (Q.rot) { const c = FLIPC[Q.rot]; R.rot = Q.rot; R.ox = c[0]; R.oy = c[1]; }
    batWing(T, R, Q.wing, 1);                                          // 远翼 → 近翼（都在躯干之前，根部被身体盖住，分界线压在翼上）
    batWing(T, R, Q.wing, 0);
    arrowTail(T, R, Q);
    parts.arm(E, R, Q, { side: 'B', sleeve: 'tight', mat: M.skinD, grip: 'none' });
    parts.legs(E, R, Q, { style: 'bare', mat: M.skin, matD: M.skinD, w: 1 });
    impTorso(T, R);
    ramHorns(T, R, Q);
    impHead(T, R, Q);
    const a = Q.tb ? [Q.bhx, Q.bhy] : [Q.hx, Q.hy]; trident(T, a[0], a[1], Q.td, Q.gem);
    parts.hand(E, R, Q, { side: 'B', hand: M.skinD, grip: 'fist' });
    parts.arm(E, R, Q, { sleeve: 'tight', mat: M.skin, hand: M.skin, grip: 'fist' });
  }
  // 化烟后：三叉横躺在地上（齿尖熄灭），一对小角从烟里弹出、落在身后
  function drawDropped(Q) {
    const F = parts.FREE;
    trident(F, -3, -2 - Q.triY, 2, 4);
    E.part(); const hx = Q.hornX - 2, hy = -1 - Q.hornY;
    for (const [dx, dy, t] of [[0, 0, 0], [1, 0, 0], [0, -1, 3], [-1, -1, 4], [-1, 0, 2], [3, 0, 0], [4, 0, 2], [4, -1, 3], [5, -1, 4]]) PX(E, F, hx + dx, hy + dy, M.horn, t);
  }
  function drawHero() { drawImp(hero, P); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 搭档：同款复制体（同一套画法 + 固定姿势，烤进自己的缓冲，按需画）─────
  const TW_Q = [
    Object.assign({}, Z, K_IDLE, { wing: 5, crouch: 2, jaw: 1, eyeG: 2, gem: 1, tail: 2 }),                        // 0 蹦出（剪影）
    Object.assign({}, Z, K(9, -12, 9, -8, 0, 0), { wing: 1, jaw: 2, eyeG: 3, gem: 3, hg: 1, tail: -2, tl: 1 }),      // 1 朝目标举叉
    Object.assign({}, Z, K(9, -15, 8, -4, 0, 0), { tb: 1, wing: 4, jaw: 2, eyeG: 2, gem: 1, tail: 2 }),              // 2 击掌（叉换到后手，前手举起）
  ];
  const twin = TW_Q.map(() => new Sprite(72, 50, 32, 46)), twinOk = [0, 0, 0];
  const TW_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0, skip: RIM.skip };
  function twinSpr(i) { if (!twinOk[i]) { drawImp(twin[i], TW_Q[i]); bake(twin[i], TW_RIM); twinOk[i] = 1; hero.k1 = hero.k2 = -1; } return twin[i]; }
  function twinTip(i) { const Q = TW_Q[i], t = tipOf(Q); return [CX2 + t[0], HY + t[1] + yOff(Q)]; }
  function blitColor(s, X, Y, dq) {
    const x0 = X - s.ox, y0 = Y - s.oy, o = s.out;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255) continue; if (dq > 0 && B8[(y & 7) * 8 + (x & 7)] * 0.55 + (1 - y / s.h) * 0.45 < dq) continue; put(x0 + x, y0 + y, c); }
  }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, pkT = 9, pkX = 0, pkY = 0, clapT = 9;
  const CLAP = [HX - 7, HY - ALT - 17];
  const tipScr = () => [scrX(P.gx), HY + P.gy];
  const castT = () => (E.state === CAST ? E.stT : E.state === RECOVER ? DUR[CAST] + E.stT : -1);
  function onEnter(s) {
    if (s === CAST) {                                                  // 法阵裂开：暗影外爆 + 冲击环 + 地裂，天空闪白
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
      burst(CX, HY - 2, 28, 40, 120, 0.3, 0.7, R_EL, 18); ring(CX, HY - 2, 1, R_EL); fx.cross(CX, HY - 5, 5, R_EL, 0.25);
      fx.crack(CX + 3, HY, 7, 1, R_EL, 0.6); fx.crack(CX - 3, HY, 6, -1, R_EL, 0.6);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'shadow', w: 0.2 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && T_POKE.includes(t)) {                          // 每一戳：叉尖暗紫火星 + 假人小摇
      const k = T_POKE.indexOf(t), [x, y] = tipScr(); pkT = 0; pkX = x; pkY = y;
      burst(Math.min(x, DUMMY_X - 2), y, k === 2 ? 10 : 6, 30, 90, 0.12, 0.35, R_EL, 6); spawn(K_BURST, DUMMY_X - 3, y, 20, -10, 0.2, FXI.impact);
      hitDummy(0); sfx('swing', { kind: 'thrust', w: 0.2 }); sfx('hit', { mat: 'flesh', w: k === 2 ? 0.3 : 0.2 });
    }
    if (s === CAST && t === T_LANDTW) {                                // 搭档落地：尘土 + 小火星
      for (let i = 0; i < 6; i++) spawn(K_DUST, CX2 - 5 + Math.random() * 10, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust);
      burst(CX2, HY - 8, 10, 20, 60, 0.2, 0.4, R_EL, 8);
    }
    if (s === CAST && t === T_ZAP) {                                   // 两只一起出叉：叉尖各射出一颗暗紫火花（双击）
      const [x, y] = tipScr(), [x2, y2] = twinTip(1), ty = HY - 12;
      shoot(1, x + 1, y, 150, DUMMY_X - 3, R_EL, (ty - y) * 150 / Math.max(6, DUMMY_X - 3 - x), { trail: { life: [0.12, 0.25] } });
      shoot(2, x2 + 1, y2, 150, DUMMY_X - 3, R_EL, (ty - y2) * 150 / Math.max(6, DUMMY_X - 3 - x2), { trail: { life: [0.12, 0.25] } });
      fx.cross(x, y, 3, R_EL, 0.15); fx.cross(x2, y2, 3, R_EL, 0.15); sfx('shoot', { proj: 'orb' });
    }
    if (s === RECOVER && t === T_CLAP) {                               // 击掌：一圈淡紫火星 + 十字星芒
      clapT = 0; burst(CLAP[0], CLAP[1], 12, 25, 70, 0.15, 0.4, R_EL, 6); fx.cross(CLAP[0], CLAP[1], 4, R_EL, 0.2); sfx('impact', { pal: 'shadow', w: 0.1 });
    }
    if (s === RECOVER && t === T_MELT) fx.cloud(TXC, HY - 9, 6, R_EL, 0.6);   // 搭档化成暗烟
    if (s === DEATH && t === T_POOF) {                                 // 「噗」：紫黑烟团 + 外爆
      const x = HX - 2, y = HY - ALT - 10; fx.cloud(x, y, 8, R_EL, 0.9); fx.cloud(x + 2, y + 3, 5, R_EL, 0.7, 2); burst(x, y, 22, 30, 90, 0.3, 0.7, R_EL, 10); shake(0.12, 1);
    }
    if (s === DEATH && t === T_TRI) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('fall', { w: 0.15 }); }
    if (s === DEATH && t === T_HORN) for (let i = 0; i < 4; i++) spawn(K_DUST, HX - 10 + Math.random() * 6, HY - 1, (Math.random() - 0.5) * 16, -3, 0.25, FXI.dust);
  }
  const EVENTS = [[], [], T_POKE, [], [T_LANDTW, T_ZAP], [T_CLAP, T_MELT], [], [T_POOF, T_TRI, T_HORN], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 30, 90, 0.15, 0.4, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('impact', { pal: 'shadow', w: 0.25 }); }
    else if (k === 2) { burst(x, y, 16, 40, 110, 0.2, 0.5, R_EL, 10); ring(x, y, 0, R_EL); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.35 }); }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.45) {                               // 法阵中心冒暗紫火苗；叉尖划地迸火星
      chargeAcc += dt * (10 + 18 * clamp01((stT - 0.45) / 0.9));
      while (chargeAcc >= 1) { chargeAcc -= 1; spawn(K_EMBER, CX - 2 + Math.random() * 4, HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.45 + Math.random() * 0.4, R_EL); }
      if (stT > 0.6 && (E.stepN % 5) === 0) { const [x, y] = tipScr(); spawn(K_BURST, x, y, (Math.random() - 0.5) * 30, -16 - Math.random() * 10, 0.25, R_EL); }
    }
    if (state === MOVE) { const f = gait(q12(stT)); if (f !== lastGf) { spawn(K_EMBER, scrX(-2), HY - 1, (P.flip ? -1 : 1) * (4 + Math.random() * 4), 2, 0.4, R_EL); if (f === 2) sfx('step', { w: 0.1 }); lastGf = f; } }
    const ct = castT();
    if (ct > DUR[CAST] + T_MELT && ct < DUR[CAST] + 0.65) {             // 暗烟往法阵里沉
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, TXC - 4 + Math.random() * 8, HY - 4 - Math.random() * 12, (CX - TXC) * 0.8, 6 + Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); }
    }
    if (state === DEATH && stT > T_POOF && stT < T_POOF + 0.5) { soulAcc += dt * 20; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 12, HY - 6 - Math.random() * 10, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {  // 化灰：三叉和小角冒灰上升
      soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.7 + Math.random() * 0.6, Math.random() < 0.7 ? FXI.dust : R_EL); }
    }
    pkT += dt; clapT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; pkT = 9; clapT = 9; }
  // 候选部件（特效）：spinPenta —— 透视压扁、会转的地面五芒阵：外椭圆点阵 + 五角星（lit 0–1 按笔画逐段画出），spin 旋转角
  function spinPenta(cx, cy, rx, ry, lit, spin, f12, cS, cR, broken) {
    const n = Math.ceil(rx * 5);
    for (let k = 0; k < n; k++) { if ((k + f12) & 1) continue; if (broken && (k % 7) < 2) continue; const a = k / n * 6.2832 + spin; put(RD(cx + Math.cos(a) * rx), RD(cy + Math.sin(a) * ry), cR); }
    const pts = []; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566 + spin; pts.push([cx + Math.cos(a) * rx * 0.85, cy + Math.sin(a) * ry * 0.85]); }
    const strokes = Math.floor(lit * 5 + 1e-6);
    for (let s = 0; s < Math.min(5, strokes + 1); s++) {
      const A = pts[(s * 2) % 5], Bp = pts[(s * 2 + 2) % 5], pr = s < strokes ? 1 : lit * 5 - strokes, L = Math.ceil(Math.hypot(Bp[0] - A[0], Bp[1] - A[1]));
      for (let k = 0; k <= L * pr; k++) { if (broken && ((k + s) % 4) === 1) continue; put(RD(A[0] + (Bp[0] - A[0]) * k / L), RD(A[1] + (Bp[1] - A[1]) * k / L), cS); }
    }
    for (const p of pts) put(RD(p[0]), RD(p[1]), EL[0]);
  }
  function fxBack(f12) {
    const s = E.state, t = E.stT, ct = castT();
    if (!P.gone && P.dq < 0.6) groundShadow(scrX(P.bx), 5, Math.max(0, ALT - P.fl - P.dy));
    if (s === CHARGE && t > 0.45) spinPenta(CX, HY - 1, 10, 3, clamp01((t - 0.45) / 0.6), t * 1.4, f12, t > 1.05 && (f12 & 1) ? EL[0] : EL[1], EL[2], 0);
    if (ct >= 0 && ct < DUR[CAST] + 0.7) {                             // 施放：阵裂开（断续、闪白）→ 收招：暗下去
      const dark = clamp01((ct - DUR[CAST] - 0.3) / 0.4); if (dark < 1 && !(dark > 0.5 && (f12 & 1))) spinPenta(CX, HY - 1, 10, 3, 1, 1.96 + ct * 0.8, f12, ct < 0.1 ? EL[0] : dark > 0 ? EL[3] : EL[1], dark > 0 ? EL[4] : EL[2], 1);
    }
    if (P.rim >= 2 && !P.gone) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  // 搭档剪影：先铺一圈淡紫亮边（上下左右各错 1 格），再用墨紫（第 4 级）实心填满——轮廓清楚，不是抖动网格
  function twinShadow(s, x, y) { for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) blitShape(s, x + a, y + b, 0, EL[1], 0); blitShape(s, x, y, 0, EL[3], 0); }
  function fxMid(f12) {
    const ct = castT(); if (ct < 0) return;
    if (ct < T_LANDTW) {                                               // 施放第 0–2 帧：暗紫剪影从阵里蹦起，落回阵上
      const q = ct / T_LANDTW, y = RD(HY + 2 - Math.sin(Math.PI * q) * 10);
      twinShadow(twinSpr(0), CX2, y);
    } else if (ct < DUR[CAST]) blitColor(twinSpr(1), CX2, HY, 0);     // 落地实体化，和本体一起举叉
    else {
      const rt = ct - DUR[CAST];
      if (rt < 1 / 12) blitColor(twinSpr(2), RD((CX2 + TXC) / 2), HY - 3, 0);   // 蹦到身边
      else if (rt < 0.62) blitColor(twinSpr(2), TXC, HY, clamp01((rt - T_MELT) / 0.35));
    }
  }
  function fxFront(f12) {
    const [gx, gy] = tipScr();
    if (pkT < 2 / 12) {                                                // 戳出：身后三道速度线 + 叉尖十字
      const c = pkT < 1 / 12 ? EL[1] : EL[2], bx0 = scrX(P.bx - 6);
      for (const [dy, L] of [[-14, 6], [-10, 9], [-6, 5]]) for (let k = 0; k < L; k++) if (!(pkT >= 1 / 12 && (k & 1))) put(bx0 - k, HY + dy - ALT, k < 2 ? c : EL[3]);
      put(pkX + 1, pkY, EL[0]); put(pkX + 2, pkY, EL[1]); put(pkX + 1, pkY - 1, EL[1]); put(pkX + 1, pkY + 1, EL[1]);
    }
    if (P.gem >= 1 && P.gem <= 3 && !P.gone && P.dq < 1 && !P.rot) {  // 叉尖暗紫火苗（跳动）
      const up = (f12 & 1) + 1; put(gx, gy - up, P.gem >= 2 ? EL[0] : EL[1]); if (P.gem >= 2) { put(gx - 1, gy - 1, EL[1]); put(gx + 1, gy - 1, EL[1]); }
      if (P.gem === 3) for (let r = 2; r <= 4; r++) { const cc = r < 3 ? EL[0] : EL[1]; put(gx + r, gy, cc); put(gx - r, gy, cc); put(gx, gy - r - 1, cc); }
    }
    if (clapT < 3 / 12) { const r = 2 + RD(clapT * 18); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) put(CLAP[0] + a * r, CLAP[1] + b * r, clapT < 1 / 12 ? EL[0] : EL[2]); }
  }
  // 暗紫火花：2 格白紫芯 + 淡紫 / 紫外焰 + 跳动的尾巴
  function drawShot(k, x, y, d, f12) {
    if (k !== 1 && k !== 2) return false;
    put(x, y, EL[0]); put(x + d, y, EL[0]); put(x, y - 1, EL[1]); put(x, y + 1, EL[1]); put(x + 2 * d, y, EL[1]); put(x - d, y, EL[1]);
    const w = f12 & 1; put(x - 2 * d, y - w, EL[2]); put(x - 3 * d, y + w, EL[3]); if (k === 2) { put(x + d, y - 1, EL[1]); put(x + d, y + 1, EL[2]); }
    return true;
  }

  return {
    name: '小鬼', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.tine, M.tineHot, M.eye, M.hornG], HIT_POINT: [0, -ALT - 10], EVENTS,
    SFX: { body: 'flesh', how: 'explode', pal: 'shadow', style: 'summon', w: 0.2, hover: 1 },
    REVIVE: { dy: -ALT - 10, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
