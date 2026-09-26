// 黑剑（部队 · 虚空 · 刺客 · 普通 · 近战；升级 → 暗牙）：瘦长低伏的蓝黑狼，额头一支前指的黑剑独角、细尾末端一片上翘的剑刃、背脊一排锯齿黑鬃。
// 攻击：低伏后前扑 6 格扑咬，剑角顺势上挑。技能「狼群」：伏低，身后浮出两道单色狼影；施放时本体与两道狼影一前两后交错扑咬目标，
//   目标身上接连出现 3 道紫色裂痕（每口叠一层破甲），最后一圈碎盾冲击环；收招狼影化成紫尘，本体跳回。
// 身体用 parts-beast 的 quad 拼（瘦长低伏：细腿、深收腹、低颈）；本模块只画额刃角、刃尾（候选部件）和特效。
PCD.define('BlackSword', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.curse, EL = FXR[R_EL];                                                   // 狼群 · 诅咒紫：43 淡紫 → 24 → 42 → 25 深紫 → 52 墨紫
  const R_FUR = fxRamp('blackSwordFur', [54, 53, 52, 52, 0]);                               // 受击毛屑（蓝黑）
  const m = B.mats(E, {
    main: 'shadow', mane: [0, 0, 27, 53], blade: [0, 0, 27, 43], muz: [0, 53, 54, 59], belly: [0, 53, 54, 59],                            // 蓝黑狼毛 · 黑鬃 · 黑剑刃（受光的刃口亮成紫）
    eye: [0, 0, 43, 43], glow: [43, 43, 21, 21], teeth: 'white',
  });
  const o = Q.shape({ len: 13, chest: 3.6, rump: 3.1, waist: 0.65, hump: 0.4, leg: 6.5, lw: 1.5, thigh: 1.9, farDx: -2, stride: 3, lift: 2,
    neck: 3, neckA: 0.12, neckW: 2, head: { type: 'canine', w: 7, h: 5.5, snout: 4.5, snH: 3.4, tip: 0.55, earH: 3 }, headA: 0.22,
    tail: 'thin', tailLen: 8, tailA: -0.2, tailCurl: 0.3, mane: 'ridge', maneLen: 1, foot: 'paw', fur: 1, m });
  const TAILB = { len: 5, w: 2, up: 0.55, guard: 1 };                                        // 刃尾：5 格长、根宽 2 格、上翘，根部 1 格护手

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(112, 60, 54, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON);
  const P = {}; Q.reset(P);
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'glow', 'lift'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, glow: 0, lift: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12, T_FLICK = 3 / 12;
  const A_WIND = pose({ bx: -1, crouch: 2, pitch: -1, head: 1, ear: 1, tail: 1 });                 // 低伏蓄势
  const A_HIT = pose({ bx: 6, reach: 2, jaw: 3, pitch: 1, ear: 1, tail: -2, mane: -1 });            // 前扑 6 格扑咬（定格）
  const A_FLICK = pose({ bx: 5, reach: 1, jaw: 1, pitch: 1, head: -2, tail: -1 });                  // 剑角顺势上挑
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [4 / 12, A_FLICK, 'out'], [0.45, A_FLICK, 'lin'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, pitch: -1, head: 1, jaw: 1, ear: 1, tail: 1, mane: 1, glow: 1 }); // 伏低龇牙
  const S_LUNGE = pose({ bx: 8, reach: 3, jaw: 3, pitch: 1, ear: 1, tail: -2, mane: -1, glow: 3 });
  const S_HOLD = pose({ bx: 8, reach: 2, jaw: 1, pitch: 1, ear: 1, tail: -1, glow: 2 });
  // 待机个性「低头嗅地」：[head, pitch, bx, ear, tail, crouch]，鼻子贴地前后嗅、耳朵一抽一抽、剑刃尾左右甩
  const SNIFF = [[2, -1, 0, 0, 1, 1], [3, -2, 0, 1, 2, 1], [3, -2, 1, 0, -2, 1], [3, -2, 0, 1, 2, 1], [3, -2, 1, 0, -2, 1], [3, -2, 0, 1, 1, 1], [2, -1, 0, 0, 0, 0]];
  const HORN_DROP = { at: 0.66, dur: 0.3, dx: 9, hop: 6 };                                         // 死亡：剑角断裂弹开

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.5 - 1e-6 && lp < 2.1 - 1e-6) { const s = SNIFF[Math.min(6, f12of(lp - 1.5))]; P.head = s[0]; P.pitch = s[1]; P.bx = s[2]; P.ear = s[3]; P.tail = s[4]; P.crouch = s[5]; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P);
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.crouch = 1; P.head += 1; const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; }   // 贴地小跑
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      if (tq > 0.45) P.glow = (f12 & 1) ? 2 : 1;                                                    // 眼光逐帧闪
      if (tq > 1.1) { P.bob = (f12 & 1) ? 1 : 0; P.tail = (f12 & 1) ? 2 : 1; }                       // 蓄满：伏低颤抖、甩尾
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) { E.mix(tmp, C_LOW, S_LUNGE, 0.5, F_ALL); apply(tmp); }
      else if (tq < 0.2) apply(S_LUNGE);
      else { apply(S_HOLD); P.jaw = (tq >= 0.2 && tq < 0.25) || (tq >= 0.3 && tq < 0.35) ? 2 : 1; }   // 狼影咬到时本体跟着咬合
      P.rim = 3;
    } else if (st === RECOVER) {                                                                     // 跳回：bx 8 → 0，离地一个弧
      const q = clamp01(tq / 0.4), e = ease.inOut(q);
      if (tq < 0.4) { apply(S_HOLD); P.bx = R(8 * (1 - e)); P.lift = R(Math.sin(Math.PI * q) * 4); P.jaw = 0; P.reach = q < 0.5 ? 1 : 0; P.pitch = q < 0.5 ? 1 : -1; P.tail = 1; P.glow = 2; }
      else { const q2 = ease.inOut(clamp01((tq - 0.4) / 0.25)); E.mix(tmp, pose({ crouch: 1, pitch: -1, glow: 1 }), REST, q2, F_ALL); apply(tmp); }
      P.rim = tq < 0.3 ? 2 : 1;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = 1; }
      else if (d < 0.5) { P.bx = -1; P.crouch = 3; P.pitch = -2; P.head = 2; P.eyes = 1; P.jaw = 1; P.tail = 1; P.reach = 2; }       // 踉跄前扑
      else {                                                                                        // 前扑在地、滑出 2 格
        P.lie = 1; P.head = 3; P.eyes = 1; P.jaw = 1; P.ear = 1;
        P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.bx = d < 0.66 ? 0 : d < 0.75 ? 1 : 2;
        P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0) { const t3 = B.dropAt(d, HORN_DROP); P.drop = t3[0]; P.dsx = t3[1]; P.dsy = t3[2]; }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：刃尾 bladeTail —— 细尾（走法同 quad.tail 'thin'，根部两格粗一点）+ 尾梢一片上翘的剑刃（根宽 c.w、长 c.len、可带 1 格护手），和尾同一个部件。
  //   c = { len, w 1–3, up 刃相对尾梢上翘角（弧度）, guard 0|1 }；材质 o.m.limb（尾）+ o.m.blade（刃）。返回刃尖 [x, y]
  function bladeTail(E, rig, P, o, c) {
    E.part();
    const mm = o.m, n = o.tailLen, sw = (P.tail | 0) * 0.2, lie = rig.lie;
    let x = rig.tail.x, y = rig.tail.y, a = lie === 2 ? -0.05 : o.tailA, lx = x, ly = y, la = a;
    for (let k = 0; k <= n; k++) {
      const q = k / n; U.disc(E, x, y, k < 2 ? 1 : 0.5, mm.limb, 0); lx = x; ly = y; la = a;
      a += (o.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35;
      x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
    const ba = la + c.up, dx = -Math.cos(ba), dy = -Math.sin(ba), nx = -dy, ny = dx, x0 = lx + dx, y0 = ly + dy;
    for (let s = 0; s <= c.len; s += 0.5) {
      const wk = Math.max(1, Math.ceil(c.w * (1 - s / (c.len + 0.5)))), cx = x0 + dx * s, cy = y0 + dy * s;
      for (let j = 0; j < wk; j++) { const off = j - (wk - 1) / 2; U.dot(E, cx + nx * off, cy + ny * off, mm.blade, s >= c.len - 0.5 ? 4 : 0); }
    }
    if (c.guard) { const g = c.w * 0.5 + 0.9; U.dot(E, lx + nx * g, ly + ny * g, mm.blade, 4); U.dot(E, lx - nx * g, ly - ny * g, mm.blade, 3); }
    return [x0 + dx * c.len, y0 + dy * c.len];
  }
  // 候选部件：额刃角 browBlade —— 头部局部坐标（u 沿吻部、v 往下）里的一条折线刃：前半 2 格粗、后半 1 格，刃尖 1 格高光；
  //   受光的上沿自动亮成刃口色。stub > 0 只画前 stub 格（断角）。join 1 = 并进前一个部件（头小时不在额头上压分界线），否则自己一个部件。返回 [根, 尖]（精灵本地坐标）
  function browBlade(E, F, pts, mat, stub, join) {
    if (!join) E.part();
    const W = pts.map(([u, v]) => F.at(u, v)); let L = 0; for (let i = 1; i < W.length; i++) L += Math.hypot(W[i][0] - W[i - 1][0], W[i][1] - W[i - 1][1]);
    const lim = stub || L; let acc = 0, tip = W[0];
    for (let i = 1; i < W.length && acc < lim; i++) {
      const a = W[i - 1], b = W[i], sl = Math.hypot(b[0] - a[0], b[1] - a[1]), e = Math.min(1, (lim - acc) / sl), bx = a[0] + (b[0] - a[0]) * e, by = a[1] + (b[1] - a[1]) * e;
      const half = acc + sl * e <= L * 0.5 ? 1 : acc >= L * 0.5 ? 0 : -1;
      if (half === 1) U.seg(E, a[0], a[1], bx, by, 2, mat, 0);
      else if (half === 0) U.seg(E, a[0], a[1], bx, by, 1, mat, 0);
      else { const f = (L * 0.5 - acc) / (sl * e), mx = a[0] + (bx - a[0]) * f, my = a[1] + (by - a[1]) * f; U.seg(E, a[0], a[1], mx, my, 2, mat, 0); U.seg(E, mx, my, bx, by, 1, mat, 0); }
      acc += sl * e; tip = [bx, by];
    }
    if (!stub) U.dot(E, tip[0], tip[1], mat, 4);
    return [W[0], tip];
  }
  function hornPts(F) { const u0 = F.W * 0.15; return [[u0, F.top(u0) - 0.3], [F.uT + 3, F.prof(F.uT)[0] - 3.4]]; }   // 额头 → 伸出吻尖 3 格
  let hornRoot = [0, 0];
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.legs(E, rig, P, o, 1);
    bladeTail(E, rig, P, o, TAILB);
    Q.ridge(E, rig, P, o);
    Q.body(E, rig, P, o);
    Q.legs(E, rig, P, o, 0);
    Q.head(E, rig, P, o);
    const F = Q.headFrame(rig, o), hp = hornPts(F);
    hornRoot = browBlade(E, F, hp, m.blade, P.drop ? 2 : 0, 1)[0];
    if (P.drop) {                                                                                     // 断下的剑角：飞出去翻一下，落地平躺
      E.part(); const x = R(hornRoot[0]) + 3 + P.dsx - (P.bx - 1), landed = P.drop === 2, y = landed ? 0 : R(hornRoot[1]) - P.dsy;
      if (landed) { for (let k = -3; k <= 3; k++) U.dot(E, x + k, y, m.blade, k === 3 ? 4 : 0); U.dot(E, x - 3, y - 1, m.blade, 0); }
      else if ((P.dsx >> 1) & 1) for (let k = -2; k <= 2; k++) U.dot(E, x + k, y + k, m.blade, k === 2 ? 4 : 0);
      else for (let k = -3; k <= 3; k++) U.dot(E, x + k, y - (k > 0 ? 1 : 0), m.blade, k === 3 ? 4 : 0);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 狼影（技能）：蓄力姿、扑咬姿各拷一份剪影 ─────
  const gCh = new Sprite(hero.w, hero.h, hero.ox, hero.oy), gLg = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  const GH = [{ sx: -7, sy: -4, ex: DUMMY_X - 17 - HX, ey: -12, t0: 0, t1: 0.2 }, { sx: -15, sy: 0, ex: DUMMY_X - 20 - HX, ey: -5, t0: 0.08, t1: 0.3 }];
  let ghostOK = 0, gMouth = [16, -8];
  function makeGhosts() {
    const keep = { rim: RIM.rim, flash: RIM.flash, dq: RIM.dq };
    poseAt(CHARGE, 1.0, 1.0); P.bx = 0; drawHero(); RIM.rim = 0; RIM.flash = 0; RIM.dq = 0; bake(hero, RIM); copySprite(gCh, hero);
    poseAt(CAST, 0.1, 0.1); gMouth = [R(rig.mouth[0]), R(rig.mouth[1])]; P.bx = 0; drawHero(); bake(hero, RIM); copySprite(gLg, hero);
    Object.assign(RIM, keep); hero.k1 = hero.k2 = -1; ghostOK = 1;
  }
  function ghostAt(g, tt) {                                                                          // 施放段内 tt 秒：狼影的位置（相对 HX / HY）
    const q = clamp01((tt - g.t0) / (g.t1 - g.t0)), e = ease.out(q);
    return [g.sx + (g.ex - g.sx) * e, g.sy + (g.ey - g.sy) * q - Math.sin(Math.PI * q) * 7, q];
  }

  // ───── 特效 ─────
  const T_CAST = [0.1, 0.2, 0.3], CRACK_Y = [HY - 8, HY - 21, HY - 14];
  const smT = [9, 9, 9, 9], smX = [0, 0, 0, 0], smY = [0, 0, 0, 0];                               // 咬合拖影：0 攻击，1–3 技能三口
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastTail = 0, flickT = 9, shardT = 9;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function bite(k, x, y) { smT[k] = 0; smX[k] = x; smY[k] = y; }
  function onEnter(s) {
    if (s === CHARGE) makeGhosts();
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 16, 40, 110, 0.25, 0.5, R_EL, 8); ring(gx - 4, gy + 2, 0, R_EL);
      for (let i = 0; i < 6; i++) spawn(K_DUST, scrX(-2) + (Math.random() - 0.5) * 10, HY, -10 - Math.random() * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust);
      shake(0.28, 2); flash(0.05);
    }
    if (s === RECOVER) for (const g of GH) { const p = ghostAt(g, DUR[CAST]), cx = HX + p[0] + 4, cy = HY + p[1] - 7; for (let i = 0; i < 12; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 18, cy + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, R_EL); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = mouthScr(); bite(0, gx, gy);
      burst(DUMMY_X - 3, gy, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(DUMMY_X - 3, gy, 4, 20, 50, 0.2, 0.4, R_EL, 4); hitDummy(0, 1);
      sfx('swing', { kind: 'bite', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.35 });
    }
    if (s === ATTACK && t === T_FLICK) { flickT = 0; }
    if (s === CAST) {
      const k = T_CAST.indexOf(t); if (k < 0) return;
      let bx, by;
      if (k === 0) [bx, by] = mouthScr();
      else { const p = ghostAt(GH[k - 1], t); bx = HX + R(p[0]) + gMouth[0]; by = HY + R(p[1]) + gMouth[1]; }
      bite(k + 1, bx, by);
      fx.crack(DUMMY_X - 5, CRACK_Y[k], 9, 1, R_EL, 0.95, 2);                                        // 一口一道紫色裂痕（叠一层破甲）
      burst(DUMMY_X - 2, CRACK_Y[k], 8, 30, 80, 0.15, 0.35, R_EL, 6); burst(DUMMY_X - 3, CRACK_Y[k], 5, 30, 70, 0.12, 0.3, FXI.impact, 6);
      sfx('impact', { pal: 'curse', w: 0.3 + 0.1 * k });
      if (k < 2) hitDummy(0, 1);
      else { hitDummy(1, 1); shardT = 0; ring(DUMMY_X, HY - 15, 1, R_EL); dummyFx({ dur: 1.4, tint: 'curse' }); shake(0.12, 1); }   // 叠满：碎盾冲击环
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 12 + Math.random() * 30, HY - 1, (Math.random() - 0.3) * 30, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === INCOMING + 0.75) for (let i = 0; i < 5; i++) spawn(K_DUST, HX + 14 + Math.random() * 6, HY - 1, 10 + Math.random() * 20, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);   // 滑行扬尘
    if (s === DEATH && t === T_HORN) { sfx('hit', { mat: 'metal', w: 0.2 }); for (let i = 0; i < 3; i++) spawn(K_DUST, HX + 22 + Math.random() * 6, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 5, 0.3, FXI.dust); }
  }
  const T_HORN = Math.ceil((INCOMING + HORN_DROP.at + HORN_DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT, T_FLICK], [], T_CAST, [], [INCOMING], [INCOMING + 0.66, INCOMING + 0.75, T_HORN], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {
      chargeAcc += dt * (16 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const a = Math.random() * 6.2832, r = 9 + Math.random() * 8;
        if (Math.random() < 0.6 && stT > 0.2) { const g = GH[Math.random() < 0.5 ? 0 : 1], tx = HX + g.sx + 3, ty = HY + g.sy - 8; spawnX(K_SPIRAL_PT, tx, ty, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 3, tx, ty }); }   // 狼影成形
        else spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3);
      }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                        // 轻、无声：每个接触帧 1 颗尘
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.2 }); }
      lastGf = P.gf;
    }
    if (state === IDLE && P.tail !== lastTail && Math.abs(P.tail) === 2 && P.head === 3) spawn(K_DUST, scrX(P.gx) + 1, HY, (Math.random() - 0.5) * 6, -3, 0.25, FXI.dust);   // 嗅地扬起一点土
    lastTail = P.tail;
    if (state === RECOVER && stT < 0.3 && P.glow > 0 && Math.random() < dt * 6) spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5, R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let k = 0; k < 4; k++) smT[k] += dt; flickT += dt; shardT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastTail = 0; flickT = 9; shardT = 9; for (let k = 0; k < 4; k++) smT[k] = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {                                                                              // 狼影：画在假人前、本体后
    if (!ghostOK) return; const st = E.state, t = E.stT;
    if (st === CHARGE && t >= 0.25) {
      const dq = 0.85 * (1 - clamp01((t - 0.25) / 0.9)), jit = t < 1.15 ? (((f12 >> 1) & 1) ? 1 : -1) : 0;
      blitShape(gCh, HX + GH[0].sx + jit, HY + GH[0].sy, 0, EL[3], dq); blitShape(gCh, HX + GH[1].sx - jit, HY + GH[1].sy, 0, EL[3], dq);
    } else if (st === CAST || (st === RECOVER && t < 0.3)) {
      const tt = st === CAST ? t : DUR[CAST] + t, dq = st === RECOVER ? clamp01(t / 0.3) : 0;
      for (const g of GH) {
        const p = ghostAt(g, tt);
        if (tt < g.t0) { blitShape(gCh, HX + g.sx, HY + g.sy, 0, EL[3], 0); continue; }
        if (p[2] < 1) { const pp = ghostAt(g, tt - 0.05); blitShape(gLg, HX + R(pp[0]), HY + R(pp[1]), 0, EL[4], 0.55); }   // 扑击拖影
        blitShape(gLg, HX + R(p[0]), HY + R(p[1]), 0, p[2] >= 1 && tt - g.t1 < 1 / 12 ? EL[2] : EL[3], dq);
      }
    }
  }
  function fxFront(f12) {
    for (let k = 0; k < 4; k++) if (smT[k] < 2 / 12) {                                              // 咬合拖影：上下两道短弧（第 1 帧亮、第 2 帧断续）
      const first = smT[k] < 1 / 12, x = smX[k], y = smY[k];
      for (let j = -3; j <= 3; j++) { if (!first && (j & 1)) continue; const dx = 2 + R(Math.abs(j) * 0.5); put(x + dx, y + j - (j < 0 ? 1 : 0), first ? EL[0] : EL[2]); if (first) put(x + dx + 1, y + j - (j < 0 ? 1 : 0), EL[1]); }
      if (first) put(x + 4, y, 21);
    }
    if (flickT < 2 / 12 && !P.lie) {                                                                // 剑角上挑：一道短弧
      const [gx, gy] = mouthScr(); fx.slash(gx - 2, gy - 1, 7, 2.1, 0.7, R_EL, 0.17, 2, 2); flickT = 9;
    }
    if (shardT < 0.36) {                                                                            // 碎盾冲击环：8 片短弧，隔一片错开往外崩
      const q = shardT / 0.36, r0 = 6 + q * 14, c = q < 0.25 ? EL[0] : q < 0.6 ? EL[1] : EL[2];
      for (let s = 0; s < 8; s++) { if (q > 0.6 && ((s + f12) & 1)) continue; const rr = r0 + (s & 1) * 2, a0 = s * 0.785 + 0.2; for (let j = 0; j < 3; j++) { const a = a0 + j * 0.16; put(R(DUMMY_X + Math.cos(a) * rr), R(HY - 15 + Math.sin(a) * rr * 1.15), j === 1 && q < 0.4 ? 21 : c); } }
    }
    if (E.state === CAST && P.glow >= 3 && !P.lie) {                                                // 眼光拖尾
      const ex = scrX(R(rig.eye[0]) + P.bx), ey = HY + R(rig.eye[1]); put(ex - 1, ey, EL[0]); put(ex - 2, ey, EL[1]); put(ex - 3, ey, EL[2]);
    }
  }

  return {
    name: '黑剑', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'curse', style: 'shadow', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
