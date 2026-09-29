// 三头犬（小首领，地狱之门）：附录 G2「三个头的地狱犬」；被动 穿甲毒（咬中无视护甲）；三头齐咬（三个头轮流咬战斗力最高的：火烧、冰冻 1 秒、中毒）；地狱咆哮（身边一圈恐惧 1.5 秒）；半血 三头分咬。
// 剪影：又长又低的四足地狱犬（身高约 64 格），三个头在颈上扇形张开——远侧的头最高、朝右上仰，中间的头平视，近侧的头最低、往前探着龇牙。
//   炭黑的短毛，毛下透出岩浆橙的裂纹；三只眼、三张嘴都烧着岩浆光；每个头戴一只尖刺铁项圈，两只项圈下挂着断掉的铁链；背上一排炸起的硬毛；尾巴是一条活的黑鳞蛇，蛇头从背后探出来吐信子。
// 主色：炭黑（自带 11 级色阶，暗端近黑）+ 岩浆橙（裂纹、眼、嘴）；冷铁的项圈和链子；骨白的牙和爪。和狱卒（戴铁面罩的人形）、深渊魔王（红皮、翼、角）都不撞：它没有角、没有翼、没有人形，识别就是三个头。
// 招式（setMove）：tripleBite 三头齐咬（伏低、三个头往后仰、三张嘴各亮起火 / 冰 / 毒三色 → 近、中、远三个头依次扑咬）
// · hellRoar 地狱咆哮（低头吸气、胸口鼓起、裂纹越烧越亮 → 三个头一起朝前上方咆哮，冲击环和火浪往两边推开）· roar 三头分咬（半血：人立起来，三个头朝三个方向张开嘴怒吼）。
PCD.define('B_Cerberus', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_FALL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, R = Math.round;

  // ───── 材质 ─────
  const FURR = ['#040304', '#0a0708', '#110c0d', '#181112', '#201718', '#291d1d', '#332424', '#3e2c2a', '#4b3531', '#5a4039', '#6e4f45'];
  const IRONR = ['#030304', '#08090b', '#0f1114', '#16191d', '#1e2227', '#272c32', '#31373e', '#3c434b', '#4a5159', '#5b636b', '#7a8189'];
  const FUR = defDeep(FURR, { depth: 7, dark: 1 }), FURH = defDeep(FURR, { depth: 5 }), FURD = defDeep(FURR, { depth: 5, dark: 3 }), FURF = defDeep(FURR, { depth: 5, dark: 1 }), MANE = defDeep(FURR, { depth: 2, amb: 0.2 });
  const IRON = defDeep(IRONR, { depth: 3 }), IROND = defDeep(IRONR, { depth: 2, dark: 2 }), BONE = defDeep('ivory', { depth: 2, amb: 0.3 }), SNAKE = defDeep('obsidian', { depth: 3, dark: 1 });
  const CRK = defMat([44, 45, 46, 47], 1, 1), EYE = defMat([46, 47, 21, 21], 1, 1), SPARK = defMat([47, 47, 21, 21], 1, 1), TONG = defMat([44, 44, 45, 46], 1, 1);
  const MAWI = defMat([39, 40, 23, 22], 1, 1), MAWP = defMat([34, 48, 49, 50], 1, 1);
  const FIRE = FXR[FXI.fire];
  const hero = new Sprite(168, 124, 84, 114);
  const DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { tripleBite: { 3: 1.0, 4: 0.6, 5: 0.6 }, hellRoar: { 3: 0.9, 4: 0.5, 5: 0.6 }, roar: { 3: 0.6, 4: 0.5, 5: 0.8 } };
  let MV = 'tripleBite';
  const HX = 78;
  const LR = [[47, 46, 45], [22, 23, 40], [50, 49, 48]];   // 嘴里的光：火 / 冰 / 毒
  const LIGHT = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, r: 0, ramp: LR[0], k: 0.6 }));
  const RIM_R = [0, 10, 16, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FIRE, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  for (const m of [CRK, EYE, SPARK, TONG, MAWI, MAWP]) RIM.skip[m] = 1;

  // ───── 骨架（脚底 y = 0，面朝右）─────
  const ROOT = { nf: [13, -28], ff: [8, -28], nh: [-23, -31], fh: [-27, -31] };
  // 三个头：0 远侧（最高、朝右上仰）1 中间 2 近侧（最低、往前探）。颈根、头的位置（头骨中心）、头的朝向
  const HB = [{ root: [4, -42], pos: [-5, -55], a: -0.72, nr: [5.2, 4.4] }, { root: [12, -41], pos: [27, -51], a: -0.05, nr: [6, 4.8] }, { root: [16, -33], pos: [39, -34], a: 0.15, nr: [6.4, 5] }];
  // 潜行 8 帧（12 fps，一圈 2/3 秒）：对角两条腿一起迈
  const STEP = [[7, 0], [4, 0], [1, 0], [-2, 0], [-5, 0], [-4, 4], [1, 6], [5, 3]];
  const WBY = [1, 1, 0, -1, 1, 1, 0, -1];
  const TAIL_IDLE = [0, 1, 2, 1, 0, -1];
  const BITE_T = [5 / 12, 3 / 12, 0];   // 三头齐咬里每个头扑出去的时刻（近侧先咬）
  const BITE_V = [[14, 10, 0.5], [11, 8, 0.35], [10, 3, 0.25]];   // 每个头扑咬的位移和低头

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'sw', 'nfx', 'nfy', 'ffx', 'ffy', 'nhx', 'nhy', 'fhx', 'fhy', 'x0', 'y0', 'a0', 'j0', 'x1', 'y1', 'a1', 'j1', 'x2', 'y2', 'a2', 'j2',
    'ts', 'tl', 'tj', 'heat', 'glow', 'eyes', 'el', 'mb', 'ch', 'flash', 'dq', 'rim'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.sw = 0; P.nfx = 2; P.nfy = 0; P.ffx = -2; P.ffy = 0; P.nhx = 2; P.nhy = 0; P.fhx = -2; P.fhy = 0;
    for (let i = 0; i < 3; i++) { P['x' + i] = 0; P['y' + i] = 0; P['a' + i] = 0; P['j' + i] = 0.12; }
    P.ts = 0; P.tl = 0; P.tj = 0; P.heat = 3; P.glow = 1; P.eyes = 0; P.el = 0; P.mb = 0; P.ch = 0; P.flash = 0; P.dq = 0; P.rim = 0; P.mx = 0; P.flip = 0;
  }
  const walk = (f) => { f = ((f % 8) + 8) % 8; const a = STEP[f], b = STEP[(f + 4) % 8]; P.nfx = a[0]; P.nfy = a[1]; P.fhx = a[0] - 1; P.fhy = a[1]; P.ffx = b[0] - 1; P.ffy = b[1]; P.nhx = b[0]; P.nhy = b[1]; P.by = WBY[f];
    for (let i = 0; i < 3; i++) { P['y' + i] = 2 + (((f >> 1) + i) & 1); P['a' + i] = 0.08; } P.ts = [0, 1, 2, 1, 0, -1, -2, -1][f]; P.ch = (f & 2) ? 1 : -1; };
  const heads = (fn) => { for (let i = 0; i < 3; i++) fn(i); };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.sw = b; P.ts = TAIL_IDLE[Math.floor(tt / 0.4) % 6]; P.ch = P.ts > 0 ? 1 : 0;
      heads((i) => { P['y' + i] = ((Math.floor(TT * 2.5) + i) & 1) ? -1 : 0; });
      P.heat = (f12 % 7) === 0 ? 2 : 3;                                                                       // 裂纹忽明忽暗
      const lp = tt % DUR[IDLE]; if (lp >= 1.0 && lp < 2.2) { const k = Math.floor((lp - 1.0) * 12);            // 待机个性：三个头互相呲牙，最后蛇尾嘶一声
        P.a0 = [0.15, 0.3, 0.35, 0.3, 0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0][k] || 0; P.j0 = [0.3, 0.7, 0.9, 0.5, 0.2][k] || 0.12; P.x0 = k < 4 ? 2 : 0;
        P.a1 = k >= 3 && k < 8 ? -0.28 : 0; P.x1 = k >= 3 && k < 8 ? -2 : 0; P.j1 = [0, 0, 0, 0.4, 0.8, 0.9, 0.6, 0.3][k] || 0.12;
        P.a2 = k >= 6 && k < 11 ? 0.18 : 0; P.j2 = [0, 0, 0, 0, 0, 0, 0.3, 0.55, 0.55, 0.4, 0.2][k] || 0.12;
        P.eyes = k < 10 ? 2 : 0; P.glow = k >= 1 && k < 10 ? 2 : 1; P.mb = k >= 2 && k < 9 ? 1 : 0; P.tj = k >= 10 && k < 14 ? 1 : 0; P.tl = k >= 10 && k < 14 ? -3 : 0; }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 24, -1); P.mx = w.mx; P.flip = w.flip; P.heat = (f12 % 4) === 0 ? 2 : 3; }
    else if (st === ATTACK) {   // 普攻：近侧的头扑咬，出手那一帧大张嘴、嘴里亮起
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.x2 = -5 * q; P.y2 = -1 * q; P.a2 = -0.25 * q; P.j2 = 0.12 + 0.4 * q; P.bx = -2 * q; P.a1 = -0.1 * q; P.glow = 1; P.eyes = 2; }
      else if (tq < 0.25) { P.x2 = -6; P.y2 = -1; P.a2 = -0.3; P.j2 = 0.7; P.bx = -2; P.a1 = -0.12; P.glow = 2; P.rim = 1; P.eyes = 2; P.mb = 1; P.nfx = 3; }
      else if (tq < 0.42) { const shut = tq >= 0.33; P.pv = 1; P.pitch = 0.04; P.bx = 4; P.x2 = 9; P.y2 = 3; P.a2 = shut ? 0.28 : 0.18; P.j2 = shut ? 0.02 : 1; P.x1 = 3; P.j1 = 0.45; P.j0 = 0.35; P.a0 = 0.1;
        P.glow = 3; P.heat = 4; P.rim = 2; P.nfx = 7; P.ffx = 2; P.nhx = 4; P.ts = 2; P.eyes = 2; P.ch = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.pv = 1; P.pitch = 0.04 * (1 - q); P.bx = R(4 * (1 - q)); P.x2 = 9 * (1 - q); P.y2 = 3 * (1 - q); P.a2 = 0.28 * (1 - q); P.j2 = 0.12; P.nfx = 2 + 5 * (1 - q); P.glow = q < 0.5 ? 2 : 1; P.ts = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.pitch = -0.05; P.bx = -3; heads((i) => { P['x' + i] = -3; P['a' + i] = -0.25; P['j' + i] = i === 2 ? 0.7 : 0.4; }); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.ts = -2; P.heat = 4; P.nfy = 2; P.ch = -2; }
      else if (h < 0.35) { P.pitch = -0.02; P.bx = -1; heads((i) => { P['x' + i] = -1; P['a' + i] = -0.12; P['j' + i] = 0.3; }); P.eyes = 1; P.ts = -1; P.ch = -1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); heads((i) => { P['a' + i] = -0.12 * (1 - q); }); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { tripleBite: 0, hellRoar: 1, roar: 2 };
  // 三头齐咬：每个头在自己的时刻扑出去（第一帧张大嘴 = 伤害帧，下一帧合上），然后慢慢缩回
  function bitePose(i, u) {
    const v = BITE_V[i];
    if (u < 0) { P['x' + i] = -4; P['y' + i] = -2; P['a' + i] = i ? -0.3 : -0.12; P['j' + i] = 0.8; return; }
    const q = u < 2 / 12 ? 1 : 1 - ease.inOut(clamp01((u - 2 / 12) / 0.3));
    P['x' + i] = v[0] * q - 4 * (1 - q) * 0.3; P['y' + i] = v[1] * q; P['a' + i] = v[2] * q; P['j' + i] = u < 1 / 12 ? 1 : u < 2 / 12 ? 0.02 : 0.15;
  }
  function skillPose(st, tq, f12) {
    const k = f12 & 1;
    if (MV === 'tripleBite') {
      P.el = st === RECOVER ? 0 : 1;
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.45)), tr = tq > 0.5 ? k : 0;
        P.bx = -3 * q + tr; P.by = R(2 * q); P.nfx = 2 + 4 * q; P.ffx = -2 + 3 * q; P.nhx = 2 - q; P.mb = q > 0.5 ? 1 : 0;
        heads((i) => { P['x' + i] = -4 * q; P['y' + i] = -2 * q; P['a' + i] = (i ? -0.3 : -0.12) * q + (tr && i === 1 ? 0.04 : 0); P['j' + i] = 0.2 + 0.6 * q + (tr ? (i & 1 ? 0.1 : -0.1) : 0); });
        P.glow = tq < 0.3 ? 1 : 2 + k; P.rim = tq < 0.4 ? 1 : 2; P.heat = 4; P.eyes = 2; P.ts = 2; P.ch = tr ? 2 : -2;
      } else if (st === CAST) {
        P.pv = 1; P.pitch = 0.04; P.bx = 3; P.by = 1; P.nfx = 7; P.ffx = 3; P.nhx = 3; heads((i) => bitePose(i, tq - BITE_T[i]));
        P.glow = 3; P.heat = 4; P.rim = 2; P.eyes = 2; P.mb = 1; P.ts = 2; P.ch = 2;
      } else {
        const q = ease.inOut(clamp01(tq / 0.5)); P.pv = 1; P.pitch = 0.04 * (1 - q); P.bx = R(3 * (1 - q)); P.nfx = R(2 + 5 * (1 - q));
        heads((i) => { P['x' + i] = 3 * (1 - q); P['a' + i] = (i === 1 && tq > 0.15 && tq < 0.4 ? (k ? 0.12 : -0.12) : 0.1 * (1 - q)); P['j' + i] = q < 0.5 ? 0.3 : 0.12; });   // 中间的头甩一甩头
        P.glow = q < 0.5 ? 2 : 1; P.ts = q < 0.5 ? 1 : 0;
      }
    } else if (MV === 'hellRoar') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.5)), tr = tq > 0.5 ? k : 0;
        P.by = R(1 * q); P.sw = R(2 * q); P.nfx = 2 + 3 * q; P.ffx = -3; P.bx = -2 * q + tr; P.mb = q > 0.4 ? 2 : 1;
        heads((i) => { P['x' + i] = -3 * q; P['y' + i] = 3 * q; P['a' + i] = 0.35 * q; P['j' + i] = 0.12 + 0.2 * q; });   // 低头吸气
        P.heat = tq < 0.3 ? 3 : 4; P.glow = tq < 0.4 ? 1 : 2 + k; P.rim = tq < 0.5 ? 1 : 2; P.eyes = 2; P.ts = -1; P.tl = -2;
      } else if (st === CAST) {
        P.pv = 0; P.pitch = -0.08; P.sw = 2; P.nfx = 5; P.ffx = -3; P.mb = 2; P.ts = 2; P.tl = -4; P.tj = 1; P.ch = 2;
        heads((i) => { P['x' + i] = 3; P['y' + i] = -3; P['a' + i] = -0.35 + (i === 0 ? -0.1 : 0); P['j' + i] = 1; });
        P.glow = 3; P.heat = 4; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2;
      } else {
        const q = ease.inOut(clamp01(tq / 0.5)); P.pitch = -0.08 * (1 - q); P.sw = R(2 * (1 - q)); P.nfx = R(5 - 3 * q); P.mb = q < 0.5 ? 1 : 0;
        heads((i) => { P['x' + i] = 3 * (1 - q); P['y' + i] = -3 * (1 - q); P['a' + i] = -0.35 * (1 - q); P['j' + i] = 1 - 0.88 * q; });
        P.glow = q < 0.5 ? 2 : 1; P.heat = q < 0.6 ? 4 : 3;
      }
    } else {   // roar：半血的怒吼（三头分咬）——人立，三个头朝三个方向张嘴
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.4)); P.by = R(2 * q); P.bx = -2 * q; P.nfx = 4; heads((i) => { P['y' + i] = 2 * q; P['a' + i] = 0.25 * q; P['j' + i] = 0.3; });
        P.glow = 2; P.rim = 1; P.heat = 4; P.eyes = 2; P.mb = 1;
      } else if (st === CAST) {
        const up = ease.out(clamp01(tq / 0.17));
        P.pv = 0; P.pitch = -0.3 * up; P.nfy = R(13 * up); P.ffy = R(9 * up); P.nfx = 6; P.ffx = 3; P.nhx = 3; P.fhx = -1; P.bx = 2;
        P.x0 = -4; P.y0 = -3; P.a0 = -0.55 * up; P.x1 = 0; P.y1 = -2; P.a1 = -0.35 * up; P.x2 = 5; P.y2 = 0; P.a2 = 0.05; heads((i) => { P['j' + i] = 1; });
        P.glow = 3; P.heat = 4; P.rim = 3; P.eyes = 2; P.mb = 2; P.ts = 2; P.tl = -5; P.tj = 1; P.ch = 2;
      } else {
        const q1 = ease.in(clamp01(tq / 0.2)), q = ease.inOut(clamp01((tq - 0.25) / 0.5));
        P.pitch = -0.3 * (1 - q1); P.nfy = R(13 * (1 - q1)); P.ffy = R(9 * (1 - q1)); P.nfx = R(6 - 4 * q); P.by = q1 >= 1 && q < 0.3 ? 2 : 0;   // 前爪砸回地面
        P.x0 = -4 * (1 - q); P.a0 = -0.55 * (1 - q1 * 0.5) * (1 - q); P.a1 = -0.35 * (1 - q1 * 0.5) * (1 - q); P.x2 = 5 * (1 - q); heads((i) => { P['j' + i] = 1 - 0.88 * q; });
        P.glow = q < 0.6 ? 2 : 1; P.heat = 4; P.rim = q1 >= 1 && q < 0.2 ? 2 : 0; P.eyes = 2; P.mb = q < 0.5 ? 1 : 0;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { P.pitch = -0.05; P.bx = -3; heads((i) => { P['x' + i] = -3; P['a' + i] = -0.35; P['j' + i] = 0.9; }); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.ts = -2; P.heat = 4; P.nfy = 3; P.ch = -2; return; }
    const qh = ease.in(clamp01((d - 0.45) / 0.4)), qf = ease.in(clamp01((d - 0.95) / 0.3));
    P.pv = 1; P.pitch = -0.12 * qh * (1 - qf); P.by = R(5 * qh + 8 * qf); P.bx = R(-2 + 2 * qh);
    P.nfx = R(2 + 5 * qf); P.ffx = R(-2 + 6 * qf); P.nhx = R(2 - 3 * qh); P.fhx = R(-2 - 3 * qh);
    heads((i) => { const s = [0.35, 0.55, 0.75][i], qi = ease.in(clamp01((d - s) / 0.3));   // 远、中、近，一个接一个垂下
      P['x' + i] = -3 * (1 - qi) + 2 * qi; P['a' + i] = -0.35 * (1 - qi) + [0.9, 0.7, 0.45][i] * qi; P['y' + i] = [6, 7, 5][i] * qi + [3, 5, 4][i] * qf; P['j' + i] = 0.9 - 0.5 * qi; });
    P.eyes = d < 1.5 ? 1 : 3; P.ts = d < 1.55 ? -1 : 0; P.tl = R(clamp01((d - 1.55) / 0.3) * 24); P.tj = d > 1.3 && d < 1.5 ? 1 : 0; P.mb = 0;
    P.heat = d < 1.3 ? 3 : d < 1.7 ? (f12 & 1 ? 2 : 3) : d < 2.0 ? (f12 % 3 ? 1 : 2) : d < 2.2 ? 1 : 0; P.glow = d < 1.4 ? 1 : 0;
    if (d > 2.2) P.dq = Math.round(clamp01((d - 2.2) / 0.55) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：地狱咆哮是胸口，半血怒吼是中间的头，其余是近侧的嘴
  function focus() { geo(); const p = MV === 'hellRoar' && P.st >= CHARGE && P.st <= RECOVER ? L.core : MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER ? L.maw[1] : L.maw[2]; P.fx = p[0]; P.fy = p[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = { maw: [], hp: [], ha: [], nr: [], ne: [], nc: [], eye: [] };
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(P.pv ? 14 : -26, 0, P.pitch); }
  function headXf(i) { B.reset(); B.move(L.hp[i][0], L.hp[i][1]); B.rot(0, 0, L.ha[i]); }
  function jawXf(i) { headXf(i); B.rot(3, 2, P['j' + i] * 0.6); }
  function tailPts() {
    const s = P.ts, l = P.tl;
    const a = B.bez([-31, -37], [-44 - s, -35], [-46 - s, -47 + l * 0.4], 6), b = B.bez([-46 - s, -47 + l * 0.4], [-49 - s * 2, -60 + l], [-38 - s, -61 + l], 6);
    return a.concat(b.slice(1));
  }
  function geo() {
    bodyXf();
    for (const k of ['nf', 'ff', 'nh', 'fh']) {
      const r = B.at(ROOT[k][0], ROOT[k][1]), fore = k[1] === 'f', paw = [ROOT[k][0] + P[k + 'x'], -P[k + 'y']];
      if (fore) { const wr = [paw[0] - 1, paw[1] - 5], kn = B.ik(r, wr, 12, 12, 1); L[k] = { r, kn, w: wr, p: paw }; }
      else { const hk = [paw[0] - 4, paw[1] - 9], kn = B.ik(r, hk, 12, 11, -1); L[k] = { r, kn, w: hk, p: paw }; }
    }
    for (let i = 0; i < 3; i++) { const h = HB[i]; L.nr[i] = B.at(h.root[0], h.root[1]); L.hp[i] = B.at(h.pos[0] + P['x' + i], h.pos[1] + P['y' + i]); L.ha[i] = h.a + P['a' + i] + P.pitch; }
    L.core = B.at(10, -33); L.tail = tailPts().map((p) => B.at(p[0], p[1]));
    for (let i = 0; i < 3; i++) {
      headXf(i); L.maw[i] = B.at(10, 3.5); L.eye[i] = B.at(9, -3); L.ne[i] = B.at(-2, 1.5);
      const a = L.nr[i], e = L.ne[i]; L.nc[i] = [(a[0] + e[0]) / 2 - 3, (a[1] + e[1]) / 2 - 4];
    }
    B.reset();
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 裂纹：烧着是岩浆色，熄了是一道黑缝
  const crack = (pts) => { for (let i = 1; i < pts.length; i++) { if (P.heat > 0) B.ln(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], CRK, P.heat); else B.ln(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], FUR, 2); } };
  const mawMat = (i) => (P.el ? [MAWP, MAWI, CRK][i] : CRK);

  function drawLeg(k, far) {
    const g = L[k], m = far ? FURD : FUR, fore = k[1] === 'f';
    part();
    if (fore) { capW(g.r[0], g.r[1] - 2, g.kn[0], g.kn[1], far ? 5 : 5.8, 3.6, m); capW(g.kn[0], g.kn[1], g.w[0], g.w[1], 3.2, 2.4, m); capW(g.w[0], g.w[1], g.p[0], g.p[1] - 2, 2.4, 2.6, m); }
    else { capW(g.r[0], g.r[1] - 2, g.kn[0], g.kn[1], far ? 6.5 : 7.4, 4, m); capW(g.kn[0], g.kn[1], g.w[0], g.w[1], 3.6, 2.4, m); capW(g.w[0], g.w[1], g.p[0], g.p[1] - 2, 2.2, 2.4, m); dot(g.w[0], g.w[1], 2.4, m, far ? 4 : 6); }
    if (!far) {   // 肌肉沟、腿上的裂纹
      lnW((g.r[0] + g.kn[0]) / 2 + 2, (g.r[1] + g.kn[1]) / 2 - 3, g.kn[0] + 1, g.kn[1], m, 3);
      const c0 = [(g.r[0] * 2 + g.kn[0]) / 3, (g.r[1] * 2 + g.kn[1]) / 3];
      if (P.heat > 0) { lnW(c0[0] - 1, c0[1], c0[0] + 1, c0[1] + 3, CRK, P.heat); lnW(c0[0] + 1, c0[1] + 3, c0[0], c0[1] + 5, CRK, Math.max(1, P.heat - 1)); }
      lnW(g.kn[0] - 1, g.kn[1] + 1, g.w[0] - 1, g.w[1], m, 7);
    }
    part(); const hx = R(g.p[0]), hy = R(g.p[1]);                                                     // 爪掌 + 三只骨白的爪
    polyW([[hx - 4, hy - 3], [hx + 2, hy - 4], [hx + 5, hy - 2], [hx + 5, hy], [hx - 4, hy]], m); lnW(hx - 3, hy - 3, hx + 2, hy - 4, m, far ? 5 : 8); lnW(hx - 1, hy - 1, hx - 1, hy, m, 3); lnW(hx + 2, hy - 1, hx + 2, hy, m, 3);
    part(); for (let i = 0; i < 3; i++) lnW(hx + 4 - i * 3 + 1, hy - 1, hx + 6 - i * 3, hy, BONE, far ? 3 : 7 - i);
  }
  function drawTail() {
    const pts = L.tail, n = pts.length - 1;
    part(); B.reset(); B.strand(E, pts, 3.6, 1.8, SNAKE);
    for (let i = 1; i < n; i++) { const p = pts[i]; B.px(E, p[0], p[1] - 1, SNAKE, i & 1 ? 8 : 3); if (i > 1 && P.heat > 0 && (i & 1)) B.px(E, p[0] + 1, p[1] + 1, CRK, Math.max(1, P.heat - 1)); }   // 鳞片 + 腹下的岩浆纹
    const a = pts[n - 1], b = pts[n], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);                   // 蛇头
    part(); B.reset(); B.move(b[0], b[1]); B.rot(0, 0, ang);
    B.poly(E, [[-2, -2.4], [3, -2.2], [6, -0.6], [6, 0.8], [2, 2.2], [-2, 2]], SNAKE); B.ln(E, -1, -2, 4, -1.6, SNAKE, 8);
    B.px(E, 2, -1, P.eyes === 3 ? SNAKE : EYE, P.eyes === 3 ? 2 : 2);
    if (P.tj) { B.ln(E, 6, 0.5, 9, 0.5, TONG, 3); B.px(E, 10, -0.5, TONG, 3); B.px(E, 10, 1.5, TONG, 3); B.px(E, 4, 1.5, BONE, 8); }
  }
  function drawBody() {
    part(); bodyXf();
    B.ell(E, -24, -32, 10, 10.5, 0.1, FUR); B.ell(E, -8, -33, 14, 8.5, 0, FUR); B.ell(E, 9, -32, 12 + P.sw * 0.5, 12.5 + P.sw * 0.5, -0.15, FUR); B.ell(E, 12, -40, 9, 6, -0.4, FUR);
    B.ell(E, -8, -25.5, 9, 1.8, 0, FUR, 3);                                                            // 收起来的腹
    B.ln(E, 3, -42, 7, -30, FUR, 3); B.ln(E, -19, -40, -16, -27, FUR, 3); B.ln(E, -30, -36, -28, -27, FUR, 4);   // 肩胛、大腿的肌肉沟
    for (const x of [-11, -7, -3]) B.ln(E, x, -35, x + 1, -29, FUR, 4);                                // 肋
    B.ln(E, -31, -40, -19, -42.5, FUR, 7); B.ln(E, -13, -41, 0, -41.5, FUR, 7); B.ln(E, 4, -45, 12, -46, FUR, 7);   // 背脊高光
    crack([[6, -39], [8, -35], [7, -31], [10, -27], [9, -23]]); crack([[8, -35], [12, -34]]); crack([[-5, -37], [-3, -33], [-6, -29]]);
    crack([[-26, -39], [-23, -35], [-25, -31], [-22, -27]]); crack([[-23, -35], [-19, -34]]); crack([[15, -37], [17, -33], [16, -29]]);
    part(); bodyXf(); const up = P.mb;                                                                  // 背上一排炸起的硬毛
    for (const [x, y, h] of [[-32, -39, 3], [-27, -42, 4], [-21, -43, 4], [-15, -42, 3], [-9, -41, 3], [-3, -42, 4], [3, -44, 5], [9, -46, 5]]) {
      B.poly(E, [[x - 1, y + 1.5], [x - 3, y - h - up], [x + 2.5, y + 1.5]], MANE); B.px(E, x - 2, y - h - up + 1, MANE, 7); }
    part(); bodyXf(); for (const [x, y] of [[18, -25], [14, -22], [10, -20], [6, -21]]) B.poly(E, [[x - 2, y - 2], [x + 1, y + 3], [x + 2, y - 2]], MANE);   // 胸前垂下的乱毛
  }
  function drawNeck(i) {
    const far = i === 0, m = far ? FURD : FUR, h = HB[i], pts = B.bez(L.nr[i], L.nc[i], L.ne[i], 6);
    part(); B.reset(); B.strand(E, pts, h.nr[0], h.nr[1], m);
    for (let j = 1; j < 6; j++) { const p = pts[j], q = pts[j + 1] || p, dx = q[0] - p[0], dy = q[1] - p[1], dl = Math.hypot(dx, dy) || 1, r = h.nr[0] + (h.nr[1] - h.nr[0]) * j / 6;   // 颈上方的硬毛
      const nx = dy / dl, ny = -dx / dl, s = ny > 0 ? -1 : 1; B.poly(E, [[p[0] + nx * s * (r - 1) - dx / dl * 1.5, p[1] + ny * s * (r - 1) - dy / dl * 1.5], [p[0] + nx * s * (r + 3 + P.mb) - dx / dl * 2.5, p[1] + ny * s * (r + 3 + P.mb) - dy / dl * 2.5], [p[0] + nx * s * (r - 1) + dx / dl * 1.5, p[1] + ny * s * (r - 1) + dy / dl * 1.5]], MANE, far ? 3 : 5); }
    if (!far && P.heat > 0) { const p = pts[2], q = pts[4]; lnW(p[0], p[1] + 1, (p[0] + q[0]) / 2 + 1, (p[1] + q[1]) / 2 + 2, CRK, Math.max(1, P.heat - 1)); }
    // 尖刺铁项圈（靠近头的那一截）
    const c = pts[4], d = pts[5], dx = d[0] - c[0], dy = d[1] - c[1], dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux, r = h.nr[1] + 1.2, IM = far ? IROND : IRON;
    part(); capW(c[0] + nx * r, c[1] + ny * r, c[0] - nx * r, c[1] - ny * r, 1.9, 1.9, IM); lnW(c[0] + nx * r - ux, c[1] + ny * r - uy, c[0] - nx * r - ux, c[1] - ny * r - uy, IM, far ? 5 : 8);
    part(); for (const s of [1, -1]) polyW([[c[0] + nx * s * r - ux * 1.2, c[1] + ny * s * r - uy * 1.2], [c[0] + nx * s * (r + 4), c[1] + ny * s * (r + 4)], [c[0] + nx * s * r + ux * 1.2, c[1] + ny * s * r + uy * 1.2]], IM);
    for (const s of [0.45, -0.1, -0.6]) { px(c[0] + nx * r * s, c[1] + ny * r * s, IM, far ? 6 : 9); px(c[0] + nx * r * s + ux, c[1] + ny * r * s + uy, IM, 2); }   // 正面的铆钉尖
    if (!far) {   // 断掉的铁链挂在项圈下面，随动作甩
      const bot = ny > 0 ? 1 : -1, s0 = [c[0] - nx * r * bot, c[1] - ny * r * bot + 1]; let x = s0[0], y = s0[1];
      part(); for (let j = 0; j < (i === 2 ? 3 : 2); j++) { const sx_ = x - P.ch * 0.6 * (j + 1) * 0.5, sy_ = y + 3; const vert = (j & 1) === 0;
        if (vert) { lnW(sx_ - 1, y + 1, sx_ - 1, sy_ - 1, IRON, 7); lnW(sx_ + 1, y + 1, sx_ + 1, sy_ - 1, IRON, 4); px(sx_, y, IRON, 8); px(sx_, sy_, IRON, 3); }
        else { lnW(sx_, y, sx_, sy_, IRON, 6); px(sx_ - 1, y + 1, IRON, 3); }
        x = sx_; y = sy_; }
      px(x + 1, y + 1, IRON, 7); px(x - 1, y + 1, IRON, 7);   // 最后一节是断开的
    }
  }
  function drawHead(i) {
    const far = i === 0, m = far ? FURF : FURH, j = P['j' + i], open = j > 0.06;
    part(); headXf(i);                                                                                   // 朝后的尖耳（一只有缺口）
    const ep = P.eyes === 1 || P.st === DEATH ? 3 : 0;   // 受击 / 死亡时耳朵往后贴
    B.poly(E, [[-3, -4], [-5 - ep, -13 + ep], [-3 - ep, -13 + ep], [2, -5]], m); B.ln(E, -3, -6, -4 - ep, -11 + ep, m, 2); if (i === 1) B.px(E, -3 - ep, -12 + ep, m, 10);
    B.poly(E, [[0, -5], [1 - ep, -12 + ep], [4, -5]], m, 6); B.ln(E, 1, -6, 1 - ep, -10 + ep, m, 3);
    if (P.heat > 0 && !far) B.ln(E, 1, -7, 1 - ep, -10 + ep, CRK, Math.max(1, P.heat - 2));
    part(); headXf(i);
    B.ell(E, 2, -1, 7, 6.2, 0, m); B.ell(E, 4, 2.5, 5.5, 3.6, 0, m); B.poly(E, [[5, -5], [12, -4.5], [16, -3.2], [18.4, -2], [18.4, 1], [15, 2], [7, 2.5]], m);
    B.ln(E, 4, -6.5, 11, -5, m, 8); B.ln(E, 5, -4.6, 11, -3.8, m, 2); B.ln(E, 12, -4, 16, -2.6, m, 7);   // 重眉骨、鼻梁高光
    B.ln(E, 11, -3.5, 12.5, -1.5, m, 3); B.ln(E, 13.5, -3.2, 14.5, -1.4, m, 3);                          // 龇牙时鼻梁上的皱
    B.px(E, 18, -2, m, 10); B.px(E, 17, -2, m, 10); B.px(E, 18, -1, m, 2);                               // 鼻头
    B.ln(E, -2, 3, 3, 5, m, 3); B.ln(E, -4, -2, -1, 3, m, 3);                                            // 颌角
    if (P.eyes === 1) B.ln(E, 7, -3, 10, -3, m, 10);
    else if (P.eyes === 3) { B.px(E, 8, -3, m, 10); B.px(E, 9, -3, m, 10); }
    else { B.ln(E, 7, -2, 10, -2, m, 10); B.px(E, 7, -3, m, 10); B.px(E, 8, -3, EYE, 2); B.px(E, 9, -3, EYE, P.eyes === 2 ? 3 : 2); B.px(E, 10, -3, EYE, 1); if (P.eyes === 2) { B.px(E, 11, -4, EYE, 1); if (!far) B.px(E, 9, -4, EYE, 2); } }
    crack([[0, -5], [1, -2.5], [-1, 0]]); if (!far) crack([[3, 1], [5, 3]]);
    if (open) {                                                                                          // 张开的嘴：喉咙里烧着光
      const a = j * 0.6, tip = [3 + 12.5 * Math.cos(a), 2 + 12.5 * Math.sin(a)], mm = mawMat(i), hot = P.glow >= 2 ? 1 : 0;
      part(); B.poly(E, [[3, 1.5], [15, 2], [tip[0], tip[1]], [3, 4.5]], mm, 1 + hot); B.poly(E, [[3, 2], [9, 2.4], [3, 4]], mm, 3 + hot);   // 外面暗红，喉咙最亮
      if (j > 0.4) B.ln(E, 5, 3.5, 3 + 8 * Math.cos(a), 2 + 8 * Math.sin(a) - 0.5, TONG, 2);
    }
    part(); headXf(i); for (const [x, l] of [[8, 2], [11, 1.5], [15, 2.6]]) B.poly(E, [[x - 0.8, 1.6], [x + 0.2, 1.6 + l + (open ? 0.8 : 0)], [x + 0.8, 1.6]], BONE, far ? 3 : 6);   // 上獠牙
    part(); jawXf(i);
    B.poly(E, [[2, 2], [16, 2.2], [16.5, 3.4], [13, 5], [5, 6.5], [1, 4.5]], m); B.ln(E, 5, 5.4, 13, 4.2, m, 3);
    if (open) { for (const [x, l] of [[9, 1.8], [14, 2.2]]) B.poly(E, [[x - 0.8, 2.4], [x, 2.4 - l], [x + 0.8, 2.4]], BONE, far ? 3 : 7); } else B.px(E, 14, 2, BONE, 8);
    if (open && j > 0.5 && P.el && !far) { const mm = mawMat(i); B.px(E, 12, 5.6, mm, 3); B.px(E, 12, 6.6, mm, 2); }   // 往下滴的火 / 冰 / 毒涎
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawTail(); drawLeg('fh', 1); drawLeg('ff', 1);
    drawNeck(0); drawHead(0);
    drawBody(); drawNeck(1); drawHead(1);
    drawLeg('nh', 0); drawLeg('nf', 0);
    drawNeck(2); drawHead(2);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let any = 0;
    for (let i = 0; i < 3; i++) { const Lt = LIGHT[i], j = P['j' + i]; Lt.x = L.maw[i][0] * z + spr.ox; Lt.y = L.maw[i][1] * z + spr.oy; Lt.ramp = P.el ? LR[2 - i] : LR[0];
      Lt.k = 0.45; Lt.r = P.glow >= 2 && j > 0.3 ? (3 + P.glow + j * 3) * z : 0; if (Lt.r) any = 1; }
    const C = LIGHT[3]; C.x = L.core[0] * z + spr.ox; C.y = L.core[1] * z + spr.oy; C.ramp = LR[0]; C.k = 0.5; C.r = MV === 'hellRoar' && P.st >= CHARGE && P.st <= RECOVER && P.glow >= 2 ? 16 * z : 0; if (C.r) any = 1;
    RIM.lights = any ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（人立、三个头朝三个方向张嘴），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  const headAt = () => { headXf(1); const c = B.at(6, -1); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; };
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }
  function headShot() { const mv = MV; MV = 'tripleBite'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.glow = 2; P.rim = 1; P.j1 = 0.35; focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }   // 头像：中间的头龇着牙、眼里亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (v) => scrX(v), sy = (v) => HY + v;
  const EL = ['poison', 'frost', 'fire'];   // 远 / 中 / 近三个头在三头齐咬里的元素
  let crackT = 9, lastStep = -1, lastBite = -1;
  function biteFx(i) {
    const p = L.maw[i], x = sx(p[0] + 4), y = sy(p[1] + 2), el = FXI[EL[i]];
    fx.slash(x - 6, y, 10, 0.3, 2.9, EL[i], 0.18, 2, 2); fx.slash(x - 6, y + 2, 10, 3.5, 6.0, EL[i], 0.18, 2, 2);   // 上下两排牙印
    burst(x, y, 16, 40, 120, 0.2, 0.5, el, 20); fx.cross(x + 3, y, 6, EL[i], 0.16); hitDummy(1, 1);
    if (i === 2) { shake(0.35, 3); flash(0.08); } else shake(0.2, 2);
    sfx('boss', { k: 'cbSnap', w: 1 }); sfx('impact', { pal: EL[i], w: 0.8 }); sfx('hit', { w: 0.8 });
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'tripleBite') { biteFx(2); lastBite = 2; }
      else if (MV === 'hellRoar') {
        const x = sx(L.maw[1][0]), y = sy(L.maw[1][1]), gx = sx(10);
        ring(gx, HY - 2, 1, FXI.fire); ring(gx, HY - 2, 1, FXI.shadow); fx.wave(gx + 20, HY, 1, 60, 10, 'fire', 0.6, 2); fx.wave(gx - 30, HY, -1, 50, 8, 'fire', 0.6, 2);
        fx.crack(gx, HY, 20, 1, 'fire', 1.2); fx.crack(gx - 10, HY, 16, -1, 'fire', 1.2);
        for (let i = 0; i < 3; i++) { const p = L.maw[i]; burst(sx(p[0]), sy(p[1]), 14, 50, 150, 0.3, 0.6, FXI.fire, 10); }
        burst(x, y, 20, 40, 120, 0.4, 0.8, FXI.shadow, 0); flash(0.1); shake(0.35, 3); crackT = 0; hitDummy(1, 1);
        sfx('boss', { k: 'cbHowl', w: 0.8 }); sfx('boss', { k: 'roar', w: 0.7 }); sfx('impact', { pal: 'fire', w: 0.9 });
      } else {
        for (let i = 0; i < 3; i++) { const p = L.maw[i], x = sx(p[0]), y = sy(p[1]); ring(x, y, 1, i === 1 ? FXI.fire : FXI.shadow); burst(x, y, 16, 50, 150, 0.3, 0.7, FXI.fire, 10);
          const a = L.ha[i] + 0.2; fx.beam(x, y, x + Math.cos(a) * 26, y + Math.sin(a) * 26, 2, 'fire', 0.35, 2); }
        flash(0.12); shake(0.4, 3); sfx('boss', { k: 'cbHowl', w: 1 }); sfx('boss', { k: 'roar', w: 1 }); sfx('impact', { pal: 'fire', w: 1 });
      }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { lastStep = -1; if (MV === 'tripleBite') sfx('boss', { k: 'cbSnarl', w: 0.9 }); else if (MV === 'hellRoar') sfx('boss', { k: 'growl', w: 1 }); else sfx('boss', { k: 'cbSnarl', w: 1 }); }
    if (s === RECOVER && MV === 'roar') { const x = sx(L.nf.p[0]); fx.crack(x, HY, 18, 1, 'fire', 1.1); fx.crack(x - 6, HY, 14, -1, 'fire', 1.1); burst(x, HY - 1, 20, 30, 110, 0.3, 0.7, FXI.dust, 16); crackT = 0; }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) { const p = L.maw[2], x = sx(p[0] + 4), y = sy(p[1] + 2);
      fx.slash(x - 6, y, 10, 0.3, 2.9, 'fire', 0.16, 2, 2); fx.slash(x - 6, y + 2, 10, 3.5, 6.0, 'fire', 0.16, 2, 2); burst(x, y, 14, 40, 120, 0.2, 0.45, FXI.fire, 20);
      hitDummy(1, 1); shake(0.15, 2); sfx('boss', { k: 'cbSnap', w: 0.9 }); sfx('hit', { w: 0.9 }); }
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === CAST && MV === 'tripleBite') { for (const i of [1, 0]) if (t === BITE_T[i] && lastBite !== i) { biteFx(i); lastBite = i; } }
    if (s === RECOVER && MV === 'roar' && t === 2 / 12) { shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); }
    if (s === IDLE && t === 1.0) sfx('boss', { k: 'cbSnarl', w: 0.4 });
    if (s === IDLE && t === 1.9) sfx('boss', { k: 'cbHiss', w: 0.5 });
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'cbYelp', w: 0.7 });
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'cbDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.85) { sfx('fall', { w: 0.7 }); burst(sx(-24), HY - 2, 8, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 1.25) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-36 + Math.random() * 80), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.25, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.4) sfx('boss', { k: 'cbHiss', w: 0.4 });
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 34; i++) spawn(K_RISE, sx(-36 + Math.random() * 80), HY - 4 - Math.random() * 30, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, FXI.fire); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[1.0, 1.9], [], [0.08, T_STRIKE], [], [3 / 12, 5 / 12], [2 / 12], [INCOMING], [INCOMING + 0.05, INCOMING + 0.85, INCOMING + 1.25, INCOMING + 1.4, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    crackT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastStep) { lastStep = f; const hit = { 2: ['nf', 'fh'], 6: ['ff', 'nh'] }[f];
        if (hit) { for (const k of hit) { const x = sx(L[k].p[0]); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20 + (P.flip ? 10 : -10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
          if (Math.random() < 0.5) spawn(K_EMBER, x, HY - 1, (Math.random() - 0.5) * 16, -16 - Math.random() * 12, 0.3, FXI.fire); } sfx('step', { w: 0.9 }); } }
    }
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：光汇向嘴 / 胸口
      if (MV === 'tripleBite') { const i = (Math.random() * 3) | 0, p = L.maw[i], gx = sx(p[0]), gy = sy(p[1]), a = Math.random() * 6.2832, r = 12 + Math.random() * 12;
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, FXI[EL[i]], { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
        if (Math.random() < 0.3) spawn(K_FALL, gx, gy + 2, 0, 10, 0.5, FXI[EL[i]]); }                  // 三张嘴往下滴
      else { const gx = sx(P.fx), gy = sy(P.fy), a = Math.random() * 6.2832, r = 18 + Math.random() * 14;
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, MV === 'hellRoar' && Math.random() < 0.35 ? FXI.shadow : FXI.fire, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 }); }
    }
    if ((state === CAST || state === RECOVER) && MV !== 'tripleBite' && P.glow >= 2 && Math.random() < 0.6) { const i = (Math.random() * 3) | 0, p = L.maw[i], a = L.ha[i] + (Math.random() - 0.5) * 0.5;   // 三张嘴喷出的火星
      spawn(K_BURST, sx(p[0]), sy(p[1]), Math.cos(a) * 90, Math.sin(a) * 90 - 20, 0.3, FXI.fire); }
    if ((state === IDLE || state === MOVE) && P.heat >= 3 && Math.random() < 0.18) { const p = L.maw[(Math.random() * 3) | 0]; spawn(K_EMBER, sx(p[0] + (Math.random() - 0.5) * 6), sy(p[1]), (Math.random() - 0.5) * 8, -12, 0.35, FXI.fire); }   // 嘴角冒的火星
    if (crackT < 1.2 && Math.random() < 0.4) { const x = sx(10) + (Math.random() - 0.5) * 50; spawn(K_EMBER, x, HY - 1, 0, -12 - Math.random() * 10, 0.3, FXI.fire); }   // 地上的裂纹还在冒火
  }
  function fxReset() { crackT = 9; lastStep = -1; lastBite = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, FIRE[Math.abs(dx) < 5 ? 2 : 4]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'tripleBite'; lastBite = -1; return MVDUR[MV]; }

  // 自己的声音：三个头的低吼叠在一起、咬合的一声、三声错开的嚎、蛇尾的嘶
  const VOICES = {
    cbSnarl: (s, t, w, p) => { for (const [f, d] of [[68, 0], [82, 0.05], [97, 0.1]]) s.tone(t + d, 'sawtooth', f, 0.7, 0.035 + 0.025 * w, { to: f * 0.85, vib: [11 + d * 20, 50, 0.05], lp: 520, pan: p }); s.rumble(t, 0.7, 0.08 * w, { f: 150, pan: p }); },
    cbSnap: (s, t, w, p) => { s.nz(t, 0.05, 'bandpass', 2400, 2, 0.12 * w, { pan: p }); s.thud(t, 190, 55, 0.14, 0.2 * w, { pan: p }); s.tone(t, 'square', 720, 0.03, 0.03 * w, { to: 300, pan: p }); s.tone(t + 0.02, 'sawtooth', 120, 0.22, 0.04 * w, { to: 80, lp: 600, pan: p }); },
    cbHowl: (s, t, w, p) => { for (const [f, d] of [[196, 0], [247, 0.12], [165, 0.24]]) { s.tone(t + d, 'sawtooth', f * 0.8, 1.1, 0.03 + 0.025 * w, { to: f * 1.25, vib: [6, 40, 0.3], lp: 1300, pan: p, rev: 0.5 }); s.tone(t + d + 0.55, 'sawtooth', f * 1.25, 0.6, 0.02 * w, { to: f * 0.7, lp: 1000, pan: p, rev: 0.5 }); }
      s.rumble(t, 1.3, 0.14 * w, { f: 140, pan: p }); s.nz(t, 1.0, 'bandpass', 600, 1.2, 0.05 * w, { to: 300, pan: p }); },
    cbHiss: (s, t, w, p) => { s.nz(t, 0.45, 'highpass', 4500, 0.7, 0.06 * w, { a: 0.05, pan: p }); s.nz(t + 0.05, 0.3, 'bandpass', 7000, 2, 0.03 * w, { pan: p }); },
    cbYelp: (s, t, w, p) => { s.tone(t, 'sawtooth', 420, 0.16, 0.04 * w, { to: 260, lp: 1400, pan: p }); s.tone(t + 0.03, 'sawtooth', 330, 0.14, 0.03 * w, { to: 200, lp: 1100, pan: p }); },
    cbDie: (s, t, w, p) => { for (const [f, d] of [[300, 0], [250, 0.35], [210, 0.7]]) s.tone(t + d, 'sawtooth', f, 0.7, 0.035 * w, { to: f * 0.5, vib: [5, 30, 0.2], lp: 900, pan: p, rev: 0.5 }); s.rumble(t + 0.9, 0.8, 0.1 * w, { f: 120, pan: p }); },
  };

  return {
    name: '三头犬', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [CRK, EYE, SPARK, TONG, MAWI, MAWP], HIT_POINT: [6, -38], EVENTS, MAX_H: 88, OWN_MAX: 40, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'fire', style: 'fire', w: 1 },
    MOVES: ['tripleBite', 'hellRoar', 'roar'], MOVE_NAMES: { tripleBite: '三头齐咬', hellRoar: '地狱咆哮', roar: '三头分咬（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.1, 1.35, 1.6, 2.0]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 6 / 12]],
      [CHARGE, [0, 0.25, 0.5, 0.75], 'tripleBite'], [CAST, [0, 1 / 12, 3 / 12, 5 / 12, 6 / 12], 'tripleBite'], [RECOVER, [0.17, 0.42], 'tripleBite'],
      [CHARGE, [0, 0.3, 0.6], 'hellRoar'], [CAST, [0, 2 / 12], 'hellRoar'], [RECOVER, [0.25], 'hellRoar'],
      [CHARGE, [0.3], 'roar'], [CAST, [0, 2 / 12, 4 / 12], 'roar'], [RECOVER, [0.08, 0.25, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.6, 0.9, 1.1, 1.3, 1.6, 2.0, 2.4, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
