// 地龙王（小首领，金库）：附录 G2「喷火的地龙之王」；被动 龙鳞（技能伤害减半，每被技能打中攒一截怒气）；龙息（一条线喷火、灼烧）；大地震（怒气满时放，全场震一次、全部击倒）；半血 怒气翻倍。
// 剪影：又长又重的四足岩石龙（身高约 66 格，冠顶约 70），暖褐色的岩板身子，板缝平时是黑的、发力时透出金光；背上四丛琥珀色的水晶；
// 一对折在肩上的短石翼；尾巴一节节岩环、尾端是一颗嵌着金箍和水晶的岩石锤。大方头，压低的岩眉下一只琥珀色竖瞳，上颌垂着一排钟乳石牙、下巴挂着石笋胡须；
// 头顶戴一顶歪着的五尖重金冠（红、绿、蓝宝石，中间一颗大红宝石）——这就是它的标志；角是两根向后掠的象牙色石角。身上嵌着金矿脉和宝石（它守着金库）。
// 主色：暖褐岩石 + 砂色腹甲 + 金 + 琥珀水晶；光：琥珀眼、金色板缝、水晶芯、嘴里的火。和铁龙（冷铁灰、炉火橙、烟囱、没有冠）区分：这只是天然的石头、金子和宝石。
// 招式（setMove）：quake 大地震（后腿人立、前爪收起、双翼张开、冠上宝石和板缝一级级烧亮、最后浑身发抖冠都在颤 → 两只前爪连着下巴砸地，地裂、碎石和金币一起飞起来）
// · breath 龙息（仰头鼓胸、背上的水晶从尾到头一丛丛亮起、嘴里火越烧越亮 → 头往前一探，张嘴一条线喷火）· roar 怒气翻倍（半血：人立仰天张嘴，冠上宝石炸亮、双翼全开，落地砸出裂纹）。
PCD.define('B_EarthDragonKingGargon', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, R = Math.round;

  // ───── 材质 ─────
  const ROCKR = ['#060403', '#120b07', '#1e130c', '#2a1b11', '#372316', '#452c1b', '#543621', '#654128', '#784d30', '#8d5c3a', '#a67048'];   // 暖褐岩石
  const CRYSR = ['#140803', '#2e1405', '#4a2107', '#6a310a', '#8c450d', '#ad5c12', '#c97619', '#df9225', '#efb03c', '#f8cd66', '#fde8a8'];   // 琥珀水晶
  const ROCK = defDeep(ROCKR, { depth: 8, dark: 1 }), ROCKP = defDeep(ROCKR, { depth: 4 }), ROCKD = defDeep(ROCKR, { depth: 5, dark: 3 }), HEADM = defDeep(ROCKR, { depth: 6 });
  const BELLY = defDeep('tan', { depth: 4, dark: 3 }), GOLD = defDeep('brass', { depth: 3 }), GOLDD = defDeep('brass', { depth: 3, dark: 2 });
  const HORN = defDeep('ivory', { depth: 3 }), HORND = defDeep('ivory', { depth: 3, dark: 3 }), TOOTH = defDeep('ivory', { depth: 2, amb: 0.4 }), CLAW = defDeep('obsidian', { depth: 2 });
  const CRYS = defDeep(CRYSR, { depth: 3, amb: 0.3 }), CRYSD = defDeep(CRYSR, { depth: 3, dark: 2 }), WING = defDeep('hide', { depth: 3, dark: 1 }), WINGD = defDeep('hide', { depth: 3, dark: 3 });
  const SEAM = defMat([20, 14, 47, 51], 1, 1), CORE = defMat([14, 47, 51, 21], 1, 1), FURN = defMat([44, 45, 46, 47], 1, 1), EYE = defMat([44, 14, 47, 51], 1, 1), SPARK = defMat([51, 51, 21, 21], 1, 1);
  const RUBY = defMat([55, 56, 57, 58], 1, 1), EMER = defMat([34, 35, 37, 38], 1, 1), SAPH = defMat([39, 40, 41, 22], 1, 1);
  const FIRE = FXR[FXI.fire], GLD = [51, 47, 14];
  const hero = new Sprite(188, 124, 92, 114);
  const DUR = [2.4, 2.0, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { quake: { 3: 1.8, 4: 0.4, 5: 0.8 }, breath: { 3: 1.1, 4: 0.6, 5: 0.5 }, roar: { 3: 0.5, 4: 0.5, 5: 0.8 } };
  let MV = 'quake';
  const HX = 84;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [47, 46, 45], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: GLD, k: 0.55 }, { x: 0, y: 0, r: 0, ramp: GLD, k: 0.5 }];
  const RIM_R = [0, 10, 16, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: GLD, flash: 0, dq: 0, lights: null, skip: new Uint8Array(96) };
  for (const m of [SEAM, CORE, FURN, EYE, SPARK, RUBY, EMER, SAPH]) RIM.skip[m] = 1;

  // ───── 骨架（脚底 y = 0，面朝右）─────
  const ROOT = { nf: [18, -24], ff: [13, -24], nh: [-18, -24], fh: [-23, -24] };
  const NECK = [30, -43], JAWH = [38, -41], TAILR = [-30, -32];
  const SEG = [8, 8, 7, 6, 6];
  // 重步 12 帧（一圈 1 秒）：四条腿一条接一条落地（后近 → 前近 → 后远 → 前远），每落一脚身子一沉
  const LEG12 = [[6, 0], [4.5, 0], [3, 0], [1.5, 0], [0, 0], [-1.5, 0], [-3, 0], [-4.5, 0], [-6, 0], [-4, 4], [1, 6], [5, 3]];
  const OFF = { nh: 0, nf: 3, fh: 6, ff: 9 }, TW12 = [0, 1, 2, 2, 1, 0, 0, -1, -2, -2, -1, 0];

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'nfx', 'nfy', 'ffx', 'ffy', 'nhx', 'nhy', 'fhx', 'fhy', 'hd', 'nk', 'jaw', 'ta', 'tc', 'tw', 'heat', 'glow', 'eyes', 'gem', 'cl', 'wg', 'sw', 'flash', 'dq', 'rim', 'crown', 'cr', 'glint'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.nfx = 2; P.nfy = 0; P.ffx = -2; P.ffy = 0; P.nhx = 2; P.nhy = 0; P.fhx = -2; P.fhy = 0;
    P.hd = 0; P.nk = 0; P.jaw = 0; P.ta = 0; P.tc = 0; P.tw = 0; P.heat = 1; P.glow = 0; P.eyes = 0; P.gem = 1; P.cl = 0; P.wg = 0; P.sw = 0;
    P.flash = 0; P.dq = 0; P.rim = 0; P.crown = 0; P.cr = 0; P.glint = -1; P.mx = 0; P.flip = 0;
  }
  const walk = (f) => { f = ((f % 12) + 12) % 12; for (const k in OFF) { const a = LEG12[(f - OFF[k] + 12) % 12]; P[k + 'x'] = a[0] + (k[0] === 'f' ? -1 : 0); P[k + 'y'] = a[1]; }
    P.by = f % 3 === 0 ? 1 : 0; P.hd = f % 3 === 0 ? 0.03 : f % 3 === 1 ? 0.01 : -0.01; P.tw = TW12[f]; P.bx = f % 6 < 3 ? 0 : 1; };
  const TAIL_IDLE = [0, 1, 2, 1, 0, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.sw = b; P.hd = b ? -0.02 : 0; P.tw = TAIL_IDLE[Math.floor(tt / 0.4) % 6];
      if (f12 % 9 === 0) P.glint = (f12 / 9) % 5;                                                  // 冠上的宝光偶尔一闪
      const lp = tt % DUR[IDLE]; if (lp >= 1.2 && lp < 2.2) { const k = Math.floor((lp - 1.2) * 12);   // 待机个性：昂起头，宝光从冠尖一个个扫过去，尾锤抬起再重重敲一下地，鼻孔喷两口尘
        P.hd = [-0.03, -0.06, -0.09, -0.1, -0.1, -0.1, -0.08, -0.05, -0.03, -0.02, -0.01, 0][k] || 0;
        P.glint = k >= 1 && k <= 5 ? k - 1 : -1; P.ta = [-0.1, -0.25, -0.4, -0.5, -0.5, -0.3, 0.06, 0.03, 0, 0, 0, 0][k] || 0; P.cr = k === 6 ? -1 : 0;
        P.jaw = k >= 7 && k <= 9 ? 0.12 : 0; P.gem = k >= 1 && k <= 5 ? 2 : 1; }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {   // 普攻：仰头蓄一口，往前一探吐出一团熔岩火球
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.hd = -0.25 * q; P.nk = -3 * q; P.bx = -2 * q; P.jaw = 0.3 * q; P.sw = 2; P.glow = 1; P.nfx = 2 + 2 * q; }
      else if (tq < 0.25) { P.hd = -0.28; P.nk = -3; P.bx = -2; P.jaw = 0.4; P.sw = 2; P.glow = 2; P.heat = 2; P.rim = 1; P.eyes = 2; P.nfx = 4; P.tw = -1; }
      else if (tq < 0.42) { const shut = tq >= 0.34; P.pv = 1; P.pitch = 0.04; P.bx = 4; P.nk = 6; P.hd = shut ? 0.16 : 0.1; P.jaw = shut ? 0.3 : 1; P.glow = 3; P.heat = 2; P.rim = 2; P.nfx = 7; P.ffx = 2; P.nhx = 4; P.tw = 2; P.eyes = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.pv = 1; P.pitch = 0.04 * (1 - q); P.bx = 4 * (1 - q); P.nk = 6 * (1 - q); P.hd = 0.16 * (1 - q); P.jaw = 0.3 * (1 - q); P.nfx = 2 + 5 * (1 - q); P.nhx = 2 + 2 * (1 - q); P.glow = q < 0.5 ? 1 : 0; P.tw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.pitch = -0.06; P.bx = -2; P.hd = -0.25; P.nk = -2; P.jaw = 0.5; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.tw = -2; P.heat = 2; P.nfy = 2; P.cr = -1; P.wg = 0.15; }
      else if (h < 0.35) { P.pitch = -0.03; P.bx = -1; P.hd = -0.12; P.jaw = 0.2; P.eyes = 1; P.tw = -1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.hd = -0.12 * (1 - q); P.jaw = 0.2 * (1 - q); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { quake: 0, breath: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    const k = f12 & 1;
    if (MV === 'quake') {
      if (st === CHARGE) {   // 后腿人立、前爪收到胸前、双翼张开；板缝和冠上宝石一级级亮起来，最后浑身发抖、冠在头上颤
        const q = ease.out(clamp01(tq / 0.9)), late = tq > 1.2;
        P.pitch = -0.2 * q; P.nfy = R(4 + 11 * q); P.nfx = 3 + 3 * q; P.ffy = R(3 + 10 * q); P.ffx = 1 + 3 * q; P.nhx = -1; P.fhx = -3;
        P.hd = -0.04 * q; P.nk = -1; P.jaw = 0.25 * q; P.sw = 2; P.wg = q; P.heat = tq < 0.4 ? 2 : 3; P.gem = tq > 0.9 ? 2 : 1; P.rim = tq > 0.8 ? 2 : 1; P.eyes = 2; P.ta = -0.5 * q; P.cl = R(4 * q);
        if (late) { P.bx = k ? -1 : 0; P.heat = f12 % 3 ? 3 : 4; P.cr = k ? -1 : 0; P.jaw = 0.35; }
      } else if (st === CAST) {   // 两只前爪连着下巴砸地
        P.pv = 1; P.pitch = 0.07; P.by = 3; P.nfx = 6; P.ffx = 4; P.nhx = 0; P.fhx = -3; P.hd = 0.22; P.nk = 2; P.jaw = 0.6; P.heat = 4; P.gem = 2; P.wg = 0.5; P.rim = tq < 0.1 ? 3 : 2; P.eyes = 2; P.ta = 0.1; P.cl = 4; P.cr = tq < 1 / 12 ? -2 : 0;
      } else { const q = ease.inOut(clamp01(tq / 0.6)); P.pv = 1; P.pitch = 0.07 * (1 - q); P.by = R(3 * (1 - q)); P.nfx = 6 - 4 * q; P.ffx = 4 - 6 * q; P.hd = 0.22 * (1 - q); P.nk = 2 * (1 - q); P.jaw = 0.6 * (1 - q); P.heat = q < 0.5 ? 3 : 1; P.wg = 0.5 * (1 - q); P.gem = q < 0.4 ? 2 : 1; P.cl = q < 0.5 ? 4 : 0; }
    } else if (MV === 'breath') {
      if (st === CHARGE) {   // 仰头鼓胸，背上的水晶从尾到头一丛丛亮起，嘴里的火越烧越亮
        const q = ease.out(clamp01(tq / 0.6));
        P.pitch = -0.06 * q; P.hd = -0.35 * q; P.nk = -3 * q; P.sw = q > 0.3 ? 2 : 1; P.jaw = 0.1 + 0.2 * q; P.glow = tq < 0.3 ? 1 : tq < 0.7 ? 2 : 3; P.heat = tq < 0.5 ? 2 : 3;
        P.cl = Math.min(4, Math.floor(tq / 0.2)); P.nfx = 4; P.nfy = R(2 * q); P.ffx = 0; P.bx = tq > 0.8 ? -1 - k : -q; P.eyes = 2; P.rim = tq > 0.6 ? 2 : 1; P.ta = 0.1 * q; P.tw = 2;
      } else if (st === CAST) {   // 头往前一探，张嘴一条线喷火，反冲让身子一顿一顿
        P.pv = 1; P.pitch = 0.05; P.hd = 0.12 + k * 0.03; P.nk = 7; P.bx = 3 - k; P.jaw = f12 % 3 === 0 ? 0.85 : 1; P.glow = 3; P.heat = 3; P.cl = 4; P.rim = tq < 0.1 ? 3 : 2;
        P.nfx = 7; P.ffx = 3; P.fhx = -4; P.eyes = 2; P.tw = k ? 2 : 1;
      } else { const q = ease.inOut(clamp01(tq / 0.45)), j = clamp01(tq / 0.2); P.pv = 1; P.pitch = 0.05 * (1 - q); P.hd = 0.12 * (1 - q); P.nk = 7 * (1 - q); P.bx = 3 * (1 - q); P.jaw = 1 - 0.8 * j; P.nfx = 2 + 5 * (1 - q); P.glow = q < 0.5 ? 2 : 0; P.heat = q < 0.5 ? 3 : 1; P.cl = q < 0.5 ? 4 : 0; }
    } else {   // roar：怒气翻倍（半血的怒吼）
      if (st === CHARGE) { const q = ease.out(clamp01(tq / 0.35)); P.by = R(2 * q); P.hd = 0.15 * q; P.nk = -1; P.heat = 3; P.gem = 2; P.sw = 2; P.eyes = 2; P.bx = tq > 0.25 ? -k : 0; P.jaw = 0.15; P.wg = 0.3 * q; P.rim = 1; P.cl = 2; }
      else if (st === CAST) { P.pitch = -0.17; P.nfy = 9; P.ffy = 7; P.nfx = 6; P.ffx = 3; P.hd = -0.36; P.nk = 2; P.jaw = 1; P.heat = 4; P.gem = 2; P.glow = 2; P.wg = 1; P.rim = 3; P.eyes = 2; P.ta = -0.6; P.tw = 2; P.cl = 4; P.sw = 2; P.glint = f12 % 5; }
      else {
        const q1 = ease.in(clamp01(tq / 0.17)), q = ease.inOut(clamp01((tq - 0.17) / 0.5));
        P.pitch = -0.17 * (1 - q1); P.nfy = R(9 * (1 - q1)); P.ffy = R(7 * (1 - q1)); P.nfx = 6 - 4 * q; P.ffx = 3 - 5 * q; P.by = q1 >= 1 && q < 0.3 ? 2 : 0;
        P.hd = -0.36 * (1 - q) + (q1 >= 1 && q < 0.2 ? 0.1 : 0); P.nk = 2 * (1 - q); P.jaw = 1 - q; P.heat = q < 0.5 ? 4 : 2; P.gem = q < 0.5 ? 2 : 1; P.wg = 1 - q; P.glow = q < 0.4 ? 2 : 0;
        P.ta = -0.6 * (1 - q); P.rim = q < 0.3 ? 2 : 0; P.eyes = 2; P.cl = q < 0.5 ? 4 : 0;
      }
    }
  }
  function deathPose(d, f12) {   // 前膝一软跪下 → 整个身子砸在地上、头垂到地 → 冠掉下来歪在地上 → 身子一点点石化、板缝和宝石熄灭
    if (d < 0) return;
    if (d < 0.3) { P.pitch = -0.07; P.bx = -2; P.hd = -0.32; P.nk = -2; P.jaw = 0.6; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.tw = -2; P.heat = 3; P.nfy = 3; P.cr = -1; P.wg = 0.3; return; }
    const q1 = ease.in(clamp01((d - 0.3) / 0.45)), q2 = ease.in(clamp01((d - 0.75) / 0.3));
    P.pv = 1; P.pitch = 0.1 * q1 * (1 - q2); P.by = 5 * q1 + 8 * q2; P.bx = 2 * q1;
    P.nfx = 2 + 5 * q1; P.ffx = -2 + 4 * q1; P.nhx = 2 - 4 * q2; P.fhx = -2 - 4 * q2;
    P.hd = -0.32 * (1 - q1) + 0.25 * q1 + 0.1 * q2; P.nk = 3 * q2; P.jaw = 0.6 - 0.3 * q1 + 0.3 * q2; P.eyes = d < 1.8 ? 1 : 3; P.ta = 0.15 * q2; P.wg = 0.3 * (1 - q2);
    P.heat = d < 1.2 ? 2 : d < 1.8 ? (f12 & 1 ? 1 : 2) : 0; P.gem = d < 1.05 ? 1 : 0; P.cl = 0;
    P.cr = d >= 0.9 && d < 1.05 ? -3 : 0; P.crown = d >= 1.05 ? 1 : 0;
    if (d > 2.3) P.dq = Math.round(clamp01((d - 2.3) / 0.55) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：大地震是近侧前爪，怒吼是冠，其余是嘴
  function focus() { geo(); const act = P.st === CHARGE || P.st === CAST; const p = MV === 'quake' && act ? L.nf.h : MV === 'roar' && act ? L.crown : L.mouth; P.fx = p[0]; P.fy = p[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(P.pv ? 18 : -22, 0, P.pitch); }
  function headXf() { bodyXf(); B.move(P.nk, P.nk * 0.15); B.rot(NECK[0], NECK[1], P.hd); }
  function jawXf() { headXf(); B.rot(JAWH[0], JAWH[1], P.jaw * 0.5); }
  function tailPts() {
    const pts = [TAILR.slice()]; let x = TAILR[0], y = TAILR[1]; const a0 = Math.PI - 0.75 + P.ta + P.tw * 0.04, c = 0.08 + P.tc;
    for (let i = 0; i < SEG.length; i++) { const a = a0 + c * i; x += Math.cos(a) * SEG[i]; y += Math.sin(a) * SEG[i]; pts.push([x, y]); }
    return pts;
  }
  function geo() {
    bodyXf();
    for (const k of ['nf', 'ff', 'nh', 'fh']) { const r = B.at(ROOT[k][0], ROOT[k][1]); const tgt = [ROOT[k][0] + P[k + 'x'], -P[k + 'y']]; const fore = k[1] === 'f', l1 = 13, l2 = 13;
      const kn = B.ik(r, tgt, l1, l2, fore ? -1 : 1), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; L[k] = { r, kn, h: [kn[0] + (tgt[0] - kn[0]) / dd * l2, kn[1] + (tgt[1] - kn[1]) / dd * l2] }; }
    L.tailB = tailPts(); L.tail = L.tailB.map((p) => B.at(p[0], p[1]));
    L.nk0 = B.at(20, -40); L.cry = B.at(2, -57); L.chip = B.at(-6, -34);
    headXf(); L.nk1 = B.at(36, -45); L.mouth = B.at(64, -40); L.eye = B.at(53, -47); L.nose = B.at(65, -46); L.crown = B.at(49, -62);
    B.reset();
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 板缝：平时是一道黑缝，发力时透出金光
  const ST = [0, 0, 2, 3, 3];
  const crack = (x0, y0, x1, y1) => { if (P.heat >= 2) B.ln(E, x0, y0, x1, y1, SEAM, ST[P.heat]); else B.ln(E, x0, y0, x1, y1, ROCK, 2); };
  const crackPath = (pts) => { for (let i = 1; i < pts.length; i++) crack(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]); };
  // 宝石：平时本色一点高光，发力时整颗炸亮，死后发暗
  const gem = (x, y, m, big) => { const t = P.gem === 0 ? 2 : P.gem === 2 ? 4 : 0; B.px(E, x, y, m, t); if (big) { B.px(E, x + 1, y, m, P.gem === 0 ? 1 : 2); B.px(E, x, y + 1, m, P.gem === 0 ? 1 : 2); B.px(E, x + 1, y + 1, m, P.gem === 0 ? 1 : t === 4 ? 4 : 0); } if (P.gem) B.px(E, x, y, P.gem === 2 ? SPARK : m, P.gem === 2 ? 0 : 4); };
  // 一根琥珀水晶柱：a 倾角（0 朝上），h 长，w 半宽；lit 时晶芯发光
  function prism(x, y, a, h, w, m, lit) {
    const d = [Math.sin(a), -Math.cos(a)], p = [Math.cos(a), Math.sin(a)], at = (u, v) => [x + d[0] * u + p[0] * v, y + d[1] * u + p[1] * v];
    B.poly(E, [at(-2, -w), at(h - w * 1.3, -w), at(h, 0), at(h - w * 1.3, w), at(-2, w)], m);
    const r0 = at(0, -0.3), r1 = at(h - 1.5, -0.3); if (lit >= 0 && P.heat > 0) B.ln(E, r0[0], r0[1], r1[0], r1[1], CORE, Math.max(1, lit)); else B.ln(E, r0[0], r0[1], r1[0], r1[1], m, 8);
    const s0 = at(0, w - 0.6), s1 = at(h - w * 1.3, w - 0.6); B.ln(E, s0[0], s0[1], s1[0], s1[1], m, 3);
    const tp = at(h - 1, -0.5); B.px(E, tp[0], tp[1], m, 9);
  }

  function drawLeg(k, far) {
    const g = L[k], m = far ? ROCKD : ROCK, fore = k[1] === 'f';
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], fore ? 7 : 8, 5.6, m);                                      // 大腿：一整块岩石
    if (!far) { lnW(g.r[0] - 3, g.r[1] + 1, g.kn[0] - 3, g.kn[1] - 1, m, 7); lnW(g.r[0] + 3, g.r[1] + 3, g.kn[0] + 2, g.kn[1], m, 3); }
    part(); capW(g.kn[0], g.kn[1], g.h[0], g.h[1] - 3, 5.4, 4.8, m);                                             // 柱子一样的小腿
    lnW(g.kn[0] - 2, g.kn[1] + 1, g.h[0] - 2, g.h[1] - 4, m, far ? 4 : 7);
    if (!far) { const mx = (g.kn[0] + g.h[0]) / 2, my = (g.kn[1] + g.h[1]) / 2; if (P.heat >= 2) { lnW(mx + 1, my - 3, mx + 3, my + 1, SEAM, ST[P.heat]); } else lnW(mx + 1, my - 3, mx + 3, my + 1, m, 2); }
    dot(g.kn[0] - 0.5, g.kn[1] - 1, 1.6, m, far ? 6 : 8); px(g.kn[0] + 1, g.kn[1] + 1.5, m, 2);   // 膝盖的岩疙瘩
    if (k === 'nf') {                                                                                              // 近侧前腿的金臂环 + 红宝石
      const q = 0.52, ax = g.kn[0] + (g.h[0] - g.kn[0]) * q, ay = g.kn[1] + (g.h[1] - g.kn[1]) * q;
      part(); capW(ax - 5.2, ay - 0.5, ax + 5.2, ay + 0.5, 1.6, 1.6, GOLD); lnW(ax - 4, ay - 1.5, ax + 4, ay - 1, GOLD, 9); lnW(ax - 4, ay + 1.5, ax + 4, ay + 1.5, GOLD, 3);
      B.reset(); gem(ax + 1, ay - 1, RUBY, 1);
    }
    part(); const hx = R(g.h[0]), hy = R(g.h[1]);                                                                 // 宽大的石脚掌 + 三只黑曜石钝爪
    polyW([[hx - 6, hy - 5], [hx + 3, hy - 6], [hx + 7, hy - 3], [hx + 7, hy], [hx - 7, hy]], m); lnW(hx - 5, hy - 5, hx + 3, hy - 6, m, far ? 5 : 8); lnW(hx - 6, hy - 1, hx + 6, hy - 1, m, 3); px(hx - 2, hy - 3, m, 2);
    part(); for (let i = 0; i < 3; i++) polyW([[hx + 3 + i * 0.5, hy - 3 + i * 1.5], [hx + 9 - i * 0.5, hy - 1 + i * 0.5], [hx + 3 + i * 0.5, hy + i * 0.5]], CLAW, far ? 3 : 5 + i);
    px(hx - 8, hy, CLAW, far ? 3 : 5);
  }
  function drawTail() {   // 一节节岩环，尾端一颗嵌金箍、长水晶的岩石锤
    const pts = L.tailB, n = pts.length - 1;
    part(); bodyXf(); B.strand(E, pts, 8.5, 3.6, ROCK);
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl, r = 8.5 - 5 * i / n;
      crack(b[0] + nx * r * 0.85, b[1] + ny * r * 0.85, b[0] - nx * r * 0.85, b[1] - ny * r * 0.85);
      B.ln(E, a[0] - nx * (r - 1.5), a[1] - ny * (r - 1.5), b[0] - nx * (r - 2), b[1] - ny * (r - 2), ROCK, 8);
      if (i === 2) { const m0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; B.ell(E, m0[0] + nx, m0[1] + ny, 1.3, 1, 0, GOLD, 7); }
    }
    part(); for (const [i, a, h] of [[1, -0.4, 6], [3, -0.6, 5]]) { const p = pts[i]; prism(p[0] + 1, p[1] - 6, a, h, 1.6, CRYS, P.cl >= 1 ? 3 : -1); }
    const c = pts[n], cx = c[0] - 3, cy = c[1] + 1;
    part(); const RS = [8.6, 7.4, 9, 7.8, 8.8, 7.6, 9.2, 8], cp = RS.map((r, i) => { const a = i / RS.length * 6.2832 + 0.2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9]; });
    B.poly(E, cp, ROCK); B.ln(E, cx - 6, cy - 5, cx + 1, cy - 7, ROCK, 9); B.ln(E, cx - 7, cy - 4, cx - 7, cy + 2, ROCK, 7); crackPath([[cx - 1, cy - 7], [cx, cy - 1], [cx - 5, cy + 4]]); crackPath([[cx, cy - 1], [cx + 5, cy + 2]]);
    for (const [x, y] of [[cx - 4, cy - 2], [cx + 3, cy + 4], [cx - 2, cy + 5]]) { B.px(E, x, y, ROCK, 2); B.px(E, x - 1, y - 1, ROCK, 8); }
    B.ell(E, cx - 3, cy + 1, 1.3, 1.1, 0, GOLD, 8); gem(cx + 1, cy - 4, RUBY, 0);
    part(); B.cap(E, cx + 6, cy - 7, cx + 7, cy + 6, 1.8, 1.8, GOLD); B.ln(E, cx + 6, cy - 6, cx + 6, cy + 5, GOLD, 9); gem(cx + 7, cy - 1, EMER, 0);
    part(); prism(cx - 2, cy - 7, -0.3, 6, 1.8, CRYS, P.cl >= 1 ? 3 : -1); prism(cx - 7, cy - 4, -0.9, 5, 1.6, CRYSD, P.cl >= 1 ? 3 : -1);
  }
  function wingPts(far) {
    const w = P.wg, lp = (a, b) => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w], o = far ? [-6, -3] : [0, 0];
    const T1 = lp([-8, -52], [0, -73]), T2 = lp([-13, -47], [-13, -68]), T3 = lp([-11, -40], [-24, -57]);
    const sh = (p) => [p[0] + o[0], p[1] + o[1]], R0 = sh([9, -45]), R1 = sh([-1, -38]);
    const mid = (a, b) => [(a[0] + b[0]) / 2 * 0.8 + R0[0] * 0.2, (a[1] + b[1]) / 2 * 0.8 + R0[1] * 0.2];
    const t1 = sh(T1), t2 = sh(T2), t3 = sh(T3);
    return { R0, R1, t1, t2, t3, m12: mid(t1, t2), m23: mid(t2, t3) };
  }
  function drawWing(far) {   // 短短的石翼：三根石骨撑着一片厚皮
    const g = wingPts(far), bone = far ? ROCKD : ROCK, mem = far ? WINGD : WING;
    part(); bodyXf(); B.poly(E, [g.R0, g.t1, g.m12, g.t2, g.m23, g.t3, g.R1], mem);
    for (const t of [g.t2, g.t3]) B.ln(E, g.R0[0], g.R0[1], t[0] * 0.85 + g.R0[0] * 0.15, t[1] * 0.85 + g.R0[1] * 0.15, mem, 3);
    B.ln(E, g.m12[0], g.m12[1], (g.m12[0] + g.R0[0]) / 2, (g.m12[1] + g.R0[1]) / 2, mem, 7);
    part(); B.cap(E, g.R0[0], g.R0[1], g.t1[0], g.t1[1], 2.6, 1.1, bone); B.cap(E, g.R0[0], g.R0[1], g.t2[0], g.t2[1], 1.8, 0.8, bone); B.cap(E, g.R0[0], g.R0[1], g.t3[0], g.t3[1], 1.6, 0.8, bone);
    if (!far) B.ln(E, g.R0[0] - 1, g.R0[1] - 2, g.t1[0], g.t1[1] + 1, bone, 8);
    part(); B.ell(E, g.R0[0], g.R0[1], 3.2, 3, 0, far ? ROCKD : ROCKP); B.px(E, g.R0[0] - 1, g.R0[1] - 1, far ? ROCKD : ROCKP, 8);
    const d = [g.t1[0] - g.R0[0], g.t1[1] - g.R0[1]], dl = Math.hypot(d[0], d[1]) || 1; B.poly(E, [[g.t1[0] - 1, g.t1[1]], [g.t1[0] + d[0] / dl * 3, g.t1[1] + d[1] / dl * 3], [g.t1[0] + 1, g.t1[1] + 1]], CLAW);   // 翼尖一只小爪
  }
  function drawBody() {
    part(); bodyXf();                                                                                               // 砂色腹甲
    B.ell(E, -3, -24, 26, 6.5, 0, BELLY); for (let x = -24; x <= 18; x += 5) B.ln(E, x, -22, x + 1, -18, BELLY, 3); B.ln(E, -22, -20, 18, -20, BELLY, 7);
    part(); B.ell(E, -4, -34, 30, 13 + P.sw * 0.5, 0, ROCK); B.ell(E, -20, -33, 12.5, 13, 0, ROCK); B.ell(E, 15, -35 - P.sw * 0.5, 13, 14 + P.sw * 0.5, 0, ROCK); B.ell(E, 3, -43, 15, 7, 0, ROCK);   // 岩石的身子
  }
  function drawCrystals() {   // 背上四丛琥珀水晶（i < P.cl 的那几丛亮起来）
    const CL = [[-27, -43, [[-0.55, 7, 2], [0, 10, 2.5], [0.5, 6, 1.9]]], [-13, -48, [[-0.35, 9, 2.4], [0.1, 13, 3], [0.55, 7, 2]]],
      [2, -50, [[-0.3, 10, 2.5], [0.12, 14, 3.2], [0.6, 8, 2.2]]], [15, -47, [[-0.15, 8, 2.2], [0.4, 10, 2.6]]]];
    CL.forEach(([x, y, ps], i) => { part(); bodyXf(); const lit = P.heat >= 3 || i < P.cl ? Math.min(4, Math.max(3, P.heat)) : P.heat >= 2 ? 2 : P.heat >= 1 ? 1 : -1;
      ps.forEach(([a, h, w], j) => prism(x + (j - 1) * 2.2, y, a, h, w, j === 0 ? CRYSD : CRYS, j === 0 && lit < 3 ? -1 : lit)); });
  }
  function drawRock() {   // 岩板缝、金矿脉、嵌着的宝石
    part(); bodyXf();
    crackPath([[-15, -46], [-12, -39], [-15, -30], [-13, -22]]); crackPath([[11, -47], [8, -39], [11, -31], [9, -23]]); crackPath([[-33, -33], [-25, -35], [-15, -33]]); crackPath([[12, -33], [20, -36], [27, -32]]);
    crackPath([[-28, -44], [-24, -39], [-28, -31]]); crackPath([[22, -44], [19, -40]]);
    B.ln(E, -32, -40, -22, -45, ROCK, 8); B.ln(E, 12, -46, 22, -46, ROCK, 8); B.ln(E, -10, -49, 4, -50, ROCK, 8); B.ln(E, -30, -24, -18, -22, ROCK, 3);
    for (const [x, y] of [[-24, -29], [-19, -41], [18, -30], [24, -38], [-30, -36]]) { B.px(E, x, y, ROCK, 3); B.px(E, x + 1, y - 1, ROCK, 7); }   // 岩面的坑
    B.ln(E, -30, -28, -26, -25, GOLD, 7); B.ln(E, -26, -25, -22, -27, GOLD, 8); B.ln(E, -22, -27, -18, -24, GOLD, 7); B.px(E, -26, -26, GOLD, 9);   // 金矿脉
    B.ln(E, 14, -28, 18, -26, GOLD, 7); B.ln(E, 18, -26, 23, -27, GOLD, 8); B.ln(E, 23, -27, 25, -25, GOLD, 6);
    part(); B.ell(E, -19, -44, 1.4, 1.1, 0, GOLD, 7); B.ell(E, 19, -43, 1.2, 1, 0, GOLD, 8); B.ell(E, -8, -27, 1.1, 1, 0, GOLD, 7);   // 金块
    B.reset(); bodyXf(); gem(-22, -38, RUBY, 1); gem(21, -40, EMER, 1); gem(-28, -25, SAPH, 0); gem(6, -27, RUBY, 0);
  }
  function drawNeck() {
    const a = L.nk0, b = L.nk1;
    part(); capW(a[0], a[1], b[0], b[1], 10, 8.5, ROCK);
    lnW(a[0] - 1, a[1] - 8, b[0] - 2, b[1] - 7.5, ROCK, 8);
    for (const q of [0.2, 0.5, 0.8]) { const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; lnW(x - 3, y + 5, x + 2, y + 8, ROCK, 3); lnW(x - 2, y + 4, x + 3, y + 7, ROCK, 7); }   // 喉下一道道岩褶
    for (const q of [0.35, 0.7]) { const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; if (P.heat >= 2) lnW(x + 2, y - 7, x + 3, y + 3, SEAM, MV === 'breath' && P.glow >= 2 ? 4 : ST[P.heat]); else lnW(x + 2, y - 7, x + 3, y + 3, ROCK, 2); }
    part(); for (const q of [0.2, 0.55]) { const x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; polyW([[x - 2.5, y - 8], [x - 1, y - 12], [x + 2, y - 8.5]], ROCKP); px(x - 1, y - 11, ROCKP, 8); }   // 颈背的石棘
  }
  function drawHorn(far) {   // 两根向后掠的象牙色石角
    part(); headXf(); const o = far ? -3 : 0, dy = far ? -1 : 0;
    const pts = [[42 + o, -52 + dy], [36 + o, -56 + dy], [30 + o, -58 + dy], [24 + o, -59 + dy], [19 + o, -62 + dy], [17 + o, -66 + dy]];
    B.strand(E, pts, far ? 3 : 3.9, 0.9, far ? HORND : HORN);
    if (!far) { B.ln(E, 40, -54, 31, -61, HORN, 8); for (let i = 1; i < 4; i++) B.px(E, pts[i][0] + 1, pts[i][1] + 1, HORN, 3); B.px(E, 22, -65, HORN, 9); }
  }
  function drawHead() {
    if (P.jaw > 0.08) { part(); headXf(); B.ell(E, 51, -40, 13, 1.5 + P.jaw * 5, 0, FURN, 2); B.ell(E, 50, -40, 10, 1 + P.jaw * 3.5, 0, FURN, P.glow >= 2 ? 4 : 3); if (P.glow >= 3) B.ell(E, 47, -40, 4, 0.8 + P.jaw * 1.8, 0, SPARK, 0); }   // 张嘴：喉咙里是火
    part(); headXf();                                                                                                   // 巨石一样的方头 + 上颌
    B.poly(E, [[33, -47], [36, -53], [42, -57], [50, -58], [57, -56], [63, -51], [67, -46], [67, -42], [63, -40], [40, -40], [34, -42]], HEADM);
    B.ln(E, 38, -54, 48, -57, HEADM, 8); B.ln(E, 50, -57, 58, -55, HEADM, 7); B.ln(E, 66, -45, 66, -42, HEADM, 3); B.ln(E, 45, -41, 63, -41, HEADM, 3);
    crackPath([[40, -50], [43, -46]]); crackPath([[59, -52], [61, -48], [60, -44]]);
    B.px(E, 64, -46, HEADM, 10); B.px(E, 65, -46, HEADM, 10); B.px(E, 64, -47, HEADM, 8); B.px(E, 61, -54, HEADM, 8); B.px(E, 62, -53, HEADM, 7);   // 鼻孔、吻上的石疙瘩
    part(); B.poly(E, [[33, -47], [38, -51], [42, -45], [40, -40], [34, -41]], ROCKP); B.ln(E, 34, -47, 38, -50, ROCKP, 9); gem(37, -45, RUBY, 0);   // 腮甲 + 红宝石钉
    part(); B.poly(E, [[42, -53], [50, -56], [58, -53], [60, -50], [55, -48.5], [45, -49]], ROCKP);               // 压低的岩眉
    B.ln(E, 43, -53, 50, -55.5, ROCKP, 9); B.ln(E, 51, -55, 57, -53, ROCKP, 8); B.ln(E, 46, -49, 56, -49, ROCKP, 2);
    if (P.eyes === 1) B.ln(E, 50, -47, 56, -47, HEADM, 10);
    else if (P.eyes === 3) { B.ln(E, 50, -47, 56, -47, HEADM, 10); B.ln(E, 51, -46, 55, -46, HEADM, 2); }                // 石化：眼睛成了一道死灰的缝
    else { const hot = P.eyes === 2 || P.glow >= 2; B.ell(E, 53, -46.5, 4.6, 2.4, 0, HEADM, 10); B.ell(E, 53, -46.3, 3.6, 1.6, 0, EYE, hot ? 4 : 0); B.ln(E, 50, -45.5, 56, -45.5, EYE, 2); B.ln(E, 53.5, -47.5, 53.5, -45, EYE, 1); B.px(E, 51, -47, SPARK); }   // 琥珀竖瞳
    part(); jawXf();                                                                                                    // 下颌 + 石笋胡须
    B.poly(E, [[35, -42], [62, -41], [65, -39], [62, -35], [46, -33], [37, -36]], HEADM); B.ln(E, 38, -41, 62, -41, HEADM, 8); B.ln(E, 40, -35, 60, -35, HEADM, 3);
    for (let x = 45; x <= 61; x += 4) B.poly(E, [[x - 1, -41], [x, -43.5], [x + 1, -41]], TOOTH);
    part(); B.strand(E, [[47, -34], [46, -30], [44.5, -26]], 1.9, 0.5, HORN); B.strand(E, [[52, -34], [51.5, -31], [51, -28]], 1.6, 0.5, HORN); B.strand(E, [[57, -35], [57, -32.5]], 1.3, 0.5, HORN);
    B.px(E, 46, -31, HORN, 8); B.px(E, 51, -31, HORN, 8); B.ell(E, 46, -29, 1.2, 0.9, 0, GOLD, 8);                   // 胡须上的金珠
    part(); headXf();                                                                                                   // 上颌垂下的一排钟乳石牙
    const TL = [3, 5, 3, 6, 3, 5, 3, 4];
    for (let i = 0; i < 8; i++) { const x = 42 + i * 3; B.poly(E, [[x - 1.3, -40.5], [x + 1.3, -40.5], [x, -40.5 + TL[i]]], TOOTH); B.px(E, x - 0.5, -40, TOOTH, 8); }
  }
  function crownShape() {   // 本地坐标：冠底中点 (0, 0)
    part(); B.poly(E, [[-8.5, 0.5], [8.5, 0.5], [8, -3.5], [-8, -3.5]], GOLD);
    const PT = [[-7, 5], [-3.6, 7], [0, 9], [3.6, 7], [7, 5]];
    for (const [x, h] of PT) B.poly(E, [[x - 2, -3], [x, -3 - h], [x + 2, -3]], GOLD);
    B.ln(E, -8, -3.5, 8, -3.5, GOLD, 9); B.ln(E, -8, 0, 8, 0, GOLD, 3); for (let x = -7; x <= 7; x += 2) B.px(E, x, -1.5, GOLD, (x + 7) % 4 ? 8 : 3);
    for (const [x, h] of PT) { B.ln(E, x - 1, -4, x - 0.3, -2 - h, GOLD, 8); }
    part(); PT.forEach(([x, h], i) => { B.ell(E, x, -3.5 - h, 1.2, 1.2, 0, GOLD, 7); if (P.glint === i) { B.px(E, x, -5 - h, SPARK); B.px(E, x - 1, -3.5 - h, SPARK); B.px(E, x + 1, -3.5 - h, SPARK); B.px(E, x, -2 - h, SPARK); } });
  }
  function crownGems() { gem(-5, -2, EMER, 0); gem(0, -2, RUBY, 1); gem(5, -2, SAPH, 0); gem(-0.5, -7, RUBY, 1); }
  function drawCrown() {   // 歪戴在头顶的五尖重金冠
    headXf(); B.move(49, -56 + P.cr); B.rot(0, 0, 0.1); crownShape(); part(); crownGems(); B.reset();
  }
  function drawCrownFallen() {   // 死亡：冠掉下来，侧躺在头前面的地上
    B.reset(); B.move(74, -8.5); B.rot(0, 0, 1.35); crownShape(); part(); crownGems(); B.reset();
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawTail();
    drawLeg('fh', 1); drawLeg('ff', 1);
    if (P.wg > 0.2) drawWing(1);
    drawBody(); drawCrystals(); drawRock();
    drawLeg('nh', 0); drawLeg('nf', 0);
    drawWing(0); drawNeck();
    drawHorn(1); drawHead(); drawHorn(0);
    if (P.crown) drawCrownFallen(); else drawCrown();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    const lm = P.glow ? 6 + P.glow * 6 : 0, lc = P.gem >= 2 && !P.crown ? 16 : 0, lk = P.heat >= 3 ? 12 + (P.heat - 3) * 6 : 0;
    if (lm || lc || lk) {
      LIGHT[0].x = L.mouth[0] * z + spr.ox; LIGHT[0].y = L.mouth[1] * z + spr.oy; LIGHT[0].r = lm * z;
      LIGHT[1].x = L.crown[0] * z + spr.ox; LIGHT[1].y = L.crown[1] * z + spr.oy; LIGHT[1].r = lc * z;
      LIGHT[2].x = L.cry[0] * z + spr.ox; LIGHT[2].y = L.cry[1] * z + spr.oy; LIGHT[2].r = lk * z;
      RIM.lights = LIGHT;
    } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（人立仰天、冠上宝石炸亮、双翼全开），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;
  const headAt = (spr) => { headXf(); const c = B.at(51, -50); B.reset(); PHEAD = [c[0] * 2 + spr.ox, c[1] * 2 + spr.oy, 19 * 2]; };
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 2 / 12, 0); P.hd = -0.3; P.rim = 2; P.glint = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(PSPR); return PSPR; }
  function headShot() { const mv = MV; MV = 'breath'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.gem = 2; P.glint = 2; P.heat = 2; P.jaw = 0.15; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(PSPR); return PSPR; }   // 头像：待机侧脸，眼和冠上宝石亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (x) => scrX(x), sy = (y) => HY + y, dirX = () => (P.flip ? -1 : 1);
  let crackT = 9, lastStep = -1, flameT = 0, idleLp = 0, smokeT = 0;
  function strikeFx() {   // 吐出一团熔岩火球
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]), d = dirX();
    fx.cross(mx + d * 4, my, 8, 'fire', 0.18); fx.beam(mx, my, mx + d * 26, my + 3, 3, 'fire', 0.18, 2);
    for (let i = 0; i < 14; i++) { const a = (Math.random() - 0.5) * 0.8, v = 60 + Math.random() * 90; spawn(K_BURST, mx, my, d * Math.cos(a) * v, Math.sin(a) * v, 0.2 + Math.random() * 0.25, i & 1 ? FXI.fire : FXI.earth); }
    hitDummy(1, 1); shake(0.15, 2);
  }
  function quakeFx() {
    const x = sx(L.nf.h[0]), d = dirX();
    ring(x, HY - 2, 1, FXI.earth); ring(sx(-4), HY - 2, 1, FXI.fire);
    for (const s of [1, -1]) { fx.wave(x, HY, s, 70, 9, 'earth', 0.6, 2); fx.crack(x, HY, 26, s, 'fire', 1.3); fx.crack(x - d * 20, HY, 18, s, 'fire', 1.2); }
    fx.crack(x + d * 30, HY, 16, 1, 'fire', 1.1);
    burst(x, HY - 3, 34, 60, 190, 0.35, 0.8, FXI.earth, 50); burst(x, HY - 2, 24, 40, 130, 0.4, 0.9, FXI.dust, 20); burst(x, HY - 4, 16, 50, 150, 0.3, 0.7, FXI.coin, 60);   // 碎石、尘和金库里震起来的金币
    shake(0.45, 3); flash(0.12); crackT = 0; hitDummy(1, 1);
  }
  function breathFx() {
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]), d = dirX();
    ring(mx + d * 4, my, 0, FXI.fire); fx.cross(mx + d * 4, my, 10, 'fire', 0.2); fx.beam(mx, my, mx + d * 70, my + 12, 5, 'fire', 0.35, 2); fx.beam(mx, my, mx + d * 56, my + 10, 2, 'holy', 0.25, 2);
    burst(mx, my, 20, 60, 160, 0.2, 0.45, FXI.fire, 10); shake(0.35, 3); flash(0.08); hitDummy(1, 1); flameT = 0;
  }
  function roarFx() {
    const mx = sx(L.mouth[0]), my = sy(L.mouth[1]), cx = sx(L.crown[0]), cy = sy(L.crown[1]);
    ring(mx, my, 1, FXI.fire); ring(cx, cy, 1, FXI.coin);
    fx.cross(cx, cy, 12, 'holy', 0.3); fx.beam(mx, my, mx + dirX() * 8, my - 36, 3, 'fire', 0.45, 2);
    burst(cx, cy, 26, 50, 150, 0.3, 0.7, FXI.coin, 40); burst(mx, my, 20, 50, 140, 0.25, 0.6, FXI.fire, 30); burst(sx(L.cry[0]), sy(L.cry[1]), 16, 30, 100, 0.3, 0.6, FXI.holy, 30);
    flash(0.12); shake(0.4, 3);
  }
  function landFx() {
    const x = sx(L.nf.h[0]);
    fx.crack(x, HY, 18, 1, 'fire', 1.1); fx.crack(x - dirX() * 6, HY, 14, -1, 'fire', 1.1); fx.wave(x, HY, 1, 36, 6, 'earth', 0.4, 2); fx.wave(x, HY, -1, 36, 6, 'earth', 0.4, 2);
    burst(x, HY - 1, 22, 30, 110, 0.4, 0.8, FXI.earth, 18); shake(0.3, 3); crackT = 0;
  }
  function onEnter(s) {
    if (s === CHARGE) { lastStep = -1; if (MV === 'quake') { sfx('boss', { k: 'dkRumble', w: 1 }); sfx('boss', { k: 'growl', w: 0.6 }); } else if (MV === 'breath') sfx('boss', { k: 'dkInhale', w: 1 }); else sfx('boss', { k: 'growl', w: 0.8 }); }
    if (s === CAST) {
      if (MV === 'quake') { quakeFx(); sfx('boss', { k: 'dkQuake', w: 1 }); sfx('impact', { pal: 'earth', w: 1 }); sfx('fall', { w: 1 }); }
      else if (MV === 'breath') { breathFx(); sfx('boss', { k: 'dkBreath', w: 1 }); sfx('impact', { pal: 'fire', w: 0.8 }); }
      else { roarFx(); sfx('boss', { k: 'dkRoar', w: 1 }); sfx('boss', { k: 'dkCrown', w: 0.7 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'growl', w: 0.35 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('boss', { k: 'dkSpit', w: 1 }); sfx('impact', { pal: 'fire', w: 0.6 }); }
    if (s === CHARGE && MV === 'quake' && (t === 0.6 || t === 1.2)) { sfx('boss', { k: 'dkCrown', w: t === 1.2 ? 0.6 : 0.35 }); const x = sx(L.nf.h[0]); burst(x, HY - 1, 10, 20, 70, 0.3, 0.6, FXI.earth, 10); }
    if (s === RECOVER && MV === 'roar' && t === 0.17) { landFx(); sfx('boss', { k: 'dkStomp', w: 1 }); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'dkDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.75) { burst(sx(L.nf.h[0]), HY - 1, 14, 20, 70, 0.3, 0.6, FXI.earth, 10); sfx('boss', { k: 'thud', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.05) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-30 + Math.random() * 100), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); burst(sx(80), HY - 4, 14, 30, 100, 0.3, 0.6, FXI.coin, 40); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'dkStomp', w: 1 }); sfx('boss', { k: 'dkCrown', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.8) sfx('boss', { k: 'dkCrumble', w: 1 });
    if (s === DEATH && t === INCOMING + 2.3) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + Math.random() * 100), HY - 4 - Math.random() * 24, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, FXI.earth); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.6, 1.2], [], [0.17], [], [INCOMING + 0.3, INCOMING + 0.75, INCOMING + 1.05, INCOMING + 1.8, INCOMING + 2.3], []];
  function stepFX(dt, state, stT) {
    crackT += dt; flameT += dt; smokeT += dt; const d = dirX();
    if (state === MOVE) {   // 每落一脚：尘土、闷响，前脚落地地面一颤
      const f = Math.floor(stT * 12) % 12; if (f !== lastStep) { lastStep = f; const hit = { 0: 'nh', 3: 'nf', 6: 'fh', 9: 'ff' }[f];
        if (hit) { const x = sx(L[hit].h[0]); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 26, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 });
          if (hit[1] === 'f') { sfx('boss', { k: 'dkStomp', w: 0.45 }); shake(0.08, 1); } } }
    }
    if (state === IDLE) {   // 待机：尾锤敲地、鼻孔喷尘
      const lp = stT % DUR[IDLE];
      if (idleLp < 1.7 && lp >= 1.7) { const c = L.tail[L.tail.length - 1]; burst(sx(c[0] - 2), HY - 1, 8, 15, 50, 0.3, 0.5, FXI.dust, 10); sfx('step', { w: 0.8 }); sfx('boss', { k: 'dkStomp', w: 0.3 }); }
      if (lp >= 1.8 && lp < 2.0 && smokeT > 0.08) { smokeT = 0; spawn(K_RISE, sx(L.nose[0]) + d, sy(L.nose[1]), d * 10, -6, 0.5, FXI.dust); }
      idleLp = lp;
      if (P.glint >= 0 && Math.random() < 0.15) spawn(K_EMBER, sx(L.crown[0] + (Math.random() - 0.5) * 12), sy(L.crown[1] + 2), 0, -6, 0.3, FXI.coin);
    }
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：碎石和金光从四周汇向前爪 / 嘴 / 冠
      const a = Math.random() * 6.2832, r = 14 + Math.random() * 16, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, MV === 'breath' ? FXI.fire : Math.random() < 0.6 ? FXI.earth : FXI.coin, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
      if (MV === 'quake' && Math.random() < 0.5) spawn(K_RISE, sx(-40 + Math.random() * 110), HY - 1, 0, -10 - Math.random() * 14, 0.5 + Math.random() * 0.4, FXI.earth);   // 地面在抖：碎石往上跳
      if (MV === 'breath' && Math.random() < 0.3) spawn(K_EMBER, sx(L.cry[0] + (Math.random() - 0.5) * 30), sy(L.cry[1] + 4), 0, -10, 0.4, FXI.holy);
    }
    if (state === CAST && MV === 'breath' && stT < 0.55) {   // 一条线的火：从嘴里往前冲
      const mx = sx(L.mouth[0] + 3), my = sy(L.mouth[1] + 1);
      for (let i = 0; i < 4; i++) { const a = 0.16 + (Math.random() - 0.5) * 0.22, v = 110 + Math.random() * 130; spawn(K_BURST, mx, my, d * Math.cos(a) * v, Math.sin(a) * v, 0.25 + Math.random() * 0.25, FXI.fire); }
      if (Math.random() < 0.3) spawn(K_EMBER, mx + d * (10 + Math.random() * 40), my + 2, d * 20, -18 - Math.random() * 14, 0.5, FXI.fire);
      if (flameT > 0.2) { flameT = 0; fx.beam(mx, my, mx + d * (50 + Math.random() * 10), my + 9 + Math.random() * 4, 3, 'fire', 0.2, 2); }
    }
    if (state === RECOVER && MV === 'breath' && smokeT > 0.1) { smokeT = 0; spawn(K_RISE, sx(L.mouth[0]), sy(L.mouth[1]) - 2, d * 4, -12, 0.7, FXI.steel); }
    if (state === HURT && P.flash && Math.random() < 0.8) burst(sx(L.chip[0]), sy(L.chip[1]), 6, 40, 100, 0.15, 0.3, FXI.earth, 20);   // 被打掉的石屑
    if (state === DEATH && stT > INCOMING + 1.8 && stT < INCOMING + 2.6 && Math.random() < 0.3) spawn(K_RISE, sx(-30 + Math.random() * 80), sy(-10 - Math.random() * 12), 0, -10 - Math.random() * 8, 0.8, FXI.earth);
    if (crackT < 1.3 && Math.random() < 0.45) { const x = sx(L.nf.h[0]) + (Math.random() - 0.5) * 60; spawn(K_EMBER, x, HY - 1, 0, -12 - Math.random() * 10, 0.3, Math.random() < 0.5 ? FXI.fire : FXI.coin); }   // 地裂还在冒金光
  }
  function fxReset() { crackT = 9; lastStep = -1; flameT = 0; idleLp = 0; smokeT = 0; }
  function fxBack(f12) {
    if (P.glow >= 2 || (MV === 'quake' && P.st === CAST)) { const x = sx(P.fx), w = P.glow >= 3 || P.st === CAST ? 14 : 8; for (let dx = -w; dx <= w; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FIRE[Math.abs(dx) < w / 2 ? 2 : 3]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'quake'; return MVDUR[MV]; }

  const VOICES = {
    dkRumble: (s, t, w, p) => { s.rumble(t, 1.8, 0.2 * w, { f: 90, pan: p }); s.riser(t, t + 1.7, 60, 300, 0.05 * w, { pan: p }); s.crackle(t + 0.3, 1.4, 900, 0.04 * w, { pan: p });
      for (let i = 0; i < 5; i++) s.thud(t + 0.3 * i, 60, 35, 0.2, 0.1 * w, { pan: p }); },                                                   // 地底下石头在磨
    dkQuake: (s, t, w, p) => { s.thud(t, 70, 28, 0.9, 0.4 * w, { pan: p }); s.rumble(t, 1.6, 0.28 * w, { f: 120, pan: p }); s.nz(t, 0.25, 'lowpass', 1200, 0.7, 0.2 * w, { src: 'brown', pan: p });
      s.crackle(t, 0.9, 1200, 0.08 * w, { pan: p }); s.timp(t, 33, 0.25 * w, { pan: p }); s.coins(t + 0.1, 8, 0.03 * w, { pan: p }); },   // 砸地：闷响、地裂、金币乱跳
    dkInhale: (s, t, w, p) => { s.nz(t, 1.0, 'bandpass', 400, 0.8, 0.08 * w, { to: 1400, a: 0.6, pan: p }); s.tone(t, 'sawtooth', 55, 1.0, 0.03 * w, { to: 75, lp: 400, pan: p }); s.rumble(t, 1.0, 0.08 * w, { f: 100, pan: p }); },
    dkBreath: (s, t, w, p) => { s.nz(t, 0.7, 'lowpass', 900, 0.7, 0.2 * w, { src: 'brown', a: 0.05, hold: 0.45, pan: p }); s.nz(t, 0.6, 'bandpass', 1800, 0.6, 0.07 * w, { a: 0.05, hold: 0.4, pan: p });
      s.crackle(t, 0.6, 2200, 0.05 * w, { pan: p }); s.whoosh(t, 0.4, 400, 2400, 0.12 * w, { pan: p }); s.tone(t, 'sawtooth', 70, 0.6, 0.04 * w, { to: 50, lp: 600, pan: p }); },
    dkSpit: (s, t, w, p) => { s.whoosh(t, 0.3, 300, 1800, 0.12 * w, { pan: p }); s.thud(t, 110, 50, 0.2, 0.2 * w, { pan: p }); s.nz(t, 0.25, 'lowpass', 900, 0.7, 0.1 * w, { src: 'brown', pan: p }); s.crackle(t, 0.3, 2000, 0.04 * w, { pan: p }); },
    dkRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 58, 1.3, 0.1 * w, { to: 40, vib: [6, 70, 0.15], lp: 700, pan: p, rev: 0.5 }); s.tone(t, 'square', 87, 1.1, 0.03 * w, { to: 55, lp: 450, pan: p });
      s.nz(t, 1.3, 'lowpass', 600, 0.8, 0.12 * w, { src: 'brown', pan: p }); s.rumble(t, 1.3, 0.22 * w, { f: 100, pan: p }); s.coins(t + 0.1, 10, 0.03 * w, { pan: p }); },
    dkCrown: (s, t, w, p) => { s.ring(t, 1250, 0.6, 0.05 * w, { pan: p }); s.ring(t + 0.12, 1480, 0.5, 0.04 * w, { pan: p }); s.ring(t + 0.3, 1100, 0.4, 0.03 * w, { pan: p }); s.coins(t + 0.05, 12, 0.04 * w, { pan: p }); },   // 冠和金子叮当响
    dkStomp: (s, t, w, p) => { s.thud(t, 60, 30, 0.3, 0.22 * w, { pan: p }); s.rumble(t, 0.4, 0.1 * w, { f: 80, pan: p }); s.coins(t + 0.02, 3, 0.012 * w, { pan: p }); },
    dkDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 2.0, 0.07 * w, { to: 28, vib: [4, 50, 0.3], lp: 500, pan: p, rev: 0.5 }); s.rumble(t + 0.2, 1.8, 0.15 * w, { f: 90, pan: p }); },
    dkCrumble: (s, t, w, p) => { s.crackle(t, 1.2, 700, 0.08 * w, { pan: p }); for (let i = 0; i < 6; i++) s.thud(t + i * 0.17, 90 - i * 6, 40, 0.15, 0.08 * w, { pan: p }); s.nz(t, 1.2, 'lowpass', 500, 0.7, 0.08 * w, { src: 'brown', a: 0.1, pan: p }); },   // 石化裂开
  };

  return {
    name: '地龙王', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [SEAM, CORE, FURN, EYE, SPARK, RUBY, EMER, SAPH], HIT_POINT: [6, -34], EVENTS, MAX_H: 86, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'stone', how: 'topple', pal: 'earth', style: 'meteor', w: 1 },
    MOVES: ['quake', 'breath', 'roar'], MOVE_NAMES: { quake: '大地震', breath: '龙息', roar: '怒气翻倍（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.3, 1.5, 1.75, 1.9]], [MOVE, [0, 1 / 12, 3 / 12, 4 / 12, 6 / 12, 7 / 12, 9 / 12, 10 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.4, 0.9, 1.3, 1.6], 'quake'], [CAST, [0, 1 / 12, 3 / 12], 'quake'], [RECOVER, [0.2, 0.5], 'quake'],
      [CHARGE, [0, 0.4, 0.7, 0.95], 'breath'], [CAST, [0, 1 / 12, 0.3], 'breath'], [RECOVER, [0.1, 0.3], 'breath'],
      [CHARGE, [0, 0.25, 0.45], 'roar'], [CAST, [0, 2 / 12], 'roar'], [RECOVER, [0.1, 0.3, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.6, 0.9, 1.1, 1.4, 1.8, 2.2, 2.5, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 128 });
