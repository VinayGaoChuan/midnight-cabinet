// 青龙（部队 · 自然 · 牧师 · 优质）：东方游龙——没有膜翼、细长 S 形蛇身悬在半空，头顶一对后掠分叉鹿角、吻部垂下两条长龙须，
// 背脊一溜淡翠鬃鳍一直到尾尖鬃簇，前爪握一颗青玉龙珠。升级 → 天龙（保留鹿角、龙须、鬃、龙珠，加羽翼、光环、云）。
// 攻击：昂头后张嘴，吐出一颗青玉吐息弹直线飞向目标；技能「生命交换」：龙身盘紧，鳞片从尾到头一格格由翠转灰（付出生命），
// 被抽出的生命化成青玉光点汇进龙珠 → 张口朝友军吐出一条青玉光带（连线渐粗成光束），自身闪红、下沉 1 格 → 友军身上升起十字治疗光点。
// 死亡：坠落——龙珠先熄灭脱手，身体失去浮力盘着坠地（离地 8 → 3 → 1 → 0），鳞片褪成灰绿后消散；龙珠滚到一边，最后熄灭。
// 蛇身、短爪腿、鹿角、龙须、鬃鳍、龙珠是本模块的自画部件（候选部件）；头用 parts-beast 的 quad.head（dragon 头型，去掉默认后掠角）。
PCD.define('GreenDragon', (E) => {
  const { Sprite, ramp, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow,
    allyPoints, allyFx, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('jadeLife', [21, '#c8f5e0', '#7ee0b8', '#1f7a58', '#06201a']), EL = FXR[R_EL];   // 生命交换 · 青玉生命绿
  const R_SCALE = fxRamp('jadeScale', ['#7ee0b8', '#4cb884', '#1f7a58', '#0f4a38', '#06201a']);       // 受击鳞屑、游弋拖尾
  const R_RED = FXI.blood;
  const m = B.mats(E, {
    main: ramp(['#06201a', '#0f4a38', '#1f7a58', '#4cb884']),                // 翠青龙鳞
    belly: 'sand', gray: ramp(['#06201a', '#34463e', '#5a6e62', '#8a9e90']),  // 淡米黄腹鳞；付出生命 / 死亡后褪成的灰绿鳞
    mane: ramp(['#0f4a38', '#2a8a6a', '#7ee0b8', '#c8f5e0']),                // 淡翠鬃鳍、龙须
    antler: 'bone', claw: 'bone', teeth: 'white',
    orb: ramp(['#0a3a30', '#2a8a6a', '#7ee0b8', '#e0fff0']),                 // 青玉龙珠
    glow: ramp(['#2a8a6a', '#2a8a6a', '#7ee0b8', '#7ee0b8']),                // 张嘴时口中的青玉光
  });
  m.orbHot = E.defMat(ramp(['#7ee0b8', '#7ee0b8', '#e0fff0', '#e0fff0']), 1, 1);
  m.orbCore = E.defMat([21, 21, 21, 21], 1, 1);
  m.antlerFar = E.defMat([8, 7, 7, 6], 1); m.maneFar = E.defMat(ramp(['#06201a', '#0f4a38', '#0f4a38', '#2a8a6a']), 1);
  const HEAD = Q.shape({ head: { type: 'dragon', w: 6, h: 5, snout: 5, snH: 3, tip: 0.7, horn: '', teeth: 2 }, m });

  const HX = 38, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 46, 42, 42), ALLY_X = [76];
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'antler', 'antlerFar', 'orb', 'orbHot', 'orbCore', 'mane', 'maneFar', 'glow']) RIM.skip[m[k]] = 1;
  // 姿势字段：wph 波相 0–3 · amp 波幅 · bob · alt 离地（8 = 悬浮）· coil 盘紧 · curl 尾尖上卷 · head 抬 - / 低 + · jaw · glow 口中发光
  //   claw 前爪 0 托珠 / 1 高举 / 2 前推 · legs 0 垂爪 / 1 收在身下 · orb 龙珠 0 常 / 1 亮 / 2 很亮 / 3 爆闪 / 4 熄灭 · gray 灰鳞 0–8（从尾到头）
  //   whisk 龙须 -2 前甩 … 2 后吹 · eyes · lie 坠地 · drop / dsx / dsy 龙珠掉落（B.COMMON）
  const SPEC = [['wph', 0, 3], ['amp', 0, 3], ['bob', -1, 1], ['alt', 0, 10], ['coil', 0, 2], ['curl', -1, 3], ['head', -2, 2], ['jaw', 0, 3], ['glow', 0, 1],
    ['claw', 0, 2], ['legs', 0, 1], ['orb', 0, 4], ['gray', 0, 8], ['whisk', -2, 2], ['eyes', 0, 1], ['lie', 0, 1]].concat(B.COMMON);
  const P = {};
  function reset() {
    P.wph = 0; P.amp = 2; P.bob = 0; P.alt = 8; P.coil = 0; P.curl = 0; P.head = 0; P.jaw = 0; P.glow = 0; P.claw = 0; P.legs = 0; P.orb = 0; P.gray = 0; P.whisk = 0; P.eyes = 0; P.lie = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.flip = 0; P.mx = 0; P.drop = 0; P.dsx = 0; P.dsy = 0;
  }
  reset();

  // ───── 骨架：S 形脊线（纯函数，poseAt 和 drawHero 各算一次）─────
  const N = 40, SX = new Float32Array(N), SY = new Float32Array(N), SR = new Float32Array(N), NX = new Float32Array(N), NY = new Float32Array(N);
  let LEN = 30;
  const H = { x: 0, y: 0, a: 0, W: 3, Hh: 2.5 };
  const HR = { head: H, eye: [0, 0], mouth: [0, 0], lie: 0 };
  function spine() {
    LEN = 30 - P.coil * 3.5;
    const amp = P.amp + (P.coil ? 0.5 * P.coil : 0), ph = P.wph * Math.PI / 2, Yc = -3 - P.alt + P.bob, rise = P.lie ? 1.5 : 5;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1); let x = 9 - s * LEN, y = Yc + amp * Math.sin(TAU * 0.95 * s - ph + 0.6) * clamp01(s / 0.22);
      if (s < 0.14) { const q = 1 - s / 0.14; y -= rise * q * q; x += 1.5 * q; }
      if (s > 0.76) { const q = (s - 0.76) / 0.24; y -= P.curl * 2.4 * q * q; x += P.curl * 1.6 * q * q * q; }
      const r = s < 0.2 ? lerp(2.1, 3.2, s / 0.2) : s < 0.4 ? 3.2 : lerp(3.2, 0.6, (s - 0.4) / 0.6);
      SX[i] = x; SY[i] = Math.min(y, -r + 0.2); SR[i] = r;
    }
    for (let i = 0; i < N; i++) { const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1), tx = SX[b] - SX[a], ty = SY[b] - SY[a], l = Math.hypot(tx, ty) || 1; NX[i] = ty / l; NY[i] = -tx / l; }
    // 头：接在脊线第 0 点（颈顶）
    const ha = 0.15 + P.head * 0.2 + (P.lie ? 0.45 : 0);
    H.a = ha; H.x = SX[0] + Math.cos(ha) * H.W * 0.6; H.y = SY[0] + Math.sin(ha) * H.W * 0.6 - H.Hh * 0.3;
    if (P.lie) H.y = Math.min(H.y, -H.Hh + 0.3);
    const uT = H.W + HEAD.hd.snout, vc = H.Hh * 0.2;
    HR.eye = U.toW(H.x, H.y, ha, H.W * 0.4, -H.Hh * 0.35); HR.mouth = U.toW(H.x, H.y, ha, uT - 0.5, vc + 0.5);
  }
  // 腿根（脊线第 i 点的腹侧）和脚
  const LEG_I = [6, 19];                                                          // 前腿、后腿在脊线上的位置
  function legPts(front, far) {
    const i = LEG_I[front ? 0 : 1], r = SR[i], bx = SX[i] + NX[i] * (r - 1.2) + (far ? -2 : 0), by = SY[i] + NY[i] * (r - 1.2) - (far ? 1 : 0);
    let fx, fy;
    if (front && !far) {
      if (P.claw === 1) { fx = bx + 4; fy = by - 3; } else if (P.claw === 2) { fx = bx + 6; fy = by; } else { fx = bx + 3; fy = by + 3; }
    } else if (P.legs === 1) { fx = bx - 4; fy = by + 1.5; }
    else { fx = bx + (front ? 2 : 1); fy = by + 3 + (far ? 0 : 0); }
    return [bx, by, fx, Math.min(fy, -1)];
  }
  function orbAt() {
    if (P.drop) { const l = legPts(true, false); return [l[2] + 1 + P.dsx, -1.5 - P.dsy]; }
    const l = legPts(true, false); return P.claw === 1 ? [l[2] + 1, l[3] - 2] : P.claw === 2 ? [l[2] + 2, l[3] - 1] : [l[2] + 1, l[3] - 2];
  }

  // ───── 自画部件 ─────
  // 候选部件：serpentBody 东方龙蛇身（按脊线逐像素栅格化：最近脊点 → 弧长 u、腹背偏移 v；腹侧浅色腹鳞 + 腹甲分隔，背侧鳞纹；gray 从尾到头换成灰鳞）
  function body() {
    part();
    let x0 = 99, x1 = -99, y0 = 99; for (let i = 0; i < N; i++) { x0 = Math.min(x0, SX[i] - SR[i]); x1 = Math.max(x1, SX[i] + SR[i]); y0 = Math.min(y0, SY[i] - SR[i]); }
    const gs = 1 - P.gray / 8;
    for (let y = Math.floor(y0) - 1; y <= 0; y++) for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++) {
      let best = 1e9, bi = 0; for (let i = 0; i < N; i++) { const d = Math.hypot(x - SX[i], y - SY[i]) - SR[i]; if (d < best) { best = d; bi = i; } }
      if (best > 0.3) continue;
      const s = bi / (N - 1), v = (x - SX[bi]) * NX[bi] + (y - SY[bi]) * NY[bi], u = R(s * LEN), w = R(v + 8);
      const gray = s > gs + 1e-6 && P.gray > 0;
      if (v >= SR[bi] * 0.3 && s > 0.03 && s < 0.86) { U.dot(E, x, y, m.belly, (u % 3) === 0 ? 2 : 0); continue; }
      const scale = ((u + (w & 2)) % 4) === 0 && (w & 1) === 0 && s > 0.02;
      U.dot(E, x, y, gray ? m.gray : m.body, scale ? 2 : 0);
    }
  }
  // 候选部件：spineFins 背脊鬃鳍（沿脊线背侧每 3 个脊点一片往后掠的鳍；画在躯干之前，只露出伸出背线的部分）
  function fins() {
    part(); const sw = P.whisk * 0.3;
    for (let i = 2; i < N - 5; i += 3) {
      const s = i / (N - 1), r = SR[i], L = 2 + (s > 0.1 && s < 0.6 ? 1 : 0), tx = SX[i] - NX[i] * (r - 0.3), ty = SY[i] - NY[i] * (r - 0.3);
      for (let k = 0; k <= L; k++) { U.dot(E, tx - NX[i] * k - (0.7 + sw) * k, ty - NY[i] * k, m.mane, k === L ? 4 : 0); if (k < L) U.dot(E, tx - NX[i] * k - (0.7 + sw) * k + 1, ty - NY[i] * k, m.mane, 0); }
    }
  }
  // 候选部件：tailTuft 尾尖鬃簇（4 缕，顺着尾巴方向散开，随 whisk 摆）
  function tailTuft() {
    part(); const i = N - 1, tx = SX[i] - SX[i - 2], ty = SY[i] - SY[i - 2], l = Math.hypot(tx, ty) || 1, a0 = Math.atan2(ty / l, tx / l) + P.whisk * 0.12;
    for (const [da, L] of [[-0.9, 3], [-0.35, 5], [0.2, 4], [0.7, 3]]) {
      const a = a0 + da; for (let k = 0; k <= L; k++) U.dot(E, SX[i] + Math.cos(a) * k, SY[i] + Math.sin(a) * k - (k > 2 ? (k - 2) * 0.3 : 0), m.mane, k === L ? 4 : k === 0 ? 2 : 0);
    }
  }
  // 候选部件：antler 分叉鹿角（主干后掠 + 一根前叉；far 暗一级、错开 2 格）
  function antler(far) {
    part(); const b = U.toW(H.x, H.y, H.a, -H.W * 0.25, -H.Hh + 0.4), x = b[0] + (far ? 2 : 0), y = b[1] - (far ? 1 : 0), mat = far ? m.antlerFar : m.antler;
    U.seg(E, x, y, x - 1, y - 2, 1, mat, 0); U.seg(E, x - 1, y - 2, x - 2, y - 4, 1, mat, 0); U.seg(E, x - 2, y - 4, x - 4, y - 5, 1, mat, 0); U.dot(E, x - 5, y - 5, mat, 4);
    U.seg(E, x - 1, y - 3, x + 0, y - 5, 1, mat, 0); U.dot(E, x + 0, y - 6, mat, 4);
  }
  // 候选部件：whisker 龙须（从吻部下沿垂下、往后飘的一根细须，越往梢摆得越多）
  function whisker(far) {
    part(); const F = Q.headFrame(HR, HEAD, P.jaw), st = F.at(F.uT - 1.8, F.vc + 1.3), mat = far ? m.maneFar : m.mane;
    let x = st[0] + (far ? 1 : 0), y = st[1] - (far ? 1 : 0), a = 2.05 + P.whisk * 0.16 + (far ? -0.25 : 0);
    for (let k = 0; k < 7; k++) { U.dot(E, x, y, mat, k === 6 ? 4 : 0); a += 0.06 * P.whisk + (k > 3 ? -0.12 : 0.05); x += Math.cos(a); y += Math.sin(a) * 0.8; }
  }
  // 候选部件：clawLeg 短爪腿（腿根 → 脚一段渐细，脚尖两枚骨白爪）
  function leg(front, far) {
    part(); const [bx, by, fx, fy] = legPts(front, far), mat = far ? m.far : m.limb;
    U.taper(E, bx, by, fx, fy, 1.3, 0.8, mat, 0);
    const d = fx >= bx ? 1 : -1; U.dot(E, fx + d, fy, m.claw, 3); U.dot(E, fx + d, fy + 1, m.claw, 2);
  }
  // 候选部件：dragonPearl 龙珠（4×4 圆珠；lv 0 常 · 1 芯亮 · 2 很亮 · 3 爆闪 · 4 熄灭）
  const ORB_PX = [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]];
  function orb() {
    part(); const [ox, oy] = orbAt(), cx = R(ox), cy = R(oy) - 1, lv = P.orb;
    for (const [i, j] of ORB_PX) {
      let mat = m.orb, t = 0; const core = (i === 0 || i === 1) && (j === 0 || j === 1);
      if (lv === 4) t = j <= 0 ? 2 : 1;
      else if (lv === 3) { mat = core ? m.orbCore : m.orbHot; }
      else if (lv === 2) { if (core) mat = i === 0 && j === 0 ? m.orbCore : m.orbHot; else t = j < 1 ? 4 : 3; }
      else if (lv === 1) { if (i === 0 && j === 0) mat = m.orbHot; else if (core) t = 4; }
      else if (i === 0 && j === 0) t = 4;
      U.dot(E, cx + i, cy + j, mat, t);
    }
  }
  function drawHero() {
    spine(); begin(hero, P.bx, 0);
    antler(1); whisker(1);
    leg(true, true); leg(false, true);
    fins(); body();
    leg(false, false);
    Q.head(E, HR, P, HEAD);
    antler(0); whisker(0); tailTuft();
    leg(true, false);
    orb();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 姿势 ─────
  const T_HIT = 2 / 12, T_BEAM = 2 / 12, T_PULSE = 0.34, T_FALL = INCOMING + 0.66, T_ORBOFF = INCOMING + 1.3;
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1 ? -1 : 0; P.amp = 3; P.wph = Math.floor(TT * 1.25 + 1e-6) & 3; P.whisk = [0, 1, 0, -1][(b + 1) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.curl = [1, 2, 3, 2, 1][k]; P.head = k >= 1 && k <= 3 ? 1 : 0; P.orb = k === 2 || k === 3 ? 1 : 0; P.eyes = k === 2 ? 1 : 0; }   // 盘珠：尾巴卷上来、低头看珠
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset(); P.st = st;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                          // 游弋：S 形波从头往尾推，四爪收在身下
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.wph = f; P.amp = 3; P.bob = [0, -1, 0, 1][f]; P.legs = 1; P.whisk = [1, 2, 1, 0][f]; P.curl = f & 1 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { P.head = -2; P.jaw = 1; P.bx = -1; P.orb = 1; P.whisk = 1; P.curl = 1; }   // 昂头
      else if (tq < 0.25) { P.head = 1; P.jaw = 3; P.glow = 1; P.bx = 1; P.orb = 1; P.whisk = 2; P.rim = 1; }   // 张嘴吐出
      else if (tq < 0.45) { P.head = 1; P.jaw = 2; P.glow = 1; P.bx = 1; P.whisk = 1; }
      else { const q = (tq - 0.45) / 0.3; P.head = q < 0.5 ? 1 : 0; P.jaw = q < 0.4 ? 1 : 0; P.bx = q < 0.3 ? 1 : 0; }
    } else if (st === CHARGE) {                                                      // 盘紧、举珠，鳞片从尾到头一格格转灰
      const q = ease.inOut(clamp01(tq / 0.7)); P.coil = R(q * 2); P.amp = 2 + (q > 0.5 ? 1 : 0); P.claw = q > 0.4 ? 1 : 0; P.head = q > 0.3 ? 1 : 0; P.whisk = -R(q * 2) + 2 * (q > 0.5 ? 1 : 0);
      P.gray = Math.max(0, Math.min(5, Math.floor((tq - 0.25) / 0.19) + 1)); if (tq < 0.25) P.gray = 0;
      P.orb = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; P.wph = (f12 >> 2) & 1; if (tq > 1.1) P.bob = f12 & 1 ? -1 : 0;
    } else if (st === CAST) {                                                        // 张口朝友军吐光带，身体下沉 1 格
      P.coil = 2; P.amp = 3; P.claw = 1; P.head = 1; P.jaw = 3; P.glow = 1; P.orb = 3; P.gray = 5; P.alt = 7; P.rim = 3; P.whisk = 2;
      if (tq >= 0.3) { P.jaw = 2; P.orb = 2; }
    } else if (st === RECOVER) {                                                     // 鳞片慢慢回翠，只恢复一半
      const q = ease.inOut(clamp01(tq / 0.6)); P.coil = R(2 * (1 - q)); P.amp = 2 + (q < 0.5 ? 1 : 0); P.claw = q < 0.5 ? 1 : 0; P.head = q < 0.6 ? 1 : 0; P.jaw = q < 0.3 ? 1 : 0;
      P.gray = Math.max(2, R(5 - 3 * q)); P.orb = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.alt = q < 0.4 ? 7 : 8; P.whisk = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.head = -1; P.whisk = -2; P.curl = -1; P.amp = 1; P.jaw = 1; P.flash = h < 1 / 12 ? 1 : 0; P.orb = 1; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.whisk = -1; P.amp = 1; }
      else { P.whisk = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        P.eyes = 1; P.bx = -2; P.whisk = -2;
        if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.head = -1; P.amp = 1; P.alt = d < 0.15 ? 8 : 7; P.orb = (f12 & 1) ? 1 : 4; P.jaw = 1; }
        else if (d < 0.5) { P.head = 2; P.amp = 1; P.alt = 5; P.curl = 1; P.jaw = 1; }
        else { P.lie = 1; P.head = 2; P.amp = 0; P.curl = 2; P.jaw = 1; P.alt = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.whisk = d < 0.66 ? -2 : 1; P.gray = Math.min(8, Math.max(0, R((d - 0.66) / 0.64 * 8))); if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
        // 龙珠：失衡那一刻熄灭脱手，坠地后往前滚，1.3 s 最后一闪熄灭
        if (d >= 0.3) {
          if (d < 0.55) { const q = (d - 0.3) / 0.25; P.drop = 1; P.dsx = R(3 * q); P.dsy = R(Math.max(0, 9 * (1 - q * q))); }
          else { const q = clamp01((d - 0.55) / 0.6); P.drop = 2; P.dsx = R(3 + 9 * ease.out(q)); P.dsy = 0; }
          P.orb = d < 1.0 ? 4 : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    spine();
    const g = orbAt(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]) - 1;
    B.key(P, SPEC);
  }
  const HIT_POINT = [2, -12];

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, trailAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, redT = 9, healT = 9;
  const CN = 14, cX = new Float32Array(CN), cY = new Float32Array(CN), cT = new Float32Array(CN).fill(9), cL = new Float32Array(CN);   // 十字治疗光点（预分配）
  function cross(x, y, life) { let o = 0; for (let k = 0; k < CN; k++) if (cT[k] / cL[k] > cT[o] / cL[o] || cT[k] >= cL[k]) { o = k; if (cT[k] >= cL[k]) break; } cX[o] = x; cY[o] = y; cT[o] = 0; cL[o] = life; }
  const mouthScr = () => [scrX(R(HR.mouth[0]) + P.bx), HY + R(HR.mouth[1])];
  const DX = DUMMY_X, DY = HY - 15;
  function ally() { const a = allyPoints()[0]; return a || { x: ALLY_X[0], y: HY, top: HY - 16, mid: HY - 8 }; }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [mx, my] = mouthScr(), a = ally();
      releaseOrbit(20, 50, 0.3, 0.6, { pts: 1, to: [a.x, a.mid - 2, 2.2], ramp: R_EL });   // 汇进龙珠的生命光点跟着光带流向友军
      fx.link(mx + 1, my, a.x - 1, a.mid - 3, R_EL, 2 / 12, 2);
      burst(scrX(P.gx), HY + P.gy, 12, 25, 60, 0.25, 0.5, R_EL, 6); ring(mx + 1, my, 0, R_EL);
      shake(0.28, 2); flash(0.05); redT = 0; mzT = 0; mzX = mx; mzY = my;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [mx, my] = mouthScr(); mzT = 0; mzX = mx; mzY = my;
      const tx = DX - 4, vx = 150, vy = (DY - my) / ((tx - mx) / vx);
      shoot(1, mx + 2, my, vx, tx, R_EL, vy, { trail: { every: 2, life: [0.15, 0.3], back: [8, 20] } });
      burst(mx + 1, my, 5, 15, 40, 0.15, 0.3, R_EL, 2);
      sfx('swing', { kind: 'bite', w: 0.4 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_BEAM) {                                                // 连线渐粗成光束，打在友军身上
      const [mx, my] = mouthScr(), a = ally();
      fx.beam(mx + 1, my, a.x - 1, a.mid - 3, 2, R_EL, 0.3, 2);
      ring(a.x, a.mid - 3, 1, R_EL); burst(a.x, a.mid - 3, 16, 20, 60, 0.3, 0.6, R_EL, 10);
      allyFx({ dur: 1.1, outline: R_EL }); healT = 0; shake(0.12, 1);
      for (let k = 0; k < 4; k++) cross(a.x - 5 + k * 3.3, a.mid - 2 - (k & 1) * 4, 0.7 + k * 0.08);
      sfx('impact', { pal: 'nature', w: 0.5 });
    }
    if (s === CAST && t === T_PULSE) { const a = ally(); for (let k = 0; k < 3; k++) cross(a.x - 4 + k * 4, a.top + 2 - k, 0.6 + k * 0.1); fx.cross(a.x, a.top - 3, 4, R_EL, 0.25, 2); sfx('impact', { pal: 'nature', w: 0.3 }); }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 70, 0.2, 0.4, R_SCALE, 12);
    if (s === DEATH && t === T_FALL) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === T_ORBOFF) { const x = scrX(P.gx), y = HY + P.gy; burst(x, y, 8, 10, 30, 0.3, 0.5, R_EL, 8); }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_BEAM, T_PULSE], [], [INCOMING], [T_FALL, T_ORBOFF], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 30, 80, 0.15, 0.4, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15, 2); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.35 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > 0.25) {                                            // 灰鳞那一段抽出青玉光点，汇进龙珠
      chargeAcc += dt * (14 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const i = Math.min(N - 1, Math.max(4, R((1 - P.gray / 8) * (N - 1) + Math.random() * 8))), sx = scrX(R(SX[i]) + P.bx), sy = HY + R(SY[i]) - 1;
        const dx = sx - gx, dy = sy - gy, r = Math.hypot(dx, dy); spawnX(K_SPIRAL_PT, gx, gy, (r - 3) / (0.5 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy / 0.75, dx), r, w: 2 + Math.random() * 2, tx: gx, ty: gy, orbitR: 3 });
      }
    }
    if (state === MOVE) {                                                             // 身下拖 1–2 颗翠绿粒子
      trailAcc += dt * 9; while (trailAcc >= 1) { trailAcc -= 1; const i = 14 + ((Math.random() * 20) | 0); spawn(K_DUST, scrX(R(SX[i])), HY + R(SY[i] + SR[i]) + 1, (P.flip ? 1 : -1) * (6 + Math.random() * 8), 2 + Math.random() * 4, 0.35 + Math.random() * 0.25, R_SCALE); }
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.8 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 4 - 1), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 32, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL); } }
    mzT += dt; redT += dt; healT += dt; for (let k = 0; k < CN; k++) { cT[k] += dt; cY[k] -= dt * 9; }
    if (state === CAST || state === RECOVER) lastGf = -9;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; trailAcc = 0; lastGf = -9; mzT = 9; redT = 9; healT = 9; cT.fill(9); cL.fill(1); }
  fxReset();
  function fxBack(f12) {
    if (!P.lie && P.dq < 1) groundShadow(scrX(0), 13, P.alt + 4);
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (redT < 1 / 12) blitShape(hero, HX + P.mx, HY, P.flip, FXR[R_RED][2], 0.5);   // 付出生命：自身闪红 1 帧
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.orb >= 2 && P.orb <= 3 && P.dq < 1) { const L = P.orb === 3 ? 5 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = r === 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2], d = P.flip ? -1 : 1; for (let r = 1; r <= 3; r++) { put(mzX + r * d, mzY, r < 3 ? c : EL[2]); put(mzX + (r - 1) * d, mzY - 1, EL[1]); put(mzX + (r - 1) * d, mzY + 1, EL[2]); } }
    for (let k = 0; k < CN; k++) {                                                    // 十字治疗光点：白 → 淡翠 → 青玉 → 深翠
      if (cT[k] >= cL[k]) continue; const q = cT[k] / cL[k], c = EL[q < 0.15 ? 0 : q < 0.4 ? 1 : q < 0.7 ? 2 : 3], x = R(cX[k]), y = R(cY[k]);
      if (q > 0.75 && ((f12 + k) & 1)) continue;
      put(x, y, c); if (q < 0.7) { put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, c); }
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                            // 青玉吐息弹：菱形 + 白芯 + 后拖两格
    if (k !== 1) return false;
    put(x, y, Rr[0]); put(x + d, y, Rr[0]); put(x - d, y, Rr[1]); put(x, y - 1, Rr[1]); put(x, y + 1, Rr[1]); put(x + d, y - 1, Rr[2]); put(x + d, y + 1, Rr[2]); put(x + 2 * d, y, Rr[1]);
    put(x - 2 * d, y, Rr[2]); put(x - 3 * d, y + ((f12 & 1) ? 1 : 0), Rr[3]); return true;
  }

  return {
    name: '青龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.orb, m.orbHot, m.orbCore, m.glow], HIT_POINT, EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'collapse', pal: 'nature', style: 'heal', w: 0.5, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
