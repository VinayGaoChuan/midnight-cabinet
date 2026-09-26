// 沙漠信徒（部队 · 兽人 · 牧师 · 优质）：瘦削微驼的苦行者，沙驼长袍（翠色蛇鳞纹边）、尖顶沙漠兜帽 + 脑后一条靛蓝长垂巾、靛蓝面巾只露一双翠光眼、
// 腰后挂葫芦水壶；前手拄一根眼镜蛇头杖（铜蛇头、蛇眼嵌翠石、杖身 5 颗法力珠、兜帽下挂一串铜铃）。
// 攻击 = 单手把蛇头杖前指，蛇口吐出一颗翠色光弹；技能 = 特性「治疗链」生效：杖插在身前，法力珠从下往上一颗颗亮满，蛇口吐出光弹，
// 打中第 1 个友军后化成一条蛇形翠光，依次弹到另外 3 个友军（每跳一次冒一个翠色十字）。
// 升级成「蛇神使者」（SnakeGodMessenger.js）：同一个人被蛇神选中——兜帽长成眼镜蛇兜帽、下半身化成蛇尾，面巾、垂巾、蛇杖都保留。
PCD.define('DesertBeliever', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, allyPoints, allyFx, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：治疗链 · 蛇神翠（偏蓝的翠绿）─────
  const JADE = ['#c8ffe8', '#5ee0a8', '#1f9a78', '#0e4a44'];
  const R_EL = fxRamp('serpjade', [21].concat(JADE)), EL = FXR[R_EL];
  const R_SAND = FXI.earth, R_DUST = FXI.dust;

  // ───── 材质 ─────
  const ROBE = ['#2a1a0c', '#6a4a24', '#a8804a', '#d8b87a'], SKIN = ['#121a14', '#2e4a38', '#4a7058', '#70987a'];
  const M = parts.mats(E, {
    robe: { r: ROBE, band: 2 }, hood: ROBE, scale: [JADE[3], JADE[3], JADE[2], JADE[1]], bead: { r: [0, JADE[3], JADE[2], JADE[0]], flat: 1 }, veil: 'blue', skin: SKIN, sandal: 'leather', rope: 'leather',
    gourd: 'wood', cap: 'gold', wood: 'wood', copper: 'gold', bell: 'gold',
    eye: { r: [JADE[3], JADE[2], JADE[1], JADE[0]], flat: 1 }, glow: { r: [JADE[1], JADE[0], 21, 21], flat: 1 },
    sand: { r: 'sand', band: 2 },
  });
  const BODY = { body: 'standard', leg: 8, torso: 9, hunch: 1, sw: 3, limb: 0.9, stride: 2 };
  const STAFF = { wood: M.wood, metal: M.copper, eye: M.eye, glow: M.glow, bead: M.bead, bell: M.bell, len: 9, back: 11 };
  const STAFF_MATS = new Uint8Array(256); for (const k of ['wood', 'copper', 'eye', 'glow', 'bell', 'bead']) { STAFF_MATS[M[k]] = 1; STAFF_MATS[M[k + 'D']] = 1; }
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 56, 34, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'eye', 'glow', 'bead', 'skin', 'veil', 'bell', 'copper', 'sand']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const ALLY_X = [5, 16, 56, 69], ORDER = [3, 2, 1, 0];               // 四个友军：身后两个、身前两个；治疗链按最近顺序：69 → 56 → 16 → 5

  // ═════ 候选部件：cobraStaff 眼镜蛇头杖 ═════
  // 一根上段微弯的木杖（1 格），杖身嵌 5 颗法力珠，杖首是一条张开兜帽的铜眼镜蛇（兜帽宽 5 格、头朝前、蛇眼是发光体），兜帽下挂两只铜铃。
  // o = { wood, metal 铜蛇, eye 蛇眼 / 法力珠（flat）, glow 点亮后的发光材质（flat）, bell, len 握点到杖顶, back 握点到杖尾, bow 上段弯度, at / a / free / rot（掉在地上时蛇头按 90° 转）}
  // 读 P：a（杖角，0 = 竖直）gem（蛇眼 0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）jaw（0 / 1 张嘴）mana（亮起的法力珠 0–5，从下往上）bell（铃摆 -1..1）glint
  //      sb（握点沿杖身上移的格数：双手举高握杖时，杖首跟着降低、杖尾变长）。杖尾低于地面（y > 0）的部分插在沙里不画，插进去时杖脚堆起一小圈沙。
  // 两个部件：杖身（含法力珠）→ 蛇头（含蛇眼、铃）。坐标：u 朝前、v 向上为负，相对杖顶。
  // 蛇头在上、朝前：吻伸出兜帽前沿 3 格（u 3..5），下颌下面留出台阶，剪影里是一个往前勾的「？」；
  // 兜帽在头后张开成倒水滴（宽 5 格：u -2..2），上沿升到头后，往下收成 1 格的颈接杖顶
  const COBRA = [[-12, 0, 1], [-11, -1, 3], [-10, -2, 5], [-9, -2, 5], [-8, -2, 2], [-7, -2, 2], [-6, -2, 2], [-5, -2, 1], [-4, -1, 1], [-3, -1, 0], [-2, 0, 0], [-1, 0, 0]];
  const COBRA_OPEN = [[-12, 0, 1], [-11, -1, 5], [-10, -2, 2], [-9, -2, 4], [-8, -2, 2], [-7, -2, 2], [-6, -2, 2], [-5, -2, 1], [-4, -1, 1], [-3, -1, 0], [-2, 0, 0], [-1, 0, 0]];
  const BEADS = [3, 6, 9, 14, 17];                                   // 法力珠离杖尾的格数（避开握点）
  const tfm = (R, r0, x, y) => ({ r0: r0 & 3, tx: R.tx + x, ty: R.ty + y, rot: R.rot, ox: R.ox, oy: R.oy });
  const tfree = (r0, x, y) => ({ r0: r0 & 3, tx: x, ty: y, rot: 0, ox: 0, oy: 0 });
  function cobraGeo(P, o) {
    const a = o.a != null ? o.a : P.a, gx = RD(o.at ? o.at[0] : P.hx), gy = RD(o.at ? o.at[1] : P.hy), dx = Math.sin(a), dy = -Math.cos(a);
    const sb = o.free ? 0 : (P.sb | 0), len = o.len - sb, back = o.back + sb;
    const tip = [RD(gx + dx * len), RD(gy + dy * len)], r0 = o.rot || 0, j = P.jaw ? 1 : 0;
    const loc = (u, v) => (r0 === 3 ? [tip[0] + v, tip[1] - u] : r0 === 1 ? [tip[0] - v, tip[1] + u] : [tip[0] + u, tip[1] + v]);
    return { gx, gy, dx, dy, tip, r0, back, len, base: [RD(gx - dx * back), RD(gy - dy * back)], eye: loc(1, -11), mouth: loc(6, -10) };
  }
  function cobraStaff(E, R, P, o) {
    const G = cobraGeo(P, o), T = o.free ? parts.FREE : R, back = G.back, len = G.len, total = back + len, bow = o.bow == null ? -1 : o.bow;
    const bx = G.gx - G.dx * back, by = G.gy - G.dy * back, nx = -G.dy, ny = G.dx, s0 = back / total;
    if (!o.free && G.base[1] >= 1) {                                 // 杖插进沙里：杖脚两边堆起一小圈沙
      const b = G.base[0]; E.part();
      for (const d of [-2, -1, 1, 2]) parts.px(E, T, b + d, 0, M.sand, Math.abs(d) === 1 ? 4 : 3);
      parts.px(E, T, b - 1, -1, M.sand, 4); parts.px(E, T, b + 1, -1, M.sand, 3);
    }
    E.part();
    let lx = null, ly = null;
    for (let k = 0; k <= total; k++) {
      const s = k / total, off = s > s0 ? bow * Math.sin(Math.PI * (s - s0) / (1 - s0)) : 0;
      const x = RD(bx + (G.tip[0] - bx) * s + nx * off), y = RD(by + (G.tip[1] - by) * s + ny * off);
      if (lx !== null && Math.abs(x - lx) > 1) parts.px(E, T, (x + lx) >> 1, y, o.wood, 3);
      const bi = BEADS.indexOf(k);
      if (bi >= 0) parts.px(E, T, x, y, o.bead, bi < (P.mana | 0) ? 4 : 2);
      else parts.px(E, T, x, y, o.wood, k === total || (k % 5) === 1 ? 4 : 3);
      lx = x; ly = y;
    }
    E.part();                                                        // 铜蛇头：兜帽 + 头 + 眼 + 铃
    const H = o.free ? tfree(G.r0, G.tip[0], G.tip[1]) : tfm(R, G.r0, G.tip[0], G.tip[1]), m = o.metal, j = P.jaw ? 1 : 0;
    for (const [v, u0, u1] of (j ? COBRA_OPEN : COBRA)) parts.run(E, H, v, u0, u1, m, 0);
    parts.px(E, H, -1, -7, m, 2); parts.px(E, H, 1, -7, m, 2); parts.px(E, H, 0, -6, m, 2); parts.px(E, H, 0, -5, m, 2);   // 兜帽上的眼镜纹
    parts.px(E, H, -2, -8, m, 4); parts.px(E, H, -2, -6, m, 4); parts.px(E, H, 1, -4, m, 2);
    if (j) { parts.px(E, H, 2, -10, m, 1); parts.px(E, H, 5, -11, m, 4); parts.px(E, H, 4, -9, m, 4); parts.run(E, H, -9, 1, 3, m, 2); }   // 张嘴：喉口一格暗、上下各一颗牙
    else { parts.run(E, H, -9, 1, 4, m, 2); parts.px(E, H, 4, -10, m, 4); parts.px(E, H, 5, -10, m, 3); }   // 合嘴：下颌一行暗、吻尖高光
    const lv = CL(o.glowLv != null ? o.glowLv : P.gem | 0, 0, 4);
    if (lv === 4) parts.px(E, H, 1, -11, o.eye, 1);
    else if (lv >= 2) { parts.px(E, H, 1, -11, o.glow, lv === 3 ? 3 : 4); if (lv === 3) parts.px(E, H, 2, -11, o.glow, 4); }
    else parts.px(E, H, 1, -11, o.eye, lv === 1 ? 4 : 3);
    if (P.glint) parts.px(E, H, 1, -12, o.glow, 3);
    if (!o.free) {                                                  // 铜铃：兜帽右下挂两只，随 P.bell 摆
      const b = P.bell | 0; parts.px(E, H, 3, -3, o.bell, 2); parts.px(E, H, 3 + (b > 0 ? 1 : 0), -2, o.bell, 2);
      parts.rect(E, H, 3 + b, -1, 2, 2, o.bell, 0); parts.px(E, H, 3 + b, -1, o.bell, 4); parts.px(E, H, 4 + b, 1, o.bell, 2);
      parts.px(E, H, 5 + b, 2, o.bell, 3); parts.px(E, H, 5 + b, 3, o.bell, 2);
    }
    return G;
  }
  // ───── 姿势 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, jaw: 0, mana: 0, bell: 0, sb: 0, sand: 0, pile: 0, sa: 0, slift: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -12, 0, -3, -8);                               // 前手拄杖，后手垂在身侧
  const K_PRAY = K(7, -12, 0, 6, -16, 1, 1);                        // 待机个性：双手扶杖，低头把额头贴在杖上
  const K_WIND = K(5, -13, -0.35, -3, -9, -1, 0);                    // 攻击预兆：杖往回收
  const K_POINT = K(10, -15, 0.9, -4, -10, 1, 0);                    // 出手：单手把蛇头杖前指
  const K_HOLD = K(9, -14, 0.7, -4, -9, 1, 0);
  const K_RAISE = K(9, -16, 0, 9, -20, -1, -1);                     // 蓄力起手：双手把杖提高
  const K_PLANT = K(10, -13, 0, 10, -17, 0, -1);                     // 蓄力：杖往下一戳插进身前的沙里（握点上移 SB_PLANT 格），双手握杖，仰头看蛇眼
  const K_CAST = K(10, -13, 0, 10, -17, 1, 0, 1);                    // 施放：身体压向杖，杖再往沙里吃进 1 格
  const SB_PLANT = 3;                                                // 握点到杖尾 11 + 3 = 14：杖脚落在 y +1（插进地面 1 格）
  const K_HURT = K(6, -11, -0.25, -4, -10, -1, -1);
  const K_KNEEL = K(7, -9, 0, 7, -12, 1, 1, 4);                      // 死亡：拄杖跪下
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 31], ['hy', -40, 8], ['a', -32, 32, 1 / ASTEP], ['bhx', -16, 31], ['bhy', -40, 8], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['jaw', 0, 1], ['mana', 0, 5], ['bell', -1, 1], ['sb', 0, 4], ['sand', 0, 9], ['pile', 0, 5], ['sa', 0, 3], ['slift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], BELL_IDLE = [0, 1, 0, -1];
  const WALK_STAFF = [2, 1, 0, 2], WALK_SLIFT = [0, 0, 0, 1];         // 拄杖缓行：接触 A 杖点地，之后杖留在原地（相对身体往后），经过 B 提杖前送
  const T_PLANT = 3 / 12, T_PULL = 2 / 12, T_REL = 2 / 12, T_KNEE = INCOMING + 0.3, T_PILE = INCOMING + 1.1, T_REST = INCOMING + 1.25;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.jaw = 0; P.mana = 0; P.bell = 0; P.sb = 0; P.sand = 0; P.pile = 0; P.sa = 0; P.slift = 0;
    let sl = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.bell = BELL_IDLE[Math.floor(TT * 2.5 + 1e-6) & 3] * (b & 1 ? 0 : 1);
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const q = lp < 1.7 ? 0.5 : 1; setK(K_IDLE, K_PRAY, q); P.eyes = lp >= 1.7 ? 1 : 0; P.bell = ((f12 & 1) ? 1 : -1); P.beard = 1; P.glint = lp >= 1.75 && lp < 1.92 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 拄杖缓行：步子小，袍摆左右摆；每两步杖点地一次
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.hx += WALK_STAFF[f] - 1; sl = WALK_SLIFT[f]; P.bhx += P.step; P.bell = f === 0 ? 1 : f === 2 ? -1 : 0; P.beard = -1 - (f & 1);
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < T_REL + 1 / 12) { setK(K_POINT, K_POINT, 0); P.gem = 2; P.jaw = 1; P.rim = 2; P.beard = -2; P.sway = -1; P.bell = 1; }
      else if (tq < 0.45) { setK(K_POINT, K_HOLD, ease.out((tq - T_REL - 1 / 12) / 0.2)); P.gem = 1; P.beard = -1; P.bell = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                        // 双手提杖 → 往下一戳插在身前的沙里：法力珠每 0.25 s 亮一颗，铜铃越摇越快
      if (tq < 2 / 12) setK(K_IDLE, K_RAISE, ease.out(tq / (2 / 12)));
      else if (tq < T_PLANT) setK(K_RAISE, K_PLANT, 0.5);
      else { setK(K_PLANT, K_PLANT, 0); P.sb = SB_PLANT; }
      P.mana = Math.min(5, Math.floor(tq / 0.25 + 1e-6)); P.gem = P.mana >= 5 ? 2 : 1; P.rim = 2;
      const sp = tq < 0.6 ? 3 : tq < 1.0 ? 2 : 1; P.bell = [0, 1, 0, -1][Math.floor(f12 / sp) & 3] || 0; P.beard = -1 + ((f12 & 1) && tq > 1.0 ? 1 : 0); P.sway = tq > 1.1 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST) {
      setK(K_PLANT, K_CAST, ease.out(clamp01(tq / 0.12))); P.sb = SB_PLANT; P.mana = 5; P.gem = 3; P.rim = 3; P.jaw = tq < 2 / 12 ? 1 : 0; P.beard = -2; P.sway = -1; P.bell = (f12 & 1) ? 1 : -1;
    } else if (st === RECOVER) {                                       // 收招：法力珠一起熄灭，把杖从沙里拔起（杖往上一提 2 格）
      if (tq < T_PULL) { setK(K_CAST, K_CAST, 0); P.sb = SB_PLANT; P.mana = 5; P.gem = 2; P.rim = 2; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - T_PULL) / 0.45)); setK(K_CAST, K_IDLE, q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; sl = tq < T_PULL + 2 / 12 ? 2 : tq < T_PULL + 3 / 12 ? 1 : 0; P.beard = -RD(1 - q); }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.bell = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.bell = -1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 化沙：拄杖跪下 → 从下往上变成沙 → 塌成沙堆 → 风把沙吹散 → 蛇杖倒在沙堆上
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.bell = 1; }
      else if (d < 1.1) {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.gem = (f12 & 1) ? 1 : 0;
        if (d >= 0.45) P.sand = Math.min(9, 1 + Math.floor((d - 0.45) * 12 + 1e-6));
      } else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.sand = 9;
        P.pile = d < 1.3 ? 1 : d < 1.45 ? 2 : d < 1.6 ? 3 : d < 1.8 ? 4 : 5;
        P.sa = d < 1.15 ? 1 : d < 1.2 ? 2 : 3; P.slift = d < 1.2 ? 0 : d < T_REST - INCOMING ? 2 : d < T_REST - INCOMING + 1 / 12 ? 1 : 0;
        P.gem = d < 1.5 ? ((f12 & 1) ? 1 : 0) : d < 1.8 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.9) P.dq = clamp01((d - 1.9) / 0.6);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + (P.crouch >= 4 ? 0 : Math.min(3, RD(P.crouch)));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo - sl; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = P.pile ? pileStaff().eye : cobraGeo(P, STAFF).eye; P.gx = g[0] + P.bx; P.gy = g[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 垂巾：从兜帽下的后脑垂到腰下，离开后背 1–3 格（改变外轮廓），尖端随 P.beard 摆
  function drape(R) {
    E.part(); const x0 = R.hx0, y0 = R.hy + 1, L = 6, b = P.beard, X = (t) => RD(x0 - 2.5 - 5.5 * Math.pow(t, 0.9) + b * t * t * 1.4);
    for (let k = 0; k <= L; k++) {
      const t = k / L, xr = X(t), w = k < 2 ? 3 : k < L ? 2 : 3;
      parts.run(E, R, y0 + k, xr - w + 1, xr, M.veil, 0);
      if (k > 1 && k < L && (k & 1)) parts.px(E, R, xr - 1, y0 + k, M.veil, 2);
    }
    const xe = X(1); parts.px(E, R, xe - 2, y0 + L + 1, M.veil, 3); parts.px(E, R, xe, y0 + L + 1, M.veil, 2);   // 垂巾末端两缕流苏
  }
  // 长袍下摆的翠色蛇鳞纹边（和躯干同一部件：只是镶边的明暗，不压分界线）
  function scaleHem(R, tor) {
    const [LL, RR] = tor.rows, y0 = tor.y0, hem = tor.hem, I = (y) => CL(y, y0, hem) - y0;
    for (let x = LL[I(hem)]; x <= RR[I(hem)]; x++) if ((((x - (P.sway | 0)) % 4) + 4) % 4 !== 0) parts.px(E, R, x, hem, M.scale, (x & 1) ? 2 : 3);
    for (let x = LL[I(hem - 1)] + 1; x < RR[I(hem - 1)]; x++) if ((x & 1) === 0) parts.px(E, R, x, hem - 1, M.scale, 3);
  }
  // 葫芦水壶：挂在后腰，下半截鼓出袍子的后沿 2 格
  function gourd(R, tor) {
    const [LL] = tor.rows, y0 = tor.y0, I = (y) => CL(y, y0, tor.hem) - y0, yb = R.yWaist, yw = yb + 2, bx = LL[I(yw + 4)], sw = RD((P.sway | 0) * 0.5);
    E.part();
    parts.line(E, R, LL[I(yb)] + 1, yb + 1, bx + 1, yw, M.rope, 3);                                  // 挂绳：从腰带垂到后腰
    parts.px(E, R, bx, yw + 1, M.cap, 4); parts.rect(E, R, bx - 1 + sw, yw + 2, 2, 2, M.gourd, 0);
    parts.rect(E, R, bx - 2 + sw, yw + 4, 3, 3, M.gourd, 0); parts.px(E, R, bx - 1 + sw, yw + 7, M.gourd, 2); parts.px(E, R, bx - 2 + sw, yw + 4, M.gourd, 4);
    parts.px(E, R, bx + sw, yw + 3, M.rope, 2);
  }
  // 面巾：靛蓝布遮住口鼻，只露一双眼（和脸同一部件）
  function mask(R) {
    const x0 = R.hx0, x1 = R.hx1, ey = R.ey, bot = R.hy, b = P.beard | 0;
    for (let y = ey + 1; y <= bot; y++) parts.run(E, R, y, x0 + 2, x1, M.veil, 0);
    parts.px(E, R, x1 + 1, ey + 1, M.veil, 4); parts.px(E, R, x1 + 1, ey + 2, M.veil, 3);
    parts.run(E, R, bot + 1, x1 - 2 + (b < 0 ? 0 : 0), x1, M.veil, 2); parts.px(E, R, x1 - 1, ey + 2, M.veil, 2);
  }
  // 死亡的沙堆：从右边被风吹走，越来越小；蛇杖倒在沙堆上
  const PILE = [[0, 0, 0], [15, 6, 0], [14, 5, -1], [12, 4, -2], [9, 3, -4], [6, 2, -6]];      // 宽、高、中心偏移
  function pileTop(x) { const p = PILE[P.pile], c = -3 + p[2], hw = p[0] / 2; const q = (x - c) / hw; return q < -1 || q > 1 ? 0 : RD(p[1] * (1 - q * q) + (x > c ? 0 : 0.3)); }
  const PSTAFF = Object.assign({}, STAFF, { at: [0, 0], a: 0, rot: 0, free: 1 });
  function pileOpt() {                                               // 沙堆上的蛇杖：先往后倾倒（蛇头保持竖直），最后平躺在沙堆上（蛇头按 90° 转、脸朝上）
    const lie = P.sa >= 3; PSTAFF.a = P.sa === 1 ? -0.6 : P.sa === 2 ? -1.1 : -HALF; PSTAFF.rot = lie ? 3 : 0;
    PSTAFF.at[0] = lie ? 3 : 5; PSTAFF.at[1] = lie ? -Math.max(1, pileTop(2)) - 1 - (P.slift | 0) : -9; return PSTAFF;
  }
  function pileStaff() { return cobraGeo(P, pileOpt()); }
  function drawPile() {
    const p = PILE[P.pile], c = -3 + p[2], hw = p[0] / 2;
    E.part();
    for (let x = Math.floor(c - hw); x <= Math.ceil(c + hw); x++) { const h = pileTop(x); for (let y = -h; y <= 0; y++) parts.px(E, parts.FREE, x, y, M.sand, 0); if (h > 1 && ((x * 7) % 5) === 0) parts.px(E, parts.FREE, x, -h + 1, M.sand, 2); }
    for (let k = 1; k <= P.pile; k++) parts.px(E, parts.FREE, RD(c - hw) - k * 2, 0, M.sand, 3);          // 被吹走的沙拖出的尾巴
    cobraStaff(E, parts.FREE, P, pileOpt());
  }
  function drawHero() {
    E.begin(hero, P.bx, 0, 0);                                       // 贴地截断：插进沙里的杖脚不画
    if (P.pile) { drawPile(); return; }
    const R = parts.rig(P, BODY), bFront = P.bhx > 3;
    drape(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.robeD, hand: M.skinD, grip: bFront ? 'none' : 'fist' });
    parts.legs(E, R, P, { style: 'sandal', mat: M.skin, matD: M.skinD, boot: M.sandal, bootD: M.sandalD });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.scale, belt: M.rope, flare: 3.5, flareF: 2.5 });
    scaleHem(R, tor);
    gourd(R, tor);
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'back' });
    parts.head(E, R, P, { mat: M.skin, face: 'long', eye: M.eye, eyeStyle: 'glow', nose: 'none', mouth: 'none', ear: 'none' });
    mask(R);
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'front' });
    cobraStaff(E, R, P, STAFF);
    if (bFront) parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.robe, cuff: M.scale, hand: M.skin });
  }
  // 化沙：P.sand 行以下的身体换成沙色（交界处一行翠光），蛇杖不变
  const SANDMAP = new Uint8Array(256), JADEMAP = new Uint8Array(256);
  (function () {
    const S = E.RAMP.sand, lum = (c) => { const n = parseInt(E.PAL[c].slice(1), 16); return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; };
    for (let c = 0; c < 256; c++) { if (c >= E.PAL.length) { SANDMAP[c] = JADEMAP[c] = c; continue; } const l = lum(c); SANDMAP[c] = l > 0.62 ? S[3] : l > 0.4 ? S[2] : l > 0.2 ? S[1] : S[0]; JADEMAP[c] = l > 0.5 ? EL[1] : l > 0.25 ? EL[2] : EL[3]; }
  })();
  function sandify() {
    const s = hero, w = s.w, rowT = s.oy - RD(P.sand * 3.2);                   // 这一行以下是沙
    for (let y = Math.max(0, rowT - 1); y < s.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = s.out[i]; if (c === 255) continue; let m = s.mat[i];
      if (!m) { m = (x > 0 && s.mat[i - 1]) || (x < w - 1 && s.mat[i + 1]) || (y > 0 && s.mat[i - w]) || (y < s.h - 1 && s.mat[i + w]) || 0; }
      if (STAFF_MATS[m]) continue;
      s.out[i] = y === rowT - 1 && P.sand < 9 ? JADEMAP[c] : SANDMAP[c];
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); if (P.sand && !P.pile) sandify(); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chT = 9, chHop = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, windAcc = 0, lastStep = 0, lastF = -1, lastMana = 0;
  const CROSS_N = 4, crT = new Float32Array(CROSS_N).fill(9), crX = new Float32Array(CROSS_N), crY = new Float32Array(CROSS_N);
  const HOP = 0.12;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function mouthW() { const G = cobraGeo(P, STAFF); return [wx(G.mouth[0] + P.bx), wy(G.mouth[1])]; }
  function allyAt(i) { const A = allyPoints(), a = A[ORDER[i]]; return a ? [a.x, a.mid - 2, a.top] : [70, HY - 10, HY - 16]; }
  function healCross(i) {                                             // 友军身上冒出翠色十字 + 上升光点
    const a = allyAt(i); crT[i] = 0; crX[i] = a[0]; crY[i] = a[2] - 3;
    for (let k = 0; k < 7; k++) spawn(K_EMBER, a[0] - 4 + Math.random() * 8, a[1] + 4 - Math.random() * 8, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL);
    burst(a[0], a[1], 8, 20, 50, 0.2, 0.45, R_EL, 8);
    sfx('impact', { pal: 'nature', w: 0.3 + i * 0.05, n: i + 1 });  // 铃音一声比一声高（n = 第几跳）
  }
  function onEnter(s) {
    if (s === CAST) {
      const m = mouthW(), a = allyAt(0);
      releaseOrbit(40, 90, 0.3, 0.6);
      shoot(2, m[0] + 1, m[1], 110, a[0] - 1, R_EL, (a[1] - m[1]) * 110 / Math.max(6, a[0] - m[0]), { glow: 2 });
      fx.cross(m[0], m[1], 7, R_EL, 0.3); ring(m[0], m[1], 1, R_EL); burst(m[0], m[1], 22, 50, 120, 0.25, 0.6, R_EL, 10);
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'orb' });
    }
    if (s === CHARGE) lastMana = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {
      const m = mouthW(); mzT = 0; mzX = m[0]; mzY = m[1];
      shoot(1, m[0] + 1, m[1], 170, DUMMY_X - 3, R_EL); burst(m[0], m[1], 6, 30, 60, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'staff', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CHARGE && t === T_PLANT) {                               // 杖戳进沙里：杖脚扬起一圈沙
      const b = cobraGeo(P, STAFF).base, x = wx(b[0] + P.bx);
      for (let i = 0; i < 7; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, i & 1 ? R_SAND : R_DUST);
    }
    if (s === RECOVER && t === T_PULL) {                               // 拔杖：杖脚带起几颗沙
      const b = cobraGeo(P, STAFF).base, x = wx(b[0] + P.bx);
      for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY - 1, (Math.random() - 0.5) * 14, -8 - Math.random() * 8, 0.3 + Math.random() * 0.2, R_SAND);
    }
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_DUST); }
    if (s === DEATH && t === T_PILE) {                                 // 塌成一堆沙
      for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 10 + Math.random() * 18, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, R_SAND);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === T_REST) { for (let i = 0; i < 5; i++) spawn(K_DUST, HX + 2 - Math.random() * 14, HY - 3, (Math.random() - 0.5) * 16, -4 - Math.random() * 5, 0.3, R_SAND); sfx('hit', { mat: 'wood', w: 0.25 }); }
  }
  const EVENTS = [[], [], [T_REL], [T_PLANT], [], [T_PULL], [], [T_KNEE, T_PILE, T_REST], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); }
    else if (k === 2) {                                               // 光弹打中第 1 个友军：化成蛇形翠光往下一个友军跳
      chT = 0; chHop = 1; healCross(0); allyFx({ dur: 1.1, outline: R_EL }); ring(x, y, 0, R_EL); shake(0.12, 1);
    }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                           // 脚下沙粒螺旋卷到杖首 + 翠光环绕蛇头
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1;
        if (Math.random() < 0.55) { const r = 13 + Math.random() * 5; spawnX(K_SPIRAL_PT, 0, 0, r / (0.5 + Math.random() * 0.4), 0, 9, R_DUST, { a: HALF + (Math.random() - 0.5) * 0.9, r, w: 7 + Math.random() * 3, tx: gx - 1, ty: gy + 2, squash: 1.45 }); }
        else { const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
      }
      if (P.mana !== lastMana) { if (P.mana > lastMana) { const G = cobraGeo(P, STAFF), total = G.back + G.len, k = BEADS[P.mana - 1], bx = G.base[0], by = G.base[1]; const px = wx(RD(bx + (G.tip[0] - bx) * k / total) + P.bx), py = wy(RD(by + (G.tip[1] - by) * k / total)); burst(px, py, 5, 15, 35, 0.15, 0.3, R_EL, 4); } lastMana = P.mana; }
    }
    if (chT < 1) {                                                    // 治疗链：每 0.12 s 跳一次
      chT += dt;
      while (chHop < 4 && chT >= chHop * HOP) { healCross(chHop); chHop++; }
    }
    if (state === MOVE) { const f = E.gait(q12(stT)); if (f !== lastF) { if (f === 0 || f === 2) sfx('step', { w: 0.3 }); if (f === 0) { const G = cobraGeo(P, STAFF); spawn(K_DUST, scrX(RD(G.gx - G.dx * STAFF.back) + P.bx), HY, (Math.random() - 0.5) * 10, -4 - Math.random() * 4, 0.3, R_DUST); } if (f === 0 || f === 2) spawn(K_DUST, scrX(f === 0 ? 3 : -3) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25, R_DUST); lastF = f; } }
    if (state === IDLE) {                                             // 默祷：脚边飘起沙粒；蛇眼余烬
      const lp = q12(stT) % DUR[IDLE]; if (lp >= 1.6 && lp < 1.62) for (let i = 0; i < 2; i++) spawn(K_EMBER, HX - 3 + i * 7, HY - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 4, 0.9, R_DUST);
      emberAcc += dt * 1.6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === RECOVER && stT < 0.2) { emberAcc += dt * 20; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.random() * 2 - 1, gy + 4 + Math.random() * 14, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.2 && stT < INCOMING + 2.1) {   // 风从右往左把沙吹散
      windAcc += dt * 34; while (windAcc >= 1) { windAcc -= 1; spawnX(K_BURST, HX - 2 + Math.random() * 8, HY - 1 - Math.random() * 5, -40 - Math.random() * 40, -6 - Math.random() * 10, 0.5 + Math.random() * 0.5, Math.random() < 0.6 ? R_DUST : R_SAND, {}); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 14, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; for (let i = 0; i < CROSS_N; i++) crT[i] += dt;
  }
  function fxReset() { mzT = 9; chT = 9; chHop = 0; chargeAcc = 0; emberAcc = 0; soulAcc = 0; windAcc = 0; lastStep = 0; lastF = -1; lastMana = 0; crT.fill(9); }
  function fxBack(f12) { if (!P.pile && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 蛇形翠光：从 A 到 B 的正弦折线，长跳（越过信徒头顶）拱成一道弧；头部最亮、往后逐级变暗，到达后 0.25 s 断续熄灭
  function serpLink(x0, y0, x1, y1, t, f12) {
    const head = clamp01(t / HOP), fade = t > HOP ? (t - HOP) / 0.25 : 0; if (fade >= 1) return;
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, bow = L > 24 ? L * 0.62 : L * 0.15, n = Math.ceil(L * 1.6);
    for (let k = 0; k <= n; k++) {
      const s = k / n; if (s > head) break; if (fade > 0 && ((k + f12) & 1)) continue;
      const w = Math.sin(2 * Math.PI * (1.5 * s) + f12 * 0.9) * 2.2 * Math.sin(Math.PI * s), x = x0 + dx * s + nx * w, y = y0 + dy * s + ny * w - bow * Math.sin(Math.PI * s);
      const back = (head - s) * L; put(RD(x), RD(y), fade > 0.5 ? EL[4] : fade > 0 ? EL[3] : back < 2 ? EL[0] : back < 6 ? EL[1] : back < 14 ? EL[2] : EL[3]);
    }
  }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.pile) {                    // 蛇眼星芒
      const L = P.gem === 3 ? 6 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (chT < 1) for (let i = 0; i < 3; i++) { const a = allyAt(i), b = allyAt(i + 1); serpLink(a[0], a[1], b[0], b[1], chT - i * HOP, f12); }
    for (let i = 0; i < CROSS_N; i++) {                                         // 翠色十字（中心 + 上下左右，边长 2），往上飘 0.6 s
      const t = crT[i]; if (t >= 0.6) continue; const x = RD(crX[i]), y = RD(crY[i] - t * 10), c0 = t < 0.1 ? EL[0] : t < 0.3 ? EL[1] : EL[2], c1 = t < 0.3 ? EL[1] : t < 0.45 ? EL[2] : EL[3];
      if (t > 0.45 && (f12 & 1)) continue;
      put(x, y, c0); for (let r = 1; r <= 2; r++) { put(x + r, y, c1); put(x - r, y, c1); put(x, y - r, c1); put(x, y + r, c1); }
    }
  }
  function drawShot(k, x, y, d, f12, R) {                              // 翠色光弹：亮芯 + 一条左右扭动的蛇形尾巴
    if (k === 1) { put(x, y, R[0]); put(x + d, y, R[0]); put(x, y - 1, R[1]); put(x, y + 1, R[1]); const s = (x >> 1) & 1 ? 1 : -1; put(x - d, y + s, R[1]); put(x - 2 * d, y, R[2]); put(x - 3 * d, y - s, R[2]); put(x - 4 * d, y, R[3]); return true; }
    if (k === 2) {
      put(x, y, R[0]); put(x + d, y, R[0]); put(x, y - 1, R[0]); put(x, y + 1, R[1]); put(x + d, y - 1, R[1]); put(x + d, y + 1, R[1]); put(x + 2 * d, y, R[1]); put(x - d, y, R[1]); put(x, y - 2, R[2]); put(x, y + 2, R[2]);
      for (let i = 2; i <= 6; i++) { const s = Math.round(Math.sin((x - i * d) * 0.9 + f12) * 1.5); put(x - i * d, y + s, i < 4 ? R[1] : i < 6 ? R[2] : R[3]); }
      if (f12 & 1) { put(x + d, y - 2, R[0]); put(x - d, y + 2, R[0]); }
      return true;
    }
    return false;
  }

  return {
    name: '沙漠信徒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.glow], HIT_POINT: [1, -13], EVENTS,
    ALLIES: 'skill', ALLY_X,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'nature', style: 'heal', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
