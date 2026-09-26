// 流浪投石机（虚空 · 射手 · 神话）：爬行投石车长大了——六条虫足长成四条细长的高跷节肢，车架长成一座漂白旧木的配重投石机，
// 头重脚轻、整架向前歪；超长投臂高出机架 12 格，抛兜里垂着一块巨石；虚空石配重长成吊在机架里的一大块紫色晶簇。到处是补丁木板、绳子和吊着晃的碎木片。
// 攻击 = 配重坠落带动投臂，超高弧线抛出火焰巨石砸在假人身上；技能 = 特性「火炮」（越摇晃越强，从极远处砸下致命一击）：
// 全身越晃越厉害、木板螺钉崩飞、晶簇一档档亮到 3，配重轰然坠下，火焰巨石飞出画面顶端，0.3 s 后从天而降砸在假人身上（大火焰冲击环 + 地裂 + 火浪 + 余火）。
// 死亡 = 整架向前慢慢倾倒（剪切两档 → 按 90° 转的倒地姿），落地后木架轰然散成几截（死亡套件 parts），晶簇配重滚出来后暗掉。
// 身体不用现成骨架：高跷节肢、平台、A 字机架、配重投臂、晶簇、抛兜、补丁和碎木片都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('WanderingTrebuchet', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, death, sfx, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const M_BONE = defMat('bone', 2), M_BONE1 = defMat('bone', 1), M_PATCH = defMat('wood', 1);   // 漂白旧木（平台 band 2 / 机架与投臂 band 1）/ 补丁木板
  const M_LEG = defMat('shadow', 1), M_LEGF = defMat('shadow', 1, 0, 1), M_CLAW = defMat('bone', 1);   // 紫黑高跷节肢（远侧暗一级）/ 足尖
  const M_IRON = defMat('iron', 1), M_ROPE = defMat('leather', 1), M_ROCK = defMat([8, 10, 18, 17], 1);
  const M_FIRE = defMat([44, 45, 46, 47], 1, 1), M_HOT = defMat([46, 47, 51, 21], 1, 1);           // 火焰巨石（发光体，手写色调）/ 白热芯
  const M_CW = defMat([25, 42, 24, 43], 1, 1), M_CWG = defMat([43, 43, 21, 21], 1, 1);             // 虚空晶簇配重（发光体）/ 最亮芯
  const R_EL = FXI.fire, EL = FXR[R_EL], R_IMP = FXI.impact, R_VOID = FXR[FXI.curse], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(86, 62, 30, 57);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  RIM.skip[M_FIRE] = RIM.skip[M_HOT] = RIM.skip[M_CW] = RIM.skip[M_CWG] = RIM.skip[M_ROPE] = RIM.skip[M_CLAW] = RIM.skip[M_LEG] = RIM.skip[M_LEGF] = 1;

  // ───── 姿势 ─────
  // ai 投臂角度档 · sl 抛兜 0 兜着巨石 / 1 空兜 / 2 甩出 · gem 巨石火 0–3 · cw 晶簇亮度 0–3、4 熄灭 · rope 绳索绷直 · sh 整架歪斜（剪切，+ 向前）
  // gf 步态帧 · lie 倒地姿（整架按 90° 转，顶朝前）· nocw 晶簇已滚出 · rs 轮廓光光源 0 晶簇 / 1 巨石
  const P = { ai: 3, sl: 0, sw: 0, gem: 0, fl: 0, cw: 0, rope: 0, bob: 0, lift: 0, sh: 1, gf: -1, lie: 0, nocw: 0, rs: 0,
    bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['ai', 0, 7], ['sl', 0, 2], ['sw', -1, 1], ['gem', 0, 3], ['fl', 0, 1], ['cw', 0, 4], ['rope', 0, 1], ['bob', 0, 1], ['lift', 0, 3], ['sh', -2, 6],
    ['gf', -1, 3], ['lie', 0, 1], ['nocw', 0, 1], ['rs', 0, 1], ['bx', -4, 2], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  // 投臂长端的方向（0 朝上、顺时针为正）：后下 1:2 · 水平后 · 2:1 · 45° · 1:2 · 竖直 · 1:2 前 · 45° 前
  const ANG = [-2.0344, -Math.PI / 2, -1.1071, -Math.PI / 4, -0.4636, 0, 0.4636, Math.PI / 4], LONG = 17, SHORT = 5;
  const LEGS = [[7, 13, 0], [-7, -13, 1]];                                     // 近侧 前 / 后：[根 x, 脚 x, 对角组]；远侧同表左移 1 格、组互换
  const T_REL = 2 / 12, T_FALL0 = 0.1, T_LAND = INCOMING + 0.66, T_BREAK = INCOMING + 0.95, XM = 14;
  const standLift = () => (P.lie ? 0 : P.lift), pivotY = () => -31 + P.bob - standLift();   // 倒地时离地高度在 toS 里算
  function armPts(ai) { const a = ANG[ai], dx = Math.sin(a), dy = -Math.cos(a), py = pivotY(); return { px: 0, py, tx: RD(dx * LONG), ty: RD(py + dy * LONG), sx: RD(-dx * SHORT), sy: RD(py - dy * SHORT) }; }
  // 本地（站姿）→ 精灵坐标：站着时按 sh 剪切（越高越往前歪），倒地时整架顺时针转 90°（顶朝前、前沿贴地）
  const shx = (x, y) => x + RD(P.sh * -y / 26);
  function toS(x, y) { if (P.lie) return [-y, x - XM - P.lift]; return [shx(x, y), y]; }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.ai = 3; P.sl = 0; P.sw = 0; P.gem = 0; P.fl = f12 & 1; P.cw = 1; P.rope = 0; P.bob = 0; P.lift = 0; P.sh = 1; P.gf = -1; P.lie = 0; P.nocw = 0; P.rs = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {                                                            // 摇摇欲坠：整架吱嘎前后晃，晃得越歪配重越亮；1.6–2.0 s 猛一歪、掉下一片木板
      const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sh = [1, 2, 1, 0][b & 3]; P.cw = P.sh >= 2 ? 2 : 1; P.sw = [0, -1, 0, 1][b & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.sh = lp < 1.75 ? 4 : 3; P.cw = 3; P.sw = -1; P.bob = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                          // 高跷蹒跚：对角两条高跷一组大步迈，机身前后大幅摇摆
      const f = gait(tq); P.gf = f; P.bob = f & 1 ? 0 : 1; P.sh = [0, 2, 3, 1][f]; P.sw = [1, 0, -1, 0][f]; P.cw = P.sh >= 2 ? 2 : 1;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                      // 投臂压到水平 → 配重坠落、投臂甩向前上方（巨石出手）→ 摆回、重新装石
      if (tq < T_REL) { P.ai = tq < 1 / 12 ? 2 : 1; P.rope = 1; P.cw = 2; P.gem = 1; P.sh = 0; P.rs = 1; }
      else if (tq < 0.2) { P.ai = 6; P.sl = 2; P.lift = 1; P.cw = 3; P.sh = -1; P.rim = 2; P.rs = 1; }
      else if (tq < 0.45) { P.ai = 5; P.sl = 2; P.sh = tq < 0.3 ? 0 : 2; P.cw = 2; P.rs = 1; }
      else { P.ai = tq < 0.55 ? 4 : 3; P.sl = tq < 0.62 ? 1 : 0; P.sh = 1; P.sw = tq < 0.62 ? 1 : 0; }
    } else if (st === CHARGE) {                                                      // 越晃越厉害；投臂压到后下方、绳索绷直；晶簇一档档亮到 3；巨石点燃
      const q = ease.inOut(clamp01(tq / 0.7)), A = 1 + Math.min(3, Math.floor(tq / 0.35));
      P.ai = RD(3 - 3 * q); P.rope = 1; P.sh = (f12 & 2) ? 1 + A : 1 - (A >> 1); P.bob = (f12 >> 1) & 1;
      P.cw = Math.min(3, 1 + Math.floor(tq / 0.45)); P.gem = tq < 0.4 ? 0 : tq < 0.9 ? 1 : 1 + (f12 & 1); P.rim = 2; P.rs = 1; P.sw = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {                                                        // 配重轰然坠下，投臂甩出巨大弧线，机架反弹跳起
      if (tq < T_REL) { P.ai = 6; P.lift = 2; P.sl = 2; P.cw = 3; P.sh = -2; P.rim = 3; P.rs = 1; }
      else { P.ai = tq < 0.3 ? 5 : 6; P.lift = tq < 0.3 ? 1 : 0; P.sl = 2; P.cw = 2; P.sh = tq < 0.3 ? 0 : 2; P.rim = 2; P.rs = 1; }
    } else if (st === RECOVER) {                                                     // 投臂慢慢摆回，吱嘎声渐弱
      const q = ease.inOut(clamp01(tq / 0.6)); P.ai = RD(5 - 2 * q); P.sl = tq < 0.4 ? 2 : tq < 0.55 ? 1 : 0; P.sh = [2, 1, 2, 1, 1, 1, 1, 1, 1][Math.min(8, f12of(tq))];
      P.cw = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.rs = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.ai = 2; P.bx = -2; P.sh = -2; P.sw = 1; P.cw = 4; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.ai = 2; P.bx = -1; P.sh = -1; P.sw = 1; P.cw = 1; P.rim = 0; }
      else { P.ai = 3; P.sh = 2; P.sw = -1; }
    } else if (st === DEATH) {                                                       // 向前慢慢倾倒（剪切 3 → 6）→ 90° 倒地（离地 3 → 1 → 0）→ 散架（死亡套件 parts）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.ai = 2; P.bx = -2; P.sh = -2; P.sw = 1; P.cw = (f12 & 1) ? 3 : 4; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.58) { P.ai = 3; P.bx = -1; P.sh = d < 0.45 ? 3 : 6; P.sw = -1; P.cw = (f12 & 1) ? 2 : 4; P.bob = 1; }
      else { P.ai = 3; P.bx = -1; P.lie = 1; P.sh = 0; P.lift = d < 0.62 ? 3 : d < 0.66 ? 1 : 0; P.cw = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4; P.nocw = d >= 0.9 ? 1 : 0;
        if (d >= T_BREAK - INCOMING) P.dq = 1; }                                    // 之后由死亡套件（散架）接管
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.cw = tq > 0.85 ? 2 : 0;
    }
    P.dq48 = RD(P.dq * 48);
    const A = armPts(P.ai);
    const f = P.rs ? toS(A.tx + P.sw, A.ty + 5) : toS(A.sx, A.sy + 5); P.gx = f[0] + P.bx; P.gy = f[1];   // 发光体：巨石 / 晶簇
    KEY(P);
  }

  // ───── 画（从后往前：远侧高跷 → 平台 → 近侧高跷 → 吊着的碎木片 → A 字机架 → 晶簇配重 → 投臂 → 抛兜 → 巨石）─────
  const px = (x, y, m, t) => { const p = toS(x, y); if (p[1] <= 0) sp(p[0], p[1], m, t); };
  function ln(x0, y0, x1, y1, w, m, t) {                                           // 直线（w 1–2 格；竖着走横向加粗，横着走纵向加粗）
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2)), vert = Math.abs(dy) >= Math.abs(dx);
    for (let k = 0; k <= n; k++) { const x = RD(x0 + dx * k / n), y = RD(y0 + dy * k / n); for (let i = 0; i < w; i++) px(vert ? x + i : x, vert ? y : y + i, m, t); }
  }
  const rw = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) px(x, y, m, t); };
  // 候选部件：高跷节肢（爬行投石车的虫足长成：根 → 拱过平台的膝 → 细长小腿 → 足尖；近侧上段 2 格粗）
  function stilt(rx, ry, kx, ky, fx, fy, m, thick) {
    part(); ln(rx, ry, kx, ky, thick, m, 0); ln(kx, ky, fx, fy, 1, m, 0);
    px(RD(kx), RD(ky) - 1, m, thick > 1 ? 4 : 3); px(RD((kx + fx) / 2) + 1, RD((ky + fy) / 2), m, 1);   // 膝节高光 + 小腿中段的节
    px(RD(fx), RD(fy), M_CLAW, 3);
  }
  function stilts(far, yB) {
    for (let j = 0; j < 2; j++) {
      const L = LEGS[j], grp = far ? 1 - L[2] : L[2], rx = L[0] - far, fx0 = L[1] - far;
      let dx = 0, up = 0;
      if (P.gf >= 0) { const g = P.gf; if (grp === 0) { dx = g === 0 ? 3 : g === 2 ? -3 : g === 3 ? 1 : 0; up = g === 3 ? 3 : 0; } else { dx = g === 0 ? -3 : g === 2 ? 3 : g === 1 ? 1 : 0; up = g === 1 ? 3 : 0; } }
      const fx = fx0 + dx, fy = -up, kx = rx + (fx0 - rx) * 0.6 + dx * 0.5, ky = yB - 3 - up + (far ? 1 : 0);
      stilt(rx, yB, kx, ky, fx, fy, far ? M_LEGF : M_LEG, far ? 1 : 2);
    }
  }
  // 候选部件：补丁平台（4 行厚的漂白木平台 + 两块深色补丁木板 + 螺钉 + 缠绳）
  function platform(yB) {
    part(); const yT = yB - 3;
    for (let y = yT; y <= yB; y++) rw(y, y === yB ? -8 : -9, y === yT ? 8 : 9, M_BONE, 0);
    for (let x = -8; x <= 8; x++) if (((x + 40) % 6) !== 2) px(x, yT + 2, M_BONE, 2);                      // 木板缝
    for (let y = yT; y <= yB - 1; y++) { px(-5, y, M_PATCH, 0); px(-4, y, M_PATCH, 0); } px(-5, yT, M_IRON, 4);   // 补丁 1（竖钉的木板）
    rw(yT + 1, 4, 7, M_PATCH, 0); rw(yT + 2, 4, 6, M_PATCH, 0); px(7, yT + 1, M_IRON, 4);                         // 补丁 2
    px(1, yT + 1, M_IRON, 4); px(-1, yB, M_IRON, 3);
    for (let y = yT; y <= yB; y++) px(-1 + (y & 1), y, M_ROPE, 3);                                                // 缠绳
  }
  // 候选部件：吊着的碎木片（平台下两根短绳各吊一片木头，随 sw 晃）
  function danglers(yB) {
    part(); for (const [x, len] of [[-3, 3], [3, 2]]) { for (let k = 1; k <= len; k++) px(x + (k === len ? P.sw : 0), yB + k, M_ROPE, 3); const bx = x + P.sw, by = yB + len + 1; px(bx, by, M_PATCH, 4); px(bx, by + 1, M_PATCH, 2); px(bx + 1, by, M_PATCH, 3); }
  }
  // 候选部件：A 字机架（两根斜柱从平台立到转轴、一道横撑、柱上补丁木板和缠绳）
  function frame(yB) {
    part(); const yT = yB - 4, py = pivotY();
    ln(-7, yT, -1, py + 1, 2, M_BONE1, 0); ln(6, yT, 1, py + 1, 2, M_BONE1, 0);
    const my = RD((yT + py) / 2); rw(my, -4, 4, M_BONE1, 0);
    px(-5, my + 2, M_PATCH, 3); px(-4, my + 2, M_PATCH, 3); px(-5, my + 3, M_PATCH, 2);   // 柱上补丁
    for (let k = 0; k < 3; k++) px(4 + (k & 1), my + 3 + k, M_ROPE, 3);                   // 缠绳
    px(-6, yT + 1, M_IRON, 4); px(5, yT + 1, M_IRON, 4);
  }
  // 候选部件：虚空晶簇配重（短端吊 2 格绳，下挂 5 宽的尖晶簇：中间一根高、两侧两根矮；lv 0–3 亮度，4 熄灭）
  const CW_SHAPE = [[0, 0, 3], [0, 1, 4], [-1, 1, 2], [1, 1, 3], [0, 2, 4], [-1, 2, 3], [1, 2, 3], [-2, 2, 2], [2, 2, 2], [0, 3, 3], [-1, 3, 3], [1, 3, 2], [-2, 3, 2], [2, 3, 2],
    [-2, 4, 2], [-1, 4, 2], [0, 4, 3], [1, 4, 2], [2, 4, 1], [-1, 5, 1], [0, 5, 2], [1, 5, 1], [-3, 3, 3], [3, 3, 2], [-3, 4, 2], [3, 4, 1]];
  function crystal(cx, cy, lv) {
    part(); px(cx, cy, M_ROPE, 3); px(cx, cy + 1, M_ROPE, 3);
    for (const [dx, dy, t] of CW_SHAPE) {
      const x = cx + dx, y = cy + 2 + dy;
      if (lv === 4) { px(x, y, M_CW, t >= 3 ? 2 : 1); continue; }
      if (lv >= 2 && t === 4) { px(x, y, M_CWG, lv === 3 ? 4 : 3); continue; }
      px(x, y, M_CW, Math.min(4, t + (lv >= 2 ? 1 : 0) - (lv === 0 && t === 4 ? 1 : 0)));
    }
  }
  // 候选部件：配重投臂（2 格粗长臂，短端 5 格、长端 17 格，末端铁箍，转轴铁）
  function arm(A) {
    part(); ln(A.sx, A.sy, A.tx, A.ty, 2, M_BONE1, 0);
    const mx = RD((A.px + A.tx) / 2), my = RD((A.py + A.ty) / 2); px(mx, my, M_PATCH, 3); px(mx + 1, my, M_ROPE, 3);   // 臂中段的补丁和缠绳
    px(A.tx, A.ty, M_IRON, 3); px(A.sx, A.sy, M_IRON, 0); px(A.px, A.py, M_IRON, 4);
  }
  // 抛兜 + 巨石（sl 0 垂着兜巨石 · 1 空兜 · 2 甩出、绳顺着投臂方向拉直）；巨石 4×4，点燃后变火焰巨石
  function slingStone(A) {
    part(); const tx = A.tx, ty = A.ty;
    if (P.sl === 2) { const a = ANG[P.ai], dx = Math.sin(a), dy = -Math.cos(a); for (let k = 1; k <= 3; k++) px(RD(tx + dx * k + k * 0.5), RD(ty + dy * k), M_ROPE, 3); px(RD(tx + dx * 4 + 2), RD(ty + dy * 4), M_ROPE, 0); px(RD(tx + dx * 4 + 3), RD(ty + dy * 4), M_ROPE, 0); return; }
    const x = tx + P.sw; px(tx, ty + 1, M_ROPE, 3); px(x - 2, ty + 2, M_ROPE, 3); px(x + 2, ty + 2, M_ROPE, 3);
    rw(ty + 7, x - 1, x + 1, M_ROPE, 0); px(x - 2, ty + 6, M_ROPE, 0); px(x + 2, ty + 6, M_ROPE, 0);
    if (P.sl === 1) return;
    part();
    const C = [[-1, 3], [0, 3], [1, 3], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [-2, 5], [-1, 5], [0, 5], [1, 5], [2, 5], [-1, 6], [0, 6], [1, 6]];
    for (const [dx, dy] of C) {
      const s = dx + dy - 4;
      if (!P.gem) px(x + dx, ty + dy, M_ROCK, s < 0 ? 4 : s > 1 ? 2 : 3);
      else if (dx === 0 && dy === 4 && P.gem >= 2) px(x, ty + 4, M_HOT, P.gem === 3 ? 4 : 3);
      else px(x + dx, ty + dy, M_FIRE, s < 0 ? 4 : s > 1 ? 2 : 3);
    }
    if (P.gem) { px(x - 1 + P.fl, ty + 2, M_FIRE, 3); if (P.gem >= 2) { px(x + 1 - P.fl, ty + 2, M_FIRE, 4); px(x + 2, ty + 3, M_FIRE, 3); } }
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);
    const yB = -16 + P.bob - standLift(), A = armPts(P.ai);
    stilts(1, yB);
    platform(yB);
    stilts(0, yB);
    if (!P.lie) danglers(yB);
    frame(yB);
    if (!P.nocw) crystal(A.sx, A.sy, P.cw);
    arm(A);
    if (P.rope) { part(); const n = Math.max(Math.abs(A.tx + 7), Math.abs(A.ty - yB + 3)); for (let k = 1; k < n; k++) px(RD(-7 + (A.tx + 7) * k / n), RD(yB - 3 + (A.ty - yB + 3) * k / n), M_ROPE, 3); }   // 拉住投臂的绳
    slingStone(A);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rimRamp = P.rs ? EL : R_VOID; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 自己的抛射物：1 普通火焰巨石（超高抛物线）· 2 技能巨石飞出画面顶端 · 3 技能巨石从天而降 · 4 死亡时滚出的晶簇
  const PJN = 8, pjOn = new Uint8Array(PJN), pjK = new Uint8Array(PJN), pjX = new Float32Array(PJN), pjY = new Float32Array(PJN), pjVX = new Float32Array(PJN), pjVY = new Float32Array(PJN), pjG = new Float32Array(PJN), pjAge = new Float32Array(PJN), pjT = new Float32Array(PJN), pjB = new Uint8Array(PJN);
  function launch(k, x, y, vx, vy, g, T) { let i = 0; for (; i < PJN - 1 && pjOn[i]; i++); pjOn[i] = 1; pjK[i] = k; pjX[i] = x; pjY[i] = y; pjVX[i] = vx; pjVY[i] = vy; pjG[i] = g; pjAge[i] = 0; pjT[i] = T; pjB[i] = 0; }
  let chargeAcc = 0, soulAcc = 0, fireAcc = 0, lastGf = -1, fireT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy), pv = toS(0, pivotY());
    releaseOrbit(30, 80, 0.25, 0.55, { up: 12 });
    launch(2, gx, gy, 40, -420, 0, 0.5);                                            // 巨石飞出画面顶端
    fx.slash(wx(pv[0]), wy(pv[1]), LONG, ANG[0], ANG[6], R_EL, 0.22, 2, 1);          // 投臂划出的巨大弧形拖影
    burst(gx, gy, 18, 40, 110, 0.2, 0.5, R_EL, 14); ring(gx, gy, 0, R_EL);
    const cw = toS(-2, pivotY() + 8); burst(wx(cw[0]), wy(cw[1]), 10, 20, 60, 0.3, 0.6, FXI.curse, 4);   // 配重坠下时晶簇迸出的紫光
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function popDebris(n) {                                                           // 木板和螺钉崩飞（小碎屑外爆）
    for (let i = 0; i < n; i++) { const p = toS(-8 + Math.random() * 16, -18 - Math.random() * 12); spawnX(K_PHYS, wx(p[0]), wy(p[1]), (Math.random() - 0.5) * 70, -30 - Math.random() * 40, 0.8, i & 1 ? FXI.earth : FXI.steel, { g: 220, floor: HY }); }
  }
  function onTime(s, t) {
    if (s === IDLE && Math.abs(t - 1.7) < 1e-9) popDebris(2);                        // 猛一歪，掉下一片木板和一颗螺钉
    if (s === ATTACK && t === T_REL) {                                               // 配重坠落、投臂甩出：巨石超高弧线
      const x = wx(P.gx), y = wy(P.gy), tx = DUMMY_X - 1, ty = HY - 14, T = 0.42, g = 1600, pv = toS(0, pivotY());
      launch(1, x, y, (tx - x) / T, (ty - y - 0.5 * g * T * T) / T, g, T);
      fx.slash(wx(pv[0]), wy(pv[1]), LONG, ANG[1], ANG[6], R_EL, 0.17, 1, 1);
      sfx('swing', { kind: 'throw', w: 0.9 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CHARGE && (Math.abs(t - 0.35) < 1e-9 || Math.abs(t - 0.7) < 1e-9 || Math.abs(t - 1.05) < 1e-9)) { popDebris(t < 0.5 ? 3 : t < 0.9 ? 4 : 6); shake(0.08, 1); }
    if (s === CAST && Math.abs(t - T_FALL0) < 1e-9) launch(3, DUMMY_X + 1, -6, -4, 320, 900, 99);   // 巨石从天而降
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 20; i++) spawn(K_DUST, HX - 4 + Math.random() * 44, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 1.0 });
    }
    if (s === DEATH && Math.abs(t - T_BREAK) < 1e-9) {                               // 落地后木架散成几截，晶簇滚出去
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); P.nocw = 1; P.dq = 0; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.55, push: 8, fromX: 18, fromY: -14, fadeAt: 1.1, fadeDur: 0.6 });
      const c = toS(armPts(3).sx, armPts(3).sy + 4); launch(4, wx(c[0]), wy(c[1]), 34, -30, 260, 99);
      burst(wx(20), wy(-8), 14, 30, 80, 0.3, 0.6, FXI.dust, 16); shake(0.16, 2);
    }
  }
  const EVENTS = [[1.7], [], [T_REL], [0.35, 0.7, 1.05], [T_FALL0], [], [], [T_LAND, T_BREAK], []];
  function hurtFx(s) {                                                               // 木结构受击：火花 + 木屑 + 一颗螺钉
    const hx = HX + 1, hy = HY - 22; burst(hx, hy, s === DEATH ? 20 : 12, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 10 : 6, 30, 80, 0.3, 0.6, FXI.earth, 14);
    spawnX(K_PHYS, hx, hy, -40, -50, 0.8, FXI.steel, { g: 220, floor: HY }); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE && t > 0.4) {                                               // 火星螺旋汇进巨石
      chargeAcc += dt * (18 + 30 * clamp01((t - 0.4) / 1.0));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE) {                                                            // 接触帧：每步震一下 + 扬尘
      if (P.gf !== lastGf && (P.gf & 1) === 0) { sfx('step', { w: 0.9 }); shake(0.06, 1); const x = wx(P.gf === 0 ? 16 : -10); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 8, 0.35 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    } else lastGf = -1;
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX + Math.random() * 40, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.curse); } }
    if (fireT < 1.1) { fireAcc += dt * 20; while (fireAcc >= 1) { fireAcc -= 1; spawn(K_EMBER, DUMMY_X - 10 + Math.random() * 20, HY - 1 - Math.random() * 3, Math.random() * 8 - 4, -8 - Math.random() * 10, 0.4 + Math.random() * 0.4, R_EL); } }   // 余火
    fireT += dt;
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; pjAge[i] += dt; const k = pjK[i];
      pjVY[i] += pjG[i] * dt; pjX[i] += pjVX[i] * dt; pjY[i] += pjVY[i] * dt;
      if (k <= 3 && ((pjAge[i] * 60) | 0) % (k === 1 ? 2 : 1) === 0) spawn(K_TRAIL, pjX[i] + Math.random() * 3 - 1.5, pjY[i] - Math.sign(pjVY[i]) * 3, -pjVX[i] * 0.1, -pjVY[i] * 0.12, k === 1 ? 0.22 : 0.3, R_EL);
      if (k === 1 && pjAge[i] >= pjT[i]) {                                           // 普通命中
        pjOn[i] = 0; const x = pjX[i], y = pjY[i];
        burst(x, y, 14, 30, 90, 0.15, 0.4, R_EL, 10); ring(x, y + 2, 0, R_EL); for (let n = 0; n < 5; n++) spawnX(K_PHYS, x, y + 2, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, 0.6, FXI.earth, { g: 260, floor: HY });
        hitDummy(0); sfx('hit', { mat: 'stone', w: 0.7 });
      }
      if (k === 2 && pjY[i] < -8) pjOn[i] = 0;
      if (k === 3 && pjY[i] >= HY - 12) {                                            // 技能命中：大火焰冲击环 + 地裂 + 往两边推的火浪 + 余火
        pjOn[i] = 0; const x = pjX[i], y = HY - 12;
        burst(x, y, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(x, y + 4, 1, R_EL); fx.cross(x, y, 8, R_EL, 0.3);
        fx.crack(x, HY + 1, 14, 1, FXI.earth, 0.9); fx.crack(x - 1, HY + 1, 14, -1, FXI.earth, 0.9);
        fx.wave(x + 3, HY, 1, 16, 6, R_EL, 0.6, 2); fx.wave(x - 3, HY, -1, 22, 6, R_EL, 0.6, 2);
        for (let n = 0; n < 10; n++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 3, (Math.random() - 0.5) * 120, -50 - Math.random() * 70, 0.8, FXI.earth, { g: 300, floor: HY });
        hitDummy(1); dummyFx({ dur: 1.0, tint: 'fire' }); shake(0.12, 1); fireT = 0; sfx('impact', { pal: 'fire', w: 1.0 });
      }
      if (k === 4) {                                                                 // 晶簇：落地弹一下，往前滚几圈停下
        if (pjY[i] >= HY - 3 && pjVY[i] > 0) { pjY[i] = HY - 3; if (pjB[i] < 1) { pjVY[i] *= -0.35; pjVX[i] *= 0.8; pjB[i]++; } else { pjVY[i] = 0; pjG[i] = 0; pjVX[i] *= Math.pow(0.1, dt); } }
        if (pjAge[i] > 1.9) pjOn[i] = 0;
      }
    }
  }
  function fxReset() { pjOn.fill(0); chargeAcc = 0; soulAcc = 0; fireAcc = 0; lastGf = -1; fireT = 9; }
  function fxBack(f12) { if (P.dq < 1 && P.rs) floorGlow(wx(P.gx), P.rim, EL, f12); }
  const CRY = [[0, -2, 3], [-1, -1, 2], [0, -1, 4], [1, -1, 3], [-2, 0, 2], [-1, 0, 3], [0, 0, 4], [1, 0, 3], [2, 0, 2], [-1, 1, 2], [0, 1, 3], [1, 1, 2], [0, 2, 1]];
  const rot = (x, y, r) => (r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]);
  function fxFront(f12) {
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; const x = RD(pjX[i]), y = RD(pjY[i]), k = pjK[i];
      if (k === 1 || k === 2 || k === 3) {                                           // 火焰巨石：4×4 燃石 + 白热芯 + 火舌（落下时火舌朝上）
        for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { if ((dx === -1 || dx === 2) && (dy === -1 || dy === 2)) continue; put(x + dx, y + dy, dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1 ? (dx === 0 && dy === 0 ? EL[0] : EL[1]) : EL[2]); }
        const up = k === 3 ? -1 : 1; put(x, y - 2 * up + (up < 0 ? 1 : 0), (f12 & 1) ? EL[1] : EL[2]); put(x + 1, y - 3 * up + (up < 0 ? 1 : 0), EL[2]); put(x - 2, y + (f12 & 1), EL[3]);
      } else if (k === 4) {                                                          // 滚出的晶簇：按 90° 翻滚，0.8 s 内从亮紫暗到墨紫
        const r = pjVX[i] > 3 ? ((pjAge[i] * 10) | 0) & 3 : 0, dim = clamp01(pjAge[i] / 0.8), fade = clamp01((pjAge[i] - 1.3) / 0.5);
        const LV = dim < 0.35 ? [43, 24, 21, 42] : dim < 0.7 ? [42, 24, 43, 25] : [25, 42, 42, 52];   // 勾线外的四档：暗 / 基 / 亮 / 最暗
        for (const [dx, dy, t] of CRY) { const p = rot(dx, dy, r); if (fade > 0 && B8[((p[1] + 64) & 7) * 8 + ((p[0] + 64) & 7)] < fade) continue; put(x + p[0], y + p[1], t === 4 ? LV[2] : t === 3 ? LV[1] : t === 2 ? LV[0] : LV[3]); }
      }
    }
    if (P.cw === 3 && !P.nocw && P.dq < 1 && !P.lie) {                              // 晶簇亮到 3 档：十字紫芒
      const A = armPts(P.ai), c = toS(A.sx, A.sy + 5), gx = wx(c[0]), gy = wy(c[1]), L = 3 + (f12 & 1);
      for (let r = 4; r <= L + 1; r++) { const col = r === 4 ? R_VOID[0] : R_VOID[1]; put(gx + r, gy, col); put(gx - r, gy, col); }
    }
    if (P.gem >= 2 && P.sl === 0 && P.dq < 1) {                                     // 巨石蓄满的十字火芒
      const gx = wx(P.gx), gy = wy(P.gy), L = 4 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = r === 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '流浪投石机', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_FIRE, M_HOT, M_CW, M_CWG], HIT_POINT: [1, -22], EVENTS,
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'machine', how: 'topple', pal: 'fire', style: 'meteor', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
