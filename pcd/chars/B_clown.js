// 小丑王（最终首领，废弃游乐园的马戏大棚）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「大棚里的小丑，笑脸画到了耳朵根」「白脸红鼻、小礼帽、大锤、气球」；恶魔族；马戏场（舞台）；
// 大锤点名（锤战斗力最高的，掉 25% 最大生命、晕 2.5 秒）、抡锤（前方扇形）、气球（战斗力前二被吊到空中 5 秒）→ 第二阶段 双气球（气球冷却减半）。
// 设定卡 ——
//   剪影：从舞台活板门里升起的上半身（原点 = 舞台面），一张比身子还宽的白脸：画到耳朵根的红色大笑嘴（一排牙，张开是两排尖牙）、
//         竖着的黑菱形眼妆、里面两点发黄光的眼珠、一颗红鼻子；两边炸开两团橙红卷发；头顶三叉的小丑帽（黑 / 红 / 红，尖上挂金铃），
//         帽檐一圈金冠齿（「王」）；脖子一圈红白两层的大褶领。身上黑红菱格的戏服、红白条纹的袖子、白手套。
//   武器：一把红白条的马戏大木锤（金箍），平时竖在身边；远侧的手一直在单手抛三只白红的保龄瓶（瓶子也是他扔出来的飞行物）。
//   主色：黑（戏服、帽）、正红（嘴、鼻、袖、锤）、惨白（脸、领、手套）、金（冠、铃、锤箍）；光源是黄色的眼珠、脚下舞台的脚灯（金光从下往上照）。
//   招式（setMove）：mallet 大锤点名 · swing 抡锤 · balloons 气球 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 第二阶段常亮。
//     大锤点名：双手把锤抡到左后上方、后仰、牙咧开，锤头聚金光、身子发抖 → 往前砸到舞台上（金星、彩纸、舞台板裂开）。
//     抡锤：双手把锤拖到左后下方、拧腰 → 单手横扫出去（红色大弧）。气球：远侧手举起一把线，鼓着腮帮子把两只气球吹大 → 松手放飞、仰头大笑。
//     重击：双手横握锤柄收到胸前 → 往前捅（锤头顶出去）。升起：扒着活板门爬出来（小军鼓滚奏）→「当当！」张开双臂举锤，头顶一道追光。
//     第二阶段：双手捂脸、肩膀笑得一抽一抽 → 猛地张开双臂仰天狂笑，白脸裂开、裂缝和眼圈透出红光、嘴角裂得更开、眼妆往下淌。
//     死亡：尖笑变哀嚎 → 瘫软、锤掉下去 → 整个人顺着活板门沉下去，彩纸落下、一只气球飘走（悲伤长号）。
PCD.define('B_clown', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP;

  // ───── 材质（11 级，暗 → 亮）：戏服压暗，白脸和光才跳得出来 ─────
  // 色板有上限：黑用 obsidian、金用 brass、卷发用 hellhide、锤柄用 hide；只有白油彩和正红是自己的
  const R_PAINT = ['#0c0810', '#211a26', '#3a3242', '#585066', '#7a7288', '#9c96a8', '#bab6c4', '#d4d0dc', '#e8e6ee', '#f6f5fa', '#ffffff'];
  const R_RED = ['#120308', '#2a0610', '#4a0a18', '#6e0e20', '#961428', '#bc1c2e', '#dc2c36', '#f4483e', '#ff7058', '#ffa084', '#ffd0bc'];
  const FACE = defDeep(R_PAINT, { depth: 7, amb: 0.42 }), FACED = defDeep(R_PAINT, { depth: 4, amb: 0.3, dark: 2 }), RUFF = defDeep(R_PAINT, { depth: 3, amb: 0.34 });
  const RED = defDeep(R_RED, { depth: 6, amb: 0.14, dark: 1 }), REDD = defDeep(R_RED, { depth: 5, amb: 0.1, dark: 3 }), LIP = defDeep(R_RED, { depth: 2, amb: 0.5 });
  const SUIT = defDeep('obsidian', { depth: 8, amb: 0.12, dark: 1 }), CAPF = defDeep('obsidian', { depth: 5, amb: 0.2 }), SUITD = defDeep('obsidian', { depth: 6, amb: 0.08, dark: 3 }), INK = defDeep('obsidian', { depth: 2, amb: 0, dark: 4 });
  const GOLD = defDeep('brass', { depth: 4, amb: 0.22 }), GOLDD = defDeep('brass', { depth: 3, amb: 0.14, dark: 2 });
  const HAIR = defDeep('hellhide', { depth: 4, amb: 0.22 }), HAIRD = defDeep('hellhide', { depth: 4, amb: 0.14, dark: 2 }), WOOD = defDeep('hide', { depth: 3, amb: 0.16 });
  const EY1 = defMat(ramp(['#4a2a04', '#c07a10', '#ffcc30', '#fff2a0']), 1, 1), EY2 = defMat(ramp(['#c07a10', '#ffcc30', '#fff2a0', '#ffffff']), 1, 1), EY3 = defMat(ramp(['#ffcc30', '#fff2a0', '#ffffff', '#ffffff']), 1, 1);
  const HRED = defMat(ramp(['#3a0610', '#b01426', '#ff4a44', '#ffc8bc']), 1, 1);
  // 特效色阶（白 → 主色 → 暗），颜色取自上面的色阶，不多占色板
  const CR = fxRamp('clownRed', ['#ffffff', '#ffd0bc', '#f4483e', '#961428', '#2a0610']);
  const CG = fxRamp('clownGold', ['#ffffff', '#fff2a0', '#ffcc30', '#c07a10', '#4a2a04']);
  const CW = fxRamp('clownWhite', ['#ffffff', '#f6f5fa', '#d4d0dc', '#9c96a8', '#3a3242']);
  const CONF = [CR, CG, CW];
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { mallet: { 3: 1.5, 4: 0.5, 5: 0.7 }, swing: { 3: 1.4, 4: 0.45, 5: 0.7 }, balloons: { 3: 1.2, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'mallet', HOT = 0;   // HOT：第二阶段，脸上的裂缝和红眼圈常亮
  const EYEL = ramp(['#fff2a0', '#ffcc30', '#c07a10']), FOOT = [DRAMP.brass[7], DRAMP.brass[5], DRAMP.brass[3]], REDL = ramp(['#ffa084', '#f4483e', '#961428']);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: EYEL, k: 1 }, { x: 0, y: 0, r: 60, ramp: FOOT, k: 0.4 }, { x: 0, y: 0, r: 0, ramp: EYEL, k: 0.9 }];
  const RIM_R = [0, 12, 20, 30], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[CG], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(256) };
  RIM.skip[EY1] = RIM.skip[EY2] = RIM.skip[EY3] = RIM.skip[HRED] = RIM.skip[INK] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手、锤的朝向（ma，屏幕角度：0 朝右、-π/2 朝上）、双手握锤（g2）、帽尖摆（hs）、
  // 抛瓶相位（jug）、气球（bal 大小、balUp 放飞）、鼓腮（puff）、远侧手画在脸前（ff）、下沉（sink）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'ma', 'g2', 'hs', 'eyes', 'glow', 'puff', 'bal', 'balUp', 'jug', 'flash', 'dq', 'hot', 'sink', 'ff'];
  const K = {
    idle: { nx: 34, ny: -20, fx2: -34, fy2: -32, lean: 0, hd: 0, ma: -1.45 },
    up: { nx: -24, ny: -50, fx2: -30, fy2: -46, lean: -0.12, hd: -0.2, ma: -2.3 },        // 大锤点名：锤抡到左后上方，后仰
    slam: { nx: 34, ny: -16, fx2: 26, fy2: -18, lean: 0.36, hd: 0.28, ma: 0.5 },
    swingW: { nx: -24, ny: -24, fx2: -20, fy2: -22, lean: 0.06, hd: 0.12, ma: 3.0 },     // 抡锤：锤拖到左后下方
    swing: { nx: 46, ny: -32, fx2: -40, fy2: -46, lean: 0.22, hd: 0.12, ma: -0.05 },
    pokeW: { nx: 2, ny: -28, fx2: -6, fy2: -28, lean: -0.1, hd: -0.06, ma: 0.08 },         // 重击：横握锤柄收在胸前
    poke: { nx: 44, ny: -30, fx2: 10, fy2: -26, lean: 0.32, hd: 0.2, ma: 0.02 },
    chopW: { nx: 46, ny: -46, fx2: -34, fy2: -34, lean: -0.08, hd: -0.1, ma: -1.25 },     // 普攻：锤举到右上 → 往前敲
    chop: { nx: 48, ny: -20, fx2: -32, fy2: -30, lean: 0.2, hd: 0.12, ma: 0.4 },
    bal: { nx: 34, ny: -20, fx2: -48, fy2: -44, lean: -0.06, hd: -0.12, ma: -1.45 },       // 气球：远侧手举起一把线
    balR: { nx: 38, ny: -22, fx2: -52, fy2: -60, lean: -0.14, hd: -0.3, ma: -1.4 },
    hunch: { nx: 30, ny: -60, fx2: 17, fy2: -62, lean: 0.28, hd: 0.3, ma: 1.3 },          // 第二阶段：双手捂脸
    wide: { nx: 46, ny: -58, fx2: -46, fy2: -56, lean: -0.1, hd: -0.25, ma: -1.2 },       // 「当当！」张开双臂举锤
    climbA: { nx: 34, ny: -8, fx2: -28, fy2: 2, lean: 0.28, hd: 0.22, ma: 0.15 },
    climbB: { nx: 32, ny: 2, fx2: -28, fy2: -12, lean: 0.28, hd: 0.22, ma: 0.15 },
    agony: { nx: 40, ny: -62, fx2: -42, fy2: -66, lean: -0.18, hd: -0.4, ma: -1.1 },
    limp: { nx: 28, ny: 4, fx2: -24, fy2: 4, lean: 0.42, hd: 0.55, ma: 0.8 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ma'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.by = -b; P.hs = [0, 0.5, 1, 0.5, 0, -0.5][Math.floor(tt / 0.3) % 6]; P.eyes = (f12 % 9 === 0 || f12 % 13 === 0) ? 2 : 1;
      P.jug = 1 + ((tt / 0.9) % 1); const ph = (tt / 0.9 * 3) % 1; P.fy2 += ph < 0.25 ? -2 : 0;   // 单手抛三只瓶，抛的那一下手往上一送
      P.ma += (Math.floor(tt / 0.6) & 1) ? 0.06 : 0;                                              // 锤在手里一点一点
      const lp = tt % DUR[IDLE]; if (lp >= 1.5 && lp < 2.1) { P.hd = -0.16; P.lean = -0.03; P.jaw = ((f12 >> 1) & 1) ? 1 : 0; P.eyes = 2; P.hs = ((f12 >> 1) & 1) ? 1.5 : -1; } };   // 待机个性：歪头咯咯笑，帽铃乱晃
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.hs = f < 2 ? 1 : -1; P.eyes = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { pose(K.idle, K.chopW, ease.out(tq / 0.17)); P.jaw = 1; }
      else if (tq < 0.25) { pose(K.chopW, K.chopW); P.glow = 2; P.jaw = 1; P.hs = -1; }
      else if (tq < 0.42) { pose(K.chop, K.chop); P.jaw = 2; P.glow = 3; P.eyes = 2; P.hs = 1.5; }
      else pose(K.chop, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.3; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.hs = -2; P.nx -= 4; P.fx2 -= 4; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.hs = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.hs = (f12 & 1) ? 2 : -1; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 1; P.eyes = d < 1.2 ? 2 : 1; P.hs = 1.5 * (1 - clamp01((d - 0.7) / 0.6)); }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = 0; P.eyes = 0; P.hs = 2; P.sink = Math.round(clamp01((d - 1.5) / 1.0) * 40); P.dq = d > 2.1 ? Math.round(clamp01((d - 2.1) / 0.5) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    if (P.hot && st !== DEATH && P.jaw < 1) P.jaw = 1;   // 第二阶段嘴一直咧着，露出两排牙
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = L.fcs[0]; P.gy = L.fcs[1];
  }
  const MVI = { mallet: 0, swing: 1, balloons: 2, poke: 3, rise: 4, p2: 5 };
  const shiver = (f12) => (f12 & 1) ? 1 : -1;
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'mallet' || MV === 'swing' || MV === 'poke') {
      const W = MV === 'mallet' ? K.up : MV === 'swing' ? K.swingW : K.pokeW, S = MV === 'mallet' ? K.slam : MV === 'swing' ? K.swing : K.poke;
      if (st === CHARGE) {
        const e = ease.out(clamp01(q / 0.5)); pose(K.idle, W, e); P.g2 = q > 0.15 ? 1 : 0;
        P.by = -Math.round((MV === 'mallet' ? 3 : MV === 'swing' ? 1 : 2) * e);
        if (q > 0.5) { P.nx += shiver(f12); P.by += (f12 & 1); P.hs = shiver(f12) * 1.5; } else P.hs = -1.2 * e;
        P.glow = q < 0.5 ? 2 : 3; P.eyes = q > 0.4 ? 2 : 1; P.jaw = q > 0.75 ? 2 : 1;
        if (MV === 'mallet' && q > 0.8) { P.lean -= 0.04; P.ma -= 0.08; }   // 最后再往后拉一下
      } else if (st === CAST) { pose(S, S); P.g2 = MV === 'swing' ? 0 : MV === 'mallet' ? 1 : 0; P.by = MV === 'mallet' ? 4 : 1; P.jaw = 3; P.glow = 3; P.eyes = 2; P.hs = 2; }
      else { pose(S, K.idle, ease.inOut(clamp01(tq / 0.55))); P.g2 = MV === 'mallet' && tq < 0.25 ? 1 : 0; P.by = MV === 'mallet' ? Math.round(4 * (1 - clamp01(tq / 0.55))) : 0; P.jaw = tq < 0.3 ? 2 : 1; P.hs = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'balloons') {
      if (st === CHARGE) { pose(K.idle, K.bal, ease.out(clamp01(q / 0.3))); P.bal = Math.max(1, Math.min(4, 1 + Math.floor(q / 0.85 * 3.99))); P.puff = q > 0.18 && q < 0.9 && ((f12 >> 1) % 3 !== 2) ? 1 : 0; P.jaw = P.puff ? 0 : 1; P.eyes = q > 0.6 ? 2 : 1; P.glow = q < 0.5 ? 1 : 2; P.hd += P.puff ? -0.06 : 0; P.hs = P.puff ? -0.5 : 0.5; }
      else if (st === CAST) { pose(K.bal, K.balR, ease.out(clamp01(tq / 0.12))); P.bal = 4; P.balUp = Math.round(tq * 70); P.jaw = ((f12 >> 1) & 1) ? 3 : 2; P.glow = 3; P.eyes = 2; P.hs = ((f12 >> 1) & 1) ? 2 : -1; }
      else { pose(K.balR, K.idle, ease.inOut(clamp01(tq / 0.6))); P.jaw = tq < 0.35 ? ((f12 >> 1) & 1) + 1 : 0; P.hs = tq < 0.35 ? 1 : 0; }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.hs = f < 2 ? 1 : -1; P.eyes = q > 0.6 ? 2 : 1; P.glow = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hs = ((f12 >> 1) & 1) ? 2 : -2; }
      else { pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6))); P.jaw = tq < 0.3 ? 2 : 0; }
    } else {   // p2：双手捂脸、肩膀笑得一抽一抽 → 张开双臂仰天狂笑，白脸裂开透红光
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.2))); P.ff = tq > 0.1 ? 1 : 0; const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 2 : 0; P.lean += hb ? 0.05 : 0; P.hs = hb ? 1.5 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.hs = ((f12 >> 1) & 1) ? 2 : -2; P.hd -= 0.08; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.hd -= hold ? 0.08 : 0; P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 1; P.glow = 3; P.eyes = 2; P.hot = 1; P.hs = hold ? (((f12 >> 1) & 1) ? 1.5 : -1.5) : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const elbow = (a, b) => { const e1 = B.ik(a, b, 20, 20, 1), e2 = B.ik(a, b, 20, 20, -1); return e1[1] >= e2[1] ? e1 : e2; };   // 肘总是往下弯
  const SHN = [20, -37], SHF = [-17, -37], NECK = [2, -44];
  function torsoXf() { B.reset(); B.move(0, P.by + P.sink); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.45 - P.lean * 0.55); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(2, -26);
    headXf(); L.eyeN = B.at(13, -66); L.eyeF = B.at(-3, -66); L.mouth = B.at(6, -52); L.head = B.at(5, -66); L.hatTop = B.at(0, -96);
    const by = P.by + P.sink; L.hN = [P.nx, P.ny + by]; L.md = [Math.cos(P.ma), Math.sin(P.ma)];
    L.mh = [L.hN[0] + L.md[0] * 29, L.hN[1] + L.md[1] * 29];
    L.hF = P.g2 ? [L.hN[0] - L.md[0] * 7, L.hN[1] - L.md[1] * 7] : [P.fx2, P.fy2 + by];
    L.elN = elbow(L.shN, L.hN); L.elF = elbow(L.shF, L.hF);
    L.pins = []; if (P.jug) for (let i = 0; i < 3; i++) { const ph = (P.jug - 1 + i / 3) % 1, h = L.hF;
      if (ph < 0.78) { const u = ph / 0.78; L.pins.push([h[0] + 3 - 11 * u, h[1] - 4 - 104 * u * (1 - u), -1.57 + u * 12.566]); } else { const u = (ph - 0.78) / 0.22; L.pins.push([h[0] - 8 + 11 * u, h[1] - 3, -1.2]); } }
    const nb = HOT ? 3 : 2, r = 3 + P.bal * 1.9; L.bals = [];
    if (P.bal) for (let i = 0; i < nb; i++) { const o = [[-14, -24], [4, -30], [-5, -42]][i]; L.bals.push([L.hF[0] + o[0] * (0.6 + P.bal * 0.1), L.hF[1] + o[1] * (0.6 + P.bal * 0.1) - P.balUp * (1 + i * 0.15), r * (i === 2 ? 0.85 : 1)]); }
    L.fcs = P.bal ? [L.bals[0][0], L.bals[0][1]] : (P.st === CHARGE && MV !== 'p2' && MV !== 'rise') ? L.mh : L.head;
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  // 小丑帽：三根软尖（远侧黑、中间红、近侧红），每根尖上一颗金铃；hs 让尖子左右甩
  const PRONG = { far: [[-4, -79], [-15, -87], [-26, -88], [-33, -82], [-35, -74]], mid: [[5, -82], [4, -89], [0, -94], [-7, -95], [-12, -89]], near: [[14, -79], [25, -87], [36, -87], [42, -80], [43, -72]] };
  function prong(key, m, band) {
    part(); headXf(); const pts = PRONG[key].map(([x, y], i) => [x + P.hs * i * 0.8, y + Math.abs(P.hs) * i * 0.25]);
    B.strand(E, pts, 5.2, 1.6, m);
    for (let i = 1; i < pts.length - 1; i++) B.ln(E, pts[i][0], pts[i][1] - 2, pts[i + 1][0], pts[i + 1][1] - 2, m, 8);   // 布面的高光
    B.ln(E, pts[1][0] - 1, pts[1][1] + 3, pts[1][0] + 1, pts[1][1] - 4, band, 0);                                     // 金色的滚边
    const tp = pts[pts.length - 1]; part(); B.ell(E, tp[0], tp[1] + 3, 2.8, 2.8, 0, GOLD); B.ln(E, tp[0] - 2, tp[1] + 4, tp[0] + 2, tp[1] + 4, GOLD, 10); B.px(E, tp[0] - 1, tp[1] + 2, GOLD, 9);   // 金铃
    if (P.hot) B.px(E, tp[0], tp[1] + 5, EY2);
  }
  function hatCap() {   // 帽身（黑红两半）+ 一圈金冠齿（冠齿中间嵌红宝石，第二阶段发红光）
    part(); headXf(); B.ell(E, 5, -78, 20, 7, 0, SUIT); B.poly(E, [[5, -86], [25, -82], [25, -73], [5, -73]], RED);
    B.ln(E, -10, -81, 2, -84, SUIT, 8); B.ln(E, 8, -84, 18, -83, RED, 8);
    part(); for (const x of [-9, -2, 5, 12, 19]) { const c = x === 5 ? 2 : 0; B.poly(E, [[x - 2.6, -74], [x, -81 - c], [x + 2.6, -74]], GOLD); B.px(E, x, -79 - c, GOLD, 9); }
    B.strand(E, [[-15, -69], [-6, -74], [5, -75.5], [16, -74], [25, -69]], 2.4, 2.4, GOLD); B.ln(E, -6, -75, 16, -75, GOLD, 8);
    for (const x of [-5, 5, 15]) { const g = P.hot || P.glow >= 3 ? HRED : RED; B.px(E, x, -74, g, P.hot ? 0 : 9); B.px(E, x + 1, -74, g, P.hot ? 0 : 7); }
  }
  function hair() {   // 两团炸开的橙红卷发
    part(); headXf(); for (const [x, y, r] of [[-16, -71, 5.2], [-21, -65, 4.8], [-18, -58, 4], [-23, -71, 3.6]]) B.ell(E, x, y, r, r, 0, HAIRD);
    for (const [x, y] of [[-18, -72], [-22, -65], [-19, -58]]) B.ln(E, x - 1, y + 1, x + 1, y - 1, HAIRD, 3);
    part(); headXf(); for (const [x, y, r] of [[26, -72, 5.2], [30, -65, 5], [27, -58, 4.2], [32, -72, 3.6]]) B.ell(E, x, y, r, r, 0, HAIR);
    for (const [x, y] of [[27, -73], [31, -65], [28, -58], [32, -73]]) { B.ln(E, x - 1, y + 1, x + 1, y - 1, HAIR, 3); B.px(E, x - 1, y - 2, HAIR, 8); }
  }
  const upY = (u) => -59.5 + 8.5 * Math.pow(Math.sin(Math.PI * u), 0.8);    // 大笑嘴的上沿：两个嘴角翘到耳朵根
  function face() {
    part(); headXf(); const J = Math.round(P.jaw * 1.5);
    B.ell(E, 5, -63, 19, 15.5, 0, FACE); B.ell(E, 5, -53 + J * 0.6, 16, 8 + J * 0.5, 0, FACE);
    if (P.puff) { B.ell(E, -10, -56, 6, 5.6, 0, FACE); B.ell(E, 21, -56, 6.4, 6, 0, FACE); }
    B.ell(E, -6, -58, 3, 2, 0.3, FACE, 7); B.ell(E, 19, -58, 3, 2, -0.3, FACE, 7); B.ln(E, 0, -71, 10, -71, FACE, 8);   // 颧骨、额头的高光
    // 眼妆：竖着的黑菱形，里面一颗发黄光的眼珠（第二阶段外面一圈红眼圈）
    B.poly(E, [[-3, -74], [1, -66], [-3, -57.5], [-7, -66]], INK); B.poly(E, [[13, -75], [17.5, -66], [13, -56.5], [8.5, -66]], INK);
    B.ln(E, -3, -76, -3, -74, INK); B.ln(E, 13, -77, 13, -75, INK);
    if (P.eyes) { const ey = P.eyes >= 2 ? EY3 : EY2, ec = P.eyes >= 2 ? EY2 : EY1;
      if (P.hot) { B.ell(E, -3, -66, 2.2, 2.6, 0, HRED); B.ell(E, 13, -66, 2.6, 3, 0, HRED); }
      B.ell(E, -3, -66, 1.4, 1.8, 0, ec); B.ell(E, 13, -66, 1.8, 2.2, 0, ec); B.px(E, -3, -67, ey); B.px(E, 13, -67, ey); B.px(E, 14, -67, ey); B.px(E, 13, -66, ey); }
    else { B.ln(E, -5, -66, -1, -66, FACE, 6); B.ln(E, 11, -66, 15, -66, FACE, 6); }   // 被打的一瞬间：眼睛挤成一条缝
    if (P.hot) { B.ln(E, -3, -57, -3, -54, INK); B.ln(E, 13, -56, 13, -54, INK);   // 眼妆往下淌
      for (const c of [[[1, -77], [3, -72], [1, -69]], [[20, -75], [22, -70], [21, -66]], [[-12, -63], [-14, -58]], [[23, -61], [24, -57]]]) for (let i = 1; i < c.length; i++) { B.ln(E, c[i - 1][0] + 1, c[i - 1][1], c[i][0] + 1, c[i][1], FACE, 2); B.ln(E, c[i - 1][0], c[i - 1][1], c[i][0], c[i][1], HRED); } }   // 裂缝透红光
    // 大笑嘴：上沿、下沿（张开时中间往下拉），外面一圈画到耳朵根的红油彩，里面上下两排牙
    const N = 19, up = [], lo = [], x0 = -14.5, x1 = 26.5, hMax = 2.4 + J * 2.3;
    for (let i = 0; i <= N; i++) { const u = i / N, x = x0 + (x1 - x0) * u, s = Math.pow(Math.sin(Math.PI * u), 0.7); up.push([x, upY(u)]); lo.push([x, upY(u) + hMax * s]); }
    const outer = [[x0 - 1.5, -63], ...up.map(([x, y], i) => [x, y - 1.7 - 0.8 * Math.sin(Math.PI * i / N)]), [x1 + 1.5, -63], ...lo.slice().reverse().map(([x, y], i) => [x, y + 1.7 + 1.3 * Math.sin(Math.PI * (N - i) / N)])];
    B.poly(E, outer, LIP); B.ln(E, x0 - 1.5, -63, x0 + 1, -60, LIP, 7); B.ln(E, x1 + 1.5, -63, x1 - 1, -60, LIP, 7);
    for (let i = 3; i < N - 2; i += 2) B.px(E, up[i][0], up[i][1] - 2, LIP, 8);                                                    // 上唇的高光
    B.poly(E, [...up, ...lo.slice().reverse()], INK);
    if (J >= 2) B.ell(E, 7, lo[10][1] - 1.5, 4.5, 1.8, 0, RED, 2);                                                                  // 舌头
    for (let i = 2; i < N - 1; i++) { const [x, y] = up[i], hh = lo[i][1] - y; if (hh < 0.8) continue; const tl = Math.min(hh, J ? 1.6 + J * 0.3 : 2.4);
      B.ln(E, x, y, x, y + tl - (J ? 0.5 : 0), FACE, i & 1 ? 8 : 7); if (J) { const [lx, ly] = lo[i]; if (i & 1) B.ln(E, lx, ly, lx, ly - Math.min(hh * 0.4, 1.8), FACE, 7); } }   // 牙：闭嘴是一排咬着的白牙，张嘴上下两排尖牙
    // 红鼻子
    part(); B.ell(E, 8, -58.5, 4.2, 3.8, 0, RED); B.px(E, 6, -61, RED, 9); B.px(E, 7, -61, RED, 8); B.px(E, 6, -60, RED, 8);
  }
  function ruff() {   // 两层褶领：后面一圈红、前面一圈白，褶子一道道
    part(); torsoXf(); B.ell(E, 2, -42, 29, 7, 0, RED); for (let x = -25; x <= 29; x += 4) B.ell(E, x, -37, 2.3, 1.9, 0, RED);
    for (let x = -24; x <= 28; x += 4) B.ln(E, x, -47, x * 1.08, -37, RED, 3);
    part(); B.ell(E, 3, -43, 25, 6, 0, RUFF); for (let x = -21; x <= 25; x += 3) B.ln(E, x, -47, x * 1.1 + 0.5, -38, RUFF, 2);
    for (let x = -20; x <= 25; x += 3) B.px(E, x * 1.05, -46, RUFF, 8);
  }
  function torso() {   // 黑红菱格的戏服（逐格铺，菱格跟着身体转），前襟三颗金绒球
    part(); torsoXf();
    B.poly(E, [[-17, 6], [19, 6], [22, -8], [21, -20], [-19, -20], [-20, -8]], SUIT); B.ell(E, 1, -22, 22, 18, 0, SUIT); B.ell(E, 1, -34, 19, 8, 0, SUIT);
    const Z = B.Z(), s = SPR, c0 = B.at(1, -22), ci = (Math.round(c0[1] * Z) + s.oy) * s.w + Math.round(c0[0] * Z) + s.ox, tp = s.part[ci];
    for (let py = Math.floor(-72 * Z); py <= 8 * Z; py++) for (let qx = Math.floor(-45 * Z); qx <= 50 * Z; qx++) { const X = qx + s.ox, Y = py + s.oy; if (X < 0 || Y < 0 || X >= s.w || Y >= s.h) continue;
      const i = Y * s.w + X; if (s.mat[i] !== SUIT || s.part[i] !== tp) continue; const [u, v] = B.inv(qx / Z, py / Z), a = u / 5.5, b = (v + 1) / 6.5, m = (a + b) / 2, n = (a - b) / 2, m0 = Math.round(m), n0 = Math.round(n);
      if (((m0 + n0) & 1) && Math.max(Math.abs(m - m0), Math.abs(n - n0)) < 0.44) E.sp(qx, py, REDD); }
    B.ln(E, -18, -12, -11, -6, SUIT, 3); B.ln(E, 20, -12, 13, -6, SUIT, 3);
    part(); for (const y of [-31, -21, -11]) { B.ell(E, 2, y, 3, 2.8, 0, GOLD); B.px(E, 1, y - 1, GOLD, 9); }
  }
  function stripes(a, b, r, m) { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l, d[0] / l], u = [d[0] / l, d[1] / l];
    for (const q of [0.28, 0.68]) { const p = [a[0] + d[0] * q, a[1] + d[1] * q], rr = r * 0.92; for (const o of [-0.8, 0.4]) lnW(p[0] + n[0] * rr + u[0] * o, p[1] + n[1] * rr + u[1] * o, p[0] - n[0] * rr + u[0] * o, p[1] - n[1] * rr + u[1] * o, m); } }
  function arm(side) {   // 红白条纹的泡泡袖、白褶袖口、白手套
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? REDD : RED, w = far ? FACED : FACE;
    part(); capW(sh[0], sh[1], el[0], el[1], 7, 5.6, m); capW(el[0], el[1], h[0], h[1], 5.4, 4.2, m);
    stripes(sh, el, 6.2, w); stripes(el, h, 4.8, w); dot((sh[0] + el[0]) / 2 - 1, (sh[1] + el[1]) / 2 - 2, 2.2, m, 7);
    const wr = [el[0] + (h[0] - el[0]) * 0.82, el[1] + (h[1] - el[1]) * 0.82];
    part(); dot(wr[0], wr[1], 4.4, far ? FACED : RUFF); lnW(wr[0] - 3, wr[1], wr[0] + 3, wr[1], far ? FACED : RUFF, 3);
    part(); dot(h[0], h[1], 4.4, w); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]);
    const th = [h[0] + Math.cos(dir - 1.6 * side) * 3.6, h[1] + Math.sin(dir - 1.6 * side) * 3.6]; dot(th[0], th[1], 1.9, w);
    for (let i = -1; i <= 1; i++) { const a = dir + i * 0.5; lnW(h[0] + Math.cos(a) * 1.5, h[1] + Math.sin(a) * 1.5, h[0] + Math.cos(a) * 4, h[1] + Math.sin(a) * 4, w, 3); }
    dot(h[0] - 1, h[1] - 1.5, 1.2, w, 8);
  }
  function mallet() {   // 马戏大木锤：木柄、金箍，红白条的锤头
    const h = L.hN, d = L.md, n = [-d[1], d[0]], c = L.mh, bt = [h[0] - d[0] * 9, h[1] - d[1] * 9], hc = [c[0] - d[0] * 7, c[1] - d[1] * 7];
    part(); capW(bt[0], bt[1], hc[0], hc[1], 2, 1.8, WOOD); lnW(bt[0] + n[0] * 0.7, bt[1] + n[1] * 0.7, hc[0] + n[0] * 0.7, hc[1] + n[1] * 0.7, WOOD, 7); dot(bt[0], bt[1], 2.4, GOLD); dot(hc[0], hc[1], 2.2, GOLD);
    const a = [c[0] - n[0] * 13, c[1] - n[1] * 13], b = [c[0] + n[0] * 13, c[1] + n[1] * 13];
    part(); capW(a[0], a[1], b[0], b[1], 8.4, 8.4, RED);
    const band = (s0, s1, r, m, t) => polyW([[c[0] + n[0] * s0 - d[0] * r, c[1] + n[1] * s0 - d[1] * r], [c[0] + n[0] * s1 - d[0] * r, c[1] + n[1] * s1 - d[1] * r], [c[0] + n[0] * s1 + d[0] * r, c[1] + n[1] * s1 + d[1] * r], [c[0] + n[0] * s0 + d[0] * r, c[1] + n[1] * s0 + d[1] * r]], m, t);
    band(-3.8, 3.8, 8.2, FACE);                                                                                                          // 中间一道白箍
    lnW(a[0] - d[0] * 4.8, a[1] - d[1] * 4.8, b[0] - d[0] * 4.8, b[1] - d[1] * 4.8, RED, 8); lnW(a[0] - d[0] * 5.4, a[1] - d[1] * 5.4, b[0] - d[0] * 5.4, b[1] - d[1] * 5.4, RED, 7);   // 锤身的高光
    lnW(c[0] - n[0] * 3.4 + d[0] * 5, c[1] - n[1] * 3.4 + d[1] * 5, c[0] + n[0] * 3.4 + d[0] * 5, c[1] + n[1] * 3.4 + d[1] * 5, FACE, 3);
    part(); band(-11.4, -9.2, 9, GOLD); part(); band(9.2, 11.4, 9, GOLD);                                                            // 两道金箍
    part(); for (const s of [-1, 1]) { const e = [c[0] + n[0] * s * 14.6, c[1] + n[1] * s * 14.6]; dot(e[0], e[1], 2.4, GOLDD); }        // 锤两头的金钉
    if (P.st === CHARGE && P.glow >= 3) { part(); dot(c[0] - d[0] * 5, c[1] - d[1] * 5, 1.4, EY3); }
  }
  function pin(x, y, a) {   // 保龄瓶：白瓶身、红瓶颈
    part(); const d = [Math.cos(a), Math.sin(a)], p = (k) => [x + d[0] * k, y + d[1] * k];
    const h0 = p(-6), h1 = p(0.5), b = p(2.6), t = p(6); capW(h0[0], h0[1], h1[0], h1[1], 1, 1.5, FACE); dot(b[0], b[1], 2.9, FACE); capW(b[0], b[1], t[0], t[1], 2.5, 1.1, FACE);
    const s = p(-0.8); for (const o of [0, 1]) lnW(s[0] - d[1] * 1.6 + d[0] * o, s[1] + d[0] * 1.6 + d[1] * o, s[0] + d[1] * 1.6 + d[0] * o, s[1] - d[0] * 1.6 + d[1] * o, RED); dot(h0[0], h0[1], 1.4, RED);
  }
  function balloons() {   // 远侧手里的一把线，线头上鼓起来的气球（红、金，第二阶段多一只白的）
    const h = L.hF, mats = [RED, GOLD, FACE];
    if (!P.balUp) { part(); for (const b of L.bals) lnW(h[0], h[1] - 2, b[0], b[1] + b[2] * 1.15 + 1, FACED, 2); }
    L.bals.forEach((b, i) => { part(); B.reset(); B.ell(E, b[0], b[1], b[2], b[2] * 1.18, 0, mats[i]); B.ell(E, b[0] - b[2] * 0.38, b[1] - b[2] * 0.5, b[2] * 0.22, b[2] * 0.36, -0.4, mats[i], 9);
      px(b[0], b[1] + b[2] * 1.18 + 0.5, mats[i], 3); if (P.balUp) lnW(b[0], b[1] + b[2] * 1.2 + 1, b[0] + 2, b[1] + b[2] * 1.2 + 8, FACED, 2); });
  }

  let SPR = hero;
  function drawHero(spr, z) {
    z = z || 1; SPR = spr || hero; begin(SPR, 0, 0, 4 * z); B.zoom(z); geo();
    const back = L.mh[0] < -4;
    prong('far', CAPF, GOLD); prong('mid', RED, GOLD);
    if (P.bal) balloons();
    if (!P.ff) arm(-1);
    if (back) mallet();
    torso(); ruff(); hair(); face(); hatCap(); prong('near', RED, GOLD);
    if (P.ff) arm(-1);
    if (!back) mallet();
    arm(1);
    for (const p of L.pins) pin(p[0], p[1], p[2]);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.fcs[0] * z + spr.ox; RIM.ry = L.fcs[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = (L.eyeN[0] + L.eyeF[0]) / 2 * z + spr.ox; LIGHTS[0].y = L.eyeN[1] * z + spr.oy; LIGHTS[0].r = (P.eyes >= 2 ? 12 : P.eyes ? 7 : 0) * z; LIGHTS[0].ramp = P.hot ? REDL : EYEL;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 20 * z; LIGHTS[1].r = 62 * z; LIGHTS[1].k = P.hot ? 0.52 : 0.4;                               // 舞台脚灯从下面照上来
    const chg = P.st === CHARGE && MV !== 'p2' && MV !== 'rise';
    LIGHTS[2].x = L.fcs[0] * z + spr.ox; LIGHTS[2].y = L.fcs[1] * z + spr.oy; LIGHTS[2].r = (chg ? 8 + P.glow * 4 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、咧嘴露两排牙、眼珠发光、锤举在身边、远侧手还在抛瓶（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.3); P.hd = 0.02; P.lean = 0; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.by = 0; P.hs = 0.8; P.jug = 1.2;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(5, -72); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 40 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连帽子）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function confetti(x, y, n, up, spread) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * (spread || 10), y, (Math.random() - 0.5) * 160, -(up || 100) - Math.random() * 120, 1.0 + Math.random() * 0.7, pick(CONF), { g: 150, floor: HY + 4 }); }
  let emT = 0, lastT = 0, lastS = -1;
  function onEnter(s) {
    if (s === CHARGE) {
      if (MV === 'mallet') { sfx('boss', { k: 'clownWhistle', w: 0.9 }); sfx('boss', { k: 'clownBells', w: 0.5 }); }
      else if (MV === 'swing') { sfx('boss', { k: 'growl', w: 0.5 }); sfx('boss', { k: 'clownBells', w: 0.7 }); }
      else if (MV === 'balloons') sfx('boss', { k: 'clownInflate', w: 1 });
      else if (MV === 'poke') sfx('boss', { k: 'clownBells', w: 0.6 });
      else if (MV === 'rise') sfx('boss', { k: 'clownRoll', w: 1 });
      else if (MV === 'p2') { sfx('boss', { k: 'heartbeat', w: 1 }); sfx('boss', { k: 'clownGiggle', w: 1 }); }
    }
    if (s === CAST) {
      if (MV === 'mallet') slamFx();
      else if (MV === 'swing') { const sh = L.shN, m = L.mh; fx.slash(sx(sh[0]), sy(sh[1]), 46, -1.3, 2.1, CR, 0.26, 3, 2); fx.slash(sx(sh[0]), sy(sh[1]), 36, -1.0, 1.9, CW, 0.2, 2, 2);
        burst(sx(m[0]), sy(m[1]), 18, 60, 160, 0.25, 0.5, CR, 20); confetti(sx(m[0]), sy(m[1]), 10, 60); shake(0.3, 3); flash(0.06); sfx('swing', { kind: 'smash', w: 1 }); sfx('impact', { pal: 'blood', w: 0.8 }); sfx('boss', { k: 'clownHonk', w: 0.6 }); }
      else if (MV === 'poke') { const m = L.mh; ring(sx(m[0] + 8), sy(m[1]), 1, CR); fx.cross(sx(m[0] + 10), sy(m[1]), 10, CG, 0.3, 2); burst(sx(m[0] + 8), sy(m[1]), 20, 60, 170, 0.25, 0.5, CG, 10);
        shake(0.3, 3); flash(0.06); sfx('impact', { pal: 'blood', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); sfx('boss', { k: 'clownHonk', w: 1 }); }
      else if (MV === 'balloons') { for (const b of L.bals) { ring(sx(b[0]), sy(b[1]), 0, CG); burst(sx(b[0]), sy(b[1]), 10, 30, 90, 0.3, 0.6, CG, 40); } confetti(sx(L.hF[0]), sy(L.hF[1] - 10), 16, 80); shake(0.2, 2); flash(0.06);
        sfx('boss', { k: 'clownBoing', w: 1 }); sfx('boss', { k: 'clownLaugh', w: 0.7 }); }
      else if (MV === 'rise' || MV === 'p2') { const e = L.mouth, p2 = MV === 'p2'; ring(sx(e[0]), sy(e[1]), 1, p2 ? CR : CG); ring(sx(2), sy(-40), 1, p2 ? CR : CG); flash(0.12); shake(0.4, 3);
        fx.pillar(sx(2), sy(-128), sy(2), 30, p2 ? CR : CG, 0.9, 0); for (let i = 0; i < 44; i++) spawnX(K_PHYS, sx(-60 + Math.random() * 120), sy(-110 - Math.random() * 20), (Math.random() - 0.5) * 40, 10 + Math.random() * 30, 1.2 + Math.random() * 0.6, pick(CONF), { g: 60, floor: HY + 4 });
        sfx('boss', { k: 'clownLaugh', w: 1 }); sfx('boss', { k: p2 ? 'roar' : 'clownFanfare', w: p2 ? 0.6 : 1 }); sfx('impact', { pal: p2 ? 'blood' : 'holy', w: 1 }); }
    }
    lastS = s; lastT = 0;
  }
  function slamFx() {
    const m = L.mh, x = sx(m[0]), y = HY;
    fx.wave(x, y, 1, 44, 8, CR, 0.5, 2); fx.wave(x, y, -1, 34, 6, CG, 0.45, 2); fx.crack(x, y, 22, 1, CG, 1.2); fx.crack(x, y, 14, -1, CG, 1.0); fx.cross(x, y - 12, 14, CG, 0.35, 2);
    burst(x, y - 4, 22, 60, 180, 0.35, 0.8, CG, 50); confetti(x, y - 6, 26, 140, 16); for (let i = 0; i < 6; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, y - 3, (Math.random() - 0.5) * 140, -80 - Math.random() * 120, 1.0, CW, { g: 320, floor: HY + 2 });   // 舞台木板的碎片
    ring(x, HY - 2, 1, CG); ring(x, HY - 2, 1, CR); shake(0.4, 3); flash(0.08); sfx('impact', { pal: 'blood', w: 1 }); sfx('boss', { k: 'clownSlam', w: 1 }); sfx('boss', { k: 'clownHonk', w: 0.8 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'clownBells', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { const m = L.mh; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 38, 0.2, 2.4, CR, 0.22, 3, 2); burst(sx(m[0]), sy(m[1]), 16, 50, 140, 0.25, 0.5, CG, 20); confetti(sx(m[0]), sy(m[1]), 6, 60); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); sfx('boss', { k: 'clownHonk', w: 0.4 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'clownHonk', w: 0.5 });
    if (s === RECOVER && t === 0.25 && MV === 'p2') sfx('boss', { k: 'clownLaugh', w: 0.8 });
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'clownDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(2), sy(-50), 30, 60, 180, 0.4, 0.9, CR, 30); ring(sx(2), sy(-50), 1, CR); confetti(sx(2), sy(-60), 30, 120, 30); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'clownPop', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 36; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-4 - Math.random() * 40), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i & 1 ? FXI.dust : CR); spawn(K_RISE, sx(-30), sy(-60), 4, -30, 2.5, CR); sfx('boss', { k: 'sink', w: 0.8 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt; const pT = state === lastS ? lastT : 0; lastS = state; lastT = stT; const cross = (x) => pT < x && stT >= x;
    if (emT > (P.hot ? 0.07 : 0.16)) { emT = 0; const hot = P.hot && Math.random() < 0.5;   // 追光里一直往下飘的金粉（第二阶段混进红色的）
      spawnX(K_PHYS, sx(-40 + Math.random() * 80), sy(-100 - Math.random() * 10), (Math.random() - 0.5) * 10, 8 + Math.random() * 8, 1.6 + Math.random() * 0.8, hot ? CR : CG, { g: 10, floor: HY + 2 });
      if (hot) spawn(K_EMBER, sx(L.head[0] - 10 + Math.random() * 20), sy(L.head[1] - 6), (Math.random() - 0.5) * 8, -12, 0.5, CR); }
    if (state === CHARGE && MV === 'mallet' && Math.random() < 0.6) { const c = L.mh, a = Math.random() * 6.2832, r = 10 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, CG, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'swing' && Math.random() < 0.5) { const c = L.mh; spawn(K_EMBER, sx(c[0] + (Math.random() - 0.5) * 12), sy(c[1] + 6), 0, -10, 0.4, CR); }
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.4) { const c = L.mh; spawn(K_EMBER, sx(c[0] + 6), sy(c[1] + (Math.random() - 0.5) * 10), 12, 0, 0.35, CG); }
    if (state === CHARGE && MV === 'balloons' && P.bal && Math.random() < 0.4) { const b = L.bals[Math.floor(Math.random() * L.bals.length)], a = Math.random() * 6.2832; spawn(K_EMBER, sx(b[0] + Math.cos(a) * (b[2] + 3)), sy(b[1] + Math.sin(a) * (b[2] + 3)), 0, -6, 0.4, CG); }
    if (state === CHARGE && MV === 'balloons' && cross(0.35)) sfx('boss', { k: 'clownGiggle', w: 0.5 });
    if (state === CHARGE && MV === 'mallet' && cross(E.DUR[CHARGE] * 0.8)) sfx('boss', { k: 'clownBells', w: 1 });
    if (state === CHARGE && MV === 'p2' && cross(0.35)) sfx('boss', { k: 'clownGiggle', w: 1 });
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-30 + Math.random() * 70), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.5 ? CW : CR, { g: 240, floor: HY + 4 }); }   // 扒活板门扒下来的木屑
    if (state === IDLE && cross(1.5)) sfx('boss', { k: 'clownGiggle', w: 0.3 });
    if (state === IDLE && L.pins.length && Math.random() < 0.08) { const p = L.pins[0]; spawn(K_EMBER, sx(p[0]), sy(p[1]), 0, -6, 0.3, CW); }
  }
  function fxReset() { emT = 0; lastT = 0; lastS = -1; }
  function fxBack(f12) {   // 舞台前沿：红白相间的木板边，上面一排走马灯（一亮一暗地跑）
    const x0 = sx(-50), x1 = sx(50), R = FXR[CR], G = FXR[CG], W = FXR[CW];
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { E.put(x, HY + 1, ((x >> 2) & 1) ? R[2] : W[2]); if (x % 5 === 0) E.put(x, HY, (((x / 5) + (f12 >> 1)) & 1) ? G[P.hot ? 0 : 1] : G[3]); }
  }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'mallet'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    clownLaugh: (s, t, w, p) => { for (let i = 0; i < 5; i++) { const tt = t + i * 0.14; s.tone(tt, 'sawtooth', 310 - i * 20, 0.11, 0.06 + 0.04 * w, { to: 230 - i * 16, lp: 1500, pan: p }); s.nz(tt, 0.08, 'bandpass', 1100, 2, 0.035 * w, { pan: p }); }
      s.tone(t, 'square', 150, 0.75, 0.025 * w, { vib: [7, 40, 0.05], lp: 600, pan: p }); },
    clownGiggle: (s, t, w, p) => { for (let i = 0; i < 3; i++) s.tone(t + i * 0.09, 'triangle', 540 - i * 30, 0.07, 0.04 + 0.03 * w, { to: 450 - i * 30, pan: p }); },
    clownHonk: (s, t, w, p) => { const n = w > 0.7 ? 2 : 1; for (let i = 0; i < n; i++) { const tt = t + i * 0.2; s.tone(tt, 'square', 392, 0.16, 0.05 + 0.04 * w, { to: 370, lp: 1800, pan: p }); s.tone(tt, 'sawtooth', 396, 0.16, 0.03 + 0.02 * w, { lp: 1200, pan: p }); } },
    clownBells: (s, t, w, p) => { for (let i = 0; i < 6; i++) s.ring(t + i * 0.035 + s.rnd(0, 0.02), 1900 + s.rnd(-200, 400), 0.25, 0.02 + 0.02 * w, { pan: p, parts: [[1, 1], [2.3, 0.4], [4.1, 0.2]] }); },
    clownWhistle: (s, t, w, p) => { s.tone(t, 'sine', 420, 1.3, 0.05 + 0.03 * w, { to: 1700, slide: 1.2, vib: [6, 25, 0.2], pan: p }); s.riser(t, t + 1.2, 300, 2000, 0.03 * w, { pan: p }); },
    clownInflate: (s, t, w, p) => { for (let i = 0; i < 4; i++) s.nz(t + i * 0.26, 0.2, 'bandpass', 600 + i * 250, 1.5, 0.05 * w, { pan: p }); s.tone(t, 'sine', 200, 1.1, 0.03 * w, { to: 700, slide: 1.1, pan: p }); },
    clownBoing: (s, t, w, p) => { s.tone(t, 'sine', 300, 0.5, 0.07 * w, { to: 1400, slide: 0.45, vib: [18, 60, 0.02], pan: p }); s.nz(t, 0.05, 'highpass', 3000, 0.7, 0.05, { pan: p }); },
    clownPop: (s, t, w, p) => { s.nz(t, 0.05, 'highpass', 2000, 0.7, 0.1 * w, { pan: p }); s.thud(t, 200, 80, 0.06, 0.08 * w, { pan: p }); },
    clownSlam: (s, t, w, p) => { s.timp(t, 38, 0.18 + 0.1 * w, { pan: p }); s.cymbal(t + 0.02, 0.9, 0.05 + 0.04 * w, { pan: p }); s.thud(t, 90, 35, 0.35, 0.2 * w, { pan: p }); },
    clownRoll: (s, t, w, p) => { for (let i = 0; i < 40; i++) s.nz(t + i * 0.05, 0.045, 'bandpass', 1900, 0.9, (0.012 + 0.045 * i / 40) * w, { pan: p }); s.cymbal(t + 2.05, 1.2, 0.08 * w, { pan: p }); },
    clownFanfare: (s, t, w, p) => { [60, 64, 67, 72].forEach((m, i) => s.brass(t + i * 0.1, m, i === 3 ? 0.6 : 0.12, 0.05 * w, { pan: p })); s.cymbal(t + 0.3, 1.0, 0.05 * w, { pan: p }); },
    clownDie: (s, t, w, p) => { [58, 57, 56].forEach((m, i) => s.brass(t + i * 0.42, m, 0.36, 0.06 * w, { pan: p, bright: 1400 })); s.brass(t + 1.26, 55, 1.3, 0.07 * w, { pan: p, bright: 1200 });
      s.tone(t, 'sawtooth', 260, 0.9, 0.035 * w, { to: 120, vib: [5, 50, 0.1], lp: 900, pan: p }); },
  };

  return {
    name: '小丑王', HX, R_EL: CR, DUR, hero, P, GLOW_MATS: [EY1, EY2, EY3, HRED], HIT_POINT: [0, -40], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'blood', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['mallet', 'swing', 'balloons', 'poke', 'rise', 'p2'], MOVE_NAMES: { mallet: '大锤点名', swing: '抡锤', balloons: '气球 / 双气球', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.3, 0.6, 1.6, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.9, 1.3], 'mallet'], [CAST, [0, 2 / 12], 'mallet'], [RECOVER, [0.3], 'mallet'],
      [CHARGE, [0.4, 1.0], 'swing'], [CAST, [0], 'swing'], [RECOVER, [0.25], 'swing'],
      [CHARGE, [0.2, 0.6, 1.1], 'balloons'], [CAST, [0, 3 / 12], 'balloons'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.2, 2.5, 2.7]]],
    SINK: 30, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
