// 暗夜射手（部队 · 人类 · 射手 · 传说）：精英猎手升级后的同一个人换了夜装——同一顶尖角兜帽（加长、压暗成墨绿，尖端垂到肩胛）、绿羽弩矢、瘦长身形；
// 长弓换成月牙重连弩（银月牙弩臂 + 竖箭匣 + 侧摇柄），加及小腿的开衩长风衣、银面罩和一双月白冷光的眼。站得笔直、冷静（猎手是前倾猫腰）。
// 攻击 = 肩抵连弩四连射；技能 = 特性「超速射击」：快到出残影——身后叠出三层月白残影，本体和残影交替开火，一口气射完五发（描述：能射出五发箭矢）。
PCD.define('NightArcher', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, fxRamp, FXI, FXR, PAL, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, blitShape, copySprite, death, sfx } = E;
  const RD = Math.round, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：迅捷 · 月华（白 → 月光奶白 → 苍蓝灰 → 夜靛 → 深夜蓝；最暗两级融进夜空）─────
  const R_EL = fxRamp('moonlight', [21, 5, 60, 4, 3]), EL = FXR[R_EL];

  // ───── 材质（全部取自共享色板；墨绿 = 精英猎手的林绿压暗一档）─────
  const M = parts.mats(E, {
    coat: { r: 'moss', band: 2 }, hood: 'moss', sleeve: 'moss', strap: 'boot', glove: 'boot', pants: 'stone', boot: 'boot',
    silver: 'steel', wood: 'wood', cord: [8, 18, 17, 21], bone: 'bone', skin: 'skin', fletch: [35, 37, 38, 21],
    moon: { r: [4, 60, 5, 21], flat: 1 },                          // 月白发光体：1 熄灭（夜靛）· 2 暗 · 3 月光 · 4 白
  });
  const BODY = { body: 'slim', leg: 11, torso: 11, neck: 1, head: 6, headW: 5, sw: 3, lw: 2, stride: 5, arm: 10, lift: 2, fall: 'front' };
  const BODY_BRACE = Object.assign({}, BODY, { stride: 3 });      // 技能的扎稳步（前脚前、后脚后各 3 格，膝微屈）
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 58, 40, 52), ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy), wghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy), loot = new Sprite(40, 16, 8, 14);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'cord', 'skin', 'moon', 'strap', 'glove', 'bone', 'fletch', 'silver']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const LOOT_BAKE = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };

  // ───── 姿势：前手托弩的前握把（hx hy），后手在扳机 / 摇柄上（由弩的几何算出）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, tipLv: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, crank: 0, mag: 0, fired: 0, onCrank: 0, xbOff: 0, xbX: 0, xbY: 0, xbFlat: 0, noXb: 0, noMask: 0,
    dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, lean, head, crouch) => ({ hx, hy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -18);                                     // 横端连弩：枪托抵在前肩，弩身在肩高
  const K_AIM = K(10, -20);                                     // 举到眼前瞄准
  const K_SHOULDER = K(8, -21, -1, -1, 1);                      // 技能蓄力：扎稳步、侧身把连弩架到肩上，低头看飞转的摇柄
  const K_SKAIM = K(10, -21, 0, 0, 1);                          // 技能施放：扎稳步平端瞄准（攻击是直立端射）
  const K_HURT = K(7, -17, -1, -1);
  const K_STAG = K(7, -16, -1, -1, 1);
  const K_KNEEL = K(6, -12, 1, -1, 4);                          // 单膝跪下，空手撑在膝上
  const FIELDS = ['hx', 'hy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 31], ['hy', -40, 4], ['bhx', -20, 31], ['bhy', -40, 4], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['tipLv', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['crank', 0, 3], ['mag', -1, 1], ['fired', 0, 1], ['onCrank', 0, 1], ['xbOff', 0, 1], ['xbX', -20, 40], ['xbY', -40, 2], ['xbFlat', 0, 1],
    ['noXb', 0, 1], ['noMask', 0, 1], ['dqi', 0, 48], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const DROP = (cr) => (cr >= 4 ? 5 : Math.min(3, cr));
  const T_SHOTS = [2 / 12, 3 / 12, 4 / 12, 5 / 12];              // 攻击：四连射
  const SK_SHOTS = [[CAST, 0, 0], [CAST, 2 / 12, 1], [CAST, 4 / 12, 0], [RECOVER, 0, 2], [RECOVER, 2 / 12, 0]];   // 技能五连发：[状态, 时刻, 谁开火（0 本体 · 1/2 第几层残影）]
  const T_GHOST = 0.75, T_MELT = INCOMING + 0.66;
  const CRANK = [[0, -2], [2, 0], [0, 2], [-2, 0]];              // 摇柄 4 个角度（相对转轴）

  // 弩的几何（相对前握把 gx gy）：导轨行 yr = gy - 2；弩臂中心 x0 = gx + 5；弩口 = (x0 + 4, yr)
  const XB = (gx, gy) => ({ yr: gy - 3, x0: gx + 5, mx: gx + 9, pivot: [gx - 6, gy - 3] });
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.tipLv = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.crank = 0; P.mag = 0; P.fired = 0; P.onCrank = 0; P.xbOff = 0; P.xbX = 0; P.xbY = 0; P.xbFlat = 0; P.noXb = 0; P.noMask = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                 // 待机个性「上弦」：1.2–1.87 s 摇柄转两圈（每帧一格），箭匣下沉一格；1.87–2.1 s 眼光一闪、偏头看目标
      if (lp >= 1.2 - 1e-6 && lp < 1.87 - 1e-6) { const f = Math.floor((lp - 1.2) * 12 + 1e-6); P.crank = f & 3; P.onCrank = 1; P.mag = f >= 6 ? 1 : 0; P.head = -1; }
      else if (lp >= 1.87 - 1e-6 && lp < 2.1 - 1e-6) { P.head = 1; P.gem = 1; P.glint = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 长步疾行：步幅 5，身体几乎不起伏，风衣后摆向后扬
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bob = 0; P.bend = 2; P.beard = P.beard - 1;
      const w = walkDemo(tq, 16, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const f = Math.floor(tq * 12 + 1e-6);
      if (f === 0) setK(K_IDLE, K_AIM, 0.5);
      else if (f === 1) { setK(K_AIM, K_AIM, 0); P.hy += 1; P.crank = 2; P.gem = 1; }   // 预兆：摇柄一压、身体微沉
      else if (f <= 5) { setK(K_AIM, K_AIM, 0); const odd = f & 1; P.bx = odd ? 0 : -1; P.mag = odd ? 0 : -1; P.fired = odd ? 0 : 1; P.crank = f & 3; P.gem = 2; P.tipLv = odd ? 1 : 3; P.beard = -1; P.bend = 2; }
      else if (f === 6) { setK(K_AIM, K_AIM, 0); P.crank = 3; P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - 7 / 12) / 0.17)); setK(K_AIM, K_IDLE, q); }
    } else if (st === CHARGE) {                                      // 架上肩、摇柄越转越快、箭匣连跳装满、眼光 1 → 2
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_SHOULDER, q); P.step = q >= 0.5 ? 1 : 0;
      P.crank = tq < 0.7 ? (Math.floor(f12 / 2) & 3) : (f12 & 3); P.onCrank = 1;
      P.mag = tq > 0.3 && tq < 1.1 ? (((f12 >> 1) & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.tipLv = P.gem; P.rim = tq < 0.5 ? 0 : tq < 1.0 ? 1 : 2; P.bend = tq < 0.5 ? 1 : 2; P.beard = tq < 0.5 ? 0 : ((f12 & 1) ? -2 : -1); P.sway = tq < 0.5 ? 0 : -1;
    } else if (st === CAST || (st === RECOVER && tq < 3 / 12)) {     // 五连发（本体开的那几发后坐 1 格）
      setK(K_SKAIM, K_SKAIM, 0); P.step = 1; P.gem = 3; P.tipLv = 3; P.rim = 2; P.bend = 3; P.beard = -2; P.sway = -1; P.crank = f12 & 3;
      for (const s of SK_SHOTS) if (s[0] === st && s[2] === 0 && tq >= s[1] - 1e-6 && tq < s[1] + 1 / 12 - 1e-6) { P.bx = -1; P.mag = -1; P.fired = 1; }
      if (st === RECOVER) { P.rim = 1; P.gem = 2; }
    } else if (st === RECOVER) {                                     // 放下连弩，摇柄凭惯性再转半圈
      const q = ease.inOut(clamp01((tq - 0.25) / 0.4)); setK(K_SKAIM, K_IDLE, q); P.step = q < 0.5 ? 1 : 0; P.crank = tq < 0.45 ? (3 + Math.floor((tq - 0.25) / (1 / 12) + 1e-6)) & 3 : 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.tipLv = P.gem; P.bend = RD(3 - 2 * q); P.beard = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.bend = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 融影：踉跄 → 单膝跪下、连弩脱手落地 → 按列塌成一滩影子（死亡套件 melt）
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.15) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 0; P.flash = d < 1 / 12 ? 1 : 0; P.gem = 4; }
      else {
        if (d < 0.3) { setK(K_STAG, K_STAG, 0); P.bx = -3; } else { setK(K_KNEEL, K_KNEEL, 0); P.bx = -3; P.beard = 1; }
        P.eyes = 1; P.bend = 0; P.gem = 4; P.xbOff = 1;
        const bt = clamp01((d - 0.15) / 0.15);                     // 连弩脱手：落到身前地上
        if (d < 0.3) { P.xbX = RD(9 + 4 * bt - P.bx); P.xbY = RD(-19 + 17 * bt * bt); P.tipLv = 2; }
        else { P.xbX = 13 - P.bx; P.xbY = -1; P.xbFlat = 1; P.tipLv = d < 0.42 ? ((f12 & 1) ? 3 : 4) : d < 0.55 ? (f12 % 3 === 0 ? 2 : 4) : 4; }   // 月牙尖闪两下熄灭
        if (d >= 0.66 - 1e-6) P.dq = 1;                            // 之后由死亡套件画（快照在 onTime 里拍）
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const drop = P.bob + DROP(RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + drop; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const G = XB(P.hx, P.hy);
    if (P.xbOff) { P.bhx = RD(P.hx - 7); P.bhy = P.hy + 1; }
    else if (P.onCrank) { const c = CRANK[P.crank]; P.bhx = G.pivot[0] + c[0]; P.bhy = G.pivot[1] + c[1]; }
    else { P.bhx = P.hx - 5; P.bhy = P.hy - 1; }
    if (P.xbOff) { P.gx = P.xbX + 5 + P.bx; P.gy = P.xbY - 1; } else { P.gx = G.mx + P.bx; P.gy = G.yr; }
    P.dqi = RD(P.dq * 48);
    KEY(P);
  }

  // ───── 画 ─────
  const GLOW = [[3, 2], [4, 2], [4, 3], [4, 4], [1, 1]];          // 发光档 → [亮点, 旁边一格] 的色调（月白材质）
  // 候选部件：repeater 月牙重连弩（横端）：深木弩身（导轨、枪托、前握把、扳机、银箍、银鼻）+ 银色月牙弩臂（上下各 6 格：背面外弧、正面内弧，中段 3 格厚往两端收成尖，
  //   两只尖向前弯出 4–5 格，尖端 2 格是发光体）+ 白弦（上弦时拉到机括，发射那一帧弹直、把月牙口封成 D 形）+ 弩身顶上竖插的 3×5 方箭匣（银包角，侧面露出三截弩矢，顶上一撮绿羽）
  //   + 侧摇柄（转轴在枪托上沿，4 个角度）+ 上弦的弩矢（绿羽、骨白杆、箭头嵌在月牙口里发光）。
  // o = { T 落笔变换, at: [gx, gy] 前握把（手握的位置，弩身在它上面 2–3 行）, crank 0–3, mag -1..1（箭匣上跳 / 下沉）, fired 弦弹直, lv 发光档, flat 1 = 掉在地上（弩臂侧躺只露 2 格，没有箭匣和摇柄）}
  // 部件：弦 → 弩身（+ 弩矢，同一部件）→ 月牙弩臂 → 箭匣 → 摇柄。返回 { tipA, tipB, muzzle }
  function repeater(o) {
    const T = o.T, gx = o.at[0], gy = o.at[1], yr = gy - 3, x0 = gx + 5, flat = o.flat, H = flat ? 2 : 6, lv = GLOW[o.lv || 0], px = (x, y, m, t) => parts.px(E, T, x, y, m, t);
    const q2 = (v) => (v / H) * (v / H), xo = (v) => RD(x0 - 1 + (flat ? 3 : 6) * q2(v)), xi = (v) => RD(x0 + 1 + (flat ? 2 : 3.8) * q2(v));
    const tipA = [xo(-H), yr - H], tipB = [xo(H), yr + H], nut = [gx, yr];
    E.part();                                                    // 弦
    if (!flat) {
      if (o.fired) parts.line(E, T, tipA[0] - 1, tipA[1] + 1, tipB[0] - 1, tipB[1] - 1, M.cord, 2);
      else { parts.line(E, T, tipA[0] - 1, tipA[1] + 1, nut[0], nut[1], M.cord, 2); parts.line(E, T, nut[0], nut[1], tipB[0] - 1, tipB[1] - 1, M.cord, 2); }
    }
    E.part();                                                    // 弩身：导轨 + 下沿、枪托加厚、前握把、扳机、银箍、银鼻；上弦的弩矢躺在导轨上（同一部件，不压分界线）
    for (let x = gx - 8; x <= gx + 3; x++) { px(x, yr, M.wood, x < gx - 5 ? 4 : 0); px(x, yr + 1, M.wood, 0); }
    for (let x = gx - 9; x <= gx - 6; x++) px(x, yr + 2, M.wood, 2); px(gx - 9, yr + 1, M.wood, 3); px(gx - 9, yr, M.wood, 4);
    if (!flat) { px(gx - 1, yr + 2, M.wood, 3); px(gx, yr + 2, M.wood, 2); px(gx, yr + 3, M.wood, 2); px(gx - 5, yr + 2, M.silver, 3); }
    for (const bx of [gx - 6, gx + 2]) { px(bx, yr, M.silver, 4); px(bx, yr + 1, M.silver, 2); }
    px(gx + 4, yr, M.silver, 4); px(gx + 4, yr + 1, M.silver, 3);
    if (!flat && !o.fired) for (let x = gx - 1; x <= x0 + 3; x++) px(x, yr - 1, x <= gx ? M.fletch : x >= x0 + 2 ? M.moon : M.bone, x === gx - 1 ? 3 : x === gx ? 2 : x === x0 + 3 ? lv[0] : x === x0 + 2 ? lv[1] : 4);
    E.part();                                                    // 月牙弩臂：背面外弧 xo、正面内弧 xi 之间填满，两端收成尖
    for (let v = -H; v <= H; v++) {
      const a = xo(v), b = Math.abs(v) >= H ? a : Math.max(a, xi(v)), tip = Math.abs(v) >= H - 1;
      for (let x = a; x <= b; x++) px(x, yr + v, tip ? M.moon : M.silver, tip ? (Math.abs(v) === H ? lv[0] : lv[1]) : (x === a && v < 0 ? 4 : 0));
    }
    if (!flat) {
      E.part();                                                  // 箭匣
      const m0 = yr - 5 - (o.mag || 0);
      for (let y = m0; y <= yr - 1; y++) for (let x = gx - 4; x <= gx - 2; x++) { const corner = (y === m0 || y === yr - 1) && x !== gx - 3; px(x, y, corner ? M.silver : M.strap, corner ? (y === m0 ? 4 : 2) : x === gx - 4 ? 3 : 0); }
      for (let y = m0 + 1; y <= yr - 2; y++) if (((y - m0) & 1)) px(gx - 3, y, M.bone, 3);   // 侧面露出的三截弩矢
      px(gx - 4, m0 - 1, M.fletch, 3); px(gx - 2, m0 - 1, M.fletch, 2);                       // 顶上的绿羽
      E.part();                                                  // 摇柄：转轴（银）+ 曲柄 + 木握头
      const pv = [gx - 6, yr], c = CRANK[o.crank || 0];
      px(pv[0], pv[1], M.silver, 4); px(pv[0] + c[0] / 2, pv[1] + c[1] / 2, M.silver, 3); px(pv[0] + c[0], pv[1] + c[1], M.wood, 4);
    }
    return { tipA, tipB, muzzle: [x0 + 4, yr] };
  }
  // 候选部件：coatTails 开衩长风衣的两片后摆（从腰到下摆，最先画）：远片暗一级、更往后飘、下摆高 1 格，两片之间就是开衩；读 P.sway（摆）P.bend（向后扬 0–3）。o = { mat, matD, bot 下摆行, flare }
  function coatTails(R, o) {
    const sway = P.sway || 0, bend = P.bend || 0, top = R.yWaist;
    for (let j = 0; j < 2; j++) {
      E.part();
      const m = j ? o.mat : o.matD, bot = o.bot - (j ? 0 : 1) - (bend >= 2 ? bend - 1 : 0), n = Math.max(1, bot - top), fl = (o.flare || 2) + (j ? 0 : 1.2);
      let L = 0;
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / n, e = parts.edges(R, CL(y, R.yS, R.yHip));
        L = RD(e[0] + 1 - fl * t - bend * t * t * (j ? 1.5 : 2.4) + sway * t * t); parts.run(E, R, y, L, e[0] + 3, m, 0);
        if (j && t > 0.3 && y < bot) parts.px(E, R, L + 2, y, m, 2);
      }
      parts.px(E, R, L - 1, bot + (bend >= 2 ? -1 : 0), m, j ? 4 : 0);   // 燕尾尖
    }
  }
  // 候选部件：hoodPeak 兜帽尖角后垂（同 EliteHunter；这里加长：往后 2 格再垂下 hang 格，尖端到肩胛）。紧跟 parts.hood 后层调用（同一个部件）
  function hoodPeak(R, o) {
    const m = o.mat, x0 = R.hx0, top = R.htop, n = o.len || 3, b = CL(RD(P.beard || 0), -1, 1), flat = (P.bend || 0) >= 2;
    parts.px(E, R, x0 - 2, top - 1, m, 0); parts.px(E, R, x0 - 2, top, m, 0);
    let x = x0 - 2, y = top - 1;
    for (let k = 1; k <= n; k++) { x = x0 - 2 - k; y = top - 1 + (flat ? 0 : RD(k * (o.drop || 0.7))); parts.px(E, R, x, y, m, 0); parts.px(E, R, x, y + 1, m, 2); }
    for (let k = 1; k <= (o.hang || 0); k++) { const q = k / o.hang, xx = x + (flat ? -RD(k * 0.8) : RD(-b * q * q)), yy = y + 1 + (flat ? RD(k * 0.45) : k); parts.px(E, R, xx, yy, m, k === o.hang ? 4 : k & 1 ? 0 : 2); if (k < 3) parts.px(E, R, xx + 1, yy, m, 0); }
  }
  // 银面罩 + 月白眼光（和脸同一个部件：紧跟 parts.head 调用，不压分界线）
  function maskEyes(R) {
    const x0 = R.hx0, x1 = R.hx1, ey = R.ey, bot = R.hy, ex = x1 - 1, g = GLOW[P.gem];
    if (!P.noMask) {
      for (let y = ey + 1; y <= bot; y++) parts.run(E, R, y, x0 + 1, x1 + (y < bot ? 1 : 0), M.silver, 0);
      parts.run(E, R, ey + 2, x0 + 2, x1, M.silver, 2); parts.px(E, R, x1 + 1, ey + 1, M.silver, 4); parts.px(E, R, x1, bot, M.silver, 2);   // 面罩纹、鼻梁高光、下颌
    }
    if (P.eyes) { parts.px(E, R, ex, ey, M.skin, 1); parts.px(E, R, ex - 1, ey, M.skin, 1); }
    else { parts.px(E, R, ex, ey, M.moon, g[0]); parts.px(E, R, ex - 1, ey, M.moon, g[1]); parts.px(E, R, x1, ey, M.moon, 2); if (P.glint) parts.px(E, R, x1, ey, M.moon, 4); }
  }
  // 候选部件：thighQuiver 腿侧矢筒（绑在近侧大腿外侧，风衣外面）：2 格宽皮筒 + 银箍，插着 3 支绿羽弩矢
  function thighQuiver(R) {
    const x = R.hipFx + 1, y0 = R.yHip + 1;
    E.part();
    for (let y = y0; y <= y0 + 4; y++) { parts.px(E, R, x, y, M.strap, y === y0 + 4 ? 2 : 4); parts.px(E, R, x + 1, y, M.strap, y === y0 + 4 ? 1 : 2); }
    parts.px(E, R, x, y0 + 1, M.silver, 4); parts.px(E, R, x + 1, y0 + 1, M.silver, 2);
    E.part();
    parts.px(E, R, x - 1, y0 - 1, M.fletch, 3); parts.px(E, R, x, y0 - 2, M.fletch, 4); parts.px(E, R, x + 1, y0 - 1, M.fletch, 2); parts.px(E, R, x, y0 - 1, M.bone, 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, P.st === CHARGE || P.st === CAST || P.st === RECOVER ? BODY_BRACE : BODY);
    if (P.xbOff && !P.noXb) repeater({ T: parts.FREE, at: [P.xbX, P.xbY], flat: P.xbFlat, lv: P.tipLv, crank: 1 });   // 脱手的连弩（在身体后面）
    coatTails(R, { mat: M.coat, matD: M.coatD, bot: -4, flare: 2 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.sleeveD, cuff: M.silverD, cuffStyle: 'band', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'coat', mat: M.coat, hem: -4, buttons: M.silver, belt: M.strap, buckle: M.silver, strap: M.strap, strap2: M.strap });
    thighQuiver(R);
    parts.hood(E, R, P, { style: 'hood', mat: M.hood, layer: 'back' }); hoodPeak(R, { mat: M.hood, len: 2, drop: 0.5, hang: 6 });
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' }); maskEyes(R);
    parts.hood(E, R, P, { style: 'hood', mat: M.hood, layer: 'front' });
    if (!P.xbOff) repeater({ T: R, at: [P.hx, P.hy], crank: P.crank, mag: P.mag, fired: P.fired, lv: P.tipLv });
    parts.hand(E, R, P, { side: 'B', hand: M.glove });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.sleeve, cuff: M.silver, cuffStyle: 'band', hand: M.glove });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：弩矢（自己管，水平飞、月华长拖尾）、残影、全屏速度线、融影 ─────
  const AN = 8, aOn = new Uint8Array(AN), aK = new Uint8Array(AN), aX = new Float32Array(AN), aY = new Float32Array(AN), aVX = new Float32Array(AN), aVY = new Float32Array(AN), aTX = new Float32Array(AN), aN = new Uint16Array(AN), aLast = new Uint8Array(AN);
  const TGT_A = [HY - 16, HY - 25, HY - 15, HY - 11];            // 攻击四下：胸 → 头 → 胸 → 腹
  const TGT_S = [HY - 25, HY - 16, HY - 11, HY - 16, HY - 25];   // 技能五下：头 → 胸 → 腹 → 胸 → 头
  const GSTEP = 3;                                               // 残影每层退后 3 格
  let mzT = 9, mzX = 0, mzY = 0, gT = -1, gOut = 9, wgT = 9, wgX = 0, wgF = 0, slT = 9, chargeAcc = 0, lastStep = 0, meltT = -1, riseAcc = 0, soulAcc = 0, shotI = 0, gFire = 9, gFireK = 0, maskX = 0, maskY0 = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function fire(k, x, y, ty, last) {
    let i = 0; while (i < AN - 1 && aOn[i]) i++;
    const tx = DUMMY_X - 3, T = (tx - x) / 300;
    aOn[i] = 1; aK[i] = k; aX[i] = x; aY[i] = y; aVX[i] = 300; aVY[i] = (ty - y) / T; aTX[i] = tx; aN[i] = 0; aLast[i] = last ? 1 : 0;
  }
  function arrive(i) {
    const x = aTX[i], y = RD(aY[i]);
    if (aK[i] === 0) { burst(x, y, 6, 30, 80, 0.15, 0.35, R_EL, 6); fx.cross(x, y, 2, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'metal', w: 0.3 }); return; }
    fx.cross(x, y, 3, R_EL, 0.2); burst(x, y, 6, 40, 100, 0.2, 0.45, R_EL, 6);
    if (aLast[i]) { ring(x, y, 1, R_EL); fx.slash(x - 6, y, 9, 0.5, 2.6, R_EL, 0.3, 2, 2); burst(x, y, 16, 50, 130, 0.25, 0.6, R_EL, 10); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.8 }); }
    else { hitDummy(0); sfx('impact', { pal: 'shadow', w: 0.45 }); }
  }
  function capture(st, t, dst) { poseAt(st, t, t); drawHero(); bakeHero(); copySprite(dst, hero); hero.k1 = hero.k2 = -1; }
  function muzzle(off) { mzT = 0; mzX = wx(P.gx) - off; mzY = wy(P.gy); }
  function onEnter(s) {
    if (s === CAST) {                                                // 残影换成瞄准姿；汇聚光点外爆；全屏速度线
      capture(CAST, 1 / 12, ghost); poseAt(CAST, 0, 0);
      releaseOrbit(40, 100, 0.25, 0.5, { pts: 1 });
      slT = 0; shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK) for (let j = 0; j < 4; j++) if (Math.abs(t - T_SHOTS[j]) < 1e-9) {
      muzzle(0); fire(0, mzX + 1, mzY, TGT_A[j], 0); burst(mzX, mzY, 4, 20, 50, 0.1, 0.25, R_EL, 0);
      if (j === 0) sfx('swing', { kind: 'bow', w: 0.45 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === CHARGE && Math.abs(t - T_GHOST) < 1e-9) { capture(CHARGE, T_GHOST, ghost); poseAt(CHARGE, t, t); gT = 0; }
    for (let j = 0; j < SK_SHOTS.length; j++) {
      const k = SK_SHOTS[j]; if (k[0] !== s || Math.abs(t - k[1]) > 1e-9) continue;
      const off = k[2] * GSTEP; muzzle(off); if (k[2]) { gFire = 0; gFireK = k[2]; }
      fire(1, mzX + 1, mzY, TGT_S[j], j === 4); burst(mzX, mzY, 5, 20, 60, 0.1, 0.3, R_EL, 0); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && Math.abs(t - T_MELT) < 1e-9) {                 // 快照：身体（不含连弩和面罩）压成深色 → 按列塌成一滩；连弩单独烤成精灵
      const tp = T_MELT - 1 / 12; poseAt(DEATH, tp, tp); P.noXb = 1; P.noMask = 1; drawHero(); bakeHero();
      const o = hero.out; for (let i = 0; i < o.length; i++) if (o[i] !== 255) o[i] = DARK[o[i]];
      const Rk = parts.rig(P, BODY); maskX = HX + P.bx + Rk.hx0 + 2; maskY0 = HY + Rk.ey + 1;
      E.begin(loot, 0, 0); repeater({ T: parts.FREE, at: [P.xbX + P.bx, P.xbY], flat: 1, lv: 4, crank: 1 }); bake(loot, LOOT_BAKE);
      hero.k1 = hero.k2 = -1; poseAt(DEATH, t, t);
      death.start('melt', { fadeAt: 1.3, fadeDur: 0.5 }); meltT = 0;
    }
  }
  // 融影用的深色映射：亮 → 苍蓝灰（月光照到的边）· 中 → 墨绿 · 暗 → 墨
  const DARK = new Uint8Array(256); for (let i = 0; i < 256; i++) { if (i >= PAL.length) { DARK[i] = i; continue; } const n = parseInt(PAL[i].slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; DARK[i] = l > 0.62 ? 60 : l > 0.3 ? 35 : l > 0.12 ? 34 : 0; }
  const EVENTS = [[], [], T_SHOTS, [T_GHOST], [SK_SHOTS[0][1], SK_SHOTS[1][1], SK_SHOTS[2][1]], [SK_SHOTS[3][1], SK_SHOTS[4][1]], [], [T_MELT], []];
  EVENTS[CAST] = EVENTS[CAST].filter((t) => t > 0); EVENTS[RECOVER] = EVENTS[RECOVER].filter((t) => t > 0);
  function onEnterShots(s) { for (let j = 0; j < SK_SHOTS.length; j++) if (SK_SHOTS[j][0] === s && SK_SHOTS[j][1] === 0) onTime(s, 0); }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT >= 0.3) {                          // 月白光点从四周吸进上下两只月牙尖
      chargeAcc += dt * (16 + 26 * clamp01((stT - 0.3) / 1.0));
      const G = XB(P.hx, P.hy);
      while (chargeAcc >= 1) { chargeAcc -= 1; const up = Math.random() < 0.5, x = wx(G.x0 + 4 + P.bx), y = wy(G.yr + (up ? -5 : 5)), a = (up ? -1.9 : 1.9) + (Math.random() - 0.5) * 1.4, r = 10 + Math.random() * 7; spawn(K_SPIRAL_PT, x, y, r / (0.3 + Math.random() * 0.25), 0, 9, R_EL, a, r, (up ? 3 : -3) * (1 + Math.random())); }
    }
    if (state === MOVE && P.step !== lastStep) {                    // 每个接触帧在身后留一个月白残影，0.15 s 抖动消散；落脚无尘
      if (P.step !== 0) { sfx('step', { w: 0.25 }); capture(MOVE, stT, wghost); poseAt(MOVE, stT, E.simT); wgT = 0; wgX = HX + P.mx - (P.flip ? -4 : 4); wgF = P.flip; }   // 残影留在身后 4 格
      lastStep = P.step;
    }
    if (meltT >= 0) {
      meltT += dt;
      if (meltT > 0.6 && meltT < 1.7) { riseAcc += dt * 28; while (riseAcc >= 1) { riseAcc -= 1; spawnX(K_RISE, HX - 14 + Math.random() * 24, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.8 + Math.random() * 0.6, R_EL, { age0: 0.1 }); } }
      if (meltT > 1.2 && meltT < 1.8) { soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 14, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.soul); } }
      if (Math.abs(meltT - 0.45) < dt / 2 || Math.abs(meltT - 0.58) < dt / 2) fx.cross(maskX + 1, HY - 1, 2, R_EL, 0.15);   // 面罩落地「叮」
    }
    for (let i = 0; i < AN; i++) {
      if (!aOn[i]) continue; aX[i] += aVX[i] * dt; aY[i] += aVY[i] * dt;
      if ((aN[i]++ & 1) === 0 || aK[i]) spawn(K_TRAIL, aX[i] - 5, aY[i] + (Math.random() - 0.5), -(10 + Math.random() * 16), (Math.random() - 0.5) * 4, aK[i] ? 0.25 + Math.random() * 0.3 : 0.12 + Math.random() * 0.12, R_EL);
      if (aX[i] >= aTX[i]) { aOn[i] = 0; arrive(i); }
    }
    mzT += dt; wgT += dt; slT += dt; gFire += dt; if (gT >= 0) gT += dt;
  }
  function fxReset() { aOn.fill(0); mzT = 9; gT = -1; wgT = 9; slT = 9; gFire = 9; chargeAcc = 0; lastStep = 0; meltT = -1; riseAcc = 0; soulAcc = 0; }
  function fxBack(f12) {
    if (!P.xbOff) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (slT < 0.4) for (let k = 0; k < 5; k++) {                     // 全屏横向速度线：从右往左扫过，隔行白 / 月光奶白
      const t = slT - k * 0.035; if (t < 0) continue; const y = [14, 27, 40, 52, 63][k], L = 26 + k * 6, head = RD(140 - t * 620);
      for (let x = head; x < head + L; x++) { if (x < 0 || x >= 128) continue; const q = (x - head) / L; if (q > 0.7 && ((x + f12) & 1)) continue; put(x, y, q < 0.35 ? (k & 1 ? 5 : 21) : q < 0.7 ? EL[2] : EL[3]); }
    }
  }
  function ghostLayers(st, t) {                                      // 当前有几层残影、各层的消散量（0–1）
    if (st === CHARGE) return t < 0.8 ? 0 : t < 1.0 ? 1 : t < 1.2 ? 2 : 3;
    if (st === CAST) return 3;
    if (st === RECOVER) return 3;
    return 0;
  }
  function fxMid(f12) {
    if (wgT < 0.15) blitShape(wghost, wgX, HY, wgF, wgT < 0.07 ? EL[2] : EL[3], clamp01(wgT / 0.15));
    const st = E.state, t = E.stT, n = ghostLayers(st, t);
    for (let k = n; k >= 1; k--) {
      let dq = 0; if (st === RECOVER) { const t0 = 0.2 + (3 - k) * 0.1; dq = clamp01((t - t0) / 0.15); if (dq >= 1) continue; }
      const c = gFire < 1 / 12 && gFireK === k ? EL[1] : k === 1 ? EL[2] : k === 2 ? EL[3] : EL[4];
      blitShape(ghost, HX + P.mx - k * GSTEP, HY, P.flip, c, dq);
    }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { const cc = r < 3 ? c : EL[2]; put(mzX + r, mzY, cc); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    for (let i = 0; i < AN; i++) if (aOn[i]) {                     // 弩矢：银白箭头、骨白杆、绿羽
      const x = RD(aX[i]), y = RD(aY[i]), big = aK[i];
      put(x, y, EL[0]); put(x - 1, y, EL[1]); put(x - 2, y, 6); put(x - 3, y, 6); if (big) { put(x - 4, y, 6); put(x - 1, y - 1, EL[2]); put(x - 1, y + 1, EL[2]); }
      put(x - (big ? 5 : 4), y, 38); put(x - (big ? 6 : 5), y - 1, 37); put(x - (big ? 6 : 5), y + 1, 37);
    }
    if (meltT >= 0) {                                               // 掉在地上的连弩 + 面罩（快照里没有它们）
      const dq = clamp01((meltT - 1.3) / 0.5), o = loot.out;
      for (let y = 0; y < loot.h; y++) for (let x = 0; x < loot.w; x++) { const c = o[y * loot.w + x]; if (c === 255 || E.B8[(y & 7) * 8 + (x & 7)] < dq) continue; put(HX + x - loot.ox, HY + y - loot.oy, c); }
      const ft = meltT - 0.15; let my = maskY0;
      if (ft > 0) { const land = HY - 2; my = ft < 0.3 ? maskY0 + (land - maskY0) * (ft / 0.3) * (ft / 0.3) : ft < 0.43 ? land - RD(2 * Math.sin((ft - 0.3) / 0.13 * Math.PI)) : land; }
      my = RD(my);
      const MASK = [[0, 0, 30], [1, 0, 29], [2, 0, 29], [0, 1, 29], [1, 1, 28], [2, 1, 30], [1, 2, 28], [2, 2, 27]];
      for (const [dx, dy, c] of MASK) if (!(E.B8[((my + dy) & 7) * 8 + ((maskX + dx) & 7)] < dq)) put(maskX + dx, my + dy, c);
    }
  }

  return {
    name: '暗夜射手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.moon], HIT_POINT: [1, -16], EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'flesh', how: 'dissolve', pal: 'shadow', style: 'shadow', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter: (s) => { onEnter(s); onEnterShots(s); }, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
