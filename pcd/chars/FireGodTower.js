// 火神塔（自然 · 商人 · 传说）：充能塔的最终形态。老树干被火山岩包成下宽上窄的厚重石堡（底下还露着原来的盘根和铜边投币口），
// 岩缝里透出熔光；塔身两侧各一根冒火的烟囱耳；顶上是能转动的双联炮塔，正面一张火神面具（怒目、火焰胡须向两侧卷起、
// 额心嵌着充能塔那颗琥珀晶），面具下两根喇叭口铜炮管平行前伸。
// 攻击 = 两根炮管一前一后后坐，连射两发熔金炮弹；技能 = 特性「美味」（死亡后获得积分）表现成「熔炉铸币」：
// 岩缝熔光从底往上流到炮塔、炮管烧红、投币口吸入金光 → 双炮朝天斜轰出两团熔金，面具怒吼、烟囱耳喷火 → 熔金在目标上空炸成带火尾的金币流星雨。
// 移动 = 石座跳挪（下沉蓄力 → 跳起前挪 → 落地扬尘）；死亡 = 爆炸：炮管过热发白，炮塔炸开（死亡套件 burst），石块堆成一堆，熔金币四散。
// 身体不用现成骨架：石堡、盘根、烟囱耳、炮塔、火神面具、喇叭口炮管都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('FireGodTower', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const VOLC = E.ramp(['#120808', '#2e1614', '#4e2a24', '#7a4636']);         // 火山岩（偏红黑）
  const CU = E.ramp(['#2a1606', '#6a3e10', '#b07028', '#e8b060']);           // 铜
  const AMB = E.ramp(['#3a1a02', '#a05a0a', '#f0a020', '#ffe08a']);          // 琥珀（承接充能塔）
  const M_STONE = defMat(VOLC, 2), M_STONE1 = defMat(VOLC, 1), M_STONE_D = defMat(VOLC, 1, 0, 1);   // 石堡（大面积 band 2）/ 炮塔、烟囱 / 远侧烟囱
  const M_CU = defMat(CU, 1), M_RED1 = defMat([44, 44, 45, 46], 1), M_RED2 = defMat([44, 45, 46, 47], 1), M_WHITE = defMat([45, 46, 47, 21], 1);   // 炮管：铜 → 暗红 → 烧红 → 白热
  const M_LAVA = defMat('fire', 1, 1), M_HOT = defMat([45, 46, 47, 21], 1, 1);                   // 岩缝熔光、眼、火（发光体）/ 白热
  const M_MASK = defMat('crimson', 1), M_GOLD = defMat('gold', 1), M_INK = defMat('ink', 1, 1), M_AMB = defMat(AMB, 1, 1);
  const M_ROOT = defMat('wood', 1), M_ROOT_D = defMat('wood', 1, 0, 1);
  const HEAT = [M_CU, M_RED1, M_RED2, M_WHITE];
  const R_EL = FXI.fire, EL = FXR[R_EL], R_COIN = FXI.coin, HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 52, 30, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 17], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [M_ROOT, M_ROOT_D, M_LAVA, M_HOT, M_INK, M_AMB, M_CU, M_RED1, M_RED2, M_WHITE]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  // tx：炮塔左右转 1 格；rc1 / rc2：上 / 下炮管后坐；aim：0 平射 · 1 斜向上；heat：炮管 0 铜 · 1 暗红 · 2 烧红 · 3 白热；
  // face：面具的眼 0 暗 · 1 亮 · 2 炽 · 3 白 · 4 闭；mouth：张口；lava：岩缝熔光亮到第几段（0–4，从下往上）；fume：烟囱火 0 小 · 1 · 2 喷；
  // fl：火苗闪动相位；rs：盘根 0 扎地 · 1 张开 · 2 悬空下垂；crouch / lift：跳挪的下沉 / 离地
  const P = { tx: 0, rc1: 0, rc2: 0, aim: 0, heat: 0, face: 0, mouth: 0, lava: 0, fume: 0, fl: 0, rs: 0, crouch: 0, lift: 0,
    bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['tx', -1, 1], ['rc1', 0, 2], ['rc2', 0, 2], ['aim', 0, 1], ['heat', 0, 3], ['face', 0, 4], ['mouth', 0, 1], ['lava', 0, 4], ['fume', 0, 2],
    ['fl', 0, 2], ['rs', 0, 2], ['crouch', 0, 2], ['lift', 0, 3], ['bx', -4, 4], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const T_F1 = 2 / 12, T_F2 = 4 / 12, T_BOOM = INCOMING + 0.5, T_PILE = INCOMING + 0.95;
  const G_CR = [1, 0, 0, 0], G_LIFT = [0, 3, 0, 0], G_RS = [0, 2, 1, 0], G_RC = [0, 0, 1, 0], G_FUME = [1, 2, 0, 1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.tx = 0; P.rc1 = 0; P.rc2 = 0; P.aim = 0; P.heat = 0; P.face = 0; P.mouth = 0; P.lava = 0; P.fume = 1; P.fl = f12 % 3; P.rs = 0; P.crouch = 0; P.lift = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {
      const lp = tq % DUR[IDLE]; P.tx = [0, 1, 0, -1][Math.floor(lp / 0.6 + 1e-6) & 3];     // 待机个性：炮塔左右扫视
      P.face = (Math.floor(f12 / 5) & 1); P.fume = (Math.floor(f12 / 3) & 1) ? 1 : 0;       // 眼光和烟囱火一明一暗地「呼吸」
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                    // 石座跳挪：下沉 → 跳起 → 落地 → 站稳
      const f = gait(tq); P.crouch = G_CR[f]; P.lift = G_LIFT[f]; P.rs = G_RS[f]; P.rc1 = P.rc2 = G_RC[f]; P.fume = G_FUME[f]; P.face = 1;
      const w = walkDemo(tq, 8, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                                // 瞄准 → 上管开火 → 下管开火 → 冒烟回位
      P.face = 1;
      if (tq < 0.12) { P.tx = -1; P.face = 2; }
      else if (tq < T_F2 - 1e-6) { P.rc1 = tq < 0.25 ? 2 : 1; P.face = 2; P.rim = 2; P.fume = 2; }
      else if (tq < 0.5) { P.rc2 = tq < T_F2 + 0.08 ? 2 : 1; P.rc1 = tq < 0.42 ? 1 : 0; P.face = 2; P.rim = 2; P.heat = 1; }
      else { P.heat = tq < 0.6 ? 1 : 0; P.face = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                                                // 熔光上流、炮管烧红、炮口抬向天空
      const q = ease.inOut(clamp01(tq / 0.7)); P.aim = q > 0.5 ? 1 : 0; P.crouch = q > 0.5 ? 1 : 0; P.rim = 2;
      P.lava = Math.min(4, Math.floor(tq / 0.25 + 1e-6)); P.heat = tq < 0.5 ? 0 : tq < 1.0 ? 1 : 2;
      P.face = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.fume = tq > 1.0 ? 2 : 1; if (tq > 1.1) P.mouth = f12 & 1;
    } else if (st === CAST) {                                                                  // 双炮齐轰，面具怒吼张口，烟囱耳喷火
      P.aim = 1; P.rc1 = P.rc2 = tq < 0.17 ? 2 : 1; P.heat = tq < 0.25 ? 3 : 2; P.face = 3; P.mouth = 1; P.lava = 4; P.fume = 2; P.rim = 3;
    } else if (st === RECOVER) {                                                               // 炮管从红退回铜色，冒白烟
      const q = ease.inOut(clamp01(tq / 0.6)); P.aim = tq < 0.35 ? 1 : 0; P.heat = q < 0.3 ? 2 : q < 0.7 ? 1 : 0;
      P.lava = Math.max(0, 4 - Math.floor(tq * 8 + 1e-6)); P.face = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.fume = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.tx = -1; P.face = 4; P.fume = 2; P.rc1 = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.face = 4; P.fume = 2; P.rim = 0; }
      else { P.tx = 1; P.face = 1; }
    } else if (st === DEATH) {                                                                 // 过热 → 炮管发白、全身岩缝亮起、颤抖 → 炸开
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { P.bx = -2; P.tx = -1; P.face = 4; P.fume = 2; P.heat = 2; P.lava = 2; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < T_BOOM - INCOMING) { P.bx = (f12 & 1) ? -1 : -3; P.face = 3; P.mouth = 1; P.heat = 3; P.lava = 4; P.fume = 2; P.rim = 3; P.crouch = 1; }
      else P.dq = 1;                                                                            // 之后由死亡套件（爆裂碎块）接管
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.dq48 = RD(P.dq * 48);
    P.gx = 1 + P.tx + P.bx; P.gy = -31 + P.crouch - P.lift;                                    // 发光体 = 面具额心的琥珀晶
    KEY(P);
  }

  // ───── 画（部件从后往前：远侧盘根 → 远侧烟囱耳 → 石堡 → 近侧盘根 → 投币口 → 近侧烟囱耳 → 炮塔 → 火神面具 → 两根炮管）─────
  let YO = 0;
  const S = (x, y, m, t) => sp(x, y + YO, m, t);
  const R = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) S(x, y, m, t); };
  const bez = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;
  // 候选部件：盘根须（塔基 → 根尖的拱形曲线；rs 2 = 悬空时根尖往里收、往下垂）
  function rootT(x0, y0, x1, arch, m) {
    part(); const y1 = P.rs === 2 ? 1 : 0, xe = P.rs === 2 ? RD((x0 + x1) / 2 + (x1 - x0) * 0.15) : x1 + (P.rs === 1 ? Math.sign(x1 - x0) : 0), cx = (x0 + xe) / 2, cy = Math.min(y0, y1) - arch, n = 14;
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(x0, cx, xe, q)), y = RD(bez(y0, cy, y1, q)); S(x, y, m, 0); if (q < 0.55) S(x, y + 1, m, 0); }
  }
  const hwAt = (y) => 7 + RD((y + 17) * 4 / 16);
  const CRK_A = [0, 0, 1, 1, 0, -1, -1, 0, 0, 1, 1, 0, 0, -1, -1, 0], CRK_B = [0, 1, 1, 0, 0, -1, 0, 0, 1, 1, 0, 0, 1, 0];
  // 候选部件：熔岩裂缝石堡（下宽上窄的梯形，错缝砌石 + 两道从下往上发光的岩缝；lava 0–4 = 亮到第几段）
  function fortress() {
    part();
    for (let y = -17; y <= 0; y++) { const hw = hwAt(y); R(y, -hw, hw, M_STONE, 0); }
    R(-18, -8, 8, M_STONE1, 0); for (const x of [-8, -5, -2, 1, 4, 7]) S(x, -19, M_STONE1, 0), S(x + 1, -19, M_STONE1, 0);   // 顶上一圈矮垛
    for (const [my, joints] of [[-4, [-6, 0, 6]], [-9, [-3, 3]], [-13, [-5, 0, 5]]]) {                                   // 砌缝
      const hw = hwAt(my); for (let x = -hw + 1; x <= hw - 1; x++) S(x, my, M_STONE, 2);
      for (const jx of joints) for (let k = 1; k <= 3; k++) S(jx, my + k, M_STONE, 2);
      for (const jx of joints) S(jx + 1, my - 3, M_STONE, 4);
    }
    const lit = (i, n) => (i / n) < P.lava / 4;
    for (let i = 0; i < CRK_A.length; i++) S(-5 + CRK_A[i], -i, M_LAVA, lit(i, CRK_A.length) ? 4 : 2);
    for (let i = 0; i < CRK_B.length; i++) S(4 + CRK_B[i], -2 - i, M_LAVA, lit(i + 2, CRK_A.length) ? 4 : 2);
    R(-1, -2, 1, M_ROOT, 0); R(0, -2, 1, M_ROOT, 0); S(-1, -2, M_ROOT, 0); S(0, -2, M_ROOT, 0);                       // 石缝里露出的老树干
  }
  // 候选部件：铜边投币口
  function coinSlot() { part(); R(-10, 8, 11, M_CU, 4); S(8, -9, M_CU, 0); S(11, -9, M_CU, 0); S(9, -9, P.lava >= 1 && P.st === CHARGE ? M_LAVA : M_INK, P.lava >= 1 && P.st === CHARGE ? 4 : 0); S(10, -9, M_INK, 0); R(-8, 8, 11, M_CU, 0); R(-7, 9, 11, M_CU, 2); }
  // 候选部件：火苗（底宽 3 格、2–4 格高，fl 相位左右摆，size 2 = 喷火）
  function flame(x, y, size) {
    part(); const h = size + 2, sw = P.fl === 1 ? 1 : P.fl === 2 ? -1 : 0;
    R(y, x - 1, x + 1, M_LAVA, 3); S(x, y, M_LAVA, 4);
    for (let k = 1; k < h; k++) { const c = x + (k >= h - 1 ? sw : 0); S(c, y - k, k === h - 1 ? M_HOT : M_LAVA, k === h - 1 ? (size === 2 ? 4 : 3) : 4); if (k < h - 1) S(c + (k & 1 ? -1 : 1) * (size ? 1 : 0), y - k, M_LAVA, 3); }
  }
  // 候选部件：烟囱耳（从塔身侧面伸出的横管 + 竖管 + 宽口，side -1 在后、+1 在前）
  function chimney(side, m) {
    part(); const s = side;
    for (const y of [-10, -9]) for (let x = 10; x <= 12; x++) S(s * x, y, m, 0);
    for (let y = -15; y <= -9; y++) for (let x = 13; x <= 15; x++) S(s * x, y, m, 0);
    for (let x = 12; x <= 16; x++) S(s * x, -16, m, 0);
    S(s * 14, -13, m, 2); S(s * 14, -11, m, 2);
    flame(s * 14, -17, P.fume);
  }
  // 候选部件：双联炮塔（圆鼓形塔身 + 圆顶 + 铜箍铆钉）
  function turret(X) {
    part();
    for (let y = -30; y <= -19; y++) R(y, X - 7, X + 7, M_STONE1, 0);
    R(-31, X - 6, X + 6, M_STONE1, 0); R(-32, X - 5, X + 5, M_STONE1, 0); R(-33, X - 3, X + 3, M_STONE1, 0);
    S(X, -34, M_CU, 4); S(X + 1, -34, M_CU, 3); S(X, -35, M_CU, 4);
    R(-19, X - 7, X + 7, M_CU, 0); for (let x = X - 6; x <= X + 6; x += 3) S(x, -19, P.lava >= 4 ? M_LAVA : M_CU, 4);   // 底箍（熔光流到这里时铆钉发红）
    R(-32, X - 5, X + 5, M_CU, 3);
  }
  // 候选部件：火神面具（怒眉、炽眼、鼻、獠牙口，额心嵌琥珀晶，两颊火焰胡须向外上方卷起）
  const WH_L = [[-5, -24], [-6, -24], [-7, -25], [-8, -25], [-9, -26], [-10, -27], [-10, -28], [-9, -29]];
  function mask(X) {
    part();
    R(-31, X - 3, X + 4, M_GOLD, 0);
    for (let y = -30; y <= -24; y++) R(y, X - 4, X + 5, M_MASK, 0);
    R(-23, X - 3, X + 4, M_MASK, 0); R(-22, X - 2, X + 3, M_MASK, 2);
    for (const [x, y] of [[-4, -29], [-3, -29], [-2, -28], [5, -29], [4, -29], [3, -28]]) S(X + x, y, M_GOLD, 4);        // 怒眉
    const eye = P.face === 4 ? [M_MASK, 1] : P.face === 3 ? [M_HOT, 4] : P.face === 2 ? [M_HOT, 3] : [M_LAVA, P.face ? 4 : 3];
    for (const x of [-3, -2, 3, 4]) S(X + x, -27, eye[0], eye[1]);
    S(X, -26, M_MASK, 4); S(X + 1, -26, M_MASK, 4); S(X, -25, M_MASK, 2); S(X + 1, -25, M_MASK, 2);                       // 鼻
    if (P.mouth) { R(-24, X - 2, X + 3, M_INK, 0); R(-23, X - 1, X + 2, M_INK, 0); S(X, -24, M_HOT, 3); S(X + 1, -24, M_HOT, 4); S(X, -23, M_LAVA, 4); S(X + 1, -23, M_LAVA, 4); S(X - 2, -23, M_GOLD, 4); S(X + 3, -23, M_GOLD, 4); }
    else { R(-24, X - 2, X + 3, M_INK, 0); S(X - 1, -24, M_GOLD, 4); S(X + 2, -24, M_GOLD, 4); }
    const gemT = P.face === 4 && P.st === DEATH ? 1 : P.face >= 2 ? 4 : 3;                                                   // 额心琥珀晶（充能塔那颗）
    S(X, -32, M_AMB, gemT); S(X + 1, -32, M_AMB, gemT === 4 ? 4 : 2); S(X, -31, M_AMB, gemT === 4 ? 4 : 3); S(X + 1, -31, M_AMB, 2);
    const wh = (sx) => { for (let i = 0; i < WH_L.length; i++) { const [x, y] = WH_L[i], last = i === WH_L.length - 1; S(sx < 0 ? X + x : X + 1 - x, y + (last && P.fl === 1 ? -1 : 0), last && P.fume === 2 ? M_HOT : M_LAVA, (i & 1) ? 3 : 4); } };
    wh(-1); wh(1);
  }
  // 候选部件：喇叭口铜炮管（2 格粗，一道亮箍；aim 1 = 1:2 斜向上；rc 后坐格数；mat 随温度换色）
  function barrel(x0, y0, len, rc, m) {
    part(); let ex = 0, ey = 0;
    for (let k = 0; k < len; k++) { const x = x0 - rc + k, y = P.aim ? y0 - (k >> 1) : y0; S(x, y, m, k === 3 ? 4 : 0); S(x, y + 1, m, k === 3 ? 4 : 0); ex = x + 1; ey = y; }
    if (P.aim) { for (let j = -1; j <= 1; j++) S(ex, ey + j, m, 0); S(ex + 1, ey - 2, m, 4); S(ex + 1, ey - 1, m, 0); S(ex, ey + 2, m, 2); }
    else { for (let j = -1; j <= 2; j++) S(ex, y0 + j, m, j === -1 ? 4 : 0); S(ex + 1, y0 - 1, m, 4); S(ex + 1, y0 + 2, m, 2); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const X = P.tx; YO = P.crouch - P.lift;
    rootT(-4, -3, -11, 1, M_ROOT_D); rootT(4, -3, 12, 1, M_ROOT_D);
    chimney(-1, M_STONE_D);
    fortress();
    rootT(-8, -2, -14, 2, M_ROOT); rootT(8, -2, 14, 2, M_ROOT); rootT(2, -1, 6, 0, M_ROOT);
    coinSlot();
    chimney(1, M_STONE1);
    turret(X); mask(X);
    const m = HEAT[P.heat];
    barrel(X + 6, -24, 9, P.rc1, m); barrel(X + 6, -20, 9, P.rc2, m);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 自己的抛射物：k 1 = 熔金大弹（上抛，到点炸开）· 2 = 带火尾的金币流星（落地弹一下再平躺）· 3 = 死亡四散的熔金币
  const PJN = 40, pjOn = new Uint8Array(PJN), pjK = new Uint8Array(PJN), pjX = new Float32Array(PJN), pjY = new Float32Array(PJN), pjVX = new Float32Array(PJN), pjVY = new Float32Array(PJN),
    pjG = new Float32Array(PJN), pjAge = new Float32Array(PJN), pjT = new Float32Array(PJN), pjB = new Uint8Array(PJN), pjRest = new Uint8Array(PJN);
  function launch(k, x, y, vx, vy, g, T) { let i = 0; for (; i < PJN - 1 && pjOn[i]; i++); pjOn[i] = 1; pjK[i] = k; pjX[i] = x; pjY[i] = y; pjVX[i] = vx; pjVY[i] = vy; pjG[i] = g; pjAge[i] = 0; pjT[i] = T; pjB[i] = 0; pjRest[i] = 0; return i; }
  let chargeAcc = 0, emberAcc = 0, smokeAcc = 0, lastF = -1, landOnce = 0, mz1 = 9, mz2 = 9, riseAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const muzzle = (lower, rc) => (P.aim ? [wx(P.tx + 6 - rc + 9), wy((lower ? -20 : -24) - 4 + P.crouch - P.lift)] : [wx(P.tx + 6 - rc + 9), wy((lower ? -20 : -24) + P.crouch - P.lift) + 0.5]);
  function onEnter(s) {
    if (s !== CAST) return;
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1, up: 6 });
    const T = 0.3, g = 200, targets = [[DUMMY_X - 5, HY - 44], [DUMMY_X + 5, HY - 40]];
    for (let j = 0; j < 2; j++) {                                                          // 双炮朝天斜轰两团熔金
      const [mx, my] = muzzle(j, 0), [tx, ty] = targets[j];
      launch(1, mx, my, (tx - mx) / T, (ty - my - 0.5 * g * T * T) / T, g, T);
      burst(mx, my, 10, 30, 90, 0.15, 0.4, R_EL, 10); fx.cross(mx, my, 5, R_EL, 0.2);
    }
    for (const s2 of [-1, 1]) burst(wx(s2 * 14), wy(-19), 10, 20, 70, 0.3, 0.6, R_EL, 40);     // 烟囱耳喷火
    fx.cross(wx(P.gx), wy(P.gy), 6, R_EL, 0.3); ring(wx(P.gx), wy(P.gy), 1, R_EL); landOnce = 0; mz1 = mz2 = 0;
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function fire(lower) {                                                                   // 一根炮管开火：熔金炮弹 + 炮口光
    const [mx, my] = muzzle(lower, 0); shoot(1, mx + 1, RD(my), 210, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.25] } });
    burst(mx, my, 6, 30, 70, 0.12, 0.3, R_EL, 0); if (lower) mz2 = 0; else mz1 = 0; sfx('shoot', { proj: 'fire' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_F1) { fire(0); sfx('swing', { kind: 'gun', w: 0.7 }); }
    if (s === ATTACK && t === T_F2) fire(1);
    if (s === DEATH && Math.abs(t - T_BOOM) < 1e-9) {                                      // 炮塔炸开（死亡套件 burst）
      poseAt(DEATH, T_BOOM - 1 / 12, T_BOOM - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('burst', { chunk: 4, power: 0.55, fromX: 1, fromY: -24, fadeAt: 1.3, fadeDur: 0.6 });
      const cx = wx(1), cy = wy(-26);
      burst(cx, cy, 30, 50, 150, 0.3, 0.7, R_EL, 20); burst(cx, cy, 14, 30, 90, 0.4, 0.8, FXI.dust, 10); fx.cross(cx, cy, 8, R_EL, 0.3); ring(cx, cy, 1, R_EL);
      for (let i = 0; i < 10; i++) launch(3, cx + (Math.random() - 0.5) * 6, cy, (Math.random() - 0.5) * 120, -90 - Math.random() * 70, 420, 1.9);   // 熔金币四散
      shake(0.3, 2); flash(0.06);
    }
    if (s === DEATH && Math.abs(t - T_PILE) < 1e-9) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 32, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.9 }); }   // 石块落地成堆
  }
  const EVENTS = [[], [], [T_F1, T_F2], [], [], [], [], [T_BOOM, T_PILE], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 10, 40, 100, 0.15, 0.4, R_EL, 10); burst(x, y, 4, 20, 50, 0.2, 0.4, R_COIN, 8); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.55 }); } }
  function hurtFx(s) {                                                                     // 岩石受击：火花 + 碎石 + 岩缝里溅出的火星
    const hx = HX + 1, hy = HY - 16; burst(hx, hy, s === DEATH ? 24 : 16, 50, 140, 0.25, 0.55, FXI.impact, 20); burst(hx, hy, s === DEATH ? 12 : 7, 30, 80, 0.3, 0.6, FXI.dust, 12);
    burst(hx, hy + 4, 5, 20, 60, 0.3, 0.5, R_EL, 16); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE) {                                                                // 投币口吸入金光
      chargeAcc += dt * (18 + 20 * clamp01(t / 1.2));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 9; spawn(K_SPIRAL_PT, wx(9.5), wy(-9 + P.crouch), r / (0.35 + Math.random() * 0.3), 0, 9, R_COIN, a, r, 4 + Math.random() * 3); }
    }
    emberAcc += dt * (state === CAST ? 30 : P.fume === 2 ? 12 : 4);                          // 烟囱耳吐火星
    while (emberAcc >= 1) { emberAcc -= 1; if (P.dq >= 1) continue; const s2 = Math.random() < 0.5 ? -1 : 1; spawn(K_EMBER, wx(s2 * 14) + RD(Math.random() * 2 - 1), wy(-20 + P.crouch - P.lift), Math.random() * 8 - 4, -10 - Math.random() * 10, 0.5 + Math.random() * 0.5, R_EL); }
    const lp = t % DUR[IDLE];
    if ((state === IDLE && ((lp > 0.9 && lp < 1.1) || (lp > 1.9 && lp < 2.1))) || state === RECOVER || (state === ATTACK && t > 0.4)) {   // 炮口冒烟（待机时两根轮流）
      smokeAcc += dt * (state === RECOVER ? 16 : 10);
      while (smokeAcc >= 1) { smokeAcc -= 1; const lower = state === IDLE ? (lp > 1.5 ? 1 : 0) : (Math.random() < 0.5 ? 1 : 0), [mx, my] = muzzle(lower, P[lower ? 'rc2' : 'rc1']); spawnX(K_PHYS, mx + 1, my - 1, 4 + Math.random() * 6, -10 - Math.random() * 8, 0.8 + Math.random() * 0.4, FXI.dust, { dragX: 0.5, age0: 0.25 }); }
    }
    if (state === MOVE) {                                                                   // 落地：扬尘 4 颗 + 震屏 1 格
      const f = gait(q12(t));
      if (f !== lastF) { if (f === 2) { sfx('step', { w: 0.95 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(-12 + i * 8) + (Math.random() - 0.5) * 3, HY, (i < 2 ? -1 : 1) * (8 + Math.random() * 14), -5 - Math.random() * 7, 0.35 + Math.random() * 0.25, FXI.dust); shake(0.1, 1); } lastF = f; }
    }
    if (state === DEATH && t > T_BOOM && t < INCOMING + 2.3) { riseAcc += dt * 22; while (riseAcc >= 1) { riseAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.8, Math.random() < 0.5 ? FXI.dust : R_EL); } }
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; pjAge[i] += dt; const k = pjK[i];
      if (!pjRest[i]) { pjVY[i] += pjG[i] * dt; pjX[i] += pjVX[i] * dt; pjY[i] += pjVY[i] * dt; }
      if (k === 1) {
        if (((pjAge[i] * 60) | 0) % 2 === 0) spawn(K_TRAIL, pjX[i] - 2, pjY[i] + 1, -20, 10, 0.25, R_EL);
        if (pjAge[i] >= pjT[i]) {                                                          // 熔金在空中炸开，化成金币流星雨
          pjOn[i] = 0; const x = pjX[i], y = pjY[i];
          burst(x, y, 20, 40, 110, 0.25, 0.6, R_EL, 6); burst(x, y, 8, 20, 60, 0.25, 0.5, R_COIN, 4); fx.cross(x, y, 6, R_EL, 0.25); ring(x, y, 0, R_EL);
          for (let j = 0; j < 8; j++) launch(2, x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 60 + (j - 3.5) * 5, 10 + Math.random() * 40, 420, 1.2);
          sfx('impact', { pal: 'fire', w: 0.6 });
        }
        continue;
      }
      if (k === 2 && !pjRest[i] && ((pjAge[i] * 60) | 0) % 2 === 0) spawn(K_TRAIL, pjX[i], pjY[i] - 2, (Math.random() - 0.5) * 6, -12, 0.2, R_EL);
      if (!pjRest[i] && pjY[i] >= HY - 1 && pjVY[i] > 0) {
        pjY[i] = HY - 1;
        if (pjB[i] === 0) {
          fx.cross(RD(pjX[i]), HY - 2, 2, R_COIN, 0.25); burst(pjX[i], HY - 1, k === 2 ? 5 : 2, 15, 45, 0.15, 0.35, R_EL, 16);   // 落地溅火星 + 金色「+」
          if (k === 2 && !landOnce) { landOnce = 1; ring(DUMMY_X, HY - 2, 1, R_EL); hitDummy(1); dummyFx({ dur: 0.9, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.95 }); }
        }
        if (pjB[i] < 1) { pjVY[i] *= -0.35; pjVX[i] *= 0.5; pjB[i]++; } else { pjVY[i] = 0; pjVX[i] = 0; pjRest[i] = 1; }
      }
      if (pjAge[i] >= pjT[i]) pjOn[i] = 0;
    }
    mz1 += dt; mz2 += dt;
  }
  function fxReset() { pjOn.fill(0); chargeAcc = 0; emberAcc = 0; smokeAcc = 0; lastF = -1; landOnce = 0; mz1 = mz2 = 9; riseAcc = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function drawShot(k, x, y, d, f12, Rr) {                                                 // 熔金炮弹：白芯 + 金黄 + 橙尾
    if (k !== 1) return false;
    put(x, y, 21); put(x + d, y, 47); put(x, y - 1, 47); put(x, y + 1, 46); put(x - d, y, 47); put(x - 2 * d, y, 46); put(x - 3 * d, y, 45); put(x - d, y + (f12 & 1 ? -1 : 1), 46); return true;
  }
  function fxFront(f12) {
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; const x = RD(pjX[i]), y = RD(pjY[i]), k = pjK[i];
      if (k === 1) { put(x, y, 21); put(x + 1, y, 21); put(x, y - 1, 47); put(x + 1, y - 1, 47); put(x - 1, y, 47); put(x + 2, y, 46); put(x, y + 1, 46); put(x + 1, y + 1, 46); put(x - 1, y + 1, 45); put(x - 2, y + 1, 44); if (f12 & 1) { put(x + 1, y - 2, 47); put(x - 1, y + 2, 46); } continue; }
      const fade = clamp01((pjAge[i] - (pjT[i] - 0.35)) / 0.35); if (fade > 0 && B8[((y + 64) & 7) * 8 + ((x + 64) & 7)] < fade) continue;
      if (pjRest[i]) { put(x, y, 14); put(x + 1, y, ((f12 + i) % 8) === 0 ? 21 : 5); }
      else if (((pjAge[i] * 12) | 0) % 3 === 2) { put(x, y - 1, 14); put(x, y, 61); if (k === 2) put(x, y - 2, 46); }
      else { put(x, y - 1, 5); put(x + 1, y - 1, 14); put(x, y, 14); put(x + 1, y, 61); if (k === 2) { put(x, y - 2, 47); put(x + 1, y - 2, 46); } }
    }
    for (const [tm, lower, rc] of [[mz1, 0, P.rc1], [mz2, 1, P.rc2]]) {                     // 炮口光：2 帧
      if (tm >= 2 / 12 || P.dq >= 1) continue; const [mx0, my0] = muzzle(lower, rc), mx = RD(mx0) + 1, my = RD(my0), c = tm < 1 / 12 ? EL[0] : EL[1];
      for (let r = 1; r <= 3; r++) { put(mx + r, my - (P.aim ? r >> 1 : 0), r < 3 ? c : EL[2]); put(mx, my - r, r < 2 ? c : EL[2]); put(mx, my + r, r < 2 ? c : EL[2]); } put(mx, my, EL[0]);
    }
  }

  return {
    name: '火神塔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_LAVA, M_HOT, M_AMB], HIT_POINT: [1, -16], EVENTS,
    deathKit: { mode: 'burst', at: T_BOOM },
    SFX: { body: 'machine', how: 'explode', pal: 'fire', style: 'meteor', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot, hurtFx,
  };
});
