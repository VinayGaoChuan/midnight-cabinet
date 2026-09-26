// 混沌邪犬（敌人 · 混沌 · 普通 · 近战 240）：「它们的外骨骼使拥有远程攻击抗性。」；特性「偏转」：受到的远程单位伤害减少 15%（fx 守护）。
// 一只狗的身体，外面长着一节节昆虫外骨骼：从臀到颈 6 节琥珀褐甲片，每节的后沿翘起，背线成一排锯齿；
//   头顶扣着一块向前凸的甲虫头盔，额前两根短触角往前伸 3 格；尾巴是一截分节甲尾，尖端一个钩；下颚下面长着一对甲钳；甲缝下露出黑毛。
// 攻击 = 咬：前扑 3 格，一口咬合（上下两道咬合弧）。
// 技能「偏转」（被动特性，表现它生效的样子）：弓背缩头，甲片从尾到颈一节节合拢，边缘一节节亮起琥珀光（轮廓光跟着走），三支敌箭从右上飞来 →
//   三支箭先后打在背甲上被弹开、翻着跟头往上飞（反弹弹道 + 十字星芒），甲壳闪白 → 沿背甲溅起一排琥珀火花 + 小冲击环。
// 死亡 = 仰面翻倒、四脚朝天，甲片从尾到颈一节节松脱、翻着跟头散落一地，然后消散。
// 身体用 parts-beast 的 quad（canine 头）拼；背甲片、甲虫头盔 + 触角、分节甲尾、下颚甲钳、腿甲、弹开的箭是本模块的候选部件。设定卡见 pcd/batch-07/ChaosEvilDog/design.md。
PCD.define('ChaosEvilDog', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_RISE, K_PHYS, K_SPIRAL_PT, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 元素：偏转 · 岩土琥珀（earth：奶油 5 → 淡沙 62 → 沙 61 → 木 19 → 深木 20）─────
  const R_EL = FXI.earth, EL = FXR[R_EL], EN = FXR[FXI.enemy];
  const R_CHIP = fxRamp('cedChip', [14, 62, 61, 19, 20]);                                    // 甲片碎屑（琥珀 → 褐）
  // ───── 材质 ─────
  const m = B.mats(E, {
    main: [0, 0, 27, 28],                                                                    // 甲缝下的黑毛（身体大块 band 2）
    limb: [0, 27, 28, 29],                                                                   // 腿、头的黑毛亮一级（和甲壳、夜色拉开）
    eye: [0, 0, 26, 21], teeth: 'white', claw: 'bone', ant: [20, 19, 32, 33],               // 敌方红眼 · 白牙 · 骨白爪 · 触角（boot 暗褐起，尖端亮到皮革色）
  });
  const M_PL = E.defMat([20, 61, 14, 62], 1);                                                 // 琥珀褐甲壳（sand 暗段 + gold 琥珀 + 淡沙高光）
  const M_PLF = E.defMat([20, 19, 19, 61], 1);                                                // 远侧 / 翻倒压在身下的甲片（暗一级）
  const M_LIT = E.defMat([20, 62, 5, 21], 1, 1);                                               // 甲片边缘亮起的琥珀光（发光体，平涂）
  const M_HI = E.defMat([20, 61, 62, 5], 1);                                                  // 甲片上沿鼓起处的一格奶油高光（只用 t 4 = 5）
  const HEAD = { type: 'canine', w: 7, h: 6, snout: 3.5, snH: 3.2, tip: 0.65, ear: 'none', teeth: 2 };   // 头放大一圈：甲虫头盔要扣得下
  const SHAPE = { len: 14, chest: 4, rump: 4, waist: 0.3, hump: 1.2, leg: 6, lw: 2, thigh: 2, farDx: -2, stride: 2.5, lift: 2,   // 躯干放长：6 节甲片每节 3–4 列
    neck: 3.5, neckA: 0.85, neckW: 2.2, head: HEAD, headA: 0.25, tail: 'none', mane: 'none', foot: 'claw', fur: 0, m };
  const o = Q.shape(SHAPE), oArch = Q.shape(Object.assign({}, SHAPE, { hump: 2.8 }));       // 弓背：肩峰拱高
  const NPL = 6, PW = [3, 4, 4, 4, 4, 3];                                                    // 背甲片数与每节宽（臀 → 颈根，共 22 列）

  const HX = 68, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 42, 42, 36);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of [m.eye, m.ink, m.teeth, m.claw, M_LIT]) RIM.skip[k] = 1;
  // rat 甲片抖动（0 不抖 · 1 单数节翘 · 2 双数节翘）· cls 合拢了几节（从尾往颈）· pl 边缘亮了几节 · ant 触角 -1 贴后 / 0 / 1 抖起
  // arch 弓背 · dfr 死亡内第几帧（甲片松脱的轨迹由它算出）· pw 甲壳闪白：0 不闪 / 1–6 = 第 pw 节中箭（那一节整块白，其余只闪上沿，黑毛不变）
  const SPEC = Q.KEYS.concat(B.COMMON, [['rat', 0, 2], ['cls', 0, 6], ['pl', 0, 6], ['ant', -1, 1], ['arch', 0, 1], ['dfr', 0, 40], ['pw', 0, 6]]);
  const P = {};
  function reset() { Q.reset(P); P.rat = 0; P.cls = 0; P.pl = 0; P.ant = 0; P.arch = 0; P.dfr = 0; P.pw = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;
  const shapeOf = () => (P.arch ? oArch : o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12, T_BITE = 3 / 12;
  const A_WIND = pose({ bx: -1, crouch: 1, head: 1, jaw: 1, tail: 1, pitch: -1 });           // 压低、微张嘴
  const A_LUNGE = pose({ bx: 3, reach: 2, jaw: 3, head: 0, tail: -2, pitch: 1 });            // 前扑 3 格、大张嘴
  const A_SNAP = pose({ bx: 3, reach: 1, jaw: 0, head: 1, tail: -1, pitch: 0 });             // 一口咬合
  const A_HOLD = pose({ bx: 2, reach: 1, jaw: 0, head: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_LUNGE, 'snap'], [T_BITE, A_SNAP, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_TUCK = pose({ bx: -1, crouch: 2, head: 2, pitch: -1, tail: 1 });                   // 弓背缩头
  const S_BRACE = pose({ bx: -2, crouch: 1, head: 2, pitch: -1, tail: 2 });                  // 挨箭：往后一顿
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  const T_SHAKE = 1.6;                                                                       // 待机个性：甩头甩身抖掉甲缝里的灰（1.6–2.0 s）
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.ant = [0, 1, 0, 0][Math.floor(lp / 0.6 + 1e-6) & 3];
    if (lp >= T_SHAKE - 1e-6 && lp < T_SHAKE + 6 / 12 - 1e-6) {                              // 6 帧：甩 4 下 → 最后一甩带出一下（头低、尾甩回）→ 回正
      const i = f12of(lp - T_SHAKE);
      P.head = [-1, 1, -1, 1, 2, 0][i]; P.rat = i >= 4 ? (i === 4 ? 2 : 0) : 1 + (i & 1); P.ant = i === 5 ? 1 : (i & 1) ? -1 : 1; P.tail = [2, -2, 2, -2, 1, 0][i]; P.bob = i === 4 ? 1 : 0; P.eyes = i >= 1 && i <= 4 ? 1 : 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                  // 僵硬小跑：头不点，甲片随步子咔哒错动
      const f = Q.anim.walk(P, tq); P.head = 0; P.rat = f & 1 ? 0 : 1 + (f >> 1); P.ant = f & 1 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.ant = tq >= T_HIT && tq < 0.34 ? -1 : 0; P.rat = tq >= T_BITE && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_TUCK, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_TUCK);
      P.arch = tq >= 0.25 ? 1 : 0; P.ant = -1;
      P.cls = Math.max(0, Math.min(NPL, Math.floor((tq - 0.1) / 0.09 + 1e-6)));            // 从尾到颈一节节合拢
      P.pl = tq < 0.6 ? 0 : Math.min(NPL, 1 + Math.floor((tq - 0.6) / 0.12 + 1e-6));      // 边缘一节节亮起
      P.rim = tq < 0.6 ? 1 : 2;
      if (tq > 1.1) { P.bob = (f12 & 1) ? 0 : -1; P.tail = (f12 & 1) ? 2 : 1; }             // 最后绷紧发抖
    } else if (st === CAST) {                                                               // 三支箭依次打在背上：每一下闪白 + 往后一顿
      const k = f12of(tq);
      apply(k <= 5 ? S_BRACE : C_TUCK); P.arch = 1; P.cls = NPL; P.pl = NPL; P.ant = -1; P.rim = 3;
      P.pw = k === 0 ? 4 : k === 2 ? 2 : k === 4 ? 5 : 0; if (k === 1 || k === 3 || k === 5) P.bx = -1;   // 中箭的那一节（第 4、2、5 节）闪白
    } else if (st === RECOVER) {                                                            // 甲片重新张开、抖一抖
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, C_TUCK, REST, q, F_ALL); apply(tmp);
      P.arch = q < 0.4 ? 1 : 0; P.cls = Math.max(0, NPL - Math.floor(tq / 0.06 + 1e-6)); P.pl = Math.max(0, NPL - Math.floor(tq / 0.05 + 1e-6));
      P.rat = tq > 0.3 && tq < 0.55 ? 1 + (f12 & 1) : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.ant = tq < 0.3 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.rat = h < 0.2 ? 2 : h < 0.35 ? 1 : 0; P.ant = h < 0.2 ? -1 : h < 0.35 ? 1 : 0; }
    } else if (st === DEATH) {                                                              // 仰面翻倒、四脚朝天，甲片一节节松脱
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else { Q.anim.death(P, d, f12); P.rat = d < 0.3 ? 2 : 0; P.ant = -1; P.dfr = Math.min(40, f12of(d)); if (P.lie === 2) P.tail = 0; }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, shapeOf());
    if (P.pl > 0 && !rig.lie) { const t0 = plateTop(rig, shapeOf(), P.pl - 1); P.gx = t0[0] + P.bx; P.gy = t0[1]; }
    else { P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]); }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 甲片分界：6 节从臀后铺到颈根（宽 3·4·4·4·4·3），b[k] .. b[k+1]-1 是第 k 节（0 = 臀，5 = 颈根）
  function plateCols(rg) { let x = R(rg.C2.x - rg.C2.r * 0.9); const b = [x]; for (const w of PW) b.push(x += w); return b; }
  // 背线：躯干上沿和颈上沿取高的那个（颈根那一节甲片要顺着颈往上爬）
  function backTop(rg, oo, x) {
    const s = Q.span(rg, oo, x), NB = rg.NB, NT = rg.NT, w = oo.neckW; let t = s ? s[0] : 1e9;
    if (!rg.lie && x >= NB.x - w && x <= NT.x + 0.5) { const q = clamp01((x - NB.x) / Math.max(0.5, NT.x - NB.x)); t = Math.min(t, Math.ceil(lerp(NB.y, NT.y, q) - lerp(w, w * 0.8, q) - 0.35)); }
    return t < 1e8 ? t : null;
  }
  function plateBase(rg, oo, b, k) {                                                         // 每节甲片是一块平的硬壳：取这一节里背线最高的那一格当底线（臀、胸前的弧不会把齿吃掉）
    let t = 1e9; for (let x = b[k]; x < b[k + 1]; x++) { const v = backTop(rg, oo, x); if (v != null && v < t) t = v; }
    return t < 1e8 ? t : rg.C1.y - rg.C1.r;
  }
  function plateTop(rg, oo, k) {                                                             // 第 k 节甲片后沿（齿尖）的位置（本地坐标，不含 bx）
    const b = plateCols(rg); return [b[k], plateBase(rg, oo, b, k) - 3];
  }
  // 候选部件：segPlates —— 昆虫外骨骼背甲片（一个部件，节缝手工画）：每节后沿（齿）比背线高 2 格，往前按 [2,1,0,-1] / [2,1,-1] 落回背线、节缝那列再低 1 格，
  //   相邻两节之间落差 3 格 → 剪影背线是一排锯齿；每节只有一道节缝（前沿一列 tone 1，被下一节翘起的后沿压出的阴影），
  //   上沿一行高光、鼓起处一格奶油色，齿的朝后那一面也受光；下沿一行暗边，下面露出黑毛。
  //   rat 让单 / 双数节的齿再翘 1 格（抖动）· cls 前几节合拢（不翘，背线变成光滑的拱）· pl 前几节的上沿换成发光的琥珀光 · pw 闪白
  const RAISE = { 3: [2, 1, -1], 4: [2, 1, 0, -1] };                                        // 齿 +2 → 落回背线 → 节缝那一列再压低 1 格（齿间落差 3）
  function bodyPlates(rg, oo) {
    E.part();
    const b = plateCols(rg), hitK = P.pw - 1;
    for (let k = 0; k < NPL; k++) {
      const x0 = b[k], w = b[k + 1] - x0, closed = k < P.cls, lit = k < P.pl, depth = k === 0 || k === NPL - 1 ? 2 : 3;
      const extra = P.rat && ((k & 1) === (P.rat - 1)) ? 1 : 0, base = plateBase(rg, oo, b, k);
      for (let i = 0; i < w; i++) {
        const x = x0 + i, bt = backTop(rg, oo, x); if (bt == null) continue;
        const s = Q.span(rg, oo, x), raise = closed ? 0 : RAISE[w][i] + (i === 0 ? extra : 0);
        const top = closed ? bt - 1 : base - 1 - raise, bot = Math.min(s ? s[1] - 1 : 0, bt + depth);   // 合拢：贴着背线，背成一道光滑的拱
        for (let y = top; y <= bot; y++) {
          let mat = M_PL, t = 3;
          if (i === w - 1 && y < bot) t = closed ? 2 : 1;                                      // 唯一一道节缝
          else if (y === top) { t = 4; if (i === 1 && !closed) mat = M_HI; if (lit) { mat = M_LIT; t = (x + k) & 1 ? 3 : 4; } }
          else if (i === 0 && y === top + 1 && !closed) t = 4;                                  // 齿朝后的那一面受光
          else if (y === bot) t = 2;
          if (P.pw) { if (k === hitK) { mat = M_LIT; t = y === bot ? 2 : y === top ? 4 : 3; } else if (y === top) { mat = M_LIT; t = 4; } }
          U.dot(E, x, y, mat, t);
        }
      }
    }
  }
  // 翻倒后压在身下的甲片（背朝地）：躯干底边 2 行，已经松脱的节不画
  function lyingPlates(rg, oo) {
    const b = plateCols(rg);
    for (let k = 0; k < NPL; k++) {
      if (detachState(k)[0]) continue;
      E.part();
      for (let x = b[k]; x <= b[k + 1] - 1; x++) { const s = Q.span(rg, oo, x); if (!s) continue; const f = x === b[k + 1] - 1; U.dot(E, x, s[1], M_PLF, f ? 1 : 3); U.dot(E, x, s[1] - 1, M_PLF, 2); if (x === b[k]) U.dot(E, x, s[1] + 1, M_PLF, 2); }
    }
  }
  // 候选部件：beetleHelm —— 甲虫头盔（并进头的部件）：扣在颅顶的甲壳，前沿往前凸出一道盔檐压在吻根上，中间一道纵缝；下颚下面一对甲钳（张嘴时跟着下颚走）
  function helmet(rg) {
    const oo = shapeOf(), F = Q.headFrame(rg, oo, P.jaw), W = F.W, Hh = F.Hh, cv = -Hh * 0.72, rv = Hh * 0.88, ru = W + 0.6, vlo = -Hh * 0.35 - 0.7;
    Q.scanHead(F, W + 5, (x, y, u, v) => {
      const inDome = ((u + 0.2) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1 && v <= vlo;
      const inLip = u > W - 0.6 && u < W + 1.9 && v > vlo - 1.3 && v <= vlo + 0.2;          // 向前凸的盔檐
      if (!inDome && !inLip) return;
      const top = ((u + 0.2) / ru) ** 2 + ((v - 1 - cv) / rv) ** 2 > 1 && !inLip;
      let t = 3; if (top) t = 4; else if (v > vlo - 0.6) t = 2; else if (Math.abs(u + 0.6) < 0.5) t = 2;
      if (inLip && u > W + 1.2) t = 3;
      if (P.pw && top) U.dot(E, x, y, M_LIT, 4); else U.dot(E, x, y, M_PL, t);                // 闪白只闪盔顶上沿
    });
    if (!P.eyes) U.dot(E, rg.eye[0], rg.eye[1], m.eye, 3); else U.dot(E, rg.eye[0], rg.eye[1], m.limb, 1);   // 眼睛压回盔檐下
    const u = F.uT - 1.6, pr = F.prof(u), a = F.at(u, pr[1] + F.gap(u) + 0.8);               // 下颚甲钳：往前 2 格再往上勾
    U.dot(E, a[0], a[1], M_PL, 2); U.dot(E, a[0] + 1, a[1], M_PL, 3); U.dot(E, a[0] + 2, a[1], M_PL, 4); U.dot(E, a[0] + 2, a[1] - 1, M_PL, 3);
  }
  // 候选部件：antennae —— 额前一对短触角：从盔檐前沿（不是盔顶）起，两根 1 格细线往前、微微往上伸 4 格，和头盔之间留出空隙；
  //   近侧那根亮皮革色、尖端一格骨白，远侧那根暗一级、错后 1 格（两根并排成一对）；ant 让尖端抖：1 翘起 / -1 压平
  const ANT_N = [[1, 0], [2, -1], [3, -1], [4, -2]], ANT_LIE = [[1, 0], [2, 1], [3, 1], [4, 2]];
  function antennae(rg) {
    E.part();
    const F = Q.headFrame(rg, shapeOf(), 0), a = P.ant | 0, lie = rg.lie === 2, vlo = -F.Hh * 0.35 - 0.7;
    const s = F.at(F.W + 1.9, vlo - 0.8), sx = R(s[0]), sy = R(s[1]);
    for (const far of [1, 0]) {
      const ox = sx - far, oy = sy - far, path = lie ? ANT_LIE : ANT_N;
      path.forEach(([dx, dy], i) => {
        const tip = i === path.length - 1, jit = lie || i < 2 ? 0 : a === 1 ? -(i - 1) : a === -1 ? 1 : 0;
        const mat = tip && !far ? m.claw : m.ant, t = far ? 3 : 4;
        U.dot(E, ox + dx, oy + dy + jit, mat, t);
      });
    }
  }
  // 候选部件：segTail —— 分节甲尾：3 格粗的甲壳节往后上方翘，每 2 格一道节缝，末端一个往下勾的骨白钩；P.tail 甩动
  function segTail(rg) {
    E.part();
    const lie = rg.lie === 2, sw = (P.tail | 0) * 0.1, n = 9;
    let x = rg.tail.x - 0.5, y = rg.tail.y + 1, a = lie ? 0.05 : 0.3;
    for (let k = 0; k < n; k++) {
      const nx = -Math.sin(a), ny = -Math.cos(a), w = k < 4 ? 1 : 0, seam = (k & 1) === 1;
      for (let j = -w; j <= w; j++) U.dot(E, x - nx * j, y + ny * j, M_PL, seam ? (j === -w ? 3 : 2) : j === -w ? 4 : 0);
      if (!lie) a += 0.09 + sw; x -= Math.cos(a); y -= Math.sin(a); if (y > -1) y = -1;
    }
    const hx = R(x), hy = R(y);                                                             // 尾钩：往后再往下勾
    U.dot(E, hx, hy, M_PL, 4); U.dot(E, hx - 1, hy, m.claw, 4); U.dot(E, hx - 2, hy + 1, m.claw, 3); U.dot(E, hx - 2, hy + 2, m.claw, 2);
  }
  // 近侧腿的腿甲（紧跟着腿画，并进腿的部件）：大腿 / 肩上一块 2 格甲片
  function legPlate(rg, i) {
    const L = rg.legs[i], p = [lerp(L.T[0], L.F[0], 0.3), lerp(L.T[1], L.F[1], 0.3)];
    U.dot(E, p[0], p[1], M_PL, 4); U.dot(E, p[0] + 1, p[1], M_PL, 3); U.dot(E, p[0], p[1] + 1, M_PL, 2);
  }
  // 松脱的甲片：d 死亡内秒数 → [0 还在身上 / 1 飞行 / 2 落地, x, 离地]；从尾往颈一节节松脱
  const DROP_DX = [-10, -6, -1, 4, 8, 12], DROP_HOP = [5, 7, 6, 8, 6, 7];
  function detachState(k) {
    if (P.lie !== 2) return [0, 0, 0];
    const c = B.dropAt(P.dfr / 12, { at: 0.72 + k * 0.11, dur: 0.25, dx: DROP_DX[k], hop: DROP_HOP[k] });
    return c;
  }
  // 候选部件：loosePlate —— 翻着跟头飞出去的一片甲：4 个朝向（正 → 竖 → 反 → 竖），落地是一只扣在地上的碗
  function loosePlate(x, y, s, k) {
    E.part();
    if (s === 2) { for (let i = -2; i <= 2; i++) U.dot(E, x + i, 0, M_PL, Math.abs(i) === 2 ? 2 : 3); for (let i = -1; i <= 1; i++) U.dot(E, x + i, -1, M_PL, i === -1 ? 4 : 3); return; }
    const r = (P.dfr + k) & 3;
    if (r === 0) { for (let i = -1; i <= 1; i++) U.dot(E, x + i, y - 1, M_PL, 4); for (let i = -2; i <= 2; i++) U.dot(E, x + i, y, M_PL, 2); }
    else if (r === 2) { for (let i = -2; i <= 2; i++) U.dot(E, x + i, y - 1, M_PL, 3); for (let i = -1; i <= 1; i++) U.dot(E, x + i, y, M_PL, 2); }
    else { for (let j = -2; j <= 1; j++) U.dot(E, x + (r === 1 ? 0 : 1), y + j, M_PL, j === -2 ? 4 : 3); U.dot(E, x + (r === 1 ? 1 : 0), y - 1, M_PL, 2); U.dot(E, x + (r === 1 ? 1 : 0), y, M_PL, 2); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = shapeOf(), lie = rig.lie === 2;
    if (!lie) Q.legs(E, rig, P, oo, 1);
    segTail(rig);
    Q.body(E, rig, P, oo);
    if (lie) lyingPlates(rig, oo);
    else {
      bodyPlates(rig, oo);
      Q.leg(E, rig, P, oo, 2); legPlate(rig, 2); Q.leg(E, rig, P, oo, 3); legPlate(rig, 3);
    }
    Q.head(E, rig, P, oo); helmet(rig);
    antennae(rig);
    if (lie) {
      Q.legs(E, rig, P, oo, 1); Q.legs(E, rig, P, oo, 0);
      const b = plateCols(rig);
      for (let k = 0; k < NPL; k++) {
        const c = detachState(k); if (!c[0]) continue;
        const x0 = R((b[k] + b[k + 1]) / 2);
        loosePlate(x0 + c[1], -1 - c[2], c[0], k);
      }
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12;
  const T_DEF = [0, 2 / 12, 4 / 12];                                                        // 三支箭打中背甲的时刻（施放内）
  const ARROW_T = 0.45;                                                                      // 箭飞行时长
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastI = -9, biteT = 9, biteX = 0, biteY = 0;
  let TGT = null;                                                                            // 三个中箭点（屏幕坐标）：打在第 3、1、4 节
  function targets() {
    if (TGT) return TGT;
    poseAt(CAST, 1 / 12, 0); const oo = shapeOf(), bx = P.bx;
    TGT = [3, 1, 4].map((k) => { const p = plateTop(rig, oo, k); return [HX + p[0] + bx, HY + p[1] + 1]; });   // 施放时不位移、不镜像
    poseAt(E.state, E.stT, E.simT);
    return TGT;
  }
  function chainT() { const s = E.state; return s === CHARGE ? E.stT : s === CAST ? DUR[CHARGE] + E.stT : s === RECOVER ? DUR[CHARGE] + DUR[CAST] + E.stT : -1; }
  function deflect(k) {                                                                      // 箭打在背甲上：星芒 + 琥珀火花 + 一声「当」
    const [x, y] = targets()[k];
    fx.cross(x, y - 1, 4, R_EL, 0.22); burst(x, y - 1, 10, 40, 100, 0.15, 0.4, R_EL, 14); burst(x, y - 1, 3, 60, 110, 0.3, 0.5, FXI.impact, 20);
    sfx('impact', { pal: 'metal', w: 0.3 });
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); hero.k1 = hero.k2 = -1;
      releaseOrbit(30, 80, 0.3, 0.6); deflect(0); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) { sfx('swing', { kind: 'bite', w: 0.4 }); }
    if (s === ATTACK && t === T_BITE) {                                                     // 一口咬合：两道咬合弧 + 火花 + 目标小摇
      const mx = scrX(R(rig.mouth[0]) + P.bx) + 1, my = HY + R(rig.mouth[1]); biteT = 0; biteX = mx; biteY = my;
      burst(mx + 2, my, 10, 30, 90, 0.12, 0.3, FXI.impact, 8); burst(mx + 1, my, 4, 30, 60, 0.2, 0.35, R_CHIP, 6);
      hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === CAST && t === T_DEF[1]) deflect(1);
    if (s === CAST && t === T_DEF[2]) {                                                      // 第三支：沿背甲溅起一排琥珀火花 + 小冲击环
      deflect(2); poseAt(CAST, t, t); const oo = shapeOf();
      for (let k = 0; k < NPL; k++) { const p = plateTop(rig, oo, k), x = scrX(p[0] + P.bx), y = HY + p[1]; for (let i = 0; i < 4; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 3, y, (Math.random() - 0.5) * 50, -40 - Math.random() * 50, 0.4 + Math.random() * 0.3, R_EL, { g: 200, floor: FLOOR - 1 }); }
      const c = plateTop(rig, oo, 2); ring(scrX(c[0] + P.bx), HY + c[1] + 2, 0, R_EL); shake(0.12, 1);
      sfx('impact', { pal: 'earth', w: 0.4 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 12 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.4 }); }
    if (s === DEATH && t > T_LAND) {                                                         // 一片甲落地：一小撮尘 + 咔哒
      const k = PL_LAND.indexOf(t); if (k >= 0) { poseAt(DEATH, t, t); const b = plateCols(rig), x0 = R((b[k] + b[k + 1]) / 2), x = scrX(x0 + DROP_DX[k] + P.bx);
        for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.3, FXI.dust); sfx('hit', { mat: 'wood', w: 0.1 }); }
    }
  }
  const PL_LAND = [0, 1, 2, 3, 4, 5].map((k) => Math.ceil((INCOMING + 0.72 + k * 0.11 + 0.25) * 12 - 1e-6) / 12);
  const EVENTS = [[], [], [T_HIT, T_BITE], [], [T_DEF[1], T_DEF[2]], [], [], [T_LAND].concat(PL_LAND), []];
  function hurtFx(s) {                                                                       // 甲壳挨打：撞击火花 + 琥珀甲屑 + 两颗长寿命白火星（硬壳）
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1] - 2;
    burst(hx, hy, s === DEATH ? 18 : 12, 50, 130, 0.2, 0.5, FXI.impact, 16); burst(hx, hy, s === DEATH ? 10 : 6, 40, 110, 0.25, 0.5, R_CHIP, 14);
    for (let i = 0; i < 2; i++) spawn(K_EMBER, hx, hy, (Math.random() - 0.3) * 30, -20 - Math.random() * 20, 0.6, FXI.impact);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                                                 // 接触帧咔哒一声 + 1 颗尘
      if (P.gf === 0 || P.gf === 2) { sfx('step', { w: 0.35 }); spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5), HY, (Math.random() - 0.5) * 10, -2 - Math.random() * 3, 0.25, FXI.dust); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                                    // 甩身：甲缝里抖出灰
      const lp = stT % DUR[IDLE], i = lp >= T_SHAKE - 1e-6 && lp < T_SHAKE + 4 / 12 ? f12of(lp - T_SHAKE) : -9;
      if (i >= 0 && i !== lastI) { const b = plateCols(rig); for (let k = 1; k < NPL; k++) { const x = scrX(b[k] + P.bx), s = backTop(rig, o, b[k]); if (s != null) spawn(K_DUST, x, HY + s - 3, (Math.random() - 0.5) * 14, -6 - Math.random() * 6, 0.35, FXI.dust); } }
      lastI = i;
    }
    if (state === CHARGE && stT > 0.5) {                                                     // 琥珀光点汇聚到亮起的那节甲
      chargeAcc += dt * 16;
      while (chargeAcc >= 1) { chargeAcc -= 1; const x = scrX(P.gx), y = HY + P.gy, r = 9 + Math.random() * 6, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, x, y, (r - 3) / (0.35 + Math.random() * 0.25), 0, 9, R_EL, { a, r, w: 5, tx: x, ty: y, squash: 0.6 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, FXI.soul); }
    }
    biteT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastI = -9; biteT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 候选部件：arrow45 —— 45° 飞行的敌箭（箭头朝左下）：白尖 + 3 格箭杆 + 两格箭羽，敌方色阶
  function arrow45(x, y) { put(x, y, EN[0]); put(x + 1, y - 1, EN[1]); for (let i = 2; i <= 4; i++) put(x + i, y - i, EN[2]); put(x + 5, y - 5, EN[1]); put(x + 4, y - 5, EN[1]); put(x + 5, y - 4, EN[1]); }
  // 弹开的箭：翻着跟头往上飞（4 个朝向），落地后斜插在地上一会儿
  const TUMBLE = [[1, 0], [1, -1], [0, 1], [1, 1]];
  function tumbleArrow(x, y, r) { const [dx, dy] = TUMBLE[r & 3]; for (let i = -2; i <= 2; i++) put(R(x + dx * i), R(y + dy * i), i === 2 ? EN[0] : i === -2 ? EN[1] : EN[2]); }
  function fxFront(f12) {
    const ct = chainT();
    if (ct >= 0) {
      const tg = targets();
      for (let k = 0; k < 3; k++) {
        const tArr = DUR[CHARGE] + T_DEF[k], tSp = tArr - ARROW_T, [tx, ty] = tg[k];
        if (ct >= tSp && ct < tArr) { const q = (ct - tSp) / ARROW_T, d = R(34 * (1 - q)); arrow45(tx + d, ty - d); }
        else if (ct >= tArr) {
          const dt = ct - tArr, vx = 34 + k * 14, vy = -95 - k * 12, g = 300, y = ty + vy * dt + 0.5 * g * dt * dt, x = tx + vx * dt;
          if (y < FLOOR - 2) tumbleArrow(R(x), R(y), f12of(dt) + k);
          else { const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (FLOOR - 2 - ty))) / g; if (dt - tl < 0.4 && ((f12 & 1) || dt - tl < 0.25)) { const lx = R(tx + vx * tl); put(lx, FLOOR - 1, EN[2]); put(lx + 1, FLOOR - 2, EN[2]); put(lx + 2, FLOOR - 3, EN[1]); } }
        }
      }
    }
    if (biteT < 2 / 12) {                                                                    // 咬合弧：上下两道往中间合
      const c = biteT < 1 / 12 ? EL[0] : EL[2], r = biteT < 1 / 12 ? 4 : 3;
      for (let k = 0; k <= 4; k++) { if (biteT >= 1 / 12 && (k & 1)) continue; const a = k / 4 * 1.3; put(biteX + R(Math.sin(a) * r), biteY - 1 - R(Math.cos(a) * r), c); put(biteX + R(Math.sin(a) * r), biteY + 1 + R(Math.cos(a) * r * 0.8), c); }
    }
  }

  return {
    name: '混沌邪犬', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_LIT, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'armor', how: 'topple', pal: 'earth', style: 'shield', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
