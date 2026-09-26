// 白狼（部队 · 恶魔 · 先锋（擅长防御）· 稀有 · 近战 272；升级 → 雪狼王）：高腿修长的雪狼，灰白雪毛、胸前一圈厚雪毛领，
//   一条巨大蓬松的雪尾高高卷过背像一面盾（尾尖挂冰晶），两侧肩胛各长出一丛冰晶棱刺像肩甲，耳后一对后弯的冰晶小角，额头一枚冰蓝菱形晶斑。
// 攻击「扫」：原地半转身，用结冰的巨尾横扫目标（同族狼里唯一不用嘴 / 爪的）。
// 技能「寒冬之触」（被动光环：周围敌人攻速降低、每秒受到技能伤害）：压低身体呼出白雾，脚下雪花点阵一圈圈铺开，肩棱亮起；
//   施放时雪色点阵护罩从自身向外扩成大环，雪粒顺环飘出；假人被罩上一圈霜边、变慢，头顶飘下冰屑、隔 0.3 秒冒一颗冻伤小十字。
// 受击顺带表现「敏捷之足」（闪避 +25%）：原位留下一道雪色残影。
// 死亡：侧倒，风雪斜吹过来一层层把身体埋进雪堆，尾尖冰晶弹落，雪堆再从上往下被吹散。
// 身体用 parts-beast 的 quad 拼（canine 头、ruff 雪毛领）；卷背巨尾、冰棱丛、冰角、晶斑、雪毛围兜、雪埋是本模块的候选部件。
PCD.define('WhiteWolf', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_STILL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('snow', ['#ffffff', '#eef4ff', '#bcd0ea', '#7a8cae', '#3a4462']), EL = FXR[R_EL];   // 雪 · 冰灰蓝（升级线共用）
  const R_FUR = fxRamp('whiteWolfFur', [21, 17, 60, 59, 8]);                                           // 受击雪毛屑
  const SNOWFUR = [8, 60, 17, 21];                                                                     // 雪毛领 / 巨尾 / 吻部：比身体亮一级
  const m = B.mats(E, {
    main: 'pale', mane: SNOWFUR, muz: SNOWFUR, belly: SNOWFUR,                                         // 灰白雪毛（pale）· 雪毛领
    ice: 'sky', mark: [39, 40, 22, 21], eye: [0, 0, 23, 23], glow: [22, 22, 21, 21], teeth: 'white',  // 冰棱 / 角 · 额心晶斑 · 冰蓝眼
  });
  m.tail = E.defMat(SNOWFUR, 2);                                                                       // 巨尾面积大：band 2
  m.iceFar = E.defMat([39, 40, 40, 41], 1);                                                            // 远侧冰棱暗一级
  m.drift = E.defMat([EL[4], EL[2], EL[1], 21], 1);                                                    // 雪堆（死亡掩埋）
  const HEAD = { type: 'canine', w: 6, h: 5, snout: 4.2, snH: 3, tip: 0.6, earH: 3 };
  const SHAPE = { len: 13, chest: 5, rump: 4, waist: 0.45, hump: 0, leg: 8, lw: 2, thigh: 2.3, farDx: -2, stride: 3, lift: 3,
    neck: 3.2, neckA: 0.75, neckW: 2.6, head: HEAD, headA: 0.12, tail: 'none', mane: 'ruff', maneLen: 2, foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);
  const TW = 5.6;                                                                                      // 巨尾粗（直径）

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 58, 48, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'mark', 'ink', 'teeth', 'spec']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['tp', 0, 4], ['snow', 0, 4]]);                                  // tp 尾姿 · snow 雪埋层数
  const P = {};
  function reset() { Q.reset(P); P.tp = 0; P.snow = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'glow', 'tp', 'flip'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, glow: 0, tp: 0, flip: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12;
  // 攻击逐帧：压低举尾 → 半转身、冰尾水平横扫（出手）→ 扫过下垂 → 转回 → 收
  const ATK = [REST,
    pose({ crouch: 1, pitch: -1, head: 1, ear: 1, tp: 1, tail: 1, bx: 1 }),
    pose({ flip: 1, bx: -5, crouch: 1, head: 1, ear: 1, tp: 2, mane: 1 }),
    pose({ flip: 1, bx: -5, crouch: 1, head: 1, tp: 3, mane: -1, tail: -1 }),
    pose({ flip: 1, bx: -4, tp: 3, tail: 1 }),
    pose({ bx: 0, crouch: 1, head: 1, tp: 1, tail: -1 }),
    pose({ crouch: 1, tail: 1 }), pose({ tail: 0 }), REST];
  const C_LOW = pose({ crouch: 2, pitch: -1, head: 1, jaw: 1, ear: 1, mane: 1, glow: 1 });              // 压低呼白雾
  const S_UP = pose({ pitch: 1, head: -1, jaw: 2, mane: -1, glow: 3, tp: 1, tail: 1 });                 // 挺身、雪尾炸开
  const S_HOLD = pose({ head: -1, jaw: 1, glow: 2, tail: 0 });
  // 待机个性「抖雪」：[pitch, mane, head, ear, tail] 逐帧，抖身甩掉背上的雪
  const SHAKE = [[1, 1, -1, 1, 2], [-1, -1, 1, 0, -2], [1, 1, -1, 1, 2], [-1, -1, 1, 0, -2], [0, 1, 0, 0, 1], [0, 0, 0, 0, 0]];
  const T_SHAKE = 1.5;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= T_SHAKE - 1e-6 && lp < T_SHAKE + 0.5 - 1e-6) { const s = SHAKE[Math.min(5, f12of(lp - T_SHAKE))]; P.pitch = s[0]; P.mane = s[1]; P.head = s[2]; P.ear = s[3]; P.tail = s[4]; P.bob = 0; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.head = 0; P.tail = [-1, 0, 1, 0][P.gf]; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 轻盈小跑：头平、不点头
    else if (st === ATTACK) { apply(ATK[Math.min(ATK.length - 1, f12of(tq))]); P.rim = tq >= 1 / 12 && tq < 4 / 12 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      if (tq > 0.45) P.glow = tq > 1.0 ? 2 : ((f12 & 1) ? 2 : 1);
      if (tq > 1.1) { P.mane = (f12 & 1) ? 1 : -1; P.tail = (f12 & 1) ? 1 : 0; }                     // 最后 0.3 秒：毛领、尾巴被寒风吹得抖
      P.rim = 2;
    } else if (st === CAST) {
      apply(tq < 2 / 12 ? S_UP : S_HOLD); P.rim = tq < 3 / 12 ? 3 : 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_HOLD, REST, q, F_ALL); apply(tmp);
      P.glow = q < 0.35 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.tp = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, DROP);                                                                  // 侧倒伸腿；尾尖冰晶弹落
        if (P.lie === 2) P.tp = 4;
        P.snow = d < 0.8 ? 0 : d < 0.95 ? 1 : d < 1.1 ? 2 : d < 1.3 ? 3 : 4;                            // 风雪一层层掩埋
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    const sh = shardBase(rig); P.gx = R(sh[0]) + P.bx; P.gy = R(sh[1]) - 3;                           // 发光体 / 轮廓光源：近侧肩棱尖
    B.key(P, SPEC);
  }
  const DROP = { at: 0.66, dur: 0.25, dx: -9, hop: 4 };

  // ───── 画 ─────
  // 尾姿：[起始角（从正后方量，+ 往上）, 总卷曲角, 节数]。0 卷过背 · 1 高举 · 2 水平横扫 · 3 扫过下垂 · 4 贴地
  const TAILS = [[1.0, 2.0, 12], [1.35, 0.8, 12], [0.02, 0, 13], [-0.3, 0.55, 12], [-0.05, 0.12, 12]];
  const TP_X = new Float32Array(16), TP_Y = new Float32Array(16), TP_R = new Float32Array(16);
  // 候选部件：卷背巨尾 curlTail 的几何（纯函数）：从尾根按尾姿一节节走，越往尖越卷；返回节数，坐标写进 TP_*（尾尖 = 最后一节）
  function tailPts(rg, tp, sway) {
    const T = TAILS[tp], n = T[2]; let x = rg.tail.x + 0.5, y = rg.tail.y, a = T[0];
    for (let k = 0; k <= n; k++) {
      const q = k / n; TP_X[k] = x; TP_Y[k] = y; TP_R[k] = TW * 0.5 * (0.5 + 0.62 * Math.sin(PI * (0.08 + 0.8 * q)));
      a += T[1] * (0.4 + 1.2 * q) / n + sway * 0.05 * q;
      x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) y = -0.5;
    }
    return n;
  }
  // 候选部件：卷背巨尾 curlTail —— 一串由细到粗再收尖的圆（一个部件），内侧每 3 节一道暗毛纹；crystal 1 = 尾尖挂冰晶（同一部件）
  function curlTail(rg, crystal) {
    E.part(); const n = tailPts(rg, P.tp | 0, P.tail | 0);
    for (let k = 0; k <= n; k++) U.disc(E, TP_X[k], TP_Y[k], TP_R[k], m.tail, 0);
    for (let k = 2; k < n - 1; k += 3) U.dot(E, TP_X[k] + 0.5, TP_Y[k] + TP_R[k] * 0.4, m.tail, 2);
    for (let k = 3; k < n - 2; k += 3) U.dot(E, TP_X[k] - 0.5, TP_Y[k] - TP_R[k] * 0.5, m.tail, 4);
    if (crystal) tailCrystal(TP_X[n], TP_Y[n], rg.lie === 2);
  }
  // 候选部件：尾尖冰晶 icicleTip —— 3–4 格的小冰棱（倒挂 / 贴地横放）
  function tailCrystal(x, y, flat) {
    if (flat) { U.dot(E, x - 1, y, m.ice, 3); U.dot(E, x - 2, y, m.ice, 4); U.dot(E, x - 1, y - 1, m.ice, 2); return; }
    U.dot(E, x, y + 1, m.ice, 3); U.dot(E, x + 1, y + 1, m.ice, 2); U.dot(E, x, y + 2, m.ice, 3); U.dot(E, x, y + 3, m.ice, 4);
  }
  // 肩胛冰棱丛的根：近侧肩胛（胸圆心往后 3 格的背线上）
  function shardBase(rg) { const x = rg.C1.x - 3, s = Q.span(rg, o, R(x)); return [x, s ? s[0] + 1 : rg.C1.y - rg.C1.r]; }
  // 候选部件：冰棱丛 iceShards —— 从 (x, y) 往上扇开几根冰棱（一个部件）：每根根部 2 格宽、收成 1 格尖，尖端亮；
  //   spec = [[根部横移, 长, 每格横移（负 = 往后倒）], ...]
  const SHARDS = [[-2, 3, -0.45], [0, 4, -0.2], [2, 3, 0.15]];
  function iceShards(x, y, spec, mat) {
    E.part();
    for (const [dx, L, s] of spec) for (let k = 0; k < L; k++) { const px = x + dx + s * k, py = y - k; U.dot(E, px, py, mat, k === L - 1 ? 4 : 0); if (k < L - 1) U.dot(E, px + 1, py, mat, k === 0 ? 2 : 0); }
  }
  // 候选部件：冰角 + 额心晶斑（紧跟 quad.head 画，同一个部件）：耳后一只后弯 2 格的冰晶小角，额头一枚菱形晶斑（glow 档变亮，死亡熄灭）
  function headIce(rg) {
    const F = Q.headFrame(rg, o, P.jaw), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), ex = R(eb[0]), ey = R(eb[1]);
    U.dot(E, ex - 2, ey, m.ice, 0); U.dot(E, ex - 3, ey - 1, m.ice, 0); U.dot(E, ex - 4, ey - 1, m.ice, 3); U.dot(E, ex - 5, ey - 2, m.ice, 4);
    const c = F.at(F.W * 0.05, -F.Hh * 0.62), cx = R(c[0]), cy = R(c[1]), lv = P.eyes && P.lie ? 1 : P.glow >= 2 ? 4 : 3;
    U.dot(E, cx, cy, m.mark, lv); U.dot(E, cx, cy - 1, m.mark, lv === 4 ? 3 : 2); U.dot(E, cx - 1, cy, m.mark, 2);
  }
  // 候选部件：雪毛围兜 chestBib（紧跟 quad.mane 画）：颈圈毛往下垂到胸前，下沿参差，胸前轮廓更厚
  function chestBib(rg) {
    if (rg.lie === 2) return; const C1 = rg.C1;
    for (let i = 0; i < 4; i++) { const x = R(C1.x + 1.5 + i), y1 = R(C1.y + 1 + ((i & 1) ? 0 : 1) + (i < 2 ? 1 : 0)); for (let y = R(C1.y - 2); y <= y1; y++) U.dot(E, x, y, m.mane, y === y1 ? 2 : 0); }
  }
  // 候选部件：雪埋 snowDrift —— 读缓冲里已画好的剪影，逐列从顶往下盖 lv 层雪；迎风的左侧堆出斜坡，lv 4 整个盖成一座雪丘（一个部件）
  const TOPC = new Int16Array(hero.w);
  function snowDrift(lv) {
    const s = hero, w = s.w, h = s.h, M = s.mat; let xs = -1, xe = -1;
    for (let x = 0; x < w; x++) { TOPC[x] = -1; for (let y = 0; y < h; y++) if (M[y * w + x]) { TOPC[x] = y; if (xs < 0) xs = x; xe = x; break; } }
    if (xs < 0) return; E.part();
    const lx = (bx) => bx - s.ox - P.bx, ly = (by) => by - s.oy, dep = [0, 1, 2, 3, 99][lv];
    for (let x = xs - lv - 1; x <= xe + (lv >= 3 ? 2 : 0); x++) {
      let top = x >= 0 && x < w ? TOPC[x] : -1;
      if (lv >= 3) { let env = 999; for (let k = -3; k <= 3; k++) { const t = TOPC[x + k]; if (x + k >= 0 && x + k < w && t >= 0 && t < env) env = t; } if (env < 999) top = top < 0 ? env + 2 : Math.min(top, env + 1); }   // 雪丘外包：腿间也填满
      if (x < xs) top = s.oy - Math.max(0, lv - (xs - x));                                              // 迎风坡
      if (top < 0) continue;
      const y1 = lv >= 4 || x < xs ? s.oy : top + dep - 1;
      for (let y = top; y <= Math.min(y1, s.oy); y++) { if (lv < 3 && !M[y * w + x] && x >= xs) continue; if (lv === 1 && ((x + 40) % 4) === 3) continue; U.dot(E, lx(x), ly(y), m.drift, y === top ? 4 : 0); }
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lie2 = rig.lie === 2, sb = shardBase(rig);
    if (!lie2) Q.legs(E, rig, P, o, 1);
    curlTail(rig, !P.drop);
    if (!lie2) iceShards(R(sb[0]) - 2, R(sb[1]) - 1, SHARDS, m.iceFar);                               // 远侧肩棱（只露出背线以上）
    Q.body(E, rig, P, o);
    if (!lie2) { Q.legs(E, rig, P, o, 0); iceShards(R(sb[0]), R(sb[1]), SHARDS, m.ice); }
    Q.mane(E, rig, P, o); chestBib(rig);
    Q.head(E, rig, P, o); headIce(rig);
    if (lie2) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.drop) { E.part(); const n = tailPts(rig, 4, 0); tailCrystal(TP_X[n] + P.dsx, P.drop === 2 ? -0.5 : Math.min(-0.5, TP_Y[n] - P.dsy), P.drop === 2); }
    if (P.snow) snowDrift(P.snow | 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 残影（敏捷之足：受击时原位留下一道雪色剪影）─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  function makeGhost() {
    const keep = { rim: RIM.rim, flash: RIM.flash, dq: RIM.dq };
    poseAt(IDLE, 0, 0); drawHero(); RIM.rim = 0; RIM.flash = 0; RIM.dq = 0; bake(hero, RIM); copySprite(ghost, hero);
    Object.assign(RIM, keep); hero.k1 = hero.k2 = -1;
  }

  // ───── 特效 ─────
  const T_RINGS = [0.1, 0.45, 0.8, 1.15], T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_AURA = 3 / 12;
  let chargeAcc = 0, breathAcc = 0, soulAcc = 0, windAcc = 0, crumbAcc = 0, lastGf = -9, lastShake = -1, auraT = 9, auraX = 0, ghostT = 9, frostT = 9, crossT = 0;
  const mouthScr = () => [scrX(R(rig.mouth[0]) + P.bx), HY + R(rig.mouth[1])];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); auraX = scrX(0); auraT = 0;
      releaseOrbit(30, 70, 0.3, 0.6, { up: 20 });
      fx.dome(auraX, HY, 15, 15, R_EL, 0.4, 2);                                                         // 贴身的雪色点阵护罩
      burst(scrX(P.gx), HY + P.gy, 14, 30, 80, 0.25, 0.5, R_EL, 10);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                                  // 冰尾横扫：雪色扫弧 + 冰屑
      const cx = scrX(R(rig.tail.x) + P.bx), cy = HY + R(rig.tail.y);
      fx.slash(cx, cy, 13, PI * 0.3, PI * 0.72, R_EL, 0.18, 2, 2);
      burst(DUMMY_X - 4, HY - 14, 10, 40, 90, 0.15, 0.35, FXI.impact, 8); burst(DUMMY_X - 4, HY - 14, 8, 30, 70, 0.2, 0.45, R_EL, 8);
      hitDummy(0, 1); sfx('swing', { kind: 'slash', w: 0.45 }); sfx('hit', { mat: 'flesh', w: 0.45 });
    }
    if (s === CHARGE && T_RINGS.indexOf(t) >= 0) {                                                     // 脚下雪花点阵一圈圈往外铺
      const k = T_RINGS.indexOf(t), r = 9 + k * 6;
      fx.circle(scrX(0), FLOOR, r, r * 0.22, R_EL, 0.95, k & 1 ? -1 : 1, 0);
    }
    if (s === CAST && t === 2 / 12) fx.dome(auraX, HY, 24, 21, R_EL, 0.35, 2);
    if (s === CAST && t === T_AURA) {                                                                   // 大环扫过假人：霜边 + 变慢 + 冰屑
      dummyFx({ dur: 2.2, outline: R_EL, slow: 0.6 }); hitDummy(1, 1); frostT = 0; crossT = 0.3;
      burst(DUMMY_X - 2, HY - 16, 18, 30, 90, 0.3, 0.6, R_EL, 8); fx.cross(DUMMY_X - 1, HY - 16, 5, R_EL, 0.3, 2);
      shake(0.12, 1); sfx('impact', { pal: 'frost', w: 0.45 });
    }
    if (s === HURT && t === INCOMING) {
      makeGhost(); ghostT = 0;
      burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 7, 30, 80, 0.2, 0.4, R_FUR, 12);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, R_EL);
      shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_HIT], T_RINGS, [2 / 12, T_AURA], [], [INCOMING], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const [mx, my] = mouthScr(), gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      chargeAcc += dt * (10 + 14 * clamp01(stT / DUR[CHARGE]));                                        // 雪粒绕肩棱汇聚
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.3) { breathAcc += dt * 16; while (breathAcc >= 1) { breathAcc -= 1; spawnX(K_DUST, mx + 1, my, 5 + Math.random() * 10, -1 - Math.random() * 4, 0.7 + Math.random() * 0.5, R_EL, { age0: 0.15 }); } }   // 呼出的白雾
    }
    if (state === CAST && auraT < 0.4 && Math.random() < dt * 90) {                                    // 雪粒顺环往外飘
      const q = auraT / 0.45, rx = 6 + ease.out(q) * 40, a = Math.random() * 6.2832;
      spawn(K_BURST, auraX + Math.cos(a) * rx, FLOOR - 1 - Math.abs(Math.sin(a)) * rx * 0.5, Math.cos(a) * 30, -10 - Math.random() * 12, 0.35 + Math.random() * 0.3, R_EL);
    }
    if (frostT < 2.0) {                                                                                 // 冻伤：头顶飘冰屑、每 0.3 秒一颗小十字
      crumbAcc += dt * 9; while (crumbAcc >= 1) { crumbAcc -= 1; spawnX(K_PHYS, DUMMY_X - 5 + Math.random() * 10, HY - 34 - Math.random() * 4, (Math.random() - 0.5) * 6, 6 + Math.random() * 6, 0.9 + Math.random() * 0.4, R_EL, { g: 14, floor: FLOOR - 1 }); }
      crossT += dt; if (crossT >= 0.3) { crossT -= 0.3; fx.cross(DUMMY_X - 4 + R(Math.random() * 8), HY - 8 - R(Math.random() * 14), 2, R_EL, 0.25, 2); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                            // 轻盈小跑：不扬尘，落脚处闪一颗雪晶
      if (P.gf === 0 || P.gf === 2) {
        const L = rig.legs[P.gf === 0 ? 3 : 2], x = scrX(R(L.F[0]) + P.bx + 1);
        spawn(K_STILL, x, HY, 0, 0, 0.3, R_EL); spawn(K_STILL, x - 1, HY, 0, 0, 0.16, R_EL); spawn(K_STILL, x + 1, HY, 0, 0, 0.16, R_EL); spawn(K_STILL, x, HY - 1, 0, 0, 0.16, R_EL);
        sfx('step', { w: 0.3 });
      }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                                               // 抖雪：背上的雪屑四散
      const lp = q12(stT % DUR[IDLE]), k = lp >= T_SHAKE - 1e-6 && lp < T_SHAKE + 0.34 ? f12of(lp - T_SHAKE) : -1;
      if (k >= 0 && k !== lastShake) { const c = rig.C1, c2 = rig.C2; for (let i = 0; i < 5; i++) { const lx = c2.x + Math.random() * (c.x - c2.x); spawn(K_BURST, scrX(R(lx)), HY + R(c.y - c.r) - 1, (Math.random() - 0.5) * 50, -20 - Math.random() * 25, 0.4 + Math.random() * 0.3, R_EL); } }
      lastShake = k;
    }
    if (state === DEATH && stT > INCOMING + 0.5 && stT < INCOMING + 1.5) {                              // 风雪斜吹过来
      windAcc += dt * 40; while (windAcc >= 1) { windAcc -= 1; spawn(K_DUST, HX - 30 + Math.random() * 20, HY - 22 - Math.random() * 12, 40 + Math.random() * 30, 16 + Math.random() * 10, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {                              // 雪堆被吹散（往右上飘）+ 魂光
      soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 28, HY - 1 - Math.random() * 8, 12 + Math.random() * 20, -10 - Math.random() * 14, 0.7 + Math.random() * 0.6, Math.random() < 0.7 ? R_EL : FXI.soul); }
    }
    if (state === RECOVER && stT < 0.4 && Math.random() < dt * 8) spawnX(K_DUST, mx + 1, my, 3 + Math.random() * 5, -2, 0.5, R_EL, { age0: 0.2 });
    auraT += dt; ghostT += dt; frostT += dt;
  }
  function fxReset() { chargeAcc = 0; breathAcc = 0; soulAcc = 0; windAcc = 0; crumbAcc = 0; lastGf = -9; lastShake = -1; auraT = 9; ghostT = 9; frostT = 9; crossT = 0; }
  // 扩散的雪色点阵大环：地面扁椭圆（后半在角色后、前半在前）+ 上半圆点阵护罩，一起往外扩
  function aura(front, f12) {
    if (auraT >= 0.45) return; const q = auraT / 0.45, rx = 6 + ease.out(q) * 40, ry = rx * 0.25, dh = Math.min(26, rx * 0.6);
    const c = q < 0.15 ? EL[0] : q < 0.4 ? EL[1] : q < 0.7 ? EL[2] : EL[3], n = Math.ceil(rx * 3.2);
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.2832, s = Math.sin(a); if (front ? s < 0 : s >= 0) continue; if (q > 0.55 && ((k + f12) & 1)) continue;
      put(R(auraX + Math.cos(a) * rx), R(FLOOR - 1 + s * ry), c);
    }
    if (!front) return;
    for (let k = 0; k <= n / 2; k += 2) { if (q > 0.5 && ((k >> 1) + f12) % 3 === 0) continue; const a = PI + k / (n / 2) * PI; put(R(auraX + Math.cos(a) * rx), R(FLOOR - 1 + Math.sin(a) * dh), q < 0.3 ? EL[1] : EL[2]); }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); aura(false, f12); }
  function fxMid(f12) { if (ghostT < 0.3 && E.state === HURT) blitShape(ghost, HX + 2, HY, 0, ghostT < 0.1 ? EL[1] : EL[2], ghostT < 0.1 ? 0 : (ghostT - 0.1) / 0.2); }
  function fxFront(f12) { aura(true, f12); }

  return {
    name: '白狼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.mark], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'frost', style: 'shield', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
