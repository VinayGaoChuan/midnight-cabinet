// 腐尸鼠（敌人 · 混沌 · 普通 · 近战 240）：「壳不是很硬，爪子也不太锋利。」没有特性。
// 臃肿的腐烂老鼠：身体肥短、腿细，背上扣着半截开裂的甲虫背壳（两道裂缝，壳比身子还长，把背线顶高 4 格，前端碎成锯齿），
// 侧腹烂出一个洞、露出三根肋骨（腹线缺一块），一只耳朵烂没了、剩下那只也被啃掉一角，秃尾巴拖在地上，尾巴上方绕飞着一只苍蝇。
// 和同组混沌鼠（骨刃、贴地窜）、邪鼠（站着拿棍）、已通过的针刺者（背刺）拉开：它背着一只破壳，武器就是这只壳。
// 攻击 = 低头用背壳顶过去（冲撞）；技能「腐臭喷尘」= 身体鼓起、壳缝渗尘、苍蝇越飞越快 → 背壳一抖，一大团腐尘从裂缝里喷出往前涌 → 尘团罩住目标（减速）。
// 移动 = 拖着壳蹒跚、一步一晃；死亡 = 散架：背壳滑落翻倒，身体塌下，骨头散了一地。
// 身体用 parts-beast 的 quad（rat 头放大到 6·5·3），背壳、肋骨洞、烂耳、秃尾、苍蝇自画。
PCD.define('DecayingCorpseRat', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, defMat, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：腐尘 · 灰褐（dust：奶油 → 暖灰 → 石灰 → 石 → 深石）─────
  const R_EL = FXI.dust, EL = FXR[R_EL];

  // ───── 材质 ─────
  // 腐尸灰皮：苍灰色阶（暗段压在阴影里），霉斑、烂肉用苔绿 moss 点在上面
  const m = B.mats(E, { main: [8, 59, 60, 18], claw: 'bone', eye: [0, 0, 50, 50], nose: [0, 0, 12, 12], teeth: 'bone', glow: [0, 0, 50, 38] });
  const M = {
    shell: defMat('sand', 2),                 // 破甲虫壳（裂缝用勾线色 20）
    rib: defMat('bone', 1), wound: defMat([11, 55, 12, 13], 1), cav: defMat([0, 0, 0, 0], 1, 1),
    rot: defMat('moss', 1),                   // 身上的霉斑
    tail: defMat([8, 10, 59, 60], 1), ear: defMat([8, 59, 60, 18], 1),
    fly: defMat([0, 0, 0, 0], 1, 1), wing: defMat([0, 0, 60, 60], 1, 1),
  };
  const BASE = { len: 11, chest: 4.4, rump: 5, waist: 0.1, hump: 0, leg: 3, lw: 1, thigh: 1.8, farDx: -2, stride: 2, lift: 1, foot: 'claw',
    neck: 1.5, neckA: 0.3, neckW: 2.2, head: { type: 'rat', w: 6, h: 5, snout: 3.5, snH: 3, tip: 0.45, ear: 'none' }, headA: 0.3, tail: 'none', mane: 'none', fur: 0, m };
  const SHAPES = [Q.shape(BASE), Q.shape(Object.assign({}, BASE, { chest: 4.9, rump: 5.5 })), Q.shape(Object.assign({}, BASE, { chest: 5.4, rump: 6, waist: 0 }))];   // 鼓起：常态 / 半鼓 / 全鼓

  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(72, 34, 36, 31);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, m.spec, m.claw, m.glow, m.nose, m.teeth, M.fly, M.wing, M.cav, M.rib]) RIM.skip[k] = 1;

  // 本角色的姿势字段：sw 身体鼓起 0–2 · shx / shy 背壳相对身体的错位（抖动、惯性）· scr 后腿挠痒 0 不挠 / 1 / 2 · fp 苍蝇相位 0–7（8 = 不画）· rr 背壳翻滚 0–2
  const EXTRA = [['sw', 0, 2], ['shx', -2, 2], ['shy', -2, 2], ['scr', 0, 2], ['fp', 0, 8], ['rr', 0, 2]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.sw = 0; P.shx = 0; P.shy = 0; P.scr = 0; P.fp = 0; P.rr = 0; P.gx = 0; P.gy = 0; }
  reset();
  let o = SHAPES[0], rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 2), R(rig.C1.y - 1)];

  // ───── 背壳位图（静态）：壳局部坐标 u 向前、v 向下，原点在壳沿中点 ─────
  // 候选部件：crackedShell —— 半截开裂的甲虫背壳：圆顶 + 前端碎成锯齿 + 两道从顶上裂到壳沿的裂缝（顶上各缺一格）+ 壳沿两端外翻；按 90° 翻滚摆放（死亡时滑落）
  const SH_U0 = -10, SH_U1 = 6, SH_C = -2, SH_HW = 8.6, SH_H = 7, JAG = [0, 2, 1, 3, 2, 4];
  const SHELL = [], CRACK = [[-5, 0], [1, 0]];   // [u, v, tone]；裂缝起点（u，顶行在下面算）
  {
    const topOf = (u) => { const q = (u - SH_C) / SH_HW; let t = -R(SH_H * Math.sqrt(Math.max(0, 1 - q * q))); if (u >= 2) t += JAG[u - 2]; return t; };
    const crackPix = new Set();
    for (const c of CRACK) { const u0 = c[0], t0 = topOf(u0); c[1] = t0; let u = u0; for (let v = t0 + 2; v <= 0; v++) { crackPix.add(u + ',' + v); if (((v - t0) % 2) === 0) u += u0 < 0 ? -1 : 1; } }
    for (let u = SH_U0; u <= SH_U1; u++) {
      const top = topOf(u), bot = u <= SH_U0 + 1 || u >= SH_U1 - 1 ? 1 : 0;   // 壳沿两端外翻 1 格
      for (let v = top; v <= bot; v++) {
        if (CRACK.some((c) => (c[0] === u && v <= top + 1) || (c[0] + (c[0] < 0 ? -1 : 1) === u && v === top))) continue;   // 裂缝在壳顶崩掉一个 V 形缺口（外轮廓）
        let t = 0;
        if (crackPix.has(u + ',' + v)) t = 1;
        else if (v === bot) t = 2;                                            // 壳沿暗
        else if (v === -3 && (u & 1) === 0 && v > top + 1) t = 2;              // 横向的鞘翅沟纹
        SHELL.push([u, v, t]);
      }
    }
  }
  function shellAnchor(rg) {                       // 壳沿中点（身体本地坐标）：壳沿压在背线下 3 格，壳顶高出背线 4 格
    const xa = R(rg.C2.x + 3.5), s = Q.span(rg, o, xa); return [xa, (s ? s[0] : R(rg.C1.y - 4)) + 3];
  }
  // rr 0 扣在背上 · 1 侧翻（壳顶朝后）· 2 翻倒（壳顶朝下，像一只碗）
  const shellPt = (u, v, rr) => (rr === 1 ? [v, -u] : rr === 2 ? [-u, -v] : [u, v]);
  function drawShell(ax, ay, rr) {
    E.part();
    for (const [u, v, t] of SHELL) { const p = shellPt(u, v, rr); U.dot(E, ax + p[0], ay + p[1], M.shell, t); }
  }
  let dropA = [0, 0];                              // 死亡时壳脱落的起点（塌下姿势的壳沿）

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'reach', 'paw', 'tail', 'shx', 'shy'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, reach: 0, paw: 0, tail: 0, shx: 0, shy: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, pitch: -1, head: 2, tail: -1, shx: 1 });          // 缩脖子、壳往前压
  const A_RAM = pose({ bx: 7, pitch: -2, head: 3, reach: 1, tail: 2, shx: 1, shy: -1 });     // 低头，背壳顶出去
  const A_HOLD = pose({ bx: 6, pitch: -1, head: 2, tail: 1, shx: 0 });
  const K_CHG = pose({ bx: -1, crouch: 1, pitch: 0, head: 1, tail: 2, shy: -1 });
  const K_CAST = pose({ bx: 1, crouch: 0, pitch: -2, head: 2, jaw: 1, tail: 2, shx: 1, shy: -1 });
  const tmp = {};
  const apply = (s) => { for (const f of F_ALL) P[f] = R(s[f]); };
  const mixP = (A, Bp, q) => { E.mix(tmp, A, Bp, q, F_ALL); apply(tmp); };
  const T_HIT = 2 / 12, T_SLUMP = INCOMING + 0.3, T_SHLAND = INCOMING + 0.75, T_BREAK = INCOMING + 0.84;
  const T_PUFF = [1 / 12, 2 / 12, 3 / 12, 4 / 12], T_ENGULF = 5 / 12;

  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.mane = 0; P.fp = (f12 >> 1) & 7;
    if (lp >= 1.2 - 1e-6 && lp < 2.0) {                                        // 待机个性：后腿挠跳蚤，背壳跟着一抖一抖
      const k = f12of(lp - 1.2); P.scr = 1 + (k & 1); P.shx = k & 1 ? 1 : 0; P.shy = k & 1 ? -1 : 0; P.head = -1; P.ear = k & 1; P.eyes = k >= 2 && k < 8 ? 1 : 0; P.bob = 0;
    }
  }
  function deathPose(d, f12) {
    P.eyes = 1; P.ear = 1; P.fp = (f12 >> 1) & 7;
    if (d < 0.3) { apply(pose({ bx: -2, crouch: 1, head: -1, tail: 2, shy: -2, shx: -1 })); P.flash = d < 1 / 12 ? 1 : 0; return; }   // 挨打：壳被震得跳起来
    apply(pose({ bx: -2, head: 3, tail: 1, pitch: -1 })); P.lie = 1; P.jaw = 1;                          // 细腿一软，整个塌下
    P.lift = d < 0.38 ? 2 : d < 0.45 ? 1 : 0;
    const dp = B.dropAt(d, { at: 0.5, dur: 0.25, dx: -15, hop: 4 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
    P.rr = dp[0] === 2 ? 2 : dp[0] === 1 ? (Math.abs(dp[1]) < 5 ? 1 : 2) : 0;                          // 壳滑下去：侧翻 → 翻倒
    if (d >= T_BREAK - INCOMING) P.dq = 1;                                                               // 之后由死亡套件（散架）接管
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                              // 拖着壳蹒跚：前后一晃，壳晚半拍
      apply(REST); Q.anim.walk(P, tq); P.mane = 0; const g = P.gf;
      P.pitch = [0, -1, 0, 1][g]; P.shx = [-1, 0, 1, 0][g]; P.shy = g & 1 ? -1 : 0; P.fp = (f12 >> 1) & 7;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      P.fp = (f12 >> 1) & 7;
      if (tq < 0.12) mixP(REST, A_WIND, ease.out(tq / 0.12));
      else if (tq < T_HIT - 1e-6) mixP(A_WIND, A_WIND, 0);
      else if (tq < 0.25) { mixP(A_RAM, A_RAM, 0); P.eyes = 1; P.rim = 1; }
      else if (tq < 0.45) mixP(A_RAM, A_HOLD, ease.out((tq - 0.25) / 0.2));
      else mixP(A_HOLD, REST, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      mixP(REST, K_CHG, ease.inOut(clamp01(tq / 0.7))); P.ear = 1;
      P.sw = tq < 0.35 ? 0 : tq < 0.7 ? 1 : 2; if (tq >= 0.9 && (f12 & 1)) P.sw = 1;                     // 身体一点点鼓起来，鼓满后一胀一缩
      P.fp = f12 & 7; P.rim = tq < 0.7 ? 1 : 2; if (tq > 1.0) P.shx = f12 & 1 ? 1 : 0;                  // 苍蝇越飞越快；壳开始发抖
    } else if (st === CAST) {
      mixP(K_CHG, K_CAST, ease.out(clamp01(tq / 0.1))); P.sw = tq < 1 / 12 ? 2 : 0; P.jaw = 2;
      P.shx = (f12 & 1) ? 1 : -1; P.shy = (f12 & 1) ? -2 : -1; P.fp = f12 & 7; P.rim = 3; P.eyes = 1;     // 背壳一抖一抖地喷
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixP(K_CAST, REST, q); P.fp = (f12 >> (q < 0.5 ? 0 : 1)) & 7; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); P.mane = 0; P.fp = (f12 >> 1) & 7; if (h < 0.2) { P.shy = -2; P.shx = -1; } else if (h < 0.35) P.shy = -1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12); else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    o = SHAPES[P.sw]; rig = mkRig();
    const a = shellAnchor(rig), c = CRACK[0]; P.gx = a[0] + c[0] + P.shx + P.bx; P.gy = a[1] + c[1] + P.shy;   // 焦点 = 后面那道裂缝的顶
    B.key(P, SPEC);
  }
  function mkRig() {
    const rg = Q.rig(P, o);
    if (P.scr) { const L = rg.legs[2], k = P.scr === 2 ? 1 : 0; L.F = [L.T[0] + 2 + k, L.T[1] + 1 - k]; }   // 近侧后腿抬起来挠侧腹
    return rg;
  }

  // ───── 画 ─────
  // 候选部件：ribHole —— 侧腹烂出的洞：腹线往里缺 2 行（外轮廓缺口），洞里墨色，横着露出几根肋骨（骨白、向后斜），洞边一圈烂肉
  function ribHole(x0, n, gap, depth) {
    E.part();
    const x1 = x0 + (n - 1) * gap + 2;
    for (let x = x0 - 1; x <= x1; x++) {
      const s = Q.span(rig, o, x); if (!s) continue; const yb = s[1];
      for (let y = yb - depth; y <= yb; y++) {
        const edge = x === x0 - 1 || x === x1, cut = y >= yb - 1 && !edge;
        if (cut) { E.sp(x, y, 0); continue; }                                  // 腹线缺一块
        if (edge) U.dot(E, x, y, M.wound, 2);
        else U.dot(E, x, y, M.cav, 0);
      }
    }
    for (let i = 0; i < n; i++) {                                              // 肋骨：从洞顶往后下方斜
      const x = x0 + 1 + i * gap, s = Q.span(rig, o, x); if (!s) continue; const yb = s[1]; if (P.lie) E.part();   // 倒下后每根肋骨单独一个部件（散架时各自飞开）
      for (let y = yb - depth + 1; y <= yb - 2; y++) U.dot(E, x - (y > yb - 3 ? 1 : 0), y, M.rib, 3);
    }
  }
  // 霉斑：躯干上几块苔绿（和躯干同一个部件，紧跟 Q.body 画）
  function rotSpots() {
    const C1 = rig.C1, C2 = rig.C2, pts = [[C2.x + 1, C2.y + 1], [C2.x + 2, C2.y + 2], [C1.x - 1, C1.y + 1], [C1.x, C1.y + 2], [C1.x + 1, C1.y + 1]];
    for (const [x, y] of pts) U.dot(E, x, y, M.rot, 2);
  }
  // 候选部件：tornEar —— 剩下的那只耳朵：3 格高、顶上被啃掉一角（缺口朝前），另一只只剩一粒结痂（紧跟 Q.head 画，并进头）
  function tornEar() {
    const F = Q.headFrame(rig, o, P.jaw), e = F.at(-F.W * 0.3, -F.Hh + 0.2), x = R(e[0]), y = R(e[1]), pin = P.ear | 0;
    U.dot(E, x - 1, y - 1, M.ear, 2); U.dot(E, x, y - 1, M.ear, 3); U.dot(E, x - 1 - pin, y - 2, M.ear, 3); U.dot(E, x - pin, y - 2, M.ear, 4);
    U.dot(E, x - 2 - pin, y - 3, M.ear, 3);                                     // 只剩后半边的耳尖（前半边被啃掉）
    const s = F.at(F.W * 0.25, -F.Hh + 0.2); U.dot(E, s[0], s[1], M.wound, 2);   // 另一只耳朵的痂
  }
  // 候选部件：baldTail —— 秃尾巴：根部 2 格粗，往后垂到地上拖着，尾尖往上翘一点；返回尾尖
  let tipX = 0, tipY = 0;
  function baldTail() {
    E.part();
    const t0 = rig.tail, sw = (P.tail | 0) * 0.1; let x = t0.x, y = t0.y + 1, a = -0.55 + sw;
    for (let k = 0; k < 11; k++) {
      U.dot(E, x, y, M.tail, k < 4 ? 3 : 2); if (k < 3) U.dot(E, x, y + 1, M.tail, 2);
      a += k < 5 ? 0.02 : -0.06 - sw * 0.3; x -= Math.cos(a); y -= Math.sin(a); if (y > -1) y = -1;
    }
    tipX = x; tipY = y;
  }
  // 苍蝇：绕着尾巴上方飞（8 个相位的椭圆），2 格黑身 + 1 格翅膀
  const FLY = [[0, -3], [2, -3], [3, -2], [2, -1], [0, -1], [-2, -1], [-3, -2], [-2, -3]];
  function fly() {
    if (P.fp >= 8) return; E.part();
    const q = FLY[P.fp], x = R(tipX + 3 + q[0] * 1.3), y = R(tipY - 4 + q[1] * 1.2);
    U.dot(E, x, y, M.fly, 0); U.dot(E, x + (q[0] >= 0 && P.fp < 4 ? 1 : -1), y, M.fly, 0); U.dot(E, x, y - 1, M.wing, 0);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieNow = P.lie;
    Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1);
    baldTail();
    Q.body(E, rig, P, o); rotSpots();
    if (!lieNow) ribHole(R(rig.C2.x + rig.C2.r * 0.75), 3, 2, 3); else ribHole(R(rig.C2.x + rig.C2.r * 0.75), 3, 2, 2);
    Q.leg(E, rig, P, o, 2); Q.leg(E, rig, P, o, 3);
    Q.head(E, rig, P, o); tornEar();
    if (!P.drop) { const a = shellAnchor(rig); drawShell(a[0] + P.shx, a[1] + P.shy, 0); }
    else {                                                                    // 壳滑落：侧翻飞出 → 翻倒在身后，像一只碗（壳顶贴地）
      const ax = dropA[0] + P.dsx, ay = P.drop === 2 ? -SH_H : P.rr === 1 ? -SH_U1 - 5 - P.dsy : -SH_H - 1 - P.dsy;
      drawShell(ax, ay, P.drop === 2 ? 2 : P.rr);
    }
    fly();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  { poseAt(DEATH, INCOMING + 0.45, 0); dropA = shellAnchor(rig); reset(); o = SHAPES[0]; rig = Q.rig(P, o); }

  // ───── 特效 ─────
  let chargeAcc = 0, oozeAcc = 0, soulAcc = 0, lastGf = -9, ramT = 9, deadT = 9, dustAcc = 0;
  const crackScr = (i) => { const a = shellAnchor(rig), c = CRACK[i]; return [scrX(a[0] + c[0] + P.shx + P.bx), HY + a[1] + c[1] + P.shy]; };
  // 候选部件（特效）：dustPuff —— 自绘的尘团（fx.cloud 只用色阶的暗三级，灰褐尘在夜空里看不见；这里用亮三级 + 抖动散开 + 漂移 / 下沉）
  const PFN = 10, pfT = new Float32Array(PFN).fill(9), pfL = new Float32Array(PFN), pfX = new Float32Array(PFN), pfY = new Float32Array(PFN), pfVX = new Float32Array(PFN), pfVY = new Float32Array(PFN), pfR0 = new Float32Array(PFN), pfR1 = new Float32Array(PFN), pfS = new Uint8Array(PFN);
  function puff(x, y, r0, r1, life, vx, vy, sink) {
    let k = 0; for (let i = 0; i < PFN; i++) if (pfT[i] >= pfL[i]) { k = i; break; } else if (pfT[i] / pfL[i] > pfT[k] / pfL[k]) k = i;
    pfT[k] = 0; pfL[k] = life; pfX[k] = x; pfY[k] = y; pfR0[k] = r0; pfR1[k] = r1; pfVX[k] = (P.flip ? -1 : 1) * vx; pfVY[k] = vy; pfS[k] = sink ? 1 : 0;
  }
  const PUFF_X = [HX + 8, HX + 14, DUMMY_X - 12, DUMMY_X - 4];
  function onEnter(s) {
    if (s === CAST) {                                                          // 背壳一抖：两道裂缝同时喷出腐尘
      poseAt(CAST, 0, E.simT);
      for (let i = 0; i < 2; i++) { const [x, y] = crackScr(i); puff(x + 1, y - 3, 3, 6, 0.6, 30, -10); burst(x, y, 10, 30, 70, 0.3, 0.6, R_EL, 18); }
      releaseOrbit(30, 70, 0.3, 0.6, { pts: 1 }); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                        // 壳顶撞上：撞击火花 + 碎壳屑
      ramT = 0; const x = DUMMY_X - 5, y = HY - 9;
      burst(x, y, 10, 40, 90, 0.12, 0.3, FXI.impact, 8); burst(x, y + 1, 6, 20, 50, 0.2, 0.4, R_EL, 6);
      for (let i = 0; i < 3; i++) spawnX(K_PHYS, x - 2, y - 2, -10 - Math.random() * 20, -30 - Math.random() * 20, 0.6, FXI.earth, { g: 180, floor: HY });   // 壳屑
      hitDummy(0, 1); sfx('swing', { kind: 'smash', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST) {
      const i = T_PUFF.indexOf(t);
      if (i >= 0) { const x = PUFF_X[i], y = HY - 8 - (i & 1); puff(x, y, 4 + i, 7 + i, 0.8, 26 - i * 5, -3); for (let k = 0; k < 6; k++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY - 2, 20 + Math.random() * 30, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL); }
      if (t === T_ENGULF) {                                                    // 尘团罩住目标：减速，尘粒慢慢沉下去
        puff(DUMMY_X, HY - 13, 8, 11, 1.4, 0, 0, 1); burst(DUMMY_X, HY - 12, 20, 30, 80, 0.4, 0.8, R_EL, 4); ring(DUMMY_X, HY - 10, 0, R_EL);
        hitDummy(1, 1); dummyFx({ dur: 1.6, tint: 'dust', slow: 0.3 }); shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.3 });
        for (let k = 0; k < 16; k++) spawnX(K_PHYS, DUMMY_X - 8 + Math.random() * 16, HY - 24 + Math.random() * 14, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, 1.2 + Math.random() * 0.6, R_EL, { g: 6, floor: HY, dragX: 0.5 });
      }
    }
    if (s === DEATH && t === T_SLUMP) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 8 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && t === T_SHLAND) { const x = scrX(dropA[0] - 15); burst(x, HY - 2, 6, 20, 50, 0.15, 0.3, FXI.dust, 8); shake(0.08, 1); }
    if (s === DEATH && t === T_BREAK) {                                        // 散架：骨头、腿、壳各自散开
      poseAt(DEATH, T_BREAK - 1 / 24, E.simT); P.dq = 0; P.fp = 8; P.flash = 0; B.key(P, SPEC); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.8, push: 0, fromX: 1, fromY: -1, fadeAt: 1.1, fadeDur: 0.6, ramp: 'dust' });
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -5 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
      puff(HX, HY - 5, 3, 6, 0.8, 0, -4); shake(0.1, 1); deadT = 0;
    }
  }
  const EVENTS = [[], [], [T_HIT], [], T_PUFF.concat([T_ENGULF]), [], [], [T_SLUMP, T_SHLAND, T_BREAK], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                    // 腐尘往裂缝里吸、再从裂缝里渗出来往上冒
      const q = clamp01(stT / DUR[CHARGE]); chargeAcc += dt * (6 + 12 * q);
      while (chargeAcc >= 1) { chargeAcc -= 1; const [x, y] = crackScr(Math.random() < 0.5 ? 0 : 1), a = Math.random() * 6.2832, r = 9 + Math.random() * 6; spawnX(K_SPIRAL_PT, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, (r - 3.5) / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { tx: x, ty: y, a, r, w: 3 }); }
      oozeAcc += dt * (4 + 16 * q); while (oozeAcc >= 1) { oozeAcc -= 1; const [x, y] = crackScr(Math.random() < 0.5 ? 0 : 1); spawn(K_RISE, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === CAST || (state === RECOVER && stT < 0.35)) { oozeAcc += dt * 18; while (oozeAcc >= 1) { oozeAcc -= 1; const [x, y] = crackScr(Math.random() < 0.5 ? 0 : 1); spawn(K_DUST, x, y, 20 + Math.random() * 40, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.gf !== lastGf) {                                  // 落脚：壳拖在身后蹭起一两粒灰
      if (P.gf === 0 || P.gf === 2) { sfx('step', { w: 0.3 }); const x = scrX(R(rig.C2.x - rig.C2.r - 1)); for (let i = 0; i < 2; i++) spawn(K_DUST, x, HY - 1, (P.flip ? 1 : -1) * (-6 - Math.random() * 8), -3 - Math.random() * 4, 0.25 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.0 && stT < INCOMING + 2.2) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 28, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 12, 0.8 + Math.random() * 0.6, Math.random() < 0.6 ? FXI.soul : R_EL); } }
    if (state === IDLE && P.scr) { dustAcc += dt * 6; while (dustAcc >= 1) { dustAcc -= 1; spawn(K_BURST, scrX(R(rig.C2.x + 2)), HY + R(rig.C2.y), (Math.random() - 0.5) * 20, -10 - Math.random() * 10, 0.2, R_EL); } }   // 挠下来的皮屑
    ramT += dt; deadT += dt;
    for (let i = 0; i < PFN; i++) if (pfT[i] < pfL[i]) { pfT[i] += dt; pfX[i] += pfVX[i] * dt; pfY[i] += (pfS[i] ? (pfT[i] > pfL[i] * 0.4 ? 5 : 0) : pfVY[i]) * dt; }
  }
  function fxReset() { pfT.fill(9); chargeAcc = 0; oozeAcc = 0; soulAcc = 0; lastGf = -9; ramT = 9; deadT = 9; dustAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    for (let i = 0; i < PFN; i++) {                                            // 腐尘团：中心奶油白 → 暖灰 → 石灰，外沿按抖动散开，老了整团变暗、从下往上漏空
      if (pfT[i] >= pfL[i]) continue; const q = pfT[i] / pfL[i], r = pfR0[i] + (pfR1[i] - pfR0[i]) * ease.out(Math.min(1, q * 2)), cx = pfX[i], cy = pfY[i], n = Math.ceil(r);
      for (let j = -n; j <= n; j++) for (let k = -n - 2; k <= n + 2; k++) {
        const d = Math.hypot(k / 1.25, j) / r; if (d > 1) continue;
        const wob = Math.sin(k * 1.7 + j * 2.3 + pfT[i] * 5) * 0.12; if (d + wob > 0.95) continue;
        if (E.bayer(k + 64, j + 64) < q * 0.9 + (d > 0.7 ? 0.25 : 0)) continue;
        const lv = Math.min(4, (d < 0.35 ? 0 : d < 0.7 ? 1 : 2) + (q > 0.55 ? 1 : 0) + (q > 0.8 ? 1 : 0));
        put(R(cx + k), R(cy + j), EL[lv]);
      }
    }
    if (ramT < 2 / 12) {                                                       // 冲撞拖影：壳后面三道横向尘线
      const c = ramT < 1 / 12 ? EL[1] : EL[3], x1 = scrX(R(rig.C2.x - 4) + P.bx), y0 = HY - 13;
      for (let j = 0; j < 3; j++) for (let k = 0; k < 8 - j * 2; k++) { if (ramT >= 1 / 12 && ((k + f12) & 1)) continue; put(x1 - k - j, y0 + j * 3, c); }
    }
    if (deadT < 1.7) {                                                         // 苍蝇还围着残骸转
      const q = FLY[(f12 >> 1) & 7], x = R(HX - 4 + q[0] * 2.2), y = R(HY - 8 + q[1] * 1.6);
      put(x, y, 0); put(x + 1, y, 0); put(x, y - 1, 60);
    }
  }

  return {
    name: '腐尸鼠', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'parts', at: T_BREAK },
    REVIVE: { dy: -8, ramp: 'dust' },
    SFX: { body: 'beast', how: 'collapse', pal: 'earth', style: 'poison', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
