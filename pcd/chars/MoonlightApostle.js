// 月光使徒（部队 · 僵尸 · 法师 · 稀有）：瘦长佝偻的僵尸苦修者，嘴被黑线缝死、双眼淡紫发光；头后一弯竖立的银色新月光冠，
// 单手持月牙杖（铁杖 + 银月牙 + 月牙里悬一颗月珠），拖地长袍 + 垂到膝下的喇叭长袖，下摆破成 4 条长布带拖在身后，胸前挂 5 枚月相小牌。
// 攻击 = 月牙杖前刺，甩出一枚旋转的新月月刃；技能 = 特性「法力爆裂」：月牙从新月蓄成满月，化成一道月光长枪贯穿单个目标。
// 死亡 = 跪下后长袍按列塌成一滩（死亡套件 melt），月牙光冠最后落在那滩上熄灭，化成淡紫雾气。
// 升级成「时间法师」（TimeMage.js）：同一个人——月牙光冠长成星环、月牙杖托起沙漏、缝线的嘴和紫光眼保留。
PCD.define('MoonlightApostle', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, dim, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：月辉（奥术）白 → 月白 → 银蓝 → 淡紫 → 深紫；只用共享色板 ─────
  const R_EL = fxRamp('moonglow', [21, 17, 60, 43, 42]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'shadow', band: 2 }, rag: 'shadow', sleeve: [0, 53, 54, 54], silver: [28, 30, 31, 21], iron: 'iron', cord: [0, 8, 59, 60],
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],                  // 尸绿灰（僵尸人形共用）
    hair: 'stone', ink: { r: 'ink', flat: 1 },
    eye: { r: [42, 43, 43, 21], flat: 1 },                                // 淡紫发光眼
    moon: { r: [42, 60, 17, 21], flat: 1 },                               // 月珠 / 满月 / 亮起的月相牌：1 熄灭 · 2 银蓝 · 3 月白 · 4 白
  });
  const BODY = { body: 'tall', leg: 10, sw: 3, limb: 0.9, hunch: 1, neck: 3, headX: 1, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 60, 34, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['iron', 'skin', 'moon', 'eye', 'ink', 'hair']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ═════ 自绘部件（通用的标了「候选部件」，以后收进库）═════
  const uvx = (q, u, v) => (q === 0 ? u : q === 1 ? -v : q === 2 ? -u : v), uvy = (q, u, v) => (q === 0 ? v : q === 1 ? u : q === 2 ? -v : -u);
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  // 月牙（开口朝前，u 向前、v 向下，原点 = 套口）：背厚 2 格，上下两角向前弯
  const CRES = [[2, -11, 4], [3, -11, 4], [0, -10, 0], [1, -10, 0], [2, -10, 0], [-1, -9, 0], [0, -9, 0], [-2, -8, 0], [-1, -8, 0], [0, -8, 0], [-2, -7, 0], [-1, -7, 0],
    [-2, -6, 0], [-1, -6, 0], [-2, -5, 0], [-1, -5, 0], [-2, -4, 0], [-1, -4, 0], [0, -4, 0], [-1, -3, 0], [0, -3, 0], [0, -2, 0], [1, -2, 0], [2, -2, 0], [2, -1, 0], [3, -1, 3]];
  const MOON_C = [2, -6];
  // 候选部件：crescentStaff —— 月牙杖：铁杖身 + 杖顶银月牙（宽杖头，只按 90° 换朝向）+ 月牙里悬的月珠（单独一个部件）。
  // o = { iron 杖身, silver 月牙, moon 月珠材质（flat 4 档）, len 握点到套口, back 握点后杖长, lv 月相 0 小珠 · 1 半月 · 2 满月 · 3 满月白 · 4 熄灭, at / a / free, mirror }
  // 读 P：hx hy a（或 o.at / o.a）。返回 { socket, moon: 月珠中心 }（精灵本地坐标）
  function staffGeo(o) {
    const gx = o.at ? o.at[0] : P.hx, gy = o.at ? o.at[1] : P.hy, a = o.a != null ? o.a : P.a, dx = Math.sin(a), dy = -Math.cos(a);
    const sx = RD(gx + dx * o.len), sy = RD(gy + dy * o.len), q = quad(a), mir = o.mirror != null ? o.mirror : q === 1, mu = mir ? -MOON_C[0] : MOON_C[0];
    return { gx, gy, dx, dy, sx, sy, q, mir, moon: [sx + uvx(q, mu, MOON_C[1]), sy + uvy(q, mu, MOON_C[1])] };
  }
  function crescentStaff(R, o) {
    const G = staffGeo(o), T = o.free ? parts.FREE : R, q = G.q, mi = G.mir ? -1 : 1, lv = o.lv;
    E.part(); parts.line(E, T, G.gx - G.dx * o.back, G.gy - G.dy * o.back, G.sx, G.sy, o.iron, 3); parts.px(E, T, G.gx - G.dx * o.back, G.gy - G.dy * o.back, o.silver, 3);
    E.part(); for (const [u, v, t] of CRES) parts.px(E, T, G.sx + uvx(q, u * mi, v), G.sy + uvy(q, u * mi, v), o.silver, t);
    if (lv === 0 || lv === 4) { parts.px(E, T, G.sx + uvx(q, 2 * mi, -9), G.sy + uvy(q, 2 * mi, -9), o.silver, 2); parts.px(E, T, G.sx + uvx(q, 2 * mi, -8), G.sy + uvy(q, 2 * mi, -8), o.silver, 2); }   // 吊月珠的细链
    E.part(); const cx = G.moon[0], cy = G.moon[1];
    if (lv === 0 || lv === 4) { const c = lv === 4 ? 1 : 4, e = lv === 4 ? 1 : 3; parts.px(E, T, cx, cy, o.moon, c); parts.px(E, T, cx + 1, cy, o.moon, e - (lv ? 0 : 1)); parts.px(E, T, cx - 1, cy, o.moon, e); parts.px(E, T, cx, cy - 1, o.moon, e); parts.px(E, T, cx, cy + 1, o.moon, lv === 4 ? 1 : 2); }
    else for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      if (i * i + j * j > 6.1) continue; const back = uvx(q, -mi, 0) * i + uvy(q, -mi, 0) * j;   // 靠月牙背的一侧先亮（半月）
      if (lv === 1 && back < 0) continue;
      const d = i * i + j * j, t = lv === 3 ? (d > 4 ? 3 : 4) : d === 0 ? 4 : d <= 2 ? 3 : (i + j < 0 ? 3 : 2);
      parts.px(E, T, cx + i, cy + j, o.moon, t);
    }
    return { socket: [G.sx, G.sy], moon: G.moon };
  }
  // 候选部件：crescentHalo —— 头后竖立的新月光冠：开口朝上的「船形」新月浮在头顶后上方，底弧离头顶 1 格，两角尖高出头顶 6 格。
  // o = { mat, lit 0 平常 · 1 一闪 · 2 熄灭, c 中心相对头中线的偏移（默认 −1）}
  const HALO = [[-5, -6, 4], [5, -6, 4], [-5, -5, 0], [5, -5, 0], [-5, -4, 0], [-4, -4, 0], [4, -4, 0], [5, -4, 0], [-4, -3, 0], [-3, -3, 0], [3, -3, 0], [4, -3, 0],
    [-3, -2, 0], [-2, -2, 0], [-1, -2, 0], [0, -2, 0], [1, -2, 0], [2, -2, 0], [3, -2, 0], [-2, -1, 0], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [2, -1, 0]];
  function crescentHalo(R, o) {
    E.part(); const cx = R.hx + (o.c == null ? -1 : o.c), cy = R.htop, t0 = o.lit === 1 ? 4 : o.lit === 2 ? 1 : 0;
    for (const [x, y, t] of HALO) parts.px(E, R, cx + x, cy + y, o.mat, o.lit === 2 ? (t ? 2 : 1) : o.lit === 1 ? (y < -2 ? 4 : 3) : t || t0);
  }
  // 候选部件：longSleeve —— 垂到膝下的喇叭长袖：袖身和挂在小臂下的大袖摆是同一个部件（一块从肩到腕、越靠腕垂得越低的布），
  // 袖口（喇叭口前沿的镶边）和手各一个部件。o = { side 'F' | 'B', at [x, y] 手, mat 袖, cuff 袖口, hand 手（缺省不画）, drop 袖摆最低行（默认 −6，膝下）}
  // 读 P.beard（袖摆下沿摆）。返回 { wx, wy }
  function longSleeve(R, o) {
    const B = o.side === 'B', sx = B ? R.sBx : R.sFx, sy = B ? R.sBy : R.sFy, hx = RD(o.at[0]), hy = RD(o.at[1]), b = P.beard || 0;
    const dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1, wx = hx - dx / d * 1.5, wy = hy - dy / d * 1.5, bot = Math.max(RD(wy) + 3, o.drop == null ? -6 : o.drop);
    E.part();
    parts.sweep(E, R, sx, sy, wx, wy, 1, 1.6, o.mat, 0);
    const n = Math.max(2, Math.ceil(Math.abs(wx - sx) + Math.abs(wy - sy))); let fx = 0, fy0 = 0, fy1 = 0;
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = sx + (wx - sx) * t, y = sy + (wy - sy) * t, yb = RD(y + 1 + (bot - y - 1) * Math.pow(t, 1.5));
      for (let yy = RD(y); yy <= yb; yy++) { const q = clamp01((yy - y) / Math.max(1, bot - y)); parts.px(E, R, x + RD(b * q * q), yy, o.mat, 0); }
      if (k === RD(n * 0.55)) { fx = x; fy0 = RD(y) + 2; fy1 = yb - 1; }
    }
    for (let yy = fy0; yy <= fy1; yy++) if ((yy & 1) === 0) parts.px(E, R, fx + RD(b * 0.5 * (yy - fy0) / Math.max(1, fy1 - fy0)), yy, o.mat, 2);   // 一道竖褶
    if (o.cuff) { E.part(); for (let yy = RD(wy) - 1; yy <= Math.min(bot, RD(wy) + 3); yy++) parts.px(E, R, RD(wx) + (yy > RD(wy) + 1 ? RD(b * 0.5) : 0), yy, o.cuff, yy === RD(wy) - 1 ? 4 : 0); }
    if (o.hand) { E.part(); parts.rect(E, R, hx - 1, hy - 1, 2, 2, o.hand, 0); parts.px(E, R, hx - 1, hy - 1, o.hand, 4); }
    return { wx: RD(wx), wy: RD(wy) };
  }
  // 候选部件：hemStrips —— 长袍下摆撕成的长布带，拖在身后地上（4 条扇开，末端随 P.drag / P.sway 扫动）。o = { mat, x 下摆后角, n 条数 }
  const STRIP = [[9, 0], [5, -1], [8, -2], [4, -3]];
  function hemStrips(R, o) {
    E.part(); const x0 = o.x, ph = P.drag, sw = P.sway;
    for (let k = 0; k < STRIP.length; k++) {
      const L = STRIP[k][0] + ((ph + k) & 1) + (P.walk ? 1 : 0), yEnd = Math.min(0, STRIP[k][1] + (P.walk && ((ph + k) & 3) === 1 ? -1 : 0)), xs = x0 + 1 - (k >> 1), ys = -1 - k;
      const xe = x0 - L + RD(sw * 0.5 * (k & 1 ? -1 : 1)); parts.line(E, R, xs, ys, xe, yEnd, o.mat, k & 1 ? 2 : 3); if (!(k & 1)) parts.px(E, R, xe - 1, yEnd, o.mat, 2);
    }
  }
  // 候选部件：moonPlaques —— 胸前一串月相小牌（新月 → 满月），lit 块亮起。o = { mat 银, lit 材质, n 已亮的块数, at [x, y] 最上一块, cord 挂绳 }
  const PH_TONE = [1, 2, 3, 3, 4];
  function moonPlaques(R, o) {
    E.part(); const [x, y] = o.at;
    parts.px(E, R, x - 1, y - 1, o.cord, 3); parts.px(E, R, x - 2, y - 2, o.cord, 2);
    for (let k = 0; k < 5; k++) { const px_ = x + (k >= 1 && k <= 3 ? 1 : 0), py = y + k; if (k < o.n) parts.px(E, R, px_, py, o.lit, k === o.n - 1 ? 4 : 3); else parts.px(E, R, px_, py, o.mat, PH_TONE[k]); }
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, moon: 0, plq: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, drag: 0, hold: 0, pray: 0, crown: 0, drop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -12, 0.12, -2, -9);
  const K_WIND = K(5, -14, -0.3, -4, -10, -1, -1);          // 月牙杖后引
  const K_THRUST = K(11, -16, 1.45, -4, -11, 1, 1);         // 单手前刺
  const K_HOLD = K(10, -15, 1.2, -3, -10, 1);
  const K_CHARGE = K(9, -16, 0, 8, -10, 0, -1);             // 双手捧杖立于身前，仰头看月
  const K_CAST = K(12, -17, HALF, -4, -12, 1, 1);           // 单手平刺
  const K_HURT = K(6, -11, 0.2, -3, -10, -1, -1);
  const K_KNEEL = K(7, -8, 0.5, -1, -7, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['moon', 0, 4], ['plq', 0, 5], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['drag', 0, 3], ['hold', 0, 1], ['pray', 0, 1], ['crown', 0, 2], ['drop', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_FLICK = 2 / 12, T_KNEE = INCOMING + 0.42, T_MELT = INCOMING + 0.6, T_BURST = 0.25;
  const STAFF = { iron: M.iron, silver: M.silver, moon: M.moon, len: 11, back: 11 };

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.moon = 0; P.plq = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.drag = 0; P.hold = 0; P.pray = 0; P.crown = 0; P.drop = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.drag = (b >> 1) & 1 ? 2 : 0;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) {                                // 待机个性：仰头望月祷告——后手抚胸前月相牌，头后仰 1 格，光冠一闪
        const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.pray = 1; P.bhx = 4; P.bhy = -15; P.head = -1; P.eyes = f >= 1 && f <= 3 ? 1 : 0; P.crown = f === 2 || f === 3 ? 1 : 0; P.glint = f === 2 ? 1 : 0; P.plq = f >= 2 && f <= 3 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 拖行：看不见脚，下摆被前后腿顶出、布带在身后扫
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bob = 0; P.drag = f;
      P.a += P.step * 0.08; P.hx += P.step * 0.5; P.lean = 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_THRUST, K_THRUST, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 2; }
      else if (tq < 0.45) { setK(K_THRUST, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; P.bend = 1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                      // 新月 → 半月 → 满月；胸前月相牌依次亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.hold = q > 0.5 ? 1 : 0;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = RD(q * 2);
      P.moon = tq < 0.35 ? 0 : tq < 0.85 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.plq = Math.min(5, Math.floor(tq / 0.25 + 1e-6)); P.rim = 2; P.crown = tq > 1.1 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) { setK(K_CAST, K_CAST, 0); if (tq < 1 / 12) { P.hx += 1; P.lean = 2; }   // 施放第 1 帧就刺出（和光枪同一帧），第 2 帧收回 1 格
      P.beard = -2; P.sway = -1; P.bend = 3; P.moon = tq < 0.25 ? 3 : 2; P.gem = 3; P.rim = 3; P.plq = 5; P.crown = 1; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q); P.bend = RD(2 * (1 - q));
      P.moon = q < 0.3 ? 2 : q < 0.65 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.plq = RD(5 * (1 - q)); P.crown = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.drag = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 受击 → 跪下（杖脱手）→ 长袍按列塌成一滩（死亡套件 melt）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < T_MELT - INCOMING) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.drop = d < 0.4 ? 1 : 2; P.moon = 4; P.crown = 0; P.lean = 1; P.head = 1; }
      else { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.dq = 1; P.drop = 2; P.moon = 4; P.crown = 2; }   // 之后由死亡套件接管
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.hold) { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.bhx = RD(P.hx - dx * 6); P.bhy = RD(P.hy - dy * 6); }   // 双手捧杖：后手握在前手下方 6 格
    if (P.drop) { P.gx = 16 + P.bx; P.gy = -2; }
    else { const G = staffGeo(STAFF); P.gx = G.moon[0] + P.bx; P.gy = G.moon[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  let loot = 1;                                                      // 0 = 画死亡套件的快照（不画光冠和掉在地上的杖，它们单独烤成精灵）；只在 onTime 里临时改、画完就复原
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), eH = parts.edges(R, R.yHip);
    if (loot) crescentHalo(R, { mat: M.silver, lit: P.crown });
    hemStrips(R, { mat: M.rag, x: eH[0] - 3 + RD(P.sway * 0.5) - (R.kneel ? 2 : 0) });
    longSleeve(R, { side: 'B', at: [P.bhx, P.bhy], mat: M.sleeveD, cuff: M.silverD, hand: P.pray || P.hold ? 0 : M.skinD, drop: P.pray || P.hold ? -12 : -6 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, belt: M.cord, buckle: M.silver, tassel: M.cord, hem: 0, flare: R.kneel ? 3 : 4, flareF: R.kneel ? 4 : 3 });
    if (P.walk) {                                                   // 拖行：看不见脚——接触 A 前腿把前摆顶出去（膝 → 脚尖），接触 B 后腿把后摆蹬出去，经过帧膝盖在前摆中间顶出一个包
      const L = tor.rows[0], Rr = tor.rows[1], I = (y) => Math.max(0, Math.min(L.length - 1, y - tor.y0));
      for (let y = -7; y <= 0; y++) {
        const k = y + 7, push = P.step !== 0 ? [0, 1, 1, 2, 2, 2, 3, 3][k] : [0, 0, 0, 1, 1, 1, 0, 0][k];
        if (!push) continue;
        if (P.step >= 0) parts.run(E, R, y, Rr[I(y)] + 1, Rr[I(y)] + push, M.robe, 0);
        else parts.run(E, R, y, L[I(y)] - push, L[I(y)] - 1, M.robe, 0);
      }
      if (P.step > 0) parts.px(E, R, Rr[I(0)] + 3, 0, M.robe, 0); else if (P.step < 0) parts.px(E, R, L[I(0)] - 3, 0, 0, 0);
    }
    const H = parts.head(E, R, P, { mat: M.skin, face: 'gaunt', eye: M.eye, eyeStyle: 'glow', nose: 'hook', mouth: 'none', ear: 'dot', age: 'old' });
    for (let y = R.hy + 1; y < R.yS; y++) parts.run(E, R, y, R.hx - 1, R.hx, M.skin, y === R.hy + 1 ? 2 : 0);   // 细长的脖子（和脸同一个部件）
    { const r = H.bot - 1, x1 = H.x1; for (let x = x1 - 3; x <= x1; x++) { const odd = (x1 - x) & 1; parts.px(E, R, x, r, odd ? M.ink : M.skin, odd ? 0 : 4); parts.px(E, R, x, r + 1, odd ? M.skin : M.ink, odd ? 3 : 0); } }   // 缝死的嘴：一排之字形黑线针脚
    parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 1 });
    if (P.drop) {                                                    // 杖脱手：先斜着滑下去，再横躺在身前地上
      if (loot) crescentStaff(R, P.drop === 1 ? { ...STAFF, free: 1, at: [10, -6], a: 1.0, lv: 4, mirror: 0 } : { ...STAFF, free: 1, at: [6, -1], a: HALF, lv: 4, mirror: 0 });
    } else crescentStaff(R, { ...STAFF, lv: P.moon });
    if (P.hold) parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    longSleeve(R, { at: [P.hx, P.hy], mat: M.sleeve, cuff: M.silver, hand: M.skin, drop: R.kneel ? -2 : -6 });
    if (P.pray) { E.part(); parts.px(E, R, P.bhx, P.bhy, M.skinD, 3); parts.px(E, R, P.bhx + 1, P.bhy, M.skinD, 4); parts.px(E, R, P.bhx + 1, P.bhy + 1, M.skinD, 2); }   // 抚在月相牌上的手指
    const fr = parts.edges(R, R.yS + 2)[1];
    moonPlaques(R, { mat: M.silver, lit: M.moon, cord: M.cord, n: P.plq, at: [fr + 1, R.yS + 2] });   // 月相牌挂在胸前最外沿（压在前臂上）
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 死亡套件之外的两件掉落物：光冠（落在那滩上熄灭）、杖（横在地上）─────
  const crownSpr = new Sprite(hero.w, hero.h, hero.ox, hero.oy), crownDark = new Sprite(hero.w, hero.h, hero.ox, hero.oy), staffSpr = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  const PLAIN = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  let crownY0 = 0;
  function bakeLoot() {
    const R = parts.rig(P, BODY);
    E.begin(crownSpr, P.bx, 0); crescentHalo(R, { mat: M.silver, lit: 1 }); bake(crownSpr, PLAIN);
    E.begin(crownDark, P.bx, 0); crescentHalo(R, { mat: M.silver, lit: 2 }); bake(crownDark, PLAIN);
    E.begin(staffSpr, P.bx, 0); crescentStaff(R, { ...STAFF, free: 1, at: [6, -1], a: HALF, lv: 4, mirror: 0 }); bake(staffSpr, PLAIN);
    crownY0 = R.htop;
  }
  function blitOut(s, X, Y, dq, dy) { const o = s.out; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, Y - s.oy + y + dy, c); } }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, mistAcc = 0, lastStep = 0, lootT = -1, castT = 9, beamY = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y, DY = HY - 15;
  function onEnter(s) {
    if (s === CHARGE) dim(DUR[CHARGE] + 0.05);
    if (s !== CAST) return;
    poseAt(CAST, 0, 0);                                                // 进入施放时 P 还是蓄力末帧：先取平刺那一帧的满月位置
    const gx = wx(P.gx), gy = wy(P.gy); castT = 0; beamY = gy;
    releaseOrbit(80, 140, 0.25, 0.45, { to: [DUMMY_X, DY, 4] });           // 汇聚在月亮上的光点顺着光枪飞向目标
    fx.beam(gx + 2, gy, DUMMY_X + 13, gy, 2, R_EL, 0.42, 2); fx.cross(gx, gy, 6, R_EL, 0.3);
    burst(gx, gy, 16, 40, 100, 0.2, 0.5, R_EL, 6); ring(gx, gy, 0, R_EL);
    for (let i = 0; i < 20; i++) { const a = i / 20 * 6.2832, r = 11 + Math.random() * 4; spawnX(K_SPIRAL_PT, DUMMY_X, DY, r / 0.25, 0, 9, R_EL, { a, r, w: 2.5, tx: DUMMY_X, ty: DY }); }   // 目标身上光点先定点内收
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy); shoot(1, mzX + 2, mzY, 165, DUMMY_X - 3, R_EL); burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_BURST) {                                  // 内收三帧后爆开：开口朝上的新月斩击弧 + 36 颗月辉 + 大冲击环
      fx.slash(DUMMY_X, DY - 3, 10, 1.75, 4.55, R_EL, 0.35, 3, 2); fx.cross(DUMMY_X, DY, 5, R_EL, 0.25);
      burst(DUMMY_X, DY, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(DUMMY_X, DY, 1, R_EL); hitDummy(1); shake(0.12, 1);
      sfx('impact', { pal: 'arcane', w: 0.8 });
    }
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && t === T_MELT) {                                  // 长袍按列塌成一滩；光冠和杖不进快照，单独画
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); loot = 0; drawHero(); bakeHero(); loot = 1; bakeLoot(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.15, fadeDur: 0.5 }); lootT = 0;
      for (let i = 0; i < 8; i++) spawnX(K_RISE, HX - 8 + Math.random() * 16, HY - 2 - Math.random() * 10, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [T_BURST], [], [], [T_KNEE, T_MELT], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                          // 淡紫光点从四周螺旋汇聚进月亮
      chargeAcc += dt * (22 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, a, r, -(4 + Math.random() * 3)); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.2 }); const sx = wx(-9 - (P.step < 0 ? 2 : 0)); spawn(K_DUST, sx + (Math.random() - 0.5) * 2, HY, (P.flip ? 1 : -1) * (6 + Math.random() * 8), -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, FXI.dust); }   // 布带在身后扫出 1 格尘
      lastStep = P.step;
    }
    if ((state === IDLE || state === RECOVER) && !P.drop) { emberAcc += dt * (state === IDLE ? 2 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_EL); } }
    if (lootT >= 0) {
      lootT += dt;
      if (lootT > 1.0 && lootT < 1.8) { mistAcc += dt * 26; while (mistAcc >= 1) { mistAcc -= 1; spawnX(K_RISE, HX - 12 + Math.random() * 22, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 8, -8 - Math.random() * 10, 0.9 + Math.random() * 0.6, R_EL, { age0: 0.45 }); } }   // 化成淡紫雾气
      if (lootT > 1.1 && lootT < 1.8) { soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 14, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.soul); } }
    }
    mzT += dt; castT += dt;
  }
  function fxReset() { mzT = 9; castT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; mistAcc = 0; lastStep = 0; lootT = -1; }
  function crownDrop() {                                               // 光冠：塌的时候还悬在原处 0.25 s → 落到那滩上弹一下 → 熄灭
    const t = lootT, top = crownY0, land = -1 - top, fallQ = clamp01((t - 0.25) / 0.4);
    let dy = RD(land * fallQ * fallQ); if (t > 0.65 && t < 0.8) dy = RD(land - Math.sin((t - 0.65) / 0.15 * Math.PI) * 2);
    return dy;
  }
  function fxBack(f12) { if (!P.drop && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() {
    if (lootT < 0) return;
    const dq = clamp01((lootT - 1.2) / 0.5);
    blitOut(staffSpr, HX, HY, dq, 0);
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.drop && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (lootT >= 0) { const dy = crownDrop(), out = lootT > 0.95 && !(lootT < 1.15 && (f12 & 1)); blitOut(out ? crownDark : crownSpr, HX, HY, clamp01((lootT - 1.25) / 0.5), dy); }
  }
  // 月刃弹：旋转的新月（4 个朝向，按 12 fps 翻转）
  const BLADE = [[-1, -2, 1], [0, -2, 0], [-2, -1, 1], [-2, 0, 0], [-2, 1, 1], [-1, 2, 1], [0, 2, 0], [-1, -1, 2], [-1, 0, 1], [-1, 1, 2]];
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1) return false; const r = f12 & 3;
    for (const [u, v, c] of BLADE) { const X = r === 0 ? u : r === 1 ? -v : r === 2 ? -u : v, Y = r === 0 ? v : r === 1 ? u : r === 2 ? -v : -u; put(x + X * d, y + Y, R[c]); }
    put(x - 3 * d, y, R[2]); put(x - 4 * d, y, R[3]);
    return true;
  }

  return {
    name: '月光使徒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.moon, M.eye], HIT_POINT: [2, -14], EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'flesh', how: 'collapse', pal: 'arcane', style: 'beam', w: 0.5 },
    REVIVE: { dy: -14, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
