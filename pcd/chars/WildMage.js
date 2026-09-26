// 野法师（部队 · 自然 · 法师 · 普通 · 近战 240）：刚发芽的小洋葱——孩童体、8 格宽的奶白球茎头（顶部收尖、淡紫纵纹）、
// 头顶两片嫩叶芽左右分叉、肩上一圈外翘的锯齿叶披肩、右手细枝叶刃杖（杖头一片锯齿大叶，叶脉是发光体）。
// 攻击 = 单手横甩叶杖，甩出 3 片旋转飞叶刀扫过目标和它身边（溅射）；技能 = 特性「飞叶快刀」蓄满版：落叶螺旋汇聚绕头 → 原地转一圈甩出 8 片飞叶 → 目标处 3 道交叉斩 + 半径 10 的溅射圈。
// 升级线：野法师 → 炮灰法师（CannonFodderMage.js）→ 法师英雄（MageHero.js），同一株球茎植物从发芽到盛放（芽 → 叶冠 → 花冠、叶披肩 → 叶披风）。
PCD.define('WildMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：飞叶 · 嫩绿叶刃（nature 色阶 21 白 → 淡黄绿 → 叶绿 → 深绿 → 墨绿）；收招落叶走「枯叶」色阶 ─────
  const R_EL = FXI.nature, EL = FXR[R_EL];
  const R_WITHER = E.fxRamp('leafWither', [38, '#a6d45a', 62, 61, 20]);

  // ───── 材质 ─────
  const M = parts.mats(E, {
    leaf: ['#13240c', '#2f5a1a', '#5f9a2c', '#a6d45a'],               // 嫩黄绿叶片：叶披肩、叶芽、叶刃
    stem: 'green',                                                      // 茎绿：身体、细胳膊细腿
    bulb: ['#3a3020', '#8a7a8c', '#d8ccae', '#f4efe0'],                // 奶白洋葱皮（暗级偏淡紫：纵纹用它）
    root: 'sand', wood: 'wood', ink: { r: 'ink', flat: 1 }, blush: 'pink',
    dry: 'leather',                                                     // 枯萎后的叶 / 茎
    vein: { r: ['#2f5a1a', 37, 38, 21], flat: 1 },                      // 叶脉（发光体）
  });
  const BODY = { body: 'child', head: 8, headW: 8, stride: 1, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 50, 42, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'vein', 'ink', 'bulb', 'root', 'blush']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 叶刃杖（a 杖角），后手自然摆 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, spr: 0, sq: 0, wth: 0, hop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(4, -6, 0.46, -3, -5);                 // 叶杖斜举在身前，叶刃朝前上
  const K_WIND = K(0, -10, -0.6, -4, -7, -1, 0);         // 后引：杖甩到肩后
  const K_SWING = K(6, -8, 1.57, -4, -6, 1, 1);          // 出手：横甩，杖水平指向目标
  const K_FOLLOW = K(5, -6, 2.03, -3, -6, 1, 0);         // 延续：杖甩到前下
  const K_CHARGE = K(3, -11, 0, -4, -9, -1, -1);         // 蓄力：杖竖举过头
  const K_SPIN = K(1, -9, -0.46, -3, -8, 0, 0);          // 转身（镜像帧用）
  const K_CAST = K(6, -9, 1.1, -5, -8, 1, 1);            // 施放：杖向前上甩出
  const K_HURT = K(2, -5, 0.2, -4, -4, -1, -1);
  const K_KNEEL = K(5, -3, 1.57, -2, -3, 2, 1, 4);       // 从腰部折弯跪下
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['spr', 0, 4], ['sq', 0, 1], ['hop', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['wth', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_SWING = 2 / 12, T_THROW = 2 / 12, T_LAND = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：头顶两片嫩叶像螺旋桨转半圈再停住，脑袋晃一下
  const PERS_SPR = [1, 2, 3, 2, 0], PERS_HEAD = [0, 1, 1, -1, 0];
  const STAFF_N = 9, BLADE = [1, 2, 3, 3, 3, 2, 1];      // 杖身 9 格 + 叶刃 7 格（逐格宽度）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.spr = 0; P.sq = 0; P.wth = 0; P.hop = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); P.spr = PERS_SPR[i]; P.head = PERS_HEAD[i]; P.glint = i === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                // 蹦跳：两脚并拢一次蹦一格，落地球茎头压扁 1 格
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.bob = 0; P.hop = [0, 2, 0, 1][f]; P.sq = [1, 0, 1, 0][f]; P.spr = [0, 2, 0, 2][f]; P.a = K_IDLE.a + [0, -0.2, 0, 0.2][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.spr = 3; P.beard = 1; }
      else if (tq < 0.2) { setK(K_SWING, K_SWING, 0); P.bx = 4; P.gem = 2; P.rim = 2; P.spr = 1; P.sway = -1; P.beard = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_SWING, K_FOLLOW, q); P.bx = RD(4 - 2 * q); P.gem = 1; P.spr = 1; }
      else { const q = clamp01((tq - 0.45) / 0.3); setK(K_FOLLOW, K_IDLE, ease.inOut(q)); P.bx = RD(2 * (1 - clamp01(q * 1.5))); }
    } else if (st === CHARGE) {                                            // 嫩叶越转越快，叶脉发光 1 → 2
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.spr = tq < 0.2 ? 0 : (tq < 0.8 ? Math.floor(f12 / 2) : f12) & 3;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {                                              // 原地转一整圈（镜像 2 帧）→ 甩杖定格
      if (tq < 1 / 12) { setK(K_CHARGE, K_SPIN, 0.5); P.flip = 1; P.spr = 2; P.gem = 3; P.rim = 3; P.sway = 1; }
      else if (tq < 2 / 12) { setK(K_SPIN, K_SPIN, 0); P.flip = 1; P.spr = 1; P.gem = 3; P.rim = 3; P.sway = 1; P.beard = 1; }
      else if (tq < 4 / 12) { setK(K_CAST, K_CAST, 0); P.gem = 3; P.rim = 3; P.spr = 2; P.beard = -2; P.sway = -1; }
      else { setK(K_CAST, K_IDLE, 0.3); P.gem = 2; P.rim = 2; P.spr = 1; P.beard = -1; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, 0.3 + 0.7 * q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.spr = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.spr = 3; P.sq = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.spr = 3; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                             // 枯萎：芽先蔫垂 → 从腰部折弯 → 侧着倒下 → 叶片卷曲变枯褐 → 自上而下消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.spr = 3; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.spr = 4; }
      else {
        P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.spr = 4; P.lean = 0; P.head = 0; P.crouch = 0;
        P.hx = 3; P.hy = -6; P.bhx = -2; P.bhy = -5; P.a = 0;
        const hq = clamp01((d - 0.5) / 0.4); P.hatX = RD(-6 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 5);
        P.wth = d < 0.9 ? 0 : d < 1.25 ? 1 : 2; P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = -20 + P.hatX + P.bx; P.gy = -1 - P.hatY; }
    else { const c = parts.cell(parts.snapDir(P.a), P.hx, P.hy, STAFF_N + 3); P.gx = c[0] + P.bx; P.gy = c[1] - P.hop; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：bulbHead —— 球茎头（洋葱形：顶部收尖、下半圆鼓），脸画在同一部件里（大眼 + 腮红 + 小嘴），暗级偏淡紫画纵纹
  const BULB8 = [2, 4, 6, 8, 8, 8, 8, 6], BULB7 = [2, 4, 6, 8, 8, 8, 6];
  function bulbHead(R, mat) {
    const prof = R.hh >= 8 ? BULB8 : BULB7, top = R.htop, c = R.hx + 1;
    E.part();
    for (let i = 0; i < prof.length; i++) { const y = top + i, w = prof[i]; parts.run(E, R, y, c - w / 2, c + w / 2 - 1, mat, 0); }
    for (let y = top + 1; y < R.hy; y++) { PX(E, R, c - 2, y, mat, 2); if (y > top + 2 && y < R.hy - 1) PX(E, R, c + 1, y, mat, 2); }   // 淡紫纵纹
    const ex = c + 2, ey = R.ey;
    if (P.eyes) { PX(E, R, ex, ey + 1, mat, 1); PX(E, R, ex - 1, ey + 1, mat, 1); }
    else { PX(E, R, ex, ey, M.ink, 1); PX(E, R, ex, ey + 1, M.ink, 1); PX(E, R, ex + 1, ey, mat, 4); }
    PX(E, R, ex - 1, ey + 2, M.blush, 3); PX(E, R, ex + 1, ey + 3, mat, 1);
  }
  // 候选部件：sprouts —— 头顶一对嫩叶芽（5 个姿态：0 V 形分叉 · 1 右转 · 2 转成一字（螺旋桨侧面）· 3 左转 · 4 蔫垂）
  const SPR = [
    [[1, -1], [2, -1], [2, -2], [3, -2], [3, -3], [4, -3], [0, -1], [-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -3]],
    [[1, -1], [2, -1], [3, -1], [3, -2], [4, -2], [5, -2], [0, -1], [0, -2], [1, -2], [0, -3], [1, -3], [1, -4]],
    [[1, -1], [2, -1], [3, -1], [4, -1], [5, -2], [0, -1], [-1, -1], [-2, -1], [-3, -1], [-4, -2], [0, -2], [1, -2]],
    [[0, -1], [-1, -1], [-2, -1], [-2, -2], [-3, -2], [-4, -2], [1, -1], [1, -2], [0, -2], [1, -3], [0, -3], [0, -4]],
    [[1, -1], [2, -1], [3, 0], [4, 1], [4, 2], [0, -1], [-1, -1], [-2, 0], [-3, 1], [-3, 2]],
  ];
  const SPR_TIP = [[5, 11], [5, 11], [4, 9], [5, 11], [4, 9]];
  function sprouts(R, m) {
    E.part(); const s = SPR[P.spr] || SPR[0], bx = R.hx, by = R.htop - 1;
    PX(E, R, bx, by, m, 3); PX(E, R, bx + 1, by, m, 3);
    for (let i = 0; i < s.length; i++) PX(E, R, bx + s[i][0], by + s[i][1], m, SPR_TIP[P.spr].includes(i) ? 4 : 0);
  }
  // 候选部件：leafMantle —— 叶片小披肩：parts.mantle（plain 锯齿下摆）+ 前后两端外翘的叶尖（同一部件）
  function leafMantle(R, m) {
    parts.mantle(E, R, P, { style: 'plain', mat: m, len: 3 });
    const y = R.yS + 2, e = parts.edges(R, y), L = e[0] - 2, Rr = e[1] + 1, s = RD(P.sway || 0);
    PX(E, R, L - 1, y, m, 0); PX(E, R, L - 2 + (s > 0 ? 1 : 0), y - 1 - (P.bend > 1 ? 1 : 0), m, 4);
    PX(E, R, Rr + 1, y, m, 0); PX(E, R, Rr + 2, y - 1, m, 4);
    PX(E, R, L + 1, y + 2, m, 3);
  }
  function roots(R, m) { E.part(); PX(E, R, R.hx, R.hy + 1, m, 3); PX(E, R, R.hx + (P.beard > 0 ? 1 : 0), R.hy + 2, m, 2); PX(E, R, R.hx + 2, R.hy + 1, m, 3); }
  // 候选部件：leafBladeStaff —— 细枝杖（吸附方向，1 格）+ 杖头锯齿大叶刃（逐格宽度、单侧两颗锯齿、叶脉是发光体，和叶刃同一部件）
  function drawStaff(T, gx, gy, a, leafM) {
    const di = parts.snapDir(a), lv = P.gem;
    E.part(); parts.bar(di, gx, gy, -3, STAFF_N - 1, 1, (k, j, X, Y) => PX(E, T, X, Y, M.wood, k === -3 ? 2 : 3));
    const bud = parts.cell(di, gx, gy, 5); PX(E, T, bud[0] - 1, bud[1], leafM, 4);
    E.part();
    for (let i = 0; i < BLADE.length; i++) {
      const k = STAFF_N + i, w = BLADE[i], c0 = Math.ceil((w - 1) / 2);
      parts.bar(di, gx, gy, k, k, w, (kk, j, X, Y) => {
        if (j === c0 && i < BLADE.length - 1) { const tn = lv === 4 ? 1 : lv === 3 ? 4 : lv === 2 ? (i & 1 ? 4 : 3) : lv === 1 ? 3 : (i & 1 ? 2 : 3); PX(E, T, X, Y, M.vein, tn); }
        else PX(E, T, X, Y, leafM, i === BLADE.length - 1 ? 4 : 0);
      });
      if (i === 2 || i === 4) parts.bar(di, gx, gy, k, k, 5, (kk, j, X, Y) => { if (j === 0) PX(E, T, X, Y, leafM, 4); });   // 锯齿
    }
    if (P.glint) { const c = parts.cell(di, gx, gy, STAFF_N + BLADE.length); PX(E, T, c[0], c[1], M.vein, 4); }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.hop);
    const R = parts.rig(P, Object.assign({}, BODY, { head: 8 - P.sq }));
    const leaf = P.wth >= 1 ? M.dry : M.leaf, stem = P.wth >= 2 ? M.dry : M.stem, stemD = P.wth >= 2 ? M.dryD : M.stemD;
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: stemD, hand: stemD });
    parts.legs(E, R, P, { style: 'bare', mat: stem, matD: stemD, w: 2 });
    parts.torso(E, R, P, { style: 'tunic', mat: stem, trim: leaf, belt: M.root });
    bulbHead(R, M.bulb);
    leafMantle(R, leaf);
    roots(R, M.root);
    sprouts(R, leaf);
    if (R.lie) drawStaff(parts.FREE, -8 + P.hatX, -1 - P.hatY, -Math.PI / 2, leaf);
    else drawStaff(R, P.hx, P.hy, P.a, leaf);
    parts.arm(E, R, P, { sleeve: 'tight', mat: stem, hand: M.bulb });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, DCY = HY - 14;
  let atkT = 9, atkX = 0, atkY = 0, skT = 9, skX = 0, skY = 0, spT = 9, spX = 0, spY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, lastPers = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function headC() { const R = parts.rig(P, Object.assign({}, BODY, { head: 8 - P.sq })); return [wx(R.hx + 1 + P.bx), wy(R.htop + 4 - P.hop)]; }
  // 飞叶（3 格一片，4 个朝向逐帧旋转）
  function leafAt(x, y, r, c0, c1) {
    x = RD(x); y = RD(y); put(x, y, c0);
    if (r === 0) { put(x - 1, y, c1); put(x + 1, y, c1); } else if (r === 1) { put(x - 1, y - 1, c1); put(x + 1, y + 1, c1); }
    else if (r === 2) { put(x, y - 1, c1); put(x, y + 1, c1); } else { put(x + 1, y - 1, c1); put(x - 1, y + 1, c1); }
  }
  function onEnter(s) {
    if (s === CAST) { const h = headC(); releaseOrbit(50, 110, 0.3, 0.6, { pts: 1 }); ring(h[0], h[1], 1, R_EL); burst(h[0], h[1], 14, 40, 90, 0.2, 0.45, R_EL, 6); shake(0.28, 2); flash(0.05); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWING) {                                   // 横甩拖影 + 3 片旋转飞叶刀
      const gx = wx(P.hx + P.bx), gy = wy(P.hy); fx.slash(gx, gy, 13, K_WIND.a, K_SWING.a + 0.2, R_EL, 0.18, 2, 2);
      atkT = 0; atkX = wx(P.gx); atkY = wy(P.gy); sfx('swing', { kind: 'staff', w: 0.2 });
    }
    if (s === CAST && t === T_THROW) {                                     // 甩出 8 片飞叶，扇形弧线飞向目标
      skT = 0; skX = wx(P.gx); skY = wy(P.gy); burst(skX, skY, 10, 30, 80, 0.15, 0.35, R_EL, 4); sfx('shoot', { proj: 'leaf' });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 8 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      for (let i = 0; i < 5; i++) spawn(K_EMBER, HX + Math.random() * 16, HY - 3 - Math.random() * 4, (Math.random() - 0.5) * 10, 4 + Math.random() * 4, 0.9 + Math.random() * 0.4, R_WITHER);
      shake(0.1, 1); sfx('fall', { w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_SWING], [], [T_THROW], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (atkT < 0.6) {
      const n = atkT + dt;
      if (atkT < 0.1 && n >= 0.1) { hitDummy(0); burst(DCX, DCY, 8, 30, 70, 0.12, 0.3, R_EL, 6); sfx('hit', { mat: 'flesh', w: 0.2 }); }
      if (atkT < 0.22 && n >= 0.22) { fx.slash(DCX - 7, DCY + 3, 5, -1.3, 0.3, R_EL, 0.18, 1, 2); fx.slash(DCX + 8, DCY - 2, 5, 1.8, 3.4, R_EL, 0.18, 1, 2); }   // 溅射：身边两道小斩
      if (atkT < 0.42 && n >= 0.42) burst(DCX, DCY, 6, 20, 50, 0.2, 0.4, R_EL, 4);
      atkT = n;
    }
    if (skT < 0.8) {
      const n = skT + dt;
      if (skT < 0.22 && n >= 0.22) { fx.slash(DCX, DCY, 9, -2.4, -0.6, R_EL, 0.22, 2, 2); ring(DCX, DCY, 0, R_EL); burst(DCX, DCY, 22, 60, 140, 0.25, 0.6, R_EL, 8); hitDummy(1); shake(0.12, 1); spT = 0; spX = DCX; spY = DCY; sfx('impact', { pal: 'nature', w: 0.5 }); }
      if (skT < 0.3 && n >= 0.3) { fx.slash(DCX, DCY, 9, 2.4, 0.6, R_EL, 0.22, 2, 2); hitDummy(0); sfx('impact', { pal: 'nature', w: 0.35 }); }
      if (skT < 0.38 && n >= 0.38) { fx.slash(DCX, DCY, 10, -1.57, 1.57, R_EL, 0.22, 2, 2); fx.cross(DCX, DCY, 6, R_EL, 0.25); hitDummy(1); sfx('impact', { pal: 'nature', w: 0.35 }); }
      skT = n;
    }
    spT += dt;
    if (state === CHARGE && stT > 0.1) {                                   // 身边的落叶被吸起，螺旋汇聚后绕球茎头环绕
      const h = headC(); chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 7, a = 0.3 + Math.random() * 2.5; spawnX(K_SPIRAL_PT, h[0], h[1], (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 3, tx: h[0], ty: h[1], orbitR: 6 + (Math.random() < 0.5 ? 0 : 2), orbitW: 9, squash: 0.5 }); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.12 }); lastStep = P.step; }
    if (state === IDLE) {
      emberAcc += dt * 1.6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); }
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 2) { const h = headC(); for (let i = 0; i < 3; i++) spawn(K_EMBER, h[0] + (i - 1) * 3, h[1] - 7, (i - 1) * 10, -8, 0.5, R_EL); } lastPers = f; }
    }
    if (state === RECOVER) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, DCX - 12 + Math.random() * 24, HY - 26 + Math.random() * 8, Math.random() * 10 - 5, 6 + Math.random() * 6, 1.0 + Math.random() * 0.6, R_WITHER); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
  }
  function fxReset() { atkT = 9; skT = 9; spT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (atkT < 0.45) {                                                    // 3 片飞叶刀：飞到目标 → 绕着它和身边扫一圈
      for (let i = 0; i < 3; i++) {
        const a0 = i * 2.094 + 3.14, u = clamp01(atkT / 0.1), ang = a0 + Math.max(0, atkT - 0.1) * 18, ox = DCX + Math.cos(ang) * 10, oy = DCY + Math.sin(ang) * 5;
        const x = atkT < 0.1 ? atkX + (DCX + Math.cos(a0) * 10 - atkX) * u : ox, y = atkT < 0.1 ? atkY + (DCY + Math.sin(a0) * 5 - atkY) * u : oy;
        leafAt(x, y, (f12 + i) & 3, atkT < 0.15 ? EL[0] : EL[1], atkT < 0.3 ? EL[2] : EL[3]);
      }
    }
    if (skT < 0.22) {                                                     // 8 片飞叶排成扇形弧线（二次贝塞尔）
      const u = skT / 0.22;
      for (let i = 0; i < 8; i++) {
        const off = (i - 3.5) / 3.5, tx = DCX - 2 + off * 2, ty = DCY + off * 3, cx = (skX + tx) / 2 + 4, cy = (skY + ty) / 2 + off * 16;
        const x = (1 - u) * (1 - u) * skX + 2 * (1 - u) * u * cx + u * u * tx, y = (1 - u) * (1 - u) * skY + 2 * (1 - u) * u * cy + u * u * ty;
        leafAt(x, y, (f12 + i) & 3, EL[0], EL[1]);
        if (u > 0.2) put(RD(x - 2), RD(y), EL[2]);
      }
    }
    if (spT < 0.3) {                                                      // 溅射圈：12 片叶刃外爆到半径 10
      const r = 2 + 8 * ease.out(spT / 0.3), c0 = spT < 0.1 ? EL[0] : spT < 0.2 ? EL[1] : EL[2], c1 = spT < 0.15 ? EL[1] : EL[3];
      for (let i = 0; i < 12; i++) { if (spT > 0.2 && ((i + f12) & 1)) continue; const a = i / 12 * 6.2832; leafAt(spX + Math.cos(a) * r, spY + Math.sin(a) * r * 0.8, (i + f12) & 3, c0, c1); }
    }
  }

  return {
    name: '野法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.vein], HIT_POINT: [1, -11], EVENTS,
    REVIVE: { dy: -10, ramp: 'nature' },
    SFX: { body: 'flesh', how: 'topple', pal: 'nature', style: 'blade', w: 0.2 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
