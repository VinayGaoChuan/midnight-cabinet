// 货郎（奇遇 G019「货郎」的摊主 · NPC）：夜市里摆葫芦摊的街头骗子——又高又瘦、头大、两条细长胳膊折在胸前搓手（七分袖、肘上打补丁）；
// 识别：一顶扁平超宽的草笠（21 格宽、6 行高的直边矮锥，红顶钮、前檐垂一颗金珠红流苏）、背上 45° 斜挎的竹扁担（上端系一个蓝印花布小包袱）、
// 咧到耳根的露牙奸笑（一颗金牙），眼珠贼溜溜地左右转。
// 攻击 = 单手举到脸前、往前下方一巴掌拍平（洗葫芦时每换一次拍一下）；
// 技能 = 揭晓（葫芦里卖的什么药）：从腰后抽出折扇、在手里转一圈、一甩打开挡在嘴前 → 猛地一扇，金币和红纸屑炸开 → 啪地合扇、闭眼鞠躬。
// 受击 = 斗笠被打歪、奸笑变龇牙，再伸手把斗笠扶正；死亡 = 噗一团烟消失，烟卷成螺旋飘走，斗笠最后打着转飘落，和地上一枚铜钱一起消散。
PCD.define('GourdPeddler', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：金币（FXI.coin：白 → 奶油 → 金 → 暗金 → 棕）+ 红纸屑（自建 confetti：白 → 淡红 → 亮红 → 酒红 → 深酒红）─────
  // 待机的轮廓光 = 背景夜市红灯笼的暖光（固定在左上方，色阶 [47, 46, 45]）；技能里换成扇心金钱的 coin 光
  const R_EL = FXI.coin, EL = FXR[R_EL], DUST = FXR[FXI.dust];
  const R_CONF = E.fxRamp('confetti', [21, 58, 26, 13, 12]);
  const LANT = [47, 46, 45];

  // ───── 材质（parts.mats：名字D = 暗一级，后臂 / 远侧腿用）─────
  const TEAL = ['#10262a', '#1f4a4c', '#356e6a', '#5a9a8c'];               // 褪色青绿粗布
  const M = parts.mats(E, {
    jacket: { r: TEAL, band: 2 }, sleeve: TEAL, collar: 'bone', patch: 'leather', sash: 'gold',
    pants: 'stone', wrap: 'bone',
    skin: 'skinDark', hair: [0, 0, 27, 28], teeth: { r: 'white', flat: 1 }, eyeW: { r: [0, 18, 17, 21], flat: 1 }, ink: { r: 'ink', flat: 1 },
    tooth: { r: [20, 14, 14, 5], flat: 1 }, toothHot: { r: [20, 5, 5, 21], flat: 1 },   // 金牙（待机的发光体）
    straw: [20, 19, '#c8953f', '#ecc978'], cord: 'crimson', bead: 'gold',               // 草笠 / 帽绳 / 流苏金珠
    pole: 'sand', bundle: 'blue',                                                        // 竹扁担 / 蓝印花布包袱
    paper: [20, 6, 5, 21], rib: 'wood', edge: 'crimson',                                 // 折扇：纸面 / 竹骨 / 红扇边
    motif: { r: [20, 19, 14, 5], flat: 1 }, motifHot: { r: [14, 5, 21, 21], flat: 1 },   // 扇心方孔金钱（技能的发光体）
    coin: 'gold',
  });
  const BODY = { body: 'slim', leg: 11, torso: 10, head: 8, headW: 8, sw: 3, arm: 12, lw: 2, stride: 4, neck: 1, hunch: 0, headX: 0, fall: 'back' };
  const BOW_H = [0, 2, 3];                                                              // 鞠躬档 → 驼背量
  const HX = 72, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(62, 60, 28, 54);
  const RIMR_LAMP = [0, 58, 58, 58], RIMR_FAN = [0, 8, 16, 22], LAMP = [-30, -70];
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: RIMR_LAMP, rimRamp: LANT, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'teeth', 'eyeW', 'ink', 'tooth', 'toothHot', 'motif', 'motifHot', 'hair', 'rib', 'pole', 'coin', 'bead', 'edge']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const HAT_MATS = new Uint8Array(256); for (const k of ['straw', 'cord', 'bead']) { HAT_MATS[M[k]] = 1; HAT_MATS[M[k + 'D']] = 1; }
  HAT_MATS[M.coin] = 1; HAT_MATS[M.coinD] = 1;                                           // 地上的铜钱和斗笠一起最后消散

  // ───── 姿势：前手 hx/hy（右手：拍、扇、弹铜钱）；后手 bhx/bhy（搓手、叉腰、扶斗笠）─────
  const H_FIST = 0, H_RUB = 1, H_OPEN = 2, H_HOLD = 3, H_UP = 4;                          // 手势：拳 · 搓 · 平掌 · 握扇 · 张开
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, lift: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, look: 0, mouth: 0, hF: 0, hB: 0, fan: 0, fanA: 0, tilt: 0, hatX: 0, hatY: 0, hatK: 0, poleY: 0, bund: 0, bow: 0,
    coinK: 0, coinG: 0, flash: 0, dq: 0, dqb: 0, dqh: 0, dqa: 0, lying: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -18, 5, -17);                    // 两手在胸口搓（高过柜台），肘尖往下外支
  const K_WIND = K(8, -28, 5, -14, -1);                // 攻击预兆：手高高举到脸前、笠檐下，五指张开，身子后仰
  const K_SLAP = K(15, -15, 0, -13, 2, 0, 1);          // 出手：整条胳膊往前下方拍平（拍在柜台上的葫芦顶）
  const K_SLAPH = K(14, -14, 1, -13, 1, 0, 1);
  const K_DRAW = K(-2, -12, 5, -14);                   // 蓄力：手伸到腰后抽扇
  const K_TWIRL = K(9, -21, 4, -14);                   //       扇子在手里转一圈
  const K_FAN = K(4, -18, -4, -12, -1);                //       张开的扇子挡在嘴前，后手叉腰
  const K_COCK = K(4, -25, -4, -13, -1);               // 施放：扇子扬到左上方
  const K_SWEEP = K(13, -16, -7, -19, 2, 0, 1);        //       猛地往前下方一扇，后臂往后甩
  const K_SNAP = K(11, -17, -3, -13, 1);               // 收招：合扇
  const K_BOW = K(3, -17, -8, -15, 2);                 //       扇子竖在胸前、后臂往后一摆，鞠躬
  const K_HURT = K(4, -19, 2, -20, -1, -1);            // 受击：两手举起挡
  const K_FIX = K(6, -15, -5, -30, 0, 0);              //       后手伸上去扶斗笠
  const K_STAG = K(5, -26, 1, -25, -1, 0);             // 死亡：双手一扬
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -8, 24], ['hy', -36, 0], ['bhx', -12, 16], ['bhy', -36, 0], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 3], ['bob', 0, 1],
    ['bx', -4, 4], ['lift', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 2], ['look', 0, 1], ['mouth', 0, 4], ['hF', 0, 4], ['hB', 0, 4], ['fan', 0, 4], ['fanA', 0, 15], ['tilt', -2, 2], ['hatX', -3, 3], ['hatY', 0, 3],
    ['hatK', 0, 19], ['poleY', 0, 1], ['bund', -1, 1], ['bow', 0, 2], ['coinK', 0, 5], ['coinG', 0, 6], ['dqa', 0, 49], ['flash', 0, 1], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const RUB = [[0, 0, 0, 0], [1, -1, -1, 1]];          // 搓手两拍：[前手 dx, dy, 后手 dx, dy]
  // 待机个性（循环内第 18–23 帧，1.5–1.92 s）：拇指弹起一枚铜钱，接住的那一下咧嘴露金牙。[前手 x, y, 铜钱档]
  const FLIP = [[10, -15, 1], [11, -17, 2], [11, -17, 3], [11, -17, 4], [11, -16, 5], [8, -17, 0]];
  const T_SLAP = 2 / 12, T_OPEN = 0.5, T_WHOOSH = 1 / 12, T_GUST = 3 / 12, T_SNAP = 1 / 12, T_POOF = INCOMING + 0.3;
  // 死亡：斗笠飞走的路径（第 k 帧：[x, y, 整 90° 翻转档, 歪]）——先往上一弹、翻两个跟斗，再像树叶一样左右摇着飘下，落地晃两下停住
  const HAT_PATH = [null, [-2, -35, 0, -2], [-3, -36, 1, 0], [-4, -36, 2, 0], [-5, -35, 3, 0], [-5, -33, 0, 2], [-4, -31, 1, 0], [-3, -28, 2, 0], [-2, -25, 3, 0],
    [-1, -22, 0, 2], [0, -19, 0, -2], [0, -16, 0, 2], [-1, -13, 0, -2], [-2, -10, 0, 1], [-3, -6, 0, -1], [-3, -3, 0, 1], [-3, 0, 0, 0], [-3, 0, 0, 1], [-3, 0, 0, -1], [-3, 0, 0, 0]];
  const HAT_N = HAT_PATH.length - 1, HAT_LAND = 16, T_HATLAND = T_POOF + (HAT_LAND - 1) / 12;
  const FRAD = [0, 6, 7, 7, 8], SPREAD = [0, 0, 0.44, 0.87, 1.31];                   // 折扇各档：半径、半张角（25° / 50° / 75°）
  const TOOTH = [0, 6, 5, 0, 0];                                                        // 金牙在第几列（按嘴型）

  function idle(tq, TT) {
    setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
    const lp = tq % DUR[IDLE], f = f12of(lp), rb = RUB[(f >> 1) & 1];
    P.hF = H_RUB; P.hB = H_RUB; P.mouth = 1; P.rim = 1;
    P.hx += rb[0]; P.hy += rb[1]; P.bhx += rb[2]; P.bhy += rb[3];                         // 搓手
    if ((f >= 6 && f <= 8) || (f >= 11 && f <= 13)) P.look = 1;                           // 眼珠往后一瞟、再瞟一次（第二次连头也转过去）
    if (f >= 11 && f <= 13) P.head = -1;
    if (f >= 18 && f <= 23) { const c = FLIP[f - 18]; P.hx = c[0]; P.hy = c[1]; P.coinK = c[2]; P.hF = H_FIST; P.bhx = K_IDLE.bhx; P.bhy = K_IDLE.bhy; P.hB = H_RUB; }
    if (f >= 23 && f <= 26) { P.mouth = 2; P.eyes = 2; P.glint = f === 23 || f === 24 ? 1 : 0; }   // 接住铜钱：咧嘴大笑、眯眼、金牙一闪
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, f = f12of(tq);
    P.st = st; P.bx = 0; P.lift = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.look = 0; P.mouth = 1;
    P.hF = H_RUB; P.hB = H_RUB; P.fan = 0; P.fanA = 0; P.tilt = 0; P.hatX = 0; P.hatY = 0; P.hatK = 0; P.poleY = 0; P.bund = 0; P.bow = 0; P.coinK = 0; P.coinG = 0;
    P.flash = 0; P.dq = 0; P.dqb = 0; P.dqh = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.lying = 0;
    if (st === IDLE) idle(tq, TT);
    else if (st === MOVE) {                                                              // 一蹦一跳：接触帧下沉、经过帧整个人离地 1 格；扁担慢半拍、包袱晃
      setK(K_IDLE, K_IDLE, 0); const g = gait(tq); parts.gait(P, g); const s = P.step;
      P.hx = 4 - 4 * s; P.hy = -12 + s; P.bhx = 2 + 5 * s; P.bhy = -12 - s; P.hF = H_FIST; P.hB = H_FIST;
      P.lift = P.wup ? 1 : 0; P.poleY = P.wup ? 1 : 0; P.bund = [-1, 0, 1, 0][g]; P.head = g === 1 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                          // 一巴掌：抡到耳边 → 往前下方拍平 → 收回
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.hF = f >= 1 ? H_UP : H_RUB; P.beard = 1; P.bund = -1; }
      else if (tq < 0.2) { setK(K_SLAP, K_SLAP, 0); P.bx = 2; P.hF = H_OPEN; P.beard = -2; P.sway = -1; P.mouth = 2; P.eyes = 2; P.bund = 1; P.hB = H_FIST; }
      else if (tq < 0.45) { setK(K_SLAP, K_SLAPH, ease.out((tq - 0.2) / 0.25)); P.bx = 1; P.hF = H_OPEN; P.beard = -1; P.mouth = 2; P.hB = H_FIST; }
      else { setK(K_SLAPH, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.hF = tq < 0.6 ? H_OPEN : H_RUB; }
    } else if (st === CHARGE) {                                                          // 抽扇 → 转一圈 → 一甩张开挡在嘴前 → 扇着、发抖
      if (f < 2) { setK(K_IDLE, K_DRAW, f / 2); P.hF = H_FIST; }
      else if (f < 6) { setK(K_DRAW, K_TWIRL, (f - 2) / 4); P.fan = 1; P.fanA = [8, 12, 0, 4][f - 2]; P.hF = H_HOLD; P.look = f & 1; }
      else if (f < 8) { setK(K_TWIRL, K_FAN, (f - 5) / 3); P.fan = f === 6 ? 2 : 3; P.fanA = 2; P.hF = H_HOLD; P.gem = 1; P.rim = 2; P.hB = H_FIST; }
      else {
        setK(K_FAN, K_FAN, 0); P.fan = 4; P.fanA = (f >> 1) & 1; P.hF = H_HOLD; P.hB = H_FIST; P.rim = 2;
        P.gem = tq < 0.9 ? 1 : ((f & 1) ? 2 : 1); P.look = tq < 0.9 ? ((f >> 2) & 1) : 0; P.mouth = 2;
        if (tq >= 1.1) { P.eyes = 2; P.hx += (f & 1) ? 1 : -1; P.fanA = 0; P.beard = (f & 1) ? -1 : 0; }
      }
      if (f >= 6) { P.beard = P.beard || -1; P.sway = -1; }
    } else if (st === CAST) {                                                            // 扬扇 1 帧 → 猛地一扇
      if (f === 0) { setK(K_COCK, K_COCK, 0); P.fanA = 14; P.beard = 1; }
      else { setK(K_SWEEP, K_SWEEP, 0); P.fanA = f < 4 ? 5 : 4; P.beard = -2; P.sway = -1; P.bund = 1; }
      P.fan = 4; P.hF = H_HOLD; P.hB = H_OPEN; P.gem = 3; P.rim = 3; P.mouth = 2; P.eyes = 2; P.glint = f >= 1 && f <= 2 ? 1 : 0;
    } else if (st === RECOVER) {                                                         // 啪地合扇 → 闭眼鞠躬 → 直起身插回腰带
      if (f === 0) { setK(K_SNAP, K_SNAP, 0); P.fan = 3; P.fanA = 4; P.gem = 2; P.rim = 2; P.mouth = 2; P.eyes = 2; }
      else if (f === 1) { setK(K_SNAP, K_SNAP, 0); P.fan = 1; P.fanA = 3; P.gem = 0; P.mouth = 2; P.eyes = 2; }
      else if (tq < 0.5) {
        const q = ease.out(clamp01((tq - 2 / 12) / 0.17)); setK(K_SNAP, K_BOW, q); P.bow = q < 0.5 ? 1 : 2; P.fan = 1; P.fanA = 0;
        P.eyes = 1; P.mouth = 1; P.tilt = P.bow === 2 ? 1 : 0; P.hB = H_OPEN; P.beard = 1;
      } else {
        const q = ease.inOut(clamp01((tq - 0.5) / 0.17)); setK(K_BOW, K_IDLE, q); P.bow = q < 0.5 ? 1 : 0; P.fan = q < 0.5 ? 1 : 0; P.fanA = 0;
        P.hF = q < 0.5 ? H_HOLD : H_RUB; P.hB = q < 0.5 ? H_OPEN : H_RUB;
      }
      if (f >= 2 && P.fan) P.hF = H_HOLD;
    } else if (st === HURT) {                                                            // 斗笠被打歪、龇牙 → 眼珠往回瞟 → 伸手扶正
      const h = tq - INCOMING;
      if (h < 0) idle(tq, TT);
      else if (h < 1 / 12) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.mouth = 3; P.tilt = -2; P.hatX = -2; P.hatY = 2; P.beard = 2; P.sway = 1; P.flash = 1; P.rim = 0; P.hF = P.hB = H_UP; P.bund = 1; }
      else if (h < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = h < 0.17 ? -2 : -1; P.look = 1; P.mouth = 3; P.tilt = -2; P.hatX = -2; P.hatY = 1; P.beard = 1; P.hF = P.hB = H_UP; P.bund = 1; }
      else if (h < 0.42) { setK(K_FIX, K_FIX, 0); P.bx = h < 0.34 ? -1 : 0; P.mouth = 0; P.tilt = h < 0.34 ? -1 : 0; P.hatX = h < 0.34 ? -1 : 0; P.hB = H_OPEN; P.hF = H_RUB; P.look = 0; }
      else { setK(K_FIX, K_IDLE, ease.inOut(clamp01((h - 0.42) / 0.08))); P.hB = H_RUB; }
    } else if (st === DEATH) {                                                           // 噗：一团烟消失，斗笠打着转飘落
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, TT);
      else if (d < 1 / 12) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.mouth = 3; P.tilt = -2; P.hatX = -2; P.hatY = 2; P.beard = 2; P.sway = 1; P.flash = 1; P.hF = P.hB = H_UP; P.bund = 1; }
      else {
        setK(K_STAG, K_STAG, 0); P.bx = -2; P.crouch = d < 0.17 ? 0 : 1; P.mouth = 4; P.look = 1; P.tilt = -2; P.hatX = -2; P.hatY = 3; P.beard = 2; P.hF = P.hB = H_UP; P.bund = 1;
        if (d >= 0.3) {
          const k = f12of(d - 0.3);                                                      // 噗之后的第几帧
          P.hatK = CL(k + 1, 1, HAT_N); P.dqb = Math.min(1, (k + 1) / 3);
          P.coinG = k < 2 ? 0 : k < 4 ? k - 1 : k < 15 ? 3 + ((k - 4) & 3) : 7;          // 铜钱：落下 → 打转 → 躺平
          if (P.coinG === 7) P.coinG = 6;
          if (d >= 1.85) P.dqh = clamp01((d - 1.85) / 0.5);
        }
      }
    } else if (st === REVIVE) {
      idle(tq, TT); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    // 发光体：张开的扇子 → 扇心金钱；否则 → 金牙；斗笠飞走之后 → 斗笠
    BODY.hunch = BOW_H[P.bow]; BODY.neck = P.bow >= 2 ? 0 : 1; BODY.headX = P.bow >= 2 ? 1 : 0;
    if (P.fan >= 2) { const a = P.fanA * Math.PI / 8, r = FRAD[P.fan] - 3; P.gx = P.hx + RD(Math.sin(a) * r) + P.bx; P.gy = P.hy - RD(Math.cos(a) * r) - P.lift; }
    else if (P.hatK) { const h = HAT_PATH[P.hatK]; P.gx = h[0] + P.bx; P.gy = h[1] - 2; }
    else { const R = parts.rig(P, BODY); P.gx = R.hx0 + (TOOTH[P.mouth] || 5) + P.bx; P.gy = R.htop + 5 - P.lift; }
    P.dqa = st === DEATH ? (P.dqh > 0 ? 25 + RD(P.dqh * 24) : RD(P.dqb * 24)) : RD(P.dq * 24);
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 小工具：沿路径盖 2×2（细前臂）
  function sweep2(T, x0, y0, x1, y1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; parts.rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, t); } }

  // 候选部件：carryPole —— 竹扁担（2 格粗、每 5 格一道竹节），45° 斜挎在背上：从后肩往左上方伸出、越过笠檐左端，上端系 bundle
  function carryPole(R) {
    E.part(); const ox = R.sBx - 1, oy = R.yS + 1 + P.poleY;
    parts.bar(14, ox, oy, -4, 13, 2, (k, j, X, Y) => px(E, R, X, Y, M.pole, (((k % 5) + 5) % 5) === 0 ? 2 : 0));
    const tip = parts.cell(14, ox, oy, 13); bundle(R, tip[0], tip[1]);
  }
  // 候选部件：bundle —— 蓝印花布小包袱：布结两只耳朵 + 结 + 往后下垂的布包（下半截随 bund 晃）+ 白点花纹
  const BUN = [[-3, 1], [-4, 1], [-4, 1], [-4, 0], [-3, -1]];
  function bundle(R, tx, ty) {
    E.part(); const m = M.bundle, s = P.bund, D = M.eyeW;
    px(E, R, tx - 1, ty - 3, m, 4); px(E, R, tx + 1, ty - 3, m, 3); run(E, R, ty - 2, tx - 1, tx + 1, m, 0);   // 布结两只耳朵 + 结
    for (let j = 0; j < 5; j++) { const o = j >= 2 ? s : 0; run(E, R, ty - 1 + j, tx + BUN[j][0] + o, tx + BUN[j][1] + o, m, 0); }
    px(E, R, tx - 2, ty, D, 3); px(E, R, tx, ty + 1, D, 3); px(E, R, tx - 3 + s, ty + 2, D, 3); px(E, R, tx - 1 + s, ty + 3, D, 3);   // 白点
  }
  // 候选部件：longArm —— 细长胳膊：两段 IK（肘尖往外支）；七分袖（上臂 3 格宽、前臂前 40% 2 格宽）+ 肘部补丁 + 卷起的浅色袖口 + 露出的 2 格细前臂
  function longArm(R, B, hx, hy) {
    const sx0 = B ? R.sBx : R.sFx, sy0 = B ? R.sBy : R.sFy; let sx = sx0, sy = sy0;
    { const qx = hx - sx0, qy = hy - sy0, q = Math.hypot(qx, qy), reach = R.arm - 0.5; if (q > reach) { const k = (q - reach) / q; sx = sx0 + qx * k; sy = sy0 + qy * k; } }
    const L1 = R.arm * 0.5, dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1; let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < R.arm - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    E.part(); const sl = B ? M.sleeveD : M.sleeve, sk = B ? M.skinD : M.skin, pt = B ? M.patchD : M.patch;
    parts.sweep(E, R, sx, sy, ex, ey, 1, 0.9, sl, 0);
    const fx = ex + (hx - ex) * 0.4, fy = ey + (hy - ey) * 0.4, ul = Math.hypot(hx - ex, hy - ey) || 1, wx = hx - (hx - ex) / ul * 1.2, wy = hy - (hy - ey) / ul * 1.2;
    parts.sweep(E, R, ex, ey, fx, fy, 0.9, 0.9, sl, 0);
    sweep2(R, fx, fy, wx, wy, sk, 0);
    parts.brush(E, R, fx, fy, 0.9, sl, 4);                                                 // 卷起的袖口
    px(E, R, ex - 1, ey - 1, pt, 4); px(E, R, ex, ey - 1, pt, 3); px(E, R, ex - 1, ey, pt, 3); px(E, R, ex, ey, pt, 2);   // 肘部补丁（左上一针亮线）
    return { ex, ey };
  }
  // 候选部件：nimbleHand —— 比标准 2×2 手多出手指格：拳 · 搓（3×2 + 指尖）· 平掌（五指朝前拍平）· 握扇（拇指压在扇钉上）· 张开（三指叉开朝上）
  function nimbleHand(R, x, y, st, B) {
    E.part(); const m = B ? M.skinD : M.skin; x = RD(x); y = RD(y); const H = (dx, dy, t) => px(E, R, x + dx, y + dy, m, t);
    if (st === H_OPEN) { H(-1, -1, 4); H(0, -1, 0); H(-1, 0, 0); H(0, 0, 0); H(1, -1, 4); H(2, -1, 3); H(1, 0, 0); H(2, 0, 0); H(3, 0, 3); H(-1, -2, 4); }
    else if (st === H_UP) { H(-1, -1, 0); H(0, -1, 0); H(-1, 0, 0); H(0, 0, 0); H(-2, -2, 4); H(0, -2, 3); H(0, -3, 4); H(2, -2, 3); H(1, -2, 0); H(-1, -2, 0); }
    else if (st === H_RUB) { H(-1, -1, 4); H(0, -1, 0); H(1, -1, 0); H(-1, 0, 0); H(0, 0, 0); H(1, 0, 2); H(2, -1, 3); }
    else if (st === H_HOLD) { H(-1, -1, 0); H(0, -1, 0); H(-1, 0, 0); H(0, 0, 0); H(0, -2, 4); }
    else { H(-1, -1, 4); H(0, -1, 0); H(-1, 0, 0); H(0, 0, 0); }
  }
  // 候选部件：peddlerHead —— 8×8 的四分之三侧脸（x0..x0+7，前沿 = 第 7 列）：两只 2 格眼（眼白 + 瞳仁，瞳仁换位 = 眼珠左右转，上眼皮压一格暗 = 贼眼）、
  //   2 行长尖鼻（第 8–9 列，鼻尖朝前下）、耳、脑后鬓发、脖子；嘴 5 档（MOUTH）。帽绳不画在脸上，脸上只有表情
  const HEAD_ROWS = [[1, 6], [0, 7], [0, 7], [0, 7], [0, 7], [1, 7], [2, 7], [3, 6]];
  // 嘴型：[列, 行, 种类]  K 墨线 · T 牙 · G 金牙 · D 暗肤（酒窝 / 上唇）
  const MOUTH = [
    [[5, 5, 'K'], [6, 5, 'K'], [7, 5, 'K'], [8, 4, 'K'], [4, 5, 'D']],                                                                              // 0 抿嘴奸笑（前嘴角上翘）
    [[2, 3, 'K'], [3, 4, 'K'], [4, 4, 'K'], [5, 4, 'K'], [6, 4, 'K'], [7, 4, 'K'], [8, 4, 'K'], [3, 5, 'K'], [4, 5, 'T'], [5, 5, 'T'], [6, 5, 'G'], [7, 5, 'T'], [4, 6, 'K'], [5, 6, 'K'], [6, 6, 'K'], [7, 6, 'D']],   // 1 咧到耳根的露牙笑
    [[2, 3, 'K'], [3, 4, 'K'], [4, 4, 'K'], [5, 4, 'K'], [6, 4, 'K'], [7, 4, 'K'], [8, 4, 'K'], [8, 3, 'K'], [3, 5, 'K'], [4, 5, 'T'], [5, 5, 'G'], [6, 5, 'T'], [7, 5, 'T'],
      [3, 6, 'K'], [4, 6, 'K'], [5, 6, 'T'], [6, 6, 'T'], [7, 6, 'T'], [4, 7, 'K'], [5, 7, 'K'], [6, 7, 'K']],                                    // 2 张嘴大笑：两排牙 + 金牙
    [[4, 4, 'K'], [5, 4, 'K'], [6, 4, 'K'], [7, 4, 'K'], [3, 5, 'K'], [4, 5, 'T'], [5, 5, 'K'], [6, 5, 'T'], [7, 5, 'T'], [2, 6, 'K'], [3, 6, 'K'], [4, 6, 'K'], [5, 6, 'K'], [6, 6, 'K'], [7, 6, 'K'], [8, 5, 'K']],   // 3 龇牙（牙缝、嘴角下撇）
    [[5, 4, 'D'], [6, 4, 'D'], [5, 5, 'K'], [6, 5, 'K'], [5, 6, 'K'], [6, 6, 'K']],                                                                  // 4 受惊的 O 嘴
  ];
  function peddlerHead(R) {
    E.part(); const x0 = R.hx0, top = R.htop, S = M.skin, F = (c, r, m, t) => px(E, R, x0 + c, top + r, m, t);
    for (let r = 0; r < 8; r++) run(E, R, top + r, x0 + HEAD_ROWS[r][0], x0 + HEAD_ROWS[r][1], S, 0);
    run(E, R, top + 8, x0 + 2, x0 + 4, S, 2);                                              // 脖子
    for (let r = 1; r <= 4; r++) F(0, r, M.hair, r === 1 ? 3 : 0); F(1, 1, M.hair, 2);   // 脑后鬓发
    F(1, 3, S, 2); F(2, 4, S, 2);                                                           // 耳
    F(8, 2, S, 4); F(8, 3, S, 3); F(9, 3, S, 2);                                            // 长尖鼻
    F(2, 2, S, 4);                                                                          // 颧骨受光
    if (P.eyes === 0) {
      const bk = P.look === 1;
      F(3, 2, bk ? M.ink : M.eyeW, 3); F(4, 2, bk ? M.eyeW : M.ink, 3);
      F(6, 2, bk ? M.ink : M.eyeW, 3); F(7, 2, bk ? M.eyeW : M.ink, 3);
      F(3, 1, S, 2); F(4, 1, S, 2); F(6, 1, S, 2); F(7, 1, S, 2);                           // 上眼皮
    } else if (P.eyes === 1) { F(3, 2, S, 1); F(4, 2, S, 1); F(6, 2, S, 1); F(7, 2, S, 1); F(4, 1, S, 2); F(6, 1, S, 2); }   // 闭眼（挤成一条）
    else { F(3, 2, S, 1); F(4, 2, S, 1); F(6, 2, S, 1); F(7, 2, S, 1); F(3, 1, S, 4); F(4, 3, S, 4); F(3, 3, S, 4); }      // 眯眼笑：眼成一线、颧骨鼓起
    for (const [c, r, k] of MOUTH[P.mouth]) {
      if (k === 'K') F(c, r, S, 1); else if (k === 'T') F(c, r, M.teeth, 3); else if (k === 'D') F(c, r, S, 2);
      else F(c, r, P.glint ? M.toothHot : M.tooth, 3);
    }
  }
  // 候选部件：jacket 细节（和短褂同一个部件，材质之间是自动明暗的边，不是分界线）：交领白衬、背上补丁、芥黄腰带 2 行 + 前面的结 + 两条带尾（随 sway 摆）、
  //   腰后斜插一把合拢的折扇（技能抽出来之后就没了）
  function jacketDetail(R, tor) {
    const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, hem = tor.hem, Lx = (y) => LL[CL(y, y0, hem) - y0], Rx = (y) => RR[CL(y, y0, hem) - y0], yW = R.yWaist;
    px(E, R, Rx(y0) - 1, y0, M.collar, 4); px(E, R, Rx(y0) - 2, y0, M.collar, 3); px(E, R, Rx(y0 + 1) - 1, y0 + 1, M.collar, 3);   // 交领露出的白衬
    parts.line(E, R, Rx(y0) - 3, y0, Rx(y0 + 4), y0 + 4, M.jacket, 4);                     // 斜襟
    const bx = Lx(y0 + 4) + 1; px(E, R, bx, y0 + 4, M.patch, 4); px(E, R, bx + 1, y0 + 4, M.patch, 3); px(E, R, bx, y0 + 5, M.patch, 3); px(E, R, bx + 1, y0 + 5, M.patch, 2);   // 背上补丁
    for (let y = yW; y <= yW + 1; y++) run(E, R, y, Lx(y), Rx(y), M.sash, 0);
    const kx = Rx(yW) - 1, s = P.sway;
    px(E, R, kx, yW, M.sash, 4); px(E, R, kx + 1, yW, M.sash, 3); px(E, R, kx + 1, yW + 1, M.sash, 2);                          // 腰带结
    for (let k = 0; k < 4; k++) { px(E, R, kx + 1 + RD(s * (k + 1) / 4), yW + 2 + k, M.sash, (k & 1) ? 2 : 3); if (k < 3) px(E, R, kx + RD(s * (k + 1) / 3), yW + 2 + k, M.sash, (k & 1) ? 3 : 2); }   // 两条带尾
    if (!P.fan) { const x = Lx(yW) + 1; for (let k = 0; k < 6; k++) px(E, R, x - (k >> 1), yW + 1 - k, k >= 5 ? M.edge : (k & 1) ? M.paper : M.rib, k >= 5 ? 3 : 0); }   // 腰后插着的折扇
  }
  // 候选部件：flatKasa —— 扁平宽檐草笠（笠本地坐标：u = 0 笠心，v = 0 帽檐那一行）：6 行直边矮锥（每行收 2 格），半宽 10 / 8 / 6 / 4 / 2 / 0，檐两端下垂 1 格；
  //   从笠顶往外 4 道放射草编纹（暗一级）、左坡亮边、红顶钮；tilt 歪（整顶按列错位，前沿往下为正）；T 是落笔变换（戴着 / 飞走翻转）
  const KW = [10, 8, 6, 4, 2, 0];
  function flatKasa(T, tilt, landed) {
    E.part(); const m = M.straw, V = (u, v) => v + RD(tilt * u / 10);
    for (let k = 0; k < 6; k++) { const w = KW[k]; for (let u = -w; u <= w; u++) px(E, T, u, V(u, -k), m, 0); }
    px(E, T, -10, V(-10, 1), m, 0); px(E, T, 10, V(10, 1), m, 0);                          // 檐两端下垂
    for (const s of [-7, -3, 3, 7]) for (let k = 0; k < 4; k++) { const u = RD(s * (5 - k) / 5); px(E, T, u, V(u, -k), m, 2); }   // 放射草编纹
    for (let k = 1; k <= 4; k++) px(E, T, -KW[k] + 1, V(-KW[k] + 1, -k), m, 4);            // 受光的左坡一道亮边
    px(E, T, 0, V(0, -6), M.cord, 3); px(E, T, 0, V(0, -5), M.cord, 0);                    // 红顶钮
    // 流苏：帽檐前端垂一颗金珠 + 3 格红穗（随 beard 摆）；落在地上时横躺
    E.part();
    if (landed) { px(E, T, 11, 0, M.bead, 4); px(E, T, 12, 0, M.cord, 3); px(E, T, 13, 0, M.cord, 2); return; }
    const sw = CL(RD(-P.beard * 0.6), -2, 2), b0 = V(10, 2);
    px(E, T, 10, b0, M.bead, 4);
    for (let j = 1; j <= 3; j++) { const o = RD(sw * j / 3); px(E, T, 10 + o, b0 + j, M.cord, j === 1 ? 4 : 3); if (j === 3) px(E, T, 11 + o, b0 + j, M.cord, 2); }
  }
  // 候选部件：paperFan —— 折扇，扇钉在手里：open 1 合拢（2 格宽扇骨，1:2 / 45° 吸附）；2–4 张开：按扇形逐格栅格化（半径 7–8，半张角 25° / 50° / 75°），
  //   外圈一格红扇边、扇钉附近一圈竹扇骨、中间扇面按褶子一亮一暗，扇心一枚方孔金钱（发光体，5 档）；dir 0–15（22.5° 一档，0 朝上、顺时针）
  const MOTIF = [[0, 3], [0, 4], [1, 3], [1, 4], [0, 2]];
  function paperFan(R, x, y, open, dir, lv) {
    E.part(); x = RD(x); y = RD(y);
    if (open <= 1) { parts.bar(dir, x, y, 0, 6, 2, (k, j, X, Y) => px(E, R, X, Y, k >= 6 ? M.edge : j === 0 ? M.rib : M.paper, k >= 6 ? 3 : 0)); return; }
    const a = dir * Math.PI / 8, half = SPREAD[open], Rr = FRAD[open];
    for (let dy = -Rr; dy <= Rr; dy++) for (let dx = -Rr; dx <= Rr; dx++) {
      const r = Math.hypot(dx, dy); if (r > Rr + 0.35 || r < 0.5) continue;
      let rel = Math.atan2(dx, -dy) - a; rel = ((rel + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      if (Math.abs(rel) > half + 0.1) continue;
      if (r > Rr - 0.8) px(E, R, x + dx, y + dy, M.edge, 0);
      else if (r < 2.6) px(E, R, x + dx, y + dy, M.rib, 0);
      else px(E, R, x + dx, y + dy, M.paper, (Math.floor((rel + half + 0.1) / 0.24) & 1) ? 3 : 4);
    }
    const cx = x + RD(Math.sin(a) * (Rr - 3)), cy = y - RD(Math.cos(a) * (Rr - 3)), g = MOTIF[lv], mm = g[0] ? M.motifHot : M.motif, t = g[1];
    for (const [ddx, ddy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) px(E, R, cx + ddx, cy + ddy, mm, ddx < 0 && ddy < 0 ? Math.min(4, t + 1) : t);
    px(E, R, cx, cy, mm, lv === 3 ? 4 : 1);                                                  // 方孔（施放时烧成白）
    px(E, R, x, y, M.motif, 4);                                                             // 扇钉
  }
  // 候选部件：flipCoin —— 拇指弹起的铜钱：正面 3×3（中间方孔）/ 侧面 3×1，按档位在手上方
  const COIN = [null, [0, -2, 1], [0, -5, 0], [0, -8, 1], [0, -7, 0], [0, -4, 1]];
  function flipCoin(R, hx, hy, k) {
    E.part(); const c = COIN[k], x = hx + c[0], y = hy + c[1];
    if (c[2]) { run(E, R, y - 1, x - 1, x + 1, M.coin, 0); run(E, R, y, x - 1, x + 1, M.coin, 0); run(E, R, y + 1, x - 1, x + 1, M.coin, 0); px(E, R, x, y, M.coin, 1); px(E, R, x - 1, y - 1, M.coin, 4); }
    else run(E, R, y, x - 1, x + 1, M.coin, 3);
  }
  // 候选部件：groundCoin —— 死后掉在地上的铜钱（精灵本地坐标，不跟身体）：1–2 落下 · 3–5 立着打转（正 / 半 / 侧）· 6 躺平
  function groundCoin(g) {
    E.part(); const F = parts.FREE, x = 6, C = M.coin;
    if (g <= 2) { const y = g === 1 ? -7 : -3; run(E, F, y - 1, x - 1, x + 1, C, 0); run(E, F, y, x - 1, x + 1, C, 0); run(E, F, y + 1, x - 1, x + 1, C, 0); px(E, F, x, y, C, 1); return; }
    if (g === 3) { for (let y = -2; y <= 0; y++) run(E, F, y, x - 1, x + 1, C, 0); px(E, F, x, -1, C, 1); px(E, F, x - 1, -2, C, 4); }
    else if (g === 4) { for (let y = -2; y <= 0; y++) run(E, F, y, x, x + 1, C, 0); px(E, F, x, -2, C, 4); }
    else if (g === 5) { for (let y = -2; y <= 0; y++) px(E, F, x, y, C, 3); }
    else { run(E, F, 0, x - 1, x + 1, C, 3); px(E, F, x - 1, 0, C, 4); }
  }

  const HF = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    BODY.hunch = BOW_H[P.bow]; BODY.neck = P.bow >= 2 ? 0 : 1; BODY.headX = P.bow >= 2 ? 1 : 0;
    const R = parts.rig(P, BODY), gone = P.st === DEATH && P.dqb >= 1;
    if (!gone) {
      carryPole(R);
      longArm(R, 1, P.bhx, P.bhy); nimbleHand(R, P.bhx, P.bhy, P.hB, 1);
      parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.wrap, bootD: M.wrapD, bootH: 4 });
      const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.jacket, hem: R.yHip + 2, flare: 1 });
      jacketDetail(R, tor);
      peddlerHead(R);
    }
    if (P.hatK) { const h = HAT_PATH[P.hatK]; HF.r0 = h[2]; HF.tx = h[0]; HF.ty = h[1]; HF.rot = 0; HF.ox = 0; HF.oy = 0; flatKasa(HF, h[3], P.hatK >= HAT_LAND); }
    else { HF.r0 = 0; HF.tx = R.hx + 1 + P.hatX; HF.ty = R.htop - 1 - P.hatY; HF.rot = R.rot; HF.ox = R.ox; HF.oy = R.oy; flatKasa(HF, P.tilt, 0); }
    if (!gone) {
      longArm(R, 0, P.hx, P.hy);
      if (P.fan) paperFan(R, P.hx, P.hy, P.fan, P.fanA, P.gem);
      nimbleHand(R, P.hx, P.hy, P.hF, 0);
      if (P.coinK) flipCoin(R, P.hx, P.hy, P.coinK);
    }
    if (P.coinG) groundCoin(P.coinG);
  }
  // 噗的消失：身体按抖动一下子散掉（不按高度），斗笠和地上的铜钱最后才散
  const MAT_AT = (s, i) => { const m = s.mat[i]; if (m) return m; const w = s.w; return (s.mat[i + w] || s.mat[i + 1] || s.mat[i - 1] || s.mat[i - w] || 0); };
  function dissolve(s, qb, qh) {
    const w = s.w, h = s.h, o = s.out;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] === 255) continue; const q = HAT_MATS[MAT_AT(s, i)] ? qh : qb; if (q > 0 && B8[(y & 7) * 8 + (x & 7)] < q) o[i] = 255; }
  }
  function bakeHero() {
    const fan = P.rim >= 2;
    RIM.rim = P.rim; RIM.rimRamp = fan ? EL : LANT; RIM.rimR = fan ? RIMR_FAN : RIMR_LAMP;
    RIM.rx = (fan ? P.gx : LAMP[0]) + hero.ox; RIM.ry = (fan ? P.gy : LAMP[1]) + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.dqb > 0 || P.dqh > 0) dissolve(hero, P.dqb, P.dqh);
  }

  // ───── 特效 ─────
  const NF = 14, FLX = new Float32Array(NF), FLT = new Float32Array(NF), FLS = new Uint8Array(NF);   // 扇出去的金币：落点、落地时刻、状态（0 飞 · 1 落地弹一下 · 2 完）
  let gustT = 9, gustX = 0, gustY = 0, castT = 9, poofT = 9, poofX = 0, glT = 9, chargeAcc = 0, confAcc = 0, soulAcc = 0, sparkAcc = 0, lastStep = 0, lastF = -1, landed = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);                                                    // 蓄力汇聚在扇心的金币外爆
    releaseOrbit(40, 90, 0.3, 0.7); ring(gx, gy, 1, R_EL); fx.cross(gx, gy, 6, R_EL, 0.25, 2); shake(0.28, 2); flash(0.05);
  }
  function confetti(x, y, n, vmin, vmax, up) {
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + Math.random() * 0.4, v = vmin + Math.random() * (vmax - vmin), gold = (i % 4) === 3;
      spawnX(K_BURST, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8 - up, 0.55 + Math.random() * 0.5, gold ? R_EL : R_CONF, { sz: (i % 3) === 0 ? 2 : 1, age0: 0.08 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SLAP) {                                                    // 拍：肩为圆心的拖影弧 + 掌下一小团尘 + 小十字
      fx.slash(wx(5), wy(-18), 11, 0.3, 1.8, R_EL, 0.17, 2, 2);
      const x = wx(P.hx + P.bx + 3), y = wy(P.hy);
      for (let i = 0; i < 6; i++) spawn(K_DUST, x - 1 + Math.random() * 3, y + 1, (Math.random() - 0.5) * 28, -6 - Math.random() * 10, 0.3 + Math.random() * 0.2, FXI.dust);
      fx.cross(x, y, 3, FXI.impact, 0.12); burst(x, y, 5, 25, 60, 0.12, 0.25, FXI.impact, 6);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.25 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
    if (s === CHARGE && t === T_OPEN) {                                                    // 一甩张开：扇心金十字 + 金火星
      const gx = wx(P.gx), gy = wy(P.gy); fx.cross(gx, gy, 4, R_EL, 0.2); burst(gx, gy, 6, 20, 50, 0.15, 0.35, R_EL, 8); sfx('swing', { kind: 'staff', w: 0.15 });
    }
    if (s === CAST && t === T_WHOOSH) {                                                    // 猛一扇：扇尖斩击弧 + 风线 + 金币喷出 + 红纸屑外爆
      const hx = wx(P.hx + P.bx), hy = wy(P.hy), a = P.fanA * Math.PI / 8, gx = hx + RD(Math.sin(a) * 10), gy = hy - RD(Math.cos(a) * 10), g = 230;   // 从扇口外沿喷出，扇面本身不被盖住
      fx.slash(hx, hy, 9, -0.9, 2.6, R_EL, 0.2, 2, 2); gustT = 0; gustX = gx + 3; gustY = gy; castT = 0; landed = 0;
      for (let i = 0; i < NF; i++) {
        const vx = -34 + 96 * (i / (NF - 1)) + (Math.random() - 0.5) * 10, vy = -(62 + Math.random() * 46), floor = HY - 1;
        const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (floor - gy))) / g; FLX[i] = gx + vx * tl; FLT[i] = tl; FLS[i] = 0;
        spawnX(K_PHYS, gx, gy, vx, vy, tl + 0.05, R_EL, { g, floor, sz: 2, age0: 0.05 });
      }
      confetti(gx, gy, 30, 30, 90, 30); burst(gx, gy, 12, 40, 100, 0.2, 0.45, R_EL, 16);
    }
    if (s === CAST && t === T_GUST) {                                                      // 风卷着金币打到目标
      const x = E.DUMMY_X - 2, y = HY - 16;
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 70, -40 - Math.random() * 50, 0.9, R_EL, { g: 260, floor: HY - 1, sz: (i & 1) + 1, age0: 0.05 });
      confetti(x, y, 14, 20, 60, 20); ring(x, y, 1, R_EL); fx.cross(x, y - 2, 6, R_EL, 0.3); burst(x, y, 16, 40, 110, 0.2, 0.5, R_EL, 12);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.4 });
    }
    if (s === RECOVER && t === T_SNAP) {                                                   // 啪地合扇：扇尖一颗小金十字 + 木头一声
      const a = 3 * Math.PI / 8, x = wx(P.hx + P.bx + RD(Math.sin(a) * 6)), y = wy(P.hy - RD(Math.cos(a) * 6));
      fx.cross(x, y, 3, R_EL, 0.15); burst(x, y, 4, 15, 40, 0.12, 0.25, R_EL, 4); sfx('hit', { mat: 'wood', w: 0.25 });
    }
    if (s === DEATH && t === T_POOF) {                                                     // 噗：一大团烟 + 烟尘外涌 + 几颗金火星
      poofT = 0; poofX = wx(P.bx);
      for (let i = 0; i < 30; i++) { const a = Math.random() * 6.2832, v = 14 + Math.random() * 34; spawnX(K_DUST, poofX + Math.cos(a) * 4, HY - 16 + Math.sin(a) * 8, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 8, 0.6 + Math.random() * 0.5, FXI.dust, { age0: 0.05 }); }
      for (let i = 0; i < 5; i++) spawn(K_EMBER, poofX - 6 + Math.random() * 12, HY - 26 + Math.random() * 16, Math.random() * 8 - 4, -8 - Math.random() * 8, 0.5 + Math.random() * 0.3, R_EL);
      shake(0.1, 1);
    }
    if (s === DEATH && t === T_HATLAND) {                                                  // 斗笠落地：一点尘
      const x = wx(HAT_PATH[HAT_LAND][0] + P.bx);
      for (let i = 0; i < 7; i++) spawn(K_DUST, x - 8 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 20, -3 - Math.random() * 5, 0.35, FXI.dust);
      sfx('fall', { w: 0.1 });
    }
  }
  const EVENTS = [[], [], [T_SLAP], [T_OPEN], [T_WHOOSH, T_GUST], [T_SNAP], [], [T_POOF, T_HATLAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.55) {                                                  // 金币螺旋汇聚到扇心、绕着转
      chargeAcc += dt * (16 + 30 * clamp01((stT - 0.55) / 0.85));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (castT < 3) {                                                                       // 扇出去的金币：落地一闪、弹一下
      castT += dt;
      for (let i = 0; i < NF; i++) {
        if (FLS[i] === 0 && castT >= FLT[i]) { FLS[i] = 1; spawnX(K_PHYS, FLX[i], HY - 1, (Math.random() - 0.5) * 8, -30, 0.26, R_EL, { g: 300, floor: HY - 1, age0: 0.05 }); burst(FLX[i], HY - 2, 3, 10, 25, 0.1, 0.2, R_EL, 6); if (!landed) { landed = 1; sfx('impact', { pal: 'coin', w: 0.2 }); } }
      }
      if (castT < 1.4 && castT > 0.2) {                                                    // 之后一阵红纸屑、金纸屑从上方左右飘落
        confAcc += dt * 28;
        while (confAcc >= 1) { confAcc -= 1; const gold = Math.random() < 0.28; spawnX(K_EMBER, HX - 22 + Math.random() * 56, HY - 50 + Math.random() * 14, (Math.random() - 0.5) * 6, 10 + Math.random() * 9, 1.0 + Math.random() * 0.6, gold ? R_EL : R_CONF, { age0: 0.12 }); }
      }
    }
    if (state === MOVE && P.step !== lastStep) {                                           // 轻快的步子：每步 1 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.2 }); spawn(K_DUST, wx(P.step > 0 ? 5 : -4) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.28, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {
      const f = f12of(q12(stT) % DUR[IDLE]);
      if (f !== lastF) {
        if (f === 20) spawn(K_EMBER, wx(P.hx + P.bx), wy(P.hy - 11), Math.random() * 6 - 3, -6, 0.35, R_EL);   // 铜钱最高点一颗金火星
        if (f === 23) glT = 0;
        lastF = f;
      }
      sparkAcc += dt * 0.9; while (sparkAcc >= 1) { sparkAcc -= 1; spawn(K_EMBER, wx(P.hx + P.bx) + RD(Math.random() * 2 - 1), wy(P.hy - 2), Math.random() * 6 - 3, -6 - Math.random() * 5, 0.45, R_EL); }   // 搓手搓出的金星
    }
    if (state === DEATH && stT > INCOMING + 1.85 && stT < INCOMING + 2.35) {                // 斗笠消散时飘起几颗金火星
      soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; const h = HAT_PATH[HAT_N]; spawn(K_RISE, wx(h[0] + P.bx) - 9 + Math.random() * 18, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, R_EL); }
    }
    gustT += dt; poofT += dt; glT += dt;
  }
  function fxReset() { gustT = 9; castT = 9; poofT = 9; glT = 9; chargeAcc = 0; confAcc = 0; soulAcc = 0; sparkAcc = 0; lastStep = 0; lastF = -1; landed = 0; FLS.fill(2); }
  function fxBack(f12) { if (P.rim >= 2 && P.fan >= 2) floorGlow(wx(P.gx), P.rim, EL, f12); }
  // 烟：7 个烟团（左上受光，奶白 → 灰，按寿命走 dust 色阶，最后按抖动散掉）+ 一条往左上方卷走的螺旋烟
  const BALLS = [[0, -17, 7], [-5, -9, 5], [5, -10, 5], [-2, -26, 5], [4, -23, 4], [-6, -19, 4], [2, -3, 4]];
  function smoke(f12) {
    const t = poofT, cx = poofX;
    if (t < 0.9) {
      const lv = t < 0.15 ? 0 : t < 0.35 ? 1 : t < 0.6 ? 2 : 3, cut = (t - 0.45) / 0.45;
      for (const [dx, dy, r] of BALLS) {
        const rr = r * (t < 0.1 ? 0.55 + t * 4.5 : 1 + (t - 0.1) * 0.3), bx = cx + dx - t * 6, by = HY + dy - t * 9, R = Math.ceil(rr);
        for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
          if (i * i + j * j > rr * rr + 0.3) continue; const X = RD(bx + i), Y = RD(by + j);
          if (cut > 0 && B8[(Y & 7) * 8 + (X & 7)] < cut) continue;
          const l = Math.hypot(i + rr * 0.4, j + rr * 0.4) / rr, e = Math.hypot(i, j) / rr;
          put(X, Y, DUST[Math.min(4, lv + (l < 0.6 ? 0 : e > 0.78 ? 2 : 1))]);
        }
      }
    }
    if (t > 0.12 && t < 1.5) {
      const q = (t - 0.12) / 1.38, ccx = cx - 4 - q * 24, ccy = HY - 22 - q * 18, N = 26;
      for (let k = 0; k < N; k++) {
        if (q > 0.55 && ((k + f12) & 1)) continue;
        const th = k * 0.45 - q * 3, rho = 0.8 + k * 0.3 * (1 + q * 0.5), X = RD(ccx + Math.cos(th) * rho + k * 0.35), Y = RD(ccy + Math.sin(th) * rho * 0.8 + k * 0.45);
        put(X, Y, DUST[CL(Math.floor(q * 3.2) + (k > 17 ? 1 : 0), 0, 4)]);
      }
    }
  }
  function fxFront(f12) {
    const gone = E.state === DEATH && P.dqb >= 1;
    if (!gone && P.fan >= 2 && P.gem >= 2 && P.gem <= 3) {                                 // 扇心星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (!gone && P.glint && P.fan < 2 && !P.hatK) {                                        // 金牙一闪
      const x = wx(P.gx), y = wy(P.gy) - 1; put(x + 1, y - 1, EL[0]); put(x + 2, y - 2, EL[1]); put(x + 1, y - 2, EL[2]); put(x + 2, y - 1, EL[2]); put(x + 3, y - 3, EL[2]);
    }
    if (gustT < 0.3) {                                                                     // 扇出去的三道风线，往前推、后半段断开
      const q = gustT / 0.3, len = RD(4 + q * 16);
      for (const [oy, o] of [[-4, 2], [0, 0], [4, 3]]) for (let k = 0; k < len; k++) { if (q > 0.5 && ((k + f12) % 3) === 0) continue; put(RD(gustX + o + q * 10 + k), gustY + oy + (k > len * 0.6 ? (oy > 0 ? 1 : oy < 0 ? -1 : 0) : 0), k > len - 3 ? EL[0] : k > len * 0.5 ? EL[1] : EL[2]); }
    }
    if (poofT < 1.5) smoke(f12);
  }

  return {
    name: '货郎', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.tooth, M.toothHot, M.motif, M.motifHot], HIT_POINT: [1, -18], EVENTS,
    // 音效：铜钱叮当 + 木头一声「哒」，重量 0.4；死亡是噗地消失（dissolve），斗笠落地发一声很轻的 fall
    SFX: { body: 'flesh', how: 'dissolve', pal: 'coin', style: 'coin', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
