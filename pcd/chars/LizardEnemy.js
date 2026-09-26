// 蜥蜴人（敌人 · 野兽 · 普通 · 远程 600）：「远程。从远处向敌人投掷长矛。」
// 瘦高兽头人身：约 28 格高、头身比 6，身体细长、长颈，光头鳞面（前伸的扁吻、金眼、吐信），头后一片可张开的伞蜥颈褶（橙膜蓝纹），
// 背上斜插一捆 4 支燧石投枪（枪尖扇形高出头顶 5 格），身后一条拖地长尾（约半个身高，尾尖上翘），腰间一条羽毛草裙；沼泽青绿鳞 + 沙色腹鳞。
// 攻击 = 投：后仰引枪，单手过肩甩出投枪，枪身直线飞行，「咄」地钉在假人上抖两下。
// 技能（无特性 → 表现「投掷长矛」的全力一掷）：颈褶完全张开、后退两步后仰举枪，燧石枪头泛水青光、水珠沿枪身向枪头汇聚 →
//   助跑 3 格全力一掷，投枪斜向上飞出屏幕（水青拖尾）→ 0.3 s 后垂直落下钉在假人脚下：水花外爆 + 冲击环 + 地面水纹 + 击退 → 收褶，从背后再抽一支。
// 死亡 = 断尾前扑：尾巴先断落在原地扭动，身体向前扑倒，背上投枪散开插地，颈褶软塌，化灰。
PCD.define('LizardEnemy', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx, shoot } = E;
  const RD = Math.round, PX = parts.px, RUN = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：沼泽投枪 · 水青（FXI.water：白 → 淡水青 → 水蓝 → 深蓝 → 墨蓝）─────
  const R_EL = FXI.water, EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    scale: ['#06201e', '#104a44', '#1e7a6a', '#48b09a'],        // 沼泽青绿鳞（主材质）
    belly: 'sand',                                               // 腹鳞、喉
    frill: 'fire', fstripe: 'blue',                              // 伞蜥颈褶：橙膜 + 蓝纹
    wood: 'wood', flint: 'stone', feather: 'white', strap: 'leather', grass: 'sand',
    eye: { r: [0, 0, 14, 5], flat: 1 },                          // 金眼
    tongue: { r: 'crimson', flat: 1 },                           // 信子
    wglow: { r: [39, 41, 22, 21], flat: 1 },                     // 燧石枪头的水青光（发光体）
  });
  const BODY = { body: 'slim', leg: 11, torso: 9, head: 6, headW: 6, neck: 2, sw: 3, arm: 10, lw: 2, stride: 4, lift: 2, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(76, 46, 36, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'feather', 'strap', 'grass', 'eye', 'tongue', 'wglow', 'flint', 'belly']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx/hy 握投枪 + 枪角 a；后手 bhx/bhy ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    tl: 0, fr: 0, frl: 0, tng: 0, jaw: 0, hold: 1, gem: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqi: 0, spk: 0, wig: 0, toff: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const A21 = Math.atan2(2, 1), A45 = Math.PI / 4, AH = Math.PI / 2;
  const K = (hx, hy, a, lean, head, crouch, bhx, bhy) => ({ hx, hy, a, lean, head, crouch, bhx, bhy });
  const K_IDLE = K(3, -21, AH, 0, 0, 0, -3, -11);                   // 半侧身：投枪平端在肩上、枪尖朝前，随时准备投
  const K_WIND = K(-4, -25, A21, -1, -1, 0, 5, -18);                // 后仰引枪过肩，后手前指目标
  const K_THROW = K(9, -21, AH, 1, 1, 0, -4, -13);                  // 出手：手甩到最前
  const K_FOLLOW = K(8, -14, AH, 1, 0, 1, -3, -12);                 // 顺势下压
  const K_REACH = K(-3, -24, A45, 0, 0, 0, -3, -11);                // 反手到背后抽枪
  const K_CHG = K(-4, -27, A45, -1, -1, 1, 5, -19);                 // 蓄力：后仰举枪（枪尖朝天空斜上）
  const K_CASTP = K(8, -26, A45, 2, 1, 0, -5, -14);                 // 施放：助跑全力一掷
  const K_HURT = K(1, -20, A21, -1, -1, 1, -5, -13);
  const K_STAG = K(8, -12, AH, 2, 1, 3, 4, -10);                    // 死亡：失去尾巴、往前踉跄
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch', 'bhx', 'bhy'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -16, 20], ['hy', -32, 0], ['ai', -32, 32], ['bhx', -16, 16], ['bhy', -32, 0], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['tl', -2, 2], ['fr', 0, 3], ['frl', 0, 1], ['tng', 0, 2], ['jaw', 0, 1], ['hold', 0, 1],
    ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['dqi', 0, 48], ['spk', 0, 2], ['wig', 0, 3], ['toff', 0, 1], ['st', 0, 8]]);
  const T_REL = 2 / 12, T_SKY = 4 / 12, T_SNAP = INCOMING + 0.15, T_LAND = INCOMING + 0.66;
  const JF = 9, JB = 8;                                              // 握点前杆长 / 后杆长
  // 待机个性「吐信张褶」：歪头吐信子，颈褶一张一合，尾尖打节拍（head, tng, fr, tl）
  const PERS = [[1, 1, 1, 1], [1, 2, 2, -1], [1, 1, 2, 1], [0, 2, 1, -1], [0, 0, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.tl = 0; P.fr = 0; P.frl = 0; P.tng = 0; P.jaw = 0; P.hold = 1; P.gem = 0; P.rim = 1;
    P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.spk = 0; P.wig = 0; P.toff = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = [0, 1, 0, -1][(b + 1) & 3]; P.tl = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.0) { const c = PERS[CL(f12of(lp - 1.6), 0, 4)]; P.head = c[0]; P.tng = c[1]; P.fr = c[2]; P.tl = c[3]; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 前倾快步：身体压低，尾巴水平摆动平衡
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq)); P.lean = 1; P.crouch = 1;
      P.hx += 1 + P.step; P.a += P.step * 0.12; P.tl = -P.step * 2; P.sway = -P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_REL - 1e-6) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.fr = 1; P.tl = 1; P.sway = 1; }
      else if (tq < 0.25) { setK(K_THROW, K_THROW, 0); P.hold = 0; P.fr = 2; P.jaw = 1; P.tl = -2; P.sway = -2; P.rim = 1; }
      else if (tq < 0.45) { setK(K_THROW, K_FOLLOW, ease.out((tq - 0.25) / 0.2)); P.hold = 0; P.fr = 1; P.tl = -1; P.sway = -1; }
      else if (tq < 0.58) { setK(K_FOLLOW, K_REACH, ease.inOut((tq - 0.45) / 0.13)); P.hold = 0; }
      else setK(K_REACH, K_IDLE, ease.inOut(clamp01((tq - 0.58) / 0.17)));
    } else if (st === CHARGE) {                                        // 颈褶完全张开、后退两步、后仰举枪；枪头泛水青光
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q);
      if (tq < 0.5) { parts.gait(P, gait(tq + 0.34)); P.wup = 0; } P.bx = -RD(3 * clamp01(tq / 0.5));
      P.fr = tq < 0.25 ? 1 : 2; P.frl = tq >= 0.25 ? 1 : 0; P.tl = tq > 0.5 ? ((f12 >> 1) & 1 ? 2 : 1) : -1; P.sway = -1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.jaw = tq > 0.9 ? 1 : 0;
      if (tq > 1.1) P.hy += (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                          // 助跑 3 格全力一掷：枪已出手
      setK(K_CHG, K_CASTP, ease.out(clamp01(tq / 0.12))); P.bx = -3 + RD(4 * clamp01(tq / 0.12)); P.hold = 0; P.fr = 2; P.frl = 1; P.jaw = 1; P.tl = -2; P.sway = -2; P.rim = 1;
      if (tq < 0.12) parts.gait(P, gait(tq)); P.wup = 0;
    } else if (st === RECOVER) {                                       // 收褶，从背后再抽一支
      if (tq < 0.3) { setK(K_CASTP, K_REACH, ease.inOut(tq / 0.3)); P.hold = 0; } else setK(K_REACH, K_IDLE, ease.inOut(clamp01((tq - 0.3) / 0.35)));
      P.bx = RD(1 - clamp01(tq / 0.4)); P.fr = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.frl = tq < 0.2 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.fr = 2; P.tl = 2; P.sway = 2; P.jaw = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.fr = 1; P.tl = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 断尾前扑
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else {
        if (d >= 0.15) { P.toff = 1; P.wig = d < 1.3 ? (f12 >> 1) & 3 : 0; }
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.fr = 2; P.jaw = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
        else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = 1; P.eyes = 1; P.fr = 3; P.hold = 0; P.jaw = 1; }
        else {
          setK(K_STAG, K_STAG, 0); P.lying = 1; P.bx = 3; P.eyes = 1; P.fr = 3; P.hold = 0; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
          P.spk = d < 0.66 ? 1 : 2;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    if (P.hold && !P.lying) { const di = parts.snapDir(P.a), c = parts.cell(di, P.hx, P.hy, JF + 2); P.gx = c[0] + P.bx; P.gy = c[1] - P.lift; }
    else { P.gx = P.hx + P.bx; P.gy = P.hy; }
    if (P.lying) { P.gx = 8 + P.bx; P.gy = -3; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：javelin —— 燧石投枪：木杆（吸附斜率）+ 绑绳 + 2 格燧石枪头（发光档 lv：0 燧石 · 1–3 水青光 · 4 熄灭）+ 杆尾 3 格宽白羽
  //   (gx, gy) 握点，a 角度（0 朝上、顺时针 +），fwd 握点前杆长，back 握点后杆长
  function javelin(T, gx, gy, a, fwd, back, lv) {
    E.part(); const di = parts.snapDir(a);
    parts.bar(di, gx, gy, -back + 2, fwd, 1, (k, j, X, Y) => PX(E, T, X, Y, M.wood, k === -back + 2 ? 2 : 3));
    const b = parts.cell(di, gx, gy, fwd); PX(E, T, b[0], b[1], M.strap, 3);
    const hm = lv >= 1 && lv <= 3 ? M.wglow : M.flint;
    parts.bar(di, gx, gy, fwd + 1, fwd + 1, 2, (k, j, X, Y) => PX(E, T, X, Y, hm, lv === 4 ? 1 : lv === 3 ? 4 : lv === 2 ? (j ? 3 : 4) : lv === 1 ? (j ? 2 : 3) : (j ? 2 : 4)));
    const tip = parts.cell(di, gx, gy, fwd + 2); PX(E, T, tip[0], tip[1], hm, lv === 4 ? 1 : lv >= 1 ? 4 : 3);
    parts.bar(di, gx, gy, -back, -back + 1, 3, (k, j, X, Y) => PX(E, T, X, Y, M.feather, j === 1 ? 2 : k === -back ? 3 : 4));
    return tip;
  }
  // 背上一捆 4 支投枪（扇形，枪尖高出头顶 5 格）：[方向下标, 杆根 dx, dy, 前杆长]
  const BACK = [[1, -2, 1, 20], [0, 0, 0, 19], [15, 1, 0, 18], [14, 2, 1, 12]];
  function backSpears(R) {
    const e = parts.edges(R, R.yWaist), bx = e[0] + 1, by = R.yWaist + 3;
    for (const [di, dx, dy, L] of BACK) javelin(R, bx + dx, by + dy, [0, 0.4636, 0.7854, 1.1071, 1.5708, 2.0344, 2.3562, 2.6779, Math.PI, -2.6779, -2.3562, -2.0344, -1.5708, -1.1071, -0.7854, -0.4636][di], L, 2, 0);
  }
  // 死亡：背上的投枪散开——飞起（spk 1）→ 插在地上（spk 2），精灵本地坐标、不跟身体转
  const STUCK = [[-12, -0.35, 12, 0], [3, 0.45, 13, 0], [11, -0.2, 7, 1], [27, 0.6, 9, 1]];   // [x, 斜度, 露出长度, 1 = 插在身体前面]
  function scatteredSpears(ox, front) {
    for (let i = 0; i < STUCK.length; i++) {
      const [x, lean, L, fr] = STUCK[i];
      if ((P.spk === 1 ? 0 : fr) !== front) continue;
      if (P.spk === 1) javelin(parts.FREE, ox + 2 + x * 0.5, -14 - (i & 1) * 3, 1.2 + lean * 1.5, 7, 6, 4);
      else javelin(parts.FREE, ox + x, -1, Math.PI + lean, 2, L, 4);       // 枪尖朝下插进地里，杆和羽尾露在外面
    }
  }
  // 候选部件：lizardTail —— 拖地长尾（约半个身高）：尾根粗 3 格，贴地往后拖，尾尖上翘（tl 摆动）；背上一排暗色鳞脊
  function lizardTail(T, x0, y0, tl) {
    E.part(); const f = M.scaleD;
    const pts = [[x0, y0], [x0 - 2, y0 + 4], [x0 - 5, -3], [x0 - 9, -1], [x0 - 13, -1], [x0 - 16, -2 - (tl > 0 ? 1 : 0)], [x0 - 17 - (tl < 0 ? 1 : 0), -4 - tl]];
    const rr = [1.6, 1.5, 1.3, 1.1, 0.9, 0.6, 0.5];
    for (let i = 1; i < pts.length; i++) parts.sweep(E, T, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], rr[i - 1], rr[i], f, 0);
    for (let i = 1; i < 5; i++) PX(E, T, pts[i][0], pts[i][1] - 1, f, 2);                     // 鳞脊
  }
  // 断下的尾巴：落在原地（精灵本地坐标），wig 0–3 扭动相位
  const WIG = [[0, -1, 0, 1], [-1, 0, 1, 0], [0, 1, 0, -1], [1, 0, -1, 0]];
  function looseTail(ox, wig) {
    E.part(); const w = WIG[wig], f = M.scaleD;
    const pts = [[ox - 5, -1], [ox - 9, -2 + w[0]], [ox - 13, -2 + w[1]], [ox - 17, -2 + w[2]], [ox - 20, -3 + w[3]]];
    for (let i = 1; i < pts.length; i++) parts.sweep(E, parts.FREE, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i === 1 ? 1.4 : 1.1 - i * 0.15, 1.1 - (i + 1) * 0.15, f, 0);
    PX(E, parts.FREE, ox - 5, -2, M.scale, 1); PX(E, parts.FREE, ox - 5, -1, M.scale, 1);   // 断口
  }
  // 候选部件：lizardTorso —— 细长鳞身：鳞纹 + 前面一条沙色腹鳞（每 2 行一道横纹）+ 长颈（和躯干同一部件）+ 背枪的斜挎皮带
  function lizardTorso(R) {
    E.part(); const s = M.scale;
    for (let y = R.yS; y <= R.yHip; y++) { const e = parts.edges(R, y); RUN(E, R, y, e[0], e[1], s, 0); PX(E, R, e[1], y, M.belly, (y & 1) ? 2 : 3); if (y > R.yS + 1) PX(E, R, e[1] - 1, y, M.belly, (y & 1) ? 2 : 4); if (((y + 1) % 3) === 0) PX(E, R, e[0] + 2, y, s, 2); }
    for (let y = R.hy + 1; y < R.yS; y++) { const cx = RD(R.hx + (R.yS - y) * 0.3); RUN(E, R, y, cx - 1, cx + 1, s, 0); PX(E, R, cx + 1, y, M.belly, 3); }   // 长颈
    const a = parts.edges(R, R.yS + 1), b = parts.edges(R, R.yWaist + 2);
    parts.line(E, R, a[0] + 1, R.yS + 1, b[1] - 1, R.yWaist + 2, M.strap, 3);
  }
  // 候选部件：featherSkirt —— 腰间草裙：两行草束 + 下摆长短错落，三根白羽垂得最长（随 sway 摆）
  function featherSkirt(R) {
    E.part(); const y0 = R.yHip - 1, sw = RD(P.sway * 0.5);
    for (let k = 0; k <= 2; k++) { const y = y0 + k, e = parts.edges(R, Math.min(y, R.yHip)), s = k ? sw : 0; for (let x = e[0] - k + s; x <= e[1] + k + s; x++) PX(E, R, x, y, M.grass, k === 0 ? 3 : ((x - s) & 1) ? 2 : 0); }
    const e = parts.edges(R, R.yHip), yb = y0 + 3;
    for (let x = e[0] - 2 + sw; x <= e[1] + 2 + sw; x++) { const q = (((x - sw) % 3) + 3) % 3; if (q === 1) continue; PX(E, R, x, yb, M.grass, q === 0 ? 3 : 2); }
    for (const fx of [e[0] - 1, e[0] + 2, e[1] + 1]) { PX(E, R, fx + sw, yb, M.feather, 4); PX(E, R, fx + sw, yb + 1, M.feather, 3); PX(E, R, fx + sw + (sw > 0 ? 1 : sw < 0 ? -1 : 0), yb + 2, M.feather, 2); }
  }
  // 候选部件：frilledNeck —— 伞蜥颈褶（头之前画）：fr 0 收拢（颈后一道褶）· 1 半张 · 2 全张（宽 10 格的扇面，蓝色肋纹、锯齿外沿）· 3 软塌；frl 1 = 外沿一圈亮色
  function frill(R, fr, lit) {
    E.part(); const cx = R.hx0 + 1, cy = R.ey + 2, f = M.frill;
    if (fr === 0) { for (let y = R.ey; y <= R.hy + 1; y++) { PX(E, R, R.hx0 - 1, y, f, y === R.ey ? 4 : 0); if (y > R.ey + 1) PX(E, R, R.hx0 - 2, y, f, 2); } PX(E, R, R.hx0 - 1, R.ey + 2, M.fstripe, 3); return; }
    const r = fr === 1 ? 4.2 : fr === 3 ? 3.4 : 6.2, droop = fr === 3 ? 3 : 0, cx2 = R.hx0, cy2 = R.htop + 3;
    for (let y = Math.floor(cy2 - r - 1); y <= Math.ceil(cy2 + r + droop + 1); y++) for (let x = Math.floor(cx2 - r - 1); x <= cx2 + 4; x++) {
      const dx = x - cx2, dy = (y - cy2 - (fr === 3 ? droop * 0.6 : 0)) / (fr === 3 ? 1.4 : 1), d = Math.hypot(dx, dy); if (d > r + 0.3) continue;
      if (dx > -1 && Math.abs(dy) < 3.5) continue;                                        // 前面给头留出位置（头压在上面）
      if (dx > 1 && fr !== 3) continue;
      const ang = Math.atan2(dy, -dx), edge = d > r - 0.9, rib = Math.abs(((ang / 0.62) % 1 + 1) % 1 - 0.5) < 0.12 && d > 2;
      if (edge && fr === 2 && (((RD(ang * 6) % 3) + 3) % 3) === 0) continue;              // 锯齿外沿
      PX(E, R, x, y, rib && fr !== 3 ? M.fstripe : f, edge ? (lit ? 4 : fr === 3 ? 2 : 0) : rib ? 3 : 0);
    }
  }
  // 候选部件：lizardHead —— 光头鳞面：圆颅 + 往前伸出 3 格的扁吻（嘴线、鼻孔）+ 金眼 + 眉骨高光 + 沙色喉；tng 1 吐信 · 2 分叉；jaw 1 张嘴
  function lizardHead(R, eyes, tng, jaw) {
    E.part(); const s = M.scale, x0 = R.hx0, x1 = R.hx1, top = R.htop;
    RUN(E, R, top, x0 + 1, x1 - 1, s, 0); RUN(E, R, top + 1, x0, x1 + 1, s, 0); RUN(E, R, top + 2, x0, x1 + 2, s, 0);
    RUN(E, R, top + 3, x0, x1 + 3, s, 0); RUN(E, R, top + 4, x0, x1 + (jaw ? 1 : 3), s, 0); RUN(E, R, top + 5, x0 + 1, x1 + (jaw ? 3 : 2), s, 0);
    PX(E, R, x1 - 1, top + 5, M.belly, 3); PX(E, R, x1, top + 5, M.belly, 2);                                           // 沙色喉
    if (jaw) { PX(E, R, x1 + 2, top + 4, s, 1); PX(E, R, x1 + 3, top + 4, s, 1); PX(E, R, x1 + 3, top + 5, M.belly, 4); }
    else RUN(E, R, top + 4, x1 - 1, x1 + 2, s, 1);                                                            // 嘴线
    RUN(E, R, top + 1, x1 - 2, x1, s, 4);                                                                      // 眉骨
    if (eyes) PX(E, R, x1 - 1, top + 2, s, 1); else { PX(E, R, x1 - 1, top + 2, M.eye, 3); PX(E, R, x1 - 2, top + 2, s, 2); }
    PX(E, R, x1 + 2, top + 3, s, 1);                                                                          // 鼻孔
    for (const [dx, dy] of [[1, 2], [3, 1], [2, 4], [0, 3]]) PX(E, R, x0 + dx, top + dy, s, 2);             // 鳞纹
    if (tng) { const tx = x1 + (jaw ? 4 : 4), ty = top + 4; PX(E, R, tx, ty, M.tongue, 3); PX(E, R, tx + 1, ty, M.tongue, 4); if (tng === 2) { PX(E, R, tx + 2, ty - 1, M.tongue, 3); PX(E, R, tx + 2, ty + 1, M.tongue, 3); } }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY);
    if (P.toff) looseTail(-P.bx, P.wig);
    if (R.lie) scatteredSpears(-P.bx, 0); else backSpears(R);
    if (!P.toff) lizardTail(R, R.hipBx - 1, R.yHip + 1, P.tl);
    if (!P.hold && (R.lie || P.st === DEATH)) javelin(parts.FREE, 8 - P.bx, -1 + P.lift, AH, 8, 7, 4);        // 脱手的投枪落在脚前
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.scaleD, hand: M.scaleD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'bare', mat: M.scale, matD: M.scaleD, w: 2 });
    lizardTorso(R);
    featherSkirt(R);
    frill(R, P.fr, P.frl);
    lizardHead(R, P.eyes, P.tng, P.jaw);
    if (P.hold && !R.lie) javelin(R, P.hx, P.hy, P.a, JF, JB, P.gem);
    if (R.lie) scatteredSpears(-P.bx, 1);
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.scale, hand: M.scale });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastStep = 0, mzT = 9, mzA = [0, 0, 0, 0], skyT = 9, skyX = 0, skyY = 0, dropT = 9, stuckT = 9, pinT = 9, trailAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const DROP_X = DUMMY_X - 7;
  // 屏幕坐标画一支飞行中的投枪：(x, y) 枪尖，(sx, sy) 朝向（-1 / 0 / 1），L 长度，lit 枪头水青光
  function javScr(x, y, sx, sy, L, lit) {
    x = RD(x); y = RD(y);
    for (let k = 0; k <= L; k++) {
      const X = x - sx * k, Y = y - sy * k;
      if (k <= 1) put(X, Y, lit ? (k ? EL[1] : EL[0]) : (k ? 9 : 10));
      else if (k >= L - 1) { put(X, Y, 17); if (sy === 0) { put(X, Y - 1, 21); put(X, Y + 1, 18); } else if (sx === 0) { put(X - 1, Y, 21); put(X + 1, Y, 18); } else { put(X - sx, Y, 21); put(X, Y - sy, 18); } }
      else put(X, Y, (k & 1) ? 19 : 20);
    }
    if (sy === 0) put(x - sx * (L - 2) - sx * 0, y, 32);
  }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX - 1, HY + 1, 11, 3, R_EL, 1.9, -1, 0);
    if (s !== CAST) return;
    const x = wx(P.hx + 1), y = wy(P.hy - 1);                          // 全力一掷：投枪斜向上飞出屏幕
    skyT = 0; skyX = x; skyY = y; mzT = 0; mzA = [wx(K_CHG.hx) - 2, wy(K_CHG.hy) - 2, x, y];
    releaseOrbit(40, 90, 0.25, 0.5, { pts: 1 });
    burst(x, y, 14, 40, 110, 0.2, 0.45, R_EL, 18); fx.cross(x, y, 5, R_EL, 0.2, 2);
    shake(0.28, 2); flash(0.05); sfx('swing', { kind: 'throw', w: 0.4 });
    for (let i = 0; i < 6; i++) spawn(K_DUST, wx(-4 + Math.random() * 8), HY - 1, -10 - Math.random() * 30, -5 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust);   // 助跑蹬地
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                 // 单手过肩甩出投枪
      mzT = 0; mzA = [wx(K_WIND.hx), wy(K_WIND.hy), wx(P.hx), wy(P.hy)];
      shoot(1, wx(P.hx + 3), wy(P.hy - 1), 200, DUMMY_X - 3, R_EL, 0, { trail: { every: 3, life: [0.1, 0.2], back: [10, 24] }, glow: 3 });
      burst(wx(P.hx + 2), wy(P.hy - 1), 5, 20, 50, 0.12, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.4 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === CAST && t === T_SKY) {                                   // 投枪垂直落下钉在假人脚下：水花外爆 + 冲击环 + 地面水纹 + 击退
      stuckT = 0; const x = DROP_X, y = HY - 1;
      for (let i = 0; i < 20; i++) { const a = -Math.PI * (0.08 + Math.random() * 0.84), v = 50 + Math.random() * 80; spawnX(K_PHYS, x, y - 1, Math.cos(a) * v, Math.sin(a) * v, 0.5 + Math.random() * 0.4, R_EL, { g: 240, floor: FLOOR }); }
      burst(x, y - 2, 10, 30, 70, 0.15, 0.35, R_EL, 10);
      ring(x, y - 2, 1, R_EL); fx.cross(x, y - 3, 4, R_EL, 0.2, 2);
      fx.wave(x + 1, FLOOR, 1, 14, 2, R_EL, 0.55, 0); fx.wave(x - 1, FLOOR, -1, 16, 2, R_EL, 0.55, 0);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.4 });
    }
    if (s === DEATH && t === T_SNAP) {                                 // 尾巴先断落
      burst(wx(-4), HY - 6, 6, 20, 50, 0.15, 0.3, FXI.impact, 6);
      for (let i = 0; i < 4; i++) spawn(K_DUST, wx(-12 + Math.random() * 10), HY - 1, (Math.random() - 0.5) * 20, -4, 0.3, FXI.dust);
    }
    if (s === DEATH && t === T_LAND) {                                 // 前扑落地：尘土 + 投枪插地
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-8 + Math.random() * 30), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      for (const [x] of STUCK) spawn(K_DUST, wx(x + 3), HY - 1, 0, -6, 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.4 });
    }
  }
  function impactOn(k, x, y) {                                          // 投枪「咄」地钉在假人上
    pinT = 0; burst(x, y, 8, 30, 80, 0.15, 0.35, FXI.impact, 8); burst(x, y, 5, 20, 50, 0.15, 0.3, R_EL, 6); fx.cross(x, y, 3, R_EL, 0.12, 2);
    hitDummy(0); sfx('hit', { mat: 'wood', w: 0.4 });
  }
  const EVENTS = [[], [], [T_REL], [], [T_SKY], [], [], [T_SNAP, T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && P.hold) {                                  // 水珠沿枪身往枪头汇聚
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      const dx = Math.sin(P.a), dy = -Math.cos(P.a);
      while (chargeAcc >= 1) {
        chargeAcc -= 1; let sx, sy;
        if (Math.random() < 0.6) { const r = 4 + Math.random() * 14; sx = gx - dx * r * (P.flip ? -1 : 1); sy = gy - dy * r; }
        else { const a = Math.random() * 6.2832, r = 9 + Math.random() * 6; sx = gx + Math.cos(a) * r; sy = gy + Math.sin(a) * r; }
        const ddx = sx - gx, ddy = sy - gy, r = Math.hypot(ddx, ddy);
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(ddy, ddx), r, w: (Math.random() - 0.5) * 2, tx: gx, ty: gy, squash: 1 });
      }
    }
    if (skyT < 0.15) {                                                 // 上升段的水青拖尾
      trailAcc += dt * 60;
      while (trailAcc >= 1) { trailAcc -= 1; const p = skyPos(skyT); spawn(K_BURST, p[0] - 2 + Math.random() * 2, p[1] + 2, -8 + Math.random() * 6, 10 + Math.random() * 8, 0.2 + Math.random() * 0.2, R_EL); }
    }
    if (E.state === CAST && stT >= 0.15 && stT < T_SKY) { const yy = dropY(stT); if (Math.random() < 0.8) spawn(K_BURST, DROP_X + (Math.random() < 0.5 ? -1 : 1), yy - 13, 0, -15, 0.18, R_EL); }
    if (state === MOVE && P.step !== lastStep) {                       // 前倾快步：接触帧 1 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.25 }); spawn(K_DUST, wx(P.step > 0 ? 5 : -3) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.55 && stT < INCOMING + 2.4) {   // 化灰：灰烬 + 少量魂光上升
      soulAcc += dt * 30;
      while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, wx(-6 + Math.random() * 28), HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, Math.random() < 0.7 ? FXI.dust : FXI.soul, { age0: 0.2 }); }
    }
    mzT += dt; skyT += dt; stuckT += dt; pinT += dt;
  }
  function skyPos(t) { const d = t * 560; return [skyX + d * 0.707, skyY - d * 0.707]; }
  function dropY(t) { const q = clamp01((t - 0.15) / (T_SKY - 0.15)); return RD(-2 + (HY + 2) * q * q); }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastStep = 0; mzT = 9; skyT = 9; stuckT = 9; pinT = 9; trailAcc = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1 && P.hold) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function drawShot(k, x, y, d, f12) { if (k !== 1) return false; javScr(x, y, d, 0, 11, 0); return true; }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.hold && !P.lying && P.dq < 1) { const L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) {                                                 // 出手拖影：从引枪处甩到出手处的一道弧
      const c = mzT < 1 / 12 ? EL[1] : EL[2], [x0, y0, x1, y1] = mzA;
      for (let k = 0; k <= 10; k++) { if ((k & 1) && mzT >= 1 / 12) continue; const q = k / 10, x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q - Math.sin(q * Math.PI) * 5; put(RD(x), RD(y), c); }
    }
    if (skyT < 0.15) { const p = skyPos(skyT); javScr(p[0], p[1], 1, -1, 11, 1); }                 // 斜向上飞出屏幕
    const st = E.state, t = E.stT;
    if (st === CAST && t >= 0.15 && t < T_SKY) {                        // 从天而降：竖直落下，枪尖朝下，上方一道水青速度线
      const y = dropY(t); javScr(DROP_X, y, 0, 1, 12, 1);
      for (let k = 13; k < 20; k++) if (((k + f12) & 1) === 0) put(DROP_X, y - k, k < 16 ? EL[1] : EL[2]);
    }
    if (stuckT < 1.1) {                                                 // 钉在假人脚下，抖两下后慢慢消失
      const sh = stuckT < 0.25 ? ((f12 & 1) ? 1 : -1) : 0, fade = stuckT > 0.8 && ((f12 + 1) & 1);
      if (!fade) { for (let k = 0; k <= 8; k++) put(DROP_X + (k > 4 ? sh : 0), HY - 1 - k, k >= 7 ? 17 : (k & 1) ? 19 : 20); put(DROP_X - 1, HY - 9, 21); put(DROP_X + 1, HY - 9, 18); }
    }
    if (pinT < 0.4) {                                                   // 攻击命中：投枪横钉在假人上抖两下
      const sh = pinT < 0.2 ? ((f12 & 1) ? 1 : 0) : 0, x = DUMMY_X - 4, y = wy(K_THROW.hy - 1) + sh;
      if (!(pinT > 0.3 && (f12 & 1))) for (let k = 0; k <= 8; k++) put(x - k, y + (k > 5 ? sh : 0), k >= 7 ? 17 : (k & 1) ? 19 : 20);
    }
  }

  return {
    name: '蜥蜴人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.wglow], HIT_POINT: [1, -16], EVENTS,
    REVIVE: { ramp: R_EL },
    SFX: { body: 'beast', how: 'topple', pal: 'water', style: 'meteor', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
