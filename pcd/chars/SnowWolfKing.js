// 雪狼王（部队 · 恶魔 · 先锋（擅长防御）· 神话 · 近战 408；白狼的最终升级）：白狼长大成的巨型王狼，纯白长毛、胸厚肩宽、昂首站立。
//   白狼的冰晶小角长成 5 支冰棱王冠，肩胛冰棱扩成一整排从后颈排到臀的冰川脊，同款卷背巨尾更大、尾尖冻成一簇冰棱；
//   冰冠垂下一道冰晶面纱（细冰链）挡在额前，随步伐摆；身周常驻 4 颗慢飘的雪花。
// 攻击「砸」：抬起近侧前爪猛按下去，爪下冒出一丛冰锥，冰浪沿地面冲到目标脚下再冒两根。
// 技能「冰冻面纱」（被动光环：周围敌人攻速降低 3%、每秒受到技能伤害）：仰天长嚎，雪暴粒子逆时针绕身螺旋上升，冰冠逐支点亮；
//   施放时从天降下一道冰晶帘幕——10 根冰棱斜落覆盖到假人，加一圈大冰环；假人整只冻结（填色 + 霜边 + 眩晕），脚下冒出 3 根冰锥，冰屑外爆。
// 受击顺带表现「敏捷之足」（闪避 +25%）：原位留下一道冰青残影（和白狼同一个个体的招牌动作）。
// 死亡：冻结碎裂——先整只冻成冰雕（全身换成冰青单色定格），裂纹从中间劈开，再碎成冰块落地（死亡套件 chunks，chunk 5）。
// 身体用 parts-beast 的 quad 拼（canine 放大、ruff 大颈圈毛）；卷背巨尾、冰川脊、冰棱王冠、冰晶面纱、冰雕染色、冰锥 / 冰棱帘幕是本模块的候选部件。
PCD.define('SnowWolfKing', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, PAL,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, copySprite, blitShape, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('snow', ['#ffffff', '#eef4ff', '#bcd0ea', '#7a8cae', '#3a4462']), EL = FXR[R_EL];   // 雪 · 冰灰蓝（同升级线）
  const R_FR = FXI.frost, FR = FXR[R_FR];                                                              // 冰晶青蓝
  const R_FUR = fxRamp('snowKingFur', [21, 17, 18, 59, 8]);                                            // 受击白毛屑
  const MANE = [7, 17, 21, 21];                                                                        // 大颈圈毛 / 巨尾：比身体亮一级
  const m = B.mats(E, {
    main: 'white', mane: MANE, muz: MANE, belly: MANE,                                                // 纯白长毛（white）
    crown: [39, 23, 22, 21], veil: 'sky', mark: [39, 40, 22, 21], eye: [0, 0, 22, 22], glow: [22, 22, 21, 21], teeth: 'white',
  });
  m.body = E.defMat(E.RAMP.white, 2);                                                                  // 大面积白毛：band 2
  m.tail = E.defMat(MANE, 2);
  m.crownFar = E.defMat([39, 40, 23, 22], 1);                                                          // 远侧冰川脊暗一级
  const HEAD = { type: 'canine', w: 7.5, h: 6, snout: 5, snH: 3.6, tip: 0.6, earH: 3.5 };
  const SHAPE = { len: 16, chest: 6.5, rump: 5, waist: 0.35, hump: 1.5, leg: 9, lw: 3, thigh: 3, farDx: -2, stride: 3, lift: 3,
    neck: 6, neckA: 1.2, neckW: 3.4, head: HEAD, headA: 0.2, tail: 'none', mane: 'ruff', maneLen: 3, foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);
  const TW = 7.4;                                                                                      // 巨尾粗（直径）

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(112, 66, 54, 62);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 21], rimRamp: FR, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'mark', 'ink', 'teeth', 'spec', 'veil']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['tp', 0, 1], ['crown', 0, 5], ['frz', 0, 2]]);                 // tp 尾姿 · crown 点亮几支 · frz 冰雕
  const P = {};
  function reset() { Q.reset(P); P.tp = 0; P.crown = 0; P.frz = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'paw', 'glow', 'tp'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, paw: 0, glow: 0, tp: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 3 / 12;
  // 攻击逐帧：抬起近侧前爪 → 高举蓄势 → 猛按下去（出手 = 接触）→ 压住 → 收
  const ATK = [REST,
    pose({ pitch: 2, paw: 2, head: -1, ear: 1, mane: 1 }),
    pose({ pitch: 3, paw: 3, head: -1, ear: 1, mane: 1, tail: 1, glow: 1 }),
    pose({ pitch: -1, paw: 0, reach: 3, crouch: 1, bx: 3, head: 1, jaw: 2, mane: -1, tail: -1, glow: 1 }),
    pose({ pitch: -1, reach: 3, crouch: 1, bx: 3, head: 1, jaw: 1, mane: -1 }),
    pose({ reach: 2, crouch: 1, bx: 2, head: 1 }),
    pose({ reach: 1, bx: 1, tail: 1 }), pose({ tail: 0 }), REST];
  const HOWL = pose({ pitch: 2, head: -2, jaw: 3, ear: 1, mane: -1, glow: 1, tail: 1 });              // 仰天长嚎
  const S_UP = pose({ pitch: 1, head: -2, jaw: 2, mane: 1, glow: 3, tp: 1, tail: 2 });                  // 帘幕落下：挺身、巨尾高举
  const S_HOLD = pose({ head: -1, jaw: 1, glow: 2, tail: 1 });
  const T_LOOK = 1.4;                                                                                  // 待机个性：昂首缓缓环顾
  const LOOK = [[-1, 0], [-2, 0], [-2, 1], [-2, 1], [-1, 1], [-1, 0], [-2, 0], [-2, 0], [-1, 0]];      // [head, ear] 逐帧
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= T_LOOK - 1e-6 && lp < T_LOOK + 0.75 - 1e-6) { const s = LOOK[Math.min(LOOK.length - 1, f12of(lp - T_LOOK))]; P.head = s[0]; P.ear = s[1]; P.jaw = s[0] === -2 ? 1 : 0; }
    else P.head = -1;                                                                                   // 平时也昂着头
  }
  const T_FREEZE = 0.45, T_CRACK = 0.8, T_BREAK = Math.ceil((INCOMING + 1.0) * 12 - 1e-6) / 12, T_LAND = Math.ceil((INCOMING + 1.3) * 12 - 1e-6) / 12;
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.head = -1; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 庄重踱步：昂头不点头，接触帧身体顿 1 格
    else if (st === ATTACK) { apply(ATK[Math.min(ATK.length - 1, f12of(tq))]); P.rim = tq >= 2 / 12 && tq < 5 / 12 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.5) { E.mix(tmp, REST, HOWL, ease.inOut(tq / 0.5), F_ALL); apply(tmp); } else apply(HOWL);
      if (tq > 0.9) P.mane = (f12 & 1) ? 1 : -1;                                                        // 风雪卷起：毛领、面纱抖
      P.crown = Math.min(5, f12of(Math.max(0, tq - 0.2) / 0.22 / 12) );
      P.glow = tq > 1.0 ? 2 : 1; P.rim = tq < 0.5 ? 1 : tq < 1.0 ? 2 : 3;
    } else if (st === CAST) {
      apply(tq < 2 / 12 ? S_UP : S_HOLD); P.crown = 5; P.rim = tq < 3 / 12 ? 3 : 2;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_HOLD, REST, q, F_ALL); apply(tmp); P.head = Math.min(P.head, -1);
      P.crown = R(5 * (1 - q)); P.glow = q < 0.35 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < T_FREEZE) {                                                                          // 受击踉跄，前腿一软
        P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.mane = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.2 ? 1 : 2; P.pitch = d < 0.2 ? 0 : -1; P.head = d < 0.2 ? -1 : 1;
      } else {                                                                                          // 冻成冰雕定格
        P.bx = -2; P.eyes = 1; P.ear = 1; P.crouch = 2; P.pitch = -1; P.head = 1; P.tail = 1; P.frz = d < T_CRACK ? 1 : 2;
      }
      if (t >= T_BREAK - 1e-6) P.dq = 1;                                                                // 碎成冰块之后由死亡套件画
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    const c = crownBase(rig); P.gx = R(c[0]) + P.bx; P.gy = R(c[1]) - 3;                              // 发光体 / 轮廓光源：冰冠中央
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 尾姿：[起始角（从正后方量，+ 往上）, 总卷曲角, 节数]。0 卷过背 · 1 高举
  const TAILS = [[1.0, 2.0, 14], [1.35, 0.8, 14]];
  const TP_X = new Float32Array(16), TP_Y = new Float32Array(16), TP_R = new Float32Array(16);
  // 候选部件：卷背巨尾 curlTail（同白狼，放大）——一串由细到粗再收尖的圆，内侧每 3 节一道暗毛纹
  function tailPts(rg, tp, sway) {
    const T = TAILS[tp], n = T[2]; let x = rg.tail.x + 0.5, y = rg.tail.y, a = T[0];
    for (let k = 0; k <= n; k++) {
      const q = k / n; TP_X[k] = x; TP_Y[k] = y; TP_R[k] = TW * 0.5 * (0.5 + 0.62 * Math.sin(PI * (0.08 + 0.8 * q)));
      a += T[1] * (0.4 + 1.2 * q) / n + sway * 0.05 * q;
      x -= Math.cos(a) * 1.15; y -= Math.sin(a) * 1.15; if (y > -0.5) y = -0.5;
    }
    return n;
  }
  function curlTail(rg) {
    E.part(); const n = tailPts(rg, P.tp | 0, P.tail | 0);
    for (let k = 0; k <= n; k++) U.disc(E, TP_X[k], TP_Y[k], TP_R[k], m.tail, 0);
    for (let k = 2; k < n - 1; k += 3) U.dot(E, TP_X[k] + 0.5, TP_Y[k] + TP_R[k] * 0.4, m.tail, 2);
    for (let k = 3; k < n - 2; k += 3) U.dot(E, TP_X[k] - 0.5, TP_Y[k] - TP_R[k] * 0.5, m.tail, 4);
    // 候选部件：冰棱尾尖 icicleTuft —— 尾尖冻成一簇 3 根往下垂的冰棱（单独一个部件，压在尾尖上）
    E.part(); const x = R(TP_X[n]), y = R(TP_Y[n]);
    for (const [dx, L] of [[-1, 3], [0, 5], [1, 3]]) for (let k = 0; k < L; k++) U.dot(E, x + dx, y + k, m.crown, k === L - 1 ? 4 : k === 0 ? 2 : 0);
  }
  // 候选部件：冰川脊 glacierRidge —— 从后颈沿背线一直排到臀的一排冰棱（一个部件，画在躯干前只露出背线以上）；肩上最高、往臀递减
  function ridge(rg, mat) {
    E.part(); const x0 = R(rg.C2.x - rg.C2.r * 0.4), x1 = R(rg.NB.x + 1);
    for (let x = x0, k = 0; x <= x1; x += 2, k++) {
      const s = Q.span(rg, o, x); if (!s) continue; const q = (x - x0) / Math.max(1, x1 - x0);
      const L = 2 + R(3 * Math.sin(PI * clamp01(q * 1.15)) ) + (k & 1), top = R(s[0]) + 1;
      for (let j = 0; j < L; j++) { const px = x - R(j * 0.4); U.dot(E, px, top - j, mat, j === L - 1 ? 4 : 0); if (j < L - 2) U.dot(E, px + 1, top - j, mat, 0); }
    }
  }
  // 近侧肩上的大冰棱丛（白狼肩棱的长大版，冰川脊在肩上最高的一段）
  function shoulder(rg) { const x = rg.C1.x - 3, s = Q.span(rg, o, R(x)); return [x, s ? s[0] + 1 : rg.C1.y - rg.C1.r]; }
  const SHARDS = [[-3, 3, -0.5], [-1, 5, -0.3], [1, 4, -0.1]];
  function iceShards(x, y, spec, mat) {
    E.part();
    for (const [dx, L, s] of spec) for (let k = 0; k < L; k++) { const px = R(x + dx + s * k), py = y - k; U.dot(E, px, py, mat, k === L - 1 ? 4 : 0); if (k < L - 1) U.dot(E, px + 1, py, mat, k === 0 ? 2 : 0); }
  }
  // 冰冠的根：头顶（颅部上沿）
  function crownBase(rg) { const F = Q.headFrame(rg, o, 0); return F.at(-F.W * 0.1, F.top(-F.W * 0.1)); }
  // 候选部件：冰晶面纱 iceVeil + 额心晶斑（紧跟 quad.head 画，和脸同一个部件，免得分界线把脸压黑）：
  //   3 条细冰链从冠沿垂到眼前，逐格亮暗交替，末端随 P.mane 摆；额心一枚菱形晶斑
  function headVeil(rg) {
    const F = Q.headFrame(rg, o, P.jaw), sw = P.mane | 0;
    const us = [F.W * 0.35, F.W * 0.7, F.W * 1.05], lens = [3, 4, 3];
    for (let i = 0; i < 3; i++) {
      const u = us[i], v0 = F.top(u) + 0.6, L = lens[i];
      for (let k = 0; k < L; k++) { const p = F.at(u, v0 + k), dx = k === L - 1 ? -sw : 0; U.dot(E, R(p[0]) + dx, R(p[1]), m.veil, (k & 1) ? 2 : 4); }
    }
    const c = F.at(-F.W * 0.1, -F.Hh * 0.55), cx = R(c[0]), cy = R(c[1]), lv = P.frz ? 2 : P.glow >= 2 ? 4 : 3;
    U.dot(E, cx, cy, m.mark, lv); U.dot(E, cx, cy + 1, m.mark, 2);
  }
  // 候选部件：冰棱王冠 iceCrown —— 5 支冰棱沿头顶排开、中间最高（高出头顶 7 格）、微往后倒；lit 支数从后往前点亮（换发光材质）
  const CROWN = [[-1.0, 3], [-0.5, 5], [0, 7], [0.5, 5], [0.95, 3]];
  function iceCrown(rg, lit) {
    E.part(); const F = Q.headFrame(rg, o, 0);
    for (let i = 0; i < 5; i++) {
      const u = CROWN[i][0] * F.W, L = CROWN[i][1], b = F.at(u, F.top(u) + 0.8), bx = R(b[0]), by = R(b[1]), on = i < lit;
      for (let k = 0; k < L; k++) {
        const px = bx - R(k * 0.2), py = by - k, tip = k === L - 1;
        U.dot(E, px, py, on && k >= L - 3 ? m.glow : m.crown, tip ? 4 : k === 0 ? 2 : 3);
        if (k < 2 && L > 3) U.dot(E, px + 1, py, m.crown, 2);
      }
    }
  }
  // 候选部件：雪毛围兜 chestBib（同白狼，放大）：颈圈毛垂到胸前，下沿参差
  function chestBib(rg) {
    const C1 = rg.C1;
    for (let i = 0; i < 5; i++) { const x = R(C1.x + 2 + i), y1 = R(C1.y + 2 + ((i & 1) ? 0 : 1) + (i < 3 ? 1 : 0)); for (let y = R(C1.y - 3); y <= y1; y++) U.dot(E, x, y, m.mane, y === y1 ? 2 : 0); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const sb = shoulder(rig);
    Q.legs(E, rig, P, o, 1);
    curlTail(rig);
    ridge(rig, m.crownFar);                                                                             // 冰川脊（只露出背线以上）
    Q.body(E, rig, P, o);
    Q.legs(E, rig, P, o, 0);
    iceShards(R(sb[0]), R(sb[1]), SHARDS, m.crown);
    Q.mane(E, rig, P, o); chestBib(rig);
    Q.head(E, rig, P, o); headVeil(rig);
    iceCrown(rig, P.crown | 0);
  }
  // 候选部件：冰雕染色 freezeTint —— 烘焙后按亮度把整只精灵换成冰青单色（frz 2 再从中间劈一道裂纹）
  const LUM = new Float32Array(256); let lumN = 0;
  const ICE = [39, 40, 23, 22, 21];
  function lumOf(i) { if (i >= lumN) { for (let k = lumN; k < PAL.length; k++) { const n = parseInt(PAL[k].slice(1), 16); LUM[k] = 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); } lumN = PAL.length; } return LUM[i]; }
  function freezeTint(lv) {
    const s = hero, w = s.w, out = s.out;
    for (let i = 0; i < out.length; i++) { const c = out[i]; if (c === 255) continue; const L = lumOf(c); out[i] = ICE[L < 40 ? 0 : L < 140 ? 1 : L < 200 ? 2 : L < 252 ? 3 : 4]; }
    if (lv < 2) return;
    let x = R(rig.C1.x - o.len * 0.45) + s.ox + P.bx;                                                   // 裂纹：从背上往下折线劈开
    for (let y = 0; y < s.h; y++) {
      if (y % 3 === 0) x += (y / 3) & 1 ? 1 : -1;
      const i = y * w + x; if (out[i] === 255) continue; out[i] = 0; if (out[i + 1] !== 255) out[i + 1] = 21;
    }
  }
  function bakeHero() {
    RIM.rim = P.frz ? 0 : P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.frz) freezeTint(P.frz);
  }

  // ───── 残影（敏捷之足：受击时原位留下一道冰青剪影）─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  function makeGhost() {
    const keep = { rim: RIM.rim, flash: RIM.flash, dq: RIM.dq };
    poseAt(IDLE, 0, 0); drawHero(); RIM.rim = 0; RIM.flash = 0; RIM.dq = 0; bake(hero, RIM); copySprite(ghost, hero);
    Object.assign(RIM, keep); hero.k1 = hero.k2 = -1;
  }

  // ───── 特效 ─────
  // 候选部件：冰锥 iceSpike（特效层）—— 从地面长出的冰锥：2 帧长到全高，保持，再从上往下按抖动碎掉
  const SPN = 8, spX = new Float32Array(SPN), spH = new Float32Array(SPN), spT = new Float32Array(SPN).fill(9), spD = new Float32Array(SPN);
  function spike(x, h, delay) { let j = 0; for (let i = 0; i < SPN; i++) if (spT[i] > spT[j]) j = i; spX[j] = x; spH[j] = h; spT[j] = -(delay || 0); spD[j] = 0.55; }
  function drawSpikes(f12) {
    for (let i = 0; i < SPN; i++) {
      const t = spT[i]; if (t < 0 || t >= spD[i]) continue;
      const H = R(spH[i] * Math.min(1, (t + 1 / 12) / (2 / 12))), x = R(spX[i]), late = t > spD[i] * 0.6, q = late ? (t - spD[i] * 0.6) / (spD[i] * 0.4) : 0;
      for (let j = 0; j < H; j++) {
        const y = FLOOR - 1 - j, wdt = j < H * 0.4 ? 3 : j < H - 1 ? 2 : 1;
        for (let k = 0; k < wdt; k++) {
          if (late && E.bayer(x + k, y) < q + (H - j) / H * q) continue;
          put(x - (wdt >> 1) + k, y, j === H - 1 ? FR[0] : k === 0 ? FR[1] : k === wdt - 1 ? FR[3] : FR[2]);
        }
      }
    }
  }
  // 候选部件：冰棱帘幕 icicleCurtain —— 一排冰棱从左上天空斜落，落地碎成冰屑、插在地上一瞬
  const ICN = 10, icX = new Float32Array(ICN), icY = new Float32Array(ICN), icT = new Float32Array(ICN).fill(9), icL = new Uint8Array(ICN);
  const IC_VX = 70, IC_VY = 190;
  function curtain(x0, x1) {
    for (let i = 0; i < ICN; i++) { const tx = x0 + (x1 - x0) * i / (ICN - 1), dt = 0.3 + (i % 3) * 0.04; icX[i] = tx - IC_VX * dt; icY[i] = FLOOR - 1 - IC_VY * dt; icT[i] = -(i * 0.022); icL[i] = 0; }
  }
  function drawCurtain() {
    for (let i = 0; i < ICN; i++) {
      if (icT[i] < 0 || icT[i] > 0.7) continue;
      const x = R(icX[i]), y = R(icY[i]);
      if (icL[i]) { if (icT[i] < 0.5) for (let k = 0; k < 3; k++) put(x, y - k, k === 2 ? FR[1] : FR[2]); continue; }
      for (let k = 0; k < 7; k++) { const px = R(x - k * IC_VX / IC_VY), c = k === 0 ? FR[0] : k < 3 ? FR[1] : k < 5 ? FR[2] : FR[3]; put(px, y - k, c); if (k > 0 && k < 5) put(px - 1, y - k, k < 3 ? FR[2] : FR[3]); }
    }
  }
  function stepCurtain(dt) {
    for (let i = 0; i < ICN; i++) {
      icT[i] += dt; if (icT[i] < 0 || icT[i] > 0.7 || icL[i]) continue;
      icX[i] += IC_VX * dt; icY[i] += IC_VY * dt;
      if (icY[i] >= FLOOR - 1) { icY[i] = FLOOR - 1; icL[i] = 1; icT[i] = 0; burst(icX[i], FLOOR - 2, 4, 20, 50, 0.15, 0.35, R_FR, 14); }
    }
  }

  const T_RISE = [0.2, 0.42, 0.64, 0.86, 1.08], T_RING = 3 / 12, T_FREEZE_HIT = 4 / 12;
  let chargeAcc = 0, breathAcc = 0, soulAcc = 0, crumbAcc = 0, lastGf = -9, lastLook = -1, ghostT = 9, frostT = 9;
  const mouthScr = () => [scrX(R(rig.mouth[0]) + P.bx), HY + R(rig.mouth[1])];
  const pawScr = () => { const L = rig.legs[3]; return scrX(R(L.F[0]) + P.bx); };
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT);
      releaseOrbit(30, 80, 0.3, 0.6, { pts: 1, up: 24, ramp: R_EL });
      curtain(scrX(18), DUMMY_X + 6);                                                                   // 冰晶帘幕：10 根冰棱斜落到假人
      burst(scrX(P.gx), HY + P.gy, 16, 30, 90, 0.25, 0.5, R_FR, 12);
      shake(0.3, 2); flash(0.06);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                                  // 前爪按地：爪下一丛冰锥 + 冰浪冲到假人
      const px = pawScr();
      spike(px + 2, 7, 0); spike(px + 5, 10, 1 / 12); spike(px + 8, 6, 1 / 12);
      fx.wave(px + 9, FLOOR - 1, 1, DUMMY_X - px - 9, 5, R_FR, 0.3, 1);
      spike(DUMMY_X - 3, 8, 3 / 12); spike(DUMMY_X + 2, 6, 4 / 12);
      burst(px + 4, FLOOR - 3, 10, 30, 80, 0.2, 0.45, R_EL, 18);
      shake(0.14, 1); sfx('swing', { kind: 'smash', w: 0.95 });
    }
    if (s === ATTACK && t === T_HIT + 3 / 12) {
      hitDummy(1, 1); burst(DUMMY_X - 2, HY - 10, 12, 30, 90, 0.15, 0.4, FXI.impact, 10); burst(DUMMY_X - 2, HY - 10, 8, 30, 70, 0.2, 0.45, R_FR, 10);
      sfx('hit', { mat: 'flesh', w: 0.95 });
    }
    if (s === CHARGE && T_RISE.indexOf(t) >= 0) {                                                      // 冰冠逐支点亮：每支一颗小星芒
      const k = T_RISE.indexOf(t); fx.cross(scrX(P.gx) - 4 + k * 2, HY + P.gy - 3 - (k === 2 ? 2 : 0), 2 + (k === 2 ? 1 : 0), R_FR, 0.25, 2);
    }
    if (s === CAST && t === T_RING) { ring(scrX(10), HY, 1, R_FR); fx.circle(scrX(10), FLOOR, 30, 7, R_EL, 0.6, -1, 0); }   // 大冰环
    if (s === CAST && t === T_FREEZE_HIT) {                                                             // 假人冻结 + 脚下 3 根冰锥 + 冰屑外爆
      dummyFx({ dur: 2.4, fill: R_FR, outline: R_FR, stun: 1, slow: 0.4 }); hitDummy(1, 1); frostT = 0;
      spike(DUMMY_X - 6, 9, 0); spike(DUMMY_X, 13, 1 / 12); spike(DUMMY_X + 6, 8, 1 / 12);
      burst(DUMMY_X, HY - 14, 22, 40, 110, 0.3, 0.6, R_FR, 10); fx.cross(DUMMY_X, HY - 16, 7, R_FR, 0.3, 2);
      shake(0.2, 2); flash(0.04); sfx('impact', { pal: 'frost', w: 0.95 });
    }
    if (s === HURT && t === INCOMING) { makeGhost(); ghostT = 0; burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.4, R_FUR, 12); }
    if (s === DEATH && t === q12(INCOMING + T_FREEZE)) {                                                // 冻结的一瞬：霜气炸开
      burst(HX - 2, HY - 16, 18, 20, 60, 0.3, 0.6, R_FR, 6); fx.cross(scrX(P.gx), HY + P.gy, 5, R_FR, 0.3, 2);
      sfx('impact', { pal: 'frost', w: 0.6 });
    }
    if (s === DEATH && t === T_BREAK) {                                                                 // 从中间裂开碎成冰块
      poseAt(DEATH, T_BREAK - 1e-3, E.simT); drawHero(); bakeHero();
      death.start('chunks', { chunk: 5, power: 0.6, fromX: R(rig.C1.x - o.len * 0.45), fromY: -14, fadeAt: 0.9, fadeDur: 0.6, ramp: R_FR });
      burst(HX - 4, HY - 16, 20, 30, 100, 0.3, 0.7, R_FR, 12); shake(0.2, 2); flash(0.04);
      poseAt(DEATH, T_BREAK, E.simT);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 20 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, R_EL);
      shake(0.1, 1); sfx('fall', { w: 0.95 });
    }
  }
  const EVENTS = [[], [], [T_HIT, T_HIT + 3 / 12], T_RISE, [T_RING, T_FREEZE_HIT], [], [INCOMING], [q12(INCOMING + T_FREEZE), T_BREAK, T_LAND], []];
  function stepFX(dt, state, stT) {
    const [mx, my] = mouthScr(), gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                             // 雪暴：从脚下大半径逆时针螺旋上升到冰冠
      chargeAcc += dt * (14 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 18 + Math.random() * 10; spawnX(K_SPIRAL_PT, gx, gy, (r - 3.5) / (0.5 + Math.random() * 0.4), 0, 9, Math.random() < 0.6 ? R_EL : R_FR, { a, r, w: -(3.5 + Math.random() * 2.5), tx: gx, ty: gy + 8, squash: 0.45 }); }
      if (stT > 0.4) { breathAcc += dt * 14; while (breathAcc >= 1) { breathAcc -= 1; spawnX(K_DUST, mx + 1, my - 1, 4 + Math.random() * 8, -6 - Math.random() * 6, 0.7 + Math.random() * 0.5, R_EL, { age0: 0.15 }); } }   // 长嚎的白雾往上喷
    }
    if (frostT < 2.2) {                                                                                 // 冻住的假人：头顶飘冰屑
      crumbAcc += dt * 8; while (crumbAcc >= 1) { crumbAcc -= 1; spawnX(K_PHYS, DUMMY_X - 5 + Math.random() * 10, HY - 34 - Math.random() * 4, (Math.random() - 0.5) * 6, 6 + Math.random() * 6, 0.9 + Math.random() * 0.4, R_FR, { g: 14, floor: FLOOR - 1 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                            // 庄重踱步：每步 3–4 颗雪尘
      if (P.gf === 0 || P.gf === 2) {
        const L = rig.legs[P.gf === 0 ? 3 : 2], x = scrX(R(L.F[0]) + P.bx);
        for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 5, HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.3, R_EL);
        sfx('step', { w: 0.95 });
      }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                                               // 环顾时鼻息成白雾
      const lp = q12(stT % DUR[IDLE]), k = lp >= T_LOOK + 0.08 && lp < T_LOOK + 0.34 ? f12of(lp - T_LOOK) : -1;
      if (k >= 0 && k !== lastLook) for (let i = 0; i < 3; i++) spawnX(K_DUST, mx + 1, my, 6 + Math.random() * 8, -3 - Math.random() * 4, 0.6 + Math.random() * 0.3, R_EL, { age0: 0.2 });
      lastLook = k;
    }
    if (state === DEATH && stT > INCOMING + T_FREEZE && stT < INCOMING + 1.0 && Math.random() < dt * 12) {   // 冰雕冒寒气
      spawn(K_RISE, HX - 18 + Math.random() * 34, HY - 4 - Math.random() * 24, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL);
    }
    if (state === DEATH && stT > INCOMING + 1.9 && stT < INCOMING + 2.5) {                              // 冰块化开，魂光上升
      soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 8, -14 - Math.random() * 12, 0.7 + Math.random() * 0.6, Math.random() < 0.6 ? R_FR : FXI.soul); }
    }
    if (state === RECOVER && stT < 0.4 && Math.random() < dt * 8) spawnX(K_DUST, mx + 1, my, 3 + Math.random() * 5, -2, 0.5, R_EL, { age0: 0.2 });
    ghostT += dt; frostT += dt;
    for (let i = 0; i < SPN; i++) spT[i] += dt;
    stepCurtain(dt);
  }
  function fxReset() {
    chargeAcc = 0; breathAcc = 0; soulAcc = 0; crumbAcc = 0; lastGf = -9; lastLook = -1; ghostT = 9; frostT = 9;
    spT.fill(9); icT.fill(9); icL.fill(0);
  }
  // 身周常驻 4 颗慢飘的雪花（5 格小十字，绕身缓慢上下飘）
  function flakes(f12) {
    if (P.dq >= 1 || P.frz || (E.state === DEATH)) return;
    const T = f12 / 12;
    for (let k = 0; k < 4; k++) {
      const a = T * 0.9 + k * 1.57, x = R(scrX(-4 + Math.cos(a) * 22)), y = R(HY - 20 + Math.sin(a * 1.3 + k) * 10 - k * 2), c = (k + (f12 >> 2)) & 1 ? EL[1] : EL[2];
      put(x, y, EL[0]); put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, c);
    }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.frz && P.dq < 1) floorGlow(scrX(P.gx), P.rim, FR, f12); }
  function fxMid(f12) { if (ghostT < 0.3 && E.state === HURT) blitShape(ghost, HX + 2, HY, 0, ghostT < 0.1 ? FR[1] : FR[2], ghostT < 0.1 ? 0 : (ghostT - 0.1) / 0.2); }
  function fxFront(f12) { drawSpikes(f12); drawCurtain(); flakes(f12); }

  return {
    name: '雪狼王', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, m.mark], HIT_POINT, EVENTS, deathKit: { mode: 'chunks', at: T_BREAK },
    SFX: { body: 'beast', how: 'shatter', pal: 'frost', style: 'frost', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
