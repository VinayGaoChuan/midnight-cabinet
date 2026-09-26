// 游侠（部队 · 精灵 · 射手 · 普通）：瘦高的林地猎手——尖顶苔绿兜帽 + 伸出的精灵长尖耳 + 长兜帽尾、比身高还长的浅木长弓、背后斜挎高箭袋。
// 攻击 = 双手拉满长弓直射；技能 = 特性「精准」生效：拉弓瞄准弱点（银色瞄准线 + 收缩的菱形准星）→ 刃光箭命中 → 追加一道锋利裂口（第二段额外伤害）。
// 升级成「死亡射手」（DeathShooter.js）：同一个人——同样的长弓、尖耳兜帽、箭袋，升级为骨弓、破边长披风和死亡标记。
PCD.define('Ranger', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：精准 · 刀锋银白（steel 色阶），箭羽点缀 nature 绿 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], NAT = FXR[FXI.nature];

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    cloak: { r: 'moss', band: 2 }, hood: 'moss', tunic: 'leather', bracer: 'wood', belt: 'wood', pants: 'sand', boot: 'boot',
    skin: 'skin', brow: 'sand', ink: { r: 'ink', flat: 1 },
    bow: [20, 19, 33, 5], string: 'white', shaft: 'wood', head: 'steel', fletch: 'green', qfletch: 'white', quiver: 'wood', trim: 'leather', steel: 'steel',
    edge: { r: [28, 30, 31, 21], flat: 1 },                          // 蓄力时发亮的箭头（发光体）
  });
  const BODY = { body: 'slim', fall: 'front' };
  const R0 = parts.rig({}, BODY);
  const BOW = { wood: M.bow, string: M.string, arrow: M.shaft, head: M.head, fletch: M.fletch, len: 13 };   // 27 格长弓，比身高还长
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(96, 52, 40, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bow', 'string', 'shaft', 'skin', 'ink', 'fletch', 'edge', 'head', 'brow']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 弓身握把，后手 = 搭箭 / 拉弦（pull 0–3）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, arw: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  const K_IDLE = K(8, -14, -1, -9);                               // 长弓竖在身前，后手自然下垂
  const K_DRAW = K(9, -16, 2, -16, 0, 0, 0, 3);                   // 拉满
  const K_LOOSE = K(9, -16, -2, -17, -1, 0, 0, 0);                // 松弦：后手向后弹开
  const K_HOLD = K(9, -16, -1, -16);
  const K_AIM = K(9, -17, 1, -17, -1, 0, 1, 3);                   // 技能蓄力：半蹲 1 格、身体后仰、拉满不放
  const K_SHOT = K(9, -17, -3, -18, -1, 0, 1, 0);
  const K_REACH = K(6, -15, -4, -22, 0, -1, 0, 0);                // 收招：后手伸到肩后箭袋
  const K_HURT = K(3, -12, -3, -11, -1, -1);
  const K_KNEEL = K(6, -8, 0, -7, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['arw', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_LOOSE = 2 / 12, T_LAND = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：抽一支箭举到眼前 → 吹一口箭羽 → 插回箭袋
  const CHECK = [[-4, -22, 0], [4, -20, 1], [4, -20, 2], [-4, -22, 0], [-2, -13, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.arw = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const c = CHECK[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.bhx = c[0]; P.bhy = c[1]; P.arw = c[2] ? 1 : 0; P.head = c[2] ? 0 : -1; P.eyes = c[2] === 2 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 轻快小跑：兜帽尾反向甩，长弓随步子前后晃
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hx += P.step * 0.6; P.bhx -= P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_DRAW, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_LOOSE, K_LOOSE, 0); P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { setK(K_LOOSE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.beard = -1; P.bend = 2; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q); P.pull = tq < 0.12 ? 1 : tq < 0.3 ? 2 : 3;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                          // 松弦定格 2 帧 → 保持射姿看箭飞出，后手慢慢收回
      if (tq < 2 / 12) { setK(K_SHOT, K_SHOT, 0); P.beard = -2; P.sway = -1; P.bend = 3; P.gem = 3; P.rim = 3; }
      else { setK(K_SHOT, K_HOLD, ease.out(clamp01((tq - 2 / 12) / 0.3))); P.beard = -1; P.bend = 2; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                         // 再从箭袋摸出一支箭
      if (tq < 0.25) { setK(K_SHOT, K_REACH, ease.out(tq / 0.25)); P.beard = -1; P.gem = 2; P.rim = 1; }
      else if (tq < 0.42) setK(K_REACH, K_REACH, 0);
      else { setK(K_REACH, K_IDLE, ease.inOut(clamp01((tq - 0.42) / 0.25))); P.arw = tq < 0.6 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 前扑：中箭 → 踉跄跪下 → 弓脱手弹开、向前扑倒 → 箭袋里的箭散落两支
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else {
        P.lying = 1; P.bx = 0; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.bend = 0; P.lean = 0; P.head = 0; P.crouch = 0; P.pull = 0;
        P.hx = R0.sFx + 3; P.hy = R0.yWaist; P.bhx = R0.sBx; P.bhy = R0.yWaist + 2;
        const hq = clamp01((d - 0.5) / 0.4); P.hatX = RD(10 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 6);
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    if (P.lying) { P.gx = 29 + P.hatX; P.gy = -2 - P.hatY; }
    else { const f = parts.bow.focus(P, BOW); P.gx = f[0] + P.bx; P.gy = f[1]; }   // 发光体 = 箭头
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：hoodTail —— 尖顶兜帽后坠的长兜帽尾（和兜帽后层同一部件），尾梢随 P.beard 反向甩
  function hoodBack(R) {
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'back' });
    const x0 = R.hx0, top = R.htop, b = P.beard || 0, n = R.hy + 5 - top;
    for (let k = 0; k <= n; k++) { const q = k / n, x = x0 - 3 - RD(k * 0.2) + RD(b * q * q * 1.4), y = top - 3 + k; parts.px(E, R, x, y, M.hood, k === n ? 4 : 0); if (k < n) parts.px(E, R, x + 1, y, M.hood, 0); }
  }
  // 精灵长尖耳：head 的 pointy 耳再往后上伸 1 格（和脸同一部件）
  function elfEar(R) { parts.px(E, R, R.hx0 - 3, R.ey - 3, M.skin, 4); }
  // 拿在后手上的箭（待机检查箭羽 / 收招抽箭）：横着举在眼前，箭羽贴着脸
  function heldArrow(R) {
    E.part(); const x = P.bhx, y = P.bhy - 1;
    parts.run(E, R, y, x - 4, x + 3, M.shaft, 3); parts.px(E, R, x + 4, y, M.head, 4);
    parts.px(E, R, x - 4, y - 1, M.fletch, 4); parts.px(E, R, x - 3, y - 1, M.fletch, 3); parts.px(E, R, x - 4, y + 1, M.fletch, 2);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    parts.cape(E, R, P, { mat: M.cloak, len: 'short', flare: 3 });
    parts.pack(E, R, P, { style: 'quiver', mat: M.quiver, trim: M.trim, fletch: M.qfletch });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.tunicD, cuff: M.bracerD, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'leather', mat: M.tunic, belt: M.belt, buckle: M.steel, strap: M.belt });
    hoodBack(R);
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'young', eye: M.ink, eyeStyle: 'narrow', brow: M.brow, nose: 'small', mouth: 'none', ear: 'pointy' }); elfEar(R);
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'front' });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.tunic, cuff: M.bracer, cuffStyle: 'bracer', hand: M.skin });
    if (R.lie) parts.bow(E, R, P, Object.assign({}, BOW, { free: 1, at: [24 + P.hatX, -2 - P.hatY], rot: 1, pull: 0 }));
    else parts.bow(E, R, P, Object.assign({}, BOW, { head: P.gem >= 2 ? M.edge : M.head }));
    if (P.arw) heldArrow(R);
    parts.hand(E, R, P, { side: 'B', hand: M.skin });
    if (R.lie && !P.lift) {                                              // 散落的两支箭
      const F = parts.FREE; E.part();
      parts.run(E, F, -1, -24, -19, M.shaft, 3); parts.px(E, F, -18, -1, M.head, 4); parts.px(E, F, -24, -2, M.fletch, 4);
      parts.px(E, F, -15, -1, M.fletch, 4); parts.px(E, F, -14, -2, M.shaft, 3); parts.px(E, F, -13, -2, M.shaft, 3); parts.px(E, F, -12, -3, M.shaft, 3); parts.px(E, F, -11, -3, M.shaft, 3); parts.px(E, F, -10, -4, M.head, 4);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, cutT = 9, cutX = 0, cutY = 0, cut2 = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastPers = -1, stepN = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);                                // 松弦定格：刃光箭 + 枪口十字光
    releaseOrbit(40, 90, 0.25, 0.5);
    shoot(2, gx + 1, gy, 240, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.1, 0.28], back: [18, 45], off: 5 } });
    mzT = 0; mzX = gx; mzY = gy; burst(gx, gy, 12, 40, 90, 0.15, 0.4, R_EL, 4);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {
      const gx = wx(P.gx - P.bx) + 1, gy = wy(P.gy); mzT = 0; mzX = gx; mzY = gy;
      shoot(1, gx + 1, gy, 210, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.06, 0.14], back: [8, 20] }, glow: -1 });
      sfx('swing', { kind: 'bow', w: 0.25 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 10 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [], [], [], [T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.12, 0.3, FXI.impact, 8); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.25 }); }
    else if (k === 2) {                                                // 第一段：箭刺入点星芒 + 斜切口
      fx.cross(x, y, 7, R_EL, 0.3); fx.slash(x - 7, y + 7, 10, 0.05, 1.5, R_EL, 0.25, 2, 2);
      burst(x, y, 20, 50, 120, 0.2, 0.55, R_EL, 8); burst(x, y, 5, 20, 50, 0.2, 0.4, FXI.nature, 6);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.45 }); cutT = 0; cutX = x; cutY = y; cut2 = 0;
    }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.2) { chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 7 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 2.5) / (0.25 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); } }
    if (state === MOVE && P.step !== lastStep) {                       // 脚步轻：隔一步一颗尘
      if (P.step !== 0) { sfx('step', { w: 0.2 }); if ((stepN++ & 1) === 0) spawn(K_DUST, wx(P.step > 0 ? 4 : -3), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                              // 吹箭羽：一口气从嘴边吹向箭羽
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 2) for (let i = 0; i < 3; i++) spawn(K_BURST, wx(3), wy(-20), 18 + Math.random() * 14, (Math.random() - 0.5) * 8, 0.25 + Math.random() * 0.1, FXI.dust); lastPers = f; }
    }
    if (cutT < 1) {                                                    // 第二段额外伤害：交叉的第二道裂口
      if (!cut2 && cutT >= 0.2) { cut2 = 1; fx.slash(cutX + 7, cutY + 7, 11, -0.05, -1.6, R_EL, 0.3, 2, 2); fx.cross(cutX, cutY, 5, R_EL, 0.25); burst(cutX, cutY, 18, 50, 130, 0.2, 0.5, R_EL, 6); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.35 }); }
      cutT += dt;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 24, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt;
  }
  function fxReset() { mzT = 9; cutT = 9; cut2 = 0; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastPers = -1; stepN = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy), st = E.state, t = E.stT;
    if (st === CHARGE && t > 0.3) {                                    // 横向银色瞄准线（隔点）+ 逐帧收缩的菱形准星
      const tx = DUMMY_X, r = Math.max(3, RD(10 - 7 * clamp01((t - 0.3) / 1.0)));
      for (let x = gx + 3; x < tx - r - 1; x++) if (((x + f12) & 1) === 0) put(x, gy, x > tx - r - 8 ? EL[1] : EL[2]);
      for (let k = 0; k <= r; k++) { const c = k === 0 || k === r ? EL[0] : EL[3]; put(tx - r + k, gy - k, c); put(tx + r - k, gy - k, c); put(tx - r + k, gy + k, c); put(tx + r - k, gy + k, c); }
      put(tx, gy, (f12 & 1) ? EL[0] : EL[1]);
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx, gy - r, c); put(gx, gy + r, c); put(gx + r, gy, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d) {
    if (k === 1) {                                                     // 普通箭：钢箭头 + 木杆 + 绿箭羽
      put(x + d, y, EL[1]); put(x, y, EL[2]); for (let i = 1; i <= 3; i++) put(x - i * d, y, 19);
      put(x - 3 * d, y - 1, NAT[1]); put(x - 4 * d, y - 1, NAT[2]); put(x - 3 * d, y + 1, NAT[2]); return true;
    }
    if (k === 2) {                                                     // 刃光箭：1×5 白刃 + 银色刀锋拖尾
      put(x + d, y, EL[0]); put(x, y, EL[0]); put(x - d, y, EL[0]); put(x - 2 * d, y, EL[1]); put(x - 3 * d, y, EL[1]); put(x - 4 * d, y, EL[2]);
      put(x - 2 * d, y - 1, EL[2]); put(x - 2 * d, y + 1, EL[2]); put(x - 4 * d, y - 1, EL[3]); put(x - 4 * d, y + 1, EL[3]); put(x - 5 * d, y - 1, NAT[1]); put(x - 5 * d, y + 1, NAT[2]);
      return true;
    }
    return false;
  }

  return {
    name: '游侠', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.edge], HIT_POINT: [1, -13], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'metal', style: 'blade', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
