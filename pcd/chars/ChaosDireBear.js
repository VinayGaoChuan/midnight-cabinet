// 混沌恐熊（敌人 · 混沌 · 稀有 · 近战 272）：名字「混沌恐熊」，desc「拥有魔法抗性外壳的蛞蝓。」；没有特性。
//   画成前半身是熊、后半身是蛞蝓的混沌嵌合体：宽熊头 + 两条撑地的粗熊臂（熊掌 3 爪），后半身没有腿，是一截湿滑、末端尖细的蛞蝓尾，身后拖一道黏液；
//   背上覆盖 5 片像犰狳一样的分节黑曜甲壳，每片后缘翘起，刻着冷青符文（抗魔外壳），高出背线 4 格；熊耳后伸出两根短眼柄。
// 攻击 = 咬：蛞蝓身向前一伸，把熊头送出 5 格，一口咬住。
// 技能「缩壳反弹」（没有特性，按「魔法抗性外壳」做）：头和前臂缩进甲壳下，符文一片片亮成冷青，一圈冷青点阵护盾贴着甲壳亮起 →
//   甲壳猛地一抖，护盾炸成冷青外爆 + 冲击环，熊头弹出来 → 一道冷青光束从甲壳弹向目标（把法术弹回去），目标变冷、变慢。
// 死亡：头缩进甲壳，甲壳一片片碎裂成块掉在地上，剩下的软身塌成一滩。
// 熊的头、前臂用 parts-beast 的 quad（bear 头、pad 熊掌）；蛞蝓身、分节甲壳、眼柄、胸肩、碎壳块、软身滩是本模块的候选部件。设定卡见 pcd/batch-06/ChaosDireBear/design.md。
PCD.define('ChaosDireBear', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, gait, walkDemo, ramp, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.frost, EL = FXR[R_EL];                                                        // 抗魔外壳 · 冷青：白 21 → 冰青 22 → 青 23 → 钢蓝 40 → 深蓝 39
  const R_SHARD = fxRamp('direBearShard', [21, 40, 28, 27, 0]);                                  // 碎甲壳屑：冷青反光 → 黑曜
  const SLUG = ramp(['#1e1018', '#4e2c3c', '#845266', '#b88498']);                               // 蛞蝓身：pink 暗段发灰
  const m = B.mats(E, {
    main: [0, 20, 19, 32],                                                                       // 熊毛 boot 暗褐（躯干 band 2，四肢 / 头 band 1）
    muz: [0, 19, 32, 33], claw: 'bone', eye: [0, 0, 22, 22], teeth: 'white',
    shell: [0, 27, 28, 40], slug: SLUG, slime: 'pale',
  });
  m.shell = E.defMat([0, 27, 28, 40], 1);                                                        // 黑曜甲片（小块，band 1）
  m.slug = E.defMat(SLUG, 2); m.slugL = E.defMat(SLUG, 1);
  m.rune = E.defMat([40, 23, 22, 21], 1, 1);                                                     // 符文（发光体）：2 待机微光 · 3 亮 · 4 爆闪
  m.stalk = E.defMat(SLUG, 1, 1);
  const BEAR = Q.shape({ len: 8, chest: 5, rump: 3, waist: 0, hump: 0, leg: 5, lw: 3, thigh: 2, farDx: -2, stride: 3, lift: 2, foot: 'pad',
    neck: 2, neckA: 0.35, neckW: 3.5, head: { type: 'bear', w: 8, h: 7, snout: 3, snH: 4, tip: 0.85, ear: 'round', earH: 2, teeth: 2 }, headA: 0.15,
    tail: 'none', mane: 'none', fur: 1, m });

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(76, 44, 38, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['rune', 'ink', 'eye', 'claw', 'teeth', 'slime', 'stalk', 'spec']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：ext 熊头前送 -2..6 · ret 缩壳 0–3 · rl 亮起的符文数 0–5 · sh 甲壳抖起 0–1 · est 眼柄长 0–3 · crk 碎掉的甲片数 0–5
  //   cair 最新碎掉那片的碎块还在空中 0 / 1 · pud 软身塌下 0 / 1 塌 / 2 一滩 · hmp 蛞蝓身拱峰 0 无 / 1 尾 / 2 中 / 3 拉长
  const SPEC = Q.KEYS.concat(B.COMMON, [['ext', -2, 6], ['ret', 0, 3], ['rl', 0, 5], ['sh', 0, 1], ['est', 0, 3], ['crk', 0, 5], ['cair', 0, 1], ['pud', 0, 2], ['hmp', 0, 3]]);
  const P = {};
  function reset() { Q.reset(P); P.ext = 0; P.ret = 0; P.rl = 0; P.sh = 0; P.est = 3; P.crk = 0; P.cair = 0; P.pud = 0; P.hmp = 0; }
  reset();
  const HIT_POINT = [4, -12];

  // ───── 姿势 ─────
  const F = ['ext', 'ret', 'head', 'jaw', 'bx', 'est'];
  const REST = { ext: 0, ret: 0, head: 0, jaw: 0, bx: 0, est: 3 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ ext: -2, head: -1, jaw: 1, est: 2 });                                    // 缩身蓄势，张嘴
  const A_BITE = pose({ ext: 5, head: 1, jaw: 3, est: 1 });                                      // 蛞蝓身一伸，熊头送出 5 格
  const A_SHUT = pose({ ext: 5, head: 1, jaw: 0, est: 1 });                                      // 一口咬住
  const A_HOLD = pose({ ext: 3, head: 0, jaw: 0, est: 2 });
  const T_BITE = 2 / 12;
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_BITE, A_BITE, 'snap'], [0.25, A_SHUT, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const T_RUNE = [0.45, 0.6, 0.75, 0.9, 1.05], T_THUD = 0.35, T_BEAM = 2 / 12;
  const T_CRK = [0.42, 0.5, 0.58, 0.67, 0.75], T_SLUMP = 0.83;                                    // 死亡：甲片碎裂时刻（死亡内秒数）· 软身塌成一滩
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = R(src[f]); };

  function idle(tq, f12) {
    Q.anim.idle(P, tq, f12, DUR[IDLE]); apply(REST);
    const TT = f12 / 12; P.bob = Math.floor(TT * 2.5 + 1e-6) & 1; P.est = P.bob ? 3 : 2; P.hmp = P.bob ? 2 : 0;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.1 - 1e-6 && lp < 2.2) {                                                          // 缩壳探头：头缩进甲壳下，再慢慢探出来张望
      const k = f12of(lp - 1.1);
      P.ret = [1, 2, 3, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0][Math.min(12, k)];
      P.est = [1, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 3][Math.min(12, k)];
      if (k >= 9) P.head = k & 1 ? -1 : 0;
      P.eyes = k >= 1 && k < 6 ? 1 : 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                       // 熊臂拖行、蛞蝓身蠕动跟上（一拉一拖）
      apply(REST); const f = gait(tq); P.gf = f;
      P.hmp = [3, 1, 3, 2][f]; P.ext = [1, 0, 1, 0][f]; P.bob = f & 1 ? 0 : 1; P.head = f & 1 ? 0 : 1; P.est = [3, 2, 3, 2][f];
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp); P.hmp = tq < T_BITE ? 1 : tq < 0.45 ? 3 : 0;
    } else if (st === CHARGE) {                                                                   // 缩进壳里，符文一片片亮起
      P.ret = Math.min(3, Math.floor(tq / 0.1 + 1e-6)); P.est = Math.max(0, 3 - P.ret); P.eyes = 1;
      P.rl = T_RUNE.filter((x) => tq >= x - 1e-6).length; P.hmp = 1;
      if (tq >= 1.1) P.sh = f12 & 1;
      P.rim = tq < 0.45 ? 1 : 2;
    } else if (st === CAST) {                                                                     // 甲壳猛地一抖，熊头弹出来
      apply(tq < 2 / 12 ? pose({ ext: 2, head: -1, jaw: 3, est: 3 }) : pose({ ext: 1, head: 0, jaw: 2, est: 3 }));
      P.sh = tq < 2 / 12 ? 1 : 0; P.rl = 5; P.rim = tq < 2 / 12 ? 3 : 2; P.hmp = 3;
    } else if (st === RECOVER) {
      E.mix(tmp, pose({ ext: 1, jaw: 2 }), REST, ease.inOut(clamp01(tq / 0.6)), F); apply(tmp);
      P.rl = Math.max(0, 5 - Math.floor(tq / 0.1 + 1e-6)); P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { apply(REST); Q.anim.hurt(P, h); P.crouch = 0; if (h < 0.35) { P.ret = 1; P.est = 1; P.sh = h < 1 / 12 ? 1 : 0; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(REST); Q.anim.hurt(P, Math.min(d, 0.19)); P.crouch = 0; P.flash = d < 1 / 12 ? 1 : 0; P.ret = 1; P.est = 1; P.bx = -2; }
      else {                                                                                      // 头缩进甲壳 → 甲片一片片碎裂 → 软身塌成一滩
        P.bx = -2; P.eyes = 1; P.est = 0;
        P.ret = d < 0.36 ? 2 : 3;
        P.crk = T_CRK.filter((x) => d >= x - 1e-6).length;
        P.cair = P.crk > 0 && d < T_CRK[P.crk - 1] + 1 / 12 - 1e-6 ? 1 : 0;
        P.pud = d < T_CRK[4] + 1 / 12 - 1e-6 ? 0 : d < T_SLUMP - 1e-6 ? 1 : 2;
        P.sh = P.crk < 5 && (f12 & 1) ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    const g = geo(); const f = shellFocus(g); P.gx = f[0] + P.bx; P.gy = f[1];
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 几何：熊的前半身用 quad 的 rig，按 前送 ext / 缩壳 ret 整体平移（脚留在地上）；蛞蝓身从尾尖连到胸下
  function shiftRig(r, dx, dy) {
    const pt = (p) => ({ ...p, x: p.x + dx, y: p.y + dy }), arr = (a) => [a[0] + dx, a[1] + dy];
    return { ...r, C1: pt(r.C1), NB: pt(r.NB), NT: pt(r.NT), head: pt(r.head), mouth: arr(r.mouth), eye: arr(r.eye), hit: arr(r.hit),
      legs: r.legs.map((L) => ({ ...L, T: [L.T[0] + dx, L.T[1] + dy], F: [L.F[0] + dx, L.F[1]] })) };
  }
  function geo() {
    const rig0 = Q.rig(P, BEAR), fx = P.ext - P.ret * 3, fy = P.ret * 2;
    const rig = shiftRig(rig0, fx, fy);
    const bunch = P.hmp === 3 ? -1 : P.hmp === 1 ? 1 : 0;                                        // 拉长时尾尖往后 1 格、拱起时往前 1 格
    return { rig, fx, fy, xt: -20 + bunch, xf: rig0.C1.x + Math.max(0, P.ext) - 1, cx: rig0.C1.x + Math.max(0, P.ext), cy: rig0.C1.y };
  }
  // 候选部件：slugTail —— 蛞蝓后半身：从尾尖（1 格高）到胸下（10 格高）按 √q 隆起，底边贴地；hmp 让一个拱峰沿身体前移（蠕动）；
  //   腹足一行暗色波纹、背上湿高光点、身后拖一道黏液；pud 1 = 塌成一半高 · 2 = 一滩
  function slugTop(g, x) {
    const q = (x - g.xt) / (g.xf - g.xt); if (q < 0) return null;
    let h = 1 + 9 * Math.pow(Math.min(1, q), 0.6);
    if (x > g.xf) { const e = (x - g.xf) / 4; if (e >= 1) return null; h *= Math.sqrt(1 - e * e); }   // 前端圆头（缩壳时露出来也不是一堵墙）
    const hp = P.hmp === 1 ? 0.3 : P.hmp === 2 ? 0.55 : -1; if (hp > 0) h += 1.8 * Math.exp(-(((q - hp) / 0.12) ** 2));
    if (P.pud === 1) h *= 0.55;
    return -h;
  }
  function slug(g) {
    E.part();
    for (let k = 1; k <= 6; k++) if (k % 2 || k < 3) U.dot(E, g.xt - k, 0, m.slime, k < 3 ? 4 : 3);   // 黏液带
    E.part();
    for (let x = Math.floor(g.xt); x <= Math.ceil(g.xf) + 4; x++) {
      const tp = slugTop(g, x); if (tp == null) continue; const yt = R(tp);
      for (let y = yt; y <= 0; y++) U.dot(E, x, y, m.slug, y === 0 ? (((x + 40 - (P.gf + 4)) & 3) === 0 ? 1 : 4) : y === -1 ? 2 : 0);   // 腹足边：亮的一行 + 暗色波纹
      if (((x + 40) % 4) === 1 && yt < -3) U.dot(E, x, R(yt * 0.45), m.slug, 4);                  // 侧腹一行湿高光
    }
  }
  function puddle() {
    E.part();
    U.oval(E, -3, -1.5, 17, 2, m.slug, 0);
    for (let x = -18; x <= 12; x += 5) U.dot(E, x, -3, m.slug, 4);
    E.part(); U.oval(E, 9, -2, 4, 2, m.body, 0);                                                  // 熊的前半身塌在前面：一团毛
  }
  // 候选部件：bearChest —— 熊的胸肩：颈（taper）+ 胸圆，接在蛞蝓身前端上面；胸口两道毛纹
  function chest(r) {
    E.part();
    U.taper(E, r.NB.x, r.NB.y, r.NT.x, r.NT.y, 3.5, 3, m.body, 0);
    U.oval(E, r.C1.x, r.C1.y, 5.5, 5, m.body, 0);
    for (let k = 0; k < 2; k++) U.seg(E, r.C1.x + 2 + k * 2, r.C1.y + 1, r.C1.x + 1 + k * 2, r.C1.y + 3, 1, m.body, 2);
  }
  // 候选部件：segShell —— 犰狳式分节甲壳：5 片黑曜甲片沿背线从后往前排、每片压住后一片，后缘翘起 1 格，高出背线 4 格；
  //   上沿一行冷青反光，片心刻一枚冷青符文（lit 个数亮起）；sh 整片抖起 1 格；crk 片从后往前碎掉不画
  const PLX = (i) => -15.5 + i * 5.4 + P.ext * i / 4;
  const RUNES = [[[0, 0], [0, -1], [1, -2]], [[0, 0], [1, -1], [0, -2]], [[-1, -1], [0, -1], [1, -1], [0, -2]], [[0, 0], [0, -1], [-1, -2]], [[1, 0], [0, -1], [1, -2]]];
  function backTop(g, x) {
    let t = slugTop(g, x); t = t == null ? 1e9 : t;
    const dx0 = x - g.cx; if (Math.abs(dx0) <= 5.5) t = Math.min(t, g.cy - 5 * Math.sqrt(1 - (dx0 / 5.8) ** 2));   // 肩上：按不缩壳的胸算，缩壳时甲壳原地不动
    return t;
  }
  function plateGeo(g, i, dx) { const xc = R(PLX(i)), x = xc + dx, b = backTop(g, x); if (b > 1e8) return null; const dome = 1 - (dx / 3.6) ** 2; return [x, R(b - 3 - dome * 1.2) - P.sh - (dx === -3 ? 2 : dx === -2 ? 1 : 0), R(b + 1) - P.sh]; }   // 后缘翘起 2 格
  function shell(g) {
    for (let i = 0; i < 5; i++) {
      if (i < P.crk) continue;
      E.part();
      const xc = R(PLX(i));
      for (let dx = -3; dx <= 3; dx++) {
        const G = plateGeo(g, i, dx); if (!G) continue; const [x, yt, yb] = G;
        for (let y = yt; y <= Math.min(0, yb); y++) U.dot(E, x, y, m.shell, y === yt ? 4 : y === yt + 1 && dx < 2 ? 3 : y >= yb - 1 ? 1 : 2);
      }
      const G = plateGeo(g, i, 0); if (!G) continue;
      const lit = i < P.rl, tone = lit ? (P.rim >= 3 ? 4 : 3) : 2;
      for (const [rx, ry] of RUNES[i]) U.dot(E, xc + rx, G[1] + 3 + ry, m.rune, tone);
    }
  }
  function shellFocus(g) { const G = plateGeo(g, 2, 0) || [PLX(2), -14]; return [R(PLX(2)), G[1] + 1]; }
  // 碎壳块：碎掉的甲片变成两块 3×2 的黑曜块，碎的那一帧在半空，之后落在原地两侧
  function chunks(g) {
    E.part();
    for (let i = 0; i < P.crk; i++) {
      const xc = R(-15.5 + i * 5.4), air = P.cair && i === P.crk - 1;
      for (const [ox, h] of [[-3, 0], [3, 1]]) {
        const x = xc + ox + (air ? 0 : ox > 0 ? 2 : -1), y = air ? -8 - h * 2 : 0;
        U.dot(E, x, y, m.shell, 4); U.dot(E, x + 1, y, m.shell, 3); U.dot(E, x + 2, y, m.shell, 2); U.dot(E, x, y - 1, m.shell, 4); U.dot(E, x + 1, y - 1, m.shell, 4);
        if (h) U.dot(E, x + 1, y - 2, m.rune, 1);
      }
    }
  }
  // 候选部件：stalkPair —— 熊耳后伸出的两根短眼柄（软身色平涂 1 格粗，顶端 2 格眼球 + 1 格墨瞳），est 眼柄长 0–3
  function stalks(r) {
    if (P.est <= 0) return;
    E.part();
    const H = r.head, base = [H.x - H.W * 0.7, H.y - H.Hh + 0.5];
    for (const [ox, far] of [[-2, 1], [0, 0]]) {
      const x0 = R(base[0] + ox), y0 = R(base[1]); let x = x0, y = y0;
      for (let k = 1; k <= P.est; k++) { x = x0 - (k >> 1); y = y0 - k; U.dot(E, x, y, m.stalk, far ? 2 : 3); }
      U.dot(E, x - 1, y - 1, m.stalk, far ? 3 : 4); U.dot(E, x, y - 1, m.stalk, far ? 3 : 4); U.dot(E, x, y - 1 + (P.eyes ? 0 : 0), P.eyes ? m.stalk : m.ink, P.eyes ? 2 : 0);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const g = geo(), r = g.rig;
    if (P.pud === 2) { puddle(); chunks(g); return; }
    const legsOn = P.ret < 2 && P.pud === 0;
    if (legsOn) Q.leg(E, r, P, BEAR, 1);                                                          // 远侧前臂
    slug(g);
    if (P.pud === 0) chest(r);
    if (legsOn) Q.leg(E, r, P, BEAR, 3);                                                          // 近侧前臂
    const headOn = P.ret < 3 && P.pud === 0;
    if (headOn && P.ret >= 1) { stalks(r); Q.head(E, r, P, BEAR); }                                // 缩壳时头在甲壳下面
    shell(g);
    if (headOn && P.ret === 0) { stalks(r); Q.head(E, r, P, BEAR); }
    chunks(g);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, domeOn = 0;
  const focusScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {                                                                             // 护盾炸开：冷青外爆 + 冲击环
      poseAt(CAST, 0, E.simT); const [x, y] = focusScr();
      releaseOrbit(40, 100, 0.25, 0.55);
      burst(x, y + 3, 28, 50, 140, 0.25, 0.6, R_EL, 10); ring(x, y + 4, 1, R_EL); fx.cross(x, y - 2, 6, R_EL, 0.25);
      for (let k = 0; k < 8; k++) spawn(K_DUST, x - 12 + Math.random() * 24, HY, (Math.random() - 0.5) * 40, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BITE) {                                                           // 一口咬住：上下两道咬合弧 + 火花
      const hx = DUMMY_X - 4, hy = HY - 12;
      fx.slash(hx - 3, hy + 2, 5, 0.3, 1.9, FXI.impact, 2 / 12, 2, 2); fx.slash(hx - 3, hy - 2, 5, 2.9, 1.3, FXI.impact, 2 / 12, 2, 2);
      burst(hx, hy, 14, 40, 110, 0.15, 0.4, FXI.impact, 10);
      hitDummy(1, 1); shake(0.1, 1); sfx('swing', { kind: 'bite', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === CHARGE && t === T_THUD) {                                                           // 缩进壳里：空洞的一声「咚」，甲壳压地
      const [x] = focusScr();
      for (let k = 0; k < 10; k++) spawn(K_DUST, x - 14 + Math.random() * 28, HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 6, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('hit', { mat: 'stone', w: 0.8 });
    }
    if (s === CHARGE && t === T_RUNE[0]) { const [x, y] = focusScr(); fx.dome(x, HY + 1, 22, 21 - 0, R_EL, DUR[CHARGE] - T_RUNE[0] + 0.1, 2); domeOn = 1; }   // 点阵护盾贴着甲壳亮起
    if (s === CHARGE) { const i = T_RUNE.indexOf(t); if (i >= 0) { const x = scrX(R(PLX(i)) + P.bx), y = HY + P.gy + 2; burst(x, y, 5, 15, 40, 0.15, 0.3, R_EL, 8); } }
    if (s === CAST && t === T_BEAM) {                                                             // 一道冷青光束从甲壳弹向目标
      const [x, y] = focusScr();
      fx.beam(x + 2, y - 1, DUMMY_X - 1, HY - 16, 2, R_EL, 0.35, 2); fx.cross(DUMMY_X - 1, HY - 16, 5, R_EL, 0.25);
      burst(DUMMY_X - 1, HY - 16, 24, 40, 120, 0.25, 0.55, R_EL, 10); ring(DUMMY_X - 1, HY - 16, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 1.8, tint: 'frost', slow: 0.5 }); shake(0.12, 1); sfx('impact', { pal: 'frost', w: 0.8 });
    }
    if (s === DEATH) {
      const i = T_CRK.map((x) => Math.ceil((INCOMING + x) * 12 - 1e-6) / 12).indexOf(t);
      if (i >= 0) {                                                                               // 一片甲壳碎裂
        const x = scrX(R(-15.5 + i * 5.4) + P.bx), y = HY - 12 + i;
        burst(x, y, 10, 30, 90, 0.2, 0.45, R_SHARD, 20);
        for (let k = 0; k < 4; k++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 70, -40 - Math.random() * 40, 0.8, R_SHARD, { g: 320, floor: HY });
        shake(0.06, 1); sfx('hit', { mat: 'stone', w: 0.5 });
      }
      if (t === T_FALL) {                                                                         // 软身塌成一滩
        for (let k = 0; k < 16; k++) spawn(K_DUST, scrX(-18 + Math.random() * 30 + P.bx), HY, (Math.random() - 0.5) * 36, -4 - Math.random() * 8, 0.35 + Math.random() * 0.35, FXI.dust);
        shake(0.1, 1); sfx('fall', { w: 0.8 });
      }
    }
  }
  const T_FALL = Math.ceil((INCOMING + T_SLUMP) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_BITE], [T_THUD].concat(T_RUNE), [T_BEAM], [], [], T_CRK.map((x) => Math.ceil((INCOMING + x) * 12 - 1e-6) / 12).concat([T_FALL]), []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = focusScr();
    if (state === CHARGE && stT > 0.4) {                                                          // 冷青屑往甲壳收拢
      chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 16 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy + 3, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) {
        if (f === 0 || f === 2) { const x = scrX(12 + P.bx); for (let k = 0; k < 3; k++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 18, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.8 }); }
        lastGf = f;
      }
    }
    if (state === DEATH && stT > INCOMING + 1.55 && stT < INCOMING + 2.4) {
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-16 + Math.random() * 30), HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); }
    }
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; domeOn = 0; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }

  return {
    name: '混沌恐熊', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.rune, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'armor', how: 'shatter', pal: 'frost', style: 'shield', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack,
  };
});
