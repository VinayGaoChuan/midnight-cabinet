// 拳馆教练（PitCoach · 地下拳馆 G024 的 NPC）：宽肩厚背的大块头，双臂抱胸、白色缠手；嘴里斜叼一支雪茄（头上一个发光的火点，冒烟），
//   红毛巾搭在前肩、一头从背后垂下来；灰白脏背心、深棕宽裤（侧面锈橙条）扎进皮靴、前上臂纹身、脖子上挂一只金属哨子；花白短发 + 络腮胡。
// 待机 = 抽一口（火点变亮）吐两个烟圈，再转一下脖子；移动 = 拳手的晃肩重步；攻击 = 挥拳喊「上！」（张嘴、汗珠飞、「)))」声波）；
// 技能「开场哨」= 蓄力举手指 3、2、1 + 哨子送到嘴边鼓腮 → 施放吹哨（声波弧 + 毛巾甩上天、雪茄被震出嘴）→ 收招毛巾落回肩、雪茄落回嘴、鼓掌两下、竖大拇指（最后一帧可停）；
// 受击 = 捂脸（差评级）；死亡 = 直挺挺后仰倒，雪茄飞出去落地冒烟熄灭，毛巾落下来盖在脸上（扔毛巾认输）。
// 设定卡见 .ai/npc/PitCoach/design.md。
PCD.define('PitCoach', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_SPIRAL_PT, K_EMBER, K_PHYS,
    spawn, spawnX, burst, shake, flash, fx, ring, shoot, hitDummy, dummyFx, put, scrX, sfx } = E;
  const RD = Math.round, PX = parts.px, FREE = parts.FREE;

  // ───── 元素：哨音 / 声波 steel（白 → 淡钢 → 钢 → 深钢 → 墨钢）；烟 dust、汗 water、火点 fire ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], SMOKE = FXI.dust, SWEAT = FXI.water, FIRE = FXI.fire, SM = FXR[SMOKE];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: [20, '#7c3f22', '#b0643a', '#dc9562'],       // 古铜皮肤
    vest: 'bone',                                     // 灰白背心（汗渍用第 2 级）
    pants: [0, '#241b17', '#3a2b23', '#57412f'],       // 深棕宽裤
    stripe: 'leather',                                // 裤侧锈橙条、哨子挂绳
    boot: 'wood',                                     // 皮靴
    wrap: 'white',                                    // 缠手带
    hair: [0, '#1e1719', '#352b2e', '#4e4245'],        // 短发 / 络腮胡
    grey: 'bone',                                     // 鬓角、八字胡里的花白
    towel: 'crimson',                                 // 红毛巾
    tstripe: 'white',                                 // 毛巾头上的白条
    tattoo: 'pale',                                   // 褪色蓝灰纹身
    metal: 'steel',                                   // 哨子
    cigar: 'wood',                                    // 雪茄身
    band: 'gold',                                     // 雪茄环
    ash: { r: 'white', flat: 1 },                     // 熄灭后的烟灰
    ember: { r: [44, 46, 47, 51], flat: 1 },          // 火点（发光体）：暗红 · 橙 · 金黄 · 淡金白
    ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'heroic', leg: 12, torso: 12, head: 8, headW: 7, neck: 1, sw: 7, arm: 11, lw: 4, limb: 1.5, belly: 1, stride: 3, lift: 2, fall: 'back' };
  const HX = 40, DUR = DEFAULT_DUR.slice(); DUR[IDLE] = 3.0;
  const hero = new Sprite(96, 64, 48, 60);
  // 轮廓光来自雪茄火点（fire）：半径很小，只把胡子、头发、毛巾朝向火点的边染橙；皮肤、缠手、哨子、雪茄本身不吃光
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 8, 11], rimRamp: FXR[FIRE], flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'wrap', 'metal', 'cigar', 'band', 'ash', 'ember', 'ink', 'tattoo', 'stripe', 'towel', 'tstripe', 'grey']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势 ─────
  // hdy 低头 0–1（转脖子）· mouth 0 叼烟闭嘴 1 吐烟「o」2 张嘴吼 3 含哨鼓腮 4 咧嘴露牙 · fg 前手 / bg 后手手势（见 hand()）· bm 后臂 0 在身后 1 横在胸前
  // cg 雪茄 0 叼着（方向 cgD）1 含哨时往上翘 2 飞在空中 / 掉在地上（cgX / cgY 中心、cgD 方向）3 不画 · tw 毛巾 0 搭肩 1 在空中（twX / twY / twF 形状）2 盖在脸上 · wh 哨子 0 挂胸前 1 在嘴边
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, hdy: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, mouth: 0, fg: 0, bg: 0, bm: 1, cg: 0, cgX: 0, cgY: 0, cgD: 3, tw: 0, twX: 0, twY: 0, twF: 0, wh: 0,
    dq: 0, dq48: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0,
    mX: 0, mY: 0, wX: 0, wY: 0, fX: 0, fY: 0, tX: 0, tY: 0 };                  // 特效挂点（不进缓存键）：嘴 · 哨口 · 前拳 · 后手指尖
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(9, -19, 8, -16, 0, 0, 0);       // 抱臂：近侧前臂横在胸前、远侧拳从近侧前臂下面露出来
  const K_WIND = K(3, -14, 8, -16, -1, 0, 1);       // 攻击预兆：拳头往下后收、压低
  const K_PUMP = K(14, -31, 8, -16, 1, 1, 0);       // 挥拳：拳到头顶前上方
  const K_PUMP2 = K(13, -30, 8, -16, 1, 1, 0);
  const K_CHG = K(8, -27, -9, -31, -1, -1, 0);      // 蓄力：前手捏哨子到嘴边，后手举过头数手指
  const K_BLAST = K(8, -27, -8, -32, -1, -1, 0);    // 施放：后手握拳上举
  const K_CLAPA = K(12, -20, 8, -20, 0, 0, 0);      // 鼓掌：两手分开
  const K_CLAP = K(11, -20, 10, -20, 0, 0, 0);       //       两手相碰
  const K_THUMB = K(12, -20, 8, -16, 0, 1, 0);      // 竖大拇指
  const K_PALM = K(5, -30, 8, -17, -1, 1, 1);       // 捂脸
  const K_WALK = K(6, -13, -7, -13, 0, 0, 0);
  const K_FLAIL1 = K(9, -30, -7, -31, -1, -1, 0);   // 死亡：两手张开乱挥
  const K_FLAIL2 = K(12, -26, -8, -27, -1, -1, 1);
  const K_LIE = K(10, -24, -6, -16, 0, 0, 0);       // 躺着：前手直直举向天
  const K_LIE2 = K(6, -15, -6, -16, 0, 0, 0);       //       手垂下来搭在肚子上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B || A, q || 0, FIELDS);
  const KEY = E.keyer([['hx', -8, 16], ['hy', -40, 0], ['bhx', -12, 12], ['bhy', -40, 0], ['lean', -1, 2], ['head', -1, 1], ['hdy', 0, 1], ['crouch', 0, 3], ['bob', -1, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3],
    ['mouth', 0, 4], ['fg', 0, 6], ['bg', 0, 6], ['bm', 0, 1], ['cg', 0, 3], ['cgD', 0, 15], ['tw', 0, 2], ['twF', 0, 3], ['wh', 0, 1], ['st', 0, 8],
    ['cgX', -24, 32], ['cgY', -56, 1], ['twX', -32, 16], ['twY', -60, 0], ['dq48', 0, 48], ['bx', -6, 4]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_LEAN = [1, 0, 1, 0];
  // 待机时间点（循环 3.0 秒）：0.75–1.0 吸一口（火点 1 → 2 档）· 1.0–1.33 吐烟（两个烟圈 1.0 / 1.167）· 2.0–2.5 转脖子（2.333「咔」）
  const T_PUFF = 0.75, T_RING1 = 1.0, T_RING2 = 1.0 + 2 / 12, T_NECK = 2.0, T_CRACK = 2.0 + 4 / 12;
  const NECK = [[1, 1], [0, 1], [-1, 1], [-1, 0], [0, 0], [1, 0]];            // [head, hdy]：下巴往前压 → 转到后面 → 仰头 → 回正
  const T_STRIKE = 2 / 12;
  const T_TICK = [0.3333, 0.75, 1.0833];                                        // 手指 3 → 2 → 1 的时刻（蓄力）
  const T_ARC2 = 1 / 12, T_ARC3 = 2 / 12, T_HIT = 0.3;                           // 施放：第二、三道声波弧；声波撞上假人
  const T_CATCH = 1 / 12, T_CLAP1 = 2 / 12, T_CLAP2 = 4 / 12, T_THUMB = 5 / 12;  // 收招：雪茄落回嘴 · 毛巾落回肩 + 第一下掌 · 第二下掌 · 竖拇指
  const D_CIG = 0.47, D_LAND = 0.66, D_TOWEL = 0.9;                              // 死亡（相对命中）：雪茄落地 · 身体落地 · 毛巾盖脸

  // ───── 几何：头（转脖子时整颗头平移）、嘴、雪茄 ─────
  function rigOf() {
    const R = parts.rig(P, BODY);
    if (P.hdy && !R.lie) { R.hy += P.hdy; R.htop += P.hdy; R.ey += P.hdy; }
    R.my = Math.min(R.hy, R.ey + 3);                                             // 嘴那一行
    return R;
  }
  // 叼在嘴里的雪茄：根部格 + 方向。吐烟 / 吼的时候根部往下挪（嘴张开了），含哨时往上翘 45°
  function cigarRoot(R) {
    const x = R.hx1 + 1, y = R.my;
    if (P.cg === 1) return [x, y - 1, 2];
    if (P.mouth === 1) return [x, y + 1, 4];
    if (P.mouth === 2) return [x, y + 2, 5];
    return [x, y, P.cgD];
  }
  const cellOf = (di, x, y, k) => parts.cell(di, x, y, k);
  // 飞在空中的雪茄：给中心（第 2 格）和方向，反推根部
  function freeRoot() { const c = cellOf(P.cgD, 0, 0, 2); return [P.cgX - c[0], P.cgY - c[1]]; }

  // ───── 缠手 + 手势：一个部件（腕上一截缠带 + 拳 / 手掌；手指是肤色）─────
  // g：0 握拳 · 1 张开手掌（鼓掌）· 2 竖大拇指 · 3 捏哨子 · 4 张开乱挥 · 5 捂脸 · 6 竖手指（n = P.bg 之外另给）
  function hand(T, a, g, far, fingers) {
    const w = far ? M.wrapD : M.wrap, sk = M.skin, hx = a.hx, hy = a.hy;
    const dx = a.hx - a.ex, dy = a.hy - a.ey, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    E.part();
    parts.sweep(E, T, a.wx - ux * 0.8, a.wy - uy * 0.8, a.wx, a.wy, 1.1, 1.1, w, 0);             // 腕上的缠带
    if (g === 1) {                                                                                 // 掌心朝前、手指朝上
      parts.rect(E, T, hx - 1, hy, 2, 2, w, 0); parts.rect(E, T, hx - 1, hy - 2, 2, 2, sk, 0); PX(E, T, hx - 1, hy - 2, sk, 4); PX(E, T, hx + 1, hy, sk, 3);
    } else if (g === 2) {                                                                          // 竖大拇指
      parts.rect(E, T, hx - 1, hy - 1, 3, 3, w, 0); PX(E, T, hx - 1, hy - 1, w, 4);
      PX(E, T, hx, hy - 2, sk, 3); PX(E, T, hx, hy - 3, sk, 3); PX(E, T, hx, hy - 4, sk, 4); PX(E, T, hx + 1, hy + 1, sk, 2); PX(E, T, hx + 1, hy, sk, 2);
    } else if (g === 3) {                                                                          // 捏着哨子：拳压扁成 3×2
      parts.rect(E, T, hx - 1, hy - 1, 3, 2, w, 0); PX(E, T, hx - 1, hy - 1, w, 4); PX(E, T, hx - 2, hy - 1, sk, 3);
    } else if (g === 4) {                                                                          // 张开：四根手指朝四个方向
      parts.rect(E, T, hx - 1, hy - 1, 2, 2, w, 0);
      PX(E, T, hx - 2, hy - 2, sk, 3); PX(E, T, hx - 1, hy - 3, sk, 4); PX(E, T, hx + 1, hy - 3, sk, 4); PX(E, T, hx + 2, hy - 2, sk, 3); PX(E, T, hx + 1, hy - 2, sk, 3); PX(E, T, hx - 1, hy - 2, sk, 3);
    } else if (g === 5) {                                                                          // 捂脸：手掌横在眼睛上，手指往后上盖住眉
      parts.rect(E, T, hx - 1, hy, 3, 2, w, 0); PX(E, T, hx - 1, hy, w, 4);
      parts.run(E, T, hy - 1, hx - 2, hx, sk, 0); parts.run(E, T, hy - 2, hx - 3, hx - 1, sk, 0); PX(E, T, hx - 3, hy - 2, sk, 4);
    } else if (g === 6) {                                                                          // 竖手指：3 = 三指张开 · 2 = V · 1 = 一根食指
      parts.rect(E, T, hx - 1, hy, 3, 2, w, 0); PX(E, T, hx - 1, hy, w, 4);
      const n = fingers || 1, F = (pts) => { for (const q of pts) PX(E, T, hx + q[0], hy + q[1], sk, q[2]); };
      if (n >= 2) { F([[-1, -1, 3], [-2, -2, 4], [-2, -3, 4]]); F([[1, -1, 3], [2, -2, 3], [2, -3, 4]]); }
      if (n !== 2) F([[0, -1, 3], [0, -2, 3], [0, -3, 4], [0, -4, 4]]);
      if (n === 2) PX(E, T, hx, hy - 1, w, 3);
      if (n === 1) { PX(E, T, hx - 1, hy - 1, w, 3); PX(E, T, hx + 1, hy - 1, w, 2); }
    } else {                                                                                       // 握拳：3×3 缠手，前下露一格手指
      parts.rect(E, T, hx - 1, hy - 1, 3, 3, w, 0); PX(E, T, hx - 1, hy - 1, w, 4); PX(E, T, hx + 1, hy + 1, sk, 2);
    }
  }

  // ───── 宽裤 + 皮靴：膝部鼓出、裤脚堆在靴口上多 1 格；近侧裤腿中线一道锈橙条 ─────
  const BOOT_H = 4;
  function pantLeg(R, hipX, footX, up, kn, far) {
    const pm = far ? M.pantsD : M.pants, bm = far ? M.bootD : M.boot, yb = -up, h0 = R.yHip + 1, n = Math.max(1, yb - h0);
    let c = footX;
    for (let y = h0; y <= yb; y++) {
      const t = (y - h0) / n; c = RD(hipX + (footX - hipX) * t + kn * Math.sin(t * Math.PI));
      const boot = y > yb - BOOT_H, cuff = y === yb - BOOT_H;
      let a = c - 2, z = c + 1;
      if (!boot) { if (t > 0.12 && t < 0.55) a -= 1; if (t > 0.3 && t < 0.72) z += 1; if (cuff) { a -= 1; z += 1; } }
      parts.run(E, R, y, a, z, boot ? bm : pm, 0);
      if (!boot && !far && y > h0 && !cuff) PX(E, R, c, y, M.stripe, y === h0 + 1 ? 4 : 3);
      if (!boot && !cuff && t > 0.3 && t < 0.72) PX(E, R, z - 1, y, pm, 2);                         // 膝盖处的褶
      if (boot && y === yb - BOOT_H + 1) PX(E, R, z, y, bm, 4);                                   // 靴口
      if (boot && y === yb - 1) PX(E, R, z, y, bm, 4);                                            // 鞋带
      if (y === yb) { const toe = far ? 1 : 2; for (let i = 1; i <= toe; i++) PX(E, R, z + i, y, bm, i === toe ? 3 : 0); PX(E, R, a, y, bm, 1); }
    }
    return c;
  }
  function legs(R) {
    const kn = R.cr * 0.9;
    E.part(); pantLeg(R, R.legBx, R.footBx, R.footBup, kn + (R.footBup ? 0.8 : 0), 1);
    E.part(); pantLeg(R, R.legFx, R.footFx, R.footFup, kn + (R.footFup ? 0.8 : 0), 0);
  }
  // ───── 背心（单独一个部件：领口前低后高，下摆盖过裤腰、前面被肚子顶出 1 格；汗渍）+ 裤腰抽绳 ─────
  function singlet(R) {
    const yS = R.yS, yH = R.yHip, m = M.vest;
    E.part();
    let fr = 0;
    for (let y = yS + 1; y <= yH; y++) {
      const e = parts.edges(R, Math.min(y, yH - 1)); let L = e[0], Rr = e[1]; const k = y - yS;
      if (k === 1) Rr = L + 3; else if (k === 2) Rr -= 4; else if (k === 3) Rr -= 2;
      if (y >= yH - 1) Rr += 1;
      parts.run(E, R, y, L, Rr, m, 0); if (y === yH) fr = Rr;
    }
    const e5 = parts.edges(R, yS + 6), e7 = parts.edges(R, yS + 8);
    PX(E, R, e5[1] - 2, yS + 6, m, 2); PX(E, R, e5[1] - 3, yS + 7, m, 2); PX(E, R, e5[1] - 2, yS + 7, m, 2);   // 胸前汗渍
    PX(E, R, e7[0] + 2, yS + 4, m, 2); PX(E, R, e7[0] + 3, yS + 5, m, 2);                                          // 腋下汗渍
    for (let x = parts.edges(R, yH - 1)[0] + 1; x < fr - 1; x += 3) PX(E, R, x, yH, m, 2);                        // 下摆的褶
    const sw = RD((P.beard || 0) * 0.5);
    PX(E, R, fr - 2, yH + 1, m, 3); PX(E, R, fr - 2 + sw, yH + 2, m, 4);                                          // 裤腰抽绳
  }
  // ───── 搭肩毛巾（两段）：A 绕过脖子后面、一头从背后垂 9 行（伸出后背 2 格，末端白条 + 流苏）——画在头之前；
  //       B 搭在前肩上、一小截垂在肩前（白条 + 流苏）——画在前臂的袖子之后、手之前 ─────
  function towelBack(R) {
    const yS = R.yS, bk = parts.edges(R, yS + 1)[0], b = RD(P.beard || 0), sw = RD(P.sway || 0), m = M.towel;
    E.part();
    parts.run(E, R, yS - 1, bk + 1, R.hx + 1, m, 0);
    parts.run(E, R, yS, bk - 1, R.hx + 2, m, 0);
    const L = 9;
    let xe = 0;
    for (let k = 1; k <= L; k++) {
      const q = k / L, x = bk - 2 + RD(-b * q * q * 0.9 + sw * q * 0.6) + (k === 1 ? 1 : 0), y = yS + k, str = k === L - 2 || k === L - 1;
      parts.run(E, R, y, x, x + 2, str && k === L - 2 ? M.tstripe : m, str && k === L - 2 ? 3 : 0);
      if (k > 1 && k < L - 2 && (k & 1)) PX(E, R, x + 1, y, m, 2);                                  // 毛巾的横纹
      xe = x;
    }
    PX(E, R, xe, yS + L + 1, M.tstripe, 2); PX(E, R, xe + 2, yS + L + 1, M.tstripe, 2);             // 流苏
  }
  function towelFront(R) {
    const x = R.sFx, y = R.sFy, m = M.towel, sw = RD((P.beard || 0) * 0.4);
    E.part();
    parts.run(E, R, y - 3, x, x + 1, m, 0);
    parts.run(E, R, y - 2, x - 1, x + 2, m, 0);
    for (let k = -1; k <= 1; k++) parts.run(E, R, y + k, x + 1, x + 2, m, k === 1 ? 2 : 0);
    parts.run(E, R, y + 2, x + 1 + sw, x + 2 + sw, M.tstripe, 3);
    PX(E, R, x + 1 + sw, y + 3, M.tstripe, 2); PX(E, R, x + 2 + sw, y + 3, m, 2);
  }
  // 飞在空中的毛巾（精灵本地坐标，中心 cx, cy）：5 个形状
  const TW = [
    ['.LLLLLL.', 'RRRRRRRR', 'Rr....rR', 'W......W', 'R......R'],     // 0 张开往下垂（∩）
    ['....LR', '..LRRr', '.RRrW.', 'RRr...', 'Wr....'],                // 1 翻着斜飞
    ['W......W', 'R......R', 'RL....Rr', 'RRRRRRRr', '.rrrrrr.'],     // 2 两头甩上天（∪）
    ['.LR.', 'LRRr', 'RRWr', 'RRrr', '.Rr.'],                          // 3 卷成一团
    ['.LLLLLL.', 'RRRRRRRR', 'RRRWWRRR', 'RrrrrrrR', 'r.r..r.r'],     // 4 盖在脸上
  ];
  function towelStamp(cx, cy, f) {
    const S = TW[f], h = S.length, w = S[0].length, x0 = RD(cx) - (w >> 1), y0 = RD(cy) - (h >> 1);
    E.part();
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = S[j][i]; if (ch === '.') continue;
      PX(E, FREE, x0 + i, y0 + j, ch === 'W' ? M.tstripe : M.towel, ch === 'W' ? 3 : ch === 'r' ? 2 : ch === 'L' ? 4 : 0);
    }
  }
  // ───── 雪茄（一个部件：嘴端 · 金环 · 雪茄身 · 雪茄身 · 火点）；火点 5 档：0 闷烧橙 · 1 吸一口金黄 · 2 淡金白 + 后一格也红 · 3 同 2 + 前面一颗火星 · 4 熄灭成灰 ─────
  function cigar(T, x0, y0, di) {
    E.part();
    const g = P.gem;
    parts.bar(di, x0, y0, 0, 4, 1, (k, j, X, Y) => {
      if (k === 4) { if (g === 4) PX(E, T, X, Y, M.ash, 2); else PX(E, T, X, Y, M.ember, g === 0 ? 2 : g === 1 ? 3 : 4); }
      else if (k === 3 && g >= 2 && g < 4) PX(E, T, X, Y, M.ember, g === 3 ? 3 : 2);
      else PX(E, T, X, Y, k === 1 ? M.band : M.cigar, k === 1 ? 3 : k === 0 ? 2 : 0);
    });
    if (g === 3) { const c = cellOf(di, x0, y0, 5); PX(E, T, c[0], c[1] - 1, M.ember, 2); }
  }
  // ───── 哨子：挂在胸前（2×2 哨身 + 1 格哨嘴，挂绳从脖子后面绕过来）；含在嘴里时哨嘴贴唇、哨身朝前 ─────
  function whistle(R) {
    E.part();
    const n0x = R.hx - 2, n0y = R.hy + 1, sw = RD((P.beard || 0) * 0.4);
    if (P.wh) {
      const x = R.hx1 + 1, y = R.my;
      parts.line(E, R, n0x, n0y + 1, x + 1, y + 2, M.stripe, 2);
      PX(E, R, x, y, M.metal, 2); PX(E, R, x + 1, y, M.metal, 3); PX(E, R, x + 2, y, M.metal, 4); PX(E, R, x + 2, y - 1, M.metal, 3); PX(E, R, x + 3, y - 1, M.metal, 2);
    } else {
      const x = R.hx + 3 + sw, y = R.yS + 3;
      parts.line(E, R, n0x, n0y, x - 1, y - 1, M.stripe, 2);
      PX(E, R, x, y, M.metal, 4); PX(E, R, x + 1, y, M.metal, 3); PX(E, R, x, y + 1, M.metal, 3); PX(E, R, x + 1, y + 1, M.metal, 2); PX(E, R, x + 1, y + 2, M.metal, 2);
    }
  }
  // ───── 头：方下巴、粗眉、拳手大鼻子、脸颊疤；短发（鬓角花白）；络腮胡 + 嘴（嘴画在胡子的部件里）─────
  function headDraw(R) {
    parts.head(E, R, P, { mat: M.skin, face: 'square', age: 'rugged', eye: M.ink, brow: M.hair, browStyle: 2, nose: 'big', mouth: 'none', ear: 'dot' });
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
    PX(E, R, R.hx0, R.ey - 1, M.grey, 2); PX(E, R, R.hx0, R.ey, M.grey, 3);                                        // 鬓角花白
    parts.beard(E, R, P, { style: 'full', mat: M.hair });
    PX(E, R, R.hx1 - 1, R.ey + 2, M.grey, 3); PX(E, R, R.hx1, R.ey + 2, M.grey, 4);                               // 八字胡里的花白
    if (P.mouth !== 3) { PX(E, R, R.hx1 + 1, R.ey + 1, M.skin, 3); PX(E, R, R.hx1 + 1, R.ey + 2, M.skin, 2); }        // 大鼻子（压在胡子上，不被分界线吃掉）
    const x1 = R.hx1, my = R.my, D = (x, y) => PX(E, R, x, y, M.ink, 1);
    if (P.mouth === 1) { D(x1, my); D(x1 + 1, my); }                                                // 吐烟：嘴撮成「o」
    else if (P.mouth === 2) {                                                                      // 吼：嘴张开 2 行、1 格白牙、下巴落下 1 行
      D(x1 - 1, my); D(x1, my + 1); D(x1 + 1, my + 1); D(x1 - 1, my + 1); PX(E, R, x1, my, M.wrap, 3); D(x1 + 1, my);
      parts.run(E, R, R.hy + 3, R.hx0 + 3, x1, M.hair, 0);
    } else if (P.mouth === 3) {                                                                    // 含哨鼓腮：胡子往前鼓 1 格
      PX(E, R, x1 + 2, my - 1, M.hair, 4); PX(E, R, x1 + 1, my + 1, M.hair, 0); PX(E, R, x1 + 2, my + 1, M.hair, 0); PX(E, R, x1 + 1, my + 2, M.hair, 0);
    } else if (P.mouth === 4) { PX(E, R, x1 - 1, my, M.wrap, 3); PX(E, R, x1, my, M.wrap, 4); }     // 咧嘴露牙
    else D(x1, my);
  }

  // ───── 后前臂（抱臂 / 鼓掌时横在胸前）：远侧上臂藏在身体后面，只画前臂 ─────
  function foldForearm(R) {
    const sx = R.lean + 1, sy = R.yS + 6, hx = P.bhx, hy = P.bhy, dx = hx - sx, dy = hy - sy, l = Math.hypot(dx, dy) || 1, wx = hx - dx / l * 1.2, wy = hy - dy / l * 1.2;
    E.part(); parts.sweep(E, R, sx, sy, wx, wy, 1.6, 1.5, M.skinD, 0);
    return { hx, hy, ex: sx, ey: sy, wx, wy };
  }
  function frontArm(R) {
    const a = parts.arm(E, R, P, { side: 'F', sleeve: 'bare', mat: M.skin, grip: 'none', at: [P.hx, P.hy] });
    const tx = RD((R.sFx + a.ex) / 2), ty = RD((R.sFy + a.ey) / 2);                               // 纹身：上臂中段一块褪色蓝灰
    PX(E, R, tx, ty, M.tattoo, 2); PX(E, R, tx - 1, ty + 1, M.tattoo, 3); PX(E, R, tx, ty + 1, M.tattoo, 2); PX(E, R, tx + 1, ty + 1, M.tattoo, 3);
    return a;
  }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = rigOf();
    if (P.bm === 0) { const a = parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, grip: 'none', at: [P.bhx, P.bhy] }); hand(R, a, bgOf(), 1, P.bg); }
    legs(R);
    parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    parts.run(E, R, R.yS - 1, R.hx - 3, R.hx + 1, M.skin, 0);                                        // 粗脖子
    singlet(R);
    if (P.tw === 0 && !R.lie) towelBack(R);
    if (P.bm === 1) { const a = foldForearm(R); hand(R, a, bgOf(), 1, P.bg); }
    headDraw(R);
    if (P.cg <= 1 && !R.lie) { const c = cigarRoot(R); cigar(R, c[0], c[1], c[2]); }
    if (!R.lie) whistle(R);
    const a = frontArm(R);
    if (P.tw === 0 && !R.lie) towelFront(R);
    hand(R, a, P.fg, 0, 0);
    // 不跟身体走的东西：盖在脸上的毛巾（躺着的脸上）、飞在空中 / 掉在地上的雪茄、飞在空中的毛巾
    if (P.tw === 2) { const f = parts.toSprite(R, R.hx1, R.ey + 1); towelStamp(f[0], f[1] - 1, 4); }
    if (P.cg === 2) { const r = freeRoot(); cigar(FREE, r[0] - P.bx, r[1] + P.lift, P.cgD); }
    if (P.tw === 1) towelStamp(P.twX - P.bx, P.twY + P.lift, P.twF);
  }
  // 后手手势：bg 0 拳 · 1–3 竖几根手指 · 4 张开手掌（鼓掌）· 5 举拳 · 6 张开乱挥
  function bgOf() { const b = P.bg; return b >= 1 && b <= 3 ? 6 : b === 4 ? 1 : b === 6 ? 4 : 0; }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 空中的毛巾 / 雪茄：抛物线（t 秒；从 (x0, y0) 到 (x1, y1)，T 秒落地，最高 H 格）─────
  const arcY = (t, T, y0, y1, H) => { const q = clamp01(t / T); return y0 + (y1 - y0) * q - 4 * H * q * (1 - q); };
  const TOWEL_HOME = [-3, -26], TOWEL_UP = [-9, -29], CIG_UP = [6, -30], CIG_HOME = [6, -28];
  // 躺着时脸在精灵里的位置（毛巾要盖上去）：用一个假姿势算一次
  const FACE_LIE = (() => { const R = parts.rig({ lying: 1 }, BODY); return parts.toSprite(R, R.hx1, R.ey + 1); })();

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12, fr = f12of(t);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.mouth = 0; P.fg = 0; P.bg = 0; P.bm = 1; P.cg = 0; P.cgX = 0; P.cgY = 0; P.cgD = 3; P.tw = 0; P.twX = 0; P.twY = 0; P.twF = 0; P.wh = 0;
    P.dq = 0; P.bob = 0; P.hdy = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= T_PUFF - 1e-6 && lp < T_RING1 - 1e-6) { P.gem = lp < T_PUFF + 1 / 12 - 1e-6 ? 1 : 2; P.rim = P.gem; P.bob = 0; P.head = -1; P.eyes = lp >= T_PUFF + 2 / 12 - 1e-6 ? 1 : 0; }   // 吸一口：仰一点头、眯眼，火点变亮
      else if (lp >= T_RING1 - 1e-6 && lp < T_RING1 + 4 / 12 - 1e-6) { P.mouth = 1; P.gem = lp < T_RING1 + 2 / 12 ? 1 : 0; }                                                  // 吐烟圈
      else if (lp >= T_NECK - 1e-6 && lp < T_NECK + 6 / 12 - 1e-6) { const i = Math.min(5, f12of(lp - T_NECK)); P.head = NECK[i][0]; P.hdy = NECK[i][1]; P.eyes = i === 3 || i === 4 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 晃肩重步：接触帧下沉 1 格、上身前送 1 格；两臂在身侧反向摆
      setK(K_WALK); const f = E.gait(tq); parts.gait(P, f); P.bm = 0; P.lean = WALK_LEAN[f];
      P.hx = K_WALK.hx + P.step * 3; P.hy = K_WALK.hy - (P.step > 0 ? 1 : 0); P.bhx = K_WALK.bhx - P.step * 3; P.bhy = K_WALK.bhy - (P.step < 0 ? 1 : 0);
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                           // 挥拳喊「上！」
      if (fr === 0) { setK(K_IDLE, K_WIND, 0.5); P.mouth = 4; }
      else if (fr === 1) { setK(K_WIND); P.mouth = 4; P.eyes = 1; P.beard = 1; }
      else if (fr === 2) { setK(K_PUMP); P.bx = 1; P.mouth = 2; P.beard = -2; P.sway = -1; P.gem = 1; P.rim = 1; }
      else if (fr < 5) { setK(K_PUMP2); P.bx = 1; P.mouth = 2; P.beard = -1; P.gem = 1; }
      else { const q = clamp01((tq - 5 / 12) / 0.33); setK(K_PUMP2, K_IDLE, ease.inOut(q)); P.bx = q < 0.5 ? 1 : 0; P.mouth = q < 0.3 ? 2 : 0; P.beard = q < 0.5 ? -1 : 0; }
    } else if (st === CHARGE) {                                           // 举手数 3、2、1，哨子送到嘴边，吸气鼓腮
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_CHG, q);
      if (fr >= 2) P.bm = 0; else setK(K_IDLE, K_CHG, q * 0.6);
      P.bg = tq < T_TICK[0] - 1e-6 ? 0 : tq < T_TICK[1] - 1e-6 ? 3 : tq < T_TICK[2] - 1e-6 ? 2 : 1;
      if (tq >= 0.25 - 1e-6) { P.wh = 1; P.fg = 3; P.mouth = 3; P.cg = 1; }
      if (tq >= 0.5 - 1e-6) P.bob = -1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      P.beard = q > 0.9 && (f12 & 1) ? -1 : 0; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
    } else if (st === CAST || st === RECOVER) {
      const ft = (st === CAST ? 0 : DUR[CAST]) + tq;                        // 抛起之后的时间（施放 + 收招连起来算）
      // 毛巾：0.667 秒落回肩上；雪茄：0.583 秒落回嘴里
      const TT_TW = 0.66, TT_CG = 0.5833;
      if (ft < TT_TW - 1e-6) { P.tw = 1; P.twX = RD(TOWEL_UP[0] + (TOWEL_HOME[0] - TOWEL_UP[0]) * ft / TT_TW - 3 * Math.sin(Math.PI * ft / TT_TW)); P.twY = RD(arcY(ft, TT_TW, TOWEL_UP[1], TOWEL_HOME[1], 20)); P.twF = [2, 1, 3, 0][f12of(ft) & 3]; }
      if (ft < TT_CG - 1e-6) { P.cg = 2; P.cgX = RD(CIG_UP[0] + 5 * Math.sin(Math.PI * ft / TT_CG)); P.cgY = RD(arcY(ft, TT_CG, CIG_UP[1], CIG_HOME[1], 16)); P.cgD = (2 + 3 * f12of(ft)) & 15; }
      if (st === CAST) {                                                  // 吹哨：后仰、踮脚、后手握拳上举、闭眼使劲
        setK(K_CHG, K_BLAST, fr ? 1 : 0.5); P.bm = 0; P.bg = 5; P.fg = 3; P.wh = 1; P.mouth = 3; P.eyes = 1; P.bob = -1; P.lift = fr < 3 ? 1 : 0;
        P.gem = 3; P.rim = 0; P.beard = -2; P.sway = -1;
      } else {                                                            // 收招：雪茄落回嘴、毛巾落回肩、鼓掌两下、竖大拇指
        P.gem = fr < 2 ? 2 : fr < 5 ? 1 : 0; P.rim = fr < 1 ? 0 : 1;
        if (fr === 0) { setK(K_BLAST, K_CLAPA, 0.5); P.bm = 0; P.bg = 4; P.fg = 1; P.mouth = 4; }
        else if (fr === 1 || fr === 3) { setK(K_CLAPA); P.fg = 1; P.bg = 4; P.mouth = 4; }
        else if (fr === 2 || fr === 4) { setK(K_CLAP); P.fg = 1; P.bg = 4; P.mouth = 4; P.eyes = 1; }
        else { setK(K_THUMB); P.fg = 2; P.bg = 0; P.mouth = 4; P.eyes = 1; }
        if (fr === 2) { P.beard = 2; P.sway = 1; } else if (fr === 3) { P.beard = -1; }
      }
    } else if (st === HURT) {                                             // 捂脸（差评级）
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_PALM); P.bx = -2; P.eyes = 1; P.hdy = 1; P.fg = 5; P.mouth = 4; P.cgD = 5; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_PALM, K_IDLE, 0.3); P.bx = -1; P.eyes = 1; P.hdy = 1; P.fg = 5; P.cgD = 5; P.beard = 1; P.rim = 0; }
      else setK(K_PALM, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 直挺挺后仰倒；雪茄飞走落地、毛巾盖脸
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else {
        // 雪茄：从嘴里飞出去，0.47 秒落在前面地上；火点闪到 1.3 秒熄灭
        P.cg = 2;
        if (d < D_CIG - 1e-6) { P.cgX = RD(CIG_HOME[0] + (24 - CIG_HOME[0]) * d / D_CIG); P.cgY = RD(arcY(d, D_CIG, CIG_HOME[1], 0, 14)); P.cgD = (5 + 3 * f12of(d)) & 15; P.gem = 3; }
        else { P.cgX = 24; P.cgY = 0; P.cgD = 4; P.gem = d < 1.3 ? ((f12 % 3) === 0 ? 1 : 0) : 4; }
        // 毛巾：从肩上飞起，0.9 秒落在脸上
        if (d < D_TOWEL - 1e-6) { P.tw = 1; const q = d / D_TOWEL; P.twX = RD(TOWEL_HOME[0] - 2 + (FACE_LIE[0] - 4 - TOWEL_HOME[0] + 2) * q); P.twY = RD(arcY(d, D_TOWEL, TOWEL_HOME[1], FACE_LIE[1] - 1, 18)); P.twF = [2, 1, 3, 0][f12of(d) & 3]; }
        else P.tw = 2;
        if (d < 0.3) { const k = f12of(d) & 1; setK(k ? K_FLAIL2 : K_FLAIL1); P.bm = 0; P.fg = 4; P.bg = 6; P.bx = d < 0.15 ? -2 : -3; P.eyes = 1; P.mouth = 2; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; }
        else if (d < 0.5) { setK(K_FLAIL2); P.bm = 0; P.fg = 4; P.bg = 6; P.bx = -4; P.lean = -1; P.crouch = 2; P.eyes = 1; P.mouth = 2; P.beard = 2; }
        else {
          setK(d < 1.25 ? K_LIE : K_LIE2); P.bm = 0; P.bg = 0; P.fg = d < 1.25 ? 4 : 1; P.lying = 1; P.bx = -4; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < D_LAND ? 1 : 0;
          if (d >= 1.0 && d < 1.25 && (f12 & 1)) P.hy += 1;                   // 举着的手抖两下
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48);
    // 挂点：火点（发光体 / 轮廓光光源）、嘴、哨口、前拳、后手指尖
    const R = rigOf(), off = (p) => [p[0] + P.bx, p[1] - P.lift];
    let g;
    if (P.cg === 2) { const r = freeRoot(); g = cellOf(P.cgD, r[0], r[1], 4); }
    else { const c = cigarRoot(R), e = cellOf(c[2], c[0], c[1], 4); g = off(parts.toSprite(R, e[0], e[1])); }
    P.gx = g[0]; P.gy = g[1];
    const m = off(parts.toSprite(R, R.hx1 + 1, R.my)); P.mX = m[0]; P.mY = m[1];
    const w = off(parts.toSprite(R, R.hx1 + 4, R.my - 1)); P.wX = w[0]; P.wY = w[1];
    const fp = off(parts.toSprite(R, P.hx + 1, P.hy - 1)); P.fX = fp[0]; P.fY = fp[1];
    const tp = off(parts.toSprite(R, P.bhx, P.bhy - 4)); P.tX = tp[0]; P.tY = tp[1];
    KEY(P);
  }

  // ───── 特效 ─────
  // 烟圈池（预分配）：年龄、位置、起始半径；从嘴里吐出来，边往上飘边变大、按 dust 色阶走完、后半段断续
  const SRN = 6, srT = new Float32Array(SRN).fill(9), srX = new Float32Array(SRN), srY = new Float32Array(SRN), srR = new Float32Array(SRN), SR_LIFE = 1.3;
  function smokeRing(x, y, r0) { let o = 0; for (let k = 0; k < SRN; k++) if (srT[k] > srT[o]) o = k; srT[o] = 0; srX[o] = x; srY[o] = y; srR[o] = r0; }
  // 哨音声波弧池：从哨口往右扩的「)」弧，±55°
  const ARN = 4, arT = new Float32Array(ARN).fill(9), arX = new Float32Array(ARN), arY = new Float32Array(ARN), AR_LIFE = 0.42, AR_V = 150;
  function soundArc(x, y) { let o = 0; for (let k = 0; k < ARN; k++) if (arT[k] > arT[o]) o = k; arT[o] = 0; arX[o] = x; arY[o] = y; }
  let tickT = 9, tickX = 0, tickY = 0, wispAcc = 0, chargeAcc = 0, soulAcc = 0, trailAcc = 0, lastStep = 0;
  const W = (p) => scrX(p), Hy = (p) => HY + p;

  function onEnter(s) {
    if (s === CAST) {                                                    // 吹哨：第一道声波 + 冲击环 + 外爆 + 十字星芒 + 震屏 + 闪白；雪茄被震出嘴
      const x = W(P.wX), y = Hy(P.wY);
      soundArc(x, y); ring(x, y, 1, R_EL); burst(x, y, 20, 50, 130, 0.25, 0.6, R_EL, 8); fx.cross(x + 1, y, 6, 'steel', 0.25, 2);
      burst(W(P.gx), Hy(P.gy), 6, 20, 60, 0.2, 0.4, FIRE, 20);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === IDLE && (t === T_RING1 || t === T_RING2)) smokeRing(W(P.mX) + 1, Hy(P.mY), t === T_RING1 ? 1 : 1.6);
    if (s === IDLE && t === T_CRACK) { const x = W(-1), y = Hy(-25); for (let i = 0; i < 2; i++) spawn(K_EMBER, x + i, y, (i ? 12 : -12), -18, 0.18, FXI.impact); }
    if (s === ATTACK && t === T_STRIKE) {                                // 出手：挥拳拖影 + 拳前十字星 + 汗珠 + 喊出「)))」
      const sx = W(4), sy = Hy(-22);
      fx.slash(sx, sy, 11, 3.55, 0.8, R_EL, 0.17, 2, 2);
      fx.cross(W(P.fX) + 1, Hy(P.fY) - 1, 3, 'steel', 0.15, 2);
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, W(-2 + Math.random() * 4), Hy(-32 + Math.random() * 3), -25 - Math.random() * 45, -45 - Math.random() * 40, 0.6 + Math.random() * 0.3, SWEAT, { g: 260, floor: HY });
      shoot(1, W(P.mX) + 3, Hy(P.mY), 150, DUMMY_X - 5, R_EL, 0, { trail: false, glow: -1 });
      sfx('swing', { kind: 'smash', w: 0.8 });
    }
    if (s === CHARGE && T_TICK.includes(t)) {                            // 手指变一次：指尖一个小十字星 + 几颗火花
      tickT = 0; tickX = W(P.tX); tickY = Hy(P.tY); fx.cross(tickX, tickY, 3, 'steel', 0.15, 2); burst(tickX, tickY, 4, 20, 45, 0.12, 0.25, R_EL, 6);
    }
    if (s === CAST && (t === T_ARC2 || t === T_ARC3)) soundArc(W(P.wX), Hy(P.wY));
    if (s === CAST && t === T_HIT) {                                     // 声波撞上假人：外爆 + 大摇 + 头顶转星（被哨声震晕）
      burst(DUMMY_X - 4, HY - 22, 18, 40, 120, 0.25, 0.55, R_EL, 10); hitDummy(1); dummyFx({ dur: 1.1, stun: 1 }); shake(0.12, 1);
      sfx('impact', { pal: 'metal', w: 0.8 });
    }
    if (s === RECOVER && t === T_CATCH) burst(W(P.gx), Hy(P.gy), 4, 15, 40, 0.15, 0.3, FIRE, 10);   // 雪茄落回嘴里
    if (s === RECOVER && (t === T_CLAP1 || t === T_CLAP2)) {             // 鼓掌：掌心相碰
      const x = W(P.fX) - 1, y = Hy(P.fY) - 1; burst(x, y, 5, 20, 50, 0.1, 0.22, FXI.impact, 6); sfx('hit', { mat: 'flesh', w: 0.5 });
      if (t === T_CLAP1) for (let i = 0; i < 3; i++) spawn(K_DUST, W(-4 + Math.random() * 6), Hy(-25), (Math.random() - 0.5) * 16, -6 - Math.random() * 6, 0.3, SMOKE);   // 毛巾落回肩上拍起的灰
    }
    if (s === RECOVER && t === T_THUMB) fx.cross(W(P.fX) - 1, Hy(P.fY) - 3, 3, 'steel', 0.2, 2);      // 拇指尖一闪
    if (s === DEATH && t === INCOMING + D_CIG) { burst(W(24), HY - 1, 5, 15, 40, 0.15, 0.3, FIRE, 12); for (let i = 0; i < 2; i++) spawn(K_DUST, W(24 + i * 2), HY - 1, (Math.random() - 0.5) * 14, -5, 0.3, FXI.dust); }
    if (s === DEATH && t === INCOMING + D_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, W(-28 + Math.random() * 34), HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.9 });
    }
    if (s === DEATH && t === INCOMING + D_TOWEL) for (let i = 0; i < 4; i++) spawn(K_DUST, W(FACE_LIE[0] - 4 + Math.random() * 8), Hy(FACE_LIE[1] - 2), (Math.random() - 0.5) * 16, -6 - Math.random() * 6, 0.35, FXI.dust);
  }
  const EVENTS = [[T_RING1, T_RING2, T_CRACK], [], [T_STRIKE], T_TICK, [T_ARC2, T_ARC3, T_HIT], [T_CATCH, T_CLAP1, T_CLAP2, T_THUMB], [], [INCOMING + D_CIG, INCOMING + D_LAND, INCOMING + D_TOWEL], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 70, 0.15, 0.35, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.4 }); }
  }
  function stepFX(dt, state, stT) {
    const gx = W(P.gx), gy = Hy(P.gy);
    if (state === IDLE || state === HURT || (state === ATTACK && stT > 0.4) || state === MOVE) {   // 火点冒一缕烟
      wispAcc += dt * (state === MOVE ? 4 : 2.6); while (wispAcc >= 1) { wispAcc -= 1; spawnX(K_RISE, gx, gy - 1, (Math.random() - 0.3) * 4, -9 - Math.random() * 5, 0.9 + Math.random() * 0.5, SMOKE, { age0: 0.15 }); }
    }
    if (state === MOVE && P.step !== lastStep) {                          // 重步：每次落脚 3 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.8 }); const fx0 = P.step > 0 ? 6 : -4; for (let i = 0; i < 3; i++) spawn(K_DUST, W(fx0 + (Math.random() - 0.5) * 4), HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === CHARGE && stT > 0.3) {                                  // 吸气：四周的 steel 小点被吸进哨口
      chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE]));
      const tx = W(P.wX), ty = Hy(P.wY);
      while (chargeAcc >= 1) { chargeAcc -= 1; spawnX(K_SPIRAL_PT, tx, ty, 0, 0, 9, R_EL, { a: Math.random() * 6.28, r: 10 + Math.random() * 8, w: 4, tx, ty }); }
    }
    if ((state === CAST || state === RECOVER) && P.cg === 2) { trailAcc += dt * 30; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_EMBER, gx, gy, (Math.random() - 0.5) * 10, 4 + Math.random() * 6, 0.25, FIRE); } }
    if (state === DEATH && stT > INCOMING + D_CIG && stT < INCOMING + 1.5) { wispAcc += dt * 5; while (wispAcc >= 1) { wispAcc -= 1; spawnX(K_RISE, gx, gy - 1, (Math.random() - 0.5) * 3, -8 - Math.random() * 4, 0.8, SMOKE, { age0: 0.1 }); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 26 + Math.random() * 32, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let k = 0; k < SRN; k++) if (srT[k] < SR_LIFE) { srT[k] += dt; srY[k] -= (8 + srT[k] * 4) * dt; srX[k] += 5 * dt; }
    for (let k = 0; k < ARN; k++) if (arT[k] < AR_LIFE) arT[k] += dt;
    tickT += dt;
  }
  function fxReset() { srT.fill(9); arT.fill(9); tickT = 9; wispAcc = 0; chargeAcc = 0; soulAcc = 0; trailAcc = 0; lastStep = 0; }
  function fxFront(f12) {
    for (let k = 0; k < SRN; k++) {                                       // 烟圈：扁椭圆，边飘边变大，dust 色阶走完，后半段断续
      const t = srT[k]; if (t >= SR_LIFE) continue; const q = t / SR_LIFE, rx = srR[k] + t * 2.2, ry = Math.max(0.6, rx * 0.55), n = Math.max(4, Math.ceil(rx * 6));
      const c = SM[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4];
      for (let i = 0; i < n; i++) { if (q > 0.5 && ((i + f12) & 1)) continue; const a = i / n * 6.2832 + Math.sin(t * 3) * 0.3; put(RD(srX[k] + Math.cos(a) * rx), RD(srY[k] + Math.sin(a) * ry), c); }
    }
    for (let k = 0; k < ARN; k++) {                                       // 哨音声波弧
      const t = arT[k]; if (t >= AR_LIFE) continue; const q = t / AR_LIFE, r = 3 + t * AR_V, n = Math.ceil(r * 2.2);
      const c = q < 0.12 ? EL[0] : q < 0.3 ? EL[1] : q < 0.6 ? EL[2] : EL[3];
      for (let i = 0; i <= n; i++) { if (q > 0.45 && ((i + f12) & 1)) continue; const a = -0.95 + 1.9 * i / n; put(RD(arX[k] + Math.cos(a) * r), RD(arY[k] + Math.sin(a) * r * 0.9), c); if (q < 0.3) put(RD(arX[k] + Math.cos(a) * (r - 1)), RD(arY[k] + Math.sin(a) * (r - 1) * 0.9), EL[Math.min(4, 2 + (q > 0.15 ? 1 : 0))]); }
    }
  }
  // 喊出的「)))」：三道小声波弧，前亮后暗
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 1) return false;
    for (let j = 0; j < 3; j++) { const r = 2 + j, cx = x - 3 - j * 2 * d, c = Rr[Math.min(4, j + ((f12 & 1) ? 1 : 0))]; for (let i = -2; i <= 2; i++) { const a = i * 0.45; put(RD(cx + d * Math.cos(a) * r), RD(y + Math.sin(a) * r), c); } }
    return true;
  }

  const SHEET = [[IDLE, [0, 0.4, 0.75, 0.9167, 1.0, 1.1667, 2.0, 2.1667, 2.25, 2.3333]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, null], [HURT, 'hurt'],
    [DEATH, [0.34, 0.42, 0.6, 0.72, 0.8, 0.9, 1.0, 1.25, 1.5, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]];

  return {
    name: '拳馆教练', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.ember], HIT_POINT: [1, -18], EVENTS, SHEET,
    REVIVE: { dy: -16 },
    SFX: { body: 'flesh', how: 'topple', pal: 'metal', style: 'buff', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxFront, drawShot,
  };
});
