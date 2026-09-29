// 铁龙（小首领，总装车间）：附录 G2「喷火的铁皮地龙」；被动 炽热（身边一大圈每秒灼烧）；喷火（面前扇形连喷 3 秒）；甩尾（把身边的近战扫开）；半血 熔岩（灼烧更大更烫）。
// 剪影：又长又矮的四足铁皮地龙（身高约 64 格，尾巴拖到身后 45 格）。铆钉铁甲一片片叠着，甲缝里透出熔炉的橙光；方头重盔、压低的眉甲下一道橙色眼缝；
// 下颌就是一扇炉篦子，篦条之间一直烧着；头后两根向后弯的排气管当角，背上两根烟囱冒烟冒火星；尾巴一节节的铁环，节上立着尖刺、尾尖一片铁刃。
// 主色：冷铁灰（自带 11 级色阶，暗端近黑）+ 炉火橙（甲缝、炉篦、眼、烟囱口）；铜箍点缀在管子上。和地龙王（戴冠的石头龙王）区分：这只是机械、铁皮、炉火，没有冠。
// 招式（setMove）：flame 喷火（仰头鼓胸、烟囱喷火星、炉篦越烧越亮 → 头压低往前一探，大张嘴连喷 2.6 秒）· tail 甩尾（尾巴卷过背、尾刺烧红 → 尾巴从身前低扫一圈）
// · roar 熔岩（半血：前身人立、仰天张嘴喷出火柱、两根烟囱冲火、全身甲缝烧到发白，落地砸出裂纹）。
PCD.define('B_EarthDragonIron', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, R = Math.round;

  // ───── 材质 ─────
  const IRONR = ['#040507', '#0c0e12', '#15181e', '#1e2229', '#282d36', '#333943', '#404752', '#4f5764', '#626a78', '#7b8492', '#a2a9b4'];
  const SOOTR = ['#060404', '#110b09', '#1b120e', '#261915', '#32201a', '#402820', '#503126', '#623b2d', '#784735', '#905640', '#b0704f'];
  const COPR = ['#0c0504', '#1e0c07', '#321409', '#4a1e0d', '#642a12', '#803818', '#9c4a20', '#b8602c', '#d07a3c', '#e49a58', '#f4c080'];
  const IRON = defDeep(IRONR, { depth: 7, dark: 1 }), PLATE = defDeep(IRONR, { depth: 4 }), IROND = defDeep(IRONR, { depth: 5, dark: 3 });
  const SOOT = defDeep(SOOTR, { depth: 4, dark: 1 }), MAIL = defDeep(IRONR, { depth: 4, dark: 2 }), MAILD = defDeep(IRONR, { depth: 3, dark: 4 }), COP = defDeep(COPR, { depth: 3 });
  const CLAW = defDeep('bladesteel', { depth: 2 });
  const SEAM = defMat([44, 45, 46, 47], 1, 1), FURN = defMat([45, 46, 47, 21], 1, 1), EYE = defMat([46, 47, 21, 21], 1, 1), SPARK = defMat([47, 47, 21, 21], 1, 1);
  const FIRE = FXR[FXI.fire];
  const hero = new Sprite(176, 124, 88, 114);
  const DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { flame: { 3: 0.8, 4: 2.6, 5: 0.5 }, tail: { 3: 0.9, 4: 0.4, 5: 0.6 }, roar: { 3: 0.6, 4: 0.5, 5: 0.8 } };
  let MV = 'flame';
  const HX = 84;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [47, 46, 45], k: 0.55 }, { x: 0, y: 0, r: 0, ramp: [47, 46, 45], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: [47, 46, 45], k: 0.6 }];
  const RIM_R = [0, 10, 16, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FIRE, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  RIM.skip[SEAM] = RIM.skip[FURN] = RIM.skip[EYE] = RIM.skip[SPARK] = 1;

  // ───── 骨架（脚底 y = 0，面朝右）─────
  const ROOT = { nf: [17, -22], ff: [12, -22], nh: [-20, -22], fh: [-25, -22] };
  const NECK = [24, -36], JAWH = [34, -36], TAILR = [-29, -31];
  const SEG = [8, 8, 7, 7, 6, 6, 5, 5];
  // 重步 8 帧（12 fps，一圈 2/3 秒）：对角两条腿一起迈，落脚那一帧身子一沉
  const STEP = [[6, 0], [3, 0], [0, 0], [-3, 0], [-6, 0], [-5, 4], [0, 6], [5, 3]];
  const WBY = [1, 1, 0, -1, 1, 1, 0, -1], TW = [0, 1, 2, 1, 0, -1, -2, -1];

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'nfx', 'nfy', 'ffx', 'ffy', 'nhx', 'nhy', 'fhx', 'fhy', 'hd', 'nk', 'jaw', 'ta', 'tc', 'tf', 'tw', 'heat', 'glow', 'eyes', 'vent', 'flash', 'dq', 'rim', 'sw', 'pop'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.nfx = 2; P.nfy = 0; P.ffx = -2; P.ffy = 0; P.nhx = 2; P.nhy = 0; P.fhx = -2; P.fhy = 0;
    P.hd = 0; P.nk = 0; P.jaw = 0; P.ta = 0; P.tc = 0; P.tf = 1; P.tw = 0; P.heat = 3; P.glow = 1; P.eyes = 0; P.vent = 0; P.flash = 0; P.dq = 0; P.rim = 0; P.sw = 0; P.pop = 0; P.mx = 0; P.flip = 0;
  }
  const walk = (f) => { f = ((f % 8) + 8) % 8; const a = STEP[f], b = STEP[(f + 4) % 8]; P.nfx = a[0]; P.nfy = a[1]; P.fhx = a[0] - 1; P.fhy = a[1]; P.ffx = b[0] - 1; P.ffy = b[1]; P.nhx = b[0]; P.nhy = b[1]; P.by = WBY[f]; P.hd = WBY[f] < 0 ? -0.03 : 0.02; P.tw = TW[f]; };
  const TAIL_IDLE = [0, 1, 2, 1, 0, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.sw = b; P.hd = b ? -0.02 : 0; P.tw = TAIL_IDLE[Math.floor(tt / 0.4) % 6];
      P.heat = (f12 % 5) === 0 ? 2 : 3;                                                    // 炉火忽明忽暗
      const lp = tt % DUR[IDLE]; if (lp >= 1.2 && lp < 2.1) { const k = Math.floor((lp - 1.2) * 12);   // 待机个性：吸一口气，低头从炉篦和烟囱里喷一口烟火
        P.hd = [0.04, 0.07, 0.09, 0.1, -0.05, -0.1, -0.1, -0.08, -0.05, -0.02, 0][k] || 0; P.jaw = [0, 0, 0.08, 0.15, 0.35, 0.42, 0.38, 0.28, 0.15, 0.05, 0][k] || 0;
        P.sw = k < 4 ? 2 : 0; P.by = k < 4 ? -1 : 0; P.heat = k >= 3 && k < 9 ? 4 : 3; P.glow = k >= 3 && k < 9 ? 2 : 1; P.vent = k >= 4 && k < 9 ? 1 : 0; }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; P.heat = (f12 % 4) === 0 ? 2 : 3; }
    else if (st === ATTACK) {   // 普攻：扑咬，出手那一帧大张嘴、炉篦喷火
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.hd = -0.22 * q; P.nk = -3 * q; P.bx = -2 * q; P.jaw = 0.25 * q; P.nfx = 2 + 2 * q; P.glow = 1; }
      else if (tq < 0.25) { P.hd = -0.25; P.nk = -3; P.bx = -2; P.jaw = 0.35; P.nfx = 4; P.glow = 2; P.heat = 4; P.rim = 1; P.eyes = 2; P.tw = -1; }
      else if (tq < 0.42) { const shut = tq >= 0.33; P.pv = 1; P.pitch = 0.04; P.bx = 5; P.nk = 7; P.hd = shut ? 0.18 : 0.12; P.jaw = shut ? 0.05 : 1; P.glow = 3; P.heat = 4; P.rim = 2; P.nfx = 7; P.ffx = 2; P.nhx = 4; P.tw = 2; P.eyes = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.pv = 1; P.pitch = 0.04 * (1 - q); P.bx = 5 * (1 - q); P.nk = 7 * (1 - q); P.hd = 0.18 * (1 - q); P.nfx = 2 + 5 * (1 - q); P.nhx = 2 + 2 * (1 - q); P.glow = q < 0.5 ? 2 : 1; P.tw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.pitch = -0.06; P.bx = -2; P.hd = -0.25; P.nk = -2; P.jaw = 0.5; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.tw = -2; P.heat = 4; P.nfy = 2; }
      else if (h < 0.35) { P.pitch = -0.03; P.bx = -1; P.hd = -0.12; P.jaw = 0.2; P.eyes = 1; P.tw = -1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.hd = -0.12 * (1 - q); P.jaw = 0.2 * (1 - q); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { flame: 0, tail: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    const k = f12 & 1;
    if (MV === 'flame') {
      if (st === CHARGE) {   // 仰头鼓胸，烟囱冒火星，炉篦一级级烧亮，最后几帧浑身发抖
        const q = ease.out(clamp01(tq / 0.5));
        P.pitch = -0.07 * q; P.hd = -0.3 * q; P.nk = -2 * q; P.sw = q > 0.3 ? 2 : 1; P.jaw = 0.12 + 0.2 * q; P.heat = tq < 0.25 ? 3 : 4; P.glow = tq < 0.3 ? 2 : 3; P.vent = tq > 0.2 ? 1 : 0;
        P.rim = tq > 0.4 ? 2 : 1; P.nfy = R(3 * q); P.nfx = 4; P.ffx = 1; P.bx = tq > 0.45 ? -1 - k : -q; P.tw = 2; P.eyes = 2;
      } else if (st === CAST) {   // 头往前一探压低，大张嘴连喷；喷的反冲让身子一顿一顿
        P.pv = 1; P.pitch = 0.05; P.hd = 0.1 + k * 0.03; P.nk = 6; P.bx = 3 - k; P.jaw = f12 % 3 === 0 ? 0.9 : 1; P.heat = 4; P.glow = 3; P.rim = tq < 0.1 ? 3 : 2;
        P.nfx = 7; P.ffx = 3; P.nhx = 0; P.fhx = -4; P.eyes = 2; P.vent = 1; P.tw = k ? 2 : 1;
      } else { const q = ease.inOut(clamp01(tq / 0.45)), j = clamp01(tq / 0.2); P.pv = 1; P.pitch = 0.05 * (1 - q); P.hd = 0.1 * (1 - q); P.nk = 6 * (1 - q); P.bx = 3 * (1 - q); P.jaw = 1 - j; P.nfx = 2 + 5 * (1 - q); P.glow = q < 0.5 ? 2 : 1; P.heat = q < 0.5 ? 4 : 3; P.vent = q < 0.6 ? 1 : 0; }
    } else if (MV === 'tail') {
      if (st === CHARGE) {   // 蹲低，尾巴卷过背像蝎子，尾刺烧红
        const q = ease.out(clamp01(tq / 0.5));
        P.by = 2 * q; P.ta = 1.2 * q; P.tc = 0.25 * q; P.hd = 0.12 * q; P.nk = -2 * q; P.bx = -2 * q; P.pv = 1; P.pitch = 0.04 * q; P.nfx = 4; P.ffx = -1; P.nhx = 4; P.fhx = -5;
        P.heat = tq < 0.3 ? 3 : 4; P.rim = tq > 0.4 ? 2 : 1; P.jaw = 0.2; P.eyes = 2; P.tw = tq > 0.5 ? (k ? 1 : -1) : 0; P.glow = tq > 0.4 ? 2 : 1;
      } else if (st === CAST) {   // 尾巴从身后砸下来、贴着地从身前扫过一圈
        const f = Math.min(3, Math.floor(tq * 12));
        P.tf = [0.4, -0.55, -0.9, -0.9][f]; P.ta = [0.2, 0.35, 0.35, 0.3][f]; P.tc = -0.08; P.by = 1; P.bx = [-3, -4, -3, -2][f]; P.pv = 1; P.pitch = 0.06; P.hd = -0.08; P.jaw = 0.45;
        P.heat = 4; P.glow = 2; P.rim = f < 2 ? 3 : 2; P.nfx = 5; P.ffx = 0; P.nhx = -1; P.fhx = -6; P.eyes = 2;
      } else { const q = ease.inOut(clamp01(tq / 0.5)); P.tf = -0.9 + 1.9 * q; P.ta = 0.3 * (1 - q); P.tc = -0.08 * (1 - q); P.by = 1 - q; P.bx = -2 * (1 - q); P.pv = 1; P.pitch = 0.06 * (1 - q); P.jaw = 0.45 * (1 - q); P.heat = q < 0.5 ? 4 : 3; P.nfx = 2 + 3 * (1 - q); }
    } else {   // roar：熔岩（半血的怒吼）
      if (st === CHARGE) { const q = ease.out(clamp01(tq / 0.4)); P.by = 2 * q; P.hd = 0.15 * q; P.nk = -1; P.heat = 4; P.glow = 2; P.rim = 1; P.sw = 2; P.eyes = 2; P.bx = tq > 0.3 ? -k : 0; P.jaw = 0.15; }
      else if (st === CAST) { P.pitch = -0.2; P.nfy = 9; P.ffy = 7; P.nfx = 6; P.ffx = 3; P.hd = -0.45; P.nk = 2; P.jaw = 1; P.heat = 4; P.glow = 3; P.rim = 3; P.vent = 2; P.eyes = 2; P.tw = 2; P.ta = 0.3; P.sw = 2; }
      else {
        const q1 = ease.in(clamp01(tq / 0.17)), q = ease.inOut(clamp01((tq - 0.17) / 0.5));
        P.pitch = -0.2 * (1 - q1); P.nfy = R(9 * (1 - q1)); P.ffy = R(7 * (1 - q1)); P.nfx = 6 - 4 * q; P.ffx = 3 - 5 * q; P.by = q1 >= 1 && q < 0.3 ? 2 : 0;
        P.hd = -0.45 * (1 - q) + (q1 >= 1 && q < 0.2 ? 0.1 : 0); P.nk = 2 * (1 - q); P.jaw = 1 - q; P.heat = 4; P.glow = q < 0.6 ? 2 : 1; P.vent = q < 0.6 ? 1 : 0; P.ta = 0.3 * (1 - q); P.rim = q < 0.3 ? 2 : 0; P.eyes = 2;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { P.pitch = -0.07; P.bx = -2; P.hd = -0.32; P.nk = -2; P.jaw = 0.6; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.tw = -2; P.heat = 4; P.nfy = 3; return; }
    const q1 = ease.in(clamp01((d - 0.3) / 0.45)), q2 = ease.in(clamp01((d - 0.75) / 0.3));
    P.pitch = 0.1 * q1 * (1 - q2) - 0.07 * (1 - q1); P.by = 5 * q1 + 7 * q2; P.bx = 2 * q1 - 2 * (1 - q1);
    P.nfx = 2 + 4 * q1 + 2 * q2; P.ffx = -2 + 3 * q1; P.nhx = 2 - 4 * q2; P.fhx = -2 - 4 * q2;
    P.hd = -0.32 * (1 - q1) + 0.22 * q1 + 0.12 * q2; P.nk = 2 * q2; P.jaw = 0.6 - 0.3 * q1 + 0.35 * q2; P.eyes = 1; P.ta = -0.15 * q2; P.tw = 0;
    P.heat = d < 1.2 ? 3 : d < 1.6 ? (f12 & 1 ? 2 : 3) : d < 2.0 ? (f12 % 3 ? 1 : 2) : d < 2.2 ? 1 : 0; P.glow = d < 1.6 ? 1 : d < 2.0 ? (f12 & 1) : 0;
    P.pop = d >= 1.05 ? 1 : 0;
    if (d > 2.3) P.dq = Math.round(clamp01((d - 2.3) / 0.55) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：甩尾是尾尖，其余是嘴
  function focus() { geo(); const tl = MV === 'tail' && (P.st === CHARGE || P.st === CAST); const p = tl ? L.tail[L.tail.length - 1] : L.mouth; P.fx = p[0]; P.fy = p[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(P.pv ? 16 : -24, 0, P.pitch); }
  function headXf() { bodyXf(); B.move(P.nk, P.nk * 0.15); B.rot(NECK[0], NECK[1], P.hd); }
  function jawXf() { headXf(); B.rot(JAWH[0], JAWH[1], P.jaw * 0.55); }
  function tailPts() {
    const pts = [TAILR.slice()]; let x = TAILR[0], y = TAILR[1]; const a0 = Math.PI - 0.8 + P.ta + P.tw * 0.04, c = 0.12 + P.tc;
    for (let i = 0; i < SEG.length; i++) { const a = a0 + c * i; x += Math.cos(a) * SEG[i] * P.tf; y += Math.sin(a) * SEG[i]; pts.push([x, y]); }
    return pts;
  }
  function geo() {
    bodyXf();
    for (const k of ['nf', 'ff', 'nh', 'fh']) { const r = B.at(ROOT[k][0], ROOT[k][1]); const tgt = [ROOT[k][0] + P[k + 'x'], -P[k + 'y']]; const fore = k[1] === 'f', l1 = 13, l2 = 13;
      const kn = B.ik(r, tgt, l1, l2, fore ? -1 : 1), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; L[k] = { r, kn, h: [kn[0] + (tgt[0] - kn[0]) / dd * l2, kn[1] + (tgt[1] - kn[1]) / dd * l2] }; }
    L.tailB = tailPts(); L.tail = L.tailB.map((p) => B.at(p[0], p[1]));
    L.nk0 = B.at(17, -34); L.stA = B.at(-10, -59); L.stB = B.at(-20, -55); L.seam = B.at(-8, -30);
    headXf(); L.nk1 = B.at(31, -39); L.mouth = B.at(52, -35); L.eye = B.at(49, -43); L.pipe = B.at(26, -64);
    B.reset();
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 甲缝：烧着的时候是炉火色，熄了就是一道黑缝
  const ST = [0, 1, 2, 0, 4];
  const seam = (x0, y0, x1, y1) => { if (P.heat > 0) B.ln(E, x0, y0, x1, y1, SEAM, ST[P.heat]); else B.ln(E, x0, y0, x1, y1, IRON, 2); };
  const seamPx = (x, y) => { if (P.heat > 0) B.px(E, x, y, SEAM, ST[P.heat]); else B.px(E, x, y, IRON, 2); };
  const rivet = (x, y) => { B.px(E, x, y, PLATE, 9); B.px(E, x, y + 1, PLATE, 2); };

  function drawLeg(k, far) {
    const g = L[k], m = far ? IROND : IRON, fore = k[1] === 'f';
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], fore ? 5.4 : 6.2, 4.2, far ? MAILD : MAIL);             // 大腿：黑铁锁甲
    if (!far) for (let q = 0.25; q < 0.9; q += 0.22) { const x = g.r[0] + (g.kn[0] - g.r[0]) * q, y = g.r[1] + (g.kn[1] - g.r[1]) * q; px(x - 2, y, MAIL, 3); px(x + 1, y + 1, MAIL, 3); px(x - 1, y - 1, MAIL, 7); px(x + 2, y, MAIL, 7); }
    part(); capW(g.kn[0], g.kn[1], g.h[0], g.h[1] - 2.5, 4.2, 3.4, m);                                        // 小腿：铁护胫
    lnW(g.kn[0] + 1, g.kn[1] + 2, g.h[0] + 1, g.h[1] - 3, m, far ? 4 : 7);
    part(); dot(g.kn[0], g.kn[1], 3, far ? IROND : PLATE, far ? 4 : 5); px(g.kn[0] - 1, g.kn[1] - 1, far ? IROND : PLATE, far ? 6 : 9);   // 膝盖的圆甲 + 铆钉
    if (!far && P.heat > 0) { px(g.kn[0] + 2, g.kn[1] + 2, SEAM, ST[P.heat]); px(g.kn[0] - 2, g.kn[1] + 2, SEAM, ST[P.heat]); }
    part(); const hx = R(g.h[0]), hy = R(g.h[1]);                                                                 // 铁脚掌 + 三只爪
    polyW([[hx - 5, hy - 4], [hx + 3, hy - 5], [hx + 6, hy - 2], [hx + 6, hy], [hx - 6, hy]], m); lnW(hx - 4, hy - 4, hx + 3, hy - 5, m, far ? 5 : 8); lnW(hx - 5, hy - 1, hx + 5, hy - 1, m, 3);
    part(); for (let i = 0; i < 3; i++) { lnW(hx + 5, hy - 2 + i, hx + 8, hy - 1 + i, CLAW, far ? 3 : 6 + i); } px(hx - 7, hy, CLAW, far ? 3 : 5);
  }
  function drawTail(front) {
    const pts = L.tailB, big = front ? 1.25 : 1, n = pts.length - 1, sg = P.tf < 0 ? -1 : 1;
    part(); bodyXf();
    B.strand(E, pts, 7 * big, 2 * big, front ? PLATE : IRON);
    for (let i = 1; i < n; i++) {                                                                                  // 一节节的铁环：环缝透火 + 背上的尖刺
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy * sg, ny = ux * sg, r = (7 - 5 * i / n) * big;
      B.ln(E, b[0] + nx * r * 0.9, b[1] + ny * r * 0.9, b[0] - nx * r * 0.9, b[1] - ny * r * 0.9, IRON, 2);
      seam(b[0] + nx * (r - 1) * 0.8, b[1] + ny * (r - 1) * 0.8, b[0] - nx * (r - 1) * 0.5, b[1] - ny * (r - 1) * 0.5);
      const m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; rivet(m0[0] - nx, m0[1] - ny);
    }
    part();
    for (let i = 1; i < n; i++) { const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy * sg, ny = ux * sg, r = (7 - 5 * i / n) * big, s = 3.5 + 2 * (1 - i / n);
      const m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; B.poly(E, [[m0[0] + nx * (r - 1) - ux * 2.5, m0[1] + ny * (r - 1) - uy * 2.5], [m0[0] + nx * (r + s) - ux * 1.5, m0[1] + ny * (r + s) - uy * 1.5], [m0[0] + nx * (r - 1) + ux * 2, m0[1] + ny * (r - 1) + uy * 2]], CLAW);
      B.px(E, m0[0] + nx * (r + s - 1) - ux * 1.5, m0[1] + ny * (r + s - 1) - uy * 1.5, CLAW, P.heat >= 4 && P.st >= CHARGE && P.st <= RECOVER && MV === 'tail' ? 9 : 7); }
    part(); const a = pts[n - 1], b = pts[n], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux;   // 尾尖的铁刃
    B.poly(E, [[b[0] - ux * 2 + nx * 3.5, b[1] - uy * 2 + ny * 3.5], [b[0] + ux * 9, b[1] + uy * 9], [b[0] - ux * 2 - nx * 3.5, b[1] - uy * 2 - ny * 3.5], [b[0] - ux * 4, b[1] - uy * 4]], CLAW);
    B.ln(E, b[0], b[1], b[0] + ux * 8, b[1] + uy * 8, CLAW, 9);
    if (MV === 'tail' && P.heat >= 4 && P.st >= CHARGE && P.st <= RECOVER) { B.ln(E, b[0] - ux, b[1] - uy, b[0] + ux * 5, b[1] + uy * 5, SEAM, 4); B.px(E, b[0] + ux * 7, b[1] + uy * 7, SPARK); }
  }
  function drawStacks() {   // 背上的两根烟囱：向后斜，铜箍，口上是火
    for (const [x0, y0, x1, y1, r] of [[-17, -40, -20, -55, 2.4], [-6, -42, -10, -59, 2.8]]) {
      part(); bodyXf(); B.cap(E, x0, y0, x1, y1, r + 0.4, r, IRON); B.ln(E, x0 - r + 1, y0, x1 - r + 1, y1, IRON, 8);
      for (const q of [0.35, 0.7]) { const x = x0 + (x1 - x0) * q, y = y0 + (y1 - y0) * q; B.ln(E, x - r - 0.5, y, x + r + 0.5, y - 0.6, COP, 7); B.ln(E, x - r - 0.5, y + 1, x + r + 0.5, y + 0.4, COP, 3); }
      part(); B.ell(E, x1, y1 - 0.5, r + 1.2, 1.6, -0.2, COP); B.ln(E, x1 - r, y1 - 1, x1 + r, y1 - 1.6, COP, 8);
      B.ln(E, x1 - r + 1, y1 - 0.5, x1 + r - 1, y1 - 1, P.vent ? FURN : SEAM, P.vent > 1 ? 4 : P.vent ? 0 : 1);
    }
  }
  function drawBody() {
    part(); bodyXf();                                                                                               // 煤黑的腹甲（锁甲）
    B.ell(E, -4, -23, 25, 6.5, 0, SOOT); for (let x = -24; x <= 16; x += 4) B.ln(E, x, -21, x + 1, -18, SOOT, 3); B.ln(E, -22, -20, 16, -20, SOOT, 7);
    part(); B.ell(E, -4, -31, 29, 12 + P.sw * 0.5, 0, IRON); B.ell(E, -21, -31, 11.5, 12, 0, IRON); B.ell(E, 15, -31 - P.sw * 0.5, 12, 12 + P.sw * 0.5, 0, IRON); B.ell(E, 8, -38, 10, 6, 0, IRON);   // 桶身
    for (let x = -26; x <= 20; x += 6) B.px(E, x, -20, IRON, 3);
  }
  function drawSpines() {   // 背脊上一排铁鳍
    part(); bodyXf();
    const sp = [[-30, -38, 5], [-24, -42, 6], [-1, -44, 6], [6, -45, 7], [13, -44, 6], [19, -41, 5]];
    for (const [x, y, h] of sp) { B.poly(E, [[x - 3, y + 2], [x - 2, y - h], [x + 3, y + 2]], PLATE); B.ln(E, x - 2, y - h + 1, x - 2, y + 1, PLATE, 8); }
  }
  function drawPlates() {
    const pl = [
      [[-35, -31], [-33, -40], [-24, -45], [-13, -44], [-11, -34], [-13, -22], [-29, -22]],                    // 臀甲
      [[-15, -44], [-2, -46], [6, -45], [7, -33], [5, -23], [-13, -22], [-12, -34]],                             // 腰甲
      [[4, -44], [15, -46], [24, -41], [27, -33], [25, -24], [14, -21], [5, -24], [3, -33]],                      // 肩甲
    ];
    for (const p of pl) { part(); bodyXf(); B.poly(E, p, PLATE); for (let i = 0; i < 3; i++) B.ln(E, p[i][0] + 1, p[i][1] + 1, p[i + 1][0] + (i === 2 ? -1 : 0), p[i + 1][1] + 1, PLATE, 8); }
    part(); bodyXf();                                                                                                // 甲缝：透出炉火
    seam(-12, -43, -12, -35); seam(-12, -34, -14, -23); seam(4, -44, 4, -33); seam(4, -32, 6, -24);
    seam(-32, -30, -14, -30); seam(-10, -28, 3, -28); seam(8, -27, 24, -28);
    for (const [x, y] of [[-30, -35], [-24, -41], [-17, -40], [-30, -26], [-18, -25], [-8, -42], [0, -42], [-8, -25], [1, -25], [9, -41], [17, -42], [22, -37], [10, -24], [21, -25]]) rivet(x, y);
    for (let i = 0; i < 3; i++) { B.ln(E, 12 + i * 3, -38, 14 + i * 3, -33, PLATE, 2); seam(13 + i * 3, -38, 15 + i * 3, -33); }   // 肩上的散热格栅
    B.ln(E, -30, -40, -16, -44, PLATE, 9); B.ln(E, -8, -45, 4, -45, PLATE, 9); B.ln(E, 8, -45, 18, -45, PLATE, 9);
  }
  function drawNeck() {
    part(); const a = L.nk0, b = L.nk1; capW(a[0], a[1], b[0], b[1], 8.5, 7.2, IRON);
    part(); for (const q of [0.3, 0.62]) { const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; capW(x - 1, y - 8, x + 1.5, y + 6, 2.2, 1.8, PLATE); }   // 颈上的铁环
    for (const q of [0.3, 0.62]) { const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; px(x - 1, y - 6, PLATE, 9); px(x + 1, y + 3, PLATE, 9); if (P.heat > 0) lnW(x + 2.5, y - 5, x + 3.5, y + 4, SEAM, ST[P.heat]); }
  }
  function drawHeadPipes(far) {   // 头后两根向后弯的排气管（当角）
    part(); headXf(); const o = far ? -4 : 0, m = far ? IROND : IRON;
    const ty = far ? 2 : 0; B.strand(E, [[37 + o, -48], [32 + o, -53], [26 + o, -57 + ty], [20 + o, -59 + ty]], far ? 2.2 : 2.7, far ? 1.8 : 2.1, m);
    B.ln(E, 35 + o, -51, 27 + o, -58 + ty, m, far ? 5 : 8);
    B.ln(E, 28 + o, -58 + ty, 30 + o, -54 + ty, COP, far ? 4 : 7);
    part(); B.ell(E, 19 + o, -59 + ty, 1.5, 2.6, 0.5, COP, far ? 3 : 5); B.px(E, 19 + o, -59 + ty, P.heat > 0 ? SEAM : IRON, P.heat > 0 ? (P.vent || P.glow >= 2 ? 4 : 1) : 2);
  }
  function drawHead() {
    if (P.jaw > 0.05) { part(); headXf(); B.ell(E, 46, -35, 12, 2 + P.jaw * 5, 0, FURN, 2); B.ell(E, 45, -35, 9, 1.5 + P.jaw * 3.5, 0, FURN, 0); B.ell(E, 42, -35, 4, 0.8 + P.jaw * 2, 0, FURN, P.glow >= 3 ? 4 : 0); }   // 张嘴：里面是白热的炉膛
    part(); headXf();                                                                                                   // 头盔 + 上颌
    B.poly(E, [[29, -44], [32, -50], [41, -53], [50, -51], [57, -48], [62, -44], [62, -39], [58, -36], [36, -36], [29, -39]], IRON);
    B.ln(E, 33, -49, 48, -51, IRON, 8); B.ln(E, 49, -51, 58, -47, IRON, 7); B.ln(E, 60, -43, 60, -39, IRON, 3);
    for (let x = 39; x <= 57; x += 3) { B.px(E, x, -35, CLAW, 7); B.px(E, x + 1, -35, CLAW, 4); }                     // 上排铁牙
    B.px(E, 58, -44, IRON, 10); B.px(E, 59, -44, IRON, 10); B.px(E, 58, -43, IRON, 2);                               // 鼻孔排气口
    seam(40, -39, 56, -39); rivet(38, -41); rivet(55, -41);
    part(); B.poly(E, [[29, -44], [36, -47], [38, -38], [30, -37]], PLATE); rivet(32, -43); rivet(35, -40); B.ln(E, 30, -44, 35, -46, PLATE, 9);   // 腮甲
    part(); B.poly(E, [[37, -49], [49, -52], [56, -49], [55, -45], [48, -44], [39, -45]], PLATE);                     // 压低的眉甲
    B.ln(E, 38, -49, 49, -51, PLATE, 9); B.ln(E, 40, -45, 54, -45, PLATE, 2); rivet(43, -49); rivet(51, -49);
    if (P.eyes === 1) B.ln(E, 45, -43, 51, -42, IRON, 10);
    else { B.ln(E, 44, -44, 51, -43, IRON, 10); B.ln(E, 45, -43, 51, -42, EYE, P.eyes === 2 || P.glow >= 2 ? 0 : 2); B.ln(E, 46, -42, 50, -41, EYE, 1); B.px(E, 50, -42, EYE, P.heat > 0 ? 0 : 2); }   // 眉甲下的一道橙色眼缝
    part(); jawXf();                                                                                                    // 下颌：一扇炉篦子
    B.poly(E, [[32, -37], [58, -36], [61, -33], [57, -29], [42, -27], [33, -31]], IRON);
    const gt = [1, 1, 2, 0, 0][P.heat];
    for (let y = -35; y <= -30; y++) for (let x = 39; x <= 55; x++) { const bar = ((x - 39) % 3) === 0; if (bar) B.px(E, x, y, IRON, x === 39 || x === 54 ? 5 : 7); else if (P.heat > 0) B.px(E, x, y, FURN, y === -30 ? 1 : y === -31 ? 2 : P.glow >= 3 && y === -34 ? 4 : gt); else B.px(E, x, y, SOOT, 2); }
    B.ln(E, 38, -36, 56, -36, IRON, 8); B.ln(E, 38, -29, 56, -29, IRON, 3); rivet(35, -33); rivet(58, -33);
    for (let x = 41; x <= 56; x += 4) B.px(E, x, -37, CLAW, 8);                                                        // 下排铁牙
    B.poly(E, [[50, -29], [55, -29], [52, -25]], PLATE); B.px(E, 52, -27, PLATE, 8);                                    // 下巴的铁刺
  }
  function drawPop() {   // 死亡：一根排气管被砸掉，躺在头前面
    part(); B.reset(); capW(56, -2, 66, -3, 2.2, 1.8, IRON); lnW(57, -4, 65, -5, IRON, 8); B.ell(E, 67, -3, 1.4, 2.4, 0, COP, 5);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    const tBack = P.tf >= 0.3;
    if (tBack) drawTail(0);
    drawLeg('fh', 1); drawLeg('ff', 1); drawHeadPipes(1);
    drawStacks(); drawBody(); drawSpines(); drawPlates();
    drawLeg('nh', 0); drawLeg('nf', 0); drawNeck();
    if (!P.pop) drawHeadPipes(0);
    drawHead();
    if (P.pop) drawPop();
    if (!tBack) drawTail(1);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    if (P.glow || P.vent) {
      LIGHT[0].x = L.mouth[0] * z + spr.ox; LIGHT[0].y = L.mouth[1] * z + spr.oy; LIGHT[0].r = (P.glow ? 6 + P.glow * 6 : 0) * z;
      LIGHT[1].x = L.stA[0] * z + spr.ox; LIGHT[1].y = L.stA[1] * z + spr.oy; LIGHT[1].r = P.vent ? (6 + P.vent * 5) * z : 0;
      LIGHT[2].x = L.stB[0] * z + spr.ox; LIGHT[2].y = L.stB[1] * z + spr.oy; LIGHT[2].r = P.vent ? (5 + P.vent * 4) * z : 0;
      RIM.lights = LIGHT;
    } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（前身人立、仰头喷火、全身甲缝烧亮），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;
  const headAt = (spr) => { headXf(); const c = B.at(46, -43); B.reset(); PHEAD = [c[0] * 2 + spr.ox, c[1] * 2 + spr.oy, 17 * 2]; };
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 2 / 12, 0); P.hd = -0.3; P.rim = 2; P.vent = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(PSPR); return PSPR; }
  function headShot() { const mv = MV; MV = 'flame'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.glow = 2; P.heat = 4; P.jaw = 0.2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(PSPR); return PSPR; }   // 头像：待机侧脸，眼缝和炉篦亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (x) => scrX(x), sy = (y) => HY + y, dirX = () => (P.flip ? -1 : 1);
  let crackT = 9, lastStep = -1, flameT = 0, smokeT = 0;
  function strikeFx() {
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]), d = dirX();
    fx.slash(mx - d * 6, my, 12, 0.6, 2.6, 'fire', 0.2, 3, 2); fx.cross(mx + d * 4, my, 7, 'fire', 0.18);
    for (let i = 0; i < 14; i++) { const a = (Math.random() - 0.5) * 0.9, v = 60 + Math.random() * 90; spawn(K_BURST, mx, my, d * Math.cos(a) * v, Math.sin(a) * v, 0.2 + Math.random() * 0.25, FXI.fire); }
    hitDummy(1, 1); shake(0.15, 2);
  }
  function tailFx() {
    const cx = sx(-6), d = dirX();
    ring(cx, HY - 2, 1, FXI.fire); fx.slash(cx, sy(-18), 22, 1.9, 4.4, 'fire', 0.25, 3, 2); fx.slash(cx, sy(-14), 30, 2.1, 4.2, 'steel', 0.2, 2, 2);
    fx.wave(cx, HY, 1, 50, 7, 'fire', 0.45, 2); fx.wave(cx, HY, -1, 50, 7, 'fire', 0.45, 2); fx.crack(cx + d * 14, HY, 16, 1, 'fire', 1.0); fx.crack(cx - d * 14, HY, 14, -1, 'fire', 1.0);
    burst(cx, HY - 2, 26, 50, 150, 0.3, 0.6, FXI.dust, 20); burst(cx, HY - 4, 18, 60, 160, 0.2, 0.5, FXI.fire, 30);
    shake(0.35, 3); flash(0.08); crackT = 0; hitDummy(1, 1);
  }
  function flameFx() {
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]), d = dirX();
    ring(mx + d * 4, my, 0, FXI.fire); fx.cross(mx + d * 4, my, 9, 'fire', 0.2); fx.beam(mx, my, mx + d * 46, my + 8, 4, 'fire', 0.3, 2);
    burst(mx, my, 20, 60, 160, 0.2, 0.45, FXI.fire, 10); shake(0.35, 3); flash(0.08); hitDummy(1, 1); flameT = 0;
  }
  function roarFx() {
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]);
    ring(mx, my, 1, FXI.fire); ring(sx(-4), HY - 2, 1, FXI.fire);
    fx.beam(mx, my, mx + dirX() * 6, my - 40, 4, 'fire', 0.55, 2); fx.cross(mx, my, 11, 'fire', 0.25);
    for (const s of [L.stA, L.stB]) fx.beam(sx(s[0]), sy(s[1]), sx(s[0]) - dirX() * 5, sy(s[1]) - 28, 3, 'fire', 0.5, 0);
    burst(mx, my, 30, 60, 170, 0.3, 0.7, FXI.fire, 40); burst(sx(-8), sy(-40), 24, 40, 120, 0.3, 0.7, FXI.fire, 30);
    flash(0.12); shake(0.4, 3);
  }
  function landFx() {
    const x = sx(L.nf.h[0]);
    fx.crack(x, HY, 18, 1, 'fire', 1.1); fx.crack(x - dirX() * 6, HY, 14, -1, 'fire', 1.1); fx.wave(x, HY, 1, 36, 6, 'fire', 0.4, 2); fx.wave(x, HY, -1, 36, 6, 'fire', 0.4, 2);
    burst(x, HY - 1, 22, 30, 110, 0.4, 0.8, FXI.dust, 18); shake(0.3, 3); crackT = 0;
  }
  function onEnter(s) {
    if (s === CHARGE) { lastStep = -1; if (MV === 'tail') { sfx('boss', { k: 'drCreak', w: 0.9 }); sfx('boss', { k: 'growl', w: 0.6 }); } else sfx('boss', { k: 'drStoke', w: 0.9 }); }
    if (s === CAST) {
      if (MV === 'flame') { flameFx(); sfx('boss', { k: 'drFlame', w: 1 }); sfx('impact', { pal: 'fire', w: 0.8 }); }
      else if (MV === 'tail') { tailFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'slam', w: 1 }); sfx('impact', { pal: 'fire', w: 0.9 }); }
      else { roarFx(); sfx('boss', { k: 'drRoar', w: 1 }); sfx('impact', { pal: 'fire', w: 0.9 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'drStoke', w: 0.35 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('boss', { k: 'drChomp', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 }); }
    if (s === CHARGE && MV === 'tail' && t === 0.5) sfx('boss', { k: 'drClank', w: 0.8 });
    if (s === RECOVER && MV === 'roar' && t === 0.17) { landFx(); sfx('boss', { k: 'thud', w: 1 }); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'drDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.05) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-30 + Math.random() * 90), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); burst(sx(60), HY - 3, 12, 40, 110, 0.2, 0.5, FXI.fire, 30); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('hit', { mat: 'metal', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 1.8) sfx('boss', { k: 'drHiss', w: 1 });
    if (s === DEATH && t === INCOMING + 2.3) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-36 + Math.random() * 90), HY - 4 - Math.random() * 24, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, FXI.steel); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.5], [], [0.17], [], [INCOMING + 0.3, INCOMING + 1.05, INCOMING + 1.8, INCOMING + 2.3], []];
  function stepFX(dt, state, stT) {
    crackT += dt; flameT += dt; smokeT += dt; const d = dirX();
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastStep) { lastStep = f; const hit = { 0: ['nf', 'fh'], 4: ['ff', 'nh'] }[f];
        if (hit) { for (const k of hit) { const x = sx(L[k].h[0]); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); } sfx('step', { w: 1 }); if (f === 0) sfx('boss', { k: 'drClank', w: 0.3 }); } }
    }
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：火星从四周汇向嘴 / 尾尖
      const a = Math.random() * 6.2832, r = 14 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CAST && MV === 'flame' && stT < 2.5) {   // 连喷：一股扇形的火从嘴里往前冲，贴地滚出火浪
      const mx = sx(L.mouth[0] + 3), my = sy(L.mouth[1] + 1);
      for (let i = 0; i < 3; i++) { const a = 0.12 + (Math.random() - 0.5) * 0.55, v = 90 + Math.random() * 120; spawn(K_BURST, mx, my, d * Math.cos(a) * v, Math.sin(a) * v, 0.25 + Math.random() * 0.25, FXI.fire); }
      if (Math.random() < 0.3) spawn(K_EMBER, mx + d * (10 + Math.random() * 30), my - 4, d * 20, -18 - Math.random() * 14, 0.5, FXI.fire);
      if (flameT > 0.3) { flameT = 0; fx.wave(mx + d * 18, HY, d, 34, 6, 'fire', 0.4, 1); fx.beam(mx, my, mx + d * (40 + Math.random() * 8), my + 6 + Math.random() * 4, 3, 'fire', 0.2, 2); }
    }
    if ((P.vent || (state === RECOVER && MV === 'flame')) && smokeT > 0.08) {   // 烟囱冒烟、火星
      smokeT = 0;
      for (const s of [L.stA, L.stB]) { if (Math.random() < 0.6) spawn(K_RISE, sx(s[0]) + (Math.random() - 0.5) * 3, sy(s[1]) - 1, -d * 6, -16 - Math.random() * 12, 0.6 + Math.random() * 0.5, FXI.steel); if (Math.random() < 0.35) spawn(K_EMBER, sx(s[0]), sy(s[1]) - 2, (Math.random() - 0.5) * 16, -24 - Math.random() * 16, 0.4, FXI.fire); }
      if (state === RECOVER && MV === 'flame') spawn(K_RISE, sx(L.mouth[0]), sy(L.mouth[1]) - 2, d * 4, -12, 0.7, FXI.steel);
    }
    if ((state === IDLE || state === MOVE) && P.heat > 0 && Math.random() < 0.08) spawn(K_EMBER, sx(-20 + Math.random() * 40), sy(-26 - Math.random() * 16), (Math.random() - 0.5) * 6, -10 - Math.random() * 6, 0.35, FXI.fire);   // 甲缝里飘出的火星
    if (state === HURT && P.flash && Math.random() < 0.8) burst(sx(L.seam[0]), sy(L.seam[1]), 6, 40, 100, 0.15, 0.3, FXI.fire, 20);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.6 && Math.random() < 0.3) spawn(K_RISE, sx(-24 + Math.random() * 60), sy(-14 - Math.random() * 10), 0, -12 - Math.random() * 8, 0.8, FXI.steel);
    if (crackT < 1.1 && Math.random() < 0.4) { const x = sx(L.nf.h[0]) + (Math.random() - 0.5) * 40; spawn(K_EMBER, x, HY - 1, 0, -12 - Math.random() * 10, 0.3, FXI.fire); }   // 地裂还在冒火
  }
  function fxReset() { crackT = 9; lastStep = -1; flameT = 0; smokeT = 0; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx), w = P.glow >= 3 ? 14 : 8; for (let dx = -w; dx <= w; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FIRE[Math.abs(dx) < w / 2 ? 2 : 3]); }   // 地面映着炉火
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'flame'; return MVDUR[MV]; }

  const VOICES = {
    drStoke: (s, t, w, p) => { s.rumble(t, 0.9, 0.16 * w, { f: 140, pan: p }); s.riser(t, t + 0.8, 200, 1400, 0.06 * w, { pan: p }); s.nz(t, 0.8, 'bandpass', 500, 0.7, 0.06 * w, { to: 1600, pan: p });
      for (let i = 0; i < 4; i++) s.thud(t + i * 0.18, 72, 48, 0.15, 0.12 * w, { pan: p }); },                                    // 风箱一下下往炉里鼓气
    drFlame: (s, t, w, p) => { s.nz(t, 2.6, 'lowpass', 900, 0.7, 0.2 * w, { src: 'brown', a: 0.08, hold: 2.0, pan: p }); s.nz(t, 2.5, 'bandpass', 1800, 0.6, 0.07 * w, { a: 0.1, hold: 1.8, pan: p });
      s.crackle(t, 2.5, 2200, 0.05 * w, { pan: p }); s.whoosh(t, 0.5, 400, 2400, 0.12 * w, { pan: p }); s.thud(t, 90, 40, 0.4, 0.25 * w, { pan: p }); },   // 连喷的火
    drChomp: (s, t, w, p) => { s.nz(t, 0.06, 'bandpass', 2600, 2, 0.2 * w, { pan: p }); s.ring(t, 420, 0.35, 0.06 * w, { pan: p }); s.thud(t, 120, 50, 0.2, 0.22 * w, { pan: p }); s.nz(t, 0.3, 'lowpass', 800, 0.7, 0.08 * w, { src: 'brown', pan: p }); },   // 铁颌咬合
    drClank: (s, t, w, p) => { s.ring(t, 180, 0.5, 0.05 * w, { pan: p }); s.thud(t, 70, 40, 0.25, 0.18 * w, { pan: p }); },                      // 铁甲碰撞
    drCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 0.7, 0.04 * w, { to: 110, vib: [18, 60, 0.1], lp: 600, pan: p }); s.nz(t, 0.6, 'bandpass', 900, 3, 0.04 * w, { to: 500, pan: p }); },   // 尾巴的铁环拧紧
    drRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 64, 1.3, 0.09 * w, { to: 42, vib: [7, 80, 0.15], lp: 800, pan: p, rev: 0.5 }); s.tone(t, 'square', 96, 1.1, 0.03 * w, { to: 60, lp: 500, pan: p });
      s.nz(t, 1.3, 'lowpass', 700, 0.8, 0.12 * w, { src: 'brown', pan: p }); s.crackle(t + 0.05, 1.2, 1800, 0.05 * w, { pan: p }); s.ring(t, 150, 1.2, 0.05 * w, { pan: p }); s.rumble(t, 1.3, 0.2 * w, { f: 110, pan: p }); },
    drDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 80, 1.8, 0.06 * w, { to: 30, vib: [5, 60, 0.3], lp: 600, pan: p, rev: 0.5 }); s.ring(t + 0.3, 110, 1.6, 0.05 * w, { pan: p }); s.nz(t + 0.2, 1.6, 'lowpass', 400, 0.7, 0.05 * w, { src: 'brown', a: 0.2, pan: p }); },
    drHiss: (s, t, w, p) => { s.nz(t, 1.3, 'highpass', 4000, 0.6, 0.07 * w, { a: 0.05, to: 1800, pan: p }); for (let i = 0; i < 4; i++) s.ring(t + 0.2 + i * 0.25, 900 - i * 120, 0.2, 0.012 * w, { pan: p }); },   // 炉子熄灭的蒸汽声
  };

  return {
    name: '铁龙', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [SEAM, FURN, EYE, SPARK], HIT_POINT: [8, -32], EVENTS, MAX_H: 84, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'metal', how: 'topple', pal: 'fire', style: 'meteor', w: 1 },
    MOVES: ['flame', 'tail', 'roar'], MOVE_NAMES: { flame: '喷火', tail: '甩尾', roar: '熔岩（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.3, 1.5, 1.6, 1.8]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.25, 0.5, 0.7], 'flame'], [CAST, [0, 1 / 12, 0.5, 1.5], 'flame'], [RECOVER, [0.1, 0.3], 'flame'],
      [CHARGE, [0, 0.3, 0.6, 0.85], 'tail'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12], 'tail'], [RECOVER, [0.1, 0.25, 0.45], 'tail'],
      [CHARGE, [0, 0.3, 0.5], 'roar'], [CAST, [0, 2 / 12], 'roar'], [RECOVER, [0.1, 0.3, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.6, 0.9, 1.1, 1.4, 1.8, 2.2, 2.5, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 128 });
