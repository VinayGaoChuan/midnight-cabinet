// 棕熊 BrownBear（部队 · 不死 · 守护者 · 传说 · 近战 352）：食人魔披的熊皮长进了身体，变成了一头熊（由食人魔升级）。
// 巨熊：短粗腿、巨大肩峰、头放得低；背上麻绳绑着食人魔那口铁锅（更大了，锅盖就是那把平底锅），锅里一直冒绿色药汽；
// 肩峰上一片尸化脱毛露出 3 根白肋骨尖；下颚两颗外翻黄獠牙（食人魔的獠牙）；灰褐熊毛带霜斑（和食人魔的熊皮兜帽同一色阶）、侧腹一道缝合线；
// 空眼窝里是绿色魂火；前爪白色长爪。
// 攻击：扑抓（前半身压低 1 帧 → 前冲 5 格，近侧前掌高抬后向下斜抓，三道爪痕，落掌扬尘）。
// 技能：特性「共鸣」光环——人立，背锅咕嘟翻滚、绿汽螺旋绕身；仰天长吼、前掌落地，脚下铺开旋转的绿色法阵，冲击环扩到友军；
//       虚线连到每个友军：绿色描边、十字绿光上升（回血）、点阵护盾（防御提高）。死亡：前腿一软跪下 → 侧倒伸腿，背锅滚落翻倒洒一地绿汤，魂火熄灭。
PCD.define('BrownBear', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, allyPoints, allyFx } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：共鸣 · 苔绿药汤（nature：白 21 → 淡黄绿 38 → 37 → 36 → 深绿 35）；爪痕骨白、毛屑灰褐 ─────
  const R_EL = FXI.nature, EL = FXR[R_EL];
  const FUR = ['#1e1814', '#423830', '#6a5c4c', '#94846c'].map(E.color), SKIN = ['#1e1622', '#3e3046', '#62526a', '#8c7c92'].map(E.color);   // B.mats 只认下标，hex 先换成色板下标
  const R_CLAW = fxRamp('bearClaw', [21, 17, 6, 7, 8]), R_FUR = fxRamp('bearFur', [FUR[3], FUR[3], FUR[2], FUR[1], FUR[0]]);
  const m = B.mats(E, {
    main: FUR, muz: [FUR[0], FUR[2], FUR[3], 6], belly: [FUR[0], FUR[2], FUR[3], 6], claw: 'white', horn: 'bone', teeth: 'bone',
    eye: [0, 0, 36, 37], glow: [0, 37, 38, 21],
    frost: 'pale', skin: SKIN, rib: 'bone', iron: 'iron', lid: 'steel', wood: 'wood', rope: [20, 19, 61, 62],
    soup: [34, 36, 37, 38], steam: [0, 37, 38, 21],
  });
  const o = Q.shape({ len: 19, chest: 6.5, rump: 5, waist: 0.15, hump: 3, leg: 6, lw: 3, thigh: 3, stride: 2, lift: 2, farDx: -2,
    neck: 2, neckA: 0.12, neckW: 3.5, head: { type: 'bear', tusk: 2 }, headA: 0.22, tail: 'stub', foot: 'pad', mane: 'none', fur: 1, m });
  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 64, 48, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 13, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['glow', 'eye', 'ink', 'spec', 'claw', 'horn', 'teeth', 'rib', 'iron', 'lid', 'wood', 'rope', 'steam', 'soup']) if (m[k] != null) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['lid', 0, 1], ['soup', 0, 3], ['puff', 0, 1]]);
  const P = {}; Q.reset(P); P.lid = 0; P.soup = 0; P.puff = 0;
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_LOW = pose({ crouch: 1, pitch: -1, head: 1, ear: 1, bx: -1 });                 // 前半身压低
  const A_HIT = pose({ bx: 5, pitch: 1, paw: 3, reach: 2, jaw: 2, head: 0, ear: 1, tail: -1, mane: -1 });   // 前冲、近侧前掌高抬斜抓下来
  const A_LAND = pose({ bx: 5, crouch: 1, reach: 3, jaw: 1, head: 1, tail: -1 });        // 落掌
  const A_HOLD = pose({ bx: 4, reach: 2, head: 1, crouch: 1 });
  const ATK = [[0, REST], [1 / 12, A_LOW, 'snap'], [2 / 12, A_HIT, 'snap'], [3 / 12, A_LAND, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_REAR = pose({ pitch: 6, head: -2, paw: 2, jaw: 1, tail: 1, mane: 1, glow: 1 });   // 人立
  const S_ROAR = pose({ crouch: 2, head: -2, jaw: 3, reach: 1, glow: 3, mane: -1, tail: -1 });   // 前掌落地、仰天长吼
  const S_PROUD = pose({ head: -1, jaw: 1, crouch: 2, pitch: 1, glow: 2, tail: 1 });                     // 吼完：前半身还压着、慢慢抬回来
  const SNIFF = [[-1, 1, 0], [-1, 0, 1], [-1, 1, 0], [1, 0, 0], [0, 0, 0]];                 // 待机个性「嗅空气」：[head, jaw, ear]
  const T_HIT = 2 / 12, T_LANDPAW = 3 / 12, T_LINK = [0.1, 0.2], T_FALL = INCOMING + 0.66;
  const POT_DROP = { at: 0.5, dur: 0.33, dx: -13, hop: 4 };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = SNIFF[k]; P.head = s[0]; P.jaw = s[1]; P.ear = s[2]; P.puff = k <= 2 ? 1 : 0; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); P.lid = 0; P.soup = 0; P.puff = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { const f = Q.anim.walk(P, tq); P.lid = f & 1 ? 0 : 1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 熊步：接触帧锅盖咔哒颠一下
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_REAR, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_REAR);
      P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.35 ? 1 : 2;
      if (tq >= 0.5) { P.lid = (f12 >> 1) & 1; P.mane = (f12 & 1) ? 1 : 0; }                // 锅里咕嘟翻滚，锅盖一跳一跳
    } else if (st === CAST) {
      if (tq < 0.34) apply(S_ROAR); else { E.mix(tmp, S_ROAR, S_PROUD, ease.out(clamp01((tq - 0.34) / 0.15)), F_ALL); apply(tmp); }
      P.rim = tq < 0.25 ? 3 : 2; P.lid = tq < 0.17 ? 1 : 0;
    } else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_PROUD, REST, q, F_ALL); apply(tmp); P.glow = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.lid = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, POT_DROP);                                                    // 前腿一软 → 侧倒伸腿；背锅滚落（掉落物钩子写 P.drop / dsx / dsy）
        P.eyes = d >= 1.0 ? 1 : 0; P.glow = d < 0.3 ? ((f12 & 1) ? 2 : 0) : d < 1.0 ? ((f12 % 3) === 0 ? 2 : 0) : 0;   // 魂火眼闪几下熄灭
        P.soup = P.drop === 2 ? (d < 0.95 ? 1 : d < 1.1 ? 2 : 3) : 0;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const g = potMouth(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  // 背锅的位置：沿背线 38% 处（臀 → 胸），锅底坐在背上
  function potBase() { const C1 = rig.C1, C2 = rig.C2, x = R(C2.x + (C1.x - C2.x) * 0.38), s = Q.span(rig, o, x); return [x, s ? s[0] + 1 : R(C2.y - C2.r)]; }
  function potMouth() { if (P.drop) return [potBase()[0] + P.dsx - 2, -3 - P.dsy]; const b = potBase(); return [b[0], b[1] - 8]; }

  // ───── 本角色的部件 ─────
  // 候选部件：背锅（大）backPot —— 12 宽 7 高的铁锅：锅沿、沿下阴影、鼓腹、锅耳、一道麻绳；锅盖 = 平底锅倒扣（木柄朝前伸出）；锅口一缕绿汽
  //   (cx, by) 锅底中心；lid 1 = 锅盖跳起 1 格；T 落笔变换（掉在地上时 r0 转 90°，锅口朝后淌汤）
  function drawPot(T, cx, by, lid, sw, onBody) {
    E.part();
    const top = by - 6, rows = [[-6, 5], [-5, 4], [-6, 5], [-6, 5], [-6, 5], [-5, 4], [-4, 3]];
    for (let j = 0; j < rows.length; j++) for (let x = cx + rows[j][0]; x <= cx + rows[j][1]; x++) pxT(T, x, top + j, m.iron, 0);
    for (let x = cx - 5; x <= cx + 4; x++) { pxT(T, x, top, m.iron, 4); pxT(T, x, top + 1, m.iron, 2); }
    pxT(T, cx - 7, top + 2, m.iron, 0); pxT(T, cx - 7, top + 3, m.iron, 2); pxT(T, cx + 6, top + 2, m.iron, 0);   // 锅耳
    for (let x = cx - 6; x <= cx + 5; x++) pxT(T, x, top + 3, m.rope, x === cx - 3 ? 4 : x === cx + 2 ? 2 : 0);   // 麻绳
    pxT(T, cx - 4, top + 2, m.iron, 4); pxT(T, cx - 5, top + 4, m.iron, 4);
    E.part();                                                        // 锅盖 = 倒扣的平底锅（木柄朝前）
    const ly = top - 1 - lid;
    for (let x = cx - 4; x <= cx + 3; x++) pxT(T, x, ly, m.lid, x === cx - 4 ? 4 : 0);
    for (let x = cx - 2; x <= cx + 1; x++) pxT(T, x, ly - 1, m.lid, x === cx - 2 ? 4 : 0);
    for (let x = cx + 4; x <= cx + 6; x++) pxT(T, x, ly, m.wood, x === cx + 6 ? 2 : 0);
    if (!onBody) return;
    E.part();                                                        // 锅口冒出的绿汽（高出肩峰 4 格，尖端随鬃摆）
    const s0 = sw > 0 ? 1 : sw < 0 ? -1 : 0;
    pxT(T, cx - 5, ly, m.steam, 2); pxT(T, cx - 6, ly - 1, m.steam, 3); pxT(T, cx - 5 + s0, ly - 2, m.steam, 3); pxT(T, cx - 4 + s0, ly - 3, m.steam, 2); pxT(T, cx - 4, ly - 4, m.steam, 2);
  }
  function pxT(T, x, y, mt, t) { if (!T) { U.dot(E, x, y, mt, t); return; } E.parts.px(E, T, x, y, mt, t); }
  // 候选部件：肋骨尖 ribTips —— 肩峰上一片尸化脱毛（尸肤，和躯干同一个部件画）+ 3 根白肋骨尖伸出背线 2 格（单独部件，间距 4 格，剪影里看得出三根）
  function ribs() {
    const C1 = rig.C1, C2 = rig.C2;
    E.part();
    for (let k = 0; k < 3; k++) {
      const x = R(C2.x + (C1.x - C2.x) * 0.66) + k * 4, s = Q.span(rig, o, x); if (!s) continue;
      U.dot(E, x, s[0] - 1, m.rib, 3); U.dot(E, x - 1, s[0] - 2, m.rib, 4); U.dot(E, x, s[0], m.rib, 2);
    }
  }
  function bodyMarks() {                                             // 紧跟 Q.body（同一个部件）：肩峰脱毛露尸肤、霜斑、侧腹缝合线
    const C1 = rig.C1, C2 = rig.C2, dx = C1.x - C2.x;
    for (let x = R(C2.x + dx * 0.62); x <= R(C2.x + dx * 0.62) + 10; x++) { const s = Q.span(rig, o, x); if (!s) continue; for (let y = s[0]; y <= s[0] + 1; y++) U.dot(E, x, y, m.skin, y === s[0] ? 0 : 2); }
    for (let x = R(C2.x - C2.r + 1); x <= R(C1.x + 2); x++) { const s = Q.span(rig, o, x); if (!s) continue; for (let y = s[0] + 1; y < s[1] - 2; y++) if (U.hash(x * 3 + 7, y * 5 + 11) < 0.045 && y < s[0] + 5) U.dot(E, x, y, m.frost, 3); }
    const sx = R(C2.x + dx * 0.74), s = Q.span(rig, o, sx);                                      // 侧腹一道缝合线：斜的深色缝 + 每 2 行一对浅色针脚（梯形针脚，不画成锯齿）
    if (s && !rig.lie) for (let y = s[0] + 4, k = 0; y <= s[1] - 2; y++, k++) { const x = sx - (k >> 1); U.dot(E, x, y, m.body, 1); if (!(k & 1)) { U.dot(E, x - 1, y, m.body, 4); U.dot(E, x + 1, y, m.body, 4); } }
  }
  function potRopes() {                                              // 两道麻绳从锅耳绕过肚子（和躯干同一个部件：不压分界线，身上不会出现一圈圈深色格子）
    const b = potBase();
    for (const rx of [b[0] - 5, b[0] + 4]) { const s = Q.span(rig, o, rx); if (s) for (let y = b[1] + 1; y <= s[1] - 1; y++) U.dot(E, rx, y, m.rope, (y & 1) ? 3 : 2); }
  }
  function legs(far) {                                               // 腿：quad.leg 之后紧跟着画白色长爪（前爪多伸 1 格）
    for (let i = 0; i < 4; i++) {
      const L = rig.legs[i]; if (!!L.far !== !!far) continue;
      Q.leg(E, rig, P, o, i);
      if (L.front && !rig.lie) { const fx = R(L.F[0]), fy = R(L.F[1]), w = o.lw + 2; U.dot(E, fx + w + 1, fy, m.claw, 3); U.dot(E, fx + w, fy - 1, m.claw, 4); }
    }
  }

  // ───── 画 ─────
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    if (!legsLast) legs(1);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); bodyMarks(); if (!P.drop) potRopes();
    if (!legsLast) legs(0);
    ribs();
    if (!P.drop) { const b = potBase(); drawPot(null, b[0], b[1], P.lid, P.mane, 1); }
    Q.head(E, rig, P, o);
    Q.horn(E, rig, P, o);                                            // 下颚两颗外翻黄獠牙（食人魔的獠牙）
    if (legsLast) { legs(1); legs(0); }
    if (P.drop) potDropped();
  }
  function potDropped() {                                            // 滚落的锅：飞行中立着，落地后侧翻，锅口朝后淌出一滩绿汤
    const b = potBase(), x = b[0] + P.dsx;
    if (P.drop === 1) { drawPot(null, x, -P.dsy, 0, 0, 0); return; }
    if (P.soup) { E.part(); const w = 6 + [0, 3, 6, 9][P.soup]; for (let k = -w; k <= w; k++) { U.dot(E, x + k, 0, m.soup, (k & 3) === 1 ? 4 : 0); if (Math.abs(k) < w - 2 && Math.abs(k) > 5) U.dot(E, x + k, -1, m.soup, 3); } }
    drawPot({ r0: 2, tx: x, ty: -7, rot: 0, ox: 0, oy: 0 }, 0, 0, 0, 0, 0);   // 倒扣在地上（锅盖平底锅压在下面，只露木柄）
  }
  function bakeHero() { RIM.rim = P.rim; const g = potMouth(); RIM.rx = R(g[0]) + P.bx + hero.ox; RIM.ry = R(g[1]) + 4 + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, steamAcc = 0, soulAcc = 0, healAcc = 0, lastGf = -9, lastPuff = 0, waveT = 9, crossT = [9, 9];
  const gem = () => [scrX(P.gx), HY + P.gy];
  const bodyC = () => [scrX(rig.C1.x * 0.3 + P.bx), HY + R(rig.C1.y) - 2];
  function onEnter(s) {
    if (s !== CAST) return;                                          // 前掌落地：旋转绿色法阵铺开，冲击环扩到友军
    poseAt(CAST, 0, E.simT); const [gx, gy] = gem();
    releaseOrbit(30, 80, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 20, 40, 100, 0.25, 0.55, R_EL, 10);
    fx.circle(HX - 8, FLOOR, 30, 4, R_EL, 1.6, 1, 0); ring(scrX(10), HY - 2, 1, R_EL); waveT = 0;
    for (const fx0 of [12, 16]) for (let i = 0; i < 5; i++) spawn(K_DUST, scrX(fx0) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 36, -5 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_HIT) < 1e-9) {               // 斜抓：三道爪痕 + 命中
      const cx = DUMMY_X - 11, cy = HY - 20;
      for (let k = 0; k < 3; k++) fx.slash(cx + k * 2 - 2, cy + k, 10, 0.55, 2.45, R_CLAW, 0.2, 2, 2);
      burst(DUMMY_X - 4, HY - 12, 12, 40, 110, 0.15, 0.4, FXI.impact, 10); hitDummy(0);
      sfx('swing', { kind: 'claw', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === ATTACK && Math.abs(t - T_LANDPAW) < 1e-9) for (let i = 0; i < 6; i++) spawn(K_DUST, scrX(20) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 30, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust);
    for (let k = 0; k < 2; k++) if (s === CAST && Math.abs(t - T_LINK[k]) < 1e-9) {   // 共鸣：虚线连到友军 → 绿描边 + 十字绿光 + 点阵护盾
      const a = allyPoints()[k], [gx, gy] = gem();
      fx.link(gx, gy, a.x, a.mid - 4, R_EL, 1.0, 1); fx.dome(a.x, HY, 8, 15, R_EL, 1.0, 2); ring(a.x, a.mid, 0, R_EL); crossT[k] = 0;
      if (k === 0) allyFx({ dur: 1.4, outline: R_EL });
      shake(0.12, 1); sfx('impact', { pal: 'nature', w: k ? 0.6 : 0.8 });
    }
    if (s === HURT && Math.abs(t - INCOMING) < 1e-9) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && Math.abs(t - T_FALL) < 1e-9) {
      for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.9 });
    }
    if (s === DEATH && Math.abs(t - T_POT) < 1e-9) { const x = scrX(potBase()[0] + P.dsx); burst(x, HY - 3, 8, 30, 70, 0.3, 0.6, R_EL, 10); sfx('hit', { mat: 'metal', w: 0.4 }); }   // 锅翻倒：绿汤溅出
  }
  const T_POT = Math.ceil((INCOMING + POT_DROP.at + POT_DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT, T_LANDPAW], [], T_LINK.slice(), [], [INCOMING], [T_FALL, T_POT], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = gem();
    if (state === CHARGE) {                                          // 绿汽从锅口螺旋上升、绕身体一圈
      const [bx, by] = bodyC();
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const a = Math.random() * 6.2832, r = 16 + Math.random() * 6;
        spawnX(K_SPIRAL_PT, bx, by, r / (0.5 + Math.random() * 0.3), 0, 1.2, R_EL, { a, r, w: 5 + Math.random() * 2, tx: bx, ty: by, orbitR: 12 + Math.random() * 3, orbitW: 5.5, squash: 0.45 });
        spawn(K_EMBER, gx + (Math.random() - 0.5) * 6, gy, (Math.random() - 0.5) * 8, -16 - Math.random() * 12, 0.5 + Math.random() * 0.4, R_EL);
      }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 11 : -6) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.85 }); }
      lastGf = P.gf;
    }
    if (P.puff && !lastPuff) for (let i = 0; i < 8; i++) spawn(K_RISE, gx + (Math.random() - 0.5) * 8, gy - 1, (Math.random() - 0.5) * 10, -10 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL);   // 嗅空气：锅冒一团汽
    lastPuff = P.puff;
    if (!P.drop && P.dq < 1 && state !== CHARGE) { steamAcc += dt * (state === RECOVER ? 8 : 2.5); while (steamAcc >= 1) { steamAcc -= 1; spawn(K_RISE, gx - 4 + (Math.random() - 0.5) * 4, gy + 1, (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.7 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && P.soup >= 1 && stT < INCOMING + 1.6) { steamAcc += dt * 2; while (steamAcc >= 1) { steamAcc -= 1; spawn(K_RISE, scrX(potBase()[0] + P.dsx - 8), HY - 2, (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.8, R_EL); } }   // 最后一缕汽
    for (let k = 0; k < 2; k++) if (crossT[k] < 0.8) {                // 友军头顶十字绿光上升（回血）
      healAcc += dt * 5; while (healAcc >= 1) { healAcc -= 1; const a = allyPoints()[k], x = a.x + R((Math.random() - 0.5) * 8), y = a.top - 2 - R(Math.random() * 4);
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawnX(K_PHYS, x + dx, y + dy, 0, -14, 0.7, R_EL, { g: 0 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 32; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 36, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    waveT += dt; crossT[0] += dt; crossT[1] += dt;
  }
  function fxReset() { chargeAcc = 0; steamAcc = 0; soulAcc = 0; healAcc = 0; lastGf = -9; lastPuff = 0; waveT = 9; crossT[0] = crossT[1] = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(6 + P.bx), P.rim, EL, f12);
    if (waveT < 0.4) {                                               // 冲击环贴地向外扩到友军站位
      const q = waveT / 0.4, rx = 6 + 44 * ease.out(q), ry = 1 + 3 * q, cx = HX - 4, n = Math.ceil(rx * 3.2), c = q < 0.3 ? EL[0] : q < 0.6 ? EL[1] : EL[2];
      for (let k = 0; k < n; k++) { if (q > 0.5 && ((k + f12) & 1)) continue; const a = k / n * 6.2832; put(R(cx + Math.cos(a) * rx), R(FLOOR + Math.sin(a) * ry), c); }
    }
  }
  function fxFront(f12) {
    if (E.state === CHARGE && P.glow >= 2 && !P.lie) { const [ex, ey] = [scrX(R(rig.eye[0]) + P.bx), HY + R(rig.eye[1])]; put(ex + 1, ey, EL[1]); put(ex + 2, ey, EL[2]); }   // 魂火眼亮到 2 档：拖出一道绿光
  }

  return {
    name: '棕熊', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.steam], HIT_POINT, EVENTS,
    ALLIES: 'skill', ALLY_X: [HX - 27, HX - 41],
    SFX: { body: 'beast', how: 'topple', pal: 'nature', style: 'heal', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
