// 虫王 · 翠蠕虫王（小首领，精灵之森 · 知识古树下）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「戴冠的巨型绿蠕虫」；被动 毒血（普攻叠毒，被治疗一次就解掉）；招式 钻地 burrow（钻进土里，从中毒最多的单位脚下钻出、掀飞一圈）、
//   吐丝 silk（一条线上的单位被缠住 3 秒）；半血 毒雾 roar（身边一圈毒雾）。
// 设定卡 ——
//   剪影：一条分节的巨型蛆虫，后半截趴在土上拖向身后，前半截直立起来（约 66 格高），头往前探；
//         头是一张圆口（识别点）：五片肉瓣合起来像一个花苞，张开时像一朵花，里面是两圈往里倒的尖牙和一口发光的喉咙；
//         头后一圈带刺的叶子竖成王冠（最高的三片叶尖亮着黄绿的光点），叶子之间是黑刺。
//   身上：暗青绿的皮，一节一节的沟压得很深；肚子一侧是一排淡黄的腹板；每一节侧面一个会发光的黄绿气孔（生物光，平时一闪一闪往上传）。
//         前胸三对带钩的小爪；趴地的几节下面是肉足。脚边总有两条小幼虫在拱。
//   主色：暗青绿皮 + 橄榄叶冠 + 肉红的口瓣，全部压暗；光：黄绿的气孔、喉咙、叶尖。和深海巨口（鮟鱇）、异形母巢（黑甲 + 卵）都不撞。
//   招式（setMove）：
//     burrow 钻地：高高立起、头朝下一勾，口瓣张开、身子发抖，幼虫先钻进土里 → 一头扎进土里，整条身子顺着洞滑下去（土块、地裂）→ 收招是从土里破土而出。
//     silk 吐丝：往后仰、口瓣慢慢张开，气孔的光一节节往上传到喉咙，白丝绕着嘴汇聚 → 往前一探，吐出一道白丝 → 缩回来，嘴边还挂着一缕丝。
//     roar 毒雾（半血怒吼）：缩成一团 → 猛地立起、仰头张开全部口瓣，叶冠炸开，全身气孔一起亮，一圈毒雾炸出去 → 身上的气孔往外冒毒气。
//   普攻：后仰张嘴 → 往前一扑咬住（出手那一帧口瓣全开）→ 合上、退回。受击：闪白、后仰、口瓣缩紧。
//   死亡：尖叫 → 来回甩动 → 往前扑倒在地上，气孔的光从尾巴到头一节节熄灭，口瓣软塌塌地张着，幼虫四散 → 化成黄绿的孢子飘走。
PCD.define('B_VerdantWormKing', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：皮和叶都压暗，气孔、喉咙、叶尖的黄绿才亮得出来 ─────
  const R_SKIN = ['#030605', '#07100d', '#0c1914', '#11231c', '#172d24', '#1e382d', '#264436', '#2f5040', '#395d4a', '#446a55', '#507861'];     // 暗青绿的皮
  const R_BELLY = ['#0a0904', '#17140a', '#242010', '#322c16', '#40391d', '#4f4624', '#5e542c', '#6e6335', '#7e723f', '#8e8249', '#9e9254'];    // 淡黄腹板
  const R_LEAF = ['#050702', '#0c1204', '#141d07', '#1c290a', '#25350d', '#2e4211', '#384f15', '#435c1a', '#4e6a1f', '#5a7824', '#67872a'];     // 橄榄叶冠
  const R_FLESH = ['#0c0406', '#1a080c', '#290d12', '#3a1318', '#4c1a1e', '#5f2226', '#732b2c', '#873634', '#9b433e', '#ae5349', '#c26656'];    // 口瓣里的肉
  const R_PETAL = ['#080405', '#14090b', '#210e11', '#2e1417', '#3b1a1d', '#482024', '#56272a', '#642e31', '#733638', '#823f40', '#924948'];    // 合拢时口瓣的外皮（暗玫红）
  const SKIN = defDeep(R_SKIN, { depth: 7, amb: 0.12 }), SKIND = defDeep(R_SKIN, { depth: 3, dark: 3, amb: 0.08 }), PETAL = defDeep(R_PETAL, { depth: 3, amb: 0.16 });
  const BELLY = defDeep(R_BELLY, { depth: 3, dark: 1, amb: 0.16 }), LARV = defDeep(R_BELLY, { depth: 2, amb: 0.3 });
  const LEAF = defDeep(R_LEAF, { depth: 3, amb: 0.14 }), LEAFD = defDeep(R_LEAF, { depth: 2, dark: 3, amb: 0.08 });
  const FLESH = defDeep(R_FLESH, { depth: 3, amb: 0.16 });
  const TOOTH = defDeep('ivory', { depth: 2, amb: 0.3 }), THORN = defDeep('hide', { depth: 2, dark: 2, amb: 0.14 }), DIRT = defDeep('hide', { depth: 3, dark: 3, amb: 0.1 });
  const GD = defMat([34, 48, 49, 49], 1, 1), GM = defMat([48, 49, 50, 50], 1, 1), GB = defMat([49, 50, 38, 38], 1, 1), GW = defMat([50, 38, 21, 21], 1, 1);
  const GL = [GD, GM, GB, GW], gl = (l) => GL[Math.max(0, Math.min(3, l))];
  const MAW = defMat([0, 11, 55, 56], 1, 1), SILK = defMat([7, 18, 17, 21], 1, 1), EYE = defMat([44, 46, 47, 51], 1, 1);
  const NAT = FXR[FXI.nature];
  const hero = new Sprite(180, 124, 84, 114);
  const DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { burrow: { 3: 0.6, 4: 0.5, 5: 0.9 }, silk: { 3: 0.9, 4: 0.4, 5: 0.7 }, roar: { 3: 0.5, 4: 0.6, 5: 0.7 } };
  let MV = 'burrow';
  const HX = 90;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [21, 38, 50], k: 0.8 }, { x: 0, y: 0, r: 0, ramp: [38, 50, 49], k: 0.3 }];
  const RIM_R = [0, 10, 16, 24], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: NAT, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  for (const m of [GD, GM, GB, GW, MAW, SILK, EYE]) RIM.skip[m] = 1;

  // ───── 关键姿势：脊线 6 个点（尾尖 → 地上 → 起身处 → 身中 → 颈 → 头心），口朝向 ha（0 朝右、正数朝下），口开 mo，叶冠张开 fr ─────
  const KF = ['t0x', 't0y', 't1x', 't1y', 'bsx', 'bsy', 'mdx', 'mdy', 'nkx', 'nky', 'hdx', 'hdy', 'ha', 'mo', 'fr'];
  const kp = (a) => { const o = {}; KF.forEach((k, i) => { o[k] = a[i]; }); return o; };
  const K = {
    idle: kp([-72, -4, -46, -6, -20, -9, 0, -25, 6, -43, 16, -55, 0.2, 0.08, 0]),
    wind: kp([-70, -4, -46, -6, -22, -9, -8, -28, -6, -47, 2, -59, -0.3, 0.75, 0.6]),
    bite: kp([-66, -4, -40, -6, -14, -9, 10, -24, 26, -34, 42, -38, 0.4, 1, 0.9]),
    snap: kp([-66, -4, -40, -6, -14, -9, 9, -24, 24, -35, 39, -39, 0.35, 0, 0.4]),
    rear: kp([-62, -4, -40, -6, -16, -9, -6, -30, -4, -50, 6, -62, -0.45, 0.5, 0.8]),
    spit: kp([-68, -4, -44, -6, -18, -9, 6, -28, 20, -42, 33, -50, 0.05, 1, 0.7]),
    coil: kp([-60, -4, -40, -6, -18, -9, -4, -18, 4, -30, 14, -36, 0.7, 0, -0.6]),
    howl: kp([-70, -4, -46, -6, -20, -9, -6, -30, -2, -51, 6, -63, -1.15, 1, 1]),
    dive: kp([-62, -4, -40, -6, -18, -9, -2, -34, 14, -50, 26, -50, 1.0, 0.8, 0.5]),
    plunge: kp([-64, -4, -42, -6, -18, -9, 2, -32, 20, -38, 30, -24, 1.4, 1, 0.3]),
    rise: kp([-52, -4, -32, -6, -8, -9, 10, -26, 16, -44, 20, -57, -1.2, 1, 1]),
    hurt: kp([-72, -4, -48, -6, -24, -9, -10, -24, -8, -42, 0, -52, -0.5, 0.25, -0.4]),
    dead: kp([-70, -4, -46, -6, -20, -8, 4, -10, 24, -10, 42, -11, 0.25, 0.7, -0.8]),
  };
  const P = {};
  const EXTRA = ['st', 'bx', 'jx', 'sink', 'slide', 'wa', 'wp', 'glow', 'gw', 'rim', 'flash', 'dq', 'lf', 'cl', 'lv', 'lvq', 'lph', 'sk', 'fd', 'hole', 'mound'];
  const FIELDS = KF.concat(EXTRA);
  const setK = (a) => { const s = K[a]; for (const k of KF) P[k] = s[k]; };
  const mixK = (a, b, q) => { const s = K[a], e = K[b]; for (const k of KF) P[k] = s[k] + (e[k] - s[k]) * q; };
  function base() {
    setK('idle'); for (const k of EXTRA) P[k] = 0; P.gw = -9; P.mx = 0; P.flip = 0;
  }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T);
    const idle = (tt) => {
      setK('idle'); const b = Math.floor(tt / 0.6) & 1; P.hdy += b; P.nky += b * 0.5; P.mdy += b * 0.5;
      const sw = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.4) % 6]; P.hdx += sw * 0.6; P.lf = sw; P.gw = Math.floor(tt * 6) % 18; P.glow = 0; P.lph = Math.floor(tt * 6);
      const lp = tt % DUR[IDLE];
      if (lp >= 1.4 && lp < 2.0) {   // 待机个性：口瓣一张一合「尝空气」，叶冠跟着张开，喷一小口孢子
        const k = Math.floor((lp - 1.4) * 12);
        P.mo = [0.3, 0.7, 0.95, 0.95, 0.7, 0.35, 0.1][k] || 0.1; P.hdy -= [1, 2, 2, 2, 1, 1, 0][k] || 0; P.ha -= [0.1, 0.2, 0.25, 0.25, 0.2, 0.1, 0][k] || 0;
        P.fr = [0.2, 0.5, 0.7, 0.7, 0.5, 0.2, 0][k] || 0; P.cl = k > 0 && k < 5 ? 1 : 0; P.glow = k > 1 && k < 4 ? 1 : 0;
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) {   // 蠕动：一个鼓包从尾巴往头传，头跟着一点一点
      setK('idle'); const f = Math.floor(tq * 12) % 8;
      P.wa = 7; P.wp = f / 8; P.hdy += [0, 1, 2, 1, 0, -1, -1, 0][f]; P.nky += [0, 1, 1, 1, 0, 0, -1, 0][f]; P.t0x += [0, 1, 2, 3, 3, 2, 1, 0][f]; P.t1x += [0, 0, 1, 2, 2, 1, 0, 0][f];
      P.ha += [0, 0.05, 0.1, 0.05, 0, -0.05, -0.05, 0][f]; P.gw = (f * 2) % 16; P.lv = 1; P.lph = f; P.lf = f < 4 ? 1 : -1; P.cl = f & 1;
      const w = walkDemo(tq, 18, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); mixK('idle', 'wind', q); P.glow = 1; P.cl = 1; }
      else if (tq < 0.25) { setK('wind'); P.glow = 2; P.rim = 1; P.cl = 1; P.jx = f12 & 1 ? 1 : 0; }
      else if (tq < 0.3) { setK('bite'); P.glow = 3; P.rim = 2; P.cl = 1; }
      else if (tq < 0.42) { setK('snap'); P.glow = 2; P.rim = 1; P.cl = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); mixK('snap', 'idle', q); P.glow = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK('hurt'); P.flash = h < 1 / 12 ? 1 : 0; P.cl = 2; P.lf = -1; P.glow = 1; }
      else if (h < 0.35) { mixK('hurt', 'idle', 0.5); P.cl = 2; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); mixK('hurt', 'idle', 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { burrow: 0, silk: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    if (MV === 'burrow') {
      if (st === CHARGE) {   // 立起、头朝下一勾、发抖，幼虫先钻下去
        const q = ease.out(clamp01(tq / 0.35)); mixK('idle', 'dive', q); P.jx = tq > 0.25 ? (f12 & 1 ? 1 : -1) : 0;
        P.glow = tq < 0.25 ? 1 : 2 + (f12 & 1); P.rim = tq < 0.25 ? 1 : 2; P.cl = 2; P.lv = 3; P.lvq = clamp01(tq / 0.5); P.gw = Math.floor(tq * 24) % 16; P.hole = 36; P.mound = clamp01((tq - 0.2) / 0.3) * 0.4;
      } else if (st === CAST) {   // 一头扎进土里，身子顺着洞滑下去
        const q = clamp01(tq / (2 / 12)); mixK('dive', 'plunge', ease.out(q)); P.slide = ease.in(clamp01((tq - 1 / 12) / 0.4)) * 130;
        P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.cl = 2; P.lv = 3; P.lvq = 1; P.hole = 36; P.mound = 1;
      } else {   // 破土而出，再落回待机
        if (tq < 0.45) { setK('rise'); P.sink = Math.round(70 * (1 - ease.out(clamp01(tq / 0.33)))); P.glow = 2; P.rim = 2; P.cl = 1; }
        else { const q = ease.inOut(clamp01((tq - 0.45) / 0.4)); mixK('rise', 'idle', q); P.glow = q < 0.5 ? 1 : 0; }
        P.hole = 18; P.mound = 1 - clamp01((tq - 0.4) / 0.4); P.lv = 3; P.lvq = 1 - clamp01((tq - 0.5) / 0.3);
      }
    } else if (MV === 'silk') {
      if (st === CHARGE) {   // 往后仰、口瓣慢慢张开，光一节节传到喉咙
        const q = ease.out(clamp01(tq / 0.4)); mixK('idle', 'rear', q); P.mo = 0.15 + 0.85 * clamp01(tq / 0.8);
        P.glow = tq < 0.4 ? 1 : 2 + (f12 & 1); P.rim = tq < 0.4 ? 1 : 2; P.cl = 2; P.gw = Math.floor(tq * 18) % 16; P.jx = tq > 0.6 ? (f12 & 1) : 0; P.sk = 2;
      } else if (st === CAST) { setK('spit'); P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.cl = 1; if (tq >= 3 / 12) { P.hdx -= 2; P.nkx -= 1; } }
      else { const q = ease.inOut(clamp01(tq / 0.6)); mixK('spit', 'idle', q); P.glow = q < 0.4 ? 1 : 0; P.sk = q < 0.75 ? 1 : 0; }
    } else {   // roar：半血的毒雾
      if (st === CHARGE) { const q = ease.out(clamp01(tq / 0.3)); mixK('idle', 'coil', q); P.glow = 1 + (tq > 0.3 ? f12 & 1 : 0); P.rim = 1; P.cl = 2; P.jx = tq > 0.3 ? (f12 & 1 ? 1 : -1) : 0; P.lf = -1; }
      else if (st === CAST) {
        if (tq < 2 / 12) mixK('coil', 'howl', ease.out(tq / (2 / 12))); else { setK('howl'); P.hdx += f12 & 1 ? 1 : -1; P.nkx += f12 & 1 ? 0.5 : -0.5; }
        P.glow = 3; P.rim = 3; P.cl = 1; P.lv = 2; P.lvq = 0.15; P.lf = f12 & 1 ? 1 : -1;
      } else {
        if (tq < 0.3) { setK('howl'); P.hdx += f12 & 1 ? 1 : 0; P.glow = 2; P.rim = 2; P.cl = 1; }
        else { const q = ease.inOut(clamp01((tq - 0.3) / 0.4)); mixK('howl', 'idle', q); P.glow = q < 0.5 ? 2 : 1; }
        P.lv = 2; P.lvq = 0.15 * (1 - clamp01((tq - 0.3) / 0.4));
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) { setK('idle'); return; }
    if (d < 0.3) { setK('hurt'); P.mo = 1; P.flash = d < 1 / 12 ? 1 : 0; P.glow = 2; P.cl = 1; P.fr = 0.8; return; }
    P.lv = 2; P.lvq = clamp01((d - 0.3) / 1.4);
    if (d < 0.9) { const k = Math.floor(d * 6) & 1; mixK('hurt', 'howl', k ? 0.8 : 0.25); P.glow = 1 + k; P.cl = 2; P.jx = k ? 1 : -1; P.mo = 1; return; }
    const q1 = ease.in(clamp01((d - 0.9) / 0.45));
    if (d < 1.35) { mixK('howl', 'dead', q1); P.mo = 1 - 0.3 * q1; P.glow = 1; P.cl = 1; return; }
    setK('dead'); if (d < 1.5) { P.hdy -= 2; P.nky -= 1; }
    P.fd = Math.floor(clamp01((d - 1.4) / 0.5) * 15); P.glow = 1; P.mo = 0.75; P.fr = -1; P.cl = 2;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）：Catmull-Rom 脊线，按半径分配节距 ─────
  const NS = 14, RAD = [3, 4.2, 5.4, 6.6, 7.8, 8.8, 9.6, 10.2, 10.6, 10.8, 10.6, 10.2, 9.8, 9.4], HR = 12, RSUM = RAD.reduce((a, b) => a + b, 0);
  const SEG = []; for (let i = 0; i < NS; i++) SEG.push({ x: 0, y: 0, a: 0, r: RAD[i], s: 0, gnd: 0 });
  const L = { H: [0, 0], d: [1, 0], n: [0, 1], C: [0, 0], rx: 3, ry: 7 };
  const PATH = []; let PLEN = 0, SBASE = 0;
  const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  function pathAt(s) {
    if (s >= PLEN) { const e = s - PLEN; return [P.hdx + L.d[0] * e, P.hdy + L.d[1] * e]; }
    if (s <= 0) return [PATH[0][0], PATH[0][1]];
    let i = 1; while (i < PATH.length - 1 && PATH[i][2] < s) i++;
    const a = PATH[i - 1], b = PATH[i], q = (s - a[2]) / ((b[2] - a[2]) || 1); return [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  }
  let focusPt = [0, 0];
  function geo() {
    const ha = P.ha; L.d = [Math.cos(ha), Math.sin(ha)]; L.n = [-L.d[1], L.d[0]];
    const Kp = [[P.t0x, P.t0y], [P.t1x, P.t1y], [P.bsx, P.bsy], [P.mdx, P.mdy], [P.nkx, P.nky], [P.hdx, P.hdy]];
    const pts = [[2 * Kp[0][0] - Kp[1][0], 2 * Kp[0][1] - Kp[1][1]], ...Kp, [2 * Kp[5][0] - Kp[4][0], 2 * Kp[5][1] - Kp[4][1]]];
    PATH.length = 0; let s = 0, x0 = Kp[0][0], y0 = Kp[0][1]; PATH.push([x0, y0, 0]);
    for (let j = 1; j < pts.length - 2; j++) for (let k = 1; k <= 10; k++) {
      const t = k / 10, x = cr(pts[j - 1][0], pts[j][0], pts[j + 1][0], pts[j + 2][0], t), y = cr(pts[j - 1][1], pts[j][1], pts[j + 1][1], pts[j + 2][1], t);
      s += Math.hypot(x - x0, y - y0); PATH.push([x, y, s]); x0 = x; y0 = y; if (j === 2 && k === 10) SBASE = s;
    }
    PLEN = s; const sEnd = s - 6, dx = P.bx + P.jx; let cum = 0;
    for (let i = 0; i < NS; i++) {
      const g = SEG[i], si = sEnd * (cum + RAD[i] / 2) / RSUM + P.slide; cum += RAD[i];
      const p = pathAt(si), p0 = pathAt(si - 1.5), p1 = pathAt(si + 1.5); let x = p[0], y = p[1];
      g.gnd = si < SBASE && !P.slide ? 1 : 0;
      if (g.gnd) { y = Math.min(y, -RAD[i] + 1); if (P.wa) { const u = si / SBASE, c = -0.15 + 1.3 * P.wp, w = 0.3; if (Math.abs(u - c) < w) { const k = Math.cos(Math.PI / 2 * (u - c) / w); y -= P.wa * k * k; } } }
      g.x = x + dx; g.y = y + P.sink; g.a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); g.s = si; g.r = RAD[i];
      let lvl = Math.min(P.glow, 2) + (i === P.gw || i === P.gw - 1 ? 1 : 0); if (i < P.fd) lvl = -1; g.g = lvl;
    }
    L.H = [P.hdx + L.d[0] * P.slide + dx, P.hdy + L.d[1] * P.slide + P.sink];
    L.rx = 3 + 4 * P.mo; L.ry = 8.5 + 2.5 * P.mo; const cm = 8 + P.mo * 1.5; L.C = [L.H[0] + L.d[0] * cm, L.H[1] + L.d[1] * cm];
  }
  function focus() { geo(); focusPt = MV === 'burrow' && P.st === CAST ? [P.hole, -2] : [L.C[0], L.C[1]]; P.fx = focusPt[0]; P.fy = focusPt[1]; P.gx = P.fx; P.gy = P.fy; }

  const lerp2 = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const rotv = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

  // ───── 部件（从后往前）─────
  function drawLarva(x0, face, ph, far) {
    let sink = 0, x = x0;
    if (P.lv === 3) sink = P.lvq * 6;
    if (P.lv === 2) x = x0 + face * -1 * P.lvq * 46;                          // 四散：往远离虫王的方向逃
    if (P.lv === 1) x = x0 + (ph & 4 ? 1 : 0);
    const m = far ? LARV : LARV, R = [2.3, 2.1, 1.8, 1.4];
    part(); for (let k = 0; k < 4; k++) { const hump = ((ph + k) & 3) === 0 ? 1 : 0; B.ell(E, x - face * k * 2.6, -2.1 - hump + sink, R[k] + 0.4, R[k], 0, m); }
    for (let k = 1; k < 4; k++) B.px(E, x - face * (k * 2.6 - 1.3), -2 + sink, m, 3);
    B.px(E, x + face * 1.6, -2.5 + sink, m, 10); B.px(E, x, -4 + sink - (((ph) & 3) === 0 ? 1 : 0), gl(P.glow >= 2 ? 2 : 1));
  }
  function drawFrill(far) {
    const H = L.H, d = L.d, back = [-d[0], -d[1]];
    const AL = [1.85, 1.4, 0.95, 0.5, 0.05, -0.4, -0.85], LL = [17, 21, 18, 15, 12, 10, 9];
    for (let j = 0; j < AL.length; j++) {
      const a = AL[j] + (far ? 0.24 : 0) + P.lf * 0.05 * (j & 1 ? 1 : -1) + P.fr * 0.1 * (j < 3 ? -1 : 1) * (j === 0 ? 0.5 : 1);
      const dir = rotv(back, a), side = [-dir[1], dir[0]], len = LL[j] * (1 + 0.22 * P.fr) * (far ? 0.82 : 1);
      const b0 = add(H, dir, 7), tip = add(H, dir, 7 + len), mid = add(H, dir, 7 + len * 0.42), w = far ? 3.4 : 4.2;
      part(); B.poly(E, [add(b0, side, 1.8), add(mid, side, w), tip, add(mid, side, -w), add(b0, side, -1.8)], far ? LEAFD : LEAF);
      B.ln(E, b0[0], b0[1], tip[0] - dir[0], tip[1] - dir[1], far ? LEAFD : LEAF, far ? 3 : 7);          // 叶脉
      if (!far) {
        const e1 = add(add(H, dir, 6.5 + len * 0.3), side, w * 0.9 + 0.8), e2 = add(add(H, dir, 6.5 + len * 0.62), side, -(w * 0.8 + 0.8));
        B.px(E, e1[0], e1[1], THORN, 7); B.px(E, e2[0], e2[1], THORN, 7);                                  // 叶缘的刺
        if (j < 3) { const g = add(tip, dir, -1.2); B.px(E, g[0], g[1], gl(P.glow + (j === 1 ? 1 : 0))); }   // 叶尖的光点：王冠上的「宝石」
      }
    }
    if (!far) for (let j = 0; j < AL.length - 1; j++) {                                                   // 叶间的黑刺
      const a = (AL[j] + AL[j + 1]) / 2 + P.fr * 0.05, dir = rotv(back, a), p0 = add(H, dir, 7), p1 = add(H, dir, 12 + (j < 3 ? 3 : 0) + P.fr * 2);
      part(); B.cap(E, p0[0], p0[1], p1[0], p1[1], 1.3, 0.3, THORN); B.px(E, p1[0], p1[1], THORN, 8);
    }
  }
  function drawProlegs(far) {
    for (let i = 2; i < 8; i++) { const g = SEG[i]; if (!g.gnd) continue;
      const lift = g.y < -RAD[i] ? 1.5 : 0, x = g.x + (far ? -2.5 : 1), y0 = g.y + g.r * 0.55, y1 = Math.min(0, g.y + g.r + 1.5 - lift * 0) + (lift ? -1 : 0);
      part(); B.cap(E, x, y0, x + (far ? -0.5 : 0.5), y1, far ? 1.6 : 2, 1.3, far ? SKIND : BELLY, far ? 0 : 4); B.px(E, x + 0.5, y1, THORN, 6);
    }
  }
  function drawClaws(far) {
    for (const i of [9, 11, 12]) { const g = SEG[i]; if (g.gnd) continue; const t = [Math.cos(g.a), Math.sin(g.a)], n = [-t[1], t[0]];
      const root = add(add([g.x, g.y], n, g.r * 0.7), t, far ? 1.5 : 0), rootF = far ? add(root, [-1, -1], 1) : root;
      const k = P.cl === 1 ? [7, -1.5] : P.cl === 2 ? [3.5, 1.5] : [4.5, -3], kn = add(add(rootF, n, k[0] * 0.6), t, k[1] * 0.5 + 1), tip = add(add(rootF, n, k[0]), t, k[1] - 1);
      const hook = add(tip, t, P.cl === 2 ? 1.5 : -1.5);
      part(); B.cap(E, rootF[0], rootF[1], kn[0], kn[1], far ? 1.2 : 1.5, 1.1, far ? SKIND : THORN); B.cap(E, kn[0], kn[1], tip[0], tip[1], 1.1, 0.5, far ? SKIND : THORN);
      B.cap(E, tip[0], tip[1], hook[0], hook[1], 0.5, 0.3, far ? SKIND : THORN); if (!far) B.px(E, kn[0], kn[1] - 1, THORN, 8);
    }
  }
  function drawSeg(i) {
    const g = SEG[i], t = [Math.cos(g.a), Math.sin(g.a)], n = [-t[1], t[0]], r = g.r;
    part(); B.ell(E, g.x, g.y, r * 0.62 + 1.4, r, g.a, SKIN);
    const bp = add([g.x, g.y], n, r * 0.56); B.ell(E, bp[0], bp[1], r * 0.5 + 0.8, r * 0.4, g.a, BELLY);                   // 腹板
    const hl0 = add(add([g.x, g.y], n, -r * 0.72), t, -1.6), hl1 = add(add([g.x, g.y], n, -r * 0.72), t, 1.6); B.ln(E, hl0[0], hl0[1], hl1[0], hl1[1], SKIN, 8);   // 背上的高光
    if (r > 6) { const w0 = add(add([g.x, g.y], n, -r * 0.2), t, -r * 0.55), w1 = add(add([g.x, g.y], n, r * 0.25), t, -r * 0.62); B.ln(E, w0[0], w0[1], w1[0], w1[1], SKIN, 3); }   // 节间的皱
    const sp = add([g.x, g.y], n, -r * 0.18);                                                                            // 侧面的发光气孔
    if (g.g < 0) { B.px(E, sp[0], sp[1], SKIN, 2); }
    else if (r > 7) { B.ell(E, sp[0], sp[1], 1.3, 2.1, g.a, gl(g.g)); B.px(E, sp[0], sp[1] - 0.5, gl(g.g + 1)); }
    else if (r > 4) { B.px(E, sp[0], sp[1], gl(g.g)); B.px(E, sp[0], sp[1] + 1, gl(g.g - 1)); }
    else B.px(E, sp[0], sp[1], gl(g.g - 1));
    if (r > 8) { const b1 = add(add([g.x, g.y], n, -r * 0.5), t, 1), b2 = add(add([g.x, g.y], n, r * 0.05), t, 2.4); B.px(E, b1[0], b1[1], SKIN, 3); B.px(E, b2[0], b2[1], SKIN, 7); }   // 疣
  }
  function drawHead() {
    const H = L.H, d = L.d, n = L.n, a = P.ha;
    part(); B.ell(E, H[0], H[1], 11, HR, a, SKIN);
    const bl = add(add(H, n, 8), d, 1); B.ell(E, bl[0], bl[1], 5, 2.6, a, BELLY);
    const c0 = add(add(H, d, 5.5), n, -10.5), c1 = add(add(H, d, 5.5), n, 10.5); B.ln(E, c0[0], c0[1], c1[0], c1[1], SKIN, 3);   // 口前的一圈肉环
    const r0 = add(add(H, n, -9.2), d, -4), r1 = add(add(H, n, -9.4), d, 2); B.ln(E, r0[0], r0[1], r1[0], r1[1], SKIN, 8);
    for (const [u, v, tn] of [[-5, -3, 3], [-2, 2, 3], [-6, 3, 7], [0, -5, 7]]) { const p = add(add(H, d, u), n, v); B.px(E, p[0], p[1], SKIN, tn); }
    for (const [u, v] of [[1.5, -6.5], [-1.5, -7.6], [-4.5, -7]]) {                                                                // 三颗小眼
      const p = add(add(H, d, u), n, v); B.px(E, p[0], p[1], SKIN, 10); B.px(E, p[0] + 0.5, p[1] - 0.5, EYE, P.glow >= 2 ? 4 : 3);
    }
  }
  function drawMouth(back) {
    const C = L.C, d = L.d, n = L.n, mo = P.mo, rx = L.rx, ry = L.ry, e = ease.inOut(clamp01(mo));
    const at = (th, k) => [C[0] + n[0] * ry * k * Math.cos(th) + d[0] * rx * k * Math.sin(th), C[1] + n[1] * ry * k * Math.cos(th) + d[1] * rx * k * Math.sin(th)];
    for (let k = 0; k < 5; k++) {
      const th = Math.PI + k * 2 * Math.PI / 5, s = Math.sin(th), isBack = mo >= 0.3 && s < -0.05; if (isBack !== back) continue;
      const A1 = at(th - 0.62, 1), A2 = at(th + 0.62, 1), M = lerp2(A1, A2, 0.5);
      const Tc = [C[0] + d[0] * 11 + n[0] * Math.cos(th) * 2, C[1] + d[1] * 11 + n[1] * Math.cos(th) * 2];
      const ro = ry + 10 + Math.max(0, P.fr) * 2, To = [C[0] + n[0] * Math.cos(th) * ro + d[0] * (s * rx * 1.6 - 2), C[1] + n[1] * Math.cos(th) * ro + d[1] * (s * rx * 1.6 - 2)];
      const T = lerp2(Tc, To, e), B1 = add(lerp2(A1, T, 0.5), [A1[0] - A2[0], A1[1] - A2[1]], 0.28), B2 = add(lerp2(A2, T, 0.5), [A2[0] - A1[0], A2[1] - A1[1]], 0.28);
      const m = e < 0.3 ? PETAL : FLESH;
      part(); B.poly(E, [A1, B1, T, B2, A2], m);
      B.ln(E, M[0], M[1], T[0], T[1], m, 3); B.ln(E, B1[0], B1[1], T[0], T[1], m, 7);
      if (e >= 0.3) { for (const q of [0.35, 0.62]) { const p = lerp2(M, T, q); B.px(E, p[0], p[1], TOOTH, 7); } }
      else { const p = lerp2(M, T, 0.55); B.px(E, p[0], p[1], PETAL, 8); }
    }
  }
  function drawMaw() {
    const C = L.C, d = L.d, n = L.n, rx = L.rx, ry = L.ry, a = P.ha;
    const at = (th, k) => [C[0] + n[0] * ry * k * Math.cos(th) + d[0] * rx * k * Math.sin(th), C[1] + n[1] * ry * k * Math.cos(th) + d[1] * rx * k * Math.sin(th)];
    part(); B.ell(E, C[0], C[1], rx, ry, a, MAW); B.ell(E, C[0], C[1], rx * 0.74, ry * 0.74, a, MAW, 2); B.ell(E, C[0], C[1], rx * 0.5, ry * 0.5, a, MAW, 1);
    if (P.mo > 0.25) {
      for (let k = 0; k < 12; k++) { const th = k * Math.PI / 6 + 0.13, p0 = at(th, 0.96), p1 = at(th, 0.64); B.ln(E, p0[0], p0[1], p1[0], p1[1], TOOTH); }   // 外圈牙
      for (let k = 0; k < 8; k++) { const th = k * Math.PI / 4 + 0.4, p0 = at(th, 0.56), p1 = at(th, 0.36); B.ln(E, p0[0], p0[1], p1[0], p1[1], TOOTH, 4); } // 内圈牙
    }
    const tl = P.mo > 0.4 ? P.glow + 1 : P.glow; B.ell(E, C[0], C[1], Math.max(0.6, rx * 0.26), ry * 0.26, a, gl(tl)); if (P.mo > 0.4) B.px(E, C[0], C[1], gl(tl + 1));   // 发光的喉咙
  }
  function drawSilk() {
    const C = L.C;
    if (P.sk === 1) { const pts = B.bez([C[0] + 1, C[1] + 1], [C[0] + 12, C[1] + 10], [C[0] + 16, -1], 8); for (let i = 1; i < pts.length; i++) if (i % 3 !== 2) B.ln(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], SILK, i < 4 ? 4 : 3); }
    if (P.sk === 2 && P.mo > 0.5) { for (let k = 0; k < 3; k++) { const a = k * 2.1 + P.gw * 0.7, p = [C[0] + Math.cos(a) * 9, C[1] + Math.sin(a) * 8]; B.ln(E, p[0], p[1], C[0], C[1], SILK, 3); } }
  }
  function drawMound() {
    if (P.mound <= 0) return; const x = P.hole, w = 6 + 8 * P.mound, h = 1.5 + 3 * P.mound;
    part(); B.ell(E, x, 0, w, h, 0, DIRT); B.ln(E, x - w + 2, -h + 1, x + w - 3, -h + 1, DIRT, 7);
    for (const [u, v] of [[-4, -1], [3, -2], [7, 0], [-8, 0]]) B.px(E, x + u * P.mound, v * P.mound, DIRT, u & 1 ? 3 : 8);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); B.reset(); geo();
    drawFrill(1); drawClaws(1); drawProlegs(1);
    for (let i = 0; i < NS; i++) drawSeg(i);
    drawProlegs(0); drawClaws(0); drawFrill(0);
    drawHead(); drawMouth(true); drawMaw(); drawMouth(false); drawSilk();
    drawLarva(34, -1, P.lph, 0); drawLarva(-40, 1, P.lph + 2, 0); drawMound();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    if (P.glow >= 1 && P.dq < 0.5) {
      LIGHT[0].x = L.C[0] * z + spr.ox; LIGHT[0].y = L.C[1] * z + spr.oy; LIGHT[0].r = (P.mo > 0.4 ? 5 + P.glow * 4 : 3 + P.glow * 2) * z;
      const m = SEG[9]; LIGHT[1].x = m.x * z + spr.ox; LIGHT[1].y = m.y * z + spr.oy; LIGHT[1].r = (MV === 'roar' && P.glow >= 3 && P.st === CAST ? 18 : 0) * z; RIM.lights = LIGHT;
    } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：半血毒雾那一刻（立起、口瓣全开、叶冠炸开、全身发光），两倍分辨率，口转向镜头
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.hdx = 8; P.ha = -0.45; P.jx = 0; P.glow = 2; P.rim = 2; P.lv = 0; focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; PHEAD = [L.H[0] * 2 + PSPR.ox + 6, L.H[1] * 2 + PSPR.oy, 19 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'burrow'; poseAt(IDLE, 0.4, 0); P.mo = 0.9; P.fr = 0.6; P.ha = 0; P.glow = 2; P.rim = 1; focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; PHEAD = [L.H[0] * 2 + PSPR.ox + 8, L.H[1] * 2 + PSPR.oy, 18 * 2]; return PSPR; }

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (px) => scrX(px), sy = (py) => HY + py;
  let crackT = 9, crackX = 0, lastF = -1;
  function strikeFx() {
    const x = sx(L.C[0] + 4), y = sy(L.C[1]);
    fx.slash(x - 2, y + 4, 10, -1.2, 1.2, 'poison', 0.18, 2, 2); fx.slash(x - 2, y - 4, 10, 1.9, 4.4, 'poison', 0.18, 2, 2);   // 上下两排牙合拢
    burst(x, y, 16, 40, 120, 0.2, 0.5, FXI.poison, 30);
    for (let i = 0; i < 8; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.3) * 60, -30 - Math.random() * 50, 0.7, FXI.poison, { g: 220, floor: HY });   // 毒液飞溅
    fx.cross(x, y, 6, 'poison', 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function burrowFx() {
    const x = sx(P.hole), y = HY; crackX = P.hole;
    ring(x, y - 2, 1, FXI.nature); fx.crack(x, y, 20, 1, 'earth', 1.1); fx.crack(x, y, 18, -1, 'earth', 1.1); fx.wave(x, y, 1, 30, 7, 'earth', 0.45, 2); fx.wave(x, y, -1, 30, 7, 'earth', 0.45, 2);
    for (let i = 0; i < 22; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 16, y - 2, (Math.random() - 0.5) * 120, -40 - Math.random() * 90, 0.9, FXI.earth, { g: 260, floor: HY });   // 土块
    burst(x, y - 2, 20, 30, 110, 0.4, 0.8, FXI.dust, 12); burst(x, y - 4, 14, 40, 120, 0.3, 0.6, FXI.poison, 20);
    shake(0.35, 3); flash(0.08); crackT = 0; hitDummy(1, 1);
  }
  function emergeFx() {
    const x = sx(18), y = HY; crackX = 18;
    ring(x, y - 2, 1, FXI.nature); ring(x, y - 4, 0, FXI.poison); fx.crack(x, y, 22, 1, 'earth', 1.2); fx.crack(x, y, 22, -1, 'earth', 1.2);
    for (let i = 0; i < 28; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 20, y - 2, (Math.random() - 0.5) * 140, -60 - Math.random() * 110, 1.0, FXI.earth, { g: 260, floor: HY });
    burst(x, y - 10, 24, 50, 150, 0.3, 0.7, FXI.poison, 30); shake(0.35, 3); flash(0.1); crackT = 0;
  }
  function silkFx() {
    const x = sx(L.C[0] + 3), y = sy(L.C[1]);
    fx.beam(x, y, x + (P.flip ? -150 : 150), y + 8, 1, 'steel', 0.35, 2); fx.link(x, y - 1, x + (P.flip ? -120 : 120), y - 4, 'steel', 0.3, 2); fx.link(x, y + 1, x + (P.flip ? -130 : 130), y + 14, 'steel', 0.3, 2);
    ring(x, y, 0, FXI.steel); burst(x, y, 16, 40, 130, 0.2, 0.45, FXI.steel, 20); fx.cross(x, y, 7, 'steel', 0.18);
    shake(0.3, 3); flash(0.06);
  }
  function roarFx() {
    const hx = sx(L.C[0]), hy = sy(L.C[1]), bx = sx(-4);
    ring(bx, HY - 2, 1, FXI.poison); ring(hx, hy, 1, FXI.nature);
    for (let i = 0; i < 6; i++) fx.cloud(bx + (i - 2.5) * 22, HY - 8 - (i & 1) * 10, 12 + (i & 1) * 4, 'poison', 1.2, 2);
    fx.wave(bx, HY, 1, 60, 10, 'poison', 0.6, 2); fx.wave(bx, HY, -1, 60, 10, 'poison', 0.6, 2);
    burst(hx, hy, 30, 50, 160, 0.4, 0.9, FXI.poison, 40); flash(0.12); shake(0.35, 3); crackT = 0; crackX = -4;
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'burrow') { burrowFx(); sfx('boss', { k: 'vwDig', w: 1 }); sfx('impact', { pal: 'earth', w: 1 }); sfx('boss', { k: 'sink', w: 0.8 }); }
      else if (MV === 'silk') { silkFx(); sfx('boss', { k: 'vwSpit', w: 1 }); sfx('impact', { pal: 'nature', w: 0.6 }); }
      else { roarFx(); sfx('boss', { k: 'vwRoar', w: 1 }); sfx('impact', { pal: 'poison', w: 0.9 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === RECOVER && MV === 'burrow') { emergeFx(); sfx('boss', { k: 'vwDig', w: 0.9 }); sfx('boss', { k: 'vwRoar', w: 0.5 }); sfx('fall', { w: 0.8 }); }
    if (s === CHARGE) { lastF = -1; sfx('boss', { k: MV === 'silk' ? 'vwChitter' : MV === 'roar' ? 'vwGurgle' : 'vwHiss', w: 0.8 }); }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.6) { const x = sx(L.C[0] + 3), y = sy(L.C[1]); for (let i = 0; i < 6; i++) spawn(K_RISE, x + (Math.random() - 0.3) * 8, y + (Math.random() - 0.5) * 6, 6 + Math.random() * 10, -8 - Math.random() * 8, 0.7 + Math.random() * 0.4, FXI.nature); }
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'vwHiss', w: 0.5 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'claw', w: 0.8 }); sfx('boss', { k: 'vwBite', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.8 }); }
    if (s === CHARGE && MV === 'burrow' && (t === 0.2 || t === 0.4)) { const x = sx(P.hole); burst(x, HY - 1, 10, 20, 70, 0.2, 0.5, FXI.earth, 8); fx.crack(x, HY, 8, t === 0.2 ? 1 : -1, 'earth', 0.5); sfx('step', { w: 1 }); if (t === 0.4) sfx('boss', { k: 'thud', w: 0.5 }); }
    if (s === CHARGE && MV === 'silk' && (t === 0.3 || t === 0.6)) sfx('boss', { k: 'vwChitter', w: 0.6 });
    if (s === CHARGE && MV === 'roar' && t === 0.3) sfx('boss', { k: 'growl', w: 0.6 });
    if (s === DEATH && t === INCOMING + 0.1) sfx('boss', { k: 'vwDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.3) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-10 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 34; i++) spawn(K_RISE, sx(-60 + Math.random() * 110), HY - 4 - Math.random() * 20, (Math.random() - 0.5) * 8, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, i & 1 ? FXI.nature : FXI.poison); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[1.6], [], [0.08, T_STRIKE], [0.2, 0.3, 0.4, 0.6], [], [], [], [INCOMING + 0.1, INCOMING + 1.3, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    crackT += dt;
    if (state === MOVE) { const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f; if (f === 0 || f === 4) { const x = sx(SEG[5].x); spawn(K_DUST, x, HY, (P.flip ? 1 : -1) * 8, -4, 0.35, FXI.dust); spawn(K_EMBER, sx(SEG[3].x), HY - 1, 0, -2, 0.5, FXI.poison); sfx('step', { w: 0.6 }); } } }   // 蠕动：黏液和尘
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：丝 / 毒光从四周汇进嘴里（钻地汇向地面）
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(MV === 'burrow' ? P.hole : P.fx), gy = MV === 'burrow' ? HY - 2 : sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, MV === 'silk' ? FXI.steel : FXI.poison, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'burrow' && Math.random() < 0.3) spawn(K_DUST, sx(P.hole + (Math.random() - 0.5) * 20), HY, (Math.random() - 0.5) * 10, -6 - Math.random() * 6, 0.4, FXI.earth);
    if ((state === CAST || state === RECOVER) && MV === 'roar' && Math.random() < 0.55) { const g = SEG[4 + ((Math.random() * 10) | 0)]; spawn(K_RISE, sx(g.x), sy(g.y), (Math.random() - 0.5) * 10, -10 - Math.random() * 10, 0.6 + Math.random() * 0.4, FXI.poison); }   // 气孔冒毒气
    if (state === IDLE && Math.random() < 0.08) { const g = SEG[3 + ((Math.random() * 11) | 0)]; spawn(K_EMBER, sx(g.x), sy(g.y), (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5, FXI.nature); }   // 飘起来的孢子
    if (crackT < 1.2 && Math.random() < 0.4) { const x = sx(crackX) + (Math.random() - 0.5) * 40; spawn(K_EMBER, x, HY - 1, 0, -10 - Math.random() * 10, 0.35, FXI.poison); }   // 土缝和毒雾还在冒
  }
  function fxReset() { crackT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2 && (P.st === CHARGE || P.st === CAST)) { const x = sx(MV === 'burrow' ? P.hole : -4), w = MV === 'roar' ? 22 : 12; for (let dx = -w; dx <= w; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, NAT[Math.abs(dx) < w / 2 ? 1 : 3]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'burrow'; return MVDUR[MV]; }

  // 自己的声音（syn 的函数和 src/mc-audio.js 同名同参）
  const VOICES = {
    vwHiss: (s, t, w, p) => { s.nz(t, 0.5, 'highpass', 3400, 0.7, 0.04 + 0.03 * w, { a: 0.06, pan: p }); s.nz(t, 0.45, 'bandpass', 700, 2.5, 0.05 * w, { to: 380, pan: p }); s.tone(t, 'sawtooth', 110, 0.4, 0.025 * w, { to: 85, vib: [11, 20, 0.05], lp: 700, pan: p }); },
    vwChitter: (s, t, w, p) => { for (let i = 0; i < 7; i++) { const tt = t + i * 0.055 + s.rnd(0, 0.02), f = s.rnd(1700, 2600); s.tone(tt, 'square', f, 0.03, 0.014 + 0.012 * w, { to: f * 0.7, lp: 4200, pan: p }); } s.crackle(t, 0.4, 2200, 0.03 * w, { pan: p }); },
    vwGurgle: (s, t, w, p) => { s.tone(t, 'sawtooth', 95, 0.6, 0.05 * w, { to: 62, vib: [7, 25, 0.05], lp: 520, pan: p }); for (let i = 0; i < 6; i++) { const tt = t + i * 0.08 + s.rnd(0, 0.04), f = s.rnd(260, 420); s.tone(tt, 'sine', f, 0.06, 0.05 * w, { to: f * 1.9, pan: p }); } s.nz(t, 0.5, 'lowpass', 420, 0.9, 0.05 * w, { pan: p }); },
    vwSpit: (s, t, w, p) => { s.nz(t, 0.22, 'bandpass', 1300, 2, 0.1 * w, { to: 3600, pan: p }); s.tone(t, 'sine', 520, 0.18, 0.08 * w, { to: 1500, pan: p }); s.thud(t, 150, 70, 0.1, 0.18 * w, { pan: p }); s.whoosh(t + 0.03, 0.3, 900, 2800, 0.06 * w, { pan: p }); },
    vwBite: (s, t, w, p) => { s.thud(t, 160, 55, 0.12, 0.22 + 0.1 * w, { pan: p }); s.nz(t, 0.05, 'highpass', 2800, 0.8, 0.12 * w, { pan: p }); s.nz(t + 0.03, 0.2, 'bandpass', 520, 3, 0.1 * w, { to: 240, pan: p }); for (let i = 0; i < 3; i++) s.tone(t + 0.02 + i * 0.03, 'square', s.rnd(1500, 2100), 0.025, 0.02 * w, { lp: 3800, pan: p }); },
    vwDig: (s, t, w, p) => { s.rumble(t, 0.8, 0.16 * w, { f: 140, pan: p }); s.crackle(t, 0.6, 900, 0.07 * w, { pan: p }); s.thud(t, 90, 40, 0.25, 0.25 * w, { pan: p }); s.nz(t + 0.05, 0.4, 'lowpass', 600, 0.8, 0.08 * w, { pan: p }); },
    vwRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 170, 1.1, 0.06 + 0.03 * w, { to: 95, vib: [8, 30, 0.08], lp: 900, pan: p, rev: 0.4 }); s.tone(t, 'square', 340, 0.9, 0.025 * w, { to: 210, vib: [13, 40, 0.06], lp: 1600, pan: p });
      s.nz(t, 1.0, 'bandpass', 2200, 1.2, 0.05 * w, { a: 0.1, pan: p }); s.rumble(t, 1.1, 0.12 * w, { f: 150, pan: p }); for (let i = 0; i < 8; i++) { const tt = t + 0.1 + i * 0.1 + s.rnd(0, 0.05), f = s.rnd(240, 400); s.tone(tt, 'sine', f, 0.06, 0.04 * w, { to: f * 2, pan: p }); } },
    vwDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 380, 1.3, 0.05 + 0.02 * w, { to: 70, vib: [9, 35, 0.1], lp: 1400, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.2, 'bandpass', 1600, 1.2, 0.04 * w, { to: 500, pan: p });
      for (let i = 0; i < 6; i++) { const tt = t + 0.3 + i * 0.13 + s.rnd(0, 0.05), f = s.rnd(200, 330); s.tone(tt, 'sine', f, 0.07, 0.035 * w, { to: f * 1.8, pan: p }); } },
  };

  return {
    name: '虫王', HX, R_EL: FXI.poison, DUR, hero, P, GLOW_MATS: [GD, GM, GB, GW, MAW, SILK, EYE], HIT_POINT: [6, -34], EVENTS, MAX_H: 86, OWN_MAX: 60, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'poison', style: 'poison', w: 1 },
    MOVES: ['burrow', 'silk', 'roar'], MOVE_NAMES: { burrow: '钻地', silk: '吐丝', roar: '毒雾（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.6, 1.2, 1.5, 1.6, 1.75]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.33, 0.5], 'burrow'], [CAST, [0, 1 / 12, 2 / 12, 4 / 12], 'burrow'], [RECOVER, [0, 0.17, 0.33, 0.6], 'burrow'],
      [CHARGE, [0, 0.25, 0.5, 0.75], 'silk'], [CAST, [0, 2 / 12], 'silk'], [RECOVER, [0.17, 0.42], 'silk'],
      [CHARGE, [0, 0.25, 0.42], 'roar'], [CAST, [0, 2 / 12, 5 / 12], 'roar'], [RECOVER, [0.17, 0.5], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.8, 1.0, 1.3, 1.6, 1.9, 2.2, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
