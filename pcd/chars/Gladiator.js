// 角斗士（部队 · 科技 · 刺客 · 稀有 · 近战 272）：竞技场机械斗士——精悍瘦腰宽肩、古铜赤膊、低重心半蹲侧身。
// 识别：格栅面罩鳍冠盔（黄铜鱼鳍冠从前额弯到后脑、高出头 4 格）· 右臂整条套着超大黄铜机械护臂（肩甲高出肩 2 格、外侧 5 颗刻度灯数连击）·
//   左手尖钉小圆盾挡在身前、右手宽刃短剑斜指前方；腰间红缠腰两条带尾向后飘。
// 攻击 = 刺（侧身弓步前突刺 3 格，剑从盾沿外一戳即收）；技能 = 特性「决斗者」（盯住同一个目标越打越痛）：
//   剑直指目标、目标头顶出现红色决斗靶环、护臂刻度灯一颗颗亮起 → 三段突刺（每刺目标头顶多一道刻痕）→ 第三刺定格：十字斩花 + 血色外爆。
// 死亡 = 侧倒：扭身踉跄 → 仰面侧倒，鳍冠盔脱落滚开、小圆盾滚出一段路打转倒下，刻度灯一颗颗熄灭。
// 升级成「狂战士」（Berserker.js）：鳍冠裂开喷能量、护臂长成动力臂 + 能量战刃、刻度灯变成 20 格一整条、红缠腰变成战利品披挂。
PCD.define('Gladiator', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_SPIRAL_PT, K_EMBER,
    spawn, spawnX, burst, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：决斗 · 竞技红刃（blood 21 白 → 淡粉 → 红 → 暗红 → 酒红），刃光点缀 steel ─────
  const R_EL = FXI.blood, EL = FXR[R_EL], STL = FXR[FXI.steel];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: 'skinDark',                                  // 古铜肤（大面积赤膊）
    brass: 'gold',                                     // 黄铜护臂 / 盔 / 护手
    iron: 'iron',                                      // 活塞杆、格栅缝、盾面
    cloth: 'crimson',                                  // 竞技红缠腰
    strap: 'leather',                                  // 凉鞋绑带、剑柄缠皮、护腕
    steel: 'steel',                                    // 刃、盾面
    edge: 'white',                                     // 刃口亮线
    hair: 'boot',                                      // 头盔脱落后露出的短发
    light: { r: 'fire', flat: 1 },                     // 刻度灯（发光体）
    eye: { r: 'fire', flat: 1 },                       // 面罩缝里的眼光
    ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'slim', sw: 5, waist: 1, neck: 1, headW: 6, torso: 9, arm: 9, lw: 2, limb: 1.15, stride: 4, lift: 1, fall: 'back' };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(92, 50, 50, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'strap', 'hair', 'ink', 'eye', 'light', 'iron']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  const SWORD = { style: 'broad', metal: M.steel, edge: M.edge, trim: M.brass, wood: M.strap, len: 7 };
  const H2 = Math.PI / 2;

  // ───── 姿势 ─────
  // lit 刻度灯亮几颗 0–5 · hatX / hatY / hatR 掉落的盔（横移 / 离地 / 翻滚档）· shX / shR / shF 滚走的盾（横移 / 翻滚档 / 0 立着滚 · 1 打转 · 2 平躺）· swX 掉落的剑
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, hatR: 0, shX: 0, shR: 0, shF: 0, swX: 0, lit: 0, dq: 0, dq48: 0, aq: 0, st: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(7, -10, 1.11, 9, -19, 0, 0, 1);       // 半蹲侧身：剑斜指前上（2:1），盾挡胸前
  const K_TAPU = K(9, -13, 0.2, 9, -19, 0, 0, 1);        // 待机个性：剑竖起
  const K_TAP = K(10, -14, -0.46, 9, -19, 0, 0, 1);       //   剑背往后「锵」地敲在盾沿上
  const K_POINT = K(9, -11, H2, 9, -19, 0, 0, 1);        //   剑尖平指对手
  const K_FLICK = K(9, -11, 1.11, 9, -19, 0, 0, 1);      //   剑尖往上一勾
  const K_WIND = K(2, -11, H2, 9, -20, -1, 0, 2);        // 攻击预兆：剑往回收、身体压低、盾顶前
  const K_STAB = K(12, -12, H2, 9, -19, 2, 1, 1);        // 弓步突刺：剑从盾沿外平伸
  const K_AIM = K(9, -12, H2, 9, -20, 1, 0, 2);          // 蓄力：剑直指目标、身体压低
  const K_LUNGE = K(12, -12, H2, 9, -19, 2, 1, 1);       // 三段突刺的出剑帧
  const K_RET = K(6, -11, H2, 9, -20, 1, 0, 2);          // 三段突刺的收剑帧
  const K_HURT = K(4, -11, 0.6, 6, -19, -1, -1, 0);
  const K_TWIST = K(1, -20, -0.3, -4, -13, -1, -1, 2);   // 死亡：扭身踉跄，剑甩到头后、盾甩到身后
  const K_LIE = K(1, -10, 0.2, -2, -12, 0, 0, 0);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -32, 31], ['hy', -64, 15], ['aq', -32, 32], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['lit', 0, 5], ['st', 0, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -16, 15], ['hatY', 0, 7], ['hatR', 0, 3], ['shX', -4, 27], ['shR', 0, 3], ['shF', 0, 2],
    ['swX', -8, 23], ['dq48', 0, 48], ['bx', -16, 15]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  // 待机个性（1.4–2.2 s，10 帧）：剑背敲两下盾沿（锵锵）→ 剑尖平指对手、往上勾两下
  const PERS = [K_TAPU, K_TAP, K_TAPU, K_TAP, K_IDLE, K_POINT, K_FLICK, K_POINT, K_FLICK, K_POINT];
  const T_PERS = 1.4, T_TAP1 = T_PERS + 1 / 12, T_TAP2 = T_PERS + 3 / 12;
  const T_STAB = 2 / 12, T_STAB2 = 3 / 12, T_LAND = INCOMING + 0.66;

  function armGeo(R) {                                    // 机械护臂的关节（肩 / 肘 / 手）和 5 颗刻度灯的位置（绘制和发光挂点共用同一套几何）
    const sx = R.sFx, sy = R.sFy, hx = P.hx, hy = P.hy, L = R.arm, dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L * L / 4 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    const ux = hx - ex, uy = hy - ey, ul = Math.hypot(ux, uy) || 1;
    const di = parts.snapDir(Math.atan2(ux / ul, -uy / ul)), nx = uy / ul, ny = -ux / ul;      // (nx, ny) = 前臂上沿方向
    const lx = RD(ex + ux / ul * 0.6 + nx * 1.4), ly = RD(ey + uy / ul * 0.6 + ny * 1.4);
    return { sx, sy, ex, ey, hx, hy, di, lx, ly, mid: parts.cell(di, lx, ly, 2) };
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.hatR = 0; P.shX = 0; P.shR = 0; P.shF = 0; P.swX = 0; P.lit = 1; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= T_PERS - 1e-6 && lp < T_PERS + 10 / 12 - 1e-6) {
        const i = Math.min(9, f12of(lp - T_PERS)); setK(PERS[i], PERS[i], 0);
        if (i === 1 || i === 3) { P.glint = 1; P.beard = 1; }
        if (i >= 5) P.head = 1;
      }
      P.rim = 0;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 侧滑步：侧身半蹲、前脚滑出后脚跟上，重心不起伏
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = 0;
      P.a = K_IDLE.a + P.step * 0.1; P.hx = K_IDLE.hx + P.step * 0.6;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                           // 刺：侧身弓步向前突刺 3 格，一戳即收
      const fr = f12of(t);
      if (fr < 2) { setK(K_IDLE, K_WIND, fr ? 1 : 0.5); P.bx = -fr; P.beard = 1; }
      else if (fr < 5) { setK(K_STAB, K_STAB, 0); P.bx = fr === 4 ? 2 : 3; P.beard = -2; P.sway = -1; P.lit = 2; P.gem = fr === 2 ? 2 : 1; P.rim = fr === 2 ? 2 : 1; }
      else { const q = clamp01((tq - 5 / 12) / 0.33); setK(K_STAB, K_IDLE, ease.inOut(q)); P.bx = RD(2 * (1 - q)); P.beard = q < 0.5 ? -1 : 0; P.lit = q < 0.5 ? 2 : 1; P.rim = 1; }
    } else if (st === CHARGE) {                                           // 剑直指目标、身体压低，刻度灯一颗颗亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q);
      P.lit = Math.min(5, 1 + Math.floor(tq / 0.28 + 1e-6)); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST || st === RECOVER) {                            // 三段突刺：每段 3 帧（出剑前冲 2 格 → 拖影 → 收剑）；第三刺落在收招开头并定格
      const fr = f12of(t) + (st === RECOVER ? 6 : 0), k = Math.floor(fr / 3), ph = fr % 3;
      P.lit = 5;
      if (k < 2) {
        if (ph < 2) { setK(K_LUNGE, K_LUNGE, 0); P.bx = 2; P.beard = -2; P.sway = -1; } else { setK(K_RET, K_RET, 0); P.bx = 0; P.beard = -1; }
        P.gem = 3; P.rim = 3;
      } else if (tq < 0.34 || st === CAST) { setK(K_LUNGE, K_LUNGE, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.crouch = 2; }
      else { const q = clamp01((tq - 0.34) / 0.34); setK(K_LUNGE, K_IDLE, ease.inOut(q)); P.bx = RD(3 * (1 - q)); P.gem = q < 0.4 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.beard = q < 0.5 ? -1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 扭身踉跄 → 仰面侧倒 → 盔滚走、盾滚出去打转倒下 → 刻度灯一颗颗熄灭 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_TWIST, K_TWIST, 0); P.bx = -3; P.eyes = 1; P.beard = 2; P.sway = 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -3; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.swX = RD(clamp01((d - 0.5) / 0.2) * 5);
        const hq = clamp01((d - 0.66) / 0.36); P.hatX = -RD(12 * ease.out(hq)); P.hatY = d < 0.66 ? 0 : RD(Math.sin(Math.min(1, hq * 2.2) * Math.PI) * 4); P.hatR = hq >= 1 ? 0 : f12of(d - 0.66) & 3;
        if (d < 1.12) { const sq = clamp01((d - 0.5) / 0.62); P.shX = RD(16 * ease.out(sq)); P.shR = f12of(d - 0.5) & 3; P.shF = 0; }
        else if (d < 1.3) { P.shX = 16; P.shR = 0; P.shF = f12of(d - 1.12) & 1 ? 1 : 0; }
        else { P.shX = 16; P.shF = 2; }
        P.lit = d < 0.7 ? 5 : Math.max(0, 5 - Math.floor((d - 0.7) / 0.12 + 1e-6)); P.gem = P.lit ? 0 : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48);
    const R = parts.rig(P, BODY), g = armGeo(R), c = parts.toSprite(R, g.mid[0], g.mid[1]);
    P.gx = c[0] + P.bx; P.gy = c[1] - P.lift;
    P.aq = RD(P.a / ASTEP); KEY(P);                                       // 写 P.k1 / P.k2
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：waistTails —— 腰后两条缠腰带尾（长 3–4 格，末端下垂一格、随 beard 上甩 / 被风拉直），和躯干前沿的缠腰布配套
  function waistTails(R) {
    E.part(); const e = parts.edges(R, R.yHip - 1), x0 = e[0], y = R.yHip - 1, b = RD(P.beard || 0);
    const lift = b < 0 ? -1 : b > 0 ? 1 : 0;
    for (let k = 1; k <= 4; k++) PX(E, R, x0 - k, y + (k >= 3 ? 1 + (lift > 0 ? 0 : lift < 0 ? -1 : 0) : 0), M.cloth, k === 4 ? 4 : 0);
    for (let k = 1; k <= 3; k++) PX(E, R, x0 - k, y + 1 + (k === 3 ? 1 + (lift > 0 ? -1 : 0) : 0), M.cloth, k === 3 ? 2 : 0);
    PX(E, R, x0 - 5 + (lift < 0 ? 0 : 1), y + (lift > 0 ? 1 : 2) + (lift < 0 ? -1 : 0), M.cloth, 3);
  }
  // 候选部件：finHelm —— 格栅面罩鳍冠盔（黄铜圆顶 + 箍带铆钉 + 护颈；前脸 4 列竖格栅、缝里 1 格眼光；worn = 0 时是掉在地上的空盔）。
  //   T = 以头顶中线为原点的落笔变换（戴着：跟 rig；掉落：自由 + 整 90° 翻滚）。鳍冠单独一个部件（压在盔顶上出分界线）。
  const FIN_O = [[3, -2], [2, -3], [1, -4], [0, -5], [-1, -5], [-2, -5], [-3, -4], [-4, -3], [-5, -2], [-6, -1], [-6, 0], [-7, 1]];
  const FIN_I = [[2, -2], [1, -3], [0, -4], [-1, -4], [-2, -4], [-3, -3], [-4, -2], [-5, -1], [-5, 0], [-6, 1]];
  function finHelm(T, worn) {
    const br = M.brass;
    E.part();
    parts.run(E, T, -1, -1, 2, br, 0); parts.run(E, T, 0, -2, 3, br, 0); parts.run(E, T, 1, -3, 4, br, 2);
    for (let y = 2; y <= 4; y++) parts.run(E, T, y, -3, 0, br, 0);
    PX(E, T, -2, 5, br, 2); PX(E, T, -1, 5, br, 2);                                    // 护颈下沿
    PX(E, T, -1, 0, br, 4); PX(E, T, 0, -1, br, 4);                                     // 圆顶高光
    PX(E, T, 0, 1, br, 4); PX(E, T, -1, 3, br, 4);                                      // 箍带铆钉 + 面罩铰链
    for (let y = 2; y <= 4; y++) { PX(E, T, 1, y, br, 3); PX(E, T, 2, y, M.iron, 1); PX(E, T, 3, y, br, 4); PX(E, T, 4, y, br, 2); }   // 竖格栅面罩：框 · 缝 · 栅 · 框
    if (worn) {
      if (!P.eyes) PX(E, T, 2, 2, M.eye, P.flash ? 4 : 3);
      parts.run(E, T, 5, 0, 3, M.skin, 0); PX(E, T, 3, 5, M.skin, 2);                  // 下巴（格栅下露出来）
    }
    E.part();
    for (let i = 0; i < FIN_O.length; i++) PX(E, T, FIN_O[i][0], FIN_O[i][1], br, (i % 3) === 1 ? 4 : 3);
    for (let i = 0; i < FIN_I.length; i++) PX(E, T, FIN_I[i][0], FIN_I[i][1], br, i < 4 ? 3 : 2);
  }
  const HELM_BOT = [5, 7, 5, 4];                                                         // 各翻滚档下盔的最低行（让掉在地上的盔贴地）
  // 候选部件：mechGauntlet —— 整条套住手臂的超大机械护臂：上臂黄铜分节 + 背侧活塞杆，前臂粗一倍、分节缝、上沿一排刻度灯（n 颗，lit 颗亮），
  //   大肩甲高出肩 2 格（两颗铆钉）；手单独画（3×3 黄铜爪，压在剑柄上）。几何见 armGeo。
  function mechGauntlet(R, g, n) {
    const br = M.brass, dx = g.hx - g.ex, dy = g.hy - g.ey, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
    E.part();
    parts.sweep(E, R, g.sx, g.sy, g.ex, g.ey, 1.3, 1.5, br, 0);
    parts.sweep(E, R, g.ex, g.ey, g.hx - ux * 1.2, g.hy - uy * 1.2, 1.9, 2.1, br, 0);
    { const qx = g.ex - g.sx, qy = g.ey - g.sy, ql = Math.hypot(qx, qy) || 1, px0 = -qy / ql, py0 = qx / ql, s = px0 < 0 ? 1 : -1;   // 活塞杆：上臂背侧一条铁杆
      parts.line(E, R, g.sx + px0 * s * 1.6 + qx / ql, g.sy + py0 * s * 1.6 + qy / ql, g.ex + px0 * s * 2, g.ey + py0 * s * 2, M.iron, 3); }
    PX(E, R, g.ex, g.ey, br, 2); PX(E, R, g.ex - 1, g.ey - 1, br, 4);                  // 肘关节
    for (const q of [0.45, 0.8]) { const cx = g.ex + dx * q, cy = g.ey + dy * q; for (let k = -1; k <= 1; k++) PX(E, R, cx - uy * k * 1.4, cy + ux * k * 1.4, M.iron, 3); }   // 分节缝
    const lv = P.gem;
    parts.bar(g.di, g.lx, g.ly, 0, n - 1, 1, (k, j, X, Y) => {                         // 刻度灯（发光体，和护臂同一部件）
      const on = k < P.lit; PX(E, R, X, Y, on ? M.light : M.iron, on ? (lv >= 2 && lv < 4 ? 4 : 3) : 2);
    });
    if (P.glint && P.lit) { const c = parts.cell(g.di, g.lx, g.ly, Math.max(0, P.lit - 1)); PX(E, R, c[0], c[1] - 1, M.light, 4); }
    E.part();                                                                            // 大肩甲：高出肩 2 格
    const x = g.sx - 1, y = g.sy;
    parts.run(E, R, y - 4, x - 2, x, br, 0); parts.run(E, R, y - 3, x - 3, x + 1, M.iron, 0); parts.run(E, R, y - 2, x - 3, x + 2, M.iron, 0);
    parts.run(E, R, y - 1, x - 3, x + 2, M.iron, 0); parts.run(E, R, y, x - 2, x + 2, br, 3);
    PX(E, R, x - 2, y - 4, br, 4); PX(E, R, x - 2, y - 2, br, 4); PX(E, R, x + 1, y - 1, br, 4);   // 铁肩甲 + 黄铜镶边 / 铆钉
  }
  // 候选部件：spikeBuckler —— 尖钉小圆盾：targe r 3（钢面 + 黄铜边 + 盾心铜包）+ 盾心前伸的 2 格尖钉；shF 1 = 打转（压扁成 7×3）、2 = 平躺（盾面朝上、尖钉朝天）
  function spikeBuckler(R, at, rot, flatMode, free) {
    const o = { r: 3, face: M.steel, rim: M.brass, boss: M.brass, pattern: 'none', plank: 0 };
    if (flatMode) {
      E.part(); const F = parts.FREE, cx = at[0];
      if (flatMode === 1) { parts.run(E, F, -3, cx - 2, cx + 2, M.brass, 0); parts.run(E, F, -2, cx - 3, cx + 3, M.steel, 0); parts.run(E, F, -1, cx - 3, cx + 3, M.brass, 0); parts.run(E, F, 0, cx - 2, cx + 2, M.brass, 2); PX(E, F, cx, -2, M.brass, 4); PX(E, F, cx + 1, -4, M.steel, 4); }
      else { parts.run(E, F, -1, cx - 3, cx + 3, M.steel, 0); parts.run(E, F, 0, cx - 3, cx + 3, M.brass, 0); PX(E, F, cx - 3, -1, M.brass, 0); PX(E, F, cx + 3, -1, M.brass, 0); PX(E, F, cx, -2, M.brass, 3); PX(E, F, cx, -3, M.steel, 4); }
      return;
    }
    parts.targe(E, R, P, Object.assign(o, { at, rot, free }));
    const T = free ? { r0: rot & 3, tx: at[0], ty: at[1], rot: 0, ox: 0, oy: 0 } : { r0: rot & 3, tx: R.tx + at[0], ty: R.ty + at[1], rot: R.rot, ox: R.ox, oy: R.oy };
    PX(E, T, 4, 0, M.steel, 3); PX(E, T, 5, 0, M.steel, 4);                           // 盾心尖钉（和盾同一部件）
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY), g = armGeo(R);
    if (R.lie && P.swX) parts.sword(E, R, P, Object.assign({}, SWORD, { free: 1, at: [4 + P.swX, -1], a: H2 }));
    waistTails(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, cuff: M.strapD, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'sandal', mat: M.skin, matD: M.skinD, boot: M.strap, bootD: M.strapD });
    parts.torso(E, R, P, { style: 'bare', mat: M.skin, belt: M.cloth, buckle: M.brass, cloth: M.cloth });
    const HT = { r0: 0, tx: R.tx + R.hx, ty: R.ty + R.htop, rot: R.rot, ox: R.ox, oy: R.oy };
    if (R.lie && (P.hatX || P.hatY)) {                                                 // 盔脱落：露出短发的头；盔在地上翻滚
      parts.head(E, R, P, { mat: M.skin, eye: M.ink, face: 'square', age: 'rugged', nose: 'big' });
      parts.hair(E, R, P, { style: 'short', mat: M.hair });
      const b = parts.toSprite(R, R.hx, R.htop);
      finHelm({ r0: P.hatR, tx: b[0] - 2 + P.hatX, ty: -HELM_BOT[P.hatR] - P.hatY, rot: 0, ox: 0, oy: 0 }, 0);
    } else finHelm(HT, 1);
    if (R.lie) {
      if (P.shX) { if (P.shF) spikeBuckler(R, [-2 + P.shX, 0], 0, P.shF, 1); else spikeBuckler(R, [-4 + P.shX, -3], P.shR, 0, 1); }
      else spikeBuckler(R, [P.bhx + 1, P.bhy + 1], 0, 0, 0);
    } else spikeBuckler(R, [P.bhx + 1, P.bhy + 1], 0, 0, 0);
    if (!R.lie || !P.swX) parts.sword(E, R, P, SWORD);
    mechGauntlet(R, g, 5);
    parts.hand(E, R, P, { hand: M.brass, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, TGY = HY - 37;                                                  // 决斗靶环中心（假人头顶）
  let stabT = 9, stabX = 0, stabY = 0, stabBig = 0, crossT = 9, crossX = 0, crossY = 0, marks = 0, tapT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function stabHit(n) {                                                                 // 技能的一刺：拖影 + 目标头顶多一道刻痕 + 血色火花（第三刺：十字斩花 + 外爆 30 + 大摇击退 + 震屏 2 + 闪白）
    stabT = 0; stabBig = n === 3 ? 1 : 0; stabX = wx(12 + 2 + 9 + (n === 3 ? 1 : 0)); stabY = wy(-14 + 2);
    marks = n;
    if (n < 3) { burst(DCX - 4, stabY, 10, 30, 80, 0.15, 0.35, R_EL, 6); hitDummy(0); shake(0.08, 1); sfx('impact', { pal: 'blood', w: 0.3 }); }
    else {
      crossT = 0; crossX = DCX - 2; crossY = stabY - 1;
      burst(crossX, crossY, 30, 50, 140, 0.3, 0.7, R_EL, 12); fx.cross(crossX, crossY, 7, 'blood', 0.3, 2);
      for (let i = 0; i < 4; i++) spawn(K_EMBER, crossX + (Math.random() - 0.5) * 6, crossY, (Math.random() - 0.5) * 20, -20 - Math.random() * 20, 0.5, FXI.steel);
      hitDummy(1); shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'blood', w: 0.6 });
    }
  }
  function onEnter(s) {
    if (s === CAST) { stabHit(1); for (let i = 0; i < 6; i++) spawn(K_DUST, wx(-2 + Math.random() * 6), HY - 1, -10 - Math.random() * 20, -4 - Math.random() * 6, 0.35, FXI.dust); }
    if (s === RECOVER) stabHit(3);
    if (s === CHARGE) marks = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STAB) {
      stabT = 0; stabBig = 0; stabX = wx(P.hx + P.bx + 9); stabY = wy(P.hy);
      burst(DCX - 4, stabY, 8, 30, 70, 0.12, 0.3, FXI.impact, 4); burst(DCX - 4, stabY, 4, 20, 50, 0.15, 0.3, R_EL, 4); hitDummy(0);
      sfx('swing', { kind: 'thrust', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST && t === T_STAB2) stabHit(2);
    if (s === IDLE && (t === T_TAP1 || t === T_TAP2)) {                                  // 剑背敲盾沿：几颗钢色火星
      tapT = 0; const x = wx(9), y = wy(-22);
      for (let i = 0; i < 3; i++) spawn(K_EMBER, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 30, -15 - Math.random() * 15, 0.25, FXI.steel);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[T_TAP1, T_TAP2], [], [T_STAB], [], [T_STAB2], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.2) {                                                 // 血色火星从四周被吸进护臂刻度灯
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; spawnX(K_SPIRAL_PT, gx + (Math.random() - 0.5) * 30, gy + (Math.random() - 0.5) * 16, 0, 0, 9, R_EL, { a: Math.random() * 6.28, r: 11 + Math.random() * 6, w: 5, tx: gx, ty: gy }); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.2 }); spawn(K_DUST, wx(P.step > 0 ? 5 : -4), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    stabT += dt; crossT += dt; tapT += dt;
  }
  function fxReset() { stabT = 9; crossT = 9; tapT = 9; marks = 0; chargeAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  // 决斗靶环：两圈点阵 + 十字准星，蓄力时从 0 张开，收招时缩小消失；右边是刻痕（第几刺就几道竖线，新的一道先白）
  function duelTarget(f12) {
    const s = E.state, t = E.stT; let sc;
    if (s === CHARGE) sc = t < 0.2 ? 0 : clamp01((t - 0.2) / 0.3); else if (s === CAST) sc = 1; else if (s === RECOVER) sc = t < 0.3 ? 1 : 1 - clamp01((t - 0.3) / 0.3); else return;
    if (sc <= 0) return;
    const hot = s === CAST || (s === RECOVER && t < 0.3), c1 = hot ? EL[1] : EL[2], c2 = hot ? EL[2] : EL[3], R1 = 6 * sc, R2 = 3 * sc;
    const n1 = 20, n2 = 10;
    for (let k = 0; k < n1; k++) { if ((k + (hot ? 0 : f12)) & 1) continue; const a = k / n1 * 6.2832; put(RD(DCX + Math.cos(a) * R1), RD(TGY + Math.sin(a) * R1 * 0.8), c1); }
    for (let k = 0; k < n2; k++) { const a = k / n2 * 6.2832 + 0.3; put(RD(DCX + Math.cos(a) * R2), RD(TGY + Math.sin(a) * R2 * 0.8), c2); }
    const L = RD(8 * sc); for (let r = 1; r <= L; r++) { if (r > 1 && r < RD(3 * sc)) continue; const c = r >= L - 1 ? c2 : c1; put(DCX + r, TGY, c); put(DCX - r, TGY, c); if (r <= RD(6 * sc)) { put(DCX, TGY + r, c); put(DCX, TGY - r, c); } }
    put(DCX, TGY, hot && (f12 & 1) ? EL[0] : EL[1]);
    for (let m = 0; m < marks && sc > 0.5; m++) { const x = DCX + 9 + m * 2, cN = m === marks - 1 && stabT < 2 / 12 ? EL[0] : EL[1]; for (let y = -2; y <= 2; y++) put(x, TGY + y, y === -2 ? EL[0] : cN); }
  }
  function fxFront(f12) {
    duelTarget(f12);
    if (stabT < 2 / 12) {                                                              // 突刺拖影：剑尖后一道红白直线（第 1 帧 2 行白 / 粉，第 2 帧 1 行断续暗红）
      const f1 = stabT < 1 / 12, len = stabBig ? 18 : 12;
      for (let k = 0; k <= len; k++) { if (!f1 && (k & 1)) continue; const c = f1 ? (k < len * 0.45 ? EL[0] : EL[1]) : EL[2]; put(stabX - k, stabY, c); if (f1 && k > 2 && k < len - 2) put(stabX - k, stabY + 1, k < len * 0.5 ? EL[1] : EL[2]); }
      if (f1) { put(stabX + 1, stabY, STL[0]); put(stabX, stabY - 1, STL[1]); put(stabX, stabY + 1, STL[1]); }
    }
    if (crossT < 0.4) {                                                              // 十字斩花：两道 45° 交叉斩线（第 1 帧白、之后粉 / 红断续）
      const q = crossT / 0.4, L = RD(9 - 3 * q), c0 = q < 0.2 ? EL[0] : q < 0.6 ? EL[1] : EL[2];
      for (let r = -L; r <= L; r++) { if (q > 0.5 && (r & 1)) continue; put(crossX + r, crossY + r, Math.abs(r) < 3 ? EL[0] : c0); put(crossX + r, crossY - r, Math.abs(r) < 3 ? EL[0] : c0); }
    }
    if (tapT < 1 / 12) { const x = wx(9), y = wy(-22); put(x, y, STL[0]); put(x + 1, y - 1, STL[1]); put(x - 1, y - 1, STL[1]); }
  }

  return {
    name: '角斗士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.light, M.eye], HIT_POINT: [1, -15], EVENTS,
    REVIVE: { dy: -14, ramp: 'blood' },
    SFX: { body: 'flesh', how: 'topple', pal: 'blood', style: 'blade', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
