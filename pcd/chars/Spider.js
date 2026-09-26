// 魂蛛（部队 · 恶魔 · 战士 · 普通 · 近战）：高膝八足的墨紫魂蛛。两条前腿特别长，像两支骨白镰矛高举过头；头胸背上立着 3 根燃魂火的祭烛；
//   腹部是一颗半透明魂囊，囊上 7 颗符文斑按等级点亮（灵魂献祭的 7 级成长）；腹尖一根上翘的吸魂管；头前一对小恶魔角状螯肢。
// 攻击：两条镰矛前腿高举，交替向前下方连戳两下（双足 × 刺）。
// 技能「灵魂献祭」（特性：附近敌人死亡时吸魂、升级、变强）：假人脚下冒出一团魂光（代表死去的敌人），吸魂管翻到背上前指、
//   一条虚线蛛丝连过去，魂粒沿丝一颗颗被拽进腹部；施放时魂囊猛地鼓胀、下一颗符文斑点亮、整只蜘蛛放大 1 格定格 2 帧，
//   暗紫冲击环 + 祭烛火苗窜高；命中：升级星芒 + 魂囊回流 6 颗小十字飘升（满级回血）。
// 死亡：翻倒蜷腿，魂囊「啵」地破开，魂光一颗颗飘升散去，祭烛倒下熄灭。
// 身体用 parts-beast 的 bug（腿骨架、步态、受击 / 死亡姿势）；镰矛前腿、魂囊、吸魂管、祭烛、角状螯肢是本模块的部件。
PCD.define('Spider', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.shadow, EL = FXR[R_EL];                                                      // 噬魂 · 暗紫：淡紫 → 紫 → 深紫 → 墨紫 → 墨
  const R_SOUL = fxRamp('spiderSoul', [21, 43, 54, 53, 52]), SL = FXR[R_SOUL];                  // 魂粒：第 1 级用 21 白，其余同暗紫
  const m = B.mats(E, { main: 'shadow', limb: 'purple', claw: 'bone', eye: [0, 0, 43, 43], glow: [43, 43, 21, 21] });   // 腿 purple 比甲壳亮一级
  const M = {
    shell: E.defMat('shadow', 1),                     // 头胸 / 头：墨紫甲壳（小块 band 1）
    sac: E.defMat([52, 53, 54, 43], 2),               // 魂囊膜（shadow 亮段）
    core: E.defMat([54, 43, 43, 21], 1, 1),           // 囊内魂光（发光体，心跳一胀一缩）
    rune: E.defMat([52, 53, 43, 21], 1, 1),           // 7 颗符文斑：未点亮 53（shadow 第 3 级，tone 2）· 点亮 21（tone 4）
    candle: E.defMat('bone', 1), flame: E.defMat([53, 43, 43, 21], 1, 1),   // 火苗：shadow 第 1 级 43 + 21 芯
    bone: E.defMat('bone', 1), boneF: E.defMat('bone', 1, 0, 1),
  };
  const BASE = { n: 4, rx: 3.5, ry: 2.6, under: 6, abd: { rx: 5.5, ry: 3.8, dx: -7, dy: 0 }, head: { rx: 2, ry: 1.8 }, span: 15, knee: 8, fan: 1, kneeOut: 0.8,   // 高膝：膝高出背线 6 格、身体离地 6 格
    farDx: 3, stride: 2, lift: 2, lw: 1, eyes: 4, fangs: 0, hair: 1, legsFront: 0, m };
  const o = G.shape(BASE);
  const oBig = G.shape(Object.assign({}, BASE, { rx: 4, ry: 3, under: 7, abd: { rx: 6.5, ry: 4.5, dx: -7.5, dy: -2 }, head: { rx: 2.3, ry: 2 }, span: 16 }));   // 升级那一下：放大 1 格

  const HX = 76, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 44, 42, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: SL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.glow, m.ink, m.spec, M.core, M.rune, M.flame, M.candle, M.bone, M.boneF, m.claw]) RIM.skip[k] = 1;
  // 本角色的姿势字段：sa / sb 近 / 远镰矛前腿姿势（0 高举 · 1 后引 · 2 前下戳 · 3 梳理螯肢 · 4 乱挥 · 5 行走前探 · 6 献祭高举）
  //   tp 吸魂管 0 上翘 / 1 翻到背上前指 · lvl 点亮的符文斑数 0–7 · pulse 魂光心跳 0–2 · fl 祭烛火苗 0 熄灭 / 1 小 / 2 正常 / 3 窜高
  //   grow 放大 1 格 · swell 魂囊 0 常态 / 1 鼓胀 / 2 回缩 1 格 · pop 魂囊破开 · cand 祭烛 0 立着 / 1 歪倒 / 2 倒在地上
  const EXTRA = [['sa', 0, 6], ['sb', 0, 6], ['tp', 0, 1], ['lvl', 0, 7], ['pulse', 0, 2], ['fl', 0, 3], ['grow', 0, 1], ['swell', 0, 2], ['pop', 0, 1], ['cand', 0, 2]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.sa = 0; P.sb = 0; P.tp = 0; P.lvl = 3; P.pulse = 0; P.fl = 2; P.grow = 0; P.swell = 0; P.pop = 0; P.cand = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [R(rig.T.x) - 1, R(rig.T.y) - 1];

  // ───── 姿势 ─────
  const F = ['bx', 'crouch', 'pitch'];
  const REST = { bx: 0, crouch: 0, pitch: 0 };
  const T_HIT1 = 2 / 12, T_HIT2 = 4 / 12, T_LVL = 2 / 12;
  const ATK = [[0, REST], [0.12, { bx: -1, crouch: 0, pitch: 1 }, 'out'], [T_HIT1, { bx: 4, crouch: 1, pitch: 0 }, 'snap'], [T_HIT2 - 0.001, { bx: 4, crouch: 1, pitch: 0 }, 'lin'],
    [T_HIT2, { bx: 5, crouch: 1, pitch: 0 }, 'snap'], [0.45, { bx: 3, crouch: 0, pitch: 0 }, 'out'], [0.75, REST, 'inOut']];
  const C_UP = { bx: -1, crouch: 0, pitch: 2 };
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = G.anim.idle(P, tq, f12, DUR[IDLE]), hb = f12 % 12;
    P.pulse = hb === 0 || hb === 3 ? 2 : hb === 1 || hb === 4 ? 1 : 0;                           // 魂囊心跳（一秒两下）
    P.fl = 1 + ((f12 >> 1) & 1);                                                                  // 祭烛火苗摇
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                           // 待机个性：两条前腿轮流梳理螯肢
      const k = Math.min(4, f12of(lp - 1.6)); P.sa = k < 2 ? 3 : 0; P.sb = k >= 2 && k < 4 ? 3 : 0; P.jaw = (k & 1) ? 2 : 1; P.bob = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = G.anim.walk(P, tq); P.sa = f === 0 ? 5 : 0; P.sb = f === 2 ? 5 : 0; P.pulse = f & 1; P.fl = 1 + (f & 1);
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp);
      const k = f12of(tq);
      P.sa = k === 1 ? 1 : k === 2 || k === 3 ? 2 : k === 4 || k === 5 ? 1 : 0;
      P.sb = k === 1 || k === 2 || k === 3 ? 1 : k === 4 || k === 5 ? 2 : 0;
      P.jaw = k >= 2 && k <= 5 ? 2 : 0; P.glow = k >= 2 && k <= 5 ? 2 : 0; P.rim = k >= 1 && k <= 5 ? 1 : 0; P.fl = k >= 2 && k <= 5 ? 1 : 2;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_UP, ease.inOut(tq / 0.7), F); apply(tmp); } else apply(C_UP);
      P.sa = tq < 0.2 ? 0 : 6; P.sb = tq < 0.3 ? 0 : 6; P.tp = tq >= 0.25 ? 1 : 0; P.jaw = 1;
      P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      P.pulse = tq < 0.7 ? (f12 % 6 === 0 ? 2 : f12 % 6 === 1 ? 1 : 0) : ((f12 & 1) ? 2 : 1);  // 吸魂时心跳越来越快
      P.fl = tq > 0.9 ? 2 + (f12 & 1) : 2;
    } else if (st === CAST) {
      apply(C_UP); P.sa = 6; P.sb = 6; P.jaw = 2; P.glow = 3; P.rim = 3; P.pulse = 2; P.fl = 3;
      const k = f12of(tq);                                                                        // f0–f1 放大 + 鼓胀定格 · f2 魂囊回缩 1 格（过渡）+ 第 4 颗符文斑亮 · f3–f5 常态、火苗摇
      P.grow = 1; P.swell = k < 2 ? 1 : k === 2 ? 2 : 0; P.tp = k < 2 ? 1 : 0; P.lvl = tq >= T_LVL - 1e-6 ? 4 : 3; if (k >= 3) P.fl = 2 + (k & 1);
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, C_UP, REST, q, F); apply(tmp);
      P.sa = q < 0.35 ? 6 : q < 0.7 ? 1 : 0; P.sb = q < 0.45 ? 6 : q < 0.8 ? 1 : 0; P.jaw = q < 0.5 ? 1 : 0;
      P.grow = q < 0.35 ? 1 : 0; P.lvl = 4; P.fl = q < 0.5 ? 3 : 2; P.glow = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.pulse = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); if (h < 0.2) { P.sa = 4; P.sb = 4; P.pulse = 2; P.fl = 1; P.rim = 0; } else if (h < 0.35) { P.sa = 1; P.sb = 1; P.fl = 1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        G.anim.death(P, d, f12); P.rim = 0; P.glow = 0;
        P.sa = P.sb = d < 0.3 ? 4 : 0;
        P.pop = d >= 0.66 - 1e-6 ? 1 : 0; P.lvl = P.pop ? 0 : 3; P.pulse = d < 0.3 ? 2 : 0;
        P.cand = d < 0.3 ? 0 : d < 0.5 ? 1 : 2;
        P.fl = d < 0.3 ? 1 : d < 0.66 ? ((f12 & 1) ? 1 : 0) : d < 1.0 ? ((f12 % 3) === 0 ? 1 : 0) : 0;   // 祭烛闪几下熄灭
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, P.grow ? oBig : o); layoutLegs(rig, P.grow);
    P.gx = R(rig.A.x) + P.bx; P.gy = R(rig.A.y);
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  // 镰矛前腿：腿根 → 膝 → 镰尖，按腿根的偏移 [膝 x, 膝 y, 尖 x, 尖 y]
  const SCY = [[2, -11, 7, -8], [1, -10, 5, -9], [6, -5, 13, 0], [3, -5, 3, -1], [1, -9, -2, -12], [5, -7, 9, -3], [2, -10, 5, -14]];
  const legOf = (far, i) => rig.legs.find((L) => !!L.far === !!far && L.i === i);
  function scyTip(far, k) { const L = legOf(far, 0), S = SCY[k]; return [L.B[0] + S[2] + P.bx, L.B[1] + S[3]]; }
  // 吸魂管：腹尖根部 + 各节偏移（0 上翘 · 1 翻到背上前指）
  const TUBE = [[[0, 0], [0, -2], [-1, -4], [-1, -6], [0, -8], [1, -9]], [[0, 0], [-1, -3], [-1, -6], [-1, -9], [0, -12], [2, -14]], [[0, 0], [-2, 0], [-4, 1], [-6, 2], [-7, 3], [-8, 3]]];   // 0 从腹尖竖着翘过后腿膝顶 · 1 蓄力时再伸长、管口往前勾（高过祭烛火苗，不和第一根祭烛并成一块）· 2 翻倒后耷拉到地上
  function tubePts() { const A = rig.A, bx = A.x - A.rx * 0.75, by = A.y - A.ry * 0.3, T = TUBE[rig.lie === 2 ? 2 : rig.lie ? 0 : P.tp]; return T.map(([dx, dy]) => [bx + dx, by + dy]); }
  function tubeTip() { const p = tubePts(), e = p[p.length - 1]; return [scrX(e[0] + P.bx), HY + e[1]]; }
  const CAND = [[-6, 5], [-2, 5], [2, 5]];                                                      // 祭烛：头胸中心的 x 偏移、烛身高（1 格宽、5 格高，烛心间隔 4 格；最前一根离镰矛腿根 4 格）
  // 某一列身体（头胸 ∪ 魂囊）最上面一格：oval 画法同款（半径 +0.35），魂囊跟着 swell 变大变小
  function ovalTop(x, cx, cy, rx, ry) { const u = (x - cx) / (rx + 0.35); return u * u > 1 ? 9 : Math.floor(cy - (ry + 0.35) * Math.sqrt(1 - u * u)) + 1; }
  function backTop(x) {
    const T = rig.T, A = rig.A, sw = P.swell === 1 ? 1 : P.swell === 2 ? -1 : 0;
    return Math.min(ovalTop(x, T.x, T.y, T.rx, T.ry), ovalTop(x, A.x, A.y, A.rx + sw, A.ry + sw * 0.8));
  }
  function candleBase(dx) { const x = R(rig.T.x + dx); return [x, backTop(x)]; }                 // 背线最上一格（烛根埋进去 1 格）

  // ───── 画 ─────
  // 候选部件：legLayout（高拱腿排布）—— 站着时按表重排走路腿的 根 x · 膝 x · 膝 y · 足 x（站姿静止时的坐标，头胸中心为 0），
  //   步态 / 下蹲 / 抬身的偏移照骨架原样叠上去。腿根藏在身体后面，上段几乎竖直升到膝顶，每条腿在背上是一道独立的窄拱：
  //   后腿两道（远侧更靠后更低）、中腿一道、前腿往前低伸；远侧中腿的膝藏在腹后，只在身下露脚。镰矛前腿（i 0）根往前挪到头下。
  const LAY = { 0: { 1: [7, 12, -12, 13], 2: [-7, -9, -10, -10], 3: [-13, -15, -19, -17] },   // 近侧（中腿的膝收进魂囊后面，背上让给祭烛）
                1: { 1: [9, 15, -11, 17], 2: [-5, -5, -11, -5], 3: [-17, -22, -16, -23] } };  // 远侧（后腿根、膝往后挪，和近侧后腿拱隔开）
  const SCY_DX = 4, RP = {}; G.reset(RP);
  const LREST = [G.rig(RP, o), G.rig(RP, oBig)];
  function layoutLegs(r, big) {
    if (r.lie) return; const rest = LREST[big ? 1 : 0], s = big ? 1.08 : 1;
    r.legs.forEach((L, j) => {
      if (!L.i) { L.B = [L.B[0] + SCY_DX, L.B[1]]; return; }
      const Q = rest.legs[j], [bx, kx, ky, fx] = LAY[L.far ? 1 : 0][L.i];
      L.B = [bx * s, L.B[1]]; L.K = [kx * s + L.K[0] - Q.K[0], ky * s + L.K[1] - Q.K[1]]; L.F = [fx * s + L.F[0] - Q.F[0], L.F[1]];
    });
  }
  // 候选部件：thinLeg（细高拱腿）—— 上下两段都 1 格粗（近侧亮、远侧暗一级），膝节 1 格高光、足尖骨白；腿细，拱和拱之间才留得出缝
  function thinLeg(L) {
    E.part(); const mat = L.far ? m.far : m.limb;
    U.seg(E, L.B[0], L.B[1], L.K[0], L.K[1], 1, mat, 0); U.seg(E, L.K[0], L.K[1], L.F[0], L.F[1], 1, mat, 0);
    U.dot(E, L.K[0], L.K[1], mat, L.far ? 3 : 4); U.dot(E, L.F[0], L.F[1], m.claw, 1);
  }
  // 候选部件：scytheLeg（镰矛腿）—— 两段：腿段（近侧 2 格粗）→ 镰段（后半骨白、尖端亮、刃中段往里勾 1 格）+ 膝刺；pose 表按腿根偏移给膝和尖
  function scytheLeg(L, k, far) {
    E.part();
    const S = SCY[k], b0 = L.B[0], b1 = L.B[1], kx = b0 + S[0], ky = b1 + S[1], tx = b0 + S[2], ty = b1 + S[3];
    const mat = far ? m.far : m.limb, bn = far ? M.boneF : M.bone;
    U.seg(E, b0, b1, kx, ky, far ? 1 : 2, mat, 0);
    const dx = tx - kx, dy = ty - ky, d = Math.hypot(dx, dy) || 1, n = Math.max(2, Math.ceil(d * 2));
    for (let j = 0; j <= n; j++) { const q = j / n; U.dot(E, kx + dx * q, ky + dy * q, q > 0.45 ? bn : mat, q >= 1 ? 4 : 0); }
    const hx = kx + dx * 0.72 - dy / d * 1.1, hy = ky + dy * 0.72 + dx / d * 1.1; U.dot(E, hx, hy, bn, 2);   // 镰刃内缘往回勾
    U.dot(E, kx, ky - 1, mat, far ? 0 : 4);                                                         // 膝刺
  }
  // 候选部件：soulTube（腹尖吸魂管）—— 折线管（甲壳色），根 2 格粗、梢 1 格，管口 1 格魂光
  function soulTube() {
    E.part(); const p = tubePts();
    for (let i = 1; i < p.length; i++) U.seg(E, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1], i <= 2 ? 2 : 1, M.shell, 0);   // 墨紫管身，和亮一级的腿分开
    const e = p[p.length - 1]; U.dot(E, e[0], e[1], M.core, P.tp || P.glow >= 2 ? 4 : 3);
  }
  // 候选部件：soulSac（发光魂囊腹）—— 膜（band 2）+ 囊内魂光椭圆（随 pulse 一胀一缩）+ 沿上半圈 7 颗符文斑（点亮数 lvl）；pop = 破开瘪下去
  function soulSac() {
    const A = rig.A; E.part();
    const sw = P.swell === 1 ? 1 : P.swell === 2 ? -1 : 0, rx = A.rx + sw, ry = A.ry + sw * 0.8;
    if (P.pop) {
      U.oval(E, A.x, A.y + ry * 0.4, rx * 0.95, ry * 0.58, M.sac, 0);
      const top = R(A.y + ry * 0.4 - ry * 0.58);
      for (const [dx, t] of [[-1, 1], [0, 1], [1, 1], [-2, 2], [2, 2]]) U.dot(E, A.x + dx, top + (Math.abs(dx) > 1 ? 0 : 1), M.sac, t);   // 裂口
      U.dot(E, A.x - 2, top - 1, M.sac, 4); U.dot(E, A.x + 2, top - 1, M.sac, 3);                        // 翻起的膜边
      return;
    }
    U.oval(E, A.x, A.y, rx, ry, M.sac, 0);
    const cr = [0.42, 0.52, 0.62][P.pulse];
    U.oval(E, A.x - 0.6, A.y + 0.4, rx * cr, ry * cr, M.core, 3);
    U.dot(E, A.x - 1, A.y, M.core, P.pulse === 2 || P.glow >= 2 ? 4 : 3);
    for (let k = 0; k < 7; k++) {                                                                  // 沿囊边一圈：从后下方起，经后缘、顶上绕到前上方（避开头胸遮住的前段），按等级从后往前点亮
      const a = Math.PI * (0.62 + 1.1 * k / 6), x = A.x + Math.cos(a) * (rx - 0.9), y = A.y + Math.sin(a) * (ry - 0.8);
      U.dot(E, x, y, M.rune, k < P.lvl ? 4 : 2);
    }
  }
  // 候选部件：ritualCandles（背上祭烛）—— 骨白烛身 + 1 格蜡泪；火苗单独一个部件（伸出烛身之外的发光体），fl 档决定高度；tilt 歪倒
  function candles(tilt) {
    E.part();
    const tops = [];
    CAND.forEach(([dx, h], k) => {
      const [x, y0] = candleBase(dx);
      for (let j = 0; j <= h; j++) U.dot(E, x + R(j * tilt * 0.5), y0 - j, M.candle, 4);       // 1 格宽骨白烛身（亮面色，剪影里一眼看见；烛顶那格被火苗的分界线吃掉，露出 5 格）
      if (k === 1) U.dot(E, x - 1 + R(tilt * 0.5), y0 - 1, M.candle, 4);                        // 蜡泪（贴着背线，不去填烛与烛之间的缝）
      tops.push([x + R((h + 1) * tilt * 0.5), y0 - h - 1]);
    });
    if (!P.fl) return;
    E.part();
    tops.forEach(([x, y], k) => {
      const hgt = [0, 2, 3, 4][P.fl], core = [0, 1, 1, 2][P.fl], fk = ((k + P.fl + P.bob) & 1);   // 43 火苗 + 底部 21 芯；窜高时 4 格
      for (let j = 0; j < hgt; j++) U.dot(E, x, y - j, M.flame, j < core || (fk && j === hgt - 1 && hgt > 2) ? 4 : 3);   // 摇 = 火尖一闪白（不横摆，免得把烛间的缝填上）
    });
  }
  function candlesLying() {                                                                        // 倒在地上的三根祭烛（火苗熄了只剩 1 格余烬）
    E.part();
    [[4, 3], [10, 3], [16, 3]].forEach(([x0, h], k) => { for (let j = 0; j <= h; j++) U.dot(E, x0 + j, -1 - (k === 1 && j > 1 ? 1 : 0), M.candle, j === h ? 4 : 0); });
    if (P.fl) { E.part(); [[8, -1], [14, -2], [20, -1]].forEach(([x, y]) => U.dot(E, x, y, M.flame, 3)); }
  }
  // 候选部件：curledLegs（翻倒蜷腿）—— 肚皮朝上时 8 条腿收成 4 对朝上的弯钩：每对是近侧腿（亮）贴着远侧腿（暗，矮 2 格）
  //   从背线竖起，顶上往头那边折 1 格、钩尖骨白往下勾；对与对的根相隔 5 格（中间留 3 格缝），前面那对是镰矛腿、钩尖长 1 格
  const CURL = [[3, 4], [-2, 5], [-7, 5], [-12, 4]];
  function curledLegs() {
    const T = rig.T;
    CURL.forEach(([dx, h], k) => {
      const x = R(T.x + dx), y0 = backTop(x);
      E.part(); for (let j = 0; j <= h - 2; j++) U.dot(E, x, y0 - j, m.far, 0);                   // 远侧腿
      E.part(); for (let j = 0; j <= h; j++) U.dot(E, x, y0 - j, m.limb, j === h ? 4 : 0);        // 近侧腿竖起
      U.dot(E, x + 1, y0 - h - 1, m.limb, 4);                                                      // 膝往前折
      U.dot(E, x + 1, y0 - h, k ? m.claw : M.bone, 4); if (!k) U.dot(E, x + 1, y0 - h + 1, M.bone, 3);   // 钩尖往下勾（镰矛腿长 1 格）
    });
  }
  function cephalo() {
    const T = rig.T, Hd = rig.Hd;
    E.part(); U.oval(E, T.x, T.y, T.rx, T.ry, M.shell, 0);
    U.dot(E, T.x - 1, T.y - 1, M.shell, 2); U.dot(E, T.x + 1, T.y - 1, M.shell, 2);               // 头胸背上的凹纹
    E.part(); U.oval(E, Hd.x, Hd.y, Hd.rx, Hd.ry, M.shell, 0);
    const gl = P.glow >= 2 ? m.glow : m.eye, ex = rig.eye[0], ey = rig.eye[1];
    U.dot(E, ex, ey, gl, 3); U.dot(E, ex + 1, ey, gl, 4); U.dot(E, ex - 1, ey - 1, gl, 3); U.dot(E, ex + 1, ey + 1, gl, 3);   // 四眼
  }
  // 候选部件：hornFangs（角状螯肢）—— 头前一对往前上弯的小角（近侧亮、远侧暗一级），jaw 张开时上下分开
  function hornFangs() {
    E.part(); const Hd = rig.Hd, x = R(Hd.x + Hd.rx - 0.5), y = R(Hd.y + Hd.ry * 0.5), j = P.jaw | 0;
    for (const [far, mat] of [[1, M.boneF], [0, M.bone]]) {
      const x0 = x - far, y0 = y + (far ? 0 : j);
      U.dot(E, x0, y0 + 1, mat, 0); U.dot(E, x0 + 1, y0 + 1, mat, 0); U.dot(E, x0 + 2, y0, mat, 0); U.dot(E, x0 + 2, y0 - 1 - (far ? 0 : 0), mat, 4);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = P.grow ? oBig : o, lie = rig.lie;
    if (lie !== 2) {
      for (const L of rig.legs) if (L.far) { if (L.i === 0 && !lie) scytheLeg(L, P.sb, 1); else if (lie) G.leg(E, rig, P, oo, L); else thinLeg(L); }
      for (const L of rig.legs) if (!L.far && (L.i !== 0 || lie)) { if (lie) G.leg(E, rig, P, oo, L); else thinLeg(L); }
    }
    soulTube();
    soulSac();
    cephalo(); hornFangs();
    if (P.cand < 2 && lie !== 2) candles(P.cand === 1 ? 2 : 0);                                    // 祭烛画在甲壳前面，烛身整根露出背线
    if (!lie) scytheLeg(legOf(0, 0), P.sa, 0);
    if (lie === 2) curledLegs();
    if (P.cand === 2) candlesLying();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const BALL_X = DUMMY_X + 1, BALL_Y = FLOOR - 3, HN = 6;
  const hcX = new Float32Array(HN), hcY = new Float32Array(HN), hcT = new Float32Array(HN).fill(9);
  let spiralAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, stT0 = 9, stX = 0, stY = 0, stDX = 0, stDY = 0;
  const sacScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CHARGE) dummyFx({ dur: 2.1, tint: R_EL, slow: 0.4 });                                // 目标被抽魂：染暗紫、动作变慢
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [sx, sy] = sacScr();
      releaseOrbit(30, 80, 0.3, 0.6, { pts: 1 }); burst(sx, sy, 16, 40, 100, 0.25, 0.5, R_SOUL, 8); ring(sx, sy, 1, R_EL);
      burst(BALL_X, BALL_Y, 10, 20, 60, 0.2, 0.4, R_SOUL, 10); hitDummy(1, 1);                       // 最后一缕魂被拽走
      for (const [dx, h] of CAND) { const [x, y] = candleBase(dx); for (let i = 0; i < 2; i++) spawn(K_EMBER, scrX(x + P.bx), HY + y - h - 4, Math.random() * 8 - 4, -18 - Math.random() * 10, 0.4 + Math.random() * 0.2, R_EL); }
      shake(0.28, 2); flash(0.05);
    }
  }
  function stab(far) {
    const [tx, ty] = scyTip(far, 2); stT0 = 0; stX = scrX(tx); stY = HY + ty; stDX = 1; stDY = 0.45;
    burst(stX, stY, 8, 30, 80, 0.15, 0.35, FXI.impact, 8); burst(stX, stY, 5, 20, 50, 0.2, 0.4, R_EL, 6); hitDummy(0, 1);
    sfx('swing', { kind: 'thrust', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.35 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT1) stab(0);
    if (s === ATTACK && t === T_HIT2) stab(1);
    if (s === CAST && t === T_LVL) {                                                               // 升级：第 4 颗符文斑亮、星芒、回流小十字
      const [sx, sy] = sacScr(); fx.cross(sx - 1, sy - 5, 6, R_SOUL, 0.35, 2); burst(sx, sy, 20, 30, 90, 0.3, 0.6, R_SOUL, 10); shake(0.12, 1);
      for (let k = 0; k < HN; k++) { hcX[k] = sx - 8 + k * 3 + (k & 1); hcY[k] = sy - 2 - (k % 3) * 2; hcT[k] = -k * 0.06; }
      sfx('impact', { pal: 'curse', w: 0.45 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                                    // 翻倒落地，魂囊「啵」地破开
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      const [sx, sy] = sacScr(); burst(sx, sy, 8, 20, 50, 0.2, 0.4, R_SOUL, 6); ring(sx, sy, 0, R_EL);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_HIT1, T_HIT2], [], [T_LVL], [], [], [INCOMING + 0.66], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.45) {                                                          // 魂粒沿蛛丝被拽向吸魂管（画在 silk 里），再螺旋汇入魂囊
      const [tx, ty] = tubeTip(), [sx, sy] = sacScr();
      spiralAcc += dt * 9; while (spiralAcc >= 1) { spiralAcc -= 1; const r = Math.hypot(tx - sx, ty - sy), a = Math.atan2(ty - sy, tx - sx); spawnX(K_SPIRAL_PT, sx, sy, r / (0.35 + Math.random() * 0.2), 0, 9, R_SOUL, { a, r, w: 3 + Math.random() * 2, squash: 1 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                        // 八足爬行：每 2 帧 1 颗尘，接触帧落脚声
      spawn(K_DUST, scrX((P.gf & 1) ? -8 : 9) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust);
      if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.2 });
      lastGf = P.gf;
    }
    if ((state === IDLE || state === RECOVER) && P.fl) {                                           // 祭烛魂火偶尔飘出一粒
      emberAcc += dt * (state === IDLE ? 1.5 : 5); while (emberAcc >= 1) { emberAcc -= 1; const [dx, h] = CAND[(Math.random() * 3) | 0], [x, y] = candleBase(dx); spawn(K_EMBER, scrX(x + P.bx), HY + y - h - 2, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 0.7 && stT < INCOMING + 2.2) {                         // 破囊后魂光一颗颗飘升散去
      soulAcc += dt * (stT < INCOMING + 1.6 ? 9 : 16); while (soulAcc >= 1) { soulAcc -= 1; const [sx, sy] = sacScr(); spawn(K_RISE, sx + (Math.random() - 0.5) * 8, sy - 1, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.8 + Math.random() * 0.7, stT < INCOMING + 1.6 ? R_SOUL : FXI.soul); }
    }
    stT0 += dt; for (let k = 0; k < HN; k++) hcT[k] += dt;
  }
  function fxReset() { spiralAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; stT0 = 9; hcT.fill(9); }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, SL, f12); }
  // 假人脚下的魂光（死去的敌人）+ 从吸魂管连过去的虚线蛛丝（丝上的虚线往蜘蛛这边流）
  function fxMid(f12) {
    const st = E.state, t = E.stT;
    const on = st === CHARGE && t > 0.15, pop = st === CAST && t < 1 / 12;
    if (!on && !pop) return;
    const r = pop ? 4 : Math.min(3, (t - 0.15) / 0.12) * (t > 1.15 ? 0.7 : 1);
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {
      const d = Math.hypot(i, j * 1.3); if (d > r + 0.3) continue;
      put(BALL_X + i, BALL_Y + j, pop ? SL[0] : d < r * 0.4 ? SL[0] : d < r * 0.75 ? SL[1] : ((i + j + f12) & 1) ? SL[2] : SL[1]);
    }
  }
  // 虚线蛛丝：从管口往上拱过祭烛和镰矛、再落到魂光上（画在角色前面，不被身体挡住）；每 2 格一点 54，21 亮点往蜘蛛这边流，
  //   再有 3 颗魂粒（21 + 43 拖尾）沿丝被拽回管口
  const SKX = new Int16Array(160), SKY = new Int16Array(160);
  function silk(f12) {
    const t = E.stT, [tx, ty] = tubeTip(), bx = BALL_X, by = BALL_Y - 3, cx = (tx + bx) / 2, cy = Math.min(ty, by) - 9;
    const q = Math.min(1, (t - 0.3) / 0.15), L = Math.hypot(cx - tx, cy - ty) + Math.hypot(bx - cx, by - cy), N = Math.ceil(L * 1.6);
    let n = 0;
    for (let i = 0; i <= N && n < 160; i++) {
      const u = i / N; if (u > q) break; const a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u, x = R(a * tx + b * cx + c * bx), y = R(a * ty + b * cy + c * by);
      if (n && SKX[n - 1] === x && SKY[n - 1] === y) continue; SKX[n] = x; SKY[n] = y; n++;
    }
    for (let k = 0; k < n; k++) { const s = k + f12; if (s & 1) continue; put(SKX[k], SKY[k], (s >> 1) % 3 === 0 ? SL[0] : EL[1]); }
    if (q < 1 || n < 6) return;
    for (let j = 0; j < 3; j++) { const k = n - 1 - (((t * 34) | 0) + ((j * n / 3) | 0)) % n; put(SKX[k], SKY[k], SL[0]); if (k + 1 < n) put(SKX[k + 1], SKY[k + 1], SL[1]); }
  }
  function fxFront(f12) {
    if (E.state === CHARGE && E.stT > 0.3) silk(f12);
    if (stT0 < 2 / 12) {                                                                           // 镰尖戳出的一道短刺光
      const c0 = stT0 < 1 / 12 ? EL[0] : EL[1];
      for (let k = 1; k <= 5; k++) { if (stT0 >= 1 / 12 && (k & 1)) continue; put(R(stX - stDX * k * 1.4), R(stY - stDY * k * 1.4), k <= 2 ? c0 : EL[1]); }
      put(stX + 1, stY, SL[0]);
    }
    for (let k = 0; k < HN; k++) {                                                                 // 回流的小十字（满级回血）
      const t = hcT[k]; if (t < 0 || t > 0.8) continue; if (t > 0.56 && (f12 & 1)) continue;
      const x = R(hcX[k] + Math.sin(t * 9 + k) * 1), y = R(hcY[k] - t * 18), c = t < 0.12 ? SL[0] : t < 0.35 ? SL[1] : t < 0.6 ? SL[2] : SL[3];
      put(x, y, c); put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, c); if (t < 0.3) put(x, y, SL[0]);
    }
  }

  return {
    name: '魂蛛', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.core, M.rune, M.flame, m.eye, m.glow], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'curse', style: 'buff', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
