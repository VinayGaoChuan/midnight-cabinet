// 时间法师（部队 · 僵尸 · 法师 · 传说）：月光使徒升级而来的同一个僵尸苦修者——不再佝偻，挺直身子悬浮离地 3 格；
// 头后的月牙光冠长成一整圈竖立的星环（嵌 4 枚月相），月牙杖的月牙里托起一只会翻转的金框沙漏（淡紫星砂），
// 宽大的星纹斗篷（双肩宽出身体、下摆张开、金边、深色星空内衬），身前漂着 2 块带紫色裂纹的陨石碎片；嘴上的缝线和紫光眼保留。
// 攻击 = 双手横举沙漏杖，从沙漏里抛出一颗紫白星砂弹（抛物线）；技能 = 特性「小行星」配「魔法增幅」光环：
//   翻转沙漏、星砂逆着重力往上飞，脚下月辉法阵连到身边友军；左上天空的星门里砸下一颗紫色陨石；收招时 3 颗紫光点飞回沙漏（「智力」）。
// 死亡 = 化沙：沙漏炸裂 → 身体从头开始化成星砂往下流、在地上堆成小沙堆 → 星环碎成 4 片月相落地。
PCD.define('TimeMage', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, clearOrbit, fall, ring, shake, flash, dim, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow,
    groundShadow, allyPoints, allyFx, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：星陨（奥术）白 → 淡金 → 淡紫 → 紫 → 深紫；法力光环沿用上一级的月辉 ─────
  const R_EL = fxRamp('starfall', [21, 51, 43, 24, 42]), EL = FXR[R_EL];
  const R_MOON = fxRamp('moonglow', [21, 17, 60, 43, 42]), MOON = FXR[R_MOON];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    cape: { r: 'purple', band: 2 }, lining: [0, 0, 52, 25], star: { r: [25, 43, 51, 21], flat: 1 }, sleeve: [25, 42, 42, 24],
    robe: { r: 'shadow', band: 2 }, gold: 'gold', silver: [28, 30, 31, 21], iron: 'iron',
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],                  // 尸绿灰（僵尸人形共用）
    hair: 'stone', ink: { r: 'ink', flat: 1 }, rock: 'stone',
    eye: { r: [42, 43, 43, 21], flat: 1 },                                // 紫光眼（比上一级多亮一格）
    sand: { r: [42, 43, 51, 21], flat: 1 },                               // 星砂：1 熄灭 · 2 淡紫 · 3 淡金 · 4 白
    glass: { r: [0, 52, 59, 60], flat: 1 },                               // 沙漏玻璃（空的那一半）
    moon: { r: [42, 60, 17, 21], flat: 1 },                               // 星环上的月相
  });
  const BODY = { body: 'tall', leg: 11, sw: 4, neck: 2, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice(), FLY = 3;
  const hero = new Sprite(84, 64, 38, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['iron', 'skin', 'sand', 'eye', 'ink', 'hair', 'glass', 'star', 'lining', 'moon']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ═════ 自绘部件（通用的标了「候选部件」，以后收进库）═════
  const uvx = (q, u, v) => (q === 0 ? u : q === 1 ? -v : q === 2 ? -u : v), uvy = (q, u, v) => (q === 0 ? v : q === 1 ? u : q === 2 ? -v : -u);
  const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
  // 月牙（上一级的月牙杖头放大一圈，开口朝前；u 向前、v 向下，原点 = 套口）
  const CRES = [[2, -13, 0], [3, -13, 0], [4, -13, 4], [0, -12, 0], [1, -12, 0], [2, -12, 0], [-1, -11, 0], [0, -11, 0], [-2, -10, 0], [-1, -10, 0], [-2, -9, 0], [-1, -9, 0],
    [-3, -8, 0], [-2, -8, 0], [-1, -8, 0], [-3, -7, 0], [-2, -7, 0], [-1, -7, 0], [-3, -6, 0], [-2, -6, 0], [-1, -6, 0], [-2, -5, 0], [-1, -5, 0], [-2, -4, 0], [-1, -4, 0],
    [-1, -3, 0], [0, -3, 0], [0, -2, 0], [1, -2, 0], [2, -2, 0], [2, -1, 0], [3, -1, 0], [4, -1, 3]];
  const HG_C = [2, -7];                                                    // 沙漏中心
  // 沙漏（相对中心，5 宽 × 7 高）：上下金框横梁 5 格，玻璃上下两泡各 3×2、中间 1 格细腰；星砂格按 hg 状态填
  const HG_FRAME = [[-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3]];
  const HG_TOP = [[-1, -2], [0, -2], [1, -2], [-1, -1], [0, -1], [1, -1]], HG_NECK = [[0, 0]], HG_BOT = [[-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2]];
  // 星砂填法：hg 0 沙在下 · 1 侧翻（翻转中）· 2 倒过来沙在上 · 3 流一半 · 4 快流完 · 5 炸碎（只剩框）
  function hgSand(hg, x, y) {
    if (hg === 5) return -1;
    const top = y < 0, bot = y > 0;
    if (hg === 0 || hg === 1) return bot ? (y === 2 || x === 0 ? 1 : 0) : 0;
    if (hg === 2) return top ? 1 : 0;
    if (hg === 3) return (top && y === -1) || (bot && y === 2) || (x === 0 && y === 0) ? 1 : 0;
    if (hg === 4) return (bot && (y === 2 || x === 0)) || (x === 0 && y === 0) || (top && x === 0 && y === -1) ? 1 : 0;
    return 0;
  }
  // 候选部件：hourglassStaff —— 沙漏杖：铁杖身 + 杖顶银月牙（宽杖头，只按 90° 换朝向）+ 月牙两角之间托着的金框沙漏（星砂是发光体，和沙漏同一部件）。
  // o = { iron, silver, gold, glass, sand, len 握点到套口, back 握点后杖长, hg 沙漏状态 0–5, lv 星砂亮度 0–4, at / a / free, mirror }。读 P：hx hy a。
  // 返回 { socket, hg: 沙漏中心 }（精灵本地坐标）
  function staffGeo(o) {
    const gx = o.at ? o.at[0] : P.hx, gy = o.at ? o.at[1] : P.hy, a = o.a != null ? o.a : P.a, dx = Math.sin(a), dy = -Math.cos(a);
    const sx = RD(gx + dx * o.len), sy = RD(gy + dy * o.len), q = quad(a), mir = o.mirror != null ? !!o.mirror : q === 1, mu = mir ? -HG_C[0] : HG_C[0];
    return { gx, gy, dx, dy, sx, sy, q, mir, hg: [sx + uvx(q, mu, HG_C[1]), sy + uvy(q, mu, HG_C[1])] };
  }
  function hourglassStaff(R, o) {
    const G = staffGeo(o), T = o.free ? parts.FREE : R, q = G.q, mi = G.mir ? -1 : 1, P_ = (u, v) => [G.sx + uvx(q, u * mi, v), G.sy + uvy(q, u * mi, v)];
    E.part(); parts.line(E, T, G.gx - G.dx * o.back, G.gy - G.dy * o.back, G.sx, G.sy, o.iron, 3); { const b = [G.gx - G.dx * o.back, G.gy - G.dy * o.back]; parts.px(E, T, b[0], b[1], o.gold, 4); }
    { const c = P_(0, -1); parts.px(E, T, c[0], c[1], o.gold, 3); }        // 套口金箍
    E.part(); for (const [u, v, t] of CRES) { const c = P_(u, v); parts.px(E, T, c[0], c[1], o.silver, t); }
    E.part(); const cx = G.hg[0], cy = G.hg[1], side = o.hg === 1, lv = o.lv;
    const put_ = (u, v, m, t) => { const U = side ? -v : u, V = side ? u : v; parts.px(E, T, cx + uvx(q, U * mi, V), cy + uvy(q, U * mi, V), m, t); };
    for (const [u, v] of HG_FRAME) if (o.hg !== 5 || ((u + v) & 1)) put_(u, v, o.gold, u === -2 ? 4 : u === 2 ? 2 : 0);   // 炸碎时横梁只剩几截
    for (const c of HG_TOP.concat(HG_NECK, HG_BOT)) { const s = hgSand(o.hg, c[0], c[1]); if (s < 0) continue; put_(c[0], c[1], s ? o.sand : o.glass, s ? (lv === 4 ? 1 : lv >= 2 ? (c[1] === 0 ? 4 : 3) : lv === 1 ? 3 : 2) : (c[0] === -1 ? 4 : 3)); }
    return { socket: [G.sx, G.sy], hg: G.hg };
  }
  // 候选部件：starRing —— 头后一整圈竖立的星环（直径 13），环上嵌 4 枚月相（背后下方新月 → 头顶前方满月）。o = { mat 银, moon 月相材质, lit 0 平常 · 1 全亮, c 中心相对头中线 }
  const RING = [], PHASES = [[200, 0], [150, 1], [100, 2], [55, 3]];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const d = Math.hypot(dx, dy * 1.02); if (Math.abs(d - 6.2) < 0.55) RING.push([dx, dy]); }
  const PH_CELLS = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
  function phaseTone(ph, i, lit) {                                       // 月相：5 格圆点从左往右依次亮
    if (lit) return i === 0 ? 4 : 3; const x = PH_CELLS[i][0];
    return ph === 0 ? (i === 0 ? 2 : 1) : ph === 1 ? (x < 0 ? 4 : 1) : ph === 2 ? (x <= 0 ? (i === 0 ? 3 : 4) : 1) : (i === 0 ? 4 : 3);
  }
  function starRing(R, o) {
    E.part(); const cx = R.hx + (o.c == null ? -3 : o.c), cy = R.htop + 1;
    for (const [dx, dy] of RING) parts.px(E, R, cx + dx, cy + dy, o.mat, dy < -4 ? 4 : 0);
    E.part(); for (const [deg, ph] of PHASES) { const a = deg * Math.PI / 180, x = RD(cx + Math.cos(a) * 6.2), y = RD(cy - Math.sin(a) * 6.2); PH_CELLS.forEach((c, i) => parts.px(E, R, x + c[0], y + c[1], o.moon, phaseTone(ph, i, o.lit))); }
    return [cx, cy];
  }
  // 候选部件：starCape —— 宽大星纹斗篷（最先画）：外沿紫色隔点星纹，张开的下摆露出深色星空内衬（隔点亮星），下摆一圈金边 + 后角两缕金流苏。
  // o = { mat 外面, lining 内衬, star 亮星, trim 金边, flare 后飘宽度, bot 下摆行 }。读 P.sway（下摆摆）P.bend（后扬 0–3）
  function starCape(R, o) {
    E.part(); const top = R.yS - 1, bot = o.bot, n = Math.max(1, bot - top), sw = P.sway || 0, bd = P.bend || 0; let Lb = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, Math.max(R.yS, Math.min(R.yHip, y))), L = RD(e[0] - 1 - o.flare * Math.pow(t, 1.1) + sw * t * t - bd * t * t * 1.2), Rr = e[0] + 4;
      for (let x = L; x <= Rr; x++) {
        const inner = t > 0.4 && y < bot && x >= L + 2 && x <= e[0] - 1, h = hash(x * 7 + 3, y * 13 + 5);
        if (y === bot) { parts.px(E, R, x, y, (((x - RD(sw)) % 5) + 5) % 5 === 0 ? o.mat : o.trim, x === L ? 4 : 0); continue; }
        if (inner) parts.px(E, R, x, y, h < 0.14 ? o.star : o.lining, h < 0.14 ? (h < 0.05 ? 4 : 3) : 0);
        else parts.px(E, R, x, y, o.mat, h < 0.07 && x > L ? 4 : 0);
      }
      if (y === bot) Lb = L;
    }
    const b = RD(P.beard * 0.6);                                          // 后角两缕金流苏
    parts.px(E, R, Lb, bot + 1, o.trim, 3); parts.px(E, R, Lb + b, bot + 2, o.trim, 4); parts.px(E, R, Lb + 3, bot + 1, o.trim, 2); parts.px(E, R, Lb + 3 + b, bot + 2, o.trim, 3);
  }
  // 候选部件：wideMantle —— 宽肩短披（斗篷的肩部）：双肩各宽出躯干 3 格，背后立一道高领，下沿金边，前角垂一缕金流苏。o = { mat, trim, clasp }
  function wideMantle(R, o) {
    E.part(); const y0 = R.yS, b = RD(P.beard * 0.5);
    parts.run(E, R, y0 - 2, R.hx0 - 2, R.hx0 - 1, o.mat, 0); parts.run(E, R, y0 - 1, R.hx0 - 3, R.hx0, o.mat, 0); parts.px(E, R, R.hx0 - 2, y0 - 3, o.trim, 4);   // 高领
    for (let k = 0; k < 4; k++) { const e = parts.edges(R, y0 + k), L = e[0] - (k === 0 ? 2 : 3), Rr = e[1] + (k === 0 ? 2 : 3); parts.run(E, R, y0 + k, L, Rr, k === 3 ? o.trim : o.mat, k === 3 ? 0 : 0); if (k === 1) parts.px(E, R, L + 1, y0 + k, o.mat, 4); }
    const e = parts.edges(R, y0 + 3); parts.px(E, R, e[1] + 3, y0 + 4, o.trim, 3); parts.px(E, R, e[1] + 3 + b, y0 + 5, o.trim, 4);
    if (o.clasp) { parts.px(E, R, e[1], y0, o.clasp, 4); parts.px(E, R, e[1], y0 + 1, o.clasp, 2); }
  }
  // 候选部件：longSleeve —— 垂到膝下的喇叭长袖（和 MoonlightApostle.js 同一个部件）：袖身和挂在小臂下的大袖摆是同一个部件，再加袖口、手。
  // o = { side 'F' | 'B', at [x, y] 手, mat 袖, cuff 袖口, hand 手（缺省不画）, drop 袖摆最低行 }。读 P.beard
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
    for (let yy = fy0; yy <= fy1; yy++) if ((yy & 1) === 0) parts.px(E, R, fx + RD(b * 0.5 * (yy - fy0) / Math.max(1, fy1 - fy0)), yy, o.mat, 2);
    if (o.cuff) { E.part(); for (let yy = RD(wy) - 1; yy <= Math.min(bot, RD(wy) + 3); yy++) parts.px(E, R, RD(wx) + (yy > RD(wy) + 1 ? RD(b * 0.5) : 0), yy, o.cuff, yy === RD(wy) - 1 ? 4 : 0); }
    if (o.hand) { E.part(); parts.rect(E, R, hx - 1, hy - 1, 2, 2, o.hand, 0); parts.px(E, R, hx - 1, hy - 1, o.hand, 4); }
  }
  // 候选部件：orbitShard —— 绕身转的陨石碎片（4×4 切角石块 + 一道斜贯的紫色裂纹，裂纹是发光体）：P.orb 8 个相位，
  // 下半圈在身前（后画）、上半圈在身后（先画）；半径 13，转到两侧时整块伸出斗篷轮廓；每换一个相位石块转 90°（翻滚）。
  const ORB_R = 13, ORB_Y = -13;
  const SHARD = [[0, -2, 4], [1, -2, 3], [-1, -1, 4], [0, -1, 0], [1, -1, 0], [2, -1, 2], [-2, 0, 3], [-1, 0, 0], [0, 0, 0], [1, 0, 0], [2, 0, 2], [-1, 1, 0], [0, 1, 0], [1, 1, 2], [0, 2, 2]];
  const CRACK = [[-1, -1], [0, 0], [1, 1]];
  function shardPos(k) { const a = (P.orb + k * 4) * Math.PI / 4; return [RD(Math.cos(a) * ORB_R), RD(ORB_Y + Math.sin(a) * 3), Math.sin(a) > 0.01]; }
  function orbitShards(R, front) {
    if (P.orb > 7) return;
    for (let k = 0; k < 2; k++) {
      const [x, y, f] = shardPos(k); if (f !== front) continue;
      const r = (P.orb + k) & 3, rx = (u, v) => (r === 0 ? u : r === 1 ? -v : r === 2 ? -u : v), ry = (u, v) => (r === 0 ? v : r === 1 ? u : r === 2 ? -v : -u);
      E.part(); for (const [u, v, t] of SHARD) parts.px(E, R, x + rx(u, v), y + ry(u, v), M.rock, t);
      const lit = P.gem >= 2 ? 4 : 3; CRACK.forEach(([u, v], i) => parts.px(E, R, x + rx(u, v), y + ry(u, v), M.sand, i === 1 ? lit : lit - 1));
    }
  }

  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, hg: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, fly: 0, hold: 0, orb: 0, ring: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, hold) => ({ hx, hy, a, lean: lean || 0, head: head || 0, hold: hold == null ? 1 : hold });
  const K_IDLE = K(9, -15, 0.05);
  const K_WIND = K(6, -17, HALF, -1, 0);                  // 双手横握沙漏杖，收到胸前
  const K_FLICK = K(9, -23, 1.2, 1, 1);                   // 横举过头，往前上方一抛
  const K_HOLD = K(9, -21, 1.3, 1, 0);
  const K_CHARGE = K(9, -19, 0, 0, -1);                   // 立杖于身前，仰头
  const K_CAST = K(8, -26, -0.2, -1, -1);                 // 高举沙漏杖定格
  const K_HURT = K(7, -13, 0.15, -1, -1);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['fly', 0, 7]]);
  const KEY2 = parts.keyer([['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['hg', 0, 5], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['hold', 0, 1], ['orb', 0, 8], ['ring', 0, 2], ['walk', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], FLY_MOVE = [3, 4, 3, 2], HG_FLIP = [1, 2, 3, 4, 0];
  const T_FLICK = 2 / 12, T_BURST = INCOMING + 0.34, T_SAND = INCOMING + 0.5, SAND_DUR = 1.0, T_RING = INCOMING + 1.55;
  const STAFF = { iron: M.iron, silver: M.silver, gold: M.gold, glass: M.glass, sand: M.sand, len: 8, back: 12 };

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.hg = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.walk = 0;
    P.fly = FLY; P.hold = 1; P.orb = Math.floor(TT / 0.3 + 1e-6) & 7; P.ring = 0; P.crouch = 0; P.lying = 0; P.step = 0; P.wup = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.fly = FLY + (b & 1); P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.hg = HG_FLIP[f]; P.a += f === 0 ? 0.3 : 0; P.glint = f === 1 ? 1 : 0; P.gem = f >= 1 && f <= 3 ? 1 : 0; }   // 待机个性：一转杖，沙漏倒过来，星砂往下流
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 悬浮滑移：前倾 1 格平移，4 帧上下飘，斗篷下摆向后飘
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.walk = 1; P.fly = FLY_MOVE[f]; P.sway = [-1, -2, -1, 0][f]; P.bend = [2, 3, 2, 1][f]; P.beard = [-1, -2, -1, 0][f]; P.lean = 1; P.a = 0.12;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; P.fly = FLY + 1; }
      else if (tq < 0.45) { setK(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; P.bend = 2; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                      // 星砂逆着重力往上流（沙漏 0 → 4 → 3 → 2），星环月相亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2);
      P.hg = tq < 0.35 ? 0 : tq < 0.7 ? 4 : tq < 1.05 ? 3 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.9 ? 2 : 3; P.ring = tq > 0.5 ? 1 : 0; P.fly = FLY + (tq > 0.7 ? 1 : 0);
    } else if (st === CAST) { setK(K_CAST, K_CAST, 0); if (tq < 1 / 12) P.hy -= 1; P.beard = -2; P.sway = -1; P.bend = 3; P.hg = 2; P.gem = 3; P.rim = 3; P.ring = 1; P.fly = FLY + 1; }
    else if (st === RECOVER) {                                       // 沙漏翻回，杖放下
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q); P.bend = 1 + RD(2 * (1 - q));
      P.hg = tq < 3 / 12 ? 2 : tq < 4 / 12 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.ring = q < 0.4 ? 1 : 0; P.fly = FLY + (q < 0.5 ? 1 : 0);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.fly = FLY - 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 受击 → 沙漏炸裂、失去浮力沉到地上 → 从头开始化成星砂往下流（星环单独悬着，最后碎成 4 片月相）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < T_BURST - INCOMING) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; P.fly = 2; }
      else {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.bend = 0; P.hg = 5; P.gem = 4; P.orb = 8; P.head = 1; P.lean = 1; P.hy += 2; P.a = 0.4;
        P.fly = d < T_BURST - INCOMING + 1 / 12 ? 1 : 0;
        if (d >= T_SAND - INCOMING) { P.ring = 2; P.dq = clamp01((d - (T_SAND - INCOMING)) / SAND_DUR); }
      }
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head);
    { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.bhx = RD(P.hx - dx * 6); P.bhy = RD(P.hy - dy * 6); }   // 双手握杖：后手在前手下方（横握时在后方）6 格
    const G = staffGeo(STAFF); P.gx = G.hg[0] + P.bx; P.gy = G.hg[1] - P.fly;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, -P.fly); const R = parts.rig(P, BODY);
    if (P.ring !== 2) starRing(R, { mat: M.silver, moon: M.moon, lit: P.ring === 1 });
    starCape(R, { mat: M.cape, lining: M.lining, star: M.star, trim: M.gold, flare: 9, bot: -1 });
    orbitShards(R, false);
    longSleeve(R, { side: 'B', at: [P.bhx, P.bhy], mat: M.sleeveD, cuff: M.goldD, drop: -8 });
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.gold, belt: M.gold, buckle: M.gold, hem: 0, flare: 3, flareF: 2 });
    wideMantle(R, { mat: M.cape, trim: M.gold, clasp: M.gold });
    const H = parts.head(E, R, P, { mat: M.skin, face: 'gaunt', eye: M.eye, eyeStyle: 'glow', nose: 'hook', mouth: 'none', ear: 'dot', age: 'old' });
    for (let y = R.hy + 1; y < R.yS; y++) parts.run(E, R, y, R.hx - 1, R.hx, M.skin, y === R.hy + 1 ? 2 : 0);   // 脖子（和脸同一个部件）
    { const r = H.bot - 1, x1 = H.x1; for (let x = x1 - 3; x <= x1; x++) { const odd = (x1 - x) & 1; parts.px(E, R, x, r, odd ? M.ink : M.skin, odd ? 0 : 4); parts.px(E, R, x, r + 1, odd ? M.skin : M.ink, odd ? 3 : 0); } }   // 缝死的嘴（同一个人）
    if (!P.eyes) parts.px(E, R, H.x1, H.ey - 1, M.eye, 2);                // 紫光往上溢一格：比上一级更亮
    parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 1 });
    hourglassStaff(R, { ...STAFF, hg: P.hg, lv: P.gem });
    parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    longSleeve(R, { at: [P.hx, P.hy], mat: M.sleeve, cuff: M.gold, hand: M.skin, drop: -7 });
    orbitShards(R, true);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 死亡：星环单独烤成精灵（身体化沙时它还悬着），化沙的像素表（每格的消失阈值，和烘焙的消散同一个公式）─────
  const ringSpr = new Sprite(hero.w, hero.h, hero.ox, hero.oy), PLAIN = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  const sandPx = [];                                                 // [x, y, 阈值]（本地坐标）
  let ringC = [0, 0], dqPrev = 0;
  function snapSand() {
    poseAt(DEATH, T_SAND, T_SAND); P.dq = 0; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
    const s = hero, o = s.out; let top = s.h, bot = -1; sandPx.length = 0;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (o[y * s.w + x] !== 255) { if (y < top) top = y; if (y > bot) bot = y; }
    const span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) for (let x = 0; x < s.w; x++) if (o[y * s.w + x] !== 255) sandPx.push([x - s.ox, y - s.oy, B8[(y & 7) * 8 + (x & 7)] * 0.55 + (y - top) / span * 0.45]);
    const R = parts.rig(P, BODY); E.begin(ringSpr, P.bx, -P.fly); ringC = starRing(R, { mat: M.silver, moon: M.moon, lit: false }); bake(ringSpr, PLAIN); ringC = [ringC[0] + P.bx, ringC[1] - P.fly];
    dqPrev = 0;
  }
  function blitOut(s, X, Y, dq) { const o = s.out; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, Y - s.oy + y, c); } }
  const heapY = (x) => HY - Math.max(0, RD(3 - Math.abs(x - (HX - 2)) / 3.2));   // 沙堆：中间高 3 格

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, grainAcc = 0, gateT = 9, sandT = -1, ringT = -1, lastTap = -1;
  const shot = { on: 0, t: 0, x0: 0, y0: 0, x1: 0, y1: 0, T: 0.36, vy: 0, g: 500 }, met = { on: 0, t: 0, T: 0.3 };
  const GATE = [46, 12], MET_TO = [DUMMY_X, HY - 12];
  const shards = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, vx: 0, vy: 0, rest: 0, ph: 0 }));
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CHARGE) {                                             // 法力光环：月辉法阵 + 连到身边友军 + 友军描边；天空压暗；星门开始张开
      dim(DUR[CHARGE] + DUR[CAST] + 0.1); gateT = 0;
      fx.circle(HX + 1, HY + 1, 15, 3, R_MOON, 2.4, 1, 0); allyFx({ dur: 2.5, outline: R_MOON });
      poseAt(CHARGE, 0.8, 0.8); const hx = wx(P.gx), hy = wy(P.gy); poseAt(CHARGE, 0, 0);
      for (const a of allyPoints()) fx.link(hx, hy + 3, a.x, a.top + 2, R_MOON, 2.3, 2);   // 月辉连线：沙漏 → 友军头顶
    }
    if (s === CAST) {
      poseAt(CAST, 0, 0); const gx = wx(P.gx), gy = wy(P.gy);
      releaseOrbit(40, 90, 0.3, 0.6, { ramp: R_EL }); burst(gx, gy, 18, 40, 100, 0.25, 0.5, R_EL, 8); fx.cross(gx, gy, 6, R_EL, 0.3);
      fx.cross(GATE[0], GATE[1], 9, R_EL, 0.35); burst(GATE[0], GATE[1], 20, 30, 90, 0.3, 0.6, R_EL, 0);
      met.on = 1; met.t = 0; shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) {                                            // 「智力」：碎石里飘起 3 颗紫光点飞回沙漏
      poseAt(RECOVER, 0.6, 0.6); const tx = wx(P.gx), ty = wy(P.gy); poseAt(RECOVER, 0, 0);
      for (let i = 0; i < 3; i++) { const r = Math.hypot(DUMMY_X - 4 + i * 4 - tx, HY - 6 - ty), a = Math.atan2(HY - 6 - ty, DUMMY_X - 4 + i * 4 - tx); spawnX(K_SPIRAL_PT, tx, ty, r / (0.5 + i * 0.08), 0, 9, R_EL, { a, r, w: 1.2 + i * 0.4, tx, ty, squash: 1 }); }
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                            // 横举一抛：星砂弹从沙漏里飞出（抛物线）
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy); burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 6);
      shot.on = 1; shot.t = 0; shot.x0 = mzX + 1; shot.y0 = mzY; shot.x1 = DUMMY_X - 3; shot.y1 = HY - 15; shot.vy = (shot.y1 - shot.y0 - 0.5 * shot.g * shot.T * shot.T) / shot.T;
      sfx('swing', { kind: 'staff', w: 0.35 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === DEATH && t === T_BURST) {                             // 沙漏炸裂：金框碎片 + 星砂
      const x = wx(P.gx), y = wy(P.gy); burst(x, y, 14, 40, 110, 0.25, 0.6, R_EL, 20); burst(x, y, 8, 30, 90, 0.2, 0.45, FXI.coin, 24); fx.cross(x, y, 5, R_EL, 0.2);
      for (let k = 0; k < 2; k++) fall(HX + (k ? 8 : -8), HY - 12, k ? 20 : -20, -30, HY, FXI.dust, 2);   // 陨石碎片掉到地上
      shake(0.12, 1); sfx('fall', { w: 0.25 });
    }
    if (s === DEATH && t === T_SAND) { snapSand(); sandT = 0; }
    if (s === DEATH && t === T_RING) {                               // 星环碎成 4 片月相落地
      ringT = 0; const cx = HX + ringC[0], cy = HY + ringC[1];
      PHASES.forEach(([deg], i) => { const a = deg * Math.PI / 180, S = shards[i]; S.x = cx + Math.cos(a) * 6.2; S.y = cy - Math.sin(a) * 6.2; S.vx = Math.cos(a) * 25 + (i - 1.5) * 6; S.vy = -30 - Math.sin(a) * 20; S.rest = 0; S.ph = i; });
      burst(cx, cy, 16, 30, 80, 0.2, 0.5, R_MOON, 6);
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [], [], [], [T_BURST, T_SAND, T_RING], []];
  function meteorHit() {                                             // 陨石落地：地裂 + 两道冲击浪 + 大冲击环 + 40 颗外爆 + 碎石落地成尘
    const x = MET_TO[0], y = MET_TO[1];
    fx.crack(x - 2, HY + 1, 18, -1, R_EL, 1.1); fx.crack(x + 2, HY + 1, 14, 1, R_EL, 1.1);
    fx.wave(x - 3, HY, -1, 20, 6, R_EL, 0.6, 2); fx.wave(x + 3, HY, 1, 18, 5, R_EL, 0.6, 2);
    ring(x, y, 1, R_EL); burst(x, y, 40, 60, 160, 0.3, 0.8, R_EL, 22); fx.cross(x, y, 7, R_EL, 0.25);
    for (let i = 0; i < 10; i++) fall(x - 6 + Math.random() * 12, y + 2, (Math.random() - 0.5) * 110, -110 - Math.random() * 90, HY, FXI.dust, i % 3 === 0 ? 2 : 1);
    hitDummy(1); dummyFx({ dur: 1.1, sink: 1 }); shake(0.14, 1);
    sfx('impact', { pal: 'time', w: 0.9 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                          // 星砂逆着重力从沙漏往上飞；紫光点螺旋汇进沙漏
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1;
        if (Math.random() < 0.5) spawnX(K_PHYS, gx + RD(Math.random() * 4 - 2), gy - 2, (Math.random() - 0.5) * 10, -10 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL, { g: -60 });
        else { const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      }
    }
    if (state === MOVE) { grainAcc += dt * 16; while (grainAcc >= 1) { grainAcc -= 1; spawnX(K_PHYS, wx(-6 + Math.random() * 10), HY - P.fly - 1, (P.flip ? 1 : -1) * (4 + Math.random() * 8), 6 + Math.random() * 6, 0.55 + Math.random() * 0.3, R_EL, { g: 50, age0: 0.12 + Math.random() * 0.2, floor: HY }); } }   // 身下一路落星砂（落地后走完色阶，不扬尘）
    if (state === IDLE) {
      emberAcc += dt * 2; while (emberAcc >= 1) { emberAcc -= 1; spawnX(K_PHYS, gx + RD(Math.random() * 2 - 1), gy + 4, (Math.random() - 0.5) * 4, 6, 0.5 + Math.random() * 0.4, R_EL, { g: 30, age0: 0.25 }); }
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastTap) { if (f === 1) burst(gx, gy, 5, 15, 35, 0.15, 0.35, R_EL, 4); lastTap = f; }
    }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 8, 0.6 + Math.random() * 0.6, R_EL); } }
    if (shot.on) {                                                   // 星砂弹：抛物线 + 一路掉沙粒
      shot.t += dt; const t = Math.min(shot.t, shot.T), x = shot.x0 + (shot.x1 - shot.x0) * t / shot.T, y = shot.y0 + shot.vy * t + 0.5 * shot.g * t * t;
      if (Math.random() < 0.7) spawnX(K_PHYS, x - 2, y + Math.random() * 2 - 1, -10 - Math.random() * 10, 0, 0.35 + Math.random() * 0.25, R_EL, { g: 70, age0: 0.15 });
      if (shot.t >= shot.T) { shot.on = 0; burst(shot.x1, shot.y1, 10, 40, 90, 0.15, 0.4, R_EL, 10); fx.cross(shot.x1, shot.y1, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.35 }); }
    }
    if (met.on) {                                                    // 陨石：星门 → 目标，斜 45° 落下，紫焰尾
      met.t += dt; const q = Math.min(1, met.t / met.T), x = GATE[0] + (MET_TO[0] - GATE[0]) * q, y = GATE[1] + (MET_TO[1] - GATE[1]) * q;
      for (let i = 0; i < 3; i++) { const j = (Math.random() - 0.5) * 4; spawnX(K_BURST, x - 4 - Math.random() * 3 + j, y - 4 - Math.random() * 3 - j, -20 - Math.random() * 20, -20 - Math.random() * 20, 0.25 + Math.random() * 0.25, R_EL, {}); }
      if (met.t >= met.T) { met.on = 0; meteorHit(); }
    }
    if (sandT >= 0) {                                                // 化沙：像素消失的地方落下星砂，堆成小沙堆
      sandT += dt; const dq = clamp01(q12(sandT) / SAND_DUR);
      if (dq > dqPrev) { for (const [x, y, th] of sandPx) if (th > dqPrev && th <= dq && hash(x * 5 + 11, y * 3 + 7) < 0.3) { const X = HX + P.mx + x, Y = HY + y; spawnX(K_PHYS, X, Y, (Math.random() - 0.5) * 6, 18 + Math.random() * 14, 1.3 + Math.random() * 0.6, R_EL, { g: 160, floor: heapY(X), age0: 0.18 }); } dqPrev = dq; }
      if (sandT > 1.3 && sandT < 2.0) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 16, HY - 2 - Math.random() * 3, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.soul); } }
    }
    if (ringT >= 0) {
      ringT += dt;
      for (const S of shards) { if (S.rest) continue; S.vy += 320 * dt; S.x += S.vx * dt; S.y += S.vy * dt; if (S.y >= HY - 1) { S.y = HY - 1; if (S.vy < 50) { S.rest = 1; } else { S.vy *= -0.35; S.vx *= 0.5; } } }
    }
    mzT += dt; gateT += dt;
  }
  function fxReset() { mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; grainAcc = 0; gateT = 9; sandT = -1; ringT = -1; lastTap = -1; shot.on = 0; met.on = 0; dqPrev = 0; }
  // 候选部件：hoverShadow —— 悬浮影子（特效层，画在 fxBack）：比 groundShadow 宽一档、深一级（中段墨色 + 下一行暗石），离地越高越窄。(x 中心, alt 离地格数)
  function hoverShadow(x, alt) {
    const w = Math.max(6, 14 - alt);
    for (let dx = -w; dx <= w; dx++) { const a = Math.abs(dx); put(x + dx, HY + 1, a <= w - 4 ? 0 : a <= w - 1 ? 8 : 9); if (a <= w - 2) put(x + dx, HY + 2, a <= w - 5 ? 8 : 9); }
  }
  function fxBack(f12) {
    if (P.dq < 1 && sandT < 0) hoverShadow(wx(-2), P.fly);
    if (sandT < 0) floorGlow(wx(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
    if (gateT < DUR[CHARGE] + DUR[CAST] + 0.45) {                     // 星门：左上天空一个慢慢张开的紫色圆环（刻点旋转），施放时闪白，收招时合上
      const T0 = DUR[CHARGE], r = gateT < 0.3 ? 0 : gateT < T0 ? 1.5 + 5.5 * ease.out((gateT - 0.3) / (T0 - 0.3)) : gateT < T0 + DUR[CAST] ? 7 : 7 * (1 - clamp01((gateT - T0 - DUR[CAST]) / 0.45));
      if (r >= 1) {
        const n = Math.ceil(r * 6.3), bright = gateT >= T0 && gateT < T0 + 2 / 12;
        for (let i = 0; i < n; i++) { const a = i / n * 6.2832; put(RD(GATE[0] + Math.cos(a) * r), RD(GATE[1] + Math.sin(a) * r), bright ? EL[0] : ((i + f12) % 4 === 0 ? EL[1] : EL[3])); }
        for (let k = 0; k < 4; k++) { const a = gateT * 2.5 + k * HALF, rr = r * 0.6; put(RD(GATE[0] + Math.cos(a) * rr), RD(GATE[1] + Math.sin(a) * rr), EL[2]); }
        if (r > 3) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!(dx && dy)) put(GATE[0] + dx, GATE[1] + dy, bright ? EL[0] : EL[4]);
      }
    }
  }
  function fxMid() {
    if (sandT >= 0 && ringT < 0) blitOut(ringSpr, HX + P.mx, HY, 0);
  }
  // 陨石本体（半径 3.3 的圆盘，迎风面 = 右下）：[dx, dy, 色阶级]；尾巴（沿左上方向的实心锥）：[dx, dy, 离中心的距离, 横向偏移]
  const MET = [], MET_TAIL = [];
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const d = Math.hypot(dx, dy), u = (dx + dy) / Math.SQRT2;
    if (d <= 3.3) MET.push([dx, dy, d <= 1.3 ? 0 : d <= 2.4 ? (u > -0.2 ? 0 : 1) : u > 0.8 ? 1 : u > -1.2 ? 2 : u > -2.4 ? 3 : 4]);
  }
  for (let dy = -16; dy <= 2; dy++) for (let dx = -16; dx <= 2; dx++) {
    const al = -(dx + dy) / Math.SQRT2, ac = (dx - dy) / Math.SQRT2, w = 3.2 * (1 - al / 15);
    if (al > 2.2 && al < 14 && Math.abs(ac) < w && Math.hypot(dx, dy) > 3.3) MET_TAIL.push([dx, dy, al, ac]);
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 4; r <= L; r++) { const c = P.gem === 3 ? (r <= 4 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 4 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (shot.on) { const t = shot.t, x = RD(shot.x0 + (shot.x1 - shot.x0) * t / shot.T), y = RD(shot.y0 + shot.vy * t + 0.5 * shot.g * t * t); put(x, y, EL[0]); put(x + 1, y, EL[0]); put(x, y + 1, EL[1]); put(x + 1, y + 1, EL[1]); put(x - 1, y, EL[2]); put(x + 2, y, EL[2]); put(x, y - 1, EL[2]); put(x + 1, y + 2, EL[3]); put(x - 2, y + (f12 & 1), EL[3]); }
    if (met.on) {                                                    // 6–7 格陨石：白芯 + 淡金迎风面、紫壳、背风面深紫；身后斜向上一条逐渐收窄的紫焰尾
      const q = Math.min(1, met.t / met.T), x = RD(GATE[0] + (MET_TO[0] - GATE[0]) * q), y = RD(GATE[1] + (MET_TO[1] - GATE[1]) * q);
      for (const [dx, dy, al, ac] of MET_TAIL) { if (al > 9 && ((dx * 3 + dy * 5 + f12) & 3) === 0) continue; put(x + dx, y + dy, al < 5 ? EL[al < 3.5 && Math.abs(ac) < 1 ? 1 : 2] : al < 9 ? EL[3] : EL[4]); }
      for (const [dx, dy, c] of MET) put(x + dx, y + dy, EL[c]);
    }
    if (ringT >= 0) {                                                // 4 片月相碎片：落地弹一下，躺着，然后抖动消散
      const dq = clamp01((ringT - 0.55) / 0.5);
      shards.forEach((S, i) => { const X = RD(S.x), Y = RD(S.y); PH_CELLS.forEach((c, j) => { if (B8[((Y + c[1]) & 7) * 8 + ((X + c[0]) & 7)] < dq) return; const t = phaseTone(S.ph, j, false); put(X + c[0], Y + c[1], t === 4 ? 17 : t === 3 ? 60 : t === 2 ? 28 : 42); }); });
    }
  }

  return {
    name: '时间法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.sand, M.eye, M.moon, M.star], HIT_POINT: [2, -17], EVENTS,
    ALLIES: 'skill',
    SFX: { body: 'flesh', how: 'dissolve', pal: 'time', style: 'meteor', w: 0.85, hover: 1 },
    REVIVE: { dy: -17, ramp: R_EL, big: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
