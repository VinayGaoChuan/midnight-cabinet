// 天界法师（部队 · 科技 · 法师 · 稀有 · 远程 680）：见习法师走「超远程狙击」路线长大的样子——瘦高档（约 30 格，线圈塔顶到 34），
// 背上的法力罐长成一座三层特斯拉线圈塔（三只铜线圈由下往上变小，塔顶避雷针高出头 6 格），头顶悬浮一圈黄铜浑天仪环（两道交叉圆环 + 中心小星），
// 学徒的圆护目镜推到额上、眼前换成一片带十字准星的单片目镜；双手端平一支 20 格的狙击长杖（黄铜枪管 + 三道线圈环 + 枪口晶体），软管仍从杖尾接回背塔。
// 攻击 = 端平长杖瞄准 1 帧，枪口喷出一颗细长电弹，后坐退 1 格；技能 = 特性「闪电打击」：长杖枪口斜指天空引雷（天顶三道细雷劈进枪口）、
// 线圈塔由下往上逐个亮起、避雷针和浑天仪之间跳电弧，目标和另外 4 个落点依次被准星锁定 → 压下长杖，2 格宽的直线电轨贯穿目标，
// 再沿双股折线闪电依次跳向 4 个落点（闪电锁链，5 跳），每个落点天顶补劈一道细雷 + 冲击环 → 锁链余电虚线闪几下熄灭。
// 死亡 = 跪倒：线圈过载冒电火花 → 拄着长杖单膝跪下 → 长杖滑脱侧倒、浑天仪环落地弹开滚走、线圈熄灭 → 自上而下消散。升级自见习法师（MageApprentice.js）。
PCD.define('CelestialMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx, FLOOR } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：天雷 · 电光（bolt 色阶为主），星点点缀 magic 青 ─────
  const R_EL = FXI.bolt, EL = FXR[R_EL], MG = FXR[FXI.magic];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'pale', band: 2 }, trim: 'sky', brass: 'gold', skin: 'skin', hair: 'white', boot: 'boot', belt: 'leather', box: 'iron',
    hose: 'iron', ink: { r: 'ink', flat: 1 }, rimI: 'iron', lens: { r: [27, 41, 22, 21], flat: 1 },
    coil: { r: [20, 19, 32, 33] },                                    // 铜线圈（比黄铜偏红）
    coilLit: { r: [23, 22, 51, 21], flat: 1 },                        // 通电的线圈（发光）
    crys: { r: [40, 23, 22, 51], flat: 1 }, glow: { r: [51, 51, 21, 21], flat: 1 },   // 枪口晶体（发光体，5 档）
  });
  const BODY = { body: 'slim', leg: 12, torso: 10, head: 6, headW: 6, arm: 10, stride: 4 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 52, 46, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'hose', 'ink', 'lens', 'coilLit', 'crys', 'glow', 'hair', 'rimI', 'box']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握枪管前段（hx, hy），长杖沿 a 方向（0 = 水平朝右，正 = 枪口上抬）；后手自动放在握点后 7 格 ─────
  // coil 线圈亮起数 0–3 · ring 浑天仪相位 0–3 · mono 单片目镜 0 翻起 / 1 翻下 · sf 长杖 0 端持 / 1 拄地 / 2 掉在地上
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, coil: 0, ring: 0, mono: 0, sf: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const A1 = Math.atan(0.25), A2 = Math.atan(0.5);
  const K_IDLE = K(9, -17, -A1);                                   // 端杖：枪口略向下
  const K_AIM = K(10, -19, 0, 1);                                  // 瞄准：端平
  const K_FIRE = K(9, -19, A1, 1);                                 // 出膛：枪口上跳
  const K_HOLD = K(9, -18, 0, 0);
  const K_CHARGE = K(10, -19, 0, 1, 0, 1);                         // 蓄力末：半蹲 1 格、压下长杖端平锁定
  const K_SKY = K(8, -21, Math.PI / 4, 0, -1, 1);                  // 蓄力：枪口斜指天空引雷
  const K_CAST = K(8, -19, A1, 0, 0, 1);
  const K_HURT = K(7, -15, -A2, -1, -1);
  const K_KNEEL = K(6, -12, Math.PI / 2, 1, 1, 5);                 // 拄杖单膝跪
  const K_SLUMP = K(4, -6, Math.PI / 2, 2, 1, 5);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 20], ['hy', -32, 5], ['a', -32, 32, 1 / ASTEP], ['bhx', -20, 16], ['bhy', -32, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['coil', 0, 3], ['ring', 0, 3], ['mono', 0, 1], ['sf', 0, 2]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1], T_FIRE = 2 / 12, T_NET = 1 / 12, T_KNEE = INCOMING + 0.3, T_DROP = INCOMING + 0.66;
  // 待机个性（1.5–2.1 s，7 帧）：翻下单片目镜 → 端杖向远处缓慢扫一圈（枪口抬起再压下）→ 目镜翻回；浑天仪环跟着转半圈
  const PERS = [[1, 0], [1, A1], [1, A2], [1, A2], [1, A1], [1, 0], [0, -A1]];
  const SNAP = [0, A1, A2, Math.PI / 4, Math.PI / 2];
  const snapA = (a) => { const s = Math.sign(a), v = Math.abs(a); let b = 0; for (const c of SNAP) if (Math.abs(v - c) < Math.abs(v - b)) b = c; return s * b; };
  const MUZ = 9, BUTT = 11, BACK = 7;
  const dir = (a) => [Math.cos(a), -Math.sin(a)];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.coil = 0; P.ring = 0; P.mono = 0; P.sf = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.ring = Math.floor(TT * 1.25 + 1e-6) & 1 ? 2 : 0;
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 2.1) { const i = Math.floor((lp - 1.5) * 12 + 1e-6), c = PERS[Math.min(6, i)]; P.mono = c[0]; P.a = c[1]; P.ring = Math.min(3, i >> 1); P.head = i >= 2 && i <= 4 ? 1 : 0; P.glint = i === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 大步迈步：上身不晃、长杖端平，长袍下摆后摆
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = 0; P.a = 0; P.bend = [2, 1, 2, 1][f]; P.ring = f;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_AIM, ease.out(tq / 0.12)); P.mono = 1; P.gem = 1; }
      else if (tq < 0.25) { setK(K_FIRE, K_FIRE, 0); P.bx = -1; P.mono = 1; P.gem = 2; P.rim = 2; P.bend = 2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_FIRE, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.mono = 1; P.gem = 1; P.bend = 1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.mono = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 枪口指天引雷、线圈由下往上逐个亮起；1.15 s 起压下长杖、翻下目镜锁定
      const q = ease.inOut(clamp01(tq / 0.6));
      if (tq < 1.15) setK(K_IDLE, K_SKY, q); else setK(K_SKY, K_CHARGE, ease.inOut(clamp01((tq - 1.15) / 0.2)));
      P.mono = tq < 1.1 ? 0 : 1;
      P.coil = tq < 0.3 ? 0 : tq < 0.6 ? 1 : tq < 0.9 ? 2 : 3; P.ring = f12 & 3; P.bend = 1 + RD(q); P.sway = q > 0.9 && (f12 & 1) ? -1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                            // 电轨出膛：后坐 2 格定格 2 帧
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.mono = 1; P.coil = 3; P.ring = f12 & 3; P.gem = 3; P.rim = 3; P.bend = 3; P.sway = -1; P.bx = tq < 2 / 12 ? -2 : -1;
    } else if (st === RECOVER) {                                         // 线圈从上往下熄灭
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.mono = q < 0.7 ? 1 : 0; P.bx = q < 0.3 ? -1 : 0;
      P.coil = q < 0.2 ? 3 : q < 0.45 ? 2 : q < 0.7 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bend = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.bend = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.ring = 3; P.coil = (f12 & 1) ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.bend = 2; P.rim = 0; P.ring = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 跪倒：过载冒火花 → 拄杖单膝跪 → 长杖滑脱侧倒、浑天仪环滚走
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.bend = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.coil = (f12 & 1) ? 3 : 1; P.gem = (f12 & 1) ? 2 : 0; }
      else if (d < 0.66) { setK(K_KNEEL, K_KNEEL, 0); P.sf = 1; P.bx = -2; P.eyes = 1; P.coil = (f12 % 3) === 0 ? 2 : 0; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_SLUMP, K_SLUMP, 0); P.sf = 2; P.bx = -2; P.eyes = 1; P.gem = 4;
        const hq = clamp01((d - 0.66) / 0.5); P.hatX = RD(16 * hq); P.hatY = RD(Math.abs(Math.sin(hq * Math.PI * 2)) * 4 * (1 - hq * 0.6)); P.ring = Math.floor(hq * 6 + 1e-6) & 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + (P.crouch >= 4 ? 0 : yo); P.a = snapA(P.a);
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.sf === 0) { const u = dir(P.a); P.bhx = RD(P.hx - u[0] * BACK); P.bhy = RD(P.hy - u[1] * BACK); }
    else if (P.sf === 1) { P.bhx = P.hx; P.bhy = P.hy + 3; }
    else { P.bhx = P.hx - 3; P.bhy = P.hy + 1; }
    if (P.sf === 2) { P.gx = 22 + P.bx; P.gy = -1; }
    else if (P.sf === 1) { P.gx = P.hx + 1 + P.bx; P.gy = P.hy - 9; }
    else { const u = dir(P.a); P.gx = RD(P.hx + u[0] * (MUZ + 1)) + P.bx; P.gy = RD(P.hy + u[1] * (MUZ + 1)); }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：teslaTower —— 背负的三层特斯拉线圈塔：铆钉铁盒底座 + 中轴铜杆 + 三只由下往上变小的线圈（宽 7 / 5 / 3，两行：上行亮沿、下行暗沿；
  //   通电 coil 节由下往上换发光材质）+ 塔顶避雷针和小球。返回 { cx, ys: [三只线圈的行], top, box: [x0, y0, x1, y1] }
  function towerBox(R) { const e = parts.edges(R, R.yS + 2), x1 = e[0] - 2, x0 = x1 - 4; return { x0, x1, y0: R.yS + 1, y1: R.yWaist + 1, cx: x0 + 2, ys: [R.yS - 2, R.yS - 6, R.yS - 9], top: R.htop - 6 }; }
  function teslaTower(R) {
    const B = towerBox(R);
    E.part();
    parts.rect(E, R, B.x0, B.y0, 5, B.y1 - B.y0 + 1, M.box, 0);
    for (const y of [B.y0 + 1, B.y1 - 1]) { PX(E, R, B.x0 + 1, y, M.brass, 4); PX(E, R, B.x1 - 1, y, M.brass, 3); }
    parts.run(E, R, B.y0 + 3, B.x0, B.x1, M.box, 2); PX(E, R, B.x0 + 2, B.y1 - 2, M.coilLit, P.coil ? 4 : 1);   // 盒身接缝 + 指示灯
    for (let y = B.y0 - 1; y > B.top; y--) PX(E, R, B.cx, y, M.brass, y < B.ys[2] ? 4 : 0);                       // 中轴 + 避雷针
    PX(E, R, B.cx, B.top, M.brass, 4); PX(E, R, B.cx, B.top - 1, M.brass, 3);
    E.part();
    const W = [3, 2, 1];
    for (let i = 0; i < 3; i++) {
      const y = B.ys[i], w = W[i], lit = i < P.coil, m = lit ? M.coilLit : M.coil;
      parts.run(E, R, y, B.cx - w, B.cx + w, m, lit ? 4 : 0); parts.run(E, R, y + 1, B.cx - w, B.cx + w, m, lit ? 3 : 2);
      PX(E, R, B.cx - w - (i === 0 ? 1 : 0), y, m, lit ? 3 : 4);
    }
    return B;
  }
  // 候选部件：snipeStaff —— 狙击长杖：沿 a 吸附方向的 1 格黄铜枪管（杖尾到枪口 20 格）+ 三道 3 格线圈环 + 枪口 2×2 晶体（发光体单独一个部件）
  //   T 落笔变换；free 时整根躺在地上
  function snipeStaff(T, gx, gy, a) {
    const u = dir(a), nx = -u[1], ny = u[0];
    E.part();
    parts.line(E, T, gx - u[0] * BUTT, gy - u[1] * BUTT, gx + u[0] * (MUZ - 1), gy + u[1] * (MUZ - 1), M.brass, 3);
    PX(E, T, gx - u[0] * BUTT, gy - u[1] * BUTT, M.box, 0); PX(E, T, gx - u[0] * (BUTT - 1) + nx, gy - u[1] * (BUTT - 1) + ny, M.box, 0);   // 杖托
    for (const d of [-4, 2, 5]) for (let k = -1; k <= 1; k++) PX(E, T, gx + u[0] * d + nx * k, gy + u[1] * d + ny * k, M.coil, k < 0 ? 4 : k > 0 ? 2 : 3);
    E.part();
    const cx = gx + u[0] * MUZ, cy = gy + u[1] * MUZ, lv = [2, 3, 4, 5, 1][P.gem];
    const tone = (k) => { const v = lv - k; if (lv === 1) return [M.crys, 1]; return v >= 4 ? [M.glow, v >= 5 ? 3 : 1] : [M.crys, Math.max(1, v)]; };
    let m = tone(0); PX(E, T, cx, cy, m[0], m[1]); m = tone(1); PX(E, T, cx + u[0], cy + u[1], m[0], m[1]);
    m = tone(1); PX(E, T, cx + nx, cy + ny, m[0], m[1]); m = tone(2); PX(E, T, cx + u[0] + nx, cy + u[1] + ny, m[0], m[1]);
    m = tone(0); PX(E, T, cx + u[0] * 2, cy + u[1] * 2 + (Math.abs(u[1]) < 0.5 ? 0 : 0), m[0], m[1]);
    if (P.glint) PX(E, T, cx + u[0] * 2 - nx, cy + u[1] * 2 - ny, M.glow, 3);
  }
  // 杖尾软管：从杖托弯回塔底（背后弧出 2 格）
  function staffHose(R, B, x2, y2) {
    E.part(); const x0 = B.x0 + 1, y0 = B.y1 + 1, x1 = B.x0 - 3, y1 = B.y1 + 5; let lx = 1e9, ly = 1e9;
    for (let s = 0; s <= 20; s++) { const q = s / 20, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q, X = RD(a * x0 + b * x1 + c * x2), Y = RD(a * y0 + b * y1 + c * y2); if (X === lx && Y === ly) continue; lx = X; ly = Y; PX(E, R, X, Y, M.hose, 0); }
  }
  // 候选部件：armillaryHalo —— 头顶悬浮的浑天仪：一道横向椭圆环（宽 11、高 3）+ 一道竖环（随 ring 相位左右移，看起来在转）+ 中心小星；
  //   at 给出时掉在地上压扁成一条横环
  function armillary(T, cx, cy, flat) {
    E.part();
    if (flat) { parts.run(E, T, cy, cx - 4, cx + 4, M.brass, 0); parts.run(E, T, cy - 1, cx - 3, cx + 3, M.brass, 2); PX(E, T, cx - 4 + (P.ring * 2), cy - 1, M.brass, 4); return; }
    const hr = [[-5, 0], [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1], [5, 0], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [-1, 1], [-2, 1], [-3, 1], [-4, 1]];
    for (let i = 0; i < hr.length; i++) PX(E, T, cx + hr[i][0], cy + hr[i][1], M.brass, hr[i][1] < 0 ? (i === 3 + P.ring * 2 ? 4 : 3) : 2);
    const vx = cx + [-2, 0, 2, 0][P.ring], vw = P.ring & 1 ? 2 : 1;
    for (let y = cy - 2; y <= cy + 2; y++) { const e = Math.abs(y - cy) === 2 ? 0 : vw; PX(E, T, vx - e, y, M.brass, 3); if (e) PX(E, T, vx + e, y, M.brass, 2); }
    PX(E, T, cx, cy, M.glow, 3); PX(E, T, cx, cy - 1, M.crys, 3);
  }
  // 候选部件：monocle —— 带十字准星的单片目镜（3×3 黄铜框，镜心按蓄力发光；mono 0 = 翻起贴在眉上）+ 推到额上的学徒护目镜
  function eyeGear(R) {
    const x1 = R.hx1, top = R.htop, ey = R.ey;
    E.part();
    PX(E, R, x1 - 3, top, M.rimI, 0); parts.run(E, R, top - 1, x1 - 2, x1, M.rimI, 0); PX(E, R, x1 - 1, top, M.lens, 3); PX(E, R, x1, top, M.rimI, 2); PX(E, R, x1 - 2, top, M.lens, 4);
    if (P.mono) {
      parts.run(E, R, ey - 1, x1 - 1, x1 + 1, M.brass, 0); PX(E, R, x1 - 1, ey, M.brass, 0); PX(E, R, x1 + 1, ey, M.brass, 2); parts.run(E, R, ey + 1, x1 - 1, x1 + 1, M.brass, 2);
      PX(E, R, x1, ey, M.lens, P.gem >= 2 ? 4 : 3); PX(E, R, x1 - 1, ey + 2, M.brass, 3); PX(E, R, x1 - 2, ey + 3, M.brass, 2);
    } else { parts.run(E, R, ey - 2, x1, x1 + 2, M.brass, 3); PX(E, R, x1 + 2, ey - 3, M.lens, 3); }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), F = parts.FREE;
    const B = teslaTower(R);
    if (P.sf === 0) { const u = dir(P.a); staffHose(R, B, P.hx - u[0] * BUTT, P.hy - u[1] * BUTT); }
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.robeD, cuff: M.trimD, hand: M.skinD, grip: P.sf === 0 ? 'none' : 'fist' });
    parts.legs(E, R, P, { style: 'boot', mat: M.robeD, matD: M.robeD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.belt, buckle: M.brass, collar: M.trim, emblem: M.trim, emblemStyle: 'diamond' });
    starDots(R);
    parts.head(E, R, P, { mat: M.skin, face: 'long', eye: M.ink, eyeStyle: 'narrow', brow: M.hair, nose: 'long', mouth: 'line', ear: 'dot' });
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
    eyeGear(R);
    if (P.sf !== 2) armillary(R, R.hx + 1, R.htop - 6, 0);
    if (P.sf === 0) snipeStaff(R, P.hx, P.hy, P.a);
    else if (P.sf === 1) snipeStaff(R, P.hx + 1, P.hy, Math.PI / 2);
    if (P.sf === 0) parts.hand(E, R, P, { side: 'B', hand: M.skin });
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.robe, cuff: M.trim, hand: M.skin });
    if (P.sf === 2) { snipeStaff(F, 10 + P.bx * 0, -1, 0); armillary(F, 25 + RD(P.hatX * 0.6), -1 - P.hatY, 1); }
  }
  // 长袍上的星点纹（天青，和躯干同一部件会被当成装饰；单独画成小点，不压分界线：直接写进躯干之后的同一 part）
  function starDots(R) {
    const pts = [[-2, 6], [1, 9], [-1, 13], [2, 16], [-3, 18]];
    for (const [x, dy] of pts) { const y = R.yS + dy; if (y > -2) continue; const e = parts.edges(R, Math.min(y, R.yHip)); if (x + 0 < e[0] - 2 || x > e[1] + 2) continue; PX(E, R, x + R.lean, y, M.trim, 4); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, railT = 9, rkX = 0, rkY = 0, emberAcc = 0, soulAcc = 0, sparkAcc = 0, lastStep = 0, lastCoil = 0;
  // 闪电锁链的 5 个落点（屏幕坐标，全在画面内 x 68–122、相邻至少隔 12 格；和见习法师同一套）：
  //   假人 → 右后（122）→ 右前低位（110）→ 从假人草袋下面贴地横穿到左前低位（84）→ 施法者和假人之间（68），顺时针绕假人一圈
  const NODES = [[DUMMY_X, HY - 14], [DUMMY_X + 24, HY - 13], [DUMMY_X + 12, HY - 5], [DUMMY_X - 14, HY - 5], [DUMMY_X - 30, HY - 10]];
  const nodeT = new Float32Array(5).fill(9), MARK_T = [0.35, 0.55, 0.75, 0.95, 1.1];   // 蓄力中各落点被锁定的时刻
  const wx = (x) => scrX(x), wy = (y) => HY + y, TY = HY - 14;
  function towerW() { const B = towerBox(parts.rig(P, BODY)); return { cx: wx(B.cx + P.bx), ys: B.ys.map(wy), top: wy(B.top) }; }
  function onEnter(s) {
    if (s === RECOVER) { for (let i = 1; i < 5; i++) fx.link(NODES[i - 1][0], NODES[i - 1][1], NODES[i][0], NODES[i][1], R_EL, 0.2 + i * 0.12, 1); return; }   // 锁链余电虚线：按跳的顺序逐段熄灭
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(40, 90, 0.25, 0.5);
    fx.beam(gx + 1, gy, DUMMY_X, TY, 2, R_EL, 0.3, 2);                  // 直线电轨：第 1 帧全白，之后从枪口端断开
    railT = 0; mzT = 0; mzX = gx; mzY = gy; rkX = DUMMY_X; rkY = TY;
    burst(gx, gy, 14, 40, 100, 0.15, 0.4, R_EL, 6); fx.cross(gx, gy, 5, R_EL, 0.2);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'bullet' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy);
      shoot(1, mzX + 2, mzY, 280, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.05, 0.12], back: [20, 40], off: 4 } });
      burst(mzX, mzY, 5, 25, 60, 0.1, 0.22, R_EL, 0);
      sfx('swing', { kind: 'gun', w: 0.3 }); sfx('shoot', { proj: 'bullet' });
    }
    if (s === CAST && t === T_NET) {                                     // 命中：折线电网（6 条分叉）+ 天顶细落雷 + 冲击环
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.4, L = 9 + (i & 1) * 4; fx.bolt(rkX, rkY, rkX + Math.cos(a) * L, rkY + Math.sin(a) * L * 0.8, R_EL, 0.35, 2, 3 + i * 5); }
      fx.bolt(rkX + 2, 4, rkX, rkY - 2, R_EL, 0.3, 2, 11); fx.pillar(rkX, 4, rkY - 4, 1, R_EL, 0.2, 1);
      ring(rkX, rkY, 1, R_EL); burst(rkX, rkY, 30, 50, 130, 0.25, 0.6, R_EL, 10); burst(rkX, rkY, 6, 20, 50, 0.3, 0.6, FXI.magic, 6);
      hitDummy(1); dummyFx({ dur: 0.6, outline: R_EL }); nodeT[0] = 0; shake(0.12, 1); sfx('impact', { pal: 'bolt', w: 0.7 });
    }
    if (s === CAST) {                                                    // 锁链再跳 4 次：双股折线闪电 + 天顶补劈细雷 + 小冲击环（5 个落点都在画面内，每跳都有）
      const i = T_HOP.indexOf(t) + 1;
      if (i > 0) {
        const [x0, y0] = NODES[i - 1], [x, y] = NODES[i];
        fx.bolt(x0, y0, x, y, R_EL, 0.35, 2, 9 + i * 7); fx.bolt(x0, y0 - 1, x, y + 1, R_EL, 0.25, 2, 40 + i * 13);
        if (x < 128) { fx.bolt(x + 2, 4, x, y - 2, R_EL, 0.15, 2, 23 + i * 5); ring(x, y, 0, R_EL); burst(x, y, 12, 35, 90, 0.15, 0.35, R_EL, 5); burst(x, y, 3, 15, 40, 0.3, 0.5, FXI.magic, 4); fx.cross(x, y, 4, R_EL, 0.2); }
        nodeT[i] = 0; sfx('impact', { pal: 'bolt', w: 0.6 - i * 0.05 });
      }
    }
    if (s === CHARGE) {                                                  // 引雷：天顶细雷劈进枪口
      const k = T_SKY.indexOf(t), gx = wx(P.gx), gy = wy(P.gy);
      if (k >= 0) { fx.bolt(gx + 6 - k * 5, 2, gx, gy - 1, R_EL, 0.16, 2, 31 + k * 9); burst(gx, gy, 6 + k * 2, 20, 55, 0.1, 0.25, R_EL, 2); shake(0.06, 1); }
    }
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX + 2 + Math.random() * 6, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && t === T_DROP) {
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX + 2 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
  }
  const T_SKY = [0.7, 0.9, 1.05], T_HOP = [2 / 12, 3 / 12, 4 / 12, 5 / 12];
  const EVENTS = [[], [], [T_FIRE], T_SKY, [T_NET, ...T_HOP], [], [], [T_KNEE, T_DROP], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.1, 0.28, R_EL, 6); fx.cross(x, y, 3, R_EL, 0.12); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {
      if (P.coil !== lastCoil) { if (P.coil > lastCoil) { const T = towerW(), y = T.ys[P.coil - 1]; burst(T.cx, y, 6, 20, 50, 0.15, 0.3, R_EL, 6); } lastCoil = P.coil; }
      if (stT > 0.5) { emberAcc += dt * 16; while (emberAcc >= 1) { emberAcc -= 1; const r = 5 + Math.random() * 5, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 2.5) / (0.25 + Math.random() * 0.25), 0, 9, R_EL, a, r, 6 + Math.random() * 3); } }
    } else lastCoil = 0;
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 6 : -5), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === RECOVER && stT < 0.5) { sparkAcc += dt * 14; while (sparkAcc >= 1) { sparkAcc -= 1; const T = towerW(); spawnX(K_PHYS, T.cx + (Math.random() - 0.5) * 6, T.ys[(Math.random() * 3) | 0], (Math.random() - 0.5) * 20, -10 - Math.random() * 10, 0.5 + Math.random() * 0.3, R_EL, { g: 160, floor: HY - 1 }); } }   // 余电火星掉落
    if (state === DEATH && stT > INCOMING && stT < T_DROP) { sparkAcc += dt * 20; while (sparkAcc >= 1) { sparkAcc -= 1; const T = towerW(); spawnX(K_PHYS, T.cx + (Math.random() - 0.5) * 6, T.ys[(Math.random() * 3) | 0], (Math.random() - 0.5) * 40, -20 - Math.random() * 20, 0.4 + Math.random() * 0.3, R_EL, { g: 200, floor: HY - 1 }); } }   // 线圈过载
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 18, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; railT += dt; for (let i = 0; i < 5; i++) nodeT[i] += dt;
  }
  function fxReset() { mzT = 9; railT = 9; emberAcc = 0; soulAcc = 0; sparkAcc = 0; lastStep = 0; lastCoil = 0; nodeT.fill(9); }
  function fxBack(f12) {
    if (P.sf !== 2 && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    for (let i = 0; i < 5; i++) {                                        // 落点地面焦痕：7 格，亮 → 暗，后半段断续（比见习法师宽）
      const a = nodeT[i]; if (a >= 1) continue; const x = NODES[i][0], c = a < 1 / 12 ? EL[0] : a < 0.3 ? EL[1] : a < 0.6 ? EL[2] : EL[3];
      for (let k = -3; k <= 3; k++) { if (a > 0.45 && ((k + f12) & 1)) continue; put(x + k, FLOOR, Math.abs(k) >= 2 ? EL[Math.min(4, 2 + (a > 0.3 ? 1 : 0) + (Math.abs(k) === 3 ? 1 : 0))] : c); }
    }
  }
  // 电击竖线：落点 → 地面的 1 格折线（每 2 行左右错 1 格），3 帧：白 → 淡黄 → 断续电青
  function spike(x, y0, a, f12) {
    const c = a < 1 / 12 ? EL[0] : a < 2 / 12 ? EL[1] : EL[2];
    for (let y = y0, k = 0; y < FLOOR; y++, k++) { if (a >= 2 / 12 && ((k + f12) & 1)) continue; put(x + ((((k >> 1) + f12) & 1) ? 1 : 0), y, c); }
  }
  // 小锁定框：四角各 3 格的括号（半径 3）；x > 126 的落点在右边缘画朝外的箭头（现在 5 个落点都在画面内，不会触发）
  function mark(x, y, c) {
    if (x > 126) { put(126, y, c); put(125, y - 1, c); put(125, y + 1, c); put(124, y - 2, c); put(124, y + 2, c); return; }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { put(x + sx * 3, y + sy * 3, c); put(x + sx * 2, y + sy * 3, c); put(x + sx * 3, y + sy * 2, c); }
  }
  const H = (a, b) => E.hash(a, b);
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy), st = E.state, t = E.stT;
    if (P.coil >= 2 && P.dq < 1 && (st === CHARGE || st === CAST || st === DEATH)) {   // 线圈之间跳电弧：越到后面越密
      const T = towerW(), n = st === CHARGE ? (t > 1.1 ? 3 : 1) : 2;
      for (let k = 0; k < n; k++) {
        const i = (f12 + k) % Math.min(2, P.coil - 1 + 1), y0 = T.ys[i], y1 = T.ys[i + 1] + 1, side = (H(f12, k) < 0.5 ? -1 : 1), w0 = [3, 2, 1][i] + 1;
        let x = T.cx + side * w0; for (let y = y0; y >= y1; y--) { put(x, y, y === y0 || y === y1 ? EL[0] : EL[1]); x += H(f12 * 7 + y, k) < 0.5 ? -side : 0; }
      }
    }
    if (st === CHARGE && P.coil >= 1 && P.dq < 1) {                     // 避雷针顶 → 浑天仪环跳电弧（1 格折线，每帧换形）
      const T = towerW(), R = parts.rig(P, BODY), ax = wx(R.hx + 1 - 5 + P.bx), ay = wy(R.htop - 6);
      if (t > 0.6 && ((f12 & 1) || t > 1.0)) { let x = T.cx, y = T.top; const n = Math.max(1, Math.abs(ax - x)); for (let k = 1; k <= n; k++) { x += Math.sign(ax - T.cx); y = RD(T.top + (ay - T.top) * k / n + (H(f12, k) < 0.5 ? -1 : 0)); put(x, y, k === 1 || k === n ? EL[0] : EL[1]); } }
    }
    if (st === CHARGE) for (let i = 1; i < 5; i++) if (t > MARK_T[i]) mark(NODES[i][0], NODES[i][1], t > 1.2 && (f12 & 1) ? EL[0] : t - MARK_T[i] < 1 / 12 ? EL[0] : EL[2]);   // 其余 4 个落点依次被锁定
    if (st === RECOVER) for (let i = 1; i < 5; i++) if (nodeT[i] <= 0.3) mark(NODES[i][0], NODES[i][1], EL[2]);
    if (st === CAST) for (let i = 1; i < 5; i++) { const h = T_HOP[i - 1]; if (t < h + 0.3) mark(NODES[i][0], NODES[i][1], t >= h && t < h + 1 / 12 ? EL[0] : EL[2]); }   // 锁定框留到这一跳打中后 0.3 s，打中那一帧变白
    for (let i = 1; i < 5; i++) if (nodeT[i] < 0.25) spike(NODES[i][0], NODES[i][1] + 1, nodeT[i], f12);
    if (st === CHARGE && t > 0.35) {                                     // 目标身上的十字准星：四角括号逐帧收紧
      const r = Math.max(3, RD(11 - 8 * clamp01((t - 0.35) / 0.9))), c = t > 1.2 && (f12 & 1) ? EL[0] : EL[1], x = DUMMY_X, y = TY;
      for (let k = 0; k < 3; k++) { put(x - r + k, y - r, c); put(x - r, y - r + k, c); put(x + r - k, y - r, c); put(x + r, y - r + k, c); put(x - r + k, y + r, c); put(x - r, y + r - k, c); put(x + r - k, y + r, c); put(x + r, y + r - k, c); }
      for (let k = 1; k <= r - 2; k++) if (k & 1) { put(x - k, y, EL[2]); put(x + k, y, EL[2]); put(x, y - k, EL[2]); put(x, y + k, EL[2]); }
      put(x, y, EL[0]);
      if (t > 1.3) for (let xx = gx + 3; xx < x - r - 1; xx += 3) put(xx, gy, EL[3]);  // 瞄准虚线（压下长杖端平之后）
    }
    if (P.gem >= 2 && P.gem <= 3 && P.sf === 0 && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 4; r++) put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - 1, c); put(mzX, mzY + 1, c); put(mzX + 1, mzY - 2, EL[2]); put(mzX + 1, mzY + 2, EL[2]); put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d) {
    if (k !== 1) return false;                                           // 细长电弹：1×4 白芯 + 淡黄尾
    put(x + d, y, EL[0]); put(x, y, EL[0]); put(x - d, y, EL[1]); put(x - 2 * d, y, EL[1]); put(x - 3 * d, y, EL[2]); put(x - 4 * d, y, EL[3]);
    return true;
  }

  return {
    name: '天界法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.crys, M.glow, M.coilLit], HIT_POINT: [0, -17], EVENTS,
    SFX: { body: 'flesh', how: 'collapse', pal: 'bolt', style: 'bolt', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
