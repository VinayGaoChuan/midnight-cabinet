// 暗邪眼（敌人 · 混沌 · 史诗 · 近战 range 304）：「飞行单位。龙之血脉使其拥有魔法抗性。」
//   一颗黑鳞包着的眼球（直径 14 格，离地 10 格悬浮）：额顶一对后掠龙角、两侧一对黑鳞龙膜翼（展开翼展 34 格，远翼画成朝前张开）、
//   身后一条带铲尖的龙尾向后下方卷出；眼睑是一圈黑鳞片，瞳孔是龙的竖瞳。没有王冠、没有触须、不放光束（和邪眼王尼克松拉开）。
// 攻击：收翼俯冲，用额顶的龙角撞目标。技能「龙裔俯噬」：盘旋上升 4 格、竖瞳收成一条线、奥术粒子螺旋汇入瞳孔、鳞片一片片亮紫；
//   施放时收翼俯冲 12 格，身后留 3 个紫色残影；龙角撞中目标，目标身上印出一只竖瞳（2 帧）+ 奥术大外爆 + 冲击环。
// 死亡：翅膀垂下、眼睑合上，打着转坠到地上，龙尾最后落下。
// 身体：B.blob 的 orb 身体 + B.wing 膜翼（远翼用镜像画笔朝前画）；龙角、竖瞳鳞睑眼、铲尖龙尾、鳞纹是本模块的候选部件。
PCD.define('EvilEyeDark', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL,
    spawn, burst, releaseOrbit, ring, shake, flash, sfx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow, copySprite, blitShape } = E;
  const B = E.parts.beast, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质（全部取自共享色板） ─────
  const R_EL = FXI.magic, EL = FXR[R_EL];                                     // 龙血奥术 · 星辉紫：白 21 → 青 22 → 蓝 23 → 紫 24 → 深紫 25
  const m = B.mats(E, {
    main: [0, 52, 53, 54],                                                     // 黑鳞：墨 → 暗影紫 → 紫灰（鳞脊亮）
    wing: [0, 25, 42, 24], bone: [0, 52, 53, 54],                              // 翼膜（紫的暗段）· 翼骨（黑鳞）
    claw: 'bone', horn: 'bone', sclera: 'pale', lid: [0, 0, 52, 54], spec: [54, 54, 54, 54],
  });
  m.hornF = E.defMat([8, 7, 7, 6], 1);                                          // 远侧龙角暗一级
  m.iris = E.defMat([25, 24, 23, 22], 1, 1);                                    // 虹膜（发光体，手工色调）：深紫 / 紫 / 蓝 / 青
  m.glow = E.defMat([22, 22, 21, 21], 1, 1);                                    // 施放白芯
  m.sgl = E.defMat([24, 24, 43, 43], 1, 1);                                     // 鳞缘亮紫（蓄力）
  const WSPEC = { span: 15, chord: 4, type: 'membrane', fingers: 3 };
  const OB = B.blob.shape({ r: 7, alt: 10, shape: 'orb', eye: null, tent: null, m });

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(70, 56, 35, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['iris', 'glow', 'sgl', 'ink', 'sclera', 'horn', 'hornF']) RIM.skip[m[k]] = 1;
  const RB = 7, ALT = 10;

  // ───── 姿势字段（取整后的范围）─────
  //   alt 离地高 · sq 落地压扁 · rot 身体转角（π/8 一档，+ 前倾）· wn / wf 近 / 远翼翼姿（B.WINGS）· wm 远翼朝前张开 · ix iy 看的方向
  //   pup 竖瞳 0 一条线 / 1 收 / 2 放 · lid 眼睑合拢 0–4 · gem 虹膜档（待机 / 蓄力 1 / 蓄力 2 / 施放 / 熄灭）· tl 龙尾摆 / 抬 · sg 鳞缘亮紫 · lie 0 飞 / 1 坠落 / 2 落地
  const SPEC = [['alt', -2, 24], ['sq', 0, 2], ['rot', -4, 15], ['wn', 0, 6], ['wf', 0, 6], ['wm', 0, 1], ['ix', -2, 2], ['iy', -2, 2], ['pup', 0, 2], ['lid', 0, 4],
    ['gem', 0, 4], ['tl', -2, 3], ['sg', 0, 2], ['lie', 0, 2]].concat(B.COMMON);
  const P = {};
  function reset() {
    P.alt = ALT; P.sq = 0; P.rot = 0; P.wn = 2; P.wf = 2; P.wm = 1; P.ix = 1; P.iy = 0; P.pup = 1; P.lid = 0; P.gem = 0; P.tl = 0; P.sg = 0; P.lie = 0;
    P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.drop = 0; P.dsx = 0; P.dsy = 0; P.flip = 0; P.mx = 0;
  }
  reset();
  const T_HIT = 2 / 12, DASH = 12;                                               // 攻击：第 2 帧俯冲撞上
  const S_T = [0, 1 / 12, 2 / 12], S_HIT = 3 / 12;                               // 技能：三个残影的时刻、撞上的时刻（俯冲 12 格分 3 步）
  const IDLE_W = [2, 1, 2, 3], IDLE_T = [0, 1, 0, -1];                           // 待机：慢慢扇一次翅 · 尾摆
  const MOVE_W = [2, 2, 1, 3], MOVE_A = [10, 11, 12, 11], MOVE_T = [-1, 0, 1, 0];  // 展翼滑翔：两拍平展、一拍上扬、一拍下压

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6), k = b & 3;
    P.alt = ALT + (b & 1); P.wn = P.wf = IDLE_W[k]; P.tl = IDLE_T[(b + 1) & 3];
    P.pup = (Math.floor(TT * 1.25 + 1e-6) & 1) ? 2 : 1;                           // 竖瞳一收一放
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const i = f12of(lp - 1.6); P.lid = [2, 4, 4, 2, 1][i] || 0; }   // 待机个性：鳞片眼睑合拢眨一下
    else if (lp >= 2.0 - 1e-6 && lp < 2.25 - 1e-6) { P.pup = 0; P.gem = 1; P.ix = 2; }   // 眨完竖瞳一收，虹膜一亮
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = gait(tq); P.alt = MOVE_A[f]; P.wn = P.wf = MOVE_W[f]; P.tl = MOVE_T[f]; P.rot = f < 2 ? 1 : 0; P.ix = 2; P.pup = 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { P.rot = -1; P.alt = 11; P.bx = -1; P.wn = P.wf = 1; P.gem = 1; P.tl = 1; }
      else if (tq < T_HIT) { P.rot = -2; P.alt = 12; P.bx = -2; P.wn = P.wf = 5; P.pup = 0; P.gem = 1; P.tl = 2; P.rim = 1; }                 // 预兆：后仰、张翼、竖瞳收紧
      else if (tq < 3 / 12) { P.wm = 0; P.wn = P.wf = 0; P.rot = 3; P.alt = 7; P.mx = DASH; P.pup = 0; P.gem = 2; P.rim = 1; P.tl = -2; }   // 收翼俯冲，龙角撞上
      else if (tq < 0.45) { P.wm = 0; P.wn = P.wf = 4; P.rot = 2; P.alt = 8; P.mx = DASH - 2; P.pup = 0; P.gem = 1; P.tl = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.mx = R((DASH - 2) * (1 - q)); P.rot = R(2 * (1 - q)); P.alt = R(8 + 2 * q); P.wm = q > 0.3 ? 1 : 0; P.wn = P.wf = q < 0.5 ? 1 : 2; }
    } else if (st === CHARGE) {                                                     // 盘旋上升 4 格、慢而有力地扇翅、竖瞳收成一条线、鳞缘一片片亮紫
      const q = ease.inOut(clamp01(tq / 0.7));
      P.alt = ALT + R(4 * q); P.bx = R(Math.sin(tq / 0.7 * 2 * PI) * 1.5); P.ix = 2;
      P.wn = P.wf = tq < 1.0 ? [1, 2, 3, 4][Math.floor(tq * 4 + 1e-6) & 3] : 5;
      P.pup = tq < 0.35 ? 1 : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.sg = tq < 0.5 ? 0 : tq < 0.95 ? 1 : 2; P.rim = 2;
      P.tl = tq > 1.0 ? ((f12 & 1) ? 2 : 1) : IDLE_T[Math.floor(tq * 5) & 3];
      if (tq > 1.1) { P.rot = -1; P.alt += (f12 & 1) ? 1 : 0; }                    // 最后 0.3 秒：后仰蓄势、抖
    } else if (st === CAST) {                                                       // 收翼俯冲 12 格：残影 3 个 → 撞上 → 顿住
      P.wm = 0; P.pup = 0; P.gem = 3; P.rim = 3; P.sg = 2; P.ix = 2;
      if (tq < S_HIT) { const i = f12of(tq); P.wn = P.wf = 0; P.rot = 2 + (i > 0 ? 1 : 0); P.alt = 14 - i * 2; P.mx = i * 4; P.tl = -2; }
      else if (tq < 5 / 12) { P.wn = P.wf = 0; P.rot = 3; P.alt = 7; P.mx = DASH; P.tl = -2; }
      else { P.wn = P.wf = 4; P.rot = 2; P.alt = 8; P.mx = DASH - 1; P.gem = 2; P.sg = 1; P.tl = -1; }
    } else if (st === RECOVER) {                                                    // 扑翼飞回原位，鳞光熄下去
      const q = ease.inOut(clamp01(tq / 0.55));
      P.mx = R((DASH - 1) * (1 - q)); P.rot = R(2 * (1 - q)); P.alt = R(8 + 2 * q) + ((f12 & 1) && q < 0.9 ? 1 : 0);
      P.wm = q > 0.25 ? 1 : 0; P.wn = P.wf = q < 0.9 ? [1, 3][f12 & 1] : 2; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.sg = q < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.lid = 3; P.pup = 0; P.ix = -1; P.wn = P.wf = 1; P.tl = 3; P.rot = -1; P.rim = 0; P.alt = ALT + 1; }
      else if (h < 0.35) { P.bx = -1; P.lid = 2; P.pup = 0; P.wn = P.wf = 2; P.tl = 2; P.rim = 0; }
      else { P.lid = 1; P.tl = 1; }
    } else if (st === DEATH) {                                                      // 翅膀垂下、眼睑合上、打着转坠地、龙尾最后落下
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.lid = 3; P.pup = 0; P.wn = P.wf = d < 0.15 ? 1 : 6; P.tl = 3; P.rot = -1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.66) {
        const q = (d - 0.3) / 0.36, k = f12of(d - 0.3);
        P.bx = -3; P.lie = 1; P.alt = Math.max(0, R(ALT * (1 - q * q))); P.rot = (k * 3) % 16; P.wn = P.wf = 6; P.lid = k < 2 ? 3 : 4; P.pup = 0; P.tl = 3; P.gem = (f12 & 1) ? 1 : 4;
      } else {
        P.bx = -3; P.lie = 2; P.alt = 0; P.rot = 2; P.wn = P.wf = 6; P.lid = 4; P.sq = d < 0.75 ? 1 : 0;
        P.tl = d < 0.95 ? 3 : d < 1.03 ? 0 : -2; P.gem = d < 1.2 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    frame();
    const pp = pupil(); P.gx = R(pp[0]) + P.bx; P.gy = R(pp[1]);
    B.key(P, SPEC);
  }

  // ───── 几何：身体中心、转角；身体坐标 (u 朝前, v 朝下) → 本地 ─────
  const C = { x: 0, y: -17, rx: RB, ry: RB }; let cT = 1, sT = 0;
  function frame() { C.rx = RB + P.sq; C.ry = RB - P.sq; C.x = 0; C.y = -(P.alt + C.ry); const th = P.rot * PI / 8; cT = Math.cos(th); sT = Math.sin(th); }
  const bw = (u, v) => [C.x + u * cT - v * sT, C.y + u * sT + v * cT];
  const toB = (x, y) => { const dx = x - C.x, dy = y - C.y; return [dx * cT + dy * sT, -dx * sT + dy * cT]; };
  const EYE_U = 2, EYE_V = -0.5, EA = 4.8, EB = 3.8, IR = 2.7;                           // 眼缝中心、半宽、半高（身体坐标）
  const pupil = () => bw(EYE_U + P.ix * 0.7, EYE_V + P.iy * 0.7);
  // 镜像画笔：远翼朝前张开（B.wing 只朝后画，用它把 x 镜像过来；部件输出不变）
  let MX = 0; const EM = { part: E.part, sp: (x, y, mm, tn) => E.sp(2 * MX - x, y, mm, tn) };

  // ───── 画 ─────
  function wings(far) {
    const nr = bw(-3.5, -3.5);
    if (!far) { B.wing(E, nr[0], nr[1], P.wn, WSPEC, m, 0); return; }
    if (P.wm) { const fr = bw(0.5, -5.5); MX = R(fr[0]); B.wing(EM, MX, fr[1], P.wf, WSPEC, m, 1); }
    else B.wing(E, nr[0] + 2, nr[1] - 1, P.wf, WSPEC, m, 1);                    // 收翼时远翼也贴在背后（错开 2, -1）
  }
  // 候选部件：spadeTail —— 带铲尖的龙尾（一个部件）：从身体后下方往后下方长出，逐格变细、末端往回卷；tl 摆动 / 抬起（3 = 翘起、-2 = 平躺在地上）；
  //   尖端一枚箭头形铲尖（翼膜色）。碰到地面就贴地走
  function spadeTail() {
    E.part();
    const n = 10, root = bw(-5.2, 3.6); let x = root[0], y = root[1];
    let a = (P.tl >= 3 ? 3.6 : P.tl <= -2 ? 2.95 : 2.3 - P.tl * 0.14) + P.rot * PI / 8 * (P.lie ? 0 : 1);   // 屏幕角（0 朝右、+ 朝下）
    for (let k = 0; k <= n; k++) {
      const q = k / n; U.disc(E, x, y, 1.25 - 0.75 * q, m.limb, k % 3 === 1 && k < n - 1 ? 2 : 0);
      if (k % 3 === 2 && k < n - 2) U.dot(E, x, y - 1, m.limb, 4);                // 尾背鳞突
      a += (P.tl <= -2 ? 0.02 : 0.16 * q) + (P.tl >= 3 ? -0.05 : 0);
      x += Math.cos(a); y += Math.sin(a); if (y > -0.5) { y = -0.5; a = PI; }
    }
    const dx = Math.cos(a), dy = Math.sin(a), tx = x + dx * 3.4, ty = Math.min(-0.5, y + dy * 3.4), nx = -dy, ny = dx;
    U.poly(E, [tx, ty, x + nx * 2.4 - dx * 0.6, y + ny * 2.4 - dy * 0.6, x + dx * 0.8, y + dy * 0.8, x - nx * 2.4 - dx * 0.6, y - ny * 2.4 - dy * 0.6], m.wing, 0);
    U.dot(E, tx, ty, m.wing, 4);
  }
  // 候选部件：dragonHorn —— 额顶后掠龙角（远 / 近各一个部件）：根部 2 格粗埋进身体上沿，向后上方弯出 6 格收成 1 格尖；跟着身体转角转
  const HORN = [[3.2, -5.8], [3.0, -8.0], [2.4, -10.0], [1.3, -11.6], [0.0, -12.6], [-1.5, -13.2]];
  function dragonHorn(far) {
    E.part(); const du = far ? -2.6 : 0, dv = far ? 0.6 : 0, mat = far ? m.hornF : m.horn;
    for (let k = 0; k + 1 < HORN.length; k++) {
      const a = bw(HORN[k][0] + du, HORN[k][1] + dv), b = bw(HORN[k + 1][0] + du, HORN[k + 1][1] + dv);
      U.seg(E, a[0], a[1], b[0], b[1], k < 3 ? 2 : 1, mat, k === 1 && !far ? 4 : 0);
    }
    const tp = bw(HORN[5][0] + du, HORN[5][1] + dv); U.dot(E, tp[0], tp[1], mat, far ? 3 : 4);
    if (!far) { const r1 = bw(2.1, -8.6), r2 = bw(1.4, -10.6); U.dot(E, r1[0], r1[1], mat, 2); U.dot(E, r2[0], r2[1], mat, 2); }   // 角上两道环纹
  }
  // 身体：B.blob orb + 紧跟着画的鳞纹（同一个部件）；sg ≥ 1 时一部分鳞缘换成亮紫（发光体）
  function body() {
    B.blob.body(E, { C, lie: 0 }, P, OB);
    const x0 = Math.floor(C.x - C.rx), x1 = Math.ceil(C.x + C.rx), y0 = Math.floor(C.y - C.ry), y1 = Math.min(0, Math.ceil(C.y + C.ry));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ex = (x - C.x) / (C.rx + 0.35), ey = (y - C.y) / (C.ry + 0.35); if (ex * ex + ey * ey > 0.8) continue;
      const [u, v] = toB(x, y), ru = R(u), rv = R(v);
      if (((rv + 40) % 3) !== 0 || ((ru + (((rv + 40) / 3 | 0) & 1) * 2 + 40) & 3) !== 0) continue;   // 鱼鳞错位排布：每 3 行一排、每 4 列一片
      if ((u - EYE_U) * (u - EYE_U) / 36 + (v - EYE_V) * (v - EYE_V) / 25 < 1) continue;           // 眼睑那一圈留给眼睑部件
      const lit = P.sg && U.hash(ru + 7, rv + 3) < P.sg * 0.4;
      if (lit) E.sp(x, y, m.sgl, 3); else { E.sp(x, y, m.body, 2); if (ey < -0.2) E.sp(x + 1, y - 1, m.body, 4); }
    }
  }
  // 候选部件：slitEye —— 龙的竖瞳眼（一个部件）：杏仁形眼缝里浅色眼白、紫色虹膜（5 档亮）、竖瞳（pup 0 一条线 / 1 收 / 2 放）、湿高光
  function slitEye() {
    E.part();
    const ce = bw(EYE_U, EYE_V), X0 = Math.floor(ce[0] - 6), X1 = Math.ceil(ce[0] + 6), Y0 = Math.floor(ce[1] - 6), Y1 = Math.ceil(ce[1] + 6);
    const g = P.gem, pu = P.pup;
    for (let y = Y0; y <= Math.min(0, Y1); y++) for (let x = X0; x <= X1; x++) {
      const [u, v] = toB(x, y), du = u - EYE_U, dv = v - EYE_V, w = 1 - (du / EA) * (du / EA);
      if (w <= 0 || Math.abs(dv) > EB * Math.pow(w, 0.75) + 0.35) continue;
      const iu = du - P.ix * 0.7, iv = dv - P.iy * 0.7, d = Math.hypot(iu, iv);
      if (d > IR) { E.sp(x, y, m.sclera, 0); continue; }
      const half = pu === 0 ? 0.5 : pu === 1 ? (Math.abs(iv) < 1.2 ? 1.3 : 0.5) : (Math.abs(iv) < 2.2 ? 1.4 : 0.5);
      if (Math.abs(iu) <= half && Math.abs(iv) <= IR - 0.2) { E.sp(x, y, m.ink, 1); continue; }
      let mat = m.iris, tn;
      if (g === 4) tn = 1;
      else if (d > IR - 0.8) tn = g >= 2 ? 2 : 1;
      else if (d > 1.2) tn = g === 0 ? 2 : g === 1 ? 3 : 4;
      else { tn = g <= 1 ? 3 : 4; if (g === 3) { mat = m.glow; tn = 3; } }
      E.sp(x, y, mat, tn);
    }
    if (g < 4) { const h = bw(EYE_U + P.ix * 0.7 - 1.4, EYE_V + P.iy * 0.7 - 1.4); E.sp(h[0], h[1], m.glow, 3); }   // 湿高光
  }
  // 候选部件：scaleLid —— 黑鳞眼睑（一个部件）：眼缝外一圈 1–2 格的黑鳞，上睑一排鳞突（亮色）；lid 0–4 上睑往下合，4 = 合上，中间一道缝
  function scaleLid() {
    E.part();
    const ce = bw(EYE_U, EYE_V), X0 = Math.floor(ce[0] - 7), X1 = Math.ceil(ce[0] + 7), Y0 = Math.floor(ce[1] - 7), Y1 = Math.ceil(ce[1] + 7);
    const lt = -EB - 0.4 + P.lid * (2 * EB + 0.8) / 4;
    for (let y = Y0; y <= Math.min(0, Y1); y++) for (let x = X0; x <= X1; x++) {
      const ex = (x - C.x) / (C.rx + 0.35), ey = (y - C.y) / (C.ry + 0.35); if (ex * ex + ey * ey > 1) continue;
      const [u, v] = toB(x, y), du = u - EYE_U, dv = v - EYE_V, w = 1 - (du / EA) * (du / EA), open = w > 0 && Math.abs(dv) <= EB * Math.pow(w, 0.75) + 0.35;
      const w2 = 1 - (du / (EA + 1.4)) * (du / (EA + 1.4)), ring = !open && w2 > 0 && Math.abs(dv) <= (EB + 1.3) * Math.pow(w2, 0.75) + 0.35;
      if (ring) { const top = dv < 0; E.sp(x, y, m.lid, top && ((R(du) + 40) & 1) === 0 && dv < -EB * Math.pow(Math.max(0, w2), 0.75) ? 4 : 0); }
      else if (open && (P.lid >= 4 || dv < lt)) E.sp(x, y, m.lid, P.lid >= 4 && Math.abs(dv - 0.6) < 0.5 ? 1 : (dv > lt - 1 && P.lid < 4 ? 4 : 0));
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    wings(1); spadeTail(); dragonHorn(1); body(); slitEye(); scaleLid(); wings(0); dragonHorn(0);
  }
  function bakeHero() { const pp = pupil(); RIM.rim = P.rim; RIM.rx = R(pp[0]) + P.bx + hero.ox; RIM.ry = R(pp[1]) + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghosts = [0, 1, 2].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy)), ghX = [0, 0, 0], ghT = [9, 9, 9];
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, stampT = 9, speedT = 9, speedX = 0, speedY = 0;
  const pupScr = () => [scrX(P.gx), HY + P.gy];
  function snap(i) { drawHero(); bakeHero(); copySprite(ghosts[i], hero); ghX[i] = HX + P.mx; ghT[i] = 0; hero.k1 = hero.k2 = -1; }
  function hornHit(big) {                                                        // 龙角撞中：目标中心略上
    const x = DUMMY_X - 4, y = HY - 17;
    if (big) {
      stampT = 0; burst(x, y, 36, 60, 150, 0.3, 0.75, R_EL, 16); ring(x + 2, y, 1, R_EL); burst(x, y, 10, 40, 100, 0.2, 0.4, FXI.impact, 10);
      hitDummy(1, 1); dummyFx({ dur: 0.6, outline: 'magic' }); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.6 });
    } else {
      burst(x, y, 10, 40, 100, 0.15, 0.35, FXI.impact, 10); burst(x, y, 8, 30, 80, 0.2, 0.4, R_EL, 8); hitDummy(0, 1);
      speedT = 0; speedX = scrX(P.bx); speedY = HY + R(C.y);
      sfx('swing', { kind: 'thrust', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.5 });
    }
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); snap(0);
      const [gx, gy] = pupScr(); releaseOrbit(40, 100, 0.3, 0.6); burst(gx, gy, 20, 50, 120, 0.25, 0.55, R_EL, 8); ring(gx, gy, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) hornHit(0);
    if (s === CAST) { if (t === S_T[1]) snap(1); else if (t === S_T[2]) snap(2); else if (t === S_HIT) hornHit(1); }
    if (s === DEATH && t === INCOMING + 0.66) {                                   // 坠地
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === INCOMING + 1.03) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 18 + Math.random() * 8, HY - 1, (Math.random() - 0.5) * 16, -3 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust); sfx('hit', { mat: 'flesh', w: 0.15 }); }   // 龙尾最后落下
  }
  const EVENTS = [[], [], [T_HIT], [], [S_T[1], S_T[2], S_HIT], [], [], [INCOMING + 0.66, INCOMING + 1.03], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = pupScr();
    if (state === CHARGE) {                                                      // 奥术粒子螺旋汇入瞳孔
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 10; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, a, r, 3.5 + Math.random() * 3); }
    }
    if (state === MOVE && P.alt !== lastGf) {                                     // 滑翔：身下拖 1–2 颗奥术尾迹
      for (let i = 0; i < 2; i++) spawn(K_TRAIL, scrX(P.bx - 4 + Math.random() * 6), HY - P.alt + 1 + Math.random() * 2, (P.flip ? 1 : -1) * (8 + Math.random() * 10), 3 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL);
      lastGf = P.alt;
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.4 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + R(Math.random() * 2 - 1), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 28, HY - 1 - Math.random() * 10, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < 3; i++) ghT[i] += dt; stampT += dt; speedT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; stampT = 9; speedT = 9; ghT.fill(9); }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.lie !== 2) groundShadow(scrX(P.bx), 8, P.alt);
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function fxMid(f12) {
    for (let i = 0; i < 3; i++) if (ghT[i] < 0.4) blitShape(ghosts[i], ghX[i], HY, 0, ghT[i] < 0.12 ? EL[3] : EL[4], clamp01(ghT[i] / 0.4));   // 三个紫色残影，抖动消散
    if (speedT < 2 / 12) for (let k = 0; k < 3; k++) { const y = speedY - 4 + k * 4, L = 8 - k * 2; for (let j = 0; j < L; j++) if (speedT < 1 / 12 || (j & 1)) put(speedX - 12 - j - k, y, j < 3 ? EL[2] : EL[3]); }   // 俯冲速度线
  }
  function fxFront(f12) {
    if (stampT < 0.2) {                                                       // 目标身上印出一只竖瞳（2 帧）
      const cx = DUMMY_X, cy = HY - 15, first = stampT < 1 / 12 + 0.02;
      for (let u = -5; u <= 5; u++) { const h = R(3.4 * Math.pow(1 - (u / 5.5) * (u / 5.5), 0.75)); for (let v = -h; v <= h; v++) put(cx + u, cy + v, Math.abs(v) === h ? (first ? EL[0] : EL[1]) : Math.abs(u) <= (first ? 0 : 1) ? EL[4] : first ? EL[1] : EL[2]); }
      put(cx, cy - 4, EL[4]); put(cx, cy + 4, EL[4]);
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.lie && P.dq < 1) {                        // 蓄满 / 施放：瞳孔前的星芒
      const [gx, gy] = pupScr(), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 3; r <= L + 1; r++) { const c = r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx, gy - r - 1, c); put(gx, gy + r + 1, c); }
    }
  }

  return {
    name: '暗邪眼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.iris, m.glow, m.sgl], HIT_POINT: [4, -17], EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'arcane', style: 'spiral', w: 0.5, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
