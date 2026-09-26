// 沙漠弓手（部队 · 恶魔 · 射手 · 普通）：瘦小猫腰的恶魔女弓手——沙色头巾缠头 + 脑后长头巾尾、头巾两侧顶出一对前弯短角、
// 骨白旧哭脸面具（右眼一道裂缝）、横握在身前的反曲短角弓、腰侧斜挂短箭筒（鸣镝箭尾向后翘出）。
// 攻击 = 蹲低横握平射一支鸣镝；技能 = 特性「幽灵尖叫」：面具裂眼渗出魂雾、哨孔声波环收紧 → 尖啸鸣镝 → 命中炸成 3 道幽魂刀锋（中间一道 + 左右各一道）。
// 升级成「幻影射手」（FantasyShooter.js）→「烈焰射手」（BlazingShooter.js）：同一个人，保留头巾尾、恶魔角、面具、腰侧箭筒，逐级加高、换新面具。
PCD.define('DesertArcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：幽啸 · 灰蓝紫（自建 wail，升级线共用）；沙尘 / 化沙用 earth 色阶 ─────
  const R_EL = fxRamp('wail', ['#ffffff', '#e2e4ff', '#9c9ed8', '#5c5c92', '#28283e']), EL = FXR[R_EL], SAND = FXI.earth;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'sand', band: 2 }, wrap: 'sand', belt: 'leather', skin: ['#1a1624', '#3a3048', '#5e5070', '#8a7aa0'], boot: 'boot',
    mask: 'bone', ink: { r: 'ink', flat: 1 }, horn: 'bone',
    bow: 'wood', bwrap: 'sand', string: { r: [20, 7, 7, 7], flat: 1 },  // 弦：1 行细线，骨色暗一级；勾线用弓的暗色（14），不再是墨色——看起来是一根细线而不是 3 行宽的深色横杠
    shaft: 'wood', whistle: 'bone', head: 'steel', fletch: { r: 'sand', flat: 1 }, quiver: 'leather',   // 箭羽 flat：压在拉弦手旁边也不被分界线压暗
    glow: { r: [E.color('#5c5c92'), E.color('#9c9ed8'), E.color('#e2e4ff'), 21], flat: 1 },   // 蓄力时发亮的鸣镝 / 面具裂眼（发光体）
  });
  const BODY = { body: 'slim', leg: 8, torso: 7, head: 6, headW: 5, waist: 1, stride: 3, lift: 2, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 46, 40, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bow', 'bwrap', 'string', 'shaft', 'whistle', 'head', 'fletch', 'mask', 'ink', 'glow', 'skin']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 横握弓把，后手 = 搭箭 / 拉弦（pull 0–3）；待机就半蹲猫腰 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, pull: 0, arw: 0, tw: 0, tilt: 0, mask: 1, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, pull: pull || 0 });
  // 横弓几何：前手握把 (hx, hy)，弦在握把上方 4 行；后手（拉弦手）在握把后 3 格，后弓梢（hx − 7）在后手后 3 格、离开身体前沿；
  // 整张弓比前臂高：握把抬到肩上 3 行左右，前臂从肩往前上方斜伸到握把，后半段弓臂从握把往后上方翘——两条线分开，整条「︶」弧都露在前臂上面
  const K_IDLE = K(13, -15, 10, -19, 1, 0, 2);                       // 半蹲、重心压低，短角弓横在身前，后手搭在弦上（拉到面颊前）
  const K_DRAW = K(13, -15, 10, -20, 1, 0, 3, 3);                    // 蹲得更低，横弓拉满（弦被拉成浅「∧」）
  const K_LOOSE = K(13, -15, 10, -22, 0, 0, 3, 0);                   // 松弦：后手往上弹开
  const K_HOLD = K(13, -15, 10, -20, 1, 0, 3, 0);
  const K_AIM = K(14, -16, 11, -21, 0, 0, 3, 3);                     // 技能蓄力：压低不动，拉满不放
  const K_SHOT = K(14, -16, 11, -23, -1, 0, 3, 0);
  const K_HURT = K(11, -13, 8, -17, -1, -1, 1);
  const K_STAG = K(10, -16, 7, -20, -1, -1, 2);                      // 死亡：被打得后仰踉跄（1 档）
  const K_STAG2 = K(9, -17, 6, -21, -2, -1, 1);                      // 死亡：再往后仰（2 档），头后甩、弓身前端往上翘
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -2, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['pull', 0, 3]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['arw', 0, 1], ['tw', 0, 2], ['tilt', 0, 2], ['mask', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_LOOSE = 2 / 12, T_LAND = INCOMING + 0.66, T_SAND = INCOMING + 1.2;
  // 待机个性（1.5–2.25 s，9 帧）：指尖拨弦试音（弦抖两下）→ 侧头听风，头巾尾随风一抖一抖
  const PLUCK = [[1, 0, 0, 0], [1, 1, 1, 0], [1, 2, 0, 0], [1, 1, 0, 0], [0, 0, 0, -1], [0, 0, 0, -1], [0, 0, 0, -1], [0, 0, 0, -1], [0, 0, 0, 0]];
  const BH = 6;                                                       // 横弓：握把两侧各 6 格的浅「︶」弧（两端比握把高 2 格），弓梢再各上翘 2 格，左右对称

  const R0 = parts.rig({}, BODY), RL = parts.rig({ lying: 1 }, BODY);
  const MASK0 = parts.toSprite(RL, RL.hx, RL.ey);                     // 倒地时面具弹开的起点（精灵本地坐标）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.arw = 0; P.tw = 0; P.tilt = 0; P.mask = 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.5 && lp < 2.25) {
        const c = PLUCK[Math.min(8, Math.floor((lp - 1.5) * 12 + 1e-6))];
        if (c[0]) { P.bhx = P.hx - 2; P.bhy = P.hy - 5; }   // 指尖移到弦中段上方拨弦
        P.tw = c[1]; P.glint = c[2]; if (c[3]) { P.head = -1; P.beard = (f12 & 1) ? -2 : 1; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 猫腰轻步：上身压低、步幅小，头巾尾反向甩
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hx += P.step * 0.5; P.bhx += P.step * 0.5;          // 两手一起前后晃，后弓梢始终在拉弦手后 3 格
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      P.arw = 1;
      if (tq < 0.12) { setK(K_IDLE, K_DRAW, ease.out(tq / 0.12)); P.pull = 3; P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_LOOSE, K_LOOSE, 0); P.arw = 0; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.bend = 3; }
      else if (tq < 0.45) { setK(K_LOOSE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.arw = 0; P.beard = -1; P.bend = 2; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.arw = 0; }
    } else if (st === CHARGE) {                                        // 面具裂眼渗出魂雾，鸣镝哨孔上的声波环一圈圈收紧
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_AIM, q); P.arw = 1; P.pull = tq < 0.12 ? 1 : tq < 0.3 ? 2 : 3;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = 1 + RD(q * 2);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                          // 松弦定格 2 帧 → 保持平射姿
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
    } else if (st === DEATH) {                                         // 后仰倒地：中箭 → 后仰踉跄 → 仰面倒下，旧面具弹开滚出 → 身体自上而下化沙流下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.33) { setK(K_STAG, K_STAG, 0); P.bx = -3; P.eyes = 1; P.beard = 2; P.bend = 3; P.tilt = 1; }      // 后仰 1 档
      else if (d < 0.5) { setK(K_STAG2, K_STAG2, 0); P.bx = -3; P.eyes = 1; P.beard = 3; P.bend = 3; P.tilt = 2; }     // 后仰 2 档：头往后、弓身前端上翘
      else {
        P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.bend = 0; P.lean = 0; P.head = 0; P.crouch = 0; P.pull = 0; P.beard = 1; P.gem = 4;
        P.hx = R0.sFx + 2; P.hy = R0.yWaist - 1; P.bhx = R0.sBx; P.bhy = R0.yWaist + 1;
        const hq = clamp01((d - 0.62) / 0.3); P.mask = d < 0.62 ? 1 : 0; P.hatX = -RD(4 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4);
        if (d >= T_SAND - INCOMING) P.dq = clamp01((d - (T_SAND - INCOMING)) / 1.0);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.pull = RD(P.pull);
    if (P.lying) { P.gx = MASK0[0] + P.bx; P.gy = MASK0[1]; }
    else { P.gx = P.hx + BH + 3 + P.bx; P.gy = P.pull ? P.bhy : P.hy - 5; }       // 发光体 = 鸣镝哨孔
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：scarfTailLong —— 从头巾后脑垂出的一条长头巾尾（根部 2 格粗、尾梢会摆），len 可逐级加长；P.beard < 0 被风拉直
  function wrapTail(R, len) {
    E.part(); const b = P.beard || 0, x0 = R.hx0 - 1, y0 = R.htop, L = len + (b < 0 ? -b : 0);
    for (let k = 0; k <= L; k++) { const q = k / L, x = x0 - k, y = y0 + RD(k * 0.3 + q * q * (b < 0 ? 1 + b * 0.4 : 2.2 - b * 1.1)) + (k === L && (P.sway || 0) > 0 ? 1 : 0); parts.px(E, R, x, y, M.wrap, k === L ? 4 : k & 1 ? 2 : 0); if (k < 3) parts.px(E, R, x, y + 1, M.wrap, 0); }
  }
  // 候选部件：hipQuiver —— 腰侧斜挂的短箭筒（开口朝后上），两根箭尾向后翘出 3 格
  function hipQuiver(R) {
    const e = parts.edges(R, R.yWaist + 1), x0 = e[0] + 3, y0 = R.yHip;
    E.part();
    parts.bar(13, x0, y0, 0, 5, 3, (k, j, X, Y) => parts.px(E, R, X, Y, M.quiver, k === 5 ? 4 : j === 0 ? 4 : j === 2 ? 2 : 0));
    const c = parts.cell(13, x0, y0, 6); E.part();
    for (let i = 0; i < 2; i++) { const ax = c[0] - i, ay = c[1] + i * 2; parts.px(E, R, ax, ay, M.shaft, 3); parts.px(E, R, ax - 1, ay, M.fletch, 4); parts.px(E, R, ax - 2, ay, M.fletch, 2); }   // 两根箭尾，羽毛收成一条（不分叉），和头巾尾错开
  }
  // 候选部件：demonHorns —— 头巾顶两侧伸出的一对小恶魔角（骨白亮段，远侧暗一级）：每只 2 格、尖往前弯，角尖和头巾顶之间空出 1 行
  function horns(R) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, Y = R.htop - 1;             // Y = 头巾顶行
    parts.px(E, R, x0 - 1, Y, M.horn, 2); parts.px(E, R, x0 - 1, Y - 1, M.horn, 3); parts.px(E, R, x0, Y - 2, M.horn, 3);   // 后角
    parts.px(E, R, x1, Y, M.horn, 3); parts.px(E, R, x1, Y - 1, M.horn, 4); parts.px(E, R, x1 + 1, Y - 2, M.horn, 4);       // 前角
  }
  // 候选部件：desertWrap + oldMask —— 缠头的厚头巾（头顶高出 1 行、压住额头、包住后脑与颈，斜向缠纹）和骨白旧哭脸面具：
  // 两者都画进脸的同一部件（面具和头巾之间是自动明暗的边，不压分界线，小脸才留得住）——下垂的眼洞 + 泪痕、右眼一道裂缝、下弯的嘴
  function wrapAndMask(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey, bot = R.hy, ex = x1 - 1, lit = P.gem >= 1 && P.gem <= 3;
    parts.run(E, R, top - 1, x0, x1 - 1, M.wrap, 0); parts.run(E, R, top, x0 - 1, x1 + 1, M.wrap, 0);
    for (let y = top + 1; y <= bot + 1; y++) parts.run(E, R, y, x0 - 1, x0 + (y > bot ? 3 : 0), M.wrap, 0);
    parts.px(E, R, x0 + 1, top - 1, M.wrap, 4); parts.px(E, R, x0 + 3, top - 1, M.wrap, 2); parts.px(E, R, x0, top, M.wrap, 2); parts.px(E, R, x0 + 2, top, M.wrap, 4); parts.px(E, R, x1, top, M.wrap, 2);
    parts.px(E, R, x0 - 1, top + 2, M.wrap, 2); parts.px(E, R, x0, top + 4, M.wrap, 2);
    if (!P.mask) return;
    for (let y = ey - 1; y <= bot; y++) parts.run(E, R, y, x0 + 1, x1 + (y === ey + 1 ? 1 : 0), M.mask, 0);
    parts.px(E, R, ex, ey, lit ? M.glow : M.ink, lit ? P.gem + 1 : 1);                                             // 眼洞（蓄力时透出魂光）
    parts.px(E, R, ex, ey + 1, M.mask, 1); parts.px(E, R, ex - 1, ey + 2, M.mask, 2);                              // 泪痕
    parts.px(E, R, ex - 1, ey - 1, M.mask, 1); parts.px(E, R, x1, ey + 1, M.mask, 2);                              // 裂缝斜穿右眼
    parts.px(E, R, x1, bot, M.mask, 1); parts.px(E, R, x1 - 1, bot, M.mask, 2);                                    // 下弯的嘴
    parts.px(E, R, x1 + 1, ey + 1, M.mask, 4); parts.px(E, R, x0 + 1, ey - 1, M.mask, 4);
  }
  // 候选部件：flatBow —— 横握的反曲短角弓：弓身是握把两侧各 BH 格的浅「︶」弧（握把最低、两端高 2 格），两端弓梢再各上翘 2 格、左右对称；
  // 弦是 1 行细线，从后弓梢直连前弓梢，和握把之间空出 3 格（月牙形）；拉弦时弦被后手拉成浅「∧」；鸣镝搭在弦上（箭羽见 nockFletch，画在拉弦手之后）；
  // tilt 1–2 = 前端往上翘（死亡后仰时）
  function flatBow(T, gx, gy, pull, nx, ny, tw, arw) {
    E.part(); const tl = P.tilt || 0, Y = (dx, y) => y - RD(dx * tl / (BH + 1));
    for (let dx = -BH; dx <= BH; dx++) {
      const a = Math.abs(dx), y = gy - RD(2 * (a / BH) * (a / BH)), grip = a <= 1;
      const wrapB = a === 3;                                                                     // 弓臂上各一道沙布缠带
      parts.px(E, T, gx + dx, Y(dx, y), grip || wrapB ? M.bwrap : M.bow, grip ? 3 : 4);           // 弓臂上沿受光（wood 亮段），比弦更显眼
      if (a <= 5) parts.px(E, T, gx + dx, Y(dx, y + 1), grip || wrapB ? M.bwrap : M.bow, 2);      // 弓臂 2 格粗（下沿暗一级），只有弓梢一段 1 格
    }
    for (const d of [-1, 1]) { const x = d * (BH + 1); parts.px(E, T, gx + x, Y(x, gy - 3), M.bow, 3); parts.px(E, T, gx + x, Y(x, gy - 4), M.bow, 4); }   // 两端弓梢上翘 2 格
    const sy = gy - 4, xb = -BH, xf = BH;
    if (pull) { parts.line(E, T, gx + xb, Y(xb, sy), nx, ny, M.string, 3); parts.line(E, T, nx, ny, gx + xf, Y(xf, sy), M.string, 3); }
    else for (let dx = xb; dx <= xf; dx++) parts.px(E, T, gx + dx, Y(dx, sy) + (tw && ((dx + tw) & 1) && dx > xb && dx < xf ? (tw === 1 ? -1 : 1) : 0), M.string, 3);
    if (arw) {
      E.part(); const y = pull ? ny : sy - 1, x0 = pull ? nx : gx - 4, hx = gx + BH + 3, lit = P.gem >= 1 && P.gem <= 3, wm = lit ? M.glow : M.whistle;
      parts.run(E, T, y, x0 + 1, hx - 1, M.shaft, 3);
      parts.px(E, T, hx, y - 1, wm, lit ? P.gem + 1 : 4); parts.px(E, T, hx + 1, y - 1, wm, lit ? P.gem : 3); parts.px(E, T, hx, y, wm, lit ? 4 : 3); parts.px(E, T, hx + 1, y, lit ? wm : M.ink, 1);
      parts.px(E, T, hx, y + 1, wm, lit ? P.gem : 2); parts.px(E, T, hx + 1, y + 1, wm, lit ? P.gem : 2); parts.px(E, T, hx + 2, y, M.head, 4);
    }
  }
  // 搭在弦上的箭尾：拉弦手后面紧贴箭杆那一行往后 2 格 sand 亮段箭羽（画在后手之后，不被手压暗、也不被手盖住）
  function nockFletch(T, pull, nx, ny, gx, gy) {
    E.part(); const y = pull ? ny : gy - 5, x = pull ? nx - 2 : gx - 5;
    parts.px(E, T, x, y, M.fletch, 4); parts.px(E, T, x - 1, y, M.fletch, 3);
  }
  // 掉在地上的旧面具（倒地后弹开滚出）
  function dropMask(x, y) {
    const F = parts.FREE; E.part();
    parts.run(E, F, y - 3, x - 1, x + 1, M.mask, 0); parts.run(E, F, y - 2, x - 2, x + 2, M.mask, 0); parts.run(E, F, y - 1, x - 2, x + 2, M.mask, 0); parts.run(E, F, y, x - 1, x + 1, M.mask, 0);
    parts.px(E, F, x - 1, y - 2, M.ink, 1); parts.px(E, F, x + 1, y - 2, M.ink, 1); parts.px(E, F, x, y - 3, M.mask, 1); parts.px(E, F, x + 1, y - 1, M.mask, 1); parts.px(E, F, x, y, M.mask, 2);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    wrapTail(R, 5);
    hipQuiver(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.skinD, cuff: M.wrapD, cuffStyle: 'band', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.skin, matD: M.skinD, boot: M.boot, bootD: M.bootD, bootH: 3 });
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, hem: R.yHip + 3, flare: 1, belt: M.belt, buckle: M.mask, strap: M.belt });
    horns(R);
    parts.head(E, R, P, { mat: M.skin, face: 'long', age: 'young', eye: M.ink, eyeStyle: 'narrow', nose: 'small', mouth: 'line', ear: 'none' });
    wrapAndMask(R);
    if (R.lie) {
      flatBow(parts.FREE, 14, -1, 0, 0, 0, 0, 0);
      if (!P.mask) dropMask(MASK0[0] + P.hatX, MASK0[1] + 2 - P.hatY);
      parts.arm(E, R, P, { sleeve: 'tight', mat: M.skin, cuff: M.wrap, cuffStyle: 'band', hand: M.skin });
    } else {
      parts.arm(E, R, P, { sleeve: 'tight', mat: M.skin, cuff: M.wrap, cuffStyle: 'band', grip: 'none' });   // 前臂先画，弓压在前臂上（后半段弓臂从握把到后弓梢完整露出）
      flatBow(R, P.hx, P.hy, P.pull, P.bhx, P.bhy, P.tw, P.arw);
      parts.hand(E, R, P, { side: 'F', hand: M.skin });                                                    // 前手握把压在弓上
      parts.hand(E, R, P, { side: 'B', hand: M.skin });
      if (P.arw) nockFletch(R, P.pull, P.bhx, P.bhy, P.hx, P.hy);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, mistAcc = 0, soulAcc = 0, sandAcc = 0, lastStep = 0, stepN = 0;
  const BL = [{ t: 9, x0: 0, y0: 0, x1: 0, y1: 0, hit: 0 }, { t: 9, x0: 0, y0: 0, x1: 0, y1: 0, hit: 0 }];   // 分裂出去的两道幽魂刀锋
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const eyeW = () => [wx(R0.hx1 - 1 + P.lean + P.head + P.bx), wy(R0.ey + P.bob + Math.min(3, P.crouch))];
  function muzzle(x, y) { mzT = 0; mzX = x; mzY = y; }
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);                               // 尖啸鸣镝平射：箭后拖一串扩散的声波弧
    releaseOrbit(40, 90, 0.25, 0.5);
    shoot(2, gx + 1, gy, 220, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.3], back: [10, 30], off: 3 } });
    muzzle(gx, gy); burst(gx, gy, 14, 40, 90, 0.15, 0.4, R_EL, 4);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {
      const gx = wx(K_DRAW.hx + BH + 4), gy = wy(K_DRAW.bhy + 3); muzzle(gx, gy);   // 拉满时鸣镝所在的行（crouch 3）
      shoot(1, gx + 1, gy, 230, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.06, 0.14], back: [8, 20] }, glow: -1 });
      sfx('swing', { kind: 'bow', w: 0.2 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 18 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [], [], [], [T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) {                                                     // 普通鸣镝：命中火花 + 两颗灰紫碎音分向两侧
      burst(x, y, 8, 30, 80, 0.12, 0.3, FXI.impact, 8); spawn(K_BURST, x, y, -40, -10, 0.25, R_EL); spawn(K_BURST, x, y, 40, -10, 0.25, R_EL);
      hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.2 }); return;
    }
    if (k !== 2) return;                                               // 幽灵尖叫：炸成 3 道刀锋弧——中间一道斩在假人身上，左右两道飞向旁边约 12 格处落地（斩击弧中心在落点内侧 3 格）
    fx.slash(x - 4, y, 8, 0.35, 2.8, R_EL, 0.3, 2, 2); fx.cross(x, y, 5, R_EL, 0.2);
    burst(x, y, 20, 50, 120, 0.2, 0.5, R_EL, 8); ring(x, y, 0, R_EL);
    hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.35 });
    for (let i = 0; i < 2; i++) { const b = BL[i], d = i ? 1 : -1; b.t = 0; b.hit = 0; b.x0 = x; b.y0 = y; b.x1 = x + d * 15; b.y1 = HY - 5; }
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));      // 声波碎屑向哨孔收拢
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 2.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
      if (stT > 0.2) { mistAcc += dt * 14; const e = eyeW(); while (mistAcc >= 1) { mistAcc -= 1; spawnX(K_RISE, e[0] + (Math.random() - 0.5), e[1], -4 - Math.random() * 6, -5 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.4 }); } }   // 裂眼渗出的灰紫魂雾
    }
    if (state === MOVE && P.step !== lastStep) {                       // 轻步：隔一步一颗沙尘
      if (P.step !== 0) { sfx('step', { w: 0.15 }); if ((stepN++ & 1) === 0) spawn(K_DUST, wx(P.step > 0 ? 3 : -2), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 3, 0.25, SAND); }
      lastStep = P.step;
    }
    for (const b of BL) {
      if (b.t > 1) continue; b.t += dt;
      if (!b.hit && b.t >= 0.16) { b.hit = 1; fx.slash(b.x1 - (b.x1 > b.x0 ? 3 : -3), b.y1, 5, b.x1 > b.x0 ? 0.3 : -2.8, b.x1 > b.x0 ? 2.8 : -0.3, R_EL, 0.25, 2, 2); burst(b.x1, b.y1, 10, 30, 80, 0.15, 0.4, R_EL, 10); spawn(K_DUST, b.x1, HY, 0, -6, 0.3, SAND); sfx('impact', { pal: 'shadow', w: 0.2 }); }
    }
    if (state === DEATH && stT > T_SAND && stT < T_SAND + 1.1) {        // 化沙：沙粒从身体上一路往下淌、落地堆起
      sandAcc += dt * 46;
      while (sandAcc >= 1) { sandAcc -= 1; const x = HX - 20 + Math.random() * 24, y = HY - 7 + Math.random() * 5; spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 6, 4 + Math.random() * 8, 0.7 + Math.random() * 0.5, SAND, { g: 90, floor: HY, age0: 0.12 }); }
      soulAcc += dt * 6; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 16, HY - 4, (Math.random() - 0.5) * 4, -10 - Math.random() * 8, 0.8, R_EL); }
    }
    mzT += dt;
  }
  function fxReset() { mzT = 9; chargeAcc = 0; mistAcc = 0; soulAcc = 0; sandAcc = 0; lastStep = 0; stepN = 0; for (const b of BL) { b.t = 9; b.hit = 1; } }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function crescent(x, y, d, h, c0, c1) { for (let j = -h; j <= h; j++) { const o = RD((1 - (j * j) / (h * h)) * 1.6); put(x + o * d, y + j, Math.abs(j) < h ? c0 : c1); } }
  function fxFront(f12) {
    const st = E.state, t = E.stT, gx = wx(P.gx), gy = wy(P.gy);
    if (st === CHARGE && t > 0.15 && P.dq < 1) {                        // 哨孔上 3 圈声波小环一圈圈收紧（断续）
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 1.6 + i / 3) % 1), r = 6 - ph * 4.5, n = Math.ceil(r * 5), c = r > 4.5 ? EL[3] : r > 3 ? EL[2] : EL[1];
        for (let k = 0; k < n; k++) { if (((k + f12 + i) % 3) === 0) continue; const a = k / n * 6.2832; put(RD(gx + 1 + Math.cos(a) * r), RD(gy + Math.sin(a) * r * 0.8), c); }
      }
    }
    for (const b of BL) {                                              // 飞出的幽魂刀锋：一弯月牙，飞到落点后变成斩击弧
      if (b.t > 0.16) continue; const q = b.t / 0.16, x = RD(b.x0 + (b.x1 - b.x0) * q), y = RD(b.y0 + (b.y1 - b.y0) * q - Math.sin(q * Math.PI) * 6), d = b.x1 > b.x0 ? 1 : -1;
      crescent(x, y, d, 3, EL[0], EL[2]); crescent(x - d, y, d, 2, EL[1], EL[3]);
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx + 1, gy - r, c); put(gx + 1, gy + r, c); put(gx + 1 + r, gy, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }
  function whistle(x, y, d, hot) {                                    // 鸣镝：钢尖 + 带哨孔的骨球 + 木杆 + 沙色箭羽
    put(x + 2 * d, y, hot ? EL[0] : 30); put(x + d, y - 1, hot ? EL[1] : 17); put(x, y - 1, hot ? EL[1] : 6); put(x + d, y, 0); put(x, y, hot ? EL[2] : 6); put(x + d, y + 1, hot ? EL[2] : 7); put(x, y + 1, hot ? EL[2] : 7);
    for (let i = 1; i <= 4; i++) put(x - i * d, y, 19); put(x - 4 * d, y - 1, 62); put(x - 5 * d, y - 1, 61); put(x - 4 * d, y + 1, 61);
  }
  function drawShot(k, x, y, d, f12) {
    if (k === 1) { whistle(x, y, d, 0); return true; }
    if (k === 2) {                                                     // 尖啸鸣镝：箭后拖一串一圈比一圈大的声波弧（锥形）
      whistle(x, y, d, 1);
      for (let i = 0; i < 3; i++) { const h = 2 + i, dx = x - (7 + i * 4 + ((f12 & 1) ? 1 : 0)) * d; crescent(dx, y, d, h, EL[1 + i], EL[Math.min(4, 2 + i)]); }
      return true;
    }
    return false;
  }

  return {
    name: '沙漠弓手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [1, -11], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'shadow', style: 'blade', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
