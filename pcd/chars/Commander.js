// 指挥官 Commander（部队 · 不死 · 守护者 · 传说 · 近战 352）：食人魔穿上重甲，背上的锅改成了炮（由食人魔升级）。
// 巨型重甲：头小仍陷在两肩之间（沿用食人魔的倒三角）、全身黑铁板甲、肩甲巨大、短粗腿穿胫甲、微蹲，塔盾立在身前。
// 右肩扛一门「锅炮」：食人魔背上的铁锅铆上炮管和支架改成臼炮，炮口朝前上方、引信冒火星，高出头 5 格；
// 左肩（远侧）熊头肩甲 + 身后熊皮披风（食人魔的熊头兜帽挪到了肩上）；前手一面 18 格高的黑铁长方塔盾，盾心铆着那把平底锅；
// 开面宽边铁盔露出下颚两颗獠牙，胸甲三道金色指挥官横杠，灰紫尸肤。
// 攻击：盾砸地（双手举盾 1 帧 → 盾底猛砸地面，地裂冲向假人，带起尘浪，假人减速）。
// 技能：特性「炮弹休克」——单膝跪下、塔盾立地，锅炮仰起 30°，引信一格一格往炮身烧短；「嘭」一声炮口火光 + 浓黑烟团、整个人后坐 2 格，
//       炮弹沿抛物线落进假人处爆炸：火焰外爆、大冲击环、硝烟、焦痕，假人头顶转星、攻速变慢。死亡：散架（死亡套件 parts），锅炮落地引信最后「嗞」一下冒黑烟。
PCD.define('Commander', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run;

  // ───── 元素：炮弹休克 · 火药火（fire：白 21 → 金 47 → 橙 46 → 赤 45 → 焦红 44）；硝烟另用一条深灰色阶 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL], R_SMOKE = fxRamp('cannonSmoke', [18, 10, 9, 8, 0]);
  const ARMOR = ['#0c0c10', '#22232c', '#3c3e4a', '#62667a'], SKIN = ['#1e1622', '#3e3046', '#62526a', '#8c7c92'], FUR = ['#1e1814', '#423830', '#6a5c4c', '#94846c'];
  const M = parts.mats(E, {
    armor: ARMOR, plate: { r: ARMOR, band: 2 }, skin: SKIN, fur: FUR, cape: { r: FUR, band: 2 }, gold: 'gold', iron: 'iron', copper: 'leather',
    pan: 'steel', wood: 'wood', cord: [20, 19, 61, 62], belt: 'leather', tusk: 'bone', ink: { r: 'ink', flat: 1 },
    eye: { r: [20, 61, 62, 5], flat: 1 }, fuse: { r: [44, 45, 47, 21], flat: 1 },
  });
  // 体型：巨型改——腿缩短（短粗腿）、驼背 1、肩厚 6、四肢粗 1.6；头 7 行高（盔檐下留一行，眼睛不被压黑）
  const BODY = { body: 'giant', leg: 8, torso: 13, head: 7, headW: 6, sw: 6, hunch: 1, limb: 1.6, arm: 13, lw: 4, stride: 3, fall: 'front' };
  const R0 = parts.rig({}, BODY);
  const HX = 68, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 64, 38, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 17], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'fuse', 'wood', 'cord', 'tusk', 'skin', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（hx hy）握塔盾；后手（bhx bhy）；can 锅炮仰角档；fuse 引信剩余长度；fz 引信火档（0 暗 · 1 · 2 亮 · 3 爆闪 · 4 熄灭）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, can: 0, fuse: 3, fz: 0, tamp: 0, plant: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -11, -5, -9, 0, 0, 1);                       // 微蹲，塔盾立在身前
  const K_LIFT = K(9, -20, 7, -19, -1, -1, 0);                      // 双手把塔盾举高
  const K_SLAM = K(12, -9, 9, -12, 1, 1, 2);                        // 盾底猛砸地面（出手定格）
  const K_HOLD = K(12, -9, 8, -11, 1, 0, 2);
  const K_KNEEL = K(12, -9, -4, -8, 0, 0, 4);                       // 单膝跪下、塔盾立地架稳
  const K_HURT = K(8, -11, -6, -8, -1, -1, 1);
  const K_DOWN = K(11, -9, -5, -6, 1, 1, 4);                        // 死亡：跪倒
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15], ['st', 0, 8], ['plant', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['can', 0, 3], ['fuse', 0, 3], ['fz', 0, 4], ['tamp', 0, 2]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const CAN_A = [0.3, 0.4, 0.52, 0.62];                              // 锅炮仰角（弧度，从水平往上量）：待机 17° · 20° · 30° · 后坐 35°
  const T_SLAM = 2 / 12, T_BALL = 0.34, T_FALL = INCOMING + 0.58, T_KIT = INCOMING + 0.5, T_FIZZ = INCOMING + 1.05;

  function idle(tq, f12) {
    setK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.beard = SWAY_IDLE[(b + 1) & 3];
    P.fz = (f12 % 5) === 0 ? 1 : 0;                                 // 引信余火偶尔一亮
    const lp = tq % DUR[IDLE];                                       // 待机个性「检炮」：侧头看一眼锅炮，拳头往炮口里捣一下填药，引信火星一闪
    if (lp >= 1.5 - 1e-6 && lp < 2.25) {
      const k = f12of(lp - 1.5); P.head = -1;
      if (k >= 1 && k <= 6) { P.tamp = k === 3 || k === 5 ? 2 : 1; P.fz = k === 3 || k === 4 ? 3 : 1; }
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.can = 0; P.fuse = 3; P.fz = 0; P.tamp = 0; P.plant = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 重甲顿步：接触帧整个人顿一下
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.crouch = 1 + (f & 1 ? 0 : 1); P.bob = 0; P.hx += P.step; P.bhx -= P.step;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) setK(K_IDLE, K_IDLE, 0);
      else if (tq < T_SLAM - 1e-6) { setK(K_LIFT, K_LIFT, 0); P.beard = 1; P.can = 1; }
      else if (tq < 0.3) { setK(K_SLAM, K_SLAM, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.plant = 1; }
      else if (tq < 0.45) { setK(K_SLAM, K_HOLD, ease.out((tq - 0.3) / 0.15)); P.bx = 3; P.plant = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                      // 跪下架盾，锅炮仰起，引信一格一格烧短
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_KNEEL, q); P.plant = q > 0.5 ? 1 : 0;
      P.can = tq < 0.4 ? 1 : 2; P.fuse = tq < 0.6 ? 3 : tq < 0.9 ? 2 : tq < 1.2 ? 1 : 0; P.fz = tq < 0.5 ? 1 : ((f12 & 1) ? 2 : 1);
      P.rim = tq < 0.6 ? 1 : 2; P.beard = -1; if (tq > 1.1) P.sway = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {                                        // 嘭：后坐 2 格
      setK(K_KNEEL, K_KNEEL, 0); P.plant = 1; P.fuse = 0; P.bx = tq < 0.17 ? -2 : tq < 0.34 ? -1 : 0;
      P.can = tq < 0.25 ? 3 : 2; P.fz = tq < 0.17 ? 3 : 4; P.rim = tq < 0.17 ? 3 : 2; P.beard = 2; P.head = tq < 0.17 ? -1 : 0;
    } else if (st === RECOVER) {                                     // 站起、拍掉身上的灰，炮管慢慢放平
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_KNEEL, K_IDLE, q); P.plant = q < 0.5 ? 1 : 0; P.fuse = tq < 0.55 ? 0 : 3; P.fz = 4;
      P.can = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0; P.rim = q < 0.4 ? 1 : 0;
      if (tq >= 0.2 && tq < 0.5) { P.bhx = 5; P.bhy = -17 + ((f12 & 1) ? 2 : 0); }      // 后手拍胸甲上的灰
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.can = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 受击 → 跪倒 → 散架（死亡套件接管画面）
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.flash = d < 1 / 12 ? 1 : 0; P.fz = (f12 & 1) ? 2 : 0; P.can = 1; }
      else if (d < 0.5) { setK(K_DOWN, K_DOWN, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.plant = 1; P.fz = 1; P.can = 0; }
      else { setK(K_DOWN, K_DOWN, 0); P.bx = -2; P.eyes = 1; P.plant = 1; P.fz = 4; P.dq = 1; }
    } else if (st === REVIVE) {
      idle(tq, f12); P.bob = 0; P.tamp = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    const Rr = parts.rig(P, BODY), yo = Rr.yHip - R0.yHip;
    P.hx = RD(P.hx); P.hy = RD(P.hy) + (P.plant ? 0 : yo); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = canGeo(parts.rig(P, BODY)); P.gx = g.fuse[0] + P.bx; P.gy = g.fuse[1];   // 发光体 = 引信火
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 本角色的部件（通用的标「候选部件」）─────
  // 锅炮几何：锅（药室）坐在两肩后上方，炮管从锅前上方铆出，按 can 档仰起；引信插在锅后上方
  function canGeo(R) {
    const cx = R.hx - 5, top = R.htop - 3, a = CAN_A[P.can], ca = Math.cos(a), sa = Math.sin(a), bx0 = cx + 3, by0 = top + 1, L = 9;
    return { cx, top, a, b0: [bx0, by0], b1: [bx0 + ca * L, by0 - sa * L], mz: [RD(bx0 + ca * (L + 1.5)), RD(by0 - sa * (L + 1.5))], fuse: [cx - 4 - (P.fuse >> 1), top - P.fuse], ca, sa, L };
  }
  // 候选部件：锅炮 potCannon —— 食人魔的铁锅铆上炮管（3 格粗、中段一道铜箍、炮口外翻 + 黑洞）和支架（斜拉到前肩），锅身一圈铆钉铜箍，锅后一根引信（火头是发光体）
  function potCannon(R) {
    const G = canGeo(R), cx = G.cx, top = G.top;
    E.part();                                                        // 支架：从锅底斜拉到前肩
    parts.line(E, R, cx + 1, top + 7, R.sFx - 1, R.sFy - 2, M.iron, 2); parts.line(E, R, cx - 1, top + 7, R.sFx - 3, R.sFy - 1, M.iron, 3);
    E.part();
    const rows = [[-4, 3], [-4, 3], [-5, 4], [-5, 4], [-5, 4], [-4, 3], [-3, 2]];
    for (let j = 0; j < rows.length; j++) run(E, R, top + j, cx + rows[j][0], cx + rows[j][1], M.iron, 0);
    run(E, R, top, cx - 3, cx + 2, M.iron, 4); run(E, R, top + 1, cx - 3, cx + 2, M.iron, 2);
    run(E, R, top + 3, cx - 5, cx + 4, M.copper, 0); for (let x = cx - 4; x <= cx + 3; x += 2) px(E, R, x, top + 3, M.copper, 4);   // 铜箍 + 铆钉
    px(E, R, cx - 6, top + 2, M.iron, 0); px(E, R, cx - 4, top + 4, M.iron, 4);
    E.part();                                                        // 炮管
    const n = G.L * 2;
    for (let k = 0; k <= n; k++) { const q = k / n, x = G.b0[0] + (G.b1[0] - G.b0[0]) * q, y = G.b0[1] + (G.b1[1] - G.b0[1]) * q; parts.brush(E, R, x, y, 1.1, Math.abs(q - 0.45) < 0.08 ? M.copper : M.iron, 0); }
    parts.brush(E, R, G.b1[0] + G.ca, G.b1[1] - G.sa, 1.6, M.iron, 0);                                                          // 炮口外翻
    px(E, R, G.mz[0], G.mz[1], M.ink, 1); px(E, R, G.b0[0] + 2, G.b0[1] - 2, M.iron, 4);
    E.part();                                                        // 引信 + 火头
    for (let k = 0; k < P.fuse; k++) px(E, R, cx - 4 - (k >> 1), top - 1 - k, M.cord, k === P.fuse - 1 ? 3 : 2);
    if (P.fz !== 4) { const f = G.fuse; px(E, R, f[0], f[1] - 1, M.fuse, [2, 3, 4, 4][P.fz]); if (P.fz >= 2) px(E, R, f[0] - 1, f[1] - 1, M.fuse, 2); }
  }
  // 候选部件：熊头肩甲 bearPauldron —— 远侧肩上的熊头（朝后）：圆耳伸出肩线、熊吻朝后伸出、空眼窝；和身后的熊皮披风同一色阶
  function bearPauldron(R) {
    E.part();
    const x = R.sBx - 1, y = R.sBy - 1, f = M.fur;
    run(E, R, y - 3, x - 2, x + 2, f, 0); run(E, R, y - 2, x - 4, x + 3, f, 0); run(E, R, y - 1, x - 5, x + 3, f, 0); run(E, R, y, x - 5, x + 3, f, 0); run(E, R, y + 1, x - 3, x + 2, f, 0);
    px(E, R, x - 1, y - 4, f, 0); px(E, R, x - 1, y - 5, f, 4); px(E, R, x + 1, y - 4, f, 0); px(E, R, x + 1, y - 5, f, 0);   // 两只圆耳伸出肩线
    px(E, R, x - 5, y - 1, M.ink, 1); px(E, R, x - 3, y - 2, M.ink, 1); px(E, R, x - 4, y - 1, f, 4); px(E, R, x - 4, y + 1, M.tusk, 3);   // 熊鼻、眼窝、吻背、牙
  }
  // 候选部件：巨型肩甲 bigPauldron —— 7 格宽的圆肩甲，下沿镶铁边 + 3 颗铆钉，上沿高光
  function bigPauldron(R, x, y) {
    E.part();
    run(E, R, y - 4, x - 2, x + 2, M.armor, 0); run(E, R, y - 3, x - 3, x + 3, M.armor, 0); run(E, R, y - 2, x - 4, x + 4, M.armor, 0); run(E, R, y - 1, x - 4, x + 4, M.armor, 0);
    run(E, R, y, x - 4, x + 4, M.iron, 0); for (const dx of [-3, 0, 3]) px(E, R, x + dx, y, M.iron, 4);
    px(E, R, x - 1, y - 3, M.armor, 4); px(E, R, x - 2, y - 2, M.armor, 4);
  }
  // 候选部件：长方塔盾 towerShield —— 8 宽 × 18 高的黑铁长方盾（上角切掉），两侧铁边每 3 行一颗铆钉，盾心铆着平底锅（锅面朝外、木柄朝下）
  function towerShield(T, cx, cy) {
    E.part();
    const x0 = cx - 4, y0 = cy - 8;
    for (let j = 0; j < 18; j++) { const cut = j === 0 ? 1 : 0; for (let i = cut; i < 8 - cut; i++) { const edge = i === cut || i === 7 - cut || j === 0 || j === 17; px(E, T, x0 + i, y0 + j, edge ? M.iron : M.plate, edge && (j % 3) === 2 && (i === 0 || i === 7) ? 4 : 0); } }
    for (let j = 3; j <= 14; j++) px(E, T, x0 + 2, y0 + j, M.plate, 4);                                                 // 盾面冷光
    const PAN = ['.XXXX.', 'XXXXXX', 'XXXXXX', 'XXXXXX', '.XXXX.'], px0 = cx - 3, py0 = cy - 4;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) if (PAN[j][i] === 'X') { const inner = i >= 1 && i <= 4 && j >= 1 && j <= 3; px(E, T, px0 + i, py0 + j, M.pan, i === 1 && j === 1 ? 4 : inner ? ((i >= 3 && j >= 2) ? 1 : 2) : 0); }
    for (let j = 5; j <= 7; j++) px(E, T, cx, py0 + j, M.wood, j === 7 ? 2 : 0);                                         // 锅柄朝下
    for (const [dx, dy] of [[-3, 0], [2, 0], [-3, 4], [2, 4]]) px(E, T, px0 + 3 + dx, py0 + dy, M.gold, 4);             // 四颗金铆钉把锅钉在盾上
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    parts.cape(E, R, P, { mat: M.cape, len: R.yHip + 3, flare: 3.5, style: 'tattered' });            // 熊皮披风
    bearPauldron(R);                                                                                     // 远侧（左肩）熊头肩甲
    if (!P.tamp) parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armorD, hand: M.armorD, grip: 'big' });
    parts.legs(E, R, P, { style: 'greave', mat: M.armor, matD: M.armorD, boot: M.iron, bootD: M.ironD, w: 4 });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.armor, belt: M.iron, buckle: M.gold });
    for (let k = 0; k < 3; k++) run(E, R, R.yS + 2 + k * 2, tor.chest[0] - 4, tor.chest[0] - 1, M.gold, k === 0 ? 4 : 3);   // 胸甲三道金色指挥官横杠（露在前臂后面）
    potCannon(R);
    if (P.tamp) {                                                                                        // 检炮：后手从头后举到炮口捣药（手臂藏在头后，拳头露在盔顶上方）
      const g = canGeo(R), at = [g.mz[0] - 1, g.mz[1] + (P.tamp === 2 ? 1 : -1)];
      parts.arm(E, R, P, { side: 'B', at, sleeve: 'plate', mat: M.armorD, hand: M.armor, grip: 'big' });
    }
    const af = parts.arm(E, R, P, { sleeve: 'plate', mat: M.armor, hand: M.armor, grip: 'big' });
    bigPauldron(R, R.sFx - 2, R.sFy + 2);
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', nose: 'small', mouth: 'line', ear: 'none' });   // 小头压在两只肩甲之间
    if (!P.eyes) { px(E, R, hd.eye[0], hd.eye[1], M.eye, P.rim >= 2 ? 4 : 2); px(E, R, hd.x1, hd.ey, M.skin, 3); }
    px(E, R, hd.x1 + 1, hd.bot, M.tusk, 3); px(E, R, hd.x1 + 2, hd.bot - 1, M.tusk, 4); px(E, R, hd.x1 - 2, hd.bot, M.tusk, 3);   // 下颚两颗獠牙
    parts.helm(E, R, P, { style: 'kettle', mat: M.armor, trim: M.iron });                                // 开面宽边铁盔
    const sc = [P.hx + 3, P.hy];                                                                         // 塔盾挂在前手上（盾心在手前 3 格）
    if (P.plant) sc[1] = Math.min(sc[1], -9);
    towerShield(R, sc[0], sc[1]);
    void af;
  }
  function bakeHero() { RIM.rim = P.rim; const g = canGeo(parts.rig(P, BODY)); RIM.rx = g.mz[0] + P.bx + hero.ox; RIM.ry = g.mz[1] + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, smokeAcc = 0, soulAcc = 0, lastStep = 0, slamT = 9, slamX = 0, ballT = 9, ballX0 = 0, ballY0 = 0, scorchT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const muzzle = () => { const g = canGeo(parts.rig(P, BODY)); return [wx(g.mz[0] + P.bx), wy(g.mz[1])]; };
  const BALL_X1 = DUMMY_X - 1, BALL_Y1 = HY - 10;
  function ballPos(t) { const q = clamp01(t / T_BALL); return [ballX0 + (BALL_X1 - ballX0) * q, ballY0 + (BALL_Y1 - ballY0) * q - 16 * Math.sin(q * Math.PI)]; }
  function onEnter(s) {
    if (s !== CAST) return;                                          // 嘭：炮口火光 + 浓黑烟团 + 炮弹飞出
    poseAt(CAST, 0, E.simT); const [mx, my] = muzzle();
    fx.cross(mx + 1, my - 1, 5, R_EL, 0.2); burst(mx, my, 12, 50, 120, 0.2, 0.45, R_EL, 10); fx.cloud(mx - 1, my - 2, 6, R_SMOKE, 0.9, 2);
    ballT = 0; ballX0 = mx; ballY0 = my; shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_SLAM) < 1e-9) {             // 盾底砸地：地裂冲向假人 + 尘浪 + 减速
      const x0 = wx(P.hx + 3 + P.bx); slamT = 0; slamX = x0;
      fx.crack(x0 + 4, FLOOR, DUMMY_X - x0 - 4, 1, 'earth', 0.8, 0); fx.wave(x0 + 2, HY, 1, DUMMY_X - x0, 4, FXI.dust, 0.5, 1);
      for (let i = 0; i < 8; i++) spawn(K_DUST, x0 + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.3) * 40, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
      burst(x0, HY - 1, 4, 40, 80, 0.15, 0.3, FXI.impact, 20); hitDummy(0); dummyFx({ dur: 1.0, slow: 0.45 });
      sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'stone', w: 0.9 });
    }
    if (s === CAST && Math.abs(t - T_BALL) < 1e-9) {               // 炮弹落地爆炸：火焰外爆 + 大冲击环 + 硝烟 + 焦痕；假人眩晕、攻速变慢
      const x = BALL_X1, y = HY - 8; ballT = 9; scorchT = 0;
      burst(x, y, 30, 50, 140, 0.3, 0.7, R_EL, 24); ring(x, y, 1, R_EL); fx.cloud(x, y - 4, 8, R_SMOKE, 1.2, 2);
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 2, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, 0.7, R_EL, { g: 240, floor: HY });
      hitDummy(1); dummyFx({ dur: 1.6, stun: 1, slow: 0.45 }); shake(0.12, 1);
      sfx('impact', { pal: 'fire', w: 0.95 });
    }
    if (s === DEATH && Math.abs(t - T_KIT) < 1e-9) {               // 散架：头盔、锅炮、塔盾、熊头肩甲各自飞出，躯干塌下
      poseAt(DEATH, T_KIT - 1 / 12, T_KIT - 1 / 12); drawHero(); bakeHero();
      death.start('parts', { power: 0.85, fromX: 1, fromY: -16, push: -6, fadeAt: 1.15, fadeDur: 0.6, ramp: 'soul' }); shake(0.12, 1);
      poseAt(DEATH, t, t);
    }
    if (s === DEATH && Math.abs(t - T_FALL) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.95 }); }
    if (s === DEATH && Math.abs(t - T_FIZZ) < 1e-9) {              // 锅炮落地，引信最后「嗞」一下，冒黑烟
      const x = HX - 12; for (let i = 0; i < 6; i++) spawn(K_BURST, x, HY - 4, (Math.random() - 0.5) * 50, -20 - Math.random() * 30, 0.25, R_EL); fx.cloud(x, HY - 6, 4, R_SMOKE, 0.8, 2);
      sfx('hit', { mat: 'metal', w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_SLAM], [], [T_BALL], [], [], [T_KIT, T_FALL, T_FIZZ], []];
  function stepFX(dt, state, stT) {
    const [mx, my] = muzzle(), R = parts.rig(P, BODY), g = canGeo(R), fx0 = wx(g.fuse[0] + P.bx), fy0 = wy(g.fuse[1] - 1);
    if (state === CHARGE) {                                          // 引信火花一颗颗往炮身烧；炮口冒细烟
      chargeAcc += dt * 16; while (chargeAcc >= 1) { chargeAcc -= 1; spawn(K_BURST, fx0, fy0, (Math.random() - 0.5) * 30, -20 - Math.random() * 20, 0.2 + Math.random() * 0.15, R_EL); }
      smokeAcc += dt * 4; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, mx, my - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 5, 0.8 + Math.random() * 0.4, R_SMOKE); }
    }
    if ((state === IDLE && P.fz >= 1) || (state === IDLE && P.fz >= 3)) { if (Math.random() < dt * (P.fz >= 3 ? 30 : 3)) spawn(K_EMBER, fx0, fy0, (Math.random() - 0.5) * 10, -10 - Math.random() * 8, 0.3, R_EL); }
    if (state === RECOVER) { smokeAcc += dt * 6; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, mx, my - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.9 + Math.random() * 0.4, R_SMOKE); } }
    if (ballT < T_BALL) {                                            // 炮弹火尾
      const [bx, by] = ballPos(ballT); for (let i = 0; i < 2; i++) spawn(K_TRAIL, bx - 2, by + (Math.random() - 0.5) * 2, -20 - Math.random() * 20, (Math.random() - 0.5) * 10, 0.2 + Math.random() * 0.15, R_EL);
    }
    if (state === MOVE && P.step !== lastStep) {                     // 接触帧：4 颗尘 + 盾底蹭地 1 颗火星
      if (P.step !== 0) { sfx('step', { w: 0.95 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -4) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); spawn(K_BURST, wx(P.hx + 3 + P.bx), HY - 1, 20, -30, 0.2, R_EL); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 32, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    ballT += dt; scorchT += dt; slamT += dt;
  }
  function fxReset() { chargeAcc = 0; smokeAcc = 0; soulAcc = 0; lastStep = 0; slamT = 9; ballT = 9; scorchT = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.dq) floorGlow(wx(g0x()), P.rim, EL, f12);
    if (scorchT < 1.3) for (let x = -7; x <= 7; x++) { if (Math.abs(x) > 5 && ((x + f12) & 1)) continue; put(BALL_X1 + x, FLOOR, Math.abs(x) < 3 ? 0 : 8); if (Math.abs(x) < 4 && scorchT < 0.5) put(BALL_X1 + x, FLOOR + 1, Math.abs(x) < 2 ? EL[4] : 8); }   // 地面焦痕
  }
  function g0x() { return P.hx + 3 + P.bx; }
  function fxFront(f12) {
    if (slamT < 2 / 12) {                                            // 砸地拖影：塔盾从举高处砸下来的竖向速度线（第 1 帧亮、第 2 帧断续）
      const first = slamT < 1 / 12, IM = FXR[FXI.impact];
      for (const dx of [-4, -1, 2, 4]) for (let y = HY - 30; y <= HY - 19; y++) { if (!first && (y & 1)) continue; put(slamX + dx, y, first ? (y > HY - 24 ? IM[0] : IM[1]) : IM[2]); }
    }
    if (ballT < T_BALL) {                                            // 3×3 黑铁球 + 火尾
      const [bx, by] = ballPos(ballT), x = RD(bx), y = RD(by);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + i, y + j, i === -1 && j === -1 ? 30 : (i + j >= 1 ? 27 : 28));
      put(x - 2, y, EL[1]); put(x - 3, y, EL[2]); put(x - 2, y + 1, EL[2]); put(x - 4, y, EL[3]);
    }
    if (P.fz === 3 && P.dq < 1) { const g = canGeo(parts.rig(P, BODY)), x = wx(g.fuse[0] + P.bx), y = wy(g.fuse[1] - 1); put(x, y - 2, EL[0]); put(x - 1, y - 1, EL[1]); put(x + 1, y - 1, EL[1]); put(x, y - 3, EL[2]); }   // 引信火星一闪
  }

  return {
    name: '指挥官', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.fuse, M.eye], HIT_POINT: [2, -16], EVENTS, R_HURT: FXI.steel,
    deathKit: { mode: 'parts', at: T_KIT },
    SFX: { body: 'armor', how: 'collapse', pal: 'fire', style: 'meteor', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
