// 影刃刺客（试做，由 pcd/trials/assassin/assassin.html 转换）：鸟喙前檐的圆兜帽 + 两条后飘的深红围巾尾 + 前正握 / 后反握的双匕首，长腿低重心；
// 近战前冲双刃交错；技能「影袭」：化影 → 瞬移到假人身后连斩 → 十字斩 → 回影。设定卡见 pcd/trials/assassin/design.md。
PCD.define('_trial-assassin', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, line, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, H, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, K_SPIRAL, K_ORBIT, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, ring, shake, flash, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const fl = (x) => Math.floor(x + 1e-6);                        // 取整带容差（与 q12 / f12of 同口径）

  // ───── 颜色：原版色板 27–30 追加的暗影 4 色（精确同色）+ 暗影色阶 ─────
  const C_SH1 = E.color('#e9c8ff'), C_SH2 = E.color('#b064ec'), C_SH3 = E.color('#6a2aa6'), C_SH4 = E.color('#2a0f45');   // 淡紫 · 紫 · 深紫 · 墨紫
  const R_SHADOW = E.fxRamp('umbra', [21, C_SH1, C_SH2, C_SH3, C_SH4]);   // 暗影：白 → 淡紫 → 紫 → 深紫 → 墨紫（共享色板的 shadow 是另一组偏灰的暗紫）
  const R_EL = R_SHADOW, EL = FXR[R_EL], R_IMPACT = FXI.impact, R_DUST = FXI.dust, R_SOUL = FXI.soul;

  // ───── 材质、缓冲、姿势 ─────
  const M_CLOTH = defMat([0, 9, 10, 18], 2), M_HOOD = defMat('stone', 1), M_MASK = defMat('stone', 1), M_PANTS = defMat('stone', 1), M_SCARF = defMat('crimson', 1);
  const M_LEATHER = defMat('wood', 1), M_SKIN = defMat('skin', 1), M_STEEL = defMat([0, 10, 18, 17], 1);
  const M_INK = defMat('ink', 1, 1), M_EDGE = defMat([C_SH4, C_SH2, C_SH1, 21], 1, 1);   // 刃光（发光体）：tone 1 墨紫 · 2 紫 · 3 淡紫 · 4 白
  const hero = new Sprite(68, 54, 34, 49);                      // 缓冲：脚底 = (34, 49)；放得下前扑倒地 + 弹飞的匕首 + 双刃举过头顶
  const ghost = new Sprite(68, 54, 34, 49);                     // 化影残像：瞬移时留在原地的暗色剪影（只用 out）
  const HERO_RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(64) };
  HERO_RIM.skip[M_STEEL] = HERO_RIM.skip[M_EDGE] = 1;           // 细刃不吃轮廓光
  const HX = 34, TX_BEHIND = 78;                                 // 脚底位置；影袭瞬移到假人身后：HX + 78 = 112，转身（镜像）朝左
  const DUR = [1.6, 1.6, 0.75, 1.4, 0.5, 0.7, 0.8, 2.9, 1.0];
  // 姿势参数：hx/hy/a = 前手与前手刃，bhx/bhy/ba = 后手与后手刃；shade = 化影（整具身体换成暗影剪影）；walk = 腿的站位（0 普通，1–4 步态帧；攻击 / 施放的弓步借用 1）
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, step: 0, walk: 0, flip: 0, mx: 0, shade: 0, k1: 0, k2: 0 };
  const SH_Y = -16, HIP_Y = -9;                                   // 肩线、胯线（crouch = 0 时）；瘦长体型：窄肩、腿长 5 格外露
  const K_IDLE   = { hx: 6,  hy: -10, a: 1.25,  bhx: -6, bhy: -9,  ba: -2.5, lean: 0,  head: 0,  back: 0, bend: 1 };   // 前手刃平指前方，后手反握刃尖朝后下
  const K_SNEAK  = { hx: 7,  hy: -9,  a: 1.55,  bhx: -5, bhy: -10, ba: -1.9, lean: 1,  head: 1,  back: 0, bend: 2 };   // 潜行：弓身前倾
  const K_WIND   = { hx: 3,  hy: -14, a: -0.25, bhx: -2, bhy: -8,  ba: 2.6,  lean: -1, head: 0,  back: 0, bend: 1 };   // 攻击预兆：前手刃举到肩后，后手刃压低
  const K_STRIKE = { hx: 10, hy: -11, a: 2.1,   bhx: 8,  bhy: -14, ba: 1.0,  lean: 1,  head: 1,  back: 0, bend: 2 };   // 出手：前刃劈下、后刃撩上，在身前交叉
  const K_HOLD   = { hx: 9,  hy: -10, a: 2.3,   bhx: 7,  bhy: -13, ba: 1.2,  lean: 1,  head: 0,  back: 0, bend: 2 };
  const K_CHARGE = { hx: 7,  hy: -7,  a: 2.0,   bhx: -6, bhy: -13, ba: -1.2, lean: 1,  head: 1,  back: 0, bend: 2 };   // 化影：伏低，前刃尖指地，后刃扬在身后
  const K_APPEAR = { hx: 5,  hy: -12, a: 0.3,   bhx: 4,  bhy: -10, ba: 1.0,  lean: 1,  head: 1,  back: 0, bend: 2 };   // 身后显形
  const K_SLASH1 = { hx: 10, hy: -9,  a: 2.4,   bhx: -5, bhy: -14, ba: -1.3, lean: 1,  head: 1,  back: 0, bend: 3 };   // 连斩一：前刃自上而下
  const K_SLASH2 = { hx: 2,  hy: -11, a: -2.0,  bhx: 9,  bhy: -16, ba: 0.8,  lean: 1,  head: 1,  back: 0, bend: 3 };   // 连斩二：后刃自下而上
  const K_CROSS  = { hx: 7,  hy: -20, a: -0.8,  bhx: 2,  bhy: -23, ba: 0.7,  lean: 0,  head: -1, back: 0, bend: 1 };   // 十字斩预备：双刃交叉举过头顶
  const K_FINISH = { hx: 10, hy: -8,  a: 2.6,   bhx: -7, bhy: -9,  ba: -2.5, lean: 1,  head: 1,  back: 0, bend: 3 };   // 十字斩：双刃向前后两侧斩开
  const K_HURT   = { hx: 3,  hy: -12, a: 0.5,   bhx: -6, bhy: -13, ba: -1.0, lean: -1, head: -1, back: 0, bend: 3 };
  const K_KNEEL  = { hx: 6,  hy: -8,  a: 2.9,   bhx: -3, bhy: -9,  ba: -2.9, lean: 1,  head: 1,  back: 0, bend: 3 };   // 跪倒：双刃下垂，刃尖点地
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'ba', 'lean', 'head', 'back', 'bend'];
  const mixPose = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, -1, 0, 1], WALK_DIST = 14;   // 行走循环：接触 → 经过 → 接触 → 经过
  const HIT_POINT = [1, -12];
  const T_FLICK = 2 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), fr = Math.round(tq * 12), f12 = f12of(T), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.step = 0; P.walk = 0; P.flip = 0; P.mx = 0; P.shade = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = fl(TT * 2.5); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[fl(TT * 1.25) & 3]; P.glint = (fl(TT * 6) % 13) === 0 ? 1 : 0;
      const tw = f12 % 29; if (tw >= 13 && tw < 16) { P.a = K_IDLE.a + (tw - 12) * Math.PI / 2; P.glint = tw === 15 ? 1 : 0; }   // 待机个性：每 ~2.4 秒前手匕首在指间转一圈（3 帧）
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                     // 潜行小跑：弓身、大步、经过帧抬脚 2 格，围巾始终后飘；走出去半程，转身（镜像）走回来
      mixPose(K_SNEAK, K_SNEAK, 0); P.crouch = 1; const f = gait(tq);
      P.walk = f + 1; P.step = WALK_STEP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f] - 1;
      P.hx = K_SNEAK.hx + P.step; P.a = K_SNEAK.a + P.step * 0.1; P.bhx = K_SNEAK.bhx - P.step;
      const w = walkDemo(tq, WALK_DIST, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { mixPose(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.crouch = 1; P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { mixPose(K_STRIKE, K_STRIKE, 0); P.crouch = 1; P.bx = 4; P.walk = 1; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { mixPose(K_STRIKE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.crouch = 1; P.bx = 4; P.walk = 1; P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); mixPose(K_HOLD, K_IDLE, q); P.bx = Math.round(4 * (1 - q)); P.crouch = q < 0.5 ? 1 : 0; P.walk = q < 0.5 ? 1 : 0; P.beard = q < 0.7 ? 1 : 0; }
    } else if (st === CHARGE) {                                 // 化影：伏低蓄力，最后 0.2 秒身体闪成暗影剪影
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q); P.crouch = Math.round(q * 2);
      P.beard = -Math.round(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (fr >= 15) P.shade = fr === 15 ? (f12 & 1) : 1;
    } else if (st === CAST) {                                   // 瞬移到假人身后（mx），转身朝左（flip）：显形 → 连斩一 → 连斩二 → 十字斩预备
      P.mx = TX_BEHIND; P.flip = 1; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1;
      if (fr < 1) { mixPose(K_APPEAR, K_APPEAR, 0); P.crouch = 2; P.shade = 1; }
      else if (fr < 3) { mixPose(K_SLASH1, K_SLASH1, 0); P.crouch = 1; P.walk = 1; }
      else if (fr < 5) { mixPose(K_SLASH2, K_SLASH2, 0); P.crouch = 1; P.walk = 1; P.beard = -1; }
      else { mixPose(K_CROSS, K_CROSS, 0); P.beard = 1; P.sway = 1; }
    } else if (st === RECOVER) {                                // 双刃举顶再撑 2 帧 → 十字斩（第 2 帧）定格 3 帧 → 回影：原地从暗影显形，缓入待机
      if (fr < 2) { mixPose(K_CROSS, K_CROSS, 0); P.mx = TX_BEHIND; P.flip = 1; P.gem = 3; P.rim = 3; P.beard = 1; P.sway = fr ? -1 : 1; }
      else if (fr < 5) { mixPose(K_FINISH, K_FINISH, 0); P.mx = TX_BEHIND; P.flip = 1; P.crouch = 2; P.walk = 1; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; }
      else { const q = ease.inOut(clamp01((tq - 5 / 12) / 0.25)); mixPose(K_FINISH, K_IDLE, q); P.crouch = Math.round(2 * (1 - q)); P.shade = fr === 5 ? 1 : 0; P.beard = -Math.round(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { mixPose(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.crouch = 4; P.eyes = 1; P.beard = 1; }
      else {                                                    // 前扑倒地；前手匕首向前弹飞；刃光闪烁熄灭；身体沉成暗影后消散
        mixPose(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.66) / 0.25); P.hatX = Math.round(4 * hq); P.hatY = Math.round(Math.sin(hq * Math.PI) * 4);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.45) P.shade = 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {                                 // 从暗影中自下而上显形
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.shade = tq < 0.85 ? 1 : 0; P.gem = tq > 0.85 ? 2 : 0;
    }
    if (P.a > Math.PI) P.a -= 2 * Math.PI;
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob + P.crouch; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.bhx = Math.round(P.bhx); P.bhy = Math.round(P.bhy) + P.bob + P.crouch; P.ba = Math.round(P.ba / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    if (P.lying) { P.gx = 25 + P.hatX + P.bx; P.gy = -2 - P.hatY - P.lift; }
    else { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.gx = Math.round(P.hx - 0.5 + dx * 6.5) + P.bx; P.gy = Math.round(P.hy - 0.5 + dy * 6.5); }
    // 缓存键：任何一个取整后的参数变了才重画（mx / flip 在 blit 时处理，不进键）
    let k = P.hx + 16; k = k * 64 + P.hy + 40; k = k * 128 + Math.round(P.a / ASTEP) + 64; k = k * 32 + P.bhx + 16; k = k * 64 + P.bhy + 40; k = k * 128 + Math.round(P.ba / ASTEP) + 64;
    k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.bend; k = k * 2 + P.bob; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 16 + P.bx + 8; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 8 + P.walk;
    k = k * 2 + P.lying; k = k * 4 + P.lift; k = k * 16 + P.hatX + 8; k = k * 8 + P.hatY; k = k * 128 + Math.round(P.dq * 48); k = k * 2 + P.shade; P.k2 = k;
  }

  // ───── 画法小工具 ─────
  function spG(x, y, m, t) { if (y < 0.5) sp(x, y, m, t); }       // 不画进地面以下
  function limb(x0, y0, x1, y1, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let i = 0; i <= n; i++) { const s = i / n; rect(Math.round(x0 + (x1 - x0) * s - 0.5), Math.round(y0 + (y1 - y0) * s - 0.5), 2, 2, m, 0); } }   // 2 格粗的四肢
  function leg(hx0, hy0, ax, ay, c) { const fw = ax >= hx0 ? 1.5 + c * 0.4 : 0.6, kx = (hx0 + ax) / 2 + fw, ky = (hy0 + ay) / 2 - 0.5; limb(hx0, hy0, kx, ky, M_PANTS); limb(kx, ky, ax, ay, M_PANTS); }   // 膝盖朝前
  function boot(ax, ay) { const x = Math.round(ax - 0.5) - 1, y = Math.round(ay); rect(x, y, 3, 3, M_LEATHER, 0); sp(x + 3, y + 2, M_LEATHER, 0); }   // 靴：3×3，脚尖朝前多 1 格
  // 匕首：x, y = 手心；a = 刃的朝向（0 朝上，π/2 朝前）；lv = 刃光档位 0 待机 / 1 蓄力 1 / 2 蓄力 2 / 3 施放 / 4 熄灭，-1 = 不发光（后手刃）
  function drawDagger(x, y, a, lv, glint) {
    const dx = Math.sin(a), dy = -Math.cos(a), pnx = -dy, pny = dx; let nx = 0, ny = 0;
    if (Math.abs(pnx) > Math.abs(pny)) nx = pnx + pny >= 0 ? Math.sign(pnx) || 1 : -Math.sign(pnx); else ny = pnx + pny >= 0 ? Math.sign(pny) || 1 : -Math.sign(pny);   // 刃脊偏向背光（右下）一侧，取 4 邻域
    spG(x - dx * 2.2, y - dy * 2.2, M_STEEL, 3);                 // 柄头（握把被手盖住）
    const qx = x + dx * 1.6, qy = y + dy * 1.6;                  // 护手：横档 3 格，左上亮右下暗
    spG(qx, qy, M_STEEL, 3); spG(qx + dy, qy - dx, M_STEEL, pnx + pny < 0 ? 2 : 4); spG(qx - dy, qy + dx, M_STEEL, pnx + pny < 0 ? 4 : 2);
    for (let s = 2.5; s <= 7.31; s += 0.4) {
      const px = x + dx * s, py = y + dy * s, q = (s - 2.5) / 4.8; let m = M_STEEL, t = 4, ms = M_STEEL, ts = 2;
      if (lv === 0) { if (q > 0.8) { m = M_EDGE; t = 2; } }
      else if (lv === 1) { if (q > 0.45) { m = M_EDGE; t = q > 0.85 ? 4 : 3; } }
      else if (lv === 2) { m = M_EDGE; t = q > 0.85 || (q > 0.35 && q < 0.5) ? 4 : 3; ms = M_EDGE; ts = 2; }
      else if (lv === 3) { m = M_EDGE; t = 4; ms = M_EDGE; ts = 3; }
      else if (lv === 4) t = 3;
      spG(px, py, m, t); if (q < 0.5) spG(px + nx, py + ny, ms, ts);   // 刃口（亮）+ 刃根一半的刃脊（暗）
    }
    if (glint) spG(x + dx * 8.4, y + dy * 8.4, M_EDGE, 4);
  }
  // 两条围巾尾：从后颈飘向身后，逐格收细；beard < 0 被风吹直拉长，> 0 向上甩；上面那条尖端随 sway 摆
  function drawScarf(hx, hy) {
    const sc = P.beard, x0 = hx - 3, y0 = hy + 1;
    for (let j = 0; j < 2; j++) {
      const L = (j ? 5 : 8) + (sc < 0 ? -sc * 2 : 0), droop = sc < 0 ? 2.4 + sc : 2.4 - sc * 2.5, wag = j === 0 ? P.sway : 0;
      for (let k = 0; k <= L; k++) { const q = k / L, y = y0 + j + q * q * droop + (k >= L - 1 ? wag : 0); sp(x0 - k, y, M_SCARF, j ? 2 : 0); if (k < 2 && j === 0) sp(x0 - k, y + 1, M_SCARF, 0); }
    }
  }
  // 头：兜帽 + 脸。用 hp / hr 按「站姿坐标」画；rot = 1 时整体顺时针转 90°（俯面倒地：头顶朝右、脸朝下），是整格旋转不会毁像素
  let rot = 0, rox = 0, roy = 0;
  function hp(dx, dy, m, t) { if (rot) sp(rox - dy, roy + dx, m, t); else sp(rox + dx, roy + dy, m, t); }
  function hr(dy, dx0, dx1, m, t) { for (let dx = dx0; dx <= dx1; dx++) hp(dx, dy, m, t); }
  function drawHead() {
    part();                                                     // 兜帽：圆顶、鸟喙形前檐（压出眉眼上的暗线）、宽大的后脑、披到肩背的垂布（随 bend 后摆）、一道褶
    const deep = rot ? 3 : 5;                                   // 倒地脸朝下时，前檐和鼻尖压进地里，不画
    hr(-7, -2, 1, M_HOOD, 0); hr(-6, -3, 2, M_HOOD, 0); hr(-5, -4, 3, M_HOOD, 0); hr(-4, -4, deep, M_HOOD, 0);
    for (let dy = -3; dy <= 0; dy++) hr(dy, -4, 0, M_HOOD, 0);
    hr(1, -4, -1, M_HOOD, 0); hr(2, -4 - (P.bend >= 2 ? 1 : 0), -3, M_HOOD, 0); if (P.bend >= 3) hp(-5, 3, M_HOOD, 0);
    hp(-2, -5, M_HOOD, 2); hp(-2, -4, M_HOOD, 2); hp(-3, -2, M_HOOD, 2);
    part();                                                     // 脸：眼缝（肤）+ 暗色面罩 + 深红围领，同一部件（彼此是明暗边，不是分界线）
    hr(-3, 1, 3, M_SKIN, 0);
    if (P.eyes) { hp(1, -3, M_SKIN, 1); hp(2, -3, M_SKIN, 1); } else { hp(2, -3, M_INK, 1); hp(3, -3, M_SKIN, 4); }
    hr(-2, 1, Math.min(deep, 4), M_MASK, 0); hr(-1, 1, 3, M_MASK, 0); hr(0, 1, 3, M_MASK, 0);
    hp(2, -1, M_MASK, 2); if (!rot) hp(4, -2, M_MASK, 4);      // 面罩褶 + 鼻梁高光
    hr(1, -1, 2, M_SCARF, 0); hp(0, 1, M_SCARF, 4);             // 围领：围巾在脖子上绕一圈，两条尾巴从后颈飘出
  }
  function drawLegs(c) {
    const yH = HIP_Y + c;
    if (c >= 3) {                                               // 跪姿：后膝着地、小腿贴地；前膝立起
      part(); limb(-1.5, yH, -2, -0.5, M_PANTS); limb(-2, -0.5, -5.5, -0.5, M_PANTS);
      part(); rect(-8, -1, 3, 2, M_LEATHER, 0);
      part(); limb(1, yH, 4.5, yH + 0.5, M_PANTS); limb(4.5, yH + 0.5, 4, -2.5, M_PANTS);
      part(); boot(4, -2.5);
      return;
    }
    let fx = 3.5 + c * 0.6, fy = -2.5, bx = -3.5 - c * 0.6, by = -2.5;
    if (P.walk) { const f = P.walk - 1; if (f === 0) { fx = 6; bx = -6; } else if (f === 1) { fx = 1; bx = -1; by = -4.5; } else if (f === 2) { fx = -6; bx = 5.5; } else { fx = 1.5; fy = -4.5; bx = -1; } }
    part(); leg(-1.5, yH, bx, by, c); part(); boot(bx, by);     // 后腿 → 后靴
    part(); leg(1, yH, fx, fy, c); part(); boot(fx, fy);        // 前腿 → 前靴
  }
  // 站姿骨架：部件从后往前
  function drawStanding() {
    const lean = P.lean, c = P.crouch, yH = HIP_Y + c, yT = SH_Y + P.bob + c, hx = lean + P.head, hy = yT - 1, sw = P.sway;
    part(); drawScarf(hx, hy);                                  // 围巾尾（最后面）
    part(); drawDagger(P.bhx - 0.5, P.bhy - 0.5, P.ba, P.gem >= 2 ? 1 : -1, 0);   // 后手匕首（反握；蓄满 / 施放时也亮）
    part(); limb(-2 + lean, yT + 2, P.bhx - 0.5, P.bhy - 0.5, M_CLOTH);            // 后臂
    part(); rect(P.bhx - 1, P.bhy - 1, 2, 2, M_SKIN, 0);         // 后手
    drawLegs(c);
    part();                                                     // 上衣：窄肩、收腰、外扩一行的短下摆（前开衩）、交领斜襟
    for (let y = yT; y <= yH + 1; y++) {
      const t = clamp01((y - yT) / (yH - yT)), lx = Math.round(lean * (1 - t)); let L = -3, R = 2;
      if (y === yT || (y > yT + 3 && y <= yH)) L = -2;
      else if (y > yH) { L = -4 + Math.min(0, sw); R = 3 + Math.max(0, sw); }
      run(y, L + lx, R + lx, M_CLOTH, 0);
    }
    sp(1, yH + 1, 0, 0); sp(-2, yH + 1, M_CLOTH, 2);            // 下摆前开衩 + 褶
    line(2 + lean, yT + 1, 0, yH - 2, M_CLOTH, 2, 99);          // 交领斜襟（暗线）
    run(yH - 1, -2, 2, M_SCARF, 0); run(yH, -2, 2, M_SCARF, 0); rect(0, yH - 1, 2, 2, M_STEEL, 3); sp(0, yH - 1, M_STEEL, 4);     // 深红腰带 + 钢扣
    sp(-3, yH - 1, M_SCARF, 0); sp(-3, yH, M_SCARF, 0); sp(-4, yH + 1, M_SCARF, 2); sp(-4 + Math.min(0, sw), yH + 2, M_SCARF, 0); sp(-5 + sw, yH + 3, M_SCARF, 2);   // 身后腰带结 + 垂尾
    rot = 0; rox = hx; roy = hy; drawHead();                    // 兜帽 → 脸
    part(); drawDagger(P.hx - 0.5, P.hy - 0.5, P.a, P.gem, P.glint);   // 前手匕首（正握）：刃光 = 发光体
    const fsx = 2 + lean, fsy = yT + 2, ux = P.hx - 0.5 - fsx, uy = P.hy - 0.5 - fsy, ul = Math.hypot(ux, uy) || 1, ex = P.hx - 0.5 - ux / ul * 2.2, ey = P.hy - 0.5 - uy / ul * 2.2;
    part(); limb(fsx, fsy, ex, ey, M_CLOTH);                    // 前袖
    part(); limb(ex, ey, ex + ux / ul * 1.2, ey + uy / ul * 1.2, M_LEATHER);   // 皮护腕
    part(); rect(P.hx - 1, P.hy - 1, 2, 2, M_SKIN, 0);           // 握刀的手（盖住握把）
  }
  // 倒地姿：俯面前扑（头在右、脸朝下），围巾尾搭在背上，前手伸向弹飞的匕首
  function drawLying() {
    part(); drawDagger(18 + P.hatX, -1.5 - P.hatY, Math.PI / 2, P.gem, 0);       // 脱手弹开的前手匕首（刃光闪烁后熄灭）
    part(); limb(-3, -4.5, -9.5, -4.5, M_PANTS);                 // 远侧腿
    part(); rect(-13, -6, 3, 3, M_LEATHER, 0);                   // 远侧靴（脚跟朝上）
    part(); limb(-3, -1.5, -8.5, -1.5, M_PANTS);                 // 近侧腿
    part(); rect(-12, -3, 3, 3, M_LEATHER, 0); sp(-13, 0, M_LEATHER, 0);   // 近侧靴，脚尖点地
    part();                                                     // 趴着的上衣：背朝上微拱，腰带竖着横过身体，下摆摊开，交领斜襟
    run(-7, 0, 4, M_CLOTH, 0); for (let y = -6; y <= -1; y++) run(y, -3, 5, M_CLOTH, 0); run(0, -5, -2, M_CLOTH, 0); sp(-4, -1, M_CLOTH, 0); sp(-4, -6, M_CLOTH, 0);
    for (let y = -6; y <= -1; y++) { sp(-2, y, M_SCARF, 0); sp(-1, y, M_SCARF, 0); } rect(-2, -3, 2, 2, M_STEEL, 3);
    sp(-3, -7, M_SCARF, 0); sp(-4, -8, M_SCARF, 2);             // 腰带结翘在背上
    line(5, -6, 1, -1, M_CLOTH, 2, 99);
    rot = 1; rox = 7; roy = -3; drawHead(); rot = 0;            // 头：转 90°，头顶朝右、脸朝下
    part(); run(-7, 1, 5, M_SCARF, 0); run(-6, -2, 1, M_SCARF, 2); sp(-3, -5, M_SCARF, 2);   // 围巾尾搭在背上，尖端垂到腰侧
    part(); limb(6, -1.5, 13, -1.5, M_CLOTH);                    // 近侧手臂向前伸，从脸下探出
    part(); limb(12, -1.5, 13, -1.5, M_LEATHER);                 // 皮护腕
    part(); rect(14, -2, 2, 2, M_SKIN, 0);                       // 空着的手，指向弹飞的匕首
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() {
    HERO_RIM.rim = P.rim; HERO_RIM.rx = P.gx + hero.ox; HERO_RIM.ry = P.gy + hero.oy; HERO_RIM.flash = P.flash; HERO_RIM.dq = P.dq;
    bake(hero, HERO_RIM);
    if (P.shade) { const o = hero.out, M = hero.mat; for (let i = 0; i < o.length; i++) if (o[i] !== 255) o[i] = M[i] ? EL[3] : EL[4]; }   // 化影：填色 → 暗影第 4 级，勾线 → 第 5 级
  }

  // ───── 特效 ─────
  // 化影汇聚粒子 + 暗烟（模块内的小粒子池）。引擎的 K_SPIRAL 固定汇聚到发光点、半径 3.5 起以 3–5 格环绕（纵向 0.75），
  // 影袭要汇聚到身体中心、半径 8 起以 7–9 格环绕（纵向 0.9、角速度 7）；暗烟要从色阶第 3 级起步（引擎 spawn 不能设初始年龄）。
  // 这两种粒子的算法、配色和原版粒子池一致，画在 fxFront；施放时环绕粒子按引擎 releaseOrbit 同样的公式交给引擎外爆。
  const MN = 256, mK = new Uint8Array(MN), mX = new Float32Array(MN), mY = new Float32Array(MN), mVX = new Float32Array(MN), mVY = new Float32Array(MN), mAge = new Float32Array(MN), mLife = new Float32Array(MN), mA = new Float32Array(MN), mR = new Float32Array(MN), mW = new Float32Array(MN);
  let mHead = 0;
  function mSpawn(k, x, y, vx, vy, life, a, r, w, age0) {
    let i = mHead; for (let n = 0; n < MN; n++) { const j = (mHead + n) % MN; if (mK[j] === 0) { i = j; break; } }
    mHead = (i + 1) % MN; mK[i] = k; mX[i] = x; mY[i] = y; mVX[i] = vx; mVY[i] = vy; mAge[i] = age0 || 0; mLife[i] = life; mA[i] = a || 0; mR[i] = r || 0; mW[i] = w || 0;
  }
  function mStep(dt, cx, cy) {
    for (let i = 0; i < MN; i++) {
      const k = mK[i]; if (!k) continue; mAge[i] += dt;
      if (k === K_SPIRAL) { mA[i] += mW[i] * dt; mR[i] -= mVX[i] * dt; if (mR[i] <= 8) { mK[i] = K_ORBIT; mR[i] = 7 + (i % 3); } mX[i] = cx + Math.cos(mA[i]) * mR[i]; mY[i] = cy + Math.sin(mA[i]) * mR[i] * 0.9; continue; }
      if (k === K_ORBIT) { mA[i] += 7 * dt; mX[i] = cx + Math.cos(mA[i]) * mR[i]; mY[i] = cy + Math.sin(mA[i]) * mR[i] * 0.9; continue; }
      if (mAge[i] >= mLife[i]) { mK[i] = 0; continue; }
      mVX[i] += Math.sin(mAge[i] * 7 + i) * 10 * dt; mX[i] += mVX[i] * dt; mY[i] += mVY[i] * dt;   // K_RISE：左右飘着上升
    }
  }
  function mRelease() { for (let i = 0; i < MN; i++) if (mK[i] === K_SPIRAL || mK[i] === K_ORBIT) { const v = 45 + Math.random() * 55; spawn(K_BURST, mX[i], mY[i], Math.cos(mA[i]) * v, Math.sin(mA[i]) * v * 0.75 - 12, 0.35 + Math.random() * 0.4, R_SHADOW); mK[i] = 0; } }
  function mDraw(f12) {
    for (let i = 0; i < MN; i++) {
      const k = mK[i]; if (!k) continue; let c;
      if (k === K_RISE) { const q = mAge[i] / mLife[i]; c = EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]; }
      else { const s = (i + f12) % 6; c = s < 1 ? EL[0] : s < 3 ? EL[1] : EL[2]; }
      put(Math.round(mX[i]), Math.round(mY[i]), c);
    }
  }
  // 双刃拖影弧（2 条）：绕肩旋转，半径 r0→r1、屏幕角 a0→a1（atan2，y 向下），第 1 帧 2 格宽第 1–2 级，第 2 帧 1 格宽第 3 级断续
  const SWN = 2, swT = new Float32Array(SWN).fill(9), swCX = new Float32Array(SWN), swCY = new Float32Array(SWN), swA0 = new Float32Array(SWN), swA1 = new Float32Array(SWN), swR0 = new Float32Array(SWN), swR1 = new Float32Array(SWN);
  let tipX = 0, tipY = 0;
  function bladeTip(K, c, back) { const a = back ? K.ba : K.a; tipX = (back ? K.bhx : K.hx) - 0.5 + Math.sin(a) * 7.3; tipY = (back ? K.bhy : K.hy) + c - 0.5 - Math.cos(a) * 7.3; }
  function swing(i, cx, cy, a0, r0, a1, r1) { swT[i] = 0; swCX[i] = cx; swCY[i] = cy; swA0[i] = a0; swA1[i] = a1; swR0[i] = r0; swR1[i] = r1; }   // 角度增大 = 屏幕上顺时针
  // 斩线（影袭连斩）：贯穿目标的直线，4 帧：白芯 2 格 → 淡紫 → 紫断续 → 深紫稀疏；出线时沿斩向迸出火花
  const SLN = 4, slT = new Float32Array(SLN).fill(9), slX0 = new Float32Array(SLN), slY0 = new Float32Array(SLN), slX1 = new Float32Array(SLN), slY1 = new Float32Array(SLN), slBig = new Uint8Array(SLN);
  function slash(x0, y0, x1, y1, big) {
    let i = 0; for (let k = 0; k < SLN; k++) if (slT[k] > slT[i]) i = k;
    slT[i] = 0; slX0[i] = x0; slY0[i] = y0; slX1[i] = x1; slY1[i] = y1; slBig[i] = big;
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, n = big ? 12 : 7;
    for (let j = 0; j < n; j++) { const q = 0.2 + Math.random() * 0.8, v = 30 + Math.random() * 60; spawn(K_BURST, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, ux * v, uy * v - 8, 0.2 + Math.random() * 0.3, R_SHADOW); }
  }
  // 化影残像：把某一帧的精灵烘焙成暗色剪影（填色 → 第 4 级，勾线 → 第 5 级），留在原地 3 帧后按 Bayer 阈值删像素
  let ghostT = 9, ghostX = 0, ghostFlip = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, smokeAcc = 0;
  function snapGhost(st, t) {
    poseAt(st, t, E.simT); drawHero(); bakeHero();
    const o = hero.out, M = hero.mat, g = ghost.out; for (let i = 0; i < o.length; i++) g[i] = o[i] === 255 ? 255 : M[i] ? EL[3] : EL[4];
    ghostX = HX + P.mx; ghostFlip = P.flip; ghostT = 0;
    poseAt(E.state, E.stT, E.simT); hero.k1 = hero.k2 = -1;
  }
  function onEnter(s) {
    if (s === CAST) {                                           // 化影 → 瞬移：蓄力粒子外爆 + 30 颗 + 冲击环 + 原地残像 + 暗影拖尾连到假人身后
      const ox = HX + P.lean, oy = HY - 11 + P.crouch, tx = HX + TX_BEHIND;
      mRelease();
      burst(ox, oy, 30, 60, 130, 0.3, 0.7, R_SHADOW, 10); ring(ox, oy, 1, R_SHADOW);
      snapGhost(CHARGE, DUR[CHARGE] - 1 / 24);
      for (let i = 0; i < 28; i++) { const q = i / 27; spawn(K_TRAIL, ox + 6 + (tx - ox - 14) * q, oy + 1 + Math.round(Math.random() * 4 - 2), 25 + Math.random() * 35, Math.random() * 6 - 3, 0.1 + q * 0.25 + Math.random() * 0.1, R_SHADOW); }
      burst(tx, oy, 14, 30, 70, 0.2, 0.45, R_SHADOW, 6);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                        // 出手帧：两段拖影弧交叉、刃尖火花、蹬地扬尘、判定命中
      const cy = HY + SH_Y + P.crouch + 2;                       // 以肩为轴，半径 = 臂长 + 刃长（12 → 15 格），两段弧在身前交叉
      swing(0, scrX(2 + P.lean + P.bx), cy, -1.15, 12, 0.6, 14.5);     // 前手刃：自上而下（顺时针）
      swing(1, scrX(-2 + P.lean + P.bx), cy, 1.25, 11, -0.35, 15.5);   // 后手刃：自下而上（逆时针）
      bladeTip(K_STRIKE, P.crouch, 0); burst(scrX(tipX + P.bx), HY + tipY, 6, 30, 60, 0.15, 0.3, R_SHADOW, 0);
      for (let i = 0; i < 3; i++) spawn(K_DUST, HX + Math.random() * 4, HY - 1, -10 - Math.random() * 20, -3 - Math.random() * 6, 0.25 + Math.random() * 0.2, R_DUST);
      hitDummy(0, 1); burst(DUMMY_X - 3, HY - 15, 8, 40, 90, 0.15, 0.35, R_IMPACT, 10);
    }
    if (s === CAST && (t === 1 / 12 || t === 3 / 12)) {         // 连斩一 ↙（前刃）/ 连斩二 ↗（后刃），两刀交叉；假人从身后被打，往反方向摇
      if (t === 1 / 12) slash(DUMMY_X + 8, HY - 25, DUMMY_X - 9, HY - 6, 0); else slash(DUMMY_X + 8, HY - 6, DUMMY_X - 9, HY - 25, 0);
      hitDummy(0, -1); burst(DUMMY_X, HY - 15, 6, 40, 90, 0.15, 0.35, R_IMPACT, 10);
    }
    if (s === RECOVER && t === 2 / 12) {                        // 十字斩：两条长斩线同时亮 + 36 颗外爆 + 大冲击环；假人闪白大摇、从身后被击退
      const cx = DUMMY_X, cy = HY - 15;
      slash(cx + 11, cy - 12, cx - 12, cy + 10, 1); slash(cx - 12, cy - 12, cx + 11, cy + 10, 1);
      burst(cx, cy, 36, 60, 150, 0.3, 0.7, R_SHADOW, 16); burst(cx, cy, 10, 50, 120, 0.2, 0.45, R_IMPACT, 16);
      ring(cx, cy, 1, R_SHADOW); hitDummy(1, -1); shake(0.12, 1);
    }
    if (s === RECOVER && t === 5 / 12) {                        // 回影：身后留残像，原地显形
      snapGhost(RECOVER, 4 / 12); burst(HX + TX_BEHIND, HY - 11, 10, 25, 60, 0.2, 0.4, R_SHADOW, 6); burst(HX, HY - 11, 10, 25, 60, 0.2, 0.4, R_SHADOW, 6);
    }
    if (s === DEATH && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) { const x = HX - 15 + Math.random() * 28; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); } shake(0.1, 1); }
  }
  const EVENTS = [[], [], [T_FLICK], [], [1 / 12, 3 / 12], [2 / 12, 5 / 12], [], [INCOMING + 0.66], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy, cx = HX + P.lean, cy = HY - 11 + P.crouch;   // 刃光位置、身体中心（化影汇聚点）
    if (state === CHARGE) {
      const q = clamp01(stT / DUR[CHARGE]);
      chargeAcc += dt * (24 + 30 * q); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 9, a = Math.random() * 6.2832; mSpawn(K_SPIRAL, cx, cy, (r - 8) / (0.3 + Math.random() * 0.35), 0, 9, a, r, 4 + Math.random() * 3); }
      smokeAcc += dt * (6 + 24 * q); while (smokeAcc >= 1) { smokeAcc -= 1; const x = HX - 9 + Math.random() * 18, y = HY - Math.random() * 2, vx = (Math.random() - 0.5) * 6, vy = -6 - Math.random() * 12, life = 0.5 + Math.random() * 0.6; mSpawn(K_RISE, x, y, vx, vy, life, 0, 0, 0, life * 0.35); }   // 暗烟：从色阶第 3 级起步
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2.2 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_SHADOW); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); } }
    mStep(dt, cx, cy);
    ghostT += dt; for (let i = 0; i < SWN; i++) swT[i] += dt; for (let i = 0; i < SLN; i++) slT[i] += dt;
  }
  function fxReset() { mK.fill(0); swT.fill(9); slT.fill(9); ghostT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; smokeAcc = 0; }
  function fxBack(f12) { if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 假人与角色之间：蓄力时脚下的暗影池（随蓄力扩大，外圈隔点）、化影残像
  function fxMid(f12) {
    if (E.state === CHARGE) {
      const r = 3 + Math.round(10 * clamp01(E.stT / 0.9));
      for (let x = HX - r; x <= HX + r; x++) { const d = Math.abs(x - HX) / r; if (d < 0.5) { put(x, FLOOR, EL[4]); if (d < 0.3) put(x, FLOOR + 1, EL[4]); } else if (((x + f12) & 1) === 0) put(x, FLOOR, EL[3]); }
    }
    if (ghostT < 5 / 12) {
      const f = f12of(ghostT), q = f < 3 ? 0 : (f - 2) / 3, o = ghost.out, w = ghost.w;
      for (let y = 0; y < ghost.h; y++) { const yy = HY - ghost.oy + y; if (yy < 0 || yy >= H) continue; for (let x = 0; x < w; x++) { const c = o[y * w + x]; if (c === 255 || (q > 0 && B8[(y & 7) * 8 + (x & 7)] < q)) continue; put(ghostFlip ? ghostX + ghost.ox - x : ghostX - ghost.ox + x, yy, c); } }
    }
  }
  // 角色前面：刃光十字星芒 → 汇聚粒子 / 暗烟 → 双刃拖影弧、影袭斩线
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } if (P.gem === 3) { put(gx + 2, gy + 2, EL[1]); put(gx - 2, gy - 2, EL[1]); put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy + 2, EL[1]); } }
    mDraw(f12);
    for (let i = 0; i < SWN; i++) {
      const t = swT[i]; if (t >= 2 / 12) continue; const f = t < 1 / 12 ? 0 : 1, da = swA1[i] - swA0[i], n = Math.max(6, Math.ceil(Math.abs(da) * Math.max(swR0[i], swR1[i]) * 1.3));
      for (let k = 1; k < n; k++) {
        const q = k / n, a = swA0[i] + da * q, r = swR0[i] + (swR1[i] - swR0[i]) * q, ca = Math.cos(a), sa = Math.sin(a), x = Math.round(swCX[i] + ca * r), y = Math.round(swCY[i] + sa * r);
        if (f === 0) { put(x, y, q > 0.55 ? EL[0] : EL[1]); if (q > 0.25) put(Math.round(swCX[i] + ca * (r - 1)), Math.round(swCY[i] + sa * (r - 1)), q > 0.55 ? EL[1] : EL[2]); }
        else if (k & 1) put(x, y, EL[2]);
      }
    }
    for (let i = 0; i < SLN; i++) {
      const t = slT[i]; if (t >= 5 / 12) continue; const f = f12of(t), big = slBig[i], x0 = slX0[i], y0 = slY0[i], x1 = slX1[i], y1 = slY1[i], n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(x0 + (x1 - x0) * k / n), y = Math.round(y0 + (y1 - y0) * k / n), edge = k < 2 || k > n - 2;
        if (f === 0) { put(x, y, edge ? EL[1] : EL[0]); put(x + 1, y, EL[1]); if (big) put(x - 1, y, EL[1]); }
        else if (f === 1) { put(x, y, big && !edge ? EL[0] : EL[1]); if (k & 1) put(x + 1, y, EL[2]); }
        else if (f === 2) { if (k % 3 !== 2) put(x, y, EL[2]); }
        else if (f === 3) { if ((k & 1) === 0) put(x, y, EL[3]); }
        else if (k % 4 === 0) put(x, y, EL[4]);
      }
    }
  }

  const SHEET = [[IDLE, [0, 0.4, 0.8, 1.2]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'], [DEATH, [0.3, 0.42, 0.6, 0.7, 0.9, 1.1, 1.3, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]];
  return {
    name: '影刃刺客', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EDGE], HIT_POINT, EVENTS, SHEET,
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
