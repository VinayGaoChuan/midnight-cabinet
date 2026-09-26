// 烈焰射手（部队 · 恶魔 · 射手 · 稀有）：幻影射手的最终形态，同一个人——脾气古怪，在强弱两种形态间切换。
// 同款头巾尾烧成一条燃烧的洋红缎带（8 格）、同款恶魔角长到 4 格向后掠（角尖烧红）、面具换成双面面具（白色笑脸 / 红色怒脸，发脾气时整张翻面）；
// 怒形态头发自下而上燃成一丛洋红焰发冠（高出头顶 5 格），弱形态熄灭只剩冒烟的短发；炭黑短皮衣；黑铁焰弦弓斜握 45°（弓弦是一线火焰）；腰侧箭筒的箭头燃着。
// 攻击 = 后跃半步回身斜握速射一支燃烧箭；技能 = 特性「发脾气」：发抖、面具翻成怒脸、头发一格格燃成发冠 → 狠狠一跺脚火浪炸开 → 0.08 s 间隔连射 3 支燃烧箭（幽灵尖叫的三向分裂）。
// 由「幻影射手」（FantasyShooter.js）升级而来（最终级）。
PCD.define('BlazingShooter', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_BURST, K_STILL, K_EMBER, K_DUST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, copySprite, blitShape, sfx } = E;
  const RD = Math.round;

  // ───── 元素：怒焰 · 洋红橙（自建 tantrum）；刀锋分裂仍用升级线的 wail ─────
  const R_EL = fxRamp('tantrum', ['#ffffff', '#ffd8b0', '#ff6a3a', '#d02a6a', '#4e0c2a']), EL = FXR[R_EL];
  const R_WL = fxRamp('wail', ['#ffffff', '#e2e4ff', '#9c9ed8', '#5c5c92', '#28283e']), WL = FXR[R_WL];

  // ───── 材质 ─────
  const T4 = [EL[4], EL[3], EL[2], EL[1]];
  const M = parts.mats(E, {
    coat: { r: [0, 8, 27, 28], band: 2 }, trim: 'crimson', belt: 'crimson', skin: ['#1a1624', '#3a3048', '#5e5070', '#8a7aa0'], boot: 'boot', legw: [0, 52, 53, 54],
    mask: 'white', red: 'crimson', ink: { r: 'ink', flat: 1 }, horn: 'iron', hornTip: 'crimson', hair: [0, 8, 9, 10], band: 'crimson', ribbon: 'crimson',
    bow: 'iron', shaft: 'wood', head: 'iron', quiver: 'leather',
    flame: { r: T4, flat: 1 }, fstr: { r: T4, flat: 1 },               // 焰发冠 / 焰弦 / 燃烧箭头（发光体）
  });
  const BODY = { body: 'standard', leg: 11, torso: 9, head: 7, headW: 5, waist: 1, stride: 4, lift: 2 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 54, 42, 48), ghost = new Sprite(88, 54, 42, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, rimAll: 0, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bow', 'shaft', 'head', 'mask', 'red', 'ink', 'flame', 'fstr', 'skin', 'hornTip', 'ribbon']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const BL = 10;                                                      // 半弓长（沿 45° 斜线）

  // ───── 姿势：前手 = 斜握弓把，后手 = 搭箭 / 拉弦；fire 焰发冠 0–5 格，face 0 笑脸 / 1 怒脸，flk 火焰闪烁相位 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, arw: 0, fire: 0, face: 0, flk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  const K_IDLE = K(7, -12, 3, -18);                                    // 生闷气：后手横抱在胸前，前手垂着斜提焰弦弓
  const K_HOP = K(10, -19, 3, -18, -1, 0, 1, 2);                       // 后跃半步、回身举弓
  const K_DRAW = K(10, -18, 1, -19, 0, 0, 1, 3);
  const K_LOOSE = K(10, -18, -3, -20, -1, 0, 1, 0);
  const K_HOLD = K(10, -18, -1, -18);
  const K_AIM = K(10, -18, 1, -19, 0, 0, 1, 3);
  const K_SHOT = K(11, -18, -3, -20, -1, 0, 2, 0);
  const K_HURT = K(4, -12, -3, -13, -1, -1, 1);
  const K_RAGE = K(6, -18, -2, -20, -1, -1, 1);                        // 死亡：最后一次发脾气
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['arw', 0, 1], ['fire', 0, 5], ['face', 0, 1], ['flk', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_LOOSE = 2 / 12, T_BURST = INCOMING + 0.55, T_S2 = 1 / 12, T_S3 = 2 / 12;
  const R0 = parts.rig({}, BODY);
  // 待机个性（1.2–2.2 s）：跺脚 → 面具翻成怒脸、发冠忽地燃起 → 又熄灭翻回笑脸（冒烟）
  const SULK = [[1, 0, 0], [0, 1, 2], [0, 1, 3], [0, 1, 2], [0, 1, 1], [0, 1, 2], [0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.arw = 0; P.fire = 0; P.face = 0; P.flk = f12 & 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.2 && lp < 2.2) { const c = SULK[Math.min(11, Math.floor((lp - 1.2) * 12 + 1e-6))]; P.wup = c[0]; P.face = c[1]; P.fire = c[2]; if (c[1] && c[2] >= 2) { P.crouch = 1; P.head = -1; } }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 气冲冲的大步踏：步子重，脚印留洋红余烬
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.face = 1;
      P.hx += P.step * 0.6; P.bhx -= P.step * 0.5;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 后跃半步 → 落地回身斜握速射
      P.face = 1; P.fire = 1;
      if (tq < 0.12) { setK(K_IDLE, K_HOP, ease.out(tq / 0.12)); P.bx = -2; P.lift = 2; P.arw = 1; P.pull = 2; P.beard = 2; P.sway = 1; }
      else if (tq < 0.2) { setK(K_LOOSE, K_LOOSE, 0); P.bx = -3; P.fire = 2; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { setK(K_LOOSE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = -3; P.beard = -1; P.bend = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(-3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 发脾气：身体发抖、面具翻成怒脸、头发自下而上一格格燃成发冠
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q); P.arw = 1; P.pull = tq < 0.2 ? 1 : tq < 0.4 ? 2 : 3;
      P.bx = tq > 0.3 ? ((f12 & 1) ? 1 : -1) : 0; P.face = tq > 0.35 ? 1 : (tq > 0.25 && (f12 & 1)) ? 1 : 0; P.fire = Math.min(5, Math.floor(clamp01((tq - 0.3) / 1.0) * 6 + 1e-6));
      P.beard = -RD(q * 2) + ((f12 & 1) ? 1 : 0); P.sway = (f12 & 1) ? -1 : 0; P.bend = 1 + RD(q * 2); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                          // 狠狠一跺脚 → 连射 3 支
      P.face = 1; P.fire = 5; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; P.bend = 3;
      const f = Math.floor(tq * 12 + 1e-6);
      if (f === 0) { setK(K_SHOT, K_SHOT, 0); P.crouch = 3; }
      else if (f <= 3) { setK(f & 1 ? K_SHOT : K_AIM, f & 1 ? K_SHOT : K_AIM, 0); P.arw = f & 1 ? 0 : 1; P.pull = f & 1 ? 0 : 3; }
      else { setK(K_SHOT, K_HOLD, ease.out(clamp01((tq - 4 / 12) / 0.15))); P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                       // 气还没消：发冠慢慢矮下去
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.face = 1; P.fire = 5 - RD(q * 2); P.beard = -RD(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.face = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.fire = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.face = 1; P.beard = 1; P.rim = 0; P.fire = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 爆裂：最后一次发脾气——全身一亮炸开，只剩双面面具烧着落地
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.face = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.fire = 1; }
      else if (d < T_BURST - INCOMING) { setK(K_RAGE, K_RAGE, 0); P.bx = -2 + ((f12 & 1) ? 1 : -1); P.face = 1; P.fire = 5; P.rim = 3; P.gem = 3; P.beard = -2; P.bend = 3; }
      else { setK(K_RAGE, K_RAGE, 0); P.bx = -2; P.face = 1; P.fire = 5; P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.fire = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    if (P.fire > 0) { const cr = Math.min(3, P.crouch); P.gx = R0.hx + P.lean + P.head + P.bx; P.gy = R0.htop - 1 - Math.ceil(P.fire / 2) + P.bob + cr; }   // 发光体 = 焰发冠（熄灭时 = 焰弦中点）
    else { const s = stringMid(); P.gx = s[0] + P.bx; P.gy = s[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 45° 焰弦弓的几何：沿 u = (1, −1)/√2 伸展，弓腹朝前（n = (1, 1)/√2），两端 2 格反曲 ─────
  const U = [Math.SQRT1_2, -Math.SQRT1_2], N = [Math.SQRT1_2, Math.SQRT1_2];
  function limbPt(s, pull) { const q = s / BL, a = Math.abs(s), b = -(1.4 + pull * 0.6) * q * q + (a >= BL - 1 ? (a - BL + 2) * 0.9 : 0); return [P.hx + s * U[0] + b * N[0] + 0.5, P.hy + s * U[1] + b * N[1]]; }
  function stringMid() { const a = limbPt(-BL + 1, 0), b = limbPt(BL - 1, 0); return [RD((a[0] + b[0]) / 2) - 1, RD((a[1] + b[1]) / 2)]; }

  // ───── 画（部件从后往前）─────
  // 候选部件：burningRibbon —— 头巾尾烧成的洋红缎带（8 格），尾梢 2 格燃着、逐帧闪
  function ribbon(R, len) {
    E.part(); const b = P.beard || 0, x0 = R.hx0 - 1, y0 = R.htop + 2, L = len + (b < 0 ? -b : 0);
    for (let k = 0; k <= L; k++) { const q = k / L, x = x0 - k, y = y0 + RD(k * 0.35 + q * q * (b < 0 ? 0.6 + b * 0.4 : 2 - b)) + (k === L && (P.sway || 0) > 0 ? 1 : 0), burn = k >= L - 1; parts.px(E, R, x, y, burn ? M.flame : M.ribbon, burn ? ((k + P.flk) & 1 ? 3 : 2) : k & 1 ? 2 : 0); if (k < 2) parts.px(E, R, x, y + 1, M.ribbon, 0); }
    parts.px(E, R, x0 - L - 1, y0 + 2 - (P.flk ? 1 : 0), M.flame, 4);
  }
  // 候选部件：hipQuiver（同升级线），箭头朝上、燃着
  function hipQuiver(R) {
    const e = parts.edges(R, R.yWaist + 1), x0 = e[0] + 3, y0 = R.yHip;
    E.part();
    parts.bar(13, x0, y0, 0, 6, 3, (k, j, X, Y) => parts.px(E, R, X, Y, M.quiver, k === 6 ? 4 : j === 0 ? 4 : j === 2 ? 2 : 0));
    const c = parts.cell(13, x0, y0, 7); E.part();
    for (let i = 0; i < 3; i++) { const ax = c[0] - i, ay = c[1] + i * 2 - 2; parts.px(E, R, ax, ay, M.shaft, 3); parts.px(E, R, ax - 1, ay, M.head, 3); parts.px(E, R, ax - 2, ay - (i === 1 ? 0 : 1), M.flame, (i + P.flk) & 1 ? 3 : 2); }
  }
  // 候选部件：demonHorns（同升级线）——长到 4 格向后掠，角尖 2 格烧红
  function horns(R, len) {
    E.part(); const top = R.htop;
    for (const [bx, far] of [[R.hx0 + 1, 1], [R.hx1 - 1, 0]]) {
      parts.px(E, R, bx, top, far ? M.hornD : M.horn, 0);
      for (let k = 1; k <= len; k++) { const tip = k >= len - 1, m = tip ? (far ? M.hornTipD : M.hornTip) : far ? M.hornD : M.horn; parts.px(E, R, bx - k, top - RD(k * 0.6) , m, k === len ? 4 : 0); if (k < 2) parts.px(E, R, bx - k, top - RD(k * 0.6) + 1, m, 2); }
    }
  }
  // 候选部件：twoFaceMask —— 双面面具（前半 = 当前朝外的那一面）：face 0 白色笑脸（上弯的嘴、眯眼），1 红色怒脸（倒八眉、獠牙）；和脸、短发、额带同一部件
  function headAndMask(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey, bot = R.hy, ex = x1 - 1, angry = P.face === 1, F = angry ? M.red : M.mask, B = angry ? M.mask : M.red;
    parts.run(E, R, top - 1, x0, x1 - 1, M.hair, 0); parts.run(E, R, top, x0 - 1, x1, M.hair, 0);                   // 短发（弱形态冒烟）
    for (let y = top + 1; y <= bot; y++) parts.run(E, R, y, x0 - 1, x0, M.hair, 0);
    parts.px(E, R, x0 + 1, top - 1, M.hair, 4); parts.px(E, R, x0 + 3, top, M.hair, 4); parts.px(E, R, x0 - 1, bot + 1, M.hair, 2);
    parts.run(E, R, top + 1, x0 - 1, x1, M.band, 0);                                                                  // 额带（缎带的根）
    for (let y = top + 2; y <= bot; y++) { parts.run(E, R, y, x0 + 1, x0 + 2, B, 0); parts.run(E, R, y, x0 + 3, x1 + (y === ey + 1 ? 1 : 0), F, 0); }
    parts.px(E, R, x1 + 1, ey + 1, F, 4);
    if (angry) {
      parts.px(E, R, ex - 1, ey - 1, M.ink, 1); parts.px(E, R, ex, ey, M.ink, 1); parts.px(E, R, x1, ey - 1, F, 4);    // 倒八眉 + 怒目
      parts.px(E, R, ex, bot, M.ink, 1); parts.px(E, R, x1, bot, M.mask, 4); parts.px(E, R, ex, bot - 1, M.mask, 4);   // 咧开的嘴 + 獠牙
    } else {
      if (P.eyes) parts.px(E, R, ex, ey, M.ink, 1); else { parts.px(E, R, ex - 1, ey, M.ink, 1); parts.px(E, R, ex, ey - 1, M.ink, 1); parts.px(E, R, ex + 1, ey, M.ink, 1); }   // 眯眼 ︶
      parts.px(E, R, ex - 1, bot - 1, M.ink, 1); parts.px(E, R, ex, bot, M.ink, 1); parts.px(E, R, x1, bot - 1, M.ink, 1);     // 上弯的笑嘴
      parts.px(E, R, ex - 2, ey + 1, M.red, 3);
    }
  }
  // 候选部件：flameCrown —— 头发自下而上燃成的一丛洋红焰（fire 0–5 格高，逐帧闪），伸出头顶轮廓
  const TONGUE = [0.45, 0.8, 1.0, 0.65, 0.95, 0.55, 0.35];                // 7 列焰舌的相对高度（前低后高、三股焰尖）
  function flameCrown(R) {
    if (P.fire <= 0) return;
    E.part(); const x0 = R.hx0 - 1, top = R.htop, n = P.fire + 1;
    for (let i = 0; i < TONGUE.length; i++) {
      const h = Math.max(1, RD(n * TONGUE[i] + (((i + P.flk) & 1) ? 0.6 : -0.2))), x = x0 + i;
      for (let k = 0; k < h; k++) {
        const y = top - k, lean = RD(k * k * 0.08);                   // 焰尖往后飘
        const tone = k >= h - 1 ? 2 : k >= h - 2 ? 3 : (i >= 2 && i <= 4 && k < 2) ? 4 : 3;
        parts.px(E, R, x - lean, y, M.flame, tone);
      }
    }
    if (P.fire >= 3) parts.px(E, R, x0 + 2 - RD(n * n * 0.08), top - n - P.flk, M.flame, 2);   // 跳出去的火星
  }
  // 候选部件：slantBow —— 斜握 45° 的黑铁反曲弓，弓弦是一线火焰（发光体），燃烧箭
  function slantBow(R) {
    const pull = P.pull; E.part(); let lx = null, ly = null;
    for (let s = -BL; s <= BL; s++) {
      const p = limbPt(s, pull), x = RD(p[0]), y = RD(p[1]), a = Math.abs(s);
      if (lx !== null) parts.line(E, R, lx, ly, x, y, M.bow, a <= 1 ? 3 : a === BL ? 4 : 0); else parts.px(E, R, x, y, M.bow, 4);
      if (a <= 2) parts.px(E, R, x + 1, y + 1, M.bow, 2); lx = x; ly = y;
    }
    const a = limbPt(-BL + 1, pull), b = limbPt(BL - 1, pull), ax = RD(a[0]) - 1, ay = RD(a[1]), bx = RD(b[0]) - 1, by = RD(b[1]), lv = P.gem >= 3 ? 4 : P.gem >= 1 ? 3 : 2;
    if (pull) { parts.line(E, R, ax, ay, P.bhx, P.bhy, M.fstr, lv); parts.line(E, R, P.bhx, P.bhy, bx, by, M.fstr, lv); }
    else parts.line(E, R, ax, ay, bx, by, M.fstr, lv);
    if (P.arw && pull) {
      E.part(); const y = P.bhy, x0 = P.bhx, x1 = P.hx + 5;
      parts.run(E, R, y, x0 + 1, x1, M.shaft, 3); parts.px(E, R, x0 + 1, y - 1, M.ribbon, 4); parts.px(E, R, x0 + 1, y + 1, M.ribbon, 2);
      parts.px(E, R, x1 + 1, y, M.head, 4); parts.px(E, R, x1 + 2, y, M.flame, 4); parts.px(E, R, x1 + 1, y - 1, M.flame, P.flk ? 3 : 2); parts.px(E, R, x1, y - 1 - P.flk, M.flame, 2);
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    ribbon(R, 8);
    hipQuiver(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.coatD, cuff: M.trimD, cuffStyle: 'band', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.legw, matD: M.legwD, boot: M.boot, bootD: M.bootD, bootH: 5 });
    parts.torso(E, R, P, { style: 'leather', mat: M.coat, trim: M.trim, belt: M.belt, buckle: M.hornTip, studs: M.trim });
    horns(R, 4);
    parts.head(E, R, P, { mat: M.skin, face: 'long', age: 'young', eye: M.ink, nose: 'small', mouth: 'none', ear: 'none' });
    headAndMask(R);
    flameCrown(R);
    if (!P.pull) parts.hand(E, R, P, { side: 'B', hand: M.skin });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.coat, cuff: M.trim, cuffStyle: 'band', hand: M.skin, grip: 'none' });
    slantBow(R);
    parts.hand(E, R, P, { hand: M.skin });
    if (P.pull) parts.hand(E, R, P, { side: 'B', hand: M.skin });
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy;
    RIM.rimAll = P.st === DEATH && P.rim === 3 ? 1 : 0; RIM.rimR = RIM.rimAll ? [0, 20, 26, 32] : [0, 6, 11, 15]; if (RIM.rimAll) RIM.ry = hero.oy - 16;
    bake(hero, RIM);
  }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, lastStep = 0, smokeAcc = 0, circAcc = 0, ghT = 9, ghX = 0, mkT = 9, mkX = 0, mkY = 0, mkVX = 0, mkVY = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const TGT = [HY - 15, HY - 26, HY - 6];                              // 三支燃烧箭：中 / 上 / 下（幽灵尖叫三向分裂）
  function fire3(i) {                                                   // 连射一支燃烧箭（带 1 帧残影）
    const gx = wx(K_SHOT.hx + 6), gy = wy(K_SHOT.hy + 2), dist = DUMMY_X - 3 - gx;
    shoot(2, gx + 1, gy, 250, DUMMY_X - 3, R_EL, (TGT[i] - gy) * 250 / Math.max(10, dist), { trail: { every: 1, life: [0.1, 0.25], back: [10, 30], off: 3 }, glow: i ? -1 : 2 });
    mzT = 0; mzX = gx; mzY = gy; copySprite(ghost, hero); ghT = 0; ghX = HX + P.mx - 2; sfx('shoot', { proj: 'fire' });
  }
  function onEnter(s) {
    if (s === CHARGE) { fx.circle(HX + 1, HY, 10, 3, R_EL, 0.5, 1); circAcc = 0; }
    if (s !== CAST) return;                                            // 狠狠一跺脚：洋红火浪环向外炸开 + 双向火浪，紧接第一支燃烧箭
    releaseOrbit(40, 100, 0.25, 0.55); ring(HX + 1, HY - 1, 1, R_EL); fx.wave(HX + 4, HY, 1, 22, 5, R_EL, 0.5, 2); fx.wave(HX - 2, HY, -1, 20, 5, R_EL, 0.5, 0);
    for (let i = 0; i < 10; i++) spawn(K_BURST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 0.3 + Math.random() * 0.3, R_EL);
    shake(0.28, 2); flash(0.05); fire3(0);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {
      const gx = wx(K_LOOSE.hx + 5), gy = wy(K_LOOSE.hy - 1 + 1); mzT = 0; mzX = gx; mzY = gy;
      shoot(1, gx + 1, gy, 240, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.06, 0.16], back: [8, 22] } });
      sfx('swing', { kind: 'bow', w: 0.3 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && Math.abs(t - T_S2) < 1e-9) fire3(1);
    if (s === CAST && Math.abs(t - T_S3) < 1e-9) fire3(2);
    if (s === DEATH && Math.abs(t - T_BURST) < 1e-9) {                 // 全身一亮炸开，双面面具烧着落地
      poseAt(DEATH, T_BURST - 1 / 12, T_BURST - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      const hx = HX + R0.hx - 2, hy = HY + R0.ey;
      death.start('burst', { chunk: 3, power: 1.5, fromX: 2, fromY: -16, fadeAt: 0.8, ramp: R_EL });
      burst(HX, HY - 16, 36, 50, 150, 0.3, 0.8, R_EL, 10); ring(HX, HY - 14, 1, R_EL); flash(0.06); shake(0.2, 2);
      mkT = 0; mkX = hx; mkY = hy; mkVX = -8; mkVY = -40;
    }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [T_S2, T_S3], [], [], [T_BURST], []];
  const deathKit = { mode: 'burst', at: T_BURST };
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 30, 80, 0.12, 0.35, R_EL, 8); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.3 }); return; }
    if (k !== 2) return;                                               // 每支：落点爆一团洋红焰 + 一道灰紫刀锋十字，目标被点燃
    burst(x, y, 16, 40, 110, 0.2, 0.5, R_EL, 10); fx.cross(x, y, 6, R_WL, 0.25); fx.slash(x - 5, y + 5, 8, 0.1, 1.5, R_WL, 0.25, 2, 2);
    fx.cloud(x, y - 2, 4, R_EL, 0.4, 2);
    if (Math.abs(y - (HY - 15)) < 3) { hitDummy(1); shake(0.12, 1); dummyFx({ dur: 1.3, tint: 'tantrum' }); } else hitDummy(0);
    sfx('impact', { pal: 'fire', w: 0.4 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                            // 脚下焰圈越跳越快
      circAcc += dt; const every = 0.45 - 0.3 * clamp01(stT / DUR[CHARGE]);
      if (circAcc >= every) { circAcc = 0; fx.circle(HX + 1, HY, 8 + 4 * clamp01(stT / DUR[CHARGE]), 3, R_EL, every + 0.1, 1); }
      if (Math.random() < dt * 30) spawn(K_EMBER, gx + (Math.random() - 0.5) * 6, gy, (Math.random() - 0.5) * 8, -12 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL);
    }
    if ((state === IDLE || state === REVIVE) && P.fire === 0 && P.dq < 1) {   // 弱形态：头发冒烟
      smokeAcc += dt * 3; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, wx(R0.hx - 1) + Math.random() * 2, wy(R0.htop - 2 + P.bob), (Math.random() - 0.5) * 4, -6 - Math.random() * 4, 0.9, FXI.dust); }
    }
    if (P.fire >= 2 && state !== CHARGE && P.dq < 1 && Math.random() < dt * 8) spawn(K_EMBER, gx, gy - 1, (Math.random() - 0.5) * 6, -10 - Math.random() * 6, 0.5, R_EL);
    if (state === IDLE) { const lp = q12(stT) % DUR[IDLE]; if (P.wup === 0 && lastStep === 9 && lp >= 1.2 && lp < 1.3) { spawn(K_STILL, wx(3), HY - 1, 0, 0, 0.3, R_EL); spawn(K_BURST, wx(3), HY - 1, 16, -12, 0.25, R_EL); } lastStep = P.wup === 1 ? 9 : 0; }
    else if (state === MOVE && P.step !== lastStep) {                  // 大步踏：落脚重、每个脚印留 1 格洋红余烬 0.3 s
      if (P.step !== 0) { sfx('step', { w: 0.45 }); const fx0 = wx(P.step > 0 ? 5 : -5); spawn(K_STILL, fx0, HY - 1, 0, 0, 0.3, R_EL); spawn(K_DUST, fx0, HY, (Math.random() - 0.5) * 14, -4, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    mzT += dt; ghT += dt;
    if (mkT < 2.6) { mkT += dt; mkVY += 160 * dt; mkX += mkVX * dt; mkY += mkVY * dt; if (mkY >= HY - 1) { mkY = HY - 1; mkVY = -mkVY * 0.3; mkVX *= 0.4; } if (mkT < 1.8 && Math.random() < dt * 14) spawn(K_EMBER, mkX, mkY - 3, (Math.random() - 0.5) * 6, -10, 0.4, R_EL); }
  }
  function fxReset() { mzT = 9; lastStep = 0; smokeAcc = 0; circAcc = 0; ghT = 9; mkT = 9; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {
    if (ghT < 1 / 12) blitShape(ghost, ghX, HY, 0, EL[3], 0.3);        // 连射的 1 帧残影
    if (mkT < 2.6) {                                                   // 烧着落地的双面面具：左半白笑脸、右半红怒脸，焰苗一格格矮下去熄灭
      const x = RD(mkX), y = RD(mkY), fade = clamp01((mkT - 2.0) / 0.6);
      for (let j = -3; j <= 0; j++) for (let i = -2; i <= 2; i++) { if ((Math.abs(i) === 2 && (j === -3 || j === 0)) || hash(i + x, j + f12) < fade) continue; put(x + i, y + j, i < 0 ? (j === -3 ? 21 : 17) : (j === -3 ? 26 : 13)); }
      put(x - 1, y - 2, 0); put(x + 1, y - 2, 0); put(x, y - 1, 11);
      const h = Math.max(0, RD(4 * (1 - clamp01((mkT - 0.4) / 1.4)))); for (let k = 1; k <= h; k++) { put(x + ((k + f12) & 1 ? 0 : 1) - 1, y - 3 - k, k === h ? EL[1] : EL[2]); if (k < h) put(x + 1, y - 3 - k, EL[3]); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx, gy - r - 1, c); put(gx + r, gy - 1, c); put(gx - r, gy - 1, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d, f12) {
    if (k !== 1 && k !== 2) return false;                              // 燃烧箭：焰头 + 铁箭头 + 木杆 + 洋红缎羽；技能箭的焰头更大
    put(x + d, y, EL[0]); put(x, y, 29); for (let i = 1; i <= 3; i++) put(x - i * d, y, 19); put(x - 3 * d, y - 1, 13); put(x - 4 * d, y - 1, 12);
    put(x, y - 1, (f12 & 1) ? EL[1] : EL[2]); put(x - d, y - 1 - (f12 & 1), EL[3]);
    if (k === 2) { put(x + 2 * d, y, EL[1]); put(x + d, y - 1, EL[1]); put(x + d, y + 1, EL[2]); put(x - d, y + 1, EL[2]); put(x - 2 * d, y - 2, EL[3]); }
    return true;
  }

  return {
    name: '烈焰射手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.flame, M.fstr], HIT_POINT: [1, -15], EVENTS, deathKit,
    SFX: { body: 'flesh', how: 'explode', pal: 'fire', style: 'buff', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
