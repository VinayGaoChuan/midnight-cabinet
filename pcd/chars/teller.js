// 占卜师（小游戏 G007 占卜摊的人物，不上战场）：坐在圆桌后面、正面朝玩家的佝偻老妇人，深紫头巾 + 右侧头巾结和飘带、象牙白蒙眼布上金线绣的眼、
// 一对大金耳环、挂一排金币的酒红披肩、两条伸向两边的长胳膊和细长手指。只画桌面以上的半身。
// 锚点（ox, oy）= 桌子远沿正中 = 舞台美术格 (150, 126)；为了直接用舞台坐标落笔，drawHero 里 begin(hero, -150, -126)，下面的坐标都是舞台格。
// 游戏只取精灵（M.PCDG.bodyFrame），不带引擎粒子：星线、金箔弧、星尘、烟都画进精灵（烘焙之后直接写色板下标，不勾线、不压分界线）；
// 引擎粒子只在查看页 / 动作引擎里锦上添花。六个状态对应小游戏里的动作：待机 = 双手在牌上画圈；移动 = 探身看牌；攻击 = 洗牌发牌；
// 技能 = 举手、绣眼发光、指间牵出星线 → 挥手射出星线 → 收手；受击 = 被好牌吓得往后一仰；死亡 = 合掌鞠躬、钱币掉到桌上、从下往上化成烟。
PCD.define('teller', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, brush, bake, ease, clamp01, q12, f12of, gait, FXI, FXR, fxRamp, HY, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, scrX, sfx, bayer } = E;

  // ───── 色阶、材质 ─────
  const R_EL = fxRamp('star', [21, 43, 24, 25, 3]), EL = FXR[R_EL];            // 星辉紫：白 → 淡紫 → 紫 → 深紫 → 夜蓝
  const R_SMOKE = fxRamp('smoke', [18, 54, 10, 53, 52]);                        // 离开时的烟：淡灰紫 → 紫灰 → 深
  const M_SCARF = defMat([52, 53, 42, 54], 2), M_TAIL = defMat([52, 53, 53, 42], 1), M_SLEEVE = defMat([52, 53, 53, 42], 1), M_DRESS = defMat([52, 53, 53, 42], 1);
  const M_SHAWL = defMat('crimson', 2), M_GOLD = defMat('gold', 1), M_COIN = defMat('gold', 1, 1), M_DROP = defMat('gold', 1, 1);
  const M_BLIND = defMat('bone', 1), M_SKIN = defMat([20, 19, 16, 33], 1), M_IRIS = defMat([25, 25, 24, 43], 1, 1), M_EGLOW = defMat([24, 43, 21, 21], 1, 1);
  const M_CARD = defMat([0, 39, 39, 40], 1), M_EDGE = defMat([7, 6, 17, 21], 1, 1);
  const M_FX = defMat([255, 24, 43, 21], 1, 1);                                 // 只用来给特效像素打「发光」标记（HD-2D 发光遮罩）
  const DUR = DEFAULT_DUR.slice(); DUR[IDLE] = 2.5; DUR[MOVE] = 4 / 3;          // 待机 30 帧一循环（两手画一圈）；探身 16 帧（两个 4 帧循环）
  const HX = 60, X0 = 150, Y0 = 126;
  const hero = new Sprite(132, 112, 66, 106);                                   // 舞台 x 84…215、y 20…131
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 24], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(64) };
  for (const m of [M_EGLOW, M_IRIS, M_GOLD, M_COIN, M_DROP, M_SKIN, M_BLIND, M_CARD, M_EDGE, M_SLEEVE]) RIM.skip[m] = 1;
  const TAU = Math.PI * 2;

  // ───── 姿势 ─────
  // 手势：垂指（画圈）· 上举张开（蓄力、受击）· 托牌（洗牌）· 平伸（发牌）· 下张（施放）· 合掌（离开）
  const H_HANG = 0, H_UP = 1, H_DECK = 2, H_FLICK = 3, H_SPLAY = 4, H_PRAY = 5;
  const P = { st: 0, hxo: 0, hyo: 0, sho: 0, lx: 0, ly: 0, rx: 0, ry: 0, lex: 0, ley: 0, rex: 0, rey: 0, ls: 0, rs: 0,
    eye: 0, iris: 0, mouth: 0, brow: 0, cph: 0, camp: 0, cdir: 0, tail: 0, ear: 0, thr: 0, tw: 0, cth: 0, arc: 0, deck: 0, dust: 0,
    drop: -1, smoke: -1, gone: 0, wink: 0, glint: 0, rim: 0, flash: 0, dq: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  // 头（hxo, hyo）、肩（sho）偏移；两只手腕 (lx, ly) (rx, ry) 和肘 (lex, ley) (rex, rey)，都是舞台格；l = 画面左边那只（她的右手）
  const K_IDLE = { hxo: 0, hyo: 0, sho: 0, lx: 112, ly: 65, rx: 188, ry: 65, lex: 127, ley: 70, rex: 173, rey: 70 };
  const K_PEEK_L = { hxo: -2, hyo: 2, sho: 1, lx: 106, ly: 67, rx: 187, ry: 64, lex: 126, ley: 70, rex: 173, rey: 69 };
  const K_PEEK_C = { hxo: 0, hyo: 3, sho: 1, lx: 113, ly: 67, rx: 187, ry: 67, lex: 127, ley: 70, rex: 173, rey: 70 };
  const K_PEEK_R = { hxo: 2, hyo: 2, sho: 1, lx: 113, ly: 64, rx: 194, ry: 67, lex: 127, ley: 69, rex: 174, rey: 70 };
  const K_GATHER = { hxo: 0, hyo: 1, sho: 0, lx: 135, ly: 69, rx: 165, ry: 69, lex: 127, ley: 70, rex: 173, rey: 70 };
  const K_SHUF = { hxo: 0, hyo: 1, sho: 0, lx: 143, ly: 69, rx: 157, ry: 69, lex: 128, ley: 70, rex: 172, rey: 70 };
  const K_FLICK = { hxo: -1, hyo: 0, sho: 0, lx: 108, ly: 64, rx: 157, ry: 69, lex: 126, ley: 69, rex: 172, rey: 70 };
  const K_FOLLOW = { hxo: -1, hyo: 0, sho: 0, lx: 106, ly: 66, rx: 158, ry: 69, lex: 126, ley: 69, rex: 172, rey: 70 };
  const K_HOLDA = { hxo: 0, hyo: 0, sho: 0, lx: 108, ly: 66, rx: 160, ry: 69, lex: 126, ley: 70, rex: 172, rey: 70 };
  const K_CHARGE = { hxo: 0, hyo: -1, sho: -1, lx: 126, ly: 44, rx: 174, ry: 44, lex: 128, ley: 59, rex: 172, rey: 59 };
  const K_CAST = { hxo: 0, hyo: 1, sho: 0, lx: 106, ly: 64, rx: 194, ry: 64, lex: 125, ley: 69, rex: 175, rey: 69 };
  const K_RECOIL = { hxo: 0, hyo: -3, sho: -2, lx: 122, ly: 54, rx: 178, ry: 54, lex: 128, ley: 64, rex: 172, rey: 64 };
  const K_PRAY = { hxo: 0, hyo: 1, sho: 0, lx: 148, ly: 66, rx: 152, ry: 66, lex: 129, ley: 70, rex: 171, rey: 70 };
  const K_BOW = { hxo: 0, hyo: 3, sho: 1, lx: 148, ly: 67, rx: 152, ry: 67, lex: 129, ley: 71, rex: 171, rey: 71 };
  const FIELDS = ['hxo', 'hyo', 'sho', 'lx', 'ly', 'rx', 'ry', 'lex', 'ley', 'rex', 'rey'];
  const mixPose = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_FLICK = 2 / 12, T_SLAP = 4 / 12, T_LAND = INCOMING + 0.66;

  function idle(fr) {   // fr：待机循环里的帧（0–29）
    mixPose(K_IDLE, K_IDLE, 0);
    const th = fr / 30 * TAU, b = Math.floor(fr / 5) & 1;
    P.lx = K_IDLE.lx - 3 * Math.sin(th); P.ly = K_IDLE.ly - 2 + 2 * Math.cos(th);            // 两手在牌上画圈（镜像），第 0 帧回到原位
    P.rx = K_IDLE.rx + 3 * Math.sin(th); P.ry = P.ly;
    P.hyo += b; P.sho += b;                                                                  // 呼吸：头和肩 5 帧一起伏
    P.cph = fr; P.camp = 0.9; P.tail = Math.round(Math.sin(TAU * fr / 15 + 2) * 1.4); P.ear = Math.round(Math.sin(TAU * fr / 10 + 2.2) * 0.8);
    if (fr === 22 || fr === 23) P.eye = 1;
    P.glint = fr === 8 ? 1 : fr === 9 ? 2 : fr === 16 ? 3 : fr === 17 ? 4 : 0;               // 戒指、耳环小铃铛各闪一下                                                   // 绣眼一个循环眨一次
  }
  function poseAt(st, t) {
    const tq = q12(t), f = f12of(t);
    P.st = st; P.ls = P.rs = H_HANG; P.eye = 0; P.iris = 0; P.mouth = 0; P.brow = 0; P.cph = 0; P.camp = 0; P.cdir = 0; P.tail = 0; P.ear = 0;
    P.glint = 0; P.thr = 0; P.tw = 0; P.cth = 0; P.arc = 0; P.deck = 0; P.dust = 0; P.drop = -1; P.smoke = -1; P.gone = 0; P.wink = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.mx = 0; P.flip = 0;
    if (st === IDLE) idle(f % 30);
    else if (st === MOVE) {   // 探身看牌：左探 · 正 · 右探 · 正（6 fps），钱币 / 飘带 / 耳环跟着反向甩
      const g = gait(tq), K = [K_PEEK_L, K_PEEK_C, K_PEEK_R, K_PEEK_C][g];
      mixPose(K, K, 0); P.iris = [-1, 0, 1, 0][g]; P.cdir = [1, -1, -1, 1][g]; P.tail = [1, -1, -1, 1][g]; P.ear = P.cdir; P.camp = 0.4; P.cph = g * 4;
    } else if (st === ATTACK) {   // 洗牌发牌：拿出两叠 → 一拱（预兆）→ 右手甩出（出手，金箔弧）→ 停住 → 收回
      if (f === 0) { mixPose(K_GATHER, K_GATHER, 0); P.ls = P.rs = H_DECK; P.deck = 1; }
      else if (f === 1) { mixPose(K_SHUF, K_SHUF, 0); P.ls = P.rs = H_DECK; P.deck = 2; P.cdir = -1; }
      else if (f === 2) { mixPose(K_FLICK, K_FLICK, 0); P.ls = H_FLICK; P.rs = H_DECK; P.deck = 3; P.arc = 1; P.cdir = 1; P.tail = 1; P.ear = 1; }
      else if (f === 3) { mixPose(K_FOLLOW, K_FOLLOW, 0); P.ls = H_FLICK; P.rs = H_DECK; P.deck = 3; P.arc = 2; P.cdir = 1; P.ear = 1; }
      else if (f <= 5) { mixPose(K_HOLDA, K_HOLDA, 0); P.rs = H_DECK; P.deck = 3; P.camp = 0.9; P.cph = f * 3; }
      else { mixPose(K_HOLDA, K_IDLE, ease.inOut(clamp01((tq - 5 / 12) / (4 / 12)))); P.camp = 0.9; P.cph = f * 3; }
      P.mouth = f >= 2 && f <= 4 ? 1 : 0;
    } else if (st === CHARGE) {   // 举手到头两侧，绣眼睁开发光，指间和头顶牵出星线；第 9 帧以后 4 帧一循环
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q);
      if (q > 0.45) P.ls = P.rs = H_UP;
      P.eye = tq < 0.2 ? 0 : tq < 0.45 ? 2 : tq < 0.7 ? 3 : (f & 1 ? 4 : 3);
      P.thr = tq >= 0.8 ? 2 : tq >= 0.5 ? 1 : 0; P.tw = f & 3;
      P.rim = tq < 0.45 ? 1 : 2; P.tail = 2; P.ear = q > 0.5 ? -1 : 0; P.brow = q > 0.5 ? 1 : 0;
      if (f >= 12) P.cdir = f & 1 ? 1 : -1;                                                  // 最后一段钱币抖
    } else if (st === CAST) {   // 一挥往下张开，十指射出星线落到三张牌上
      mixPose(K_CHARGE, K_CAST, f === 0 ? 0.6 : 1); P.ls = P.rs = f === 0 ? H_UP : H_SPLAY;
      P.eye = 5; P.rim = 3; P.cth = f + 1; P.tail = -2; P.ear = 1; P.camp = 1.4; P.cph = f * 5; P.brow = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q);
      if (q < 0.4) P.ls = P.rs = H_SPLAY;
      P.eye = q < 0.3 ? 4 : q < 0.6 ? 3 : q < 0.85 ? 2 : 0; P.rim = q < 0.5 ? 2 : q < 0.85 ? 1 : 0; P.tail = -Math.round((1 - q) * 2); P.camp = 0.9 * (1 - q); P.cph = f * 4; P.mouth = q > 0.35 ? 1 : 0;   // 收手时咧嘴一笑（坏牌就停在这里）
    } else if (st === HURT) {   // 被好牌吓一跳：往后一仰、双手摊开、张嘴、绣眼睁大、头边星尘
      const h = tq - INCOMING;
      if (h < 0) idle(f % 30);
      else if (h < 0.2) { mixPose(K_RECOIL, K_RECOIL, 0); P.flash = h < 1 / 12 ? 1 : 0; P.ls = P.rs = H_UP; P.mouth = 2; P.brow = 1; P.eye = 2; P.tail = 2; P.ear = 1; P.cdir = -1; P.dust = h < 1 / 12 ? 0 : h < 0.15 ? 1 : 2; }
      else if (h < 0.35) { mixPose(K_RECOIL, K_IDLE, 0.5); P.ls = P.rs = H_UP; P.mouth = 2; P.brow = 1; P.eye = 2; P.tail = 1; P.ear = -1; P.dust = 3; P.camp = 1; P.cph = 7; }
      else { mixPose(K_RECOIL, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.tail = -1; P.camp = 0.9; P.cph = 12; }
    } else if (st === DEATH) {   // 化烟离开：合掌 → 鞠躬、钱币落桌 → 静止、绣眼最后亮一下后熄灭 → 从下往上化烟 → 桌上的钱币逐枚化成星点
      const d = tq - INCOMING;
      if (d < 0) idle(f % 30);
      else {
        if (d < 0.2) mixPose(K_PRAY, K_PRAY, 0); else mixPose(K_PRAY, K_BOW, ease.out(clamp01((d - 0.2) / 0.25)));
        P.ls = P.rs = H_PRAY; P.flash = d < 1 / 12 ? 1 : 0;
        P.eye = d < 0.8 ? 1 : d < 0.97 ? 3 : 6; P.tail = d < 0.45 ? 1 : 0; P.ear = d < 0.45 ? 1 : 0;
        if (d >= 0.25) P.drop = d - 0.25;
        if (d >= 1.3) P.smoke = clamp01((d - 1.3) / 1.1);
        if (d >= 2.4) P.gone = 1;
        if (d >= 2.15) P.wink = d - 2.15;
      }
    } else if (st === REVIVE) {
      idle(0);
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.eye = 3;
    }
    for (const k of FIELDS) P[k] = Math.round(P[k]);
    P.gx = P.hxo; P.gy = 46 + P.hyo - Y0;                                                   // 发光体 = 绣眼（本地坐标）
    P.k1 = st * 4096 + Math.min(4095, f); P.k2 = 0;                                          // 姿势完全由状态和帧号决定
  }

  // ───── 画 ─────
  let DX = 0, DY = 0;
  const FACE_W = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 5, 4, 3, 2];                            // 脸：第 41–55 行的半宽（尖下巴）
  const faceHalf = (r) => (r < 0 ? 7 : r > 14 ? -1 : FACE_W[r]);
  const DOME = [4, 6, 8, 9, 10, 11, 11, 12, 12, 12];                                       // 头巾圆顶：第 31–40 行的半宽
  const shoulderY = (dx) => { const a = Math.abs(dx); return a <= 9 ? 52 : 52 + Math.round(Math.pow(Math.min(1, (a - 9) / 14), 1.6) * 12); };   // 驼背耸肩：颈边 52，肩头 64
  const hemY = (dx) => 72 - Math.round(5 * Math.pow(Math.min(23, Math.abs(dx)) / 23, 1.4));   // 披肩下摆：正中最低（72），两边收到 67
  const cr = (v) => (v > 1 ? 1 : v < -1 ? -1 : Math.round(v));
  const coinOff = (k) => cr(P.camp * Math.sin(TAU * P.cph / 30 + k * 0.6) + P.cdir);

  function drawTails(cx, oy) {   // 头巾结垂下的两条飘带（最后面，从头巾右侧垂到肩头外）
    part();
    for (let k = 0; k < 2; k++) {
      const len = k ? 11 : 14;
      for (let i = 0; i <= len; i++) { const q = i / len, x = cx + 14 - k * 2 + i * (0.5 + k * 0.1) + Math.round(q * q * P.tail * 1.6), y = 40 + oy + i + k; sp(x, y, M_TAIL, 0); sp(x + 1, y, M_TAIL, 0); }
      sp(cx + 14 - k * 2 + len * (0.5 + k * 0.1) + Math.round(P.tail * 1.6) + 1, 41 + oy + len + k, M_GOLD, 4);   // 飘带梢一颗金珠
    }
  }
  function drawShawl(s) {   // 披肩：驼背耸肩的披风轮廓、竖褶、衣襟 V 口 + 胸针、下摆上方一道金线、散落的金线星点
    part();
    for (let dx = -23; dx <= 23; dx++) for (let y = shoulderY(dx); y <= hemY(dx); y++) sp(X0 + dx, y + s, M_SHAWL, 0);
    for (let y = 56; y <= 62; y++) { const w = Math.round((62 - y) * 0.5); run(y + s, X0 - w, X0 + w, M_DRESS, 0); }
    rect(X0 - 1, 62 + s, 2, 2, M_GOLD, 0);
    for (const [x0, y0, x1, y1] of [[-6, 58, -11, 71], [6, 58, 11, 71], [-14, 57, -19, 68], [14, 57, 19, 68]]) {
      const n = y1 - y0; for (let i = 0; i <= n; i++) { const dx = Math.round(x0 + (x1 - x0) * i / n), y = y0 + i; if (y < hemY(dx) - 1) sp(X0 + dx, y + s, M_SHAWL, 2); }
    }
    for (let dx = -22; dx <= 22; dx += 2) sp(X0 + dx, hemY(dx) - 1 + s, M_GOLD, 3);
    for (const [dx, y] of [[-17, 62], [-9, 65], [-3, 68], [4, 66], [12, 64], [18, 63], [-12, 59], [9, 60]]) sp(X0 + dx, y + s, M_GOLD, 4);
  }
  function drawCoins(s) {   // 下摆一排 11 枚金币，按相位摆
    part();
    for (let k = -5; k <= 5; k++) { const dx = k * 4, x = X0 + dx - 1 + coinOff(k), y = hemY(dx) + 1 + s; coin(x, y, M_COIN); }
  }
  function coin(x, y, m) { sp(x, y, m, 4); sp(x + 1, y, m, 3); sp(x, y + 1, m, 3); sp(x + 1, y + 1, m, 2); }
  function drawFace(cx, oy) {   // 脸 + 蒙眼布 + 绣眼 + 眉、鹰钩鼻、嘴、法令纹（同一个部件，蒙眼布不在脸上压深色线）
    part();
    for (let r = 0; r < 15; r++) run(41 + r + oy, cx - FACE_W[r], cx + FACE_W[r], M_SKIN, 0);
    run(56 + oy, cx - 2, cx + 2, M_SKIN, 2); run(57 + oy, cx - 1, cx + 1, M_SKIN, 2);
    const y = (r) => r + oy, S = (x, r, t) => sp(x, y(r), M_SKIN, t);
    S(cx - 5, 48, 4); S(cx - 4, 48, 4); S(cx + 4, 48, 3); S(cx + 5, 48, 3);                 // 颧骨
    S(cx - 6, 50, 2); S(cx - 5, 51, 2); S(cx + 6, 50, 2); S(cx + 5, 51, 2);                 // 凹腮
    S(cx - 3, 51, 2); S(cx + 3, 51, 2);                                                    // 法令纹
    S(cx, 48, 4); S(cx, 49, 4); S(cx + 1, 48, 2); S(cx + 1, 49, 2); S(cx, 50, 3); S(cx + 1, 50, 2); S(cx - 1, 50, 1); S(cx + 2, 50, 1); S(cx, 51, 2);   // 鹰钩鼻
    if (P.mouth === 1) { run(y(52), cx - 3, cx + 3, M_SKIN, 1); S(cx - 4, 51, 1); S(cx + 4, 51, 1); sp(cx + 1, y(52), M_GOLD, 4); run(y(53), cx - 2, cx + 2, M_SKIN, 4); }   // 咧嘴笑，一颗金牙
    else if (P.mouth === 2) { run(y(52), cx - 1, cx + 1, M_SKIN, 1); run(y(53), cx - 1, cx + 1, M_SKIN, 1); S(cx, 54, 4); }                                          // 张嘴「O」
    else { run(y(52), cx - 2, cx + 2, M_SKIN, 1); run(y(53), cx - 1, cx + 1, M_SKIN, 4); S(cx - 1, 54, 4); }                                                         // 抿着
    const by = P.brow ? 42 : 43; run(y(by), cx - 5, cx - 3, M_SKIN, 1); run(y(by), cx + 3, cx + 5, M_SKIN, 1); if (P.brow) { S(cx - 6, 43, 1); S(cx + 6, 43, 1); }
    for (let r = 44; r <= 47; r++) run(y(r), cx - 7, cx + 7, M_BLIND, 0);                  // 蒙眼布
    drawEye(cx, oy);
  }
  function drawEye(cx, oy) {   // 金线绣的杏仁眼（7 × 4）：0 平常 · 1 闭 · 2 睁大 · 3/4/5 发光 · 6 熄灭
    const G = (x, r, t) => sp(x, r + oy, M_GOLD, t), e = P.eye, i = P.iris;
    if (e === 1 || e === 6) { const t = e === 6 ? 2 : 3; for (let x = cx - 3; x <= cx + 3; x++) G(x, 46, t); for (let x = cx - 2; x <= cx + 2; x += 2) G(x, 47, e === 6 ? 1 : 2); return; }
    if (e === 0) {
      for (let x = cx - 2; x <= cx + 2; x += 2) G(x, 44, 2);
      for (let x = cx - 2; x <= cx + 2; x++) G(x, 45, 3); G(cx - 3, 46, 3); G(cx + 3, 46, 3); for (let x = cx - 2; x <= cx + 2; x++) G(x, 47, 2);
      sp(cx - 2, 46 + oy, M_BLIND, 4); sp(cx + 2, 46 + oy, M_BLIND, 4);
      sp(cx - 1 + i, 46 + oy, M_IRIS, 4); sp(cx + i, 46 + oy, M_IRIS, 2); sp(cx + 1 + i, 46 + oy, M_IRIS, 3);
      return;
    }
    const lid = e >= 3 ? 4 : 3;
    for (let x = cx - 2; x <= cx + 2; x++) { G(x, 44, lid); G(x, 47, e >= 3 ? 3 : 2); }
    for (const r of [45, 46]) { G(cx - 3, r, lid); G(cx + 3, r, lid); sp(cx - 2, r + oy, e >= 4 ? M_EGLOW : M_BLIND, e >= 4 ? 2 : 4); sp(cx + 2, r + oy, e >= 4 ? M_EGLOW : M_BLIND, e >= 4 ? 2 : 4); }
    if (e === 2) { for (let x = -1; x <= 1; x++) sp(cx + x + i, 45 + oy, M_IRIS, 3); sp(cx - 1 + i, 46 + oy, M_IRIS, 4); sp(cx + i, 46 + oy, M_IRIS, 2); sp(cx + 1 + i, 46 + oy, M_IRIS, 3); }
    else if (e === 3) { for (let x = -1; x <= 1; x++) sp(cx + x, 45 + oy, M_EGLOW, 2); sp(cx - 1, 46 + oy, M_EGLOW, 2); sp(cx, 46 + oy, M_EGLOW, 3); sp(cx + 1, 46 + oy, M_EGLOW, 2); }
    else { for (let x = -1; x <= 1; x++) { sp(cx + x, 45 + oy, M_EGLOW, 3); sp(cx + x, 46 + oy, M_EGLOW, 3); } }
  }
  function drawScarf(cx, oy) {   // 头巾：圆顶、额前金带 + 珠坠、两侧垂布到肩（下沿一排小金珠穗）、右上的头巾结
    part();
    for (let r = 0; r < DOME.length; r++) run(31 + r + oy, cx - DOME[r], cx + DOME[r], M_SCARF, 0);
    for (let yy = 41; yy <= 57; yy++) {
      const fh = yy <= 55 ? faceHalf(yy - 41) : 8, out = yy < 50 ? 12 : yy < 54 ? 13 : 14;
      run(yy + oy, cx - out, cx - fh - 1, M_SCARF, 0); run(yy + oy, cx + fh + 1, cx + out, M_SCARF, 0);
    }
    const K = [[35, 11, 13], [36, 11, 15], [37, 12, 16], [38, 12, 16], [39, 12, 15], [40, 13, 14]];   // 头巾结
    for (const [r, a, b] of K) run(r + oy, cx + a, cx + b, M_SCARF, 0);
    for (let r = 36; r <= 39; r++) sp(cx + 14, r + oy, M_SCARF, 2); sp(cx + 12, 36 + oy, M_SCARF, 4);
    for (const [x, r] of [[-5, 33], [-6, 34], [-7, 35], [-7, 36], [-8, 37], [-8, 38], [4, 32], [5, 33], [6, 34], [6, 35], [7, 36]]) sp(cx + x, r + oy, M_SCARF, 2);   // 圆顶的褶
    for (let r = 43; r <= 55; r++) { const d = Math.floor((r - 43) / 6); sp(cx - 10 - d, r + oy, M_SCARF, 2); sp(cx + 10 + d, r + oy, M_SCARF, 2); }                   // 垂布的褶
    sp(cx - 2, 32 + oy, M_SCARF, 4); sp(cx - 1, 32 + oy, M_SCARF, 4); sp(cx - 3, 33 + oy, M_SCARF, 4); sp(cx - 4, 33 + oy, M_SCARF, 4);
    for (let x = cx - 11; x <= cx + 11; x++) sp(x, 40 + oy, M_GOLD, (x - cx + 12) % 3 === 0 ? 4 : 3);   // 额前金带
    for (const d of [-6, -3, 3, 6]) sp(cx + d, 41 + oy, M_GOLD, 3); sp(cx, 41 + oy, M_GOLD, 4); sp(cx, 42 + oy, M_GOLD, 3);   // 珠坠
    for (let x = cx - 14; x <= cx - 9; x += 2) sp(x, 58 + oy, M_GOLD, x === cx - 12 ? 4 : 3);
    for (let x = cx + 9; x <= cx + 14; x += 2) sp(x, 58 + oy, M_GOLD, x === cx + 11 ? 4 : 3);
  }
  function drawHoop(x, yTop, sw) {   // 大金耳环：5 × 6 的椭圆圈，底下一颗小铃铛；下半圈按 sw 摆
    part();
    run(yTop, x - 1, x + 1, M_GOLD, 0);
    for (let k = 1; k <= 4; k++) { const o = k >= 3 ? sw : 0; sp(x - 2 + o, yTop + k, M_GOLD, 0); sp(x + 2 + o, yTop + k, M_GOLD, 0); }
    run(yTop + 5, x - 1 + sw, x + 1 + sw, M_GOLD, 0);
    sp(x + sw, yTop + 6, M_GOLD, 4); sp(x + sw, yTop + 7, M_GOLD, 3);
  }
  function seg(x0, y0, x1, y1, r0, r1, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const q = i / n; brush(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, r0 + (r1 - r0) * q, m, 0); } }
  function drawArm(side, sx, sy, ex, ey, wx, wy, style) {   // 袖子：上臂 → 小臂 → 喇叭袖口 + 金边；再画手（和托着的牌）
    part();
    seg(sx, sy, ex, ey, 1.4, 1.4, M_SLEEVE);
    const L = Math.hypot(wx - ex, wy - ey) || 1, ux = (wx - ex) / L, uy = (wy - ey) / L, mx = ex + ux * L * 0.55, my = ey + uy * L * 0.55;
    seg(ex, ey, mx, my, 1.3, 1.2, M_SLEEVE); seg(mx, my, wx - ux * 1.5, wy - uy * 1.5, 1.3, 2.0, M_SLEEVE);
    if (Math.abs(uy) < 0.7) for (let i = 1; i <= 4; i++) { const x = Math.round(wx - ux * (1.5 + i)), y = Math.round(wy - uy * (1.5 + i)); sp(x, y + 2, M_SLEEVE, 0); if (i <= 2) sp(x, y + 3, M_SLEEVE, 0); }   // 喇叭袖往下垂
    for (let k = -2; k <= 2; k++) sp(Math.round(wx - ux * 1.5 - uy * k), Math.round(wy - uy * 1.5 + ux * k), M_GOLD, 0);
    if (style === H_PRAY) return;
    if (style === H_DECK) drawStack(side, wx, wy);
    part(); drawHand(side, wx, wy, style);
  }
  function drawStack(side, wx, wy) {   // 手里的一叠牌：深靛牌背 + 金边 + 中间一颗金点，底下露出牌边
    part();
    const full = P.deck === 3 && side === 1, w = 5, h = full ? 7 : 6, x0 = wx + (side < 0 ? -3 : -1), y0 = wy - h;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const edge = i === 0 || j === 0 || i === w - 1 || j === 4; sp(x0 + i, y0 + j, j > 4 ? M_EDGE : edge ? M_GOLD : M_CARD, j > 4 ? (j === h - 1 ? 2 : 3) : 0); }
    sp(x0 + 2, y0 + 2, M_GOLD, 4);
  }
  // 手势形状：(外向 ox, 向下 oy)，外向 = 离身体中线越来越远的方向；手指 1 格粗，指缝 1 格
  const HAND = {
    [H_HANG]: { back: [1, -1, 5, 3], f: [[1, 2, 5], [3, 2, 7], [5, 2, 5]], bend: [], thumb: [[0, 2], [-1, 3], [-1, 4]], ring: [[1, 4], [3, 5]] },
    [H_SPLAY]: { back: [1, -1, 5, 3], f: [[1, 2, 5]], bend: [[3, 2], [3, 3], [4, 4], [4, 5], [5, 6], [5, 7], [6, 1], [7, 2], [8, 3], [9, 4]], thumb: [[0, 2], [-1, 3], [-2, 4], [-3, 5]], ring: [[1, 4]] },
  };
  function drawHand(side, wx, wy, style) {
    const s = side, H = (ox, oy, m, t) => sp(wx + s * ox, wy + oy, m || M_SKIN, t || 0);
    if (style === H_HANG || style === H_SPLAY) {   // 手背朝上，手指往下（画圈 / 施放时张开）
      const d = HAND[style], [bx, by, bw, bh] = d.back;
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) H(bx + i, by + j);
      for (let i = 0; i < bw; i += 2) H(bx + i, by + bh - 1, M_SKIN, 4);                    // 指节
      for (const [ox, oy, n] of d.f) for (let k = 0; k < n; k++) H(ox, oy + k, M_SKIN, k === n - 1 ? 4 : 3);
      for (const [ox, oy] of d.bend) H(ox, oy, M_SKIN, 3);
      for (const [ox, oy] of d.thumb) H(ox, oy, M_SKIN, 3);
      for (const [ox, oy] of d.ring) H(ox, oy, M_GOLD, 4);
    } else if (style === H_UP) {   // 手心朝前、手指朝上张开
      for (let j = -4; j <= -1; j++) for (let i = -1; i <= 3; i++) H(i, j);
      for (let k = 5; k <= 9; k++) H(-1, -k, M_SKIN, k === 9 ? 4 : 3);
      for (let k = 5; k <= 10; k++) H(1, -k, M_SKIN, k === 10 ? 4 : 3);
      H(3, -5, M_SKIN, 3); H(3, -6, M_SKIN, 3); H(4, -7, M_SKIN, 3); H(4, -8, M_SKIN, 3); H(5, -9, M_SKIN, 4);
      H(-2, -2, M_SKIN, 3); H(-3, -3, M_SKIN, 3); H(-4, -4, M_SKIN, 3); H(-4, -5, M_SKIN, 4);
      H(1, -7, M_GOLD, 4); H(0, -3, M_SKIN, 4);
    } else if (style === H_FLICK) {   // 甩出去的手：平伸、两根长手指朝外、拇指翘起
      for (let j = -1; j <= 1; j++) for (let i = 1; i <= 3; i++) H(i, j);
      for (let k = 4; k <= 9; k++) H(k, -1, M_SKIN, k === 9 ? 4 : 3);
      for (let k = 4; k <= 8; k++) H(k, 1, M_SKIN, k === 8 ? 4 : 3);
      H(3, -2, M_SKIN, 3); H(4, -3, M_SKIN, 3); H(4, -4, M_SKIN, 4); H(6, 1, M_GOLD, 4);
    } else if (style === H_DECK) {   // 托着牌：手掌在牌底下，手指从外侧勾住，拇指压在牌面上
      for (let j = 0; j <= 1; j++) for (let i = -1; i <= 3; i++) H(i, j);
      H(4, -1, M_SKIN, 3); H(4, -2, M_SKIN, 3); H(4, -3, M_SKIN, 4); H(-1, -2, M_SKIN, 3); H(-1, -3, M_SKIN, 4); H(4, 0, M_GOLD, 4);
    }
  }
  function drawPray(s) {   // 合掌：两只手掌并在胸前，指尖朝上（两个部件，中间压一道分界线）
    const y0 = 59 + (P.hyo > 1 ? 1 : 0) + s;
    part(); for (let y = y0; y <= y0 + 7; y++) run(y, X0 - 2, X0 - 1, M_SKIN, 0); sp(X0 - 1, y0 - 1, M_SKIN, 4); sp(X0 - 2, y0 + 4, M_GOLD, 4);
    part(); for (let y = y0; y <= y0 + 7; y++) run(y, X0, X0 + 1, M_SKIN, 0); sp(X0, y0 - 1, M_SKIN, 4);
  }
  function drawBridge() {   // 洗牌：两叠牌之间拱起一座牌桥（牌边金、牌背深靛）
    part();
    for (let x = P.lx + 1; x <= P.rx - 1; x++) { const u = (x - P.lx) / (P.rx - P.lx), yy = Math.round(P.ly - 7 - 4 * Math.sin(u * Math.PI)); sp(x, yy, M_GOLD, 4); sp(x, yy + 1, M_CARD, 0); }
  }
  // 钱币掉落：11 枚，外侧的往两边蹦，落在牌缝之间；落桌后弹一下、躺平；最后逐枚化成星点
  const DROP = []; for (let k = -5; k <= 5; k++) DROP.push({ k, x: X0 + k * 4 - 1, y: 0, vx: k * 4 * 1.7, vy: -22 + ((k * 7 + 11) % 5) * 5, g: 700, ground: Y0 + ((k + 5) % 3), wink: 0.05 + ((k * 5 + 55) % 11) * 0.025 });
  for (const c of DROP) c.y = hemY(c.k * 4) + 1;
  function coinAt(c, t) {   // 返回 [x, y, 躺平]
    const tl = (-c.vy + Math.sqrt(c.vy * c.vy + 2 * c.g * (c.ground - c.y))) / c.g;
    if (t < tl) return [c.x + c.vx * t, c.y + c.vy * t + 0.5 * c.g * t * t, 0];
    const xl = c.x + c.vx * tl + Math.sign(c.vx) * Math.min(2, (t - tl) * 12);
    return [xl, c.ground - (t - tl < 0.1 ? 1 : 0), t - tl >= 0.1 ? 1 : 0];
  }
  function drawDropped() {
    for (const c of DROP) {
      if (P.wink > c.wink + 1 / 12) continue;
      part(); const [x, y, flat] = coinAt(c, P.drop), X = Math.round(x), Y = Math.round(y);
      if (flat) { sp(X - 1, Y, M_DROP, 3); sp(X, Y, M_DROP, 4); sp(X + 1, Y, M_DROP, 2); } else coin(X, Y - 1, M_DROP);
    }
  }
  function drawHero() {
    DX = -X0; DY = -Y0; begin(hero, DX, DY);
    if (P.gone) { if (P.drop >= 0) drawDropped(); return; }
    const cx = X0 + P.hxo, oy = P.hyo, s = P.sho, lf = P.lx > 131 && P.ly > 56, rf = P.rx < 169 && P.ry > 56;
    const armL = () => drawArm(-1, 135, 60 + s, P.lex, P.ley + s, P.lx, P.ly, P.ls), armR = () => drawArm(1, 165, 60 + s, P.rex, P.rey + s, P.rx, P.ry, P.rs);
    drawTails(cx, oy);
    if (!lf) armL(); if (!rf) armR();
    drawShawl(s);
    drawFace(cx, oy);
    drawScarf(cx, oy);
    drawHoop(cx - 13, 51 + oy, P.ear); drawHoop(cx + 13, 51 + oy, P.ear);
    if (P.drop < 0) drawCoins(s);
    if (lf) armL(); if (rf) armR();
    if (P.ls === H_PRAY) drawPray(s);
    if (P.deck === 2) drawBridge();
    if (P.drop >= 0) drawDropped();
  }

  // ───── 精灵里的特效（烘焙之后直接写色板下标：不勾线、不压分界线；同时在 mat 上打发光标记给导出的发光遮罩）─────
  const idx = (x, y) => { const lx = Math.round(x) + DX + hero.ox, ly = Math.round(y) + DY + hero.oy; return lx < 1 || ly < 1 || lx >= hero.w - 1 || ly >= hero.h - 1 ? -1 : ly * hero.w + lx; };
  function put2(x, y, c) { const i = idx(x, y); if (i < 0) return; hero.out[i] = c; hero.mat[i] = M_FX; }
  function put2e(x, y, c) { const i = idx(x, y); if (i < 0 || (hero.mat[i] && hero.mat[i] !== M_FX)) return; hero.out[i] = c; hero.mat[i] = M_FX; }   // 只画在空处和勾线上（指缝），不盖手指
  function star4(x, y, L, c0, c1, c2) { put2(x, y, c0); for (let r = 1; r <= L; r++) { const c = r === 1 ? c1 : c2; put2(x + r, y, c); put2(x - r, y, c); put2(x, y + r, c); put2(x, y - r, c); } }
  const tipUp = (s, wx, wy) => [[wx - s, wy - 9], [wx + s, wy - 10], [wx + s * 5, wy - 9], [wx - s * 4, wy - 5]];     // 食指 · 中指 · 无名指 · 拇指
  const tipSplay = (s, wx, wy) => [[wx + s, wy + 6], [wx + s * 5, wy + 7], [wx + s * 9, wy + 4], [wx - s * 3, wy + 5]];
  function lineFx(x0, y0, x1, y1, fn, only) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let i = 0; i <= n; i++) { const q = i / n, c = fn(i, n, q); if (c >= 0) (only ? put2e : put2)(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, c); } }
  const CAST_TO = [[90, 74], [103, 75], [141, 74], [210, 74], [197, 75], [159, 74]];      // 星线落点：外侧牌顶边两处、中间牌顶边一处（每只手三道）
  function overlayFx() {
    const cx = X0 + P.hxo, oy = P.hyo;
    if (P.thr) {   // 蓄力：指缝里的星线（翻花绳）+ 头顶一道星线弧
      for (const [s, wx, wy] of [[-1, P.lx, P.ly], [1, P.rx, P.ry]]) {
        const T = tipUp(s, wx, wy), tw = (P.tw + (s > 0 ? 2 : 0)) & 3, c = (j) => ((j + tw) % 4 === 0 ? EL[0] : EL[1 + ((j + tw) & 1)]);
        lineFx(T[3][0], T[3][1], T[2][0], T[2][1], (j) => c(j), 1);
        if (P.thr >= 2) { lineFx(T[0][0], T[0][1], T[2][0], T[2][1] + 3, (j) => c(j + 1), 1); lineFx(T[3][0], T[3][1] - 2, T[1][0], T[1][1] + 3, (j) => c(j + 2), 1); }
      }
      if (P.thr >= 2) {
        const a = tipUp(-1, P.lx, P.ly)[1], b = tipUp(1, P.rx, P.ry)[1], H = a[1] - 24;
        let px = a[0], py = a[1];
        for (let x = a[0]; x <= b[0]; x++) {
          const u = (x - a[0]) / (b[0] - a[0]), y = Math.round(a[1] + (b[1] - a[1]) * u - H * 4 * u * (1 - u)), j = x - a[0], v = (j + P.tw * 3) % 12;
          const c = v === 0 ? EL[0] : v === 1 || v === 11 ? EL[1] : v === 6 ? -1 : EL[1 + ((j >> 2) & 1)];
          if (c >= 0) lineFx(px, py, x, y, () => c); px = x; py = y;
        }
      }
    }
    if (P.cth && P.cth <= 5) {   // 施放：十指射出星线落到三张牌的顶边
      const k = P.cth;
      for (const [s, wx, wy] of [[-1, P.lx, P.ly], [1, P.rx, P.ry]]) {
        const tips = P.ls === H_UP ? tipUp(s, wx, wy) : tipSplay(s, wx, wy), T = s < 0 ? CAST_TO.slice(0, 3) : CAST_TO.slice(3);
        for (const [from, to] of [[tips[2], T[0]], [tips[1], T[1]], [tips[3], T[2]]]) {
          lineFx(from[0], from[1], to[0], to[1], (i, n, q) => {
            if (k === 1) return i === n ? EL[0] : (i & 1 ? EL[1] : EL[0]);
            if (k === 2) return EL[1];
            if (k === 3) return i & 1 ? -1 : EL[2];
            if (k === 4) return q < 0.5 || i % 3 ? -1 : EL[2];
            return q < 0.8 || i & 1 ? -1 : EL[3];
          });
          if (k <= 4) { const L = [0, 2, 3, 2, 1][k]; star4(to[0], to[1], L, k <= 2 ? EL[0] : EL[1], k <= 2 ? EL[1] : EL[2], EL[2]); }
        }
      }
    }
    if (P.arc) {   // 发牌：一道金箔弧线从胸前划到甩出去的手
      const C = FXR[FXI.coin], P0 = [148, 63], P1 = [127, 49], P2 = [99, 62];
      for (let i = 0; i <= 90; i++) {
        const u = i / 90, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u, x = a * P0[0] + b * P1[0] + c * P2[0], y = a * P0[1] + b * P1[1] + c * P2[1];
        if (P.arc === 1) { put2(x, y, u > 0.25 ? C[0] : C[1]); put2(x, y - 1, C[1]); put2(x, y + 1, u > 0.5 ? C[2] : C[3]); }
        else if ((Math.round(x) & 1) && u > 0.35) put2(x, y, u > 0.7 ? C[2] : C[3]);
      }
      if (P.arc === 1) { put2(96, 59, C[1]); put2(94, 63, C[2]); put2(97, 67, C[0]); put2(93, 60, C[2]); }
      else { put2(93, 57, C[2]); put2(91, 62, C[3]); put2(94, 68, C[2]); }
    }
    if (P.dust) {   // 受击：头边 4 颗紫色星尘往外弹
      const hx = cx, hy = 44 + oy, r = 10 + P.dust * 3;
      for (const a of [-2.6, -0.45, -1.95, -1.15]) { const x = hx + Math.cos(a) * r * 1.2, y = hy + Math.sin(a) * r; if (P.dust === 1) star4(Math.round(x), Math.round(y), 1, EL[0], EL[1], EL[1]); else if (P.dust === 2) star4(Math.round(x), Math.round(y), 1, EL[1], EL[2], EL[2]); else put2(x, y, EL[2]); }
    }
    if (P.glint) {   // 待机：左手戒指、右耳环的小铃铛各闪一下
      const [x, y] = P.glint <= 2 ? [P.lx - 3, P.ly + 5] : [cx + 13 + P.ear, 58 + oy];
      if (P.glint & 1) star4(x, y, 1, EL[0], EL[1], EL[1]); else put2(x, y, EL[1]);
    }
    if (P.wink) for (const c of DROP) { const d = P.wink - c.wink; if (d >= 0 && d < 2 / 12) { const [x, y] = coinAt(c, P.drop); star4(Math.round(x), Math.round(y) - 1, d < 1 / 12 ? 2 : 1, EL[0], EL[1], EL[2]); } }
  }
  // 离开：从下往上化成烟——前沿以下的像素被烧掉，烧过的像素变成烟往上飘、左右摆、越飘越稀越暗；前沿上方再飘几缕卷烟
  const SM = FXR[R_SMOKE], SRC = new Uint8Array(hero.w * hero.h), SRCM = new Uint8Array(hero.w * hero.h);
  function smokePass(q) {
    const o = hero.out, m = hero.mat, w = hero.w, top = 26 - 20, bot = 80 - 20, F = q * 1.35 - 0.12;
    SRC.set(o); SRCM.set(m);
    for (let y = top; y <= bot; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (SRC[i] === 255 || SRCM[i] === M_DROP) continue;
      const v = E.hash(x, y) * 0.25 + (bot - y) / (bot - top) * 0.75; if (v >= F) continue;
      o[i] = 255; m[i] = 0;
      const e = F - v; if (e > 0.34 || E.hash(x + 7, y * 3) > 0.9 - e * 1.6) continue;
      const ny = y - Math.round(e * 40), nx = x + Math.round(Math.sin(ny * 0.4 + x * 0.25) * e * 7); if (ny < 3 || nx < 1 || nx >= w - 2) continue;
      const j = ny * w + nx, c = e < 0.07 ? SM[0] : e < 0.16 ? SM[1] : e < 0.25 ? SM[2] : SM[3]; o[j] = c; m[j] = M_FX;
      if (e < 0.16 && ((x + y) & 1)) { o[j + 1] = c; m[j + 1] = M_FX; }                   // 前沿附近的烟成团（2 格）
    }
    const fy = 80 - Math.min(1.15, F / 0.75) * 54, t = q * 2.2;
    for (let k = 0; k < 5; k++) {
      const x0 = X0 - 14 + k * 7 + ((k * 3) % 4), len = 5 + (k % 3) * 3, base = fy - 4 - (k & 1) * 2 - q * 8;
      for (let j = 0; j < len; j++) { const y = base - j, x = x0 + Math.round(Math.sin(y * 0.45 + k * 1.7 + t * 4) * 1.6); if (j > len * 0.5 && ((x + y) & 1)) continue; if (y < 24) continue; put2(x, y, j < len * 0.4 ? SM[0] : SM[2]); }
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.smoke >= 0 && !P.gone) smokePass(P.smoke);
    else if (P.gone && P.smoke >= 0) { const q = P.wink; for (let k = 0; k < 3; k++) { const x = X0 - 6 + k * 6, y0 = 30 - q * 14 - k * 2; for (let j = 0; j < 6; j++) { const y = y0 - j, x1 = x + Math.round(Math.sin(y * 0.5 + k * 2 + q * 8) * 1.5); if (y >= 24 && !((x1 + y + k) & 1) && q < 0.35) put2(x1, y, j < 3 ? SM[2] : SM[3]); } } }
    if (!P.flash) overlayFx();
  }

  // ───── 引擎粒子（查看页 / 动作引擎）─────
  const SX = (x) => scrX(x - X0), SY = (y) => HY + y - Y0;
  let chargeAcc = 0, moteAcc = 0, smokeAcc = 0;
  function onEnter(s) {
    if (s === CAST) {
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, ramp: R_EL });
      for (const [x, y] of CAST_TO) burst(SX(x), SY(y), 8, 30, 70, 0.2, 0.45, R_EL, 8);
      ring(SX(150), SY(66), 1, R_EL); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) { burst(SX(100), SY(64), 6, 20, 50, 0.15, 0.3, FXI.coin, 6); sfx('swing', { kind: 'throw', w: 0.2 }); }
    if (s === ATTACK && t === T_SLAP) sfx('hit', { mat: 'wood', w: 0.1 });
    if (s === CAST && t === 1 / 12) sfx('impact', { pal: 'arcane', w: 0.2 });
    if (s === DEATH && t === T_LAND) { for (const c of DROP) { const [x, y] = coinAt(c, 0.5); burst(SX(x), SY(y), 2, 10, 25, 0.15, 0.3, FXI.coin, 10); } sfx('hit', { mat: 'metal', w: 0.1 }); }
  }
  const EVENTS = [[], [], [T_FLICK, T_SLAP], [], [1 / 12], [], [], [T_LAND], []];
  function hurtFx(s) {   // 受击 / 离开时不用撞击火花：一小撮星尘
    const x = SX(X0), y = SY(60); burst(x, y, s === DEATH ? 10 : 12, 25, 60, 0.3, 0.6, R_EL, 12); if (s === HURT) shake(0.12, 1); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const side = Math.random() < 0.5 ? -1 : 1, wx = side < 0 ? P.lx : P.rx, wy = (side < 0 ? P.ly : P.ry) - 6, r = 10 + Math.random() * 8, a = Math.random() * TAU;
        spawnX(K_SPIRAL_PT, SX(wx), SY(wy), (r - 3) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: side * (4 + Math.random() * 3), tx: SX(wx), ty: SY(wy), orbitR: 2.5 }); }
    }
    if (state === IDLE || state === RECOVER) {
      moteAcc += dt * (state === IDLE ? 1.4 : 5);
      while (moteAcc >= 1) { moteAcc -= 1; const side = Math.random() < 0.5 ? -1 : 1, wx = side < 0 ? P.lx : P.rx, wy = side < 0 ? P.ly : P.ry; spawn(K_EMBER, SX(wx + side * 3), SY(wy + 5), Math.random() * 6 - 3, -5 - Math.random() * 6, 0.6 + Math.random() * 0.6, R_EL); }
    }
    if (state === DEATH && P.smoke > 0 && P.smoke < 1) {
      smokeAcc += dt * 26;
      while (smokeAcc >= 1) { smokeAcc -= 1; const y = 78 - P.smoke * 50; spawn(K_RISE, SX(X0 - 16 + Math.random() * 32), SY(y), (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.7 + Math.random() * 0.7, R_SMOKE); }
    }
  }
  function fxReset() { chargeAcc = 0; moteAcc = 0; smokeAcc = 0; }

  return {
    name: '占卜师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EGLOW, M_FX], HIT_POINT: [0, -60], EVENTS,
    REVIVE: { dy: -60, ramp: R_EL },
    SHEET: [[IDLE, [0, 5 / 12, 10 / 12, 15 / 12, 20 / 12, 22 / 12, 25 / 12]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'],
      [DEATH, [4 / 12, 5 / 12, 8 / 12, 10 / 12, 12 / 12, 14 / 12, 17 / 12, 21 / 12, 24 / 12, 27 / 12, 30 / 12, 32 / 12, 34 / 12]], [REVIVE, [0.45, 0.6, 0.75, 0.9]]],
    // 音效：竖琴拨弦 + 耳环小铃铛，重量 0.2；坐着不走路（hover）；charge / release / hurt / death 由引擎自动发
    SFX: { body: 'flesh', how: 'dissolve', pal: 'arcane', style: 'beam', w: 0.2, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, hurtFx, stepFX, fxReset,
  };
});
