// 蜗牛（敌人 · 野兽 · 普通 · 近战 240）：「弱。主要用作收入来源。」同组最小的贴地小蛞蝓：淡粉米色软身、背上一只铜钱纹金螺壳，
// 壳顶竖着一枚方孔铜钱像顶小帽；两根眼柄一直一弯（呆萌不对称）；身后拖一道亮晶晶带金点的黏液。
// 攻击：身体前伸拉长，用头轻轻顶一下。技能（无特性 → 表现「收入来源」）：缩进壳里，壳上螺纹从外圈往里逐圈亮金、壳顶铜钱旋转 →
// 「啵」地探出头，壳里喷出一小串金币落在身后的黏液上 → 金币落地闪星芒，最大一枚飞向画面左上角（被收走）→ 眼柄伸出满足地晃晃。
// 死亡：缩壳掉钱——身体缩进壳里，空壳倒地滚半圈，壳顶铜钱弹飞、壳口掉出几枚金币，最后壳化灰。
PCD.define('Snail', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, gait, walkDemo, ramp, FXI, FXR, HY, INCOMING, DUMMY_X,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_TRAIL, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, L = B.blob, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.coin, EL = FXR[R_EL];                                                       // 收入 · 金币：白 → 淡金 → 金 → 暗金 → 棕
  const SOFT = ramp(['#2a1818', '#7a5050', '#c09080', '#e8c4b0']);                             // 淡粉米色软身（专属 4 色）
  const m = B.mats(E, { main: SOFT, shell: 'gold', groove: 'wood', slime: 'white' });
  m.body = E.defMat(SOFT, 1);                                                                  // 小软身用 band 1，不然整条发暗
  // 方孔铜钱：平涂，下标直接对应 [方孔 棕 20, 暗金 61, 面 62, 高光 5]；钱缘单独一个材质（金 14）。发光版同色，只是登记成发光体
  m.coin = E.defMat([20, 61, 62, 5], 1, 1); m.coinR = E.defMat([20, 14, 14, 14], 1, 1);
  m.coinG = E.defMat([20, 61, 62, 5], 1, 1); m.coinGR = E.defMat([20, 14, 14, 14], 1, 1);
  m.coinW = E.defMat([14, 5, 21, 21], 1, 1);                                                   // 施放爆闪（只 2 帧）：钱缘 5、面 21、方孔 14
  m.lit = E.defMat([61, 14, 5, 21], 1, 1);                                                     // 螺纹逐圈亮金（发光体）
  const OS = [5, 4, 3].map((r) => L.shape({ r, shape: 'slug', eye: null, tent: null, shell: 0, m }));   // 缩壳 0 / 1 / 2 档的软身；3 档 = 全缩进壳里
  const SH = { x: -1.5, y: -7.5, r: 4.5 };                                                     // 螺壳（站姿）

  const HX = 80, DUR = DEFAULT_DUR.slice(), hero = new Sprite(72, 30, 36, 26);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'spec', 'coinG', 'coinGR', 'coinW', 'lit', 'slime', 'groove', 'coin', 'coinR']) RIM.skip[m[k]] = 1;

  // 姿势字段：sq 压扁拉长 + / 缩短拉高 − · gf 足沿波纹 · hump 背上的波峰（0 无 / 1 尾 / 2 颈）· hdy 头上下 · jaw 张嘴
  //   ret 缩壳 0–3 · sb / sf 远 / 近眼柄长 0–4 · wag 近眼柄尖摆 · eyes 眯眼 · spin 铜钱转（宽 5 / 3 / 1 / 3）· glow 铜钱亮 0–3 · lit 螺纹亮圈数 0–4
  //   shx / shy 螺壳偏移 · rot 螺壳滚动（90° 一档）· cap 铜钱还在壳顶 · spill 壳口掉在地上的金币数 · trail 黏液长
  const SPEC = B.COMMON.concat([['gf', -1, 3], ['sq', -2, 2], ['hump', 0, 2], ['hdy', -2, 2], ['jaw', 0, 2], ['ret', 0, 3], ['sb', 0, 4], ['sf', 0, 4], ['wag', -1, 1],
    ['eyes', 0, 1], ['spin', 0, 3], ['glow', 0, 3], ['lit', 0, 4], ['shx', -8, 4], ['shy', -2, 4], ['rot', 0, 3], ['cap', 0, 1], ['spill', 0, 3], ['trail', 0, 10]]);
  const P = {};
  function reset() {
    L.reset(P); P.hump = 0; P.hdy = 0; P.jaw = 0; P.ret = 0; P.sb = 4; P.sf = 4; P.wag = 0; P.eyes = 0; P.spin = 0; P.glow = 0; P.lit = 0;
    P.shx = 0; P.shy = 0; P.rot = 0; P.cap = 1; P.spill = 0; P.trail = 7; P.rim = 1;
  }
  reset();
  const HIT_POINT = [1, -6];

  // ───── 姿势 ─────
  const F = ['sq', 'bx', 'hdy', 'sb', 'sf', 'wag'];
  const REST = { sq: 0, bx: 0, hdy: 0, sb: 4, sf: 4, wag: 0 };
  const WIND = { sq: -2, bx: -1, hdy: -1, sb: 3, sf: 2, wag: -1 };
  const BUTT = { sq: 2, bx: 3, hdy: 1, sb: 4, sf: 4, wag: 1 };
  const HOLD = { sq: 1, bx: 2, hdy: 0, sb: 4, sf: 4, wag: 1 };
  const ATK = [[0, REST], [0.12, WIND, 'out'], [2 / 12, BUTT, 'snap'], [0.25, BUTT, 'lin'], [0.45, HOLD, 'out'], [0.75, REST, 'inOut']];
  const PEEK = [[2, 4], [0, 4], [2, 4], [4, 2], [4, 0], [4, 4]];                                // 待机个性：两根眼柄交替缩回再伸出
  const T_HIT = 2 / 12, T_LAND = 0.38;
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = src[f]; };

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6);
    apply(REST); P.sq = b & 1 ? -1 : 0; P.wag = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.1) { const k = Math.min(5, f12of(lp - 1.6)); P.sb = PEEK[k][0]; P.sf = PEEK[k][1]; P.glow = k === 5 ? 2 : k === 4 ? 1 : 0; }
  }
  function capPos() { return [SH.x + P.shx, SH.y + P.shy - SH.r - 1]; }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 蛞蝓蠕行：拉长 → 尾部拱起 → 缩短 → 颈部拱起
      apply(REST); const f = gait(tq);
      P.gf = f; P.sq = [1, 0, -1, 0][f]; P.hump = [0, 1, 0, 2][f]; P.hdy = [1, 0, -1, 0][f]; P.wag = [-1, 0, 1, 0][f]; P.shy = [0, -1, 0, 0][f];
      P.sf = [4, 3, 4, 4][f]; P.trail = [8, 7, 7, 8][f];
      const w = walkDemo(tq, 6, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp); if (tq >= T_HIT && tq < 0.25) { P.eyes = 1; P.jaw = 1; }
    } else if (st === CHARGE) {                                                                // 缩进壳里，螺纹从外往里逐圈亮，铜钱旋转
      P.ret = Math.min(3, Math.floor(tq / 0.1 + 1e-6)); P.sb = P.sf = Math.max(0, 4 - Math.floor(tq / 0.07 + 1e-6)); P.shy = P.ret;
      P.lit = tq < 0.35 ? 0 : Math.min(4, 1 + Math.floor((tq - 0.35) / 0.2 + 1e-6));
      P.spin = tq < 0.5 ? 0 : f12 & 3; P.glow = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2;
      if (tq >= 1.1) P.shx = (f12 & 1) ? 1 : 0;                                                // 壳里憋着劲，壳一抖一抖
    } else if (st === CAST) {                                                                  // 「啵」地探出头
      apply(REST); P.sq = tq < 1 / 12 ? -2 : -1; P.hdy = -1; P.jaw = tq < 0.25 ? 2 : 1; P.wag = 1; P.lit = tq < 0.17 ? 4 : 0; P.glow = tq < 2 / 12 ? 3 : 2; P.rim = 3;   // 铜钱爆闪变白只 2 帧
    } else if (st === RECOVER) {                                                               // 眼柄伸出，满足地晃晃
      const q = ease.inOut(clamp01(tq / 0.6)); apply(REST);
      P.wag = tq < 0.5 ? ((f12 >> 1) & 1 ? 1 : -1) : 0; P.hdy = tq < 0.5 ? ((f12 >> 1) & 1 ? 0 : -1) : 0; P.eyes = tq >= 0.08 && tq < 0.42 ? 1 : 0;
      P.glow = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { apply(REST); P.bx = -2; P.sq = 1; P.sb = 1; P.sf = 1; P.wag = -1; P.eyes = 1; P.hdy = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { apply(REST); P.bx = -1; P.sb = 2; P.sf = 3; P.eyes = 1; P.rim = 0; }
      else { keys(h - 0.35, [[0, { sq: 0, bx: -1, hdy: 0, sb: 2, sf: 3, wag: 0 }], [0.15, REST]], tmp, F); apply(tmp); }
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.3) { apply(REST); P.bx = -2; P.sb = 1; P.sf = 1; P.eyes = 1; P.wag = -1; P.sq = (f12 & 1) ? 1 : -1; P.flash = d < 1 / 12 ? 1 : 0; }
      else {
        apply(REST); P.bx = -2; P.sb = 0; P.sf = 0;
        if (d < 0.5) { P.ret = Math.min(3, 1 + Math.floor((d - 0.3) / 0.07 + 1e-6)); P.shy = P.ret; }   // 缩进壳里
        else {                                                                                  // 空壳倒地滚半圈：离地 3 → 1 → 0
          P.ret = 3; P.cap = 0;
          if (d < 0.58) { P.rot = 1; P.shx = -1; P.shy = 1; }
          else if (d < 0.66) { P.rot = 1; P.shx = -3; P.shy = 2; }
          else { P.rot = 2; P.shx = -4; P.shy = 3; }
          P.spill = d < 0.75 ? 0 : d < 0.83 ? 1 : d < 0.92 ? 2 : 3;
          const dr = B.dropAt(d, { at: 0.5, dur: 0.3, dx: 9, hop: 5 }); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2];   // 壳顶铜钱弹飞
          P.glow = d < 0.9 ? ((f12 & 1) ? 1 : 0) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 0) : 0;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.ddir = 1; }
    for (const f of F) P[f] = R(P[f]);
    if (P.cap) { const c = capPos(); P.gx = R(c[0]) + P.bx; P.gy = R(c[1]); }
    else { P.gx = R(SH.x + 1 + P.dsx) + P.bx; P.gy = P.drop === 2 ? -1 : R(SH.y - SH.r - 1 - P.dsy + 3); }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 黏液：贴地一行，身后拖出，亮晶晶的金点
  function slime(x0, len) {
    E.part();
    for (let k = 0; k < len; k++) { const gold = (k % 4) === 2; U.dot(E, x0 - k, 0, gold ? m.shell : m.slime, gold ? 4 : k > len - 3 ? 2 : (k & 1) ? 3 : 4); }
  }
  // 候选部件：coinShell（金螺壳：圆壳 + 阿基米德螺纹凹槽 + 外圈钱纹亮点 + 空壳时的壳口；rot 按 90° 滚动；lit 螺纹从外圈往里亮 0–4 圈）
  const SPIRAL = (() => {                                                                      // 螺纹：从外圈往里的一条螺线（壳局部坐标 u 右 v 下，按 r = 1 归一）
    const pts = [], seen = new Set();
    for (let k = 0; k <= 40; k++) { const a = -2.2 + k * 0.36, rr = 0.86 * (1 - k / 44); if (rr < 0.12) break; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, k / 40]); }
    return pts.filter((p) => { const key = Math.round(p[0] * 45) + ',' + Math.round(p[1] * 45); if (seen.has(key)) return false; seen.add(key); return true; });
  })();
  function coinShell(cx, cy, r, rot, lit, empty) {
    E.part(); cx = R(cx); cy = R(cy);
    const map = (u, v) => (rot === 0 ? [u, v] : rot === 1 ? [v, -u] : rot === 2 ? [-u, -v] : [-v, u]);
    const n = Math.ceil(r) + 1;
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) if (dx * dx + dy * dy <= r * r + 0.6) U.dot(E, cx + dx, cy + dy, m.shell, 0);
    for (const [pu, pv, q] of SPIRAL) {                                                        // 螺纹凹槽（外圈 q 小）；亮起时从外圈往里
      const [x, y] = map(pu * r, pv * r), on = lit > 0 && q <= lit / 4 + 0.01;
      U.dot(E, cx + x, cy + y, on ? m.lit : m.groove, on ? (lit === 4 ? 4 : 3) : q < 0.3 ? 2 : 3);
    }
    for (const a of [-2.9, -1.4, 0.2, 1.7]) { const [x, y] = map(Math.cos(a) * (r - 1.2), Math.sin(a) * (r - 1.2)); U.dot(E, cx + x, cy + y, m.shell, 4); }   // 外圈钱纹亮点
    if (empty) { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const au = dx / 1.6, av = dy / 1.1; if (au * au + av * av > 1) continue; const [x, y] = map(R(r * 0.3) + dx, R(r * 0.45) + dy); U.dot(E, cx + x, cy + y, m.ink, 0); } }   // 空壳的壳口
  }
  // 候选部件：squareCoin（方孔铜钱：6×6 立着的一枚，圆角；金 14 钱缘一圈 → 面 62（受光的左上）/ 暗金 61（背光的右下）→ 左上 1 格 5 高光 →
  //   中间 2×2 棕 20 方孔；spin 转到侧面宽 6 / 4 / 2 / 4；flat 躺在地上；glow 1–2 同色（只登记成发光体），3 = 爆闪变白）
  function squareCoin(x, y, spin, glow, flat) {
    E.part(); x = R(x); y = R(y);
    const face = glow >= 3 ? m.coinW : glow ? m.coinG : m.coin, rim = glow >= 3 ? m.coinW : glow ? m.coinGR : m.coinR;
    if (flat) {                                                                                // 躺着：上面一排面（高光 · 方孔 · 暗金），下面一排钱缘
      U.dot(E, x - 1, y - 1, face, 4); U.dot(E, x, y - 1, face, 1); U.dot(E, x + 1, y - 1, face, 2);
      for (let k = -2; k <= 2; k++) U.dot(E, x + k, y, k === 2 ? face : rim, 2);
      return;
    }
    const hw = [3, 2, 1, 2][spin];
    for (let dy = -3; dy <= 2; dy++) for (let dx = -hw; dx < hw; dx++) {
      const ex = dx === -hw || dx === hw - 1, ey = dy === -3 || dy === 2;
      if (hw === 1) { U.dot(E, x + dx, y + dy, dx < 0 ? rim : face, dx < 0 ? 2 : dy === -3 ? 4 : 2); continue; }   // 转到侧面：一条钱缘 + 一条暗金
      if (ex && ey) continue;                                                                  // 圆角
      if (ex || ey) { U.dot(E, x + dx, y + dy, rim, 2); continue; }
      const hole = dy >= -1 && dy <= 0 && (hw === 3 ? dx >= -1 && dx <= 0 : dx === -1);
      const hi = dx === -hw + 1 && dy === -2, shade = dy === 1 || (hw === 3 && dx === hw - 2);
      U.dot(E, x + dx, y + dy, face, hole ? 1 : hi ? 4 : shade ? 2 : 3);
    }
  }
  // 候选部件：eyeStalks（一直一弯的一对眼柄：远侧直立、近侧上段往前弯；len 0–4 伸缩；柄用软身基色，末端眼球 1 格亮色 + 1 格墨瞳，eyes 眯成一条缝）
  const BENT = [[0, -1], [0, -2], [1, -3], [2, -4]];
  function eyeStalks(hx, hy, sb, sf, wag, eyes) {
    E.part();
    for (let k = 1; k <= sb; k++) U.dot(E, hx - 1, hy - k, m.limb, 3);
    if (sb > 0) { const ex = hx - 1, ey = hy - sb - 1; U.dot(E, ex, ey, m.limb, eyes ? 2 : 4); if (!eyes) U.dot(E, ex + 1, ey, m.ink, 0); }
    E.part();
    for (let k = 0; k < sf; k++) { const p = BENT[k]; U.dot(E, hx + 1 + p[0] + (k >= 2 ? wag : 0), hy + p[1], m.limb, 3); }
    if (sf > 0) { const p = BENT[sf - 1], ex = hx + 2 + p[0] + (sf >= 3 ? wag : 0), ey = hy + p[1] - (sf >= 3 ? 0 : 1); U.dot(E, ex, ey, m.limb, eyes ? 2 : 4); U.dot(E, ex + 1, ey, eyes ? m.limb : m.ink, eyes ? 1 : 0); }
  }
  function body() {
    const o = OS[P.ret], rig = L.rig(P, o);
    rig.head.y += P.hdy; rig.head.x -= P.ret;
    L.body(E, rig, P, o);
    const C = rig.C, hd = rig.head;
    if (P.hump) { const x = P.hump === 1 ? C.x - C.rx * 0.72 : C.x + C.rx * 0.45; U.disc(E, x, C.y - C.ry + 0.5, 1.6, m.body, 0); }   // 蠕行的波峰
    const fx0 = R(hd.x + hd.r), fy = R(hd.y + hd.r * 0.4);                                     // 嘴 + 一对小触角
    U.dot(E, fx0, fy, m.ink, 0); if (P.jaw) { U.dot(E, fx0, fy + 1, m.ink, 0); if (P.jaw > 1) U.dot(E, fx0 - 1, fy + 1, m.ink, 0); }
    U.dot(E, fx0 + 1, fy + 2, m.limb, 3); U.dot(E, fx0 + 2, fy + 2, m.limb, 2);
    U.dot(E, R(hd.x + 0.5), R(hd.y + 0.5), m.body, 4);                                          // 脸颊亮点
    return rig;
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const rig = L.rig(P, OS[Math.min(2, P.ret)]);
    if (P.dq < 1) slime(R(rig.C.x - rig.C.rx) + 1, P.trail);
    if (P.ret < 3) {
      const hd = rig.head; eyeStalks(R(hd.x - P.ret), R(hd.y + P.hdy - hd.r) + 1, P.sb, P.sf, P.wag, P.eyes);
      body();
    }
    coinShell(SH.x + P.shx, SH.y + P.shy, SH.r, P.rot, P.lit, P.ret === 3);
    if (P.cap) { const c = capPos(); squareCoin(c[0], c[1], P.spin, P.glow, 0); }
    else if (P.drop) squareCoin(SH.x + 1 + P.dsx, P.drop === 2 ? -1 : SH.y - SH.r - 1 - P.dsy + 3, 0, P.glow, P.drop === 2);
    for (let k = 0; k < P.spill; k++) squareCoin(SH.x + P.shx - SH.r - 3 - k * 6, -1, 0, 0, 1);   // 壳口掉出来的金币
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, ashAcc = 0, lastGf = -9, bigT = 9, bigX = 0, bigY = 0, bumpT = 9, bumpX = 0, bumpY = 0;
  const shellScr = () => [scrX(SH.x + P.shx + P.bx), HY + SH.y + P.shy];
  function onEnter(s) {
    if (s === CAST) {                                                                          // 啵：壳里喷出一小串金币
      const [sx, sy] = shellScr(), gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(30, 70, 0.25, 0.5); burst(gx, gy, 14, 30, 80, 0.2, 0.45, R_EL, 10); ring(sx, sy, 0, R_EL); fx.cross(gx, gy, 5, R_EL, 0.25, 2);
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, sx - 1 + Math.random() * 2, sy - 3, -12 - Math.random() * 26, -50 - Math.random() * 30, 0.95, R_EL, { g: 400, floor: HY, sz: i % 3 === 0 ? 2 : 1 });
      shake(0.28, 2); flash(0.05); bigT = 9;
    }
    if (s !== CAST && s !== RECOVER) bigT = 9;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                         // 头轻轻顶一下
      bumpT = 0; bumpX = scrX(12 + P.bx); bumpY = HY - 4;
      burst(DUMMY_X - 5, HY - 5, 8, 25, 60, 0.12, 0.3, FXI.impact, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'thrust', w: 0.1 }); sfx('hit', { mat: 'flesh', w: 0.1 });
    }
    if (s === CAST && t === T_LAND) {                                                           // 金币落地闪星芒，最大一枚飞向左上角
      const x0 = scrX(-9), x1 = scrX(-16);
      fx.cross(x0, HY - 2, 7, R_EL, 0.35, 2); fx.cross(x1, HY - 1, 5, R_EL, 0.3, 2); fx.cross(scrX(-5), HY - 1, 4, R_EL, 0.25, 2);
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, x0 + (Math.random() - 0.5) * 12, HY - 1, (Math.random() - 0.5) * 20, -25 - Math.random() * 20, 0.5, R_EL, { g: 300, floor: HY });   // 叮当弹两下
      bigT = 0; bigX = x0; bigY = HY - 3; shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.1 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                                 // 空壳落地，壳口洒出金币
      for (let i = 0; i < 10; i++) spawn(E.K_DUST, HX - 12 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      const [sx, sy] = shellScr();
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, sx - 3, sy - 1, -15 - Math.random() * 25, -30 - Math.random() * 25, 0.8, R_EL, { g: 300, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.1 });
    }
    if (s === DEATH && (t === INCOMING + 0.75 || t === INCOMING + 0.83 || t === INCOMING + 0.92)) { const x = scrX(SH.x + P.shx - SH.r - 3 - (P.spill - 1) * 6 + P.bx); fx.cross(x, HY - 2, 2, R_EL, 0.15, 2); }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_LAND], [], [], [INCOMING + 0.66, INCOMING + 0.75, INCOMING + 0.83, INCOMING + 0.92], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE && stT > 0.3) {                                                       // 金屑绕着壳收拢
      chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832, [sx, sy] = shellScr(); spawn(K_SPIRAL, sx, sy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) {
        if (f === 0 || f === 2) { sfx('step', { w: 0.1 }); spawnX(K_PHYS, scrX(-8), HY, 0, 0, 0.9, R_EL, { floor: HY, age0: 0.1 }); }   // 黏液里留下金点
        lastGf = f;
      }
    }
    if (bigT < 0.5) { const q = clamp01(bigT / 0.45), x = bigX + (4 - bigX) * ease.inOut(q), y = bigY + (5 - bigY) * ease.out(q) - Math.sin(q * Math.PI) * 10; if (bigT < 0.45) spawn(K_TRAIL, x, y, 10, 6, 0.25, R_EL); }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.5) {                      // 壳化灰 + 魂光
      ashAcc += dt * 26; while (ashAcc >= 1) { ashAcc -= 1; const [sx, sy] = shellScr(); spawn(K_RISE, sx - 5 + Math.random() * 10, sy - 4 + Math.random() * 8, (Math.random() - 0.5) * 8, -10 - Math.random() * 14, 0.7 + Math.random() * 0.6, Math.random() < 0.6 ? FXI.dust : FXI.soul); }
    }
    bigT += dt; bumpT += dt;
  }
  function fxReset() { chargeAcc = 0; ashAcc = 0; lastGf = -9; bigT = 9; bumpT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(SH.x + P.shx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (bumpT < 2 / 12) { const c = bumpT < 1 / 12 ? EL[0] : EL[2]; for (let k = -2; k <= 2; k++) { if (bumpT >= 1 / 12 && (k & 1)) continue; put(bumpX + 1 + (Math.abs(k) >> 1), bumpY + k, c); } }   // 顶一下的小弧
    if (P.glow >= 2 && P.cap && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy, Lr = P.glow === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= Lr; r++) { const c = r === 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (bigT < 0.45) {                                                                          // 最大一枚金币飞向左上角（被收走）：3×3 白芯 + 暗金外沿 + 身后 5 格金色尾迹
      const pos = (tt) => { const q = clamp01(tt / 0.45); return [bigX + (4 - bigX) * ease.inOut(q), bigY + (5 - bigY) * ease.out(q) - Math.sin(q * Math.PI) * 10]; };
      const [fx0, fy0] = pos(bigT), [px, py] = pos(Math.max(0, bigT - 0.05)), x = R(fx0), y = R(fy0);
      let vx = fx0 - px, vy = fy0 - py; const vl = Math.hypot(vx, vy);
      if (vl > 0.01) { vx /= vl; vy /= vl; for (let k = 2; k <= 6; k++) { const c = EL[k <= 3 ? 1 : k <= 5 ? 2 : 3]; put(R(fx0 - vx * k), R(fy0 - vy * k), c); if (k <= 4) put(R(fx0 - vx * k - vy * 0.6), R(fy0 - vy * k + vx * 0.6), c); } }
      for (const [dx, dy] of [[-1, -2], [0, -2], [1, -2], [-2, -1], [-2, 0], [-2, 1], [2, -1], [2, 0], [2, 1], [-1, 2], [0, 2], [1, 2]]) put(x + dx, y + dy, EL[3]);
      for (const [dx, dy, c] of [[-1, -1, 1], [0, -1, 1], [1, -1, 2], [-1, 0, 1], [1, 0, 2], [-1, 1, 2], [0, 1, 2], [1, 1, 2]]) put(x + dx, y + dy, EL[c]);
      put(x, y, EL[0]);
    }
  }

  return {
    name: '蜗牛', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.coinG, m.coinGR, m.coinW, m.lit], HIT_POINT, EVENTS,
    SFX: { body: 'flesh', how: 'collapse', pal: 'coin', style: 'coin', w: 0.1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
