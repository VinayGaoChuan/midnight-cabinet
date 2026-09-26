// 混沌邪猪（敌人 · 混沌 · 普通 · 中程 600）：desc「中程单位。通过喷射魔法毒素攻击。」；没有特性。
//   臃肿大肚猪：病粉红肉皮、肚子下垂几乎贴地、腿短头低；背上鼓起一排 3 个半透明黄绿毒囊（最大半径 4，高出背线 4 格），
//   猪鼻变成一只向前外翻的喇叭形喷口（一直滴毒液），一对上弯獠牙，一条卷成弹簧的小尾巴，眼睛是魔法紫。
// 攻击 = 喷：鼓气仰头 → 鼻口向前喷出一小股锥形毒雾，带一颗毒弹飞到中程。
// 技能「毒浪喷吐」（没有特性，按描述做）：猛吸一口气，身体鼓大一圈，三个脓包依次胀亮、毒泡往上飘 → 打个嗝，喷口向前喷出一道贴地毒浪，
//   脓包瘪下去 → 毒浪漫过目标，地上留下一片贴地冒泡的毒池，目标中毒。
// 死亡：肚子胀大后爆开，毒液溅一地，坍成一滩，獠牙弹出去，再冒着烟蒸发掉。
// 身体用 parts-beast 的 quad（boar 头）拼；毒囊、喇叭喷口、弹簧尾、獠牙、毒液滩是本模块的候选部件。设定卡见 pcd/batch-06/ChaosEvilPig/design.md。
PCD.define('ChaosEvilPig', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, ramp, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, shoot, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.poison, EL = FXR[R_EL];                                                     // 魔法毒素 · 黄绿：白 21 → 淡黄绿 50 → 黄绿 49 → 绿 48 → 墨绿 34
  const FLESH = ramp(['#2a1422', '#6e3a52', '#a8667e', '#d494a8']);                            // 病粉红肉皮（pink 暗段，发灰发紫）
  const m = B.mats(E, {
    main: FLESH, muz: FLESH, claw: [0, 0, 20, 19], horn: 'bone', eye: [0, 0, 43, 43], glow: [24, 43, 21, 21],
    nozzle: 'skinDark', pus: 'poison',
  });
  m.pusLit = E.defMat([48, 49, 50, 21], 1, 1);                                                  // 胀亮的毒囊（发光体，平涂）
  const HEAD = { type: 'boar', w: 7, h: 6.5, snout: 3, snH: 4.5, tip: 0.9, ear: 'droop', earH: 3, nose: 'none', tusk: 0, teeth: 0 };
  const BASE = { len: 12, chest: 5.5, rump: 5, waist: -0.4, hump: 1.5, leg: 3, lw: 2, thigh: 2.4, farDx: -1.5, stride: 2, lift: 2, foot: 'hoof',
    neck: 1.5, neckA: 0.3, neckW: 3.5, head: HEAD, headA: 0.22, tail: 'none', mane: 'none', fur: 1, m };
  const OS = [Q.shape(BASE), Q.shape({ ...BASE, chest: 6.3, rump: 5.8, waist: -0.7 }), Q.shape({ ...BASE, chest: 7.2, rump: 6.6, waist: -1.0, hump: 1 })];   // inf 0 平常 · 1 吸气鼓大一圈 · 2 死前胀到极限

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 44, 40, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['pusLit', 'pus', 'eye', 'ink', 'horn', 'claw', 'glow', 'spec']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：inf 身体鼓胀 0–2 · pl 亮起的毒囊数 0–3 · pz 毒囊 0 平常 / 1 胀大 / 2 瘪 · jig 毒囊上下甩 -1..1 · drip 喷口滴液 0–2 · pud 毒液滩 0 无 / 1–3 塌成一滩
  const SPEC = Q.KEYS.concat(B.COMMON, [['inf', 0, 2], ['pl', 0, 3], ['pz', 0, 2], ['jig', -1, 1], ['drip', 0, 2], ['pud', 0, 3]]);
  const P = {};
  function reset() { Q.reset(P); P.inf = 0; P.pl = 0; P.pz = 0; P.jig = 0; P.drip = 0; P.pud = 0; }
  reset();
  let rig = Q.rig(P, OS[0]);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_REL = 2 / 12;
  const A_WIND = pose({ bx: -1, head: -2, pitch: 1, ear: 1, tail: 1 });                       // 鼓气仰头
  const A_SPIT = pose({ bx: -2, head: -1, pitch: 0, jaw: 1, tail: -2 });                       // 喷：鼻口向前，后坐 1 格
  const A_HOLD = pose({ bx: -1, head: 0, jaw: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_REL, A_SPIT, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_INHALE = pose({ bx: -1, head: -2, pitch: 2, jaw: 1, ear: 1, tail: 2 });              // 猛吸一口气
  const S_SPEW = pose({ bx: 1, head: 2, pitch: -1, jaw: 2, tail: -2, crouch: 1, ear: 1 });     // 打嗝喷出：头压低、喷口贴地
  const S_AFTER = pose({ head: 1, jaw: 1, tail: -1 });
  const T_LIT = [0.45, 0.7, 0.95], T_WAVE_HIT = 0.25;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.jig = P.bob ? -1 : 0; P.drip = (f12 >> 1) % 3;
    if (lp >= 0.4 - 1e-6 && lp < 1.1) { const k = f12of(lp - 0.4); P.head = [2, 3, 3, 2, 3, 3, 2, 3, 1][Math.min(8, k)]; P.jaw = k < 8 ? (k >> 1) & 1 : 0; P.crouch = k < 8 ? 1 : 0; P.bob = 0; P.jig = 0; }   // 拱地嗅探
    if (lp >= 1.5 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.5); P.head = [-1, -2, -2, -1, 0, 0][Math.min(5, k)]; P.jaw = [1, 2, 2, 1, 0, 0][Math.min(5, k)]; P.pz = k >= 1 && k < 4 ? 1 : 0; P.ear = k < 3 ? 1 : 0; }   // 打个嗝，脓包鼓一下冒泡
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                       // 一颠一颠的小跑，肚子和脓包跟着甩
      const f = Q.anim.walk(P, tq); P.jig = [1, -1, 1, -1][f]; P.drip = f & 1 ? 2 : 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      P.inf = tq >= 0.06 && tq < T_REL ? 1 : 0; P.pz = tq >= 0.06 && tq < T_REL ? 1 : 0; P.jig = tq >= T_REL && tq < 0.3 ? 1 : 0;
      P.glow = tq >= T_REL - 1e-6 && tq < 0.3 ? 2 : 0; P.rim = tq >= T_REL - 1e-6 && tq < 0.3 ? 1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.35) { E.mix(tmp, REST, C_INHALE, ease.out(tq / 0.35), F_ALL); apply(tmp); } else apply(C_INHALE);
      P.inf = tq < 0.2 ? 0 : 1;
      P.pl = tq < T_LIT[0] ? 0 : tq < T_LIT[1] ? 1 : tq < T_LIT[2] ? 2 : 3; P.pz = P.pl ? 1 : 0;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.jig = (f12 & 1) ? 1 : -1; P.tail = (f12 & 1) ? 2 : 1; }
      P.glow = tq < 0.45 ? 0 : (tq < 1.0 ? 2 : ((f12 & 1) ? 3 : 2)); P.rim = tq < 0.45 ? 1 : 2;
    } else if (st === CAST) {
      if (tq < 2 / 12) apply(S_SPEW); else { E.mix(tmp, S_SPEW, S_AFTER, ease.out(clamp01((tq - 2 / 12) / 0.25)), F_ALL); apply(tmp); }
      P.pz = 2; P.pl = 0; P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 2 / 12 ? 3 : 2; P.drip = 2;
    } else if (st === RECOVER) {
      E.mix(tmp, S_AFTER, REST, ease.inOut(clamp01(tq / 0.6)), F_ALL); apply(tmp);
      P.pz = tq < 0.35 ? 2 : 0; P.glow = tq < 0.2 ? 2 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.drip = tq < 0.4 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.jig = h < 0.2 ? -1 : h < 0.35 ? 1 : 0; P.pz = h < 0.2 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.hurt(P, Math.min(d, 0.19)); P.flash = d < 1 / 12 ? 1 : 0; P.jig = (f12 & 1) ? 1 : -1; P.pz = 1; }
      else if (d < 0.55) {                                                                        // 肚子胀大：一圈 → 胀到极限，腿离地乱蹬
        P.inf = d < 0.42 ? 1 : 2; P.pz = 1; P.eyes = 1; P.ear = 1; P.jaw = 2; P.head = -1; P.pitch = 1; P.tail = 2; P.bx = -2;
        P.jig = (f12 & 1) ? 1 : -1; P.lift = d < 0.42 ? 1 : 2; P.glow = 2;
      } else {                                                                                    // 爆开：毒液溅一地，坍成一滩（离地 3 → 1 → 0 的对应：滩高 3 → 2 → 1）
        P.pud = d < 0.6 ? 1 : d < 0.66 ? 2 : 3; P.bx = -2;
        const dr = B.dropAt(d, { at: 0.55, dur: 0.3, dx: 14, hop: 7 }); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2];
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, OS[P.inf]);
    const f = nozzleTip(rig, OS[P.inf]); P.gx = f[0] + P.bx; P.gy = f[1];
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：trumpetSnout —— 喇叭形喷口：吻尖往前伸出一截 3 格的软管、末端外翻成喇叭口（上下各外翻到吻高 + 3 格），
  //   管身每格一道皱褶，喇叭口前沿一道墨色开口；口沿下挂毒液滴（drip 1 贴着 · 2 拉长断开）。跟着头的朝向（headFrame）转
  const NZ = 3.5;                                                                               // 喷口伸出吻尖的长度
  function nzHalf(u, F) { const d = u - F.uT; return d < 0.8 ? 1.3 : 1.3 + (d - 0.8) * 0.8; }
  function nozzleTip(rg, oo) { const F = Q.headFrame(rg, oo, 0), a = F.at(F.uT + NZ + 0.8, F.vc - 0.5); return [R(a[0]), R(a[1])]; }
  function nozzle(rg, oo) {
    E.part();
    const F = Q.headFrame(rg, oo, P.jaw), vcn = F.vc - 0.5;
    Q.scanHead(F, F.uT + NZ + 4, (x, y, u, v) => {
      if (u < F.uT - 0.8 || u > F.uT + NZ + 0.45) return;
      const h = nzHalf(u, F), dv = v - vcn; if (Math.abs(dv) > h + 0.45) return;
      const rim = u > F.uT + NZ - 0.55;
      if (rim && Math.abs(dv) < h - 0.8) { U.dot(E, x, y, m.ink, 0); return; }                   // 喇叭口的墨色开口
      const fold = !rim && ((R(u - F.uT) & 1) === 0) && Math.abs(dv) < h - 0.3;                // 管身皱褶
      U.dot(E, x, y, m.nozzle, dv < -h + 0.6 ? 4 : dv > h - 0.6 ? 2 : fold ? 2 : 0);
    });
    if (P.drip && rg.lie !== 2) {                                                               // 口沿下的毒液滴
      const h = nzHalf(F.uT + NZ, F), a = F.at(F.uT + NZ - 0.5, vcn + h + 1);
      U.dot(E, a[0], a[1], m.pus, 3);
      if (P.drip === 2) U.dot(E, a[0], a[1] + 2, m.pus, 4); else U.dot(E, a[0], a[1] + 1, m.pus, 2);
    }
  }
  // 候选部件：upTusks —— 一对上弯獠牙（骨白）：从嘴角往上长 3 格、尖端往前勾 1 格；远侧那颗错后 1 格、暗一级
  function tusks(rg, oo) {
    E.part();
    const F = Q.headFrame(rg, oo, P.jaw), pt = F.prof(F.uT - 1), b = F.at(F.uT - 1.2, pt[2] + 0.6 + F.gap(F.uT - 1.2));
    for (const [dx, far] of [[-1, 1], [0, 0]]) {
      const x = R(b[0]) + dx, y = R(b[1]);
      U.dot(E, x, y, m.horn, far ? 2 : 3); U.dot(E, x, y - 1, m.horn, far ? 2 : 3); U.dot(E, x + 1, y - 2, m.horn, far ? 2 : 4); U.dot(E, x + 1, y - 3, m.horn, far ? 3 : 4);
    }
  }
  // 候选部件：springTail —— 卷成弹簧的小尾巴：从臀后往后上方绕 2 圈（1 格粗的线），tail 让弹簧上下拉伸
  function springTail(rg) {
    E.part();
    const x0 = rg.tail.x + 0.5, y0 = rg.tail.y, st = (P.tail | 0) * 0.5;
    const PTS = [[0, 0], [-1, -1], [-2, -1], [-3, -2], [-3, -3], [-2, -4], [-1, -3], [-2, -2], [-3, -4], [-4, -5], [-5, -5], [-5, -4]];   // 往后上绕两小圈
    for (let k = 0; k < PTS.length; k++) { const [dx, dy] = PTS[k]; U.dot(E, x0 + dx, y0 + dy - (k > 5 ? st : 0), m.limb, k === PTS.length - 1 ? 4 : (k & 1) ? 0 : 2); }
  }
  // 候选部件：pustuleSacs —— 背上一排 3 个大毒囊（半径 3 / 4 / 3，都高出背线 4 格）：囊里一道液面线，线上偏亮（气）、线下隔点透出暗色（半透明的液体），
  //   左上 2 格湿高光；lit 个数的囊换成发光体；pz 1 胀大一圈 / 2 瘪成扁的一片；jig 让相邻两个囊反向上下甩
  const SAC = [[-9.5, 2.8, 3], [0, 3.6, 4], [9.5, 2.8, 3]];   // [离身体中点的列, 横半径, 竖半径]
  function sacC(rg, oo, i) {
    const [dx, rx0, ry0] = SAC[i], x = (rg.C1.x + rg.C2.x) / 2 + dx, s = Q.span(rg, oo, R(x)), top = s ? s[0] : rg.C1.y - rg.C1.r;
    const r = rx0 + (P.pz === 1 ? 0.7 : 0), ry = P.pz === 2 ? Math.max(1.5, ry0 * 0.5) : ry0 + (P.pz === 1 ? 1 : 0);
    return [R(x), top - 4 + ry + ((i & 1) ? -P.jig : P.jig), r, ry];
  }
  function sacs(rg, oo) {
    E.part();
    for (let i = 0; i < 3; i++) {
      const [cx, cy, r, ry] = sacC(rg, oo, i), lit = i < P.pl, mat = lit ? m.pusLit : m.pus, lvl = cy - R(ry * 0.2);
      for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const u = (x - cx) / (r + 0.35), v = (y - cy) / (ry + 0.35), d = u * u + v * v; if (d > 1) continue;
        let t = 0;
        if (y === lvl && d < 0.8 && ((x + i) % 3)) t = 2;                                       // 液面线（断续）
        else if (y < lvl && d < 0.5) t = 4;                                                     // 线上：气，偏亮
        else if (y > lvl + 1 && d < 0.45 && ((x + y) & 1)) t = 2;                               // 线下：隔点透出暗色（半透明的液体）
        else if (d > 0.6 && (u + v) > 0.3) t = 2;                                               // 右下背光
        U.dot(E, x, y, mat, t);
      }
      if (P.pz !== 2) { U.dot(E, cx - R(r * 0.5), cy - R(ry * 0.55), m.spec, 3); U.dot(E, cx - R(r * 0.5) + 1, cy - R(ry * 0.55), m.spec, 3); }
    }
  }
  // 候选部件：toxPuddle —— 爆开后的一滩（k 1 刚塌下的肉堆 · 2 摊开 · 3 贴地的一滩）：病粉红肉皮 + 黄绿毒液斑块 + 液面上的气泡亮点
  const PUD = [null, [11, 4.5], [13, 3.2], [14, 2.4]];
  function puddle(k) {
    E.part();
    const [rx, ry] = PUD[k], cy = -ry + 0.5;
    for (let y = Math.floor(cy - ry - 1); y <= 0; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
      const u = x / (rx + 0.35), v = (y - cy) / (ry + 0.35); if (u * u + v * v > 1) continue;
      const top = !(((x) / (rx + 0.35)) ** 2 + ((y - 1 - cy) / (ry + 0.35)) ** 2 <= 1);
      U.dot(E, x, y, m.body, top ? 4 : y >= -0 ? 2 : (u > 0.55 ? 2 : 3));
    }
    if (k === 1) { U.disc(E, -4, cy - ry + 1, 2, m.body, 3); U.disc(E, 4, cy - ry + 1.5, 1.6, m.body, 3); U.dot(E, -5, cy - ry - 1, m.body, 4); }   // 还没摊开的肉块
    E.part();
    for (let j = 0; j < 5; j++) { const x = -rx + 3 + j * (rx * 2 - 6) / 4, w = 1 + (j & 1); for (let q = -w; q <= w; q++) U.dot(E, x + q, -1 - (j & 1), m.pus, q === -w ? 4 : 3); }   // 黄绿毒液斑块
    for (let j = 0; j < 3; j++) U.dot(E, -rx * 0.5 + j * rx * 0.5, cy - R(ry * 0.4), m.pus, 4);
  }
  function tuskLying(x) { E.part(); U.dot(E, x, 0, m.horn, 3); U.dot(E, x + 1, 0, m.horn, 3); U.dot(E, x + 2, -1, m.horn, 4); U.dot(E, x - 1, 0, m.horn, 2); }
  function tuskFlying(x, y, f) { E.part(); if (f) { U.dot(E, x, y, m.horn, 3); U.dot(E, x, y - 1, m.horn, 3); U.dot(E, x + 1, y - 2, m.horn, 4); } else { U.dot(E, x, y, m.horn, 3); U.dot(E, x + 1, y, m.horn, 3); U.dot(E, x + 2, y - 1, m.horn, 4); } }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.pud) {
      puddle(P.pud);
      if (P.drop === 1) tuskFlying(8 + P.dsx, -3 - P.dsy, P.dsx & 1);
      else if (P.drop === 2) tuskLying(8 + P.dsx);
      return;
    }
    const oo = OS[P.inf];
    Q.legs(E, rig, P, oo, 1);
    springTail(rig);
    Q.body(E, rig, P, oo);
    Q.legs(E, rig, P, oo, 0);
    sacs(rig, oo);
    Q.head(E, rig, P, oo);
    nozzle(rig, oo);
    tusks(rig, oo);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, bubAcc = 0, lastGf = -9, poolT = 9, poolX = 0, lastPz = 0, vapAcc = 0;
  const nzScr = () => [scrX(P.gx), HY + P.gy];
  const sacScr = (i) => { const [cx, cy, , ry] = sacC(rig, OS[P.inf], i); return [scrX(cx + P.bx), HY + cy - ry]; };
  function onEnter(s) {
    if (s === CAST) {                                                                             // 打嗝喷出：喷口外爆 + 冲击环 + 贴地毒浪
      poseAt(CAST, 0, E.simT); const [x, y] = nzScr();
      releaseOrbit(30, 80, 0.25, 0.5, { pts: 1 });
      burst(x + 1, y, 18, 40, 110, 0.2, 0.5, R_EL, 10); ring(x + 2, y, 0, R_EL); fx.cross(x + 2, y, 5, R_EL, 0.25);
      fx.wave(x + 1, HY, 1, DUMMY_X + 4 - (x + 1), 5, R_EL, 0.45, 2);
      shake(0.28, 2); flash(0.05);
    }
    if (s === IDLE || s === MOVE || s === ATTACK || s === HURT || s === DEATH || s === CHARGE) poolT = 9;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                                            // 喷：锥形毒雾 + 一颗毒弹
      const [x, y] = nzScr();
      for (let i = 0; i < 10; i++) { const a = (Math.random() - 0.5) * 0.9, v = 40 + Math.random() * 50; spawn(K_DUST, x + 1, y, Math.cos(a) * v, Math.sin(a) * v, 0.18 + Math.random() * 0.16, R_EL); }
      fx.cross(x + 1, y, 3, R_EL, 2 / 12);
      shoot(0, x + 2, y, 150, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.25], back: [4, 12] } });
      sfx('swing', { kind: 'throw', w: 0.4 }); sfx('shoot', { proj: 'water' });
    }
    if (s === CHARGE) { const i = T_LIT.indexOf(t); if (i >= 0) { const [x, y] = sacScr(i); burst(x, y, 6, 15, 40, 0.2, 0.4, R_EL, 12); } }   // 脓包一个个胀亮
    if (s === CAST && t === T_WAVE_HIT) {                                                         // 毒浪漫过目标：贴地毒池 + 中毒
      poolT = 0; poolX = DUMMY_X;
      burst(DUMMY_X - 2, HY - 3, 22, 40, 110, 0.25, 0.55, R_EL, 18); ring(DUMMY_X - 2, HY - 2, 1, R_EL);
      fx.cloud(DUMMY_X, HY - 6, 7, R_EL, 1.1, 2);
      hitDummy(1, 1); dummyFx({ dur: 1.8, tint: 'poison' }); shake(0.12, 1); sfx('impact', { pal: 'poison', w: 0.5 });
    }
    if (s === DEATH && t === T_POP) {                                                             // 肚子爆开：毒液溅一地
      const x = scrX(-2 + P.bx), y = HY - 8;
      burst(x, y, 26, 50, 140, 0.3, 0.6, R_EL, 30);
      for (let i = 0; i < 14; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * 120, -60 - Math.random() * 70, 0.9, R_EL, { g: 320, floor: HY });
      ring(x, y, 1, R_EL); fx.cloud(x, y - 2, 8, R_EL, 0.9, 2); shake(0.16, 2);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, scrX(-14 + Math.random() * 28), HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 6, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === T_CLINK) { burst(scrX(8 + 14 - 2), HY - 1, 4, 15, 40, 0.1, 0.25, FXI.impact, 8); sfx('hit', { mat: 'stone', w: 0.15 }); }
  }
  const T_POP = Math.ceil((INCOMING + 0.55) * 12 - 1e-6) / 12, T_LAND = Math.ceil((INCOMING + 0.66) * 12 - 1e-6) / 12, T_CLINK = Math.ceil((INCOMING + 0.85) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_REL], T_LIT.slice(), [T_WAVE_HIT], [], [], [T_POP, T_LAND, T_CLINK], []];
  function impactOn(k, x, y) {                                                                    // 毒弹命中：溅开 + 一小团毒雾
    burst(x, y, 10, 30, 90, 0.15, 0.4, R_EL, 10); fx.cloud(x, y - 1, 3, R_EL, 0.5, 2);
    hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.35 });
  }
  function bubble(x, y, v) { spawn(K_EMBER, x, y, (Math.random() - 0.5) * 6, -(v || 12) - Math.random() * 8, 0.45 + Math.random() * 0.3, R_EL); }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && P.pl > 0) {                                                            // 毒泡从亮起的脓包往上飘
      bubAcc += dt * (4 + 6 * P.pl);
      while (bubAcc >= 1) { bubAcc -= 1; const i = Math.floor(Math.random() * P.pl), [x, y] = sacScr(i); bubble(x + (Math.random() - 0.5) * 4, y); }
    } else if (state !== IDLE) bubAcc = 0;
    if (state === CHARGE && stT > 0.2 && stT < 1.2) {                                             // 猛吸：空气往喷口里收
      chargeAcc += dt * 18;
      const [x, y] = nzScr();
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = -0.8 + Math.random() * 1.6, r = 10 + Math.random() * 8; spawnX(E.K_SPIRAL_PT, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 0, 0, 9, FXI.dust, { a: a, r: r, w: 1.2, tx: x + 1, ty: y }); }
    }
    if (state === IDLE && P.pz === 1 && lastPz !== 1) { const [x, y] = sacScr(1); bubble(x, y, 10); bubble(x + 1, y - 1, 14); const [nx, ny] = nzScr(); fx.cloud(nx + 2, ny - 1, 2, R_EL, 0.4, 2); }   // 嗝：中间脓包冒一个毒泡
    lastPz = P.pz;
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 6 : -5), HY, (Math.random() - 0.5) * 10, -2 - Math.random() * 3, 0.25, FXI.dust); sfx('step', { w: 0.5 }); }
      if (P.gf === 1 && Math.random() < 0.7) { const [x, y] = nzScr(); spawnX(K_PHYS, x - 1, y + 2, 0, 5, 0.6, R_EL, { g: 200, floor: HY }); }   // 边跑边滴毒液
      lastGf = P.gf;
    }
    if (poolT < 2.2 && Math.random() < dt * 10) bubble(poolX - 8 + Math.random() * 16, HY - 1, 8);   // 毒池冒泡
    if (state === DEATH && stT > INCOMING + 0.7 && stT < INCOMING + 2.4) {                          // 一滩毒液冒烟蒸发 + 魂光
      vapAcc += dt * (stT > INCOMING + 1.6 ? 26 : 12);
      while (vapAcc >= 1) { vapAcc -= 1; spawn(K_RISE, scrX(-12 + Math.random() * 24 + P.bx), HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 10, 0.6 + Math.random() * 0.6, Math.random() < 0.7 ? R_EL : FXI.dust); }
      if (stT > INCOMING + 1.6) { soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, scrX(-8 + Math.random() * 16), HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); } }
    }
    poolT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; bubAcc = 0; lastGf = -9; poolT = 9; lastPz = 0; vapAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 贴地的毒池：扁椭圆点阵，外圈暗、里圈亮，逐帧闪；最后 0.6 s 断续褪去
  function fxMid(f12) {
    if (poolT >= 2.2) return;
    const q = clamp01(poolT / 0.15), fade = poolT > 1.6 ? (poolT - 1.6) / 0.6 : 0, rx = R(11 * q);
    for (let x = -rx; x <= rx; x++) for (let j = 0; j <= 1; j++) {
      const e = Math.abs(x) / Math.max(1, rx); if (j === 1 && e > 0.75) continue; if (fade && U.hash(x + 40, j + f12) < fade) continue;
      put(poolX + x, HY - j, j === 1 ? (((x + f12) % 4) === 0 ? EL[0] : EL[1]) : e > 0.8 ? EL[3] : ((x + f12) & 1) ? EL[1] : EL[2]);
    }
  }
  // 毒弹：2×2 黄绿球 + 白芯 + 下垂一滴
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 0) return false;
    put(x, y, EL[0]); put(x - d, y, EL[1]); put(x, y + 1, EL[2]); put(x - d, y + 1, EL[2]); put(x + d, y, EL[1]); put(x, y - 1, EL[1]);
    if (f12 & 1) put(x - d, y + 2, EL[3]);
    return true;
  }

  return {
    name: '混沌邪猪', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.pusLit, m.glow], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'explode', pal: 'poison', style: 'poison', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, drawShot,
  };
});
