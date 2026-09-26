// 炮手（敌人 · 野兽 · 优质 · 远程 640）：desc「她的远程大炮威力十足。」；无特性。
//   一位野猪头的女炮手：标准偏壮身板（宽肩粗臂、收腰、短粗腿站弓步），橄榄绿军装 + 皮斜挎带；
//   右肩扛一门比她还长的青铜臼炮（压在肩上、整根低于猪吻：铜炮身 + 两道铁箍 + 木托，喇叭形炮口朝前上方伸出吻前约 8 格），整个人被炮压得往后倾；
//   野猪头：粉鼻盘 + 两个鼻孔、上翘白獠牙、墨眼 + 睫毛、脑后 2×3 垂耳（耳尖金耳环）+ 墨黑鬃，头顶扎红头巾，结尾两根飘带往后飞；腰后斜挂一串 3 颗黑铁圆炮弹。
// 攻击 = 射：半蹲稳住点火，炮口喷火后坐 2 格，射出一颗高抛物线黑铁炮弹。
// 技能（无特性 → 表现「远程大炮威力十足」）：从腰后摘一颗大炮弹抛进炮口，半跪架炮，点燃长引信——火星沿引信一格格往炮尾爬，炮口冒细烟；
//   施放：巨响后坐 3 格，炮口黑烟外爆 + 十字炮口光，一颗 4×4 黑铁大炮弹高抛物线飞出；命中：落地爆炸（火球 + 硝烟团 + 大冲击环 + 碎石），假人击退，震屏；
//   收招：从地上爬起，挥手扇掉脸前的烟。
// 死亡 = 后仰：像被后坐推倒一样仰面倒下，大炮从肩上滚落「咚」地砸地冒一团黑烟，头巾飘落，身体化灰。
// 身体用 parts.rig（standard 女性收腰）+ parts 的腿 / 躯干 / 手臂；野猪头、头巾、臼炮、腰后炮弹串是本模块的候选部件。设定卡见 pcd/batch-14/Cannoneer/design.md。
PCD.define('Cannoneer', (E) => {
  const { parts, Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：火药 · 硝烟（dust：白 → 灰 → 棕灰 → 深灰 → 墨），炮口光和爆心点缀 fire 第 1–2 级 ─────
  const R_EL = FXI.dust, EL = FXR[R_EL], FI = FXR[FXI.fire];
  const R_BLAST = E.fxRamp('cannonBlast', [21, 47, 6, 10, 8]);          // 爆心：白 → 火黄 → 烟灰 → 石灰 → 暗（火只占前两级）

  // ───── 材质 ─────
  const M = parts.mats(E, {
    uni: { r: [0, '#434e1c', '#6e7c30', '#9eac50'], band: 2 },         // 橄榄绿军装（moss 亮段偏黄）
    sleeve: [0, '#434e1c', '#6e7c30', '#9eac50'],
    skin: [20, '#8a5a5e', '#c08a88', '#e0b4aa'],                        // 粉灰猪皮
    bristle: [0, 0, 27, 28], snout: [11, 12, 63, 58],                  // 墨黑鬃 · 粉鼻头
    tusk: { r: [7, 18, 17, 21], flat: 1 }, ink: { r: 'ink', flat: 1 },
    scarf: 'crimson', gold: 'gold', leather: 'leather', boot: 'boot',
    bronze: 'gold', hoop: 'iron', wood: 'wood', ball: [0, 28, 29, 31], cord: 'sand',
    spark: { r: [44, 46, 47, 21], flat: 1 },                            // 引信火星（发光体）
  });
  const BODY = { body: 'standard', leg: 8, torso: 9, head: 7, headW: 7, sw: 5, arm: 9, lw: 3, waist: 1, limb: 1.3, stride: 3, headX: -1, neck: 1, fall: 'back' };   // neck 1：头整颗抬到炮身上面
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 58, 36, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 8, 12], rimRamp: FI, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['spark', 'ink', 'tusk', 'cord', 'ball', 'hoop', 'wood', 'gold', 'scarf', 'skin', 'snout']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 臼炮几何：breech（炮尾）为原点，沿 (21, −8) 斜向上约 21°（待机炮尾 (−9, −12) → 炮口 (12, −20)，和下巴之间空 1 行），整根压在右肩上、低于吻部；u 沿炮身，v 朝炮身下侧 ─────
  const DV = [[21 / Math.hypot(21, 8), -8 / Math.hypot(21, 8)], [1, 0]], CL = 22.5;
  const prof = (u) => (u < 1 ? 1.1 : u < 4 ? 2.1 : u < 17 ? 1.6 : u < 18.5 ? 1.4 : 1.6 + (u - 18.5) * 0.5);   // 半径：球钮 → 粗炮尾 → 炮身（≥ 3 格厚）→ 炮颈 → 喇叭口
  const HOOP = (u) => (u >= 6 && u < 7) || (u >= 13 && u < 14);                                            // 两道 1 格宽的铁箍
  const at = (B, di, u, v) => { const d = DV[di]; return [B[0] + d[0] * u - d[1] * v, B[1] + d[1] * u + d[0] * v]; };
  const FUSE_LONG = [[0, 0], [-1, 0], [-2, 1], [-3, 2], [-3, 3], [-4, 4], [-4, 5], [-5, 6], [-6, 6]];

  // ───── 姿势 ─────
  // hx/hy 前手（扶炮身）· bhx/bhy 后手 · cx/cy 炮尾相对肩的偏移 · bd 头巾飘带相位 · jaw 咧嘴 · fuse 0 短引信 / 1 长引信 · fs 火星爬到第几格
  // gem 火星档 · balls 腰后剩几颗炮弹 · held 1 = 后手拿着大炮弹 · cloth 1 = 前手拿头巾角擦炮 · canX/canY 掉在地上的炮 · hatX/hatY 飘落的头巾
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, cx: 0, cy: 0, lean: 0, head: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0, bd: 0, eyes: 0, jaw: 0,
    fuse: 0, fs: 0, gem: 0, balls: 3, held: 0, cloth: 0, flash: 0, rim: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, canX: 0, canY: 0, bx: 0, dq: 0, dq48: 0, st: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -16, 20], ['hy', -32, 4], ['bhx', -16, 20], ['bhy', -32, 4], ['cx', -4, 4], ['cy', -4, 6], ['lean', -1, 1], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -1, 1], ['bd', 0, 3], ['eyes', 0, 1], ['jaw', 0, 2], ['fuse', 0, 1], ['fs', 0, 9], ['gem', 0, 4], ['balls', 0, 3], ['held', 0, 1], ['cloth', 0, 1],
    ['flash', 0, 1], ['rim', 0, 3], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -24, 8], ['hatY', 0, 24], ['canX', 0, 24], ['canY', 0, 12], ['bx', -8, 8], ['dq48', 0, 48], ['st', 0, 8]]);
  const T_FIRE = 2 / 12, T_HITA = 7 / 12, T_GRAB = 3 / 12, T_TOSS = 4 / 12, T_IN = 7 / 12, T_LIGHT = 11 / 12, T_BOOM = 4 / 12;
  const T_LAND = INCOMING + 0.66, T_CAN = INCOMING + 0.83;
  const breech = (R, Q) => [-8 + R.lean + Q.cx, R.yS + 5 + Q.cy];
  const gripF = (B) => at(B, 0, 11, prof(11) + 1.6), gripB = (B) => at(B, 0, 3, 3.8);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, i12 = f12of(t);
    for (const k of ['cx', 'cy', 'head', 'crouch', 'bob', 'step', 'wup', 'walk', 'sway', 'beard', 'eyes', 'jaw', 'fuse', 'fs', 'gem', 'held', 'cloth', 'flash', 'lying', 'lift', 'hatX', 'hatY', 'canX', 'canY', 'bx', 'dq', 'mx', 'flip']) P[k] = 0;
    P.st = st; P.lean = -1; P.balls = 3; P.rim = 1; P.bd = (f12 >> 1) & 3;
    let hand = 1, bHand = 1, wipe = -1, onFuse = 0;                                          // 1 = 手放在默认握点（前手扶炮身、后手握木托）
    const idle = () => {
      P.step = 1; P.bob = Math.floor(TT * 2.5 + 1e-6) & 1; P.gem = (f12 % 7) === 3 ? 1 : 0;
      const i = f12of(tq % DUR[IDLE] + 1e-9);
      if (i >= 16 && i <= 26) {                                       // 擦炮：头巾一角擦炮口 → 吹一口 → 拍拍炮身 → 獠牙一咧
        const k = i - 16; hand = 0;
        wipe = k; if (k <= 4) { P.cloth = 1; P.head = 1; } else if (k <= 6) { P.jaw = 2; P.head = 1; } else P.jaw = k >= 9 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 扛炮重步：稳步走，每步炮身一颠，脚下 2 颗尘土
      parts.gait(P, gait(tq)); P.cy = P.step ? 1 : 0; P.bd = (P.step + 1 + (P.wup ? 2 : 0)) & 3;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_FIRE) { P.step = 1; P.crouch = i12 < 1 ? 2 : 3; P.gem = 2; P.rim = 2; bHand = 0; onFuse = 1; P.head = -1; }   // 预兆：再蹲低 1 格、后手压到引信上点火（火星 2 档）
      else if (tq < 0.45) { P.step = 1; P.crouch = 3; P.bx = tq < 0.25 ? -2 : -1; P.cx = tq < 0.25 ? -2 : -1; P.cy = tq < 0.25 ? 1 : 0; P.eyes = tq < 0.25 ? 1 : 0; P.jaw = 1; P.gem = 3; P.rim = tq < 0.25 ? 3 : 2; P.bd = 3; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.25)); P.step = 1; P.crouch = RD(3 * (1 - q)); P.bx = q < 0.5 ? -1 : 0; P.jaw = q < 0.6 ? 1 : 0; P.gem = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE) {
      P.step = 1;
      if (tq < T_GRAB) { bHand = 0; P.bhx = -9; P.bhy = -8; P.head = -1; }                         // 后手伸到腰后摘右下那颗炮弹
      else if (tq < T_TOSS + 1 / 12) { bHand = 0; P.bhx = -9 + (i12 - 3) * 4; P.bhy = -9 - (i12 - 3) * 6; P.held = i12 < 4 ? 1 : 0; P.balls = 2; P.head = -1; }   // 往上一抛
      else {
        P.balls = 2; const q = ease.inOut(clamp01((tq - T_IN) / 0.25)); P.crouch = RD(4 * q); P.fuse = tq >= T_IN ? 1 : 0; bHand = 0;   // 半跪架炮，放下长引信
        if (tq < T_LIGHT) { P.bhx = -9; P.bhy = -3; P.gem = 0; }                                  // 后手去摸引信尾
        else { P.bhx = -5; P.bhy = -5; P.fs = Math.min(8, f12of(tq - T_LIGHT)); P.gem = (f12 & 1) ? 2 : 1; P.rim = 2; P.eyes = tq > 1.2 ? 1 : 0; }   // 点着：火星沿引信一格格往炮尾爬
      }
    } else if (st === CAST) {                                          // 巨响：后坐 3 格
      P.step = 1; P.crouch = 4; P.balls = 2; P.fuse = 0; P.bx = tq < 2 / 12 ? -3 : -2; P.cx = tq < 2 / 12 ? -2 : -1; P.cy = tq < 1 / 12 ? 1 : 0; P.eyes = tq < 3 / 12 ? 1 : 0; P.jaw = 2;
      P.gem = tq < 2 / 12 ? 3 : 2; P.rim = tq < 2 / 12 ? 3 : 2; P.bd = 3; bHand = 0; P.bhx = -9; P.bhy = -6; P.head = -1;
    } else if (st === RECOVER) {                                       // 从地上爬起，挥手扇掉脸前的烟
      const q = ease.inOut(clamp01((tq - 0.15) / 0.45)); P.step = 1; P.crouch = RD(4 * (1 - q)); P.balls = 2; P.bx = RD(-2 * (1 - q));
      if (tq < 0.45) { bHand = 0; P.bhx = 4 + ((i12 & 1) ? 2 : 0); P.bhy = -17 - ((i12 & 1) ? 0 : 3); P.eyes = 1; P.jaw = 0; P.head = -1; }
      P.gem = tq < 0.2 ? 2 : tq < 0.4 ? 1 : 0; P.rim = tq < 0.3 ? 2 : 1;
      if (tq > 0.6) P.balls = 3;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.step = 1; P.bx = -2; P.lean = -1; P.head = -1; P.eyes = 1; P.jaw = 2; P.cx = -2; P.cy = 0; P.bd = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.crouch = 1; }
      else if (h < 0.35) { P.step = 1; P.bx = -1; P.eyes = 1; P.jaw = 1; P.bd = 2; P.rim = 0; }
      else idle();
    } else if (st === DEATH) {                                         // 后仰倒地 → 大炮滚落砸地 → 头巾飘落 → 化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.step = 1; P.bx = -2; P.head = -1; P.eyes = 1; P.jaw = 2; P.cx = -2; P.cy = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { P.step = 1; P.bx = -3; P.head = -1; P.eyes = 1; P.jaw = 2; P.crouch = 3; P.cx = 3; P.cy = 4; P.gem = 4; bHand = 0; P.bhx = -10; P.bhy = -14; hand = 0; P.hx = 8; P.hy = -12; }   // 踉跄后仰，炮从肩上滑下
      else {
        P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.gem = 4; hand = 0; bHand = 0; P.hx = 5; P.hy = -8; P.bhx = -3; P.bhy = -6;
        const cq = clamp01((d - 0.5) / (T_CAN - INCOMING - 0.5)); P.canX = RD(6 + 8 * cq); P.canY = d < T_CAN - INCOMING ? RD(10 * (1 - cq * cq)) : d < T_CAN - INCOMING + 0.1 ? 1 : 0;
        const hq = clamp01((d - 0.5) / 0.75); P.hatX = RD(-18 - 5 * hq + Math.sin(hq * 9) * 1.5); P.hatY = RD(20 * (1 - hq));
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { P.step = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    P.crouch = RD(P.crouch); P.bob = RD(P.bob);
    const R = parts.rig(P, BODY), B = breech(R, P);
    if (wipe >= 0) { const k = wipe, m = k <= 4 ? at(B, 0, 18 - (k & 1) * 2, prof(18) + 0.6) : k <= 6 ? at(B, 0, 13, 3.4) : at(B, 0, 9, prof(9) + 0.8); P.hx = m[0]; P.hy = m[1] + (k <= 4 && (k & 1) ? 1 : 0) - (k > 6 && (k & 1) ? 2 : 0); }
    else if (hand) { const g = gripF(B); P.hx = g[0]; P.hy = g[1]; }
    if (bHand) { const g = gripB(B); P.bhx = g[0]; P.bhy = g[1]; }
    if (onFuse) { const g = sparkAt(B, P); P.bhx = g[0]; P.bhy = g[1] + 2; }                     // 拳头顶在火星正下方
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy);
    if (P.lying) { P.gx = P.canX + P.bx; P.gy = -4 - P.canY; }
    else { const s = sparkAt(B, P); P.gx = s[0] + P.bx; P.gy = s[1]; }
    P.dq48 = RD(P.dq * 48); KEY(P);
  }
  function sparkAt(B, Q) {
    const r = at(B, 0, 2.5, -prof(2.5) - 0.6);
    if (!Q.fuse) return [r[0] - 1, r[1] - 2];
    const k = FUSE_LONG.length - 1 - Q.fs, p = FUSE_LONG[Math.max(0, k)]; return [r[0] + p[0], r[1] + p[1]];
  }

  // ───── 画 ─────
  // 候选部件：mortar —— 青铜肩扛臼炮（按 u / v 逐格填充，方向由 DV 给）：炮尾球钮 → 粗炮尾 → 炮身（≥ 3 格厚）→ 炮颈 → 喇叭口；两道 1 格铁箍、炮口黑洞、
  //   上沿一线高光、炮尾下面的木托（di 0）；炮尾上沿一根引信（短 / 长垂下），火星是发光体（gem 0 暗 · 1 亮 · 2 蓄 · 3 喷 · 4 灭）
  function mortar(T, B, di, Q) {
    const d = DV[di], dx = d[0], dy = d[1], nx = -dy, ny = dx;
    E.part();
    for (let y = Math.floor(B[1] - 16); y <= Math.ceil(B[1] + 7); y++) for (let x = Math.floor(B[0] - 4); x <= Math.ceil(B[0] + 24); x++) {
      const px = x - B[0], py = y - B[1], u = px * dx + py * dy, v = px * nx + py * ny;
      if (u < -0.6 || u > CL) continue; const r = prof(u);
      if (Math.abs(v) > r) { if (di === 0 && v > r && v <= r + 2 && u >= 1.5 && u <= 7) PX(E, T, x, y, M.wood, v > r + 1.4 ? 2 : 0); continue; }
      let m = M.bronze, t = 0;
      if (HOOP(u)) m = M.hoop;
      if (u > CL - 1.1 && Math.abs(v) < r - 1.1) { m = M.ink; t = 0; }
      PX(E, T, x, y, m, t);
    }
    if (di !== 0) return;
    const r = at(B, 0, 2.5, -prof(2.5) - 0.6), st = Q.gem === 4 ? [M.cord, 1] : Q.gem === 0 ? [M.spark, 2] : Q.gem === 1 ? [M.spark, 3] : [M.spark, 4];
    if (!Q.fuse) { PX(E, T, r[0], r[1], M.cord, 3); PX(E, T, r[0] - 1, r[1] - 1, M.cord, 2); PX(E, T, r[0] - 1, r[1] - 2, st[0], st[1]); }
    else {
      const n = FUSE_LONG.length - Q.fs;
      for (let k = 0; k < n; k++) { const p = FUSE_LONG[k], last = k === n - 1 && Q.fs > 0; PX(E, T, r[0] + p[0], r[1] + p[1], last ? st[0] : M.cord, last ? st[1] : (k & 1) ? 2 : 3); }
    }
  }
  // 候选部件：boarHead —— 野猪头（整颗在炮身上面）：圆颅 + 往前伸 3 格的吻（前 2 格是粉鼻盘，鼻盘上 2 个鼻孔）、近侧白獠牙 2 格从嘴角往上翘过吻顶、
  //   1 格墨眼 + 1 格睫毛、脑后 2×3 垂耳（头巾下面，耳尖金耳环）、后颈一溜墨黑鬃毛；jaw 咧嘴。两个部件：头颅（含吻、眼、獠牙）→ 垂耳
  function boarHead(T, R, Q) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, m = M.skin, h = (x, y, mm, t) => PX(E, T, x, y, mm, t), hr = (y, a, b, mm, t) => { for (let x = a; x <= b; x++) h(x, y, mm, t); };
    E.part();
    for (let y = bot - 1; y <= bot + 1; y++) h(x0 - 1, y, M.bristle, (y & 1) ? 3 : 4);                          // 后颈鬃
    h(x0, bot + 1, M.bristle, 3);
    hr(top, x0 + 1, x1 - 1, m, 0); for (let y = top + 1; y < bot; y++) hr(y, x0, x1, m, 0); hr(bot, x0 + 1, x1, m, 0);
    h(x1 + 1, ey + 1, m, 4); h(x1 + 1, ey + 2, m, 3); h(x1 + 1, bot, m, 2);                                     // 吻根 + 下颌
    for (let y = ey; y <= ey + 2; y++) { h(x1 + 2, y, M.snout, y === ey ? 4 : 3); h(x1 + 3, y, M.snout, y === ey ? 4 : y === ey + 2 ? 2 : 3); }   // 粉鼻盘 2×3
    h(x1 + 3, ey + 1, M.ink, 0); h(x1 + 2, ey + 2, M.ink, 0);                                                    // 两个鼻孔
    h(x0 + 1, top + 1, m, 4); h(x0 + 2, top + 1, m, 4);
    if (Q.eyes) { h(x1 - 1, ey, m, 1); h(x1 - 2, ey, m, 1); } else { h(x1 - 1, ey, M.ink, 0); h(x1, ey - 1, M.ink, 0); }   // 1 格墨眼 + 1 格睫毛
    h(x1 - 2, ey + 2, M.snout, 3);                                                                              // 腮红
    const jw = Q.jaw | 0; h(x1, bot, M.ink, 0); if (jw) { h(x1 + 1, bot, M.ink, 0); h(x1 - 1, bot, M.ink, 0); } if (jw >= 2) hr(bot + 1, x1 - 1, x1 + 1, m, 2);
    h(x1 + 1, ey, M.tusk, 3); h(x1 + 1, ey - 1, M.tusk, 4);                                                    // 近侧獠牙：2 格白，从吻根往上翘过吻顶（和头同一部件，不压分界线）
    E.part();                                                                                                   // 垂耳 2×3：头巾下沿往后下耷拉
    h(x0 - 1, top + 1, m, 4); h(x0 - 2, top + 1, m, 3); h(x0 - 1, top + 2, M.snout, 2); h(x0 - 2, top + 2, m, 3); h(x0 - 1, top + 3, M.snout, 2); h(x0 - 2, top + 3, m, 2);   // 耳内 2 格暗粉，和头颅轮廓分开
    h(x0 - 2, top + 4, M.gold, 4);                                                                              // 金耳环
  }
  // 候选部件：scarfWrap —— 红头巾：包住头顶两行（白点花纹），脑后打结，两根飘带从结上往后飞 3 格（高过垂耳，bd 0–3 飘动相位）
  function headScarf(T, R, Q) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, s = M.scarf, h = (x, y, t) => PX(E, T, x, y, s, t);
    E.part();
    for (let x = x0 + 1; x <= x1 - 1; x++) h(x, top - 1, 0); for (let x = x0; x <= x1; x++) h(x, top, 0);
    h(x0 + 2, top - 1, 4); h(x1 - 2, top, 4); h(x0 + 4, top, 4);
    h(x0 - 1, top - 1, 3); h(x0 - 1, top, 2);                                                                   // 结
    const W = [[0, 0, -1], [0, -1, -1], [0, -1, -2], [0, 0, 0]][Q.bd & 3];
    for (let k = 0; k < 3; k++) { h(x0 - 2 - k, top - 2 + W[k], k === 2 ? 4 : 0); h(x0 - 2 - k, top + W[k] + (k ? 0 : 0), k === 2 ? 2 : 3); }
  }
  // 候选部件：shellBelt —— 腰后一根 1 格皮吊带从腰带上伸出，吊着一串 3 颗黑铁圆炮弹：每颗 4×4 圆（四角空）、各自一个部件，
  //   铁色阶 1d 基 / 1c 右下暗 / 1f 左上 1 格高光，颗与颗之间空 1 格（烘焙时补成 00 分界线）；挂在身体后轮廓外 3–4 格（臼炮炮尾下方），不被身体挡。
  //   站姿时 Z 字叠三颗（上 → 右下 → 左下），在躯干和腿之后画；n 剩几颗（先少右下那颗：蓄力时后手摘的就是它）；半跪时剩下的炮弹放在身后地上。
  const BALL_AT = [[-13, -1], [-10, 3], [-14, 5]];                                                            // 每颗左上角：x 相对脚底（+lean），y 相对 yWaist（待机 yWaist = −12 → 三颗占 y −13..−4、x −15..−8）
  const BALL_ORDER = [0, 2, 1];                                                                               // 画 / 保留顺序：上、左下、右下（balls 2 = 右下那颗被摘走）
  function ironBall(T, x0, y0) {
    E.part();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      if ((i === 0 || i === 3) && (j === 0 || j === 3)) continue;                                             // 四角空 → 圆
      PX(E, T, x0 + i, y0 + j, M.ball, i === 1 && j === 1 ? 4 : (i === 3 || j === 3 || (i === 2 && j === 2)) ? 2 : 3);
    }
  }
  function shellBelt(T, R, Q) {
    const y0 = R.yWaist, e = parts.edges(R, y0), L = R.lean;
    if (R.kneel) { for (let k = 0; k < Q.balls; k++) ironBall(T, -16 - k * 5 + L, -3); return; }             // 半跪：放在身后地上
    E.part();                                                                                                 // 皮吊带：腰带后沿 → 往后 1 格宽，末端接在最上面那颗的右肩
    const sx0 = RD(e[0]) - 1, ax = BALL_AT[0][0] + L, ay = y0 + BALL_AT[0][1];
    for (let x = sx0; x >= ax + 3; x--) PX(E, T, x, y0, M.leather, x === sx0 ? 3 : 2);
    PX(E, T, ax + 3, ay, M.leather, 3);
    for (let n = 0; n < Q.balls; n++) { const k = BALL_ORDER[n]; ironBall(T, BALL_AT[k][0] + L, y0 + BALL_AT[k][1]); }
  }
  function bigBall(T, x, y) { E.part(); for (let j = -2; j <= 1; j++) for (let i = -2; i <= 1; i++) if (!((i === -2 || i === 1) && (j === -2 || j === 1))) PX(E, T, x + i, y + j, M.ball, i === -1 && j === -1 ? 4 : 0); }
  function drawHero() {
    begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY), T = R, B = breech(R, P);
    if (!P.lying && P.held) bigBall(T, P.bhx - 1, P.bhy - 1);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.leather, hand: M.skinD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'boot', mat: M.uni, matD: M.uniD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'tunic', mat: M.uni, belt: M.leather, buckle: M.gold, strap: M.leather });
    shellBelt(T, R, P);                                                                                       // 挂在身体后轮廓外：躯干、腿之后画，炮尾之前画
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.leather, hand: M.skin, grip: 'fist' });   // 前臂在炮身后面：炮压在右肩上，手从下面托住
    if (!P.lying) mortar(T, B, 0, P);
    boarHead(T, R, P);
    if (!P.lying) headScarf(T, R, P);
    if (P.cloth && !P.lying) { E.part(); PX(E, T, P.hx + 1, P.hy + 1, M.scarf, 4); PX(E, T, P.hx + 1, P.hy + 2, M.scarf, 2); }   // 擦炮的头巾角
    if (P.lying) {                                                     // 掉在地上的炮（横躺）+ 飘落的头巾
      mortar(parts.FREE, [P.canX, -4 - P.canY], 1, P);
      E.part(); const hx = P.hatX, hy = -1 - P.hatY; for (let x = 0; x < 5; x++) PX(E, parts.FREE, hx + x, hy, M.scarf, x === 1 ? 4 : 0); PX(E, parts.FREE, hx + 1, hy - 1, M.scarf, 3); PX(E, parts.FREE, hx + 5, hy, M.scarf, 2); PX(E, parts.FREE, hx + 6, hy + (P.hatY ? 1 : 0), M.scarf, 2);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const G = 300;
  const CH_N = 8, CH_L = 0.5, chX = new Float32Array(CH_N), chY = new Float32Array(CH_N), chVX = new Float32Array(CH_N), chVY = new Float32Array(CH_N); let chT = 9;   // 爆心火球芯（2×2，fire 第 1 → 2 级）
  let smA = 0, soulAcc = 0, lastStep = 0, lastPers = -1, mzT = 9, mzX = 0, mzY = 0, mzBig = 0;
  const shotA = { on: 0, x0: 0, y0: 0, vx: 0, vy: 0, t0: 0, tf: 0, big: 0 }, toss = { x0: 0, y0: 0, x1: 0, y1: 0 };
  function muzzleScr(Q) { const R = parts.rig(Q, BODY), m = at(breech(R, Q), 0, CL + 0.5, 0); return [scrX(m[0] + Q.bx), HY + m[1] - Q.lift]; }
  function launch(big, tf, tx, ty) { const [x, y] = muzzleScr(P); shotA.on = 1; shotA.big = big; shotA.x0 = x; shotA.y0 = y; shotA.tf = tf; shotA.t0 = E.stT; shotA.vx = (tx - x) / tf; shotA.vy = (ty - y - 0.5 * G * tf * tf) / tf; mzT = 0; mzX = x; mzY = y; mzBig = big; }
  function onEnter(s) {
    if (s === CAST) {                                                  // 轰！黑烟外爆 + 十字炮口光 + 大炮弹高抛
      poseAt(CAST, 0, E.simT); launch(1, T_BOOM, DUMMY_X - 2, HY - 3);
      burst(mzX + 2, mzY, 30, 15, 55, 0.5, 1.1, R_EL, 6); burst(mzX + 1, mzY, 10, 30, 80, 0.12, 0.3, R_BLAST, 4); fx.cross(mzX + 2, mzY, 7, R_BLAST, 0.2);
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'stone' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) { launch(0, T_HITA - T_FIRE, DUMMY_X - 2, HY - 14); burst(mzX + 2, mzY, 12, 15, 45, 0.35, 0.7, R_EL, 6); fx.cross(mzX + 2, mzY, 3, R_BLAST, 0.12); sfx('swing', { kind: 'gun', w: 0.6 }); sfx('shoot', { proj: 'stone' }); }
    if (s === ATTACK && t === T_HITA) { const x = DUMMY_X - 2, y = HY - 14; shotA.on = 0; burst(x, y, 10, 30, 90, 0.15, 0.35, FXI.impact, 8); burst(x, y, 6, 15, 40, 0.3, 0.6, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'metal', w: 0.6 }); }
    if (s === CHARGE && t === T_GRAB) { const R = parts.rig(P, BODY); toss.x0 = scrX(P.bhx - 1); toss.y0 = HY + P.bhy - 1; }
    if (s === CHARGE && t === T_TOSS) { const m = muzzleScr(P); toss.x0 = scrX(P.bhx); toss.y0 = HY + P.bhy - 3; toss.x1 = m[0] - 1; toss.y1 = m[1] - 1; }
    if (s === CHARGE && t === T_IN) { const [x, y] = muzzleScr(P); burst(x + 1, y - 1, 8, 10, 30, 0.3, 0.6, R_EL, 10); }   // 炮弹落进炮口：「咚」一小团烟
    if (s === CHARGE && t === T_LIGHT) { const g = [scrX(P.gx), HY + P.gy]; burst(g[0], g[1], 5, 15, 40, 0.1, 0.25, R_BLAST, 6); }
    if (s === CAST && t === T_BOOM) {                                  // 落地爆炸：火球 + 硝烟团 + 大冲击环 + 碎石，假人击退
      const x = DUMMY_X - 2, y = HY - 3; shotA.on = 0;
      burst(x, y - 3, 26, 40, 130, 0.2, 0.55, R_BLAST, 20); fx.cloud(x, y - 7, 12, R_EL, 1.2, 2); fx.cloud(x - 6, y - 3, 9, R_EL, 1.0, 1); fx.cloud(x + 5, y - 11, 7, R_EL, 0.9, 2); burst(x, y - 8, 22, 12, 40, 0.7, 1.3, R_EL, 12);   // 硝烟团加厚：三团 cloud + 22 颗慢速灰黑烟 ring(x, y - 2, 1, R_BLAST); fx.cross(x, y - 5, 6, R_BLAST, 0.18);
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, x - 4 + Math.random() * 8, y - 3, (Math.random() - 0.5) * 90, -60 - Math.random() * 50, 0.9, FXI.earth, { g: 260, floor: HY });
      for (let i = 0; i < CH_N; i++) { const a = -Math.PI * (0.1 + 0.8 * i / (CH_N - 1)), v = 95 + (i % 3) * 28; chX[i] = x; chY[i] = y - 4; chVX[i] = Math.cos(a) * v; chVY[i] = Math.sin(a) * v; } chT = 0;   // 8 颗 2×2 火球芯
      hitDummy(1); E.dummyFx({ dur: 0.7, tint: 'dust', fade: true }); shake(0.14, 1); sfx('impact', { pal: 'fire', w: 0.8 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 22 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && t === T_CAN) { const x = scrX(P.canX + 10 + P.bx); fx.cloud(x, HY - 6, 7, R_EL, 0.9); for (let i = 0; i < 10; i++) spawn(K_DUST, x - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.8 }); }
  }
  const EVENTS = [[], [], [T_FIRE, T_HITA], [T_GRAB, T_TOSS, T_IN, T_LIGHT], [T_BOOM], [], [], [T_LAND, T_CAN], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.step > 0 ? 5 : -5) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === CHARGE && stT > T_IN && (E.stepN % 6) === 0) { const [x, y] = muzzleScr(P); spawn(K_RISE, x + (Math.random() - 0.5) * 2, y - 1, (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL); }   // 炮口冒细烟
    if (state === CHARGE && stT > T_LIGHT && (E.stepN % 3) === 0) spawn(K_EMBER, scrX(P.gx), HY + P.gy, (Math.random() - 0.5) * 16, -10 - Math.random() * 10, 0.2, FXI.fire);   // 引信嘶嘶火星
    if (state === RECOVER && stT < 0.45 && (E.stepN % 4) === 0) spawn(K_RISE, scrX(6 + Math.random() * 6), HY - 18 - Math.random() * 4, 8 + Math.random() * 8, -4 - Math.random() * 4, 0.5, R_EL);   // 被扇开的烟
    if (state === IDLE) {                                              // 擦完炮口吹一口：一小团灰
      const i = f12of(q12(stT) % DUR[IDLE] + 1e-9);
      if (i !== lastPers) { if (i === 21) { const [x, y] = muzzleScr(P); for (let k = 0; k < 4; k++) spawn(K_DUST, x, y, 10 + Math.random() * 12, -4 - Math.random() * 6, 0.35, R_EL); } lastPers = i; }
    }
    if (shotA.on && (E.stepN & 1) === 0) { const s = E.stT - shotA.t0; if (s >= 0 && s < shotA.tf) spawn(K_TRAIL, shotA.x0 + shotA.vx * s - 2, shotA.y0 + shotA.vy * s + 0.5 * G * s * s, -shotA.vx * 0.1, 0, shotA.big ? 0.4 : 0.25, R_EL); }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {   // 化灰
      soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 24 + Math.random() * 44, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, Math.random() < 0.8 ? FXI.dust : FXI.soul); }
    }
    mzT += dt;
    if (chT < CH_L) { chT += dt; for (let i = 0; i < CH_N; i++) { chX[i] += chVX[i] * dt; chY[i] += chVY[i] * dt; chVY[i] += 160 * dt; chVX[i] *= 0.95; chVY[i] *= 0.95; } }
  }
  const K_TRAIL = E.K_TRAIL;
  function fxReset() { chT = 9; soulAcc = 0; lastStep = 0; lastPers = -1; mzT = 9; shotA.on = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(scrX(P.gx), P.rim, FI, f12); }
  function fxFront(f12) {
    if (mzT < 2 / 12) {                                                // 十字炮口光：白芯 + 火黄
      const c0 = mzT < 1 / 12 ? 21 : FI[1], L = mzBig ? 5 : 3, x = RD(mzX + 2), y = RD(mzY);
      for (let r = 1; r <= L; r++) { const c = r <= 1 ? c0 : r <= 3 ? FI[1] : FI[2]; put(x + r, y - RD(r / 2), c); put(x, y - r, r < 3 ? c : FI[2]); put(x, y + r, r < 2 ? c : FI[2]); put(x - 1, y - r - 1, r < 2 ? c : 0 || FI[2]); }
      put(x, y, 21);
    }
    if (shotA.on) {                                                    // 高抛物线黑铁炮弹（大弹 4×4，带引信火星）
      const s = E.stT - shotA.t0;
      if (s >= 0 && s < shotA.tf) {
        const x = RD(shotA.x0 + shotA.vx * s), y = RD(shotA.y0 + shotA.vy * s + 0.5 * G * s * s), n = shotA.big ? 2 : 1;
        for (let j = -n; j < n; j++) for (let i = -n; i < n; i++) if (!(n === 2 && (i === -2 || i === 1) && (j === -2 || j === 1))) put(x + i, y + j, (i === -n + (n === 2 ? 1 : 0) && j === -n + (n === 2 ? 1 : 0)) ? 29 : 27);
        put(x - n, y - n, 8); if (shotA.big) { put(x - 3, y - 2, (f12 & 1) ? 47 : 21); put(x - 4, y - 3, 46); }
      }
    }
    if (chT < CH_L) {                                                  // 爆心火球芯：2×2，前半程 fire 第 1 级、后半程第 2 级，最后两帧第 3 级收尾
      const c = chT < CH_L * 0.45 ? FI[1] : chT < CH_L * 0.8 ? FI[2] : FI[3];
      for (let i = 0; i < CH_N; i++) { const x = RD(chX[i]), y = RD(chY[i]); put(x, y, c); put(x + 1, y, c); put(x, y + 1, c); put(x + 1, y + 1, c); if (chT < CH_L * 0.25) put(x, y, 21); }
    }
    if (E.state === CHARGE && E.stT >= T_TOSS && E.stT < T_IN) {        // 抛进炮口的大炮弹
      const q = (E.stT - T_TOSS) / (T_IN - T_TOSS), x = RD(toss.x0 + (toss.x1 - toss.x0) * q), y = RD(toss.y0 + (toss.y1 - toss.y0) * q - Math.sin(Math.PI * q) * 9);
      for (let j = -2; j < 2; j++) for (let i = -2; i < 2; i++) if (!((i === -2 || i === 1) && (j === -2 || j === 1))) put(x + i, y + j, i === -1 && j === -1 ? 29 : 27);
    }
  }

  return {
    name: '炮手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.spark], HIT_POINT: [0, -14], EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'fire', style: 'meteor', w: 0.8 },
    REVIVE: { ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
