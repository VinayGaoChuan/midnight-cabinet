// 钢铁军阀（部队 · 僵尸 · 先锋 · 传说）：铁甲战士升级后的同一个僵尸——躯干从肩到膝整个包进一具人形铁处女外壳（上窄下宽、前面两扇门、6 根铁刺伸出轮廓），
// 头上是刑具那张铸铁雕刻的面孔（高冠、闭目、严肃），眼缝里透出一只酸绿眼，脑后还挂着当年水桶的提梁环；粗大的灰绿手臂钉着铆钉、套铁箍，双肩黄铜包边圆肩甲；
// 双手竖持与身等高的巨型战镐（撬棍的钩长成了镐头：一头尖镐、一头方锤）。
// 攻击 = 凿：双手把战镐高举过顶、全身前压，镐尖凿进目标前的地面（地裂）；技能 = 特性「硬化」（传说版）：铁处女门大开，四周的废铁和铁钉被吸过来贴满全身，门猛地合上——哐！铁刺伸长、点阵护罩从下往上亮起。
// 由「铁甲战士」（IroncladWarrior.js）升级：棺材盖长成了全身铁柜，锈铁擦亮成冷钢，酸绿眼、提梁环、灰绿皮肉 + 铆钉都留着。
PCD.define('SteelWarlord', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, fall, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2;
  const px = parts.px, run = parts.run;

  // ───── 元素：守护 · 钢铁（FXI.steel），焊点 / 铆钉闪光用金（coin 第 1–3 级）；尸气 dust、魂光酸绿（poison）；锈屑（死亡）─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_IMP = FXI.impact, R_GOLD = FXI.coin, GOLD = FXR[R_GOLD], R_SOUL = FXI.poison, R_DUST = FXI.dust;
  const R_RUST = fxRamp('rustflake', [5, 33, 32, 19, 20]);        // 锈成铁屑：奶白 → 锈橙 → 锈褐 → 暗褐 → 墨褐（只用共享色板）

  // ───── 材质 ─────
  const M = parts.mats(E, {
    steel: 'steel', shell: { r: 'steel', band: 2 }, spike: [0, 29, 30, 31], gold: 'gold', lining: { r: 'blood', band: 2 }, iron: 'iron', wood: 'wood',
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],             // 尸绿灰（和铁甲战士同一身皮肉）
    eye: { r: [48, 49, 50, 38], flat: 1 },                          // 酸绿眼（发光体）
  });
  const BODY = { body: 'giant', sw: 6, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const SHAFT = 27;                                                 // 镐柄总长（与身等高）
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(104, 72, 48, 62);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 10, 18, 24], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['wood', 'eye', 'skin', 'lining', 'iron']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx hy a 握镐（len = 握点到镐头套口），后手握在柄上（由镐的几何算出）─────
  const P = { hx: 0, hy: 0, a: 0, len: 16, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, door: 0, spike: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, len, lean, head, crouch) => ({ hx, hy, a, len, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -14, 0.05, 16);                         // 战镐竖在身前，镐头与脸同高
  const K_WIND = K(4, -31, -0.8, 13, -1, -1);                  // 高举过顶
  const K_STRIKE = K(9, -12, 2.2, 9, 2, 1, 2);                 // 全身前压，镐尖凿进目标前的地面（手滑到柄前段）
  const K_HOLD = K(9, -12, 2.3, 9, 2, 0, 2);
  const K_BRACE = K(10, -13, 0.0, 16, -1, -1, 1);              // 蓄力：挺胸后仰，门大开
  const K_CAST = K(10, -14, 0.05, 16, 0, 0, 2);                // 施放：门猛合、下蹲一顿
  const K_HURT = K(9, -14, -0.15, 16, -1, -1);
  const K_STAGGER = K(7, -12, -0.4, 14, -1, -1, 2);
  const FIELDS = ['hx', 'hy', 'a', 'len', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['len', 6, 18], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['st', 0, 8], ['door', 0, 2], ['spike', 0, 1]]);
  const W4 = [0, 1, 0, -1], T_STRIKE = 2 / 12, T_LAND = INCOMING + 0.66, T_SHUT = INCOMING + 0.83, T_HARD = 2 / 12;
  const THUMP = [[0, 0], [-3, 0], [-3, 0], [0, 1], [0, 0]];     // 待机个性：镐柄提起 3 格再往地上一顿（hy 偏移、蹲）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.door = 0; P.spike = 0;
    const idle = () => {                                               // 呼吸：两扇门随呼吸开合 1 格（门缝露出暗红内衬）
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.door = P.bob ? 0 : 1; P.beard = W4[(b + 1) & 3]; P.sway = W4[FL(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const k = THUMP[FL((lp - 1.6) * 12)]; P.hy += k[0]; P.crouch = k[1]; P.door = k[1] ? 1 : 0; P.bob = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 摇晃重踏：接触帧身体往落脚那边摇 1 格、下沉 1 格；经过帧门板被颠开 1 格
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bx = P.step; P.door = P.wup ? 1 : 0; P.a += P.step * 0.05;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 2; P.beard = -2; P.glint = 1; P.door = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = 2; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 门大开，铁片铁钉飞来；眼光 1 → 2
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q);
      P.door = tq < 0.12 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = -1;
      if (tq >= 1.0) { P.sway = (f12 & 1) ? 1 : -1; P.beard = (f12 & 1) ? 1 : -1; }
    } else if (st === CAST) {                                          // 门猛合（定格闪白 1 帧），铁刺伸长 2 格
      setK(K_CAST, K_CAST, 0); P.door = 0; P.spike = 1; P.gem = 3; P.rim = 3; P.flash = tq < 1 / 12 ? 1 : 0; P.beard = 2;
    } else if (st === RECOVER) {                                       // 铁刺缩回，门缝喷两股尸气
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q);
      P.spike = tq < 0.25 ? 1 : 0; P.door = tq >= 0.1 && tq < 0.35 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.door = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 后仰封柜：门被打开 → 战镐飞出 → 仰倒 → 两扇门哐地合上 → 门缝喷尸气 → 自上而下锈成铁屑
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.door = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAGGER, K_STAGGER, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.door = 2; P.hatX = d < 0.4 ? 1 : 2; }       // hatX：战镐飞出（1 空中 · 2 更远 · 3 落地）
      else {
        setK(K_IDLE, K_IDLE, 0); P.lying = 1; P.bx = -2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.crouch = 0; P.lean = 0; P.head = 0; P.hatX = 3;
        P.hx = R0.sFx + 3; P.hy = R0.yWaist + 2; P.a = 0;
        P.door = d < 0.83 ? 2 : 0; P.gem = 4; P.eyes = d < 1.0 ? ((f12 & 1) ? 0 : 1) : d < 1.3 ? ((f12 % 3) === 0 ? 0 : 1) : 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.door = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.len = RD(P.len); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const b = parts.onShaft(P, { a: P.a }, P.len >= 14 ? 6 : -6); P.bhx = b[0]; P.bhy = b[1]; P.ba = P.a;   // 后手：竖持时在前手上方 6 格，凿击时在前手后方 6 格
    if (P.lying) { P.gx = -22 + P.bx; P.gy = -7; }                    // 倒地：发光体 = 面盔的眼（只用来挂魂光）
    else { P.gx = R0.hx1 + P.lean + P.head + P.bx; P.gy = R0.htop + 2 + yo; }   // 发光体 = 面盔眼缝里的酸绿眼
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 候选部件 ─────
  // 90° 武器头盖章（和部件库 HEADS 同一套约定：rows 从远端到近端，anchor = 柄插进去的套口；朝上时 u 向右 = 刃口朝前）
  function stampHead(E, T, ax, ay, q, rows, anchor, roles) {
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
      const role = roles[rows[r][c]]; if (!role) continue;
      const u = c - anchor[0], v = r - anchor[1]; let dx, dy;
      if (q === 0) { dx = u; dy = v; } else if (q === 1) { dx = -v; dy = u; } else if (q === 2) { dx = -u; dy = -v; } else { dx = v; dy = -u; }
      px(E, T, ax + dx, ay + dy, role[0], role[1]);
    }
  }
  // 候选部件：warPick 巨型战镐——铁包木柄（每 5 格一道铁箍）+ 90° 镐头：后面一块 3×3 方锤、黄铜套箍、前面一根往下勾的尖镐（尖端亮）。
  //   o = { at [x, y] 握点, a 柄角（0 朝上、顺时针）, len 握点到套口, back 握点后柄长, free 1 = 不跟身体转 }。两个部件：柄 → 头。返回 { socket, tip, butt }
  const PICK = ['HMmt......', 'MMmTMMMH..', 'mmmTMMMMME', '...T.....E'], PICK_A = [3, 3];
  function warPick(E, R, P, o) {
    const T = o.free ? parts.FREE : R, a = o.a, dx = Math.sin(a), dy = -Math.cos(a), g = o.at, q = ((RD(a / HALF) % 4) + 4) % 4;
    const ax = RD(g[0] + dx * o.len), ay = RD(g[1] + dy * o.len), bx = g[0] - dx * o.back, by = g[1] - dy * o.back;
    E.part(); parts.line(E, T, bx, by, ax, ay, M.wood, 3);
    for (let d = -o.back + 2; d < o.len - 1; d += 5) px(E, T, g[0] + dx * d, g[1] + dy * d, M.iron, 4);          // 铁箍
    px(E, T, bx, by, M.iron, 3);
    E.part(); stampHead(E, T, ax, ay, q, PICK, PICK_A, { H: [M.steel, 4], M: [M.steel, 0], m: [M.steel, 2], E: [M.steel, 4], T: [M.gold, 0], t: [M.gold, 4] });
    const tip = q === 0 ? [ax + 6, ay] : q === 1 ? [ax, ay + 6] : q === 2 ? [ax - 6, ay] : [ax, ay - 6];
    return { socket: [ax, ay], tip, butt: [RD(bx), RD(by)] };
  }
  // 候选部件：ironMaiden 人形铁处女外壳（包住肩到膝）：上窄下宽，圆肩；前面两扇门（中缝）、黄铜包边三道（领口、腰、下沿）+ 铰链 + 金铆钉，
  //   两侧外壁 6 根铁刺伸出轮廓 2 格（P.spike 1 = 再伸长 2 格）；P.door 0 合上 · 1 门缝开 1 格（露暗红内衬）· 2 大开（门板翻到两侧、剪影宽出 6 格，露出内衬和里面的尸身）。
  //   o = { mat 外壳, trim 黄铜, lining 内衬, skin 尸身, spike 铁刺 }。外壳一个部件，尸身、两扇门板各一个部件。返回 { rivets: [[x, y] …], top, hem, L(y), R(y) }（本地坐标）
  function maidenEdges(R) {
    const top = R.yS, hem = -6, span = hem - top - 2;
    const L = (y) => (y === top ? -4 : y === top + 1 ? -5 : RD(-6 - 3 * clamp01((y - top - 2) / span))) + R.lean;
    const Rr = (y) => (y === top ? 3 : y === top + 1 ? 4 : RD(5 + 4 * clamp01((y - top - 2) / span))) + R.lean;
    return { top, hem, L, R: Rr, mid: (y) => RD((L(y) + Rr(y)) / 2) };
  }
  function ironMaiden(E, R, P, o) {
    const T = R, G = maidenEdges(R), top = G.top, hem = G.hem, door = P.door, yW = R.yWaist, riv = [];
    E.part();
    for (let y = top; y <= hem; y++) {
      const L = G.L(y), Rr = G.R(y), m = G.mid(y);
      run(E, T, y, L, Rr, o.mat, 0);
      if (door === 2 && y >= top + 2 && y < hem) run(E, T, y, L + 1, Rr - 1, o.lining, y === top + 2 ? 1 : 0);   // 大开：只剩柜框，里面是暗红内衬
      else if (y >= top + 3 && y < hem) {
        if (door === 1) { px(E, T, m, y, o.lining, 2); px(E, T, m + 1, y, o.lining, 1); }                          // 门缝开 1 格
        else px(E, T, m, y, o.mat, 1);                                                                             // 中缝
        px(E, T, L + 2, y, o.mat, 2); px(E, T, Rr - 2, y, o.mat, 2);                                              // 门框线
      }
    }
    px(E, T, G.L(top) + 1, top, o.mat, 4); px(E, T, G.L(top + 1) + 1, top + 1, o.mat, 4);
    for (const y of [top + 2, yW, hem]) {                              // 黄铜包边：领口、腰、下沿（门大开时只剩柜框上的两截）
      const L = G.L(y), Rr = G.R(y);
      if (door === 2 && y !== top + 2 && y !== hem) { px(E, T, L, y, o.trim, 0); px(E, T, Rr, y, o.trim, 0); continue; }
      run(E, T, y, L, Rr, o.trim, 0);
      for (let x = L + 1; x < Rr; x += 3) { px(E, T, x, y, o.trim, 4); riv.push([x, y]); }
    }
    for (const y of [top + 5, hem - 4]) { px(E, T, G.L(y), y, o.trim, 4); px(E, T, G.R(y), y, o.trim, 3); riv.push([G.L(y), y], [G.R(y), y]); }   // 铰链
    for (let k = 0; k < 3; k++) {                                      // 6 根铁刺：前后外壁各 3 根，横着伸出
      const n = 2 + (P.spike ? 2 : 0), yf = top + 4 + k * 5, yb = top + 6 + k * 5;
      for (let i = 1; i <= n; i++) { px(E, T, G.R(yf) + i, yf, o.spike, i === n ? 4 : 3); px(E, T, G.L(yb) - i, yb, o.spike, i === n ? 4 : 2); }
    }
    if (door === 2) {
      E.part();                                                        // 里面的尸身：灰绿皮肉、一道缝线、钉进肉里的铆钉
      for (let y = top + 3; y <= hem - 2; y++) {
        const a = Math.max(G.L(y) + 3, -4 + R.lean), b = Math.min(G.R(y) - 3, 3 + R.lean), c = RD((a + b) / 2); run(E, T, y, a, b, o.skin, 0);
        if ((y - top) & 1) px(E, T, c, y, o.skin, 1);                                                             // 胸口一道缝线
        if (((y - top) % 3) === 1 && y < R.yWaist) { px(E, T, a + 1, y, o.skin, 2); px(E, T, b - 1, y, o.skin, 2); }   // 肋骨的影子
      }
      for (const [x, y] of [[-2, top + 5], [2, top + 8], [-1, top + 12]]) px(E, T, x + R.lean, y, o.spike, 4);
      for (const s of [-1, 1]) {                                       // 两扇门板翻到两侧：外沿钢、里面暗红内衬 + 一排内刺
        E.part();
        for (let y = top + 3; y <= hem - 1; y++) {
          const e = s < 0 ? G.L(y) : G.R(y);
          for (let i = 1; i <= 3; i++) px(E, T, e + s * i, y, i === 3 || y === top + 3 || y === hem - 1 ? o.mat : o.lining, 0);
          if ((y - top) % 3 === 0 && y > top + 3 && y < hem - 1) px(E, T, e + s * 1, y, o.spike, 4);
        }
      }
    }
    return { rivets: riv, top, hem };
  }
  // 候选部件：maidenHelm 铁处女面盔——铸铁雕的一张脸（高冠、黄铜冠箍、闭着的眼、突出的鼻、紧闭的嘴），闭眼缝里透出 1 格发光眼；
  //   脑后挂一只提梁环（下一个部件，随 P.beard 摆）。o = { mat 铁, trim 黄铜, eye 眼光材质, ring 提梁环, eyeLv 0 暗 · 1 常亮 · 2 亮 }
  function maidenHelm(E, R, P, o) {
    const T = R, hx = R.hx, top = R.htop, m = o.mat, ey = top + 2;      // 头 7 格：top .. top + 6（下巴）
    E.part();
    run(E, T, top - 4, hx - 1, hx + 1, m, 0); run(E, T, top - 3, hx - 2, hx + 2, m, 0); run(E, T, top - 2, hx - 3, hx + 2, m, 0);   // 高冠
    run(E, T, top - 1, hx - 4, hx + 3, o.trim, 0); px(E, T, hx, top - 5, o.trim, 4);                                                // 黄铜冠箍 + 冠顶
    for (let y = top; y <= top + 6; y++) run(E, T, y, hx - 4 + (y >= top + 5 ? 1 : 0), hx + 3 + (y === top + 2 || y === top + 3 ? 1 : 0) - (y === top + 6 ? 1 : 0), m, 0);
    for (let y = top - 1; y <= top + 4; y++) px(E, T, hx - 5, y, m, 2);                                                            // 后面的冠布垂边
    px(E, T, hx - 2, top - 3, m, 4); px(E, T, hx - 3, top - 2, m, 4);
    run(E, T, top, hx + 1, hx + 3, m, 4);                                                         // 眉弓
    run(E, T, ey - 1 + 1, hx + 1, hx + 3, m, 1);                                                  // 闭着的眼（一道暗缝）
    px(E, T, hx + 2, ey, o.eye, o.eyeLv === 0 ? 1 : o.eyeLv === 2 ? 4 : 3);                        // 眼缝里的酸绿眼
    px(E, T, hx + 4, ey + 1, m, 4); px(E, T, hx + 4, ey, m, 3); px(E, T, hx + 2, ey + 1, m, 4);   // 鼻梁 / 颧
    run(E, T, top + 5, hx + 1, hx + 3, m, 1);                                                     // 紧闭的嘴
    px(E, T, hx - 1, top + 3, m, 2); px(E, T, hx, top + 4, m, 2);                                 // 脸颊凹面
    E.part();                                                          // 提梁环：挂在脑后
    const s = RD((P.beard || 0) * 0.5), cx = hx - 7 + s, cy = top + 4;
    for (const [dx, dy] of [[0, -2], [-1, -1], [-1, 0], [0, 1], [1, 0], [1, -1]]) px(E, T, cx + dx, cy + dy, o.ring, dy < 0 ? 4 : 3);
    px(E, T, hx - 6, top + 1, o.ring, 3);
  }
  // 黄铜包边圆肩甲（前后肩各一只，后肩暗一级）
  function pauldron(E, R, x, y, m, trim) {
    const T = R;
    E.part();
    run(E, T, y - 2, x - 1, x + 1, m, 0); run(E, T, y - 1, x - 2, x + 2, m, 0); run(E, T, y, x - 3, x + 3, m, 0); run(E, T, y + 1, x - 3, x + 3, trim, 0);
    px(E, T, x - 1, y - 1, m, 4); px(E, T, x + 2, y, trim, 4); px(E, T, x - 2, y + 1, trim, 4);
  }
  // 候选部件：nailChain 腰下一串铁钉和小铁锁——黄铜细链从腰带垂下一道弧，挂 2 根铁钉、1 把小锁（锁身 2×2 + 锁梁），随 P.sway 摆
  function nailChain(E, R, P) {
    const T = R, G = maidenEdges(R), y = R.yWaist + 1, x0 = G.mid(y) + 1, s = RD((P.sway || 0) * 0.5);
    E.part();
    for (let i = 0; i <= 5; i++) px(E, T, x0 + i, y + (i >= 1 && i <= 4 ? 1 : 0), M.gold, i & 1 ? 2 : 3);
    for (const k of [1, 4]) { px(E, T, x0 + k + s, y + 2, M.iron, 4); px(E, T, x0 + k + s, y + 3, M.iron, 3); }
    px(E, T, x0 + 2 + s, y + 2, M.iron, 3); run(E, T, y + 3, x0 + 2 + s, x0 + 3 + s, M.iron, 0); run(E, T, y + 4, x0 + 2 + s, x0 + 3 + s, M.iron, 2); px(E, T, x0 + 3 + s, y + 3, M.gold, 4);
  }
  // 灰绿手臂：钉进肉里的铆钉（和袖子同一部件）+ 腕上铁箍 + 大拳
  function fleshArm(E, R, P, side) {
    const B = side === 'B', sk = B ? M.skinD : M.skin;
    const r = parts.arm(E, R, P, { side, sleeve: 'bare', mat: sk, grip: 'none' });
    const ux = r.wx - r.ex, uy = r.wy - r.ey;
    for (const q of [0.35, 0.75]) px(E, R, r.ex + ux * q, r.ey + uy * q, M.steel, 4);
    px(E, R, (r.ex + parts.edges(R, R.yS)[1]) / 2, r.ey - 3, M.steel, 4);
    E.part(); const l = Math.hypot(ux, uy) || 1; parts.sweep(E, R, r.wx - ux / l * 1.8, r.wy - uy / l * 1.8, r.wx, r.wy, 1.2, 1.2, B ? M.ironD : M.iron, 0);
    return r;
  }

  // ───── 画（部件从后往前）─────
  const PICK_O = () => ({ at: [P.hx, P.hy], a: P.a, len: P.len, back: SHAFT - P.len });
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), dead = P.st === DEATH;
    if (!R.lie) parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: M.skin, matD: M.skinD, boot: M.iron, bootD: M.ironD, bootH: 3 });
    ironMaiden(E, R, P, { mat: M.shell, trim: M.gold, lining: M.lining, skin: M.skin, spike: M.spike });
    if (P.door < 2) nailChain(E, R, P);
    if (!R.lie) pauldron(E, R, R.sBx, R.sBy - 1, M.steelD, M.goldD);
    maidenHelm(E, R, P, { mat: M.steel, trim: M.gold, ring: M.iron, eye: M.eye, eyeLv: P.eyes || P.gem === 4 ? 0 : P.gem >= 2 ? 2 : 1 });
    if (dead && P.hatX === 1) warPick(E, R, P, { free: 1, at: [16, -34], a: 0.8, len: 16, back: 11 });           // 战镐飞出（空中）
    else if (dead && P.hatX === 2) warPick(E, R, P, { free: 1, at: [26, -20], a: 1.6, len: 16, back: 11 });
    else if (dead && P.hatX === 3) warPick(E, R, P, { free: 1, at: [36, -2], a: -HALF, len: 16, back: 11 });     // 落在身前地上（镐尖朝上）
    else { warPick(E, R, P, PICK_O()); if (!R.lie) parts.hand(E, R, P, { side: 'B', hand: M.skinD, grip: 'big' }); }
    if (R.lie) return;                                                 // 倒地：手臂收在柜子里（门开着时看得见里面的尸身），只剩铁柜、面盔、靴子
    fleshArm(E, R, P, 'F'); pauldron(E, R, R.sFx, R.sFy - 1, M.steel, M.gold);
    parts.hand(E, R, P, { side: 'F', hand: M.skin, grip: 'big' });
  }
  function bakeHero() {
    const src = P.st === CHARGE || P.st === CAST ? [0 + P.bx, R0.yWaist - 4] : [P.gx, P.gy];   // 蓄力 / 施放：光从胸口（铁片汇聚处）照出来
    RIM.rim = P.rim; RIM.rx = src[0] + hero.ox; RIM.ry = src[1] + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
  }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, sparkAcc = 0, gasAcc = 0, soulAcc = 0, rustAcc = 0, lastStep = 0, lastDoor = 0, lastThump = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const chest = () => [wx(P.bx), wy(R0.yWaist - 4)];
  function shellRivets() {                                             // 和 ironMaiden 同一套几何（本地坐标 → 屏幕），给施放时的金色闪光用；从下往上排
    const R = parts.rig(P, BODY), G = maidenEdges(R), out = [];
    for (const y of [G.hem, R.yWaist, G.top + 2]) for (let x = G.L(y) + 1; x < G.R(y); x += 3) out.push([wx(x + P.bx), wy(y)]);
    return out;
  }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 门猛合：巨大钢色冲击环 + 两道地裂 + 外爆，震屏、天空闪白
    const c = chest();
    ring(c[0], c[1], 1, R_EL); fx.crack(wx(6), HY + 1, 20, 1, R_EL, 1.0); fx.crack(wx(-6), HY + 1, 20, -1, R_EL, 1.0);
    burst(c[0], c[1], 30, 50, 130, 0.3, 0.75, R_EL, 20); burst(wx(0), HY - 1, 14, 20, 60, 0.3, 0.6, R_DUST, 14); fx.cross(c[0], c[1], 9, R_EL, 0.35);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                              // 凿：残影（高举那一帧）+ 过顶的弧 + 镐尖凿地，地裂一路裂到目标脚下
      poseAt(ATTACK, 0.12, 0.12); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; poseAt(ATTACK, t, t); ghostT = 0;
      fx.slash(wx(R0.sFx + P.bx), wy(R0.sFy), 17, K_WIND.a + 0.2, K_STRIKE.a + 0.1, R_IMP, 0.17, 2, 2);
      const tx = wx(P.hx + Math.sin(P.a) * P.len + P.bx);
      fx.crack(tx, HY + 1, 12, 1, R_IMP, 0.7); fx.crack(tx, HY + 1, 5, -1, R_IMP, 0.5);
      burst(tx, HY - 1, 14, 40, 110, 0.15, 0.4, R_IMP, 26); burst(tx, HY - 1, 8, 20, 60, 0.3, 0.5, R_DUST, 14); fx.cross(tx, HY - 2, 4, R_IMP, 0.2);
      hitDummy(0);
      sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'stone', w: 0.9 });
    }
    if (s === CAST && Math.abs(t - T_HARD) < 1e-9) {                   // 护罩从下往上亮起的同时，身前一圈铁屑落地成尘
      for (let i = 0; i < 16; i++) { const x = wx(-18 + i * 2.4), y = HY - 30 - Math.random() * 10; fall(x, y, (Math.random() - 0.5) * 10, 10 + Math.random() * 20, HY, R_EL, 1); }
      sfx('impact', { pal: 'metal', w: 0.95 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 20; i++) spawn(K_DUST, HX - 22 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 36, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_DUST); shake(0.14, 1); sfx('fall', { w: 0.95 }); }
    if (s === DEATH && Math.abs(t - T_SHUT) < 1e-9) {                 // 两扇门哐地合上：门缝喷出尸气
      burst(wx(-8), HY - 14, 10, 30, 70, 0.15, 0.3, R_IMP, 8); shake(0.1, 1); sfx('hit', { mat: 'metal', w: 1 });
      for (let i = 0; i < 14; i++) spawnX(K_RISE, HX - 18 + Math.random() * 20, HY - 15, (Math.random() - 0.5) * 16, -12 - Math.random() * 14, 0.5 + Math.random() * 0.4, R_SOUL, { sz: i < 5 ? 2 : 1 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_HARD], [], [], [T_LAND, T_SHUT], []];
  function hurtFx(s) {                                                 // 铁柜挨打：白金火花多、初速快，夹几颗长寿命的亮钢火星
    const hx = HX + 6, hy = HY - 18; burst(hx, hy, s === DEATH ? 26 : 18, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, s === DEATH ? 8 : 4, 80, 160, 0.5, 0.8, R_EL, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 细碎的钢屑螺旋汇聚（铁片本体画在 fxFront）
      sparkAcc += dt * (10 + 24 * clamp01(stT / DUR[CHARGE]));
      while (sparkAcc >= 1) { sparkAcc -= 1; const c = chest(), a = Math.random() * 6.2832, r = 16 + Math.random() * 10; spawn(K_SPIRAL_PT, c[0], c[1], r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 2); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.95 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -6) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 26, -5 - Math.random() * 9, 0.35 + Math.random() * 0.3, R_DUST); }
      lastStep = P.step;
    }
    if ((state === IDLE || state === MOVE) && P.door !== lastDoor) {   // 门缝一开：冒一小团尸气
      if (P.door === 1 && state === IDLE) for (let i = 0; i < 3; i++) spawnX(K_RISE, wx(P.bx + (Math.random() - 0.5) * 2), wy(-14 - Math.random() * 6), (Math.random() - 0.5) * 6, -5 - Math.random() * 5, 0.6 + Math.random() * 0.4, R_DUST, { age0: 0.2 });
      lastDoor = P.door;
    }
    if (state === IDLE) {                                              // 镐柄往地上一顿：柄尾扬尘
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? FL((lp - 1.6) * 12) : -1;
      if (f !== lastThump) { if (f === 3) { for (let i = 0; i < 5; i++) spawn(K_DUST, wx(P.hx - 1) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.3 + Math.random() * 0.2, R_DUST); } lastThump = f; }
    }
    if (state === RECOVER && stT > 0.1 && stT < 0.45) {                // 门缝喷两股尸气（dust 慢升）
      gasAcc += dt * 40; while (gasAcc >= 1) { gasAcc -= 1; const up = Math.random() < 0.5; spawnX(K_RISE, wx(P.bx + (Math.random() - 0.5) * 2), wy(up ? -22 : -10), (Math.random() - 0.5) * 10 + (up ? 0 : 6), -6 - Math.random() * 8, 0.8 + Math.random() * 0.5, R_DUST, { sz: Math.random() < 0.3 ? 2 : 1 }); }
    }
    if (state === DEATH && stT > T_SHUT && stT < INCOMING + 1.5) { gasAcc += dt * 14; while (gasAcc >= 1) { gasAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 20, HY - 15 - Math.random() * 3, (Math.random() - 0.5) * 8, -5 - Math.random() * 8, 0.6 + Math.random() * 0.6, R_SOUL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {   // 自上而下锈成铁屑：屑往下掉、落地走完色阶；魂光酸绿上升
      const q = (stT - INCOMING - 1.6) / 0.8;
      rustAcc += dt * 60; while (rustAcc >= 1) { rustAcc -= 1; spawnX(K_PHYS, HX - 26 + Math.random() * 38, HY - 18 + q * 16 + Math.random() * 3, (Math.random() - 0.5) * 14, 4 + Math.random() * 10, 0.7 + Math.random() * 0.5, R_RUST, { g: 90, floor: HY }); }
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 30, HY - 2 - Math.random() * 10, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); }
    }
    ghostT += dt;
  }
  function fxReset() { ghostT = 9; sparkAcc = 0; gasAcc = 0; soulAcc = 0; rustAcc = 0; lastStep = 0; lastDoor = 0; lastThump = -1; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(chest()[0], P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (ghostT < 0.25) blitShape(ghost, HX + P.mx, HY, P.flip, ghostT < 1 / 12 ? 29 : 28, clamp01(ghostT / 0.25)); }   // 凿击残影（冷钢剪影）
  const SHARDS = 24;
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (st === CHARGE) {                                               // 24 块铁片 / 铁钉（2×1）从四面八方定点飞向胸口，到了就贴上去
      const c = chest();
      for (let k = 0; k < SHARDS; k++) {
        const t0 = 0.12 + (k / SHARDS) * 1.0 + hash(k, 3) * 0.08, q = (t - t0) / 0.32; if (q < 0 || q > 1) continue;
        const a = hash(k, 1) * 6.2832, r = 22 + hash(k, 2) * 10, sx = c[0] + Math.cos(a) * r, sy = Math.min(HY - 1, c[1] + Math.sin(a) * r * 0.85);
        const e = q * q, x = RD(sx + (c[0] - sx) * e), y = RD(sy + (c[1] - sy) * e), hz = Math.abs(c[0] - sx) >= Math.abs(c[1] - sy);
        put(x, y, q > 0.8 ? EL[0] : EL[1]); put(hz ? x + (sx < c[0] ? -1 : 1) : x, hz ? y : y + (sy < c[1] ? -1 : 1), EL[3]);
      }
    }
    if (st === CAST || (st === RECOVER && t < 0.3)) {                  // 点阵护罩从两侧地面往上亮起，到头顶合拢；黄铜铆钉逐颗金闪
      const tt = st === CAST ? t - T_HARD : t + DUR[CAST] - T_HARD;
      if (tt >= 0) {
        const lit = clamp01(tt / 0.2), late = tt > 0.4, cx = wx(P.bx), n = 40;
        for (let k = 0; k <= n; k++) {
          const a = Math.PI + k / n * Math.PI, side = Math.min(k, n - k) / (n / 2); if (side > lit || (late && ((k + f12) & 1))) continue;
          put(RD(cx + Math.cos(a) * 21), RD(HY + Math.sin(a) * 40), side > lit - 0.12 ? EL[0] : (k & 1) ? EL[1] : EL[2]);
        }
        const rv = shellRivets(); for (let i = 0; i < rv.length; i++) { const d = tt - i * 0.022; if (d < 0 || d > 0.1) continue; const x = rv[i][0], y = rv[i][1]; put(x, y, GOLD[0]); if (d < 0.06) { put(x - 1, y, GOLD[1]); put(x + 1, y, GOLD[1]); put(x, y - 1, GOLD[1]); put(x, y + 1, GOLD[2]); } }
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) {           // 面盔眼光：蓄满 / 施放时往前拉出一道光
      const x = wx(P.gx), y = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1), d = P.flip ? -1 : 1;
      for (let r = 1; r <= L; r++) put(x + d * r, y, r <= 1 ? EL[0] : r <= 2 ? EL[1] : EL[2]);
    }
  }

  return {
    name: '钢铁军阀', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye], HIT_POINT: [6, -18], EVENTS,
    REVIVE: { ramp: R_SOUL, dy: -16, big: 1 },
    SFX: { body: 'armor', how: 'topple', pal: 'metal', style: 'summon', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
