// 魔豹（衍生单位 · 恶魔 · 射手 · 普通 · 远程 600；desc「地狱之门的远程型召唤物」，召唤者 地狱召唤塔）：
//   修长弓背猎豹：腿长腰细、背微弓、随时要扑；暗金短毛满布靛蓝焰斑。
//   肩胛伸出两条墨色魔焰长触须，向上弯出 8 格，末端燃蓝焰（发光体）；尾巴分叉成两条，末端各一簇蓝焰；额头一枚血红门形烙印（地狱召唤塔的门）。
// 待机 = 甩双尾，两条触须像蛇一样错相位缓缓扭动。移动 = 弹跃：每两步一次小跳离地 2 格，落地无尘。
// 攻击 = 触须鞭甩 × 射：两条触须后引 → 像鞭子向前一甩，甩出一颗蓝焰魔弹。
// 技能（无特性，表现地狱召唤物的全力一击）：两条触须向上盘绕，尖端蓝焰汇聚成两颗大焰球、额头烙印闪红 → 两触须交叉一甩，
//   两颗魔焰弹走上下两条线交叉飞出 → 在假人处交叉成 X 爆开，目标被蓝焰点燃。
// 死亡 = 融化：侧倒后身体按列塌成一滩（死亡套件 melt），焰滩上蓝焰慢慢燃尽。
// 身体用 parts-beast 的 quad（cat 头放大）拼；魔焰触须、分叉焰尾、弓背、靛蓝焰斑、门形烙印是本模块的候选部件。设定卡见 pcd/batch-05/MagicLeopard/design.md。
PCD.define('MagicLeopard', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, hash } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：魔焰 · 靛蓝（自建 hexblue）─────
  const R_EL = fxRamp('hexblue', ['#ffffff', '#cfe0ff', '#5a7cff', '#2c2cb4', '#0e0c44']), EL = FXR[R_EL];

  // ───── 材质 ─────
  const m = B.mats(E, {
    main: [20, 19, 61, 14],                                                                   // 暗金短毛
    belly: [20, 61, 14, 5],                                                                   // 浅金腹线
    muz: [20, 61, 14, 5],
    eye: [EL[3], EL[3], EL[1], EL[0]],                                                        // 魔焰蓝眼
    glow: [EL[3], EL[2], EL[1], EL[0]],
    tent: [0, 52, 53, 54],                                                                    // 墨紫触须
    tentD: [0, 0, 52, 53],
    brand: 'blood',                                                                           // 血红门形烙印
    claw: 'bone', teeth: 'white',
  });
  m.body = E.defMat([20, 19, 61, 14], 2);
  const M_FLAME = E.defMat([EL[3], EL[2], EL[1], EL[0]], 1, 1);                               // 触须尖 / 尾尖蓝焰（发光体，平涂，按 tone 取级）
  const M_SPOT = E.defMat([EL[4], EL[3], EL[3], EL[2]], 1);                                   // 靛蓝焰斑（并进躯干部件）
  const HEAD = { type: 'cat', w: 7, h: 6, snout: 1.5, snH: 3.5, tip: 0.8, ear: 'point', earH: 2.5, teeth: 1 };
  const o = Q.shape({ len: 14, chest: 3.7, rump: 3.2, waist: 1, hump: 0.6, leg: 8, lw: 1, thigh: 1.7, lieLegs: 0, farDx: -2, stride: 3, lift: 2,
    neck: 3, neckA: 0.75, neckW: 2.2, head: HEAD, headA: 0.12, tail: 'none', mane: 'none', foot: 'paw', fur: 0, m });
  const ARCH = 1.8;                                                                           // 弓背：背线中段额外拱起的格数（自画，并进躯干部件）

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 58, 48, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 0 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'tent', 'tentD', 'brand']) RIM.skip[m[k]] = 1; RIM.skip[M_FLAME] = 1; RIM.skip[M_SPOT] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['tm', 0, 7], ['tn', 0, 3], ['fl', 0, 4], ['br', 0, 1], ['tf', -2, 2]]);
  // tm 触须形态（0 竖起扭动 · 1 后引 · 2 前甩 · 3 盘绕 · 4 交叉前甩 · 5 垂软 · 6 半举 · 7 交叉余势）· tn 扭动相位 · fl 焰档（0 小 · 1 亮 · 2 大焰球 · 3 爆闪 · 4 熄灭）
  // br 烙印亮 · tf 双尾分叉摆
  const P = {};
  function reset() { Q.reset(P); P.tm = 0; P.tn = 0; P.fl = 0; P.br = 0; P.tf = 0; }
  reset();
  let rig = Q.rig(P, o);

  // ───── 候选部件：flameTentacle —— 肩胛魔焰触须 ─────
  // 从肩胛背线长出的一条 9 格触须：a0 根部角（0 朝上，+ 朝前）、c 每格弯曲、摆相位 → 逐格折线；根部 2 格粗，往尖变 1 格；尖端一簇蓝焰。
  // 每种形态分近侧 n / 远侧 f 两条：['a', 根部角 a0（0 朝上，+ 朝前）, 每格弯曲 c, 钩起始格 hk, 钩弯曲 hc, 长 L] 折线；
  //   ['b', c1x, c1y, ex, ey] 二次贝塞尔（相对根部；鞭甩的定格用，尖端位置精确可控）。amp = 蛇形摆幅
  const TM = [
    { n: ['a', -0.55, 0.13], f: ['a', -1.0, 0.13], amp: 0.22 },                    // 0 竖起扭动：向上后仰、尖端前勾
    { n: ['a', -1.2, -0.03], f: ['a', -1.65, -0.03], amp: 0.05 },                  // 1 后引（蓄鞭）
    { n: ['b', 9, -13, 22, -6], f: ['b', 3, -15, 15, -12], amp: 0 },               // 2 前甩：近侧越过头前 3 格以上、鞭梢朝前下
    { n: ['a', 0.1, -0.03, 10, 0.5, 13], f: ['a', -0.18, 0.02, 10, -0.55, 13], amp: 0.05 },   // 3 盘绕：两根竖起，近侧尖端前勾、远侧尖端后勾
    { n: ['b', 9, -11, 22, -10], f: ['b', 4, -27, 27, 1], amp: 0 },                // 4 交叉前甩：近侧斜向前上越过吻尖、远侧从头顶高处向前下劈，两根交成 X
    { n: ['a', -1.75, 0.08], f: ['a', -2.2, 0.08], amp: 0.04 },                    // 5 垂软（死亡 / 受击甩后）
    { n: ['a', -0.3, 0.1], f: ['a', -0.7, 0.1], amp: 0.08 },                    // 6 半举（过渡）
    { n: ['b', 7, -9, 17, -6], f: ['b', 4, -18, 18, -3], amp: 0 },                 // 7 交叉余势（施放后段，X 收小）
  ];
  const TL = 11;
  function tentBase(rg, far) {
    if (rg.lie) return [R(rg.C1.x) - 1 + (far ? -2 : 0), R(rg.C1.y) - 1];
    const x = R(rg.C1.x - rg.C1.r * 1.1) + (far ? -4 : 0), s = Q.span(rg, o, x), t = (x - rg.C2.x) / (rg.C1.x - rg.C2.x);
    return [x, (s ? s[0] : R(rg.C1.y - rg.C1.r)) + 1 - R(ARCH * Math.sin(Math.PI * Math.min(1, Math.max(0, t) * 1.15)) * rg.sq)];
  }
  function tentPts(rg, far, out) {                                                            // 返回折线点列 [x0, y0, x1, y1, ...]
    const b = tentBase(rg, far), T = TM[P.tm | 0], S = far ? T.f : T.n, ph = ((P.tn | 0) + (far ? 2 : 0)) * 1.5708;
    let x = b[0], y = b[1]; out.length = 0; out.push(x, y);
    if (!rg.lie && S[0] === 'b') {
      const cx = x + S[1], cy = y + S[2], ex = x + S[3], ey = y + S[4], n = Math.max(6, R(Math.hypot(S[1], S[2]) + Math.hypot(S[3] - S[1], S[4] - S[2])));
      for (let k = 1; k <= n; k++) { const q = k / n, u = 1 - q; out.push(u * u * x + 2 * u * q * cx + q * q * ex, Math.min(-1, u * u * y + 2 * u * q * cy + q * q * ey)); }
      return out;
    }
    let a = S[1], c = S[2]; const hk = S[3] || 99, hc = S[4] || 0, L = S[5] || TL;
    if (rg.lie) { a = -1.9 + (far ? 0.25 : 0); c = 0.06; }
    for (let k = 1; k <= L; k++) {
      const w = Math.sin(ph + k * 0.75) * T.amp * (k / L + 0.3);
      a += (k >= hk && !rg.lie ? hc : c) + w * 0.5; x += Math.sin(a); y -= Math.cos(a); if (y > -1) y = -1; out.push(x, y);
    }
    return out;
  }
  const PTS = [], PTS2 = [];
  const FL_T = [[3, 2], [4, 3], [4, 3], [4, 4], [0, 0]];        // 焰档 → [芯 tone, 外焰 tone]
  function tentFlame(x, y, lv, big) {                           // 尖端蓝焰：芯 + 上窜焰舌；大焰球时 3×3 + 焰舌 3 格
    if (lv === 4) { U.dot(E, x, y, m.tentD, 2); return; }
    const t = FL_T[lv];
    U.dot(E, x, y, M_FLAME, t[0]); U.dot(E, x, y - 1, M_FLAME, t[1]); U.dot(E, x, y - 2, M_FLAME, 2);
    if (lv >= 1) { U.dot(E, x - 1, y, M_FLAME, 2); U.dot(E, x + 1, y, M_FLAME, 3); }
    if (big) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) U.dot(E, x + i, y + j, M_FLAME, i === 0 && j === 0 ? 4 : (i + j) < 0 ? 3 : 2); U.dot(E, x, y - 2, M_FLAME, 3); U.dot(E, x - 1, y - 2, M_FLAME, 2); U.dot(E, x + (P.tn & 1 ? 1 : 0), y - 3, M_FLAME, 2); }
  }
  function flameTentacle(far) {
    E.part(); const p = tentPts(rig, far, far ? PTS2 : PTS), mat = far ? m.tentD : m.tent;
    const n = (p.length >> 1) - 1;
    for (let k = 0; k < n; k++) {
      const x0 = p[2 * k], y0 = p[2 * k + 1], x1 = p[2 * k + 2], y1 = p[2 * k + 3];
      U.seg(E, x0, y0, x1, y1, k < 5 ? 2 : 1, mat, k < 5 ? 0 : 3);
      if (k >= n - 4 && ((n - k) & 1)) U.dot(E, x1, y1, M_FLAME, 2);                          // 触须上的焰纹（越近尖越密）
    }
    const tx = p[2 * n], ty = p[2 * n + 1], lv = P.fl | 0;
    tentFlame(tx, ty, lv, lv === 2 || lv === 3);
  }
  function tipAt(rg, far) { const p = tentPts(rg, far, far ? PTS2 : PTS), n = p.length - 2; return [R(p[n]), R(p[n + 1])]; }

  // ───── 候选部件：forkTail —— 分叉双尾 ─────
  // 尾根往后上 3 格一段主干，再分成上下两条细尾各 6 格，末端各一簇蓝焰；tf 两条错相位摆
  function forkTail() {
    E.part(); const t = rig.tail, lie = rig.lie, sw = (P.tail | 0) * 0.18, tf = (P.tf | 0) * 0.2;
    let x = t.x, y = t.y, a = lie ? -0.1 : -0.55;                                          // a：从正后方量，+ 上翘
    for (let k = 0; k < 3; k++) { U.disc(E, x, y, k === 0 ? 1 : 0.6, m.limb, 0); x -= Math.cos(a); y -= Math.sin(a); if (y > -1) y = -1; a += 0.12 + sw * 0.4; }
    for (let s = 0; s < 2; s++) {
      let bx = x, by = y, ba = a + (s ? -0.55 : 0.55) + (s ? -tf : tf) + (lie ? -0.4 : 0);
      for (let k = 0; k < 6; k++) {
        U.dot(E, bx, by, s ? m.far : m.limb, k < 2 ? 0 : 3);
        bx -= Math.cos(ba); by -= Math.sin(ba); if (by > -1) by = -1; ba += (s ? -0.05 : 0.14) + sw * (0.25 + k * 0.08);
      }
      const lv = P.fl === 4 ? 4 : Math.min(1, P.fl | 0);
      if (lv === 4) U.dot(E, bx, by, m.tentD, 2); else { U.dot(E, bx, by, M_FLAME, lv ? 4 : 3); U.dot(E, bx - 1, by, M_FLAME, 2); U.dot(E, bx, by - 1, M_FLAME, 3); U.dot(E, bx - 1, by - 1 - ((P.tn + s) & 1), M_FLAME, 2); }
    }
  }
  // 候选部件：archBack —— 弓背（紧跟 Q.body，并进躯干部件）：在背线中段按 sin 拱起 ARCH 格，猫科随时要扑的弓背
  function archBack() {
    if (rig.lie) return;
    const C1 = rig.C1, C2 = rig.C2;
    for (let x = Math.ceil(C2.x); x <= Math.floor(C1.x); x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      const t = (x - C2.x) / (C1.x - C2.x), h = R(ARCH * Math.sin(Math.PI * Math.min(1, t * 1.15)) * rig.sq);
      for (let k = 1; k <= h; k++) U.dot(E, x, s[0] - k, m.body, 0);
    }
  }
  // 躯干细节（紧跟 Q.body，并进躯干部件）：靛蓝焰斑——每块 2 格一横 + 上方 1 格焰尖，按 hash 散布
  function spots() {
    if (rig.lie === 2) return;
    const C2 = rig.C2, C1 = rig.C1;
    for (let x = R(C2.x - C2.r + 1); x <= R(C1.x + C1.r * 0.6); x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      for (let y = s[0] + 2; y <= s[1] - 2; y++) {
        const rx = x - R(C2.x) + 40, ry = y - R(C2.y) + 40;
        if (((rx * 3 + ry * 5) % 7) === 0 && hash(rx, ry) < 0.75) { U.dot(E, x, y, M_SPOT, 3); U.dot(E, x + 1, y, M_SPOT, 2); if (y - 1 > s[0]) U.dot(E, x, y - 1, M_SPOT, 4); }
      }
    }
  }
  // 头部细节（紧跟 Q.head，并进头部件）：额头血红门形烙印（∩ 3 宽 3 高），br 1 = 闪红
  function brand(F) {
    const c = F.at(-F.W * 0.05, -F.Hh * 0.5), x = R(c[0]), y = R(c[1]), t = P.br ? 4 : 3;
    U.dot(E, x, y - 1, m.brand, t); U.dot(E, x - 1, y, m.brand, t); U.dot(E, x + 1, y, m.brand, t); U.dot(E, x - 1, y + 1, m.brand, 2); U.dot(E, x + 1, y + 1, m.brand, 2);
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {                                                                    // 甩双尾、触须错相位蛇形扭动；1.6–2.0 s 双尾大甩一次
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.tn = Math.floor(f12 / 3 + 1e-6) & 3; P.tf = [0, 1, 0, -1][Math.floor(f12 / 4 + 1e-6) & 3]; P.fl = (f12 % 10) < 2 ? 1 : 0;
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const i = f12of(lp - 1.6); P.tail = [2, -2, 2, -1, 0][i]; P.tf = [2, -2, 2, -2, 0][i]; P.head = i < 3 ? -1 : 0; }
  }
  const T_FIRE = 3 / 12;
  const ATK = [                                                                               // [tm, crouch, pitch, head, bx, fl]
    [0, 1, 0, 0, 0, 0], [1, 1, 1, -1, -1, 1], [1, 2, 1, -1, -1, 1], [2, 0, 0, 0, 1, 3], [2, 0, 0, 0, 1, 1], [2, 0, 0, 0, 1, 0], [6, 0, 0, 0, 0, 0], [6, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0],
  ];
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 弹跃：经过帧 1 离地 2 格
      const f = Q.anim.walk(P, tq); P.lift = f === 1 ? 2 : 0; P.tn = f; P.tf = [1, 0, -1, 0][f]; P.head = f === 1 ? -1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const a = ATK[Math.min(8, f12of(tq))]; P.tm = a[0]; P.crouch = a[1]; P.pitch = a[2]; P.head = a[3]; P.bx = a[4]; P.fl = a[5];
      P.tn = f12 & 3; P.rim = a[5] === 3 ? 1 : 0; P.tail = a[0] === 1 ? 1 : a[0] === 2 ? -1 : 0;
    } else if (st === CHARGE) {                                                                // 触须向上盘绕，焰球变大，烙印闪红
      P.tm = tq < 0.25 ? 0 : tq < 0.55 ? 6 : 3; P.crouch = tq < 0.3 ? 1 : 2; P.pitch = tq < 0.5 ? 0 : 1; P.head = -1; P.tn = f12 & 3;
      P.fl = tq < 0.5 ? 1 : 2; P.br = tq > 0.5 && (f12 & 1) ? 1 : tq > 1.0 ? 1 : 0; P.glow = tq > 0.9 ? 2 : 0; P.ear = 1;
      P.rim = tq < 0.4 ? 1 : 2; if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tf = (f12 & 1) ? 2 : -2; }
    } else if (st === CAST) {                                                                  // 两触须交叉一甩
      const i = f12of(tq); P.tm = i < 2 ? 4 : 7; P.bx = i < 2 ? 2 : 1; P.pitch = 0; P.crouch = i < 2 ? 0 : 1; P.fl = i < 2 ? 3 : 1; P.br = 1; P.glow = 2; P.rim = i < 2 ? 3 : 2; P.jaw = i < 3 ? 2 : 1; P.tail = -2; P.tf = -1;
    } else if (st === RECOVER) {
      P.tm = tq < 0.2 ? 7 : tq < 0.45 ? 6 : 0; P.bx = tq < 0.2 ? 1 : 0; P.crouch = tq < 0.3 ? 1 : 0; P.fl = tq < 0.35 ? 1 : 0; P.rim = tq < 0.3 ? 1 : 0; P.jaw = tq < 0.15 ? 1 : 0; P.tn = f12 & 3;
    } else if (st === HURT) {                                                                  // 触须和双尾惯性后甩
      const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.tm = h < 0.2 ? 1 : h < 0.35 ? 6 : 0; P.tf = h < 0.2 ? 2 : 0; P.fl = h < 0.2 ? 3 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (tq < T_MELT) { Q.anim.death(P, d, f12); P.dq = 0; P.tm = d < 0.3 ? 1 : 5; P.tf = d < 0.3 ? 2 : 0; P.fl = d < 0.3 ? 3 : d < 0.5 ? ((f12 & 1) ? 1 : 4) : 4; }
      else { Q.anim.death(P, T_MELT - INCOMING - 1 / 12, f12); P.tm = 5; P.fl = 4; P.dq = 1; }   // 之后由死亡套件（融化）接管
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.fl = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    const tp = tipAt(rig, 0); P.gx = tp[0] + P.bx; P.gy = tp[1] - (P.lie ? 0 : 0);
    B.key(P, SPEC);
  }
  const T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_MELT = T_LAND + 3 / 12;

  function drawHero() {
    begin(hero, P.bx, 0);
    flameTentacle(1);
    Q.legs(E, rig, P, o, rig.lie === 2 ? 1 : 1);
    forkTail();
    Q.body(E, rig, P, o); archBack(); spots();
    Q.legs(E, rig, P, o, 0);
    flameTentacle(0);
    Q.head(E, rig, P, o); brand(Q.headFrame(rig, o, P.jaw));
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  const HIT_POINT = (() => { poseAt(IDLE, 0, 0); return [R(rig.C1.x - 2), R(rig.C1.y)]; })();

  // ───── 特效 ─────
  const TGT = HY - 13;
  let chargeAcc = 0, meltAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, boltT = 9, BL = [], xYc = 0, whipT = 9, xT = 9, xX = 0, xY = 0, meltT = 9, hitN = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function tipsW() { const a = tipAt(rig, 0), b = tipAt(rig, 1); return [wx(a[0] + P.bx), wy(a[1]), wx(b[0] + P.bx), wy(b[1])]; }
  function onEnter(s) {
    if (s === CAST) {                                                                           // 交叉一甩：两颗魔焰弹一上一下交叉飞出
      releaseOrbit(40, 100, 0.25, 0.55, { pts: 1, ramp: R_EL });
      poseAt(CAST, 0, 0);                                                                       // 取施放定格的两个触须尖（近侧高、远侧低）
      const t = tipsW(), hi = t[1] <= t[3] ? [t[0], t[1]] : [t[2], t[3]], lo = t[1] <= t[3] ? [t[2], t[3]] : [t[0], t[1]];
      // 两弹一上一下交叉：上弹往下落到假人下半、下弹往上抬到假人上半（各自上下至少 6 格），飞到一半左右交叉一次
      const vx = 118, d1 = Math.max(10, DUMMY_X - 3 - hi[0]), d2 = Math.max(10, DUMMY_X - 3 - lo[0]);
      const gap = Math.max(4, lo[1] - hi[1]), tot = gap / 0.6, dl = Math.max(6, R(tot * 0.35)), dh = Math.max(6, R(tot - dl));   // 飞到约 60% 处交叉
      const e1 = hi[1] + dh, e2 = lo[1] - dl; xYc = R((e1 + e2) / 2);
      BL = [[hi[0] + 1, hi[1], vx, (e1 - hi[1]) * vx / d1], [lo[0] + 1, lo[1], vx, (e2 - lo[1]) * vx / d2]]; boltT = 0;
      shoot(2, hi[0] + 1, hi[1], vx, DUMMY_X - 3, R_EL, (e1 - hi[1]) * vx / d1, { trail: { every: 1, life: [0.12, 0.3], back: [8, 26], off: 2 } });
      shoot(2, lo[0] + 1, lo[1], vx, DUMMY_X - 3, R_EL, (e2 - lo[1]) * vx / d2, { trail: { every: 1, life: [0.12, 0.3], back: [8, 26], off: 2 }, glow: -1 });
      fx.cross(hi[0], hi[1], 6, R_EL, 0.25); fx.cross(lo[0], lo[1], 4, R_EL, 0.2); whipT = 0; hitN = 0;
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' }); sfx('shoot', { proj: 'fire' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                                         // 触须鞭甩，甩出一颗蓝焰魔弹
      const tp = tipsW(); mzT = 0; mzX = tp[0]; mzY = tp[1]; whipT = 0;
      shoot(1, tp[0] + 1, tp[1], 220, DUMMY_X - 3, R_EL, (TGT - tp[1]) * 220 / Math.max(10, DUMMY_X - 3 - tp[0]), { trail: { every: 1, life: [0.08, 0.2], back: [8, 22] } });
      sfx('swing', { kind: 'slash', w: 0.35 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 6; i++) spawn(K_EMBER, HX - 10 + Math.random() * 20, HY - 2, (Math.random() - 0.5) * 20, -8 - Math.random() * 8, 0.4, R_EL); shake(0.1, 1); sfx('fall', { w: 0.4 }); }
    if (s === DEATH && t === T_MELT) {                                                          // 塌成一滩蓝焰
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      burnTint();
      death.start('melt', { fadeAt: 1.2, fadeDur: 0.7 }); meltT = 0;
      burst(HX - 2, HY - 3, 14, 20, 60, 0.3, 0.6, R_EL, 18);
    }
  }
  // 融化前把倒地身体的上半和亮面染成魔焰蓝（焰滩 = 一滩蓝焰，而不是一滩金毛），并记下焰滩的左右和顶
  let puddleX0 = -10, puddleX1 = 10, puddleTop = -4;
  function burnTint() {
    const w = hero.w, h = hero.h, out = hero.out, HI = 14; let x0 = 99, x1 = -99, t0 = 99;
    for (let x = 0; x < w; x++) {
      let n = 0, d = 0; for (let y = 0; y < h; y++) if (out[y * w + x] !== 255) n++;
      for (let y = 0; y < h; y++) {                                                             // 融化时下面的像素会压在上面的像素上：按列的上 2/3 染色，塌成两三行后顶上一层才是蓝焰
        const i = y * w + x, c = out[i]; if (c === 255) continue;
        if (d < n * 0.4 || c === HI) out[i] = EL[2]; else if (d < n * 0.7) out[i] = EL[3];
        d++; const lx = x - hero.ox, ly = y - hero.oy; if (lx < x0) x0 = lx; if (lx > x1) x1 = lx; if (ly < t0) t0 = ly;
      }
    }
    puddleX0 = x0; puddleX1 = x1; puddleTop = t0;
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [T_LAND, T_MELT], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.35 }); return; }
    if (k !== 2) return;
    hitN++;
    burst(x, y, hitN === 1 ? 12 : 16, 60, 150, 0.15, 0.45, R_EL, 10); hitDummy(1, 1);             // 每弹一团爆（共 2 团）
    if (hitN === 1) { xT = 0; xX = DUMMY_X - 1; xY = xYc; }                                              // 两弹在假人处交叉成 X
    if (hitN === 2) { ring(DUMMY_X - 1, xYc, 1, R_EL); shake(0.14, 2); }
    sfx('impact', { pal: 'arcane', w: 0.4 });
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.3) {                                                        // 两颗焰球：粒子绕两个触须尖螺旋汇聚
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      const t = tipsW();
      while (chargeAcc >= 1) { chargeAcc -= 1; const s = Math.random() < 0.5 ? 0 : 2, a = Math.random() * 6.2832, r = 7 + Math.random() * 7;
        spawnX(K_SPIRAL_PT, t[s], t[s + 1], r / (0.3 + Math.random() * 0.25), 0, 9, R_EL, { a, r, w: 5 + Math.random() * 3, orbitR: 2 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                    // 落地无尘，只有轻轻一声
      if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.25 });
      lastGf = P.gf;
    }
    if ((state === IDLE || state === MOVE) && P.dq < 1 && Math.random() < dt * 6) { const t = tipsW(), s = Math.random() < 0.5 ? 0 : 2; spawn(K_EMBER, t[s], t[s + 1] - 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.35, R_EL); }
    if (state === DEATH && meltT < 2.2) {                                                       // 焰滩上蓝焰慢慢燃尽
      meltAcc += dt * (meltT < 1.2 ? 26 : 10);
      while (meltAcc >= 1) { meltAcc -= 1; const w = 24 * (1 - clamp01((meltT - 1.2) / 1.0) * 0.6); spawn(meltT < 1.4 ? K_EMBER : K_RISE, HX - 4 + (Math.random() - 0.5) * w, HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 12, 0.4 + Math.random() * 0.5, R_EL); }
    }
    if (xT < 0.3 && xT + dt >= 0.3) dummyFx({ dur: 1.4, tint: 'hexblue' });                 // X 爆开之后目标才被蓝焰点燃（X 先看得清）
    mzT += dt; whipT += dt; xT += dt; meltT += dt; boltT += dt;
  }
  function fxReset() { chargeAcc = 0; meltAcc = 0; lastGf = -9; mzT = 9; boltT = 9; BL = []; whipT = 9; xT = 9; meltT = 9; hitN = 0; }
  function fxBack(f12) { if (P.dq < 1 && P.rim >= 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (whipT < 2 / 12 && P.dq < 1) {                                                           // 鞭甩拖影：触须扫过的弧，第 1 帧亮
      const b = tentBase(rig, 0), cx = wx(b[0] + P.bx), cy = wy(b[1]), c = whipT < 1 / 12 ? EL[1] : EL[3];
      for (let k = 0; k <= 12; k++) { const a = -0.9 + k * 0.19, r = 8; if (whipT >= 1 / 12 && (k & 1)) continue; put(R(cx + Math.sin(a) * r), R(cy - Math.cos(a) * r), k > 9 ? EL[0] : c); }
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, 21); for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (boltT < 0.6) for (const b of BL) {                                                     // 两弹身后各拖一道 12 格焰痕：飞到一半两道焰痕交叉成 X
      const x = b[0] + b[2] * boltT; if (x >= DUMMY_X - 3) continue; const y = b[1] + b[3] * boltT, sl = b[3] / b[2];
      for (let k = 2; k <= 14; k++) { const px = x - k; if (px < b[0]) break; put(R(px), R(y - k * sl), k < 4 ? EL[1] : k < 9 ? EL[2] : EL[3]); }
    }
    if (xT < 0.5) {                                                                             // 两弹交叉成 X：两条白色对角线，第 1 帧 2 格粗
      const q = xT / 0.5, w2 = xT < 1 / 12, L = R(6 + q * 4), c1 = w2 ? 21 : q < 0.45 ? EL[1] : EL[2], c2 = q < 0.45 ? EL[2] : EL[3];
      if (!w2 && q <= 0.55) for (let k = -L; k <= L; k++) { put(xX + k, xY + k + 1, EL[3]); put(xX + k, xY - k + 1, EL[3]); }   // 靛色压边：浅色假人上也读得出 X
      for (let k = -L; k <= L; k++) {
        if (q > 0.55 && (k & 1)) continue; const c = Math.abs(k) < L - 2 ? c1 : c2;
        put(xX + k, xY + k, c); put(xX + k, xY - k, c);
        if (w2) { put(xX + k + 1, xY + k, EL[2]); put(xX + k + 1, xY - k, EL[2]); }
      }
    }
    if (meltT < 1.9) {                                                                          // 焰滩上几簇明灭的蓝焰舌，越往后越少、越矮，直到燃尽
      const q = ease.inOut(clamp01(meltT / 0.9)), top = R(puddleTop * (1 - q * 0.82)), live = 1 - clamp01((meltT - 0.9) / 1.0);
      for (let i = 0; i < 6; i++) {
        if (hash(i, 7) > live) continue;
        const dx = R((puddleX0 + (puddleX1 - puddleX0) * (0.1 + i * 0.16)) * (1 + q * 0.35)), fx0 = HX + dx, f = (f12 + i * 2) % 4, h = R((1 + (f < 2 ? 1 : 0) + (i & 1)) * (0.4 + 0.6 * live));
        put(fx0, HY + top, EL[2]);
        for (let k = 1; k <= h; k++) put(fx0 + (k === h && (f & 1) ? 1 : 0), HY + top - k, k === h ? EL[1] : EL[2]);
        if (live > 0.5 && f === 0) put(fx0, HY + top - h - 1, 21);
      }
    }
  }
  function drawShot(k, x, y, d, f12) {                                                          // 蓝焰魔弹：白芯 + 淡蓝壳 + 后拖焰舌；技能弹更大
    x = R(x); y = R(y);
    put(x, y, 21); put(x + d, y, EL[1]); put(x, y - 1, EL[1]); put(x, y + 1, EL[2]); put(x - d, y, EL[1]); put(x - 2 * d, y - (f12 & 1), EL[2]); put(x - 3 * d, y, EL[3]);
    if (k === 2) { put(x + d, y - 1, EL[2]); put(x + d, y + 1, EL[2]); put(x - d, y - 1, EL[2]); put(x - d, y + 1, EL[2]); put(x - 2 * d, y + 1 - (f12 & 1), EL[3]); put(x - 4 * d, y - (f12 & 1), EL[3]); put(x + 2 * d, y, EL[2]); }
    return true;
  }

  return {
    name: '魔豹', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_FLAME, m.eye, m.glow], HIT_POINT, EVENTS, deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'beast', how: 'dissolve', pal: 'arcane', style: 'fire', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
