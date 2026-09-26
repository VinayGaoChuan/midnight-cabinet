// 蓝龙（部队 · 僵尸 · 法师 · 史诗）：飞鹰升级而来——「长成龙的那只鹰」。修长、羽质、轻盈的蓝羽龙，一直悬在离地 6 格的半空：
// 龙头但吻尖是骨白鹰式下钩喙，头顶还是那 3 根后掠羽冠（长成 6 格蓝羽冠，冠尖带静电）；一对高举的蓝色羽翼，初级飞羽仍缺 2 根、露出白色翼指骨，缺口间跳电弧；
// 细长 S 形长尾，尾端张开一把鹰式扇形尾羽；胸侧肋窗变大，4 根白肋骨后面是一颗发光的风暴核心（法师的发光体，原来钱袋的位置）；鹰爪（长在腹部中段，和飞鹰的腿一个位置）是骨黄色，爪腕套着当年钱袋的铜扣环。
// 攻击：俯冲爪击（下压 4 格前冲、鹰爪前伸耙抓，3 道平行爪痕）；技能「闪电打击 · 闪电锁链」：盘身上升、头顶聚起雷云 → 仰头再前探张嘴，
// 闪电从口中直劈假人，再依次跳向另外 4 个目标（共 5 次）。死亡：风暴核心过载，肋窗闪白 3 次后爆裂，碎块连同蓝羽四散。
// 身体用 parts-beast 的 quad 骨架（躯干 + 颈、头、前腿）；立起的羽翼、S 形扇尾、鹰爪腿、钩喙、羽冠、肋窗核心在本模块里画（通用的标了「候选部件」）。
PCD.define('BlueDragon', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, ramp, fxRamp, hash, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, sfx, death, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const ZSKIN = ramp(['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682']);                     // 尸绿灰（僵尸族共用；这里只露在肋窗的烂肉里）
  const SKY = [0, 40, 41, 23];                                                           // 蓝羽鳞：sky 的暗 / 基 / 亮，勾线换墨色（夜空里剪影才读得出来）
  const m = B.mats(E, {
    main: SKY, belly: 'blue', feather: [0, 39, 40, 41], covert: SKY, bone: 'bone', beak: 'bone', claw: 'bone', tar: 'sand', ring: 'gold', crest: [0, 40, 41, 23],
    eye: [0, 0, 22, 21], rot: ZSKIN,
  });
  m.tarFar = E.defMat([20, 61, 61, 62], 1);                                              // 远侧跗骨暗一级
  m.covertFar = E.defMat([0, 39, 40, 41], 1);                                            // 远翼覆羽暗一级
  m.featherFar = E.defMat([0, 39, 39, 40], 1);                                           // 远翼飞羽再暗一级
  m.tip = E.defMat([0, 40, 41, 23], 1);                                                  // 飞羽 / 尾羽的亮尖（浅蓝，不用静电的青色）
  m.core = E.defMat([40, 23, 22, 21], 1, 1);                                             // 风暴核心（发光体，手工 tone 1–4）
  m.spark = E.defMat([0, 22, 22, 21], 1, 1);                                             // 羽冠尖的静电（发光；勾线用墨色，不然冠尖外面会包一圈青）
  const R_EL = FXI.bolt, EL = FXR[R_EL];                                                  // 雷电：白 → 淡金 → 青 → 蓝 → 深蓝
  const R_FEATHER = fxRamp('blueFeather', [21, 41, 23, 40, 39]);                         // 蓝羽碎屑
  const R_CLOUD = fxRamp('boltCloud', [21, 22, 23, 40, 39]);                             // 雷云（bolt 的暗端：蓝 → 深蓝 → 墨蓝）

  // ───── 形体 ─────
  const OX = -9;                                                                         // 整条龙往后挪 9 格：站位点落在胸前，吻尖不戳进假人
  const WING = { span: 18, chord: 8, fingers: 5, missing: [1, 2] };                      // 单翼 18 格（翼展约 36）；5 根初级飞羽缺第 2、3 根
  const TAIL = { len: 16, w0: 3.4, amp: 2.2, fan: 5 };
  const o = Q.shape({ len: 9, chest: 3.5, rump: 3, waist: 0.35, hump: 0, leg: 2, lw: 2, thigh: 1.8, farDx: -2, neck: 6, neckA: 1.15, neckW: 1.6,
    head: { type: 'dragon', w: 6, h: 5, snout: 3, snH: 3, tip: 0.9, horn: null, teeth: 1 }, headA: 0.12, tail: 'none', mane: 'none', fur: 1, pattern: null, foot: 'claw', m });
  const LIFT = 4, HX = 76, PIVOT = -14, DUR = DEFAULT_DUR.slice();                     // PIVOT：吻尖到尾尖的中点（相对站位点）                                    // 胸底离地 = leg 2 + lift 4 = 6 格
  const hero = new Sprite(104, 62, 64, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 9, 13], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'core', 'spark', 'beak', 'bone', 'boneFar', 'claw', 'tar', 'tarFar', 'ring', 'rot', 'feather', 'featherFar', 'covertFar', 'tip', 'crest']) if (m[k] != null) RIM.skip[m[k]] = 1;
  // 翼姿（本模块自己的表）：[臂角 a0, 最外侧初级飞羽角, 最内侧初级飞羽角, 收拢 fold]；角度从正后方量起，+ 向上
  //   上扬时前缘从肩往后上方斜着立起（和颈分开），最外侧飞羽顺着前缘再往上、最内侧飞羽往正后方，整片翼像一面立在背上的帆
  const WP = [
    [0.5, 0.45, 0.1, 0.8],      // 0 收拢
    [1.2, 1.5, 0.22, 0.05],     // 1 上扬（悬停时的主翼姿：翼帆立在背上）
    [0.3, 0.45, -0.2, 0.1],     // 2 平展
    [-0.9, -0.6, -1.4, 0.1],    // 3 下压
    [0.95, 1.05, 0.3, 0.45],    // 4 回收
    [1.05, 1.6, -0.05, 0],      // 5 张开（施放）
    [-0.3, -0.2, -0.6, 0.5],    // 6 垂落（死亡）
    [0.35, 0.42, 0.05, 0.6],    // 7 俯冲收翼（出手）
  ];
  const SPEC = Q.KEYS.map((k) => (k[0] === 'wing' ? ['wing', 0, 7] : k)).concat([['claw', 0, 2], ['tph', 0, 7], ['tcurl', -2, 2], ['crest', -1, 1]]).concat(B.COMMON);
  const P = {};
  function reset() { Q.reset(P); P.lift = LIFT; P.wing = 1; P.claw = 0; P.tph = 0; P.tcurl = 0; P.crest = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 2) + OX, R(rig.C1.y)];
  const T_HIT = 2 / 12, T_BOLT = 1 / 12, T_CHAIN = [T_BOLT + 0.07, T_BOLT + 0.14, T_BOLT + 0.21, T_BOLT + 0.28], T_BURST = INCOMING + 0.67;   // 核心过载 0.3–0.67 s：肋窗白 / 暗逐帧闪 3 次后爆裂

  // ───── 姿势 ─────
  const IDLE_W = [1, 5, 4, 1], IDLE_B = [0, -1, 0, 1];                                   // 悬停慢扑翼：上扬 → 张开 → 回收 → 上扬，每 0.4 s 一换
  function idle(tq, f12) {
    const b = Math.floor(f12 / 5 + 1e-6);
    P.wing = IDLE_W[b & 3]; P.bob = IDLE_B[b & 3]; P.tph = b & 7; P.pitch = 1; P.rim = 1;   // 核心常亮：轮廓光 1 档；尾巴慢慢波动
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                   // 待机个性：尾巴卷起再展开，羽冠静电噼啪，头左右张望（抬头 / 低头）
      const k = Math.min(4, f12of(lp - 1.6)); P.head = [-1, -1, 1, 1, 0][k]; P.tcurl = [1, 2, 2, 1, 0][k]; P.crest = [1, -1, 1, -1, 0][k];
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                // 蛇形滑翔：身体俯仰和头错一拍，尾巴 S 波往后传，一个周期只扑一次翅
      const f = gait(tq); P.lift = LIFT + [0, 1, 0, -1][f]; P.pitch = [1, 2, 1, 0][f]; P.head = [0, -1, 0, 1][f]; P.wing = [1, 1, 5, 4][f]; P.tph = f * 2; P.crest = [1, 0, -1, 0][f]; P.tcurl = [0, 1, 0, -1][f];
      const w = walkDemo(tq, 18, -1); P.mx = w.mx + (w.flip ? 2 * PIVOT : 0); P.flip = w.flip;   // 转身绕身长中点（不是绕站位点）：朝左时长尾不扫进假人
    } else if (st === ATTACK) {                                                            // 俯冲爪击：收翼前倾俯冲 → 下压 4 格、昂头刹住、张翼，鹰爪前伸耙抓 → 回升
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.lift = LIFT + R(2 * q); P.pitch = -R(q); P.wing = 7; P.head = 1; P.claw = 0; P.crest = 1; P.bx = -R(q); P.tcurl = 1; }   // 预兆：拔高、收翼、前倾
      else if (tq < 0.25) { P.lift = 0; P.pitch = 3; P.bx = 10; P.wing = 5; P.head = -2; P.jaw = 2; P.claw = 2; P.crest = -1; P.tph = 3; P.tcurl = -1; }   // 出手：下压 4 格、昂头张翼，鹰爪前伸
      else if (tq < 0.45) { P.lift = 1; P.pitch = 2; P.bx = 9; P.wing = 1; P.head = -1; P.jaw = 1; P.claw = 2; P.tph = 4; }
      else { idle(tq, f12); const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(9 * (1 - q)); P.lift = LIFT - R(3 * (1 - q)); P.claw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                                            // 蓄力：盘身上升 3 格、尾巴卷起、抬头；核心 1 → 2 档
      const q = ease.inOut(clamp01(tq / 0.7));
      P.lift = LIFT + R(3 * q); P.head = -R(q); P.tcurl = R(2 * q); P.pitch = 1 + R(q); P.wing = tq > 0.7 ? ((f12 >> 2) & 1 ? 1 : 5) : 5; P.crest = tq > 0.5 ? ((f12 & 1) ? 1 : -1) : 0;
      P.jaw = tq > 0.9 ? 1 : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq > 1.1 ? 3 : 2; P.tph = (f12 >> 2) & 7;
    } else if (st === CAST) {                                                              // 施放：仰头 → 猛地前探张嘴
      if (tq < T_BOLT) { P.lift = LIFT + 3; P.head = -2; P.jaw = 1; P.pitch = 3; P.wing = 5; P.tcurl = 2; }
      else { P.lift = LIFT + 2; P.head = 2; P.jaw = 3; P.bx = 2; P.pitch = 0; P.wing = tq < 0.3 ? 5 : 1; P.tcurl = 1; P.tph = 2; }
      P.gem = tq < 0.3 ? 3 : 2; P.rim = 3; P.crest = -1;
    } else if (st === RECOVER) {                                                           // 收招：雷云散成火花落下，羽冠平复
      const q = ease.inOut(clamp01(tq / 0.6));
      P.lift = LIFT + R(2 * (1 - q)); P.head = R(1 - q); P.jaw = R(2 * (1 - q)); P.bx = R(2 * (1 - q)); P.tcurl = R(1 - q); P.wing = q < 0.5 ? 4 : 1; P.pitch = 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.eyes = 1; P.head = -1; P.tcurl = -2; P.crest = 1; P.wing = 5; P.claw = 1; P.pitch = 2; P.gem = (f12 & 1) ? 2 : 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wing = 4; P.tcurl = -1; P.claw = 1; P.pitch = 1; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.head = -1; P.tcurl = -2; P.crest = 1; P.wing = 5; P.claw = 1; P.pitch = 2; P.gem = (f12 & 1) ? 2 : 1; P.lift = d < 0.15 ? LIFT : LIFT - 1; }
      else if (d < T_BURST - INCOMING - 1e-6) { const k = f12of(d - 0.3); P.bx = -3; P.eyes = 1; P.head = 3; P.jaw = 2; P.tcurl = (k & 1) ? 2 : -2; P.wing = 6; P.claw = 1; P.pitch = -1; P.lift = LIFT - 2 - (k >> 1); P.gem = (k & 1) ? 1 : 3; P.rim = (k & 1) ? 0 : 3; }   // 核心过载：失去升力往下沉，肋窗白 / 暗逐帧闪（0.3–0.67 s 闪 3 次白）
      else { P.bx = -3; P.dq = 1; P.gem = 4; P.lift = 1; }                                  // 爆裂后：碎块交给死亡套件
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    tuckLegs(rig);
    const mo = beakGeom(rig).mouth; P.gx = mo[0] + P.bx + OX; P.gy = mo[1];              // 口 = 钩喙上下喙之间（闪电从这里吐出）
    B.key(P, SPEC);
  }
  // 前腿蜷在胸下（悬空不落地）
  function tuckLegs(r) { for (const i of [1, 3]) { const L = r.legs[i]; L.T = [L.T[0] + 0.6, L.T[1] + 1.6]; const T = L.T; L.F = [T[0] - 1.2, T[1] + 2.4]; L.up = true; } }   // 前腿根挪到胸底（不挡肋窗）

  // ───── 画 ─────
  // 候选部件：featherWing（高举的羽翼 + 缺羽）：前缘 根 → 腕高高立起，初级飞羽从腕部往后上方扇开（一根一根分开、亮尖），
  //   次级飞羽组成后缘垂回背上，覆羽盖住翼的前上三分之一；缺的初级飞羽只剩一截白色翼指骨，缺口在剪影里是一道 V 形凹口。
  //   W = [a0 臂角, a1 最外侧初级飞羽角, a2 最内侧初级飞羽角, fold]（角度从正后方量，+ 向上）；w = { span, chord, fingers, missing: [序号，0 = 最外] }
  //   材质 m.covert / covertFar（覆羽）· m.feather / featherFar（飞羽）· m.tip（亮尖）· m.bone / boneFar（翼指骨）
  function wingGeom(x, y, W, w) {
    const a0 = W[0], a1 = W[1], a2 = W[2], fold = W[3], span = w.span, nf = w.fingers || 5;
    const arm = span * (0.5 - 0.18 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a1 + (a2 - a1) * q + (fold > 0.3 && k === 0 ? 0.35 : 0), fl = span * (0.56 - 0.12 * q) * (1 - 0.55 * fold); tips.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }   // 收拢时最外侧飞羽往上撇开，缺羽的 V 口不合上
    return { wx, wy, tips, bx: x - w.chord * (1 - 0.3 * fold), by: y + 1.5, nf };
  }
  function featherWing(x, y, W, w, far) {
    E.part();
    const G = wingGeom(x, y, W, w), { wx, wy, tips, bx, by, nf } = G, fm = far ? m.featherFar : m.feather, cm = far ? m.covertFar : m.covert, bm = far ? m.boneFar : m.bone, miss = w.missing || [];
    const L = tips[nf - 1];
    // 翼面（次级飞羽）：根 → 腕 → 最内侧初级飞羽尖 → 后缘（每 2.5 格一个羽尖，扇贝边）→ 背；中间蓝，羽缝深一级
    const tr = [], n = Math.max(2, R(Math.hypot(L[0] - bx, L[1] - by) / 2.5)), nx = -(by - L[1]), ny = bx - L[0], nl = Math.hypot(nx, ny) || 1;
    for (let k = 1; k < n; k++) { const q = k / n, e = k & 1 ? 1.3 : 0.2; tr.push(lerp(L[0], bx, q) - nx / nl * e, lerp(L[1], by, q) - ny / nl * e); }
    U.poly(E, [x, y, wx, wy, L[0], L[1]].concat(tr, [bx, by]), fm, 3);
    for (let k = 1; k < n; k += 2) { const px = tr[2 * k - 2], py = tr[2 * k - 1]; U.seg(E, lerp(px, wx, 0.12), lerp(py, wy, 0.12), lerp(px, wx, 0.5), lerp(py, wy, 0.5), 1, fm, 2); }   // 次级飞羽之间的羽缝
    // 初级飞羽：从腕部扇开，根部 2 格粗、外段 1 格，羽尖亮
    for (let k = 0; k < nf; k++) {
      const [tx, ty] = tips[k];
      if (miss.includes(k)) {                                                            // 缺的飞羽：只剩白色翼指骨；收拢时第 1 根翼指骨不跟着缩短，骨尖伸出剪影、旁边留出缺口
        const first = k === miss[0], e = first ? (W[3] > 0.3 ? 1.0 : 0.5) : 0.4;
        U.seg(E, wx, wy, lerp(wx, tx, e), lerp(wy, ty, e), 1, bm, 3); U.dot(E, lerp(wx, tx, e), lerp(wy, ty, e), bm, 4); continue;
      }
      U.seg(E, wx, wy, lerp(wx, tx, 0.45), lerp(wy, ty, 0.45), 2, fm, 3); U.seg(E, lerp(wx, tx, 0.45), lerp(wy, ty, 0.45), tx, ty, 1, fm, 3);
      U.dot(E, tx, ty, far ? fm : m.tip, far ? 4 : 3);
    }
    // 覆羽：沿前缘一条浅蓝宽带（翼的前上三分之一），下沿隔 2 格一个深色羽鳞
    const c1x = lerp(wx, L[0], 0.3), c1y = lerp(wy, L[1], 0.3), c2x = lerp(x, bx, 0.45), c2y = lerp(y, by, 0.45);
    U.poly(E, [x, y, wx, wy, c1x, c1y, c2x, c2y], cm, 3);
    for (let k = 1; k <= 3; k++) { const q = k / 4, px = lerp(c1x, c2x, q), py = lerp(c1y, c2y, q); U.dot(E, px, py, cm, 2); }
    U.seg(E, x, y, wx, wy, 1, cm, 4); U.dot(E, wx, wy, cm, 4);                           // 前缘亮线
    return G;
  }
  // 候选部件：waveTail（S 形长尾 + 末端扇形尾羽）：从 (x, y) 往后长 len 格，半径 w0/2 → 0.6；ph 波相 0–7（S 波往尾尖传）、curl 尾尖上卷 -2..2；
  //   材质 m.body（尾身，背上隔 3 格一个羽鳞亮点）、m.feather + m.tip（尾羽）
  function tailPath(x, y, T, ph, curl) {
    const pts = [];
    for (let k = 0; k <= T.len; k++) { const q = k / T.len; pts.push([x - k, y + 0.9 * k * 0.18 + Math.sin(q * 5.2 - ph * 0.785) * T.amp * q - curl * q * q * 5, lerp(T.w0 / 2, 0.6, q)]); }
    return pts;
  }
  function waveTail(x, y, T, ph, curl) {
    E.part();
    const pts = tailPath(x, y, T, ph, curl);
    pts.forEach(([px, py, r], k) => { U.disc(E, px, py, r, m.body, 0); if (k > 2 && k < T.len - 1 && (k % 3) === 0) U.dot(E, px, py - r, m.body, 4); });
    const [ex, ey] = pts[T.len], [qx, qy] = pts[T.len - 2], pa = Math.atan2(ey - qy, ex - qx);
    for (let k = -2; k <= 2; k++) {                                                        // 扇形尾羽：5 片从尾尖张开，中间长、两边短
      const a = pa + k * 0.32 - curl * 0.12, L = T.fan * (1 - Math.abs(k) * 0.14), tx = ex + Math.cos(a) * L, ty = ey + Math.sin(a) * L;
      U.seg(E, ex, ey, tx, ty, 1, m.feather, k & 1 ? 2 : 3); U.dot(E, tx, ty, m.tip, 4);
    }
  }
  // 候选部件：talonLeg（鹰爪腿，长在腹部中段）：羽毛大腿 + 骨黄跗骨 + 3 根骨白钩爪，跗骨上套一只铜环；mode 0 蜷在腹下 · 1 垂下 · 2 前伸 10 格耙抓（爪张开）
  function talonLeg(far, mode) {
    E.part();
    const C1 = rig.C1, C2 = rig.C2, hx = lerp(C2.x, C1.x, 0.3), sp = Q.span(rig, o, R(hx)), T = [hx + (far ? 1.2 : 0), (sp ? sp[1] : C2.y + 2) - 1.5 - (far ? 0.5 : 0)], tm = far ? m.tarFar : m.tar, fm = far ? m.far : m.limb;   // 鹰腿长在腹部中段
    const K = mode === 2 ? [T[0] + 4.5, T[1] + 1.2] : [T[0] + 1.8, T[1] + 1.8];
    const F = mode === 2 ? [T[0] + 10.5, T[1] + 1] : mode === 1 ? [T[0] + 0.5, T[1] + 5.5] : [T[0] + 0.4, T[1] + 3.2];
    U.disc(E, T[0], T[1], 1.8, fm, 0); U.taper(E, T[0], T[1], K[0], K[1], 1.5, 1, fm, 0);                              // 羽毛大腿
    U.seg(E, K[0], K[1], F[0], F[1], 1, tm, 0);                                                                          // 跗骨
    const rx = lerp(K[0], F[0], 0.45), ry = lerp(K[1], F[1], 0.45); U.dot(E, rx, ry, m.ring, far ? 2 : 4); U.dot(E, rx + (mode === 2 ? 0 : 1), ry + (mode === 2 ? 1 : 0), m.ring, far ? 1 : 3);   // 当年钱袋的铜扣环
    if (mode === 2) { U.dot(E, F[0] + 1, F[1] - 1, tm, 0); U.dot(E, F[0] + 2, F[1] - 2, m.claw, 4); U.dot(E, F[0] + 1, F[1] + 1, tm, 0); U.dot(E, F[0] + 2, F[1] + 2, m.claw, 3); U.dot(E, F[0] + 2, F[1], m.claw, 3); }   // 张开的三根钩爪
    else { U.dot(E, F[0] + 1, F[1], tm, 0); U.dot(E, F[0] + 2, F[1] + 1, m.claw, far ? 2 : 4); U.dot(E, F[0] - 1, F[1] + 1, m.claw, far ? 1 : 3); U.dot(E, F[0], F[1] + 1, m.claw, far ? 1 : 2); }
  }
  // 肋窗 + 风暴核心（和躯干同一个部件）：9 × 4 的尸绿烂肉洞，4 根斜向前下的白肋骨两两分开，中间 2 格缝里露出 2 × 2 的核心（上下各 1 行暗一级的辉光）；
  //   lv 0 常亮 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭 → [辉光, 核心] 的色调
  const CORE_T = [[2, 3], [2, 4], [3, 4], [4, 4], [1, 1]], RIB_U = [-4, -2, 1, 3];
  function coreAt(r) { return [R(r.C1.x - 0.5), R(r.C1.y + 0.5)]; }                    // 核心（2 × 2 的右上格）：肋窗整个在胸口正中，翼根和蜷着的前腿都挡不到
  function ribWindow() {
    const [cx, cy] = coreAt(rig), lv = CORE_T[Math.max(0, Math.min(4, P.gem | 0))];
    for (let v = -2; v <= 1; v++) {
      const sh = v >= 0 ? 1 : 0;                                                         // 下两行往前错 1 格：肋骨斜向前下
      for (let u = -4; u <= 4; u++) { if (Math.abs(u) === 4 && (v === -2 || v === 1)) continue; U.dot(E, cx + u, cy + v, m.rot, v === -2 ? 3 : 1); }   // 烂肉
      for (const ru of RIB_U) U.dot(E, cx + ru + sh, cy + v, m.bone, v === -2 ? 4 : 3);                                                    // 4 根白肋骨
      for (let k = 0; k < 2; k++) U.dot(E, cx + sh + k - 1, cy + v, m.core, v === -1 || v === 0 ? lv[1] : lv[0]);                         // 核心（中间两行）+ 辉光（上下行）
    }
  }
  // 腹部暗一级的鳞（和躯干同一个部件）：腹线下 2 行隔点
  function bellyScales() {
    for (let x = Math.floor(rig.C2.x - 1); x <= Math.ceil(rig.C1.x + 1.5); x++) { const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 3) continue; for (let y = s[1] - 1; y <= s[1]; y++) U.dot(E, x, y, m.belly, ((x + y) & 1) ? 0 : 2); }
  }
  // 候选部件：hookBeak（鹰式下钩喙，接在短龙吻前面，和头同一个部件）：上喙 5 格（上缘一行亮骨白，前端往下弯），前端比下喙多伸出 1 格、
  //   再往下勾 2 格，钩尖比下喙底低 1 格；上下喙之间 1 格暗嘴线；上喙 2 行、下喙 1 行（上宽下窄）。张嘴时只有下喙往下开（按龙吻的 gap 铰开），钩尖不动。
  //   按头角做剪切（每一列整体上下挪），竖着的钩尖在任何头角都不会断开。格子 [a 往前, b 往下（0 = 嘴线）, 色调]，色调 4 亮 · 3 基 · 2 暗 · 1 墨
  const BEAK_UP = [[0, -2, 4], [1, -2, 4], [2, -2, 4], [0, -1, 3], [1, -1, 3], [2, -1, 3], [3, -1, 4], [3, 0, 3], [4, 0, 4], [4, 1, 3], [4, 2, 2]];
  const BEAK_LO = [[0, 1, 2], [1, 1, 2], [2, 1, 2], [3, 1, 2]], BEAK_LINE = [0, 1, 2];
  function beakGeom(r) {
    const F = Q.headFrame(r, o, 0), uB = F.uT - 1, p = F.at(uB, F.prof(uB)[2] + 0.45), tn = Math.tan(r.head.a);
    const x0 = R(p[0]), y0 = R(p[1]), dy = (a) => R(a * tn);
    return { x0, y0, dy, mouth: [x0 + 3, y0 + dy(3) + 1] };
  }
  function beak() {
    const G = beakGeom(rig), { x0, y0, dy } = G, jw = P.jaw | 0, Fj = Q.headFrame(rig, o, jw), uB = Fj.uT - 1, mouthM = (P.glow | 0) >= 1 ? (m.glow || m.ink) : m.ink;
    const drop = (a) => (jw ? Math.max(1, R(Fj.gap(uB + a))) : 0);                      // 张嘴：下喙每一列往下开多少格（越往前开得越大）
    for (const [a, b, t] of BEAK_LO) { const d = drop(a); for (let k = 0; k < d; k++) U.dot(E, x0 + a, y0 + b + dy(a) + k, mouthM, 0); U.dot(E, x0 + a, y0 + b + dy(a) + d, m.beak, t); }   // 口里墨色 + 下喙
    for (const a of BEAK_LINE) U.dot(E, x0 + a, y0 + dy(a), mouthM, 0);                 // 暗嘴线
    for (const [a, b, t] of BEAK_UP) U.dot(E, x0 + a, y0 + b + dy(a), m.beak, t);
    if (!P.eyes) { const e = rig.eye; U.dot(E, e[0] + 1, e[1], m.limb, 1); U.dot(E, e[0] - 1, e[1], m.limb, 1); }   // 眼前后各 1 格深色眼眶（青眼在亮蓝头上读得出来）
  }
  // 羽冠：3 根后掠羽（飞鹰那 3 根长成的 6 / 5 / 4 格蓝羽冠），冠尖是静电色；返回 [根 x, 根 y, 尖 x, 尖 y]（本地坐标，给静电特效用）
  const CREST = [[0.1, 6.5, 0.85], [-0.3, 5.5, 0.5], [-0.65, 4.5, 0.18]];                 // [根在头顶的位置（占颅半宽，+ 往前）, 长, 角（从正后方量起，+ 往上）]
  function crestGeom(r) {
    const F = Q.headFrame(r, o, 0), sw = P.crest * 0.2, pts = [];
    CREST.forEach(([du, L, a], i) => { const u = du * F.W, b = F.at(u, F.top(u) + 0.8), A = a - r.head.a * 0.5 + sw * (1 + i * 0.3); pts.push([b[0], b[1], b[0] - Math.cos(A) * L, b[1] - Math.sin(A) * L]); });
    return pts;
  }
  function crest() {
    E.part();
    crestGeom(rig).forEach(([x0, y0, x1, y1], i) => { U.seg(E, x0, y0, lerp(x0, x1, 0.5), lerp(y0, y1, 0.5), 2, m.crest, 0); U.seg(E, lerp(x0, x1, 0.5), lerp(y0, y1, 0.5), x1, y1, 1, m.crest, i === 0 ? 4 : 0); U.dot(E, x1, y1, m.spark, 3); });
  }
  function wingRoot(r, far) { const x = lerp(r.C2.x, r.C1.x, far ? 0.5 : 0.38), s = Q.span(r, o, R(x)); return [x, (s ? s[0] : r.C1.y - 3) + (far ? -0.5 : 1)]; }   // 翼根在背中段（不贴着颈），远翼靠前 1 格、高半格
  const wingRootN = (r) => wingRoot(r, 0), wingRootF = (r) => wingRoot(r, 1);
  const farPose = (W) => [W[0] + 0.15, W[1] + 0.15, W[2] + 0.3, W[3]];                                 // 远翼错一个角度：飞羽从近翼前缘后面探出来
  function drawHero() {
    begin(hero, P.bx + OX, 0);
    const r = rig, W = WP[P.wing | 0], cm = P.claw, wf = wingRootF(r), wn = wingRootN(r);
    talonLeg(1, cm); Q.leg(E, r, P, o, 1);
    featherWing(wf[0], wf[1], farPose(W), WING, 1);
    waveTail(r.C2.x - r.C2.r * 0.6, r.C2.y + 0.4, TAIL, P.tph, P.tcurl);
    Q.body(E, r, P, o); bellyScales(); ribWindow();
    talonLeg(0, cm); Q.leg(E, r, P, o, 3);
    featherWing(wn[0], wn[1], W, WING, 0);
    crest();
    Q.head(E, r, P, o); beak();
  }
  function coreLocal() { const c = coreAt(rig); return [c[0] + P.bx + OX, c[1]]; }
  function bakeHero() { const c = coreLocal(); RIM.rim = P.rim; RIM.rx = c[0] + hero.ox; RIM.ry = c[1] + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 候选部件（特效）：chainBolt：折线闪电，逐帧抖动，w 1–3（核心 + 两侧辉光 + 中段分叉），lv 起始色阶级（0 最亮）；锁链一段比一段细、一段比一段暗（fx.bolt 没有粗细）
  const BN = 10, bOn = new Uint8Array(BN), bX0 = new Float32Array(BN), bY0 = new Float32Array(BN), bX1 = new Float32Array(BN), bY1 = new Float32Array(BN), bT = new Float32Array(BN), bD = new Float32Array(BN), bW = new Uint8Array(BN), bL = new Uint8Array(BN), bS = new Uint16Array(BN);
  let bSeed = 1;
  function bolt(x0, y0, x1, y1, dur, w, lv) { let i = 0, old = 0; for (; i < BN && bOn[i]; i++) if (bT[i] / bD[i] > bT[old] / bD[old]) old = i; if (i === BN) i = old; bOn[i] = 1; bX0[i] = x0; bY0[i] = y0; bX1[i] = x1; bY1[i] = y1; bT[i] = 0; bD[i] = dur; bW[i] = w; bL[i] = lv; bS[i] = bSeed++ & 1023; }
  function ln(x0, y0, x1, y1, c) { x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) put(R(x0 + (x1 - x0) * k / n), R(y0 + (y1 - y0) * k / n), c); }
  function drawBolts(f12) {
    for (let i = 0; i < BN; i++) {
      if (!bOn[i]) continue; const q = bT[i] / bD[i]; if (q >= 1) { bOn[i] = 0; continue; } if (q > 0.55 && (f12 & 1)) continue;
      const x0 = bX0[i], y0 = bY0[i], x1 = bX1[i], y1 = bY1[i], len = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(2, R(len / 5)), amp = Math.min(3, len / 7), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const lv = bL[i] + (q < 0.35 ? 0 : q < 0.7 ? 1 : 2), core = EL[Math.min(4, lv)], halo = EL[Math.min(4, lv + 2)];
      let px = x0, py = y0;
      for (let k = 1; k <= n; k++) {
        const t = k / n, j = k === n ? 0 : (hash(bS[i] * 7 + k, f12) - 0.5) * 2 * amp, x = lerp(x0, x1, t) + nx * j, y = lerp(y0, y1, t) + ny * j;
        if (bW[i] >= 2) ln(px + nx, py + ny, x + nx, y + ny, halo); if (bW[i] >= 3) ln(px - nx, py - ny, x - nx, y - ny, halo);
        ln(px, py, x, y, core);
        if (bW[i] >= 2 && k === (n >> 1)) { const fx2 = x + (x1 - x0) / len * 3 + nx * 3 * (hash(k, bS[i]) < 0.5 ? 1 : -1), fy2 = y + (y1 - y0) / len * 3 + ny * 3; ln(x, y, fx2, fy2, halo); }   // 分叉
        px = x; py = y;
      }
    }
  }
  const TGT = [[DUMMY_X - 2, HY - 16], [DUMMY_X + 15, HY - 30], [DUMMY_X + 1, HY - 46], [DUMMY_X - 11, HY - 33], [DUMMY_X - 8, HY - 1]];   // 假人 → 假人后上方 → 假人正上方 → 龙和假人之间的上空 → 假人左前方地面（全部 x ≤ 122）
  const CLOUD = [[0, 0, 3], [-3.2, 1, 2.2], [3.2, 0.8, 2.4], [-1.4, -1.8, 2.2], [1.8, -1.4, 2.1], [5, 1.6, 1.4], [-5, 1.8, 1.3]];
  let chargeAcc = 0, trailAcc = 0, soulAcc = 0, sparkAcc = 0, puffAcc = 0, lastGf = -9, zapT = 9, clT = 9, clX = 0, clY = 0, cloudS = 0, cloudX = 0, cloudY = 0;
  const toScr = (lx, ly) => [scrX(lx + P.bx + OX), HY + ly];
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function headScr() { return toScr(rig.head.x, rig.head.y); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [hx, hy] = headScr();
      burst(hx, hy - 4, 12, 30, 80, 0.2, 0.45, R_EL, 10); shake(0.28, 2); flash(0.05);
    }
  }
  function chainHit(k) {                                                                   // 第 k 段锁链落点：十字 + 小冲击环
    const [x, y] = TGT[k]; fx.cross(x, y, Math.max(2, 6 - k), R_EL, 0.25, 2); ring(x, y, k === 0 ? 1 : 0, R_EL); burst(x, y, k === 0 ? 20 : 8, 40, 110, 0.15, 0.4, R_EL, 8);
    sfx('impact', { pal: 'bolt', w: +(0.8 - k * 0.14).toFixed(2) });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                     // 俯冲爪击：3 道平行爪痕
      clT = 0; clX = DUMMY_X - 3; clY = HY - 9;
      burst(DUMMY_X - 4, HY - 14, 14, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(DUMMY_X - 4, HY - 14, 6, 30, 70, 0.2, 0.4, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'claw', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === CAST && t === T_BOLT) {                                                      // 张嘴：闪电从口中直劈假人
      const [mx, my] = mouthScr(); fx.cross(mx + 1, my, 6, R_EL, 0.3, 2); ring(mx + 1, my, 1, R_EL); burst(mx + 1, my, 16, 50, 120, 0.2, 0.5, R_EL, 6);
      bolt(mx + 1, my, TGT[0][0], TGT[0][1], 0.32, 3, 0); fx.bolt(mx + 1, my, TGT[0][0], TGT[0][1] - 2, R_EL, 0.24, 2, 11); zapT = 0;   // 粗闪电 + 一道抖动的分支
      hitDummy(1, 1); dummyFx({ dur: 1.1, stun: 1, outline: R_EL }); shake(0.12, 1); chainHit(0);
    }
    const ck = s === CAST ? T_CHAIN.indexOf(t) : -1;
    if (ck >= 0) { const a = TGT[ck], b = TGT[ck + 1]; bolt(a[0], a[1], b[0], b[1], 0.26 - ck * 0.02, ck < 1 ? 2 : 1, ck < 2 ? 0 : 1); chainHit(ck + 1); }   // 锁链依次跳向下一个目标，一段比一段细、暗
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_FEATHER, 10);
    if (s === DEATH && t === T_BURST) {                                                    // 风暴核心过载 → 爆裂
      poseAt(DEATH, t - 1 / 12, E.simT); drawHero(); bakeHero();
      const c = coreLocal(); death.start('burst', { power: 0.85, chunk: 4, fromX: c[0], fromY: c[1], fadeAt: 1.2 });
      const [x, y] = toScr(c[0] - P.bx - OX, c[1]);
      ring(x, y, 1, R_EL); burst(x, y, 30, 60, 150, 0.25, 0.6, R_EL, 10); flash(0.05); shake(0.2, 2);
      for (let i = 0; i < 14; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.7 + Math.random() * 0.5, R_EL, { g: 260, floor: FLOOR - 1 });   // 电火花随碎块落地熄灭
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 4, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 1.2 + Math.random() * 0.6, R_FEATHER, { g: 50, dragX: 0.4, floor: FLOOR - 1 });   // 蓝羽四散飘落
      sfx('impact', { pal: 'bolt', w: 0.6 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_BOLT].concat(T_CHAIN), [], [INCOMING], [T_BURST], []];
  const deathKit = { mode: 'burst', at: T_BURST };
  function stepFX(dt, state, stT) {
    const [hx, hy] = headScr(), [mx, my] = mouthScr();
    cloudS = state === CHARGE ? clamp01(stT / 0.9) : state === CAST ? 1 : state === RECOVER ? clamp01(1 - stT / 0.4) : 0;
    if (cloudS > 0) { cloudX = hx - 3; cloudY = hy - 17; }
    if (state === CHARGE) {
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));                            // 火花从雷云螺旋汇聚进口中
      while (chargeAcc >= 1) { chargeAcc -= 1; const sx = cloudX + (Math.random() - 0.5) * 8 * cloudS, sy = cloudY + (Math.random() - 0.5) * 4, a = Math.atan2((sy - my) / 0.75, sx - mx), r = Math.hypot(sx - mx, (sy - my) / 0.75); spawnX(K_SPIRAL_PT, sx, sy, (r - 3.5) / (0.35 + Math.random() * 0.25), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 2, tx: mx, ty: my }); }
      puffAcc += dt * 3; while (puffAcc >= 1) { puffAcc -= 1; fx.cloud(cloudX + (Math.random() - 0.5) * 10 * cloudS, cloudY + 1, 3 + 2 * cloudS, R_CLOUD, 0.6, 0); }   // 雷云边上翻滚的云絮
      if (stT > 0.35) { sparkAcc += dt * 6; while (sparkAcc >= 1) { sparkAcc -= 1; const tip = crestGeom(rig)[1], [tx, ty] = toScr(tip[2], tip[3]); bolt(cloudX + (Math.random() - 0.5) * 4, cloudY + 2, tx, ty, 0.12, 1, 1); } }   // 云里细闪电接到羽冠
    }
    if (state === RECOVER && stT < 0.4) { sparkAcc += dt * 26; while (sparkAcc >= 1) { sparkAcc -= 1; spawnX(K_PHYS, cloudX + (Math.random() - 0.5) * 12, cloudY + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 20, 10 + Math.random() * 20, 0.6 + Math.random() * 0.4, R_EL, { g: 120 }); } }   // 雷云散成火花落下
    if (state === CAST && stT >= T_BOLT && stT < T_BOLT + 0.3) { trailAcc += dt * 20; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_EMBER, mx + 1, my, 10 + Math.random() * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.tph !== lastGf) {                                              // 身下 1–2 颗青色电火花拖尾
      const [bx0, by0] = toScr(0, R(rig.C1.y + rig.C1.r) + 1); for (let i = 0; i < 2; i++) spawn(K_TRAIL, bx0 + (Math.random() - 0.5) * 8, by0 + Math.random() * 2, (P.flip ? 1 : -1) * (10 + Math.random() * 10), 4 + Math.random() * 6, 0.3 + Math.random() * 0.25, R_EL);
      lastGf = P.tph;
    }
    if ((state === IDLE || state === RECOVER) && P.gem > 0) { trailAcc += dt * 4; while (trailAcc >= 1) { trailAcc -= 1; const c = coreLocal(), [cx, cy] = toScr(c[0] - P.bx - OX, c[1]); spawn(K_EMBER, cx, cy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {                // 魂光（青）
      soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 34, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); }
    }
    for (let i = 0; i < BN; i++) if (bOn[i]) bT[i] += dt;
    zapT += dt; clT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; soulAcc = 0; sparkAcc = 0; puffAcc = 0; lastGf = -9; zapT = 9; clT = 9; cloudS = 0; bOn.fill(0); }
  // 雷云：几团叠在一起的圆，顶上亮蓝、中间深蓝、底下墨蓝；s 0–1 大小；闪的时候里面透出青白
  function stormCloud(cx, cy, s, f12) {
    if (s <= 0.05) return; const lit = (f12 % 5) === 0 || (f12 % 7) === 3;
    for (const [dx, dy, r0] of CLOUD) {
      const r = r0 * 1.45 * (0.35 + 0.65 * s); if (r < 0.8) continue;
      for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
        if (i * i + j * j > r * r + 0.3) continue; const x = R(cx + dx * s * 1.5 + i), y = R(cy + dy * s * 1.5 + j), ry = y - cy;
        put(x, y, ry < -2 ? 41 : ry > 1 ? 39 : (lit && Math.abs(i) < 3 && hash(x, f12) < 0.4 ? 22 : 40));
      }
    }
    if (lit) { put(R(cx), R(cy), 21); put(R(cx + 1), R(cy + 1), 22); }
  }
  function fxBack(f12) {
    if (P.dq < 0.6) { const [sx] = toScr(1, 0); groundShadow(sx, 11, 6 + P.lift); }
    if (P.rim >= 2 && P.dq < 1) floorGlow(toScr(coreLocal()[0] - P.bx - OX, 0)[0], P.rim, EL, f12);
    stormCloud(cloudX, cloudY, cloudS, f12);
  }
  // 翼缺口电弧：两根翼指骨之间、翼指骨和下一根飞羽之间跳一小段折线
  function zig(x0, y0, x1, y1, f12, c0, c1) { const n = 3; let px = x0, py = y0; for (let k = 1; k <= n; k++) { const t = k / n, j = k === n ? 0 : (hash(k + f12, R(x0)) - 0.5) * 3, x = lerp(x0, x1, t) + j * 0.5, y = lerp(y0, y1, t) + j; ln(px, py, x, y, k & 1 ? c0 : c1); px = x; py = y; } }
  function fxFront(f12) {
    if (P.dq >= 1) { drawBolts(f12); return; }
    const st = E.state, hot = st === CHARGE || st === CAST;
    if ((hot || (st === IDLE && (f12 % 6) === 1)) && !P.flip) {                             // 翼缺口电弧：第 1 根飞羽 ↔ 翼指骨 ↔ 第 4 根飞羽
      const wn = wingRootN(rig), G = wingGeom(wn[0], wn[1], WP[P.wing | 0], WING), pt = (k, e) => toScr(lerp(G.wx, G.tips[k][0], e), lerp(G.wy, G.tips[k][1], e));
      const a = pt(0, 0.62), b = pt(1, 0.5), c = pt(2, 0.38), d = pt(3, 0.62); zig(a[0], a[1], b[0], b[1], f12, EL[1], EL[2]); if (hot) zig(c[0], c[1], d[0], d[1], f12 + 3, EL[2], EL[3]); else if (f12 & 1) zig(b[0], b[1], d[0], d[1], f12 + 5, EL[2], EL[3]);
    }
    const stat = hot || (st === IDLE && P.crest !== 0) || (st === MOVE && (f12 & 3) === 0);
    if (stat && !P.flip) for (const [, , x1, y1] of crestGeom(rig)) if (hash(R(x1) + f12, 3) < 0.55) { const [x, y] = toScr(x1, y1); put(x + 1, y - 1, EL[0]); put(x + 2, y - 1, EL[2]); if (hash(f12, R(y1)) < 0.5) put(x, y - 2, EL[1]); }   // 羽冠静电
    if (clT < 2 / 12) {                                                                    // 3 道平行爪痕拖影
      const first = clT < 1 / 12;
      for (let k = 0; k < 3; k++) for (let i = 0; i <= 9; i++) { if (!first && (i & 1)) continue; put(clX - 9 + i, clY - 3 + k * 3 + R(i * 0.55), first ? (i > 6 ? EL[0] : EL[2]) : EL[3]); }
    }
    if (st === CAST && P.gem === 3 && zapT > 1) {                                          // 蓄满仰头的那一帧：口前星芒预兆
      const [mx, my] = mouthScr(); for (let r = 2; r <= 4; r++) { put(mx + r, my, EL[r - 2]); put(mx, my - r, EL[r - 1]); put(mx, my + r, EL[r - 1]); }
    }
    drawBolts(f12);
  }

  return {
    name: '蓝龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.core, m.spark, m.eye], HIT_POINT, EVENTS, deathKit, REVIVE: { ramp: R_EL, dy: -14 },
    SFX: { body: 'beast', how: 'explode', pal: 'bolt', style: 'bolt', w: 0.7, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
