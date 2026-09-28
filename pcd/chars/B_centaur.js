// 奔雷（小首领，精灵女王区域）：首领标准的试点。设定卡与特效卡见 pcd/run/boss-standard.md「试点一」。
// 依据：附录 G2「持斧的半人马」；被动 劈砍（普攻带到旁边两个）；冲锋（冲过整个战场，被先锋 / 守护者的盾挡下会晕 3 秒）；践踏（身边减速一半 3 秒）；半血 连冲。
// 剪影：雷云灰的战马身 + 晒黑的人上身；带电的蓝白长鬃和马尾；黄铜角盔；比人还长的双刃月牙战斧。像素和普通单位一样大（游戏里 4 倍），靠更多的像素和深色阶出细节。
// 招式（setMove）：trample 践踏（人立 → 前蹄砸地的雷环）· charge 冲锋（刨地蓄力 → 冲出，冲刺中的奔跑和雷迹由游戏画）· roar 连冲（半血的怒吼）。
PCD.define('B_centaur', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质：深色阶（体积打光）+ 平涂发光体 ─────
  const COAT = defDeep('stormcoat', { depth: 8, dark: 2 }), COATD = defDeep('stormcoat', { depth: 5, dark: 4 });
  const SKIN = defDeep('tan', { depth: 5 }), SKIND = defDeep('tan', { depth: 4, dark: 1 });
  const MANE = defDeep('stormmane', { depth: 3, amb: 0.25 }), HIDE = defDeep('hide', { depth: 3 }), STEEL = defDeep('bladesteel', { depth: 4 });
  const BRASS = defDeep('brass', { depth: 3 }), HORN = defDeep('ivory', { depth: 3 }), HOOF = defDeep('obsidian', { depth: 2, amb: 0.2 });
  const BOLT = FXR[FXI.bolt];
  const EYE = defMat([0, 22, 21, 21], 1, 1), RUNE = defMat([40, 23, 22, 21], 1, 1), PAINT = defMat([40, 41, 22, 22], 1, 1), SPARK = defMat([21, 21, 21, 21], 1, 1);
  const hero = new Sprite(160, 124, 74, 114);
  const DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { trample: { 3: 0.9, 4: 0.35, 5: 0.7 }, charge: { 3: 1.2, 4: 0.5, 5: 0.6 }, roar: { 3: 0.6, 4: 0.5, 5: 0.8 } };
  let MV = 'trample';
  const HX = 60;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [21, 22, 41], k: 1 }, { x: 0, y: 0, r: 0, ramp: [21, 22, 41], k: 1 }];
  const RIM_R = [0, 10, 16, 24], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: BOLT, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  RIM.skip[EYE] = RIM.skip[RUNE] = RIM.skip[PAINT] = RIM.skip[SPARK] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  const ROOT = { nf: [12, -21], ff: [8, -21], nh: [-24, -21], fh: [-20, -21] };
  const WAIST = [15, -35], SHN = [20, -50], SHF = [14, -50], NECK = [18, -53];
  // 奔跑 8 帧（12 fps，一圈 2/3 秒）：每条腿 [前后, 离地]，身体起伏
  const GAL = {
    nf: [[14, 6], [8, 0], [1, 0], [-6, 0], [-10, 4], [-6, 10], [4, 12], [11, 10]], ff: [[11, 10], [14, 6], [8, 0], [1, 0], [-6, 0], [-10, 4], [-6, 10], [4, 12]],
    nh: [[-12, 0], [-14, 4], [-8, 9], [0, 10], [7, 5], [9, 0], [4, 0], [-4, 0]], fh: [[-4, 0], [-12, 0], [-14, 4], [-8, 9], [0, 10], [7, 5], [9, 0], [4, 0]],
    by: [1, 2, 1, 0, -2, -3, -2, 0], pitch: [0.04, 0.06, 0.03, 0, -0.03, -0.05, -0.03, 0],
  };
  // 握斧：近手相对近肩的位置 + 斧的朝向（0 朝上、顺时针为正）
  const G = { idle: [9, 13, 0.45], wind: [-3, -11, -1.15], strike: [13, 7, 2.0], follow: [10, 12, 2.55], lance: [11, 5, 1.5], high: [2, -13, -0.15], roar: [5, -14, 0.1], hurt: [5, 12, 0.1], slam: [11, 7, 1.7] };
  const TWO = { wind: 1, strike: 1, follow: 1, lance: 1, high: 1, roar: 1, slam: 1 };

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'nfx', 'nfy', 'ffx', 'ffy', 'nhx', 'nhy', 'fhx', 'fhy', 'tl', 'hd', 'hx', 'hy', 'ha', 'tail', 'mane', 'glow', 'eyes', 'mouth', 'flash', 'dq', 'axe', 'rim', 'crk', 'two'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.nfx = 1; P.nfy = 0; P.ffx = -1; P.ffy = 0; P.nhx = 1; P.nhy = 0; P.fhx = -1; P.fhy = 0;
    P.tl = 0; P.hd = 0; P.tail = 0; P.mane = 0; P.glow = 0; P.eyes = 0; P.mouth = 0; P.flash = 0; P.dq = 0; P.axe = 0; P.rim = 0; P.crk = 0; P.mx = 0; P.flip = 0;
    grip(G.idle);
  }
  const grip = (g) => { P.hx = g[0]; P.hy = g[1]; P.ha = g[2]; P.two = g === G.idle || g === G.hurt ? 0 : 1; };
  const mixG = (a, b, q) => { P.hx = a[0] + (b[0] - a[0]) * q; P.hy = a[1] + (b[1] - a[1]) * q; P.ha = a[2] + (b[2] - a[2]) * q; P.two = (a === G.idle || a === G.hurt) && q < 0.5 ? 0 : (b === G.idle || b === G.hurt) && q >= 0.5 ? 0 : 1; };
  const legs = (t) => { P.nfx = t[0][0]; P.nfy = t[0][1]; P.ffx = t[1][0]; P.ffy = t[1][1]; P.nhx = t[2][0]; P.nhy = t[2][1]; P.fhx = t[3][0]; P.fhy = t[3][1]; };
  const gal = (f) => { f = ((f % 8) + 8) % 8; legs([GAL.nf[f], GAL.ff[f], GAL.nh[f], GAL.fh[f]]); P.by = GAL.by[f]; P.pitch = GAL.pitch[f]; P.tail = f < 4 ? 2 : 1; P.mane = 2; };
  const TAIL_IDLE = [0, 1, 2, 1, 0, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.tl = b ? -0.02 : 0; P.tail = TAIL_IDLE[Math.floor(tt / 0.4) % 6]; P.mane = -P.tail >> 1; P.hy += b;
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.0) { const k = Math.floor((lp - 1.4) * 12); P.nfy = [2, 4, 3, 0, 2, 0, 0][k] || 0; P.nfx = [2, 4, 4, 2, 3, 2, 1][k] || 1; P.hd = k < 4 ? -0.12 : 0.05; }   // 待机个性：前蹄刨地、喷鼻
      P.crk = (f12 % 7) === 0 ? 1 : 0;
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { gal(Math.floor(tq * 12)); const w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip; P.tl = 0.08; grip(G.idle); P.hy += P.by; P.crk = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); mixG(G.idle, G.wind, q); P.pitch = -0.07 * q; P.tl = -0.16 * q; P.hd = -0.1 * q; P.nfy = Math.round(3 * q); P.glow = 1; P.tail = 1; }
      else if (tq < 0.25) { grip(G.wind); P.pitch = -0.08; P.tl = -0.2; P.hd = -0.12; P.nfy = 4; P.nfx = 4; P.glow = 2; P.rim = 1; P.mane = -1; }
      else if (tq < 0.42) { const q = ease.out((tq - 0.25) / 0.17); mixG(G.strike, G.follow, q); P.pitch = 0.05; P.bx = 4; P.tl = 0.3; P.hd = 0.12; P.mouth = 1; P.glow = 3; P.rim = 2; P.nfx = 6; P.mane = 2; P.tail = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); mixG(G.follow, G.idle, q); P.bx = Math.round(4 * (1 - q)); P.tl = 0.3 * (1 - q); P.pitch = 0.05 * (1 - q); P.glow = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { grip(G.hurt); P.pitch = -0.1; P.bx = -2; P.tl = -0.22; P.hd = -0.2; P.eyes = 1; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; P.tail = -2; P.mane = 2; P.nfy = 3; }
      else if (h < 0.35) { mixG(G.hurt, G.idle, 0.5); P.pitch = -0.05; P.bx = -1; P.tl = -0.1; P.eyes = 1; P.tail = -1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); mixG(G.hurt, G.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.gx = P.fx || 0; P.gy = P.fy || 0; focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { trample: 0, charge: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    if (MV === 'trample') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.4)), k = (Math.floor(tq * 6) & 1);
        P.pitch = -0.55 * q; P.pv = 0; P.tl = 0.32 * q; mixG(G.idle, G.high, q); P.hd = -0.15 * q; P.mouth = tq > 0.6 ? 1 : 0;
        P.nfx = 4 + (k ? 4 : 0); P.nfy = Math.round(4 + 22 * q + (k ? -5 : 0)); P.ffx = 2 + (k ? 0 : 4); P.ffy = Math.round(4 + 20 * q + (k ? 0 : -4)); P.nhx = 4; P.fhx = 2;
        P.glow = tq < 0.3 ? 1 : 2 + (f12 & 1); P.rim = 2; P.tail = 2; P.mane = -2; P.crk = 1;
      } else if (st === CAST) {
        const q = clamp01(tq / 0.1); P.pitch = 0.06; P.pv = 1; P.by = 2; P.tl = 0.25; grip(G.slam); P.nfx = 6; P.ffx = 4; P.nhx = 2; P.hd = 0.1; P.mouth = 1;
        P.glow = 3; P.rim = q < 1 ? 3 : 2; P.tail = 2; P.mane = 2; P.crk = 1;
      } else { const q = ease.inOut(clamp01(tq / 0.55)); mixG(G.slam, G.idle, q); P.pitch = 0.06 * (1 - q); P.by = Math.round(2 * (1 - q)); P.tl = 0.25 * (1 - q); P.nfx = Math.round(6 - 5 * q); P.glow = q < 0.5 ? 1 : 0; P.pv = 1; }
    } else if (MV === 'charge') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.3)), paw = tq % 0.3, pk = Math.floor(paw * 12);
        P.pitch = 0.05 * q; P.pv = 1; P.by = Math.round(1 * q); P.tl = 0.35 * q; mixG(G.idle, G.lance, q); P.hd = 0.18 * q; P.eyes = 2;
        P.nfy = tq > 0.2 ? [4, 6, 2, 0][pk] || 0 : 0; P.nfx = tq > 0.2 ? [3, 5, 5, 2][pk] || 1 : 1; P.nhx = -2; P.fhx = -3;
        P.glow = tq < 0.4 ? 1 : 2 + (f12 & 1); P.rim = tq < 0.4 ? 1 : 2; P.tail = 2; P.mane = 2; P.crk = 1;
      } else if (st === CAST) { gal(Math.floor(tq * 12)); grip(G.lance); P.tl = 0.35; P.hd = 0.18; P.bx = 3; P.glow = 3; P.rim = 2; P.eyes = 2; P.crk = 1; P.hy += P.by; }
      else {
        const q = ease.out(clamp01(tq / 0.25)), r = ease.inOut(clamp01((tq - 0.3) / 0.3));
        P.pitch = -0.16 * q * (1 - r); P.pv = 0; P.nhx = Math.round(8 * q * (1 - r)) + 1; P.fhx = Math.round(6 * q * (1 - r)) - 1; P.nfx = Math.round(7 * q * (1 - r)) + 1; P.nfy = Math.round(3 * q * (1 - r));
        P.tl = -0.1 * q * (1 - r); mixG(G.lance, G.idle, r); P.tail = 2; P.mane = -2; P.glow = r < 0.5 ? 1 : 0;
      }
    } else {   // roar：半血的怒吼（连冲）
      if (st === CHARGE) { const q = ease.out(clamp01(tq / 0.4)); P.pitch = -0.35 * q; P.tl = 0.18 * q; mixG(G.idle, G.roar, q); P.hd = 0.15 * q; P.nfy = Math.round(14 * q); P.ffy = Math.round(10 * q); P.nfx = 5; P.glow = 2; P.rim = 1; P.crk = 1; }
      else if (st === CAST) { P.pitch = -0.4; P.tl = 0.05; grip(G.roar); P.hd = -0.35; P.mouth = 2; P.nfy = 16; P.ffy = 12; P.nfx = 6; P.ffx = 2; P.glow = 3; P.rim = 3; P.tail = 2; P.mane = -2; P.crk = 1; P.flash = tq < 1 / 12 ? 0 : 0; }
      else { const q = ease.inOut(clamp01(tq / 0.6)); P.pitch = -0.4 * (1 - q); mixG(G.roar, G.idle, q); P.hd = -0.35 * (1 - q); P.nfy = Math.round(16 * (1 - q)); P.ffy = Math.round(12 * (1 - q)); P.glow = q < 0.5 ? 2 : 0; P.mouth = q < 0.3 ? 1 : 0; }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) { return; }
    if (d < 0.3) { grip(G.hurt); P.pitch = -0.14; P.bx = -2; P.tl = -0.25; P.hd = -0.3; P.eyes = 1; P.mouth = 1; P.flash = d < 1 / 12 ? 1 : 0; P.tail = -2; P.mane = 2; P.nfy = 4; return; }
    const q1 = ease.in(clamp01((d - 0.3) / 0.4)), q2 = ease.in(clamp01((d - 0.7) / 0.35));
    P.pv = 1; P.pitch = 0.14 * q1 * (1 - q2); P.by = Math.round(4 * q1 + 8 * q2); P.tl = 0.35 * q1 + 0.55 * q2; P.hd = 0.2 + 0.25 * q2; P.eyes = 1; P.mouth = q2 > 0 ? 0 : 1;
    P.nfx = Math.round(-3 * q1 - 4 * q2); P.ffx = Math.round(-4 * q1 - 3 * q2); P.nhx = Math.round(3 * q2); P.fhx = Math.round(2 * q2); P.tail = q2 ? 0 : -1; P.mane = q2 ? 1 : -1;
    mixG(G.hurt, [12, 16, 2.4], q1); P.axe = d >= 0.55 ? 1 : 0;
    if (d > 1.1) { P.crk = (f12 % 5) === 0 ? 1 : 0; }
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：践踏时是前蹄，其余是斧刃的符文
  let axeHead = [0, 0], hoofN = [0, 0];
  function focus() { geo(); P.fx = MV === 'trample' && (P.st === CHARGE || P.st === CAST) ? hoofN[0] + P.bx : axeHead[0]; P.fy = MV === 'trample' && (P.st === CHARGE || P.st === CAST) ? hoofN[1] : axeHead[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(P.pv ? 12 : -22, 0, P.pitch); }
  function geo() {
    bodyXf();
    for (const k of ['nf', 'ff', 'nh', 'fh']) { const r = B.at(ROOT[k][0], ROOT[k][1]); const tgt = [r[0] + P[k + 'x'], -P[k + 'y']]; const fore = k[1] === 'f', l1 = fore ? 11 : 12, l2 = fore ? 12 : 11;
      const kn = B.ik(r, tgt, l1, l2, fore ? -1 : 1), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; L[k] = { r, kn, h: [kn[0] + (tgt[0] - kn[0]) / dd * l2, kn[1] + (tgt[1] - kn[1]) / dd * l2] }; }
    hoofN = L.nf.h;
    B.save(); B.rot(WAIST[0], WAIST[1], P.tl);
    L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); B.restore();
    const a = P.ha, d = [Math.sin(a), -Math.cos(a)];
    L.gn = [L.shN[0] + P.hx, L.shN[1] + P.hy]; L.gf = P.two ? [L.gn[0] - d[0] * 7, L.gn[1] - d[1] * 7] : [L.shF[0] + 1, L.shF[1] + 15]; L.dir = d; L.perp = [Math.cos(a), Math.sin(a)];
    axeHead = [L.gn[0] + d[0] * 21, L.gn[1] + d[1] * 21];
  }
  // 世界坐标的锥形胶囊（腿、臂、斧：它们的端点已经过了身体变换）
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  function drawLeg(k, far) {
    const g = L[k], m = far ? COATD : COAT, fore = k[1] === 'f';
    part(); capW(g.r[0], g.r[1] - 2, g.kn[0], g.kn[1], fore ? 3.2 : 3.6, 1.8, m);
    const fk = [g.kn[0] + (g.h[0] - g.kn[0]) * 0.8, g.kn[1] + (g.h[1] - g.kn[1]) * 0.8];
    capW(g.kn[0], g.kn[1], fk[0], fk[1], 1.5, 1.2, m); dot(g.kn[0], g.kn[1], 1.8, m, 6);
    part(); dot(fk[0] - 0.5, fk[1] + 0.5, 2.2, MANE, far ? 3 : 6); px(fk[0] - 2, fk[1] + 2, MANE, far ? 3 : 5); px(fk[0] + 1, fk[1] + 2, MANE, far ? 2 : 4);   // 蹄上的长毛（带电的蓝白）
    part(); const hx = Math.round(g.h[0]), hy = Math.round(g.h[1]); B.rectW(E, hx - 2, hy - 3, 5, 4, HOOF); lnW(hx - 1, hy - 3, hx + 2, hy - 3, HOOF, far ? 4 : 7); lnW(hx - 2, hy, hx + 3, hy, HOOF, far ? 5 : 9);
    if (P.glow >= 2 && !far) { px(hx + 3, hy, SPARK); px(hx - 2, hy, SPARK); }
  }
  function drawTail() {
    part(); bodyXf(); const s = P.tail, R = [-33, -31];
    const main = B.bez(R, [-44 - s, -34 - s * 2], [-51 - s * 2, -10 - s * 4], 10);
    B.strand(E, main, 4.2, 1.6, MANE); B.strand(E, B.bez([-33, -30], [-42 - s, -27 - s * 2], [-47 - s * 2, -6 - s * 4], 9), 3, 1.2, MANE);
    B.strand(E, B.bez([-35, -32], [-47 - s, -37 - s * 2], [-55 - s * 2, -16 - s * 4], 9), 2.2, 0.8, MANE);
    for (let i = 2; i < 10; i++) B.px(E, main[i][0] + 1, main[i][1], MANE, i & 1 ? 3 : 7);        // 毛束的纹理
    if (P.crk) { const q = B.bez(R, [-44 - s, -33 - s * 2], [-52 - s * 2, -12 - s * 4], 6); for (let i = 1; i < 6; i += 2) B.px(E, q[i][0] + (i & 2 ? 1 : -1), q[i][1], SPARK); }
  }
  function drawBody() {
    part(); bodyXf();
    B.ell(E, -24, -28, 11, 10.5, 0.1, COAT); B.ell(E, -6, -26, 19, 9, 0, COAT); B.ell(E, 12, -27, 9.5, 10.5, -0.2, COAT); B.ell(E, 10, -32, 7, 5, -0.5, COAT);
    B.ell(E, -2, -18.5, 12, 2.5, 0, COAT, 3);                                                     // 腹下阴影
    for (const [x, y, r] of [[-27, -32, 2], [-21, -26, 1.5], [-29, -24, 1.2], [-14, -31, 1.4], [-24, -20, 1]]) B.ell(E, x, y, r, r * 0.8, 0, COAT, 7);   // 臀上的雷云斑
    B.ln(E, 6, -32, 8, -21, COAT, 3); B.ln(E, -15, -34, -14, -22, COAT, 4); B.ln(E, -3, -29, -2, -24, COAT, 4);   // 肩、臀、肋的肌肉沟
    B.ln(E, -33, -34, -28, -37, COAT, 8); B.ln(E, -20, -36, -8, -35, COAT, 7);                      // 背脊高光
  }
  function drawBarding() {
    part(); bodyXf();
    B.poly(E, [[15, -31], [21, -29], [22, -23], [19, -17], [14, -18], [12, -25]], BRASS);          // 胸甲
    B.ln(E, 16, -28, 19, -25, BRASS, 9); B.ln(E, 19, -25, 16, -23, BRASS, 9); B.ln(E, 16, -23, 19, -20, BRASS, 9);   // 胸甲上的闪电纹
    for (const [x, y] of [[14, -29], [21, -28], [21, -21], [15, -19]]) B.px(E, x, y, BRASS, 9);
    part(); B.poly(E, [[0, -35], [4, -35], [5, -17], [1, -17]], HIDE); B.ln(E, 1, -33, 4, -33, HIDE, 8); B.ln(E, 1, -20, 4, -20, HIDE, 3);   // 肚带
    part(); B.poly(E, [[0, -28], [5, -28], [5, -24], [0, -24]], BRASS); B.px(E, 2, -26, BRASS, 9);
  }
  function torsoXf() { bodyXf(); B.rot(WAIST[0], WAIST[1], P.tl); }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, gp = far ? L.gf : L.gn, m = far ? SKIND : SKIN;
    const el = B.ik(sh, gp, 8.5, 8.5, far ? 1 : 1);
    part(); capW(sh[0], sh[1], el[0], el[1], far ? 2.8 : 3.2, 2.4, m); capW(el[0], el[1], gp[0], gp[1], 2.4, 1.9, m);
    if (!far) { const mx = (sh[0] + el[0]) / 2, my = (sh[1] + el[1]) / 2; px(mx, my - 1, m, 7); lnW(el[0], el[1], gp[0], gp[1], PAINT, 0); px(el[0], el[1], m, 3); }
    part(); B.rectW(E, Math.round(el[0] + (gp[0] - el[0]) * 0.55) - 1, Math.round(el[1] + (gp[1] - el[1]) * 0.55) - 1, 3, 3, HIDE);   // 护腕
    part(); dot(gp[0], gp[1], 1.9, m); px(gp[0] - 1, gp[1] - 1, m, 7);
  }
  function drawTorso() {
    part(); torsoXf();
    B.poly(E, [[9, -33], [21, -33], [23, -40], [24, -49], [20, -53], [13, -53], [11, -46]], SKIN);
    B.ell(E, 19, -47, 4, 3, 0.3, SKIN, 6); B.ln(E, 16, -44, 22, -44, SKIN, 3); B.ln(E, 21, -40, 22, -35, SKIN, 3); B.ln(E, 17, -41, 21, -41, SKIN, 4); B.ln(E, 17, -38, 21, -38, SKIN, 4);   // 胸、腹
    B.ln(E, 13, -51, 11, -44, SKIN, 3); B.px(E, 21, -36, SKIN, 2);
    B.ln(E, 14, -48, 17, -45, PAINT); B.ln(E, 17, -45, 15, -42, PAINT); B.ln(E, 15, -42, 18, -38, PAINT);   // 战纹：闪电
    part(); B.poly(E, [[8, -37], [22, -37], [23, -33], [21, -31], [19, -33], [17, -30], [15, -33], [12, -30], [10, -33], [8, -32]], HIDE);   // 毛皮腰带
    B.ln(E, 9, -36, 22, -36, HIDE, 8); for (const x of [10, 14, 18, 21]) B.px(E, x, -34, HIDE, 3);
    part(); B.poly(E, [[12, -52], [15, -52], [23, -38], [20, -38]], HIDE); B.ln(E, 13, -51, 21, -39, HIDE, 8); B.ell(E, 18, -44, 1.6, 1.6, 0, BRASS); B.px(E, 17, -45, BRASS, 9);   // 斜挎的皮带 + 铜扣
  }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function drawHair() {
    part(); headXf(); const s = P.mane;
    const main = B.bez([15, -61], [6 - s, -61 + s], [3 - s * 2, -45 + s], 9);
    B.strand(E, main, 3.6, 1.4, MANE); B.strand(E, B.bez([14, -58], [8 - s, -53], [7 - s * 2, -42], 8), 2.6, 1.1, MANE);
    B.strand(E, B.bez([16, -63], [8 - s, -66 + s], [0 - s * 2, -57 + s * 2], 8), 2, 0.8, MANE);
    for (let i = 2; i < 9; i++) B.px(E, main[i][0] + 1, main[i][1], MANE, i & 1 ? 3 : 7);
    if (P.crk) { B.px(E, 4 - s, -54, SPARK); B.px(E, 0 - s * 2, -60, SPARK); B.px(E, 8, -45, SPARK); }
  }
  function drawHorn(far) {
    part(); headXf(); const o = far ? -2.5 : 0;
    B.strand(E, [[16 + o, -63], [12 + o, -66], [11 + o, -70], [13 + o, -73]], far ? 1.8 : 2.2, 0.5, HORN, far ? 4 : 7);
    B.px(E, 12 + o, -68, HORN, 9); B.px(E, 14 + o, -65, HORN, 3);
  }
  function drawHead() {
    part(); headXf();
    B.ell(E, 20, -58, 5.4, 6, 0.1, SKIN); B.poly(E, [[15, -55], [25, -55], [24, -51], [17, -51]], SKIN); B.px(E, 26, -58, SKIN, 6); B.px(E, 26, -57, SKIN, 3);   // 头、下颌、鼻
    B.ln(E, 21, -60, 25, -60, SKIN, 2); B.px(E, 18, -57, SKIN, 3); B.px(E, 17, -56, SKIN, 3);          // 眉骨、颧骨
    const e = P.eyes === 1; if (e) B.ln(E, 21, -59, 24, -59, SKIN, 10); else { B.px(E, 22, -59, SKIN, 10); B.px(E, 23, -59, EYE); B.px(E, 24, -59, EYE); if (P.eyes === 2 || P.glow >= 2) { B.px(E, 22, -59, EYE); B.px(E, 25, -60, EYE); } }
    if (P.mouth) B.ln(E, 21, -54, 24, -54 + (P.mouth > 1 ? 1 : 0), SKIN, 10), P.mouth > 1 && B.px(E, 23, -53, SKIN, 10);
    part(); B.strand(E, [[22, -53], [21, -50], [20, -47]], 1.6, 0.7, HIDE, 4); B.strand(E, [[24, -53], [24, -51]], 1, 0.6, HIDE, 3);   // 编辫胡
    B.px(E, 20, -50, BRASS, 8);
    part(); B.poly(E, [[14, -60], [15, -65], [20, -67], [25, -65], [26, -61], [14, -60]], BRASS); B.ln(E, 14, -61, 26, -61, BRASS, 8); B.ln(E, 25, -61, 26, -57, BRASS, 6);   // 角盔 + 护鼻
    B.px(E, 18, -64, BRASS, 9); B.px(E, 22, -63, BRASS, 3);
  }
  function drawAxe() {
    const d = L.dir, pp = L.perp, g = L.gn, at = (u, v) => [g[0] + d[0] * u + pp[0] * v, g[1] + d[1] * u + pp[1] * v];
    if (P.axe) { axeOnGround(); return; }
    part(); const b0 = at(-10, 0), b1 = at(24, 0); capW(b0[0], b0[1], b1[0], b1[1], 1.1, 1.1, HIDE);
    for (const u of [-3, 1, 5]) { const a = at(u, -1), c = at(u, 1); lnW(a[0], a[1], c[0], c[1], HIDE, 3); }       // 皮绳缠握
    const pm = at(-10, 0); px(pm[0], pm[1], BRASS);
    part(); blade(at, 1, 1); part(); blade(at, -1, 0.8);
    part(); const s0 = at(18, -1.5), s1 = at(24, 1.5); polyW([at(17, -2), at(25, -2), at(25, 2), at(17, 2)], BRASS); px(s0[0], s0[1], BRASS, 9); px(s1[0], s1[1], BRASS, 9);
    const tip = at(27, 0); dot(tip[0], tip[1], 1, STEEL, 8);
  }
  function blade(at, side, k) {
    const q = (u, v) => at(21 + u * k, side * v * k);
    polyW([q(-3, 2), q(-7, 5), q(-11, 9), q(-12, 12), q(-8, 12.5), q(0, 13), q(8, 12.5), q(12, 12), q(11, 9), q(7, 5), q(3, 2)], STEEL);
    for (let u = -10; u <= 10; u += 1) { const v = 12.3 - Math.abs(u) * 0.05, p = q(u, v); px(p[0], p[1], STEEL, 9); }   // 刃口高光
    for (let u = -6; u <= 6; u += 3) { const p = q(u, 7); px(p[0], p[1], P.glow ? RUNE : STEEL, P.glow ? 0 : 3); }  // 符文
    const p = q(0, 9); px(p[0], p[1], P.glow >= 2 ? RUNE : STEEL, P.glow >= 2 ? 0 : 4);
  }
  function axeOnGround() {   // 掉在地上：斧柄平放，两片刃竖着（下面那片被地面截掉）
    const g = [14, -1], at = (u, v) => [g[0] + u, g[1] + v];
    part(); const b0 = at(-10, 0), b1 = at(24, 0); capW(b0[0], b0[1], b1[0], b1[1], 1.1, 1.1, HIDE);
    part(); blade(at, -1, 0.9); part(); polyW([at(17, -2), at(25, -2), at(25, 1), at(17, 1)], BRASS);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawTail(); drawLeg('fh', 1); drawLeg('ff', 1);
    drawBody(); drawBarding(); drawLeg('nh', 0); drawLeg('nf', 0);
    drawArm(1); drawTorso(); drawHair(); drawHorn(1); drawHead(); drawHorn(0);
    drawAxe(); if (!P.axe) drawArm(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    if (P.glow) { LIGHT[0].x = axeHead[0] * z + spr.ox; LIGHT[0].y = axeHead[1] * z + spr.oy; LIGHT[0].r = (6 + P.glow * 5) * z; LIGHT[1].x = hoofN[0] * z + spr.ox; LIGHT[1].y = hoofN[1] * z + spr.oy; LIGHT[1].r = MV === 'trample' && P.glow >= 2 ? 14 * z : 0; RIM.lights = LIGHT; } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（人立、斧举过头、鬃毛炸电），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 2 / 12, 0); P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(20, -57); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 15 * 2]; return PSPR; }
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function headShot() { const mv = MV; MV = 'trample'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.glow = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(21, -58); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 16 * 2]; return PSPR; }   // 头像：待机正脸、眼里亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (px) => scrX(px), sy = (py) => HY + py;
  let crackT = 9, lastGal = -1;
  function strikeFx() {
    const hx = sx(axeHead[0]), hy = sy(axeHead[1]);
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 26, -0.6, 2.4, 'bolt', 0.2, 3, 2);
    burst(hx, hy, 18, 50, 140, 0.2, 0.5, FXI.bolt, 30); burst(hx, sy(-2), 10, 30, 90, 0.3, 0.6, FXI.dust, 10);
    fx.cross(hx, hy, 7, 'bolt', 0.18); hitDummy(1, 1); shake(0.12, 2);
  }
  function trampleFx() {
    const x = sx(hoofN[0]), y = HY;
    ring(x, y - 2, 1, FXI.bolt); fx.wave(x, y, 1, 44, 8, 'bolt', 0.5, 2); fx.wave(x, y, -1, 44, 8, 'bolt', 0.5, 2);
    fx.crack(x, y, 18, 1, 'bolt', 1.1); fx.crack(x, y, 16, -1, 'bolt', 1.1);
    for (let i = 0; i < 4; i++) fx.bolt(x, y - 2, x + (i - 1.5) * 16, y - 26 - (i & 1) * 10, 'bolt', 0.25, 2, i + 3);
    burst(x, y - 2, 30, 60, 170, 0.3, 0.7, FXI.bolt, 40); burst(x, y - 1, 24, 30, 110, 0.4, 0.9, FXI.dust, 18);
    shake(0.3, 3); flash(0.08); crackT = 0; hitDummy(1, 1);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'trample') { trampleFx(); sfx('impact', { pal: 'bolt', w: 1 }); sfx('boss', { k: 'thunder', w: 1 }); sfx('fall', { w: 1 }); }
      else if (MV === 'charge') { const x = sx(-24), y = HY - 2; ring(x, y, 1, FXI.bolt); burst(x, y, 24, 60, 160, 0.3, 0.6, FXI.bolt, 20); fx.bolt(x, y, x - 30, y - 10, 'bolt', 0.2, 2, 5); shake(0.2, 2); sfx('boss', { k: 'bolt', w: 0.9 }); sfx('impact', { pal: 'bolt', w: 0.8 }); }
      else { const hx = sx(20), hy = sy(-64); ring(hx, hy, 1, FXI.bolt); for (let i = 0; i < 5; i++) fx.bolt(hx, hy, hx - 30 + i * 15, hy - 40, 'bolt', 0.35, 2, i + 9); flash(0.1); shake(0.35, 3); sfx('boss', { k: 'roar', w: 1 }); sfx('impact', { pal: 'bolt', w: 0.9 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { lastGal = -1; if (MV === 'roar') sfx('boss', { k: 'snort', w: 0.8 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'metal', w: 0.9 }); sfx('boss', { k: 'bolt', w: 0.5 }); }
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'snort', w: 0.5 });
    if (s === CHARGE && MV === 'charge' && (t === 0.5 || t === 0.8 || t === 1.1)) { const x = sx(hoofN[0]); burst(x, HY - 1, 10, 30, 90, 0.2, 0.5, FXI.bolt, 14); fx.crack(x, HY, 6, 1, 'bolt', 0.5); sfx('step', { w: 1 }); if (t === 0.5) sfx('boss', { k: 'snort', w: 1 }); }
    if (s === CHARGE && MV === 'trample' && t === 0.3) sfx('boss', { k: 'neigh', w: 1 });
    if (s === DEATH && t === INCOMING + 0.55) { sfx('hit', { mat: 'metal', w: 0.4 }); burst(sx(40), HY - 2, 8, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 1.0) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-40 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-36 + Math.random() * 64), HY - 6 - Math.random() * 30, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, FXI.bolt); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.3, 0.5, 0.8, 1.1], [], [], [], [INCOMING + 0.55, INCOMING + 1.0, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    crackT += dt;
    if (state === MOVE || (state === CAST && MV === 'charge')) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastGal) { lastGal = f; const hit = { 1: 'nf', 2: 'ff', 5: 'nh', 6: 'fh' }[f];
        if (hit) { const x = sx(L[hit].h[0]); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20 - (P.flip ? -12 : 12), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); if (Math.random() < 0.6) spawn(K_BURST, x, HY - 1, (Math.random() - 0.5) * 40, -30 - Math.random() * 30, 0.25, FXI.bolt); sfx('step', { w: 0.9 }); } }
    }
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：电光从四周汇向发光体
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, FXI.bolt, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
      if (Math.random() < 0.08) fx.bolt(gx + (Math.random() - 0.5) * 24, gy - 14 - Math.random() * 10, gx, gy, 'bolt', 0.1, 2, (Math.random() * 99) | 0);
    }
    if (state === IDLE && P.crk && Math.random() < 0.2) spawn(K_EMBER, sx(4 + Math.random() * 12), sy(-58 + Math.random() * 12), (Math.random() - 0.5) * 8, -10, 0.3, FXI.bolt);
    if (crackT < 1.1 && Math.random() < 0.4) { const x = sx(hoofN[0]) + (Math.random() - 0.5) * 36; spawn(K_EMBER, x, HY - 1, 0, -12 - Math.random() * 10, 0.3, FXI.bolt); }   // 地上的裂纹还在冒电
  }
  function fxReset() { crackT = 9; lastGal = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FXR[FXI.bolt][Math.abs(dx) < 5 ? 1 : 3]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'trample'; return MVDUR[MV]; }

  return {
    name: '奔雷', HX, R_EL: FXI.bolt, DUR, hero, P, GLOW_MATS: [EYE, RUNE, PAINT, SPARK], HIT_POINT: [4, -40], EVENTS, MAX_H: 80, OWN_MAX: 40, SHEET_K: 3,
    SFX: { body: 'beast', how: 'topple', pal: 'bolt', style: 'bolt', w: 1 },
    MOVES: ['trample', 'charge', 'roar'], MOVE_NAMES: { trample: '践踏', charge: '冲锋', roar: '连冲（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.6, 1.75, 1.85]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.33, 0.5, 0.75], 'trample'], [CAST, [0, 1 / 12, 3 / 12], 'trample'], [RECOVER, [0.17, 0.42], 'trample'],
      [CHARGE, [0, 0.25, 0.5, 0.58, 0.67], 'charge'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12], 'charge'], [RECOVER, [0.08, 0.25, 0.5], 'charge'],
      [CHARGE, [0, 0.25, 0.5], 'roar'], [CAST, [0, 2 / 12], 'roar'], [RECOVER, [0.25, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.9, 1.1, 1.4, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
