// 蛛皇阿纳佐斯（敌人 · 混沌 · 不朽 · 首领 · 近战）：高腿帝王蛛。八条极长的腿把帝紫黑的身体架离地面 16 格，像一座架在八根长柱上的王座；
//   膝关节高出背线 6 格，前后两组高拱；头胸前方伸出一根骑枪般的骨白长头刺（16 格，刃口一线诅咒紫光）；
//   头胸顶上一圈 7 根竖起的甲壳尖刺帝冠（中间最高 5 格，金箍镶金）；腹部一块金色沙漏帝纹。
// 攻击：身体后坐、前腿放低、把头刺端平，冲刺 6 格直刺（刺）。
// 技能（特性「首领单位：防御增加 30%」，fx 守护）：蓄力时八条腿收拢、身体下沉，诅咒紫蛛丝从八个腿尖同时向身体收拢，帝冠尖一根根亮起；
//   施放时八条腿猛地撑开，蛛丝织成一张罩住全身的紫色蛛网护盾（点阵半球 + 放射丝），震屏 2 格；
//   命中：护盾点阵亮白后变成网格，外圈闪一次冲击环，甲壳闪白。
// 死亡：头刺先断落；长腿一条条折断跪下，身体从高处砸到地上，帝冠弹飞；眼群熄灭，自上而下消散。
// 腿骨架、步态、受击用 parts-beast 的 bug；帝王身体（腹 + 帝纹、头胸、头 + 眼群）、骑枪头刺、甲壳帝冠、折断的腿是本模块的部件。
PCD.define('SpiderEmperorAnazos', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.curse, EL = FXR[R_EL];                                                  // 帝蛛 · 诅咒紫：淡紫 → 紫 → 暗紫 → 深紫 → 墨紫
  const m = B.mats(E, { main: [0, 52, 25, 42], limb: [0, 25, 42, 24], claw: 'bone', eye: [0, 0, 43, 43], glow: [43, 43, 21, 21] });   // 帝紫黑甲壳，腿亮一级
  const M = {
    shell: E.defMat([0, 52, 25, 42], 1),              // 头胸 / 头 / 帝冠尖刺（小块 band 1）
    gold: E.defMat('gold', 1),                        // 金箍、帝纹、冠尖镶金
    crownLit: E.defMat([42, 24, 43, 21], 1, 1),       // 亮起的冠尖（发光体）
    spike: E.defMat('bone', 1),                       // 骑枪头刺
    edge: E.defMat([25, 42, 43, 21], 1, 1),           // 刃口一线诅咒紫光（发光体，和头刺同一个部件）
    eyeOff: E.defMat([0, 0, 52, 52], 1, 1),           // 熄灭的眼群
  };
  const BASE = { n: 4, rx: 5, ry: 3.5, under: 16, abd: { rx: 8, ry: 7, dx: -12, dy: -4 }, head: { rx: 2.6, ry: 2.2 }, span: 20, knee: 13, fan: 1, kneeOut: 0.45,
    farDx: 2, stride: 3, lift: 4, lw: 2, eyes: 0, fangs: 0, hair: 0, legsFront: 0, m };
  const SHP = [{}, { span: 14, knee: 11, under: 12 }, { span: 23, knee: 12, under: 17 }];   // 0 常态 · 1 蓄力收腿下沉 · 2 施放撑开
  const shapes = new Map();
  function shapeOf(sh, und) { const k = sh * 32 + und; if (!shapes.has(k)) shapes.set(k, G.shape(Object.assign({}, BASE, SHP[sh], und < 16 ? { under: und } : {}))); return shapes.get(k); }

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 50, 46, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.glow, m.ink, m.spec, m.claw, M.gold, M.crownLit, M.spike, M.edge, M.eyeOff]) RIM.skip[k] = 1;
  // 本角色的姿势字段：sh 形体 0–2 · und 死亡时身体离地（16 = 常态）· sa 头刺仰角 0 端平 / 1 上扬 1:4 · fl 前腿放低 0–1
  //   tapN / tapF 近 / 远前腿抬起敲地 0–3 · cl 亮起的冠尖数 0–7 · cg 冠尖闪光 · brk 折断的腿数 0–8 · eo 眼群熄灭
  //   spS 头刺 0 在头上 / 1 下落中 / 2 落地 · spX spY 头刺根的偏移与高 · crS crX crY 帝冠同理
  const EXTRA = [['sh', 0, 2], ['und', 0, 16], ['sa', 0, 1], ['fl', 0, 1], ['tapN', 0, 3], ['tapF', 0, 3], ['cl', 0, 7], ['cg', 0, 1], ['brk', 0, 8], ['eo', 0, 1],
    ['spS', 0, 2], ['spX', -8, 16], ['spY', -30, 0], ['crS', 0, 2], ['crX', -32, 8], ['crY', -40, 0]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.sh = 0; P.und = 16; P.sa = 1; P.fl = 0; P.tapN = 0; P.tapF = 0; P.cl = 0; P.cg = 0; P.brk = 0; P.eo = 0; P.spS = 0; P.spX = 0; P.spY = 0; P.crS = 0; P.crX = 0; P.crY = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = null;
  function makeRig() {                                                                       // bug 的挂点 + 本角色的腿修改（敲地、前腿放低）
    const r = G.rig(P, shapeOf(P.sh, P.und));
    for (const L of r.legs) {
      if (L.i !== 0) continue;
      const tap = L.far ? P.tapF : P.tapN;
      if (tap) { L.F = [L.F[0] - 1, L.F[1] - tap]; L.K = [L.K[0], L.K[1] - R(tap * 0.5)]; }
      if (P.fl) { L.K = [L.K[0] + 1, L.K[1] + 5]; L.F = [L.F[0] - 2, L.F[1]]; }
    }
    return r;
  }
  rig = makeRig();
  const HIT_POINT = [R(rig.T.x) + 1, R(rig.T.y)];

  // ───── 几何 ─────
  const SP_LEN = 16;
  const spikeRoot = () => [R(rig.Hd.x + rig.Hd.rx - 0.5), R(rig.Hd.y + 0.5)];
  const spikeTip = () => { const [x, y] = spikeRoot(); return [x + SP_LEN + P.bx, y - (P.sa ? SP_LEN >> 2 : 0)]; };
  const CROWN = [[-6, 3], [-4, 4], [-2, 4], [0, 5], [2, 4], [4, 4], [6, 3]];                 // 7 根冠刺：相对头胸中心的 x、高
  const crownBase = (dx, T) => R(T.y - T.ry * Math.sqrt(Math.max(0, 1 - (dx / (T.rx + 1.5)) * (dx / (T.rx + 1.5))))) ;
  const BRK_ORDER = [[0, 0], [1, 0], [0, 3], [1, 3], [0, 1], [1, 1], [0, 2], [1, 2]];      // 折断顺序 [far, i]
  const brokenIdx = (L) => { for (let k = 0; k < P.brk; k++) if (BRK_ORDER[k][0] === L.far && BRK_ORDER[k][1] === L.i) return k; return -1; };

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = G.anim.idle(P, tq, f12, DUR[IDLE]); P.glow = 0;
    P.cg = lp >= 0.8 - 1e-6 && lp < 1.0 ? 1 : 0;                                              // 帝冠尖闪一下
    if (lp >= 1.4 - 1e-6 && lp < 2.1) { const k = f12of(lp - 1.4); P.tapN = [3, 0, 0, 3, 0, 0, 0, 0, 0][k] || 0; P.tapF = [0, 0, 3, 0, 0, 3, 0, 0, 0][k] || 0; P.bob = 0; }   // 待机个性：两条前腿交替敲地打鼓点
  }
  const ABX = [0, -2, 6, 6, 5, 4, 2, 1, 0];
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                  // 多足高步：身体平稳不晃
      G.anim.walk(P, tq); P.bob = 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const k = Math.min(8, f12of(tq)); P.bx = ABX[k]; P.crouch = k === 1 ? 1 : 0; P.fl = k >= 1 && k <= 5 ? 1 : 0; P.sa = k >= 1 && k <= 5 ? 0 : 1;
      P.glow = k >= 2 && k <= 4 ? 2 : 0; P.rim = k >= 2 && k <= 3 ? 1 : 0;
    } else if (st === CHARGE) {
      const k = f12of(tq); P.sh = k < 3 ? 0 : 1; P.crouch = k < 3 ? k : 0; P.sa = 1;
      P.cl = Math.max(0, Math.min(7, Math.floor((tq - 0.35) / 0.12) + 1)); P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq > 1.1) P.bx = (f12 & 1) ? -1 : 0;
    } else if (st === CAST) {
      const k = f12of(tq); P.sh = 2; P.cl = 7; P.glow = 3; P.rim = 3; P.sa = 1; P.flash = k === 2 ? 1 : 0;   // 命中那一帧甲壳闪白
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.sh = q < 0.4 ? 2 : 0; P.cl = R(7 * (1 - q)); P.glow = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); P.claw = 0; P.tail = 0; if (h < 0.2) { P.sa = 0; P.tapN = 2; P.tapF = 1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        P.bx = -2; P.glow = d < 0.3 ? 2 : 0;
        if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.sa = 0; }
        if (d >= 0.15 - 1e-6) {                                                                // 头刺先断落：往前翻落到地上
          const q = clamp01((d - 0.15) / 0.3); P.spS = q >= 1 ? 2 : 1; P.spX = R(5 * q); P.spY = q >= 1 ? 0 : R(-17 * (1 - q * q));
        }
        if (d >= 0.3 - 1e-6) {                                                                 // 腿一条条折断，身体一段段往下沉，0.5 → 0.66 离地 3 → 1 → 0
          P.brk = Math.min(8, Math.floor((d - 0.3) / 0.025 + 1e-6) + 1);
          P.und = d < 0.5 ? Math.max(3, 16 - P.brk * 2) : d < 0.58 ? 3 : d < 0.66 - 1e-6 ? 1 : 0;
        }
        if (d >= 0.66 - 1e-6) {                                                                // 砸地时帝冠弹飞到身后
          const q = clamp01((d - 0.66) / 0.35), y0 = -10; P.crS = q >= 1 ? 2 : 1; P.crX = R(-29 * q); P.crY = q >= 1 ? 0 : R(y0 * (1 - q) - Math.sin(q * Math.PI) * 9);
        }
        P.eo = d < 0.9 ? 0 : d < 1.3 ? ((f12 % 3) === 0 ? 0 : 1) : 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = makeRig();
    P.gx = R(rig.T.x) + P.bx; P.gy = R(rig.T.y) - 2;                                          // 焦点：头胸（护盾中心、轮廓光）
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：brokenLeg（折断跪下的长腿）—— 腿根 → 贴地的折膝 → 往外摊的足尖，膝处多 1 格断茬
  function brokenLeg(L, k) {
    E.part();
    const mat = L.far ? m.far : m.limb, s = L.i < 2 ? 1 : -1, bx = L.B[0], by = L.B[1];
    const kx = bx + s * (5 + L.i % 2 * 2), ky = -2 - (L.far ? 1 : 0), fx = kx + s * (6 + (k & 1)), fy = 0;
    U.seg(E, bx, by, kx, ky, L.far ? 1 : 2, mat, 0); U.seg(E, kx, ky, fx, fy, 1, mat, 0);
    U.dot(E, kx, ky - 1, mat, 4); U.dot(E, fx, fy, m.claw, 1);
  }
  // 候选部件：royalAbdomen（帝王腹）—— 大腹椭圆 + 两道甲壳横纹 + 金色沙漏帝纹（同一个部件，帝纹和甲壳之间是自动明暗的边）
  function abdomen() {
    const A = rig.A; E.part();
    U.oval(E, A.x, A.y, A.rx, A.ry, m.body, 0);
    for (const v of [-0.45, 0.35]) for (let x = R(A.x - A.rx * 0.7); x <= R(A.x + A.rx * 0.2); x++) U.dot(E, x, A.y + v * A.ry + (x & 1 ? 0 : 0), m.body, 2);
    const cx = R(A.x - 0.5), cy = R(A.y);
    for (const [dy, w] of [[-3, 2], [-2, 1], [-1, 0], [0, 0], [1, 1], [2, 2]]) for (let dx = -w; dx <= w; dx++) U.dot(E, cx + dx, cy + dy, M.gold, dy === -3 && dx <= 0 ? 4 : Math.abs(dx) === w && w ? 2 : 3);
    U.dot(E, A.x - A.rx * 0.5, A.y - A.ry * 0.6, m.body, 4); U.dot(E, A.x - A.rx * 0.5 + 1, A.y - A.ry * 0.6, m.body, 4);
  }
  function cephalo() {
    const T = rig.T; E.part();
    U.oval(E, T.x, T.y, T.rx, T.ry, M.shell, 0);
    U.dot(E, T.x - 2, T.y, M.shell, 2); U.dot(E, T.x + 1, T.y, M.shell, 2);
  }
  // 候选部件：spikeCrown（甲壳尖刺帝冠）—— 头胸顶上一圈金箍 + 7 根竖起的甲壳尖刺（中间最高），尖端镶金；lit 根数亮起、glint 中间那根闪光
  function crown(at) {
    E.part();
    const T = at ? { x: at[0], y: at[1] + 4, rx: rig.T.rx, ry: 4 } : rig.T;
    for (let dx = -6; dx <= 6; dx++) U.dot(E, T.x + dx, crownBase(dx, T), M.gold, dx < 0 ? 4 : 3);
    CROWN.forEach(([dx, h], k) => {
      const x = T.x + dx, y0 = crownBase(dx, T) - 1, lit = k < P.cl || (P.cg && k === 3);
      for (let j = 0; j < h; j++) { const tip = j >= h - 2 && j > 0; U.dot(E, x, y0 - j, tip ? (lit && j === h - 1 ? M.crownLit : M.gold) : M.shell, tip ? (j === h - 1 ? 4 : 3) : j === 0 ? 2 : 3); }
    });
  }
  function headEyes() {
    const Hd = rig.Hd; E.part();
    U.oval(E, Hd.x, Hd.y, Hd.rx, Hd.ry, M.shell, 0);
    const gl = P.eo ? M.eyeOff : (P.glow | 0) >= 2 ? m.glow : m.eye, ex = R(Hd.x + 0.5), ey = R(Hd.y - 1);
    for (const [dx, dy, t] of [[0, 0, 3], [1, 0, 3], [-1, 0, 3], [0, -1, 4], [1, 1, 3], [-2, -1, 3]]) U.dot(E, ex + dx, ey + dy, gl, t);   // 眼群 6 颗
    U.dot(E, Hd.x + Hd.rx - 1, Hd.y + Hd.ry, m.claw, 3); U.dot(E, Hd.x + Hd.rx - 1, Hd.y + Hd.ry + 1, m.claw, 1);                       // 螯牙
  }
  // 候选部件：lanceSpike（骑枪头刺）—— 根 3 行 → 中段 2 行 → 尖 1 行，逐列按仰角错位（端平 0 / 上扬 1:4），上沿中段一线刃光；free = 断落在地上
  function lanceSpike(x0, y0, sa) {
    E.part();
    for (let k = 0; k <= SP_LEN; k++) {
      const x = x0 + k, y = y0 - (sa ? (k >> 2) : 0), th = k < 5 ? 3 : k < 11 ? 2 : 1;
      for (let j = 0; j < th; j++) {
        const yy = y - (th === 3 ? 1 : th === 2 ? 1 : 0) + j, top = j === 0;
        const mat = top && k >= 4 && k <= 13 ? M.edge : M.spike;
        U.dot(E, x, yy, mat, k === SP_LEN ? 4 : mat === M.edge ? ((P.glow | 0) >= 2 ? 4 : 3) : 0);
      }
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.crS === 2) crown([R(rig.T.x) + P.crX, -1]);                                        // 落地的帝冠在身后，画在最后面
    for (const far of [1, 0]) for (const L of rig.legs) if (L.far === far) { const k = brokenIdx(L); if (k >= 0) brokenLeg(L, k); else G.leg(E, rig, P, shapeOf(P.sh, P.und), L); }
    abdomen();
    cephalo();
    if (!P.crS) crown(null);
    headEyes();
    if (!P.spS) { const [x, y] = spikeRoot(); lanceSpike(x, y, P.sa); }
    else { const [x] = spikeRoot(); lanceSpike(x + 2 + P.spX, P.spS === 2 ? -1 : P.spY, 0); }
    if (P.crS === 1) crown([R(rig.T.x) + P.crX, P.crY - 1]);                                  // 飞在空中的帝冠在最前面
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let lastGf = -9, thrT = 9, silkAcc = 0, emberAcc = 0;
  const shieldC = () => [scrX(-1 + P.bx), HY];
  const SH_RX = 29, SH_RY = 42;
  function onEnter(s) {
    if (s === CHARGE) {}
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [cx, cy] = shieldC();
      fx.dome(cx, cy, SH_RX, SH_RY, R_EL, 0.2, 2);
      burst(cx, cy - 20, 24, 40, 110, 0.25, 0.55, R_EL, 10);
      for (const L of rig.legs) { const x = scrX(L.F[0]); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 2 / 12) {
      const [tx, ty] = spikeTip(), x = scrX(tx), y = HY + ty; thrT = 0;
      burst(x, y, 12, 40, 110, 0.15, 0.35, FXI.impact, 8); burst(x, y, 8, 30, 80, 0.2, 0.45, R_EL, 6); fx.cross(x, y, 4, R_EL, 0.2, 2); hitDummy(1, 1);
      sfx('swing', { kind: 'thrust', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.9 });
    }
    if (s === CHARGE && t === 0.7) {                                                         // 八个腿尖同时拉出诅咒紫蛛丝，向身体收拢
      const cx = scrX(P.gx), cy = HY + P.gy;
      for (const L of rig.legs) fx.link(cx, cy, scrX(L.F[0] + P.bx), HY + L.F[1] - 1, R_EL, 0.72, 2);
    }
    if (s === CAST && t === 2 / 12) {                                                        // 护盾亮白 → 网格；外圈冲击环
      const [cx, cy] = shieldC(); ring(cx, cy - 20, 1, R_EL); shake(0.12, 1);
      for (let k = 0; k < 16; k++) { const a = Math.PI + k / 15 * Math.PI; spawn(K_EMBER, cx + Math.cos(a) * SH_RX, cy + Math.sin(a) * SH_RY, Math.cos(a) * 10, Math.sin(a) * 10 - 4, 0.3 + Math.random() * 0.2, R_EL); }
      sfx('impact', { pal: 'curse', w: 0.9 });
    }
    if (s === DEATH && t === INCOMING + 0.15) { const [x, y] = spikeRoot(); burst(scrX(x + P.bx), HY + y, 8, 20, 60, 0.2, 0.4, FXI.dust, 6); }   // 头刺根折断
    if (s === DEATH && t === INCOMING + 0.66) {                                              // 身体砸地
      for (let i = 0; i < 22; i++) spawn(K_DUST, scrX(-22 + Math.random() * 40), HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 16, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.16, 2); sfx('fall', { w: 0.9 });
    }
  }
  const EVENTS = [[], [], [2 / 12], [0.7], [2 / 12], [], [], [INCOMING + 0.15, INCOMING + 0.66], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                                                 // 长腿落下：接触帧两只脚各扬 1 颗尘（每步 2 颗）
      if (P.gf === 0 || P.gf === 2) {
        const down = rig.legs.filter((L) => !L.up && L.i === (P.gf === 0 ? 0 : 1) || !L.up && L.i === (P.gf === 0 ? 2 : 3)).slice(0, 2);
        for (const L of down) spawn(K_DUST, scrX(L.F[0]) + (Math.random() - 0.5) * 2, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.15, FXI.dust);
        sfx('step', { w: 0.9 });
      }
      lastGf = P.gf;
    }
    if (state === CHARGE && stT > 0.72) {                                                    // 蛛丝上的紫光粒一颗颗被拽进身体
      silkAcc += dt * 20; const cx = scrX(P.gx), cy = HY + P.gy;
      while (silkAcc >= 1) { silkAcc -= 1; const L = rig.legs[(Math.random() * rig.legs.length) | 0], x0 = scrX(L.F[0] + P.bx), y0 = HY + L.F[1] - 1, life = Math.hypot(cx - x0, cy - y0) / 60; spawnX(K_PHYS, x0, y0, (cx - x0) / life, (cy - y0) / life, life, R_EL, {}); }
    }
    if (state === CHARGE && P.cl) {                                                          // 亮起的冠尖飘出紫色余烬
      emberAcc += dt * 3; while (emberAcc >= 1) { emberAcc -= 1; const [dx, h] = CROWN[(Math.random() * P.cl) | 0]; spawn(K_EMBER, scrX(R(rig.T.x) + dx + P.bx), HY + crownBase(dx, rig.T) - h - 1, (Math.random() - 0.5) * 5, -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); }
    }
    thrT += dt;
  }
  function fxReset() { lastGf = -9; thrT = 9; silkAcc = 0; emberAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 蛛网护盾：放射丝 8 条 + 2 圈同心网线 + 外沿点阵；施放第 2 帧整张亮白，之后是网格，收招里逐渐断开消失
  function web(c, cutoff, f12, grow) {
    const [cx, cy] = shieldC(), oy = cy;
    for (let s = 0; s < 9; s++) {
      const a = Math.PI + s / 8 * Math.PI, n = R(SH_RX * 1.2) ;
      for (let k = 2; k <= n * grow; k++) { const q = k / n; if (((k + f12) & 1) && cutoff > 0.3) continue; if (((k * 7 + s * 13) % 10) / 10 < cutoff) continue; put(R(cx + Math.cos(a) * SH_RX * q), R(oy + Math.sin(a) * SH_RY * q), c); }
    }
    if (grow < 1) return;
    for (const rr of [0.42, 0.72, 1]) {
      const n = R(SH_RX * rr * 3.4);
      for (let k = 0; k <= n; k++) { if (((k + f12) & 1) && rr < 1) continue; if (((k * 11 + R(rr * 10)) % 10) / 10 < cutoff) continue; const a = Math.PI + k / n * Math.PI; put(R(cx + Math.cos(a) * SH_RX * rr), R(oy + Math.sin(a) * SH_RY * rr), c); }
    }
  }
  function fxFront(f12) {
    if (thrT < 2 / 12) {                                                                     // 直刺拖影：头刺后面 2 道平行横线
      const [tx, ty] = spikeTip(), x = scrX(tx), y = HY + ty, c = thrT < 1 / 12 ? EL[0] : EL[1];
      for (let k = 3; k < 14; k++) { if (thrT >= 1 / 12 && (k & 1)) continue; put(x - k, y - 2, c); put(x - k - 1, y + 2, c); }
    }
    const st = E.state, t = E.stT;
    if (st === CAST) {
      if (t < 2 / 12) web(EL[1], 0, f12, clamp01(t / (2 / 12) + 0.35));
      else if (t < 3 / 12) web(21, 0, f12, 1);
      else web(EL[2], 0, f12, 1);
    } else if (st === RECOVER && t < 0.55) web(t < 0.25 ? EL[2] : EL[3], t / 0.55, f12, 1);
  }

  return {
    name: '蛛皇阿纳佐斯', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow, M.crownLit, M.edge], HIT_POINT, EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'curse', style: 'shield', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
