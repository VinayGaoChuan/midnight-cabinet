// 腐烂鼠王（敌人 · 混沌 · 稀有 · 近战 272）：「高伤害单位。以群集作战著称。」没有特性。
// 和腐尸鼠同族，体量大一倍：同一种破甲虫壳在它背上长成了一座带刺的甲壳鞍，鞍上蹲着 3 只小腐鼠探头探脑；
// 头上顶一圈鼠骨拼成的骨冠（5 根尖骨），侧腹同样烂出一个洞露出肋骨，长秃尾和小鼠们的尾巴打成一个结垂在身后（「鼠王」）。眼睛是诅咒紫。
// 攻击 = 前扑咬合，最前面那只小鼠跟着跳到目标身上咬一口再逃回来；技能「鼠潮」= 仰头尖叫、脚下开出紫色鼠洞法阵、小鼠一只只钻出来聚到身边 →
//   鼠群变成一道贴地的地浪涌向目标 → 小鼠爬满目标、诅咒外爆，目标染紫。
// 移动 = 身体压低、前冲式小跑，背上小鼠跟着颠；死亡 = 背上小鼠四散逃走，鼠王瘫软趴倒，骨冠滚开。
// 身体用 parts-beast 的 quad（rat 头放大到 8·6.5·4，hump 2），刺甲鞍、鞍上小鼠、骨冠、尾结、肋骨洞自画。
PCD.define('DecayingChampionRat', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, defMat, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：鼠潮 · 诅咒紫（curse：淡紫 → 紫 → 暗紫 → 深紫 → 墨紫）─────
  const R_EL = FXI.curse, EL = FXR[R_EL];

  // ───── 材质 ─────
  // 腐绿灰皮：基色橄榄灰、暗部墨绿（比苔绿 35 暗，不会在腿边描出一圈绿线）、亮部奶灰（比腐尸鼠的苍灰皮深一级、偏绿偏暖）
  const m = B.mats(E, { main: [0, 34, 7, 6], claw: 'bone', eye: [0, 0, 43, 43], nose: [0, 0, 12, 12], teeth: 'bone', glow: [0, 0, 43, 21] });
  const M = {
    shell: defMat([0, 20, 61, 62], 2), shellHi: defMat([0, 61, 62, 5], 1), spikeTip: defMat([0, 61, 5, 6], 1),   // 刺甲鞍（sand 暗段 61 作基色、62 / 5 高光、墨色勾线）；刺尖骨白
    rib: defMat('bone', 1), wound: defMat([11, 55, 12, 13], 1), cav: defMat([0, 0, 0, 0], 1, 1),
    rot: defMat('moss', 1), tail: defMat([11, 12, 16, 15], 1), crown: defMat('bone', 1),   // 秃尾：发炎的粉褐肉色
    rat: defMat([8, 59, 60, 17], 1), ratEye: defMat([0, 0, 0, 0], 1, 1), ratTail: defMat([11, 12, 16, 15], 1), ratPink: defMat([11, 12, 63, 58], 1),
  };
  const BASE = { len: 14, chest: 5.5, rump: 5, waist: 0.2, hump: 2, leg: 5, lw: 2, thigh: 2.6, farDx: -2, stride: 3, lift: 2, foot: 'claw',
    neck: 2, neckA: 0.3, neckW: 3, head: { type: 'rat', w: 8, h: 6.5, snout: 4.2, snH: 4, tip: 0.5, ear: 'round', earH: 2, teeth: 2 }, headA: 0.3, tail: 'none', mane: 'none', fur: 1, m };
  const o = Q.shape(BASE);

  const HX = 64, DUR = DEFAULT_DUR.slice(), hero = new Sprite(90, 44, 44, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.ink, m.spec, m.claw, m.glow, m.nose, m.teeth, M.cav, M.rib, M.ratEye, M.crown]) RIM.skip[k] = 1;

  // 本角色的姿势字段：sh 鞍的上下颠 -1..1 · r0 r1 r2 三只小鼠探头高度 0 缩进去 / 1 露耳 / 2 露头 / 3 整只站起 · rb 小鼠颠起 0–1
  const EXTRA = [['sh', -1, 1], ['r0', 0, 3], ['r1', 0, 3], ['r2', 0, 3], ['rb', 0, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.sh = 0; P.r0 = 2; P.r1 = 2; P.r2 = 2; P.rb = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 3), R(rig.C1.y - 1)];

  // ───── 刺甲鞍位图（静态）：鞍局部坐标 u 向前、v 向下，原点在鞍沿中点 ─────
  // 候选部件：spikedSaddle —— 腐尸鼠那种破甲虫壳长大成的鞍：沙色圆顶（顶面平一点好让小鼠蹲），两道和腐尸鼠一样从顶上裂到壳沿的裂缝（顶上崩出 V 形缺口），
  //   壳两端各长出单根三角尖刺（根部 3 格宽、3–4 格长、尖端 1 格骨白），鞍尾 3 根、鞍头 2 根
  const SD_U0 = -13, SD_U1 = 9;
  const PROF = [-2, -4, -5, -5, -6, -6, -6, -6, -7, -7, -7, -7, -7, -7, -7, -6, -6, -6, -6, -5, -5, -4, -2];   // 鞍尾 → 顶 → 鞍头
  const topOf = (u) => PROF[u - SD_U0];
  const SEAT = [[-8, -1], [0, -1], [4, 1]];     // 三只小鼠：[身子后端的 u, 朝向]（后面两只朝后，前面那只朝前）；两两之间空 3 列
  const SADDLE = [], STOP = {};                 // [u, v, mat, tone]；STOP[i] = 第 i 只小鼠的座面 v（身下最高的壳顶）
  {
    // 刺：[根 u, 根 v, 方向 dx, dy, 长]；先画刺、再画壳，壳盖住刺根
    const SPK = [[-11, -4, -0.7, -0.72, 4], [-13, -2, -1, -0.3, 4], [-12, 0, -0.85, 0.5, 3], [8, -4, 0.62, -0.78, 4], [9, -2, 1, -0.25, 3]];
    for (const [ru, rv, dx, dy, L] of SPK) {
      for (let v = rv - 6; v <= rv + 6; v++) for (let u = ru - 6; u <= ru + 6; u++) {
        const px = u - ru, py = v - rv, al = px * dx + py * dy, ac = Math.abs(-px * dy + py * dx);
        if (al < -0.3 || al > L + 0.3 || ac > 1.05 * (1 - al / (L + 0.6)) + 0.4) continue;
        SADDLE.push([u, v, al > L - 0.7 ? M.spikeTip : M.shell, al > L - 0.7 ? 4 : 0]);
      }
    }
    const CRACK = [-6, 2], crackPix = new Set();                                                  // 两道旧裂缝（腐尸鼠破壳上的那两道），落在小鼠之间的空档里
    for (const u0 of CRACK) { const t0 = topOf(u0); let u = u0; for (let v = t0 + 1; v <= -2; v++) { crackPix.add(u + ',' + v); u += u0 < -2 ? -1 : 1; } }   // 斜着往下裂，不裂到壳沿
    for (let u = SD_U0; u <= SD_U1; u++) {
      const top = topOf(u), bot = u <= SD_U0 + 1 || u >= SD_U1 - 1 ? 1 : 0;                      // 壳沿两端外翻 1 格
      for (let v = top; v <= bot; v++) {
        if (CRACK.some((c) => c === u && v === top)) continue;   // 裂缝顶上崩掉一格
        let mt = M.shell, t = 0;
        if (crackPix.has(u + ',' + v)) t = 1;
        else if (v === bot) t = 2;
        else if (v === top + 1 && u < -2 && u > SD_U0 && (u & 1)) { mt = M.shellHi; t = 4; }       // 左上受光：壳顶一串 5 号高光
        SADDLE.push([u, v, mt, t]);
      }
    }
    SEAT.forEach(([a, d], i) => { let top = 0; for (let k = 0; k <= 2; k++) top = Math.min(top, topOf(a + k * d)); STOP[i] = top; });
  }
  function saddleAnchor(rg) { const xa = R(rg.C2.x + 5), s = Q.span(rg, o, xa); return [xa, (s ? s[0] : R(rg.C1.y - 5)) + 3]; }
  function drawSaddle(ax, ay) { E.part(); for (const [u, v, mt, t] of SADDLE) U.dot(E, ax + u, ay + v, mt, t); }

  // 候选部件：miniRat —— 5×4 格的小腐鼠（蹲在鞍顶；dir 1 朝右 / -1 朝左）：苍白身子、2 格长吻朝外、1 格竖起的耳朵、1 格墨色眼、2 格尾巴从鞍沿垂下
  //   h 0 缩进壳里 / 1 只露耳朵和头顶 / 2 整只蹲着 / 3 站起来（露脚）；座面以下截掉（像钻进壳里）；尾巴不截，一直挂在壳上
  const MR = [   // [dx, dy, 材质 0 身 / 1 眼 / 2 鼻尖, tone]；dy 0 = 最底一行
    [2, -3, 2, 3],                                        // 竖起的粉耳朵（长在头顶，不在背中间）
    [0, -2, 0, 3], [1, -2, 0, 3], [2, -2, 1, 0], [3, -2, 0, 4],   // 平直的背、墨色眼、额头（亮）
    [0, -1, 0, 3], [1, -1, 0, 3], [2, -1, 0, 3], [3, -1, 0, 3], [4, -1, 2, 3],   // 身、2 格长吻（吻 + 粉鼻尖）朝外
    [0, 0, 0, 2], [2, 0, 0, 2],                           // 后腿、前爪（中间空一格，看得出腿）
  ];
  const MR_SINK = [0, 2, 0, -1];
  function miniRat(x, y, dir, h, clip) {
    if (!h) return; E.part();
    const dy0 = MR_SINK[h], mats = [M.rat, M.ratEye, M.ratPink];
    for (const [dx, dy, k, t] of MR) if (y + dy + dy0 < clip) U.dot(E, x + dx * dir, y + dy + dy0, mats[k], t);
    if (h >= 3) { U.dot(E, x, y + 1 + dy0, M.rat, 2); U.dot(E, x + 2 * dir, y + 1 + dy0, M.rat, 2); }   // 站起来时露出脚
    U.dot(E, x - dir, y + dy0, M.ratTail, 3); U.dot(E, x - dir, y + 1 + dy0, M.ratTail, 2);             // 2 格尾巴垂在壳上
  }
  // 候选部件：boneCrown —— 鼠骨拼的骨冠，戴在颅顶：底下一道 9 格宽、2 格厚的骨箍（下排中间两个墨色眼窝，像一只鼠头骨），
  //   箍上 5 根朝上的尖骨，高 3 / 3 / 4 / 3 / 3、中间最高，根挨着根、往上略向外张，尖和尖之间空 2 列；lean 1 = 滚落后歪着立在地上
  const CROWN = [];
  {
    for (let k = -4; k <= 4; k++) { const eye = k === -1 || k === 1; CROWN.push([k, 0, eye ? M.cav : M.crown, eye ? 0 : 2], [k, -1, M.crown, k < 1 ? 4 : 3]); }
    const BONE = [[-4, -6, 3], [-2, -3, 3], [0, 0, 4], [2, 3, 3], [4, 6, 3]];   // [根 x, 尖 x, 高]
    for (const [x0, x1, h] of BONE) for (let j = 1; j <= h; j++) CROWN.push([R(x0 + (x1 - x0) * (j - 1) / Math.max(1, h - 1)), -1 - j, M.crown, j === h ? 4 : 3]);
  }
  function boneCrown(x, y, lean) {
    E.part();
    for (const [dx, dy, mt, t] of CROWN) U.dot(E, x + dx + (lean ? R(dy * 0.35) : 0), y + dy, mt, t);
  }
  function crownAt(rg) { return [R(rg.eye[0] - 3), R(rg.eye[1] - 2)]; }   // 颅顶：骨箍压在眼睛上方、偏后脑，不挡诅咒紫的眼
  let crownA = [0, 0];

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'reach', 'paw', 'tail', 'sh'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, reach: 0, paw: 0, tail: 0, sh: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 2, pitch: -1, head: -1, jaw: 2, tail: -1, sh: 1 });
  const A_BITE = pose({ bx: 7, crouch: 0, pitch: 1, head: 1, jaw: 3, reach: 3, paw: 1, tail: 2, sh: -1 });
  const A_SNAP = pose({ bx: 6, pitch: 0, head: 1, jaw: 0, reach: 2, tail: 1 });
  const K_CHG = pose({ bx: -2, pitch: 3, head: -2, jaw: 3, tail: 2, sh: 1 });                // 仰头尖叫
  const K_CAST = pose({ bx: 2, crouch: 1, pitch: -1, head: 1, jaw: 3, reach: 2, tail: 2 });   // 一低头，把鼠群推出去
  const tmp = {};
  const apply = (s) => { for (const f of F_ALL) P[f] = R(s[f]); };
  const mixP = (A, Bp, q) => { E.mix(tmp, A, Bp, q, F_ALL); apply(tmp); };
  const T_BITE = 2 / 12, T_RATBITE = 0.25, T_FLOP = INCOMING + 0.5, T_FLEE = INCOMING + 0.35, T_CRLAND = INCOMING + 0.8;
  const T_WAVE = 1 / 12, T_SWARM = 3 / 12;
  const PEEK = [2, 2, 3, 2, 2, 1, 1, 2, 2, 3, 2, 2];

  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.mane = 0;
    const k = f12 >> 1; P.r0 = PEEK[k % 12]; P.r1 = PEEK[(k + 4) % 12]; P.r2 = PEEK[(k + 8) % 12];   // 待机个性：背上小鼠钻来钻去，一会儿探头一会儿缩头
    if (lp >= 1.4 - 1e-6 && lp < 2.0) { P.head = 1; P.ear = f12 & 1; P.r2 = 3; P.r1 = f12 & 1 ? 0 : 3; }   // 鼠王低头嗅地，小鼠站起来张望
  }
  function deathPose(d, f12) {
    P.eyes = 1; P.ear = 1;
    if (d < 0.3) { apply(pose({ bx: -2, crouch: 1, head: -1, tail: 2, sh: -1 })); P.flash = d < 1 / 12 ? 1 : 0; P.r0 = 0; P.r1 = 0; P.r2 = 0; return; }
    P.r0 = d < T_FLEE - INCOMING ? 3 : 0; P.r1 = P.r0; P.r2 = P.r0;                                     // 小鼠站起来 → 跳下去四散逃走
    apply(pose({ bx: -2, head: 3, tail: d < 0.9 ? 1 : 0, pitch: -1 })); P.lie = 1; P.jaw = 1;              // 瘫软趴倒
    P.lift = d < 0.38 ? 3 : d < 0.45 ? 1 : 0;
    const dp = B.dropAt(d, { at: 0.45, dur: 0.35, dx: 13, hop: 6 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
    if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                              // 压低身子前冲小跑，背上小鼠跟着颠
      apply(REST); Q.anim.walk(P, tq); P.mane = 0; const g = P.gf;
      P.crouch = 1; P.pitch = g & 1 ? -1 : 0; P.sh = g & 1 ? -1 : 0; P.rb = g & 1 ? 1 : 0; P.r0 = 2; P.r1 = g === 1 ? 3 : 2; P.r2 = g === 3 ? 3 : 2;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) mixP(REST, A_WIND, ease.out(tq / 0.12));
      else if (tq < T_BITE - 1e-6) mixP(A_WIND, A_WIND, 0);
      else if (tq < 0.25) { mixP(A_BITE, A_BITE, 0); P.rim = 1; P.glow = 2; }
      else if (tq < 0.45) mixP(A_SNAP, A_SNAP, 0);
      else mixP(A_SNAP, REST, ease.inOut(clamp01((tq - 0.45) / 0.3)));
      P.r2 = tq >= 0.1 && tq < 0.72 ? 0 : 2; P.r1 = tq < 0.1 ? 3 : 2;                                     // 最前面那只小鼠跳出去了
    } else if (st === CHARGE) {
      mixP(REST, K_CHG, ease.inOut(clamp01(tq / 0.7))); P.ear = 1; P.glow = tq < 0.7 ? 1 : 2; P.rim = tq < 0.7 ? 1 : 2;
      if (tq > 0.7) P.jaw = 3 - (f12 & 1);                                                                // 尖叫一抖一抖
      P.r0 = 3; P.r1 = 3; P.r2 = 3; P.rb = tq > 0.7 ? f12 & 1 : 0;
    } else if (st === CAST) {
      mixP(K_CHG, K_CAST, ease.out(clamp01(tq / 0.1))); P.glow = 3; P.rim = 3; P.r0 = 3; P.r1 = 3; P.r2 = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixP(K_CAST, REST, q); P.glow = q < 0.5 ? 2 : 1; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.r0 = 2; P.r1 = q < 0.5 ? 3 : 2; P.r2 = 2;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); P.mane = 0; if (h < 0.2) { P.sh = -1; P.r0 = 0; P.r1 = 1; P.r2 = 0; } else if (h < 0.4) { P.r0 = 1; P.r1 = 1; P.r2 = 1; } }   // 小鼠吓得缩回去
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12); else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.eye[0]) + P.bx; P.gy = R(rig.eye[1]);                                                  // 焦点 = 诅咒紫的眼
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 肋骨洞（同腐尸鼠的 ribHole，4 根肋骨）
  function ribHole(x0, n, gap, depth) {
    E.part();
    const x1 = x0 + (n - 1) * gap + 2;
    for (let x = x0 - 1; x <= x1; x++) {
      const s = Q.span(rig, o, x); if (!s) continue; const yb = s[1];
      for (let y = yb - depth; y <= yb; y++) {
        const edge = x === x0 - 1 || x === x1, cut = y >= yb - 1 && !edge;
        if (cut) { E.sp(x, y, 0); continue; }
        if (edge) U.dot(E, x, y, M.wound, 2); else U.dot(E, x, y, M.cav, 0);
      }
    }
    for (let i = 0; i < n; i++) {
      const x = x0 + 1 + i * gap, s = Q.span(rig, o, x); if (!s) continue; const yb = s[1];
      for (let y = yb - depth + 1; y <= yb - 2; y++) U.dot(E, x, y, M.rib, 3);
    }
  }
  function rotSpots() {
    const C1 = rig.C1, C2 = rig.C2, pts = [[C2.x + 1, C2.y + 2], [C2.x + 2, C2.y + 3], [C1.x, C1.y + 2], [C1.x + 1, C1.y + 3]];   // 4 块霉斑
    for (const [x, y] of pts) U.dot(E, x, y, M.rot, 1);
  }
  // 候选部件：knotTail —— 「鼠王」尾结：鼠王的长秃尾从臀后垂下，和两只小鼠从鞍下伸出来的细尾缠成一个疙瘩（三个互相套住的圈，交叉处压 1 格暗线），
  //   结下面三根尾梢分开拖到地上，梢尖亮一格
  const KNOT = [   // [dx, dy, tone]：三个圈（左、中、右），中间的圈压在两边的圈上
    [-3, -1, 3], [-3, 0, 2], [-2, -2, 4], [-2, 1, 2], [-1, -1, 1], [-1, 0, 3],
    [0, -2, 4], [1, -2, 3], [-1, -2, 4], [0, 1, 2], [1, 1, 2], [0, -1, 1], [0, 0, 1], [1, -1, 3], [2, 0, 1],
    [2, -1, 4], [3, -1, 3], [3, 0, 2], [2, 1, 2], [-2, 0, 1], [1, 0, 3], [-1, 1, 3],
  ];
  const TIPS = [[-9, -1], [-5, 0], [1, 0]];
  function knotTail(sa) {
    E.part();
    const t0 = rig.tail, sw = (P.tail | 0) * 0.5, kx = R(t0.x - 6 + sw * 0.5), ky = Math.min(-5, R(t0.y + 5));
    const x = t0.x, y = t0.y + 1;                                                                  // 主尾：臀后 → 结（2 格粗）
    for (let k = 0; k <= 8; k++) { const q = k / 8; U.dot(E, x + (kx - x) * q, y + (ky - y) * q, M.tail, 3); U.dot(E, x + (kx - x) * q, y + (ky - y) * q + 1, M.tail, 2); }
    for (const [dx0, dy0] of [[SD_U0 + 3, 1], [SD_U0 + 5, 1]]) {                                     // 两只小鼠的细尾：从鞍沿下面垂到结
      const x0 = sa[0] + dx0, y0 = sa[1] + dy0; for (let k = 0; k <= 6; k++) { const q = k / 6; U.dot(E, x0 + (kx - x0) * q - Math.sin(q * 3.1) * 1.5, y0 + (ky - y0) * q, M.tail, 2); }
    }
    for (let s = 0; s < 3; s++) {                                                                   // 三根尾梢：从结底分开拖到地上
      const x0 = kx - 2 + s * 2, y0 = ky + 2, [ex, ey] = TIPS[s], x1 = kx + ex, y1 = ey, n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) U.dot(E, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, M.tail, k === n ? 4 : 2);
    }
    for (const [dx, dy, t] of KNOT) U.dot(E, kx + dx, ky + dy, M.tail, t);                          // 结
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const sa = saddleAnchor(rig), ay = sa[1] + P.sh;
    Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1);
    knotTail([sa[0], ay]);
    Q.body(E, rig, P, o); rotSpots();
    ribHole(R(rig.C1.x - 7), 3, 2, 3);
    Q.leg(E, rig, P, o, 2); Q.leg(E, rig, P, o, 3);
    Q.head(E, rig, P, o);
    drawSaddle(sa[0], ay);
    const rb = P.rb, RH = [P.r0, P.r1, P.r2];                                                          // 鞍顶三只小鼠：蹲在壳顶，缩头时钻进壳里
    SEAT.forEach(([a, d], i) => miniRat(sa[0] + a, ay + STOP[i] - 1 - (i === 1 ? 0 : rb), d, RH[i], ay + STOP[i]));
    if (!P.drop) { const c = crownAt(rig); boneCrown(c[0], c[1], 0); }
    else boneCrown(crownA[0] + P.dsx, P.drop === 2 ? 0 : Math.min(0, crownA[1] - P.dsy), P.drop === 2 || P.dsx > 6 ? 1 : 0);   // 骨冠滚开、歪着立在地上
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  { poseAt(DEATH, INCOMING + 0.44, 0); crownA = crownAt(rig); reset(); rig = Q.rig(P, o); }

  // ───── 特效：屏幕上的小鼠（跳扑、鼠潮、逃散）─────
  // 候选部件（特效）：screenRat —— 小鼠直接画在帧缓冲上（外圈墨色描边）：4×2 身子、1 格吻、1 格耳、2 格尾、脚一帧一换；
  //   pal = [身, 暗部, 眼, 尾, 脚]；诅咒鼠用 curse 第 2–3 级（24 身、42 屁股 / 尾 / 脚），普通鼠用苍白色阶
  const PAL_RAT = [60, 59, 0, 16, 59], PAL_CURSE = [24, 42, 43, 42, 42];
  const RP = [[0, -2, 0], [1, -2, 0], [2, -2, 0], [3, -2, 0], [0, -1, 1], [1, -1, 0], [2, -1, 0], [3, -1, 0],   // 身 4×2（整块亮色，只有屁股暗一格，贴地也不会被墨线吃掉）
    [4, -1, 0], [2, -3, 0], [3, -2, 2], [-1, -1, 3], [-2, 0, 3]];                                              // 吻、耳、眼、2 格尾
  function screenRat(x, y, dir, f, pal) {
    x = R(x); y = R(y);
    for (const [dx, dy] of RP) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) put(x + (dx + ox) * dir, y + dy + oy, 0);
    if (f) { put(x, y, pal[4]); put(x + 3 * dir, y, pal[4]); } else { put(x + 1 * dir, y, pal[4]); put(x + 2 * dir, y, pal[4]); }
    for (const [dx, dy, c] of RP) put(x + dx * dir, y + dy, pal[c]);
  }
  const SN = 14, sX = new Float32Array(SN), sY = new Float32Array(SN), sVX = new Float32Array(SN), sT = new Float32Array(SN).fill(99), sL = new Float32Array(SN), sM = new Uint8Array(SN), sTX = new Float32Array(SN), sD = new Int8Array(SN);
  // 模式：1 从鼠洞钻出、跑到身边集合 · 2 顺着地浪冲向目标 · 3 在目标身上乱爬 · 4 逃散（普通配色）
  function addRat(x, y, mode, life, vx, tx) { let k = 0; for (let i = 0; i < SN; i++) if (sT[i] >= sL[i]) { k = i; break; } sX[k] = x; sY[k] = y; sM[k] = mode; sT[k] = 0; sL[k] = life; sVX[k] = vx; sTX[k] = tx; sD[k] = vx < 0 ? -1 : 1; }
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastSpawn = -1, biteT = 9;
  function onEnter(s) {
    if (s === CHARGE) { fx.circle(HX + 14, HY - 1, 13, 3, R_EL, 2.0, 1, 0); lastSpawn = -1; }        // 脚下前方开出紫色鼠洞法阵
    if (s === CAST) {                                                                                  // 鼠群变成一道贴地的地浪涌向目标
      poseAt(CAST, 0, E.simT); const x0 = HX + 16;
      fx.wave(x0, HY - 1, 1, DUMMY_X - x0 + 2, 6, R_EL, 0.5, 2);
      for (let i = 0; i < SN; i++) if (sT[i] < sL[i] && sM[i] === 1) { sM[i] = 2; sT[i] = 0; sL[i] = 0.3; sVX[i] = 135; sD[i] = 1; }
      for (let i = 0; i < 2; i++) addRat(x0 + 4 + i * 8, HY - 1, 2, 0.3, 135, 0);
      releaseOrbit(40, 90, 0.2, 0.45); burst(scrX(P.gx), HY + P.gy, 12, 40, 90, 0.2, 0.4, R_EL, 8); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BITE) {                                                                // 咬合：牙印火花 + 小鼠扑出
      biteT = 0; const x = DUMMY_X - 5, y = HY - 12;
      burst(x, y, 10, 40, 90, 0.12, 0.3, FXI.impact, 8); burst(x, y, 6, 30, 70, 0.15, 0.3, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'bite', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === ATTACK && t === T_RATBITE) { burst(DUMMY_X - 1, HY - 20, 6, 20, 50, 0.12, 0.25, FXI.blood, 4); hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.2 }); }   // 小鼠补一口
    if (s === CAST && t === T_WAVE) { for (let k = 0; k < 8; k++) spawn(K_DUST, HX + 20 + k * 3, HY - 1, 30 + Math.random() * 30, -6 - Math.random() * 6, 0.3 + Math.random() * 0.2, R_EL); }
    if (s === CAST && t === T_SWARM) {                                                                 // 小鼠爬满目标 + 诅咒外爆
      for (let i = 0; i < SN; i++) if (sT[i] < sL[i]) sT[i] = sL[i];
      for (let i = 0; i < 6; i++) addRat(DUMMY_X - 5 + (i & 1) * 8, HY - 3 - (i >> 1) * 8 - (i & 1), 3, 1.3, (i & 1) ? 1 : -1, i);
      burst(DUMMY_X, HY - 14, 28, 50, 130, 0.3, 0.6, R_EL, 10); ring(DUMMY_X, HY - 12, 1, R_EL); fx.cross(DUMMY_X, HY - 14, 6, R_EL, 0.25, 2);
      hitDummy(1, 1); dummyFx({ dur: 1.4, tint: 'curse' }); shake(0.12, 1); sfx('impact', { pal: 'curse', w: 0.7 });
    }
    if (s === DEATH && t === T_FLEE) {                                                                 // 背上的小鼠四散逃走
      const sa = saddleAnchor(rig), bx = scrX(sa[0]), by = HY + sa[1] - 6;
      addRat(bx - 6, by, 4, 1.4, -55, 0); addRat(bx, by - 2, 4, 1.4, -75, 0); addRat(bx + 4, by, 4, 1.4, 60, 0);
    }
    if (s === DEATH && t === T_FLOP) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 12 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -5 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_CRLAND) { burst(scrX(crownA[0] + 13), HY - 2, 5, 20, 40, 0.1, 0.25, FXI.dust, 6); }
  }
  const EVENTS = [[], [], [T_BITE, T_RATBITE], [], [T_WAVE, T_SWARM], [], [], [T_FLEE, T_FLOP, T_CRLAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {
      chargeAcc += dt * (6 + 12 * clamp01(stT / DUR[CHARGE]));                                        // 诅咒微光往眼睛汇聚
      while (chargeAcc >= 1) { chargeAcc -= 1; const gx = scrX(P.gx), gy = HY + P.gy, r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
      const n = Math.floor((stT - 0.25) / 0.18);                                                       // 小鼠一只只从鼠洞里钻出来
      if (stT >= 0.25 && n > lastSpawn && n < 5) { lastSpawn = n; const x = HX + 8 + ((n * 7) % 15); addRat(x, HY - 1, 1, 3.0, 0, HX - 2 + n * 7); burst(x + 2, HY - 2, 4, 15, 35, 0.15, 0.3, R_EL, 10); }
    }
    for (let i = 0; i < SN; i++) {
      if (sT[i] >= sL[i]) continue; sT[i] += dt;
      if (sM[i] === 1) { const d = sTX[i] - sX[i]; if (sT[i] < 0.15) sY[i] = HY - 1 - Math.sin(sT[i] / 0.15 * 3.14) * 4; else { sY[i] = HY - 1; if (Math.abs(d) > 0.5) { sX[i] += Math.sign(d) * Math.min(Math.abs(d), 45 * dt); sD[i] = d < 0 ? -1 : 1; } } }
      else if (sM[i] === 2 || sM[i] === 4) { sX[i] += sVX[i] * dt; sY[i] = HY - 1 - (sM[i] === 2 ? ((E.stepN >> 2) & 1) : 0); }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { sfx('step', { w: 0.6 }); const x = scrX(R(rig.C1.x)); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 16, HY - 1, (P.flip ? 1 : -1) * (6 + Math.random() * 10), -3 - Math.random() * 5, 0.25 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 34, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, Math.random() < 0.5 ? FXI.soul : R_EL); } }
    biteT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastSpawn = -1; biteT = 9; sT.fill(99); }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (E.state === ATTACK) {                                                                          // 最前面那只小鼠：跳上目标咬一口 → 摔下来逃回鞍上
      const t = E.stT, sa = saddleAnchor(rig), x0 = scrX(sa[0] + SEAT[2][0] + 2 + P.bx), y0 = HY + sa[1] + STOP[2] - 1, tx = DUMMY_X - 3, ty = HY - 19;
      if (t >= 0.1 && t < 0.25) { const q = (t - 0.1) / 0.15; screenRat(x0 + (tx - x0) * q, y0 + (ty - y0) * q - Math.sin(q * 3.14) * 6, 1, 0, PAL_RAT); }
      else if (t >= 0.25 && t < 0.5) screenRat(tx + ((f12 & 1) ? 1 : 0), ty, 1, f12 & 1, PAL_RAT);
      else if (t >= 0.5 && t < 0.72) { const q = (t - 0.5) / 0.22, x = tx + (x0 - tx) * q, y = q < 0.4 ? ty + (HY - 1 - ty) * (q / 0.4) : HY - 1 - Math.sin((q - 0.4) / 0.6 * 3.14) * 5 * (q > 0.7 ? 1 : 0); screenRat(x, y, -1, f12 & 1, PAL_RAT); }
    }
    if (biteT < 2 / 12) {                                                                             // 咬合拖影：上下两排牙印弧
      const c = biteT < 1 / 12 ? EL[0] : EL[2], x = DUMMY_X - 8, y = HY - 12;
      for (let k = 0; k < 6; k++) { if (biteT >= 1 / 12 && ((k + f12) & 1)) continue; put(x + k, y - 4 + (k === 0 || k === 5 ? 1 : 0), c); put(x + k, y + 4 - (k === 0 || k === 5 ? 1 : 0), c); }
    }
    for (let i = 0; i < SN; i++) {
      if (sT[i] >= sL[i]) continue; const age = sT[i] / sL[i];
      if (sM[i] === 3) {                                                                               // 爬满目标：一堆小鼠在假人身上乱动
        if (age > 0.75 && ((i + f12) & 1)) continue;
        const k = sTX[i], jx = ((f12 + k * 3) % 4) - 1.5, jy = ((f12 * 2 + k) % 3) - 1;
        screenRat(sX[i] + jx, sY[i] + jy, (f12 + k) & 2 ? 1 : -1, (f12 + k) & 1, PAL_CURSE);
      } else if (sM[i] === 4) { if (age > 0.7 && ((i + f12) & 1)) continue; screenRat(sX[i], sY[i], sD[i], f12 & 1, PAL_RAT); }
      else screenRat(sX[i], sY[i], sD[i], f12 & 1, PAL_CURSE);
    }
  }

  return {
    name: '腐烂鼠王', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow], HIT_POINT, EVENTS,
    REVIVE: { dy: -12, ramp: 'curse' },
    SFX: { body: 'beast', how: 'collapse', pal: 'curse', style: 'summon', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
