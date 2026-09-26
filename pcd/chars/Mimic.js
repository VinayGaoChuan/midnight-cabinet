// 宝箱怪（敌人 · 野兽 · 稀有 · 近战 272）：一只方方正正的暗红漆木大宝箱，铁箍 + 金包角 + 金锁扣，底下 4 条紫黑短节肢把箱子撑离地 3 格。
//   箱盖就是上颚：掀开时露出上下两排尖牙、黑红的喉咙、箱底的金币堆和两只发光黄眼；一条紫红长舌从箱口垂出，舌尖卷着一枚金币。
// 攻击：蹦跳前扑 4 格，箱盖猛合咬住。
// 技能「掠夺」（击杀时根据波数抢 +2–9 积分）：箱盖张到最大、舌头卷动、箱内金光照亮牙齿，地上的金币螺旋汇进箱口；
//   施放猛扑咬合，目标身上炸出一团金币，金币划弧飞回箱口；命中：箱盖合上、箱缝漏金光、头顶金色「+」星芒；收招打嗝喷出一枚金币。
// 身体：箱体、箱盖（上颚）、喉咙、舌头都是本模块的专属部件（候选部件），腿用 parts-beast 的四足步态偏移（Q.gait）自画节肢。
PCD.define('Mimic', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.coin, EL = FXR[R_EL];                                                        // 掠夺 · 金币（白 → 淡金 → 金 → 暗金 → 棕）
  const BOX = E.ramp(['#1e0806', '#4e140e', '#7e2a1a', '#a84a2a']);                              // 暗红漆木
  const R_WOOD = fxRamp('mimicWood', [BOX[3], BOX[2], BOX[1], BOX[0], 0]);                       // 受击木屑
  const M = {
    box: E.defMat(BOX, 2), lid: E.defMat(BOX, 1), iron: E.defMat('iron'), gold: E.defMat('gold'), tooth: E.defMat('bone'),
    tongue: E.defMat('pink'), coin: E.defMat([20, 19, 14, 5]), leg: E.defMat('shadow'), legF: E.defMat('shadow', 1, 0, 1), claw: E.defMat('bone'),
    throat: E.defMat([0, 0, 55, 11], 1, 1),                                                      // 喉咙（平涂，手工色调：深处 2、口沿 3）
    lit1: E.defMat([20, 19, 61, 14], 1, 1), lit2: E.defMat([19, 61, 14, 47], 1, 1),               // 箱内金光 1 / 2 档
    eye: E.defMat([0, 0, 47, 51], 1, 1), seam: E.defMat([14, 14, 47, 51], 1, 1), key: E.defMat([0, 0, 0, 0], 1, 1),
  };

  // ───── 箱体几何（本地坐标，脚底为原点） ─────
  const X0 = -11, X1 = 10, YB = -4, YT = -13, LL = 21;                                           // 箱身 22 宽、底在离地 3 格处、顶行 -13；箱盖长 21
  const HGX = -11, HGY = -13.5;                                                                  // 铰链（后上角）
  const LID_A = [0, 0.12, 0.36, 0.62, 1.05, 1.3];                                                // 箱盖张角：合 · 一条缝 · 小开 · 半开 · 60° · 张到最大
  const lidT = (u) => 3.6 + 1.2 * Math.sin(PI * clamp01(u / LL));                                // 箱盖拱顶厚度

  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(96, 64, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'seam', 'lit1', 'lit2', 'throat', 'coin', 'tooth', 'tongue', 'key', 'leg', 'legF', 'claw']) RIM.skip[M[k]] = 1;
  const SPEC = [['gf', -1, 3], ['lift', 0, 10], ['cr', 0, 2], ['lid', 0, 5], ['tg', 0, 4], ['tph', 0, 1], ['look', -1, 1], ['shut', 0, 1],
    ['lit', 0, 2], ['seam', 0, 1], ['legs', 0, 2], ['coinOn', 0, 1]].concat(B.COMMON);
  const P = {};
  function reset() { P.gf = -1; P.lift = 0; P.cr = 0; P.lid = 0; P.tg = 0; P.tph = 0; P.look = 0; P.shut = 0; P.lit = 0; P.seam = 0; P.legs = 0; P.coinOn = 1;
    P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.flip = 0; P.mx = 0; P.drop = 0; P.dsx = 0; P.dsy = 0; }
  reset();
  const HIT_POINT = [0, -10];

  // ───── 姿势 ─────
  // 逐帧表 [bx, lift, cr, lid, tg, shut, legs]
  const ATK = [[0, 0, 0, 0, 0, 0, 0], [-1, 0, 2, 2, 0, 0, 0], [4, 3, 0, 4, 3, 0, 2], [4, 0, 1, 0, 0, 0, 0], [4, 0, 0, 0, 0, 0, 0], [3, 1, 0, 1, 0, 0, 2], [2, 0, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];
  const T_SW = 2 / 12, T_HIT = 3 / 12;
  const T_BITE = 1 / 12, T_OPEN = 2 / 12, T_GULP = 5 / 12;                                      // 施放：咬合 · 张口接金币 · 合上
  function row(a) { P.bx = a[0]; P.lift = a[1]; P.cr = a[2]; P.lid = a[3]; P.tg = a[4]; P.shut = a[5]; P.legs = a[6]; }
  function idle(tq, f12) {
    const lp = tq % DUR[IDLE], b = Math.floor(f12 / 12 * 2.5 + 1e-6);
    P.cr = b & 1; P.tph = (Math.floor(f12 / 12 * 1.25 + 1e-6) & 1);                              // 呼吸：腿一屈一伸；舌尖轻摆
    if (lp >= 1.3 - 1e-6 && lp < 2.3 - 1e-6) {                                                   // 装死偷看：掀开一条缝，黄眼左右瞄，舌头舔一下锁扣
      const k = f12of(lp - 1.3); P.cr = 0; P.lid = k < 1 ? 0 : 1; P.look = [0, 0, -1, -1, 1, 1, 0, 0, 0, 0, 0, 0][k] || 0;
      if (k >= 7 && k <= 9) P.tg = 1; if (k >= 10) P.lid = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                        // 整箱蹦跳：落地颠开箱盖，腾空时合上
      const f = E.gait(tq); P.gf = f; P.lift = [0, 3, 0, 2][f]; P.cr = [1, 0, 1, 0][f]; P.lid = [2, 0, 2, 1][f]; P.legs = f & 1 ? 2 : 0; P.tph = f >> 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { row(ATK[Math.min(ATK.length - 1, f12of(tq))]); P.rim = P.lid >= 4 ? 1 : 0; }
    else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); P.lid = Math.min(5, R(q * 5)); P.cr = q > 0.5 ? 1 : 0; P.tg = q > 0.4 ? 2 : 0; P.tph = (f12 >> 1) & 1;
      P.lit = tq < 0.35 ? 0 : tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; P.bx = q > 0.5 ? -1 : 0;
    } else if (st === CAST) {
      const f = f12of(tq);
      if (f === 0) { P.bx = 7; P.lift = 3; P.lid = 4; P.tg = 3; P.lit = 2; P.legs = 2; }             // 猛扑张口
      else if (f === 1) { P.bx = 7; P.lid = 0; P.cr = 1; P.seam = 1; }                               // 咬合
      else if (f < 5) { P.bx = 6; P.lid = 3; P.lit = 2; P.tg = 0; }                                   // 张口接金币
      else { P.bx = 6; P.lid = 0; P.seam = 1; P.cr = 1; }                                            // 合上，箱缝漏金光
      P.rim = 3;
    } else if (st === RECOVER) {
      const f = f12of(tq); P.bx = Math.max(0, 6 - f); P.seam = f < 3 ? 1 : 0; P.rim = f < 4 ? 2 : f < 6 ? 1 : 0;
      if (f === 3 || f === 4) { P.lid = 2; P.lift = f === 3 ? 1 : 0; }                               // 打嗝：箱盖一颠喷出一枚金币
      if (f >= 5 && f <= 7) { P.lid = 1; P.tg = 1; }                                                  // 舌头舔嘴
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.lid = 2; P.shut = 1; P.legs = 1; P.tg = 3; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.lid = 1; P.shut = 1; P.cr = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.lid = 3; P.shut = 1; P.cr = 1; P.legs = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < T_POP - INCOMING) { const k = f12of(d - 0.3); P.bx = -2 + (k & 1); P.lid = k & 1 ? 1 : 4; P.shut = 1; P.cr = 2; P.legs = 1; P.tg = 4; P.lift = k & 1; }   // 箱盖乱拍、舌头软下
      else P.dq = 1;                                                                                  // 之后交给死亡套件 burst
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    const mp = mouthPt(); P.gx = R(mp[0]) + P.bx; P.gy = R(mp[1]) - P.lift;
    B.key(P, SPEC);
  }
  const T_POP = INCOMING + 0.55;
  function lidDir(lid) { const a = LID_A[lid | 0]; return [Math.cos(a), -Math.sin(a), -Math.sin(a), -Math.cos(a), a]; }   // [dx, dy, nx, ny, 角]
  function mouthPt() { const L = lidDir(P.lid), a = L[4] * 0.5, r = 13; return [HGX + Math.cos(a) * r, HGY - Math.sin(a) * r + P.cr]; }

  // ───── 画 ─────
  // 候选部件：箱底节肢腿 boxLegs —— 从箱底伸出的短粗节肢（根 → 外翻的膝 → 足尖），对角两条一组按 quad 步态偏移前后迈；
  //   legs 0 撑地 · 1 软摊（受击 / 死亡）· 2 收起（腾空）；far = 1 画远侧两条（暗一级）
  function boxLegs(far, cr) {
    const g = Q.gait(P.gf | 0, 3, 2), LEG = far ? [[-4, -1, 1], [4, 1, 0]] : [[-8, -1, 0], [7, 1, 1]];
    for (const [rx, dir, isA] of LEG) {
      E.part();
      const mat = far ? M.legF : M.leg, dx = isA ? g[0] : g[2], up = (isA ? g[1] : g[3]) + (P.legs === 2 ? 2 : 0), splay = P.legs === 1 ? 2 : 0;
      const ry = YB + 1 + cr, kx = rx + dir * (far ? 2 : 3.5) + dx * 0.5 + dir * splay, ky = YB + (far ? 1.5 : 0.5) + cr * 0.6 - up * 0.5 + splay * 0.5;
      const fx = rx + dir * (far ? 3 : 4.5) + dx + dir * splay * 1.5, fy = -up;
      U.seg(E, rx, ry, kx, ky, 2, mat, 0); U.seg(E, kx, ky, fx, fy - 0.5, far ? 1 : 2, mat, 0);
      U.dot(E, kx, ky - 1, mat, far ? 0 : 4);                                                          // 膝节高光
      U.dot(E, fx + dir, fy, M.claw, 2); U.dot(E, fx, fy, M.claw, 3);                                  // 足尖
    }
  }
  function inWedge(x, y, a, rMax) { const dx = x - HGX, dy = HGY - y; if (dy < 0.3) return false; const ang = Math.atan2(dy, dx), r = Math.hypot(dx, dy); return ang >= -0.02 && ang <= a + 0.02 && r <= rMax && r >= 1.5; }
  // 候选部件：宝箱喉咙 chestMaw —— 箱盖与箱身之间的楔形口腔：深处暗、口沿亮一档；箱底的金币堆、两只发光眼；lit 1–2 = 箱内金光
  function chestMaw(cr) {
    const L = lidDir(P.lid), a = L[4]; if (a <= 0) return; E.part();
    const mat = P.lit === 2 ? M.lit2 : P.lit === 1 ? M.lit1 : M.throat;
    for (let y = -40; y <= YT + cr; y++) for (let x = HGX; x <= X1 + 1; x++) {
      const yy = y - cr; if (!inWedge(x, yy, a, a < 0.3 ? LL - 0.5 : 9.5)) continue;                  // 张大时只画深处的喉咙，前面露出上下两排牙之间的空当
      const r = Math.hypot(x - HGX, HGY - yy); U.dot(E, x, y, mat, r < 6 ? 2 : 3);
    }
    if (a >= 0.3) {                                                                                  // 金币堆（箱底后半）
      const pile = [[-9, -1, 5], [-8, -2, 3], [-6, -3, 1]];
      for (const [x0, dy, n] of pile) for (let k = 0; k < n * 2; k++) { const x = x0 + k, y = YT - 1 + dy + 1 + cr; if (inWedge(x, y - cr, a, 9.5)) U.dot(E, x, y, M.coin, (x + dy) & 1 ? 3 : 4); }
    }
    const ea = a < 0.3 ? a * 0.5 : a * 0.55, eyeR = a < 0.3 ? [12, 16] : [5, 8];                    // 眼：缝里 / 喉咙深处
    for (const r of eyeR) {
      const x = R(HGX + Math.cos(ea) * r), y = R(HGY - Math.sin(ea) * r) + cr;
      if (P.shut) { U.dot(E, x, y, M.throat, 3); U.dot(E, x + 1, y, M.eye, 2); continue; }
      U.dot(E, x, y, M.eye, P.look < 0 ? 4 : 3); U.dot(E, x + 1, y, P.look > 0 ? M.eye : M.key, P.look > 0 ? 4 : 3);
    }
  }
  // 候选部件：宝箱身 chestBody —— 箱身（横木板纹、两道铁箍 + 金铆钉、四个金包角）+ 张口时口沿上的一排下牙；一个部件
  function chestBody(cr) {
    E.part();
    for (let y = YT; y <= YB; y++) for (let x = X0; x <= X1; x++) {
      let mat = M.box, t = 0;
      if ((y === YT + 3 || y === YT + 6) && x > X0 && x < X1) t = 2;                                  // 木板缝
      if (x === -7 || x === -6 || x === 4 || x === 5) { mat = M.iron; t = x === -7 || x === 4 ? 4 : 0; if (y === YT + 1 || y === YB - 1) { mat = M.gold; t = 4; } }
      const cx = x < X0 + 2 ? 0 : x > X1 - 2 ? 1 : -1, cy = y < YT + 2 ? 0 : y > YB - 2 ? 1 : -1;
      if (cx >= 0 && cy >= 0) { mat = M.gold; t = cx === 0 && cy === 0 ? 4 : 0; }
      U.dot(E, x, y + cr, mat, t);
    }
    if (LID_A[P.lid] >= 0.3) for (const x of [-3, 0, 3, 6, 9]) { U.dot(E, x, YT - 1 + cr, M.tooth, 4); U.dot(E, x - 1, YT - 1 + cr, M.tooth, 3); U.dot(E, x, YT - 2 + cr, M.tooth, 4); }
  }
  // 候选部件：长舌 longTongue —— 从箱口伸出的舌头（根粗 2 格、尖 1 格），舌尖卷一枚金币；tg 0 垂下 · 1 上舔锁扣 · 2 在口里卷动 · 3 前伸 · 4 软瘫
  const TONGUE = [
    [[7, -14], [10, -14], [12, -13], [13, -11], [13, -9]],
    [[7, -14], [10, -15], [12, -16], [12, -18], [11, -19]],
    [[6, -15], [9, -16], [11, -15], [13, -16], [14, -18]],
    [[7, -14], [11, -14], [14, -13], [17, -13], [19, -12]],
    [[7, -12], [10, -11], [12, -8], [13, -5], [15, -4]],
  ];
  function longTongue(cr) {
    E.part();
    const pts = TONGUE[P.tg | 0].map(([x, y], k) => [x + (P.tg === 2 && k >= 3 && P.tph ? -1 : 0) + (P.tg === 0 && k === 4 && P.tph ? 1 : 0), y + cr]);
    for (let k = 0; k + 1 < pts.length; k++) U.seg(E, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], k < 2 ? 2 : 1, M.tongue, 0);
    for (let k = 1; k < 3; k++) U.dot(E, pts[k][0], pts[k][1], M.tongue, 1);                          // 舌中缝
    const e = pts[4];
    if (P.coinOn && P.tg !== 3 && P.tg !== 4) { U.dot(E, e[0] + 1, e[1], M.coin, 4); U.dot(E, e[0] + 1, e[1] + 1, M.coin, 3); U.dot(E, e[0], e[1] + 1, M.coin, 2); U.dot(E, e[0] + 2, e[1] + 1, M.tongue, 0); }
  }
  // 候选部件：宝箱盖 chestLid —— 绕后上角铰链转开的拱顶箱盖（木板纹、两道铁箍、前后金包角、前沿下垂的金锁扣 + 钥匙孔）；
  //   张开时下沿露出一排上牙；seam 1 = 箱缝漏金光（下沿一行换成发光金）
  function chestLid(cr) {
    E.part();
    const [dx, dy, nx, ny, a] = lidDir(P.lid), hy = HGY + cr, ext = 30;
    for (let y = Math.floor(hy - ext); y <= Math.ceil(hy + 5); y++) for (let x = HGX - 6; x <= X1 + 4; x++) {
      const px = x - HGX, py = y - hy, u = px * dx + py * dy, v = px * nx + py * ny;
      if (u < -0.4 || u > LL + 0.4) continue;
      let mat = 0, t = 0;
      if (v >= -0.2 && v <= lidT(u)) {
        mat = M.lid; if (v > 1.6 && v < 2.4 && u > 1 && u < LL - 1) t = 2;
        if ((u > 3.6 && u < 5.4) || (u > 14.6 && u < 16.4)) { mat = M.iron; if (v > lidT(u) - 1.2) t = 4; }
        if (u > LL - 1.6 || u < 1.2) { mat = M.gold; t = v > lidT(u) - 1.2 ? 4 : 0; }
        if (P.seam && v < 0.8 && u > 1 && u < LL - 1) { mat = M.seam; t = 3; }
      } else if (v < -0.2 && v >= -3.2 && u > LL - 2.4 && u <= LL + 0.4) { mat = M.gold; t = v < -2.4 ? 2 : 0; if (v > -2.2 && v < -1.2 && u > LL - 1.4 && u < LL - 0.4) { mat = M.key; t = 3; } }   // 锁扣
      else if (a >= 0.3 && v < -0.2 && v >= -2.2 && u > 4 && u < LL - 2.6) {                        // 上牙
        const f = (u - 4) % 3; if ((v >= -1.2 && f < 2) || (v < -1.2 && f > 0.5 && f < 1.5)) { mat = M.tooth; t = v < -1.2 ? 4 : 3; }
      }
      if (mat) U.dot(E, x, y, mat, t);
    }
  }
  function drawHero() {
    begin(hero, P.bx, -P.lift);
    const cr = P.cr;
    boxLegs(1, cr);
    chestMaw(cr);
    chestBody(cr);
    longTongue(cr);
    chestLid(cr);
    boxLegs(0, cr);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, lastGf = -9, chompT = 9, plusT = 9, seamT = 9, lastLid = 0;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function coinSpray(x, y, n, up) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 70, -up - Math.random() * 50, 0.9 + Math.random() * 0.6, R_EL, { g: 260, floor: FLOOR - 1, sz: Math.random() < 0.35 ? 2 : 1 }); }
  function coinsHome(x0, y0, n, spd) {                                                             // 金币划弧飞回箱口（定点汇聚）
    const [gx, gy] = mouthScr();
    for (let i = 0; i < n; i++) {
      const sx = x0 + (Math.random() - 0.5) * 10, sy = y0 + (Math.random() - 0.5) * 8, a = Math.atan2((sy - gy) / 0.75, sx - gx), r = Math.hypot(sx - gx, (sy - gy) / 0.75);
      spawnX(K_SPIRAL_PT, gx, gy, r / (spd + Math.random() * 0.12), 0, 9, R_EL, { a, r, w: 1.6 + Math.random() * 1.2, sz: i % 3 === 0 ? 2 : 1 });
    }
  }
  function onEnter(s) {
    if (s === CAST) { poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr(); burst(gx, gy, 14, 30, 90, 0.2, 0.4, R_EL, 6); shake(0.28, 2); flash(0.05); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SW) { sfx('swing', { kind: 'bite', w: 0.5 }); for (let i = 0; i < 3; i++) spawn(K_DUST, HX + (Math.random() - 0.5) * 16, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
    if (s === ATTACK && t === T_HIT) {
      chompT = 0; hitDummy(0, 1); burst(DUMMY_X - 5, HY - 14, 10, 40, 90, 0.15, 0.35, FXI.impact, 8); coinSpray(DUMMY_X - 4, HY - 14, 3, 40);
      sfx('hit', { mat: 'wood', w: 0.5 });
    }
    if (s === CAST && t === T_BITE) {                                                              // 咬中：目标身上炸出一团金币
      chompT = 0; hitDummy(1, 1); dummyFx({ dur: 0.6, tint: 'coin' });
      burst(DUMMY_X - 3, HY - 16, 16, 50, 120, 0.2, 0.45, R_EL, 10); coinSpray(DUMMY_X - 2, HY - 16, 20, 60); fx.cross(DUMMY_X - 3, HY - 16, 5, R_EL, 0.25);
      sfx('impact', { pal: 'coin', w: 0.5 });
    }
    if (s === CAST && t === T_OPEN) { poseAt(CAST, t, t); coinsHome(DUMMY_X - 2, HY - 12, 16, 0.24); }
    if (s === CAST && t === T_GULP) {                                                              // 吞下：箱缝漏金光 + 头顶「+」星芒
      poseAt(CAST, t, t); plusT = 0; seamT = 0; shake(0.12, 1); const [gx] = mouthScr(); burst(gx - 4, HY - 16, 10, 20, 50, 0.2, 0.4, R_EL, 4);
      sfx('impact', { pal: 'coin', w: 0.4 });
    }
    if (s === RECOVER && t === 3 / 12) { const x = scrX(8), y = HY - 16; spawnX(K_PHYS, x, y, 26, -90, 1.0, R_EL, { g: 300, floor: FLOOR - 1, sz: 2 }); burst(x, y, 5, 10, 30, 0.15, 0.3, R_EL, 4); }   // 打嗝喷出一枚金币
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.4, R_WOOD, 14);
    if (s === DEATH && t === T_POP) {                                                              // 爆散：木板四散 + 金币喷泉
      poseAt(DEATH, T_POP - 1 / 60, T_POP - 1 / 60); drawHero(); bakeHero(); death.start('burst', { chunk: 4, power: 0.9, fromX: 0, fromY: -8, fadeAt: 1.0, ramp: 'dust' }); hero.k1 = hero.k2 = -1;
      coinSpray(HX, HY - 12, 26, 110); burst(HX, HY - 10, 20, 40, 110, 0.2, 0.5, R_EL, 12); burst(HX, HY - 10, 12, 30, 80, 0.25, 0.5, R_WOOD, 10); shake(0.16, 2); flash(0.04);
    }
    if (s === DEATH && t === T_POP + 0.4) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.45 }); }
  }
  const EVENTS = [[], [], [T_SW, T_HIT], [], [T_BITE, T_OPEN, T_GULP], [3 / 12], [INCOMING], [T_POP, T_POP + 0.4], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) {                                                              // 落地：扬尘 + 箱里金币叮当跳一下
        for (let i = 0; i < 3; i++) spawn(K_DUST, scrX((Math.random() - 0.5) * 20), HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
        spawnX(K_PHYS, gx, gy - 1, (Math.random() - 0.5) * 20, -40, 0.3, R_EL, { g: 300 }); sfx('step', { w: 0.5 });
      }
      lastGf = P.gf;
    }
    if (state === CHARGE) {                                                                        // 地上的金币螺旋汇进箱口
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const sx = HX + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 18), sy = FLOOR - 1, a = Math.atan2((sy - gy) / 0.75, sx - gx), r = Math.hypot(sx - gx, (sy - gy) / 0.75);
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: (sx < gx ? -1 : 1) * (2 + Math.random() * 2), sz: Math.random() < 0.25 ? 2 : 1 });
      }
    }
    if (state === IDLE && P.lid === 1 && lastLid === 0) for (let i = 0; i < 2; i++) spawn(K_EMBER, scrX(4 + i * 3), HY - 15, (Math.random() - 0.5) * 6, -6, 0.3, R_EL);   // 缝里一闪金光
    lastLid = P.lid;
    if (state === RECOVER && P.seam && Math.random() < dt * 20) spawn(K_EMBER, scrX(-6 + Math.random() * 14), HY - 14, (Math.random() - 0.5) * 8, -8 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_EL);
    if (state === DEATH && stT > T_POP + 1.0 && stT < T_POP + 1.8 && Math.random() < dt * 30) spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.6 + Math.random() * 0.6, FXI.soul);
    chompT += dt; plusT += dt; seamT += dt;
  }
  function fxReset() { chargeAcc = 0; lastGf = -9; chompT = 9; plusT = 9; seamT = 9; lastLid = 0; }
  function fxBack(f12) { if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (chompT < 2 / 12) {                                                                           // 咬合：上下两排金色牙印合拢「咔哒」
      const first = chompT < 1 / 12, x = DUMMY_X - 6, y = HY - 15, g = first ? 4 : 1, c = first ? EL[0] : EL[2];
      for (let k = -4; k <= 4; k += 2) { put(x + k, y - g, c); put(x + k + 1, y - g + 1, c); put(x + k, y + g, c); put(x + k + 1, y + g - 1, c); }
    }
    if (plusT < 0.9 && !(plusT > 0.65 && (f12 & 1))) {                                              // 头顶金色「+」星芒（积分）
      const x = scrX(0), y = HY - 26 - Math.min(4, Math.floor(plusT * 10)), c1 = plusT < 0.1 ? 21 : EL[1], c2 = EL[2];
      put(x, y, c1); for (let k = 1; k <= 2; k++) { put(x - k, y, k < 2 ? c1 : c2); put(x + k, y, k < 2 ? c1 : c2); put(x, y - k, k < 2 ? c1 : c2); put(x, y + k, k < 2 ? c1 : c2); }
      put(x + 4, y - 1, EL[2]); put(x + 5, y - 1, EL[1]); put(x + 4, y, EL[3]); put(x + 5, y, EL[2]);  // 旁边一枚小金币
    }
    if (seamT < 0.6 && !P.dq) {                                                                     // 箱缝漏出的光线
      const y = HY - 14 - P.lift + P.cr; for (let k = 0; k < 4; k++) { const x = scrX(-6 + k * 5); if (((k + f12) & 1) === 0) { put(x, y - 1, EL[1]); put(x - 1, y - 2, EL[2]); } }
    }
    if (E.state === CHARGE && P.lit >= 2) { const [gx, gy] = mouthScr(); for (let r = 2; r <= 3 + (f12 & 1); r++) { put(gx + r, gy, EL[1]); put(gx, gy - r, EL[2]); } }
  }

  return {
    name: '宝箱怪', HX, R_EL, R_HURT: R_WOOD, DUR, hero, P, GLOW_MATS: [M.eye, M.seam, M.lit1, M.lit2], HIT_POINT, EVENTS, deathKit: { mode: 'burst', at: T_POP },
    SFX: { body: 'beast', how: 'explode', pal: 'coin', style: 'coin', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
