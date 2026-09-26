// 诅咒剑士（部队 · 自然 · 守护者 · 优质）：矮壮重甲剑士，苔锈铁甲 + 墨紫诅咒罩布，平顶桶盔一道横缝透出紫色独眼、盔顶一撮苔藓；
// 背后斜插 3 柄锈蚀诅咒剑成扇形（全线标志）；左臂（远侧）挎苔锈鸢形盾护在身前，右手（近侧）单手锈蚀阔剑。
// 攻击 = 劈（盾护身、阔剑过肩斜劈）；技能 = 特性「铁之冰雹」：背后 3 柄剑拔出悬在头顶 → 盾一顶甩上天 → 两轮铁剑冰雹坠落目标周围、削弱目标。
// 升级成「苦痛盾卫」（AgonyShieldDefender.js）→「魔王近卫」（DemonKingsGuard.js）：背后剑扇 3 → 5 → 8 柄剑轮，紫色独眼横缝全线共有。
PCD.define('CursedSwordsman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：铁雹 · 锈钢寒灰（共享 FX.steel）；命中后的削弱印记用 curse 第 2–3 级紫 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_CUR = FXI.curse, CUR = FXR[R_CUR], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    armor: { r: ['#111512', '#2f3530', '#56605a', '#8a948a'], band: 2 },   // 苔锈铁甲（躯干，大面积）
    arm: ['#111512', '#2f3530', '#56605a', '#8a948a'],                      // 同色小块（盔、臂、腿甲）
    cloth: ['#140a1c', '#34204a', '#5a3a78', '#8c6ab0'],                    // 诅咒布条墨紫
    moss: 'moss', iron: 'iron', rust: 'leather', steel: 'steel', wood: 'wood',
    rune: { r: [25, 42, 24, 43], flat: 1 },                                  // 剑身紫色诅咒纹（发光体）
    eye: { r: [25, 42, 24, 43], flat: 1 }, eyeHot: { r: [24, 43, 43, 21], flat: 1 },   // 盔缝独眼：平时 / 蓄力
  });
  const BODY = { body: 'stocky', head: 7 };
  const SWORD = { style: 'broad', metal: M.steel, edge: M.rust, trim: M.iron, wood: M.wood, glow: M.rune, len: 9 };
  const HX = 77, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(70, 52, 32, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'rune', 'eye', 'eyeHot', 'moss', 'rust']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // 背后剑扇：3 柄剑（握点 = 剑柄，刃朝右下插进后背；角度吸附 2:1 / 45° / 1:2）
  const FAN = [[-14, -17, 2.034], [-11, -20, 2.356], [-8, -22, 2.678]];

  // ───── 姿势：前手（近侧）= 阔剑；后手（远侧）= 鸢形盾（盾心 = 后手）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, fan: 3, float: 0, fy: 0, quiv: 0, drop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(2, -8, 3.4, 7, -6);                  // 剑垂在身侧、盾底拄地
  const K_WIND = K(-1, -18, -0.8, 7, -9, -1, 0, 1);      // 盾护身，阔剑举过肩
  const K_STRIKE = K(8, -10, 2.0, 8, -8, 1, 1);          // 斜劈到前下方
  const K_HOLD = K(8, -9, 2.4, 8, -7, 1);
  const K_CHARGE = K(4, -13, 0.1, 7, -8, -1, -1);        // 剑竖在身前，抬头看头顶的剑
  const K_CAST = K(6, -15, -0.2, 8, -14, -1, -1);        // 盾向上一顶
  const K_HURT = K(0, -9, 3.7, 5, -8, -1, -1);
  const K_KNEEL = K(6, -7, PI, 10, -6, 1, 0, 4);         // 单膝跪地，阔剑插地拄住身体
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['fan', 0, 3], ['float', 0, 3], ['fy', 0, 1], ['quiv', 0, 3], ['drop', 0, 6]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_KNEE = INCOMING + 0.5, T_DROP = [INCOMING + 0.75, INCOMING + 0.95, INCOMING + 1.15];
  const T_PULL = [0.25, 0.45, 0.65], T_WAVE = [0.06, 0.26];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.fan = 3; P.float = 0; P.fy = 0; P.quiv = 0; P.drop = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                        // 待机个性：盾底拄地喘气，背后三柄剑依次轻颤一下（嗡）
      if (lp >= 1.5 && lp < 2.0) { const k = Math.floor((lp - 1.5) * 12 + 1e-6); P.quiv = k < 2 ? 1 : k < 4 ? 2 : 3; P.glint = k === 5 ? 1 : 0; P.bhy += 1; P.bob = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 行军：步子短而整齐，每一步盾轻磕一下身体
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bhy = -8;
      if (P.step !== 0) P.bhx -= 1; P.a = K_IDLE.a + P.step * 0.1;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.gem = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = RD(4 - q); P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 背后 3 柄剑依次拔出、浮到头顶，剑尖朝天
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.float = tq >= T_PULL[2] ? 3 : tq >= T_PULL[1] ? 2 : tq >= T_PULL[0] ? 1 : 0; P.fan = 3 - P.float;
      P.fy = (f12 >> 1) & 1; P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.5 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                           // 盾一顶，3 柄剑甩向天空消失
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.fan = 0; P.float = tq < 1 / 12 ? 3 : 0; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                        // 背后剑扇重新长回来
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.fan = tq < 0.2 ? 0 : tq < 0.35 ? 1 : tq < 0.5 ? 2 : 3; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.quiv = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.quiv = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 跪倒：阔剑插地拄住身体 → 背后的剑一柄柄滑落 → 桶盔低垂、紫眼熄灭 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.quiv = 3; }
      else if (d < 0.5) { setK(K_HURT, K_KNEEL, ease.out((d - 0.3) / 0.2)); P.bx = -2; P.crouch = d < 0.4 ? 2 : 4; P.eyes = 0; P.beard = 1; P.gem = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.beard = 0;
        let dr = 0; for (let i = 0; i < 3; i++) { if (tq >= T_DROP[i]) dr = i * 2 + 2; else if (tq >= T_DROP[i] - 1 / 12) dr = i * 2 + 1; } P.drop = dr; P.fan = 3 - Math.ceil(dr / 2);
        P.gem = d < 1.1 ? ((f12 & 1) ? 1 : 0) : 4; P.eyes = d >= 1.3 ? 1 : 0; if (d >= 1.3) { P.lean = 2; P.head = 1; }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.float) { P.gx = 0 + P.bx; P.gy = -33 + P.fy; }                // 发光体 = 头顶悬着的剑（蓄力）
    else if (st === CAST) { P.gx = P.bhx + P.bx; P.gy = P.bhy; }
    else { const f = parts.sword.focus(P, SWORD); P.gx = f[0] + P.bx; P.gy = f[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const KITE = [3, 3, 3, 3, 3, 3, 2, 2, 1, 1, 0];                      // 鸢形盾：上宽下尖，高 11
  const CRACK = [[-1, -4], [-1, -3], [0, -2], [0, -1], [1, 0], [0, 1], [1, 2]];
  function kiteShield(R, cx, cy) {                                      // 候选部件：鸢形小盾（高 11、宽 7；苔锈铁面 + 苔斑 + 紫色裂纹，裂纹和盾同一部件、按 P.gem 亮）
    E.part(); const lv = P.gem, n = KITE.length;
    for (let r = 0; r < n; r++) {
      const w = KITE[r], v = r - 4;
      for (let x = -w; x <= w; x++) {
        const rim = r === 0 || r === n - 1 || Math.abs(x) === w || Math.abs(x) > (KITE[r + 1] != null ? KITE[r + 1] : -1);
        let m = rim ? M.iron : M.arm, t = 0;
        if (!rim && hash(x + 9, r + 3) < 0.22) { m = M.moss; t = 3; }
        if (rim && r === 1 && Math.abs(x) === w) t = 4;
        parts.px(E, R, cx + x, cy + v, m, t);
      }
    }
    for (const [x, y] of CRACK) parts.px(E, R, cx + x, cy + y, M.rune, lv === 4 ? 1 : lv >= 2 ? 4 : lv === 1 ? 3 : 2);
    parts.px(E, R, cx - 2, cy - 3, M.arm, 4); parts.px(E, R, cx - 2, cy - 2, M.arm, 4);   // 盾面冷光
  }
  function backSword(R, i, dx, dy, a, free) {                           // 背后插的锈剑（刃是锈色，剑身紫纹随 P.gem 亮）
    parts.sword(E, R, P, { style: 'long', metal: M.steel, edge: M.rust, trim: M.iron, wood: M.wood, glow: M.rune, len: 9, at: [dx, dy], a, free });
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), dead = P.st === DEATH && P.crouch >= 4;
    // 背后剑扇（第 i 柄在 fan 之内才还插在背上；待机个性 / 受击时轻颤 1 格）
    for (let i = 0; i < 3; i++) {
      if (i >= P.fan) continue; const f = FAN[i], q = (P.quiv === i + 1 || P.quiv === 3 && P.st !== IDLE) ? 1 : 0;
      backSword(R, i, f[0] + R.lean + q, f[1] + R.bob + Math.min(3, R.cr) - (P.quiv === i + 1 ? 1 : 0), f[2]);
    }
    if (dead) for (let i = 0; i < 3; i++) {                             // 滑落的剑：半空一帧 → 斜插在身后地上
      const s = P.drop - i * 2; if (s <= 0) continue;
      if (s === 1) backSword(R, i, FAN[i][0] - 2, FAN[i][1] + 8, 3.6, 1);
      else backSword(R, i, -12 - i * 4, -8 + (i & 1), 3.6 - i * 0.25, 1);
    }
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armD, pauldron: M.armD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.arm, matD: M.armD, boot: M.iron, bootD: M.ironD });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.armor, tabard: M.cloth, belt: M.iron, buckle: M.rust });
    { const c = tor.chest; for (const [dx, dy] of [[-3, -1], [-4, 0], [-3, 3], [2, 5], [-4, 5]]) parts.px(E, R, c[0] + dx, c[1] + dy, M.moss, 3); }   // 苔斑（和躯干同一部件）
    parts.helm(E, R, P, { style: 'great', mat: M.arm, trim: M.iron, eye: P.gem >= 2 && P.gem < 4 ? M.eyeHot : M.eye });
    E.part(); { const x = R.hx, y = R.htop - 2, b = P.beard > 0 ? 1 : 0; parts.px(E, R, x - 1, y, M.moss, 0); parts.px(E, R, x, y, M.moss, 0); parts.px(E, R, x + 1, y, M.moss, 3); parts.px(E, R, x - b, y - 1, M.moss, 4); parts.px(E, R, x - 2, y + 1, M.moss, 2); }   // 盔顶一撮苔藓
    // 头顶悬着的剑（蓄力）：剑尖朝天
    for (let i = 0; i < P.float; i++) parts.sword(E, R, P, { style: 'long', metal: M.steel, edge: M.rust, trim: M.iron, wood: M.wood, glow: M.rune, len: 8, at: [-5 + i * 5 + R.lean, -27 + P.fy - (i === 1 ? 2 : 0)], a: 0, glowLv: P.gem >= 1 ? 2 : 0 });
    kiteShield(R, P.bhx, P.bhy);                                        // 远侧手挎的盾护在身前（压在躯干前、近侧臂后）
    parts.sword(E, R, P, SWORD);                                        // 近侧手的阔剑（死亡时插在地上拄着）
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.arm, pauldron: M.arm, trim: M.iron, hand: M.arm, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：铁剑冰雹（两轮，每轮 6 柄 1×4 的剑竖直坠落，插在目标周围）─────
  const HN = 12, hX = new Float32Array(HN), hY = new Float32Array(HN), hVY = new Float32Array(HN), hOn = new Uint8Array(HN), hLand = new Float32Array(HN);
  const HAIL_X = [-7, 5, -2, 8, -9, 2, -5, 7, 0, -8, 4, -3];
  let hailGone = -1, throwT = 9, throwX = 0, throwY = 0, slT = 9, slA0 = 0, slA1 = 0, slX = 0, slY = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastQuiv = 0, waveHit = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function wave(k) { for (let j = 0; j < 6; j++) { const i = k * 6 + j; hOn[i] = 1; hLand[i] = 0; hX[i] = DUMMY_X + HAIL_X[i]; hY[i] = HY - 46 - j * 4 - hash(i, 4) * 6; hVY[i] = 260; } }
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.bx), gy = wy(-33);
    throwT = 0; throwX = gx; throwY = gy;
    releaseOrbit(40, 90, 0.3, 0.6, { up: 30 }); burst(gx, gy, 18, 40, 110, 0.25, 0.5, R_EL, 40); fx.cross(wx(P.gx), wy(P.gy), 6, R_EL, 0.3);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                               // 阔剑过肩斜劈：拖影弧 + 命中火花
      slT = 0; slA0 = K_WIND.a; slA1 = K_STRIKE.a; slX = wx(R0.sFx + 4); slY = wy(R0.sFy);
      fx.slash(slX, slY, 11, K_WIND.a + 0.3, K_STRIKE.a, R_EL, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 12, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 4, HY - 12, 4, R_EL, 0.2);
      sfx('swing', { kind: 'slash', w: 0.6 }); sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === CHARGE) { const i = T_PULL.indexOf(t); if (i >= 0) { const f = FAN[i]; burst(wx(f[0]), wy(f[1]), 6, 20, 50, 0.15, 0.35, R_EL, 10); fx.cross(wx(-5 + i * 5), wy(-31), 3, R_CUR, 0.2); } }
    if (s === CAST) { const k = T_WAVE.indexOf(t); if (k >= 0) wave(k); }
    if (s === RECOVER && t === 0.05) hailGone = 0;
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 6 + Math.random() * 18, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH) { const i = T_DROP.indexOf(t); if (i >= 0) { const x = HX - 2 - 12 - i * 4; burst(x, HY - 1, 5, 20, 50, 0.15, 0.3, R_IMP, 8); for (let j = 0; j < 3; j++) spawn(K_DUST, x + Math.random() * 3, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3, FXI.dust); sfx('hit', { mat: 'metal', w: 0.25 }); } }
  }
  const R0 = parts.rig({}, BODY);
  const EVENTS = [[], [], [T_STRIKE], T_PULL, T_WAVE, [0.05], [], [T_KNEE].concat(T_DROP), []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.2) {                                // 钢屑螺旋汇聚到头顶的剑
      chargeAcc += dt * (20 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, 0, 0, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, Math.random() < 0.25 ? R_CUR : R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.6 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 5 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE && P.quiv !== lastQuiv) { if (P.quiv) { const f = FAN[P.quiv - 1]; put(wx(f[0] - 1), wy(f[1] - 1), CUR[1]); spawn(K_RISE, wx(f[0]), wy(f[1] - 1), 0, -10, 0.4, R_CUR); } lastQuiv = P.quiv; }
    // 冰雹：竖直坠落，落地插进土里（第一柄落地 = 这一轮的命中）
    for (let i = 0; i < HN; i++) {
      if (!hOn[i] || hLand[i]) continue;
      hVY[i] += 500 * dt; hY[i] += hVY[i] * dt;
      if (hY[i] >= HY + 1) {
        hY[i] = HY + 1; hLand[i] = 1; const x = hX[i];
        burst(x, HY - 1, 5, 25, 60, 0.12, 0.3, R_IMP, 16); fx.cross(x, HY - 1, 3, R_EL, 0.15); for (let j = 0; j < 2; j++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 6, 0.35, FXI.dust);
        const k = i < 6 ? 1 : 2;
        if (!(waveHit & k)) {
          waveHit |= k; hitDummy(1); shake(0.12, 1); ring(DUMMY_X, HY - 2, k === 2 ? 1 : 0, R_EL); burst(DUMMY_X, HY - 8, 16, 40, 100, 0.2, 0.5, R_EL, 20);
          dummyFx({ dur: 1.8, outline: R_CUR, slow: 0.45 }); sfx('impact', { pal: 'metal', w: k === 2 ? 0.8 : 0.6 });
        }
      }
    }
    if (hailGone > 0.2 && hailGone < 0.5) for (let i = 0; i < HN; i++) if (hOn[i] && hash(i, 7) < dt * 8) spawn(K_RISE, hX[i], HY - 3, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.5, FXI.dust);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 20, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    throwT += dt; slT += dt; if (hailGone >= 0) { hailGone += dt; if (hailGone > 0.7) { hOn.fill(0); hailGone = -1; } }
  }
  function fxReset() { hOn.fill(0); hailGone = -1; throwT = 9; slT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastQuiv = 0; waveHit = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function hailSword(x, y, landed, fade, i) {                           // 1×4 的剑：剑尖朝下，护手 3 格
    const X = RD(x), Y = RD(y), c = landed ? EL[1] : EL[0];
    const rows = [[0, landed ? EL[2] : EL[0]], [-1, c], [-2, c], [-3, EL[1]], [-4, -2], [-5, 19], [-6, EL[2]]];
    for (const [dy, col] of rows) {
      if (Y + dy > HY + 1 - (landed ? 1 : 0) && landed) continue;
      if (fade && hash(i * 7 + dy, 3) < fade) continue;
      if (col === -2) { put(X - 1, Y + dy, EL[2]); put(X, Y + dy, EL[1]); put(X + 1, Y + dy, EL[3]); } else put(X, Y + dy, fade > 0.3 ? FXR[FXI.dust][2] : col);
    }
    if (!landed) for (let k = 1; k <= 4; k++) if (((k + i) & 1) === 0) put(X, Y - 6 - k * 2, EL[k < 3 ? 2 : 3]);   // 下落的风痕
  }
  function fxFront(f12) {
    if (throwT < 0.2) for (let k = 0; k < 3; k++) {                     // 3 柄剑甩向天空：向上的亮线
      const x = throwX - 5 + k * 5, y = RD(throwY - throwT * 340 - (k === 1 ? 2 : 0));
      for (let j = 0; j < 7; j++) if (y + j >= 0 && y + j < HY) put(x, y + j, j < 2 ? EL[0] : j < 4 ? EL[1] : EL[2 + (j & 1)]);
    }
    const fade = hailGone >= 0 ? clamp01((hailGone - 0.15) / 0.4) : 0;   // 收招：地上的剑化灰
    for (let i = 0; i < HN; i++) if (hOn[i]) hailSword(hX[i], hY[i] + (hLand[i] ? -1 : 0), hLand[i], hLand[i] ? fade : 0, i);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.float) {             // 头顶悬剑的紫纹星芒
      const gx = wx(P.gx), gy = wy(P.gy - 4), L = 2 + (f12 & 1);
      for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? CUR[0] : CUR[1]; put(gx + r + 4, gy, c); put(gx - r - 4, gy, c); }
    }
  }

  return {
    name: '诅咒剑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune, M.eye, M.eyeHot], HIT_POINT: [2, -12], EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'blade', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
