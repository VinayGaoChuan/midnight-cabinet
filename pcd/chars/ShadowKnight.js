// 影骑士（部队 · 自然 · 召唤师 · 神话）：影剑士进化而来——狐面具长成覆盖全头的白金狐首盔（一对尖耳向后掠、眼缝亮紫白光），
// 墨紫夜甲 + 拖到身后地面的破披风（下摆碎成影子锯齿），肩上蹲一只小狐影；双手裂织巨剑，墨黑剑身中间一道空心的紫白裂隙。
// 攻击 = 劈：双手举剑过顶，竖直劈下。
// 技能 = 特性「憎恨繁殖者」（每 5 次攻击召唤一个超级随从）：巨剑高举、剑中裂隙亮起，四周空气出现紫白折线细裂纹向剑刃汇聚 →
//        竖劈落下，身前空中留下一条高 26 格的竖直裂缝 → 裂缝向两侧撕开成菱形空洞，一个 1:1 的影骑士剪影从裂隙里踏出 → 裂缝从两端合拢，巨剑回到拄地。
PCD.define('ShadowKnight', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8, hash, copySprite, fxRamp, near,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_TRAIL,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：裂织 · 紫白裂隙（magic 偏紫；和影剑士的墨青拉开）─────
  const LAV = '#e4dbff';
  const R_EL = fxRamp('riftweave', [21, LAV, 43, 42, 52]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const ARMOR = [0, 52, 53, '#52407a'];                       // #08050e / #1c1230 / #32224e 和共享色 0 / 52 / 53 几乎一样，直接用共享色
  const M = parts.mats(E, {
    armor: { r: ARMOR, band: 1 }, plate: { r: ARMOR, band: 2 },   // 墨紫夜甲（主材质）
    cape: { r: [0, 52, 8, 9], band: 1 },                         // 墨黑破披风
    helm: 'white', gold: 'gold', fox: [0, 52, 53, 54],           // 白金狐首盔、金边、小狐影
    blade: [0, 52, 8, 9], wrap: [0, 11, 12, 13],                 // 墨黑剑身、酒红缠柄
    rift: { r: [42, 43, LAV, 21], flat: 1 },                     // 剑中裂隙 / 盔眼（发光体）
  });
  const BODY = { body: 'heroic', leg: 11, torso: 11, head: 7, headW: 7, sw: 5, arm: 11, stride: 2, lift: 1, fall: 'front' };
  const SW_LEN = 20;
  const HX = 66, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 68, 38, 63);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['blade', 'rift', 'gold', 'wrap', 'helm']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握剑（hx hy a = 握点与剑身方向），后手叠在前手上方 2 格 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, fox: 0, only: 0, crack: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -22, Math.PI);                            // 巨剑拄地，双手交叠按在剑柄上
  const K_CARRY = K(6, -21, -0.55);                              // 移动：剑扛在肩上
  const K_RAISE = K(2, -31, -0.35, -1, -1);                      // 举剑过顶
  const K_CHOP = K(12, -19, HALF + 0.15, 1, 1);                  // 竖直劈下
  const K_FOLLOW = K(11, -15, 2.3, 1, 1, 1);
  const K_CHARGE = K(3, -32, 0, -1, -1);                         // 蓄力：巨剑竖直高举
  const K_CAST = K(12, -16, 2.6, 1, 1, 2);                       // 施放：劈到底
  const K_HURT = K(7, -21, 2.85, -1, -1);
  const K_KNEEL = K(10, -17, Math.PI, 1, 1, 4);                  // 死亡：单膝跪地，剑插在身前
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['fox', 0, 2], ['only', 0, 2], ['crack', 0, 2]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['lift', 0, 3]]);
  const SWAY_IDLE = [0, 1, 2, 1, 0, -1], T_CHOP = 2 / 12, BOLTS = [0.5, 0.8, 1.1], T_OPEN = 0.12, T_STEP = 0.3, RIFT_X = HX + 22;
  const T_KNEE = INCOMING + 0.34, T_SHATTER = INCOMING + 0.7, T_BLINK = INCOMING + 1.0;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.fox = 0; P.only = 0; P.crack = 0;
    const idle = () => {                                                 // 拄剑呼吸；披风下摆慢慢翻卷；个性：肩上小狐影回头甩尾，裂隙一闪
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 2.5 + 1e-6) % 6]; P.bend = P.sway > 0 ? 1 : 0;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); P.fox = i === 0 || i === 3 ? 1 : 2; P.glint = i === 1 || i === 2 ? 1 : 0; P.gem = P.glint; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 滑行：步子很小、身体不起伏，披风拖地
      setK(K_CARRY, K_CARRY, 0); parts.gait(P, E.gait(tq)); P.bob = 0; P.sway = -1 + (P.wup ? 1 : 0); P.bend = 2; P.a += P.step * 0.05;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_CHOP) { setK(K_IDLE, K_RAISE, ease.out(clamp01(tq / 0.12))); P.gem = 1; P.sway = 1; }
      else if (tq < 0.25) { setK(K_CHOP, K_CHOP, 0); P.bx = 3; P.gem = 3; P.rim = 2; P.sway = -2; P.bend = 2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - 0.25) / 0.2)); setK(K_CHOP, K_FOLLOW, q); P.bx = 3; P.gem = 2; P.sway = -1; P.bend = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.gem = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.7 ? 2 : 3; P.bend = RD(q * 3); P.sway = q > 0.5 ? ((f12 & 1) ? -2 : -1) : 0; P.fox = q > 0.5 ? 2 : 0;
    } else if (st === CAST) { setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.sway = -2; P.bend = 3; P.glint = tq < 0.2 ? 1 : 0; }
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bend = RD(2 * (1 - q)); }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.bend = 0; P.fox = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 碎裂：跪地拄剑 → 身上裂开紫白裂纹 → 像镜子一样碎成块 → 巨剑竖插在地上一闪后熄灭
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.gem = (f12 & 1) ? 2 : 1; P.crack = d < 0.45 ? 0 : d < 0.58 ? 1 : 2;
        if (d >= T_SHATTER - INCOMING) { P.only = 2; P.gem = d < T_BLINK - INCOMING ? 1 : d < T_BLINK - INCOMING + 0.17 ? 3 : 4; P.glint = P.gem === 3 ? 1 : 0; }   // 之后身体交给死亡套件（碎块），精灵只剩插在地上的剑
        if (d >= 1.7) P.dq = clamp01((d - 1.7) / 0.7);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.bhx = RD(P.hx - dx * 2.5); P.bhy = RD(P.hy - dy * 2.5);
    const f = swordGeo(P.hx, P.hy, P.a).mid; P.gx = f[0] + P.bx; P.gy = f[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：riftSword 裂织双手巨剑——吸附方向画 3 格宽剑身：左 / 上沿刃光、中列是一道空心裂隙（发光体，5 档：0 暗紫隔格亮 · 1 · 2 · 3 整把剑发光 · 4 熄灭）、
  //   右 / 下沿暗；宽十字护手 7 格（金）、3 格缠柄、金柄头；剑尖 1 格。o = { len, glowLv }。一个部件。返回 { mid 剑身中段, tip }
  function swordGeo(gx, gy, a, len) {
    const di = parts.snapDir(a), s8 = parts.cell(di, 0, 0, 8), c100 = parts.cell(di, 0, 0, 100), maj = 100 / Math.hypot(c100[0], c100[1]);
    const sx = s8[0] < 0 ? gx - 1 : gx, sy = s8[1] < 0 ? gy - 1 : gy, n = RD((len || SW_LEN) * maj);
    return { di, sx, sy, n, mid: parts.cell(di, sx, sy, 2 + RD(n * 0.45)), tip: parts.cell(di, sx, sy, n + 2) };
  }
  function riftSword(T, gx, gy, a, lv) {
    const G = swordGeo(gx, gy, a), di = G.di, n = G.n, pd = (di + 4) % 16;
    E.part();
    parts.bar(di, G.sx, G.sy, -4, -4, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.gold, 4));
    parts.bar(di, G.sx, G.sy, -3, 0, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.wrap, (k & 1) ? 3 : 2));
    const c = parts.cell(di, G.sx, G.sy, 1); parts.bar(pd, c[0], c[1], -3, 3, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.gold, k === -3 ? 4 : k === 3 ? 2 : 3));
    parts.bar(di, G.sx, G.sy, 2, n + 1, 3, (k, j, X, Y) => {
      let m = M.blade, t = j === 0 ? 4 : j === 2 ? 2 : 3;
      if (j === 1 && k >= 3 && k <= n - 1) {
        if (lv === 4) t = 1;
        else { m = M.rift; t = lv === 3 ? 4 : lv === 2 ? ((k & 1) ? 4 : 3) : lv === 1 ? 3 : ((k % 3) === 0 ? 3 : 2); }
      } else if (lv === 3 && j !== 1 && k > 2) { m = M.rift; t = 2; }
      parts.px(E, T, X, Y, m, t);
    });
    parts.bar(di, G.sx, G.sy, n + 2, n + 2, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.blade, 3));
    if (P.glint && lv < 4) { const g = G.mid; parts.px(E, T, g[0] - 1, g[1] - 1, M.rift, 4); }
    return G;
  }
  // 候选部件：foxHelm 狐首全盔——盖住整个头（圆顶、下颌、后颈护甲外翻），前伸 3 格的狐吻（黑鼻尖），眉脊和腮线金边，
  //   眼缝 2 格发光（P.eyes 闭上变暗）；一对尖耳向后掠、高出盔顶 5 格（后耳暗一级、更往后倒，耳尖分开 3 格以上）。耳朵单独一个部件（先画）
  function foxHelm(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, px = (x, y, m, t) => parts.px(E, R, x, y, m, t);
    E.part();
    for (let k = 1; k <= 4; k++) { const w = Math.max(1, 3 - (k >> 1)), x = RD(x0 + 1 - k * 1.6); for (let i = 0; i < w; i++) px(x + i, top - 1 - k, M.helmD, 0); }   // 后耳
    for (let k = 1; k <= 5; k++) { const w = Math.max(1, 3 - (k >> 1)), x = RD(x0 + 3 - k * 0.5); for (let i = 0; i < w; i++) px(x + i, top - 1 - k, M.helm, k === 5 ? 4 : 0); if (k >= 2 && k <= 3) px(x + w - 1, top - 1 - k, M.gold, 2); }   // 前耳 + 金色耳内
    E.part();
    parts.run(E, R, top - 1, x0 + 1, x1 - 2, M.helm, 0);
    for (let y = top; y <= bot; y++) parts.run(E, R, y, y === bot ? x0 + 1 : x0, x1, M.helm, 0);
    parts.run(E, R, bot + 1, x0 - 1, x0 + 2, M.helm, 2); px(x0 - 1, bot, M.helm, 0);          // 后颈护甲外翻
    parts.run(E, R, ey + 1, x1 + 1, x1 + 2, M.helm, 0); parts.run(E, R, ey + 2, x1 + 1, x1 + 3, M.helm, 0); px(x1 + 1, ey + 3, M.helm, 2);   // 狐吻
    px(x1 + 3, ey + 2, M.blade, 1); px(x1 + 2, ey + 1, M.helm, 4);                              // 黑鼻尖、吻上高光
    parts.run(E, R, ey - 2, x0 + 2, x1, M.gold, 3); px(x1, ey - 2, M.gold, 4);                  // 眉脊金边
    parts.run(E, R, bot, x1 - 3, x1 - 1, M.gold, 2);                                            // 腮线金边
    px(x1 - 2, ey, M.blade, 1);
    if (P.eyes || P.gem === 4) { px(x1 - 1, ey, M.blade, 1); px(x1, ey, M.blade, 1); }
    else { px(x1 - 1, ey, M.rift, P.gem >= 2 ? 4 : 3); px(x1, ey, M.rift, P.gem >= 1 ? 4 : 3); }
    px(x0 + 1, top, M.helm, 4); px(x0 + 2, top, M.helm, 4);
  }
  // 候选部件：shoulderFox 肩上的小狐影——蹲在后肩上、面朝后方的墨紫小狐（尖耳、一只紫白眼、尾巴翘起）。o.pose 0 蹲 · 1 回头 · 2 甩尾。一个部件
  function shoulderFox(R, pose) {
    const x = R.sBx - 1, y = R.sBy - 4, px = (a, b, m, t) => parts.px(E, R, a, b, m, t);
    E.part();
    parts.run(E, R, y, x - 3, x, M.fox, 0); parts.run(E, R, y - 1, x - 3, x - 1, M.fox, 0);        // 身子
    const hx = pose === 1 ? x + 1 : x - 4;                                                         // 头：朝后，回头时朝前
    parts.run(E, R, y - 2, hx - 1, hx + 1, M.fox, 0); parts.run(E, R, y - 3, hx - 1, hx + 1, M.fox, 0); px(hx - 1, y - 4, M.fox, 4); px(hx + 1, y - 4, M.fox, 3);
    px(pose === 1 ? hx + 1 : hx - 1, y - 3, M.rift, 3);                                            // 眼
    if (pose === 2) { px(x + 1, y - 1, M.fox, 0); px(x + 2, y - 2, M.fox, 0); px(x + 2, y - 3, M.fox, 4); }   // 甩尾：尾巴翘到另一边
    else { px(x + 1, y, M.fox, 0); px(x + 2, y - 1, M.fox, 3); }
  }
  // 破披风：parts.cape（tattered）之后在同一部件里补拖地的一段——沿地面往后再拖 6 格，末端碎成影子锯齿
  function cape(R) {
    const c = parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: 0, flare: 7 }), L = c.back, sw = RD(P.sway || 0);
    for (let k = 1; k <= 6; k++) { const x = L - k; if (((k + sw) % 3) === 0 && k > 2) continue; parts.px(E, R, x, 0, M.cape, k > 4 ? 2 : 0); if (k < 4) parts.px(E, R, x, -1, M.cape, 0); }
    parts.px(E, R, L - 8, 0, M.cape, 2);
  }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.only === 2) { riftSword(parts.FREE, 10, -14, Math.PI, P.gem); return; }             // 碎裂后只剩插在地上的剑（和跪姿同一个位置）
    const R = parts.rig(P, BODY);
    cape(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armorD, pauldron: M.armorD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.armor, matD: M.armorD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.cape, belt: M.wrap, buckle: M.gold, hem: -3, flare: 3 });
    shoulderFox(R, P.fox);
    foxHelm(R);
    if (!P.only) { riftSword(R, P.hx, P.hy, P.a, P.gem); parts.hand(E, R, P, { side: 'B', hand: M.armorD, grip: 'big' }); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.armor, pauldron: M.armor, pStyle: 'spike', hand: M.armor, grip: 'big' });
  }
  // 裂纹（死亡）：从胸口向外放射的紫白细线，和镜子裂开一样；只描在精灵已有的像素上
  const CRACKS = [[0, -14, -5, -24], [0, -14, 6, -6], [0, -14, -6, -5], [0, -14, 7, -22], [-5, -24, -8, -28], [6, -6, 9, -2]];
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.crack) {
      const o = hero.out, w = hero.w, n = P.crack === 1 ? 2 : CRACKS.length;
      for (let i = 0; i < n; i++) {
        const [a, b, c, d] = CRACKS[i], L = Math.max(Math.abs(c - a), Math.abs(d - b));
        for (let s = 0; s <= L; s++) { const X = RD(a + (c - a) * s / L + hero.ox + P.bx + 1), Y = RD(b + (d - b) * s / L + hero.oy); const k = Y * w + X; if (X >= 0 && X < w && Y >= 0 && Y < hero.h && o[k] !== 255) o[k] = s < 2 ? EL[0] : (s & 1) ? EL[1] : EL[2]; }
      }
    }
  }

  // ───── 特效 ─────
  const clone = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let riftT = 9, cloneT = 9, trailAcc = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function snap(dst, st, t) { poseAt(st, t, t); drawHero(); bakeHero(); copySprite(dst, hero); hero.k1 = hero.k2 = -1; }
  // 候选特效：stepOut 剪影从裂隙里踏出——只画裂隙左沿以右的像素（身体一半还在裂缝里），外沿一圈亮色，dq 抖动消散
  function stepOut(s, X, Y, clipX, fill, edge, dq) {
    const o = s.out, W = s.w, emp = (x, y) => x < 0 || y < 0 || x >= W || y >= s.h || o[y * W + x] === 255;
    for (let y = 0; y < s.h; y++) for (let x = 0; x < W; x++) {
      if (o[y * W + x] === 255 || B8[(y & 7) * 8 + (x & 7)] < dq) continue; const sx = X - s.ox + x; if (sx < clipX) continue;
      put(sx, Y - s.oy + y, emp(x - 1, y) || emp(x + 1, y) || emp(x, y - 1) ? edge : fill);
    }
  }
  function onEnter(s) {
    if (s !== CAST) return;
    riftT = 0; snap(clone, IDLE, 0); poseAt(CAST, 0, 0);
    fx.slash(HX + 8, HY - 24, 22, -0.1, 2.6, R_EL, 0.22, 2, 2);        // 竖劈的斩光
    fx.pillar(RIFT_X, HY - 27, HY - 1, 1, R_EL, 0.2, 2);                // 裂缝出现那一下的白光
    burst(RIFT_X, HY - 14, 16, 30, 90, 0.2, 0.45, R_EL, 4);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_CHOP) < 1e-9) {                  // 竖直劈下：斩光弧 + 命中
      fx.slash(HX + 3 + 6, HY - 24, 22, -0.3, 1.9, R_EL, 0.2, 2, 2);
      const hx = DUMMY_X - 2, hy = HY - 21; fx.cross(hx, hy, 5, R_EL, 0.2); burst(hx, hy, 14, 40, 110, 0.15, 0.4, R_EL, 8); burst(hx, hy, 8, 30, 80, 0.1, 0.3, R_IMP, 10);
      hitDummy(1); shake(0.1, 1); sfx('swing', { kind: 'slash', w: 0.85 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === CHARGE && BOLTS.some((b) => Math.abs(t - b) < 1e-9)) {    // 空气里的折线细裂纹向剑刃汇聚
      const k = BOLTS.findIndex((b) => Math.abs(t - b) < 1e-9), gx = wx(P.gx), gy = wy(P.gy);
      for (let i = 0; i < 2; i++) { const a = (k * 2 + i) * 1.9 + 0.4, r = 16 + i * 3; fx.bolt(RD(gx + Math.cos(a) * r), RD(gy + Math.sin(a) * r * 0.8), gx, gy, R_EL, 0.2, 2, 11 + k * 5 + i); }
    }
    if (s === CAST && Math.abs(t - T_STEP) < 1e-9) {                    // 分身踏出：紫白碎片外爆 + 大冲击环
      cloneT = 0; const x = RIFT_X, y = HY - 16;
      burst(x, y, 30, 50, 140, 0.3, 0.7, R_EL, 12); ring(x, HY - 14, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.3);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.85 });
    }
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 10 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && Math.abs(t - T_SHATTER) < 1e-9) {                // 碎裂：先把「没有剑」的一帧烤好交给死亡套件
      poseAt(DEATH, T_SHATTER - 1 / 12, T_SHATTER - 1 / 12); P.only = 1; P.k1 = KEY1(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.9, fromX: 1, fromY: -16, fadeAt: 1.0, fadeDur: 0.6, ramp: R_EL });
      burst(HX - 1, HY - 16, 24, 40, 120, 0.25, 0.6, R_EL, 10); fx.cross(HX - 1, HY - 16, 6, R_EL, 0.3); shake(0.16, 2); flash(0.04);
      sfx('hit', { mat: 'metal', w: 0.7 });
      poseAt(DEATH, t, t);
    }
    if (s === DEATH && Math.abs(t - T_BLINK) < 1e-9) { const x = HX + 8, y = HY - 12; fx.cross(x, y, 5, R_EL, 0.25); burst(x, y, 8, 20, 60, 0.2, 0.4, R_EL, 4); }
  }
  const EVENTS = [[], [], [T_CHOP], BOLTS, [T_STEP], [], [], [T_KNEE, T_SHATTER, T_BLINK], []];
  function hurtFx(s) {                                                   // 金属甲：更多白金火星 + 紫白碎光
    const hx = HX + 1, hy = HY - 20; burst(hx, hy, s === DEATH ? 26 : 20, 60, 150, 0.2, 0.5, R_IMP, 16); burst(hx, hy, 3, 30, 60, 0.4, 0.8, R_IMP, 20); burst(hx, hy, 6, 30, 80, 0.3, 0.5, R_EL, 8);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === MOVE) { trailAcc += dt * 10; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_DUST, wx(-12 - Math.random() * 6), HY - 1, (P.flip ? 1 : -1) * 6, -2 - Math.random() * 3, 0.4, R_EL, { age0: 0.5 }); } }   // 拖地披风扬起的暗影
    if (state === CHARGE) {
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 10, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 3); }
    }
    if ((state === CAST || state === RECOVER) && riftT < 1.1) { trailAcc += dt * 18; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_DUST, RIFT_X + (Math.random() - 0.5) * 8, HY - 2 - Math.random() * 24, (Math.random() - 0.5) * 10, -4 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL, { age0: 0.3 }); } }
    if (state === DEATH && stT > INCOMING + 0.9 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, Math.random() < 0.5 ? R_EL : FXI.soul); } }
    riftT += dt; cloneT += dt;
  }
  function fxReset() { riftT = 9; cloneT = 9; trailAcc = 0; chargeAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) {
    if (P.dq < 1 && P.only !== 2) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (E.state === MOVE) { const d = P.flip ? -1 : 1; for (let k = 3; k < 16; k++) if (((k + f12) % 4) !== 0) put(wx(k), FLOOR, k > 11 ? 9 : 8); }   // 脚下影子向前铺开
  }
  function fxMid(f12) {
    if (E.death.active && P.only === 2) {                                // 死亡套件接管身体后，引擎不再画精灵：插在地上的剑由这里画（和精灵同一份烘焙结果）
      const o = hero.out; for (let y = 0; y < hero.h; y++) for (let x = 0; x < hero.w; x++) { const c = o[y * hero.w + x]; if (c !== 255) put(HX + P.mx - hero.ox + x, HY - hero.oy + y, c); }
    }
    if (riftT > 1.25) return;
    // 裂缝：0–0.12 s 一条竖线（白芯 + 紫边）→ 撕开成菱形空洞（最宽 6 格，里面墨黑）→ 收招时从两端合拢
    const H2 = 13, cy = HY - 14, open = ease.out(clamp01((riftT - T_OPEN) / 0.2)), close = clamp01((riftT - 0.75) / 0.35), hh = RD(H2 * (1 - close));
    for (let dy = -hh; dy <= hh; dy++) {
      const y = cy + dy, e = 1 - Math.abs(dy) / (H2 + 0.5), w = RD(6 * open * e * (1 - close));
      if (w >= 1) for (let x = -w + 1; x < w; x++) put(RIFT_X + x, y, ((x + y + f12) & 3) ? 0 : EL[4]);
      const c = riftT < 1 / 12 ? EL[0] : Math.abs(dy) > hh - 2 ? EL[2] : EL[1];
      put(RIFT_X - w, y, c); put(RIFT_X + w, y, c); if (w === 0 && riftT < 0.3) put(RIFT_X, y, EL[0]);
    }
    if (cloneT < 1.0) {                                                  // 1:1 的影骑士剪影从裂隙里踏出、面朝敌人，留一会儿淡出
      const q = ease.out(clamp01(cloneT / 0.25)), X = RIFT_X - 10 + RD(6 * q), dq = clamp01((cloneT - 0.7) / 0.3);
      stepOut(clone, X, HY, RIFT_X - RD(6 * open * (1 - close)) + (q < 1 ? 0 : -40), EL[4], EL[2], dq);
      if (dq < 0.5) { const ex = X + cloneEye[0], ey = HY + cloneEye[1]; put(ex, ey, EL[0]); put(ex - 1, ey, EL[1]); }
    }
  }
  const cloneEye = (() => { const R = parts.rig({}, BODY); return [R.hx1, R.ey]; })();
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.only !== 1) {       // 裂隙星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '影骑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rift], HIT_POINT: [1, -18], EVENTS,
    deathKit: { mode: 'chunks', at: T_SHATTER },
    SFX: { body: 'armor', how: 'shatter', pal: 'arcane', style: 'summon', w: 0.85 },
    REVIVE: { dy: -18, ramp: R_EL, big: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
