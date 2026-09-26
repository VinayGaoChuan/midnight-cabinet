// 混沌屠夫（敌人 · 混沌 · 神话 · 近战 range 408，batch-06）：「能死后复生的恶魔领主」——巨型肥胖的暗紫红恶魔，头小、肚子前凸、站着往后仰；
// 识别：头顶一对盘卷的黑羊角、双手竖握一支比身高还长的倒钩毒尖长矛（44 格，矛头凹槽盛着荧绿毒液，尖端挂一滴）、
// 腰间一圈铁链挂三只屠宰肉钩（前后两只垂在肚子两侧晃），血污白围裙从胸口盖到膝盖。
// 攻击 = 刺：双手握矛后引，再向前平刺（身体只前冲 2 格，矛尖伸出 12 格）。
// 技能 = 特性「毒尖长矛」（每秒对目标额外造成毒伤）：长矛后拉压低，毒液一滴滴汇聚到矛尖 → 长距突刺钉住目标（绿色刺痕 + 星芒）→ 目标中毒冒毒雾，每 0.35 s 跳一次毒（共 3 跳）→ 拔矛带出一串毒滴。
// 死亡 = 跪倒后前扑，长矛和两只肉钩甩飞；身体化成肉块堆在地上（死亡套件 chunks），胸口一颗毒绿的心脏又跳三下才熄灭。
PCD.define('ChaosButcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, death, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, px = parts.px;

  // ───── 元素：毒尖 · 腐毒绿（poison：白 → 淡黄绿 → 黄绿 → 绿 → 墨绿）─────
  const R_EL = FXI.poison, EL = FXR[R_EL], R_IMP = FXI.impact, R_ST = FXI.steel;

  // ───── 材质 ─────
  const DEMON = ['#1c0814', '#3d1026', '#621c3a', '#8c3050'];         // 暗紫红恶魔皮（blood 暗段偏紫）
  const M = parts.mats(E, {
    skin: { r: DEMON, band: 2 },                                       // 躯干（大面积）
    limb: DEMON,                                                       // 手臂、头、手（小块，band 1）
    apron: { r: 'bone', band: 2 }, stain: 'blood', strap: 'leather',
    horn: [0, 8, 9, 10], hoof: [0, 0, 52, 53], iron: 'iron', steel: 'steel', chain: 'iron', hook: 'steel',
    tongue: 'pink', tusk: 'bone',
    glow: { r: [48, 49, 50, 38], flat: 1 },                            // 毒槽 / 毒滴（发光体）
    hot: { r: [49, 50, 38, 21], flat: 1 },                             // 蓄满 / 施放
    eye: { r: [48, 49, 50, 38], flat: 1 },
  });
  const BODY = { body: 'fat', leg: 11, torso: 13, head: 6, headW: 6, sw: 7, belly: 4, arm: 12, lw: 4, limb: 1.6, stride: 3, fall: 'front' };
  const HX = 54, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(104, 60, 52, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'hot', 'eye', 'iron', 'ironD', 'chain', 'chainD', 'tongue', 'tongueD', 'horn', 'hornD']) RIM.skip[M[k]] = 1;

  // ───── 长矛几何：前手握点 (hx, hy)、角度 a、握点到銎的杆长 len；总长 44（按吸附斜率折算），后手握在杆上第 bk 步 ─────
  const SP_TOT = 44, HEAD = ['.TTT.', 'BMGMB', '.MGM.', 'BMGMB', '.MGM.', '.MGM.', '..M..', '..H..'], HL = HEAD.length;
  function spGeo(gx, gy, a, len) {
    const di = parts.snapDir(a), c = parts.cell(di, 0, 0, 8), sx = Math.sign(c[0]), sy = Math.sign(c[1]), maj = Math.max(Math.abs(c[0]), Math.abs(c[1])) / Math.hypot(c[0], c[1]);
    const x0 = sx < 0 ? gx - 1 : gx, y0 = sy < 0 ? gy - 1 : gy, n = RD(len * maj), back = RD(SP_TOT * maj) - HL - n;
    return { di, x0, y0, n, back, at: (k) => parts.cell(di, x0, y0, k), tip: parts.cell(di, x0, y0, n + HL - 1), socket: parts.cell(di, x0, y0, n) };
  }

  // ───── 姿势：前手 hx hy a len（握矛）、后手握在杆上第 bk 步 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, len: 0, bk: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, belly: 4, tongue: 0, drop: 1, sp: 0, hk: 0, kit: 0, oh: 0, dq: 0, dqi: 0, st: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, len, bk, lean, head, crouch) => ({ hx, hy, a, len, bk, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(12, -16, 0, 17, 7, -1);                             // 竖握长矛（矛尾拄地），后仰挺肚
  const K_LICK = K(2, -19, Math.atan2(2, 1), 10, -6, 1, 1);             // 待机个性：把矛头凑到嘴边，伸舌头舔掉毒滴
  const K_WIND = K(3, -19, HALF, 18, -9, -1, 0, 1);                     // 攻击：后引
  const K_THRUST = K(11, -18, HALF, 20, -8, 1, 1, 1);                   //       平刺
  const K_HOLD = K(10, -18, HALF, 20, -8, 1, 0, 1);
  const K_CHARGE = K(0, -14, HALF, 12, -8, -1, 0, 2);                   // 技能：长矛后拉、压低
  const K_CAST = K(12, -17, HALF, 24, -6, 2, 1, 1);                     //       长距突刺
  const K_PULL = K(6, -17, HALF, 18, -7, 0, 0, 1);                      //       拔矛
  const K_HURT = K(11, -17, -0.3, 17, 7, -1, -1);
  const K_KNEEL = K(12, -10, 0.46, 10, 6, 1, 1, 4);                   // 跪下，长矛斜拄在身前
  const FIELDS = ['hx', 'hy', 'a', 'len', 'bk', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -16, 24], ['hy', -32, 4], ['ai', -40, 40], ['len', 0, 30], ['bk', -12, 12], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['belly', 3, 6], ['tongue', 0, 6], ['drop', 0, 1], ['sp', 0, 3], ['hk', 0, 12], ['kit', 0, 1], ['oh', 0, 1], ['dqi', 0, 24], ['st', 0, 8]]);
  const SWAY = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_HIT = 1 / 12, T_TICK = 0.35, T_LAND = INCOMING + 0.66, T_SLIP = INCOMING + 0.3;
  const TICKS = [[CAST, T_HIT], [CAST, T_HIT + T_TICK], [RECOVER, T_HIT + 2 * T_TICK - DUR[CAST]]];   // 毒伤 3 跳（「每秒」的节拍）
  const BEATS = [0.2, 0.5, 0.8];                                        // 死后心脏又跳三下（落地后秒数）
  const LICK0 = 1.4;                                                    // 待机个性：循环内 1.4 s 起 8 帧
  // [K_LICK 混合量, 舌长, 毒滴还在]
  const LICK = [[0.5, 0, 1], [1, 0, 1], [1, 3, 1], [1, 6, 1], [1, 6, 0], [1, 2, 0], [0.5, 0, 0], [0.15, 0, 1]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.bob = 0; P.flip = 0; P.mx = 0; P.belly = 4; P.tongue = 0; P.drop = 1; P.sp = 0; P.hk = 0; P.kit = 0; P.oh = 0; P.dq = 0;
    const idle = () => {                                                // 呼吸：肚子随呼吸大幅起伏
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.belly = 4 + P.bob; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[FL(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= LICK0 - 1e-6 && lp < LICK0 + LICK.length / 12) { const c = LICK[Math.min(LICK.length - 1, f12of(lp - LICK0))]; setK(K_IDLE, K_LICK, c[0]); P.tongue = c[1]; P.drop = c[2]; P.bob = 0; P.belly = 4; P.glint = c[1] >= 6 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 重步蹒跚：接触帧身体顿 1 格、肚子晃一下
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq)); P.hx += P.step * 0.6; P.a += P.step * 0.06; P.belly = P.step !== 0 ? 5 : 4; P.beard *= 2;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.1))); P.beard = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_THRUST, K_THRUST, 0); P.bx = 2; P.beard = -2; P.sway = -2; P.glint = 1; }
      else if (tq < 0.45) { setK(K_THRUST, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 2; P.beard = -1; P.sway = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 长矛后拉、压低；矛尖 1 → 2 档；最后 0.3 s 发抖
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = 1 + (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = 1; P.belly = 5;
      if (tq > 1.1) P.bx = (f12 & 1) ? -1 : 0;
    } else if (st === CAST) {                                           // 长距突刺：身体前冲 4 格
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.1))); P.bx = tq < 1 / 12 ? 2 : 4; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -2; P.glint = tq < 2 / 12 ? 1 : 0;
    } else if (st === RECOVER) {                                        // 拔矛（倒钩带出毒滴）→ 回到竖握
      if (tq < 0.17) { setK(K_CAST, K_PULL, ease.out(tq / 0.17)); P.bx = 3; P.beard = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.17) / 0.45)); setK(K_PULL, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
      P.gem = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.35 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.belly = 5; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 跪倒 → 前扑（长矛、肉钩甩飞）→ 落地化成肉块（死亡套件）→ 心脏跳三下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.beard = 2; P.sp = d < 0.42 ? 0 : 1; P.gem = (f12 & 1) ? 2 : 1; }
      else if (d < T_LAND - INCOMING - 1e-6) { setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.crouch = 0; P.lean = 0; P.head = 0; P.bx = -1; P.eyes = 1; P.lift = d < 0.58 ? 3 : 1; P.sp = 2; P.hk = d < 0.58 ? 4 : 8; P.gem = 4; }
      else { setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.crouch = 0; P.lean = 0; P.head = 0; P.oh = 1; P.sp = 3; P.hk = 12; P.gem = 4; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }   // 之后死亡套件接管身体，精灵里只剩甩开的长矛和肉钩
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.belly = 4;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const cr = P.lying ? 0 : Math.min(3, RD(P.crouch)), yo = cr + (P.lying ? 0 : P.bob);
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.len = RD(P.len); P.bk = RD(P.bk);
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 24);
    const G = spGeo(P.hx, P.hy, P.a, P.len), b = G.at(P.bk); P.bhx = b[0]; P.bhy = b[1];
    if (P.lying || P.sp) { P.gx = -46 + P.bx; P.gy = -2; }
    else { P.gx = G.tip[0] + P.bx; P.gy = G.tip[1]; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：barbSpear 倒钩毒尖长矛——吸附斜率的 1 格铁杆（每 9 格一道亮箍）+ 8 步的锯齿倒钩矛头（两排倒钩，中间一道发光毒槽，5 档亮度）
  //   + 挂在矛尖旁的一滴毒液（drop）。一个部件（毒槽和铁之间是自动明暗，不压分界线）。geo = spGeo(...)，T 是 rig 或 parts.FREE
  const GLV = [[M.glow, 2, 2], [M.glow, 3, 2], [M.glow, 3, 3], [M.hot, 4, 3], [M.glow, 1, 1]];   // [材质, 奇数行色调, 偶数行色调]
  function barbSpear(T, G, lv, drop) {
    E.part(); const L = GLV[lv];
    parts.bar(G.di, G.x0, G.y0, -G.back, G.n - 1, 1, (k, j, X, Y) => { const b = ((k + G.back) % 9) === 4; px(E, T, X, Y, b ? M.steel : M.iron, 4); });
    for (let i = 0; i < HL; i++) {
      const row = HEAD[i];
      parts.bar(G.di, G.x0, G.y0, G.n + i, G.n + i, 5, (k, j, X, Y) => {
        const ch = row[j]; if (ch === '.') return;
        if (ch === 'T') px(E, T, X, Y, M.iron, j === 1 ? 4 : j === 3 ? 2 : 3);
        else if (ch === 'B') px(E, T, X, Y, M.steel, j === 0 ? 4 : 2);
        else if (ch === 'G') px(E, T, X, Y, L[0], (i & 1) ? L[1] : L[2]);
        else if (ch === 'H') px(E, T, X, Y, lv >= 2 && lv <= 3 ? M.hot : M.steel, 4);
        else px(E, T, X, Y, M.steel, j === 1 ? 4 : j === 3 ? 2 : 3);
      });
    }
    if (drop && lv !== 4) parts.bar(G.di, G.x0, G.y0, G.n + HL - 2, G.n + HL - 2, 3, (k, j, X, Y) => { if (j === 2) px(E, T, X, Y, M.glow, 3); });
  }
  // 候选部件：meatHook 屠宰肉钩——挂环 + 竖柄 + J 形弯钩（钩尖朝上、尖端 1 格亮）；sw = 钩身摆（下半截错开的格数），rot 0–3 转 90°（掉在地上）
  const HOOK = [[0, 0, 4], [0, 1, 3], [0, 2, 3], [0, 3, 3], [0, 4, 2], [1, 5, 2], [2, 4, 3], [2, 3, 4]];
  function meatHook(T, x, y, sw, rot) {
    for (const [dx, dy, t] of HOOK) {
      let X = dx + (dy >= 3 ? sw : 0), Y = dy, s;
      if (rot === 1) { s = X; X = -Y; Y = s; } else if (rot === 3) { s = X; X = Y; Y = -s; }
      px(E, T, x + X, y + Y, M.hook, t);
    }
  }
  // 候选部件：hookBelt 腰链挂肉钩——沿腰线一圈铁链（亮暗链节交替，压在围裙上）+ 三截短链各挂一只肉钩：后腰、肚子正前（这两只在轮廓外）、围裙中间；
  //   钩子随 beard 摆。mask 按位决定画哪几只（1 后 · 2 中 · 4 前）。一个部件
  function hookBelt(R, mask) {
    E.part(); const y = R.yWaist, e = parts.edges(R, y), L = e[0] - 1, Rr = e[1] + 2, sw = RD((P.beard || 0) * 0.5);
    for (let x = L; x <= Rr; x++) px(E, R, x, y, M.chain, (x & 1) ? 4 : 2);
    const at = [[L, 1, 1], [RD((L + Rr) / 2) + 1, 1, 2], [Rr, 2, 4]];
    for (const [x, len, bit] of at) {
      if (!(mask & bit)) continue;
      for (let k = 1; k <= len; k++) px(E, R, x, y + k, M.chain, (k & 1) ? 3 : 2);
      meatHook(R, x, y + len + 1, bit === 2 ? 0 : sw, 0);
    }
  }
  // 候选部件：curlHorn 盘卷大羊角——2 格粗的角身沿路径盘卷，每隔一格一道亮环纹，末端 3 格收成 1 格、角尖最亮。
  //   HORN_F 远侧角：从头顶往前上拱起、角尖朝前下勾（画在头之前，暗一级）；HORN_N 近侧角：从头顶往后盘成一圈、角尖回到耳旁（画在头之后）。各伸出头外 4–5 格。
  //   坐标相对 (R.hx, R.htop)，跟着 rig 转（倒地时一起转）。一个部件
  const HORN_N = [[-1, 0], [-2, -1], [-3, -2], [-4, -3], [-5, -3], [-6, -2], [-7, -1], [-7, 0], [-7, 1], [-6, 2], [-5, 3], [-4, 3], [-3, 2]];
  const HORN_F = [[1, 0], [2, -1], [3, -2], [4, -3], [5, -3], [6, -2], [7, -1], [7, 0], [7, 1]];
  function curlHorn(R, path, m) {
    E.part(); const n = path.length;
    for (let i = 0; i < n; i++) {
      const x = R.hx + path[i][0], y = R.htop + path[i][1], thin = i >= n - 3, tip = i === n - 1;
      px(E, R, x, y, m, tip ? 4 : (i & 1) ? 4 : 3);
      if (!thin) { const q = path[Math.min(n - 1, i + 1)], dx = q[0] - path[i][0], dy = q[1] - path[i][1]; px(E, R, x - (dy !== 0 && dx === 0 ? Math.sign(path[i][0]) : 0), y + (dx !== 0 ? 1 : 0), m, (i & 1) ? 2 : 1); }
    }
  }
  function tongue(R, n) {                                              // 伸长的舌头（并进脸的部件）：从嘴角伸向矛头
    if (!n) return; const x = R.hx1 + 1, y = Math.min(R.hy, R.ey + 3);
    for (let k = 0; k < n; k++) px(E, R, x + k, y - FL(k / 3), M.tongue, k === n - 1 ? 4 : (k & 1) ? 2 : 3);
    if (n >= 5) px(E, R, x + n - 1, y - FL((n - 1) / 3) - 1, M.tongue, 3);
  }
  const SP_GROUND = spGeo(-31, -1, -HALF, 10), SP_FALL = spGeo(-8, -12, -Math.atan2(2, 1), 12);   // 倒地：长矛落在身后地上 / 半空中翻落
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, Object.assign({}, BODY, { belly: P.belly }));
    const G = spGeo(P.hx, P.hy, P.a, P.len), lv = P.gem;
    if (!P.kit) {                                                      // 甩飞的长矛和两只肉钩（不跟身体转）
      if (P.sp === 1) barbSpear(R, spGeo(P.hx - 2, P.hy - 2, -0.8, P.len), 4, 0);
      else if (P.sp >= 2) { barbSpear(parts.FREE, P.sp === 2 && P.lift ? SP_FALL : SP_GROUND, 4, 0); }
      if (P.hk) { E.part(); const q = P.hk / 12; meatHook(parts.FREE, RD(18 + 14 * q), RD(-10 + 9 * q - Math.sin(q * Math.PI) * 6), 0, P.hk >= 12 ? 1 : 0); meatHook(parts.FREE, RD(-10 - 8 * q), RD(-12 + 11 * q - Math.sin(q * Math.PI) * 5), 0, P.hk >= 12 ? 3 : 0); }
    }
    if (P.oh) return;
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.limbD, grip: 'none', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'shoe', mat: M.limb, matD: M.limbD, boot: M.hoof, bootD: M.hoofD });
    parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    parts.apron(E, R, P, { mat: M.apron, strap: M.strap, stain: M.stain });
    hookBelt(R, P.hk ? 2 : 7);
    curlHorn(R, HORN_F, M.hornD);
    parts.head(E, R, P, { mat: M.limb, face: 'square', age: 'rugged', eye: M.eye, eyeStyle: 'glow', nose: 'big', mouth: P.tongue ? 'none' : 'wide', ear: 'none' });
    px(E, R, R.hx1, R.hy, M.tusk, 4); px(E, R, R.hx1, R.hy - 1, M.tusk, 3);   // 下獠牙（并进脸）
    tongue(R, P.tongue);
    curlHorn(R, HORN_N, M.horn);
    if (!P.sp) { barbSpear(R, G, lv, P.drop); parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.limbD, grip: 'big' }); }
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.limb, cuff: M.iron, cuffStyle: 'bracer', hand: M.limb, grip: 'big', at: [P.hx, P.hy] });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let trT = 9, trX = 0, trY = 0, castT = 9, beamX0 = 0, landT = -9, chargeAcc = 0, dripAcc = 0, soulAcc = 0, lastStep = 0, smokeT = 9;
  const DROPX = [];
  function tipW() { return [wx(P.gx), wy(P.gy)]; }
  function onEnter(s) {
    if (s === CAST) {                                                  // 突刺：蓄力粒子外爆、绿色刺痕、矛尖星芒、震屏 2 格、天空闪白
      const g = spGeo(K_CHARGE.hx, K_CHARGE.hy, HALF, K_CHARGE.len); beamX0 = wx(g.tip[0]);
      releaseOrbit(40, 110, 0.3, 0.6, { up: 4 }); castT = 0;
      fx.beam(beamX0, wy(g.tip[1] + 2), DUMMY_X + 3, wy(g.tip[1] + 2), 1, R_EL, 0.1, 2);
      shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) {                                               // 拔矛：倒钩带出一串毒滴
      DROPX.length = 0; const x0 = DUMMY_X - 8;
      for (let i = 0; i < 9; i++) { const x = x0 + Math.random() * 10; DROPX.push(RD(x)); spawnX(K_PHYS, x, wy(-16) + Math.random() * 3, -20 - Math.random() * 30, -20 - Math.random() * 30, 0.9 + Math.random() * 0.3, R_EL, { g: 220, floor: HY, age0: 0.1 }); }
      smokeT = 0;
    }
  }
  function tick(i) {                                                   // 毒伤一跳：小外爆 + 小冲击环 + 毒泡
    const x = DUMMY_X - 1, y = HY - 16 + i * 2;
    if (i === 0) {
      dummyFx({ dur: 1.35, tint: 'poison', slow: 0.5 }); hitDummy(1);
      burst(x - 2, y, 26, 50, 140, 0.25, 0.6, R_EL, 12); ring(x - 2, y, 1, R_EL); fx.cross(x - 3, y, 7, R_EL, 0.3); fx.cloud(DUMMY_X, HY - 35, 6, R_EL, 1.2, 2);
      shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.95 });
    } else {
      hitDummy(0); burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 18); ring(x, y, 0, R_EL);
      for (let k = 0; k < 3; k++) spawn(K_RISE, x - 4 + Math.random() * 8, HY - 30 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.5, R_EL);
      sfx('impact', { pal: 'poison', w: 0.45 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                                // 平刺：刺痕 2 帧、命中火花
      const g = tipW(); trT = 0; trX = g[0]; trY = g[1];
      hitDummy(0); const x = Math.min(g[0], DUMMY_X - 2); burst(x, g[1], 12, 40, 110, 0.15, 0.35, R_IMP, 10); fx.cross(x, g[1], 4, R_IMP, 0.2);
      spawnX(K_PHYS, x, g[1], -10, -30, 0.6, R_EL, { g: 200, floor: HY, age0: 0.1 });   // 甩出一滴毒
      sfx('swing', { kind: 'thrust', w: 0.9 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    for (let i = 0; i < TICKS.length; i++) if (s === TICKS[i][0] && Math.abs(t - TICKS[i][1]) < 1e-9) tick(i);
    if (s === RECOVER && Math.abs(t - 0.4) < 1e-9) for (const x of DROPX) spawnX(K_RISE, x, HY - 1, (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.6, FXI.dust, { age0: 0.2 });   // 毒滴落地冒烟
    if (s === DEATH && Math.abs(t - T_SLIP) < 1e-9) { sfx('swing', { kind: 'thrust', w: 0.3 }); }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                   // 前扑落地：化成肉块堆在地上
      poseAt(DEATH, T_LAND - 1 / 12, T_LAND - 1 / 12); P.lift = 0; P.kit = 1; KEY(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.35, fromX: 8, fromY: -6, push: 4, fadeAt: 0.95, fadeDur: 0.7, ramp: R_EL });
      for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 10 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      landT = E.simT; shake(0.14, 1); sfx('fall', { w: 0.95 });
    }
    if (s === DEATH) for (let i = 0; i < BEATS.length; i++) if (Math.abs(t - (T_LAND + BEATS[i])) < 1e-9) { const h = heartW(); burst(h[0], h[1], 8 - i * 2, 20, 50, 0.2, 0.4, R_EL, 10); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [TICKS[0][1], TICKS[1][1]], [TICKS[2][1], 0.4], [], [T_SLIP, T_LAND].concat(BEATS.map((b) => T_LAND + b)), []];
  const heartW = () => [HX + 7, HY - 4];
  function stepFX(dt, state, stT) {
    const g = tipW();
    if (state === CHARGE) {                                            // 毒液一滴滴汇聚到矛尖 + 矛尖往下滴毒
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, g[0], g[1], (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      dripAcc += dt * (stT > 0.5 ? 6 : 2); while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, g[0] + (Math.random() - 0.5) * 2, g[1] + 2, 0, 5, 0.9, R_EL, { g: 180, floor: HY, age0: 0.15 }); }
    }
    if (state === IDLE && P.drop && !P.tongue) { dripAcc += dt * 0.8; while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, g[0] + 1, g[1] + 1, 0, 4, 1.0, R_EL, { g: 160, floor: HY, age0: 0.2 }); } }
    if (state === MOVE && P.step !== lastStep) {                       // 重步：接触帧 3–4 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.95 }); const fx0 = wx(P.step > 0 ? 7 : -5); for (let i = 0; i < 4; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === RECOVER && stT < 0.45) { dripAcc += dt * 10; while (dripAcc >= 1) { dripAcc -= 1; spawn(K_EMBER, g[0], g[1], (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.55 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, Math.random() < 0.6 ? FXI.soul : R_EL); } }
    trT += dt; castT += dt; smokeT += dt;
  }
  function fxReset() { trT = 9; castT = 9; landT = -9; chargeAcc = 0; dripAcc = 0; soulAcc = 0; lastStep = 0; smokeT = 9; DROPX.length = 0; }
  function fxBack(f12) { if (!P.lying && !P.sp && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() {                                                   // 死亡套件接管后：精灵里只剩甩开的长矛和肉钩，自己画
    if (!(death.active && P.oh)) return;
    const s = hero, o = s.out, x0 = HX + P.mx - s.ox, y0 = HY - s.oy;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c !== 255) put(x0 + x, y0 + y, c); }
  }
  const HEART_BIG = ['.X.X.', 'XXXXX', '.XXX.', '..X..'], HEART_SMALL = ['X.X', 'XXX', '.X.'];
  function fxFront(f12) {
    const g = tipW();
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && !P.sp && P.dq < 1) {   // 矛尖十字星芒
      const L = P.gem === 3 ? 6 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]) : (r === 2 ? EL[1] : EL[2]); put(g[0] + r, g[1], c); put(g[0], g[1] - r, c); put(g[0], g[1] + r, c); if (P.gem === 3) put(g[0] - r, g[1], c); }
    }
    if (trT < 2 / 12) {                                                // 平刺的刺痕（矛身上下两道速度线）
      const c = trT < 1 / 12 ? FXR[R_ST][1] : FXR[R_ST][3];
      for (let x = trX - 22; x <= trX - 9; x++) { if (trT >= 1 / 12 && (x & 1)) continue; put(x, trY - 3, c); if (x > trX - 17) put(x, trY + 3, c); }
    }
    if (castT < 0.25 && E.state === CAST) {                            // 长距突刺的残影线（身后 3 道拉长的毒绿速度线）
      const c = castT < 1 / 12 ? EL[1] : EL[3];
      for (let k = 0; k < 3; k++) { const y = g[1] - 4 + k * 4, x1 = g[0] - 10 - k * 3; for (let x = beamX0 - 6; x <= x1; x++) if (castT < 1 / 12 || ((x + k) & 1)) put(x, y, c); }
    }
    if (death.active && landT > -9) {                                  // 胸口的毒绿心脏：又跳三下才熄灭
      const t = E.simT - landT, h = heartW(); if (t > 1.3) return;
      let big = false; for (const b of BEATS) if (t >= b && t < b + 0.12) big = true;
      const dead = t > 1.0, S = big ? HEART_BIG : HEART_SMALL, ox = h[0] - FL(S[0].length / 2), oy = h[1] - FL(S.length / 2);
      if (dead && t > 1.15 && (f12 & 1)) return;
      for (let j = 0; j < S.length; j++) for (let i = 0; i < S[j].length; i++) if (S[j][i] === 'X') {
        const core = big ? (j === 1 && i >= 1 && i <= 3) : (j === 1 && i === 1);
        put(ox + i, oy + j, dead ? (core ? EL[3] : EL[4]) : big ? (core ? EL[0] : EL[1]) : (core ? EL[1] : EL[2]));
      }
    }
  }

  return {
    name: '混沌屠夫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow, M.hot, M.eye], HIT_POINT: [4, -18], EVENTS, deathKit: { mode: 'chunks', at: T_LAND },
    SFX: { body: 'flesh', how: 'collapse', pal: 'poison', style: 'poison', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
