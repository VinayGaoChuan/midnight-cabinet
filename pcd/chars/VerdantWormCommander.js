// 翠蠕虫统领（敌人 · 混沌 · 普通 · 近战 240）：「使用尖锐的尾刺刺穿敌人。」没有特性。
// 细长轻快的翠绿蝎：身体窄、腿长，一条比身体还长一半的 9 节长尾从背后低弧卷过背，尾尖一颗翠绿发光毒囊 + 平伸在头顶上方的骨白钩刺；
// 一对细小的螯高举在头前；第二节尾节上缠着一条破旗布（统领的标记），尾巴一动布条就飘。和同族翠蠕虫王（宽重巨蝎、靠巨螯）拉开：王靠螯，它靠尾。
// 攻击 = 尾巴从背后越过头顶向前一戳；技能「毒尾连刺」= 尾巴后拉到最远、毒囊逐帧变亮、翠绿光点沿尾节流向尾尖 → 三连快刺（第三刺最深）→ 目标身上三个翠绿针孔 + 染绿。
// 移动 = 快速爬行，尾巴高举不动、多足交替；死亡 = 尾刺连毒囊折断弹飞，腿摊开，身体瘫平，断尾软垂在地上。
// 身体用 parts-beast 的 bug（蝎：小螯、腿在身体后），长尾 + 毒囊 + 钩刺、破旗布自画。
PCD.define('VerdantWormCommander', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, defMat, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_EMBER,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 元素：翠毒 · 翠绿（nature：白 → 淡黄绿 → 亮绿 → 绿 → 深绿）─────
  const R_EL = FXI.nature, EL = FXR[R_EL];

  // ───── 材质 ─────
  // 甲壳翠绿（green），腿比身体暗一级（moss）拉开细长的腿；螯尖、尾刺骨白；旗布 crimson；毒囊平涂发光
  const m = B.mats(E, { main: 'green', limb: [34, 36, 37, 38], claw: 'bone', shell: [34, 36, 37, 38], eye: [0, 0, 0, 0], glow: [35, 37, 38, 21] });
  const M = {
    seg: defMat('green', 1), segD: defMat([34, 34, 35, 36], 1),         // 尾节（亮 / 暗相间，节缝暗）
    sac: defMat([35, 37, 38, 21], 1, 1),                               // 毒囊（发光体，平涂：tone 2 基 · 3 亮 · 4 白）
    sting: defMat('bone', 1),                                          // 钩刺
    rag: defMat('crimson', 1),                                         // 破旗布
    spec: defMat([21, 21, 21, 21], 1, 1),
  };
  const o = G.shape({ n: 4, rx: 3.5, ry: 2, under: 4, abd: { rx: 5, ry: 2.3, dx: -6.5, dy: 0 }, head: null, span: 9, knee: -0.5, farDx: 2, stride: 2, lift: 2, lw: 1,
    fan: 0.3, kneeOut: 0.45, claws: { len: 4, size: 2 }, tail: null, eyes: 2, stalks: 0, fangs: 0, mark: 'bands', hair: 0, legsFront: 0, m });

  const HX = 74, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 50, 58, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, m.spec, m.claw, m.glow, M.sac, M.sting, M.rag, M.spec]) RIM.skip[k] = 1;

  // 本角色的姿势字段：ta 尾根角 ×20（π/2 = 竖直，更大 = 往后）· tc 每节弯曲 ×100（+ 往前卷）· sw 尾尖摆 -2..2（节拍器）
  //   gem 毒囊档 0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭 · rag 旗布 -1 垂 / 0 飘 / 1 反飘 / 2 往前甩 · brk 尾刺折断
  const EXTRA = [['ta', 16, 70], ['tc', -20, 45], ['sw', -2, 2], ['gem', 0, 4], ['rag', -1, 2], ['brk', 0, 1]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  const REST = { ta: 2.1, tc: 0.36, claw: 3, crouch: 0, pitch: 0, bx: 0 };
  function reset() { G.reset(P); P.ta = R(REST.ta * 20); P.tc = R(REST.tc * 100); P.sw = 0; P.gem = 0; P.rag = 0; P.brk = 0; P.claw = 3; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [R(rig.hit[0]), R(rig.hit[1])];

  // ───── 长尾几何：9 节，每节 2.1 格（尾节 19 格 + 毒囊钩刺 8 格，比身体 15 格长一半多），从腹末往后上、再往前卷成低弧，刺尖悬在头顶上方；
  //   节拍器 sw：整条尾巴绕尾根前后摆 ±0.06 弧度（尖端也多弯 / 少弯一点）─────
  const NS = 9, SEG = 2.1, TX = new Float32Array(NS + 1), TY = new Float32Array(NS + 1);
  let tA = 0, sacX = 0, sacY = 0, tipX = 0, tipY = 0;
  function tailGeom(rg) {
    const A = rg.A, bx0 = A.x - A.rx * 0.6, by0 = A.y - A.ry * 0.3;      // 尾根长在腹末背上，不往身后多伸
    let a = P.ta / 20 - P.sw * 0.03, x = bx0, y = by0; const c = P.tc / 100;
    TX[0] = x; TY[0] = y;
    for (let k = 1; k <= NS; k++) { x += Math.cos(a) * SEG; y -= Math.sin(a) * SEG; if (y > -1) y = -1; TX[k] = x; TY[k] = y; a -= k >= NS - 3 ? c * 0.3 + P.sw * 0.02 : c; }   // 尖端 3 节少弯：刺尖朝前下，不扎回自己头上
    tA = a; const dx = Math.cos(a), dy = -Math.sin(a);
    sacX = x + dx * 2; sacY = Math.min(-2, y + dy * 2);
    const hx = sacX + dx * 5, hy = sacY + dy * 5, ha = a - 0.9;          // 钩刺：沿尾向伸 4 格（囊外），再往里弯
    tipX = hx + Math.cos(ha) * 1.5; tipY = Math.min(-1, hy - Math.sin(ha) * 1.5);
  }

  // ───── 姿势 ─────
  const F_ALL = ['ta', 'tc', 'claw', 'crouch', 'pitch', 'bx'];
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ ta: 2.2, tc: 0.3, claw: 3, crouch: 1, bx: -1 });
  const A_STAB = pose({ ta: 1.1, tc: 0.15, claw: 1, pitch: 1, bx: 3 });
  const A_HOLD = pose({ ta: 1.2, tc: 0.16, claw: 1, bx: 3 });
  const K_CHG = pose({ ta: 2.45, tc: 0.28, claw: 3, crouch: 1, bx: -1 });
  const K_BACK = pose({ ta: 1.95, tc: 0.28, claw: 2, bx: 1 });            // 连刺之间收尾
  const K_STAB3 = pose({ ta: 0.95, tc: 0.12, claw: 1, pitch: 1, bx: 5 });   // 第三刺最深
  const tmp = {};
  const apply = (src) => { P.ta = R(src.ta * 20); P.tc = R(src.tc * 100); P.claw = R(src.claw); P.crouch = R(src.crouch); P.pitch = R(src.pitch); P.bx = R(src.bx); };
  const mixP = (A, Bp, q) => { E.mix(tmp, A, Bp, q, F_ALL); apply(tmp); };
  const METRO = [0, 1, 2, 1, 0, -1, -2, -1];
  const T_STAB = 2 / 12, T_S2 = 2 / 12, T_S3 = 4 / 12, T_BREAK = INCOMING + 0.3, T_LAND = INCOMING + 0.66, T_DUST = INCOMING + 0.68;

  function idle(tq, f12) {
    apply(REST); G.anim.idle(P, tq, f12, DUR[IDLE]); P.glow = 0;
    const lp = tq % DUR[IDLE], k = Math.floor(lp / 0.3 + 1e-6) & 7;       // 待机个性：尾刺像节拍器一样左右慢摆（每 0.3 s 一档），摆到两头时毒囊闪一下
    P.sw = METRO[k]; P.rag = P.sw > 0 ? 1 : 0; if (Math.abs(P.sw) === 2) P.gem = 1;
  }
  function deathPose(d, f12) {
    P.glow = 0;
    if (d < 0.3) { apply(pose({ ta: 2.6, tc: 0.33, claw: 3, crouch: 2, pitch: 2, bx: -2 })); P.flash = d < 1 / 12 ? 1 : 0; P.rag = 2; P.gem = (f12 & 1) ? 1 : 0; return; }
    P.brk = 1; P.rag = -1;
    const dp = B.dropAt(d, { at: 0.3, dur: 0.36, dx: 16, hop: 9 }); P.drop = dp[0]; P.dsx = dp[1]; P.dsy = dp[2];
    P.gem = d < 0.66 ? 3 : d < 0.9 ? ((f12 & 1) ? 2 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
    if (d < 0.5) { apply(pose({ ta: 2.5, tc: 0.12, claw: 1, crouch: 3, bx: -3 })); }
    else { apply(pose({ ta: 2.75, tc: -0.08, claw: 0, bx: -3 })); P.lie = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { apply(REST); G.anim.walk(P, tq); P.rag = P.gf & 1 ? 1 : 0; P.claw = 3; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.12) { mixP(REST, A_WIND, ease.out(tq / 0.12)); P.gem = 1; P.rag = 1; }
      else if (tq < T_STAB - 1e-6) { mixP(A_WIND, A_WIND, 0); P.gem = 1; P.rag = 1; }
      else if (tq < 0.25) { mixP(A_STAB, A_STAB, 0); P.gem = 2; P.rim = 1; P.rag = 0; }
      else if (tq < 0.45) { mixP(A_STAB, A_HOLD, ease.out((tq - 0.25) / 0.2)); P.gem = 1; }
      else { mixP(A_HOLD, REST, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.rag = 1; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixP(REST, K_CHG, q); P.rim = 2; P.rag = (f12 >> 1) & 1;
      P.gem = tq < 0.45 ? 1 : tq < 1.0 ? ((f12 & 1) ? 2 : 1) : 2;          // 毒囊逐帧从 1 档亮到 2 档
      if (tq > 1.1) P.sw = (f12 & 1) ? 1 : -1;                              // 蓄满：尾尖颤
    } else if (st === CAST) {                                               // 三连快刺：刺 → 收 → 刺 → 收 → 深刺定格
      const k = Math.floor(tq * 12 + 1e-6);
      if (k === 0) mixP(A_STAB, A_STAB, 0); else if (k === 1 || k === 3) mixP(K_BACK, K_BACK, 0); else if (k === 2) mixP(pose({ ta: 1.05, tc: 0.14, claw: 1, pitch: 1, bx: 4 }), REST, 0); else mixP(K_STAB3, K_STAB3, 0);
      P.gem = k === 1 || k === 3 ? 2 : 3; P.rim = 3; P.rag = k & 1 ? 1 : 0;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixP(K_STAB3, REST, q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.rag = (f12 >> 1) & 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { apply(pose({ ta: 2.45, tc: 0.34, claw: 3, crouch: 1, pitch: 1, bx: -2 })); P.flash = h < 1 / 12 ? 1 : 0; P.rag = 2; }
      else if (h < 0.35) { apply(pose({ ta: 2.25, tc: 0.3, claw: 2, bx: -1 })); P.rag = 1; }
      else { mixP(pose({ ta: 2.25, tc: 0.3, claw: 2, bx: -1 }), REST, ease.inOut(clamp01((h - 0.35) / 0.15))); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12); else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o); liftClaws(rig); tailGeom(rig);
    if (P.drop) { P.gx = R(sacDropX()) + P.bx; P.gy = R(sacDropY()); } else { P.gx = R(sacX) + P.bx; P.gy = R(sacY); }
    B.key(P, SPEC);
  }
  // 小螯举高：钳掌往前 2、往上 2 格；肘往前 2、往下 1 格（臂先往前平伸再折上去），
  //   和前腿的足尖在剪影里分开，也给头顶上悬着的尾刺让出位置（倒地时不举）
  function liftClaws(rg) { const c = rg.claw; if (!c || P.lie) return; c.E = [c.E[0] + 2, c.E[1] + 1]; c.H = [c.H[0] + 2, c.H[1] - 2]; }
  // 折断的尾刺：从断口（第 7 节）起飞，落地后平躺
  const BRK = 7;
  let BRK_X = 0, BRK_Y = 0;                                                  // 断口位置取折断那一刻（死亡 0.3 s 的姿势）
  const sacDropX = () => BRK_X + P.dsx;
  const sacDropY = () => (P.drop === 2 ? -2 : BRK_Y - P.dsy);

  // ───── 画 ─────
  // 候选部件：segTail —— 分节长蝎尾：每节一个圆（根粗 1.6 → 尖 0.9），节与节之间一道暗缝、背侧一格高光，亮 / 暗节相间；n = 画到第几节
  function segTail(n) {
    for (let k = 0; k < n; k++) {
      const r = 1.4 - 0.55 * k / (NS - 1), mat = (k & 1) ? M.segD : M.seg;
      U.taper(E, TX[k], TY[k], TX[k + 1], TY[k + 1], r, r * 0.95, mat, 0);
      const mx = (TX[k] + TX[k + 1]) / 2, my = (TY[k] + TY[k + 1]) / 2;
      U.dot(E, mx, my - r * 0.6, mat, 4);                                    // 背侧高光
    }
    for (let k = 1; k < n; k++) U.dot(E, TX[k], TY[k], M.segD, 1);           // 节缝
  }
  // 候选部件：venomSting —— 毒囊（半径 2 的圆囊，发光体，5 档；高光是囊左上角外沿一道 2 格斜光，不放在囊中间，免得读成眼睛）
  //   + 骨白钩刺（从囊外沿尾向伸 4 格，刺根 2 格粗，再往里勾 2 格）；a = 尾向角
  const SAC_T = [[2, 2], [3, 2], [3, 3], [4, 3], [1, 1]];                  // [芯, 外] 的 tone
  function venomSting(x, y, a, lv) {
    const dx = Math.cos(a), dy = -Math.sin(a), T = SAC_T[lv], hl = lv === 4 ? 2 : lv >= 2 ? 4 : 3;
    U.disc(E, x, y, 2, M.sac, T[1]); U.dot(E, x, y, M.sac, T[0]); U.dot(E, x + dx, y + dy, M.sac, T[0]);
    U.dot(E, x - 1, y - 1, M.sac, hl); U.dot(E, x - 2, y, M.sac, lv === 4 ? 2 : 3); U.dot(E, x, y - 2, M.sac, lv === 4 ? 2 : 3);   // 左上外沿斜光
    for (let k = 3; k <= 6; k++) U.dot(E, x + dx * k, y + dy * k, M.sting, k >= 5 ? 4 : 3);
    const px = Math.cos(a + 1.57), py = -Math.sin(a + 1.57);
    U.dot(E, x + dx * 3 + px, y + dy * 3 + py, M.sting, 2); U.dot(E, x + dx * 4 + px * 0.6, y + dy * 4 + py * 0.6, M.sting, 2);   // 刺根加粗
    const hx = x + dx * 6, hy = y + dy * 6, ha = a - 0.9;
    U.dot(E, hx + Math.cos(ha), hy - Math.sin(ha), M.sting, 4); U.dot(E, hx + Math.cos(ha) * 2, hy - Math.sin(ha) * 2, M.sting, 3);
  }
  // 候选部件：tornBanner —— 缠在尾节上的破旗布：一圈缠布 + 往后飘的两行布条（长 4 / 3，上行有一个破洞，布尾参差），随 rag 摆
  function tornBanner(k) {
    const mx = (TX[k] + TX[k + 1]) / 2, my = (TY[k] + TY[k + 1]) / 2, rg = P.rag;
    U.disc(E, mx, my, 1.2, M.rag, 0); U.dot(E, mx - 1, my - 1, M.rag, 4);
    const L = [4, 3], dir = rg === 2 ? 1 : -1;
    for (let j = 0; j < 2; j++) for (let i = 1; i <= L[j]; i++) {
      if (j === 0 && i === 3) continue;                                         // 破洞
      const wave = rg === -1 ? i * 0.7 : rg === 2 ? -i * 0.6 : R(Math.sin(i * 1.1 + (rg === 1 ? Math.PI : 0)) * 0.8) + i * 0.2;
      U.dot(E, mx + dir * (i - 1 + j), my - 1 + j + wave, M.rag, j === 0 ? (i === L[j] ? 3 : 4) : 2);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    G.claw(E, rig, P, o, 1);
    G.legs(E, rig, P, o, 1); G.legs(E, rig, P, o, 0);
    G.body(E, rig, P, o);
    E.part(); segTail(P.brk ? BRK : NS);
    if (!P.brk) venomSting(sacX, sacY, tA, P.gem);
    else { U.dot(E, TX[BRK], TY[BRK], M.sting, 2); U.dot(E, TX[BRK] + 1, TY[BRK] - 1, M.seg, 1); }   // 断口
    E.part(); tornBanner(1);
    G.claw(E, rig, P, o, 0);
    if (P.brk && P.drop) { E.part(); venomSting(sacDropX(), sacDropY(), P.drop === 2 ? 0 : 0.8 + P.dsx * 0.25, P.gem); }   // 飞出去的尾刺（落地平躺）
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, pinT = [9, 9, 9], trT = 9, trX = 0, trY = 0, trBig = 0, emberAcc = 0;
  const PINS = [[DUMMY_X - 3, HY - 22], [DUMMY_X - 4, HY - 16], [DUMMY_X - 3, HY - 10]];
  const tipScr = () => [scrX(R(tipX) + P.bx), HY + R(tipY)];
  function stab(i) {                                                           // 连刺一下：细斩击弧 + 十字星芒 + 针孔
    const [x, y] = tipScr(), deep = i === 2, px = PINS[i][0], py = PINS[i][1];
    fx.slash(px - 7, py + 3, 7, 0.15, 1.75, R_EL, 0.2, 1, 2);
    fx.cross(px, py, deep ? 7 : 4, R_EL, deep ? 0.3 : 0.2, 2);
    burst(px, py, deep ? 16 : 6, 30, deep ? 110 : 70, 0.15, deep ? 0.45 : 0.3, R_EL, 6);
    pinT[i] = 0; hitDummy(deep ? 1 : 0, 1);
    if (deep) { burst(px, py, 12, 40, 90, 0.2, 0.4, FXI.impact, 8); ring(px, py, 0, R_EL); dummyFx({ dur: 0.8, tint: R_EL }); shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.5 }); }
    else sfx('impact', { pal: 'poison', w: 0.25 });
    trT = 0; trX = x; trY = y; trBig = deep ? 1 : 0;
  }
  function onEnter(s) {
    if (s === CHARGE) pinT = [9, 9, 9];
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(40, 90, 0.25, 0.5, { to: [PINS[0][0], PINS[0][1], 4] }); burst(gx, gy, 14, 40, 90, 0.2, 0.4, R_EL, 6);
      shake(0.28, 2); flash(0.05); stab(0);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STAB) {
      const [x, y] = tipScr(); trT = 0; trX = x; trY = y; trBig = 0;
      burst(x + 1, y, 10, 40, 90, 0.12, 0.3, FXI.impact, 8); burst(x, y, 5, 20, 60, 0.15, 0.35, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'thrust', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === CAST && t === T_S2) stab(1);
    if (s === CAST && t === T_S3) stab(2);
    if (s === DEATH && t === T_BREAK) {                                         // 尾刺折断：断口溅出翠绿汁
      const x = scrX(R(TX[BRK]) + P.bx), y = HY + R(TY[BRK]);
      burst(x, y, 10, 30, 80, 0.2, 0.45, R_EL, 10); burst(x, y, 6, 30, 70, 0.15, 0.3, FXI.impact, 6); sfx('hit', { mat: 'stone', w: 0.3 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 18 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === T_DUST) { const x = scrX(R(sacDropX())), y = HY - 1; for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust); }
  }
  poseAt(DEATH, T_BREAK + 0.01, 0); BRK_X = TX[BRK]; BRK_Y = TY[BRK]; reset();
  const EVENTS = [[], [], [T_STAB], [], [T_S2, T_S3], [], [], [T_BREAK, T_LAND, T_DUST], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 6 : -6), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); sfx('step', { w: 0.25 }); } lastGf = P.gf; }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL); } }   // 毒囊余汽
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    for (let i = 0; i < 3; i++) pinT[i] += dt; trT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; pinT = [9, 9, 9]; trT = 9; emberAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (st === CHARGE && t > 0.2 && !P.brk) {                                   // 翠绿光点沿尾节从尾根流向尾尖（3 颗，逐帧前移）
      for (let j = 0; j < 3; j++) {
        const u = ((f12 * 0.09 + j / 3) % 1) * NS, k = Math.floor(u), q = u - k;
        const x = scrX(R(TX[k] + (TX[k + 1] - TX[k]) * q) + P.bx), y = HY + R(TY[k] + (TY[k + 1] - TY[k]) * q) - 1;
        put(x, y, u > NS * 0.7 ? EL[0] : EL[1]); put(x, y - 1, EL[2]);
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.brk && P.dq < 1) {                       // 蓄满 / 施放：毒囊十字星芒
      const gx = scrX(P.gx), gy = HY + P.gy, L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (trT < 2 / 12) {                                                         // 出刺拖影：从头顶上方弧到刺尖（2 帧，亮 → 暗断续）
      const c = trT < 1 / 12 ? EL[trBig ? 0 : 1] : EL[2], r = 9;
      for (let k = 0; k <= 10; k++) { if (trT >= 1 / 12 && (k & 1)) continue; const a = -0.2 + k * 0.16; put(R(trX - 8 + Math.sin(a) * r), R(trY + 1 - Math.cos(a) * r * 0.8), c); }
      put(trX + 1, trY, EL[0]); put(trX + 2, trY, EL[1]);
    }
    for (let i = 0; i < 3; i++) {                                               // 针孔：翠绿小星芒，停留后闪烁变暗
      const pt = pinT[i]; if (pt > 1.25) continue; if (pt > 0.9 && ((f12 + i) & 1)) continue;
      const [x, y] = PINS[i], c0 = pt < 0.1 ? EL[0] : pt < 0.6 ? EL[1] : EL[3], c1 = pt < 0.6 ? EL[2] : EL[4];
      put(x, y, c0); put(x - 1, y, c1); put(x + 1, y, c1); put(x, y - 1, c1); put(x, y + 1, c1);
      if (pt < 0.3) { put(x - 2, y, c1); put(x + 2, y, c1); }
    }
  }

  return {
    name: '翠蠕虫统领', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.sac], HIT_POINT, EVENTS,
    REVIVE: { dy: -8, ramp: 'nature' },
    SFX: { body: 'armor', how: 'collapse', pal: 'poison', style: 'poison', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
