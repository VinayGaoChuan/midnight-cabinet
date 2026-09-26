// 天龙（部队 · 自然 · 牧师 · 史诗）：青龙修成正果——同一条东方龙，身体更长更粗、盘成一个大 C 形，四爪更健壮，
// 背上长出一对白羽大翼，鹿角变成三叉、两角之间悬一圈淡金光环，龙须和鬃鳍变成白色云鬃，身下托着一朵卷云，前爪高举更大的天青龙珠。
// 攻击：前爪把龙珠往前一推，龙珠射出一道细长的天青光束；技能「灵魂转移」：羽翼全张、光环亮起旋转，一缕缕淡蓝魂光从龙身升起汇进龙珠 →
// 龙珠朝天一举，一道天青光柱从天而降落在友军身上，自身一闪变淡 → 友军脚下天青法阵、羽毛状光点上飘。
// 死亡：化云消散——光环熄灭、羽翼垂落，身体从尾到头一节节化成白云团，最后头也散成云；龙珠坠地，一闪后熄灭。
// 蛇身、短爪腿、三叉鹿角、光环、云鬃、龙珠、卷云是本模块的自画部件（候选部件，和青龙同一套画法放大）；头用 quad.head；羽翼是本模块的分羽大翼 featherWing（翼姿沿用 B.WINGS）。
PCD.define('SkyDragon', (E) => {
  const { Sprite, ramp, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, groundShadow, allyPoints, allyFx } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('skyCloud', [21, '#c4e8ff', '#7ab0e8', '#3a70b8', '#1f3f7a']), EL = FXR[R_EL];   // 灵魂转移 · 天青云光
  const R_CLOUD = fxRamp('whiteCloud', [21, 17, 18, 60, 59]);                                          // 云团、云尾、化云
  const R_HALO = FXI.holy, HL = FXR[R_HALO];
  const m = B.mats(E, {
    main: ramp(['#0a1a38', '#1f3f7a', '#3a70b8', '#7ab0e8']),          // 天青龙鳞
    belly: [20, 14, 5, 51],                                            // 淡金腹鳞
    mane: ramp(['#1f3f7a', '#7ab0e8', '#ebe9e1', '#ffffff']),          // 白色云鬃：天青淡蓝阴影（和羽翼的苍灰阴影分开）
    feather: [8, 60, 17, 21], cloud: [59, 60, 17, 21],                 // 白羽翼：pale 勾线 / 暗、亮档 white · 卷云
    antler: 'bone', claw: 'bone', teeth: 'white', halo: [20, 14, 51, 21],
    orb: ramp(['#1f3f7a', '#7ab0e8', '#c4e8ff', '#ffffff']),           // 天青龙珠
    glow: ramp(['#7ab0e8', '#7ab0e8', '#c4e8ff', '#c4e8ff']),
  });
  m.orbHot = E.defMat(ramp(['#c4e8ff', '#c4e8ff', '#ffffff', '#ffffff']), 1, 1);
  m.orbCore = E.defMat([21, 21, 21, 21], 1, 1);
  m.haloHot = E.defMat([51, 51, 21, 21], 1, 1);
  m.antlerFar = E.defMat([8, 7, 7, 6], 1); m.maneFar = E.defMat(ramp(['#0a1a38', '#1f3f7a', '#7ab0e8', '#7ab0e8']), 1);
  m.featherFar = E.defMat([8, 59, 60, 17], 1);                        // 远翼：整体暗一级（pale）
  const HEAD = Q.shape({ head: { type: 'dragon', w: 7, h: 6, snout: 6, snH: 3.6, tip: 0.7, horn: '', teeth: 2 }, m });
  const WING = { span: 19, chord: 7, fingers: 6 };                     // 翼展 19（展开宽约 20 格），6 根初级飞羽

  const HX = 36, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 60, 50, 54), ALLY_X = [80];
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 21], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'antler', 'antlerFar', 'orb', 'orbHot', 'orbCore', 'mane', 'maneFar', 'glow', 'halo', 'haloHot', 'cloud', 'feather', 'featherFar']) RIM.skip[m[k]] = 1;
  // 姿势字段：同青龙（wph amp bob alt coil curl head jaw glow claw legs orb whisk eyes）
  //   wing 翼姿 0–6（B.WINGS）· halo 光环 0 熄 / 1 常 / 2 亮 / 3 爆闪 · hph 光环旋转相位 0–3 · toss 抛珠高 0–3 · cl 化云 0–8（从尾到头）
  //   hc 头化云 0–5（1 角须散 · 2 头后半成云 · 3 头大半成云 · 4 只剩云团 · 5 散尽）· we 羽翼化云 0–4 · ce 卷云化云 0–3
  //   drop / dsx / dsy 龙珠坠地（B.COMMON）
  const SPEC = [['wph', 0, 3], ['amp', 0, 4], ['bob', -1, 1], ['alt', 0, 13], ['coil', 0, 2], ['curl', -1, 3], ['head', -2, 2], ['jaw', 0, 3], ['glow', 0, 1],
    ['claw', 0, 2], ['orb', 0, 4], ['whisk', -2, 2], ['eyes', 0, 1], ['wing', 0, 6], ['halo', 0, 3], ['hph', 0, 3], ['toss', 0, 3], ['cl', 0, 8],
    ['hc', 0, 5], ['we', 0, 4], ['ce', 0, 3]].concat(B.COMMON);
  const P = {};
  function reset() {
    P.wph = 0; P.amp = 3; P.bob = 0; P.alt = 12; P.coil = 0; P.curl = 0; P.head = 0; P.jaw = 0; P.glow = 0; P.claw = 0; P.orb = 0; P.whisk = 0; P.eyes = 0;
    P.wing = 4; P.halo = 1; P.hph = 0; P.toss = 0; P.cl = 0; P.hc = 0; P.we = 0; P.ce = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.flip = 0; P.mx = 0; P.drop = 0; P.dsx = 0; P.dsy = 0;
  }
  reset();

  // ───── 骨架：大 C 形脊线 ─────
  const N = 44, SX = new Float32Array(N), SY = new Float32Array(N), SR = new Float32Array(N), NX = new Float32Array(N), NY = new Float32Array(N);
  let LEN = 40;
  const H = { x: 0, y: 0, a: 0, W: 3.5, Hh: 3 };
  const HR = { head: H, eye: [0, 0], mouth: [0, 0], lie: 0 };
  function spine() {
    LEN = 40 - P.coil * 4;
    const amp = P.amp + 0.5 * P.coil, ph = P.wph * Math.PI / 2, Yc = -P.alt + P.bob;
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1), hq = clamp01((s - 0.1) / 0.66); let x = 12 - s * LEN;
      let y = Yc - (amp + 1) * Math.sin(Math.PI * hq) + Math.sin(TAU * 1.3 * s - ph) * clamp01((s - 0.15) / 0.2);   // 中段拱成一个大 C（侧放的 ∩）+ 游动的小波
      if (s < 0.13) { const q = 1 - s / 0.13; y -= 7 * q * q; x += 2 * q; }
      if (s > 0.76) { const q = (s - 0.76) / 0.24; y += 3 * Math.sin(Math.PI * q) - (P.curl + 1) * 2.2 * q * q * q; x += (P.curl + 1) * 1.6 * q * q * q; }   // 尾先垂下再往前卷回
      const r = s < 0.18 ? lerp(2.8, 4.2, s / 0.18) : s < 0.42 ? 4.2 : lerp(4.2, 0.7, (s - 0.42) / 0.58);
      SX[i] = x; SY[i] = Math.min(y, -r + 0.2); SR[i] = r;
    }
    for (let i = 0; i < N; i++) { const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1), tx = SX[b] - SX[a], ty = SY[b] - SY[a], l = Math.hypot(tx, ty) || 1; NX[i] = ty / l; NY[i] = -tx / l; }
    const ha = 0.12 + P.head * 0.2;
    H.a = ha; H.x = SX[0] + Math.cos(ha) * H.W * 0.6; H.y = SY[0] + Math.sin(ha) * H.W * 0.6 - H.Hh * 0.3;
    const uT = H.W + HEAD.hd.snout, vc = H.Hh * 0.2;
    HR.eye = U.toW(H.x, H.y, ha, H.W * 0.4, -H.Hh * 0.35); HR.mouth = U.toW(H.x, H.y, ha, uT - 0.5, vc + 0.5);
  }
  const LEG_I = [7, 24], CLOUD_I = 16;
  function legPts(front, far) {
    const i = LEG_I[front ? 0 : 1], r = SR[i], bx = SX[i] + NX[i] * (r - 1.5) + (far ? -2 : 0), by = SY[i] + NY[i] * (r - 1.5) - (far ? 1 : 0);
    let fx, fy;
    if (front && !far) {
      if (P.claw === 1) { fx = bx + 5; fy = by - 9; } else if (P.claw === 2) { fx = bx + 8; fy = by - 4; } else { fx = bx + 5; fy = by - 7; }   // 前爪高举龙珠（常态就举到头下方）
    } else { fx = bx + (front ? 2 : 1); fy = by + 4; }
    return [bx, by, fx, Math.min(fy, -1)];
  }
  function orbAt() {
    const l = legPts(true, false);
    if (P.drop) return [l[2] + 1 + P.dsx, -2 - P.dsy];
    return [l[2] + 1, l[3] - 3 - P.toss];
  }
  function wingRoot() { const i = 13, r = SR[i]; return [SX[i] - NX[i] * (r - 1), SY[i] - NY[i] * (r - 1)]; }
  const bodyOn = (i) => P.cl < 8 && i / (N - 1) <= 1 - P.cl / 8 + 1e-6;                       // 化云：从尾到头逐节消失
  // 候选部件：eroder 化散画笔（包一层 E：按像素哈希跳过 lv 比例的像素，部件原样调用就能一点点散掉）
  const D = Object.create(E); let eroLv = 0;
  D.sp = (x, y, mm, t) => { if (eroLv <= 0 || U.hash(Math.round(x) * 3 + 101, Math.round(y) * 5 + 57) >= eroLv) E.sp(x, y, mm, t); };
  const ero = (lv) => { eroLv = lv; };

  // ───── 自画部件 ─────
  // 候选部件：serpentBody（同青龙；cl > 0 时尾段逐节化掉）
  function body() {
    part();
    let x0 = 99, x1 = -99, y0 = 99; for (let i = 0; i < N; i++) { x0 = Math.min(x0, SX[i] - SR[i]); x1 = Math.max(x1, SX[i] + SR[i]); y0 = Math.min(y0, SY[i] - SR[i]); }
    for (let y = Math.floor(y0) - 1; y <= 0; y++) for (let x = Math.floor(x0) - 1; x <= Math.ceil(x1) + 1; x++) {
      let best = 1e9, bi = 0; for (let i = 0; i < N; i++) { const d = Math.hypot(x - SX[i], y - SY[i]) - SR[i]; if (d < best) { best = d; bi = i; } }
      if (best > 0.3 || !bodyOn(bi)) continue;
      const s = bi / (N - 1), v = (x - SX[bi]) * NX[bi] + (y - SY[bi]) * NY[bi], u = R(s * LEN), w = R(v + 8);
      if (v >= SR[bi] * 0.3 && s > 0.03 && s < 0.86) { U.dot(D, x, y, m.belly, (u % 3) === 0 ? 2 : 0); continue; }
      const scale = ((u + (w & 2)) % 4) === 0 && (w & 1) === 0 && s > 0.02;
      U.dot(D, x, y, m.body, scale ? 2 : 0);
    }
  }
  // 候选部件：cloudMane 白色云鬃（鬃鳍换成圆头的卷云簇：每 3 个脊点一团，往后卷）
  function fins() {
    part(); const sw = P.whisk * 0.3;
    for (let i = 2; i < N - 5; i += 3) {
      if (!bodyOn(i)) continue;
      const s = i / (N - 1), r = SR[i], L = 2 + (s > 0.1 && s < 0.6 ? 1 : 0), tx = SX[i] - NX[i] * (r - 0.3), ty = SY[i] - NY[i] * (r - 0.3);
      for (let k = 0; k <= L; k++) { U.dot(D, tx - NX[i] * k - (0.8 + sw) * k, ty - NY[i] * k, m.mane, k === L ? 4 : 0); U.dot(D, tx - NX[i] * k - (0.8 + sw) * k + 1, ty - NY[i] * k, m.mane, 0); }
      U.dot(D, tx - NX[i] * L - (0.8 + sw) * L - 1, ty - NY[i] * L + 1, m.mane, 2);   // 卷云的回勾
    }
  }
  function tailTuft() {
    if (P.cl) return; part(); const i = N - 1, tx = SX[i] - SX[i - 2], ty = SY[i] - SY[i - 2], l = Math.hypot(tx, ty) || 1, a0 = Math.atan2(ty / l, tx / l) + P.whisk * 0.12;
    for (const [da, L] of [[-1.0, 3], [-0.45, 5], [0.1, 6], [0.6, 4], [1.1, 3]]) { const a = a0 + da; for (let k = 0; k <= L; k++) U.dot(D, SX[i] + Math.cos(a) * k, SY[i] + Math.sin(a) * k - (k > 2 ? (k - 2) * 0.3 : 0), m.mane, k === L ? 4 : k === 0 ? 2 : 0); }
  }
  // 候选部件：antler3 三叉鹿角（主干后掠 + 两根前叉）
  function antlerBase(far) { const b = U.toW(H.x, H.y, H.a, -H.W * 0.25, -H.Hh + 0.4); return [b[0] + (far ? 3 : 0), b[1] - (far ? 1 : 0)]; }
  function antler(far) {
    part(); const [x, y] = antlerBase(far), mat = far ? m.antlerFar : m.antler;
    U.seg(D, x, y, x - 1, y - 3, 1, mat, 0); U.seg(D, x - 1, y - 3, x - 3, y - 5, 1, mat, 0); U.seg(D, x - 3, y - 5, x - 5, y - 6, 1, mat, 0); U.dot(D, x - 6, y - 6, mat, 4);
    U.seg(D, x - 1, y - 3, x + 0, y - 6, 1, mat, 0); U.dot(D, x + 0, y - 7, mat, 4);
    U.seg(D, x - 3, y - 5, x - 3, y - 8, 1, mat, 0); U.dot(D, x - 3, y - 9, mat, 4);
    if (!far) U.dot(D, x, y - 1, mat, 3);
  }
  // 候选部件：halo 光环（悬在两支鹿角之间、近侧鹿角压在它前面；lv 0 熄灭 · 1 常 · 2 亮 · 3 爆闪，hph 亮点旋转）
  const HALO_PTS = []; for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; HALO_PTS.push([Math.cos(a) * 3.6, Math.sin(a) * 1.4]); }
  function halo() {
    if (P.cl >= 6 || P.hc >= 2) return;
    part(); const [ax, ay] = antlerBase(0), cx = ax - 3, cy = ay - 7, lv = P.halo;
    const seen = new Set();
    for (let k = 0; k < 12; k++) {
      const x = R(cx + HALO_PTS[k][0]), y = R(cy + HALO_PTS[k][1]), key = x * 100 + y; if (seen.has(key)) continue; seen.add(key);
      const hot = lv >= 2 && ((k + P.hph * 3) % 12 < 3 || lv === 3);
      U.dot(D, x, y, hot ? m.haloHot : m.halo, lv === 0 ? 1 : hot ? 0 : lv === 1 ? 3 : 4);
    }
  }
  function whisker(far) {
    part(); const F = Q.headFrame(HR, HEAD, P.jaw), st = F.at(F.uT - 2, F.vc + 1.5), mat = far ? m.maneFar : m.mane;
    let x = st[0] + (far ? 1 : 0), y = st[1] - (far ? 1 : 0), a = 2.1 + P.whisk * 0.16 + (far ? -0.25 : 0);
    for (let k = 0; k < 9; k++) { U.dot(D, x, y, mat, k === 8 ? 4 : 0); a += 0.06 * P.whisk + (k > 4 ? -0.12 : 0.04); x += Math.cos(a); y += Math.sin(a) * 0.8; }
  }
  function leg(front, far) {
    part(); const [bx, by, fx, fy] = legPts(front, far), mat = far ? m.far : m.limb;
    U.taper(D, bx, by, fx, fy, 1.8, 1.1, mat, 0);
    const d = fx >= bx - 0.5 ? 1 : -1; U.dot(D, fx + d, fy, m.claw, 3); U.dot(D, fx + d, fy + 1, m.claw, 2); U.dot(D, fx, fy + 1, m.claw, 2);
  }
  // 候选部件：dragonPearl 龙珠（5×5 圆珠，比青龙大一圈）
  const ORB_PX = []; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) ORB_PX.push([i, j]);
  function orb() {
    part(); const [ox, oy] = orbAt(), cx = R(ox), cy = R(oy), lv = P.orb;
    for (const [i, j] of ORB_PX) {
      let mat = m.orb, t = 0; const core = Math.abs(i) + Math.abs(j) <= 1;
      if (lv === 4) t = j <= 0 ? 2 : 1;
      else if (lv === 3) mat = core ? m.orbCore : m.orbHot;
      else if (lv === 2) { if (core) mat = i === 0 && j === 0 ? m.orbCore : m.orbHot; else t = j < 0 ? 4 : 3; }
      else if (lv === 1) { if (i === -1 && j === -1) mat = m.orbHot; else if (core) t = 4; }
      else if (i === -1 && j === -1) t = 4;
      U.dot(D, cx + i, cy + j, mat, t);
    }
  }
  // 候选部件：cloudSeat 卷云（9×5：平底 + 3 团圆鼓顶，中间一团最高；每团比云谷高出 2 格以上，wph 让一团轮流再鼓 1 格）
  const CLOUD_H = [2, 3, 1, 3, 4, 3, 1, 3, 2], CLOUD_BUMP = [0, 0, -1, 1, 1, 1, -1, 2, 2];
  function cloudSeat() {
    if (P.ce >= 3) return; part(); const cx = R(SX[CLOUD_I]) - 1, cy = R(-Math.max(4, P.alt - 7) + P.bob), ph = P.wph & 3;
    for (let k = 0; k < 9; k++) {
      const x = cx - 4 + k, b = CLOUD_BUMP[k], h = CLOUD_H[k] + (b >= 0 && b === (ph % 3) && ph !== 3 ? 1 : 0);
      for (let j = 0; j <= h; j++) U.dot(D, x, cy - j, m.cloud, j === h && b >= 0 && CLOUD_H[k] >= 3 ? 4 : 0);
    }
    U.dot(D, cx - 5, cy - 1, m.cloud, 2);                                                   // 云尾一卷
  }
  // 候选部件：featherWing 分羽大翼（两个部件：① 6 根初级飞羽 + 次级飞羽翼面，羽尖之间留缝、剪影是锯齿扇；② 覆羽 + 亮前缘压在上面）
  //   翼姿沿用 B.WINGS，扇面比库里的 feather 张得更开；da 让远翼多扬一点，两片翼尖错开，剪影里读得出一对
  function featherWing(x, y, pose, far, da) {
    const W = B.WINGS[pose], a0 = W[0] + da, fold = W[2], aT = W[1] - 0.35 * (1 - fold) + da * 0.5, S = WING.span, nf = WING.fingers, fm = far ? m.featherFar : m.feather;
    const arm = S * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm;
    const bx = x - WING.chord * (1 - 0.3 * fold), by = y + 1, T = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.12 + 0.88 * q), fl = S * (0.62 - 0.2 * q) * (1 - 0.5 * fold); T.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    const lx = T[2 * nf - 2], ly = T[2 * nf - 1];
    part();
    U.poly(D, [x, y, wx, wy, lerp(wx, lx, 0.7), lerp(wy, ly, 0.7), lerp(lx, bx, 0.45), lerp(ly, by, 0.45) + 1, bx, by], fm, 0);   // 次级飞羽（翼面）
    for (let k = 1; k <= 2; k++) { const q = k / 3, px = lerp(lerp(wx, lx, 0.7), bx, q), py = lerp(lerp(wy, ly, 0.7), by, q) + 1.5; U.dot(D, px, py, fm, 2); }   // 次级飞羽羽尖
    for (let k = 0; k < nf; k++) U.taper(D, wx, wy, T[2 * k], T[2 * k + 1], 1.1, 0.5, fm, 0);                              // 初级飞羽：从腕部扇开，羽尖分开
    part();                                                                                                                    // 覆羽：盖住飞羽根部，压一道分界线
    U.poly(D, [x, y + 1, wx, wy, lerp(wx, T[0], 0.3), lerp(wy, T[1], 0.3), lerp(wx, lx, 0.35), lerp(wy, ly, 0.35), lerp(x, bx, 0.5), lerp(y, by, 0.5)], fm, 0);
    U.seg(D, x, y, wx, wy, 2, fm, 4); U.disc(D, wx, wy, 1, fm, 4);                                                            // 前缘（亮）
  }
  // 死亡最后一段：头化成云——头上盖白云团（精灵像素），hc 越大头越散、云越大
  function headPuffs() {
    if (!P.hc || P.hc >= 5) return; part();
    const [ax, ay] = antlerBase(0), hx = H.x, hy = H.y, pts = [
      [[ax - 2, ay - 3, 1.6], [ax + 1, ay - 1, 1.2]],
      [[ax - 2, ay - 2, 1.8], [hx - 1, hy, 2.0], [ax + 2, ay - 4, 1.2]],
      [[hx - 1, hy - 1, 2.2], [hx + 3, hy, 1.8], [ax - 1, ay - 3, 1.5]],
      [[hx + 1, hy - 2, 1.8], [hx + 4, hy - 1, 1.2]],
    ][P.hc - 1];
    ero(P.hc === 4 ? 0.2 : 0);
    for (const [px, py, r] of pts) { U.disc(D, px, py, r, m.cloud, 0); U.dot(D, px - 1, py - R(r), m.cloud, 4); }
    ero(0);
  }
  function drawHero() {
    spine(); begin(hero, P.bx, 0); const [wx, wy] = wingRoot(), wingOn = P.we < 4;
    const eA = [0, 0.5, 1, 1, 1, 1][P.hc], eH = [0, 0, 0.3, 0.55, 0.85, 1][P.hc], eW = P.we / 4;
    if (eA < 1) { ero(eA); antler(1); whisker(1); }
    if (wingOn) { ero(eW); featherWing(wx + 4, wy - 1, P.wing, 1, 0.5); }
    ero(0);
    if (bodyOn(LEG_I[0])) leg(true, true); if (bodyOn(LEG_I[1])) leg(false, true);
    fins(); body();
    if (bodyOn(LEG_I[1])) leg(false, false);
    ero(P.ce / 3); cloudSeat();
    if (wingOn) { ero(eW); featherWing(wx, wy, P.wing, 0, 0); }
    if (eH < 1) { ero(eH); Q.head(D, HR, P, HEAD); }
    if (eA < 1) { ero(eA); halo(); antler(0); whisker(0); }
    ero(0); headPuffs();
    tailTuft();
    if (bodyOn(LEG_I[0])) leg(true, false);
    orb();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 姿势 ─────
  // 死亡时间线（来袭后秒数）：身体 8 节从尾到头化云，最后 3 节每节 ≥ 2 帧；头和鹿角单独留到最后 0.6 s 慢慢化云
  const CL_D = [0.5, 0.62, 0.74, 0.86, 0.98, 1.12, 1.3, 1.48], HC_D = [1.66, 1.84, 2.0, 2.16, 2.32];
  const D_DROP = 1.3, D_LAND = 1.55, D_OFF = 2.2, D_FADE = 2.25;
  const T_HIT = 2 / 12, T_PILLAR = 0, T_LAND = 2 / 12, T_PULSE = 0.34, T_ORBLAND = INCOMING + D_LAND, T_ORBOFF = INCOMING + D_OFF;
  const CL_EV = CL_D.map((d) => INCOMING + d), HC_EV = HC_D.map((d) => INCOMING + d);
  const cnt = (a, d) => { let n = 0; while (n < a.length && d >= a[n] - 1e-6) n++; return n; };
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6), w = Math.floor(TT * 1.25 + 1e-6); P.bob = b & 1 ? -1 : 0; P.wph = w & 3; P.whisk = [0, 1, 0, -1][(b + 1) & 3];
    P.wing = (w & 1) ? 1 : 4;                                                         // 羽翼缓慢开合：半收 ↔ 上扬
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.toss = [1, 3, 3, 1, 0][k]; P.head = k >= 1 && k <= 3 ? -1 : 0; P.orb = k === 2 ? 1 : 0; P.claw = 1; }   // 抛接龙珠
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                          // 驾云漂浮：云团轮流鼓起、上下飘 1 格
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.wph = f; P.bob = B.FLAP_BOB[f]; P.whisk = [1, 2, 1, 0][f]; P.wing = B.FLAP[f]; P.curl = f & 1 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                      // 前爪把龙珠往前一推
      if (tq < 0.12) { P.claw = 0; P.head = -1; P.bx = -1; P.orb = 1; P.whisk = 1; }
      else if (tq < 0.25) { P.claw = 2; P.orb = 3; P.bx = 1; P.whisk = 2; P.rim = 1; P.wing = 4; }
      else if (tq < 0.45) { P.claw = 2; P.orb = 2; P.bx = 1; P.whisk = 1; }
      else { const q = (tq - 0.45) / 0.3; P.claw = q < 0.5 ? 2 : 0; P.bx = q < 0.3 ? 1 : 0; P.orb = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE) {                                                      // 羽翼全张、光环亮起旋转
      const q = ease.inOut(clamp01(tq / 0.7)); P.wing = q < 0.12 ? 1 : 5; P.coil = R(q); P.claw = 1; P.head = -1; P.whisk = 2;
      P.halo = tq < 0.3 ? 1 : 2; P.hph = f12 & 3; P.orb = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; if (tq > 1.1) P.bob = f12 & 1 ? -1 : 0;
    } else if (st === CAST) {                                                        // 龙珠朝天一举
      P.wing = 5; P.coil = 1; P.claw = 1; P.toss = tq < 0.3 ? 3 : 2; P.head = -2; P.jaw = 1; P.halo = 3; P.hph = f12 & 3; P.orb = 3; P.rim = 3; P.whisk = 2;
      if (tq < 2 / 12) P.dq = 0.22;                                                    // 自身一闪变淡
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.wing = q < 0.4 ? 5 : 4; P.claw = q < 0.5 ? 1 : 0; P.head = q < 0.5 ? -1 : 0; P.coil = q < 0.5 ? 1 : 0;
      P.halo = q < 0.4 ? 2 : 1; P.hph = f12 & 3; P.orb = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.whisk = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.head = -1; P.whisk = -2; P.curl = -1; P.amp = 2; P.jaw = 1; P.wing = 1; P.flash = h < 1 / 12 ? 1 : 0; P.orb = 1; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.whisk = -1; P.amp = 2; P.wing = 4; }
      else P.whisk = 1;
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        P.eyes = 1; P.whisk = -2;
        if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.bx = -2; P.head = -1; P.amp = 2; P.wing = 1; P.orb = (f12 & 1) ? 1 : 4; P.jaw = 1; }
        else {
          P.bx = -2; P.head = 2; P.amp = 2; P.wing = 6; P.halo = 0; P.jaw = 1; P.alt = d < 0.5 ? 11 : 10; P.orb = 4;
          P.cl = cnt(CL_D, d); P.hc = cnt(HC_D, d);                                      // 从尾到头一节节化成云，头最后
          P.we = Math.max(0, Math.min(4, P.cl - 2)); P.ce = Math.max(0, Math.min(3, P.cl - 3));   // 羽翼、卷云跟着一点点散
          if (d >= D_DROP) {                                                              // 前爪化掉 → 龙珠坠地、一闪后熄灭、最后消散
            const q = clamp01((d - D_DROP) / (D_LAND - D_DROP)); P.drop = q >= 1 ? 2 : 1; P.dsx = R(4 * q); P.dsy = R(Math.max(0, 15 * (1 - q * q)));
            P.orb = d < D_LAND ? 4 : d < D_OFF ? ((f12 % 3) === 0 ? 3 : 1) : 4;
            if (d >= D_FADE) P.dq = clamp01((d - D_FADE) / 0.2);
          }
        }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    spine();
    const g = orbAt(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  const HIT_POINT = [2, -14];

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, trailAcc = 0, bmT = 9, bmX = 0, bmY = 0, featherAcc = 0, featherT = 9;
  const DX = DUMMY_X, DY = HY - 15;
  const orbScr = () => [scrX(P.gx), HY + P.gy];
  function ally() { const a = allyPoints()[0]; return a || { x: ALLY_X[0], y: HY, top: HY - 16, mid: HY - 8 }; }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = orbScr(), a = ally();
      releaseOrbit(30, 70, 0.3, 0.6, { up: 20 });                                      // 汇聚的魂光冲天而散
      fx.cross(gx, gy, 6, R_EL, 0.25, 2); ring(gx, gy, 1, R_EL);
      fx.pillar(a.x, 0, HY, 3, R_EL, 0.45, 2);                                         // 天青光柱从天而降
      burst(gx, gy, 18, 30, 80, 0.3, 0.6, R_EL, 16);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                // 龙珠射出一道细长光束
      const [gx, gy] = orbScr(); bmT = 0; bmX = gx; bmY = gy;
      fx.beam(gx + 3, gy, DX - 3, DY, 1, R_EL, 0.2, 2); fx.cross(gx + 2, gy, 3, R_EL, 0.15, 2);
      burst(DX - 3, DY, 10, 30, 80, 0.15, 0.4, R_EL, 8); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.45 }); sfx('hit', { mat: 'magic', w: 0.4 });
    }
    if (s === CAST && t === T_LAND) {                                                 // 落在友军身上：脚下天青法阵 + 羽毛光点
      const a = ally();
      fx.circle(a.x, HY, 11, 3, R_EL, 1.0, 1, 0); ring(a.x, a.mid - 2, 1, R_EL); burst(a.x, a.mid, 14, 20, 60, 0.3, 0.6, R_EL, 12);
      allyFx({ dur: 1.1, outline: R_EL }); featherT = 0; shake(0.12, 1);
      sfx('impact', { pal: 'holy', w: 0.45 });
    }
    if (s === CAST && t === T_PULSE) { const a = ally(); fx.cross(a.x, a.top - 4, 5, R_HALO, 0.25, 2); burst(a.x, a.top, 8, 15, 40, 0.3, 0.5, R_HALO, 6); sfx('impact', { pal: 'holy', w: 0.3 }); }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 70, 0.2, 0.4, R_CLOUD, 12);
    if (s === DEATH && CL_EV.indexOf(t) >= 0) {                                        // 刚化掉的那一节变成白云：一团 fx.cloud + 5 颗慢速白云粒
      const k = CL_EV.indexOf(t), i0 = R((N - 1) * (1 - (k + 1) / 8)), i1 = R((N - 1) * (1 - k / 8)), im = (i0 + i1) >> 1;
      fx.cloud(scrX(R(SX[im])), HY + R(SY[im]), 3 + (k > 3 ? 1 : 0), R_CLOUD, 0.9, 2);
      for (let j = 0; j < 5; j++) { const i = Math.min(N - 1, i0 + R((i1 - i0) * (j + 0.5) / 5)); spawn(K_DUST, scrX(R(SX[i])) + R(Math.random() * 2 - 1), HY + R(SY[i] - SR[i] * Math.random()), (Math.random() - 0.5) * 6, -3 - Math.random() * 4, 0.8 + Math.random() * 0.4, R_CLOUD); }
      if (k === 0) { const [ax, ay] = [scrX(R(H.x)), HY + R(H.y) - 10]; burst(ax, ay, 6, 10, 30, 0.2, 0.4, R_HALO, 4); }   // 光环熄灭
      if (k === 5) { const [ax, ay] = [scrX(R(H.x) - 3), HY + R(H.y) - 10]; burst(ax, ay, 5, 8, 20, 0.2, 0.4, R_HALO, 4); }   // 光环散掉
    }
    if (s === DEATH && HC_EV.indexOf(t) >= 0 && HC_EV.indexOf(t) < 4) {                  // 头和鹿角一段段化成云
      const k = HC_EV.indexOf(t), hx = scrX(R(H.x)), hy = HY + R(H.y) - (k === 0 ? 5 : 0);
      fx.cloud(hx - 1, hy, 3 + (k >= 2 ? 1 : 0), R_CLOUD, 0.9, 2);
      for (let j = 0; j < 5; j++) spawn(K_DUST, hx - 4 + R(Math.random() * 8), hy - R(Math.random() * 5), (Math.random() - 0.5) * 6, -3 - Math.random() * 5, 0.8 + Math.random() * 0.4, R_CLOUD);
    }
    if (s === DEATH && t === T_ORBLAND) { const [gx, gy] = orbScr(); for (let i = 0; i < 6; i++) spawn(K_DUST, gx + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust); ring(gx, gy, 0, R_EL); sfx('fall', { w: 0.2 }); }
    if (s === DEATH && t === T_ORBOFF) { const [gx, gy] = orbScr(); burst(gx, gy, 8, 10, 30, 0.3, 0.5, R_EL, 8); }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_LAND, T_PULSE], [], [INCOMING], CL_EV.concat(HC_EV, [T_ORBLAND, T_ORBOFF]), []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = orbScr();
    if (state === CHARGE) {                                                           // 淡蓝魂光从龙身升起，螺旋汇进高举的龙珠
      chargeAcc += dt * (18 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 10, a = -Math.PI * (0.15 + Math.random() * 0.9); spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.4 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3.5 + Math.random() * 3); }
      if (Math.random() < dt * 10) { const i = 6 + ((Math.random() * 26) | 0); spawn(K_RISE, scrX(R(SX[i])), HY + R(SY[i] - SR[i]), (Math.random() - 0.5) * 4, -10 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL); }
    }
    if (featherT < 1.0) {                                                              // 羽毛状光点从友军身上往上飘
      featherAcc += dt * 16; const a = ally();
      while (featherAcc >= 1) { featherAcc -= 1; const x = a.x - 6 + Math.random() * 12, y = HY - 2 - Math.random() * 14; spawn(K_EMBER, x, y, (Math.random() - 0.5) * 8, -8 - Math.random() * 8, 0.6 + Math.random() * 0.4, Math.random() < 0.3 ? R_CLOUD : R_EL); }
    }
    if (state === MOVE) {                                                             // 云团尾部留下白云粒子
      trailAcc += dt * 10; while (trailAcc >= 1) { trailAcc -= 1; const i = CLOUD_I; spawn(K_DUST, scrX(R(SX[i]) - 8), HY + R(SY[i] + SR[i]) + 2 - Math.random() * 3, (P.flip ? 1 : -1) * (6 + Math.random() * 8), -1 + Math.random() * 2, 0.35 + Math.random() * 0.3, R_CLOUD); }
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.6 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 4 - 2), gy - 2, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 0.6 && stT < INCOMING + 2.4) { soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 40, HY - 8 - Math.random() * 10, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.8 + Math.random() * 0.7, stT < INCOMING + 1.5 ? R_CLOUD : FXI.soul); } }
    bmT += dt; featherT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; trailAcc = 0; bmT = 9; featherAcc = 0; featherT = 9; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.drop) groundShadow(scrX(0), 12, P.alt - 2);
    if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function fxFront(f12) {
    const [gx, gy] = orbScr();
    if (P.orb >= 2 && P.orb <= 3 && P.dq < 1 && !P.drop) { const L = P.orb === 3 ? 7 : 4 + (f12 & 1); for (let r = 4; r <= L; r++) { const c = r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } if (P.orb === 3) { put(gx + 3, gy + 3, EL[1]); put(gx - 3, gy - 3, EL[1]); put(gx + 3, gy - 3, EL[1]); put(gx - 3, gy + 3, EL[1]); } }
    if (bmT < 2 / 12) { const c = bmT < 1 / 12 ? EL[0] : EL[1]; for (let r = 2; r <= 4; r++) { put(bmX + r, bmY - 1, c); put(bmX + r, bmY + 1, c); } }   // 珠口光
  }

  return {
    name: '天龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.orb, m.orbHot, m.orbCore, m.halo, m.haloHot], HIT_POINT, EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'dissolve', pal: 'holy', style: 'beam', w: 0.45, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
