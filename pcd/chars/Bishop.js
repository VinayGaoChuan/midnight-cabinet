// 主教（部队 · 人类 · 射手 · 神话）：惩戒牧师升级后的同一个人——剃顶、头后日轮光环（放大成双圈、24 根芒）、金香炉（挂到腰间）、白袍金饰、日耀元素都保留；
// 长高、离地悬浮 3 格，戴白底金边的高主教冠（尖顶分叉、背后两条深红冠带），披金色大斗篷（深红内衬、白色日轮刺绣），白袍下摆收成一个尖；
// 双手持比身体还高的日轮权杖（金杖身，杖顶宝珠 + 大日盘 + 8 根放射芒）。
// 攻击 = 权杖前指，日盘射出一道直线净化光束（特性「净化光束」），假人四周 10 格日点环亮一格；
// 技能 = 特性「超级太阳耀斑」+「净化光束」叠层：升空举杖、脚下日晷法阵、光环 24 根芒逐根点亮 → 日冕爆开 → 净化光束连射三段（1 → 2 → 3 格宽），日点环 1 → 10 填满。
// 死亡 = 坠落升天：失去浮力坠地 → 双膝跪住、权杖倒向身前、主教冠掉落滚开 → 从冠顶化成日耀光点飘走（死亡套件 ash），光环碎成金屑落下。
PCD.define('Bishop', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_DUST, K_STILL, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：日耀（和惩戒牧师同一色阶）─────
  const R_EL = fxRamp('solar', [21, 51, 47, 14, 61]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'white', band: 2 }, sleeve: 'white', mitre: 'white', cape: { r: 'gold', band: 2 }, lining: 'crimson', gold: 'gold',
    skin: 'skin', hair: 'boot', ink: { r: 'ink', flat: 1 }, chain: 'leather',
    jewel: { r: [11, 13, 26, 58], flat: 1 },               // 冠上 / 扣上的深红宝石
    sun: { r: [61, 14, 47, 51], flat: 1 },                 // 光环 / 日盘 / 宝珠 / 香炉余烬：1 熄灭 · 2 平时 · 3 日黄 · 4 淡金
    hot: { r: [51, 51, 21, 21], flat: 1 },                 // 白热
  });
  const BODY = { body: 'tall', fall: 'back' }, R0 = parts.rig({}, BODY);
  const HX = 34, DUR = DEFAULT_DUR.slice(), FLY = 3; DUR[RECOVER] = 1.2;   // 收招加长：三段光束的后两段在收招前段
  const hero = new Sprite(78, 66, 38, 61);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 32, 34], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'ink', 'sun', 'hot', 'jewel', 'chain', 'hair', 'gold', 'lining']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  // 日轮权杖：握点往上 14.5 格是杖顶，日盘圆心在握点上 17 格；往下 18 格是杖尾——待机时杖尾落到袍尖以下（离地 0 格），整根杖（杖尾到日盘环顶）41 格，比主教（冠顶到袍尖 36 格）高
  const STAFF = { style: 'orb', wood: M.gold, trim: M.gold, gem: M.sun, glow: M.hot, len: 14.5, back: 18 };
  const DROP = { at: [12, -3], a: 1.47 };                       // 倒在身前地上的权杖：杖尾贴地，日盘的下芒碰地

  // ═════ 自绘部件（通用的标了「候选部件」，以后收进库）═════
  const ringPts = (r) => { const s = new Set(), out = []; const n = Math.ceil(r * 8); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, x = RD(Math.cos(a) * r), y = RD(Math.sin(a) * r), key = x * 64 + y; if (!s.has(key)) { s.add(key); out.push([x, y]); } } return out; };
  const RING_IN = ringPts(2.2), RING_OUT = ringPts(4.0), RING_DISC = ringPts(3.0);
  // 候选部件：duoHalo —— 头后的双圈日轮光环：内环半径 2.2 + 外环半径 4 + 24 根芒（半径 5.1；每 4 根有 1 根长芒伸到 6.1，长芒随 P.spin 一格一格换 = 缓慢转动）。
  // 芒就是法力格：从后下方经头顶到前方逐根点亮。全部 flat（发光体）。参数：T 落笔变换、cx cy 圆心。读 P：mana hl spin st
  function rayTone(i) {
    if (P.hl === 3) return [M.hot, 3];
    if (P.hl === 0) return [M.sun, 3];
    if (i < P.mana) return [M.sun, 4];
    return [M.sun, P.st === CHARGE || P.st === DEATH ? 1 : 2];
  }
  function duoHalo(T, cx, cy) {
    E.part(); const hot = P.hl === 3;
    for (const [x, y] of RING_OUT) parts.px(E, T, cx + x, cy + y, M.sun, hot ? 4 : x < 0 && y < 0 ? 3 : 2);
    for (const [x, y] of RING_IN) parts.px(E, T, cx + x, cy + y, M.sun, hot ? 4 : 1);     // 内环暗一级，两圈才分得开
    for (let i = 0; i < 24; i++) {
      const a = (120 + i * 15) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), [m, t] = rayTone(i);
      parts.px(E, T, cx + RD(c * 5.1), cy + RD(s * 5.1), m, t);
      if (((i + P.spin) & 3) === 0) parts.px(E, T, cx + RD(c * 6.1), cy + RD(s * 6.1), m === M.hot ? M.sun : m, m === M.hot ? 4 : t >= 3 ? t - 1 : t);
    }
  }
  // 候选部件：sunDisc —— 权杖顶的大日盘：直径 7 的金盘（中间让出 3×3 宝珠）+ 8 根 2 格放射芒。lv 用宝珠的发光档（0 平时 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）。
  function sunDisc(T, c, lv) {
    E.part(); const hot = lv === 3, dead = lv === 4;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) continue; const d = Math.hypot(dx, dy); if (d < 2.5) parts.px(E, T, c[0] + dx, c[1] + dy, M.sun, dead ? 1 : hot ? 4 : lv >= 1 ? 4 : 3); }
    for (const [x, y] of RING_DISC) parts.px(E, T, c[0] + x, c[1] + y, M.sun, dead ? 1 : hot ? 4 : x < 0 && y < 0 ? 3 : 2);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, cs = Math.cos(a), sn = Math.sin(a);
      parts.px(E, T, c[0] + RD(cs * 4.2), c[1] + RD(sn * 4.2), dead ? M.sun : hot ? M.hot : M.sun, dead ? 1 : 3);
      parts.px(E, T, c[0] + RD(cs * 5.2), c[1] + RD(sn * 5.2), M.sun, dead ? 1 : hot ? 4 : 2); }
  }
  // 候选部件：mitre —— 主教冠（6 格高）：金冠箍、白冠身、中间一道金冠纹、前面一颗深红宝石、两只尖顶之间分叉。
  // 戴着：画在头之后（头饰坐标 u = 头中线、v = 0 是头顶上一行）；掉在地上：o.at + o.rot 翻滚档（整 90°）。
  // 从 v = −6 到 v = 0，u = −3..3：两只尖顶之间的缺口 3 格宽、2 行深（v −6、−5），第 3 行（v −4）中间再空 1 格——
  // 勾线会把缺口两侧各填 1 格，这样剪影里还剩一道 1 格宽、2 行深的 V 口（顶上勾线行 3 格宽），分叉看得出来；
  // 每只尖顶底宽 2 格、尖在内侧，往中间收。白冠身在金光环前面要读得出来，金只用在冠箍、竖冠纹和尖顶的金尖。
  const MITRE = ['.W...W.', 'WW...WW', 'WWW.WWW', 'WWWOWWW', 'WWOJOWW', 'WWWOWWW', 'BBBBBBB'];
  function mitre(R, o) {
    E.part(); const T = o.at ? { r0: o.rot & 3, tx: o.at[0], ty: o.at[1], rot: 0, ox: 0, oy: 0 } : { r0: 0, tx: R.hx, ty: R.htop - 1, rot: R.rot, ox: R.ox, oy: R.oy };
    const MAT = { W: [M.mitre, 0], O: [M.gold, 3], J: [M.jewel, 3], B: [M.gold, 0] };
    MITRE.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const e = MAT[row[c]]; if (e) parts.px(E, T, c - 3, r - 6, e[0], e[1]); } });
    parts.px(E, T, 0, -2, M.jewel, 4); parts.px(E, T, -2, -6, M.gold, 4); parts.px(E, T, 2, -6, M.gold, 4);   // 宝石高光、两个尖顶的金尖
  }
  // 候选部件：lappets —— 冠带：从冠后沿（冠左下角外 1 格）垂下 1 列深红带，离开脸侧、每 4 行往后斜 1 格，到肩头结一颗金穗；
  // 随 P.beard 摆（负 = 被风吹向后）。1 列 + 和后脑之间隔一格勾线，读起来是带子不是长发。画在头之前。
  function lappets(R) {
    E.part(); const b = P.beard || 0, top = R.htop, bot = R.yS, x0 = R.hx - 4;
    for (let y = top; y <= bot; y++) { const q = (y - top) / Math.max(1, bot - top), s = RD(b * q * q) - Math.floor((y - top) / 4); parts.px(E, R, x0 + s, y, M.lining, 0); }
    const xe = x0 + RD(b) - Math.floor((bot - top) / 4); parts.px(E, R, xe, bot + 1, M.gold, 3); parts.px(E, R, xe, bot + 2, M.gold, 2);
  }
  // 候选部件：robeTail —— 并进长袍部件（紧跟 parts.torso）的悬浮袍底：把波浪下摆补平，再往下收成一个尖（P.trail 让尖端向后拖，P.sway 轻摆），中间一道暗褶。
  function robeTail(R, tor) {
    const i = tor.hem - tor.y0, L = tor.rows[0][i], Rr = tor.rows[1][i], n = -tor.hem, cx = (L + Rr) / 2, hw = (Rr - L) / 2, tr = P.trail || 0, sw = P.sway || 0;
    parts.run(E, R, tor.hem, L, Rr, M.robe, 0);
    for (let k = 1; k <= n; k++) { const q = k / n, w = hw * Math.pow(1 - q, 0.85), c = cx - q * 1.2 - tr * q * q * 1.6 + sw * q * 0.6; parts.run(E, R, tor.hem + k, RD(c - w), RD(c + w), M.robe, 0); if (k < n - 1) parts.px(E, R, RD(c + w * 0.3), tor.hem + k, M.robe, 2); }
  }
  // 候选部件：cope —— 主教的金色大斗篷（祭披式，画在长袍之后）：从肩头盖住整个身侧，下摆往后张开成梯形（flare），前沿是开口——
  // 前沿一列露出深红内衬，下摆一行深红翻边，胸前宝石扣；身侧几道暗褶、3 个白色日轮刺绣。参数：bot 下摆行、flare 后沿张开格数、open 前沿往下退开格数（露出白袍）。读 P：sway bend。
  function cope(R, bot, flare, open) {
    E.part(); const top = R.yS, n = Math.max(1, bot - top), sw = P.sway || 0, bd = P.bend || 0; let L0 = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, Math.min(y, R.yHip)), L = e[0] - (y === top ? 0 : 1) - RD(flare * Math.pow(t, 1.1)) + RD(sw * t * t) - RD(bd * t * t),
        Rr = e[1] + (y === top ? 0 : 1) - RD(open * clamp01((t - 0.15) / 0.6)) + RD(sw * t * t * 0.5);   // 前沿是开口：胸前扣住，往下退开，露出前面的白袍
      for (let x = L; x <= Rr; x++) parts.px(E, R, x, y, y === bot || (x === Rr && t > 0.12) ? M.lining : M.cape, 0);
      if (t > 0.25 && y < bot) { parts.px(E, R, L + 2 + RD(t * 2), y, M.cape, 2); if (t > 0.5) parts.px(E, R, RD((L + Rr) / 2) + 1, y, M.cape, 2); }
      if (y === bot) L0 = L;
    }
    for (const [dy, fx] of [[5, 0.35], [10, 0.3], [15, 0.4]]) {                  // 白色日轮刺绣：中心白点 + 四周淡金
      const y = top + dy; if (y >= bot - 1) continue; const t = dy / n, e = parts.edges(R, Math.min(y, R.yHip)), L = e[0] - 1 - RD(flare * Math.pow(t, 1.1)), x = RD(L + (e[1] - L) * fx);
      parts.px(E, R, x, y, M.robe, 4); parts.px(E, R, x - 1, y, M.cape, 4); parts.px(E, R, x + 1, y, M.cape, 4); parts.px(E, R, x, y - 1, M.cape, 4); parts.px(E, R, x, y + 1, M.cape, 4);
    }
    const cy = R.yS + 2, cx = parts.edges(R, cy)[1] + 1; parts.px(E, R, cx, cy, M.jewel, 3); parts.px(E, R, cx - 1, cy, M.gold, 3); parts.px(E, R, cx, cy + 1, M.gold, 2); parts.px(E, R, cx, cy - 1, M.jewel, 4);   // 宝石扣
    return { bot, back: L0 };
  }
  const LAMP = { metal: M.gold, glass: M.sun, glow: M.hot };
  // 候选部件：tonsure —— 和惩戒牧师同一个剃顶（并进脸部件）：秃顶一行 + 深褐发圈 + 后脑短发。戴冠时秃顶被冠盖住，只露出冠下的发圈。
  function tonsure(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey;
    parts.run(E, R, top - 1, x0 + 1, x1 - 1, M.skin, 0); parts.px(E, R, x0 + 2, top - 1, M.skin, 4);
    parts.run(E, R, top, x0, x1 - 2, M.hair, 0); for (let y = top + 1; y <= ey + 2; y++) parts.px(E, R, x0, y, M.hair, 0); for (let y = top + 1; y <= ey; y++) parts.px(E, R, x0 + 1, y, M.hair, y === ey ? 2 : 0);
  }

  // ───── 姿势：前手握杖（hx hy a），后手握在杖身下 4 格（待机赐福时离开权杖画圈）；fly 离地格数 ─────
  const P = { hx: 0, hy: 0, a: 0, ak: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0,
    fly: 0, sway: 0, bend: 0, trail: 0, beard: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, hatX: 0, hatY: 0, mrot: 0, dq: 0, dqk: 0,
    mana: 0, hl: 0, spin: 0, st: 0, gest: 0, cz: 0, hbreak: 0, down: 0, hcx: 0, hcy: 0, ckx: 0, cky: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head) => ({ hx, hy, a, lean: lean || 0, head: head || 0 });
  const A1 = ASTEP;
  // 握点在头中线前 10 格、杖身前倾 1 档：日盘圆心 (12, −35)，环左沿（含勾线）和冠右沿（含勾线）之间空 2 格以上，下左芒也不贴冠
  const K_IDLE = K(10, -18, A1);                 // 权杖竖在身前（微微前倾）
  const K_WIND = K(10, -20, A1, -1, 0);          // 预兆：身体后仰、双手把权杖往上一提（日盘不往冠上靠）
  const K_POINT = K(11, -18, 0.8, 1, 0);         // 出手：权杖往前上方一指（45°）
  const K_HOLD = K(10, -18, 0.7, 1, 0);
  const K_RAISE = K(7, -27, 0, -1, -1);          // 蓄力：双手把权杖举过冠顶
  const K_BEAM = K(11, -19, 1.1, 1, 0);          // 连射：权杖往前斜指假人
  const K_HURT = K(10, -18, 0, -1, -1);          // 受击：杖身被震回竖直（不往后倒，日盘不压到冠上）
  const K_KNEEL = K(6, -9, 0, 1, 1);             // 跪住：手垂在膝前
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 31], ['hy', -48, 0], ['ak', -32, 32], ['bhx', -16, 31], ['bhy', -48, 0], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7],
    ['fly', 0, 7], ['bx', -16, 15], ['sway', -2, 2], ['bend', 0, 3], ['trail', 0, 3], ['beard', -3, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['hatX', 0, 31], ['hatY', 0, 7], ['mrot', 0, 3], ['dqk', 0, 48], ['mana', 0, 24], ['hl', 0, 3], ['spin', 0, 3],
    ['st', 0, 8], ['gest', 0, 1], ['cz', -2, 2], ['hbreak', 0, 1], ['down', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], CZ_IDLE = [1, 1, 0, -1, -1, 0];
  const T_STRIKE = 2 / 12, T_SEG1 = 1 / 12, T_SEG3 = 5 / 12, T_LAND = 7 / 12, T_ASH = 15 / 12;   // 落地帧（d ≈ 0.28）· 化灰帧（d ≈ 0.95）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.sway = 0; P.bend = 0; P.trail = 0; P.beard = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.hatX = 0; P.hatY = 0; P.mrot = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.crouch = 0; P.mana = 0; P.hl = 0; P.gest = 0; P.cz = 0; P.hbreak = 0; P.down = 0; P.fly = FLY;
    P.spin = Math.floor(TT / 0.6 + 1e-6) & 3; P.bhx = 0; P.bhy = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.fly = FLY + (b & 1); P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; P.spin = Math.floor(lp / 0.6 + 1e-6) & 3;                                    // 光环缓慢转动（2.4 s 转过 4 格，循环无缝）
      if (lp >= 0.3 && lp < 0.8) P.cz = CZ_IDLE[Math.floor((lp - 0.3) * 12 + 1e-6)];                          // 腰间香炉自己摇一下
      if (lp >= 1.2 && lp < 1.7) {                                                                           // 赐福：后手离开权杖，在胸前画一个圆
        const k = Math.floor((lp - 1.2) * 12 + 1e-6), a = -HALF + k * Math.PI / 3; P.gest = 1; P.bhx = 13 + RD(Math.cos(a) * 2.4); P.bhy = -15 + RD(Math.sin(a) * 2.4);   // 圆心在杖身前 3 格 P.head = k >= 2 && k <= 4 ? 1 : 0; P.glint = k === 3 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 悬浮飘行：前倾、4 帧上下飘 1 格，斗篷和袍尖往后拖
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); P.fly = [3, 4, 3, 2][f]; P.lean = 1; P.sway = [-1, -2, -1, 0][f]; P.bend = [2, 3, 2, 1][f]; P.trail = [2, 3, 2, 1][f]; P.beard = [-1, -2, -1, -1][f]; P.a = 2 * A1;   // 前倾时杖身多倾 1 档，日盘不贴冠
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 2; P.glint = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_POINT, K_POINT, 0); P.gem = 3; P.rim = 2; P.sway = -1; P.beard = -1; P.bend = 1; }
      else if (tq < 0.45) { setK(K_POINT, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 2; P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                      // 升空举杖：离地 3 → 6，光环 24 根芒逐根点亮，香炉被气流吹到身侧
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_RAISE, q);
      P.fly = FLY + RD(3 * q); P.hl = 1; P.mana = Math.min(24, Math.floor(tq * 24 / 1.3 + 1e-6)); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.3 ? 1 : 2;
      P.cz = tq < 0.3 ? -1 : -2; P.beard = -2 + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = (f12 & 1) ? -1 : 0; P.bend = 2; P.trail = 1;
    } else if (st === CAST || st === RECOVER) {                      // 超级耀斑（施放第 0 帧）→ 权杖平指、三段光束 → 降回 3 格
      const u = st === CAST ? f12of(t) : 6 + f12of(t);
      if (u === 0) { setK(K_RAISE, K_RAISE, 0); P.fly = 6; P.hl = 3; P.mana = 24; P.gem = 3; P.rim = 3; P.beard = -2; P.bend = 3; P.sway = -1; }
      else if (u <= 14) { setK(K_BEAM, K_BEAM, 0); P.fly = 6; P.hl = 3; P.mana = 24; const on = (u - 1) % 5 < 4; P.gem = on ? 3 : 2; P.rim = on ? 3 : 2; P.beard = -1; P.bend = 2; P.sway = on ? -1 : 0; P.cz = -1; }
      else { const q = ease.inOut(clamp01((u - 15) / 5)); setK(K_BEAM, K_IDLE, q); P.fly = 6 - RD(3 * q); P.hl = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.mana = RD(24 * (1 - q)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bend = q < 0.5 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.fly = FLY - 1; P.beard = 2; P.sway = 1; P.trail = 0; P.cz = -2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.cz = -1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 坠落升天
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.19) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.cz = -2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.27) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.fly = 1; P.beard = -3; P.bend = 3; P.sway = 2; P.gem = 1; }     // 失去浮力往下掉：斗篷和冠带往上翻
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.fly = 0; P.eyes = 1; P.down = 1; P.crouch = d < 0.35 ? 2 : 4; P.beard = 1; P.hl = 1;
        const hq = clamp01((d - 0.28) / 0.45); P.hatX = RD(13 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4); P.mrot = d < 0.73 ? Math.floor((d - 0.28) * 12 + 1e-6) & 3 : 1;
        P.mana = Math.max(0, 24 - Math.floor((d - 0.28) * 40 + 1e-6)); P.gem = d < 0.75 ? ((f12 & 1) ? 2 : 4) : 4;
        if (tq >= T_ASH - 1e-6) { P.hbreak = 1; if (tq > T_ASH + 1e-6) P.dq = 1; }
      }
    } else if (st === REVIVE) {
      idle(); P.fly = FLY;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.crouch >= 4 ? 0 : Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ak = RD(P.a / ASTEP); P.a = P.ak * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqk = RD(P.dq * 48);
    if (!P.gest && !P.down) { const b = parts.onShaft(P, STAFF, -4); P.bhx = b[0]; P.bhy = b[1]; }
    else if (P.down) { P.bhx = P.hx - 1; P.bhy = P.hy; }
    const R = parts.rig(P, BODY), g = P.down ? parts.staff.focus(P, Object.assign({}, STAFF, DROP)) : parts.staff.focus(P, STAFF);
    P.gx = g[0] + P.bx; P.gy = g[1] - P.fly; P.hcx = R.hx - 4 + P.bx; P.hcy = R.htop - P.fly;
    const e = parts.edges(R, R.yWaist); P.ckx = e[1] + 2 + P.cz + P.bx; P.cky = R.yWaist + 5 - P.fly;
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, -P.fly); const R = parts.rig(P, BODY), kn = R.kneel;
    if (!P.hbreak) duoHalo(R, R.hx - 4, R.htop);
    parts.cape(E, R, P, { mat: M.lining, len: kn ? 0 : -4, flare: kn ? 8 : 8.5 });          // 斗篷远侧那一半的深红内衬（从金斗篷后沿露出 1 列）
    parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.sleeveD, cuff: M.goldD, grip: 'none', at: [P.bhx, P.bhy] });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, belt: M.gold, buckle: M.gold, collar: M.gold, hem: kn ? 0 : -5, flare: kn ? 6 : 2, flareF: kn ? 5 : 2 });
    if (!kn) robeTail(R, tor);
    cope(R, kn ? -1 : -4, kn ? 5 : 6, kn ? 1 : 3);                                           // 大斗篷盖到袍底尖上面，只露出 4 行收尖的白袍
    // 腰间香炉：腰带上 2 格短链 + 炉身（牧师那一只）
    E.part(); const e = parts.edges(R, R.yWaist), hk = [e[1] + 2 + P.cz, R.yWaist + 2]; parts.px(E, R, e[1] + 1, R.yWaist + 1, M.chain, 4); parts.px(E, R, hk[0], hk[1], M.chain, 2);
    parts.lantern(E, R, P, Object.assign({ at: hk, glowLv: P.gem === 4 ? 4 : P.gem >= 2 ? 2 : 1 }, LAMP));
    if (!P.down) lappets(R);
    parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'young', eye: M.ink, brow: M.hair, nose: 'small', mouth: 'line' });
    tonsure(R);
    if (P.down) { const rot = P.mrot & 3, ty = [0, -3, -5, -2][rot]; mitre(R, { at: [R0.hx - 5 - P.hatX, ty - P.hatY], rot }); }
    else { mitre(R, {}); }
    if (P.down) { const s = parts.staff(E, R, P, Object.assign({}, STAFF, DROP, { free: 1, glowLv: P.gem })); sunDisc(parts.FREE, s.gem, P.gem); }
    else { const s = parts.staff(E, R, P, STAFF); sunDisc(R, s.gem, P.gem); }
    parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    parts.arm(E, R, P, { sleeve: 'bell', mat: M.sleeve, cuff: M.gold, hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.hcx + hero.ox; RIM.ry = P.hcy + 4 + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 净化光束（自管 3 个槽）：从日盘到假人的直线，起点每帧跟着日盘走；w 粗细 1–3
  const BN = 3, bOn = new Uint8Array(BN), bAge = new Float32Array(BN), bDur = new Float32Array(BN), bW = new Uint8Array(BN), BX1 = DUMMY_X - 1, BY1 = HY - 15;
  function beam(w, dur) { let i = 0; for (; i < BN - 1 && bOn[i]; i++); bOn[i] = 1; bAge[i] = 0; bDur[i] = dur; bW[i] = w; fx.cross(scrX(P.gx), HY + P.gy, 3 + w, R_EL, 0.17); burst(scrX(P.gx), HY + P.gy, 4 + w * 3, 30, 70, 0.15, 0.35, R_EL, 0); }
  let bst = 0, bstT = 9, bTarget = 0, fillAcc = 0, finale = 0, coronaT = 9, dialT = 9, chargeAcc = 0, smokeAcc = 0, burnAcc = 0, lastF = -1;
  const DIAL_R = 15;
  function onEnter(s) {
    if (s === CAST || s === RECOVER) poseAt(s, 0, E.simT);            // 进入时 P 还是上一个状态的姿势，先摆好这一帧
    if (s === CHARGE) dialT = 0;
    if (s === CAST) {                                                 // 超级耀斑：日盘爆出大号日冕
      const gx = scrX(P.gx), gy = HY + P.gy; coronaT = 0;
      releaseOrbit(45, 110, 0.35, 0.75); burst(gx, gy, 36, 60, 150, 0.3, 0.75, R_EL, 10); ring(gx, gy, 1, R_EL); fx.cross(gx, gy, 6, R_EL, 0.35); shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) segment(2);
  }
  function segment(k) { beam(k, 4 / 12); bTarget = [3, 7, 10][k - 1]; bstT = 0; fillAcc = 1 / 12; hitDummy(0); sfx('impact', { pal: 'holy', w: [0.5, 0.65, 0.8][k - 1] }); }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) { beam(2, 0.25); bst = Math.min(10, bst + 1); bstT = 0; bTarget = bst; hitDummy(0); burst(BX1, BY1, 8, 40, 90, 0.15, 0.35, R_EL, 10); sfx('swing', { kind: 'staff', w: 0.4 }); sfx('shoot', { proj: 'orb' }); sfx('hit', { mat: 'magic', w: 0.35 }); }
    if (s === CAST && t === T_SEG1) segment(1);
    if (s === RECOVER && t === T_SEG3) segment(3);
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && t === T_ASH) {                                  // 化成日耀光点（死亡套件 ash），光环碎成金屑落下
      poseAt(DEATH, t, t); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_EL });
      const hx = scrX(P.hcx), hy = HY + P.hcy;
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, r = i & 1 ? 4 : 5.1; spawnX(K_PHYS, hx + Math.cos(a) * r, hy + Math.sin(a) * r, Math.cos(a) * 14 + (Math.random() - 0.5) * 10, Math.sin(a) * 10 - 12, 1.1 + Math.random() * 0.4, R_EL, { g: 170, floor: HY, age0: 0.12 }); }
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_SEG1], [T_SEG3], [], [T_LAND, T_ASH], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                           // 光点从日晷法阵外沿螺旋汇聚到日盘，到了以后环绕
      chargeAcc += dt * (18 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = HALF + (Math.random() - 0.5) * 0.8, r = (HY - gy) + 2 + Math.random() * 4; spawnX(K_SPIRAL, gx, gy, r / (0.7 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3 + Math.random() * 2, squash: 1 }); }
    }
    if (state === IDLE && P.gest && (E.stepN & 1)) spawnX(K_STILL, scrX(P.bhx + P.bx), HY + P.bhy - P.fly, 0, 0, 0.5, R_EL, { age0: 0.15 });   // 赐福手势：指尖留下淡金光点
    if (state === MOVE && (E.stepN % 9) === 0) spawn(K_TRAIL, scrX(-2 - P.trail + P.bx), HY - P.fly + 1, -12 - Math.random() * 8, 2, 0.4 + Math.random() * 0.2, R_EL);   // 身下拖着日耀光尘
    if (!P.dq && P.gem !== 4) {                                       // 腰间香炉的烟（蓄力时被气流吹成长烟）
      smokeAcc += dt * (state === CHARGE ? 7 : 1.6); while (smokeAcc >= 1) { smokeAcc -= 1; const blow = state === CHARGE ? -18 : 0; spawnX(K_EMBER, scrX(P.ckx), HY + P.cky, blow + (Math.random() - 0.5) * 4, -7 - Math.random() * 5, state === CHARGE ? 1.4 : 1.0, R_EL, { age0: 0.35 }); }
    }
    if (state === RECOVER && P.hl === 1) { burnAcc += dt * 6; while (burnAcc >= 1) { burnAcc -= 1; spawnX(K_EMBER, gx + (Math.random() - 0.5) * 4, gy - 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.8, R_EL, { age0: 0.2 }); } }   // 日盘余烬飘升
    let any = 0;
    for (let i = 0; i < BN; i++) { if (!bOn[i]) continue; any = 1; bAge[i] += dt; if (bAge[i] >= bDur[i]) bOn[i] = 0; }
    if (any && (E.stepN % 3) === 0) burst(BX1 - 1, BY1 + (Math.random() - 0.5) * 6, 2, 30, 70, 0.15, 0.35, R_EL, 8);   // 光束终点持续灼烧
    if (bst < bTarget) { fillAcc += dt; while (fillAcc >= 1 / 12 && bst < bTarget) { fillAcc -= 1 / 12; bst++; bstT = 0; if (bst === 10 && !finale) { finale = 1; fx.cross(DUMMY_X, BY1, 7, R_EL, 0.4); ring(DUMMY_X, BY1, 1, R_EL); dummyFx({ dur: 1.0, outline: R_EL }); hitDummy(1); shake(0.12, 1); burst(DUMMY_X, BY1, 24, 50, 130, 0.25, 0.6, R_EL, 14); } } }
    bstT += dt; if (bstT >= 1.6 && bst >= bTarget) { bst = 0; bTarget = 0; finale = 0; }
    coronaT += dt; dialT += dt;
  }
  function fxReset() { bOn.fill(0); bst = 0; bstT = 9; bTarget = 0; fillAcc = 0; finale = 0; coronaT = 9; dialT = 9; chargeAcc = 0; smokeAcc = 0; burnAcc = 0; lastF = -1; }
  function fxBack(f12) {
    if (!P.dq) groundShadow(scrX(P.bx - 1), 8, P.fly * 2);
    floorGlow(scrX(P.gx), P.rim, EL, f12);
    const on = P.st === CHARGE || P.st === CAST || (P.st === RECOVER && P.fly > 3) || (P.st === RECOVER && E.stT < 0.9);
    if (on && dialT < 3.2) {                                           // 日晷法阵：椭圆 + 12 道刻度，缓慢旋转；收招时断续熄灭
      const cx = scrX(P.bx - 1), cy = FLOOR, g = clamp01(dialT / 0.3), rx = DIAL_R * g, late = P.st === RECOVER, rot = dialT * 0.9;
      const n = Math.ceil(rx * 6); for (let k = 0; k < n; k++) { if (((k + f12) & 1) || (late && ((k + f12) % 3) === 0)) continue; const a = k / n * Math.PI * 2; put(RD(cx + Math.cos(a) * rx), RD(cy + Math.sin(a) * 3 * g), late ? EL[3] : EL[2]); }
      for (let j = 0; j < 12; j++) { if (late && ((j + f12) & 1)) continue; const a = rot + j * Math.PI / 6, c = Math.cos(a), s = Math.sin(a); put(RD(cx + c * rx * 0.72), RD(cy + s * 3 * g * 0.72), EL[1]); put(RD(cx + c * rx * 0.86), RD(cy + s * 3 * g * 0.86), late ? EL[3] : EL[2]); }
    }
  }
  function sunDot(x, y, c0) { put(x, y, c0); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[2]); }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    for (let i = 0; i < BN; i++) {                                    // 净化光束：第 1 帧全白，内芯白（2 格宽以上内芯 2 行），外沿淡金，后段断续
      if (!bOn[i]) continue; const w = bW[i], q = bAge[i] / bDur[i], first = bAge[i] < 1 / 12, rows = w === 1 ? [0] : w === 2 ? [0, 1] : [-1, 0, 1];
      const dx = BX1 - gx, dy = BY1 - gy, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
      for (let k = 4; k <= n; k++) { const x = RD(gx + dx * k / n), y = RD(gy + dy * k / n);
        for (const o of rows) { const core = o === 0 || (w >= 2 && o === 1); if (q > 0.7 && !core && ((k + f12) & 1)) continue; put(x, y + o, first ? EL[0] : core ? (q < 0.6 ? EL[0] : EL[1]) : (q < 0.6 ? EL[1] : EL[2])); } }
      for (let s = 0; s < 3; s++) { const k = RD((bAge[i] * 160 + s * n / 3) % n); if (k < 4) continue; const x = RD(gx + dx * k / n), y = RD(gy + dy * k / n); put(x, y - 1 + (rows[0] < 0 ? -1 : 0), EL[1]); put(x, y + rows[rows.length - 1] + 1, EL[1]); }
      for (let x = RD(gx) + 4; x <= BX1; x += 2) put(x + (f12 & 1), FLOOR, x > BX1 - 8 ? EL[2] : EL[3]);   // 光束经过的地面隔点映光
    }
    if (coronaT < 0.45) {                                              // 超级日冕：8 道长芒各 10 格
      const c = coronaT < 2 / 12 ? EL[0] : coronaT < 0.28 ? EL[1] : EL[2], L = coronaT < 0.28 ? 15 : 12;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; for (let r = 6; r <= L; r++) { if (coronaT > 0.28 && ((r + f12) & 1)) continue; put(RD(gx + Math.cos(a) * r), RD(gy + Math.sin(a) * r), r > L - 3 && coronaT < 2 / 12 ? EL[1] : c); } }
    }
    if (bst > 0 && !(bstT > 1.2 && bst >= bTarget && (f12 & 1))) {      // 假人四周 10 格日点环（叠层）
      for (let i = 0; i < 10; i++) { const a = -HALF + i * Math.PI / 5, x = RD(DUMMY_X + Math.cos(a) * 13), y = RD(BY1 + Math.sin(a) * 17); if (i < bst) sunDot(x, y, i === bst - 1 && bstT < 0.17 ? EL[0] : EL[1]); else put(x, y, EL[4]); }
    }
  }

  return {
    name: '主教', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.sun, M.hot], HIT_POINT: [1, -20], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'holy', style: 'beam', w: 0.75, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
