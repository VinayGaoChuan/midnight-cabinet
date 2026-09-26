// 火猪（部队 · 恶魔 · 召唤师 · 普通 · 近战 240；desc「能使用黄金在下一波中装备手里剑强化其攻击」；特性「装备手里剑」：开战时放出自爆步兵）：
//   同组最矮最圆的四足——一只焰橙色的圆桶小猪，腿短粗、头大吻短，吻部与蹄焦黑；额头系一条忍者红头巾（额前打结，两条飘带朝后上方翘起），
//   嘴角叼着一枚四角小铁手里剑（上角咬进嘴里，其余三角挂在下巴下，不挡眼和粉鼻盘），尾巴是一根卷成弹簧的导火索，尖端一颗滋滋冒的火星（发光体）；嘴角两颗白色小獠牙。
//   升级成白牙（白獠牙巨野猪）：头巾、导火索尾、手里剑、獠牙都保留下来长大。
// 攻击 = 投：甩头把嘴里的手里剑掷出，手里剑旋转飞到目标；0.5 s 后嘴里又叼上一枚。
// 技能「装备手里剑」：前蹄人立、落下拱地，身后地面开出一圈火药召唤阵，阵里冒出 4 根导火索依次点燃（导火索就是 4 只炸弹小猪的尾巴）→
//   尖叫一声，4 只圆滚滚的炸弹小猪错开 0.08 s 从阵里蹦出、冲向假人 → 4 连小爆，最后一爆假人大摇。
// 死亡：四脚朝天侧翻，手里剑从嘴里掉出弹开，导火索尾一路烧到底，「噗」地冒一小股黑烟。
// 身体用 parts-beast 的 quad（boar 头缩短吻）拼；导火索尾、头巾飘带、口衔手里剑、炸弹小猪是本模块的候选部件。设定卡见 pcd/batch-05/FirePig/design.md。
PCD.define('FirePig', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, shoot, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL];                                                  // 火药 · 火星橙：白 21 → 淡黄 47 → 橙 46 → 红 45 → 深红 44
  const R_SMOKE = fxRamp('firePigSmoke', [7, 10, 9, 8, 0]);                               // 导火索烧尽的一小股黑烟
  const R_HIDE = fxRamp('firePigHide', [47, 46, 45, 44, 20]);                             // 受击飞散的橙色猪鬃
  const ST = FXR[FXI.steel];
  const m = B.mats(E, {
    main: 'fire',                                                                         // 焰橙猪皮 [44, 45, 46, 47]（身体 band 2）
    muz: [0, 20, 44, 45], nose: [0, 11, 63, 58], claw: [0, 0, 20, 44], eye: [0, 0, 0, 21],  // 焦黑吻部、粉鼻盘、焦黑蹄、墨豆眼
    band: 'crimson', bandFar: [11, 12, 12, 13],                                           // 忍者红头巾（远侧飘带暗一级）
    star: [0, 28, 29, 31], fuse: [0, 20, 19, 32],                                         // 铁手里剑、导火索
  });
  m.spark = E.defMat([44, 46, 47, 21], 1, 1);                                             // 尾尖火星（发光体，平涂 5 档）
  m.hole = E.defMat([0, 0, 0, 0], 1, 1);                                                  // 手里剑中心孔
  // 腿：fire 暗一级（近侧 band 1 基色 45，远侧再暗一级），画在躯干后面、只从身体下沿露出来——躯干里不再压腿的弧形分界线
  const mLeg = Object.assign({}, m, { limb: E.defMat([44, 44, 45, 46], 1), far: E.defMat([0, 20, 44, 45], 1) });
  const HEAD = { type: 'boar', w: 7, h: 7, snout: 3, snH: 4.5, tip: 0.95, ear: 'droop', earH: 3, nose: 'disc', tusk: 0, teeth: 0 };
  const SHAPE = { len: 7, chest: 4.7, rump: 4.3, waist: 0, hump: 0.4, leg: 5, lw: 2, thigh: 2.2, farDx: -1.5, stride: 2, lift: 2, foot: 'hoof',
    neck: 1.5, neckA: 0.55, neckW: 3.5, head: HEAD, headA: 0.2, tail: 'none', mane: 'none', fur: 0, m };
  const o = Q.shape(SHAPE), oLeg = Q.shape(Object.assign({}, SHAPE, { m: mLeg }));

  const HX = 60, DUR = DEFAULT_DUR.slice(), hero = new Sprite(72, 44, 34, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['spark', 'fuse', 'eye', 'ink', 'teeth', 'star', 'hole', 'claw']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：shk 嘴里叼着手里剑 0 / 1 · fuse 导火索还剩几节 0–6（死亡时烧短）· gem（quad 自带）= 尾尖火星档 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭
  const SPEC = Q.KEYS.concat(B.COMMON, [['shk', 0, 1], ['fuse', 0, 6]]);
  const P = {};
  function reset() { Q.reset(P); P.shk = 1; P.fuse = 6; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'paw', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, paw: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_REL = 2 / 12, T_NEW = 0.5;                                                      // 甩出手里剑 · 嘴里又叼上一枚
  const A_WIND = pose({ bx: -1, head: -2, pitch: 1, tail: 1, ear: 1 });                   // 仰头蓄甩
  const A_THROW = pose({ bx: 2, head: 2, pitch: -1, reach: 1, jaw: 1, tail: -2 });        // 甩头掷出
  const A_HOLD = pose({ bx: 1, head: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_REL, A_THROW, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_REAR = pose({ bx: -1, pitch: 4, paw: 2, head: -1, jaw: 1, tail: 2, ear: 1 });  // 前蹄人立
  const C_ROOT = pose({ crouch: 1, pitch: -1, head: 3, tail: 1, ear: 1 });                // 落下拱地
  const S_SQUEAL = pose({ bx: -1, pitch: 3, paw: 1, head: -2, jaw: 2, tail: 2, ear: 1 }); // 尖叫：放出小猪
  const S_WATCH = pose({ head: 0, jaw: 1, tail: 1 });
  const T_SLAM = 0.5, FUSE_T = [0.7, 0.85, 1.0, 1.15];                                   // 蓄力：落蹄开阵 · 4 根导火索依次点燃
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.gem = (f12 % 7) === 3 ? 1 : 0;                                                      // 火星偶尔一亮
    if (lp >= 0.5 - 1e-6 && lp < 0.9) { const k = f12of(lp - 0.5); P.tail = [2, -1, 2, -1, 0][k]; P.gem = k < 4 ? 1 + (k & 1) : 0; }   // 导火索尾一抖一抖冒火星
    if (lp >= 1.3 - 1e-6 && lp < 2.1) { const k = f12of(lp - 1.3); P.head = [2, 3, 2, 3, 2, 3, 2, 3, 1, 0][k]; P.jaw = k < 8 ? k & 1 : 0; P.crouch = k > 0 && k < 9 ? 1 : 0; P.bob = 0; }   // 拱鼻嗅地
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                               // 碎步小跑：短腿快倒、身体上下弹
      Q.anim.walk(P, tq); P.gem = (f12 % 5) === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      P.shk = tq < T_REL || tq >= T_NEW ? 1 : 0; P.mane = tq >= T_REL && tq < 0.3 ? 1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.3) { E.mix(tmp, REST, C_REAR, ease.out(tq / 0.3), F_ALL); apply(tmp); }
      else if (tq < 0.42) apply(C_REAR);
      else if (tq < T_SLAM) { E.mix(tmp, C_REAR, C_ROOT, 0.6, F_ALL); apply(tmp); }
      else { apply(C_ROOT); const k = f12of(tq - T_SLAM); P.head = 3 - ((k >> 1) & 1); P.jaw = (k >> 1) & 1; if (tq > 1.1) P.bob = (f12 & 1) ? -1 : 0; }
      P.gem = tq < T_SLAM ? 0 : tq < 0.9 ? 1 : tq < 1.2 ? ((f12 & 1) ? 2 : 1) : 2;
      P.rim = tq < T_SLAM ? 0 : tq < 0.9 ? 1 : 2; P.mane = tq > 1.1 ? ((f12 & 1) ? 1 : -1) : -1;
    } else if (st === CAST) {
      if (tq < 2 / 12) apply(S_SQUEAL); else { E.mix(tmp, S_SQUEAL, S_WATCH, ease.out(clamp01((tq - 2 / 12) / 0.25)), F_ALL); apply(tmp); }
      P.gem = tq < 2 / 12 ? 3 : 2; P.rim = tq < 2 / 12 ? 3 : 2; P.mane = 1;
    } else if (st === RECOVER) {
      E.mix(tmp, S_WATCH, REST, ease.inOut(clamp01(tq / 0.6)), F_ALL); apply(tmp);
      P.gem = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.gem = h < 1 / 12 ? 3 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, { at: 0.5, dur: 0.3, dx: 10, hop: 6 });                  // 四脚朝天侧翻；手里剑从嘴里掉出弹开
        P.shk = P.drop ? 0 : 1;
        P.fuse = d < 0.66 ? 6 : Math.max(0, 6 - Math.floor((d - 0.66) / 0.1 + 1e-6));   // 导火索一路烧到底
        P.gem = d < 1 / 12 ? 3 : P.fuse > 0 ? ((f12 & 1) ? 2 : 1) : 4;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    const sp = sparkAt(rig); P.gx = sp[0] + P.bx; P.gy = sp[1];
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：fuseTail —— 卷成弹簧的导火索尾：从臀后往后上方伸出，1 格粗的线沿中线左右摆成 2 圈半弹簧，尖端一格火星（发光体，5 档）；
  //   n = 还剩几节（死亡时一节节烧短），P.tail 甩动；侧躺时顺着地面往后
  function fusePts(rg, n) {
    const lie = rg.lie === 2, sw = (P.tail | 0) * 0.16, pts = [];
    let a = lie ? 0.15 : 0.75 + sw, x = rg.tail.x - 0.6, y = rg.tail.y;
    for (let k = 0; k <= n + 2; k++) {
      const c = k === 0 ? 0 : Math.sin(k * 1.6) * 1.6;                                      // 弹簧：沿中线左右摆
      pts.push([x + Math.sin(a) * c, Math.min(-1, y - Math.cos(a) * c)]);
      x -= Math.cos(a) * 1.05; y -= Math.sin(a) * 1.05; a += lie ? 0 : 0.06;
      if (y > -1) y = -1;
    }
    return pts;
  }
  function sparkAt(rg) { const p = fusePts(rg, P.fuse); const q = p[p.length - 1]; return [R(q[0]), R(q[1])]; }
  const SPARK_T = [2, 3, 4, 4, 1];
  function fuseTail(rg) {
    E.part();
    const pts = fusePts(rg, P.fuse);
    for (let i = 1; i < pts.length; i++) U.seg(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 1, m.fuse, i === 1 ? 2 : (i & 1) ? 0 : 4);
    if (P.fuse === 0 && P.gem === 4) return;
    const [x, y] = sparkAt(rg), g = P.gem;
    U.dot(E, x, y, m.spark, SPARK_T[g]);
    if (g >= 1 && g <= 3) U.dot(E, x - 1, y - 1, m.spark, g >= 2 ? 3 : 2);
    if (g >= 2 && g <= 3) { U.dot(E, x, y - 1, m.spark, 3); U.dot(E, x - 1, y, m.spark, 2); if (g === 3) { U.dot(E, x, y - 2, m.spark, 2); U.dot(E, x - 2, y, m.spark, 2); } }
  }
  // 候选部件：headbandTails —— 忍者头巾的结和两条飘带：结打在额前，飘带朝后上方翘起 5 / 4 格（伸出头顶轮廓），尖端随 P.mane 摆；侧躺时贴地往后
  function bandTails(rg) {
    E.part();
    const F = Q.headFrame(rg, o, P.jaw), k0 = F.at(F.W * 0.2, -F.Hh - 0.3), lie = rg.lie === 2, sw = P.mane | 0;
    const tails = lie ? [[0.1, 6, m.band], [-0.25, 5, m.bandFar]] : [[0.95, 5, m.band], [0.55, 4, m.bandFar]];
    for (const [a, L, mat] of tails) {
      let x = k0[0], y = k0[1];
      for (let k = 1; k <= L; k++) {
        x -= Math.cos(a); y -= Math.sin(a); const wv = k > 2 ? (((k + sw) & 1) ? 0 : 1) - sw * (k - 2) * 0.5 : 0;
        U.dot(E, x, Math.min(-1, y + wv), mat, k === L ? 4 : ((k & 1) ? 0 : 2));
        if (k === 1) U.dot(E, x, Math.min(-1, y + wv + 1), mat, 2);                        // 飘带根部 2 格宽
      }
    }
  }
  // 头巾（紧跟 Q.head 画进头的部件）：颅顶 2 行一圈红布，后脑一个 2 格的结；嘴角两颗 1 格白獠牙
  function headband(rg) {
    const F = Q.headFrame(rg, o, P.jaw), e = rg.eye;
    Q.scanHead(F, F.W + 1, (x, y, u, v) => {
      if (!F.skull(u, v) || v > -F.Hh + 1.6 || u > F.W * 0.8) return;
      if (y >= R(e[1]) - 1 && y <= R(e[1]) && x >= R(e[0]) - 1 && x <= R(e[0])) return;   // 眼和亮眉露出来
      U.dot(E, x, y, m.band, 0);
    });
    const k = F.at(F.W * 0.2, -F.Hh - 0.3); U.dot(E, k[0], k[1], m.band, 4); U.dot(E, k[0] + 1, k[1], m.band, 2);   // 额前的结
    const vm = F.prof(F.W + 0.5)[2], t1 = F.at(F.W + 0.6, vm - 0.6), t2 = F.at(F.W - 0.5, vm - 0.4);
    U.dot(E, t1[0], t1[1], m.teeth, 4); U.dot(E, t2[0], t2[1], m.teeth, 3);
    const n1 = F.at(F.uT + 0.3, F.vc - 0.5), n2 = F.at(F.uT + 0.3, F.vc + 0.5); U.dot(E, n1[0], n1[1], m.nose, 4); U.dot(E, n2[0], n2[1], m.nose, 3);   // 2 格粉色鼻盘
  }
  // 候选部件：mouthStar —— 四角小手里剑 5×5：3×3 刃心（中心 1 格孔）+ 四个角尖各再伸 1 格（每角 2 格）；spin 0 = 十字 · 1 = 斜叉（飞行 / 掉落时交替）。
  //   口衔时中心在嘴角下沿，画在头之后，但落在吻部、眼眉上的像素不画 → 看起来咬在吻部后面，只有上下角伸出吻外；flat 1 = 平躺在地上的一条
  const STAR_TIP = [[[0, -2, 4], [2, 0, 2], [0, 2, 2], [-2, 0, 4]], [[-2, -2, 4], [2, -2, 4], [2, 2, 2], [-2, 2, 2]]];
  function drawStar(cx, cy, spin, flat, mask) {
    E.part();
    if (flat) { for (let k = -2; k <= 2; k++) U.dot(E, cx + k, cy, m.star, Math.abs(k) === 2 ? 4 : 0); U.dot(E, cx, cy - 1, m.star, 4); U.dot(E, cx, cy, m.hole, 1); return; }
    const put1 = (x, y, mt, t) => { if (!mask || !mask(x, y)) U.dot(E, x, y, mt, t); };
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i || j) put1(cx + i, cy + j, m.star, i + j < 0 ? 4 : i + j > 0 ? 2 : 3);
    for (const [i, j, t] of STAR_TIP[spin]) put1(cx + i, cy + j, m.star, t);
    put1(cx, cy, m.hole, 1);
  }
  function starAt(rg) { const F = Q.headFrame(rg, o, 0), u = F.W * 0.95, c = F.at(u, F.prof(u)[1] + 1.6); return [R(c[0]), R(c[1])]; }   // 嘴角下沿：上角咬进嘴里
  // 口衔手里剑的遮罩：吻部（含张嘴的下颚）、眼和眉上的像素让给头
  function snoutMask(rg) {
    const F = Q.headFrame(rg, o, P.jaw), ca = Math.cos(F.a), sa = Math.sin(F.a), ex = R(rg.eye[0]), ey = R(rg.eye[1]);
    return (x, y) => {
      if (x >= ex - 1 && x <= ex && y >= ey - 1 && y <= ey) return true;
      const dx = x - F.x, dy = y - F.y, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if (!F.inSnout(u) || u < F.W * 0.75 - 0.4) return false;                           // 只让给焦黑的吻部（颊上的一角照常露出）
      const pr = F.prof(u); return v >= pr[0] - 0.45 && v <= pr[1] + F.gap(u) + 0.45;
    };
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    if (!legsLast) { Q.legs(E, rig, P, oLeg, 1); Q.legs(E, rig, P, oLeg, 0); }        // 腿在躯干后面：只露出身体下沿的一截
    fuseTail(rig);
    Q.body(E, rig, P, o);
    bandTails(rig);
    Q.head(E, rig, P, o); headband(rig);
    if (P.shk) { const s = starAt(rig); drawStar(s[0], s[1], 0, 0, snoutMask(rig)); }   // 口衔：咬在嘴角，吻部、眼、粉鼻盘都露在前面
    if (legsLast) { Q.legs(E, rig, P, oLeg, 1); Q.legs(E, rig, P, oLeg, 0); }
    if (P.drop) drawStar(12 + P.dsx, P.drop === 2 ? -1 : -5 - P.dsy, P.drop === 1 ? (P.dsx & 1) : 0, P.drop === 2 ? 1 : 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const CX = HX - 18, CY = HY;                                                            // 火药召唤阵（屏幕坐标，猪身后）
  const OFF = [-6, -2, 2, 6];                                                             // 4 只炸弹小猪（= 4 根导火索）在阵里的位置
  const T_OUT = [0, 0.08, 0.16, 0.24], HOP = 0.08, RUN = 0.16;                            // 施放内：蹦出时刻 · 蹦的时长 · 冲刺时长
  const T_BOOM = T_OUT.map((s) => +(s + HOP + RUN).toFixed(3));                           // 4 连小爆：0.24 / 0.32 / 0.40 / 0.48
  const BOOM_X = [DUMMY_X - 7, DUMMY_X - 4, DUMMY_X - 6, DUMMY_X - 3];
  const T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_PUFF = Math.ceil((INCOMING + 1.3) * 12 - 1e-6) / 12, T_CLINK = Math.ceil((INCOMING + 0.8) * 12 - 1e-6) / 12;
  let chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -9, lastTail = 0;
  const skillT = () => (E.state === CHARGE ? E.stT : E.state === CAST ? DUR[CHARGE] + E.stT : E.state === RECOVER ? DUR[CHARGE] + DUR[CAST] + E.stT : -1);
  function mouthScr() { const s = starAt(rig); return [scrX(s[0] + P.bx), HY + s[1]]; }
  function onEnter(s) {
    if (s === CAST) {                                                                     // 阵心外爆 + 冲击环 + 震屏 2 格 + 天空闪白
      releaseOrbit(30, 80, 0.25, 0.5, { pts: 1 }); burst(CX, CY - 2, 18, 40, 100, 0.2, 0.5, R_EL, 14); ring(CX, CY - 1, 0, R_EL);
      fx.cross(CX, CY - 4, 5, R_EL, 0.25); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                                    // 甩头掷出手里剑
      const [x, y] = mouthScr();
      shoot(0, x + 2, y, 110, DUMMY_X - 4, FXI.steel, 0, { trail: { every: 3, life: [0.06, 0.12], back: [4, 12] }, glow: -1 });
      fx.slash(scrX(R(rig.head.x) + P.bx), HY + R(rig.head.y), 7, 0.4, 2.0, FXI.steel, 2 / 12, 1, 2);
      sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === ATTACK && t === T_NEW) { const [x, y] = mouthScr(); fx.cross(x, y - 1, 2, FXI.steel, 0.12); }
    if (s === CHARGE && t === T_SLAM) {                                                   // 前蹄砸地：开阵
      fx.circle(CX, CY, 9, 2.5, R_EL, DUR[CHARGE] - T_SLAM + DUR[CAST] + 0.35, 0.35, 0);
      for (let i = 0; i < 5; i++) spawn(K_DUST, scrX(10) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
      burst(CX, CY - 1, 8, 20, 50, 0.2, 0.4, R_EL, 8); sfx('step', { w: 0.4 });
    }
    if (s === CHARGE) { const i = FUSE_T.indexOf(t); if (i >= 0) burst(CX + OFF[i], CY - 4, 5, 15, 40, 0.15, 0.3, R_EL, 10); }   // 导火索点燃：一小撮火花
    if (s === CAST) {
      const i = T_BOOM.indexOf(t);
      if (i >= 0) {                                                                       // 炸弹小猪自爆：火花 10 + 硝烟 5 + 小冲击环
        const x = BOOM_X[i], y = HY - 3, last = i === 3;
        burst(x, y, 10, 40, 110, 0.15, 0.4, R_EL, 10); burst(x, y, 5, 15, 40, 0.35, 0.6, FXI.dust, 8);
        ring(x, y, 0, R_EL); fx.cross(x, y - 1, last ? 5 : 3, R_EL, 0.15); hitDummy(last ? 1 : 0, 1);
        if (last) shake(0.12, 1);
        sfx('impact', { pal: 'fire', w: last ? 0.45 : 0.3 });
      }
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, scrX(-10 + Math.random() * 22), HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === T_CLINK) { burst(scrX(22 - 3), HY - 1, 5, 20, 50, 0.1, 0.25, FXI.steel, 10); sfx('hit', { mat: 'metal', w: 0.15 }); }
    if (s === DEATH && t === T_PUFF) {                                                    // 导火索烧到底：「噗」一小股黑烟
      const x = scrX(P.gx), y = HY + P.gy; fx.cloud(x, y - 2, 3, R_SMOKE, 0.7, 2); burst(x, y, 6, 10, 30, 0.4, 0.7, R_SMOKE, 16);
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_HIDE, 12);
  }
  const EVENTS = [[], [], [T_REL, T_NEW], [T_SLAM].concat(FUSE_T), T_BOOM, [], [INCOMING], [T_LAND, T_CLINK, T_PUFF], []];
  function impactOn(k, x, y) {                                                            // 手里剑命中
    burst(x, y, 8, 30, 90, 0.12, 0.3, FXI.impact, 6); burst(x, y, 4, 30, 70, 0.1, 0.25, FXI.steel, 6);
    fx.cross(x, y, 3, FXI.steel, 0.15); hitDummy(0, 1); sfx('hit', { mat: 'metal', w: 0.3 });
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > T_SLAM) {                                               // 火星定点汇聚到阵心
      chargeAcc += dt * (10 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 9 + Math.random() * 8; spawnX(K_SPIRAL_PT, CX, CY - 3, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 4, tx: CX, ty: CY - 3, squash: 0.45 }); }
    }
    if ((state === CHARGE && P.gem >= 1) || (state === DEATH && P.fuse > 0 && P.lie === 2) || (state === IDLE && P.gem >= 1)) {   // 尾尖火星冒火花
      emberAcc += dt * (state === IDLE ? 14 : 10);
      while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + (Math.random() - 0.5) * 2, gy - 1, (Math.random() - 0.5) * 10, -8 - Math.random() * 10, 0.25 + Math.random() * 0.25, R_EL); }
    } else emberAcc = 0;
    if (state === IDLE && P.tail !== lastTail && Math.abs(P.tail) === 2) burst(gx, gy, 3, 10, 30, 0.15, 0.3, R_EL, 10);
    lastTail = P.tail;
    if (state === MOVE && P.gf !== lastGf) {                                              // 碎步：每步 1 颗尘
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 6 : -4), HY, (Math.random() - 0.5) * 10, -2 - Math.random() * 3, 0.25, FXI.dust); sfx('step', { w: 0.3 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.55 && stT < INCOMING + 2.4) {
      soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-12 + Math.random() * 24), HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); }
    }
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -9; lastTail = 0; }
  // 4 根导火索（= 炸弹小猪的尾巴）从阵里冒出，依次点燃；小猪蹦出后导火索跟着走
  function fxBack(f12) {
    const tau = skillT();
    if (P.rim >= 2 && P.dq < 1) floorGlow(CX, P.rim, EL, f12);
    if (tau < 0.55) return;
    const tc = tau - DUR[CHARGE];
    for (let i = 0; i < 4; i++) {
      if (tc >= T_OUT[i]) continue;                                                       // 已经蹦出去了
      const h = R(clamp01((tau - 0.55) / 0.12) * 3), x = CX + OFF[i];
      for (let k = 1; k <= h; k++) put(x + (k === 2 ? 1 : 0), CY - k, k === h ? 19 : 20);
      if (tau >= FUSE_T[i] && h === 3) { const c = ((f12 + i) & 1) ? EL[0] : EL[1]; put(x, CY - 4, c); put(x + ((f12 + i) & 1 ? 1 : -1), CY - 5, EL[2]); }
    }
  }
  // 候选部件：bombPiglet —— 炸弹小猪（屏幕坐标、面朝右、y = 脚底）：7×3 圆滚焰橙身 + 墨色勾边 + 墨豆眼 + 1 格粉鼻盘 + 2 条交替的小腿 + 背上导火索和 1 格火星
  const PIGLET = ['..kkkk...', '.kLLLLkk.', 'kLBBBekNk', 'kBBBBBBnk', '.kDDDDDk.'];
  const PIG_C = { k: 0, L: 47, B: 46, D: 45, e: 0, n: 63, N: 58 };
  function bombPiglet(x, y, f, f12) {
    x = R(x); y = R(y);
    for (let j = 0; j < 5; j++) for (let i = 0; i < 9; i++) { const c = PIGLET[j][i]; if (c !== '.') put(x - 4 + i, y - 6 + j, PIG_C[c]); }
    const lg = f ? [-2, 2] : [-1, 1]; for (const d of lg) put(x + d, y - 1, 20);                 // 两条小腿交替
    put(x - 3, y - 7, 20); put(x - 4, y - 8, 19); put(x - 4, y - 9, (f12 & 1) ? EL[0] : EL[1]); put(x - 5, y - 9, EL[2]);   // 导火索 + 火星
  }
  function fxFront(f12) {
    const tau = skillT(), tc = tau - DUR[CHARGE];
    if (tau >= 0 && tc >= 0) for (let i = 0; i < 4; i++) {
      const s = tc - T_OUT[i]; if (s < 0 || tc >= T_BOOM[i]) continue;
      const x0 = CX + OFF[i];
      if (s < HOP) { const q = s / HOP; bombPiglet(x0 + q * 3, CY - Math.sin(Math.PI * q) * 5, 0, f12); }
      else { const q = clamp01((s - HOP) / RUN), fr = f12of(s - HOP) & 1; bombPiglet(lerp(x0 + 3, BOOM_X[i], q), CY - fr, fr, f12); }
    }
  }
  // 飞行中的手里剑：十字 / 斜叉交替旋转，白芯
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 0) return false;
    const spin = f12 & 1;
    if (!spin) { for (let r = 1; r <= 2; r++) { const c = r === 1 ? ST[1] : ST[2]; put(x + r, y, c); put(x - r, y, c); put(x, y + r, c); put(x, y - r, c); } put(x + 1, y - 1, ST[3]); put(x - 1, y + 1, ST[3]); }
    else { for (let r = 1; r <= 2; r++) { const c = r === 1 ? ST[1] : ST[2]; put(x + r, y + r, c); put(x - r, y - r, c); put(x + r, y - r, c); put(x - r, y + r, c); } put(x + 1, y, ST[3]); put(x - 1, y, ST[3]); }
    put(x, y, ST[0]);
    return true;
  }

  return {
    name: '火猪', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.spark], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'fire', style: 'summon', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
