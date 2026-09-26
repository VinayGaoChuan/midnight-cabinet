// 骸骨法师（部队 · 骷髅 · 祭司 · 优质）：逃兵升级而来的高个骷髅祭司——同一顶凹陷破锅盔倒扣着戴、盔沿插三根蜡烛（中间高两边低）变成烛台冠，
// 逃兵脖子上的蓝布条长成整面军旗裹身当长袍（旗角金穗拖在身后），双手举着断旗杆当法杖，杖顶横梁吊一只铜铃摆（像节拍器），背后断箭从袍子破洞里露出箭羽。
// 攻击 = 旗杖往前一顿，铃摆「叮」地甩出一颗旋转的铃音弹；技能 = 特性「充能」（中范围攻速光环）：铃摆越摆越急、烛火被吸成螺旋、脚下 8 格节拍刻度逐格充满 →
// 旗杖往地上一顿，刻度盘炸成三道节拍波纹贴地扩散成中范围光环 → 圈里的友军被电黄描边、头顶上升箭头、身后速度线；光环跟着铃摆节拍转刻度，收招时抖散。
PCD.define('Mage', (E) => {
  const { parts, Sprite, bake, begin, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, INCOMING, DUMMY_X, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：迅捷 · 电黄节拍（FXI.bolt）─────
  const R_EL = FXI.bolt, EL = FXR[R_EL], FI = FXR[FXI.fire];

  const M = parts.mats(E, {
    robe: { r: 'blue', band: 2 }, gold: 'gold', bone: 'bone', helm: 'iron', rust: [0, 20, 19, 32], wax: 'white', pole: 'wood', band: 'iron', bell: [0, 20, 19, 14],
    shaft: 'wood', fletch: 'white', ink: { r: 'ink', flat: 1 }, eye: { r: [35, 36, 37, 38], flat: 1 },
    flame: { r: [45, 46, 47, 21], flat: 1 }, tongue: { r: [22, 14, 51, 21], flat: 1 },
  });
  const BODY = { body: 'tall', sw: 4, headX: 1 };                      // 高个长袍档：比逃兵高 4 格、腰背挺直
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(60, 50, 28, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'eye', 'flame', 'tongue', 'pole', 'wax', 'bone', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 旗杆下段（hx, hy），后手 = 旗杆上段（bhx, bhy）；杖身竖直：杖尾 = hy + 14，杖顶 = hy − 16 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, bell: 0, nod: 0, fl: 0, lit: 1, noProp: 0, buff: 0, jaw: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, lean, head, crouch) => ({ hx, hy, bhx: hx, bhy: hy - 6, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(7, -14);
  const K_WIND = K(6, -17, -1, -1);                                     // 预兆：旗杖提起往后收
  const K_THUD = K(10, -14, 1, 1);                                      // 往前一顿：杖尾顿地
  const K_HOLD = K(9, -14, 1, 0);
  const K_CHARGE = K(8, -17, -1, -1);                                   // 蓄力：旗杖举高，仰头看铃摆
  const K_PLANT = K(9, -15, 1, 1, 1);                                   // 施放：旗杖往地上一顿（身子压低 1 格，杖尾正好顿在地面）
  const K_HURT = K(5, -13, -1, -1);
  const K_SAG = K(6, -12, 1, 1, 2);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 20], ['hy', -30, 5], ['bhx', -16, 20], ['bhy', -36, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqk', 0, 48], ['st', 0, 8],
    ['bell', -3, 3], ['nod', 0, 1], ['fl', 0, 3], ['lit', 0, 2], ['noProp', 0, 1], ['buff', 0, 1], ['jaw', 0, 1]]);
  const SWAY_IDLE = [0, 1, 0, -1], TICK = [0, 1, 2, 1, 0, -1, -2, -1];   // 铃摆节拍：8 帧一个来回
  const WALK_STAFF = [[1, 0], [1, -1], [0, -1], [0, 0]];
  const T_THUD = 2 / 12, T_REACH = 2 / 12, T_MELT = INCOMING + 0.55, T_ROLL = INCOMING + 1.05;
  const staffTop = () => [P.hx, P.hy - 16];
  const bellPos = () => { const t = staffTop(); return [t[0] + 3 + P.bell, t[1] + 7]; };   // 铃舌（发光体）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.bell = 0; P.nod = 0; P.fl = f12 & 3; P.lit = 1; P.noProp = 0; P.buff = 0; P.jaw = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.bell = TICK[f12 & 7];                                            // 铃摆按固定节拍左右摆
      const lp = tq % DUR[IDLE]; if (lp >= 1.9 && lp < 2.3) { const f = Math.floor((lp - 1.9) * 12 + 1e-6); P.nod = f === 0 || f === 2 ? 1 : 0; }   // 待机个性：循环末尾跟着节拍点两下头
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 杖点地滑步：长袍拖地看不见脚，每两步旗杖点地一次
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = f === 0 ? 1 : 0; P.hx += WALK_STAFF[f][0]; P.hy += WALK_STAFF[f][1]; P.bhx = P.hx; P.bhy = P.hy - 6;
      P.bell = [-1, -2, 1, 2][f]; const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.bell = -2; P.gem = 1; }
      else if (tq < 0.25) { setK(K_THUD, K_THUD, 0); P.bell = 3; P.gem = 2; P.rim = 2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_THUD, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.bell = TICK[(f12 + 2) & 7]; P.gem = 1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.bell = TICK[f12 & 7]; }
    } else if (st === CHARGE) {                                          // 铃摆越摆越急（摆幅 1 → 3），烛火被吸走
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      const A = 1 + 2 * clamp01(tq / 1.0), ph = 2 * Math.PI * (1.2 * tq + 1.6 * tq * tq); P.bell = RD(A * Math.sin(ph));
      P.buff = 1; P.lit = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.jaw = tq > 1.0 ? (f12 & 1) : 0;
    } else if (st === CAST) {                                            // 顿杖：铃被震到最前，随后左右大幅回荡、逐渐收小
      const fi = Math.floor(tq * 12 + 1e-6); setK(K_CHARGE, K_PLANT, ease.out(clamp01(tq / 0.08)));
      P.bell = fi < 2 ? 3 : RD(((fi & 1) ? -3 : 3) * Math.max(0.4, 1 - (fi - 2) * 0.12)); P.buff = 1; P.lit = 2; P.gem = fi < 3 ? 3 : 2; P.rim = fi < 3 ? 3 : 2; P.sway = -1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PLANT, K_IDLE, q); P.bell = RD(TICK[f12 & 7] * (0.5 + q * 0.5)); P.buff = q < 0.5 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.bell = -3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.bell = 2; P.sway = 1; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.bell = -1; }
    } else if (st === DEATH) {                                           // 融化：挨打 → 蜡烛倒下熄灭 → 长袍连骨架像蜡一样按列塌成一滩（死亡套件 melt）→ 锅盔和铃铛从滩里滚出
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.bell = -3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; }
      else { setK(K_SAG, K_SAG, 0); P.bx = -2; P.eyes = 1; P.lit = 0; P.bell = (f12 & 1) ? 1 : -1; P.jaw = f12 & 1; P.sway = 1; P.gem = 4; if (d >= T_MELT - INCOMING) { P.dq = 1; P.noProp = 1; } }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.bell = Math.max(-3, Math.min(3, RD(P.bell))); P.dqk = RD(P.dq * 48);
    const g = bellPos(); P.gx = g[0] + P.bx; P.gy = g[1];
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function run2(T, y, x0, x1, m) { for (let x = x0; x <= x1; x++) px(E, T, x, y, m, 0); }
  // 候选部件：candleCrown —— 倒扣的凹陷破锅盔当烛台冠：窄口扣在头上、宽沿朝上（左端凹进去耷拉一格），沿上插三根蜡烛（中 4 格高、两边 2 格），烛火是发光体（lit 0 灭 · 1 摇曳 · 2 被吸得老高）
  function candleCrown(T, a, b, top, o) {
    E.part(); const m = o.mat, cx = RD((a + b) / 2);
    run2(T, top, a, b, m); run2(T, top - 1, a - 1, b + 1, m); run2(T, top - 2, a - 2, b + 3, m); px(E, T, a - 3, top - 1, m, 0); px(E, T, a - 1, top - 1, m, 1);
    px(E, T, b + 3, top - 2, m, 4); px(E, T, b, top - 1, o.rust, 3); px(E, T, a + 1, top, o.rust, 2);
    const C = [[a - 1, 2], [cx, 4], [b + 2, 2]];
    E.part();
    for (const [x, h] of C) for (let k = 1; k <= h; k++) px(E, T, x, top - 2 - k, o.wax, k === h ? 4 : 3);
    px(E, T, cx + 1, top - 3, o.wax, 2); px(E, T, a - 1, top - 3, o.wax, 2);   // 蜡泪
    if (!o.lit) return;
    E.part();
    C.forEach(([x, h], i) => {                                           // 三根烛火错相位摇曳
      const y = top - 2 - h - 1, ph = (o.fl + i * 3) & 3, tall = o.lit === 2 ? 2 : ph === 0 ? 0 : 1, lean = o.lit === 2 ? 1 : ph === 2 ? -1 : 0;
      px(E, T, x, y, o.flame, 4); if (tall >= 1) px(E, T, x + (ph === 1 ? lean : 0), y - 1, o.flame, 3); if (tall >= 2) px(E, T, x + lean, y - 2, o.flame, 2);
    });
  }
  function skull(R, o) {                                                // 候选部件：skull（见 Deserter.js）
    parts.head(E, R, P, { mat: o.mat, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const x1 = R.hx1, ey = R.ey, bot = R.hy, fx = (d) => x1 - d;
    px(E, R, fx(2), ey, o.ink, 1);
    if (o.eyes) px(E, R, fx(1), ey, o.ink, 1); else px(E, R, fx(1), ey, o.buff ? o.tongue : o.eye, o.gem >= 2 ? 4 : 3);
    px(E, R, fx(1), ey + 1, o.mat, 1); px(E, R, fx(2), ey + 1, o.mat, 4);
    for (let d = 0; d <= 2; d++) px(E, R, fx(d), ey + 2, o.mat, (d & 1) ? 1 : 4);
    if (o.jaw) { px(E, R, fx(0), bot, o.ink, 1); px(E, R, fx(1), bot, o.ink, 1); px(E, R, fx(0), bot + 1, o.mat, 3); px(E, R, fx(1), bot + 1, o.mat, 2); }
  }
  // 候选部件：bellStaff —— 断旗杆法杖：木杆 + 两道铁箍，杖顶横梁，横梁前端吊一只铜铃（左右摆，铃舌是发光体，5 档亮）
  function bellStaff(R, o) {
    const t = staffTop(), x = t[0], top = t[1], butt = P.hy + 14;
    E.part(); for (let y = top; y <= butt; y++) px(E, R, x, y, o.pole, 3); px(E, R, x, top + 6, o.band, 4); px(E, R, x, butt - 3, o.band, 3);
    run2(R, top + 1, x - 2, x + 3, o.band); px(E, R, x - 2, top + 1, o.band, 4); px(E, R, x, top - 1, o.gold, 4);
    if (o.noBell) return;
    E.part(); const s = P.bell, bx = x + 3 + s;                          // 铃绳 + 铃
    px(E, R, x + 3, top + 2, o.band, 3); px(E, R, x + 3 + RD(s * 0.5), top + 3, o.band, 3);
    px(E, R, bx, top + 4, o.bell, 4); run2(R, top + 5, bx - 1, bx + 1, o.bell); run2(R, top + 6, bx - 1, bx + 1, o.bell); px(E, R, bx - 1, top + 5, o.bell, 4);
    const lv = [[o.bell, 1], [o.tongue, 3], [o.tongue, 4], [o.tongue, 4], [o.bell, 1]][P.gem] || [o.bell, 1];
    px(E, R, bx, top + 7, lv[0], lv[1]); if (P.gem === 3) { px(E, R, bx - 1, top + 7, o.tongue, 3); px(E, R, bx + 1, top + 7, o.tongue, 3); }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.robeD, grip: 'none' });
    { E.part(); const e = parts.edges(R, R.yS + 6)[0], y = R.yS + 6; px(E, R, e - 1, y - 1, M.fletch, 4); px(E, R, e - 2, y - 2, M.fletch, 3); px(E, R, e - 2, y - 1, M.fletch, 2); px(E, R, e - 1, y, M.shaft, 3); }   // 断箭：箭羽从袍子破洞里露出来
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.gold, collar: M.gold, hem: 0, flare: 5 });
    { const L = tor.rows[0], hr = tor.hem - tor.y0, xb = L[hr], sw = RD(P.sway || 0);   // 旗角金穗：从后摆拖出 3 格
      for (let k = 1; k <= 3; k++) { px(E, R, xb - k, 0, M.gold, (k & 1) ? 3 : 2); if (k < 3) px(E, R, xb - k + (sw > 0 ? 1 : 0), -1, M.gold, 4); }
      px(E, R, L[RD((R.yS + 6) - tor.y0)] + 1, R.yS + 6, M.ink, 1);    // 袍子上的破洞
      for (let x = xb + 2; x < tor.rows[1][hr] - 1; x += 4) px(E, R, x, -1, M.gold, 3); }
    if (P.nod) { R.hy += 1; R.htop += 1; R.ey += 1; }
    skull(R, { mat: M.bone, ink: M.ink, eye: M.eye, tongue: M.tongue, eyes: P.eyes, gem: P.gem, buff: P.buff, jaw: P.jaw });
    if (!P.noProp) candleCrown(R, R.hx0, R.hx1, R.htop, { mat: M.helm, rust: M.rust, wax: M.wax, flame: M.flame, lit: P.lit, fl: P.fl });
    bellStaff(R, { pole: M.pole, band: M.band, gold: M.gold, bell: M.bell, tongue: M.tongue, noBell: P.noProp });
    parts.hand(E, R, P, { side: 'B', hand: M.bone });
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.robe, cuff: M.gold, hand: M.bone });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const crownSpr = new Sprite(20, 12, 10, 10), bellSpr = new Sprite(10, 10, 5, 7), PB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  const FREE0 = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  let propX = 0, auraT = 9, reachT = 9, dialN = 0, AP = null, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, tapN = 0;
  function candlesW() { const R = parts.rig(P, BODY), a = R.hx0, b = R.hx1, top = R.htop, cx = RD((a + b) / 2); return [[wx(a - 1), wy(top - 5)], [wx(cx), wy(top - 7)], [wx(b + 2), wy(top - 5)]]; }
  // 充能光环：以本体为圆心贴地的椭圆，中范围（半径 22 格，左右两名友军都在圈内）；蓄力时脚下是 8 格节拍刻度盘
  const GY = HY + 1, AURA_R = 22, AURA_RY = 5, AURA_END = 1.2, DIAL_R = 12, DIAL_RY = 4, DIAL_FULL = 1.25;
  const TICK_A = [0, 1, 2, 3, 4, 5, 6, 7].map((j) => -Math.PI / 2 + j * Math.PI / 4);   // 刻度从身后顺时针排一圈
  const plantBell = () => [K_PLANT.hx + 6, K_PLANT.hy + K_PLANT.crouch - 9];            // 顿杖那一帧的铃舌位置（本地坐标）
  const dither = (x, y, dq) => dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq;
  function ell(cx, cy, rx, ry, c, gap, ph, dq) {                       // 点阵椭圆：gap 每几格断一格，ph 让断口转起来
    const n = Math.max(12, RD(rx * 5));
    for (let i = 0; i < n; i++) { if (gap && ((i + ph) % gap) === 0) continue; const a = i / n * 6.2832, x = RD(cx + Math.cos(a) * rx), y = RD(cy + Math.sin(a) * ry); if (!dither(x, y, dq)) put(x, y, c); }
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const b = plantBell(), gx = wx(b[0]), gy = wy(b[1]), bx = wx(K_PLANT.hx);   // 旗杖顿地：铃被震响，脚下刻度盘炸成光环
    releaseOrbit(30, 70, 0.25, 0.5); burst(gx, gy, 12, 30, 80, 0.2, 0.45, R_EL, 8);
    spawn(K_DUST, bx - 1, HY, -10, -5, 0.3, FXI.dust); spawn(K_DUST, bx + 1, HY, 10, -5, 0.3, FXI.dust); burst(bx, HY, 6, 20, 50, 0.15, 0.3, R_EL, 10);
    auraT = 0; shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_THUD) {                                  // 旗杖一顿：铃摆「叮」地甩出铃音弹
      const gx = wx(P.gx), gy = wy(P.gy); mzT = 0; mzX = gx; mzY = gy;
      shoot(1, gx + 2, gy, 150, DUMMY_X - 3, R_EL, 0, { trail: { every: 3, life: [0.08, 0.16], back: [8, 18] } });
      spawn(K_DUST, wx(P.hx), HY, -8, -4, 0.25, FXI.dust); spawn(K_DUST, wx(P.hx) + 1, HY, 8, -4, 0.25, FXI.dust);
      sfx('swing', { kind: 'staff', w: 0.25 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_REACH) {                                   // 光环扩到友军脚下：圈里的友军全部被照亮加速
      AP = allyPoints(); allyFx({ dur: AURA_END - T_REACH - 0.1, outline: R_EL }); reachT = 0;
      for (let k = 0; k < AP.length; k++) { const a = AP[k]; burst(a.x, a.mid, 8, 25, 60, 0.2, 0.4, R_EL, 6); fx.cross(a.x, a.top - 6, 3, R_EL, 0.35); }
      sfx('impact', { pal: 'bolt', w: 0.35 });
    }
    if (s === DEATH && t === T_MELT) {                                   // 融化：先单独烤好烛台冠和铃铛，再把身体交给死亡套件
      begin(crownSpr, 0, 0); candleCrown(FREE0, -2, 3, 0, { mat: M.helm, rust: M.rust, wax: M.wax, flame: M.flame, lit: 0, fl: 0 }); bake(crownSpr, PB);
      begin(bellSpr, 0, 0); { const T = FREE0; px(E, T, 0, -3, M.bell, 4); run2(T, -2, -1, 1, M.bell); run2(T, -1, -1, 1, M.bell); px(E, T, 0, 0, M.bell, 1); } bake(bellSpr, PB);
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); P.noProp = 1; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.4, fadeDur: 0.6 }); propX = HX + P.bx;
      for (let i = 0; i < 6; i++) spawn(K_RISE, HX - 4 + Math.random() * 10, HY - 24 - Math.random() * 6, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.8, FXI.dust);
    }
    if (s === DEATH && t === T_ROLL) { for (let i = 0; i < 8; i++) spawn(K_DUST, propX + (Math.random() - 0.5) * 16, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, FXI.dust); sfx('fall', { w: 0.3 }); }
  }
  const EVENTS = [[], [], [T_THUD], [], [T_REACH], [], [], [T_MELT, T_ROLL], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.17); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.25 }); } }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                              // 三根蜡烛的火苗被吸成螺旋，绕着铃摆转
      chargeAcc += dt * (12 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const c = candlesW()[(Math.random() * 3) | 0], dx = c[0] - gx, dy = (c[1] - gy) / 0.75, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, (chargeAcc * 13 | 0) % 3 ? R_EL : FXI.fire, a, r, 5 + Math.random() * 2); }
    }
    if (state === CHARGE) {                                              // 刻度每亮一格迸 3 颗火花
      const n = Math.min(8, Math.floor(8 * stT / DIAL_FULL + 1e-6));
      while (dialN < n) { const a = TICK_A[dialN++]; burst(RD(HX + Math.cos(a) * DIAL_R), RD(GY + Math.sin(a) * DIAL_RY) - 1, 3, 10, 25, 0.15, 0.3, R_EL, 6); }
    } else dialN = 0;
    if (state === MOVE && P.step !== lastStep) {                         // 滑步：每两步杖尖点地一颗尘
      if (P.step !== 0) { sfx('step', { w: 0.15 }); if ((tapN++ & 1) === 0) spawn(K_DUST, wx(P.hx), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 3, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 0.25 && stT < T_MELT) { if (Math.random() < dt * 20) spawn(K_RISE, HX + P.bx - 3 + Math.random() * 8, HY - 32, (Math.random() - 0.5) * 4, -8, 0.6, FXI.dust); }   // 烛火熄灭的青烟
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 16, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    auraT += dt; reachT += dt; mzT += dt;
  }
  function fxReset() { auraT = 9; reachT = 9; dialN = 0; mzT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; tapN = 0; }
  function fxBack(f12) {
    if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (E.state === CHARGE) {                                            // 蓄力：脚下 8 格节拍刻度盘逐格充满，满了整圈闪
      const n = Math.min(8, Math.floor(8 * E.stT / DIAL_FULL + 1e-6));
      if (n >= 8) ell(HX, GY, DIAL_R, DIAL_RY, EL[3], 3, f12 >> 1, 0);
      for (let j = 0; j < 8; j++) {
        const x = RD(HX + Math.cos(TICK_A[j]) * DIAL_R), y = RD(GY + Math.sin(TICK_A[j]) * DIAL_RY);
        if (j >= n) { put(x, y, EL[3]); put(x - 1, y, EL[4]); put(x + 1, y, EL[4]); continue; }   // 没充上的刻度：暗蓝短横
        const hot = n >= 8 ? ((j + f12) & 1) === 0 : j === n - 1 && (f12 & 1);                // 充上的：亮十字，刚亮的那格闪白
        put(x, y, hot ? EL[0] : EL[1]); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, hot ? EL[1] : EL[2]);
      }
    }
    if (auraT < AURA_END) {                                              // 施放：三道节拍波纹贴地扩散 → 停成光环，刻度跟着铃摆节拍转圈亮，最后抖散
      const t = auraT;
      for (let p = 0; p < 3; p++) {
        const tp = t - p * 0.06; if (tp < 0 || tp > 0.3) continue;
        const R = 6 + (AURA_R - 6) * ease.out(clamp01(tp / 0.22)), c = p === 0 ? (tp < 2 / 12 ? EL[0] : EL[1]) : p === 1 ? EL[2] : EL[3];
        ell(HX, GY, R, Math.max(1.5, R * 0.23), c, p === 0 ? 0 : 3, f12, tp > 0.22 ? (tp - 0.22) / 0.08 : 0);
      }
      if (t >= 0.2) {
        const dq = clamp01((t - 0.8) / 0.4), beat = f12 & 7;
        ell(HX, GY, AURA_R, AURA_RY, EL[2], 4, f12 >> 1, dq);
        for (let j = 0; j < 8; j++) {
          const x = RD(HX + Math.cos(TICK_A[j]) * AURA_R), y = RD(GY + Math.sin(TICK_A[j]) * AURA_RY); if (dither(x, y, dq)) continue;
          const on = j === beat; put(x, y, on ? EL[0] : EL[1]); put(x, y - 1, on ? EL[1] : EL[3]); if (on) put(x, y - 2, EL[2]);
        }
      }
    }
  }
  function fxMid(f12) {                                                  // 被光环罩住的友军：头顶两只上升箭头 + 身后速度线（画在本体后面，不盖住法师）
    if (reachT >= AURA_END - T_REACH || !AP) return;
    const late = reachT > 0.7;
    for (let k = 0; k < AP.length; k++) {
      const a = AP[k], r = (f12 >> 1) & 3;
      for (let m = 0; m < 2; m++) { if (late && ((f12 + m) & 1)) continue; const y = a.top - 5 - r - m * 4, c = m === 0 ? EL[1] : EL[2]; put(a.x, y, c); put(a.x - 1, y + 1, c); put(a.x + 1, y + 1, c); put(a.x - 2, y + 2, EL[3]); put(a.x + 2, y + 2, EL[3]); }
      for (let q = 0; q < 3; q++) { const y = a.mid - 4 + q * 4, L = 4 + ((q + k + (f12 >> 1)) % 3) * 2; for (let d = 0; d < L; d++) { if (late && ((d + f12) & 1)) continue; if (((d + f12 + q) % 5) === 4) continue; put(a.x - 6 - d, y, d < 2 ? EL[1] : d < 4 ? EL[2] : EL[3]); } }
    }
  }
  function blitSpr(s, X, Y, dq) { const o = s.out; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, Y - s.oy + y, c); } }
  function drawRing(x, y, c, c2, f12) { const O = [[-1, -1], [0, -2], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0]]; O.forEach(([dx, dy], i) => put(x + dx, y + dy, i === (f12 & 7) ? EL[0] : (i & 1) ? c : c2)); }
  function fxFront(f12) {
    const st = E.state, t = E.stT, gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (st === CAST && t < 2 / 12) drawRing(gx, gy, t < 1 / 12 ? EL[0] : EL[1], EL[2], f12);   // 顿杖那一下铃口一圈亮
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; drawRing(mzX, mzY, c, EL[2], f12); }
    if (st === DEATH && t >= T_MELT) {                                   // 烛台冠和铃铛从滩里滚出来
      const q = ease.out(clamp01((t - T_MELT - 0.5) / 0.5)), dq = clamp01((t - T_MELT - 1.4) / 0.6);
      blitSpr(crownSpr, RD(propX - 1 - q * 9), HY - 1 - (q < 1 && q > 0 ? (RD(q * 8) & 1) : 0), dq);
      blitSpr(bellSpr, RD(propX + 4 + q * 7), HY - 1, dq);
    }
  }
  function drawShot(k, x, y, d, f12) { if (k !== 1) return false; drawRing(x, y, EL[1], EL[2], f12); put(x, y, EL[0]); return true; }

  return {
    name: '骸骨法师', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.eye, M.flame, M.tongue], HIT_POINT: [1, -15], EVENTS, ALLIES: 'skill',
    deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'bolt', style: 'buff', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
