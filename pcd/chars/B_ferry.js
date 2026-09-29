// 血河摆渡人（最终首领，第 8 章「地狱」的血河）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「骷髅兜帽、骷髅灯、船桨；过血河只收一种船费，你身上正好有」；被动 收船费（每秒从每个我方单位吸血回给自己）；
// 船桨（砸离得最近的一路）、划桨（扇形横扫）→ 第二阶段 骷髅灯（船费翻倍）。
// 设定卡 ——
//   剪影：血河上一条窄长的骨船（原点 = 血河面），船头一根往前卷起的大骨刺、船尾一根短的；船中间站着一个又高又瘦的摆渡人，只露上半身。
//         一顶比肩还宽的尖顶破兜帽，帽尖往前耷拉；兜帽里一片漆黑，黑里一张干净的白骷髅脸，眼窝里两粒青白的针尖光（识别点：尖兜帽 + 白骷髅脸）。
//   标志物：一支比人还长的船桨，桨柄顶端一只铜弯钩，钩上用铜链吊着一盏骷髅灯——头骨里烧着一团黄绿的魂火，火从天灵盖冒出来，眼窝、鼻孔和牙缝透光。
//   细节：黑紫的袍、袖口和胸前两条猩红布带；前襟敞开露出肋骨，肋骨里也跳着一小团魂火；脖子上挂一串铜钱（船费）；身后破披风的布条一直在飘。
//   主色：黑紫的袍、冷白的骨、暗红的布带、骨船是泛黄的旧骨；光源是骷髅灯的黄绿魂火（最亮），其次眼里的青白光、血河从下面映上来的红。
//   招式（setMove）：oar 船桨 · row 划桨 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 常亮（第二阶段：灯火更大更白、两颗鬼火骷髅绕着灯转、
//   眼里拖出光尾、天灵盖裂出魂火、布带渗出血光、披风的布条尖上烧着魂火）。
//     船桨：桨叶从前面抡起、翻到头顶后面，桨叶上聚起一团血、鬼火骷髅绕着转 → 整支桨劈进前面的血河（血浪往两边推、血珠飞溅、两道环）。
//     划桨：把桨斜插进身后的血河、身子拧到后面、船往后坐，河里浮出鬼火骷髅 → 一桨往前上方撩出去，一片血浪和三颗骷髅扇形飞出。
//     重击：桨柄往后压、骷髅灯甩到身后、灯火越烧越旺 → 桨柄往前一挑，整盏骷髅灯连链子甩出去砸人（黄绿火光炸开）。
//     升起：从血河底下一桨一桨划上来，先冒出兜帽和船头，再是整条船 → 挺直、把桨竖过头顶，骷髅灯大亮、一圈鬼火骷髅散开，张嘴哀嚎。
//     第二阶段：弓身凑近骷髅灯，灯火和胸口的魂火跟着心跳亮两下 → 猛地后仰、桨竖上天、灯火炸成一大团，骷髅下巴张开尖啸。
//     待机个性：用远侧那只骨手往上弹一枚铜钱（船费），接住。移动：划船（一桨四拍，船一起一伏）。
//     死亡：哀嚎 → 骷髅灯熄灭、人扑倒在船舷上 → 连人带船沉进血河，只剩几缕青白的魂飘上去。
PCD.define('B_ferry', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：袍子压到快黑，骷髅是冷白，灯火才亮得出来 ─────
  // 色板有上限：袍子用共用的 obsidian、布带 hellhide、骨船和灯骷髅 ivory、船身和桨 hide、铜 brass；只有冷白的骷髅骨是自己的
  const R_BONE = ['#08080e', '#171820', '#2a2c36', '#40424c', '#5a5c66', '#767882', '#92949c', '#aeb0b6', '#c8cacc', '#e0e2e0', '#f6f6f0'];
  const ROBE = defDeep('obsidian', { depth: 8, dark: 2, amb: 0.08 }), ROBED = defDeep('obsidian', { depth: 6, dark: 3, amb: 0.06 }), VOIDM = defDeep('obsidian', { depth: 3, dark: 6, amb: 0.02 });
  const TRIM = defDeep('hellhide', { depth: 3, amb: 0.16 }), TRIMD = defDeep('hellhide', { depth: 3, dark: 2, amb: 0.1 });
  const BONE = defDeep(R_BONE, { depth: 5, amb: 0.26 }), BONED = defDeep(R_BONE, { depth: 4, dark: 3, amb: 0.14 });
  const OLDB = defDeep('ivory', { depth: 5, amb: 0.14 }), OLDBD = defDeep('ivory', { depth: 4, dark: 3, amb: 0.1 });
  const HULL = defDeep('hide', { depth: 6, dark: 4, amb: 0.08 }), WOOD = defDeep('hide', { depth: 3, dark: 1, amb: 0.12 }), BRASS = defDeep('brass', { depth: 4, dark: 1, amb: 0.12 });
  const DI = E.DRAMP.ivory, LB = defMat([DI[1], DI[4], DI[7], DI[9]], 1, 0);   // 灯骷髅：不吃灯光的普通材质，不然整颗头骨都被自己的火照成绿的
  // 发光：魂火（黄绿，白 → 淡黄绿 → 黄绿 → 暗绿）、眼睛和鬼火骷髅（青白）、血
  const FL1 = defMat([48, 49, 50, 38], 1, 1), FL2 = defMat([49, 50, 38, 51], 1, 1), FL3 = defMat([50, 38, 51, 21], 1, 1);
  const EYE = defMat([40, 23, 22, 21], 1, 1), EYE2 = defMat([23, 22, 21, 21], 1, 1), GHOST = defMat([40, 41, 22, 21], 1, 1);
  const BLD = defMat([55, 56, 57, 58], 1, 1), BLDD = defMat([55, 55, 56, 57], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { oar: { 3: 1.3, 4: 0.5, 5: 0.7 }, row: { 3: 1.4, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'oar', HOT = 0;   // HOT：第二阶段，灯火常旺、鬼火骷髅绕灯
  const LANT = [38, 50, 49], BLOODL = [57, 56, 55], TEAL = [22, 23, 40];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: LANT, k: 0.8 }, { x: 0, y: 0, r: 50, ramp: BLOODL, k: 0.42 }, { x: 0, y: 0, r: 0, ramp: TEAL, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: LANT, k: 0.9 }];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.poison], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [FL1, FL2, FL3, EYE, EYE2, GHOST, BLD, BLDD, VOIDM]) RIM.skip[m] = 1;

  // 姿势：身体 / 船的升降和倾斜、转头、下巴、近手（握桨的位置）和桨的朝向（oa：握点 → 桨叶，屏幕角度，0 朝右、π/2 朝下）、
  // 远手（自由位置 fx2/fy2，或者 fon = 1 时握在桨上离近手 fo 格的地方）、灯的摆角 ls、灯火大小 fl、鬼火骷髅 sk / skq、铜钱 coin
  const P = {};
  const FIELDS = ['st', 'by', 'bb', 'bt', 'lean', 'hd', 'jaw', 'nx', 'ny', 'oa', 'fx2', 'fy2', 'fon', 'fo', 'ls', 'fl', 'flk', 'glow', 'eyes', 'orb', 'coin', 'cs', 'sk', 'skq', 'soul', 'flut', 'drip', 'flash', 'dq', 'hot', 'breath'];
  const K = {
    idle: { nx: 34, ny: -44, oa: 1.5, fx2: -24, fy2: -30, fon: 0, fo: 0, lean: 0.04, hd: 0.05, ls: 0 },
    rowA: { nx: 44, ny: -40, oa: 1.2, fx2: -22, fy2: -30, fon: 0, fo: 0, lean: 0.2, hd: 0.15, ls: 0.3 },        // 划船：往前探、桨叶插进前面的河
    rowB: { nx: 34, ny: -42, oa: 1.55, fx2: -24, fy2: -30, fon: 0, fo: 0, lean: 0.1, hd: 0.1, ls: 0.15 },
    rowC: { nx: 20, ny: -44, oa: 1.95, fx2: -26, fy2: -32, fon: 0, fo: 0, lean: -0.06, hd: 0, ls: -0.2 },
    rowD: { nx: 30, ny: -48, oa: 1.45, fx2: -24, fy2: -32, fon: 0, fo: 0, lean: 0.06, hd: 0.05, ls: -0.3 },
    oarUp: { nx: 4, ny: -56, oa: 3.5, fx2: -8, fy2: -62, fon: 1, fo: 14, lean: -0.2, hd: -0.2, ls: -0.5 },   // 船桨：桨叶翻到头顶后面
    oarBack: { nx: 0, ny: -58, oa: 3.36, fx2: -8, fy2: -62, fon: 1, fo: 14, lean: -0.28, hd: -0.26, ls: -0.6 },
    oarSlam: { nx: 44, ny: -32, oa: 0.95, fx2: 20, fy2: -40, fon: 1, fo: -16, lean: 0.36, hd: 0.28, ls: 0.9 },
    rowBack: { nx: 6, ny: -40, oa: 2.3, fx2: -8, fy2: -30, fon: 1, fo: 12, lean: -0.14, hd: 0.12, ls: 0.4 },   // 划桨：桨斜插进身后
    rowSweep: { nx: 44, ny: -54, oa: -0.35, fx2: 26, fy2: -48, fon: 1, fo: -14, lean: 0.26, hd: 0.1, ls: -0.8 },
    pokeW: { nx: 20, ny: -40, oa: 0.7, fx2: 26, fy2: -34, fon: 1, fo: 10, lean: -0.1, hd: -0.05, ls: -0.9 },  // 重击：灯甩到身后 → 甩出去
    poke: { nx: 36, ny: -58, oa: 2.35, fx2: 28, fy2: -50, fon: 1, fo: 12, lean: 0.3, hd: 0.2, ls: 1.35 },
    atkW: { nx: 18, ny: -48, oa: 2.1, fx2: -24, fy2: -30, fon: 0, fo: 0, lean: -0.08, hd: 0, ls: 0.3 },        // 普攻：桨叶往后收 → 平扫出去
    atk: { nx: 46, ny: -40, oa: 0.3, fx2: -22, fy2: -32, fon: 0, fo: 0, lean: 0.24, hd: 0.12, ls: -0.6 },
    hunch: { nx: 38, ny: -38, oa: 1.75, fx2: 34, fy2: -56, fon: 0, fo: 0, lean: 0.3, hd: 0.35, ls: 0 },          // 第二阶段：弓身凑近骷髅灯
    wide: { nx: 26, ny: -60, oa: 1.57, fx2: -40, fy2: -64, fon: 0, fo: 0, lean: -0.18, hd: -0.36, ls: 0 },      // 桨竖过头顶、远手甩开、仰头
    agony: { nx: 30, ny: -58, oa: 1.5, fx2: -34, fy2: -66, fon: 0, fo: 0, lean: -0.2, hd: -0.4, ls: 0.4 },
    limp: { nx: 42, ny: -18, oa: 0.5, fx2: -14, fy2: -20, fon: 0, fo: 0, lean: 0.62, hd: 0.6, ls: 0.8 },
  };
  const KF = ['nx', 'ny', 'oa', 'fx2', 'fy2', 'fon', 'fo', 'lean', 'hd', 'ls'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.fl = 2; P.soul = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }
  const ROWS = [K.rowA, K.rowB, K.rowC, K.rowD];
  const rowing = (tq) => { const u = tq * 6, f = Math.floor(u) & 3, h = (u % 1) >= 0.5 ? 0.5 : 0; pose(ROWS[f], ROWS[(f + 1) & 3], h); P.bb = [1, 0, 0, 1][f]; P.by = [1, 0, 0, 1][f]; P.bt = [0.02, 0, -0.02, 0][f]; P.flut = f; return f; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.flk = f12 % 3; P.flut = (f12 >> 1) & 3; P.drip = f12 % 6;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.bb = (f12 >> 3) & 1; P.ls = [0, 0.1, 0.18, 0.1, 0, -0.1, -0.18, -0.1][(f12 >> 1) & 7];
      P.eyes = (f12 % 13 === 0 || f12 % 17 === 0) ? 2 : 1;                                                              // 眼里的针尖光偶尔一亮
      const lp = tt % DUR[IDLE]; if (lp >= 1.2 && lp < 2.0) {                                                            // 待机个性：往上弹一枚铜钱，接住
        const u = (lp - 1.2) / 0.8, a = u < 0.12 ? ease.out(u / 0.12) : u > 0.85 ? 1 - ease.inOut((u - 0.85) / 0.15) : 1;
        P.fx2 += (-16 - P.fx2) * a; P.fy2 += (-44 - P.fy2) * a; P.hd = 0.05 - 0.16 * a; P.coin = 1; P.cs = f12 & 3;
        if (u >= 0.15 && u < 0.75) P.coin = 1 + Math.round(22 * Math.sin(Math.PI * (u - 0.15) / 0.6)); } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) rowing(tq);
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.atkW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.atkW, K.atkW); P.glow = 2; P.fl = 3; }
      else if (tq < 0.42) { pose(K.atk, K.atk); P.jaw = 2; P.glow = 3; P.fl = 3; P.eyes = 2; }
      else pose(K.atk, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.3; P.lean = -0.12; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.ls = -0.7; P.nx -= 4; P.fl = 1; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q) + 0.05 * q; P.lean = -0.12 * (1 - q) + 0.04 * q; P.jaw = q < 0.5 ? 1 : 0; P.ls = 0.5 * (1 - q) * ((f12 & 2) ? 1 : -1); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.fl = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.ls = 0.4 + ((f12 & 1) ? 0.2 : -0.2); }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.fl = d < 1.1 ? 2 : (f12 & 1); P.eyes = d < 1.2 ? 2 : 1; P.glow = 2; P.soul = d < 1.2 ? 1 : 0; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.fl = 0; P.eyes = d < 1.7 ? 1 : 0; P.soul = 0; P.glow = 0; const s = clamp01((d - 1.5) / 0.8);   // 连人带船沉进血河
        P.by = Math.round(46 * ease.inOut(s)); P.bb = Math.round(40 * ease.inOut(s)); P.bt = 0.12 * s; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.5) * 48) / 48 : 0; }
    }
    if (P.hot && st !== DEATH) { if (P.fl < 2) P.fl = 2; if (P.glow < 2) P.glow = 2; if (P.soul < 2) P.soul = 2; if (!P.sk) { P.sk = 4; P.skq = (f12 % 24) / 24; } }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { oar: 0, row: 1, poke: 2, rise: 3, p2: 4 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'oar') {
      if (st === CHARGE) {
        if (q < 0.4) { pose(K.idle, K.oarUp, ease.out(q / 0.4)); P.orb = Math.round(q / 0.4 * 2); }
        else if (q < 0.75) { pose(K.oarUp, K.oarBack, ease.inOut((q - 0.4) / 0.35)); P.orb = 2 + Math.round((q - 0.4) / 0.35 * 2); }
        else { pose(K.oarBack, K.oarBack); P.orb = 4 + (f12 & 1); P.nx += tr; P.ny += (f12 & 1); P.jaw = 1; }
        P.by = Math.round(2 * clamp01(q / 0.4)); P.glow = q < 0.4 ? 2 : 3; P.eyes = q > 0.3 ? 2 : 1; P.fl = q < 0.5 ? 2 : 3; P.bt = -0.03 * clamp01(q / 0.4);
        if (q > 0.45) { P.sk = 3; P.skq = (Math.floor(tq * 12) % 12) / 12; }
      } else if (st === CAST) { pose(K.oarSlam, K.oarSlam); P.by = 3; P.bb = 2; P.bt = 0.05; P.jaw = 3; P.glow = 3; P.eyes = 2; P.fl = 3; }
      else { pose(K.oarSlam, K.idle, ease.inOut(clamp01(tq / 0.6))); P.by = Math.round(3 * (1 - clamp01(tq / 0.5))); P.ls += 0.4 * Math.cos(tq * 14) * (1 - clamp01(tq / 0.6)); }
    } else if (MV === 'row') {
      if (st === CHARGE) {
        if (q < 0.35) pose(K.idle, K.rowBack, ease.out(q / 0.35));
        else { pose(K.rowBack, K.rowBack); P.lean -= 0.06 * clamp01((q - 0.35) / 0.5); P.hd += 0.04 * clamp01((q - 0.35) / 0.5); if (q > 0.8) { P.nx += tr; P.by += (f12 & 1); } }
        P.bt = -0.05 * clamp01(q / 0.35); P.bb = Math.round(2 * clamp01(q / 0.35)); P.glow = q < 0.5 ? 2 : 3; P.eyes = q > 0.5 ? 2 : 1; P.fl = q < 0.6 ? 2 : 3; P.jaw = q > 0.85 ? 1 : 0;
        if (q > 0.3) { P.sk = 5; P.skq = Math.round((q - 0.3) / 0.7 * 12) / 12; }
      } else if (st === CAST) { pose(K.rowSweep, K.rowSweep); P.bt = 0.05; P.jaw = 2; P.glow = 3; P.eyes = 2; P.fl = 3; P.sk = 1; P.skq = Math.round(clamp01(tq / 0.5) * 12) / 12; }
      else { pose(K.rowSweep, K.idle, ease.inOut(clamp01(tq / 0.6))); P.bt = 0.05 * (1 - clamp01(tq / 0.4)); }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.ls += 0.12 * tr; P.nx += tr; } P.fl = q < 0.35 ? 2 : 3; P.glow = q < 0.5 ? 2 : 3; P.eyes = q > 0.4 ? 2 : 1; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.poke, K.poke); P.jaw = 2; P.fl = 3; P.glow = 3; P.eyes = 2; P.by = 2; }
      else { pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.55))); P.ls += 0.5 * Math.cos(tq * 12) * (1 - clamp01(tq / 0.55)); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { rowing(tq); const u = ease.out(q); P.by += Math.round(40 * (1 - u)); P.bb += Math.round(36 * (1 - ease.out(clamp01(q * 1.15)))); P.eyes = q > 0.6 ? 2 : 1; P.fl = q < 0.4 ? 1 : 2; P.glow = q > 0.7 ? 2 : 1; }
      else if (st === CAST) { pose(K.rowC, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.fl = 3; P.sk = 2; P.skq = Math.round(clamp01(tq / 0.5) * 12) / 12; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：弓身凑近骷髅灯 → 两下心跳（灯火和胸口的魂火一齐亮）→ 后仰、桨竖上天、灯火炸开、尖啸
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.fl = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.glow = hb ? 3 : 1; P.soul = hb ? 3 : 1; P.by = hb ? 1 : 0; P.ls = hb ? 0.1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.fl = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.soul = 3; P.sk = 2; P.skq = Math.round(clamp01(tq / 0.5) * 12) / 12; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.fl = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.soul = 3; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [14, -54], SHF = [-9, -55], NECK = [4, -58], OY = 4, BY = -4;   // OY：人整体往下 4 格、BY：船往上 4 格（战斗里下沉 SINK 格后船舷还露得出来）
  function torsoXf() { B.reset(); B.move(0, P.by + OY); B.rot(0, -18, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.45); }
  function boatXf() { B.reset(); B.move(0, P.bb + BY); B.rot(0, -10, P.bt); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.soul = B.at(2, -46);
    headXf(); L.eyeN = B.at(17, -67); L.eyeF = B.at(9, -67); L.mouth = B.at(13, -59 + P.jaw); L.face = B.at(13, -67); L.head = B.at(8, -74);
    B.reset();
    const h = L.hN = [P.nx, P.ny + P.by + OY], d = L.d = [Math.cos(P.oa), Math.sin(P.oa)];
    L.bT = [h[0] + d[0] * 58, h[1] + d[1] * 58]; L.bB = [h[0] + d[0] * 36, h[1] + d[1] * 36]; L.crook = [h[0] - d[0] * 36, h[1] - d[1] * 36];
    const c = L.crook; L.hk1 = [c[0] - d[0] * 3, c[1] - d[1] * 3]; L.hk2 = [L.hk1[0] + 3, L.hk1[1] - 2]; L.hook = [L.hk1[0] + 6, L.hk1[1] + 0.5];
    const sl = Math.sin(P.ls), cl = Math.cos(P.ls); L.lanTop = [L.hook[0] + sl * 6, L.hook[1] + cl * 6]; L.lan = [L.lanTop[0] + sl * 12.5, L.lanTop[1] + cl * 12.5];
    const on = [h[0] + d[0] * P.fo, h[1] + d[1] * P.fo], fr = [P.fx2, P.fy2 + P.by + OY]; L.hF = [fr[0] + (on[0] - fr[0]) * P.fon, fr[1] + (on[1] - fr[1]) * P.fon];
    L.elN = B.ik(L.shN, L.hN, 19, 20, 1); L.elF = B.ik(L.shF, L.hF, 19, 20, 1);
    P.fcx = L.lan[0]; P.fcy = L.lan[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  // 魂火：x, y 火根（精灵本地），h 高，lean 火尖的偏移，k 闪烁帧
  function flame(x, y, h, lean, k, wide) {
    if (h <= 0) return; const w = (wide || 2.2) + h * 0.14, tx = x + lean + [0, 1, -1][k], ty = y - h;
    part(); polyW([[x - w, y], [x - w * 0.95, y - h * 0.35], [tx - 0.8, ty + h * 0.28], [tx, ty], [tx + 0.8, ty + h * 0.28], [x + w * 0.95, y - h * 0.35], [x + w, y], [x, y + w * 0.6]], FL1);
    const h2 = h * 0.66, w2 = w * 0.6; polyW([[x - w2, y], [x - w2 * 0.8, y - h2 * 0.4], [x + lean * 0.6, y - h2], [x + w2 * 0.8, y - h2 * 0.4], [x + w2, y], [x, y + w2 * 0.5]], FL2);
    if (h > 4) dot(x + lean * 0.2, y - h * 0.18, Math.max(0.7, w * 0.36), FL3);
    if (k === 1) px(tx + 1, ty - 2, FL1); else if (k === 2) px(tx - 1, ty - 3, FL2);   // 飘走的火舌
  }
  function ghost(x, y, s) {   // 鬼火骷髅：青白的小头骨，两个黑眼洞，后面拖一缕
    part(); dot(x, y, s, GHOST); dot(x + s * 0.2, y + s * 0.85, s * 0.58, GHOST); dot(x - s * 0.9, y - s * 0.2, s * 0.5, GHOST, 2); px(x - s * 1.6, y - s * 0.4, GHOST, 2);
    px(x - s * 0.4, y + s * 0.1, VOIDM, 10); px(x + s * 0.5, y + s * 0.1, VOIDM, 10); if (s >= 3) { px(x - s * 0.4 + 1, y + s * 0.1, VOIDM, 10); px(x + s * 0.5 + 1, y + s * 0.1, VOIDM, 10); }
  }

  // 船：先画船里面（远舷，在人后面），人画完再画近舷、骨肋、脊椎船舷、船头的卷骨和船尾
  function hullBack() {
    part(); boatXf(); B.poly(E, [[-50, -31], [-44, -27], [0, -24.5], [40, -27], [47, -31], [40, -25], [0, -20], [-46, -25]], HULL, 2);
    part(); B.strand(E, [[-52, -32], [-54, -38], [-57, -45], [-55, -51], [-50, -53], [-47, -50]], 2.4, 1, OLDBD);   // 船尾的骨柱
  }
  const TOP = [[-52, -30], [-46, -25], [-26, -21], [0, -20], [24, -21], [40, -25], [48, -30]];
  function topAt(x) { for (let i = 1; i < TOP.length; i++) if (x <= TOP[i][0]) { const a = TOP[i - 1], b = TOP[i], q = (x - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * q; } return -30; }
  function hull() {
    part(); boatXf();
    B.poly(E, [...TOP, [44, -14], [32, -1], [16, 5], [-20, 5], [-36, -2], [-48, -16]], HULL);
    for (const [x0, x1, y] of [[-47, 44, -15], [-40, 36, -9]]) { B.ln(E, x0, y, x1, y, HULL, 3); B.ln(E, x0 + 2, y + 1, x1 - 2, y + 1, HULL, 7); }   // 船板
    B.ln(E, -38, 0, 32, 0, HULL, 2);
    for (const [x, l] of [[-30, 5], [-6, 7], [14, 4], [34, 6]]) { const y = topAt(x); B.ln(E, x, y + 1, x, y + l + (P.drip % 3), BLDD); }   // 船舷上淌下来的血
    part(); for (const x of [-38, -28, -18, -8, 2, 12, 22, 32]) { const y = topAt(x), yb = x < -30 || x > 26 ? -5 : 1; B.strand(E, [[x, y], [x + 2.2, (y + yb) / 2], [x + 1, yb]], 1.6, 0.9, OLDBD); }   // 一根根骨肋
    part(); for (let x = -48; x <= 46; x += 4) { const y = topAt(x); B.ell(E, x, y - 0.5, 1.9, 1.5, 0, OLDB); B.px(E, x, y - 2, OLDB, 8); }   // 脊椎骨的船舷
    part(); const pr = [[42, -27], [49, -33], [55, -42], [58, -52], [56, -60], [51, -63], [47, -60], [49, -56], [53, -57]];   // 船头往前卷起的大骨刺
    B.strand(E, pr, 3.2, 1.1, OLDB); for (let i = 1; i < 5; i++) { const a = pr[i], b = pr[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; B.ln(E, m[0] - 2, m[1] + 1, m[0] + 2, m[1] - 1, OLDB, 3); }
    B.ln(E, 48, -34, 55, -48, OLDB, 8);
  }
  function cape() {   // 身后破披风的布条（一条条飘）
    part(); torsoXf();
    for (let i = 0; i < 5; i++) { const w = [0, 1, 2, 1][(P.flut + i) & 3], r = [-11, -56 + i * 7], tip = [r[0] - 13 - i * 2 - w, r[1] + 6 + i * 3 + (i === 4 ? 2 : 0) - w * 0.5];
      B.strand(E, [r, [r[0] - 6 - w * 0.5, r[1] + 2], tip], 3.4 - i * 0.2, 0.7, ROBED);
      if (P.hot) { const p = B.at(tip[0], tip[1]); px(p[0], p[1], (P.flk + i) % 3 ? FL1 : FL2); } }
  }
  function sleeve(side, stage) {   // stage 1：上臂的袖子（近侧的画在兜帽后面，不挡下巴）；stage 2：前臂的喇叭袖、袖口、骨头   // 袖子：宽袖筒、猩红袖口、垂下来的破布条；袖口里伸出两根前臂骨
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? ROBED : ROBE, bn = far ? BONED : BONE, tr = far ? TRIMD : TRIM;
    const s = [el[0] + (h[0] - el[0]) * 0.45, el[1] + (h[1] - el[1]) * 0.45], dx = h[0] - s[0], dy = h[1] - s[1], ll = Math.hypot(dx, dy) || 1, n = [-dy / ll, dx / ll];
    if (stage !== 2) { part(); capW(sh[0], sh[1], el[0], el[1], 5.5, 5, m); lnW(sh[0], sh[1] + 2, el[0], el[1] + 2, m, 3); lnW(sh[0] - 2, sh[1] - 2, el[0] - 2, el[1] - 3, m, 7); if (stage === 1) return; }
    part(); capW(s[0], s[1], h[0], h[1], 1.5, 1.3, bn); lnW(s[0] + n[0] * 1.2, s[1] + n[1] * 1.2, h[0] + n[0] * 1.1, h[1] + n[1] * 1.1, bn, 3);
    part(); dot(el[0], el[1], 5, m); capW(el[0], el[1], s[0], s[1], 5, 7, m);
    capW(s[0] + n[0] * 7, s[1] + n[1] * 7, s[0] - n[0] * 7, s[1] - n[1] * 7, 1.1, 1.1, tr);
    part(); for (const k of [-5, 0, 5]) { const p = [s[0] + n[0] * k, s[1] + n[1] * k], w = [0, 1, 0, -1][(P.flut + k + 5) & 3]; capW(p[0], p[1], p[0] + w - side, p[1] + 6 + Math.abs(k) * 0.3, 1.5, 0.5, m); }
  }
  function hand(side, grip) {
    const far = side < 0, h = far ? L.hF : L.hN, el = far ? L.elF : L.elN, bn = far ? BONED : BONE;
    part(); dot(h[0], h[1], grip ? 1.8 : 2.2, bn, 4);
    if (grip) { const d = L.d, pp = [-d[1], d[0]]; for (let i = 0; i < 4; i++) { const o = (i - 1.5) * 1.5, p = [h[0] + d[0] * o, h[1] + d[1] * o]; lnW(p[0] - pp[0] * 2.4, p[1] - pp[1] * 2.4, p[0] + pp[0] * 2.2, p[1] + pp[1] * 2.2, bn, i === 0 ? 7 : i & 1 ? 4 : 6); } }
    else { const dir = Math.atan2(h[1] - el[1], h[0] - el[0]); for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * 0.38, k0 = [h[0] + Math.cos(a) * 2, h[1] + Math.sin(a) * 2], k1 = [k0[0] + Math.cos(a) * 3.2, k0[1] + Math.sin(a) * 3.2], k2 = [k1[0] + Math.cos(a + 0.8 * side) * 2.6, k1[1] + Math.sin(a + 0.8 * side) * 2.6];
      capW(k0[0], k0[1], k1[0], k1[1], 0.9, 0.8, bn, 6); capW(k1[0], k1[1], k2[0], k2[1], 0.8, 0.5, bn); } }
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-12, -57], [-5, -59], [9, -59], [16, -56], [16, -44], [14, -30], [13, -14], [-13, -14], [-14, -30], [-15, -44]], ROBE);
    B.ln(E, -13, -54, -14, -30, ROBE, 7); B.ln(E, -8, -48, -10, -16, ROBE, 3); B.ln(E, 11, -46, 12, -16, ROBE, 3); B.ln(E, 6, -36, 5, -16, ROBE, 3); B.ln(E, -2, -34, -3, -16, ROBE, 7);
    part(); B.poly(E, [[-4, -58], [9, -58], [4, -35]], VOIDM);                                                         // 敞开的前襟：里面是黑的
    if (P.soul) { const s = L.soul; flame(s[0], s[1] + 3, 2 + P.soul * 2, 0, P.flk, 1.4); }                           // 肋骨里跳的魂火
    part(); torsoXf(); B.ln(E, 2.5, -58, 3.5, -37, BONE, 7);
    for (const y of [-55, -51, -47, -43]) { const xl = -4 + (y + 58) * 0.4, xr = 9 - (y + 58) * 0.25; B.ln(E, xl + 0.5, y + 1, 2.5, y, BONE, 6); B.ln(E, 3.5, y, xr - 0.5, y + 1, BONE, 6); }
    part(); B.poly(E, [[-7, -58], [-3, -58], [-4, -36], [-5, -26], [-7, -30], [-9, -24], [-9, -36]], TRIM); B.ln(E, -6, -56, -7, -31, TRIM, 7);   // 两条猩红布带
    for (const y of [-52, -46, -40]) B.px(E, -6, y, TRIM, 3);
    part(); B.poly(E, [[9, -58], [13, -57], [13, -36], [12, -25], [10, -29], [9, -24], [8, -36]], TRIM); B.ln(E, 12, -55, 12, -31, TRIM, 3);
    for (const y of [-52, -46, -40]) B.px(E, 10, y, TRIM, 7);
    if (P.hot) for (const [x, y] of [[-6, -49], [-7, -38], [-6, -29], [10, -50], [11, -41], [11, -30]]) B.px(E, x, y, BLD, 4);   // 第二阶段：布带渗出血光
    part(); for (let i = 0; i <= 8; i++) { const x = -4 + i * 1.6, y = -56 + Math.sin(i / 8 * Math.PI) * 5; B.px(E, x, y, BRASS, 3); }   // 铜钱串（船费）
    for (let i = 0; i < 5; i++) { const x = -3 + i * 3, y = -55 + Math.sin((i + 0.5) / 5 * Math.PI) * 5 + 1.5; B.ell(E, x, y, 1.4, 1.4, 0, BRASS); B.px(E, x, y, BRASS, 10); B.px(E, x - 1, y - 1, BRASS, 8); }
    part(); B.ell(E, 14, -54, 6.5, 4.5, 0.2, ROBE); B.ln(E, 9, -57.5, 18, -56.5, ROBE, 7); B.ell(E, -9, -55.5, 5, 4, -0.2, ROBE, 4);   // 肩
  }
  function head() {   // 尖顶破兜帽（帽尖往前耷拉）→ 猩红衬里 → 兜帽里的黑 → 白骷髅 → 下颌 → 帽檐的影子 → 眼里的针尖光
    part(); headXf();
    B.poly(E, [[-13, -56], [-16, -65], [-15, -74], [-10, -81], [-3, -86], [6, -88.5], [15, -88.5], [22, -87], [27, -84], [29.5, -79], [29, -74], [26.5, -77], [25.5, -70], [24.5, -62], [22, -56]], ROBE);
    B.ln(E, -3, -85, -14, -72, ROBE, 7); B.ln(E, 5, -87.5, -2, -85, ROBE, 8); B.ln(E, 14, -87.5, 22, -86, ROBE, 7); B.ln(E, 24, -85, 28, -80, ROBE, 6);   // 左上受光
    B.ln(E, -9, -80, -12, -60, ROBE, 3); B.ln(E, -3, -83, -6, -58, ROBE, 3); B.ln(E, 19, -85, 26, -76, ROBE, 3); B.ln(E, 8, -87, 1, -80, ROBE, 3);   // 褶
    for (const [x, y, l] of [[-15, -60, 7], [-11, -58, 9], [-7, -57, 5], [-15, -69, 5]]) B.cap(E, x, y, x - 3, y + l, 1.6, 0.5, ROBE);   // 兜帽后摆的破边
    part(); headXf(); B.ell(E, 13, -68, 11.2, 13.6, 0, TRIM);
    part(); headXf(); B.ell(E, 13, -68, 10, 12.5, 0, VOIDM);
    part(); headXf(); const J = Math.round(P.jaw * 1.3);
    B.ell(E, 13, -71, 7.2, 7.2, 0, BONE); B.poly(E, [[6, -70], [20, -70], [20, -66], [18, -62], [16.5, -60.5], [9.5, -60.5], [8, -62], [6, -66]], BONE);
    B.ell(E, 9.2, -67.5, 2.3, 2.5, 0, BONE, 10); B.ell(E, 16.6, -67.5, 2.8, 2.7, 0, BONE, 10);                                 // 深眼窝
    B.poly(E, [[6, -71], [11.5, -68.8], [11.5, -71.5]], BONE, 6); B.poly(E, [[14, -68.8], [20, -71], [14, -71.5]], BONE, 6); B.ln(E, 6, -71.5, 11, -70, BONE, 8); B.ln(E, 14.5, -70, 20, -71.5, BONE, 8);   // 压下来的眉弓：眼窝内上角被削掉，眼神是凶的 B.ln(E, 9, -75.5, 14, -76.5, BONE, 8); B.px(E, 8, -74, BONE, 9);   // 眉弓、天灵盖的高光
    B.ln(E, 20, -74, 20.5, -68, BONE, 3); B.ln(E, 15, -62.5, 19, -63, BONE, 4);                                            // 侧面和颧骨下的暗
    B.px(E, 12, -64, BONE, 10); B.px(E, 13, -64, BONE, 10); B.px(E, 12.5, -63, BONE, 10); B.px(E, 7, -65, BONE, 7); B.ln(E, 8, -63, 9.5, -61.5, BONE, 3);     // 鼻孔、颧骨
    for (let x = 10; x <= 17; x++) B.px(E, x, -61, BONE, (x & 1) ? 8 : 3);                                                   // 上排牙
    if (P.hot) { B.ln(E, 12, -77, 11, -74, FL2); B.ln(E, 11, -74, 13, -72, FL1); B.px(E, 14, -76, FL1); }                    // 第二阶段：天灵盖裂出魂火
    part(); headXf();
    if (J) B.poly(E, [[9.5, -60], [17.5, -60], [17, -60 + J], [10, -60 + J]], VOIDM);
    B.poly(E, [[9, -59.5 + J], [18, -59.5 + J], [17, -56.5 + J], [15, -55.5 + J], [11, -55.5 + J], [9.5, -57 + J]], BONE); for (let x = 10; x <= 17; x++) B.px(E, x, -59.5 + J, BONE, (x & 1) ? 3 : 8);
    part(); headXf(); B.poly(E, [[2, -76], [8, -80.5], [14, -81.5], [20, -80], [25, -76], [23, -74.5], [14, -77.5], [5, -74.5]], ROBE); B.ln(E, 5, -75, 23, -75, ROBE, 3);   // 帽檐压下来的影子
    const e = P.eyes; if (!e) return; part(); headXf(); const em = e >= 2 ? EYE2 : EYE;
    B.px(E, 9, -67, em); B.px(E, 17, -67, em);
    if (e >= 2) for (const [x, y] of [[8, -67], [10, -67], [16, -67], [18, -67]]) B.px(E, x, y, EYE);
    if (P.hot) for (const [x, y] of [[8, -69], [7, -70], [16, -69], [15, -71], [14, -72]]) B.px(E, x, y, EYE);                 // 第二阶段：眼里拖出光尾
  }
  function oar() {   // 船桨：木柄、两道铜箍、染血的桨叶；柄顶一只铜弯钩，钩上一截铜链
    const d = L.d, pp = [-d[1], d[0]], c = L.crook, bB = L.bB, bT = L.bT;
    part(); capW(c[0], c[1], bB[0], bB[1], 1.5, 1.6, WOOD); lnW(c[0] - pp[0], c[1] - pp[1], bB[0] - pp[0], bB[1] - pp[1], WOOD, 7);
    const bp = (q, w) => [bB[0] + (bT[0] - bB[0]) * q + pp[0] * w, bB[1] + (bT[1] - bB[1]) * q + pp[1] * w];
    part(); polyW([bp(0, 1.6), bp(0.25, 4.4), bp(0.7, 5.2), bp(0.92, 4), bp(1, 1.5), bp(1, -1.5), bp(0.92, -4), bp(0.7, -5.2), bp(0.25, -4.4), bp(0, -1.6)], WOOD);
    { const a = bp(0.05, 0), b = bp(0.95, 0); lnW(a[0], a[1], b[0], b[1], WOOD, 3); const a2 = bp(0.1, -2), b2 = bp(0.8, -3); lnW(a2[0], a2[1], b2[0], b2[1], WOOD, 7); }
    for (const [q0, w0, q1, w1] of [[0.5, 4.4, 0.95, 3.4], [0.62, -4.6, 0.9, -3.6], [0.72, 1.4, 0.98, 0.6]]) { const a = bp(q0, w0), b = bp(q1, w1); lnW(a[0], a[1], b[0], b[1], BLDD); }   // 桨叶上的血
    part(); for (const q of [0.28, 0.74]) { const p = [c[0] + (bB[0] - c[0]) * q, c[1] + (bB[1] - c[1]) * q]; capW(p[0] - d[0], p[1] - d[1], p[0] + d[0], p[1] + d[1], 2.2, 2.2, BRASS); }
    part(); B.reset(); B.strand(E, [c, L.hk1, L.hk2, L.hook], 1.7, 1.0, BRASS);
    part(); for (let i = 0; i <= 6; i++) { const q = i / 6; px(L.hook[0] + (L.lanTop[0] - L.hook[0]) * q, L.hook[1] + 1 + (L.lanTop[1] - L.hook[1] - 1) * q, BRASS, i & 1 ? 3 : 8); }
  }
  function lantern() {   // 骷髅灯：一颗旧骨头骷髅（铜箍、提环），天灵盖里冒出黄绿的魂火，眼窝、鼻孔、牙缝透光；灭了就是黑洞
    const cx = L.lan[0], cy = L.lan[1], g = P.fl ? FL1 : 0;
    B.reset(); B.rot(cx, cy, -P.ls);
    part(); B.strand(E, [[cx - 5.5, cy - 5], [cx - 4.5, cy - 10], [cx, cy - 12.5], [cx + 4.5, cy - 10], [cx + 5.5, cy - 5]], 0.9, 0.9, BRASS);   // 提环（后半）
    part(); B.ell(E, cx, cy - 1.8, 7.2, 6.8, 0, LB); B.poly(E, [[cx - 6, cy], [cx + 6.6, cy], [cx + 5, cy + 4.5], [cx + 2.6, cy + 6.6], [cx - 2.6, cy + 6.6], [cx - 5, cy + 4.2]], LB);
    B.ln(E, cx - 5, cy - 5, cx - 1, cy - 7, LB, 4); B.px(E, cx - 5.5, cy + 2, LB, 4); B.ln(E, cx + 6.5, cy - 3, cx + 6.5, cy + 2, LB, 2);
    const hole = (x, y) => (g ? B.px(E, cx + x, cy + y, g) : B.px(E, cx + x, cy + y, VOIDM, 10));
    for (const [x, y] of [[-5, -1], [-4, -1], [-3, -1], [-5, 0], [-4, 0], [-3, 0], [-4, 1], [2, -1], [3, -1], [4, -1], [2, 0], [3, 0], [4, 0], [3, 1], [0, 2], [1, 2], [0, 3], [1, 3]]) hole(x, y);   // 两个大眼窝、倒三角的鼻孔
    for (let x = -2; x <= 3; x++) { if (x & 1) hole(x, 5); else B.px(E, cx + x, cy + 5, LB, 4); }                                              // 牙缝
    if (g) { const c = P.fl >= 3 ? FL3 : FL2; B.px(E, cx - 4, cy - 0.5, c); B.px(E, cx + 3, cy - 0.5, c); B.px(E, cx + 0.5, cy + 2.5, FL2); }
    part(); B.ln(E, cx - 6.8, cy - 3.5, cx + 6.8, cy - 3.5, BRASS); B.px(E, cx - 1, cy - 3.5, BRASS, 8); B.px(E, cx + 3, cy - 3.5, BRASS, 8);   // 铜箍
    const top = B.at(cx, cy - 6.5); B.reset();
    if (P.fl) flame(top[0], top[1], [0, 6, 10, 13][P.fl] + (P.hot ? 4 : 0) + (P.flk === 1 ? 1 : 0), -P.ls * 4, P.flk, P.hot ? 3.4 : 2.6);
    B.reset(); B.rot(cx, cy, -P.ls); part(); B.strand(E, [[cx - 5.5, cy - 5], [cx - 3, cy - 11], [cx, cy - 12.5]], 1, 1, BRASS); B.reset();   // 提环（前半）
  }
  function coin() {   // 弹起来的铜钱：转着的时候宽窄一帧帧变
    const h = L.hF, y = h[1] - 3 - (P.coin - 1), w = [2.2, 1.4, 0.6, 1.4][P.cs & 3];
    part(); B.reset(); B.ell(E, h[0], y, w, 2.2, 0, BRASS); if (w > 1) { B.px(E, h[0], y, BRASS, 10); B.px(E, h[0] - 1, y - 1, BRASS, 8); }
  }
  function skulls() {   // 鬼火骷髅：按招式飞 / 散开 / 绕着转
    const m = P.sk, u = P.skq; if (!m) return;
    if (m === 1) for (let i = 0; i < 3; i++) { const x = 40 + u * 52 + i * 9, y = -46 - i * 10 - u * 12; if (x < 100) ghost(x, y, 3); }                  // 划桨：跟着血浪扇形飞出去
    else if (m === 2) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832 + u * 1.5, r = 12 + u * 30, x = L.lan[0] + Math.cos(a) * r, y = L.lan[1] + Math.sin(a) * r * 0.7; if (Math.abs(x) < 98 && y > -108 && y < -4) ghost(x, y, 2.6); }   // 升起 / 变身：一圈散开
    else if (m === 3) for (let i = 0; i < 2; i++) { const a = u * 6.2832 + i * Math.PI, x = L.bT[0] + Math.cos(a) * 10, y = L.bT[1] + Math.sin(a) * 6; ghost(x, y, 2.4); }   // 船桨：绕着桨叶转
    else if (m === 4) for (let i = 0; i < 2; i++) { const a = u * 6.2832 + i * Math.PI, x = L.lan[0] + Math.cos(a) * 12, y = L.lan[1] - 2 + Math.sin(a) * 6; ghost(x, y, 2.2); }   // 第二阶段：绕着灯转
    else if (m === 5) for (let i = 0; i < 3; i++) { const x = -40 + i * 12, y = 2 - u * 30 - [0, 8, 3][i]; if (y < -6) ghost(x, y, 2.6); }                 // 划桨蓄力：从身后的河里浮上来
  }
  function blood() {   // 桨叶上聚起的血团、往下滴的血
    const b = L.bT;
    if (P.orb) { part(); const r = 1 + P.orb * 0.9; dot(b[0], b[1], r + 0.8, BLDD); dot(b[0], b[1], r, BLD); dot(b[0] - 0.6, b[1] - 0.6, Math.max(0.6, r - 1.6), BLD, 4); }
    if (b[1] < -8) { part(); const k = P.drip; for (const ph of [0, 3]) { const dd = (k + ph) % 6; px(b[0] + (ph ? 1 : -1), b[1] + 3 + dd * 1.5, dd < 3 ? BLD : BLDD); } }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    hullBack(); cape(); sleeve(-1, 0); if (P.fon < 0.5) hand(-1, 0); torso(); sleeve(1, 1); head();
    hull(); sleeve(1, 2); oar(); hand(1, 1); if (P.fon >= 0.5) hand(-1, 1); lantern();
    if (P.coin) coin(); blood(); skulls();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.lan); RIM.ry = Y(L.lan); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.lan); LIGHTS[0].y = Y(L.lan) - 3 * z; LIGHTS[0].r = ([0, 12, 17, 22][P.fl] + (P.hot ? 4 : 0)) * z;              // 骷髅灯
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 14 * z; LIGHTS[1].r = 50 * z; LIGHTS[1].k = P.hot ? 0.55 : 0.42;                    // 血河从下面映上来
    LIGHTS[2].x = X(L.face); LIGHTS[2].y = Y(L.face); LIGHTS[2].r = (P.eyes >= 2 ? 6 : 0) * z;                                       // 眼里的青光
    LIGHTS[3].x = X(L.soul); LIGHTS[3].y = Y(L.soul); LIGHTS[3].r = (P.soul ? 4 + P.soul * 2 : 0) * z;                                // 肋骨里的魂火
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面微低头、桨提在身前、骷髅灯大亮在脸旁、眼里青光、两颗鬼火骷髅绕灯（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.idle); P.ny = -46; P.nx = 33; P.ls = 0.1; P.hd = 0.1; P.jaw = 1; P.eyes = 2; P.fl = 3; P.glow = 3; P.hot = 1; P.soul = 2; P.by = 0; P.bb = 0; P.breath = 0; P.coin = 0; P.sk = 4; P.skq = 0.1; P.ls = 0.1; P.flk = 0; P.orb = 0;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(10, -77); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 32 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连尖兜帽和旁边的骷髅灯）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y, DIR = () => (scrX(10) >= scrX(0) ? 1 : -1);
  let emT = 0, mtT = 0, lastRow = -1, lastLp = 0;
  function splash(x, n, up) {   // 血河里溅起来的血珠
    for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 14, HY - 2, (Math.random() - 0.5) * 150, -(up || 60) - Math.random() * 160, 0.8 + Math.random() * 0.5, FXI.blood, { g: 320, floor: HY + 2 });
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'oar') {   // 整支桨劈进血河：血浪往两边推、血珠、两道环
        const x = sx(L.bT[0]), D = DIR(); fx.wave(x, HY, D, 44, 10, 'blood', 0.5, 2); fx.wave(x, HY, -D, 30, 7, 'blood', 0.45, 2); burst(x, HY - 2, 24, 60, 180, 0.35, 0.8, FXI.blood, 50); splash(x, 22);
        ring(x, HY - 2, 1, FXI.blood); ring(x, HY - 2, 0, FXI.soul); shake(0.35, 3); flash(0.08);
        sfx('boss', { k: 'ferrySplash', w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); sfx('impact', { pal: 'blood', w: 1 });
      } else if (MV === 'row') {   // 一桨撩出去：斜斩弧 + 往前推的一大片血浪 + 往前泼的血珠
        const D = DIR(), b = L.bT, x0 = sx(L.bB[0]); fx.slash(sx(L.shN[0]), sy(L.shN[1]), 46, 0.4, 2.8, 'blood', 0.25, 3, 2); fx.wave(x0, HY, D, 70, 12, 'blood', 0.6, 2);
        for (let i = 0; i < 30; i++) spawnX(K_PHYS, x0 + (Math.random() - 0.5) * 20, HY - 4 - Math.random() * 20, D * (80 + Math.random() * 180), -60 - Math.random() * 150, 0.8 + Math.random() * 0.5, FXI.blood, { g: 300, floor: HY + 2 });
        burst(sx(b[0]), sy(b[1]), 16, 40, 140, 0.3, 0.6, FXI.soul, 10); ring(sx(b[0]), sy(b[1]), 0, FXI.blood); shake(0.35, 3); flash(0.06);
        sfx('boss', { k: 'ferrySplash', w: 0.8 }); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'ferryToll', w: 0.4 });
      } else if (MV === 'poke') {   // 骷髅灯甩出去：黄绿火光炸开
        const c = L.lan; ring(sx(c[0]), sy(c[1]), 0, FXI.poison); burst(sx(c[0]), sy(c[1]), 22, 50, 150, 0.3, 0.6, FXI.poison, 10); fx.cross(sx(c[0]), sy(c[1]), 16, 'poison', 0.3); shake(0.25, 2); flash(0.06);
        sfx('boss', { k: 'ferryFlame', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 });
      } else if (MV === 'rise' || MV === 'p2') {   // 升起 / 变身：灯火大亮、两道环、鬼火骷髅散开、哀嚎
        const c = L.lan, m = L.mouth; ring(sx(c[0]), sy(c[1]), 1, FXI.poison); ring(sx(m[0]), sy(m[1]), 1, FXI.soul); fx.cross(sx(c[0]), sy(c[1]), 22, 'poison', 0.4); flash(0.12); shake(0.4, 3);
        if (MV === 'rise') { for (let i = 0; i < 36; i++) spawnX(K_PHYS, sx(-46 + Math.random() * 96), sy(-22 - Math.random() * 10), (Math.random() - 0.5) * 40, -20 - Math.random() * 60, 0.8 + Math.random() * 0.4, FXI.blood, { g: 300, floor: HY + 2 }); }   // 船身上泼下来的血
        else burst(sx(c[0]), sy(c[1]), 36, 50, 190, 0.4, 0.9, FXI.soul, 10);
        sfx('boss', { k: 'ferryWail', w: 1 }); sfx('boss', { k: 'ferryToll', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'ferryFlame', w: 1 }); else sfx('boss', { k: 'ferrySplash', w: 0.6 });
      }
    }
    if (s === CHARGE && MV === 'oar') { sfx('boss', { k: 'ferryCreak', w: 0.7 }); sfx('boss', { k: 'lavaGather', w: 0.5, dur: E.DUR[CHARGE] }); }
    if (s === CHARGE && MV === 'row') { sfx('boss', { k: 'ferryCreak', w: 1 }); sfx('boss', { k: 'ferryToll', w: 0.3 }); }
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'ferryFlame', w: 0.4 });
    if (s === CHARGE && MV === 'rise') { sfx('boss', { k: 'lavaRise', w: 0.8 }); sfx('boss', { k: 'ferryCreak', w: 0.6 }); }
    if (s === CHARGE && MV === 'p2') { sfx('boss', { k: 'heartbeat', w: 1 }); sfx('boss', { k: 'ferryToll', w: 0.6 }); }
    if (s === CHARGE) mtT = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'ferryCreak', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { const b = L.bT; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 0.6, 2.4, 'blood', 0.22, 3, 2); burst(sx(b[0]), sy(b[1]), 14, 50, 140, 0.25, 0.5, FXI.blood, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'ferryCoin', w: 0.5 });   // 挨打时铜钱串哗啦一响
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'ferryDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { const c = L.lan; burst(sx(c[0]), sy(c[1]), 24, 30, 110, 0.4, 0.8, FXI.poison, 10); spawn(K_RISE, sx(c[0]), sy(c[1] - 6), 0, -14, 1.2, FXI.dust); sfx('boss', { k: 'fade', w: 1 }); sfx('fall', { w: 1 }); }   // 骷髅灯熄灭
    if (s === DEATH && t === INCOMING + 1.7) { const x = sx(0); ring(x, HY - 2, 1, FXI.blood); fx.wave(x, HY, 1, 44, 7, 'blood', 0.5, 2); fx.wave(x, HY, -1, 44, 7, 'blood', 0.5, 2); splash(x, 26, 40); shake(0.35, 3); flash(0.06); sfx('boss', { k: 'ferrySplash', w: 1 }); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 36; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-4 - Math.random() * 30), 0, -16 - Math.random() * 22, 0.9 + Math.random() * 0.8, FXI.soul); sfx('boss', { k: 'ferryToll', w: 0.5 }); }   // 几缕魂飘上去
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [], [INCOMING], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.7, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    emT += dt; mtT += dt;
    if (emT > (P.hot ? 0.05 : 0.1)) { emT = 0;   // 灯火往上飘的魂火星（第二阶段更密，还混着眼里飘出的青光）
      if (P.fl) spawn(K_EMBER, sx(L.lan[0] + (Math.random() - 0.5) * 4), sy(L.lan[1] - 8 - P.fl * 2), (Math.random() - 0.5) * 8, -16 - Math.random() * 12, 0.5 + Math.random() * 0.5, FXI.poison);
      if (P.hot && Math.random() < 0.4) spawn(K_EMBER, sx(L.eyeN[0]), sy(L.eyeN[1]), -6, -10, 0.5, FXI.soul); }
    if (mtT > 0.3 && state !== DEATH) { mtT = 0; spawn(K_RISE, sx(-50 + Math.random() * 100), sy(-1), (Math.random() - 0.5) * 6, -5 - Math.random() * 5, 1.0 + Math.random() * 0.6, FXI.shadow); }   // 血河上的薄雾
    if (L.bT[1] < -8 && Math.random() < 0.2) spawnX(K_PHYS, sx(L.bT[0]), sy(L.bT[1] + 3), 0, 10, 0.7, FXI.blood, { g: 300, floor: HY + 2 });   // 桨叶滴血
    if (state === CHARGE && MV === 'oar' && P.orb && Math.random() < 0.6) { const c = L.bT, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.blood, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'row' && Math.random() < 0.6) { const x = sx(L.bT[0]), a = Math.random() * 6.2832, r = 8 + Math.random() * 12; spawnX(K_SPIRAL_PT, x, HY - 2, r / (0.3 + Math.random() * 0.2), 0, 9, FXI.blood, { a, r, w: 7, tx: x, ty: HY - 2, orbitR: 2 }); }   // 桨叶边上打旋的血
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.5) { const c = L.lan, a = Math.random() * 6.2832, r = 8 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.poison, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'p2' && Math.random() < 0.6) { const c = L.lan, a = Math.random() * 6.2832, r = 16 + Math.random() * 14; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.3 + Math.random() * 0.2), 0, 9, FXI.soul, { a, r, w: 6, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }
    if (state === MOVE || (state === CHARGE && MV === 'rise')) {   // 划船：每一桨插进河里溅一下、吱呀一声
      const f = Math.floor(stT * 6) & 3; if (f === 0 && lastRow !== 0) { splash(sx(L.bT[0]), 6, 30); sfx('boss', { k: 'ferryCreak', w: 0.3 }); } lastRow = f;
      if (state === CHARGE && Math.random() < 0.5) spawnX(K_PHYS, sx(-44 + Math.random() * 96), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.blood, { g: 240, floor: HY + 4 });
    } else lastRow = -1;
    if (state === IDLE) { const lp = stT % DUR[IDLE]; if (lp >= 1.32 && lastLp < 1.32) sfx('boss', { k: 'ferryCoin', w: 0.3 }); lastLp = lp; }   // 弹铜钱
  }
  function fxReset() { emT = 0; mtT = 0; lastRow = -1; lastLp = 0; }
  function fxBack(f12) { const x0 = sx(-58), x1 = sx(58), R = FXR[FXI.blood]; for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const k = (x + (f12 >> 1)) % 5; if (k === 0) E.put(x, HY + 1, R[P.hot ? 1 : 2]); else if (k === 2) E.put(x, HY + 1, R[3]); } }   // 船边一线血波
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'oar'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    ferryWail: (s, t, w, p) => { s.tone(t, 'sawtooth', 330, 1.4, 0.05 + 0.04 * w, { to: 180, vib: [6, 40, 0.1], lp: 1800, pan: p, rev: 0.7 }); s.tone(t + 0.05, 'sine', 660, 1.2, 0.04 * w, { to: 400, vib: [7, 30, 0.1], pan: p, rev: 0.7 }); s.choir(t, [52, 59], 1.5, 0.05 * w, { dark: 1, pan: p }); s.nz(t, 1.0, 'bandpass', 1200, 2, 0.03 * w, { pan: p }); },
    ferryToll: (s, t, w, p) => { s.bell(t, 84, 1.5, 0.05 + 0.04 * w, { pan: p }); s.ring(t, 1244, 1.0, 0.04 * w, { pan: p, rev: 0.6 }); s.ring(t + 0.12, 932, 1.2, 0.03 * w, { pan: p, rev: 0.6 }); },
    ferrySplash: (s, t, w, p) => { s.nz(t, 0.5, 'lowpass', 1400, 0.8, 0.2 * w, { to: 200, pan: p }); s.thud(t, 90, 40, 0.4, 0.2 * w, { pan: p }); s.nz(t + 0.05, 0.35, 'bandpass', 2600, 1.2, 0.06 * w, { pan: p }); s.crackle(t + 0.08, 0.3, 3000, 0.04 * w, { pan: p }); },
    ferryCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 0.45, 0.03 + 0.03 * w, { to: 95, vib: [18, 12, 0], lp: 700, pan: p }); s.nz(t, 0.3, 'bandpass', 500, 4, 0.05 * w, { pan: p }); s.nz(t + 0.25, 0.2, 'lowpass', 900, 0.8, 0.05 * w, { pan: p }); },
    ferryCoin: (s, t, w, p) => { s.coins(t, 3, 0.04 + 0.03 * w, { pan: p }); },
    ferryFlame: (s, t, w, p) => { s.whoosh(t, 0.4, 300, 2400, 0.08 * w, { pan: p }); s.crackle(t, 0.4, 2200, 0.06 * w, { pan: p }); s.thud(t, 140, 60, 0.2, 0.1 * w, { pan: p }); },
    ferryDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 300, 2.0, 0.06 + 0.03 * w, { to: 60, vib: [5, 50, 0.1], lp: 1400, pan: p, rev: 0.8 }); s.choir(t, [45, 52], 2.2, 0.05, { dark: 1, pan: p }); s.rumble(t + 0.6, 1.6, 0.1 * w, { pan: p }); s.bell(t + 1.2, 72, 2.5, 0.05, { pan: p }); },
  };

  return {
    name: '血河摆渡人', HX, R_EL: FXI.blood, DUR, hero, P, GLOW_MATS: [FL1, FL2, FL3, EYE, EYE2, GHOST], HIT_POINT: [2, -46], EVENTS, MAX_H: 100, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'ghost', how: 'dissolve', pal: 'blood', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['oar', 'row', 'poke', 'rise', 'p2'], MOVE_NAMES: { oar: '船桨', row: '划桨', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.35, 1.6]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.35, 0.7, 1.1], 'oar'], [CAST, [0, 2 / 12], 'oar'], [RECOVER, [0.3], 'oar'],
      [CHARGE, [0.3, 0.8, 1.3], 'row'], [CAST, [0, 3 / 12], 'row'], [RECOVER, [0.3], 'row'],
      [CHARGE, [0.4, 1.0], 'poke'], [CAST, [0], 'poke'], [RECOVER, [0.2], 'poke'],
      [CHARGE, [0, 0.8, 1.6, 2.1], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [3 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 16, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
