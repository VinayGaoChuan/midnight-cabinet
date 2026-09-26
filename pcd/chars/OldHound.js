// 老猎犬（衍生单位 · 骷髅 · 战士 · 普通 · 近战；desc「高伤害近战宠物。（小鬼）」= 恶魔「召唤小鬼」召出来的那只小鬼）：
//   本组最小的兽，一只又老又瘦的驼背老狗——褐黄旧毛掉得东一块西一块（斑秃处露出骨头，肋骨一根根凸在皮下），吻部只剩白骨，
//   眼窝里一点奥术紫光；一对长垂耳耷拉到下巴以下，头顶一对恶魔同款的小弯角，尾巴末端是恶魔同款的箭头尾尖；
//   嘴里永远叼着一根大腿骨（两端刻奥术紫符文，是发光体）；一条后腿瘸（站着时脚尖点地，走路时拖着）。
// 攻击 = 砸：扬头把叼着的大腿骨往后一抬，再甩头横砸到目标上。
// 技能「骨头回旋」（无特性，表现 desc「高伤害近战」的绝招）：趴低，骨头两端符文依次亮起、紫粒子绕骨头螺旋，垂耳竖起一下 →
//   猛一甩头把骨头像回旋镖一样扔出（空中 4 帧翻转、拖紫尾）→ 砸中目标奥术外爆 + 十字星芒、目标眩晕 → 骨头弧线飞回，老狗跳起来叼住。
// 死亡 = 趴下睡去：慢慢趴下，把骨头放在前爪之间、头搁在骨头上闭眼，从尾巴开始像素消散（安静，不炸不散架）。
// 身体用 parts-beast 的 quad（canine 头）拼；垂耳、小弯角、箭头尾、符文大腿骨、从尾巴开始的消散是本模块的候选部件。设定卡见 pcd/batch-16/OldHound/design.md。
PCD.define('OldHound', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_TRAIL, K_RISE, K_DUST, K_EMBER,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.magic, EL = FXR[R_EL];                                                    // 小鬼奥术 · 星辉紫：白 21 → 青 22 → 蓝 23 → 紫 24 → 深紫 25（和恶魔同一色阶）
  const R_FUR = fxRamp('oldHoundFur', [33, 32, 19, 20, 8]);                                  // 受击掉的旧毛
  const R_BONE = fxRamp('oldHoundBone', [21, 17, 6, 7, 8]);                                  // 骨屑 · 砸击拖影
  const m = B.mats(E, {
    main: [0, 20, 19, 33],                                                                   // 褐黄旧毛（wood 色阶，亮部偏黄）
    muz: [0, 20, 7, 18], bone: 'bone',                                                       // 灰白老狗吻 · 斑秃处的骨 · 大腿骨
    ear: [0, 20, 20, 32],                                                                    // 垂耳（wood 暗段，受光沿一格浅褐）
    horn: [0, 52, 53, 54],                                                                   // 小弯角 / 箭头尾尖（shadow，和恶魔同色）
    eye: [0, 0, 24, 24], glow: [24, 24, 43, 21], teeth: 'white',                             // 眼窝紫光（蓄力时换亮一级）
  });
  m.body = E.defMat([0, 20, 19, 33], 1);                                                     // 身体小：band 1，别整块发暗
  m.earFar = E.defMat([0, 20, 20, 20], 1); m.hornFar = E.defMat([0, 52, 52, 53], 1);         // 远侧耳 / 角暗一级
  const M_RUNE = E.defMat([25, 24, 43, 21], 1, 1);                                           // 骨头两端的符文（发光体，手工色调）
  const HEAD = { type: 'canine', w: 7, h: 6, snout: 4, snH: 3.5, tip: 0.8, ear: 'none', teeth: 1 };   // 头放大一圈：角、垂耳、骨头都压在头周围
  const SHAPE = { len: 9, chest: 3.6, rump: 3, waist: 0.55, hump: 1.2, leg: 5, lw: 1, thigh: 1.5, farDx: -1.5, stride: 2, lift: 2,
    neck: 2.5, neckA: 0.3, neckW: 1.9, head: HEAD, headA: 0.3, tail: 'none', mane: 'none', foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);
  const oSit = Q.shape(Object.assign({}, SHAPE, { len: 5.5 }));                              // 坐下挠耳：臀收到胸下
  const BONE_L = 4;                                                                          // 大腿骨半长（全长 9 格）

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(72, 38, 32, 33);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'horn', 'hornFar']) if (m[k]) RIM.skip[m[k]] = 1;
  RIM.skip[M_RUNE] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['scr', 0, 2], ['bone', -1, 1], ['nob', 0, 2], ['rune', 0, 4], ['sit', 0, 1], ['td48', 0, 48]]);
  // scr 挠耳（0 不挠 · 1 爪在耳尖下 · 2 爪抬到耳中）· bone 骨头角度（-1 前端上扬 · 1 前端下砸）· nob 骨头（0 叼着 · 1 扔出去了 · 2 放在前爪间）
  // rune 符文档（0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭）· sit 坐姿 · td48 从尾巴开始的消散量
  const P = {};
  function reset() { Q.reset(P); P.scr = 0; P.bone = 0; P.nob = 0; P.rune = 0; P.sit = 0; P.td = 0; P.td48 = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;
  let mouthL = [0, 0];                                                                        // 嘴（本地坐标，含 bx）

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'reach', 'lift', 'bone'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, reach: 0, lift: 0, bone: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12, T_BHIT = 3 / 12, T_CATCH = 3 / 12, T_JLAND = 5 / 12;
  const A_WIND = pose({ bx: -1, crouch: 1, head: -2, pitch: 1, bone: -1, tail: 1 });               // 扬头：骨头前端往上抬
  const A_SMASH = pose({ bx: 5, head: 1, pitch: 0, reach: 2, bone: 1, tail: -2 });                // 甩头横砸
  const A_HOLD = pose({ bx: 4, head: 1, pitch: 0, reach: 1, bone: 0, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_SMASH, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, pitch: -1, head: 1, tail: 1 });                                  // 趴低蓄力
  const S_FLICK = pose({ bx: 2, crouch: 1, head: -2, pitch: 1, jaw: 3, tail: -2, ear: 1 });         // 猛一甩头扔出
  const S_WATCH = pose({ bx: 2, head: -1, jaw: 2, tail: -1, ear: 1 });
  const S_READY = pose({ bx: 1, crouch: 2, head: -1, jaw: 2, tail: 1 });                           // 等骨头飞回
  const S_JUMP = pose({ bx: 1, lift: 3, head: -2, jaw: 3, reach: 2, pitch: 2, tail: -2, ear: 1 });   // 跳起来叼住
  const S_CATCH = pose({ bx: 1, lift: 2, head: -1, pitch: 1, reach: 1, tail: 2 });
  const S_LAND = pose({ bx: 1, crouch: 2, head: 0, tail: 2 });
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  const T_SCR0 = 1.2;                                                                               // 待机个性：坐下挠耳（1.2–2.2 s）
  const SCR = [1, 2, 1, 2, 1, 2, 1, 0];                                                              // 挠三下（爪 下 / 上）
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.mane = 0;
    if (lp >= T_SCR0 - 1e-6 && lp < T_SCR0 + 11 / 12 - 1e-6) {
      const i = f12of(lp - T_SCR0);
      if (i === 0 || i === 9) { P.crouch = 2; P.pitch = 1; P.head = 1; }
      else if (i === 10) { P.crouch = 1; }
      else { P.sit = 1; P.crouch = 3; P.pitch = 3; P.head = 1; P.bob = 0; P.scr = SCR[i - 1]; P.bone = P.scr === 2 ? -1 : P.scr ? 1 : 0; P.tail = (i & 1) ? 2 : 0; P.mane = P.scr === 2 ? 1 : 0; if (i === 4) P.eyes = 1; }
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                          // 瘸腿蹒跚：身体一高一低
      const f = Q.anim.walk(P, tq); P.bob = [1, 0, 1, -1][f]; P.pitch = f === 2 ? 1 : 0; P.tail = [-1, 0, 1, 0][f]; P.head = 0;                 // 老狗头一直低垂，不随步点头（骨头不乱晃）
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rune = tq >= 0.12 && tq < 0.34 ? 1 : 0; P.rim = tq >= 0.12 && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      P.rune = tq < 0.25 ? 0 : tq < 0.7 ? 1 : tq < 1.0 ? ((f12 & 1) ? 2 : 1) : 2;                 // 两端符文依次亮起
      if (tq >= 0.9 && tq < 1.15) { P.ear = 1; P.glow = 2; P.head = 0; } else P.glow = tq > 0.5 ? 1 : 0;   // 垂耳竖起一下、眼神变锐
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; P.tail = (f12 & 1) ? 2 : -1; }                   // 后腿蹬地抖动
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) apply(S_FLICK); else if (tq < T_BHIT) apply(S_WATCH); else { E.mix(tmp, S_WATCH, S_READY, ease.inOut(clamp01((tq - T_BHIT) / 0.2)), F_ALL); apply(tmp); }
      P.nob = 1; P.rune = 3; P.glow = 2; P.rim = tq < 2 / 12 ? 3 : 2;
    } else if (st === RECOVER) {
      if (tq < 1 / 12) { apply(S_READY); P.nob = 1; }
      else if (tq < T_CATCH) { apply(S_JUMP); P.nob = 1; }
      else if (tq < 4 / 12) apply(S_CATCH);
      else if (tq < T_JLAND + 1 / 12) apply(S_LAND);
      else { E.mix(tmp, S_LAND, REST, ease.inOut(clamp01((tq - T_JLAND - 1 / 12) / 0.2)), F_ALL); apply(tmp); }
      P.rune = tq < T_CATCH ? 3 : tq < 0.45 ? 2 : tq < 0.6 ? 1 : 0; P.glow = tq < 0.45 ? 2 : 0; P.rim = tq < 0.4 ? 2 : tq < 0.55 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.mane = h < 0.2 ? 1 : 0; P.bone = h < 0.2 ? -1 : 0; } }
    else if (st === DEATH) {                                                                         // 趴下睡去
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = 1; P.bone = -1; }
      else if (d < T_DOWN) { P.bx = -2; P.crouch = d < 0.45 ? 3 : 4; P.pitch = -1; P.head = 1; P.tail = 1; }   // 慢慢趴低（骨头还叼着）
      else {
        P.bx = -2; P.lie = 1; P.nob = 2; P.head = 2; P.eyes = d < T_DOWN + 2 / 12 ? 0 : 1; P.rune = d < 0.9 ? 1 : d < 1.2 ? ((f12 & 1) ? 1 : 4) : 4;   // 骨头放在前爪间，头搁上去闭眼
        P.tail = d < 0.9 ? 1 : 0; P.bob = d > 0.95 && d < 1.3 ? ((f12 >> 2) & 1) : 0;                 // 最后几口呼吸
        if (d >= 1.6) P.td = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.rune = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, P.sit ? oSit : o); postRig(rig);
    mouthL = [R(rig.mouth[0]) + P.bx, R(rig.mouth[1])];
    if (P.nob === 0) { const b = boneAt(rig); P.gx = b[0] + P.bx; P.gy = b[1]; } else if (P.nob === 2) { P.gx = groundBoneX(rig) + P.bx; P.gy = -1; } else { P.gx = mouthL[0]; P.gy = mouthL[1]; }
    P.td48 = R(P.td * 48);
    B.key(P, SPEC);
  }
  const T_DOWN = 0.66;

  // 瘸腿与挠耳：直接改这一帧 rig 的近侧后腿落点（rig 只由 P 算出，所以仍然只取决于 P）
  function postRig(rg) {
    const L = rg.legs[2];
    if (P.scr) { const e = earTip(rg), tx = e[0] - 1, ty = e[1] + (P.scr === 2 ? -2 : 1); L.F = [tx, ty]; L.L = Math.max(L.L, Math.hypot(tx - L.T[0], ty - L.T[1]) + 0.5); L.up = true; }
    else if (!rg.lie && !P.lift && !P.sit && rg.gf < 0) { L.F = [L.F[0] + 1, -1]; L.up = true; }   // 站着：瘸腿脚尖点地
    else if (rg.gf === 1) L.F = [L.F[0] - 1, -1];                                                    // 走路：瘸腿只抬 1 格、拖在后面
  }

  // ───── 画 ─────
  // 候选部件：droopEar —— 长垂耳：从颅顶后方垂下，2 格宽，一直耷拉到下巴以下 2 格；P.mane 让下半截往后甩，P.ear = 1 时竖起（往后上方翘 4 格）
  function earPath(rg, far) {
    const F = Q.headFrame(rg, P.sit ? oSit : o), b = F.at(-F.W * 0.8 + (far ? 1.6 : 0), -F.Hh + 1.2), pts = [];
    if (P.ear) { for (let k = 0; k <= 4; k++) pts.push([b[0] - k * 0.8, b[1] - k * 0.7]); return pts; }
    const chin = rg.head.y + rg.head.Hh, n = Math.max(4, R(chin + 2 - b[1])), sw = P.mane | 0;
    for (let k = 0; k <= n; k++) { const q = k / n; pts.push([b[0] - 0.25 * k - sw * q * q * 2.2 + (k > 1 ? 0.6 : 0), b[1] + k]); }
    return pts;
  }
  function earTip(rg) { const p = earPath(rg, 0); return p[p.length - 1]; }
  function droopEar(rg, far) {
    E.part(); const pts = earPath(rg, far), mat = far ? m.earFar || m.far : m.ear, n = pts.length - 1;
    for (let k = 0; k <= n; k++) {
      const [x, y] = pts[k], tip = k === n;
      U.dot(E, x, y, mat, tip ? 4 : 0); if (!tip) U.dot(E, x + 1, y, mat, k === 0 ? 4 : (k & 1) && !far ? 2 : 0);
      if (!tip && k > 1 && !P.ear) U.dot(E, x - 1, y, mat, 0);                          // 中段最宽 3 格（耷拉的耳朵片）
    }
  }
  // 候选部件：impHorn —— 恶魔小弯角：2 格宽的角根往上 1 格，再往后上方弯出尖（size 2 老猎犬 · 3 恶魔，同一画法）
  const HORN = { 2: [[0, 1, 2], [0, 0, 2], [0, -1, 1], [-1, -2, 1]], 3: [[0, 0, 2], [0, -1, 2], [-1, -2, 1], [-2, -3, 1], [-2, -4, 1]] };
  function impHorn(x, y, s, mat, far) {
    E.part(); const pts = HORN[s], n = pts.length - 1;
    pts.forEach(([dx, dy, w], i) => { for (let j = 0; j < w; j++) U.dot(E, x + dx + j, y + dy, mat, i === n ? (far ? 3 : 4) : far ? 2 : (j === 0 ? 4 : 3)); });
  }
  function hornAt(rg, far) { const F = Q.headFrame(rg, P.sit ? oSit : o), p = F.at(far ? 1.2 : -0.6, -F.Hh + 0.6); return [R(p[0]), R(p[1])]; }
  // 候选部件：arrowTail —— 细尾 + 恶魔箭头尾尖：从臀后斜向上甩出、末端往上翘，尾尖是 3 格宽的铲形箭头（角的材质）；P.tail 甩动
  function arrowTail(rg) {
    E.part(); const lie = rg.lie, sw = (P.tail | 0) * 0.12, n = 6;
    let x = rg.tail.x + 0.3, y = rg.tail.y, a = lie ? 0.15 : 0.55;
    for (let k = 0; k < n; k++) { U.dot(E, x, y, m.ear, k < 2 ? 0 : (k & 1) ? 2 : 0); if (k < 2) U.dot(E, x, y + 1, m.ear, 2); a += (lie ? 0.02 : 0.16) + sw; x -= Math.cos(a); y -= Math.sin(a); if (y > -1) y = -1; }
    const ux = -Math.cos(a), uy = -Math.sin(a), X = R(x), Y = R(y);                                    // 箭头：尖朝尾巴走向，底边横 3 格
    const tipx = R(x + ux * 2), tipy = R(y + uy * 2);
    U.dot(E, X, Y, m.horn, 3); U.dot(E, X - 1, Y, m.horn, 2); U.dot(E, X + 1, Y, m.horn, 3); U.dot(E, X, Y + (uy < 0 ? 1 : -1), m.horn, 2);
    U.dot(E, R(x + ux), R(y + uy), m.horn, 3); U.dot(E, tipx, tipy, m.horn, 4);
  }
  // 躯干细节（紧跟 Q.body 画、并进躯干部件）：肋骨在皮下一根根凸起（肋沟暗格）、斑秃处露骨（肩胛、髋骨、驼背上两节脊椎）
  function bodyDetail(rg, oo) {
    const C1 = rg.C1, C2 = rg.C2;
    for (let k = 0; k < 3; k++) { const x = R(C1.x - 3 + k * 1.6), s = Q.span(rg, oo, x); if (!s) continue; for (let y = s[0] + 2; y <= s[1] - 1; y++) if (((y + k) & 1) === 0 || y < s[0] + 4) U.dot(E, x, y, m.body, 2); }
    const sp = Q.span(rg, oo, R(C2.x)); if (sp) { U.dot(E, C2.x - 0.5, sp[0] + 1, m.bone, 4); U.dot(E, C2.x + 0.5, sp[0] + 1, m.bone, 3); U.dot(E, C2.x - 0.5, sp[0] + 2, m.bone, 2); }   // 髋骨露出
    const xh = R(C1.x - 1), sh = Q.span(rg, oo, xh); if (sh && !rg.lie) { U.dot(E, xh, sh[0], m.bone, 4); U.dot(E, xh - 2, sh[0], m.bone, 3); }   // 驼背上凸出的两节脊椎
    const xs = R(C1.x + 1), ss = Q.span(rg, oo, xs); if (ss) U.dot(E, xs, ss[0] + 2, m.bone, 3);   // 肩胛斑秃
  }
  // 候选部件：runeBone —— 刻符文的大腿骨：1 格骨干（斜放吸附 0 / 1:2 / 45°，s = 斜率）+ 两端 3 格骨节（上亮、下暗）+ 骨节中心 1 格奥术符文（发光体，5 档，和骨头同一部件）
  const RUNE_T = [2, 3, 3, 4, 1];
  function snapS(a) { const t = Math.tan(Math.max(-1.2, Math.min(1.2, a))), s = Math.abs(t) < 0.25 ? 0 : Math.abs(t) < 0.75 ? 0.5 : 1; return t < 0 ? -s : s; }
  function runeBone(cx, cy, s, lv) {
    E.part();
    for (let k = -BONE_L; k <= BONE_L; k++) {
      const x = cx + k, y = cy + R(k * s), end = Math.abs(k) === BONE_L;
      if (end) { U.dot(E, x, y - 1, m.bone, 4); U.dot(E, x, y + 1, m.bone, 2); U.dot(E, x, y, M_RUNE, RUNE_T[lv]); if (lv === 2 || lv === 3) U.dot(E, x + Math.sign(k), y, M_RUNE, 3); }
      else U.dot(E, x, y, m.bone, Math.abs(k) === BONE_L - 1 ? 4 : 0);
    }
  }
  function boneAt(rg) { const F = Q.headFrame(rg, P.sit ? oSit : o), c = F.at(F.W + 1.5, F.prof(F.W + 1.5)[2] + 0.9); return [R(c[0]), R(c[1])]; }
  const groundBoneX = (rg) => R(rg.legs[3].F[0]) + 3;
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = P.sit ? oSit : o;
    Q.legs(E, rig, P, oo, 1);
    arrowTail(rig);
    Q.body(E, rig, P, oo); bodyDetail(rig, oo);
    Q.legs(E, rig, P, oo, 0);
    if (P.nob === 2) runeBone(groundBoneX(rig), -1, 0, P.rune);                                        // 死亡：骨头放在前爪之间，头搁在上面
    droopEar(rig, 1);                                                                                   // 远耳、两只角画在头之前：只露出伸出头外的部分，不在小脸上压分界线
    const hf = hornAt(rig, 1); impHorn(hf[0], hf[1], 2, m.hornFar, 1);
    const hn = hornAt(rig, 0); impHorn(hn[0], hn[1], 2, m.horn, 0);
    Q.head(E, rig, P, oo);
    if (!P.eyes) U.dot(E, rig.eye[0] - 1, rig.eye[1], m.ink, 0);                                       // 眼窝（和头同一部件）：墨色 + 1 格紫光
    if (P.nob === 0) { const b = boneAt(rig); runeBone(b[0], b[1], snapS(rig.head.a * 0.5 + P.bone * 0.5), P.rune); }
    droopEar(rig, 0);                                                                                   // 近耳贴着后脑垂到下巴以下（只压后脑一列）
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.td > 0) tailDissolve(hero, P.td);
  }
  // 候选部件（引擎消散的横向版）：tailDissolve —— 从尾巴（左）往头（右）按 8×8 Bayer 删像素，安静地一点点没掉
  function tailDissolve(s, q) {
    const out = s.out, w = s.w; let x0 = w, x1 = -1;
    for (let i = 0; i < out.length; i++) if (out[i] !== 255) { const x = i % w; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    const span = Math.max(1, x1 - x0);
    for (let i = 0; i < out.length; i++) { if (out[i] === 255) continue; const x = i % w, y = (i / w) | 0; if (B8[(y & 7) * 8 + (x & 7)] * 0.55 + (x - x0) / span * 0.45 < q) out[i] = 255; }
  }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, trailAcc = 0, lastGf = -9, lastScr = 0, smT = 9, smCX = 0, smCY = 0;
  let thX = 0, thY = 0, ctX = 0, ctY = 0;                                                            // 回旋骨头：扔出点、接住点（屏幕坐标）
  const HITX = DUMMY_X - 4, HITY = HY - 16;
  function mouthOf(st, t) { poseAt(st, t, t); return [scrX(mouthL[0]), HY + mouthL[1]]; }
  function boneT() { return E.state === CAST ? E.stT : E.state === RECOVER && E.stT < T_CATCH ? DUR[CAST] + E.stT : -1; }
  function bonePos(t) {                                                                              // 出去 0.25 s 小弧 · 回来 0.5 s 高弧
    if (t < T_BHIT) { const q = t / T_BHIT; return [lerp(thX, HITX, q), lerp(thY, HITY, q) - Math.sin(Math.PI * q) * 5]; }
    const q = clamp01((t - T_BHIT) / (DUR[CAST] + T_CATCH - T_BHIT)); return [lerp(HITX, ctX, q), lerp(HITY, ctY, q) - Math.sin(Math.PI * q) * 16];
  }
  function onEnter(s) {
    if (s === CAST) {
      [ctX, ctY] = mouthOf(RECOVER, T_CATCH - 1 / 12); [thX, thY] = mouthOf(CAST, 0); poseAt(CAST, 0, E.simT); hero.k1 = hero.k2 = -1;
      releaseOrbit(40, 90, 0.3, 0.6); burst(thX, thY, 14, 40, 100, 0.2, 0.45, R_EL, 8);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                              // 骨头横砸到假人
      const x = scrX(P.gx + BONE_L), y = HY + P.gy; smT = 0; smCX = scrX(R(rig.head.x) + P.bx); smCY = HY + R(rig.head.y);
      burst(x, y, 12, 40, 100, 0.15, 0.35, FXI.impact, 8); burst(x, y, 5, 30, 70, 0.2, 0.4, R_BONE, 6); fx.cross(x, y, 3, FXI.impact, 0.18); hitDummy(0, 1);
      sfx('swing', { kind: 'smash', w: 0.3 }); sfx('hit', { mat: 'wood', w: 0.35 });
    }
    if (s === CAST && t === T_BHIT) {                                                               // 骨头砸中：奥术外爆 + 紫色十字星芒 + 眩晕
      burst(HITX, HITY, 26, 50, 130, 0.3, 0.7, R_EL, 12); burst(HITX, HITY, 6, 30, 70, 0.15, 0.35, R_BONE, 6);
      fx.cross(HITX, HITY, 7, R_EL, 0.35); ring(HITX, HITY, 1, R_EL); hitDummy(1, 1); dummyFx({ dur: 1.4, stun: 1 }); shake(0.12, 1);
      sfx('impact', { pal: 'arcane', w: 0.35 });
    }
    if (s === RECOVER && t === T_CATCH) { burst(ctX, ctY, 8, 20, 60, 0.15, 0.35, R_EL, 6); sfx('hit', { mat: 'wood', w: 0.15 }); }
    if (s === RECOVER && t === T_JLAND) { for (let i = 0; i < 4; i++) spawn(K_DUST, HX + 2 + Math.random() * 10, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 4, 0.3, FXI.dust); }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 10 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.08, 1); sfx('fall', { w: 0.25 }); }
  }
  const T_LAND = Math.ceil((INCOMING + T_DOWN) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT], [], [T_BHIT], [T_CATCH, T_JLAND], [], [T_LAND], []];
  function hurtFx(s) {                                                                               // 旧毛 + 骨屑 + 一点紫
    const hx = HX + HIT_POINT[0], hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 16 : 10, 40, 110, 0.25, 0.55, R_FUR, 16); burst(hx - 3, hy, s === DEATH ? 10 : 6, 40, 100, 0.2, 0.45, R_BONE, 14); burst(hx, hy - 3, 3, 20, 50, 0.3, 0.5, R_EL, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                          // 紫粒子沿骨头螺旋
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 6 + Math.random() * 7; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
      if (P.rune >= 1 && Math.random() < dt * 6) spawn(K_EMBER, gx + (Math.random() < 0.5 ? -BONE_L : BONE_L), gy - 1, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5, R_EL);
    }
    if (state === MOVE && P.gf !== lastGf) {                                                         // 每步一声，每两步 1 颗尘
      if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.25 });
      if (P.gf === 0) spawn(K_DUST, scrX(-3), HY, (Math.random() - 0.5) * 8, -2 - Math.random() * 3, 0.25, FXI.dust);
      lastGf = P.gf;
    }
    if (state === IDLE && P.scr === 2 && lastScr !== 2) { const e = earTip(rig); spawn(K_DUST, scrX(R(e[0])), HY + R(e[1]), (Math.random() - 0.5) * 10, -4 - Math.random() * 4, 0.35, R_FUR); }   // 挠下一撮旧毛
    lastScr = P.scr;
    const bt = boneT();
    if (bt >= 0) { trailAcc += dt * 50; const [bx, by] = bonePos(bt); while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, bx + (Math.random() - 0.5) * 3, by + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, 0.15 + Math.random() * 0.25, R_EL); } }
    if (state === DEATH && P.td > 0 && P.td < 1) {                                                   // 消散的前沿冒起紫色魂光
      soulAcc += dt * 26;
      while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + P.td * 36 + (Math.random() - 0.5) * 6, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, FXI.soul); }
    }
    smT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; trailAcc = 0; lastGf = -9; lastScr = 0; smT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 飞行中的骨头：4 帧翻转（横 → 斜 → 竖 → 反斜），两端符文爆亮
  const DIRS = [[1, 0], [1, -1], [0, 1], [1, 1]];
  function flyingBone(x, y, k) {
    const [dx, dy] = DIRS[k & 3], nx = -dy, ny = dx, L = dx && dy ? 3 : BONE_L;
    for (let i = -L; i <= L; i++) { const px = R(x + dx * i), py = R(y + dy * i); if (Math.abs(i) === L) { put(px, py, 21); put(px + nx, py + ny, 17); put(px - nx, py - ny, 7); } else put(px, py, Math.abs(i) === L - 1 ? 17 : 6); }
  }
  function fxFront(f12) {
    if (smT < 2 / 12) {                                                                              // 砸击拖影：从扬起到砸下的弧（第 1 帧亮、第 2 帧断续）
      const first = smT < 1 / 12, r = 9;
      for (let k = 0; k <= 12; k++) { if (!first && (k & 1)) continue; const a = -0.3 + 2.0 * k / 12, x = R(smCX + Math.sin(a) * r), y = R(smCY - Math.cos(a) * r * 0.9); put(x, y, first ? FXR[R_BONE][k > 8 ? 0 : 1] : FXR[R_BONE][2]); if (first && k > 6) put(x - 1, y, FXR[R_BONE][2]); }
    }
    const bt = boneT();
    if (bt >= 0) { const [x, y] = bonePos(bt); flyingBone(x, y, f12of(bt)); if (bt < 1 / 12) { put(R(x) - 3, R(y), EL[1]); put(R(x) - 4, R(y), EL[2]); } }
    if (P.rune >= 2 && P.nob === 0 && !P.lie && P.dq < 1) {                                          // 蓄满：两端符文闪星
      const x = scrX(P.gx), y = HY + P.gy;
      for (const e of [-BONE_L, BONE_L]) { const ex = x + e + Math.sign(e), L = P.rune === 3 ? 3 : 1 + (f12 & 1); for (let r = 1; r <= L; r++) { put(ex, y - r - 1, r === 1 ? EL[1] : EL[2]); put(ex + Math.sign(e) * r, y, r === 1 ? EL[1] : EL[2]); } }
    }
  }

  return {
    name: '老猎犬', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_RUNE, m.eye, m.glow], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'dissolve', pal: 'arcane', style: 'spiral', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
