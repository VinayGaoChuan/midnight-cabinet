// 萨满（敌人 · 野兽 · 史诗 · 远程）：瘦高长臂的山魈萨满——深巧克力褐长毛，身板挺直、手臂垂到膝下，露出本脸：
// 红蓝条纹的鼓长吻部往前伸出 3 格，头顶一圈竖起的血红羽冠；单手握一根比身高还长的牛颅图腾杖（杖顶牛头骨，骨眼窝的血光是发光体，
// 牛角上缠的红布条随风飘）；身后一条长尾高高翘起卷个弯，尾尖挂一只血红小葫芦。
// 攻击：图腾杖向前一点，牛骨眼窝射出一颗血色光珠。技能表现特性「嗜血」（让一名友军攻速 +50%）：杖举过头，血滴从地面螺旋汇到杖顶，
// 脚下暗红法阵；施放时杖指向身边友军，一道血色虚线连过去，友军脚下血环外爆、全身描红，头顶飘起三个上升的「»」，随后快挥两下、肩头冒红蒸汽。
// 死亡：双腿一软瘫坐，头垂下，杖靠在肩上，尾巴盘起，羽冠散落几根，随后化为血雾向上消散。
PCD.define('Shaman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, ASTEP, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_PHYS, K_SPIRAL_PT, K_EMBER, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx, shoot, allyPoints } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：嗜血 · 猩红（blood 色阶：白 → 淡粉 → 红 → 暗红 → 酒红）─────
  const R_EL = FXI.blood, EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    fur: [0, '#2a160c', 20, 19],                                  // 深巧克力褐长毛
    mane: [0, 20, 19, 32],                                        // 肩背蓬起的长毛（亮一级）
    red: 'crimson', blue: [0, 39, 40, 41],                        // 红吻 + 蓝颊纹
    crest: 'blood', hand: [0, 0, 27, 28],                         // 血红羽冠；墨灰手脚
    wood: 'wood', bone: 'bone', cloth: 'crimson', gourd: 'crimson', cord: 'leather',
    eye: { r: [0, 0, 14, 5], flat: 1 },
    sock: { r: [55, 56, 57, 58], flat: 1 },                       // 牛骨眼窝：暗红 → 红
    sockHot: { r: [57, 58, 21, 21], flat: 1 },                    // 蓄满 / 施放：粉白
  });
  const BODY = { body: 'slim', leg: 10, torso: 8, head: 7, headW: 6, arm: 12, sw: 3, lw: 2, stride: 4, fall: 'back' };   // 瘦高长臂：约 25 格 + 羽冠 5 格
  const SIT = Object.assign({}, BODY, { leg: 3, neck: -1 });      // 瘫坐：胯落到离地 3 格，头垂低 1 格
  const HX = 34, DUR = DEFAULT_DUR.slice(), ALLY_X = [72, 14];
  const hero = new Sprite(68, 58, 24, 53);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'bone', 'sock', 'sockHot', 'cloth', 'hand', 'red', 'blue', 'eye', 'cord', 'gourd']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx/hy 握杖（杖身中下段）+ 杖角 a；杖顶牛颅 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, tl: 0, ty: 0, cl: 0,
    gem: 0, rim: 0, eyes: 0, flash: 0, sit: 0, lift: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch, bhx, bhy) => ({ hx, hy, a, lean, head, crouch, bhx, bhy });
  const K_IDLE = K(7, -13, 0.05, 0, 0, 0, -3, -5);                // 杖立在身侧，后手长臂垂到膝下
  const K_WIND = K(4, -17, -0.4, -1, 0, 1, -5, -8);                 // 杖往后一引
  const K_POINT = K(10, -17, 1.2, 1, 1, 0, -4, -6);                 // 向前一点：杖顶牛颅对准目标
  const K_RAISE = K(4, -26, 0.08, -1, -1, 0, -3, -15);              // 蓄力：杖举过头
  const K_CASTP = K(10, -18, 1.75, 1, 1, 1, -5, -7);                // 施放：杖斜指身前的友军
  const K_HURT = K(5, -13, -0.3, -1, -1, 1, -5, -6);
  const K_BUCKLE = K(8, -11, 0.3, 1, 1, 3, -2, -3);                 // 死亡：腿软下蹲
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch', 'bhx', 'bhy'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -20, 40], ['hy', -40, 4], ['ai', -40, 64], ['bhx', -20, 20], ['bhy', -40, 4], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -2, 2], ['sway', -2, 2], ['tl', -2, 2], ['ty', -2, 2], ['cl', 0, 3], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['sit', 0, 1], ['lift', 0, 3], ['dqi', 0, 48], ['st', 0, 8]]);
  const T_POINT = 2 / 12, T_SWING = 0.2, T_LAND = INCOMING + 0.66;
  const UP = 17, DN = 13;
  // 待机个性「战舞」：左右跺脚摇身、杖一顿地、尾巴甩一圈（step, bob, 手高, lean, tl 尾尖横摆, ty 尾尖竖摆：四帧走一个 2 格半径的圈）
  const DANCE = [[1, 1, -16, 1, 2, 0], [0, 0, -12, 0, 0, -2], [-1, 1, -16, -1, -2, 0], [0, 0, -12, 0, 0, 2], [0, 0, -13, 0, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.tl = 0; P.ty = 0; P.gem = 0; P.rim = 1; P.eyes = 0;
    P.flash = 0; P.sit = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    P.cl = (f12 >> 2) & 3;                                            // 红布条慢飘
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.tl = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      P.gem = ((f12 >> 3) % 5) === 4 ? 1 : 0;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.0) { const c = DANCE[CL(f12of(lp - 1.6), 0, 4)]; P.step = c[0]; P.bob = c[1]; P.hy = c[2]; P.lean = c[3]; P.tl = c[4]; P.ty = c[5]; P.beard = -c[3]; P.gem = c[2] === -12 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 长腿大步：一步一杖点地，尾巴左右摆
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq));
      P.hx += P.step * 2; P.a += P.step * 0.18; P.hy += P.wup ? -2 : 0; P.tl = -P.step * 2; P.beard = P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; P.tl = 1; }
      else if (tq < 0.25) { setK(K_POINT, K_POINT, 0); P.gem = 3; P.rim = 2; P.beard = -2; P.tl = -2; P.cl = 3; }
      else if (tq < 0.45) { setK(K_POINT, K_IDLE, ease.out((tq - 0.25) / 0.2) * 0.3); P.gem = 1; P.beard = -1; P.tl = -1; }
      else setK(K_POINT, K_IDLE, 0.3 + 0.7 * ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                        // 杖举过头：眼窝血光 1 → 2，红布条狂舞
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_RAISE, q);
      P.cl = f12 & 3; P.beard = tq > 0.5 ? -2 : -1; P.tl = tq > 0.5 ? ((f12 >> 1) & 1 ? 2 : 1) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq > 1.1) P.hx += (f12 & 1) ? 1 : 0;
    } else if (st === CAST) { setK(K_RAISE, K_CASTP, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.cl = f12 & 3; P.beard = -2; P.tl = -2; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CASTP, K_IDLE, q); P.beard = q < 0.5 ? -1 : 0;
      P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.tl = 2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.cl = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.tl = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 瘫坐：腿软 → 坐倒（两帧下落）→ 静止 → 血雾消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.tl = 2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_BUCKLE, K_BUCKLE, 0); P.bx = -1; P.eyes = 1; P.beard = 1; P.tl = 1; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        P.sit = 1; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.head = 1; P.lean = 1;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.sit ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.dqi = RD(P.dq * 48);
    const S = P.sit ? SIT_STAFF : staffPts(P.hx, P.hy, P.a); P.gx = RD(S.tx) + P.bx; P.gy = RD(S.ty) - 1 - P.lift;
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function staffPts(hx, hy, a) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, tx: hx + dx * UP, ty: hy + dy * UP, bx: hx - dx * DN, by: hy - dy * DN }; }
  const SIT_STAFF = (() => { const L = UP + DN, tx = -6, ty = -13, bx = RD(tx + Math.sqrt(L * L - ty * ty)), by = 0, dx = (tx - bx) / L, dy = ty / L; return { dx, dy, bx, by, tx, ty }; })();   // 瘫坐：杖脚抵在身前地上，杖身斜靠在肩上，牛颅落在头侧（不再悬在头顶）
  // 候选部件：totemStaff —— 长木杖（两道缠绳）
  function staffShaft(T, S) {
    E.part(); parts.line(E, T, S.bx, S.by, S.tx - S.dx, S.ty - S.dy, M.wood, 3);
    for (const k of [0.62, 0.8]) { const x = S.bx + (S.tx - S.bx) * k, y = S.by + (S.ty - S.by) * k; px(E, T, x, y, M.cord, 4); px(E, T, x + (Math.abs(S.dy) > 0.7 ? 1 : 0), y + (Math.abs(S.dy) > 0.7 ? 0 : 1), M.cord, 2); }
  }
  // 候选部件：bullSkull —— 杖顶正面牛头骨（颅 5 格宽、吻部收窄、两只外弯上翘的牛角），眼窝是发光体（lv 0 暗 · 1 亮 · 2 蓄满 · 3 施放 · 4 熄灭）
  function bullSkull(T, cx, cy, lv) {
    E.part(); const b = M.bone; cx = RD(cx); cy = RD(cy);
    run(E, T, cy - 2, cx - 2, cx + 2, b, 0); run(E, T, cy - 1, cx - 2, cx + 2, b, 0); run(E, T, cy, cx - 2, cx + 2, b, 0);
    run(E, T, cy + 1, cx - 1, cx + 1, b, 0); run(E, T, cy + 2, cx - 1, cx + 1, b, 0); px(E, T, cx, cy + 3, b, 0);
    px(E, T, cx, cy - 2, b, 4); px(E, T, cx, cy + 1, b, 2); px(E, T, cx - 1, cy + 2, b, 1); px(E, T, cx + 1, cy + 2, b, 1);   // 额顶高光、鼻梁、鼻孔
    const e = lv === 4 ? [b, 1] : lv === 0 ? [M.sock, 2] : lv === 1 ? [M.sock, 4] : lv === 2 ? [M.sockHot, 3] : [M.sockHot, 4];
    px(E, T, cx - 1, cy - 1, e[0], e[1]); px(E, T, cx + 1, cy - 1, e[0], e[1]);
    for (const s of [-1, 1]) { px(E, T, cx + 3 * s, cy - 2, b, 0); px(E, T, cx + 4 * s, cy - 3, b, 0); px(E, T, cx + 5 * s, cy - 4, b, 3); px(E, T, cx + 5 * s, cy - 5, b, 4); px(E, T, cx + 3 * s, cy - 3, b, 0); }
  }
  // 候选部件：clothStrips —— 缠在牛角上的两条红布条：往后（左）飘，cl 0–3 是飘动相位
  function clothStrips(T, cx, cy, cl) {
    E.part(); cx = RD(cx); cy = RD(cy);
    const W = [[0, 1, 1, 2], [1, 1, 2, 2], [0, 0, 1, 1], [1, 2, 2, 3]][cl];
    for (let k = 0; k < 4; k++) { px(E, T, cx - 4 - k - W[k], cy - 1 + k - (k > 1 ? W[k] >> 1 : 0), M.cloth, k === 3 ? 2 : 0); if (k < 2) px(E, T, cx - 4 - k - W[k], cy + k, M.cloth, 3); }
    for (let k = 0; k < 3; k++) px(E, T, cx + 4 - k - (W[k] >> 1), cy - 1 + k + 1, M.cloth, k === 2 ? 2 : 3);
  }
  // 候选部件：mandrillHead —— 山魈头：褐毛圆颅 + 往前伸出 3 格的鼓长吻（鼻梁红、两颊蓝带竖纹、吻尖红鼻孔）+ 重眉骨 + 金眼 + 下巴一撮亮毛
  function mandrillHead(T, x0, x1, top, eyes) {
    E.part(); const f = M.fur;
    run(E, T, top, x0 + 1, x1 - 1, f, 0);
    for (let y = top + 1; y <= top + 4; y++) run(E, T, y, x0, x1, f, 0);
    run(E, T, top + 5, x0, x1 - 1, f, 0); run(E, T, top + 6, x0 + 1, x1 - 1, f, 0);
    run(E, T, top + 1, x1 - 2, x1, f, 4); px(E, T, x1 + 1, top + 2, f, 4);                            // 眉骨
    if (eyes) px(E, T, x1 - 1, top + 2, f, 1); else { px(E, T, x1 - 1, top + 2, M.eye, 3); px(E, T, x1 - 2, top + 2, f, 1); }
    run(E, T, top + 2, x1, x1 + 2, M.red, 0); px(E, T, x1 + 2, top + 2, M.red, 4);                   // 鼻梁红
    run(E, T, top + 3, x1, x1 + 3, M.red, 0); px(E, T, x1 + 3, top + 3, M.red, 4);
    run(E, T, top + 4, x1 - 1, x1 + 3, M.blue, 0); run(E, T, top + 5, x1 - 1, x1 + 2, M.blue, 0);     // 两颊蓝，带竖纹
    px(E, T, x1, top + 4, M.blue, 2); px(E, T, x1 + 2, top + 4, M.blue, 2); px(E, T, x1 + 1, top + 5, M.blue, 2); px(E, T, x1 + 3, top + 4, M.red, 3);
    run(E, T, top + 6, x1, x1 + 1, f, 4);                                                             // 下巴亮毛
    px(E, T, x0 + 1, top + 3, f, 2); px(E, T, x0 + 2, top + 3, f, 1);                                 // 耳
    px(E, T, x0, top + 5, f, 3); px(E, T, x0 - 1, top + 5, f, 2);                                     // 脑后长毛
  }
  // 候选部件：featherCrest —— 头顶一圈竖起的血红羽冠（5 根，扇形张开，羽尖亮，随 sw 摆）
  function featherCrest(T, x0, top, sw, lost) {
    E.part();
    const F = [[1, -2, 4], [2, -1, 5], [4, 1, 5], [5, 2, 4]];
    F.forEach(([bx, tx, L], i) => {
      if (lost && (i === 1 || i === 2)) return;
      const ex = x0 + bx + tx + (L > 3 ? sw : 0), ey = top - L + (lost ? 1 : 0);
      parts.line(E, T, x0 + bx, top, ex, ey, M.crest, 0); px(E, T, ex, ey, M.crest, 4);
    });
  }
  // 候选部件：monkeyTail —— 细长尾：从后胯往后上高高翘起，顶端卷个弯往下勾，尾尖挂一只血红小葫芦（sw 摆动，coil = 瘫坐时盘在身后地上）
  function tail(T, R, sw, coil, sv) {
    E.part(); const f = M.furD, x0 = R.hipBx - 1, y0 = R.yHip + 1, v = sv || 0;
    const pts = coil ? [[x0, y0], [x0 - 4, -1], [x0 - 8, -1], [x0 - 10, -3], [x0 - 9, -5], [x0 - 7, -5], [x0 - 6, -4]]
      : [[x0, y0], [x0 - 4, y0 - 1], [x0 - 7 + (sw >> 1), y0 - 5 + (v >> 1)], [x0 - 8 + sw, y0 - 10 + v], [x0 - 7 + sw, y0 - 14 + v], [x0 - 4 + sw, y0 - 16 + v], [x0 - 2 + sw, y0 - 14 + v]];
    for (let i = 1; i < pts.length; i++) parts.line(E, T, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], f, 0);
    parts.line(E, T, pts[0][0], pts[0][1] - 1, pts[1][0], pts[1][1] - 1, f, 0);                        // 尾根粗一格
    const [gx, gy] = pts[pts.length - 1];
    E.part(); const g = M.gourd;                                                                        // 小葫芦（挂在尾尖下）
    px(E, T, gx, gy + 1, M.cord, 3); px(E, T, gx, gy + 2, g, 0); run(E, T, gy + 3, gx - 1, gx + 1, g, 0); run(E, T, gy + 4, gx - 1, gx + 1, g, 0); px(E, T, gx, gy + 5, g, 2); px(E, T, gx - 1, gy + 3, g, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.sit) return drawSit();
    const R = parts.rig(P, BODY), S = staffPts(P.hx, P.hy, P.a);
    tail(R, R, P.tl, 0, P.ty);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.furD, hand: M.handD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'bare', mat: M.fur, matD: M.furD, boot: M.hand, bootD: M.handD, w: 2 });
    parts.torso(E, R, P, { style: 'bare', mat: M.fur, cloth: M.cloth, belt: M.cord });
    parts.mantle(E, R, P, { style: 'fur', mat: M.mane, len: 4 });
    mandrillHead(R, R.hx0, R.hx1, R.htop, P.eyes);
    featherCrest(R, R.hx0, R.htop - 1, P.beard, 0);
    staffShaft(R, S);
    bullSkull(R, S.tx, S.ty, P.gem);
    clothStrips(R, S.tx, S.ty, P.cl);
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.fur, hand: M.hand });
  }
  // 瘫坐（最终姿）：胯离地 3 格，两腿往前伸、膝盖拱起，后手软垂在地上，杖斜靠在肩上，尾巴盘在身后，羽冠只剩三根、两根掉在脚边
  function drawSit() {
    const Q = { lean: 1, head: 1, crouch: 0, bob: 0 }, R = parts.rig(Q, SIT);
    tail(R, R, 0, 1);
    parts.arm(E, R, Q, { side: 'B', sleeve: 'bare', mat: M.furD, hand: M.handD, grip: 'fist', at: [-3, -1] });
    E.part(); parts.line(E, R, R.hipBx + 1, R.yHip + 1, 5, -4, M.furD, 0); parts.line(E, R, R.hipBx + 1, R.yHip + 2, 5, -3, M.furD, 0); parts.line(E, R, 5, -4, 7, 0, M.furD, 0); run(E, R, 0, 7, 9, M.handD, 0);   // 远侧腿
    E.part(); parts.line(E, R, R.hipFx, R.yHip + 1, 7, -5, M.fur, 0); parts.line(E, R, R.hipFx, R.yHip + 2, 7, -4, M.fur, 0); parts.line(E, R, 7, -5, 9, 0, M.fur, 0); parts.line(E, R, 8, -5, 10, -1, M.fur, 0); run(E, R, 0, 9, 11, M.hand, 0);   // 近侧腿（膝盖拱起）
    parts.torso(E, R, Q, { style: 'bare', mat: M.fur, cloth: M.cloth, belt: M.cord });
    parts.mantle(E, R, Q, { style: 'fur', mat: M.mane, len: 4 });
    mandrillHead(R, R.hx0, R.hx1, R.htop, 1);
    featherCrest(R, R.hx0, R.htop - 1, 1, 1);
    staffShaft(parts.FREE, SIT_STAFF); bullSkull(parts.FREE, SIT_STAFF.tx, SIT_STAFF.ty, P.gem); clothStrips(parts.FREE, SIT_STAFF.tx, SIT_STAFF.ty, 0);
    parts.arm(E, R, Q, { sleeve: 'bare', mat: M.fur, hand: M.hand, at: [6, -6] });
    E.part(); for (const [x, y] of [[15, 0], [16, -1], [17, -1], [-12, 0], [-13, 0], [-14, -1]]) px(E, parts.FREE, x, y, M.crest, x === 17 || x === -14 ? 4 : 0);   // 散落的羽毛
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, steamAcc = 0, lastStep = 0, lastPers = -1, mzT = 9, linkT = 9, retT = 9, symT = 9, buffT = 9;
  const BUFF = 1.25;                                                    // 被加速那名友军的描边 / 「»」/ 红蒸汽持续到收招结束
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const ally = () => allyPoints()[0];                                   // 施法对象：身前那名友军（ALLY_X[0]）
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX + 2, HY + 1, 12, 3, R_EL, 2.3, 1, 0);
    if (s === RECOVER) retT = 0;
    if (s !== CAST) return;
    const a = ally(), sx = wx(P.gx), sy = wy(P.gy);                     // 杖指一名友军：血线连过去（fxFront 自画，跟着杖头走满整个施放段）+ 脚下血环外爆
    linkT = 0; symT = 0; buffT = 0;                                     // 只点一名：描边 / 「»」/ 红蒸汽都只画在 ally()（ALLY_X[0]）身上，另一名保持原样
    releaseOrbit(30, 80, 0.25, 0.5, { pts: 1 });
    fx.cross(sx, sy, 5, R_EL, 0.25, 2);
    ring(a.x, HY - 1, 1, R_EL); burst(a.x, HY - 2, 18, 30, 90, 0.25, 0.6, R_EL, 30);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_POINT) {                                // 牛骨眼窝射出一颗血色光珠
      mzT = 0; const x = wx(P.gx), y = wy(P.gy);
      shoot(0, x + 2, y, 170, DUMMY_X - 3, R_EL); burst(x + 1, y, 6, 20, 60, 0.12, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.45 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && (t === T_SWING || t === T_SWING + 0.12)) {        // 友军快挥两下（加速）+ 肩头冒红蒸汽
      const a = ally(), k = t === T_SWING ? 0 : 1;
      fx.slash(a.x + 3, a.mid - 5, 7, k ? 150 : 30, k ? 30 : 150, R_EL, 0.16, 1, 2);
      burst(a.x + 8, a.mid - 5, 6, 20, 60, 0.15, 0.35, R_EL, 6);
      if (!k) { shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.45 }); }
    }
    if (s === DEATH && t === T_LAND) {                                  // 坐倒：尘土
      for (let i = 0; i < 12; i++) spawn(K_DUST, wx(-8 + Math.random() * 20), HY, (Math.random() - 0.5) * 30, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
  }
  function impactOn(k, x, y) { burst(x, y, 10, 30, 80, 0.2, 0.4, R_EL, 10); fx.cross(x, y, 3, R_EL, 0.15, 2); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.45 }); }
  const EVENTS = [[], [], [T_POINT], [], [T_SWING, T_SWING + 0.12], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                             // 血滴从地面螺旋汇向杖顶牛颅
      chargeAcc += dt * (14 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = HX - 10 + Math.random() * 24, sy = HY - Math.random() * 2, dx = sx - gx, dy = (sy - gy) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.5 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), tx: gx, ty: gy, orbitR: 3 });
      }
    }
    if ((state === CAST && stT > T_SWING) || (state === RECOVER && buffT < BUFF)) {   // 被加速那名友军肩头的红蒸汽（两肩交替，一直冒到收招）
      steamAcc += dt * 16; const a = ally();
      while (steamAcc >= 1) { steamAcc -= 1; spawn(K_RISE, a.x + (Math.random() < 0.5 ? -3 : 3), a.top + 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 每步：杖点地一下
      if (P.step !== 0) { sfx('step', { w: 0.45 }); spawn(K_DUST, wx(P.hx - Math.sin(P.a) * DN), HY, (Math.random() - 0.5) * 10, -4, 0.25, FXI.dust); spawn(K_DUST, wx(P.step > 0 ? 6 : -4), HY, (Math.random() - 0.5) * 10, -3, 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                               // 战舞：杖顿地扬尘 + 眼窝火星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 - 1e-6 && lp < 2.0 ? f12of(lp - 1.6) : -1;
      if (f !== lastPers) {
        if (f === 1 || f === 3) {                                       // 杖脚顿地：一小蓬扬尘（6 颗，往两侧溅）+ 眼窝火星 + 手鼓一声
          const fx0 = wx(P.hx - Math.sin(P.a) * DN);
          for (let i = 0; i < 6; i++) spawn(K_DUST, fx0 + (i - 2.5), HY - (i & 1), (i - 2.5) * 9, -8 - Math.random() * 8, 0.35 + Math.random() * 0.15, FXI.dust);
          spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -8, 0.4, R_EL); spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -10, 0.45, R_EL);
          sfx('step', { w: 0.45 });
        }
        lastPers = f;
      }
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) {   // 化为血雾向上消散
      soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_RISE, wx(-8 + Math.random() * 20), HY - 2 - Math.random() * 18, (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL, { age0: 0.25 }); }
    }
    mzT += dt; linkT += dt; retT += dt; symT += dt; buffT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; steamAcc = 0; lastStep = 0; lastPers = -1; mzT = 9; linkT = 9; retT = 9; symT = 9; buffT = 9; }
  // 候选部件：allyOutline —— 只给一名友军描边：按引擎友军小兵的形状（长矛 + 头盔 + 蓝衣 + 盾）烤两帧呼吸遮罩，用 outlineSprite 描 1 格
  // （allyFx 会同时照亮两名友军；单体增益用这个）。遮罩第一次画时才烤（引擎 LUT 建好之后）。
  let AM = null;
  function allyMask(bob) {
    const w = M.wood;
    E.part(); E.line(-4, -18 + bob, -4, 0, w, 0); E.sp(-4, -19 + bob, w, 0); E.sp(-4, -20 + bob, w, 0);
    E.part(); E.rect(-3, -1, 2, 2, w, 0); E.rect(1, -1, 3, 2, w, 0); E.rect(-3, -4, 2, 3, w, 0); E.rect(1, -4, 2, 3, w, 0);
    E.part(); E.rect(-3, -10 + bob, 6, 6 - bob, w, 0); E.run(-5 + bob, -3, 2, w, 0);
    E.part(); E.rect(-2, -14 + bob, 4, 4, w, 0);
    E.part(); E.run(-15 + bob, -2, 1, w, 0); E.run(-14 + bob, -3, 2, w, 0);
    E.part(); E.rect(2, -9 + bob, 2, 4, w, 0);
  }
  function fxMid(f12) {
    if (buffT >= BUFF || !(E.state === CAST || E.state === RECOVER)) return;
    if (!AM) { AM = [new Sprite(16, 22, 8, 19), new Sprite(16, 22, 8, 19)]; for (let b = 0; b < 2; b++) { E.begin(AM[b], 0, 0); allyMask(-b); bake(AM[b], { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 }); } }
    if (buffT / BUFF > 0.8 && (f12 & 1)) return;                        // 快结束时隔帧闪
    const a = ally(); E.outlineSprite(AM[(f12 >> 2) & 1], a.x, HY, (f12 >> 1) & 1 ? EL[1] : EL[2], HY + 1);
  }
  function fxBack(f12) { if (!P.sit && P.dq < 1) floorGlow(HX + 2, P.rim, EL, f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.sit && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2]; for (let r = 1; r <= 3; r++) { put(gx + 1 + r, gy, c); put(gx + 1, gy - r, EL[2]); put(gx + 1, gy + r, EL[2]); } }
    const a = ally();
    if (buffT < BUFF) {                                                 // 被加速那名友军头顶三个上升的血色「»」：错开 1/3 周期循环，任何时刻三个都在
      for (let k = 0; k < 3; k++) {
        const s = symT < 0.18 * k ? -1 : (symT - 0.18 * k) % 0.6; if (s < 0) continue;
        const x = a.x - 5 + k * 4, y = RD(a.top - 5 - s * 20), c = s < 0.08 ? EL[0] : s < 0.3 ? EL[1] : s < 0.48 ? EL[2] : EL[3];
        for (const o of [0, 2]) { put(x + o, y - 1, c); put(x + o + 1, y, c); put(x + o, y + 1, c); }
      }
    }
    if (E.state === CAST) {                                             // 血线：从杖头牛颅连到友军胸口，整个施放段都在；虚线往友军方向流，一颗白珠顺线跑过去
      const x0 = gx, y0 = gy, x1 = a.x, y1 = a.mid - 3, n = Math.max(1, RD(Math.hypot(x1 - x0, y1 - y0))), bead = RD(((linkT * 3) % 1) * n);
      for (let i = 0; i <= n; i++) {
        const x = RD(x0 + (x1 - x0) * i / n), y = RD(y0 + (y1 - y0) * i / n), ph = (i - f12 * 2) & 3;
        if (ph === 3) continue; put(x, y, Math.abs(i - bead) <= 1 ? EL[0] : ph === 0 ? EL[1] : EL[2]);
      }
    }
    if (E.state === RECOVER && retT < 0.3) {                            // 血线从友军端断开、回缩到杖头
      const q = ease.in(retT / 0.3), x0 = a.x, y0 = a.mid - 3, ex = x0 + (gx - x0) * q, ey = y0 + (gy - y0) * q, n = Math.max(1, RD(Math.hypot(gx - ex, gy - ey)));
      for (let i = 0; i <= n; i++) { if (((i + f12) & 3) === 3) continue; put(RD(ex + (gx - ex) * i / n), RD(ey + (gy - ey) * i / n), i < 2 ? EL[0] : EL[2]); }
    }
  }

  return {
    name: '萨满', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.sock, M.sockHot], HIT_POINT: [1, -16], EVENTS, ALLIES: 'skill', ALLY_X,
    REVIVE: { ramp: R_EL },
    SFX: { body: 'beast', how: 'collapse', pal: 'blood', style: 'buff', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
