// 灰狼（衍生单位 · 骷髅 · 战士 · 普通 · 近战；召唤师召唤的宠物）：标准比例的骨狼。前半身还披着灰蓝狼毛，
//   从肋骨中段往后毛烂光了：背线上一根根肋骨、一截腰椎、骨盆和两条骨后腿；尾巴是一串往上翘成钩的裸尾椎。
//   脖子上戴着召唤师同款项圈（紫蝴蝶结 + 骨牌），一只耳朵完整、另一只只剩软骨尖。
// 攻击：低伏后前扑 4 格一口咬合。技能「猎杀扑咬」：伏到最低、耳贴后、眼窝冰蓝、口中溢出霜气、后腿蹬地抖动；
//   施放时长距离跃扑 8 格，身后两道冰蓝剪影残影，咬合定格 2 帧，冰霜冲击环 + 冰晶外爆，目标被冻得变慢。
// 死亡：侧倒伸直四腿，前半身的灰毛一段段化灰飘散，只剩一副完整的骨架，最后骨架消散。
// 身体用 parts-beast 的 quad（canine 头、颈圈毛）拼；皮毛前半截、骨架躯干、骨尾、项圈、软骨耳是本模块的候选部件。
PCD.define('GrayWolf', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.frost, EL = FXR[R_EL];                                                    // 猎犬扑杀 · 幽霜蓝：白 21 → 冰青 22 → 青 23 → 钢蓝 40 → 深蓝 39
  const R_FUR = fxRamp('grayWolfFur', [31, 30, 29, 28, 27]);                                 // 受击毛屑 / 化灰（灰蓝）
  const R_BONE = fxRamp('grayWolfBone', [21, 17, 6, 7, 8]);                                  // 骨屑
  const m = B.mats(E, {
    main: 'steel', mane: [27, 28, 30, 31], muz: [27, 29, 30, 31], belly: [27, 29, 30, 31],  // 灰蓝狼毛 · 颈圈毛 · 吻部 / 腹线浅一级
    bone: 'bone', leather: 'leather', bow: [25, 42, 24, 43], tag: 'bone',                   // 骨 · 项圈皮带 · 紫蝴蝶结（召唤师同色）· 骨牌
    eye: [0, 0, 22, 22], glow: [22, 22, 21, 21], teeth: 'white', cart: [8, 7, 16, 15],      // 冰青眼 / 发光眼 · 软骨尖（淡肉粉）
  });
  m.body = E.defMat(E.RAMP.steel, 1);                                                        // 皮毛只剩前半截，面积小：band 1，别整块发暗
  const mBone = Object.assign({}, m, { limb: m.bone, far: m.boneFar, muz: m.bone, eye: m.ink });   // 骨腿 / 骷髅头用
  const HEAD = { type: 'canine', w: 6, h: 5, snout: 4, snH: 3, tip: 0.6, earH: 3 };
  const SHAPE = { len: 12, chest: 4.5, rump: 3.6, waist: 0.35, hump: 0.3, leg: 7, lw: 2, thigh: 2.1, farDx: -2, stride: 3, lift: 2,
    neck: 3, neckA: 0.55, neckW: 2.4, head: HEAD, headA: 0.15, tail: 'none', mane: 'ruff', maneLen: 1, foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);
  const oBone = Q.shape(Object.assign({}, SHAPE, { lw: 1, thigh: 1.0, m: mBone }));                                  // 骨后腿（几何同一份）
  const oSkull = Q.shape(Object.assign({}, SHAPE, { lw: 1, thigh: 1.0, head: Object.assign({}, HEAD, { ear: 'none' }), m: mBone }));   // 化灰后的骷髅头 / 骨前腿
  const FUR_CUT = 2.5;                                                                       // 皮毛从这一列往前（肋骨中段）
  const TAIL = { n: 8, a: 0.55, curl: 0.34 };                                                // 骨尾：8 节，根部斜上，越往后越卷成钩

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 52, 44, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'bow', 'tag', 'leather']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['ash', 0, 3]]);                                     // ash：化灰进度 0 全毛 · 1 胸毛散 · 2 颈 / 前腿散 · 3 只剩骨架
  const P = {};
  function reset() { Q.reset(P); P.ash = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'glow', 'lift'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, glow: 0, lift: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12, T_BITE = 3 / 12;
  const A_WIND = pose({ bx: -1, crouch: 2, pitch: -1, head: 1, ear: 1, tail: 1 });                 // 低伏
  const A_LUNGE = pose({ bx: 4, reach: 2, jaw: 3, pitch: 1, ear: 1, tail: -2, mane: -1 });         // 前扑 4 格张嘴
  const A_BITE = pose({ bx: 4, reach: 1, jaw: 0, pitch: 0, head: 1, ear: 1, tail: -1 });           // 一口咬合
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_LUNGE, 'snap'], [T_BITE, A_BITE, 'snap'], [0.45, A_BITE, 'lin'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 4, pitch: -2, head: 1, jaw: 1, ear: 1, tail: 1, mane: 1, glow: 1 });  // 伏到最低、耳贴后、张口吐霜
  const S_JUMP = pose({ bx: 3, lift: 4, reach: 3, jaw: 3, pitch: 1, ear: 1, tail: -2, mane: -1, glow: 3 });
  const S_AIR = pose({ bx: 6, lift: 3, reach: 4, jaw: 3, pitch: 0, ear: 1, tail: -2, mane: -1, glow: 3 });
  const S_CLAMP = pose({ bx: 8, reach: 2, jaw: 0, pitch: 0, head: 1, ear: 1, tail: -1, glow: 3 });    // 咬合定格
  const S_HOLD = pose({ bx: 8, reach: 1, jaw: 1, head: 0, ear: 0, tail: 0, glow: 2 });
  // 待机个性「嗅地」：[head, pitch, ear, tail, crouch]：低头贴地嗅两下，耳朵一竖一竖，骨尾左右摇
  const SNIFF = [[2, -1, 0, 1, 0], [3, -2, 1, 2, 1], [3, -3, 0, -2, 1], [3, -2, 1, 2, 1], [3, -3, 0, -2, 1], [2, -1, 1, 1, 0], [1, 0, 0, 0, 0]];

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.5 - 1e-6 && lp < 2.1 - 1e-6) { const s = SNIFF[Math.min(6, f12of(lp - 1.5))]; P.head = s[0]; P.pitch = s[1]; P.ear = s[2]; P.tail = s[3]; P.crouch = s[4]; }
  }
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.tail = [-2, 0, 2, 0][P.gf]; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 轻快小跑，骨尾随步左右甩
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      if (tq > 0.45) P.glow = tq > 0.9 ? 2 : ((f12 & 1) ? 2 : 1);                                  // 眼窝冰蓝 1 → 2 档
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tail = (f12 & 1) ? 2 : 0; P.crouch = (f12 & 1) ? 3 : 4; }   // 后腿蹬地抖动
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) apply(S_JUMP); else if (tq < T_HIT) apply(S_AIR); else if (tq < 4 / 12) apply(S_CLAMP); else apply(S_HOLD);
      P.rim = tq < 4 / 12 ? 3 : 2;
    } else if (st === RECOVER) {                                                                    // 跳回：bx 8 → 0，离地一个弧
      const q = clamp01(tq / 0.4), e = ease.inOut(q);
      if (tq < 0.4) { apply(S_HOLD); P.bx = R(8 * (1 - e)); P.lift = R(Math.sin(Math.PI * q) * 3); P.jaw = 0; P.reach = q < 0.5 ? 1 : -1; P.pitch = q < 0.5 ? 1 : -1; P.tail = 1; P.glow = 2; }
      else { const q2 = ease.inOut(clamp01((tq - 0.4) / 0.25)); E.mix(tmp, pose({ crouch: 1, pitch: -1, glow: 1 }), REST, q2, F_ALL); apply(tmp); }
      P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else { Q.anim.death(P, d, f12); P.ash = d < ASH_AT[0] ? 0 : d < ASH_AT[1] ? 1 : d < ASH_AT[2] ? 2 : 3; }   // 侧倒伸腿 → 毛一段段化灰 → 只剩骨架 → 消散
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }
  const ASH_AT = [0.8, 1.0, 1.2];                                                                   // 死亡内秒数：胸毛 / 颈与前腿 / 头依次化灰

  // ───── 画 ─────
  // 候选部件：furFront —— quad.body 的前半截：只画 x ≥ cut 的列（颈 + 胸），边缘 2 列按 hash 参差（烂毛），露出底下先画好的骨架。
  //   neck 0 = 不画颈（颈毛也化灰了）。腹线、背毛纹同 quad.body。
  function furFront(rg, oo, cut, neck) {
    E.part(); const mm = oo.m, C1 = rg.C1, lie2 = rg.lie === 2;
    if (neck) U.taper(E, rg.NB.x, rg.NB.y, rg.NT.x, rg.NT.y, oo.neckW, oo.neckW * 0.8, mm.body, 0);
    const x1 = Math.ceil(C1.x + C1.r) + 1;
    for (let x = Math.floor(cut); x <= x1; x++) {
      const s = Q.span(rg, oo, x); if (!s) continue; const e = x - cut;
      for (let y = s[0]; y <= s[1]; y++) {
        if (e < 2 && U.hash(x * 3 + 1, y + 40) < (e < 1 ? 0.55 : 0.28)) continue;                 // 烂毛参差边
        const t = e >= 2 && x < x1 - 2 && y === s[0] + 2 + ((x >> 2) & 1) && ((x + 40) % 4) === 1 ? 2 : 0;
        U.dot(E, x, y, mm.body, t);
      }
      if (!lie2 && e >= 1 && x < C1.x + C1.r * 0.5 && s[1] > s[0] + 2) U.dot(E, x, s[1], mm.belly, ((x + 40) % 3) === 0 ? 2 : 0);
    }
  }
  // 候选部件：boneTrunk —— 露骨的躯干（一个部件）：两行脊椎 + 背线上每 2 列一格棘突、往后斜的肋骨（前长后短）、斜板骨盆 + 闭孔。
  //   xFront = 骨架画到哪一列（活着时被皮毛盖住的部分也画，边缘才露得出来）。侧躺（lie 2，肚子朝上）时脊椎在下沿、肋骨往上长
  function boneTrunk(rg, oo, xFront) {
    E.part(); const bm = oo.m.bone, C1 = rg.C1, C2 = rg.C2, up = rg.lie !== 2, dir = up ? 1 : -1;
    const xs = R(C2.x - 1), xe = R(xFront), r0 = R(C2.x + (C1.x - C2.x) * 0.42);
    for (let x = xs; x <= xe; x++) {
      const s = Q.span(rg, oo, x); if (!s) continue; const y0 = up ? s[0] : s[1];
      U.dot(E, x, y0 + dir, bm, 0); if (x > R(C1.x - 2)) U.dot(E, x, y0, bm, 0);
      if (up && (x & 1) === 0 && x > xs + 1) U.dot(E, x, y0, bm, 4);                         // 棘突：背线参差
    }
    for (let x = r0; x <= xe; x += 2) {                                                              // 肋骨：从脊椎往下（往后斜），越靠前越长
      const s = Q.span(rg, oo, x); if (!s) continue; const h = s[1] - s[0], q = clamp01((x - r0) / Math.max(1, C1.x - r0)), L = Math.max(2, R(h * (0.5 + 0.38 * q)));
      for (let j = 2; j <= L; j++) U.dot(E, x - Math.floor(j / 3), (up ? s[0] : s[1]) + dir * j, bm, j === L ? 2 : 0);
    }
    const cx = C2.x - 0.3, cy = C2.y + (up ? 0 : -0.5), s2 = Q.span(rg, oo, R(C2.x + 2)), sy = s2 ? (up ? s2[0] : s2[1]) : cy - 3;
    U.oval(E, cx, cy, 1.9, 1.3 * rg.sq, bm, 0);                                                      // 骨盆：髋臼一团
    U.seg(E, C2.x + 2.5, sy + dir, cx + 0.5, cy, 1, bm, 0);                                          // 髂骨斜板连到脊椎
    U.seg(E, cx - 1, cy + 1, cx - 3.2, cy + 1.6 * dir, 1, bm, 2);                                    // 坐骨往后伸
    U.dot(E, cx - 0.8, cy + 0.2, oo.m.ink, 0);                                                       // 闭孔
  }
  // 候选部件：boneTail —— 裸尾椎：一串 1 格骨节（亮暗交替，前 3 节下面多垫 1 格），从臀后斜上、越往尾梢越卷，翘成钩；P.tail 甩动
  function boneTail(rg, oo) {
    E.part(); const bm = oo.m.bone, sw = (P.tail | 0) * 0.13, lie2 = rg.lie === 2;
    let x = rg.tail.x - 0.5, y = rg.tail.y, a = lie2 ? -0.05 : TAIL.a;
    for (let k = 0; k < TAIL.n; k++) {
      U.dot(E, x, y, bm, (k & 1) ? 2 : 4); if (k < 3 && !lie2) U.dot(E, x, y + 1, bm, 2);
      a += (lie2 ? 0.05 : TAIL.curl * (0.3 + k / TAIL.n)) + sw; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) y = -0.5;
    }
    U.dot(E, x, y, bm, 4);
  }
  // 候选部件：petCollar —— 颈上的项圈：沿颈轴 2 格宽的皮带箍一圈 + 喉下蝴蝶结（结 + 两瓣 + 两条尾巴）+ 蝴蝶结下垂一块骨牌。
  //   c = { q 沿颈根 → 颈顶的位置, band 皮带材质, bow 结材质, tag 牌材质 }；返回蝴蝶结中心
  function petCollar(rg, c) {
    E.part(); const NB = rg.NB, NT = rg.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, vx = (NT.x - NB.x) / L, vy = (NT.y - NB.y) / L, nx = -vy, ny = vx;
    const cx = lerp(NB.x, NT.x, c.q), cy = lerp(NB.y, NT.y, c.q), r = o.neckW * 0.9 + 0.2;
    for (let s = -r; s <= r; s += 0.5) for (let t = 0; t <= 1; t++) U.dot(E, cx + nx * s + vx * t, cy + ny * s + vy * t, c.band, t === 1 && s < 0 ? 4 : 0);
    const bx = R(cx + nx * (r + 0.6)), by = R(cy + ny * (r + 0.6));
    [[-1, -1, 4], [1, -1, 3], [-1, 0, 3], [0, 0, 4], [1, 0, 2], [-1, 1, 2], [1, 1, 2]].forEach(([dx, dy, tn]) => U.dot(E, bx + dx, by + dy, c.bow, tn));
    if (!rg.lie) { U.dot(E, bx, by + 2, c.tag, 4); U.dot(E, bx + 1, by + 2, c.tag, 3); U.dot(E, bx, by + 3, c.tag, 3); U.dot(E, bx + 1, by + 3, c.tag, 2); }
    return [bx, by];
  }
  // 候选部件：stubEar —— 远侧那只只剩软骨尖的耳朵（2 格细尖，淡肉色），画在头之前；ear 贴后时往后倒
  function stubEar(rg, oo) {
    if (rg.lie === 2) return; E.part(); const F = Q.headFrame(rg, oo), b = F.at(F.W * 0.05, -F.Hh + 0.3), x = R(b[0]), y = R(b[1]), pin = P.ear | 0;
    U.dot(E, x, y - 1, m.cart, 0); U.dot(E, x + 1, y - 1, m.cart, 0); U.dot(E, x - pin, y - 2, m.cart, 3); U.dot(E, x + 1 - pin * 2, y - 3, m.cart, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const ash = P.ash | 0, lie2 = rig.lie === 2, legsLast = lie2;
    const oF = ash >= 2 ? oSkull : o;                                                               // 前腿：化灰到 2 之后是骨腿
    const cut = ash === 0 ? FUR_CUT : ash === 1 ? rig.C1.x + 1.5 : 99;
    const leg = (i) => Q.leg(E, rig, P, rig.legs[i].front ? oF : oBone, i);
    if (!legsLast) { leg(0); leg(1); }
    boneTail(rig, o);
    boneTrunk(rig, o, ash >= 2 ? rig.C1.x + rig.C1.r - 1 : Math.min(cut + 2, rig.C1.x + rig.C1.r - 1));
    if (ash >= 2) { E.part(); U.seg(E, rig.NB.x, rig.NB.y, rig.NT.x, rig.NT.y, 2, m.bone, 0); }  // 颈椎
    if (ash < 2) furFront(rig, o, cut, 1);
    if (!legsLast) { leg(2); leg(3); }
    if (ash === 0) Q.mane(E, rig, P, o);
    petCollar(rig, COLLAR);
    if (ash < 3) { stubEar(rig, o); Q.head(E, rig, P, o); } else Q.head(E, rig, P, oSkull);
    if (legsLast) { leg(0); leg(1); leg(2); leg(3); }
  }
  const COLLAR = { q: 0.5, band: m.leather, bow: m.bow, tag: m.tag };
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 残影（技能跃扑）：起跳、腾空两个姿势各拷一份剪影 ─────
  const g0 = new Sprite(hero.w, hero.h, hero.ox, hero.oy), g1 = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostOK = 0;
  function makeGhosts() {
    const keep = { rim: RIM.rim, flash: RIM.flash, dq: RIM.dq };
    RIM.rim = 0; RIM.flash = 0; RIM.dq = 0;
    poseAt(CAST, 0, 0); drawHero(); bake(hero, RIM); copySprite(g0, hero);
    poseAt(CAST, 1 / 12, 1 / 12); drawHero(); bake(hero, RIM); copySprite(g1, hero);
    Object.assign(RIM, keep); hero.k1 = hero.k2 = -1; ghostOK = 1;
  }

  // ───── 特效 ─────
  const smT = [9, 9], smX = [0, 0], smY = [0, 0], smBig = [0, 0];                                 // 咬合拖影：0 攻击，1 技能
  let chargeAcc = 0, breathAcc = 0, soulAcc = 0, ashAcc = 0, lastGf = -9, lastEar = 0, fangT = 9;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function bite(k, x, y, big) { smT[k] = 0; smX[k] = x; smY[k] = y; smBig[k] = big; }
  function onEnter(s) {
    if (s === CAST) {
      makeGhosts(); poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      releaseOrbit(40, 90, 0.3, 0.6); burst(gx, gy, 10, 30, 80, 0.2, 0.45, R_EL, 6);
      for (let i = 0; i < 8; i++) spawn(K_DUST, scrX(-8) + (Math.random() - 0.5) * 8, HY, -12 - Math.random() * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);   // 后腿蹬地扬尘
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = mouthScr(); bite(0, gx, gy, 0);
      burst(DUMMY_X - 3, gy, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(DUMMY_X - 3, gy, 4, 20, 50, 0.2, 0.4, R_EL, 4); hitDummy(0, 1);
      sfx('swing', { kind: 'bite', w: 0.35 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === CAST && t === T_HIT) {                                                                // 咬合：冰霜冲击环 + 冰晶外爆 + 减速
      const [gx, gy] = mouthScr(); bite(1, gx, gy, 1); fangT = 0;
      ring(DUMMY_X - 1, gy + 1, 1, R_EL); fx.cross(DUMMY_X - 2, gy, 7, R_EL, 0.3, 2);
      burst(DUMMY_X - 2, gy, 16, 40, 120, 0.3, 0.7, R_EL, 10);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + 0.2, v = 60 + Math.random() * 50; spawnX(K_BURST, DUMMY_X - 2, gy, Math.cos(a) * v, Math.sin(a) * v * 0.8 - 10, 0.45 + Math.random() * 0.3, R_EL, { sz: 2 }); }   // 大冰晶
      burst(DUMMY_X - 3, gy, 6, 30, 70, 0.12, 0.3, FXI.impact, 6);
      hitDummy(1, 1); dummyFx({ dur: 1.5, tint: 'frost', slow: 0.5 }); shake(0.12, 1);
      sfx('impact', { pal: 'frost', w: 0.45 });
    }
    if (s === HURT && t === INCOMING) { burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 5, 30, 80, 0.2, 0.4, R_FUR, 12); burst(HX + HIT_POINT[0] - 6, HY + HIT_POINT[1], 4, 30, 70, 0.2, 0.4, R_BONE, 12); }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 14 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 }); sfx('hit', { mat: 'stone', w: 0.2 });
    }
    const k = T_ASH.indexOf(t);
    if (s === DEATH && k >= 0) {                                                                     // 一段毛化灰：灰屑往上飘
      const x0 = k === 0 ? HX - 1 : k === 1 ? HX + 4 : HX + 10, x1 = k === 0 ? HX + 8 : k === 1 ? HX + 14 : HX + 20;
      for (let i = 0; i < 14; i++) spawn(K_RISE, x0 + Math.random() * (x1 - x0), HY - 2 - Math.random() * 7, (Math.random() - 0.5) * 10, -12 - Math.random() * 14, 0.6 + Math.random() * 0.6, R_FUR);
    }
  }
  const T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_ASH = ASH_AT.map((a) => Math.ceil((INCOMING + a) * 12 - 1e-6) / 12);
  const EVENTS = [[], [], [T_HIT], [], [T_HIT], [], [INCOMING], [T_LAND].concat(T_ASH), []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {
      chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE]));                                    // 霜粒螺旋汇入口中
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 9 + Math.random() * 8; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.3) { breathAcc += dt * 14; while (breathAcc >= 1) { breathAcc -= 1; spawnX(K_DUST, gx + 1, gy + 1, 4 + Math.random() * 8, -2 - Math.random() * 4, 0.6 + Math.random() * 0.5, R_EL, { age0: 0.1 }); } }   // 口中溢出的霜气（慢）
      if (stT > 1.1 && ((E.stepN >> 2) & 1) && Math.random() < dt * 20) spawn(K_DUST, scrX(-9), HY, -6 - Math.random() * 10, -3 - Math.random() * 4, 0.25, FXI.dust);   // 后腿蹬地
    }
    if (state === MOVE && P.gf !== lastGf) {                                                         // 轻快小跑：每步 1 颗尘，骨头咔咔轻响
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 8 : -6), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.3 }); }
      lastGf = P.gf;
    }
    if (state === IDLE && P.head === 3 && P.ear !== lastEar) spawn(K_DUST, scrX(P.gx) + 1, HY, (Math.random() - 0.5) * 6, -3, 0.25, FXI.dust);   // 嗅地吹起一点土
    lastEar = P.ear;
    if (state === RECOVER && stT < 0.35 && Math.random() < dt * 10) spawnX(K_DUST, gx + 1, gy, 3 + Math.random() * 5, -3, 0.5, R_EL, { age0: 0.2 });
    if (state === DEATH && stT > T_ASH[0] && stT < T_ASH[2] + 0.25) { ashAcc += dt * 18; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 24, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.5 + Math.random() * 0.6, R_FUR); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT[0] += dt; smT[1] += dt; fangT += dt;
  }
  function fxReset() { chargeAcc = 0; breathAcc = 0; soulAcc = 0; ashAcc = 0; lastGf = -9; lastEar = 0; fangT = 9; smT[0] = smT[1] = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {                                                                              // 跃扑残影：起跳、腾空两道冰蓝剪影，各拖 2 帧
    if (!ghostOK || E.state !== CAST) return; const t = E.stT;
    if (t >= 1 / 12 && t < 3 / 12) blitShape(g0, HX, HY, 0, t < T_HIT ? EL[2] : EL[3], t < T_HIT ? 0 : 0.45);
    if (t >= T_HIT && t < 4 / 12) blitShape(g1, HX, HY, 0, t < 3 / 12 ? EL[2] : EL[3], t < 3 / 12 ? 0 : 0.45);
  }
  function fxFront(f12) {
    for (let k = 0; k < 2; k++) if (smT[k] < 2 / 12) {                                              // 咬合拖影：上下两道短弧（第 1 帧亮、第 2 帧断续）
      const first = smT[k] < 1 / 12, x = smX[k], y = smY[k], H = smBig[k] ? 4 : 3, c0 = k ? EL[0] : 21, c1 = k ? EL[1] : 31, c2 = k ? EL[2] : 30;
      for (let j = -H; j <= H; j++) { if (!first && (j & 1)) continue; const dx = 2 + R(Math.abs(j) * 0.5), yy = y + j - (j < 0 ? 1 : 0); put(x + dx, yy, first ? c0 : c2); if (first) put(x + dx + 1, yy, c1); }
      if (first) put(x + 4, y, 21);
    }
    if (fangT < 4 / 12) {                                                                            // 咬合定格：假人身上两排冰牙印
      const [gx, gy] = mouthScr(), c = fangT < 2 / 12 ? EL[0] : EL[2];
      for (let k = 0; k < 3; k++) { put(DUMMY_X - 5 + k * 2, gy - 3, c); put(DUMMY_X - 5 + k * 2, gy - 2, EL[1]); put(DUMMY_X - 4 + k * 2, gy + 3, c); put(DUMMY_X - 4 + k * 2, gy + 2, EL[1]); }
      if (fangT < 2 / 12) put(gx + 1, gy, 21);
    }
    if (E.state === CAST && P.glow >= 3 && !P.lie) {                                                 // 眼光拖尾
      const ex = scrX(R(rig.eye[0]) + P.bx), ey = HY + R(rig.eye[1]); put(ex - 1, ey, EL[0]); put(ex - 2, ey, EL[1]); put(ex - 3, ey, EL[2]);
    }
  }

  return {
    name: '灰狼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'dissolve', pal: 'frost', style: 'frost', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
