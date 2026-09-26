// 旋翼机（部队 · 虚空 · 射手 · 优质 · 远程 640）：哥布林直升机进化成的武装旋翼机——同一个木桶座舱包上军绿铁皮（桶口还留着一道黄铜箍），
// 后面加了一截尾梁 + 竖尾翼 + 小尾桨，主旋翼加宽到 26 格；双联炮拆掉只剩机头下一只空炮架；哥布林戴上耳罩皮帽和金框护目镜（大尖耳从耳罩里戳出来），
// 肩上扛一门比机身还长的火箭筒（铁筒 + 两道红漆箍 + 侧面 3 格弹药灯，筒口伸出机头 6 格，筒尾喇叭口）。
// 攻击 = 火箭筒射出一发拖烟尾的小火箭；技能 = 特性「巨型爆能枪」（每 3 次攻击来一发重炮）：弹药灯一格一格亮起、筒口冒白烟、整机后仰
// → 一发巨型火箭拖着长烟尾飞出、后坐力把整机推后 3 格、筒尾喷火 → 大火球爆炸 + 大冲击环 + 往上翻滚的烟团，目标击退。
// 死亡 = 火箭筒先炸，整机在半空爆裂成碎片落下，旋翼单独飞出去（死亡套件 parts）。
// 由「哥布林直升机」（GoblinCopter.js）升级而来：保留旋翼、木桶座舱轮廓（桶口黄铜箍）、哥布林大尖耳。
// 身体不用现成骨架：机身、尾梁、尾桨、旋翼、火箭筒、耳罩皮帽 + 护目镜是本模块自画的部件；驾驶员用 parts 人形的头、躯干、手臂。
PCD.define('Whirlybird', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, death, sfx, parts } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    armor: { r: 'moss', band: 2 }, plate: 'moss', brass: 'sand', iron: 'iron', steel: 'steel', red: 'crimson', skin: 'green', coat: 'leather', cap: 'leather', gold: 'gold',
    ink: { r: 'ink', flat: 1 }, lens: { r: [40, 41, 22, 21], flat: 1 }, lamp: { r: [27, 44, 46, 21], flat: 1 },
  });
  const R_EL = FXI.fire, EL = FXR[R_EL], R_SMK = FXI.dust, HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(76, 54, 38, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  RIM.skip[M.lamp] = RIM.skip[M.skin] = RIM.skip[M.skinD] = RIM.skip[M.ink] = RIM.skip[M.lens] = RIM.skip[M.cap] = 1;
  const PILOT = { body: 'child', head: 6, headW: 6 }, SEAT = -11;

  // ───── 姿势 ─────
  // alt 离地增量 · pitch 机身俯仰（1 = 机头朝下）· rot 主旋翼相位（0–3，5–6 高速残影）· trot 尾桨相位 · tube 火箭筒后坐格数 · lights 弹药灯（0–3 亮几格，4 = 全亮发白）
  // ear 耳尖甩 · glint 护目镜反光；hx/hy、bhx/bhy 前 / 后手（驾驶员骨架本地坐标）
  const P = { alt: 0, bx: 0, pitch: 0, rot: 0, trot: 0, tube: 0, lights: 0, eyes: 0, flash: 0, hx: 0, hy: 0, bhx: 0, bhy: 0, head: 0, lean: 0, ear: 0, glint: 0,
    bob: 0, crouch: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['alt', -3, 4], ['bx', -5, 3], ['pitch', -1, 1], ['rot', 0, 6], ['trot', 0, 3], ['tube', 0, 2], ['lights', 0, 4], ['eyes', 0, 1], ['flash', 0, 1],
    ['hx', -2, 9], ['hy', -16, -4], ['bhx', -7, 6], ['bhy', -16, -4], ['head', -1, 1], ['lean', 0, 1], ['ear', -1, 1], ['glint', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const K_IDLE = { hx: 5, hy: -8, bhx: -4, bhy: -10, lean: 0 };          // 前手握火箭筒下的握把，后手扶筒身
  const K_PAT = { hx: 3, hy: -12, bhx: -4, bhy: -10, lean: 0 };          // 待机个性：拍拍炮筒
  const K_AIM = { hx: 5, hy: -8, bhx: -3, bhy: -10, lean: 1 };
  const K_HURT = { hx: 3, hy: -7, bhx: -5, bhy: -8, lean: 0 };
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean'], mixK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_FIRE = 2 / 12, T_POP = INCOMING + 0.3, T_BOOM = INCOMING + 0.5, T_LAND = INCOMING + 0.95;
  const W_PITCH = [0, 1, 0, -1], W_ALT = [0, 0, 1, 1], W_EAR = [0, 1, 0, -1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), f = f12of(t);
    P.st = st; P.alt = 0; P.bx = 0; P.pitch = 0; P.tube = 0; P.lights = 0; P.eyes = 0; P.flash = 0; P.head = 0; P.ear = 0; P.glint = 0;
    P.dq = 0; P.rim = 0; P.mx = 0; P.flip = 0; P.rot = (f12 >> 1) & 3; P.trot = f12 & 3;
    const idle = () => {
      mixK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5);
      P.alt = b & 1; P.ear = b & 1;
      const lp = tq % DUR[IDLE];                                          // 待机个性：拍两下炮筒，筒口吹出一口烟，护目镜反光一闪
      if (lp >= 1.3 && lp < 1.4) mixK(K_PAT, K_PAT, 0);
      else if (lp >= 1.4 && lp < 1.5) { mixK(K_PAT, K_PAT, 0); P.hy += 1; P.ear = 1; }
      else if (lp >= 1.5 && lp < 1.6) mixK(K_PAT, K_PAT, 0);
      else if (lp >= 1.6 && lp < 1.7) { mixK(K_PAT, K_PAT, 0); P.hy += 1; P.ear = 1; }
      else if (lp >= 1.7 && lp < 1.95) { P.head = 1; P.lean = 1; }
      else if (lp >= 1.95 && lp < 2.15) { P.glint = 1; P.head = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 武装巡航：机身随旋翼轻摆、尾桨转、平移
      mixK(K_IDLE, K_IDLE, 0); const g = E.gait(tq);
      P.pitch = W_PITCH[g]; P.alt = W_ALT[g]; P.ear = W_EAR[g]; P.rot = 5 + (f12 & 1); P.lean = 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                           // 预兆：机头微抬、瞄准 → 发射（筒后坐 2 格）→ 回位
      if (f < 2) { mixK(K_IDLE, K_AIM, ease.out(tq / 0.12)); P.pitch = -1; P.lights = 1; }
      else if (f === 2) { mixK(K_AIM, K_AIM, 0); P.tube = 2; P.bx = -1; P.ear = 1; P.eyes = 1; P.lights = 1; }
      else if (f < 5) { mixK(K_AIM, K_AIM, 0); P.tube = 1; P.ear = 1; }
      else mixK(K_AIM, K_IDLE, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE) {                                           // 弹药灯一格一格亮起，筒口冒白烟，整机后仰
      const q = ease.inOut(clamp01(tq / 0.7)); mixK(K_IDLE, K_AIM, q); P.pitch = q > 0.5 ? -1 : 0; P.bx = q > 0.5 ? -1 : 0;
      P.lights = tq < 0.35 ? 0 : tq < 0.7 ? 1 : tq < 1.05 ? 2 : ((f12 & 1) ? 4 : 3); P.rim = P.lights ? 2 : 1; P.ear = tq > 1.05 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === CAST) {                                             // 巨型火箭出膛：后坐力把整机推后 3 格
      mixK(K_AIM, K_AIM, 0); P.bx = tq < 1 / 12 ? -2 : -3; P.tube = 2; P.pitch = -1; P.lights = tq < 0.17 ? 4 : 3; P.rim = 3; P.eyes = 1; P.ear = 1; P.glint = 1;
    } else if (st === RECOVER) {                                          // 机身摆正，弹药灯熄灭
      const q = ease.inOut(clamp01(tq / 0.6)); mixK(K_AIM, K_IDLE, q); P.bx = RD(-3 * (1 - q)); P.tube = tq < 0.17 ? 1 : 0; P.pitch = q < 0.5 ? -1 : 0;
      P.lights = tq < 0.17 ? 2 : tq < 0.34 ? 1 : 0; P.rim = tq < 0.34 ? 2 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = -1; P.pitch = -1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { mixK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.ear = 1; }
      else mixK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 中弹 → 火箭筒噼啪冒火、弹药灯乱闪 → 空中殉爆
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.2) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = -1; P.pitch = -1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (tq < T_BOOM) { mixK(K_HURT, K_HURT, 0); P.bx = -2 + ((f12 & 1) ? 1 : 0); P.eyes = 1; P.ear = (f12 & 1) ? 1 : -1; P.pitch = (f12 & 1) ? 1 : -1; P.lights = (f12 & 1) ? 4 : 0; P.alt = -1; P.rot = (f12 >> 2) & 3; }
      else { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.dq = 1; }             // 之后由死亡套件（部件碎片）接管
    } else if (st === REVIVE) {
      idle(); P.alt = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.dq48 = RD(P.dq * 48);
    P.gx = P.bx + 16 - P.tube; P.gy = -21 - P.alt;                        // 发光体 = 筒口（技能蓄力的热光汇聚点）
    KEY(P);
  }

  // ───── 画（后 → 前：旋翼杆 + 主旋翼 → 尾梁 + 尾翼 → 尾桨 → 远侧耳 → 后臂 → 躯干 → 头 → 耳罩皮帽 + 护目镜 → 近侧耳 → 机身 → 空炮架 → 火箭筒 → 握把 → 前臂）─────
  let PIT = 0;
  const S = (x, y, m, t) => sp(x, y + (PIT ? RD(PIT * x / 10) : 0), m, t);
  const RUN = (y, x0, x1, m, t) => { for (let x = RD(x0); x <= RD(x1); x++) S(x, y, m, t); };
  const MAST_X = -3, ROTOR_Y = -36;
  function mast() {
    part();
    for (let y = ROTOR_Y + 3; y <= -18; y++) S(MAST_X, y, M.iron, 0);
    RUN(ROTOR_Y + 1, MAST_X - 2, MAST_X + 2, M.iron, 0); RUN(ROTOR_Y + 2, MAST_X - 1, MAST_X + 1, M.iron, 0); S(MAST_X - 2, ROTOR_Y + 1, M.iron, 4);   // 加大的桨毂
    S(MAST_X + 1, ROTOR_Y + 2, M.iron, 2); S(MAST_X - 1, -19, M.iron, 0); S(MAST_X + 1, -19, M.iron, 0);
  }
  // 候选部件：两叶旋翼（同哥布林直升机：叶片长度随转角变化，高速时隔点残影；这副桨尖漆了红色警示条）
  function rotor(cx, y, half, ph, m, tip) {
    part();
    if (ph >= 5) { for (let x = cx - half; x <= cx + half; x++) if (((x + ph) & 1) === 0 || Math.abs(x - cx) <= 4) S(x, y, m, Math.abs(x - cx) <= 4 ? 0 : 2); return; }
    const L = RD(half * [1, 0.8, 0.4, 0.8][ph]);
    RUN(y, cx - L, cx + L, m, 0); RUN(y + 1, cx - 2, cx + 2, m, 2);
    if (L >= 6) { S(cx - L, y, tip, 3); S(cx - L + 1, y, tip, 3); S(cx + L, y, tip, 3); S(cx + L - 1, y, tip, 3); }
    if (ph === 1 || ph === 3) for (let x = L + 2; x <= half; x += 2) S(cx + (ph === 1 ? x : -x), y, m, 2);
  }
  // 候选部件：尾梁 + 竖尾翼（锥形铁皮梁 3 → 2 行，每 3 列一颗铆钉；梁尾一片后掠竖尾翼）
  function tailBoom() {
    part();
    for (let x = -18; x <= -9; x++) { for (let y = -15; y <= (x >= -13 ? -13 : -14); y++) S(x, y, M.plate, 0); if ((x & 3) === 0) S(x, -15, M.plate, 4); }
    for (let y = -21; y <= -16; y++) RUN(y, -20 - (y <= -20 ? 1 : 0), -18 - (y <= -19 ? 1 : 0), M.plate, 0);   // 竖尾翼（顶端略后掠）
    RUN(-21, -21, -20, M.red, 3);                                                                          // 尾翼尖一道红
  }
  // 候选部件：尾桨（正对镜头的小两叶桨：竖 → 斜 → 横 → 斜 4 个相位，桨毂 1 格）
  function tailRotor(cx, cy, ph) {
    part();
    const D = [[0, 1], [1, 1], [1, 0], [1, -1]][ph];
    for (let k = -3; k <= 3; k++) if (k) S(cx + D[0] * k, cy + D[1] * k, M.steel, Math.abs(k) === 3 ? 4 : 3);
    S(cx, cy, M.ink, 0);
  }
  // 候选部件：哥布林大尖耳（同哥布林直升机）
  function goblinEar(R, far, e) {
    part(); const m = far ? M.skinD : M.skin, x0 = R.hx0 + (far ? 1 : 0), ey = R.ey - (far ? 2 : 0);
    const px = (x, y, t) => parts.px(E, R, x, y, m, t);
    if (far) { px(x0 - 1, ey - 1, 0); px(x0 - 2, ey - 2, 0); px(x0 - 3, ey - 3 + (e < 0 ? -1 : 0), 0); px(x0 - 3, ey - 2, 0); return; }
    px(x0 - 6, ey - 3 + e, 4); px(x0 - 5, ey - 2 + e, 0);
    for (let x = x0 - 4; x <= x0 - 3; x++) px(x, ey - 1 + (e > 0 && x === x0 - 4 ? 1 : 0), 0);
    for (let x = x0 - 3; x <= x0; x++) px(x, ey, x === x0 - 2 ? 2 : 0);
    px(x0 - 1, ey + 1, 0); px(x0, ey + 1, 0);
  }
  // 候选部件：耳罩飞行皮帽 + 金框护目镜（皮帽盖住头顶 2 行和脑后，两侧耳罩垂到下巴；护目镜带横过额头，镜片 2 格，glint 时发白）
  function flightCap(R, h) {
    part(); const px = (x, y, m, t) => parts.px(E, R, x, y, m, t);
    for (let x = h.x0; x <= h.x1; x++) { px(x, h.top - 1, M.cap, 0); px(x, h.top, M.cap, 0); }
    px(h.x0, h.top - 1, 0, 0); px(h.x1, h.top - 1, 0, 0);
    for (let y = h.top + 1; y <= h.bot + 1; y++) { px(h.x0, y, M.cap, 0); px(h.x0 + 1, y, M.cap, y === h.bot + 1 ? 2 : 0); }      // 耳罩
    px(h.x0 + 2, h.top, M.cap, 4); px(h.x0 + 1, h.bot + 1, M.gold, 3);                                                          // 帽顶缝线高光 · 耳罩扣
    for (let x = h.x0 + 2; x <= h.x1 - 2; x++) px(x, h.ey - 1, M.gold, 2);                                                       // 镜带
    px(h.x1 - 1, h.ey - 1, M.gold, 4); px(h.x1, h.ey - 1, M.gold, 3); px(h.x1 + 1, h.ey - 1, M.gold, 2);
    px(h.x1 - 1, h.ey, M.gold, 3); px(h.x1, h.ey, P.eyes ? M.gold : M.lens, P.glint ? 4 : P.eyes ? 2 : 3); px(h.x1 + 1, h.ey, M.gold, 2);   // 镜框 + 镜片
  }
  // 候选部件：装甲座舱（木桶包上军绿铁皮：桶口保留一道黄铜箍，铁皮分块 + 铆钉，机头圆鼓，机腹收窄）
  const HULL = [[-18, -6, 5], [-17, -7, 6], [-16, -8, 8], [-15, -8, 9], [-14, -8, 9], [-13, -8, 9], [-12, -8, 9], [-11, -7, 8], [-10, -6, 6], [-9, -4, 4]];
  function hull() {
    part();
    for (const [y, a, b] of HULL) RUN(y, a, b, y === -18 ? M.brass : M.armor, 0);
    for (let y = -16; y <= -11; y++) S(-2, y, M.armor, 2);                                  // 竖接缝
    RUN(-13, -7, 8, M.armor, 2);                                                            // 横接缝
    for (const x of [-6, -3, 0, 3, 6]) { S(x, -16, M.armor, 4); S(x + 1, -11, M.armor, 4); }   // 铆钉
    S(8, -15, M.armor, 4); S(9, -14, M.armor, 4);                                           // 机头圆鼓的高光
    RUN(-18, -5, 4, M.brass, 2);                                                            // 桶口内沿（黄铜箍留下来了）
  }
  // 候选部件：空炮架（拆掉双联炮后机头下剩下的铁叉架）
  function emptyMount() { part(); RUN(-10, 8, 10, M.iron, 0); S(11, -11, M.iron, 0); S(11, -9, M.iron, 0); S(8, -9, M.iron, 0); }
  // 候选部件：肩扛火箭筒（3 行铁筒，筒尾 5 行喇叭口、筒口 5 行加厚口箍，两道红漆箍，侧面 3 格弹药灯，顶上一支准星）
  function launcher(off, lights) {
    part(); const X = (x) => x - off;
    for (let y = -22; y <= -20; y++) RUN(y, X(-8), X(13), M.iron, 0);
    for (let y = -23; y <= -19; y++) { S(X(-10), y, M.iron, 0); if (y > -23 && y < -19) S(X(-9), y, M.iron, 0); }   // 筒尾喇叭口
    S(X(-9), -23, M.iron, 0); S(X(-9), -19, M.iron, 0); S(X(-10), -21, M.ink, 0);
    for (let y = -23; y <= -19; y++) { S(X(14), y, M.iron, 0); S(X(15), y, M.iron, y === -23 ? 4 : 0); }          // 筒口加厚口箍
    for (const x of [1, 2, 9, 10]) for (let y = -22; y <= -20; y++) S(X(x), y, M.red, 0);                          // 红漆箍
    RUN(-22, X(-7), X(12), M.iron, 4);                                                                               // 筒顶高光
    S(X(6), -23, M.iron, 0); S(X(7), -24, M.iron, 3); S(X(7), -23, M.iron, 0);                                       // 准星
    const L = [[-6, 1], [-4, 2], [-2, 3]];
    for (const [x, n] of L) S(X(x), -21, M.lamp, lights === 4 ? 4 : lights >= n ? 3 : 1);                            // 弹药灯
  }
  function drawHero() {
    begin(hero, P.bx, -P.alt);
    PIT = P.pitch;
    const R = parts.rig(P, PILOT); R.oy = SEAT;
    mast(); rotor(MAST_X, ROTOR_Y, 13, P.rot, M.iron, M.red);
    tailBoom(); tailRotor(-19, -17, P.trot);
    goblinEar(R, 1, P.ear);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.coatD, hand: M.skinD, grip: 'fist' });
    parts.torso(E, R, P, { style: 'leather', mat: M.coat, collar: M.gold });
    const h = parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, nose: 'long', mouth: 'wide', ear: 'none' });
    flightCap(R, h);
    goblinEar(R, 0, P.ear);
    hull(); emptyMount();
    launcher(P.tube, P.lights);
    part(); for (let y = -19; y <= -18; y++) S(5 - P.tube, y, M.iron, 0); S(6 - P.tube, -19, M.iron, 0);          // 握把
    parts.arm(E, R, P, { side: 'F', sleeve: 'tight', mat: M.coat, hand: M.skin, grip: 'fist' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, big = 0, chargeAcc = 0, smokeAcc = 0, soulAcc = 0, lastG = -1, puffed = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const muzzle = () => [wx(16 - P.tube + P.bx), wy(-21 - P.alt)];
  function onEnter(s) {
    if (s !== CAST) return;
    const m = muzzle(), rx = wx(-11 + P.bx), ry = wy(-21 - P.alt);
    releaseOrbit(40, 90, 0.3, 0.6, { up: 6 });
    shoot(2, m[0] + 2, m[1], 150, DUMMY_X - 5, R_SMK, 0, { trail: { every: 1, life: [0.35, 0.75], back: [2, 10], off: 5 }, glow: -1 });   // 巨型火箭，长烟尾
    fx.cross(m[0] + 1, m[1], 6, R_EL, 0.3); burst(m[0], m[1], 14, 30, 80, 0.2, 0.45, R_EL, 6);
    burst(rx, ry, 16, 30, 90, 0.25, 0.55, R_EL, 4); burst(rx, ry, 10, 20, 50, 0.4, 0.8, R_SMK, 6);                                 // 筒尾后喷
    mzT = 0; mzX = m[0]; mzY = m[1]; big = 1;
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {
      const m = muzzle(); mzX = m[0]; mzY = m[1]; mzT = 0; big = 0;
      shoot(1, m[0] + 2, m[1], 190, DUMMY_X - 3, R_SMK, 0, { trail: { every: 1, life: [0.2, 0.45], back: [3, 10], off: 3 }, glow: -1 });
      burst(wx(-11 + P.bx), wy(-21 - P.alt), 6, 20, 50, 0.3, 0.6, R_SMK, 4);
      sfx('swing', { kind: 'gun', w: 0.5 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === DEATH && Math.abs(t - T_POP) < 1e-9) {                                               // 火箭筒先炸：筒身一团火
      const x = wx(4 + P.bx), y = wy(-21 - P.alt); burst(x, y, 16, 40, 100, 0.2, 0.5, R_EL, 12); fx.cross(x, y, 4, R_EL, 0.2); shake(0.12, 1);
    }
    if (s === DEATH && Math.abs(t - T_BOOM) < 1e-9) {                                              // 整机空中爆裂，旋翼单独飞出去
      poseAt(DEATH, T_BOOM - 1 / 12, T_BOOM - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 1.25, fromX: 2, fromY: -19, fadeAt: 1.25, fadeDur: 0.7 });
      const x = wx(0), y = wy(-19);
      burst(x, y, 34, 50, 150, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL); fx.cloud(x, y - 4, 9, R_SMK, 1.1); fx.cross(x, y, 6, R_EL, 0.25);
      shake(0.2, 2); flash(0.05);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 14 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.55 }); }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [T_POP, T_BOOM, T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 10); burst(x, y, 5, 10, 30, 0.3, 0.6, R_SMK, 8); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.45 }); }
    else if (k === 2) {                                                                              // 大火球：火焰外爆 + 大冲击环 + 往上翻滚的烟团
      burst(x, y, 40, 60, 160, 0.3, 0.75, R_EL, 18); ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.3); fx.cloud(x, y - 5, 9, R_SMK, 1.2);
      for (let i = 0; i < 10; i++) spawn(K_RISE, x - 6 + Math.random() * 12, y - 2 - Math.random() * 6, (Math.random() - 0.5) * 10, -16 - Math.random() * 14, 0.7 + Math.random() * 0.6, R_SMK);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.8 });
    }
  }
  function stepFX(dt, state, stT) {
    const m = muzzle();
    if (state === CHARGE && stT > 0.35) {                                                            // 筒口冒白烟 + 热光螺旋收进筒口
      smokeAcc += dt * 10; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, m[0] + (Math.random() - 0.5) * 2, m[1] - 1, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6 + Math.random() * 0.5, R_SMK); }
      if (stT > 0.7) { chargeAcc += dt * (16 + 24 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, m[0], m[1], (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    }
    if (state === RECOVER || (state === DEATH && stT > INCOMING && stT < T_BOOM)) {                    // 收招：筒口余烟；死亡：筒身冒火冒烟
      smokeAcc += dt * (state === DEATH ? 30 : 8);
      while (smokeAcc >= 1) { smokeAcc -= 1; const dy = state === DEATH; spawn(K_RISE, (dy ? wx(-2 + Math.random() * 10) : m[0]) + (Math.random() - 0.5) * 2, dy ? wy(-22) : m[1] - 1, (Math.random() - 0.5) * 8, -10 - Math.random() * 10, 0.5 + Math.random() * 0.5, dy && Math.random() < 0.4 ? R_EL : R_SMK); }
    }
    if (state === IDLE) { const lp = q12(stT) % DUR[IDLE]; if (lp >= 1.75 && lp < 1.8 && !puffed) { puffed = 1; for (let i = 0; i < 5; i++) spawn(K_RISE, m[0] + 1 + Math.random() * 2, m[1], 6 + Math.random() * 8, -4 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_SMK); } if (lp < 1.7) puffed = 0; }   // 待机：筒口吹出一口烟
    if (state === MOVE) { const g = E.gait(q12(stT)); if (g !== lastG) { lastG = g; if (g === 0 || g === 2) for (let i = 0; i < 2; i++) spawn(K_DUST, wx(-8 + Math.random() * 16), HY, (Math.random() - 0.5) * 36, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); } }   // 旋翼下洗气流扬尘
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 28, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt;
  }
  function fxReset() { mzT = 9; big = 0; chargeAcc = 0; smokeAcc = 0; soulAcc = 0; lastG = -1; puffed = 0; }
  function fxBack(f12) {
    if (P.dq < 1) groundShadow(wx(-2), 10, 9 + P.alt);
    if (P.dq < 1 && P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (mzT < (big ? 3 : 2) / 12) {                                                                  // 筒口火光：攻击小十字，技能大十字
      const L = big ? 5 : 3, early = mzT < 1 / 12;
      for (let r = 1; r <= L; r++) { const c = r <= 1 ? EL[0] : r <= L * 0.6 ? (early ? EL[1] : EL[2]) : EL[early ? 2 : 3]; put(mzX + r, mzY, c); if (r <= L - 1) { put(mzX + 1, mzY - r, c); put(mzX + 1, mzY + r, c); } }
      put(mzX, mzY, EL[0]);
    }
    if (P.dq < 1 && P.lights === 4 && !P.flash) { const x = wx(-4 - P.tube + P.bx), y = wy(-21 - P.alt); put(x, y - 2, EL[1]); put(x - 2, y - 2, EL[2]); put(x + 2, y - 2, EL[2]); }   // 弹药灯全亮时冒的热光点
  }
  // 火箭：尖头铁弹头 + 红箍 + 尾焰（小火箭 5 格；巨型火箭 8 格、2 行粗、尾焰闪烁）
  function drawShot(k, x, y, d, f12) {
    if (k === 1) { put(x + d, y, 29); put(x, y, 28); put(x - d, y, 13); put(x - 2 * d, y, 28); put(x - 3 * d, y, f12 & 1 ? 47 : 21); put(x - 4 * d, y, 46); return true; }
    if (k === 2) {
      put(x + 2 * d, y, 30); for (let i = -4; i <= 1; i++) { put(x + i * d, y, i === -1 || i === -2 ? 13 : 29); put(x + i * d, y + 1, i === -1 || i === -2 ? 12 : 28); }
      put(x - 4 * d, y - 1, 28); put(x - 4 * d, y + 2, 28);
      put(x - 5 * d, y, 21); put(x - 5 * d, y + 1, 47); put(x - 6 * d, y, 47); put(x - 6 * d, y + 1, 46); put(x - 7 * d, y + (f12 & 1), 45);
      return true;
    }
    return false;
  }

  return {
    name: '旋翼机', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lamp], HIT_POINT: [0, -15], EVENTS,
    deathKit: { mode: 'parts', at: T_BOOM },
    SFX: { body: 'machine', how: 'explode', pal: 'fire', style: 'fire', w: 0.55, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
