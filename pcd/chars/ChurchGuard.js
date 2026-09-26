// 教堂守卫（部队 · 骷髅 · 先锋 · 稀有 · batch-15）：守卫落地石化后的样子——同一只石像鬼骷髅，石化加重、压得腿短粗、肩宽背厚，重心极低，不再能飞。
// 同款石化羊角放大一圈（角尖多一道裂纹）、同款石獠牙下巴；守卫的骨翼收拢石化成披在背后的石翼斗篷，两只翼尖从肩后竖起、高出头 3 格；
// 背上一根铁架用铁链吊着一口比头还大的教堂铜钟（铜绿锈、钟口朝下）；左手（后手）立一扇尖拱教堂石门当塔盾（铁箍 + 小彩窗），右手（前手）握钟舌链锤。
// 攻击 = 砸（单手把钟舌链锤甩过头顶，从上往下砸在目标头上）；技能 = 特性「花岗岩皮肤」生效（受到的伤害减少 25%）：
// 背后铜钟自己越摆越大、每摆到最高放一圈金色声纹，彩窗亮起 → 钟「咚」一声巨响、身前升起一面三色彩窗玻璃点阵护盾 → 敌弹撞上护盾，那一段变白碎成玻璃屑落下，本体纹丝不动。
// 死亡 = 前扑碎裂：向前扑倒压在石门上，身体从腰断成两截，背钟滚落扣在地上「当」一声。设定卡见 pcd/batch-15/ChurchGuard/design.md。
PCD.define('ChurchGuard', (E) => {
  const { parts, Sprite, bake, begin, part, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, pp = (T, x, y, m, t) => parts.px(E, T, x, y, m, t), runT = (T, y, a, b, m, t) => parts.run(E, T, y, a, b, m, t);

  // ───── 元素：花岗岩皮肤 · 彩窗圣光（holy 打底，护盾玻璃点缀品红 / 天青 / 红三色）─────
  const R_EL = FXI.holy, EL = FXR[R_EL];
  const G_PINK = E.fxRamp('glassPink', [21, 58, 63, 12, 11]), G_SKY = E.fxRamp('glassSky', [21, 22, 41, 40, 39]), G_RED = E.fxRamp('glassRed', [21, 26, 13, 12, 11]);
  const GLASS = [FXR[G_PINK], FXR[G_SKY], FXR[G_RED]], G_RAMPS = [G_PINK, G_SKY, G_RED];
  const CHIP = E.fxRamp('graniteChip', [17, 60, 59, 10, 8]);

  // ───── 材质 ─────
  const M = parts.mats(E, {
    gran: { r: 'pale', band: 2 }, limb: 'pale', cloak: { r: 'stone', band: 2 }, horn: [0, 10, 18, 17], skull: [0, 10, 18, 17],
    door: { r: [0, 9, 10, 18], band: 2 }, iron: 'iron', bell: { r: [20, 19, 61, 14], band: 2 }, rust: [34, 35, 36, 37], bone: 'bone',
    ink: { r: 'ink', flat: 1 }, eye: { r: [20, 61, 62, 5], flat: 1 },
    gPink: { r: [11, 12, 63, 58], flat: 1 }, gSky: { r: [39, 40, 41, 22], flat: 1 }, gRed: { r: [11, 12, 13, 26], flat: 1 }, lead: { r: [0, 0, 27, 28], flat: 1 },
  });
  const BODY = { body: 'stocky', leg: 7, torso: 10, head: 7, headW: 8, sw: 6, arm: 9, lw: 3, stride: 2, lift: 1, limb: 1.4, belly: 0, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(80, 54, 36, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['gPink', 'gSky', 'gRed', 'lead', 'eye', 'ink', 'iron', 'bell', 'rust']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）= 钟舌链锤握把（cx / cy 钟舌球心），后手（左手）握门，门立在身前 ─────
  const P = { hx: 0, hy: 0, cx: 0, cy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0, bell: 0, jaw: 0,
    gem: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, brk: 0, doorY: 0, bdrop: 0, bdx: 0, bdy: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, cx, cy, lean, head, crouch) => ({ hx, hy, cx, cy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -11, 6, -3);                            // 钟舌球垂到手下 8 格，从腿和门之间的下前方露出来
  const K_WIND = K(8, -23, 1, -31, -1, 0);                    // 链锤举过头顶，链子往后上扬、钟舌悬在角上方
  const K_STRIKE = K(11, -21, 16, -24, 1, 1, 1);               // 从上往下砸到目标头上
  const K_HOLD = K(10, -17, 14, -14, 1, 0, 1);                 // 砸完钟舌垂落
  const K_CHARGE = K(5, -12, 5, -7, -1, -1, 1);                // 蹲低撑住，钟在背后越摆越大
  const K_CAST = K(6, -12, 7, -7, 1, 0, 1);
  const K_HURT = K(3, -12, 1, -7, -1, -1);
  const K_STAG = K(8, -9, 10, -5, 2, 1, 2);                    // 死亡：往前踉跄
  const FIELDS = ['hx', 'hy', 'cx', 'cy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -32, 31], ['hy', -48, 15], ['cx', -32, 31], ['cy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bell', -2, 2], ['jaw', 0, 2],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['gem', 0, 4], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 5],
    ['dq48', 0, 48], ['st', 0, 8], ['bx', -16, 15], ['brk', 0, 1], ['doorY', -2, 1], ['bdrop', 0, 2], ['bdx', -24, 24], ['bdy', 0, 18]]);
  const BELL_IDLE = [0, 1, 0, -1], T_HIT = 2 / 12, T_RING = [0.5, 0.9, 1.3], T_SHOT = 1.27, T_KNOCK = 1.84;
  const T_LAND = INCOMING + 0.66, T_BELL = INCOMING + 0.96;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.bell = 0; P.jaw = 0; P.gem = 0; P.rim = 0; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.brk = 0; P.doorY = 0; P.bdrop = 0; P.bdx = 0; P.bdy = 0;
    const idle = () => {                                                       // 守门：门立地不动，钟随呼吸轻晃；循环末尾钟舌碰一下钟壁
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.bell = BELL_IDLE[(b + 1) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.bell = lp < T_KNOCK ? 2 : 1; P.head = -1; P.gem = lp >= T_KNOCK && lp < T_KNOCK + 0.09 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                    // 石足蹒跚重踏：接触帧身体顿 1 格、门磕地；经过帧门离地 1 格；背钟跟着晃
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.bell = [1, 0, -1, 0][f]; P.doorY = P.wup ? -1 : 0; P.lean = [0, 1, 0, 1][f] - 0; P.cx = K_IDLE.cx - P.sway;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.bell = 1; P.jaw = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.bell = -2; P.jaw = 1; P.rim = 0; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = RD(3 - q); P.bell = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); P.bell = RD(1 - q); }
    } else if (st === CHARGE) {                                                // 钟自己越摆越大（4 拍，最高点放声纹），彩窗亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      const A = tq < 0.3 ? 1 : 2; P.bell = RD(A * Math.sin(2 * Math.PI * ((tq % 0.4) / 0.4)));
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.jaw = tq > 1.1 ? 1 : 0;
    } else if (st === CAST) { setK(K_CAST, K_CAST, 0); P.bell = tq < 1 / 12 ? -2 : (f12 & 1) ? 1 : -1; P.gem = 3; P.rim = 3; P.jaw = 2; }   // 「咚」：钟甩到最高后余震
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.bell = RD(Math.sin(tq * 14) * (1 - q) * 1.4); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 2; P.bell = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.bell = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                 // 踉跄 → 前扑压在石门上 → 腰断两截 → 背钟滚落扣地
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 2; P.bell = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.eyes = 1; P.jaw = 2; P.bell = -2; P.gem = 1; }
      else {
        setK(K_STAG, K_STAG, 0); P.lying = 1; P.eyes = 1; P.jaw = 2; P.bx = 2; P.lift = d < 0.58 ? 5 : d < T_LAND - INCOMING ? 3 : 2;
        if (d >= T_LAND - INCOMING) { P.brk = 1; const q = clamp01((d - (T_LAND - INCOMING)) / (T_BELL - T_LAND)); P.bdrop = q >= 1 ? 2 : 1; P.bdx = RD(5 - 21 * q); P.bdy = RD(12 * (1 - q) + Math.sin(q * Math.PI) * 5); }
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(); P.bob = 0; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + Math.min(3, RD(P.crouch)); P.cx = RD(P.cx); P.cy = RD(P.cy) + P.bob + Math.min(3, RD(P.crouch));
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = 8 + P.bx; P.gy = -2; } else { P.gx = WIN[0] + P.bx; P.gy = WIN[1] + P.doorY; }
    P.dq48 = RD(P.dq * 48); KEY(P);
  }
  const DOOR_C = 11, WIN = [DOOR_C, -10];                                      // 门中线 · 彩窗中心（发光体）

  // ───── 画（部件从后往前；自画的部件都走 rig 的落笔变换，倒地时跟着身体转）─────
  function polyT(T, p, m, tn) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let c = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const yi = p[i + 1], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < (p[j] - p[i]) * (y - yi) / (yj - yi) + p[i]) c = !c; }
      if (c) pp(T, x, y, m, tn(x, y));
    }
  }
  // 候选部件：stoneWingCloak 收拢石化的翼斗篷——翼腕在肩上、翼尖竖起高出头顶，翼膜沿背垂到膝，下摆三道破口；两根翼指压成暗纹
  const CLOAK = [0, -17, -1, -24, -3, -28, -5, -25, -7, -19, -9, -12, -9, -5, -7, -7, -5, -4, -3, -7, -1, -5, 0, -10];
  function drawCloak(T, far) {
    part(); const m = far ? M.cloakD : M.cloak, dx = far ? 2 : 0, dy = far ? -1 : 0, p = CLOAK.map((v, i) => v + (i & 1 ? dy : dx) + (i & 1 ? 0 : (i > 3 && i < 20 ? -P.sway * 0 : 0)));
    polyT(T, p, m, (x, y) => (y - dy <= -25 ? 4 : y - dy <= -23 ? 3 : (x - dx === -3 && y < -12 && y > -24) || (x - dx === -6 && y < -9 && y > -19) ? 2 : 0));   // 翼尖 4 行提亮一级，和铁背架分开
    pp(T, -3 + dx, -28 + dy, far ? M.boneD : M.bone, 3);                      // 翼尖拇指爪（骨）
  }
  // 候选部件：churchBell 教堂铜钟——9 宽 8 高（冠 → 钟肩 → 钟腰 → 外翻钟唇），铜绿锈斑，钟口下露出一点钟舌；swing -2..2 按行错位（绕顶上的吊点摆）
  const BELL_W = [1, 2, 3, 3, 3, 3, 4, 4], BELL_X = -10;
  function drawBell(T, cx, top, swing, lip) {
    part();
    for (let j = 0; j < 8; j++) { const w = BELL_W[j], sx = RD(swing * j / 7), y = top + j; runT(T, y, cx - w + sx, cx + w + sx, M.bell, j === 7 ? 4 : j === 6 ? 0 : 0); }
    for (const [dx, j, t] of [[-2, 3, 3], [-1, 4, 2], [2, 5, 3], [-3, 6, 2], [1, 2, 3]]) pp(T, cx + dx + RD(swing * j / 7), top + j, M.rust, t);   // 铜绿
    pp(T, cx - 1 + RD(swing * 2 / 7), top + 2, M.bell, 4); pp(T, cx - 2 + RD(swing * 3 / 7), top + 3, M.bell, 4);   // 高光
    runT(T, top + 6, cx - 4 + RD(swing * 6 / 7), cx + 4 + RD(swing * 6 / 7), M.bell, 2);   // 钟腰线
    if (lip) pp(T, cx + RD(swing) + (swing > 0 ? -1 : swing < 0 ? 1 : 0), top + 8, M.iron, 3);   // 钟舌（碰壁时偏到一边）
  }
  function drawBellRig(T) {                                                    // 背架：铁杆从肩后竖到头顶上方，横臂挂链，链下吊钟
    part(); for (let y = -33; y <= -16; y++) pp(T, BELL_X + 4, y, M.iron, y === -33 ? 4 : 0); runT(T, -33, BELL_X, BELL_X + 3, M.iron, 0);   // 铁杆离翼尖 2 格
    for (let y = -32; y <= -30; y++) pp(T, BELL_X + (y === -30 ? RD(P.bell * 0.3) : 0), y, M.iron, (y & 1) ? 4 : 2);
    drawBell(T, BELL_X + RD(P.bell * 0.3), -29, P.bell, 1);
  }
  // 候选部件：gargoyleSkull（同 Guard.js，放大一圈：8 宽）——石颅 + 眉骨 + 眼窝眼火 + 外凸石下颌 + 外翻獠牙
  function gargoyleSkull(T, x0, y0, w, jaw) {
    const h = 6, x1 = x0 + w - 1, sk = M.skull;
    part();
    for (let j = 0; j < h; j++) { const y = y0 + j, a = j === 0 || j === h - 1 ? x0 + 1 : x0, b = j === 0 ? x1 - 1 : j >= 4 ? x1 + 1 : x1; runT(T, y, a, b, sk, 0); }
    runT(T, y0 + 1, x1 - 2, x1, sk, 4);
    for (const [x, y] of [[x0 + 2, y0 + 2], [x0 + 1, y0 + 4], [x0 + 3, y0 + 3]]) pp(T, x, y, sk, 2);   // 花岗岩斑点
    pp(T, x1 - 2, y0 + 2, M.ink, 0);
    if (P.eyes) pp(T, x1 - 1, y0 + 2, sk, 1); else pp(T, x1 - 1, y0 + 2, M.eye, [2, 3, 4, 4, 1][Math.min(4, P.gem)]);
    pp(T, x1 + 1, y0 + 3, M.ink, 0); pp(T, x1, y0 + 4, sk, 2);
    for (let x = x0 + 3; x <= x1 + 1; x += 2) pp(T, x, y0 + 5, M.bone, 4);
    const jy = y0 + 6 + jaw;
    if (jaw) for (let x = x0 + 2; x <= x1; x++) for (let y = y0 + 6; y < jy; y++) pp(T, x, y, M.ink, 0);
    runT(T, jy, x0 + 1, x1 + 1, sk, 0); runT(T, jy + 1, x0 + 2, x1, sk, 0); pp(T, x1 + 1, jy + 1, sk, 2);
    pp(T, x1 + 2, jy - 1, M.bone, 4); pp(T, x1 + 2, jy - 2, M.bone, 3); pp(T, x1 + 2, jy - 3, M.bone, 3); pp(T, x0 + 4, jy - 1, M.bone, 3);
  }
  // 候选部件：ramHorn（同 Guard.js，k = 1.4 放大）+ 角尖一道裂纹
  const RAM = [[1, 0, 2], [0, -1, 2], [-1, -1, 2], [-2, -1, 2], [-3, 0, 2], [-4, 1, 2], [-4, 2, 2], [-4, 3, 1], [-3, 4, 1], [-2, 4, 1], [-1, 3, 1]];
  function ramHorn(T, x, y, far, k) {
    part(); const m = far ? M.hornD : M.horn;
    for (let i = 0; i < RAM.length; i++) {
      const [dx, dy, w] = RAM[i], X = RD(x + dx * k), Y = RD(y + dy * k), tip = i === RAM.length - 1;
      for (let j = 0; j < w + (k > 1.2 && i < 7 ? 1 : 0); j++) pp(T, X, Y + j, m, tip ? (far ? 3 : 4) : far ? (i & 1 ? 1 : 2) : ((i & 1) ? 2 : j === 0 ? 4 : 3));
      if (k > 1.2 && i > 0 && i < RAM.length - 1) { const [ex, ey] = RAM[i + 1]; if (Math.abs(RD(x + ex * k) - X) > 1 || Math.abs(RD(y + ey * k) - Y) > 1) for (let j = 0; j < w; j++) pp(T, RD((X + RD(x + ex * k)) / 2), RD((Y + RD(y + ey * k)) / 2) + j, m, far ? 2 : 3); }
    }
    if (!far) { pp(T, RD(x - 4 * k), RD(y + 3 * k), M.ink, 0); pp(T, RD(x - 4 * k) + 1, RD(y + 3 * k) + 1, M.ink, 0); }   // 角尖裂纹
  }
  // 候选部件：churchDoor 尖拱教堂石门塔盾——9 宽 15 高，尖拱顶、竖门板缝、两道铁箍 + 铆钉、拱下一扇 3×4 小彩窗（铅条分格，5 档发光：gem）。
  // T = 落笔变换，(cx, by) = 门中线、门底；flat 1 = 倒在地上（画成 2 行厚的一条，彩窗朝上看不见）
  function drawDoor(T, cx, by, lv) {
    part();
    for (let j = 0; j < 15; j++) { const y = by - 14 + j, w = j === 0 ? 0 : j === 1 ? 1 : j === 2 ? 2 : j === 3 ? 3 : 4; runT(T, y, cx - w, cx + w, M.door, 0); }
    for (let y = by - 2; y >= by - 11; y--) { pp(T, cx - 2, y, M.door, 2); pp(T, cx + 2, y, M.door, 2); }
    for (const y of [by - 6, by - 2]) { runT(T, y, cx - 4, cx + 4, M.iron, 0); pp(T, cx - 3, y, M.iron, 4); pp(T, cx + 3, y, M.iron, 4); }
    pp(T, cx + 2, by - 4, M.iron, 3);                                          // 门环
    const tn = [[2, 2], [3, 3], [3, 4], [4, 4], [1, 2]][lv], wy = by - 11, G = [[M.gRed, M.lead, M.gRed], [M.gSky, M.gPink, M.gSky], [M.gRed, M.lead, M.gRed], [M.gPink, M.gSky, M.gPink]];
    pp(T, cx, wy - 1, M.gRed, tn[0]);
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { const m = G[j][i]; pp(T, cx - 1 + i, wy + j, m, m === M.lead ? 3 : ((i + j) & 1 ? tn[0] : tn[1])); }
    if (lv === 3) pp(T, cx, wy + 1, M.gPink, 4);
  }
  function drawDoorFlat(bx) {                                                  // 倒在地上的门（前扑时压在身下）
    part(); const F = parts.FREE;
    for (let x = bx - 1; x <= bx + 13; x++) { pp(F, x, -1, M.door, 0); pp(F, x, 0, M.door, x === bx + 13 ? 2 : 0); }
    pp(F, bx + 14, 0, M.door, 2); for (const x of [bx + 3, bx + 8]) { pp(F, x, -1, M.iron, 4); pp(F, x, 0, M.iron, 0); }
  }
  function drawFlail(T, hx, hy, cx, cy) {                                     // 钟舌链锤：握把 → 铁链（亮暗相间）→ 铁钟舌球
    part();
    const n = Math.max(1, Math.ceil(Math.hypot(cx - hx, cy - hy - 2)));
    for (let k = 1; k < n; k++) { const x = RD(hx + (cx - hx) * k / n), y = RD(hy + (cy - 2 - hy) * k / n); pp(T, x, y, M.iron, (k & 1) ? 4 : 2); }
    runT(T, cy - 1, cx - 1, cx + 1, M.iron, 0); runT(T, cy, cx - 1, cx + 1, M.iron, 0); runT(T, cy + 1, cx - 1, cx + 1, M.iron, 0); pp(T, cx, cy + 2, M.iron, 2);
    pp(T, cx - 1, cy - 1, M.iron, 4); pp(T, cx, cy - 2, M.iron, 3);
  }
  function drawRibs(R, T) {                                                    // 花岗岩骨架：肋沟 + 胸骨 + 斑点（并进躯干部件）
    for (const dy of [3, 5, 7]) { const y = R.yS + dy, e = parts.edges(R, y); runT(T, y, RD((e[0] + e[1]) / 2), e[1] - 1, M.gran, 2); }
    for (let y = R.yS + 2; y <= R.yS + 8; y++) { const e = parts.edges(R, y); if ((y & 1) === 0) pp(T, e[0] + 2, y, M.gran, 2); if (y % 3 === 0) pp(T, e[0] + 4, y, M.gran, 4); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY), U2 = P.brk ? Object.assign({}, R, { ty: R.ty - 3 }) : R;   // 腰断：上半身沿身体方向错开 3 格
    const lie = R.lie;
    if (!lie) drawBellRig(R);
    drawCloak(U2, 1);
    if (!lie) parts.arm(E, U2, P, { side: 'B', at: [DOOR_C - 3, -8 + P.doorY], sleeve: 'bare', mat: M.limbD, hand: M.limbD, grip: 'big' });
    if (lie) drawDoorFlat(-1);
    parts.legs(E, R, P, { style: 'greave', mat: M.limb, matD: M.limbD });
    parts.torso(E, U2, P, { style: 'bare', mat: M.gran }); drawRibs(U2, U2);
    drawCloak(U2, 0);
    const x0 = U2.hx - 2, y0 = U2.htop;
    ramHorn(U2, x0 + 4, y0 - 3, 1, 1.4);                                     // 两只角都先画：根部压在颅后，盘卷的部分高出颅顶 3 格、从后脑伸出去
    ramHorn(U2, x0 + 2, y0 - 2, 0, 1.4);
    gargoyleSkull(U2, x0, y0, 8, P.jaw);
    if (!lie) drawDoor(R, DOOR_C, P.doorY, P.gem);
    parts.arm(E, U2, P, { sleeve: 'bare', mat: M.limb, hand: M.limb, grip: 'none' });
    if (!lie) { drawFlail(R, P.hx + 1, P.hy, P.cx, P.cy); parts.hand(E, R, P, { hand: M.limb, grip: 'big' }); }
    else drawFlail(parts.FREE, 20, -1, 24, -2);                                // 链锤脱手落在前面
    if (lie && P.bdrop) drawBell(parts.FREE, P.bdx, -7 - P.bdy, P.bdrop === 2 ? 0 : (P.bdy & 1 ? 1 : -1), 0);   // 背钟滚落，最后钟口朝下扣在地上
    else if (lie) drawBell(parts.FREE, 5, -19, 2, 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let domeT = 9, domeHit = -1, hitAge = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastLp = 0, smT = 9;
  // 护盾拱顶高 44 格（背架顶 -33 之上再高 11 格），宽 40 格；玻璃片沿椭圆每 2 格一片、首尾相接（共 52 片，高过角尖 y ≤ -30 的有 22 片）
  const DOME = { cx: 6, rx: 20, ry: 44 };
  const DOME_T = (() => { const o = []; let lx = 1e9, ly = 1e9; for (let i = 0; i <= 4000; i++) { const a = Math.PI + i / 4000 * Math.PI, x = RD(Math.cos(a) * DOME.rx), y = RD(Math.sin(a) * DOME.ry); if (Math.max(Math.abs(x - lx), Math.abs(y - ly)) >= 2) { o.push([x, y, a]); lx = x; ly = y; } } return o; })();
  const bellScr = () => [scrX(BELL_X + P.bell + P.bx), HY - 25];
  const mouthScr = () => [scrX(BELL_X + P.bell + P.bx), HY - 21];            // 钟口（声纹从这里放出）
  const waves = [];                                                          // 蓄力声纹：自画的圆环，起始半径 ≥ 6，不压在钟上
  function wave(x, y, r0, grow, life) { waves.push({ x, y, r0, grow, life, t: 0 }); }
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function chips(x, y, n, spd) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * spd, -20 - Math.random() * 40, 0.6 + Math.random() * 0.4, CHIP, { g: 260, floor: HY }); }
  function onEnter(s) {
    if (s !== CAST) return;                                                    // 「咚」：大声纹 + 身前升起彩窗点阵护盾
    const [bx, by] = bellScr(); ring(bx, by, 1, R_EL); burst(bx, by, 16, 40, 100, 0.25, 0.5, R_EL, 8); releaseOrbit(40, 90, 0.3, 0.6);
    domeT = 0; domeHit = -1; shake(0.28, 2); flash(0.05); fx.cross(scrX(WIN[0]), HY + WIN[1], 6, R_EL, 0.3);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                         // 钟舌从头顶砸下
      const x = scrX(P.cx + P.bx), y = HY + P.cy; smT = 0;
      fx.slash(scrX(4 + P.bx), HY - 16, 13, -0.6, 1.05, R_EL, 0.17, 2, 2);
      burst(x, y, 16, 40, 110, 0.15, 0.4, FXI.impact, 6); fx.cross(x, y, 5, FXI.impact, 0.2); hitDummy(1, 1); shake(0.1, 1);
      sfx('swing', { kind: 'smash', w: 0.8 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === CHARGE && T_RING.includes(t)) { const k = T_RING.indexOf(t), [bx, by] = mouthScr(); wave(bx, by, 6 + k, 34 + k * 14, 0.22 + k * 0.03); burst(bx, by, 4 + k * 3, 20, 50, 0.2, 0.4, R_EL, 4); }   // 3 圈声纹以钟口为心、起始半径 6 起，逐圈变大
    if (s === CHARGE && t === T_SHOT) shoot(1, 146, HY - 46, -200, HX + DOME.cx + 10, FXI.enemy, 30);   // 从右上斜落，施放 +0.14 s 撞在拱顶前上段（本地 x 16、y -38：头前上方的空处，不压身体也不压假人）
    if (s === IDLE && t === T_KNOCK) { const [bx, by] = bellScr(); ring(bx, by + 2, 0, R_EL); }
    if (s === DEATH && t === T_LAND) { dust(HX + 4, 16, 50); chips(HX + 6, HY - 4, 8, 60); shake(0.12, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === T_BELL) { const x = HX + P.bx + P.bdx; dust(x, 8, 40); ring(x, HY - 4, 0, R_EL); burst(x, HY - 4, 8, 30, 70, 0.2, 0.4, R_EL, 10); shake(0.1, 1); sfx('hit', { mat: 'metal', w: 0.7 }); }
  }
  const EVENTS = [[T_KNOCK], [], [T_HIT], [T_RING[0], T_RING[1], T_SHOT, T_RING[2]], [], [], [], [T_LAND, T_BELL], []];
  function impactOn(k, x, y) {                                                 // 敌弹撞在护盾上：那一段变白，碎成彩色玻璃屑落下
    if (k !== 1) return;
    domeHit = Math.atan2((y - HY) / DOME.ry, (x - scrX(DOME.cx)) / DOME.rx); if (domeHit < 0) domeHit += 2 * Math.PI; hitAge = 0;
    for (let i = 0; i < 18; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 6, 10 + Math.random() * 40, -20 - Math.random() * 30, 0.9 + Math.random() * 0.4, G_RAMPS[i % 3], { g: 260, floor: HY, age0: 0.15 });
    fx.cross(x, y, 5, R_EL, 0.25); ring(x, y, 0, R_EL); shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.8 });
  }
  function hurtFx(s) {                                                         // 花岗岩挨打：石屑 + 金火花
    const hx = HX + 2, hy = HY - 16; burst(hx, hy, s === DEATH ? 22 : 14, 50, 140, 0.2, 0.5, CHIP, 20); burst(hx, hy, 6, 50, 120, 0.3, 0.6, FXI.impact, 20);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.8 }); dust(scrX(P.step > 0 ? 4 : -3), 3, 22); } lastStep = P.step; }
    if (state === CHARGE) {                                                    // 金光尘粒螺旋收进彩窗
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, scrX(P.gx), HY + P.gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 28, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    domeT += dt; smT += dt; hitAge += dt;
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t >= waves[i].life) waves.splice(i, 1); }
  }
  function fxReset() { domeT = 9; domeHit = -1; hitAge = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastLp = 0; smT = 9; waves.length = 0; }
  function drawWaves(f12) {                                                  // 声纹环：白 → 淡金 → 金，后半程隔点断开；画在角色后面，只露出轮廓外的部分
    for (const w of waves) {
      const q = w.t / w.life, r = w.r0 + w.t * w.grow, c = q < 0.3 ? EL[0] : q < 0.65 ? EL[1] : EL[2], n = Math.ceil(r * 6.3);
      for (let i = 0; i < n; i++) { if (q > 0.5 && ((i + f12) & 3) === 3) continue; const a = i / n * 6.2832; put(RD(w.x + Math.cos(a) * r), RD(w.y + Math.sin(a) * r * 0.8), c); }
    }
  }
  // 彩窗点阵护盾：半椭圆拱，每片玻璃 2×2（品红 / 天青 / 红轮流），从地面两端往上逐片亮起；被击中的那一段先白 0.12 s 后碎掉留缺口；后段断续褪去。
  // 身后只画 cos < -0.3 的后下段（被背钟和斗篷挡住的部分），拱顶和整个前段都画在角色前面，不会被身体盖住
  function drawDome(front, f12) {
    const DUR_D = 1.15; if (domeT >= DUR_D || E.state === DEATH) return;
    const q = domeT / DUR_D, lit = Math.min(1, domeT / 0.12), cx = scrX(DOME.cx);
    for (let k = 0; k < DOME_T.length; k++) {
      const [lx, ly, a] = DOME_T[k]; if ((Math.cos(a) > -0.3) !== front) continue;
      if (Math.abs(Math.sin(a)) > lit + 0.05 && lit < 1) continue;
      if (q > 0.7 && ((k + f12) & 1)) continue;
      const near = domeHit >= 0 && Math.abs(a - domeHit) < 0.2;
      if (near && hitAge > 0.12) continue;                                     // 碎掉的那一段留下缺口
      const G = GLASS[k % 3], white = near || domeT < 1 / 12, c = white ? 21 : q < 0.5 ? G[2] : G[3], c2 = white ? 21 : q < 0.5 ? G[1] : G[2];
      const x = cx + lx, y = HY + ly; put(x, y, c); put(x + 1, y, c2); put(x, y - 1, c2); put(x + 1, y - 1, c);
    }
  }
  function fxBack(f12) { if (P.dq < 1 && !P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); drawWaves(f12); drawDome(false, f12); }
  function fxFront(f12) {
    drawDome(true, f12);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {                    // 彩窗星芒
      const gx = scrX(P.gx), gy = HY + P.gy, L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
  }

  return {
    name: '教堂守卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gPink, M.gSky, M.gRed, M.eye], HIT_POINT: [2, -16], EVENTS,
    SFX: { body: 'stone', how: 'topple', pal: 'holy', style: 'shield', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
