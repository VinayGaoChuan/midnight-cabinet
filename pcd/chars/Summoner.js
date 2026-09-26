// 召唤师（部队 · 骷髅 · 召唤师 · 优质 · 近战 256）：骷髅小女孩——大圆颅骨（2×2 大眼窝里一点冰蓝微光）、头两侧一对灰白长双马尾（紫蝴蝶结），
// 灰紫短蓬裙 + 大号白围兜（紫色狗爪印），两根细骨腿；右手攥一条空铁狗链，链尾拖着一只空皮项圈（骨牌），脖子上挂一只骨哨（哨孔是发光体），裙后缝一条破布狗尾巴。
// 攻击 = 抽：把狗链从身后抡过头顶横抽，链端项圈像流星锤一样砸到目标；
// 技能 = 特性「召唤猎犬」：双手捧骨哨长吹（冰蓝声纹向前扩、面前地面结霜、散骨在霜里跳）→ 狗链往前一甩，项圈落在霜地中央，冰蓝爪印法阵展开，
//        散骨咔咔拼成狼形 → 狼眼亮起、仰头一嚎放出冰霜冲击环，项圈套上它的脖子（她牵着这只召唤来的灰狼）→ 灰狼消散，项圈落回地上。
// 死亡 = 跌坐散骨：屁股一沉跌坐在地 → 散成一堆小骨头（死亡套件 parts，power 小）→ 蝴蝶结从头上飘落，最后落在骨堆上。
// 升级线：召唤师 → 糖果女孩（CandyGirl.js）：保留双马尾、狗链 + 项圈、骨哨。
PCD.define('Summoner', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, hash, bayer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, death, hitDummy, dummyFx, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：猎犬召唤 · 幽霜蓝（frost：白 → 冰青 → 青 → 钢蓝 → 深蓝），骨堆点缀 bone ─────
  const R_EL = FXI.frost, EL = FXR[R_EL], BONE_C = [8, 7, 6, 17];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    bone: 'bone',                                    // 骨（颅骨、四肢、骨哨）
    hair: 'pale',                                    // 灰白双马尾
    dress: { r: [25, 42, 54, 43], band: 2 },         // 灰紫小裙（大面积 band 2）
    bow: 'purple',                                   // 蝴蝶结、爪印
    bib: 'white',                                    // 围兜
    rag: 'leather',                                  // 破布狗尾巴
    chain: [0, 28, 29, 30],                          // 铁狗链
    collar: 'leather', ink: { r: 'ink', flat: 1 },
    hole: { r: [39, 40, 23, 22], flat: 1 },          // 骨哨孔（发光体，5 档）
    eyeG: { r: [0, 39, 40, 22], flat: 1 },           // 眼窝里的冰蓝微光（发光体）
  });
  const BODY = { body: 'child', leg: 5, torso: 6, head: 8, headW: 8, sw: 3, arm: 6, lw: 1, stride: 2 };
  const HX = 72, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 40, 30, 36);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 3, 5, 8], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'hole', 'eyeG', 'chain', 'collar', 'rag']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（攥链）hx/hy · 后手 bhx/bhy · 项圈 cx/cy + 链的下垂 sag · 骨哨 wx/wy ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0, gem: 0, glint: 0, rim: 0,
    eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, cx: 0, cy: 0, sag: 0, wx: 0, wy: 0, tw: 0, sit: 0, nobow: 0, gx: 0, gy: 0, flip: 0, mx: 0, nocol: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, cx, cy, sag, wx, wy) => ({ hx, hy, bhx, bhy, lean, cx, cy, sag, wx, wy });
  const WOLF_X = -2, WC = WOLF_X + 8, NECK = [WOLF_X + 10, -8];     // 召唤的灰狼（画在她身前）：原点（尾端）、霜地中央、脖子（项圈套上去的位置）；鼻尖 = HX + WOLF_X + 19 = 89，离假人前沿 4 格
  const K_IDLE = K(5, -4, -1, -6, 0, 13, -1, 2, 1, -10);            // 前手沿身体前沿垂下、后手藏在裙后，胸前围兜露出来
  const K_BLOWI = K(6, -11, 4, -11, 0, 13, -1, 3, 5, -13);         // 待机个性：双手捧起骨哨吹一下
  const K_MOVE = K(2, -6, -3, -7, 1, -12, -1, 2, 2, -10);            // 碎步：狗链拖在身后
  const K_WIND = K(-1, -14, -4, -7, -1, -9, -21, 1, 0, -10);         // 抡：狗链甩到身后头顶
  const K_LASH = K(8, -10, -4, -5, 1, 18, -10, 0, 2, -10);           // 抽：项圈横着砸出去
  const K_DROP = K(7, -8, -4, -6, 1, 15, -1, 3, 2, -10);
  const K_BLOW = K(5, -11, 3, -11, -1, 13, -1, 4, 4, -13);          // 蓄力：后仰长吹
  const K_THROW = K(9, -10, 1, -7, 1, WC, -1, 1, 2, -10);             // 施放：狗链往前一甩
  const K_HURT = K(2, -7, -5, -7, -1, 12, -1, 3, 0, -10);
  const K_SIT = K(4, -4, -5, -4, -1, 11, -1, 2, 0, -10);             // 跌坐：两手撑地
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'cx', 'cy', 'sag', 'wx', 'wy'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 24], ['hy', -24, 4], ['bhx', -16, 16], ['bhy', -24, 4], ['lean', -1, 2], ['crouch', 0, 5], ['bob', 0, 1], ['cx', -24, 32], ['cy', -28, 1], ['sag', 0, 6],
    ['wx', -8, 12], ['wy', -24, 0], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 2],
    ['flash', 0, 1], ['dqk', 0, 48], ['bx', -8, 8], ['st', 0, 8], ['nobow', 0, 1], ['tw', -1, 1], ['sit', 0, 1], ['head', -1, 1], ['nocol', 0, 1]]);
  const T_STRIKE = 2 / 12, T_HOWL = 4 / 12, T_SIT = INCOMING + 0.45, T_BREAK = INCOMING + 0.8;
  const PERS_BEARD = [0, 1, -1, 1, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.crouch = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.tw = 0; P.sit = 0; P.nobow = 0; P.head = 0; P.nocol = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3]; P.tw = [0, 1, 0, -1][b & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); setK(K_IDLE, K_BLOWI, i === 0 || i === 4 ? 0.5 : 1); P.beard = PERS_BEARD[i]; P.gem = i >= 1 && i <= 3 ? 2 : 1; P.glint = i === 2 ? 1 : 0; P.bob = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 拖链碎步：小短腿快走，项圈在身后地上一蹦一蹭
      setK(K_MOVE, K_MOVE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.cx = K_MOVE.cx + [0, 1, 0, 1][f]; P.cy = [-1, -2, -1, -1][f]; P.hx += [0, 1, 0, -1][f]; P.bhx += [0, -1, 0, 1][f]; P.tw = [1, 0, -1, 0][f]; P.beard = [1, -1, -1, 1][f];
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.sway = 1; P.gem = 1; }
      else if (tq < 0.2) { setK(K_LASH, K_LASH, 0); P.bx = 2; P.beard = -2; P.sway = -1; P.gem = 1; P.tw = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_LASH, K_DROP, q); P.bx = q < 0.5 ? 2 : 1; P.beard = -1; P.tw = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_DROP, K_IDLE, q); P.bx = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BLOW, q); P.bx = -RD(4 * ease.out(clamp01(tq / 0.3)));   // 先退后 4 格，给召唤的灰狼腾出身前的霜地
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.tw = (f12 & 1) ? 1 : -1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) { setK(K_BLOW, K_THROW, 0.5); P.cx = 10; P.cy = -9; P.sag = 0; }
      else { setK(K_THROW, K_THROW, 0); if (tq >= T_HOWL) { P.cx = NECK[0]; P.cy = NECK[1]; P.sag = 0; P.nocol = 1; } }
      P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.bx = -3; P.tw = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_THROW, K_IDLE, q); P.beard = -RD(1 - q); P.bx = tq < 0.45 ? -3 : -RD(3 * (1 - clamp01((tq - 0.45) / 0.2)));
      if (tq < 0.45) { P.cx = NECK[0]; P.cy = NECK[1]; P.sag = 0; P.nocol = 1; }   // 牵着灰狼，直到它消散（项圈画在狼身上）
      else if (tq < 0.55) { P.cx = NECK[0] - 1; P.cy = -3; P.sag = 2; }  // 项圈落回地上
      else { const r = clamp01((tq - 0.55) / 0.15); P.cx = RD(NECK[0] - 1 + (K_IDLE.cx - NECK[0] + 1) * r); P.cy = -1; }
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.tw = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 跌坐散骨
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < T_SIT - INCOMING) { setK(K_HURT, K_SIT, 0.5); P.crouch = 2; P.bx = -2; P.eyes = 1; P.beard = 1; P.gem = 1; }
      else {
        setK(K_SIT, K_SIT, 0); P.sit = 1; P.crouch = 3; P.bx = -2; P.eyes = 1; P.beard = d < 0.55 ? -1 : 0; P.sway = d < 0.55 ? -1 : 0;
        P.gem = d < 0.7 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= T_BREAK - INCOMING) P.dq = 1;                          // 之后由死亡套件（散骨）接管，蝴蝶结单独画
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const cr = Math.min(3, RD(P.crouch)), yo = P.bob + cr;
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    P.cx = RD(P.cx); P.cy = RD(P.cy); P.sag = RD(P.sag); P.wx = RD(P.wx) + (st === CHARGE || st === CAST ? 0 : 0); P.wy = RD(P.wy) + yo;
    P.gx = P.wx + P.bx; P.gy = P.wy;                                     // 发光体 = 骨哨孔
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  const BW = BODY.arm;
  // 候选部件：boneArm —— 骷髅细臂：1 格骨上臂 + 前臂（两段等长，肘往后下弯）+ 肘节高光 + 2×2 骨手；肩头套一只 2×2 泡泡短袖（袖在骨头之上）
  function boneArm(T, sx, sy, hx, hy, bm, sm) {
    const L = BW, L1 = L / 2; let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    if (d > L) { const k = (d - L) / d; sx += dx * k; sy += dy * k; dx = hx - sx; dy = hy - sy; d = L; }
    let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    E.part(); parts.line(E, T, sx, sy, ex, ey, bm, 0); parts.line(E, T, ex, ey, hx, hy, bm, 0); PX(E, T, ex, ey, bm, 4);
    parts.rect(E, T, hx - 1, hy - 1, 2, 2, bm, 0); PX(E, T, hx - 1, hy - 1, bm, 4);
    E.part(); const qx = RD(sx), qy = RD(sy); parts.rect(E, T, qx - 1, qy - 1, 2, 2, sm, 0); PX(E, T, qx - 1, qy - 1, sm, 4); PX(E, T, qx, qy, sm, 2);
  }
  // 候选部件：skullHead —— 骷髅大圆颅（headW × head）：颅顶圆、下颌比颅顶窄 3 格；2×2 大眼窝（窝里 1 格发光微光）、鼻孔、一排牙（亮暗相间）、颧骨暗格
  function skull(T, R, eyeLv) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, m = M.bone;
    for (let y = top; y <= bot; y++) { let a = x0, b = x1; if (y === top) { a += 2; b -= 1; } else if (y === top + 1 || y === bot - 1) a += 1; else if (y === bot) a += 3; parts.run(E, T, y, a, b, m, 0); }
    PX(E, T, x0 + 2, top + 1, m, 4); PX(E, T, x0 + 3, top + 1, m, 4); PX(E, T, x0 + 1, top + 2, m, 4);   // 颅顶高光
    PX(E, T, x0 + 2, ey + 1, m, 2); PX(E, T, x0 + 3, ey + 2, m, 2);                                     // 太阳穴、颧骨下的凹
    const sx = x1 - 2;
    if (P.eyes) { parts.run(E, T, ey + 1, sx, x1 - 1, M.ink, 1); PX(E, T, sx, ey, m, 2); }
    else { parts.rect(E, T, sx, ey, 2, 2, M.ink, 1); PX(E, T, sx + 1, ey, M.eyeG, eyeLv); if (eyeLv >= 4) PX(E, T, sx, ey + 1, M.eyeG, 2); }
    PX(E, T, x1, ey + 2, M.ink, 1);                                                                       // 鼻孔
    for (let x = x1 - 3; x <= x1; x++) PX(E, T, x, bot - 1, m, ((x - x1) & 1) ? 1 : 4);                    // 牙
    PX(E, T, x1, bot, m, 2);
  }
  // 候选部件：twinTail —— 头两侧的长马尾（s = -1 远侧 / 1 近侧）：从发结往外甩出 4 格再垂到腰，上段 2 格宽、下段 1 格，发丝暗格，发梢随 beard / sway 摆
  const TAIL_LEN = 11;
  function tail(T, R, s) {
    E.part(); const m = s < 0 ? M.hairD : M.hair, b = P.beard, tx = s < 0 ? R.hx0 : R.hx1, ty = R.htop + 1;
    for (let k = 0; k <= TAIL_LEN; k++) {
      const q = k / TAIL_LEN, out = (s > 0 ? 2 : 1) + 3 * Math.sin(Math.min(1, q * 1.8) * Math.PI / 2) - (q > 0.75 ? (q - 0.75) * 4 : 0);
      const x = RD(tx + s * out + b * q * q * 1.6 + (k === TAIL_LEN ? P.sway : 0)), y = ty + k;
      PX(E, T, x, y, m, k === TAIL_LEN ? 4 : 0);
      if (k < TAIL_LEN * 0.65) PX(E, T, x + s, y, m, (k & 1) ? 2 : 0);
      else if (k < TAIL_LEN - 1 && (k & 1)) PX(E, T, x, y, m, 2);
    }
  }
  // 候选部件：ribbonBow —— 5×3 蝴蝶结（两翼 + 中间结 + 两条短飘带）
  function bow(T, cx, cy, m) {
    parts.run(E, T, cy - 1, cx - 2, cx - 1, m, 4); parts.run(E, T, cy - 1, cx + 1, cx + 2, m, 3);
    parts.run(E, T, cy, cx - 2, cx + 2, m, 0); PX(E, T, cx, cy, m, 2);
    PX(E, T, cx - 2, cy + 1, m, 3); PX(E, T, cx + 2, cy + 1, m, 2);
  }
  // 候选部件：ragTail —— 缝在裙后的破布狗尾巴：从后腰往后上翘 4 格，末端两条破布须，随 tw 摇
  function ragTail(T, R) {
    E.part(); const y = R.yWaist + 2, x = parts.edges(R, y)[0] - 1, w = P.tw, m = M.rag;
    PX(E, T, x, y, m, 0); PX(E, T, x - 1, y, m, 0); PX(E, T, x - 1, y - 1, m, 0); PX(E, T, x - 2, y - 1, m, 0); PX(E, T, x - 2, y - 2 + (w > 0 ? 0 : 0), m, 0);
    PX(E, T, x - 3, y - 2 - (w > 0 ? 1 : 0), m, 4); PX(E, T, x - 3, y - 1 + (w < 0 ? 1 : 0), m, 2); PX(E, T, x - 4, y - 3 - (w > 0 ? 1 : 0) + (w < 0 ? 2 : 0), m, 3);
  }
  // 候选部件：leash —— 下垂的链子：手 → 链尾按抛物线下垂 sag 格，碰到地面就沿地面平铺；链环 亮 / 暗 / 基 逐格循环
  function leash(T, x0, y0, x1, y1, sag, m) {
    E.part(); const n = Math.max(2, Math.ceil((Math.abs(x1 - x0) + Math.abs(y1 - y0) + sag) * 1.6)); let lx = 1e9, ly = 1e9, i = 0;
    for (let s = 0; s <= n; s++) {
      const q = s / n, x = RD(x0 + (x1 - x0) * q), y = Math.min(0, RD(y0 + (y1 - y0) * q + sag * 4 * q * (1 - q)));
      if (x === lx && y === ly) continue; lx = x; ly = y; PX(E, T, x, y, m, (i % 3) === 0 ? 4 : (i % 3) === 1 ? 2 : 3); i++;
    }
  }
  // 候选部件：dogCollar —— 空皮项圈（4×3 空心环 + 铁扣）+ 一块骨牌（悬空时垂在下沿，落地时躺在旁边）
  function dogCollar(T, cx, cy) {
    E.part(); const m = M.collar;
    parts.run(E, T, cy - 1, cx, cx + 1, m, 4); PX(E, T, cx - 1, cy, m, 0); PX(E, T, cx + 2, cy, m, 2); parts.run(E, T, cy + 1, cx, cx + 1, m, 2);
    PX(E, T, cx + 2, cy - 1, M.chain, 4);
    if (cy + 2 <= 0) PX(E, T, cx + 1, cy + 2, M.bone, 4); else PX(E, T, cx + 3, cy + 1, M.bone, 4);
  }
  // 候选部件：boneWhistle —— 挂在脖子上的骨哨：细绳（皮）+ 3 格骨管 + 哨口 + 发光哨孔（5 档，和骨管同一部件）
  const HOLE_LV = [2, 3, 4, 4, 1];
  function whistle(T, R) {
    E.part(); const x = P.wx, y = P.wy, nx = R.hx - 1, ny = R.hy + 1;
    if (y > ny + 1) parts.line(E, T, nx, ny, x - 1, y - 1, M.collar, 2);
    parts.run(E, T, y, x - 1, x + 1, M.bone, 0); PX(E, T, x - 1, y, M.bone, 4); PX(E, T, x + 2, y, M.bone, 2);
    PX(E, T, x, y, M.hole, HOLE_LV[P.gem]); if (P.glint) PX(E, T, x, y - 1, M.hole, 4);
  }
  // 骨腿平伸在地上（跌坐）
  function sitLegs(T, R) {
    const y0 = R.yHip + 1;
    E.part(); parts.line(E, T, R.hipBx, y0, R.hipBx + 4, 0, M.boneD, 0); PX(E, T, R.hipBx + 5, -1, M.boneD, 0);
    E.part(); parts.line(E, T, R.hipFx, y0, R.hipFx + 5, 0, M.bone, 0); PX(E, T, R.hipFx + 6, -1, M.bone, 3); PX(E, T, R.hipFx + 3, -1, M.bone, 4);
  }
  // 候选部件：bibApron —— 胸前大号围兜：贴着胸衣画一块 W×4 白布（上沿两根挂脖短带、下沿压一行暗边），右下角绣一只 3×2 狗爪印（两趾 + 掌垫），左上保留 ≥ 4×3 的白面
  function bibApron(T, R, tor) {
    E.part(); const [LL, RR] = tor.rows, y0 = tor.y0, top = R.yS + 2, m = M.bib; let a0 = 0, b0 = 0;
    for (let y = top; y <= top + 3; y++) { const i = y - y0, a = LL[i] + 1, b = Math.max(a + 4, RR[i] - 1); parts.run(E, T, y, a, b, m, y === top + 3 ? 2 : 0); if (y === top) { a0 = a; b0 = b; } }
    PX(E, T, a0 + 1, top - 1, m, 3); PX(E, T, b0 - 1, top - 1, m, 3);
    const bx = b0 - 1, py = top + 2; PX(E, T, bx - 1, py, M.bow, 3); PX(E, T, bx + 1, py, M.bow, 3); parts.run(E, T, py + 1, bx - 1, bx + 1, M.bow, 3); PX(E, T, bx, py + 1, M.bow, 4);
  }
  const EYE_LV = [3, 3, 4, 4, 1];
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY), T = R;
    tail(T, R, -1);
    boneArm(T, R.sBx, R.sBy, P.bhx, P.bhy, M.boneD, M.dressD);
    if (P.sit) sitLegs(T, R); else parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD, w: 1 });
    ragTail(T, R);
    const tor = parts.torso(E, R, P, { style: 'dress', mat: M.dress, trim: M.bib, collar: M.bib, hem: Math.min(0, R.yHip + 2), flare: 3 });
    bibApron(T, R, tor);
    skull(T, R, EYE_LV[P.gem]);
    tail(T, R, 1);
    if (!P.nobow) { E.part(); bow(T, R.hx0 - 1, R.htop, M.bowD); bow(T, R.hx1 + 1, R.htop, M.bow); }
    whistle(T, R);
    const ax = P.cx > P.hx ? P.cx - 1 : P.cx + 2;
    leash(T, P.hx, P.hy, ax, P.cy, P.sag, M.chain); if (!P.nocol) dogCollar(T, P.cx, P.cy);
    boneArm(T, R.sFx + 1, R.sFy, P.hx, P.hy, M.bone, M.dress);         // 前臂从胸衣前沿起，沿身体外侧垂下，不压围兜
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 召唤的灰狼：13 块骨头（散在霜里跳 → 咔咔拼回原位）+ 冰霜鬼影皮毛；坐标以狼尾端为原点、地面 y = 0；画在她身前（fxFront）─────
  // 每块：[x, y, 色调 1–4]；色调映射到骨色阶 [勾线, 暗, 基, 亮]
  const WP = [
    [[12, -10, 4], [13, -10, 4], [14, -10, 3], [15, -10, 3], [12, -9, 3], [13, -9, 4], [16, -9, 3],
     [12, -8, 2], [13, -8, 3], [14, -8, 3], [15, -8, 4], [16, -8, 4], [17, -8, 4], [18, -8, 3], [13, -7, 2], [14, -7, 3], [15, -7, 2], [16, -7, 3], [17, -7, 2]],   // 0 颅骨 + 长吻（眼窝 14–15,-9 另画）
    [[9, -7, 4], [10, -7, 3], [10, -8, 3]],                                                                                            // 1 颈椎
    [[6, -7, 4], [7, -7, 3], [8, -7, 4]],                                                                                              // 2 前段脊椎
    [[3, -7, 4], [4, -7, 3], [5, -7, 4]],                                                                                              // 3 后段脊椎
    [[5, -6, 3], [5, -5, 3], [6, -4, 2]], [[7, -6, 3], [7, -5, 3], [8, -4, 2]], [[9, -6, 3], [9, -5, 2]],                              // 4–6 肋骨
    [[2, -7, 3], [2, -6, 2], [3, -6, 3]],                                                                                              // 7 骨盆
    [[10, -4, 3], [10, -3, 3], [10, -2, 2], [10, -1, 3], [10, 0, 3], [11, 0, 4]],                                                      // 8 近侧前腿
    [[8, -3, 2], [8, -2, 2], [8, -1, 2], [8, 0, 2], [9, 0, 2]],                                                                         // 9 远侧前腿
    [[3, -5, 3], [4, -4, 3], [4, -3, 3], [3, -2, 3], [3, -1, 3], [3, 0, 3], [4, 0, 4]],                                                 // 10 近侧后腿（反关节）
    [[1, -5, 2], [1, -4, 2], [0, -3, 2], [0, -2, 2], [0, -1, 2], [0, 0, 2]],                                                            // 11 远侧后腿
    [[1, -8, 3], [0, -8, 4], [-1, -7, 3], [-2, -6, 3]],                                                                                // 12 尾椎
  ];
  const NP = WP.length, WBOT = WP.map((pc) => Math.max(...pc.map((p) => p[1])));
  const WX0 = HX + WOLF_X;                                                          // 狼原点（世界坐标）
  const SCAT = WP.map((pc, i) => {                                                  // 散落时的位移：底边贴地、左右散开，但整块留在 [HX-10, 假人前沿-6] 里
    const lo = Math.min(...pc.map((p) => p[0])), hi = Math.max(...pc.map((p) => p[0]));
    const ox = Math.max(HX - 10 - WX0 - lo, Math.min(DUMMY_X - 6 - WX0 - hi, RD((hash(i, 3) - 0.5) * 14)));
    return [ox, -WBOT[i]];
  });
  // 冰霜鬼影皮毛（狼形剪影）：标记 1 = 头（仰头嚎叫时整体上移 2 格），2 = 只在嚎叫时补的脖子
  const FUR = []; const addFur = (y, x0, x1, f) => { for (let x = x0; x <= x1; x++) FUR.push([x, y, f]); };
  addFur(-12, 12, 12, 1); addFur(-12, 15, 15, 1); addFur(-11, 11, 12, 1); addFur(-11, 14, 15, 1);                                             // 两只尖耳（高出背线 3 格）
  addFur(-10, 11, 16, 1); addFur(-9, 11, 17, 1); addFur(-8, 11, 19, 1); addFur(-7, 11, 19, 1); addFur(-6, 12, 17, 1);                           // 头 + 伸出 3 格的长吻
  addFur(-9, 2, 10, 0); addFur(-8, 1, 10, 0); addFur(-7, 1, 10, 0); addFur(-6, 1, 11, 0); addFur(-5, 1, 11, 0); addFur(-4, 2, 11, 0);           // 躯干（背线 y = -9）
  addFur(-3, 2, 5, 0); addFur(-3, 8, 11, 0); addFur(-2, 2, 4, 0); addFur(-2, 9, 11, 0); addFur(-1, 3, 3, 0); addFur(-1, 10, 10, 0);             // 腿根
  addFur(-10, 0, 1, 0); addFur(-9, -1, 1, 0); addFur(-8, -2, 0, 0); addFur(-7, -3, -1, 0); addFur(-6, -4, -2, 0); addFur(-5, -4, -3, 0);       // 蓬尾
  addFur(-11, 10, 11, 2); addFur(-10, 10, 11, 2);                                                                                               // 仰头时拉长的脖子
  const GW = 30, GH = 18, GX = 6, GY = 16, grid = new Uint8Array(GW * GH);      // 皮毛描边用的小网格（y -16..1）
  const LEATHER = [20, 19, 32, 33];
  const WBX = HX - 26, WBY = 18, WBW = 56, WBH = 21, WB = new Int16Array(WBW * WBH);   // 狼的离屏小缓冲（先收集像素，再统一压外沿）
  const wput = (x, y, c) => { const i = x - WBX, j = y - HY + WBY; if (i >= 0 && j >= 0 && i < WBW && j < WBH) WB[j * WBW + i] = c; };
  function wolfPhase() {
    const s = E.state, t = q12(E.stT);
    if (s === CHARGE && t >= 0.5) return { scat: 1, t };
    if (s === CAST) return { asm: 1, t };
    if (s === RECOVER) return { done: 1, t };
    return null;
  }
  function drawWolf(f12) {
    const ph = wolfPhase(); if (!ph) return;
    const X = WX0, Y = HY, dq = ph.done ? clamp01((ph.t - 0.45) / 0.25) : 0, vis = (x, y) => !(dq > 0 && bayer(x, y) < dq);
    WB.fill(-1); const put = wput;
    const howl = (ph.asm && ph.t >= T_HOWL) || (ph.done && ph.t < 0.2) ? 1 : 0, fur = (ph.asm && ph.t >= 0.25) || ph.done, lit = howl || ph.done;
    const collared = (ph.asm && ph.t >= T_HOWL) || (ph.done && ph.t < 0.45), hs = howl ? -2 : 0;
    if (fur) {                                                            // 冰霜鬼影：外沿亮青、内部钢蓝 / 深蓝隔点
      grid.fill(0); const g = (x, y, v) => { grid[(y + GY) * GW + x + GX] = v; };
      for (const [x, y, f] of FUR) { if (f === 2 && !howl) continue; g(x, y + (f === 1 ? hs : 0), 1); }
      if (howl) { g(18, -11, 1); g(19, -11, 1); g(19, -9, 0); }           // 仰嚎：鼻尖朝上翘、下颌张开
      const thin = ph.asm && ph.t < 0.3;                            // 只有第 3 帧（刚罩上皮毛）是隔点的
      for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        if (!grid[j * GW + i]) continue; const x = X + i - GX, y = Y + j - GY;
        if (!vis(x, y)) continue;
        const edge = !grid[j * GW + i - 1] || !grid[j * GW + i + 1] || !grid[(j - 1) * GW + i] || !grid[(j + 1) * GW + i];
        if (thin && ((x + y + f12) & 1)) continue;
        put(x, y, edge ? (j < GY - 7 ? EL[1] : EL[2]) : j < GY - 7 ? EL[2] : EL[3]);   // 外沿冰青 / 青，内部青 / 钢蓝（不用白，免得和骨头糊成一片）
      }
    }
    for (let i = 0; i < NP; i++) {                                        // 骨头
      let ox = 0, oy = 0;
      if (ph.scat) { if (ph.t < 0.5 + i * 0.05) continue; ox = SCAT[i][0]; oy = SCAT[i][1] - (((f12 + i * 2) % 5) === 0 ? 2 : ((f12 + i) % 3) === 0 ? 1 : 0); }
      else if (ph.asm) { const q = clamp01((ph.t - 1 / 12 - i * 0.012) / 0.14); if (q < 1) { const e = q < 0.5 ? 0 : 1; ox = RD(SCAT[i][0] * (1 - e)); oy = RD(SCAT[i][1] * (1 - e)) - (q >= 0.5 ? 0 : 1); } }
      const hy = i === 0 ? hs : i === 1 && howl ? -1 : 0;
      for (const [px, py, tn] of WP[i]) { const x = X + px + ox, y = Y + py + oy + hy; if (vis(x, y)) put(x, y, BONE_C[tn - 1]); }
      if (i === 0) {                                                      // 2 格眼窝（亮起冰蓝）+ 鼻头；仰嚎时张嘴
        const ex = X + 14 + ox, ey = Y - 9 + oy + hy;
        const c0 = lit ? EL[2] : 8, c1 = lit ? (howl && (f12 & 1) ? EL[0] : EL[1]) : 8;   // 冰蓝两格（骨白底上用青色才看得出）
        if (vis(ex, ey)) put(ex, ey, c0); if (vis(ex + 1, ey)) put(ex + 1, ey, c1);
        if (fur && vis(X + 19 + ox, Y - 8 + oy + hy)) put(X + 19 + ox, Y - 8 + oy + hy, 8);
        if (howl) { put(X + 17, Y - 9, EL[4]); put(X + 18, Y - 9, EL[4]); }   // 张开的嘴（上吻 y-10 翘起、下颌 y-8）
      }
    }
    if (collared) {                                                      // 项圈套在脖子上：皮带竖着勒一圈 + 铁扣 + 骨牌
      const cx = X + 10, top = Y - 9 - (howl ? 1 : 0);
      for (let y = top; y <= Y - 5; y++) if (vis(cx, y)) put(cx, y, y === Y - 7 ? 28 : y === top ? LEATHER[3] : y === Y - 5 ? LEATHER[1] : LEATHER[2]);
      if (vis(cx + 1, Y - 5)) put(cx + 1, Y - 5, LEATHER[0]); if (vis(cx + 1, Y - 4)) put(cx + 1, Y - 4, 17);
    }
    // 拼好以后整只狼压一圈深色外沿（站在她身前也能和她的骨头、裙子分开），再把狼的像素贴上去
    const outl = fur && dq < 0.5;
    for (let j = 0; j < WBH; j++) for (let i = 0; i < WBW; i++) {
      const c = WB[j * WBW + i], x = WBX + i, y = HY - WBY + j;
      if (c >= 0) { E.put(x, y, c); continue; }
      if (outl && y <= HY && ((i > 0 && WB[j * WBW + i - 1] >= 0) || (i < WBW - 1 && WB[j * WBW + i + 1] >= 0) || (j > 0 && WB[(j - 1) * WBW + i] >= 0) || (j < WBH - 1 && WB[(j + 1) * WBW + i] >= 0))) E.put(x, y, 0);
    }
  }

  // ───── 特效 ─────
  const CX = HX + WC;                                                     // 霜地中央（世界坐标）
  let chargeAcc = 0, soulAcc = 0, sparkAcc = 0, lastStep = 0, lastSnap = 0, lastEmerge = 0, lastPers = -1;
  const wx = (x) => scrX(x + P.bx), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CAST) {                                                     // 狗链一甩：项圈落进霜地中央，冰蓝爪印法阵展开
      releaseOrbit(30, 70, 0.2, 0.45, { pts: 1 });
      fx.circle(CX, FLOOR + 2, 12, 2.5, R_EL, 1.1, 1, 0); fx.circle(CX, FLOOR + 2, 7, 1.5, R_EL, 0.9, -1, 0);
      burst(CX, HY - 2, 14, 30, 80, 0.2, 0.5, R_EL, 16); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                                 // 抽：项圈横着砸到目标
      const sx = wx(2), sy = wy(-11); fx.slash(sx, sy, 15, -0.85, 1.62, R_EL, 0.2, 2, 1);
      const hx = wx(K_LASH.cx + 2), hy = wy(K_LASH.cy);
      burst(hx, hy, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(hx, hy, 6, 30, 70, 0.2, 0.4, R_EL, 8); fx.cross(hx, hy, 4, R_EL, 0.2);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.2 }); sfx('hit', { mat: 'metal', w: 0.25 });
    }
    if (s === CAST && t === T_HOWL) {                                     // 狼眼亮起、仰头一嚎：冰霜冲击环 + 项圈套上脖子
      const mx = HX + WOLF_X + 23, my = HY - 15;                          // 嚎声从翘起的鼻尖斜上方发出，不压住狼头 ring(mx, my, 1, R_EL); burst(mx, my, 12, 50, 130, 0.25, 0.6, R_EL, 18); fx.cross(HX + NECK[0], HY + NECK[1] + 1, 3, R_EL, 0.2);
      for (let i = 0; i < 8; i++) spawn(K_BURST, CX + (Math.random() - 0.5) * 16, HY - 1, (Math.random() - 0.5) * 60, -30 - Math.random() * 50, 0.4 + Math.random() * 0.3, R_EL);
      hitDummy(1); dummyFx({ dur: 0.9, tint: 'frost', slow: 0.5 }); shake(0.16, 1); sfx('impact', { pal: 'frost', w: 0.6 });
    }
    if (s === DEATH && t === T_SIT) {                                     // 屁股一沉：跌坐
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.2 });
    }
    if (s === DEATH && t === T_BREAK) {                                   // 散成一堆小骨头：先烤一张没有蝴蝶结的精灵交给死亡套件
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); P.nobow = 1; KEY(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.35, push: -4, fromX: 0, fromY: -6, fadeAt: 1.2, fadeDur: 0.6 });
      burst(HX - 2, HY - 8, 10, 20, 60, 0.3, 0.6, FXI.dust, 10); shake(0.1, 1); sfx('hit', { mat: 'stone', w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_HOWL], [], [], [T_SIT, T_BREAK], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));           // 霜气定点汇聚到骨哨
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 7, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 3, tx: gx, ty: gy, squash: 0.7 }); }
      if (stT > 0.3) { sparkAcc += dt * 10; while (sparkAcc >= 1) { sparkAcc -= 1; spawn(K_EMBER, CX + (Math.random() - 0.5) * 18, HY - 1, (Math.random() - 0.5) * 6, -6 - Math.random() * 10, 0.5 + Math.random() * 0.4, R_EL); } }
      const em = stT < 0.5 ? 0 : Math.min(NP, Math.floor((stT - 0.5) / 0.05) + 1);                // 散骨从霜里冒出来：每块一小团霜
      while (lastEmerge < em) { const i = lastEmerge++; burst(HX + WOLF_X + WP[i][0][0] + SCAT[i][0], HY - 1, 3, 10, 30, 0.15, 0.3, R_EL, 12); }
    }
    if (state === CAST) {                                                 // 骨头咔咔拼回原位：每块一下冰屑
      const t = q12(stT); let n = 0; for (let i = 0; i < NP; i++) if (t - 1 / 12 - i * 0.012 >= 0.07) n++;
      while (lastSnap < n) { const i = lastSnap++, p = WP[i][0]; spawn(K_BURST, HX + WOLF_X + p[0], HY + p[1], (Math.random() - 0.5) * 30, -20, 0.2, R_EL); spawn(K_BURST, HX + WOLF_X + p[0], HY + p[1], (Math.random() - 0.5) * 30, -10, 0.2, FXI.dust); }
    }
    if (state === MOVE && P.step !== lastStep) {                          // 碎步 + 身后项圈在地上蹭出一串尘点
      if (P.step !== 0) { sfx('step', { w: 0.15 }); const x = wx(P.cx); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY - 1, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                                 // 吹骨哨：哨口冒一圈冰蓝小波纹
      const lp = q12(stT) % DUR[IDLE], i = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (i !== lastPers) { if (i === 2) burst(gx + 2, gy, 5, 15, 35, 0.2, 0.4, R_EL, 4); lastPers = i; }
    }
    if (state === DEATH && stT > INCOMING + 1.9 && stT < INCOMING + 2.5) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 18, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; sparkAcc = 0; lastStep = 0; lastSnap = 0; lastEmerge = 0; lastPers = -1; }
  function frostGround(r, dq, f12) {                                      // 面前的地面结霜：地面线冰青、下一行隔点钢蓝、冰晶尖冒出地面
    for (let x = RD(CX - r); x <= RD(CX + r); x++) {
      const e = Math.abs(x - CX) / Math.max(1, r); if (dq > 0 && bayer(x, 1) < dq) continue;
      put(x, FLOOR, e < 0.5 ? EL[1] : e < 0.85 ? EL[2] : EL[3]);
      if (e < 0.6 || (x & 1)) put(x, FLOOR + 1, e < 0.4 ? EL[2] : EL[3]);
      if (e < 0.8 && hash(x, 7) < 0.3) put(x, FLOOR - 1, ((f12 + x) % 5) === 0 ? EL[0] : EL[1]);
    }
  }
  function pawPrint(dq) {                                                 // 冰蓝爪印（印在法阵中央的地面上）
    const c = EL[1], pts = [[-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3], [-1, 4], [0, 4], [1, 4], [-4, 2], [-2, 1], [2, 1], [4, 2]];
    for (const [dx, dy] of pts) { const x = CX + dx, y = FLOOR + dy; if (dq > 0 && bayer(x, y) < dq) continue; put(x, y, dy >= 3 ? c : EL[0]); }
  }
  function fxBack(f12) {
    if (P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
    const s = E.state, t = q12(E.stT);
    if (s === CHARGE && t >= 0.3) frostGround(11 * ease.out(clamp01((t - 0.3) / 0.8)), 0, f12);
    else if (s === CAST) { frostGround(11, 0, f12); if (t >= 1 / 12) pawPrint(0); }
    else if (s === RECOVER) { const dq = clamp01((t - 0.35) / 0.35); frostGround(11, dq, f12); pawPrint(dq); }
  }
  const BOWC = [42, 24, 43];
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = wy(P.gy), s = E.state, t = E.stT;
    drawWolf(f12);                                                       // 灰狼站在她身前（压住裙摆），离假人前沿 ≥ 4 格
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx, gy - r, c); } }   // 哨孔星芒
    if (s === CHARGE) {                                                  // 冰蓝声纹：一圈圈小弧从哨口往前扩
      for (let k = 0; k < 5; k++) {
        const a = t - 0.35 - k * 0.2; if (a < 0 || a > 0.42) continue; const r = 2 + a * 24, c = a < 0.12 ? EL[0] : a < 0.26 ? EL[1] : EL[2];
        for (let j = -4; j <= 4; j++) { if (a > 0.3 && (j & 1)) continue; const th = j * 0.2; put(RD(gx + 1 + Math.cos(th) * r), RD(gy + Math.sin(th) * r * 0.9), c); }
      }
    }
    if (s === IDLE) {                                                    // 待机吹哨：一圈小波纹
      const lp = t % DUR[IDLE], a = lp - 1.72; if (a >= 0 && a < 0.25) { const r = 2 + a * 20, c = a < 0.1 ? EL[1] : EL[2]; for (let j = -3; j <= 3; j++) put(RD(gx + 1 + Math.cos(j * 0.25) * r), RD(gy + Math.sin(j * 0.25) * r), c); }
    }
    if (s === DEATH && t >= T_BREAK) {                                   // 蝴蝶结从头上飘落，落在骨堆上
      const u = t - T_BREAK, q = clamp01(u / 0.9), x = RD(HX - 2 + 6 * (1 - q) + Math.sin(u * 9) * 2 * (1 - q)), y = RD(HY - 19 + 16 * ease.inOut(q)), dq = clamp01((t - T_BREAK - 1.2) / 0.6);
      const tilt = q < 1 ? ((f12 >> 1) & 1) : 0;
      const pts = [[-2, -1, 2], [-1, -1, 2], [1, -1, 1], [2, -1, 1], [-2, 0, 1], [-1, 0, 1], [0, 0, 0], [1, 0, 1], [2, 0, 1], [-2, 1, 1], [2, 1, 0]];
      for (const [dx, dy, c] of pts) { const X = x + dx, Y = y + dy + (tilt && dx > 0 ? -1 : 0); if (dq > 0 && bayer(X, Y) < dq) continue; put(X, Y, BOWC[c]); }
    }
  }

  return {
    name: '召唤师', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.hole, M.eyeG], HIT_POINT: [1, -12], EVENTS,
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'stone', how: 'collapse', pal: 'frost', style: 'summon', w: 0.2 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
