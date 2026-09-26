// 精英猎手（部队 · 人类 · 射手 · 优质）：瘦高的年轻猎人——尖角后垂的林绿兜帽、锯齿下摆的及腰短斗篷、背后斜背的一把绿羽箭、比人还长的木长弓。
// 攻击 = 满弓三箭扇形齐射（头 / 胸 / 脚边）；技能 = 特性「多重射击」：单膝半跪、斜弓逐支搭上三箭蓄满，一箭离弦后在半空一分为三，同时钉进目标和它身边。
// 升级为暗夜射手（chars/NightArcher.js），两级共用：尖角兜帽、绿色系、绿羽箭、瘦长身形。
PCD.define('EliteHunter', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：刀锋 · 翠羽（白 → 嫩黄绿 → 叶绿 → 林绿 → 墨绿）= 共享色阶 nature ─────
  const R_EL = FXI.nature, EL = FXR[R_EL];

  // ───── 材质（全部取自共享色板）─────
  const M = parts.mats(E, {
    cloak: { r: 'green', band: 2 }, hood: 'green', sleeve: 'green', leather: 'leather', strap: 'boot', pants: 'stone', boot: 'boot',
    skin: 'skin', brow: 'wood', ink: { r: 'ink', flat: 1 }, wood: 'wood', bone: 'bone', string: [8, 18, 17, 21], steel: 'steel',
    fletch: [35, 37, 38, 21], tip: { r: [36, 37, 38, 21], flat: 1 },
  });
  const BODY = { body: 'slim', leg: 10, torso: 8, head: 6, headW: 5, sw: 3, lw: 2, stride: 4, lift: 2, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const HX = 34, DUR = DEFAULT_DUR.slice(), BOW_L = 14, ARROW = 12;
  const hero = new Sprite(86, 56, 43, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'bone', 'string', 'skin', 'ink', 'tip', 'fletch', 'brow', 'steel', 'strap']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握弓（hx hy，弓的倾角 a），后手（bhx bhy）拉弦 / 抽箭 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, nx: 0, ny: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, sq: 0, flash: 0, lying: 0, lift: 0, pull: 0, nArr: 0, fan: 0, hold: 0, vib: 0,
    bowOff: 0, bowX: 0, bowY: 0, bowR: 0, spill: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  // 关键帧用「站姿坐标」写：跪 / 蹲时身体下沉多少，poseAt 末尾统一给手加上多少
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const QA = Math.PI / 4;
  const K_IDLE = K(9, -14, 0, -2, -9, 1);                        // 长弓竖在身前，上梢高过兜帽、下梢点地
  const K_REACH = K(9, -15, 0, -6, -19, 0);                      // 攻击预兆 1：后手伸到肩后箭袋口，弓举到肩高
  const K_DRAW = K(10, -16, 0, 2, -17, 0);                       // 预兆 2：满弓，弦拉到下巴
  const K_LOOSE = K(10, -16, 0, -3, -18, 0);                     // 出手：松弦，后手向后甩开
  const K_HURT = K(5, -13, -0.2, -4, -11, -1, -1);
  const K_STAG = K(4, -15, -0.35, -5, -14, -1, -1);              // 踉跄后仰
  const K_KNEEL = K(13, -16, QA, 3, -18, 1, 0, 4);               // 技能：单膝半跪、弓向前斜放 45°
  const K_KREACH = K(13, -16, QA, -6, -19, 1, 0, 4);             // 跪姿抽箭
  const K_KLOOSE = K(13, -16, QA, -3, -19, 1, 0, 4);             // 跪姿松弦
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 31], ['hy', -40, 4], ['ai', -16, 16], ['bhx', -20, 31], ['bhy', -40, 4], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['sq', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['pull', 0, 3], ['nArr', 0, 3], ['fan', 0, 4], ['hold', 0, 2], ['vib', -1, 1],
    ['bowOff', 0, 1], ['bowX', -30, 40], ['bowY', -46, 4], ['bowR', 0, 3], ['spill', 0, 2], ['dqi', 0, 48], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], NOCK = [0, 5, 7, 8], OFF = [0, -1, 1];
  const T_REL = 3 / 12, T_LAND = INCOMING + 0.66;
  const DROP = (cr) => (cr >= 4 ? 4 : Math.min(3, cr));
  // 待机个性「验箭」（1.4–2.0 s，每帧一格）：后手位置、手里的箭（1 斜拿 · 2 横在眼前）、眯眼
  const CHECK = [[-6, -19, 0, 0], [-3, -23, 1, 0], [8, -22, 2, 1], [8, -22, 2, 1], [5, -22, 2, 1], [-3, -23, 1, 0], [-6, -19, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.sq = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.pull = 0; P.nArr = 0; P.fan = 3; P.hold = 0; P.vib = 0; P.bowOff = 0; P.bowX = 0; P.bowY = 0; P.bowR = 0; P.spill = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.4 - 1e-6 && lp < 2.0 - 1e-6) { const c = CHECK[CL(Math.floor((lp - 1.4) * 12 + 1e-6), 0, 6)]; P.bhx = c[0]; P.bhy = c[1]; P.hold = c[2]; P.sq = c[3]; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 猫腰潜行：前倾、膝微屈，长弓随步点头，落脚无声
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.crouch = 1; P.lean = 1; P.hy -= 2;
      P.hx += P.step * 0.6; P.a = P.step * ASTEP; P.bhx -= P.step * 1.5; P.beard = -P.beard * 2;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const f = Math.floor(tq * 12 + 1e-6);
      if (f === 0) setK(K_IDLE, K_REACH, 0.5);
      else if (f === 1) { setK(K_REACH, K_REACH, 0); P.beard = 1; }
      else if (f === 2) { setK(K_DRAW, K_DRAW, 0); P.pull = 3; P.nArr = 3; P.gem = 1; P.beard = 1; P.bend = 1; }
      else if (f === 3) { setK(K_LOOSE, K_LOOSE, 0); P.vib = 1; P.bend = 3; P.beard = -2; P.sway = -1; }
      else if (f === 4) { setK(K_LOOSE, K_LOOSE, 0); P.vib = -1; P.bend = 2; P.beard = -1; }
      else if (f === 5) { setK(K_LOOSE, K_LOOSE, 0); P.bend = 2; }
      else { const q = ease.inOut(clamp01((tq - 6 / 12) / 0.25)); setK(K_LOOSE, K_IDLE, q); P.bend = q < 0.5 ? 2 : 1; }
    } else if (st === CHARGE) {                                      // 跪下斜弓 → 三拍抽箭搭弦 → 拉满
      P.fan = 4;
      if (tq < 0.3) { const q = ease.inOut(tq / 0.3); setK(K_IDLE, K_KNEEL, q); P.bend = 1 + RD(q); }
      else if (tq < 0.9) {
        const k = CL(Math.floor((tq - 0.3) / 0.2 + 1e-6), 0, 2), ph = tq - 0.3 - k * 0.2;
        if (ph < 1 / 12 - 1e-6) { setK(K_KREACH, K_KREACH, 0); P.nArr = k; }
        else { setK(K_KNEEL, K_KNEEL, 0); P.nArr = k + 1; P.pull = 1; }
        P.gem = P.nArr ? 1 : 0; P.bend = 2; P.beard = -1;
      } else if (tq < 1.0) { setK(K_KNEEL, K_KNEEL, 0); P.nArr = 3; P.pull = 2; P.gem = 1; P.bend = 2; P.beard = -1; }
      else { setK(K_KNEEL, K_KNEEL, 0); P.nArr = 3; P.pull = 3; P.gem = (f12 & 1) ? 2 : 1; P.bend = 3; P.rim = 1; P.beard = (f12 & 1) ? -2 : -1; P.sway = (f12 & 1) ? -2 : -1; }
    } else if (st === CAST) {                                        // 松弦：三支箭并成一道光飞出，弦抖 2 帧
      setK(K_KLOOSE, K_KLOOSE, 0); P.fan = 4; P.bend = 3; P.beard = -2; P.sway = -1;
      if (tq < 2 / 12 - 1e-6) { P.vib = f12of(tq) === 0 ? 1 : -1; P.rim = 2; }
    } else if (st === RECOVER) {                                     // 起身，弓收回竖握
      const q = ease.inOut(clamp01(tq / 0.55)); setK(K_KLOOSE, K_IDLE, q); P.bend = RD(3 - q * 2); P.beard = -RD(1 - q); P.sway = q < 0.5 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.bend = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 仰倒撒箭
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.15) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.5) {                                            // 踉跄两步：每步退 1 格、换脚，上身后仰
        const k = d < 0.3 ? 0 : 1; setK(K_STAG, K_STAG, 0); P.bx = -3 - k; P.step = k ? 1 : -1; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0;
        if (d >= 0.42) { P.crouch = 2; P.step = 0; }
      } else {
        P.lying = 1; P.bx = -4; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lean = 0; P.head = 0; P.crouch = 0; P.bend = 0;
        P.hx = R0.sFx + 4; P.hy = R0.yS + 1; P.bhx = R0.sBx - 1; P.bhy = R0.yWaist; P.a = 0;
        P.spill = d < 0.66 ? 0 : d < 0.75 ? 1 : 2;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0.15) {                                               // 长弓脱手：竖着弹起、每帧翻 90°、落在脚边
        const bt = d - 0.15, land = 0.55; P.bowOff = 1;
        if (bt < land) { P.bowX = 5 + 22 * bt; P.bowY = -14 - 50 * bt + 134 * bt * bt; P.bowR = Math.floor(bt * 10 + 1e-6) & 3; }
        else { P.bowX = 5 + 22 * land; P.bowY = -1; P.bowR = 1; }
        P.bowX = RD(P.bowX - P.bx); P.bowY = RD(P.bowY);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const drop = P.lying ? 0 : P.bob + DROP(RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + drop; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + drop;
    P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.pull) { P.bhx = P.hx - NOCK[P.pull]; P.bhy = P.hy - 1; }
    P.nx = P.pull ? P.bhx : RD(P.hx - 2.2 * Math.cos(P.a)); P.ny = P.pull ? P.bhy : RD(P.hy - 2.2 * Math.sin(P.a));
    if (P.nArr && !P.lying) { P.gx = P.nx + ARROW + P.bx; P.gy = P.ny; }
    else if (P.bowOff) { P.gx = P.bowX + P.bx; P.gy = P.bowY; }
    else { P.gx = P.hx + 1 + P.bx; P.gy = P.hy - 1; }
    P.dqi = RD(P.dq * 48);
    KEY(P);
  }

  // ───── 画 ─────
  const BOWM = { wood: M.wood, tip: M.bone, grip: M.leather, string: M.string };
  // 候选部件：longbow 长弓（parts.bow 只能竖放、弯度小）：任意倾角 + 骨白包梢 + 握把缠皮加厚 + 按拉弦档弯成 D 形 + 松弦后弦抖。
  // o = { T 落笔变换（rig 或 parts.FREE）, at: [x, y] 握点, a 倾角（0 竖直，正 = 上梢朝前）, len 半弓长, pull 0–3, nock: [x, y] 拉弦点, vib -1..1 弦抖, wood, tip, grip, string }
  // 一个部件（弓臂和弦之间不压分界线）：弓臂按抛物线 u = -弯度 × (r / len)² 画，中段 2 格粗，梢头回勾 1 格（反曲）；弦挂在离梢 1 格处，先画弦、再画弓臂。
  function longbow(o) {
    const T = o.T, L = o.len, pull = o.pull || 0, ca = Math.cos(o.a || 0), sa = Math.sin(o.a || 0), gx = o.at[0], gy = o.at[1], bend = 3.4 + pull * 1.0;
    const W = (u, v) => [gx + u * ca - v * sa, gy + u * sa + v * ca], U = (r) => -bend * (r / L) * (r / L) + (Math.abs(r) === L ? 1 : 0);
    E.part();
    const tA = W(U(L - 1), -(L - 1)), tB = W(U(L - 1), L - 1), s = o.string;
    if (pull && o.nock) { parts.line(E, T, tA[0], tA[1], o.nock[0], o.nock[1], s, 2); parts.line(E, T, o.nock[0], o.nock[1], tB[0], tB[1], s, 2); }
    else if (o.vib) { const m = W(U(L - 1) - 1.4 * o.vib, 0); parts.line(E, T, tA[0], tA[1], m[0], m[1], s, 2); parts.line(E, T, m[0], m[1], tB[0], tB[1], s, 2); }
    else parts.line(E, T, tA[0], tA[1], tB[0], tB[1], s, 2);
    let pv = null;
    for (let r = -L; r <= L; r++) {
      const p = W(U(r), r), ar = Math.abs(r), tip = ar >= L - 1, grip = ar <= 1;
      const m = tip ? o.tip : grip ? o.grip : o.wood, t = tip ? (ar === L ? 4 : 3) : grip ? 3 : (r < 0 ? 4 : 3);
      if (pv) parts.line(E, T, pv[0], pv[1], p[0], p[1], m, t); else parts.px(E, T, p[0], p[1], m, t);
      pv = p;
    }
    for (let r = -6; r <= 6; r++) { const p = W(U(r) + 1, r), ar = Math.abs(r); parts.px(E, T, p[0], p[1], ar <= 1 ? o.grip : o.wood, ar <= 1 ? 2 : ar <= 4 ? 2 : 1); }   // 中段加厚（握把缠皮）
    return { top: tA, bot: tB };
  }
  // 箭头的发光档（0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）→ [箭头, 箭头后一格] 的色调
  const TIP = [[3, 2], [3, 3], [4, 3], [4, 4], [2, 1]];
  // 弦上的箭（扇形）：从搭箭点往前 ARROW 格，箭尾 2 格绿羽 + 1 格羽片、木杆、2 格发光箭头
  function nocked(R, n, nx, ny, fan, lv) {
    E.part();
    for (let i = 0; i < n; i++) {
      const y0 = ny + OFF[i] * 2, hy = ny + OFF[i] * fan;
      for (let k = 1; k <= ARROW; k++) {
        const x = nx + k, y = RD(y0 + (hy - y0) * k / ARROW);
        if (k <= 2) parts.px(E, R, x, y, M.fletch, k === 1 ? 4 : 3);
        else if (k >= ARROW - 1) parts.px(E, R, x, y, M.tip, TIP[lv][k === ARROW ? 0 : 1]);
        else parts.px(E, R, x, y, M.bone, i ? 3 : 4);
      }
      if (!i) { parts.px(E, R, nx + 2, ny - 1, M.fletch, 2); parts.px(E, R, nx + 3, ny - 1, M.fletch, 3); }   // 中间那支的羽片
    }
  }
  // 手里的一支箭：1 = 顺着箭袋斜拿（抽出 / 插回）· 2 = 横在眼前（箭尾靠眼、箭头朝前）
  function heldArrow(R, mode) {
    E.part();
    if (mode === 2) {
      const y = -22 + P.bob;
      for (let x = 4; x <= 4 + ARROW; x++) { const k = x - 4; parts.px(E, R, x, y, k <= 1 ? M.fletch : k >= ARROW - 1 ? M.tip : M.bone, k === 0 ? 4 : k === 1 ? 3 : k >= ARROW - 1 ? (k === ARROW ? 3 : 2) : 4); }
      parts.px(E, R, 5, y - 1, M.fletch, 2);
    } else {
      for (let k = -1; k <= 9; k++) { const p = parts.cell(7, P.bhx, P.bhy, k); parts.px(E, R, p[0], p[1], k <= 0 ? M.fletch : k >= 8 ? M.tip : M.bone, k === -1 ? 4 : k === 0 ? 3 : k >= 8 ? 2 : 3); }
    }
  }
  // 候选部件：sawCape 锯齿下摆的及腰短斗篷（猎人自己裁的布：下摆每 3 格一个 2 格长尖 + 一个 1 格短尖）。
  // o = { mat（band 2）, len 下摆在胯下几行, flare 后飘宽度 }；读 P.sway（下摆摆）P.bend（被风吹向后 0–3）。一个部件，最先画
  function sawCape(R, o) {
    const m = o.mat, sway = P.sway || 0, bend = P.bend || 0, top = R.yS - 1, bot = Math.min(-2, R.yHip + (o.len || 1)), n = Math.max(1, bot - top), fl = (o.flare != null ? o.flare : 3.5) * (R.lie ? 0.3 : 1);
    E.part();
    let L = 0, Rr = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, CL(y, R.yS, R.yHip));
      L = RD(e[0] - fl * Math.pow(t, 1.2) + sway * t * t - bend * t * 1.2); Rr = e[0] + 3;
      parts.run(E, R, y, L, Rr, m, 0);
      if (t > 0.35 && y < bot) parts.px(E, R, L + 2, y, m, 2);   // 一道竖褶
    }
    for (let x = L; x <= Rr; x++) { const k = (((x - RD(sway)) % 3) + 3) % 3; if (k === 2) continue; parts.px(E, R, x, bot + 1 - (bend >= 3 && x < L + 2 ? 1 : 0), m, 0); if (k === 0) parts.px(E, R, x, bot + 2 - (bend >= 2 ? 1 : 0), m, k === 0 && x === L ? 4 : 0); }
    if (bend >= 2) parts.px(E, R, L - 1, bot - 1, m, 0);         // 被风掀起的后角
  }
  // 候选部件：hoodPeak 兜帽尖角后垂（紧跟 parts.hood 的后层调用，同一个部件，不压分界线）。o = { mat, len 伸出格数, drop 每格下垂量, hang 末端再竖直下垂格数 }；
  // 读 P.beard（尖端摆）P.bend（≥ 2 被风吹平）。
  function hoodPeak(R, o) {
    const m = o.mat, x0 = R.hx0, top = R.htop, n = o.len || 3, b = CL(RD(P.beard || 0), -1, 1), flat = (P.bend || 0) >= 2;
    parts.px(E, R, x0 - 2, top - 1, m, 0); parts.px(E, R, x0 - 2, top, m, 0);
    let x = x0 - 2, y = top - 1;
    for (let k = 1; k <= n; k++) {
      x = x0 - 2 - k; y = top - 1 + (flat ? (k === n ? 1 : 0) : RD(k * (o.drop || 0.7)));
      parts.px(E, R, x, y + (k === n ? b : 0), m, k === n ? 4 : 0); if (k < n) parts.px(E, R, x, y + 1, m, 2);
    }
    for (let k = 1; k <= (o.hang || 0); k++) parts.px(E, R, x + (flat ? -k : 0), y + (flat ? 0 : k) + b, m, k === o.hang ? 4 : 0);
  }
  // 候选部件：quiver5 斜背箭袋（多箭）：3 格宽的斜筒从腰后斜向左上（45°），筒口在肩后，露出 n 支高低交错（梳齿状）的绿羽箭尾（parts.pack 的箭袋只露 3 支、贴着后背）。
  // o = { mat, trim 筒口包边, shaft, fletch, n（≤ 5）, len 筒长, dx 筒底相对后背的横移 }。两个部件：筒 → 箭；倒地时跟着身体转（压在身下）
  function quiver5(R, o) {
    const e = parts.edges(R, R.yWaist), x0 = e[0] + (o.dx || 2), y0 = R.yWaist + 3, len = o.len || 7, n = o.n || 5, H = [3, 1, 4, 2, 3], D = 14;
    E.part();
    parts.bar(D, x0, y0, 0, len, 3, (k, j, X, Y) => { const rim = k >= len - 1; parts.px(E, R, X, Y, rim ? o.trim : o.mat, rim ? (j === 0 ? 4 : 2) : j === 0 ? 4 : j === 2 ? 2 : (k % 3 === 1 ? 2 : 0)); });
    const c = parts.cell(D, x0, y0, len + 1);
    E.part();
    for (let i = 0; i < n; i++) {
      const h = H[i];
      for (let k = 0; k <= h; k++) { const p = parts.cell(D, c[0] + i - 2, c[1], k), fl = k >= h - 1; parts.px(E, R, p[0], p[1], fl ? o.fletch : o.shaft, k === h ? (i === 2 ? 4 : (i & 1) ? 2 : 3) : fl ? ((i & 1) ? 3 : 2) : 3); }
    }
  }
  // 腰后横挂的猎刀：刀鞘贴着后腰，刀柄和柄头从后腰伸出
  function knife(R) {
    const y = R.yWaist + 1, bx = parts.edges(R, Math.min(y, R.yHip))[0];
    E.part();
    parts.run(E, R, y, bx, bx + 3, M.strap, 0); parts.px(E, R, bx + 3, y + 1, M.strap, 2);
    parts.px(E, R, bx - 1, y, M.wood, 4); parts.px(E, R, bx - 2, y, M.wood, 3); parts.px(E, R, bx - 3, y, M.steel, 4);
  }
  // 倒地时洒在头边地上的 4 支箭（精灵本地坐标，不跟身体转）
  const SPILL = [[-33, 0, 0], [-30, -1, 1], [-25, 0, 0], [-18, -1, 3]];
  function spilled(stage) {
    E.part();
    const T = parts.FREE, sh = stage === 1 ? 3 : 0;
    for (const [x0, y0, kind] of SPILL) {
      const dir = kind === 1 ? 3 : kind === 3 ? 13 : 4, sx = x0 + sh - P.bx;
      for (let k = 0; k <= 8; k++) { const p = parts.cell(dir, sx, y0, k); parts.px(E, T, p[0], p[1], k <= 1 ? M.fletch : k >= 7 ? M.tip : M.bone, k === 0 ? 4 : k === 1 ? 2 : k >= 7 ? (k === 8 ? 2 : 1) : 3); }
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY), lie = R.lie;
    if (P.bowOff) longbow(Object.assign({ T: parts.FREE, at: [P.bowX, P.bowY], a: P.bowR * HALF, len: BOW_L }, BOWM));   // 脱手的弓（在身体后面）
    if (P.spill) spilled(P.spill);
    sawCape(R, { mat: M.cloak, len: 1 });
    quiver5(R, { mat: M.leather, trim: M.strap, shaft: M.bone, fletch: M.fletch, len: 9, dx: 3 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.sleeveD, cuff: M.leatherD, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'leather', mat: M.leather, belt: M.strap, buckle: M.steel, strap: M.strap });
    knife(R);
    if (!P.bowOff) longbow(Object.assign({ T: R, at: [P.hx, P.hy], a: P.a, len: BOW_L, pull: P.pull, nock: [P.bhx, P.bhy], vib: P.vib }, BOWM));   // 弓在头之前画：弦贴着脸也不把脸压黑
    parts.hood(E, R, P, { style: 'hood', mat: M.hood, layer: 'back' }); hoodPeak(R, { mat: M.hood, len: 3 });
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'young', eye: M.ink, eyeStyle: P.sq ? 'narrow' : 'dot', brow: M.brow, nose: 'small', mouth: 'line', ear: 'none' });
    parts.hood(E, R, P, { style: 'hood', mat: M.hood, layer: 'front' });
    if (lie) { parts.run(E, R, R.htop + 1, R.hx0 + 1, R.hx1 + 1, M.hood, 0); parts.run(E, R, R.ey, R.hx0 + 2, R.hx1 + 1, M.hood, 2); }   // 兜帽滑下来盖住眼睛
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.sleeve, cuff: M.leather, cuffStyle: 'bracer', hand: M.skin });
    if (P.nArr && !lie) nocked(R, P.nArr, P.nx, P.ny, P.fan, P.gem);
    if (P.hold) heldArrow(R, P.hold);
    parts.hand(E, R, P, { side: 'B', hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：自己管的箭（按飞行方向画成斜线）、钉在地上的箭、蓄力三串汇聚 ─────
  const AN = 8, aOn = new Uint8Array(AN), aK = new Uint8Array(AN), aT = new Uint8Array(AN), aX = new Float32Array(AN), aY = new Float32Array(AN), aVX = new Float32Array(AN), aVY = new Float32Array(AN), aTX = new Float32Array(AN), aTY = new Float32Array(AN), aN = new Uint16Array(AN);
  const SN = 4, sOn = new Float32Array(SN).fill(9), sX = new Float32Array(SN), sUX = new Float32Array(SN), sUY = new Float32Array(SN);
  const TGT_A = [[DUMMY_X - 3, HY - 25], [DUMMY_X - 4, HY - 14], [DUMMY_X - 9, HY]];   // 攻击：头 / 胸 / 脚边
  const TGT_S = [[DUMMY_X - 2, HY - 26], [DUMMY_X - 3, HY - 15], [DUMMY_X - 10, HY]];  // 技能：同一组落点
  const SPLIT_X = 69;
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, streamI = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function fire(k, tgt, x, y, tx, ty, T) {
    let i = 0; while (i < AN - 1 && aOn[i]) i++;
    aOn[i] = 1; aK[i] = k; aT[i] = tgt; aX[i] = x; aY[i] = y; aVX[i] = (tx - x) / T; aVY[i] = (ty - y) / T; aTX[i] = tx; aTY[i] = ty; aN[i] = 0;
  }
  function stick(x, ux, uy) { let o = 0; for (let k = 0; k < SN; k++) if (sOn[k] > sOn[o]) o = k; sOn[o] = 0; sX[o] = x; sUX[o] = ux; sUY[o] = uy; }
  function arrive(i) {
    const k = aK[i], x = aTX[i], y = aTY[i], ground = aT[i] === 2, v = Math.hypot(aVX[i], aVY[i]) || 1;
    if (k === 1) {                                                   // 大箭飞到半路「叉」地一分为三
      ring(x, y, 0, R_EL); burst(x, y, 12, 50, 120, 0.2, 0.45, R_EL, 6); fx.cross(x, y, 4, R_EL, 0.2);
      for (let j = 0; j < 3; j++) fire(2, j, x + 1, y + OFF[j], TGT_S[j][0], TGT_S[j][1], 0.16);
      sfx('impact', { pal: 'nature', w: 0.35 });
      return;
    }
    if (ground) { stick(x, aVX[i] / v, aVY[i] / v); for (let j = 0; j < (k ? 7 : 4); j++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, y - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.3 + Math.random() * 0.3, FXI.dust); }
    if (k === 0) { burst(x, y - (ground ? 1 : 0), 8, 30, 80, 0.15, 0.35, R_EL, 8); if (!ground) fx.cross(x, y, 2, R_EL, 0.15); if (aT[i] === 1) { hitDummy(0); sfx('hit', { mat: 'wood', w: 0.3 }); } }
    else { fx.cross(x, y - (ground ? 1 : 0), 5, R_EL, 0.3); burst(x, y - (ground ? 1 : 0), 12, 40, 120, 0.25, 0.5, R_EL, 10); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.6 }); }
  }
  function onEnter(s) {
    if (s === CAST) {                                                // 松弦：弓把十字星芒，三支箭并成一支大箭飞出
      const hx = wx(P.hx + P.bx + 1), hy = wy(P.hy - 1), gx = wx(P.gx), gy = wy(P.gy);
      releaseOrbit(40, 100, 0.3, 0.6, { pts: 1 });
      fx.cross(hx, hy, 5, R_EL, 0.3); burst(gx, gy, 14, 40, 110, 0.2, 0.5, R_EL, 6);
      fire(1, 1, gx + 1, gy, SPLIT_X, gy - 2, 0.14);
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
    }
    if (s === RECOVER) for (let i = 0; i < 2; i++) spawn(K_EMBER, wx(P.bhx + P.bx) + i, wy(P.bhy - 1), (i ? 4 : -3), -8 - i * 3, 0.9, R_EL);   // 指尖余下两颗绿光
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_REL) < 1e-9) {                // 松弦：三支箭扇形飞向头、胸、脚边
      mzT = 0; mzX = wx(P.hx + P.bx + 1); mzY = wy(P.hy - 1);
      const nx = wx(K_DRAW.hx - NOCK[3] + ARROW + P.bx), ny = wy(K_DRAW.hy - 1);
      for (let j = 0; j < 3; j++) fire(0, j, nx, ny + OFF[j] * 3, TGT_A[j][0], TGT_A[j][1], 0.22);
      burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'bow', w: 0.35 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 24 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && Math.abs(t - (INCOMING + 0.7)) < 1e-9) for (let i = 0; i < 6; i++) spawn(K_DUST, HX + 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);   // 长弓落地
  }
  const EVENTS = [[], [], [T_REL], [], [], [], [], [T_LAND, INCOMING + 0.7], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && P.nArr > 0 && stT >= 0.45) {             // 三串翠绿光点，各自螺旋汇聚到一枚箭头
      chargeAcc += dt * (15 + 27 * clamp01((stT - 0.45) / 0.9));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const j = streamI++ % 3; if (j >= P.nArr) continue;
        const x = wx(P.gx), y = wy(P.gy + OFF[j] * P.fan), a = [-2.2, -0.7, 1.0][j] + stT * 1.6 + (Math.random() - 0.5) * 0.5, r = 10 + Math.random() * 6;
        spawn(K_SPIRAL_PT, x, y, r / (0.3 + Math.random() * 0.2), 0, 9, R_EL, a, r, 3 + Math.random() * 2);
      }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.15 }); lastStep = P.step; }   // 落脚无声无尘
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < AN; i++) {
      if (!aOn[i]) continue; aX[i] += aVX[i] * dt; aY[i] += aVY[i] * dt;
      const v = Math.hypot(aVX[i], aVY[i]) || 1, ux = aVX[i] / v, uy = aVY[i] / v, big = aK[i] === 1;
      if (big || (aN[i]++ & 1) === 0) spawn(K_TRAIL, aX[i] - ux * (big ? 8 : 5), aY[i] - uy * 5 + (Math.random() - 0.5) * (big ? 2 : 1), -ux * (10 + Math.random() * 18), -uy * 8 + (Math.random() - 0.5) * 6, big ? 0.3 + Math.random() * 0.35 : 0.12 + Math.random() * 0.12, R_EL);
      if (aX[i] >= aTX[i]) { aOn[i] = 0; arrive(i); }
    }
    for (let k = 0; k < SN; k++) sOn[k] += dt;
    mzT += dt;
  }
  function fxReset() { aOn.fill(0); sOn.fill(9); mzT = 9; chargeAcc = 0; streamI = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {                                              // 插在地里的箭：斜插的木杆 + 绿羽，0.5 s 后闪烁消失
    for (let k = 0; k < SN; k++) {
      const t = sOn[k]; if (t > 0.55 || (t > 0.4 && (f12 & 1))) continue;
      for (let j = 1; j <= 6; j++) { const x = RD(sX[k] - sUX[k] * j), y = RD(HY - sUY[k] * j); if (y > HY) continue; put(x, y, j >= 5 ? (j === 6 ? 21 : 38) : 16); }
      put(RD(sX[k] - sUX[k] * 5) - 1, RD(HY - sUY[k] * 5), 37);
    }
  }
  function drawArrow(i, f12) {
    const v = Math.hypot(aVX[i], aVY[i]) || 1, ux = aVX[i] / v, uy = aVY[i] / v, x = aX[i], y = aY[i], big = aK[i] === 1, n = big ? 9 : 6;
    for (let k = n; k >= 0; k--) {
      const px = RD(x - ux * k), py = RD(y - uy * k);
      const c = k === 0 ? EL[0] : k === 1 ? (big ? EL[0] : EL[1]) : k >= n - 1 ? (k === n ? 21 : 38) : big ? (k < 4 ? EL[1] : EL[2]) : 16;
      put(px, py, c);
      if (big && k >= 1 && k <= 5) { put(px, py - 1, k < 3 ? EL[1] : EL[2]); put(px, py + 1, k < 3 ? EL[1] : EL[2]); }
    }
    const fx_ = RD(x - ux * (n - 1)), fy = RD(y - uy * (n - 1)); put(fx_ - 1, fy - 1, 37); put(fx_ - 1, fy + 1, 37);
    if (big && (f12 & 1)) { put(RD(x) + 1, RD(y) - 1, EL[1]); put(RD(x) + 1, RD(y) + 1, EL[1]); }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1], L = mzT < 1 / 12 ? 3 : 2; for (let r = 1; r <= L; r++) { const cc = r < L ? c : EL[2]; put(mzX + r, mzY, cc); put(mzX - r, mzY, cc); put(mzX, mzY - r, cc); put(mzX, mzY + r, cc); } put(mzX, mzY, EL[0]); }
    for (let i = 0; i < AN; i++) if (aOn[i]) drawArrow(i, f12);
  }

  return {
    name: '精英猎手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.tip], HIT_POINT: [1, -14], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'nature', style: 'blade', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
