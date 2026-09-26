// 魔王近卫（部队 · 自然 · 守护者 · 史诗）：苦痛盾卫的最终形态——同一个人接纳了痛苦：高大的黑曜重甲，倒三角（肩宽腰细），头相对小；
// 背后悬浮一圈 8 柄黑红剑组成的剑轮（剑扇 → 剑轮），角盔（同款紫色独眼横缝 + 一对向前弯的黑角），左手魔面塔盾（獠牙魔脸、盾顶两根尖刺），
// 右手单手魔焰巨剑（黑刃红纹、护手一对小角），胸口还嵌着那两柄猩红穿身刃，被黑甲包住只露刃尖。
// 攻击 = 扫（塔盾立在身前，巨剑从后往前水平横扫）；技能 = 特性「剑刃风暴」：剑轮越转越快 → 整圈脱离后背飞向目标 → 化成旋转剑刃龙卷 → 飞回背后。
PCD.define('DemonKingsGuard', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_SPIRAL, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：剑刃风暴 · 魔焰黑红（shadow 和 blood 混合：21 白 → 58 淡红 → 57 猩红 → 52 墨紫 → 0 墨）─────
  const R_EL = fxRamp('demonblade', [21, 58, 57, 52, 0]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    armor: { r: ['#07060a', '#1a1620', '#2e2836', '#4c4258'], band: 2 },   // 黑曜重甲（躯干，大面积）
    arm: ['#07060a', '#1a1620', '#2e2836', '#4c4258'],                      // 同色小块（盔、臂、腿、肩甲）
    red: 'crimson', blade: ['#2a0508', '#6e0e16', '#c0202c', '#ff6a6a'], gold: 'gold', iron: 'iron',
    horn: [0, 8, 7, 18], fang: 'bone', wood: 'wood', wheel: 'shadow',
    rune: { r: [55, 56, 57, 58], flat: 1 },                                  // 巨剑 / 剑轮的红纹（发光体）
    eye: { r: [25, 42, 24, 43], flat: 1 },                                   // 盔缝紫色独眼
    meye: { r: [55, 57, 58, 21], flat: 1 },                                  // 盾面魔脸的双眼
  });
  const BODY = { body: 'giant', head: 6, headW: 6, waist: 1.2 };
  const SWORD = { style: 'great', metal: M.arm, edge: M.red, trim: M.horn, wood: M.wood, glow: M.rune, len: 14 };
  const HX = 74, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(92, 62, 38, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 21], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'rune', 'eye', 'meye', 'horn', 'fang', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // 剑轮：8 柄剑，剑尖朝外；两组吸附方向交替 = 转一格
  const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
  const DANG = DIRS.map((d) => Math.atan2(d[0], -d[1]));
  const WC = [-9, -28];                                                  // 剑轮中心（精灵本地，背后上方）

  // ───── 姿势：前手（近侧）= 魔焰巨剑；后手（远侧）= 魔面塔盾（盾心 = 后手）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, wheel: 1, wrot: 0, wb: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -13, 2.7, 9, -12);                 // 巨剑斜垂在身前，塔盾立在身前
  const K_REST = K(3, -22, -0.45, 9, -12);               // 待机个性：巨剑搭在肩上
  const K_WIND = K(-6, -17, -1.6, 10, -13, -1, 0, 1);    // 巨剑拉到身后
  const K_SWEEP = K(12, -16, 1.62, 10, -12, 1, 1);       // 水平横扫到身前
  const K_HOLD = K(11, -14, 2.0, 10, -12, 1);
  const K_CHARGE = K(4, -19, -0.2, 10, -13, -1, -1);     // 巨剑竖在身前，盾面魔眼亮
  const K_CAST = K(13, -19, 1.57, 9, -13, 1, 1);         // 巨剑向前一指
  const K_HURT = K(3, -12, 3.0, 7, -12, -1, -1);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['wheel', 0, 2], ['wrot', 0, 1], ['wb', -1, 1]]);
  const T_SWEEP = 2 / 12, T_BREAK = INCOMING + 0.5, T_THUD = INCOMING + 0.95, T_FLY = 0.15, T_BACK = 0.4;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.wheel = 1; P.wrot = 0; P.wb = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      P.wrot = Math.floor(tq / 0.4 + 1e-6) & 1;                          // 剑轮缓慢转动：每 0.4 s 转一格
      const lp = tq % DUR[IDLE];                                        // 待机个性：把巨剑抬起来搭在肩上
      if (lp >= 1.2 && lp < 2.2) { const q = lp < 1.4 ? (lp - 1.2) / 0.2 : lp > 2.0 ? 1 - (lp - 2.0) / 0.2 : 1; setK(K_IDLE, K_REST, ease.inOut(clamp01(q))); P.glint = lp >= 1.5 && lp < 1.6 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 重踏：每一步顿挫 1 格，剑轮随步子轻晃
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); if (P.step !== 0) { P.crouch = 1; P.wb = P.step; }
      P.a = K_IDLE.a + P.step * 0.1; P.wrot = (Math.floor(tq / 0.4 + 1e-6)) & 1;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.wb = -1; }
      else if (tq < 0.2) { setK(K_SWEEP, K_SWEEP, 0); P.bx = 3; P.gem = 2; P.wb = 1; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_SWEEP, K_HOLD, q); P.bx = RD(3 - q); P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 剑轮越转越快（每帧 1 格 → 每帧 2 格）
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.wrot = tq < 0.7 ? (Math.floor(tq * 6 + 1e-6) & 1) : (f12 & 1); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.wb = tq > 1.0 ? ((f12 & 1) ? 1 : -1) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.7 ? 2 : 3;
    } else if (st === CAST) {                                           // 巨剑向前一指，剑轮整圈脱离后背
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.wheel = 0; P.gem = 3; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0; P.sway = -1;
    } else if (st === RECOVER) {                                        // 剑轮沿原路飞回背后
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.wheel = tq < T_BACK ? 0 : 1; P.wrot = f12 & 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.wb = -1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.rim = 0; P.wb = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 散架：剑轮先断开 → 死亡套件 parts（剑、角盔、塔盾、巨剑、肩甲各自飞出，空甲塌下）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.wb = -1; }
      else { setK(K_HURT, K_HURT, 0.3); P.bx = -2; P.eyes = 1; P.crouch = 2; P.wheel = 2; P.wrot = f12 & 1; P.gem = 4; if (tq >= T_BREAK) P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (st === CHARGE) { P.gx = WC[0] + P.bx; P.gy = WC[1] + yo; }       // 蓄力：发光体 = 背后越转越快的剑轮
    else { const f = parts.sword.focus(P, SWORD); P.gx = f[0] + P.bx; P.gy = f[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  function wheelSwords(R) {                                             // 候选部件：剑轮（n 柄剑绕一点排成圆、剑尖朝外，两组吸附方向交替 = 转一格；每柄一个部件，散架时各自飞出）
    const cx = WC[0] + R.lean, cy = WC[1] + R.bob + Math.min(3, R.cr) + P.wb, loose = P.wheel === 2 ? 2 : 0, lv = P.gem >= 1 && P.gem < 4 ? P.gem : P.gem === 4 ? 4 : 0;
    for (let i = 0; i < 8; i++) {
      const di = (i * 2 + P.wrot) & 15, a = DANG[di], ux = Math.sin(a), uy = -Math.cos(a), r = 3.5 + loose + (loose && (i & 1) ? 1 : 0);
      parts.sword(E, R, P, { style: 'long', metal: M.wheel, edge: M.red, trim: M.red, wood: M.arm, glow: M.rune, glowLv: lv, len: 6, guard: 3, at: [RD(cx + ux * r), RD(cy + uy * r)], a });
    }
    E.part(); parts.rect(E, R, cx - 1, cy - 1, 3, 3, M.gold, 0); parts.px(E, R, cx, cy, M.rune, lv >= 2 ? 4 : 3);   // 轮毂
  }
  const TS_W = [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 2];        // 塔盾每行半宽（高 16）
  function demonShield(R, cx, cy) {                                     // 候选部件：魔面塔盾（高 16、宽 9；金边、盾顶两根尖刺、浮雕獠牙魔脸，魔眼按 P.gem 亮）
    E.part(); const top = cy - 8, lv = P.gem;
    for (const sx of [-3, 3]) for (let k = 1; k <= 3; k++) parts.px(E, R, cx + sx + (k === 3 ? (sx < 0 ? -1 : 1) : 0), top - k, M.arm, k === 3 ? 4 : 0);   // 盾顶尖刺
    for (let r = 0; r < 16; r++) {
      const w = TS_W[r], y = top + r;
      for (let x = -w; x <= w; x++) { const rim = r === 0 || r === 15 || Math.abs(x) === w; parts.px(E, R, cx + x, y, rim ? M.gold : M.iron, rim ? ((r === 1 || r === 14) && Math.abs(x) === w ? 4 : 0) : 0); }
    }
    const fy = top + 3;                                                 // 魔脸：眉骨 → 双眼 → 鼻 → 獠牙大嘴
    parts.run(E, R, fy, cx - 3, cx - 1, M.iron, 4); parts.run(E, R, fy, cx + 1, cx + 3, M.iron, 4); parts.px(E, R, cx, fy + 1, M.iron, 4);
    for (const sx of [-2, 2]) { parts.px(E, R, cx + sx, fy + 2, M.meye, lv === 4 ? 1 : lv >= 2 ? 4 : lv === 1 ? 3 : 2); parts.px(E, R, cx + sx + (sx < 0 ? -1 : 1), fy + 2, M.iron, 1); }
    parts.px(E, R, cx, fy + 3, M.iron, 4); parts.px(E, R, cx, fy + 4, M.iron, 2); parts.px(E, R, cx - 1, fy + 5, M.iron, 2); parts.px(E, R, cx + 1, fy + 5, M.iron, 2);
    parts.run(E, R, fy + 6, cx - 3, cx + 3, M.iron, 1); parts.run(E, R, fy + 7, cx - 2, cx + 2, M.iron, 1);
    for (const sx of [-2, 2]) { parts.px(E, R, cx + sx, fy + 6, M.fang, 4); parts.px(E, R, cx + sx, fy + 7, M.fang, 3); parts.px(E, R, cx + sx, fy + 8, M.fang, 3); }
    parts.px(E, R, cx - 3, top + 1, M.iron, 4); parts.px(E, R, cx - 3, top + 12, M.iron, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    if (P.wheel) wheelSwords(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armD, pauldron: M.armD, trim: M.redD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.arm, matD: M.armD, boot: M.arm, bootD: M.armD, bootH: 3 });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.armor, belt: M.red, buckle: M.gold });
    { const c = tor.chest; for (const [dx, dy] of [[-3, -2], [-2, -1], [-1, 0], [-3, 4], [-2, 5], [2, 6], [3, 7]]) parts.px(E, R, c[0] + dx, c[1] + dy, M.red, 3); }   // 甲缝猩红（和躯干同一部件）
    E.part(); { const f = parts.edges(R, R.yS + 3)[1]; for (const [dx, dy, t] of [[1, 3, 4], [2, 2, 3], [1, 7, 4], [2, 8, 3]]) parts.px(E, R, f + dx, R.yS + dy, M.blade, t); }   // 胸口嵌着的穿身刃尖（被黑甲包住，只露刃尖）
    parts.horns(E, R, P, { mat: M.horn, size: 7, curve: 'crescent', band: M.red, y: 3 });
    parts.helm(E, R, P, { style: 'great', mat: M.arm, trim: M.red, eye: M.eye });
    demonShield(R, P.bhx, P.bhy);                                       // 远侧手的魔面塔盾立在身前
    parts.sword(E, R, P, SWORD);
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.arm, hand: M.arm, grip: 'big' });
    E.part(); { const x = R.sFx, y = R.sFy;                              // 巨大肩甲：7 格宽的圆顶 + 猩红镶边 + 一根尖角
      parts.run(E, R, y - 5, x - 1, x + 1, M.arm, 0); parts.run(E, R, y - 4, x - 3, x + 2, M.arm, 0); parts.run(E, R, y - 3, x - 3, x + 3, M.arm, 0); parts.run(E, R, y - 2, x - 3, x + 3, M.arm, 0);
      parts.run(E, R, y - 1, x - 3, x + 3, M.red, 0); parts.px(E, R, x - 2, y - 4, M.arm, 4); parts.px(E, R, x - 1, y - 6, M.horn, 0); parts.px(E, R, x - 2, y - 7, M.horn, 4); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：剑轮飞出 → 剑刃龙卷（高 24，6 道斩环绕上升，每 0.1 s 换角度）→ 飞回 ─────
  let flyT = 9, tornT = 9, backT = 9, swT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, tornHit = 0, ghostT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y, SX = () => wx(WC[0]), SY = () => wy(WC[1]);
  function drawWheel(cx, cy, rot, big) {                                // 飞行中的剑轮（8 根辐条：墨紫刃 + 红尖）
    cx = RD(cx); cy = RD(cy);
    for (let i = 0; i < 8; i++) { const a = rot + i * PI / 4, ux = Math.sin(a), uy = -Math.cos(a); for (let r = 3; r <= 10 + big; r++) put(RD(cx + ux * r), RD(cy + uy * r), r >= 9 + big ? EL[1] : r >= 7 ? EL[2] : EL[3]); }
    for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) put(cx + x, cy + y, x === 0 && y === 0 ? EL[0] : 14);
  }
  function onEnter(s) {
    if (s === CAST) {
      flyT = 0; tornHit = 0; releaseOrbit(40, 90, 0.3, 0.6, { up: 20, to: [DUMMY_X, HY - 14, 3] }); fx.cross(wx(P.gx), wy(P.gy), 6, R_EL, 0.3);
      burst(SX(), SY(), 16, 40, 100, 0.25, 0.5, R_EL, 20); shake(0.28, 2); flash(0.05);
    }
    if (s === CHARGE) fx.circle(wx(0), HY + 1, 13, 3, R_EL, 1.4, 1.2, 0);   // 脚下暗红法阵
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWEEP) {                                // 水平横扫：扁弧拖影
      swT = 0; hitDummy(1); burst(DUMMY_X - 4, HY - 16, 14, 40, 110, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 4, HY - 16, 4, R_EL, 0.2);
      sfx('swing', { kind: 'slash', w: 0.85 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === CAST && t === T_FLY) { tornT = 0; }
    if (s === RECOVER && t === 0.02) backT = 0;
    if (s === RECOVER && t === T_BACK) { burst(SX(), SY(), 10, 20, 60, 0.2, 0.4, R_EL, 10); ring(SX(), SY(), 0, R_EL); }
    if (s === DEATH && t === T_BREAK) {                                 // 散架（死亡套件 parts）
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.95, push: -6, fromX: -3, fromY: -24, fadeAt: 1.3, fadeDur: 0.7 }); shake(0.16, 2); burst(SX(), SY(), 16, 40, 100, 0.2, 0.5, R_EL, 20);
      sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === T_THUD) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.9 }); }
  }
  const EVENTS = [[], [], [T_SWEEP], [], [T_FLY], [0.02, T_BACK], [], [T_BREAK, T_THUD], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 暗红刃屑绕剑轮汇聚
      chargeAcc += dt * (20 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, 0, 0, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 重踏：3–4 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.9 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -4) + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 7, 0.35 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (tornT < 0.6) {                                                  // 龙卷命中：两次冲击环 + 两次震屏
      const k = tornT < 0.05 ? 1 : tornT >= 0.3 && tornT < 0.35 ? 2 : 0;
      if (k && !(tornHit & k)) {
        tornHit |= k; hitDummy(1); shake(0.12, 1); ring(DUMMY_X, HY - 4, k === 1 ? 1 : 0, R_EL); burst(DUMMY_X, HY - 12, 14, 40, 110, 0.2, 0.5, R_EL, 20);
        if (k === 1) dummyFx({ dur: 1.8, outline: FXI.shadow, slow: 0.6 }); sfx('impact', { pal: 'shadow', w: k === 1 ? 0.9 : 0.7 });
      }
      if (hash(E.stepN, 3) < 0.5) { const a = Math.random() * 6.28, h = Math.random() * 24; spawn(K_BURST, DUMMY_X + Math.cos(a) * 7, HY - 2 - h, -Math.sin(a) * 40, -20, 0.3, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    flyT += dt; tornT += dt; backT += dt; swT += dt; ghostT += dt;
  }
  function fxReset() { flyT = 9; tornT = 9; backT = 9; swT = 9; ghostT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; tornHit = 0; }
  function fxBack(f12) {
    if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (E.state === CHARGE && P.wheel === 1 && P.dq < 1) {              // 剑轮拖出红色环形残影
      const cx = SX(), cy = wy(WC[1] + P.bob + Math.min(3, P.crouch) + P.wb), n = 40, lit = E.stT < 0.7 ? 0.35 : 0.7;
      for (let k = 0; k < n; k++) { if (((k + f12 * 3) % n) / n > lit) continue; const a = k / n * 2 * PI; put(RD(cx + Math.cos(a) * 11), RD(cy + Math.sin(a) * 11), k & 1 ? EL[2] : EL[3]); }
    }
  }
  function fxFront(f12) {
    if (swT < 2 / 12) {                                                 // 横扫拖影：扁椭圆弧，从身后扫到身前
      const cx = wx(3 + K_SWEEP.lean), cy = wy(-16), c = swT < 1 / 12 ? EL[0] : EL[2];
      for (let k = 0; k <= 30; k++) { if (swT >= 1 / 12 && (k & 1)) continue; const a = PI + k / 30 * PI; put(RD(cx + Math.cos(a) * 20), RD(cy - Math.sin(a) * 5), c); if (k > 4 && swT < 1 / 12) put(RD(cx + Math.cos(a) * 18), RD(cy - Math.sin(a) * 4), EL[1]); }
    }
    if (flyT < T_FLY) { const q = ease.inOut(flyT / T_FLY); drawWheel(SX() + (DUMMY_X - SX()) * q, SY() + (HY - 14 - SY()) * q, flyT * 40, 0); }
    if (tornT < 0.6) {                                                  // 剑刃龙卷：6 道斩环绕上升，每 0.1 s 换角度
      const step = Math.floor(tornT / 0.1 + 1e-6), fade = tornT > 0.45;
      for (let j = 0; j < 6; j++) {
        const y = HY - 2 - j * 4.4, rx = 4 + j * 1.3, a0 = step * 1.3 + j * 0.9, n = 16;
        for (let k = 0; k < n; k++) { if (fade && (k & 1)) continue; const a = a0 + k / n * PI * 1.3, front = Math.sin(a) > 0; put(RD(DUMMY_X + Math.cos(a) * rx), RD(y + Math.sin(a) * 1.6), k > n - 4 ? EL[0] : front ? EL[1] : EL[3]); }
        const sa = a0 + PI * 1.3, sx = RD(DUMMY_X + Math.cos(sa) * rx), sy = RD(y + Math.sin(sa) * 1.6);   // 每道斩的前端一柄小剑
        put(sx, sy, EL[0]); put(sx + (Math.sin(sa) > 0 ? 1 : -1), sy, EL[1]); put(sx, sy - 1, EL[2]);
      }
    }
    if (backT < T_BACK) { const q = ease.inOut(backT / T_BACK); drawWheel(DUMMY_X + (SX() - DUMMY_X) * q, HY - 14 + (SY() - HY + 14) * q - Math.sin(q * PI) * 6, -backT * 40, 0); }
  }

  return {
    name: '魔王近卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune, M.eye, M.meye], HIT_POINT: [2, -18], EVENTS,
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'armor', how: 'shatter', pal: 'shadow', style: 'blade', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
