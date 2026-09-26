// 巨蜗（敌人 · 野兽 · 普通 · 近战 240）：「近战肉盾（使用军团法术『巨型蜗牛』时可用）」。蜗牛的军团法术放大版：同样的眼柄和黏液、
// 同一色系更深的粉灰厚软身，但背上换成一只直径 22 格的铁箍战壳——三道铆钉铁环、壳顶一截尖锥铁撞角、壳侧挂一面画着小金蜗牛的方木盾；
// 两根粗眼柄各套一只铁护环，眼睛眯成缝。
// 攻击：软身后缩蓄力，然后连壳带身整个撞过去。技能（无特性 → 表现「近战肉盾」）：软身整个缩回壳里，三道铁箍从下到上逐道亮银、
// 壳下地面压出裂纹、火花沿铁环跑 → 壳猛地前顶 4 格，壳前立起半边银色点阵墙，冲过来的假人撞墙被顶回 → 墙逐点熄灭，眼柄小心地伸出来。
// 死亡：融流留壳——软身融化成一滩往前流走，只留铁箍巨壳倒在原地，木盾掉落，壳最后化灰。
PCD.define('GiantSnail', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, gait, walkDemo, ramp, FXI, FXR, HY, FLOOR, INCOMING, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, L = B.blob, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL];                                                      // 铁壳 · 冷铁：白 → 银 → 灰蓝 → 铁 → 深铁
  const FLESH = ramp(['#1e1216', '#4a3038', '#7a5860', '#a8868a']);                             // 暗粉灰厚软身（和蜗牛同色系更深）
  const m = B.mats(E, { main: FLESH, shell: 'sand', groove: 'wood', iron: [0, 27, 28, 29], rivet: 'gold', wood: 'wood', emb: 'gold', slime: 'white' });
  m.body = E.defMat(FLESH, 1);                                                                 // 厚软身用 band 1：band 2 在这么厚的身体上整片发暗
  m.lit = E.defMat([29, 30, 31, 21], 1, 1);                                                    // 铁箍亮银（发光体）
  m.hoop = E.defMat('steel', 1);                                                               // 铁箍 / 眼柄护环：暗 1c · 基 1d · 亮 1e（iron 的暗段近黑，壳上会切成黑条）
  m.stalk = E.defMat(FLESH, 1, 1);                                                             // 眼柄平涂：左亮 #a8868a、右基 #7a5860（不被前面的部件压成勾线）
  const OS = [11, 8, 5].map((r) => L.shape({ r, shape: 'slug', eye: null, tent: null, shell: 0, m }));   // 缩壳 0 / 1 / 2 档；3 档 = 全缩进壳里
  const SH = { x: -3, y: -16.5, r: 11 };                                                       // 铁箍巨壳（站姿）

  const HX = 67, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 52, 50, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 10, 18, 24], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'spec', 'lit', 'slime', 'groove', 'wood', 'emb', 'rivet', 'body', 'limb', 'far', 'stalk']) RIM.skip[m[k]] = 1;

  // 姿势字段：sq 压扁 + / 拉高 − · gf 足沿波纹 · hump 波峰（1 尾 / 2 颈）· hdy 头上下 · tuck 头缩到壳下 · jaw 张嘴 · eyes 闭眼
  //   ret 缩壳 0–3 · sl 眼柄长 0–6 · tx ty 眼柄尖偏移（转眼柄）· hl 亮起的铁箍数 0–3 · glint 铁环反光位置 0–4（0 无）
  //   shx shy 巨壳偏移 · rot 巨壳倒下（90° 一档）· mt 融化档 0–7 · drop dsx dsy 木盾掉落 · trail 黏液带长
  const SPEC = B.COMMON.concat([['gf', -1, 3], ['sq', -2, 2], ['hump', 0, 2], ['hdy', -2, 2], ['tuck', 0, 2], ['jaw', 0, 2], ['eyes', 0, 1], ['ret', 0, 3], ['sl', 0, 6],
    ['tx', -2, 2], ['ty', -2, 2], ['hl', 0, 3], ['glint', 0, 4], ['shx', -4, 8], ['shy', -2, 6], ['rot', 0, 1], ['mt', 0, 7], ['trail', 0, 14]]);
  const P = {};
  function reset() {
    L.reset(P); P.hump = 0; P.hdy = 0; P.tuck = 0; P.jaw = 0; P.eyes = 0; P.ret = 0; P.sl = 6; P.tx = 0; P.ty = 0; P.hl = 0; P.glint = 0;
    P.shx = 0; P.shy = 0; P.rot = 0; P.mt = 0; P.trail = 10; P.rim = 1;
  }
  reset();
  const HIT_POINT = [2, -14];

  // ───── 姿势 ─────
  const F = ['sq', 'bx', 'shx', 'shy', 'tuck', 'hdy', 'tx'];
  const REST = { sq: 0, bx: 0, shx: 0, shy: 0, tuck: 0, hdy: 0, tx: 0 };
  const WIND = { sq: -2, bx: -2, shx: -2, shy: -1, tuck: 0, hdy: -1, tx: -1 };
  const RAM = { sq: 1, bx: 11, shx: 5, shy: 1, tuck: 2, hdy: 1, tx: -2 };                      // 站位后移 5 格，前冲 11 格：出手帧壳侧正好碰到假人
  const HOLD = { sq: 1, bx: 10, shx: 4, shy: 1, tuck: 1, hdy: 0, tx: -1 };
  const ATK = [[0, REST], [0.12, WIND, 'out'], [2 / 12, RAM, 'snap'], [0.25, RAM, 'lin'], [0.45, HOLD, 'out'], [0.75, REST, 'inOut']];
  const ROLL = [[1, 0], [1, -1], [0, -2], [-1, -1], [-1, 0], [0, 1]];                             // 待机个性：眼柄慢慢转一圈
  const T_HIT = 2 / 12, T_WALL = 2 / 12;
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = src[f]; };

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6), s = Math.floor(TT * 1.25 + 1e-6) & 3;
    apply(REST); P.sq = b & 1 ? 1 : 0; P.hdy = b & 1 ? 1 : 0; P.shy = b & 1 ? 1 : 0;           // 喘气：软身一鼓一缩
    P.tx = [0, 1, 0, -1][s]; P.ty = [0, 0, -1, 0][s];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.1) { const k = Math.min(5, f12of(lp - 1.6)); P.tx = ROLL[k][0] * 2; P.ty = ROLL[k][1]; P.glint = Math.min(4, k + 1); }   // 眼柄转一圈 + 铁环反光
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 大型蠕行：拉长 → 尾拱 → 缩短 → 颈拱
      apply(REST); const f = gait(tq);
      P.gf = f; P.sq = [2, 0, -1, 0][f]; P.hump = [0, 1, 0, 2][f]; P.hdy = [1, 0, -1, 0][f]; P.shy = [1, -1, 0, 0][f]; P.shx = [1, 0, -1, 0][f]; P.tx = [-1, 0, 1, 0][f];
      P.trail = [12, 10, 10, 12][f];
      const w = walkDemo(tq, 8, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp); if (tq >= T_HIT && tq < 0.3) { P.eyes = 1; P.jaw = 1; }
    } else if (st === CHARGE) {                                                                // 软身整个缩回壳里，铁箍从下到上逐道亮
      P.ret = Math.min(3, Math.floor(tq / 0.12 + 1e-6)); P.sl = Math.max(0, 6 - Math.floor(tq / 0.05 + 1e-6)); P.shy = Math.min(5, Math.floor(tq / 0.07 + 1e-6));
      P.hl = tq < 0.45 ? 0 : tq < 0.7 ? 1 : tq < 0.95 ? 2 : 3; P.rim = 2;
      if (tq >= 1.1) P.shx = (f12 & 1) ? 1 : 0;
      P.glint = tq >= 0.45 ? 1 + (f12 & 3) : 0;
    } else if (st === CAST) {                                                                  // 壳猛地前顶 4 格
      P.ret = 3; P.sl = 0; P.shy = 5; P.hl = 3; P.shx = tq < 1 / 12 ? 2 : 4; P.rim = 3;
    } else if (st === RECOVER) {                                                               // 壳退回，眼柄小心地伸出来
      const q = clamp01(tq / 0.3); P.shx = R(4 * (1 - ease.inOut(q)));
      P.ret = tq < 0.25 ? 3 : tq < 0.35 ? 2 : tq < 0.45 ? 1 : 0; P.shy = [0, 2, 4, 5][P.ret];
      P.sl = P.ret ? 0 : Math.min(6, 1 + Math.floor((tq - 0.45) / 0.04 + 1e-6)); P.tx = P.ret ? 0 : (tq < 0.6 ? -1 : 0); P.eyes = tq < 0.55 ? 1 : 0;
      P.hl = tq < 0.2 ? 3 : tq < 0.35 ? 2 : tq < 0.5 ? 1 : 0; P.rim = tq < 0.35 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { apply(REST); P.bx = -2; P.sq = 1; P.shx = -1; P.sl = 4; P.tx = -2; P.eyes = 1; P.hdy = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { apply(REST); P.bx = -1; P.sl = 5; P.tx = -1; P.eyes = 1; P.rim = 0; }
      else { keys(h - 0.35, [[0, { sq: 0, bx: -1, shx: 0, shy: 0, tuck: 0, hdy: 0, tx: -1 }], [0.15, REST]], tmp, F); apply(tmp); }
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.3) { apply(REST); P.bx = -2; P.sq = (f12 & 1) ? 1 : 0; P.sl = 4; P.tx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else {                                                                                   // 融化成一滩往前流走；空壳落地、向后倒下
        P.bx = -2; P.sl = 0;
        P.mt = d < 0.4 ? 1 : d < 0.5 ? 2 : d < 0.58 ? 3 : d < 0.66 ? 4 : d < 0.9 ? 5 : d < 1.15 ? 6 : 7;
        P.shy = d < 0.4 ? 2 : d < 0.5 ? 3 : d < 0.58 ? 4 : 5; P.rot = d < 0.58 ? 0 : 1; P.shx = d < 0.58 ? 0 : -1;
        const dr = B.dropAt(d, { at: 0.55, dur: 0.25, dx: -9, hop: 4 }); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2];
        P.hl = d < 0.66 ? 0 : d < 1.0 ? ((f12 & 1) ? 1 : 0) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 0) : 0;   // 铁箍最后闪几下熄灭
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.ddir = 1; }
    for (const f of F) P[f] = R(P[f]);
    const sc = shellC(); P.gx = R(sc[0]) + P.bx; P.gy = R(sc[1]);
    B.key(P, SPEC);
  }
  function shellC() { return [SH.x + P.shx, SH.y + P.shy]; }

  // ───── 画 ─────
  function slime(x0, len) {                                                                    // 宽黏液带：两行，拖在身后
    E.part();
    for (let k = 0; k < len; k++) { U.dot(E, x0 - k, 0, m.slime, k % 5 === 2 ? 4 : k > len - 3 ? 2 : 3); if (k < len - 3) U.dot(E, x0 - k, -1, m.slime, k % 4 === 1 ? 4 : 2); }
  }
  // 候选部件：ironShell（铁箍战壳：骨黄螺壳 + 螺纹 + 三道带铆钉的铁箍（下 → 上可逐道亮起）+ 壳顶尖锥撞角；rot 1 = 向后倒下 90°）
  // 螺线：壳局部坐标（u 前 / v 下），从壳底外圈顺时针绕进壳心 1.5 圈（铁箍之间每段都落成弧），逐格取点保证 1 格宽、连续
  const SPIRAL = (() => {
    const pts = [], seen = new Set(), r = 11;
    for (let a = 0; a <= 1.0001; a += 0.002) {
      const th = 1.6 + a * 3 * Math.PI, rr = r * (0.88 - 0.7 * a), x = R(Math.cos(th) * rr), y = R(-0.5 + Math.sin(th) * rr), k = x + ',' + y;
      if (seen.has(k)) continue;
      const n = pts.length;                                                                     // 去掉拐角多出来的一格（L 形 → 斜线），保持 1 格宽
      if (n >= 2 && Math.abs(pts[n - 2][0] - x) <= 1 && Math.abs(pts[n - 2][1] - y) <= 1) pts.pop();
      seen.add(k); pts.push([x, y]);
    }
    return pts;
  })();
  const HOOPS = [0.5, 0.02, -0.46];                                                            // 铁箍所在高度（壳局部 v / r，下 → 上）
  function hoopV(i, u, r) { const b = HOOPS[i] * r, w = Math.sqrt(Math.max(0, r * r - b * b)); return b + 1.4 * (1 - Math.min(1, (u / w) ** 2)); }
  function ironShell(cx, cy, r, rot, hl, glint) {
    cx = R(cx); cy = R(cy);
    const map = (u, v) => (rot === 0 ? [u, v] : [v, -u]);
    const n = Math.ceil(r) + 1, dark = (x, y) => (x + y) / r > 0.42;                             // 左上受光：屏幕右下方的一弯压暗（倒地时也按屏幕方向）
    E.part();                                                                                   // 撞角（壳后面先画，根部压在壳下）
    const ax = 0.42, ay = -0.91, bx = -ay, by = ax, L0 = r - 1, L1 = r + 5.5;
    U.poly(E, [...map(ax * L0 + bx * 2.6, ay * L0 + by * 2.6), ...map(ax * L1, ay * L1), ...map(ax * L0 - bx * 2.6, ay * L0 - by * 2.6)].map((v, i) => v + (i & 1 ? cy : cx)), m.iron, 0);
    { const [x, y] = map(ax * (L1 - 1.5), ay * (L1 - 1.5)); U.dot(E, cx + x, cy + y, m.iron, 4); }
    E.part();
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= r * r + 0.8) U.dot(E, cx + dx, cy + dy, m.shell, dark(dx, dy) ? 2 : 3);   // 骨黄壳：基色 + 右下暗弯，不用自动明暗（螺纹边上会冒出零散高光）
    for (const [hx, hy] of [[-6, -8], [-5, -8], [-6, -7], [-7, -7]]) U.dot(E, cx + hx, cy + hy, m.shell, 4);   // 左上 1/4 一块 4 格高光
    for (const [u, v] of SPIRAL) { const [x, y] = map(u, v); U.dot(E, cx + x, cy + y, m.groove, dark(x, y) ? 2 : 3); }   // 一条连续的 wood 螺线，穿过铁箍处被铁箍盖住
    for (let i = 0; i < 3; i++) {                                                               // 铁箍 2 行：上行基色 1d（左侧 2 格亮 1e）、下行暗 1c + 每 5 格一颗金铆钉
      const on = i < hl;
      for (let u = -r; u <= r; u++) {
        const vv = R(hoopV(i, u, r));
        for (const dv of [-1, 0]) {
          const v = vv + dv; if (u * u + v * v > r * r + 0.3) continue; const [x, y] = map(u, v);
          const g = glint && i === 2 && Math.abs(u - (-r + glint * r * 0.45)) < 1;
          if (g || on) U.dot(E, cx + x, cy + y, m.lit, g || dv ? 4 : 3);
          else if (dv) U.dot(E, cx + x, cy + y, m.hoop, u >= -r * 0.66 && u <= -r * 0.46 ? 4 : 3);
          else { const riv = ((u + 40) % 5) === 2 && u * u + v * v < (r - 1.2) * (r - 1.2); U.dot(E, cx + x, cy + y, riv ? m.rivet : m.hoop, riv ? 3 : 2); }
        }
      }
    }
  }
  // 候选部件：plankShield（方形木盾：竖木板缝 + 铁包边 + 盾心金色小蜗牛纹；flat 倒在地上）
  // 盾心小金蜗牛（盾内坐标）：3×3 螺壳（一圈金 + 暗心，右下缺口成螺旋）+ 头 + 2 格眼柄 + 一行腹足
  const SNAIL_EMB = [[2, 2, 4], [3, 2, 3], [4, 2, 3], [2, 3, 3], [3, 3, 1], [4, 3, 3], [2, 4, 3], [3, 4, 3], [4, 4, 2],
    [6, 2, 4], [6, 3, 3], [5, 4, 3], [6, 4, 3], [1, 5, 2], [2, 5, 3], [3, 5, 3], [4, 5, 3], [5, 5, 3], [6, 5, 2]];
  function plankShield(x0, y0, flat) {
    E.part(); x0 = R(x0); y0 = R(y0);
    if (flat) { for (let x = 0; x < 9; x++) { U.dot(E, x0 + x, 0, x === 0 || x === 8 ? m.iron : m.wood, x % 3 === 0 ? 2 : 3); U.dot(E, x0 + x, -1, x === 0 || x === 8 ? m.iron : m.wood, 4); } U.dot(E, x0 + 4, -1, m.emb, 4); return; }
    for (let y = 0; y < 9; y++) for (let x = 0; x < 8; x++) {
      const edge = x === 0 || x === 7 || y === 0 || y === 8;
      U.dot(E, x0 + x, y0 + y, edge ? m.iron : m.wood, edge ? ((x + y) % 4 === 0 ? 4 : 0) : (x % 3 === 0 ? 1 : 0));
    }
    for (const [dx, dy, t] of SNAIL_EMB) U.dot(E, x0 + dx, y0 + dy, m.emb, t);
  }
  // 候选部件：ringStalks（一对粗眼柄：2 格粗平涂（左亮右基）、中段套一只铁护环、顶端 3×2 亮色眼球夹一行墨色眼缝；tx ty 让眼柄尖转动）
  function stalk(bx0, by0, len, tx, ty, far, eyes) {
    E.part(); if (len <= 0) return;
    const mat = m.stalk, topX = bx0 + tx, topY = by0 - len + ty, tl = far ? 3 : 4;               // 远侧眼柄整根基色，近侧左边一格亮色
    for (let k = 0; k <= len; k++) { const q = k / len, x = R(bx0 + (topX - bx0) * q), y = R(by0 + (topY - by0) * q); U.dot(E, x, y, mat, tl); U.dot(E, x + 1, y, mat, 3); }
    const ex = R(topX), ey = R(topY);                                                           // 眼球：上下两行亮色，中间一行墨缝（眯眼）
    for (let dx = 0; dx <= 2; dx++) { U.dot(E, ex + dx, ey - 2, mat, 4); U.dot(E, ex + dx, ey, mat, dx === 2 ? 3 : 4); U.dot(E, ex + dx, ey - 1, dx === 0 && !eyes ? mat : m.ink, dx === 0 && !eyes ? 4 : 0); }
    if (len >= 4) { E.part(); const q = 0.45, x = R(bx0 + tx * q), y = R(by0 + (topY - by0) * q); for (let dx = -1; dx <= 2; dx++) U.dot(E, x + dx, y, m.hoop, dx < 0 ? 4 : 3); }   // 铁护环：基色 1d + 左端 1 格亮 1e
  }
  function body() {
    const o = OS[P.ret], rig = L.rig(P, o);
    rig.head.y += P.hdy + P.tuck; rig.head.x -= P.ret * 2 + P.tuck * 2;
    L.body(E, rig, P, o);
    const C = rig.C, hd = rig.head;
    if (P.hump) { const x = P.hump === 1 ? C.x - C.rx * 0.75 : C.x + C.rx * 0.5; U.disc(E, x, C.y - C.ry + 0.5, 2.4, m.body, 0); }
    const fx0 = R(hd.x + hd.r), fy = R(hd.y + hd.r * 0.35);                                    // 嘴线 + 下触角 + 脸上一道旧疤
    for (let k = 0; k < 3; k++) U.dot(E, fx0 - k, fy + (k === 2 ? 1 : 0), m.ink, 0); if (P.jaw) U.dot(E, fx0, fy + 1, m.ink, 0);
    U.dot(E, fx0 + 1, fy + 2, m.limb, 3); U.dot(E, fx0 + 2, fy + 3, m.limb, 2); U.dot(E, fx0 - 1, fy + 3, m.limb, 3);
    U.dot(E, R(hd.x - 1), R(hd.y - 1), m.body, 1); U.dot(E, R(hd.x), R(hd.y), m.body, 1);
    return rig;
  }
  const MELT = [null, [17, 4, 0], [18, 3, 2], [19, 2, 5], [18, 1.6, 8], [15, 1.2, 13], [9, 0.8, 19]];   // [rx, ry, 往前流的格数]
  function puddle(k) {
    E.part(); const [rx, ry, dx] = MELT[k];
    U.oval(E, dx, -ry + 0.5, rx, ry, m.body, 0);
    for (let j = 0; j < 4; j++) U.dot(E, dx - rx * 0.6 + j * rx * 0.4, -ry * 0.9, m.body, 4);
    if (k >= 5) for (let j = 0; j < 3; j++) U.dot(E, dx - rx - 2 - j * 3, 0, m.body, 2);         // 流过留下的湿痕
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const [scx, scy] = shellC();
    if (P.mt === 0) {
      const rig = L.rig(P, OS[Math.min(2, P.ret)]);
      if (P.dq < 1) slime(R(rig.C.x - rig.C.rx) + 1, P.trail);
      if (P.ret < 3) {
        const hd = rig.head, hx = R(hd.x - P.ret * 2 - P.tuck * 2), top = R(hd.y + P.hdy + P.tuck - hd.r) + 1, sl = Math.max(0, P.sl - P.tuck * 2 - P.ret * 2);
        stalk(hx - 3, top, sl - 1, R(P.tx * 0.7) - 1, P.ty, 1, P.eyes);                          // 两根眼柄张成 V 字
        stalk(hx + 1, top, sl, P.tx + 1, P.ty, 0, P.eyes);
        body();
      }
    } else if (P.mt < 7) puddle(P.mt);
    ironShell(scx, scy, SH.r, P.rot, P.hl, P.glint);
    if (!P.drop) { if (P.rot === 0) plankShield(scx - 12, scy + 1, 0); }
    else plankShield(scx - 12 + P.dsx, P.drop === 2 ? 0 : scy + 1 + (P.shy ? 0 : 0) - P.dsy, P.drop === 2);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const WALL = { rx: 16, ry: 29, gap: 3 }, PHI_HIT = 0.54;                                    // 墙：以壳前 4 格为圆心的 1/4 椭圆，内层与外层隔 2 空格；中段离壳前沿 4–5 格
  let chargeAcc = 0, ashAcc = 0, lastGf = -9, wallT = 9, fadeT = 9, wallX = 0, hitT = 9, sparkT = 9, smT = 9, smX = 0, smY = 0;
  const shellScr = () => [scrX(SH.x + P.shx + P.bx), HY + SH.y + P.shy];
  const wallN = () => Math.ceil(Math.PI * (WALL.rx + WALL.ry) / 4 / 1.5);
  function onEnter(s) {
    if (s === CHARGE) { wallT = 9; fadeT = 9; }
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [sx, sy] = shellScr();
      releaseOrbit(40, 100, 0.3, 0.6); burst(sx + 8, sy, 24, 50, 130, 0.25, 0.6, R_EL, 10); ring(sx + 6, sy + 2, 1, R_EL); fx.cross(sx + 10, sy - 6, 6, R_EL, 0.25, 2);
      for (let i = 0; i < 8; i++) spawn(K_DUST, sx + 6 + Math.random() * 10, HY - 1, 20 + Math.random() * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05); wallT = 0; fadeT = 9; hitT = 9; wallX = HX + SH.x + 4 + 4;
    }
    if (s === RECOVER) fadeT = 0;
    if (s === IDLE || s === HURT || s === DEATH || s === MOVE || s === ATTACK) { wallT = 9; fadeT = 9; }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                          // 连壳带身撞上去
      smT = 0; smX = DUMMY_X - 5; smY = HY - 14;
      burst(DUMMY_X - 5, HY - 12, 16, 40, 120, 0.15, 0.4, FXI.impact, 10); burst(DUMMY_X - 5, HY - 12, 8, 30, 80, 0.2, 0.4, R_EL, 8);
      for (let i = 0; i < 6; i++) spawn(K_DUST, HX + 8 + Math.random() * 12, HY, (Math.random() - 0.2) * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      hitDummy(1, 1); shake(0.1, 1); sfx('swing', { kind: 'smash', w: 0.85 }); sfx('hit', { mat: 'metal', w: 0.85 });
    }
    if (s === CHARGE && t === 0.45) {                                                            // 壳压地，地面裂一圈
      const [sx] = shellScr(); fx.crack(sx + 4, FLOOR, 14, 1, R_EL, 1.0); fx.crack(sx - 4, FLOOR, 14, -1, R_EL, 1.0);
      for (let i = 0; i < 10; i++) spawn(K_DUST, sx - 10 + Math.random() * 20, HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1);
    }
    if (s === CAST && t === T_WALL) {                                                            // 假人撞墙被顶回
      const x = R(wallX + Math.cos(PHI_HIT) * WALL.rx), y = R(HY - Math.sin(PHI_HIT) * WALL.ry);
      hitT = 0; burst(x, y, 20, 50, 140, 0.25, 0.55, R_EL, 10); ring(x, y, 1, R_EL); fx.cross(x, y, 5, R_EL, 0.25, 2);
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, x, y, 30 + Math.random() * 50, -40 - Math.random() * 40, 0.5, R_EL, { g: 300, floor: HY });
      hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.85 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                                  // 空壳倒地
      const [sx] = shellScr();
      for (let i = 0; i < 16; i++) spawn(K_DUST, sx - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 36, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      burst(sx - 6, HY - 10, 8, 30, 70, 0.15, 0.35, R_EL, 6); shake(0.12, 1); sfx('fall', { w: 0.85 });
    }
    if (s === DEATH && t === INCOMING + 0.8) { const x = scrX(SH.x - 12 - 9 + 4 + P.bx); for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3, FXI.dust); sfx('hit', { mat: 'wood', w: 0.4 }); }   // 木盾落地
  }
  const EVENTS = [[], [], [T_HIT], [0.45], [T_WALL], [], [], [INCOMING + 0.66, INCOMING + 0.8], []];
  function stepFX(dt, state, stT) {
    const [sx, sy] = shellScr();
    if (state === CHARGE && stT > 0.35) {                                                       // 银屑往铁箍收拢
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, sx, sy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) {
        if (f === 0 || f === 2) { const x = scrX(f === 0 ? 14 : -12); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 0.85 }); }
        lastGf = f;
      }
    }
    if (state === DEATH && stT > INCOMING + 0.3 && stT < INCOMING + 1.2 && Math.random() < dt * 14) { const k = Math.max(1, P.mt), dx = k < 7 ? MELT[Math.min(6, k)][2] : 20; spawnX(K_PHYS, scrX(dx + 10 + P.bx), HY - 2, 20 + Math.random() * 20, -10 - Math.random() * 10, 0.4, FXI.dust, { g: 200, floor: HY }); }   // 往前流的黏液溅点
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.5) {                       // 巨壳化灰 + 魂光
      ashAcc += dt * 34; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_RISE, sx - 11 + Math.random() * 22, sy - 10 + Math.random() * 20, (Math.random() - 0.5) * 8, -10 - Math.random() * 16, 0.7 + Math.random() * 0.7, Math.random() < 0.6 ? FXI.dust : FXI.soul); }
    }
    wallT += dt; fadeT += dt; hitT += dt; sparkT += dt; smT += dt;
  }
  function fxReset() { chargeAcc = 0; ashAcc = 0; lastGf = -9; wallT = 9; fadeT = 9; hitT = 9; smT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(SH.x + P.shx + P.bx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (P.hl > 0 && P.hl < 3 + 1 && (E.state === CHARGE || E.state === CAST)) {                 // 火花沿亮起的铁箍跑一圈
      const [sx, sy] = shellScr(), i = P.hl - 1, u = -SH.r + ((f12 * 3) % (2 * SH.r + 1)), v = R(hoopV(i, u, SH.r)) - 1;
      if (u * u + v * v <= SH.r * SH.r) { put(sx + u, sy + v - 1, EL[0]); put(sx + u - 1, sy + v - 1, EL[1]); put(sx + u, sy + v - 2, EL[2]); }
    }
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[0] : EL[2]; for (let k = -5; k <= 5; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX - 2 + (Math.abs(k) >> 1), smY + k, c); } }   // 撞击的弧线
    const on = wallT < DUR[CAST] + 0.02 || fadeT < 0.55; if (!on) return;                     // 半边银色点阵墙：从地面往上立起，内外两层；收招时逐点熄灭
    const n = wallN(), rev = wallT < 0.12 ? wallT / 0.12 : 1, gone = fadeT < 0.55 ? fadeT / 0.5 : 0;
    for (let k = 0; k <= n; k++) {
      const q = k / n, a = q * Math.PI / 2; if (q > rev * 1.02) continue;
      if (gone && U.hash(k, 7) < gone) continue;
      const x = R(wallX + Math.cos(a) * WALL.rx), y = R(HY - Math.sin(a) * WALL.ry), lead = rev < 1 && q > rev - 0.15;
      put(x, y, lead ? EL[0] : ((k + (f12 >> 1)) & 1) ? EL[1] : EL[2]);
      if ((k & 1) === 0 && !(gone && U.hash(k, 3) < gone * 1.2)) put(R(wallX + Math.cos(a) * (WALL.rx - WALL.gap)), R(HY - Math.sin(a) * (WALL.ry - WALL.gap)), ((k >> 1) + f12) % 3 ? EL[2] : EL[3]);
    }
    if (hitT < 2 / 12) {                                                                         // 撞墙那一段：内外两层连成实线，第 1 帧全白、第 2 帧外白内银
      for (let a = PHI_HIT - 0.3; a <= PHI_HIT + 0.3; a += 0.01) {
        put(R(wallX + Math.cos(a) * WALL.rx), R(HY - Math.sin(a) * WALL.ry), EL[0]);
        put(R(wallX + Math.cos(a) * (WALL.rx - WALL.gap)), R(HY - Math.sin(a) * (WALL.ry - WALL.gap)), hitT < 1 / 12 ? EL[0] : EL[1]);
      }
    }
  }

  return {
    name: '巨蜗', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.lit], HIT_POINT, EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'shield', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
