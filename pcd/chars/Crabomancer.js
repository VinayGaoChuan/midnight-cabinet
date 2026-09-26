// 蟹巫（部队 · 虚空 · 召唤师 · 传说）：蟹术士进化而来的高腿寄居蟹。螺壳长成高耸的尖塔螺（几扇小窗透紫光），小尖帽变成挂贝壳铃的高尖帽，
// 右螯长成比身体还大的符文巨钳，珊瑚杖不见了，一颗水球悬浮在左螯上方。攻击：巨螯隔空一夹，目标身上出现一只水影钳合拢。
// 技能「召唤蟹钳」：巨螯高举，目标上空撕开紫边水涡裂隙，水球里的光点被吸进去；施放时裂隙里伸出一只巨蟹钳（呼应 Pincer）砸在假人身上合拢一夹；
// 收招时巨钳举起示威，裂隙合拢。死亡：甲壳从巨螯开始裂开，碎成块散落（死亡套件 chunks），窗里的紫光熄灭。身体用 parts-beast 的 bug。
PCD.define('Crabomancer', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, clearOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.water, EL = FXR[R_EL], ML = FXR[FXI.magic];                                // 深渊潮涌 · 海水青为主，裂隙边缘虚空紫（magic）
  const m = B.mats(E, { main: 'fire', limb: [0, 44, 45, 46], claw: [0, 20, 44, 45], eye: [0, 0, 0, 0] });   // 腿比甲暗一级，身体才读得出来           // 橙红珊瑚甲
  const M = {
    gold: E.defMat('gold', 1), conch: E.defMat('sand', 2), win: E.defMat('purple', 1, 1),       // 金镶边、尖塔螺、窗光
    hat: E.defMat('purple', 1), bell: E.defMat('bone', 1), claw: E.defMat('fire', 1),           // 高尖帽、贝壳铃、巨螯
    rune: E.defMat([25, 24, 43, 21], 1, 1), orb: E.defMat([39, 40, 22, 21], 1, 1),               // 巨螯符文、水球（发光体）
  };
  const o = G.shape({ n: 4, rx: 6, ry: 3.5, under: 6, abd: null, head: null, span: 14, knee: 1, farDx: 3, stride: 3, lift: 3, lw: 1, fan: 0.8, kneeOut: 0.42,
    claws: { len: 5, size: 2.5 }, eyes: 0, stalks: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(96, 64, 48, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, m.spec, M.rune, M.orb, M.win, M.bell, M.gold]) RIM.skip[k] = 1;
  // 姿势字段：pin 巨钳张开 0–3 · cx cy 巨钳掌心偏移 · gem 水球 0 待机 / 1 蓄力 / 2 蓄满 / 3 施放 / 4 熄灭 · oa 水球绕左螯的相位 0–7
  //   bell 贝壳铃摆 -1..1 · blink 闭眼 · wl 窗光 0–3 · crk 裂纹 0–2
  const EXTRA = [['pin', 0, 3], ['crot', 0, 2], ['cx', -6, 4], ['cy', -12, 4], ['gem', 0, 4], ['oa', 0, 7], ['bell', -1, 1], ['blink', 0, 1], ['wl', 0, 3], ['crk', 0, 2]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.pin = 2; P.crot = 2; P.cx = 0; P.cy = 0; P.gem = 0; P.oa = 0; P.bell = 0; P.blink = 0; P.wl = 2; P.crk = 0; P.mx = 0; P.flip = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [R(rig.T.x) + 1, R(rig.T.y)];

  // ───── 姿势 ─────
  const F = ['bx', 'crouch', 'pitch', 'pin', 'crot', 'cx', 'cy'];
  const REST = { bx: 0, crouch: 0, pitch: 0, pin: 2, crot: 2, cx: 0, cy: 0 };   // 巨螯平时竖举（crot 2 指尖朝上），出手时横过来（crot 0 朝右）
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, pitch: 1, pin: 3, cx: -2, cy: -4 });
  const A_SNAP = pose({ bx: 2, pin: 0, crot: 0, cx: 2, cy: 1 });
  const A_HOLD = pose({ bx: 1, pin: 0, crot: 0, cx: 1, cy: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_SNAP, 'snap'], [0.25, A_SNAP, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const S_CHG = pose({ pitch: 2, pin: 3, cx: -2, cy: -8 });
  const S_CAST = pose({ bx: 2, pitch: 0, crouch: 1, pin: 0, crot: 0, cx: 3, cy: 3 });
  const T_HIT = 2 / 12, T_SLAM = 0.1, T_CRACK = INCOMING + 0.5, BELL = [0, 1, 0, -1];
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.bell = BELL[(b + 1) & 3]; P.oa = Math.floor(TT * 5 + 1e-6) & 7; P.wl = (b % 4) === 2 ? 3 : 2;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.pin = [3, 0, 3, 0, 2][k]; P.bell = [1, -1, 1, -1, 0][k]; P.gem = k === 1 || k === 3 ? 1 : 0; }   // 待机个性：磨螯，贝壳铃叮一下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 高腿横移：经过帧身体抬高 2 格
      G.anim.walk(P, tq); P.bob = 0; P.lift = P.gf & 1 ? 2 : 0; P.bell = P.gf & 1 ? -1 : 1; P.oa = (P.gf * 2) & 7; P.cy = P.gf & 1 ? -1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp); P.gem = tq < 0.12 ? 1 : tq < 0.25 ? 2 : 0; P.rim = tq >= 0.12 && tq < 0.25 ? 2 : 1; P.bell = tq >= 0.12 && tq < 0.45 ? -1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, S_CHG, ease.inOut(tq / 0.7), F); apply(tmp); } else apply(S_CHG);
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; P.wl = 3; P.bell = tq > 0.7 ? ((f12 & 1) ? 1 : -1) : -1; P.oa = (f12 >> 1) & 7;
      if (tq > 1.0) P.pin = 2 + (f12 & 1);                                                     // 蓄满：巨钳一开一合地颤
    } else if (st === CAST) {
      E.mix(tmp, S_CHG, S_CAST, ease.out(clamp01(tq / 0.1)), F); apply(tmp); P.gem = 3; P.rim = 3; P.wl = 3; P.bell = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_CAST, REST, q, F); apply(tmp);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bell = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); P.pin = 1; if (h < 0.35) { P.blink = 1; P.bell = 1; P.cx = -2; P.cy = h < 0.2 ? -2 : -1; P.pin = 2; P.rim = 0; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {                                                                                   // 受击 → 甲壳从巨螯开始裂开（裂纹 1 → 2，窗光闪灭）→ 0.5 s 碎裂成块
        G.anim.hurt(P, Math.min(d, 0.19)); P.blink = 1; P.bell = 1; P.rim = 0; P.pin = 2; P.cx = -1; P.cy = -1; P.crouch = d < 0.15 ? 1 : 2;
        P.crk = d < 0.2 ? 0 : d < 0.35 ? 1 : 2; P.wl = d < 0.2 ? 2 : (f12 & 1) ? 1 : 0; P.gem = d < 0.3 ? ((f12 & 1) ? 1 : 0) : 4;
        if (d >= 0.5) P.dq = 1;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o);
    const g = orbAt(); P.gx = g[0] + P.bx; P.gy = g[1];
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  const palm = () => (P.crot === 2 ? [R(rig.T.x + 12 + P.cx), R(rig.T.y - 3 + P.cy)] : [R(rig.T.x + 14 + P.cx), R(rig.T.y + P.cy)]);   // 巨螯掌心
  const ORBIT = [[0, -6], [2, -6], [3, -5], [2, -4], [0, -4], [-2, -4], [-3, -5], [-2, -6]];
  function orbAt() { const c = rig.claw; return [R(c.H[0] - 4 + ORBIT[P.oa][0]), R(c.H[1] - 6 + ORBIT[P.oa][1])]; }   // 悬在左螯上方、绕着转；画在最前面，不被巨螯挡住

  // ───── 画 ─────
  // 候选部件：spireConch（尖塔螺：体螺层 + 逐级收窄的高塔螺层 + 缝合线 + 透光小窗）。(cx, cy) 体螺层中心；wl 窗光 0–3
  function spireConch(cx, cy, wl) {
    E.part();
    const TIERS = [[0, 6, 5], [-1.5, 5, -3.5], [-2.8, 4, -6.6], [-3.8, 3, -9.2], [-4.6, 2.2, -11.4], [-5.2, 1.4, -13.2], [-5.6, 0.8, -14.6]];   // [dx, 半宽, dy]
    for (let i = TIERS.length - 1; i >= 1; i--) { const [dx, r, dy] = TIERS[i]; U.oval(E, cx + dx, cy + dy, r, Math.max(1, r * 0.75), M.conch, 0); }
    U.oval(E, cx, cy, 6, 5, M.conch, 0);
    for (let i = 1; i < TIERS.length - 1; i++) { const [dx, r, dy] = TIERS[i]; for (let k = -1; k <= 1; k++) U.dot(E, cx + dx + k * r * 0.6, cy + dy + r * 0.55 + (k === 1 ? -0.5 : 0), M.conch, 2); }   // 缝合线
    for (let th = 0.6; th < 8.5; th += 0.34) { const r = 0.9 * th / 8.5; U.dot(E, cx + Math.cos(th + 2.4) * 6 * r, cy + Math.sin(th + 2.4) * 5 * r, M.conch, 2); }
    const wt = wl === 0 ? 1 : wl === 1 ? 2 : wl === 2 ? 3 : 4;
    for (const [dx, dy] of [[-2, -4], [-4, -9], [-5, -13]]) { U.dot(E, cx + dx, cy + dy, M.win, wt); U.dot(E, cx + dx + 1, cy + dy, M.win, wt === 4 ? 3 : wt); U.dot(E, cx + dx, cy + dy + 1, M.win, Math.max(1, wt - 1)); U.dot(E, cx + dx + 1, cy + dy + 1, M.win, Math.max(1, wt - 1)); U.dot(E, cx + dx, cy + dy - 1, M.conch, 1); U.dot(E, cx + dx + 1, cy + dy - 1, M.conch, 1); }
    U.dot(E, cx + 2, cy - 3, M.win, wt);                                                       // 体螺层上的一扇小圆窗
  }
  // 候选部件：tallCap（高尖帽 + 帽尖挂的贝壳铃串）。(x, y) 帽檐中心；bell 铃串摆 -1..1
  function tallCap(x, y, bell) {
    E.part();
    for (let xx = -3; xx <= 3; xx++) U.dot(E, x + xx, y, M.hat, 0);
    for (let xx = -2; xx <= 2; xx++) U.dot(E, x + xx, y - 1, M.gold, 0);
    U.dot(E, x, y - 1, M.gold, 4);
    const ROWS = [[-2, -2, 2], [-3, -2, 1], [-4, -2, 1], [-5, -2, 0], [-6, -2, 0], [-7, -3, -1], [-8, -3, -1], [-9, -3, -2], [-10, -4, -3]];
    for (const [dy, a, b] of ROWS) for (let xx = a; xx <= b; xx++) U.dot(E, x + xx, y + dy, M.hat, 0);
    U.dot(E, x - 5, y - 11, M.hat, 0); U.dot(E, x - 6, y - 10, M.hat, 0);                      // 帽尖向后折
    U.dot(E, x - 1, y - 4, M.hat, 4); U.dot(E, x - 2, y - 7, M.hat, 4);
    E.part();                                                                                  // 贝壳铃串：从帽尖垂下 3 颗，随 bell 摆
    const bx = x - 6, by = y - 9;
    for (let k = 0; k < 3; k++) { const px = bx - k * bell - (k === 2 ? bell : 0), py = by + 2 + k * 2; U.dot(E, px, py, M.bell, k === 2 ? 4 : 3); U.dot(E, px - 1, py + 1, M.bell, 2); U.dot(E, px, py + 1, M.bell, k === 1 ? 4 : 3); }
  }
  function stalk(x0, y0, x1, y1, far, closed) {
    E.part(); const mat = far ? m.far : m.limb, ex = far ? x1 - 1 : x1, ey = y1 - 1;
    U.seg(E, x0, y0, x1, y1, 1, mat, 0);
    if (closed) { U.dot(E, ex, ey, mat, 0); U.dot(E, ex + 1, ey, mat, 0); U.dot(E, ex, ey + 1, mat, 1); U.dot(E, ex + 1, ey + 1, mat, 1); }
    else { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) U.dot(E, ex + a, ey + b, m.eye, 3); U.dot(E, ex, ey, m.spec, 3); }
  }
  // 候选部件：giantClaw（符文巨螯：掌 + 上下两指 + 指内齿 + 掌上发光符文 + 金色腕节）。本地 u 沿指尖方向、v 垂直；rot 0 朝右 / 1 朝下；
  //   rot 2 朝上（动指在前侧）；(x, y) 掌心、pin 张开 0–3、rl 符文亮度 0–4、crk 裂纹 0–2。也用来烘焙召唤物「巨蟹钳」
  function giantClaw(x, y, rot, pin, rl, crk, mats) {
    const mc = mats.claw, mg = mats.gold, mr = mats.rune, at = (u, v) => (rot === 1 ? [x - v, y + u] : rot === 2 ? [x - v, y - u] : [x + u, y + v]), d = (u, v, mt, t) => { const p = at(u, v); U.dot(E, p[0], p[1], mt, t); };
    E.part();
    for (let v = -4; v <= 4; v++) for (let u = -6; u <= 6; u++) if ((u * u) / 36 + (v * v) / 18 <= 1) d(u, v, mc, 0);   // 掌
    for (let u = 5; u <= 11; u++) { const th = Math.max(1, R(3 - (u - 5) * 0.4)); for (let k = 0; k < th; k++) d(u, 2 - k + (u >= 10 ? -1 : 0), mc, 0); }   // 下指（不动指）
    for (let u = 6; u <= 10; u += 2) d(u, 1 - (u >= 10 ? 1 : 0), mc, 4);                    // 下指齿
    const op = pin * 0.55;
    for (let u = 4; u <= 11; u++) { const q = (u - 4) / 7, vv = -2 - op * q * 3 + q * q * 2.2; d(u, R(vv), mc, 0); if (u < 9) d(u, R(vv) - 1, mc, 0); if (u === 11) d(u, R(vv) + 1, mc, 0); }   // 上指（动指），尖端向下勾
    d(7, R(-2 - op * 1.3 + 0.6) + 1, mc, 4);
    for (let v = -3; v <= 3; v++) d(-5, v, mg, 0); d(-5, -3, mg, 4); d(-4, -4, mg, 0);         // 腕节金镶边
    const rt = rl === 0 ? 1 : rl === 1 ? 2 : rl === 2 ? 3 : 4;
    for (const [u, v] of [[-2, -1], [-1, 0], [0, -1], [1, 0], [-1, 2], [1, 2], [0, -2]]) d(u, v, mr, (u + v) & 1 ? rt : Math.max(1, rt - (rt === 4 ? 0 : 1)));   // 符文
    if (crk) { const CR = [[-6, 0], [-4, 1], [-3, 0], [-1, 1], [0, 3], [2, 2], [3, 3], [2, -3], [4, -2], [6, -1], [8, 1]], n = crk === 1 ? 5 : CR.length; for (let i = 0; i < n; i++) d(CR[i][0], CR[i][1], mc, 1); }
  }
  // 手臂：两节粗臂从壳前伸到腕节（与巨螯分开两个部件）
  function arm(px, py) {
    E.part(); const T = rig.T, sx = R(T.x + T.rx - 1), sy = R(T.y + 1), wx = P.crot === 2 ? px : px - 6, wy = P.crot === 2 ? py + 6 : py, mx = R((sx + wx) / 2 + 1), my = R(Math.max(sy, wy) + 1);
    U.seg(E, sx, sy, mx, my, 3, M.claw, 0); U.seg(E, mx, my, wx, wy, 3, M.claw, 0); U.dot(E, mx, my - 1, M.claw, 4);
  }
  function waterOrb() {
    E.part(); const x = P.gx - P.bx, y = P.gy, g = P.gem, big = g === 2 || g === 3;
    const r2 = big ? 5 : 2;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const q = i * i + j * j; if (q > r2) continue; U.dot(E, x + i, y + j, M.orb, g === 4 ? (q >= r2 - 1 ? 1 : 2) : g === 3 ? 4 : q >= r2 - 1 ? 3 : 2); }
    if (g !== 4) { U.dot(E, x - 1, y - 1, M.orb, 4); if (g >= 1) U.dot(E, x, y, M.orb, g >= 2 ? 4 : 3); }
  }
  function face() {
    const T = rig.T, x = R(T.x + T.rx - 1), y = R(T.y + 1);
    U.dot(E, x, y, m.body, 1); U.dot(E, x, y + 1, m.body, 1); U.dot(E, x - 1, y + 2, m.body, 1);
    for (let k = -4; k <= 3; k++) U.dot(E, R(T.x + k), R(T.y - T.ry + 1), M.gold, k === -3 ? 4 : 3);   // 甲壳前沿金镶边
    if (P.crk >= 2) for (const [a, b] of [[4, -1], [3, 0], [1, -1], [0, 1], [-2, 0]]) U.dot(E, R(T.x + a), R(T.y + b), m.body, 1);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const T = rig.T, top = R(T.y - T.ry), tx = R(T.x), [px, py] = palm();
    G.claw(E, rig, P, o, 1); G.legs(E, rig, P, o, 1);
    spireConch(tx - 6, R(T.y) - 6, P.wl);
    G.legs(E, rig, P, o, 0);
    G.body(E, rig, P, o); face();
    stalk(tx + 1, top, tx - 1, top - 5, 1, P.blink);
    tallCap(tx + 3, top - 1, P.bell);
    stalk(tx + 6, top, tx + 8, top - 5, 0, P.blink);
    arm(px, py); giantClaw(px, py, P.crot, P.pin, P.gem >= 2 ? 4 : P.gem === 1 ? 3 : 2, P.crk, M);
    waterOrb();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 召唤物「巨蟹钳」（呼应 Pincer）：朝下的巨钳 + 从裂隙垂下的臂，预烘焙 张开 / 合拢 两帧 ─────
  const PIN_BAKE = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  function bakePincer(pin) {
    const s = new Sprite(28, 40, 14, 38); begin(s, 0, 0);
    E.part(); U.seg(E, 0, -37, 0, -24, 4, M.claw, 0); U.dot(E, -1, -30, M.claw, 4); U.seg(E, -2, -26, 2, -26, 1, M.gold, 0);
    giantClaw(0, -18, 1, pin, 3, 0, M); bake(s, PIN_BAKE); return s;
  }
  const PINCER = [bakePincer(3), bakePincer(0)];
  function blitOut(s, X, Y, dq) { const ob = s.out; for (let y = 0; y < s.h; y++) { const yy = Y - s.oy + y; if (yy > FLOOR) continue; for (let x = 0; x < s.w; x++) { const c = ob[y * s.w + x]; if (c === 255 || (dq && E.B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, yy, c); } } }
  // 水影钳：同一个巨钳的剪影，按明暗换成海水青色阶（攻击时出现在假人身上）
  const WMAP = new Uint8Array(256).fill(EL[2]); [[44, 3], [45, 2], [46, 1], [47, 0], [20, 3], [19, 2], [14, 1], [5, 0], [0, 4], [25, 1], [24, 0], [43, 0], [21, 0]].forEach(([i, k]) => { WMAP[i] = EL[k]; });
  function blitWater(s, X, Y, dq) { const ob = s.out; for (let y = 0; y < s.h; y++) { const yy = Y - s.oy + y; if (yy > FLOOR) continue; for (let x = 0; x < s.w; x++) { const c = ob[y * s.w + x]; if (c === 255 || (dq && E.B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(X - s.ox + x, yy, WMAP[c]); } } }
  function bakeSide(pin) { const s = new Sprite(32, 20, 16, 16); begin(s, 0, 0); giantClaw(0, -8, 0, pin, 2, 0, M); bake(s, PIN_BAKE); return s; }
  const SIDE = [bakeSide(3), bakeSide(1), bakeSide(0)];

  // ───── 特效 ─────
  const RX = DUMMY_X, RY = HY - 44;                                                             // 裂隙位置：假人正上方
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, atkT = 9;
  const orbScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = orbScr();
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 16, 40, 100, 0.25, 0.5, R_EL, 8); burst(RX, RY, 16, 40, 100, 0.25, 0.5, FXI.magic, 4);
      ring(RX, RY, 1, R_EL); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                           // 巨螯隔空一夹：假人身上的水影钳同一帧合拢
      atkT = 0; const [px, py] = palm(), sx = scrX(px + 8 + P.bx), sy = HY + py;
      burst(sx, sy, 6, 25, 60, 0.15, 0.3, R_EL, 4); burst(DUMMY_X - 2, HY - 16, 12, 40, 100, 0.15, 0.4, R_EL, 10); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.6 }); sfx('hit', { mat: 'magic', w: 0.6 });
    }
    if (s === CAST && t === T_SLAM) {                                                            // 巨钳砸落合拢：大水花外爆 + 地裂 + 冲击环，目标大摇击退
      burst(DUMMY_X, HY - 14, 34, 60, 150, 0.3, 0.7, R_EL, 18); ring(DUMMY_X, HY - 12, 1, R_EL); fx.crack(DUMMY_X - 14, FLOOR, 28, 1, R_EL, 0.9);
      hitDummy(1, 1); dummyFx({ dur: 0.9, sink: 1 }); shake(0.14, 2); flash(0.04);
      for (let i = 0; i < 10; i++) spawn(K_DUST, DUMMY_X - 10 + Math.random() * 20, FLOOR - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 14, 0.4 + Math.random() * 0.3, FXI.dust);
      sfx('impact', { pal: 'water', w: 0.85 });
    }
    if (s === DEATH && t === T_CRACK) {                                                          // 碎裂：从巨螯那边炸开
      poseAt(DEATH, T_CRACK - 1 / 60, E.simT); drawHero(); bakeHero();
      const [px, py] = palm(); death.start('chunks', { chunk: 4, power: 1.05, fromX: px + 2, fromY: py, push: -12, fadeAt: 1.0, fadeDur: 0.6 }); hero.k1 = hero.k2 = -1;
      burst(scrX(px), HY + py, 14, 40, 100, 0.25, 0.5, FXI.magic, 10); shake(0.16, 2);
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_SLAM], [], [], [T_CRACK], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = orbScr();
    if (state === CHARGE) {                                                                      // 水球里的光点被吸进裂隙；裂隙周围水色螺旋收拢
      chargeAcc += dt * (18 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1;
        if (Math.random() < 0.5) { const life = 0.45 + Math.random() * 0.2; spawnX(K_PHYS, gx + (Math.random() - 0.5) * 3, gy + (Math.random() - 0.5) * 3, (RX - gx) / life, (RY - gy) / life - 40 * life, life, R_EL, { g: 80 }); }
        else { const a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, RX, RY, 10 / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a, r: 13, w: 5, squash: 0.4 }); }
      }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.gf === 0 ? 12 : -10) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.6 }); } lastGf = P.gf; }
    if ((state === IDLE || state === RECOVER) && P.dq < 1) { emberAcc += dt * (state === IDLE ? 1.6 : 5); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 2, Math.random() * 6 - 3, -7 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    atkT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; atkT = 9; }
  // 裂隙：水色螺旋椭圆 + magic 紫描边；q 0–1 张开程度
  function rift(q, f12) {
    if (q <= 0) return; const rx = 3 + 9 * q, ry = 1 + 3 * q, n = Math.ceil(rx * 6);
    for (let k = 0; k < n; k++) { const a = k / n * 6.2832, x = R(RX + Math.cos(a) * rx), y = R(RY + Math.sin(a) * ry); put(x, y, ((k + f12) % 4) === 0 ? ML[1] : ML[3]); put(x, y + (Math.sin(a) > 0 ? 1 : -1), ML[4]); }
    for (let k = 0; k < 18; k++) { const th = k / 18 * 9 + f12 * 0.7, r = (k / 18) * 0.85; put(R(RX + Math.cos(th) * rx * r), R(RY + Math.sin(th) * ry * r), k > 12 ? EL[3] : k > 6 ? EL[2] : EL[1]); }
    put(RX, RY, EL[0]); if (q > 0.6) { put(R(RX - rx - 1), RY, ML[0]); put(R(RX + rx + 1), RY, ML[0]); }
  }
  function riftQ() { const st = E.state, t = E.stT; if (st === CHARGE) return ease.out(clamp01((t - 0.15) / 0.9)); if (st === CAST) return 1; if (st === RECOVER) return 1 - ease.in(clamp01(t / 0.5)); return 0; }
  // 巨蟹钳：施放 0–0.1 从裂隙伸出下落（张开）→ 0.1 砸到假人合拢 → 收招里举起示威（开合两下），0.45 s 后抖动消散
  function pincer(f12) {
    const st = E.state, t = E.stT;
    if (st === CAST) {
      if (t < T_SLAM) { const q = t / T_SLAM, y = R(RY + 4 + (HY - 6 - RY - 4) * q); blitOut(PINCER[0], RX, y); return; }
      blitOut(PINCER[t < T_SLAM + 2 / 12 ? 1 : ((f12of(t) >> 1) & 1)], RX, HY - 6 - (t > 0.3 ? 2 : 0));
      return;
    }
    if (st === RECOVER) { const y = HY - 8 - R(Math.min(4, t * 20)), dq = t > 0.45 ? (t - 0.45) / 0.25 : 0; blitOut(PINCER[(f12of(t) >> 1) & 1], RX, y, dq); }
  }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {
    if (atkT < 0.42) { const k = atkT < 1 / 12 ? 0 : atkT < 3 / 12 ? 2 : 2, dq = atkT > 0.25 ? (atkT - 0.25) / 0.17 : 0; blitWater(SIDE[atkT < 1 / 12 ? 1 : k], DUMMY_X - 9, HY - 8, dq); }   // 水影钳在假人身上合拢
  }
  function fxFront(f12) {
    const [gx, gy] = orbScr();
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (atkT < 2 / 12) { const [px, py] = palm(), sx = scrX(px + 12 + P.bx), sy = HY + py - 1, c = atkT < 1 / 12 ? EL[0] : EL[2]; for (let k = -3; k <= 3; k++) { if (atkT >= 1 / 12 && (k & 1)) continue; put(sx + R(Math.abs(k) * 0.5), sy + k, c); } }   // 巨螯合拢的咬合弧
    rift(riftQ(), f12);
    pincer(f12);
  }

  return {
    name: '蟹巫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.orb, M.rune, M.win], HIT_POINT, EVENTS, deathKit: { mode: 'chunks', at: T_CRACK },
    SFX: { body: 'armor', how: 'shatter', pal: 'water', style: 'summon', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
