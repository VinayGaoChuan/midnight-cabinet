// 月光使徒（部队 · 僵尸 · 法师 · 稀有）：瘦长佝偻的僵尸苦修者，嘴被黑线缝死、双眼淡紫发光；头后一弯竖立的银色新月光冠，
// 单手持月牙杖（铁杖 + 银月牙 + 月牙里悬一颗月珠），拖地长袍 + 垂到膝下的喇叭长袖，下摆破成 4 条长布带拖在身后，胸前挂 5 枚月相小牌。
// 攻击 = 月牙杖前刺，甩出一枚旋转的新月月刃；技能 = 特性「铁之冰雹」：法力蓄满时高举月牙杖，目标头顶聚起一团冷灰铁刺，
// 杖往下一劈、两波铁雹先后砸进目标脚下一小片地面，被砸中的目标头上挂起「伤害降低」的断剑记号（每波一枚）。
// 死亡 = 跪下后长袍按列塌成一滩（死亡套件 melt），月牙光冠最后落在那滩上熄灭，化成淡紫雾气。
// 升级成「时间法师」（TimeMage.js）：同一个人——月牙光冠长成星环、月牙杖托起沙漏、缝线的嘴和紫光眼保留。
PCD.define('MoonlightApostle', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_TRAIL, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, clearOrbit, shoot, ring, shake, flash, dim, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：月辉（奥术）白 → 月白 → 银蓝 → 淡紫 → 深紫；只用共享色板 ─────
  const R_EL = fxRamp('moonglow', [21, 17, 60, 43, 42]), EL = FXR[R_EL];
  // 技能「铁之冰雹」自己的色阶：冷灰铁 —— 亮面 17 → 灰紫 18 → 钢灰 29 → 暗铁 28 → 铁黑 27（不用冰青、不用白芯晶体；攻击仍用 R_EL）
  const R_IRON = fxRamp('ironhail', [17, 18, 29, 28, 27]), IR = FXR[R_IRON];

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
  // 候选部件：crescentHalo —— 头后竖立的新月光冠：开口朝上的新月（11 宽 × 8 高），弧底正中最厚 3 行，向两个尖逐格收到 1 格；
  // 整个浮在头顶后上方：弧底在头顶上方 HALO_LIFT 格（发顶 = 头顶上 1 行，中间空出 3 行，彩色图里看得到一段连续的亮弧底，不会被乱发挡住读成一对角）。
  // 只用银白第 3–4 级填色：外弧（下沿和两侧外沿）一圈 4 级亮边，其余 3 级；暗色只留给烘焙时自动加的勾线。
  // o = { mat, lit 0 平常 · 1 一闪（整条全亮）· 2 熄灭（外弧 3、其余 2）, c 中心相对头中线的偏移（默认 −1）}
  const HALO_ROWS = [[-7, 5, 5], [-6, 5, 5], [-5, 4, 5], [-4, 3, 5], [-3, 2, 4], [-2, 0, 4], [-1, 0, 3], [0, 0, 2]];   // [行, |x| 下限, |x| 上限]，行 0 = 弧底
  const HALO_LIFT = 5, HALO = [];
  { const inH = (x, y) => HALO_ROWS.some(([r, a, b]) => r === y && Math.abs(x) >= a && Math.abs(x) <= b);
    for (const [y, a, b] of HALO_ROWS) for (let x = -b; x <= b; x++) if (Math.abs(x) >= a) HALO.push([x, y, !inH(x, y + 1) || (x !== 0 && !inH(x + Math.sign(x), y)) ? 1 : 0]); }   // [x, y, 外弧亮边]
  function crescentHalo(R, o) {
    E.part(); const cx = R.hx + (o.c == null ? -1 : o.c), cy = R.htop - HALO_LIFT, lit = o.lit || 0;
    for (const [x, y, e] of HALO) parts.px(E, R, cx + x, cy + y, o.mat, lit === 1 ? 4 : lit === 2 ? (e ? 3 : 2) : (e ? 4 : 3));
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
  // 候选部件：moonPlaques —— 胸前一串月相小牌：5 枚 2×2 小牌（新月 → 满月：每枚画出月相，亮的格子逐枚变多），
  // 一左一右错开 2 格挂成一串（相邻两枚只在对角碰一下，中间露出袍子，一眼数得出是 5 枚）；
  // 蓄力时逐块亮起（换成发光材质，最新亮起的那块全白）。o = { mat 银, lit 发光材质, n 已亮的块数, at [x, y] 第一块左上角, cord 挂绳 }
  const PH_GLYPH = [[1, 1, 1, 3], [1, 3, 1, 3], [1, 3, 3, 3], [3, 4, 3, 3], [4, 4, 4, 4]];   // 左上 右上 左下 右下：暗面 1 级，亮面从右往左长满
  const plqAt = (x, y, k) => [x + (k & 1), y + 3 * k];
  function moonPlaques(R, o) {
    E.part(); const [x, y] = o.at;
    parts.px(E, R, x, y - 1, o.cord, 3); parts.px(E, R, x - 1, y - 2, o.cord, 2);
    for (let k = 0; k < 5; k++) {
      const [X, Y] = plqAt(x, y, k), g = PH_GLYPH[k], on = k < o.n, m = on ? o.lit : o.mat;
      if (k) parts.px(E, R, X + (k & 1 ? 0 : 1), Y - 1, o.cord, 3);                                  // 两枚之间露出 1 格挂绳
      for (let j = 0; j < 4; j++) parts.px(E, R, X + (j & 1), Y + (j >> 1), m, on ? (k === o.n - 1 ? 4 : Math.max(2, Math.min(4, g[j] + 1))) : g[j]);
    }
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, moon: 0, plq: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, drag: 0, hold: 0, pray: 0, crown: 0, drop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -12, 0.12, -2, -9);
  const K_WIND = K(5, -14, -0.3, -4, -10, -1, -1);          // 月牙杖后引
  const K_THRUST = K(11, -16, 1.45, -4, -11, 1, 1);         // 单手前刺
  const K_HOLD = K(10, -15, 1.2, -3, -10, 1);
  const K_RAISE = K(8, -27, 0.15, 5, -21, 0, -1);          // 技能蓄力：双手把月牙杖高举过头、杖头指天，仰头（召唤铁雹）
  const K_SLAM = K(13, -15, 2.1, -4, -11, 2, 1, 1);         // 技能施放：杖往前下方一劈，杖头指向目标脚下（铁雹落下）
  const K_LIFT = K(11, -21, 0.9, -3, -12, 1, 0);            // 两波之间：杖头往上一提，再劈第二下
  const K_HURT = K(6, -11, 0.2, -3, -10, -1, -1);
  const K_KNEEL = K(7, -8, 0.5, -1, -7, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['moon', 0, 4], ['plq', 0, 5], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['drag', 0, 3], ['hold', 0, 1], ['pray', 0, 1], ['crown', 0, 2], ['drop', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_FLICK = 2 / 12, T_KNEE = INCOMING + 0.42, T_MELT = INCOMING + 0.6;
  const STAFF = { iron: M.iron, silver: M.silver, moon: M.moon, len: 11, back: 11 };
  const WALK_FF = [5, 3, 1, 3], WALK_FB = [3, 4, 6, 4];              // 拖行 4 帧的下摆前 / 后外扩（接触 A 前腿顶出前摆，接触 B 前摆收回、后腿把后摆蹬出）

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
    } else if (st === CHARGE) { skF = Math.floor(tq * 12 + 1e-6);                           // 法力蓄满：双手把杖举过头、杖头指天；月相牌依次亮起（法力条），末段举着的杖微微发抖
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RAISE, q); P.hold = q > 0.5 ? 1 : 0;
      if (q > 0.95 && tq > 1.0 && (f12 & 1)) P.hy -= 1;
      P.beard = RD(q * 2) - (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? 1 : 0) : 0; P.bend = RD(q * 1);
      P.moon = tq < 0.35 ? 0 : tq < 0.85 ? 1 : 2; P.gem = 1; P.plq = Math.min(5, Math.floor(tq / 0.25 + 1e-6)); P.rim = 2; P.crown = tq > 1.1 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                        // 两下劈：帧 0–2 劈下（第一波落），帧 3 杖头上提，帧 4–5 再劈（第二波落）
      const f = Math.floor(tq * 12 + 1e-6); skF = f;
      if (f === 3) setK(K_LIFT, K_LIFT, 0); else setK(K_SLAM, K_SLAM, 0);
      if (f === 0 || f === 4) { P.hx += 1; P.hy += 1; P.lean = 2; }   // 劈下那一帧多压 1 格
      P.beard = f === 3 ? 1 : -2; P.sway = f === 3 ? 0 : -1; P.bend = f === 3 ? 1 : 3; P.moon = 2; P.gem = 1; P.rim = 3; P.plq = f < 3 ? 5 : 3; P.crown = f === 0 || f === 4 ? 1 : 0; }
    else if (st === RECOVER) {
      skF = 6 + Math.floor(tq * 12 + 1e-6); const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.beard = -RD(1 - q); P.bend = RD(2 * (1 - q));
      P.moon = q < 0.3 ? 1 : 0; P.gem = q < 0.5 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.plq = RD(3 * (1 - q)); P.crown = 0;
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
    const PQ = [parts.edges(R, R.yS + 2)[1] - 1, R.yS + 1], PRAY = [PQ[0] - 2, PQ[1] + 4];   // 月相牌第一块左上角；抚牌的手指贴在第 3 块（半月）左边，不压住牌
    longSleeve(R, { side: 'B', at: P.pray ? PRAY : [P.bhx, P.bhy], mat: M.sleeveD, cuff: M.silverD, hand: P.pray || P.hold ? 0 : M.skinD, drop: P.pray || P.hold ? -12 : -6 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, belt: M.cord, buckle: M.silver, tassel: M.cord, hem: 0,
      flare: P.walk ? WALK_FB[P.drag] : R.kneel ? 3 : 4, flareF: P.walk ? WALK_FF[P.drag] : R.kneel ? 4 : 3 });   // 拖行：前摆 伸 → 中 → 收 → 中，后摆反相（下摆波浪前移）
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
    const RAISED = (P.st === CHARGE || P.st === CAST || P.st === RECOVER) && P.hy < -18;   // 技能里举过头的前手：袖摆顺着手臂往下垂，不拖到膝下
    longSleeve(R, { at: [P.hx, P.hy], mat: M.sleeve, cuff: M.silver, hand: M.skin, drop: R.kneel ? -2 : RAISED ? P.hy + 10 : -6 });
    if (P.pray) { E.part(); parts.px(E, R, PRAY[0], PRAY[1], M.skinD, 3); parts.px(E, R, PRAY[0] + 1, PRAY[1], M.skinD, 4); parts.px(E, R, PRAY[0] + 1, PRAY[1] + 1, M.skinD, 2); }   // 抚牌的手指（贴着牌的左边，错开 1 格）
    moonPlaques(R, { mat: M.silver, lit: M.moon, cord: M.cord, n: P.plq, at: PQ });   // 月相牌挂在胸前最外沿（压在前臂上）
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
  let mzT = 9, mzX = 0, mzY = 0, gritAcc = 0, emberAcc = 0, soulAcc = 0, mistAcc = 0, lastStep = 0, lootT = -1, skF = 0;   // skF：技能帧号（蓄力 = 状态内第几帧；施放 0–5；收招 6 起），poseAt 里按 12 fps 写
  const wx = (x) => scrX(x), wy = (y) => HY + y;

  // ───── 技能「铁之冰雹」：目标头顶聚起 10 枚铁刺 / 铁块，分两波砸进目标脚下 ±11 格的一小片地面 ─────
  // 铁刺外形（[dx, dy, 色阶级]，原点 = 最下面那一格；左上受光：左 / 上 1 级、右 / 下 3 级，只有迎光角 1 格 0 级）
  const SHARD = [
    [[-1, -5, 1], [0, -5, 0], [1, -5, 2], [-1, -4, 1], [0, -4, 1], [1, -4, 3], [-1, -3, 2], [0, -3, 1], [1, -3, 3], [0, -2, 1], [1, -2, 3], [0, -1, 2], [0, 0, 2]],   // 楔形铁刺（平头、尖朝下）
    [[0, -4, 1], [1, -4, 0], [2, -4, 1], [-1, -3, 1], [0, -3, 1], [1, -3, 1], [2, -3, 2], [3, -3, 3], [-1, -2, 2], [0, -2, 1], [1, -2, 2], [2, -2, 3], [0, -1, 2], [1, -1, 3], [2, -1, 3], [1, 0, 3]],   // 切角铁块
    [[0, -6, 0], [1, -6, 2], [-1, -5, 1], [0, -5, 1], [1, -5, 2], [2, -5, 3], [0, -4, 1], [1, -4, 3], [0, -3, 1], [1, -3, 3], [0, -2, 2], [1, -2, 3], [0, -1, 2], [0, 0, 3]],   // 带倒刺的长铁钉
  ];
  // [悬停 dx, 悬停 y（屏幕）, 落点 dx, 波次, 外形, 蓄力第几帧出现]；dx 相对假人 DUMMY_X
  const HAIL = [[-10, 14, -9, 1, 0, 4], [-4, 12, -6, 2, 2, 9], [2, 15, 2, 1, 1, 6], [8, 12, 8, 2, 0, 11], [13, 16, 10, 1, 2, 8],
    [-13, 22, -11, 2, 1, 5], [-7, 21, -4, 1, 2, 12], [-1, 23, -1, 2, 0, 7], [5, 22, 6, 1, 0, 13], [11, 23, 4, 2, 1, 10]];
  const DROP = [0, 0, 3], LAND = [0, 2, 5], FALLQ = [0.22, 0.66];   // 第 1 波施放帧 0 落下、帧 2 砸地；第 2 波帧 3 落下、帧 5 砸地（中间隔 3 帧一拍）
  const T_W1 = LAND[1] / 12, T_W2 = LAND[2] / 12, CLOUD_Y = 18;
  function drawShard(x, y, sh, lift, clipY) {   // lift 1 = 整块亮一级（刚成形 / 刚落下那一帧）
    for (const [dx, dy, c] of SHARD[sh]) { const Y = y + dy; if (Y > clipY) continue; put(x + dx, Y, IR[Math.max(0, c - lift)]); }
  }
  // 「伤害降低」记号：一柄尖朝下、从中间断开的小剑（铁色），每波一枚并排挂在假人头顶；右边一个红色向下箭头
  const MARK = [[0, 0, 1], [0, 1, 2], [-2, 2, 1], [-1, 2, 1], [0, 2, 1], [1, 2, 2], [2, 2, 3], [0, 3, 0], [1, 3, 3], [0, 4, 1], [1, 4, 3], [0, 5, 1], [1, 5, 3],   // 柄头 · 握把 · 护手 · 上半截刃
    [1, 7, 1], [2, 7, 3], [1, 8, 1], [2, 8, 3], [1, 9, 2]];                                                                       // 断口下错开 1 格的下半截刃和刃尖
  const ARROW = [[0, 0, 57], [0, 1, 57], [0, 2, 57], [-2, 2, 56], [2, 2, 56], [-1, 3, 56], [0, 3, 57], [1, 3, 56], [0, 4, 56]];   // 向下箭头：色板红 57 / 暗红 56
  function drawMarks(n, fi, f12) {
    const y0 = HY - 45;
    if (fi >= 12 && (f12 & 1)) return;
    for (let k = 0; k < n; k++) {
      const x0 = DUMMY_X - 6 + k * 7, fresh = fi === LAND[k + 1];
      for (const [dx, dy, c] of MARK) put(x0 + dx, y0 + dy, fresh ? IR[0] : IR[c]);
    }
    const ax = DUMMY_X - 6 + n * 7 + 1;
    for (const [dx, dy, c] of ARROW) put(ax + dx, y0 + 2 + dy, c);
  }
  function spawnGrit(r) { const a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, DUMMY_X, CLOUD_Y, r / (0.5 + Math.random() * 0.35), 0, 9, R_IRON, { a, r, w: 3 + Math.random() * 2, tx: DUMMY_X, ty: CLOUD_Y + 1, squash: 0.45 }); }   // 铁砂从四周旋进目标头顶
  function onEnter(s) {
    if (s === CHARGE) { dim(DUR[CHARGE] + 0.05); for (let i = 0; i < 8; i++) spawnGrit(14 + (i / 8) * 10); }
    if (s !== CAST) return;
    poseAt(CAST, 0, 0); clearOrbit();                     // 杖往下一劈：杖头一点铁屑，铁雹第 1 波开始落
    const gx = wx(P.gx), gy = wy(P.gy);
    burst(gx, gy, 8, 30, 70, 0.15, 0.3, R_IRON, 4); fx.cross(gx, gy, 3, R_IRON, 0.15);
    shake(0.1, 1); flash(0.05);
  }
  function hailLand(w) {                                               // 一波砸地：每块铁刺溅火星 + 扬尘，目标脚下一圈铁灰冲击环
    for (const h of HAIL) if (h[3] === w) {
      const x = DUMMY_X + h[2];
      burst(x, HY - 1, 4, 30, 75, 0.12, 0.3, FXI.impact, 30);
      for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust);
    }
    ring(DUMMY_X, HY - 2, w === 2 ? 1 : 0, R_IRON); hitDummy(1); shake(0.16, 2);
    sfx('impact', { pal: 'metal', w: w === 2 ? 0.75 : 0.65 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy); shoot(1, mzX + 2, mzY, 165, DUMMY_X - 3, R_EL); burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_W1) hailLand(1);
    if (s === CAST && t === T_W2) hailLand(2);
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && t === T_MELT) {                                  // 长袍按列塌成一滩；光冠和杖不进快照，单独画
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); loot = 0; drawHero(); bakeHero(); loot = 1; bakeLoot(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.15, fadeDur: 0.5 }); lootT = 0;
      for (let i = 0; i < 8; i++) spawnX(K_RISE, HX - 8 + Math.random() * 16, HY - 2 - Math.random() * 10, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [T_W1, T_W2], [], [], [T_KNEE, T_MELT], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.25 && stT < 1.2) {               // 冷灰铁砂从四周旋进目标头顶，聚成铁雹云
      gritAcc += dt * 22;
      while (gritAcc >= 1) { gritAcc -= 1; spawnGrit(13 + Math.random() * 11); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.2 }); const sx = wx(-9 - (P.step < 0 ? 2 : 0)); spawn(K_DUST, sx + (Math.random() - 0.5) * 2, HY, (P.flip ? 1 : -1) * (6 + Math.random() * 8), -3 - Math.random() * 4, 0.3 + Math.random() * 0.2, FXI.dust); }   // 布带在身后扫出 1 格尘
      lastStep = P.step;
    }
    if (state === IDLE && !P.drop) { emberAcc += dt * 2; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_EL); } }
    if (lootT >= 0) {
      lootT += dt;
      if (lootT > 1.0 && lootT < 1.8) { mistAcc += dt * 26; while (mistAcc >= 1) { mistAcc -= 1; spawnX(K_RISE, HX - 12 + Math.random() * 22, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 8, -8 - Math.random() * 10, 0.9 + Math.random() * 0.6, R_EL, { age0: 0.45 }); } }   // 化成淡紫雾气
      if (lootT > 1.1 && lootT < 1.8) { soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 14, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.soul); } }
    }
    mzT += dt;
  }
  function fxReset() { mzT = 9; skF = 0; gritAcc = 0; emberAcc = 0; soulAcc = 0; mistAcc = 0; lastStep = 0; lootT = -1; }
  function crownDrop() {                                               // 光冠：塌的时候还悬在原处 0.25 s → 弧底落到那滩上（y = −2）弹一下 → 熄灭
    const t = lootT, top = crownY0, land = HALO_LIFT - 2 - top, fallQ = clamp01((t - 0.25) / 0.4);
    let dy = RD(land * fallQ * fallQ); if (t > 0.65 && t < 0.8) dy = RD(land - Math.sin((t - 0.65) / 0.15 * Math.PI) * 2);
    return dy;
  }
  function fxBack(f12) {
    if (!P.drop && P.dq < 1 && P.st !== CAST && P.st !== RECOVER) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);   // 劈下后不再有月辉映地
    if ((P.st === CHARGE && skF >= 8) || (P.st === CAST && skF < LAND[2])) {   // 落点：目标脚下 ±11 格一排铁灰点（小范围），两端各一个角
      for (let x = -11; x <= 11; x += 2) put(DUMMY_X + x, HY + 1, ((x + 11) >> 1) % 3 === ((f12 >> 1) % 3) ? IR[1] : IR[3]);
      put(DUMMY_X - 12, HY, IR[2]); put(DUMMY_X + 12, HY, IR[2]);
    }
  }
  function fxMid() {
    if (lootT < 0) return;
    const dq = clamp01((lootT - 1.2) / 0.5);
    blitOut(staffSpr, HX, HY, dq, 0);
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    drawHail(f12);
    if (P.gem >= 2 && P.gem <= 3 && !P.drop && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (lootT >= 0) { const dy = crownDrop(), out = lootT > 0.95 && !(lootT < 1.15 && (f12 & 1)); blitOut(out ? crownDark : crownSpr, HX, HY, clamp01((lootT - 1.25) / 0.5), dy); }
  }
  function drawHail(f12) {
    const cf = skF, fi = skF, inCharge = P.st === CHARGE, inCast = P.st === CAST || P.st === RECOVER;
    if (!inCharge && !inCast) return;
    for (let i = 0; i < HAIL.length; i++) {
      const [hx, hy, lx, w, sh, ap] = HAIL[i], X0 = DUMMY_X + hx, bob = ((cf + i * 3) & 3) < 2 ? 0 : 1;
      if (inCharge) { if (cf >= ap) drawShard(X0, hy + bob, sh, cf === ap ? 3 : 0, HY); continue; }   // 刚成形那一帧整块亮到最亮级
      if (fi < DROP[w]) { drawShard(X0, hy + bob, sh, 0, HY); continue; }                             // 第 2 波还悬着
      const X1 = DUMMY_X + lx;
      if (fi < LAND[w]) {                                                                             // 下落：两帧，越落越快，头上拖一道断续的速度线
        const q = FALLQ[fi - DROP[w]], x = RD(X0 + (X1 - X0) * q), y = RD(hy + (HY - hy) * q), top = y - 7, L = fi === DROP[w] ? 4 : 9;
        for (let k = 1; k <= L; k++) if (k & 1 || k < 3) put(x + (k > 5 ? 0 : 0), top - k, IR[k < 3 ? 2 : 3]);
        drawShard(x, y, sh, fi === DROP[w] ? 1 : 0, HY); continue;
      }
      const age = fi - LAND[w];                                                                       // 砸进地里：尖埋进去 3 格，露出上半截，停一会儿后闪烁消失
      if (age > 9 || (age > 6 && (f12 & 1))) continue;
      drawShard(X1, HY + 3, sh, age === 0 ? 1 : 0, HY);
    }
    if (inCast) { const n = (fi >= LAND[1] ? 1 : 0) + (fi >= LAND[2] ? 1 : 0); if (n && fi <= 13) drawMarks(n, fi, f12); }
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
    SFX: { body: 'flesh', how: 'collapse', pal: 'metal', style: 'blade', w: 0.5 },
    REVIVE: { dy: -14, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
