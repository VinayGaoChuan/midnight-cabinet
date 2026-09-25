// 天使弓手（部队 · 僵尸 · 射手 · 稀有 · 升级线最终形态）：投石弓手「升华」后的同一个僵尸——不再佝偻、挺胸站直；乱羽披风长成一对残破天使翼（灰白羽毛有缺口、翼骨前缘露出白骨段），
// 同一顶鹰颅盔（羽冠变白、往后掠），头顶上方悬一圈燃烧的光环；白麻长袍腰以下破成布条，胸口那道缝合线里透出火光；后手斜举比身体还高的骨制长弓（焦布缠绕、两梢火羽），前手拉弦。
// 攻击 = 借翼跃起，由高处向前下方射出一支火羽箭，命中后折射弹向第二个目标；技能 = 特性「燃烧 + 水之弹射」：双翼张开升空、火羽汇成 5 格长的火羽箭，射中点燃假人，再弹到第二个目标燃起一根火柱。
// 升级线：鹰喙弓手（EagleBeakedArcher.js）→ 投石弓手（CatapultArcher.js）→ 本级。
PCD.define('AngelArcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_EMBER,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow, death, sfx } = E;
  const RD = Math.round, U = parts.beast.util;

  // ───── 元素：圣火（火焰），偏玫红：白 21 → 淡金 51 → 金橙 47 → 玫红 26 → 酒红 12（和火葬人的橙黄炉火、赤龙的熔岩拉开）─────
  const R_EL = fxRamp('holyfire', [21, 51, 47, 26, 12]), EL = FXR[R_EL];
  const R_FEA = fxRamp('angelfeather', [21, 17, 60, 59, 8]);            // 飘落的羽毛：白 → 灰

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: 'white', sleeve: 'white', belt: 'boot', skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],   // 尸绿灰（僵尸人形共用）
    bone: 'bone', teeth: [8, 18, 17, 21], feather: 'pale', wingfar: [0, 8, 8, 59], crest: 'white', wrap: 'boot', string: [8, 18, 18, 17],
    fire: { r: [12, 26, 47, 51], flat: 1 }, ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'slim', leg: 11, torso: 9, head: 6, sw: 3, stride: 3 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(92, 72, 44, 64);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['fire', 'ink', 'string', 'skin', 'teeth', 'wrap']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 拉弦手（hx hy，肘 ex ey），后手 = 握弓手（bhx bhy）；wp 翼姿、hl 光环档、burn 着火档 ─────
  const P = { hx: 0, hy: 0, ex: 0, ey: 0, bhx: 0, bhy: 0, pull: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, big: 0, nock: 0, wp: 0, hl: 1, flk: 0, burn: 0, cs: 0, haloF: 0, haloX: 0, haloY: 0,
    dq: 0, dq48: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, ex, ey, bhx, bhy, pull, lean, head, crouch) => ({ hx, hy, ex, ey, bhx, bhy, pull: pull || 0, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -11, 3, -15, 9, -14);                    // 长弓斜举在身前（上梢高过头），前手搭在弦上
  const K_NOCK = K(6, -18, -1, -15, 12, -15, 1);               // 搭箭
  const K_DRAW = K(4, -19, -4, -16, 12, -15, 2);               // 拉满（箭沿 2:1 朝前下方）
  const K_REL = K(1, -20, -5, -17, 13, -15, 0);                // 放箭
  const K_FOL = K(2, -19, -4, -16, 12, -15, 0);
  const K_CHG = K(3, -20, -5, -17, 12, -15, 3);
  const K_CAST = K(0, -21, -6, -17, 13, -14, 0);
  const K_HURT = K(3, -11, 2, -15, 7, -12, 0, -1, -1);
  const K_KNEEL = K(4, -8, 3, -11, 7, -9, 0, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'ex', 'ey', 'bhx', 'bhy', 'pull', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 20], ['hy', -40, 0], ['ex', -16, 15], ['ey', -40, 0], ['bhx', -16, 20], ['bhy', -40, 0], ['pull', 0, 3], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lift', 0, 6],
    ['big', 0, 1], ['nock', 0, 1], ['wp', 0, 6], ['hl', 0, 4], ['flk', 0, 1], ['burn', 0, 3], ['cs', -1, 1], ['haloF', 0, 1], ['haloX', -16, 24], ['haloY', -40, 0],
    ['dq48', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const FEATHER_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WING_IDLE = [6, 1, 1, 6, 6];                                  // 待机个性：双翼慢慢半张再收拢（1.6–2.0 s）
  const HOP_WP = [6, 2, 3, 1], HOP_LIFT = [0, 1, 3, 2];              // 跳翔：落地微张 → 上扬起跳 → 下扇到最高 → 半张滑翔落下
  const T_REL = 2 / 12, T_KNEE = INCOMING + 0.62, T_ASH = INCOMING + 1.3;
  const ATK = [[0, K_NOCK], [1 / 12, K_DRAW, 'snap'], [T_REL, K_REL, 'snap'], [0.45, K_FOL, 'out'], [0.75, K_IDLE, 'inOut']];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.big = 0; P.nock = 0; P.wp = 0; P.hl = 1; P.flk = (f12 >> 1) & 1; P.burn = 0; P.cs = 0; P.haloF = 0; P.haloX = 0; P.haloY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FEATHER_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.cs = P.beard > 0 ? 1 : 0;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.wp = WING_IDLE[f]; P.glint = f === 2 ? 1 : 0; P.hl = f >= 1 && f <= 2 ? 2 : 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 跳翔：每两步借翅膀一扇跃起 3 格，滑一段再轻轻落地
      setK(K_IDLE, K_IDLE, 0); const g = E.gait(tq); parts.gait(P, g); P.bob = 0; P.wp = HOP_WP[g]; P.lift = HOP_LIFT[g];
      P.bhx += P.step * 0.5; P.hx -= P.step * 0.5; P.beard = g === 1 ? -2 : g === 3 ? 1 : 0; P.cs = g === 1 ? -1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                       // 借翼跃起 → 由高处向前下方射出火羽箭 → 落回
      E.keys(tq, ATK, P, FIELDS); P.nock = tq < T_REL ? 1 : 0; const f = Math.floor(tq * 12 + 1e-6);
      P.wp = [2, 3, 1, 1, 1, 1, 4, 0, 0][f]; P.lift = [0, 2, 3, 3, 3, 2, 1, 0, 0][f];
      if (tq >= T_REL && tq < T_REL + 1 / 12) { P.beard = -2; P.sway = -1; P.glint = 1; P.gem = 2; }
      else if (tq < T_REL) { P.gem = 1; P.beard = 1; }
    } else if (st === CHARGE) {                                       // 双翼完全张开上扬，身体升到离地 4 格，光环火势变大
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q); P.nock = P.pull >= 0.5 ? 1 : 0;
      P.wp = tq < 0.1 ? 0 : tq < 0.25 ? 1 : 4; P.lift = RD(4 * q); P.hl = tq < 0.45 ? 1 : 2; P.flk = f12 & 1;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.cs = -1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.big = tq >= 0.7 ? 1 : 0; P.rim = 2;
    } else if (st === CAST) { setK(K_CHG, K_CAST, ease.out(clamp01(tq / 0.12))); P.wp = 3; P.lift = 3; P.hl = 3; P.flk = f12 & 1; P.beard = -2; P.sway = -1; P.cs = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) {                                        // 收招：翼收拢，光环回到 1 档，余烬羽毛飘落
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.wp = q < 0.3 ? 3 : q < 0.65 ? 1 : q < 0.9 ? 6 : 0; P.lift = RD(3 * (1 - q)); P.hl = q < 0.4 ? 2 : 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.cs = 1; P.wp = 6; P.flash = h < 1 / 12 ? 1 : 0; P.gem = 4; P.hl = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.wp = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 跪倒自焚：翼尖先着火 → 跪倒、光环掉落熄灭 → 火从翼蔓延全身 → 化灰（死亡套件 ash）
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        P.eyes = 1; P.gem = 4; P.burn = d < 0.08 ? 0 : d < 0.45 ? 1 : d < 0.9 ? 2 : 3; P.flk = f12 & 1;
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.sway = 1; P.wp = 6; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
        else { const q = ease.out(clamp01((d - 0.3) / 0.32)); setK(K_HURT, K_KNEEL, q); P.bx = -2; P.crouch = RD(1 + 3 * q); P.wp = 5; P.beard = 1; }
        if (d >= 0.3) { const hq = clamp01((d - 0.3) / 0.32); P.haloF = 1; P.haloX = RD(-1 + 11 * hq); P.haloY = RD(-34 + 32 * hq * hq); P.hl = hq < 1 ? ((f12 & 1) ? 1 : 0) : 4; }   // 光环掉到身前地上熄灭
        if (d >= T_ASH - INCOMING) P.dq = 1;                          // 之后由死亡套件（化灰）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ex = RD(P.ex); P.ey = RD(P.ey) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.pull = RD(P.pull); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48);
    const f = focus(); P.gx = f[0] + P.bx; P.gy = f[1] - P.lift;
    KEY(P);
  }
  // 发光体：搭着箭时 = 火羽箭头，放箭后 = 弓前，其余 = 光环（掉落后 = 地上的光环）
  function focus() {
    if (P.nock) return arrowTip();
    if (P.st === CAST || P.st === RECOVER) return [P.bhx + 3, P.bhy + 1];
    if (P.haloF) return [P.haloX, P.haloY];
    const R = parts.rig(P, BODY); return haloAt(R);
  }
  const haloAt = (R) => [R.hx - 1, R.htop - 10];

  // ───── 画 ─────
  const px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t);
  const fr = (R, r0, tx, ty) => ({ r0: r0 & 3, tx: R.tx + tx, ty: R.ty + ty, rot: R.rot, ox: R.ox, oy: R.oy });
  function sweep2(T, x0, y0, x1, y1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; parts.rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, t); } }
  const glowT = (lv, strong) => (lv === 4 ? 1 : lv >= 2 ? (strong || lv === 3 ? 4 : 3) : lv === 1 ? (strong ? 4 : 3) : (strong ? 3 : 2));

  // 候选部件：beakSkull（鹰头骨盔，同前两级；本级羽冠变白、往后掠——给头顶的光环让出位置）
  const SKULL = ['..BBB.....', '.BBBBB....', 'BBBBSSB...', 'BBBBSGBHH.', 'bB....KKKK', 'b.......KK', '.........k'];
  function beakSkull(T, o) {
    const m = o.bone;
    for (let r = 0; r < SKULL.length; r++) for (let c = 0; c < 10; c++) {
      const ch = SKULL[r][c], u = c - 3, v = r - 2; if (ch === '.') continue;
      if (ch === 'G') px(T, u, v, o.glow, glowT(o.lv, 1)); else px(T, u, v, m, ch === 'H' ? 4 : ch === 'S' ? 1 : ch === 'k' || ch === 'b' ? 2 : 0);
    }
    px(T, -1, -1, m, 4); px(T, -2, 0, m, 2); px(T, 5, 2, m, 2);
  }
  function crest(T, cs) {                                              // 白羽冠：3 根长羽贴着颅顶往后掠，羽尖随 cs 摆
    E.part();
    const F = [[[1, -3], [0, -3], [-1, -4], [-2, -4], [-3, -4]], [[-1, -3], [-2, -3], [-3, -3], [-4, -3], [-5, -3]], [[-2, -2], [-3, -2], [-4, -2], [-5, -2], [-6, -1]]];
    F.forEach((f, j) => f.forEach(([u, v], k) => px(T, u, v + (k >= f.length - 1 ? cs : 0), M.crest, k === f.length - 1 ? 4 : j === 0 ? 4 : 3)));
  }
  function drawHead(R) {
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const T = fr(R, 0, R.hx, R.htop);
    px(T, 2, 3, M.skin, 1); px(T, 1, 4, M.teeth, 4); px(T, 2, 4, M.teeth, 3); px(T, 0, 5, M.skin, 2); px(T, 1, 2, M.skin, 2);
    beakSkull(T, { bone: M.bone, glow: M.fire, lv: P.eyes || P.gem === 4 ? 4 : 1 });
    crest(T, P.cs);
  }
  // 燃烧的光环：侧看是一圈扁椭圆（前弧亮、后弧暗、两侧 2 格粗），上面窜着火苗；hl 0 暗 · 1 常亮 · 2 火势大 · 3 爆燃 · 4 熄灭
  function halo(cx, cy, hl, flk) {
    E.part(); const m = M.fire, dead = hl === 4, tb = dead ? 1 : hl >= 2 ? 3 : 2, tf = dead ? 2 : hl >= 1 ? 4 : 3;
    for (let x = -2; x <= 2; x++) E.sp(cx + x, cy - 1, m, tb);
    for (const x of [-4, -3, 3, 4]) E.sp(cx + x, cy, m, dead ? 1 : Math.abs(x) === 4 ? 3 : tf);
    for (let x = -3; x <= 3; x++) E.sp(cx + x, cy + 1, m, tf);
    if (hl >= 3) { E.sp(cx - 5, cy, m, 3); E.sp(cx + 5, cy, m, 3); }
    if (!dead) { const H = hl >= 2 ? 2 : 1; for (const x of [-2, 0, 2]) { const on = ((x >> 1) + flk) & 1; for (let k = 1; k <= H + (on ? 1 : 0) - (x === 0 ? 0 : 1); k++) E.sp(cx + x + (k > 1 && on ? 1 : 0), cy - 1 - k, m, k === 1 ? 3 : 4); } }
  }
  // 候选部件：angelWing（残破天使翼：翼骨前缘露出白骨段、初级飞羽带缺口、次级飞羽成片；翼姿表带「收拢下垂」——腕部高过头顶、飞羽沿背垂到小腿，
  //   B.wing 的翼姿表摆不出这种收法；其余翼姿照 B.wing 的上扬 / 下压 / 张开）。画笔用 parts.beast.util（poly / dot），精灵本地坐标
  // WP = [腕 dx, dy, 内侧飞羽角, 外侧飞羽角, 内长, 外长, 后缘 dx, dy]（角度按屏幕 atan2：0 朝右、π/2 朝下、π 朝后、3π/2 朝上）；远侧翼整扇再往上 / 往前转 FAR_DA
  const WP = [
    [-2, -15, 1.55, 2.25, 17, 22, -1, 8],     // 0 收拢下垂：腕高过头顶，飞羽沿背垂到小腿
    [-6, -13, 2.0, 3.0, 15, 19, -2, 7],       // 1 半张
    [-5, -13, 3.3, 4.5, 12, 15, -4, 4],       // 2 上扬
    [-8, -4, 1.7, 2.8, 11, 15, -3, 4],        // 3 下压
    [-8, -12, 3.0, 4.6, 15, 19, -4, 4],       // 4 完全张开上扬（技能）
    [-4, -8, 1.5, 2.2, 13, 16, -1, 6],        // 5 垂落（跪倒）
    [-3, -15, 1.7, 2.5, 17, 21, -1, 8],       // 6 微张
  ];
  const FAR_DA = [-0.12, 0.3, 0.25, 0.3, 0.35, -0.1, 0.1];
  function wingTips(x, y, pose, far) {
    const W = WP[pose], da = far ? FAR_DA[pose] : 0, wx = x + W[0], wy = y + W[1], out = [];
    for (let k = 0; k < 5; k++) { const q = k / 4, a = W[3] + (W[2] - W[3]) * q + da, l = W[5] + (W[4] - W[5]) * q; out.push([wx + Math.cos(a) * l, wy + Math.sin(a) * l]); }   // 外 → 内
    return { wx, wy, tips: out };
  }
  function angelWing(x, y, pose, far, burn) {
    const W = WP[pose], G = wingTips(x, y, pose, far), wx = G.wx, wy = G.wy, cov = far ? M.wingfar : M.featherD, fm = far ? M.featherD : M.feather, bm = far ? M.boneD : M.bone;
    E.part();
    const poly = [x, y, wx, wy]; for (const t of [G.tips[0], G.tips[2], G.tips[4]]) poly.push(wx + (t[0] - wx) * 0.5, wy + (t[1] - wy) * 0.5); poly.push(x + W[6], y + W[7]);
    U.poly(E, poly, cov, 0);                                            // 覆羽：只盖住飞羽根部那一半（暗一级）
    for (let k = 1; k <= 3; k++) {                                     // 次级飞羽：沿翼臂往后缘垂下的 3 根短羽，后缘一片一片的
      const q = k / 4, bx0 = x + (wx - x) * q, by0 = y + (wy - y) * q, t = G.tips[4], ex = bx0 + (t[0] - wx) * 0.55 + W[6] * 0.3, ey = by0 + (t[1] - wy) * 0.55 + W[7] * 0.3;
      U.seg(E, bx0, by0, ex, ey, 1, cov, k === 2 ? 3 : 2);
    }
    G.tips.forEach((t, k) => {                                          // 初级飞羽：5 根长羽从腕部扇开（2 格宽），1、3 号带缺口；着火时从羽尖往里烧
      const dx = t[0] - wx, dy = t[1] - wy, m = Math.ceil(Math.hypot(dx, dy) * 1.5), vert = Math.abs(dy) >= Math.abs(dx);
      for (let s = 0; s <= m; s++) {
        const q = s / m; if ((k === 1 || k === 3) && q > 0.66 && q < 0.8) continue;
        const X = wx + dx * q, Y = wy + dy * q, hot = burn && q > 1 - 0.34 * burn, mat = hot ? M.fire : fm, tone = hot ? (((s + k + P.flk) & 1) ? 4 : 3) : q > 0.9 ? 4 : 0;
        U.dot(E, X, Y, mat, tone); if (!far && q > 0.2 && q < 0.9) U.dot(E, vert ? X + 1 : X, vert ? Y : Y + 1, mat, hot ? 3 : 2);
      }
    });
    const m2 = Math.ceil(Math.hypot(wx - x, wy - y) * 1.5);            // 前缘翼骨：根 → 腕，中段露出白骨
    for (let s = 0; s <= m2; s++) { const q = s / m2, X = x + (wx - x) * q, Y = y + (wy - y) * q, b = q > 0.3 && q < 0.78; U.dot(E, X, Y, b ? bm : fm, b ? ((s & 2) ? 4 : 3) : 4); if (!far) U.dot(E, X - 1, Y, b ? bm : cov, 2); }
    U.dot(E, wx, wy - 1, bm, 4); U.dot(E, wx - 1, wy - 1, bm, 3);
    if (burn >= 2) for (let k = 0; k < 4; k++) U.dot(E, x + W[6] * (k / 4) - 1, y + W[7] * (k / 4), M.fire, ((k + P.flk) & 1) ? 3 : 2);   // 火烧到了翼根
  }
  // 候选部件：longbow（斜举的长弓：2 格粗骨弓臂、弓臂缠焦布条、两梢火羽饰，单弦；按吸附方向握持，弦拉到搭箭点）
  const LBD = [1, -2], LL = 13;
  function bowGeo(pull) {
    const dl = Math.hypot(LBD[0], LBD[1]), dx = LBD[0] / dl, dy = LBD[1] / dl; let bx = -dy, by = dx; if (bx > 0) { bx = -bx; by = -by; }
    const bend = 2 + (pull >= 2 ? 1 : 0), at = (s) => { const q = s / LL; return [s * dx + bx * bend * q * q, s * dy + by * bend * q * q]; };
    return { dx, dy, bx, by, at, rest: [bx * bend, by * bend] };
  }
  function longbow(T, pull, nk) {
    const G = bowGeo(pull), { dx, dy, bx, by } = G;
    E.part();
    for (let k = -2 * LL; k <= 2 * LL; k++) {
      const s = k / 2, p = G.at(s), a = Math.abs(s), wrap = a <= 1.2 || (a >= 4 && a <= 5) || (a >= 8.5 && a <= 9.5);
      px(T, p[0] - bx, p[1] - by, wrap ? M.wrap : M.bone, wrap ? (k & 1 ? 2 : 3) : 0); px(T, p[0], p[1], wrap && a > 1.2 ? M.wrap : M.bone, a >= LL - 0.5 ? 4 : 0);
    }
    const tu = G.at(LL), td = G.at(-LL);
    for (const [t, s] of [[tu, 1], [td, -1]]) {                         // 两梢火羽：沿弓身伸出 2 格 + 往外翻 1 格，火苗一跳一跳
      px(T, t[0] + dx * s, t[1] + dy * s, M.fire, 3); px(T, t[0] + dx * 2 * s - bx * (P.flk ? 1 : 0), t[1] + dy * 2 * s - by * (P.flk ? 1 : 0), M.fire, 4); px(T, t[0] + dx * s - bx, t[1] + dy * s - by, M.fire, 2);
    }
    const q = pull > 0 && nk ? nk : G.rest;
    parts.line(E, T, RD(tu[0]), RD(tu[1]), RD(q[0]), RD(q[1]), M.string, 3); parts.line(E, T, RD(td[0]), RD(td[1]), RD(q[0]), RD(q[1]), M.string, 3);
  }
  // 火羽箭：沿 2:1（朝前下方）从搭箭点画出；骨箭杆、火羽尾、火焰箭头；big = 蓄满后 5 格长的火羽
  const ADI = 5;
  function arrowLen() { return Math.max(4, P.bhx - P.hx) + (P.big ? 7 : 4); }
  function arrowTip() { const c = parts.cell(ADI, P.hx, P.hy, arrowLen()); return [c[0], c[1]]; }
  function arrow(R) {
    E.part(); const n = arrowLen(), lv = P.gem, big = P.big;
    parts.bar(ADI, P.hx, P.hy, 0, n, 1, (k, j, X, Y) => {
      const head = k >= n - (big ? 5 : 1), m = head || k <= 1 ? M.fire : M.bone, t = head ? (k === n ? glowT(lv, 1) : glowT(lv, 0)) : k <= 1 ? 3 : 3;
      px(R, X, Y, m, t); if (big && head && k < n) { px(R, X, Y - 1, M.fire, glowT(lv, 0)); if (k === n - 3) px(R, X, Y - 2, M.fire, 4); }
    });
    px(R, P.hx + 1, P.hy - 1, M.fire, 4); px(R, P.hx, P.hy + 1, M.fire, 2);   // 火羽尾
  }
  // 候选部件：drawArm（手肘显式的手臂，同前两级）：白麻袖上臂 → 裸露尸皮前臂（缝线）→ 手
  function drawArm(R, sx, sy, ex, ey, hx, hy, o) {
    E.part(); sweep2(R, sx, sy, ex, ey, o.sleeve, 0);
    E.part(); sweep2(R, ex, ey, hx, hy, o.skin, 0);
    for (const q of [0.3, 0.55]) px(R, RD(ex + (hx - ex) * q), RD(ey + (hy - ey) * q), o.ink, 1);
    E.part(); parts.rect(E, R, hx - 1, hy - 1, 2, 2, o.skin, 0); px(R, hx - 1, hy - 1, o.skin, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), wx = R.sBx - 1, wy = R.yS + 3;
    angelWing(wx + 3, wy - 2, P.wp, 1, P.burn);                                                  // 远侧翼（暗一级、错开）
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, at: [P.bhx, P.bhy], grip: 'none' });
    parts.legs(E, R, P, { style: 'bare', mat: M.skin, matD: M.skinD });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, belt: M.belt, buckle: M.bone, collar: M.robe });
    { const s = P.sway, hem = tor.hem;                                                            // 腰以下破成布条：隔 3 列剪开、布条长短参差、随 sway 飘；着火时布条尖先烧（同一部件）
      for (let y = R.yHip + 1; y <= hem; y++) { const t = y - R.yHip - 1, sh = RD(s * t / 5); for (let x = -10; x <= 10; x++) { const c = x - sh, j = Math.floor(c / 3), cut = ((c % 3) + 3) % 3 === 0 || y > hem - [0, 2, 1, 3][((j % 4) + 4) % 4]; if (cut && t > 0) px(R, x, y, 0, 0); else if (P.burn >= 3 && y >= hem - 3 - (j & 1)) { const e = parts.edges(R, Math.min(y, R.yHip)); if (x >= e[0] - 5 && x <= e[1] + 5) px(R, x, y, M.fire, ((x + y + P.flk) & 1) ? 4 : 3); } } } }
    for (let y = R.yS + 2; y < R.yWaist; y++) { const e = parts.edges(R, y); px(R, e[1] - 1, y, (y & 1) ? M.ink : M.fire, (y & 1) ? 1 : glowT(P.gem === 4 ? 4 : Math.max(1, P.gem), 1)); }   // 胸口缝合线里透出火光
    angelWing(wx, wy, P.wp, 0, P.burn);                                                         // 近侧翼（由乱羽肩披长成）
    drawHead(R);
    if (P.haloF) halo(P.haloX, P.haloY, P.hl, P.flk); else { const h = haloAt(R); halo(h[0], h[1], P.hl, P.flk); }
    longbow(fr(R, 0, P.bhx, P.bhy), P.pull, [P.hx - P.bhx, P.hy - P.bhy]);
    if (P.nock) arrow(R);
    parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.skin });
    drawArm(R, R.sFx, R.sFy, P.ex, P.ey, P.hx, P.hy, { sleeve: M.sleeve, skin: M.skin, ink: M.ink });
  }
  function bakeHero() {
    const R = parts.rig(P, BODY), h = haloAt(R), hr = P.st === CHARGE || P.st === CAST;     // 蓄力 / 施放时轮廓光从光环照下来
    RIM.rim = P.rim; RIM.rx = (hr ? h[0] + P.bx : P.gx) + hero.ox; RIM.ry = (hr ? h[1] - P.lift : P.gy) + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  // 折射：命中后弹向第二个目标的火羽箭（按抛物线飞，自己计时；0 = 攻击，1 = 技能）
  const HOP = [{ on: 0 }, { on: 0 }];
  function hop(k, x0, y0, x1, y1, h, dur) { const H = HOP[k]; H.on = 1; H.t = 0; H.x0 = x0; H.y0 = y0; H.x1 = x1; H.y1 = y1; H.h = h; H.dur = dur; H.n = 0; }
  const hopAt = (H, q) => [H.x0 + (H.x1 - H.x0) * q, H.y0 + (H.y1 - H.y0) * q - H.h * 4 * q * (1 - q)];
  function hopLand(k, x, y) {
    if (k === 0) { burst(x, y, 7, 20, 60, 0.2, 0.4, R_EL, 10); fx.cross(x, y, 3, R_EL, 0.18); sfx('hit', { mat: 'flesh', w: 0.2 }); }
    else { fx.pillar(x, HY - 24, HY - 1, 1, R_EL, 0.5, 2); burst(x, HY - 3, 14, 30, 80, 0.3, 0.6, R_EL, 18); ring(x, HY - 3, 0, R_EL); sfx('impact', { pal: 'fire', w: 0.35 }); }
  }
  let mzT = 9, mzX = 0, mzY = 0, burnT = 9, chargeAcc = 0, soulAcc = 0, fireAcc = 0, lastStep = 0, lastG = -1;
  const wingTipScreen = (pose, far) => { const R = parts.rig(P, BODY), G = wingTips(R.sBx - 1 + (far ? 3 : 0), R.yS + 3 - (far ? 2 : 0), pose, far), t = G.tips[0]; return [scrX(t[0] + P.bx), HY + t[1] - P.lift]; };
  function onEnter(s) {
    if (s !== CAST) return;
    poseAt(CHARGE, DUR[CHARGE] - 1 / 12, DUR[CHARGE] - 1 / 12); const ax = scrX(P.gx), ay = HY + P.gy; poseAt(CAST, 0, 0);
    releaseOrbit(40, 90, 0.3, 0.6); fx.cross(ax + 2, ay, 6, R_EL, 0.22); ring(ax, ay, 0, R_EL); burst(ax, ay, 10, 40, 100, 0.25, 0.5, R_EL, 8);
    for (const far of [0, 1]) { const t = wingTipScreen(4, far); burst(t[0], t[1], 10, 30, 80, 0.3, 0.7, R_EL, 6); }   // 翼一振：两侧火羽外爆
    const tx = DUMMY_X - 4, ty = HY - 12, vx = 150; shoot(2, ax + 2, ay, vx, tx, R_EL, (ty - ay) / Math.max(1, tx - ax - 2) * vx, { trail: { every: 1, life: [0.2, 0.4], back: [6, 18], off: 4 } });
    shake(0.28, 2); flash(0.05); mzT = 0; mzX = ax + 1; mzY = ay;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                    // 放箭：由高处向前下方射出火羽箭
      poseAt(ATTACK, T_REL - 1 / 12, T_REL - 1 / 12); const ax = scrX(P.gx), ay = HY + P.gy; poseAt(ATTACK, t, t);
      const tx = DUMMY_X - 3, ty = HY - 10, vx = 200; mzT = 0; mzX = ax; mzY = ay; shoot(1, ax + 1, ay, vx, tx, R_EL, (ty - ay) / Math.max(1, tx - ax - 1) * vx, { trail: { every: 2, life: [0.1, 0.25], back: [8, 20], off: 2 } });
      burst(ax, ay, 5, 20, 50, 0.12, 0.25, R_EL, 0); sfx('swing', { kind: 'bow', w: 0.35 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust); burst(HX + 9, HY - 2, 6, 20, 50, 0.2, 0.4, R_EL, 10); shake(0.1, 1); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {                     // 火从翼蔓延全身：跪姿化成火色余烬上飘
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_EL }); burst(HX - 2, HY - 14, 16, 20, 60, 0.4, 0.8, R_EL, 20);
    }
  }
  const EVENTS = [[], [], [T_REL], [], [], [], [], [T_KNEE, T_ASH], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 70, 0.15, 0.3, R_EL, 10); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.3 }); hop(0, x + 2, y, DUMMY_X + 14, HY - 9, 5, 0.28); }
    else if (k === 2) {                                                    // 点燃假人：染成圣火色、脚下窜起 3 簇火苗 + 十字星芒，箭折向后方第二目标，路径留一道断续火线
      dummyFx({ dur: 1.4, tint: R_EL }); hitDummy(1); burnT = 0; fx.cross(x + 2, y, 6, R_EL, 0.25); burst(x, y, 22, 50, 130, 0.25, 0.6, R_EL, 16); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.6 });
      const x1 = DUMMY_X + 14, y1 = HY - 3; hop(1, x + 3, y, x1, y1, 3, 0.26); fx.link(x + 3, y, x1, y1 - 2, R_EL, 0.7, 2);
    }
  }
  function hurtFx(s) {                                                     // 僵尸：骨灰 + 几点火星 + 被打落的羽毛
    const hx = HX + 1, hy = HY - 15; burst(hx, hy, s === DEATH ? 20 : 12, 40, 110, 0.25, 0.55, FXI.dust, 18); burst(hx, hy, 5, 20, 60, 0.3, 0.6, R_EL, 10);
    for (let i = 0; i < 2; i++) spawn(K_EMBER, hx - 6 - i * 3, hy - 4, -12 - i * 8, 8, 1.0, R_FEA);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > 0.25) {                                   // 火羽从两侧翼尖一根根飞出，螺旋汇聚到箭头
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const t = wingTipScreen(4, Math.random() < 0.4 ? 1 : 0), dx = t[0] - gx + (Math.random() - 0.5) * 6, dy = (t[1] - gy + (Math.random() - 0.5) * 6) / 0.75, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx); spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.4 + Math.random() * 0.35), 0, 9, R_EL, a, r, 3 + Math.random() * 2); }
    }
    if (state === MOVE) {                                                  // 跳翔：落地无尘，只有很轻的一声；起跳时身后飘下 1 片羽毛
      const g = E.gait(q12(stT));
      if (g !== lastG) { if (g === 0) sfx('step', { w: 0.2 }); if (g === 1) spawn(K_EMBER, scrX(-6), HY - 14, P.flip ? 6 : -6, 7, 1.1, R_FEA); lastG = g; }
    }
    if (state === RECOVER && stT < 0.5) { fireAcc += dt * 8; while (fireAcc >= 1) { fireAcc -= 1; spawn(K_EMBER, scrX(-8 - Math.random() * 12), HY - 18 - Math.random() * 14, (Math.random() - 0.5) * 8, 6 + Math.random() * 6, 0.9 + Math.random() * 0.5, Math.random() < 0.5 ? R_EL : R_FEA); } }
    if (state === DEATH && stT > INCOMING + 0.08 && stT < T_ASH) {           // 身上的火：从翼尖烧到全身
      fireAcc += dt * (8 + 20 * clamp01((stT - INCOMING) / 1.0));
      while (fireAcc >= 1) { fireAcc -= 1; const x = HX + P.bx - 16 + Math.random() * 20, y = HY - 4 - Math.random() * 22; spawn(K_EMBER, x, y, (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.5 + Math.random() * 0.4, R_EL); }
    }
    for (let k = 0; k < 2; k++) {
      const H = HOP[k]; if (!H.on) continue; H.t += dt; const q = H.t / H.dur;
      if (q >= 1) { H.on = 0; hopLand(k, H.x1, H.y1); continue; }
      if ((H.n++ & 1) === 0) { const p = hopAt(H, q); spawn(K_EMBER, p[0] - 1, p[1], -6, -4, k ? 0.35 : 0.2, R_EL); }
    }
    mzT += dt; burnT += dt;
  }
  function fxReset() { mzT = 9; burnT = 9; chargeAcc = 0; soulAcc = 0; fireAcc = 0; lastStep = 0; lastG = -1; HOP[0].on = 0; HOP[1].on = 0; }
  function fxBack(f12) {
    if (P.lift > 0 && P.dq < 1) groundShadow(scrX(0), 5, P.lift * 3);
    if (P.dq < 1 && P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 3; r++) { put(mzX + r, mzY + (r > 2 ? 1 : 0), r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (P.big && P.gem >= 2 && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy, L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (burnT < 1.3) for (let k = 0; k < 3; k++) {                          // 假人脚下 3 簇小火苗
      const x = DUMMY_X - 5 + k * 5, h = 3 + ((f12 + k * 2) % 3) - (burnT > 1 ? 2 : 0), fl = ((f12 >> 1) + k) & 1;
      for (let j = 0; j < h; j++) { put(x + (j === h - 1 ? fl : 0), HY - 1 - j, j === 0 ? EL[3] : j === h - 1 ? EL[1] : EL[2]); if (j < h - 2) put(x + 1, HY - 1 - j, EL[3]); }
    }
    for (let k = 0; k < 2; k++) {                                            // 折射中的火羽箭
      const H = HOP[k]; if (!H.on) continue; const q = H.t / H.dur, p = hopAt(H, q), x = RD(p[0]), y = RD(p[1]);
      const vx = H.x1 - H.x0, vy = (H.y1 - H.y0) - H.h * 4 * (1 - 2 * q), l = Math.hypot(vx, vy), ux = vx / l, uy = vy / l;
      put(x, y, EL[0]); for (let s = 1; s <= (k ? 4 : 2); s++) put(RD(x - ux * s), RD(y - uy * s), s < 2 ? EL[1] : EL[2]); if (k) { put(RD(x - ux * 2 - uy), RD(y - uy * 2 + ux), EL[1]); put(RD(x - ux * 2 + uy), RD(y - uy * 2 - ux), EL[1]); }
    }
  }
  function drawShot(k, x, y, d, f12, R) {
    if (k === 1) { put(x, y, R[0]); put(x - d, y, R[1]); put(x - 2 * d, y - 1, 6); put(x - 3 * d, y - 1, 6); put(x - 4 * d, y - 1, R[2]); put(x - 4 * d, y - 2, R[1]); return true; }
    if (k === 2) {                                                          // 5 格长的火羽箭：白芯箭头 + 两层火羽 + 余焰
      put(x + d, y, R[0]); put(x, y, R[0]); put(x, y - 1, R[1]); put(x, y + 1, R[1]);
      for (let s = 1; s <= 5; s++) { put(x - s * d, y - (s > 2 ? 1 : 0), s < 3 ? R[1] : R[2]); if (s >= 2 && s <= 4) put(x - s * d, y - (s > 2 ? 2 : 1), (f12 + s) & 1 ? R[1] : R[3]); }
      if (f12 & 1) put(x - 6 * d, y - 2, R[3]); return true;
    }
    return false;
  }

  return {
    name: '天使弓手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.fire], HIT_POINT: [1, -15], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH }, REVIVE: { ramp: R_EL },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'fire', style: 'fire', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot, hurtFx,
  };
});
