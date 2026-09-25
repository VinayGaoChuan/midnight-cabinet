// 投石弓手（部队 · 僵尸 · 射手 · 稀有）：鹰喙弓手练壮了的同一个僵尸——同一顶鹰颅盔（头顶新长出 3 根竖立羽冠，眼窝光变紫）、同一道缝合前臂（压上皮护腕）、
// 乱羽肩披长成拖到后腰的破羽披风；暗酒红猎衣、胸前斜挎弹带挂 5 颗紫色幻觉石、腰侧鼓鼓的石袋；后手斜握投石弓（骨面硬木弓身、双弦、弦中间一只皮弹兜），前手捏兜后拉。
// 攻击 = 拉兜打出一颗先上扬再落下的抛物线石弹，命中后在地上弹跳到第 2 个目标；技能 = 特性「幻觉 + 水之弹射」：大石弹高抛砸中假人炸开幻觉紫雾（破防），再弹跳到后方第二个目标。
// 升级线：鹰喙弓手（EagleBeakedArcher.js）→ 本级 → 天使弓手（AngelArcher.js）。
PCD.define('CatapultArcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_TRAIL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：幻觉（诅咒）。FXI.curse = 淡紫 43 → 紫 24 → 深紫 42 → 墨紫 25 → 52；第一跳溅一点 water 呼应上一级 ─────
  const R_EL = FXI.curse, EL = FXR[R_EL], WA = FXR[FXI.water];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: 'crimson', sleeve: 'crimson', pants: 'stone', boot: 'boot', belt: 'leather', pouch: 'leather', bracer: 'leather',
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],                  // 尸绿灰（僵尸人形共用）
    bone: 'bone', teeth: [8, 18, 17, 21], mantle: 'wood', cape: { r: 'wood', band: 2 }, bowwood: 'wood', string: [8, 18, 18, 17],
    glow: { r: [25, 42, 24, 43], flat: 1 }, ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'slim', sw: 4, limb: 1.1, hunch: 1, headX: -1, leg: 10, torso: 9, head: 6, lift: 1, stride: 2, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 52, 32, 44);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 14, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'ink', 'string', 'skin', 'teeth', 'bowwood']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 捏兜手（hx hy，肘 ex ey），后手 = 握弓手（bhx bhy），bd 弓的斜向（0「/」待机 · 1「\」拉兜，石弹向前上方打出）─────
  const P = { hx: 0, hy: 0, ex: 0, ey: 0, bhx: 0, bhy: 0, bd: 0, pull: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, big: 0, load: 0, toss: 0, held: 0, cs: 0, bowF: 0, bowX: 0, bowY: 0, bowR: 0,
    fog: 0, fog48: 0, dq: 0, dq48: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, ex, ey, bhx, bhy, pull, lean, head, crouch) => ({ hx, hy, ex, ey, bhx, bhy, pull: pull || 0, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -8, 4, -13, 11, -14);                  // 投石弓斜握在身前（上梢高过头顶），前手捏着一颗幻觉石
  const K_LOAD = K(9, -14, 3, -11, 14, -15, 1, -1);            // 弓转成「\」、石子放进弹兜
  const K_PULL = K(6, -11, -1, -11, 14, -15, 2, -1);           // 拉兜
  const K_REL = K(3, -13, -3, -12, 15, -15, 0);                // 放兜：前手往后弹开
  const K_FOL = K(4, -12, -2, -11, 14, -15, 0);
  const K_CHG = K(5, -10, -2, -10, 14, -16, 3, -1, 0, 1);       // 拉满，下蹲 1 格
  const K_CAST = K(2, -13, -4, -12, 15, -16, 0, 0);
  const K_HURT = K(4, -10, 3, -13, 9, -12, 0, -1, -1);
  const K_STUM = K(8, -9, 5, -12, 10, -10, 0, 2, 1, 2);        // 往前踉跄
  const K_LIE = K(5, -9, 4, -13, 1, -11, 0);                   // 前扑在地：两手贴着身体（身体本地坐标，随 rig 转成趴姿）
  const FIELDS = ['hx', 'hy', 'ex', 'ey', 'bhx', 'bhy', 'pull', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 20], ['hy', -32, 0], ['ex', -16, 15], ['ey', -32, 0], ['bhx', -16, 20], ['bhy', -32, 0], ['bd', 0, 2], ['pull', 0, 3], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3],
    ['big', 0, 1], ['load', 0, 1], ['toss', 0, 4], ['held', 0, 1], ['cs', -1, 1], ['bowF', 0, 1], ['bowX', -16, 28], ['bowY', -32, 2], ['bowR', 0, 3],
    ['fog48', 0, 48], ['dq48', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const FEATHER_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_REL = 2 / 12, T_LAND = INCOMING + 0.58;
  const ATK = [[0, K_LOAD], [1 / 12, K_PULL, 'snap'], [T_REL, K_REL, 'snap'], [0.45, K_FOL, 'out'], [0.75, K_IDLE, 'inOut']];
  const TOSS = [[1, 0, 1], [-1, 1, 1], [0, 3, 0], [0, 2, -1], [1, 0, 0]];      // 待机个性：抛接幻觉石（手 dy、石子离手格数、羽冠摆）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.big = 0; P.load = 0; P.toss = 0; P.held = 1; P.cs = 0; P.bd = 0; P.bowF = 0; P.bowX = 0; P.bowY = 0; P.bowR = 0; P.fog = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FEATHER_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), k = TOSS[f]; P.hy += k[0]; P.toss = k[1]; P.cs = k[2]; P.head = f >= 1 && f <= 3 ? -1 : 0; P.glint = f === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 潜行碎步：屈膝压低、步幅小，腰侧石袋随步子晃
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.crouch = 1;
      P.bhx += P.step * 0.5; P.hx -= P.step * 0.5; P.cs = P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      E.keys(tq, ATK, P, FIELDS); P.bd = tq < 0.6 ? 1 : 0; P.load = tq < T_REL ? 1 : 0; P.held = 0;
      if (tq >= T_REL && tq < T_REL + 1 / 12) { P.beard = -2; P.sway = -1; P.cs = -1; P.glint = 1; }
      else if (tq < T_REL) { P.gem = 1; P.beard = 1; }
      if (tq >= 0.6) P.held = 1;
    } else if (st === CHARGE) {                                       // 拉满弹兜：兜里的石丸紫光逐档变亮
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q); P.bd = q > 0.3 ? 1 : 0; P.load = q > 0.3 ? 1 : 0; P.held = P.load ? 0 : 1;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.cs = q > 0.9 && (f12 & 1) ? -1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.big = tq >= 0.7 ? 1 : 0; P.rim = 2;
    } else if (st === CAST) { setK(K_CHG, K_CAST, ease.out(clamp01(tq / 0.12))); P.bd = 1; P.held = 0; P.beard = -2; P.sway = -1; P.cs = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) {                                        // 收招：空弹兜晃两下，羽冠抖
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.bd = q < 0.55 ? 1 : 0; P.held = q < 0.55 ? 0 : 1; P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.cs = tq < 0.4 ? ((f12 & 1) ? 1 : -1) : 0;
      if (tq < 0.35) P.pull = (f12 % 3) === 0 ? 1 : 0;                  // 空兜晃
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.cs = 1; P.flash = h < 1 / 12 ? 1 : 0; P.gem = 4; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 前扑：扑倒 → 石袋摔破、紫石滚出 → 幻觉紫雾从脚往头把身体一层层吞掉
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        P.held = 0; P.eyes = 1; P.gem = 4;
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
        else if (d < 0.42) { setK(K_STUM, K_STUM, 0); P.bx = 0; P.beard = -1; }
        else { setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = 2; P.lift = d < 0.5 ? 3 : d < 0.58 ? 1 : 0; P.beard = 0; P.cs = d < 0.66 ? -1 : 0; }
        const bq = clamp01((d - 0.1) / 0.3);                            // 投石弓脱手，翻倒在身前
        if (d >= 0.1) { P.bowF = 1; P.bowX = RD(11 + 13 * bq); P.bowY = bq < 0.5 ? RD(-11 + 2 * bq) : -2; P.bowR = bq < 0.5 ? 0 : 1; }
        if (d >= 0.95) P.fog = clamp01((d - 0.95) / 1.3);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ex = RD(P.ex); P.ey = RD(P.ey) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.pull = RD(P.pull); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48); P.fog48 = RD(P.fog * 48);
    const f = focus(); P.gx = f[0] + P.bx; P.gy = f[1] - P.lift;
    KEY(P);
  }
  // 发光体：弹兜里的幻觉石（装弹时）/ 弓前（放兜后）/ 手里捏的石子 / 头骨眼窝
  function focus() {
    if (!P.bowF && P.load) { const s = stoneAt(); return [P.bhx + s[0], P.bhy + s[1]]; }
    if (!P.bowF && (P.st === CAST || P.st === RECOVER)) return [P.bhx + 3, P.bhy - 1];
    if (P.held && !P.lying) return [P.hx + 1, P.hy - 1 - P.toss];
    const R = parts.rig(P, BODY); return P.lying ? [R.hx + 6, -3] : [R.hx + 1, R.ey];
  }

  // ───── 画 ─────
  const px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t);
  const fr = (R, r0, tx, ty) => ({ r0: r0 & 3, tx: R.tx + tx, ty: R.ty + ty, rot: R.rot, ox: R.ox, oy: R.oy });
  const free = (r0, x, y) => ({ r0: r0 & 3, tx: x, ty: y, rot: 0, ox: 0, oy: 0 });
  function sweep2(T, x0, y0, x1, y1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; parts.rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, t); } }
  const glowT = (lv, strong) => (lv === 4 ? 1 : lv >= 2 ? (strong || lv === 3 ? 4 : 3) : lv === 1 ? (strong ? 4 : 3) : (strong ? 3 : 2));

  // 候选部件：beakSkull（鹰头骨盔，同鹰喙弓手；本级加 crest 3 根竖立羽冠）
  const SKULL = ['..BBB.....', '.BBBBB....', 'BBBBSSB...', 'BBBBSGBHH.', 'bB....KKKK', 'b.......KK', '.........k'];
  function beakSkull(T, o) {
    const m = o.bone;
    for (let r = 0; r < SKULL.length; r++) for (let c = 0; c < 10; c++) {
      const ch = SKULL[r][c], u = c - 3, v = r - 2; if (ch === '.') continue;
      if (ch === 'G') px(T, u, v, o.glow, glowT(o.lv, 1)); else px(T, u, v, m, ch === 'H' ? 4 : ch === 'S' ? 1 : ch === 'k' || ch === 'b' ? 2 : 0);
    }
    px(T, -1, -1, m, 4); px(T, -2, 0, m, 2); px(T, 5, 2, m, 2);
  }
  // 羽冠：头骨顶上 3 根竖立的长羽（中间最高），羽尖随 cs 摆；单独一个部件，压在头骨上出一条分界线
  function crest(T, cs) {
    E.part();
    const F = [[[-2, -3], [-3, -4], [-3, -5], [-4, -6]], [[0, -3], [0, -4], [0, -5], [0, -6], [0, -7]], [[2, -3], [2, -4], [3, -5], [3, -6]]];   // 左羽后仰、中羽直立最高、右羽前倾：越往上分得越开
    F.forEach((f, j) => f.forEach(([u, v], k) => px(T, u + (k >= f.length - 2 ? cs : 0), v, M.mantle, k === f.length - 1 ? 4 : j === 1 ? 3 : 2)));
    px(T, 0, -3, M.bone, 3);
  }
  function drawHead(R) {
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const T = fr(R, 0, R.hx, R.htop);
    px(T, 2, 3, M.skin, 1); px(T, 1, 4, M.teeth, 4); px(T, 2, 4, M.teeth, 3); px(T, 0, 5, M.skin, 2); px(T, 1, 2, M.skin, 2);
    beakSkull(T, { bone: M.bone, glow: M.glow, lv: P.eyes || P.gem === 4 ? 4 : 0 });
    crest(T, P.cs);
  }
  // 候选部件：stonebow（弹弓式双弦弓：粗弓身 = 外侧硬木芯 + 弦侧骨面，两根弦中间兜一只皮弹兜；按吸附方向斜握，弦拉到弹兜点）
  // T = 以握点为原点的落笔变换；o = { bd 方向档, L 半弓长, pull 0–3, nk 弹兜点（弓本地坐标）, load 兜里有石子, big 大石弹, lv 石子亮档 }
  const BD = [[1, -2], [-1, -2], [0, -1]], SL = 10;
  function bowGeo(bd, pull) {
    const d = BD[bd], dl = Math.hypot(d[0], d[1]), dx = d[0] / dl, dy = d[1] / dl; let bx = -dy, by = dx; if (bx > 0 || (bx === 0 && by < 0)) { bx = -bx; by = -by; }
    const bend = 2 + (pull >= 2 ? 1 : 0), at = (s) => { const q = s / SL; return [s * dx + bx * bend * q * q, s * dy + by * bend * q * q]; };
    return { dx, dy, bx, by, bend, at, rest: [bx * bend, by * bend] };
  }
  function stoneAt() { const G = bowGeo(P.bd, P.pull), nk = P.pull > 0 ? [P.hx - P.bhx, P.hy - P.bhy] : G.rest; return [RD(nk[0] - G.bx * 2), RD(nk[1] - G.by * 2)]; }
  function stonebow(T, o) {
    const G = bowGeo(o.bd, o.pull), { dx, dy, bx, by } = G;
    E.part();
    for (let k = -2 * SL; k <= 2 * SL; k++) { const s = k / 2, p = G.at(s), a = Math.abs(s); px(T, p[0] - bx, p[1] - by, a <= 1.5 ? M.pouch : M.bowwood, a <= 1.5 ? 4 : 0); px(T, p[0], p[1], M.bone, a >= SL - 0.5 ? 4 : 0); }
    const tu = G.at(SL), td = G.at(-SL); px(T, tu[0] + dx, tu[1] + dy, M.bone, 4); px(T, td[0] - dx, td[1] - dy, M.bone, 3);   // 梢头骨钮
    const nk = o.pull > 0 && o.nk ? o.nk : G.rest, n2 = [nk[0] + RD(dx), nk[1] + RD(dy)];
    for (const q of [nk, n2]) { parts.line(E, T, RD(tu[0]), RD(tu[1]), q[0], q[1], M.string, 3); parts.line(E, T, RD(td[0]), RD(td[1]), q[0], q[1], M.string, 3); }   // 双弦
    px(T, nk[0], nk[1], M.pouch, 3); px(T, n2[0], n2[1], M.pouch, 2); px(T, RD(nk[0] + bx), RD(nk[1] + by), M.pouch, 2);          // 皮弹兜
    if (o.load) {                                                       // 兜里的幻觉石（发光体，和弓同一部件）
      const s = [RD(nk[0] - bx * 2), RD(nk[1] - by * 2)], g = M.glow;
      if (o.big) { px(T, s[0], s[1], g, glowT(o.lv, 1)); px(T, s[0] + 1, s[1], g, glowT(o.lv, 0)); px(T, s[0], s[1] + 1, g, glowT(o.lv, 0)); px(T, s[0] + 1, s[1] + 1, g, 1); px(T, s[0], s[1] - 1, g, glowT(o.lv, 0)); px(T, s[0] - 1, s[1], g, glowT(o.lv, 0)); }
      else { px(T, s[0], s[1], g, glowT(o.lv, 1)); px(T, s[0] + 1, s[1], g, glowT(o.lv, 0)); px(T, s[0], s[1] + 1, g, 1); }
    }
  }
  // 候选部件：drawArm（手肘显式的手臂，同鹰喙弓手）：皮袖上臂 → 裸露尸皮前臂（缝线 + 皮护腕）→ 手
  function drawArm(R, sx, sy, ex, ey, hx, hy, o) {
    E.part(); sweep2(R, sx, sy, ex, ey, o.sleeve, 0);
    E.part(); sweep2(R, ex, ey, hx, hy, o.skin, 0);
    for (const q of [0.3, 0.5]) px(R, RD(ex + (hx - ex) * q), RD(ey + (hy - ey) * q), o.ink, 1);
    if (o.cuff) { E.part(); sweep2(R, ex + (hx - ex) * 0.62, ey + (hy - ey) * 0.62, ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8, o.cuff, 0); }   // 皮护腕压在缝合线上
    E.part(); parts.rect(E, R, hx - 1, hy - 1, 2, 2, o.skin, 0); px(R, hx - 1, hy - 1, o.skin, 4);
  }
  // 腰侧石袋：鼓鼓的皮袋（系绳 + 袋口露出一颗紫石），随 sway 左右晃；破了（死亡）只剩瘪下去的袋皮
  function stonePouch(R, broken) {
    const e = parts.edges(R, R.yWaist), x = e[0] + 1 + RD(P.sway * 0.5), y = R.yWaist + 1;
    E.part();
    px(R, x + 1, y, M.belt, 3);
    if (broken) { parts.run(E, R, y + 2, x - 1, x + 2, M.pouch, 0); parts.run(E, R, y + 3, x, x + 2, M.pouch, 2); return; }
    parts.run(E, R, y + 1, x, x + 2, M.pouch, 0); for (let k = 2; k <= 3; k++) parts.run(E, R, y + k, x - 1, x + 2, M.pouch, 0); parts.run(E, R, y + 4, x, x + 1, M.pouch, 2);
    px(R, x, y + 2, M.pouch, 4); px(R, x + 2, y + 3, M.pouch, 2); px(R, x + 1, y + 1, M.glow, 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), kneel = R.kneel, dead = P.st === DEATH && P.lying;
    if (P.bowF) stonebow(free(P.bowR, P.bowX, P.bowY), { bd: 2, pull: 0 });                  // 脱手的投石弓（先画：扑倒的身体压在弓上）
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: R.yWaist + 3, flare: 3.5 });
    if (!R.lie) { const bot = R.yWaist + 3, e = parts.edges(R, R.yWaist), L = e[0] - 3, s = P.beard > 0 ? 1 : P.beard < 0 ? -1 : 0;   // 披风下摆 4 根长羽参差（和披风同一个部件）
      parts.line(E, R, L, bot, L - 2 + s, bot + 4, M.cape, 0); parts.line(E, R, L + 2, bot, L + 1 + s, bot + 5, M.cape, 2); parts.line(E, R, L + 4, bot, L + 4, bot + 3, M.cape, 0); parts.line(E, R, L + 6, bot - 1, L + 7, bot + 2, M.cape, 2); px(R, L - 2 + s, bot + 4, M.cape, 4); }
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.sleeveD, at: [P.bhx, P.bhy], cuff: M.bracerD, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 2 });
    if (!kneel && !R.lie) px(R, R.footFx + 2, -R.footFup, M.skin, 3);
    const tor = parts.torso(E, R, P, { style: 'leather', mat: M.coat, belt: M.belt, buckle: M.bone, strap: M.belt });
    { const a = parts.edges(R, R.yS + 1), b = parts.edges(R, R.yWaist - 1), x0 = a[0] + 1, y0 = R.yS + 1, x1 = b[1] - 1, y1 = R.yWaist - 1;   // 弹带上的 5 颗幻觉石（和躯干同一部件）
      for (let k = 0; k < 5; k++) { const q = 0.1 + k * 0.2; px(R, RD(x0 + (x1 - x0) * q), RD(y0 + (y1 - y0) * q) + 1, M.glow, P.gem >= 2 ? 4 : k & 1 ? 2 : 3); } }
    stonePouch(R, dead);
    parts.mantle(E, R, P, { style: 'plain', mat: M.mantle, len: 3 });
    drawHead(R);
    if (!P.bowF) {
      const T = fr(R, 0, P.bhx, P.bhy);
      stonebow(T, { bd: P.bd, pull: P.pull, nk: [P.hx - P.bhx, P.hy - P.bhy], load: P.load, big: P.big, lv: P.gem });
      parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.skin });
    }
    drawArm(R, R.sFx, R.sFy, P.ex, P.ey, P.hx, P.hy, { sleeve: M.sleeve, skin: M.skin, ink: M.ink, cuff: M.bracer });
    if (P.held && !R.lie) { if (P.toss) { E.part(); px(R, P.hx, P.hy - 1 - P.toss, M.glow, P.glint ? 4 : 3); px(R, P.hx + 1, P.hy - 1 - P.toss, M.glow, 2); } else { px(R, P.hx + 1, P.hy - 1, M.glow, 3); } }   // 手里的幻觉石 / 抛起的石子
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.fog > 0) {                                                    // 幻觉紫雾从脚（左）往头（右）一层层吞掉身体：前沿一圈紫，后面的像素删掉
      const o = hero.out, w = hero.w, h = hero.h; let x0 = w, x1 = -1;
      for (let i = 0; i < o.length; i++) if (o[i] !== 255) { const x = i % w; if (x < x0) x0 = x; if (x > x1) x1 = x; }
      const span = Math.max(1, x1 - x0), lim = P.fog * 1.12;
      for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) { const i = y * w + x; if (o[i] === 255) continue; const v = (x - x0) / span * 0.72 + B8[(y & 7) * 8 + (x & 7)] * 0.28; if (v < lim) o[i] = 255; else if (v < lim + 0.07) o[i] = v < lim + 0.035 ? EL[1] : EL[2]; }
    }
  }

  // ───── 特效 ─────
  // 石弹（抛物线，自己计时）：0 攻击石弹 → 1 落地弹一下 → 2 跳到第二个目标；3 技能大石弹 → 4 落地弹起（溅水花）→ 5 落到后方 14 格开一小团紫雾
  const HOP = []; for (let i = 0; i < 6; i++) HOP.push({ on: 0 });
  function hop(k, x0, y0, x1, y1, h, dur) { const H = HOP[k]; H.on = 1; H.t = 0; H.x0 = x0; H.y0 = y0; H.x1 = x1; H.y1 = y1; H.h = h; H.dur = dur; H.n = 0; }
  const hopAt = (H, q) => [H.x0 + (H.x1 - H.x0) * q, H.y0 + (H.y1 - H.y0) * q - H.h * 4 * q * (1 - q)];
  function hopLand(k, x, y) {
    if (k === 0) { burst(x, y, 8, 30, 70, 0.15, 0.35, R_EL, 8); burst(x, y, 5, 30, 70, 0.12, 0.25, FXI.impact, 8); hitDummy(0); sfx('hit', { mat: 'stone', w: 0.35 }); hop(1, x + 3, y, DUMMY_X + 8, HY - 1, 4, 0.18); }
    else if (k === 1) { for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 5, 0.3, FXI.dust); sfx('hit', { mat: 'stone', w: 0.15 }); hop(2, x, y, DUMMY_X + 17, HY - 7, 6, 0.22); }
    else if (k === 2) { burst(x, y, 7, 20, 50, 0.2, 0.4, R_EL, 6); fx.cross(x, y, 3, R_EL, 0.16); sfx('hit', { mat: 'stone', w: 0.15 }); }
    else if (k === 3) {                                                  // 大石弹砸中：幻觉紫雾罩住假人 + 染紫 + 紫边（防御被削），头顶 3 只小眼睛绕圈
      fx.cloud(DUMMY_X, HY - 16, 10, R_EL, 0.9, 2); fx.cloud(DUMMY_X - 2, HY - 8, 7, R_EL, 0.7, 1); burst(x, y, 24, 40, 110, 0.3, 0.7, R_EL, 14); fx.cross(x, y, 5, R_EL, 0.22);
      dummyFx({ dur: 1.6, tint: 'curse', outline: 'curse' }); hitDummy(1); shake(0.12, 1); eyeT = 0; sfx('impact', { pal: 'curse', w: 0.6 });
      hop(4, x + 2, y, DUMMY_X + 6, HY - 1, 5, 0.16);
    } else if (k === 4) { burst(x, y - 1, 7, 30, 60, 0.15, 0.35, FXI.water, 12); for (let i = 0; i < 3; i++) spawn(K_DUST, x, HY, (Math.random() - 0.5) * 24, -6, 0.3, FXI.dust); sfx('hit', { mat: 'stone', w: 0.2 }); hop(5, x, y, DUMMY_X + 14, HY - 3, 7, 0.26); }
    else if (k === 5) { fx.cloud(x, y - 3, 6, R_EL, 0.7, 2); ring(x, y - 3, 0, R_EL); burst(x, y - 2, 12, 30, 70, 0.25, 0.5, R_EL, 10); sfx('impact', { pal: 'curse', w: 0.3 }); }
  }
  let mzT = 9, mzX = 0, mzY = 0, eyeT = 9, snapT = 9, chargeAcc = 0, soulAcc = 0, fogAcc = 0, lastStep = 0, rollT = 9;
  function onEnter(s) {
    if (s !== CAST) return;
    poseAt(CHARGE, DUR[CHARGE] - 1 / 12, DUR[CHARGE] - 1 / 12); const sx = scrX(P.gx), sy = HY + P.gy; poseAt(CAST, 0, 0);
    releaseOrbit(40, 90, 0.3, 0.6); burst(sx, sy, 14, 50, 110, 0.25, 0.55, R_EL, 10); fx.cross(sx, sy, 6, R_EL, 0.22); ring(sx, sy, 0, R_EL);
    hop(3, sx, sy, DUMMY_X - 1, HY - 16, 18, 0.36); snapT = 0;
    shake(0.28, 2); flash(0.05); mzT = 0; mzX = sx; mzY = sy;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                   // 放兜：石弹先上扬再落下
      poseAt(ATTACK, T_REL - 1 / 12, T_REL - 1 / 12); const ax = scrX(P.gx), ay = HY + P.gy; poseAt(ATTACK, t, t);
      mzT = 0; mzX = ax; mzY = ay; snapT = 0; hop(0, ax, ay, DUMMY_X - 2, HY - 15, 9, 0.3);
      burst(ax, ay, 5, 20, 50, 0.12, 0.25, R_EL, 0); sfx('swing', { kind: 'throw', w: 0.4 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === DEATH && T_FOG.some((v) => Math.abs(t - v) < 1e-9)) fx.cloud(HX + P.bx - 12 + P.fog * 32, HY - 4, 6, R_EL, 0.7, 2);   // 吞噬前沿的一团幻觉紫雾
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                   // 扑倒落地：尘土 + 石袋摔破、紫石滚出
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 6 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      burst(HX + 4, HY - 3, 6, 20, 50, 0.2, 0.4, R_EL, 6); shake(0.1, 1); rollT = 0; sfx('fall', { w: 0.45 });
    }
  }
  const T_FOG = [INCOMING + 1.0, INCOMING + 1.3, INCOMING + 1.6, INCOMING + 1.9];
  const EVENTS = [[], [], [T_REL], [], [], [], [], [T_LAND].concat(T_FOG), []];
  function hurtFx(s) {                                                   // 僵尸：骨灰 + 少量紫光，外加一两根乱羽
    const hx = HX + 2, hy = HY - 14; burst(hx, hy, s === DEATH ? 20 : 12, 40, 110, 0.25, 0.55, FXI.dust, 18); burst(hx, hy, 5, 20, 60, 0.3, 0.6, R_EL, 10);
    spawn(K_BURST, hx - 4, hy - 3, -30, -20, 0.6, FXI.earth); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 9; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.4), 0, 9, R_EL, a, r, -(4 + Math.random() * 3)); } }
    if (state === MOVE && P.step !== lastStep) {                        // 潜行：每步 0–1 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.25 }); if (P.step > 0) spawn(K_DUST, scrX(3), HY, (Math.random() - 0.5) * 8, -2 - Math.random() * 3, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && P.fog > 0 && P.fog < 1) {                    // 紫雾沿着吞噬前沿翻涌
      fogAcc += dt * 34; const fx0 = HX + P.bx - 14 + P.fog * 32;
      while (fogAcc >= 1) { fogAcc -= 1; spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY - 1 - Math.random() * 8, (Math.random() - 0.3) * 10, -4 - Math.random() * 8, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.7 && stT < INCOMING + 2.5) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 26, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    for (let k = 0; k < HOP.length; k++) {
      const H = HOP[k]; if (!H.on) continue; H.t += dt; const q = H.t / H.dur;
      if (q >= 1) { H.on = 0; hopLand(k, H.x1, H.y1); continue; }
      if ((H.n++ % (k === 3 ? 1 : 2)) === 0) { const p = hopAt(H, q); spawn(K_TRAIL, p[0] - 1, p[1] + (Math.random() - 0.5) * 2, -8, 3, k === 3 ? 0.35 : 0.2, R_EL); }
    }
    mzT += dt; eyeT += dt; snapT += dt; rollT += dt;
  }
  function fxReset() { mzT = 9; eyeT = 9; snapT = 9; rollT = 9; chargeAcc = 0; soulAcc = 0; fogAcc = 0; lastStep = 0; for (const H of HOP) H.on = 0; }
  function fxBack(f12) { if (P.dq < 1 && P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  const eye = (x, y, open) => { put(x, y, open ? 43 : 42); put(x + 1, y, open ? 25 : 42); };   // 2×1 的「眼」：淡紫眼白 + 墨紫瞳
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 3; r++) { put(mzX + r, mzY - (r > 1 ? 1 : 0), r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX - r, mzY, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (E.state === CHARGE) {                                           // 蓄力：3–4 只「眼」形紫光从四周螺旋收进石丸
      const gx = scrX(P.gx), gy = HY + P.gy, t = E.stT;
      for (let i = 0; i < 4; i++) { const t0 = 0.2 + i * 0.24, q = (t - t0) / 0.5; if (q < 0 || q >= 1) continue; const r = 17 * (1 - q) + 1.5, a = i * 1.7 + q * 4.2; eye(RD(gx + Math.cos(a) * r), RD(gy + Math.sin(a) * r * 0.7), q < 0.8); }
    }
    if (P.big && P.gem >= 2 && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy, L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (eyeT < 1.5) { for (let k = 0; k < 3; k++) { const a = f12 * 0.45 + k * 2.094; eye(RD(DUMMY_X + Math.cos(a) * 7) - 1, RD(HY - 33 + Math.sin(a) * 2), ((f12 + k) % 5) !== 0); } }   // 假人头顶 3 只小眼睛绕圈
    if (rollT < 1.8) {                                                  // 石袋摔破：4 颗紫石滚出，越滚越慢，被紫雾吞到就不见了
      for (let k = 0; k < 4; k++) { const v = [-14, -6, 9, 17][k], q = Math.min(rollT, 0.6), x = RD(HX + 4 + v * (q - q * q / 1.2)), y = HY - (rollT < 0.12 ? 1 : 0); if (P.fog > 0 && x < HX - 14 + P.fog * 32) continue; put(x, y, k & 1 ? EL[1] : EL[0]); put(x + 1, y, EL[2]); }
    }
    for (let k = 0; k < HOP.length; k++) {                               // 飞行中的石弹
      const H = HOP[k]; if (!H.on) continue; const p = hopAt(H, H.t / H.dur), x = RD(p[0]), y = RD(p[1]);
      if (k === 3) { put(x, y, EL[0]); put(x + 1, y, EL[1]); put(x - 1, y, EL[1]); put(x, y - 1, EL[1]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[2]); put(x - 1, y - 1, EL[2]); if (f12 & 1) { put(x + 2, y, EL[1]); put(x, y - 2, EL[1]); } }
      else { put(x, y, k === 0 ? EL[0] : EL[1]); put(x + 1, y, EL[1]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[3]); }
    }
  }
  function fxMid() {                                                    // 放兜时弓弦回弹的拖影（两道斜线）
    if (snapT < 2 / 12 && !P.bowF) { const G = bowGeo(1, 0), bx = scrX(P.bhx), by = HY + P.bhy, c = snapT < 1 / 12 ? EL[1] : EL[3], tu = G.at(SL), td = G.at(-SL);
      for (let k = 1; k <= 3; k++) { const q = k / 4; put(RD(bx + tu[0] * (1 - q) + G.rest[0] * q - G.bx * 2), RD(by + tu[1] * (1 - q) + G.rest[1] * q - G.by * 2), c); put(RD(bx + td[0] * (1 - q) + G.rest[0] * q - G.bx * 2), RD(by + td[1] * (1 - q) + G.rest[1] * q - G.by * 2), c); } }
  }

  return {
    name: '投石弓手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [1, -14], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'curse', style: 'shadow', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
