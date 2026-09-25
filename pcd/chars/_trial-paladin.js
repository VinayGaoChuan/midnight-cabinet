// 圣骑士（试做，由 pcd/trials/paladin/paladin.html 转换）：平顶桶盔 + 白盔缨、身前红底金十字鸢盾、举在盔旁的单手战锤、身后红披风；
// 近战前冲过顶砸；技能「圣光审判」：天印 / 地印 → 锤砸地 → 天降光柱贯通天地。设定卡见 pcd/trials/paladin/design.md。
PCD.define('_trial-paladin', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, K_SPIRAL, K_BURST, K_EMBER, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, ring, shake, flash, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const fl = (x) => Math.floor(x + 1e-6);                        // 取整带容差（与 q12 / f12of 同口径）

  // ───── 颜色：原版色板 27–31 追加的 5 色（精确同色）+ 两个新特效色阶 ─────
  const C_STEEL_D = E.color('#3a4068'), C_STEEL = E.color('#7884aa'), C_STEEL_L = E.color('#c6cfe8');   // 板甲钢（暗 / 基 / 亮）
  const C_HOLY = E.color('#ffdc5e'), C_HOLY_D = E.color('#a0601c');                                      // 圣光金 · 暗金
  const R_HOLY = E.fxRamp('holyGold', [21, 5, C_HOLY, 14, C_HOLY_D]);                                    // 圣光：白 → 奶油 → 圣光金 → 金 → 暗金
  const R_STEEL = E.fxRamp('plateSteel', [21, C_STEEL_L, C_STEEL, C_STEEL_D, 8]);                         // 甲片碎屑：白 → 亮钢 → 钢 → 暗钢 → 石
  const R_EL = R_HOLY, EL = FXR[R_EL], R_IMPACT = FXI.impact, R_DUST = FXI.dust;

  // ───── 材质、缓冲、姿势 ─────
  const M_STEEL = defMat([0, C_STEEL_D, C_STEEL, C_STEEL_L], 1), M_CAPE = defMat('crimson', 2), M_TRIM = defMat('gold', 1), M_SHIELD = defMat('crimson', 1);
  const M_PLUME = defMat('white', 1), M_LEATHER = defMat('wood', 1), M_WOOD = defMat('wood', 1);
  const M_INK = defMat('ink', 1, 1), M_EYE = defMat([5, 5, 5, 5], 1, 1), M_RUNE = defMat([C_HOLY_D, 14, C_HOLY, 5], 1, 1), M_GLOW = defMat([C_HOLY, 5, 21, 21], 1, 1);
  const hero = new Sprite(74, 58, 37, 51);                      // 缓冲：脚底 = (37, 51)；左放得下被打飞插地的盾，右放得下前冲砸锤和前扑倒地，上放得下高举的锤
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(64) };
  HERO_RIM.skip[M_RUNE] = HERO_RIM.skip[M_GLOW] = HERO_RIM.skip[M_WOOD] = HERO_RIM.skip[M_EYE] = HERO_RIM.skip[M_INK] = 1;
  const HX = 64;                                                // 屏幕上的脚底位置（近战：前冲砸锤够得着 x = 98 的假人）
  const DUR = [1.6, 1.6, 0.75, 1.4, 0.5, 0.7, 0.8, 2.9, 1.0];
  // 姿势参数：hx,hy 持锤手；a 锤角（0 = 竖直向上，顺时针为正）；sx,sy 盾顶中心；bend 披风后扬；beard 盔缨尖摆；sway 披风下摆；up 行走经过帧抬哪条腿
  // drop/shX/shY/srot 盾被打飞（死亡）；hatX/hatY 倒地后锤向前弹一下
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, sx: 0, sy: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, step: 0, walk: 0, up: 0, flip: 0, mx: 0, drop: 0, shX: 0, shY: 0, srot: 0, k1: 0, k2: 0 };
  const K_IDLE = { hx: 7, hy: -18, a: 0.12, lean: 0, head: 0, back: 0, bend: 1, sx: 6, sy: -16 };
  const K_WIND = { hx: 0, hy: -24, a: -1.05, lean: -1, head: 0, back: 0, bend: 1, sx: 5, sy: -15 };      // 攻击预兆：锤举到肩后
  const K_SMASH = { hx: 9, hy: -14, a: 1.95, lean: 1, head: 1, back: 0, bend: 3, sx: 6, sy: -15 };      // 出手：过顶砸下
  const K_FOLLOW = { hx: 9, hy: -13, a: 2.1, lean: 1, head: 0, back: 0, bend: 2, sx: 6, sy: -15 };
  const K_CHARGE = { hx: 5, hy: -29, a: -0.05, lean: -1, head: -1, back: 0, bend: 2, sx: 5, sy: -15 };   // 蓄力：锤高举过头
  const K_SLAM = { hx: 8, hy: -11, a: 2.25, lean: 1, head: 1, back: 0, bend: 3, sx: 6, sy: -14 };       // 施放：锤砸进地面
  const K_HURT = { hx: 5, hy: -17, a: -0.3, lean: -1, head: -1, back: 0, bend: 0, sx: 4, sy: -16 };
  const K_KNEEL = { hx: 7, hy: -8, a: 1.35, lean: 1, head: 1, back: 0, bend: 1, sx: 5, sy: -11 };
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'back', 'bend', 'sx', 'sy'];
  const mixPose = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const HEAD_D = 10.75;                                         // 手到锤头中心的距离
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], HEFT = [2, 3, 1];   // HEFT：待机个性「掂锤」3 帧的抬手高度
  const WALK_STEP = [1, 0, -1, 0], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, -1, 0, 1], WALK_UP = [0, 2, 0, 1], WALK_DIST = 12;   // 行军：接触帧下沉 1 格，经过帧抬起正在迈的那条腿
  const HIT_POINT = [7, -12];                                   // 受击点：盾面中心（本地坐标）
  const T_FLICK = 2 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.step = 0; P.walk = 0; P.up = 0; P.flip = 0; P.mx = 0;
    P.drop = 0; P.shX = 0; P.shY = 0; P.srot = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = fl(TT * 2.5); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[fl(TT * 1.25) & 3];
      const ph = f12 % 30;                                      // 待机个性「掂锤」：每 2.5 s 把锤往上一掂（3 帧），落回时圣纹闪一下
      if (ph >= 14 && ph <= 16) { const u = HEFT[ph - 14]; P.hy -= u; P.a -= u * 0.07; }
      P.glint = ph === 17 || (fl(TT * 6) % 13) === 0 ? 1 : 0;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 行军：走出去半程，转身（镜像）走回来；步伐每秒 6 帧
      mixPose(K_IDLE, K_IDLE, 0); const f = gait(tq);
      P.walk = 1; P.step = WALK_STEP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f]; P.up = WALK_UP[f];
      P.a = K_IDLE.a + P.step * 0.1; P.hx = K_IDLE.hx + P.step * 0.6;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); mixPose(K_IDLE, K_WIND, q); P.crouch = q > 0.5 ? 1 : 0; P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { mixPose(K_SMASH, K_SMASH, 0); P.bx = 5; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); mixPose(K_SMASH, K_FOLLOW, q); P.bx = 5 - Math.round(q); P.gem = 1; P.beard = -1; P.sway = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); mixPose(K_FOLLOW, K_IDLE, q); P.bx = Math.round(4 * (1 - q)); P.beard = q < 0.5 ? -1 : 0; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q);
      P.beard = -Math.round(q * 2) + (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { mixPose(K_CHARGE, K_SLAM, ease.out(clamp01(tq / 0.12))); P.crouch = tq >= 1 / 12 ? 1 : 0; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_SLAM, K_IDLE, q); P.crouch = q < 0.25 ? 1 : 0; P.beard = -Math.round(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else {
        if (d >= 1 / 12) {                                      // 致命一击把盾打飞：翻滚一圈向后飞出，0.5 s 尖端朝下插进地里
          const q = clamp01((d - 1 / 12) / (0.5 - 1 / 12)); P.drop = 1; P.shX = Math.round(-30 * (1 - (1 - q) * (1 - q))); P.shY = Math.round(4 * q - 14 * Math.sin(q * Math.PI)); P.srot = q < 1 ? (1 + fl(q * 3.99)) & 3 : 0;
        }
        if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
        else if (d < 0.5) { mixPose(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.crouch = 4; P.eyes = 1; P.beard = 1; }
        else {                                                  // 前扑倒地：离地 3 → 1 → 0；落地后锤向前弹一下；圣纹闪烁后熄灭；自上而下消散
          mixPose(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
          const hq = clamp01((d - 0.66) / 0.25); P.hatX = Math.round(3 * hq); P.hatY = Math.round(Math.sin(hq * Math.PI) * 3);
          P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + (P.crouch < 3 ? P.crouch : 0);
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + yo; P.sx = Math.round(P.sx); P.sy = Math.round(P.sy) + yo; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    if (P.lying) { P.gx = 21 + P.hatX + P.bx; P.gy = -2 - P.hatY - P.lift; }
    else { P.gx = Math.round(P.hx + Math.sin(P.a) * HEAD_D) + P.bx; P.gy = Math.round(P.hy - Math.cos(P.a) * HEAD_D); }
    // 缓存键：任何一个取整后的参数变了才重画（两段都 < 2^53）
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.bend; k = k * 2 + P.bob;
    k = k * 8 + P.sx - 2; k = k * 16 + P.sy + 19; k = k * 4 + P.up; k = k * 2 + P.drop; k = k * 64 + P.shX + 32; k = k * 32 + P.shY + 16; k = k * 4 + P.srot; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 16 + P.bx + 8; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 2 + P.walk;
    k = k * 2 + P.lying; k = k * 4 + P.lift; k = k * 16 + P.hatX + 8; k = k * 8 + P.hatY; k = k * 128 + Math.round(P.dq * 48); P.k2 = k;
  }

  // ───── 部件 ─────
  const SH_W = [3, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1, 0], SH_BASE = [4, -16];   // 鸢盾每行半宽（平顶、上宽、下收成尖）；被打飞时的起点（受击姿的盾位）
  function drawShield(cx, top, rot, clipY) {                    // 钢边框 + 红底 + 金十字 + 铆钉；rot = 转 90° 的次数（翻滚用，整 90° 不毁像素）；clipY 以下不画（插进地里）
    const n = SH_W.length, cy = top + 6;
    for (let r = 0; r < n; r++) {
      const w = SH_W[r];
      for (let x = -w; x <= w; x++) {
        const rim = r === 0 || r === n - 1 || Math.abs(x) === w || Math.abs(x) > SH_W[r + 1];
        const cross = !rim && ((x === 0 && r >= 1 && r <= 10) || (r === 4 && Math.abs(x) <= 3));
        const rivet = rim && ((r === 2 && Math.abs(x) === 4) || (r === 8 && Math.abs(x) === 3));
        const u = x, v = r - 6; let X = u, Y = v;
        if (rot === 1) { X = -v; Y = u; } else if (rot === 2) { X = -u; Y = -v; } else if (rot === 3) { X = v; Y = -u; }
        if (cy + Y > clipY) continue;
        sp(cx + X, cy + Y, rim ? M_STEEL : cross ? M_TRIM : M_SHIELD, rivet ? 4 : 0);
      }
    }
  }
  function drawHammer(X, Y, a) {                                // 战锤：柄头金珠 → 缠绕握把 → 木柄 → 金箍 → 钢锤头 + 顶尖 + 圣纹（发光体，与锤头同一部件，不压分界线）
    const dx = Math.sin(a), dy = -Math.cos(a), px = -dy, py = dx;
    part();
    line(X - dx * 3, Y - dy * 3, X + dx * 8, Y + dy * 8, M_WOOD, 3, 0);
    sp(X - dx * 2, Y - dy * 2, M_WOOD, 4); sp(X - dx * 3, Y - dy * 3, M_WOOD, 2);
    sp(X - dx * 4, Y - dy * 4, M_TRIM, 4);
    for (let u = -1; u <= 1; u++) sp(X + dx * 8.6 + px * u, Y + dy * 8.6 + py * u, M_TRIM, 0);
    part();
    const g = P.gem, cx = X + dx * HEAD_D, cy = Y + dy * HEAD_D;
    for (let v = 9.2; v <= 12.4; v += 0.4) for (let u = -2.2; u <= 2.21; u += 0.44) sp(X + dx * v + px * u, Y + dy * v + py * u, g === 3 ? M_RUNE : M_STEEL, g === 3 ? 3 : 0);
    sp(X + dx * 13.5, Y + dy * 13.5, g === 3 ? M_RUNE : M_STEEL, g === 3 ? 3 : 0);
    if (g === 3) { for (let v = 9.8; v <= 11.8; v += 0.4) for (let u = -1.2; u <= 1.21; u += 0.4) sp(X + dx * v + px * u, Y + dy * v + py * u, M_GLOW, 2); sp(cx, cy, M_GLOW, 3); sp(cx + px, cy + py, M_GLOW, 3); sp(cx - px, cy - py, M_GLOW, 3); }
    else if (g === 2) { sp(cx, cy, M_GLOW, 3); sp(cx + px, cy + py, M_GLOW, 2); sp(cx - px, cy - py, M_GLOW, 2); sp(cx + dx, cy + dy, M_RUNE, 3); sp(cx - dx, cy - dy, M_RUNE, 3); }
    else if (g === 1) { sp(cx, cy, M_RUNE, 4); sp(cx + px, cy + py, M_RUNE, 3); sp(cx - px, cy - py, M_RUNE, 3); }
    else sp(cx, cy, M_RUNE, g === 4 ? 1 : 2);
    if (P.glint) sp(X + dx * 12.4 - px * 2, Y + dy * 12.4 - py * 2, M_GLOW, 3);
  }
  function drawHelm(ox, oy, rot) {                              // 平顶桶盔：眉檐受光、金色竖条面饰 + 面罩横缝成十字、1 格眼光、透气孔；rot = 1 时顺时针转 90°（前扑倒地：脸朝下、盔顶朝右）
    const H = rot ? (dx, dy, m, t) => sp(ox - dy, oy + dx, m, t) : (dx, dy, m, t) => sp(ox + dx, oy + dy, m, t);
    part();
    for (let x = -2; x <= 2; x++) H(x, -6, M_STEEL, 0);
    for (let y = -5; y <= -1; y++) for (let x = -3; x <= 3; x++) H(x, y, M_STEEL, 0);
    for (let x = -2; x <= 3; x++) H(x, 0, M_STEEL, 0);
    for (let x = -3; x <= 3; x++) H(x, -5, M_TRIM, x === -3 ? 4 : 0);   // 金盔箍
    for (let x = 0; x <= 3; x++) H(x, -4, M_STEEL, 4);           // 眉檐受光
    for (let x = 0; x <= 3; x++) H(x, -3, M_INK, 1);             // 面罩横缝
    if (!P.eyes) H(2, -3, M_EYE, 3);                             // 1 格眼光
    for (let y = -2; y <= 0; y++) H(2, y, M_TRIM, 0);            // 金色竖条面饰（和横缝成 T 形十字）
    H(3, -1, M_INK, 1); H(0, -1, M_STEEL, 2);                    // 透气孔 + 颊缝
  }
  function drawPlume(hx, hy) {                                  // 白盔缨：盔顶拱起 3 格成冠、向后披到肩，逐行收窄，尖端会摆，暗色发丝
    part();
    const b = P.beard, h = (k) => Math.round(b * k);
    run(hy - 9, hx - 1, hx + 1, M_PLUME, 0);
    run(hy - 8, hx - 3, hx + 2, M_PLUME, 0);
    run(hy - 7, hx - 5, hx + 1, M_PLUME, 0);
    run(hy - 6, hx - 7, hx - 3, M_PLUME, 0);
    run(hy - 5, hx - 8 + h(0.3), hx - 5, M_PLUME, 0);
    run(hy - 4, hx - 8 + h(0.6), hx - 6 + h(0.3), M_PLUME, 0);
    run(hy - 3, hx - 8 + h(0.8), hx - 7 + h(0.6), M_PLUME, 0);
    sp(hx - 8 + b, hy - 2, M_PLUME, 0);
    sp(hx - 1, hy - 8, M_PLUME, 2); sp(hx - 3, hy - 7, M_PLUME, 2); sp(hx - 5, hy - 6, M_PLUME, 2); sp(hx - 7 + h(0.3), hy - 5, M_PLUME, 2); sp(hx, hy - 9, M_PLUME, 4);
  }
  function drawCape(lean, yT, bot) {                            // 红披风：肩后垂下、向后飘；两道褶；波浪下摆 + 金边；后下角是会摆的尖角
    part();
    const top = yT - 2, n = bot - top; let Lb = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, s = P.sway * t * t, f = P.bend * t * t, l = lean * (1 - t);
      const L = Math.round(-4 + l - 6.5 * Math.pow(t, 1.1) + s - f * 0.9), R = Math.round(1 + l);
      run(y, L, R, M_CAPE, 0);
      if (t > 0.3 && y < bot) { sp(L + 2 + Math.round(t), y, M_CAPE, 2); if (t > 0.55) sp(L + 5, y, M_CAPE, 2); }
      if (y === bot) { for (let x = L; x <= R; x++) sp(x, y, ((x - P.sway) & 3) === 2 ? 0 : M_TRIM, 0); Lb = L; }
    }
    sp(Lb - 1, bot - (P.bend >= 2 ? 1 : 0), M_CAPE, 0); sp(Lb - 1, bot + (P.bend >= 2 ? 0 : 1), M_TRIM, 0);
  }
  function drawLegs(yH, kneel) {                                // 腿：胫甲 + 膝甲外凸 1 格 + 铁靴（前脚尖多 1 格）；行走时前后脚错开、经过帧抬腿；跪姿单独画
    if (kneel) {
      part(); rect(-8, -1, 6, 2, M_STEEL, 0); sp(-9, 0, M_STEEL, 0);                    // 后腿：膝盖着地，小腿平放
      part(); run(yH + 1, 0, 4, M_STEEL, 0); rect(3, yH + 1, 2, -1 - yH, M_STEEL, 0); rect(2, -1, 4, 2, M_STEEL, 0); sp(6, 0, M_STEEL, 0); sp(5, yH + 1, M_STEEL, 0);   // 前腿：大腿前伸、膝甲、小腿竖直
      return;
    }
    const st = P.step * 3;
    for (let leg = 0; leg < 2; leg++) {
      part();
      const hip = leg ? 1 : -3, foot = hip + (leg ? st : -st), up = P.up === (leg ? 1 : 2) ? 1 : 0, y1 = -2 - up, span = Math.max(1, y1 - yH - 1);
      for (let y = yH + 1; y <= y1; y++) { const c = Math.round(hip + (foot - hip) * (y - yH - 1) / span); run(y, c - 1, c + 1, M_STEEL, 0); }
      const kc = Math.round(hip + (foot - hip) / span); sp(kc + 2, yH + 2, M_STEEL, 0);
      rect(foot - (leg ? 1 : 2), -1 - up, 4, 2, M_STEEL, 0); if (leg) sp(foot + 3, -up, M_STEEL, 0);
    }
  }
  function drawTorso(lean, yT, yW, yH) {                        // 腿甲裙（两片 + 铆钉，下沿外扩）→ 皮腰带 + 金扣 → 胸甲（中脊高光 + 胸腹分界）→ 护颈
    part();
    for (let y = yW + 1; y <= yH; y++) { const k = y - yW; run(y, -4 - (k >= 3 ? 1 : 0), 4 + (k >= 2 ? 1 : 0), M_STEEL, 0); sp(0, y, M_STEEL, 2); }
    sp(-2, yW + 2, M_STEEL, 4); sp(2, yW + 2, M_STEEL, 4);
    run(yW, -4, 4, M_LEATHER, 0); sp(1, yW, M_TRIM, 4); sp(2, yW, M_TRIM, 3);
    for (let y = yT; y < yW; y++) { const l = Math.round(lean * (1 - (y - yT) / 7)), e = y === yT ? 1 : 0; run(y, -4 + e + l, 4 - e + l, M_STEEL, 0); }
    run(yT + 5, -4, 4, M_STEEL, 2);
    for (let y = yT + 1; y <= yT + 4; y++) sp(1 + Math.round(lean * (1 - (y - yT) / 7)), y, M_STEEL, 4);
    run(yT - 1, -2 + lean, 1 + lean, M_STEEL, 2);
  }
  function drawNearArm(lean, yT) {                              // 前臂（持盾，大多藏在盾后；盾被打飞后空手下垂）→ 前肩甲（两层甲片 + 金边）
    const nx = 1 + lean;
    part();
    if (P.drop) { for (let s = 0; s <= 1.001; s += 0.2) brush(nx + 2 * s, yT + 2 + 6 * s, 1, M_STEEL, 0); part(); rect(nx + 1, yT + 8, 2, 2, M_STEEL, 0); }
    else for (let s = 0; s <= 1.001; s += 0.2) brush(nx + (P.sx - 1 - nx) * s, yT + 2 + (P.sy + 5 - yT - 2) * s, 1, M_STEEL, 0);
    part();                                                     // 圆顶肩甲：上窄下宽，下沿一圈金边
    run(yT - 1, nx, nx + 2, M_STEEL, 0); run(yT, nx - 1, nx + 3, M_STEEL, 0); run(yT + 1, nx - 1, nx + 4, M_STEEL, 0); run(yT + 2, nx - 1, nx + 4, M_TRIM, 0);
  }
  // 站姿：部件从后往前（披风 → 后臂 → 腿 → 身体 → 头盔 → 盔缨 → 锤 → 铁手套 → 前臂 / 肩甲 → 盾）
  function drawStanding() {
    const lean = P.lean, kneel = P.crouch >= 3, yT = -18 + P.bob + P.crouch, yW = yT + 7, yH = yW + 3, hx = lean + P.head, hy = yT - 2;
    drawCape(lean, yT, kneel ? -1 : -3);
    part();                                                     // 后臂（持锤，远侧）：臂甲从肩伸向锤柄，大多藏在身后；远侧肩甲从左肩露出
    const bsx = -2 + lean, bsy = yT + 1;
    for (let s = 0; s <= 1.001; s += 0.1) brush(bsx + (P.hx - bsx) * s, bsy + (P.hy - bsy) * s, 1, M_STEEL, 0);
    brush(bsx - 3, bsy, 1.5, M_STEEL, 0);
    drawLegs(yH, kneel);
    drawTorso(lean, yT, yW, yH);
    drawHelm(hx, hy, 0);
    drawPlume(hx, hy);
    drawHammer(P.hx, P.hy, P.a);
    part(); rect(P.hx - 1, P.hy - 1, 2, 2, M_STEEL, 0); sp(P.hx - 1, P.hy - 1, M_STEEL, 4);   // 铁手套盖住握把
    const cu = Math.hypot(P.hx - bsx, P.hy - bsy) || 1; sp(P.hx - 1 - Math.round((P.hx - bsx) / cu * 1.2), P.hy - Math.round((P.hy - bsy) / cu * 1.2), M_TRIM, 0);   // 金护腕
    drawNearArm(lean, yT);
    part(); if (P.drop) drawShield(SH_BASE[0] + P.shX, SH_BASE[1] + P.shY, P.srot, 0); else drawShield(P.sx, P.sy, 0, 0);
  }
  // 倒地姿：前扑（脸朝下、头在右），红披风盖在背上，手伸向滑出去的锤，盾插在身后的地里
  function drawLying() {
    drawHammer(10 + P.hatX, -1.5 - P.hatY, 1.5);
    part();                                                     // 远侧腿
    run(-4, -13, -4, M_STEEL, 0); run(-3, -13, -4, M_STEEL, 0); rect(-15, -5, 2, 4, M_STEEL, 0);
    part();                                                     // 近侧腿：膝甲、铁靴脚尖朝下插地
    run(-3, -14, -4, M_STEEL, 0); run(-2, -14, -4, M_STEEL, 0); run(-1, -13, -4, M_STEEL, 0); sp(-9, -1, M_STEEL, 4); rect(-17, -4, 3, 3, M_STEEL, 0); sp(-17, -1, M_STEEL, 0); sp(-16, 0, M_STEEL, 0);
    part();                                                     // 腿甲裙 + 胸甲（背朝上）
    rect(-6, -5, 3, 5, M_STEEL, 0); sp(-5, -3, M_STEEL, 2); rect(-3, -6, 9, 6, M_STEEL, 0); run(-7, -1, 4, M_STEEL, 0);
    part();                                                     // 红披风盖在背上，下摆金边在大腿处，靠近我们的一侧垂下来
    for (let x = -10; x <= 5; x++) { const yb = -3 + ((x & 3) === 1 ? 1 : 0) - (x > 3 ? 1 : 0); for (let y = x > 3 ? -8 : -7; y <= yb; y++) sp(x, y, x === -10 ? M_TRIM : M_CAPE, 0); }
    sp(-11, -6, M_TRIM, 0); sp(-11, -5, M_TRIM, 0); sp(-4, -5, M_CAPE, 2); sp(-3, -4, M_CAPE, 2); sp(1, -5, M_CAPE, 2);
    part();                                                     // 前肩甲从披风下露出
    rect(4, -7, 3, 4, M_STEEL, 0); for (let y = -7; y <= -4; y++) sp(4, y, M_TRIM, 0);
    drawHelm(8, -4, 1);
    part();                                                     // 盔缨垂在盔背和肩上
    run(-9, 7, 13, M_PLUME, 0); run(-10, 8, 12, M_PLUME, 0); sp(6, -8, M_PLUME, 0); sp(5, -8, M_PLUME, 0); sp(5, -7, M_PLUME, 0); sp(10, -9, M_PLUME, 2); sp(8, -9, M_PLUME, 2);
    part();                                                     // 近侧手臂伸向锤
    for (let s = 0; s <= 1.001; s += 0.2) brush(6 + 7 * s, -2 + 0.5 * s, 1, M_STEEL, 0);
    part(); rect(13, -3, 2, 2, M_STEEL, 0);
    part(); drawShield(SH_BASE[0] - 30, SH_BASE[1] + 4 + P.lift, 0, P.lift);   // 盾（已插进地里，抵消落地前的离地高度，保持不动）
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() { HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq; bake(hero, HERO_RIM); }

  // ───── 特效 ─────
  // 圣光审判：天印（目标头顶的点阵椭圆）+ 地印（目标脚下）+ 预兆光束 → 光柱（plT 从光柱落下算起：第 0 帧落到半空，第 1 帧贯通，之后变暗变细、从上往下断开）
  const T_HAMMER = 1 / 12, T_STRIKE = 2 / 12, SKY_Y = 8, PL_LIFE = 15 / 12, PL_TOP = [0, 0, 4, 8, 12, 18, 24, 30, 36, 44, 52, 58, 64, 70], SW_R = 12.4;
  let plT = 9, swT = 9, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, moteAcc = 0, lastStep = 0;
  // 蓄力汇聚粒子的影子记录。引擎的 releaseOrbit 只会径向外爆，圣光审判要把环绕锤头的圣光「送上天」射进天印，
  // 所以按引擎同样的算法（Float32、同样的步序）逐步记下每颗的位置；施放时清掉引擎里的那批，在同一位置重发成射向天印的粒子。
  const f32 = Math.fround, orb = [];
  function orbSpawn(gx, gy, vr, a, r, w) { const i = spawn(K_SPIRAL, gx, gy, vr, 0, 9, R_HOLY, a, r, w); orb.push({ i, a: f32(a), r: f32(r), vr: f32(vr), w: f32(w), orbit: 0, x: f32(gx), y: f32(gy) }); }
  function orbStep(dt, gx, gy) {
    for (const o of orb) {
      if (!o.orbit) { o.a = f32(o.a + o.w * dt); o.r = f32(o.r - o.vr * dt); if (o.r <= 3.5) { o.orbit = 1; o.r = f32(3 + (o.i % 3)); } }
      else o.a = f32(o.a + 8.5 * dt);
      o.x = f32(gx + Math.cos(o.a) * o.r); o.y = f32(gy + Math.sin(o.a) * o.r * 0.75);
    }
  }
  function onEnter(s) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (s === CAST) {                                           // 第 0 帧：环绕锤头的圣光射向天印（“送上天”）；光柱第 1 帧从天印落下、第 2 帧贯通
      releaseOrbit(0, 0, 0, 0);                                 // 引擎里的汇聚粒子寿命置 0，这一步就清掉
      for (const o of orb) { const tx = DUMMY_X + (Math.random() - 0.5) * 12, ty = SKY_Y + (Math.random() - 0.5) * 4; spawn(K_BURST, o.x, o.y, (tx - o.x) * 8.5, (ty - o.y) * 8.5, 0.12 + Math.random() * 0.06, R_HOLY); }
      orb.length = 0;
      burst(gx, gy, 8, 30, 60, 0.2, 0.35, R_HOLY, 10); plT = -T_HAMMER;
    }
  }
  function onTime(s, t) {
    const gx = scrX(P.gx);
    if (s === ATTACK && t === T_FLICK) {                        // 砸中那一帧：锤击拖影、命中十字星芒、impact + 圣光火花；假人闪白 + 小摇（攻击不震屏）
      swT = 0; mzT = 0; mzX = gx + 2; mzY = HY + P.gy;
      burst(mzX, mzY, 12, 40, 110, 0.15, 0.35, R_IMPACT, 16); burst(mzX, mzY, 6, 30, 70, 0.2, 0.4, R_HOLY, 10); hitDummy(0);
    }
    if (s === CAST && t === T_HAMMER) {                         // 锤砸进地面：小冲击环 + 尘土
      ring(gx, HY - 1, 0, R_HOLY); for (let i = 0; i < 8; i++) spawn(K_DUST, gx - 3 + Math.random() * 6, HY - 1, (Math.random() - 0.5) * 40, -10 - Math.random() * 14, 0.35 + Math.random() * 0.3, R_DUST);
    }
    if (s === CAST && t === T_STRIKE) {                         // 光柱贯通的爆发帧：天空闪白 + 震屏 2 格；目标处 36 颗外爆 + 大环 + 地面火花；假人大摇 + 击退
      const X = DUMMY_X; shake(0.28, 2); flash(0.05);
      ring(X, HY - 14, 1, R_HOLY); burst(X, HY - 14, 36, 60, 150, 0.3, 0.7, R_HOLY, 16); burst(X, FLOOR - 1, 12, 60, 120, 0.2, 0.45, R_HOLY, 40); hitDummy(1);
    }
    if (s === DEATH && t === INCOMING + 0.5) { const x = HX - 2 + SH_BASE[0] - 30; for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, R_DUST); }   // 盾插地
    if (s === DEATH && t === INCOMING + 0.66) {                 // 前扑落地：尘土 16 颗 + 甲片碎屑（钢色阶）+ 震屏 1 格
      for (let i = 0; i < 16; i++) { const x = HX - 19 + Math.random() * 32; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); }
      burst(HX, HY - 5, 8, 30, 70, 0.4, 0.7, R_STEEL, 40); shake(0.1, 1);
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [T_HAMMER, T_STRIKE], [], [], [INCOMING + 0.5, INCOMING + 0.66], []];
  function hurtFx(s) {                                          // 敌弹打在盾上（金属）：impact 更多、更快，外加 3 颗长寿命白火星（换掉引擎默认的受击火花）
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 30 : 24, 70, 170, 0.2, 0.5, R_IMPACT, 24);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 30 + Math.random() * 70, -40 - Math.random() * 50, 1 + Math.random() * 0.4, R_IMPACT);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04);
    return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (26 + 34 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; orbSpawn(gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), a, r, 4 + Math.random() * 3); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(P.step > 0 ? 4 : 0) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, R_DUST); lastStep = P.step; }   // 重装：每次落脚 4 颗尘土
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2.2 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_HOLY); } }
    if (plT > T_HAMMER && plT < PL_LIFE - 0.2) { moteAcc += dt * (plT < 0.5 ? 36 : 16); while (moteAcc >= 1) { moteAcc -= 1; spawn(K_RISE, DUMMY_X - 2 + Math.random() * 4, FLOOR - 2 - Math.random() * 24, (Math.random() - 0.5) * 8, -18 - Math.random() * 26, 0.4 + Math.random() * 0.4, R_HOLY); } }   // 光柱里上升的光点
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 19 + Math.random() * 32, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_HOLY); } }   // 魂光（圣光色阶）
    orbStep(dt, gx, gy);
    mzT += dt; plT += dt; swT += dt;
  }
  function fxReset() { plT = 9; swT = 9; mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; moteAcc = 0; lastStep = 0; orb.length = 0; }
  function sigil(cx, cy, rx, ry, n, lit, c1, c2, f12, dotted) {  // 点阵椭圆：按角度从正上方顺时针逐点亮起，一段亮点绕圈流动；全亮时印心出十字
    const m = Math.round(n * lit);
    for (let i = 0; i < m; i++) { if (dotted && ((i + f12) & 1)) continue; const a = -1.5708 + i / n * 6.2832; put(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), (((i - f12) % n) + n) % n < 3 ? c2 : c1); }
    if (lit >= 1 && !dotted) { put(cx, cy, c2); put(cx - 1, cy, c1); put(cx + 1, cy, c1); put(cx, cy - 1, c1); put(cx, cy + 1, c1); }
  }
  function drawPillar(X, pf, f12) {
    if (pf < 0) return;
    if (pf === 0) {                                              // 第 0 帧：光柱从天顶落到半空，落点是一个更亮更宽的头
      const yb = 38; for (let y = 0; y <= yb; y++) { put(X, y, EL[0]); put(X - 1, y, EL[1]); put(X + 1, y, EL[1]); }
      for (let y = yb - 1; y <= yb + 2; y++) { put(X - 1, y, EL[0]); put(X + 1, y, EL[0]); put(X - 2, y, EL[1]); put(X + 2, y, EL[1]); }
      put(X, yb + 3, EL[0]); return;
    }
    const k = pf - 1, bot = FLOOR - 1, top = k < PL_TOP.length ? PL_TOP[k] : 99;
    for (let y = top; y <= bot; y++) {
      const gap = (y + f12 * 3) % 5;
      if (k === 0) { put(X, y, EL[0]); put(X - 1, y, EL[0]); put(X + 1, y, EL[0]); put(X - 2, y, EL[1]); put(X + 2, y, EL[1]); if ((y & 1) === 0) { put(X - 3, y, EL[2]); put(X + 3, y, EL[2]); } }
      else if (k === 1) { put(X, y, EL[0]); put(X - 1, y, EL[1]); put(X + 1, y, EL[1]); if (gap) { put(X - 2, y, EL[2]); put(X + 2, y, EL[2]); } }
      else if (k <= 4) { put(X, y, EL[1]); if (gap) { put(X - 1, y, EL[2]); put(X + 1, y, EL[2]); } }
      else if (k <= 7) { if (gap) put(X, y, EL[2]); if (gap > 2) { put(X - 1, y, EL[3]); put(X + 1, y, EL[3]); } }
      else if (k <= 10) { if (gap > 1) put(X, y, EL[3]); }
      else if (gap > 2) put(X, y, EL[4]);
    }
    if (k <= 2) { const c = EL[k]; for (let d = 3; d <= 8 - k; d++) { put(X - d, bot, c); put(X + d, bot, c); } }   // 落点两侧的地面光带
  }
  function drawSwing(first) {                                   // 锤击拖影：沿锤头轨迹（后举 → 砸下，约 150°）；第 1 帧 2 格宽白 + 奶油，第 2 帧 1 格宽圣光金且断续
    for (let i = 18; i <= 64; i++) {
      if (!first && ((i >> 2) & 1)) continue;
      const q = i / 64, a = K_WIND.a + (K_SMASH.a - K_WIND.a) * q, hx = K_WIND.hx + (K_SMASH.hx - K_WIND.hx) * q + 5 * q, hy = K_WIND.hy + (K_SMASH.hy - K_WIND.hy) * q, dx = Math.sin(a), dy = -Math.cos(a);
      put(Math.round(scrX(hx + dx * SW_R)), Math.round(HY + hy + dy * SW_R), first ? EL[0] : EL[2]);
      if (first) put(Math.round(scrX(hx + dx * (SW_R - 1))), Math.round(HY + hy + dy * (SW_R - 1)), q > 0.4 ? EL[1] : EL[2]);
    }
  }
  // 画面层：layer 0 = 地面（假人 / 角色之前）：地印；layer 1 = 空中和盖在角色上的：天印、预兆光束、光柱、锤击拖影
  function fxLayer(layer, f12) {
    const state = E.state, stT = E.stT, X = DUMMY_X, pf = f12of(plT);
    let lit = 0, c1 = 0, c2 = 0, dotted = 0;
    if (state === CHARGE && stT > 0.35) { lit = clamp01((stT - 0.35) / 0.7); c1 = EL[2]; c2 = EL[1]; }
    else if (plT < PL_LIFE) { lit = 1; const k = pf <= 0 ? -1 : pf === 1 ? 0 : Math.min(4, 1 + fl((pf - 2) / 3)); c1 = k < 0 ? EL[2] : EL[k]; c2 = k < 0 ? EL[1] : EL[Math.max(0, k - 1)]; dotted = pf >= 10 ? 1 : 0; }
    if (layer === 0) { if (lit) sigil(X, FLOOR + 1, 11, 1.6, 26, lit, c1 === EL[2] && state === CHARGE ? EL[3] : c1, c2, f12, dotted); return; }   // 地印
    if (lit) sigil(X, SKY_Y, 8, 2.2, 20, lit, c1, c2, f12, dotted);   // 天印
    if (state === CHARGE && stT > 0.9) { const dense = stT > 1.2; for (let y = SKY_Y + 3; y < FLOOR - 1; y++) if (((y - f12 * 2) & (dense ? 1 : 3)) === 0) put(X, y, dense ? EL[2] : EL[3]); }   // 预兆：天印到地印的虚线光束，向下流动
    if (plT < PL_LIFE) drawPillar(X, pf, f12);
    if (swT < 2 / 12) drawSwing(swT < 1 / 12);
  }
  function fxBack(f12) { if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); fxLayer(0, f12); }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } if (P.gem === 3) { put(gx + 2, gy + 2, EL[1]); put(gx - 2, gy - 2, EL[1]); put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy + 2, EL[1]); } }
    fxLayer(1, f12);
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }   // 锤击命中的十字星芒
  }

  const SHEET = [[IDLE, [0, 0.4, 0.8, 1.2]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'], [DEATH, [0.3, 0.42, 0.6, 0.7, 0.9, 1.1, 1.3, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]];
  return {
    name: '圣骑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_RUNE, M_GLOW], HIT_POINT, EVENTS, SHEET,
    poseAt, drawHero, bakeHero, onEnter, onTime, hurtFx, stepFX, fxReset, fxBack, fxFront,
  };
});
