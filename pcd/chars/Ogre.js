// 食人魔 Ogre（部队 · 不死 · 先锋 · 优质 · 近战 256）：给格拉尔烤肉的亡灵厨子。
// 倒三角矮壮：肩臂极宽、小头陷在两肩之间、驼背前倾、粗短腿外八；头上套一张棕熊头皮兜帽（两只圆耳），背上麻绳绑一口冒汽的大铁锅，
// 右手（前手）一把 6×5 大铁平底锅，下颚两颗外翻黄獠牙，灰紫尸肤带缝合线，腰间一条油渍半截围裙。
// 攻击：反手横拍平底锅（锅拉到身后 1 帧 → 横拍出去，锅面拖出横弧，「咣」一声火花）。
// 技能：特性「硬化」生效——平底锅「咚咚咚」敲胸口三下，每下身上结出一片岩壳；施放时全身岩壳合拢、双脚一跺，地裂直冲假人，碎石外爆；
//       岩壳保持到收招末尾才一片片剥落成尘。死亡：仰面倒下，平底锅脱手转两圈「咣」地落地，背锅压在身下挤出一滩汤，熊皮兜帽滑落。
// 升级 → 棕熊（熊皮长进身体）/ 指挥官（熊头变肩甲 + 披风，锅改成炮）。熊皮、铁锅、平底锅、獠牙一直传下去。
PCD.define('Ogre', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, blitShape, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px, run = parts.run;

  // ───── 元素：硬化 · 岩壳土（earth：奶油 5 → 62 → 61 → 19 → 20）；汤汽另用一条灰白色阶 ─────
  const R_EL = FXI.earth, EL = FXR[R_EL], R_STEAM = fxRamp('ogreSteam', [21, 17, 18, 10, 9]);

  // ───── 材质：灰紫尸肤、灰褐熊毛（棕熊同一色阶）、铁锅铁、木柄、油渍皮围裙、黄骨獠牙、岩壳（沙土）─────
  const SKIN = ['#1e1622', '#3e3046', '#62526a', '#8c7c92'], FUR = ['#1e1814', '#423830', '#6a5c4c', '#94846c'];
  const M = parts.mats(E, {
    skin: SKIN, fur: FUR, cape: { r: FUR, band: 2 }, iron: 'iron', pan: 'steel', wood: 'wood', apron: [0, 20, 19, 32], stain: 'boot', tusk: 'bone',
    rope: [20, 19, 61, 62], rock: [0, 19, 61, 62], meat: [20, 44, 32, 33], soup: [20, 19, 61, 62], steam: 'white',
    ink: { r: 'ink', flat: 1 }, eye: { r: [20, 61, 62, 5], flat: 1 },
  });
  // 体型：矮壮改——肩厚 sw 6、四肢粗 1.5、驼背 2、没有脖子、头只有 5 行高；臂长 10（垂到膝上）、腿粗 4；收腰让肩到胯成倒三角；仰面倒下
  const BODY = { body: 'stocky', leg: 7, torso: 10, head: 5, sw: 6, limb: 1.5, hunch: 2, neck: 0, arm: 10, lw: 4, belly: 0, waist: 1.2, stride: 3, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const HX = 74, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 60, 40, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'wood', 'steam', 'tusk', 'iron', 'pan', 'fur', 'cape', 'rope', 'apron', 'stain', 'meat']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }   // 轮廓光只打在尸肤和岩壳上（硬化的是皮）

  // ───── 姿势：前手 = 右手握平底锅（hx hy a），后手（bhx bhy）；其余字段见缓存键 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, shell: 0, jaw: 0, meat: 0, panB: 0, potY: 0, ear: 0, soup: 0,
    panX: 0, panY: 0, panR: 0, panF: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -6, 2.4, -3, -6);                          // 平底锅垂在身前，锅面贴着地面上方
  const K_WIND = K(-3, -11, -1.6, -5, -7, -1, 0);                // 反手：锅拉到身后
  const K_SLAP = K(12, -11, HALF, -6, -8, 1, 1);                  // 横拍出去（出手定格）
  const K_FOLLOW = K(11, -8, 2.0, -5, -7, 1, 1);
  const K_RAISE = K(13, -11, -0.3, -4, -8, 0, 0);                 // 蓄力：锅举在胸前
  const K_THUMP = K(10, -8, -0.8, -4, -8, -1, 0, 1);              // 锅面拍到胸口（顿挫）
  const K_STOMP = K(13, -12, 1.9, -9, -12, 0, -1, 2);            // 施放：两臂张开、仰头、双脚一跺
  const K_STAND = K(11, -9, 2.2, -6, -8, 0, 0, 0);
  const K_HURT = K(6, -5, 2.8, -5, -5, -1, -1);
  const K_STAG = K(8, -14, 0.4, -7, -13, -1, -1, 2);             // 踉跄后仰：两手乱抓（锅已脱手）
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -40, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -40, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15], ['st', 0, 8], ['hatX', -16, 15]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatY', 0, 7], ['dq', 0, 48, 48], ['shell', 0, 5], ['jaw', 0, 1], ['meat', 0, 1], ['panB', 0, 1], ['potY', -1, 1], ['ear', 0, 1],
    ['soup', 0, 3], ['panX', -8, 31], ['panY', 0, 20], ['panR', 0, 3], ['panF', 0, 2]]);
  const SWAY_IDLE = [0, 1, 0, -1], WALK_LEAN = [0, 1, 0, -1], WALK_POT = [0, -1, 0, -1];
  const T_STRIKE = 2 / 12, THUMPS = [5 / 12, 9 / 12, 13 / 12], T_QUAKE = 2 / 12, T_LAND = INCOMING + 0.66, T_PAN = INCOMING + 0.3 + 8 / 12;
  const hitAt = (t, T0) => t >= T0 - 1e-6 && t < T0 + 1 / 12 - 1e-6;

  function idle(tq, f12) {
    setK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.beard = SWAY_IDLE[(b + 1) & 3];
    const lp = tq % DUR[IDLE];                                     // 待机个性：从背后锅里摸出一块烤肉啃一口，嚼两下，熊耳跟着一动
    if (lp >= 1.25 - 1e-6 && lp < 1.42) { P.bhx = -8; P.bhy = -18; P.meat = 0; P.head = 0; }
    else if (lp >= 1.42 - 1e-6 && lp < 2.1) {
      P.bhx = 7; P.bhy = -14; P.meat = 1; const k = f12of(lp - 1.42);
      P.jaw = k === 0 || k === 3 || k === 6 ? 1 : 0; P.ear = k === 1 || k === 2 ? 1 : 0; P.head = k >= 2 ? 0 : -1;
      if (k >= 5) { P.bhx = 4; P.bhy = -12; P.meat = 0; }         // 最后一口咽下去，手放下
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.shell = 0; P.jaw = 0; P.meat = 0; P.panB = 0; P.potY = 0; P.ear = 0; P.soup = 0;
    P.panX = 0; P.panY = 0; P.panR = 0; P.panF = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 外八蹒跚：身体左右晃 1 格、接触帧顿挫、背锅每步颠一下
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.hx += P.step; P.a += P.step * 0.12; P.bhx -= P.step; P.lean = WALK_LEAN[f]; P.potY = WALK_POT[f]; P.beard = -P.sway;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) setK(K_IDLE, K_IDLE, 0);
      else if (tq < T_STRIKE - 1e-6) { setK(K_WIND, K_WIND, 0); P.panB = 1; P.beard = 1; P.bx = -1; }
      else if (tq < 0.25 - 1e-6) { setK(K_SLAP, K_SLAP, 0); P.bx = 4; P.beard = -2; P.sway = -1; P.jaw = 1; }
      else if (tq < 0.45) { setK(K_SLAP, K_FOLLOW, ease.out((tq - 0.25) / 0.2)); P.bx = 4; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(4 * (1 - q)); }
    } else if (st === CHARGE) {                                      // 锅敲胸口三下，每下结出一片岩壳
      if (tq < 0.3) setK(K_IDLE, K_RAISE, ease.inOut(tq / 0.3));
      else setK(K_RAISE, K_RAISE, 0);
      for (const T0 of THUMPS) if (hitAt(tq, T0)) { setK(K_THUMP, K_THUMP, 0); P.bx = -1; P.beard = 2; }
      P.shell = THUMPS.filter((T0) => tq >= T0 - 1e-6).length;
      P.rim = P.shell >= 1 ? 2 : 1; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.sway = tq > 1.15 ? ((f12 & 1) ? 1 : -1) : 0;
      if (tq > 1.15 && !hitAt(tq, THUMPS[2])) P.bx = (f12 & 1) ? 1 : 0;   // 蓄满：浑身发抖
    } else if (st === CAST) {                                        // 岩壳合拢、双脚一跺
      if (tq < 0.25) setK(K_STOMP, K_STOMP, 0); else setK(K_STOMP, K_STAND, ease.out(clamp01((tq - 0.25) / 0.2)));
      P.shell = 5; P.gem = 3; P.rim = tq < 0.25 ? 3 : 2; P.beard = -2; P.jaw = tq < 0.34 ? 1 : 0;
    } else if (st === RECOVER) {                                     // 岩壳保持到收招末尾才一片片剥落
      const q = ease.inOut(clamp01(tq / 0.45)); setK(K_STAND, K_IDLE, q);
      P.shell = tq < 0.45 ? 5 : tq < 0.53 ? 4 : tq < 0.61 ? 2 : 0; P.gem = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.ear = 1; P.flash = h < 1 / 12 ? 1 : 0; P.potY = -1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.ear = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.gem = 1; P.potY = -1; }
      else {
        setK(K_STAG, K_STAG, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.crouch = 0; P.lean = 0; P.head = 0;
        P.hx = 2; P.hy = -6; P.bhx = -2; P.bhy = -6; P.a = HALF;                                // 两臂顺着身体放下
        const hq = clamp01((d - 0.66) / 0.25); P.hatX = RD(6 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 3);   // 熊皮兜帽从头上滑落
        P.soup = d < 0.66 ? 0 : d < 0.75 ? 1 : d < 0.92 ? 2 : 3;                                       // 背锅压在身下挤出一滩汤
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0.3) {                                                // 平底锅脱手：抛起、转两圈（8 个 90°）、「咣」地落地
        const k = f12of(d - 0.3 + 1e-6), q = clamp01((d - 0.3) / (8 / 12));
        P.panF = q >= 1 ? 2 : 1; P.panX = RD(9 + 10 * q); P.panY = q >= 1 ? 0 : RD(Math.sin(q * Math.PI) * 15); P.panR = q >= 1 ? 0 : k & 3;
      }
    } else if (st === REVIVE) {
      idle(tq, f12); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.gem = tq > 0.85 ? 1 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + (P.lying ? 0 : yo); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + (P.lying ? 0 : yo);
    P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = -15 + P.bx; P.gy = -9; }                  // 倒地：眼 = 发光体（只挂魂光）
    else { const R = parts.rig(P, BODY); P.gx = R.hx1 - 1 + P.bx; P.gy = R.ey; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 本角色的部件（库里没有的；通用的标「候选部件」）─────
  // 候选部件：平底锅 pan —— 铸铁锅面 6×5 朝镜头 + 3 格木柄；锅心暗、右下一圈焦黑、左上一点冷光。T 落笔变换，(x, y) 握点，a 柄朝向（0 朝上、顺时针为正）
  const PAN = ['.XXXX.', 'XXXXXX', 'XXXXXX', 'XXXXXX', '.XXXX.'];
  function drawPan(T, x, y, a) {
    E.part();
    const dx = Math.sin(a), dy = -Math.cos(a), rr = 1 / Math.sqrt((dx / 3) ** 2 + (dy / 2.5) ** 2);
    for (let k = 1; k <= 3; k++) px(E, T, x + dx * k, y + dy * k, M.wood, k === 3 ? 2 : 0);
    const cx = x + dx * (3.2 + rr), cy = y + dy * (3.2 + rr), X0 = RD(cx - 2.5), Y0 = RD(cy - 2);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) {
      if (PAN[j][i] !== 'X') continue; const inner = i >= 1 && i <= 4 && j >= 1 && j <= 3;
      let t = 0; if (inner) t = (i >= 3 && j >= 2) || (i === 4 && j === 1) || (i === 1 && j === 3) ? 1 : 2; if (i === 1 && j === 1) t = 4;
      px(E, T, X0 + i, Y0 + j, M.pan, t);
    }
    return [RD(cx), RD(cy)];
  }
  // 候选部件：背锅 backPot —— 绑在背上的大铁锅：锅沿外翻、鼓腹、两只锅耳、一道麻绳；汤汽一缕（随 sway 摆）。(cx, top) 锅沿中心
  function drawPot(T, cx, top, sw) {
    E.part();
    const rows = [[-4, 3], [-4, 3], [-5, 4], [-5, 4], [-5, 4], [-4, 3], [-3, 2]];
    for (let j = 0; j < rows.length; j++) run(E, T, top + j, cx + rows[j][0], cx + rows[j][1], M.iron, 0);
    run(E, T, top, cx - 3, cx + 2, M.iron, 4); run(E, T, top + 1, cx - 3, cx + 2, M.iron, 2);                          // 锅沿高光、沿下阴影
    px(E, T, cx - 6, top + 2, M.iron, 0); px(E, T, cx - 6, top + 3, M.iron, 2);                                          // 锅耳
    run(E, T, top + 3, cx - 5, cx + 4, M.rope, 0); px(E, T, cx - 3, top + 3, M.rope, 4); px(E, T, cx + 1, top + 3, M.rope, 2);   // 麻绳
    px(E, T, cx - 4, top + 2, M.iron, 4); px(E, T, cx - 4, top + 4, M.iron, 4);
    E.part();                                                        // 一缕汤汽（锅口往上 3 格，尖端随 sway 摆）
    px(E, T, cx - 1, top - 1, M.steam, 2); px(E, T, cx - 2 + (sw > 0 ? 1 : 0), top - 2, M.steam, 3); px(E, T, cx - 1 + (sw < 0 ? -1 : 0), top - 3, M.steam, 2);
  }
  // 候选部件：熊头兜帽 bearHood —— 熊头皮压在头顶：3 行帽身、两只圆耳高出 2 格、熊吻向前伸出 3 格当帽檐（熊鼻、熊眼、一颗白牙）、后沿垂下一片熊皮。
  //   (x0, x1) 头的左右列、top 头顶行；pin 1 = 前耳往后一抖；free 时 T 是地上的变换
  function bearHood(T, x0, x1, top, pin, flap) {
    E.part();
    const f = M.fur;
    px(E, T, x0, top - 5, f, 0); px(E, T, x0 - 1, top - 4, f, 0); px(E, T, x0, top - 4, f, 2);                              // 后耳（圆，缺一角）
    const fe = x0 + 3 - pin; px(E, T, fe, top - 5 + pin, f, 4); px(E, T, fe, top - 4, f, 0); px(E, T, fe + 1, top - 4, f, 2);   // 前耳（一抖往后贴）
    run(E, T, top - 3, x0 - 1, x1 - 1, f, 0); run(E, T, top - 2, x0 - 1, x1 + 1, f, 0); run(E, T, top - 1, x0 - 1, x1 + 3, f, 0); run(E, T, top, x0 - 1, x1 + 2, f, 0);
    px(E, T, x1, top - 2, M.ink, 1); px(E, T, x1 - 1, top - 3, f, 4);                                                    // 熊眼（空洞）+ 眉
    px(E, T, x1 + 1, top - 1, f, 4); px(E, T, x1 + 2, top - 1, f, 4); px(E, T, x1 + 3, top - 1, M.ink, 1);               // 熊吻背亮、熊鼻
    px(E, T, x1 + 1, top + 1, M.tusk, 3);                                                                              // 上颚一颗白牙垂在额前
    px(E, T, x0 + 1, top - 3, f, 4); px(E, T, x0 + 3, top - 3, f, 4); px(E, T, x0, top - 1, f, 2); px(E, T, x0 + 2, top, f, 2);   // 毛尖、毛纹
    if (flap) for (let y = top + 1; y <= top + flap; y++) { px(E, T, x0 - 1, y, f, 0); if (y < top + flap) px(E, T, x0 - 2, y, f, y & 1 ? 2 : 0); }   // 后沿垂下的熊皮
  }
  // 候选部件：半截围裙 waistApron —— 系在腰上、盖住前半身的油渍围裙（腰带 + 背后绳结 + 口袋 + 油渍 + 锯齿下摆）
  function waistApron(R) {
    E.part();
    const yW = R.yWaist, hem = Math.min(-2, R.yHip + 3), sw = RD(P.sway || 0);
    for (let y = yW; y <= hem; y++) {
      const e = parts.edges(R, Math.min(y, R.yHip)), below = y > R.yHip, t = below ? (y - R.yHip) / Math.max(1, hem - R.yHip) : 0;
      const a = RD((e[0] + e[1]) / 2) - 1 + (below ? RD(sw * t) : 0), b = e[1] + 1 + (below ? RD(sw * t) : 0);
      run(E, R, y, a, b, M.apron, 0);
      if (y === hem) for (let x = a; x <= b; x++) if ((((x - sw) % 3) + 3) % 3 === 1) px(E, R, x, y, 0, 0);
    }
    const e = parts.edges(R, yW); run(E, R, yW, e[0], e[1] + 1, M.apron, 2); px(E, R, e[0] - 1, yW - 1 + (sw > 0 ? 1 : 0), M.apron, 3); px(E, R, e[0] - 1, yW + 1, M.apron, 2);   // 腰带 + 背后绳结
    const ef = parts.edges(R, yW + 2); px(E, R, ef[1] - 1, yW + 2, M.apron, 2); px(E, R, ef[1], yW + 2, M.apron, 2);                        // 口袋
    for (const [dx, dy] of [[0, 1], [1, 2], [-1, 3], [2, 4], [0, 5]]) { const y = yW + dy; if (y >= hem) continue; const ee = parts.edges(R, Math.min(y, R.yHip)); px(E, R, ee[1] - 2 - dx, y, M.stain, dy & 1 ? 2 : 3); }   // 油渍
  }
  // 候选部件：岩壳甲片 rockPlate —— 3×3 土色石块（左上亮、右下暗、中间一道裂）
  function rockPlate(T, x, y) { parts.rect(E, T, x, y, 3, 3, M.rock, 0); px(E, T, x, y, M.rock, 4); px(E, T, x + 1, y + 1, M.rock, 2); px(E, T, x + 2, y + 2, M.rock, 1); }
  // 缝合线：一道深色线 + 两侧浅色针脚（画在皮肤部件里，紧跟着那个部件）
  function stitch(T, x0, y0, x1, y1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = RD(x0 + (x1 - x0) * k / n), y = RD(y0 + (y1 - y0) * k / n); px(E, T, x, y, M.skin, 1); if (k & 1) px(E, T, x + 1, y, M.skin, 4); } }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), lie = R.lie;
    if (lie) { drawLying(R); return; }
    const eat = P.meat;
    parts.cape(E, R, P, { mat: M.cape, len: R.yHip + 1, flare: 2.5 });                                   // 熊皮沿背垂下
    const pe = parts.edges(R, R.yS + 3); drawPot(R, pe[0] - 4, R.yS - 3 + P.potY, P.sway);               // 背锅：锅沿高出肩 3 格
    if (P.panB) drawPan(R, P.hx, P.hy, P.a);                                                             // 反手后引：锅在身后
    if (!eat) parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
    parts.legs(E, R, P, { style: 'bare', mat: M.fur, matD: M.furD, boot: M.skin, bootD: M.skinD });     // 熊皮裹腿 + 赤脚
    const tor = drawTorso(R);
    waistApron(R);
    if (P.shell >= 4) { E.part(); const eb = parts.edges(R, R.yS + 2); rockPlate(R, eb[0] - 1, R.yS + 1); rockPlate(R, R.hipFx - 1, R.yHip + 1); }   // 背、大腿的岩壳
    if (P.shell >= 2) { E.part(); rockPlate(R, tor.chest[0], R.yS + 4); }                                  // 胸口岩壳（第 2 下）
    if (!P.panB) drawPan(R, P.hx, P.hy, P.a);
    const af = parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, grip: 'none' });
    parts.brush(E, R, R.sFx - 1, R.sFy, 2.2, M.skin, 0); px(E, R, R.sFx - 2, R.sFy - 2, M.skin, 4);     // 厚实的三角肌
    stitch(R, af.ex - 1, af.ey - 1, af.ex + 1, af.ey + 1);                                                 // 手臂缝合线
    if (P.shell >= 3) { E.part(); rockPlate(R, RD((af.ex + af.wx) / 2) - 1, RD((af.ey + af.wy) / 2) - 1); }   // 前臂岩壳（第 3 下）
    const hd = drawHead(R);                                                                               // 头压在前肩上（驼背前探，小头陷在两肩之间）
    bearHood(R, hd.x0, hd.x1, hd.top, P.ear, 3);
    if (P.shell >= 1) { E.part(); rockPlate(R, R.sFx - 2, R.sFy - 2); }                                   // 肩头岩壳（第 1 下）
    if (P.meat) {                                                                                         // 偷吃：后手从背后锅里摸出烤肉送到嘴边（这时后臂画在脸前）
      const ab = parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
      E.part(); const mx = ab.hx + 1, my = ab.hy - 2; parts.rect(E, R, mx, my, 3, 2, M.meat, 0); px(E, R, mx, my, M.meat, 4); px(E, R, mx + 3, my, M.tusk, 3); px(E, R, mx + 3, my - 1, M.tusk, 4);
    }
    parts.hand(E, R, P, { hand: M.skin, grip: 'big' });
  }
  function drawTorso(R) {                                                                                // 赤膊（胸肌、肚脐）+ 斜挎麻绳 + 两肩之间隆起的斜方肌 + 胸口缝合线
    const tor = parts.torso(E, R, P, { style: 'bare', mat: M.skin, strap: M.rope });
    const et = parts.edges(R, R.yS); run(E, R, R.yS - 1, et[0] + 1, R.hx0 + 1, M.skin, 0); run(E, R, R.yS - 2, et[0] + 3, R.hx0, M.skin, 0);
    stitch(R, tor.chest[0] - 3, R.yS + 3, tor.chest[0] - 3, R.yS + 6);
    return tor;
  }
  function drawHead(R) {
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', nose: 'small', mouth: 'line', ear: 'none' });
    if (!P.eyes) { px(E, R, hd.eye[0], hd.eye[1], M.eye, P.gem === 4 ? 1 : P.gem >= 2 ? 4 : P.gem === 1 ? 3 : 2); px(E, R, hd.x1, hd.ey, M.skin, 3); }
    const tj = P.jaw;                                                                                     // 下颚两颗外翻黄獠牙（嚼的时候跟着下巴动）
    px(E, R, hd.x1 + 1, hd.bot + tj - tj, M.tusk, 3); px(E, R, hd.x1 + 2, hd.bot - 1 + tj, M.tusk, 4); px(E, R, hd.x1 - 2, hd.bot, M.tusk, 3);
    if (tj) px(E, R, hd.x1, hd.bot, M.skin, 1);
    return hd;
  }
  function drawLying(R) {                                                                                 // 仰面倒地：锅压在身下（地面裁掉）、汤挤出来、兜帽滑落、锅飞走
    if (P.soup) { E.part(); const w = [0, 4, 7, 10][P.soup], c = -7; for (let x = c - w; x <= c + w; x++) { px(E, parts.FREE, x, 0, M.soup, (x & 3) === 0 ? 4 : 0); if (Math.abs(x - c) < w - 2) px(E, parts.FREE, x, -1, M.soup, (x & 1) ? 3 : 4); } }   // 汤从背锅那里（上背下面）往两边淌开
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: 'big' });
    parts.legs(E, R, P, { style: 'bare', mat: M.fur, matD: M.furD, boot: M.skin, bootD: M.skinD });
    drawTorso(R);
    waistApron(R);
    drawHead(R);
    parts.hair(E, R, P, { style: 'fringe', mat: M.skinD });                                               // 兜帽滑掉：露出光秃的头顶一圈
    const af = parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin, grip: 'big' });
    const hx = -19 - P.hatX, T = { r0: 0, tx: hx, ty: -P.hatY, rot: 0, ox: 0, oy: 0 };                   // 兜帽落在头边的地上
    bearHood(T, -3, 2, -1, 1, 0);
    if (P.panF) panFree();
    return af;
  }
  function panFree() {                                                                                   // 脱手的平底锅：绕锅心按 90° 翻转，落地平躺
    const T = { r0: P.panR, tx: P.panX, ty: -3 - P.panY, rot: 0, ox: 0, oy: 0 };
    drawPan(T, -6, 0, HALF);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = 3 + P.bx + hero.ox; RIM.ry = -12 + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, steamAcc = 0, lastStep = 0, lastShell = 0, slapT = 9, slamT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const chest = () => [wx(4 + P.bx), wy(-12)];
  function onEnter(s) {
    if (s !== CAST) return;                                          // 岩壳合拢（全身闪一帧土色剪影）+ 双脚一跺：地裂冲向假人
    const [cx, cy] = chest(); slamT = 0;
    releaseOrbit(30, 80, 0.2, 0.45, { pts: 1 }); burst(cx, cy, 16, 40, 90, 0.2, 0.45, R_EL, 8);
    for (const fxo of [-4, 5]) for (let i = 0; i < 6; i++) spawn(K_DUST, wx(fxo) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
    ring(wx(1), HY - 1, 1, R_EL); fx.crack(wx(8), FLOOR, DUMMY_X - wx(8), 1, R_EL, 1.0, 0);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-9) {           // 横拍命中：「咣」+ 火花
      slapT = 0; const cx = DUMMY_X - 5, cy = HY - 11;
      burst(cx, cy, 12, 40, 110, 0.15, 0.4, FXI.impact, 10); burst(cx, cy, 5, 60, 130, 0.2, 0.45, FXI.steel, 14); fx.cross(cx, cy, 4, FXI.impact, 0.2); hitDummy(0);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    for (let i = 0; i < THUMPS.length; i++) if (s === CHARGE && Math.abs(t - THUMPS[i]) < 1e-9) {   // 咚：锅敲胸口，拍出一片岩壳
      const p = platePos(i); burst(p[0], p[1], 8, 20, 50, 0.2, 0.4, R_EL, 6); for (let k = 0; k < 3; k++) spawn(K_DUST, p[0], p[1], (Math.random() - 0.5) * 30, -10 - Math.random() * 10, 0.3, FXI.dust);
      sfx('hit', { mat: 'metal', w: 0.35 + i * 0.1 });
    }
    if (s === CAST && Math.abs(t - T_QUAKE) < 1e-9) {              // 地裂到假人脚下：碎石外爆 + 冲击环
      const x = DUMMY_X; burst(x, HY - 2, 20, 40, 110, 0.3, 0.6, R_EL, 30);
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 70, -50 - Math.random() * 50, 0.8, R_EL, { g: 260, floor: HY, sz: i < 3 ? 2 : 1 });
      ring(x, HY - 4, 1, R_EL); fx.cross(x, HY - 12, 6, R_EL, 0.25); hitDummy(1); shake(0.12, 1);
      sfx('impact', { pal: 'earth', w: 0.8 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.8 });
    }
    if (s === DEATH && Math.abs(t - T_PAN) < 1e-9) {               // 平底锅落地：咣
      const x = wx(19 - 2); burst(x, HY - 2, 6, 30, 70, 0.15, 0.35, FXI.steel, 10); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust);
      sfx('hit', { mat: 'metal', w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], THUMPS.slice(), [T_QUAKE], [], [], [T_LAND, T_PAN], []];
  function platePos(i) { const R = parts.rig(P, BODY); return i === 0 ? [wx(R.sFx + P.bx), wy(R.sFy - 3)] : i === 1 ? [wx(6 + P.bx), wy(R.yS + 5)] : [wx(P.hx - 2 + P.bx), wy(P.hy - 2)]; }
  function stepFX(dt, state, stT) {
    const R0s = R0;
    if (state === CHARGE) {                                          // 脚下尘土螺旋上卷 + 沙土吸进胸口
      const [cx, cy] = chest();
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const a = Math.random() * 6.2832, r = 11 + Math.random() * 7;
        spawn(K_SPIRAL_PT, cx, cy, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 2);
        const side = Math.random() < 0.5 ? -1 : 1; spawn(K_EMBER, wx(side * (6 + Math.random() * 4)), HY - 1, -side * 6, -10 - Math.random() * 12, 0.5 + Math.random() * 0.4, FXI.dust);
      }
    }
    if (state === MOVE && P.step !== lastStep) {                     // 接触帧：扬 3 颗尘、身体顿挫
      if (P.step !== 0) { sfx('step', { w: 0.75 }); for (let i = 0; i < 3; i++) spawn(K_DUST, wx(P.step > 0 ? 5 : -5) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === RECOVER && P.shell < lastShell) {                  // 岩壳剥落成尘
      const n = lastShell - P.shell; for (let i = 0; i < n * 5; i++) spawnX(K_PHYS, wx(-4 + Math.random() * 14 + P.bx), wy(-18 + Math.random() * 16), (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.6 + Math.random() * 0.3, R_EL, { g: 200, floor: HY });
      for (let i = 0; i < n * 3; i++) spawn(K_DUST, wx(-2 + Math.random() * 10), wy(-6 - Math.random() * 10), (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.4, FXI.dust);
    }
    lastShell = P.shell;
    if (!P.lying && P.dq < 1 && state !== DEATH) {                  // 背锅一直冒一缕汽
      steamAcc += dt * 2.2; while (steamAcc >= 1) { steamAcc -= 1; const R = parts.rig(P, BODY), pe = parts.edges(R, R.yS + 3); spawn(K_RISE, wx(pe[0] - 5 + P.bx), wy(R.yS - 5), (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.7 + Math.random() * 0.5, R_STEAM); }
    }
    if (state === DEATH && P.soup >= 2 && stT < INCOMING + 1.6) { steamAcc += dt * 3; while (steamAcc >= 1) { steamAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_STEAM); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    slapT += dt; slamT += dt; void R0s; void emberAcc;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; steamAcc = 0; lastStep = 0; lastShell = 0; slapT = 9; slamT = 9; }
  function fxBack(f12) { if (!P.lying && P.rim >= 2) floorGlow(wx(2 + P.bx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (slapT < 2 / 12) {                                            // 横拍拖影：身后 → 身前的扁弧（第 1 帧 2 格亮、第 2 帧 1 格断续）
      const first = slapT < 1 / 12, cy = HY - 11, x0 = wx(-8), x1 = DUMMY_X - 4, rx = (x1 - x0) / 2, mx = (x0 + x1) / 2;
      for (let x = Math.round(x0); x <= x1; x++) { if (!first && (x & 1)) continue; const u = (x - mx) / rx, y = Math.round(cy + 3 * Math.sqrt(Math.max(0, 1 - u * u))); put(x, y, first ? (u > 0.3 ? EL[0] : EL[1]) : EL[2]); if (first && u > -0.6) put(x, y - 1, u > 0.3 ? EL[1] : EL[2]); }
    }
    if (slamT < 1 / 12 && E.state === CAST) blitShape(hero, HX + P.mx, HY, P.flip, EL[1], 0);   // 岩壳合拢：全身闪一帧土色剪影
  }

  return {
    name: '食人魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye], HIT_POINT: [3, -12], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'shield', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
