// 野人祭司（部队 · 自然 · 召唤师 · 普通 · 近战）：佝偻的苔泥野人——整张脸是一只白色鹿颅骨面具（两支分叉鹿角高出头 6 格），
// 背披乱草蓑衣，双手握一根比身体还长的骨杖，杖头挂兽牙骨铃，杖顶一只小葫芦（葫芦口的绿色孢子光是发光体）。
// 攻击：骨杖往前一抡，葫芦喷出一团孢子泥雾扑在目标身上。技能表现特性「迷你史莱姆」（死亡时召唤 1 个野人矛兵）：
// 摇铃召唤——脚前苔绿兽骨法阵转起、孢子螺旋汇进葫芦 → 骨杖顿地，法阵中心喷起一柱泥浆 → 泥柱落成一滩，泥里由暗到亮浮出一个野人矛兵的剪影。
// 死亡融化：身体塌成一滩苔泥，面具和骨杖落在泥上，泥里冒泡鼓起一个小矛兵的轮廓，然后整滩消散。升级成野人王（chars/WildManKing.js）。
PCD.define('WildManPriest', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_PHYS, K_SPIRAL_PT, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, sfx, DUMMY_X } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：沼泽 · 孢毒苔绿（poison 色阶 21 白 → 淡黄绿 → 黄绿 → 绿 → 墨绿）；脚印泥点 / 滴泥用 earth ─────
  const R_EL = FXI.poison, EL = FXR[R_EL], MUD = FXI.earth;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: ['#141a0c', '#2e3a1a', '#52602e', '#7c8c46'],          // 苔泥绿褐皮肤（整族共用）
    bone: 'bone', straw: { r: 'sand', band: 2 }, grass: 'sand', gourd: 'leather', cord: 'wood', tooth: 'white',
    socket: { r: 'ink', flat: 1 },
    spore: { r: [48, 49, 50, 38], flat: 1 },                       // 葫芦口 / 眼洞：暗 → 亮
    sporeHot: { r: [49, 50, 38, 21], flat: 1 },                    // 蓄满 / 施放
  });
  const BODY = { body: 'hunched', leg: 9, torso: 9, hunch: 2, lw: 2, arm: 11, sw: 3, neck: 2, stride: 3, fall: 'front' };   // 直立佝偻：肩在胯前 3 格，头顶离地 22–23 格
  const HX = 56, DUR = DEFAULT_DUR.slice(), CIRX = HX + 24;         // CIRX：召唤点（法阵中心、泥柱、矛兵）
  const hero = new Sprite(84, 50, 40, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'socket', 'spore', 'sporeHot', 'cord', 'tooth', 'gourd']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 小矛兵剪影（召唤物 / 死亡时泥里鼓起的轮廓）：只取形状，画时单色 ─────
  const imp = new Sprite(22, 28, 8, 25);
  (function bakeImp() {
    const m = E.defMat('stone'); E.begin(imp, 0, 0); E.part();
    const R = (y, a, b) => E.run(y, a, b, m, 0);
    for (let y = -3; y <= 0; y++) { R(y, -3, -2); R(y, 1, 2); } E.sp(3, 0, m, 0); E.sp(-1, 0, m, 0);     // 两条短粗腿（中间空 2 格）+ 脚
    R(-4, -4, 3); R(-5, -4, 3); E.sp(-5, -4, m, 0); E.sp(4, -4, m, 0);                                   // 草裙
    for (let y = -9; y <= -6; y++) R(y, -2, 1);                                                          // 身子
    R(-17, -2, 1); R(-16, -3, 2); for (let y = -15; y <= -12; y++) R(y, -4, 3); R(-11, -3, 2); R(-10, -2, 1);   // 大圆头
    E.sp(4, -13, m, 0); E.sp(4, -12, m, 0);                                                              // 骨面具鼻吻
    E.sp(-3, -18, m, 0); E.sp(-4, -19, m, 0); E.sp(1, -18, m, 0); E.sp(2, -19, m, 0);                    // 面具上两只小角
    R(-8, 2, 5);                                                                                         // 手臂
    for (let y = -20; y <= 0; y++) E.sp(6, y, m, 0);                                                     // 竖握的木矛
    E.sp(6, -21, m, 0); E.sp(6, -22, m, 0); E.sp(5, -20, m, 0); E.sp(7, -20, m, 0);                      // 燧石矛头
    bake(imp, { rim: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 });
  })();
  // 单色剪影（左上沿亮一级）：lv 色阶级（0 最亮），dq 抖动消散，clipY 屏幕 y 以下不画（从泥里冒出来）
  function ghost(X, Y, R5, lv, dq, clipY) {
    const s = imp, o = s.mat, w = s.w;
    for (let y = 0; y < s.h; y++) {
      const yy = Y - s.oy + y; if (yy > clipY) continue;
      for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!o[i] || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue;
        const edge = x === 0 || !o[i - 1] || y === 0 || !o[i - w];
        put(X - s.ox + x, yy, R5[CL(edge ? lv - 1 : lv, 0, 4)]);
      }
    }
  }

  // ───── 姿势：前手 hx/hy（胸高）+ 杖角 a；后手握在前手上面 4 格的杖身上（肩高）─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0, bell: 0,
    gem: 0, glint: 0, rim: 0, eye: 0, flash: 0, melt: 0, lift: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean, head, crouch });
  const K_IDLE = K(13, -13, 0.05, 1, 0, 1);                       // 双手握杖身中上段，杖底离地 3 格
  const K_WIND = K(6, -20, -0.95, 0, -1, 1);                         // 骨杖抡到肩后
  const K_STRIKE = K(12, -17, 1.45, 2, 1, 2);                       // 往前一抡：杖头葫芦到目标面前
  const K_FOLLOW = K(12, -15, 1.75, 2, 1, 2);
  const K_RAISE = K(12, -18, 0.02, 0, -1, 0);                       // 蓄力：双手把杖举高摇铃
  const K_SLAM = K(14, -12, 0.24, 2, 1, 3);                          // 施放：骨杖顿地
  const K_HURT = K(11, -13, -0.28, -1, -1, 1);
  const K_KNEEL = K(12, -12, 0.3, 1, 0, 4);                         // 死亡：先跪下（人形）
  const K_SAG = K(13, -10, 0.6, 2, 1, 5);                           //       再往前趴（人形），然后才融化
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -40, 40], ['hy', -48, 8], ['ai', -64, 64], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['bend', 0, 3], ['bell', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eye', 0, 2],
    ['flash', 0, 1], ['melt', 0, 3], ['lift', 0, 3], ['dqi', 0, 48], ['st', 0, 8]]);
  const BELL_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_HIT = 3 / 12, T_LAND = INCOMING + 0.66;
  const PERS = [[13, -15, -2, -1], [14, -16, 2, 1], [13, -15, -2, -1], [14, -16, 2, 1], [13, -15, 0, 0]];   // 待机个性：双手把杖再举 2–3 格摇铃 + 点头（手位、铃摆、头）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.bell = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eye = 0;
    P.flash = 0; P.melt = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.bell = BELL_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), c = PERS[f]; P.hx = c[0]; P.hy = c[1]; P.bell = c[2]; P.head = c[3]; P.glint = f === 3 ? 1 : 0; P.eye = f === 1 || f === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 佝偻碎步：弓背小步，骨铃每步一响
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq));
      P.hx += P.step * 0.6; P.a += P.step * 0.05; P.bell = -P.step * 2 || (P.wup === 2 ? 1 : -1);
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.bell = 2; P.sway = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 2; P.gem = 2; P.rim = 2; P.bell = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_FOLLOW, ease.out((tq - 0.2) / 0.25)); P.bx = 2; P.gem = 1; P.bell = -1; }
      else { setK(K_FOLLOW, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.bx = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 摇铃越来越急，面具眼洞亮绿
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_RAISE, q);
      const fast = tq > 0.8 ? 1 : (f12 % 3) === 0 ? 1 : 0;
      if (tq >= 0.3) { const s = fast ? ((f12 & 1) ? 1 : -1) : ((f12 >> 1) & 1 ? 1 : -1); P.hx += s; P.bell = s * 2; P.head = s > 0 ? 0 : -1; }
      P.bend = tq > 0.5 ? 1 + ((f12 & 1) && tq > 1.1 ? 1 : 0) : 0; P.sway = tq > 0.5 ? -1 : 0;
      P.eye = tq < 0.5 ? 0 : tq < 1.0 ? 1 : ((f12 & 1) ? 2 : 1); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { setK(K_RAISE, K_SLAM, ease.out(clamp01(tq / 0.12))); P.bell = -2; P.bend = 2; P.sway = -2; P.eye = 2; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.bell = q < 0.5 ? 1 : 0; P.bend = q < 0.4 ? 1 : 0;
      P.eye = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.bell = 2; P.sway = 2; P.bend = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.bell = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 融化：塌 → 一坨 → 一滩（面具、骨杖落在泥上）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.bell = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.4) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.bell = 1; P.sway = 1; P.gem = (f12 & 1) ? 1 : 4; }
      else if (d < 0.5) { setK(K_SAG, K_SAG, 0); P.bx = -1; P.bell = 2; P.sway = 2; P.bend = 1; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        P.melt = d < 0.58 ? 1 : d < 0.66 ? 2 : 3; P.bx = -1;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.melt ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.dqi = RD(P.dq * 48);
    if (P.melt) { P.gx = LIE_X + UP + 7 + P.bx; P.gy = -2; }
    else { const S = staffPts(P.hx, P.hy, P.a); P.gx = RD(S.tx) + P.bx; P.gy = RD(S.ty) - 7; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  const UP = 16, DN = 9, LIE_X = -2;
  function staffPts(hx, hy, a) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, tx: hx + dx * UP, ty: hy + dy * UP, bx: hx - dx * DN, by: hy - dy * DN, hbx: RD(hx + dx * 4), hby: RD(hy + dy * 4) }; }
  const GLOW = [[M.spore, 2], [M.spore, 3], [M.sporeHot, 3], [M.sporeHot, 4], [M.spore, 1]];
  // 候选部件：gourd —— 杖顶小葫芦（下大上小两节，腰缠绳，葫芦口是发光体，5 档）：从底座 (bx, by) 往上 7 行；躺倒时用 r0 = 1 的落笔框横过来
  function gourd(T, bx, by, lv) {
    E.part(); const g = M.gourd, G = GLOW[lv];
    run(E, T, by - 1, bx - 1, bx + 1, g, 0); run(E, T, by - 2, bx - 2, bx + 2, g, 0); run(E, T, by - 3, bx - 1, bx + 1, g, 0);
    px(E, T, bx, by - 4, M.cord, 3);                                                                  // 腰上缠的绳
    run(E, T, by - 5, bx - 1, bx + 1, g, 0); px(E, T, bx - 1, by - 5, g, 4); px(E, T, bx - 1, by - 2, g, 4);
    px(E, T, bx, by - 6, lv >= 2 && lv <= 3 ? G[0] : g, lv >= 2 && lv <= 3 ? G[1] : 2);               // 葫芦颈（蓄满时透光）
    px(E, T, bx, by - 7, G[0], G[1]);                                                                 // 葫芦口
    if (P.glint && lv !== 4) px(E, T, bx + 1, by - 8, M.sporeHot, 4);
  }
  // 候选部件：boneStaff —— 骨杖（骨节凸起 + 杖头横杆 + 两串兽牙骨铃，铃串朝屏幕下方垂、按 bell 摆）
  function boneStaff(T, hx, hy, a, lying) {
    const S = staffPts(hx, hy, a), nx = -S.dy, ny = S.dx;
    E.part();
    parts.line(E, T, S.bx, S.by, S.tx, S.ty, M.bone, 3);
    for (const k of [-6, 6, 11]) { const x = hx + S.dx * k, y = hy + S.dy * k; px(E, T, x + nx, y + ny, M.bone, 4); px(E, T, x - nx, y - ny, M.bone, 2); }   // 骨节
    const cx = S.tx - S.dx * 2, cy = S.ty - S.dy * 2;
    parts.line(E, T, cx - nx * 2, cy - ny * 2, cx + nx * 2, cy + ny * 2, M.cord, 2);                  // 杖头横杆
    if (!lying) for (const sd of [-1, 1]) {
      const ax = cx + nx * 2 * sd, ay = cy + ny * 2 * sd, n = sd < 0 ? 4 : 3;
      for (let k = 1; k <= n; k++) { const x = RD(ax + P.bell * k / n), y = RD(ay + k); if (k & 1) px(E, T, x, y, M.cord, 2); else px(E, T, x, y, M.tooth, k === n ? 4 : 3); }
      px(E, T, RD(ax + P.bell), RD(ay + n + 1), M.tooth, 3);
    }
    return S;
  }
  // 候选部件：deerMask —— 鹿颅骨面具（圆颅 + 前伸的长鼻吻 + 眼洞发光 3 档 + 鼻孔 + 齿列），盖住整张脸；x0 / top = 头框左上
  function deerMask(T, x0, top, eye) {
    E.part(); const m = M.bone;
    run(E, T, top, x0 + 1, x0 + 4, m, 0); run(E, T, top + 1, x0, x0 + 5, m, 0); run(E, T, top + 2, x0, x0 + 6, m, 0);
    run(E, T, top + 3, x0, x0 + 8, m, 0); run(E, T, top + 4, x0 + 1, x0 + 9, m, 0); run(E, T, top + 5, x0 + 2, x0 + 8, m, 0);
    px(E, T, x0 + 5, top + 1, m, 4); px(E, T, x0 + 6, top + 2, m, 4);                                 // 眉骨
    const e = eye === 0 ? [M.socket, 1, M.socket, 1] : eye === 1 ? [M.spore, 3, M.spore, 2] : [M.sporeHot, 4, M.sporeHot, 3];
    px(E, T, x0 + 4, top + 2, e[0], e[1]); px(E, T, x0 + 5, top + 2, e[2], e[3]); px(E, T, x0 + 4, top + 3, e[2], e[3]);   // 眼洞
    px(E, T, x0 + 8, top + 3, m, 1); px(E, T, x0 + 9, top + 4, m, 4);                                 // 鼻孔 + 吻尖
    px(E, T, x0 + 1, top + 2, m, 2); px(E, T, x0 + 2, top + 1, m, 2);                                 // 颅缝
    for (let x = x0 + 4; x <= x0 + 7; x++) px(E, T, x, top + 5, m, (x & 1) ? 4 : 2);                  // 齿列
    run(E, T, top + 4, x0 + 3, x0 + 6, m, 2);                                                         // 颧骨下沿
  }
  // 候选部件：antlers —— 一对分叉鹿角（主干 + 前后各一叉，远侧暗一级），根在颅顶；n 叉数 2 / 4
  function antlers(T, x0, top) {
    E.part();
    const B = M.boneD, F = M.bone, L = (m, pts, t) => { for (let i = 1; i < pts.length; i++) parts.line(E, T, x0 + pts[i - 1][0], top + pts[i - 1][1], x0 + pts[i][0], top + pts[i][1], m, t); };
    L(B, [[1, -1], [0, -3], [-1, -5], [-1, -7]], 3); L(B, [[0, -3], [-2, -3], [-4, -5]], 3); L(B, [[-1, -5], [-3, -7]], 3);
    L(F, [[4, -1], [5, -3], [6, -5], [6, -7]], 3); L(F, [[5, -3], [7, -3], [9, -5]], 3); L(F, [[6, -5], [8, -7]], 3);
    px(E, T, x0 + 6, top - 7, F, 4); px(E, T, x0 + 9, top - 5, F, 4); px(E, T, x0 - 1, top - 7, B, 4); px(E, T, x0 - 4, top - 5, B, 4);
  }
  // 候选部件：strawCape —— 乱草蓑衣：挂在肩背上垂到大腿，一层层干草，每层下沿往外翘一撮，竖向草纹，底边草束长短参差
  function strawCape(R, bot) {
    E.part(); const m = M.straw, top = R.yS - 1, n = Math.max(1, bot - top), sw = P.sway || 0, bd = P.bend || 0; let Lb = 0, Rb = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, CL(y, R.yS, R.yHip)), L = RD(e[0] - 1 - 1.5 * t + sw * t * t - bd * t * t * 1.2), Rr = e[0] + 3;   // 挂在肩背上往下垂，不往后横鼓
      run(E, R, y, L, Rr, m, 0);
      if (((y - top) % 4) === 3) { px(E, R, L - 1, y, m, 0); px(E, R, L - 2, y + 1, m, 3); }          // 每层下沿翘出一撮
      for (let x = L + 1; x < Rr; x++) if (((x + ((y - top) >> 2)) % 3) === 0) px(E, R, x, y, m, 2);  // 竖草纹
      if (y === bot) { Lb = L; Rb = Rr; }
    }
    for (let x = Lb; x <= Rb; x++) { const q = (((x - RD(sw)) % 3) + 3) % 3; if (q === 2) continue; px(E, R, x, bot + 1, m, q === 0 ? 0 : 2); if (q === 0) px(E, R, x - (sw > 0 ? 0 : 1), bot + 2, m, 3); }
    for (let k = 0; k < 3; k++) px(E, R, R.hx0 - 1 - k, R.htop + 3 + k, m, k === 2 ? 3 : 0);          // 脑后翘起的草
  }
  // 候选部件：grassSkirt —— 草裙：胯部一圈竖草束，下摆长短交替、随 sway 摆
  function grassSkirt(R, len) {
    E.part(); const m = M.grass, y0 = R.yHip - 1, sw = RD(P.sway || 0);
    for (let k = 0; k <= len; k++) {
      const y = y0 + k; if (y > 0) break; const e = parts.edges(R, Math.min(y, R.yHip)), L = e[0] - (k > 1 ? 1 : 0), Rr = e[1] + (k > 1 ? 1 : 0), end = k >= len - 1;
      for (let x = L; x <= Rr; x++) { const ph = (((x - sw) % 3) + 3) % 3; if (k === len && ph !== 0) continue; if (k === len - 1 && ph === 2) continue; px(E, R, x + (end ? sw : 0), y, m, k === 0 ? 3 : ph === 1 ? 2 : 0); }
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.melt) return drawMelt();
    const R = parts.rig(P, BODY), S = staffPts(P.hx, P.hy, P.a);
    strawCape(R, R.yHip + 3);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, grip: 'none', at: [S.hbx, S.hby] });
    parts.legs(E, R, P, { style: 'bare', mat: M.skin, matD: M.skinD, w: 2 });
    parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    px(E, R, R.hx0 + 1, R.yS + 3, M.skin, 2); px(E, R, R.hx0 + 1, R.yS + 4, M.skin, 2); px(E, R, R.hx0 + 2, R.yS + 6, M.skin, 2);   // 身上往下淌的泥痕（和躯干同一部件）
    grassSkirt(R, 2);
    antlers(R, R.hx0, R.htop);
    deerMask(R, R.hx0, R.htop, P.eye);
    boneStaff(R, P.hx, P.hy, P.a, 0);
    gourd(R, RD(S.tx), RD(S.ty), P.gem);
    parts.hand(E, R, P, { side: 'B', at: [S.hbx, S.hby], hand: M.skin });
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin });
  }
  // 融化：一坨（1）→ 更低的一坨（2）→ 一滩（3），面具落在泥上、骨杖横在泥里
  const MELT = {
    1: [[-9, -1, 4], [-8, -3, 6], [-7, -4, 7], [-6, -5, 8], [-5, -5, 9], [-4, -6, 9], [-3, -6, 10], [-2, -7, 11], [-1, -8, 12], [0, -9, 13]],
    2: [[-4, -5, 7], [-3, -7, 10], [-2, -9, 12], [-1, -10, 14], [0, -12, 16]],
    3: [[-2, -10, 12], [-1, -14, 16], [0, -17, 19]],
  };
  const MASK_AT = { 1: [0, -15], 2: [-3, -10], 3: [-15, -8] };
  const FREE = parts.FREE, LYF = { r0: 1, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  function drawMelt() {
    const s = P.melt;
    if (s === 1) boneStaff(FREE, 10, -6, 0.75, 0);                                                     // 骨杖斜倒
    E.part();
    for (const [y, L, R] of MELT[s]) run(E, FREE, y, L, R, M.skin, 0);
    for (const [x, y] of [[-4, 0], [3, -1], [9, 0], [-10, 0]]) if (y >= MELT[s][0][0]) px(E, FREE, x, y, M.skin, 4);   // 泥面亮点
    if (s === 3) { px(E, FREE, 6, -1, M.skin, 2); px(E, FREE, -12, -1, M.skin, 2); }
    if (s >= 2) { boneStaff(FREE, LIE_X, -1, Math.PI / 2, 1); LYF.tx = LIE_X + UP; LYF.ty = -1; gourd(LYF, 0, 0, P.gem); }   // 骨杖横在泥上，葫芦侧躺
    else gourd(FREE, RD(10 + Math.sin(0.75) * UP), RD(-6 - Math.cos(0.75) * UP), P.gem);
    const at = MASK_AT[s]; antlers(FREE, at[0], at[1]); deerMask(FREE, at[0], at[1], 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let geyT = 9, impT = 9, recT = 9, chargeAcc = 0, soulAcc = 0, dripAcc = 0, bubAcc = 0, smokeAcc = 0, lastStep = 0, lastPers = -1, smA = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CHARGE) { fx.circle(CIRX, HY + 1, 13, 3, R_EL, 2.5, 1, 0); }
    if (s === RECOVER) recT = 0;
    if (s !== CAST) return;
    geyT = 0; impT = 9;                                                 // 骨杖顿地：法阵中心喷起泥柱
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1, to: [CIRX, HY - 4, 4] });
    ring(CIRX, HY - 1, 1, R_EL); burst(CIRX, HY - 2, 16, 30, 80, 0.25, 0.55, R_EL, 40);
    for (let i = 0; i < 10; i++) spawnX(K_PHYS, CIRX + (Math.random() - 0.5) * 4, HY - 20 - Math.random() * 8, (Math.random() - 0.5) * 50, -30 - Math.random() * 40, 0.8, R_EL, { g: 220, floor: HY, age0: 0.2 });
    shake(0.28, 2); flash(0.05);
    for (let i = 0; i < 6; i++) spawn(E.K_DUST, wx(P.hx + 1 - Math.sin(P.a) * DN) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.35, FXI.dust);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                               // 往前一抡：葫芦喷出一团孢子泥雾扑在目标身上
      smA = 0; const gx = wx(P.gx), gy = wy(P.gy);
      burst(gx + 1, gy, 8, 20, 60, 0.15, 0.35, R_EL, 0);
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, gx + 1, gy + 1, 40 + Math.random() * 60, (Math.random() - 0.6) * 40, 0.35 + Math.random() * 0.2, R_EL, { dragX: 0.1, dragY: 0.2, age0: 0.1 });
      fx.cloud(DUMMY_X - 1, HY - 14, 6, R_EL, 0.7, 2);
      hitDummy(0); dummyFx({ dur: 0.5, tint: 'poison' });
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST && t === T_HIT) {                                    // 泥柱落下成一滩，矛兵从泥里显形
      impT = 0; burst(CIRX, HY - 6, 20, 40, 110, 0.3, 0.7, R_EL, 30); ring(CIRX, HY - 2, 0, R_EL);
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, CIRX + (Math.random() - 0.5) * 6, HY - 16, (Math.random() - 0.5) * 60, -20 - Math.random() * 30, 0.7, R_EL, { g: 240, floor: HY, age0: 0.3 });
      shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.5 });
    }
    if (s === DEATH && t === T_LAND) {                                  // 泥摊落地：泥点四溅
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, wx(-2 + (Math.random() - 0.5) * 20), HY - 2, (Math.random() - 0.5) * 50, -20 - Math.random() * 30, 0.6, MUD, { g: 260, floor: HY, age0: 0.2 });
      for (let i = 0; i < 8; i++) spawn(E.K_DUST, wx(-12 + Math.random() * 26), HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 8, 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_HIT], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                             // 地上的孢子螺旋汇进葫芦
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = CIRX - 14 + Math.random() * 28, sy = HY - Math.random() * 2, dx = sx - gx, dy = (sy - gy) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.5 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), tx: gx, ty: gy, orbitR: 2.5 });
      }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 每步：骨铃一响 + 脚印里留一颗泥点
      if (P.step !== 0) { sfx('step', { w: 0.3 }); const fx0 = wx(P.step > 0 ? 5 : -3); spawnX(K_PHYS, fx0, HY - 1, (Math.random() - 0.5) * 10, -14, 0.5, MUD, { g: 200, floor: HY, age0: 0.25 }); spawn(K_EMBER, wx(P.gx), wy(P.gy + 9), (Math.random() - 0.5) * 6, -4, 0.25, R_EL); }
      lastStep = P.step;
    }
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 1 || f === 3) spawn(K_EMBER, gx + (Math.random() - 0.5) * 2, gy - 1, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.45, R_EL); lastPers = f; }
      dripAcc += dt * 1.1; while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, wx(7 + (Math.random() < 0.5 ? 0 : 3)), wy(-16 + P.bob), 0, 4, 0.9, MUD, { g: 90, floor: HY, age0: 0.3 }); }   // 面具下滴泥
    }
    if (state === RECOVER) { smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_RISE, gx + (Math.random() - 0.5) * 2, gy - 1, (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.35 }); } }
    if (state === DEATH && stT > INCOMING + 0.7 && stT < INCOMING + 1.6) {   // 泥里冒泡
      bubAcc += dt * 9; while (bubAcc >= 1) { bubAcc -= 1; spawnX(K_PHYS, wx(-10 + Math.random() * 24), HY - 2, 0, -10 - Math.random() * 8, 0.3, R_EL, { g: 60, age0: 0.45 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-14 + Math.random() * 30), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    geyT += dt; impT += dt; recT += dt; smA += dt;
  }
  function fxReset() { geyT = 9; impT = 9; recT = 9; smA = 9; chargeAcc = 0; soulAcc = 0; dripAcc = 0; bubAcc = 0; smokeAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) { if (!P.melt && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {
    const st = E.state;
    if (st === CAST || st === RECOVER) {
      const t = st === CAST ? geyT : DUR[CAST] + recT;
      if (t < T_HIT + 0.18) {                                           // 泥柱：从地面往上喷，顶上翻花
        const up = clamp01(t / 0.1), down = clamp01((t - T_HIT) / 0.18), h = RD(26 * up * (1 - down)), top = HY - h;
        for (let y = top; y <= HY; y++) {
          const w = y < top + 2 ? 1 : 2 + (y > HY - 3 ? 1 : 0), jig = RD((E.hash(y, f12) - 0.5) * 1.6);
          for (let dx = -w; dx <= w; dx++) { const e = Math.abs(dx) / w; put(CIRX + dx + (e > 0.6 ? jig : 0), y, t < 1 / 12 ? EL[0] : e < 0.4 ? EL[1] : e < 0.8 ? EL[2] : EL[3]); }
        }
        if (h > 6) for (let k = -3; k <= 3; k++) put(CIRX + k, top - (Math.abs(k) === 2 ? 1 : 0) + (Math.abs(k) === 3 ? 1 : 0), Math.abs(k) < 2 ? EL[0] : EL[1]);
      }
      if (t >= T_HIT) {                                                 // 泥潭 + 矛兵剪影 0.4 s 由暗到亮
        const q = t - T_HIT, hw = RD(4 + 5 * clamp01(q / 0.15)), fade = st === RECOVER ? clamp01((recT - 0.45) / 0.25) : 0;
        if (fade < 1) {
          for (let dx = -hw; dx <= hw; dx++) { if (fade > 0 && B8[((dx + 8) & 7) * 8] < fade) continue; put(CIRX + dx, HY, Math.abs(dx) < hw - 2 ? EL[3] : EL[4]); if (Math.abs(dx) < hw - 1) put(CIRX + dx, HY - 1, Math.abs(dx) < 2 && ((f12 >> 1) & 1) ? EL[2] : EL[3]); }
          const lv = q < 0.1 ? 4 : q < 0.2 ? 3 : 2, rise = RD(10 * (1 - clamp01(q / 0.3)));
          ghost(CIRX, HY + rise, EL, lv, Math.max(fade, q < 0.3 ? 0.5 - q : 0), HY - 1);
        }
      }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.melt && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (smA < 2 / 12) {                                                 // 抡杖拖影：葫芦走过的弧
      const c = smA < 1 / 12 ? EL[1] : EL[2], cx = HX + 2 + K_STRIKE.hx, cy = HY + K_STRIKE.hy + 2, r = UP + 3;
      for (let k = 1; k < 12; k++) { if ((k & 1) && smA >= 1 / 12) continue; const a = K_WIND.a + (K_STRIKE.a - K_WIND.a) * k / 12; put(RD(cx + Math.sin(a) * r), RD(cy - Math.cos(a) * r), c); put(RD(cx + Math.sin(a) * (r - 1)), RD(cy - Math.cos(a) * (r - 1)), EL[3]); }
    }
    if (E.state === DEATH && P.melt === 3) {                            // 泥里鼓起一个小矛兵的轮廓，随泥滩一起消散
      const d = E.stT - INCOMING, q = clamp01((d - 1.0) / 0.4), rise = RD(24 * (1 - q)); if (q > 0) ghost(wx(1), HY + rise, EL, 3, Math.max(P.dq, 0.25), HY - 3);
    }
  }

  return {
    name: '野人祭司', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.spore, M.sporeHot], HIT_POINT: [4, -15], EVENTS,
    SFX: { body: 'flesh', how: 'collapse', pal: 'poison', style: 'summon', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
