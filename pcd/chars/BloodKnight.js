// 血骑士（部队 · 骷髅 · 守护者 · 优质 · batch-15）：英武骨架的骷髅骑士——桶盔顶竖一撮向后甩的血红马鬃，铁胸甲只包到胸口，
// 腰部只剩一根脊椎 + 骨盆、骨手骨腿套铁胫甲；身后三道燕尾的暗酒红长披风，后手托一面鸢形盾（盾面金圣杯，杯里的血发光），前手锯齿放血弯剑。
// 攻击 = 刺（盾护身前，从盾沿上方单手平刺，拔剑带出一串血珠）；技能 = 特性「吸血」光环：血滴逆流汇进圣杯 → 盾顿地、血色法阵罩住身后友军 → 血丝把血珠送回盾上。
// 升级成「狮锤」（LionHammer.js）：盔缨长成狮子头盔、圣杯长成背后的炖汤锅、燕尾披风变狮皮披风。
PCD.define('BloodKnight', (E) => {
  const { parts, Sprite, bake, part, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px, HALF = Math.PI / 2;

  // ───── 元素：吸血 · 暗红（blood：白 → 淡粉 → 红 → 暗红 → 墨红）─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    cape: { r: [0, 55, 56, 57], band: 2 },                          // 暗酒红披风（blood 色阶往暗挪一级，主材质）
    tab: [0, 55, 56, 57],                                            // 罩袍竖条 / 腰前垂布
    plate: 'iron', face: 'steel', gold: 'gold', bone: 'bone', crest: 'crimson',
    blade: 'steel', edge: [27, 29, 30, 31],
    blood: { r: [55, 57, 58, 21], flat: 1 },                         // 发光体：圣杯里的血 / 剑的血槽
    eye: { r: [55, 56, 57, 58], flat: 1 },                           // 桶盔面罩缝里的眼光
  });
  const BODY = { body: 'heroic', fall: 'back' }, BODY_LOOK = { body: 'heroic', fall: 'back', neck: -1 };   // 致意：头低 1 格
  const SWORD = { style: 'saber', hand: 'F', metal: M.blade, edge: M.edge, trim: M.gold, wood: M.bone, glow: M.blood, len: 10, w: 2, guard: 3 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 62, 44, 56);                           // 脚底 = (44, 56)：放得下后仰倒地（头在左）、甩到头后的剑、飞出的盾
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['blood', 'eye', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 弯剑（hx hy a），后手 = 鸢形盾握把（bhx bhy，盾心 = 后手 + (1, 1)）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, look: 0, drip: 0, mup: 0, drop: 0, shX: 0, shH: 0, shR: 0, mane: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(7, -18, 0.3, 6, -12);                             // 剑竖在盾沿上方，盾护胸前
  const K_WIND = K(1, -19, HALF, 8, -12, -1, 0, 1);                  // 剑往后收平
  const K_STAB = K(11, -19, HALF, 8, -12, 1);                        // 从盾沿上方平刺
  const K_HOLD = K(10, -18, HALF + 0.1, 8, -12, 1);
  const K_CHARGE = K(1, -13, 2.5, 8, -19, -1, -1);                   // 盾举到齐胸，剑垂在身侧
  const K_CAST = K(2, -14, 2.7, 9, -9, 1, 1, 2);                     // 盾往地上一顿（盾尖插地）
  const K_HURT = K(3, -16, -0.3, 5, -12, -1, -1);
  const K_STAG = K(2, -15, -0.5, 4, -11, -1, -1, 2);                 // 后仰踉跄，盾脱手
  const K_LIE = K(3, -12, 0, -1, -13);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7],
    ['look', 0, 1], ['bob', 0, 1], ['drip', 0, 6], ['shX', -8, 31]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['mup', 0, 1], ['drop', 0, 2], ['shH', 0, 15], ['shR', 0, 3], ['mane', 0, 2]]);
  const SWAY = [0, 1, 0, -1];
  const T_STAB = 2 / 12, T_PULL = 4 / 12, T_LINK = 2 / 12, T_SHLAND = INCOMING + 0.6, T_LAND = INCOMING + 8 / 12, T_MIST = INCOMING + 1.5;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.look = 0; P.drip = 0; P.mup = 0; P.drop = 0; P.shX = 0; P.shH = 0; P.shR = 0; P.mane = 0;
    const idle = () => {                                              // 呼吸 2 帧、盔缨 / 披风错相位摆；循环末尾举杯敬酒：圣杯溢出一滴血顺盾滑下，低头致意
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.1) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.drip = Math.min(6, f + 1); P.look = f >= 1 && f <= 4 ? 1 : 0; P.glint = f === 0 ? 1 : 0; P.beard = f >= 1 && f <= 4 ? 1 : P.beard; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 大步迈步：盾随步子上下 1 格，剑随步摆一档
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.a = K_IDLE.a + P.step * 0.1; P.bhy += P.wup ? -1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_STAB, K_STAB, 0); P.bx = 4; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STAB, K_HOLD, q); P.bx = RD(4 - q * 2); P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                       // 盾举起，圣杯满溢；盔缨被气流吹起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.mup = q > 0.5 ? 1 : 0; P.beard = q > 0.85 ? ((f12 & 1) ? -3 : -1) : -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                         // 盾往地上一顿，定格
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.mup = 1; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                      // 拔起盾，回到身前
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 后仰：盾先脱手翻滚落地 → 仰面倒下 → 盔缨立在头边最后倒下 → 血雾上升
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        P.eyes = 1; P.gem = 4;
        const sq = clamp01((d - 0.32) / 0.28);                         // 盾：0.32 脱手 → 0.6 落地（先于身体）
        P.drop = sq >= 1 ? 2 : 1; P.shX = RD(6 + 12 * sq); P.shH = sq >= 1 ? 0 : RD(8 * (1 - sq) + Math.sin(sq * Math.PI) * 6); P.shR = sq >= 1 ? 1 : Math.floor(sq * 5) & 3;
        if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = -2; P.beard = 2; P.sway = 2; }
        else {
          setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
          P.mane = d < 0.85 ? 2 : d < 0.95 ? 1 : 0;
          if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = Math.min(3, RD(P.crouch)) + (P.lying ? 0 : P.bob);
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.drop) { P.gx = P.shX + P.bx; P.gy = -4 - P.shH; }            // 发光体 = 圣杯（杯心在盾心上方 3 格）
    else { P.gx = P.bhx + 1 + P.bx; P.gy = P.bhy + 1 - 4 - P.lift; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：boneWaist 骨腰——胸甲只到胸口时，腰上露出一根 2 格宽的脊椎（逐节亮暗）+ 一根浮肋，胯行画骨盆（两侧髂骨各亮 1 格）。读 rig（前倾、驼背都算进 edges）
  function boneWaist(R, m) {
    part();
    for (let y = R.yWaist; y < R.yHip; y++) { const e = parts.edges(R, y), x = e[0] + 3; px(E, R, x, y, m, (y & 1) ? 4 : 3); px(E, R, x + 1, y, m, (y & 1) ? 3 : 2); }
    const ew = parts.edges(R, R.yWaist); px(E, R, ew[0] + 5, R.yWaist, m, 3); px(E, R, ew[0] + 6, R.yWaist + 1, m, 2);
    const e = parts.edges(R, R.yHip); run(R.yHip, e[0] + 1, e[1] - 1, m); px(E, R, e[0] + 2, R.yHip - 1, m, 4); px(E, R, e[1] - 2, R.yHip - 1, m, 3);
  }
  function run(y, a, b, m, t) { for (let x = a; x <= b; x++) px(E, cur, x, y, m, t || 0); }
  let cur = null;
  // 腰前垂布：铁腰带 + 金扣，前半垂一块酒红罩袍到膝上（两道褶、下摆锯齿、随 sway 摆）
  function tasset(R) {
    part(); const yH = R.yHip, e = parts.edges(R, yH), mid = RD((e[0] + e[1]) / 2), sw = RD(P.sway || 0);
    for (let x = e[0] + 1; x <= e[1]; x++) px(E, R, x, yH - 1, M.plate, x === e[0] + 1 ? 4 : 0);
    px(E, R, e[1] - 1, yH - 1, M.gold, 4); px(E, R, e[1] - 2, yH - 1, M.gold, 3);
    for (let k = 0; k <= 5; k++) {
      const y = yH + k, s = k >= 3 ? RD(sw * (k - 2) * 0.35) : 0, a = mid - 1 + s, b = e[1] + (k < 2 ? 1 : 0) + s;
      for (let x = a; x <= b; x++) { if (k === 5 && ((x - s) & 1)) continue; px(E, R, x, y, M.tab, x === a + 1 && k > 0 ? 2 : x === b - 1 && k > 1 && k < 5 ? 2 : 0); }
    }
  }
  // 候选部件：maneCrest 盔顶马鬃盔缨——盔顶竖起一撮（高 3 行），再向后甩出 5 格、逐行下垂到尖；每 2 列一道暗鬃丝，尖端随 P.beard 摆；up = 1 被气流吹起（尾部整体上抬 2 行）。
  // T = 头饰坐标（u = 0 头中线、v = 0 盔顶那一行）
  const MANE = [[-3, -1, 0], [-2, -3, 1], [-1, -5, 2], [0, -7, -3], [1, -8, -4], [2, -8, -6], [3, -8, -8]];
  function maneCrest(T, up, b) {
    part();
    for (let i = 0; i < MANE.length; i++) {
      const [v, a, z] = MANE[i], tail = i >= 3, dv = tail && up ? -2 : 0, sh = tail ? RD(b * (i - 2) * 0.25) : 0;
      for (let u = a; u <= z; u++) px(E, T, u + sh, v + dv, M.crest, i === 0 || u === a ? 4 : (u & 1) ? 2 : 0);
    }
  }
  // 倒地后立在头边的那撮盔缨：lv 2 竖立 · 1 斜倒 · 0 贴地（精灵坐标，x0 y0 = 盔顶）
  function maneFallen(x0, y0, lv) {
    part(); const m = M.crest;
    if (lv === 2) { for (let k = 1; k <= 5; k++) { px(E, parts.FREE, x0 - 1, y0 - k, m, k === 5 ? 4 : 0); px(E, parts.FREE, x0, y0 - k, m, (k & 1) ? 2 : 0); } px(E, parts.FREE, x0 + 1, y0 - 5, m, 4); }
    else if (lv === 1) { for (let k = 1; k <= 5; k++) { px(E, parts.FREE, x0 - k, y0 - k, m, k === 5 ? 4 : 0); px(E, parts.FREE, x0 - k + 1, y0 - k, m, 2); } }
    else { for (let k = 1; k <= 6; k++) { px(E, parts.FREE, x0 - k, 0, m, k === 6 ? 4 : 0); px(E, parts.FREE, x0 - k, -1, m, (k & 1) ? 2 : 0); } }
  }
  // 盾面圣杯纹章（和盾同一部件）：金杯口 5 格、杯身、杯柄、底座，杯里的血按发光档亮；drip 1–6 = 溢出的一滴血顺盾面往下滑
  function chalice(T, lv, drip) {
    const g = M.gold, bl = M.blood, bt = lv === 4 ? 1 : lv === 3 ? 4 : lv >= 1 ? 3 : 2;
    for (let x = -2; x <= 2; x++) px(E, T, x, -5, g, x === -2 ? 4 : x === 2 ? 2 : 3);
    px(E, T, -2, -4, g, 4); px(E, T, 2, -4, g, 2); for (let x = -1; x <= 1; x++) px(E, T, x, -4, bl, x === 0 && lv === 3 ? 4 : bt);
    px(E, T, -1, -3, g, 3); px(E, T, 0, -3, bl, Math.max(1, bt - 1)); px(E, T, 1, -3, g, 2);
    px(E, T, 0, -2, g, 3); px(E, T, 0, -1, g, 2); px(E, T, -1, 0, g, 4); px(E, T, 0, 0, g, 3); px(E, T, 1, 0, g, 2);
    if (lv === 2 || lv === 3) { px(E, T, -1, -6, bl, 3); px(E, T, 0, -6, bl, 4); px(E, T, 1, -6, bl, 3); px(E, T, 3, -5, bl, 3); px(E, T, -3, -5, bl, 2); }
    if (drip) { const v = -5 + Math.min(5, drip); px(E, T, 3, v, bl, 3); if (drip > 1) px(E, T, 3, v - 1, bl, 2); if (drip === 1) px(E, T, 2, -6, bl, 3); }
  }
  function kiteShield(R, o, lv, drip) {
    const sh = parts.shield(E, R, P, Object.assign({ style: 'kite', face: M.face, rim: M.gold }, o)), c = sh.center;
    chalice({ r0: o.free ? (o.rot || 0) : 0, tx: c[0], ty: c[1], rot: 0, ox: 0, oy: 0 }, lv, drip);
    if (P.glint && !o.free) px(E, parts.FREE, c[0] - 1, c[1] - 7, M.blood, 4);
  }
  // 放血锯剑：parts.sword 弯刀 + 刃背锯齿（和剑同一部件）
  function sawSword(R, o) {
    const s = parts.sword(E, R, P, o), g = s.guard, t = s.tip, T = o.free ? parts.FREE : R, vert = Math.abs(t[1] - g[1]) >= Math.abs(t[0] - g[0]);
    for (const q of [0.22, 0.36, 0.5]) { const x = RD(g[0] + (t[0] - g[0]) * q), y = RD(g[1] + (t[1] - g[1]) * q); if (vert) px(E, T, x + 1, y, M.blade, 2); else px(E, T, x, y + 1, M.blade, 2); }
    return s;
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, P.look ? BODY_LOOK : BODY); cur = R;
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: -3, flare: 7 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, hand: M.boneD, grip: R.lie ? 'fist' : 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.bone, matD: M.boneD, boot: M.plate, bootD: M.plateD, w: 2, bootH: 5 });
    boneWaist(R, M.bone);
    tasset(R);
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tab, hem: R.yWaist - 1 });
    parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.gold, eye: M.eye });
    part();                                                           // 盔下露出的骷髅下颌：3 格牙排（亮暗交替）
    for (let k = 0; k < 3; k++) px(E, R, R.hx1 - 2 + k, R.hy + 1, M.bone, (k & 1) ? 2 : 4);
    const HT = { r0: 0, tx: R.hx, ty: R.htop - 1, rot: R.rot, ox: R.ox, oy: R.oy };
    if (R.lie) { const h = parts.toSprite(HT, 0, 0); if (P.mane) maneFallen(h[0] - 1, h[1], P.mane); else maneFallen(h[0] - 1, h[1], 0); }
    else maneCrest(HT, P.mup, RD(P.beard || 0));
    if (P.drop) kiteShield(R, { free: 1, at: [P.shX, -4 - P.shH + P.lift], rot: P.shR }, 4, 0);
    else if (!R.lie) kiteShield(R, { at: [P.bhx + 1, P.bhy + 1] }, P.gem, P.drip);
    if (R.lie) sawSword(R, Object.assign({}, SWORD, { free: 1, at: [-21, -1 + P.lift], a: -HALF }));
    else sawSword(R, SWORD);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, pauldron: M.plate, trim: M.gold, hand: M.bone, grip: 'fist' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY_X = [HX - 24, HX - 38];
  let chargeAcc = 0, beadAcc = 0, soulAcc = 0, linkT = 9, lastStep = 0, emberAcc = 0;
  const lk = [0, 0];                                                  // 血丝回流的终点（盾心）
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function onEnter(s) {
    if (s !== CAST) return;
    const bx = wx(K_CAST.bhx + 1), by = HY - 1;                       // 盾尖顿地：血色法阵向外扩到中范围，罩住身后友军
    fx.circle(wx(-12), HY, 32, 5, R_EL, 1.2, 1, 0);
    fx.crack(bx + 1, HY + 1, 6, 1, R_EL, 0.7); fx.crack(bx - 1, HY + 1, 5, -1, R_EL, 0.7);
    ring(bx, by - 2, 1, R_EL);
    releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(bx, by - 4, 22, 40, 110, 0.25, 0.6, R_EL, 18); dust(bx, 6, 40);
    allyFx({ dur: 1.15, tint: R_EL, outline: R_EL });
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'blood', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STAB) < 1e-9) {                 // 平刺：剑身后一道血色直线拖影，刺进假人
      const y = wy(P.hy), tip = Math.min(wx(P.hx + P.bx + 13), DUMMY_X + 4);
      fx.beam(wx(P.hx + P.bx - 8), y, tip, y, 1, R_EL, 0.17, 2); fx.beam(wx(P.hx + P.bx - 5), y + 2, wx(P.hx + P.bx + 4), y + 2, 1, R_EL, 0.12, 1);
      hitDummy(0); burst(DUMMY_X - 4, y, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 4, y, 4, R_IMP, 0.2);
      sfx('swing', { kind: 'thrust', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.5 });
    }
    if (s === ATTACK && Math.abs(t - T_PULL) < 1e-9) {                 // 拔剑：带出一串血珠，抛物线落地
      const y = wy(P.hy);
      for (let i = 0; i < 7; i++) spawnX(K_PHYS, DUMMY_X - 6 - i, y + (Math.random() - 0.5) * 2, -20 - i * 9 - Math.random() * 10, -25 - Math.random() * 25, 0.55 + Math.random() * 0.2, R_EL, { g: 220, floor: HY });
    }
    if (s === CAST && Math.abs(t - T_LINK) < 1e-9) {                   // 血丝：每个友军连到盾心，血珠沿线流回，友军胸前闪红十字
      lk[0] = wx(P.gx); lk[1] = wy(P.gy); linkT = 0;
      for (const a of allyPoints()) { fx.link(a.x, a.mid - 2, lk[0], lk[1], R_EL, 1.0, 1); burst(a.x, a.mid - 2, 6, 20, 50, 0.2, 0.4, R_EL, 8); }
      shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.35 });
    }
    if (s === DEATH && Math.abs(t - T_SHLAND) < 1e-9) { dust(wx(18) , 6, 30); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-12) + (Math.random() - 0.5) * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.6 });
    }
    if (s === DEATH && Math.abs(t - T_MIST) < 1e-9) fx.cloud(wx(-10), HY - 6, 9, R_EL, 1.1, 2);
  }
  const EVENTS = [[], [], [T_STAB, T_PULL], [], [T_LINK], [], [], [T_SHLAND, T_LAND, T_MIST], []];
  function hurtFx(s) {                                                // 金属 + 骨：更多火花、几颗长寿命白火星、骨灰
    const hx = HX + 2, hy = HY - 17; burst(hx, hy, s === DEATH ? 26 : 18, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, FXI.steel, 30);
    for (let i = 0; i < 6; i++) spawnX(K_PHYS, hx + (Math.random() - 0.5) * 6, hy + 4, (Math.random() - 0.5) * 40, -20 - Math.random() * 20, 0.5 + Math.random() * 0.3, FXI.dust, { g: 120, floor: HY });
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                           // 血滴从脚下逆流向上，汇进圣杯
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 8, a = Math.PI * (0.22 + Math.random() * 0.56); spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), r / (0.45 + Math.random() * 0.35), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 1.2); }
    }
    if (linkT < 0.75 && (state === CAST || state === RECOVER)) {       // 血珠沿血丝流回盾上（0.4 s 到达）
      beadAcc += dt * 9;
      while (beadAcc >= 1) { beadAcc -= 1; for (const a of allyPoints()) { const L = 0.4, x0 = a.x, y0 = a.mid - 2; spawnX(K_PHYS, x0, y0, (lk[0] - x0) / L, (lk[1] - y0) / L, L, R_EL, {}); } }
    }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_RISE, wx(P.gx) + RD(Math.random() * 2 - 1), wy(P.gy) - 2, (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.6, R_EL); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); dust(wx(P.step > 0 ? 5 : -4), 2, 16); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.4 && stT < INCOMING + 2.4) {   // 血雾上升
      soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-24) + Math.random() * 30, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -12 - Math.random() * 16, 0.8 + Math.random() * 0.8, Math.random() < 0.7 ? R_EL : FXI.soul); }
    }
    linkT += dt;
  }
  function fxReset() { chargeAcc = 0; beadAcc = 0; soulAcc = 0; emberAcc = 0; linkT = 9; lastStep = 0; }
  function fxBack(f12) { if (P.dq < 1 && !P.drop) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.drop) {            // 圣杯星芒
      const gx = wx(P.gx), gy = wy(P.gy) - 1, L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
    if (linkT < 0.8) {                                                // 友军胸前的红色小十字
      const late = linkT > 0.5; if (late && (f12 & 1)) return;
      for (const a of allyPoints()) { const x = a.x + 3, y = a.mid - 3, c = linkT < 1 / 12 ? EL[0] : EL[1]; put(x, y, c); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[2]); }
    }
  }

  return {
    name: '血骑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.blood, M.eye], HIT_POINT: [2, -17], EVENTS, ALLIES: 'skill', ALLY_X, REVIVE: { ramp: R_EL },
    SFX: { body: 'armor', how: 'topple', pal: 'blood', style: 'buff', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
