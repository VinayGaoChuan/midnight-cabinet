// 食人魔（敌人 · 野兽 · 稀有）：巨型驼背档——约 34 格高、头极小（头身比 1:6）、肩背高耸成山、手臂比腿粗、短弯腿，灰青蓝粗皮。
// 识别：右手拖一根连根拔起的整棵树干当大棒（根团在棒头、两道铁箍、苔斑），竖起时根团高出头 8 格；额头正中一根弯短独角、下颚一根外翘长獠牙；
// 背上用麻绳捆一块破门板当护背，门板高出肩。
// 攻击 = 砸（双手把树干举过头整根砸下）；技能（无特性 → 表现「挥舞着巨大的棍棒」）：拖棒后仰 → 原地转半圈抡圆 → 树干甩过头顶 → 全力砸地：地裂 + 土浪 + 木屑外爆。
// 死亡 = 前扑压棒：树棒先脱手倒下，自己向前扑倒压在棒上，背上门板弹开，扬起大团尘土。
PCD.define('OgreEnemy', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, fall, hitDummy, put, scrX, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：巨棒 · 碎木撞击（FXI.impact：白 → 奶油 → 金 → 木 → 深木）；土浪、扬尘借通用 dust ─────
  const R_EL = FXI.impact, EL = FXR[R_EL], R_DUST = FXI.dust, DU = FXR[R_DUST];

  // ───── 材质 ─────
  const HIDE = ['#141820', '#2e3a48', '#4e6070', '#7a8c98'];                 // 灰青蓝粗皮（stone 冷段偏蓝）
  const M = parts.mats(E, {
    body: { r: HIDE, band: 2 }, hide: HIDE, face: ['#141820', '#4e6070', '#7a8c98', '#a8b8c4'], brow: ['#141820', '#141820', '#2e3a48', '#2e3a48'],
    cloth: 'leather', rope: 'sand', wood: 'wood', root: 'boot', moss: 'moss', clod: 'stone', bone: 'bone', iron: 'iron', plank: 'wood',
    eye: { r: [14, 14, 14, 14], flat: 1 }, mouth: { r: [0, 0, 55, 56], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 11, torso: 16, head: 5, headW: 6, sw: 6, arm: 14, lw: 4, limb: 1.9, hunch: 2, headX: 1, stride: 3, lift: 2, fall: 'front' };
  const HX = 62, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(112, 80, 54, 74);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };

  // ───── 姿势：前手（右手）握树干，a = 树干朝向（0 朝上、顺时针为正）；后手（左手）bhx / bhy ─────
  // two 双手握棒 · shd 棒扛在肩上（画在头之前）· scr 后手挠头 · jaw 张嘴 0–2 · cs 树棒 0 在手 / 1 脱手倒下 / 2 平躺在地 · ca 倒下的角度档
  // dR 门板 0 背着 / 1 弹飞（竖）/ 2 弹飞（横）/ 3 落地 · dX dY 门板位置（dX 左沿、dY 底边离地）
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, jaw: 0, two: 0, shd: 0, scr: 0, cs: 0, ca: 0, dR: 0, dX: 0, dY: 0, rim: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch == null ? 1 : crouch });
  const K_IDLE = K(15, -15, -0.05, -5, -11, 0, 0, 1);       // 树干竖在身前，根团高出头
  const K_SHLD = K(9, -17, -1.0, -5, -11, 0, 0, 1);        // 扛在肩（驼峰）上
  const K_REST = K(9, -17, -1.0, 3, -31, 0, -1, 1);        // 待机个性：扛棒 + 后手挠头
  const K_DRAG = K(2, -11, -2.0, -5, -12, 0, 0, 1);         // 移动：单手拖在身后，根团贴地
  const K_WIND = K(3, -34, -1.2, 0, 0, -1, -1, 1);          // 攻击预兆：双手把树干举过头
  const K_SMASH = K(15, -15, 2.25, 0, 0, 2, 1, 2);          // 攻击出手：整根砸下
  const K_HOLD = K(15, -14, 2.3, 0, 0, 2, 1, 2);
  const K_CDRAG = K(0, -12, -2.1, 0, 0, -1, -1, 2);         // 蓄力：拖到身后、身体后仰
  const K_CLOW = K(-1, -14, -1.9, 0, 0, -1, -1, 2);
  const K_CSW = K(-2, -17, -1.57, 0, 0, 0, 0, 2);           // 抡圆：树干横在身后（镜像 = 转半圈，树干甩到另一侧）
  const K_CUP = K(0, -27, -0.75, 0, 0, -1, -1, 1);          // 甩过头顶
  const K_CTOP = K(1, -32, -1.3, 0, 0, -1, -1, 2);          // 蓄满：树干压在脑后
  const K_SLAM = K(13, -16, 2.45, 0, 0, 2, 1, 3);           // 施放：砸地（根团落在假人前 10 格）
  const K_PULL = K(10, -16, 2.35, 0, 0, -1, -1, 2);         // 收招：费力拔出
  const K_HURT = K(11, -14, -0.3, -6, -12, -1, -1, 1);
  const K_KNEEL = K(13, -11, 0.4, -4, -9, 1, 1, 4);
  const K_LIE = K(11, -24, 0, 6, -24, 0, 0, 0);             // 前扑：两臂往前伸（倒地后整具身体转 90°）
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B == null ? A : B, q || 0, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 40], ['hy', -48, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 40], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['jaw', 0, 2], ['two', 0, 1], ['shd', 0, 1], ['scr', 0, 1], ['cs', 0, 2], ['ca', 0, 3], ['dR', 0, 3], ['dX', -32, 8], ['dY', 0, 31]]);
  const T_HIT = 2 / 12, T_WAVE = 0.2, T_PULL = 0.2, T_DROP = INCOMING + 0.5, T_LAND = INCOMING + 0.66, T_DOOR = INCOMING + 0.8;
  const CA = [0.75, 1.3, PI / 2];                                          // 脱手的树干倒下：斜 → 更斜 → 平躺

  // 树干几何：握点 g、朝向 a → 断口（握点后 3 格）/ 树干末端 / 根团中心
  const CL_LEN = 17, CL_BUTT = 3, ROOT_R = 3.3;
  function clubGeo(gx, gy, a) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, bx: gx - dx * CL_BUTT, by: gy - dy * CL_BUTT, tx: gx + dx * CL_LEN, ty: gy + dy * CL_LEN, rx: gx + dx * (CL_LEN + 2.5), ry: gy + dy * (CL_LEN + 2.5) }; }
  const FREE_BUTT = [12, -2];                                              // 脱手后树干断口落地的位置
  function freeGrip() { const a = CA[P.ca]; return [FREE_BUTT[0] + Math.sin(a) * CL_BUTT, FREE_BUTT[1] - Math.cos(a) * CL_BUTT, a]; }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0;
    P.flip = 0; P.mx = 0; P.jaw = 0; P.two = 0; P.shd = 0; P.scr = 0; P.cs = 0; P.ca = 0; P.dR = 0; P.dX = 0; P.dY = 0; P.rim = 0;
    const idle = () => {
      setK(K_IDLE); P.bob = Math.floor(TT * 2.5 + 1e-6) & 1; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                            // 待机个性：扛起树棒、后手挠头、张大嘴打个哈欠
      if (lp >= 1.4 - 1e-6 && lp < 2.2) {
        const k = f12of(lp - 1.4);                                          // 0 … 9
        if (k === 0 || k === 9) { setK(K_IDLE, K_SHLD, 0.5); P.shd = 1; }
        else { setK(K_REST); P.shd = 1; P.scr = 1; P.bhx += (k & 1) ? 1 : 0; P.bhy += (k & 1) ? 0 : 1; P.bob = 0; }
        if (k >= 3 && k <= 7) { P.jaw = k === 3 || k === 7 ? 1 : 2; P.eyes = k >= 4 && k <= 6 ? 1 : 0; P.head = -1; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                  // 左右晃的重踏：接触帧下沉 + 前倾，经过帧回正；棒头拖地
      setK(K_DRAG); parts.gait(P, E.gait(tq));
      if (P.step) { P.crouch = 2; P.lean = P.step > 0 ? 1 : 0; P.head = P.step > 0 ? 1 : -1; } else { P.crouch = 1; P.lean = 0; P.head = 0; }
      P.a = K_DRAG.a + P.step * 0.1; P.hx = K_DRAG.hx + P.step;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12 - 1e-6) setK(K_IDLE);
      else if (tq < T_HIT - 1e-6) { setK(K_WIND); P.two = 1; P.jaw = 1; }
      else if (tq < 0.25) { setK(K_SMASH); P.two = 1; P.bx = 2; P.jaw = 2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_SMASH, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.two = 1; P.bx = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                              // 拖到身后后仰 → 转半圈抡圆（镜像）→ 甩过头顶 → 压在脑后发抖
      P.two = 1;
      if (tq < 0.35) { setK(K_IDLE, K_CDRAG, ease.inOut(tq / 0.35)); P.two = tq >= 0.17 ? 1 : 0; }
      else if (tq < 0.47) setK(K_CLOW);
      else if (tq < 0.6) setK(K_CSW);
      else if (tq < 0.72) { setK(K_CSW); P.flip = 1; P.sway = 1; }
      else if (tq < 0.85) { setK(K_CSW, K_CUP, 0.5); P.flip = 1; P.sway = 1; }
      else if (tq < 1.05) { setK(K_CUP); P.jaw = 1; }
      else { setK(K_CTOP); P.jaw = 2; P.bx = (f12 & 1) ? -1 : 0; P.sway = (f12 & 1) ? -1 : 1; }
    } else if (st === CAST) { setK(K_SLAM); P.two = 1; P.jaw = tq < 0.25 ? 2 : 1; P.sway = tq < 0.25 ? -2 : -1; if (tq >= 0.25) { P.crouch = 2; P.head = 0; } }
    else if (st === RECOVER) {                                               // 费力地把树干从地里拔出、扛回肩上
      if (tq < 0.25) { setK(K_PULL); P.two = 1; P.lean = (f12 & 1) ? -1 : 0; P.jaw = 1; P.eyes = 1; }
      else if (tq < 0.5) { const q = ease.inOut((tq - 0.25) / 0.25); setK(K_PULL, K_SHLD, q); P.shd = q > 0.5 ? 1 : 0; P.two = q < 0.3 ? 1 : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.2)); setK(K_SHLD, K_IDLE, q); P.shd = q < 0.5 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.jaw = 1; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                               // 前扑压棒
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.jaw = 1; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; }
      else if (d < 0.5) { setK(K_KNEEL); P.bx = -2; P.eyes = 1; P.jaw = 1; P.cs = 1; P.ca = d < 0.4 ? 0 : 1; }
      else {
        setK(K_LIE); P.lying = 1; P.bx = -2; P.eyes = 1; P.jaw = 1; P.cs = 2; P.ca = 2; P.lift = d < 0.58 ? 3 : d < T_LAND - INCOMING ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0.5) {                                                        // 门板弹开：往后上方飞、翻成横的、落在脚后
        const q = clamp01((d - 0.5) / 0.3);
        P.dX = RD(-10 - 15 * q); P.dY = RD(17 * (1 - q) + Math.sin(q * PI) * 7); P.dR = q >= 1 ? 3 : q < 0.45 ? 1 : 2;
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.two) { const s = parts.onShaft(P, {}, 3.5); P.bhx = s[0]; P.bhy = s[1]; }
    if (P.cs) { const g = freeGrip(), c = clubGeo(g[0], g[1], g[2]); P.gx = RD(c.rx) + P.bx; P.gy = RD(c.ry); }
    else { const c = clubGeo(P.hx, P.hy, P.a); P.gx = RD(c.rx) + P.bx; P.gy = RD(c.ry); }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  const ROOTS = [[-3, -3], [-4, -4], [-5, -4], [-6, -5], [-1, -4], [-1, -5], [-2, -6], [1, -4], [2, -5], [2, -6], [3, -7], [3, -3], [4, -4], [5, -4], [6, -3], [-4, 0], [-5, 1], [4, 0], [5, 1]];
  const CLODS = [[-1, -1, M.clod, 4], [1, 0, M.clod, 3], [0, 2, M.clod, 3], [2, -2, M.moss, 3], [-2, 1, M.moss, 2]];
  const rotq = (q, u, v) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  // 候选部件：uprootedClub（连根拔起的树干大棒：3 → 5 格粗的树干 + 木纹 + 两道铁箍 + 苔斑 + 断口；棒头根团按真实角度放，须根和土块按 90° 换朝向）
  function club(T, gx, gy, a) {
    const g = clubGeo(gx, gy, a), nx = -g.dy, ny = g.dx;
    E.part();
    parts.sweep(E, T, g.bx, g.by, g.tx, g.ty, 1.0, 2.0, M.wood, 0);
    for (let d = 0; d <= CL_LEN - 2; d += 3) parts.px(E, T, gx + g.dx * d + nx * 0.6, gy + g.dy * d + ny * 0.6, M.wood, 2);    // 木纹
    for (const d of [5, 11]) for (let k = -2; k <= 2; k++) parts.px(E, T, gx + g.dx * d + nx * k, gy + g.dy * d + ny * k, M.iron, k === -2 ? 4 : k === 2 ? 2 : 0);   // 铁箍
    for (const [d, s, t] of [[8, -1.4, 3], [14, -1.8, 3], [15, -2.2, 4], [2, 1.2, 2]]) parts.px(E, T, gx + g.dx * d + nx * s, gy + g.dy * d + ny * s, M.moss, t);   // 苔斑
    parts.px(E, T, g.bx, g.by, M.wood, 4);                                                               // 断口
    E.part();
    parts.brush(E, T, g.rx, g.ry, ROOT_R, M.root, 0);
    const q = RD(a / (PI / 2)) & 3, cx = RD(g.rx), cy = RD(g.ry);
    ROOTS.forEach(([u, v], i) => { const r = rotq(q, u, v); parts.px(E, T, cx + r[0], cy + r[1], M.root, i % 4 === 3 ? 4 : 0); });
    for (const [u, v, m, t] of CLODS) { const r = rotq(q, u, v); parts.px(E, T, cx + r[0], cy + r[1], m, t); }
  }
  // 候选部件：strappedDoor（背上捆的破门板：4 × 14，参差断口、竖板缝、两道横撑 + 铁钉、一个破洞；flat = 横躺）
  const DOOR_W = 4, DOOR_H = 14;
  function door(T, x0, y0, flat, lean) {
    E.part();
    for (let v = 0; v < DOOR_H; v++) for (let u = 0; u < DOOR_W; u++) {
      if ((v === 0 && (u === 1 || u === 3)) || (v === DOOR_H - 1 && u === 3)) continue;
      let m = M.plank, t = 0;
      if (u === 2) t = 2;
      if (v === 3 || v === 10) t = u === 0 || u === 3 ? 4 : 2;
      if ((v === 3 || v === 10) && (u === 0 || u === 3)) m = M.iron;
      if (v === 7 && u === 1) t = 1;
      const du = lean && v < 5 ? 1 : 0;
      if (flat) parts.px(E, T, x0 + v, y0 + u, m, t); else parts.px(E, T, x0 + u + du, y0 + v, m, t);
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    if (P.dR) { const flat = P.dR >= 2; door(parts.FREE, P.dX, flat ? -P.dY - DOOR_W + 1 : -P.dY - DOOR_H + 1, flat, 0); }
    if (P.cs && R.lie) { const g = freeGrip(); club(parts.FREE, g[0], g[1], g[2]); }        // 先倒下的树棒压在身下
    if (!P.dR && !R.lie) door(R, parts.edges(R, R.yS + 4)[0] - 3, R.yS - 5, 0, 1);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.hideD, cuff: M.clothD, hand: M.hideD, grip: P.two || P.scr ? 'none' : 'big' });
    parts.legs(E, R, P, { style: 'bare', mat: M.hide, matD: M.hideD });
    const tor = parts.torso(E, R, P, { style: 'bare', mat: M.body, belt: M.cloth, cloth: M.cloth, strap: M.rope });
    { // 和躯干同一个部件：驼峰（肩背高耸过头顶）+ 疙瘩 + 后腰布
      const L = parts.edges(R, R.yS)[0];
      [[1, 0, 6], [2, 1, 5], [3, 2, 4]].forEach(([k, a, b]) => parts.run(E, R, R.yS - k, L + a, L + b, M.body, 0));
      parts.px(E, R, L + 3, R.yS - 3, M.body, 4); parts.px(E, R, L + 3, R.yS - 1, M.body, 2); parts.px(E, R, L + 1, R.yS + 3, M.body, 2); parts.px(E, R, L + 4, R.yS + 1, M.body, 4);
      const lb = parts.edges(R, R.yHip)[0], sw = RD(P.sway * 0.5);
      for (let y = R.yHip + 1; y <= Math.min(0, R.yHip + 3); y++) parts.run(E, R, y, lb - (y > R.yHip + 2 ? sw : 0), lb + 2 - (y > R.yHip + 2 ? sw : 0), M.cloth, y === R.yHip + 3 ? 2 : 0);
      void tor;
    }
    if (!P.cs && P.shd) club(R, P.hx, P.hy, P.a);
    const H = parts.head(E, R, P, { mat: M.face, face: 'square', age: 'rugged', eye: M.eye, brow: M.brow, browStyle: 2, nose: 'small', mouth: P.jaw ? 'none' : 'wide', ear: 'dot' });
    if (P.jaw) {                                                             // 张嘴（打哈欠 / 怒吼）：和脸同一个部件，下巴往下掉一行
      parts.run(E, R, H.bot + 1, H.x0 + 2, H.x1, M.face, 0);
      parts.px(E, R, H.x1, H.bot, M.mouth, 1); parts.px(E, R, H.x1 - 1, H.bot, M.mouth, 1);
      if (P.jaw >= 2) { parts.px(E, R, H.x1, H.bot + 1, M.mouth, 3); parts.px(E, R, H.x1 - 1, H.bot + 1, M.mouth, 1); parts.px(E, R, H.x1, H.bot - 1, M.mouth, 1); }
    }
    E.part();                                                                // 额头正中的弯短独角（往前勾）
    parts.px(E, R, R.hx, H.top - 1, M.bone, 3); parts.px(E, R, R.hx + 1, H.top - 1, M.bone, 2); parts.px(E, R, R.hx + 1, H.top - 2, M.bone, 4); parts.px(E, R, R.hx + 2, H.top - 3, M.bone, 4);
    E.part();                                                                // 下颚一侧外翘的长獠牙
    { const j = P.jaw ? 1 : 0, x = H.x1, y = H.bot + j; parts.px(E, R, x + 1, y, M.bone, 3); parts.px(E, R, x + 2, y - 1, M.bone, 3); parts.px(E, R, x + 2, y - 2, M.bone, 4); parts.px(E, R, x + 3, y - 3, M.bone, 4); }
    if (!P.cs && !P.shd) club(R, P.hx, P.hy, P.a);
    if (P.cs && !R.lie) { const g = freeGrip(); club(parts.FREE, g[0], g[1], g[2]); }
    if (P.two || P.scr) parts.hand(E, R, P, { side: 'B', hand: P.two ? M.hide : M.hideD, grip: 'big' });
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.hide, cuff: M.cloth, hand: M.hide, grip: 'big' });
  }
  function bakeHero() { RIM.rim = 0; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let swT = 9, chipAcc = 0, dustAcc = 0, soulAcc = 0, lastStep = 0, slamX = 0;
  const rootScr = () => [scrX(P.gx), HY + P.gy];
  function chips(x, y, n, up) { for (let i = 0; i < n; i++) { const a = -PI * Math.random(), v = 30 + Math.random() * 70; spawnX(K_PHYS, x, y, Math.cos(a) * v, Math.sin(a) * v - up, 0.5 + Math.random() * 0.4, R_EL, { g: 220, floor: HY }); } }
  function dust(x, n, spread, vy, life, big) { for (let i = 0; i < n; i++) spawnX(K_DUST, x + (Math.random() - 0.5) * spread, HY - Math.random() * 2, (Math.random() - 0.5) * spread * 2.2, -vy * (0.4 + Math.random() * 0.8), life * (0.7 + Math.random() * 0.6), R_DUST, big && (i & 1) ? { sz: 2 } : undefined); }
  function onEnter(s) {
    if (s === CHARGE) { fx.crack(scrX(3), FLOOR, 4, 1, R_EL, 1.4); fx.crack(scrX(-3), FLOOR, 4, -1, R_EL, 1.4); }
    if (s === CAST) {                                                        // 树干砸地：地裂 + 土浪 + 木屑外爆 + 大冲击环
      poseAt(CAST, 0, E.simT); const [rx] = rootScr(); slamX = rx;
      releaseOrbit(40, 90, 0.3, 0.6, { at: [rx, HY - 2], up: 20 });
      fx.crack(rx, FLOOR, 10, 1, R_EL, 0.9); fx.crack(rx - 2, FLOOR, 6, -1, R_EL, 0.7);
      fx.wave(rx + 2, HY, 1, Math.max(8, DUMMY_X - rx + 2), 6, R_DUST, 0.45, 2);
      chips(rx, HY - 3, 24, 30); burst(rx, HY - 3, 12, 50, 120, 0.2, 0.45, R_EL, 18); dust(rx, 14, 10, 20, 0.6, 1);
      ring(rx, HY - 3, 1, R_EL); fx.cross(rx, HY - 4, 6, R_EL, 0.2, 2);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'earth', w: 0.95 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                        // 根团整个砸在假人身上
      const [rx, ry] = rootScr(); swT = 0;
      chips(Math.min(rx, DUMMY_X - 3), ry - 1, 14, 20); burst(DUMMY_X - 3, HY - 10, 10, 40, 100, 0.15, 0.35, R_EL, 10); dust(rx, 6, 6, 12, 0.4, 0);
      hitDummy(1); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'wood', w: 0.9 });
    }
    if (s === CAST && t === T_WAVE) {                                         // 土浪掀到假人：击退 + 碎木屑落下
      hitDummy(1); burst(DUMMY_X, HY - 8, 16, 40, 110, 0.2, 0.5, R_EL, 22); ring(DUMMY_X, HY - 3, 0, R_EL);
      for (let i = 0; i < 8; i++) fall(DUMMY_X - 8 + Math.random() * 16, HY - 30 - Math.random() * 10, (Math.random() - 0.5) * 20, 40 + Math.random() * 30, HY, R_EL);
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.6 });
    }
    if (s === RECOVER && t === T_PULL) { const [rx] = rootScr(); dust(rx, 8, 6, 16, 0.5, 1); chips(rx, HY - 2, 6, 10); }
    if (s === DEATH && t === T_DROP) { const [rx] = rootScr(); dust(rx, 8, 8, 14, 0.5, 0); sfx('hit', { mat: 'wood', w: 0.6 }); }
    if (s === DEATH && t === T_LAND) { dust(HX + 4, 26, 26, 22, 0.8, 1); shake(0.12, 1); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === T_DOOR) dust(HX - 20, 6, 10, 10, 0.4, 0);
  }
  const EVENTS = [[], [], [T_HIT], [], [T_WAVE], [T_PULL], [], [T_DROP, T_LAND, T_DOOR], []];
  function stepFX(dt, state, stT) {
    const [rx, ry] = rootScr();
    if (state === CHARGE) {                                                   // 根团上木屑抖落 + 尘土往根团卷
      chipAcc += dt * (stT < 0.35 ? 4 : 16);
      while (chipAcc >= 1) { chipAcc -= 1; spawnX(K_PHYS, rx + (Math.random() - 0.5) * 6, ry + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 20, -10 - Math.random() * 10, 0.6 + Math.random() * 0.3, R_EL, { g: 200, floor: HY }); }
      if (stT > 0.35) { dustAcc += dt * (14 + 22 * clamp01((stT - 0.35) / 1.0)); while (dustAcc >= 1) { dustAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, rx, ry, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_DUST, a, r, 5 + Math.random() * 3); } }
    }
    if (state === MOVE && P.step !== lastStep) {                              // 重踏：每步 4 颗尘 + 棒头犁地扬 2 颗
      if (P.step !== 0) { dust(scrX(P.step > 0 ? 6 : -4), 4, 5, 10, 0.4, 0); dust(rx, 2, 3, 6, 0.35, 0); sfx('step', { w: 0.95 }); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 34, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    swT += dt;
  }
  function fxReset() { swT = 9; chipAcc = 0; dustAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) {
    if (E.state === MOVE && !P.lying) {                                       // 棒头在地上犁出一道（身后 10 格，断续）
      for (let k = 0; k < 10; k++) { if (((k + f12) % 3) === 2) continue; put(scrX(P.gx - 3 - k), FLOOR, k < 4 ? DU[3] : DU[4]); }
    }
  }
  function fxFront(f12) {
    if (swT < 2 / 12) {                                                       // 砸下的拖影弧：根团从头顶到假人，半径 = 握点到根团
      const cx = HX + 2 + K_SMASH.hx, cy = HY + K_SMASH.hy + 2, r = CL_LEN + 2.5, c = swT < 1 / 12 ? EL[1] : EL[2];
      for (let k = 0; k <= 16; k++) {
        if (swT >= 1 / 12 && (k & 1)) continue; const a = -0.4 + (K_SMASH.a + 0.4) * k / 16;
        put(RD(cx + Math.sin(a) * r), RD(cy - Math.cos(a) * r), c); if (swT < 1 / 12 && k > 3) put(RD(cx + Math.sin(a) * (r - 2)), RD(cy - Math.cos(a) * (r - 2)), EL[2]);
      }
    }
  }

  return {
    name: '食人魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [], HIT_POINT: [3, -18], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'meteor', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
