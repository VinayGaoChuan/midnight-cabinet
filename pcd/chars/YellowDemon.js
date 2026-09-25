// 黄魔（部队 · 兽人 · 先锋 · 稀有）：巨魔升级的一支——给强者扛旗的跟班。佝偻前探、膝微屈、手长到膝，比巨魔矮一点但更粗壮；
// 远侧手握一根比身体还高的骨尖旗枪（深红破三角旗 + 黄色爪印徽），近侧前臂的骨臂盾长大一圈、外沿一排锯齿；
// 保留巨魔的后掠长耳、上翘獠牙（更长）、背脊骨刺（4 根、更尖）；硫黄赭黄的皮肤，脖子上皮项圈挂一枚铜铃。
// 攻击 = 双手压低旗枪、从骨臂盾上方向前连刺两下；技能 = 特性「随从」生效：身后出现一名更强的友军，黄魔转身仰望、
// 沿连线汲取它的气势，猛回头咆哮、全身窜起硫黄怒焰，带着怒焰一枪直刺（身边强力友军越多越强）。
PCD.define('YellowDemon', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, allyPoints, allyFx, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：随从 · 硫黄怒焰（白 → 淡黄 → 硫黄 → 橙 → 焦褐）─────
  const R_EL = fxRamp('sulfur', [21, 51, 47, 46, 20]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: ['#2a1a06', '#6a4812', '#a8842a', '#d8b858'],          // 硫黄赭皮（主材质）
    leg: ['#2a1a06', '#6a4812', '#a8842a', '#d8b858'],           // 同色：腿、背不吃轮廓光
    bone: 'bone', flag: 'crimson', wood: 'wood', collar: 'leather', bell: 'gold', hide: [20, 20, 19, 32],
    eye: { r: [20, 46, 47, 21], flat: 1 },                         // 眼里的硫黄怒光（发光体；施放时闪白）
    claw: { r: [20, 46, 47, 21], flat: 1 },                        // 旗面爪印徽（施放时闪白）
    mouth: [55, 55, 56, 57],
  });
  const BODY = { body: 'hunched', leg: 10, torso: 11, head: 6, headW: 6, sw: 5, hunch: 3, headX: 5, neck: -2, arm: 11, limb: 1.3, lw: 3, stride: 2, lift: 1, fall: 'front' };
  const BODY_BIG = Object.assign({}, BODY, { sw: 6, limb: 1.6 });   // 汲取气势：肌肉鼓起 1 格
  const SPEAR = { hand: 'B', style: 'leaf', wood: M.wood, metal: M.bone, trim: M.collar, len: 15, back: 11 };
  const HX = 76, DUR = DEFAULT_DUR.slice(), ALLY_X = [HX - 27];
  const hero = new Sprite(84, 60, 38, 53);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'claw', 'wood', 'flag', 'leg', 'hide', 'mouth', 'bell']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：远侧手握旗枪（bhx bhy ba），近侧前臂 = 锯齿骨臂盾（hx hy）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, ear: 0, hup: 0,
    spine: 1, so: 0, big: 0, grin: 0, roar: 0, bell: 0, fph: 0, furl: 0, drape: 0, dk: 0, eyes: 0, flash: 0, lying: 0, lift: 0,
    gem: 0, rim: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  // so：骨臂盾朝向 0 前臂竖起（外侧朝前）· 1 前臂下垂 · 2 前臂平伸（外侧朝下，托在旗枪下面）
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch, so) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0, so: so || 0 });
  const K_IDLE = K(14, -12, 2, -11, 0, 0, 0, 1);                 // 旗杆竖在远侧（从驼背后面伸上去），锯齿骨臂盾低低地护在身前
  const K_WIND = K(6, -11, -6, -11, HALF, -1, 0, 2, 2);          // 双手压低旗枪往后收
  const K_JAB = K(11, -12, -1, -12, HALF, 1, 1, 1, 2);           // 连刺（前冲在 bx 里）：骨臂盾托在旗枪下面
  const K_HOLD = K(9, -12, -3, -12, HALF, 1, 0, 1, 2);
  const K_LOOK = K(11, -13, 9, -12, -0.46, -1, 0, 2);            // 蓄力：转身仰望友军、旗杆斜靠在肩上、弓背搓手
  const K_ROAR = K(13, -15, 6, -13, 0, -1, 1, 0);                // 猛回头咆哮
  const K_STAB = K(12, -12, 0, -12, HALF, 1, 1, 1, 2);           // 带怒焰的一枪直刺
  const K_HURT = K(12, -13, 1, -12, -0.46, -1, -1, 1);
  const K_HUG = K(13, -12, 15, -12, 0, 1, 1, 4);                 // 双膝跪下、双手抱住旗杆
  const K_SLUMP = K(12, -6, 15, -4, 0, 2, 1, 5);                 // 趴伏下去，旗杆倒在地上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => { E.mix(P, A, B, q, FIELDS); P.so = q < 0.5 ? A.so : B.so; };
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['ba', -16, 16], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['ear', -1, 1], ['hup', 0, 1], ['spine', 0, 2], ['so', 0, 2], ['big', 0, 1], ['grin', 0, 1], ['roar', 0, 1],
    ['bell', -1, 1], ['fph', 0, 3], ['furl', 0, 1], ['drape', 0, 1], ['dk', 0, 2], ['eyes', 0, 1], ['flash', 0, 1], ['lift', 0, 3], ['gem', 0, 4], ['rim', 0, 3],
    ['dqk', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const EAR_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_JAB1 = 2 / 12, T_JAB2 = 5 / 12, T_STAB = 3 / 12, T_KNEE = INCOMING + 0.34, T_POLE = INCOMING + 0.9;
  // 待机个性（1.6–2.0 s）：左右张望找主子（长耳竖起）→ 搓手、谄笑露獠牙，铜铃叮一声，旗面一抖
  const FAWN = [[-1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [0, 1, 0, 1, 1], [0, 1, 1, 1, 2], [0, 1, 0, -1, 3]];   // head, grin, 搓手相位, bell, fph

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.ear = 0; P.hup = 0; P.spine = 1; P.big = 0; P.grin = 0; P.roar = 0; P.bell = 0; P.fph = 0; P.furl = 0;
    P.drape = 0; P.dk = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.gem = 0; P.rim = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.ear = EAR_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.fph = (b + 1) & 1;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) {
        const k = FAWN[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.head = k[0]; P.grin = k[1]; P.bell = k[3]; P.fph = k[4]; P.ear = k[1] ? 0 : -1;
        if (k[1]) { P.hx = 9 + k[2]; P.hy = -13 - k[2]; }   // 搓手：近侧手凑到握旗杆的手边上来回搓
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 弓腰碎步小跑：旗杆一颠一颠，旗面反向摆
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.bhy += P.bob ? 1 : -1; P.ba = -P.step * ASTEP * 2; P.fph = (f + 2) & 3; P.ear = P.bob ? 1 : -1; P.bell = -P.step; P.lean = 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 双手压低旗枪，从骨臂盾上方连刺两下
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.ear = 1; }
      else if (tq < 3 / 12) { setK(K_JAB, K_JAB, 0); P.bx = 3; P.ear = -1; P.grin = 1; P.fph = 2; }
      else if (tq < 5 / 12) { setK(K_HOLD, K_WIND, 0.45); P.bx = 2; P.fph = 3; }
      else if (tq < 6 / 12) { setK(K_JAB, K_JAB, 0); P.bx = 4; P.ear = -1; P.grin = 1; P.fph = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); P.fph = 1; }
    } else if (st === CHARGE) {                                        // 转身仰望身后的友军，弓背搓手；肌肉鼓起、背刺竖直、旗面卷起
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_LOOK, q); P.flip = tq >= 2 / 12 ? 1 : 0;
      P.hup = tq >= 0.25 ? 1 : 0; P.grin = 1; P.ear = -1; P.hx += (f12 & 1); P.rim = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      P.big = tq >= 0.7 ? 1 : 0; P.spine = tq >= 0.5 ? 2 : 1; P.furl = tq >= 0.6 ? 1 : 0;
    } else if (st === CAST) {                                          // 猛回头咆哮（定格 1 帧）→ 带着怒焰一枪直刺
      P.big = 1; P.spine = 2; P.gem = 3; P.rim = tq < 0.2 ? 3 : 2; P.ear = -1;
      if (tq < 3 / 12) { setK(K_ROAR, K_ROAR, 0); P.roar = 1; P.hup = 1; P.furl = 0; P.fph = 2; }
      else { const q = ease.out(clamp01((tq - 3 / 12) / 0.1)); setK(K_ROAR, K_STAB, q); P.bx = RD(4 * q); P.grin = 1; P.fph = 3; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_STAB, K_IDLE, q); P.bx = RD(4 * (1 - q));
      P.big = q < 0.4 ? 1 : 0; P.spine = q < 0.5 ? 2 : 1; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.fph = (f12 >> 1) & 3;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.sway = 1; P.bell = 1; P.fph = 3; P.roar = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.ear = 1; P.bell = -1; P.fph = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 踉跄 → 双膝跪下抱住旗杆 → 旗杆向前倒下、破旗盖在身上 → 眼里的怒光熄灭
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.sway = 1; P.bell = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 3; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.6) { setK(K_HUG, K_HUG, 0); P.dk = 1; P.bx = -1; P.eyes = 1; P.ear = 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        const q = clamp01((d - 0.6) / 0.3);                            // 旗杆向前倒下（0.3 s），人跟着趴下去
        setK(K_HUG, K_SLUMP, ease.in(q)); P.dk = 2; P.bx = -1; P.eyes = 1; P.ear = 1; P.ba = RD(HALF * ease.in(q) / ASTEP) * ASTEP;
        P.drape = q >= 0.5 ? 1 : 0;
        P.gem = d < 1.0 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.head = 0; P.grin = 0; P.bell = 0; P.hx = K_IDLE.hx; P.hy = K_IDLE.hy; P.so = K_IDLE.so;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const R0 = parts.rig(P, P.big ? BODY_BIG : BODY);                  // 发光体 = 眼
    P.gx = R0.hx0 + 4 + P.bx; P.gy = R0.htop + 2 - P.hup;
    P.dqk = RD(P.dq * 48); P.ba = RD(P.ba / ASTEP); KEY(P); P.ba *= ASTEP;
  }

  // ───── 画（部件从后往前）─────
  let R = null;
  const px = (x, y, m, t) => parts.px(E, R, x, y, m, t), run = (y, a, b, m, t) => parts.run(E, R, y, a, b, m, t);
  // 候选部件：banner —— 挂在杆头下方的破三角旗：沿杆 s、离杆 p（竖杆朝后、平杆朝下），燕尾缺口 + 破洞，fph 飘动相位，furl 卷起，claw 徽记
  const FLAG_L = 6, FLAG_W = 10;
  function banner(sock, a, furl) {
    const d = [Math.sin(a), -Math.cos(a)], side = a < Math.PI / 4 ? [-Math.cos(a), -Math.sin(a)] : [Math.cos(a), Math.sin(a)];
    const A = [sock[0] - d[0], sock[1] - d[1]], W = furl ? 3 : FLAG_W, ph = P.fph;
    E.part();
    const box = W + FLAG_L + 2;
    for (let y = -box; y <= box; y++) for (let x = -box; x <= box; x++) {
      const s = -(x * d[0] + y * d[1]), p = x * side[0] + y * side[1];      // s 沿杆往下（离杆头），p 离开杆
      if (p < -0.5 || p > W + 0.5 || s < -0.5) continue;
      const wave = furl ? 0 : Math.sin(p * 0.9 + ph * 1.57) * (0.35 + p * 0.07), len = FLAG_L * (1 - p / (W + 1.5)) + wave;
      if (s - wave * 0.6 > len) continue;
      const q = p / W; if (q > 0.72 && Math.abs(s - len * 0.45) < 0.9) continue;   // 燕尾缺口
      if (!furl && hash(RD(p), RD(s) + 7) < 0.06 && p > 2) continue;       // 破洞
      const X = RD(A[0] + x), Y = RD(A[1] + y);
      let m = M.flag, tn = 0;
      if (!furl && Math.abs(p - 4.5) < 1.1 && Math.abs(s - 2.2) < 1.1) { m = M.claw; tn = P.gem >= 3 ? 4 : 3; }   // 黄色爪印徽
      else if (((RD(p) + ph) & 3) === 0 && s > 1) tn = 2;               // 旗面褶
      px(X, Y, m, tn);
    }
    if (!furl) { const c = [A[0] + side[0] * 4.5 + (-d[0]) * 0.8, A[1] + side[1] * 4.5 + (-d[1]) * 0.8]; px(RD(c[0]), RD(c[1]), M.claw, P.gem >= 3 ? 4 : 3); }   // 爪印的三个趾点
  }
  // 候选部件：banner（倒地版）—— 破旗盖在趴伏的背上
  function drapeFlag() {                                               // 三角破旗搭在驼背上：肩头最宽，旗尾顺着后背垂到地上，燕尾 + 锯齿破边
    E.part(); const y0 = R.yS - 1, y1 = Math.min(0, R.yHip + 3), n = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const q = (y - y0) / n, E0 = parts.edges(R, CL(y, R.yS, R.yHip)), L = E0[0] - 1 - RD(q * 1.5), w = Math.max(1, RD(9 * (1 - q) + 1));
      for (let x = L; x < L + w; x++) { if (y === y1 && ((x - L) & 1)) continue; if (x === L + w - 1 && ((y + x) & 1) && w > 2) continue; px(x, y, M.flag, ((x - L + y) % 4) === 0 ? 2 : 0); }
    }
    px(parts.edges(R, R.yS + 2)[0] + 3, R.yS + 2, M.claw, 3); px(parts.edges(R, R.yS + 2)[0] + 4, R.yS + 1, M.claw, 3); px(parts.edges(R, R.yS + 3)[0] + 4, R.yS + 3, M.claw, 3);
  }
  const CL = (v, a, b) => (v < a ? a : v > b ? b : v);
  // 背脊骨刺：4 根，更尖（spine 2 = 汲取气势时竖直加长）
  const SPINE_ROW = [1, 4, 7, 10], SPINE_LEN = [3, 4, 3, 2];
  const WARTS = [[3, 2], [5, 3], [4, 6], [7, 5], [2, 9], [6, 8], [9, 2]];
  function spines() {
    E.part();
    for (let k = 0; k < 4; k++) {
      const y = R.yS + SPINE_ROW[k], e = parts.edges(R, y)[0], L = SPINE_LEN[k] + (P.spine === 2 ? 1 : 0), up = P.spine === 2;
      for (let i = -1; i <= L; i++) {
        const w = i <= 0 ? 3 : Math.max(1, RD(3 * (1 - i / (L + 1)))), xx = up ? e - RD(Math.max(0, i) * 0.5) : e - Math.max(0, i), yt = y + 1 - Math.max(0, i) - (up ? RD(Math.max(0, i) * 0.5) : 0);
        for (let j = 0; j < w; j++) px(xx, yt + j, M.bone, i === L ? 4 : j === w - 1 && w > 1 ? 2 : 0);
      }
    }
  }
  // 候选部件：boneSlab（锯齿版）—— 巨魔骨臂盾长大一圈（6×10），外沿一排锯齿
  const SLAB = ['hhBB..', 'hBBBBB', 'hBrBBd', 'BBBrBd', 'BMBBrd', 'BBBBBd', '.BBBBd', '.BBBd.', '.BBBd.', '..BBd.'];
  const TEETH = [[6, 1], [7, 0], [6, 4], [7, 3], [6, 7], [5, 9], [2, -1], [4, -1], [3, -2]];
  const ORI = [[1, 0, 0, 1], [1, 0, 0, -1], [0, -1, 1, 0]];
  function boneSlab(hx, hy, so) {
    const A = ORI[so], at = (u, v) => [hx + A[0] * u + A[1] * (v - 3), hy + A[2] * u + A[3] * (v - 3)];
    E.part();
    for (let v = 0; v < SLAB.length; v++) for (let u = 0; u < 6; u++) { const ch = SLAB[v][u]; if (ch === '.') continue; const p = at(u, v); px(p[0], p[1], ch === 'M' ? M.claw : M.bone, ch === 'h' || ch === 'r' ? 4 : ch === 'd' ? 2 : ch === 'M' ? 2 : 0); }
    for (const [u, v] of TEETH) { const p = at(u, v); px(p[0], p[1], M.bone, 4); }
  }
  function head() {                                                    // 长下巴、眉骨压眼、上翘长獠牙（高出上唇 3 格）；grin 谄笑露牙、roar 张嘴咆哮
    const x0 = R.hx0, top = R.htop - P.hup, sk = M.skin, c = (i) => x0 + i, r = (j) => top + j;
    E.part();
    run(r(0), c(1), c(4), sk, 0); run(r(1), c(0), c(5), sk, 0); run(r(2), c(0), c(5), sk, 0); run(r(3), c(0), c(6), sk, 0);
    if (P.roar) { run(r(4), c(1), c(6), sk, 0); run(r(5), c(1), c(3), sk, 0); run(r(6), c(2), c(5), sk, 0); run(r(7), c(3), c(6), sk, 0); px(c(4), r(5), M.mouth, 1); px(c(5), r(5), M.mouth, 2); px(c(6), r(5), M.mouth, 2); px(c(4), r(6), M.mouth, 1); px(c(5), r(4), M.bone, 4); }
    else { run(r(4), c(1), c(6), sk, 0); run(r(5), c(1), c(6), sk, 0); run(r(6), c(2), c(6), sk, 0); }
    px(c(5), r(1), sk, 4); px(c(6), r(1), sk, 4);                       // 眉骨前凸
    if (P.eyes) { px(c(4), r(2), sk, 1); px(c(5), r(2), sk, 1); } else { px(c(4), r(2), M.eye, P.gem >= 3 ? 4 : P.gem === 4 ? 1 : 3); px(c(5), r(2), sk, 2); }
    px(c(6), r(3), sk, 3); px(c(5), r(3), sk, 2);                       // 鼻头 + 鼻孔
    if (!P.roar) { if (P.grin) { px(c(4), r(4), M.bone, 4); px(c(5), r(4), M.bone, 3); px(c(3), r(4), sk, 1); } else { px(c(4), r(4), sk, 1); px(c(5), r(4), sk, 1); } }
    const ty = P.roar ? 1 : 0;                                          // 近侧獠牙：从下颌往上翘，高出上唇 3 格（咆哮时随下颌往下 1 格）
    for (let j = 1; j <= 6; j++) px(c(7), r(j) + ty, M.bone, j === 1 ? 4 : j >= 5 ? 2 : 3);
    px(c(1), r(1), sk, 4); px(c(1), r(5), sk, 2); px(c(2), r(6) + (P.roar ? 1 : 0), sk, 2);
    // 后掠长耳（比巨魔长 1 格），ear -1 竖起 · 0 · 1 耷拉
    E.part(); const ea = P.ear, tipY = r(-1) + (ea < 0 ? -1 : ea > 0 ? 3 : 0);
    px(c(0), r(2), sk, 0); px(c(0), r(3), sk, 2); px(c(-1), r(2), sk, 0); px(c(-1), r(1) + (ea > 0 ? 1 : 0), sk, 0); px(c(-2), r(1) + (ea > 0 ? 1 : 0), sk, 0);
    px(c(-2), r(2), sk, 2); px(c(-3), r(0) + (ea > 0 ? 2 : 0), sk, 0); px(c(-3), r(1) + (ea > 0 ? 2 : 0), sk, 2); px(c(-4), tipY, sk, 4); if (ea < 0) px(c(-4), tipY + 1, sk, 0);
  }
  function collar() {                                                  // 皮项圈 + 铜铃（随从的标记）
    E.part(); const y = R.hy + 1; run(y, R.hx0, R.hx1 - 1, M.collar, 0); px(R.hx0 + 2, y, M.collar, 4);
    E.part(); const bx = R.hx1 - 1 + P.bell, by = y + 1; px(bx, by, M.bell, 4); px(bx - 1, by + 1, M.bell, 3); px(bx, by + 1, M.bell, 3); px(bx + 1, by + 1, M.bell, 2); px(bx, by + 2, M.bell, 1);
  }
  function kneelLegs() {                                               // 双膝跪地：大腿竖直、小腿平贴地面往后
    const w = R.lw, yh = R.yHip + 1;
    for (const [hx, m, bm] of [[R.hipBx, M.legD, M.boneD], [R.hipFx, M.leg, M.bone]]) {
      E.part();
      for (let y = yh; y <= -2; y++) { const c = hx + RD((y - yh) / Math.max(1, -2 - yh) * 2); run(y, c - 1, c - 1 + w - 1, m, 0); }
      run(-1, hx - 4, hx + 2, m, 0); run(0, hx - 5, hx + 2, m, 0); px(hx - 6, 0, bm, 3);
    }
  }
  function loincloth() {
    E.part(); const y0 = R.yHip - 1, e = parts.edges(R, y0), sw = P.sway;
    run(y0, e[0], e[1], M.hide, 0); px(e[1] - 1, y0, M.hide, 4);
    const FW = [3, 3, 2]; for (let k = 0; k < 3; k++) { const y = R.yHip + k, s = k >= 1 ? sw : 0, b = e[1] - 1 + s; run(y, b - FW[k] + 1, b, M.hide, 0); }
    for (let k = 0; k < 2; k++) { const y = R.yHip + k; run(y, e[0] - (k ? P.sway : 0), e[0] + 1 - (k ? P.sway : 0), M.hide, 0); }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); R = parts.rig(P, P.big ? BODY_BIG : BODY);
    if (!P.drape) {                                                    // 旗枪 + 破旗（在远侧手里，最后面）
      const sp = parts.spear(E, R, P, SPEAR); banner(sp.socket, P.ba, P.furl);
    } else parts.spear(E, R, P, SPEAR);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
    if (P.dk) kneelLegs(); else parts.legs(E, R, P, { style: 'bare', mat: M.leg, matD: M.legD });
    if (!P.dk) { E.part(); px(R.footFx + 3, -R.footFup, M.bone, 3); px(R.footBx + 2, -R.footBup, M.boneD, 3); }
    parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    for (const [dx, dy] of WARTS) { const y = R.yS + dy, e = parts.edges(R, y); px(e[0] + dx, y, M.skin, 2); }   // 驼背上的疙瘩斑（和躯干同一部件）
    loincloth();
    spines();
    head();
    collar();
    if (P.drape) drapeFlag();
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, grip: 'none' });
    boneSlab(P.hx, P.hy, P.so);
    parts.hand(E, R, P, { hand: M.skin, grip: 'big' });
  }
  // 死亡消散时破旗最后消失：按自己的顺序删像素（身体先、旗晚 0.3）
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.drape ? 0 : P.dq; bake(hero, RIM);
    if (P.drape && P.dq > 0) {
      const s = hero, o = s.out; let top = s.h, bot = -1; for (let i = 0; i < o.length; i++) if (o[i] !== 255) { const y = (i / s.w) | 0; if (y < top) top = y; if (y > bot) bot = y; }
      const span = Math.max(1, bot - top), qb = P.dq, qf = clamp01((P.dq - 0.3) / 0.7);
      for (let y = top; y <= bot; y++) for (let x = 0; x < s.w; x++) { const i = y * s.w + x; if (o[i] === 255) continue; const q = s.mat[i] === M.flag || s.mat[i] === M.claw ? qf : qb; if (B8[(y & 7) * 8 + (x & 7)] * 0.55 + (y - top) / span * 0.45 < q) o[i] = 255; }
    }
  }

  // ───── 特效 ─────
  let jabT = 9, jabN = 0, flameT = 9, arrowT = 9, chargeAcc = 0, soulAcc = 0, flameAcc = 0, lastStep = 0, lastBell = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function tipW() { const t = parts.spear.focus(P, SPEAR); return [wx(t[0] + P.bx), wy(t[1])]; }
  function edgeEmbers(n, spd) {                                        // 沿剪影外沿窜起的硫黄怒焰
    const s = hero, o = s.out;
    for (let k = 0, got = 0; k < n * 12 && got < n; k++) {
      const x = (Math.random() * s.w) | 0, y = (Math.random() * s.h) | 0, i = y * s.w + x; if (o[i] === 255) continue;
      if (!(y === 0 || o[i - s.w] === 255 || x === 0 || o[i - 1] === 255 || x === s.w - 1 || o[i + 1] === 255)) continue;
      got++; spawn(K_EMBER, scrX(x - s.ox), HY + y - s.oy, (Math.random() - 0.5) * 8, -spd - Math.random() * spd, 0.35 + Math.random() * 0.35, R_EL);
    }
  }
  function onEnter(s) {
    if (s === CHARGE) { allyFx({ dur: 2.6, outline: R_EL }); const a = allyPoints()[0]; fx.link(a.x + 3, a.top + 2, HX - 4, HY - 20, R_EL, 2.3, 1); }
    if (s === CAST) {
      flameT = 0; const gx = wx(P.gx), gy = wy(P.gy);
      E.releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); ring(wx(2), HY - 12, 1, R_EL); burst(wx(2), HY - 12, 30, 60, 140, 0.3, 0.7, R_EL, 12); fx.cross(gx + 2, gy, 6, R_EL, 0.3);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.45 });
    }
  }
  function jabHit(big) {
    const t = tipW(), x = Math.min(t[0], DUMMY_X + 2), y = t[1];
    jabT = 0; burst(x, y, big ? 36 : 10, big ? 60 : 40, big ? 150 : 100, 0.2, big ? 0.6 : 0.35, big ? R_EL : R_IMP, 10); fx.cross(x, y, big ? 7 : 4, big ? R_EL : R_IMP, big ? 0.3 : 0.18);
    hitDummy(big ? 1 : 0);
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_JAB1 || t === T_JAB2)) { jabN = t === T_JAB1 ? 1 : 2; jabHit(0); sfx('swing', { kind: 'thrust', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.35 }); }
    if (s === CAST && Math.abs(t - T_STAB) < 1e-9) { jabN = 3; jabHit(1); arrowT = 0; shake(0.12, 1); sfx('swing', { kind: 'thrust', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 }); sfx('impact', { pal: 'fire', w: 0.6 }); }
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.08, 1); }
    if (s === DEATH && Math.abs(t - T_POLE) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 4 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.45 }); }
  }
  const EVENTS = [[], [], [T_JAB1, T_JAB2], [], [T_STAB], [], [], [T_KNEE, T_POLE], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.2) {                               // 气势沿连线从友军流向黄魔（定点汇聚）
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      const a0 = allyPoints()[0], tx = HX - 2, ty = HY - 17;
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = a0.x + 2 + (Math.random() - 0.5) * 6, sy = a0.top + 4 + (Math.random() - 0.5) * 8, dx = sx - tx, dy = sy - ty, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, tx, ty, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: 0, squash: 1 });
      }
    }
    if ((state === CAST || (state === RECOVER && stT < 0.45)) && P.dq < 1) { flameAcc += dt * (state === CAST ? 90 : 40 * (1 - stT / 0.45)); const n = Math.floor(flameAcc); if (n) { flameAcc -= n; edgeEmbers(n, 18); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === IDLE && P.bell !== lastBell) { if (P.bell === 1) { const b = [wx(parts.rig(P, BODY).hx1), wy(parts.rig(P, BODY).hy + 3)]; for (let i = 0; i < 3; i++) spawn(K_EMBER, b[0] + i - 1, b[1], (i - 1) * 10, -10, 0.3, FXI.coin); } lastBell = P.bell; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.5) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    jabT += dt; flameT += dt; arrowT += dt;
  }
  function fxReset() { jabT = 9; jabN = 0; flameT = 9; arrowT = 9; chargeAcc = 0; soulAcc = 0; flameAcc = 0; lastStep = 0; lastBell = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx - P.bx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (jabT < 2 / 12) {                                               // 直线刺击拖影（杆尖后面一条亮线）
      const t = tipW(), big = jabN === 3, R_ = big ? EL : FXR[R_IMP], L = big ? 16 : 10;
      for (let k = 2; k < L; k++) { if (jabT >= 1 / 12 && (k & 1)) continue; const c = k < 4 ? R_[0] : k < 9 ? R_[1] : R_[2]; put(t[0] - k, t[1] - 1, c); if (big && k < 12) put(t[0] - k, t[1] + 1, R_[2]); }
    }
    if (arrowT < 1.1) {                                                // 头顶飘出两个向上的小箭头（攻防提升）
      const hx = wx(5), hy = wy(-30);
      for (let k = 0; k < 2; k++) {
        const a = arrowT - k * 0.12; if (a < 0 || a > 0.9) continue; const q = a / 0.9, x = hx + (k ? 4 : -3), y = RD(hy - a * 12), c = EL[q < 0.2 ? 0 : q < 0.5 ? 1 : q < 0.75 ? 2 : 3];
        if (q > 0.75 && (f12 & 1)) continue;
        put(x, y, c); put(x - 1, y + 1, c); put(x + 1, y + 1, c); put(x - 2, y + 2, c); put(x + 2, y + 2, c); put(x, y + 1, c); put(x, y + 2, c); put(x, y + 3, c);
      }
    }
  }

  return {
    name: '黄魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.claw], HIT_POINT: [4, -14], EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'flesh', how: 'collapse', pal: 'fire', style: 'buff', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
