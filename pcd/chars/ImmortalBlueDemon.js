// 不朽蓝魔（部队 · 不死 · 刺客 · 史诗）：由「水战士」升级——同一个溺尸被深渊魔化。瘦高（约 30 格含角）、腰极细、倒三角、踮脚前倾；
// 水战士的湿海草发变成一大把往后飘的蓝黑长鬃（末端化烟），背鳍长成一排带骨刺的暗蓝鳍，鱼骨刃长成一对正握的鱼骨月牙弯刃（刃口附着暗影，发光体）；
// 另加一对后掠弯角、一条尾尖鳍形的细长魔尾；靛蓝魔皮上的腮裂纹发光，眼睛是两道细长的白蓝光。
// 攻击 = 踮脚前突 6 格，双刃一前一后连续直刺两次（第二刺刃口闪白），命中后借力后跳回原位。
// 技能 = 魔化后的「伏击」：身体从边缘往里逐像素化成暗影剪影（只剩眼光和刃口亮点）→ 原位残影炸散、三个残影依次逼近假人、
//        假人头顶撕开一道横向暗影裂口 → 他头下脚上从裂口落下，双月刃向下插进假人 → 翻身落地，化影解除。
// 死亡 = 化烟：单膝跪下、全身变成暗影剪影，两把月刃「锵」地掉在地上，身体从脚往上化成暗影烟雾飘散，月刃最后才消散。
PCD.define('ImmortalBlueDemon', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, color, B8, copySprite, blitShape, outlineSprite,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_BURST, K_SPIRAL, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PI = Math.PI, HALF = PI / 2, Q8 = PI / 4;

  // ───── 元素：伏击 · 深渊暗影（FXI.shadow：43 淡紫 → 54 → 53 → 52 → 0 墨）─────
  const R_EL = FXI.shadow, EL = FXR[R_EL], R_IMP = FXI.impact, GILL = color('#8aa4ff');
  const M = parts.mats(E, {
    skin: ['#0a0c2a', '#1a2260', '#2e40a0', '#5a78d8'],              // 靛蓝魔皮
    mane: ['#06081a', '#141a3a', '#243060', '#3a4a88'],              // 蓝黑长鬃
    fin: 'blue', bone: 'bone', rag: 'shadow',                        // 暗蓝背鳍 · 角 / 月刃 / 骨刺 · 暗影破布
    glow: { r: [EL[3], GILL, GILL, 21], flat: 1 },                   // 腮纹 / 眼光（发光体）
    edge: { r: [EL[3], EL[1], EL[0], 21], flat: 1 },                 // 月刃刃口附着的暗影（发光体）：2 紫 · 3 淡紫 · 4 白
  });
  const BODY = { body: 'slim', leg: 11, torso: 9, head: 7, headW: 6, sw: 3, arm: 12, lw: 2, stride: 3, lift: 1, waist: 1.6, fall: 'front' }, BODY_FLIP = { ...BODY, fall: 'back' };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(80, 78, 38, 72);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'glow', 'edge']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const GLOWSET = new Uint8Array(256); GLOWSET[M.glow] = GLOWSET[M.edge] = 1;
  const BLADE = { len: 7, bulge: 2.5 };

  // ───── 姿势：前手 = hx / hy / a（前手月刃朝向），后手 = bhx / bhy / ba；刃角 0 朝上、顺时针为正，按 45° 一档 ─────
  // shade 化影档（0–12，12 = 全身剪影）· inv 头下脚上（1 = 从裂口钻出，2 = 插进假人）· smoke 从脚往上化烟 · dropB 月刃已脱手
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, shade: 0, inv: 0, smoke: 0, dropB: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, ba, lean, head, crouch });
  const K_IDLE = K(8, -13, Q8 * 3, 6, -18, Q8, 1, 0, 0);            // 前手月刃往前下斜，后手举在胸前、月刃往前上斜（像一对螳螂钳）
  const K_GLIDE = K(9, -12, Q8 * 3, 6, -17, Q8, 2, 1, 1);           // 滑步：更前倾
  const K_WIND = K(3, -14, HALF, -2, -15, HALF, 0, 0, 1);           // 攻击预兆：双刃收到腰侧
  const K_STAB1 = K(14, -14, Q8 * 3, 3, -15, HALF, 2, 1, 1);        // 第一刺：前手（刃尖往前下）
  const K_STAB2 = K(5, -13, Q8 * 3, 14, -18, Q8, 2, 1, 1);          // 第二刺：后手（刃尖往前上）
  const K_BRACE = K(7, -12, Q8 * 3, 3, -13, Q8 * 3, 2, 1, 3);       // 蓄力：伏低，双刃交叉在身前、刃尖朝下
  const K_DIVE = K(3, -29, 0, 1, -29, 0, 0, 0, 0);                  // 倒立下插（正着画，再上下翻转）：双手举过头顶，刃尖朝上
  const K_HURT = K(4, -16, HALF, -2, -16, 0, -1, -1, 0);
  const K_SAG = K(7, -10, Q8 * 3, 1, -12, Q8 * 3, 2, 1, 5);          // 死亡：单膝跪下去、头垂，双刃刃尖往前下垂
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -4, 4, 1 / Q8], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -4, 4, 1 / Q8], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2]]);
  const KEY2 = parts.keyer([['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['shade', 0, 12], ['inv', 0, 2], ['smoke', 0, 48, 48], ['dropB', 0, 1], ['lying', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], HOP = [2, 3, 2, 1, 0];
  const T_STAB1 = 2 / 12, T_STAB2 = 4 / 12, T_PLUNGE = 4 / 12, T_DROP = INCOMING + 0.45, T_CLANG = INCOMING + 0.6, T_SMOKE = INCOMING + 1.15;
  const MX_DIVE = DUMMY_X - HX - 3, MX_LAND = DUMMY_X - 12 - HX, INV_K = [0, -56, -52];   // inv 档：翻转后「刃尖」落在哪一行

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, fr = RD(tq * 12);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.shade = 0; P.inv = 0; P.smoke = 0; P.dropB = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.2 && lp < 2.2) {        // 待机个性「转刃」：两把月刃在指间各转一圈（每 3 帧换一个朝向，后手晚 1 帧）
        const k = Math.floor((lp - 1.2) * 12 + 1e-6); P.a = K_IDLE.a + HALF * Math.floor(k / 3); P.ba = K_IDLE.ba + HALF * Math.floor(Math.max(0, k - 1) / 3); P.glint = (k % 3) === 0 ? 1 : 0; P.gem = 1;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 贴地滑步：脚几乎不抬，身体平移；长鬃、魔尾往后飘
      setK(K_GLIDE, K_GLIDE, 0); parts.gait(P, E.gait(tq)); P.bob = 0; P.beard = P.beard - 2; P.sway = P.sway;
      P.hx += P.step; P.bhx -= P.step;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.gem = 1; }
      else if (tq < T_STAB2 - 1e-6) { setK(K_STAB1, K_STAB1, 0); P.bx = 6; P.beard = -3; P.sway = -2; P.gem = 2; P.rim = 2; if (fr === 3) P.hx -= 2; }
      else if (tq < 0.42) { setK(K_STAB2, K_STAB2, 0); P.bx = 6; P.beard = -3; P.sway = -2; P.gem = 3; P.rim = 3; P.glint = 1; }
      else { const k = Math.min(4, fr - 5), q = ease.inOut(clamp01((tq - 0.42) / 0.3)); setK(K_STAB2, K_IDLE, q); P.bx = RD(6 * (1 - q)); P.lift = k >= 0 ? HOP[k] : 0; P.beard = 1; P.sway = 1; P.gem = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 从边缘往里化成暗影剪影；化到一半只剩眼光和刃口亮点
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.shade = Math.min(12, RD(tq / 0.75 * 12));
    } else if (st === CAST) {                                          // 本体藏在残影里；第 3 帧从裂口头下脚上钻出，第 4 帧双刃插进假人
      P.gem = 3; P.rim = 0; P.shade = 12; P.beard = -3;
      if (fr < 3) { setK(K_BRACE, K_BRACE, 0); P.dq = 1; }
      else { setK(K_DIVE, K_DIVE, 0); P.mx = MX_DIVE; P.inv = fr < 4 ? 1 : 2; P.beard = 3; P.sway = fr & 1 ? 1 : -1; P.glint = fr === 4 ? 1 : 0; }
    } else if (st === RECOVER) {                                       // 翻身落地（半空横着转半圈）→ 化影从里往外解除 → 后跳回原位
      if (fr < 1) { setK(K_DIVE, K_DIVE, 0); P.mx = MX_DIVE; P.inv = 2; P.shade = 12; P.gem = 2; P.beard = 3; }
      else if (fr < 2) { setK(K_BRACE, K_BRACE, 0); P.mx = MX_LAND + 3; P.lying = 1; P.lift = 12; P.shade = 12; P.gem = 2; P.beard = -1; }
      else { const k = fr - 2, q = clamp01(k / 6); setK(K_BRACE, K_IDLE, ease.inOut(q)); P.mx = RD(MX_LAND * (1 - ease.inOut(clamp01((k - 2) / 4)))); P.lift = [0, 0, 2, 3, 2, 1, 0][Math.min(6, k)];
        P.shade = Math.max(0, 12 - k * 2); P.gem = k < 3 ? 2 : 1; P.beard = k < 4 ? 1 : 0; P.rim = 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 命中 → 佝下去、全身化成暗影剪影 → 月刃脱手落地 → 静止 → 从脚往上化烟
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        const q = ease.out(clamp01((d - 0.2) / 0.3)); setK(K_HURT, K_SAG, q); P.bx = -2; P.eyes = 1; P.beard = 2; P.gem = 4;
        P.shade = Math.min(12, RD((d - 0.2) / 0.3 * 12));
        if (d >= T_DROP - INCOMING - 1e-6) P.dropB = 1;
        if (d >= T_SMOKE - INCOMING) P.smoke = clamp01((d - (T_SMOKE - INCOMING)) / 1.0);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.shade = tq < 0.85 ? 12 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.a = RD(P.a / Q8) * Q8; P.ba = RD(P.ba / Q8) * Q8; while (P.a > PI + 1e-6) P.a -= 2 * PI; while (P.ba > PI + 1e-6) P.ba -= 2 * PI;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.smoke = RD(P.smoke * 48) / 48;
    const f = bladeMid(P.hx, P.hy, P.a); P.gx = f[0] + P.bx; P.gy = P.inv ? INV_K[P.inv] - f[1] : f[1] - P.lift;   // 发光体 = 前手月刃刃口（倒立时按翻转后的行）
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  const bladeMid = (gx, gy, a) => [RD(gx + Math.sin(a) * 5 + Math.cos(a) * 1.5), RD(gy - Math.cos(a) * 5 + Math.sin(a) * 1.5)];

  // ───── 画（部件从后往前）─────
  const rect2 = (R, x0, y0, x1, y1, m) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; parts.rect(E, R, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, 0); } };
  // 候选部件：flowingMane 飘鬃——从后脑往身后上方飘出一大把长鬃（len 格，根部 6 行厚、往后收细），上沿随 P.sway 起伏、下沿参差成几绺；
  //   后四成化成烟：换成 smoke 材质、隔点断开，最后几格只剩零星烟丝。o = { mat, smoke, len }；读 P.beard（< 0 往后拉平、> 0 甩起）P.sway（波浪相位）
  function flowingMane(R, o) {
    const T = R, m = o.mat, sm = o.smoke || m, b = P.beard, x0 = R.hx0, top = R.htop, L = o.len + Math.max(0, -b), ph = P.sway * 0.9;
    const rise = b > 0 ? 0.8 + b * 0.3 : b < 0 ? 0.3 : 0.6;
    E.part();
    for (let y = top; y <= R.hy + 1; y++) parts.px(E, T, x0 - 1, y, m, y & 1 ? 2 : 3);                 // 后脑
    for (let i = 0; i <= L; i++) {
      const q = i / L, x = x0 - 2 - i, wave = RD(Math.sin(q * 4.2 + ph) * 1.3 * q), yT = top - RD(q * 2 * rise) + wave, th = Math.max(2, RD(6 - q * 4.5));
      const smoke = q > 0.6;
      for (let j = 0; j < th; j++) {
        const y = yT + j;
        if (smoke) { if (((x + y) & 1) || (q > 0.85 && j > 0)) continue; parts.px(E, T, x, y, sm, j === 0 ? 3 : 2); continue; }   // 末端化成烟：隔点断开的烟丝
        parts.px(E, T, x, y, m, j === 0 ? 4 : j === th - 1 ? 2 : ((i + j * 2) % 3) === 0 ? 4 : 3);      // 上沿亮、隔几格一道亮发丝
      }
      if (!smoke && i > 0 && (i % 2) === 0) parts.px(E, T, x, yT + th + ((i >> 1) & 1), m, 2);          // 下沿参差的几绺
      if (smoke && ((i + P.sway) & 1)) parts.px(E, T, x, yT - 1 - (i & 2 ? 1 : 0), sm, 3);             // 烟丝往上飘散
    }
  }
  // 候选部件：demonTail 魔尾——从后腰伸出，先往后下垂再往后上甩，1 格细，尾尖一片鳍（3 × 3 三角）。读 P.sway（摆动，和长鬃错开相位）
  function demonTail(R, o) {
    const T = R, m = o.mat, y0 = R.yHip - 1, x0 = parts.edges(R, y0)[0], L = o.len, sw = (P.sway || 0) - (P.beard < -1 ? 1 : 0);
    E.part();
    let lx = x0, ly = y0;
    for (let k = 1; k <= L; k++) { const q = k / L, x = x0 - k, y = y0 + RD(Math.sin(q * PI) * 4 - q * q * 7 - sw * q * q * 2); parts.line(E, T, lx, ly, x, y, m, k > L - 3 ? 3 : 2); lx = x; ly = y; }
    parts.px(E, T, lx - 1, ly, o.fin, 4); parts.px(E, T, lx - 1, ly - 1, o.fin, 3); parts.px(E, T, lx - 2, ly - 1, o.fin, 3); parts.px(E, T, lx - 2, ly - 2, o.fin, 4); parts.px(E, T, lx - 1, ly + 1, o.fin, 2); parts.px(E, T, lx - 2, ly + 1, o.fin, 2);
  }
  // 背鳍（和水战士同一个候选部件 dorsalFin，魔化后的画法：实心鳍膜（不再半透明）、更高、棘往后上 45° 斜出肩线、棘尖带骨刺）
  //   鳍膜外沿在两根棘之间凹下 2 格 = 一排独立的鳍片；第一根棘从肩后起，尖端高出肩线 h − 1 格
  function dorsalFin(R, o) {
    const T = R, m = o.mat, y0 = o.y0 != null ? o.y0 : R.yS, y1 = o.y1 != null ? o.y1 : R.yHip - 1, n = o.n || 3, back = P.beard < -1 ? 1 : 0;
    E.part();
    const tip = [];
    for (let i = 0; i < n; i++) { const yr = RD(y0 + (y1 - y0) * i / Math.max(1, n - 1) * 0.85), L = o.h + (i === 0 ? 1 : 0) - i + back; tip.push([yr, L]); }
    for (const [yr, L] of tip) {                                                                    // 每片鳍：棘（后上 45°）和背之间的三角鳍膜
      const e0 = parts.edges(R, yr)[0];
      for (let k = 1; k <= L; k++) {
        const x = e0 - k, yTop = yr - k + 1;
        for (let y = yTop; y <= yr + 2 - (k >> 1); y++) { const e = parts.edges(R, Math.max(y, R.yS))[0]; if (x >= e) continue; parts.px(E, T, x, y, m, y === yTop ? 4 : ((x + y) & 3) === 0 ? 3 : 2); }
      }
      if (o.spike) { parts.px(E, T, e0 - L - 1, yr - L, o.spike, 4); parts.px(E, T, e0 - L, yr - L, o.spike, 3); }
    }
  }
  // 候选部件：tiptoeLegs 踮脚爪足——大腿 → 前顶的膝 → 小腿斜向后下到抬起的脚跟（离地 heel 格）→ 脚掌斜向前下到趾尖，趾尖一格骨爪；远侧腿暗一级。落点读 rig 的步态
  //   跪（rig kneel，crouch ≥ 4）：远侧膝盖着地、小腿贴地往后、趾爪朝后；近侧大腿前伸、小腿竖直、踮着脚尖
  function tiptoeLegs(R, o) {
    if (R.kneel) {
      const yh = R.yHip + 1, kb = R.hipBx - 1, kf = R.hipFx + 4;
      E.part(); rect2(R, R.hipBx, yh, kb, -1, o.matD); rect2(R, kb, -1, kb - 4, -1, o.matD); parts.px(E, R, kb - 5, 0, o.clawD, 4);
      E.part(); rect2(R, R.hipFx, yh, kf, yh, o.mat); rect2(R, kf, yh, kf, -3, o.mat); parts.line(E, R, kf, -2, kf + 2, 0, o.mat, 0); parts.px(E, R, kf + 3, 0, o.claw, 4);
      return;
    }
    const leg = (hipX, footX, up, m, claw) => {
      E.part();
      const yh = R.yHip + 1, ty = -up, ax = footX - 1, ay = ty - o.heel, kx = (hipX + ax) / 2 + 2 + R.cr * 0.6, ky = (yh + ay) / 2 - 1;
      rect2(R, hipX, yh, kx, ky, m); rect2(R, kx, ky, ax, ay, m);
      parts.line(E, R, ax, ay + 1, footX + 1, ty, m, 0); parts.line(E, R, ax + 1, ay + 1, footX + 2, ty, m, 2);
      parts.px(E, R, footX + 3, ty, claw, 4);
    };
    leg(R.legBx, R.footBx, R.footBup, o.matD, o.clawD);
    leg(R.legFx, R.footFx, R.footFup, o.mat, o.claw);
  }
  // 候选部件：crescentBlade 鱼骨月牙弯刃（正握）——从握点沿 a 伸出 len 格，刃身往一侧鼓成半月（鼓出 bulge 格）；外弧是刃口（发光体，按 lv 5 档），内弧是骨，柄头一格骨节。
  //   T 落笔变换（身体 R 或 parts.FREE）；side 1 / -1 选鼓向哪一侧；一个部件
  function crescent(T, gx, gy, a, side, lv, bone, edge, glint) {
    const dx = Math.sin(a), dy = -Math.cos(a), nx = -dy * side, ny = dx * side, L = BLADE.len, Bg = BLADE.bulge, N = L * 4;
    E.part();
    parts.px(E, T, RD(gx - dx * 1.5), RD(gy - dy * 1.5), bone, 4);                                         // 柄头骨节
    const at = (s, o) => { const b = Bg * Math.sin(PI * s) + o; return [RD(gx + dx * (1 + L * s) + nx * b), RD(gy + dy * (1 + L * s) + ny * b)]; };
    for (let k = 0; k <= N; k++) {                                                                          // 刃身（骨）：中间 3 格厚、两头收尖
      const s = k / N, th = Math.sin(PI * s) * 1.5; for (let o = 0.4; o <= th; o += 0.5) { const p = at(s, -o); parts.px(E, T, p[0], p[1], bone, o > 1.4 ? 2 : 3); }
    }
    for (let k = 0; k <= N; k++) {                                                                          // 外弧刃口：附着的暗影（按 lv 5 档亮）
      const s = k / N, p = at(s, 0.5); let m = edge, tn = lv === 3 ? 4 : lv === 2 ? ((k & 3) === 0 ? 4 : 3) : lv === 1 ? 3 : 2;
      if (lv === 4) { m = bone; tn = 2; } if (s < 0.12) { m = bone; tn = 3; }
      parts.px(E, T, p[0], p[1], m, tn);
    }
    const tp = at(1, 0); parts.px(E, T, tp[0], tp[1], bone, 4);                                              // 刃尖
    if (glint) { const g = at(1.15, 0); parts.px(E, T, g[0], g[1], edge, 4); }
  }
  // 腮裂纹（发光）：颈侧三道斜纹 + 肋下两道
  function gillGlow(R, hd, ribY) {
    const x = hd.x0 + 1, on = !P.eyes;
    for (let k = 0; k < 3; k++) parts.px(E, R, x + (k & 1), hd.ey + 1 + k, on ? M.glow : M.skin, on ? (k === 1 ? 3 : 2) : 1);
  }
  const tmpM = new Uint8Array(hero.w * hero.h), tmpT = new Uint8Array(hero.w * hero.h), tmpP = new Uint8Array(hero.w * hero.h);
  function flipRows(s, K) {                                             // 头下脚上：整张材质缓冲按行上下翻（整 180° 转 + 左右镜像 = 仍然面朝右），明暗烘焙时按新朝向重算
    const w = s.w, h = s.h, base = 2 * s.oy + K; tmpM.fill(0); tmpT.fill(0); tmpP.fill(0);
    for (let r = 0; r < h; r++) { const r2 = base - r; if (r2 < 0 || r2 >= h) continue; tmpM.set(s.mat.subarray(r * w, r * w + w), r2 * w); tmpT.set(s.tone.subarray(r * w, r * w + w), r2 * w); tmpP.set(s.part.subarray(r * w, r * w + w), r2 * w); }
    s.mat.set(tmpM); s.tone.set(tmpT); s.part.set(tmpP);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, P.lying ? BODY_FLIP : BODY), sk = M.skin, skD = M.skinD, lv = P.gem;
    flowingMane(R, { mat: M.mane, smoke: M.rag, len: 8 });
    demonTail(R, { mat: M.skinD, fin: M.fin, len: 10 });
    dorsalFin(R, { mat: M.fin, h: 5, n: 3, spike: M.bone, y0: R.yS + 1, y1: R.yWaist + 1 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: skD, cuff: M.ragD, grip: 'none' });
    if (!P.dropB) crescent(R, P.bhx, P.bhy, P.ba, 1, lv, M.boneD, M.edge, 0);
    parts.hand(E, R, P, { side: 'B', hand: skD });
    tiptoeLegs(R, { mat: sk, matD: skD, claw: M.bone, clawD: M.boneD, heel: 3 });
    const tor = parts.torso(E, R, P, { style: 'bare', mat: sk, belt: M.rag });
    { const by = tor.belt, e = parts.edges(R, by + 1), sw = P.sway;                                        // 腰间一圈暗影破布（水战士的烂渔网布条），几条布尾参差垂下
      for (let x = e[0]; x <= e[1]; x++) { const L = ((x * 7) & 3) + 1; for (let j = 1; j <= L; j++) if (!(j === L && ((x + sw) & 1))) parts.px(E, R, x + (j > 2 ? RD(sw * 0.5) : 0), by + j, M.rag, j === 1 ? 3 : 2); }
      const c = tor.chest; parts.px(E, R, c[0] - 1, c[1] + 2, M.glow, 2); parts.px(E, R, c[0], c[1] + 3, M.glow, 3); parts.px(E, R, c[0] - 2, c[1] + 4, M.glow, 2); }   // 肋下发光的腮纹
    const hd = parts.head(E, R, P, { mat: sk, face: 'gaunt', eye: 0, nose: 'none', mouth: 'line', ear: 'pointy' });
    if (!P.eyes) { parts.px(E, R, hd.eye[0], hd.eye[1], M.glow, 4); parts.px(E, R, hd.eye[0] - 1, hd.eye[1], M.glow, 3); parts.px(E, R, hd.eye[0] + 1, hd.eye[1] - 1, M.glow, 2); }   // 两道细长的白蓝眼光（往后上挑）
    gillGlow(R, hd);
    { const m = M.mane, x0 = R.hx0, x1 = R.hx1, top = R.htop; E.part();                                   // 头顶一层长鬃（只盖头顶和后脑一列，脸留出来）
      parts.run(E, R, top - 1, x0, x1 - 2, m, 0); parts.run(E, R, top, x0 - 1, x1 - 3, m, 0); for (let y = top + 1; y <= R.ey; y++) parts.px(E, R, x0, y, m, y & 1 ? 2 : 0);
      parts.px(E, R, x0 + 2, top - 1, m, 4); parts.px(E, R, x0 + 1, top, m, 4); parts.px(E, R, x1 - 2, top, m, 2); }
    parts.horns(E, R, P, { mat: M.bone, size: 4, curve: 'back', y: 0 });
    parts.arm(E, R, P, { sleeve: 'tight', mat: sk, cuff: M.rag, grip: 'none' });
    if (!P.dropB) crescent(R, P.hx, P.hy, P.a, 1, lv, M.bone, M.edge, P.glint);
    parts.hand(E, R, P, { hand: sk });
    if (P.inv) flipRows(hero, INV_K[P.inv]);
  }
  // 化影：到剪影外沿的距离 ≤ shade 档的像素换成暗影色（外沿一圈淡一级），带抖动；发光体（眼、刃口）在全身化影前保留
  const DIST = new Uint8Array(hero.w * hero.h), QU = new Int32Array(hero.w * hero.h);
  function shadeOut(s, level, keepGlow) {
    const w = s.w, h = s.h, o = s.out; let qh = 0, qt = 0; DIST.fill(255);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] === 255) continue; if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || o[i - 1] === 255 || o[i + 1] === 255 || o[i - w] === 255 || o[i + w] === 255) { DIST[i] = 0; QU[qt++] = i; } }
    while (qh < qt) { const i = QU[qh++], d = DIST[i] + 1; for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && o[j] !== 255 && DIST[j] === 255) { DIST[j] = d; QU[qt++] = j; } }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (o[i] === 255) continue; if (keepGlow && GLOWSET[s.mat[i]]) continue;
      if (level < 12 && DIST[i] + B8[(y & 7) * 8 + (x & 7)] > level * 0.55) continue;
      o[i] = DIST[i] === 0 ? EL[1] : DIST[i] === 1 && (s.mat[i] === M.edge || s.mat[i] === M.bone) ? EL[1] : EL[2 + ((DIST[i] > 2) ? 1 : 0)];
    }
  }
  function smokeOut(s, q) {                                             // 化烟：从脚往上（抖动）删像素
    const w = s.w, h = s.h, o = s.out; let top = h, bot = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (o[y * w + x] !== 255) { if (y < top) top = y; if (y > bot) bot = y; }
    const span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) { const bias = (bot - y) / span; for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] !== 255 && B8[(y & 7) * 8 + (x & 7)] * 0.4 + bias * 0.6 < q * 1.08) o[i] = 255; } }
  }
  function bakeHero() {
    RIM.rim = P.shade >= 12 ? 0 : P.rim; RIM.rx = P.gx - P.bx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq;
    bake(hero, RIM);
    if (P.shade) shadeOut(hero, P.shade, P.st !== DEATH);
    if (P.smoke) smokeOut(hero, P.smoke);
  }
  // 死亡时脱手的两把月刃（一次画好，掉在地上）
  const drop = new Sprite(40, 14, 20, 12);
  E.begin(drop, 0, 0); crescent(parts.FREE, -11, -2, HALF + Q8 * 0.5, -1, 4, M.boneD, M.edge, 0); crescent(parts.FREE, 3, -4, HALF + Q8, 1, 4, M.bone, M.edge, 0);
  bake(drop, { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 });

  // ───── 特效 ─────
  const GN = 3, ghosts = [0, 1, 2].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy)), gX = new Float32Array(GN), gF = new Uint8Array(GN), gT = new Float32Array(GN).fill(9);
  const home = new Sprite(hero.w, hero.h, hero.ox, hero.oy);            // 施放：原位留下的残影（蓄力末帧的剪影）
  let homeT = 9, riftT = 9, riftClose = 9, stabT = 9, stabK = 0, plT = 9, chargeAcc = 0, smokeAcc = 0, cloudAcc = 0, lastStep = 0, lastGhost = -1, gi = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const RIFT_X = DUMMY_X - 1, RIFT_Y = HY - 57;
  function snapshot(st, t) { poseAt(st, t, t); drawHero(); bakeHero(); hero.k1 = P.k1; hero.k2 = P.k2; }
  function onEnter(s) {
    if (s === CAST) {                                                  // 原位只留下一个残影炸散；三个残影依次逼近；假人头顶撕开暗影裂口
      snapshot(CHARGE, DUR[CHARGE] - 1 / 12); copySprite(home, hero); hero.k1 = hero.k2 = -1;
      homeT = 0; riftT = 0; riftClose = 9; releaseOrbit(40, 110, 0.3, 0.6);
      burst(HX + 1, HY - 14, 30, 50, 130, 0.3, 0.7, R_EL, 20); ring(HX + 1, HY - 14, 0, R_EL);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'shadow', w: 0.4 });
    }
    if (s === RECOVER) riftClose = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_STAB1 || t === T_STAB2)) {           // 双刃一前一后直刺；第二刺刃口闪白
      stabT = 0; stabK = t === T_STAB1 ? 0 : 1; const x = DUMMY_X - 4, y = HY - (stabK ? 17 : 15);
      hitDummy(0, 1); burst(x, y, stabK ? 12 : 8, 30, 90, 0.15, 0.35, stabK ? R_EL : R_IMP, 6); if (stabK) fx.cross(x, y, 5, R_EL, 0.2);
      sfx('swing', { kind: 'thrust', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST && t === T_PLUNGE) {                                // 双月刃向下插进假人
      plT = 0; const x = DUMMY_X, y = HY - 16;
      fx.cross(x, y, 7, R_EL, 0.3); burst(x, y, 30, 50, 140, 0.3, 0.7, R_EL, 10); ring(x, y, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 0.6, sink: 1 }); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.8 });
    }
    if (s === RECOVER && t === 2 / 12) { for (let i = 0; i < 8; i++) spawn(K_DUST, wx(-2) + Math.random() * 8, HY, (Math.random() - 0.5) * 20, -6 - Math.random() * 6, 0.3, R_EL); }
    if (s === DEATH && t === T_CLANG) { burst(HX + 2, HY - 1, 6, 20, 50, 0.1, 0.25, FXI.steel, 8); sfx('hit', { mat: 'metal', w: 0.2 }); }
  }
  const EVENTS = [[], [], [T_STAB1, T_STAB2], [], [T_PLUNGE], [2 / 12], [], [T_CLANG], []];
  function hurtFx(s) {                                                   // 挨打：火花里混着一团暗影
    const hx = HX + 1, hy = HY - 17; burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.2, 0.45, R_IMP, 16); burst(hx, hy, s === DEATH ? 14 : 8, 20, 70, 0.3, 0.6, R_EL, 6); fx.cloud(hx - 2, hy, 4, R_EL, 0.5, 1);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const f12 = f12of(stT);
    if (state === CHARGE) {                                            // 暗影往身上收，脚下烟团翻滚
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, -(4 + Math.random() * 3)); }
      cloudAcc += dt; if (cloudAcc >= 0.3) { cloudAcc -= 0.3; fx.cloud(HX + (Math.random() - 0.5) * 6, HY - 2, 6, R_EL, 0.6, 0); }
    }
    if (state === MOVE) {                                              // 滑步：每 4 帧留一个暗影残影；几乎无声
      if (P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.05 }); lastStep = P.step; }
      if (f12 !== lastGhost && (f12 % 4) === 0) { lastGhost = f12; snapshot(MOVE, stT); copySprite(ghosts[gi], hero); gX[gi] = HX + P.mx; gF[gi] = P.flip; gT[gi] = 0; gi = (gi + 1) % GN; }
    }
    if (state === DEATH && stT > T_SMOKE - 0.1 && stT < T_SMOKE + 1.0) {   // 化烟：暗影烟雾往上飘
      smokeAcc += dt * 40; const q = clamp01((stT - T_SMOKE) / 1.0), yl = HY - 1 - q * 26;
      while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_RISE, HX - 6 + Math.random() * 12, yl + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8, -10 - Math.random() * 14, 0.7 + Math.random() * 0.6, R_EL, { age0: 0.2 }); }
      cloudAcc += dt; if (cloudAcc >= 0.25) { cloudAcc -= 0.25; fx.cloud(HX + (Math.random() - 0.5) * 6, yl - 2, 5, R_EL, 0.7, 2); }
    }
    for (let k = 0; k < GN; k++) gT[k] += dt; homeT += dt; riftT += dt; riftClose += dt; stabT += dt; plT += dt;
  }
  function fxReset() { homeT = 9; riftT = 9; riftClose = 9; stabT = 9; plT = 9; chargeAcc = 0; smokeAcc = 0; cloudAcc = 0; lastStep = 0; lastGhost = -1; gT.fill(9); gi = 0; }
  function fxBack(f12) { if (!P.shade && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {
    for (let k = 0; k < GN; k++) if (gT[k] < 0.25) blitShape(ghosts[k], gX[k], HY, gF[k], gT[k] < 1 / 12 ? EL[1] : EL[2], clamp01(gT[k] / 0.25) * 0.8);   // 滑步残影
    if (homeT < 0.2) blitShape(home, HX, HY, 0, homeT < 1 / 12 ? EL[1] : EL[2], clamp01(homeT / 0.2));                                   // 原位残影炸散
    if (E.state === CAST) for (let k = 0; k < 3; k++) {                // 三个残影一个比一个近，依次闪现（每个 2 帧）
      const t0 = k / 12, t = E.stT - t0; if (t < 0 || t >= 2 / 12) continue; const x = HX + 6 + k * 5;
      if (t < 1 / 12) { blitShape(home, x, HY, 0, EL[3], 0); outlineSprite(home, x, HY, EL[k === 2 ? 0 : 1], HY); } else blitShape(home, x, HY, 0, EL[2], 0.55);
    }
  }
  function fxFront(f12) {
    const open = riftT < 9 ? Math.min(1, riftT / 0.2) * (riftClose < 9 ? 1 - clamp01(riftClose / 0.35) : 1) : 0;
    if (open > 0) {                                                    // 横向暗影裂口：深色菱形、淡紫边，边上抖动
      const W = RD(3 + 9 * open), Hh = Math.max(1, RD(3.5 * open));
      for (let dy = -Hh; dy <= Hh; dy++) for (let dx = -W; dx <= W; dx++) {
        const e = Math.abs(dx) / W + Math.abs(dy) / Hh; if (e > 1.001) continue;
        const x = RIFT_X + dx, y = RIFT_Y + dy + (Math.abs(dx) > W * 0.6 && ((dx + f12) & 1) ? (dy > 0 ? 1 : -1) * 0 : 0);
        put(x, y, e > 0.78 ? (((dx + f12) & 3) === 0 ? EL[0] : EL[1]) : e > 0.55 ? EL[3] : 0);
      }
      if (open > 0.5) for (let k = 0; k < 3; k++) put(RIFT_X - W + ((f12 * 3 + k * 7) % (2 * W)), RIFT_Y + (k & 1 ? -Hh - 1 : Hh + 1), EL[0]);
    }
    if (stabT < 2 / 12) {                                              // 直刺的拖影：刃尖后面一道横向速度线
      const y = HY + (stabK ? -17 : -15), x1 = DUMMY_X - 5, c = stabT < 1 / 12 ? EL[0] : EL[1];
      for (let x = x1 - 10; x <= x1; x++) if (stabT < 1 / 12 || (x & 1)) put(x, y, x > x1 - 4 ? c : EL[2]);
      if (stabK && stabT < 1 / 12) { put(x1 + 1, y, 21); put(x1 + 2, y, 21); }
    }
    if (plT < 0.25) {                                                  // 下插：两道从裂口直落到刃尖的竖直拖影
      const c = plT < 2 / 12 ? EL[0] : EL[2];
      for (const x of [DUMMY_X - 3, DUMMY_X + 1]) for (let y = RIFT_Y + 3; y <= HY - 18; y++) if (plT < 2 / 12 || ((y + f12) & 1)) put(x, y, y > HY - 26 ? c : EL[1]);
    }
    if (E.state === DEATH && E.stT >= T_DROP) {                        // 月刃脱手：落地一弹，最后才消散
      const d = E.stT - T_DROP, fq = clamp01(d / 0.15), yo = d < 0.15 ? -RD(9 * (1 - fq * fq)) : d < 0.22 ? -1 : 0, dq = clamp01((d - 1.75) / 0.4), o = drop.out;
      for (let y = 0; y < drop.h; y++) for (let x = 0; x < drop.w; x++) { const c = o[y * drop.w + x]; if (c === 255 || B8[(y & 7) * 8 + (x & 7)] < dq) continue; put(HX + x - drop.ox, HY + y - drop.oy + yo, c); }
    }
  }

  return {
    name: '不朽蓝魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow, M.edge], HIT_POINT: [1, -17], EVENTS,
    // 音色：几乎无声——利刃出鞘的一声细「锵」和暗影的低频「嗡」；标志：闪现时一串「嘶嘶嘶」，接着落刃的「嚓」；重量 0.3
    SFX: { body: 'ghost', how: 'dissolve', pal: 'shadow', style: 'blade', w: 0.3 },
    REVIVE: { dy: -16, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
