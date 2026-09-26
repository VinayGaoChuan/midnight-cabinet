// 翠蠕虫王（敌人 · 混沌 · 优质 · 近战 256）：「迷你首领单位。一只巨大的赤蝎」；特性「首领单位」：防御增加 30%（fx 守护）。
// 翠蠕虫一族的首领（兵 → 统领 → 王画成同一族：王是统领的放大赤甲版，翠绿晶刺是全族的记号）。
// 宽重巨蝎：壳又宽又扁，赤铜红甲壳带金属光泽；一对巨螯（占身长一半）平时一低一高举在头前、钳口微张（剪影是两道叉），蓄力时才交叉护头；
//   分节蝎尾从抬高的尾根高高弯过背，尾尖毒囊上长着一圈翠绿晶刺，伸出背线 10 格以上；背甲上竖起三道锯齿甲脊，头顶一对短冠角。
// 攻击 = 夹：双螯上下张开，再向前合拢一夹（「喀嚓」）。
// 技能「首领单位」（被动，表现它生效的样子）：双螯交叉挡在头前、身体压低，沙粒从地面螺旋汇聚到背甲，甲脊一节节亮起 →
//   双螯砸地，身边一圈沙岩尖刺从地里立起（左右两道地裂 + 抛起的沙块），震屏 2 格 → 沙色点阵护盾罩住全身、甲壳闪白一次，护盾一段段熄灭。
// 死亡 = 翻成肚皮朝上、腿蜷起来，尾巴最后垂落。
// 身体用 parts-beast 的 bug（腿骨架、步态）；巨螯、背甲 + 甲脊、冠角、分节蝎尾 + 晶刺毒囊、翻倒姿是本模块的部件。
PCD.define('VerdantWormKing', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, fall, sfx, hitDummy, put, scrX, floorGlow, bayer } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 元素：甲壳 · 沙砾土黄（dust：奶沙 6 → 沙灰 7 → 石 10 → 9 → 8）─────
  const R_EL = FXI.dust, EL = FXR[R_EL];
  // ───── 材质 ─────
  const CU = E.ramp(['#1e0a0a', '#5a1c16', '#8e3424', '#c4643a']);                  // 赤铜红甲壳（crimson 暗段 + leather 橙）
  const CUD = [CU[0], CU[1], CU[1], CU[2]];                                          // 远侧暗一级
  const m = B.mats(E, { main: CU, claw: 'bone' });
  m.far = E.defMat(CUD, 1);
  const M = {
    body: E.defMat(CU, 2), claw: E.defMat(CU, 2), clawF: E.defMat(CUD, 2), arm: E.defMat(CU, 1), armF: E.defMat(CUD, 1),
    seg: E.defMat(CU, 1), belly: E.defMat('sand', 1), bone: E.defMat('bone', 1), boneF: E.defMat('bone', 1, 0, 1),
    sheen: E.defMat([33, 33, 33, 5], 1, 1),                                          // 金属光泽（平涂高光点）
    cry: E.defMat([34, 36, 37, 38], 1),                                               // 翠绿晶刺（族记号）
    lit: E.defMat([8, 6, 6, 21], 1, 1),                                               // 亮起的甲脊（发光体）
    eye: E.defMat([34, 37, 38, 21], 1, 1),
  };
  const o = G.shape({ n: 4, rx: 5, ry: 3.2, under: 4, abd: { rx: 8, ry: 3.4, dx: -9, dy: 0 }, head: null, span: 11, knee: -2, kneeOut: 0.5, fan: 0.8,
    farDx: -1.5, stride: 2, lift: 1, lw: 1, claws: null, tail: null, eyes: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(86, 42, 46, 37);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.ink, m.spec, m.claw, M.bone, M.boneF, M.sheen, M.cry, M.lit, M.eye, M.belly]) RIM.skip[k] = 1;
  // 巨螯姿势表：[近螯掌心 x, y, 指向（弧度，0 朝前、+ 朝上）, 远螯掌心 x, y, 指向]
  const CP = [
    [11, -6, 0.12, 10, -17, 0.72],      // 0 待机：两只螯一低一高举在头前（近螯低平、远螯高斜，错开 11 格），钳口微张成两道叉
    [11, -8, 0.25, 10, -18, 0.8],       // 1 爬行：高举，钳口微张
    [13, -5, 0.1, 11, -16, 0.8],        // 2 攻击预兆：上下张开
    [15, -5, 0.02, 15, -14, 0.1],       // 3 攻击：向前合拢（两只螯上下错开 9 格，不并成一团）
    [9, -8, 1.3, 10, -10, 2.2],         // 4 蓄力：压低、交叉护头
    [12, -4, -0.4, 13, -5, -0.25],      // 5 施放：砸地
    [9, -12, 1.5, 8, -13, 1.95],        // 6 受击：往上一缩
    [11, -4, 0.1, 10, -5, 0.3],         // 7 死亡：瘫软
    [11, -3, 0.0, 10, -4, 0.15],        // 8 翻倒后：搭在地上
  ];
  // 姿势字段：cp 巨螯姿势 · no / fo 近 / 远螯张开 0–3 · tp 尾姿 0 高弯 / 1 后拉 / 2 下垂 / 3 垂落在地 · tsw 尾刺扫 -1..1 · rl 亮起的甲脊 0–3 · eg 眼亮 · kick 翻倒后腿蹬 0–2
  const EXTRA = [['cp', 0, 8], ['no', 0, 3], ['fo', 0, 3], ['tp', 0, 3], ['tsw', -1, 1], ['rl', 0, 3], ['eg', 0, 1], ['kick', 0, 2]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.cp = 0; P.no = 0; P.fo = 0; P.tp = 0; P.tsw = 0; P.rl = 0; P.eg = 0; P.kick = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [-1, -10];
  const T_HIT = 2 / 12, T_SHIELD = 2 / 12, T_LAND = INCOMING + 8 / 12, T_TAIL = INCOMING + 11 / 12;

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = G.anim.idle(P, tq, f12, DUR[IDLE]); P.no = 2; P.fo = 2;              // 平时钳口微张（上下指间隔 ≥ 3 格）
    P.tsw = [0, 1, 1, 0, -1, -1][Math.floor(lp / 0.4 + 1e-6) % 6];                // 尾刺慢慢前后扫（2.4 s 一个来回）
    P.eg = P.glow ? 1 : 0;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.no = (k & 1) ? 1 : 3; P.fo = (k & 1) ? 3 : 1; }   // 待机个性：双螯一开一合咔哒作响（始终留着钳口）
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                        // 沉重的爬行：多足交替、巨螯高举
      const f = G.anim.walk(P, tq); P.cp = 1; P.no = f === 1 ? 3 : 2; P.fo = f === 3 ? 3 : 2; P.tsw = [1, 0, -1, 0][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const k = f12of(tq);
      if (k === 0) { P.cp = 0; P.no = 1; P.fo = 1; }
      else if (k === 1) { P.cp = 2; P.no = 3; P.fo = 3; P.bx = -1; P.crouch = 1; P.tp = 1; }
      else if (k <= 5) { P.cp = 3; P.no = 0; P.fo = 0; P.bx = k === 2 ? 3 : 2; P.pitch = k === 2 ? 1 : 0; P.tsw = 1; P.eg = 1; }
      else if (k <= 7) { P.cp = 0; P.bx = 1; P.no = 1; P.fo = 1; }
    } else if (st === CHARGE) {                                                    // 双螯交叉护头、身体压低，甲脊一节节亮起
      const q = clamp01(tq / 0.7); P.cp = q < 0.3 ? 0 : 4; P.crouch = q < 0.3 ? 0 : q < 0.7 ? 1 : 2;
      P.rl = tq < 0.45 ? 0 : tq < 0.75 ? 1 : tq < 1.05 ? 2 : 3; P.rim = 2; P.eg = tq > 0.45 ? (f12 & 1) : 0; P.tp = 1;
      P.tsw = tq > 1.1 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === CAST) {                                                      // 双螯砸地（2 帧定格）→ 护盾亮起那一帧甲壳闪白
      P.cp = 5; P.no = 1; P.fo = 1; P.crouch = 1; P.bx = 1; P.rl = 3; P.rim = 3; P.eg = 1; P.tsw = -1;
      P.flash = tq >= T_SHIELD - 1e-6 && tq < T_SHIELD + 1 / 12 - 1e-6 ? 1 : 0;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.cp = q < 0.45 ? 5 : 0; P.crouch = q < 0.6 ? 1 : 0; P.bx = q < 0.45 ? 1 : 0;
      P.rl = q < 0.3 ? 3 : q < 0.55 ? 2 : q < 0.8 ? 1 : 0; P.rim = q < 0.5 ? 2 : q < 0.85 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); P.claw = 0; P.tail = 0; P.jaw = 0; if (h < 0.2) { P.cp = 6; P.tp = 1; P.no = 2; P.fo = 2; } else if (h < 0.35) { P.cp = 0; P.tsw = -1; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.flash = d < 1 / 12 ? 1 : 0; P.bx = -2; P.crouch = 2; P.cp = 6; P.no = 3; P.fo = 3; P.tp = 1; }
      else if (d < 0.5) { P.lie = 1; P.bx = -3; P.cp = 7; P.no = 2; P.fo = 1; P.tp = 1; }             // 腿软摊开、双螯瘫下
      else {                                                                        // 翻成肚皮朝上（离地 3 → 1 → 0），腿蜷起来蹬几下，尾巴最后垂落
        P.lie = 2; P.bx = -3; P.cp = 8; P.no = 2; P.fo = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.kick = d < 0.66 ? 0 : d < 1.2 ? 1 + (f12 & 1) : 0; P.tp = d < 0.9 ? 1 : d < 1.2 - 1e-6 ? 2 : 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o);
    const bc = backCenter(); P.gx = R(bc[0]) + P.bx; P.gy = R(bc[1]);
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  function backCenter() { return rig.lie === 2 ? [-5, -4 - P.lift] : [rig.A.x + 4, rig.A.y - rig.A.ry - 1]; }
  const topAt = (x) => {                                                           // 背线：头胸 / 腹背两个椭圆的上沿
    let y = 99; for (const C of [rig.T, rig.A]) { const u = (x - C.x) / (C.rx + 0.35); if (Math.abs(u) < 1) y = Math.min(y, C.y - (C.ry + 0.35) * Math.sqrt(1 - u * u)); }
    return y;
  };
  // 蝎尾：从腹末起 7 节往上、往前弯过背；返回关节点和末端方向
  const TAILP = [[1.7, 0.2], [1.95, 0.24], [1.15, 0.2], [2.95, 0.03]];
  function tailPts() {
    const lie = rig.lie === 2, A = rig.A, base = lie ? [-14, -3 - P.lift] : [A.x - A.rx + 1.5, A.y - (P.tp < 2 ? 3 : 1)];   // 尾根抬高 2 格
    let [a, c] = TAILP[P.tp]; if (P.tp === 0) c += P.tsw * 0.035;
    if (lie && P.tp < 3) { a -= 0.25; }
    const pts = [base.slice()]; let x = base[0], y = base[1];
    for (let k = 0; k < 7; k++) { x += Math.cos(a) * 2.6; y -= Math.sin(a) * 2.6; if (y > -1.5) y = -1.5; pts.push([x, y]); a -= c; }
    return { pts, a };
  }

  // ───── 画 ─────
  // 候选部件：legSide（一侧的节肢腿并成一个部件，同侧腿之间不压分界线）
  function legSide(far) {
    E.part(); const mat = far ? m.far : m.limb;
    for (const L of rig.legs) {
      if (!!L.far !== !!far) continue;
      U.seg(E, L.B[0], L.B[1], L.K[0], L.K[1], far ? 1 : 2, mat, 0); U.seg(E, L.K[0], L.K[1], L.F[0], L.F[1], 1, mat, 0);
      U.dot(E, L.K[0], L.K[1] - 1, mat, far ? 2 : 4); U.dot(E, L.F[0], L.F[1], far ? M.boneF : M.bone, 2);
    }
  }
  // 候选部件：giantChela（巨螯）—— 臂两节（肩 → 肘 → 掌根）+ 掌（椭圆 9×8，带金属高光）+ 不动指（下）+ 动指（上，比下指长 1 格，绕铰点张开，单独一个部件）；
  //   掌到指收窄 2 格，指身往钳口弯、尖端各补一格骨白尖（合拢时是一上一下两个尖，不是圆头）；内缘齿只在张开时画；
  //   按像素反算局部坐标栅格化，任意角度都不漏点。(X, Y) 掌心、th 指向、op 张开 0–3、far 远侧暗一级
  const OPEN = [0, 0.4, 0.66, 0.9], HG = 3.2, FL = 10, PRX = 4.6, PRY = 4.1;
  const fcv = (k) => 1.75 - 1.2 * Math.pow(k, 1.3), fhw = (k) => 0.8 * (1 - k) + 0.4;
  function fingerAt(u, v, L, teeth) {                                              // 下指（v > 0 一侧）：0 无 · 1 甲 · 2 齿 · 3 指尖
    if (u < HG || u > L) return 0; const k = (u - HG) / (L - HG), cv = fcv(k), hw = fhw(k);
    if (v < cv - hw || v > cv + hw) return 0;
    if (k > 0.72) return 3;
    return teeth && k < 0.65 && v < cv - hw + 0.8 && (Math.floor(u) & 1) ? 2 : 1;
  }
  function chela(X, Y, th, op, far, S) {
    const c = Math.cos(th), s = Math.sin(th), W = (u, v) => [X + u * c + v * s, Y - u * s + v * c];
    const mat = far ? M.clawF : M.claw, arm = far ? M.armF : M.arm, bn = far ? M.boneF : M.bone;
    E.part();                                                                       // 臂：肩 → 肘 → 掌根
    const wr = W(-PRX + 0.6, 0.4), el = [(S[0] + wr[0]) / 2 - 1, Math.min(S[1], wr[1]) - 1.5];
    U.seg(E, S[0], S[1], el[0], el[1], 2, arm, 0); U.seg(E, el[0], el[1], wr[0], wr[1], 2, arm, 0); U.dot(E, el[0], el[1] - 1, arm, far ? 2 : 4);
    const x0 = R(X) - 14, x1 = R(X) + 14, y0 = R(Y) - 14, y1 = Math.min(0, R(Y) + 12), teeth = op > 0;
    E.part();                                                                       // 掌 + 不动指
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - X, dy = y - Y, u = dx * c - dy * s, v = dx * s + dy * c;
      if ((u * u) / (PRX * PRX) + (v * v) / (PRY * PRY) <= 1) { const hl = ((u + 0.8) * (u + 0.8)) / 4 + ((v + 2) * (v + 2)) / 0.9 <= 1; U.dot(E, x, y, hl && !far ? M.sheen : mat, hl ? 3 : 0); continue; }
      const k = fingerAt(u, v, FL, teeth); if (k) U.dot(E, x, y, k === 1 ? mat : bn, k === 1 ? 0 : k === 2 ? 4 : 3);
    }
    const lt = W(FL, fcv(1)); U.dot(E, lt[0], lt[1], bn, 3);                        // 下指尖
    E.part();                                                                       // 动指：绕铰点 (HG, −1) 张开，长 1 格
    const pa = OPEN[op], pc = Math.cos(pa), ps = Math.sin(pa);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - X, dy = y - Y, u = dx * c - dy * s - HG, v = dx * s + dy * c + 1;
      const uu = HG + u * pc - v * ps, vv = -1 + u * ps + v * pc, k = fingerAt(uu, -vv - 0.6, FL + 1, teeth);
      if (k) U.dot(E, x, y, k === 1 ? mat : bn, k === 1 ? 0 : k === 2 ? 4 : 3);
    }
    const tu = FL + 1 - HG, tv = -fcv(1) - 0.6 + 1, ut = W(HG + tu * pc + tv * ps, -1 - tu * ps + tv * pc); U.dot(E, ut[0], ut[1], bn, 4);   // 上指尖
  }
  function claws(far) {
    const C = CP[P.cp], T = rig.T, lie = rig.lie === 2, ly = lie ? -P.lift : 0;
    if (far) chela(C[3], C[4] + ly, C[5], P.fo, 1, lie ? [2, -3 + ly] : [T.x + 2.5, T.y]);
    else chela(C[0], C[1] + ly, C[2], P.no, 0, lie ? [3, -2 + ly] : [T.x + 3.5, T.y + 1]);
  }
  // 身体：腹背（分节横纹 + 腹面沙色一行）→ 头胸（冠角、绿眼、口器）
  function body() {
    const T = rig.T, A = rig.A;
    E.part();
    U.oval(E, A.x, A.y, A.rx, A.ry, M.body, 0);
    for (let k = 1; k <= 4; k++) { const x = R(A.x + A.rx - k * 3.2); for (let y = R(topAt(x)) + 2; y < R(A.y + A.ry) - 1; y++) U.dot(E, x, y, M.body, 2); }   // 背板分节
    for (let x = R(A.x - A.rx) + 2; x <= R(A.x + A.rx) - 1; x++) U.dot(E, x, R(A.y + A.ry), M.belly, (x & 1) ? 3 : 2);                                    // 腹面
    for (const x of [-14, -8]) U.dot(E, x, R(topAt(x)) + 1, M.sheen, 3);                                                                                   // 甲壳光泽
    E.part();
    U.oval(E, T.x, T.y, T.rx, T.ry, M.body, 0);
    for (let x = R(T.x - T.rx) + 1; x <= R(T.x + T.rx) - 1; x++) U.dot(E, x, R(T.y + T.ry), M.belly, (x & 1) ? 3 : 2);
    U.dot(E, R(T.x) - 1, R(topAt(T.x - 1)) + 1, M.sheen, 3);
    const ex = R(T.x + 2), ey = R(T.y) - 2;                                          // 一对绿眼（冠角下）+ 口器
    U.dot(E, ex, ey, M.eye, P.eg ? 4 : 3); U.dot(E, ex + 2, ey + 1, M.eye, P.eg ? 4 : 2);
    U.dot(E, R(T.x + T.rx), R(T.y) + 1, M.bone, 3); U.dot(E, R(T.x + T.rx) + 1, R(T.y) + 2, M.bone, 2);
  }
  // 候选部件：sawRidges（背上三道锯齿甲脊）—— 每道 5 列，高 3 / 1 / 4 / 1 / 3 形成锯齿；rl 道亮起时齿尖换发光材质
  const RIDGE = [-13, -7, -1], RH = [3, 1, 4, 1, 3];
  function ridges() {
    E.part();
    RIDGE.forEach((cx, k) => {
      const lit = k < P.rl;
      for (let i = 0; i < 5; i++) { const x = cx - 2 + i, y0 = R(topAt(x)); for (let j = 1; j <= RH[i]; j++) U.dot(E, x, y0 - j + 1, lit && j === RH[i] && RH[i] > 1 ? M.lit : M.seg, lit && j === RH[i] && RH[i] > 1 ? 4 : j === RH[i] ? 4 : 0); }
    });
  }
  // 冠角：头胸顶上一对往前上翘的短角（远侧暗一级），角尖骨白
  function horns() {
    E.part(); const T = rig.T, x = R(T.x + 1), y = R(topAt(T.x + 1));
    U.dot(E, x - 1, y - 1, m.far, 0); U.dot(E, x - 1, y - 2, m.far, 0); U.dot(E, x, y - 3, M.boneF, 3);
    U.dot(E, x + 1, y, M.seg, 0); U.dot(E, x + 1, y - 1, M.seg, 0); U.dot(E, x + 2, y - 2, M.seg, 4); U.dot(E, x + 3, y - 3, M.bone, 4);
  }
  // 候选部件：segTail（分节蝎尾 + 晶刺毒囊）—— 节节变细（半径 2.2 → 1.3），每节接缝一格暗线、背上一格亮；末端毒囊（赤铜）外围一圈 5 根翠绿晶刺（单独一个部件），骨白钩刺往前下勾
  function tail() {
    const { pts, a } = tailPts(); E.part();
    for (let k = 1; k < pts.length; k++) { const r = 2.1 - 0.8 * k / 7; U.taper(E, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], r, r * 0.92, M.seg, 0); }
    for (let k = 1; k < pts.length - 1; k++) { U.dot(E, pts[k][0], pts[k][1], M.seg, 1); }
    const e = pts[pts.length - 1], ca = Math.cos(a), sa = Math.sin(a), sx = e[0] + ca * 1.6, sy = e[1] - sa * 1.6;
    U.disc(E, sx, sy, 2.2, M.seg, 0); U.dot(E, sx - 1, sy - 1, M.sheen, 3);
    U.dot(E, sx + ca * 2.6, sy - sa * 2.6 + 1, M.bone, 4); U.dot(E, sx + ca * 3.2, sy - sa * 3.2 + 2, M.bone, 3); U.dot(E, sx + ca * 3.2, sy - sa * 3.2 + 3, M.bone, 2);
    E.part();
    for (const da of [1.2, 2.0, 2.8, 3.6, 4.4]) { const b = a + da; U.dot(E, sx + Math.cos(b) * 3, sy - Math.sin(b) * 3, M.cry, 3); U.dot(E, sx + Math.cos(b) * 4.1, sy - Math.sin(b) * 4.1, M.cry, 4); }
  }
  // 翻倒姿：壳背着地、腹面沙色朝天（横纹分节），8 条腿从腹面往上蜷（kick 1 / 2 两组交替蹬）
  function lyingLegs(far) {
    E.part(); const mat = far ? m.far : m.limb, y0 = -6 - P.lift - far;
    for (let i = 0; i < 4; i++) {
      const x = 3 - i * 3 + (far ? -1 : 0), up = P.kick && ((i + far + P.kick) & 1) ? 1 : 0;
      U.seg(E, x, y0 + 1, x + 1, y0 - 2 - up, far ? 1 : 2, mat, 0); U.seg(E, x + 1, y0 - 2 - up, x - 1, y0 - 4 - up, 1, mat, 0); U.dot(E, x - 1, y0 - 4 - up, far ? M.boneF : M.bone, 2);
    }
  }
  function lyingBody() {
    const y = -P.lift; E.part();
    U.oval(E, -9, y - 3, 8, 3, M.body, 0); U.oval(E, 0, y - 3, 5, 2.8, M.body, 0);
    for (let x = -16; x <= 4; x++) { const t = topAt2(x); if (t < 1) continue; for (let j = 0; j < 2; j++) U.dot(E, x, R(y - 3 - t) + j, M.belly, j ? 2 : (x % 3 === 0 ? 2 : 4)); }   // 腹面朝天：上沿两行沙色腹板，每 3 格一道缝
  }
  const topAt2 = (x) => { let h = 0; for (const [cx, rx, ry] of [[-9, 8, 3], [0, 5, 2.8]]) { const u = (x - cx) / (rx + 0.35); if (Math.abs(u) < 1) h = Math.max(h, (ry + 0.35) * Math.sqrt(1 - u * u)); } return h; };
  function drawHero() {
    begin(hero, P.bx, 0);
    if (rig.lie === 2) { claws(1); tail(); lyingLegs(1); lyingBody(); lyingLegs(0); claws(0); return; }
    claws(1); legSide(1); legSide(0); tail(); body(); ridges(); horns(); claws(0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DOME_X = HX - 3, DOME_RX = 25, DOME_RY = 24;
  const SPK = [[-24, 6, 0], [-9, 7, 0], [7, 6, 0], [22, 7, 0], [-17, 4, 1], [0, 3, 1], [15, 4, 1]];   // 沙岩尖刺：[相对站位 x, 高, 0 身后 / 1 身前]
  let chargeAcc = 0, lastGf = -9, lastRl = 0, soulAcc = 0, spkT = 9, spkX = HX, domeT = 9, pinT = 9, pinX = 0, pinY = 0;
  const backScr = () => [scrX(P.gx), HY + P.gy];
  function tipScr() { const C = CP[P.cp], a = C[2]; return [scrX(R(C[0] + Math.cos(a) * 10) + P.bx), HY + R(C[1] - Math.sin(a) * 10)]; }
  function onEnter(s) {
    if (s === CAST) {                                                               // 双螯砸地：汇聚的沙粒外爆，左右两道地裂，一圈沙岩尖刺立起，沙块抛起
      poseAt(CAST, 0, E.simT); const x0 = scrX(13 + P.bx);
      releaseOrbit(30, 90, 0.3, 0.6, { pts: 1 }); burst(x0, FLOOR - 2, 16, 30, 90, 0.2, 0.5, R_EL, 16);
      fx.crack(x0, FLOOR, 22, 1, R_EL, 0.9); fx.crack(x0 - 6, FLOOR, 34, -1, R_EL, 0.9);
      spkT = 0; spkX = HX;
      for (const [dx] of SPK) fall(HX + dx + (Math.random() - 0.5) * 2, FLOOR - 4, (Math.random() - 0.5) * 30, -70 - Math.random() * 40, FLOOR - 1, R_EL, Math.random() < 0.5 ? 2 : 1);
      ring(x0, FLOOR - 2, 1, R_EL); shake(0.28, 2); flash(0.05);
      sfx('impact', { pal: 'earth', w: 0.7 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                              // 「喀嚓」：双螯合拢，钳口一上一下两道咬合弧
      const [tx, ty] = tipScr(); pinT = 0; pinX = tx; pinY = ty;
      burst(tx, ty, 10, 40, 100, 0.12, 0.3, FXI.impact, 6); burst(tx, ty + 2, 6, 20, 50, 0.2, 0.4, R_EL, 8); hitDummy(1, 1);
      sfx('swing', { kind: 'claw', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === CAST && t === T_SHIELD) {                                             // 首领的防御：沙色点阵护盾罩住全身，甲壳闪白
      domeT = 0; const [bx, by] = backScr(); burst(bx, by, 14, 30, 70, 0.25, 0.5, R_EL, 10); fx.cross(bx, by - 2, 6, R_EL, 0.3);
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.5 });
    }
    if (s === HURT && t === INCOMING) { burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 70, 150, 0.15, 0.3, FXI.impact, 20); for (let i = 0; i < 2; i++) spawn(K_RISE, HX + HIT_POINT[0], HY + HIT_POINT[1], (Math.random() - 0.5) * 40, -40, 0.6, FXI.impact); }   // 硬壳：更多白金火星
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.7 });
    }
    if (s === DEATH && t === T_TAIL) {                                              // 尾巴最后垂落
      for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 26 + Math.random() * 10, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_SHIELD], [], [INCOMING], [T_LAND, T_TAIL], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.2) {                                           // 沙粒从地面螺旋汇聚到背甲
      const [bx, by] = backScr(); chargeAcc += dt * (16 + 16 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const x = HX - 26 + Math.random() * 44, r = Math.hypot(x - bx, FLOOR - 1 - by); spawnX(K_SPIRAL_PT, bx, by, r / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(FLOOR - 1 - by, x - bx), r, w: 3 + Math.random() * 2, tx: bx, ty: by, orbitR: 3, orbitW: 7, squash: 0.6 }); }
    }
    if (state === CHARGE && P.rl !== lastRl && P.rl > 0) { const x = scrX(RIDGE[P.rl - 1] + P.bx), y = HY + R(topAt(RIDGE[P.rl - 1])) - 3; burst(x, y, 6, 20, 50, 0.15, 0.3, R_EL, 8); put(x, y, 21); }
    lastRl = P.rl;
    if (state === MOVE && P.gf !== lastGf) {                                        // 每 2 帧扬起一颗沙尘，接触帧重重落脚
      spawn(K_DUST, scrX((P.gf & 1) ? -10 : 11) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(4) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 4, 0.3, FXI.dust); sfx('step', { w: 0.7 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 28, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); }
    }
    spkT += dt; domeT += dt; pinT += dt;
  }
  function fxReset() { chargeAcc = 0; lastGf = -9; lastRl = 0; soulAcc = 0; spkT = 9; domeT = 9; pinT = 9; }
  // 沙岩尖刺：3 格宽的石锥，0.25 s 内分 3 帧立起，保持到 0.6 s，再抖动沉回地里
  function spikes(layer) {
    if (spkT > 1.0) return; const h0 = spkT < 1 / 12 ? 0.4 : spkT < 2 / 12 ? 0.75 : 1, fade = spkT > 0.6 ? (spkT - 0.6) / 0.4 : 0;
    for (const [dx, hh, ly] of SPK) {
      if (ly !== layer) continue; const h = Math.max(1, R(hh * h0)), x = spkX + dx;
      for (let j = 0; j < h; j++) { const w = j >= h - 1 ? 0 : j >= h - 3 ? 1 : 1; for (let i = -w; i <= w; i++) { const X = x + i + (j >= h - 2 && hh > 5 ? 0 : 0), Y = FLOOR - 1 - j; if (bayer(X, Y) < fade) continue; put(X, Y, j === h - 1 ? (spkT < 2 / 12 ? 21 : EL[0]) : i < 0 ? EL[1] : i > 0 ? EL[3] : EL[2]); } }
      if (bayer(x, FLOOR) >= fade) { put(x - 2, FLOOR - 1, EL[3]); put(x + 2, FLOOR - 1, EL[4]); }
    }
  }
  // 点阵护盾：半椭圆，外圈每 2 格一点、内圈每 3 格一点；0.15 s 从两端往上亮起，刚亮的点闪白；0.55 s 起分 8 段逐段熄灭
  function dome(f12) {
    if (domeT > 1.2) return; const cx = DOME_X + (P.mx || 0), cy = FLOOR - 1;
    for (const [rx, ry, every, col] of [[DOME_RX, DOME_RY, 2, EL[0]], [DOME_RX - 3, DOME_RY - 3, 3, EL[1]]]) {
      const n = Math.ceil(rx * 3.2);
      for (let k = 0; k <= n; k++) {
        if (k % every) continue; const q = k / n, e = Math.min(q, 1 - q) * 2, lit = domeT / 0.15;
        if (e > lit) continue; const seg = Math.floor(q * 8), off = 0.55 + [3, 4, 2, 5, 1, 6, 0, 7][seg] * 0.07;
        if (domeT > off) continue; if (domeT > off - 0.1 && (f12 & 1)) continue;
        const a = Math.PI + q * Math.PI, x = R(cx + Math.cos(a) * rx), y = R(cy + Math.sin(a) * ry);
        put(x, y, lit < 1 && e > lit - 0.25 ? 21 : col);
      }
    }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); spikes(0); }
  function fxFront(f12) {
    spikes(1); dome(f12);
    if (pinT < 2 / 12) {                                                            // 钳口咬合弧：上下两道小弧往中间合
      const c = pinT < 1 / 12 ? 21 : EL[1], r = pinT < 1 / 12 ? 5 : 4;
      for (let k = 0; k <= 4; k++) { if (pinT >= 1 / 12 && (k & 1)) continue; const a = k / 4 * 1.3; put(pinX + R(Math.sin(a) * r), pinY - 1 - R(Math.cos(a) * r), c); put(pinX + R(Math.sin(a) * r), pinY + 1 + R(Math.cos(a) * r), c); }
    }
  }

  return {
    name: '翠蠕虫王', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lit, M.eye], HIT_POINT, EVENTS,
    REVIVE: { dy: -10, ramp: 'dust', big: 1 },
    SFX: { body: 'armor', how: 'topple', pal: 'earth', style: 'shield', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
