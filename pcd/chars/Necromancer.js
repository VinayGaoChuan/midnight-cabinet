// 死灵法师（部队 · 骷髅 · 召唤师 · 史诗 · 远程 760）：佝偻的老骷髅法师——墓苔墨绿长袍拖地、下摆破碎，脖子后竖起一圈肋骨扇形立领，
// 头戴三尖骨冠，右手拄一根比人高 4 格的龙颅杖（杖顶一颗小飞龙头骨，下颌会开合，眼窝和口中的魂光是发光体），腰间挂一盏铁笼小魂灯。
// 攻击 = 施法：单手把龙颅杖往前一探，龙颅张嘴吐出一颗旋转的骨弹（白骨芯 + 魂光尾）。
// 技能 = 特性「召唤巨龙」（法力满后召唤一只复仇之龙）：脚下暗色魂光法阵慢转、魂光螺旋汇进龙颅，龙颅越张越大、骨领尖端亮起 →
//        龙颅吐出一大团魂光，在空中展开成一只飞龙剪影 → 飞龙俯冲落到目标前方实体化，落点魂光冲击环 + 骨灰外爆。
// 死亡「落袍」：骨架在袍子里塌缩，长袍空荡荡地落成一堆，骨冠和龙颅杖倒在袍上，魂灯熄灭，一缕魂光从袍里升起。升级成死神（chars/GrimReaper.js）。
PCD.define('Necromancer', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, ASTEP, B8, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, line = parts.line, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：死灵召唤 · 魂光蓝紫（soul：青 → 蓝 → 紫 → 深紫 → 墨）；骨灰用 dust；智力回法点缀 magic 第 2 级 ─────
  const R_EL = FXI.soul, EL = FXR[R_EL], ASH = FXI.dust, MG = FXR[FXI.magic];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'moss', band: 2 }, sleeve: 'moss', rope: 'wood', clasp: 'bone',
    bone: 'bone', rib: 'bone', crown: 'bone', wyrm: 'bone', wood: 'wood', iron: 'iron',
    sock: { r: [0, 0, 52, 53], flat: 1 },                            // 眼窝 / 鼻孔：墨 → 暗紫
    soul: { r: [3, 25, 24, 23], flat: 1 },                           // 魂光（暗 → 亮）：待机 / 蓄力
    soulHot: { r: [24, 23, 22, 21], flat: 1 },                       // 蓄满 / 施放
  });
  const BODY = { body: 'hunched', leg: 11, torso: 11, head: 7, headW: 7, hunch: 3, arm: 12, sw: 4, lw: 2, stride: 3, fall: 'front' };   // 头顶 -26、骨冠 -29、杖顶 -34
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 52, 38, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'wood', 'iron', 'sock', 'soul', 'soulHot', 'wyrm', 'rope', 'clasp']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  // 发光档（P.gem：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）→ [主像素, 次像素]
  const GL = [[[M.soul, 3], [M.soul, 2]], [[M.soul, 4], [M.soul, 3]], [[M.soulHot, 3], [M.soulHot, 2]], [[M.soulHot, 4], [M.soulHot, 3]], [[M.sock, 2], [M.sock, 1]]];

  // ───── 飞龙剪影（技能召唤物：复仇之龙；两帧翼 0 上扬 / 1 下拍 / 2 落地收翼）：只取形状，画时单色 ─────
  const WYRM = [0, 1, 2].map((pose) => {
    const s = new Sprite(36, 26, 18, 14), m = E.defMat('stone'); E.begin(s, 0, 0); E.part();
    const R = (y, a, b) => E.run(y, a, b, m, 0), P1 = (x, y) => E.sp(x, y, m, 0);
    const tri = (ax, ay, bx, by, cx, cy) => {                         // 三角形填充（包围盒里逐点判断）
      const sd = (x, y, p, q, r, s) => (x - r) * (q - s) - (p - r) * (y - s);
      for (let y = Math.min(ay, by, cy); y <= Math.max(ay, by, cy); y++) for (let x = Math.min(ax, bx, cx); x <= Math.max(ax, bx, cx); x++) {
        const d1 = sd(x, y, ax, ay, bx, by), d2 = sd(x, y, bx, by, cx, cy), d3 = sd(x, y, cx, cy, ax, ay);
        if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) P1(x, y);
      }
    };
    const lift = pose === 2 ? 4 : 0;                                  // 落地时整体低 4 格（腿着地）
    R(-2 + lift, -4, 4); R(-1 + lift, -5, 5); R(lift, -5, 5); R(1 + lift, -4, 3);                          // 身体
    for (let k = 0; k <= 5; k++) { const x = 4 + k, y = -2 - k + lift; R(y, x, x + 2); }                  // 长脖子
    R(-9 + lift, 9, 12); R(-8 + lift, 9, 14); R(-7 + lift, 10, 15); P1(15, -6 + lift); P1(12, -6 + lift); P1(13, -5 + lift);   // 头 + 张开的颚
    P1(9, -10 + lift); P1(8, -11 + lift); P1(11, -10 + lift); P1(11, -11 + lift);                          // 骨冠两尖
    for (let k = 0; k <= 10; k++) { P1(-5 - k, lift + RD(k * 0.35) + (k > 6 ? 1 : 0)); if (k < 6) P1(-5 - k, lift + 1 + RD(k * 0.35)); }                      // 细尾
    P1(-16, lift + 4); P1(-17, lift + 3); P1(-16, lift + 3);                                               // 尾尖
    if (pose === 2) { R(lift + 2, -2, -1); R(lift + 3, -2, -1); R(lift + 3, 1, 2); R(lift + 2, 1, 2); R(lift + 4, -3, 0); R(lift + 4, 1, 4); }   // 两条后腿着地
    else { R(2, -2, -1); R(3, -3, -2); R(4, -4, -2); R(2, 1, 2); R(3, 1, 2); R(4, 2, 3); }                // 后腿收起
    if (pose === 0) { tri(1, -2, -2, -13, -13, -6); tri(1, -2, -13, -6, -5, -1); for (const [x, y] of [[-6, -5], [-9, -6], [-12, -6]]) E.sp(x, y + 1, 0, 0); }   // 翼上扬（后缘破口）
    else if (pose === 1) { tri(1, -2, -7, -5, -14, 5); tri(1, -2, -14, 5, -3, 1); for (const [x, y] of [[-8, 2], [-11, 4]]) E.sp(x, y, 0, 0); }
    else { tri(0, 2, -3, -8, -9, 1); }                                                                     // 收翼
    return s;
  });
  function ghost(s, X, Y, lv, dq) {                                   // 单色剪影，左上沿亮一级；dq 抖动消散
    const o = s.mat, w = s.w;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!o[i] || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue;
      const edge = x === 0 || !o[i - 1] || y === 0 || !o[i - w]; put(X - s.ox + x, Y - s.oy + y, EL[CL(edge ? lv - 1 : lv, 0, 4)]);
    }
  }

  // ───── 姿势：前手 hx/hy 握杖（杖角 a）；后手 bhx/bhy ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, jaw: 0, lamp: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, heap: 0, lift: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(10, -16, 0, 4, -11, 0, 0, 0);                    // 右手拄杖，左手搭在袍前
  const K_WIND = K(8, -18, -0.2, 2, -13, -1, -1, 0);                  // 杖往回收、龙颅合嘴
  const K_POKE = K(14, -19, 0.6, 5, -13, 1, 1, 1);                    // 往前一探：龙颅张嘴吐骨弹
  const K_FOLLOW = K(13, -18, 0.45, 5, -12, 1, 0, 1);
  const K_CHARGE = K(11, -20, 0.1, -2, -27, -1, -1, 0);                // 蓄力：杖举高、左手举过头顶
  const K_CAST = K(14, -22, 0.35, 5, -24, 1, 0, 0);                   // 施放：杖往前上方一送
  const K_HURT = K(8, -15, -0.25, 1, -12, -1, -1, 0);
  const K_SAG = K(11, -12, 0.45, 5, -8, 2, 1, 3);                     // 死亡：骨架在袍里往下塌
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -40, 40], ['hy', -48, 8], ['ai', -64, 64], ['bhx', -40, 40], ['bhy', -48, 8], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['jaw', 0, 2], ['lamp', -1, 1], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['heap', 0, 3], ['lift', 0, 3], ['dqi', 0, 48], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1], LAMP_IDLE = [0, 1, 0, -1];
  // 待机个性：左手抚摸杖顶龙颅（手位、下颌、闪光、抬头）
  const PERS = [[5, -24, 0, 0, -1], [7, -30, 1, 1, -1], [7, -30, 0, 0, -1], [7, -30, 1, 1, -1], [5, -22, 0, 0, 0]];
  const WALK = [[12, -16, -0.15], [11, -18, 0.05], [9, -16, 0.15], [10, -17, 0]];   // 拄杖蹒跚：接触 A 杖先着地在前 → 经过提杖 → 接触 B 杖落在后 → 经过
  const T_SPIT = 2 / 12, T_LAND = INCOMING + 0.66, T_HIT = 4 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.jaw = 0; P.lamp = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0;
    P.flash = 0; P.heap = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.lamp = LAMP_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), c = PERS[f]; P.bhx = c[0]; P.bhy = c[1]; P.jaw = c[2]; P.glint = c[3]; P.head = c[4]; if (c[3]) P.gem = 1; P.lamp = f & 1 ? 1 : -1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f);
      P.hx = WALK[f][0]; P.hy = WALK[f][1]; P.a = WALK[f][2]; P.lamp = -P.sway; P.bhy += f & 1 ? -1 : 0;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.lamp = 1; }
      else if (tq < 0.2) { setK(K_POKE, K_POKE, 0); P.jaw = 2; P.gem = 3; P.rim = 2; P.lamp = -1; P.sway = -1; }
      else if (tq < 0.45) { setK(K_POKE, K_FOLLOW, ease.out((tq - 0.2) / 0.25)); P.jaw = tq < 0.3 ? 2 : 1; P.gem = 1; P.lamp = -1; }
      else { setK(K_FOLLOW, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.lamp = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 龙颅下颌越张越大，骨领尖端亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.jaw = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      P.sway = q > 0.4 ? -1 - (tq > 1.1 && (f12 & 1) ? 1 : 0) : 0; P.lamp = tq > 0.5 ? ((f12 >> 1) & 1 ? 1 : -1) : 0;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.jaw = 2; P.gem = 3; P.rim = 3; P.sway = -2; P.lamp = -1; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.jaw = q < 0.3 ? 2 : q < 0.6 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.lamp = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.sway = 2; P.lamp = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; P.lamp = -1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 落袍：塌 → 半堆 → 一堆空袍
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.sway = 2; P.lamp = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_SAG, K_SAG, 0); P.bx = -1; P.eyes = 1; P.jaw = 2; P.sway = 1; P.lamp = -1; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_IDLE, K_IDLE, 0); P.heap = d < 0.58 ? 1 : d < 0.66 ? 2 : 3; P.bx = -1;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + Math.min(3, RD(P.crouch)); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob;
    P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    if (P.heap) { P.gx = LAMP_AT[0] + P.bx; P.gy = LAMP_AT[1] - 4; }
    else { const S = staffPts(P.hx, P.hy, P.a); P.gx = S.sx + P.bx; P.gy = S.sy - 3; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  const UP = 10, DN = 17, LEN = UP + DN;
  function staffPts(hx, hy, a) { const dx = Math.sin(a), dy = -Math.cos(a), tx = RD(hx + dx * UP), ty = RD(hy + dy * UP); return { dx, dy, tx, ty, bx: hx - dx * DN, by: hy - dy * DN, sx: tx + 1, sy: ty - 1 }; }
  // 候选部件：ribCollar —— 立领骨领：脖子后一圈肋骨一根根竖起成扇形（4 根，尖端高出头侧 3 格），尖端按发光档亮起轮廓光
  function ribCollar(R, lv) {
    E.part(); const bx = R.hx0 + 1, by = R.hy + 1, m = M.rib;
    const RIBS = [[-3, -11, -1, -6], [-7, -8, -3, -5], [-9, -4, -5, -3], [-9, 0, -5, -1]];   // [尖 dx, dy, 弯折点 dx, dy]
    RIBS.forEach(([tx, ty, mx, my], i) => {
      line(E, R, bx, by, bx + mx, by + my, m, 0); line(E, R, bx + mx, by + my, bx + tx, by + ty, m, i === 0 ? 3 : 0);
      px(E, R, bx + mx + (i < 2 ? -1 : 0), by + my + (i < 2 ? 0 : 1), m, 2);                    // 肋骨内侧的暗面
      const g = lv >= 1 && lv <= 3 ? GL[lv][i & 1] : null; px(E, R, bx + tx, by + ty, g ? g[0] : m, g ? g[1] : 4);
    });
  }
  // 候选部件：skullHead —— 骷髅头（7×7 颅骨 + 眉骨 + 2 格眼窝，前窝一点魂光 + 鼻孔 + 上牙排 + 下颌 + 太阳穴凹陷）；eyes 1 = 眼光熄灭
  function skullHead(R, lv) {
    E.part(); const m = M.bone, x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey;
    run(E, R, top, x0 + 1, x1 - 1, m, 0); for (let y = top + 1; y <= ey; y++) run(E, R, y, x0, x1, m, 0);
    run(E, R, ey + 1, x0, x1 + 1, m, 0); run(E, R, ey + 2, x0 + 2, x1 + 1, m, 0); run(E, R, ey + 3, x0 + 3, x1, m, 0);
    run(E, R, ey - 1, x1 - 2, x1, m, 4);                                                               // 眉骨
    px(E, R, x1 - 2, ey, M.sock, 1); const g = P.eyes ? [M.sock, 2] : GL[lv][0]; px(E, R, x1 - 1, ey, g[0], g[1]);   // 眼窝
    px(E, R, x1, ey + 1, M.sock, 1);                                                                   // 鼻孔
    for (let x = x0 + 3; x <= x1 + 1; x++) px(E, R, x, ey + 2, m, (x & 1) ? 4 : 2);                     // 上牙排
    px(E, R, x0 + 2, ey, m, 2); px(E, R, x0 + 1, ey + 1, m, 2); px(E, R, x0 + 2, top + 1, m, 2);         // 太阳穴、颅缝
    px(E, R, x0 + 3, ey + 3, m, 2);
    if (P.glint && lv < 3) px(E, R, x1 - 1, ey - 1, M.soulHot, 3);
  }
  // 候选部件：boneCrown —— 三尖骨冠：头顶一圈骨箍（亮暗相间），前后两根尖往外斜、中间一根最高（高出头顶 3 格）；T/x0/top 可落在地上
  function boneCrown(T, x0, top, w) {
    E.part(); const m = M.crown, x1 = x0 + w - 1;
    for (let x = x0 + 1; x <= x1 - 1; x++) px(E, T, x, top, m, (x & 1) ? 4 : 3);
    px(E, T, x0 + 1, top - 1, m, 3); px(E, T, x0, top - 2, m, 4);                                        // 后尖（往后斜）
    const mx = x0 + RD(w / 2); px(E, T, mx, top - 1, m, 3); px(E, T, mx, top - 2, m, 3); px(E, T, mx, top - 3, m, 4);   // 中尖
    px(E, T, x1 - 1, top - 1, m, 3); px(E, T, x1, top - 2, m, 4);                                        // 前尖（往前斜）
  }
  // 候选部件：wyrmSkull —— 小飞龙头骨（后掠小角、眼窝发光、长吻、上牙；下颌按 jaw 0–2 张开，张嘴时口中魂光）；(sx, sy) = 下颌铰点
  function wyrmSkull(T, sx, sy, jaw, lv) {
    E.part(); const m = M.wyrm, G = GL[lv];
    px(E, T, sx - 3, sy - 5, m, 3); px(E, T, sx - 4, sy - 6, m, 4); px(E, T, sx - 5, sy - 6, m, 3);    // 后掠小角
    run(E, T, sy - 4, sx - 2, sx + 1, m, 0); run(E, T, sy - 3, sx - 3, sx + 2, m, 0); run(E, T, sy - 2, sx - 3, sx + 4, m, 0); run(E, T, sy - 1, sx - 2, sx + 5, m, 0);
    px(E, T, sx, sy - 3, G[0][0], G[0][1]); px(E, T, sx - 1, sy - 3, M.sock, 1);                         // 眼窝
    px(E, T, sx + 1, sy - 4, m, 4); px(E, T, sx + 4, sy - 2, M.sock, 1); px(E, T, sx + 2, sy - 2, m, 2);   // 眉骨、鼻孔、吻脊
    for (let k = 0; k < jaw; k++) for (let x = sx; x <= sx + 3; x++) px(E, T, x, sy + k, k === 0 && (x & 1) ? m : G[1][0], k === 0 && (x & 1) ? 4 : G[1][1]);   // 张嘴：上牙 + 口中魂光
    for (let y = sy; y <= sy + jaw; y++) px(E, T, sx - 1, y, m, 2);                                     // 下颌铰
    run(E, T, sy + jaw, sx - 1, sx + 4 - (jaw >> 1), m, 0); px(E, T, sx + 4 - (jaw >> 1), sy + jaw - 1, m, 4);   // 下颌 + 下牙尖
    if (P.glint && lv < 3) px(E, T, sx + 1, sy - 5, M.soulHot, 4);
  }
  // 龙颅杖：黑木杖身（2 格，左亮右暗）+ 三道缠骨；(bx, by) 杖底、a 杖角
  function wyrmStaff(T, bx, by, a, jaw, lv) {
    const dx = Math.sin(a), dy = -Math.cos(a), tx = bx + dx * LEN, ty = by + dy * LEN;
    E.part(); line(E, T, bx, by, tx, ty, M.wood, 2); line(E, T, bx - 1, by, tx - 1, ty, M.wood, 3);
    for (const k of [6, 13, 20]) { const x = bx + dx * k, y = by + dy * k; px(E, T, x - 1, y, M.bone, 4); px(E, T, x, y, M.bone, 3); px(E, T, x - 1, y + 1, M.bone, 2); }
    px(E, T, bx, by, M.iron, 3);
    wyrmSkull(T, RD(tx) + 1, RD(ty) - 1, jaw, lv);
  }
  // 候选部件：soulLamp —— 腰间小魂灯：短链 + 铁笼（上下铁盖、左右铁条）+ 笼里一团魂光（按发光档，熄灭 = 暗紫）；sw 下半摆动
  function soulLamp(T, ax, ay, sw, lv) {
    E.part(); const m = M.iron, G = GL[lv]; px(E, T, ax, ay, m, 3); px(E, T, ax + (sw > 0 ? 1 : 0), ay + 1, m, 2);
    const x = ax + sw; run(E, T, ay + 2, x - 1, x + 1, m, 0);
    for (let y = ay + 3; y <= ay + 5; y++) { px(E, T, x - 1, y, m, 3); px(E, T, x + 1, y, m, 2); px(E, T, x, y, y === ay + 4 ? G[0][0] : G[1][0], y === ay + 4 ? G[0][1] : G[1][1]); }
    run(E, T, ay + 6, x - 1, x + 1, m, 0); px(E, T, x, ay + 7, m, 2);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.heap) return drawHeap();
    const R = parts.rig(P, BODY), S = staffPts(P.hx, P.hy, P.a);
    ribCollar(R, P.gem);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.sleeveD, hand: M.boneD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD, w: 2 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, hem: -2, trim: M.rope, belt: M.rope, buckle: M.clasp });
    { const LL = tor.rows[0], RR = tor.rows[1], L = LL[LL.length - 1], Rr = RR[RR.length - 1];     // 破碎下摆：后半截垂下参差的布条（同一部件）
      for (let x = L; x <= Rr - 5; x++) { const q = (((x - P.sway) % 3) + 3) % 3; if (q === 1) { px(E, R, x, -1, M.robe, 2); if (x < L + 5) px(E, R, x - 1, 0, M.robe, 1); } } }
    soulLamp(R, tor.front - 1, tor.belt + 1, P.lamp, P.gem);
    skullHead(R, P.gem);
    boneCrown(R, R.hx0, R.htop, R.hw);
    wyrmStaff(R, S.bx, S.by, P.a, P.jaw, P.gem);
    parts.arm(E, R, P, { sleeve: 'bell', mat: M.sleeve, hand: M.bone, grip: 'fist' });
  }
  // 落袍：1 骨架在袍里塌下 → 2 半堆（龙颅杖往前倒）→ 3 一堆空袍（骨冠、龙颅杖倒在袍上，魂灯落在一旁）
  const HEAP = {
    1: [[0, -8, 8], [-1, -8, 8], [-2, -7, 7], [-3, -7, 7], [-4, -7, 7], [-5, -7, 7], [-6, -6, 7], [-7, -6, 6], [-8, -6, 6], [-9, -5, 6], [-10, -5, 5], [-11, -4, 5], [-12, -3, 4]],
    2: [[0, -10, 9], [-1, -9, 9], [-2, -9, 8], [-3, -8, 8], [-4, -7, 7], [-5, -6, 6], [-6, -5, 5], [-7, -4, 4], [-8, -2, 3]],
    3: [[0, -12, 11], [-1, -12, 10], [-2, -11, 10], [-3, -11, 9], [-4, -10, 8], [-5, -8, 7], [-6, -7, 5], [-7, -5, 3], [-8, -3, 1]],
  };
  const LAMP_AT = [-14, -8], FREE = parts.FREE;
  function drawHeap() {
    const s = P.heap, rows = HEAP[s], top = rows[rows.length - 1][0];
    // 骨领的肋骨从袍堆后面戳出来
    E.part(); const rb = s === 3 ? [[-6, -3, -9, -7], [-4, -4, -5, -8]] : s === 2 ? [[-3, -7, -7, -12], [-1, -8, -2, -14], [-5, -5, -9, -9]] : [[-2, -11, -5, -17], [0, -12, -1, -18], [-4, -9, -8, -14]];
    for (const [a, b, c, d] of rb) { line(E, FREE, a, b, c, d, M.rib, 0); px(E, FREE, c, d, M.rib, 4); }
    if (s === 3) soulLamp(FREE, LAMP_AT[0], LAMP_AT[1], 0, P.gem);
    E.part();
    for (const [y, L, R] of rows) run(E, FREE, y, L, R, M.robe, 0);
    for (const [y, L, R] of rows) if (y > top + 1) { px(E, FREE, L + 2 + ((y * 3) & 1), y, M.robe, 2); if (R - L > 8) px(E, FREE, RD((L + R) / 2) + (y & 1), y, M.robe, 2); }   // 褶
    for (let x = rows[0][1]; x <= rows[0][2]; x += 3) px(E, FREE, x, 0, 0, 0);                          // 破下摆
    run(E, FREE, top + 2, rows[rows.length - 3][1] + 1, rows[rows.length - 3][1] + 3, M.rope, 0);        // 腰绳露出一截
    px(E, FREE, rows[0][2] - 1, -1, M.bone, 3); px(E, FREE, rows[0][2], -1, M.bone, 4);                // 袖口里伸出的骨手指
    if (s === 1) { const hx0 = -1, ht = -19; E.part(); for (let y = ht; y <= ht + 5; y++) run(E, FREE, y, hx0 + (y === ht ? 1 : 0), hx0 + 6, M.bone, 0); px(E, FREE, hx0 + 5, ht + 3, M.sock, 1); px(E, FREE, hx0 + 4, ht + 3, M.sock, 1); for (let x = hx0 + 3; x <= hx0 + 6; x++) px(E, FREE, x, ht + 5, M.bone, (x & 1) ? 4 : 2); boneCrown(FREE, hx0, ht, 7); }
    else if (s === 2) { const hx0 = -1, ht = -12; E.part(); for (let y = ht; y <= ht + 3; y++) run(E, FREE, y, hx0 + (y === ht ? 1 : 0), hx0 + 6, M.bone, 0); px(E, FREE, hx0 + 5, ht + 3, M.sock, 1); boneCrown(FREE, hx0, ht, 7); }
    else boneCrown(FREE, -3, top, 7);                                                                  // 骨冠掉在袍堆顶上
    if (s === 1) wyrmStaff(FREE, 9, 0, 0.75, 2, P.gem);
    else if (s === 2) wyrmStaff(FREE, 7, 0, 1.25, 2, P.gem);
    else { E.part(); line(E, FREE, -10, -4, 16, -1, M.wood, 2); line(E, FREE, -10, -5, 16, -2, M.wood, 3); for (const x of [-3, 4, 11]) { const y = RD(-4 + (x + 10) * 3 / 26); px(E, FREE, x, y - 1, M.bone, 4); px(E, FREE, x, y, M.bone, 3); } wyrmSkull(FREE, 18, -1, 1, 4); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let wyT = 9, recT = 9, chargeAcc = 0, soulAcc = 0, wispAcc = 0, emberAcc = 0, lastStep = 0, lastPers = -1, mzT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y, LX = DUMMY_X - 13;   // LX：飞龙落点（目标前方）
  const mouth = () => [wx(P.gx + 3), wy(P.gy + 4)];
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX + 4, HY + 1, 17, 4, R_EL, 2.4, 0.45, 0);                            // 暗色魂光法阵慢转
    if (s === RECOVER) recT = 0;
    if (s !== CAST) return;
    wyT = 0; const [mx, my] = mouth();
    releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, to: [mx + 8, my - 8, 4] });
    burst(mx + 1, my, 24, 40, 110, 0.25, 0.6, R_EL, 10); ring(mx + 2, my, 1, R_EL); fx.cross(mx + 1, my, 5, R_EL, 0.2);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'orb' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SPIT) {                                // 龙颅张嘴吐出旋转骨弹
      const [mx, my] = mouth(); mzT = 0;
      shoot(1, mx + 1, my, 150, DUMMY_X - 4, R_EL, 0, { trail: { every: 2, life: [0.15, 0.35], back: [10, 26] } });
      burst(mx, my, 6, 20, 50, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_HIT) {                                   // 飞龙落地实体化：魂光冲击环 + 骨灰外爆
      ring(LX, HY - 3, 1, R_EL); burst(LX, HY - 5, 20, 40, 120, 0.3, 0.7, R_EL, 20); burst(LX, HY - 2, 18, 30, 90, 0.35, 0.8, ASH, 30);
      for (let i = 0; i < 10; i++) spawn(K_DUST, LX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 10, 0.5, ASH);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.5 });
    }
    if (s === DEATH && t === T_LAND) {                                 // 空袍落地：尘 + 骨灰
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-12 + Math.random() * 26), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.4 });
    }
  }
  const EVENTS = [[], [], [T_SPIT], [], [T_HIT], [], [], [T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); burst(x, y, 5, 20, 60, 0.2, 0.4, ASH, 10); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); spawn(K_EMBER, x - 6, y - 2, 0, -12, 0.5, FXI.magic); }   // 智力：击杀回法的小紫光
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy), [mx, my] = mouth();
    if (state === CHARGE) {                                             // 法阵上的魂光螺旋汇进龙颅
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = HX + 4 + (Math.random() - 0.5) * 34, sy = HY - Math.random() * 3, dx = sx - mx, dy = (sy - my) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, mx, my, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random() * 1.5), tx: mx, ty: my, orbitR: 2 });
      }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 一步一拄杖：杖尖落地 1 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.3 }); const S = staffPts(P.hx, P.hy, P.a); spawn(K_DUST, wx(RD(S.bx)), HY - 1, (Math.random() - 0.5) * 10, -5 - Math.random() * 4, 0.35, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 1 || f === 3) spawn(K_EMBER, gx + (Math.random() - 0.5) * 2, gy - 1, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.45, R_EL); lastPers = f; }
      emberAcc += dt * 1.2; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(RD(P.hx) - 6 + P.lamp + (Math.random() < 0.5 ? 0 : 1)), wy(-9), (Math.random() - 0.5) * 4, -5 - Math.random() * 4, 0.6, R_EL); }   // 魂灯冒出的小魂光
    }
    if (state === RECOVER) { wispAcc += dt * 10; while (wispAcc >= 1) { wispAcc -= 1; spawn(K_RISE, gx + (Math.random() - 0.5) * 3, gy - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6, R_EL); } }
    if (state === DEATH && stT > INCOMING + 0.8 && stT < INCOMING + 1.6) {   // 一缕魂光从袍里升起
      wispAcc += dt * 14; while (wispAcc >= 1) { wispAcc -= 1; const u = stT - INCOMING; spawn(K_RISE, wx(-1 + Math.sin(u * 9) * 1.5), HY - 6, Math.sin(u * 7) * 5, -16 - Math.random() * 6, 0.9 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-12 + Math.random() * 30), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    wyT += dt; recT += dt; mzT += dt;
  }
  function fxReset() { wyT = 9; recT = 9; mzT = 9; chargeAcc = 0; soulAcc = 0; wispAcc = 0; emberAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) { if (!P.heap && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 飞龙：吐出的魂光团（0–0.08）→ 空中展开成飞龙剪影（0.08–0.16）→ 俯冲到目标前方（0.16–0.33）→ 落地实体化，收招里抖动消散
  function fxMid(f12) {
    const st = E.state; if (st !== CAST && st !== RECOVER) return;
    const t = st === CAST ? wyT : DUR[CAST] + recT, ox = HX + 18, oy = HY - 40;
    if (t < 0.08) { const r = 2 + RD(t / 0.08 * 3); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d <= r * r) put(ox - 4 + x, oy + 6 + y, d < 2 ? 21 : d < r * r * 0.5 ? EL[0] : EL[1]); } }
    else if (t < 0.16) ghost(WYRM[f12 & 1], ox, oy, t < 0.12 ? 1 : 2, 0.5 - (t - 0.08) * 6);
    else if (t < T_HIT) { const q = ease.in((t - 0.16) / (T_HIT - 0.16)), x = RD(ox + (LX - ox) * q), y = RD(oy + (HY - 4 - oy) * q * q); ghost(WYRM[(f12 >> 0) & 1], x, y, 2, 0); for (let k = 1; k <= 3; k++) ghost(WYRM[1], RD(x - (LX - ox) * 0.12 * k), RD(y - (HY - 4 - oy) * 0.12 * k), 3 + (k >> 1), 0.35 + k * 0.18); }
    else { const q = t - T_HIT, lv = q < 1 / 12 ? 0 : q < 0.25 ? 1 : 2, dq = st === RECOVER ? clamp01((recT - 0.3) / 0.35) : 0; if (dq < 1) ghost(WYRM[2], LX, HY - 8, lv, dq); }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.heap && P.dq < 1) { const [mx, my] = mouth(), L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(mx + r, my, c); put(mx, my - r, c); put(mx, my + r, c); } put(gx, gy - 2, EL[0]); }
    if (mzT < 2 / 12) { const [mx, my] = mouth(), c = mzT < 1 / 12 ? 21 : EL[0]; for (let r = 1; r <= 3; r++) { put(mx + r, my, r < 3 ? c : EL[1]); put(mx + 1, my - r + 1, EL[1]); } }
  }
  // 骨弹：白骨芯逐帧转 45°（十字 ↔ 斜十字）+ 魂光尾
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1) return false;
    put(x, y, 21); put(x - d, y, EL[0]); put(x - 2 * d, y, EL[1]); put(x - 3 * d, y, EL[2]);
    if (f12 & 1) { put(x - 1, y - 1, 17); put(x + 1, y + 1, 17); put(x + 1, y - 1, 6); put(x - 1, y + 1, 6); } else { put(x, y - 1, 17); put(x, y + 1, 6); put(x + d, y, 17); }
    return true;
  }

  return {
    name: '死灵法师', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.soul, M.soulHot], HIT_POINT: [3, -16], EVENTS,
    SFX: { body: 'flesh', how: 'collapse', pal: 'shadow', style: 'summon', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
