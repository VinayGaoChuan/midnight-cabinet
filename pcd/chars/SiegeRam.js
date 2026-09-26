// 攻城锤（敌人 · 野兽 · 史诗 · 近战）：一头活的撞城巨羊。前重后轻的楔形短腿巨羊（肩峰高、胸宽、颈粗短、低头弓背），
// 奶油色卷毛从颈到胸蓬成一大团，胸前垂一块铁撞板（中央铆钉是发光体）；一对铁箍包角的螺旋公羊角盘成圆，角尖往前伸出吻前 3 格当撞角；
// 背上驮一顶斜面木板挡箭棚，棚顶高出背线 6 格，上面插着几支被挡下的箭。
// 攻击：后退半步刨蹄，低头猛冲 5 格用羊角顶撞。技能表现特性「偏转」（受到的远程伤害减少）：低头压身，棚边和角箍逐段亮银边，
// 身前浮出一片倾斜的银色点阵斜面；三支敌箭从右上射来，撞上斜面「叮叮叮」反弹向天，最后一支被弹回扎在假人脚边；收招时甩头抖掉棚上的箭。
// 死亡：四腿一软侧倒，挡箭棚滑下来盖在身上，插着的箭散落一地。
PCD.define('SiegeRam', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 颜色、材质 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], EN = FXR[FXI.enemy];                              // 偏转 · 冷铁银：白 → 银 → 灰蓝 → 铁 → 深铁；来箭用敌方色阶
  const R_WOOL = E.fxRamp('siegeRamWool', [17, 6, 7, 8, 20]);                               // 受击时飞散的羊毛屑
  const m = B.mats(E, {
    main: 'bone', face: [0, 20, 19, 32], faceFar: [0, 20, 20, 19],                            // 奶油卷羊毛（暗部偏灰褐，腿上也是毛）；脸和小腿 墨褐
    claw: [0, 0, 27, 28], eye: [0, 0, 14, 5], nose: [0, 20, 19, 32],                         // 墨色蹄、金豆眼（鼻孔由头部件画成墨褐，亮鼻头另画）
    horn: 'sand', hornFar: [20, 61, 61, 62], band: [0, 28, 29, 30], bandHot: [28, 30, 31, 21],       // 羊角 沙黄 + 铁箍（亮起时换银白）
    wood: 'wood', woodFar: [0, 20, 20, 19], trim: 'iron', trimHot: [28, 30, 31, 21],        // 挡箭棚木板、铁包边
    plate: [0, 28, 29, 30], rope: 'leather', shaft: [0, 20, 19, 32], fletch: 'white',                // 撞板、绳、插着的箭
  });
  m.shin = m.face; m.shinFar = m.faceFar;
  m.riv = E.defMat([27, 29, 30, 31], 1, 1); m.rivHot = E.defMat([30, 31, 21, 21], 1, 1);
  m.hole = E.defMat([0, 0, 8, 8], 1, 1); m.noseTip = E.defMat([0, 63, 63, 63], 1, 1); m.holeFar = E.defMat([0, 0, 0, 0], 1, 1);                // 角圈中心的暗孔（平涂，勾线下也看得见）
  const SHAPE = { len: 14, chest: 6.5, rump: 4.5, waist: 0.2, hump: 2.5, leg: 6, lw: 3, thigh: 3, farDx: -2, stride: 2, lift: 2, foot: 'hoof',
    neck: 4.5, neckA: 1.0, neckW: 4, head: { type: 'boar', w: 7.5, h: 7, snout: 3, snH: 4, tip: 0.85, ear: 'none', earH: 0, nose: 'dot', tusk: 0, teeth: 0 },
    headA: 0.35, tail: 'stub', mane: 'none', fur: 0, m };
  const o = Q.shape(SHAPE);
  const oHead = Q.shape(Object.assign({}, SHAPE, { m: Object.assign({}, m, { limb: m.face, far: m.faceFar, muz: m.face }) }));   // 头用墨褐脸（几何同 o）

  const HX = 68, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 50, 38, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 26, 30], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'ink', 'riv', 'rivHot', 'shaft', 'fletch', 'rope', 'bandHot', 'trimHot', 'claw', 'face', 'faceFar', 'limb', 'far', 'hole', 'holeFar', 'noseTip']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：sl 亮起的银边段数 0–4 · arr 棚上插着的箭 0–3 · shed 棚 0 在背上 / 1 滑落中 / 2 盖在身上 · shk 甩头 -1..1
  const EXTRA = [['sl', 0, 4], ['arr', 0, 3], ['shed', 0, 2], ['shk', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.sl = 0; P.arr = 3; P.shed = 0; P.shk = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'paw', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, paw: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_BACK = pose({ bx: -2, crouch: 1, head: 2, paw: 2, tail: 1, ear: 1 });           // 后退半步、刨蹄
  const A_RAM = pose({ bx: 5, pitch: -1, head: 3, reach: 1, tail: -2, ear: 1 });          // 低头猛冲 5 格
  const A_HOLD = pose({ bx: 4, head: 2, tail: -1 });
  const ATK = [[0, REST], [0.12, A_BACK, 'out'], [2 / 12, A_RAM, 'snap'], [0.25, A_RAM, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_BRACE = pose({ bx: -1, crouch: 2, pitch: -1, head: 2, ear: 1, tail: 1 });        // 低头压身
  const S_BRACE = pose({ bx: 0, crouch: 2, pitch: -1, head: 3, ear: 1, tail: -1 });
  const T_HIT = 2 / 12, T_LAND = INCOMING + 0.66;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.gem = ((f12 >> 3) % 6) === 5 ? 1 : 0;                                                 // 铆钉偶尔一闪
    if (lp >= 1.2 - 1e-6 && lp < 1.6) { const k = f12of(lp - 1.2); P.paw = k === 0 || k === 2 ? 2 : 0; P.head = 1; P.ear = 1; }   // 待机个性：前蹄刨地两下
    else if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.head = [-2, 1, -2, 1, 0][k]; P.shk = [1, -1, 1, -1, 0][k]; }   // 然后甩头试角
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.gem = tq >= T_HIT && tq < 0.3 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.6) { E.mix(tmp, REST, C_BRACE, ease.inOut(tq / 0.6), F_ALL); apply(tmp); } else apply(C_BRACE);
      P.sl = CL(Math.floor((tq - 0.3) / 0.22) + 1, 0, 4); P.rim = tq < 0.3 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      if (tq >= 1.1) P.shk = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) { apply(S_BRACE); P.sl = 4; P.rim = 3; P.gem = 3; P.bx = tq >= 0.04 && tq < 0.34 && ((f12 & 1) === 0) ? -1 : 0; }   // 每挡一支箭身体一顿
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_BRACE, REST, q, F_ALL); apply(tmp);
      P.sl = tq < 0.2 ? 3 : tq < 0.35 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.gem = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
      if (tq >= 0.1 && tq < 0.45) { const k = f12of(tq - 0.1); P.head = k & 1 ? 2 : -1; P.shk = k & 1 ? -1 : 1; P.ear = 1; }   // 用力甩头
      P.arr = tq < 0.15 ? 3 : 0;                                                             // 箭被抖掉
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12);
        P.shed = d < 0.5 ? 0 : d < T_LAND - INCOMING ? 1 : 2; P.arr = P.shed ? 0 : 3;
        P.gem = d < 0.66 ? ((f12 & 1) ? 1 : 0) : d < 1.2 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const rv = rivetAt(rig);
    if (st === CHARGE || st === CAST) { P.gx = PLANE_C[0] - HX; P.gy = PLANE_C[1] - HY; }  // 蓄力 / 施放时光源在身前的斜面上：棚边和羊角朝右上的外沿亮银边
    else { P.gx = rv[0] + P.bx; P.gy = rv[1]; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 撞板位置（ramPlate 和发光体焦点共用）：胸前、卷毛团下半部，5×4
  const plateAt = (rg) => { const C1 = rg.C1; return [R(C1.x + C1.r - 4.5), R(C1.y + C1.r * 0.5)]; };
  const rivetAt = (rg) => { const [x0, y0] = plateAt(rg); return [x0 + 2, y0 + 1]; };
  // 候选部件：ramHorns —— 螺旋公羊角盘成一个圆（头部局部坐标里圈心在颅后下方、眼睛后面）：直径 9 格的角圈，圈心 3×3 暗孔，
  //   一条暗色螺旋线从孔盘到外沿（读出盘绕），3 道 2 格宽的铁箍横跨角身；角从圈的前下方伸出，沿下颌下面往前，角尖超过吻尖 3 格、微微上挑。
  //   远侧角只画上半圈（暗一级），往后上错 1–2 格，从近侧角圈的上沿露出来
  const HC = [-3.3, -0.2], H_OUT = 4.5, H_IN = 1.5, BANDS = [-1.35, 2.85, 1.85];   // 圈心（局部 u, v）、外半径、孔半径、三道铁箍的局部角（上 / 后 / 下）
  const ARM = [[0.8, 0, 1.1], [2.6, 4.2, 1.0], [5.2, 4.3, 0.9], [7.6, 3.9, 0.7], [9.1, 3.1, 0.55], [9.9, 2.4, 0.4]];   // 伸出的角（局部 [角度或 u, v, 半径]）：第 0 个是圈上的出发角
  const hornTipL = (F) => [F.uT + 3.1, 2.4];
  function hornRing(F, far) {
    const c = F.at(HC[0], HC[1]), cx = R(c[0]) + (far ? 1 : 0), cy = R(c[1]) - (far ? 2 : 0), n = Math.ceil(H_OUT);
    const mat = far ? m.hornFar : m.horn;
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const d2 = i * i + j * j; if (d2 > H_OUT * H_OUT + 0.35) continue;
      if (far && j > 0) continue;                                                            // 远侧角只露上半沿
      if (Math.abs(i) <= 1 && Math.abs(j) <= 1) { U.dot(E, cx + i, cy + j, far ? m.holeFar : m.hole, 3); continue; }   // 圈心 3×3 暗孔
      const d = Math.sqrt(d2), al = Math.atan2(j, i) - F.a;                                 // 局部角（随低头转）
      let t = 0;
      if (!far) {
        const th = ((al - 0.6) % (2 * Math.PI) + 4 * Math.PI) % (2 * Math.PI), rs = H_IN + 0.6 + (H_OUT - H_IN - 0.6) * th / (2 * Math.PI);
        if (Math.abs(d - rs) < 0.55 && d > 2) t = 2;                                           // 螺旋线：从孔往外盘一圈
        for (let k = 0; k < 3; k++) {                                                         // 铁箍：沿圈 2 格宽，横跨整个角身
          let da = Math.abs(al - BANDS[k]) % (2 * Math.PI); if (da > Math.PI) da = 2 * Math.PI - da;
          if (da * d < 1.05 && d > 1.9) { U.dot(E, cx + i, cy + j, P.sl > k + 1 || P.sl >= 4 ? m.bandHot : m.band, 0); t = -1; }
        }
      }
      if (t >= 0) U.dot(E, cx + i, cy + j, mat, t);
    }
    return [cx, cy];
  }
  function horns(far) {
    E.part();
    const F = Q.headFrame(rig, oHead, P.jaw);
    const [cx, cy] = hornRing(F, far);
    if (far) return;
    // 伸出的角：从圈的前下方出发，沿下颌下面往前，角尖超过吻尖 3 格
    const a0 = ARM[0][0] + F.a, pts = [[cx + Math.cos(a0) * 3.6, cy + Math.sin(a0) * 3.6, ARM[0][2]]];
    for (let k = 1; k < ARM.length; k++) { const u = k === ARM.length - 1 ? hornTipL(F)[0] : ARM[k][0] * (F.uT + 3.1) / 9.9, p = F.at(u, ARM[k][1]); pts.push([p[0], p[1], ARM[k][2]]); }
    for (let i = 1; i < pts.length; i++) U.taper(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], pts[i - 1][2], pts[i][2], m.horn, 0);
    for (let i = 1; i < pts.length - 2; i++) U.dot(E, (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2 + 0.5, m.horn, 2);   // 角上的横棱
    const tip = pts[pts.length - 1]; U.dot(E, tip[0], tip[1], m.horn, 4);
  }
  // 鼻头 1 格亮（紧跟头画进同一个部件）
  function noseTip() { const F = Q.headFrame(rig, oHead, P.jaw), n = F.at(F.uT - 0.3, F.prof(F.uT)[0] + 0.6); U.dot(E, n[0], n[1], m.noseTip, 3); }
  // 候选部件：ramEar —— 从角圈后下方露出 2 格的垂耳（墨褐，单独一个部件，压在头上、被近侧角圈盖住根部）
  function ramEar() {
    if (rig.lie === 2) return;
    E.part(); const F = Q.headFrame(rig, oHead, P.jaw), a = 2.2 + F.a + (P.ear ? 0.25 : 0), c = F.at(HC[0], HC[1]);
    U.taper(E, c[0] + Math.cos(a) * 3, c[1] + Math.sin(a) * 3, c[0] + Math.cos(a) * (H_OUT + 2.2), c[1] + Math.sin(a) * (H_OUT + 2.2), 1.1, 0.6, m.face, 0);
  }
  // 候选部件：woolCurls —— 卷毛纹理（紧跟躯干画进同一个部件）：暗 2 格 + 左上亮 2 格一组，错行排
  function woolCurls() {
    if (rig.lie === 2) return;
    const C1 = rig.C1, C2 = rig.C2;
    for (let x = R(C2.x - C2.r) + 1; x <= R(C1.x + C1.r) - 2; x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      for (let y = s[0] + 2; y <= s[1] - 2; y++) {
        const row = ((y + 40) % 4), ph = ((x + (row === 0 ? 0 : 2) + 40) % 4);
        if ((row === 0 || row === 2) && ph === 0) { U.dot(E, x, y, m.body, 2); U.dot(E, x + 1, y, m.body, 2); U.dot(E, x - 1, y - 1, m.body, 4); U.dot(E, x, y - 1, m.body, 4); }
      }
    }
  }
  // 候选部件：woolRuff —— 颈根到胸前蓬出的一大团卷毛：比躯干前沿再鼓出 2 格，外沿每 2 格起伏 1 格，里面暗 / 亮 2 格一组的卷
  function woolRuff() {
    if (rig.lie === 2) return;
    E.part(); const C1 = rig.C1, NB = rig.NB;
    const x0 = C1.x - 1.5, x1 = C1.x + C1.r + 2, y0 = NB.y - 1.5, y1 = C1.y + C1.r + 1.5;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
    U.oval(E, cx, cy, rx - 0.6, ry - 0.6, m.body, 0);
    for (let k = 0; k < 14; k++) {                                                            // 外沿一圈毛球（大小交替 → 起伏 1 格）
      const a = -2.2 + k * 0.36; if (a > 2.4) break;
      const r = (k & 1) ? 0.9 : 1.4, bx = cx + Math.cos(a) * (rx - 0.8), by = cy + Math.sin(a) * (ry - 0.8);
      U.disc(E, bx, by, r, m.body, 0);
    }
    for (let y = R(y0) + 2; y <= R(y1) - 2; y += 2) for (let x = R(x0) + 1 + ((y >> 1) & 1) * 2; x <= R(x1) - 2; x += 4) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy > 0.7) continue;
      U.dot(E, x, y, m.body, 2); U.dot(E, x + 1, y, m.body, 2); U.dot(E, x, y - 1, m.body, 4); U.dot(E, x - 1, y - 1, m.body, 4);
    }
  }
  // 候选部件：ramPlate —— 胸前挂的铁撞板（5×4，四角铆钉，中央铆钉 1×2 是发光体 5 档），只盖在卷毛团下半部；一根绳挂在颈上
  function ramPlate() {
    if (rig.lie === 2) return;
    E.part(); const [x0, y0] = plateAt(rig), [rx, ry] = rivetAt(rig);
    for (let y = y0; y <= y0 + 3; y++) for (let x = x0; x <= x0 + 4; x++) U.dot(E, x, y, m.plate, 0);
    for (const [x, y] of [[x0, y0], [x0 + 4, y0], [x0, y0 + 3], [x0 + 4, y0 + 3]]) U.dot(E, x, y, m.plate, 4);
    U.dot(E, x0 + 1, y0 + 3, m.plate, 2); U.dot(E, x0 + 3, y0 + 3, m.plate, 2);            // 下沿撞痕
    const g = P.gem, mat = g >= 2 && g <= 3 ? m.rivHot : m.riv, t = g === 4 ? 1 : g === 0 ? 2 : g === 1 ? 4 : g === 2 ? 3 : 4;
    U.dot(E, rx, ry, mat, t); U.dot(E, rx, ry + 1, mat, g >= 2 && g <= 3 ? t : Math.max(1, t - 1));
    U.dot(E, x0 + 1, y0 - 1, m.rope, 3); U.dot(E, x0 + 3, y0 - 1, m.rope, 3);              // 挂绳
  }
  // 候选部件：arrowShed —— 斜面木板挡箭棚：两根立柱 + 一块后高前低的厚木板（木板缝、铁包边、钉），板上插着 arr 支箭（箭尾朝右上）
  const SHED_X0 = -12, SHED_X1 = 6;
  function shedLine(rg) {
    const s1 = Q.span(rg, o, -8), s2 = Q.span(rg, o, 3), y1 = (s1 ? s1[0] : -13) - 10, y2 = (s2 ? s2[0] : -17) - 2;
    return (x) => R(y1 + (y2 - y1) * (x + 8) / 11);
  }
  // 插着的箭：箭杆斜插（三支角度错开），尾端 2 格斜三角白羽
  const STUCK = [[-10, 1, -1, 5], [-6, 1, -2, 4], [-1, 2, -1, 5]];                            // [x, dx, dy, 杆长]
  function arrowStuck(x, dx, dy, n) {
    const L = Math.max(Math.abs(dx), Math.abs(dy)), ux = dx / L, uy = dy / L;
    let ex = x, ey = 0;
    for (let k = 1; k <= n; k++) { ex = x + R(ux * k); ey = R(uy * k); U.dot(E, ex, SY + ey, m.shaft, 3); }
    U.dot(E, ex + R(ux), SY + ey + R(uy), m.fletch, 4);                                      // 羽尖顺杆再出 1 格
    if (Math.abs(dy) >= Math.abs(dx)) U.dot(E, ex + 1, SY + ey, m.fletch, 3); else U.dot(E, ex, SY + ey - 1, m.fletch, 3);   // 侧面 1 格，和杆端合成斜三角
  }
  let SY = 0;
  function shed() {
    if (P.shed) return shedDropped();
    const Y = shedLine(rig);
    E.part();                                                                                 // 实心楔形木棚：竖木板（每 3 列一道板缝）、中间一道横档、顶沿铁包边（蓄力时逐段亮）
    for (let x = SHED_X0; x <= SHED_X1; x++) {
      const s = Q.span(rig, o, CL(x, -11, 9)), yb = (s ? s[0] : -12) + 1, yt = Y(x);
      for (let y = yt; y <= yb; y++) {
        let mat = m.wood, t = ((x - SHED_X0) % 3) === 2 ? 2 : 0;
        if (y === yt) { mat = P.sl > CL(Math.floor((x - SHED_X0) / 5), 0, 3) ? m.trimHot : m.trim; t = 0; }
        else if (y === yt + 4) t = 1;
        U.dot(E, x, y, mat, t);
      }
    }
    for (let k = 0; k < 4; k++) { const x = SHED_X0 + 2 + k * 5; U.dot(E, x, Y(x) + 2, P.sl > k ? m.trimHot : m.trim, 4); }   // 板钉
    U.dot(E, SHED_X0 - 1, Y(SHED_X0) + 1, m.rope, 3); U.dot(E, SHED_X0 - 1, Y(SHED_X0) + 2, m.rope, 3); U.dot(E, SHED_X0 - 2, Y(SHED_X0) + 3, m.rope, 4);   // 后檐垂下的绳头
    for (let k = 0; k < P.arr; k++) { const [x, dx, dy, n] = STUCK[k]; SY = Y(x); arrowStuck(x, dx, dy, n); }
  }
  // 死亡：棚从背上滑下来（1 = 半空中斜着，2 = 盖在侧躺的身上），插着的箭散落在地上
  function shedDropped() {
    E.part();
    const [xa, ya, xb, yb] = P.shed === 1 ? [-20, -18, -1, -22] : [-22, 0, -2, -11];
    const n = Math.max(Math.abs(xb - xa), 1);
    for (let i = 0; i <= n; i++) { const x = xa + i * Math.sign(xb - xa), y = R(ya + (yb - ya) * i / n); for (let j = 0; j < 3; j++) U.dot(E, x, y + j - 2, m.wood, j === 0 ? 0 : (((x + 40) % 4) === 0 ? 2 : 0)); }
    for (let j = 0; j < 3; j++) U.dot(E, xb, R(yb) + j - 2, m.trim, 3);
    if (P.shed === 2) {                                                                       // 散落的箭（贴地斜躺）
      E.part();
      for (const [x, d] of [[-30, 1], [13, 1], [20, -1]]) { for (let k = 0; k < 4; k++) U.dot(E, x + k * d, k < 2 ? 0 : -1, m.shaft, 3); U.dot(E, x + 4 * d, -1, m.fletch, 4); U.dot(E, x + 4 * d, -2, m.fletch, 3); }
    }
  }
  // 腿：羊毛腿 + 墨褐小腿（小腿紧跟腿画进同一个部件）
  function leg(i) {
    Q.leg(E, rig, P, o, i); const L = rig.legs[i], F = L.F, T = L.T, d = Math.hypot(T[0] - F[0], T[1] - F[1]) || 1, k = Math.min(1, 3 / d);
    if (rig.lie === 2) return;
    U.seg(E, F[0] + (T[0] - F[0]) * k, F[1] - 0.5 + (T[1] - F[1]) * k, F[0], F[1] - 1.5, o.lw, L.far ? m.shinFar : m.shin, 0);
  }
  const legs = (far) => { for (let i = 0; i < 4; i++) if (!!rig.legs[i].far === !!far) leg(i); };
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    if (!legsLast) legs(1);
    Q.tail(E, rig, P, o);
    if (!P.shed) shed();
    Q.body(E, rig, P, o); woolCurls();
    if (!legsLast) legs(0);
    woolRuff();
    ramPlate();
    horns(1);
    Q.head(E, rig, P, oHead); noseTip();
    ramEar();
    horns(0);
    if (legsLast) { legs(1); legs(0); }
    if (P.shed) shed();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 偏转斜面（屏幕坐标）：两排 45° 的银色点阵，法线朝右上；三个挡箭点在外排上
  // 斜面从棚前上方一直斜到羊角前方（30 行，每 2 行右移 1 格）：内排实线、外排隔点（往右上错开 2 格）
  const PL_A = [HX + 11, HY - 37], PL_N = 30, PLANE_C = [HX + 18, HY - 22];
  const PLANE = []; for (let j = 0; j <= PL_N; j++) { const x = PL_A[0] + (j >> 1), y = PL_A[1] + j, k = j * 9 / (PL_N + 1); PLANE.push([x, y, 0, k]); if ((j & 1) === 0) PLANE.push([x + 2, y - 1, 1, k]); }
  const HITS = [7, 15, 23].map((j) => [PL_A[0] + (j >> 1) + 2, PL_A[1] + j - 1]);
  const T_ARR = [0.04, 0.16, 0.28], FLY = 0.14, T_STICK = 0.5;                                // 三支箭撞上斜面的时刻（施放内秒）、飞行时长、最后一支扎地时刻
  const STICK = [DUMMY_X - 7, HY];
  let chargeAcc = 0, lastGf = -9, lastPaw = 0, ramT = 9, soulAcc = 0;
  const hornScr = () => { const F = Q.headFrame(rig, oHead, 0), t = hornTipL(F), p = F.at(t[0], t[1]); return [scrX(R(p[0]) + P.bx), HY + R(p[1])]; };
  const skillT = () => (E.state === CHARGE ? E.stT : E.state === CAST ? DUR[CHARGE] + E.stT : E.state === RECOVER ? DUR[CHARGE] + DUR[CAST] + E.stT : -1);
  function onEnter(s) {
    if (s === CAST) {                                                                         // 斜面全亮：银色外爆 + 冲击环 + 震屏 2 格 + 天空闪白
      releaseOrbit(40, 90, 0.25, 0.5); burst(PLANE_C[0], PLANE_C[1], 18, 40, 100, 0.2, 0.5, R_EL, 6); ring(PLANE_C[0], PLANE_C[1], 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                        // 羊角顶在假人身上
      ramT = 0; const [hx, hy] = hornScr();
      burst(hx + 1, hy - 2, 14, 40, 110, 0.15, 0.4, FXI.impact, 8); fx.cross(hx + 1, hy - 2, 4, FXI.impact, 0.15, 2); hitDummy(1, 1);
      for (let i = 0; i < 6; i++) spawn(K_DUST, scrX(-8) + (Math.random() - 0.5) * 10, HY, -10 - Math.random() * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.85 }); sfx('hit', { mat: 'wood', w: 0.85 });
    }
    if (s === CAST) {
      const k = T_ARR.indexOf(t);
      if (k >= 0) {                                                                           // 叮！十字星芒 + 12 颗银火花
        const [x, y] = HITS[k]; fx.cross(x, y, 4 + k, R_EL, 0.2, 2); burst(x, y, 12, 40, 120, 0.15, 0.45, R_EL, 10);
        sfx('impact', { pal: 'metal', w: 0.6 + k * 0.1 });
      }
      if (t === T_STICK) {                                                                    // 最后一支被弹回扎在假人脚边
        burst(STICK[0], STICK[1] - 1, 8, 20, 60, 0.2, 0.4, FXI.dust, 20); hitDummy(0, 1); shake(0.12, 1);
        sfx('impact', { pal: 'metal', w: 0.85 });
      }
    }
    if (s === RECOVER && t === 0.15) for (let k = 0; k < 3; k++) { const x = scrX(STUCK[k][0] + 2); spawnX(K_PHYS, x, HY - 26, (Math.random() - 0.5) * 30, -20, 0.5, R_WOOL, { g: 260, floor: HY }); }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.25, 0.5, R_WOOL, 12);
    if (s === DEATH && t === T_LAND) {                                                        // 侧倒落地：尘土 + 棚砸下
      for (let i = 0; i < 16; i++) spawn(K_DUST, scrX(-18 + Math.random() * 34), HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 12, 0.4 + Math.random() * 0.3, FXI.dust);
      burst(scrX(-12), HY - 4, 8, 20, 60, 0.3, 0.5, R_WOOL, 10); shake(0.12, 1); sfx('fall', { w: 0.9 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], T_ARR.concat([T_STICK]), [0.15], [INCOMING], [T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.3 && stT < 1.35) {                                        // 银色火花定点汇聚到斜面上
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const p = PLANE[(Math.random() * PLANE.length) | 0], a = Math.random() * 6.2832, r = 10 + Math.random() * 8;
        spawnX(K_SPIRAL_PT, p[0], p[1], r / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3, tx: p[0], ty: p[1] });
      }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                  // 沉重小步：每步 3 颗尘土
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 10 : -6) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.85 }); }
      lastGf = P.gf;
    }
    if ((state === IDLE || state === ATTACK) && P.paw !== lastPaw) {                          // 刨蹄扬尘
      if (P.paw === 0 && lastPaw > 0) for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(12) + Math.random() * 3, HY, -8 - Math.random() * 20, -5 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust);
      lastPaw = P.paw;
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-16 + Math.random() * 30), HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    ramT += dt;
  }
  function fxReset() { chargeAcc = 0; lastGf = -9; lastPaw = 0; ramT = 9; soulAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(PLANE_C[0] - 2, P.rim, EL, f12); }
  function fxMid(f12) {
    if (ramT < 2 / 12) {                                                                      // 猛冲的速度线（身后三道）
      const c = ramT < 1 / 12 ? EL[1] : EL[3];
      for (const [y, L] of [[HY - 20, 10], [HY - 14, 14], [HY - 7, 9]]) for (let k = 0; k < L; k++) { if (ramT >= 1 / 12 && (k & 1)) continue; put(HX - 14 + P.bx - k, y, k < 3 ? c : EL[3]); }
    }
  }
  // 一支箭（屏幕坐标）：沿方向 (dx, dy)（已吸附到 1:2 / 1:1）画 5 格箭杆 + 箭头 + 尾羽
  function arrow(x, y, dx, dy, R5, lv) {
    x = R(x); y = R(y); const L = Math.max(Math.abs(dx), Math.abs(dy)), ux = dx / L, uy = dy / L; put(x, y, R5[0]); put(x - R(ux), y - R(uy), R5[0]);
    for (let k = 2; k <= 5; k++) put(x - R(ux * k), y - R(uy * k), R5[CL(lv, 1, 4)]);
    const tx = x - R(ux * 6), ty = y - R(uy * 6); put(tx, ty, R5[0]); put(tx - (uy ? 1 : 0), ty + (ux ? 1 : 0), R5[1]); put(tx + (uy ? 1 : 0), ty - (ux ? 1 : 0), R5[1]);
  }
  function fxFront(f12) {
    const tau = skillT();
    if (tau >= 0) {
      const tc = tau - DUR[CHARGE], tr = tau - DUR[CHARGE] - DUR[CAST];
      // 斜面点阵：蓄力 0.45 s 起从上往下逐点亮 → 施放前 2 帧全白 → 收招从上往下逐点熄灭
      for (const [x, y, row, k] of PLANE) {
        let c = -1;
        if (tc < 0) { const on = (tau - 0.45) / 0.8 * 9; if (k < on) c = k > on - 1 ? EL[3] : ((f12 + k) & 1) ? EL[1] : EL[2]; }
        else if (tr < 0) { c = tc < 2 / 12 ? EL[0] : row === 1 ? EL[1] : EL[2]; for (let a = 0; a < 3; a++) { const d = tc - T_ARR[a]; if (d >= 0 && d < 2 / 12 && Math.abs(x - HITS[a][0]) + Math.abs(y - HITS[a][1]) <= 5) c = EL[0]; } }
        else { const off = tr / 0.5 * 9; if (k >= off) c = k < off + 1 ? EL[3] : EL[2]; }
        if (c >= 0) put(x, y, c);
      }
      // 三支敌箭：从右上飞来 → 撞上斜面 → 两支弹飞向天，最后一支被弹回扎在假人脚边
      for (let a = 0; a < 3; a++) {
        const th = tc - T_ARR[a], [hx, hy] = HITS[a];
        if (th < -FLY) continue;
        if (th < 0) { const q = -th / FLY; arrow(hx + q * 32, hy - q * 64, -1, 2, EN, 1); continue; }   // 从右上方陡斜射来
        if (a < 2) { const s = th; if (s > 0.55) continue; const x = hx + (a ? -18 : 14) * s, y = hy - 150 * s + 180 * s * s, f = (f12 + a) & 1; arrow(x, y, f ? 0 : (a ? -1 : 1), f ? -1 : -1, EN, s < 0.2 ? 1 : 2); }
        else {
          const s = th / (T_STICK - T_ARR[2]);
          if (s < 1) { const x = hx + (STICK[0] - hx) * s, y = hy + (STICK[1] - 1 - hy) * s - 10 * Math.sin(Math.PI * s); arrow(x, y, 1, 2, EN, 1); }
          else if (tr < 0.55) { const lv = tr > 0.4 ? 3 : 2; arrow(STICK[0], STICK[1] - 1, 1, 2, EN, lv); }
        }
      }
      if (tr >= 0.15 && tr < 0.6) for (let k = 0; k < 3; k++) {                             // 甩头抖掉的三支箭（翻着落地）
        const s = tr - 0.15, x = scrX(STUCK[k][0] + 2) + (k - 1) * 14 * s, y = Math.min(HY - 1, HY - 26 - 30 * s + 260 * s * s), fl = ((f12 >> 1) + k) & 1;
        put(R(x), R(y), 19); put(R(x) + (fl ? 1 : 0), R(y) + (fl ? 0 : 1), 19); put(R(x) + (fl ? 2 : 0), R(y) + (fl ? 0 : 2), 17);
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lie) {                                   // 铆钉十字闪
      const x = scrX(P.gx), y = HY + P.gy; if (E.state !== CHARGE && E.state !== CAST) { const L = 2 + (f12 & 1); for (let r = 2; r <= L; r++) { put(x + r, y, EL[1]); put(x, y - r, EL[1]); } }
    }
  }

  return {
    name: '攻城锤', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.riv, m.rivHot], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'metal', style: 'shield', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
