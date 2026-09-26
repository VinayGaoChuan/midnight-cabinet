// 白牙（部队 · 恶魔 · 召唤师 · 史诗 · 近战 304；desc「投掷手里剑的频率提升为之前的三倍」；特性「装备手里剑」：开战时放出自爆步兵）：
//   火猪的最终级——同一只猪长成了前重后轻的铁灰巨野猪：肩峰高耸、胸宽臀小、头低压向前，背脊一排直立白鬃；
//   两根巨大的上弯白獠牙从嘴角伸到吻前上方（名字「白牙」），红头巾长成忍者面罩 + 两条 6 格长飘带，
//   背上架一座四臂手里剑转轮发射架（铁臂 + 金轴心，轴心是发光体，平时慢转），导火索尾加粗、尾端挂一颗小铁炸弹。
// 攻击 = 射：背上转轮连转，一次攻击连甩 3 枚手里剑（三倍频率）。
// 技能「装备手里剑（升级版）」：地上冒出 6 枚金币螺旋飞进转轮，转轮越转越快发白热 → 转轮一甩，4 只套着手里剑的自爆步兵高抛物线甩出 →
//   依次落地爆成白焰团 + 飞出旋转的手里剑碎刃，末爆大冲击环。
// 死亡：前扑犁地——前膝跪折、獠牙插进地里犁出一道土沟，转轮从背上脱落飞过头顶、落地滚开后倒下。
// 身体用 parts-beast 的 quad（boar 头放大）拼；獠牙、面罩、转轮发射架、带炸弹的导火索尾、手里剑自爆步兵是本模块的候选部件。设定卡见 pcd/batch-05/WhiteFang/design.md。
PCD.define('WhiteFang', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, shoot, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('whitefire', [21, '#fff8d8', '#ffd060', '#ff8a2a', '#8a2a10']), EL = FXR[R_EL];   // 白焰 · 白热金：白 → 白热 → 金焰 → 橙 → 焦红
  const R_BRISTLE = fxRamp('whiteFangBristle', [17, 30, 29, 28, 27]);                     // 受击飞散的铁灰鬃毛
  const ST = FXR[FXI.steel], CO = FXR[FXI.coin], FI = FXR[FXI.fire];
  const m = B.mats(E, {
    main: 'iron',                                                                         // 铁灰鬃皮 [0, 27, 28, 29]（身体 band 2）
    mane: 'white',                                                                        // 背脊白长鬃
    muz: [0, 28, 29, 30], nose: [0, 11, 12, 13], claw: [0, 0, 8, 27], eye: [0, 0, 17, 21], // 浅一级的吻部、暗红鼻盘、黑蹄、白热眼
    mask: 'crimson', maskFar: [11, 12, 12, 13],                                           // 忍者面罩与飘带（远侧飘带暗一级）
    tusk: 'white', tuskFar: [7, 18, 18, 17],                                              // 白獠牙
    blade: [27, 28, 30, 31], frame: 'iron', hub: 'gold',                                  // 转轮刃、发射架铁臂、金轴心
    fuse: [0, 20, 19, 32], bomb: [0, 0, 27, 28],                                          // 导火索、小铁炸弹
  });
  m.core = E.defMat([EL[3], EL[2], EL[1], 21], 1, 1);                                     // 轴心（发光体，平涂）
  m.spark = E.defMat([EL[4], EL[3], EL[2], 21], 1, 1);                                    // 炸弹引信火星（发光体）
  m.hot = E.defMat([EL[3], EL[2], EL[1], 21], 1, 1);                                      // 獠牙尖映的白热光（颜色，不是光源）
  const HEAD = { type: 'boar', w: 8, h: 7, snout: 5, snH: 5, tip: 0.8, ear: 'droop', earH: 3, nose: 'disc', tusk: 0, teeth: 0 };
  const SHAPE = { len: 13, chest: 6, rump: 3.8, waist: 0.35, hump: 2.5, leg: 5, lw: 3, thigh: 2.8, farDx: -2, stride: 3, lift: 2, foot: 'hoof',
    neck: 1.5, neckA: 0.15, neckW: 4, head: HEAD, headA: 0.35, tail: 'none', mane: 'ridge', maneLen: 3, fur: 1, m };
  const o = Q.shape(SHAPE);

  const HX = 58, DUR = DEFAULT_DUR.slice(), hero = new Sprite(90, 58, 40, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['core', 'spark', 'fuse', 'bomb', 'eye', 'ink', 'blade', 'frame', 'hub', 'tusk', 'tuskFar', 'hot', 'claw']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：spin 转轮朝向 0–3（每档 22.5°）· sp 引信火星 0 灭 / 1 暗 / 2 亮 · hot 獠牙尖映白光 0 / 1
  //   ws 转轮 0 装在背上 / 1 飞出 / 2 落地滚 / 3 倒在地上 · wx 转轮横移 -4..31 · wy 转轮离地高 0..31 · gem（quad 自带）= 轴心档 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭
  const SPEC = Q.KEYS.concat(B.COMMON, [['spin', 0, 3], ['sp', 0, 2], ['hot', 0, 1], ['ws', 0, 3], ['wx', -4, 31], ['wy', 0, 31]]);
  const P = {};
  function reset() { Q.reset(P); P.spin = 0; P.sp = 1; P.hot = 0; P.ws = 0; P.wx = 0; P.wy = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 几何：转轮挂点、獠牙、导火索 ─────
  const HUB_T = 0.35;                                                                     // 转轮架在 臀心 → 胸心 的 35% 处（肩峰后面）
  function hubAt(rg) { const x = R(lerp(rg.C2.x, rg.C1.x, HUB_T)), s = Q.span(rg, o, x); return [x, (s ? s[0] : -14) - 8]; }
  const HUB0 = hubAt(rig);                                                                // 站姿的轴心（脱落飞出的起点）
  const HUB_GROUND = -5;                                                                  // 转轮立在地上时轴心的高度
  // 獠牙：从嘴角出发，在头部局部坐标里往前、往上弯（低头时獠牙跟着插向地面）
  const TUSK = [[0, 0], [1.2, -0.6], [2.4, -1.8], [3.4, -3.4], [3.8, -5], [3.4, -6.4]];
  function tuskPts(rg, far) {
    const F = Q.headFrame(rg, o, 0), uB = F.uT - 2.2, vB = F.prof(uB)[2] + 0.3;
    return TUSK.map(([du, dv]) => { const p = F.at(uB + du, vB + dv); return [p[0] - (far ? 1 : 0), p[1] - (far ? 1 : 0)]; });
  }
  function tuskTip(rg) { const p = tuskPts(rg, 0), q = p[p.length - 1]; return [R(q[0]), R(q[1])]; }
  // 导火索尾：臀后往后上卷 2 圈的 2 格粗弹簧，末端挂一颗小铁炸弹
  function fusePts(rg) {
    const lie = rg.lie >= 1, sw = (P.tail | 0) * 0.14, pts = [];
    let a = lie ? 0.2 : 0.55 + sw, x = rg.tail.x - 0.4, y = rg.tail.y;
    for (let k = 0; k <= 6; k++) {
      const c = k === 0 ? 0 : Math.sin(k * 1.7) * 1.4;
      pts.push([x + Math.sin(a) * c, Math.min(-2, y - Math.cos(a) * c)]);
      x -= Math.cos(a) * 1.2; y -= Math.sin(a) * 1.2; a -= lie ? 0 : 0.12;               // 越往后越垂：炸弹把尾巴坠下来
      if (y > -2) y = -2;
    }
    return pts;
  }
  function bombAt(rg) { const p = fusePts(rg), q = p[p.length - 1]; return [R(q[0] - 1), Math.min(-2, R(q[1] + 1.5))]; }

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'paw', 'reach', 'mane'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, paw: 0, reach: 0, mane: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_SHOT = [2 / 12, 3 / 12, 4 / 12];                                                // 连甩 3 枚手里剑（三倍频率）
  const A_BRACE = pose({ crouch: 1, head: 1, pitch: -1, mane: -1, tail: 1, ear: 1 });     // 压低身子稳住，转轮起转
  const A_FIRE = pose({ bx: -1, crouch: 1, head: 0, jaw: 1, mane: 1, tail: -1 });         // 连甩：每甩一枚身子一顿
  const A_HOLD = pose({ crouch: 1, head: 1, mane: 0 });
  const ATK = [[0, REST], [0.12, A_BRACE, 'out'], [T_SHOT[0], A_FIRE, 'snap'], [5 / 12, A_FIRE], [0.55, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_BRACE = pose({ crouch: 1, head: 1, pitch: -1, tail: 1, ear: 1, mane: -1 });     // 蓄力：低头压身，獠牙对地
  const C_GRIND = pose({ crouch: 2, head: 2, pitch: -1, tail: 2, ear: 1, mane: -1 });
  const S_FLING = pose({ bx: -1, pitch: 2, head: -2, jaw: 2, tail: -2, mane: 1 });       // 施放：扬头咆哮，转轮一甩
  const S_WATCH = pose({ pitch: 1, head: -1, jaw: 1, tail: -1, mane: 1 });
  const COIN_T = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], COIN_FLY = 0.2, COIN_IN = 0.45;         // 6 枚金币：冒出 → 0.2 s 后起飞 → 0.45 s 螺旋进转轮
  const COIN_DX = [-15, -9, -4, 5, 10, 16];
  const COIN_ARRIVE = COIN_T.map((t) => +(t + COIN_FLY + COIN_IN).toFixed(3));
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.spin = lp < 0.8 ? Math.floor(lp / 0.3 + 1e-6) & 3 : lp < 1.1 ? 2 : (Math.floor((lp - 1.1) / 0.3 + 1e-6) + 3) & 3;   // 转轮缓慢空转，0.8 s 卡一下
    P.gem = lp >= 0.8 && lp < 0.9 ? 2 : (f12 % 7) === 3 ? 1 : 0;                          // 「咔」：轴心一亮
    if (lp >= 1.3 - 1e-6 && lp < 2.1) {                                                   // 低头用獠牙在地上磨
      const k = f12of(lp - 1.3);
      P.head = k === 0 || k === 9 ? 2 : 3; P.crouch = k > 0 && k < 9 ? 1 : 0; P.jaw = k < 8 ? (k >> 1) & 1 : 0; P.bx = k > 0 && k < 9 ? (k & 1) : 0; P.bob = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                               // 重蹄冲步：接触帧身体顿 1 格
      const g = Q.anim.walk(P, tq); P.spin = g; P.gem = (f12 % 5) === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      const firing = tq >= T_SHOT[0] && tq < 5 / 12;
      if (firing) P.bx = -1 - (f12of(tq) & 1);
      P.spin = tq >= 0.08 && tq < 0.55 ? f12 & 3 : 0;
      P.gem = firing ? 2 : tq >= 0.08 && tq < 0.55 ? 1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.5) { E.mix(tmp, REST, C_BRACE, ease.out(tq / 0.5), F_ALL); apply(tmp); }
      else { apply(tq < 1.1 ? C_BRACE : C_GRIND); if (tq >= 1.1) P.bx = f12 & 1; }
      const sh = tq < 0.5 ? 2 : tq < 0.9 ? 1 : 0; P.spin = (f12 >> sh) & 3;              // 转轮越转越快
      P.gem = tq < 0.45 ? 0 : tq < 0.9 ? 1 : (f12 & 1) ? 2 : 1;
      P.rim = tq < 0.5 ? 0 : tq < 0.9 ? 1 : 2; P.hot = tq >= 0.9 ? 1 : 0; P.sp = tq >= 0.9 ? 2 : 1;
      if (tq > 1.1) P.mane = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {
      if (tq < 2 / 12) apply(S_FLING); else { E.mix(tmp, S_FLING, S_WATCH, ease.out(clamp01((tq - 2 / 12) / 0.25)), F_ALL); apply(tmp); }
      P.spin = f12 & 3; P.gem = tq < 2 / 12 ? 3 : 2; P.rim = tq < 2 / 12 ? 3 : 2; P.hot = 1; P.sp = 2;
    } else if (st === RECOVER) {
      E.mix(tmp, S_WATCH, REST, ease.inOut(clamp01(tq / 0.6)), F_ALL); apply(tmp);
      P.spin = tq < 0.4 ? (f12 >> 1) & 3 : 0; P.gem = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.hot = tq < 0.2 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.gem = h < 1 / 12 ? 3 : 0; P.spin = h < 0.2 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else death(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    const h = P.ws ? [HUB0[0] + P.wx, HUB_GROUND - P.wy] : hubAt(rig);
    P.gx = h[0] + (P.ws ? 0 : P.bx); P.gy = h[1];
    B.key(P, SPEC);
  }
  // 死亡：前扑犁地（前膝跪折 → 胸口和獠牙插进地里往前犁 3 格），转轮从背上脱落、飞过头顶落地滚开后倒下
  function death(d, f12) {
    P.eyes = 1; P.ear = 1;
    if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = 1; P.tail = 2; P.mane = 1; P.gem = d < 1 / 12 ? 3 : 1; }
    else if (d < 0.5) { P.bx = -1; P.crouch = 3; P.pitch = -2; P.head = 2; P.jaw = 1; P.tail = 1; P.mane = 1; P.gem = (f12 & 1) ? 2 : 1; }
    else { P.lie = 1; P.pitch = -3; P.head = 3; P.jaw = 1; P.bx = d < 0.58 ? 0 : d < 0.66 ? 1 : 3; P.tail = d < 0.9 ? -2 : 0; P.mane = -1; }
    P.sp = d < 0.66 ? 2 : 0;
    if (d >= 0.5) {                                                                       // 转轮脱落
      if (d < 0.8) { const q = (d - 0.5) / 0.3; P.ws = 1; P.wx = R(26 * q); P.wy = R(lerp(HUB_GROUND - HUB0[1], 0, q) + Math.sin(q * Math.PI) * 7); }
      else if (d < 1.1) { P.ws = 2; P.wx = R(26 + 5 * clamp01((d - 0.8) / 0.3)); P.wy = 0; }
      else { P.ws = 3; P.wx = 31; P.wy = 0; }
      P.spin = P.ws < 3 ? f12 & 3 : 0;
      P.gem = d < 0.9 ? ((f12 & 1) ? 2 : 1) : d < 1.2 ? ((f12 & 1) ? 1 : 4) : 4;         // 轴心闪烁后熄灭
    }
    if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
  }

  // ───── 画 ─────
  // 候选部件：bombFuseTail —— 2 格粗的弹簧导火索尾，末端坠一颗 3×3 小铁炸弹，炸弹顶上一格引信火星（发光体）
  function fuseTail(rg) {
    E.part();
    const pts = fusePts(rg);
    for (let i = 1; i < pts.length; i++) U.seg(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2, m.fuse, (i & 1) ? 0 : 4);
    const [bx, by] = bombAt(rg);
    U.disc(E, bx, by, 1.6, m.bomb, 0); U.dot(E, bx - 1, by - 1, m.bomb, 4);
    if (P.sp) { U.dot(E, bx + 1, by - 2, m.spark, P.sp === 2 ? 4 : 3); if (P.sp === 2) U.dot(E, bx + 1, by - 3, m.spark, 2); }
  }
  // 候选部件：launchFrame —— 背负发射架：两根铁撑从背线斜收到轴心下方 + 一条贴着背线的鞍板
  function launchFrame(rg) {
    E.part();
    const x = R(lerp(rg.C2.x, rg.C1.x, HUB_T)), h = hubAt(rg);
    for (let k = -3; k <= 3; k++) { const s = Q.span(rg, o, x + k); if (s) U.dot(E, x + k, s[0] - 1, m.frame, k === -3 ? 4 : 0); }
    const sl = Q.span(rg, o, x - 2), sr = Q.span(rg, o, x + 2);
    if (sl) U.seg(E, x - 2, sl[0] - 1, h[0], h[1] + 1, 1, m.frame, 0);
    if (sr) U.seg(E, x + 2, sr[0] - 1, h[0], h[1] + 1, 1, m.frame, 3);
    const s0 = Q.span(rg, o, x); if (s0) U.seg(E, h[0], s0[0] - 1, h[0], h[1] + 1, 1, m.frame, 4);   // 中间的转轴立柱
  }
  // 候选部件：shurikenRotor —— 四臂风车手里剑转轮：4 片三角刃（根 1.2 → 尖 5，后缘斜收），每档转 22.5°；金轴心 3×3，芯是发光体（5 档）
  //   flat 1 = 倒在地上：横着的一条刃 + 轴心
  const GEM_T = [2, 3, 4, 4, 1];
  function drawRotor(cx, cy, spin, flat) {
    E.part();
    if (flat) {
      for (let k = -5; k <= 5; k++) U.dot(E, cx + k, cy, m.blade, Math.abs(k) === 5 ? 4 : (k & 1) ? 2 : 0);
      U.dot(E, cx - 1, cy - 1, m.hub, 4); U.dot(E, cx, cy - 1, m.hub, 0); U.dot(E, cx + 1, cy - 1, m.hub, 2); U.dot(E, cx, cy, m.core, GEM_T[P.gem]);
      return;
    }
    const a0 = spin * Math.PI / 8;
    for (let k = 0; k < 4; k++) {
      const a = a0 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a), c2 = Math.cos(a - 0.85), s2 = Math.sin(a - 0.85);
      U.poly(E, [cx + c * 1.2, cy + s * 1.2, cx + c * 5, cy + s * 5, cx + c2 * 2.6, cy + s2 * 2.6], m.blade, 0);
      U.dot(E, cx + c * 5, cy + s * 5, m.blade, 4);
    }
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) U.dot(E, cx + i, cy + j, m.hub, i + j < 0 ? 4 : i + j > 0 ? 2 : 0);
    const g = P.gem; U.dot(E, cx, cy, P.gem === 4 ? m.hub : m.core, P.gem === 4 ? 1 : GEM_T[g]);
    if (g >= 2 && g <= 3) { U.dot(E, cx - 1, cy, m.core, 3); U.dot(E, cx, cy - 1, m.core, 3); if (g === 3) { U.dot(E, cx + 1, cy, m.core, 3); U.dot(E, cx, cy + 1, m.core, 3); } }
  }
  // 候选部件：maskTails —— 忍者面罩的结和两条长飘带：结在后脑，飘带往后上 / 后方飞出 6 / 5 格，尖端随 P.mane 摆
  function maskTails(rg) {
    E.part();
    const F = Q.headFrame(rg, o, P.jaw), k0 = F.at(-F.W - 0.2, -F.Hh * 0.35), lie = rg.lie >= 1, sw = P.mane | 0;
    const tails = lie ? [[-0.1, 6, m.mask], [-0.4, 5, m.maskFar]] : [[0.75, 6, m.mask], [0.4, 5, m.maskFar]];
    for (const [a, L, mat] of tails) {
      let x = k0[0], y = k0[1];
      for (let k = 1; k <= L; k++) {
        x -= Math.cos(a); y -= Math.sin(a); const wv = k > 2 ? (((k + sw) & 1) ? 0 : 1) - sw * (k - 2) * 0.4 : 0;
        U.dot(E, x, Math.min(-1, y + wv), mat, k === L ? 4 : ((k & 1) ? 0 : 2));
        if (k <= 2) U.dot(E, x, Math.min(-1, y + wv + 1), mat, 2);
      }
    }
  }
  // 面罩（紧跟 Q.head 画进头的部件）：横过眼睛的 3 行红布，从后脑一直包到吻根；眼睛从面罩里露出一格白热光
  function mask(rg) {
    const F = Q.headFrame(rg, o, P.jaw), e = rg.eye, ev = -F.Hh * 0.35;
    Q.scanHead(F, F.W + 3, (x, y, u, v) => {
      if (u < -F.W - 0.5 || u > F.W * 1.25 || Math.abs(v - ev) > 1.25) return;
      if (!(F.skull(u, v) || (F.inSnout(u) && v >= F.top(u) - 0.45 && v <= F.bot(u)))) return;
      if (x === R(e[0]) && y === R(e[1])) return;
      U.dot(E, x, y, m.mask, Math.abs(v - ev) > 0.9 ? 2 : 0);
    });
    const k = F.at(-F.W - 0.3, ev); U.dot(E, k[0], k[1], m.mask, 4); U.dot(E, k[0], k[1] + 1, m.mask, 2);
    if (!P.eyes) U.dot(E, e[0] - 1, e[1], m.eye, 4);                                     // 面罩眼缝：2 格白
  }
  // 候选部件：bigTusk —— 上弯巨獠牙（头部局部坐标：嘴角 → 往前 → 往上卷），根 2 格粗、尖 1 格；远侧那根错开 1 格、暗一级
  function tusk(rg, far) {
    E.part();
    const pts = tuskPts(rg, far), mat = far ? m.tuskFar : m.tusk;
    for (let i = 1; i < pts.length; i++) U.seg(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], i <= 2 ? 2 : 1, mat, i === pts.length - 1 ? 4 : 0);
    const q = pts[pts.length - 1];
    if (!far && P.hot) { U.dot(E, q[0], q[1], m.hot, 4); U.dot(E, pts[pts.length - 2][0], pts[pts.length - 2][1], m.hot, 3); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.legs(E, rig, P, o, 1);
    fuseTail(rig);
    Q.ridge(E, rig, P, o);
    Q.body(E, rig, P, o);
    Q.legs(E, rig, P, o, 0);
    if (!P.ws) { launchFrame(rig); const h = hubAt(rig); drawRotor(h[0], h[1], P.spin, 0); }
    maskTails(rig);
    tusk(rig, 1);
    Q.head(E, rig, P, o); mask(rig);
    tusk(rig, 0);
    if (P.ws) drawRotor(HUB0[0] + P.wx - P.bx, P.ws === 3 ? -1 : HUB_GROUND - P.wy, P.spin, P.ws === 3 ? 1 : 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_OUT = [0, 0.06, 0.12, 0.18], FLY = 0.28;                                         // 施放内：4 只自爆步兵甩出时刻 · 飞行时长
  const T_BOOM = T_OUT.map((s) => +(s + FLY).toFixed(3));                                 // 依次落地：0.28 / 0.34 / 0.40 / 0.46
  const BOOM_X = [DUMMY_X - 9, DUMMY_X - 4, DUMMY_X - 7, DUMMY_X - 3];
  const T_PLOW = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_WLAND = Math.ceil((INCOMING + 0.8) * 12 - 1e-6) / 12, T_WFLAT = Math.ceil((INCOMING + 1.1) * 12 - 1e-6) / 12;
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastK = -1, castHub = [0, 0];
  const skillT = () => (E.state === CHARGE ? E.stT : E.state === CAST ? DUR[CHARGE] + E.stT : E.state === RECOVER ? DUR[CHARGE] + DUR[CAST] + E.stT : -1);
  const hubScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {                                                                     // 转轮一甩：十字星芒 + 外爆 + 冲击环 + 震屏 2 格 + 天空闪白
      const [x, y] = hubScr(); castHub = [x, y];
      releaseOrbit(30, 80, 0.25, 0.5, { pts: 1 }); burst(x, y, 20, 40, 110, 0.2, 0.5, R_EL, 14); ring(x, y, 0, R_EL);
      fx.cross(x, y, 6, R_EL, 0.25); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK) {
      const i = T_SHOT.indexOf(t);
      if (i >= 0) {                                                                       // 转轮甩出一枚手里剑
        const [x, y] = hubScr(), ty = [HY - 10, HY - 14, HY - 12][i], vx = 150, tt = (DUMMY_X - 4 - (x + 5)) / vx;
        shoot(0, x + 5, y - 1, vx, DUMMY_X - 4, FXI.steel, (ty - (y - 1)) / tt, { trail: { every: 3, life: [0.06, 0.12], back: [4, 12] }, glow: -1 });
        fx.cross(x + 4, y - 1, 2, R_EL, 2 / 12);
        if (i === 0) sfx('swing', { kind: 'throw', w: 0.6 });
        sfx('shoot', { proj: 'arrow' });
      }
    }
    if (s === CHARGE) {
      const i = COIN_T.indexOf(t);
      if (i >= 0) { const x = hubScr()[0] + COIN_DX[i]; burst(x, HY - 1, 4, 10, 30, 0.15, 0.3, FXI.coin, 14); for (let k = 0; k < 2; k++) spawn(K_DUST, x + (k ? 1 : -1), HY, (k ? 1 : -1) * 8, -4, 0.3, FXI.dust); }   // 金币从地里冒出
      const j = COIN_ARRIVE.indexOf(t);
      if (j >= 0) { const [x, y] = hubScr(); burst(x, y, 5, 15, 40, 0.15, 0.3, j === 5 ? R_EL : FXI.coin, 6); if (j === 5) fx.cross(x, y, 3, R_EL, 0.15); }   // 金币进转轮
    }
    if (s === CAST) {
      const i = T_BOOM.indexOf(t);
      if (i >= 0) {                                                                       // 自爆步兵落地：白焰团 + 4 片旋转碎刃
        const x = BOOM_X[i], y = HY - 3, last = i === 3;
        burst(x, y, 12, 40, 120, 0.15, 0.45, R_EL, 12); burst(x, y, 4, 15, 40, 0.3, 0.55, FXI.dust, 8);
        for (let k = 0; k < 4; k++) spawnX(K_PHYS, x, y - 1, (k < 2 ? -1 : 1) * (40 + 30 * (k & 1)), -70 - 25 * (k & 1), 0.6, FXI.steel, { g: 260, floor: HY, dragX: 0.5 });
        ring(x, y, last ? 1 : 0, R_EL); fx.cross(x, y - 1, last ? 5 : 3, R_EL, 0.15); hitDummy(last ? 1 : 0, 1);
        if (last) shake(0.12, 1);
        sfx('impact', { pal: 'fire', w: last ? 0.8 : 0.5 });
      }
    }
    if (s === DEATH && t === T_PLOW) {                                                    // 獠牙插进地里犁出一道土沟
      const tp = tuskTip(rig), x = scrX(tp[0] + P.bx);
      fx.crack(x - 6, HY, 9, 1, FXI.earth, 1.4, 0);
      for (let i = 0; i < 16; i++) spawn(K_DUST, x - 8 + Math.random() * 14, HY, (Math.random() - 0.3) * 34, -5 - Math.random() * 9, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.8 });
    }
    if (s === DEATH && t === T_WLAND) { const [x] = hubScr(); burst(x, HY - 1, 6, 20, 60, 0.1, 0.25, FXI.steel, 10); sfx('hit', { mat: 'metal', w: 0.35 }); }
    if (s === DEATH && t === T_WFLAT) { const [x] = hubScr(); for (let i = 0; i < 5; i++) spawn(K_DUST, x - 4 + i * 2, HY, (i - 2) * 6, -3, 0.3, FXI.dust); sfx('hit', { mat: 'metal', w: 0.2 }); }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 7, 30, 80, 0.2, 0.4, R_BRISTLE, 12);
  }
  const EVENTS = [[], [], T_SHOT, COIN_T.concat(COIN_ARRIVE), T_BOOM, [], [INCOMING], [T_PLOW, T_WLAND, T_WFLAT], []];
  function impactOn(k, x, y) {                                                            // 手里剑命中
    burst(x, y, 6, 30, 90, 0.12, 0.3, FXI.impact, 6); burst(x, y, 4, 30, 70, 0.1, 0.25, FXI.steel, 6);
    fx.cross(x, y, 3, FXI.steel, 0.12); hitDummy(0, 1); sfx('hit', { mat: 'metal', w: 0.35 });
  }
  function stepFX(dt, state, stT) {
    const [hx, hy] = hubScr();
    if (state === CHARGE && stT > 0.5) {                                                  // 白焰火星螺旋收进轴心
      chargeAcc += dt * (8 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 8 + Math.random() * 7; spawnX(K_SPIRAL_PT, hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.6, 0, 0, 0.5, R_EL, { a, r, w: 7, tx: hx, ty: hy }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                              // 重蹄：每个接触帧 3 颗尘 + 顿挫
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX((P.gf === 0 ? 10 : -6) + i * 2 - 2), HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 4, 0.3 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.8 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                                 // 磨獠牙：牙尖碰地冒一颗尘
      const k = P.bx; if (P.head === 3 && k !== lastK) { const tp = tuskTip(rig); spawn(K_DUST, scrX(tp[0] + P.bx), HY, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); }
      lastK = k;
    }
    if (state === DEATH && stT > INCOMING + 1.55 && stT < INCOMING + 2.4) {
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-14 + Math.random() * 30), HY - 1 - Math.random() * 10, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); }
    }
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastK = -1; castHub = [0, 0]; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 金币（2×2 金 + 高光，翻面时 1×2）
  function coin(x, y, f) { x = R(x); y = R(y); if (f) { put(x, y, CO[1]); put(x, y + 1, CO[2]); return; } put(x, y, CO[0]); put(x + 1, y, CO[1]); put(x, y + 1, CO[2]); put(x + 1, y + 1, CO[3]); }
  // 候选部件：bladePiglet —— 套着手里剑的自爆步兵：3×3 橙色小猪团身在中心，四角刃尖按 + / × 交替旋转，尾巴一格引信火星（屏幕坐标）
  function bladePiglet(x, y, f12) {
    x = R(x); y = R(y);
    const sp = f12 & 1, tips = sp ? [[1, 1], [-1, 1], [1, -1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [a, b] of tips) { put(x + a * 2, y + b * 2, ST[2]); put(x + a * 3, y + b * 3, ST[1]); }
    put(x - 1, y - 1, FI[1]); put(x, y - 1, FI[1]); put(x + 1, y - 1, FI[2]); put(x - 1, y, FI[2]); put(x, y, FI[2]); put(x + 1, y, 20);
    put(x - 1, y + 1, FI[3]); put(x, y + 1, FI[3]); put(x + 1, y + 1, FI[3]); put(x, y, 0);   // 身、吻、墨点眼
    put(x - 2, y - 2, (f12 & 1) ? EL[0] : EL[1]);
  }
  function fxFront(f12) {
    const tau = skillT();
    if (tau >= 0 && tau < DUR[CHARGE]) {                                                  // 蓄力：金币冒出 → 螺旋飞进转轮
      const [hx, hy] = hubScr();
      for (let i = 0; i < 6; i++) {
        const s = tau - COIN_T[i]; if (s < 0 || tau >= COIN_ARRIVE[i]) continue;
        const x0 = hx + COIN_DX[i], y0 = HY - 2;
        if (s < COIN_FLY) { coin(x0, y0 - R(clamp01(s / 0.1) * 2), (f12 + i) & 1); continue; }
        const q = ease.in(clamp01((s - COIN_FLY) / COIN_IN)), dx = x0 - hx, dy = y0 - 2 - hy, r = Math.hypot(dx, dy) * (1 - q), a = Math.atan2(dy, dx) + q * 4.5 * (dx < 0 ? 1 : -1);
        coin(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.8, (f12 + i) & 1);
      }
    }
    const tc = tau - DUR[CHARGE];
    if (tau >= 0 && tc >= 0) for (let i = 0; i < 4; i++) {                                 // 施放：4 只自爆步兵高抛物线甩出
      const s = tc - T_OUT[i]; if (s < 0 || tc >= T_BOOM[i]) continue;
      const q = clamp01(s / FLY), x = lerp(castHub[0], BOOM_X[i], q), y = lerp(castHub[1], HY - 3, q) - Math.sin(Math.PI * q) * (14 + i * 2);
      bladePiglet(x, y, f12 + i);
    }
  }
  // 飞行中的手里剑：四臂风车，+ / × 交替旋转，金色白热芯
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 0) return false;
    const sp = f12 & 1;
    const arms = sp ? [[1, -1, 1, 0], [1, 1, 0, 1], [-1, 1, -1, 0], [-1, -1, 0, -1]] : [[0, -1, 1, -1], [1, 0, 1, 1], [0, 1, -1, 1], [-1, 0, -1, -1]];
    for (const [a, b, c, e] of arms) { put(x + a, y + b, ST[2]); put(x + a * 2, y + b * 2, ST[1]); put(x + a + c, y + b + e, ST[3]); }
    put(x, y, EL[1]);
    return true;
  }

  return {
    name: '白牙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.core, m.spark], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'metal', style: 'summon', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
