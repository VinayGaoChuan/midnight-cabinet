// 迷路的孩子（小游戏 G014「迷路的孩子」NPC · 孩童 · 远程）：雪夜白桦林里走在前面带路的小女孩——也许是个幽灵。
// 剪影：孩童档（脚底到帽冠 21 格，头 7×7），深红尖顶兜帽（帽尖从帽冠后上方翘出、会甩）、及腰的深红短斗篷（下摆往后张开）、
//   前手平举一盏和头差不多大的黄铜提灯（提环 + 盖 + 帽檐 + 两根立柱夹 3×3 玻璃窗 + 火苗）——整个场景里唯一的暖光；苍白长裙 + 白袜 + 小靴。
// 待机：提灯慢慢摆、火苗摇曳、帽尖一颠一颠，每个循环转过头来看你一眼。移动：小碎步颠跑，每一步在雪上亮起一个脚印。
// 攻击 =「点亮脚印」：灯高举向前，射出一道光锥，一团暖光贴着地面滚向目标，一路把脚印点亮。
// 技能 =「带你找到藏宝处」：双手捧灯聚光 → 灯火爆亮，一圈暖光沿雪地扫出去，扫过的雪花被照成金色，目标处的藏宝点亮起金边、冒出金光 → 放下灯，笑了（嘴角 1 格）。
// 受击：往后一缩，提灯乱晃、灯火暗一档。死亡 = 灯灭化雪：灯火熄灭、提灯掉进雪里，她从脚往上化成雪花飘走，空兜帽悬了一下才飘落在灯旁，最后一起消散。
PCD.define('LanternGirl', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, sfx, DUMMY_X } = E;
  const RD = Math.round, PX = parts.px, RUN = parts.run, FL = (v) => Math.floor(v + 1e-6);

  // ───── 元素：提灯暖光（自建 lanternGlow：白 21 → 淡金 51 → 琥珀 47 → 金 14 → 木褐 19，全是共享色）；雪（lostSnow：白 → 雪白 → 淡蓝 → 灰蓝 → 夜蓝）─────
  const R_EL = fxRamp('lanternGlow', [21, 51, 47, 14, 19]), EL = FXR[R_EL];
  const R_SNOW = fxRamp('lostSnow', [21, 17, 60, 59, 3]);

  // ───── 材质 ─────
  const M = parts.mats(E, {
    hood: 'crimson', cape: 'crimson', lining: { r: [11, 11, 12, 12], flat: 1 },
    dress: { r: 'pale', band: 2 }, stock: 'white', boot: 'boot', skin: 'skin', hair: 'sand', bow: 'white', blush: { r: 'pink', flat: 1 }, ink: { r: 'ink', flat: 1 },
    brass: 'gold',
    glass: { r: [45, 46, 47, 51], flat: 1 },                          // 灯罩玻璃（发光体）：1 橙红 · 2 橙 · 3 琥珀 · 4 淡金
    flame: { r: [47, 51, 21, 21], flat: 1 },                          // 火苗（发光体）：1 琥珀 · 2 淡金 · 3 白
    dark: { r: [0, 27, 28, 29], flat: 1 },                            // 熄灭的玻璃
  });
  const BODY = { body: 'child', leg: 6, torso: 6, head: 7, headW: 7, sw: 3, arm: 6, lw: 2, stride: 2, lift: 2 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(56, 44, 26, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['brass', 'glass', 'flame', 'dark', 'skin', 'hair', 'ink', 'bow', 'blush', 'lining']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  // 死亡化雪时留下来的材质：兜帽（最后落地）、提灯（掉在雪里）
  const KEEP = new Uint8Array(256); for (const k of ['hood', 'hoodD', 'lining', 'brass', 'brassD', 'glass', 'flame', 'dark']) KEEP[M[k]] = 1;

  // ───── 姿势：前手 hx/hy 握提环（灯挂在手下），后手 bhx/bhy（捧灯时压在灯身左侧）─────
  // tip 帽尖 -1 上翘 · 0 平常 · 1 下垂 · 2 往前甩 · 3 往后吹平；lsw 灯身摆 -2..2；gem 灯火 0 待机 · 1 亮 · 2 更亮 · 3 爆亮 · 4 熄灭 · 5 暗一档；flk 火苗形状 0–3
  // look 0 侧脸 · 1 转向镜头 · 2 转向镜头并往后瞟；smile 笑；two 双手捧灯；lfree 提灯离手 1 下落 · 2 立在雪里；hood 空兜帽 1–4 飘落 · 5 压扁 · 6 瘫平
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    tip: 0, lsw: 0, gem: 0, flk: 0, glint: 0, rim: 0, eyes: 0, look: 0, smile: 0, flash: 0, lift: 0, two: 0,
    lfree: 0, lx: 0, ly: 0, hood: 0, hdx: 0, hdy: 0, dq: 0, dqi: 0, dqb: 0, dqbi: 0, dqe: 0, dqei: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -12, -2, -5);                    // 前手往前平举，提灯挂在膝前
  const K_TUCK = K(5, -12, -3, -6, -1, 0, 1);          // 攻击预兆：灯往怀里一收、微蹲
  const K_RAISE = K(7, -15, -3, -7, 1);                // 出手：灯高举向前
  const K_HOLD = K(7, -14, -3, -6, 1);
  const K_HUG = K(6, -13, 4, -8, 0, 0, 1);             // 蓄力：双手把灯捧在身前（后手扶住灯身左侧立柱）
  const K_BLAZE = K(7, -15, 5, -8, 1);                 // 施放：双手把灯举高向前
  const K_HURT = K(5, -11, -3, -5, -1, -1, 1);         // 受击：往后一缩
  const K_BOW = K(6, -13, 4, -8, 0, 0, 1);             // 死亡：双手捧着快灭的灯，闭眼
  const K_LET = K(2, -5, -2, -4, 0, 0, 1);             // 灯掉了，两手垂下
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B == null ? A : B, q || 0, FIELDS);
  const KEY = E.keyer([['hx', -8, 16], ['hy', -24, 2], ['bhx', -10, 12], ['bhy', -24, 2], ['lean', -1, 1], ['head', -1, 1], ['crouch', 0, 4], ['bob', 0, 1],
    ['bx', -4, 4], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['bend', 0, 3], ['tip', -1, 3], ['lsw', -2, 2], ['gem', 0, 5], ['flk', 0, 3],
    ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['look', 0, 2], ['smile', 0, 1], ['flash', 0, 1], ['lift', 0, 2], ['two', 0, 1],
    ['lfree', 0, 2], ['lx', -4, 16], ['ly', -16, 0], ['hood', 0, 6], ['hdx', -8, 8], ['hdy', -24, 0], ['dqi', 0, 16], ['dqbi', 0, 16], ['dqei', 0, 12], ['st', 0, 8]]);
  // 待机：提灯 0.3 s 一摆、斗篷 0.6 s 一摆（都整除 2.4 s 循环）；火苗每 2 帧换形；个性 1.4 s 起 7 帧转头看你
  const LSW = [0, 1, 0, -1], SWAY = [0, 1, 0, -1], FLK = [0, 0, 1, 1, 0, 0, 2, 2, 3, 3, 0, 0, 2, 2, 1, 1], PERS0 = 1.4, LOOK = [1, 2, 2, 2, 2, 2, 1];
  const T_STRIKE = 2 / 12, T_REACH = 0.25;
  const T_OUT = INCOMING + 0.47, T_LAND = INCOMING + 0.64, T_FADE = INCOMING + 0.72, T_GONE = INCOMING + 1.35, T_HLAND = T_GONE + 4 / 12, T_END = INCOMING + 2.3;
  // 空兜帽飘落 4 帧的位置（帽冠左上角锚点：帽冠中列、帽冠顶行）和帽尖朝向
  const HOOD_PATH = [[0, -20, -1], [1, -16, 3], [-1, -12, -1], [0, -9, 3]];
  const LF = 5;                                          // 火苗在提灯本地坐标的行（提环顶 = 0）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(t);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.tip = 0; P.lsw = 0; P.gem = 0; P.flk = 0; P.glint = 0; P.rim = 1;
    P.eyes = 0; P.look = 0; P.smile = 0; P.flash = 0; P.lift = 0; P.two = 0; P.lfree = 0; P.lx = 0; P.ly = 0; P.hood = 0; P.hdx = 0; P.hdy = 0;
    P.dq = 0; P.dqb = 0; P.dqe = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE); const lp = tq % DUR[IDLE], f = f12of(lp);
      P.bob = FL(lp / 0.4) & 1; P.tip = (FL((lp - 1 / 12) / 0.4) & 1) ? 1 : 0;       // 帽尖比呼吸慢一拍
      P.lsw = LSW[FL(lp / 0.3) & 3]; P.sway = SWAY[FL(lp / 0.6) & 3]; P.flk = FLK[f % FLK.length];
      P.glint = f === 9 ? 1 : 0; if (f === 6) P.eyes = 1;                               // 火芯白闪一下；眨眼
      if (lp >= PERS0 - 1e-6 && lp < PERS0 + LOOK.length / 12) { const k = f12of(lp - PERS0); P.look = LOOK[Math.min(LOOK.length - 1, k)]; if (k === 0 || k === 6) P.tip = 1; }   // 转过头来看你
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 小碎步颠跑：经过帧整个人离地 1 格，帽尖一上一下，提灯反向摆
      setK(K_IDLE); const f = gait(tq); parts.gait(P, f);
      P.lift = P.wup ? 1 : 0; P.tip = P.step ? 1 : -1; P.lsw = [-1, 0, 1, 0][f]; P.bhx -= P.step; P.flk = f & 1 ? 1 : 2; P.bend = 1;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_TUCK, ease.out(tq / 0.12)); P.gem = 1; P.lsw = 1; P.tip = 1; }
      else if (tq < 0.2) { setK(K_RAISE); P.gem = 2; P.rim = 2; P.tip = 3; P.sway = -1; P.bend = 2; P.lsw = -1; P.flk = 3; }
      else if (tq < 0.45) { setK(K_RAISE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.rim = 2; P.tip = -1; P.bend = 1; P.lsw = 1; P.flk = 3; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.lsw = tq < 0.6 ? -1 : 0; P.tip = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 双手捧灯聚光：灯 1/2 档逐帧闪，最后 0.3 s 帽尖一抖一抖
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_HUG, q); P.two = tq >= 0.25 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; P.flk = f12 & 3; P.tip = tq > 1.1 ? ((f12 & 1) ? -1 : 0) : 0; P.lsw = tq < 0.25 ? 1 : 0;
    } else if (st === CAST) {                                            // 双手把灯举高，灯火爆亮，斗篷和帽尖被光吹向后
      setK(K_HUG, K_BLAZE, ease.out(clamp01(tq / 0.12))); P.two = 1; P.gem = 3; P.rim = 3; P.tip = 3; P.sway = -1; P.bend = 2; P.flk = 3;
    } else if (st === RECOVER) {                                         // 放下灯，灯火 2 → 1 → 0，笑了
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_BLAZE, K_IDLE, q); P.two = q < 0.5 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bend = q < 0.3 ? 1 : 0; P.tip = q < 0.3 ? -1 : 0; P.smile = tq >= 0.2 ? 1 : 0; P.lsw = q > 0.55 && q < 0.9 ? 1 : 0;
    } else if (st === HURT) {                                            // 往后一缩，提灯乱晃、灯火暗一档
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.tip = 2; P.sway = 1; P.bend = 1; P.gem = 5; P.lsw = (f12 & 1) ? 2 : -2; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.tip = 1; P.gem = 5; P.lsw = (f12 & 1) ? 1 : -1; P.rim = 0; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.gem = h < 0.42 ? 5 : 0; }
    } else if (st === DEATH) {                                           // 灯灭化雪
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.tip = 2; P.sway = 1; P.bend = 1; P.gem = (f12 & 1) ? 5 : 0; P.lsw = (f12 & 1) ? 2 : -2; }
      else if (d < 0.55) { setK(K_BOW); P.bx = -1; P.eyes = 1; P.tip = 1; P.two = 1; P.gem = d < 0.47 ? ((f12 & 1) ? 5 : 4) : 4; }
      else {
        setK(K_LET); P.bx = -1; P.eyes = 1; P.tip = 1; P.gem = 4;
        if (d < 0.64) { P.lfree = 1; P.lx = 6; P.ly = -10; } else { P.lfree = 2; P.lx = 6; P.ly = -8; }
        if (d >= 0.72) P.dqb = clamp01((d - 0.72) / 0.63);
        if (d >= 1.35) {
          const k = f12of(d - 1.35); P.hood = k < 4 ? k + 1 : k < 5 ? 5 : 6;
          if (P.hood <= 4) { const h = HOOD_PATH[P.hood - 1]; P.hdx = h[0]; P.hdy = h[1]; P.tip = h[2]; } else { P.hdx = -3; P.hdy = 0; P.tip = 1; }
        }
        if (d >= 2.3) P.dqe = clamp01((d - 2.3) / 0.28);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.look = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : tq > 0.6 ? 0 : 4;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lfree) { const f = parts.toSprite(lanternT(), 0, LF); P.gx = f[0] + P.bx; P.gy = f[1]; }
    else { P.gx = P.hx + P.lsw + P.bx; P.gy = P.hy + 1 + LF - P.lift; }
    P.dqi = RD(P.dq * 16); P.dqbi = RD(P.dqb * 16); P.dqei = RD(P.dqe * 12);
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：hoodTip —— 帽尖（从帽冠后上方翘出，3 → 2 → 1 格收尖、尖端下垂）；[dy, dx0, dx1]，相对 (头后列 x0, 头顶行 top)
  const TIPS = [
    [[-3, 0, 2], [-4, -1, 1], [-5, -2, -1], [-6, -2, -2]],             // -1 上翘
    [[-3, 0, 2], [-4, -2, 0], [-4, -3, -3], [-3, -4, -4]],             //  0 平常：往后上方翘、尖端下垂
    [[-3, 0, 2], [-3, -2, -1], [-3, -3, -3], [-2, -4, -4]],            //  1 下垂
    [[-3, 0, 3], [-4, 2, 4], [-5, 4, 5], [-4, 6, 6]],                  //  2 往前甩（受击惯性）
    [[-3, 0, 2], [-3, -3, -1], [-3, -5, -4], [-3, -6, -6]],            //  3 往后吹平
  ];
  function hoodTip(T, x0, top, s) { const C = TIPS[Math.max(-1, Math.min(3, s)) + 1]; for (const [dy, a, b] of C) RUN(E, T, top + dy, x0 + a, x0 + b, M.hood, 0); }
  // 候选部件：hoodShell —— 兜帽外壳（帽冠两行 + 前檐 + 后片 + 颈后垂布 + 帽尖）；hollow = 空兜帽：脸的位置填暗红里衬。front = 转向镜头时另一侧帽沿
  function hoodShell(T, x0, x1, top, bot, ey, tipS, front, hollow) {
    const H = M.hood;
    hoodTip(T, x0, top, tipS);
    RUN(E, T, top - 2, x0 + 1, x1 - 1, H, 0); RUN(E, T, top - 1, x0 - 1, x1, H, 0); RUN(E, T, top, x0 - 1, x1 + (front ? 0 : 1), H, 0);
    for (let y = top + 1; y <= bot; y++) RUN(E, T, y, x0 - 1 - (y > ey ? 1 : 0), x0 + (front ? 0 : 1), H, 0);
    RUN(E, T, bot + 1, x0 - 2, x0 + 3, H, 0); RUN(E, T, bot + 2, x0 - 2, x0 + 2, H, 0);
    if (front) for (let y = top + 1; y <= ey + 2; y++) PX(E, T, x1, y, H, 0);
    PX(E, T, x0 - 1, ey + 2, H, 2); PX(E, T, x0, ey + 3, H, 2); PX(E, T, x0 + 1, top - 2, H, 4);                   // 后片的褶、帽冠高光
    if (hollow) for (let y = top + 1; y <= bot; y++) RUN(E, T, y, x0 + 2, x1 - (y === bot ? 1 : 0), M.lining, y === top + 1 ? 1 : 2);
  }
  // 候选部件：hoodHead —— 尖顶兜帽 + 脸 + 刘海 + 颈下蝴蝶结（同一个部件：兜帽和脸之间是自动明暗的边，小脸上不压分界线）
  function hoodHead(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, S = M.skin, HR = M.hair, lk = P.look;
    E.part();
    hoodShell(R, x0, x1, top, bot, ey, P.tip, lk, 0);
    const f0 = x0 + (lk ? 1 : 2), f1 = x1 - (lk ? 1 : 0);
    for (let y = top + 1; y <= bot; y++) RUN(E, R, y, f0 + (y === bot ? 1 : 0), f1 - (y === bot ? 1 : 0), S, 0);
    if (!lk) {                                                            // 侧脸：刘海一行 + 脸后一缕鬓发，2 格竖眼、鼻尖、腮红、嘴
      RUN(E, R, top + 1, f0, f1 - 1, HR, 0); PX(E, R, f0 + 1, top + 1, HR, 4); PX(E, R, f0, top + 2, HR, 0); PX(E, R, f0, top + 3, HR, 2);
      if (P.eyes) { PX(E, R, x1 - 1, ey + 1, S, 1); PX(E, R, x1 - 2, ey + 1, S, 1); } else { PX(E, R, x1 - 1, ey, M.ink, 1); PX(E, R, x1 - 1, ey + 1, M.ink, 1); }
      PX(E, R, x1 + 1, ey + 1, S, 3); PX(E, R, x1 - 2, ey + 2, M.blush, 3);
      if (P.smile) PX(E, R, x1, ey + 2, S, 1); else PX(E, R, x1 - 1, bot, S, 1);
    } else {                                                             // 转向镜头：刘海中分，两只眼（look 2 往后瞟 1 格），两边腮红，嘴居中
      RUN(E, R, top + 1, f0, f1, HR, 0); PX(E, R, R.hx, top + 1, S, 3); PX(E, R, f0 + 1, top + 1, HR, 4);
      const e = lk === 2 ? -1 : 0;
      if (P.eyes) { PX(E, R, R.hx - 1, ey + 1, S, 1); PX(E, R, R.hx + 1, ey + 1, S, 1); }
      else for (const x of [R.hx - 1 + e, R.hx + 1 + e]) { PX(E, R, x, ey, M.ink, 1); PX(E, R, x, ey + 1, M.ink, 1); }
      PX(E, R, f0, ey + 2, M.blush, 3); PX(E, R, f1, ey + 2, M.blush, 3); PX(E, R, R.hx, bot, S, 1);
    }
    PX(E, R, x1 - 1, bot + 1, M.bow, 3); PX(E, R, x1, bot + 1, M.bow, 4); PX(E, R, x1 - 1, bot + 2, M.bow, 2); PX(E, R, x1 + 1, bot + 2, M.bow, 3);   // 帽带在颈下打的蝴蝶结
  }
  // 候选部件：capelet —— 及腰短斗篷（压在长裙上）：肩上贴身，往下往后张开（sway 摆、bend 后扬），两道褶，下摆一个缺口、后下角往后翘
  function capelet(R) {
    E.part(); const m = M.cape, sway = P.sway || 0, bend = P.bend || 0, y0 = R.yS, n = 5;
    let L = 0, Rr = 0;
    for (let k = 0; k < n; k++) {
      const y = y0 + k, t = k / (n - 1), e = parts.edges(R, Math.min(y, R.yHip));
      L = RD(e[0] - 1 - t * t * 2.4 + sway * t * t - bend * t * t * 1.3); Rr = k < 2 ? e[1] + 1 : RD(e[1] + 0.6 + t);
      RUN(E, R, y, L, Rr, m, 0);
      if (k >= 2) { PX(E, R, L + 2, y, m, 2); if (k >= 3) PX(E, R, Rr - 2, y, m, 2); }
    }
    const yb = y0 + n - 1;
    PX(E, R, L + 3, yb, m, 2); PX(E, R, L - 1, yb + (bend >= 2 ? 0 : 1), m, 0); PX(E, R, L, yb + 1, m, 2);          // 下摆一个缺口 + 往后翘的下角
  }
  // 候选部件：brassLantern —— 黄铜提灯（和头差不多大，5 × 9）：提环顶 + 两根斜臂 → 3 格盖 → 5 格帽檐 → 两根黄铜立柱夹 3×3 玻璃窗（火苗在中间）→ 5 格底座 → 3 格灯脚。
  //   T 落笔变换（提环顶 = 本地 (0, 0)）；sw 灯身摆（提环顶不动）；lv 灯火 6 档；flk 火苗形状。灯框、玻璃、火苗同一个部件
  const GLASS = [                                                        // 3×3 玻璃窗的色调（行主序，中间一列下两格是火苗），从火苗往四角变暗
    [1, 3, 1, 2, 3, 2, 1, 2, 1],                                         // 0 待机
    [2, 3, 2, 3, 3, 3, 2, 3, 2],                                         // 1 亮
    [3, 4, 3, 4, 4, 4, 3, 4, 3],                                         // 2 更亮
    [4, 4, 4, 4, 4, 4, 4, 4, 4],                                         // 3 爆亮（火苗材质，整窗发白）
    [2, 2, 2, 2, 2, 2, 2, 2, 2],                                         // 4 熄灭（暗玻璃）
    [1, 1, 1, 1, 2, 1, 1, 1, 1],                                         // 5 暗一档
  ];
  const FLAME = [[[0, 1]], [[-1, 1]], [[1, 1]], [[0, 1], [0, 0]]];        // 火苗尖的位置（芯在窗底行正中）：0 直 · 1 左偏 · 2 右偏 · 3 蹿高
  function brassLantern(T, sw, lv, flk, glint) {
    E.part(); const B = M.brass, o = sw;
    PX(E, T, 0, 0, B, 3); PX(E, T, -1 + o, 1, B, 0); PX(E, T, 1 + o, 1, B, 0);                                    // 提环
    RUN(E, T, 2, -1 + o, 1 + o, B, 3); PX(E, T, -1 + o, 2, B, 4);                                                   // 盖
    RUN(E, T, 3, -2 + o, 2 + o, B, 3); PX(E, T, -2 + o, 3, B, 4); PX(E, T, 2 + o, 3, B, 2);                         // 帽檐
    for (let r = 0; r < 3; r++) {
      const y = 4 + r; PX(E, T, -2 + o, y, B, 3); PX(E, T, 2 + o, y, B, 2);                                         // 立柱：左亮右暗
      for (let c = -1; c <= 1; c++) {
        const tn = GLASS[lv][r * 3 + c + 1];
        if (lv === 4) PX(E, T, c + o, y, M.dark, c + 1 === r ? 3 : tn);                                           // 熄灭：暗玻璃上一道斜反光
        else if (lv === 3) PX(E, T, c + o, y, M.flame, (r === 0 || r === 2) && c !== 0 ? 2 : 3);
        else PX(E, T, c + o, y, M.glass, tn);
      }
    }
    RUN(E, T, 7, -2 + o, 2 + o, B, 3); PX(E, T, 2 + o, 7, B, 2); RUN(E, T, 8, -1 + o, 1 + o, B, 2);                // 底座 + 灯脚
    if (lv === 4) { PX(E, T, o, 6, M.dark, 1); return; }                                                            // 熄灭：一格灯芯
    if (lv === 3) return;
    const core = lv === 5 ? 1 : glint || lv >= 1 ? 3 : 2, tipT = lv === 5 ? 0 : lv >= 2 ? 3 : lv === 1 ? 2 : 1;
    PX(E, T, o, 6, M.flame, core);
    if (tipT) for (const [dx, dy] of FLAME[flk & 3]) PX(E, T, o + dx, 4 + dy, M.flame, dy === 0 ? Math.max(1, tipT - 1) : tipT);
  }
  function lanternT() {
    if (P.lfree) return { r0: 0, tx: P.lx, ty: P.ly, rot: 0, ox: 0, oy: 0 };
    return { r0: 0, tx: P.hx, ty: P.hy + 1, rot: 0, ox: 0, oy: 0 };
  }
  // 候选部件：emptyHood —— 空兜帽：1–4 飘落（帽口里是暗红里衬，帽尖一上一下）· 5 落地压扁 · 6 瘫成一滩（帽尖拖在后面）
  function emptyHood(cx, cy, k, tipS) {
    const T = parts.FREE, H = M.hood;
    E.part();
    if (k <= 4) { hoodShell(T, cx - 3, cx + 3, cy + 2, cy + 8, cy + 5, tipS, 0, 1); return; }
    if (k === 5) {
      RUN(E, T, -4, cx - 2, cx + 2, H, 0); RUN(E, T, -3, cx - 4, cx + 3, H, 0); RUN(E, T, -2, cx - 5, cx + 4, H, 0); RUN(E, T, -1, cx - 5, cx + 4, H, 0); RUN(E, T, 0, cx - 6, cx + 3, H, 0);
      RUN(E, T, -2, cx - 1, cx + 2, M.lining, 1); RUN(E, T, -1, cx - 1, cx + 3, M.lining, 2);
      RUN(E, T, -5, cx - 3, cx - 2, H, 0); PX(E, T, cx - 4, -6, H, 0); PX(E, T, cx - 5, -5, H, 0);
      return;
    }
    RUN(E, T, -2, cx - 3, cx + 2, H, 0); RUN(E, T, -1, cx - 5, cx + 4, H, 0); RUN(E, T, 0, cx - 6, cx + 5, H, 0);
    RUN(E, T, -1, cx, cx + 3, M.lining, 1); PX(E, T, cx - 2, -2, H, 4); PX(E, T, cx - 3, 0, H, 2);
    PX(E, T, cx - 7, 0, H, 0); PX(E, T, cx - 8, 0, H, 0); PX(E, T, cx - 9, -1, H, 0);                              // 帽尖拖在后面、尖端翘起
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.st === DEATH && P.hood >= 1) { brassLantern(lanternT(), 0, 4, 0, 0); emptyHood(P.hdx, P.hdy, P.hood, P.tip); return; }
    const R = parts.rig(P, BODY);
    arm(R, { side: 'B', sleeve: 'tight', mat: M.dressD, hand: M.skinD, grip: P.two ? 'none' : 'fist', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'boot', mat: M.stock, matD: M.stockD, boot: M.boot, bootD: M.bootD, w: 2, bootH: 2 });
    parts.torso(E, R, P, { style: 'dress', mat: M.dress, trim: M.stock, hem: R.yHip + 1, flare: 2, flareF: 1.5 });
    capelet(R);
    hoodHead(R);
    brassLantern(lanternT(), P.lfree ? 0 : P.lsw, P.gem, P.flk, P.glint);
    if (P.two) parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.skin });
    arm(R, { side: 'F', sleeve: 'tight', mat: M.dress, hand: M.skin, at: [P.hx, P.hy] });
  }
  // 手臂：孩子的手在肩前上方时，部件库默认把肘往上顶（会横在脸前）；这里按手的方向选一边，让肘总是往下垂
  function arm(R, o) {
    const B = o.side === 'B', dx = o.at[0] - (B ? R.sBx : R.sFx), dy = o.at[1] - (B ? R.sBy : R.sFy), d = Math.hypot(dx, dy) || 1;
    const s = (dy / d + (dx / d) * 0.8) >= 0 ? 1 : -1;
    return parts.arm(E, R, P, (dx / d) * s < -0.05 ? Object.assign({ elbow: 'out' }, o) : o);
  }
  // 化雪：身体从脚往上消散（留下兜帽和提灯）；最后兜帽、提灯一起消散
  const MAT_AT = (s, i) => { const m = s.mat[i]; if (m) return m; const w = s.w; return s.mat[i + w] || s.mat[i + 1] || s.mat[i - 1] || s.mat[i - w] || 0; };
  function dissolve(s, qb, qe) {
    const w = s.w, h = s.h, o = s.out; let top = h, bot = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (o[y * w + x] !== 255) { if (y < top) top = y; if (y > bot) bot = y; }
    const span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (o[i] === 255) continue; const keep = KEEP[MAT_AT(s, i)], b = B8[(y & 7) * 8 + (x & 7)] * 0.55;
      if (keep) { if (qe > 0 && b + (y - top) / span * 0.45 < qe) o[i] = 255; }
      else if (qb > 0 && b + (bot - y) / span * 0.45 < qb) o[i] = 255;
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.dqb > 0 || P.dqe > 0) dissolve(hero, P.dqb, P.dqe);
  }

  // ───── 特效 ─────
  let coneT = 9, atkT = 9, ax0 = 0, swT = 9, castT = 9, cacheT = 9, smokeT = 9, chargeAcc = 0, snowAcc = 0, litAcc = 0, cacheAcc = 0, emberAcc = 0, riseAcc = 0, lastStep = 0;
  const FPN = 10, fpX = new Float32Array(FPN), fpA = new Float32Array(FPN).fill(9), fpD = new Int8Array(FPN); let fpI = 0;
  const SPD = 160, SW_V = 240, SW_END = 0.6;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function addPrint(x, d) { fpX[fpI] = x; fpA[fpI] = 0; fpD[fpI] = d; fpI = (fpI + 1) % FPN; }
  const printC = (a) => (a < 0.1 ? EL[1] : a < 0.4 ? EL[2] : a < 0.75 ? EL[3] : EL[4]);
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(40, 100, 0.3, 0.7); burst(gx, gy, 20, 40, 110, 0.25, 0.6, R_EL, 10); ring(gx, gy, 1, R_EL);
    shake(0.28, 2); flash(0.05); swT = 0; castT = 0;
  }
  function onTime(s, t) {
    const gx = wx(P.gx), gy = wy(P.gy), d = P.flip ? -1 : 1;
    if (s === ATTACK && t === T_STRIKE) {                                // 灯高举：光锥 + 贴地滚出的暖光团
      coneT = 0; atkT = 0; ax0 = gx + 12 * d;
      shoot(1, ax0, gy + 1, SPD, DUMMY_X - 4, R_EL, 0, { trail: { every: 2, life: [0.08, 0.2], back: [4, 12] }, glow: -1 });
      burst(gx, gy, 6, 20, 50, 0.12, 0.3, R_EL, 4);
      sfx('swing', { kind: 'staff', w: 0.1 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_REACH) {                                   // 光圈扫到藏宝处：金边 + 星芒 + 地下冒金光
      dummyFx({ dur: 1.1, outline: R_EL }); fx.cross(DUMMY_X, HY - 31, 4, R_EL, 0.35); burst(DUMMY_X, HY - 2, 12, 20, 60, 0.3, 0.7, R_EL, 30);
      cacheT = 0; shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.15 });
    }
    if (s === HURT && t === INCOMING) {                                  // 灯里掉出火星，脚下一团雪沫
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, gx + (Math.random() - 0.5) * 3, gy + 2, (Math.random() - 0.5) * 30, -20 - Math.random() * 20, 0.5, R_EL, { g: 180, floor: HY });
      for (let i = 0; i < 4; i++) spawn(K_DUST, wx(-2 + Math.random() * 6), HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 4, 0.35, R_SNOW);
    }
    if (s === DEATH) {
      if (t === T_OUT) { smokeT = 0; for (let i = 0; i < 3; i++) spawn(K_EMBER, gx, gy - 3, (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.4, R_EL); }
      if (t === T_LAND) { for (let i = 0; i < 6; i++) spawn(K_DUST, gx + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 5, 0.4, R_SNOW); sfx('fall', { w: 0.1 }); }
      if (t === T_HLAND) for (let i = 0; i < 8; i++) spawn(K_DUST, wx(-4 + Math.random() * 8), HY, (Math.random() - 0.5) * 24, -3 - Math.random() * 5, 0.45, R_SNOW);
      if (t === T_END) for (let i = 0; i < 10; i++) spawn(K_RISE, wx(-9 + Math.random() * 20), HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.9 + Math.random() * 0.6, R_SNOW);
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_REACH], [], [INCOMING], [T_OUT, T_LAND, T_HLAND, T_END], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;
    burst(x, y, 10, 30, 80, 0.15, 0.35, R_EL, 6); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.1 });
  }
  function stepFX(dt, st, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (st === MOVE && P.step !== lastStep) {                            // 每一步：一个亮起的脚印 + 一颗雪沫
      if (P.step !== 0) { const d = P.flip ? -1 : 1, x = wx(P.bx + 3); addPrint(x, d); sfx('step', { w: 0.1 }); spawn(K_DUST, x, HY, (Math.random() - 0.5) * 8, -2 - Math.random() * 3, 0.25, R_SNOW); }
      lastStep = P.step;
    }
    if (st === CHARGE) {                                                 // 暖色光点从四周螺旋收拢到灯上
      chargeAcc += dt * (14 + 22 * clamp01(stT / 1.0));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (st === CHARGE || st === CAST || st === RECOVER) {                // 天上下雪
      snowAcc += dt * 12;
      while (snowAcc >= 1) { snowAcc -= 1; spawnX(K_EMBER, HX - 34 + Math.random() * 100, 4 + Math.random() * 44, (Math.random() - 0.5) * 4, 5 + Math.random() * 5, 1.6 + Math.random() * 0.8, R_SNOW, { age0: 0.18 }); }
    }
    if (swT < 0.45) {                                                    // 光圈扫过的雪花被照成金色
      litAcc += dt * 70; const r = 3 + SW_V * swT, cx = wx(0);
      while (litAcc >= 1) { litAcc -= 1; const a = Math.PI + Math.random() * Math.PI, x = cx + Math.cos(a) * r * (0.9 + Math.random() * 0.1), y = HY - 8 + Math.sin(a) * r * 0.45; if (y > 3 && x > -2 && x < 130) spawnX(K_EMBER, x, y, (Math.random() - 0.5) * 4, 3 + Math.random() * 4, 0.9 + Math.random() * 0.6, R_EL, { age0: 0.1 }); }
    }
    if (cacheT < 1.0) { cacheAcc += dt * 18; while (cacheAcc >= 1) { cacheAcc -= 1; spawn(K_RISE, DUMMY_X - 7 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 4, -12 - Math.random() * 12, 0.6 + Math.random() * 0.5, R_EL); } }
    if ((st === IDLE && P.gem !== 4) || st === RECOVER) {               // 灯顶偶尔飘出一颗火星
      emberAcc += dt * (st === IDLE ? 1.4 : 6);
      while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 4, Math.random() * 4 - 2, -6 - Math.random() * 5, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (st === DEATH) {
      if (smokeT < 0.45) { riseAcc += dt * 9; while (riseAcc >= 1) { riseAcc -= 1; spawn(K_RISE, gx + (Math.random() - 0.5) * 2, gy - 4, (Math.random() - 0.5) * 3, -7 - Math.random() * 5, 0.8, FXI.dust); } }   // 灯灭：一缕灰烟
      if (stT > T_FADE && stT < T_GONE) {                                 // 从脚往上化成雪花，沿消散前沿往上飘
        const q = clamp01((stT - T_FADE) / (T_GONE - T_FADE)); riseAcc += dt * 34;
        while (riseAcc >= 1) { riseAcc -= 1; spawn(K_RISE, wx(P.bx - 4 + Math.random() * 9), HY - 1 - q * 19 - Math.random() * 3, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.9 + Math.random() * 0.7, R_SNOW); }
      }
    }
    coneT += dt; atkT += dt; swT += dt; castT += dt; cacheT += dt; smokeT += dt; for (let i = 0; i < FPN; i++) fpA[i] += dt;
  }
  function fxReset() { coneT = 9; atkT = 9; swT = 9; castT = 9; cacheT = 9; smokeT = 9; chargeAcc = 0; snowAcc = 0; litAcc = 0; cacheAcc = 0; emberAcc = 0; riseAcc = 0; lastStep = 0; fpA.fill(9); fpI = 0; }
  // 光圈：地面上透视压扁的椭圆（后半圈 half 0 画在角色后面，前半圈 half 1 画在前面），前沿亮、里面一圈隔点
  function sweep(half, f12) {
    const r = 3 + SW_V * swT, ry = Math.max(1, r * 0.2), cx = wx(0), n = Math.ceil(r * 4);
    const c0 = swT < 1 / 12 ? EL[0] : swT < 0.25 ? EL[1] : swT < 0.42 ? EL[2] : EL[3], c1 = swT < 0.25 ? EL[2] : EL[3];
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.2832, s = Math.sin(a); if (half === 0 ? s > 0 : s <= 0) continue;
      if (swT > 0.3 && ((k + f12) & 1)) continue;
      put(RD(cx + Math.cos(a) * r), RD(FLOOR + s * ry), c0);
      if ((k & 1) === 0) put(RD(cx + Math.cos(a) * r * 0.82), RD(FLOOR + s * ry * 0.82), c1);
    }
  }
  function fxBack(f12) {
    const lit = !P.lfree && P.gem !== 4 && P.dq < 1;
    if (lit && P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12);
    else if (lit) { const x = wx(P.gx), hw = P.gem === 5 ? 2 : 3 + (P.flk === 3 ? 1 : 0); for (let dx = -hw; dx <= hw; dx++) { const a = Math.abs(dx); if (a <= 1) put(x + dx, FLOOR, EL[3]); else if (((x + dx) & 1) === 0) put(x + dx, FLOOR, EL[4]); } }   // 灯下一小片暖光
    for (let i = 0; i < FPN; i++) { const a = fpA[i]; if (a >= 1.1) continue; const x = RD(fpX[i]), c = printC(a); put(x, FLOOR, c); put(x + fpD[i], FLOOR, c); if (a < 0.4) put(x, FLOOR + 1, EL[3]); }   // 移动的脚印
    if (atkT < 0.75) {                                                   // 攻击：暖光团经过的地方，脚印一个接一个亮起
      const x1 = DUMMY_X - 6;
      for (let x = ax0 + 2, j = 0; x <= x1; x += 5, j++) { const a = atkT - (x - ax0) / SPD; if (a < 0 || a >= 0.55) continue; const c = printC(a * 2); put(x, FLOOR, c); put(x + 1, FLOOR, c); if (j & 1) put(x, FLOOR + 1, c); }
    }
    if (swT < SW_END) sweep(0, f12);
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy), d = P.flip ? -1 : 1;
    if ((P.gem === 2 || P.gem === 3) && !P.lfree && P.dq < 1) {          // 灯芒：2 档短十字，3 档 8 向长光芒
      const L = P.gem === 3 ? 7 : 4 + (f12 & 1);
      for (let r = 4; r <= L; r++) { const c = r <= 4 ? EL[0] : r <= 5 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r - 1, c); put(gx, gy + r + 2, c); }
      if (P.gem === 3) for (let r = 3; r <= 5; r++) { const c = r <= 3 ? EL[1] : EL[2]; put(gx + r, gy - r, c); put(gx - r, gy - r, c); put(gx + r, gy + r, c); put(gx - r, gy + r, c); }
    }
    if (E.state === CHARGE && E.stT > 0.7 && P.dq < 1) {                 // 光在往里聚：灯外一圈虚线光环 8 → 4 格
      const q = clamp01((E.stT - 0.7) / 0.7), r = 8 - 4 * q, n = 16;
      for (let k = 0; k < n; k++) { if ((k + f12) & 1) continue; const a = k / n * 6.2832 + E.stT * 3; put(RD(gx + Math.cos(a) * r), RD(gy + Math.sin(a) * r), q > 0.6 ? EL[1] : EL[2]); }
    }
    if (coneT < 3 / 12) {                                                // 攻击光锥：往前下方张开 14 格，第 1 帧实心、之后隔点变暗
      const late = coneT >= 1 / 12;
      for (let k = 1; k <= 14; k++) {
        const cy = gy + k * 0.3, h = RD(k * 0.38);
        for (let j = -h; j <= h; j++) { if (late && ((k + j + f12) & 1)) continue; const edge = Math.abs(j) === h && h > 0, c = late ? (edge ? EL[3] : EL[2]) : edge ? EL[2] : k < 5 ? EL[0] : EL[1]; put(gx + d * (3 + k), RD(cy + j), c); }
      }
    }
    if (swT < SW_END) sweep(1, f12);
  }
  function drawShot(k, x, y, d, f12) {                                   // 暖光团：2 格白芯 + 淡金十字 + 琥珀外沿（外沿隔帧闪）
    if (k !== 1) return false;
    put(x, y, EL[0]); put(x + d, y, EL[0]); put(x - d, y, EL[1]); put(x + 2 * d, y, EL[1]);
    put(x, y - 1, EL[1]); put(x + d, y - 1, EL[1]); put(x, y + 1, EL[1]); put(x + d, y + 1, EL[1]);
    if (f12 & 1) { put(x - 2 * d, y, EL[2]); put(x, y - 2, EL[2]); put(x + d, y + 2, EL[2]); } else { put(x + d, y - 2, EL[2]); put(x, y + 2, EL[2]); }
    return true;
  }
  const SHEET = [[IDLE, [0, 0.4, 0.8, 1.2, 1.4, 1.5, 1.8, 1.95]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
    [DEATH, [0.34, 0.6, 0.8, 0.95, 1.05, 1.25, 1.45, 1.65, 1.75, 1.85, 1.95, 2.05, 2.2, 2.7]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]];

  return {
    name: '迷路的孩子', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glass, M.flame], HIT_POINT: [1, -11], EVENTS, SHEET,
    REVIVE: { dy: -11, ramp: R_SNOW },
    // 音色：雪地上的小碎步（很轻）+ 提灯一声软软的铃响，重量 0.15；受击 / 死亡按幽灵（她也许是个幽灵）、化雪消散
    SFX: { body: 'ghost', how: 'dissolve', pal: 'holy', style: 'nova', w: 0.15 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
