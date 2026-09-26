// 蛇神使者（部队 · 兽人 · 牧师 · 传说）：沙漠信徒被蛇神选中后的同一个人——下半身化成翠鳞蛇尾（在地上盘成 S 形、尾尖在身后卷起），
// 尖兜帽长成头后张开的巨大眼镜蛇兜帽（内侧靛蓝 + 金色眼纹），保留靛蓝面巾、翠光眼、脑后的靛蓝垂巾；蛇头杖长成双头蛇杖（两条铜蛇缠绕，杖首两个蛇头左右张开）；
// 胸前挂一块刻蛇纹的石板护符（大地之灵的发光体），手腕戴金蛇镯。
// 攻击 = 双手举杖向前一压，目标脚下地面裂开，一根翠石蛇牙从地里刺出；技能 = 特性「盖亚之盾」生效：蛇尾盘高、高举双头蛇杖，脚下展开翠色蛇纹法阵、碎石浮起环绕，
// 杖往下一顿，最肉的友军脚下炸开，一条翠眼石鳞巨蛇破土而出，绕友军盘两圈后贴身化成一层石鳞甲，友军头顶的生命条长出一截。
PCD.define('SnakeGodMessenger', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, allyPoints, allyFx, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：盖亚之盾 · 蛇神翠（主，沿用信徒）+ 大地石灵（辅：石蛇、石鳞甲、浮石）─────
  const JADE = ['#c8ffe8', '#5ee0a8', '#1f9a78', '#0e4a44'];
  const R_EL = fxRamp('serpjade', [21].concat(JADE)), EL = FXR[R_EL];
  const R_ST = fxRamp('stonespirit', [5, 62, 10, 9, 8]), ST = FXR[R_ST];
  const R_DUST = FXI.dust;

  // ───── 材质 ─────
  const ROBE = ['#2a1a0c', '#6a4a24', '#a8804a', '#d8b87a'], SKIN = ['#121a14', '#2e4a38', '#4a7058', '#70987a'], TAIL = ['#08201c', '#145a44', '#2a9a70', '#6ad8a0'];
  const M = parts.mats(E, {
    tail: { r: TAIL, band: 2 }, tailS: TAIL, belly: 'sand', robe: { r: ROBE, band: 2 }, trim: 'gold', belt: 'gold', skin: SKIN, veil: 'blue',
    hoodIn: [0, 39, 39, 40], ocel: 'gold', rod: 'wood', snake: 'gold', stone: 'stone', cord: 'leather', tongue: 'blood', bangle: { r: 'gold', flat: 1 },
    eye: { r: [JADE[3], JADE[2], JADE[1], JADE[0]], flat: 1 }, glow: { r: [JADE[1], JADE[0], 21, 21], flat: 1 },
  });
  const BODY = { body: 'tall', leg: 16, torso: 11, sw: 3, waist: 1, limb: 0.9, fall: 'front' };
  const BODY_R = Object.assign({}, BODY);
  const STAFF = { rod: M.rod, snake: M.snake, eye: M.eye, glow: M.glow, len: 14, back: 18 };
  const STAFF_MATS = new Uint8Array(256); for (const k of ['rod', 'snake', 'eye', 'glow']) { STAFF_MATS[M[k]] = 1; STAFF_MATS[M[k + 'D']] = 1; }
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 68, 44, 64);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['rod', 'snake', 'eye', 'glow', 'skin', 'veil', 'stone', 'tongue', 'ocel', 'hoodIn']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const ALLY_X = [64];                                               // 最肉的那个友军站在前方

  // ═════ 候选部件：nagaTail 半人蛇的蛇尾下半身 ═════
  // 从胯下竖直落地的前段（带浅色腹鳞横纹），落地后往前拱一下再往后盘成 S 形（后段，背上菱形鳞纹、贴地的一行浅色腹），尾尖在身后翘起卷曲。
  // o = { mat 鳞, belly 腹鳞, hip [x, y] 胯下接口, r0 胯下半径, rG 落地最粗半径, back 往后盘的长度, arch 拱起高, curl 尾尖卷起高 }
  // 读 P：gf 波相（-1 静止 · 0–3 滑行的 4 帧：拱峰往后移 = 身体往前推）coil（待机缓慢盘动 0 / 1）tail（尾尖摆 -1..1）flat（1 = 倒地摊平，hip 给贴地的接口）
  // 两个部件：后段（盘绕 + 尾尖）→ 前段（胯下到地面）。前段画在后段之后、躯干之前。坐标 = 精灵本地（脚底原点），不跟 rig 转。
  const TB = new Float32Array(3 * 80), TF = new Float32Array(3 * 40); let tbN = 0, tfN = 0;
  function tailPts(P, o) {
    const hx = o.hip[0], hy = o.hip[1], flat = P.flat | 0, gf = flat ? -1 : P.gf == null ? -1 : P.gf | 0;
    tbN = 0; tfN = 0;
    const fx0 = flat ? hx : 3.5, rG = o.rG;
    if (!flat) {                                                      // 前段：胯下 → 地面前拱（二次贝塞尔）
      for (let k = 0; k <= 16; k++) { const t = k / 16, it = 1 - t, cx = hx + 0.5, cy = Math.max(hy + 2, -9);
        TF[3 * tfN] = it * it * hx + 2 * it * t * cx + t * t * fx0; TF[3 * tfN + 1] = it * it * (hy + 1) + 2 * it * t * cy + t * t * (-rG); TF[3 * tfN + 2] = o.r0 + (rG - o.r0) * t; tfN++; }
    }
    // 滑行：4 帧走完一整个波周期（拱峰每帧后移约 4 格，第 4 帧接回第 1 帧）
    const ph = gf >= 0 ? 0.3 + gf * 0.5 : (P.coil ? 0.42 : 0.34), arch = flat ? 0.4 : o.arch, len = o.back, r1 = rG * 0.5;
    const x0 = flat ? hx : fx0, y0f = flat ? hy : 0;
    let ex = 0, ey = 0, er = 0;
    for (let k = 0; k <= 34; k++) {                                   // 后段：往后盘，拱峰随波相移动
      const s = k / 34, r = rG - (rG - r1) * s, h = Math.max(0, Math.sin(Math.PI * (2 * s - ph))) * (s < 0.12 ? s / 0.12 : 1);
      const x = x0 - s * len, y = flat ? Math.min(-r, y0f + (-r - y0f) * Math.min(1, s * 4)) : -r - arch * h;
      TB[3 * tbN] = x; TB[3 * tbN + 1] = y; TB[3 * tbN + 2] = r; tbN++; ex = x; ey = y; er = r;
    }
    const cu = flat ? -o.curl + 1.5 : o.curl, sw = P.tail | 0;       // 尾尖：往后上方卷起，尖端朝前勾
    const c1x = ex - 3, c1y = ey - 0.3, c2x = ex - 5 + sw * 0.5, c2y = ey - 1 - cu * 0.8, tx = ex - 2.5 + sw, ty = Math.min(-0.7, ey - cu);
    for (let k = 1; k <= 18; k++) { const t = k / 18, it = 1 - t;
      TB[3 * tbN] = it * it * it * ex + 3 * it * it * t * c1x + 3 * it * t * t * c2x + t * t * t * tx; TB[3 * tbN + 1] = it * it * it * ey + 3 * it * it * t * c1y + 3 * it * t * t * c2y + t * t * t * ty;
      TB[3 * tbN + 2] = Math.max(0.6, er * (1 - t * 0.75)); tbN++; }
  }
  const T0 = parts.FREE;
  function discAt(x, y, r, m, t) { const X = RD(x), Y = RD(y), n = Math.ceil(r); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if (i * i + j * j <= r * r + 0.35) parts.px(E, T0, X + i, Y + j, m, t); }
  function nagaTailBack(o) {
    E.part();
    for (let k = 0; k < tbN; k++) discAt(TB[3 * k], TB[3 * k + 1], TB[3 * k + 2], o.mat, 0);
    for (let k = 0; k < tbN; k++) {
      const x = TB[3 * k], y = TB[3 * k + 1], r = TB[3 * k + 2];
      if (r >= 1.2 && y + r > -0.6) parts.px(E, T0, x, y + r, o.belly, 3);                                  // 贴地一行浅色腹
      if (r >= 1.6 && (k % 4) === 1) { parts.px(E, T0, x, y - r + 1, o.mat, 4); parts.px(E, T0, x, y - r + 2, o.mat, 2); parts.px(E, T0, x + 1, y - r + 2, o.mat, 4); }   // 背鳞菱纹
    }
  }
  function nagaTailFront(o) {
    if (!tfN) return; E.part();
    for (let k = 0; k < tfN; k++) discAt(TF[3 * k], TF[3 * k + 1], TF[3 * k + 2], o.mat, 0);
    for (let k = 0; k < tfN; k++) {                                   // 腹鳞：前沿 2 格浅色，每 2 行一道横纹
      const x = TF[3 * k], y = RD(TF[3 * k + 1]), r = TF[3 * k + 2], fx = RD(x + r - 0.4);
      parts.px(E, T0, fx, y, o.belly, (y & 1) ? 2 : 3); parts.px(E, T0, fx - 1, y, o.belly, (y & 1) ? 2 : 4);
      if ((k % 4) === 2) { parts.px(E, T0, RD(x - r + 1), y, o.mat, 4); parts.px(E, T0, RD(x - r + 2), y + 1, o.mat, 2); }
    }
  }

  // ═════ 双头蛇杖（本角色专属）：一根木芯，两条铜蛇交替缠绕上去，杖首两个蛇头左右张开、蛇眼是翠石 ═════
  // 读 P：a（杖角）gem（蛇眼 0–4）glint。rot 1 = 倒在地上（杖首朝右）
  const HEADR = [[-6, 2, 4], [-5, 2, 5], [-4, 3, 4]], NECKR = [[1, -1], [1, -2], [2, -3]];
  function twinGeo(P, o) {
    const a = o.a != null ? o.a : P.a, gx = RD(o.at ? o.at[0] : P.hx), gy = RD(o.at ? o.at[1] : P.hy), dx = Math.sin(a), dy = -Math.cos(a), r0 = o.rot || 0;
    const tip = [RD(gx + dx * o.len), RD(gy + dy * o.len)], loc = (u, v) => (r0 === 1 ? [tip[0] - v, tip[1] + u] : [tip[0] + u, tip[1] + v]);
    return { gx, gy, dx, dy, tip, r0, focus: loc(0, -4), eyeR: loc(3, -6), eyeL: loc(-3, -6) };
  }
  function twinStaff(R, o) {
    const G = twinGeo(P, o), T = o.free ? T0 : R, back = o.back, len = o.len, nx = -G.dy, ny = G.dx;
    E.part();
    for (let k = -back; k <= len; k++) parts.px(E, T, G.gx + G.dx * k, G.gy + G.dy * k, o.rod, k === -back ? 2 : 3);                 // 木芯
    for (let k = 0; k <= len + back - 2; k++) {                                                                                       // 两条铜蛇交替缠绕（上段密、下段疏）
      const d = len - k, ph = 2 * Math.PI * k / (k < len ? 6 : 9), w = k < len ? 1.4 : 1, s = Math.sin(ph);
      const ax = G.tip[0] - G.dx * k + nx * s * w, ay = G.tip[1] - G.dy * k + ny * s * w, bx = G.tip[0] - G.dx * k - nx * s * w, by = G.tip[1] - G.dy * k - ny * s * w;
      if (d < -back + 3) break;
      parts.px(E, T, bx, by, o.snake, Math.cos(ph) > 0 ? 2 : 3); parts.px(E, T, ax, ay, o.snake, Math.cos(ph) > 0 ? 4 : 3);
    }
    E.part();                                                                                                                         // 杖首：两颈分开 + 左右两个蛇头
    const H = o.free ? { r0: G.r0, tx: G.tip[0], ty: G.tip[1], rot: 0, ox: 0, oy: 0 } : { r0: G.r0, tx: R.tx + G.tip[0], ty: R.ty + G.tip[1], rot: R.rot, ox: R.ox, oy: R.oy }, m = o.snake;
    parts.px(E, H, 0, 0, m, 3); parts.px(E, H, 0, -1, m, 4);
    for (const sg of [1, -1]) {
      for (const [u, v] of NECKR) parts.px(E, H, u * sg, v, m, 3);
      for (const [v, u0, u1] of HEADR) for (let u = u0; u <= u1; u++) parts.px(E, H, u * sg, v, m, 0);
      parts.px(E, H, 5 * sg, -5, m, 4); parts.px(E, H, 4 * sg, -4, m, 2);
    }
    const lv = CL(P.gem | 0, 0, 4);
    for (const sg of [1, -1]) { if (lv === 4) parts.px(E, H, 3 * sg, -6, o.eye, 1); else if (lv >= 2) parts.px(E, H, 3 * sg, -6, o.glow, lv === 3 ? 3 : 4); else parts.px(E, H, 3 * sg, -6, o.eye, lv === 1 ? 4 : 3); }
    if (P.glint) parts.px(E, H, 0, -2, o.glow, 3);
    return G;
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, rise: 0, gf: -1, coil: 0, tail: 0, hood: 1, tongue: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, ax: 0, ay: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, flat: 0, shed: 0, cq: 0, drop: 0, sa: 0, slift: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, rise) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, rise: rise || 0 });
  const K_IDLE = K(7, -20, 0, -3, -16);                              // 前手握杖，后手垂在身侧
  const K_WIND = K(5, -27, -0.15, 5, -24, -1, -1, 1);                // 攻击预兆：双手把杖举起
  const K_PRESS = K(10, -22, 0.45, 8, -20, 1, 0, 0);                 // 出手：双手举杖向前一压
  const K_HOLD = K(9, -21, 0.35, 7, -19, 1, 0, 0);
  const K_RAISE = K(6, -31, 0, 5, -27, -1, -1, 3);                   // 蓄力：蛇尾盘高，双手高举双头蛇杖
  const K_SLAM = K(8, -22, 0.1, 7, -19, 1, 0, 1);                    // 施放：杖往下一顿
  const K_HURT = K(5, -19, -0.2, -4, -17, -1, -1, 1);
  const K_SLUMP = K(4, -12, 0, 1, -10, 2, 1, -6);                    // 死亡：上身软倒在蛇尾上
  const K_LIE = K(2, -31, 0, -2, -23, 0, 0, 0);                      // 倒地（rig 前扑 90°）：手顺着身体放
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'rise'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 31], ['hy', -56, 8], ['a', -32, 32, 1 / ASTEP], ['bhx', -16, 31], ['bhy', -56, 8], ['lean', -1, 2], ['head', -1, 1], ['bob', 0, 1], ['rise', -8, 4]]);
  const KEY2 = parts.keyer([['gf', -1, 3], ['coil', 0, 1], ['tail', -2, 2], ['hood', 0, 2], ['tongue', 0, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['flat', 0, 1], ['shed', 0, 1], ['cq', 0, 12], ['drop', 0, 1], ['sa', 0, 3], ['slift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['beard', -3, 3], ['sway', -2, 2]]);
  const SWAY_IDLE = [0, 1, 0, -1, 0], TAIL_IDLE = [0, -1, 0, 1, 0], COIL_IDLE = [0, 0, 1, 1, 0], TONGUE = [0, 1, 2, 1, 0];
  const T_PRESS = 2 / 12, T_LAND = INCOMING + 0.7, T_SHED = INCOMING + 1.2, T_STAFF = INCOMING + 2.05, T_ARMOR = 0.15;
  const PLANT = [6, -1];                                             // 死亡时蛇杖脱手，杖尾插在地上的位置

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.bob = 0; P.gf = -1; P.coil = 0; P.tail = 0; P.hood = 1; P.tongue = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1;
    P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.flat = 0; P.shed = 0; P.cq = 0; P.drop = 0; P.sa = 0; P.slift = 0; P.dq = 0; P.flip = 0; P.mx = 0; P.crouch = 0;
    const idle = () => {                                               // 催眠摇摆：上身按 S 形左右摇 1 格，蛇尾缓慢盘动，兜帽一张一收
      // 一个循环 = 2.4 s，按循环内时间 lp 分 5 段（各 0.48 s）：居中 → 右 → 居中 → 左 → 回到第 0 帧的姿势（呼吸、盘尾、兜帽、尾尖都一样），首尾相接不跳
      setK(K_IDLE, K_IDLE, 0); const lp = tq % DUR[IDLE], s = Math.min(4, Math.floor(lp / 0.48 + 1e-6)); P.bob = s & 1;
      P.lean = SWAY_IDLE[s]; P.hx += P.lean; P.bhx += P.lean; P.tail = TAIL_IDLE[s]; P.coil = COIL_IDLE[s]; P.hood = (s & 1) ? 1 : 2; P.beard = -P.lean; P.sway = P.lean;
      if (lp >= 1.6 && lp < 2.0) { const k = Math.floor((lp - 1.6) * 12 + 1e-6); P.tongue = TONGUE[k] || 0; P.gem = k >= 1 && k <= 3 ? 1 : 0; P.glint = k === 2 ? 1 : 0; P.hood = 2; }   // 吐一下分叉信子，护符亮一下
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 蛇行滑行：蛇尾 S 波往前推，上身几乎不起伏
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.gf = f; P.tail = [2, 0, -2, 0][f]; P.beard = -1; P.sway = f & 1 ? -1 : 0; P.hood = 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.hood = 2; }
      else if (tq < T_PRESS + 1 / 12) { setK(K_PRESS, K_PRESS, 0); P.gem = 2; P.rim = 2; P.hood = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_PRESS, K_HOLD, ease.out((tq - T_PRESS - 1 / 12) / 0.2)); P.gem = 1; P.hood = 2; P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RAISE, q); P.hood = q > 0.4 ? 2 : 1;
      // 护符 / 蛇眼：0.45 s 起亮到 2 档，最后 0.4 s 逐帧闪到 3 档
      P.gem = tq < 0.45 ? 1 : tq > 1.0 && (f12 & 1) ? 3 : 2; P.rim = 2; P.tail = (f12 >> 1) & 1 ? 1 : -1; P.coil = 1; P.beard = -1 - (tq > 1.0 && (f12 & 1) ? 1 : 0); P.sway = tq > 1.0 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) { setK(K_RAISE, K_SLAM, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.hood = 2; P.coil = 1; P.beard = -2; P.sway = -1; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.hood = q < 0.6 ? 2 : 1; P.beard = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.hood = 2; P.tail = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.tail = -1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 蜕皮：兜帽收拢 → 上身软倒在蛇尾上 → 塌平 → 留下灰白蛇蜕 → 翠光粒子升起 → 蛇蜕逐列消散，蛇杖倒地
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.tail = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.hood = d < 0.15 ? 2 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        P.bx = -2; P.eyes = 1; P.hood = 0; P.sa = 0; P.drop = 1;
        if (d < 0.55) { setK(K_HURT, K_SLUMP, d < 0.42 ? 0.5 : 1); P.beard = 1; P.gem = (f12 & 1) ? 1 : 0; }
        else { setK(K_LIE, K_LIE, 0); P.lying = 1; P.flat = 1; P.lift = d < 0.62 ? 3 : d < 0.7 ? 1 : 0; P.gem = d < 1.0 ? ((f12 & 1) ? 1 : 4) : 4; }
        if (d >= 1.2) P.shed = 1;
        if (d >= 1.9) P.cq = Math.min(12, 1 + Math.floor((d - 1.9) * 24 + 1e-6));
        P.sa = d < 1.95 ? 0 : d < 2.0 ? 1 : d < 2.05 ? 2 : 3; P.slift = d < 2.05 ? 0 : d < 2.1 ? 2 : d < 2.15 ? 1 : 0;
        if (d >= 2.3) P.dq = clamp01((d - 2.3) / 0.3);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.rise = RD(P.rise); const yo = P.lying ? 0 : P.bob - P.rise;     // 手跟着上身一起抬高（rise = 蛇尾把上身再托高几格）
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head);
    const g = twinGeo(P, staffOpt()).focus; P.gx = g[0] + P.bx; P.gy = g[1];
    BODY_R.leg = BODY.leg + (P.lying ? 0 : P.rise); const R = parts.rig(P, BODY_R); if (P.lying) R.ox = 4 - BODY.leg;   // 护符中心（给特效挂点用，和 drawHero 同一个 rig）
    const am = amuletAt(R), ac = parts.toSprite(R, am[0] + 1, am[1] + 1); P.ax = ac[0] + P.bx; P.ay = ac[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  // 死亡时蛇杖脱手：先插在地上，最后往前倒下
  const DROP = Object.assign({}, STAFF, { at: [0, 0], a: 0, rot: 0, free: 1 });
  function staffOpt() {                                              // 杖尾插在 PLANT 处，绕杖尾往前倒：0 竖直 · 1、2 倾倒 · 3 平躺（杖首蛇头按 90° 转）
    if (!P.drop) return STAFF;
    const a = P.sa === 1 ? 0.6 : P.sa === 2 ? 1.1 : P.sa >= 3 ? HALF : 0, dx = Math.sin(a), dy = -Math.cos(a), by = PLANT[1] - (P.slift | 0);
    DROP.at[0] = RD(PLANT[0] + dx * STAFF.back); DROP.at[1] = RD(by + dy * STAFF.back); DROP.a = a; DROP.rot = P.sa >= 3 ? 1 : 0; return DROP;
  }

  // ───── 画（部件从后往前）─────
  function drape(R) {                                                // 靛蓝垂巾：从兜帽下的后脑垂到腰，离开后背 2–4 格
    E.part(); const x0 = R.hx0, y0 = R.hy + 3, L = 8, b = P.beard, X = (t) => RD(x0 - 3.5 - 2.8 * Math.pow(t, 0.8) + b * t * t * 1.3);
    for (let k = 0; k <= L; k++) { const t = k / L, xr = X(t), w = k < L - 1 ? 3 : 2; parts.run(E, R, y0 + k, xr - w + 1, xr, M.veil, 0); if (k > 0 && (k & 1)) parts.px(E, R, xr - 1, y0 + k, M.veil, 2); }
    const xe = X(1); parts.px(E, R, xe - 2, y0 + L + 1, M.veil, 3); parts.px(E, R, xe, y0 + L + 1, M.veil, 2);
  }
  // 眼镜蛇兜帽：头后张开的扁椭圆（宽 12 格，上缘高出头顶 3 格），外圈翠鳞、内侧靛蓝 + 一只金色眼纹；P.hood 0 收拢 · 1 半张 · 2 全张
  function nagaHood(R) {
    const lv = P.hood | 0, rx = [3.5, 5.5, 6.5][lv], ry = [5, 6.5, 7][lv], cx = R.hx - 2.5, cy = R.htop + 4;
    E.part();
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry * 1.2);
    for (let y = y0; y <= y1; y++) {
      const t = (y - cy) / ry, w = t < 0 ? rx * Math.sqrt(Math.max(0, 1 - t * t)) : rx * Math.max(0, 1 - Math.pow(t / 1.2, 1.7)); if (w < 0.6) continue;
      const a = RD(cx - w), b = RD(cx + w * 0.9);
      parts.run(E, R, y, a, b, M.hoodIn, 0);
      parts.px(E, R, a, y, M.tailS, t < -0.3 ? 4 : 0); if (lv && w > 2) parts.px(E, R, a + 1, y, M.tailS, (y & 1) ? 2 : 0);
      if (y === y0 || (y === y0 + 1 && lv)) parts.run(E, R, y, a, b, M.tailS, y === y0 ? 4 : 0);   // 外圈翠鳞边（上沿 2 行、后沿 2 列）
      else parts.px(E, R, b, y, M.tailS, 0);
      if (lv && t > -0.3 && ((y - y0) & 1)) for (let x = a + 2; x < b - 1; x += 2) parts.px(E, R, x, y, M.hoodIn, 2);   // 兜帽的肋纹
    }
    if (lv > 0) { const ox = RD(cx - rx * 0.45), oy = RD(cy - ry * 0.45); parts.px(E, R, ox, oy, M.ocel, 3); parts.px(E, R, ox, oy + 1, M.ocel, 2); }   // 金色眼纹：压暗一级（gold 第 2–3 级、没有白芯和黑瞳），缩成 2 格、挪到兜帽上半，不和真脸抢
  }
  function mask(R) {                                                 // 面巾（和脸同一部件）+ 分叉信子
    const x0 = R.hx0, x1 = R.hx1, ey = R.ey, bot = R.hy;
    for (let y = ey + 1; y <= bot; y++) parts.run(E, R, y, x0 + 2, x1, M.veil, 0);
    parts.px(E, R, x1 + 1, ey + 1, M.veil, 4); parts.px(E, R, x1 + 1, ey + 2, M.veil, 3); parts.run(E, R, bot + 1, x1 - 2, x1, M.veil, 2); parts.px(E, R, x1 - 1, ey + 2, M.veil, 2);
    const tg = P.tongue | 0;
    if (tg) { for (let k = 1; k <= tg; k++) parts.px(E, R, x1 + k, bot, M.tongue, 3); parts.px(E, R, x1 + tg + 1, bot - 1, M.tongue, 4); parts.px(E, R, x1 + tg + 1, bot + 1, M.tongue, 2); }
  }
  // 胸前的石蛇护符（发光体）：两股挂绳从前后肩线斜下来，3×4 石板挂在胸口中线（躯干后沿 +1 起 3 列，避开 x ≥ 3 的杖身和前手），刻一条 S 形蛇纹。
  // 最后画（压在前臂之后），相邻的部件被压出分界线、石板自己不会被压暗。P.gem：0 常态暗翠 · 1 亮 · 2 更亮（白头）· 3 全白 · 4 熄灭
  function amuletAt(R) { return [parts.edges(R, R.yS + 3)[0] + 1, R.yS + 3]; }          // 石板左上角（rig 本地坐标）
  const GLYPH = [[1, 1], [0, 2], [1, 3]];                                                // 蛇纹：头 → 身 → 尾（一个 < 形弯）
  const GLYPH_T = [[[M.eye, 3], [M.eye, 2], [M.eye, 2]], [[M.eye, 4], [M.eye, 3], [M.eye, 3]], [[M.glow, 3], [M.eye, 4], [M.eye, 4]], [[M.glow, 3], [M.glow, 3], [M.glow, 2]], [[M.eye, 1], [M.eye, 1], [M.eye, 1]]];
  function amulet(R) {
    const a = amuletAt(R), x0 = a[0], y0 = a[1], lv = CL(P.gem | 0, 0, 4);
    E.part();
    parts.line(E, R, x0 - 1, R.yS, x0, y0 - 1, M.cord, 2);                              // 后股：后肩线 → 石板左上
    parts.line(E, R, x0 + 3, R.yS + 1, x0 + 2, y0 - 1, M.cord, 3);                      // 前股：前肩线 → 石板右上（压过前肩）
    for (let v = 0; v < 4; v++) for (let u = 0; u < 3; u++) parts.px(E, R, x0 + u, y0 + v, M.stone, v === 0 ? (u === 2 ? 3 : 4) : u === 2 || (v === 3 && u === 1) ? 2 : 3);   // 石板：上沿亮、右沿和下沿暗
    for (let k = 0; k < 3; k++) { const g = GLYPH[k], c = GLYPH_T[lv][k]; parts.px(E, R, x0 + g[0], y0 + g[1], c[0], c[1]); }
    if (P.glint) parts.px(E, R, x0 - 1, y0, M.glow, 3);                                // 亮一下：左上角一颗白星
  }
  // 金蛇镯：前臂手腕处和小臂垂直的一行 3 格金（flat 材质：后画的手不会把它压成勾线）
  function bangle(R, A) {
    const dx = A.hx - A.ex, dy = A.hy - A.ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, cx = A.hx - 0.5 - ux * 1.6, cy = A.hy - 0.5 - uy * 1.6;
    const pts = [-1, 0, 1].map((k) => [RD(cx - uy * k), RD(cy + ux * k)]).sort((p, q) => p[0] + p[1] - q[0] - q[1]);
    E.part(); parts.px(E, R, pts[0][0], pts[0][1], M.bangle, 4); parts.px(E, R, pts[1][0], pts[1][1], M.bangle, 3); parts.px(E, R, pts[2][0], pts[2][1], M.bangle, 2);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    BODY_R.leg = BODY.leg + (P.lying ? 0 : P.rise); const R = parts.rig(P, BODY_R);
    if (P.lying) R.ox = 4 - BODY.leg;                               // 前扑倒地：胯落在 x 4，正好接上摊平的蛇尾
    const hip = P.lying ? parts.toSprite(R, 0, R.yHip) : [0, R.yHip];
    const TO = { mat: M.tail, belly: M.belly, hip: [hip[0], P.lying ? -3 - (P.lift | 0) : hip[1]], r0: 2.8, rG: 4, back: 15, arch: 3, curl: 8 };
    tailPts(P, TO);
    const so = staffOpt(), free = !!so.free, bFront = !P.lying && P.bhx > 3;
    if (free && P.lying && P.sa < 3) twinStaff(R, so);              // 插在地上的蛇杖在倒下的身体后面
    drape(R);
    nagaTailBack(TO);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.robeD, cuff: M.trim, hand: M.skinD, grip: bFront ? 'none' : 'fist' });
    nagaTailFront(TO);
    nagaHood(R);                                                    // 兜帽在后颈张开：下沿压在肩后，被躯干挡住（不再盖住胸口）
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.belt, buckle: M.trim, hem: R.yHip + 4, flare: 1.6, flareF: 1.2 });
    parts.head(E, R, P, { mat: M.skin, face: 'long', eye: M.eye, eyeStyle: 'glow', nose: 'none', mouth: 'none', ear: 'none' });
    mask(R);
    if (!(free && P.lying && P.sa < 3)) twinStaff(R, so);
    if (bFront) parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    const A = parts.arm(E, R, P, { from: [R.sFx + 1, R.sFy], sleeve: 'loose', mat: M.robe, grip: 'none' });   // 前肩往前挪 1 格，让出胸口的护符
    bangle(R, A);
    parts.hand(E, R, P, { hand: M.skin });
    amulet(R);
  }
  // 蛇蜕：非蛇杖的像素换成骨灰色；逐列消散（从头到尾：右 → 左）
  const SHEDMAP = new Uint8Array(256);
  (function () { const S = E.RAMP.bone; for (let c = 0; c < 256; c++) { if (c >= E.PAL.length) { SHEDMAP[c] = c; continue; } const n = parseInt(E.PAL[c].slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; SHEDMAP[c] = l > 0.55 ? S[3] : l > 0.33 ? S[2] : l > 0.16 ? S[1] : S[0]; } })();
  function matAt(s, i, x, y) { let m = s.mat[i]; if (!m) m = (x > 0 && s.mat[i - 1]) || (x < s.w - 1 && s.mat[i + 1]) || (y > 0 && s.mat[i - s.w]) || (y < s.h - 1 && s.mat[i + s.w]) || 0; return m; }
  function shedify() {
    const s = hero, w = s.w; let x0 = 999, x1 = -1;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (s.out[i] === 255 || STAFF_MATS[matAt(s, i, x, y)]) continue; s.out[i] = SHEDMAP[s.out[i]]; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    if (P.cq > 0) { const q = P.cq / 12, span = Math.max(1, x1 - x0);
      for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (s.out[i] === 255 || STAFF_MATS[matAt(s, i, x, y)]) continue; if ((x1 - x) / span * 0.8 + B8[(y & 7) * 8 + (x & 7)] * 0.2 < q) s.out[i] = 255; } }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); if (P.shed) shedify(); }

  // ───── 特效 ─────
  let fangT = 9, snT = 9, armT = 9, chargeAcc = 0, rockAcc = 0, emberAcc = 0, jadeAcc = 0, lastF = -1, hpT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const ally = () => { const a = allyPoints()[0]; return a || { x: 64, y: HY, top: HY - 16, mid: HY - 8 }; };
  function onEnter(s) {
    if (s === CHARGE) { fx.circle(HX + 1, HY, 14, 3, R_EL, 2.1, 0.35, 0); fx.circle(ally().x, HY, 8, 2, R_EL, 2.1, -0.6, 0); hpT = 0; }
    if (s === CAST) {                                                 // 杖往下一顿：友军脚下地面炸开，石鳞巨蛇破土而出
      const a = ally(), g = [wx(P.gx), wy(P.gy)];
      snT = 0; fx.crack(a.x + 2, HY + 1, 12, 1, R_ST, 1.0); fx.crack(a.x - 2, HY + 1, 12, -1, R_ST, 1.0); ring(a.x + 6, HY - 3, 1, R_ST);
      for (let i = 0; i < 14; i++) spawnX(K_PHYS, a.x + 6 + (Math.random() - 0.5) * 8, HY - 2, (Math.random() - 0.5) * 90, -60 - Math.random() * 70, 0.7 + Math.random() * 0.4, R_ST, { g: 260, floor: HY, sz: Math.random() < 0.5 ? 2 : 1 });
      burst(a.x + 6, HY - 2, 12, 20, 60, 0.3, 0.6, R_DUST, 10);
      fx.cross(g[0], g[1], 6, R_EL, 0.3); ring(g[0], g[1], 0, R_EL);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'earth', w: 0.75 });
    }
    if (s === RECOVER) releaseOrbit(10, 30, 0.5, 0.9, { pts: 1, kind: K_PHYS, g: 220, floor: HY, up: 0 });   // 浮石落地成尘
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_PRESS) {                               // 地面裂开，翠石蛇牙从目标脚下刺出
      fangT = 0; fx.crack(DUMMY_X - 2, HY + 1, 7, -1, R_EL, 0.6); fx.crack(DUMMY_X + 2, HY + 1, 7, 1, R_EL, 0.6);
      burst(DUMMY_X, HY - 1, 10, 30, 80, 0.2, 0.45, R_EL, 20); for (let i = 0; i < 6; i++) spawn(K_DUST, DUMMY_X - 4 + Math.random() * 8, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 10, 0.4, R_DUST);
      const g = [wx(P.gx), wy(P.gy)]; burst(g[0], g[1], 6, 20, 50, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.5 });
    }
    if (s === ATTACK && t === T_PRESS + 1 / 12) { hitDummy(0); fx.cross(DUMMY_X - 1, HY - 13, 3, R_EL, 0.15); sfx('hit', { mat: 'stone', w: 0.5 }); }
    if (s === RECOVER && t === T_ARMOR) {                              // 石蛇贴身化成石鳞甲，生命条变长
      const a = ally(); armT = 0; allyFx({ dur: 0.6, outline: R_ST });
      for (let i = 0; i < 10; i++) spawn(K_EMBER, a.x - 5 + Math.random() * 10, a.mid + 6 - Math.random() * 14, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.6 + Math.random() * 0.4, R_EL);
      burst(a.x, a.mid, 16, 30, 70, 0.2, 0.5, R_ST, 10); fx.cross(a.x, a.top - 4, 4, R_EL, 0.4);
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.5 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, R_DUST); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_SHED) { burst(HX + 4, HY - 4, 14, 20, 50, 0.3, 0.6, R_EL, 8); }
    if (s === DEATH && t === T_STAFF + 0.1) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX + 10 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, R_DUST); sfx('hit', { mat: 'metal', w: 0.4 }); }
  }
  const EVENTS = [[], [], [T_PRESS, T_PRESS + 1 / 12], [], [], [T_ARMOR], [], [T_LAND, T_SHED, T_STAFF + 0.1], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                           // 碎石从地上浮起、绕身体螺旋 + 翠光汇聚到杖首
      rockAcc += dt * (10 + 10 * clamp01(stT / 1.0));
      while (rockAcc >= 1) { rockAcc -= 1; const r = 15 + Math.random() * 5; spawnX(K_SPIRAL_PT, 0, 0, (r - 11) / (0.6 + Math.random() * 0.5), 0, 2.4, R_ST, { a: Math.random() * 6.2832, r, w: 2.8 + Math.random() * 1.2, tx: HX, ty: HY - 16, orbitR: 10 + Math.random() * 3, orbitW: 2.6, squash: 0.45, sz: Math.random() < 0.35 ? 2 : 1 }); }
      chargeAcc += dt * (14 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE) { const f = E.gait(q12(stT)); if (f !== lastF) { if (!(f & 1)) spawn(K_DUST, scrX(-6 - f * 2) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.3, R_DUST); lastF = f; } }
    if (state === IDLE) { emberAcc += dt * 1.4; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + (Math.random() < 0.5 ? -3 : 3), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > T_SHED && stT < T_SHED + 0.8) {      // 真身化成翠光粒子，从蛇蜕里升起
      jadeAcc += dt * 40; const s = hero;
      while (jadeAcc >= 1) { jadeAcc -= 1; for (let n = 0; n < 12; n++) { const i = Math.floor(Math.random() * s.w * s.h); if (s.out[i] === 255 || STAFF_MATS[s.mat[i]]) continue; const x = (i % s.w) - s.ox + P.bx, y = Math.floor(i / s.w) - s.oy; spawn(K_RISE, scrX(x), HY + y, (Math.random() - 0.5) * 6, -12 - Math.random() * 16, 0.7 + Math.random() * 0.7, R_EL); break; } }
    }
    if (state === DEATH && stT > INCOMING + 1.9 && stT < INCOMING + 2.5) { jadeAcc += dt * 12; while (jadeAcc >= 1) { jadeAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 30, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 12, 0.8 + Math.random() * 0.6, FXI.soul); } }
    fangT += dt; snT += dt; armT += dt; hpT += dt;
  }
  function fxReset() { fangT = 9; snT = 9; armT = 9; hpT = 9; chargeAcc = 0; rockAcc = 0; emberAcc = 0; jadeAcc = 0; lastF = -1; }

  // 石鳞巨蛇：0–0.25 s 自下而上长出（8–10 格粗的石柱 + 翠眼蛇头）→ 0.25–0.65 s 绕友军盘两圈并收紧 → 化成石鳞甲
  const SN_RISE = 0.25, SN_COIL = 0.65;
  function drawRise(f12) {                                           // 石鳞巨蛇破土：身体一条 S 弯，朝友军一侧是浅色腹鳞（每 2 行一道横纹），背上隔点石鳞；蛇头朝左、翠眼
    const a = ally(), bx = a.x + 10, h = [9, 18, 27][Math.min(2, Math.floor(snT * 12 + 1e-6))];
    let hx = bx, hy = HY - h;
    for (let k = 0; k < h; k++) {
      const q = k / 27, cx = RD(bx + Math.sin(k * 0.24) * 2.5 - q * q * 5), hw = RD(4.5 - q * 1.5), y = HY - 1 - k;
      for (let dx = -hw; dx <= hw; dx++) {
        const x = cx + dx; let c = ST[2];
        if (Math.abs(dx) === hw) c = ST[4]; else if (dx <= -hw + 2) c = (y & 1) ? ST[1] : ST[2]; else if (dx >= hw - 1) c = ST[3]; else if (((x + (y >> 1) * 2) % 4) === 0) c = ST[3];
        put(x, y, c);
      }
      if (k === h - 1) { hx = cx; hy = y; }
    }
    const HL = [5, 7, 7, 6, 3], HR = [3, 3, 3, 3, 2];                                                         // 蛇头：楔形，吻朝左
    for (let j = 0; j < 5; j++) { const y = hy - 1 - j; for (let x = hx - HL[j]; x <= hx + HR[j]; x++) put(x, y, x === hx - HL[j] || j === 4 || x === hx + HR[j] ? ST[4] : j === 3 ? ST[1] : ST[2]); }
    put(hx - 6, hy - 2, ST[4]); for (let x = hx - 6; x <= hx - 2; x++) put(x, hy - 1, ST[4]);           // 嘴线
    put(hx - 3, hy - 3, EL[0]); put(hx - 2, hy - 3, EL[1]); put(hx - 3, hy - 4, EL[2]);                    // 翠眼
    if (f12 & 1) { put(hx - 8, hy - 1, EL[1]); put(hx - 9, hy - 2, EL[2]); put(hx - 9, hy, EL[2]); }      // 分叉信子
  }
  function drawCoil(front, f12) {
    const a = ally(), u = clamp01((snT - SN_RISE) / (SN_COIL - SN_RISE)), R = 9 - 4 * u, spin = snT * 11, n = 90;
    for (let k = 0; k <= n; k++) {
      const s = k / n, th = spin + s * 4 * Math.PI, sn = Math.sin(th), fr = sn > -0.05; if (fr !== front) continue;
      const x = RD(a.x + Math.cos(th) * R), y = RD(HY - 2 - s * 17), c = sn > 0.35 ? ST[2] : ST[3];
      put(x, y + 1, ST[4]); put(x, y, (k % 5) === 0 && sn > 0 ? ST[1] : c); put(x, y - 1, sn > 0.35 && (k & 1) ? ST[1] : c); put(x, y - 2, ST[4]);
      if (k === n) { for (let d = 1; d <= 3; d++) { put(x - d, y - 1, ST[2]); put(x - d, y - 2, ST[4]); put(x - d, y, ST[4]); } put(x - 2, y - 1, EL[0]); }   // 蛇头在最上面，翠眼
    }
  }
  function drawHpBar(f12) {                                          // 友军头顶的生命条：石鳞甲生成后长出一截金色 + 金色「+」
    const a = ally(), y = a.top - 6, x0 = a.x - 5, ext = armT < 9 ? Math.min(6, Math.floor(armT * 24 + 1e-6)) : 0, L = 10 + ext;
    for (let x = x0 - 1; x <= x0 + L; x++) { put(x, y - 1, 8); put(x, y + 1, 8); } put(x0 - 1, y, 8); put(x0 + L, y, 8);
    for (let x = x0; x < x0 + L; x++) put(x, y, x < x0 + 10 ? 36 : (x === x0 + L - 1 && armT < 0.3 ? 21 : 14));
    if (armT < 1.0 && (armT < 0.6 || (f12 & 1))) { const px = x0 + L + 2, py = y - 2 - Math.min(3, Math.floor(armT * 8)); put(px, py, 5); put(px - 1, py, 14); put(px + 1, py, 14); put(px, py - 1, 14); put(px, py + 1, 14); }
  }
  function drawArmor(f12) {                                          // 石鳞甲：在友军身上错位压一层石片（上亮下暗，一片 2 格），开头 0.1 s 闪一下
    if (armT >= 0.6) return; const a = ally(), fb = E.fb;
    for (let y = a.top - 4; y < HY; y++) for (let x = a.x - 7; x <= a.x + 7; x++) {
      const i = y * 128 + x; if (fb[i] < 5) continue; const col = x - a.x + 16, row = y + ((col / 3) | 0);
      if ((col % 3) === 0 && (row & 1) === 0) { put(x, y, armT < 0.1 ? ST[0] : ST[1]); if (fb[i + 128] >= 5 && y + 1 < HY) put(x, y + 1, ST[2]); }
    }
  }
  function drawFang(f12) {                                           // 翠石蛇牙：从假人脚下刺出，微微往回弯
    const k = Math.floor(fangT * 12 + 1e-6), H = [6, 12, 14, 14, 9, 4][k]; if (!H) return;
    for (let j = 0; j < H; j++) { const q = j / 14, w = q < 0.35 ? 2 : q < 0.7 ? 1 : 0, x = DUMMY_X - 3 - RD(q * q * 3), y = HY - 1 - j;
      for (let d = -w; d <= w; d++) put(x + d, y, j === H - 1 ? EL[0] : d === -w ? EL[1] : d === w ? EL[3] : EL[2]); if (w) put(x + w + 1, y, EL[4]); }
  }
  function fxBack(f12) {
    if (P.dq < 1 && !P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    const st = E.state;
    if (st === CHARGE || st === CAST || (st === RECOVER && E.stT < 0.35)) {   // 法阵里的蛇纹：一条正弦波沿椭圆慢转
      const sp = E.simT * 0.8, n = 56; for (let k = 0; k < n; k++) { if (st === RECOVER && ((k + f12) & 1)) continue; const th = sp + k / n * 6.2832, rr = 9 + Math.sin(k / n * 6.2832 * 5 + sp * 3) * 2; put(RD(HX + 1 + Math.cos(th) * rr), RD(HY + Math.sin(th) * rr * 0.22), (k % 7) === 0 ? EL[1] : EL[3]); }
    }
    if (snT >= SN_RISE && snT < SN_COIL) drawCoil(false, f12);
  }
  function fxMid(f12) { if (fangT < 0.5) drawFang(f12); }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {          // 双蛇杖首星芒
      const L = P.gem === 3 ? 6 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {          // 护符亮到 2 / 3 档：石板四角外一圈翠光点
      const ax = scrX(P.ax), ay = HY + P.ay, c = P.gem === 3 ? EL[0] : EL[1 + (f12 & 1)];
      put(ax - 2, ay - 2, c); put(ax - 2, ay + 3, c); put(ax - 3, ay, EL[2]); if (P.gem === 3) { put(ax + 2, ay - 2, c); put(ax - 4, ay, EL[3]); }
    }
    if (snT < SN_RISE) drawRise(f12); else if (snT < SN_COIL) drawCoil(true, f12);
    const st = E.state; if (st === CHARGE || st === CAST || st === RECOVER) { drawArmor(f12); drawHpBar(f12); }
  }

  return {
    name: '蛇神使者', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.glow], HIT_POINT: [1, -24], EVENTS,
    ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'dissolve', pal: 'earth', style: 'summon', w: 0.75, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
