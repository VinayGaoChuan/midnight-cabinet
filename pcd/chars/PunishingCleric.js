// 惩戒牧师（部队 · 人类 · 射手 · 稀有）：年轻的剃顶修士，及地白亚麻长袍 + 两条金圣带，头后一轮金色日轮光环（12 根短芒 = 法力条），
// 前手用铜链提着一只冒烟的金香炉，后手把一本金角经书贴在后腰。
// 攻击 = 香炉往前甩出半圈，炉口喷出一道正弦波形的金色粒子波（特性「粒子波」），每命中一次假人头顶多一颗日点；
// 技能 = 特性「太阳耀斑」+「粒子波」叠层：香炉在身侧抡成整圈、光环 12 根芒逐根点亮 → 日冕爆开 → 两倍速连甩三次，三道粒子波一道比一道粗，日点 1 → 3。
// 死亡 = 双膝跪下合十 → 侧身仰倒，香炉滚出一圈冒最后一缕烟，光环裂成两半落地、芒逐根熄灭。
// 升级成「主教」（Bishop.js）：同一个人——剃顶、日轮光环、金香炉、白袍金饰、日耀元素都保留。
PCD.define('PunishingCleric', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, TAU = Math.PI * 2, CST = Math.PI / 16;   // 香炉链角一档 = π/16（0 = 垂下，正 = 往前甩）

  // ───── 元素：日耀（白 → 淡金 → 日黄 → 金 → 暗金），全部是共享色板里已有的颜色 ─────
  const R_EL = fxRamp('solar', [21, 51, 47, 14, 61]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: 'white', band: 2 }, sleeve: 'white', gold: 'gold', stole: [20, 19, 14, 47], cord: 'wood', skin: 'skin', hair: 'boot', ink: { r: 'ink', flat: 1 },
    shoe: 'wood', chain: 'leather', cover: 'crimson', page: 'bone',
    sun: { r: [61, 14, 47, 51], flat: 1 },                // 光环的芒 / 香炉余烬：1 熄灭 · 2 平时 · 3 日黄 · 4 淡金
    hot: { r: [51, 51, 21, 21], flat: 1 },                // 白热（施放时的芒、香炉芯）
  });
  const BODY = { body: 'standard', stride: 2, fall: 'back' }, R0 = parts.rig({}, BODY);
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(80, 52, 38, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'ink', 'sun', 'hot', 'chain', 'hair', 'cover', 'page', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ═════ 自绘部件（通用的标了「候选部件」，以后收进库）═════
  // 候选部件：sunHalo —— 头后的日轮光环（9×9）：中心 3×3 日盘 + 半径 2 的细金环 + 12 根短芒（半径 3、4 各 1 格，芒根接在环上）。
  // 芒就是法力格：从后下方经头顶到前方逐根点亮。参数：T 落笔变换（rig 或 parts.FREE）、cx cy 圆心、half 0 整个 · 1 左半 · 2 右半（裂开的两半）。
  // 全部用 flat 材质：光环是发光体，前面的头发 / 头不会在它上面压分界线。读 P：mana hl tw st（见 rayTone）
  function rayTone(i) {
    if (P.hl === 3) return [M.hot, 3];
    if (P.hl === 0) return [M.sun, P.tw === i + 1 ? 4 : 2];
    if (i < P.mana) return [M.sun, P.hl === 2 ? 4 : 3];
    return [M.sun, P.st === CHARGE || P.st === DEATH ? 1 : 2];
  }
  function sunHalo(T, cx, cy, half) {
    E.part(); const hot = P.hl === 3, cut = (dx) => (half === 1 && dx > 0) || (half === 2 && dx < 1);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (cut(dx)) continue; const d = Math.hypot(dx, dy);
      if (d < 1.6) parts.px(E, T, cx + dx, cy + dy, hot ? M.hot : M.sun, hot ? 3 : (P.hl >= 2 || (dx === 0 && dy === 0) ? 4 : 3));   // 日盘（中心淡金）
      else if (d <= 2.4) parts.px(E, T, cx + dx, cy + dy, M.sun, hot ? 4 : 2);                                          // 细金环（比日盘暗一级，两层分得开）
    }
    for (let i = 0; i < 12; i++) {
      const a = (120 + i * 30) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x1 = RD(c * 3.2), x2 = RD(c * 4.2);
      if (cut(x1) && cut(x2)) continue; const [m, t] = rayTone(i);
      if (!cut(x1)) parts.px(E, T, cx + x1, cy + RD(s * 3.2), m, t);
      if (!cut(x2)) parts.px(E, T, cx + x2, cy + RD(s * 4.2), m === M.hot ? M.sun : m, m === M.hot ? 4 : t >= 3 ? t - 1 : t);
    }
  }
  // 候选部件：censerChain —— 手提铜链（5 格，逐格亮暗 = 链环）+ 挂在链端的香炉（部件库提灯当炉身，按链角 90° 一档翻转，炉身永远在链的延长线上）。
  // 参数：hx hy 手、th 链角（0 垂下，正 = 往前甩）。返回 { hook, focus 炉心, top 炉口 }（精灵本地坐标）
  const LROT = [0, 3, 2, 1], LOFF = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const rotOf = (th) => LROT[((RD(th / HALF) % 4) + 4) % 4];
  const LAMP = { metal: M.gold, glass: M.sun, glow: M.hot };
  function censerGeo(hx, hy, th) { const kx = hx + RD(5 * Math.sin(th)), ky = hy + RD(5 * Math.cos(th)), r = rotOf(th), o = LOFF[r]; return { kx, ky, r, fx: kx + o[0] * 5, fy: ky + o[1] * 5, tx: kx + o[0] * 2, ty: ky + o[1] * 2 }; }
  function censerChain(R, hx, hy, th) {
    const G = censerGeo(hx, hy, th);
    E.part(); for (let k = 1; k <= 5; k++) parts.px(E, R, hx + RD(k * Math.sin(th)), hy + RD(k * Math.cos(th)), M.chain, (k & 1) ? 4 : 2);
    parts.lantern(E, R, P, Object.assign({ at: [G.kx, G.ky], rot: G.r }, LAMP));
    return G;
  }
  // 掉在地上的香炉：crot 翻滚档（滚一圈 = 0 → 3 → 2 → 1），炉身中心在 (11 + hatX, −4)
  function groundGeo() { const r = [0, 3, 2, 1][P.crot & 3], o = LOFF[r], cx = 11 + P.hatX, cy = -4; return { r, ax: cx - o[0] * 4, ay: cy - o[1] * 4, cx, cy }; }
  // 候选部件：stoles —— 并进长袍部件（紧跟 parts.torso、不另开部件）的两条金圣带：从肩垂到膝，各 2 列（自动明暗 = 左亮右暗），末端金穗，随下摆摆。
  function stoles(R, tor) {
    const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, ix = (y) => Math.max(0, Math.min(RR.length - 1, y - y0));
    const top = R.yS + 1, end = Math.min(tor.hem - 2, R.kneel ? -3 : R.yHip + 4), n = Math.max(1, end - top), sw = P.sway || 0;
    const fx0 = RR[ix(R.yS + 2)] - 2, bx0 = fx0 - 3;
    for (let y = top; y <= end; y++) {
      const q = (y - top) / n, s = RD(sw * q * q);
      parts.px(E, R, fx0 + s, y, M.stole, 4); parts.px(E, R, fx0 + 1 + s, y, M.stole, 3);                  // 前面那条：2 列（亮金 + 金）
      if (bx0 + s >= LL[ix(y)] + 1) parts.px(E, R, bx0 + s, y, M.stole, (y & 1) ? 3 : 2);                   // 后面那条：1 列，隔行暗一级（绣纹）
    }
    const s = RD(sw); parts.px(E, R, fx0 + s, end + 1, M.stole, 3); parts.px(E, R, fx0 + 1 + s, end + 1, M.stole, 2); parts.px(E, R, fx0 + s, end + 2, M.stole, 2);   // 金穗
    parts.px(E, R, bx0 + s, end + 1, M.stole, 2);
  }

  // 候选部件：tonsure —— 并进脸部件（紧跟 parts.head、不另开部件）的剃顶：头顶上一行光秃的圆顶（1 格高光）+ 头顶一圈深褐短发（不盖到额前），
  // 后脑两列短发垂到耳下。和脸同一个部件，发和脸之间是自动明暗的边，不会压出一圈深色分界线。
  function tonsure(R, m) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey;
    parts.run(E, R, top - 1, x0 + 1, x1 - 1, M.skin, 0); parts.px(E, R, x0 + 2, top - 1, M.skin, 4);
    parts.run(E, R, top, x0, x1 - 2, m, 0); for (let y = top + 1; y <= ey + 2; y++) parts.px(E, R, x0, y, m, 0); for (let y = top + 1; y <= ey; y++) parts.px(E, R, x0 + 1, y, m, y === ey ? 2 : 0);
  }

  // ───── 姿势：前手提链（hx hy + 链角 cs，单位 π/16），后手按在后腰的经书上（合十时并到前手旁）─────
  const P = { hx: 0, hy: 0, cs: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, dqk: 0, mana: 0, tw: 0, hl: 0, st: 0,
    cfree: 0, crot: 0, split: 0, hsy: 0, pray: 0, hcx: 0, hcy: 0, ctx: 0, cty: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, cs, lean, head) => ({ hx, hy, cs, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(8, -15, 0);                  // 手在胸前提链，香炉垂在身前
  const K_WIND = K(6, -14, -4, -1, 0);           // 预兆：香炉往后荡
  const K_FLICK = K(9, -18, 10, 1, 1);           // 出手：往前甩出半圈，炉口朝前上方
  const K_HOLD = K(8, -17, 8, 1, 0);
  const K_WHIRL = K(10, -18, 0, 0, -1);          // 蓄力：手伸到身前侧，香炉抡整圈（链角另算；圈心前移，少挡脸）
  const K_UP = K(6, -20, 16, -1, -1);            // 耀斑：香炉举过头顶
  const K_BACK = K(6, -15, -4, 0, 0);            // 两倍速连甩的后荡
  const K_HURT = K(5, -15, -4, -1, -1);
  const K_PRAY = K(5, -12, 0, 1, 1);             // 跪下合十
  const FIELDS = ['hx', 'hy', 'cs', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 31], ['hy', -40, 0], ['cs', -16, 31], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -16, 15],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -16, 15], ['hatY', 0, 7], ['dqk', 0, 48], ['mana', 0, 12], ['tw', 0, 12],
    ['hl', 0, 3], ['st', 0, 8], ['cfree', 0, 1], ['crot', 0, 3], ['split', 0, 2], ['hsy', 0, 7], ['pray', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], SWING = [0, 1, 2, 1, 0, -1, -2, -1];
  const T_FLICK = 2 / 12, T_LAND = INCOMING + 0.66, T_HALO = INCOMING + 0.74, T_WISP = INCOMING + 1.0;
  const wrapCs = (v) => { v = RD(v); v = ((v % 32) + 32) % 32; return v >= 24 ? v - 32 : v; };

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0;
    P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.crouch = 0; P.mana = 0; P.tw = 0; P.hl = 0;
    P.cfree = 0; P.crot = 0; P.split = 0; P.hsy = 0; P.pray = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; P.cs = SWING[Math.floor(lp / 0.3 + 1e-6) & 7];                          // 待机个性①：摇香炉（荡到前端冒一缕烟）
      if (lp >= 0.3 && lp < 1.3) P.tw = Math.floor((lp - 0.3) * 12 + 1e-6) + 1;                      // ②光环的芒逐根轻闪一遍（数法力）
      if (lp >= 1.6 && lp < 2.1) { P.eyes = 1; P.head = 1; P.lean = 1; P.hy += 1; }                  // ③低头默念
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 庄重慢步：小步幅、袍摆扫地，香炉随步反相前后荡
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq)); P.cs = -P.step * 3 + (P.wup === 2 ? 1 : P.wup === 1 ? -1 : 0); P.hx += P.step * 0.5;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.gem = 3; P.rim = 2; P.sway = -1; P.bend = 1; }
      else if (tq < 0.45) { setK(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 2; P.sway = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                      // 香炉在身侧抡整圈，越转越快；光环的芒逐根点亮
      const q = ease.inOut(clamp01(tq / 0.25)); setK(K_IDLE, K_WHIRL, q);
      P.cs = wrapCs((7 * tq + 3.9 * tq * tq) / CST); P.hl = 1; P.mana = Math.min(12, Math.floor(tq * 12 / 1.3 + 1e-6));
      P.rim = tq < 0.7 ? 1 : 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.sway = tq > 0.5 ? ((f12 & 1) ? -1 : 0) : 0; P.bend = tq > 0.5 ? 1 : 0;
    } else if (st === CAST || (st === RECOVER && tq < 1 / 12)) {     // 耀斑：香炉高举 → 两倍速连甩（后荡 / 前甩交替，前甩帧放粒子波）
      const u = st === CAST ? f12of(t) : 6; P.hl = 3; P.mana = 12; P.rim = 3; P.gem = 3; P.sway = -1; P.bend = 1;
      if (u === 0) setK(K_UP, K_UP, 0);
      else if (u & 1) { setK(K_BACK, K_BACK, 0); P.gem = 2; P.sway = 1; }
      else setK(K_FLICK, K_FLICK, 0);
    } else if (st === RECOVER) {                                     // 收招：香炉减速回到小幅晃荡，芒逐根回暗
      const q = ease.inOut(clamp01((tq - 1 / 12) / 0.5)); setK(K_HOLD, K_IDLE, q);
      P.hl = q < 0.35 ? 2 : q < 0.8 ? 1 : 0; P.mana = RD(12 * (1 - q)); P.rim = q < 0.5 ? 2 : 1; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 受击 → 跪下合十（香炉滑脱）→ 侧身仰倒 → 香炉滚一圈、光环裂两半 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_PRAY, K_PRAY, 0); P.bx = -2; P.crouch = 4; P.eyes = 1; P.pray = 1; P.cfree = 1; P.hl = 1; P.mana = 12; P.gem = 1; }
      else {
        setK(K_HURT, K_HURT, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.cfree = 1; P.head = 0; P.lean = 0;
        P.hx = R0.sFx + 2; P.hy = R0.yWaist - 1;
        const rq = clamp01((d - 0.66) / 0.34); P.hatX = RD(6 * rq); P.crot = d < 0.66 ? 0 : d < 1.0 ? Math.floor((d - 0.66) * 12 + 1e-6) & 3 : 0; P.hatY = 0;
        P.split = d < 0.74 ? 1 : 2; P.hsy = d < 0.74 ? RD(7 * (1 - clamp01((d - 0.5) / 0.24))) : 0;
        P.hl = 1; P.mana = d < 0.9 ? 12 : Math.max(0, 12 - Math.floor((d - 0.9) * 20 + 1e-6));
        P.gem = d < 1.0 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.cs = RD(P.cs); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqk = RD(P.dq * 48);
    const R = parts.rig(P, BODY);
    if (R.lie) { const h = parts.toSprite(R, R.hx - 4, R.htop + 1); P.hcx = h[0] + P.bx; P.hcy = h[1]; } else { P.hcx = R.hx - 4 + P.bx; P.hcy = R.htop + 1; }
    if (P.cfree) { const g = groundGeo(); P.gx = g.cx + P.bx; P.gy = g.cy; P.ctx = P.gx; P.cty = g.cy - 2; }
    else { const G = censerGeo(P.hx, P.hy, P.cs * CST); P.gx = G.fx + P.bx; P.gy = G.fy; P.ctx = G.tx + P.bx; P.cty = G.ty; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    // 光环（最后面）：站着时在头后；倒地后裂成两半落在头边
    if (!R.lie) sunHalo(R, R.hx - 4, R.htop + 1, 0);
    else { const h = parts.toSprite(R, R.hx, R.htop); sunHalo(parts.FREE, h[0] - 11, -3 - P.hsy, 1); sunHalo(parts.FREE, h[0] - 6, -3 - RD(P.hsy * 0.6), 2); }
    // 后臂 + 贴在后腰的经书（合十时后手并到前手旁）
    const bw = parts.edges(R, R.yWaist), book = [bw[0] - 3, R.yWaist + 2], bh = [book[0] + 1, book[1] - 2];
    parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.sleeveD, cuff: M.goldD, grip: 'none', at: P.pray ? [P.hx - 1, P.hy] : bh });
    parts.book(E, R, P, { open: 0, cover: M.cover, page: M.page, trim: M.gold, at: book });
    if (!P.pray) parts.hand(E, R, P, { side: 'B', at: bh, hand: M.skinD });
    parts.legs(E, R, P, { style: 'shoe', mat: M.robeD, matD: M.robeD, boot: M.shoe, bootD: M.shoeD });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, belt: M.cord, collar: M.gold, tassel: M.cord });
    stoles(R, tor);
    parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'young', eye: M.ink, brow: M.hair, nose: 'small', mouth: 'line', bald: 1 });
    tonsure(R, M.hair);
    if (P.pray) parts.hand(E, R, P, { side: 'B', at: [P.hx - 1, P.hy], hand: M.skinD });
    if (P.cfree) { const g = groundGeo(); parts.lantern(E, R, P, Object.assign({ free: 1, at: [g.ax, g.ay], rot: g.r }, LAMP)); }
    else censerChain(R, P.hx, P.hy, P.cs * CST);
    parts.arm(E, R, P, { sleeve: 'bell', mat: M.sleeve, cuff: M.gold, hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.hcx + hero.ox; RIM.ry = P.hcy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 粒子波（自管的 4 个槽）：沿正弦路径推进，波头白、往后逐级变暗；w = 粗细 1–3，k = 0 攻击 · 1–3 技能第几波
  const WN = 4, wOn = new Uint8Array(WN), wX = new Float32Array(WN), wX0 = new Float32Array(WN), wY0 = new Float32Array(WN), wW = new Uint8Array(WN), wK = new Uint8Array(WN), wT = new Float32Array(WN);
  const WAVE_V = 170, WAVE_A = 3, WAVE_L = 13, WY1 = HY - 14, WTX = DUMMY_X - 3;
  function waveY(i, x) { const s = x - wX0[i], q = clamp01(s / Math.max(1, WTX - wX0[i])), env = Math.min(1, s / 6); return wY0[i] + (WY1 - wY0[i]) * q + Math.sin(s / WAVE_L * TAU) * WAVE_A * env; }
  function launch(w, k) { let i = 0; for (; i < WN - 1 && wOn[i]; i++); const x = scrX(P.gx), y = HY + P.gy; wOn[i] = 1; wX[i] = x; wX0[i] = x; wY0[i] = y; wW[i] = w; wK[i] = k; wT[i] = 0; mzT = 0; mzX = x; mzY = y; burst(x, y, 4 + w * 2, 30, 60, 0.15, 0.3, R_EL, 0); sfx('shoot', { proj: 'orb' }); }
  let stacks = 0, stackT = 9, coronaT = 9, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, smokeAcc = 0, soulAcc = 0, lastStep = 0, lastCs = 0;
  function waveHit(i) {
    const k = wK[i], x = WTX, y = WY1; stacks = Math.min(3, stacks + 1); stackT = 0;
    if (k === 0) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 }); return; }
    burst(x, y, [8, 14, 22][k - 1], 45, 120, 0.2, 0.5, R_EL, 12);
    if (k === 3) { hitDummy(1); shake(0.12, 1); ring(x, y, 1, R_EL); fx.cross(x, y, 5, R_EL, 0.3); } else hitDummy(0);
    sfx('impact', { pal: 'holy', w: [0.4, 0.55, 0.8][k - 1] });
  }
  function wisp(n, vy) { for (let j = 0; j < n; j++) spawnX(K_EMBER, scrX(P.ctx) + j - 1, HY + P.cty, (Math.random() - 0.5) * 4, -(vy || 8) - Math.random() * 5, 0.9 + Math.random() * 0.6, R_EL, { age0: 0.35 }); }
  function onEnter(s) {
    if (s === CAST || s === RECOVER) poseAt(s, 0, E.simT);           // 进入时 P 还是上一个状态的姿势，先摆好这一帧
    if (s === CAST) {                                                 // 太阳耀斑：光环爆出日冕
      const hx = scrX(P.hcx), hy = HY + P.hcy; coronaT = 0;
      releaseOrbit(40, 90, 0.35, 0.7, { pts: 1 }); burst(hx, hy, 28, 60, 140, 0.3, 0.7, R_EL, 10); ring(hx, hy, 1, R_EL); fx.cross(hx, hy, 6, R_EL, 0.3); shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) { launch(3, 3); sfx('swing', { kind: 'staff', w: 0.45 }); }   // 第三甩（收招第 0 帧）
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) { launch(1, 0); sfx('swing', { kind: 'staff', w: 0.3 }); }
    if (s === CAST && (t === 2 / 12 || t === 4 / 12)) { launch(t < 0.25 ? 1 : 2, t < 0.25 ? 1 : 2); sfx('swing', { kind: 'staff', w: 0.4 }); }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.4 }); }
    if (s === DEATH && t === T_HALO) { poseAt(DEATH, t, t); const x = scrX(P.hcx), y = HY - 2; burst(x - 5, y, 6, 20, 50, 0.15, 0.35, R_EL, 14); burst(x - 1, y, 6, 20, 50, 0.15, 0.35, R_EL, 14); }
    if (s === DEATH && t === T_WISP) { poseAt(DEATH, t, t); wisp(3, 5); }
  }
  const EVENTS = [[], [], [T_FLICK], [], [2 / 12, 4 / 12], [], [], [T_LAND, T_HALO, T_WISP], []];
  function stepFX(dt, state, stT) {
    const hx = scrX(P.hcx), hy = HY + P.hcy;
    if (state === CHARGE) {                                           // 金色光点从脚下螺旋上升，汇聚并环绕光环中心
      chargeAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = HALF + (Math.random() - 0.5) * 1.4, r = 17 + Math.random() * 6; spawnX(K_SPIRAL_PT, hx, hy, r / (0.6 + Math.random() * 0.35), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 2.5, squash: 1, orbitR: 5 + (Math.random() < 0.4 ? 1 : 0), orbitW: 7 }); }
    }
    if (state === IDLE && !P.lying) { if (P.cs === 2 && lastCs !== 2) wisp(3); smokeAcc += dt * 1.5; while (smokeAcc >= 1) { smokeAcc -= 1; wisp(1, 6); } }   // 荡到前端冒一缕烟 + 平时的细烟
    if (state === RECOVER) { smokeAcc += dt * 5; while (smokeAcc >= 1) { smokeAcc -= 1; wisp(1, 9); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.25 }); spawnX(K_EMBER, scrX(P.gx), HY + P.gy + 2, (Math.random() - 0.5) * 6, -4 - Math.random() * 4, 0.6 + Math.random() * 0.3, R_EL, { age0: 0.2 }); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < WN; i++) {
      if (!wOn[i]) continue; wX[i] += WAVE_V * dt; wT[i] += dt;
      if (Math.random() < 0.35 + wW[i] * 0.15) spawn(K_TRAIL, wX[i] - 4, waveY(i, wX[i] - 4) + (Math.random() - 0.5) * wW[i], -10 - Math.random() * 10, (Math.random() - 0.5) * 8, 0.2 + Math.random() * 0.2, R_EL);
      if (wX[i] >= WTX) { wOn[i] = 0; waveHit(i); }
    }
    lastCs = P.cs; stackT += dt; if (stackT >= 1.6) stacks = 0; coronaT += dt; mzT += dt;
  }
  function fxReset() { wOn.fill(0); stacks = 0; stackT = 9; coronaT = 9; mzT = 9; chargeAcc = 0; smokeAcc = 0; soulAcc = 0; lastStep = 0; lastCs = 0; }
  function fxBack(f12) {
    if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (P.st === CHARGE && !P.lying) {                                // 香炉抡圈的圆形拖影（在身后）
      const hx = scrX(P.hx + P.bx), hy = HY + P.hy, th = P.cs * CST;
      for (let k = 1; k <= 16; k++) { if (k > 9 && ((k + f12) & 1)) continue; const a = th - k * 0.2; put(hx + RD(Math.sin(a) * 9.5), hy + RD(Math.cos(a) * 9.5), k < 4 ? EL[1] : k < 10 ? EL[2] : EL[3]); }
    }
    if (coronaT < 0.42) {                                             // 日冕：12 道芒从光环向外伸长 6 格
      const hx = scrX(P.hcx), hy = HY + P.hcy, c = coronaT < 2 / 12 ? EL[0] : coronaT < 0.25 ? EL[1] : coronaT < 0.34 ? EL[2] : EL[3], L = coronaT < 0.25 ? 10 : 8;
      for (let i = 0; i < 12; i++) { const a = (120 + i * 30) * Math.PI / 180; for (let r = 5; r <= L; r++) { if (coronaT > 0.25 && ((r + f12) & 1)) continue; put(hx + RD(Math.cos(a) * r), hy + RD(Math.sin(a) * r), r > L - 2 && coronaT < 2 / 12 ? EL[1] : c); } }
    }
  }
  function sunDot(x, y, c0) { put(x, y, c0); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[2]); }
  function fxFront(f12) {
    for (let i = 0; i < WN; i++) {                                    // 粒子波：正弦路径，尾巴后半断续
      if (!wOn[i]) continue; const w = wW[i], L = 12 + w * 5;
      for (let d = 0; d <= L; d++) {
        const x = wX[i] - d; if (x < wX0[i]) break; if (d > L * 0.55 && ((d + f12) & 1)) continue;
        const y = RD(waveY(i, x)), lv = d < 1 ? 0 : d < 4 ? 1 : d < L * 0.6 ? 2 : 3, X = RD(x);
        put(X, y, EL[lv]); if (w >= 2) put(X, y + 1, EL[Math.min(4, lv + 1)]); if (w >= 3) put(X, y - 1, EL[Math.min(4, lv + 1)]);
      }
      const hx = RD(wX[i]), hy = RD(waveY(i, wX[i]));
      if (w >= 2) { put(hx + 1, hy, EL[0]); put(hx, hy - 1, EL[1]); put(hx, hy + 1, EL[1]); }
      if (w >= 3) { put(hx + 2, hy, EL[1]); put(hx - 1, hy - 2, EL[2]); put(hx - 1, hy + 2, EL[2]); }
      for (let x = hx - 3; x <= hx + 3; x++) if (((x + f12) & 1) === 0) put(x, FLOOR, EL[2 + (Math.abs(x - hx) > 1 ? 1 : 0)]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (stacks && !(stackT > 1.2 && (f12 & 1))) for (let i = 0; i < stacks; i++) sunDot(DUMMY_X - 4 + i * 4, HY - 33, i === stacks - 1 && stackT < 0.17 ? EL[0] : EL[1]);   // 假人头顶的日点（叠层）
  }

  return {
    name: '惩戒牧师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.sun, M.hot], HIT_POINT: [1, -12], EVENTS,
    SFX: { body: 'flesh', how: 'collapse', pal: 'holy', style: 'buff', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
