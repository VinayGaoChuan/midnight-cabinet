// 更夫（小首领，第一章「雾中小镇」的钟楼）：照 B_centaur.js 的小首领契约做。
// 依据：附录 G2「骑鬼马、拿长枪的幽灵骑士」；被动 幽魂之躯（普攻打它只剩一小截，技能打它更痛）；
// 三更（每 6 秒报一更，三更时长枪刺穿一整条横线）、提灯（照到的攻速变慢）→ 半血 灯灭（隐进夜色，只有技能打得中）。
// 设定卡 ——
//   剪影：钟楼的守夜人死后成了幽灵骑士。又高又瘦、微微驼背的空甲，离地漂着（脚底 2 格），小腿以下化成往后拖的魂雾；
//         一顶比肩还宽的尖顶大桶盔，正脸一道 T 字眼缝，缝里是一张看不见的脸，只透出青白的魂光和两粒更亮的眼（识别点：桶盔 + T 缝里的魂光）；
//         盔顶往后飘一束半透明的魂焰盔缨；身后一件破斗篷，下摆撕成一条条、化成青色的魂丝。
//   标志物：远手提着一盏黄铜六角灯笼，里面烧着青白的鬼火（全身最亮的光，照到的甲片都染青）；近手一支比人还高的长戟
//         （矛尖 + 月牙斧刃 + 背钩，戟头下挂一撮褪色的红缨），斧刃上刻三道更痕，报一更亮一道。
//   细节：灰绿的旧铁甲（肩甲三层甲叶、护膝带翼、铆钉）；腰带前垂一条暗蓝的罩袍，上面一口黄铜小钟纹（钟楼的人）；腰后挂一只打更的木梆子。
//   主色：灰绿铁、夜蓝斗篷，全部压暗；光源只有一种：魂火青（灯笼、眼缝、戟头、魂丝），和 守钟人 的圣光金、青铜分开。
//   招式（setMove）：watchThrust 三更 · lantern 提灯 · roar 灯灭（半血怒吼）。
//     三更：双手把长戟收到胸前、戟尖朝前，身子往后坐，每报一更敲一声梆子、斧刃上亮一道更痕、盔缝一闪 → 三更一到，弓步把戟直直刺穿出去（一道青光往前贯穿）。
//     提灯：把灯笼高高举过头顶，鬼火越烧越旺 → 往前一探，一扇青光从灯里照出去。
//     灯灭：弓身把灯笼护在胸口、火苗乱跳 → 仰头尖啸、双臂张开，灯火爆亮一下就灭了，整个人像隔着夜色一样变得半透明、一闪一闪，再慢慢显形、灯重新点着。
//     普攻：长戟举到肩后 → 斧刃劈下来。待机个性：举灯往前照一照、左右看，再用戟杆「笃」地敲一下。移动：漂着走（腿照样迈，脚不着地，斗篷和魂丝往后拖）。
//     死亡：尖啸 → 长戟脱手、灯笼掉在地上 → 一膝跪倒、盔垂下来、眼缝和灯火一闪一闪地熄灭 → 化成魂丝散掉。
PCD.define('B_GhostKnight', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_DUST,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：甲和斗篷压暗，魂火青才亮得出来 ─────
  // 色板有上限：斗篷用共用的 stormcoat、戟杆和梆子 hide、灯笼和钟纹 brass、红缨 hellhide、盔里的空洞 obsidian；只有灰绿旧铁和魂火青是自己的
  const R_IRON = ['#050709', '#0c1115', '#141c21', '#1d282e', '#27363b', '#33454a', '#42565a', '#546a6c', '#6a8282', '#869e9c', '#aac2bc'];
  const R_SPEC = ['#0a2426', '#051618', '#0a2426', '#103436', '#174746', '#205c5a', '#2c7672', '#3d928a', '#56b0a6', '#9fe8e0', '#dcfff6'];
  const S = R_SPEC;
  const ARM = defDeep(R_IRON, { depth: 7, dark: 1, amb: 0.12 }), HELM = defDeep(R_IRON, { depth: 9, amb: 0.2 }), ARMD = defDeep(R_IRON, { depth: 5, dark: 3, amb: 0.08 });
  const CLOAK = defDeep('stormcoat', { depth: 7, dark: 4, amb: 0.06 }), CLOAKD = defDeep('stormcoat', { depth: 5, dark: 5, amb: 0.04 });
  const SPECM = defDeep(R_SPEC, { depth: 2, dark: 3, amb: 0.3 }), SPEC = defDeep(R_SPEC, { depth: 3, amb: 0.34 }), WISP = defDeep(R_SPEC, { depth: 2, dark: 1, amb: 0.3 });   // WISP：半透明（烘焙后隔一个像素挖掉一个）
  const WOOD = defDeep('hide', { depth: 3, dark: 1, amb: 0.12 }), BRASS = defDeep('brass', { depth: 3, dark: 2, amb: 0.14 }), RED = defDeep('hellhide', { depth: 3, dark: 2, amb: 0.1 });
  const VOIDM = defDeep('obsidian', { depth: 2, dark: 5, amb: 0.02 });
  // 发光：魂火青（暗青 → 青 → 白），平涂，不吃轮廓光
  const GL1 = defMat(ramp([S[3], S[5], S[7], S[8]]), 1, 1), GL2 = defMat(ramp([S[5], S[7], S[9], S[10]]), 1, 1), GL3 = defMat(ramp([S[7], S[9], S[10], '#ffffff']), 1, 1);
  const GLX = fxRamp('ghostLamp', ['#ffffff', S[10], S[9], S[7], S[3]]);   // 特效：白 → 淡青 → 魂火青 → 暗青
  const GLOW = [GL1, GL2, GL3], GLOWSET = new Uint8Array(256); for (const m of GLOW) GLOWSET[m] = 1;
  const hero = new Sprite(150, 104, 56, 94);
  const HX = 60, DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { watchThrust: { 3: 1.2, 4: 0.5, 5: 0.7 }, lantern: { 3: 0.8, 4: 0.5, 5: 0.7 }, roar: { 3: 0.6, 4: 0.5, 5: 0.8 } };
  let MV = 'watchThrust';
  const LAMPL = ramp([S[10], S[9], S[7]]);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: LAMPL, k: 0.85 }, { x: 0, y: 0, r: 0, ramp: LAMPL, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: LAMPL, k: 0.8 }];
  const RIM_R = [0, 8, 12, 18], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[GLX], flash: 0, dq: 0, lights: LIGHTS, skip: new Uint8Array(256) };
  for (const m of [GL1, GL2, GL3, VOIDM, WISP]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  const HOV = 2, HIP = [0, -26], HIPN = [2, -27], HIPF = [-3, -27], SHN = [4, -42], SHF = [-1, -43], NECK = [2, -45], LT = 13, LS = 13, LA = 11;
  // 姿势：身体平移 / 升降、上身前倾、点头；近手（握戟）和远手（提灯）的位置（世界坐标，再加 bx / by）、戟的朝向 ha（0 朝上、顺时针为正）、
  // two = 远手也握在戟杆上（离近手 fo 格）；灯的摆角 ls；两脚的 x 和离地高度；斗篷被风吹的程度 cw、飘动相位 cf、盔缨 pl；
  // 灯火 fl 0 灭 / 1 常亮 / 2 旺 / 3 爆亮；眼缝 eyes 0–3；戟头的光 glow；更痕 notch 0–3；ghost 1 / 2 = 半透明（灯灭、受击的一闪）
  const P = {};
  const FIELDS = ['st', 'bx', 'by', 'lean', 'hd', 'nx', 'ny', 'fx2', 'fy2', 'ha', 'two', 'fo', 'ls', 'nfx', 'nfy', 'ffx', 'ffy', 'cw', 'cf', 'pl', 'fl', 'flk', 'eyes',
    'glow', 'notch', 'rim', 'flash', 'dq', 'hdrop', 'ldrop', 'ghost', 'tas'];
  const K = {
    idle: { nx: 16, ny: -27, fx2: 10, fy2: -24, ha: 0.12, lean: 0.04, hd: 0.06, ls: 0 },
    peer: { nx: 14, ny: -29, fx2: 16, fy2: -43, ha: 0.16, lean: -0.02, hd: -0.14, ls: 0 },          // 待机：举灯往前照
    walk: { nx: 15, ny: -27, fx2: 11, fy2: -25, ha: 0.3, lean: 0.1, hd: 0.08, ls: 0 },
    atkW: { nx: 3, ny: -46, fx2: 0, fy2: 0, ha: -1.05, lean: -0.14, hd: -0.1, ls: -0.3 },            // 普攻：戟举到肩后 → 斧刃劈下
    atk: { nx: 20, ny: -33, fx2: 0, fy2: 0, ha: 1.95, lean: 0.24, hd: 0.14, ls: 0.4 },
    atkF: { nx: 17, ny: -27, fx2: 0, fy2: 0, ha: 2.35, lean: 0.18, hd: 0.1, ls: 0.6 },
    thW: { nx: -3, ny: -34, fx2: 0, fy2: 0, ha: 1.6, lean: -0.14, hd: 0.06, ls: -0.2 },             // 三更：戟收到胸前、戟尖朝前 → 弓步直刺
    th: { nx: 22, ny: -31, fx2: 0, fy2: 0, ha: 1.57, lean: 0.3, hd: 0.16, ls: -0.5 },
    lnW: { nx: 10, ny: -31, fx2: 18, fy2: -57, ha: 0.6, lean: -0.1, hd: -0.16, ls: 0 },              // 提灯：灯举过头顶 → 往前一探
    ln: { nx: 10, ny: -31, fx2: 26, fy2: -39, ha: 0.36, lean: 0.2, hd: 0.04, ls: -0.45 },
    hunch: { nx: 12, ny: -29, fx2: 8, fy2: -35, ha: 0.2, lean: 0.24, hd: 0.32, ls: 0 },             // 灯灭：把灯护在胸口 → 仰头尖啸、双臂张开
    howl: { nx: 20, ny: -40, fx2: -14, fy2: -46, ha: 0.55, lean: -0.22, hd: -0.5, ls: -0.8 },
    hurt: { nx: 10, ny: -33, fx2: 4, fy2: -30, ha: -0.1, lean: -0.16, hd: -0.32, ls: 0.6 },
    agony: { nx: 17, ny: -43, fx2: -10, fy2: -42, ha: 0.45, lean: -0.22, hd: -0.52, ls: -0.6 },
    slump: { nx: 16, ny: -25, fx2: 8, fy2: -23, ha: 1.3, lean: 0.55, hd: 0.5, ls: 0 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'ha', 'lean', 'hd', 'ls'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.fo = -8; P.nfx = 4; P.ffx = -5; P.nfy = HOV; P.ffy = HOV; P.fl = 1; P.eyes = 1; P.mx = 0; P.flip = 0; }
  const SWAY = [0, 0.08, 0.12, 0.08, 0, -0.08, -0.12, -0.08];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.cf = f12 % 8; P.pl = (f12 >> 1) % 8; P.flk = f12 % 3; P.tas = [0, 1, 1, 0, -1, -1][(f12 >> 1) % 6];
    const idle = (tt) => {
      P.by = -(Math.floor(TT * 2) & 1); P.ls = SWAY[Math.floor(tt * 4) % 8]; P.eyes = (f12 % 13 === 0) ? 2 : 1;
      const lp = tt % DUR[IDLE];   // 待机个性：举灯往前照、左右看一眼，再用戟杆「笃」地敲一下
      if (lp >= 0.9 && lp < 1.7) { const q = ease.out(clamp01((lp - 0.9) / 0.25)) * (1 - ease.inOut(clamp01((lp - 1.45) / 0.25))); pose(K.idle, K.peer, q); P.eyes = 2; P.fl = q > 0.5 ? 2 : 1; P.ls = 0;
        if (lp >= 1.15 && lp < 1.3) P.hd += 0.12; else if (lp >= 1.3 && lp < 1.45) P.hd -= 0.06; }
      else if (lp >= 1.75 && lp < 2.1) { const k = Math.floor((lp - 1.75) * 12); P.ny += [-1, -2, 1, 1, 0][k] || 0; P.ha += [0.02, 0.04, 0, 0, 0][k] || 0; if (k === 2) P.eyes = 2; }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) {   // 漂着走：腿照样迈，脚不着地；8 拍一圈
      const f = Math.floor(tq * 12) % 8, NF = [8, 6, 3, -1, -5, -3, 2, 6], NL = [0, 0, 0, 0, 1, 2, 2, 1];
      pose(K.walk, K.walk); P.nfx = NF[f] - 1; P.nfy = HOV + NL[f]; P.ffx = NF[(f + 4) % 8] - 4; P.ffy = HOV + NL[(f + 4) % 8];
      P.by = -[1, 1, 0, 0, 1, 1, 0, 0][f]; P.ls = [-0.3, -0.2, 0, 0.2, 0.3, 0.2, 0, -0.2][f]; P.cw = 1; P.ny += P.by;
      const w = walkDemo(tq, 18, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 2 / 12) { pose(K.idle, K.atkW, ease.out(tq / (2 / 12))); P.two = tq >= 1 / 12 ? 1 : 0; P.glow = 1; P.eyes = 2; }
      else if (tq < 3 / 12) { pose(K.atkW, K.atkW); P.two = 1; P.glow = 2; P.eyes = 2; P.rim = 1; P.by = -1; }
      else if (tq < 5 / 12) { pose(K.atk, K.atkF, ease.out((tq - 3 / 12) / (2 / 12))); P.two = 1; P.glow = 3; P.eyes = 3; P.rim = 2; P.nfx = 8; P.ffx = -8; P.bx = 2; P.by = 1; P.cw = 1; }
      else { const q = ease.inOut(clamp01((tq - 5 / 12) / 0.28)); pose(K.atkF, K.idle, q); P.two = q < 0.5 ? 1 : 0; P.bx = Math.round(2 * (1 - q)); P.nfx = 4 + Math.round(4 * (1 - q)); P.ffx = -5 - Math.round(3 * (1 - q)); P.glow = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.hurt, K.hurt); P.flash = h < 1 / 12 ? 1 : 0; P.ghost = h >= 1 / 12 && h < 2 / 12 ? 1 : 0; P.eyes = P.ghost ? 0 : 2; P.bx = -2; P.cw = 1.5; P.fl = 2; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.28)); pose(K.hurt, K.idle, q); P.bx = -Math.round(2 * (1 - q)); P.ls = 0.6 * (1 - q) * (((f12 >> 1) & 1) ? 1 : -0.6); P.cw = 1 - q; }
    } else if (st === DEATH) deathPose(tq - INCOMING, tq, f12);
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
    geo(); focus();
  }
  const MVI = { watchThrust: 0, lantern: 1, roar: 2 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE] || 1, q = clamp01(tq / D), jit = (f12 & 1) ? 1 : -1;
    if (MV === 'watchThrust') {   // 三更：收戟、往后坐，报三更（每更一声梆子、一道更痕）→ 弓步直刺
      if (st === CHARGE) {
        const r = ease.out(clamp01(q / 0.2)); pose(K.idle, K.thW, r); P.two = q > 0.08 ? 1 : 0;
        P.notch = q < 0.25 ? 0 : q < 0.55 ? 1 : q < 0.85 ? 2 : 3; const beat = [0.25, 0.55, 0.85].some((b) => q >= b && q < b + 0.08);
        P.nfx = 4 + Math.round(5 * r); P.ffx = -5 - Math.round(4 * r); P.by = Math.round(2 * r); P.nx -= Math.round(3 * q);
        P.eyes = beat ? 3 : 2; if (beat) { P.by += 1; P.hd += 0.08; P.fl = 2; }
        P.glow = Math.min(3, 1 + P.notch); P.rim = P.notch >= 2 ? 2 : 1; P.cw = 0.5; if (q > 0.85) P.nx += jit;
      } else if (st === CAST) {
        pose(tq < 1 / 12 ? K.thW : K.th, K.th, tq < 1 / 12 ? 0.6 : 1); P.two = 1; P.notch = 3; P.bx = 4; P.by = 2; P.nfx = 16; P.ffx = -11;
        P.glow = 3; P.eyes = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.cw = 2; P.fl = 2;
      } else {
        const r = ease.inOut(clamp01(tq / 0.55)); pose(K.th, K.idle, r); P.two = r < 0.6 ? 1 : 0; P.bx = Math.round(4 * (1 - r)); P.by = Math.round(2 * (1 - r));
        P.nfx = 4 + Math.round(12 * (1 - r)); P.ffx = -5 - Math.round(6 * (1 - r)); P.glow = r < 0.4 ? 2 : 0; P.notch = r < 0.3 ? 3 : 0; P.cw = 1 - r;
      }
    } else if (MV === 'lantern') {   // 提灯：灯举过头顶、鬼火越烧越旺 → 往前一探，照出一扇青光
      if (st === CHARGE) {
        const r = ease.out(clamp01(q / 0.35)); pose(K.idle, K.lnW, r); P.by = -Math.round(2 * r);
        P.fl = q < 0.3 ? 1 : q < 0.65 ? 2 : 2 + (f12 & 1); P.eyes = 2; P.rim = q > 0.5 ? 2 : 1; P.cw = 0.5; P.ls = [0, 0.1, 0, -0.1][f12 & 3] * (1 - q);
        if (q > 0.7) { P.fx2 += jit; P.by += (f12 & 1); }
      } else if (st === CAST) {
        pose(tq < 1 / 12 ? K.lnW : K.ln, K.ln, tq < 1 / 12 ? 0.5 : 1); P.fl = 3; P.eyes = 3; P.rim = 3; P.bx = 2; P.nfx = 8; P.ffx = -7; P.cw = 1.5;
        P.ls = -0.45 + Math.round(clamp01(tq / 0.4) * 4) / 4 * 0.7;
      } else { const r = ease.inOut(clamp01(tq / 0.55)); pose(K.ln, K.idle, r); P.fl = r < 0.4 ? 2 : 1; P.ls = 0.3 * (1 - r) * ((f12 >> 1) & 1 ? 1 : -1); P.bx = Math.round(2 * (1 - r)); P.nfx = 4 + Math.round(4 * (1 - r)); P.ffx = -5 - Math.round(2 * (1 - r)); }
    } else {   // roar 灯灭：护灯 → 尖啸、灯火爆亮一下就灭 → 半透明地一闪一闪，再显形、灯重新点着
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(q / 0.5))); P.fl = (f12 % 3 === 0) ? 2 : 1; P.eyes = 2; P.by = 1; P.cw = 0.5; P.rim = 1; if (q > 0.5) { P.nx += jit; P.fx2 -= jit; } }
      else if (st === CAST) { pose(K.hunch, K.howl, ease.out(clamp01(tq / (2 / 12)))); P.eyes = 3; P.fl = tq < 2 / 12 ? 3 : 0; P.rim = 3; P.cw = 2; P.glow = 2; P.by = -2; P.ghost = tq >= 3 / 12 ? 1 : 0; }
      else { const r = ease.inOut(clamp01((tq - 0.2) / 0.5)); pose(K.howl, K.idle, r); P.by = -Math.round(2 * (1 - r)); P.fl = tq >= 0.65 ? 1 : 0; P.eyes = tq < 0.2 ? 2 : 1; P.cw = 1 - r * 0.5;
        P.ghost = tq < 0.5 ? ((f12 & 1) ? 2 : 1) : tq < 0.62 ? 1 : 0; }
    }
  }
  function deathPose(d, tq, f12) {
    if (d < 0) { P.by = -(f12 >> 3 & 1); return; }
    const jit = (f12 & 1) ? 1 : -1;
    if (d < 0.45) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.2))); P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 3; P.fl = (f12 & 1) ? 3 : 2; P.cw = 2; P.nx += jit; P.by = -2; P.rim = 2; P.ghost = f12 % 3 === 0 && d > 0.1 ? 1 : 0; return; }
    if (d < 1.2) {
      const q = ease.in(clamp01((d - 0.45) / 0.45)); pose(K.agony, K.slump, ease.inOut(clamp01((d - 0.45) / 0.6)));
      P.by = Math.round(-2 + 14 * q); P.nfx = Math.round(4 - 12 * q); P.ffx = Math.round(-5 + 15 * q); P.nfy = P.by; P.ffy = P.by;
      P.eyes = 2; P.hdrop = d >= 0.6 ? 1 : 0; P.ldrop = d >= 0.8 ? 1 : 0; P.fl = P.ldrop ? 1 : 2; P.cw = 1; return;
    }
    pose(K.slump, K.slump); P.by = 12; P.nfx = -8; P.ffx = 10; P.nfy = 12; P.ffy = 12; P.hdrop = 1; P.ldrop = 1;
    P.eyes = d < 1.45 ? 1 : d < 1.6 ? (f12 & 1) : 0; P.fl = d < 1.7 ? (f12 & 1) : 0; P.ghost = d > 1.6 ? 1 : 0;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：三更 = 戟尖，灯灭 = 盔缝，其余 = 灯笼
  function focus() {
    const f = (P.st === CHARGE || P.st === CAST) && MV === 'watchThrust' ? L.tip : (P.st === CHARGE || P.st === CAST) && MV === 'roar' ? L.face : L.lamp;
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  const reach = (s, t, R) => { const dx = t[0] - s[0], dy = t[1] - s[1], d = Math.hypot(dx, dy); return d <= R ? t : [s[0] + dx / d * R, s[1] + dy / d * R]; };
  function bodyXf() { B.reset(); B.move(P.bx, P.by); }
  function torsoXf() { bodyXf(); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function geo() {
    bodyXf(); const hipN = B.at(HIPN[0], HIPN[1]), hipF = B.at(HIPF[0], HIPF[1]);
    for (const [k, hip] of [['n', hipN], ['f', hipF]]) {
      const ft = [P[k + 'fx'], Math.min(0, P.by - P[k + 'fy'])], kn = B.ik(hip, ft, LT, LS, -1), dd = Math.hypot(ft[0] - kn[0], ft[1] - kn[1]) || 1;
      L[k] = { hip, kn, ft: [kn[0] + (ft[0] - kn[0]) / dd * LS, kn[1] + (ft[1] - kn[1]) / dd * LS] };
    }
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]);
    headXf(); L.face = B.at(8, -55); L.head = B.at(4, -54); B.reset();
    const a = P.ha, d = [Math.sin(a), -Math.cos(a)];
    L.hn = reach(L.shN, [P.nx + P.bx, P.ny + P.by], LA * 2 - 0.5);
    L.hf = reach(L.shF, P.two ? [L.hn[0] + d[0] * P.fo, L.hn[1] + d[1] * P.fo] : [P.fx2 + P.bx, P.fy2 + P.by], LA * 2 - 0.5);
    // 长戟：握点、方向、刃朝的一侧（hs）；掉在地上时平躺、刃朝上
    const hs = P.hdrop ? -1 : 1, ga = P.hdrop ? Math.PI / 2 : a;
    L.hg = P.hdrop ? [2, -1.5] : L.hn; L.hd = [Math.sin(ga), -Math.cos(ga)]; L.hp = [Math.cos(ga) * hs, Math.sin(ga) * hs];
    L.tip = hat(46, 0);
    // 灯笼：从远手吊下来（摆角 ls），掉在地上时侧躺
    const la = P.ldrop ? 1.35 : P.ls; L.la = [Math.sin(la), Math.cos(la)];
    L.ltop = P.ldrop ? [15, -6] : [L.hf[0] + L.la[0] * 2, L.hf[1] + L.la[1] * 2];
    L.lamp = lat(7, 0);
  }
  const hat = (u, v) => [L.hg[0] + L.hd[0] * u + L.hp[0] * v, L.hg[1] + L.hd[1] * u + L.hp[1] * v];
  const lat = (u, v) => [L.ltop[0] + L.la[0] * u + L.la[1] * v, L.ltop[1] + L.la[1] * u - L.la[0] * v];
  const cap = (a, b, r0, r1, m, t) => B.capW(E, a[0], a[1], b[0], b[1], r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (p, r, m, t) => B.dotW(E, p[0], p[1], r, m, t), px = (p, m, t) => B.pxW(E, p[0], p[1], m, t), ln = (a, b, m, t) => B.lnW(E, a[0], a[1], b[0], b[1], m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  // ───── 画（从后往前）─────
  function drawCloak() {
    const w = P.cw, f = P.cf, sw = [0, 1, 1, 1, 0, -1, -1, -1][f], bx = P.bx, by = P.by;
    part(); torsoXf(); B.poly(E, [[-1, -46], [-5, -48], [-8, -45], [-8, -40], [-3, -40]], CLOAK); B.ln(E, -5, -47, -7, -43, CLOAK, 7); B.ln(E, -3, -45, -6, -41, CLOAK, 3);   // 推到脑后的兜帽
    const a = B.at(-1, -44), b = B.at(-7, -41); B.reset();
    const hx0 = -19 - w * 6 + bx + sw, hy0 = -4 + by - w * 3, hx1 = -4 + bx, hy1 = -8 + by;
    const out = B.bez(b, [b[0] - 9 - w * 3, b[1] + 9 - w * 2], [hx0, hy0], 6), J = [0, 4, 1, 5, 1, 3, 0];
    const hem = []; for (let i = 1; i <= 5; i++) { const q = i / 5; hem.push([hx0 + (hx1 - hx0) * q, hy0 + (hy1 - hy0) * q + J[(i + (f >> 1)) % 7] * (1 - q * 0.5)]); }
    part(); polyW([a, ...out, ...hem, [-3 + bx, -26 + by], [a[0] + 1, a[1] + 5]], CLOAK);
    ln([b[0] - 1, b[1] + 2], [hx0 + 5, hy0 - 2], CLOAK, 3); ln([b[0] + 1, b[1] + 3], [hem[1][0], hem[1][1] - 4], CLOAK, 3);   // 褶
    ln([b[0] - 2, b[1] + 1], [out[3][0] - 1, out[3][1]], CLOAK, 7); ln([b[0] + 3, b[1] + 4], [hem[3][0] - 1, hem[3][1] - 6], CLOAK, 6);
    const edge = [[hx0, hy0], ...hem]; for (let i = 0; i + 1 < edge.length; i++) ln(edge[i], edge[i + 1], SPEC, 5);   // 发青光的破下摆
    part(); for (let i = 0; i < hem.length; i++) { if (!(J[(i + 1 + (f >> 1)) % 7] & 1) && i) continue; const p = i ? hem[i] : [hx0, hy0], k = 1 + (i & 1);   // 一条条魂丝往后拖
      B.strand(E, [p, [p[0] - 2 - w * 2 + sw * 0.5, p[1] + 2 + k], [p[0] - 5 - w * 4 - sw, p[1] + 2 + k * 1.5]], 1.3, 0.4, WISP); }
  }
  function drawPlume() {
    part(); headXf(); const s = [0, 1, 1, 1, 0, -1, -1, 0][P.pl], w = P.cw, main = B.bez([-1, -57], [-6, -62 + s], [-14 - w * 3, -58 + s * 2], 6);
    B.strand(E, main, 2.0, 0.5, SPEC);
    B.strand(E, B.bez([1, -58], [-3, -64 + s], [-10 - w * 2, -62 + s], 5), 1.2, 0.4, SPEC);
    part(); B.strand(E, B.bez([-1, -55], [-7, -57 + s], [-17 - w * 3, -51 + s * 2], 6), 1.6, 0.5, WISP);
    if (P.eyes >= 2) for (let i = 2; i < 6; i += 2) B.px(E, main[i][0], main[i][1], GL2);
    B.reset();
  }
  function drawLeg(k, far) {
    const g = L[k], m = far ? ARMD : ARM, mid = lerp(g.kn, g.ft, 0.5), drift = P.cw * 1.5 + 1.5;
    part(); cap(g.hip, g.kn, far ? 2.5 : 2.8, 2.1, m); if (!far) { ln(lerp(g.hip, g.kn, 0.25), lerp(g.hip, g.kn, 0.75), m, 7); px(lerp(g.hip, g.kn, 0.5), m, 9); }   // 腿甲
    part(); cap(g.kn, mid, 2.0, 1.7, m); ln([mid[0] - 1, mid[1]], [mid[0] + 1, mid[1]], m, 3);                                                      // 胫甲，到小腿一半就断了
    part(); const lo = lerp(mid, g.ft, 0.6); B.strand(E, [mid, lerp(mid, g.ft, 0.45), [lo[0] - drift * 0.5, g.ft[1] - 1.5], [lo[0] - drift * 1.6 - 2, g.ft[1] - 3.5]], 1.6, 0.3, far ? WISP : SPECM); px([mid[0], mid[1] + 1], SPEC, 7);                // 小腿以下化成魂雾，往后拖
    part(); dot(g.kn, far ? 1.8 : 2.1, m); polyW([[g.kn[0] - 1, g.kn[1] - 1.5], [g.kn[0] - 3, g.kn[1] - 2.5], [g.kn[0] - 2.5, g.kn[1] + 0.5]], m, far ? 4 : 6); px([g.kn[0] + 1, g.kn[1] - 1], m, 9);   // 带翼的护膝
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, hd = far ? L.hf : L.hn, m = far ? ARMD : ARM, el = B.ik(sh, hd, LA, LA, 1);
    part(); cap(sh, el, 2.2, 1.8, m); part(); cap(el, hd, 1.8, 1.6, m); dot(lerp(el, hd, 0.72), 2.0, m); if (!far) ln(lerp(el, hd, 0.2), lerp(el, hd, 0.55), m, 7);   // 上臂、前臂 + 喇叭口护腕
    part(); dot(el, 1.8, m, far ? 4 : 6); px(el, m, far ? 5 : 9);
    part(); dot(hd, 1.7, m); px([hd[0] + 1, hd[1] + 1], m, 3); px([hd[0] - 1, hd[1] - 1], m, 8);   // 铁手套
  }
  function drawPauldron(far) {
    part(); torsoXf(); const [x, y] = far ? SHF : SHN, m = far ? ARMD : ARM;
    B.ell(E, x, y + 1, 5.5, 4, 0.35, m); B.ln(E, x - 4, y + 1, x + 4, y + 2.5, m, 3); B.ln(E, x - 3, y + 3.5, x + 3, y + 4.5, m, 3);   // 三层甲叶
    if (!far) { B.ln(E, x - 3, y - 2, x + 2, y - 2, m, 8); B.px(E, x - 2, y, m, 9); B.px(E, x + 2, y + 0.5, m, 9); }
    B.reset();
  }
  function drawCuirass() {
    part(); torsoXf();
    B.poly(E, [[-6, -44], [5, -44], [8, -39], [9, -34], [7, -29], [-5.5, -29], [-7, -36]], ARM);
    B.ln(E, 6, -42, 8, -35, ARM, 7); B.ln(E, 8, -34, 7, -31, ARM, 6); B.px(E, 7, -39, ARM, 9);                         // 胸甲的鼓面
    B.ln(E, -5, -34, 7, -33, ARM, 3); B.ln(E, 1, -43, 3, -36, ARM, 3);                                                 // 腹甲的甲叶、胸脊
    for (const [x, y] of [[-4, -42], [4, -42], [-4, -32]]) B.px(E, x, y, ARM, 9);
    part(); B.ell(E, 2, -44, 5, 1.8, 0, ARM); B.ln(E, -2, -44, 6, -44, ARM, 7);                                         // 护颈
    B.reset();
  }
  function drawSkirt() {
    part(); torsoXf();
    B.poly(E, [[-7, -30], [7, -30], [9, -23], [6, -21.5], [-1.5, -22], [-7, -23.5]], ARM); B.ln(E, -6, -27, 8, -26.5, ARM, 3); B.ln(E, -6, -24.5, 8, -24, ARM, 3); B.ln(E, -5, -29, 7, -29, ARM, 7);
    part(); B.poly(E, [[-7, -31.5], [7, -31.5], [7, -29], [-7, -29]], WOOD); B.ln(E, -6, -31, 6, -31, WOOD, 8);                                      // 皮腰带
    part(); B.poly(E, [[5, -32], [7.5, -32], [7.5, -28.5], [5, -28.5]], BRASS); B.px(E, 6, -31, BRASS, 9);
    const t = P.tas * 0.4;
    part(); B.poly(E, [[2, -30], [7, -30], [7.5 + t, -16], [6 + t, -18], [4.5 + t, -15], [3.5 + t, -18], [2 + t, -16]], CLOAK);                     // 罩袍前片 + 钟纹
    B.ln(E, 2.5, -29, 2.5 + t, -17.5, CLOAK, 3); B.ln(E, 6, -29, 7 + t, -17.5, CLOAK, 7);
    B.ln(E, 2 + t, -16.5, 7.5 + t, -16.5, SPEC, 4);
    part(); B.poly(E, [[4, -27], [5, -27], [6, -25], [6.5, -24], [2.5, -24], [3, -25]], BRASS); B.px(E, 4.5, -23, BRASS, 8); B.px(E, 4, -26, BRASS, 9);
    part(); B.ln(E, -4, -29, -4.5, -26.5, WOOD, 3); B.poly(E, [[-7, -26.5], [-3, -26.5], [-3, -23.5], [-7, -23.5]], WOOD); B.ln(E, -6, -25, -4, -25, WOOD, 2); B.ln(E, -6, -26.5, -4, -26.5, WOOD, 8);   // 打更的木梆子
    B.reset();
  }
  function drawHelm() {
    part(); headXf(); B.ell(E, 2, -44.5, 3.2, 1.4, 0, VOIDM); B.px(E, 3, -44, GL1);   // 盔和护颈之间是空的
    part();
    B.poly(E, [[-3.5, -52], [-3, -57], [0, -61], [3.5, -63], [7, -62], [10, -59], [12, -55], [12.5, -51], [12, -47.5], [10, -45.5], [2, -45.5], [-1.5, -46.5], [-4, -49.5]], HELM);   // 尖顶大桶盔
    B.ln(E, 3, -62, -2, -55, HELM, 7); B.ln(E, 4, -61, 9, -59, HELM, 8); B.px(E, 3, -61, HELM, 9);                    // 盔顶的脊和高光
    B.ln(E, -3, -50, 12, -49, HELM, 7); B.ln(E, -3, -49, 12, -48, HELM, 3); for (const x of [-1, 3, 7, 11]) B.px(E, x, -47, HELM, 9);    // 下沿的箍和铆钉
    B.ln(E, 4, -57, 12, -57, HELM, 8); B.ln(E, 12, -56, 12, -51, HELM, 6);                                            // 眉箍、正脸
    const e = P.eyes, sl = e === 0 ? VOIDM : e === 1 ? GL2 : GL3;                                                       // T 字眼缝，缝里透出魂光
    B.ln(E, 5, -56, 13, -56, VOIDM); B.ln(E, 5, -55, 13, -55, sl); B.ln(E, 5, -54, 13, -54, VOIDM);
    B.ln(E, 8, -54, 8, -48, VOIDM); B.ln(E, 9, -54, 9, -48, e ? GL1 : VOIDM); B.ln(E, 10, -54, 10, -48, VOIDM);
    if (e) { B.px(E, 7, -55, e >= 2 ? GL3 : GL2, e >= 2 ? 4 : 0); B.px(E, 11, -55, e >= 2 ? GL3 : GL2, e >= 2 ? 4 : 0); B.px(E, 9, -51, e >= 2 ? GL2 : GL1); }
    for (const y of [-52, -50]) B.px(E, 6, y, e ? GL1 : VOIDM);                                                        // 透气孔
    if (e === 3) { B.px(E, 14, -55, GL2); B.px(E, 15, -55, GL1); B.px(E, 14, -56, GL1); B.px(E, 9, -47, GL2); B.px(E, 4, -55, GL1); }   // 魂光从缝里溢出来
    B.reset();
  }
  function drawLantern() {
    const fl = P.fl, glass = fl === 0 ? VOIDM : GL1, gt = [0, 2, 0, 4][fl];
    if (!P.ldrop) { part(); ln(L.hf, L.ltop, BRASS, 4); }
    part(); dot(lat(-0.5, 0), 1, BRASS, 6); polyW([lat(0, -1), lat(0, 1), lat(2.5, 4), lat(2.5, -4)], BRASS); px(lat(1, -1), BRASS, 9);   // 提环、尖顶
    part(); polyW([lat(2.5, -3.5), lat(2.5, 3.5), lat(10.5, 3.5), lat(10.5, -3.5)], glass, gt);                                          // 玻璃（里面的鬼火）
    if (fl) { const fr = [0, 1.6, 2.1, 2.8][fl], fy = 7.2 + [0, 0.5, -0.5][P.flk] * (fl < 3 ? 1 : 0), sw = [0, 1, -1][P.flk] * 0.6;
      dot(lat(fy, 0), fr, GL2); dot(lat(fy - fr * 0.7, sw), fr * 0.55, GL2); dot(lat(fy + 0.2, 0), fr * 0.5, GL3, fl === 3 ? 4 : 0); px(lat(fy - fr - 1, sw * 1.5), GL3); }   // 鬼火：外焰青、焰心白、火苗尖跳
    part(); for (const v of [-3.5, 3.5]) ln(lat(2.5, v), lat(10.5, v), BRASS, 6); ln(lat(2.5, -4), lat(2.5, 4), BRASS, 7);                   // 六角框（正中那根棱省掉，让火苗露出来）
    part(); polyW([lat(10.5, -4), lat(10.5, 4), lat(12, 3), lat(12, -3)], BRASS); px(lat(13, 0), BRASS, 5); px(lat(11, -2), BRASS, 9);
  }
  function drawHalberd() {
    part(); cap(hat(-22, 0), hat(30, 0), 1.1, 1.1, WOOD); for (const u of [-8, 10, 22]) ln(hat(u, -1.2), hat(u, 1.2), ARM, 6); ln(hat(-19, 0.5), hat(26, 0.5), WOOD, 7);   // 戟杆 + 铁箍
    part(); cap(hat(-24, 0), hat(-21, 0), 1.4, 1.1, ARM);                                                                                    // 杆尾的铁镦
    part(); polyW([hat(29, 1), hat(27.5, 3), hat(25, 5), hat(23, 8), hat(26, 7.6), hat(30, 7.9), hat(35, 7.9), hat(38, 7.4), hat(41, 8.2), hat(39, 5), hat(36, 3), hat(35, 1)], ARM);   // 月牙斧刃，两头翘起
    for (let u = 24; u <= 40; u += 1) px(hat(u, u < 26 ? 7.2 + (26 - u) * 0.35 : u > 38 ? 7.2 + (u - 38) * 0.35 : 7.3), ARM, 9);
    ln(hat(28, 5), hat(37, 5), ARM, 3);
    for (let i = 0; i < 3; i++) { const p = hat(29 + i * 3, 6.2); px(p, P.notch > i ? (P.notch === 3 ? GL3 : GL2) : ARM, P.notch > i ? 0 : 2); }   // 三道更痕
    part(); polyW([hat(31, -1), hat(33, -1), hat(32.5, -3.5), hat(30, -6.5), hat(29, -5.5), hat(30, -3)], ARM); px(hat(30, -5.5), ARM, 8);         // 背钩
    part(); cap(hat(28, 0), hat(34, 0), 1.6, 1.3, ARM); px(hat(29.5, -1), ARM, 9);                                                            // 戟头的銎
    part(); polyW([hat(33, -1.3), hat(35, -2.2), hat(40, -1.3), hat(46, 0), hat(40, 1.3), hat(35, 2.2), hat(33, 1.3)], P.glow >= 3 ? GL2 : ARM); ln(hat(34, 0), hat(44, 0), P.glow >= 2 ? GL3 : ARM, P.glow >= 2 ? 0 : 8);   // 矛尖
    if (P.glow === 1) px(hat(42, 0), GL2);
    if (!P.hdrop) { part(); const t0 = hat(27, -1.2), sw = P.tas + (P.st === MOVE ? -2 : 0);                                                  // 褪色的红缨
      B.strand(E, [t0, [t0[0] + sw * 0.4, t0[1] + 4], [t0[0] + sw * 0.9, t0[1] + 8]], 1.3, 0.5, RED); B.strand(E, [[t0[0] + 1, t0[1]], [t0[0] + 1 + sw * 0.6, t0[1] + 6]], 0.8, 0.4, RED, 7); }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawCloak(); drawPlume(); drawPauldron(1); drawArm(1); drawLeg('f', 1);
    drawCuirass(); drawLeg('n', 0); drawSkirt(); drawHelm(); drawLantern(); drawHalberd(); drawArm(0); drawPauldron(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.lamp[0] * z + spr.ox; LIGHTS[0].y = L.lamp[1] * z + spr.oy; LIGHTS[0].r = [0, 14, 20, 28][P.fl] * z;
    LIGHTS[1].x = L.face[0] * z + spr.ox; LIGHTS[1].y = L.face[1] * z + spr.oy; LIGHTS[1].r = [0, 4, 7, 10][P.eyes] * z;
    LIGHTS[2].x = L.tip[0] * z + spr.ox; LIGHTS[2].y = L.tip[1] * z + spr.oy; LIGHTS[2].r = P.glow >= 2 ? (4 + P.glow * 3) * z : 0;
    bake(spr, RIM);
    // 魂丝半透明（隔一个像素挖掉一个）；灯灭 / 受击时整个人都变成半透明（发光体留着）
    const o = spr.out, M = spr.mat, w = spr.w, zs = z > 1 ? 1 : 0;
    for (let y = 0; y < spr.h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] === 255 || GLOWSET[M[i]]) continue; const X = x >> zs, Y = y >> zs;
      if (P.ghost === 2 ? !((X & 1) && (Y & 1)) : P.ghost === 1 ? ((X + Y) & 1) : (M[i] === WISP && ((X + Y) & 1))) o[i] = 255; }
  }
  // 立绘：提灯（灯往前探到胸前、鬼火爆亮、眼缝全亮，不挡脸），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { poseAt(IDLE, 0.2, 0); pose(K.lnW, K.ln, 0.6); P.by = -2; P.fl = 3; P.eyes = 3; P.rim = 2; P.cw = 1; P.glow = 1; P.ls = 0; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2);
    PHEAD = [L.head[0] * 2 + PSPR.ox, L.head[1] * 2 + PSPR.oy, 12 * 2]; return PSPR; }
  function headShot() { poseAt(IDLE, 0.2, 0); P.eyes = 2; P.fl = 2; P.rim = 1; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); PHEAD = [L.head[0] * 2 + PSPR.ox, L.head[1] * 2 + PSPR.oy, 12 * 2]; return PSPR; }   // 头像：待机、眼缝亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (v) => scrX(v), sy = (v) => HY + v;
  let lastF = -1, lastNotch = 0;
  function strikeFx() {
    const hx = sx(L.tip[0]), hy = sy(L.tip[1]);
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 28, -0.8, 2.2, 'ghostLamp', 0.22, 3, 2);
    burst(hx, hy, 16, 40, 130, 0.2, 0.5, GLX, 20); burst(hx, HY - 2, 8, 20, 70, 0.3, 0.6, FXI.dust, 8);
    fx.cross(hx, hy, 5, 'ghostLamp', 0.18); hitDummy(1, 1); shake(0.15, 2);
  }
  function knockFx(c) {   // 报一更：梆子一响、戟头一圈光
    const x = sx(L.tip[0]), y = sy(L.tip[1]); ring(x, y, 0, GLX); burst(x, y, 6 + c * 3, 20, 60, 0.2, 0.4, GLX, 6); if (c === 3) { flash(0.05); fx.cross(x, y, 5, 'ghostLamp', 0.15); }
    sfx('boss', { k: 'gkClap', w: 0.5 + 0.2 * c }); if (c === 3) sfx('boss', { k: 'gkGong', w: 0.7 });
  }
  function thrustFx() {   // 三更：一道青光往前贯穿（整条横线由游戏画）
    const tx = L.tip[0], ty = sy(L.tip[1]);
    fx.beam(sx(tx - 24), ty, sx(tx + 36), ty, 2, 'ghostLamp', 0.3, 2); fx.beam(sx(tx - 7), ty - 2, sx(tx + 28), ty - 2, 1, 'ghostLamp', 0.2, 2); fx.beam(sx(tx - 7), ty + 2, sx(tx + 28), ty + 2, 1, 'ghostLamp', 0.2, 2);
    fx.cross(sx(tx), ty, 7, 'ghostLamp', 0.22); ring(sx(tx), ty, 1, GLX); burst(sx(tx), ty, 26, 60, 180, 0.2, 0.5, GLX, 8);
    fx.wave(sx(L.n.ft[0]), HY, 1, 28, 4, 'ghostLamp', 0.4, 2); burst(sx(L.n.ft[0]), HY - 1, 12, 20, 70, 0.3, 0.6, FXI.dust, 8);
    shake(0.35, 3); flash(0.1); hitDummy(1, 1);
    sfx('swing', { kind: 'thrust', w: 1 }); sfx('impact', { pal: 'frost', w: 1 }); sfx('boss', { k: 'gkGong', w: 1 });
  }
  function lanternFx() {   // 提灯：一扇青光从灯里照出去
    const lx = L.lamp[0], ly = L.lamp[1];
    for (let i = 0; i < 5; i++) { const a = -0.34 + i * 0.17, len = 42 - Math.abs(i - 2) * 4; fx.beam(sx(lx), sy(ly), sx(lx + Math.cos(a) * len), sy(ly + Math.sin(a) * len), i === 2 ? 2 : 1, 'ghostLamp', 0.35, 2); }
    ring(sx(lx), sy(ly), 1, GLX); burst(sx(lx), sy(ly), 30, 40, 150, 0.3, 0.7, GLX, 10); fx.cross(sx(lx), sy(ly), 7, 'ghostLamp', 0.25);
    shake(0.3, 3); flash(0.08); hitDummy(1, 1); sfx('impact', { pal: 'frost', w: 0.9 }); sfx('boss', { k: 'gkLamp', w: 1 });
  }
  function roarFx() {   // 灯灭：尖啸，两道环，灯火爆亮
    const x = sx(L.face[0]), y = sy(L.face[1]); ring(x, y, 1, GLX); ring(sx(0), HY - 2, 1, GLX); fx.cross(x, y, 9, 'ghostLamp', 0.3);
    burst(sx(L.lamp[0]), sy(L.lamp[1]), 34, 50, 170, 0.3, 0.7, GLX, 10); flash(0.12); shake(0.35, 3);
    sfx('boss', { k: 'gkWail', w: 1 }); sfx('impact', { pal: 'frost', w: 0.8 });
  }
  function snuffFx() {   // 灯灭了：一缕黑烟
    const x = sx(L.lamp[0]), y = sy(L.lamp[1]); for (let i = 0; i < 10; i++) spawn(K_RISE, x + (Math.random() - 0.5) * 3, y - 3, (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.6 + Math.random() * 0.4, FXI.shadow);
    burst(x, y, 10, 20, 60, 0.2, 0.4, GLX, 4); sfx('boss', { k: 'gkSnuff', w: 1 });
  }
  function onEnter(s) {
    if (s === CHARGE) { lastNotch = 0; if (MV === 'lantern') sfx('boss', { k: 'gkLamp', w: 0.5 }); else sfx('boss', { k: 'gkWhisper', w: MV === 'roar' ? 0.9 : 0.4 }); }
    if (s === CAST) { if (MV === 'watchThrust') thrustFx(); else if (MV === 'lantern') lanternFx(); else roarFx(); }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.9) { ring(sx(L.hg[0] - L.hd[0] * 22), sy(L.hg[1] - L.hd[1] * 22), 0, GLX); sfx('boss', { k: 'gkClap', w: 0.35 }); }
    if (s === ATTACK && t === 1 / 12) { sfx('swing', { kind: 'slash', w: 0.9 }); sfx('boss', { k: 'gkWhisper', w: 0.3 }); }
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('hit', { mat: 'metal', w: 0.9 }); }
    if (s === CAST && t === 2 / 12 && MV === 'roar') snuffFx();
    if (s === DEATH) {
      const d = Math.round((t - INCOMING) * 100) / 100;
      if (d === 0.05) sfx('boss', { k: 'gkDie', w: 1 });
      else if (d === 0.6) { sfx('hit', { mat: 'metal', w: 0.7 }); burst(sx(20), HY - 2, 10, 20, 70, 0.3, 0.5, FXI.dust, 8); }
      else if (d === 0.85) { for (let i = 0; i < 20; i++) spawn(K_DUST, sx(-14 + Math.random() * 30), HY - 1, (Math.random() - 0.5) * 50, -6 - Math.random() * 14, 0.5 + Math.random() * 0.4, FXI.dust); shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 0.8 }); }
      else if (d === 0.95) { burst(sx(16), HY - 3, 12, 20, 80, 0.2, 0.5, GLX, 10); sfx('boss', { k: 'gkClink', w: 0.9 }); }
      else if (d === 1.7) snuffFx();
      else if (d === 1.9) { for (let i = 0; i < 34; i++) spawn(K_RISE, sx(-16 + Math.random() * 34), HY - 3 - Math.random() * 30, (Math.random() - 0.5) * 8, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, GLX); sfx('boss', { k: 'fade', w: 0.8 }); }
    }
  }
  const EVENTS = [[1.9], [], [1 / 12, T_STRIKE], [], [2 / 12], [], [], [INCOMING + 0.05, INCOMING + 0.6, INCOMING + 0.85, INCOMING + 0.95, INCOMING + 1.7, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    const alive = state !== DEATH || stT < INCOMING + 1.6;
    if (alive && Math.random() < 0.22) spawn(K_RISE, sx(-12 + Math.random() * 18), HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -6 - Math.random() * 10, 0.6 + Math.random() * 0.5, GLX);   // 下摆和腿上飘起的魂丝
    if (P.fl && !P.ldrop && Math.random() < 0.08 + 0.12 * P.fl) spawn(K_EMBER, sx(L.lamp[0] + (Math.random() - 0.5) * 4), sy(L.lamp[1] - 4), (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.35, GLX);   // 灯里冒出的鬼火星
    if (state === MOVE) { const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f; if (f === 0 || f === 4) { const x = sx((f ? L.f : L.n).ft[0]);
      for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 16 + (P.flip ? 10 : -10), -3 - Math.random() * 6, 0.4 + Math.random() * 0.3, GLX);
      sfx('step', { w: 0.2 }); if (!f) sfx('boss', { k: 'gkDrift', w: 0.5 }); } } }
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：魂光从四周汇向发光体
      const a = Math.random() * 6.2832, r = 10 + Math.random() * 10, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, GLX, { a, r, w: 6 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'watchThrust') { const q = stT / (E.DUR[CHARGE] || 1), c = q < 0.25 ? 0 : q < 0.55 ? 1 : q < 0.85 ? 2 : 3; if (c > lastNotch) { lastNotch = c; knockFx(c); } }
    if (state === RECOVER && MV === 'roar' && stT < 0.6 && Math.random() < 0.6) spawn(K_RISE, sx(-8 + Math.random() * 24), sy(-7 - Math.random() * 48), (Math.random() - 0.5) * 10, -10 - Math.random() * 14, 0.5, GLX);
  }
  function fxReset() { lastF = -1; lastNotch = 0; }
  function fxBack(f12) {   // 地上的灯光和魂雾
    const R = FXR[GLX];
    if (P.fl && P.ghost !== 2) { const x = sx(L.lamp[0]), n = 3 + P.fl * 3; for (let dx = -n; dx <= n; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, R[Math.abs(dx) < n / 2 ? 3 : 4]); }
    for (let dx = -11; dx <= 8; dx += 2) if (((dx >> 1) + (f12 >> 2)) % 3 === 0) E.put(sx(dx + P.bx), HY, R[4]);
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'watchThrust'; return MVDUR[MV]; }

  // ───── 自己的声音（sfx('boss', { k })）─────
  const VOICES = {
    gkClap: (s, t, w, p) => { s.tone(t, 'sine', 1180, 0.07, 0.07 + 0.06 * w, { to: 980, pan: p }); s.tone(t + 0.005, 'triangle', 590, 0.1, 0.04 * w, { pan: p, rev: 0.5 }); s.nz(t, 0.04, 'bandpass', 2200, 3, 0.06 * w, { pan: p }); },   // 梆子：空心木头「笃」
    gkGong: (s, t, w, p) => { s.ring(t, 196, 2.2, 0.08 + 0.06 * w, { pan: p, rev: 0.6, parts: [[1, 1], [1.48, 0.6], [2.13, 0.4], [2.9, 0.25]] }); s.nz(t, 0.08, 'bandpass', 1800, 1.2, 0.06 * w, { pan: p }); s.thud(t, 120, 60, 0.2, 0.1 * w, { pan: p }); },   // 报更的锣
    gkWail: (s, t, w, p) => { s.tone(t, 'sine', 620, 1.3, 0.06 + 0.04 * w, { to: 260, vib: [6, 40, 0.1], pan: p, rev: 0.8 }); s.tone(t + 0.04, 'triangle', 930, 1.1, 0.03 * w, { to: 380, vib: [7, 50, 0.1], pan: p, rev: 0.8 });
      s.choir(t, [50, 57], 1.4, 0.05 * w, { dark: 1, pan: p }); s.nz(t, 1.2, 'bandpass', 900, 2, 0.05 * w, { to: 400, pan: p }); },   // 尖啸
    gkWhisper: (s, t, w, p) => { s.nz(t, 0.7, 'bandpass', 1400, 3, 0.04 + 0.03 * w, { to: 2600, pan: p, rev: 0.6 }); s.tone(t, 'sine', 330, 0.8, 0.025 * w, { to: 440, vib: [5, 20, 0.1], pan: p, rev: 0.7 }); },
    gkLamp: (s, t, w, p) => { s.riser(t, t + 0.5, 400, 2600, 0.04 + 0.04 * w, { pan: p }); s.ring(t + 0.1, 1568, 0.8, 0.03 * w, { pan: p, rev: 0.6 }); s.crackle(t, 0.5, 2600, 0.04 * w, { pan: p }); },   // 鬼火烧旺
    gkSnuff: (s, t, w, p) => { s.whoosh(t, 0.35, 2200, 300, 0.07 * w, { pan: p }); s.nz(t + 0.05, 0.4, 'lowpass', 600, 0.8, 0.05 * w, { pan: p }); s.ring(t, 2093, 0.3, 0.02 * w, { pan: p }); },   // 灯灭
    gkDrift: (s, t, w, p) => { s.whoosh(t, 0.5, 300, 900, 0.03 * w, { pan: p }); },
    gkClink: (s, t, w, p) => { s.ring(t, 2637, 0.4, 0.05 * w, { pan: p, parts: [[1, 1], [2.4, 0.4]] }); s.ring(t + 0.06, 1975, 0.3, 0.03 * w, { pan: p }); s.thud(t, 200, 90, 0.08, 0.06 * w, { pan: p }); },   // 灯笼落地
    gkDie: (s, t, w, p) => { s.tone(t, 'sine', 700, 2.0, 0.07, { to: 120, vib: [5, 60, 0.1], pan: p, rev: 0.8 }); s.choir(t, [45, 52], 2.2, 0.05, { dark: 1, pan: p });
      for (let i = 0; i < 4; i++) s.ring(t + 0.55 + i * 0.07, 1500 - 200 * i, 0.2, 0.04 * w, { pan: p }); },
  };

  return {
    name: '更夫', HX, R_EL: GLX, DUR, hero, P, GLOW_MATS: GLOW, HIT_POINT: [3, -33], EVENTS, MAX_H: 80, OWN_MAX: 40, SHEET_K: 3,
    SFX: { body: 'ghost', how: 'collapse', pal: 'frost', style: 'frost', w: 1, hover: 1 }, VOICES,
    MOVES: ['watchThrust', 'lantern', 'roar'], MOVE_NAMES: { watchThrust: '三更', lantern: '提灯', roar: '灯灭（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.5, 1.1, 1.3, 1.85, 1.95]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 6 / 12]],
      [CHARGE, [0, 0.3, 0.6, 0.9, 1.1], 'watchThrust'], [CAST, [0, 2 / 12], 'watchThrust'], [RECOVER, [0.1, 0.4], 'watchThrust'],
      [CHARGE, [0, 0.3, 0.6, 0.75], 'lantern'], [CAST, [0, 2 / 12], 'lantern'], [RECOVER, [0.2, 0.5], 'lantern'],
      [CHARGE, [0, 0.4], 'roar'], [CAST, [0, 1 / 12, 3 / 12], 'roar'], [RECOVER, [0.2, 0.5, 0.75], 'roar'],
      [HURT, [0.3, 0.38, 0.5, 0.7]], [DEATH, [0.4, 0.6, 0.9, 1.2, 1.6, 2.0, 2.4, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
