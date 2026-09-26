// 维京海盗（部队 · 虚空 · 商人 · 普通）：瘦削微驼的老水手，破边三角帽 + 眼罩、灰白八字髭，背上用铁链捆着一只小宝箱（箱顶高出肩 4 格），
// 左手是铁钩（钩尖向前伸出轮廓），右手弯刀。攻击 = 刺：铁钩先把目标勾近，弯刀往前一捅。
// 技能 = 特性「秘密储藏」生效：弯腰让背上宝箱朝天，铁钩撬开箱缝（金光一束束射出、铁链一节节松开）→ 箱盖弹开，金紫光柱从箱口冲上画面顶，
//        金币随光柱喷起 → 金币从天上落回、被吸进箱口（每落一枚箱口闪一下）→ 拍上箱盖、铁链缠紧落锁。
// 升级成「暗影死神」（ShadowGrimReaper.js）：同一个人——三角帽、眼罩、墨蓝内衬保留，铁钩长成镰刀。
PCD.define('VikingPirate', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：被诅咒的金币（白 → 奶油 → 金 → 淡紫 → 紫）。只用共享色板里的颜色 ─────
  const R_EL = fxRamp('hoardGold', [21, 5, 14, 43, 42]), EL = FXR[R_EL], R_COIN = FXI.coin, R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: { r: [0, 39, 40, 59], band: 2 },                       // 褪色墨蓝粗呢外套（亮部褪成灰蓝）
    lining: [0, 39, 40, 41], pants: 'bone', boot: 'boot', belt: 'leather', buckle: 'gold',
    skin: [20, 19, 16, 15], white: 'white', hat: [0, 20, 20, 19], badge: 'bone', ink: { r: 'ink', flat: 1 },
    steel: 'steel', gold: 'gold', wood: 'wood', iron: 'iron', leather: 'leather',
    coinG: { r: [19, 14, 5, 21], flat: 1 },                     // 箱缝漏出的金光（发光体）
    curse: { r: [25, 42, 24, 43], flat: 1 },                    // 箱里一点诅咒紫
  });
  const BODY = { body: 'slim', leg: 9, torso: 7, hunch: 1, stride: 3, fall: 'front' };
  const SABER = { style: 'saber', metal: M.steel, trim: M.gold, wood: M.leather, edge: M.steel, len: 8, hand: 'F' };
  const HX = 77, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(74, 46, 28, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['coinG', 'curse', 'skin', 'wood', 'ink', 'steel', 'gold', 'iron']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 弯刀（hx hy a），后手 = 铁钩（bhx bhy）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, lid: 0, chain: 3, jig: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -8, 2.1, 8, -11);                        // 弯刀垂在身前、刀尖斜指前下；铁钩端在胸前
  const K_PEEK = K(5, -8, 2.2, -2, -20, 0, -1);                // 待机个性：回头、铁钩伸到肩后掀箱盖
  const K_WIND = K(1, -10, 1.57, 2, -13, -1, 0, 1);            // 收钩、弯刀后引
  const K_HOOK = K(3, -10, 1.57, 13, -12, 1, 1);               // 铁钩甩出勾住目标
  const K_STAB = K(11, -11, 1.57, 6, -11, 2, 1);               // 钩回、弯刀直捅
  const K_HOLD = K(10, -10, 1.75, 6, -11, 1);
  const K_BEND = K(4, -6, 2.4, -3, -21, 2, -1, 2);             // 弯腰：宝箱朝天，铁钩伸过肩撬箱缝
  const K_CAST = K(7, -14, 0.9, -4, -22, -1, 0);               // 挺身：弯刀举起，铁钩挂在掀开的箱盖上
  const K_HURT = K(3, -9, 2.4, 2, -11, -1, -1);
  const K_KNEEL = K(7, -5, 2.6, 4, -8, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['lid', 0, 2], ['chain', 0, 3], ['jig', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], ROLL = [1, 0, 0, 0];
  const T_HOOK = 2 / 12, T_STAB = 4 / 12, T_LAND = INCOMING + 0.66;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.lid = 0; P.chain = 3; P.jig = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                       // 待机个性：回头、铁钩掀开箱缝看一眼（金光漏出来），赶紧合上
      if (lp >= 1.5 && lp < 2.15) { const q = lp < 1.66 ? (lp - 1.5) / 0.16 : lp < 1.99 ? 1 : 1 - (lp - 1.99) / 0.16; setK(K_IDLE, K_PEEK, ease.inOut(clamp01(q))); P.lid = lp >= 1.66 && lp < 1.99 ? 1 : 0; P.glint = lp >= 1.75 && lp < 1.9 ? 1 : 0; P.gem = P.lid; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 水手摇摆步：接触帧上身前晃一格、宝箱颠一下
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.lean = ROLL[f]; P.head = f === 2 ? 1 : 0; P.jig = P.step !== 0 ? 1 : 0; P.hx += P.step * 0.8; P.a += P.step * 0.1; P.bhx -= P.step * 0.6;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < T_STAB) { setK(K_HOOK, K_HOOK, 0); P.bx = 3; P.beard = -1; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - T_STAB) / (0.45 - T_STAB)); setK(K_STAB, K_HOLD, q); P.bx = RD(5 - q); P.beard = -2; P.sway = -1; P.glint = tq < 0.42 ? 1 : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 弯腰、铁钩撬箱缝，铁链一节节松开，箱缝金光闪
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BEND, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.chain = tq < 0.4 ? 3 : tq < 0.7 ? 2 : tq < 1.0 ? 1 : 0; P.lid = tq < 0.5 ? 0 : 1;
      P.gem = tq < 0.5 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { setK(K_BEND, K_CAST, ease.out(clamp01(tq / 0.12))); P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.lid = 2; P.chain = 0; P.glint = tq < 0.1 ? 1 : 0; }
    else if (st === RECOVER) {                                         // 金币落回箱里 → 拍上箱盖 → 铁链缠紧落锁
      const q = ease.inOut(clamp01(tq / 0.62)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.lid = tq < 0.55 ? 2 : tq < 0.6 ? 1 : 0; P.chain = tq < 0.6 ? 0 : tq < 0.66 ? 1 : 3;
      P.gem = tq < 0.55 ? 2 : tq < 0.6 ? 1 : 0; P.rim = tq < 0.3 ? 2 : tq < 0.55 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.jig = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 踉跄跪下 → 侧倒；宝箱摔开滚出金币，三角帽飘落
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lid = 2; P.chain = 0;
        const hq = clamp01((d - 0.5) / 0.5); P.hatX = RD(7 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 6 + (1 - hq) * 4);   // 帽子飘出去、慢慢落地
        P.gem = d < 0.9 ? ((f12 & 1) ? 2 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const c = chestBox(parts.rig(P, BODY));                             // 发光体 = 箱口
    P.gx = c[0] + 4 + P.bx; P.gy = c[1] - (P.lid === 2 ? 0 : 1);
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 宝箱的左上角（部件本地坐标）：贴在背上，箱顶高出肩 4 格；倒地时摔在身后的地上
  function chestBox(R) { if (R.lie) return [-16, -7]; const L = parts.edges(R, R.yS + 3)[0]; return [L - 6, R.yS - 4 + (P.jig ? -1 : 0)]; }
  // 候选部件：chest 背负宝箱——8×7 木箱（圆拱盖 2 行 + 箱身 5 行），铁包角 + 铜锁板；lid 0 合 / 1 撬开一道缝（缝里是金光）/ 2 盖子向后掀开（露出金币堆）；
  //   chain 0–3 捆着的铁链（横两道 + 竖一道，松开时末端垂下）。T = 落笔变换（rig 跟身体走，parts.FREE 掉在地上）。一个部件，铁链与木箱之间是自动明暗
  function chest(T, x0, top, o) {
    const px = (x, y, m, t) => parts.px(E, T, x, y, m, t), x1 = x0 + 7, lid = o.lid, ch = o.chain, lt = lid === 1 ? top - 1 : top;
    E.part();
    for (let y = top + 2; y <= top + 6; y++) for (let x = x0; x <= x1; x++) px(x, y, M.wood, y === top + 4 && x > x0 && x < x1 ? 2 : 0);   // 箱身 + 中间一道木板缝
    for (const y of [top + 2, top + 6]) { px(x0, y, M.iron, 4); px(x1, y, M.iron, 2); }                                  // 铁包角
    px(x0 + 4, top + 3, M.gold, 4); px(x0 + 5, top + 3, M.gold, 3); px(x0 + 4, top + 4, M.ink, 1); px(x0 + 5, top + 4, M.gold, 2);   // 铜锁板 + 锁孔
    if (lid === 2) {                                                   // 掀开：盖子立在箱后，箱口一堆金币（一粒诅咒紫）
      for (let y = top - 4; y <= top + 1; y++) { px(x0 - 2, y, M.wood, 0); px(x0 - 1, y, M.wood, y === top - 4 ? 4 : 0); }
      px(x0 - 2, top - 4, M.iron, 4); px(x0 - 1, top + 1, M.iron, 2);
      for (let x = x0 + 1; x <= x1 - 1; x++) { px(x, top + 1, M.gold, (x & 1) ? 4 : 3); if (x >= x0 + 2 && x <= x1 - 2) px(x, top, M.gold, x === x0 + 3 ? 4 : 3); }
      px(x0 + 3, top - 1, M.coinG, 4); px(x0 + 5, top + 1, M.curse, 4);
    } else {
      parts.run(E, T, lt, x0 + 1, x1 - 1, M.wood, 0); parts.run(E, T, lt + 1, x0, x1, M.wood, 0);
      px(x0, lt + 1, M.iron, 4); px(x1, lt + 1, M.iron, 2); px(x0 + 1, lt, M.wood, 4);
      if (lid === 1) for (let x = x0 + 1; x <= x1 - 1; x++) px(x, top + 1, M.coinG, o.gem >= 2 ? 4 : (x & 1) ? 4 : 3);   // 箱缝金光
    }
    const link = (x, y, k) => px(x, y, M.iron, (k & 1) ? 2 : 4);        // 链节：亮 / 暗交替，不用勾线色（否则整只箱子变成黑格子）
    if (ch >= 1) for (let x = x0 - 1; x <= x1 + 1; x++) if (x !== x0 + 4 && x !== x0 + 5) link(x, top + 5, x);   // 横链（绕箱腰，锁板处断开）
    if (ch >= 2) for (let y = lt; y <= top + 6; y++) link(x0 + 2, y, y);                          // 竖链：压住箱盖
    if (ch >= 3) { link(x0 + 2, lt - 1, 0); link(x0 + 3, lt - 1, 1); }                          // 链头在箱顶打结
    if (ch < 3 && !o.lie) for (let k = 0; k < 3 - ch; k++) link(x0 + 2 - (k > 1 ? 1 : 0), top + 7 + k, k);   // 松开的链头垂下来
  }
  // 候选部件：hook 铁钩手——袖口皮套 2×2 + J 形铁钩（钩柄朝前、钩尖朝上往回勾，钩和柄之间留 2 格空，剪影里读得出钩）。(x, y) = 皮套右上角
  function hook(R, x, y) {
    const px = (a, b, m, t) => parts.px(E, R, a, b, m, t);
    E.part(); parts.rect(E, R, x - 1, y, 2, 2, M.leather, 0); px(x - 1, y, M.leather, 4);
    E.part();
    px(x + 1, y, M.steel, 4); px(x + 2, y, M.steel, 3); px(x + 3, y, M.steel, 3); px(x + 2, y + 1, M.steel, 2); px(x + 3, y + 1, M.steel, 2);
    px(x + 4, y - 1, M.steel, 3); px(x + 4, y - 2, M.steel, 3); px(x + 4, y - 3, M.steel, 4); px(x + 3, y - 4, M.steel, 4); px(x + 2, y - 4, M.steel, 3); px(x + 2, y - 3, M.steel, 2);
    if (P.glint) px(x + 4, y - 4, M.steel, 4);
  }
  // 眼罩（和脸同一部件）：斜过头顶的皮带 + 盖住眼睛的黑眼罩
  function patch(R, h) {
    const px = (a, b, m, t) => parts.px(E, R, a, b, m, t);
    px(h.x1, h.ey, M.ink, 1); px(h.x1 - 1, h.ey, M.ink, 1); px(h.x1, h.ey + 1, M.ink, 1);
    parts.line(E, R, h.x1 - 2, h.ey - 1, h.x0, h.top + 1, M.hat, 2);
  }
  // 三角帽破边（在帽子画完后挖掉几格）
  function tatter(T, cx, cy) { parts.px(E, T, cx - 4, cy - 1, 0, 0); parts.px(E, T, cx + 3, cy, 0, 0); parts.px(E, T, cx + 5, cy - 2, 0, 0); }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), dead = R.lie, cb = chestBox(R);
    if (!dead) chest(R, cb[0], cb[1], { lid: P.lid, chain: P.chain, gem: P.gem });
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.coatD, cuff: M.liningD, grip: 'none', at: [P.bhx - 1, P.bhy + 1] });
    parts.legs(E, R, P, { style: 'boot', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD, bootH: 3 });
    parts.torso(E, R, P, { style: 'coat', mat: M.coat, collar: M.lining, belt: M.belt, buckle: M.buckle, buttons: M.gold, strap: M.iron, hem: -5 });
    const h = parts.head(E, R, P, { mat: M.skin, face: 'gaunt', age: 'old', eye: M.ink, nose: 'hook', mouth: 'none' });
    parts.beard(E, R, P, { style: 'mustache', mat: M.white });
    patch(R, h);
    if (dead) {                                                         // 帽子飘落到头前方；宝箱摔在身后、盖子掀开
      const hx = 24 + P.hatX, hy = -P.hatY;
      parts.hat(E, R, P, { style: 'tricorn', mat: M.hat, band: M.hat, badge: M.badge, at: [hx, hy] }); tatter(parts.FREE, hx, hy);
      chest(parts.FREE, cb[0], cb[1], { lid: 2, chain: 0, gem: P.gem, lie: 1 });
      E.part(); for (const [x, y] of [[-7, -1], [-5, -1], [-18, -1]]) { parts.px(E, parts.FREE, x, y, M.gold, 4); parts.px(E, parts.FREE, x + 1, y, M.gold, 2); }   // 滚出来的金币
      parts.sword(E, R, P, Object.assign({}, SABER, { free: 1, at: [15, -1], a: HALF }));
    } else {
      parts.hat(E, R, P, { style: 'tricorn', mat: M.hat, band: M.hat, badge: M.badge });
      tatter(R, R.hx, R.htop - 1);
      hook(R, P.bhx, P.bhy);
      parts.sword(E, R, P, SABER);
    }
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.coat, cuff: M.lining, hand: M.skin, grip: 'fist' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, glintAcc = 0, lastStep = 0, stabT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const COIN_N = 9, COIN_T0 = 0.14, COIN_GAP = 0.06, COIN_FALL = 0.36, COIN_X = [-14, 12, -6, 18, -20, 6, -2, 24, -10];
  function coinLand(i) { return COIN_T0 + i * COIN_GAP + COIN_FALL; }   // 第 i 枚金币落进箱口的时刻（从施放开始算）
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(40, 90, 0.3, 0.6);
    fx.pillar(gx, 0, gy - 1, 2, R_EL, 0.42, 0);                         // 金紫光柱：从箱口冲到画面顶
    for (let i = 0; i < 18; i++) spawnX(K_PHYS, gx + (Math.random() - 0.5) * 4, gy - 2, (Math.random() - 0.5) * 50, -130 - Math.random() * 80, 0.55 + Math.random() * 0.3, R_COIN, { g: 90 });   // 金币随光柱喷起
    ring(gx, gy, 1, R_EL); burst(gx, gy, 16, 30, 80, 0.2, 0.45, R_EL, 30);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HOOK) {                                // 铁钩甩出，勾住目标往回拽
      const hx = wx(K_HOOK.bhx + 3 + 3), hy = wy(K_HOOK.bhy - 2);
      fx.slash(wx(K_HOOK.bhx - 4), hy + 3, 8, 0.9, 2.0, R_IMP, 0.15, 1, 2); burst(hx, hy, 6, 30, 70, 0.1, 0.25, R_IMP, 6);
      hitDummy(0, -1); sfx('swing', { kind: 'claw', w: 0.3 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
    if (s === ATTACK && t === T_STAB) {                                // 弯刀直捅：刀尖星芒 + 直线拖影
      stabT = 0; const tx = wx(K_STAB.hx + 5 + 9), ty = wy(K_STAB.hy - 1);
      fx.beam(wx(K_WIND.hx + 3), ty, tx, ty, 1, R_IMP, 0.14, 2); fx.cross(tx, ty, 4, R_IMP, 0.2);
      burst(tx, ty, 12, 40, 100, 0.15, 0.35, R_IMP, 10); hitDummy(1, 1);
      sfx('swing', { kind: 'thrust', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === RECOVER) {                                               // 金币落进箱口：每枚一声
      sfx('impact', { pal: 'coin', w: t < 0.05 ? 0.6 : 0.3 });
      burst(wx(P.gx), wy(P.gy) - 1, 5, 15, 40, 0.15, 0.3, R_EL, 12);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                 // 倒地：尘土 + 宝箱摔开滚出金币
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      const cx = wx(-12), cy = HY - 6;
      for (let i = 0; i < 8; i++) spawnX(K_PHYS, cx, cy, -30 + Math.random() * 60, -50 - Math.random() * 40, 0.7 + Math.random() * 0.4, R_COIN, { g: 260, floor: HY - 1 });
      shake(0.1, 1); sfx('fall', { w: 0.4 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_HOOK, T_STAB], [], [], [0.02, 0.2, 0.4], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                            // 金紫光点螺旋收进箱缝
      chargeAcc += dt * (20 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.5) { glintAcc += dt * 10; while (glintAcc >= 1) { glintAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 6 - 3), gy - 1, Math.random() * 10 - 5, -14 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL); } }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === IDLE && P.lid === 1) { glintAcc += dt * 8; while (glintAcc >= 1) { glintAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 4 - 2), gy - 1, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 34, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    stabT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; glintAcc = 0; lastStep = 0; stabT = 9; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function coinAt(x, y, lv) { put(x, y, EL[lv]); put(x + 1, y, EL[Math.min(4, lv + 1)]); put(x, y + 1, EL[Math.min(4, lv + 1)]); put(x + 1, y + 1, FXR[R_COIN][3]); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy), s = E.state, st = E.stT;
    if (s === CHARGE && P.lid === 1 && P.dq < 1) {                    // 箱缝里射出的一束束金光（扇形、逐帧换长短）
      for (let k = -2; k <= 2; k++) { const L = 4 + ((k + f12) & 3) + (P.gem >= 2 ? 3 : 0); for (let r = 2; r <= L; r++) { if (((r + f12) & 1) && r > 4) continue; put(gx + RD(k * r * 0.45), gy - r, r < 4 ? EL[1] : r < 6 ? EL[2] : EL[3]); } }
    }
    if (s === CAST || s === RECOVER) {                                // 金币从天上落回、被吸进箱口；每落一枚箱口闪一下
      const tt = s === CAST ? st : DUR[CAST] + st;
      for (let i = 0; i < COIN_N; i++) {
        const t0 = COIN_T0 + i * COIN_GAP, q = (tt - t0) / COIN_FALL;
        if (q >= 0 && q < 1) { const e = q * q, x = RD(gx + COIN_X[i] * (1 - e) - 1), y = RD(-2 + (gy - 1 + 2) * e); coinAt(x, y, (f12 + i) & 1 ? 1 : 2); }
        const dl = tt - coinLand(i); if (dl >= 0 && dl < 1 / 12) { put(gx, gy - 2, EL[0]); put(gx - 1, gy - 1, EL[1]); put(gx + 1, gy - 1, EL[1]); put(gx, gy - 3, EL[1]); put(gx - 2, gy - 1, EL[2]); put(gx + 2, gy - 1, EL[2]); }
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {           // 箱口星芒
      const L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy - 1, c); put(gx - r, gy - 1, c); put(gx, gy - 1 - r, c); }
    }
  }

  return {
    name: '维京海盗', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.coinG, M.curse], HIT_POINT: [1, -12], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'coin', style: 'coin', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
