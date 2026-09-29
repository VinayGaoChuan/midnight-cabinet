// 针婆（小首领，深夜医院 · 急诊走廊）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_OgreEnemy.js。
// 依据：附录 G2 针婆；被动 破甲针（打带增益或护盾的单位伤害 ×3）；招式 volley 连射（一串针射向增益最多的）、
//       pluck 拔针（拔掉一片单位的增益和护盾、晕 1 秒）、needleRain2 针雨；半血 roar 针雨（怒吼）。
// 设定卡 ——
//   剪影：一个驼背的老巫婆：大驼峰上披着一条灰蓝的针织披肩，头往前探；头顶一座又高又乱的白发髻，插满大头针和缝衣针，
//         还横穿着两根长织针（招牌：一个活的针插）。两条细长的蜘蛛胳膊，每只手四根又长又细的手指，每根指尖都是一根针。
//         身体约 64 格高（连发髻 ~72），比护士长（护士帽、口罩、大针筒）矮一截、驼一截；和四臂骷髅的外科医生也完全不同。
//   脸（识别点）：一副又圆又厚、反着光的眼镜（铜框，镜片后面是放大了的小黑眼珠）；鹰钩长鼻；一张咧到耳根的缝过的笑嘴，
//         嘴唇上一道道红线缝针，嘴角往耳朵拉出一道缝合疤；尖下巴上一颗痣。
//   衣服：打着补丁的旧护士裙（褪色的李子紫，补丁用红线缝），泛黄的围裙（口袋里插着剪刀），脖子上挂一条黄色软尺，
//         腰上吊着两轴红线；条纹长袜、尖头黑鞋。
//   主色：发青的老人皮 + 暗紫的裙子 + 灰白的发髻；光：她缝东西用的发光红线（招式的线、镜片的红光），针的冷白反光。
//   招式（setMove）：
//     volley 连射：一只手伸进发髻拔出一把针 → 两手举在脸前、十根针指之间绷起一张发光的红线「翻花绳」、眼镜一闪
//                  → 两只手轮流往前甩，0.2 秒一把，一共六把（每把四根针）→ 甩甩手指、咯咯笑。
//     pluck 拔针：两手往前一探、十根指尖射出红线扎进前方的地里 → 身子后仰、攥拳往回拽、线绷得发亮
//                  → 猛地往肩后一扯（针从人堆里被拔出来往她这边飞、线一根根崩断）→ 把拔回来的针插回发髻。
//     needleRain2 针雨：两手捧在胸前 → 发髻里的针一根根浮上来、在头顶排成一圈，指尖牵着红线像提线木偶 → 两臂往天上一甩，针全射上天。
//     roar 针雨（半血）：缩成一团、指尖咔哒咔哒 → 猛地站直、两臂像蜘蛛一样张开、张嘴尖啸，发髻的针全竖起来发红光、镜片变红。
//   待机：两档呼吸、十根针指轮流一勾一勾；个性动作是用一根针指把眼镜往上推（镜片一闪），然后咯咯地笑两下、发髻的针跟着抖。
//   移动：蜘蛛一样的碎步：身子压低，两只长手也撑在地上，四个「脚」交替点地（指尖点出火星）。
//   死亡：捂住胸口、膝盖一软 → 往前扑倒在地、眼镜飞出去掉在前面 → 发髻里的针撒了一地 → 红线一缕缕散成光点。
PCD.define('B_Needler', (E) => {
  const { defDeep, defMat, fxRamp, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：皮、裙子、头发都压暗到中段，发光的红线和针尖才跳得出来 ─────
  const R_SKIN = ['#0c0e0c', '#1c211b', '#2b322a', '#3b4539', '#4c5849', '#5e6c5a', '#72816c', '#879780', '#9dac95', '#b5c2ab', '#cdd6c2'];    // 发青的老人皮
  const R_DRESS = ['#0a060c', '#150c18', '#211326', '#2e1a34', '#3b2242', '#4a2b50', '#5a3660', '#6c4470', '#7f5482', '#946896', '#aa7eaa'];   // 褪色的李子紫护士裙
  const R_HAIR = ['#0e0e12', '#1e1e24', '#303038', '#44444e', '#5a5a64', '#72727c', '#8a8a94', '#a4a4ac', '#bebec4', '#d8d8dc', '#f0f0ee'];    // 乱蓬蓬的白发髻
  const SKIN = defDeep(R_SKIN, { depth: 4, amb: 0.18 }), SKIND = defDeep(R_SKIN, { depth: 3, dark: 3, amb: 0.1 }), FACE = defDeep(R_SKIN, { depth: 6, amb: 0.3 });
  const DRESS = defDeep(R_DRESS, { depth: 9, amb: 0.12 }), DRESSD = defDeep(R_DRESS, { depth: 4, dark: 3, amb: 0.08 });
  const HAIR = defDeep(R_HAIR, { depth: 4, amb: 0.5 }), HAIRB = defDeep(R_HAIR, { depth: 4, dark: 2, amb: 0.14 });
  const APRON = defDeep('ivory', { depth: 5, dark: 1, amb: 0.3 }), SHAWL = defDeep('stormcoat', { depth: 6, dark: 1, amb: 0.14 });
  const PATCH1 = defDeep('hide', { depth: 2, amb: 0.24 }), PATCH2 = defDeep('stormcoat', { depth: 2, amb: 0.3 }), PATCH3 = defDeep('brass', { depth: 2, dark: 3, amb: 0.24 });
  const STOCK = defDeep('obsidian', { depth: 3, amb: 0.16 }), STOCKD = defDeep('obsidian', { depth: 3, dark: 3, amb: 0.08 }), SHOE = defDeep('obsidian', { depth: 3, dark: 1, amb: 0.1 });
  const STEEL = defDeep('bladesteel', { depth: 2, amb: 0.4 }), BRASS = defDeep('brass', { depth: 2, amb: 0.24 }), TOOTH = defDeep('ivory', { depth: 1, amb: 0.5 });
  const WOOD = defDeep('hide', { depth: 2, amb: 0.3 }), TAPE = defDeep('brass', { depth: 2, dark: 1, amb: 0.34 });
  const THREAD = fxRamp('nbThread', ['#ffffff', '#ffa294', '#ff3c3c', '#b0101c', '#4a0410']), TR = FXR[THREAD];   // 发光的红线：白 → 粉 → 红 → 暗红
  const NEEDLE = FXI.steel, NR = FXR[NEEDLE];                                                                  // 针的冷白反光（共用钢色阶）
  const THR = defMat([TR[4], TR[3], TR[2], TR[1]], 1, 1), THRW = defMat([TR[3], TR[2], TR[1], TR[0]], 1, 1), THRD = defMat([TR[4], TR[4], TR[3], TR[2]], 1, 1);
  const LENS = defMat(ramp(['#10181c', '#3c5a64', '#a8c8d0', '#eaf6f8']), 1, 1), LENSD = defMat(ramp(['#10181c', '#2a3e46', '#6a8e98', '#a8c8d0']), 1, 1);
  const GLINT = defMat([21, 21, 21, 21], 1, 1), PUPIL = defMat(ramp(['#050305', '#050305', '#140810', '#2a1020']), 1, 1), MOUTH = defMat(ramp(['#050204', '#12060a', '#2a0c12', '#4a1a20']), 1, 1);
  const FLATS = [THR, THRW, THRD, LENS, LENSD, GLINT, PUPIL, MOUTH];
  const hero = new Sprite(176, 124, 80, 114);
  const DUR = [2.6, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { volley: { 3: 0.8, 4: 1.2, 5: 0.5 }, pluck: { 3: 1.0, 4: 0.4, 5: 0.7 }, needleRain2: { 3: 1.2, 4: 0.45, 5: 0.7 }, roar: { 3: 0.5, 4: 0.8, 5: 0.5 } };
  let MV = 'volley';
  const HX = 68;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [TR[1], TR[2], TR[3]], k: 0.5 }, { x: 0, y: 0, r: 0, ramp: [TR[1], TR[2], TR[3]], k: 0.45 }];
  const RIM_R = [0, 11, 17, 25], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: TR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of FLATS) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 整个身子绕胯（HIP）前倾 lean；驼背的上身绕腰（WAIST）再挺 / 弯 arch；头绕脖子 hd。脚和手都是世界坐标（手随 bx / by 平移），
  // 手的朝向 an / af 是世界角度（0 朝右、正值朝下），sn / sf 手指张开，cn / cf 手指勾起。
  const HIP = [0, -19], WAIST = [0, -28], NECK = [10, -45], LN = [3, -18], LF = [-4, -18], SHN = [7, -42], SHF = [-1, -45];
  const D0 = { bx: 0, by: 0, lean: 0, arch: 0, hd: 0, jaw: 0, bris: 0, halo: 0, gs: 0,
    an: 1.2, af: 1.0, sn: 0.4, sf: 0.35, cn: 0.35, cf: 0.3, fn: [7, -2], ff: [-6, -2], hn: [21, -31], hf: [17, -34], ebn: 1, ebf: 1 };
  const K = {
    idle: {},
    specs: { hn: [17, -37], an: -1.45, sn: 0.05, cn: 0.1, hd: -0.1 },                                                                   // 用针指推眼镜
    scut: { lean: 0.42, by: 4, hd: -0.34, an: 1.35, af: 1.35, sn: 0.85, sf: 0.85, cn: 0.05, cf: 0.05, hn: [29, -14], hf: [24, -15] },   // 蜘蛛碎步
    aWind: { lean: -0.12, arch: -0.05, hd: -0.12, jaw: 1, hn: [3, -53], an: -2.4, sn: 0.1, cn: 0.7, hf: [19, -31] },                  // 普攻：捏针拉到耳后
    aStrike: { lean: 0.22, bx: 3, hd: 0.08, jaw: 2, hn: [38, -40], an: -0.1, sn: 0.9, cn: 0, hf: [15, -32] },
    aFollow: { lean: 0.18, bx: 2, hd: 0.05, jaw: 1, hn: [34, -33], an: 0.5, sn: 0.6, cn: 0.2, hf: [16, -32] },
    vPluck: { lean: -0.04, hd: 0.06, hn: [14, -59], an: -1.7, sn: 0.1, cn: 0.6, hf: [21, -35], af: 0.9 },                             // 连射：从发髻里拔针
    vFan: { lean: -0.06, arch: -0.12, hd: -0.12, jaw: 1, hn: [32, -42], an: -0.35, sn: 1, cn: 0, hf: [22, -57], af: -0.9, sf: 1, cf: 0 },   // 翻花绳
    vThrowN: { lean: 0.14, bx: 2, jaw: 2, hn: [38, -38], an: -0.05, sn: 0.9, cn: 0, hf: [8, -55], af: -2.3, sf: 0.2, cf: 0.7 },
    vThrowF: { lean: 0.1, bx: 2, jaw: 1, hn: [6, -50], an: -2.4, sn: 0.2, cn: 0.7, hf: [34, -47], af: -0.15, sf: 0.9, cf: 0 },
    pReach: { lean: 0.3, bx: 3, by: 1, hd: -0.14, jaw: 1, hn: [34, -24], an: 0.35, sn: 1, cn: 0, hf: [28, -28], af: 0.3, sf: 1, cf: 0, fn: [10, -2] },   // 拔针：线扎进地里
    pHaul: { lean: -0.22, bx: -2, by: 2, hd: 0.05, jaw: 2, hn: [17, -31], an: 0.1, sn: 0.3, cn: 0.95, hf: [13, -33], af: 0.1, sf: 0.3, cf: 0.95, fn: [13, -2], ff: [-9, -2] },
    pYank: { lean: -0.32, arch: -0.15, bx: -3, hd: -0.28, jaw: 2, hn: [-6, -58], an: -2.6, sn: 0.5, cn: 0.8, hf: [-10, -54], af: -2.7, sf: 0.5, cf: 0.8, fn: [12, -2], ff: [-9, -2] },
    pBack: { hd: 0.08, hn: [14, -59], an: -1.7, sn: 0.1, cn: 0.5 },                                                                    // 把拔回来的针插回发髻
    rCup: { lean: 0.12, by: 1, hd: 0.1, hn: [22, -25], an: -1.3, sn: 0.8, cn: 0.2, hf: [18, -27], af: -1.6, sf: 0.8, cf: 0.2, bris: 1 },   // 针雨：捧手
    rLift: { lean: -0.12, arch: -0.2, hd: -0.3, jaw: 1, hn: [25, -61], an: -1.35, sn: 0.9, cn: 0.1, hf: [9, -63], af: -1.8, sf: 0.9, cf: 0.1, halo: 1, bris: 1 },
    rFling: { lean: -0.18, arch: -0.3, by: -1, hd: -0.36, jaw: 2, hn: [31, -63], an: -1.0, sn: 1, cn: 0, hf: [3, -65], af: -2.2, sf: 1, cf: 0, bris: 2 },
    oCrouch: { lean: 0.38, by: 5, hd: 0.2, hn: [19, -31], an: -0.9, sn: 0.3, cn: 0.9, hf: [15, -33], af: -1.1, sf: 0.3, cf: 0.9, bris: 1, fn: [9, -2], ff: [-8, -2] },   // 半血：缩成一团
    oRoar: { lean: -0.16, arch: -0.32, by: -1, hd: -0.38, jaw: 2, hn: [37, -52], an: -0.5, sn: 1, cn: 0, hf: [-14, -57], af: -2.5, sf: 1, cf: 0, bris: 2, fn: [11, -2], ff: [-10, -2] },
    hurt: { lean: -0.2, arch: -0.08, bx: -3, hd: -0.3, jaw: 1, hn: [22, -45], an: -0.9, sn: 1, cn: 0, hf: [16, -47], af: -1.2, sf: 1, cf: 0, gs: 1 },
    dClutch: { lean: 0.18, by: 4, hd: 0.15, jaw: 2, hn: [14, -35], an: -2.0, sn: 0.4, cn: 1, hf: [10, -37], af: -2.2, sf: 0.4, cf: 1, fn: [9, -2], ff: [-7, -2], gs: 1 },
    dFall: { lean: 1.3, by: 7, bx: 2, hd: 0.2, jaw: 1, hn: [46, -9], an: 0.1, sn: 1, cn: 0.1, hf: [40, -8], af: 0.2, sf: 1, cf: 0.1, fn: [8, -2], ff: [-4, -2], gs: 1 },
  };
  const NUM = ['bx', 'by', 'lean', 'arch', 'hd', 'jaw', 'bris', 'halo', 'gs', 'an', 'af', 'sn', 'sf', 'cn', 'cf'], VEC = ['fn', 'ff', 'hn', 'hf'], DIS = ['ebn', 'ebf'];

  const P = {};
  const FIELDS = ['st', 'bx', 'by', 'lean', 'arch', 'hd', 'jaw', 'bris', 'halo', 'gs', 'an', 'af', 'sn', 'sf', 'cn', 'cf', 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy',
    'ebn', 'ebf', 'tw', 'glint', 'eyes', 'glow', 'rim', 'flash', 'dq', 'thr', 'reach', 'bob', 'pins', 'off', 'vk'];
  function base() { P.st = 0; P.tw = -1; P.glint = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.thr = 0; P.reach = 0; P.bob = 0; P.pins = 1; P.off = 0; P.vk = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 蜘蛛碎步：8 帧一圈（12 fps，2/3 秒）。两只脚差半圈，两只手和对侧的脚同拍（四个「脚」交替点地）
  const CYC = [[3, 0], [1, 0], [-1, 0], [-3, 0], [-4, 2], [-1, 4], [2, 4], [4, 2]];
  function walk(f) {
    f = ((f % 8) + 8) % 8; setK(K.scut, K.scut, 0);
    const a = CYC[f], b = CYC[(f + 4) % 8];
    P.fnx = 9 + a[0]; P.fny = -2 - a[1]; P.ffx = -3 + b[0]; P.ffy = -2 - b[1];
    P.hnx = 29 + b[0] * 1.6; P.hny = -14 - b[1] * 1.3; P.hfx = 24 + a[0] * 1.6; P.hfy = -15 - a[1] * 1.3;
    P.by = 4 + [1, 0, 0, 0, 1, 0, 0, 0][f]; P.hd = -0.34 + [0.04, 0, -0.02, 0, 0.04, 0, -0.02, 0][f]; P.tw = f & 3;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.hd = b ? 0.03 : 0; P.tw = Math.floor(TT * 4) % 4;
      const lp = tt % DUR[IDLE];
      if (lp >= 0.8 && lp < 1.6) {                                                                                    // 待机个性：用针指推眼镜，镜片一闪
        const k = lp - 0.8, q = k < 0.2 ? ease.out(k / 0.2) : k > 0.6 ? 1 - ease.in((k - 0.6) / 0.2) : 1; setK(K.idle, K.specs, q); P.by = b; P.tw = -1;
        if (k >= 0.25 && k < 0.42) { P.hny -= 1; P.glint = 1; }
      }
      if (lp >= 1.8 && lp < 2.4) { const k = Math.floor((lp - 1.8) * 12); P.jaw = [1, 0, 1, 0, 1, 0, 0][k] || 0; P.bris = k & 1 ? 0 : 0.5; P.hd = P.jaw ? -0.06 : 0.02; P.eyes = P.jaw ? 3 : 0; }   // 咯咯笑两下，发髻的针跟着抖
      P.hny += b; P.hfy += b;
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; P.thr = -1; }
    else if (st === ATTACK) {
      P.thr = -1;
      if (tq < 0.17) { setK(K.idle, K.aWind, seg(tq, 0, 0.17, ease.out)); P.glow = 1; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; }
      else if (tq < 0.42) { setK(K.aStrike, K.aFollow, seg(tq, T_STRIKE + 1 / 12, 0.42, ease.out)); P.glow = 2; P.rim = 1; }
      else { const q = seg(tq, 0.42, 0.72); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.thr = -1; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.thr = -1; }
      else { const q = seg(h, 0.35, 0.5); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); P.gs = Math.round(P.gs); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { volley: 0, pluck: 1, needleRain2: 2, roar: 3 };
  const T_STRIKE = 3 / 12;
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'volley') {
      if (st === CHARGE) {
        if (tq < 0.12) { setK(K.idle, K.vPluck, seg(tq, 0, 0.12, ease.out)); P.glow = 1; }
        else if (tq < 0.3) { setK(K.vPluck, K.vPluck, 0); P.hny += (Math.floor(tq * 12) & 1) ? -2 : 0; P.cn = sh ? 0.9 : 0.5; P.glow = 1; P.bris = sh ? 0.5 : 0; }   // 在发髻里掏针
        else if (tq < 0.45) { setK(K.vPluck, K.vFan, seg(tq, 0.3, 0.45, ease.out)); P.glow = 1; P.thr = 1; }
        else { setK(K.vFan, K.vFan, 0); trem(f12, 1); P.thr = 1; P.glow = 2 + (tq > 0.6 ? sh : 0); P.rim = tq > 0.6 ? 2 : 1; P.eyes = 2; P.glint = tq > 0.58 && tq < 0.67 ? 1 : 0; }
      } else if (st === CAST) {                                                                                       // 两手轮流甩，0.2 秒一把
        const k = Math.min(5, Math.floor(tq / 0.2)), ph = tq - k * 0.2, KT = k & 1 ? K.vThrowF : K.vThrowN; P.vk = k;
        if (ph < 1 / 12) setK(KT, KT, 0); else setK(KT, K.vFan, seg(ph, 1 / 12, 0.2) * 0.45);
        P.glow = ph < 1 / 12 ? 3 : 2; P.rim = ph < 1 / 12 ? 2 : 1; P.eyes = 2; P.thr = -1; P.jaw = ph < 1 / 12 ? 2 : 1;
      } else {
        if (tq < 0.25) { setK(K.vFan, K.idle, seg(tq, 0, 0.25)); P.sn = sh ? 1 : 0.2; P.sf = sh ? 0.2 : 1; P.jaw = sh ? 2 : 1; P.eyes = 3; }    // 甩甩手指、咯咯笑
        else setK(K.idle, K.idle, 0);
        P.glow = tq < 0.15 ? 1 : 0;
      }
    } else if (MV === 'pluck') {
      if (st === CHARGE) {
        P.thr = 2;
        if (tq < 0.2) { setK(K.idle, K.pReach, seg(tq, 0, 0.2, ease.out)); P.reach = 0; P.glow = 1; }
        else if (tq < 0.45) { setK(K.pReach, K.pReach, 0); P.reach = Math.round(seg(tq, 0.2, 0.42, ease.out) * 6) / 6; P.glow = 2; P.rim = 1; P.eyes = 2; }   // 红线射出去扎进地里
        else if (tq < 0.65) { setK(K.pReach, K.pHaul, seg(tq, 0.45, 0.65, ease.out)); P.reach = 1; P.glow = 2; P.rim = 1; P.eyes = 2; }
        else { setK(K.pHaul, K.pHaul, 0); trem(f12, 1.5); P.reach = 1; P.glow = 2 + sh; P.rim = 2; P.eyes = 2; P.jaw = sh ? 2 : 1; }            // 往回拽，线绷得发亮
      } else if (st === CAST) {
        if (tq < 1 / 12) setK(K.pHaul, K.pYank, 0.6); else setK(K.pYank, K.pYank, 0);
        P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.thr = -1;
      } else {
        if (tq < 0.3) setK(K.pYank, K.pBack, seg(tq, 0, 0.3, ease.out));
        else if (tq < 0.45) { setK(K.pBack, K.pBack, 0); P.hny += (Math.floor(tq * 12) & 1) ? 2 : 0; P.bris = sh ? 0.5 : 0; P.eyes = 3; P.jaw = 1; }   // 插回发髻
        else setK(K.pBack, K.idle, seg(tq, 0.45, 0.7));
        P.glow = tq < 0.15 ? 1 : 0;
      }
    } else if (MV === 'needleRain2') {
      if (st === CHARGE) {
        P.thr = 3;
        if (tq < 0.25) { setK(K.idle, K.rCup, seg(tq, 0, 0.25, ease.out)); P.glow = 1; P.halo = 0; }
        else if (tq < 0.9) { setK(K.rCup, K.rLift, seg(tq, 0.25, 0.9)); P.halo = Math.round(seg(tq, 0.3, 0.9, ease.lin) * 9) / 9; P.glow = 2; P.rim = 1; P.eyes = 2; }   // 针一根根浮上来
        else { setK(K.rLift, K.rLift, 0); trem(f12, 1); P.glow = 2 + sh; P.rim = 2; P.eyes = 2; }
        P.bob = sh;
      } else if (st === CAST) {
        if (tq < 1 / 12) setK(K.rLift, K.rFling, 0.7); else setK(K.rFling, K.rFling, 0);
        P.halo = 0; P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.thr = -1;
      } else { setK(K.rFling, K.idle, seg(tq, 0, 0.5)); P.glow = tq < 0.15 ? 1 : 0; P.pins = tq < 0.3 ? 0 : 1; }   // 发髻里的针一会儿才长回来
    } else {   // roar：半血的针雨（怒吼）
      if (st === CHARGE) { setK(K.idle, K.oCrouch, seg(tq, 0, 0.25, ease.out)); if (tq > 0.2) trem(f12, 1.5); P.tw = f12 & 3; P.glow = tq > 0.25 ? 2 : 1; P.rim = 1; P.thr = -1; }
      else if (st === CAST) {
        if (tq < 2 / 12) setK(K.oCrouch, K.oRoar, seg(tq, 0, 2 / 12, ease.out)); else { setK(K.oRoar, K.oRoar, 0); if (sh) trem(f12, 1.2); }
        if (tq > 0.5) { P.hd = -0.38 + (sh ? 0.08 : 0); P.jaw = sh ? 2 : 1; }                                        // 尖啸转成咯咯笑
        P.glow = tq < 0.25 ? 3 : 2; P.rim = tq < 0.25 ? 3 : 2; P.eyes = 2; P.thr = -1;
      } else { setK(K.oRoar, K.idle, seg(tq, 0, 0.45)); P.glow = tq < 0.2 ? 1 : 0; P.eyes = tq < 0.2 ? 2 : 0; }
    }
  }
  function deathPose(d, f12) {
    P.thr = -1;
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.8) { setK(K.hurt, K.dClutch, seg(d, 0.3, 0.55, ease.out)); if (d > 0.5) trem(f12, 1.5); P.eyes = 1; return; }   // 捂胸口、膝盖一软
    setK(K.dClutch, K.dFall, seg(d, 0.8, 1.2, ease.in)); P.eyes = 1;
    if (d > 0.95) P.off = 1;                                                                                          // 眼镜飞出去了
    if (d > 1.2 && d < 1.35) P.by += 1;
    P.pins = d > 1.2 ? 0 : 1;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function torsoXf() { bodyXf(); B.rot(WAIST[0], WAIST[1], P.arch); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const CURL = -1;
  // 四根长指：指根 → 第一节 → 第二节 → 针（每根手指的末端都是一根针）
  function fingers(h, a, s, c, twk) {
    const out = [], spr = 0.16 + 0.34 * s;
    for (let i = 0; i < 4; i++) {
      const fa = a + (i - 1.5) * spr, ca = c + (twk === i ? 0.55 : 0), a2 = fa + CURL * ca * 1.1, a3 = a2 + CURL * ca * 0.35;
      const b0 = [h[0] + Math.cos(fa) * 1.6, h[1] + Math.sin(fa) * 1.6], k1 = [b0[0] + Math.cos(fa) * 5, b0[1] + Math.sin(fa) * 5];
      const k2 = [k1[0] + Math.cos(a2) * 4.5, k1[1] + Math.sin(a2) * 4.5], tp = [k2[0] + Math.cos(a3) * 4.5, k2[1] + Math.sin(a3) * 4.5];
      out.push({ b0, k1, k2, tp });
    }
    return out;
  }
  function geo() {
    bodyXf(); const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.spool = B.at(-3, -21);
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]);
    headXf(); L.head = B.at(16, -51); L.bun = B.at(12, -65); L.lens = B.at(19, -52); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], 9, 9.5, -1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], 9, 9.5, -1); L.rn = rn; L.rf = rf;
    [L.en, L.hn] = limb(L.shN, [P.hnx + P.bx, P.hny + P.by], 12, 12, P.ebn); [L.ef, L.hf] = limb(L.shF, [P.hfx + P.bx, P.hfy + P.by], 12, 12, P.ebf);
    L.fgN = fingers(L.hn, P.an, P.sn, P.cn, P.tw); L.fgF = fingers(L.hf, P.af, P.sf, P.cf, P.tw < 0 ? -1 : (P.tw + 2) & 3);
    L.haloY = Math.max(-84, L.bun[1] - 14);
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // 汇聚点：连射是两手之间（出手时是甩出去的那只手），拔针是近手，针雨是头顶那圈针，怒吼是发髻，其余是近手的中指针尖
  function focus() {
    let f = L.fgN[2].tp;
    if (P.st === CHARGE || P.st === CAST) {
      if (MV === 'volley') f = P.st === CHARGE ? mid(L.hn, L.hf) : (P.vk & 1 ? L.fgF[2].tp : L.fgN[2].tp);
      else if (MV === 'pluck') f = L.hn;
      else if (MV === 'needleRain2') f = P.halo > 0 ? [L.bun[0], L.haloY] : mid(L.hn, L.hf);
      else f = L.bun;
    }
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? STOCKD : STOCK;
    part(); capW(r[0], r[1], kn[0], kn[1], 2.6, 2.0, m); capW(kn[0], kn[1], an[0], an[1], 1.9, 1.4, m); dot(kn[0], kn[1], 2.1, m);
    for (let i = 1; i < 4; i++) { const p = lerp(kn, an, i * 0.24); lnW(p[0] - 1.6, p[1], p[0] + 1.6, p[1], far ? DRESSD : DRESS, far ? 4 : 7); }   // 紫色横条的长袜
    const ax = Math.round(an[0]), ay = Math.round(an[1]);
    part(); polyW([[ax - 3, ay - 2], [ax + 1, ay - 2.5], [ax + 5, ay], [ax + 8, ay - 1.2], [ax + 9.5, ay - 2.6], [ax + 8.5, ay + 1], [ax + 6, ay + 2], [ax - 3, ay + 2]], far ? STOCKD : SHOE);   // 尖头鞋，鞋尖往上翘
    lnW(ax - 3, ay + 2, ax + 6, ay + 2, SHOE, 2); px(ax + 9.5, ay - 2.6, SHOE, 8); px(ax + 1, ay - 1, BRASS, far ? 4 : 8); px(ax + 2, ay - 1, BRASS, far ? 3 : 6);
  }
  // 补丁：一块布 + 一圈红线缝脚
  function patch(pts, m) {
    part(); B.poly(E, pts, m); B.ln(E, pts[0][0], pts[0][1], pts[1][0], pts[1][1], m, 8);
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let j = 0; j < n; j++) { const q = (j + 0.5) / n; B.px(E, a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, THRD); } }
  }
  function drawSkirt() {
    part(); bodyXf(); const sw = Math.max(-2, Math.min(3, (P.fnx - 7) * 0.35)), sb = Math.max(-2, Math.min(2, (P.ffx + 6) * 0.3));
    B.poly(E, [[-9, -29], [7, -29], [10, -22], [13 + sw, -14], [15 + sw, -7], [11 + sw, -8.5], [8, -6.5], [4, -8.5], [0, -6.5], [-4, -8.5], [-8 + sb, -6.5], [-12 + sb, -8.5], [-16 + sb, -7], [-14, -16], [-11, -24]], DRESS);
    B.ln(E, -6, -25, -8 + sb, -9, DRESS, 3); B.ln(E, -1, -26, -1, -8, DRESS, 3); B.ln(E, -10, -22, -13 + sb, -10, DRESS, 7); B.ln(E, -4, -25, -5, -10, DRESS, 7);   // 裙褶
    B.ln(E, -15 + sb, -8, 13 + sw, -8, DRESS, 2);
    patch([[-14, -20], [-9, -20.5], [-8.5, -14.5], [-13.5, -14]], PATCH1);
    patch([[-6, -13], [-2, -13.5], [-1.5, -9.5], [-6, -9]], PATCH3);
    // 围裙下半截：泛黄、有污渍，口袋里插着剪刀
    part(); B.poly(E, [[2, -29], [10, -29], [13 + sw * 0.6, -20], [15 + sw, -10], [9, -9], [3, -10], [1, -20]], APRON);
    B.ln(E, 3, -28, 3, -11, APRON, 8); B.ln(E, 9, -27, 12 + sw * 0.5, -11, APRON, 3); B.px(E, 6, -14, APRON, 2); B.px(E, 7, -13, APRON, 3); B.px(E, 11, -24, APRON, 3);
    part(); B.poly(E, [[5, -22], [11, -22], [11.5, -17], [5.5, -17]], APRON); B.ln(E, 5, -22, 11, -22, APRON, 2);
    part(); B.ell(E, 7, -23.5, 1.2, 1.2, 0, BRASS); B.ell(E, 9.5, -24, 1.2, 1.2, 0, BRASS); B.px(E, 7, -23.5, PUPIL); B.px(E, 9.5, -24, PUPIL);   // 剪刀的两个铜把手
    part(); B.ln(E, -9, -29, 10, -29, APRON, 8); B.ln(E, -9, -28, 10, -28, APRON, 3);                                   // 围裙带
  }
  function drawSpools() {
    bodyXf(); const sp = [[-3, -21, THR], [-8, -22.5, THRD]];
    for (const [x, y, m] of sp) {
      part(); B.ln(E, x, -28, x, y - 2.5, THRD);
      part(); B.poly(E, [[x - 1.6, y - 2], [x + 1.6, y - 2], [x + 1.6, y + 1.5], [x - 1.6, y + 1.5]], m);
      part(); B.ln(E, x - 2.2, y - 2.5, x + 2.2, y - 2.5, WOOD, 7); B.ln(E, x - 2.2, y + 2, x + 2.2, y + 2, WOOD, 4);
    }
  }
  function drawTorso() {
    part(); torsoXf();
    B.ell(E, -4, -38, 10, 10.5, 0, DRESS); B.ell(E, 5, -35, 7.5, 8, 0, DRESS); B.poly(E, [[-10, -29], [8, -29], [11, -36], [7, -45], [-6, -49], [-13, -40]], DRESS);   // 驼峰 + 胸
    B.ln(E, 2, -30, 8, -31, DRESS, 3); B.ln(E, -12, -33, -8, -29, DRESS, 3);
    patch([[-13, -33], [-9, -33.5], [-8.5, -29.5], [-12.5, -29]], PATCH2);
    // 针织披肩：盖住驼峰和肩，一排排针脚，下沿垂着流苏
    part(); B.poly(E, [[-14, -37], [-12, -45], [-5, -50.5], [3, -49.5], [9, -45.5], [11, -40], [6, -38.5], [0, -41], [-6, -38.5], [-11, -34]], SHAWL);
    for (let r = 0; r < 4; r++) for (let x = -11 + r; x < 7 - r; x += 2) B.px(E, x + (r & 1), -46 + r * 2 + Math.abs(x + 2) * 0.12, SHAWL, r & 1 ? 3 : 7);
    B.ln(E, -12, -45, -5, -50, SHAWL, 8);
    for (const [x, y] of [[-11, -34], [-8, -36], [-5, -38], [-2, -39.5], [2, -40], [6, -38.5], [9, -39.5]]) { B.ln(E, x, y, x - 0.5, y + 2.5, SHAWL, 4); }
    patch([[-9, -46], [-5, -47], [-4.5, -43], [-8.5, -42.5]], PATCH1);
    // 围裙上半截 + 蕾丝小领子
    part(); B.poly(E, [[4, -42], [9, -41], [11, -34], [10, -29], [3, -29], [2, -36]], APRON); B.ln(E, 4, -41, 3, -31, APRON, 8); B.px(E, 7, -35, APRON, 3); B.px(E, 8, -34, APRON, 3);
    part(); B.poly(E, [[5, -46], [11, -44.5], [10, -43], [8, -43.5], [6, -42.5], [4.5, -44]], APRON); B.px(E, 7, -43.5, APRON, 3); B.px(E, 9, -43.5, APRON, 3);
    // 黄色软尺：挂在脖子上，两头垂到胸前
    part(); B.strand(E, [[5, -45], [4.5, -40], [4, -34], [4.5, -31]], 0.9, 0.9, TAPE); B.strand(E, [[10.5, -44], [11.5, -39], [11, -35]], 0.9, 0.9, TAPE);
    for (let y = -43; y < -31; y += 2) B.px(E, 4.4 + (y + 40) * -0.05, y, TAPE, 2);
    B.px(E, 4.5, -31, TAPE, 9); B.px(E, 11, -35, TAPE, 9);
  }
  function drawBun() {
    headXf(); const b = P.bris;
    part(); B.ell(E, 12.8, -61.5, 6.4, 5.6, -0.1, HAIR); B.ell(E, 12.2, -67.5, 4.4, 3.4, -0.1, HAIR);   // 又高又圆的白发髻
    B.ln(E, 7.5, -60, 12, -57, HAIR, 3); B.ln(E, 9, -64.5, 17, -62, HAIR, 3); B.ln(E, 9, -66, 15, -69.5, HAIR, 3); B.ln(E, 9, -63, 12, -66, HAIR, 8); B.ln(E, 14, -60, 17, -58, HAIR, 8);   // 盘起来的一圈圈
    part(); B.ell(E, 11.8, -71.8, 2.6, 2, 0, HAIR); B.px(E, 11, -72.5, HAIR, 8);                                              // 顶上的小髻
    for (const [x0, y0, x1, y1] of [[7.8, -62, 6, -64.5], [16.5, -66, 18.5, -68], [8, -68, 6.5, -69], [13.5, -72, 14, -74], [17.5, -61, 19.5, -61.5]]) B.ln(E, x0, y0, x1, y1, HAIR, 8);   // 支棱出来的乱发丝
    if (!P.pins && P.st === DEATH) return;
    // 两根横穿发髻的长织针（带圆头）
    part(); B.ln(E, 5, -65.5 - b, 19.5, -74 - b, STEEL, 8); B.ln(E, 6, -64.5 - b, 19.5, -73 - b, STEEL, 3); B.ell(E, 19.8, -74 - b, 1.1, 1.1, 0, b >= 1.5 ? THRW : THR);
    part(); B.ln(E, 18.5, -64 - b, 6.5, -75.5 - b, STEEL, 8); B.ell(E, 6.3, -75.8 - b, 1.1, 1.1, 0, b >= 1.5 ? THRW : TOOTH, 7);
    if (!P.pins) return;
    // 大头针、缝衣针：钢针杆 + 红玻璃 / 珍珠 / 铜的头
    const PINS = [[17.5, -61, -0.45, 5, 0], [7.5, -61, -2.75, 5, 1], [15.5, -66.5, -0.95, 5, 2], [9, -67, -2.25, 5, 0], [13, -73, -1.35, 4.5, 1], [18.5, -57.5, 0.15, 4, 2], [6.5, -57, -3.05, 4, 0]];
    for (const [x, y, a, l, hk] of PINS) {
      const ln = l + b * 1.5, ex = x + Math.cos(a) * ln, ey = y + Math.sin(a) * ln;
      part(); B.ln(E, x, y, ex, ey, STEEL, 4); B.px(E, x + Math.cos(a) * (ln - 1), y + Math.sin(a) * (ln - 1), STEEL, 9);
      if (b >= 1.5) B.px(E, ex, ey, THRW); else if (hk === 0) B.px(E, ex, ey, THR); else if (hk === 1) B.px(E, ex, ey, TOOTH, 8); else B.px(E, ex, ey, BRASS, 8);
    }
  }
  function drawHead() {
    headXf(); const j = P.jaw;
    part(); B.ell(E, 10.5, -53, 3.8, 3.5, 0.4, HAIRB); B.strand(E, [[9, -53], [7.5, -50], [8, -47]], 1.4, 0.5, HAIRB);                         // 后脑的乱发
    part(); B.ell(E, 15.5, -50.5, 7, 6.6, 0, FACE); B.poly(E, [[11, -49], [20, -48.5], [22.5, -47], [22, -45], [18, -44.5], [13, -45], [11, -46.5]], FACE);   // 头 + 脸颊
    B.ln(E, 16, -55.5, 20, -55, FACE, 3); B.ln(E, 15, -54, 19, -53.8, FACE, 7); B.ln(E, 13, -48, 15, -46, FACE, 3); B.ln(E, 17, -47.5, 19.5, -47, FACE, 3);   // 抬头纹、法令纹
    B.px(E, 17.5, -48.5, FACE, 8); B.px(E, 18.5, -48.5, FACE, 7); B.px(E, 12, -54, FACE, 8);
    part(); B.ell(E, 11.3, -50, 1.4, 2.2, 0.2, FACE); B.px(E, 11.3, -50, FACE, 3); B.px(E, 11.3, -47.6, BRASS, 8);                           // 耳朵 + 耳垂上的一根别针
    part(); B.ell(E, 13, -56, 5.8, 2.2, -0.2, HAIR); B.ln(E, 9, -56, 16, -57.8, HAIR, 8);         // 往上梳的发际
    // 嘴：咧到耳根、被红线缝着的笑。张嘴时下巴绕下颌角往下转
    if (j) { part(); B.poly(E, [[13.5, -45.5], [22.5, -46.5], [23, -43 + j], [15, -43 + j * 0.6]], MOUTH); }
    part(); B.save(); B.rot(12.5, -45, j * 0.2);
    B.poly(E, [[12.5, -45], [22, -45], [23, -43.5], [24, -40.5], [21.5, -40.3], [16, -41.5], [13, -43]], FACE);
    B.ln(E, 15, -42, 22, -41.2, FACE, 3); B.px(E, 22.5, -41.5, FACE, 8); B.px(E, 21, -42.3, FACE, 2); B.px(E, 20.5, -42.8, FACE, 7);            // 尖下巴 + 一颗痣
    if (j) for (let x = 15; x <= 21; x += 2) B.px(E, x, -44.2, TOOTH, x === 19 ? 3 : 7);                                                     // 下排牙（缺一颗）
    B.restore();
    for (let x = 14.5; x <= 22; x += 1) { if (x === 17.5 || x === 20.5) continue; B.px(E, x, j ? -45.8 : -45, TOOTH, (x * 2) & 1 ? 8 : 6); }   // 上排黄牙
    if (!j) B.ln(E, 14, -44.3, 22.5, -45.2, MOUTH);
    for (const x of [15.5, 18, 20.5]) B.ln(E, x, -46.5, x + 0.3, j ? -43.5 : -43.8, THRD);                                                    // 嘴唇上的红线缝针
    B.ln(E, 14, -45, 11.8, -47.3, THRD); B.px(E, 13, -45.3, THRD); B.px(E, 12.6, -46.8, THRD);                                                 // 嘴角往耳朵拉出的缝合疤
    // 鹰钩长鼻
    part(); B.strand(E, [[21.5, -51], [24, -49.5], [26, -47.3], [26.3, -45.8], [25.2, -45.2]], 1.5, 0.6, FACE); B.ln(E, 22, -51, 24.8, -48.5, FACE, 8); B.px(E, 24.2, -46.7, FACE, 2); B.px(E, 25, -48.8, FACE, 3);
    if (P.off) return;
    drawSpecs();
  }
  // 又圆又厚的眼镜：铜框、反光的厚镜片、后面放大的小黑眼珠。gs 1 = 被打歪
  function drawSpecs() {
    headXf(); if (P.gs) { B.rot(21, -52, 0.3); B.move(0.5, 1); }
    const E2 = P.eyes, red = E2 === 2, gl = P.glint;
    part(); B.ell(E, 26, -52.5, 2.3, 3.3, 0, BRASS, 6);                                                                                  // 远镜片（在鼻梁那一边）
    part(); B.ell(E, 26.1, -52.5, 1.4, 2.4, 0, gl ? GLINT : red ? THR : LENSD); if (!gl && !red && E2 !== 3) { B.px(E, 26.4, -52, PUPIL); B.px(E, 26.4, -51, PUPIL); }
    part(); B.ell(E, 19.5, -52, 4, 4, 0, BRASS); B.px(E, 17, -55, BRASS, 9);                                                          // 近镜片的铜框
    part(); B.ell(E, 19.5, -52, 3, 3, 0, gl ? GLINT : red ? THR : LENS);
    if (!gl) {
      if (red) { B.px(E, 19.5, -52, THRW); B.px(E, 20, -52, THRW); B.px(E, 18, -53.5, GLINT); }
      else if (E2 === 1) { B.ln(E, 17, -54, 21, -50, PUPIL); B.px(E, 18, -51, LENSD); B.px(E, 20, -53, LENSD); }                         // 镜片裂了
      else if (E2 === 3) { B.ln(E, 17.5, -52, 20.5, -52.5, PUPIL); B.ln(E, 17, -50.5, 21, -50.5, LENSD); }                                 // 笑眯了眼
      else { B.ell(E, 20.3, -51.8, 1.2, 1.2, 0, PUPIL); B.ln(E, 17, -50, 22, -50, LENSD); B.ln(E, 18, -49.2, 21, -49.2, LENSD); B.px(E, 17.5, -53.8, GLINT); B.px(E, 18.3, -54.5, GLINT); B.px(E, 18.3, -53.8, GLINT); }   // 放大的眼珠 + 斜的反光
    }
    part(); B.ln(E, 23.4, -52.6, 23.8, -52.8, BRASS, 7); B.ln(E, 15.5, -52.5, 11.6, -51.3, BRASS, 5);                                      // 鼻梁架、镜腿
  }
  function specsOnGround() {   // 死后：眼镜掉在身前的地上
    B.reset(); const x = 64, y = -2;
    part(); B.ell(E, x, y, 2.6, 1.6, 0, BRASS); part(); B.ell(E, x, y, 1.8, 1, 0, LENS); B.px(E, x - 1, y - 1, GLINT);
    part(); B.ell(E, x + 5.5, y, 2.6, 1.6, 0, BRASS); part(); B.ell(E, x + 5.5, y, 1.8, 1, 0, LENSD); B.ln(E, x + 4.5, y - 1, x + 6.5, y + 1, PUPIL);
    part(); B.ln(E, x + 2.4, y - 1, x + 3.2, y - 1, BRASS, 7); B.ln(E, x - 2.5, y, x - 6, y - 2, BRASS, 5);
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? SKIND : SKIN, dm = far ? DRESSD : DRESS;
    part(); dot(sh[0], sh[1], far ? 3.2 : 3.6, dm); capW(sh[0], sh[1], el[0], el[1], 3.0, 2.5, dm); if (!far) px(sh[0] - 1, sh[1] - 2, dm, 8);   // 袖子（到肘，袖口破）
    const cu = lerp(sh, el, 0.9); px(cu[0], cu[1] + 2, dm, far ? 3 : 4);
    part(); capW(el[0], el[1], h[0], h[1], 1.5, 1.15, m); dot(el[0], el[1], 1.7, m); if (!far) px(el[0], el[1] - 1, m, 8);                   // 骨头一样细的小臂、尖肘
    const w = lerp(el, h, 0.78); part(); dot(w[0], w[1], 1.5, THRD); px(w[0] - 0.5, w[1] - 1, THR);                                            // 手腕上缠着的红线
    part(); dot(h[0], h[1], 2.1, m); px(h[0], h[1] - 1, m, far ? 5 : 7);
    const F = far ? L.fgF : L.fgN, hot = P.glow >= 2;
    for (const f of F) {
      part(); capW(f.b0[0], f.b0[1], f.k1[0], f.k1[1], 0.8, 0.7, m); capW(f.k1[0], f.k1[1], f.k2[0], f.k2[1], 0.7, 0.55, m); dot(f.k1[0], f.k1[1], 0.9, m, far ? 5 : 8);
      part(); lnW(f.k2[0], f.k2[1], f.tp[0], f.tp[1], STEEL, far ? 6 : 9); px(f.k2[0], f.k2[1], BRASS, far ? 4 : 7);                        // 针 + 顶针圈
      if (hot) px(f.tp[0], f.tp[1], THRW); else px(f.tp[0], f.tp[1], STEEL, 9);
    }
  }
  // 发光的红线（一段带下垂的弧）
  function thread(a, b, sag, m) {
    const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag], n = Math.max(3, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3)), pts = B.bez(a, c, b, n);
    for (let i = 1; i < pts.length; i++) lnW(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], m);
  }
  const GP = [[46, 0], [52, 0], [58, 0], [64, 0], [49, 0], [55, 0], [61, 0]];   // 拔针：线扎进地里的点
  function drawThreads() {
    const tm = P.glow >= 3 ? THRW : P.glow >= 2 ? THR : THRD; B.reset();
    if (P.thr === 0) { part(); const t = L.fgN[3].tp; thread(t, L.spool, 5 + (P.tw & 1), THR); }                               // 待机：从指尖垂到腰上的线轴
    else if (P.thr === 1) { part(); for (let i = 0; i < 4; i++) { thread(L.fgN[i].tp, L.fgF[3 - i].tp, 1, tm); thread(L.fgN[i].tp, L.fgF[(i + 1) & 3].tp, 1.5, THR); } }   // 翻花绳
    else if (P.thr === 2 && P.reach > 0) {
      part(); const tips = [...L.fgN.map((f) => f.tp), ...L.fgF.slice(0, 3).map((f) => f.tp)];
      tips.forEach((t, i) => { const g = GP[i], e = lerp(t, g, P.reach); thread(t, e, P.reach < 1 ? -2 : 0, i < 4 ? tm : THR); if (P.reach >= 1) { px(g[0], g[1] - 1, THRW); px(g[0] - 1, g[1], THR); px(g[0] + 1, g[1], THR); } });
    } else if (P.thr === 3 && P.halo > 0) {
      part(); const n = Math.round(P.halo * 9);
      for (let i = 0; i < n; i++) { const j = HO[i], hp = haloPt(i), f = j >= 4 ? L.fgN[Math.min(3, j - 4)] : L.fgF[3 - j]; thread(f.tp, [hp[0], hp[1] + 3], 1, THRD); }   // 指尖牵着针：提线木偶
    }
  }
  const HO = [4, 3, 5, 2, 6, 1, 7, 0, 8];   // 针从中间往两边一根根浮上来
  const haloPt = (i) => { const o = HO[i] - 4; return [L.bun[0] + o * 4.4, L.haloY + Math.abs(o) * 1.4 + ((i + P.bob) & 1)]; };
  function drawHalo() {
    const n = Math.round(P.halo * 9);
    for (let i = 0; i < n; i++) { const [x, y] = haloPt(i); part(); lnW(x, y - 4, x, y + 3, STEEL, 9); px(x, y + 3, GLINT); px(x, y - 4, P.glow >= 3 ? THRW : THR); }   // 针尖朝下悬在头顶
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawArm(1); drawLeg('f', 1); drawLeg('n', 0);
    drawSkirt(); drawSpools(); drawTorso();
    drawBun(); drawHead(); drawHalo(); drawThreads();
    drawArm(0);
    if (P.off) specsOnGround();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0;
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (6 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2 && !P.off) { LIGHT[1].x = L.lens[0] * z + spr.ox; LIGHT[1].y = L.lens[1] * z + spr.oy; LIGHT[1].r = 6 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：半血尖啸那一刻（站直、两臂张开、发髻的针全竖起来发红光），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(16, -56); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'volley'; poseAt(IDLE, 0.2, 0); P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(16, -56); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机侧脸、镜片反光、发髻插满针

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let pullT = 9, lastF = -1, lastThrow = -1;
  function pins(x, y, n, vx, vy) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y, vx + (Math.random() - 0.5) * 90, vy - Math.random() * 70, 0.6 + Math.random() * 0.4, NEEDLE, { g: 260, floor: HY, sz: 1 }); }
  function strikeFx() {
    const t = L.fgN[2].tp, x = sx(t[0]), y = sy(t[1]);
    fx.link(x, y, x + 46, y + 3, NEEDLE, 0.12, 2); fx.link(x, y + 1, x + 30, y + 3, THREAD, 0.16, 1);
    burst(x, y, 10, 40, 110, 0.15, 0.35, NEEDLE, 10); fx.cross(x, y, 6, THREAD, 0.15); hitDummy(1, 1); shake(0.15, 2);
  }
  function throwFx(k) {   // 连射：一把四根针
    const F = k & 1 ? L.fgF : L.fgN;
    F.forEach((f, i) => { const x = sx(f.tp[0]), y = sy(f.tp[1]); fx.link(x, y, x + 64, y + (i - 1.5) * 5 + 4, NEEDLE, 0.12, 2); if (i === 1) fx.link(x, y, x + 36, y + 2, THREAD, 0.14, 1); });
    const c = F[2].tp; burst(sx(c[0]), sy(c[1]), 8, 30, 100, 0.12, 0.3, NEEDLE, 8); fx.cross(sx(c[0]), sy(c[1]), 5, THREAD, 0.12); hitDummy(0, 1); shake(0.1, 1);
    sfx('boss', { k: 'nbFlick', w: 0.9 }); sfx('swing', { kind: 'throw', w: 0.5 });
  }
  function yankFx() {
    const x0 = sx(55), h = L.hn;
    ring(x0, HY - 2, 1, THREAD); fx.wave(x0, HY, -1, 30, 5, THREAD, 0.35, 2);
    for (let i = 0; i < 5; i++) fx.link(sx(h[0]), sy(h[1]), x0 + (i - 2) * 7, HY - 3, THREAD, 0.18, 2);   // 线崩断
    pins(x0, HY - 6, 20, -170, -70); burst(x0, HY - 4, 22, 40, 130, 0.2, 0.5, THREAD, 20); burst(sx(h[0]), sy(h[1]), 10, 30, 90, 0.2, 0.4, NEEDLE, 10);
    fx.cross(x0, HY - 6, 9, NEEDLE, 0.2); flash(0.08); shake(0.35, 3); hitDummy(1, 1); pullT = 0;
  }
  function rainFx() {
    const c = L.bun, x = sx(c[0]), y = sy(L.haloY);
    for (let i = 0; i < 9; i++) { const hx = x + (i - 4) * 4.4; fx.link(hx, y, hx + (i - 4) * 3, y - 90, NEEDLE, 0.2, 2); spawnX(K_PHYS, hx, y, (i - 4) * 12, -280 - Math.random() * 60, 0.5, NEEDLE, { g: 60, sz: 1 }); }
    ring(x, y, 1, THREAD); ring(x, y + 10, 0, NEEDLE); burst(x, y, 20, 40, 130, 0.2, 0.5, THREAD, 30); flash(0.1); shake(0.3, 3);
  }
  function roarFx() {
    const c = L.bun, x = sx(c[0]), y = sy(c[1]);
    ring(x, y, 1, THREAD); ring(sx(4), HY - 32, 1, NEEDLE); flash(0.12); shake(0.35, 3);
    for (let i = 0; i < 30; i++) { const a = -PI / 2 + (Math.random() - 0.5) * 2.8, v = 100 + Math.random() * 120; spawnX(K_PHYS, x, y - 3, Math.cos(a) * v, Math.sin(a) * v, 0.8 + Math.random() * 0.5, i % 3 ? NEEDLE : THREAD, { g: 160, floor: HY, sz: 1 }); }
    burst(x, y, 16, 50, 120, 0.2, 0.5, THREAD, 20);
  }
  function onEnter(s) {
    if (s === CAST) {
      lastThrow = 0; sfx('impact', { pal: 'blood', w: MV === 'volley' ? 0.6 : 0.9 });
      if (MV === 'volley') { throwFx(0); ring(sx(L.fgN[2].tp[0]), sy(L.fgN[2].tp[1]), 0, THREAD); flash(0.06); shake(0.35, 3); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'pluck') { yankFx(); sfx('boss', { k: 'nbYank', w: 1 }); sfx('swing', { kind: 'throw', w: 0.8 }); sfx('hit', { mat: 'metal', w: 0.5 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'needleRain2') { rainFx(); sfx('boss', { k: 'nbRain', w: 1 }); sfx('swing', { kind: 'throw', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else { roarFx(); sfx('boss', { k: 'nbShriek', w: 1 }); sfx('boss', { k: 'nbScatter', w: 0.8 }); }
    }
    if (s === CHARGE) {
      lastF = -1;
      if (MV === 'volley') sfx('boss', { k: 'nbPluck', w: 1 });
      else if (MV === 'pluck') sfx('boss', { k: 'nbClick', w: 0.8 });
      else if (MV === 'needleRain2') sfx('boss', { k: 'nbShimmer', w: 1 });
      else sfx('boss', { k: 'nbClick', w: 1 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'nbClick', w: 0.5 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('boss', { k: 'nbFlick', w: 1 }); sfx('swing', { kind: 'throw', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.5 }); }
    if (s === CHARGE && MV === 'volley' && t === 0.33) { sfx('boss', { k: 'nbZip', w: 0.6 }); }
    if (s === CHARGE && MV === 'volley' && t === 0.58) { const c = mid(L.hn, L.hf); fx.cross(sx(L.lens[0]), sy(L.lens[1]), 5, NEEDLE, 0.15); burst(sx(c[0]), sy(c[1]), 10, 20, 60, 0.2, 0.4, THREAD, 10); sfx('boss', { k: 'nbClick', w: 0.7 }); }
    if (s === CHARGE && MV === 'pluck') {
      if (t === 0.2) { sfx('boss', { k: 'nbZip', w: 1 }); for (const g of GP) burst(sx(g[0]), HY - 1, 3, 20, 50, 0.2, 0.4, THREAD, 20); }
      if (t === 0.5) { sfx('boss', { k: 'growl', w: 0.4 }); sfx('boss', { k: 'nbCackle', w: 0.5 }); }
      if (t === 0.75) for (const g of GP) spawn(K_BURST, sx(g[0]), HY - 1, (Math.random() - 0.5) * 30, -40, 0.25, NEEDLE);
    }
    if (s === CHARGE && MV === 'needleRain2' && (t === 0.5 || t === 0.9)) { sfx('boss', { k: 'nbShimmer', w: 0.6 }); }
    if (s === CAST && MV === 'volley' && t > 0 && t < 1.1) { const k = Math.round(t / 0.2); if (k !== lastThrow) { lastThrow = k; throwFx(k); } }
    if (s === RECOVER && t === 0.08 && (MV === 'volley' || MV === 'pluck')) sfx('boss', { k: 'nbCackle', w: 0.9 });
    if (s === RECOVER && t === 0.33 && MV === 'pluck') { const h = L.hn; burst(sx(h[0]), sy(h[1]), 6, 20, 50, 0.2, 0.3, NEEDLE, 10); sfx('boss', { k: 'nbPluck', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 0.34) sfx('boss', { k: 'nbDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.0) { spawnX(K_PHYS, sx(L.lens[0]), sy(L.lens[1]), 90, -90, 0.5, NEEDLE, { g: 260, floor: HY, sz: 2 }); sfx('hit', { mat: 'metal', w: 0.3 }); }
    if (s === DEATH && t === INCOMING + 1.2) {
      for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-10 + Math.random() * 60), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust);
      pins(sx(L.bun[0]), sy(L.bun[1]), 18, 60, -60); shake(0.2, 2); sfx('fall', { w: 0.9 }); sfx('boss', { k: 'thud', w: 0.8 }); sfx('boss', { k: 'nbScatter', w: 1 });
    }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-10 + Math.random() * 64), HY - 3 - Math.random() * 22, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, THREAD); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.2, 0.33, 0.5, 0.58, 0.75, 0.9], [0.2, 0.4, 0.6, 0.8, 1.0], [0.08, 0.33], [], [INCOMING + 0.34, INCOMING + 1.0, INCOMING + 1.2, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    pullT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f;
        if (f === 1 || f === 5) { const a = f === 1 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24 - (P.flip ? -8 : 8), -3 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.6 }); }
        if (f === 3 || f === 7) { const F = f === 3 ? L.fgF : L.fgN; for (const g of F) if (g.tp[1] > -2) spawn(K_BURST, sx(g.tp[0]), HY - 1, (Math.random() - 0.5) * 30, -20 - Math.random() * 20, 0.18, NEEDLE); sfx('boss', { k: 'nbClick', w: 0.25 }); } } }
    if (state === CHARGE && P.glow && Math.random() < 0.45) {   // 蓄力：红线的光点往汇聚点收
      const a = Math.random() * 6.2832, r = 14 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, THREAD, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'needleRain2' && P.halo < 1 && Math.random() < 0.3) spawn(K_RISE, sx(L.bun[0] + (Math.random() - 0.5) * 8), sy(L.bun[1]), 0, -40, 0.3, NEEDLE);   // 针从发髻里浮上去
    if (state === CAST && MV === 'roar' && Math.random() < 0.3) spawn(K_EMBER, sx(L.bun[0] + (Math.random() - 0.5) * 14), sy(L.bun[1] - 6 - Math.random() * 6), 0, -16, 0.35, THREAD);
    if (pullT < 1.0 && Math.random() < 0.4) spawn(K_EMBER, sx(46 + Math.random() * 20), HY - 1, 0, -10 - Math.random() * 10, 0.35, THREAD);   // 被拔过的地方还飘着线头的火星
    if (state === IDLE && Math.random() < 0.04) { const t = L.fgN[(Math.random() * 4) | 0].tp; spawn(K_EMBER, sx(t[0]), sy(t[1]), 0, 6, 0.4, THREAD); }
    if (state === IDLE && Math.random() < 0.02) spawn(K_EMBER, sx(L.bun[0] + (Math.random() - 0.5) * 10), sy(L.bun[1] - 4 - Math.random() * 6), 0, 0, 0.15, NEEDLE);   // 发髻上的针偶尔一闪
  }
  function fxReset() { pullT = 9; lastF = -1; lastThrow = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, TR[Math.abs(dx) < 4 ? 2 : 3]); }   // 地面映出的红光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'volley'; return MVDUR[MV]; }

  const VOICES = {
    nbFlick: (s, t, w, p) => { s.whoosh(t, 0.12, 1800, 5200, 0.05 * w, { pan: p }); s.ring(t + 0.02, 3400 + s.rnd(0, 700), 0.12, 0.03 * w, { pan: p, parts: [[1, 1], [2.7, 0.3]] }); s.nz(t, 0.03, 'highpass', 6000, 0.7, 0.03 * w, { pan: p }); },
    nbPluck: (s, t, w, p) => { for (let i = 0; i < 4; i++) { s.nz(t + i * 0.07, 0.05, 'highpass', 4000, 0.8, 0.04 * w, { pan: p }); s.ring(t + i * 0.07, 2600 + i * 320, 0.08, 0.02 * w, { pan: p }); } },
    nbZip: (s, t, w, p) => { s.nz(t, 0.35, 'bandpass', 2600, 3, 0.07 * w, { to: 5200, pan: p }); s.whoosh(t, 0.3, 600, 3000, 0.05 * w, { pan: p }); },
    nbYank: (s, t, w, p) => { s.nz(t, 0.2, 'bandpass', 3800, 2, 0.1 * w, { to: 1200, pan: p }); s.crackle(t + 0.05, 0.12, 3000, 0.1 * w, { pan: p });
      for (let i = 0; i < 6; i++) s.ring(t + 0.05 + i * 0.03, s.rnd(2500, 4800), 0.12, 0.03, { pan: p }); s.thud(t, 160, 70, 0.12, 0.1 * w, { pan: p }); },
    nbShimmer: (s, t, w, p) => { for (let i = 0; i < 8; i++) s.ring(t + i * 0.12, 1800 + i * 260, 0.2, 0.025 * w, { pan: p, parts: [[1, 1], [2.4, 0.3]] }); s.riser(t, t + 1.0, 500, 3000, 0.025 * w, { pan: p }); },
    nbRain: (s, t, w, p) => { s.whoosh(t, 0.5, 500, 5000, 0.1 * w, { pan: p }); for (let i = 0; i < 12; i++) s.ring(t + i * 0.035 + s.rnd(0, 0.02), s.rnd(2400, 5200), 0.14, 0.03, { pan: p, parts: [[1, 1], [1.5, 0.4]] }); s.thud(t, 180, 80, 0.15, 0.08 * w, { pan: p }); },
    nbCackle: (s, t, w, p) => { for (let i = 0; i < 6; i++) { s.tone(t + i * 0.11, 'sawtooth', 820 - i * 30 + (i & 1) * 120, 0.09, 0.04 * w, { to: 640 - i * 30, lp: 2800, pan: p }); s.nz(t + i * 0.11, 0.07, 'bandpass', 1800, 2, 0.02 * w, { pan: p }); } },
    nbShriek: (s, t, w, p) => { s.tone(t, 'sawtooth', 700, 1.2, 0.06 + 0.03 * w, { to: 1100, vib: [9, 60, 0.1], lp: 3000, pan: p, rev: 0.5 }); s.tone(t, 'square', 350, 1.0, 0.02 * w, { to: 520, lp: 1500, pan: p });
      s.nz(t, 0.9, 'bandpass', 3000, 1.5, 0.05 * w, { a: 0.05, to: 4500, pan: p }); for (let i = 0; i < 5; i++) s.tone(t + 0.8 + i * 0.1, 'sawtooth', 900 - i * 40, 0.08, 0.035 * w, { to: 700 - i * 40, lp: 2600, pan: p }); },
    nbClick: (s, t, w, p) => { for (let i = 0; i < 3; i++) s.ring(t + i * 0.06, 3000 + i * 400, 0.05, 0.02 * w, { pan: p }); s.nz(t, 0.03, 'highpass', 6000, 0.7, 0.02 * w, { pan: p }); },
    nbScatter: (s, t, w, p) => { for (let i = 0; i < 14; i++) s.ring(t + i * 0.04 + s.rnd(0, 0.03), s.rnd(3000, 6000), 0.08, 0.02 * w, { pan: p }); },
    nbDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 900, 1.6, 0.06, { to: 200, vib: [6, 80, 0.2], lp: 2400, pan: p, rev: 0.6 }); s.nz(t + 0.2, 1.0, 'bandpass', 2000, 1, 0.03 * w, { a: 0.2, to: 600, pan: p }); },
  };

  return {
    name: '针婆', HX, R_EL: THREAD, DUR, hero, P, GLOW_MATS: FLATS, HIT_POINT: [4, -36], EVENTS, MAX_H: 86, OWN_MAX: 70, SHEET_K: 3, VOICES,
    SFX: { body: 'flesh', how: 'topple', pal: 'blood', style: 'claw', w: 1 },
    MOVES: ['volley', 'pluck', 'needleRain2', 'roar'], MOVE_NAMES: { volley: '连射', pluck: '拔针', needleRain2: '针雨', roar: '针雨（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 0.9, 1.1, 1.3, 1.9, 2.0]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.05, 0.2, 0.35, 0.5, 0.62], 'volley'], [CAST, [0, 1 / 12, 0.2, 0.3, 0.4], 'volley'], [RECOVER, [0.08, 0.17, 0.3], 'volley'],
      [CHARGE, [0.1, 0.25, 0.35, 0.55, 0.8], 'pluck'], [CAST, [0, 1 / 12, 3 / 12], 'pluck'], [RECOVER, [0.1, 0.33, 0.55], 'pluck'],
      [CHARGE, [0.1, 0.3, 0.6, 0.95, 1.05], 'needleRain2'], [CAST, [0, 1 / 12, 3 / 12], 'needleRain2'], [RECOVER, [0.15, 0.35, 0.55], 'needleRain2'],
      [CHARGE, [0.1, 0.3], 'roar'], [CAST, [0, 2 / 12, 0.55], 'roar'], [RECOVER, [0.15, 0.35], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.95, 1.1, 1.3, 1.6, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
