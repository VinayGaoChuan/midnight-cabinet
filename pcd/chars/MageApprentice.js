// 见习法师（部队 · 科技 · 法师 · 普通 · 远程 600）：蒸汽魔导工坊的学徒——大头细四肢的孩童档（约 22 格，头身比 3.2），
// 背上一只竖放的玻璃法力罐（黄铜箍 + 侧面仪表盘，罐顶泄压阀高出头顶 3 格），松垮的帆布软帽两侧耳罩下垂、帽檐架一副大圆护目镜，
// 右手一根导管短杖（黄铜管 + 玻璃泡杖头，杖尾一根软管在背后弧出、接回罐底）。
// 攻击 = 单手甩杖射出一颗以太小弹，每发后罐里液面跳高一格；技能 = 特性「闪电打击」：短杖高举过头当避雷针、仪表指针三跳到满格、
// 罐里液面涨满、软管逐节把以太变成电光送到杖头（玻璃泡变成电弧灯、噼啪乱跳）→ 泄压阀「噗」地喷白汽，杖头前捅，
// 一道折线闪电打中目标，再依次跳向另外 4 个落点（闪电锁链，5 跳）→ 灯泡噼啪闪两下熄灭、余电火星掉落。
// 死亡 = 坐倒：一屁股坐地 → 向后躺平，软帽飞开、护目镜歪掉，法力罐滚到脚边裂一道缝漏出青色气泡。
// 升级线：见习法师 → 天界法师（CelestialMage.js，罐 → 特斯拉线圈塔）/ 火焰法师（FlameMage.js，罐 → 双联油罐）。
PCD.define('MageApprentice', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS, K_SPIRAL_PT, FLOOR,
    spawn, spawnX, burst, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：以太 · 奥术青紫（magic 色阶）─────
  const R_EL = FXI.magic, EL = FXR[R_EL];
  // 技能「闪电打击」单用雷电色阶（bolt：白 → 淡黄 → 电青 → 蓝 → 深蓝），和天界法师同一条；攻击 / 待机 / 死亡仍用上面的 magic，不共用
  const VR = FXI.bolt, VL = FXR[VR];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'blue', band: 2 }, cap: 'sand', brass: 'gold', skin: 'skin', hair: 'wood', pants: 'wood', shoe: 'boot', belt: 'leather',
    glass: [28, 29, 30, 31], hose: 'iron', rimI: 'iron', strap: 'leather', dial: 'white', ink: { r: 'ink', flat: 1 }, white: 'white', lens: { r: [27, 41, 22, 21], flat: 1 },
    ether: { r: [25, 24, 23, 22], flat: 1 },                          // 罐里的以太液
    lit: { r: [24, 23, 22, 21], flat: 1 },                            // 软管里流动的以太光
    bulb: { r: [25, 24, 23, 22], flat: 1 }, glow: { r: [22, 22, 21, 21], flat: 1 },   // 杖头玻璃泡（发光体，5 档）
    volt: { r: [23, 22, 51, 21], flat: 1 },                           // 技能：软管里的电光（和天界法师通电线圈同色）
    vbulb: { r: [40, 23, 22, 51], flat: 1 }, vglow: { r: [51, 51, 21, 21], flat: 1 },   // 技能：玻璃泡变电弧灯（和天界法师枪口晶体同色）
  });
  const BODY = { body: 'child', leg: 6, torso: 7, head: 7, headW: 7, sw: 3, arm: 6, lw: 2, stride: 3, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(90, 46, 44, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'glass', 'hose', 'dial', 'ink', 'lens', 'ether', 'lit', 'bulb', 'glow', 'hair', 'white', 'volt', 'vbulb', 'vglow']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握导管短杖（a = 杖角，0 朝上），后手空着（待机个性里去敲仪表）─────
  // lvl 液面 0–5 · ndl 仪表指针 0–3 · gog 护目镜 0 推在帽檐 / 1 滑下 / 2 歪掉 · hose 软管亮起节数 0–4 · jb 背罐颠起 · bub 气泡相位
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, lvl: 1, ndl: 0, gog: 0, hose: 0, jb: 0, bub: 0,
    gx: 0, gy: 0, vx: 0, vy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, bhx, bhy, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, bhx: bhx == null ? -3 : bhx, bhy: bhy == null ? -6 : bhy, crouch: crouch || 0 });
  const K_IDLE = K(5, -8, 0.25);
  const K_WIND = K(3, -10, -0.4, -1, 0, -4, -7);                  // 预兆：杖往后收
  const K_FLICK = K(7, -9, 0.95, 1, 1, -2, -8);                   // 甩杖出手
  const K_HOLD = K(6, -9, 0.7, 1, 0, -3, -7);
  const K_ROD = K(3, -16, -0.15, -1, -1, -6, -9, 1);             // 蓄力：短杖高举过头当避雷针、微蹲，后手拧罐侧仪表
  const K_AIMF = K(7, -11, 1.25, 1, 0, -3, -8);                   // 蓄力末：杖头压下指向目标
  const K_ZAP = K(8, -10, 1.45, 2, 0, -1, -8);                    // 施放：前捅，杖头平指、身体前压
  const K_HURT = K(3, -7, -0.35, -1, -1, -4, -5);
  const K_SIT = K(4, -6, 0.9, -1, 1, -4, -3, 3);                  // 一屁股坐下
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'bhx', 'bhy', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 20], ['hy', -30, 5], ['a', -32, 32, 1 / ASTEP], ['bhx', -16, 16], ['bhy', -30, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['lvl', 0, 5], ['ndl', 0, 3], ['gog', 0, 2], ['hose', 0, 4], ['jb', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['bub', 0, 3]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_FLICK = 2 / 12, T_SIT = INCOMING + 0.3, T_LAND = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：后手伸到背后敲两下罐侧仪表 → 指针抖一抖回位 → 护目镜滑下来 → 推回去
  const PERS = [[-6, -8, 0, 0], [-7, -9, 1, 0], [-6, -8, 2, 0], [-7, -9, 1, 1], [-3, -7, 0, 0]];
  const STAFF_UP = 9, STAFF_DN = 3;
  const isSkill = () => P.st === CHARGE || P.st === CAST || P.st === RECOVER;   // P.st 已编进缓存键
  const staffTop = () => [P.hx + Math.sin(P.a) * STAFF_UP, P.hy - Math.cos(P.a) * STAFF_UP];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.lvl = 2; P.ndl = 0; P.gog = 0; P.hose = 0; P.jb = 0; P.bub = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.bub = Math.floor(TT * 2.5 + 1e-6) & 3;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const c = PERS[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.bhx = c[0]; P.bhy = c[1]; P.ndl = c[2]; P.gog = c[3]; P.head = c[3] ? 0 : -1; P.glint = c[2] === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 小跑：短步快频，背罐一颠一颠、软管甩动
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.jb = P.step !== 0 ? 1 : 0; P.a = K_IDLE.a + P.step * 0.1; P.hx += P.step * 0.6; P.bhx -= P.step; P.bub = f;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.gem = 2; P.rim = 2; P.beard = -1; P.sway = -1; }
      else if (tq < 0.45) { setK(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; P.lvl = 3; P.bub = 1; }   // 发出后液面跳高一格
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.lvl = 3; P.bub = 2; }
    } else if (st === CHARGE) {                                          // 举杖当避雷针；指针三跳（每秒回 18% 法力）、液面涨满；护目镜拉下；软管逐节通电；最后杖头压下指向目标
      const q = ease.inOut(clamp01(tq / 0.6));
      if (tq < 1.15) setK(K_IDLE, K_ROD, q); else setK(K_ROD, K_AIMF, ease.inOut(clamp01((tq - 1.15) / 0.2)));
      P.ndl = tq < 0.25 ? 0 : tq < 0.5 ? 1 : tq < 0.75 ? 2 : 3; P.lvl = [2, 3, 4, 5][P.ndl]; P.bub = f12 & 3;
      P.hose = tq < 0.75 ? 0 : Math.min(4, 1 + Math.floor((tq - 0.75) / 0.1 + 1e-6));
      P.gog = tq < 0.55 ? 0 : 1;
      P.beard = tq > 0.8 ? ((f12 & 1) ? 1 : -1) : -RD(q); P.sway = tq > 0.8 && (f12 & 1) ? -1 : 0;   // 静电让耳罩、下摆一跳一跳
      P.jb = tq > 0.95 && (f12 % 3) === 0 ? 1 : 0;                       // 罐子被电得一颠
      P.gem = tq < 0.4 ? 1 : tq < 0.95 ? ((f12 & 1) ? 2 : 1) : 2; P.rim = 2;
    } else if (st === CAST) {                                            // 前捅定格，后坐 1 格
      setK(K_AIMF, K_ZAP, ease.out(clamp01(tq / 0.1))); P.bx = tq < 2 / 12 ? -1 : 0; P.beard = -2; P.sway = -1;
      P.gem = 3; P.rim = 3; P.ndl = 3; P.lvl = tq < 0.2 ? 5 : 3; P.hose = 4; P.gog = 1; P.jb = tq < 1 / 12 ? 1 : 0; P.bub = f12 & 3;
    } else if (st === RECOVER) {                                         // 手被余电麻得杖头抖两下、灯泡噼啪闪两下熄灭；液面落回、指针回零，最后推回护目镜
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_ZAP, K_IDLE, q); P.beard = -RD(1 - q);
      if (tq < 0.25) P.a += (f12 & 1) ? 0.2 : -0.2;
      P.gem = q < 0.35 ? ((f12 & 1) ? 2 : 4) : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
      P.lvl = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.ndl = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.hose = q < 0.2 ? 2 : 0; P.gog = q < 0.7 ? 1 : 0; P.bub = f12 & 3;
      if (tq > 0.6) P.lvl = 2;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.jb = 1; P.gog = 1; P.ndl = 2; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.ndl = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 坐倒：挨打 → 一屁股坐下 → 向后躺平，软帽飞开、罐子滚到脚边裂开
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.gog = 1; P.ndl = 3; }
      else if (d < 0.5) { setK(K_SIT, K_SIT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.gog = 2; P.ndl = 3; P.gem = (f12 & 1) ? 2 : 1; }
      else {
        P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lean = 0; P.head = 0; P.crouch = 0; P.gog = 2; P.a = 0;
        P.hx = R0.sFx + 3; P.hy = R0.yWaist + 1; P.bhx = R0.sBx - 1; P.bhy = R0.yWaist + 2;
        const hq = clamp01((d - 0.5) / 0.4); P.hatX = RD(-7 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 6);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4; P.lvl = d < 0.9 ? 3 : d < 1.3 ? 2 : 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = 15 + P.bx; P.gy = -1; P.vx = 0; P.vy = 0; }
    else {
      const s = staffTop(); P.gx = RD(s[0]) + P.bx; P.gy = RD(s[1]) - 1;
      const R = parts.rig(P, BODY), J = jarBox(R); P.vx = J.jc + P.bx; P.vy = J.vTop - 1;       // 泄压阀口（喷白汽的位置）
    }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：manaJar —— 背负的竖放玻璃罐：顶盖 + 黄铜上下箍 + 4 格玻璃腔（液面 lvl、气泡 bub）+ 侧面 3×3 仪表盘（指针 ndl，伸出罐后 2 格）+ 罐顶泄压阀管
  //   T 落笔变换（倒地时传 r0 = 1 的自由变换让罐子横躺），jx0 左列、y0 上箍行、vTop 阀门行（null = 不画阀管）、crack 裂缝
  function jarBox(R) { const e = parts.edges(R, R.yS + 2), jx1 = e[0] - 1, jx0 = jx1 - 5, y0 = R.yS - 1 - P.jb; return { jx0, jx1, y0, jc: jx0 + 2, vTop: R.htop - 3 - P.jb }; }
  function manaJar(T, jx0, y0, vTop, crack) {
    const jx1 = jx0 + 5, y1 = y0 + 7, jc = jx0 + 2;
    E.part();
    if (vTop != null) {                                                  // 泄压阀：细管 + 顶上阀轮
      for (let y = y0 - 2; y > vTop; y--) PX(E, T, jc, y, M.brass, y === vTop + 1 ? 4 : 0);
      parts.run(E, T, vTop, jc - 1, jc + 1, M.brass, 0); PX(E, T, jc - 1, vTop, M.brass, 4); PX(E, T, jc + 1, vTop - 1, M.brass, 3);
    }
    parts.run(E, T, y0 - 1, jx0 + 1, jx1 - 1, M.brass, 0); PX(E, T, jx0 + 1, y0 - 1, M.brass, 4);                  // 顶盖
    parts.run(E, T, y0, jx0, jx1, M.brass, 0); PX(E, T, jx0 + 1, y0, M.brass, 4); PX(E, T, jx1 - 1, y0, M.brass, 2);   // 上箍
    const nLiq = Math.min(6, P.lvl + 1);
    for (let k = 0; k < 6; k++) {                                        // 玻璃腔：左壁高光、右壁暗，液面从下往上涨
      const y = y0 + 1 + k, liq = k >= 6 - nLiq, surf = k === 6 - nLiq;
      PX(E, T, jx0, y, M.glass, k === 1 || k === 2 ? 4 : 0); PX(E, T, jx1, y, M.glass, 2);
      for (let x = jx0 + 1; x < jx1; x++) {
        if (!liq) PX(E, T, x, y, M.glass, x === jx0 + 1 ? 4 : 3);
        else PX(E, T, x, y, M.ether, surf ? 4 : ((x + y + k) & 1) && k > 3 ? 2 : 3);
      }
    }
    for (let i = 0; i < 2; i++) {                                        // 气泡：液面以下往上冒
      const k = 5 - ((P.bub + i * 2) % Math.max(1, nLiq)), x = jx0 + 1 + ((P.bub + i * 3) % 4);
      if (k >= 6 - nLiq && nLiq > 1) PX(E, T, x, y0 + 1 + k, M.glow, 3);
    }
    parts.run(E, T, y1, jx0, jx1, M.brass, 0); PX(E, T, jx0 + 1, y1, M.brass, 4);                                    // 下箍
    parts.run(E, T, y1 + 1, jx0 + 1, jx1 - 1, M.brass, 2);
    const cx = jx0 - 1, cy = y0 + 3;                                     // 仪表盘：3×3 黄铜圈 + 白表面 + 墨色指针
    parts.rect(E, T, cx - 1, cy - 1, 3, 3, M.brass, 0); PX(E, T, cx - 1, cy - 1, M.brass, 4); PX(E, T, cx, cy, M.dial, 4);
    const N = [[-1, 1], [-1, 0], [-1, -1], [0, -1]][P.ndl]; PX(E, T, cx + N[0], cy + N[1], M.ink, 1);
    if (crack) { PX(E, T, jx0 + 2, y0 + 2, M.ink, 1); PX(E, T, jx0 + 3, y0 + 3, M.ink, 1); PX(E, T, jx0 + 3, y0 + 4, M.ink, 1); PX(E, T, jx0 + 4, y0 + 5, M.ink, 1); }
  }
  // 候选部件：feedHose —— 杖尾软管：从罐底绕到身后（弧出后背 2 格）再接到杖尾，二次贝塞尔、1 格粗；lit 节从罐那头往杖头逐节亮
  function feedHose(R, x0, y0, x2, y2) {
    E.part();
    const x1 = x0 - 4 + (P.sway || 0) * 0.5, y1 = -3, n = 22;
    let px0 = 1e9, py0 = 1e9;
    for (let s = 0; s <= n; s++) {
      const q = s / n, a = (1 - q) * (1 - q), b = 2 * q * (1 - q), c = q * q, X = RD(a * x0 + b * x1 + c * x2), Y = RD(a * y0 + b * y1 + c * y2);
      if (X === px0 && Y === py0) continue; px0 = X; py0 = Y;
      const on = P.hose > 0 && q < P.hose / 4 + 0.001;
      PX(E, R, X, Y, on ? (isSkill() ? M.volt : M.lit) : M.hose, on ? (P.gem >= 3 || ((s + P.hose) & 1) ? 4 : 3) : 0);
    }
  }
  // 候选部件：slouchCap —— 松垮帆布软帽：后脑鼓出 1 格、帽顶一道缝线、近侧耳罩垂到下巴（尖端随 beard 摆）、帽檐上架一副大圆护目镜（gog：0 推在帽檐 · 1 滑到眼前 · 2 歪掉）
  function slouchCap(R, T, gogOnly) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey, b = RD(P.beard || 0);
    E.part();
    if (!gogOnly) {
      parts.run(E, T, top - 2, x0 + 1, x1 - 2, M.cap, 0); parts.run(E, T, top - 1, x0 - 1, x1 - 1, M.cap, 0); parts.run(E, T, top, x0 - 1, x1, M.cap, 0);
      PX(E, T, x0 - 2, top - 1, M.cap, 0); PX(E, T, x0 - 2, top, M.cap, 2); PX(E, T, x0 + 2, top - 2, M.cap, 4); PX(E, T, x0 + 3, top - 1, M.cap, 2);   // 后脑鼓出 + 缝线
      for (let y = top + 1; y <= ey + 3; y++) { PX(E, T, x0, y, M.cap, 0); PX(E, T, x0 + 1, y, M.cap, y === ey + 3 ? 2 : 0); }   // 近侧耳罩
      PX(E, T, x0 + 1 - (b > 0 ? 1 : 0), ey + 4, M.cap, 3); PX(E, T, x0 - 1 + (b < 0 ? 0 : 0) - (b > 1 ? 1 : 0), ey + 2, M.cap, 2);
    }
    // 护目镜：皮镜带 + 近侧 4×4 铁框大圆镜片（凸出头前 2 格，镜片 2×2 青玻璃带白高光）+ 远侧镜片露出一角
    const gy = P.gog === 1 ? ey : P.gog === 2 ? ey + 1 : top - 1, gx = x1 + 1 + (P.gog === 2 ? -1 : 0), tilt = P.gog === 2 ? 1 : 0;
    parts.run(E, T, gy, x0 + 1, gx - 2, M.strap, 3);
    PX(E, T, gx - 3, gy - 1 - tilt, M.rimI, 0); PX(E, T, gx - 3, gy - tilt, M.lens, 2);
    parts.run(E, T, gy - 1, gx - 1, gx + 1, M.rimI, 0); parts.run(E, T, gy + 2, gx - 1 + tilt, gx + 1 + tilt, M.rimI, 2);
    PX(E, T, gx - 2, gy, M.rimI, 0); PX(E, T, gx - 2, gy + 1, M.rimI, 0); PX(E, T, gx + 2, gy + tilt, M.rimI, 2); PX(E, T, gx + 2, gy + 1 + tilt, M.rimI, 2);
    PX(E, T, gx - 1, gy, M.lens, P.gem >= 2 ? 4 : 4); PX(E, T, gx, gy, M.lens, 3); PX(E, T, gx - 1, gy + 1, M.lens, 3); PX(E, T, gx, gy + 1, M.lens, 2);
  }
  // 候选部件：conduitStaff —— 导管短杖：1 格黄铜管 + 杖头下 2 格粗套环 + 玻璃泡（5 档亮度，发光体单独一个部件）
  const BULB = [0, -2, -1, -1, 0, -1, 1, -1, -1, 0, 0, 0, 1, 0, 0, 1];
  const BULB_LV = [
    [2, 2, 2, 3, 3, 3, 2, 2], [4, 3, 3, 4, 3, 3, 2, 2], [4, 4, 4, 5, 4, 5, 4, 3], [5, 5, 5, 6, 5, 6, 5, 4], [1, 1, 1, 2, 1, 1, 1, 1],
  ];
  const BULB_MAT = (lv) => (isSkill() ? (lv >= 5 ? [M.vglow, 3] : [M.vbulb, lv]) : (lv >= 5 ? [M.glow, 3] : [M.bulb, lv]));   // 技能里玻璃泡变电弧灯
  function conduitStaff(T, hx, hy, a) {
    const dx = Math.sin(a), dy = -Math.cos(a);
    E.part();
    parts.line(E, T, hx - dx * STAFF_DN, hy - dy * STAFF_DN, hx + dx * (STAFF_UP - 2), hy + dy * (STAFF_UP - 2), M.brass, 3);
    parts.brush(E, T, hx + dx * (STAFF_UP - 2.5), hy + dy * (STAFF_UP - 2.5), 0.9, M.brass, 0);
    PX(E, T, hx - dx * STAFF_DN, hy - dy * STAFF_DN, M.hose, 0);
    const X = RD(hx + dx * STAFF_UP), Y = RD(hy + dy * STAFF_UP);
    E.part(); const lv = BULB_LV[P.gem];
    for (let i = 0; i < 8; i++) { const m = BULB_MAT(lv[i]); PX(E, T, X + BULB[i * 2], Y + BULB[i * 2 + 1], m[0], m[1]); }
    if (P.glint) PX(E, T, X - 1, Y - 2, M.glow, 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), F = parts.FREE;
    if (R.lie) {                                                         // 仰倒：软帽飞在头后、短杖掉在身旁、法力罐滚到脚边裂开
      conduitStaff(F, 12, -1, Math.PI / 2 - 0.2);
      parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.robeD, hand: M.skinD });
      parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.shoe, bootD: M.shoeD });
      parts.torso(E, R, P, { style: 'tunic', mat: M.robe, belt: M.belt, buckle: M.brass });
      parts.hair(E, R, P, { style: 'short', mat: M.hair });
      parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, eyeStyle: 'wide', white: M.white, brow: M.hair, nose: 'small', mouth: 'line', ear: 'dot', blush: M.robe });
      slouchCap(R, R, 1);
      parts.arm(E, R, P, { sleeve: 'loose', mat: M.robe, cuff: M.brass, hand: M.skin });
      manaJar({ r0: 1, tx: 11, ty: -3, rot: 0, ox: 0, oy: 0 }, -3, -7, null, 1);
      capAt(F, -21 + P.hatX, -1 - P.hatY);
      return;
    }
    const J = jarBox(R); manaJar(R, J.jx0, J.y0, J.vTop, 0);
    const dx = Math.sin(P.a), dy = -Math.cos(P.a);
    feedHose(R, J.jx0 + 1, J.y0 + 9, P.hx - dx * STAFF_DN, P.hy - dy * STAFF_DN + 1);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.robeD, hand: M.skinD });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.shoe, bootD: M.shoeD });
    parts.torso(E, R, P, { style: 'tunic', mat: M.robe, belt: M.belt, buckle: M.brass, strap: M.belt, trim: M.brass });
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
    parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, eyeStyle: 'wide', white: M.white, brow: M.hair, nose: 'small', mouth: 'line', ear: 'none', blush: M.robe });
    slouchCap(R, R, 0);
    conduitStaff(R, P.hx, P.hy, P.a);
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.robe, cuff: M.brass, hand: M.skin });
  }
  // 飞开的软帽（掉在地上：帽身 + 耳罩一条）
  function capAt(F, x, y) {
    E.part();
    parts.run(E, F, y - 3, x - 2, x + 2, M.cap, 0); parts.run(E, F, y - 2, x - 3, x + 3, M.cap, 0); parts.run(E, F, y - 1, x - 3, x + 4, M.cap, 0);
    PX(E, F, x - 1, y - 3, M.cap, 4); PX(E, F, x, y - 2, M.cap, 2); PX(E, F, x - 3, y, M.cap, 0); PX(E, F, x - 2, y, M.cap, 2);
  }
  function bakeHero() { RIM.rimRamp = isSkill() ? VL : EL; RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, stmT = 9, stmX = 0, stmY = 0, chargeAcc = 0, soulAcc = 0, leakAcc = 0, lastStep = 0, lastNdl = 0, lastPers = -1, sparkAcc = 0;
  // 闪电锁链的 5 个落点（屏幕坐标，全在画面内 x 68–122、相邻至少隔 12 格；和天界法师同一套）：
  //   假人 → 右后（122）→ 右前低位（110）→ 从假人草袋下面贴地横穿到左前低位（84）→ 施法者和假人之间（68），顺时针绕假人一圈，只有一跳经过假人且走木桩那一段
  const NODES = [[DUMMY_X, HY - 14], [DUMMY_X + 24, HY - 13], [DUMMY_X + 12, HY - 5], [DUMMY_X - 14, HY - 5], [DUMMY_X - 30, HY - 10]];
  const T_HOP = [1 / 12, 2 / 12, 3 / 12, 4 / 12], nodeT = new Float32Array(5).fill(9);
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function bubbleString(n) { const R = parts.rig(P, BODY), J = jarBox(R); for (let i = 0; i < n; i++) spawn(K_EMBER, wx(J.jx0 + 1 + Math.random() * 4 + P.bx), wy(J.y0 - 1 - i * 2), (Math.random() - 0.5) * 6, -14 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL); }
  // 第 i 跳：上一个落点 → 这个落点一道折线闪电；落点：十字星芒 + 火花，假人闪电描边大摇，其余落点一道竖直电击劈到地面 + 地面焦痕
  function zap(i) {
    const x = NODES[i][0], y = NODES[i][1];
    if (i > 0) fx.bolt(NODES[i - 1][0], NODES[i - 1][1], x, y, VR, 0.32, 2, 9 + i * 7);
    if (i === 0) { hitDummy(1); dummyFx({ dur: 0.4, outline: VR }); ring(x, y, 0, VR); burst(x, y, 14, 40, 100, 0.15, 0.4, VR, 6); }
    else burst(x, y, 8, 30, 80, 0.12, 0.3, VR, 4);
    fx.cross(x, y, i === 0 ? 5 : 3, VR, 0.2); nodeT[i] = 0;
    sfx('impact', { pal: 'bolt', w: 0.45 - i * 0.05 });
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    burst(gx, gy, 16, 50, 120, 0.15, 0.4, VR, 6); fx.cross(gx, gy, 6, VR, 0.25);
    fx.bolt(gx + 2, gy, NODES[0][0], NODES[0][1], VR, 0.4, 2, 5); zap(0);   // 第 1 跳：杖头 → 目标
    stmT = 0; stmX = wx(P.vx); stmY = wy(P.vy);                         // 泄压阀「噗」地喷白汽
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === CAST) { const i = T_HOP.indexOf(t); if (i >= 0) { zap(i + 1); if (i === 0) shake(0.12, 1); } }   // 锁链依次再跳 4 次
    if (s === ATTACK && t === T_FLICK) {
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy); shoot(1, mzX + 2, mzY, 170, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.08, 0.18], back: [10, 24] } });
      burst(mzX, mzY, 5, 25, 55, 0.12, 0.25, R_EL, 0); bubbleString(2);
      sfx('swing', { kind: 'staff', w: 0.25 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === DEATH && t === T_SIT) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 6 + Math.random() * 10, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust); }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      for (let i = 0; i < 6; i++) spawn(K_BURST, wx(12), HY - 5, (Math.random() - 0.5) * 40, -20 - Math.random() * 20, 0.3 + Math.random() * 0.2, R_EL);   // 罐子磕裂：溅出以太
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], T_HOP, [], [], [T_SIT, T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 35, 85, 0.12, 0.3, R_EL, 8); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.25 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {
      if (P.ndl !== lastNdl) {                                           // 每跳一次冒一串青泡，杖头卷进 2 颗电光螺旋（汇聚到杖头就消失）
        if (P.ndl > lastNdl) { bubbleString(4 + P.ndl); for (let k = 0; k < 2; k++) { const r = 7 + Math.random() * 3, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.15), 0, 9, VR, { a, r, w: 7 + Math.random() * 2, tx: gx, ty: gy }); } }
        lastNdl = P.ndl;
      }
      if (stT > 0.8) { chargeAcc += dt * (10 + 20 * clamp01((stT - 0.8) / 0.5)); while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, v = 25 + Math.random() * 35; spawn(K_BURST, gx + Math.cos(a) * 2, gy + Math.sin(a) * 2, Math.cos(a) * v, Math.sin(a) * v * 0.8, 0.08 + Math.random() * 0.1, VR); } }   // 电弧灯噼啪迸火花
    } else lastNdl = 0;
    if (state === MOVE && P.step !== lastStep) {                         // 小跑：每步 1 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.2 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -2), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                                // 敲表：指节敲到仪表时迸两颗小亮点
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 1 || f === 3) { const R = parts.rig(P, BODY), J = jarBox(R); spawn(K_BURST, wx(J.jx0 - 2), wy(J.y0 + 3), -12, -10, 0.2, R_EL); spawn(K_BURST, wx(J.jx0 - 2), wy(J.y0 + 2), -6, -16, 0.2, R_EL); } lastPers = f; }
    }
    if (state === RECOVER && stT < 0.35) { sparkAcc += dt * 12; while (sparkAcc >= 1) { sparkAcc -= 1; spawnX(K_PHYS, gx + (Math.random() - 0.5) * 3, gy, (Math.random() - 0.5) * 30, -15 - Math.random() * 15, 0.4 + Math.random() * 0.3, VR, { g: 160, floor: HY - 1 }); } }   // 余电火星从灯泡掉落
    if (state === DEATH && stT > T_LAND && stT < INCOMING + 1.6) { leakAcc += dt * 7; while (leakAcc >= 1) { leakAcc -= 1; spawn(K_EMBER, wx(14) + (Math.random() - 0.5) * 3, HY - 5, (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL); } }   // 裂缝漏出青色气泡
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 22, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; stmT += dt; for (let i = 0; i < 5; i++) nodeT[i] += dt;
  }
  function fxReset() { mzT = 9; stmT = 9; chargeAcc = 0; soulAcc = 0; leakAcc = 0; lastStep = 0; lastNdl = 0; lastPers = -1; sparkAcc = 0; nodeT.fill(9); }
  function fxBack(f12) {
    if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, isSkill() ? VL : EL, f12); shotFloorGlow(f12);
    for (let i = 0; i < 5; i++) {                                        // 落点地面焦痕：5 格，亮 → 暗，后半段断续
      const a = nodeT[i]; if (a >= 0.8) continue; const x = NODES[i][0], c = a < 1 / 12 ? VL[1] : a < 0.3 ? VL[2] : a < 0.55 ? VL[3] : VL[4];
      for (let k = -2; k <= 2; k++) { if (a > 0.4 && ((k + f12) & 1)) continue; put(x + k, FLOOR, Math.abs(k) === 2 ? VL[Math.min(4, 3 + (a > 0.3 ? 1 : 0))] : c); }
    }
  }
  // 电击竖线：落点 → 地面的 1 格折线（每 2 行左右错 1 格），3 帧：白 → 淡黄 → 断续电青
  function spike(x, y0, a, f12) {
    const c = a < 1 / 12 ? VL[0] : a < 2 / 12 ? VL[1] : VL[2];
    for (let y = y0, k = 0; y < FLOOR; y++, k++) { if (a >= 2 / 12 && ((k + f12) & 1)) continue; put(x + ((((k >> 1) + f12) & 1) ? 1 : 0), y, c); }
  }
  // 电弧灯周围的小电弧：从灯泡往外 3–5 格的折线，方向每帧换
  function crackle(gx, gy, n, f12) {
    for (let j = 0; j < n; j++) {
      const a = E.hash(f12 * 3 + j, 17) * 6.2832, L = 3 + ((f12 + j) % 3); let x = gx, y = gy;
      for (let k = 1; k <= L; k++) { x += Math.cos(a) * 1.2 + (E.hash(k + j, f12) - 0.5) * 1.6; y += Math.sin(a) * 1.2 + (E.hash(f12, k + j) - 0.5) * 1.6; put(RD(x), RD(y), k <= 1 ? VL[0] : k <= 3 ? VL[1] : VL[2]); }
    }
  }
  // 目标标记：半径 3 的四角括号，每角 2 格（比天界法师的锁定框少一格角点，也不逐个锁定）
  function tick(x, y, c) { for (const sx of [-1, 1]) for (const sy of [-1, 1]) { put(x + sx * 2, y + sy * 3, c); put(x + sx * 3, y + sy * 2, c); } }
  const STEAM = [[[0, 0], [-1, 0], [0, -1], [1, -1]], [[0, -1], [-1, -2], [1, -2], [0, -3], [-2, -1], [2, -1], [-1, -4], [1, -4]], [[-1, -3], [1, -4], [0, -5], [-2, -5], [2, -3], [-3, -2], [3, -3]]];
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    const G = isSkill() ? VL : EL;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? G[0] : r <= 3 ? G[1] : G[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    const st = E.state, t = E.stT;
    if (P.dq < 1 && ((st === CHARGE && t > 0.8) || (st === CAST && t < 0.25))) crackle(gx, gy, st === CAST ? 3 : t > 1.1 ? 2 : 1, f12);
    for (let i = 1; i < 5; i++) if (nodeT[i] < 0.25) spike(NODES[i][0], NODES[i][1] + 1, nodeT[i], f12);
    for (let i = 1; i < 5; i++) {                                       // 另外 4 个落点的目标标记：蓄力 1.2 s 起一齐出现，打中那一帧变白，打中后 0.3 s 消失
      const hitAt = T_HOP[i - 1]; let on = 0, hot = 0;
      if (st === CHARGE) on = t >= 1.2 ? 1 : 0;
      else if (st === CAST) { on = t < hitAt + 0.3 ? 1 : 0; hot = t >= hitAt && t < hitAt + 1 / 12 ? 1 : 0; }
      else if (st === RECOVER) on = nodeT[i] <= 0.3 ? 1 : 0;
      if (on) tick(NODES[i][0], NODES[i][1], hot ? VL[0] : VL[2]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (stmT < 3 / 12) {                                                 // 白汽：3 帧（小团 → 散开 → 断续飘散），白 / 灰两级
      const i = Math.min(2, Math.floor(stmT * 12 + 1e-6)), S = STEAM[i], c0 = i === 0 ? 21 : 17, c1 = i === 2 ? 18 : 17;
      for (let k = 0; k < S.length; k++) { if (i === 2 && (k & 1) && (f12 & 1)) continue; put(stmX + S[k][0], stmY + S[k][1], k < 2 ? c0 : c1); }
      if (i < 2) put(stmX, stmY - 1, 21);
    }
  }

  return {
    name: '见习法师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.bulb, M.glow, M.lit, M.ether, M.volt, M.vbulb, M.vglow], HIT_POINT: [0, -11], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'bolt', style: 'bolt', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
