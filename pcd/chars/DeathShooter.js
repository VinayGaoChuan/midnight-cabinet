// 死亡射手（部队 · 精灵 · 射手 · 稀有）：游侠进化成的阴冷猎手——同款尖顶兜帽 + 长尖耳，兜帽加长成垂到脚边的破边长披风；
// 同款长弓进化成反曲骨弓（两端骨刺钩外翻、弓臂缠黑布、弦上一颗紫色标记石）；更高的骨箭袋插满黑羽箭；脸下半部一张骨白骷髅面罩。
// 攻击 = 半蹲快速连射两箭（1 帧预兆）；技能 = 特性「标记目标」：靶心符浮现 → 扇形连射 3 支黑羽箭 → 每支命中在靶心外加一圈（越收越紧）→ 诅咒外爆、目标被标记。
// 由「游侠」（Ranger.js）升级而来：保留长弓、尖耳兜帽、兜帽尾、箭袋、斜挎带，体量加高、换骨弓与死亡标记。
PCD.define('DeathShooter', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：标记 · 诅咒紫（curse 色阶为主），箭刃用 steel 色阶 ─────
  const R_EL = FXI.curse, EL = FXR[R_EL], STL = FXR[FXI.steel];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    cloak: { r: [0, 52, 34, 35], band: 2 }, hood: [0, 52, 34, 35], tunic: 'wood', strap: 'boot', pants: 'iron', boot: 'boot',
    skin: 'skin', bone: 'bone', ink: { r: 'ink', flat: 1 },
    bw: [0, 52, 54, 43], string: 'pale', shaft: [0, 52, 53, 54], head: 'steel', fletch: 'purple',
    gem: { r: [25, 42, 24, 43], flat: 1 }, glow: { r: [43, 43, 21, 21], flat: 1 },
  });
  const BODY = { body: 'slim', leg: 11, torso: 9, stride: 2, lift: 1 };
  const R0 = parts.rig({}, BODY);
  const BL = 14;                                                   // 半弓长：29 格反曲骨弓 + 两端外翻的骨刺钩
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 54, 40, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bw', 'string', 'shaft', 'skin', 'ink', 'gem', 'glow', 'head', 'bone', 'fletch']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 骨弓握把，后手 = 搭箭 / 拉弦（pull 0–3）；待机就是半蹲低姿 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, arw: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  const K_IDLE = K(9, -16, 0, -11, 1, 0, 2);                       // 半蹲、前倾，骨弓斜在身前
  const K_DRAW = K(11, -18, 4, -18, 0, 0, 2, 3);
  const K_LOOSE = K(11, -18, 0, -19, 0, 0, 2, 0);
  const K_HOLD = K(11, -18, 1, -18, 0, 0, 2, 0);
  const K_AIM = K(11, -19, 3, -19, -1, 0, 3, 3);                   // 技能：蹲得更低、后仰拉满
  const K_SHOT = K(11, -19, -1, -20, -1, 0, 3, 0);
  const K_HURT = K(6, -14, -3, -12, -1, -1, 1);
  const K_KNEEL = K(8, -11, 2, -9, 1, 1, 4);                        // 单膝跪地，弓立在身前
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['arw', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_SHOT1 = 1 / 12, T_SHOT2 = 4 / 12, T_KNEE = INCOMING + 0.34, T_ASH = INCOMING + 0.9;
  const DRY = [[1, 0, 0], [2, 1, 0], [2, 1, 1], [1, 1, 0], [0, 0, 0]];   // 待机个性：空拉弓弦试弦（pull, 标记石档, 闪光）

  // 反曲骨弓的几何：弓臂弯度、弦两端、标记石位置（弦上、搭箭点下方 3 格）
  const bend = (pull) => 4 + pull * 0.8;
  function limbX(r, pull) { const q = r / BL, e = Math.abs(r) - (BL - 3); return RD(-bend(pull) * q * q) + (e > 0 ? e : 0); }
  function stoneAt(P) {
    const g = [P.hx, P.hy], ex = g[0] + limbX(BL - 2, P.pull) - 1, ey = g[1] + BL - 2;
    if (!P.pull) return [ex, g[1] + 2];
    const nx = P.bhx, ny = P.bhy, L = Math.hypot(ex - nx, ey - ny) || 1, k = Math.min(1, 3 / L);
    return [RD(nx + (ex - nx) * k), RD(ny + (ey - ny) * k)];
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.arw = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const c = DRY[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.pull = c[0]; P.gem = c[1]; P.glint = c[2]; P.bhx = P.hx - [2, 5, 6][c[0]]; P.bhy = P.hy; P.head = c[0] ? 0 : P.head; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 潜行：低姿、步幅短，披风下摆贴地拖动
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bob = 0;
      P.hx += P.step * 0.5; P.bhx -= P.step * 0.5;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 快速连射两箭：1 帧预兆 → 松弦 → 再搭 → 松弦
      P.arw = 1;
      if (tq < T_SHOT1) { setK(K_DRAW, K_DRAW, 0); P.gem = 1; P.beard = 1; }
      else if (tq < 2 / 12) { setK(K_LOOSE, K_LOOSE, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < T_SHOT2) { setK(K_LOOSE, K_DRAW, tq < 3 / 12 ? 0.6 : 1); P.gem = 1; P.beard = -1; P.bend = 2; }
      else if (tq < 5 / 12) { setK(K_LOOSE, K_LOOSE, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; P.arw = 0; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 5 / 12) / 0.3))); P.arw = 0; }
    } else if (st === CHARGE) {                                        // 标记石暗 → 亮两档，紫色符文粒子绕弓臂收拢
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q); P.arw = 1; P.pull = tq < 0.12 ? 1 : tq < 0.3 ? 2 : 3;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                          // 扇形连射 3 支：每支 1 帧松弦 + 1 帧再搭
      const f = Math.min(5, Math.floor(tq * 12 + 1e-6)); P.arw = 1; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; P.bend = 3;
      if (f <= 4 && (f & 1) === 0) { setK(K_SHOT, K_SHOT, 0); P.arw = 0; } else if (f < 5) setK(K_AIM, K_AIM, 0);
      else { setK(K_SHOT, K_HOLD, ease.out(clamp01((tq - 5 / 12) / 0.1))); P.arw = 0; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                       // 面罩下呼出一口紫雾，放下弓
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.beard = -RD(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.head = tq < 0.3 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 化灰：中箭 → 单膝跪地、弓立在身前 → 标记石闪几下熄灭 → 从头顶化为紫灰（死亡套件 ash）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; P.sway = 0; P.gem = d < 0.7 ? ((f12 & 1) ? 1 : 4) : 4; if (d >= T_ASH - INCOMING) P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    const s = stoneAt(P); P.gx = s[0] + P.bx; P.gy = s[1];            // 发光体 = 弦上的标记石
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：hoodTail（同游侠）—— 尖顶兜帽后坠的长兜帽尾，尾梢随 P.beard 反向甩
  function hoodBack(R) {
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'back' });
    const x0 = R.hx0, top = R.htop, b = P.beard || 0, n = R.hy + 5 - top;
    for (let k = 0; k <= n; k++) { const q = k / n, x = x0 - 3 - RD(k * 0.2) + RD(b * q * q * 1.4), y = top - 3 + k; parts.px(E, R, x, y, M.hood, k === n ? 4 : 0); if (k < n) parts.px(E, R, x + 1, y, M.hood, 0); }
  }
  // 候选部件：skullMask —— 画进脸的同一部件的下半张骷髅面罩（鼻孔、牙排），骨白
  function skullMask(R) {
    const x0 = R.hx0, x1 = R.hx1, ey = R.ey, bot = R.hy;
    for (let y = ey + 1; y <= bot; y++) parts.run(E, R, y, x0 + 2, x1 + (y === ey + 1 ? 1 : 0), M.bone, 0);
    parts.px(E, R, x1 + 1, ey + 1, M.bone, 4); parts.px(E, R, x1, ey + 2, M.bone, 1);                           // 鼻骨尖 + 鼻孔
    for (let x = x0 + 2; x <= x1; x += 2) parts.px(E, R, x, bot - 1, M.bone, 1);                                 // 牙缝
    parts.px(E, R, x1, bot + 1, M.bone, 3);                                                                     // 下颌尖
    parts.px(E, R, x0 - 3, ey - 3, M.skin, 4);                                                                  // 精灵长尖耳（再往后上伸 1 格）
  }
  // 候选部件：tallQuiver —— 更高的斜挎箭袋（14 格，骨环分段），插满黑羽箭，羽束高出肩 4 格
  function tallQuiver(R) {
    const e = parts.edges(R, R.yS + 3), bx = e[0], y0 = R.yWaist + 2;
    E.part();
    parts.bar(15, bx + 2, y0, 0, 13, 3, (k, j, X, Y) => parts.px(E, R, X, Y, M.bone, (k % 4) === 3 ? 1 : j === 0 ? 4 : j === 2 ? 2 : 0));
    const c = parts.cell(15, bx + 2, y0, 14);
    E.part();
    for (let i = 0; i < 3; i++) {
      const ax = c[0] - 1 + i * 2, ay = c[1] - (i === 1 ? 3 : 1);
      parts.px(E, R, ax, ay + 1, M.shaft, 3); parts.px(E, R, ax, ay, M.shaft, 3);
      parts.px(E, R, ax, ay - 1, M.fletch, 4); parts.px(E, R, ax - 1, ay - 2, M.fletch, 3); parts.px(E, R, ax + 1, ay - 2, M.fletch, 2); parts.px(E, R, ax, ay - 2, M.fletch, 3);
    }
  }
  // 候选部件：recurveBow —— 反曲骨弓：黑木弓臂缠黑布（每 3 行一道暗箍）、两端 3 格骨梢向前外翻成骨刺钩、弦、黑羽箭；弦上的标记石另画
  function recurveBow(R) {
    const gx = P.hx, gy = P.hy, pull = P.pull;
    E.part();
    for (let r = -BL; r <= BL; r++) {
      const a = Math.abs(r), x = gx + limbX(r, pull), tip = a > BL - 3;
      parts.px(E, R, x, gy + r, tip ? M.bone : M.bw, a <= 1 ? 3 : tip ? (a === BL ? 4 : 0) : (a % 3) === 0 ? 1 : 0);
      if (a <= 2) parts.px(E, R, x + 1, gy + r, M.bw, 2);
      if (a === BL) parts.px(E, R, x + 1, gy + r + (r < 0 ? 1 : -1), M.bone, 3);                                // 骨刺钩回勾
    }
    const ex = gx + limbX(BL - 2, pull) - 1, e0 = gy - BL + 2, e1 = gy + BL - 2;
    if (pull) { parts.line(E, R, ex, e0, P.bhx, P.bhy, M.string, 3); parts.line(E, R, P.bhx, P.bhy, ex, e1, M.string, 3); }
    else parts.line(E, R, ex, e0, ex, e1, M.string, 3);
    if (P.arw && pull) {
      E.part(); const y = P.bhy;
      parts.run(E, R, y, P.bhx, gx + 4, M.shaft, 3); parts.px(E, R, gx + 5, y, M.head, 4); parts.px(E, R, gx + 4, y - 1, M.head, 3); parts.px(E, R, gx + 4, y + 1, M.head, 2);
      parts.px(E, R, P.bhx + 1, y - 1, M.fletch, 4); parts.px(E, R, P.bhx, y - 1, M.fletch, 3); parts.px(E, R, P.bhx + 1, y + 1, M.fletch, 2);
    }
  }
  // 标记石（2×2，5 档：待机 / 蓄力 / 蓄满 / 施放 / 熄灭）
  const STONE = [[[0, 4], [0, 3], [0, 3], [0, 2]], [[1, 3], [0, 4], [0, 4], [0, 3]], [[1, 4], [1, 3], [1, 3], [0, 4]], [[1, 4], [1, 4], [1, 4], [1, 3]], [[0, 2], [0, 1], [0, 1], [0, 1]]];
  function markStone(R) {
    const s = stoneAt(P), L = STONE[P.gem]; E.part();
    for (let i = 0; i < 4; i++) parts.px(E, R, s[0] + (i & 1), s[1] + (i >> 1), L[i][0] ? M.glow : M.gem, L[i][1]);
    if (P.glint) parts.px(E, R, s[0], s[1] - 1, M.glow, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    parts.cape(E, R, P, { style: 'tattered', mat: M.cloak, len: -1, flare: 5 });
    tallQuiver(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.tunicD, cuff: M.boneD, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'leather', mat: M.tunic, belt: M.strap, buckle: M.bone, strap: M.strap, studs: M.bone });
    hoodBack(R);
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'young', eye: M.gem, eyeStyle: 'narrow', brow: M.ink, nose: 'none', mouth: 'none', ear: 'pointy' }); skullMask(R);
    parts.hood(E, R, P, { style: 'cowl', mat: M.hood, layer: 'front' });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.tunic, cuff: M.bone, cuffStyle: 'bracer', hand: M.shaft });
    recurveBow(R);
    markStone(R);
    parts.hand(E, R, P, { side: 'B', hand: M.shaft });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const SX = DUMMY_X, SY_TOP = HY - 40, SY = HY - 15, RINGS = [12, 9, 6];
  let mzT = 9, mzX = 0, mzY = 0, markN = 0, markT = 9, heapT = 9, chargeAcc = 0, mistAcc = 0, lastStep = 0, ashAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function loose(k, vy) {                                             // 发一支黑羽箭 + 枪口紫十字
    const gx = wx(P.hx + P.bx) + 5, gy = wy(P.bhy); mzT = 0; mzX = gx; mzY = gy;
    shoot(k, gx + 1, gy, k === 2 ? 230 : 250, DUMMY_X - 3, R_EL, vy || 0, { trail: { every: 1, life: [0.08, 0.22], back: [12, 30] }, glow: k === 2 ? 2 : -1 });
    sfx('shoot', { proj: 'arrow' });
  }
  function onEnter(s) {
    if (s !== CAST) return;
    releaseOrbit(40, 90, 0.25, 0.5); loose(2, -14); markN = 0; markT = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_SHOT1 || t === T_SHOT2)) { loose(1, 0); sfx('swing', { kind: 'bow', w: 0.2 }); }
    if (s === CAST && Math.abs(t - 2 / 12) < 1e-9) loose(2, 0);
    if (s === CAST && Math.abs(t - 4 / 12) < 1e-9) {
      loose(2, 14); shake(0.28, 2); flash(0.05); burst(wx(P.hx) + 5, wy(P.bhy), 14, 40, 90, 0.2, 0.45, R_EL, 4);
    }
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: FXI.curse, fadeAt: 1.2 }); heapT = 0; shake(0.12, 1);
    }
  }
  const EVENTS = [[], [], [T_SHOT1, T_SHOT2], [], [2 / 12, 4 / 12], [], [], [T_KNEE, T_ASH], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.12, 0.3, FXI.impact, 8); burst(x, y, 4, 20, 50, 0.15, 0.3, R_EL, 4); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.2 }); return; }
    if (k !== 2) return;
    markN = Math.min(3, markN + 1); markT = 0;                        // 每支命中：靶心外加一圈
    burst(x, y, 10, 30, 90, 0.15, 0.4, R_EL, 6); fx.cross(x, y, 4, R_EL, 0.2);
    if (markN < 3) { hitDummy(0); sfx('impact', { pal: 'curse', w: 0.3 }); return; }
    burst(SX, SY, 30, 50, 130, 0.3, 0.7, R_EL, 10); ring(SX, SY, 0, R_EL);                                   // 最后一圈：诅咒外爆 + 小冲击环 + 刀锋斜切 + 被标记
    fx.slash(SX - 8, SY + 8, 12, 0.05, 1.5, FXI.steel, 0.25, 2, 2);
    hitDummy(1); dummyFx({ dur: 1.4, tint: 'curse', outline: 'curse' }); shake(0.12, 1); sfx('impact', { pal: 'curse', w: 0.6 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                            // 紫色符文粒子绕弓臂收拢到标记石
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.15 }); lastStep = P.step; }   // 潜行：几乎不起尘
    if (state === RECOVER && stT < 0.45) {                             // 面罩下呼出一口紫雾
      mistAcc += dt * 26; const mx = wx(R0.hx1 + 2 + P.bx), my = wy(R0.ey + 3 + 2);
      while (mistAcc >= 1) { mistAcc -= 1; spawn(K_RISE, mx + Math.random() * 2, my + Math.random() * 2, 8 + Math.random() * 10, -4 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > T_ASH && stT < T_ASH + 1.2) { ashAcc += dt * 10; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 14, HY - 2 - Math.random() * 18, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.8 + Math.random() * 0.6, R_EL); } }
    mzT += dt; markT += dt; heapT += dt;
  }
  function fxReset() { mzT = 9; markN = 0; markT = 9; heapT = 9; chargeAcc = 0; mistAcc = 0; lastStep = 0; ashAcc = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {                                              // 化灰后塌落在地的空披风，慢慢抖动消散
    if (heapT > 1.7) return; const fade = clamp01((heapT - 0.9) / 0.8), x0 = HX - 3;
    const rows = [[-7, 6, 34], [-6, 5, 52], [-4, 3, 52]];
    for (let j = 0; j < rows.length; j++) { const [a, b, c] = rows[j], y = HY - j; for (let x = a; x <= b; x++) { if (hash(x + 40, j) < fade) continue; put(x0 + x, y, (x === a || x === b) ? 0 : ((x + j) % 4 === 0 ? 35 : c)); } }
  }
  function sigil(x, y, r, c0, c1, f12) {                            // 紫色靶心符：圆 + 十字
    const n = Math.ceil(r * 6); for (let k = 0; k < n; k++) { if (((k + f12) % 4) === 3) continue; const a = k / n * 6.2832; put(RD(x + Math.cos(a) * r), RD(y + Math.sin(a) * r), c0); }
    for (let d = 1; d <= r + 2; d++) { const c = d > r - 1 ? c0 : c1; put(x + d, y, c); put(x - d, y, c); put(x, y + d, c); put(x, y - d, c); } put(x, y, EL[0]);
  }
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (st === CHARGE && t > 0.35) { const q = clamp01((t - 0.35) / 0.5); sigil(SX, SY_TOP, RD(2 + 2 * q), q < 1 ? EL[2] : ((f12 & 1) ? EL[0] : EL[1]), EL[3], f12); }
    if ((st === CAST || st === RECOVER) && markT < 1.3) {
      sigil(SX, SY, 3, EL[1], EL[3], f12);
      for (let i = 0; i < markN; i++) { const r = RINGS[i], fresh = i === markN - 1 && markT < 2 / 12, n = Math.ceil(r * 6); for (let k = 0; k < n; k++) { if (markT > 0.9 && ((k + f12) & 1)) continue; const a = k / n * 6.2832; put(RD(SX + Math.cos(a) * r), RD(SY + Math.sin(a) * r * 0.9), fresh ? EL[0] : i === 2 ? EL[1] : EL[2]); } }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx - r, gy, c); put(gx + 1 + r, gy, c); put(gx, gy - r, c); put(gx, gy + 1 + r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1 && k !== 2) return false;                              // 黑羽箭：钢箭头 + 黑杆 + 紫羽（技能箭的箭头是刀锋白）
    put(x + d, y, k === 2 ? STL[0] : STL[1]); put(x, y, STL[2]); for (let i = 1; i <= 3; i++) put(x - i * d, y, 53);
    put(x - 3 * d, y - 1, R[0]); put(x - 4 * d, y - 1, R[1]); put(x - 3 * d, y + 1, R[1]);
    if (k === 2) { put(x - 5 * d, y, R[2]); put(x - 4 * d, y + 1, R[2]); }
    return true;
  }

  return {
    name: '死亡射手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gem, M.glow], HIT_POINT: [1, -14], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'curse', style: 'spiral', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
