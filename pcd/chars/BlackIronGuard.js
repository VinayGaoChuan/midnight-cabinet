// 黑铁卫（部队 · 精灵 · 守护者 · 稀有）：高大重装的精灵卫士，全身黑铁板甲、桶盔两侧一对叶片状铁翼护耳、背后插一面窄长三角旗，身前立一面带三道尖刺的黑铁塔盾（盾心冷银盾钉）。
// 攻击 = 盾砸（双手把塔盾举过头顶再砸在地上）；技能 = 特性「厚皮」生效：塔盾插进地里，银灰点阵护罩向身后友军张开，每人胸前落下一枚铁盾印。
// 升级成「翠盾」（VerdantShield.js）：同一个人——同样的塔盾、翼耳盔、背旗，黑铁长出翠绿活木与藤叶。
PCD.define('BlackIronGuard', (E) => {
  const { parts, Sprite, bake, begin, part, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：厚皮 · 冷铁银（共享 steel 色阶：白 → 银 → 灰蓝 → 铁 → 深铁）─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    plate: 'iron', face: { r: 'iron', band: 2 }, trim: 'steel', wing: [28, 29, 30, 31], cloth: [27, 28, 59, 60], pole: 'iron', belt: 'boot',
    eye: { r: [40, 41, 22, 22], flat: 1 }, gem: { r: [28, 29, 30, 31], flat: 1 }, glow: { r: [22, 31, 21, 21], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 11, torso: 12, head: 6, headW: 6, sw: 6, arm: 13, lw: 4, stride: 3, limb: 1.4, fall: 'front' };
  const HX = 78, DUR = DEFAULT_DUR.slice();                     // 近战：盾砸前冲 4 格，盾面够到 x≈97
  const hero = new Sprite(66, 56, 30, 51);                      // 缓冲：脚底 = (30, 51)；放得下背旗三角旗、举过头顶的塔盾和前冲砸地的盾
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['pole', 'cloth', 'eye', 'gem', 'glow']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 塔盾握把（盾心 = 前手 + (1, 3)），后手平时垂在身后，举盾 / 砸盾时两手都上 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, shx: 0, shy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, noSh: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(7, -9, -5, -12);                             // 塔盾立在身前，盾底贴地
  const K_WIND = K(7, -31, 5, -31, -1, -1);                     // 双手把盾举过头顶
  const K_SLAM = K(10, -9, 8, -13, 1, 1, 2);                    // 砸下：盾底咬进地面 2 行
  const K_HOLD = K(10, -9, 7, -13, 1, 0, 1);
  const K_CHARGE = K(7, -32, 5, -32, -1, -1);                   // 蓄力：塔盾高举（外轮廓最高）
  const K_CAST = K(9, -7, 7, -11, 1, 1, 2);                     // 施放：塔盾插进地里 4 行
  const K_HURT = K(5, -10, -6, -12, -1, -1);
  const K_KNEEL = K(9, -17, 7, -17, 1, 1, 4);                   // 单膝跪地，两手按在立着的盾顶
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['shx', -32, 31], ['shy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['noSh', 0, 1]]);
  const FLAG_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], THUMP = [-1, -2, 1, 0, 0];   // 待机个性：顿盾（抬 1 → 抬 2 → 往地里一顿）
  const T_SLAM = 2 / 12, T_STAMP = 2 / 12, T_KNEE = INCOMING + 0.38, T_BREAK = INCOMING + 1.1, T_SHFALL = INCOMING + 1.5;
  let shFix = null;                                              // 死亡跪姿：盾脱手立在身前（固定盾心）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; shFix = null;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.noSh = 0;
    let shDy = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FLAG_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); shDy = THUMP[f]; P.glint = f === 2 ? 1 : 0; P.beard = f === 2 ? 2 : P.beard; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 重步：接触帧身体下沉 1 格、盾底磕地；经过帧盾离地 1 格
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      shDy = P.wup ? -1 : P.bob;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_SLAM, K_SLAM, 0); P.bx = 4; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_SLAM, K_HOLD, q); P.bx = RD(4 - q); P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 盾举过头，背旗被风拉直、猎猎抖
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.bend = RD(q * 3); P.beard = q > 0.6 ? ((f12 & 1) ? -2 : 1) : -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { setK(K_CAST, K_CAST, 0); P.bend = 2; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0; }   // 施放第 1 帧盾已经插进地里（定格）
    else if (st === RECOVER) {                                         // 拔盾，回到立盾站姿
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.bend = RD(2 * (1 - q)); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪倒以盾撑住 → 定格 → 散架（死亡套件 parts）→ 塔盾最后倒下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.38) { setK(K_HURT, K_KNEEL, 0.5); P.crouch = 2; P.bx = -1; P.eyes = 1; P.beard = 2; P.gem = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.eyes = 1; P.beard = d < 0.6 ? 1 : 0; shFix = [11, -6];
        P.gem = d < 0.5 ? 1 : d < 1.0 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= T_BREAK - INCOMING) P.dq = 1;                         // 之后由死亡套件（散架）接管，塔盾单独画
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const cr = Math.min(3, RD(P.crouch)), yo = P.bob + cr;
    P.hx = RD(P.hx); P.bhx = RD(P.bhx); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const hy0 = RD(P.hy); P.hy = hy0 + (shDy ? shDy : P.bob) + cr; P.bhy = RD(P.bhy) + yo;           // 前手跟着盾走（顿盾 / 重步），不顿盾时随呼吸
    if (shFix) { P.shx = shFix[0]; P.shy = shFix[1]; }
    else { P.shx = P.hx + 1; P.shy = hy0 + 3 + cr + shDy; }            // 盾不随呼吸起伏；顿盾、重步接触帧磕进地面 1 行、经过帧离地 1 格
    P.gx = P.shx + P.bx; P.gy = P.shy;                                 // 发光体 = 盾心盾钉
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：背旗（插在背后的窄长三角旗）——铁杆从腰后伸到头顶上方 hi 格，杆头银矛尖，三角旗向后飘，下沿银边，根部一枚银叶。读 P：beard（旗尾摆）sway bend（被风拉直）
  function drawBanner(R, o) {
    const e = parts.edges(R, R.yS + 2)[0], x = e - 4, yb = R.yWaist, yt = R.htop - o.hi, bend = P.bend, b = P.beard, sw = P.sway;
    part();
    for (let y = yt; y <= yb; y++) px(E, R, x, y, o.pole, 0);
    for (let k = x + 1; k < e; k++) { px(E, R, k, R.yS + 2, o.pole, 0); px(E, R, k, R.yWaist - 1, o.pole, 0); }   // 两道杆托（挂在后背上）
    px(E, R, x, yt - 1, o.trim, 4); px(E, R, x, yt - 2, o.trim, 3); px(E, R, x - 1, yt - 1, o.trim, 2); px(E, R, x + 1, yt - 1, o.trim, 2);   // 杆头
    const L = o.len + (bend >= 3 ? 1 : 0), amp = (3 - bend) / 3;
    for (let i = 1; i <= L; i++) {
      const q = i / L, h = Math.max(1, RD(o.h * (1 - q * 0.8))), dy = RD((b * q * q * 0.9 + sw * q * 0.5 + Math.sin(q * 5.5 + b) * 0.8) * amp + (bend >= 2 ? 0 : q * 2));
      for (let j = 0; j < h; j++) px(E, R, x - i, yt + 1 + dy + j, j === h - 1 ? o.trim : o.cloth, j === h - 1 ? 3 : 0);
    }
    px(E, R, x - 2, yt + 2, o.trim, 4); px(E, R, x - 3, yt + 2, o.trim, 3); px(E, R, x - 2, yt + 3, o.trim, 3);   // 银叶
  }
  // 候选部件：翼耳（精灵叶片护耳）——盔后侧向后上方伸出的 3 格宽亮银叶片，带黑铁叶脉；far = 远侧（暗一级，上移 1 格、前移 3 格，只露出盔顶上方错开的叶尖）
  const WING = [[3, -1, 0], [2, -2, 0], [1, -2, 0], [0, -3, -1], [-1, -3, -1], [-2, -4, -2], [-3, -4, -3], [-4, -4, -4]];   // [dy, x0, x1]（相对盔后沿 hx0-1、头顶 htop）：3 格宽叶片向后上方斜伸，尖端高出盔顶 3 格
  const VEIN = [[-1, 1], [-1, 0], [-2, -1], [-3, -2]];
  function drawWing(R, far, m, v) {
    const ox = R.hx0 - 1 + (far ? 3 : 0), oy = R.htop - (far ? 1 : 0);
    part();
    for (const [dy, a, b] of WING) for (let x = a; x <= b; x++) px(E, R, ox + x, oy + dy, m, 0);
    for (const [dx, dy] of VEIN) px(E, R, ox + dx, oy + dy, v, 2);
  }
  // 候选部件：尖顶塔盾——9×14 矩形塔盾，顶边三道尖刺（间隔 3 格，剪影看得出齿），银边框 + 4 颗铆钉，盾面银叶纹（中脉 + 人字叶脉），盾心 3×3 盾钉（5 档发光）。
  // T = 落笔变换（在身上用 rig，掉在地上用自由变换），坐标以盾心为原点
  const SH_W = 4, SH_T = -7, SH_B = 6;
  function drawShield(T, lv) {
    part();
    for (let v = SH_T; v <= SH_B; v++) for (let x = -SH_W; x <= SH_W; x++) px(E, T, x, v, v === SH_T || v === SH_B || Math.abs(x) === SH_W ? M.trim : M.face, 0);
    for (const x of [-SH_W, 0, SH_W]) { px(E, T, x, SH_T - 1, M.trim, 0); px(E, T, x, SH_T - 2, M.trim, x ? 4 : 0); }
    px(E, T, 0, SH_T - 3, M.trim, 4);
    for (const [x, v] of [[-SH_W, -5], [SH_W, -5], [-SH_W, 4], [SH_W, 4]]) px(E, T, x, v, M.trim, 4);   // 铆钉
    for (let v = SH_T + 2; v <= SH_B - 2; v++) px(E, T, 0, v, M.trim, 4);                             // 叶脉：中脉 + 两道人字
    for (const v0 of [-5, 1]) for (let k = 1; k <= 2; k++) { px(E, T, -k, v0 + k, M.trim, 3); px(E, T, k, v0 + k, M.trim, 3); }
    const g = M.gem, w = M.glow;                                                                     // 盾钉 5 档：待机 / 蓄力 1 / 蓄力 2 / 施放 / 熄灭
    const C = [[g, 4], [w, 2], [w, 3], [w, 3], [g, 2]][lv], X = [[g, 3], [g, 4], [w, 2], [w, 3], [g, 1]][lv], D = [[g, 2], [g, 2], [g, 4], [w, 1], [g, 1]][lv];
    px(E, T, 0, 0, C[0], C[1]); for (const [x, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(E, T, x, v, X[0], X[1]); for (const [x, v] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) px(E, T, x, v, D[0], D[1]);
    if (P.glint && lv < 4) px(E, T, -1, -1, w, 3);
  }
  const onBody = (R, cx, cy) => ({ r0: 0, tx: R.tx + cx, ty: R.ty + cy, rot: R.rot, ox: R.ox, oy: R.oy });
  const BANNER = { hi: 7, len: 9, h: 5, pole: M.pole, cloth: M.cloth, trim: M.trim };
  function drawHero() {
    begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    drawBanner(R, BANNER);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, hand: M.plateD, grip: 'big' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, belt: M.belt, buckle: M.trim, emblem: M.trim, emblemStyle: 'diamond' });
    drawWing(R, 1, M.wingD, M.plateD); drawWing(R, 0, M.wing, M.plate);   // 翼耳用亮银，和黑铁盔拉开
    parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.trim, eye: M.eye });
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.trim, hand: M.plate, grip: 'big' });
    if (!P.noSh) drawShield(onBody(R, P.shx, P.shy), P.gem);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const shUp = new Sprite(14, 20, 7, 19), shFlat = new Sprite(22, 14, 14, 12), SHB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };   // 死亡时单独烤的塔盾：锚点 = 盾底 / 平躺的盾贴地那一行
  let shOn = 0, shX = 0, shY = 0, stampT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastThump = -1, slamT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function blitSpr(s, X, Y, dq) { const o = s.out; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, Y - s.oy + y, c); } }
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function onEnter(s) {
    if (s !== CAST) return;
    const base = wx(K_CAST.hx + 1);                                    // 塔盾插地：短地裂 + 尘，点阵护罩从脚下张开到身后友军
    fx.crack(base, HY + 1, 7, 1, R_EL, 0.9); fx.crack(base - 2, HY + 1, 6, -1, R_EL, 0.9);
    fx.dome(wx(-14), HY, 25, 27, R_EL, 1.15, 0);                      // 护罩罩住自己和身后友军（不罩敌人）
    releaseOrbit(40, 90, 0.3, 0.6); burst(base, HY - 2, 18, 40, 100, 0.25, 0.55, R_EL, 20); dust(base, 8, 40);
    fx.cross(wx(K_CAST.hx + 1), wy(K_CAST.hy + 5), 6, R_EL, 0.3);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'metal', w: 0.9 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SLAM) {                                // 盾砸：盾顶划出银弧，盾底砸出短地裂
      slamT = 0; const cx = wx(P.shx + P.bx), by = HY;
      fx.slash(wx(4 + P.bx), wy(-21), 14, 0.1, 2.4, R_EL, 0.17, 3, 2);
      fx.crack(cx + 2, HY + 1, 6, 1, R_EL, 0.5); dust(cx, 5, 40);
      burst(cx + SH_W + 2, by - 6, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(cx + SH_W + 2, by - 6, 4, R_IMP, 0.2);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === CAST && t === T_STAMP) {                                 // 护罩扩到友军：银色描边 + 胸前铁盾印 + 旗杆顶连线
      stampT = 0; allyFx({ dur: 1.05, outline: R_EL });
      const R = parts.rig(P, BODY), top = [wx(parts.edges(R, R.yS + 2)[0] - 4 + P.bx), wy(R.htop - BANNER.hi)];
      for (const a of allyPoints()) { fx.link(top[0], top[1], a.x, a.top, R_EL, 1.0, 1); burst(a.x + 3, a.mid - 1, 8, 20, 50, 0.2, 0.45, R_EL, 10); }
      sfx('impact', { pal: 'metal', w: 0.5 });
    }
    if (s === DEATH && t === T_KNEE) { dust(HX - 2, 10, 30); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_BREAK) {                                // 散架：先单独烤好塔盾（立着 / 倒下两张），再把没有盾的身体交给死亡套件
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); shX = HX + P.shx; shY = HY + P.shy;
      begin(shUp, 0, 0); drawShield({ r0: 0, tx: 0, ty: -SH_B, rot: 0, ox: 0, oy: 0 }, 4); bake(shUp, SHB);
      begin(shFlat, 0, 0); drawShield({ r0: 3, tx: 0, ty: -SH_W, rot: 0, ox: 0, oy: 0 }, 4); bake(shFlat, SHB);   // 向后倒：盾顶朝左，压在跪过的地方
      P.noSh = 1; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.75, fromX: 2, fromY: -18, push: -10, fadeAt: 0.9, fadeDur: 0.5 }); shOn = 1;
      burst(HX + 2, HY - 22, 10, 30, 80, 0.2, 0.5, R_EL, 20); shake(0.14, 1); sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === T_SHFALL) { shOn = 2; dust(shX - 8, 12, 40); shake(0.12, 1); sfx('fall', { w: 0.9 }); }
  }
  const EVENTS = [[], [], [T_SLAM], [], [T_STAMP], [], [], [T_KNEE, T_BREAK, T_SHFALL], []];
  function hurtFx(s) {                                                 // 金属：更多火花 + 几颗长寿命白火星
    const hx = HX + 2, hy = HY - 16; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, R_EL, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 银色金属屑螺旋收拢到盾钉
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.9 }); dust(wx(P.step > 0 ? 5 : -4), 3 + (Math.random() < 0.5 ? 1 : 0), 18); dust(wx(P.shx), 1, 10); } lastStep = P.step; }
    if (state === IDLE) {                                              // 顿盾扬尘
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastThump) { if (f === 2) { dust(wx(P.shx) - 3, 3, 26); dust(wx(P.shx) + 3, 3, 26); } lastThump = f; }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    stampT += dt; slamT += dt;
  }
  function fxReset() { shOn = 0; stampT = 9; slamT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastThump = -1; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() {
    if (shOn && E.state === DEATH) { const dq = clamp01((E.stT - INCOMING - 1.9) / 0.5); if (shOn === 1) blitSpr(shUp, shX, HY, dq); else blitSpr(shFlat, shX - 4, HY, dq); }   // 塔盾最后倒下（向后平躺）
  }
  const STAMP = ['.####.', '######', '######', '##..##', '######', '.####.', '..##..'];   // 友军胸前的小铁盾印 6×7
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                        // 盾钉星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (stampT < 0.95) {                                               // 铁盾印：第 1 帧白，之后银边铁面，后段断续
      const late = stampT > 0.6, drop = stampT < 2 / 12 ? RD((2 / 12 - stampT) * 24) : 0;
      for (const a of allyPoints()) {
        const x0 = a.x + 1, y0 = a.mid - 7 - drop;
        for (let j = 0; j < 7; j++) for (let i = 0; i < 6; i++) {
          const ch = STAMP[j][i]; if (ch === '.') continue; if (late && ((i + j + f12) & 1)) continue;
          const edge = j === 0 || i === 0 || i === 5 || STAMP[j][i - 1] === '.' || STAMP[j][i + 1] === '.' || !STAMP[j + 1] || STAMP[j + 1][i] === '.';
          put(x0 + i, y0 + j, stampT < 1 / 12 ? EL[0] : edge ? EL[(f12 >> 1) & 1 ? 1 : 2] : EL[3]);
        }
        if (!late) put(x0 + 2, y0 + 1, EL[0]);
      }
    }
  }

  return {
    name: '黑铁卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gem, M.glow], HIT_POINT: [3, -16], EVENTS, ALLIES: 'skill',
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'shield', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
