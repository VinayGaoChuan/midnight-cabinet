// 豹帝萨瓦隆（敌人 · 混沌 · 神话 · 近战 range 408，batch-06）：desc「使用鱼篓比大部分人用剑更加娴熟」——站立的高挑豹人帝王，趾行长腿、细腰宽肩、前倾。
// 识别：右手甩着一只系在铁链上的柳条鱼篓（篓口一圈铁倒刺、篓里露出两条鱼尾，铁链另一段缠在前臂上）、头上歪戴金色尖齿小王冠（两只豹耳从冠两侧伸出）、
// 身后高翘卷钩的长豹尾 + 破边紫王袍。全身金黄豹纹。
// 攻击 = 扫：抡起铁链把鱼篓甩到身后上方，再横扫到身前（链锤式）。
// 技能 = 特性「盛宴」（身边敌人死亡时回血、加速）：端平鱼篓、篓口朝前张开，血珠从假人和地面被吸进篓里，豹斑从下往上一排排亮红 →
//   举篓一口吞下血珠，全身闪白、血红轮廓光，身后拖出两道血红残影 → 带残影的三连横扫，最后一击击退目标。
// 死亡 = 鱼篓脱手滚落、倒扣在地上，豹帝跪倒后仰面侧倒，王冠滚开，尾巴最后拍到地上；自上而下消散。
PCD.define('LeopardEmperorSavalon', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, PI = Math.PI;
  const px = parts.px, run = parts.run, rect = parts.rect, FREE = parts.FREE;

  // ───── 元素：盛宴 · 血红（白 → 淡红 → 红 → 暗红 → 墨红）；普通攻击用 impact ─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    fur: { r: 'gold', band: 2 }, limb: 'gold', robe: { r: 'purple', band: 2 }, cloth: 'purple', gold: 'gold', gem: { r: 'blood', flat: 1 },
    lit: { r: 'blood', flat: 1 }, nose: 'pink', wick: 'sand', band: 'wood', barb: 'iron', chain: 'iron', fish: 'pale',
    eye: { r: [11, 13, 26, 21], flat: 1 }, gore: { r: [55, 56, 57, 58], flat: 1 }, hot: { r: [57, 58, 58, 21], flat: 1 },
  });
  const BODY = { body: 'tall', leg: 13, torso: 11, head: 7, headW: 7, sw: 5, arm: 11, lw: 3, limb: 1.1, waist: 1.2, stride: 4, lift: 3, headX: 1, fall: 'back' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 66, 48, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wick', 'band', 'barb', 'chain', 'fish', 'eye', 'gore', 'hot', 'gem', 'lit', 'nose']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx hy 攥着铁链；ca 铁链方向（0 朝上、顺时针）、clen 垂下的链长；hold 1 = 双手端平鱼篓、篓口朝前 · 2 = 举篓到嘴边 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ca: 0, cai: 0, clen: 0, hold: 0, bz: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, tail: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, mouth: 0, flash: 0, lying: 0, lift: 0, fish: 0, spot: 0, drop: 0, tdown: 0, hatX: 0, hatY: 0, dq: 0, dqi: 0, st: 0,
    ax: 0, ay: 0, bq: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ca, clen, lean, head, crouch, hold) => ({ hx, hy, bhx, bhy, ca, clen, lean, head, crouch, hold: hold || 0 });
  const K_IDLE = K(12, -22, -3, -12, PI - 0.32, 8, 1, 0, 0);           // 前手平伸，铁链 8 格，鱼篓（篓心 x 15、篓沿 y −13）垂在身前、离近侧腿 ≥ 3 格、篓底离地 4 格
  const K_WIND = K(1, -26, -6, -15, -0.9, 7, -1, -1, 1);               // 抡起：鱼篓甩到身后上方
  const K_SWEEP = K(11, -19, 1, -14, HALF, 6, 2, 1, 1);                // 横扫到身前（出手帧）
  const K_FOLLOW = K(10, -16, 0, -13, 2.4, 6, 1, 0, 1);                // 往前下甩
  const K_CHARGE = K(8, -18, 7, -14, HALF, 0, 0, 0, 2, 1);             // 端平鱼篓、篓口朝前
  const K_GULP = K(14, -28, 9, -23, HALF, 0, 0, -1, 0, 2);             // 举篓到嘴边，一口吞下
  const K_UP = K(2, -25, -5, -15, -0.9, 7, 0, 0, 1);                   // 连扫之间回抡
  const K_SWEEP2 = K(11, -15, 1, -13, 2.0, 6, 2, 1, 2);                // 第二扫：低
  const K_HURT = K(10, -21, -5, -13, PI - 0.55, 8, -1, -1, 0);         // 被击退，鱼篓惯性甩向前（铁链 8 格）
  const K_KNEEL = K(8, -8, -2, -7, PI, 3, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ca', 'clen', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => { E.mix(P, A, B, q, FIELDS); P.hold = q < 0.5 ? A.hold : B.hold; };
  const KEY = E.keyer([['hx', -16, 24], ['hy', -40, 4], ['bhx', -16, 24], ['bhy', -40, 4], ['cai', -32, 32], ['clen', 0, 10], ['hold', 0, 2], ['bz', 0, 1], ['lean', -1, 2], ['head', -1, 2],
    ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['tail', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['mouth', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['fish', 0, 3], ['spot', 0, 5], ['drop', 0, 2], ['tdown', 0, 2], ['hatX', 0, 12], ['hatY', 0, 6],
    ['dqi', 0, 24], ['st', 0, 8]]);
  const SW = [0, 1, 0, -1], T_STRIKE = 2 / 12, T_LAND = INCOMING + 0.66, T_TAIL = INCOMING + 1.05;
  const SWEEPS = [[CAST, 3 / 12, K_UP, K_SWEEP], [CAST, 5 / 12, K_UP, K_SWEEP2], [RECOVER, 2 / 12, K_UP, K_SWEEP]];   // 三连横扫：状态、命中时刻、回抡、扫出
  // 待机个性：收链把鱼篓提到胸前 → 掏鱼（后手伸进篓口）→ 叼到嘴边 → 叼在嘴里仰头 → 放链、甩头吞下（王冠一闪）；[后手 x, y, fish, head, lean, 收链 0–1]
  const FISH0 = 1.3, FISH = [[-2, -13, 0, 0, 1, 0.5], [7, -22, 1, 0, 1, 1], [7, -25, 2, 0, 1, 1], [7, -24, 2, -1, 0, 1], [7, -24, 2, -1, 0, 1], [-1, -14, 3, -1, 0, 0.5],
    [-2, -13, 3, -1, 0, 0], [-3, -12, 3, 1, 1, 0], [-3, -12, 0, 1, 1, 0], [-3, -12, 0, 0, 1, 0]];
  const K_REEL = K(9, -25, -3, -12, PI, 3, 1, 0, 0);                    // 收链：鱼篓提到胸前，后手够得着篓口
  const R0 = parts.rig({}, BODY);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.tail = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.mouth = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.fish = 0; P.spot = 0; P.drop = 0; P.tdown = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.bz = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.sway = SW[FL(TT * 1.25) & 3]; P.tail = SW[(FL(TT * 1.25) + 1) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= FISH0 - 1e-6 && lp < FISH0 + FISH.length / 12) {
        const c = FISH[Math.min(FISH.length - 1, f12of(lp - FISH0))]; if (c[5]) setK(K_IDLE, K_REEL, c[5]); P.bhx = c[0]; P.bhy = c[1]; P.fish = c[2]; P.head = c[3]; P.lean = c[4]; P.bob = 0; P.mouth = c[2] === 2 && c[3] < 0 ? 1 : 0;
        if (c[2] === 0 && c[3] > 0) P.glint = 1;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 猫步：无尘，尾巴 S 形摆，鱼篓随步反向晃
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.tail = -P.sway * 2 + (P.wup ? (P.wup === 1 ? 1 : -1) : 0);
      P.hx += P.step;                                                  // 鱼篓随步晃 ±1 格：近侧脚在前时篓也往前，始终离近侧腿前缘 ≥ 3 格
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); setK(K_IDLE, K_WIND, q); P.ca = K_IDLE.ca + (K_WIND.ca + 2 * PI - K_IDLE.ca) * q; P.bz = tq >= 1 / 12 ? 1 : 0; P.tail = 1; }   // 往后抡（不从头顶绕）
      else if (tq < 0.2) { setK(K_SWEEP, K_SWEEP, 0); P.bx = 3; P.tail = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_SWEEP, K_FOLLOW, ease.out((tq - 0.2) / 0.25)); P.bx = 3; P.tail = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 端篓吸血：豹斑从下往上亮红，尾巴竖起抖动
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_CHARGE, q); if (q < 0.5) P.hold = 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.3 ? 1 : 2; P.spot = Math.min(5, FL(clamp01((tq - 0.25) / 1.0) * 6));
      P.tail = tq > 0.8 ? ((f12 & 1) ? 2 : 1) : 1; P.sway = tq > 0.9 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST || (st === RECOVER && tq < 3 / 12)) {       // 吞血 → 三连横扫
      P.spot = 5; P.rim = 3; P.gem = 3; P.tail = -2; P.sway = -1;
      if (st === CAST && tq < 2 / 12) { setK(K_GULP, K_GULP, 0); P.mouth = 1; P.flash = tq >= 1 / 12 ? 1 : 0; P.gem = 3; }
      else {
        P.gem = 4; P.bx = 4;
        let hit = null; for (const c of SWEEPS) if (c[0] === st && tq < c[1] + 1 / 12 - 1e-6) { hit = c; break; }
        if (!hit) hit = SWEEPS[st === CAST ? 1 : 2];
        if (tq < hit[1] - 1e-6) { setK(hit[2], hit[2], 0); P.bz = 1; } else { setK(hit[3], hit[3], 0); P.glint = 1; }
      }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01((tq - 3 / 12) / 0.4)); setK(K_SWEEP, K_IDLE, q); P.bx = RD(4 * (1 - q)); P.gem = 4;
      P.spot = RD(5 * (1 - q)); P.rim = q < 0.4 ? 2 : 1; P.tail = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.tail = 2; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.tail = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.tail = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 0 : 4; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.tail = 1; P.drop = 1; P.hatX = 0; P.gem = 4; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.crouch = 0; P.lean = 0; P.head = 0; P.drop = 2; P.gem = 4;
        P.hx = R0.sFx + 2; P.hy = R0.yWaist + 1; P.bhx = R0.sBx + 1; P.bhy = R0.yWaist + 2;
        const hq = clamp01((d - 0.66) / 0.3); P.hatX = RD(6 * hq); P.hatY = RD(Math.sin(hq * PI) * 4);
        P.tdown = d < T_TAIL - INCOMING - 0.15 ? 0 : d < T_TAIL - INCOMING ? 1 : 2;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.fish = 0; P.bhx = K_IDLE.bhx; P.bhy = K_IDLE.bhy; P.head = 0; P.lean = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.ca > PI + 1e-6) P.ca -= 2 * PI; P.cai = RD(P.ca / ASTEP); P.ca = P.cai * ASTEP; P.clen = RD(P.clen); P.dqi = RD(P.dq * 24);
    basketGeo();
    if (P.lying) { P.gx = -20 + P.bx; P.gy = -3; }
    else if (P.hold) { const m = mouthPt(); P.gx = m[0] + P.bx; P.gy = m[1]; }
    else { const R = parts.rig(P, BODY); P.gx = R.hx1 - 1 + P.bx; P.gy = R.ey; }
    KEY(P);
  }
  // 鱼篓几何：篓口（锚点 = 篓沿中点）位置 ax ay、朝向 bq（0 篓口朝上 · 1 朝右 · 2 朝下 · 3 朝左；篓口总是朝着手）
  function basketGeo() {
    if (P.hold === 1) { P.ax = P.hx + 9; P.ay = P.hy; P.bq = 1; return; }
    if (P.hold === 2) { P.ax = P.hx - 8; P.ay = P.hy - 1; P.bq = 3; return; }
    const dx = Math.sin(P.ca), dy = -Math.cos(P.ca), L = P.clen + 1;
    P.ax = RD(P.hx + dx * L); P.ay = RD(P.hy + dy * L); P.bq = ((RD((P.ca - PI) / HALF) % 4) + 4) % 4;
  }
  function mouthPt() { const d = [[0, -3], [3, 0], [0, 3], [-3, 0]][P.bq]; return [P.ax + d[0], P.ay + d[1]]; }

  // ───── 画 ─────
  // 豹斑：同材质第 1 级（墨褐）；技能里从脚往头一排排亮红（spot 0–5，每档 8 格）
  const spotAt = (T, x, y, m) => { if (P.spot && y > -P.spot * 8 + 1) px(E, T, x, y, M.lit, (x + y) & 1 ? 3 : 4); else px(E, T, x, y, m, 1); };
  const spotty = (x, y, k) => (((x * 5 + y * 3 + (k || 0)) % 7) + 7) % 7 === 0;

  // 候选部件：digiLegs 趾行腿（猫科 / 犬科人形：大腿前顶、跗关节后折、脚跟抬起、前掌着地；单膝跪时后腿膝盖着地、跗骨向后平伸）
  function seg2(T, x0, y0, x1, y1, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, 0); } }
  function digiLeg(T, hx, hy, fx, up, cr, m) {
    const yb = -up, h = yb - hy, kx = hx + 2 + cr * 0.6, ky = hy + RD(h * 0.4), hkx = fx - 2, hky = yb - 3;
    parts.sweep(E, T, hx, hy + 1, kx, ky, 1.2, 0.9, m, 0);                 // 大腿（3 格粗）
    seg2(T, kx, ky, hkx, hky, m);                                          // 小腿（2 格）
    seg2(T, hkx, hky, fx, yb - 1, m);                                      // 跗骨（脚跟抬起）
    run(E, T, yb, fx - 1, fx + 2, m, 0); px(E, T, fx + 2, yb, m, 3); px(E, T, hkx - 1, hky, m, 1);   // 前掌 + 爪尖、跗关节后突
    spotAt(T, RD(hx + 1), hy + 3, m); spotAt(T, RD(kx), ky + 2, m);
  }
  function digiLegs(R) {
    const w = R.lw, mF = M.limb, mB = M.limbD;
    if (R.kneel) {
      const yh = R.yHip + 1, bx = R.hipBx, fx = R.hipFx + 4;
      E.part(); parts.sweep(E, R, bx, yh, bx, -2, 1.1, 1, mB, 0); seg2(R, bx - 1, -2, bx - 6, -2, mB); run(E, R, 0, bx - 8, bx - 6, mB, 0); px(E, R, bx - 8, -1, mB, 0);
      E.part(); parts.sweep(E, R, R.hipFx - 1, yh, fx, yh + 1, 1.2, 1.1, mF, 0); seg2(R, fx - 1, yh + 1, fx - 1, -1, mF); run(E, R, 0, fx - 1, fx + 2, mF, 0); px(E, R, fx + 2, 0, mF, 3);
      spotAt(R, fx - 2, yh, mF);
      return;
    }
    E.part(); digiLeg(R, R.legBx, R.yHip, R.footBx, R.footBup, R.cr, mB);
    E.part(); digiLeg(R, R.legFx, R.yHip, R.footFx, R.footFup, R.cr, mF);
    return w;
  }
  // 候选部件：catHead 猫科兽头（人形用）：圆颅 + 前伸 2 格的吻部（浅色口鼻、鼻头、嘴线）+ 两只尖耳（耳尖墨色）+ 头顶豹斑
  function catHead(R) {
    const T = R, m = M.limb, x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey;
    E.part();
    for (let y = top; y <= bot; y++) { let a = x0, b = x1; if (y === top) { a++; b--; } if (y === bot) a++; if (y === ey) b = x1 + 1; if (y === ey + 1 || y === ey + 2) b = x1 + 2; if (y === bot && P.mouth) b = x1; run(E, T, y, a, b, m, 0); }
    if (P.mouth) { run(E, T, bot + 1, x0 + 2, x1 + 1, m, 0); px(E, T, x1 + 1, ey + 2, m, 1); px(E, T, x1 + 2, ey + 2, m, 1); px(E, T, x1, bot, m, 1); }   // 张嘴：下颌下沉 1 格
    else { px(E, T, x1 + 1, ey + 2, m, 1); run(E, T, bot, x1 - 1, x1, m, 4); }                                                                           // 嘴线、浅色下巴
    px(E, T, x1 + 1, ey + 1, m, 4); px(E, T, x1, ey + 1, m, 4); px(E, T, x1 + 1, ey, m, 3); px(E, T, x1 + 2, ey + 1, M.nose, 3);                        // 浅色口鼻 + 鼻头
    if (P.eyes) { px(E, T, x1 - 1, ey, m, 1); px(E, T, x1 - 2, ey, m, 1); }
    else { px(E, T, x1 - 1, ey, M.eye, P.gem >= 1 && P.gem <= 3 ? 4 : 3); run(E, T, ey - 1, x1 - 2, x1, m, 2); }
    px(E, T, x1 - 1, ey + 1, m, 1);                                                                                                                         // 泪线
    // 两只尖耳：斜着往外张，耳尖墨色；耳尖和王冠之间各留 3 格缝（剪影里冠、双耳分得开）
    run(E, T, top - 1, x0 - 1, x0, m, 0); run(E, T, top - 2, x0 - 2, x0 - 1, m, 0); px(E, T, x0 - 2, top - 3, m, 1); px(E, T, x0, top - 1, M.nose, 2);
    run(E, T, top - 1, x1, x1 + 1, m, 0); run(E, T, top - 2, x1 + 1, x1 + 2, m, 0); px(E, T, x1 + 2, top - 3, m, 1); px(E, T, x1, top - 1, M.nose, 2);
    for (const [dx, dy] of [[1, 1], [3, 2], [1, 4], [2, 5]]) spotAt(T, x0 + dx, top + dy, m);
  }
  // 候选部件：tiltCrown 歪戴小冠（3 格宽的尖齿金冠：后齿矮、前齿中、中齿最高伸出耳尖 3 格，红宝石；q 整 90° 转，滚落在地）
  const CROWN = [[-1, 0, 0], [0, 0, 0], [1, 0, 0], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [-1, -2, 4], [0, -2, 0], [0, -3, 0], [0, -4, 0], [0, -5, 4], [1, -2, 0], [1, -3, 4]];
  function crown(T, cx, cy, q) {
    E.part();
    for (const [u, v, tn] of CROWN) { const r = rot(u, v, q); px(E, T, cx + r[0], cy + r[1], M.gold, tn); }
    const g = rot(0, -1, q); px(E, T, cx + g[0], cy + g[1], M.gem, 3);
    if (P.glint && !q) px(E, T, cx, cy - 6, M.gold, 4);
  }
  const crownBox = (q) => { let a = 99, b = -99, c = -99; for (const [u, v] of CROWN) { const r = rot(u, v, q); a = Math.min(a, r[0]); b = Math.max(b, r[0]); c = Math.max(c, r[1]); } return [a, b, c]; };
  const rot = (u, v, q) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  // 候选部件：hookTail 钩尾（从臀后伸出：先往后下垂、再高高翘起、尾尖卷成钩；2 格粗到尾尖 1 格，豹斑、尾尖墨色；P.tail 摆 −2..2）
  function tailPts(rx, ry, s) {
    return [[rx, ry], [rx - 4, ry + 2], [rx - 8, ry - 1], [rx - 10 - RD(s * 0.5), ry - 7], [rx - 10 - s, ry - 13], [rx - 8 - s, ry - 18], [rx - 5 - s, ry - 20], [rx - 4 - s, ry - 18]];
  }
  function tail(T, pts, m) {
    E.part(); const n = pts.length - 1;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], thick = i < n - 2, L = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let k = 0; k <= L; k++) { const x = RD(x0 + (x1 - x0) * k / L), y = RD(y0 + (y1 - y0) * k / L); if (thick) rect(E, T, x, y, 2, 1, m, 0); px(E, T, x, y, m, i >= n - 1 ? 1 : 0); if (thick && k === 1 && (i & 1)) spotAt(T, x, y, m); }
    }
  }
  // 候选部件：creel 链锤鱼篓（柳条篓 7×9 + 两道木箍 + 圆底，篓口一圈铁倒刺、两侧各伸出 1 格；篓里露出两条鱼尾，技能里换成发光血珠；
  //   锚点 = 篓沿中点，q 整 90° 换朝向：篓口永远朝着拉它的铁链）
  const CREEL = ['.....f.f.', '..f.f..f.', '...f...f.', 'b.b.b.b.b', '.RRRRRRR.', '.WwWwWwW.', '.wWwWwWw.', '.BBBBBBB.', '.WwWwWwW.', '.wWwWwWw.', '.BBBBBBB.', '.WwWwWwW.', '..wWwWw..'];
  const BEADS = [null, ['.........', '.........', '...G.G...'], ['.........', '....G....', '..G..G.G.'], ['.....G...', '...G.G...', '..G.G.G..'], null];
  function creel(T, ax, ay, q, fish, gem) {
    E.part();
    const glowT = gem === 3 ? [M.hot, 4] : gem === 2 ? [M.gore, 4] : [M.gore, 3];
    for (let r = 0; r < CREEL.length; r++) for (let c = 0; c < 9; c++) {
      let ch = CREEL[r][c]; if (r < 3) { ch = BEADS[gem] ? BEADS[gem][r][c] : (fish ? ch : '.'); }
      if (ch === '.') continue;
      const role = ch === 'W' ? [M.wick, 0] : ch === 'w' ? [M.wick, 2] : ch === 'B' ? [M.band, 0] : ch === 'R' ? [M.band, 3] : ch === 'b' ? [M.barb, (c & 2) ? 3 : 4] : ch === 'f' ? [M.fish, 0] : glowT;
      const d = rot(c - 4, r - 4, q); px(E, T, ax + d[0], ay + d[1], role[0], role[1]);
    }
  }
  function chainLink(T, x0, y0, x1, y1) {
    E.part(); const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))), vert = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
    for (let k = 1; k < n; k++) { const x = RD(x0 + (x1 - x0) * k / n), y = RD(y0 + (y1 - y0) * k / n); if (k & 1) { px(E, T, x, y, M.chain, 4); px(E, T, x + (vert ? 1 : 0), y + (vert ? 0 : 1), M.chain, 2); } else px(E, T, x, y, M.chain, 3); }
  }
  function drawWeapon(R) {
    if (P.clen > 0 && !P.hold) chainLink(R, P.hx, P.hy, P.ax, P.ay);
    creel(R, P.ax, P.ay, P.bq, P.gem === 0, P.hold ? Math.min(3, P.gem) : 0);
  }
  function fishInHand(T, x, y) { E.part(); run(E, T, y, x + 1, x + 3, M.fish, 0); px(E, T, x + 4, y, M.fish, 4); px(E, T, x, y - 1, M.fish, 0); px(E, T, x, y + 1, M.fish, 0); px(E, T, x + 3, y, M.gold, 1); }
  function backArm(R) {
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.limbD, cuff: M.goldD, hand: M.limbD, grip: 'fist' });
    if (P.fish === 1 || P.fish === 2) fishInHand(R, P.bhx - (P.fish === 2 ? 1 : 0), P.bhy - 1);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    if (P.lying) { drawLying(); return; }
    if (P.bz && !P.drop) drawWeapon(R);
    parts.cape(E, R, P, { style: 'tattered', mat: M.robe, trim: M.gold, clasp: M.gold, flare: 8 });
    { const e0 = parts.edges(R, R.yS)[0]; run(E, R, R.yS - 2, e0 - 1, e0 + 1, M.robe, 0); run(E, R, R.yS - 3, e0 - 1, e0, M.robe, 0); px(E, R, e0 - 1, R.yS - 3, M.gold, 3); }   // 王袍立领：从肩后露出 2 格
    const e = parts.edges(R, R.yHip - 1); tail(R, tailPts(e[0] + 1, R.yHip - 1, P.tail), M.limb);
    if (P.fish !== 2) backArm(R);
    digiLegs(R);
    const tr = parts.torso(E, R, P, { style: 'bare', mat: M.fur, cloth: M.cloth, belt: M.gold, buckle: M.gold });
    for (let y = R.yS + 1; y < R.yHip; y++) { const L = tr.rows[0][y - R.yS], Rr = tr.rows[1][y - R.yS]; for (let x = L + 1; x < Rr - 1; x++) if (spotty(x, y)) spotAt(R, x, y, M.fur); }
    catHead(R);
    crown(R, R.hx, R.htop - 1, 0);
    if (P.fish === 3) { E.part(); px(E, R, R.hx1 + 3, R.ey + 2, M.fish, 0); px(E, R, R.hx1 + 4, R.ey + 1, M.fish, 4); px(E, R, R.hx1 + 4, R.ey + 3, M.fish, 0); }   // 叼在嘴里的鱼尾
    if (P.fish === 2) backArm(R);
    if (!P.bz && !P.drop) drawWeapon(R);
    if (P.drop) creel(FREE, 15, -4, 1, 1, 0);                                  // 跪下时鱼篓脱手、滚到身前
    const arm = parts.arm(E, R, P, { sleeve: 'bare', mat: M.limb, cuff: M.gold, hand: M.limb, grip: 'fist' });
    if (!P.hold) parts.chain(E, R, P, { wrap: [arm.ex, arm.ey, arm.wx, arm.wy], len: 0, mat: M.chain });   // 缠在前臂上的那段铁链
  }
  // 倒地姿（仰面侧躺，头在左）：全部在精灵坐标里画——紫袍铺地 → 尾巴 → 远侧腿 → 躯干 → 猫头（吻部朝上、一只耳、闭眼）→ 近侧腿 → 前臂；王冠滚到头后 5 格；鱼篓倒扣（倒刺那行贴地）
  const LHIP = -9, LHEAD = -27;
  function drawLying() {
    const F = FREE, Y = -P.lift, m = M.limb, mD = M.limbD;
    const R_ = (y, a, b, mm, t) => run(E, F, y + Y, a, b, mm || m, t || 0), X_ = (x, y, mm, t) => px(E, F, x, y + Y, mm, t || 0);
    const SP = (x, y, mm) => spotAt(F, x, y + Y, mm);
    // 尾巴：竖着 → 斜 → 平贴地面（tdown 2）
    const rx = LHIP, ry = -2 + Y;
    if (P.tdown < 2) {
      const TP = [[[rx, ry], [rx - 2, ry - 5], [rx - 1, ry - 10], [rx + 1, ry - 13], [rx + 3, ry - 13], [rx + 4, ry - 11]],
        [[rx, ry], [rx + 3, ry - 3], [rx + 7, ry - 6], [rx + 10, ry - 7], [rx + 12, ry - 6], [rx + 13, ry - 5]]][P.tdown];
      tail(F, TP, m);
    } else { E.part(); R_(-1, rx + 1, rx + 11, m, 0); R_(0, rx + 2, rx + 10, m, 0); X_(rx + 12, -1, m, 1); X_(rx + 12, 0, m, 1); X_(rx + 11, -2, m, 1); SP(rx + 5, -1, m); SP(rx + 8, 0, m); }
    // 紫袍铺在身下（金边、后摆破口）
    E.part();
    for (let x = LHEAD - 1; x <= LHIP + 3; x++) { const k = ((x % 4) + 4) % 4; X_(x, -1, M.robe, 0); if (x < LHIP || k >= 2) X_(x, 0, M.robe, x < LHIP ? 0 : 2); }   // 袍摆在胯后破成一条条
    R_(-2, LHEAD - 2, LHEAD - 1, M.robe, 0); X_(LHEAD - 2, -1, M.gold, 3); X_(LHEAD - 3, 0, M.gold, 3); X_(LHEAD - 2, 0, M.robe, 0);
    // 远侧腿（整条 limbD）：比近侧高 1 行，伸到髋 +10 格，脚掌 2 格朝上翘
    E.part(); R_(-6, LHIP - 2, LHIP + 2, mD, 0); R_(-5, LHIP - 2, LHIP + 8, mD, 0); R_(-4, LHIP - 2, LHIP + 9, mD, 0);
    X_(LHIP + 9, -5, mD, 0); X_(LHIP + 9, -6, mD, 0); X_(LHIP + 9, -7, mD, 3); X_(LHIP + 10, -7, mD, 1); X_(LHIP + 5, -6, mD, 1);
    // 躯干平躺 y −2…−6：胸在左、细腰、胯在右；肚皮朝上（上沿浅色）；金腰带 + 紫腰布
    E.part();
    for (let x = LHEAD + 7; x <= LHIP + 1; x++) { const neck = x === LHEAD + 7, waist = x >= LHIP - 5 && x <= LHIP - 2; for (let y = neck ? -4 : waist ? -5 : -6; y <= -2; y++) X_(x, y, M.fur, 0); }
    for (let x = LHEAD + 9; x <= LHIP - 3; x += 2) X_(x, x < LHIP - 5 ? -6 : -5, M.fur, 4);
    for (const [x, y] of [[LHEAD + 10, -4], [LHEAD + 13, -3], [LHIP - 4, -4]]) SP(x, y, M.fur);
    for (let y = -6; y <= -2; y++) X_(LHIP - 1, y, M.gold, y === -4 ? 4 : 0);
    R_(-2, LHIP, LHIP + 3, M.cloth, 0); R_(-1, LHIP + 1, LHIP + 3, M.cloth, 2);
    // 猫头：吻部朝上、一只耳朝左上、闭眼
    E.part();
    const h0 = LHEAD;
    R_(-8, h0 + 1, h0 + 5); for (let y = -7; y <= -3; y++) R_(y, h0, h0 + 6); R_(-2, h0 + 1, h0 + 5);
    R_(-9, h0 + 2, h0 + 5); R_(-10, h0 + 3, h0 + 4);                                               // 吻部往上伸 2 格
    X_(h0 + 3, -10, M.nose, 3); X_(h0 + 3, -9, m, 4); X_(h0 + 4, -9, m, 4); X_(h0 + 5, -9, m, 1); X_(h0 + 5, -8, m, 4);   // 鼻头、浅色口鼻、嘴线、下巴
    X_(h0 + 2, -6, m, 1); X_(h0 + 3, -6, m, 1); X_(h0 + 3, -7, m, 4);                              // 闭着的眼（一道弯）+ 眼睑高光
    R_(-7, h0 - 2, h0 - 1); R_(-8, h0 - 3, h0 - 2); X_(h0 - 4, -9, m, 1); X_(h0 - 1, -7, M.nose, 2);  // 一只耳朝左上
    for (const [dx, dy] of [[1, -4], [5, -4]]) SP(h0 + dx, dy, m);
    // 近侧腿（后画、压在远侧腿前）：伸到髋 +10 格，脚掌 2 格朝上翘
    E.part(); R_(-4, LHIP - 1, LHIP + 3, m, 0); R_(-3, LHIP - 1, LHIP + 9, m, 0); R_(-2, LHIP - 1, LHIP + 10, m, 0);
    X_(LHIP + 10, -3, m, 0); X_(LHIP + 10, -4, m, 3); X_(LHIP + 11, -4, m, 1); X_(LHIP + 11, -2, m, 1); X_(LHIP + 6, -4, m, 1);
    SP(LHIP + 3, -3, m);
    // 前臂：从肩垂到身前地面，金臂环
    E.part(); parts.sweep(E, F, LHEAD + 9, -4 + Y, LHEAD + 12, -1 + Y, 1.1, 1, m, 0); parts.sweep(E, F, LHEAD + 12, -1 + Y, LHEAD + 15, -1 + Y, 1, 0.9, m, 0);
    X_(LHEAD + 15, -1, M.gold, 3); X_(LHEAD + 15, 0, M.gold, 0); E.part(); R_(-1, LHEAD + 16, LHEAD + 17, m, 0); R_(0, LHEAD + 16, LHEAD + 17, m, 0); X_(LHEAD + 16, -1, m, 4);
    // 王冠：从头上滚到头后 5 格（hatX 0 → 6），落地后侧躺
    const q = P.hatX >= 6 ? 1 : P.hatX >= 4 ? 2 : P.hatX >= 2 ? 3 : 0, bx = crownBox(q);
    crown(F, h0 - 1 - P.hatX - bx[1], -bx[2] - P.hatY, q);
    // 鱼篓倒扣（倒刺那行贴地），漏出来的一条鱼在篓口旁边
    creel(F, LBASK, -1, 2, 0, 0);
    E.part(); run(E, F, 0, LBASK + 6, LBASK + 8, M.fish, 0); px(E, F, LBASK + 9, -1, M.fish, 4); px(E, F, LBASK + 9, 0, M.fish, 0); px(E, F, LBASK + 5, 0, M.fish, 1);
  }
  const LBASK = 10;
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let smT = 9, smA0 = 0, smA1 = 0, smCX = 0, smCY = 0, smR = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, dropT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function sweep(i, t) {                                                // 三连横扫的一段：斩击弧 + 血外爆 + 星芒
    const c = SWEEPS[i], last = i === 2; poseAt(c[0], t, t);
    fx.slash(wx(c[3].hx + P.bx), wy(c[3].hy), 11, c[2].ca + 0.3, c[3].ca + 0.2, R_EL, 0.2, 3, 2);
    const hy = HY - 16 + i * 3;
    burst(DUMMY_X - 2, hy, last ? 28 : 16, 50, 130, 0.25, 0.6, R_EL, 10); fx.cross(DUMMY_X - 2, hy, last ? 7 : 5, R_EL, 0.25);
    hitDummy(last ? 1 : 0); if (last) shake(0.14, 1);
    sfx('impact', { pal: 'blood', w: last ? 0.8 : 0.55 });
  }
  function onEnter(s) {
    if (s === CAST) {                                                   // 吞下血珠：外爆 + 冲击环 + 震屏 + 天空闪白
      const gx = wx(P.gx), gy = wy(P.gy);
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 24, 50, 120, 0.25, 0.6, R_EL, 12); ring(wx(4), wy(-18), 1, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-9) {
      poseAt(ATTACK, t, t);
      smA0 = K_WIND.ca + 0.2; smA1 = K_SWEEP.ca + 0.3; smCX = wx(K_SWEEP.hx + 3); smCY = wy(K_SWEEP.hy); smR = 10; smT = 0;
      hitDummy(0); burst(DUMMY_X - 2, HY - 14, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 2, HY - 14, 4, R_IMP, 0.2);
      for (let i = 0; i < 4; i++) spawn(K_BURST, DUMMY_X - 3, HY - 13, -20 - Math.random() * 40, -30 - Math.random() * 40, 0.4 + Math.random() * 0.3, FXI.earth);   // 柳条碎屑
      sfx('swing', { kind: 'smash', w: 0.6 }); sfx('hit', { mat: 'wood', w: 0.6 });
    }
    for (let i = 0; i < SWEEPS.length; i++) if (s === SWEEPS[i][0] && Math.abs(t - SWEEPS[i][1]) < 1e-9) sweep(i, t);
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 26 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && Math.abs(t - T_TAIL) < 1e-9) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX + 2 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('fall', { w: 0.15 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [SWEEPS[0][1], SWEEPS[1][1]], [SWEEPS[2][1]], [], [T_LAND, T_TAIL], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.35) {                              // 血珠从假人身上和地面被吸进篓口（定点汇聚）
      const tx = wx(P.gx), ty = wy(P.gy);
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const fromDummy = Math.random() < 0.6;
        const sx = fromDummy ? DUMMY_X - 2 + (Math.random() - 0.5) * 6 : tx - 14 + Math.random() * 30, sy = fromDummy ? HY - 8 - Math.random() * 16 : HY - 1;
        const r = Math.hypot(sx - tx, sy - ty), a = Math.atan2(sy - ty, sx - tx);
        spawnX(K_SPIRAL_PT, tx, ty, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: (Math.random() - 0.5) * 1.2, squash: 1 });
      }
    }
    if ((state === CAST || state === RECOVER) && P.rim >= 2) { emberAcc += dt * 14; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-4 + Math.random() * 14), wy(-4 - Math.random() * 28), (Math.random() - 0.5) * 10, -12 - Math.random() * 12, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.3 }); lastStep = P.step; }   // 猫步：无尘、只有很轻的落脚声
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 26 + Math.random() * 34, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt;
  }
  function fxReset() { smT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying && P.hold) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 候选部件：brokenGhost 断边残影（实心剪影，外沿按步长断续；gap 越小断得越多）
  function ghost(X, Y, flip, cIn, cEdge, gap, ph) {
    const o = hero.out, w = hero.w, h = hero.h, E0 = (x, y) => x < 0 || y < 0 || x >= w || y >= h || o[y * w + x] === 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (o[y * w + x] === 255) continue;
      const edge = E0(x - 1, y) || E0(x + 1, y) || E0(x, y - 1) || E0(x, y + 1);
      if (edge && ((x + y * 2 + ph) % gap) === 0) continue;
      put(flip ? X + hero.ox - x : X - hero.ox + x, Y - hero.oy + y, edge ? cEdge : cIn);
    }
  }
  function fxMid() {                                                    // 身后两个错开的血红残影（吞血之后、三连扫期间）：近的暗红、远的墨红且高 1 格，外沿断续
    const st = E.state, t = E.stT;
    if ((st === CAST && t >= 2 / 12) || (st === RECOVER && t < 0.3)) { const x = HX + P.mx, d = P.flip ? 1 : -1, ph = f12of(t); ghost(x + d * 11, HY - 1, P.flip, EL[4], EL[3], 2, ph); ghost(x + d * 5, HY, P.flip, EL[3], EL[2], 3, ph); }
  }
  function fxFront(f12) {
    if (smT < 2 / 12) {                                                // 鱼篓横扫的撞击拖影弧
      const c = smT < 1 / 12 ? FXR[R_IMP][1] : FXR[R_IMP][2];
      for (let k = 0; k <= 14; k++) { if ((k & 1) && smT >= 1 / 12) continue; const a = smA0 + (smA1 - smA0) * k / 14; for (let o = 0; o < (smT < 1 / 12 ? 2 : 1); o++) put(RD(smCX + Math.sin(a) * (smR - o)), RD(smCY - Math.cos(a) * (smR - o)), c); }
    }
    if (P.hold && P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const x = wx(P.gx), y = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x, y - r, c); put(x, y + r, c); put(x + (P.flip ? -r : r), y, c); } }
  }

  return {
    name: '豹帝萨瓦隆', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.gore, M.hot], HIT_POINT: [2, -18], EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'blood', style: 'buff', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
