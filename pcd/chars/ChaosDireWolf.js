// 混沌恐狼（敌人 · 混沌 · 优质 · 近战 range 256）：「拥有利爪的高伤害单位。」
//   像鬣狗的长臂巨爪狼：前腿比后腿长 4 格、前身高耸、背线往后斜，焦赭褐短毛带深色斑点和肩 / 腿上的毛纹、圆耳、深色吻；
//   两只前爪各伸出 4 根镰刀长爪（嵌套的 4 道弧），站着时前掌被爪撑离地面、4 个爪尖分开插在身前地上；两肩各长一簇竖起的混沌裂晶（3 根尖晶，最高 5 格），晶体里有电光；
//   脖子上挂着一截挣断的铁链项圈，断链垂到胸前晃。
// 攻击：人立起来，双爪自上而下交叉劈（出手帧前身仍抬着，近爪往前下、远爪往前上，在身前交成 X，爪尖越过吻尖）。技能「裂爪三连」：人立、双爪高举，晶簇里的电光沿前臂流到爪尖（爪尖亮 1 → 2）；
//   施放时扑前落爪，三道竖直爪痕自上而下 + 电光飞溅；目标身上留三道爪痕，地面裂开三条平行的电光缝，目标短暂眩晕。
// 死亡：侧躺，前爪抽搐两下后不动，肩上晶簇碎掉。
// 身体用 parts-beast 的 quad（canine 头改圆耳、hump 2、claw 脚、spots 斑点）；前身抬高、镰刀长爪、肩部晶簇、断链项圈是本模块的候选部件。
PCD.define('ChaosDireWolf', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.bolt, EL = FXR[R_EL];                                        // 混沌裂光 · 电黄：白 21 → 淡金 51 → 青 22 → 蓝 23 → 深蓝 40
  const FUR = [0, E.color('#4a1a10'), E.color('#7e3620'), E.color('#a8542c')];   // 焦赭褐狼毛（leather 暗段偏红，共享色板里没有，追加 3 色）
  const m = B.mats(E, {
    main: FUR, muz: [0, 0, FUR[1], FUR[2]], claw: 'bone', teeth: 'bone', eye: [0, 0, 51, 21], glow: [22, 22, 21, 21],
    crys: [39, 23, 22, 51], chain: 'iron',
  });
  m.clawF = E.defMat([8, 7, 7, 6], 1);                                           // 远侧长爪暗一级
  m.spark = E.defMat([51, 51, 21, 21], 1, 1);                                    // 晶内电光 / 爪尖电光（平涂发光体）
  const HEAD = { type: 'canine', w: 7, h: 5.5, snout: 4.5, snH: 3.2, tip: 0.6, ear: 'round', earH: 2, teeth: 2 };   // 鬣狗式：圆耳、粗吻
  const o = Q.shape({ len: 14, chest: 5.5, rump: 3.6, waist: 0.4, hump: 2, leg: 7, lw: 2.5, thigh: 2.4, farDx: -2, stride: 3, lift: 2,
    neck: 3.2, neckA: 0.45, neckW: 3, head: HEAD, headA: 0.3, tail: 'bushy', tailLen: 6, tailW: 3, tailA: -0.1, tailCurl: 0.1,
    mane: 'none', foot: 'claw', pattern: 'spots', fur: 0, m });
  const RAISE = 4, PAW_UP = 2;                                                   // 前身抬高 4 格、前腿长 4 格（鬣狗式前高后低）；站着时前掌被镰爪撑离地面 2 格

  const HX = 64, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 66, 46, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'spark', 'crys', 'claw', 'clawF', 'teeth', 'chain']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：arm 前臂 0 着地 / 1 前伸 / 2 交叉劈（近爪从上往前下、远爪从下往前上）/ 3 高举 / 4 压在前下方 · ct 爪尖电光 0–2 · cb 晶簇亮度 0–2 · cf 晶内电光相位 · cx 晶簇碎掉 · tw 前爪抽搐
  const EXTRA = [['arm', 0, 4], ['ct', 0, 2], ['cb', 0, 2], ['cf', 0, 3], ['cx', 0, 1], ['tw', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.gf = -1; P.arm = 0; P.ct = 0; P.cb = 0; P.cf = 0; P.cx = 0; P.tw = 0; }
  reset();
  let rig = null;
  const ARM_A = [[0, 0], [-0.3, -0.12], [-0.05, 0.8], [-1.3, -1.12], [0.8, 0.98]];   // 前臂方向 [近, 远]（屏幕角，0 朝前、+ 朝下）
  const CLAW_R = [[0, 0], [0.1, 0.1], [0.95, -1.3], [0.35, 0.35], [0.15, 0.15]];      // 爪相对前臂再转的角度 [近, 远]：交叉劈时近爪往前下、远爪往前上，两排爪交成 X

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12;
  const A_REAR = pose({ bx: -1, pitch: 6, head: -1, jaw: 2, ear: 1, tail: 1 });   // 人立、双爪高举
  const A_SLASH = pose({ bx: 4, pitch: 5, head: -2, jaw: 2, tail: -2 });            // 交叉劈下（定格）：前身仍抬着，双爪在身前交成 X
  const A_FOLLOW = pose({ bx: 5, pitch: 3, crouch: 1, head: 1, jaw: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_REAR, 'out'], [T_HIT, A_SLASH, 'snap'], [0.25, A_SLASH, 'lin'], [0.42, A_FOLLOW, 'out'], [0.75, REST, 'inOut']];
  const C_REAR = pose({ pitch: 6, head: -1, jaw: 2, ear: 1, tail: 1 });
  const S_SLAM = pose({ pitch: 0, crouch: 2, head: 1, jaw: 3, tail: -2 });
  const DASH = 10, S_T = [2 / 12, 3 / 12, 4 / 12];                               // 扑前格数；三道爪痕的时刻（三连）
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.cf = (f12 >> 1) & 3;
    if (lp >= 1.6 - 1e-6 && lp < 2.2 - 1e-6) {                                     // 待机个性：前爪刨地两下、低头低吼、肩上晶簇闪一下
      const k = f12of(lp - 1.6); P.head = 2; P.jaw = 1; P.ear = 1; P.crouch = 1;
      P.paw = [1, 2, 0, 1, 2, 0, 0, 0][k] || 0; P.reach = [0, -1, -2, 0, -1, -2, 0, 0][k] || 0; P.cb = k === 2 || k === 3 ? 2 : 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset(); P.cf = (f12 >> 1) & 3;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.pitch = P.gf & 1 ? 1 : 0; P.head = P.gf & 1 ? 0 : 1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 前重后轻的沉重小跑
    else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      P.arm = tq < 1 / 12 ? 1 : tq < T_HIT ? 3 : tq < 0.3 ? 2 : tq < 0.5 ? 4 : tq < 0.6 ? 1 : 0; P.cb = tq >= 1 / 12 && tq < 0.34 ? 1 : 0; P.rim = tq >= 1 / 12 && tq < 0.3 ? 1 : 0;
    } else if (st === CHARGE) {                                                     // 人立、双爪高举，电光从晶簇沿前臂流到爪尖
      if (tq < 0.7) { E.mix(tmp, REST, C_REAR, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_REAR);
      P.arm = tq < 0.2 ? 0 : tq < 0.4 ? 1 : 3; P.cb = tq < 0.3 ? 1 : 2; P.ct = tq < 0.6 ? 0 : tq < 1.0 ? 1 : 2; P.rim = 2; P.glow = tq > 0.5 ? ((f12 & 1) ? 2 : 1) : 0;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tail = (f12 & 1) ? 2 : 0; }
    } else if (st === CAST) {                                                       // 扑前落爪：三道爪痕
      P.cb = 2; P.ct = 2; P.rim = 3;
      if (tq < 1 / 12) { apply(C_REAR); P.arm = 3; P.mx = 4; P.lift = 1; }
      else if (tq < S_T[0]) { apply(pose({ pitch: 4, head: 0, jaw: 3, ear: 1, tail: -1 })); P.arm = 3; P.mx = 8; P.lift = 1; }
      else { apply(tq < 0.4 ? S_SLAM : pose({ crouch: 1, head: 1, jaw: 1, tail: -1 })); P.arm = tq < 0.4 ? 4 : 1; P.mx = DASH; P.ct = tq < 0.4 ? 2 : 1; P.rim = tq < 0.4 ? 3 : 2; }
    } else if (st === RECOVER) {                                                    // 往后跳回原位，电光褪去
      const q = clamp01(tq / 0.45), e = ease.inOut(q);
      if (tq < 0.45) { apply(pose({ crouch: 1, head: 1, tail: -1 })); P.mx = R(DASH * (1 - e)); P.pitch = q < 0.5 ? 1 : 0; P.bob = q > 0.3 && q < 0.7 ? -1 : 0; P.arm = q < 0.5 ? 1 : 0; }
      else { E.mix(tmp, pose({ crouch: 1 }), REST, ease.inOut(clamp01((tq - 0.45) / 0.2)), F_ALL); apply(tmp); }
      P.cb = tq < 0.3 ? 2 : 1; P.ct = tq < 0.2 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.cb = h < 0.2 ? 2 : 0; } }
    else if (st === DEATH) {                                                        // 侧躺，前爪抽搐两下后不动，晶簇碎掉
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12); P.cb = d < 0.3 ? 2 : 0; P.cx = d >= 0.66 - 1e-6 ? 1 : 0;
        if ((d >= 0.8 && d < 0.9) || (d >= 1.0 && d < 1.1)) P.tw = (f12 & 1) ? 1 : -1;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); raiseFront(rig); tipsOf(rig);
    const c = crystalTop(); P.gx = R(c[0]) + P.bx; P.gy = R(c[1]);
    B.key(P, SPEC);
  }
  // 候选部件：raiseFront —— 鬣狗式前高后低：rig 算好后把胸、颈、头、前腿根整体抬高 H 格，前腿加长 H 格（脚留在原地）；
  //   arm ≠ 0 时前腿按 ARM_A 的方向伸直（高举 / 前伸 / 劈下），不再够地；侧躺时不抬
  function raiseFront(rg) {
    if (rg.lie) { if (P.tw && rg.lie === 2) for (const L of rg.legs) if (L.front) { L.F[0] += P.tw; L.F[1] -= P.tw > 0 ? 1 : 0; } return; }
    const H = RAISE;
    rg.C1.y -= H; rg.NB.y -= H; rg.NT.y -= H; rg.head.y -= H; rg.mouth[1] -= H; rg.eye[1] -= H; rg.wing.y -= H; rg.hit[1] -= H; rg.top -= H;
    const near = rg.legs[3];
    for (const L of rg.legs) {
      if (!L.front) continue;
      const grounded = L.F[1] > -1.2;                                          // 够不着地时 rig 会把脚拉离地面零点几格，也算着地
      L.T[1] -= H; L.L += H; if (!grounded) L.F[1] -= H;
      if (P.arm) { const a = ARM_A[P.arm][L.far ? 1 : 0], e = L.L * 0.92; L.F[0] = L.T[0] + Math.cos(a) * e; L.F[1] = Math.min(0, L.T[1] + Math.sin(a) * e); }
      else {                                                                     // 站在镰爪上：前掌离地 2 格；站定时远侧前掌就在近侧后面 2 格
        if (L.far && rg.gf < 0 && !P.paw) L.F[0] = near.F[0] - 2;
        L.F[1] = grounded ? -PAW_UP : L.F[1] - PAW_UP; L.L -= PAW_UP;
      }
    }
  }

  // ───── 画 ─────
  // 候选部件：scytheClaws —— 镰刀长爪：从前掌伸出 4 根逐根加长的弯爪（骨白，背缘亮一级，爪尖 1 格墨色 / 电光）。
  //   着地时 4 根爪嵌套成 4 道弧：从掌尖往前往上拱（最长那根拱起 5 格），再勾下去插进地里，落点在掌尖前 2 / 6 / 10 / 14 格
  //   （相邻爪尖隔 3 格空，剪影里是 4 个分开的尖）；站定时远侧前掌就在近侧前掌后面 2 格，远侧的爪被近侧的挡住，不画（画了会把空隙糊满）；
  //   前臂抬起时爪顺着前臂（再转 CLAW_R 的角度）扇形伸出、尖端往回勾。紧跟 quad.leg 画（同一个部件，不另起分界线）
  const CLAW = [[2, 2, -2], [6, 3, 1], [10, 5, 5], [14, 8, 10]];                 // 着地：落点前移、控制点前移、控制点抬高（格，相对掌尖）
  const CLAW_UP = PAW_UP + 1;                                                    // 掌尖离地高度（爪根）
  const clawTip = [[0, 0], [0, 0]];
  const bz = (a, b, c, s) => { const u = 1 - s; return u * u * a + 2 * u * s * b + s * s * c; };
  // 爪的几何（纯函数，poseAt 里算爪尖给特效用，画的时候再用一次）：返回 4 根爪的二次贝塞尔 [x0, y0, cx, cy, ex, ey]；远侧站定时返回 null（被近侧挡住）
  function clawGeom(rg, L) {
    const far = !!L.far, lie = rg.lie === 2, planted = !lie && !P.arm;
    if (far && planted && rg.gf < 0 && !P.paw) return null;
    const bx = R(L.F[0]) + 3, by = R(L.F[1]) - 1;
    const dx = L.F[0] - L.T[0], dy = L.F[1] - L.T[1], a0 = Math.atan2(dy, dx) + (lie ? 0 : CLAW_R[P.arm | 0][far ? 1 : 0]);
    const x0 = planted ? bx : L.F[0] + Math.cos(a0) * 1.5, y0 = planted ? by : L.F[1] - 0.5 + Math.sin(a0) * 1.5, out = [];
    for (let k = 0; k < 4; k++) {
      if (planted) { const c = CLAW[k]; out.push([x0, y0, bx + c[1], by - c[2], bx + c[0], by + CLAW_UP]); continue; }
      const x2 = P.arm === 2, len = (lie ? 3 : x2 ? 7 : 6) + k * (lie ? 0.8 : x2 ? 1.6 : 1.5), a = a0 + (k - 1.5) * (lie ? 0.25 : x2 ? 0.13 : 0.2), ux = Math.cos(a), uy = Math.sin(a), nx = uy, ny = -ux, bu = x2 ? 0.12 : 0.35;
      out.push([x0, y0, x0 + ux * len * 0.55 + nx * len * bu, y0 + uy * len * 0.55 + ny * len * bu, x0 + ux * len * 0.95 - nx * len * 0.12, y0 + uy * len * 0.95 - ny * len * 0.12]);
    }
    return out;
  }
  function scytheClaws(L) {
    const g = clawGeom(rig, L); if (!g) return;
    const mat = L.far ? m.clawF : m.claw;
    for (let k = 0; k < 4; k++) {
      const [x0, y0, cx, cy, ex, ey] = g[k], n = 48; let lx = 1e9, ly = 1e9;
      for (let i = 0; i <= n; i++) {
        const s = i / n, x = R(bz(x0, cx, ex, s)), y = Math.min(0, R(bz(y0, cy, ey, s)));
        if (x === lx && y === ly) continue; lx = x; ly = y;
        const tip = s > 0.93, glow = tip && P.ct && (s > 0.97 || P.ct === 2);
        U.dot(E, x, y, glow ? m.spark : tip ? m.ink : mat, glow ? (P.ct === 2 ? 3 : 2) : tip ? 1 : 3);
        if (!tip && k && s > 0.08 && s < 0.5) U.dot(E, x, y - 1, mat, 4);        // 背缘高光（爪根一段 2 格粗）
      }
    }
  }
  function tipsOf(rg) {                                                            // 近 / 远侧最长那根爪的爪尖（远侧被挡住时用近侧的）
    const gn = clawGeom(rg, rg.legs[3]), gf = clawGeom(rg, rg.legs[1]), t = (g) => [R(g[3][4]), Math.min(0, R(g[3][5]))];
    clawTip[0] = t(gn); clawTip[1] = gf ? t(gf) : clawTip[0];
  }
  // 近侧后腿的毛纹和跗关节暗线（紧跟 quad.leg 画，同一个部件）：大腿上两道斜毛纹，跗关节横一道 1 格暗线（不然整条腿是一块平涂）
  function hindMarks(L) {
    if (rig.lie === 2) return;
    const T = L.T, F = L.F, dx = F[0] - T[0], dy = F[1] - T[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, bend = Math.sqrt(Math.max(0, L.L * L.L - d * d)) * 0.5;
    const hx = T[0] + dx * 0.72 + nx * (1.2 + bend * 0.6), hy = T[1] + dy * 0.72 + ny * (1.2 + bend * 0.6);
    for (let j = 0; j < 2; j++) { U.dot(E, T[0] - 1 + j * 2, T[1] - 1 + j, m.limb, 2); U.dot(E, T[0] + j * 2, T[1] + j, m.limb, 2); }
    U.dot(E, hx, hy, m.limb, 1); U.dot(E, hx + 1, hy, m.limb, 1);
  }
  function legs(far) { for (let i = 0; i < 4; i++) { const L = rig.legs[i]; if (!!L.far !== !!far) continue; Q.leg(E, rig, P, o, i); if (L.front) scytheClaws(L); else if (!far) hindMarks(L); } }
  // 肩上的深色毛纹（紧跟 quad.body 画，同一个部件）：肩胛两排斜毛，给大块红褐平涂分面
  function shoulderFur() {
    if (rig.lie === 2) return;
    const cx = R(rig.C1.x) - 3;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) {
      const x = cx - r * 3 + i, s = Q.span(rig, o, x); if (!s) continue;
      U.dot(E, x, s[0] + 3 + r * 2 + (i >> 1), m.body, 2);
    }
  }
  // 候选部件：chaosCrystals —— 肩部混沌裂晶簇（一个部件）：肩峰上 3 根竖起的尖晶（高 3 / 5 / 4，底 2 格收成 1 格尖，各自前后倾），
  //   最高那根里有一道逐帧跳动的电光（cb 0 暗 / 1 跳动 / 2 全亮）；远侧那簇往后错 2.5 格、画在躯干之前
  const SPIKES = [[-2.4, 3, -0.4], [0, 5, -0.1], [2.4, 4, 0.3]];
  function crystalBase(far) { const x = rig.C1.x - 1.2 - (far ? 2.5 : 0), s = Q.span(rig, o, R(x)); return [x, s ? s[0] + 1 : rig.C1.y - rig.C1.r]; }
  function crystalTop() { const b = crystalBase(0); return [b[0], b[1] - 5]; }
  function chaosCrystals(far) {
    if (P.cx) return; E.part(); const [bx, by] = crystalBase(far), lie = rig.lie === 2;
    for (let s = 0; s < 3; s++) {
      const [dx, h0, lean] = SPIKES[s], h = h0 - (far ? 1 : 0);
      for (let j = 0; j <= h; j++) {
        const x = bx + dx + (lie ? -j : lean * j), y = lie ? by + 1 : by - j, wide = j < h - 1;
        U.dot(E, x, y, m.crys, j === h ? 4 : 0); if (wide) U.dot(E, x + (lie ? 0 : 1), y + (lie ? -1 : 0), m.crys, 2);
        if (s === 1 && !far && j >= 1 && j < h - 1 && (P.cb === 2 || (P.cb === 1 && ((j + P.cf) & 1)) || (P.cb === 0 && j === 2 && P.cf === 0))) U.dot(E, x, y, m.spark, P.cb === 2 ? 3 : 2);
      }
    }
  }
  // 候选部件：brokenCollar —— 铁项圈 + 挣断的铁链（一个部件）：项圈横穿颈部 2 格宽、铆钉亮点；喉下垂 3 节短链（横环 2 格 / 竖环 1 格交替），
  //   末端一只张开的断环停在胸口（链长约 5 格，不垂到地上），随 P.mane 晃；侧躺时断链顺地面摊开
  function brokenCollar() {
    E.part();
    const NB = rig.NB, NT = rig.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, vx = (NT.x - NB.x) / L, vy = (NT.y - NB.y) / L, nx = -vy, ny = vx;
    const cx = NB.x + (NT.x - NB.x) * 0.5, cy = NB.y + (NT.y - NB.y) * 0.5, r = o.neckW + 0.4;
    for (let s = -r, i = 0; s <= r + 0.01; s += 1, i++) for (let t = 0; t <= 1; t++) U.dot(E, cx + nx * s + vx * t, cy + ny * s + vy * t, m.chain, t === 0 && (i % 3) === 1 ? 4 : 0);
    const ax = cx + nx * (r + 0.6), ay = cy + ny * (r + 0.6), sw = P.mane | 0;
    if (rig.lie === 2) { for (let k = 0; k < 6; k++) U.dot(E, ax + k, Math.min(0, ay + 1), m.chain, (k & 1) ? 2 : 4); return; }
    for (let k = 0; k < 3; k++) {
      const x = ax + sw * k * 0.35 + 0.5, y = ay + 1 + k;
      if (k & 1) U.dot(E, x, y, m.chain, 3); else { U.dot(E, x - 0.5, y, m.chain, 4); U.dot(E, x + 0.5, y, m.chain, 2); }
    }
    const ex = ax + sw * 1.05 + 0.5, ey = ay + 4; U.dot(E, ex - 1, ey, m.chain, 3); U.dot(E, ex + 1, ey + 1, m.chain, 2);   // 断开的末环
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    if (!legsLast) legs(1);
    Q.tail(E, rig, P, o); chaosCrystals(1); Q.body(E, rig, P, o); shoulderFur();
    if (!legsLast) legs(0);
    chaosCrystals(0); brokenCollar(); Q.head(E, rig, P, o);
    if (legsLast) { legs(1); legs(0); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let boltAcc = 0, soulAcc = 0, lastGf = -9, xT = 9, markT = 9;
  const scr = (p) => [scrX(R(p[0]) + P.bx), HY + R(p[1])];
  const MARK_X = DUMMY_X - 4, MARK_Y = HY - 16;
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [cx, cy] = scr(crystalTop());
      burst(cx, cy, 16, 40, 110, 0.2, 0.45, R_EL, 10); fx.cross(cx, cy - 1, 6, R_EL, 0.25, 2);
      for (let i = 0; i < 8; i++) spawn(K_DUST, scrX(-8) + Math.random() * 10, HY, -14 - Math.random() * 26, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                            // 交叉劈：X 形爪痕 + 电火花
      xT = 0; burst(MARK_X, MARK_Y, 12, 40, 110, 0.15, 0.4, FXI.impact, 8); burst(MARK_X, MARK_Y, 8, 40, 100, 0.2, 0.4, R_EL, 10); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.65 }); sfx('hit', { mat: 'flesh', w: 0.65 });
    }
    if (s === CAST) for (let i = 0; i < 3; i++) if (t === S_T[i]) {               // 三道竖直爪痕自上而下（各差 2 格），第三道落地：三条电光缝 + 眩晕
      const x = MARK_X - 2 + i * 2;
      fx.slash(x - 30, MARK_Y, 30, PI / 2 - 0.36, PI / 2 + 0.36, R_EL, 0.3, 2, 2);
      burst(x, MARK_Y + 3, 10, 40, 110, 0.2, 0.45, R_EL, 12);
      if (i < 2) { hitDummy(0, 1); sfx('impact', { pal: 'bolt', w: 0.45 }); }
      else {
        markT = 0; for (let k = 0; k < 3; k++) fx.crack(scrX(14) + k, FLOOR + k * 2, DUMMY_X + 6 - scrX(14), 1, R_EL, 0.9 - k * 0.1);
        fx.bolt(x, MARK_Y - 8, x + 2, HY - 1, R_EL, 0.2, 2, 11); ring(x, MARK_Y, 1, R_EL); burst(x, MARK_Y, 20, 50, 140, 0.25, 0.6, R_EL, 14);
        hitDummy(1, 1); dummyFx({ dur: 0.6, stun: 1 }); shake(0.2, 2); sfx('impact', { pal: 'bolt', w: 0.65 });
      }
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                   // 倒地 + 晶簇碎掉
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      const cx = HX - 3 + 4, cy = HY - 12;
      for (let i = 0; i < 14; i++) spawn(K_BURST, cx + (Math.random() - 0.5) * 6, cy + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 70, -20 - Math.random() * 50, 0.3 + Math.random() * 0.35, R_EL);
      fx.bolt(cx, cy, cx + 6, HY - 1, R_EL, 0.15, 2, 5);
      shake(0.12, 1); sfx('fall', { w: 0.65 }); sfx('hit', { mat: 'stone', w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], S_T, [], [], [INCOMING + 0.66], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT >= 0.45) {                                        // 电光沿前臂流到爪尖：一小段折线闪电逐帧抖动
      boltAcc += dt * 14; while (boltAcc >= 1) {
        boltAcc -= 1; const [cx, cy] = scr(crystalTop()), far = Math.random() < 0.35, [tx, ty] = scr(clawTip[far ? 1 : 0]);
        fx.bolt(cx, cy, tx, ty, R_EL, 0.1, 2, 1 + ((Math.random() * 97) | 0));
        if (Math.random() < 0.5) spawn(K_BURST, tx, ty, (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.2, R_EL);
      }
    }
    if (state === MOVE && P.gf !== lastGf) {                                      // 前爪落地：刮起带电火星的尘
      if (P.gf === 0 || P.gf === 2) {
        const [fx0] = scr([rig.legs[3].F[0] + 5, 0]);
        for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust);
        for (let i = 0; i < 2; i++) spawn(K_BURST, fx0, HY - 1, (P.flip ? 1 : -1) * (10 + Math.random() * 20), -10 - Math.random() * 15, 0.2 + Math.random() * 0.1, R_EL);
        sfx('step', { w: 0.65 });
      }
      lastGf = P.gf;
    }
    if (state === IDLE && P.paw === 2 && Math.random() < dt * 30) { const [fx0] = scr([rig.legs[3].F[0] + 4, 0]); spawn(K_BURST, fx0, HY - 1, -10 - Math.random() * 20, -8 - Math.random() * 12, 0.2, R_EL); }   // 刨地火星
    if ((state === IDLE || state === MOVE) && P.cb === 0 && Math.random() < dt * 2) { const [cx, cy] = scr(crystalTop()); spawn(K_EMBER, cx, cy, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.4, R_EL); }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 32, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    xT += dt; markT += dt;
  }
  function fxReset() { boltAcc = 0; soulAcc = 0; lastGf = -9; xT = 9; markT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (xT < 3 / 12) {                                                            // 交叉劈的 X 形爪痕：第 1 帧亮 2 格宽，之后断续变暗
      const first = xT < 1 / 12, c = first ? EL[0] : xT < 2 / 12 ? EL[2] : EL[3];
      for (let j = -6; j <= 6; j++) { if (!first && ((j + f12) & 1)) continue; put(MARK_X + j, MARK_Y + j, c); put(MARK_X - j, MARK_Y + j, c); if (first) { put(MARK_X + j + 1, MARK_Y + j, EL[1]); put(MARK_X - j - 1, MARK_Y + j, EL[1]); } }
    }
    if (markT < 0.7) {                                                            // 目标身上留下三道爪痕（闪烁褪去）
      if (markT > 0.45 && (f12 & 1)) return;
      const c = markT < 0.15 ? EL[1] : markT < 0.4 ? EL[2] : EL[3];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) put(MARK_X - 2 + i * 2 + (j > 5 ? 1 : 0), MARK_Y - 3 + j, c);
    }
  }

  return {
    name: '混沌恐狼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.crys, m.spark, m.eye, m.glow], HIT_POINT: [6, -14], EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'bolt', style: 'bolt', w: 0.65 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
