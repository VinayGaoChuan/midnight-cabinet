// 黄魔（部队 · 兽人 · 先锋 · 稀有）：巨魔升级的一支——给强者扛旗的跟班。佝偻前探、膝微屈、手长到膝，比巨魔矮一点但更粗壮；
// 远侧手在肩头握住一根比身体还高的骨尖旗枪、扛在肩上往后上方斜伸（深红破三角旗 + 黄色爪印徽高高飘在驼背上方），
// 近侧前臂的骨臂盾长大一圈、外沿一排锯齿，垂在膝前；头往前探、压在肩线前面；
// 保留巨魔的后掠长耳、上翘獠牙（更长）、背脊骨刺（4 根、更尖，沿驼背扇形排开）；硫黄赭黄的皮肤，脖子上皮项圈挂一枚铜铃。
// 攻击 = 双手端平旗枪、从骨臂盾上方向前连刺两下；技能 = 特性「随从」生效：身后出现一名更强的友军，黄魔转身仰望、
// 沿连线汲取它的气势，猛回头咆哮、全身窜起硫黄怒焰，带着怒焰一枪直刺（身边强力友军越多越强）。
PCD.define('YellowDemon', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, allyPoints, allyFx, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：随从 · 硫黄怒焰（白 → 淡黄 → 硫黄 → 橙 → 焦褐）─────
  const R_EL = fxRamp('sulfur', [21, 51, 47, 46, 20]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: ['#2a1a06', '#6a4812', '#a8842a', '#d8b858'],          // 硫黄赭皮（主材质）
    leg: ['#2a1a06', '#6a4812', '#a8842a', '#d8b858'],           // 同色：腿不吃轮廓光
    bone: 'bone', flag: { r: 'crimson', band: 1 }, wood: 'wood', collar: 'leather', bell: 'gold', hide: [20, 20, 19, 32],
    eye: { r: [20, 46, 47, 21], flat: 1 },                         // 眼里的硫黄怒光（发光体；施放时闪白）
    claw: { r: [20, 46, 47, 21], flat: 1 },                        // 旗面爪印徽（施放时闪白）
    mouth: [55, 55, 56, 57],
  });
  const BODY = { body: 'hunched', leg: 10, torso: 11, head: 6, headW: 7, sw: 4, hunch: 3, headX: 5, neck: -3, arm: 12, limb: 1.4, lw: 3, stride: 2, lift: 1, fall: 'front' };
  const BODY_BIG = Object.assign({}, BODY, { sw: 5, limb: 1.7 });   // 汲取气势：肌肉鼓起 1 格
  // 旗枪握法：0 扛在肩上（待机、移动：远侧手在肩头握住，杆往后上方斜伸）· 1 端平直刺（握在杆中段）· 2 双手抱住（死亡跪姿）
  const POLE = [[11, 3], [12, 16], [18, 4]];
  const spearOf = () => ({ hand: 'B', style: 'leaf', wood: M.wood, metal: M.bone, trim: M.collar, len: POLE[P.plen][0], back: POLE[P.plen][1] });
  const HX = 76, DUR = DEFAULT_DUR.slice(), ALLY_X = [HX - 27];
  const hero = new Sprite(88, 62, 42, 55);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'claw', 'wood', 'flag', 'leg', 'hide', 'mouth', 'bell', 'collar']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：远侧手握旗枪（bhx bhy ba，plen 握法），近侧前臂 = 锯齿骨臂盾（hx hy，so 朝向）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ba: 0, plen: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, ear: 0, hup: 0,
    spine: 1, so: 0, big: 0, grin: 0, roar: 0, bell: 0, fph: 0, furl: 0, drape: 0, dk: 0, eyes: 0, flash: 0, lying: 0, lift: 0,
    gem: 0, rim: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  // so：骨臂盾朝向 0 前臂竖起（手在上、外侧朝前）· 1 前臂下垂（手在下）· 2 前臂平伸（外侧朝下，托在旗枪下面）
  const K = (hx, hy, bhx, bhy, ba, plen, lean, head, crouch, so) => ({ hx, hy, bhx, bhy, ba, plen, lean: lean || 0, head: head || 0, crouch: crouch || 0, so: so || 0 });
  const K_IDLE = K(11, -9, 2, -22, -0.46, 0, 0, 0, 1, 0);       // 旗枪扛在肩上（远侧手在肩头握住，杆往后上方斜伸、破旗飘在驼峰上方），锯齿骨臂盾垂在膝前
  const K_WIND = K(5, -12, -1, -12, HALF, 1, -1, 0, 2, 2);       // 双手端平旗枪往后收
  const K_JAB = K(10, -12, 4, -12, HALF, 1, 1, 1, 1, 2);         // 连刺（前冲在 bx 里）：骨臂盾托在旗枪下面
  const K_HOLD = K(8, -12, 2, -12, HALF, 1, 1, 0, 1, 2);
  const K_LOOK = K(10, -13, 2, -23, -0.3, 0, -1, 0, 2, 0);       // 蓄力：转身仰望友军、旗杆扛直一点、弓背搓手
  const K_ROAR = K(14, -15, 2, -22, -0.46, 0, -1, 1, 0, 0);      // 猛回头咆哮：骨臂盾往前一挺
  const K_STAB = K(11, -12, 5, -12, HALF, 1, 1, 1, 1, 2);        // 带怒焰的一枪直刺
  const K_HURT = K(10, -10, 1, -21, -0.75, 0, -1, -1, 1, 0);
  const K_HUG = K(11, -12, 10, -12, 0, 2, 1, 1, 4, 0);           // 双膝跪下、双手抱住旗杆
  const K_SLUMP = K(11, -6, 10, -5, 0, 2, 2, 1, 5, 1);           // 趴伏下去，旗杆倒在地上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => { E.mix(P, A, B, q, FIELDS); P.so = q < 0.5 ? A.so : B.so; P.plen = q < 0.5 ? A.plen : B.plen; };
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['ba', -16, 16], ['plen', 0, 2], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['ear', -1, 1], ['hup', 0, 1], ['spine', 0, 2], ['so', 0, 2], ['big', 0, 1], ['grin', 0, 1], ['roar', 0, 1],
    ['bell', -1, 1], ['fph', 0, 3], ['furl', 0, 1], ['drape', 0, 1], ['dk', 0, 2], ['eyes', 0, 1], ['flash', 0, 1], ['lift', 0, 3], ['gem', 0, 4], ['rim', 0, 3],
    ['dqk', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const EAR_IDLE = [0, 0, -1, 0], SWAY_IDLE = [0, 1, 0, -1];         // 待机时长耳每圈竖一下（不再耷拉：耷拉的耳朵会埋进驼峰）
  // 长耳中线（相对头的 c(0) r(0)，从后脑往尖端），ear -1 竖起 · 0 平时往后上方斜伸 · 1 耷拉往后平伸；EAR_SHADE = 背光一侧的偏移
  const EARS = [[[0, 2], [-1, 1], [-1, 0], [-1, -1], [-2, -2], [-2, -3], [-2, -4], [-3, -5]],
    [[0, 2], [-1, 1], [-1, 0], [-2, -1], [-2, -2], [-3, -3], [-3, -4]],
    [[0, 2], [-1, 2], [-2, 1], [-3, 1], [-4, 1], [-5, 2]]];
  const EAR_SHADE = [[1, 0], [1, 0], [0, 1]];
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
        if (k[1]) { P.hx = 10 + k[2]; P.hy = -12 - k[2]; }            // 搓手：近侧手凑到下巴底下来回搓
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 弓腰碎步小跑：旗杆一颠一颠（杆脚离地），旗面反向摆
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.bhy += P.bob ? 1 : 0; P.fph = (f + 2) & 3; P.ear = P.bob ? 0 : -1; P.bell = -P.step; P.hx += P.step; P.crouch = 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 双手端平旗枪，从骨臂盾上方连刺两下
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.ear = 1; P.fph = 1; }
      else if (tq < 3 / 12) { setK(K_JAB, K_JAB, 0); P.bx = 3; P.ear = -1; P.grin = 1; P.fph = 2; }
      else if (tq < 5 / 12) { setK(K_HOLD, K_WIND, 0.45); P.bx = 2; P.fph = 3; }
      else if (tq < 6 / 12) { setK(K_JAB, K_JAB, 0); P.bx = 4; P.ear = -1; P.grin = 1; P.fph = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); P.fph = 1; }
    } else if (st === CHARGE) {                                        // 转身仰望身后的友军，弓背搓手；肌肉鼓起、背刺竖直、旗面卷起
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_LOOK, q); P.flip = tq >= 2 / 12 ? 1 : 0;
      P.hup = tq >= 0.25 ? 1 : 0; P.grin = 1; P.ear = -1; P.hx += (f12 & 1); P.rim = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      P.big = tq >= 0.7 ? 1 : 0; P.spine = tq >= 0.5 ? 2 : 1; P.furl = tq >= 0.6 ? 1 : 0;
    } else if (st === CAST) {                                          // 猛回头咆哮（定格 3 帧）→ 第 3 帧（T_STAB）就端平旗枪、前冲直刺（冲过头 1 格再收回 4 格）
      P.big = 1; P.spine = 2; P.gem = 3; P.rim = tq < 0.2 ? 3 : 2; P.ear = -1;
      if (tq < T_STAB) { setK(K_ROAR, K_ROAR, 0); P.roar = 1; P.hup = 1; P.furl = 0; P.fph = 2; }
      else { setK(K_STAB, K_STAB, 0); P.bx = tq < T_STAB + 0.5 / 12 ? 5 : 4; P.grin = 1; P.fph = 3; }
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
  const CL = (v, a, b) => (v < a ? a : v > b ? b : v);
  const glowT = () => (P.gem === 3 ? 4 : P.gem === 4 ? 1 : 3);        // 发光体（眼、爪印徽）：待机 / 蓄力 3 级，施放闪白，熄灭变焦褐
  // 候选部件：banner —— 挂在杆头下方的破三角旗：沿杆 s（从杆头往下）、离杆 p；竖杆时往后飘，平杆时垂下并往后拖（shear）；
  //   燕尾缺口 + 破洞，fph 飘动相位，furl 卷起，claw 徽记
  function banner(sock, a, furl) {
    const d = [Math.sin(a), -Math.cos(a)], flat = Math.abs(a) > Math.PI / 4, side = flat ? [0, 1] : [-1, 0];
    const L = flat ? 5 : 6, W = furl ? 3 : flat ? 6 : 10, shear = flat ? 0.6 : 0, ph = P.fph;
    const A = [sock[0] - d[0], sock[1] - d[1]];
    E.part();
    const box = W + L + 8;
    for (let y = -box; y <= box; y++) for (let x = -box; x <= box; x++) {
      const p = x * side[0] + y * side[1], s0 = -(x * d[0] + y * d[1]), s = s0 - p * shear;   // s 沿杆往下 / 往后（离杆头），p 离开杆
      if (p < -0.5 || p > W + 0.5 || s < -0.5) continue;
      const wave = furl ? 0 : Math.sin(p * 0.9 + ph * 1.57) * (0.35 + p * 0.07), len = L * (1 - p / (W + 1.5)) + wave;
      if (s - wave * 0.6 > len) continue;
      const q = p / W; if (!furl && q > 0.72 && Math.abs(s - len * 0.45) < 0.9) continue;   // 燕尾缺口
      if (!furl && hash(RD(p), RD(s) + 7) < 0.06 && p > 2 && p < W - 1) continue;        // 破洞
      const X = RD(A[0] + x), Y = RD(A[1] + y);
      let m = M.flag, tn = 0;
      if (!furl && Math.abs(p - 3.5) < 1.1 && Math.abs(s - 2.2) < 1.1) { m = M.claw; tn = glowT(); }   // 黄色爪印徽（掌）
      else if (((RD(p) + ph) & 3) === 0 && s > 1) tn = 2;               // 旗面褶
      px(X, Y, m, tn);
    }
    if (!furl) {                                                       // 爪印的三个趾点
      const c = (pp, ss) => [RD(A[0] + side[0] * pp + (-d[0]) * (ss + pp * shear)), RD(A[1] + side[1] * pp + (-d[1]) * (ss + pp * shear))];
      for (const [pp, ss] of [[5.5, 0.6], [5.5, 3.6], [6, 2.1]]) { const q = c(pp, ss); px(q[0], q[1], M.claw, glowT()); }
    }
  }
  // 候选部件：banner（倒地版）—— 破旗盖在趴伏的背上
  function drapeFlag() {                                               // 三角破旗搭在驼背上：肩头最宽，旗尾顺着后背垂到地上，燕尾 + 锯齿破边
    E.part(); const y0 = R.yS - 2, y1 = Math.min(0, R.yHip + 3), n = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const q = (y - y0) / n, E0 = parts.edges(R, CL(y, R.yS, R.yHip)), L = E0[0] - 1 - RD(q * 1.5), w = Math.max(1, RD(9 * (1 - q) + 1));
      for (let x = L; x < L + w; x++) { if (y === y1 && ((x - L) & 1)) continue; if (x === L + w - 1 && ((y + x) & 1) && w > 2) continue; px(x, y, M.flag, ((x - L + y) % 4) === 0 ? 2 : 0); }
    }
    const e = parts.edges(R, R.yS + 2)[0]; px(e + 3, R.yS + 2, M.claw, glowT()); px(e + 4, R.yS + 1, M.claw, glowT()); px(e + 4, R.yS + 3, M.claw, glowT());
  }
  // 驼峰（和躯干同一部件）：肩胛上方鼓起 3 行，疙瘩斑点在上面
  function humpRows() {
    const e = parts.edges(R, R.yS), L = e[0] - 1;
    run(R.yS - 1, L, L + 6, M.skin, 0); run(R.yS - 2, L + 1, L + 5, M.skin, 0); run(R.yS - 3, L + 2, L + 4, M.skin, 0);
    return [L + 3, R.yS - 3];
  }
  const WARTS = [[3, -1], [5, -2], [2, 1], [5, 2], [2, 5], [4, 7], [7, 0]];
  // 候选部件：spineSpurs —— 背脊骨刺：4 根，沿驼背扇形排开（上面的朝后上、越往下越朝后），每根是根粗尖细的三角骨锥：
  //   根部 3 格宽、压进背里 1 格，往尖端线性收窄，尖端收成 1 格骨白；受光的上沿亮、背光的下沿暗、根部压暗；
  //   spine 2 = 汲取气势时整排竖起一档（往上转 0.3）、加长 1 格（和巨魔同一写法，多一根、更长更粗）
  const SPINES = [[0, 0.62, 5], [3, 0.92, 5], [6, 1.2, 4], [9, 1.47, 3]];   // 从肩头往下第几行（后沿）、角度（从竖直往后，弧度）、长度
  const LIT = [-0.7071, -0.7071];                                     // 光从左上来
  function spines() {
    E.part(); const up = P.spine === 2 ? 1 : 0;
    for (const [dy, a0, L0] of SPINES) {
      const y0 = R.yS + dy, e = parts.edges(R, y0)[0], a = a0 - up * 0.3, L = L0 + up;
      const dx = -Math.sin(a), dz = -Math.cos(a), nx = -dz, ny = dx, lit = nx * LIT[0] + ny * LIT[1] > 0 ? 1 : -1;
      const bx = e + 1, by = y0 + 1;                                   // 根的中心压进背里 1 格
      for (let y = RD(by - L - 3); y <= RD(by + 3); y++) for (let x = RD(bx - L - 3); x <= RD(bx + 3); x++) {
        const rx = x - bx, ry = y - by, s = rx * dx + ry * dz, t = rx * nx + ry * ny;
        if (s < -0.6 || s > L + 0.4) continue;
        const hw = 1.55 * (1 - Math.max(0, s) / (L + 0.6));
        if (Math.abs(t) > hw + 0.25) continue;
        const tl = t * lit, tn = s > L - 1.1 ? 4 : s < 0.6 ? 2 : hw < 0.8 ? 3 : tl > 0.45 ? 4 : tl < -0.45 ? 2 : 3;
        px(x, y, M.bone, tn);
      }
    }
  }
  // 候选部件：boneSlab（锯齿版）—— 巨魔骨臂盾长大一圈（6×10），外沿一排锯齿；u 向外、v 向肘
  const SLAB = ['hhBBB.', 'hBBBBB', 'hBrBBd', 'BBBrBd', 'BMBBrd', 'BBBBBd', '.BBBBd', '.BBBd.', '.BBBd.', '..BBd.'];
  const TEETH = [[6, 0], [7, 1], [6, 3], [7, 4], [6, 6], [5, 8], [1, -1], [3, -1], [4, -2]];
  const ORI = [[1, 0, 0, 1], [1, 0, 0, -1], [0, -1, 1, 0]];
  function boneSlab(hx, hy, so) {
    const A = ORI[so], at = (u, v) => [hx + A[0] * u + A[1] * (v - 3), hy + A[2] * u + A[3] * (v - 3)];
    E.part();
    for (let v = 0; v < SLAB.length; v++) for (let u = 0; u < 6; u++) { const ch = SLAB[v][u]; if (ch === '.') continue; const p = at(u, v); px(p[0], p[1], ch === 'M' ? M.claw : M.bone, ch === 'h' || ch === 'r' ? 4 : ch === 'd' ? 2 : ch === 'M' ? 2 : 0); }
    for (const [u, v] of TEETH) { const p = at(u, v); px(p[0], p[1], M.bone, 4); }
  }
  // 头：宽 8 的长脸、眉骨压着发光的眼、长鼻头、前突的下颌；近侧獠牙从下颌翘起、高出上唇 3 格；grin 谄笑露牙、roar 张嘴咆哮
  function head() {
    const x0 = R.hx0, top = R.htop - P.hup, sk = M.skin, c = (i) => x0 + i, r = (j) => top + j, ro = P.roar ? 1 : 0;
    E.part();
    run(r(0), c(1), c(4), sk, 0); run(r(1), c(0), c(5), sk, 0); run(r(2), c(0), c(6), sk, 0); run(r(3), c(0), c(7), sk, 0);
    if (ro) { run(r(4), c(1), c(3), sk, 0); run(r(5), c(2), c(3), sk, 0); run(r(6), c(2), c(6), sk, 0); run(r(4), c(4), c(7), M.mouth, 2); run(r(5), c(4), c(6), M.mouth, 1); px(c(5), r(4), M.bone, 4); px(c(7), r(5), M.bone, 3); }
    else { run(r(4), c(1), c(7), sk, 0); run(r(5), c(2), c(6), sk, 0); }
    px(c(1), r(0), sk, 4); px(c(4), r(1), sk, 4); px(c(5), r(1), sk, 4); px(c(6), r(2), sk, 4);   // 头顶高光 + 前凸的眉骨
    if (P.eyes) { px(c(4), r(2), sk, 1); px(c(5), r(2), sk, 1); } else { px(c(4), r(2), M.eye, glowT()); px(c(5), r(2), sk, 1); }
    px(c(7), r(3), sk, 3); px(c(6), r(3), sk, 1); px(c(3), r(3), sk, 2);                         // 鼻头 + 鼻孔 + 颧骨阴影
    if (!ro) {
      if (P.grin) { px(c(4), r(4), M.bone, 4); px(c(5), r(4), sk, 1); px(c(6), r(4), M.bone, 3); px(c(3), r(4), sk, 1); }
      else { px(c(4), r(4), sk, 1); px(c(5), r(4), sk, 1); px(c(6), r(4), sk, 1); }
      px(c(2), r(5), sk, 2); px(c(3), r(5), sk, 2);
    }
    // 近侧獠牙：根从下颌前角伸出，往前拐一格再往上翘到高出上唇 3 格；和鼻头 / 上唇之间空一格（勾线），不贴着脸
    px(c(7), r(5) + ro, M.bone, 2); px(c(8), r(5) + ro, M.bone, 3);
    for (let j = 1; j <= 4; j++) px(c(9), r(j) + ro, M.bone, j === 1 ? 4 : j === 4 ? 2 : 3);
    // 后掠长耳：从后脑往后上方伸出，尖端伸进旗杆和头顶之间的空当（剪影里看得出）；上沿亮、下沿暗
    E.part(); const ea = P.ear, EP = EARS[ea + 1], sd = EAR_SHADE[ea + 1];
    for (let i = 0; i < EP.length; i++) {
      const X = c(EP[i][0]), Y = r(EP[i][1]);
      if (i === EP.length - 1) { px(X, Y, sk, 4); continue; }
      px(X + sd[0], Y + sd[1], sk, i === 0 ? 2 : 0); px(X, Y, sk, i === 0 ? 0 : 4);
    }
  }
  function collar() {                                                  // 皮项圈（斜着勒在脖子上）+ 铜铃（随从的标记）
    E.part(); const x0 = R.hx0, y = R.hy;
    px(x0 - 1, y - 1, M.collar, 0); px(x0, y, M.collar, 0); px(x0 + 1, y + 1, M.collar, 0); px(x0 + 2, y + 1, M.collar, 4); px(x0 + 3, y + 1, M.collar, 0); px(x0 - 1, y, M.collar, 2); px(x0, y + 1, M.collar, 2);
    E.part(); const bx = x0 + 3 + P.bell, by = y + 2; px(bx, by, M.bell, 4); px(bx - 1, by + 1, M.bell, 3); px(bx, by + 1, M.bell, 3); px(bx + 1, by + 1, M.bell, 2); px(bx, by + 2, M.bell, 1);
  }
  function kneelLegs() {                                               // 双膝跪地：大腿竖直、小腿平贴地面往后
    const w = R.lw, yh = R.yHip + 1;
    for (const [hx, m, bm] of [[R.hipBx, M.legD, M.boneD], [R.hipFx, M.leg, M.bone]]) {
      E.part();
      for (let y = yh; y <= -2; y++) { const c = hx + RD((y - yh) / Math.max(1, -2 - yh) * 2); run(y, c - 1, c - 1 + w - 1, m, 0); }
      run(-1, hx - 4, hx + 2, m, 0); run(0, hx - 5, hx + 2, m, 0); px(hx - 6, 0, bm, 3);
    }
  }
  function loincloth() {                                               // 短兽皮缠腰布：腰一圈 + 前片垂到大腿、后片短
    E.part(); const y0 = R.yHip - 1, e = parts.edges(R, y0), sw = P.sway;
    run(y0, e[0], e[1], M.hide, 0); px(e[1] - 1, y0, M.hide, 4); px(e[0] + 2, y0, M.hide, 2);
    const FW = [3, 3, 2]; for (let k = 0; k < 3; k++) { const y = R.yHip + k, s = k >= 1 ? sw : 0, b = e[1] - 1 + s; run(y, b - FW[k] + 1, b, M.hide, 0); }
    for (let k = 0; k < 2; k++) { const y = R.yHip + k; run(y, e[0] - (k ? P.sway : 0), e[0] + 1 - (k ? P.sway : 0), M.hide, 0); }
  }
  function feet() { E.part(); px(R.footFx + 3, -R.footFup, M.bone, 3); px(R.footBx + 2, -R.footBup, M.boneD, 3); }
  function drawHero() {
    E.begin(hero, P.bx, 0); R = parts.rig(P, P.big ? BODY_BIG : BODY);
    if (P.walk && P.step > 0) R.footFx += 1; else if (P.walk && P.step < 0) R.footBx += 1;   // 碎步的接触帧：迈出去的那只脚再往前 1 格，两脚前后错得开
    const SP = spearOf(), front = P.plen !== 0;                         // 扛在肩上：旗枪在远侧（身后）；端平直刺、抱住：在身体前面
    let sock = null; const pole = () => { sock = parts.spear(E, R, P, SP).socket; if (!P.drape && !front) banner(sock, P.ba, P.furl); };
    if (!front) pole();
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: front ? 'none' : 'big' });
    if (P.dk) kneelLegs(); else { parts.legs(E, R, P, { style: 'bare', mat: M.leg, matD: M.legD }); feet(); }
    parts.torso(E, R, P, { style: 'bare', mat: M.skin }); const top = humpRows();
    for (const [dx, dy] of WARTS) { const y = R.yS + dy, e = y < R.yS ? top[0] - 3 : parts.edges(R, y)[0]; px(e + dx, y, M.skin, 2); }   // 驼背上的疙瘩斑（和躯干同一部件）
    loincloth();
    spines();
    if (!front) parts.hand(E, R, P, { side: 'B', hand: M.skinD, grip: 'big' });   // 扛旗：远侧手搭在肩头握住旗杆（露在驼峰上面）
    if (P.drape) drapeFlag();
    if (front) { pole(); parts.hand(E, R, P, { side: 'B', hand: M.skinD, grip: 'big' }); }
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, grip: 'none' });   // 近侧手臂在头之前画：往前探的头压在肩头上
    head();
    collar();
    boneSlab(P.hx, P.hy, P.so);
    parts.hand(E, R, P, { hand: M.skin, grip: 'big' });
    if (front && !P.drape) banner(sock, P.ba, P.furl);                // 端平 / 抱住时破旗挂在枪头下面，压在骨臂盾前面
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
  function tipW() { const t = parts.spear.focus(P, spearOf()); return [wx(t[0] + P.bx), wy(t[1])]; }
  function edgeEmbers(n, spd) {                                        // 沿剪影外沿窜起的硫黄怒焰
    const s = hero, o = s.out;
    for (let k = 0, got = 0; k < n * 12 && got < n; k++) {
      const x = (Math.random() * s.w) | 0, y = (Math.random() * s.h) | 0, i = y * s.w + x; if (o[i] === 255) continue;
      if (!(y === 0 || o[i - s.w] === 255 || x === 0 || o[i - 1] === 255 || x === s.w - 1 || o[i + 1] === 255)) continue;
      got++; spawn(K_EMBER, scrX(x - s.ox), HY + y - s.oy, (Math.random() - 0.5) * 8, -spd - Math.random() * spd, 0.35 + Math.random() * 0.35, R_EL);
    }
  }
  function onEnter(s) {
    if (s === CHARGE) { allyFx({ dur: 2.6, outline: R_EL }); const a = allyPoints()[0]; fx.link(a.x + 3, a.top + 2, HX - 2, HY - 19, R_EL, 2.3, 1); }
    if (s === CAST) {
      poseAt(CAST, 0, 0); flameT = 0; const gx = wx(P.gx), gy = wy(P.gy);   // 先换成施放姿（蓄力时是转身的镜像），星芒落在咆哮的眼上
      E.releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); ring(wx(2), HY - 12, 1, R_EL); burst(wx(2), HY - 12, 30, 60, 140, 0.3, 0.7, R_EL, 12); fx.cross(gx + 2, gy, 6, R_EL, 0.3);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.45 });
    }
  }
  // 命中点 = 这一刺端平时的枪尖（事件前引擎已按这一帧摆好直刺姿；plen 不是端平握法时退回按直刺关键帧算，不取竖枪的杆顶），
  // 超过假人受击面时收在受击面上；拖影从记下的枪尖沿水平枪杆往后画
  let jabX = 0, jabY = 0;
  function jabHit(big) {
    let t = tipW();
    if (P.plen !== 1) { const k = parts.spear.focus({ bhx: K_STAB.bhx, bhy: K_STAB.bhy + Math.min(3, K_STAB.crouch), ba: K_STAB.ba }, { hand: 'B', style: 'leaf', len: POLE[1][0], back: POLE[1][1] }); t = [wx(k[0] + 4), wy(k[1])]; }
    const x = Math.min(t[0], DUMMY_X + 2), y = t[1];
    jabT = 0; jabX = t[0]; jabY = y; burst(x, y, big ? 36 : 10, big ? 60 : 40, big ? 150 : 100, 0.2, big ? 0.6 : 0.35, big ? R_EL : R_IMP, 10); fx.cross(x, y, big ? 7 : 4, big ? R_EL : R_IMP, big ? 0.3 : 0.18);
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
    if (state === IDLE && P.bell !== lastBell) { if (P.bell === 1) { const r0 = parts.rig(P, BODY), b = [wx(r0.hx0 + 4), wy(r0.hy + 3)]; for (let i = 0; i < 3; i++) spawn(K_EMBER, b[0] + i - 1, b[1], (i - 1) * 10, -10, 0.3, FXI.coin); } lastBell = P.bell; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.5) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    jabT += dt; flameT += dt; arrowT += dt;
  }
  function fxReset() { jabT = 9; jabN = 0; flameT = 9; arrowT = 9; chargeAcc = 0; soulAcc = 0; flameAcc = 0; lastStep = 0; lastBell = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx - P.bx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (jabT < 2 / 12) {                                               // 直线刺击拖影：从命中时的枪尖沿水平枪杆往后，贴着杆上沿一条亮线（大刺下沿再加一条）
      const big = jabN === 3, R_ = big ? EL : FXR[R_IMP], L = big ? 16 : 10;
      for (let k = 2; k < L; k++) { if (jabT >= 1 / 12 && (k & 1)) continue; const c = k < 4 ? R_[0] : k < 9 ? R_[1] : R_[2]; put(jabX - k, jabY - 1, c); if (big && k < 12) put(jabX - k, jabY + 1, R_[2]); }
    }
    if (arrowT < 1.1) {                                                // 头顶飘出两个向上的小箭头（攻防提升）
      const hx = wx(6), hy = wy(-27);
      for (let k = 0; k < 2; k++) {
        const a = arrowT - k * 0.12; if (a < 0 || a > 0.9) continue; const q = a / 0.9, x = hx + (k ? 4 : -3), y = RD(hy - a * 12), c = EL[q < 0.2 ? 0 : q < 0.5 ? 1 : q < 0.75 ? 2 : 3];
        if (q > 0.75 && (f12 & 1)) continue;
        put(x, y, c); put(x - 1, y + 1, c); put(x + 1, y + 1, c); put(x - 2, y + 2, c); put(x + 2, y + 2, c); put(x, y + 1, c); put(x, y + 2, c); put(x, y + 3, c);
      }
    }
  }

  return {
    name: '黄魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.claw], HIT_POINT: [4, -13], EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'flesh', how: 'collapse', pal: 'fire', style: 'buff', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
