// 幻影射手（部队 · 恶魔 · 射手 · 优质）：沙漠弓手换上崭新面具后的同一个人——腰背挺直、修长；同款沙色头巾 + 加长到 7 格的头巾尾（尾端金流苏）、
// 同款恶魔角长到 3 格并向后弯；崭新的瓷白全脸面具（两道紫色泪痕、额心一颗紫晶第三眼）；暮紫丝绸长袍（金镶边、下摆开衩）；
// 竖握的月牙长反曲弓（黑檀 + 金镶片，弓梢外翻，几乎与人同高）；同款腰侧箭筒，箭羽换成半透明的幻影羽。
// 攻击 = 竖握长弓一弦搭三箭扇形齐射；技能 = 特性「幽灵尖叫」升级版：两张幻影面具从脸上分离环绕 → 三张面具各吐一支幻影箭 → 三处同时十字星芒 + X 形刀锋。
// 由「沙漠弓手」（DesertArcher.js）升级而来，升级成「烈焰射手」（BlazingShooter.js）。
PCD.define('FantasyShooter', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, copySprite, blitShape, sfx } = E;
  const RD = Math.round;

  // ───── 元素：幽啸 · 灰蓝紫（wail，同升级线）+ 幻影紫点缀（curse 第 2 级：面具幻影、泪痕）─────
  const R_EL = fxRamp('wail', ['#ffffff', '#e2e4ff', '#9c9ed8', '#5c5c92', '#28283e']), EL = FXR[R_EL], CU = FXR[FXI.curse];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'purple', band: 2 }, trim: 'gold', wrap: 'sand', belt: 'gold', skin: ['#1a1624', '#3a3048', '#5e5070', '#8a7aa0'], boot: 'boot',
    mask: 'white', tear: { r: 'purple', flat: 1 }, ink: { r: 'ink', flat: 1 }, horn: 'bone', tassel: 'gold',
    bow: [0, 52, 54, 60], inlay: 'gold', string: 'pale', shaft: [0, 53, 54, 43], head: 'steel', fletch: { r: [42, 24, 43, 21], flat: 1 }, quiver: 'leather',
    gem: { r: [25, 42, 24, 43], flat: 1 }, glow: { r: [43, 43, 21, 21], flat: 1 },   // 额心紫晶（发光体）
  });
  const BODY = { body: 'slim', leg: 10, torso: 8, head: 7, headW: 5, waist: 1, stride: 3, lift: 1, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 50, 40, 46), ghost = new Sprite(84, 50, 40, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, rimAll: 0, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bow', 'inlay', 'string', 'shaft', 'head', 'fletch', 'mask', 'tear', 'ink', 'gem', 'glow', 'skin', 'tassel']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const BL = 12;                                                      // 半弓长：25 格月牙长弓

  // ───── 姿势：前手 = 竖握弓把，后手 = 搭箭 / 拉弦；挺直站姿 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, arw: 0, crack: 0, shat: 0, adj: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  const K_IDLE = K(10, -15, 1, -11);                                    // 长弓竖在身前（推到身体前面，弦和身体之间露出夜空），后手垂在腰侧
  const K_DRAW = K(11, -17, 1, -18, 0, 0, 0, 3);                       // 一弦搭三箭拉满
  const K_LOOSE = K(11, -17, -3, -19, -1, 0, 0, 0);
  const K_HOLD = K(11, -17, -1, -17);
  const K_AIM = K(11, -17, 2, -18, -1, 0, 0, 3);                       // 技能蓄力：挺身拉满，幻影面具环绕
  const K_SHOT = K(11, -17, -3, -19, -1, 0, 0, 0);
  const K_HURT = K(7, -13, -3, -12, -1, -1, 1);
  const K_BREAK = K(8, -14, -2, -16, -1, -1, 1);                      // 死亡：面具裂开，仰身
  const K_ARCH = K(7, -16, -3, -18, -2, -1, 1);                       // 仰身第 2 档：上身再往后仰 1 格、弓梢跟着往上抬
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -2, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['arw', 0, 3], ['crack', 0, 2], ['shat', 0, 1], ['adj', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_LOOSE = 2 / 12, T_SHAT = INCOMING + 0.6;
  const R0 = parts.rig({}, BODY);
  // 待机个性（1.5–2.25 s）：后手抬到面具侧边扶正（停 3 帧），到位那一帧额晶闪到 2 档
  const ADJ = [[1, 0], [2, 2], [2, 1], [2, 1], [1, 0], [0, 0], [0, 0], [0, 0], [0, 0]];

  // 月牙长弓的几何：握把处向前鼓出、往两端逐渐收回成「)」形弧（弯度 4 格，拉满 5 格），两端再外翻 2 格；弦挂在弧的两端，和握把之间空 3 格
  const BE = BL - 2, bendOf = (pull) => 4 + (pull >= 2 ? 1 : 0);
  function limbX(r, pull) { const a = Math.abs(r), b = bendOf(pull); return a <= BE ? -RD(b * (a / BE) * (a / BE)) : -b + (a - BE); }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.arw = 0; P.crack = 0; P.shat = 0; P.adj = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[(Math.floor(TT * 1.25 + 1e-6) + 2) & 3];   // 袍摆和头巾尾错相位
      const lp = tq % DUR[IDLE];
      if (lp >= 1.5 && lp < 2.25) { const c = ADJ[Math.min(8, Math.floor((lp - 1.5) * 12 + 1e-6))]; if (c[0]) { P.adj = 1; P.bhx = R0.hx1 + (c[0] === 2 ? 1 : 0); P.bhy = c[0] === 2 ? R0.ey : R0.ey + 4; } P.glint = c[1] === 2 ? 1 : 0; P.gem = c[1]; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 脚尖点地的滑步（抬脚 1 格、不起伏），身后拖 1 帧幻影残像
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bob = 0;
      P.hx += P.step * 0.5; P.bhx -= P.step;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_DRAW, ease.out(tq / 0.12)); P.arw = 3; P.pull = tq < 1 / 12 ? 2 : 3; P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_LOOSE, K_LOOSE, 0); P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { setK(K_LOOSE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.beard = -1; P.bend = 2; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q); P.arw = 1; P.pull = tq < 0.12 ? 1 : tq < 0.3 ? 2 : 3;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {
      if (tq < 2 / 12) { setK(K_SHOT, K_SHOT, 0); P.beard = -2; P.sway = -1; P.bend = 3; P.gem = 3; P.rim = 3; }
      else { setK(K_SHOT, K_HOLD, ease.out(clamp01((tq - 2 / 12) / 0.3))); P.beard = -1; P.bend = 2; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.beard = -RD(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 碎裂：中箭 → 面具先裂成三瓣、全身透出幻影紫 → 像玻璃一样裂块迸散（死亡套件 chunks）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.1) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; P.crack = 1; }
      else if (d < 0.25) { setK(K_BREAK, K_BREAK, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 2; P.crack = 1; P.gem = (f12 & 1) ? 1 : 0; }   // 仰身 1 档
      else if (d < T_SHAT - INCOMING) { setK(K_ARCH, K_ARCH, 0); P.bx = -3; P.eyes = 1; P.beard = 2; P.bend = 3; P.crack = 2; P.gem = 4; if (d >= 0.45) { P.shat = 1; P.rim = 3; } }   // 仰身 2 档
      else { setK(K_ARCH, K_ARCH, 0); P.bx = -3; P.crack = 2; P.gem = 4; P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    const c = crystalAt(); P.gx = c[0] + P.bx; P.gy = c[1];            // 发光体 = 额心紫晶
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  // 额心紫晶的位置（和 rig 同一套几何）
  function crystalAt() { const cr = Math.min(3, RD(P.crouch)), lean = RD(P.lean), hx1 = R0.hx1 + lean + RD(P.head); return [hx1 - 1, R0.htop + 1 + P.bob + cr]; }

  // ───── 画（部件从后往前）─────
  // 候选部件：scarfTailDrape —— 贴着背往下垂到腰的头巾尾（布）：根部 3 格宽、往尾端收成 1 格，中段一处折弯（波浪），
  // 尾端 3 格随 P.sway 左右摆 1 格，P.beard < 0 时下半截被风往后吹；尾端缀一小撮金流苏（同沙漠弓手的头巾尾，加长）
  const WAVE = [0, 0, 0, -1, -1, -1, 0, 0, -1, -1];
  function wrapTail(R, len) {
    E.part(); const b = P.beard || 0, y0 = R.htop + 3, L = len + 2, sw = P.sway > 0 ? -1 : P.sway < 0 ? 1 : 0; let tx = 0, ty = 0;
    for (let k = 0; k <= L; k++) {
      const y = y0 + k, back = y <= R.hy + 1 ? R.hx0 - 1 : parts.edges(R, y)[0], w = k < 2 ? 3 : k < 5 ? 2 : 1;
      const xr = back - 1 + (WAVE[k] || 0) + (k > L - 3 ? sw : 0) - (b < 0 ? RD(-b * k / L) : 0);
      for (let j = 0; j < w; j++) parts.px(E, R, xr - j, y, M.wrap, j === w - 1 && w > 1 ? 4 : j === 0 && w > 1 ? 2 : 0);
      tx = xr - w + 1; ty = y;
    }
    E.part(); parts.px(E, R, tx, ty + 1, M.tassel, 4); parts.px(E, R, tx + 1, ty + 1, M.tassel, 3); parts.px(E, R, tx, ty + 2, M.tassel, 2);
  }
  // 候选部件：hipQuiver（同沙漠弓手），箭羽换成半透明的幻影羽（紫、隔格发亮）
  function hipQuiver(R) {
    const e = parts.edges(R, R.yWaist + 1), x0 = e[0] + 3, y0 = R.yHip + 1;       // 比上一级更平、更低地挂在胯侧，给垂到腰的头巾尾让位
    E.part();
    parts.bar(12, x0, y0, 0, 6, 3, (k, j, X, Y) => parts.px(E, R, X, Y, M.quiver, k === 6 ? 4 : j === 0 ? 4 : j === 2 ? 2 : 0));
    const c = parts.cell(12, x0, y0, 7); E.part();
    for (let i = 0; i < 3; i++) { const ax = c[0] - i, ay = c[1] + i * 2 - 2; parts.px(E, R, ax, ay, M.shaft, 3); parts.px(E, R, ax - 1, ay, M.fletch, 3); parts.px(E, R, ax - 2, ay - 1, M.fletch, (i & 1) ? 4 : 2); parts.px(E, R, ax - 2, ay + 1, M.fletch, 1); }
  }
  // 候选部件：demonHorns（同沙漠弓手）——长到 3 格、根部 2 格、向后上方弯，骨白亮段；从头巾顶两侧伸出，角身和头巾顶之间空 1 行
  function horns(R) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, Y = R.htop - 2;               // Y = 头巾顶行
    parts.px(E, R, x1, Y, M.horn, 3); parts.px(E, R, x1 + 1, Y, M.horn, 2);          // 前角：根部 2 格 → 竖起 2 格 → 尖往后弯过头顶
    parts.px(E, R, x1, Y - 1, M.horn, 4); parts.px(E, R, x1, Y - 2, M.horn, 4); parts.px(E, R, x1 - 1, Y - 3, M.horn, 4);
    parts.px(E, R, x0 - 1, Y, M.horn, 3); parts.px(E, R, x0 - 2, Y, M.horn, 2);       // 后角：根部 2 格 → 斜着往后上方
    parts.px(E, R, x0 - 2, Y - 1, M.horn, 3); parts.px(E, R, x0 - 3, Y - 2, M.horn, 4); parts.px(E, R, x0 - 4, Y - 3, M.horn, 4);
  }
  // 候选部件：porcelainMask —— 同款头巾 + 崭新的瓷白全脸面具（紫色泪痕两道、额心紫晶第三眼），都画进脸的同一部件
  const GEM_T = [[0, 3], [0, 4], [1, 3], [1, 4], [0, 1]];
  function wrapAndMask(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey, bot = R.hy, ex = x1 - 1;
    parts.run(E, R, top - 2, x0, x1 - 1, M.wrap, 0); parts.run(E, R, top - 1, x0 - 1, x1, M.wrap, 0);
    for (let y = top; y <= bot + 1; y++) parts.run(E, R, y, x0 - 1, x0 + (y > bot ? 3 : 0), M.wrap, 0);
    parts.px(E, R, x0 + 1, top - 2, M.wrap, 4); parts.px(E, R, x0 + 3, top - 2, M.wrap, 2); parts.px(E, R, x0 + 2, top - 1, M.wrap, 4); parts.px(E, R, x0 - 1, top + 2, M.wrap, 2); parts.px(E, R, x0, top + 5, M.wrap, 2);
    for (let y = top; y <= bot; y++) parts.run(E, R, y, x0 + 1, x1 + (y === ey + 1 ? 1 : 0), M.mask, 0);
    parts.px(E, R, x1 + 1, ey + 1, M.mask, 4); parts.px(E, R, x0 + 1, top, M.mask, 4);
    if (P.eyes) { parts.px(E, R, ex, ey, M.ink, 1); parts.px(E, R, ex - 1, ey, M.ink, 1); } else { parts.px(E, R, ex, ey, M.ink, 1); parts.px(E, R, ex - 1, ey + 1, M.ink, 1); }   // 眼洞：下弯的 2 格（闭眼时压平）
    parts.px(E, R, ex - 1, ey + 3, M.tear, 3); parts.px(E, R, ex - 3, ey + 3, M.tear, 2);   // 两道画上去的紫泪痕：每边 1 格，在眼洞下沿往下 2 格
    parts.px(E, R, x1, bot, M.mask, 2);
    const g = GEM_T[P.gem]; parts.px(E, R, ex, top + 1, g[0] ? M.glow : M.gem, g[1]);                                  // 额心紫晶（发光体）
    if (P.glint) parts.px(E, R, ex, top, M.glow, 4);
    if (P.crack) {                                                     // 面具裂成三瓣
      parts.px(E, R, ex - 1, top, M.ink, 1); parts.px(E, R, ex - 1, top + 1, M.ink, 1); parts.px(E, R, ex - 2, top + 2, M.ink, 1);
      if (P.crack > 1) { parts.px(E, R, ex - 2, ey + 1, M.ink, 1); parts.px(E, R, ex - 1, ey + 2, M.ink, 1); parts.px(E, R, x1, ey + 1, M.ink, 1); parts.px(E, R, x0 + 1, ey + 2, M.ink, 1); }
    }
  }
  // 候选部件：crescentBow —— 竖握的月牙长反曲弓：黑檀弓臂每 4 行一片金镶片、金色握把、两端 2 格弓梢外翻；arw = 1 一支箭，3 = 一弦三箭扇形
  function crescentBow(R) {
    const gx = P.hx, gy = P.hy, pull = P.pull;
    E.part();
    for (let r = -BL; r <= BL; r++) {
      const a = Math.abs(r), x = gx + limbX(r, pull), grip = a <= 1, inl = a === 6 || a === BL;
      parts.px(E, R, x, gy + r, grip || inl ? M.inlay : M.bow, grip ? 3 : inl ? 4 : a <= BE ? 4 : 0);   // 弓臂内沿一条亮边，月牙弧读得出来
      if (a <= 5) parts.px(E, R, x + 1, gy + r, grip ? M.inlay : M.bow, 3);             // 弓臂中段 2 格粗（闪白时整条读得出来）
    }
    const ex = gx + limbX(BE, pull), e0 = gy - BE, e1 = gy + BE;
    if (pull) { parts.line(E, R, ex, e0, P.bhx, P.bhy, M.string, 2); parts.line(E, R, P.bhx, P.bhy, ex, e1, M.string, 2); }
    else parts.line(E, R, ex, e0, ex, e1, M.string, 2);
    if (P.arw && pull) {
      E.part(); const y = P.bhy, x0 = P.bhx, x1 = gx + 5;
      const one = (dy) => {                                          // dy：箭尖相对箭尾的上下偏（扇形）
        for (let x = x0 + 1; x <= x1; x++) parts.px(E, R, x, y + RD(dy * (x - x0) / (x1 - x0)), M.shaft, 3);
        parts.px(E, R, x1 + 1, y + dy, M.head, 4); parts.px(E, R, x0 + 1, y - 1, M.fletch, 4); parts.px(E, R, x0 + 1, y + 1, M.fletch, 2);
      };
      one(0); if (P.arw === 3) { one(-3); one(3); }
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    hipQuiver(R);
    if (!P.adj) parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.robeD, cuff: M.trimD, cuffStyle: 'band', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.skin, matD: M.skinD, boot: M.boot, bootD: M.bootD, bootH: 4 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.belt, buckle: M.tassel, collar: M.trim, flare: 3 });
    { const hem = tor.hem, sx = tor.rows[1][tor.rows[1].length - 1] - 2;   // 下摆前开衩：露出 3 行腿
      for (let y = hem - 3; y <= hem; y++) parts.px(E, R, sx + (P.sway > 0 ? 1 : 0), y, M.skin, y === hem - 3 ? 2 : 0); }
    wrapTail(R, 7);                                                    // 头巾尾贴着背垂下（盖在袍子后沿、箭筒箭尾前面）
    horns(R);
    parts.head(E, R, P, { mat: M.skin, face: 'long', age: 'young', eye: M.ink, nose: 'small', mouth: 'none', ear: 'none' });
    wrapAndMask(R);
    if (P.adj) parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.robeD, cuff: M.trimD, cuffStyle: 'band', grip: 'none' });   // 扶面具：后臂抬到胸前、盖在身体前面
    parts.arm(E, R, P, { sleeve: 'bell', mat: M.robe, cuff: M.trim, cuffStyle: 'band', hand: M.skin, grip: 'none' });
    crescentBow(R);
    parts.hand(E, R, P, { hand: M.skin });
    parts.hand(E, R, P, { side: 'B', hand: M.skin });
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.flash = P.flash; RIM.dq = P.dq;
    if (P.shat) { RIM.rimRamp = CU; RIM.rimAll = 1; RIM.rimR = [0, 20, 24, 30]; RIM.rx = hero.ox + 1; RIM.ry = hero.oy - 14; }   // 碎裂前一刻：全身外沿透出幻影紫
    else { RIM.rimRamp = EL; RIM.rimAll = 0; RIM.rimR = [0, 6, 12, 16]; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; }
    bake(hero, RIM);
  }

  // ───── 特效 ─────
  let atkY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, lastStep = 0, ghT = 9, ghX = 0, ghFlip = 0, shT = 9;
  const AFT = [0, 1, 2].map(() => ({ t: 9, x: 0, y: 0 }));             // 命中后的面具残影
  const SH = [0, 1, 2].map(() => ({ x: 0, y: 0, vx: 0, vy: 0, r: 0 }));  // 死亡时落地的三片面具
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const faceW = () => [wx(P.gx - P.bx + P.bx), wy(P.gy + 2)];
  // 幻影面具（5×5 小剪影 + 两个眼洞 + 一道泪痕）；half = 1 隔格画（半透明）
  function maskAt(x, y, c, ce, half, f12, fade) {
    x = RD(x); y = RD(y);
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      if (Math.abs(j) === 2 && Math.abs(i) === 2) continue; if (half && ((i + j + f12) & 1)) continue; if (fade && hash(i + 9, j + 9 + f12) < fade) continue;
      const eye = j === -1 && (i === -1 || i === 1), tear = j === 1 && i === 1; put(x + i, y + j, eye ? ce : tear ? CU[1] : c);
    }
  }
  function orbit(t, k) { const [fx0, fy0] = faceW(), a = t * 5.2 + k * Math.PI, rx = 3 + 7 * clamp01(t / 0.5); return [fx0 - 1 + Math.cos(a) * rx, fy0 + Math.sin(a) * rx * 0.45, Math.sin(a)]; }
  const CAST_PTS = [[4, -8], [0, 0], [4, 8]];                          // 施放：三张面具排成上 / 中 / 下
  function onEnter(s) {
    if (s !== CAST) return;
    const [fx0, fy0] = faceW(); releaseOrbit(40, 90, 0.25, 0.5);
    for (let i = 0; i < 3; i++) {                                     // 三张面具同时张口吐出三支幻影箭，面具位置各一枚十字星芒
      const x = fx0 + 4 + CAST_PTS[i][0], y = fy0 + CAST_PTS[i][1], ty = HY - [26, 15, 5][i], dist = DUMMY_X - 3 - x;
      shoot(2, x, y, 230, DUMMY_X - 3, R_EL, (ty - y) * 230 / Math.max(10, dist), { trail: { every: 1, life: [0.1, 0.26], back: [12, 30], off: 3 }, glow: i === 1 ? 2 : -1 });
      fx.cross(x, y, 6, R_EL, 0.25);
    }
    burst(fx0 + 4, fy0, 16, 40, 100, 0.15, 0.45, R_EL, 4); shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {                               // 一弦三箭：扇形齐射
      const gx = wx(K_DRAW.hx + 6), gy = wy(K_DRAW.hy - 1 + P.bob); mzT = 0; mzX = gx; mzY = gy; atkY = gy;
      for (const vy of [-45, 0, 45]) shoot(1, gx + 1, gy, 240, DUMMY_X - 3, R_EL, vy, { trail: { every: 2, life: [0.06, 0.14], back: [8, 20] }, glow: -1 });
      sfx('swing', { kind: 'bow', w: 0.22 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_SHAT) {
      poseAt(DEATH, T_SHAT - 1 / 12, T_SHAT - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 1.1, fromX: 6, fromY: -20, fadeAt: 1.3, ramp: FXI.curse });
      const [fx0, fy0] = [HX + P.gx, HY + P.gy + 2];
      for (let i = 0; i < 3; i++) { const s0 = SH[i]; s0.x = fx0 - 1 + i; s0.y = fy0 + i; s0.vx = (i - 1) * 26 - 6; s0.vy = -40 + i * 10; s0.r = i; }
      shT = 0; burst(fx0, fy0, 22, 40, 110, 0.2, 0.6, FXI.curse, 8); fx.cross(fx0, fy0, 7, FXI.curse, 0.3); shake(0.16, 2); sfx('fall', { w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [], [], [], [T_SHAT], []];
  const deathKit = { mode: 'chunks', at: T_SHAT };
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 6, 30, 70, 0.12, 0.3, FXI.impact, 6); spawn(K_BURST, x, y, 20, -20, 0.2, R_EL); if (Math.abs(y - atkY) < 3) { hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.2 }); } return; }   // 中间一支到达：假人受击 + hit
    if (k !== 2) return;                                               // 三处同时：十字星芒 + 两段交叉刀锋（X 形），碎成面具残影
    fx.cross(x, y, 6, R_EL, 0.3); fx.slash(x - 6, y + 6, 9, 0.05, 1.5, R_EL, 0.28, 2, 2); fx.slash(x + 6, y + 6, 9, -0.05, -1.5, R_EL, 0.28, 2, 2);
    burst(x, y, 14, 40, 110, 0.2, 0.5, R_EL, 6); burst(x, y, 5, 20, 50, 0.2, 0.4, FXI.curse, 4);
    const a = AFT.find((o) => o.t > 0.6) || AFT[0]; a.t = 0; a.x = x; a.y = y;
    if (Math.abs(y - (HY - 15)) < 3) { hitDummy(1); shake(0.12, 1); ring(x, y, 0, R_EL); }
    sfx('impact', { pal: 'arcane', w: 0.3 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {
      chargeAcc += dt * (8 + 16 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 2.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {                       // 滑步：不起尘，每次落脚留 1 帧幻影残像
      if (P.step !== 0) { sfx('step', { w: 0.1 }); copySprite(ghost, hero); ghT = 0; ghX = HX + P.mx - (P.flip ? -3 : 3); ghFlip = P.flip; }
      lastStep = P.step;
    }
    ghT += dt; mzT += dt; shT += dt; for (const a of AFT) a.t += dt;
    if (shT < 2.4) for (const s0 of SH) { s0.vy += 150 * dt; s0.x += s0.vx * dt; s0.y += s0.vy * dt; if (s0.y >= HY - 1) { s0.y = HY - 1; s0.vy = -s0.vy * 0.25; s0.vx *= 0.5; } }
  }
  function fxReset() { mzT = 9; chargeAcc = 0; lastStep = 0; ghT = 9; shT = 9; for (const a of AFT) a.t = 9; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {
    const st = E.state, t = E.stT;
    if (ghT < 1 / 6) blitShape(ghost, RD(ghX), HY, ghFlip, EL[3], ghT * 5);
    if (st === CHARGE && t > 0.2) for (let k = 0; k < 2; k++) { const o = orbit(t - 0.2, k); if (o[2] < 0) maskAt(o[0], o[1], EL[3], EL[4], 1, f12); }   // 转到身后的幻影面具
    if (shT < 2.4) for (const s0 of SH) {                               // 落地的三片面具（最后抖动消散）
      const x = RD(s0.x), y = RD(s0.y), fade = clamp01((shT - 1.6) / 0.8); if (hash(x, f12) < fade) continue;
      put(x, y, 17); put(x + (s0.r === 1 ? 0 : 1), y - 1, 21); put(x - 1, y, 18); if (s0.r !== 2) put(x, y - 1, 17); put(x + (s0.r === 0 ? 1 : -1), y, CU[1]);
    }
  }
  function fxFront(f12) {
    const st = E.state, t = E.stT, gx = wx(P.gx), gy = wy(P.gy);
    if (st === CHARGE && t > 0.2) for (let k = 0; k < 2; k++) { const o = orbit(t - 0.2, k); if (o[2] >= 0) maskAt(o[0], o[1], t > 1.0 ? EL[1] : EL[2], EL[4], t < 1.0, f12); }   // 两张半透明幻影面具从脸上分离、环绕
    if (st === CAST && t < 0.3) { const [fx0, fy0] = faceW(); for (const i of [0, 2]) maskAt(fx0 + 4 + CAST_PTS[i][0], fy0 + CAST_PTS[i][1], EL[1], EL[4], 0, f12, clamp01((t - 0.12) / 0.18)); }
    for (const a of AFT) if (a.t < 0.6) maskAt(a.x, a.y - 1 - a.t * 8, a.t < 0.2 ? EL[1] : EL[2], CU[0], 0, f12, a.t / 0.6);   // 面具残影上浮消散
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? CU[0] : CU[1]; put(gx, gy - r, c); put(gx + r, gy, c); put(gx - r, gy, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function drawShot(k, x, y, d, f12) {
    if (k === 1) {                                                     // 幻影羽箭：钢头 + 黑檀杆 + 半透明紫羽
      put(x + d, y, 30); put(x, y, 29); for (let i = 1; i <= 3; i++) put(x - i * d, y, 53); if (f12 & 1) put(x - 3 * d, y - 1, 43); put(x - 4 * d, y - 1, 24); put(x - 3 * d, y + 1, 42); return true;
    }
    if (k === 2) {                                                     // 面具吐出的幻影箭：白芯长刃 + 灰紫刀锋尾 + 紫羽
      put(x + d, y, EL[0]); put(x, y, EL[0]); put(x - d, y, EL[1]); put(x - 2 * d, y, EL[1]); put(x - 3 * d, y, EL[2]);
      put(x - 2 * d, y - 1, EL[2]); put(x - 2 * d, y + 1, EL[2]); put(x - 4 * d, y - 1, CU[1]); put(x - 4 * d, y + 1, CU[2]); return true;
    }
    return false;
  }

  return {
    name: '幻影射手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gem, M.glow], HIT_POINT: [1, -15], EVENTS, deathKit,
    SFX: { body: 'flesh', how: 'shatter', pal: 'arcane', style: 'blade', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
