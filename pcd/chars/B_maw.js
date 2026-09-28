// 深海巨口（最终首领，第四章「沉没港口」的海底）：照 pcd/run/boss-standard.md §8 做，结构抄 B_demon.js。
// 依据：附录 G「深海巨口（整个身体是一张嘴、头上的灯、触手）· 深海」「港口下面还有一座城，城门是一张嘴」；
// K('FB_maw')：吞噬 swallow（吞下最前面的一个，打它 8% 生命才吐出来）、触手横扫 tentSweep（扇形，打先锋 / 守护者只有一半）→ 深海之声（吞噬冷却减半）。
// 设定卡 ——
//   剪影：从海底升起的一颗巨大的鮟鱇头（原点 = 海底 / 水面），整个剪影就是一张张开的嘴：下颌往前翘出（地包天），上下两排细长的针牙交错，
//         嘴里是黑的喉咙和暗红的牙龈；额头上一根弯到嘴前的钓竿，末端吊着一盏青白色的灯（识别点：大嘴 + 嘴前那盏灯）。
//         两只很小的乳白色眼睛；背上一排带破膜的背鳍棘，身后两根往上卷的触手，身前两条带吸盘的大触手当手用；侧面一排排蓝青的发光斑点。
//         和溺亡船长（三角帽、军大衣、船锚，人形）、魔王（角、蝠翼）都不撞：不是人形，没有帽子和翅膀。
//   主色：深渊蓝黑的皮（压得很暗）、蓝灰的下巴和喉咙、暗青的鳍、象牙色的针牙、暗红的牙龈、紫红的吸盘；光：灯（青白）、发光斑点（蓝青）、第二阶段喉咙深处的光。
//   招式（setMove）：swallow 吞噬 · tentSweep 触手横扫 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 斑点、侧线、喉咙常亮。
//     吞噬：头往后仰、嘴张到最大，钓竿弯下来把灯吊在嘴前当饵，两条触手张开，水流被吸进嘴里（越吸越快、身子发颤）→ 往前一扑、啪地合上（嘴两侧喷起水柱）
//           → 收招：喉咙里一个鼓包往下滑、眯眼。
//     触手横扫：近侧的触手高高卷到身后、吸盘一个个亮起、水往下滴 → 贴着水面往前横扫（一道水浪、沿途三根水柱）。
//     重击：往后仰、张嘴 → 往前一口咬下去。普攻：小口一咬。
//     升起：先是灯在水下亮起来、从水面冒出来，接着整颗头顺着触手爬出海面 → 张嘴吼出深海之声（一圈圈声波、四根水柱）。
//     第二阶段：合嘴、触手抱在身前，灯和斑点两下心跳一样闪 → 张嘴长吼，全身的斑点、侧线和喉咙深处一起亮起来。
//   待机个性：把灯慢慢垂到嘴前晃一晃 → 啪地合一下嘴；鳃一开一合冒泡，灯一闪一闪。
//   死亡：张嘴哀嚎、灯乱闪 → 灯熄灭、钓竿垂下来、嘴松开 → 整颗头沉回海底，冒一串气泡。
PCD.define('B_maw', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：主体压得很暗，灯和斑点才亮得出来 ─────
  // 色板有上限：下巴用 stormcoat、牙用 ivory、牙龈用 hellhide、喉咙用 obsidian、吸盘用 membrane；自己的只有深渊皮、鳍和光
  const R_SKIN = ['#020308', '#05080f', '#080d19', '#0c1324', '#101a30', '#15223c', '#1b2b4a', '#233658', '#2d4368', '#3a527a', '#4a648e'];   // 深渊蓝黑
  const R_FIN = ['#03060a', '#071018', '#0a1a24', '#0e2430', '#132f3c', '#193b48', '#204854', '#285662', '#326672', '#3e7884', '#4c8c96'];    // 暗青的鳍
  const SKIN = defDeep(R_SKIN, { depth: 10, dark: 1, amb: 0.08 }), SKIND = defDeep(R_SKIN, { depth: 5, dark: 3, amb: 0.06 });
  const BELLY = defDeep('stormcoat', { depth: 7, dark: 4, amb: 0.08 });
  const R_TOOTH = ['#0c0c10', '#1c1c24', '#302f38', '#46444c', '#5e5a60', '#787276', '#928c8c', '#aea6a2', '#c8c0b8', '#e0dad0', '#f6f2ea'];   // 半透明的针牙
  const TENT = defDeep('membrane', { depth: 6, dark: 3, amb: 0.08 }), TENTD = defDeep('membrane', { depth: 4, dark: 5, amb: 0.06 });   // 暗紫的触手
  const FIN = defDeep(R_FIN, { depth: 3, amb: 0.18 }), FIND = defDeep(R_FIN, { depth: 3, dark: 2, amb: 0.1 });
  const TOOTH = defDeep(R_TOOTH, { depth: 2, amb: 0.4 }), TOOTHD = defDeep(R_TOOTH, { depth: 2, dark: 3, amb: 0.16 }), BONE = defDeep('ivory', { depth: 2, dark: 3, amb: 0.12 });
  const GUM = defDeep('hellhide', { depth: 3, dark: 3, amb: 0.1 }), VOID = defDeep('obsidian', { depth: 6, dark: 4, amb: 0.04 });
  const SUCK = defDeep(R_TOOTH, { depth: 2, dark: 2, amb: 0.3 }), SUCKD = defDeep(R_TOOTH, { depth: 2, dark: 5, amb: 0.14 });
  const GL1 = defMat(ramp(['#06202c', '#0c4a60', '#1c8cae', '#46cce8']), 1, 1), GL2 = defMat(ramp(['#0c4a60', '#1c8cae', '#6ae4f8', '#c8fbff']), 1, 1), GL3 = defMat(ramp(['#1c8cae', '#6ae4f8', '#e0feff', '#ffffff']), 1, 1);
  const EYE = defMat(ramp(['#2a3440', '#7a8a96', '#bcc8cc', '#e8f0ee']), 1, 1);   // 乳白的小眼睛
  const FXL = fxRamp('mawLure', ['#ffffff', '#c8fbff', '#6ae4f8', '#1c8cae', '#0c4a60']);   // 灯和发光斑点的粒子：白 → 青 → 暗
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { swallow: { 3: 1.2, 4: 0.5, 5: 0.8 }, tentSweep: { 3: 1.4, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'swallow', HOT = 0;   // HOT：第二阶段，斑点、侧线和喉咙常亮
  const LURE = ramp(['#e0feff', '#6ae4f8', '#1c8cae']), DEEP = ramp([R_FIN[7], R_FIN[5], R_FIN[3]]);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: LURE, k: 0.9 }, { x: 0, y: 0, r: 56, ramp: DEEP, k: 0.3 }, { x: 0, y: 0, r: 0, ramp: LURE, k: 0.8 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.water], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[GL1] = RIM.skip[GL2] = RIM.skip[GL3] = RIM.skip[EYE] = RIM.skip[VOID] = RIM.skip[GUM] = 1;

  // 姿势：身体升降 / 前倾（lean）、上颌仰起（hd）、下颌张开（jaw）、两条触手的落点、钓竿弯曲（sb）、灯的摆角（la）和亮度（lure）、
  //       吸水（suck）、吞下去的鼓包（gulp）、触手吸盘亮（tg）、鳃（gill）、鳍（fin）、触手摆动相位（tw）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'sb', 'la', 'lure', 'suck', 'gulp', 'tg', 'gill', 'fin', 'tw', 'glow', 'eyes', 'flash', 'dq', 'hot', 'breath', 'song', 'tf'];
  const K = {
    idle: { nx: 72, ny: -22, fx2: -60, fy2: -26, lean: 0, hd: -0.08, jaw: 2.2, sb: 0 },
    gape: { nx: 90, ny: -26, fx2: -66, fy2: -46, lean: -0.1, hd: -0.28, jaw: 3.2, sb: 1 },          // 吞噬：仰头张到最大，灯吊在嘴前，触手张开
    chomp: { nx: 82, ny: -18, fx2: -42, fy2: -16, lean: 0.24, hd: 0.06, jaw: 0, sb: 0.3 },
    gulp: { nx: 62, ny: -20, fx2: -52, fy2: -22, lean: 0.04, hd: 0.02, jaw: 0.1, sb: 0.2 },
    coil: { nx: -28, ny: -68, fx2: -66, fy2: -30, lean: -0.16, hd: -0.1, jaw: 2.2, sb: -0.5 },       // 触手横扫：近侧触手卷到身后高处
    sweep: { nx: 104, ny: -30, fx2: -46, fy2: -18, lean: 0.2, hd: 0.08, jaw: 1.2, sb: 0.6 },
    rear: { nx: 86, ny: -38, fx2: -62, fy2: -36, lean: -0.16, hd: -0.18, jaw: 2.6, sb: -0.4 },        // 重击：后仰张嘴 → 一口咬下
    bite: { nx: 84, ny: -16, fx2: -42, fy2: -14, lean: 0.32, hd: 0.08, jaw: 0.2, sb: 0.8 },
    snapW: { nx: 84, ny: -32, fx2: -56, fy2: -30, lean: -0.1, hd: -0.14, jaw: 2.4, sb: -0.2 },
    snap: { nx: 78, ny: -18, fx2: -46, fy2: -20, lean: 0.18, hd: 0.04, jaw: 0, sb: 0.5 },
    roar: { nx: 98, ny: -56, fx2: -72, fy2: -60, lean: -0.14, hd: -0.32, jaw: 3.4, sb: -0.7 },
    hunch: { nx: 36, ny: -26, fx2: 8, fy2: -26, lean: 0.14, hd: 0.1, jaw: 0, sb: 0.9 },
    climbA: { nx: 78, ny: -32, fx2: -54, fy2: -8, lean: 0.2, hd: 0.08, jaw: 1.2, sb: 0.2 },
    climbB: { nx: 70, ny: -8, fx2: -60, fy2: -32, lean: 0.2, hd: 0.08, jaw: 1.2, sb: 0.2 },
    agony: { nx: 98, ny: -60, fx2: -68, fy2: -64, lean: -0.2, hd: -0.36, jaw: 3.6, sb: -0.8 },
    limp: { nx: 60, ny: 4, fx2: -56, fy2: 4, lean: 0.3, hd: 0.16, jaw: 2.2, sb: 1.5 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'jaw', 'sb'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.lure = 2; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.gill = b; P.jaw = K.idle.jaw + b * 0.2; P.tw = tt; P.fin = [0, 1, 2, 1][Math.floor(tt / 0.25) % 4];
      P.la = [0, 0.12, 0.2, 0.12, 0, -0.12, -0.2, -0.12][Math.floor(tt / 0.15) % 8]; P.lure = (f12 % 9 === 0 || f12 % 13 === 0) ? 1 : 2;   // 灯慢慢晃、一闪一闪
      const lp = tt % DUR[IDLE];
      if (lp >= 1.3 && lp < 1.85) { const q = ease.inOut(clamp01((lp - 1.3) / 0.3)); P.sb = 0.9 * q; P.la = -0.3 * q + (q >= 1 ? [0, 0.15, 0, -0.15][Math.floor(tt * 8) & 3] : 0); P.jaw = 2.2 + 1.0 * q; P.hd = -0.04 - 0.08 * q; P.lure = 3; }   // 待机个性：把灯垂到嘴前晃
      else if (lp >= 1.85 && lp < 2.1) { P.sb = 0.5; P.jaw = 0; P.lean = 0.06; P.hd = 0.03; P.lure = 2; P.eyes = 2; } };   // → 啪地合一下嘴
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.tw = tq; P.fin = f & 1 ? 2 : 0; P.gill = f & 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.snapW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.snapW, K.snapW); P.glow = 2; P.jaw += 0.3; P.la = -0.3; }
      else if (tq < 0.42) { pose(K.snap, K.snap); P.glow = 3; P.la = 0.5; P.eyes = 2; }
      else pose(K.snap, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
      P.tw = tq;
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.22; P.lean = -0.1; P.jaw = 3; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.la = 0.9; P.sb = -0.3; P.lure = 1; P.nx -= 6; P.fx2 -= 4; P.fin = 2; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.22 * (1 - q) + K.idle.hd * q; P.lean = -0.1 * (1 - q); P.jaw = 3 - 1.4 * q; P.la = 0.7 * (1 - q) * ((f12 & 1) ? 1 : -1); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.flash = d < 1 / 12 ? 1 : 0; P.lure = (f12 & 1) ? 3 : 0; P.glow = 3; P.eyes = 2; P.la = (f12 & 1) ? 0.5 : -0.5; P.tw = tq * 2; P.fin = 2; P.song = 1; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.lure = d < 1.0 ? ((f12 % 3) ? 1 : 0) : 0; P.glow = d < 1.1 ? 2 : 1; P.eyes = d < 1.2 ? 1 : 0; P.la = 0.2; P.tw = tq; }
      else { pose(K.limp, K.limp); P.lure = 0; P.glow = 0; P.eyes = 0; P.la = 0.1; P.tw = 1.5 + (d - 1.5) * 0.3; const s = clamp01((d - 1.5) / 1.0); P.by = Math.round(62 * ease.in(s)); P.dq = d > 2.1 ? Math.round(clamp01((d - 2.1) / 0.5) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = L.mouth[0]; P.gy = L.mouth[1];
  }
  const MVI = { swallow: 0, tentSweep: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D); P.tw = tq;
    if (MV === 'swallow') {
      if (st === CHARGE) {
        if (q < 0.3) { pose(K.idle, K.gape, ease.out(q / 0.3)); P.lure = 2; P.suck = q > 0.15 ? 1 : 0; }
        else if (q < 0.86) { pose(K.gape, K.gape); const k = (q - 0.3) / 0.56; P.suck = 1 + Math.min(2, Math.floor(k * 3)); P.lure = 3 - ((f12 >> 1) & 1); P.la = [0.25, 0.1, -0.05, 0.1][f12 & 3]; P.nx += (f12 & 1) ? 2 : -2; P.fx2 += (f12 & 1) ? -2 : 2; P.lean -= 0.04 * k; P.jaw += (f12 & 1) * 0.15; }
        else { pose(K.gape, K.gape); P.lean -= 0.1; P.jaw += 0.3; P.suck = 3; P.lure = 3; P.la = -0.2; }
        P.by = -Math.round(2 * clamp01(q / 0.3)); P.glow = q < 0.3 ? 2 : 3; P.eyes = 2; P.fin = 1 + (f12 & 1); P.gill = 1;
      } else if (st === CAST) { pose(K.chomp, K.chomp); P.glow = 3; P.eyes = 2; P.lure = 2; P.by = 2; P.la = 0.6; P.fin = 2; }
      else { pose(K.chomp, K.gulp, ease.out(clamp01(tq / 0.15))); if (tq > 0.35) pose(K.gulp, K.idle, ease.inOut(clamp01((tq - 0.35) / 0.35)));
        P.gulp = tq < 0.6 ? 1 + Math.min(3, Math.floor(tq / 0.15)) : 0; P.eyes = tq < 0.45 ? 0 : 1; P.la = 0.3 * (1 - clamp01(tq / 0.4)); P.glow = P.gulp ? 2 : 1; P.gill = tq < 0.5 ? 1 : 0; }
    } else if (MV === 'tentSweep') {
      if (st === CHARGE) { pose(K.idle, K.coil, ease.out(clamp01(q / 0.45))); P.by = -Math.round(1 * ease.out(clamp01(q / 0.45))); P.tg = q < 0.3 ? 0 : 1;
        if (q > 0.45) { P.nx += (f12 & 1) ? 2 : -2; P.ny += (f12 & 1); P.tg = 1 + ((f12 >> 1) & 1); } P.glow = q < 0.45 ? 2 : 3; P.eyes = 2; P.la = -0.4; P.fin = 2; }
      else if (st === CAST) { pose(K.coil, K.sweep, ease.out(clamp01((tq + 1 / 12) / 0.17))); P.tf = 1; P.tg = 2; P.glow = 3; P.eyes = 2; P.la = 0.6; P.fin = 0; }
      else { pose(K.sweep, K.idle, ease.inOut(clamp01(tq / 0.55))); P.la = 0.3 * (1 - clamp01(tq / 0.4)); P.tg = tq < 0.2 ? 1 : 0; P.tf = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.rear, ease.out(clamp01(q / 0.5))); P.by = -Math.round(2 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.lean += (f12 & 1) ? 0.02 : -0.02; P.jaw += (f12 & 1) * 0.3; } P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.la = -0.3; }
      else if (st === CAST) { pose(K.bite, K.bite); P.by = 3; P.glow = 3; P.eyes = 2; P.la = 0.7; }
      else { pose(K.bite, K.idle, ease.inOut(clamp01(tq / 0.5))); P.la = 0.4 * (1 - clamp01(tq / 0.4)); }
    } else if (MV === 'rise') {   // 先是灯在水下亮起来，再整颗头顺着触手爬出来
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = Math.round(56 * (1 - ease.inOut(q))) + [2, 0, 2, 0][f];
        P.lure = q < 0.08 ? 0 : q < 0.22 ? ((f12 % 3) ? 2 : 0) : 2; P.eyes = q > 0.6 ? 2 : 1; P.glow = 1 + (f12 & 1); P.jaw = 1.2 + q; P.fin = f & 1 ? 2 : 0; P.gill = f & 1; }
      else if (st === CAST) { pose(K.climbB, K.roar, ease.out(clamp01((tq + 1 / 12) / 0.17))); P.jaw = 3.4; P.glow = 3; P.eyes = 2; P.lure = 3; P.song = 1 + ((f12 >> 1) & 1); P.fin = 2; }
      else { pose(K.roar, K.idle, ease.inOut(clamp01(tq / 0.6))); P.lure = tq < 0.3 ? 3 : 2; }
    } else {   // p2：合嘴、触手抱在身前，灯和斑点像心跳一样闪两下 → 张嘴长吼，斑点、侧线、喉咙全亮
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.lure = hb ? 3 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.eyes = hb ? 2 : 1; P.fin = hb ? 2 : 0; }
      else if (st === CAST) { pose(K.hunch, K.roar, ease.out(clamp01((tq + 1 / 12) / 0.17))); P.jaw = 3.6; P.glow = 3; P.eyes = 2; P.hot = 1; P.lure = 3; P.song = 1 + ((f12 >> 1) & 1); P.fin = 2; }
      else { const hold = tq < 1.0; pose(K.roar, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); if (hold) { P.jaw = 3.4 - ((f12 >> 1) & 1) * 0.4; P.song = 1 + ((f12 >> 1) & 1); } P.glow = 3; P.eyes = 2; P.hot = 1; P.lure = 3; }
    }
  }

  // ───── 几何（本地坐标：原点 = 海底水面，面朝右，y 向上为负）─────
  const L = {};
  const HINGE = [-14, -36];
  const UL = [[-14, -36], [-8, -37], [4, -39], [18, -42], [32, -44], [44, -45], [52, -46], [54, -50]];           // 上唇（上颌坐标）
  const LL = [[-14, -36], [-4, -37], [12, -39], [28, -41], [44, -43], [56, -45], [60, -49]];                      // 下唇（下颌坐标，下巴往前翘）
  const UT = [[50, -46, 10, -0.2], [43, -45, 13, -0.14], [36, -44.4, 8, -0.1], [29, -43.6, 11, -0.06], [22, -42.6, 7, -0.02], [15, -41.4, 8, 0.03], [8, -40, 5, 0.06], [2, -38.6, 4, 0.1]];   // 上排针牙 x, y, 长, 斜
  const LT = [[59, -48, 14, 0.22], [52, -44.4, 10, -0.12], [45, -43.6, 13, -0.16], [38, -42.6, 8, -0.1], [31, -41.8, 11, -0.08], [24, -40.8, 6, -0.04], [17, -39.6, 8, 0], [10, -38.8, 5, 0.04], [4, -38, 4, 0.05]];
  function bodyXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { bodyXf(); B.rot(HINGE[0], HINGE[1], P.hd); }
  function jawXf() { bodyXf(); B.rot(HINGE[0], HINGE[1], P.jaw * 0.12); }
  function stalkPts() {   // 钓竿（上颌坐标）：从额头弯到嘴前；sb > 0 往前往下垂，sb < 0 往后甩
    const s = P.sb, R = [4, -72], c = [R[0] + 8 + 6 * s, R[1] - 14 + 4 * Math.max(0, s) + 2 * Math.min(0, s)];
    const t = s >= 0 ? [R[0] + 38 + 6 * s, R[1] - 6 + 20 * s] : [R[0] + 38 + 34 * s, R[1] - 6 + 6 * s];
    return B.bez(R, c, t, 9);
  }
  function geo() {
    bodyXf(); L.rootN = B.at(-2, -18); L.rootF = B.at(-28, -22); L.gill = B.at(-26, -38); L.bt = [B.at(-48, -10), B.at(-36, -16)];
    headXf(); L.ul = UL.map((p) => B.at(p[0], p[1])); L.eye = B.at(16, -58); L.eye2 = B.at(32, -63); L.stalk = stalkPts().map((p) => B.at(p[0], p[1])); 
    jawXf(); L.ll = LL.map((p) => B.at(p[0], p[1])); L.chin = B.at(58, -40); L.throat = [(L.ul[2][0] + L.ll[2][0]) / 2 - 2, (L.ul[2][1] + L.ll[2][1]) / 2];
    const tip = L.stalk[L.stalk.length - 1], FL = 11; L.tip = tip; L.lure = [tip[0] + Math.sin(P.la) * FL, tip[1] + Math.cos(P.la) * FL];
    L.mouth = [(L.ul[4][0] + L.ll[4][0]) / 2 - 6, (L.ul[4][1] + L.ll[4][1]) / 2];
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const spotLvl = () => (P.hot ? (P.glow >= 3 ? 3 : 2) : P.glow >= 3 ? 2 : 1);
  const spotM = (i, f) => { const l = spotLvl(); if (l === 1 && ((i * 5 + (P.k1 >>> 3)) % 7) < 2) return null; return l >= 3 ? (i % 3 ? GL2 : GL3) : l >= 2 ? (i % 2 ? GL1 : GL2) : GL1; };
  function spot(x, y, i, big) { const m = spotM(i); if (!m) { B.px(E, x, y, P.st === DEATH ? SKIN : SKIN, 7); return; } B.px(E, x, y, m); if (big) { B.px(E, x + 1, y, m); B.px(E, x, y + 1, GL1); } }

  // 触手：根 → 手，二次曲线弯一下、末端往吸盘那侧卷两圈；下侧一排吸盘（横扫蓄力时吸盘一个个亮起）
  function tentacle(root, hand, side, far) {
    const m = far ? TENTD : TENT, dx = hand[0] - root[0], dy = hand[1] - root[1], len = Math.hypot(dx, dy) || 1, ux = -dy / len, uy = dx / len;
    const cv = side * (0.2 + 0.08 * Math.sin(P.tw * 3 + (far ? 1.3 : 0)));
    const c = [(root[0] + hand[0]) / 2 + ux * cv * len, (root[1] + hand[1]) / 2 + uy * cv * len], pts = B.bez(root, c, hand, 12);
    let a = Math.atan2(hand[1] - pts[11][1], hand[0] - pts[11][0]), p = hand, stp = 3.6;
    for (let i = 0; i < 4; i++) { a += side * (0.9 + 0.15 * Math.sin(P.tw * 4 + i)); p = [p[0] + Math.cos(a) * stp, p[1] + Math.sin(a) * stp]; pts.push(p); stp *= 0.76; }
    const n = pts.length - 1, r0 = far ? 5.2 : 6.6, r1 = 0.7, rr = (i) => r0 + (r1 - r0) * Math.pow(i / n, 0.8);
    part(); for (let i = 0; i < n; i++) capW(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rr(i), rr(i + 1), m);
    for (let i = 1; i < n - 1; i++) { const a0 = pts[i], a1 = pts[i + 1], tx = a1[0] - a0[0], ty = a1[1] - a0[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl * side, ny = tx / tl * side, r = rr(i);
      px(a0[0] - nx * r * 0.45, a0[1] - ny * r * 0.45, m, 8);                                                          // 背上的高光
      if (i % 2 === 0 && r > 1.6) { const lit = !far && P.tg && (i >> 1) % 3 < P.tg + 1; dot(a0[0] + nx * r * 0.6, a0[1] + ny * r * 0.6, Math.max(0.7, r * 0.3), lit ? (P.tg >= 2 ? GL2 : GL1) : far ? SUCKD : SUCK); } }   // 吸盘
  }
  function backTent(k) {   // 身后两根往上卷的细触手
    const root = L.bt[k], ph = P.tw * 2.2 + k * 1.7, pts = [];
    for (let i = 0; i <= 8; i++) { const s = i / 8; pts.push([root[0] - (20 + 8 * k) * s + 6 * Math.sin(ph + s * 4) * s, root[1] - (48 - 8 * k) * s]); }
    let a = Math.atan2(pts[8][1] - pts[7][1], pts[8][0] - pts[7][0]), p = pts[8], stp = 3.2; for (let i = 0; i < 3; i++) { a += 1.0; p = [p[0] + Math.cos(a) * stp, p[1] + Math.sin(a) * stp]; pts.push(p); stp *= 0.72; }
    const n = pts.length - 1; part(); for (let i = 0; i < n; i++) capW(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 4.4 - 3.8 * i / n, 4.4 - 3.8 * (i + 1) / n, TENTD);
    for (let i = 2; i < n - 2; i += 2) px(pts[i][0] + 1.5, pts[i][1], SUCKD);
    if (spotLvl() >= 2) px(pts[5][0] - 1, pts[5][1], GL1);
  }
  function dorsal() {   // 背鳍：一排骨棘，中间是破破烂烂的膜
    part(); headXf(); const w = P.fin * 1.5, bs = [[-20, -58], [-15, -65], [-8, -70], [0, -73]], ts = [[-36, -64 - w], [-31, -74 - w], [-22, -81 - w * 0.6], [-10, -84]];
    const mem = [bs[0]]; for (let i = 0; i < ts.length; i++) { mem.push(ts[i]); if (i < ts.length - 1) { const m = [(ts[i][0] + ts[i + 1][0]) / 2, (ts[i][1] + ts[i + 1][1]) / 2], b = [(bs[i][0] + bs[i + 1][0]) / 2, (bs[i][1] + bs[i + 1][1]) / 2]; mem.push([m[0] + (b[0] - m[0]) * 0.38, m[1] + (b[1] - m[1]) * 0.38]); } } mem.push(bs[3]);
    B.poly(E, mem, FIND); for (let i = 0; i < ts.length; i++) B.ln(E, bs[i][0], bs[i][1], ts[i][0] * 0.7 + bs[i][0] * 0.3, ts[i][1] * 0.7 + bs[i][1] * 0.3, FIND, 7);
    part(); headXf(); for (let i = 0; i < ts.length; i++) { B.cap(E, bs[i][0], bs[i][1], ts[i][0], ts[i][1], 1.3, 0.3, BONE); B.px(E, bs[i][0] * 0.5 + ts[i][0] * 0.5, bs[i][1] * 0.5 + ts[i][1] * 0.5, BONE, 3); if (P.hot) B.px(E, ts[i][0], ts[i][1], GL2); }
  }
  function pectoral() {   // 近侧的胸鳍：一把扇子往后下方张开
    part(); bodyXf(); const w = P.fin * 0.12, r = [-18, -30], tips = [[-40, -44], [-46, -34], [-45, -23], [-38, -14]].map(([x, y]) => { const dx = x - r[0], dy = y - r[1], c = Math.cos(w), s = Math.sin(w); return [r[0] + dx * c + dy * s, r[1] - dx * s + dy * c]; });
    const mem = [r]; for (let i = 0; i < tips.length; i++) { mem.push(tips[i]); if (i < tips.length - 1) { const m = [(tips[i][0] + tips[i + 1][0]) / 2, (tips[i][1] + tips[i + 1][1]) / 2]; mem.push([m[0] + (r[0] - m[0]) * 0.22, m[1] + (r[1] - m[1]) * 0.22]); } }
    B.poly(E, mem, FIN); for (const t of tips) B.ln(E, r[0], r[1], t[0], t[1], FIN, 8); B.ln(E, r[0] - 1, r[1] + 1, tips[3][0] + 2, tips[3][1] - 1, FIN, 3);
  }
  function body() {
    part(); bodyXf();
    B.poly(E, [[-62, 5], [-65, -16], [-60, -36], [-48, -54], [-30, -64], [-12, -58], [-8, -36], [-12, 5]], SKIN);                 // 后半个身子
    B.poly(E, [[-16, 5], [-14, -22], [4, -20], [30, -16], [54, -12], [58, 5]], SKIN); B.ln(E, -8, -8, 40, -6, SKIN, 3);           // 下巴底下的喉咙
    for (const [x, y] of [[-54, -20], [-44, -40], [-36, -50], [-58, -8]]) { B.px(E, x, y, SKIN, 7); B.px(E, x + 1, y + 1, SKIN, 3); }   // 疙瘩
    for (let i = 0; i < 3; i++) { const x = -24 - i * 4; B.ln(E, x, -46 + i, x - 3, -30 + i * 2, SKIN, 3); B.ln(E, x + 1, -46 + i, x - 2, -30 + i * 2, SKIN, 7); if (P.gill) B.ln(E, x - 1, -44 + i, x - 3, -32 + i * 2, VOID); }   // 鳃
    const fl = [[-52, -24], [-47, -31], [-41, -38], [-34, -45], [-49, -14], [-42, -20], [-35, -27], [-56, -32]]; fl.forEach(([x, y], i) => spot(x, y, i, i === 2 || i === 5));   // 侧面的发光斑点
    if (P.hot || P.glow >= 3) for (let i = 0; i < 7; i++) B.px(E, -18 - i * 6, -34 + i * 1.2 + (i & 1), spotLvl() >= 3 ? GL2 : GL1); else for (let i = 0; i < 7; i++) B.px(E, -18 - i * 6, -34 + i * 1.2 + (i & 1), SKIN, 8);   // 侧线
  }
  function upperHead() {   // 上颌和整个头顶：圆顶、眉骨、两只小眼、疙瘩、顶上一排斑点
    part(); headXf();
    B.poly(E, [[-14, -36], [-22, -50], [-20, -62], [-8, -72], [8, -76], [22, -74], [34, -69], [44, -62], [51, -56], [55, -51], [54, -47], [52, -46], [44, -45], [32, -44], [18, -42], [4, -39], [-8, -37]], SKIN);
    B.ell(E, 10, -68, 7, 2.5, -0.15, SKIN, 7); B.ell(E, 30, -64, 5, 2, 0.35, SKIN, 7); B.ell(E, -6, -60, 4, 2, 0.5, SKIN, 3); B.ell(E, 24, -54, 4, 1.6, 0.1, SKIN, 3);   // 斑驳
    B.ln(E, 52, -47, 32, -45, SKIN, 8); B.ln(E, 32, -45, 6, -40, SKIN, 8);                                                     // 上唇的棱
    B.ln(E, -2, -46, 30, -50, SKIN, 3); B.ln(E, 30, -50, 46, -52, SKIN, 3);                                                    // 颊上的褶
    B.ln(E, -8, -40, -12, -48, SKIN, 3); B.ln(E, -4, -41, -9, -50, SKIN, 3);                                                   // 嘴角的皱
    for (const [x, y] of [[0, -66], [16, -72], [36, -60], [44, -55], [-12, -52], [6, -50]]) { B.px(E, x, y, SKIN, 8); B.px(E, x + 1, y + 1, SKIN, 3); }
    B.ln(E, 6, -71, 12, -64, SKIN, 3); B.ln(E, 7, -71, 13, -64, SKIN, 8);                                                     // 一道旧伤疤
    B.px(E, 47, -53, SKIN, 10); B.px(E, 48, -53, SKIN, 10); B.px(E, 47, -54, SKIN, 8); B.ln(E, 38, -50, 50, -51, SKIN, 7);   // 鼻孔、鼻头的高光
    B.ln(E, 26, -56, 40, -58, SKIN, 3); B.ln(E, 22, -52, 34, -54, SKIN, 7);                                                   // 眼下的皮褶
    [[-4, -65], [8, -69], [22, -68], [34, -62], [42, -57]].forEach(([x, y], i) => spot(x, y, i + 10, i === 2));              // 头顶的斑点
    if (P.hot) { B.ln(E, 18, -58, 2, -52, GL1); B.ln(E, 2, -52, -14, -50, GL1); B.ln(E, 32, -62, 44, -56, GL1); }              // 第二阶段：发光的侧线爬上头
    // 眼睛：很小、乳白，眉骨压在上面；第二阶段 / 蓄力时透出青光
    B.ln(E, 11, -61, 21, -62, SKIN, 8); B.ln(E, 11, -60, 21, -61, SKIN, 3); B.ln(E, 29, -66, 35, -66, SKIN, 8);
    B.ell(E, 16, -58, 3.4, 3, 0, SKIN, 10);
    if (P.eyes) { B.ell(E, 16, -58, 2.5, 2.2, 0, EYE); B.px(E, 17, -58, P.eyes >= 2 ? GL3 : EYE); if (P.eyes >= 2) { B.px(E, 16, -59, GL2); B.px(E, 19, -58, GL1); }
      B.ell(E, 32, -63, 1.5, 1.4, 0, EYE); if (P.eyes >= 2) B.px(E, 33, -63, GL2); }
    else { B.ln(E, 14, -58, 18, -58, SKIN, 10); B.ln(E, 31, -63, 33, -63, SKIN, 10); }
  }
  function gullet() {   // 嘴里：黑的喉咙、暗红的牙龈、里排的牙，蓄力 / 第二阶段喉咙深处亮
    const ul = L.ul, ll = L.ll; part(); polyW(ul.concat(ll.slice().reverse()), VOID);
    for (let i = 1; i < ul.length - 1; i++) { capW(ul[i][0], ul[i][1] + 1.5, ul[i + 1][0], ul[i + 1][1] + 1.5, 1.4, 1.4, GUM); lnW(ul[i][0], ul[i][1] + 3, ul[i + 1][0], ul[i + 1][1] + 3, GUM, 3); }   // 牙龈
    for (let i = 1; i < ll.length - 1; i++) { capW(ll[i][0], ll[i][1] - 1.5, ll[i + 1][0], ll[i + 1][1] - 1.5, 1.4, 1.4, GUM); lnW(ll[i][0], ll[i][1] - 3, ll[i + 1][0], ll[i + 1][1] - 3, GUM, 3); }
    const th = L.throat, gap = Math.hypot(ul[3][0] - ll[3][0], ul[3][1] - ll[3][1]);
    if (gap > 5) { dot(th[0] + 3, th[1], Math.min(6, gap * 0.34), GUM, 3); dot(th[0], th[1], Math.min(4.5, gap * 0.26), VOID, 10);   // 喉咙：暗红的肉往里收成一个黑洞
     
      const tg = P.suck ? P.suck : P.hot ? 2 : P.gulp ? 1 : 0; if (tg) { dot(th[0], th[1], 0.8 + tg * 0.6, tg >= 2 ? GL2 : GL1); if (tg >= 3) px(th[0], th[1], GL3); } }
    for (let i = 2; i < 7; i++) { const a = ul[i], b = ul[i + 1], x = (a[0] + b[0]) / 2 - 3, y = (a[1] + b[1]) / 2 + 1; capW(x, y, x - 0.8, y + 4, 0.8, 0.3, TOOTHD); }        // 里排的牙
    for (let i = 2; i < 6; i++) { const a = ll[i], b = ll[i + 1], x = (a[0] + b[0]) / 2 - 3, y = (a[1] + b[1]) / 2 - 1; capW(x, y, x - 0.6, y - 4, 0.8, 0.3, TOOTHD); }
  }
  function needle(xf, x, y, ln, sk, dir) {   // 一根细长弯针牙（dir = 1 往下、-1 往上）
    xf(); const b = B.at(x, y), m = B.at(x + sk * ln * 0.3 + 0.6, y + dir * ln * 0.55), t = B.at(x + sk * ln, y + dir * ln);
    capW(b[0], b[1], m[0], m[1], ln > 9 ? 1.05 : 0.85, 0.6, TOOTH); capW(m[0], m[1], t[0], t[1], 0.6, 0.2, TOOTH); px(b[0], b[1] + (dir > 0 ? 0 : -1), TOOTH, 8);
  }
  function upperTeeth() { part(); for (const [x, y, l, s] of UT) needle(headXf, x, y, l, s, 1); }
  function lowerJaw() {   // 往前翘出的大下颌：下沿蓝灰，一排发光斑点，下巴吊着几根皮须
    part(); jawXf();
    B.poly(E, [[-14, -36], [-4, -37], [12, -39], [28, -41], [44, -43], [56, -45], [60, -49], [63, -44], [62, -36], [56, -26], [44, -18], [26, -13], [8, -12], [-8, -16], [-16, -26]], SKIN);
    B.poly(E, [[60, -36], [56, -27], [44, -19], [26, -14], [8, -13], [-6, -17], [-4, -22], [12, -19], [30, -20], [46, -25], [56, -31]], BELLY);   // 下沿
    B.ln(E, -4, -38, 56, -46, SKIN, 8); B.ln(E, 56, -46, 60, -50, SKIN, 8);                                                  // 下唇的棱
    B.ln(E, -10, -32, 6, -30, SKIN, 3); B.ln(E, 20, -32, 44, -36, SKIN, 3); B.ln(E, 48, -38, 58, -42, SKIN, 3);              // 下颌上的皱
    for (const [x, y] of [[4, -34], [30, -36], [52, -40], [16, -26]]) { B.px(E, x, y, SKIN, 7); B.px(E, x + 1, y + 1, SKIN, 3); }
    for (const [d, t] of [[4, 7], [5, 3], [9, 7], [10, 3]]) B.ln(E, 2, -37 + d, 50, -44 + d * 1.1, SKIN, t);                   // 下颌上一道道横棱
    [[8, -27], [20, -28], [32, -30], [43, -33], [53, -36], [58, -41]].forEach(([x, y], i) => spot(x, y, i + 20, i === 3));
    part(); jawXf(); for (const [x, y, l] of [[46, -21, 5], [34, -15, 7], [20, -13, 5], [54, -28, 4]]) { B.cap(E, x, y, x - 1, y + l, 0.9, 0.4, SKIND); B.px(E, x - 1, y + l, spotLvl() >= 2 ? GL2 : GL1); }   // 皮须，末端一点荧光
  }
  function lowerTeeth() { part(); for (const [x, y, l, s] of LT) needle(jawXf, x, y, l, s, -1); }
  function bulge() {   // 吞下去的东西：喉咙上一个鼓包往身子里滑
    if (!P.gulp) return; part(); jawXf(); const x = 42 - (P.gulp - 1) * 17, y = -27 + (P.gulp - 1) * 2;
    B.ell(E, x, y, 10, 7.5, 0.1, BELLY); B.ell(E, x - 2, y - 3, 4, 2, 0.1, BELLY, 8); B.ln(E, x - 6, y - 3, x + 5, y - 5, BELLY, 8); B.ln(E, x - 7, y + 3, x + 6, y + 4, BELLY, 3);
  }
  function stalk() {   // 钓竿 + 吊着的灯：灯是整个首领的识别光
    const s = L.stalk, n = s.length - 1; part(); for (let i = 0; i < n; i++) capW(s[i][0], s[i][1], s[i + 1][0], s[i + 1][1], 2.2 - 1.3 * i / n, 2.2 - 1.3 * (i + 1) / n, SKIN);
    for (let i = 2; i < n; i += 2) px(s[i][0], s[i][1] - 1, SKIN, 8); for (let i = 1; i < n; i += 3) px(s[i][0] + 1, s[i][1] + 1, SKIN, 3);
    if (P.hot) for (let i = 3; i < n; i += 3) px(s[i][0], s[i][1], GL1);
    const t = L.tip, l = L.lure; part(); lnW(t[0], t[1], l[0], l[1], SKIN, 7); dot(t[0], t[1], 1.2, SKIN);
    part(); const lv = P.lure, r = lv >= 3 ? 5 : 4.2;
    if (!lv) { dot(l[0], l[1], r, SKIN, 7); px(l[0] - 1, l[1] - 1, SKIN, 8); }
    else { dot(l[0], l[1], r, GL1); dot(l[0] - 0.3, l[1] - 0.3, r - 1, lv >= 2 ? GL2 : GL1); dot(l[0] - 0.6, l[1] - 0.6, r - 2.2, lv >= 2 ? GL3 : GL2); if (lv >= 2) { px(l[0] - 1, l[1] - 1, GL3); px(l[0] - 2, l[1] - 2, GL3); }
      if (lv >= 2) for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832 + (P.k1 & 1) * 0.26; if (k & 1) px(l[0] + Math.cos(a) * (r + 2), l[1] + Math.sin(a) * (r + 2), GL1); }   // 灯外面一圈光晕
      if (lv >= 3) { for (const [dx, dy] of [[0, -9], [0, 9], [-9, 0], [9, 0], [0, -8], [0, 8], [-8, 0], [8, 0]]) px(l[0] + dx, l[1] + dy, GL2); for (const [dx, dy] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) px(l[0] + dx, l[1] + dy, GL1); } }
    for (const dx of [-1.5, 1.5]) { lnW(l[0] + dx, l[1] + r - 0.5, l[0] + dx * 1.8, l[1] + r + 3, lv ? GL1 : SKIN, lv ? undefined : 7); }   // 灯下面两根小穗
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    backTent(0); backTent(1); tentacle(L.rootF, L.hF, -1, true); dorsal(); body(); upperHead();
    pectoral(); if (!P.tf) tentacle(L.rootN, L.hN, 1, false); gullet(); upperTeeth(); lowerJaw(); lowerTeeth(); bulge(); if (P.tf) tentacle(L.rootN, L.hN, 1, false); stalk();   // 横扫出手时触手甩到下巴前面   // 近侧触手从下颌底下伸出来
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.lure[0] * z + spr.ox; RIM.ry = L.lure[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.lure[0] * z + spr.ox; LIGHTS[0].y = L.lure[1] * z + spr.oy; LIGHTS[0].r = [0, 10, 16, 22][P.lure] * z;          // 灯照亮鼻头和牙
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 20 * z; LIGHTS[1].r = 56 * z; LIGHTS[1].k = P.hot ? 0.42 : 0.3;                  // 深海从下面映上来的一点青
    const tg = P.suck || (P.hot ? 2 : 0); LIGHTS[2].x = L.throat[0] * z + spr.ox; LIGHTS[2].y = L.throat[1] * z + spr.oy; LIGHTS[2].r = (tg ? 5 + tg * 3 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面张大嘴、针牙全露，灯吊在嘴前最亮，斑点全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.gape, 0.62); P.sb = 0.85; P.la = 0.1; P.lure = 3; P.eyes = 2; P.glow = 3; P.hot = 1; P.by = 0; P.breath = 0; P.gill = 1; P.fin = 1; P.tw = 0.4; P.nx = 74; P.ny = -34; P.fx2 = -64; P.fy2 = -36;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(26, -58); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 38 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连嘴和灯）

  // ───── 特效（舞台坐标；游戏里只画身边的，吞人、扇形范围由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, snT = 0;
  const spray = (x, n, up) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, HY - 2, (Math.random() - 0.5) * 120, -(up || 120) - Math.random() * 150, 0.8 + Math.random() * 0.5, FXI.water, { g: 340, floor: HY + 2 }); };
  const spout = (x, h, w) => { fx.pillar(x, HY - h, HY + 1, w || 3, 'water', 0.55, 2); spray(x, 10, h * 2.4); burst(x, HY - h, 8, 20, 70, 0.25, 0.5, FXI.water, 30); ring(x, HY - 2, 0, FXI.water); };   // 喷起来的水柱
  function roarFx(p2) {
    const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, FXI.water); ring(sx(L.lure[0]), sy(L.lure[1]), 1, FXL); flash(0.12); shake(0.4, 3);
    for (const [x, h] of [[-60, 34], [-26, 46], [52, 42], [86, 30]]) spout(sx(x), h, 3);
    burst(sx(L.lure[0]), sy(L.lure[1]), p2 ? 36 : 24, 40, 150, 0.4, 0.8, FXL, 20); sfx('boss', { k: 'mawSong', w: 1 }); sfx('impact', { pal: 'water', w: 1 });
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'swallow') { const m = L.mouth; ring(sx(m[0] + 10), sy(m[1]), 1, FXI.water); burst(sx(m[0] + 10), sy(m[1]), 22, 50, 150, 0.3, 0.6, FXI.water, 20);
        spout(sx(m[0] + 34), 40, 3); spout(sx(m[0] - 18), 30, 2); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'mawChomp', w: 1 }); sfx('impact', { pal: 'water', w: 1 }); }
      else if (MV === 'tentSweep') { fx.slash(sx(L.rootN[0]), sy(L.rootN[1]), 66, -0.5, 2.3, 'water', 0.25, 3, 2); fx.wave(sx(40), HY, 1, 96, 12, 'water', 0.6, 2); fx.wave(sx(20), HY, 1, 60, 7, 'water', 0.45, 2);
        for (const [x, h] of [[50, 30], [78, 40], [102, 28]]) spout(sx(x), h, 2); burst(sx(L.hN[0]), sy(L.hN[1]), 20, 60, 180, 0.3, 0.6, FXI.water, 30);
        shake(0.35, 3); flash(0.08); sfx('swing', { kind: 'whip', w: 1 }); sfx('boss', { k: 'mawSpout', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'poke') { const m = L.mouth; burst(sx(m[0] + 12), sy(m[1]), 18, 50, 140, 0.25, 0.5, FXI.water, 20); fx.slash(sx(m[0]), sy(m[1]), 26, 0.6, 2.4, 'water', 0.2, 2, 2); spout(sx(m[0] + 30), 26, 2);
        shake(0.25, 2); sfx('boss', { k: 'mawChomp', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') roarFx(MV === 'p2');
    }
    if (s === RECOVER && MV === 'swallow') sfx('boss', { k: 'mawGulp', w: 1 });
    if (s === CHARGE) {
      if (MV === 'swallow') { sfx('boss', { k: 'mawSuck', w: 1, dur: E.DUR[CHARGE] }); sfx('boss', { k: 'mawLure', w: 0.6 }); }
      else if (MV === 'tentSweep') { sfx('boss', { k: 'growl', w: 0.5 }); sfx('boss', { k: 'mawDrip', w: 0.8 }); }
      else if (MV === 'poke') sfx('boss', { k: 'growl', w: 0.6 });
      else if (MV === 'rise') sfx('boss', { k: 'mawRise', w: 1 });
      else if (MV === 'p2') { sfx('boss', { k: 'heartbeat', w: 1 }); sfx('boss', { k: 'mawLure', w: 1 }); }
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 3 / 12) { const m = L.mouth; fx.slash(sx(m[0]), sy(m[1]), 22, 0.6, 2.4, 'water', 0.2, 2, 2); burst(sx(m[0] + 14), sy(m[1]), 14, 50, 130, 0.25, 0.5, FXI.water, 20); hitDummy(1, 1); shake(0.15, 2); sfx('boss', { k: 'mawChomp', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.4 });
    if (s === IDLE && t === 1.4) sfx('boss', { k: 'mawLure', w: 0.35 });
    if (s === IDLE && t === 1.9) { sfx('boss', { k: 'mawChomp', w: 0.3 }); const m = L.mouth; burst(sx(m[0] + 8), sy(m[1]), 6, 20, 60, 0.2, 0.4, FXI.water, 10); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'mawDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.0) { const l = L.lure; burst(sx(l[0]), sy(l[1]), 18, 20, 80, 0.4, 0.8, FXL, 10); ring(sx(l[0]), sy(l[1]), 0, FXL); sfx('boss', { k: 'fade', w: 1 }); }   // 灯灭了
    if (s === DEATH && t === INCOMING + 1.5) { spray(sx(0), 30, 110); spout(sx(-30), 30, 3); spout(sx(40), 36, 3); ring(sx(0), HY - 2, 1, FXI.water); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + Math.random() * 90), sy(-2 - Math.random() * 20), (Math.random() - 0.5) * 6, -14 - Math.random() * 20, 0.8 + Math.random() * 0.7, FXI.water); ring(sx(10), HY - 2, 1, FXI.water); }
  }
  const EVENTS = [[1.4, 1.9], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 1.0, INCOMING + 1.5, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    emT += dt; snT += dt;
    if (emT > (P.hot ? 0.07 : 0.16)) { emT = 0;
      if (P.hot) spawn(K_EMBER, sx(-50 + Math.random() * 100), sy(-8 - Math.random() * 56), (Math.random() - 0.5) * 8, -10 - Math.random() * 10, 0.7 + Math.random() * 0.5, FXL);   // 第二阶段：往上飘的荧光
      else spawn(K_RISE, sx(-40 + Math.random() * 90), sy(-1), 0, -6 - Math.random() * 6, 0.6, FXI.water); }                                        // 海面冒的泡
    if (P.lure >= 2 && Math.random() < (P.lure >= 3 ? 0.35 : 0.08)) { const l = L.lure; spawn(K_EMBER, sx(l[0] + (Math.random() - 0.5) * 6), sy(l[1] + (Math.random() - 0.5) * 6), (Math.random() - 0.5) * 10, -6 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXL); }   // 灯边上的光屑
    if (P.gill && Math.random() < 0.12) { const g = L.gill; spawn(K_RISE, sx(g[0] - 4 + Math.random() * 4), sy(g[1] + Math.random() * 10), -4, -10 - Math.random() * 8, 0.6, FXI.water); }   // 鳃里冒的泡
    if (state === CHARGE && MV === 'swallow' && P.suck) { const m = L.mouth; for (let k = 0; k < P.suck; k++) if (Math.random() < 0.7) { const a = -0.6 + Math.random() * 1.8, r = 26 + Math.random() * 30;   // 水流被吸进嘴里
      spawnX(K_SPIRAL_PT, sx(m[0] + 8), sy(m[1]), r / (0.3 + Math.random() * 0.2), 0, 9, k ? FXI.water : FXL, { a, r, w: 6, tx: sx(m[0] + 4), ty: sy(m[1]), orbitR: 1 }); } }
    if (state === CHARGE && MV === 'tentSweep' && Math.random() < 0.5) { const h = L.hN; spawnX(K_PHYS, sx(h[0] + (Math.random() - 0.5) * 12), sy(h[1] + 4), 0, 10, 0.9, FXI.water, { g: 280, floor: HY + 1 }); }   // 触手往下滴水
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.3) { const m = L.mouth; spawnX(K_PHYS, sx(m[0] + 20), sy(m[1] + 4), 10, 10, 0.7, FXI.water, { g: 300, floor: HY + 1 }); }
    if (((state === CHARGE && MV === 'rise') || state === MOVE) && Math.random() < 0.5) spawnX(K_PHYS, sx(-40 + Math.random() * 100), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.water, { g: 260, floor: HY + 3 });
    if (P.song && snT > 0.16) { snT = 0; const m = L.mouth; ring(sx(m[0] + 10), sy(m[1]), 0, P.song > 1 ? FXL : FXI.water); }   // 深海之声：一圈圈声波
    if (state === DEATH && stT > INCOMING + 1.5 && Math.random() < 0.6) spawn(K_RISE, sx(-30 + Math.random() * 70), sy(-2), 0, -10, 0.6, FXI.water);   // 沉下去冒的泡
  }
  function fxReset() { emT = 0; snT = 0; }
  function fxBack(f12) {   // 身前身后的水纹，加上灯在水面上的倒影
    const x0 = sx(-66), x1 = sx(66), R = FXR[FXI.water];
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { if (((x + (f12 >> 1)) % 5) === 0) E.put(x, HY + 1, R[P.hot ? 2 : 3]); if (((x - f12) % 9) === 0) E.put(x, HY + 3, R[4]); }
    if (P.lure) { const lx = sx(L.lure[0]), G = FXR[FXL]; for (let i = -2; i <= 2; i++) if (((i + f12) & 1) === 0 || !i) E.put(lx + i, HY + 2, G[Math.abs(i) + (P.lure >= 3 ? 0 : 1)]); }
  }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'swallow'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const bub = (s, t, n, w, p) => { for (let i = 0; i < n; i++) { const f = 220 + Math.random() * 360; s.tone(t + i * (0.04 + Math.random() * 0.05), 'sine', f, 0.07, 0.03 * w, { to: f * 2.2, pan: p }); } };   // 咕嘟咕嘟的气泡
  const VOICES = {
    mawSuck: (s, t, w, p) => { s.nz(t, 1.1, 'bandpass', 300, 1.2, 0.12 * w, { pan: p, to: 1600, a: 0.6 }); s.riser(t, t + 1.1, 90, 700, 0.05 * w, { pan: p }); s.whoosh(t + 0.3, 0.9, 300, 1800, 0.07 * w, { pan: p }); bub(s, t + 0.2, 6, w, p); },   // 往嘴里吸水
    mawChomp: (s, t, w, p) => { s.thud(t, 140, 50, 0.25, 0.26 * w, { pan: p }); for (let i = 0; i < 5; i++) s.ring(t + i * 0.012, 2300 + i * 310, 0.06, 0.035 * w, { pan: p }); s.nz(t, 0.12, 'highpass', 3000, 0.7, 0.1 * w, { pan: p }); },   // 一嘴针牙合上
    mawGulp: (s, t, w, p) => { s.tone(t, 'sine', 170, 0.35, 0.16 * w, { to: 55, pan: p }); s.thud(t + 0.25, 90, 40, 0.4, 0.2 * w, { pan: p }); s.nz(t, 0.4, 'lowpass', 600, 1, 0.08 * w, { pan: p, to: 200 }); bub(s, t + 0.3, 5, w, p); },
    mawLure: (s, t, w, p) => { s.tone(t, 'sine', 1760, 0.5, 0.03 * w, { vib: [5, 20, 0.1], pan: p, rev: 0.6 }); s.ring(t + 0.05, 2640, 0.6, 0.02 * w, { pan: p }); s.tone(t + 0.12, 'sine', 2217, 0.4, 0.018 * w, { pan: p, rev: 0.6 }); },   // 灯亮起来的一声玻璃响
    mawDrip: (s, t, w, p) => { for (let i = 0; i < 5; i++) s.tone(t + 0.1 + i * 0.18, 'sine', 700 + ((i * 263) % 400), 0.09, 0.03 * w, { to: 1500, pan: p }); s.nz(t, 0.6, 'lowpass', 900, 0.8, 0.05 * w, { pan: p, a: 0.2 }); },
    mawSpout: (s, t, w, p) => { s.nz(t, 0.7, 'lowpass', 3000, 0.7, 0.18 * w, { pan: p, to: 500, a: 0.01 }); s.whoosh(t, 0.5, 400, 3200, 0.08 * w, { pan: p }); s.thud(t, 80, 36, 0.4, 0.16 * w, { pan: p }); },   // 水柱
    mawSong: (s, t, w, p) => { s.tone(t, 'sawtooth', 62, 1.6, 0.09 * w, { to: 104, vib: [3, 30, 0.3], lp: 700, pan: p, rev: 0.7 }); s.tone(t + 0.2, 'sine', 140, 1.4, 0.06 * w, { to: 230, vib: [4, 20, 0.2], pan: p, rev: 0.7 });   // 深海之声：鲸一样的长鸣
      s.choir(t, [31, 38], 1.6, 0.06 * w, { dark: 1, pan: p }); s.rumble(t, 1.4, 0.12 * w, { pan: p }); bub(s, t + 0.5, 8, w, p); },
    mawRise: (s, t, w, p) => { s.rumble(t, 2.1, 0.14 * w, { pan: p }); s.riser(t, t + 2.1, 120, 1400, 0.04 * w, { pan: p }); bub(s, t, 10, w, p); s.tone(t + 0.3, 'sine', 1760, 0.6, 0.025 * w, { vib: [5, 20, 0.1], pan: p, rev: 0.6 }); },
    mawDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 96, 2.0, 0.09 * w, { to: 34, vib: [5, 40, 0.1], lp: 600, pan: p, rev: 0.7 }); s.choir(t + 0.1, [29, 36], 1.6, 0.05 * w, { dark: 1, pan: p }); bub(s, t + 0.6, 14, w, p); s.rumble(t + 0.8, 1.4, 0.1 * w, { pan: p }); },
  };

  return {
    name: '深海巨口', HX, R_EL: FXI.water, DUR, hero, P, GLOW_MATS: [GL1, GL2, GL3, EYE], HIT_POINT: [10, -40], EVENTS, MAX_H: 100, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'beast', how: 'dissolve', pal: 'water', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['swallow', 'tentSweep', 'poke', 'rise', 'p2'], MOVE_NAMES: { swallow: '吞噬', tentSweep: '触手横扫', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.9]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.3, 0.7, 1.1], 'swallow'], [CAST, [0, 2 / 12], 'swallow'], [RECOVER, [0.15, 0.4], 'swallow'],
      [CHARGE, [0.2, 0.7, 1.2], 'tentSweep'], [CAST, [0, 2 / 12], 'tentSweep'], [RECOVER, [0.3], 'tentSweep'], [CHARGE, [0.7], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.3, 1.0, 1.8], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.6, 1.9, 2.2, 2.5, 2.8]]],
    SINK: 24, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
